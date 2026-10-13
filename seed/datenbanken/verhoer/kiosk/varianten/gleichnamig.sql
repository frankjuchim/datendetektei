-- Randfall-Variante „gleichnamig“ des Verhör-Kontexts V3 Schulkiosk (LIESMICH „Randfall-Varianten“, Spec 7.4).
-- Delta auf einer Kopie der Haupt-DB (basis.sql); IDs im reservierten Bereich ab 901 (Schicht) bzw. 9001.
-- Eine zweite „Laugenbrezel“ (andere Bäckerei, eigene ProduktNr) mit einem Verkauf in einer zusätzlichen Schicht
-- von Helferin 6 (bar, damit die Kartenzahlungen am Freitag unverändert bleiben).
-- Entlarvt: Gruppieren nach Bezeichnung statt nach ProduktNr (A3-V-06 Stückzahlen, P3) – beide Laugenbrezeln
-- landen in einer Gruppe. Top 3 nach Umsatz (A3-V-08) und HAVING > 50 bei den Helfern (A3-V-11) bleiben gleich.

PRAGMA foreign_keys = ON;

INSERT INTO Produkt (ProduktNr, Bezeichnung, Kategorie, Preis) VALUES
  (9011, 'Laugenbrezel', 'Brötchen', 1.25);

INSERT INTO Schicht (SchichtNr, HelferNr, Datum, Pause) VALUES
  (901, 6, '2026-09-24', 2);

INSERT INTO Verkauf (VerkaufNr, SchichtNr, Zeitpunkt, Zahlart) VALUES
  (9011, 901, '2026-09-24 11:20', 'bar');

INSERT INTO Posten (VerkaufNr, ProduktNr, Anzahl) VALUES
  (9011, 9011, 2);
