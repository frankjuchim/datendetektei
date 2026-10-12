'use strict';
// Schreibt basis.sql: Kopfkommentar (DB, Seed, Version, SHA-256 des Datenteils), Schema unverändert aus
// schema.sql, dann INSERTs je Tabelle in Schema-Reihenfolge, Zeilen nach Primärschlüssel sortiert
// (Tabellen ohne Primärschlüssel in Einfügereihenfolge = rowid). Byte-deterministisch.

const crypto = require('node:crypto');
const { fnv1a32, seedText: seedTextVon, BAU_VERSION } = require('./zufall');

/** Erste Zeile des Datenteils; die Prüfsumme im Kopf läuft über alles ab dieser Zeile. */
const DATEN_MARKE = '-- ===== Daten (erzeugt) =====';

function bezeichner(name) {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name) ? name : `"${name.replace(/"/g, '""')}"`;
}

/**
 * SQL-Literal eines Werts, wie better-sqlite3 ihn mit safeIntegers liefert:
 * null → NULL, BigInt → Ganzzahl, number → REAL (immer mit Punkt oder Exponent, kürzeste exakte Darstellung),
 * string → '…' mit verdoppeltem Apostroph, Buffer → X'…'.
 */
function formatiereWert(wert) {
  if (wert === null || wert === undefined) return 'NULL';
  if (typeof wert === 'bigint') return wert.toString();
  if (typeof wert === 'number') {
    if (Number.isNaN(wert)) return 'NULL';
    if (wert === Infinity) return '9e999';
    if (wert === -Infinity) return '-9e999';
    if (Object.is(wert, -0)) return '-0.0';
    const text = String(wert);
    return /[.e]/.test(text) ? text : `${text}.0`;
  }
  if (typeof wert === 'string') return `'${wert.replace(/'/g, "''")}'`;
  if (Buffer.isBuffer(wert)) return `X'${wert.toString('hex')}'`;
  throw new Error(`formatiereWert: unbekannter Typ ${typeof wert}`);
}

/** Tabellen in der Reihenfolge ihres CREATE TABLE (ohne sqlite_*). */
function tabellenInSchemaReihenfolge(db) {
  return db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite\\_%' ESCAPE '\\' ORDER BY rowid")
    .pluck().all();
}

/** Spalten des Primärschlüssels in Schlüssel-Reihenfolge (leer, wenn keiner). */
function primaerschluessel(db, tabelle) {
  return db.prepare(`PRAGMA table_info(${bezeichner(tabelle)})`).all()
    .filter((s) => s.pk > 0)
    .sort((a, b) => a.pk - b.pk)
    .map((s) => s.name);
}

/** INSERT-Zeilen einer Tabelle, nach Primärschlüssel (sonst rowid) sortiert. */
function insertsFuer(db, tabelle) {
  const pk = primaerschluessel(db, tabelle);
  const ordnung = pk.length > 0 ? pk.map(bezeichner).join(', ') : 'rowid';
  const zeilen = db.prepare(`SELECT * FROM ${bezeichner(tabelle)} ORDER BY ${ordnung}`).safeIntegers(true).raw().all();
  return zeilen.map((z) => `INSERT INTO ${bezeichner(tabelle)} VALUES (${z.map(formatiereWert).join(', ')});`);
}

/** Datenteil (ab DATEN_MARKE bis Dateiende). */
function datenteil(db) {
  const teile = [DATEN_MARKE, 'BEGIN;', 'PRAGMA defer_foreign_keys = ON;'];
  for (const t of tabellenInSchemaReihenfolge(db)) {
    const inserts = insertsFuer(db, t);
    teile.push('', `-- ${t}: ${inserts.length} Zeilen`, ...inserts);
  }
  teile.push('', 'COMMIT;', '');
  return teile.join('\n');
}

function sha256(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

/**
 * basis.sql einer DB als Text.
 * optionen.schema: Inhalt von schema.sql (unverändert übernommen); optionen.seedText (Standard
 * "datendetektei:<name>:v1"); optionen.version (Standard BAU_VERSION); optionen.kuratiert: Hinweis im Kopf.
 */
function schreibeBasis(name, db, { schema = '', seedText = seedTextVon(name), version = BAU_VERSION, kuratiert = false } = {}) {
  const daten = datenteil(db);
  const kopf = [
    '-- =====================================================================',
    `-- Datendetektei Weserstedt · basis.sql der Übungsdatenbank „${name}“`,
    '-- ERZEUGT von scripts/db_bauen.js (npm run db) – nicht von Hand ändern.',
    `-- Datenbank: ${name}`,
    `-- Seed: ${seedText} (FNV-1a 0x${fnv1a32(seedText).toString(16).padStart(8, '0')})${kuratiert ? ' – kuratiert, kein Generator' : ''}`,
    `-- Version: ${version}`,
    `-- SHA-256 (Datenteil): ${sha256(daten)}`,
    '-- ====================================================================='
  ].join('\n');
  return `${kopf}\n\n${schema.trimEnd()}\n\n${daten}`;
}

/** Prüft die Prüfsumme im Kopf gegen den Datenteil einer basis.sql. */
function pruefeBasisText(text) {
  const m = /^-- SHA-256 \(Datenteil\): ([0-9a-f]{64})$/m.exec(text);
  const pos = text.indexOf(`\n${DATEN_MARKE}\n`);
  if (!m || pos < 0) return { ok: false, soll: m ? m[1] : null, ist: null };
  const ist = sha256(text.slice(pos + 1));
  return { ok: ist === m[1], soll: m[1], ist };
}

module.exports = {
  DATEN_MARKE,
  formatiereWert,
  tabellenInSchemaReihenfolge,
  primaerschluessel,
  schreibeBasis,
  pruefeBasisText
};
