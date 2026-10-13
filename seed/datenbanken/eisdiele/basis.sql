-- =====================================================================
-- Datendetektei Weserstedt · basis.sql der Übungsdatenbank „eisdiele“
-- ERZEUGT von scripts/db_bauen.js (npm run db) – nicht von Hand ändern.
-- Datenbank: eisdiele
-- Seed: datendetektei:eisdiele:v1 (FNV-1a 0x95d77095) – kuratiert, kein Generator
-- Version: 1
-- SHA-256 (Datenteil): 0bbb53da007eaf37239d3eae342f8b13dcb30d8e40c5a65ef6e08b4524e94fce
-- =====================================================================

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

-- ===== Daten (erzeugt) =====
BEGIN;
PRAGMA defer_foreign_keys = ON;

-- Sorte: 10 Zeilen
INSERT INTO Sorte VALUES (1, 'Vanille', 1.5, 'nein');
INSERT INTO Sorte VALUES (2, 'Schokolade', 1.5, 'nein');
INSERT INTO Sorte VALUES (3, 'Erdbeere', 1.6, 'ja');
INSERT INTO Sorte VALUES (4, 'Zitrone', 1.4, 'ja');
INSERT INTO Sorte VALUES (5, 'Haselnuss', 1.7, 'nein');
INSERT INTO Sorte VALUES (6, 'Sanddorn-Mango', 1.8, 'ja');
INSERT INTO Sorte VALUES (7, 'Stracciatella', 1.7, 'nein');
INSERT INTO Sorte VALUES (8, 'Karamell', 1.8, 'nein');
INSERT INTO Sorte VALUES (9, 'Pistazie', 2.0, 'nein');
INSERT INTO Sorte VALUES (10, 'Schoko-Minze', 1.7, 'nein');

-- Verkauf: 57 Zeilen
INSERT INTO Verkauf VALUES (1, 7, '2026-07-06', 1);
INSERT INTO Verkauf VALUES (2, 1, '2026-07-06', 5);
INSERT INTO Verkauf VALUES (3, 2, '2026-07-06', 2);
INSERT INTO Verkauf VALUES (4, 3, '2026-07-06', 2);
INSERT INTO Verkauf VALUES (5, 7, '2026-07-06', 2);
INSERT INTO Verkauf VALUES (6, 5, '2026-07-06', 2);
INSERT INTO Verkauf VALUES (7, 8, '2026-07-06', 2);
INSERT INTO Verkauf VALUES (8, 1, '2026-07-06', 4);
INSERT INTO Verkauf VALUES (9, 10, '2026-07-06', 1);
INSERT INTO Verkauf VALUES (10, 4, '2026-07-07', 1);
INSERT INTO Verkauf VALUES (11, 6, '2026-07-07', 2);
INSERT INTO Verkauf VALUES (12, 2, '2026-07-07', 3);
INSERT INTO Verkauf VALUES (13, 7, '2026-07-07', 1);
INSERT INTO Verkauf VALUES (14, 1, '2026-07-07', 3);
INSERT INTO Verkauf VALUES (15, 2, '2026-07-07', 1);
INSERT INTO Verkauf VALUES (16, 3, '2026-07-07', 1);
INSERT INTO Verkauf VALUES (17, 7, '2026-07-07', 2);
INSERT INTO Verkauf VALUES (18, 5, '2026-07-08', 1);
INSERT INTO Verkauf VALUES (19, 8, '2026-07-08', 3);
INSERT INTO Verkauf VALUES (20, 1, '2026-07-08', 4);
INSERT INTO Verkauf VALUES (21, 10, '2026-07-08', 2);
INSERT INTO Verkauf VALUES (22, 4, '2026-07-08', 2);
INSERT INTO Verkauf VALUES (23, 6, '2026-07-08', 1);
INSERT INTO Verkauf VALUES (24, 2, '2026-07-08', 2);
INSERT INTO Verkauf VALUES (25, 7, '2026-07-08', 1);
INSERT INTO Verkauf VALUES (26, 1, '2026-07-09', 5);
INSERT INTO Verkauf VALUES (27, 2, '2026-07-09', 2);
INSERT INTO Verkauf VALUES (28, 3, '2026-07-09', 3);
INSERT INTO Verkauf VALUES (29, 7, '2026-07-09', 2);
INSERT INTO Verkauf VALUES (30, 5, '2026-07-09', 2);
INSERT INTO Verkauf VALUES (31, 8, '2026-07-09', 1);
INSERT INTO Verkauf VALUES (32, 1, '2026-07-09', 3);
INSERT INTO Verkauf VALUES (33, 10, '2026-07-09', 2);
INSERT INTO Verkauf VALUES (34, 4, '2026-07-10', 1);
INSERT INTO Verkauf VALUES (35, 6, '2026-07-10', 2);
INSERT INTO Verkauf VALUES (36, 2, '2026-07-10', 3);
INSERT INTO Verkauf VALUES (37, 7, '2026-07-10', 1);
INSERT INTO Verkauf VALUES (38, 1, '2026-07-10', 4);
INSERT INTO Verkauf VALUES (39, 2, '2026-07-10', 1);
INSERT INTO Verkauf VALUES (40, 3, '2026-07-10', 2);
INSERT INTO Verkauf VALUES (41, 7, '2026-07-10', 2);
INSERT INTO Verkauf VALUES (42, 5, '2026-07-11', 3);
INSERT INTO Verkauf VALUES (43, 8, '2026-07-11', 2);
INSERT INTO Verkauf VALUES (44, 1, '2026-07-11', 2);
INSERT INTO Verkauf VALUES (45, 10, '2026-07-11', 2);
INSERT INTO Verkauf VALUES (46, 4, '2026-07-11', 2);
INSERT INTO Verkauf VALUES (47, 2, '2026-07-11', 2);
INSERT INTO Verkauf VALUES (48, 7, '2026-07-11', 2);
INSERT INTO Verkauf VALUES (49, 1, '2026-07-11', 3);
INSERT INTO Verkauf VALUES (50, 3, '2026-07-12', 1);
INSERT INTO Verkauf VALUES (51, 7, '2026-07-12', 1);
INSERT INTO Verkauf VALUES (52, 5, '2026-07-12', 1);
INSERT INTO Verkauf VALUES (53, 8, '2026-07-12', 2);
INSERT INTO Verkauf VALUES (54, 1, '2026-07-12', 3);
INSERT INTO Verkauf VALUES (55, 7, '2026-07-12', 2);
INSERT INTO Verkauf VALUES (56, 3, '2026-07-12', 2);
INSERT INTO Verkauf VALUES (57, 7, '2026-07-12', 1);

COMMIT;
