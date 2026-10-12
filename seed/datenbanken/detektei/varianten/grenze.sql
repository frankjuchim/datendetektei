-- Randfall-Variante „grenze“ der Übungsdatenbank Detektei (LIESMICH „Randfall-Varianten“, Spec 7.4).
-- Delta auf einer Kopie der Haupt-DB (basis.sql); IDs ab 9001, Ermittler ab 901.
-- Entlarvt: „Bekanntschaften seit 2020“ mit Seit > 2020 (verliert 42 → 5); „Fälle aus 2026“ mit
-- Eroeffnet > '2026-01-01' (verliert Fall 9021).

PRAGMA foreign_keys = ON;

-- Lasse Engelken kennt Gesa Ohlendiek seit 2020 (in der Haupt-DB gibt es diese Bekanntschaft nicht)
INSERT INTO kennt (PersonNr, BekannterNr, Seit) VALUES
  (42, 5, 2020);

INSERT INTO Fall (FallNr, Titel, Eroeffnet, Status, LeiterNr) VALUES
  (9021, 'Die verlegte Urkunde', '2026-01-01', 'abgeschlossen', 6);
