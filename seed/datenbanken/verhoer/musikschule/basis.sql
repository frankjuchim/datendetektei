-- =====================================================================
-- Datendetektei Weserstedt · basis.sql der Übungsdatenbank „verhoer/musikschule“
-- ERZEUGT von scripts/db_bauen.js (npm run db) – nicht von Hand ändern.
-- Datenbank: verhoer/musikschule
-- Seed: datendetektei:verhoer/musikschule:v1 (FNV-1a 0xfb9fe4b6) – kuratiert, kein Generator
-- Version: 1
-- SHA-256 (Datenteil): d0947b7956f31ca7dc279f252e6f4a20248e2f7925c25d52d12fbc04a9c2e07a
-- =====================================================================

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

-- ===== Daten (erzeugt) =====
BEGIN;
PRAGMA defer_foreign_keys = ON;

-- UnterrichtRoh: 30 Zeilen
INSERT INTO UnterrichtRoh VALUES ('Lotta Renken', 2013, 'Klavier', 'Jana Albers', '0000-41207', 'Klavierzimmer', 'Jugend', 36.0);
INSERT INTO UnterrichtRoh VALUES ('Finn Wilms', 2016, 'Gitarre', 'Heiko Bargmann', '0000-52318', 'Bandraum', 'Kind', 32.0);
INSERT INTO UnterrichtRoh VALUES ('Hanna Diekmann', 1987, 'Gesang', 'Jana Albers', '0000-41207', 'Klavierzimmer', 'Erwachsen', 45.0);
INSERT INTO UnterrichtRoh VALUES ('Mira Lindemann', 2011, 'Geige', 'Marit Osterloh', '0000-36054', 'Studio', 'Jugend', 36.0);
INSERT INTO UnterrichtRoh VALUES ('Jarne Pundt', 2009, 'Schlagzeug', 'Linus Hedden', '0000-63095', 'Bandraum', 'Jugend', 36.0);
INSERT INTO UnterrichtRoh VALUES ('Pia Kück', 2017, 'Querflöte', 'Okke Tebbe', '0000-27461', 'Konzertsaal', 'Geschwister', 28.0);
INSERT INTO UnterrichtRoh VALUES ('Emil Kück', 2015, 'Gitarre', 'Heiko Bargmann', '0000-52318', 'Bandraum', 'Geschwister', 28.0);
INSERT INTO UnterrichtRoh VALUES ('Taalke Haake', 2012, 'Cello', 'Swantje Uphoff', '0000-19736', 'Streicherzimmer', 'Jugend', 36.0);
INSERT INTO UnterrichtRoh VALUES ('Sönke Engelken', 1979, 'Klavier', 'Okke Tebbe', '0000-27461', 'Konzertsaal', 'Erwachsen', 45.0);
INSERT INTO UnterrichtRoh VALUES ('Ida Mammen', 2014, 'Klavier, Gesang', 'Jana Albers, Jana Albers', '0000-41207, 0000-41207', 'Klavierzimmer, Klavierzimmer', 'Jugend', 36.0);
INSERT INTO UnterrichtRoh VALUES ('Rune Ohlrogge', 2010, 'Gitarre', 'Heiko Bargmann', '0000-52318', 'Bandraum', 'Jugend', 36.0);
INSERT INTO UnterrichtRoh VALUES ('Greta Saathoff', 2018, 'Geige', 'Marit Osterloh', '0000-36054', 'Studio', 'Kind', 32.0);
INSERT INTO UnterrichtRoh VALUES ('Jarne Pundt', 2009, 'Gitarre', 'Heiko Bargmann', '0000-52318', 'Bandraum', 'Jugend', 36.0);
INSERT INTO UnterrichtRoh VALUES ('Lotta Renken', 2013, 'Klavier', 'Okke Tebbe', '0000-27461', 'Konzertsaal', 'Jugend', 36.0);
INSERT INTO UnterrichtRoh VALUES ('Nele Wöltjen', 2004, 'Gesang', 'Jana Albers', '0000-41207', 'Klavierzimmer', 'Erwachsen', 45.0);
INSERT INTO UnterrichtRoh VALUES ('Jasper Holtorf', 2011, 'Gitarre, Schlagzeug', 'Heiko Bargmann, Linus Hedden', '0000-52318, 0000-63095', 'Bandraum, Bandraum', 'Jugend', 36.0);
INSERT INTO UnterrichtRoh VALUES ('Levke Bohlken', 2010, 'Querflöte', 'Okke Tebbe', '0000-27461', 'Konzertsaal', 'Jugend', 38.0);
INSERT INTO UnterrichtRoh VALUES ('Bente Kolthoff', 1992, 'Klavier', 'Jana Albers', '0000-41207', 'Klavierzimmer', 'Erwachsen', 45.0);
INSERT INTO UnterrichtRoh VALUES ('Milan Gerdts', 2016, 'Schlagzeug', 'Linus Hedden', '0000-63095', 'Bandraum', 'Kind', 32.0);
INSERT INTO UnterrichtRoh VALUES ('Mira Lindemann', 2007, 'Querflöte', 'Okke Tebbe', '0000-27461', 'Konzertsaal', 'Erwachsen', 45.0);
INSERT INTO UnterrichtRoh VALUES ('Clara Zurborg', 2019, 'Klavier', 'Okke Tebbe', '0000-27461', 'Konzertsaal', 'Kind', 32.0);
INSERT INTO UnterrichtRoh VALUES ('Enno Thölken', 2012, 'Geige, Querflöte', 'Marit Osterloh, Okke Tebbe', '0000-36054, 0000-27461', 'Studio, Konzertsaal', 'Jugend', 36.0);
INSERT INTO UnterrichtRoh VALUES ('Frieda Habben', 2014, 'Gesang', 'Jana Albers', '0000-41207', 'Klavierzimmer', 'Jugend', 36.0);
INSERT INTO UnterrichtRoh VALUES ('Sönke Engelken', 1979, 'Gitarre', 'Heiko Bargmann', '0000-52318', 'Bandraum', 'Erwachsen', 45.0);
INSERT INTO UnterrichtRoh VALUES ('Yara Okafor', 2015, 'Geige', 'Marit Osterloh', '0000-36054', 'Studio', 'Kind', 32.0);
INSERT INTO UnterrichtRoh VALUES ('Joris Schwarting', 2013, 'Schlagzeug', 'Linus Hedden', '0000-63095', 'Bandraum', 'Jugend', 36.0);
INSERT INTO UnterrichtRoh VALUES ('Insa Rippen', 1998, 'Gitarre', 'Heiko Bargmann', '0000-52318', 'Bandraum', 'Erwachsen', 45.0);
INSERT INTO UnterrichtRoh VALUES ('Pia Kück', 2017, 'Klavier', 'Okke Tebbe', '0000-27461', 'Konzertsaal', 'Geschwister', 28.0);
INSERT INTO UnterrichtRoh VALUES ('Lasse Meinecke', 2010, 'Geige', 'Marit Osterloh', '0000-36054', 'Studio', 'Jugend', 36.0);
INSERT INTO UnterrichtRoh VALUES ('Greta Saathoff', 2018, 'Gitarre', 'Heiko Bargmann', '0000-52318', 'Bandraum', 'Kind', 32.0);

-- LehrkraftRaum: 6 Zeilen
INSERT INTO LehrkraftRaum VALUES (1, 'Jana Albers', '0000-41207', 'Klavierzimmer', '1. OG');
INSERT INTO LehrkraftRaum VALUES (2, 'Okke Tebbe', '0000-27461', 'Konzertsaal', 'EG');
INSERT INTO LehrkraftRaum VALUES (3, 'Heiko Bargmann', '0000-52318', 'Bandraum', 'EG');
INSERT INTO LehrkraftRaum VALUES (4, 'Linus Hedden', '0000-63095', 'Bandraum', 'EG');
INSERT INTO LehrkraftRaum VALUES (5, 'Marit Osterloh', '0000-36054', 'Studio', '2. OG');
INSERT INTO LehrkraftRaum VALUES (6, 'Swantje Uphoff', '0000-19736', 'Streicherzimmer', '1. OG');

-- Raum: 5 Zeilen
INSERT INTO Raum VALUES ('Bandraum', 'EG');
INSERT INTO Raum VALUES ('Klavierzimmer', '1. OG');
INSERT INTO Raum VALUES ('Konzertsaal', 'EG');
INSERT INTO Raum VALUES ('Streicherzimmer', '1. OG');
INSERT INTO Raum VALUES ('Studio', '2. OG');

COMMIT;
