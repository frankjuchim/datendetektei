-- =====================================================================
-- Datendetektei Weserstedt · Verhör-Kontext V4 „Musikschule“ (Verhör 4, Akte 4)
-- Nur für das Verhör (nie öffentlich unter /db/). Die Musikschule Weserstedt hat ihre Anmeldungen bisher in einer
-- Tabellenkalkulation gepflegt: je Zeile eine Schülerin oder ein Schüler mit Instrument(en), Lehrkraft samt
-- Telefonnummer, Unterrichtsraum, Tarif und Monatsgebühr. Vor der Umstellung auf eine Datenbank wird die Liste
-- begutachtet (Redundanz, Anomalien, Schlüssel, Zerlegung).
-- Kurzschreibweise:
--   UnterrichtRoh(Schueler, Geburtsjahr, Instrumente, Lehrkraft, LehrkraftTelefon, Raum, Tarif, Monatsgebuehr)
--                                                          – ohne Schlüssel (Lerngegenstand)
--   LehrkraftRaum(LehrkraftNr, Name, Telefon, Raum, Etage)  – zusammengelegte Tabelle
--   Raum(Raum, Etage)                                       – Vergleichstabelle ohne mögliche Anomalie
-- =====================================================================

PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS Raum;
DROP TABLE IF EXISTS LehrkraftRaum;
DROP TABLE IF EXISTS UnterrichtRoh;

-- Rohliste: absichtlich ohne Primärschlüssel, ohne CHECKs, mit nicht-atomaren Werten.
CREATE TABLE UnterrichtRoh (
  Schueler         TEXT,      -- 'Vorname Nachname'
  Geburtsjahr      INTEGER,
  Instrumente      TEXT,      -- teils mehrere, durch Komma getrennt
  Lehrkraft        TEXT,      -- in derselben Reihenfolge wie Instrumente
  LehrkraftTelefon TEXT,      -- redundant zur Lehrkraft
  Raum             TEXT,      -- Unterrichtsraum der Lehrkraft
  Tarif            TEXT,      -- 'Kind', 'Jugend', 'Erwachsen', 'Geschwister'
  Monatsgebuehr    REAL       -- redundant zum Tarif (→ Änderungsanomalie)
);

-- Zusammengelegte Tabelle: Lehrkraft und ihr Raum samt Etage (Raum → Etage ist eine Abhängigkeit unter Nicht-
-- Schlüsselattributen; zwei Lehrkräfte im selben Raum → Etage doppelt gespeichert).
CREATE TABLE LehrkraftRaum (
  LehrkraftNr INTEGER PRIMARY KEY,
  Name        TEXT    NOT NULL,
  Telefon     TEXT    NOT NULL CHECK (Telefon LIKE '0000-%'),
  Raum        TEXT    NOT NULL,
  Etage       TEXT    NOT NULL CHECK (Etage IN ('EG', '1. OG', '2. OG'))
);

-- Vergleichstabelle: jede Information genau einmal, keine Anomalie möglich.
CREATE TABLE Raum (
  Raum  TEXT PRIMARY KEY,
  Etage TEXT NOT NULL CHECK (Etage IN ('EG', '1. OG', '2. OG'))
);
