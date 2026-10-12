-- Randfall-Variante „gleichnamig“ der Übungsdatenbank Fundbuero (LIESMICH „Randfall-Varianten“, Spec 7.4).
-- Delta auf einer Kopie der Haupt-DB (basis.sql); IDs im reservierten Bereich ab 9001.
-- Ein zweiter Messing-Kompass (Replik, 15 €): WHERE Bezeichnung = 'Messing-Kompass' passt auf der Übungs-DB nur
-- zufällig – „der Eintrag mit der Nachtfalter-Signatur“ braucht Finder = 'N. Falter', „das wertvolle
-- Messing-Fundstück“ eine Bedingung auf Wert.

PRAGMA foreign_keys = ON;

INSERT INTO Fundsache (FundNr, Bezeichnung, Kategorie, Farbe, Fundort, Stadtteil, Funddatum, Wert, Finder, AbgeholtAm) VALUES
  (9011, 'Messing-Kompass', 'Sonstiges', 'gold', 'Marktplatz', 'Altstadt', '2026-07-02', 15, 'T. Habben', '2026-07-04');
