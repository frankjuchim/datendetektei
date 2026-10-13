-- =====================================================================
-- Datendetektei Weserstedt · Video-Datenbank „Schachturnier“ (Erklärvideos 1, 2 und 7)
-- Nur für die Beispiele der Erklärvideos (materialien/Videos) – nie für Lab-, AB-, Verhör- oder Klausuraufgaben.
-- Zur Laufzeit nicht geladen und nie öffentlich; geprüft von werkzeuge/material_sql_pruefen.py.
-- Kurzschreibweise:
--   Verein(VereinNr, Name, Ort)
--   Spieler(SpielerNr, Vorname, Nachname, Jahrgang, Wertung, ↑VereinNr)
--   Turnier(TurnierNr, Bezeichnung, Datum, Ort)
--   Partie(PartieNr, ↑TurnierNr, Runde, ↑WeissNr, ↑SchwarzNr, Ergebnis)
-- =====================================================================

PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS Partie;
DROP TABLE IF EXISTS Turnier;
DROP TABLE IF EXISTS Spieler;
DROP TABLE IF EXISTS Verein;

CREATE TABLE Verein (
  VereinNr INTEGER PRIMARY KEY,
  Name     TEXT    NOT NULL UNIQUE,
  Ort      TEXT    NOT NULL
);

CREATE TABLE Spieler (
  SpielerNr INTEGER PRIMARY KEY,
  Vorname   TEXT    NOT NULL,
  Nachname  TEXT    NOT NULL,
  Jahrgang  INTEGER NOT NULL,
  Wertung   INTEGER,                                   -- Wertungszahl; NULL = noch keine Wertung
  VereinNr  INTEGER,                                   -- NULL = vereinslos
  FOREIGN KEY (VereinNr) REFERENCES Verein(VereinNr)
);

CREATE TABLE Turnier (
  TurnierNr   INTEGER PRIMARY KEY,
  Bezeichnung TEXT    NOT NULL,
  Datum       TEXT    NOT NULL CHECK (Datum LIKE '____-__-__'),
  Ort         TEXT    NOT NULL
);

CREATE TABLE Partie (
  PartieNr  INTEGER PRIMARY KEY,
  TurnierNr INTEGER NOT NULL,
  Runde     INTEGER NOT NULL,
  WeissNr   INTEGER NOT NULL,
  SchwarzNr INTEGER NOT NULL,
  Ergebnis  TEXT    CHECK (Ergebnis IN ('1-0', '0-1', 'remis')),   -- NULL = noch nicht beendet
  FOREIGN KEY (TurnierNr) REFERENCES Turnier(TurnierNr),
  FOREIGN KEY (WeissNr) REFERENCES Spieler(SpielerNr),
  FOREIGN KEY (SchwarzNr) REFERENCES Spieler(SpielerNr)
);
