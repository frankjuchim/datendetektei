-- =====================================================================
-- Datendetektei Weserstedt · basis.sql der Übungsdatenbank „verhoer/kiosk“
-- ERZEUGT von scripts/db_bauen.js (npm run db) – nicht von Hand ändern.
-- Datenbank: verhoer/kiosk
-- Seed: datendetektei:verhoer/kiosk:v1 (FNV-1a 0x78fdaa80) – kuratiert, kein Generator
-- Version: 1
-- SHA-256 (Datenteil): b498085c21a08bea35b77e005387f0000cc5b843cd43f9a5474531c537749ec9
-- =====================================================================

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

-- ===== Daten (erzeugt) =====
BEGIN;
PRAGMA defer_foreign_keys = ON;

-- Produkt: 14 Zeilen
INSERT INTO Produkt VALUES (1, 'Käsebrötchen', 'Brötchen', 1.5);
INSERT INTO Produkt VALUES (2, 'Salamibrötchen', 'Brötchen', 1.75);
INSERT INTO Produkt VALUES (3, 'Laugenbrezel', 'Brötchen', 1.25);
INSERT INTO Produkt VALUES (4, 'Vollkornbrötchen mit Ei', 'Brötchen', 2.0);
INSERT INTO Produkt VALUES (5, 'Wasser 0,5 l', 'Getränk', 0.75);
INSERT INTO Produkt VALUES (6, 'Apfelschorle 0,5 l', 'Getränk', 1.25);
INSERT INTO Produkt VALUES (7, 'Kakao 0,25 l', 'Getränk', 1.0);
INSERT INTO Produkt VALUES (8, 'Eistee 0,5 l', 'Getränk', 1.25);
INSERT INTO Produkt VALUES (9, 'Müsliriegel', 'Snack', 1.0);
INSERT INTO Produkt VALUES (10, 'Muffin', 'Snack', 1.5);
INSERT INTO Produkt VALUES (11, 'Pizzaschnecke', 'Snack', 2.0);
INSERT INTO Produkt VALUES (12, 'Apfel', 'Obst', 0.5);
INSERT INTO Produkt VALUES (13, 'Banane', 'Obst', 0.5);
INSERT INTO Produkt VALUES (14, 'Obstbecher', 'Obst', 1.75);

-- Helfer: 10 Zeilen
INSERT INTO Helfer VALUES (1, 'Jule', 'Kahrs', '8b');
INSERT INTO Helfer VALUES (2, 'Jule', 'Kahrs', '10a');
INSERT INTO Helfer VALUES (3, 'Mats', 'Glander', '9c');
INSERT INTO Helfer VALUES (4, 'Lale', 'Demir', '10a');
INSERT INTO Helfer VALUES (5, 'Rune', 'Hinners', '8b');
INSERT INTO Helfer VALUES (6, 'Svea', 'Lienemann', '9a');
INSERT INTO Helfer VALUES (7, 'Jarne', 'Bohlken', '10b');
INSERT INTO Helfer VALUES (8, 'Nika', 'Petrović', '9c');
INSERT INTO Helfer VALUES (9, 'Tjark', 'Siemers', '8a');
INSERT INTO Helfer VALUES (10, 'Ella', 'Hemmen', '10b');

-- Schicht: 20 Zeilen
INSERT INTO Schicht VALUES (1, 1, '2026-09-21', 1);
INSERT INTO Schicht VALUES (2, 3, '2026-09-21', 1);
INSERT INTO Schicht VALUES (3, 4, '2026-09-21', 2);
INSERT INTO Schicht VALUES (4, 5, '2026-09-21', 2);
INSERT INTO Schicht VALUES (5, 6, '2026-09-22', 1);
INSERT INTO Schicht VALUES (6, 7, '2026-09-22', 1);
INSERT INTO Schicht VALUES (7, 8, '2026-09-22', 2);
INSERT INTO Schicht VALUES (8, 9, '2026-09-22', 2);
INSERT INTO Schicht VALUES (9, 10, '2026-09-23', 1);
INSERT INTO Schicht VALUES (10, 2, '2026-09-23', 1);
INSERT INTO Schicht VALUES (11, 3, '2026-09-23', 2);
INSERT INTO Schicht VALUES (12, 7, '2026-09-23', 2);
INSERT INTO Schicht VALUES (13, 5, '2026-09-24', 1);
INSERT INTO Schicht VALUES (14, 6, '2026-09-24', 1);
INSERT INTO Schicht VALUES (15, 4, '2026-09-24', 2);
INSERT INTO Schicht VALUES (16, 8, '2026-09-24', 2);
INSERT INTO Schicht VALUES (17, 9, '2026-09-25', 1);
INSERT INTO Schicht VALUES (18, 10, '2026-09-25', 1);
INSERT INTO Schicht VALUES (19, 1, '2026-09-25', 2);
INSERT INTO Schicht VALUES (20, 2, '2026-09-25', 2);

-- Verkauf: 120 Zeilen
INSERT INTO Verkauf VALUES (1, 1, '2026-09-21 09:31', 'bar');
INSERT INTO Verkauf VALUES (2, 2, '2026-09-21 09:31', 'bar');
INSERT INTO Verkauf VALUES (3, 2, '2026-09-21 09:33', 'Karte');
INSERT INTO Verkauf VALUES (4, 1, '2026-09-21 09:34', 'bar');
INSERT INTO Verkauf VALUES (5, 2, '2026-09-21 09:35', 'Karte');
INSERT INTO Verkauf VALUES (6, 1, '2026-09-21 09:38', 'Karte');
INSERT INTO Verkauf VALUES (7, 2, '2026-09-21 09:38', 'bar');
INSERT INTO Verkauf VALUES (8, 2, '2026-09-21 09:40', 'Karte');
INSERT INTO Verkauf VALUES (9, 1, '2026-09-21 09:42', 'Karte');
INSERT INTO Verkauf VALUES (10, 2, '2026-09-21 09:42', 'bar');
INSERT INTO Verkauf VALUES (11, 2, '2026-09-21 09:45', 'Karte');
INSERT INTO Verkauf VALUES (12, 1, '2026-09-21 09:46', 'bar');
INSERT INTO Verkauf VALUES (13, 2, '2026-09-21 09:47', 'Karte');
INSERT INTO Verkauf VALUES (14, 3, '2026-09-21 11:15', 'bar');
INSERT INTO Verkauf VALUES (15, 4, '2026-09-21 11:16', 'bar');
INSERT INTO Verkauf VALUES (16, 3, '2026-09-21 11:18', 'bar');
INSERT INTO Verkauf VALUES (17, 4, '2026-09-21 11:19', 'bar');
INSERT INTO Verkauf VALUES (18, 3, '2026-09-21 11:21', 'bar');
INSERT INTO Verkauf VALUES (19, 4, '2026-09-21 11:23', 'bar');
INSERT INTO Verkauf VALUES (20, 3, '2026-09-21 11:24', 'Karte');
INSERT INTO Verkauf VALUES (21, 3, '2026-09-21 11:27', 'bar');
INSERT INTO Verkauf VALUES (22, 4, '2026-09-21 11:27', 'Karte');
INSERT INTO Verkauf VALUES (23, 3, '2026-09-21 11:30', 'bar');
INSERT INTO Verkauf VALUES (24, 4, '2026-09-21 11:31', 'bar');
INSERT INTO Verkauf VALUES (25, 5, '2026-09-22 09:30', 'bar');
INSERT INTO Verkauf VALUES (26, 6, '2026-09-22 09:31', 'Karte');
INSERT INTO Verkauf VALUES (27, 5, '2026-09-22 09:33', 'bar');
INSERT INTO Verkauf VALUES (28, 6, '2026-09-22 09:33', 'Karte');
INSERT INTO Verkauf VALUES (29, 6, '2026-09-22 09:35', 'bar');
INSERT INTO Verkauf VALUES (30, 5, '2026-09-22 09:37', 'Karte');
INSERT INTO Verkauf VALUES (31, 6, '2026-09-22 09:38', 'Karte');
INSERT INTO Verkauf VALUES (32, 6, '2026-09-22 09:40', 'Karte');
INSERT INTO Verkauf VALUES (33, 5, '2026-09-22 09:41', 'bar');
INSERT INTO Verkauf VALUES (34, 6, '2026-09-22 09:42', 'bar');
INSERT INTO Verkauf VALUES (35, 5, '2026-09-22 09:45', 'Karte');
INSERT INTO Verkauf VALUES (36, 6, '2026-09-22 09:45', 'bar');
INSERT INTO Verkauf VALUES (37, 6, '2026-09-22 09:47', 'Karte');
INSERT INTO Verkauf VALUES (38, 7, '2026-09-22 11:15', 'bar');
INSERT INTO Verkauf VALUES (39, 8, '2026-09-22 11:16', 'bar');
INSERT INTO Verkauf VALUES (40, 7, '2026-09-22 11:18', 'bar');
INSERT INTO Verkauf VALUES (41, 8, '2026-09-22 11:19', 'Karte');
INSERT INTO Verkauf VALUES (42, 7, '2026-09-22 11:22', 'Karte');
INSERT INTO Verkauf VALUES (43, 8, '2026-09-22 11:23', 'Karte');
INSERT INTO Verkauf VALUES (44, 7, '2026-09-22 11:26', 'Karte');
INSERT INTO Verkauf VALUES (45, 8, '2026-09-22 11:27', 'bar');
INSERT INTO Verkauf VALUES (46, 7, '2026-09-22 11:30', 'Karte');
INSERT INTO Verkauf VALUES (47, 8, '2026-09-22 11:31', 'bar');
INSERT INTO Verkauf VALUES (48, 9, '2026-09-23 09:30', 'bar');
INSERT INTO Verkauf VALUES (49, 10, '2026-09-23 09:30', 'Karte');
INSERT INTO Verkauf VALUES (50, 9, '2026-09-23 09:32', 'Karte');
INSERT INTO Verkauf VALUES (51, 10, '2026-09-23 09:33', 'bar');
INSERT INTO Verkauf VALUES (52, 9, '2026-09-23 09:34', 'Karte');
INSERT INTO Verkauf VALUES (53, 9, '2026-09-23 09:37', 'bar');
INSERT INTO Verkauf VALUES (54, 10, '2026-09-23 09:37', 'Karte');
INSERT INTO Verkauf VALUES (55, 9, '2026-09-23 09:39', 'Karte');
INSERT INTO Verkauf VALUES (56, 9, '2026-09-23 09:41', 'bar');
INSERT INTO Verkauf VALUES (57, 10, '2026-09-23 09:41', 'Karte');
INSERT INTO Verkauf VALUES (58, 9, '2026-09-23 09:44', 'bar');
INSERT INTO Verkauf VALUES (59, 10, '2026-09-23 09:45', 'bar');
INSERT INTO Verkauf VALUES (60, 9, '2026-09-23 09:46', 'bar');
INSERT INTO Verkauf VALUES (61, 11, '2026-09-23 11:16', 'Karte');
INSERT INTO Verkauf VALUES (62, 12, '2026-09-23 11:16', 'bar');
INSERT INTO Verkauf VALUES (63, 11, '2026-09-23 11:18', 'bar');
INSERT INTO Verkauf VALUES (64, 12, '2026-09-23 11:18', 'Karte');
INSERT INTO Verkauf VALUES (65, 11, '2026-09-23 11:20', 'bar');
INSERT INTO Verkauf VALUES (66, 12, '2026-09-23 11:20', 'Karte');
INSERT INTO Verkauf VALUES (67, 11, '2026-09-23 11:23', 'Karte');
INSERT INTO Verkauf VALUES (68, 12, '2026-09-23 11:23', 'bar');
INSERT INTO Verkauf VALUES (69, 11, '2026-09-23 11:25', 'Karte');
INSERT INTO Verkauf VALUES (70, 12, '2026-09-23 11:25', 'bar');
INSERT INTO Verkauf VALUES (71, 11, '2026-09-23 11:27', 'bar');
INSERT INTO Verkauf VALUES (72, 12, '2026-09-23 11:27', 'bar');
INSERT INTO Verkauf VALUES (73, 11, '2026-09-23 11:30', 'Karte');
INSERT INTO Verkauf VALUES (74, 12, '2026-09-23 11:30', 'Karte');
INSERT INTO Verkauf VALUES (75, 11, '2026-09-23 11:32', 'bar');
INSERT INTO Verkauf VALUES (76, 12, '2026-09-23 11:32', 'bar');
INSERT INTO Verkauf VALUES (77, 14, '2026-09-24 09:30', 'bar');
INSERT INTO Verkauf VALUES (78, 13, '2026-09-24 09:31', 'bar');
INSERT INTO Verkauf VALUES (79, 14, '2026-09-24 09:33', 'Karte');
INSERT INTO Verkauf VALUES (80, 13, '2026-09-24 09:34', 'bar');
INSERT INTO Verkauf VALUES (81, 14, '2026-09-24 09:37', 'bar');
INSERT INTO Verkauf VALUES (82, 13, '2026-09-24 09:38', 'bar');
INSERT INTO Verkauf VALUES (83, 14, '2026-09-24 09:41', 'bar');
INSERT INTO Verkauf VALUES (84, 13, '2026-09-24 09:42', 'bar');
INSERT INTO Verkauf VALUES (85, 14, '2026-09-24 09:45', 'bar');
INSERT INTO Verkauf VALUES (86, 13, '2026-09-24 09:46', 'bar');
INSERT INTO Verkauf VALUES (87, 15, '2026-09-24 11:15', 'bar');
INSERT INTO Verkauf VALUES (88, 16, '2026-09-24 11:15', 'bar');
INSERT INTO Verkauf VALUES (89, 15, '2026-09-24 11:18', 'bar');
INSERT INTO Verkauf VALUES (90, 16, '2026-09-24 11:18', 'bar');
INSERT INTO Verkauf VALUES (91, 15, '2026-09-24 11:21', 'bar');
INSERT INTO Verkauf VALUES (92, 16, '2026-09-24 11:22', 'bar');
INSERT INTO Verkauf VALUES (93, 15, '2026-09-24 11:24', 'Karte');
INSERT INTO Verkauf VALUES (94, 16, '2026-09-24 11:26', 'bar');
INSERT INTO Verkauf VALUES (95, 15, '2026-09-24 11:27', 'bar');
INSERT INTO Verkauf VALUES (96, 15, '2026-09-24 11:30', 'Karte');
INSERT INTO Verkauf VALUES (97, 16, '2026-09-24 11:30', 'bar');
INSERT INTO Verkauf VALUES (98, 18, '2026-09-25 09:30', 'bar');
INSERT INTO Verkauf VALUES (99, 17, '2026-09-25 09:31', 'bar');
INSERT INTO Verkauf VALUES (100, 18, '2026-09-25 09:32', 'Karte');
INSERT INTO Verkauf VALUES (101, 17, '2026-09-25 09:34', 'Karte');
INSERT INTO Verkauf VALUES (102, 18, '2026-09-25 09:34', 'bar');
INSERT INTO Verkauf VALUES (103, 18, '2026-09-25 09:37', 'bar');
INSERT INTO Verkauf VALUES (104, 17, '2026-09-25 09:38', 'bar');
INSERT INTO Verkauf VALUES (105, 18, '2026-09-25 09:39', 'Karte');
INSERT INTO Verkauf VALUES (106, 18, '2026-09-25 09:41', 'bar');
INSERT INTO Verkauf VALUES (107, 17, '2026-09-25 09:42', 'Karte');
INSERT INTO Verkauf VALUES (108, 18, '2026-09-25 09:44', 'bar');
INSERT INTO Verkauf VALUES (109, 17, '2026-09-25 09:46', 'Karte');
INSERT INTO Verkauf VALUES (110, 18, '2026-09-25 09:46', 'bar');
INSERT INTO Verkauf VALUES (111, 20, '2026-09-25 11:15', 'bar');
INSERT INTO Verkauf VALUES (112, 19, '2026-09-25 11:16', 'Karte');
INSERT INTO Verkauf VALUES (113, 20, '2026-09-25 11:18', 'bar');
INSERT INTO Verkauf VALUES (114, 19, '2026-09-25 11:19', 'bar');
INSERT INTO Verkauf VALUES (115, 20, '2026-09-25 11:22', 'bar');
INSERT INTO Verkauf VALUES (116, 19, '2026-09-25 11:23', 'bar');
INSERT INTO Verkauf VALUES (117, 20, '2026-09-25 11:26', 'bar');
INSERT INTO Verkauf VALUES (118, 19, '2026-09-25 11:27', 'bar');
INSERT INTO Verkauf VALUES (119, 20, '2026-09-25 11:30', 'Karte');
INSERT INTO Verkauf VALUES (120, 19, '2026-09-25 11:31', 'bar');

-- Posten: 214 Zeilen
INSERT INTO Posten VALUES (1, 2, 3);
INSERT INTO Posten VALUES (1, 3, 2);
INSERT INTO Posten VALUES (2, 3, 4);
INSERT INTO Posten VALUES (2, 9, 1);
INSERT INTO Posten VALUES (2, 13, 1);
INSERT INTO Posten VALUES (3, 8, 2);
INSERT INTO Posten VALUES (4, 1, 1);
INSERT INTO Posten VALUES (4, 2, 1);
INSERT INTO Posten VALUES (5, 2, 2);
INSERT INTO Posten VALUES (5, 4, 2);
INSERT INTO Posten VALUES (6, 3, 1);
INSERT INTO Posten VALUES (6, 7, 1);
INSERT INTO Posten VALUES (7, 8, 2);
INSERT INTO Posten VALUES (8, 9, 1);
INSERT INTO Posten VALUES (9, 8, 2);
INSERT INTO Posten VALUES (9, 14, 1);
INSERT INTO Posten VALUES (10, 1, 1);
INSERT INTO Posten VALUES (10, 7, 2);
INSERT INTO Posten VALUES (11, 1, 2);
INSERT INTO Posten VALUES (11, 2, 4);
INSERT INTO Posten VALUES (12, 4, 1);
INSERT INTO Posten VALUES (13, 2, 2);
INSERT INTO Posten VALUES (13, 11, 1);
INSERT INTO Posten VALUES (14, 4, 3);
INSERT INTO Posten VALUES (14, 12, 1);
INSERT INTO Posten VALUES (15, 7, 1);
INSERT INTO Posten VALUES (15, 11, 1);
INSERT INTO Posten VALUES (16, 8, 1);
INSERT INTO Posten VALUES (17, 2, 1);
INSERT INTO Posten VALUES (17, 9, 1);
INSERT INTO Posten VALUES (17, 11, 1);
INSERT INTO Posten VALUES (18, 7, 2);
INSERT INTO Posten VALUES (18, 13, 1);
INSERT INTO Posten VALUES (19, 2, 1);
INSERT INTO Posten VALUES (19, 3, 1);
INSERT INTO Posten VALUES (20, 1, 1);
INSERT INTO Posten VALUES (20, 2, 4);
INSERT INTO Posten VALUES (21, 3, 1);
INSERT INTO Posten VALUES (21, 9, 1);
INSERT INTO Posten VALUES (22, 11, 1);
INSERT INTO Posten VALUES (23, 5, 1);
INSERT INTO Posten VALUES (23, 8, 1);
INSERT INTO Posten VALUES (24, 1, 2);
INSERT INTO Posten VALUES (25, 2, 1);
INSERT INTO Posten VALUES (26, 5, 2);
INSERT INTO Posten VALUES (27, 3, 2);
INSERT INTO Posten VALUES (27, 5, 1);
INSERT INTO Posten VALUES (27, 7, 1);
INSERT INTO Posten VALUES (28, 8, 1);
INSERT INTO Posten VALUES (29, 2, 1);
INSERT INTO Posten VALUES (29, 3, 1);
INSERT INTO Posten VALUES (29, 5, 1);
INSERT INTO Posten VALUES (30, 10, 1);
INSERT INTO Posten VALUES (31, 12, 1);
INSERT INTO Posten VALUES (32, 11, 1);
INSERT INTO Posten VALUES (33, 8, 1);
INSERT INTO Posten VALUES (34, 7, 2);
INSERT INTO Posten VALUES (34, 8, 1);
INSERT INTO Posten VALUES (35, 2, 2);
INSERT INTO Posten VALUES (36, 11, 1);
INSERT INTO Posten VALUES (37, 3, 2);
INSERT INTO Posten VALUES (37, 8, 1);
INSERT INTO Posten VALUES (38, 2, 1);
INSERT INTO Posten VALUES (38, 4, 1);
INSERT INTO Posten VALUES (38, 9, 1);
INSERT INTO Posten VALUES (39, 3, 2);
INSERT INTO Posten VALUES (39, 9, 1);
INSERT INTO Posten VALUES (39, 10, 1);
INSERT INTO Posten VALUES (40, 5, 1);
INSERT INTO Posten VALUES (40, 10, 1);
INSERT INTO Posten VALUES (41, 10, 1);
INSERT INTO Posten VALUES (41, 11, 1);
INSERT INTO Posten VALUES (41, 12, 2);
INSERT INTO Posten VALUES (42, 8, 1);
INSERT INTO Posten VALUES (42, 10, 1);
INSERT INTO Posten VALUES (43, 3, 2);
INSERT INTO Posten VALUES (43, 10, 2);
INSERT INTO Posten VALUES (44, 3, 2);
INSERT INTO Posten VALUES (44, 14, 1);
INSERT INTO Posten VALUES (45, 9, 1);
INSERT INTO Posten VALUES (46, 8, 2);
INSERT INTO Posten VALUES (47, 5, 2);
INSERT INTO Posten VALUES (47, 8, 2);
INSERT INTO Posten VALUES (48, 8, 1);
INSERT INTO Posten VALUES (49, 3, 4);
INSERT INTO Posten VALUES (50, 3, 1);
INSERT INTO Posten VALUES (51, 13, 2);
INSERT INTO Posten VALUES (52, 1, 1);
INSERT INTO Posten VALUES (52, 11, 1);
INSERT INTO Posten VALUES (53, 1, 1);
INSERT INTO Posten VALUES (53, 8, 1);
INSERT INTO Posten VALUES (54, 3, 1);
INSERT INTO Posten VALUES (55, 1, 3);
INSERT INTO Posten VALUES (55, 7, 1);
INSERT INTO Posten VALUES (55, 8, 1);
INSERT INTO Posten VALUES (56, 2, 1);
INSERT INTO Posten VALUES (56, 3, 1);
INSERT INTO Posten VALUES (57, 10, 1);
INSERT INTO Posten VALUES (57, 13, 2);
INSERT INTO Posten VALUES (58, 1, 1);
INSERT INTO Posten VALUES (58, 4, 1);
INSERT INTO Posten VALUES (58, 11, 1);
INSERT INTO Posten VALUES (59, 5, 2);
INSERT INTO Posten VALUES (60, 5, 1);
INSERT INTO Posten VALUES (60, 11, 1);
INSERT INTO Posten VALUES (61, 2, 3);
INSERT INTO Posten VALUES (62, 1, 3);
INSERT INTO Posten VALUES (62, 3, 4);
INSERT INTO Posten VALUES (63, 2, 2);
INSERT INTO Posten VALUES (63, 10, 1);
INSERT INTO Posten VALUES (64, 9, 1);
INSERT INTO Posten VALUES (64, 12, 2);
INSERT INTO Posten VALUES (65, 2, 2);
INSERT INTO Posten VALUES (65, 3, 3);
INSERT INTO Posten VALUES (66, 1, 2);
INSERT INTO Posten VALUES (67, 1, 4);
INSERT INTO Posten VALUES (67, 10, 1);
INSERT INTO Posten VALUES (68, 1, 1);
INSERT INTO Posten VALUES (69, 3, 3);
INSERT INTO Posten VALUES (70, 4, 1);
INSERT INTO Posten VALUES (70, 5, 1);
INSERT INTO Posten VALUES (71, 2, 1);
INSERT INTO Posten VALUES (71, 8, 2);
INSERT INTO Posten VALUES (72, 9, 1);
INSERT INTO Posten VALUES (73, 5, 2);
INSERT INTO Posten VALUES (73, 12, 1);
INSERT INTO Posten VALUES (74, 9, 1);
INSERT INTO Posten VALUES (75, 8, 1);
INSERT INTO Posten VALUES (76, 3, 2);
INSERT INTO Posten VALUES (76, 8, 1);
INSERT INTO Posten VALUES (77, 3, 4);
INSERT INTO Posten VALUES (78, 1, 2);
INSERT INTO Posten VALUES (78, 7, 1);
INSERT INTO Posten VALUES (79, 1, 2);
INSERT INTO Posten VALUES (79, 3, 2);
INSERT INTO Posten VALUES (79, 4, 1);
INSERT INTO Posten VALUES (80, 12, 1);
INSERT INTO Posten VALUES (80, 14, 1);
INSERT INTO Posten VALUES (81, 1, 1);
INSERT INTO Posten VALUES (81, 8, 1);
INSERT INTO Posten VALUES (82, 1, 1);
INSERT INTO Posten VALUES (83, 1, 1);
INSERT INTO Posten VALUES (83, 8, 1);
INSERT INTO Posten VALUES (84, 3, 1);
INSERT INTO Posten VALUES (84, 7, 1);
INSERT INTO Posten VALUES (85, 2, 1);
INSERT INTO Posten VALUES (86, 1, 3);
INSERT INTO Posten VALUES (86, 2, 3);
INSERT INTO Posten VALUES (86, 5, 1);
INSERT INTO Posten VALUES (87, 3, 1);
INSERT INTO Posten VALUES (88, 1, 1);
INSERT INTO Posten VALUES (88, 3, 3);
INSERT INTO Posten VALUES (88, 9, 1);
INSERT INTO Posten VALUES (89, 2, 2);
INSERT INTO Posten VALUES (89, 9, 1);
INSERT INTO Posten VALUES (90, 4, 1);
INSERT INTO Posten VALUES (90, 7, 1);
INSERT INTO Posten VALUES (91, 4, 1);
INSERT INTO Posten VALUES (91, 11, 1);
INSERT INTO Posten VALUES (92, 9, 1);
INSERT INTO Posten VALUES (93, 3, 2);
INSERT INTO Posten VALUES (93, 8, 1);
INSERT INTO Posten VALUES (93, 11, 1);
INSERT INTO Posten VALUES (94, 3, 4);
INSERT INTO Posten VALUES (94, 8, 2);
INSERT INTO Posten VALUES (95, 5, 1);
INSERT INTO Posten VALUES (95, 12, 1);
INSERT INTO Posten VALUES (96, 2, 2);
INSERT INTO Posten VALUES (96, 3, 1);
INSERT INTO Posten VALUES (96, 9, 1);
INSERT INTO Posten VALUES (96, 11, 2);
INSERT INTO Posten VALUES (96, 12, 1);
INSERT INTO Posten VALUES (97, 3, 1);
INSERT INTO Posten VALUES (97, 11, 1);
INSERT INTO Posten VALUES (98, 2, 2);
INSERT INTO Posten VALUES (98, 13, 2);
INSERT INTO Posten VALUES (99, 7, 1);
INSERT INTO Posten VALUES (100, 2, 4);
INSERT INTO Posten VALUES (100, 4, 3);
INSERT INTO Posten VALUES (100, 5, 2);
INSERT INTO Posten VALUES (101, 5, 1);
INSERT INTO Posten VALUES (101, 7, 1);
INSERT INTO Posten VALUES (101, 11, 1);
INSERT INTO Posten VALUES (102, 13, 1);
INSERT INTO Posten VALUES (103, 1, 2);
INSERT INTO Posten VALUES (104, 8, 2);
INSERT INTO Posten VALUES (104, 10, 1);
INSERT INTO Posten VALUES (105, 7, 1);
INSERT INTO Posten VALUES (105, 9, 1);
INSERT INTO Posten VALUES (105, 12, 1);
INSERT INTO Posten VALUES (106, 3, 1);
INSERT INTO Posten VALUES (107, 4, 1);
INSERT INTO Posten VALUES (107, 13, 1);
INSERT INTO Posten VALUES (108, 2, 2);
INSERT INTO Posten VALUES (108, 5, 1);
INSERT INTO Posten VALUES (109, 10, 2);
INSERT INTO Posten VALUES (110, 11, 2);
INSERT INTO Posten VALUES (111, 11, 1);
INSERT INTO Posten VALUES (112, 9, 1);
INSERT INTO Posten VALUES (112, 14, 1);
INSERT INTO Posten VALUES (113, 7, 2);
INSERT INTO Posten VALUES (114, 12, 1);
INSERT INTO Posten VALUES (115, 8, 1);
INSERT INTO Posten VALUES (115, 9, 1);
INSERT INTO Posten VALUES (115, 12, 1);
INSERT INTO Posten VALUES (116, 1, 1);
INSERT INTO Posten VALUES (117, 3, 1);
INSERT INTO Posten VALUES (117, 7, 1);
INSERT INTO Posten VALUES (118, 2, 1);
INSERT INTO Posten VALUES (118, 13, 2);
INSERT INTO Posten VALUES (119, 1, 1);
INSERT INTO Posten VALUES (119, 3, 1);
INSERT INTO Posten VALUES (120, 2, 2);
INSERT INTO Posten VALUES (120, 7, 2);

COMMIT;
