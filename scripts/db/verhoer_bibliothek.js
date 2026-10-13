'use strict';
// Verhör-Kontext V1 „Stadtbibliothek“: vollständig kuratiert, kein Generator (basis.sql = schema.sql + pflicht.sql).
// abnahme() = Tabelle „Abnahme-Prüfungen“ aus seed/datenbanken/verhoer/bibliothek/LIESMICH.md
// (Pflicht-Randfälle aus VERHOER_KONTEXTE.md V1 und dem Verhör-Blueprint A1-V-01 … 12).

const { gleich, bereich, wert, spalte, zeilen, zeilenzahlen } = require('./abnahme_hilfen');

const KT = "(Genre = 'Krimi' OR Genre = 'Thriller')";

function abnahme(db) {
  const n = wert(db, 'SELECT COUNT(*) FROM Medium');
  const verfuegbar = wert(db, 'SELECT COUNT(*) FROM Medium WHERE AusgeliehenBis IS NULL');
  const topPreise = spalte(db, `SELECT Preis FROM Medium WHERE ${KT} AND AusgeliehenBis IS NULL AND Preis IS NOT NULL
    ORDER BY Preis DESC`);
  return [
    ...zeilenzahlen(db, { Medium: 60 }),
    bereich('Anteil verfügbar (AusgeliehenBis NULL) in Prozent', Math.round((100 * verfuegbar) / n), 35, 45),
    gleich('Preis NULL (Schenkungen)', spalte(db, 'SELECT MedienNr FROM Medium WHERE Preis IS NULL'), [11, 26, 41, 42]),
    gleich('Ausschnitt-Falle: genau drei Titel doppelt',
      spalte(db, 'SELECT Titel FROM Medium GROUP BY Titel HAVING COUNT(*) > 1 ORDER BY Titel'),
      ['Die kleine Möwe Mats', 'Sommer in Moorende', 'Tod am Sielhafen']),
    gleich("Titel 'Der …' (5)", spalte(db, "SELECT MedienNr FROM Medium WHERE Titel LIKE 'Der %'"), [3, 12, 21, 27, 36]),
    gleich('A1-V-06 Titelsuche', spalte(db, "SELECT MedienNr FROM Medium WHERE Titel LIKE 'Der %' AND Autor LIKE '_____'"),
      [3, 12, 36]),
    gleich("LIKE 'Der%' trifft zusätzlich Derbyfieber", spalte(db,
      "SELECT MedienNr FROM Medium WHERE Titel LIKE 'Der%' AND Autor LIKE '_____'"), [3, 8, 12, 36]),
    gleich("LIKE '%der %' trifft zusätzlich 15 und 39", spalte(db,
      "SELECT MedienNr FROM Medium WHERE Titel LIKE '%der %' AND Autor LIKE '_____'"), [3, 12, 15, 36, 39]),
    gleich('A1-V-07 Jahrgänge (Roman/Sachbuch 2000–2010)', spalte(db, `SELECT MedienNr FROM Medium
      WHERE Genre IN ('Roman', 'Sachbuch') AND Erscheinungsjahr BETWEEN 2000 AND 2010`), [19, 20, 21, 26, 27, 28, 30, 32, 56, 57]),
    gleich('Grenzjahre 1999/2011 außerhalb', spalte(db, `SELECT MedienNr FROM Medium
      WHERE Genre IN ('Roman', 'Sachbuch') AND Erscheinungsjahr IN (1999, 2011)`), [22, 29, 31]),
    gleich('A1-V-10 Hörbücher nach 2015, absteigend', zeilen(db, `SELECT MedienNr, Erscheinungsjahr FROM Medium
      WHERE Medienart = 'Hörbuch' AND Erscheinungsjahr > 2015 ORDER BY Erscheinungsjahr DESC`),
    [[52, 2024], [40, 2023], [16, 2021], [46, 2018], [5, 2016]]),
    gleich('Hörbuch 2015 vorhanden (Grenze)', spalte(db,
      "SELECT MedienNr FROM Medium WHERE Medienart = 'Hörbuch' AND Erscheinungsjahr = 2015"), [24]),
    gleich('A1-V-09 Magazin: 6 Medien, eines ohne Preis', zeilen(db,
      "SELECT COUNT(*), COUNT(Preis) FROM Medium WHERE Standort = 'Magazin'"), [[6, 5]]),
    gleich('A1-V-05 ohne Klammern: alle Krimis + Thriller über 15 €', zeilen(db, `SELECT
      SUM(Genre = 'Krimi'), SUM(Genre = 'Thriller') FROM Medium WHERE Genre = 'Krimi' OR Genre = 'Thriller' AND Preis > 15`),
    [[13, 4]]),
    gleich('A1-V-05 Thriller über und bis 15 €', zeilen(db,
      "SELECT SUM(Preis > 15), SUM(Preis <= 15) FROM Medium WHERE Genre = 'Thriller'"), [[4, 4]]),
    gleich('A1-V-11 Top 5 verfügbare Krimis/Thriller', spalte(db, `SELECT MedienNr FROM Medium
      WHERE ${KT} AND AusgeliehenBis IS NULL ORDER BY Preis DESC LIMIT 5`), [12, 4, 14, 9, 16]),
    gleich('A1-V-11 kein Gleichstand an Platz 5/6', topPreise[4] > topPreise[5], true),
    gleich('A1-V-11 teurere ausgeliehene Medien: Thriller 13 (29,90 €), Krimi 5 (24,95 €)', zeilen(db, `SELECT MedienNr, Preis
      FROM Medium WHERE ${KT} AND AusgeliehenBis IS NOT NULL AND Preis > ? ORDER BY Preis DESC`, topPreise[0]),
    [[13, 29.9], [5, 24.95]]),
    gleich('Rückgabedaten nach dem Datenstand 2026-10-12', wert(db,
      "SELECT COUNT(*) FROM Medium WHERE AusgeliehenBis <= '2026-10-12'"), 0),
    gleich('Bezeichnungen beginnen nicht mit Umlaut', wert(db,
      "SELECT COUNT(*) FROM Medium WHERE substr(Titel, 1, 1) IN ('Ä', 'Ö', 'Ü')"), 0)
  ];
}

module.exports = { abnahme };
