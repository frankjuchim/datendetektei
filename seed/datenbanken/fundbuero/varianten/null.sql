-- Randfall-Variante „null“ der Übungsdatenbank Fundbuero (LIESMICH „Randfall-Varianten“, Spec 7.4).
-- Delta auf einer Kopie der Haupt-DB (basis.sql); IDs im reservierten Bereich ab 9001.
-- Entlarvt: „Anzahl Fundsachen ohne bekannten Wert“ mit WHERE Wert = NULL (→ 0);
-- „Fundsachen, die nicht schwarz sind (auch ohne Farbangabe)“ nur mit Farbe != 'schwarz' (verliert 9001).

PRAGMA foreign_keys = ON;

INSERT INTO Fundsache (FundNr, Bezeichnung, Kategorie, Farbe, Fundort, Stadtteil, Funddatum, Wert, Finder, AbgeholtAm) VALUES
  -- ohne Farbe, Wert und Finder, noch nicht abgeholt
  (9001, 'Handschuh', 'Kleidung', NULL, 'Bus Linie 4', 'Bahnhofsviertel', '2026-09-17', NULL, NULL, NULL),
  -- Wert unbekannt, aber abgeholt
  (9002, 'Rucksack', 'Taschen', 'grün', 'Station Mensa', 'Lindenhof', '2026-08-12', NULL, 'J. Sanders', '2026-08-19');
