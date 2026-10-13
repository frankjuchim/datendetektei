-- Randfall-Variante „null“ des Verhör-Kontexts V6 Fitness-App (LIESMICH „Randfall-Varianten“, Spec 7.4).
-- Delta auf einer Kopie der Haupt-DB (basis.sql); Token im reservierten Bereich N-9xx.
-- Ein weiterer Token in einer neuen, kleinen Gruppe (1971, '005'), am Stichtag ohne Ruhepuls (kein Messgerät).
-- Entlarvt bei A6-V-05: COUNT(Ruhepuls) statt COUNT(*) (die Gruppe hätte 0 und fehlte) und Abfragen, die nur zufällig
-- genau vier Kombinationen liefern (z. B. ORDER BY COUNT(*) … LIMIT 4 statt HAVING COUNT(*) = 1); jetzt sind es fünf.

PRAGMA foreign_keys = ON;

INSERT INTO Export (NutzerToken, Geburtsjahr, PLZBereich, Geschlecht, Schritte, Ruhepuls, Datum) VALUES
  ('N-901', 1971, '005', 'd', 7340, NULL, '2026-10-05');

INSERT INTO ExportVerlauf (NutzerToken, Geburtsjahr, PLZBereich, Geschlecht, Schritte, Ruhepuls, Datum) VALUES
  ('N-901', 1971, '005', 'd', 6120, NULL, '2026-10-04'),
  ('N-901', 1971, '005', 'd', 7340, NULL, '2026-10-05');
