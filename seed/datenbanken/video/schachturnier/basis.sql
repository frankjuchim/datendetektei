-- =====================================================================
-- Datendetektei Weserstedt · basis.sql der Übungsdatenbank „video/schachturnier“
-- ERZEUGT von scripts/db_bauen.js (npm run db) – nicht von Hand ändern.
-- Datenbank: video/schachturnier
-- Seed: datendetektei:video/schachturnier:v1 (FNV-1a 0x97563fd0)
-- Version: 1
-- SHA-256 (Datenteil): faa5ab6a353ffd6c62f4dc398d0e77cc04f5d07bae4d5196021789841a5b9cb1
-- =====================================================================

-- =====================================================================
-- Datendetektei Weserstedt · Video-Datenbank „Schachturnier“ (Erklärvideos 1, 2 und 7)
-- Nur für die Beispiele der Erklärvideos (materialien/Videos) – nie für Lab-, AB-, Verhör- oder Klausuraufgaben.
-- Zur Laufzeit nicht geladen und nie öffentlich; geprüft von werkzeuge/material_sql_pruefen.py.
-- Kurzschreibweise:
--   Verein(VereinNr, Name, Ort)
--   Spieler(SpielerNr, Vorname, Nachname, Jahrgang, Wertung, ↑VereinNr)
--   Turnier(TurnierNr, Bezeichnung, Datum, Ort)
--   Partie(PartieNr, ↑TurnierNr, Runde, ↑WeissNr, ↑SchwarzNr, Ergebnis)
-- =====================================================================

PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS Partie;
DROP TABLE IF EXISTS Turnier;
DROP TABLE IF EXISTS Spieler;
DROP TABLE IF EXISTS Verein;

CREATE TABLE Verein (
  VereinNr INTEGER PRIMARY KEY,
  Name     TEXT    NOT NULL UNIQUE,
  Ort      TEXT    NOT NULL
);

CREATE TABLE Spieler (
  SpielerNr INTEGER PRIMARY KEY,
  Vorname   TEXT    NOT NULL,
  Nachname  TEXT    NOT NULL,
  Jahrgang  INTEGER NOT NULL,
  Wertung   INTEGER,                                   -- Wertungszahl; NULL = noch keine Wertung
  VereinNr  INTEGER,                                   -- NULL = vereinslos
  FOREIGN KEY (VereinNr) REFERENCES Verein(VereinNr)
);

CREATE TABLE Turnier (
  TurnierNr   INTEGER PRIMARY KEY,
  Bezeichnung TEXT    NOT NULL,
  Datum       TEXT    NOT NULL CHECK (Datum LIKE '____-__-__'),
  Ort         TEXT    NOT NULL
);

CREATE TABLE Partie (
  PartieNr  INTEGER PRIMARY KEY,
  TurnierNr INTEGER NOT NULL,
  Runde     INTEGER NOT NULL,
  WeissNr   INTEGER NOT NULL,
  SchwarzNr INTEGER NOT NULL,
  Ergebnis  TEXT    CHECK (Ergebnis IN ('1-0', '0-1', 'remis')),   -- NULL = noch nicht beendet
  FOREIGN KEY (TurnierNr) REFERENCES Turnier(TurnierNr),
  FOREIGN KEY (WeissNr) REFERENCES Spieler(SpielerNr),
  FOREIGN KEY (SchwarzNr) REFERENCES Spieler(SpielerNr)
);

-- ===== Daten (erzeugt) =====
BEGIN;
PRAGMA defer_foreign_keys = ON;

-- Verein: 3 Zeilen
INSERT INTO Verein VALUES (1, 'SK Weserspringer', 'Weserstedt');
INSERT INTO Verein VALUES (2, 'Turm Lindenhof', 'Weserstedt');
INSERT INTO Verein VALUES (3, 'SV Rochade Moorbach', 'Moorbach');

-- Spieler: 10 Zeilen
INSERT INTO Spieler VALUES (1, 'Imke', 'Bargmann', 2008, 1620, 1);
INSERT INTO Spieler VALUES (2, 'Mats', 'Okafor', 2009, 1480, 1);
INSERT INTO Spieler VALUES (3, 'Fenja', 'Harjes', 2007, 1755, 2);
INSERT INTO Spieler VALUES (4, 'Joris', 'Kampen', 2010, NULL, 2);
INSERT INTO Spieler VALUES (5, 'Smilla', 'Onken', 2008, 1390, 3);
INSERT INTO Spieler VALUES (6, 'Keno', 'Uphoff', 2009, NULL, NULL);
INSERT INTO Spieler VALUES (7, 'Tomke', 'Saathoff', 2007, 1830, 3);
INSERT INTO Spieler VALUES (8, 'Hauke', 'Demir', 2010, 1210, 1);
INSERT INTO Spieler VALUES (9, 'Levke', 'Wilms', 2009, 1545, NULL);
INSERT INTO Spieler VALUES (10, 'Arne', 'Bargmann', 2006, 1690, 2);

-- Turnier: 2 Zeilen
INSERT INTO Turnier VALUES (1, 'Frühjahrsblitz', '2026-03-14', 'Jugendzentrum Lindenhof');
INSERT INTO Turnier VALUES (2, 'Weserbrücken-Pokal', '2026-05-09', 'Rathausfoyer');

-- Partie: 18 Zeilen
INSERT INTO Partie VALUES (1, 1, 1, 1, 2, '1-0');
INSERT INTO Partie VALUES (2, 1, 1, 3, 4, '1-0');
INSERT INTO Partie VALUES (3, 1, 1, 5, 7, '0-1');
INSERT INTO Partie VALUES (4, 1, 1, 8, 10, '0-1');
INSERT INTO Partie VALUES (5, 1, 2, 2, 3, '0-1');
INSERT INTO Partie VALUES (6, 1, 2, 4, 1, 'remis');
INSERT INTO Partie VALUES (7, 1, 2, 10, 7, 'remis');
INSERT INTO Partie VALUES (8, 1, 2, 5, 8, '1-0');
INSERT INTO Partie VALUES (9, 1, 3, 7, 3, '1-0');
INSERT INTO Partie VALUES (10, 1, 3, 1, 10, '0-1');
INSERT INTO Partie VALUES (11, 1, 3, 2, 5, 'remis');
INSERT INTO Partie VALUES (12, 1, 3, 4, 8, '1-0');
INSERT INTO Partie VALUES (13, 2, 1, 3, 6, '1-0');
INSERT INTO Partie VALUES (14, 2, 1, 9, 7, '0-1');
INSERT INTO Partie VALUES (15, 2, 1, 10, 1, 'remis');
INSERT INTO Partie VALUES (16, 2, 2, 6, 9, 'remis');
INSERT INTO Partie VALUES (17, 2, 2, 7, 10, '1-0');
INSERT INTO Partie VALUES (18, 2, 2, 1, 3, NULL);

COMMIT;
