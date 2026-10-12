-- Randfall-Variante „grenze“ der Übungsdatenbank Fundbuero (LIESMICH „Randfall-Varianten“, Spec 7.4).
-- Delta auf einer Kopie der Haupt-DB (basis.sql); IDs im reservierten Bereich ab 9001.
-- Werte genau auf den Bedingungsgrenzen. Entlarvt: Funddatum > '2026-06-01' bzw. < '2026-07-31' statt BETWEEN
-- (verliert 9021 bzw. 9022), Wert > 100 statt >= 100 (verliert 9021 und 9022), BETWEEN '2026-09-14' AND
-- '2026-09-19' für die Septemberwoche bis zum Datenstand (verliert 9024). 9023 liegt einen Tag vor dem Zeitraum
-- Juni/Juli und knapp unter 100 €.

PRAGMA foreign_keys = ON;

INSERT INTO Fundsache (FundNr, Bezeichnung, Kategorie, Farbe, Fundort, Stadtteil, Funddatum, Wert, Finder, AbgeholtAm) VALUES
  (9021, 'Kopfhörer', 'Elektronik', 'weiß', 'Station Universität', 'Lindenhof', '2026-06-01', 100, 'R. Aden', NULL),
  -- am Funddatum abgeholt (AbgeholtAm = Funddatum)
  (9022, 'Powerbank', 'Elektronik', 'schwarz', 'Fähranleger', 'Weserufer', '2026-07-31', 100, 'K. Wilms', '2026-07-31'),
  (9023, 'Halskette', 'Schmuck', 'silber', 'Fischmarkt', 'Hafenviertel', '2026-05-31', 99.5, NULL, '2026-06-04'),
  (9024, 'Sporttasche', 'Taschen', 'blau', 'Station Stadion', 'Mühlenfeld', '2026-09-20', 20, 'M. Ahrens', NULL);
