-- =====================================================================
-- Datendetektei Weserstedt · basis.sql der Übungsdatenbank „verhoer/mensa“
-- ERZEUGT von scripts/db_bauen.js (npm run db) – nicht von Hand ändern.
-- Datenbank: verhoer/mensa
-- Seed: datendetektei:verhoer/mensa:v1 (FNV-1a 0x2a07edd1) – kuratiert, kein Generator
-- Version: 1
-- SHA-256 (Datenteil): 593c42973535caeb139aff17a554884f6313a61cebec98cd5f635dd5e16babf8
-- =====================================================================

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

-- ===== Daten (erzeugt) =====
BEGIN;
PRAGMA defer_foreign_keys = ON;

-- Person: 40 Zeilen
INSERT INTO Person VALUES (1, 'Clara', 'Hemmen', 'Schüler', '5c');
INSERT INTO Person VALUES (2, 'Mehmet', 'Rabe', 'Schüler', '6b');
INSERT INTO Person VALUES (3, 'Pia', 'Pundt', 'Schüler', '9a');
INSERT INTO Person VALUES (4, 'Carla', 'Bargmann', 'Schüler', '9c');
INSERT INTO Person VALUES (5, 'Imke', 'Wehrhahn', 'Schüler', '6b');
INSERT INTO Person VALUES (6, 'Arne', 'Demir', 'Schüler', '5c');
INSERT INTO Person VALUES (7, 'Pia', 'Fehrmann', 'Schüler', '5c');
INSERT INTO Person VALUES (8, 'Karla', 'Siemers', 'Schüler', '5c');
INSERT INTO Person VALUES (9, 'Hilke', 'Akgül', 'Schüler', '9a');
INSERT INTO Person VALUES (10, 'Ella', 'Luttmann', 'Schüler', '8b');
INSERT INTO Person VALUES (11, 'Heiko', 'Rohlfs', 'Schüler', '5a');
INSERT INTO Person VALUES (12, 'Hanna', 'Dirksen', 'Schüler', '7a');
INSERT INTO Person VALUES (13, 'Anke', 'Siemers', 'Schüler', '8b');
INSERT INTO Person VALUES (14, 'Insa', 'Gerdts', 'Schüler', '10b');
INSERT INTO Person VALUES (15, 'Smilla', 'Hoffrogge', 'Schüler', '5a');
INSERT INTO Person VALUES (16, 'Clara', 'Pundt', 'Schüler', '9a');
INSERT INTO Person VALUES (17, 'Ida', 'Eggers', 'Schüler', '8b');
INSERT INTO Person VALUES (18, 'Björn', 'Okafor', 'Schüler', '5c');
INSERT INTO Person VALUES (19, 'Joris', 'Wiechmann', 'Schüler', '8b');
INSERT INTO Person VALUES (20, 'Taalke', 'Backhaus', 'Schüler', '9c');
INSERT INTO Person VALUES (21, 'Clara', 'Fehrmann', 'Schüler', '6b');
INSERT INTO Person VALUES (22, 'Finn', 'Tiemann', 'Schüler', '7c');
INSERT INTO Person VALUES (23, 'Keno', 'Dirksen', 'Schüler', '5a');
INSERT INTO Person VALUES (24, 'Jarne', 'Eggers', 'Schüler', '9c');
INSERT INTO Person VALUES (25, 'Insa', 'Akgül', 'Schüler', '10b');
INSERT INTO Person VALUES (26, 'Nele', 'Döscher', 'Schüler', '5c');
INSERT INTO Person VALUES (27, 'Marit', 'Wilms', 'Schüler', '8b');
INSERT INTO Person VALUES (28, 'Taalke', 'Bargmann', 'Schüler', '9c');
INSERT INTO Person VALUES (29, 'Karla', 'Möhlmann', 'Schüler', '9c');
INSERT INTO Person VALUES (30, 'Ole', 'Lindemann', 'Schüler', '10b');
INSERT INTO Person VALUES (31, 'Jannik', 'Dirksen', 'Schüler', '7c');
INSERT INTO Person VALUES (32, 'Frieda', 'Wehrhahn', 'Lehrkraft', NULL);
INSERT INTO Person VALUES (33, 'Ida', 'Bultjer', 'Lehrkraft', NULL);
INSERT INTO Person VALUES (34, 'Jannik', 'Kampen', 'Lehrkraft', NULL);
INSERT INTO Person VALUES (35, 'Mehmet', 'Lindemann', 'Lehrkraft', NULL);
INSERT INTO Person VALUES (36, 'Dana', 'Eggers', 'Lehrkraft', NULL);
INSERT INTO Person VALUES (37, 'Fenja', 'Dirksen', 'Lehrkraft', NULL);
INSERT INTO Person VALUES (38, 'Eike', 'Kahrs', 'Personal', NULL);
INSERT INTO Person VALUES (39, 'Dana', 'Hemmen', 'Personal', NULL);
INSERT INTO Person VALUES (40, 'Wiebke', 'Thölken', 'Personal', NULL);

-- Gericht: 14 Zeilen
INSERT INTO Gericht VALUES (1, 'Spaghetti Bolognese', 'Hauptgericht', 4.5, 'nein');
INSERT INTO Gericht VALUES (2, 'Gemüselasagne', 'Hauptgericht', 4.0, 'ja');
INSERT INTO Gericht VALUES (3, 'Hähnchen-Curry mit Reis', 'Hauptgericht', 4.75, 'nein');
INSERT INTO Gericht VALUES (4, 'Käsespätzle', 'Hauptgericht', 3.75, 'ja');
INSERT INTO Gericht VALUES (5, 'Fischstäbchen mit Kartoffelpüree', 'Hauptgericht', 4.25, 'nein');
INSERT INTO Gericht VALUES (6, 'Chili sin Carne', 'Hauptgericht', 3.5, 'ja');
INSERT INTO Gericht VALUES (7, 'Currywurst mit Pommes', 'Hauptgericht', 3.75, 'nein');
INSERT INTO Gericht VALUES (8, 'Falafel-Teller', 'Hauptgericht', 4.5, 'ja');
INSERT INTO Gericht VALUES (9, 'Tomatensuppe', 'Suppe', 2.25, 'ja');
INSERT INTO Gericht VALUES (10, 'Linseneintopf mit Würstchen', 'Suppe', 2.75, 'nein');
INSERT INTO Gericht VALUES (11, 'Gemischter Salat', 'Salat', 2.5, 'ja');
INSERT INTO Gericht VALUES (12, 'Couscous-Salat mit Feta', 'Salat', 3.25, 'ja');
INSERT INTO Gericht VALUES (13, 'Schokopudding', 'Dessert', 1.25, 'ja');
INSERT INTO Gericht VALUES (14, 'Kürbissuppe', 'Suppe', 2.5, 'ja');

-- Angebot: 68 Zeilen
INSERT INTO Angebot VALUES (1, 2, '2027-02-22', 20);
INSERT INTO Angebot VALUES (2, 9, '2027-02-22', 20);
INSERT INTO Angebot VALUES (3, 1, '2027-02-23', 20);
INSERT INTO Angebot VALUES (4, 13, '2027-02-23', 20);
INSERT INTO Angebot VALUES (5, 7, '2027-02-24', 20);
INSERT INTO Angebot VALUES (6, 11, '2027-02-24', 20);
INSERT INTO Angebot VALUES (7, 5, '2027-02-25', 20);
INSERT INTO Angebot VALUES (8, 6, '2027-02-25', 20);
INSERT INTO Angebot VALUES (9, 4, '2027-02-26', 20);
INSERT INTO Angebot VALUES (10, 12, '2027-02-26', 20);
INSERT INTO Angebot VALUES (11, 3, '2027-03-01', 20);
INSERT INTO Angebot VALUES (12, 4, '2027-03-01', 20);
INSERT INTO Angebot VALUES (13, 9, '2027-03-01', 20);
INSERT INTO Angebot VALUES (14, 1, '2027-03-02', 20);
INSERT INTO Angebot VALUES (15, 6, '2027-03-02', 20);
INSERT INTO Angebot VALUES (16, 13, '2027-03-02', 20);
INSERT INTO Angebot VALUES (17, 7, '2027-03-03', 20);
INSERT INTO Angebot VALUES (18, 2, '2027-03-03', 20);
INSERT INTO Angebot VALUES (19, 11, '2027-03-03', 20);
INSERT INTO Angebot VALUES (20, 5, '2027-03-04', 20);
INSERT INTO Angebot VALUES (21, 8, '2027-03-04', 20);
INSERT INTO Angebot VALUES (22, 10, '2027-03-04', 20);
INSERT INTO Angebot VALUES (23, 1, '2027-03-05', 20);
INSERT INTO Angebot VALUES (24, 7, '2027-03-05', 20);
INSERT INTO Angebot VALUES (25, 12, '2027-03-05', 20);
INSERT INTO Angebot VALUES (26, 3, '2027-03-08', 20);
INSERT INTO Angebot VALUES (27, 2, '2027-03-08', 20);
INSERT INTO Angebot VALUES (28, 9, '2027-03-08', 20);
INSERT INTO Angebot VALUES (29, 5, '2027-03-09', 20);
INSERT INTO Angebot VALUES (30, 4, '2027-03-09', 20);
INSERT INTO Angebot VALUES (31, 13, '2027-03-09', 20);
INSERT INTO Angebot VALUES (32, 1, '2027-03-10', 20);
INSERT INTO Angebot VALUES (33, 6, '2027-03-10', 20);
INSERT INTO Angebot VALUES (34, 10, '2027-03-10', 20);
INSERT INTO Angebot VALUES (35, 7, '2027-03-11', 20);
INSERT INTO Angebot VALUES (36, 8, '2027-03-11', 20);
INSERT INTO Angebot VALUES (37, 11, '2027-03-11', 20);
INSERT INTO Angebot VALUES (38, 3, '2027-03-12', 20);
INSERT INTO Angebot VALUES (39, 5, '2027-03-12', 20);
INSERT INTO Angebot VALUES (40, 12, '2027-03-12', 20);
INSERT INTO Angebot VALUES (41, 1, '2027-03-15', 25);
INSERT INTO Angebot VALUES (42, 4, '2027-03-15', 20);
INSERT INTO Angebot VALUES (43, 10, '2027-03-15', 20);
INSERT INTO Angebot VALUES (44, 13, '2027-03-15', 20);
INSERT INTO Angebot VALUES (45, 3, '2027-03-16', 20);
INSERT INTO Angebot VALUES (46, 6, '2027-03-16', 20);
INSERT INTO Angebot VALUES (47, 9, '2027-03-16', 20);
INSERT INTO Angebot VALUES (48, 7, '2027-03-17', 20);
INSERT INTO Angebot VALUES (49, 2, '2027-03-17', 20);
INSERT INTO Angebot VALUES (50, 11, '2027-03-17', 20);
INSERT INTO Angebot VALUES (51, 5, '2027-03-18', 20);
INSERT INTO Angebot VALUES (52, 8, '2027-03-18', 20);
INSERT INTO Angebot VALUES (53, 13, '2027-03-18', 20);
INSERT INTO Angebot VALUES (54, 7, '2027-03-19', 20);
INSERT INTO Angebot VALUES (55, 4, '2027-03-19', 20);
INSERT INTO Angebot VALUES (56, 12, '2027-03-19', 20);
INSERT INTO Angebot VALUES (57, 1, '2027-03-22', 20);
INSERT INTO Angebot VALUES (58, 2, '2027-03-22', 20);
INSERT INTO Angebot VALUES (59, 9, '2027-03-22', 20);
INSERT INTO Angebot VALUES (60, 3, '2027-03-23', 20);
INSERT INTO Angebot VALUES (61, 6, '2027-03-23', 20);
INSERT INTO Angebot VALUES (62, 10, '2027-03-23', 20);
INSERT INTO Angebot VALUES (63, 1, '2027-03-24', 20);
INSERT INTO Angebot VALUES (64, 7, '2027-03-24', 20);
INSERT INTO Angebot VALUES (65, 13, '2027-03-24', 20);
INSERT INTO Angebot VALUES (66, 2, '2027-03-25', 20);
INSERT INTO Angebot VALUES (67, 5, '2027-03-25', 20);
INSERT INTO Angebot VALUES (68, 9, '2027-03-25', 20);

-- Bestellung: 319 Zeilen
INSERT INTO Bestellung VALUES (1, 39, 1, 1, '12:21');
INSERT INTO Bestellung VALUES (2, 20, 1, 2, '12:37');
INSERT INTO Bestellung VALUES (3, 16, 1, 2, NULL);
INSERT INTO Bestellung VALUES (4, 21, 1, 1, '12:06');
INSERT INTO Bestellung VALUES (5, 27, 2, 1, '12:24');
INSERT INTO Bestellung VALUES (6, 9, 2, 2, '13:18');
INSERT INTO Bestellung VALUES (7, 35, 3, 3, '11:49');
INSERT INTO Bestellung VALUES (8, 3, 3, 1, '12:46');
INSERT INTO Bestellung VALUES (9, 25, 3, 1, '11:57');
INSERT INTO Bestellung VALUES (10, 5, 4, 1, '12:59');
INSERT INTO Bestellung VALUES (11, 37, 4, 2, '12:56');
INSERT INTO Bestellung VALUES (12, 21, 5, 1, '12:27');
INSERT INTO Bestellung VALUES (13, 18, 5, 1, '12:22');
INSERT INTO Bestellung VALUES (14, 3, 5, 1, '12:50');
INSERT INTO Bestellung VALUES (15, 37, 5, 1, '12:15');
INSERT INTO Bestellung VALUES (16, 22, 5, 2, '12:36');
INSERT INTO Bestellung VALUES (17, 28, 6, 2, '12:31');
INSERT INTO Bestellung VALUES (18, 27, 7, 1, '13:11');
INSERT INTO Bestellung VALUES (19, 35, 7, 2, '11:54');
INSERT INTO Bestellung VALUES (20, 13, 7, 1, '12:22');
INSERT INTO Bestellung VALUES (21, 12, 8, 1, '12:39');
INSERT INTO Bestellung VALUES (22, 7, 8, 1, '11:44');
INSERT INTO Bestellung VALUES (23, 37, 8, 2, '13:35');
INSERT INTO Bestellung VALUES (24, 31, 9, 3, '13:13');
INSERT INTO Bestellung VALUES (25, 33, 9, 1, '12:03');
INSERT INTO Bestellung VALUES (26, 6, 9, 1, '13:11');
INSERT INTO Bestellung VALUES (27, 19, 10, 2, '13:09');
INSERT INTO Bestellung VALUES (28, 4, 11, 1, '13:10');
INSERT INTO Bestellung VALUES (29, 29, 11, 2, '12:43');
INSERT INTO Bestellung VALUES (30, 3, 11, 2, '13:05');
INSERT INTO Bestellung VALUES (31, 5, 11, 3, '12:56');
INSERT INTO Bestellung VALUES (32, 23, 11, 3, '13:03');
INSERT INTO Bestellung VALUES (33, 17, 12, 2, '11:46');
INSERT INTO Bestellung VALUES (34, 28, 12, 1, '12:08');
INSERT INTO Bestellung VALUES (35, 25, 12, 3, '13:28');
INSERT INTO Bestellung VALUES (36, 6, 12, 2, '12:26');
INSERT INTO Bestellung VALUES (37, 30, 13, 2, NULL);
INSERT INTO Bestellung VALUES (38, 15, 13, 1, '13:19');
INSERT INTO Bestellung VALUES (39, 26, 13, 1, '13:36');
INSERT INTO Bestellung VALUES (40, 3, 14, 1, '11:51');
INSERT INTO Bestellung VALUES (41, 35, 14, 2, '12:54');
INSERT INTO Bestellung VALUES (42, 13, 14, 1, '12:18');
INSERT INTO Bestellung VALUES (43, 28, 14, 2, '13:12');
INSERT INTO Bestellung VALUES (44, 7, 14, 3, NULL);
INSERT INTO Bestellung VALUES (45, 12, 14, 1, '13:03');
INSERT INTO Bestellung VALUES (46, 24, 15, 1, NULL);
INSERT INTO Bestellung VALUES (47, 26, 15, 2, '12:32');
INSERT INTO Bestellung VALUES (48, 39, 15, 1, '12:24');
INSERT INTO Bestellung VALUES (49, 11, 15, 2, '12:59');
INSERT INTO Bestellung VALUES (50, 3, 16, 1, '12:34');
INSERT INTO Bestellung VALUES (51, 4, 16, 1, '12:36');
INSERT INTO Bestellung VALUES (52, 29, 16, 1, NULL);
INSERT INTO Bestellung VALUES (53, 35, 16, 1, '12:24');
INSERT INTO Bestellung VALUES (54, 11, 17, 1, '12:21');
INSERT INTO Bestellung VALUES (55, 15, 17, 2, '12:07');
INSERT INTO Bestellung VALUES (56, 38, 17, 1, '12:47');
INSERT INTO Bestellung VALUES (57, 12, 17, 2, '12:12');
INSERT INTO Bestellung VALUES (58, 22, 17, 1, '12:02');
INSERT INTO Bestellung VALUES (59, 2, 17, 3, '12:53');
INSERT INTO Bestellung VALUES (60, 3, 18, 2, '11:48');
INSERT INTO Bestellung VALUES (61, 9, 18, 1, '12:47');
INSERT INTO Bestellung VALUES (62, 39, 18, 1, '12:22');
INSERT INTO Bestellung VALUES (63, 17, 18, 2, '13:16');
INSERT INTO Bestellung VALUES (64, 4, 18, 1, '11:46');
INSERT INTO Bestellung VALUES (65, 29, 18, 1, NULL);
INSERT INTO Bestellung VALUES (66, 32, 18, 1, '12:08');
INSERT INTO Bestellung VALUES (67, 10, 18, 1, NULL);
INSERT INTO Bestellung VALUES (68, 37, 19, 2, '12:34');
INSERT INTO Bestellung VALUES (69, 30, 19, 2, '12:30');
INSERT INTO Bestellung VALUES (70, 27, 20, 2, '13:30');
INSERT INTO Bestellung VALUES (71, 38, 20, 2, '13:38');
INSERT INTO Bestellung VALUES (72, 16, 20, 2, '12:39');
INSERT INTO Bestellung VALUES (73, 22, 20, 1, '13:00');
INSERT INTO Bestellung VALUES (74, 17, 20, 2, '11:41');
INSERT INTO Bestellung VALUES (75, 36, 21, 1, '13:09');
INSERT INTO Bestellung VALUES (76, 13, 21, 1, '12:45');
INSERT INTO Bestellung VALUES (77, 16, 21, 1, NULL);
INSERT INTO Bestellung VALUES (78, 37, 21, 2, '12:04');
INSERT INTO Bestellung VALUES (79, 5, 21, 2, '12:10');
INSERT INTO Bestellung VALUES (80, 25, 21, 1, '12:39');
INSERT INTO Bestellung VALUES (81, 18, 22, 2, '12:00');
INSERT INTO Bestellung VALUES (82, 2, 22, 1, '12:33');
INSERT INTO Bestellung VALUES (83, 21, 23, 1, '12:54');
INSERT INTO Bestellung VALUES (84, 3, 23, 1, '12:51');
INSERT INTO Bestellung VALUES (85, 12, 23, 1, '12:09');
INSERT INTO Bestellung VALUES (86, 18, 23, 1, '12:04');
INSERT INTO Bestellung VALUES (87, 24, 23, 1, '12:07');
INSERT INTO Bestellung VALUES (88, 27, 23, 1, '13:14');
INSERT INTO Bestellung VALUES (89, 15, 23, 1, '13:35');
INSERT INTO Bestellung VALUES (90, 23, 23, 1, NULL);
INSERT INTO Bestellung VALUES (91, 11, 23, 1, '12:24');
INSERT INTO Bestellung VALUES (92, 15, 24, 1, '12:53');
INSERT INTO Bestellung VALUES (93, 29, 24, 1, '12:56');
INSERT INTO Bestellung VALUES (94, 26, 24, 1, '13:05');
INSERT INTO Bestellung VALUES (95, 6, 24, 2, '11:46');
INSERT INTO Bestellung VALUES (96, 32, 24, 2, NULL);
INSERT INTO Bestellung VALUES (97, 13, 24, 2, '11:56');
INSERT INTO Bestellung VALUES (98, 7, 25, 2, NULL);
INSERT INTO Bestellung VALUES (99, 16, 25, 2, '11:55');
INSERT INTO Bestellung VALUES (100, 4, 25, 1, '12:31');
INSERT INTO Bestellung VALUES (101, 2, 25, 1, '12:01');
INSERT INTO Bestellung VALUES (102, 23, 26, 1, '11:46');
INSERT INTO Bestellung VALUES (103, 24, 26, 1, '12:49');
INSERT INTO Bestellung VALUES (104, 17, 26, 1, '12:48');
INSERT INTO Bestellung VALUES (105, 13, 26, 3, NULL);
INSERT INTO Bestellung VALUES (106, 8, 26, 1, '13:15');
INSERT INTO Bestellung VALUES (107, 27, 26, 1, '13:09');
INSERT INTO Bestellung VALUES (108, 10, 26, 1, '11:48');
INSERT INTO Bestellung VALUES (109, 15, 26, 1, '12:23');
INSERT INTO Bestellung VALUES (110, 26, 27, 1, '12:35');
INSERT INTO Bestellung VALUES (111, 14, 27, 2, '13:20');
INSERT INTO Bestellung VALUES (112, 18, 27, 2, '12:48');
INSERT INTO Bestellung VALUES (113, 24, 27, 3, '12:48');
INSERT INTO Bestellung VALUES (114, 22, 27, 3, '12:34');
INSERT INTO Bestellung VALUES (115, 13, 28, 2, '12:58');
INSERT INTO Bestellung VALUES (116, 17, 28, 1, '13:35');
INSERT INTO Bestellung VALUES (117, 37, 28, 1, '13:13');
INSERT INTO Bestellung VALUES (118, 39, 29, 3, '11:56');
INSERT INTO Bestellung VALUES (119, 14, 29, 1, '12:35');
INSERT INTO Bestellung VALUES (120, 11, 29, 1, '12:01');
INSERT INTO Bestellung VALUES (121, 19, 29, 1, '12:26');
INSERT INTO Bestellung VALUES (122, 34, 29, 1, '13:15');
INSERT INTO Bestellung VALUES (123, 29, 29, 1, '12:48');
INSERT INTO Bestellung VALUES (124, 31, 30, 1, '12:00');
INSERT INTO Bestellung VALUES (125, 24, 30, 1, '12:01');
INSERT INTO Bestellung VALUES (126, 10, 30, 2, '12:01');
INSERT INTO Bestellung VALUES (127, 7, 30, 2, '12:29');
INSERT INTO Bestellung VALUES (128, 34, 30, 2, '13:05');
INSERT INTO Bestellung VALUES (129, 5, 31, 3, '13:27');
INSERT INTO Bestellung VALUES (130, 14, 31, 2, '13:25');
INSERT INTO Bestellung VALUES (131, 10, 32, 1, '12:03');
INSERT INTO Bestellung VALUES (132, 14, 32, 1, '12:33');
INSERT INTO Bestellung VALUES (133, 7, 32, 1, NULL);
INSERT INTO Bestellung VALUES (134, 2, 32, 1, '13:08');
INSERT INTO Bestellung VALUES (135, 29, 32, 1, '13:01');
INSERT INTO Bestellung VALUES (136, 9, 32, 2, '13:35');
INSERT INTO Bestellung VALUES (137, 34, 32, 1, '13:09');
INSERT INTO Bestellung VALUES (138, 23, 32, 1, '12:25');
INSERT INTO Bestellung VALUES (139, 12, 32, 1, '13:12');
INSERT INTO Bestellung VALUES (140, 4, 32, 1, '12:00');
INSERT INTO Bestellung VALUES (141, 20, 33, 1, '12:14');
INSERT INTO Bestellung VALUES (142, 24, 33, 1, '13:29');
INSERT INTO Bestellung VALUES (143, 25, 33, 1, NULL);
INSERT INTO Bestellung VALUES (144, 36, 33, 1, '12:31');
INSERT INTO Bestellung VALUES (145, 33, 33, 1, '11:40');
INSERT INTO Bestellung VALUES (146, 22, 33, 2, '13:33');
INSERT INTO Bestellung VALUES (147, 1, 34, 1, '13:13');
INSERT INTO Bestellung VALUES (148, 20, 34, 1, '12:02');
INSERT INTO Bestellung VALUES (149, 39, 34, 2, '13:03');
INSERT INTO Bestellung VALUES (150, 5, 35, 1, '13:15');
INSERT INTO Bestellung VALUES (151, 23, 35, 2, '12:07');
INSERT INTO Bestellung VALUES (152, 37, 35, 1, '11:49');
INSERT INTO Bestellung VALUES (153, 36, 35, 1, '12:12');
INSERT INTO Bestellung VALUES (154, 8, 35, 3, '12:18');
INSERT INTO Bestellung VALUES (155, 4, 35, 3, '13:04');
INSERT INTO Bestellung VALUES (156, 1, 36, 1, '12:49');
INSERT INTO Bestellung VALUES (157, 3, 36, 2, '13:25');
INSERT INTO Bestellung VALUES (158, 35, 36, 1, '12:42');
INSERT INTO Bestellung VALUES (159, 31, 36, 3, '12:39');
INSERT INTO Bestellung VALUES (160, 20, 36, 1, '13:39');
INSERT INTO Bestellung VALUES (161, 20, 37, 2, '12:50');
INSERT INTO Bestellung VALUES (162, 10, 37, 1, '12:08');
INSERT INTO Bestellung VALUES (163, 39, 37, 1, '13:01');
INSERT INTO Bestellung VALUES (164, 25, 38, 3, '12:48');
INSERT INTO Bestellung VALUES (165, 2, 38, 1, '13:20');
INSERT INTO Bestellung VALUES (166, 9, 38, 3, '12:01');
INSERT INTO Bestellung VALUES (167, 11, 38, 3, NULL);
INSERT INTO Bestellung VALUES (168, 19, 39, 2, NULL);
INSERT INTO Bestellung VALUES (169, 36, 39, 1, NULL);
INSERT INTO Bestellung VALUES (170, 18, 39, 1, '13:01');
INSERT INTO Bestellung VALUES (171, 31, 39, 1, '13:21');
INSERT INTO Bestellung VALUES (172, 32, 39, 1, '12:15');
INSERT INTO Bestellung VALUES (173, 30, 39, 1, NULL);
INSERT INTO Bestellung VALUES (174, 3, 39, 2, '11:51');
INSERT INTO Bestellung VALUES (175, 9, 40, 1, '12:21');
INSERT INTO Bestellung VALUES (176, 27, 40, 2, '13:22');
INSERT INTO Bestellung VALUES (177, 22, 40, 1, '12:49');
INSERT INTO Bestellung VALUES (178, 28, 40, 1, '11:49');
INSERT INTO Bestellung VALUES (179, 16, 40, 1, '12:24');
INSERT INTO Bestellung VALUES (180, 9, 41, 2, '12:13');
INSERT INTO Bestellung VALUES (181, 32, 41, 1, '12:38');
INSERT INTO Bestellung VALUES (182, 16, 41, 1, '11:42');
INSERT INTO Bestellung VALUES (183, 19, 41, 1, '13:21');
INSERT INTO Bestellung VALUES (184, 20, 41, 3, '12:01');
INSERT INTO Bestellung VALUES (185, 34, 41, 2, '12:43');
INSERT INTO Bestellung VALUES (186, 25, 41, 1, '12:18');
INSERT INTO Bestellung VALUES (187, 23, 41, 1, '12:55');
INSERT INTO Bestellung VALUES (188, 26, 41, 1, '11:51');
INSERT INTO Bestellung VALUES (189, 15, 41, 1, '13:32');
INSERT INTO Bestellung VALUES (190, 29, 42, 3, '13:30');
INSERT INTO Bestellung VALUES (191, 12, 42, 3, '12:44');
INSERT INTO Bestellung VALUES (192, 21, 42, 2, '13:05');
INSERT INTO Bestellung VALUES (193, 25, 43, 1, NULL);
INSERT INTO Bestellung VALUES (194, 30, 43, 2, NULL);
INSERT INTO Bestellung VALUES (195, 8, 43, 1, '12:53');
INSERT INTO Bestellung VALUES (196, 11, 43, 1, '12:20');
INSERT INTO Bestellung VALUES (197, 18, 44, 1, '12:37');
INSERT INTO Bestellung VALUES (198, 38, 44, 2, '13:35');
INSERT INTO Bestellung VALUES (199, 31, 44, 1, '11:41');
INSERT INTO Bestellung VALUES (200, 8, 44, 1, '12:04');
INSERT INTO Bestellung VALUES (201, 34, 44, 1, NULL);
INSERT INTO Bestellung VALUES (202, 9, 45, 1, NULL);
INSERT INTO Bestellung VALUES (203, 26, 45, 1, '13:11');
INSERT INTO Bestellung VALUES (204, 6, 45, 1, '11:58');
INSERT INTO Bestellung VALUES (205, 17, 45, 1, '11:55');
INSERT INTO Bestellung VALUES (206, 14, 45, 1, '13:01');
INSERT INTO Bestellung VALUES (207, 36, 45, 1, '12:35');
INSERT INTO Bestellung VALUES (208, 30, 45, 1, '11:51');
INSERT INTO Bestellung VALUES (209, 6, 45, 1, '13:30');
INSERT INTO Bestellung VALUES (210, 31, 45, 1, '12:39');
INSERT INTO Bestellung VALUES (211, 8, 45, 1, '12:48');
INSERT INTO Bestellung VALUES (212, 28, 46, 2, '12:31');
INSERT INTO Bestellung VALUES (213, 7, 46, 2, '13:06');
INSERT INTO Bestellung VALUES (214, 14, 46, 1, '13:02');
INSERT INTO Bestellung VALUES (215, 16, 46, 1, '13:36');
INSERT INTO Bestellung VALUES (216, 17, 46, 1, '12:02');
INSERT INTO Bestellung VALUES (217, 33, 47, 2, '12:54');
INSERT INTO Bestellung VALUES (218, 17, 48, 2, '13:36');
INSERT INTO Bestellung VALUES (219, 26, 48, 1, '12:15');
INSERT INTO Bestellung VALUES (220, 23, 48, 1, NULL);
INSERT INTO Bestellung VALUES (221, 22, 48, 1, '11:48');
INSERT INTO Bestellung VALUES (222, 12, 48, 2, '11:51');
INSERT INTO Bestellung VALUES (223, 2, 48, 1, '12:37');
INSERT INTO Bestellung VALUES (224, 28, 48, 1, '12:13');
INSERT INTO Bestellung VALUES (225, 30, 49, 1, NULL);
INSERT INTO Bestellung VALUES (226, 25, 49, 1, '13:09');
INSERT INTO Bestellung VALUES (227, 32, 49, 3, '11:43');
INSERT INTO Bestellung VALUES (228, 16, 49, 2, '13:05');
INSERT INTO Bestellung VALUES (229, 36, 49, 1, '11:52');
INSERT INTO Bestellung VALUES (230, 22, 49, 1, '12:49');
INSERT INTO Bestellung VALUES (231, 10, 50, 1, '12:52');
INSERT INTO Bestellung VALUES (232, 38, 50, 1, '13:27');
INSERT INTO Bestellung VALUES (233, 33, 50, 1, '13:15');
INSERT INTO Bestellung VALUES (234, 1, 50, 1, '12:29');
INSERT INTO Bestellung VALUES (235, 3, 51, 1, '13:21');
INSERT INTO Bestellung VALUES (236, 31, 51, 1, '12:34');
INSERT INTO Bestellung VALUES (237, 15, 51, 1, '13:12');
INSERT INTO Bestellung VALUES (238, 17, 51, 1, '12:48');
INSERT INTO Bestellung VALUES (239, 5, 51, 2, '12:40');
INSERT INTO Bestellung VALUES (240, 35, 51, 1, '12:42');
INSERT INTO Bestellung VALUES (241, 18, 51, 1, '13:17');
INSERT INTO Bestellung VALUES (242, 23, 51, 1, '13:10');
INSERT INTO Bestellung VALUES (243, 28, 52, 1, '12:46');
INSERT INTO Bestellung VALUES (244, 12, 52, 1, '12:35');
INSERT INTO Bestellung VALUES (245, 38, 52, 1, '12:25');
INSERT INTO Bestellung VALUES (246, 34, 52, 1, '12:14');
INSERT INTO Bestellung VALUES (247, 19, 52, 1, '12:55');
INSERT INTO Bestellung VALUES (248, 33, 52, 1, '13:34');
INSERT INTO Bestellung VALUES (249, 17, 53, 1, '12:34');
INSERT INTO Bestellung VALUES (250, 5, 53, 1, '13:05');
INSERT INTO Bestellung VALUES (251, 11, 53, 1, '11:41');
INSERT INTO Bestellung VALUES (252, 21, 53, 1, '13:23');
INSERT INTO Bestellung VALUES (253, 7, 53, 1, NULL);
INSERT INTO Bestellung VALUES (254, 24, 54, 1, '12:54');
INSERT INTO Bestellung VALUES (255, 39, 54, 2, '11:42');
INSERT INTO Bestellung VALUES (256, 2, 54, 1, '12:41');
INSERT INTO Bestellung VALUES (257, 31, 54, 1, '12:47');
INSERT INTO Bestellung VALUES (258, 30, 54, 1, '12:15');
INSERT INTO Bestellung VALUES (259, 3, 54, 2, '13:03');
INSERT INTO Bestellung VALUES (260, 1, 55, 3, '12:20');
INSERT INTO Bestellung VALUES (261, 11, 55, 3, '13:36');
INSERT INTO Bestellung VALUES (262, 19, 56, 2, '13:05');
INSERT INTO Bestellung VALUES (263, 4, 56, 2, '13:37');
INSERT INTO Bestellung VALUES (264, 17, 57, 1, '12:13');
INSERT INTO Bestellung VALUES (265, 2, 57, 2, '13:22');
INSERT INTO Bestellung VALUES (266, 33, 57, 1, '13:30');
INSERT INTO Bestellung VALUES (267, 8, 57, 3, '11:57');
INSERT INTO Bestellung VALUES (268, 14, 57, 2, '12:48');
INSERT INTO Bestellung VALUES (269, 6, 58, 2, '12:09');
INSERT INTO Bestellung VALUES (270, 25, 58, 3, '11:55');
INSERT INTO Bestellung VALUES (271, 30, 58, 2, NULL);
INSERT INTO Bestellung VALUES (272, 29, 58, 3, '12:06');
INSERT INTO Bestellung VALUES (273, 4, 59, 2, '13:37');
INSERT INTO Bestellung VALUES (274, 3, 59, 1, '13:10');
INSERT INTO Bestellung VALUES (275, 20, 59, 1, '12:27');
INSERT INTO Bestellung VALUES (276, 6, 60, 2, '13:15');
INSERT INTO Bestellung VALUES (277, 14, 60, 1, '12:35');
INSERT INTO Bestellung VALUES (278, 18, 60, 1, '12:30');
INSERT INTO Bestellung VALUES (279, 25, 60, 2, '12:36');
INSERT INTO Bestellung VALUES (280, 15, 60, 1, '11:49');
INSERT INTO Bestellung VALUES (281, 3, 60, 1, '12:06');
INSERT INTO Bestellung VALUES (282, 32, 60, 2, NULL);
INSERT INTO Bestellung VALUES (283, 34, 61, 1, '12:09');
INSERT INTO Bestellung VALUES (284, 36, 61, 3, '13:36');
INSERT INTO Bestellung VALUES (285, 38, 61, 2, '13:32');
INSERT INTO Bestellung VALUES (286, 25, 62, 1, '11:43');
INSERT INTO Bestellung VALUES (287, 10, 62, 2, '12:22');
INSERT INTO Bestellung VALUES (288, 13, 63, 1, '12:39');
INSERT INTO Bestellung VALUES (289, 5, 63, 3, '11:52');
INSERT INTO Bestellung VALUES (290, 24, 63, 3, '11:46');
INSERT INTO Bestellung VALUES (291, 1, 63, 3, '12:36');
INSERT INTO Bestellung VALUES (292, 19, 64, 1, NULL);
INSERT INTO Bestellung VALUES (293, 28, 64, 1, '13:11');
INSERT INTO Bestellung VALUES (294, 32, 64, 2, '13:10');
INSERT INTO Bestellung VALUES (295, 35, 64, 1, '11:42');
INSERT INTO Bestellung VALUES (296, 27, 64, 3, '12:14');
INSERT INTO Bestellung VALUES (297, 8, 64, 1, NULL);
INSERT INTO Bestellung VALUES (298, 9, 64, 1, NULL);
INSERT INTO Bestellung VALUES (299, 33, 65, 1, '13:26');
INSERT INTO Bestellung VALUES (300, 9, 65, 1, '11:59');
INSERT INTO Bestellung VALUES (301, 1, 65, 2, '12:54');
INSERT INTO Bestellung VALUES (302, 3, 66, 1, '12:14');
INSERT INTO Bestellung VALUES (303, 12, 66, 1, '12:38');
INSERT INTO Bestellung VALUES (304, 26, 66, 1, '13:02');
INSERT INTO Bestellung VALUES (305, 38, 66, 2, '13:27');
INSERT INTO Bestellung VALUES (306, 1, 66, 1, '12:59');
INSERT INTO Bestellung VALUES (307, 10, 66, 1, '12:37');
INSERT INTO Bestellung VALUES (308, 13, 66, 2, '12:33');
INSERT INTO Bestellung VALUES (309, 21, 66, 1, '12:23');
INSERT INTO Bestellung VALUES (310, 8, 67, 1, '13:35');
INSERT INTO Bestellung VALUES (311, 20, 67, 1, '13:16');
INSERT INTO Bestellung VALUES (312, 19, 67, 1, NULL);
INSERT INTO Bestellung VALUES (313, 32, 67, 2, '13:04');
INSERT INTO Bestellung VALUES (314, 6, 67, 1, '12:02');
INSERT INTO Bestellung VALUES (315, 7, 67, 1, '11:45');
INSERT INTO Bestellung VALUES (316, 17, 67, 2, '12:13');
INSERT INTO Bestellung VALUES (317, 9, 68, 2, '12:11');
INSERT INTO Bestellung VALUES (318, 27, 68, 1, '12:08');
INSERT INTO Bestellung VALUES (319, 1, 68, 1, '11:44');

-- Kuechenkraft: 5 Zeilen
INSERT INTO Kuechenkraft VALUES (1, 'Hilke', 'Tiemann');
INSERT INTO Kuechenkraft VALUES (2, 'Ulf', 'Bargmann');
INSERT INTO Kuechenkraft VALUES (3, 'Deniz', 'Akgül');
INSERT INTO Kuechenkraft VALUES (4, 'Marit', 'Schwarting');
INSERT INTO Kuechenkraft VALUES (5, 'Okke', 'Habben');

-- bereitetZu: 112 Zeilen
INSERT INTO bereitetZu VALUES (1, 1);
INSERT INTO bereitetZu VALUES (1, 3);
INSERT INTO bereitetZu VALUES (1, 4);
INSERT INTO bereitetZu VALUES (1, 7);
INSERT INTO bereitetZu VALUES (1, 11);
INSERT INTO bereitetZu VALUES (1, 14);
INSERT INTO bereitetZu VALUES (1, 15);
INSERT INTO bereitetZu VALUES (1, 18);
INSERT INTO bereitetZu VALUES (1, 20);
INSERT INTO bereitetZu VALUES (1, 21);
INSERT INTO bereitetZu VALUES (1, 24);
INSERT INTO bereitetZu VALUES (1, 29);
INSERT INTO bereitetZu VALUES (1, 31);
INSERT INTO bereitetZu VALUES (1, 38);
INSERT INTO bereitetZu VALUES (1, 39);
INSERT INTO bereitetZu VALUES (1, 46);
INSERT INTO bereitetZu VALUES (1, 49);
INSERT INTO bereitetZu VALUES (1, 51);
INSERT INTO bereitetZu VALUES (1, 53);
INSERT INTO bereitetZu VALUES (1, 57);
INSERT INTO bereitetZu VALUES (1, 60);
INSERT INTO bereitetZu VALUES (1, 61);
INSERT INTO bereitetZu VALUES (2, 5);
INSERT INTO bereitetZu VALUES (2, 9);
INSERT INTO bereitetZu VALUES (2, 12);
INSERT INTO bereitetZu VALUES (2, 19);
INSERT INTO bereitetZu VALUES (2, 21);
INSERT INTO bereitetZu VALUES (2, 23);
INSERT INTO bereitetZu VALUES (2, 26);
INSERT INTO bereitetZu VALUES (2, 30);
INSERT INTO bereitetZu VALUES (2, 33);
INSERT INTO bereitetZu VALUES (2, 35);
INSERT INTO bereitetZu VALUES (2, 36);
INSERT INTO bereitetZu VALUES (2, 38);
INSERT INTO bereitetZu VALUES (2, 39);
INSERT INTO bereitetZu VALUES (2, 45);
INSERT INTO bereitetZu VALUES (2, 47);
INSERT INTO bereitetZu VALUES (2, 50);
INSERT INTO bereitetZu VALUES (2, 57);
INSERT INTO bereitetZu VALUES (2, 60);
INSERT INTO bereitetZu VALUES (2, 64);
INSERT INTO bereitetZu VALUES (3, 3);
INSERT INTO bereitetZu VALUES (3, 6);
INSERT INTO bereitetZu VALUES (3, 7);
INSERT INTO bereitetZu VALUES (3, 8);
INSERT INTO bereitetZu VALUES (3, 12);
INSERT INTO bereitetZu VALUES (3, 15);
INSERT INTO bereitetZu VALUES (3, 16);
INSERT INTO bereitetZu VALUES (3, 17);
INSERT INTO bereitetZu VALUES (3, 20);
INSERT INTO bereitetZu VALUES (3, 22);
INSERT INTO bereitetZu VALUES (3, 25);
INSERT INTO bereitetZu VALUES (3, 27);
INSERT INTO bereitetZu VALUES (3, 32);
INSERT INTO bereitetZu VALUES (3, 33);
INSERT INTO bereitetZu VALUES (3, 40);
INSERT INTO bereitetZu VALUES (3, 41);
INSERT INTO bereitetZu VALUES (3, 42);
INSERT INTO bereitetZu VALUES (3, 45);
INSERT INTO bereitetZu VALUES (3, 55);
INSERT INTO bereitetZu VALUES (3, 58);
INSERT INTO bereitetZu VALUES (3, 62);
INSERT INTO bereitetZu VALUES (3, 63);
INSERT INTO bereitetZu VALUES (3, 64);
INSERT INTO bereitetZu VALUES (3, 66);
INSERT INTO bereitetZu VALUES (3, 67);
INSERT INTO bereitetZu VALUES (4, 2);
INSERT INTO bereitetZu VALUES (4, 5);
INSERT INTO bereitetZu VALUES (4, 8);
INSERT INTO bereitetZu VALUES (4, 9);
INSERT INTO bereitetZu VALUES (4, 14);
INSERT INTO bereitetZu VALUES (4, 17);
INSERT INTO bereitetZu VALUES (4, 18);
INSERT INTO bereitetZu VALUES (4, 23);
INSERT INTO bereitetZu VALUES (4, 26);
INSERT INTO bereitetZu VALUES (4, 34);
INSERT INTO bereitetZu VALUES (4, 35);
INSERT INTO bereitetZu VALUES (4, 42);
INSERT INTO bereitetZu VALUES (4, 44);
INSERT INTO bereitetZu VALUES (4, 46);
INSERT INTO bereitetZu VALUES (4, 48);
INSERT INTO bereitetZu VALUES (4, 49);
INSERT INTO bereitetZu VALUES (4, 51);
INSERT INTO bereitetZu VALUES (4, 52);
INSERT INTO bereitetZu VALUES (4, 54);
INSERT INTO bereitetZu VALUES (4, 55);
INSERT INTO bereitetZu VALUES (4, 56);
INSERT INTO bereitetZu VALUES (4, 58);
INSERT INTO bereitetZu VALUES (4, 59);
INSERT INTO bereitetZu VALUES (4, 66);
INSERT INTO bereitetZu VALUES (4, 68);
INSERT INTO bereitetZu VALUES (5, 1);
INSERT INTO bereitetZu VALUES (5, 10);
INSERT INTO bereitetZu VALUES (5, 11);
INSERT INTO bereitetZu VALUES (5, 13);
INSERT INTO bereitetZu VALUES (5, 24);
INSERT INTO bereitetZu VALUES (5, 27);
INSERT INTO bereitetZu VALUES (5, 28);
INSERT INTO bereitetZu VALUES (5, 29);
INSERT INTO bereitetZu VALUES (5, 30);
INSERT INTO bereitetZu VALUES (5, 32);
INSERT INTO bereitetZu VALUES (5, 36);
INSERT INTO bereitetZu VALUES (5, 37);
INSERT INTO bereitetZu VALUES (5, 41);
INSERT INTO bereitetZu VALUES (5, 43);
INSERT INTO bereitetZu VALUES (5, 48);
INSERT INTO bereitetZu VALUES (5, 52);
INSERT INTO bereitetZu VALUES (5, 54);
INSERT INTO bereitetZu VALUES (5, 61);
INSERT INTO bereitetZu VALUES (5, 63);
INSERT INTO bereitetZu VALUES (5, 65);
INSERT INTO bereitetZu VALUES (5, 67);

-- BestellUebersicht: 16 Zeilen
INSERT INTO BestellUebersicht VALUES (202, 9, 'Hilke Akgül', '9a', '2027-03-16', 'Hähnchen-Curry mit Reis', 4.75, 1);
INSERT INTO BestellUebersicht VALUES (203, 26, 'Nele Döscher', '5c', '2027-03-16', 'Hähnchen-Curry mit Reis', 4.75, 1);
INSERT INTO BestellUebersicht VALUES (204, 6, 'Arne Demir', '5c', '2027-03-16', 'Hähnchen-Curry mit Reis', 4.75, 1);
INSERT INTO BestellUebersicht VALUES (205, 17, 'Ida Eggers', '8b', '2027-03-16', 'Hähnchen-Curry mit Reis', 4.75, 1);
INSERT INTO BestellUebersicht VALUES (206, 14, 'Insa Gerdts', '10b', '2027-03-16', 'Hähnchen-Curry mit Reis', 4.75, 1);
INSERT INTO BestellUebersicht VALUES (207, 36, 'Dana Eggers', NULL, '2027-03-16', 'Hähnchen-Curry mit Reis', 4.75, 1);
INSERT INTO BestellUebersicht VALUES (208, 30, 'Ole Lindemann', '10b', '2027-03-16', 'Hähnchen-Curry mit Reis', 4.75, 1);
INSERT INTO BestellUebersicht VALUES (209, 6, 'Arne Demir', '5c', '2027-03-16', 'Hähnchen-Curry mit Reis', 4.75, 1);
INSERT INTO BestellUebersicht VALUES (210, 31, 'Jannik Dirksen', '7c', '2027-03-16', 'Hähnchen-Curry mit Reis', 4.75, 1);
INSERT INTO BestellUebersicht VALUES (211, 8, 'Karla Siemers', '5c', '2027-03-16', 'Hähnchen-Curry mit Reis', 4.75, 1);
INSERT INTO BestellUebersicht VALUES (212, 28, 'Taalke Bargmann', '9c', '2027-03-16', 'Chili sin Carne', 3.5, 2);
INSERT INTO BestellUebersicht VALUES (213, 7, 'Pia Fehrmann', '5c', '2027-03-16', 'Chili sin Carne', 3.5, 2);
INSERT INTO BestellUebersicht VALUES (214, 14, 'Insa Gerdts', '10c', '2027-03-16', 'Chili sin Carne', 3.5, 1);
INSERT INTO BestellUebersicht VALUES (215, 16, 'Clara Pundt', '9a', '2027-03-16', 'Chili sin Carne', 3.5, 1);
INSERT INTO BestellUebersicht VALUES (216, 17, 'Ida Eggers', '8b', '2027-03-16', 'Chili sin Carne', 3.25, 1);
INSERT INTO BestellUebersicht VALUES (217, 33, 'Ida Bultjer', NULL, '2027-03-16', 'Tomatensuppe', 2.25, 2);

COMMIT;
