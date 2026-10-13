-- =====================================================================
-- Datendetektei Weserstedt · basis.sql der Übungsdatenbank „verhoer/kletterhalle“
-- ERZEUGT von scripts/db_bauen.js (npm run db) – nicht von Hand ändern.
-- Datenbank: verhoer/kletterhalle
-- Seed: datendetektei:verhoer/kletterhalle:v1 (FNV-1a 0x1a572aae) – kuratiert, kein Generator
-- Version: 1
-- SHA-256 (Datenteil): 83c607835e3f8461dca4158c23ebdd12342e6e537368bf8db2c4709fdf42f369
-- =====================================================================

-- =====================================================================
-- Datendetektei Weserstedt · Verhör-Kontext V5 „Kletterhalle“ (Verhör 5, Akte 5, nur eA)
-- Nur für das Verhör (nie öffentlich unter /db/). Mini-DB für „Kardinalität aus Daten“ (A5-V-03/04): Die
-- Kletterhalle Weserstedt hat Wände mit Routen; jede Route hängt an genau einer Wand und wurde von genau einem
-- Routenbauer geschraubt; Mitglieder klettern Routen (Datum, Durchstieg ja/nein). Ausschnitt der Musterlösung
-- (VERHOER_KONTEXTE.md V5, angeglichen an DS_PLANUNG); Trainer, Kurse und Wettkämpfe gibt es nur im ER-Modell.
-- Kurzschreibweise:
--   Mitglied(MitgliedsNr, Name, Jahrgang)
--   Wand(WandNr, Bereich)
--   Routenbauer(BauerNr, Name)
--   Route(RoutenNr, Name, Schwierigkeit, ↑WandNr, ↑BauerNr)
--   klettert(↑MitgliedsNr, ↑RoutenNr, Datum, Erfolg)      PK: MitgliedsNr, RoutenNr, Datum
-- =====================================================================

PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS klettert;
DROP TABLE IF EXISTS Route;
DROP TABLE IF EXISTS Routenbauer;
DROP TABLE IF EXISTS Wand;
DROP TABLE IF EXISTS Mitglied;

CREATE TABLE Mitglied (
  MitgliedsNr INTEGER PRIMARY KEY,
  Name        TEXT    NOT NULL,   -- 'Vorname Nachname'
  Jahrgang    INTEGER NOT NULL CHECK (Jahrgang BETWEEN 1940 AND 2020)
);

CREATE TABLE Wand (
  WandNr  INTEGER PRIMARY KEY,
  Bereich TEXT    NOT NULL
);

CREATE TABLE Routenbauer (
  BauerNr INTEGER PRIMARY KEY,
  Name    TEXT    NOT NULL        -- 'Vorname Nachname'
);

CREATE TABLE Route (
  RoutenNr      INTEGER PRIMARY KEY,
  Name          TEXT    NOT NULL,
  Schwierigkeit TEXT    NOT NULL,  -- UIAA-Grad, z. B. '5+', '6-', '7'
  WandNr        INTEGER NOT NULL,  -- jede Route befindet sich an genau einer Wand (1:n, FK auf der n-Seite)
  BauerNr       INTEGER NOT NULL,  -- … und wurde von genau einem Routenbauer geschraubt
  FOREIGN KEY (WandNr) REFERENCES Wand(WandNr),
  FOREIGN KEY (BauerNr) REFERENCES Routenbauer(BauerNr)
);

-- n:m-Beziehung mit Beziehungsattributen; Datum gehört zum Schlüssel, weil dieselbe Route mehrfach geklettert wird.
CREATE TABLE klettert (
  MitgliedsNr INTEGER NOT NULL,
  RoutenNr    INTEGER NOT NULL,
  Datum       TEXT    NOT NULL CHECK (Datum LIKE '____-__-__'),
  Erfolg      TEXT    NOT NULL CHECK (Erfolg IN ('ja', 'nein')),   -- Durchstieg
  PRIMARY KEY (MitgliedsNr, RoutenNr, Datum),
  FOREIGN KEY (MitgliedsNr) REFERENCES Mitglied(MitgliedsNr),
  FOREIGN KEY (RoutenNr) REFERENCES Route(RoutenNr)
);

-- ===== Daten (erzeugt) =====
BEGIN;
PRAGMA defer_foreign_keys = ON;

-- Mitglied: 8 Zeilen
INSERT INTO Mitglied VALUES (1, 'Arne Steenken', 1994);
INSERT INTO Mitglied VALUES (2, 'Smilla Dirksen', 2008);
INSERT INTO Mitglied VALUES (3, 'Deniz Akgül', 1989);
INSERT INTO Mitglied VALUES (4, 'Maren Tiemann', 2001);
INSERT INTO Mitglied VALUES (5, 'Ilias Haddad', 2010);
INSERT INTO Mitglied VALUES (6, 'Vivien Eggers', 1976);
INSERT INTO Mitglied VALUES (7, 'Jannik Möhlmann', 2005);
INSERT INTO Mitglied VALUES (8, 'Fenja Nordhoff', 2012);

-- Wand: 4 Zeilen
INSERT INTO Wand VALUES (1, 'Nordwand');
INSERT INTO Wand VALUES (2, 'Südwand');
INSERT INTO Wand VALUES (3, 'Überhang');
INSERT INTO Wand VALUES (4, 'Kinderbereich');

-- Routenbauer: 3 Zeilen
INSERT INTO Routenbauer VALUES (1, 'Tomke Bredehorn');
INSERT INTO Routenbauer VALUES (2, 'Helge Schierholz');
INSERT INTO Routenbauer VALUES (3, 'Kaja Wiechmann');

-- Route: 12 Zeilen
INSERT INTO Route VALUES (1, 'Morgenrot', '5+', 1, 1);
INSERT INTO Route VALUES (2, 'Kante links', '6-', 1, 2);
INSERT INTO Route VALUES (3, 'Gletscherspalte', '7', 1, 1);
INSERT INTO Route VALUES (4, 'Nordlicht', '6+', 1, 3);
INSERT INTO Route VALUES (5, 'Sonnendeck', '4', 2, 2);
INSERT INTO Route VALUES (6, 'Sandsturm', '5', 2, 3);
INSERT INTO Route VALUES (7, 'Mittagspause', '6', 2, 1);
INSERT INTO Route VALUES (8, 'Dachrinne', '7+', 3, 2);
INSERT INTO Route VALUES (9, 'Schwerkraft', '8-', 3, 2);
INSERT INTO Route VALUES (10, 'Fledermaus', '6+', 3, 3);
INSERT INTO Route VALUES (11, 'Raupe', '3', 4, 1);
INSERT INTO Route VALUES (12, 'Marienkäfer', '3+', 4, 3);

-- klettert: 25 Zeilen
INSERT INTO klettert VALUES (1, 1, '2026-09-05', 'ja');
INSERT INTO klettert VALUES (1, 3, '2026-09-05', 'nein');
INSERT INTO klettert VALUES (1, 3, '2026-09-12', 'ja');
INSERT INTO klettert VALUES (1, 8, '2026-09-19', 'nein');
INSERT INTO klettert VALUES (1, 9, '2026-10-03', 'nein');
INSERT INTO klettert VALUES (2, 1, '2026-10-11', 'ja');
INSERT INTO klettert VALUES (2, 2, '2026-09-06', 'ja');
INSERT INTO klettert VALUES (2, 4, '2026-09-06', 'ja');
INSERT INTO klettert VALUES (2, 7, '2026-09-13', 'ja');
INSERT INTO klettert VALUES (3, 1, '2026-09-05', 'ja');
INSERT INTO klettert VALUES (3, 5, '2026-09-12', 'ja');
INSERT INTO klettert VALUES (3, 8, '2026-09-26', 'ja');
INSERT INTO klettert VALUES (3, 9, '2026-10-10', 'nein');
INSERT INTO klettert VALUES (4, 2, '2026-09-13', 'nein');
INSERT INTO klettert VALUES (4, 6, '2026-09-20', 'ja');
INSERT INTO klettert VALUES (4, 10, '2026-10-04', 'ja');
INSERT INTO klettert VALUES (5, 5, '2026-09-27', 'ja');
INSERT INTO klettert VALUES (5, 11, '2026-09-20', 'ja');
INSERT INTO klettert VALUES (6, 4, '2026-10-03', 'nein');
INSERT INTO klettert VALUES (6, 7, '2026-09-19', 'ja');
INSERT INTO klettert VALUES (7, 3, '2026-09-26', 'ja');
INSERT INTO klettert VALUES (7, 6, '2026-10-17', 'ja');
INSERT INTO klettert VALUES (7, 10, '2026-10-10', 'ja');
INSERT INTO klettert VALUES (8, 11, '2026-09-27', 'ja');
INSERT INTO klettert VALUES (8, 12, '2026-10-04', 'ja');

COMMIT;
