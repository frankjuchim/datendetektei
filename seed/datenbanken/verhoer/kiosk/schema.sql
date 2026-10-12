-- =====================================================================
-- Datendetektei Weserstedt · Verhör-Kontext V3 „Schulkiosk“ (Verhör 3, Akte 3)
-- Nur für das Verhör (nie öffentlich unter /db/). Die Kiosk-AG einer Gesamtschule verkauft in den großen Pausen
-- Brötchen, Getränke, Snacks und Obst. Je Pause kassieren zwei Helferinnen bzw. Helfer (Schicht); jeder Verkauf
-- gehört zu einer Schicht und besteht aus Posten (Produkt und Anzahl); bezahlt wird bar oder mit der Schülerkarte.
-- Preise in Euro, immer Vielfache von 0,25 € (Summen ohne Rundungsfehler).
-- Kurzschreibweise:
--   Produkt(ProduktNr, Bezeichnung, Kategorie, Preis)
--   Helfer(HelferNr, Vorname, Nachname, Klasse)
--   Schicht(SchichtNr, ↑HelferNr, Datum, Pause)
--   Verkauf(VerkaufNr, ↑SchichtNr, Zeitpunkt, Zahlart)
--   Posten(↑VerkaufNr, ↑ProduktNr, Anzahl)            PK: VerkaufNr, ProduktNr
-- =====================================================================

PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS Posten;
DROP TABLE IF EXISTS Verkauf;
DROP TABLE IF EXISTS Schicht;
DROP TABLE IF EXISTS Helfer;
DROP TABLE IF EXISTS Produkt;

CREATE TABLE Produkt (
  ProduktNr   INTEGER PRIMARY KEY,
  Bezeichnung TEXT    NOT NULL,
  Kategorie   TEXT    NOT NULL CHECK (Kategorie IN ('Brötchen', 'Getränk', 'Snack', 'Obst')),
  Preis       REAL    CHECK (Preis > 0 AND Preis * 4 = CAST(Preis * 4 AS INTEGER))  -- NULL = noch nicht festgelegt
);

CREATE TABLE Helfer (
  HelferNr INTEGER PRIMARY KEY,
  Vorname  TEXT    NOT NULL,
  Nachname TEXT    NOT NULL,
  Klasse   TEXT    NOT NULL CHECK (Klasse IN ('8a', '8b', '9a', '9c', '10a', '10b'))
);

CREATE TABLE Schicht (
  SchichtNr INTEGER PRIMARY KEY,
  HelferNr  INTEGER NOT NULL,
  Datum     TEXT    NOT NULL CHECK (Datum LIKE '____-__-__'),
  Pause     INTEGER NOT NULL CHECK (Pause IN (1, 2)),   -- 1. bzw. 2. große Pause
  FOREIGN KEY (HelferNr) REFERENCES Helfer(HelferNr)
);

CREATE TABLE Verkauf (
  VerkaufNr INTEGER PRIMARY KEY,
  SchichtNr INTEGER NOT NULL,
  Zeitpunkt TEXT    NOT NULL CHECK (Zeitpunkt LIKE '____-__-__ __:__'),
  Zahlart   TEXT    NOT NULL CHECK (Zahlart IN ('bar', 'Karte')),
  FOREIGN KEY (SchichtNr) REFERENCES Schicht(SchichtNr)
);

CREATE TABLE Posten (
  VerkaufNr INTEGER NOT NULL,
  ProduktNr INTEGER NOT NULL,
  Anzahl    INTEGER NOT NULL CHECK (Anzahl BETWEEN 1 AND 10),
  PRIMARY KEY (VerkaufNr, ProduktNr),
  FOREIGN KEY (VerkaufNr) REFERENCES Verkauf(VerkaufNr),
  FOREIGN KEY (ProduktNr) REFERENCES Produkt(ProduktNr)
);
