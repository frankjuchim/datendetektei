-- Randfall-Variante „gleichnamig“ des Verhör-Kontexts V7 Mensa-Vorbestellsystem (LIESMICH „Randfall-Varianten“).
-- Delta auf einer Kopie der Haupt-DB (basis.sql); IDs im reservierten Bereich ab 9001.
-- Eine zweite Schülerin „Clara Fehrmann“ (9001, Klasse 9c; Person 21 ist in 6b) mit fünf Bestellungen und ein
-- zweites Gericht „Fischstäbchen mit Kartoffelpüree“ (9011, andere Rezeptur, gleicher Preis), am 2027-03-18 zusätzlich
-- angeboten (9011) und von Person 9001 zweimal bestellt (je 2 Portionen); die übrigen drei Bestellungen von 9001
-- liegen in der Februarwoche (Angebote 2, 4, 6).
-- Entlarvt: Gruppieren nach Vorname, Nachname statt nach PersonNr (A7-V-09: „Clara Fehrmann“ erscheint mit 11
-- Bestellungen, P3) und nach Bezeichnung statt nach GerichtNr (A7-V-08 Portionen je Gericht; A7-V-13: die
-- zusammengelegten Fischstäbchen kämen mit 55.25 auf Platz 3, P3). Die richtigen Ergebnisse von A7-V-09, A7-V-13
-- und GP-eA-f bleiben gleich.

PRAGMA foreign_keys = ON;

INSERT INTO Person (PersonNr, Vorname, Nachname, Rolle, Klasse) VALUES
  (9001, 'Clara', 'Fehrmann', 'Schüler', '9c');

INSERT INTO Gericht (GerichtNr, Bezeichnung, Kategorie, Preis, Vegetarisch) VALUES
  (9011, 'Fischstäbchen mit Kartoffelpüree', 'Hauptgericht', 4.25, 'nein');

INSERT INTO Angebot (AngebotNr, GerichtNr, Datum, Portionen) VALUES
  (9011, 9011, '2027-03-18', 20);

INSERT INTO Bestellung (BestellNr, PersonNr, AngebotNr, Menge, Abgeholt) VALUES
  (9001, 9001, 2, 1, '12:10'),
  (9002, 9001, 4, 1, '12:05'),
  (9003, 9001, 6, 1, '12:20'),
  (9004, 9001, 9011, 2, '12:15'),
  (9005, 9001, 9011, 2, '12:40');
