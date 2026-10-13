-- =====================================================================
-- Datendetektei Weserstedt · Prüfungs-Kontext „Kostümverleih der Theater-AG“ (Nachschreibklausur eA: Aufgabe A + B,
-- gA: A + B-gA; Akte 7). Nur für Klausur-Material und Erwartungshorizonte (nie öffentlich unter /db/, nicht zur
-- Laufzeit geladen).
-- Die Theater-AG eines Gymnasiums verleiht ihren Kostümfundus an die eigenen Mitglieder für Proben und Aufführungen.
-- Erfasst wird, wer welches Kostüm für welche Rolle in welchem Stück von wann bis wann ausgeliehen hat. Bis ist NULL,
-- solange das Kostüm nicht zurückgegeben ist. PateNr verweist auf Mitglied.MitgliedNr (rekursive Beziehung istPateVon:
-- ältere Mitglieder begleiten neue; NULL = ohne Patin bzw. Paten).
-- KostuemRolle ist eine zusammengelegte Tabelle OHNE Schlüssel (Kostümplanung aus der alten Tabellenkalkulation),
-- KostuemlisteRoh eine Rohliste mit nicht-atomaren Werten (Material der Aufgabe B-gA).
-- Kurzschreibweise:
--   Mitglied(MitgliedNr, Vorname, Nachname, Klasse, ↑PateNr)
--   Kostuem(KostuemNr, Bezeichnung, Groesse, Epoche, Zustand)
--   Stueck(StueckNr, Titel, Premiere)
--   Rolle(RollenNr, Name, ↑StueckNr)
--   Ausleihe(AusleihNr, ↑KostuemNr, ↑MitgliedNr, ↑RollenNr, Von, Bis)
--   KostuemRolle(KostuemNr, Bezeichnung, RollenNr, Rolle, Stueck, Premiere)                ohne Schlüssel
--   KostuemlisteRoh(Kostuem, Groesse, Rollen, Stuecke, Verantwortliche, Telefon)            ohne Schlüssel
-- =====================================================================

PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS KostuemlisteRoh;
DROP TABLE IF EXISTS KostuemRolle;
DROP TABLE IF EXISTS Ausleihe;
DROP TABLE IF EXISTS Rolle;
DROP TABLE IF EXISTS Stueck;
DROP TABLE IF EXISTS Kostuem;
DROP TABLE IF EXISTS Mitglied;

CREATE TABLE Mitglied (
  MitgliedNr INTEGER PRIMARY KEY,
  Vorname    TEXT    NOT NULL,
  Nachname   TEXT    NOT NULL,
  Klasse     TEXT    NOT NULL,                       -- '7a' … '12c'
  PateNr     INTEGER,                                -- NULL = ohne Patin bzw. Paten
  FOREIGN KEY (PateNr) REFERENCES Mitglied(MitgliedNr)
);

CREATE TABLE Kostuem (
  KostuemNr   INTEGER PRIMARY KEY,
  Bezeichnung TEXT    NOT NULL,
  Groesse     TEXT    NOT NULL CHECK (Groesse IN ('S', 'M', 'L', 'XL')),
  Epoche      TEXT    NOT NULL CHECK (Epoche IN ('Antike', 'Mittelalter', 'Barock', '19. Jahrhundert', 'Moderne')),
  Zustand     TEXT    NOT NULL CHECK (Zustand IN ('gut', 'reparaturbedürftig'))
);

CREATE TABLE Stueck (
  StueckNr INTEGER PRIMARY KEY,
  Titel    TEXT    NOT NULL,
  Premiere TEXT    NOT NULL CHECK (Premiere LIKE '____-__-__')
);

CREATE TABLE Rolle (
  RollenNr INTEGER PRIMARY KEY,
  Name     TEXT    NOT NULL,
  StueckNr INTEGER NOT NULL,
  FOREIGN KEY (StueckNr) REFERENCES Stueck(StueckNr)
);

CREATE TABLE Ausleihe (
  AusleihNr  INTEGER PRIMARY KEY,
  KostuemNr  INTEGER NOT NULL,
  MitgliedNr INTEGER NOT NULL,
  RollenNr   INTEGER NOT NULL,
  Von        TEXT    NOT NULL CHECK (Von LIKE '____-__-__'),
  Bis        TEXT    CHECK (Bis LIKE '____-__-__'),  -- NULL = noch nicht zurückgegeben
  FOREIGN KEY (KostuemNr) REFERENCES Kostuem(KostuemNr),
  FOREIGN KEY (MitgliedNr) REFERENCES Mitglied(MitgliedNr),
  FOREIGN KEY (RollenNr) REFERENCES Rolle(RollenNr),
  CHECK (Bis IS NULL OR Bis >= Von)
);

CREATE TABLE KostuemRolle (
  KostuemNr   INTEGER,
  Bezeichnung TEXT,
  RollenNr    INTEGER,
  Rolle       TEXT,
  Stueck      TEXT,
  Premiere    TEXT
);

-- Rohliste: absichtlich ohne Schlüssel, mit nicht-atomaren Werten (Rollen, Stuecke, Verantwortliche, Telefon).
CREATE TABLE KostuemlisteRoh (
  Kostuem         TEXT,
  Groesse         TEXT,
  Rollen          TEXT,
  Stuecke         TEXT,
  Verantwortliche TEXT,
  Telefon         TEXT
);
