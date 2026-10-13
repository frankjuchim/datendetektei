'use strict';
// Hilfen für die abnahme()-Funktionen der Generator-Module scripts/db/<name>.js.
// Jede Prüfung ist { name, ok, ist, soll } (Tabelle „Abnahme-Prüfungen“ der DB-LIESMICH).

const { isDeepStrictEqual } = require('node:util');

/** Prüfung auf Gleichheit (tiefer Vergleich). */
function gleich(name, ist, soll) {
  return { name, ok: isDeepStrictEqual(ist, soll), ist, soll };
}

/** Prüfung auf einen Bereich [min, max] (Grenzen eingeschlossen, null = offen). */
function bereich(name, ist, min, max = null) {
  const ok = typeof ist === 'number' && (min === null || ist >= min) && (max === null || ist <= max);
  const soll = max === null ? `≥ ${min}` : min === null ? `≤ ${max}` : `${min} … ${max}`;
  return { name, ok, ist, soll };
}

/** Einzelwert einer Abfrage (erste Spalte der ersten Zeile). */
function wert(db, sql, ...parameter) {
  return db.prepare(sql).pluck().get(...parameter);
}

/** Erste Spalte aller Zeilen. */
function spalte(db, sql, ...parameter) {
  return db.prepare(sql).pluck().all(...parameter);
}

/** Alle Zeilen als Arrays. */
function zeilen(db, sql, ...parameter) {
  return db.prepare(sql).raw().all(...parameter);
}

/** Zeilenzahlen je Tabelle als Prüfungen „Zeilen <Tabelle>“. */
function zeilenzahlen(db, soll) {
  return Object.entries(soll).map(([tabelle, anzahl]) =>
    gleich(`Zeilen ${tabelle}`, wert(db, `SELECT COUNT(*) FROM "${tabelle}"`), anzahl));
}

module.exports = { gleich, bereich, wert, spalte, zeilen, zeilenzahlen };
