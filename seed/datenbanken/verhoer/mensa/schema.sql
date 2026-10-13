-- =====================================================================
-- Datendetektei Weserstedt · Verhör-Kontext V7 „Mensa-Vorbestellsystem“ (Verhör 7 = Lab-Generalprobe, Akte 7;
-- Generalprobe eA/gA). Nur für Verhör und Generalprobe (nie öffentlich unter /db/).
-- Die Mensa einer Gesamtschule lässt Schülerinnen, Schüler und Beschäftigte Mittagessen online vorbestellen. Jedes
-- Gericht wird an mehreren Tagen angeboten; eine Bestellung bezieht sich auf ein Tagesangebot. Abgeholt enthält die
-- Uhrzeit der Ausgabe ('hh:mm') und ist NULL, wenn das Essen nicht abgeholt wurde. Küchenkräfte bereiten die
-- Tagesangebote zu. Preise in Euro, immer Vielfache von 0,25 € (Summen ohne Rundungsfehler).
-- BestellUebersicht ist eine zusammengelegte Tabelle OHNE Schlüssel (Altbestand der Mensa, Material für Anomalien).
-- Kurzschreibweise:
--   Person(PersonNr, Vorname, Nachname, Rolle, Klasse)
--   Gericht(GerichtNr, Bezeichnung, Kategorie, Preis, Vegetarisch)
--   Angebot(AngebotNr, ↑GerichtNr, Datum, Portionen)
--   Bestellung(BestellNr, ↑PersonNr, ↑AngebotNr, Menge, Abgeholt)
--   Kuechenkraft(KraftNr, Vorname, Nachname)
--   bereitetZu(↑KraftNr, ↑AngebotNr)                 PK: KraftNr, AngebotNr
--   BestellUebersicht(BestellNr, PersonNr, Name, Klasse, Datum, Gericht, Preis, Menge)   ohne Schlüssel
-- =====================================================================

PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS BestellUebersicht;
DROP TABLE IF EXISTS bereitetZu;
DROP TABLE IF EXISTS Kuechenkraft;
DROP TABLE IF EXISTS Bestellung;
DROP TABLE IF EXISTS Angebot;
DROP TABLE IF EXISTS Gericht;
DROP TABLE IF EXISTS Person;

CREATE TABLE Person (
  PersonNr INTEGER PRIMARY KEY,
  Vorname  TEXT    NOT NULL,
  Nachname TEXT    NOT NULL,
  Rolle    TEXT    NOT NULL CHECK (Rolle IN ('Schüler', 'Lehrkraft', 'Personal')),
  Klasse   TEXT,                                    -- nur bei Schülerinnen und Schülern, sonst NULL
  CHECK ((Rolle = 'Schüler') = (Klasse IS NOT NULL))
);

CREATE TABLE Gericht (
  GerichtNr   INTEGER PRIMARY KEY,
  Bezeichnung TEXT    NOT NULL,
  Kategorie   TEXT    NOT NULL CHECK (Kategorie IN ('Hauptgericht', 'Suppe', 'Salat', 'Dessert')),
  Preis       REAL    NOT NULL CHECK (Preis > 0 AND Preis * 4 = CAST(Preis * 4 AS INTEGER)),
  Vegetarisch TEXT    CHECK (Vegetarisch IN ('ja', 'nein'))   -- NULL = Angabe fehlt (nur Variante null)
);

CREATE TABLE Angebot (
  AngebotNr INTEGER PRIMARY KEY,
  GerichtNr INTEGER NOT NULL,
  Datum     TEXT    NOT NULL CHECK (Datum LIKE '____-__-__'),
  Portionen INTEGER NOT NULL CHECK (Portionen > 0),        -- geplante (vorbereitete) Portionen
  FOREIGN KEY (GerichtNr) REFERENCES Gericht(GerichtNr)
);

CREATE TABLE Bestellung (
  BestellNr INTEGER PRIMARY KEY,
  PersonNr  INTEGER NOT NULL,
  AngebotNr INTEGER NOT NULL,
  Menge     INTEGER NOT NULL CHECK (Menge BETWEEN 1 AND 3),
  Abgeholt  TEXT    CHECK (Abgeholt LIKE '__:__'),         -- NULL = nicht abgeholt
  FOREIGN KEY (PersonNr) REFERENCES Person(PersonNr),
  FOREIGN KEY (AngebotNr) REFERENCES Angebot(AngebotNr)
);

CREATE TABLE Kuechenkraft (
  KraftNr  INTEGER PRIMARY KEY,
  Vorname  TEXT    NOT NULL,
  Nachname TEXT    NOT NULL
);

CREATE TABLE bereitetZu (
  KraftNr   INTEGER NOT NULL,
  AngebotNr INTEGER NOT NULL,
  PRIMARY KEY (KraftNr, AngebotNr),
  FOREIGN KEY (KraftNr) REFERENCES Kuechenkraft(KraftNr),
  FOREIGN KEY (AngebotNr) REFERENCES Angebot(AngebotNr)
);

CREATE TABLE BestellUebersicht (
  BestellNr INTEGER,
  PersonNr  INTEGER,
  Name      TEXT,
  Klasse    TEXT,
  Datum     TEXT,
  Gericht   TEXT,
  Preis     REAL,
  Menge     INTEGER
);
