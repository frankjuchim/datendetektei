-- =====================================================================
-- Datendetektei Weserstedt · basis.sql der Übungsdatenbank „pruefung/kostuemverleih“
-- ERZEUGT von scripts/db_bauen.js (npm run db) – nicht von Hand ändern.
-- Datenbank: pruefung/kostuemverleih
-- Seed: datendetektei:pruefung/kostuemverleih:v1 (FNV-1a 0x22701f4b) – kuratiert, kein Generator
-- Version: 1
-- SHA-256 (Datenteil): 2f93e45164b17b2a147453525703cc3792e92929d0b43368b6ca999a2a5072a6
-- =====================================================================

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

-- ===== Daten (erzeugt) =====
BEGIN;
PRAGMA defer_foreign_keys = ON;

-- Mitglied: 26 Zeilen
INSERT INTO Mitglied VALUES (1, 'Greta', 'Schwarting', '12a', NULL);
INSERT INTO Mitglied VALUES (2, 'Jasper', 'Haake', '12b', NULL);
INSERT INTO Mitglied VALUES (3, 'Aylin', 'Rossi', '11c', NULL);
INSERT INTO Mitglied VALUES (4, 'Hanna', 'Brakenhoff', '12c', NULL);
INSERT INTO Mitglied VALUES (5, 'Milan', 'Osterloh', '11a', NULL);
INSERT INTO Mitglied VALUES (6, 'Pauline', 'Tebbe', '10b', 3);
INSERT INTO Mitglied VALUES (7, 'Finn', 'Bohlken', '10a', 1);
INSERT INTO Mitglied VALUES (8, 'Leni', 'Ihnken', '9c', 1);
INSERT INTO Mitglied VALUES (9, 'Lasse', 'Kück', '11a', NULL);
INSERT INTO Mitglied VALUES (10, 'Rieke', 'Dählmann', '9a', 2);
INSERT INTO Mitglied VALUES (11, 'Emil', 'Saathoff', '8b', 3);
INSERT INTO Mitglied VALUES (12, 'Mira', 'Onken', '8a', 2);
INSERT INTO Mitglied VALUES (13, 'Jana', 'Hinners', '10c', 1);
INSERT INTO Mitglied VALUES (14, 'Deniz', 'Petrović', '9b', 3);
INSERT INTO Mitglied VALUES (15, 'Fenja', 'Lampe', '7a', 2);
INSERT INTO Mitglied VALUES (16, 'Ole', 'Klattenhoff', '7c', 5);
INSERT INTO Mitglied VALUES (17, 'Selin', 'Nowak', '8c', 1);
INSERT INTO Mitglied VALUES (18, 'Swantje', 'Ohlrogge', '10a', NULL);
INSERT INTO Mitglied VALUES (19, 'Linus', 'Wachtendorf', '9a', 3);
INSERT INTO Mitglied VALUES (20, 'Lasse', 'Kück', '7b', 2);
INSERT INTO Mitglied VALUES (21, 'Imke', 'Jaspers', '11b', NULL);
INSERT INTO Mitglied VALUES (22, 'Zoe', 'Mammen', '8b', 5);
INSERT INTO Mitglied VALUES (23, 'Arne', 'Steenken', '9b', 1);
INSERT INTO Mitglied VALUES (24, 'Bente', 'Heinemeyer', '7a', 3);
INSERT INTO Mitglied VALUES (25, 'Vivien', 'Schierholz', '12b', NULL);
INSERT INTO Mitglied VALUES (26, 'Nele', 'Backhaus', '10b', 2);

-- Kostuem: 40 Zeilen
INSERT INTO Kostuem VALUES (1, 'Toga', 'L', 'Antike', 'gut');
INSERT INTO Kostuem VALUES (2, 'Tunika', 'M', 'Antike', 'gut');
INSERT INTO Kostuem VALUES (3, 'Chiton', 'S', 'Antike', 'gut');
INSERT INTO Kostuem VALUES (4, 'Peplos', 'M', 'Antike', 'gut');
INSERT INTO Kostuem VALUES (5, 'Soldatenrüstung', 'XL', 'Antike', 'reparaturbedürftig');
INSERT INTO Kostuem VALUES (6, 'Orakelgewand', 'M', 'Antike', 'gut');
INSERT INTO Kostuem VALUES (7, 'Ritterrüstung', 'L', 'Mittelalter', 'gut');
INSERT INTO Kostuem VALUES (8, 'Burgfräuleinkleid', 'S', 'Mittelalter', 'gut');
INSERT INTO Kostuem VALUES (9, 'Mönchskutte', 'XL', 'Mittelalter', 'reparaturbedürftig');
INSERT INTO Kostuem VALUES (10, 'Gauklerkostüm', 'M', 'Mittelalter', 'gut');
INSERT INTO Kostuem VALUES (11, 'Königsmantel', 'XL', 'Mittelalter', 'gut');
INSERT INTO Kostuem VALUES (12, 'Magdkleid', 'S', 'Mittelalter', 'gut');
INSERT INTO Kostuem VALUES (13, 'Narrenkappe mit Wams', 'M', 'Mittelalter', 'gut');
INSERT INTO Kostuem VALUES (14, 'Kettenhemd', 'L', 'Mittelalter', 'gut');
INSERT INTO Kostuem VALUES (15, 'Reifrockkleid rosé', 'M', 'Barock', 'gut');
INSERT INTO Kostuem VALUES (16, 'Reifrockkleid blau', 'S', 'Barock', 'gut');
INSERT INTO Kostuem VALUES (17, 'Justaucorps rot', 'L', 'Barock', 'gut');
INSERT INTO Kostuem VALUES (18, 'Justaucorps grün', 'M', 'Barock', 'gut');
INSERT INTO Kostuem VALUES (19, 'Reifrockkleid grün', 'L', 'Barock', 'gut');
INSERT INTO Kostuem VALUES (20, 'Dienerlivree', 'M', 'Barock', 'gut');
INSERT INTO Kostuem VALUES (21, 'Zofenkleid', 'S', 'Barock', 'gut');
INSERT INTO Kostuem VALUES (22, 'Musikantenrock', 'L', 'Barock', 'reparaturbedürftig');
INSERT INTO Kostuem VALUES (23, 'Gesandtenmantel', 'XL', 'Barock', 'gut');
INSERT INTO Kostuem VALUES (24, 'Deichgrafenmantel', 'XL', '19. Jahrhundert', 'gut');
INSERT INTO Kostuem VALUES (25, 'Fischerinnenkleid', 'M', '19. Jahrhundert', 'gut');
INSERT INTO Kostuem VALUES (26, 'Gehrock', 'L', '19. Jahrhundert', 'gut');
INSERT INTO Kostuem VALUES (27, 'Schürzenkleid', 'S', '19. Jahrhundert', 'gut');
INSERT INTO Kostuem VALUES (28, 'Postuniform', 'M', '19. Jahrhundert', 'gut');
INSERT INTO Kostuem VALUES (29, 'Wirtinnenkleid', 'L', '19. Jahrhundert', 'gut');
INSERT INTO Kostuem VALUES (30, 'Seemannsjacke', 'M', '19. Jahrhundert', 'reparaturbedürftig');
INSERT INTO Kostuem VALUES (31, 'Biedermeierkleid', 'S', '19. Jahrhundert', 'gut');
INSERT INTO Kostuem VALUES (32, 'Hafenmeisterin-Uniform', 'M', 'Moderne', 'gut');
INSERT INTO Kostuem VALUES (33, 'Trenchcoat', 'L', 'Moderne', 'gut');
INSERT INTO Kostuem VALUES (34, 'Matrosenanzug', 'S', 'Moderne', 'gut');
INSERT INTO Kostuem VALUES (35, 'Chor-Shirt schwarz', 'M', 'Moderne', 'gut');
INSERT INTO Kostuem VALUES (36, 'Chor-Shirt grau', 'L', 'Moderne', 'gut');
INSERT INTO Kostuem VALUES (37, 'Anzug grau', 'L', 'Moderne', 'gut');
INSERT INTO Kostuem VALUES (38, 'Overall', 'XL', 'Moderne', 'reparaturbedürftig');
INSERT INTO Kostuem VALUES (39, 'Regenmantel gelb', 'M', 'Moderne', 'gut');
INSERT INTO Kostuem VALUES (40, 'Abendkleid', 'S', 'Moderne', 'gut');

-- Stueck: 4 Zeilen
INSERT INTO Stueck VALUES (1, 'Das Fest im Spiegelsaal', '2026-11-20');
INSERT INTO Stueck VALUES (2, 'Nebel über dem Deich', '2027-01-29');
INSERT INTO Stueck VALUES (3, 'Der Hof des Mondkönigs', '2027-03-19');
INSERT INTO Stueck VALUES (4, 'Das Orakel am Kai', '2027-06-11');

-- Rolle: 20 Zeilen
INSERT INTO Rolle VALUES (1, 'Gräfin', 1);
INSERT INTO Rolle VALUES (2, 'Marquis', 1);
INSERT INTO Rolle VALUES (3, 'Kammerdiener', 1);
INSERT INTO Rolle VALUES (4, 'Zofe', 1);
INSERT INTO Rolle VALUES (5, 'Hofmusikus', 1);
INSERT INTO Rolle VALUES (6, 'Deichgraf', 2);
INSERT INTO Rolle VALUES (7, 'Fischerin', 2);
INSERT INTO Rolle VALUES (8, 'Lehrer', 2);
INSERT INTO Rolle VALUES (9, 'Wirtin', 2);
INSERT INTO Rolle VALUES (10, 'Postbote', 2);
INSERT INTO Rolle VALUES (11, 'Mondkönig', 3);
INSERT INTO Rolle VALUES (12, 'Hofnärrin', 3);
INSERT INTO Rolle VALUES (13, 'Ritter', 3);
INSERT INTO Rolle VALUES (14, 'Magd', 3);
INSERT INTO Rolle VALUES (15, 'Gesandter aus Venedig', 3);
INSERT INTO Rolle VALUES (16, 'Orakel', 4);
INSERT INTO Rolle VALUES (17, 'Hafenmeisterin', 4);
INSERT INTO Rolle VALUES (18, 'Seefahrer', 4);
INSERT INTO Rolle VALUES (19, 'Chor', 4);
INSERT INTO Rolle VALUES (20, 'Reporterin', 4);

-- Ausleihe: 77 Zeilen
INSERT INTO Ausleihe VALUES (1, 17, 7, 3, '2026-09-07', '2026-09-11');
INSERT INTO Ausleihe VALUES (2, 15, 6, 1, '2026-09-14', '2026-10-02');
INSERT INTO Ausleihe VALUES (3, 20, 7, 3, '2026-10-12', '2026-11-24');
INSERT INTO Ausleihe VALUES (4, 21, 8, 4, '2026-10-12', '2026-11-24');
INSERT INTO Ausleihe VALUES (5, 24, 7, 8, '2026-10-19', '2026-10-30');
INSERT INTO Ausleihe VALUES (6, 22, 9, 5, '2026-10-19', '2026-11-23');
INSERT INTO Ausleihe VALUES (7, 15, 13, 1, '2026-10-19', '2026-10-23');
INSERT INTO Ausleihe VALUES (8, 26, 21, 8, '2026-10-26', '2026-11-06');
INSERT INTO Ausleihe VALUES (9, 15, 6, 1, '2026-11-02', '2026-11-23');
INSERT INTO Ausleihe VALUES (10, 16, 6, 1, '2026-11-02', '2026-11-23');
INSERT INTO Ausleihe VALUES (11, 24, 11, 8, '2026-11-02', '2026-11-13');
INSERT INTO Ausleihe VALUES (12, 25, 15, 7, '2026-11-02', '2026-11-06');
INSERT INTO Ausleihe VALUES (13, 19, 13, 1, '2026-11-09', '2026-11-23');
INSERT INTO Ausleihe VALUES (14, 27, 13, 9, '2026-11-16', '2026-11-20');
INSERT INTO Ausleihe VALUES (15, 24, 20, 10, '2026-11-16', '2026-11-20');
INSERT INTO Ausleihe VALUES (16, 24, 21, 8, '2026-11-23', '2026-11-27');
INSERT INTO Ausleihe VALUES (17, 24, 2, 6, '2026-11-30', '2027-02-01');
INSERT INTO Ausleihe VALUES (18, 25, 10, 7, '2026-11-30', '2027-02-02');
INSERT INTO Ausleihe VALUES (19, 30, 20, 10, '2026-11-30', '2026-12-11');
INSERT INTO Ausleihe VALUES (20, 26, 11, 8, '2026-12-07', '2027-02-01');
INSERT INTO Ausleihe VALUES (21, 29, 13, 9, '2026-12-07', '2027-02-03');
INSERT INTO Ausleihe VALUES (22, 28, 20, 10, '2026-12-07', '2027-02-01');
INSERT INTO Ausleihe VALUES (23, 13, 1, 12, '2026-12-14', '2026-12-25');
INSERT INTO Ausleihe VALUES (24, 8, 8, 14, '2026-12-14', '2026-12-18');
INSERT INTO Ausleihe VALUES (25, 7, 12, 12, '2026-12-14', '2026-12-25');
INSERT INTO Ausleihe VALUES (26, 27, 15, 7, '2026-12-14', '2026-12-18');
INSERT INTO Ausleihe VALUES (27, 12, 8, 14, '2026-12-21', '2026-12-25');
INSERT INTO Ausleihe VALUES (28, 30, 10, 7, '2026-12-21', '2026-12-25');
INSERT INTO Ausleihe VALUES (29, 39, 5, 18, '2027-01-04', '2027-01-08');
INSERT INTO Ausleihe VALUES (30, 3, 6, 16, '2027-01-04', '2027-01-08');
INSERT INTO Ausleihe VALUES (31, 14, 17, 14, '2027-01-04', '2027-01-15');
INSERT INTO Ausleihe VALUES (32, 11, 1, 11, '2027-01-11', '2027-03-22');
INSERT INTO Ausleihe VALUES (33, 33, 3, 17, '2027-01-11', '2027-01-15');
INSERT INTO Ausleihe VALUES (34, 36, 4, 19, '2027-01-11', '2027-01-15');
INSERT INTO Ausleihe VALUES (35, 39, 9, 18, '2027-01-11', '2027-01-15');
INSERT INTO Ausleihe VALUES (36, 27, 10, 7, '2027-01-11', '2027-02-02');
INSERT INTO Ausleihe VALUES (37, 10, 12, 12, '2027-01-11', '2027-02-12');
INSERT INTO Ausleihe VALUES (38, 2, 14, 19, '2027-01-11', '2027-01-22');
INSERT INTO Ausleihe VALUES (39, 30, 15, 7, '2027-01-11', '2027-02-01');
INSERT INTO Ausleihe VALUES (40, 1, 22, 19, '2027-01-11', '2027-01-15');
INSERT INTO Ausleihe VALUES (41, 35, 4, 19, '2027-01-18', '2027-01-29');
INSERT INTO Ausleihe VALUES (42, 34, 5, 18, '2027-01-18', '2027-01-29');
INSERT INTO Ausleihe VALUES (43, 31, 13, 9, '2027-01-18', '2027-02-03');
INSERT INTO Ausleihe VALUES (44, 3, 14, 19, '2027-01-18', '2027-01-29');
INSERT INTO Ausleihe VALUES (45, 7, 16, 13, '2027-01-18', '2027-03-23');
INSERT INTO Ausleihe VALUES (46, 12, 17, 14, '2027-01-18', '2027-03-22');
INSERT INTO Ausleihe VALUES (47, 39, 19, 18, '2027-01-18', '2027-01-29');
INSERT INTO Ausleihe VALUES (48, 9, 16, 13, '2027-01-25', '2027-02-05');
INSERT INTO Ausleihe VALUES (49, 36, 18, 19, '2027-01-25', '2027-01-29');
INSERT INTO Ausleihe VALUES (50, 4, 23, 19, '2027-01-25', '2027-02-05');
INSERT INTO Ausleihe VALUES (51, 8, 1, 14, '2027-02-01', '2027-02-12');
INSERT INTO Ausleihe VALUES (52, 36, 23, 19, '2027-02-01', '2027-02-05');
INSERT INTO Ausleihe VALUES (53, 39, 26, 20, '2027-02-01', '2027-02-05');
INSERT INTO Ausleihe VALUES (54, 17, 2, 15, '2027-02-08', '2027-03-22');
INSERT INTO Ausleihe VALUES (55, 23, 2, 15, '2027-02-08', '2027-03-22');
INSERT INTO Ausleihe VALUES (56, 39, 3, 17, '2027-02-08', '2027-02-12');
INSERT INTO Ausleihe VALUES (57, 30, 19, 18, '2027-02-08', '2027-02-19');
INSERT INTO Ausleihe VALUES (58, 36, 24, 19, '2027-02-08', '2027-02-12');
INSERT INTO Ausleihe VALUES (59, 3, 26, 20, '2027-02-08', '2027-02-19');
INSERT INTO Ausleihe VALUES (60, 9, 5, 13, '2027-02-15', '2027-02-19');
INSERT INTO Ausleihe VALUES (61, 34, 9, 18, '2027-02-15', '2027-02-19');
INSERT INTO Ausleihe VALUES (62, 13, 12, 12, '2027-02-15', '2027-03-22');
INSERT INTO Ausleihe VALUES (63, 14, 16, 13, '2027-02-15', NULL);
INSERT INTO Ausleihe VALUES (64, 9, 1, 11, '2027-02-22', '2027-03-22');
INSERT INTO Ausleihe VALUES (65, 8, 17, 14, '2027-02-22', '2027-03-22');
INSERT INTO Ausleihe VALUES (66, 4, 22, 19, '2027-02-22', '2027-02-26');
INSERT INTO Ausleihe VALUES (67, 4, 6, 16, '2027-03-01', '2027-03-05');
INSERT INTO Ausleihe VALUES (68, 36, 11, 19, '2027-03-01', '2027-03-12');
INSERT INTO Ausleihe VALUES (69, 35, 14, 19, '2027-03-01', '2027-03-12');
INSERT INTO Ausleihe VALUES (70, 3, 23, 19, '2027-03-01', '2027-03-12');
INSERT INTO Ausleihe VALUES (71, 33, 26, 20, '2027-03-01', '2027-03-12');
INSERT INTO Ausleihe VALUES (72, 32, 3, 17, '2027-03-08', NULL);
INSERT INTO Ausleihe VALUES (73, 6, 6, 16, '2027-03-08', NULL);
INSERT INTO Ausleihe VALUES (74, 10, 21, 12, '2027-03-08', '2027-03-12');
INSERT INTO Ausleihe VALUES (75, 34, 19, 18, '2027-03-09', NULL);
INSERT INTO Ausleihe VALUES (76, 2, 22, 19, '2027-03-15', NULL);
INSERT INTO Ausleihe VALUES (77, 1, 24, 19, '2027-03-15', NULL);

-- KostuemRolle: 10 Zeilen
INSERT INTO KostuemRolle VALUES (11, 'Königsmantel', 11, 'Mondkönig', 'Der Hof des Mondkönigs', '2027-03-19');
INSERT INTO KostuemRolle VALUES (10, 'Gauklerkostüm', 12, 'Hofnärrin', 'Der Hof des Mondkönigs', '2027-03-19');
INSERT INTO KostuemRolle VALUES (13, 'Narrenkappe mit Wams', 12, 'Hofnärrin', 'Der Hof des Mondkönigs', '2027-03-19');
INSERT INTO KostuemRolle VALUES (7, 'Ritterrüstung', 13, 'Ritter', 'Der Hof des Mondkönigs', '2027-03-12');
INSERT INTO KostuemRolle VALUES (14, 'Kettenhemd', 13, 'Ritter', 'Der Hof des Mondkönigs', '2027-03-19');
INSERT INTO KostuemRolle VALUES (12, 'Magdkleid', 14, 'Magd', 'Der Hof des Mondkönigs', '2027-03-19');
INSERT INTO KostuemRolle VALUES (8, 'Burgfräuleinkleid', 14, 'Magd', 'Der Hof des Mondkönigs', '2027-03-19');
INSERT INTO KostuemRolle VALUES (23, 'Gesandtenmantel', 15, 'Gesandter aus Venedig', 'Der Hof des Mondkönigs', '2027-03-19');
INSERT INTO KostuemRolle VALUES (17, 'Justaucorps rot', 15, 'Gesandter aus Venedig', 'Der Hof des Mondkönigs', '2027-03-19');
INSERT INTO KostuemRolle VALUES (17, 'Justaucorps rot', 3, 'Kammerdiener', 'Das Fest im Spiegelsaal', '2026-11-20');

-- KostuemlisteRoh: 6 Zeilen
INSERT INTO KostuemlisteRoh VALUES ('Reifrockkleid rosé', 'M', 'Gräfin', 'Das Fest im Spiegelsaal', 'Kerstin Haake', '0000-4410');
INSERT INTO KostuemlisteRoh VALUES ('Justaucorps rot', 'L', 'Kammerdiener, Gesandter aus Venedig', 'Das Fest im Spiegelsaal, Der Hof des Mondkönigs', 'Kerstin Haake', '0000-4410');
INSERT INTO KostuemlisteRoh VALUES ('Königsmantel', 'XL', 'Mondkönig', 'Der Hof des Mondkönigs', 'Heiko Wendelken', '0000-5521');
INSERT INTO KostuemlisteRoh VALUES ('Ritterrüstung', 'L', 'Ritter', 'Der Hof des Mondkönigs', 'Heiko Wendelken', '0000-5512');
INSERT INTO KostuemlisteRoh VALUES ('Toga', 'L', 'Chor', 'Das Orakel am Kai', 'Kerstin Haake', '0000-4410');
INSERT INTO KostuemlisteRoh VALUES ('Seemannsjacke', 'M', 'Fischerin, Seefahrer', 'Nebel über dem Deich, Das Orakel am Kai', 'Kerstin Haake, Heiko Wendelken', '0000-4410, 0000-5521');

COMMIT;
