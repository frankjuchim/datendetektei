'use strict';
// Test-Hilfen für Parser und Regeln: Schemata aus seed/datenbanken/<name>/schema.sql und die Beispielabfragen
// aus allen LIESMICH.md-Dateien. Kein Bau der Datenbanken nötig (nur schema.sql in einer :memory:-DB).

const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

const SEED = path.join(__dirname, '..', 'seed', 'datenbanken');

/** Namen aller Datenbanken mit schema.sql. */
function datenbankNamen() {
  return fs
    .readdirSync(SEED)
    .filter((n) => fs.existsSync(path.join(SEED, n, 'schema.sql')))
    .sort();
}

/**
 * Schema einer Übungs-DB in der Form, die später src/sql/datenbanken.js liefert:
 * [{ tabelle, spalten: [{ name, typ, pk, fk: { tabelle, spalte } | null }] }]
 */
function ladeSchema(name) {
  const db = new Database(':memory:');
  try {
    db.exec(fs.readFileSync(path.join(SEED, name, 'schema.sql'), 'utf8'));
    const tabellen = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
      .all()
      .map((z) => z.name);
    return tabellen.map((tabelle) => {
      const fks = db.prepare(`PRAGMA foreign_key_list("${tabelle}")`).all();
      const spalten = db.prepare(`PRAGMA table_info("${tabelle}")`).all().map((s) => {
        const fk = fks.find((f) => f.from === s.name);
        return {
          name: s.name,
          typ: s.type,
          pk: s.pk > 0,
          fk: fk ? { tabelle: fk.table, spalte: fk.to } : null
        };
      });
      return { tabelle, spalten };
    });
  } finally {
    db.close();
  }
}

/** Alle LIESMICH.md unter seed/datenbanken (rekursiv). */
function liesmichDateien() {
  const ergebnis = [];
  (function suche(ordner) {
    for (const eintrag of fs.readdirSync(ordner, { withFileTypes: true })) {
      const p = path.join(ordner, eintrag.name);
      if (eintrag.isDirectory()) suche(p);
      else if (eintrag.name === 'LIESMICH.md') ergebnis.push(p);
    }
  })(SEED);
  return ergebnis.sort();
}

/**
 * Alle ```sql-Blöcke aller LIESMICH.md:
 * [{ datei, db, zeile, sql, fehlabfrage, falle }] – falle = 'P6' o. Ä., wenn die Kommentarzeile sie nennt.
 */
function liesmichAbfragen() {
  const abfragen = [];
  for (const datei of liesmichDateien()) {
    const zeilen = fs.readFileSync(datei, 'utf8').split(/\r?\n/);
    const db = path.basename(path.dirname(datei));
    let block = null;
    zeilen.forEach((zeile, i) => {
      if (block === null && /^```sql\s*$/.test(zeile)) {
        block = { start: i + 2, zeilen: [] };
      } else if (block !== null && /^```\s*$/.test(zeile)) {
        const sql = block.zeilen.join('\n');
        const erste = block.zeilen[0] || '';
        const fehlabfrage = /^--\s*Fehlabfrage/.test(erste);
        const treffer = /\((P\d+)\)/.exec(erste);
        abfragen.push({
          datei: path.relative(path.join(__dirname, '..'), datei),
          db,
          zeile: block.start,
          sql,
          fehlabfrage,
          falle: fehlabfrage && treffer ? treffer[1] : null
        });
        block = null;
      } else if (block !== null) {
        block.zeilen.push(zeile);
      }
    });
  }
  return abfragen;
}

module.exports = { datenbankNamen, ladeSchema, liesmichAbfragen, SEED };
