-- Randfall-Variante „gleichstand“ der Übungsdatenbank Detektei (LIESMICH „Randfall-Varianten“, Spec 7.4).
-- Delta auf einer Kopie der Haupt-DB (basis.sql); IDs ab 9001, Ermittler ab 901.
-- Verdachtsfälle je Person in der Haupt-DB: Nora Falter (13) 4, Lasse Engelken (42) 2, alle übrigen höchstens 1.
-- Person 9031 ist in Fall 5 und 6 verdächtig und liegt damit gleichauf mit Lasse Engelken auf Rang 2.
-- Entlarvt: „die zwei Personen mit den meisten Verdachtsfällen (bei Gleichstand alle)“ per LIMIT 2 (3 statt 2).

PRAGMA foreign_keys = ON;

INSERT INTO Person (PersonNr, Vorname, Nachname, Jahrgang, Stadtteil) VALUES
  (9031, 'Enno', 'Thölken', 1966, 'Lindenhof');

INSERT INTO verdaechtig (PersonNr, FallNr, Grad) VALUES
  (9031, 5, 'mittel'),
  (9031, 6, 'gering');
