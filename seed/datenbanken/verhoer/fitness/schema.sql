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
