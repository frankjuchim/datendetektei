-- =====================================================================
-- Datendetektei Weserstedt · Verhör-Kontext V1 „Stadtbibliothek“ (Verhör 1, Akte 1)
-- Nur für das Verhör (nie öffentlich unter /db/). Bestand der Stadtbibliothek Weserstedt in einer Tabelle;
-- jede Zeile ist ein Exemplar. AusgeliehenBis = Rückgabedatum, NULL = steht im Regal.
-- Autor = nur der Nachname; Preis = Wiederbeschaffungswert in Euro, NULL bei Schenkungen.
-- Kurzschreibweise:
--   Medium(MedienNr, Titel, Autor, Medienart, Genre, Erscheinungsjahr, Preis, Standort, AusgeliehenBis)
-- =====================================================================

PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS Medium;

CREATE TABLE Medium (
  MedienNr         INTEGER PRIMARY KEY,
  Titel            TEXT    NOT NULL,
  Autor            TEXT    NOT NULL,
  Medienart        TEXT    NOT NULL CHECK (Medienart IN ('Buch', 'Hörbuch', 'E-Book', 'DVD', 'Zeitschrift')),
  Genre            TEXT    NOT NULL CHECK (Genre IN ('Krimi', 'Thriller', 'Roman', 'Sachbuch', 'Kinderbuch', 'Fantasy')),
  Erscheinungsjahr INTEGER NOT NULL CHECK (Erscheinungsjahr BETWEEN 1985 AND 2026),
  Preis            REAL    CHECK (Preis > 0),                        -- NULL = Schenkung
  Standort         TEXT    NOT NULL CHECK (Standort IN ('Erdgeschoss', 'Obergeschoss', 'Kinderbereich', 'Magazin')),
  AusgeliehenBis   TEXT    CHECK (AusgeliehenBis LIKE '____-__-__')  -- NULL = verfügbar
);
