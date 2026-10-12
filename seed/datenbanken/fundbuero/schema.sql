-- =====================================================================
-- Datendetektei Weserstedt · Übungsdatenbank „Fundbuero“ (Akte 1)
-- Schema (SQLite). Konventionen: seed/datenbanken/LIESMICH.md
-- Kurzschreibweise:
--   Fundsache(FundNr, Bezeichnung, Kategorie, Farbe, Fundort, Stadtteil,
--             Funddatum, Wert, Finder, AbgeholtAm)          PK: FundNr
-- =====================================================================

PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS Fundsache;

CREATE TABLE Fundsache (
  FundNr      INTEGER PRIMARY KEY,                 -- Eingangsnummer des Fundbuchs
  Bezeichnung TEXT    NOT NULL,
  Kategorie   TEXT    NOT NULL
              CHECK (Kategorie IN ('Schlüssel', 'Elektronik', 'Kleidung', 'Schmuck',
                                   'Taschen', 'Dokumente', 'Fahrradzubehör', 'Spielzeug',
                                   'Wertsachen', 'Sonstiges')),
  Farbe       TEXT,                                -- NULL = nicht erfasst
  Fundort     TEXT    NOT NULL,
  Stadtteil   TEXT    NOT NULL
              CHECK (Stadtteil IN ('Altstadt', 'Hafenviertel', 'Weserufer', 'Mühlenfeld',
                                   'Nordheide', 'Lindenhof', 'Deichkamp', 'Bahnhofsviertel')),
  Funddatum   TEXT    NOT NULL CHECK (Funddatum LIKE '____-__-__'),
  Wert        REAL    CHECK (Wert IS NULL OR Wert >= 0),   -- geschätzt in Euro, NULL = unbekannt
  Finder      TEXT,                                -- 'V. Nachname', NULL = anonym abgegeben
  AbgeholtAm  TEXT    CHECK (AbgeholtAm IS NULL OR AbgeholtAm LIKE '____-__-__')
  -- bewusst KEIN CHECK (AbgeholtAm >= Funddatum): die Variante 'grenze' und Fehler-Aufgaben brauchen Freiheit
);
