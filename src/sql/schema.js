'use strict';
/*
 * Datendetektei – Schema einer Übungs-DB aus ihrem serialisierten Buffer (Spec §7.4; Plan Phase 2 Task 10).
 *
 * schemaAus(buffer) → [{ tabelle, spalten: [{ name, typ, pk, fk: { tabelle, spalte } | null }], zeilen }]
 *   Tabellen nach Name sortiert, Spalten in Tabellenreihenfolge; zeilen = Anzahl Datensätze (für die
 *   Kreuzprodukt-Diagnose des Prüfers). Gleiche Form wie das Schema für src/sql/regeln.js.
 * schemaVonDb(db) → dasselbe für eine offene DB (Kür-Sandbox, Kindprozess: Schema der Schüler-DB nach dem Skript;
 *   Namen werden nur als gebundene Parameter bzw. in "…" maskiert verwendet).
 * Nur für vertrauenswürdige DBs aus seed/datenbanken (Server) bzw. im Kindprozess der Sandbox; keine Abhängigkeit von
 * src/kern.
 */

const Database = require('better-sqlite3');

function bezeichner(name) {
  return '"' + String(name).replace(/"/g, '""') + '"';
}

function schemaVonDb(db) {
  const tabellen = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .pluck()
    .all();
  return tabellen.map((tabelle) => {
    const fks = db.prepare('SELECT "from", "table", "to" FROM pragma_foreign_key_list(?)').all(tabelle);
    const spalten = db
      .prepare('SELECT name, type, pk FROM pragma_table_info(?) ORDER BY cid')
      .all(tabelle)
      .map((s) => {
        const fk = fks.find((f) => f.from === s.name);
        return { name: s.name, typ: s.type, pk: s.pk > 0, fk: fk ? { tabelle: fk.table, spalte: fk.to } : null };
      });
    const zeilen = db.prepare('SELECT COUNT(*) FROM ' + bezeichner(tabelle)).pluck().get();
    return { tabelle, spalten, zeilen };
  });
}

function schemaAus(buffer) {
  const db = new Database(buffer, { readonly: true });
  try {
    return schemaVonDb(db);
  } finally {
    db.close();
  }
}

module.exports = { schemaAus, schemaVonDb, bezeichner };
