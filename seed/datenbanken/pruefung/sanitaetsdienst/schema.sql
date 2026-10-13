-- =====================================================================
-- Datendetektei Weserstedt · Prüfungs-Kontext „Schulsanitätsdienst“ (Klausur eA: Aufgabe A + B, gA: A + B-gA;
-- Akte 7). Nur für Klausur-Material und Erwartungshorizonte (nie öffentlich unter /db/, nicht zur Laufzeit geladen).
-- Der Schulsanitätsdienst einer Oberschule dokumentiert seine Einsätze bei Unfällen und Erkrankungen im Schulalltag:
-- wer eingesetzt war (in welcher Rolle), wo und wann der Einsatz stattfand und welches Material verbraucht wurde.
-- Neue Mitglieder werden von einer erfahrenen Sanitäterin bzw. einem erfahrenen Sanitäter betreut (BetreuerNr
-- verweist auf Sanitaeter.SanNr – rekursive Beziehung betreut, abweichender Name; Leitung ohne Betreuer = NULL).
-- EinsatzListe ist eine zusammengelegte Tabelle OHNE Schlüssel (alte Tabellenkalkulation, Material für Anomalien),
-- AusbildungRoh eine Rohliste mit nicht-atomaren Werten (Material der Aufgabe B-gA).
-- Kurzschreibweise:
--   Sanitaeter(SanNr, Vorname, Nachname, Klasse, Stufe, ↑BetreuerNr)
--   Einsatz(EinsatzNr, Datum, Uhrzeit, Ort, Art)
--   eingesetzt(↑SanNr, ↑EinsatzNr, Rolle)              PK: SanNr, EinsatzNr
--   Material(MatNr, Bezeichnung, Bestand)
--   verbraucht(↑EinsatzNr, ↑MatNr, Menge)              PK: EinsatzNr, MatNr
--   EinsatzListe(EinsatzNr, Datum, Ort, SanNr, Name, Klasse, Rolle)              ohne Schlüssel
--   AusbildungRoh(SanNr, Name, Kurse, Referent, RefTelefon, Raum)                 ohne Schlüssel
-- =====================================================================

PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS AusbildungRoh;
DROP TABLE IF EXISTS EinsatzListe;
DROP TABLE IF EXISTS verbraucht;
DROP TABLE IF EXISTS Material;
DROP TABLE IF EXISTS eingesetzt;
DROP TABLE IF EXISTS Einsatz;
DROP TABLE IF EXISTS Sanitaeter;

CREATE TABLE Sanitaeter (
  SanNr      INTEGER PRIMARY KEY,
  Vorname    TEXT    NOT NULL,
  Nachname   TEXT    NOT NULL,
  Klasse     TEXT    NOT NULL,
  Stufe      TEXT    NOT NULL CHECK (Stufe IN ('Anfänger', 'Fortgeschritten', 'Leitung')),
  BetreuerNr INTEGER,                                 -- NULL = ohne Betreuung (Leitung)
  FOREIGN KEY (BetreuerNr) REFERENCES Sanitaeter(SanNr)
);

CREATE TABLE Einsatz (
  EinsatzNr INTEGER PRIMARY KEY,
  Datum     TEXT    NOT NULL CHECK (Datum LIKE '____-__-__'),
  Uhrzeit   TEXT    NOT NULL CHECK (Uhrzeit LIKE '__:__'),
  Ort       TEXT    NOT NULL CHECK (Ort IN ('Sporthalle', 'Sporthallenflur', 'Pausenhof', 'Mensa', 'Klassenraum',
                                            'Treppenhaus')),
  Art       TEXT    NOT NULL CHECK (Art IN ('Sportunfall', 'Kreislauf', 'Schnittwunde', 'Prellung', 'Sonstiges'))
);

CREATE TABLE eingesetzt (
  SanNr     INTEGER NOT NULL,
  EinsatzNr INTEGER NOT NULL,
  Rolle     TEXT    NOT NULL CHECK (Rolle IN ('Ersthelfer', 'Assistenz', 'Dokumentation')),
  PRIMARY KEY (SanNr, EinsatzNr),
  FOREIGN KEY (SanNr) REFERENCES Sanitaeter(SanNr),
  FOREIGN KEY (EinsatzNr) REFERENCES Einsatz(EinsatzNr)
);

CREATE TABLE Material (
  MatNr       INTEGER PRIMARY KEY,
  Bezeichnung TEXT    NOT NULL,
  Bestand     INTEGER NOT NULL CHECK (Bestand >= 0)
);

CREATE TABLE verbraucht (
  EinsatzNr INTEGER NOT NULL,
  MatNr     INTEGER NOT NULL,
  Menge     INTEGER NOT NULL CHECK (Menge > 0),
  PRIMARY KEY (EinsatzNr, MatNr),
  FOREIGN KEY (EinsatzNr) REFERENCES Einsatz(EinsatzNr),
  FOREIGN KEY (MatNr) REFERENCES Material(MatNr)
);

CREATE TABLE EinsatzListe (
  EinsatzNr INTEGER,
  Datum     TEXT,
  Ort       TEXT,
  SanNr     INTEGER,
  Name      TEXT,
  Klasse    TEXT,
  Rolle     TEXT
);

-- Rohliste: absichtlich ohne Schlüssel, mit nicht-atomaren Werten (Kurse, Referent, RefTelefon).
CREATE TABLE AusbildungRoh (
  SanNr      INTEGER,
  Name       TEXT,
  Kurse      TEXT,
  Referent   TEXT,
  RefTelefon TEXT,
  Raum       TEXT
);
