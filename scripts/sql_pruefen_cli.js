#!/usr/bin/env node
'use strict';
// SQL aus Unterrichtsmaterialien prüfen (Spec §12.3, Plan Phase 7 Task 1). Aufrufer: werkzeuge/material_sql_pruefen.py
// und werkzeuge/akten_design.py (abfrage_ergebnis).
//
// Eingabe (stdin, JSON): [{ id, sql, datenbank, erwartet?, kuer?, pruefung?, varianten?, sitzung?, maxZeilen? }]
//   datenbank  Name wie in seed/datenbanken („fundbuero“, „Fundbüro“, „verhoer/kiosk“, „kiosk“, „pruefung/…“),
//              „keine“ (nur Parser und Regeln) oder „leer“ (eigene leere DB je sitzung, nur Kür: CREATE/INSERT)
//   erwartet   { kopf: [..], zeilen: [[..]], abgeschnitten? } – Ergebnistabelle aus dem Material (Zellen als Text)
//   kuer       true → Abimodus „aus“ (JOIN … ON usw. erlaubt) und Nicht-SELECT erlaubt (nur mit „leer“)
//   pruefung   „ja“ (Standard) | „fehlerhaft“ (absichtlich falsch: ok nur, wenn es mindestens einen Befund gibt)
//   varianten  false → nur Haupt-DB (Standard: zusätzlich auf allen Randfall-Varianten ausführen)
// Ausgabe (stdout, JSON): [{ id, ok, befunde: [{ art, code?, text }], spalten?, anzahl? }]
//   art: syntax | eh | hinweis | ausfuehrung | ergebnis | datenbank | erwartung („hinweis“ macht nicht „nicht ok“)
//   Exit-Code 1, wenn ein Eintrag nicht ok ist.
// Mit --ausfuehren: [{ id, spalten, zeilen, fehler? }] (Rohwerte der Haupt-DB, für Ergebnistabellen in Lösungen).
//
// Nur für vertrauenswürdiges Material (eigene Dateien im Repo): läuft ohne Sandbox, aber nur lesend außer in der Kür.

const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');
const { parse } = require('../src/sql/parser');
const { pruefeRegeln } = require('../src/sql/regeln');
const D = require('../src/sql/datenbanken');

const SEED = D.SEED_VERZEICHNIS;
const PRAEFIXE = ['', 'verhoer/', 'pruefung/'];

function normalisiere(name) {
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[\s_-]+/g, '');
}

/** Name → Pfad unter seed/datenbanken (z. B. „verhoer/kiosk“); „keine“ → null; unbekannt → Fehler. */
function findeDatenbank(name) {
  if (name === null || name === undefined || normalisiere(name) === 'keine') return null;
  const roh = String(name).trim().replace(/\\/g, '/');
  if (roh.includes('/')) {
    const [ordner, rest] = roh.split('/');
    const kandidat = `${normalisiere(ordner)}/${normalisiere(rest)}`;
    if (fs.existsSync(path.join(SEED, kandidat, 'basis.sql'))) return kandidat;
  } else {
    const n = normalisiere(roh);
    for (const p of PRAEFIXE) if (fs.existsSync(path.join(SEED, p + n, 'basis.sql'))) return p + n;
  }
  throw new Error(`Datenbank „${name}“ unbekannt (erwartet z. B. fundbuero, verhoer/kiosk, keine)`);
}

// ---------------------------------------------------------------- Vergleich
const ZAHL = /^-?(\d{1,3}(\.\d{3})+|\d+)(,\d+)?$|^-?\d+\.\d+$/;

function alsZahl(text) {
  let t = String(text).trim().replace(/\s*€$/, '').replace(/ /g, ' ');
  if (!ZAHL.test(t)) return null;
  let stellen = 0;
  if (/,\d+$/.test(t)) {
    stellen = t.split(',')[1].length;
    t = t.replace(/\./g, '').replace(',', '.');
  } else if (/^-?\d+\.\d+$/.test(t) && !/^-?\d{1,3}(\.\d{3})+$/.test(t)) {
    stellen = t.split('.')[1].length;
  } else {
    t = t.replace(/\./g, '');
  }
  return { wert: Number(t), stellen };
}

/** Zelle der Material-Tabelle (Text) gegen einen Wert aus SQLite. */
function zellenGleich(erwartet, ist) {
  const e = String(erwartet === null || erwartet === undefined ? '' : erwartet).trim();
  if (ist === null || ist === undefined) return e === 'NULL';
  if (typeof ist === 'number' || typeof ist === 'bigint') {
    const z = alsZahl(e);
    if (!z) return false;
    const toleranz = 0.5 * 10 ** -z.stellen + 1e-9;
    return Math.abs(Number(ist) - z.wert) <= toleranz;
  }
  return e === String(ist);
}

const kopfName = (t) =>
  String(t)
    .replace(/<\/?u>/g, '')
    .replace(/[↑\s"`]/g, '')
    .toLowerCase();

function ohneKommentareUndTexte(sql) {
  return sql.replace(/--[^\n]*/g, ' ').replace(/'(?:[^']|'')*'/g, "''");
}

function vergleiche(erwartet, spalten, zeilen, sql) {
  const befunde = [];
  const kopf = erwartet.kopf || [];
  if (kopf.length !== spalten.length) {
    befunde.push({ art: 'ergebnis', text: `Die Ergebnistabelle hat ${kopf.length} Spalten, die Abfrage liefert ${spalten.length}.` });
    return befunde;
  }
  kopf.forEach((k, i) => {
    if (kopfName(k) !== kopfName(spalten[i])) {
      befunde.push({ art: 'ergebnis', text: `Spalte ${i + 1} heißt im Ergebnis „${spalten[i]}“, in der Ergebnistabelle „${k}“.` });
    }
  });
  const soll = (erwartet.zeilen || []).filter((z) => !z.every((c) => /^(…|\.\.\.)$/.test(String(c).trim())));
  const abgeschnitten = !!erwartet.abgeschnitten || soll.length < (erwartet.zeilen || []).length;
  const sortiert = /\bORDER\s+BY\b/i.test(ohneKommentareUndTexte(sql));
  const zeileGleich = (s, ist) => s.length === ist.length && s.every((c, i) => zellenGleich(c, ist[i]));
  if (!abgeschnitten && soll.length !== zeilen.length) {
    befunde.push({ art: 'ergebnis', text: `Die Ergebnistabelle hat ${soll.length} Zeilen, die Abfrage liefert ${zeilen.length}.` });
    return befunde;
  }
  if (abgeschnitten && soll.length > zeilen.length) {
    befunde.push({ art: 'ergebnis', text: `Die Ergebnistabelle zeigt ${soll.length} Zeilen, die Abfrage liefert nur ${zeilen.length}.` });
    return befunde;
  }
  if (sortiert) {
    for (let i = 0; i < soll.length; i++) {
      if (!zeileGleich(soll[i], zeilen[i])) {
        befunde.push({ art: 'ergebnis', text: `Zeile ${i + 1}: erwartet ${JSON.stringify(soll[i])}, die Abfrage liefert ${JSON.stringify(zeilen[i])}.` });
        break;
      }
    }
  } else {
    const rest = zeilen.slice();
    for (let i = 0; i < soll.length; i++) {
      const j = rest.findIndex((ist) => zeileGleich(soll[i], ist));
      if (j < 0) {
        befunde.push({ art: 'ergebnis', text: `Zeile ${i + 1} ${JSON.stringify(soll[i])} kommt im Ergebnis der Abfrage nicht vor.` });
        break;
      }
      rest.splice(j, 1);
    }
  }
  return befunde;
}

// ---------------------------------------------------------------- Datenbanken (je Lauf zwischengespeichert)
function erzeugeVorrat() {
  const haupt = new Map();
  const varianten = new Map();
  const sitzungen = new Map();
  return {
    haupt(name) {
      if (!haupt.has(name)) haupt.set(name, D.ladeHaupt(name));
      return haupt.get(name);
    },
    varianten(name) {
      if (!varianten.has(name)) {
        const puffer = this.haupt(name).serialize();
        varianten.set(name, D.varianten(name).map((typ) => ({ typ, db: D.baueVariante(name, typ, { haupt: puffer }) })));
      }
      return varianten.get(name);
    },
    sitzung(schluessel) {
      if (!sitzungen.has(schluessel)) sitzungen.set(schluessel, new Database(':memory:'));
      return sitzungen.get(schluessel);
    }
  };
}

function ausfuehren(db, sql, { schreibend = false, maxZeilen = 10000 } = {}) {
  const stmt = db.prepare(sql);
  if (!stmt.reader) {
    if (!schreibend) throw new Error('Nur SELECT-Abfragen sind erlaubt (außer in der Kür).');
    stmt.run();
    return { spalten: [], zeilen: [] };
  }
  const spalten = stmt.columns().map((c) => c.name);
  const zeilen = [];
  for (const z of stmt.raw(true).iterate()) {
    zeilen.push(z);
    if (zeilen.length >= maxZeilen) break;
  }
  return { spalten, zeilen };
}

// ---------------------------------------------------------------- Prüfung eines Eintrags
function pruefeEintrag(e, vorrat) {
  const befunde = [];
  const kuer = !!e.kuer;
  const sql = String(e.sql || '').trim();
  const aus = { id: e.id, ok: true, befunde };
  let dbName;
  const leer = normalisiere(e.datenbank || '') === 'leer';
  try {
    dbName = leer ? null : findeDatenbank(e.datenbank);
  } catch (err) {
    befunde.push({ art: 'datenbank', text: err.message });
    aus.ok = false;
    return aus;
  }
  const { ast, fehler } = parse(sql);
  if (fehler.length > 0) {
    for (const f of fehler) befunde.push({ art: 'syntax', code: f.code, text: `Zeile ${f.zeile}: ${f.text}` });
  } else {
    const schema = dbName ? D.leseSchema(vorrat.haupt(dbName)) : undefined;
    for (const r of pruefeRegeln(ast, { schema, abimodus: kuer ? 'aus' : 'streng' })) {
      if (kuer && r.code === 'NICHT_SELECT') continue;
      befunde.push({ art: r.art === 'hinweis' ? 'hinweis' : 'eh', code: r.code, text: `Zeile ${r.zeile}: ${r.text}` });
    }
  }
  const syntaxOk = !befunde.some((b) => b.art === 'syntax');
  const nichtSelect = ast && ast.typ !== 'select' && !/^\s*(SELECT|WITH)\b/i.test(ohneKommentareUndTexte(sql));
  if (syntaxOk || (kuer && leer)) {
    try {
      let ergebnis = null;
      if (leer) {
        if (!kuer) throw new Error('Eine eigene leere Datenbank gibt es nur in der Kür.');
        ergebnis = ausfuehren(vorrat.sitzung(e.sitzung || 'standard'), sql, { schreibend: true });
      } else if (dbName) {
        ergebnis = ausfuehren(vorrat.haupt(dbName), sql);
        if (e.varianten !== false) {
          for (const v of vorrat.varianten(dbName)) {
            try {
              ausfuehren(v.db, sql);
            } catch (err) {
              befunde.push({ art: 'ausfuehrung', text: `Variante +${v.typ}: ${err.message}` });
            }
          }
        }
      }
      if (ergebnis) {
        aus.spalten = ergebnis.spalten;
        aus.anzahl = ergebnis.zeilen.length;
        if (e.erwartet) befunde.push(...vergleiche(e.erwartet, ergebnis.spalten, ergebnis.zeilen, sql));
      }
    } catch (err) {
      befunde.push({ art: 'ausfuehrung', text: err.message });
    }
  } else if (nichtSelect && !kuer) {
    befunde.push({ art: 'eh', text: 'Nur SELECT-Abfragen sind im Kern erlaubt.' });
  }
  const echte = befunde.filter((b) => b.art !== 'hinweis');
  if (e.pruefung === 'fehlerhaft') {
    if (echte.length === 0) befunde.push({ art: 'erwartung', text: 'Als absichtlich fehlerhaft markiert, aber die Prüfung findet keinen Fehler.' });
    aus.ok = echte.length > 0;
  } else {
    aus.ok = echte.length === 0;
  }
  return aus;
}

function pruefeAlle(eintraege) {
  const vorrat = erzeugeVorrat();
  return eintraege.map((e) => pruefeEintrag(e, vorrat));
}

function fuehreAlleAus(eintraege) {
  const vorrat = erzeugeVorrat();
  return eintraege.map((e) => {
    try {
      const name = findeDatenbank(e.datenbank);
      if (!name) throw new Error('Ohne Datenbank lässt sich nichts ausführen.');
      const { spalten, zeilen } = ausfuehren(vorrat.haupt(name), String(e.sql), { maxZeilen: e.maxZeilen || 200 });
      return { id: e.id, spalten, zeilen: zeilen.map((z) => z.map((v) => (typeof v === 'bigint' ? Number(v) : v))) };
    } catch (err) {
      return { id: e.id, fehler: err.message };
    }
  });
}

function main() {
  const eingabe = JSON.parse(fs.readFileSync(0, 'utf8') || '[]');
  if (!Array.isArray(eingabe)) throw new Error('Eingabe muss eine JSON-Liste sein.');
  if (process.argv.includes('--ausfuehren')) {
    const aus = fuehreAlleAus(eingabe);
    process.stdout.write(JSON.stringify(aus));
    process.exitCode = aus.some((a) => a.fehler) ? 1 : 0;
    return;
  }
  const aus = pruefeAlle(eingabe);
  process.stdout.write(JSON.stringify(aus));
  process.exitCode = aus.every((a) => a.ok) ? 0 : 1;
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    process.stderr.write(`sql_pruefen_cli: ${err.message}\n`);
    process.exitCode = 2;
  }
}

module.exports = { findeDatenbank, zellenGleich, alsZahl, vergleiche, pruefeAlle, fuehreAlleAus };
