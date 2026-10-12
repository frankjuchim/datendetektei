'use strict';
// Übungs-Datenbanken zur Laufzeit (Spec §7.2, Plan Phase 2 Task 5): Beim Start wird jede basis.sql einmal geladen
// (Prüfsumme im Kopf muss zum Datenteil passen), daraus die Randfall-Varianten (varianten/<typ>.sql als Delta auf
// einer Kopie) gebaut und alles als serialisierter Buffer im Speicher gehalten. Schreibzugriffe gibt es danach nicht.
//
// Dieselben Funktionen nutzt der Bau (scripts/db_bauen.js re-exportiert sie), damit Bau und Laufzeit Varianten
// garantiert gleich bauen. Abhängigkeiten nur node:* und better-sqlite3 (src/ hängt nicht von scripts/ ab).

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

const SEED_VERZEICHNIS = path.join(__dirname, '..', '..', 'seed', 'datenbanken');

/** Die sieben Übungsdatenbanken der Akten, in Bau-Reihenfolge (Standard für ladeDatenbanken). */
const AKTEN_DATENBANKEN = Object.freeze(['fundbuero', 'stadtrad', 'stadtfest', 'tus', 'detektei', 'datenspuren', 'eisdiele']);

/**
 * Öffentlich ausgelieferte DBs (/db/<name>.sqlite, /api/db/<name>/schema) – bewusst eine feste Liste: Verhör-,
 * Generalprobe- und Klausurkontexte (später unter seed/datenbanken/verhoer/) werden NIE öffentlich, auch wenn sie
 * geladen sind. Varianten werden nie ausgeliefert.
 */
const OEFFENTLICHE_DATENBANKEN = Object.freeze([...AKTEN_DATENBANKEN]);

/** Variantentypen in fester Reihenfolge (Spec 7.4); Datei je Typ: <quellen>/<name>/varianten/<typ>.sql. */
const VARIANTEN_TYPEN = Object.freeze(['null', 'gleichnamig', 'grenze', 'gleichstand', 'leer']);

/** Erste Zeile des Datenteils einer basis.sql; die Prüfsumme im Kopf läuft über alles ab dieser Zeile. */
const DATEN_MARKE = '-- ===== Daten (erzeugt) =====';

function sha256(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

/** Prüft die Prüfsumme im Kopf gegen den Datenteil einer basis.sql. → { ok, soll, ist } */
function pruefeBasisText(text) {
  const m = /^-- SHA-256 \(Datenteil\): ([0-9a-f]{64})$/m.exec(text);
  const pos = text.indexOf(`\n${DATEN_MARKE}\n`);
  if (!m || pos < 0) return { ok: false, soll: m ? m[1] : null, ist: null };
  const ist = sha256(text.slice(pos + 1));
  return { ok: ist === m[1], soll: m[1], ist };
}

/** Integritätsprüfungen; liefert Meldungen (leer = in Ordnung). */
function integritaet(db) {
  const meldungen = [];
  const fk = db.pragma('foreign_key_check');
  if (fk.length > 0) {
    const beispiele = fk.slice(0, 5).map((v) => `${v.table} rowid ${v.rowid} → ${v.parent}`).join(', ');
    meldungen.push(`PRAGMA foreign_key_check: ${fk.length} Verstöße (${beispiele})`);
  }
  const ic = db.pragma('integrity_check', { simple: true });
  if (ic !== 'ok') meldungen.push(`PRAGMA integrity_check: ${ic}`);
  return meldungen;
}

/**
 * Vorhandene Varianten einer DB in fester Reihenfolge. Ohne varianten/-Ordner: keine (z. B. Eisdiele, „entfällt“).
 * Eine .sql-Datei mit unbekanntem Typ ist ein Fehler (Tippfehler sollen nicht still wegfallen).
 */
function varianten(name, { quellen = SEED_VERZEICHNIS } = {}) {
  const ordner = path.join(quellen, name, 'varianten');
  if (!fs.existsSync(ordner)) return [];
  const typen = fs.readdirSync(ordner).filter((d) => d.endsWith('.sql')).map((d) => d.slice(0, -4));
  const unbekannt = typen.filter((t) => !VARIANTEN_TYPEN.includes(t));
  if (unbekannt.length > 0) {
    throw new Error(`${name}: unbekannte Variante(n) ${unbekannt.map((t) => `varianten/${t}.sql`).join(', ')} ` +
      `(erlaubt: ${VARIANTEN_TYPEN.join(', ')})`);
  }
  return VARIANTEN_TYPEN.filter((t) => typen.includes(t));
}

/** Text der eingecheckten basis.sql (Fehler, wenn sie fehlt). */
function leseBasis(name, { quellen = SEED_VERZEICHNIS } = {}) {
  const datei = path.join(quellen, name, 'basis.sql');
  if (!fs.existsSync(datei)) throw new Error(`${name}: basis.sql fehlt (erst „npm run db“ ausführen)`);
  return fs.readFileSync(datei, 'utf8');
}

/** Haupt-DB aus der eingecheckten basis.sql (bzw. aus `basis`, dem Text einer gerade gebauten basis.sql). */
function ladeHaupt(name, { quellen = SEED_VERZEICHNIS, basis } = {}) {
  const text = basis === undefined ? leseBasis(name, { quellen }) : basis;
  const db = new Database(':memory:');
  db.exec(text);
  return db;
}

/**
 * Baut eine Variante: Kopie der Haupt-DB (`haupt` = serialisierter Buffer, sonst aus basis.sql bzw. `basis`) →
 * Delta mit PRAGMA foreign_keys = ON → foreign_key_check und integrity_check müssen leer sein, sonst Fehler.
 * → Database (im Speicher, beschreibbar)
 */
function baueVariante(name, typ, { quellen = SEED_VERZEICHNIS, haupt, basis } = {}) {
  if (!VARIANTEN_TYPEN.includes(typ)) throw new Error(`${name}: unbekannte Variante ${typ}`);
  const datei = path.join(quellen, name, 'varianten', `${typ}.sql`);
  if (!fs.existsSync(datei)) throw new Error(`${name}: Variante ${typ} gibt es nicht (varianten/${typ}.sql fehlt)`);
  const delta = fs.readFileSync(datei, 'utf8');
  const db = haupt ? new Database(haupt) : ladeHaupt(name, { quellen, basis });
  try {
    db.pragma('foreign_keys = ON');
    db.exec(delta);
    const meldungen = integritaet(db);
    if (meldungen.length > 0) throw new Error(meldungen.join('; '));
  } catch (e) {
    db.close();
    throw new Error(`${name}/${typ}: ${e.message}`);
  }
  return db;
}

/** Varianten-Buffer einer DB auf Basis des Haupt-Buffers. → { <typ>: Buffer } */
function variantenBuffer(name, haupt, quellen) {
  const ergebnis = {};
  for (const typ of varianten(name, { quellen })) {
    const v = baueVariante(name, typ, { quellen, haupt });
    ergebnis[typ] = v.serialize();
    v.close();
  }
  return ergebnis;
}

/**
 * Serialisierte Übungsdatenbanken (ohne Prüfsummen-Check, für Bau und Tests): Haupt-DB aus basis.sql, je Variante
 * basis.sql + Delta. → { <name>: { haupt: Buffer, varianten: { <typ>: Buffer } } }
 */
function ladeAlle(seedDir = SEED_VERZEICHNIS, { namen = AKTEN_DATENBANKEN } = {}) {
  const ergebnis = {};
  for (const name of namen) {
    const hauptDb = ladeHaupt(name, { quellen: seedDir });
    const haupt = hauptDb.serialize();
    hauptDb.close();
    ergebnis[name] = { haupt, varianten: variantenBuffer(name, haupt, seedDir) };
  }
  return ergebnis;
}

/**
 * Schema einer DB: [{ tabelle, spalten: [{ name, typ, pk, fk: { tabelle, spalte } | null }], zeilen }],
 * Tabellen nach Namen sortiert (Form wie test/hilfen_schema.js; regeln.js nutzt tabelle/spalten/pk/fk).
 */
function leseSchema(db) {
  const tabellen = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .pluck()
    .all();
  return tabellen.map((tabelle) => {
    const t = tabelle.replace(/"/g, '""');
    const fks = db.prepare(`PRAGMA foreign_key_list("${t}")`).all();
    const spalten = db.prepare(`PRAGMA table_info("${t}")`).all().map((s) => {
      const fk = fks.find((f) => f.from === s.name);
      return { name: s.name, typ: s.type, pk: s.pk > 0, fk: fk ? { tabelle: fk.table, spalte: fk.to } : null };
    });
    const zeilen = db.prepare(`SELECT COUNT(*) FROM "${t}"`).pluck().get();
    return { tabelle, spalten, zeilen };
  });
}

function tiefEinfrieren(wert) {
  if (wert && typeof wert === 'object') {
    for (const k of Object.keys(wert)) tiefEinfrieren(wert[k]);
    Object.freeze(wert);
  }
  return wert;
}

/**
 * Lädt die Übungsdatenbanken einmal beim Start. Bricht mit Fehler ab, wenn eine basis.sql fehlt, ihre Prüfsumme
 * nicht zum Datenteil passt (vgl. `npm run db:pruefen`) oder eine Variante nicht baut.
 * optionen.namen: zu ladende DBs (Standard: die sieben Akten-DBs); optionen.log: Protokoll (Startzeit).
 * → { namen, haupt(name) → Buffer, varianten(name) → { typ: Buffer }, schema(name) → [...] }
 */
function ladeDatenbanken(seedDir = SEED_VERZEICHNIS, { namen = AKTEN_DATENBANKEN, log = console.log } = {}) {
  const start = process.hrtime.bigint();
  const eintraege = new Map();
  let anzahlVarianten = 0;
  for (const name of namen) {
    const text = leseBasis(name, { quellen: seedDir });
    if (!pruefeBasisText(text).ok) {
      throw new Error(`${name}: basis.sql – Prüfsumme im Kopf passt nicht zum Datenteil (npm run db:pruefen)`);
    }
    const hauptDb = ladeHaupt(name, { basis: text });
    const haupt = hauptDb.serialize();
    const schema = tiefEinfrieren(leseSchema(hauptDb));
    hauptDb.close();
    const vb = Object.freeze(variantenBuffer(name, haupt, seedDir));
    anzahlVarianten += Object.keys(vb).length;
    eintraege.set(name, { haupt, varianten: vb, schema });
  }
  const ms = Number(process.hrtime.bigint() - start) / 1e6;
  log(`Übungs-Datenbanken geladen: ${eintraege.size} Datenbanken, ${anzahlVarianten} Varianten in ${Math.round(ms)} ms`);

  const eintrag = (name) => {
    const e = typeof name === 'string' ? eintraege.get(name) : undefined;
    if (!e) throw new Error(`Unbekannte Datenbank: ${String(name)}`);
    return e;
  };
  return Object.freeze({
    namen: Object.freeze([...eintraege.keys()]),
    haupt: (name) => eintrag(name).haupt,
    varianten: (name) => eintrag(name).varianten,
    schema: (name) => eintrag(name).schema
  });
}

module.exports = {
  SEED_VERZEICHNIS,
  AKTEN_DATENBANKEN,
  OEFFENTLICHE_DATENBANKEN,
  VARIANTEN_TYPEN,
  DATEN_MARKE,
  pruefeBasisText,
  integritaet,
  varianten,
  ladeHaupt,
  baueVariante,
  ladeAlle,
  leseSchema,
  ladeDatenbanken
};
