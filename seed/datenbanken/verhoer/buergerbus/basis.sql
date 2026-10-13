-- =====================================================================
-- Datendetektei Weserstedt · basis.sql der Übungsdatenbank „verhoer/buergerbus“
-- ERZEUGT von scripts/db_bauen.js (npm run db) – nicht von Hand ändern.
-- Datenbank: verhoer/buergerbus
-- Seed: datendetektei:verhoer/buergerbus:v1 (FNV-1a 0x5658c7d3) – kuratiert, kein Generator
-- Version: 1
-- SHA-256 (Datenteil): f6d5045f381efbc1d888db0d3c4a9596a253cd7d143643bb3c4f27ce8fd32280
-- =====================================================================

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

-- ===== Daten (erzeugt) =====
BEGIN;
PRAGMA defer_foreign_keys = ON;

-- Haltestelle: 12 Zeilen
INSERT INTO Haltestelle VALUES (1, 'Kirchplatz', 'Brookdorf');
INSERT INTO Haltestelle VALUES (2, 'Alte Schmiede', 'Brookdorf');
INSERT INTO Haltestelle VALUES (3, 'Feuerwehrhaus', 'Brookdorf');
INSERT INTO Haltestelle VALUES (4, 'Schule Heidkamp', 'Heidkamp');
INSERT INTO Haltestelle VALUES (5, 'Birkenweg', 'Heidkamp');
INSERT INTO Haltestelle VALUES (6, 'Dorfgemeinschaftshaus', 'Heidkamp');
INSERT INTO Haltestelle VALUES (7, 'Mühle Moorende', 'Moorende');
INSERT INTO Haltestelle VALUES (8, 'Torfstich', 'Moorende');
INSERT INTO Haltestelle VALUES (9, 'Hofladen', 'Moorende');
INSERT INTO Haltestelle VALUES (10, 'Bahnhof Nordheide', 'Nordheide');
INSERT INTO Haltestelle VALUES (11, 'Gesundheitszentrum', 'Nordheide');
INSERT INTO Haltestelle VALUES (12, 'Marktplatz Nordheide', 'Nordheide');

-- Fahrer: 8 Zeilen
INSERT INTO Fahrer VALUES (1, 'Gesa', 'Bredehorn', '0000-41201');
INSERT INTO Fahrer VALUES (2, 'Hauke', 'Rohlfs', '0000-41202');
INSERT INTO Fahrer VALUES (3, 'Ulf', 'Meinecke', '0000-41203');
INSERT INTO Fahrer VALUES (4, 'Imke', 'Tebbe', '0000-41204');
INSERT INTO Fahrer VALUES (5, 'Sönke', 'Harjes', '0000-41205');
INSERT INTO Fahrer VALUES (6, 'Taalke', 'Bödeker', '0000-41206');
INSERT INTO Fahrer VALUES (7, 'Hauke', 'Rohlfs', '0000-41207');
INSERT INTO Fahrer VALUES (8, 'Okke', 'Thölken', '0000-41208');

-- Bus: 4 Zeilen
INSERT INTO Bus VALUES ('BB-101', 8);
INSERT INTO Bus VALUES ('BB-102', 8);
INSERT INTO Bus VALUES ('BB-103', 9);
INSERT INTO Bus VALUES ('BB-104', 12);

-- Fahrt: 70 Zeilen
INSERT INTO Fahrt VALUES (1, 1, 'BB-101', 1, 10, '2026-09-01', '07:45', 8);
INSERT INTO Fahrt VALUES (2, 2, 'BB-104', 10, 12, '2026-09-01', '16:10', 8);
INSERT INTO Fahrt VALUES (3, 3, 'BB-103', 6, 12, '2026-09-02', '07:45', 3);
INSERT INTO Fahrt VALUES (4, 4, 'BB-102', 10, 1, '2026-09-02', '10:45', 7);
INSERT INTO Fahrt VALUES (5, 5, 'BB-101', 5, 10, '2026-09-02', '15:20', 8);
INSERT INTO Fahrt VALUES (6, 6, 'BB-104', 12, 2, '2026-09-03', '07:45', 9);
INSERT INTO Fahrt VALUES (7, 7, 'BB-103', 4, 11, '2026-09-03', '16:10', 2);
INSERT INTO Fahrt VALUES (8, 8, 'BB-102', 12, 9, '2026-09-04', '08:15', 2);
INSERT INTO Fahrt VALUES (9, 1, 'BB-102', 9, 10, '2026-09-04', '10:45', NULL);
INSERT INTO Fahrt VALUES (10, 2, 'BB-101', 11, 4, '2026-09-04', '15:20', 1);
INSERT INTO Fahrt VALUES (11, 3, 'BB-104', 3, 10, '2026-09-07', '08:15', 9);
INSERT INTO Fahrt VALUES (12, 4, 'BB-103', 11, 3, '2026-09-07', '14:30', 7);
INSERT INTO Fahrt VALUES (13, 5, 'BB-102', 7, 12, '2026-09-08', '07:45', 8);
INSERT INTO Fahrt VALUES (14, 6, 'BB-101', 11, 6, '2026-09-08', '16:10', 2);
INSERT INTO Fahrt VALUES (15, 7, 'BB-104', 10, 11, '2026-09-09', '07:45', 11);
INSERT INTO Fahrt VALUES (16, 8, 'BB-101', 12, 7, '2026-09-09', '10:45', 0);
INSERT INTO Fahrt VALUES (17, 1, 'BB-103', 8, 11, '2026-09-09', '15:20', 4);
INSERT INTO Fahrt VALUES (18, 2, 'BB-102', 1, 4, '2026-09-10', '07:45', NULL);
INSERT INTO Fahrt VALUES (19, 3, 'BB-101', 2, 11, '2026-09-10', '16:10', 5);
INSERT INTO Fahrt VALUES (20, 4, 'BB-104', 10, 5, '2026-09-11', '08:15', 11);
INSERT INTO Fahrt VALUES (21, 5, 'BB-103', 1, 10, '2026-09-11', '10:45', 5);
INSERT INTO Fahrt VALUES (22, 6, 'BB-102', 10, 12, '2026-09-11', '15:20', 3);
INSERT INTO Fahrt VALUES (23, 7, 'BB-101', 6, 12, '2026-09-14', '08:15', 1);
INSERT INTO Fahrt VALUES (24, 8, 'BB-102', 10, 1, '2026-09-14', '14:30', 7);
INSERT INTO Fahrt VALUES (25, 1, 'BB-104', 5, 10, '2026-09-15', '07:45', 2);
INSERT INTO Fahrt VALUES (26, 2, 'BB-103', 12, 2, '2026-09-15', '16:10', 6);
INSERT INTO Fahrt VALUES (27, 3, 'BB-102', 4, 11, '2026-09-16', '07:45', NULL);
INSERT INTO Fahrt VALUES (28, 4, 'BB-101', 12, 9, '2026-09-16', '10:45', 2);
INSERT INTO Fahrt VALUES (29, 5, 'BB-104', 9, 10, '2026-09-16', '15:20', 4);
INSERT INTO Fahrt VALUES (30, 6, 'BB-103', 11, 4, '2026-09-17', '07:45', 9);
INSERT INTO Fahrt VALUES (31, 7, 'BB-102', 3, 10, '2026-09-17', '16:10', 5);
INSERT INTO Fahrt VALUES (32, 8, 'BB-101', 11, 3, '2026-09-18', '08:15', 4);
INSERT INTO Fahrt VALUES (33, 1, 'BB-101', 7, 12, '2026-09-18', '10:45', 3);
INSERT INTO Fahrt VALUES (34, 2, 'BB-104', 11, 6, '2026-09-18', '15:20', 1);
INSERT INTO Fahrt VALUES (35, 3, 'BB-103', 10, 11, '2026-09-21', '08:15', 9);
INSERT INTO Fahrt VALUES (36, 4, 'BB-102', 12, 7, '2026-09-21', '14:30', 6);
INSERT INTO Fahrt VALUES (37, 5, 'BB-101', 8, 11, '2026-09-22', '07:45', NULL);
INSERT INTO Fahrt VALUES (38, 6, 'BB-104', 1, 4, '2026-09-22', '16:10', 10);
INSERT INTO Fahrt VALUES (39, 7, 'BB-103', 2, 11, '2026-09-23', '07:45', 6);
INSERT INTO Fahrt VALUES (40, 8, 'BB-102', 10, 5, '2026-09-23', '10:45', 7);
INSERT INTO Fahrt VALUES (41, 1, 'BB-102', 1, 10, '2026-09-23', '15:20', 6);
INSERT INTO Fahrt VALUES (42, 2, 'BB-101', 10, 12, '2026-09-24', '07:45', 4);
INSERT INTO Fahrt VALUES (43, 3, 'BB-104', 6, 12, '2026-09-24', '16:10', 12);
INSERT INTO Fahrt VALUES (44, 4, 'BB-103', 10, 1, '2026-09-25', '08:15', 8);
INSERT INTO Fahrt VALUES (45, 5, 'BB-102', 5, 10, '2026-09-25', '10:45', 7);
INSERT INTO Fahrt VALUES (46, 6, 'BB-101', 12, 2, '2026-09-25', '15:20', 5);
INSERT INTO Fahrt VALUES (47, 7, 'BB-104', 4, 11, '2026-09-28', '08:15', 9);
INSERT INTO Fahrt VALUES (48, 8, 'BB-101', 12, 9, '2026-09-28', '14:30', NULL);
INSERT INTO Fahrt VALUES (49, 1, 'BB-103', 9, 10, '2026-09-29', '07:45', 6);
INSERT INTO Fahrt VALUES (50, 2, 'BB-102', 11, 4, '2026-09-29', '16:10', 5);
INSERT INTO Fahrt VALUES (51, 3, 'BB-101', 3, 10, '2026-09-30', '07:45', 6);
INSERT INTO Fahrt VALUES (52, 4, 'BB-104', 11, 3, '2026-09-30', '10:45', 8);
INSERT INTO Fahrt VALUES (53, 5, 'BB-103', 7, 12, '2026-09-30', '15:20', 6);
INSERT INTO Fahrt VALUES (54, 6, 'BB-102', 11, 6, '2026-10-01', '07:45', 8);
INSERT INTO Fahrt VALUES (55, 7, 'BB-101', 10, 11, '2026-10-01', '16:10', NULL);
INSERT INTO Fahrt VALUES (56, 8, 'BB-102', 12, 7, '2026-10-02', '08:15', 3);
INSERT INTO Fahrt VALUES (57, 1, 'BB-104', 8, 11, '2026-10-02', '10:45', 1);
INSERT INTO Fahrt VALUES (58, 2, 'BB-103', 1, 4, '2026-10-02', '15:20', 1);
INSERT INTO Fahrt VALUES (59, 3, 'BB-102', 2, 11, '2026-10-05', '08:15', 7);
INSERT INTO Fahrt VALUES (60, 4, 'BB-101', 10, 5, '2026-10-05', '14:30', NULL);
INSERT INTO Fahrt VALUES (61, 5, 'BB-104', 1, 10, '2026-10-06', '07:45', 12);
INSERT INTO Fahrt VALUES (62, 6, 'BB-103', 10, 12, '2026-10-06', '16:10', 8);
INSERT INTO Fahrt VALUES (63, 7, 'BB-102', 6, 12, '2026-10-07', '07:45', 7);
INSERT INTO Fahrt VALUES (64, 8, 'BB-101', 10, 1, '2026-10-07', '10:45', 3);
INSERT INTO Fahrt VALUES (65, 1, 'BB-101', 5, 10, '2026-10-07', '15:20', 7);
INSERT INTO Fahrt VALUES (66, 2, 'BB-104', 12, 2, '2026-10-08', '07:45', 3);
INSERT INTO Fahrt VALUES (67, 3, 'BB-103', 4, 11, '2026-10-08', '16:10', 9);
INSERT INTO Fahrt VALUES (68, 4, 'BB-102', 12, 9, '2026-10-09', '08:15', 5);
INSERT INTO Fahrt VALUES (69, 5, 'BB-101', 9, 10, '2026-10-09', '10:45', 3);
INSERT INTO Fahrt VALUES (70, 6, 'BB-104', 11, 4, '2026-10-09', '15:20', 7);

COMMIT;
