-- =====================================================================
-- Datendetektei Weserstedt · Demo-Datenbank „Eisdiele“ (Gastmodus /gast)
-- Nur für den Probefall (Inhaberin Pia Wendland, Lindenhof) – nie für echte Aufgaben verwenden.
-- Kurzschreibweise:
--   Sorte(SorteNr, Name, Preis, Vegan)
--   Verkauf(VerkaufNr, ↑SorteNr, Datum, Kugeln)
-- =====================================================================

PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS Verkauf;
DROP TABLE IF EXISTS Sorte;

CREATE TABLE Sorte (
  SorteNr INTEGER PRIMARY KEY,
  Name    TEXT    NOT NULL UNIQUE,
  Preis   REAL    NOT NULL CHECK (Preis > 0),        -- Euro je Kugel
  Vegan   TEXT    NOT NULL CHECK (Vegan IN ('ja', 'nein'))
);

CREATE TABLE Verkauf (
  VerkaufNr INTEGER PRIMARY KEY,
  SorteNr   INTEGER NOT NULL,
  Datum     TEXT    NOT NULL CHECK (Datum LIKE '____-__-__'),
  Kugeln    INTEGER NOT NULL CHECK (Kugeln BETWEEN 1 AND 5),
  FOREIGN KEY (SorteNr) REFERENCES Sorte(SorteNr)
);
