-- Randfall-Variante „null“ des Verhör-Kontexts V3 Schulkiosk (LIESMICH „Randfall-Varianten“, Spec 7.4).
-- Delta auf einer Kopie der Haupt-DB (basis.sql); IDs im reservierten Bereich ab 9001.
-- Ein neues Produkt im Sortiment, dessen Preis noch nicht festgelegt ist (Preis NULL, noch nie verkauft).
-- Entlarvt: „Anzahl der Produkte je Kategorie“ (A3-V-05) mit COUNT(Preis) statt COUNT(*) bzw. COUNT(ProduktNr)
-- (Snack: 3 statt 4). AVG(Preis) ignoriert NULL – die teuren Kategorien (A3-V-07) bleiben gleich.

PRAGMA foreign_keys = ON;

INSERT INTO Produkt (ProduktNr, Bezeichnung, Kategorie, Preis) VALUES
  (9001, 'Gemüse-Wrap', 'Snack', NULL);
