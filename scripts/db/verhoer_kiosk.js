'use strict';
// Verhör-Kontext V3 „Schulkiosk“: vollständig kuratiert, kein Generator (basis.sql = schema.sql + pflicht.sql).
// abnahme() = Tabelle „Abnahme-Prüfungen“ aus seed/datenbanken/verhoer/kiosk/LIESMICH.md
// (Pflicht-Randfälle aus VERHOER_KONTEXTE.md V3 und dem Verhör-Blueprint A3-V-01 … 12).

const { gleich, bereich, wert, spalte, zeilen, zeilenzahlen } = require('./abnahme_hilfen');

const VERBUND_HELFER = `FROM Helfer, Schicht, Verkauf, Posten, Produkt
  WHERE Helfer.HelferNr = Schicht.HelferNr
    AND Schicht.SchichtNr = Verkauf.SchichtNr
    AND Verkauf.VerkaufNr = Posten.VerkaufNr
    AND Posten.ProduktNr = Produkt.ProduktNr`;

const OBSTBECHER_FR2 = `Posten.ProduktNr = Produkt.ProduktNr AND Produkt.Bezeichnung = 'Obstbecher'
  AND Verkauf.Zahlart = 'Karte' AND Verkauf.Zeitpunkt >= '2026-09-25 11:00'`;

function abnahme(db) {
  const produktUmsatz = spalte(db, `SELECT SUM(Posten.Anzahl * Produkt.Preis) AS Umsatz FROM Posten, Produkt
    WHERE Posten.ProduktNr = Produkt.ProduktNr GROUP BY Produkt.ProduktNr ORDER BY Umsatz DESC`);
  return [
    ...zeilenzahlen(db, { Produkt: 14, Helfer: 10, Schicht: 20, Verkauf: 120, Posten: 214 }),
    gleich('A3-V-01 Anzahl Verkäufe und erster Zeitpunkt', zeilen(db, 'SELECT COUNT(*), MIN(Zeitpunkt) FROM Verkauf'),
      [[120, '2026-09-21 09:31']]),
    gleich('Preise ohne NULL, Vielfache von 0,25 €', zeilen(db,
      'SELECT COUNT(Preis), SUM(Preis * 4 != CAST(Preis * 4 AS INTEGER)) FROM Produkt'), [[14, 0]]),
    gleich('jeder Verkauf hat Posten', wert(db,
      'SELECT COUNT(*) FROM Verkauf WHERE VerkaufNr NOT IN (SELECT VerkaufNr FROM Posten)'), 0),
    gleich('Zeitpunkt passt zu Datum der Schicht', wert(db, `SELECT COUNT(*) FROM Verkauf, Schicht
      WHERE Verkauf.SchichtNr = Schicht.SchichtNr AND substr(Verkauf.Zeitpunkt, 1, 10) != Schicht.Datum`), 0),
    gleich('je Helfer zwei Schichten', spalte(db, 'SELECT DISTINCT COUNT(*) FROM Schicht GROUP BY HelferNr'), [2]),
    gleich('COUNT ↔ SUM: Brötchen-Posten / Stückzahl / größte Anzahl', zeilen(db, `SELECT COUNT(*), SUM(Posten.Anzahl),
      MAX(Posten.Anzahl) FROM Posten, Produkt WHERE Posten.ProduktNr = Produkt.ProduktNr AND Produkt.Kategorie = 'Brötchen'`),
    [[91, 166, 4]]),
    gleich('Gleichnamige: Jule Kahrs 8b (1) und 10a (2)', zeilen(db,
      "SELECT HelferNr, Klasse FROM Helfer WHERE Vorname = 'Jule' AND Nachname = 'Kahrs' ORDER BY HelferNr"),
    [[1, '8b'], [2, '10a']]),
    gleich('A3-V-05 Sortiment: Gleichstand Brötchen/Getränk', zeilen(db,
      'SELECT Kategorie, COUNT(*) FROM Produkt GROUP BY Kategorie ORDER BY Kategorie'),
    [['Brötchen', 4], ['Getränk', 4], ['Obst', 3], ['Snack', 3]]),
    gleich('A3-V-06 Produkt ohne Verkauf: nur Apfelschorle', spalte(db,
      'SELECT ProduktNr FROM Produkt WHERE ProduktNr NOT IN (SELECT ProduktNr FROM Posten)'), [6]),
    gleich('A3-V-07 Durchschnittspreis Snack genau 1.50', wert(db,
      "SELECT AVG(Preis) FROM Produkt WHERE Kategorie = 'Snack'"), 1.5),
    gleich('A3-V-07 HAVING AVG(Preis) > 1.50', spalte(db,
      'SELECT Kategorie FROM Produkt GROUP BY Kategorie HAVING AVG(Preis) > 1.50'), ['Brötchen']),
    gleich('A3-V-07 Falle WHERE Preis > 1.50', spalte(db,
      'SELECT Kategorie FROM Produkt WHERE Preis > 1.50 GROUP BY Kategorie ORDER BY Kategorie'), ['Brötchen', 'Obst', 'Snack']),
    gleich('A3-V-08 Top 3 nach Umsatz (verschieden, ≠ Platz 4)', spalte(db, `SELECT Produkt.ProduktNr FROM Posten, Produkt
      WHERE Posten.ProduktNr = Produkt.ProduktNr GROUP BY Produkt.ProduktNr
      ORDER BY SUM(Posten.Anzahl * Produkt.Preis) DESC LIMIT 3`), [2, 3, 1]),
    gleich('A3-V-08 Umsätze Platz 1–4', produktUmsatz.slice(0, 4), [89.25, 76.25, 57, 40]),
    gleich('A3-V-11 Umsatz je Helfer', zeilen(db, `SELECT Helfer.HelferNr, SUM(Posten.Anzahl * Produkt.Preis)
      ${VERBUND_HELFER} GROUP BY Helfer.HelferNr ORDER BY Helfer.HelferNr`),
    [[1, 32.5], [2, 23], [3, 75.25], [4, 50], [5, 36.25], [6, 32], [7, 42.5], [8, 37.5], [9, 34.25], [10, 61.25]]),
    gleich('A3-V-11 HAVING > 50: Helfer 3 und 10 (Helfer 4 genau 50)', spalte(db, `SELECT Helfer.HelferNr
      ${VERBUND_HELFER} GROUP BY Helfer.HelferNr, Helfer.Vorname, Helfer.Nachname
      HAVING SUM(Posten.Anzahl * Produkt.Preis) > 50 ORDER BY Helfer.HelferNr`), [3, 10]),
    gleich('A3-V-11 Falle: nach Namen gruppiert erscheint „Jule Kahrs“ mit 55.5', zeilen(db, `SELECT Helfer.Vorname,
      Helfer.Nachname, SUM(Posten.Anzahl * Produkt.Preis) ${VERBUND_HELFER} GROUP BY Helfer.Vorname, Helfer.Nachname
      HAVING SUM(Posten.Anzahl * Produkt.Preis) > 50 ORDER BY Helfer.Nachname`),
    [['Mats', 'Glander', 75.25], ['Ella', 'Hemmen', 61.25], ['Jule', 'Kahrs', 55.5]]),
    gleich('A3-V-10 Kartenzahlungen Fr 2. Pause', spalte(db,
      "SELECT VerkaufNr FROM Verkauf WHERE Zahlart = 'Karte' AND Zeitpunkt >= '2026-09-25 11:00'"), [112, 119]),
    gleich('A3-V-10 Obstbecher: 4 Stück in der Woche', wert(db,
      'SELECT SUM(Anzahl) FROM Posten WHERE ProduktNr = 14'), 4),
    gleich('A3-V-10 richtig (mit Verbund) / Fehlabfrage ohne Posten.VerkaufNr = Verkauf.VerkaufNr', [
      wert(db, `SELECT SUM(Posten.Anzahl * Produkt.Preis) FROM Verkauf, Posten, Produkt
        WHERE Posten.VerkaufNr = Verkauf.VerkaufNr AND ${OBSTBECHER_FR2}`),
      wert(db, `SELECT SUM(Posten.Anzahl * Produkt.Preis) FROM Verkauf, Posten, Produkt WHERE ${OBSTBECHER_FR2}`)
    ], [1.75, 14]),
    bereich('Gesamtumsatz der Woche', wert(db, `SELECT SUM(Posten.Anzahl * Produkt.Preis) FROM Posten, Produkt
      WHERE Posten.ProduktNr = Produkt.ProduktNr`), 350, 500),
    gleich('VerkaufNr chronologisch', wert(db, `SELECT COUNT(*) FROM Verkauf a, Verkauf b
      WHERE a.VerkaufNr < b.VerkaufNr AND a.Zeitpunkt > b.Zeitpunkt`), 0)
  ];
}

module.exports = { abnahme };
