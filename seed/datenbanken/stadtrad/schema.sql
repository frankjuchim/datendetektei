-- =====================================================================
-- Datendetektei Weserstedt · Übungsdatenbank „StadtRad“ (Akten 2 und 6)
-- Übernommen aus der SQL-Werkstatt (stadtrad.sql) und auf die Konventionen
-- der Datendetektei umbenannt (Abbildung siehe LIESMICH.md).
-- Datenzeitraum 2026-08-21 bis 2026-09-20 (Datenstand 2026-09-20 ≈ 20:00).
-- Kurzschreibweise:
--   Station(StationID, Name, Stadtteil, Stellplaetze)
--   Rad(RadID, Typ, Baujahr, ↑StationID, Status)
--   Kunde(KundenID, Vorname, Nachname, Jahrgang, Tarif, Stadtteil)
--   Ausleihe(AusleihID, ↑RadID, ↑KundenID, ↑StartStation, ↑ZielStation,
--            Start, Ende, DauerMin, Preis)
--   Reparatur(ReparaturID, ↑RadID, Datum, Grund, Kosten)
-- =====================================================================

PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS Reparatur;
DROP TABLE IF EXISTS Ausleihe;
DROP TABLE IF EXISTS Kunde;
DROP TABLE IF EXISTS Rad;
DROP TABLE IF EXISTS Station;

CREATE TABLE Station (
  StationID    INTEGER PRIMARY KEY,
  Name         TEXT    NOT NULL UNIQUE,
  Stadtteil    TEXT    NOT NULL
               CHECK (Stadtteil IN ('Altstadt', 'Hafenviertel', 'Weserufer', 'Mühlenfeld',
                                    'Nordheide', 'Lindenhof', 'Deichkamp', 'Bahnhofsviertel')),
  Stellplaetze INTEGER NOT NULL CHECK (Stellplaetze > 0)
);

CREATE TABLE Rad (
  RadID     INTEGER PRIMARY KEY,
  Typ       TEXT    NOT NULL CHECK (Typ IN ('Citybike', 'E-Bike', 'Lastenrad')),
  Baujahr   INTEGER NOT NULL CHECK (Baujahr BETWEEN 2015 AND 2026),
  StationID INTEGER,                                  -- NULL: Werkstatt, unterwegs oder vermisst
  Status    TEXT    NOT NULL CHECK (Status IN ('frei', 'ausgeliehen', 'Werkstatt', 'vermisst')),
  FOREIGN KEY (StationID) REFERENCES Station(StationID)
);

CREATE TABLE Kunde (
  KundenID  INTEGER PRIMARY KEY,
  Vorname   TEXT    NOT NULL,
  Nachname  TEXT    NOT NULL,
  Jahrgang  INTEGER NOT NULL CHECK (Jahrgang BETWEEN 1940 AND 2014),
  Tarif     TEXT    NOT NULL CHECK (Tarif IN ('Basis', 'Plus', 'Schule')),
  Stadtteil TEXT    NOT NULL
            CHECK (Stadtteil IN ('Altstadt', 'Hafenviertel', 'Weserufer', 'Mühlenfeld',
                                 'Nordheide', 'Lindenhof', 'Deichkamp', 'Bahnhofsviertel'))
);

CREATE TABLE Ausleihe (
  AusleihID    INTEGER PRIMARY KEY,
  RadID        INTEGER NOT NULL,
  KundenID     INTEGER NOT NULL,
  StartStation INTEGER NOT NULL,
  ZielStation  INTEGER,                               -- NULL: Rad nicht zurückgegeben
  Start        TEXT    NOT NULL CHECK (Start LIKE '____-__-__ __:__'),
  Ende         TEXT    CHECK (Ende IS NULL OR (Ende LIKE '____-__-__ __:__' AND Ende > Start)),
  DauerMin     INTEGER CHECK (DauerMin IS NULL OR DauerMin > 0),
  Preis        REAL    CHECK (Preis IS NULL OR Preis >= 0),
  CHECK ((Ende IS NULL) = (DauerMin IS NULL)),
  CHECK ((Ende IS NULL) = (Preis IS NULL)),
  FOREIGN KEY (RadID)        REFERENCES Rad(RadID),
  FOREIGN KEY (KundenID)     REFERENCES Kunde(KundenID),
  FOREIGN KEY (StartStation) REFERENCES Station(StationID),
  FOREIGN KEY (ZielStation)  REFERENCES Station(StationID)
);

CREATE TABLE Reparatur (
  ReparaturID INTEGER PRIMARY KEY,
  RadID       INTEGER NOT NULL,
  Datum       TEXT    NOT NULL CHECK (Datum LIKE '____-__-__'),
  Grund       TEXT    NOT NULL,
  Kosten      REAL    NOT NULL CHECK (Kosten >= 0),
  FOREIGN KEY (RadID) REFERENCES Rad(RadID)
);
