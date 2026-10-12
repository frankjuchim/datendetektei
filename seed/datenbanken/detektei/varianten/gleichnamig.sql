-- Randfall-Variante „gleichnamig“ der Übungsdatenbank Detektei (LIESMICH „Randfall-Varianten“, Spec 7.4).
-- Delta auf einer Kopie der Haupt-DB (basis.sql); IDs ab 9001, Ermittler ab 901.
-- Eine zweite Nora Falter (1959, Nordheide), verdächtig nur in Fall 2. Entlarvt: „Wer ist in allen vier Fällen
-- verdächtig?“ mit GROUP BY Person.Vorname, Person.Nachname → 5 statt 4 Treffer, Ergebnis leer (P3).
-- Zusätzlich kennt sie Person 46 (Ole Bultjer), den Person 13 nicht kennt: „Wen kennt Nora Falter?“ über den Namen
-- statt über PersonNr 13 liefert damit eine Zeile zu viel (sonst wäre diese Fehlabfrage auf der Variante unauffällig).

PRAGMA foreign_keys = ON;

INSERT INTO Person (PersonNr, Vorname, Nachname, Jahrgang, Stadtteil) VALUES
  (9011, 'Nora', 'Falter', 1959, 'Nordheide');

INSERT INTO verdaechtig (PersonNr, FallNr, Grad) VALUES
  (9011, 2, 'gering');

INSERT INTO kennt (PersonNr, BekannterNr, Seit) VALUES
  (9011, 46, 1985);
