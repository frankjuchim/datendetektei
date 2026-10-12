#!/usr/bin/env node
'use strict';
// Bau der Übungsdatenbanken (seed/datenbanken/LIESMICH.md §5/§6, Plan Phase 2 Task 1).
//
//   node scripts/db_bauen.js [--db <name>] [--pruefen]
//
// Je DB: schema.sql → (nur StadtRad) uebernahme.sql → pflicht.sql → Generator scripts/db/<name>.js → Abnahme
// (foreign_key_check, integrity_check, abnahme() des Moduls, alle ```sql-Beispielabfragen der LIESMICH außer
// `-- Fehlabfrage`) → basis.sql. Ohne --pruefen wird basis.sql geschrieben; mit --pruefen wird neu gebaut und
// byteweise mit der eingecheckten Datei verglichen (Exit 1 bei Abweichung). In beiden Fällen werden danach alle
// Randfall-Varianten varianten/<typ>.sql gebaut (Delta auf einer Kopie der Haupt-DB, FK- und Integritätsprüfung).
//
// Generator-Module: scripts/db/<name>.js exportiert
//   generiere(db, zufall, namen, kontext)   – fügt die Generator-Daten ein (nicht bei TuS/Eisdiele)
//   abnahme(db) → [{ name, ok, ist, soll }] – Tabelle „Abnahme-Prüfungen“ der DB-LIESMICH
// `zufall` = erzeugeZufall("datendetektei:<name>:v1") (scripts/db/zufall.js), `namen` = ladeNamen()
// (scripts/db/namen.js), `kontext.datenbank(name)` = schon fertig gebaute DB (Bau-Reihenfolge, z. B. für Datenspuren).
//
// Verhör-Kontexte (seed/datenbanken/VERHOER_KONTEXTE.md, Plan Phase 3 Task 11) heißen `verhoer/<kontext>`
// (Ordner seed/datenbanken/verhoer/<kontext>/, Modul scripts/db/verhoer_<kontext>.js) und sind vollständig kuratiert.
// Sie werden mitgebaut und von ladeAlle() mitgeliefert, sind aber NIE öffentlich (/db/ nur über eine Positivliste der
// Übungs-DBs; der Name enthält einen Schrägstrich und passt schon deshalb auf keine Route /db/:name.sqlite).

const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');
const { erzeugeZufall, seedText } = require('./db/zufall');
const { ladeNamen } = require('./db/namen');
const { schreibeBasis, tabellenInSchemaReihenfolge } = require('./db/sql_schreiben');
// Laden der Haupt-DB und Bau der Varianten teilen sich Bau und Laufzeit (src/sql/datenbanken.js).
const {
  integritaet, VARIANTEN_TYPEN, varianten, ladeHaupt, baueVariante, ladeAlle
} = require('../src/sql/datenbanken');

const SEED_VERZEICHNIS = path.join(__dirname, '..', 'seed', 'datenbanken');
const MODUL_VERZEICHNIS = path.join(__dirname, 'db');

/** Bau-Reihenfolge der Übungs-DBs (DB-übergreifende Ableitungen brauchen ihre Quellen vorher). */
const REIHENFOLGE = ['fundbuero', 'stadtrad', 'stadtfest', 'tus', 'detektei', 'datenspuren', 'eisdiele'];

/** Verhör-Kontexte (nie öffentlich); Name = Pfad unter seed/datenbanken. */
const VERHOER_DBS = [...require('../src/sql/datenbanken').VERHOER_DATENBANKEN];

/** Alle DBs, die gebaut, geprüft und zur Laufzeit geladen werden. */
const ALLE_DBS = [...REIHENFOLGE, ...VERHOER_DBS];

/** Vollständig kuratierte DBs ohne Generator (basis.sql = schema.sql + pflicht.sql). */
const KURATIERT = ['tus', 'eisdiele', ...VERHOER_DBS];

/** Welche DBs vor einer DB gebaut sein müssen (für --db). */
const ABHAENGIGKEITEN = { datenspuren: ['fundbuero', 'stadtrad', 'stadtfest', 'tus', 'detektei'] };

/** ```sql-Blöcke einer Markdown-Datei: [{ sql, fehlabfrage, zeile }] (zeile = 1-basiert, Zeile des ```sql). */
function extrahiereSqlBloecke(markdown) {
  const zeilen = markdown.split(/\r?\n/);
  const bloecke = [];
  for (let i = 0; i < zeilen.length; i++) {
    if (zeilen[i].trim() !== '```sql') continue;
    const start = i;
    const inhalt = [];
    for (i++; i < zeilen.length && zeilen[i].trim() !== '```'; i++) inhalt.push(zeilen[i]);
    const sql = inhalt.join('\n');
    const erste = inhalt.find((z) => z.trim() !== '') || '';
    bloecke.push({ sql, fehlabfrage: /^\s*--\s*Fehlabfrage\b/.test(erste), zeile: start + 1 });
  }
  return bloecke;
}

/** Dateiname des Moduls einer DB: `verhoer/kiosk` → `verhoer_kiosk`. */
function modulName(name) {
  return name.replace(/\//g, '_');
}

/** Lädt scripts/db/<modulName>.js, falls vorhanden (sonst null). */
function ladeModul(name, verzeichnis = MODUL_VERZEICHNIS) {
  const datei = path.join(verzeichnis, `${modulName(name)}.js`);
  return fs.existsSync(datei) ? require(datei) : null;
}

function leseFalls(datei) {
  return fs.existsSync(datei) ? fs.readFileSync(datei, 'utf8') : null;
}

/** Führt die Beispielabfragen der LIESMICH aus (nur lesende Anweisungen). */
function beispielabfragen(db, liesmich) {
  return extrahiereSqlBloecke(liesmich || '').map((b) => {
    try {
      const stmt = db.prepare(b.sql);
      if (!stmt.reader || !stmt.readonly) throw new Error('keine reine Abfrage');
      const zeilen = stmt.all().length;
      return { zeile: b.zeile, fehlabfrage: b.fehlabfrage, ok: true, zeilen };
    } catch (e) {
      return { zeile: b.zeile, fehlabfrage: b.fehlabfrage, ok: false, fehler: e.message };
    }
  });
}

/**
 * Baut eine DB im Speicher (schreibt nichts).
 * optionen: quellen (Ordner mit <name>/schema.sql …), modul (Generator-Modul; undefined = laden, null = keins),
 * kontext ({ datenbank(name) }), namen (ladeNamen()-Objekt).
 * → { db, bericht: { name, status: 'fertig'|'generator-fehlt'|'fehlgeschlagen', ok, schritte, meldungen,
 *     abnahme, beispiele, seedText, kuratiert } }
 */
function baueDb(name, { quellen = SEED_VERZEICHNIS, modul, kontext, namen } = {}) {
  const ordner = path.join(quellen, name);
  const kuratiert = KURATIERT.includes(name);
  const generatorModul = modul === undefined ? ladeModul(name) : modul;
  const bericht = {
    name, status: null, ok: false, kuratiert, seedText: seedText(name),
    schritte: [], meldungen: [], abnahme: [], beispiele: []
  };
  const db = new Database(':memory:');
  const fuehreDateiAus = (datei, schritt, pflicht) => {
    const text = leseFalls(path.join(ordner, datei));
    if (text === null) {
      if (pflicht) throw new Error(`${datei} fehlt in ${ordner}`);
      return;
    }
    db.pragma('foreign_keys = ON');
    db.exec(text);
    bericht.schritte.push(schritt);
  };
  let schritt = 'schema';
  try {
    fuehreDateiAus('schema.sql', 'schema', true);
    schritt = 'uebernahme';
    fuehreDateiAus('uebernahme.sql', 'uebernahme', false);
    schritt = 'pflicht';
    fuehreDateiAus('pflicht.sql', 'pflicht', true);

    schritt = 'generator';
    if (kuratiert) {
      bericht.schritte.push('kuratiert');
    } else if (generatorModul && typeof generatorModul.generiere === 'function') {
      db.pragma('foreign_keys = ON');
      const kontextFuerModul = kontext || { quellen, datenbank: (n) => { throw new Error(`Datenbank ${n} noch nicht gebaut`); } };
      generatorModul.generiere(db, erzeugeZufall(seedText(name)), namen || ladeNamen(), kontextFuerModul);
      bericht.schritte.push('generator');
    } else {
      bericht.meldungen.push('Generator fehlt', ...integritaet(db));
      bericht.status = 'generator-fehlt';
      return { db, bericht };
    }

    schritt = 'abnahme';
    bericht.schritte.push('abnahme');
    bericht.meldungen.push(...integritaet(db));
    if (generatorModul && typeof generatorModul.abnahme === 'function') {
      bericht.abnahme = generatorModul.abnahme(db);
      for (const p of bericht.abnahme) {
        if (!p.ok) bericht.meldungen.push(`Abnahme „${p.name}“: ist ${JSON.stringify(p.ist)}, soll ${JSON.stringify(p.soll)}`);
      }
    } else {
      bericht.meldungen.push(`abnahme() fehlt in scripts/db/${modulName(name)}.js`);
    }
    bericht.beispiele = beispielabfragen(db, leseFalls(path.join(ordner, 'LIESMICH.md')));
    for (const b of bericht.beispiele) {
      if (!b.ok && !b.fehlabfrage) bericht.meldungen.push(`Beispielabfrage (LIESMICH Zeile ${b.zeile}): ${b.fehler}`);
    }
  } catch (e) {
    bericht.meldungen.push(`${schritt}: ${e.message}`);
  }
  bericht.status = bericht.meldungen.length === 0 ? 'fertig' : 'fehlgeschlagen';
  bericht.ok = bericht.status === 'fertig';
  return { db, bericht };
}

/**
 * Baut mehrere DBs in Bau-Reihenfolge. `nur`: eine DB (plus ihre Abhängigkeiten, die nicht geschrieben werden).
 * `module`: { name: modul|null } überschreibt das Laden aus scripts/db/.
 * → [{ name, db, bericht, ziel }]
 */
function baueAlle({ quellen = SEED_VERZEICHNIS, reihenfolge = ALLE_DBS, nur, module = {} } = {}) {
  if (nur && !reihenfolge.includes(nur)) throw new Error(`Unbekannte Datenbank: ${nur} (bekannt: ${reihenfolge.join(', ')})`);
  const benoetigt = nur ? new Set([nur, ...(ABHAENGIGKEITEN[nur] || [])]) : null;
  const gebaut = new Map();
  const kontext = {
    quellen,
    datenbank(n) {
      if (!gebaut.has(n)) throw new Error(`Datenbank ${n} noch nicht gebaut (Bau-Reihenfolge: ${reihenfolge.join(' → ')})`);
      return gebaut.get(n);
    }
  };
  const namen = ladeNamen();
  const ergebnisse = [];
  for (const name of reihenfolge) {
    if (benoetigt && !benoetigt.has(name)) continue;
    const modul = Object.prototype.hasOwnProperty.call(module, name) ? module[name] : undefined;
    const { db, bericht } = baueDb(name, { quellen, modul, kontext, namen });
    if (bericht.status === 'fertig') gebaut.set(name, db);
    ergebnisse.push({ name, db, bericht, ziel: !nur || name === nur });
  }
  return ergebnisse;
}

/** basis.sql-Text einer gebauten DB (Schema aus <quellen>/<name>/schema.sql, Kopf mit Seed und Prüfsumme). */
function basisText(name, db, { quellen = SEED_VERZEICHNIS } = {}) {
  const schema = fs.readFileSync(path.join(quellen, name, 'schema.sql'), 'utf8');
  return schreibeBasis(name, db, { schema, kuratiert: KURATIERT.includes(name) });
}

// ---------------------------------------------------------------- Randfall-Varianten (LIESMICH §5, Schritt 6)
// VARIANTEN_TYPEN, varianten(), ladeHaupt(), baueVariante(), ladeAlle() stehen in src/sql/datenbanken.js.

/** Baut alle Varianten auf `basis` (Text) und protokolliert je Variante; → true, wenn alle in Ordnung sind. */
function pruefeVarianten(name, basis, { quellen, log }) {
  let ok = true;
  let typen;
  try {
    typen = varianten(name, { quellen });
  } catch (e) {
    log(`${name}: FEHLER – ${e.message}`);
    return false;
  }
  if (typen.length === 0) return true;
  const hauptDb = ladeHaupt(name, { basis });
  const haupt = hauptDb.serialize();
  hauptDb.close();
  for (const typ of typen) {
    try {
      const v = baueVariante(name, typ, { quellen, haupt });
      v.close();
      log(`  ${name}/${typ}: ok`);
    } catch (e) {
      ok = false;
      log(`  ${name}/${typ}: FEHLER – ${e.message}`);
    }
  }
  return ok;
}

/** Kurze Diff-Zusammenfassung zweier Texte (zeilenweise). */
function diffZusammenfassung(eingecheckt, neu) {
  const a = eingecheckt.split('\n');
  const b = neu.split('\n');
  let erste = -1;
  let abweichend = 0;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] !== b[i]) {
      abweichend++;
      if (erste < 0) erste = i;
    }
  }
  const kurz = (z) => (z === undefined ? '(Dateiende)' : z.length > 160 ? `${z.slice(0, 160)} …` : z);
  return [
    `  Zeilen: eingecheckt ${a.length}, neu ${b.length}; abweichende Zeilen: ${abweichend}`,
    `  erste Abweichung in Zeile ${erste + 1}:`,
    `    eingecheckt: ${kurz(a[erste])}`,
    `    neu:         ${kurz(b[erste])}`
  ];
}

function datenzeilen(db) {
  return tabellenInSchemaReihenfolge(db)
    .reduce((s, t) => s + db.prepare(`SELECT COUNT(*) FROM "${t}"`).pluck().get(), 0);
}

/**
 * Baut, schreibt bzw. prüft basis.sql. → Exit-Code (0 ok, 1 Fehler/Abweichung).
 * „Generator fehlt“ ist nur ein Hinweis (Exit 0): Schema, Übernahme und Pflicht werden gebaut, basis.sql nicht geschrieben.
 */
function lauf({ quellen = SEED_VERZEICHNIS, reihenfolge = ALLE_DBS, nur, pruefen = false, module = {}, log = console.log } = {}) {
  let code = 0;
  const ergebnisse = baueAlle({ quellen, reihenfolge, nur, module });
  for (const { name, db, bericht, ziel } of ergebnisse) {
    if (!ziel) continue;
    if (bericht.status === 'generator-fehlt') {
      const hinweise = bericht.meldungen.slice(1);
      log(`${name}: Generator fehlt – Schema, Übernahme und Pflicht gebaut, basis.sql nicht geschrieben` +
        (hinweise.length ? ` (${hinweise.join('; ')})` : ''));
      continue;
    }
    if (bericht.status !== 'fertig') {
      code = 1;
      log(`${name}: FEHLGESCHLAGEN – basis.sql nicht geschrieben`);
      for (const m of bericht.meldungen) log(`  ${m}`);
      continue;
    }
    const text = basisText(name, db, { quellen });
    const datei = path.join(quellen, name, 'basis.sql');
    const info = `${datenzeilen(db)} Datenzeilen, ${bericht.abnahme.length} Abnahme-Prüfungen, ` +
      `${bericht.beispiele.filter((b) => b.ok && !b.fehlabfrage).length} Beispielabfragen`;
    if (pruefen) {
      if (!fs.existsSync(datei)) {
        code = 1;
        log(`${name}: basis.sql fehlt (erst „npm run db“ ausführen)`);
      } else {
        const eingecheckt = fs.readFileSync(datei);
        if (eingecheckt.equals(Buffer.from(text, 'utf8'))) {
          log(`${name}: identisch (${info})`);
        } else {
          code = 1;
          log(`${name}: ABWEICHUNG – basis.sql passt nicht zum Neubau`);
          for (const z of diffZusammenfassung(eingecheckt.toString('utf8'), text)) log(z);
        }
      }
    } else {
      fs.writeFileSync(datei, text);
      log(`${name}: basis.sql geschrieben (${info})`);
    }
    if (!pruefeVarianten(name, text, { quellen, log })) code = 1;
  }
  for (const { db } of ergebnisse) db.close();
  return code;
}

function hauptprogramm(argv) {
  const optionen = { pruefen: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--pruefen') optionen.pruefen = true;
    else if (argv[i] === '--db') optionen.nur = argv[++i];
    else {
      console.error(`Unbekannte Option: ${argv[i]}\nAufruf: node scripts/db_bauen.js [--db <name>] [--pruefen]`);
      return 2;
    }
  }
  try {
    return lauf(optionen);
  } catch (e) {
    console.error(e.message);
    return 1;
  }
}

if (require.main === module) {
  process.exitCode = hauptprogramm(process.argv.slice(2));
}

module.exports = {
  SEED_VERZEICHNIS,
  REIHENFOLGE,
  VERHOER_DBS,
  ALLE_DBS,
  KURATIERT,
  ABHAENGIGKEITEN,
  extrahiereSqlBloecke,
  VARIANTEN_TYPEN,
  modulName,
  ladeModul,
  baueDb,
  varianten,
  ladeHaupt,
  baueVariante,
  ladeAlle,
  baueAlle,
  lauf,
  basisText
};
