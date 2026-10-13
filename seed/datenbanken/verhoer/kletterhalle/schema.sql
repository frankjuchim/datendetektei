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
