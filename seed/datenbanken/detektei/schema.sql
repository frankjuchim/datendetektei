-- =====================================================================
-- Datendetektei Weserstedt · Übungsdatenbank „Detektei“ (Akten 5 und 6)
-- = Referenzlösung des Architekturwettbewerbs (DS 10/11)
-- Kurzschreibweise:
--   Ermittler(ErmittlerNr, Name, Dienstgrad, ↑MentorNr)          rekursiv 1:n (betreut)
--   Fall(FallNr, Titel, Eroeffnet, Status, ↑LeiterNr)
--   Person(PersonNr, Vorname, Nachname, Jahrgang, Stadtteil)
--   kennt(↑PersonNr, ↑BekannterNr, Seit)                        rekursiv n:m
--   verdaechtig(↑PersonNr, ↑FallNr, Grad)                       n:m
--   Ort(OrtNr, Bezeichnung, Stadtteil)
--   Aussage(↑PersonNr, ↑FallNr, ↑OrtNr, Zeitpunkt, Inhalt)      ternär (Person, Fall, Ort)
--                                                               PK: PersonNr, FallNr, OrtNr, Zeitpunkt
--   Beweisstueck(BeweisNr, Bezeichnung, ↑FallNr, ↑OrtNr)
-- =====================================================================

PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS Beweisstueck;
DROP TABLE IF EXISTS Aussage;
DROP TABLE IF EXISTS Ort;
DROP TABLE IF EXISTS verdaechtig;
DROP TABLE IF EXISTS kennt;
DROP TABLE IF EXISTS Person;
DROP TABLE IF EXISTS Fall;
DROP TABLE IF EXISTS Ermittler;

CREATE TABLE Ermittler (
  ErmittlerNr INTEGER PRIMARY KEY,
  Name        TEXT    NOT NULL,
  Dienstgrad  TEXT    NOT NULL CHECK (Dienstgrad IN ('Leitung', 'Senior', 'Junior', 'Praktikum', 'Ausbildung')),
  MentorNr    INTEGER,                              -- NULL: niemand betreut diese Person
  CHECK (MentorNr IS NULL OR MentorNr != ErmittlerNr),
  FOREIGN KEY (MentorNr) REFERENCES Ermittler(ErmittlerNr)
);

CREATE TABLE Fall (
  FallNr    INTEGER PRIMARY KEY,                    -- Erfassungsnummer in der neuen Datenbank
  Titel     TEXT    NOT NULL,
  Eroeffnet TEXT    NOT NULL CHECK (Eroeffnet LIKE '____-__-__'),
  Status    TEXT    NOT NULL CHECK (Status IN ('offen', 'ruht', 'abgeschlossen')),
  LeiterNr  INTEGER NOT NULL,
  FOREIGN KEY (LeiterNr) REFERENCES Ermittler(ErmittlerNr)
);

CREATE TABLE Person (
  PersonNr  INTEGER PRIMARY KEY,
  Vorname   TEXT    NOT NULL,
  Nachname  TEXT    NOT NULL,
  Jahrgang  INTEGER CHECK (Jahrgang IS NULL OR Jahrgang BETWEEN 1930 AND 2012),  -- NULL: unbekannt
  Stadtteil TEXT    CHECK (Stadtteil IS NULL OR Stadtteil IN ('Altstadt', 'Hafenviertel', 'Weserufer',
                       'Mühlenfeld', 'Nordheide', 'Lindenhof', 'Deichkamp', 'Bahnhofsviertel'))   -- NULL: unbekannt
);

-- gerichtet: PersonNr gibt an, BekannterNr zu kennen (nicht automatisch umgekehrt)
CREATE TABLE kennt (
  PersonNr    INTEGER NOT NULL,
  BekannterNr INTEGER NOT NULL,
  Seit        INTEGER CHECK (Seit IS NULL OR Seit BETWEEN 1950 AND 2026),   -- Jahr
  PRIMARY KEY (PersonNr, BekannterNr),
  CHECK (PersonNr != BekannterNr),
  FOREIGN KEY (PersonNr)    REFERENCES Person(PersonNr),
  FOREIGN KEY (BekannterNr) REFERENCES Person(PersonNr)
);

CREATE TABLE verdaechtig (
  PersonNr INTEGER NOT NULL,
  FallNr   INTEGER NOT NULL,
  Grad     TEXT    NOT NULL CHECK (Grad IN ('gering', 'mittel', 'hoch')),
  PRIMARY KEY (PersonNr, FallNr),
  FOREIGN KEY (PersonNr) REFERENCES Person(PersonNr),
  FOREIGN KEY (FallNr)   REFERENCES Fall(FallNr)
);

CREATE TABLE Ort (
  OrtNr       INTEGER PRIMARY KEY,
  Bezeichnung TEXT    NOT NULL UNIQUE,
  Stadtteil   TEXT    NOT NULL CHECK (Stadtteil IN ('Altstadt', 'Hafenviertel', 'Weserufer', 'Mühlenfeld',
                                                    'Nordheide', 'Lindenhof', 'Deichkamp', 'Bahnhofsviertel'))
);

-- ternäre Beziehung sagtAus (Person, Fall, Ort; m:n:p). Zeitpunkt gehört zum Schlüssel, weil dieselbe
-- Person im selben Fall am selben Ort mehrfach aussagen kann (Überführung mit Begründung, DS 11).
CREATE TABLE Aussage (
  PersonNr  INTEGER NOT NULL,
  FallNr    INTEGER NOT NULL,
  OrtNr     INTEGER NOT NULL,
  Zeitpunkt TEXT    NOT NULL CHECK (Zeitpunkt LIKE '____-__-__ __:__'),
  Inhalt    TEXT    NOT NULL,
  PRIMARY KEY (PersonNr, FallNr, OrtNr, Zeitpunkt),
  FOREIGN KEY (PersonNr) REFERENCES Person(PersonNr),
  FOREIGN KEY (FallNr)   REFERENCES Fall(FallNr),
  FOREIGN KEY (OrtNr)    REFERENCES Ort(OrtNr)
);

CREATE TABLE Beweisstueck (
  BeweisNr    INTEGER PRIMARY KEY,
  Bezeichnung TEXT    NOT NULL,
  FallNr      INTEGER NOT NULL,
  OrtNr       INTEGER,                              -- NULL: Fundort unbekannt
  FOREIGN KEY (FallNr) REFERENCES Fall(FallNr),
  FOREIGN KEY (OrtNr)  REFERENCES Ort(OrtNr)
);
