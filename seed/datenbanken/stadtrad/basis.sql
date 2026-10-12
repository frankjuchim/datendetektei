-- =====================================================================
-- Datendetektei Weserstedt · basis.sql der Übungsdatenbank „stadtrad“
-- ERZEUGT von scripts/db_bauen.js (npm run db) – nicht von Hand ändern.
-- Datenbank: stadtrad
-- Seed: datendetektei:stadtrad:v1 (FNV-1a 0x5106e6f6)
-- Version: 1
-- SHA-256 (Datenteil): 4535ac593191255f7adb0d0cbef8d81803bddcabb0c10d490367132f618d308c
-- =====================================================================

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

-- ===== Daten (erzeugt) =====
BEGIN;
PRAGMA defer_foreign_keys = ON;

-- Station: 13 Zeilen
INSERT INTO Station VALUES (1, 'Bahnhof Nord', 'Bahnhofsviertel', 24);
INSERT INTO Station VALUES (2, 'Bahnhof Süd', 'Bahnhofsviertel', 18);
INSERT INTO Station VALUES (3, 'Marktplatz', 'Altstadt', 20);
INSERT INTO Station VALUES (4, 'Rathaus', 'Altstadt', 12);
INSERT INTO Station VALUES (5, 'Alte Werft', 'Hafenviertel', 16);
INSERT INTO Station VALUES (6, 'Fischmarkt', 'Hafenviertel', 10);
INSERT INTO Station VALUES (7, 'Universität', 'Lindenhof', 30);
INSERT INTO Station VALUES (8, 'Mensa', 'Lindenhof', 20);
INSERT INTO Station VALUES (9, 'Stadion', 'Mühlenfeld', 14);
INSERT INTO Station VALUES (10, 'Klinikum', 'Mühlenfeld', 16);
INSERT INTO Station VALUES (11, 'Heidepark', 'Nordheide', 12);
INSERT INTO Station VALUES (12, 'Schulzentrum', 'Nordheide', 22);
INSERT INTO Station VALUES (13, 'Hafenkante', 'Hafenviertel', 8);

-- Rad: 45 Zeilen
INSERT INTO Rad VALUES (1, 'Citybike', 2023, NULL, 'ausgeliehen');
INSERT INTO Rad VALUES (2, 'Citybike', 2021, 4, 'frei');
INSERT INTO Rad VALUES (3, 'Citybike', 2023, 3, 'frei');
INSERT INTO Rad VALUES (4, 'Citybike', 2024, 1, 'frei');
INSERT INTO Rad VALUES (5, 'E-Bike', 2021, NULL, 'ausgeliehen');
INSERT INTO Rad VALUES (6, 'Citybike', 2021, 12, 'frei');
INSERT INTO Rad VALUES (7, 'Citybike', 2025, 1, 'frei');
INSERT INTO Rad VALUES (8, 'E-Bike', 2019, 2, 'frei');
INSERT INTO Rad VALUES (9, 'Citybike', 2021, NULL, 'ausgeliehen');
INSERT INTO Rad VALUES (10, 'Lastenrad', 2019, NULL, 'Werkstatt');
INSERT INTO Rad VALUES (11, 'Citybike', 2022, 7, 'frei');
INSERT INTO Rad VALUES (12, 'Lastenrad', 2020, 1, 'frei');
INSERT INTO Rad VALUES (13, 'E-Bike', 2025, 3, 'frei');
INSERT INTO Rad VALUES (14, 'Citybike', 2020, 6, 'frei');
INSERT INTO Rad VALUES (15, 'E-Bike', 2022, NULL, 'Werkstatt');
INSERT INTO Rad VALUES (16, 'Lastenrad', 2023, NULL, 'Werkstatt');
INSERT INTO Rad VALUES (17, 'Citybike', 2022, 11, 'frei');
INSERT INTO Rad VALUES (18, 'Citybike', 2022, NULL, 'ausgeliehen');
INSERT INTO Rad VALUES (19, 'E-Bike', 2020, 7, 'frei');
INSERT INTO Rad VALUES (20, 'Citybike', 2022, NULL, 'ausgeliehen');
INSERT INTO Rad VALUES (21, 'Citybike', 2020, 1, 'frei');
INSERT INTO Rad VALUES (22, 'Citybike', 2024, 8, 'frei');
INSERT INTO Rad VALUES (23, 'Citybike', 2022, NULL, 'ausgeliehen');
INSERT INTO Rad VALUES (24, 'E-Bike', 2020, 8, 'frei');
INSERT INTO Rad VALUES (25, 'Lastenrad', 2021, NULL, 'Werkstatt');
INSERT INTO Rad VALUES (26, 'Citybike', 2022, 2, 'frei');
INSERT INTO Rad VALUES (27, 'Citybike', 2021, 1, 'frei');
INSERT INTO Rad VALUES (28, 'E-Bike', 2023, 12, 'frei');
INSERT INTO Rad VALUES (29, 'E-Bike', 2023, NULL, 'ausgeliehen');
INSERT INTO Rad VALUES (30, 'Citybike', 2023, 11, 'frei');
INSERT INTO Rad VALUES (31, 'Citybike', 2021, 4, 'frei');
INSERT INTO Rad VALUES (32, 'Citybike', 2024, NULL, 'ausgeliehen');
INSERT INTO Rad VALUES (33, 'Citybike', 2023, 11, 'frei');
INSERT INTO Rad VALUES (34, 'E-Bike', 2021, 12, 'frei');
INSERT INTO Rad VALUES (35, 'E-Bike', 2024, NULL, 'ausgeliehen');
INSERT INTO Rad VALUES (36, 'Citybike', 2019, 2, 'frei');
INSERT INTO Rad VALUES (37, 'E-Bike', 2021, 1, 'frei');
INSERT INTO Rad VALUES (38, 'Citybike', 2025, 4, 'frei');
INSERT INTO Rad VALUES (39, 'Citybike', 2025, NULL, 'Werkstatt');
INSERT INTO Rad VALUES (40, 'E-Bike', 2025, 3, 'frei');
INSERT INTO Rad VALUES (41, 'Lastenrad', 2026, NULL, 'vermisst');
INSERT INTO Rad VALUES (42, 'Lastenrad', 2026, NULL, 'vermisst');
INSERT INTO Rad VALUES (43, 'Lastenrad', 2026, NULL, 'vermisst');
INSERT INTO Rad VALUES (44, 'Lastenrad', 2026, NULL, 'vermisst');
INSERT INTO Rad VALUES (45, 'Lastenrad', 2026, NULL, 'vermisst');

-- Kunde: 80 Zeilen
INSERT INTO Kunde VALUES (1, 'Mia', 'Ahrens', 1995, 'Basis', 'Bahnhofsviertel');
INSERT INTO Kunde VALUES (2, 'Ben', 'Bruhns', 2000, 'Plus', 'Hafenviertel');
INSERT INTO Kunde VALUES (3, 'Lena', 'Cordes', 2009, 'Schule', 'Nordheide');
INSERT INTO Kunde VALUES (4, 'Jonas', 'Dierks', 1974, 'Plus', 'Nordheide');
INSERT INTO Kunde VALUES (5, 'Emma', 'Ehlers', 1995, 'Basis', 'Mühlenfeld');
INSERT INTO Kunde VALUES (6, 'Luca', 'Focken', 2002, 'Basis', 'Bahnhofsviertel');
INSERT INTO Kunde VALUES (7, 'Sofia', 'Gerdes', 2010, 'Schule', 'Bahnhofsviertel');
INSERT INTO Kunde VALUES (8, 'Noah', 'Harms', 2002, 'Basis', 'Lindenhof');
INSERT INTO Kunde VALUES (9, 'Hanna', 'Immig', 1968, 'Plus', 'Altstadt');
INSERT INTO Kunde VALUES (10, 'Elias', 'Janssen', 2000, 'Basis', 'Lindenhof');
INSERT INTO Kunde VALUES (11, 'Marie', 'Kruse', 2010, 'Schule', 'Bahnhofsviertel');
INSERT INTO Kunde VALUES (12, 'Paul', 'Lammers', 2002, 'Basis', 'Bahnhofsviertel');
INSERT INTO Kunde VALUES (13, 'Lea', 'Meiners', 1998, 'Basis', 'Lindenhof');
INSERT INTO Kunde VALUES (14, 'Finn', 'Nolte', 2010, 'Schule', 'Nordheide');
INSERT INTO Kunde VALUES (15, 'Clara', 'Oltmanns', 1992, 'Plus', 'Lindenhof');
INSERT INTO Kunde VALUES (16, 'Tim', 'Poppe', 2006, 'Schule', 'Mühlenfeld');
INSERT INTO Kunde VALUES (17, 'Nele', 'Ricken', 2010, 'Schule', 'Lindenhof');
INSERT INTO Kunde VALUES (18, 'Jan', 'Sanders', 1968, 'Plus', 'Altstadt');
INSERT INTO Kunde VALUES (19, 'Ida', 'Tammen', 1995, 'Plus', 'Altstadt');
INSERT INTO Kunde VALUES (20, 'Ole', 'Ubben', 2000, 'Plus', 'Nordheide');
INSERT INTO Kunde VALUES (21, 'Frieda', 'Vosskuhl', 1990, 'Basis', 'Bahnhofsviertel');
INSERT INTO Kunde VALUES (22, 'Malte', 'Warnken', 2000, 'Plus', 'Bahnhofsviertel');
INSERT INTO Kunde VALUES (23, 'Greta', 'Xylander', 2010, 'Schule', 'Lindenhof');
INSERT INTO Kunde VALUES (24, 'Henry', 'Ziegler', 2004, 'Basis', 'Hafenviertel');
INSERT INTO Kunde VALUES (25, 'Ronja', 'Aden', 1983, 'Basis', 'Mühlenfeld');
INSERT INTO Kunde VALUES (26, 'Linus', 'Bohlken', 1993, 'Basis', 'Lindenhof');
INSERT INTO Kunde VALUES (27, 'Rune', 'Jaspers', 2009, 'Schule', 'Hafenviertel');
INSERT INTO Kunde VALUES (28, 'Pauline', 'Steenken', 1953, 'Basis', 'Altstadt');
INSERT INTO Kunde VALUES (29, 'Marit', 'Schwarting', 1977, 'Basis', 'Altstadt');
INSERT INTO Kunde VALUES (30, 'Aylin', 'Lienemann', 1990, 'Basis', 'Bahnhofsviertel');
INSERT INTO Kunde VALUES (31, 'Leni', 'Hedden', 2004, 'Plus', 'Mühlenfeld');
INSERT INTO Kunde VALUES (32, 'Linus', 'Kowalski', 1982, 'Basis', 'Mühlenfeld');
INSERT INTO Kunde VALUES (33, 'Fenja', 'Lienemann', 1997, 'Basis', 'Bahnhofsviertel');
INSERT INTO Kunde VALUES (34, 'Emil', 'Bredehorn', 1999, 'Plus', 'Mühlenfeld');
INSERT INTO Kunde VALUES (35, 'Mehmet', 'Onken', 2004, 'Basis', 'Deichkamp');
INSERT INTO Kunde VALUES (36, 'Zoe', 'Holtorf', 1982, 'Basis', 'Weserufer');
INSERT INTO Kunde VALUES (37, 'Zoe', 'Siemers', 2008, 'Schule', 'Deichkamp');
INSERT INTO Kunde VALUES (38, 'Svea', 'Ohlrogge', 2004, 'Plus', 'Lindenhof');
INSERT INTO Kunde VALUES (39, 'Keno', 'Beckhusen', 1995, 'Plus', 'Hafenviertel');
INSERT INTO Kunde VALUES (40, 'Svea', 'Glander', 1986, 'Plus', 'Bahnhofsviertel');
INSERT INTO Kunde VALUES (41, 'Clara', 'Rossi', 1975, 'Basis', 'Deichkamp');
INSERT INTO Kunde VALUES (42, 'Mira', 'Mammen', 2003, 'Plus', 'Nordheide');
INSERT INTO Kunde VALUES (43, 'Meike', 'Steenken', 1990, 'Basis', 'Nordheide');
INSERT INTO Kunde VALUES (44, 'Deniz', 'Lampe', 1980, 'Basis', 'Lindenhof');
INSERT INTO Kunde VALUES (45, 'Lasse', 'Bohlken', 2009, 'Schule', 'Bahnhofsviertel');
INSERT INTO Kunde VALUES (46, 'Ilias', 'Glander', 1955, 'Basis', 'Weserufer');
INSERT INTO Kunde VALUES (47, 'Jarne', 'Abeling', 1978, 'Plus', 'Mühlenfeld');
INSERT INTO Kunde VALUES (48, 'Frieda', 'Bargmann', 1952, 'Plus', 'Mühlenfeld');
INSERT INTO Kunde VALUES (49, 'Pia', 'Möhlmann', 1955, 'Basis', 'Lindenhof');
INSERT INTO Kunde VALUES (50, 'Björn', 'Nordhoff', 1985, 'Plus', 'Weserufer');
INSERT INTO Kunde VALUES (51, 'Linus', 'Döscher', 1997, 'Plus', 'Altstadt');
INSERT INTO Kunde VALUES (52, 'Lena', 'Cordes', 1987, 'Basis', 'Altstadt');
INSERT INTO Kunde VALUES (53, 'Yara', 'Thölken', 1964, 'Basis', 'Deichkamp');
INSERT INTO Kunde VALUES (54, 'Sönke', 'Steenken', 1983, 'Basis', 'Nordheide');
INSERT INTO Kunde VALUES (55, 'Fenja', 'Stelljes', 1986, 'Basis', 'Hafenviertel');
INSERT INTO Kunde VALUES (56, 'Ulf', 'Renken', 2012, 'Schule', 'Hafenviertel');
INSERT INTO Kunde VALUES (57, 'Okke', 'Dirksen', 1992, 'Basis', 'Weserufer');
INSERT INTO Kunde VALUES (58, 'Levke', 'Bödeker', 1996, 'Basis', 'Lindenhof');
INSERT INTO Kunde VALUES (59, 'Selin', 'Rabe', 1995, 'Basis', 'Altstadt');
INSERT INTO Kunde VALUES (60, 'Hanna', 'Lampe', 1986, 'Plus', 'Bahnhofsviertel');
INSERT INTO Kunde VALUES (61, 'Anke', 'Engelken', 1975, 'Plus', 'Weserufer');
INSERT INTO Kunde VALUES (62, 'Mira', 'Wiechmann', 1983, 'Basis', 'Altstadt');
INSERT INTO Kunde VALUES (63, 'Deniz', 'Wachtendorf', 2004, 'Basis', 'Nordheide');
INSERT INTO Kunde VALUES (64, 'Tamara', 'Leversen', 1988, 'Basis', 'Hafenviertel');
INSERT INTO Kunde VALUES (65, 'Finn', 'Wendelken', 1956, 'Basis', 'Weserufer');
INSERT INTO Kunde VALUES (66, 'Jarne', 'Kowalski', 1985, 'Basis', 'Nordheide');
INSERT INTO Kunde VALUES (67, 'Maren', 'Pundt', 2010, 'Schule', 'Bahnhofsviertel');
INSERT INTO Kunde VALUES (68, 'Dana', 'Döscher', 1975, 'Plus', 'Lindenhof');
INSERT INTO Kunde VALUES (69, 'Tjark', 'Hinners', 2002, 'Basis', 'Hafenviertel');
INSERT INTO Kunde VALUES (70, 'Tomke', 'Petrović', 1993, 'Basis', 'Deichkamp');
INSERT INTO Kunde VALUES (71, 'Noemi', 'Möhlmann', 1991, 'Basis', 'Mühlenfeld');
INSERT INTO Kunde VALUES (72, 'Greta', 'Stelljes', 1990, 'Plus', 'Weserufer');
INSERT INTO Kunde VALUES (73, 'Joris', 'Bödeker', 1979, 'Plus', 'Hafenviertel');
INSERT INTO Kunde VALUES (74, 'Kaja', 'Rohlfs', 1976, 'Plus', 'Altstadt');
INSERT INTO Kunde VALUES (75, 'Yara', 'Ohlrogge', 1983, 'Plus', 'Mühlenfeld');
INSERT INTO Kunde VALUES (76, 'Kaja', 'Diekmann', 1992, 'Basis', 'Lindenhof');
INSERT INTO Kunde VALUES (77, 'Nora', 'Falter', 1988, 'Plus', 'Hafenviertel');
INSERT INTO Kunde VALUES (78, 'Smilla', 'Eggers', 1987, 'Basis', 'Nordheide');
INSERT INTO Kunde VALUES (79, 'Bente', 'Pundt', 2002, 'Basis', 'Bahnhofsviertel');
INSERT INTO Kunde VALUES (80, 'Joris', 'Kowalski', 2005, 'Basis', 'Deichkamp');

-- Ausleihe: 469 Zeilen
INSERT INTO Ausleihe VALUES (1, 15, 19, 11, 6, '2026-08-21 14:04', '2026-08-21 14:17', 13, 3.06);
INSERT INTO Ausleihe VALUES (2, 35, 23, 6, 3, '2026-08-21 15:37', '2026-08-21 16:17', 40, 6.3);
INSERT INTO Ausleihe VALUES (3, 17, 15, 1, 10, '2026-08-21 10:10', '2026-08-21 10:25', 15, 2.2);
INSERT INTO Ausleihe VALUES (4, 14, 5, 11, 3, '2026-08-21 11:30', '2026-08-21 11:43', 13, 2.04);
INSERT INTO Ausleihe VALUES (5, 39, 20, 7, 12, '2026-08-21 16:13', '2026-08-21 16:41', 28, 3.24);
INSERT INTO Ausleihe VALUES (6, 18, 9, 7, 1, '2026-08-21 16:15', '2026-08-21 16:24', 9, 1.72);
INSERT INTO Ausleihe VALUES (7, 18, 7, 5, 8, '2026-08-21 07:48', '2026-08-21 08:10', 22, 2.76);
INSERT INTO Ausleihe VALUES (8, 21, 10, 10, 7, '2026-08-21 16:19', '2026-08-21 16:25', 6, 1.48);
INSERT INTO Ausleihe VALUES (9, 1, 18, 3, 7, '2026-08-21 17:10', '2026-08-21 17:36', 26, 3.08);
INSERT INTO Ausleihe VALUES (10, 28, 20, 1, 2, '2026-08-21 19:01', '2026-08-21 19:56', 55, 8.1);
INSERT INTO Ausleihe VALUES (11, 33, 21, 10, 5, '2026-08-21 17:53', '2026-08-21 18:01', 8, 1.64);
INSERT INTO Ausleihe VALUES (12, 38, 10, 7, 2, '2026-08-21 13:05', '2026-08-21 13:11', 6, 1.48);
INSERT INTO Ausleihe VALUES (13, 22, 21, 1, 7, '2026-08-22 12:05', '2026-08-22 12:31', 26, 3.08);
INSERT INTO Ausleihe VALUES (14, 11, 4, 2, 7, '2026-08-22 21:16', '2026-08-22 21:26', 10, 1.8);
INSERT INTO Ausleihe VALUES (15, 26, 16, 1, 9, '2026-08-22 10:49', '2026-08-22 10:54', 5, 1.4);
INSERT INTO Ausleihe VALUES (16, 9, 2, 10, 3, '2026-08-22 08:38', '2026-08-22 08:56', 18, 2.44);
INSERT INTO Ausleihe VALUES (17, 17, 8, 4, 10, '2026-08-22 09:16', '2026-08-22 09:40', 24, 2.92);
INSERT INTO Ausleihe VALUES (18, 24, 21, 1, 12, '2026-08-22 09:56', '2026-08-22 10:15', 19, 3.78);
INSERT INTO Ausleihe VALUES (19, 13, 11, 7, 1, '2026-08-22 12:01', '2026-08-22 12:16', 15, 3.3);
INSERT INTO Ausleihe VALUES (20, 25, 24, 2, 9, '2026-08-23 13:51', '2026-08-23 14:26', 35, 6.2);
INSERT INTO Ausleihe VALUES (21, 6, 16, 2, 12, '2026-08-23 08:31', '2026-08-23 08:46', 15, 2.2);
INSERT INTO Ausleihe VALUES (22, 27, 1, 12, 3, '2026-08-23 08:00', '2026-08-23 08:35', 35, 3.8);
INSERT INTO Ausleihe VALUES (23, 37, 22, 12, 5, '2026-08-23 17:03', '2026-08-23 17:47', 44, 6.78);
INSERT INTO Ausleihe VALUES (24, 6, 17, 10, 1, '2026-08-23 20:05', '2026-08-23 20:11', 6, 1.48);
INSERT INTO Ausleihe VALUES (25, 27, 24, 11, 3, '2026-08-23 13:21', '2026-08-23 13:33', 12, 1.96);
INSERT INTO Ausleihe VALUES (26, 12, 11, 12, 1, '2026-08-23 08:13', '2026-08-23 08:39', 26, 5.12);
INSERT INTO Ausleihe VALUES (27, 3, 8, 11, 7, '2026-08-23 16:38', '2026-08-23 16:56', 18, 2.44);
INSERT INTO Ausleihe VALUES (28, 25, 23, 2, 1, '2026-08-23 09:33', '2026-08-23 10:08', 35, 6.2);
INSERT INTO Ausleihe VALUES (29, 7, 10, 4, 1, '2026-08-23 10:40', '2026-08-23 10:47', 7, 1.56);
INSERT INTO Ausleihe VALUES (30, 28, 22, 2, 5, '2026-08-23 13:05', '2026-08-23 13:45', 40, 6.3);
INSERT INTO Ausleihe VALUES (31, 31, 6, 8, 4, '2026-08-23 16:47', '2026-08-23 17:07', 20, 2.6);
INSERT INTO Ausleihe VALUES (32, 4, 16, 4, 7, '2026-08-24 08:57', '2026-08-24 09:23', 26, 3.08);
INSERT INTO Ausleihe VALUES (33, 38, 5, 6, 1, '2026-08-24 08:08', '2026-08-24 08:28', 20, 2.6);
INSERT INTO Ausleihe VALUES (34, 33, 23, 3, 5, '2026-08-24 09:19', '2026-08-24 09:28', 9, 1.72);
INSERT INTO Ausleihe VALUES (35, 14, 13, 3, 9, '2026-08-24 21:38', '2026-08-24 21:48', 10, 1.8);
INSERT INTO Ausleihe VALUES (36, 39, 1, 1, 2, '2026-08-24 14:48', '2026-08-24 14:58', 10, 1.8);
INSERT INTO Ausleihe VALUES (37, 20, 1, 1, 8, '2026-08-24 08:03', '2026-08-24 08:16', 13, 2.04);
INSERT INTO Ausleihe VALUES (38, 37, 21, 1, 7, '2026-08-24 14:03', '2026-08-24 14:33', 30, 5.1);
INSERT INTO Ausleihe VALUES (39, 4, 2, 12, 2, '2026-08-24 08:25', '2026-08-24 08:38', 13, 2.04);
INSERT INTO Ausleihe VALUES (40, 7, 10, 7, 1, '2026-08-24 11:57', '2026-08-24 12:04', 7, 1.56);
INSERT INTO Ausleihe VALUES (41, 18, 2, 3, 4, '2026-08-24 10:09', '2026-08-24 10:33', 24, 2.92);
INSERT INTO Ausleihe VALUES (42, 4, 11, 2, 12, '2026-08-25 18:40', '2026-08-25 19:15', 35, 3.8);
INSERT INTO Ausleihe VALUES (43, 26, 18, 12, 7, '2026-08-25 18:59', '2026-08-25 19:25', 26, 3.08);
INSERT INTO Ausleihe VALUES (44, 9, 7, 12, 7, '2026-08-25 18:16', '2026-08-25 18:40', 24, 2.92);
INSERT INTO Ausleihe VALUES (45, 32, 9, 3, 8, '2026-08-25 17:56', '2026-08-25 18:06', 10, 1.8);
INSERT INTO Ausleihe VALUES (46, 23, 9, 5, 9, '2026-08-25 07:49', '2026-08-25 08:11', 22, 2.76);
INSERT INTO Ausleihe VALUES (47, 7, 19, 12, 2, '2026-08-25 11:13', '2026-08-25 11:18', 5, 1.4);
INSERT INTO Ausleihe VALUES (48, 11, 20, 7, 10, '2026-08-25 18:49', '2026-08-25 19:01', 12, 1.96);
INSERT INTO Ausleihe VALUES (49, 33, 13, 8, 1, '2026-08-26 17:19', '2026-08-26 17:35', 16, 2.28);
INSERT INTO Ausleihe VALUES (50, 40, 8, 7, 1, '2026-08-26 21:28', '2026-08-26 22:01', 33, 5.46);
INSERT INTO Ausleihe VALUES (51, 22, 9, 11, 5, '2026-08-26 20:51', '2026-08-26 21:09', 18, 2.44);
INSERT INTO Ausleihe VALUES (52, 15, 17, 12, 3, '2026-08-26 08:09', '2026-08-26 09:11', 62, 8.94);
INSERT INTO Ausleihe VALUES (53, 11, 6, 7, 12, '2026-08-26 20:14', '2026-08-26 20:26', 12, 1.96);
INSERT INTO Ausleihe VALUES (54, 36, 9, 3, 2, '2026-08-26 09:11', '2026-08-26 09:33', 22, 2.76);
INSERT INTO Ausleihe VALUES (55, 36, 10, 3, 1, '2026-08-26 14:30', '2026-08-26 14:44', 14, 2.12);
INSERT INTO Ausleihe VALUES (56, 32, 6, 9, 12, '2026-08-26 16:37', '2026-08-26 16:59', 22, 2.76);
INSERT INTO Ausleihe VALUES (57, 17, 4, 2, 4, '2026-08-26 07:32', '2026-08-26 07:44', 12, 1.96);
INSERT INTO Ausleihe VALUES (58, 20, 25, 8, 4, '2026-08-26 11:23', '2026-08-26 11:47', 24, 2.92);
INSERT INTO Ausleihe VALUES (59, 9, 6, 9, 1, '2026-08-26 08:14', '2026-08-26 08:26', 12, 1.96);
INSERT INTO Ausleihe VALUES (60, 40, 24, 1, 7, '2026-08-27 19:30', '2026-08-27 19:45', 15, 3.3);
INSERT INTO Ausleihe VALUES (61, 19, 12, 7, 12, '2026-08-27 07:00', '2026-08-27 07:30', 30, 5.1);
INSERT INTO Ausleihe VALUES (62, 20, 9, 7, 3, '2026-08-27 08:50', '2026-08-27 09:00', 10, 1.8);
INSERT INTO Ausleihe VALUES (63, 28, 19, 5, 3, '2026-08-27 10:43', '2026-08-27 10:58', 15, 3.3);
INSERT INTO Ausleihe VALUES (64, 35, 23, 12, 9, '2026-08-27 18:27', '2026-08-27 19:03', 36, 5.82);
INSERT INTO Ausleihe VALUES (65, 34, 20, 12, 7, '2026-08-27 16:43', '2026-08-27 17:53', 70, 9.9);
INSERT INTO Ausleihe VALUES (66, 31, 13, 3, 8, '2026-08-27 10:03', '2026-08-27 10:12', 9, 1.72);
INSERT INTO Ausleihe VALUES (67, 12, 7, 8, 3, '2026-08-27 09:44', '2026-08-27 10:29', 45, 7.4);
INSERT INTO Ausleihe VALUES (68, 36, 18, 3, 10, '2026-08-27 15:51', '2026-08-27 16:05', 14, 2.12);
INSERT INTO Ausleihe VALUES (69, 21, 14, 4, 9, '2026-08-27 11:29', '2026-08-27 11:41', 12, 1.96);
INSERT INTO Ausleihe VALUES (70, 7, 14, 6, 3, '2026-08-27 13:53', '2026-08-27 14:15', 22, 2.76);
INSERT INTO Ausleihe VALUES (71, 12, 24, 3, 6, '2026-08-27 18:23', '2026-08-27 19:47', 84, 12.08);
INSERT INTO Ausleihe VALUES (72, 23, 12, 6, 10, '2026-08-28 07:52', '2026-08-28 08:23', 31, 3.48);
INSERT INTO Ausleihe VALUES (73, 37, 6, 1, 7, '2026-08-28 20:41', '2026-08-28 20:58', 17, 3.54);
INSERT INTO Ausleihe VALUES (74, 1, 13, 5, 11, '2026-08-28 08:44', '2026-08-28 09:08', 24, 2.92);
INSERT INTO Ausleihe VALUES (75, 15, 8, 9, 10, '2026-08-28 19:30', '2026-08-28 20:03', 33, 5.46);
INSERT INTO Ausleihe VALUES (76, 24, 24, 12, 4, '2026-08-28 08:05', '2026-08-28 08:14', 9, 2.58);
INSERT INTO Ausleihe VALUES (77, 8, 25, 6, 7, '2026-08-28 17:33', '2026-08-28 18:35', 62, 8.94);
INSERT INTO Ausleihe VALUES (78, 14, 20, 7, 4, '2026-08-28 08:01', '2026-08-28 08:09', 8, 1.64);
INSERT INTO Ausleihe VALUES (79, 3, 22, 8, 5, '2026-08-29 11:13', '2026-08-29 11:19', 6, 1.48);
INSERT INTO Ausleihe VALUES (80, 37, 13, 11, 1, '2026-08-29 11:26', '2026-08-29 11:56', 30, 5.1);
INSERT INTO Ausleihe VALUES (81, 15, 7, 3, 11, '2026-08-29 13:26', '2026-08-29 13:43', 17, 3.54);
INSERT INTO Ausleihe VALUES (82, 16, 17, 1, 10, '2026-08-29 07:28', '2026-08-29 08:36', 68, 10.16);
INSERT INTO Ausleihe VALUES (83, 31, 9, 10, 5, '2026-08-29 17:14', '2026-08-29 17:19', 5, 1.4);
INSERT INTO Ausleihe VALUES (84, 12, 13, 11, 1, '2026-08-29 18:41', '2026-08-29 19:26', 45, 7.4);
INSERT INTO Ausleihe VALUES (85, 36, 22, 8, 5, '2026-08-29 21:41', '2026-08-29 21:52', 11, 1.88);
INSERT INTO Ausleihe VALUES (86, 35, 7, 7, 5, '2026-08-29 13:16', '2026-08-29 13:52', 36, 5.82);
INSERT INTO Ausleihe VALUES (87, 39, 21, 11, 7, '2026-08-29 15:10', '2026-08-29 15:17', 7, 1.56);
INSERT INTO Ausleihe VALUES (88, 25, 21, 10, 5, '2026-08-29 08:35', '2026-08-29 08:57', 22, 4.64);
INSERT INTO Ausleihe VALUES (89, 16, 5, 1, 3, '2026-08-29 17:07', '2026-08-29 17:33', 26, 5.12);
INSERT INTO Ausleihe VALUES (90, 16, 7, 3, 2, '2026-08-30 17:00', '2026-08-30 18:00', 60, 9.2);
INSERT INTO Ausleihe VALUES (91, 32, 12, 10, 3, '2026-08-30 15:47', '2026-08-30 15:52', 5, 1.4);
INSERT INTO Ausleihe VALUES (92, 15, 5, 1, 11, '2026-08-30 12:19', '2026-08-30 13:21', 62, 8.94);
INSERT INTO Ausleihe VALUES (93, 3, 6, 11, 12, '2026-08-30 18:00', '2026-08-30 18:18', 18, 2.44);
INSERT INTO Ausleihe VALUES (94, 3, 6, 1, 8, '2026-08-30 15:00', '2026-08-30 15:14', 14, 2.12);
INSERT INTO Ausleihe VALUES (95, 24, 8, 12, 5, '2026-08-30 13:54', '2026-08-30 14:15', 21, 4.02);
INSERT INTO Ausleihe VALUES (96, 29, 14, 2, 1, '2026-08-30 14:27', '2026-08-30 14:51', 24, 4.38);
INSERT INTO Ausleihe VALUES (97, 28, 25, 8, 2, '2026-08-31 12:32', '2026-08-31 13:27', 55, 8.1);
INSERT INTO Ausleihe VALUES (98, 32, 25, 2, 10, '2026-08-31 14:24', '2026-08-31 14:36', 12, 1.96);
INSERT INTO Ausleihe VALUES (99, 32, 19, 6, 8, '2026-08-31 07:47', '2026-08-31 08:22', 35, 3.8);
INSERT INTO Ausleihe VALUES (100, 4, 3, 10, 1, '2026-08-31 08:25', '2026-08-31 08:56', 31, 3.48);
INSERT INTO Ausleihe VALUES (101, 40, 22, 3, 9, '2026-08-31 12:59', '2026-08-31 13:39', 40, 6.3);
INSERT INTO Ausleihe VALUES (102, 4, 21, 1, 9, '2026-08-31 17:44', '2026-08-31 17:53', 9, 1.72);
INSERT INTO Ausleihe VALUES (103, 11, 10, 7, 4, '2026-08-31 17:52', '2026-08-31 18:16', 24, 2.92);
INSERT INTO Ausleihe VALUES (104, 27, 6, 8, 1, '2026-08-31 07:56', '2026-08-31 08:24', 28, 3.24);
INSERT INTO Ausleihe VALUES (105, 37, 21, 8, 1, '2026-09-01 13:22', '2026-09-01 14:32', 70, 9.9);
INSERT INTO Ausleihe VALUES (106, 16, 18, 7, 12, '2026-09-01 17:54', '2026-09-01 18:29', 35, 6.2);
INSERT INTO Ausleihe VALUES (107, 9, 8, 5, 7, '2026-09-01 14:23', '2026-09-01 14:54', 31, 3.48);
INSERT INTO Ausleihe VALUES (108, 33, 12, 2, 3, '2026-09-01 10:22', '2026-09-01 10:33', 11, 1.88);
INSERT INTO Ausleihe VALUES (109, 36, 11, 12, 5, '2026-09-01 19:48', '2026-09-01 20:16', 28, 3.24);
INSERT INTO Ausleihe VALUES (110, 24, 7, 3, 2, '2026-09-01 17:43', '2026-09-01 17:54', 11, 2.82);
INSERT INTO Ausleihe VALUES (111, 20, 9, 10, 4, '2026-09-01 10:20', '2026-09-01 10:46', 26, 3.08);
INSERT INTO Ausleihe VALUES (112, 23, 23, 9, 12, '2026-09-01 17:15', '2026-09-01 17:31', 16, 2.28);
INSERT INTO Ausleihe VALUES (113, 18, 15, 3, 12, '2026-09-02 13:38', '2026-09-02 13:47', 9, 1.72);
INSERT INTO Ausleihe VALUES (114, 34, 20, 9, 2, '2026-09-02 18:46', '2026-09-02 19:48', 62, 8.94);
INSERT INTO Ausleihe VALUES (115, 12, 13, 11, 7, '2026-09-02 17:35', '2026-09-02 17:53', 18, 4.16);
INSERT INTO Ausleihe VALUES (116, 25, 9, 3, 8, '2026-09-02 17:37', '2026-09-02 17:59', 22, 4.64);
INSERT INTO Ausleihe VALUES (117, 33, 13, 1, 12, '2026-09-02 10:36', '2026-09-02 10:45', 9, 1.72);
INSERT INTO Ausleihe VALUES (118, 13, 12, 7, 8, '2026-09-02 18:53', '2026-09-02 19:20', 27, 4.74);
INSERT INTO Ausleihe VALUES (119, 11, 20, 5, 6, '2026-09-02 09:20', '2026-09-02 09:51', 31, 3.48);
INSERT INTO Ausleihe VALUES (120, 11, 20, 1, 10, '2026-09-02 16:13', '2026-09-02 16:26', 13, 2.04);
INSERT INTO Ausleihe VALUES (121, 7, 11, 12, 8, '2026-09-03 16:11', '2026-09-03 16:17', 6, 1.48);
INSERT INTO Ausleihe VALUES (122, 17, 14, 12, 3, '2026-09-03 17:48', '2026-09-03 18:04', 16, 2.28);
INSERT INTO Ausleihe VALUES (123, 16, 5, 7, 2, '2026-09-03 18:49', '2026-09-03 19:19', 30, 5.6);
INSERT INTO Ausleihe VALUES (124, 33, 1, 12, 10, '2026-09-03 21:20', '2026-09-03 21:31', 11, 1.88);
INSERT INTO Ausleihe VALUES (125, 17, 9, 2, 5, '2026-09-03 17:32', '2026-09-03 17:43', 11, 1.88);
INSERT INTO Ausleihe VALUES (126, 21, 7, 8, 5, '2026-09-03 17:18', '2026-09-03 17:49', 31, 3.48);
INSERT INTO Ausleihe VALUES (127, 16, 15, 4, 10, '2026-09-03 17:48', '2026-09-03 18:28', 40, 6.8);
INSERT INTO Ausleihe VALUES (128, 2, 13, 10, 2, '2026-09-03 20:52', '2026-09-03 20:59', 7, 1.56);
INSERT INTO Ausleihe VALUES (129, 31, 18, 3, 1, '2026-09-03 14:08', '2026-09-03 14:43', 35, 3.8);
INSERT INTO Ausleihe VALUES (130, 29, 19, 1, 8, '2026-09-03 19:35', '2026-09-03 20:08', 33, 5.46);
INSERT INTO Ausleihe VALUES (131, 37, 13, 8, 10, '2026-09-03 12:35', '2026-09-03 13:11', 36, 5.82);
INSERT INTO Ausleihe VALUES (132, 4, 16, 7, 4, '2026-09-03 13:50', '2026-09-03 14:16', 26, 3.08);
INSERT INTO Ausleihe VALUES (133, 28, 23, 1, 7, '2026-09-04 20:03', '2026-09-04 20:27', 24, 4.38);
INSERT INTO Ausleihe VALUES (134, 29, 22, 12, 1, '2026-09-04 19:27', '2026-09-04 20:07', 40, 6.3);
INSERT INTO Ausleihe VALUES (135, 18, 2, 5, 10, '2026-09-04 14:18', '2026-09-04 14:31', 13, 2.04);
INSERT INTO Ausleihe VALUES (136, 8, 2, 7, 1, '2026-09-04 11:34', '2026-09-04 11:43', 9, 2.58);
INSERT INTO Ausleihe VALUES (137, 35, 22, 2, 11, '2026-09-04 18:21', '2026-09-04 18:38', 17, 3.54);
INSERT INTO Ausleihe VALUES (138, 9, 24, 9, 3, '2026-09-04 15:22', '2026-09-04 15:37', 15, 2.2);
INSERT INTO Ausleihe VALUES (139, 2, 6, 7, 2, '2026-09-04 17:34', '2026-09-04 17:40', 6, 1.48);
INSERT INTO Ausleihe VALUES (140, 21, 14, 12, 11, '2026-09-05 07:22', '2026-09-05 07:36', 14, 2.12);
INSERT INTO Ausleihe VALUES (141, 22, 14, 1, 12, '2026-09-05 21:51', '2026-09-05 22:09', 18, 2.44);
INSERT INTO Ausleihe VALUES (142, 8, 24, 3, 8, '2026-09-05 17:38', '2026-09-05 18:48', 70, 9.9);
INSERT INTO Ausleihe VALUES (143, 32, 11, 2, 11, '2026-09-05 13:19', '2026-09-05 13:33', 14, 2.12);
INSERT INTO Ausleihe VALUES (144, 9, 1, 1, 3, '2026-09-05 11:22', '2026-09-05 11:31', 9, 1.72);
INSERT INTO Ausleihe VALUES (145, 11, 1, 11, 3, '2026-09-05 08:12', '2026-09-05 08:43', 31, 3.48);
INSERT INTO Ausleihe VALUES (146, 7, 4, 10, 1, '2026-09-05 07:10', '2026-09-05 07:20', 10, 1.8);
INSERT INTO Ausleihe VALUES (147, 7, 19, 8, 1, '2026-09-05 08:10', '2026-09-05 08:19', 9, 1.72);
INSERT INTO Ausleihe VALUES (148, 28, 9, 7, 1, '2026-09-05 12:42', '2026-09-05 13:26', 44, 6.78);
INSERT INTO Ausleihe VALUES (149, 10, 25, 12, 3, '2026-09-05 18:55', '2026-09-05 20:19', 84, 12.08);
INSERT INTO Ausleihe VALUES (150, 20, 12, 8, 5, '2026-09-05 09:07', '2026-09-05 09:33', 26, 3.08);
INSERT INTO Ausleihe VALUES (151, 13, 9, 7, 3, '2026-09-05 12:44', '2026-09-05 13:17', 33, 5.46);
INSERT INTO Ausleihe VALUES (152, 15, 14, 9, 5, '2026-09-06 21:44', '2026-09-06 21:57', 13, 3.06);
INSERT INTO Ausleihe VALUES (153, 31, 25, 5, 2, '2026-09-06 07:36', '2026-09-06 07:48', 12, 1.96);
INSERT INTO Ausleihe VALUES (154, 20, 4, 2, 8, '2026-09-06 15:41', '2026-09-06 15:54', 13, 2.04);
INSERT INTO Ausleihe VALUES (155, 30, 22, 7, 1, '2026-09-06 16:15', '2026-09-06 16:28', 13, 2.04);
INSERT INTO Ausleihe VALUES (156, 37, 22, 1, 2, '2026-09-06 07:05', '2026-09-06 07:32', 27, 4.74);
INSERT INTO Ausleihe VALUES (157, 21, 22, 7, 1, '2026-09-06 17:58', '2026-09-06 18:10', 12, 1.96);
INSERT INTO Ausleihe VALUES (158, 5, 1, 5, 4, '2026-09-06 21:00', '2026-09-06 21:15', 15, 3.3);
INSERT INTO Ausleihe VALUES (159, 26, 17, 2, 6, '2026-09-06 18:18', '2026-09-06 18:38', 20, 2.6);
INSERT INTO Ausleihe VALUES (160, 13, 18, 7, 12, '2026-09-06 13:23', '2026-09-06 13:38', 15, 3.3);
INSERT INTO Ausleihe VALUES (161, 29, 12, 8, 7, '2026-09-07 14:59', '2026-09-07 15:47', 48, 7.26);
INSERT INTO Ausleihe VALUES (162, 7, 14, 10, 7, '2026-09-07 19:48', '2026-09-07 20:04', 16, 2.28);
INSERT INTO Ausleihe VALUES (163, 27, 11, 7, 9, '2026-09-07 10:47', '2026-09-07 11:03', 16, 2.28);
INSERT INTO Ausleihe VALUES (164, 30, 10, 10, 1, '2026-09-07 07:34', '2026-09-07 07:56', 22, 2.76);
INSERT INTO Ausleihe VALUES (165, 25, 5, 7, 2, '2026-09-07 18:36', '2026-09-07 20:06', 90, 12.8);
INSERT INTO Ausleihe VALUES (166, 14, 12, 9, 3, '2026-09-07 10:48', '2026-09-07 11:23', 35, 3.8);
INSERT INTO Ausleihe VALUES (167, 2, 14, 12, 1, '2026-09-07 21:07', '2026-09-07 21:19', 12, 1.96);
INSERT INTO Ausleihe VALUES (168, 24, 15, 3, 6, '2026-09-07 16:50', '2026-09-07 17:03', 13, 3.06);
INSERT INTO Ausleihe VALUES (169, 9, 16, 11, 12, '2026-09-07 20:35', '2026-09-07 20:49', 14, 2.12);
INSERT INTO Ausleihe VALUES (170, 20, 25, 8, 3, '2026-09-07 08:48', '2026-09-07 09:23', 35, 3.8);
INSERT INTO Ausleihe VALUES (171, 36, 10, 3, 5, '2026-09-07 08:35', '2026-09-07 08:46', 11, 1.88);
INSERT INTO Ausleihe VALUES (172, 15, 14, 8, 6, '2026-09-07 20:46', '2026-09-07 21:26', 40, 6.3);
INSERT INTO Ausleihe VALUES (173, 11, 12, 3, 2, '2026-09-08 09:27', '2026-09-08 09:33', 6, 1.48);
INSERT INTO Ausleihe VALUES (174, 16, 23, 7, 5, '2026-09-08 16:14', '2026-09-08 17:22', 68, 10.16);
INSERT INTO Ausleihe VALUES (175, 37, 15, 8, 7, '2026-09-08 08:38', '2026-09-08 08:47', 9, 2.58);
INSERT INTO Ausleihe VALUES (176, 16, 10, 5, 3, '2026-09-08 07:46', '2026-09-08 08:12', 26, 5.12);
INSERT INTO Ausleihe VALUES (177, 18, 13, 6, 3, '2026-09-08 13:56', '2026-09-08 14:12', 16, 2.28);
INSERT INTO Ausleihe VALUES (178, 12, 20, 11, 6, '2026-09-08 08:49', '2026-09-08 09:34', 45, 7.4);
INSERT INTO Ausleihe VALUES (179, 23, 7, 11, 4, '2026-09-08 18:29', '2026-09-08 18:39', 10, 1.8);
INSERT INTO Ausleihe VALUES (180, 32, 4, 1, 7, '2026-09-08 19:45', '2026-09-08 20:09', 24, 2.92);
INSERT INTO Ausleihe VALUES (181, 21, 9, 1, 2, '2026-09-08 08:51', '2026-09-08 08:59', 8, 1.64);
INSERT INTO Ausleihe VALUES (182, 14, 19, 12, 7, '2026-09-08 15:16', '2026-09-08 15:26', 10, 1.8);
INSERT INTO Ausleihe VALUES (183, 2, 11, 12, 2, '2026-09-08 11:41', '2026-09-08 12:01', 20, 2.6);
INSERT INTO Ausleihe VALUES (184, 38, 2, 10, 6, '2026-09-08 14:56', '2026-09-08 15:08', 12, 1.96);
INSERT INTO Ausleihe VALUES (185, 18, 7, 1, 12, '2026-09-08 08:07', '2026-09-08 08:16', 9, 1.72);
INSERT INTO Ausleihe VALUES (186, 24, 13, 12, 10, '2026-09-09 18:56', '2026-09-09 19:36', 40, 6.3);
INSERT INTO Ausleihe VALUES (187, 35, 24, 2, 11, '2026-09-09 08:35', '2026-09-09 08:48', 13, 3.06);
INSERT INTO Ausleihe VALUES (188, 24, 22, 7, 9, '2026-09-09 07:59', '2026-09-09 08:43', 44, 6.78);
INSERT INTO Ausleihe VALUES (189, 29, 11, 3, 2, '2026-09-09 09:41', '2026-09-09 10:00', 19, 3.78);
INSERT INTO Ausleihe VALUES (190, 9, 13, 9, 6, '2026-09-09 12:24', '2026-09-09 12:35', 11, 1.88);
INSERT INTO Ausleihe VALUES (191, 8, 19, 6, 10, '2026-09-09 14:55', '2026-09-09 16:05', 70, 9.9);
INSERT INTO Ausleihe VALUES (192, 20, 25, 7, 8, '2026-09-09 10:08', '2026-09-09 10:16', 8, 1.64);
INSERT INTO Ausleihe VALUES (193, 38, 15, 3, 1, '2026-09-09 17:32', '2026-09-09 17:54', 22, 2.76);
INSERT INTO Ausleihe VALUES (194, 16, 6, 7, 8, '2026-09-09 14:06', '2026-09-09 15:14', 68, 10.16);
INSERT INTO Ausleihe VALUES (195, 37, 19, 4, 2, '2026-09-09 16:14', '2026-09-09 16:29', 15, 3.3);
INSERT INTO Ausleihe VALUES (196, 4, 14, 10, 8, '2026-09-09 12:16', '2026-09-09 12:40', 24, 2.92);
INSERT INTO Ausleihe VALUES (197, 28, 13, 3, 7, '2026-09-10 14:52', '2026-09-10 15:13', 21, 4.02);
INSERT INTO Ausleihe VALUES (198, 24, 3, 5, 2, '2026-09-10 16:22', '2026-09-10 16:37', 15, 3.3);
INSERT INTO Ausleihe VALUES (199, 25, 19, 3, 1, '2026-09-10 16:14', '2026-09-10 17:29', 75, 11.0);
INSERT INTO Ausleihe VALUES (200, 20, 17, 7, 1, '2026-09-10 18:30', '2026-09-10 18:58', 28, 3.24);
INSERT INTO Ausleihe VALUES (201, 26, 7, 8, 12, '2026-09-10 07:57', '2026-09-10 08:02', 5, 1.4);
INSERT INTO Ausleihe VALUES (202, 29, 17, 7, 3, '2026-09-10 18:39', '2026-09-10 18:58', 19, 3.78);
INSERT INTO Ausleihe VALUES (203, 13, 17, 8, 7, '2026-09-10 17:11', '2026-09-10 18:21', 70, 9.9);
INSERT INTO Ausleihe VALUES (204, 34, 2, 11, 6, '2026-09-10 09:57', '2026-09-10 10:27', 30, 5.1);
INSERT INTO Ausleihe VALUES (205, 38, 9, 8, 3, '2026-09-10 08:05', '2026-09-10 08:16', 11, 1.88);
INSERT INTO Ausleihe VALUES (206, 21, 16, 8, 1, '2026-09-10 07:44', '2026-09-10 08:10', 26, 3.08);
INSERT INTO Ausleihe VALUES (207, 14, 2, 7, 5, '2026-09-10 19:37', '2026-09-10 19:47', 10, 1.8);
INSERT INTO Ausleihe VALUES (208, 30, 1, 7, 2, '2026-09-11 12:37', '2026-09-11 12:46', 9, 1.72);
INSERT INTO Ausleihe VALUES (209, 22, 9, 5, 7, '2026-09-11 11:01', '2026-09-11 11:07', 6, 1.48);
INSERT INTO Ausleihe VALUES (210, 40, 14, 12, 10, '2026-09-11 18:29', '2026-09-11 19:24', 55, 8.1);
INSERT INTO Ausleihe VALUES (211, 20, 10, 1, 8, '2026-09-11 20:40', '2026-09-11 20:56', 16, 2.28);
INSERT INTO Ausleihe VALUES (212, 20, 7, 1, 5, '2026-09-11 18:58', '2026-09-11 19:26', 28, 3.24);
INSERT INTO Ausleihe VALUES (213, 4, 17, 12, 7, '2026-09-11 15:19', '2026-09-11 15:43', 24, 2.92);
INSERT INTO Ausleihe VALUES (214, 1, 5, 5, 3, '2026-09-11 09:05', '2026-09-11 09:40', 35, 3.8);
INSERT INTO Ausleihe VALUES (215, 36, 3, 1, 3, '2026-09-11 11:05', '2026-09-11 11:21', 16, 2.28);
INSERT INTO Ausleihe VALUES (216, 36, 19, 11, 5, '2026-09-11 15:50', '2026-09-11 15:57', 7, 1.56);
INSERT INTO Ausleihe VALUES (217, 35, 4, 5, 7, '2026-09-11 08:46', '2026-09-11 09:07', 21, 4.02);
INSERT INTO Ausleihe VALUES (218, 28, 19, 7, 3, '2026-09-12 21:51', '2026-09-12 22:00', 9, 2.58);
INSERT INTO Ausleihe VALUES (219, 17, 9, 7, 6, '2026-09-12 10:25', '2026-09-12 10:56', 31, 3.48);
INSERT INTO Ausleihe VALUES (220, 13, 11, 3, 1, '2026-09-12 09:10', '2026-09-12 09:34', 24, 4.38);
INSERT INTO Ausleihe VALUES (221, 15, 18, 12, 8, '2026-09-12 07:48', '2026-09-12 08:01', 13, 3.06);
INSERT INTO Ausleihe VALUES (222, 5, 23, 12, 11, '2026-09-12 21:10', '2026-09-12 21:27', 17, 3.54);
INSERT INTO Ausleihe VALUES (223, 31, 9, 10, 7, '2026-09-12 07:11', '2026-09-12 07:33', 22, 2.76);
INSERT INTO Ausleihe VALUES (224, 6, 13, 8, 3, '2026-09-12 16:23', '2026-09-12 16:43', 20, 2.6);
INSERT INTO Ausleihe VALUES (225, 16, 22, 10, 1, '2026-09-12 13:00', '2026-09-12 13:22', 22, 4.64);
INSERT INTO Ausleihe VALUES (226, 15, 22, 8, 11, '2026-09-13 14:57', '2026-09-13 15:59', 62, 8.94);
INSERT INTO Ausleihe VALUES (227, 20, 17, 3, 12, '2026-09-13 17:00', '2026-09-13 17:10', 10, 1.8);
INSERT INTO Ausleihe VALUES (228, 26, 17, 7, 2, '2026-09-13 16:26', '2026-09-13 16:33', 7, 1.56);
INSERT INTO Ausleihe VALUES (229, 40, 23, 8, 12, '2026-09-13 16:17', '2026-09-13 16:32', 15, 3.3);
INSERT INTO Ausleihe VALUES (230, 7, 10, 3, 1, '2026-09-13 11:29', '2026-09-13 11:47', 18, 2.44);
INSERT INTO Ausleihe VALUES (231, 33, 22, 7, 6, '2026-09-13 19:50', '2026-09-13 19:58', 8, 1.64);
INSERT INTO Ausleihe VALUES (232, 8, 7, 5, 10, '2026-09-13 13:15', '2026-09-13 13:34', 19, 3.78);
INSERT INTO Ausleihe VALUES (233, 1, 25, 7, 8, '2026-09-13 15:09', '2026-09-13 15:18', 9, 1.72);
INSERT INTO Ausleihe VALUES (234, 22, 18, 11, 3, '2026-09-13 14:12', '2026-09-13 14:20', 8, 1.64);
INSERT INTO Ausleihe VALUES (235, 31, 13, 11, 4, '2026-09-13 18:46', '2026-09-13 19:14', 28, 3.24);
INSERT INTO Ausleihe VALUES (236, 7, 2, 8, 3, '2026-09-13 19:43', '2026-09-13 19:51', 8, 1.64);
INSERT INTO Ausleihe VALUES (237, 17, 18, 5, 8, '2026-09-13 10:14', '2026-09-13 10:25', 11, 1.88);
INSERT INTO Ausleihe VALUES (238, 6, 13, 1, 7, '2026-09-13 18:56', '2026-09-13 19:04', 8, 1.64);
INSERT INTO Ausleihe VALUES (239, 8, 25, 12, 3, '2026-09-14 19:13', '2026-09-14 19:24', 11, 2.82);
INSERT INTO Ausleihe VALUES (240, 37, 14, 1, 12, '2026-09-14 19:08', '2026-09-14 19:44', 36, 5.82);
INSERT INTO Ausleihe VALUES (241, 3, 18, 3, 1, '2026-09-14 16:59', '2026-09-14 17:09', 10, 1.8);
INSERT INTO Ausleihe VALUES (242, 31, 17, 7, 5, '2026-09-14 07:16', '2026-09-14 07:30', 14, 2.12);
INSERT INTO Ausleihe VALUES (243, 23, 7, 1, 12, '2026-09-14 17:51', '2026-09-14 17:56', 5, 1.4);
INSERT INTO Ausleihe VALUES (244, 2, 15, 12, 10, '2026-09-14 19:31', '2026-09-14 19:42', 11, 1.88);
INSERT INTO Ausleihe VALUES (245, 7, 17, 1, 12, '2026-09-14 16:52', '2026-09-14 17:03', 11, 1.88);
INSERT INTO Ausleihe VALUES (246, 1, 25, 7, 4, '2026-09-14 16:09', '2026-09-14 16:16', 7, 1.56);
INSERT INTO Ausleihe VALUES (247, 4, 18, 3, 7, '2026-09-15 17:59', '2026-09-15 18:09', 10, 1.8);
INSERT INTO Ausleihe VALUES (248, 25, 14, 11, 9, '2026-09-15 11:41', '2026-09-15 12:49', 68, 10.16);
INSERT INTO Ausleihe VALUES (249, 40, 2, 3, 8, '2026-09-15 19:55', '2026-09-15 20:39', 44, 6.78);
INSERT INTO Ausleihe VALUES (250, 14, 11, 12, 2, '2026-09-15 08:57', '2026-09-15 09:05', 8, 1.64);
INSERT INTO Ausleihe VALUES (251, 1, 1, 1, 5, '2026-09-15 08:52', '2026-09-15 09:14', 22, 2.76);
INSERT INTO Ausleihe VALUES (252, 33, 1, 5, 12, '2026-09-15 09:23', '2026-09-15 09:49', 26, 3.08);
INSERT INTO Ausleihe VALUES (253, 23, 5, 12, 2, '2026-09-15 21:35', '2026-09-15 21:50', 15, 2.2);
INSERT INTO Ausleihe VALUES (254, 3, 7, 12, 2, '2026-09-15 12:22', '2026-09-15 12:33', 11, 1.88);
INSERT INTO Ausleihe VALUES (255, 7, 15, 5, 4, '2026-09-16 18:14', '2026-09-16 18:49', 35, 3.8);
INSERT INTO Ausleihe VALUES (256, 25, 6, 8, 1, '2026-09-16 19:12', '2026-09-16 19:38', 26, 5.12);
INSERT INTO Ausleihe VALUES (257, 40, 8, 1, 3, '2026-09-16 14:49', '2026-09-16 15:00', 11, 2.82);
INSERT INTO Ausleihe VALUES (258, 6, 20, 9, 1, '2026-09-16 11:06', '2026-09-16 11:37', 31, 3.48);
INSERT INTO Ausleihe VALUES (259, 7, 2, 3, 7, '2026-09-16 12:45', '2026-09-16 12:51', 6, 1.48);
INSERT INTO Ausleihe VALUES (260, 16, 8, 5, 10, '2026-09-16 09:52', '2026-09-16 10:44', 52, 8.24);
INSERT INTO Ausleihe VALUES (261, 4, 13, 5, 3, '2026-09-16 10:36', '2026-09-16 10:50', 14, 2.12);
INSERT INTO Ausleihe VALUES (262, 3, 15, 2, 3, '2026-09-17 18:32', '2026-09-17 19:03', 31, 3.48);
INSERT INTO Ausleihe VALUES (263, 32, 25, 4, 3, '2026-09-17 20:46', '2026-09-17 21:17', 31, 3.48);
INSERT INTO Ausleihe VALUES (264, 11, 25, 12, 7, '2026-09-17 17:47', '2026-09-17 18:02', 15, 2.2);
INSERT INTO Ausleihe VALUES (265, 13, 11, 4, 5, '2026-09-17 12:03', '2026-09-17 12:20', 17, 3.54);
INSERT INTO Ausleihe VALUES (266, 16, 15, 9, 7, '2026-09-17 18:03', '2026-09-17 18:29', 26, 5.12);
INSERT INTO Ausleihe VALUES (267, 18, 23, 8, 4, '2026-09-17 18:03', '2026-09-17 18:13', 10, 1.8);
INSERT INTO Ausleihe VALUES (268, 38, 24, 12, 1, '2026-09-17 20:09', '2026-09-17 20:23', 14, 2.12);
INSERT INTO Ausleihe VALUES (269, 33, 7, 2, 1, '2026-09-17 12:03', '2026-09-17 12:14', 11, 1.88);
INSERT INTO Ausleihe VALUES (270, 27, 2, 1, 8, '2026-09-17 10:59', '2026-09-17 11:30', 31, 3.48);
INSERT INTO Ausleihe VALUES (271, 31, 3, 9, 2, '2026-09-17 08:37', '2026-09-17 08:51', 14, 2.12);
INSERT INTO Ausleihe VALUES (272, 35, 9, 7, 12, '2026-09-17 19:02', '2026-09-17 19:15', 13, 3.06);
INSERT INTO Ausleihe VALUES (273, 37, 22, 1, 9, '2026-09-17 17:37', '2026-09-17 18:01', 24, 4.38);
INSERT INTO Ausleihe VALUES (274, 40, 10, 7, 8, '2026-09-18 17:11', '2026-09-18 17:41', 30, 5.1);
INSERT INTO Ausleihe VALUES (275, 8, 25, 5, 1, '2026-09-18 15:46', '2026-09-18 16:16', 30, 5.1);
INSERT INTO Ausleihe VALUES (276, 17, 3, 1, 7, '2026-09-18 18:58', '2026-09-18 19:13', 15, 2.2);
INSERT INTO Ausleihe VALUES (277, 13, 8, 7, 8, '2026-09-18 12:57', '2026-09-18 13:33', 36, 5.82);
INSERT INTO Ausleihe VALUES (278, 3, 24, 6, 7, '2026-09-18 18:57', '2026-09-18 19:12', 15, 2.2);
INSERT INTO Ausleihe VALUES (279, 23, 11, 1, 7, '2026-09-18 10:46', '2026-09-18 11:04', 18, 2.44);
INSERT INTO Ausleihe VALUES (280, 29, 5, 11, 2, '2026-09-18 13:06', '2026-09-18 13:33', 27, 4.74);
INSERT INTO Ausleihe VALUES (281, 19, 4, 1, 4, '2026-09-19 07:04', '2026-09-19 07:25', 21, 4.02);
INSERT INTO Ausleihe VALUES (282, 35, 23, 1, 12, '2026-09-19 19:45', '2026-09-19 20:33', 48, 7.26);
INSERT INTO Ausleihe VALUES (283, 8, 10, 7, 10, '2026-09-19 14:18', '2026-09-19 14:27', 9, 2.58);
INSERT INTO Ausleihe VALUES (284, 9, 21, 8, 12, '2026-09-19 13:53', '2026-09-19 14:13', 20, 2.6);
INSERT INTO Ausleihe VALUES (285, 37, 8, 8, 7, '2026-09-19 17:56', '2026-09-19 18:29', 33, 5.46);
INSERT INTO Ausleihe VALUES (286, 9, 15, 7, 8, '2026-09-19 16:51', '2026-09-19 17:17', 26, 3.08);
INSERT INTO Ausleihe VALUES (287, 26, 12, 12, 4, '2026-09-19 20:02', '2026-09-19 20:33', 31, 3.48);
INSERT INTO Ausleihe VALUES (288, 14, 13, 3, 1, '2026-09-19 20:52', '2026-09-19 21:06', 14, 2.12);
INSERT INTO Ausleihe VALUES (289, 6, 7, 8, 5, '2026-09-19 10:06', '2026-09-19 10:12', 6, 1.48);
INSERT INTO Ausleihe VALUES (290, 10, 25, 7, 1, '2026-09-19 08:23', '2026-09-19 08:41', 18, 4.16);
INSERT INTO Ausleihe VALUES (291, 37, 2, 7, 3, '2026-09-19 18:58', '2026-09-19 19:38', 40, 6.3);
INSERT INTO Ausleihe VALUES (292, 37, 9, 11, 8, '2026-09-20 18:51', '2026-09-20 19:02', 11, 2.82);
INSERT INTO Ausleihe VALUES (293, 6, 21, 7, 9, '2026-09-20 08:12', '2026-09-20 08:24', 12, 1.96);
INSERT INTO Ausleihe VALUES (294, 34, 12, 7, 3, '2026-09-20 11:35', '2026-09-20 11:52', 17, 3.54);
INSERT INTO Ausleihe VALUES (295, 23, 8, 6, 8, '2026-09-20 15:41', '2026-09-20 15:48', 7, 1.56);
INSERT INTO Ausleihe VALUES (296, 22, 22, 7, 10, '2026-09-20 17:00', '2026-09-20 17:15', 15, 2.2);
INSERT INTO Ausleihe VALUES (297, 34, 14, 11, 7, '2026-09-20 15:21', '2026-09-20 15:36', 15, 3.3);
INSERT INTO Ausleihe VALUES (298, 33, 2, 8, 2, '2026-09-20 16:20', '2026-09-20 16:33', 13, 2.04);
INSERT INTO Ausleihe VALUES (299, 23, 11, 7, 3, '2026-09-20 14:08', '2026-09-20 14:43', 35, 3.8);
INSERT INTO Ausleihe VALUES (300, 25, 17, 8, 10, '2026-09-20 16:46', '2026-09-20 17:26', 40, 6.8);
INSERT INTO Ausleihe VALUES (301, 7, 9, 12, 6, '2026-09-20 16:01', '2026-09-20 16:16', 15, 2.2);
INSERT INTO Ausleihe VALUES (302, 32, 15, 10, 4, '2026-09-20 08:13', '2026-09-20 08:28', 15, 2.2);
INSERT INTO Ausleihe VALUES (303, 41, 77, 13, NULL, '2026-09-08 01:14', NULL, NULL, NULL);
INSERT INTO Ausleihe VALUES (304, 42, 77, 13, NULL, '2026-09-09 01:32', NULL, NULL, NULL);
INSERT INTO Ausleihe VALUES (305, 43, 77, 13, NULL, '2026-09-10 01:05', NULL, NULL, NULL);
INSERT INTO Ausleihe VALUES (306, 44, 77, 13, NULL, '2026-09-11 01:48', NULL, NULL, NULL);
INSERT INTO Ausleihe VALUES (307, 45, 77, 13, NULL, '2026-09-12 01:21', NULL, NULL, NULL);
INSERT INTO Ausleihe VALUES (308, 31, 64, 5, 3, '2026-08-26 08:12', '2026-08-26 08:30', 18, 2.44);
INSERT INTO Ausleihe VALUES (309, 3, 64, 6, 13, '2026-09-03 17:40', '2026-09-03 17:52', 12, 1.96);
INSERT INTO Ausleihe VALUES (310, 27, 64, 13, 1, '2026-09-10 07:55', '2026-09-10 08:16', 21, 2.68);
INSERT INTO Ausleihe VALUES (311, 10, 19, 10, 1, '2026-08-21 06:01', '2026-08-21 06:16', 15, 3.8);
INSERT INTO Ausleihe VALUES (312, 17, 29, 9, 7, '2026-08-21 08:39', '2026-08-21 09:07', 28, 3.24);
INSERT INTO Ausleihe VALUES (313, 28, 58, 8, 6, '2026-08-21 16:13', '2026-08-21 16:25', 12, 2.94);
INSERT INTO Ausleihe VALUES (314, 17, 73, 7, 8, '2026-08-21 18:27', '2026-08-21 18:39', 12, 1.96);
INSERT INTO Ausleihe VALUES (315, 16, 42, 2, 7, '2026-08-21 19:08', '2026-08-21 19:21', 13, 3.56);
INSERT INTO Ausleihe VALUES (316, 36, 52, 4, 11, '2026-08-22 08:48', '2026-08-22 09:15', 27, 3.16);
INSERT INTO Ausleihe VALUES (317, 4, 43, 5, 8, '2026-08-22 10:58', '2026-08-22 11:07', 9, 1.72);
INSERT INTO Ausleihe VALUES (318, 36, 73, 2, 6, '2026-08-22 19:08', '2026-08-22 19:25', 17, 2.36);
INSERT INTO Ausleihe VALUES (319, 35, 23, 9, 12, '2026-08-22 19:09', '2026-08-22 19:34', 25, 4.5);
INSERT INTO Ausleihe VALUES (320, 30, 70, 5, 10, '2026-08-23 13:04', '2026-08-23 13:21', 17, 2.36);
INSERT INTO Ausleihe VALUES (321, 26, 68, 12, 7, '2026-08-23 16:59', '2026-08-23 17:51', 52, 5.16);
INSERT INTO Ausleihe VALUES (322, 17, 29, 2, 3, '2026-08-23 17:41', '2026-08-23 18:02', 21, 2.68);
INSERT INTO Ausleihe VALUES (323, 14, 27, 13, 9, '2026-08-23 19:55', '2026-08-23 20:25', 30, 3.4);
INSERT INTO Ausleihe VALUES (324, 1, 12, 1, 9, '2026-08-23 20:32', '2026-08-23 20:47', 15, 2.2);
INSERT INTO Ausleihe VALUES (325, 23, 48, 2, 7, '2026-08-24 08:59', '2026-08-24 09:35', 36, 3.88);
INSERT INTO Ausleihe VALUES (326, 3, 30, 11, 12, '2026-08-24 09:18', '2026-08-24 09:50', 32, 3.56);
INSERT INTO Ausleihe VALUES (327, 36, 62, 3, 4, '2026-08-24 18:54', '2026-08-24 19:04', 10, 1.8);
INSERT INTO Ausleihe VALUES (328, 23, 53, 11, 12, '2026-08-25 12:16', '2026-08-25 12:30', 14, 2.12);
INSERT INTO Ausleihe VALUES (329, 12, 17, 12, 1, '2026-08-25 15:14', '2026-08-25 15:24', 10, 3.2);
INSERT INTO Ausleihe VALUES (330, 7, 48, 13, 5, '2026-08-25 16:10', '2026-08-25 16:20', 10, 1.8);
INSERT INTO Ausleihe VALUES (331, 4, 25, 10, 1, '2026-08-25 17:30', '2026-08-25 18:38', 68, 6.44);
INSERT INTO Ausleihe VALUES (332, 29, 67, 4, 8, '2026-08-25 17:32', '2026-08-25 17:44', 12, 2.94);
INSERT INTO Ausleihe VALUES (333, 33, 20, 1, 12, '2026-08-26 06:49', '2026-08-26 07:02', 13, 2.04);
INSERT INTO Ausleihe VALUES (334, 34, 29, 12, 1, '2026-08-26 07:36', '2026-08-26 08:18', 42, 6.54);
INSERT INTO Ausleihe VALUES (335, 1, 22, 6, 4, '2026-08-26 08:02', '2026-08-26 08:23', 21, 2.68);
INSERT INTO Ausleihe VALUES (336, 20, 62, 7, 12, '2026-08-26 08:53', '2026-08-26 09:31', 38, 4.04);
INSERT INTO Ausleihe VALUES (337, 9, 4, 6, 1, '2026-08-26 12:14', '2026-08-26 12:33', 19, 2.52);
INSERT INTO Ausleihe VALUES (338, 26, 25, 7, 12, '2026-08-26 17:28', '2026-08-26 17:43', 15, 2.2);
INSERT INTO Ausleihe VALUES (339, 9, 11, 7, 7, '2026-08-26 18:35', '2026-08-26 18:59', 24, 2.92);
INSERT INTO Ausleihe VALUES (340, 2, 45, 5, 3, '2026-08-27 06:27', '2026-08-27 06:49', 22, 2.76);
INSERT INTO Ausleihe VALUES (341, 27, 65, 12, 3, '2026-08-27 09:04', '2026-08-27 09:20', 16, 2.28);
INSERT INTO Ausleihe VALUES (342, 18, 50, 1, 1, '2026-08-27 16:38', '2026-08-27 16:52', 14, 2.12);
INSERT INTO Ausleihe VALUES (343, 31, 54, 9, 3, '2026-08-27 17:04', '2026-08-27 17:38', 34, 3.72);
INSERT INTO Ausleihe VALUES (344, 13, 72, 10, 11, '2026-08-27 19:42', '2026-08-27 19:47', 5, 2.1);
INSERT INTO Ausleihe VALUES (345, 32, 69, 7, 11, '2026-08-28 06:44', '2026-08-28 07:14', 30, 3.4);
INSERT INTO Ausleihe VALUES (346, 6, 71, 4, 4, '2026-08-28 12:23', '2026-08-28 12:31', 8, 1.64);
INSERT INTO Ausleihe VALUES (347, 31, 3, 9, 13, '2026-08-28 15:11', '2026-08-28 15:26', 15, 2.2);
INSERT INTO Ausleihe VALUES (348, 29, 45, 13, 2, '2026-08-28 18:54', '2026-08-28 19:28', 34, 5.58);
INSERT INTO Ausleihe VALUES (349, 2, 76, 8, 10, '2026-08-28 19:19', '2026-08-28 19:36', 17, 2.36);
INSERT INTO Ausleihe VALUES (350, 7, 29, 8, 3, '2026-08-28 19:41', '2026-08-28 19:56', 15, 2.2);
INSERT INTO Ausleihe VALUES (351, 40, 40, 5, 7, '2026-08-29 14:04', '2026-08-29 14:26', 22, 4.14);
INSERT INTO Ausleihe VALUES (352, 1, 76, 6, 5, '2026-08-29 18:27', '2026-08-29 18:54', 27, 3.16);
INSERT INTO Ausleihe VALUES (353, 28, 55, 3, 5, '2026-08-29 21:13', '2026-08-29 21:22', 9, 2.58);
INSERT INTO Ausleihe VALUES (354, 25, 70, 5, 7, '2026-08-29 22:00', '2026-08-29 22:13', 13, 3.56);
INSERT INTO Ausleihe VALUES (355, 18, 62, 13, 7, '2026-08-30 07:04', '2026-08-30 08:25', 81, 7.48);
INSERT INTO Ausleihe VALUES (356, 39, 61, 1, 7, '2026-08-30 09:11', '2026-08-30 09:37', 26, 3.08);
INSERT INTO Ausleihe VALUES (357, 36, 75, 7, 4, '2026-08-30 10:06', '2026-08-30 10:34', 28, 3.24);
INSERT INTO Ausleihe VALUES (358, 33, 65, 4, 2, '2026-08-30 21:24', '2026-08-30 21:39', 15, 2.2);
INSERT INTO Ausleihe VALUES (359, 20, 44, 11, 6, '2026-08-30 21:49', '2026-08-30 22:00', 11, 1.88);
INSERT INTO Ausleihe VALUES (360, 12, 5, 5, 13, '2026-08-31 08:09', '2026-08-31 08:30', 21, 4.52);
INSERT INTO Ausleihe VALUES (361, 15, 11, 9, 7, '2026-08-31 11:03', '2026-08-31 11:23', 20, 3.9);
INSERT INTO Ausleihe VALUES (362, 15, 66, 5, 10, '2026-08-31 16:08', '2026-08-31 16:45', 37, 5.94);
INSERT INTO Ausleihe VALUES (363, 30, 47, 1, 12, '2026-09-01 07:16', '2026-09-01 07:23', 7, 1.56);
INSERT INTO Ausleihe VALUES (364, 33, 48, 7, 1, '2026-09-01 07:51', '2026-09-01 08:03', 12, 1.96);
INSERT INTO Ausleihe VALUES (365, 16, 53, 3, 7, '2026-09-01 13:25', '2026-09-01 13:45', 20, 4.4);
INSERT INTO Ausleihe VALUES (366, 3, 8, 5, 7, '2026-09-01 15:55', '2026-09-01 16:07', 12, 1.96);
INSERT INTO Ausleihe VALUES (367, 6, 15, 8, 3, '2026-09-02 08:34', '2026-09-02 08:46', 12, 1.96);
INSERT INTO Ausleihe VALUES (368, 22, 67, 10, 11, '2026-09-02 10:22', '2026-09-02 10:55', 33, 3.64);
INSERT INTO Ausleihe VALUES (369, 34, 30, 13, 7, '2026-09-02 12:56', '2026-09-02 13:02', 6, 2.22);
INSERT INTO Ausleihe VALUES (370, 25, 10, 11, 11, '2026-09-02 16:58', '2026-09-02 17:16', 18, 4.16);
INSERT INTO Ausleihe VALUES (371, 12, 62, 6, 3, '2026-09-02 18:34', '2026-09-02 18:57', 23, 4.76);
INSERT INTO Ausleihe VALUES (372, 40, 46, 12, 8, '2026-09-02 22:25', '2026-09-02 22:40', 15, 3.3);
INSERT INTO Ausleihe VALUES (373, 34, 41, 12, 9, '2026-09-03 11:41', '2026-09-03 12:07', 26, 4.62);
INSERT INTO Ausleihe VALUES (374, 37, 26, 3, 11, '2026-09-03 13:44', '2026-09-03 13:55', 11, 2.82);
INSERT INTO Ausleihe VALUES (375, 38, 53, 5, 5, '2026-09-03 16:53', '2026-09-03 17:16', 23, 2.84);
INSERT INTO Ausleihe VALUES (376, 21, 66, 10, 8, '2026-09-03 22:46', '2026-09-03 23:22', 36, 3.88);
INSERT INTO Ausleihe VALUES (377, 36, 72, 6, 12, '2026-09-04 06:38', '2026-09-04 06:54', 16, 2.28);
INSERT INTO Ausleihe VALUES (378, 5, 35, 12, 8, '2026-09-04 08:04', '2026-09-04 08:58', 54, 7.98);
INSERT INTO Ausleihe VALUES (379, 34, 58, 3, 12, '2026-09-04 09:21', '2026-09-04 09:34', 13, 3.06);
INSERT INTO Ausleihe VALUES (380, 3, 51, 11, 2, '2026-09-04 11:48', '2026-09-04 11:53', 5, 1.4);
INSERT INTO Ausleihe VALUES (381, 6, 50, 4, 3, '2026-09-04 14:30', '2026-09-04 14:52', 22, 2.76);
INSERT INTO Ausleihe VALUES (382, 26, 49, 7, 7, '2026-09-05 17:12', '2026-09-05 17:32', 20, 2.6);
INSERT INTO Ausleihe VALUES (383, 28, 66, 1, 10, '2026-09-05 18:39', '2026-09-05 19:16', 37, 5.94);
INSERT INTO Ausleihe VALUES (384, 3, 78, 3, 9, '2026-09-05 18:55', '2026-09-05 19:11', 16, 2.28);
INSERT INTO Ausleihe VALUES (385, 9, 73, 6, 3, '2026-09-05 21:07', '2026-09-05 21:44', 37, 3.96);
INSERT INTO Ausleihe VALUES (386, 20, 42, 11, 5, '2026-09-06 06:51', '2026-09-06 07:38', 47, 4.76);
INSERT INTO Ausleihe VALUES (387, 27, 35, 9, 3, '2026-09-06 11:28', '2026-09-06 11:52', 24, 2.92);
INSERT INTO Ausleihe VALUES (388, 35, 73, 12, 10, '2026-09-06 15:41', '2026-09-06 15:54', 13, 3.06);
INSERT INTO Ausleihe VALUES (389, 31, 39, 1, 4, '2026-09-06 17:04', '2026-09-06 17:20', 16, 2.28);
INSERT INTO Ausleihe VALUES (390, 14, 62, 1, 8, '2026-09-06 17:21', '2026-09-06 17:49', 28, 3.24);
INSERT INTO Ausleihe VALUES (391, 28, 63, 5, 6, '2026-09-06 19:45', '2026-09-06 20:07', 22, 4.14);
INSERT INTO Ausleihe VALUES (392, 6, 39, 4, 1, '2026-09-06 21:34', '2026-09-06 21:43', 9, 1.72);
INSERT INTO Ausleihe VALUES (393, 26, 44, 2, 6, '2026-09-07 07:24', '2026-09-07 07:50', 26, 3.08);
INSERT INTO Ausleihe VALUES (394, 6, 37, 6, 7, '2026-09-07 13:36', '2026-09-07 14:06', 30, 3.4);
INSERT INTO Ausleihe VALUES (395, 31, 67, 2, 12, '2026-09-07 14:25', '2026-09-07 14:36', 11, 1.88);
INSERT INTO Ausleihe VALUES (396, 39, 22, 5, 9, '2026-09-07 20:32', '2026-09-07 20:41', 9, 1.72);
INSERT INTO Ausleihe VALUES (397, 3, 56, 7, 6, '2026-09-08 06:57', '2026-09-08 07:07', 10, 1.8);
INSERT INTO Ausleihe VALUES (398, 33, 58, 2, 13, '2026-09-08 08:31', '2026-09-08 08:42', 11, 1.88);
INSERT INTO Ausleihe VALUES (399, 14, 54, 4, 7, '2026-09-08 09:29', '2026-09-08 10:14', 45, 4.6);
INSERT INTO Ausleihe VALUES (400, 35, 67, 4, 1, '2026-09-08 14:56', '2026-09-08 15:07', 11, 2.82);
INSERT INTO Ausleihe VALUES (401, 14, 76, 10, 12, '2026-09-09 08:55', '2026-09-09 09:24', 29, 3.32);
INSERT INTO Ausleihe VALUES (402, 17, 26, 10, 7, '2026-09-09 09:13', '2026-09-09 09:42', 29, 3.32);
INSERT INTO Ausleihe VALUES (403, 12, 59, 13, 7, '2026-09-09 10:02', '2026-09-09 10:35', 33, 5.96);
INSERT INTO Ausleihe VALUES (404, 30, 59, 12, 3, '2026-09-09 16:42', '2026-09-09 17:17', 35, 3.8);
INSERT INTO Ausleihe VALUES (405, 10, 20, 8, 7, '2026-09-09 17:00', '2026-09-09 17:35', 35, 6.2);
INSERT INTO Ausleihe VALUES (406, 33, 47, 2, 6, '2026-09-09 18:00', '2026-09-09 18:21', 21, 2.68);
INSERT INTO Ausleihe VALUES (407, 35, 60, 6, 9, '2026-09-10 07:07', '2026-09-10 07:18', 11, 2.82);
INSERT INTO Ausleihe VALUES (408, 34, 50, 5, 13, '2026-09-10 17:42', '2026-09-10 17:54', 12, 2.94);
INSERT INTO Ausleihe VALUES (409, 2, 50, 10, 7, '2026-09-10 18:13', '2026-09-10 18:36', 23, 2.84);
INSERT INTO Ausleihe VALUES (410, 7, 52, 4, 5, '2026-09-10 19:28', '2026-09-10 19:35', 7, 1.56);
INSERT INTO Ausleihe VALUES (411, 14, 34, 7, 2, '2026-09-10 19:57', '2026-09-10 20:21', 24, 2.92);
INSERT INTO Ausleihe VALUES (412, 32, 22, 4, 6, '2026-09-11 09:58', '2026-09-11 10:05', 7, 1.56);
INSERT INTO Ausleihe VALUES (413, 40, 38, 8, 7, '2026-09-11 14:24', '2026-09-11 14:48', 24, 4.38);
INSERT INTO Ausleihe VALUES (414, 34, 48, 1, 13, '2026-09-11 14:27', '2026-09-11 14:34', 7, 2.34);
INSERT INTO Ausleihe VALUES (415, 14, 39, 1, 12, '2026-09-11 14:35', '2026-09-11 15:00', 25, 3.0);
INSERT INTO Ausleihe VALUES (416, 25, 32, 13, 11, '2026-09-11 20:04', '2026-09-11 20:20', 16, 3.92);
INSERT INTO Ausleihe VALUES (417, 16, 36, 13, 6, '2026-09-12 11:28', '2026-09-12 11:53', 25, 5.0);
INSERT INTO Ausleihe VALUES (418, 36, 1, 9, 10, '2026-09-12 13:05', '2026-09-12 13:53', 48, 4.84);
INSERT INTO Ausleihe VALUES (419, 1, 43, 9, 11, '2026-09-12 16:20', '2026-09-12 16:41', 21, 2.68);
INSERT INTO Ausleihe VALUES (420, 21, 40, 12, 2, '2026-09-12 18:56', '2026-09-12 19:16', 20, 2.6);
INSERT INTO Ausleihe VALUES (421, 25, 5, 2, 1, '2026-09-12 20:19', '2026-09-12 20:43', 24, 4.88);
INSERT INTO Ausleihe VALUES (422, 36, 4, 5, 9, '2026-09-13 11:34', '2026-09-13 11:46', 12, 1.96);
INSERT INTO Ausleihe VALUES (423, 28, 54, 2, 5, '2026-09-13 12:58', '2026-09-13 14:00', 62, 8.94);
INSERT INTO Ausleihe VALUES (424, 32, 36, 8, 9, '2026-09-13 15:43', '2026-09-13 16:12', 29, 3.32);
INSERT INTO Ausleihe VALUES (425, 37, 68, 1, 4, '2026-09-13 18:05', '2026-09-13 18:25', 20, 3.9);
INSERT INTO Ausleihe VALUES (426, 10, 57, 1, 6, '2026-09-14 11:27', '2026-09-14 11:43', 16, 3.92);
INSERT INTO Ausleihe VALUES (427, 2, 68, 9, 5, '2026-09-14 14:22', '2026-09-14 14:34', 12, 1.96);
INSERT INTO Ausleihe VALUES (428, 33, 30, 10, 1, '2026-09-14 15:57', '2026-09-14 16:08', 11, 1.88);
INSERT INTO Ausleihe VALUES (429, 8, 37, 7, 3, '2026-09-14 18:08', '2026-09-14 18:43', 35, 5.7);
INSERT INTO Ausleihe VALUES (430, 31, 54, 8, 3, '2026-09-14 20:22', '2026-09-14 21:02', 40, 4.2);
INSERT INTO Ausleihe VALUES (431, 16, 22, 5, 3, '2026-09-15 08:08', '2026-09-15 08:45', 37, 6.44);
INSERT INTO Ausleihe VALUES (432, 26, 33, 10, 4, '2026-09-15 10:04', '2026-09-15 10:48', 44, 4.52);
INSERT INTO Ausleihe VALUES (433, 20, 31, 10, 8, '2026-09-15 13:33', '2026-09-15 14:25', 52, 5.16);
INSERT INTO Ausleihe VALUES (434, 24, 75, 7, 13, '2026-09-15 13:40', '2026-09-15 13:52', 12, 2.94);
INSERT INTO Ausleihe VALUES (435, 16, 10, 13, 7, '2026-09-15 16:42', '2026-09-15 16:49', 7, 2.84);
INSERT INTO Ausleihe VALUES (436, 9, 37, 8, 3, '2026-09-15 17:12', '2026-09-15 17:28', 16, 2.28);
INSERT INTO Ausleihe VALUES (437, 17, 27, 9, 12, '2026-09-15 18:15', '2026-09-15 18:30', 15, 2.2);
INSERT INTO Ausleihe VALUES (438, 40, 66, 8, 1, '2026-09-16 09:21', '2026-09-16 09:46', 25, 4.5);
INSERT INTO Ausleihe VALUES (439, 8, 20, 12, 7, '2026-09-16 12:01', '2026-09-16 12:43', 42, 6.54);
INSERT INTO Ausleihe VALUES (440, 23, 28, 12, 10, '2026-09-16 16:35', '2026-09-16 16:48', 13, 2.04);
INSERT INTO Ausleihe VALUES (441, 29, 76, 10, 12, '2026-09-16 17:26', '2026-09-16 17:57', 31, 5.22);
INSERT INTO Ausleihe VALUES (442, 11, 27, 5, 9, '2026-09-16 21:17', '2026-09-16 21:37', 20, 2.6);
INSERT INTO Ausleihe VALUES (443, 28, 72, 1, 3, '2026-09-17 16:06', '2026-09-17 16:11', 5, 2.1);
INSERT INTO Ausleihe VALUES (444, 6, 10, 1, 10, '2026-09-17 19:03', '2026-09-17 19:19', 16, 2.28);
INSERT INTO Ausleihe VALUES (445, 20, 59, 5, 10, '2026-09-17 21:38', '2026-09-17 21:53', 15, 2.2);
INSERT INTO Ausleihe VALUES (446, 33, 74, 6, 1, '2026-09-18 10:53', '2026-09-18 11:16', 23, 2.84);
INSERT INTO Ausleihe VALUES (447, 28, 73, 7, 8, '2026-09-18 12:25', '2026-09-18 13:07', 42, 6.54);
INSERT INTO Ausleihe VALUES (448, 23, 52, 12, 1, '2026-09-18 16:07', '2026-09-18 16:33', 26, 3.08);
INSERT INTO Ausleihe VALUES (449, 31, 54, 7, 8, '2026-09-18 18:07', '2026-09-18 18:26', 19, 2.52);
INSERT INTO Ausleihe VALUES (450, 32, 56, 2, 11, '2026-09-18 18:28', '2026-09-18 18:41', 13, 2.04);
INSERT INTO Ausleihe VALUES (451, 21, 9, 2, 7, '2026-09-19 08:37', '2026-09-19 08:53', 16, 2.28);
INSERT INTO Ausleihe VALUES (452, 18, 34, 12, 1, '2026-09-19 12:18', '2026-09-19 12:36', 18, 2.44);
INSERT INTO Ausleihe VALUES (453, 2, 78, 2, 9, '2026-09-19 12:46', '2026-09-19 13:12', 26, 3.08);
INSERT INTO Ausleihe VALUES (454, 13, 56, 1, 7, '2026-09-19 16:17', '2026-09-19 16:47', 30, 5.1);
INSERT INTO Ausleihe VALUES (455, 6, 16, 7, 4, '2026-09-19 18:11', '2026-09-19 18:29', 18, 2.44);
INSERT INTO Ausleihe VALUES (456, 33, 16, 8, 5, '2026-09-20 08:27', '2026-09-20 08:44', 17, 2.36);
INSERT INTO Ausleihe VALUES (457, 11, 53, 7, 12, '2026-09-20 09:00', '2026-09-20 09:26', 26, 3.08);
INSERT INTO Ausleihe VALUES (458, 37, 21, 5, 1, '2026-09-20 11:38', '2026-09-20 12:00', 22, 4.14);
INSERT INTO Ausleihe VALUES (459, 8, 58, 2, 1, '2026-09-20 13:23', '2026-09-20 13:31', 8, 2.46);
INSERT INTO Ausleihe VALUES (460, 17, 56, 4, 4, '2026-09-20 13:51', '2026-09-20 14:00', 9, 1.72);
INSERT INTO Ausleihe VALUES (461, 29, 37, 3, NULL, '2026-09-20 15:09', NULL, NULL, NULL);
INSERT INTO Ausleihe VALUES (462, 20, 15, 11, NULL, '2026-09-20 15:22', NULL, NULL, NULL);
INSERT INTO Ausleihe VALUES (463, 9, 54, 9, NULL, '2026-09-20 16:02', NULL, NULL, NULL);
INSERT INTO Ausleihe VALUES (464, 32, 41, 6, NULL, '2026-09-20 16:39', NULL, NULL, NULL);
INSERT INTO Ausleihe VALUES (465, 5, 26, 1, NULL, '2026-09-20 17:35', NULL, NULL, NULL);
INSERT INTO Ausleihe VALUES (466, 1, 74, 4, NULL, '2026-09-20 17:42', NULL, NULL, NULL);
INSERT INTO Ausleihe VALUES (467, 18, 59, 8, NULL, '2026-09-20 18:00', NULL, NULL, NULL);
INSERT INTO Ausleihe VALUES (468, 23, 32, 11, NULL, '2026-09-20 18:20', NULL, NULL, NULL);
INSERT INTO Ausleihe VALUES (469, 35, 44, 9, NULL, '2026-09-20 18:47', NULL, NULL, NULL);

-- Reparatur: 36 Zeilen
INSERT INTO Reparatur VALUES (1, 36, '2026-08-21', 'Schaltung', 132.43);
INSERT INTO Reparatur VALUES (2, 10, '2026-08-21', 'Inspektion', 66.0);
INSERT INTO Reparatur VALUES (3, 7, '2026-08-23', 'Licht defekt', 141.6);
INSERT INTO Reparatur VALUES (4, 33, '2026-08-23', 'Schaltung', 126.66);
INSERT INTO Reparatur VALUES (5, 23, '2026-08-23', 'Akku getauscht', 38.28);
INSERT INTO Reparatur VALUES (6, 31, '2026-08-23', 'Akku getauscht', 12.23);
INSERT INTO Reparatur VALUES (7, 36, '2026-08-25', 'Sattel ersetzt', 71.0);
INSERT INTO Reparatur VALUES (8, 30, '2026-08-27', 'Inspektion', 42.67);
INSERT INTO Reparatur VALUES (9, 22, '2026-08-30', 'Sattel ersetzt', 139.78);
INSERT INTO Reparatur VALUES (10, 33, '2026-08-30', 'Platter Reifen', 42.46);
INSERT INTO Reparatur VALUES (11, 1, '2026-08-31', 'Akku getauscht', 113.73);
INSERT INTO Reparatur VALUES (12, 27, '2026-09-01', 'Schaltung', 68.99);
INSERT INTO Reparatur VALUES (13, 8, '2026-09-10', 'Platter Reifen', 42.91);
INSERT INTO Reparatur VALUES (14, 33, '2026-09-11', 'Akku getauscht', 64.27);
INSERT INTO Reparatur VALUES (15, 25, '2026-09-13', 'Bremse defekt', 116.5);
INSERT INTO Reparatur VALUES (16, 8, '2026-09-14', 'Rahmen verbogen', 90.85);
INSERT INTO Reparatur VALUES (17, 40, '2026-09-14', 'Bremse defekt', 45.18);
INSERT INTO Reparatur VALUES (18, 11, '2026-09-16', 'Akku getauscht', 113.3);
INSERT INTO Reparatur VALUES (19, 13, '2026-09-17', 'Licht defekt', 71.78);
INSERT INTO Reparatur VALUES (20, 25, '2026-09-18', 'Sattel ersetzt', 123.82);
INSERT INTO Reparatur VALUES (21, 9, '2026-09-19', 'Bremse defekt', 28.49);
INSERT INTO Reparatur VALUES (22, 10, '2026-09-19', 'Licht defekt', 111.73);
INSERT INTO Reparatur VALUES (23, 2, '2026-09-19', 'Bremse defekt', 22.39);
INSERT INTO Reparatur VALUES (24, 19, '2026-09-20', 'Inspektion', 70.71);
INSERT INTO Reparatur VALUES (25, 21, '2026-08-21', 'Schaltung', 26.17);
INSERT INTO Reparatur VALUES (26, 22, '2026-08-23', 'Schaltung', 136.93);
INSERT INTO Reparatur VALUES (27, 40, '2026-09-03', 'Licht defekt', 86.51);
INSERT INTO Reparatur VALUES (28, 20, '2026-09-04', 'Sattel ersetzt', 67.8);
INSERT INTO Reparatur VALUES (29, 8, '2026-09-11', 'Rahmen verbogen', 83.53);
INSERT INTO Reparatur VALUES (30, 13, '2026-09-15', 'Akku getauscht', 106.29);
INSERT INTO Reparatur VALUES (31, 27, '2026-09-15', 'Sattel ersetzt', 67.0);
INSERT INTO Reparatur VALUES (32, 15, '2026-09-17', 'Akku getauscht', 41.8);
INSERT INTO Reparatur VALUES (33, 10, '2026-09-19', 'Rahmen verbogen', 76.89);
INSERT INTO Reparatur VALUES (34, 16, '2026-09-20', 'Sattel ersetzt', 84.15);
INSERT INTO Reparatur VALUES (35, 25, '2026-09-20', 'Rahmen verbogen', 115.75);
INSERT INTO Reparatur VALUES (36, 39, '2026-09-20', 'Licht defekt', 97.74);

COMMIT;
