-- Randfall-Variante „gleichnamig“ des Verhör-Kontexts V1 Stadtbibliothek (LIESMICH „Randfall-Varianten“, Spec 7.4).
-- Delta auf einer Kopie der Haupt-DB (basis.sql); IDs im reservierten Bereich ab 9001.
-- Ein zweites Exemplar von „Der Leuchtturmwärter“ (gleicher Titel, gleicher Autor, anderer Standort, verfügbar,
-- billiger als Platz 5 der Top 5). Entlarvt: SELECT DISTINCT Titel, Autor … bei der Titelsuche (A1-V-06) bzw. bei
-- Krimis und Verfügbarem (A1-V-03/-04) – jedes Exemplar ist ein eigener Datensatz.

PRAGMA foreign_keys = ON;

INSERT INTO Medium (MedienNr, Titel, Autor, Medienart, Genre, Erscheinungsjahr, Preis, Standort, AusgeliehenBis) VALUES
  (9001, 'Der Leuchtturmwärter', 'Onken', 'Buch', 'Krimi', 2017, 14.00, 'Obergeschoss', NULL);
