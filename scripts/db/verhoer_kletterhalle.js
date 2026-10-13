'use strict';
// Verhör-Kontext V5 „Kletterhalle“: vollständig kuratiert, kein Generator (basis.sql = schema.sql + pflicht.sql).
// abnahme() = Tabelle „Abnahme-Prüfungen“ aus seed/datenbanken/verhoer/kletterhalle/LIESMICH.md
// (Mini-DB für Kardinalität aus Daten, VERHOER_KONTEXTE.md V5, Blueprint A5-V-03/04).

const { gleich, bereich, wert, spalte, zeilen, zeilenzahlen } = require('./abnahme_hilfen');

function abnahme(db) {
  return [
    ...zeilenzahlen(db, { Mitglied: 8, Wand: 4, Routenbauer: 3, Route: 12 }),
    bereich('Zeilen klettert (≈ 25)', wert(db, 'SELECT COUNT(*) FROM klettert'), 22, 28),
    gleich('A5-V-03 Routen je Wand (1:n)', zeilen(db,
      'SELECT Wand.WandNr, COUNT(*) FROM Wand, Route WHERE Wand.WandNr = Route.WandNr GROUP BY Wand.WandNr ORDER BY Wand.WandNr'),
    [[1, 4], [2, 3], [3, 3], [4, 2]]),
    gleich('jede Route genau eine Wand und ein Routenbauer', wert(db,
      'SELECT COUNT(*) FROM Route WHERE WandNr IS NULL OR BauerNr IS NULL'), 0),
    gleich('Routen je Routenbauer', spalte(db, 'SELECT COUNT(*) FROM Route GROUP BY BauerNr ORDER BY BauerNr'), [4, 4, 4]),
    gleich('A5-V-04 jedes Mitglied klettert mehrere Routen', wert(db, `SELECT COUNT(*) FROM Mitglied
      WHERE (SELECT COUNT(DISTINCT RoutenNr) FROM klettert WHERE klettert.MitgliedsNr = Mitglied.MitgliedsNr) < 2`), 0),
    gleich('A5-V-04 Routen mit mehreren Mitgliedern', wert(db, `SELECT COUNT(*) FROM Route
      WHERE (SELECT COUNT(DISTINCT MitgliedsNr) FROM klettert WHERE klettert.RoutenNr = Route.RoutenNr) >= 2`), 11),
    gleich('jede Route mindestens einmal begangen', wert(db, 'SELECT COUNT(DISTINCT RoutenNr) FROM klettert'), 12),
    gleich('dasselbe Paar an zwei Tagen: Mitglied 1, Route 3 (nein, dann ja)', zeilen(db, `SELECT MitgliedsNr, RoutenNr,
      GROUP_CONCAT(Erfolg, '/') FROM (SELECT * FROM klettert ORDER BY Datum) GROUP BY MitgliedsNr, RoutenNr HAVING COUNT(*) > 1`),
    [[1, 3, 'nein/ja']]),
    gleich('Datum im Herbst 2026', zeilen(db, 'SELECT MIN(Datum), MAX(Datum) FROM klettert'), [['2026-09-05', '2026-10-17']]),
    gleich('Durchstiege / Begehungen ohne Durchstieg', zeilen(db,
      "SELECT SUM(Erfolg = 'ja'), SUM(Erfolg = 'nein') FROM klettert"), [[19, 6]]),
    gleich('Ausschnitt A5-V-04 (Zeilen der LIESMICH)', zeilen(db, `SELECT MitgliedsNr, RoutenNr, Datum FROM klettert
      WHERE (MitgliedsNr = 1 AND RoutenNr IN (1, 3)) OR (MitgliedsNr IN (2, 3) AND RoutenNr = 1) OR (MitgliedsNr = 2 AND RoutenNr = 2)
      ORDER BY Datum, MitgliedsNr, RoutenNr`),
    [[1, 1, '2026-09-05'], [1, 3, '2026-09-05'], [3, 1, '2026-09-05'], [2, 2, '2026-09-06'], [1, 3, '2026-09-12'],
      [2, 1, '2026-10-11']])
  ];
}

module.exports = { abnahme };
