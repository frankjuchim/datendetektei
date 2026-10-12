-- Randfall-Variante „null“ der Übungsdatenbank Detektei (LIESMICH „Randfall-Varianten“, Spec 7.4).
-- Delta auf einer Kopie der Haupt-DB (basis.sql); IDs ab 9001, Ermittler ab 901.
-- Entlarvt: „Ermittler ohne Mentor“ mit MentorNr = NULL (→ keine Zeile); „alle Beweisstücke zu Fall 1 mit Fundort“
-- über einen Verbund mit Ort verliert 9002 (OrtNr NULL); Person 9001 ohne Jahrgang und Stadtteil ist in Fall 5
-- verdächtig (Bedingungen auf Jahrgang/Stadtteil lassen sie stillschweigend fallen).

PRAGMA foreign_keys = ON;

INSERT INTO Ermittler (ErmittlerNr, Name, Dienstgrad, MentorNr) VALUES
  (901, 'Mats Wöltjen', 'Junior', NULL);

INSERT INTO Person (PersonNr, Vorname, Nachname, Jahrgang, Stadtteil) VALUES
  (9001, 'Arne', 'Wiechmann', NULL, NULL);

INSERT INTO verdaechtig (PersonNr, FallNr, Grad) VALUES
  (9001, 5, 'gering');

INSERT INTO Beweisstueck (BeweisNr, Bezeichnung, FallNr, OrtNr) VALUES
  (9002, 'Notizzettel', 1, NULL);
