-- =====================================================================
-- Datendetektei Weserstedt · basis.sql der Übungsdatenbank „verhoer/fitness“
-- ERZEUGT von scripts/db_bauen.js (npm run db) – nicht von Hand ändern.
-- Datenbank: verhoer/fitness
-- Seed: datendetektei:verhoer/fitness:v1 (FNV-1a 0x1eb94619) – kuratiert, kein Generator
-- Version: 1
-- SHA-256 (Datenteil): fe194f68d712ea576ab7a206d4bf69e411280efabea8298e9e1c3eb238c6c746
-- =====================================================================

-- =====================================================================
-- Datendetektei Weserstedt · Verhör-Kontext V6 „Fitness-App“ (Verhör 6, Akte 6). Nur für das Verhör (nie öffentlich
-- unter /db/). Eine (fiktive) Fitness-App zeichnet Schritte und Ruhepuls ihrer Nutzerinnen und Nutzer auf und möchte
-- einen pseudonymisierten Export mit einer Krankenkasse und mit Werbepartnern teilen. NutzerToken ist ein Pseudonym
-- ('N-000'); Geburtsjahr, PLZBereich und Geschlecht sind Quasi-Identifikatoren, der Ruhepuls ist ein Gesundheitsdatum
-- (besondere Kategorie, Art. 9 DSGVO). Ruhepuls ist NULL, wenn kein Messgerät verbunden war.
-- Export = Fassung zum Stichtag 2026-10-05 mit genau einer Zeile je NutzerToken (für A6-V-05: GROUP BY … HAVING
-- COUNT(*) = 1 ohne Unterabfrage); ExportVerlauf = Mehrtagesfassung 2026-10-02 … 05 mit 1–4 Zeilen je NutzerToken
-- (Diskussion „Zeilen ≠ Personen“, A6-V-06). Jede Zeile von Export steht auch in ExportVerlauf.
-- Kurzschreibweise:
--   Export(NutzerToken, Geburtsjahr, PLZBereich, Geschlecht, Schritte, Ruhepuls, Datum)          PK: NutzerToken, Datum
--   ExportVerlauf(NutzerToken, Geburtsjahr, PLZBereich, Geschlecht, Schritte, Ruhepuls, Datum)   PK: NutzerToken, Datum
-- =====================================================================

PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS ExportVerlauf;
DROP TABLE IF EXISTS Export;

CREATE TABLE Export (
  NutzerToken TEXT    NOT NULL CHECK (NutzerToken LIKE 'N-___'),
  Geburtsjahr INTEGER NOT NULL CHECK (Geburtsjahr BETWEEN 1940 AND 2010),
  PLZBereich  TEXT    NOT NULL CHECK (PLZBereich IN ('001', '002', '003', '004', '005', '006')),
  Geschlecht  TEXT    NOT NULL CHECK (Geschlecht IN ('w', 'm', 'd')),
  Schritte    INTEGER NOT NULL CHECK (Schritte BETWEEN 800 AND 18000),
  Ruhepuls    INTEGER CHECK (Ruhepuls BETWEEN 48 AND 92),       -- NULL = kein Messgerät verbunden
  Datum       TEXT    NOT NULL CHECK (Datum LIKE '____-__-__'),
  PRIMARY KEY (NutzerToken, Datum)
);

CREATE TABLE ExportVerlauf (
  NutzerToken TEXT    NOT NULL CHECK (NutzerToken LIKE 'N-___'),
  Geburtsjahr INTEGER NOT NULL CHECK (Geburtsjahr BETWEEN 1940 AND 2010),
  PLZBereich  TEXT    NOT NULL CHECK (PLZBereich IN ('001', '002', '003', '004', '005', '006')),
  Geschlecht  TEXT    NOT NULL CHECK (Geschlecht IN ('w', 'm', 'd')),
  Schritte    INTEGER NOT NULL CHECK (Schritte BETWEEN 800 AND 18000),
  Ruhepuls    INTEGER CHECK (Ruhepuls BETWEEN 48 AND 92),
  Datum       TEXT    NOT NULL CHECK (Datum LIKE '____-__-__'),
  PRIMARY KEY (NutzerToken, Datum)
);

-- ===== Daten (erzeugt) =====
BEGIN;
PRAGMA defer_foreign_keys = ON;

-- Export: 25 Zeilen
INSERT INTO Export VALUES ('N-100', 1990, '002', 'w', 12080, 59, '2026-10-05');
INSERT INTO Export VALUES ('N-122', 1998, '001', 'd', 8190, 51, '2026-10-05');
INSERT INTO Export VALUES ('N-137', 1990, '002', 'w', 8710, 62, '2026-10-05');
INSERT INTO Export VALUES ('N-182', 2007, '001', 'w', 10220, 55, '2026-10-05');
INSERT INTO Export VALUES ('N-249', 1990, '002', 'm', 3970, 71, '2026-10-05');
INSERT INTO Export VALUES ('N-302', 1958, '006', 'w', 6960, 68, '2026-10-05');
INSERT INTO Export VALUES ('N-367', 1990, '002', 'w', 9560, 59, '2026-10-05');
INSERT INTO Export VALUES ('N-379', 1998, '001', 'w', 8800, 57, '2026-10-05');
INSERT INTO Export VALUES ('N-427', 1975, '003', 'w', 5770, 59, '2026-10-05');
INSERT INTO Export VALUES ('N-482', 1975, '003', 'm', 7210, 64, '2026-10-05');
INSERT INTO Export VALUES ('N-523', 2001, '004', 'm', 12960, 68, '2026-10-05');
INSERT INTO Export VALUES ('N-581', 2007, '005', 'w', 2590, 59, '2026-10-05');
INSERT INTO Export VALUES ('N-596', 1963, '006', 'm', 9680, 66, '2026-10-05');
INSERT INTO Export VALUES ('N-600', 1998, '001', 'm', 5190, 59, '2026-10-05');
INSERT INTO Export VALUES ('N-651', 2001, '004', 'm', 6400, 63, '2026-10-05');
INSERT INTO Export VALUES ('N-652', 2001, '004', 'w', 8610, 62, '2026-10-05');
INSERT INTO Export VALUES ('N-687', 1949, '004', 'm', 6200, 76, '2026-10-05');
INSERT INTO Export VALUES ('N-700', 1963, '002', 'w', 2000, NULL, '2026-10-05');
INSERT INTO Export VALUES ('N-778', 1963, '002', 'm', 4830, 71, '2026-10-05');
INSERT INTO Export VALUES ('N-798', 2001, '004', 'w', 10190, 63, '2026-10-05');
INSERT INTO Export VALUES ('N-847', 1958, '006', 'w', 13320, 73, '2026-10-05');
INSERT INTO Export VALUES ('N-852', 2007, '005', 'm', 10260, 62, '2026-10-05');
INSERT INTO Export VALUES ('N-877', 2007, '005', 'm', 13980, 61, '2026-10-05');
INSERT INTO Export VALUES ('N-880', 1985, '003', 'w', 5030, NULL, '2026-10-05');
INSERT INTO Export VALUES ('N-888', 1975, '003', 'w', 6810, 64, '2026-10-05');

-- ExportVerlauf: 60 Zeilen
INSERT INTO ExportVerlauf VALUES ('N-100', 1990, '002', 'w', 12080, 59, '2026-10-05');
INSERT INTO ExportVerlauf VALUES ('N-122', 1998, '001', 'd', 8090, 65, '2026-10-04');
INSERT INTO ExportVerlauf VALUES ('N-122', 1998, '001', 'd', 8190, 51, '2026-10-05');
INSERT INTO ExportVerlauf VALUES ('N-137', 1990, '002', 'w', 5870, 55, '2026-10-03');
INSERT INTO ExportVerlauf VALUES ('N-137', 1990, '002', 'w', 2590, 66, '2026-10-04');
INSERT INTO ExportVerlauf VALUES ('N-137', 1990, '002', 'w', 8710, 62, '2026-10-05');
INSERT INTO ExportVerlauf VALUES ('N-182', 2007, '001', 'w', 10220, 55, '2026-10-05');
INSERT INTO ExportVerlauf VALUES ('N-249', 1990, '002', 'm', 8940, 60, '2026-10-03');
INSERT INTO ExportVerlauf VALUES ('N-249', 1990, '002', 'm', 7480, 67, '2026-10-04');
INSERT INTO ExportVerlauf VALUES ('N-249', 1990, '002', 'm', 3970, 71, '2026-10-05');
INSERT INTO ExportVerlauf VALUES ('N-302', 1958, '006', 'w', 8780, NULL, '2026-10-04');
INSERT INTO ExportVerlauf VALUES ('N-302', 1958, '006', 'w', 6960, 68, '2026-10-05');
INSERT INTO ExportVerlauf VALUES ('N-367', 1990, '002', 'w', 9560, 59, '2026-10-05');
INSERT INTO ExportVerlauf VALUES ('N-379', 1998, '001', 'w', 9750, 65, '2026-10-03');
INSERT INTO ExportVerlauf VALUES ('N-379', 1998, '001', 'w', 5440, 55, '2026-10-04');
INSERT INTO ExportVerlauf VALUES ('N-379', 1998, '001', 'w', 8800, 57, '2026-10-05');
INSERT INTO ExportVerlauf VALUES ('N-427', 1975, '003', 'w', 6220, 67, '2026-10-04');
INSERT INTO ExportVerlauf VALUES ('N-427', 1975, '003', 'w', 5770, 59, '2026-10-05');
INSERT INTO ExportVerlauf VALUES ('N-482', 1975, '003', 'm', 10230, 71, '2026-10-04');
INSERT INTO ExportVerlauf VALUES ('N-482', 1975, '003', 'm', 7210, 64, '2026-10-05');
INSERT INTO ExportVerlauf VALUES ('N-523', 2001, '004', 'm', 8110, 62, '2026-10-02');
INSERT INTO ExportVerlauf VALUES ('N-523', 2001, '004', 'm', 8350, 70, '2026-10-03');
INSERT INTO ExportVerlauf VALUES ('N-523', 2001, '004', 'm', 6280, 67, '2026-10-04');
INSERT INTO ExportVerlauf VALUES ('N-523', 2001, '004', 'm', 12960, 68, '2026-10-05');
INSERT INTO ExportVerlauf VALUES ('N-581', 2007, '005', 'w', 10000, 60, '2026-10-02');
INSERT INTO ExportVerlauf VALUES ('N-581', 2007, '005', 'w', 8010, 63, '2026-10-03');
INSERT INTO ExportVerlauf VALUES ('N-581', 2007, '005', 'w', 13180, 56, '2026-10-04');
INSERT INTO ExportVerlauf VALUES ('N-581', 2007, '005', 'w', 2590, 59, '2026-10-05');
INSERT INTO ExportVerlauf VALUES ('N-596', 1963, '006', 'm', 9680, 66, '2026-10-05');
INSERT INTO ExportVerlauf VALUES ('N-600', 1998, '001', 'm', 11750, 67, '2026-10-03');
INSERT INTO ExportVerlauf VALUES ('N-600', 1998, '001', 'm', 4480, 65, '2026-10-04');
INSERT INTO ExportVerlauf VALUES ('N-600', 1998, '001', 'm', 5190, 59, '2026-10-05');
INSERT INTO ExportVerlauf VALUES ('N-651', 2001, '004', 'm', 5560, 69, '2026-10-03');
INSERT INTO ExportVerlauf VALUES ('N-651', 2001, '004', 'm', 11310, 68, '2026-10-04');
INSERT INTO ExportVerlauf VALUES ('N-651', 2001, '004', 'm', 6400, 63, '2026-10-05');
INSERT INTO ExportVerlauf VALUES ('N-652', 2001, '004', 'w', 12170, NULL, '2026-10-03');
INSERT INTO ExportVerlauf VALUES ('N-652', 2001, '004', 'w', 9630, 60, '2026-10-04');
INSERT INTO ExportVerlauf VALUES ('N-652', 2001, '004', 'w', 8610, 62, '2026-10-05');
INSERT INTO ExportVerlauf VALUES ('N-687', 1949, '004', 'm', 1830, 69, '2026-10-02');
INSERT INTO ExportVerlauf VALUES ('N-687', 1949, '004', 'm', 3150, 72, '2026-10-03');
INSERT INTO ExportVerlauf VALUES ('N-687', 1949, '004', 'm', 8750, 79, '2026-10-04');
INSERT INTO ExportVerlauf VALUES ('N-687', 1949, '004', 'm', 6200, 76, '2026-10-05');
INSERT INTO ExportVerlauf VALUES ('N-700', 1963, '002', 'w', 2000, NULL, '2026-10-05');
INSERT INTO ExportVerlauf VALUES ('N-778', 1963, '002', 'm', 5020, 69, '2026-10-04');
INSERT INTO ExportVerlauf VALUES ('N-778', 1963, '002', 'm', 4830, 71, '2026-10-05');
INSERT INTO ExportVerlauf VALUES ('N-798', 2001, '004', 'w', 15860, 62, '2026-10-03');
INSERT INTO ExportVerlauf VALUES ('N-798', 2001, '004', 'w', 7700, 57, '2026-10-04');
INSERT INTO ExportVerlauf VALUES ('N-798', 2001, '004', 'w', 10190, 63, '2026-10-05');
INSERT INTO ExportVerlauf VALUES ('N-847', 1958, '006', 'w', 10570, 70, '2026-10-04');
INSERT INTO ExportVerlauf VALUES ('N-847', 1958, '006', 'w', 13320, 73, '2026-10-05');
INSERT INTO ExportVerlauf VALUES ('N-852', 2007, '005', 'm', 4610, 55, '2026-10-03');
INSERT INTO ExportVerlauf VALUES ('N-852', 2007, '005', 'm', 6250, NULL, '2026-10-04');
INSERT INTO ExportVerlauf VALUES ('N-852', 2007, '005', 'm', 10260, 62, '2026-10-05');
INSERT INTO ExportVerlauf VALUES ('N-877', 2007, '005', 'm', 4530, 60, '2026-10-03');
INSERT INTO ExportVerlauf VALUES ('N-877', 2007, '005', 'm', 6530, NULL, '2026-10-04');
INSERT INTO ExportVerlauf VALUES ('N-877', 2007, '005', 'm', 13980, 61, '2026-10-05');
INSERT INTO ExportVerlauf VALUES ('N-880', 1985, '003', 'w', 6190, 65, '2026-10-04');
INSERT INTO ExportVerlauf VALUES ('N-880', 1985, '003', 'w', 5030, NULL, '2026-10-05');
INSERT INTO ExportVerlauf VALUES ('N-888', 1975, '003', 'w', 13720, 74, '2026-10-04');
INSERT INTO ExportVerlauf VALUES ('N-888', 1975, '003', 'w', 6810, 64, '2026-10-05');

COMMIT;
