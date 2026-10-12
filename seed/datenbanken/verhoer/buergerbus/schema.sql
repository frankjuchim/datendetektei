-- =====================================================================
-- Datendetektei Weserstedt · Verhör-Kontext V2 „Bürgerbus“ (Verhör 2, Akte 2)
-- Nur für das Verhör (nie öffentlich unter /db/). Ehrenamtliche fahren den Bürgerbus der Gemeinde Brookdorf
-- (Ortsteile Brookdorf, Heidkamp, Moorende) und des Weserstedter Stadtteils Nordheide.
-- StartHalt und ZielHalt verweisen beide auf Haltestelle.HaltID (abweichende Namen, Falle P7);
-- Kennzeichen ist ein natürlicher Text-Schlüssel im fiktiven Format 'BB-101'.
-- Fahrgaeste NULL = nicht gezählt (0 = gezählt, niemand mitgefahren).
-- Kurzschreibweise:
--   Haltestelle(HaltID, Name, Ortsteil)
--   Fahrer(FahrerNr, Vorname, Nachname, Telefon)
--   Bus(Kennzeichen, Sitzplaetze)
--   Fahrt(FahrtNr, ↑FahrerNr, ↑Kennzeichen, ↑StartHalt, ↑ZielHalt, Datum, Abfahrt, Fahrgaeste)
-- =====================================================================

PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS Fahrt;
DROP TABLE IF EXISTS Bus;
DROP TABLE IF EXISTS Fahrer;
DROP TABLE IF EXISTS Haltestelle;

CREATE TABLE Haltestelle (
  HaltID   INTEGER PRIMARY KEY,
  Name     TEXT    NOT NULL UNIQUE,
  Ortsteil TEXT    NOT NULL CHECK (Ortsteil IN ('Brookdorf', 'Heidkamp', 'Moorende', 'Nordheide'))
);

CREATE TABLE Fahrer (
  FahrerNr INTEGER PRIMARY KEY,
  Vorname  TEXT    NOT NULL,
  Nachname TEXT    NOT NULL,
  Telefon  TEXT    NOT NULL UNIQUE CHECK (Telefon LIKE '0000-%')
);

CREATE TABLE Bus (
  Kennzeichen TEXT    PRIMARY KEY CHECK (Kennzeichen LIKE 'BB-___'),
  Sitzplaetze INTEGER NOT NULL CHECK (Sitzplaetze BETWEEN 1 AND 20)
);

CREATE TABLE Fahrt (
  FahrtNr     INTEGER PRIMARY KEY,
  FahrerNr    INTEGER NOT NULL,
  Kennzeichen TEXT,                                   -- NULL nur in der Variante „null“ (Fahrzeug nicht erfasst)
  StartHalt   INTEGER NOT NULL,
  ZielHalt    INTEGER NOT NULL,
  Datum       TEXT    NOT NULL CHECK (Datum LIKE '____-__-__'),
  Abfahrt     TEXT    NOT NULL CHECK (Abfahrt LIKE '__:__'),
  Fahrgaeste  INTEGER CHECK (Fahrgaeste >= 0),        -- NULL = nicht gezählt
  CHECK (StartHalt != ZielHalt),
  FOREIGN KEY (FahrerNr) REFERENCES Fahrer(FahrerNr),
  FOREIGN KEY (Kennzeichen) REFERENCES Bus(Kennzeichen),
  FOREIGN KEY (StartHalt) REFERENCES Haltestelle(HaltID),
  FOREIGN KEY (ZielHalt) REFERENCES Haltestelle(HaltID)
);
