-- =====================================================================
-- Datendetektei Weserstedt · Übungsdatenbank „Stadtfest“ (Akten 3 und 6)
-- Weserstedter Stadtfest auf den Weserwiesen (Festplatz, Stadtteil Weserufer):
-- Fr 2026-08-28 (16–24 Uhr) und Sa 2026-08-29 (14–24 Uhr)
-- Kurzschreibweise:
--   Stand(StandNr, Name, Art, Platz)
--   Helfer(HelferNr, Vorname, Nachname, Jahrgang, Verein)
--   Schicht(↑HelferNr, ↑StandNr, Beginn, Ende)            PK: HelferNr, StandNr, Beginn
--   Produkt(ProduktNr, Bezeichnung, Preis, ↑StandNr)
--   Bon(BonNr, ↑StandNr, ↑HelferNr, Zeitpunkt, Zahlart)
--   Position(↑BonNr, ↑ProduktNr, Menge)                   PK: BonNr, ProduktNr
-- =====================================================================

PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS Position;
DROP TABLE IF EXISTS Bon;
DROP TABLE IF EXISTS Produkt;
DROP TABLE IF EXISTS Schicht;
DROP TABLE IF EXISTS Helfer;
DROP TABLE IF EXISTS Stand;

CREATE TABLE Stand (
  StandNr INTEGER PRIMARY KEY,
  Name    TEXT    NOT NULL UNIQUE,
  Art     TEXT    NOT NULL CHECK (Art IN ('Essen', 'Getränke', 'Süßes', 'Spiel', 'Info')),
  Platz   TEXT    NOT NULL CHECK (Platz IN ('Bühne', 'Promenade', 'Festwiese'))   -- Bereich des Festplatzes
);

CREATE TABLE Helfer (
  HelferNr INTEGER PRIMARY KEY,
  Vorname  TEXT    NOT NULL,
  Nachname TEXT    NOT NULL,
  Jahrgang INTEGER NOT NULL CHECK (Jahrgang BETWEEN 1940 AND 2010),
  Verein   TEXT                                   -- NULL: ohne Verein (Einzelhelfer)
);

CREATE TABLE Schicht (
  HelferNr INTEGER NOT NULL,
  StandNr  INTEGER NOT NULL,
  Beginn   TEXT    NOT NULL CHECK (Beginn LIKE '____-__-__ __:__'),
  Ende     TEXT    NOT NULL CHECK (Ende LIKE '____-__-__ __:__' AND Ende > Beginn),
  PRIMARY KEY (HelferNr, StandNr, Beginn),
  FOREIGN KEY (HelferNr) REFERENCES Helfer(HelferNr),
  FOREIGN KEY (StandNr)  REFERENCES Stand(StandNr)
);

CREATE TABLE Produkt (
  ProduktNr   INTEGER PRIMARY KEY,
  Bezeichnung TEXT    NOT NULL,
  Preis       REAL    NOT NULL CHECK (Preis > 0),   -- Listenpreis in Euro
  StandNr     INTEGER NOT NULL,
  FOREIGN KEY (StandNr) REFERENCES Stand(StandNr)
);

CREATE TABLE Bon (
  BonNr     INTEGER PRIMARY KEY,
  StandNr   INTEGER NOT NULL,
  HelferNr  INTEGER NOT NULL,                     -- wer kassiert hat („Bediener“)
  Zeitpunkt TEXT    NOT NULL CHECK (Zeitpunkt LIKE '____-__-__ __:__'),
  Zahlart   TEXT    NOT NULL CHECK (Zahlart IN ('bar', 'Karte')),
  FOREIGN KEY (StandNr)  REFERENCES Stand(StandNr),
  FOREIGN KEY (HelferNr) REFERENCES Helfer(HelferNr)
);

CREATE TABLE Position (
  BonNr     INTEGER NOT NULL,
  ProduktNr INTEGER NOT NULL,
  Menge     INTEGER NOT NULL CHECK (Menge >= 0),  -- 0 = Position ohne Menge (Story: Ware ausgegeben, nichts gebucht)
  PRIMARY KEY (BonNr, ProduktNr),
  FOREIGN KEY (BonNr)     REFERENCES Bon(BonNr),
  FOREIGN KEY (ProduktNr) REFERENCES Produkt(ProduktNr)
);
