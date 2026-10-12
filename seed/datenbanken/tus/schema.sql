-- =====================================================================
-- Datendetektei Weserstedt · Übungsdatenbank „TuS“ (Akte 4)
-- TuS Weserstedt: Rohliste (Excel-Export, bewusst ohne Schlüssel) und
-- die bereinigte, normalisierte Fassung in derselben Datenbank.
-- Kurzschreibweise:
--   Roh:  MitgliederlisteRoh(Mitglied, Geburtsjahr, Abteilungen, Trainer, TrainerTelefon,
--                            Beitragsgruppe, Monatsbeitrag, Halle, HallenAdresse, Eintritt)
--   normalisiert:
--         Mitglied(MitgliedNr, Vorname, Nachname, Geburtsjahr, ↑Beitragsgruppe, Eintritt)
--         Beitragsgruppe(Gruppe, Monatsbeitrag)
--         Abteilung(AbteilungNr, Name, ↑TrainerNr, ↑HalleNr)
--         Trainer(TrainerNr, Name, Telefon)
--         Halle(HalleNr, Name, Adresse)
--         Mitgliedschaft(↑MitgliedNr, ↑AbteilungNr, Seit)   PK: MitgliedNr, AbteilungNr
-- =====================================================================

PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS Mitgliedschaft;
DROP TABLE IF EXISTS Abteilung;
DROP TABLE IF EXISTS Halle;
DROP TABLE IF EXISTS Trainer;
DROP TABLE IF EXISTS Mitglied;
DROP TABLE IF EXISTS Beitragsgruppe;
DROP TABLE IF EXISTS MitgliederlisteRoh;

-- Rohliste: absichtlich ohne Primärschlüssel, ohne CHECKs, mit nicht-atomaren Werten.
CREATE TABLE MitgliederlisteRoh (
  Mitglied       TEXT,      -- 'Vorname Nachname'
  Geburtsjahr    INTEGER,
  Abteilungen    TEXT,      -- teils mehrere, durch Komma getrennt; NULL bei passiven Mitgliedern
  Trainer        TEXT,      -- in derselben Reihenfolge wie Abteilungen
  TrainerTelefon TEXT,
  Beitragsgruppe TEXT,
  Monatsbeitrag  REAL,      -- redundant zur Beitragsgruppe (→ Änderungsanomalie)
  Halle          TEXT,
  HallenAdresse  TEXT,
  Eintritt       TEXT       -- 'JJJJ-MM-TT'
);

CREATE TABLE Beitragsgruppe (
  Gruppe        TEXT PRIMARY KEY,
  Monatsbeitrag REAL NOT NULL CHECK (Monatsbeitrag >= 0)
);

CREATE TABLE Mitglied (
  MitgliedNr     INTEGER PRIMARY KEY,
  Vorname        TEXT    NOT NULL,
  Nachname       TEXT    NOT NULL,
  Geburtsjahr    INTEGER CHECK (Geburtsjahr IS NULL OR Geburtsjahr BETWEEN 1930 AND 2022),  -- NULL: unbekannt
  Beitragsgruppe TEXT    NOT NULL,
  Eintritt       TEXT    NOT NULL CHECK (Eintritt LIKE '____-__-__'),
  FOREIGN KEY (Beitragsgruppe) REFERENCES Beitragsgruppe(Gruppe)
);

CREATE TABLE Trainer (
  TrainerNr INTEGER PRIMARY KEY,
  Name      TEXT    NOT NULL,
  Telefon   TEXT    NOT NULL CHECK (Telefon LIKE '0000-%')
);

CREATE TABLE Halle (
  HalleNr INTEGER PRIMARY KEY,
  Name    TEXT    NOT NULL UNIQUE,
  Adresse TEXT    NOT NULL
);

CREATE TABLE Abteilung (
  AbteilungNr INTEGER PRIMARY KEY,
  Name        TEXT    NOT NULL UNIQUE,
  TrainerNr   INTEGER NOT NULL,
  HalleNr     INTEGER NOT NULL,
  FOREIGN KEY (TrainerNr) REFERENCES Trainer(TrainerNr),
  FOREIGN KEY (HalleNr)   REFERENCES Halle(HalleNr)
);

CREATE TABLE Mitgliedschaft (
  MitgliedNr  INTEGER NOT NULL,
  AbteilungNr INTEGER NOT NULL,
  Seit        TEXT    NOT NULL CHECK (Seit LIKE '____-__-__'),
  PRIMARY KEY (MitgliedNr, AbteilungNr),
  FOREIGN KEY (MitgliedNr)  REFERENCES Mitglied(MitgliedNr),
  FOREIGN KEY (AbteilungNr) REFERENCES Abteilung(AbteilungNr)
);
