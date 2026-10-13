-- =====================================================================
-- Datendetektei Weserstedt · basis.sql der Übungsdatenbank „pruefung/sanitaetsdienst“
-- ERZEUGT von scripts/db_bauen.js (npm run db) – nicht von Hand ändern.
-- Datenbank: pruefung/sanitaetsdienst
-- Seed: datendetektei:pruefung/sanitaetsdienst:v1 (FNV-1a 0x1cc0e5cb) – kuratiert, kein Generator
-- Version: 1
-- SHA-256 (Datenteil): 32fdca7c1b531da5c3a9d5d434edb2cce0a8230697845d9c8cb63fb1e203f585
-- =====================================================================

-- =====================================================================
-- Datendetektei Weserstedt · Prüfungs-Kontext „Schulsanitätsdienst“ (Klausur eA: Aufgabe A + B, gA: A + B-gA;
-- Akte 7). Nur für Klausur-Material und Erwartungshorizonte (nie öffentlich unter /db/, nicht zur Laufzeit geladen).
-- Der Schulsanitätsdienst einer Oberschule dokumentiert seine Einsätze bei Unfällen und Erkrankungen im Schulalltag:
-- wer eingesetzt war (in welcher Rolle), wo und wann der Einsatz stattfand und welches Material verbraucht wurde.
-- Neue Mitglieder werden von einer erfahrenen Sanitäterin bzw. einem erfahrenen Sanitäter betreut (BetreuerNr
-- verweist auf Sanitaeter.SanNr – rekursive Beziehung betreut, abweichender Name; Leitung ohne Betreuer = NULL).
-- EinsatzListe ist eine zusammengelegte Tabelle OHNE Schlüssel (alte Tabellenkalkulation, Material für Anomalien),
-- AusbildungRoh eine Rohliste mit nicht-atomaren Werten (Material der Aufgabe B-gA).
-- Kurzschreibweise:
--   Sanitaeter(SanNr, Vorname, Nachname, Klasse, Stufe, ↑BetreuerNr)
--   Einsatz(EinsatzNr, Datum, Uhrzeit, Ort, Art)
--   eingesetzt(↑SanNr, ↑EinsatzNr, Rolle)              PK: SanNr, EinsatzNr
--   Material(MatNr, Bezeichnung, Bestand)
--   verbraucht(↑EinsatzNr, ↑MatNr, Menge)              PK: EinsatzNr, MatNr
--   EinsatzListe(EinsatzNr, Datum, Ort, SanNr, Name, Klasse, Rolle)              ohne Schlüssel
--   AusbildungRoh(SanNr, Name, Kurse, Referent, RefTelefon, Raum)                 ohne Schlüssel
-- =====================================================================

PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS AusbildungRoh;
DROP TABLE IF EXISTS EinsatzListe;
DROP TABLE IF EXISTS verbraucht;
DROP TABLE IF EXISTS Material;
DROP TABLE IF EXISTS eingesetzt;
DROP TABLE IF EXISTS Einsatz;
DROP TABLE IF EXISTS Sanitaeter;

CREATE TABLE Sanitaeter (
  SanNr      INTEGER PRIMARY KEY,
  Vorname    TEXT    NOT NULL,
  Nachname   TEXT    NOT NULL,
  Klasse     TEXT    NOT NULL,
  Stufe      TEXT    NOT NULL CHECK (Stufe IN ('Anfänger', 'Fortgeschritten', 'Leitung')),
  BetreuerNr INTEGER,                                 -- NULL = ohne Betreuung (Leitung)
  FOREIGN KEY (BetreuerNr) REFERENCES Sanitaeter(SanNr)
);

CREATE TABLE Einsatz (
  EinsatzNr INTEGER PRIMARY KEY,
  Datum     TEXT    NOT NULL CHECK (Datum LIKE '____-__-__'),
  Uhrzeit   TEXT    NOT NULL CHECK (Uhrzeit LIKE '__:__'),
  Ort       TEXT    NOT NULL CHECK (Ort IN ('Sporthalle', 'Sporthallenflur', 'Pausenhof', 'Mensa', 'Klassenraum',
                                            'Treppenhaus')),
  Art       TEXT    NOT NULL CHECK (Art IN ('Sportunfall', 'Kreislauf', 'Schnittwunde', 'Prellung', 'Sonstiges'))
);

CREATE TABLE eingesetzt (
  SanNr     INTEGER NOT NULL,
  EinsatzNr INTEGER NOT NULL,
  Rolle     TEXT    NOT NULL CHECK (Rolle IN ('Ersthelfer', 'Assistenz', 'Dokumentation')),
  PRIMARY KEY (SanNr, EinsatzNr),
  FOREIGN KEY (SanNr) REFERENCES Sanitaeter(SanNr),
  FOREIGN KEY (EinsatzNr) REFERENCES Einsatz(EinsatzNr)
);

CREATE TABLE Material (
  MatNr       INTEGER PRIMARY KEY,
  Bezeichnung TEXT    NOT NULL,
  Bestand     INTEGER NOT NULL CHECK (Bestand >= 0)
);

CREATE TABLE verbraucht (
  EinsatzNr INTEGER NOT NULL,
  MatNr     INTEGER NOT NULL,
  Menge     INTEGER NOT NULL CHECK (Menge > 0),
  PRIMARY KEY (EinsatzNr, MatNr),
  FOREIGN KEY (EinsatzNr) REFERENCES Einsatz(EinsatzNr),
  FOREIGN KEY (MatNr) REFERENCES Material(MatNr)
);

CREATE TABLE EinsatzListe (
  EinsatzNr INTEGER,
  Datum     TEXT,
  Ort       TEXT,
  SanNr     INTEGER,
  Name      TEXT,
  Klasse    TEXT,
  Rolle     TEXT
);

-- Rohliste: absichtlich ohne Schlüssel, mit nicht-atomaren Werten (Kurse, Referent, RefTelefon).
CREATE TABLE AusbildungRoh (
  SanNr      INTEGER,
  Name       TEXT,
  Kurse      TEXT,
  Referent   TEXT,
  RefTelefon TEXT,
  Raum       TEXT
);

-- ===== Daten (erzeugt) =====
BEGIN;
PRAGMA defer_foreign_keys = ON;

-- Sanitaeter: 18 Zeilen
INSERT INTO Sanitaeter VALUES (1, 'Tjark', 'Holtorf', '12b', 'Leitung', NULL);
INSERT INTO Sanitaeter VALUES (2, 'Svea', 'Möhlmann', '12a', 'Leitung', NULL);
INSERT INTO Sanitaeter VALUES (3, 'Keno', 'Ahrensfeld', '11c', 'Fortgeschritten', 1);
INSERT INTO Sanitaeter VALUES (4, 'Marit', 'Lienemann', '11a', 'Fortgeschritten', 2);
INSERT INTO Sanitaeter VALUES (5, 'Rune', 'Kahrs', '11b', 'Fortgeschritten', 1);
INSERT INTO Sanitaeter VALUES (6, 'Frieda', 'Glander', '10a', 'Fortgeschritten', 2);
INSERT INTO Sanitaeter VALUES (7, 'Enno', 'Stelljes', '10c', 'Fortgeschritten', 1);
INSERT INTO Sanitaeter VALUES (8, 'Jule', 'Witte', '10b', 'Anfänger', 3);
INSERT INTO Sanitaeter VALUES (9, 'Linus', 'Vosgerau', '9a', 'Anfänger', 4);
INSERT INTO Sanitaeter VALUES (10, 'Taalke', 'Hedden', '9c', 'Anfänger', 5);
INSERT INTO Sanitaeter VALUES (11, 'Yara', 'Haddad', '9b', 'Anfänger', 6);
INSERT INTO Sanitaeter VALUES (12, 'Okke', 'Zurborg', '10a', 'Anfänger', 3);
INSERT INTO Sanitaeter VALUES (13, 'Nika', 'Kowalski', '9a', 'Anfänger', 4);
INSERT INTO Sanitaeter VALUES (14, 'Jarne', 'Rippen', '8b', 'Anfänger', 7);
INSERT INTO Sanitaeter VALUES (15, 'Lale', 'Demir', '8c', 'Anfänger', 6);
INSERT INTO Sanitaeter VALUES (16, 'Mats', 'Engelken', '8a', 'Anfänger', 5);
INSERT INTO Sanitaeter VALUES (17, 'Tomke', 'Beckhusen', '8b', 'Anfänger', 7);
INSERT INTO Sanitaeter VALUES (18, 'Ilias', 'Nordhoff', '9c', 'Anfänger', 2);

-- Einsatz: 46 Zeilen
INSERT INTO Einsatz VALUES (1, '2026-11-02', '09:40', 'Pausenhof', 'Prellung');
INSERT INTO Einsatz VALUES (2, '2026-11-04', '10:15', 'Sporthalle', 'Sportunfall');
INSERT INTO Einsatz VALUES (3, '2026-11-06', '13:05', 'Klassenraum', 'Kreislauf');
INSERT INTO Einsatz VALUES (4, '2026-11-10', '08:20', 'Sporthalle', 'Sportunfall');
INSERT INTO Einsatz VALUES (5, '2026-11-12', '11:30', 'Treppenhaus', 'Prellung');
INSERT INTO Einsatz VALUES (6, '2026-11-13', '12:45', 'Mensa', 'Schnittwunde');
INSERT INTO Einsatz VALUES (7, '2026-11-17', '09:50', 'Sporthalle', 'Sportunfall');
INSERT INTO Einsatz VALUES (8, '2026-11-19', '10:05', 'Pausenhof', 'Sonstiges');
INSERT INTO Einsatz VALUES (9, '2026-11-20', '14:10', 'Sporthalle', 'Sportunfall');
INSERT INTO Einsatz VALUES (10, '2026-11-24', '11:15', 'Klassenraum', 'Schnittwunde');
INSERT INTO Einsatz VALUES (11, '2026-11-26', '08:40', 'Sporthalle', 'Kreislauf');
INSERT INTO Einsatz VALUES (12, '2026-11-30', '12:20', 'Pausenhof', 'Prellung');
INSERT INTO Einsatz VALUES (13, '2026-12-02', '10:25', 'Sporthalle', 'Sportunfall');
INSERT INTO Einsatz VALUES (14, '2026-12-04', '09:35', 'Mensa', 'Kreislauf');
INSERT INTO Einsatz VALUES (15, '2026-12-08', '13:15', 'Sporthalle', 'Sportunfall');
INSERT INTO Einsatz VALUES (16, '2026-12-10', '11:50', 'Treppenhaus', 'Prellung');
INSERT INTO Einsatz VALUES (17, '2026-12-14', '08:10', 'Klassenraum', 'Sonstiges');
INSERT INTO Einsatz VALUES (18, '2026-12-16', '10:40', 'Pausenhof', 'Schnittwunde');
INSERT INTO Einsatz VALUES (19, '2026-12-18', '09:05', 'Sporthalle', 'Sportunfall');
INSERT INTO Einsatz VALUES (20, '2026-12-21', '12:30', 'Mensa', 'Kreislauf');
INSERT INTO Einsatz VALUES (21, '2027-01-04', '08:50', 'Sporthalle', 'Sportunfall');
INSERT INTO Einsatz VALUES (22, '2027-01-04', '12:10', 'Treppenhaus', 'Prellung');
INSERT INTO Einsatz VALUES (23, '2027-01-08', '10:20', 'Pausenhof', 'Prellung');
INSERT INTO Einsatz VALUES (24, '2027-01-11', '09:25', 'Sporthallenflur', 'Prellung');
INSERT INTO Einsatz VALUES (25, '2027-01-13', '13:40', 'Sporthalle', 'Sportunfall');
INSERT INTO Einsatz VALUES (26, '2027-01-15', '12:35', 'Mensa', 'Kreislauf');
INSERT INTO Einsatz VALUES (27, '2027-01-19', '10:50', 'Pausenhof', 'Schnittwunde');
INSERT INTO Einsatz VALUES (28, '2027-01-22', '08:30', 'Sporthalle', 'Kreislauf');
INSERT INTO Einsatz VALUES (29, '2027-01-26', '11:05', 'Klassenraum', 'Sonstiges');
INSERT INTO Einsatz VALUES (30, '2027-01-29', '09:55', 'Pausenhof', 'Sportunfall');
INSERT INTO Einsatz VALUES (31, '2027-02-01', '10:10', 'Sporthalle', 'Sportunfall');
INSERT INTO Einsatz VALUES (32, '2027-02-03', '12:55', 'Treppenhaus', 'Prellung');
INSERT INTO Einsatz VALUES (33, '2027-02-05', '09:15', 'Sporthalle', 'Sportunfall');
INSERT INTO Einsatz VALUES (34, '2027-02-08', '08:45', 'Sporthalle', 'Sportunfall');
INSERT INTO Einsatz VALUES (35, '2027-02-09', '12:40', 'Mensa', 'Kreislauf');
INSERT INTO Einsatz VALUES (36, '2027-02-10', '10:30', 'Pausenhof', 'Prellung');
INSERT INTO Einsatz VALUES (37, '2027-02-11', '11:20', 'Klassenraum', 'Schnittwunde');
INSERT INTO Einsatz VALUES (38, '2027-02-12', '09:00', 'Sporthalle', 'Sportunfall');
INSERT INTO Einsatz VALUES (39, '2027-02-15', '13:10', 'Sporthalle', 'Sportunfall');
INSERT INTO Einsatz VALUES (40, '2027-02-17', '10:45', 'Klassenraum', 'Kreislauf');
INSERT INTO Einsatz VALUES (41, '2027-02-18', '12:15', 'Pausenhof', 'Schnittwunde');
INSERT INTO Einsatz VALUES (42, '2027-02-19', '09:30', 'Sporthalle', 'Prellung');
INSERT INTO Einsatz VALUES (43, '2027-02-22', '11:40', 'Treppenhaus', 'Sonstiges');
INSERT INTO Einsatz VALUES (44, '2027-02-24', '08:55', 'Sporthalle', 'Sportunfall');
INSERT INTO Einsatz VALUES (45, '2027-02-25', '12:50', 'Mensa', 'Schnittwunde');
INSERT INTO Einsatz VALUES (46, '2027-02-26', '10:35', 'Pausenhof', 'Prellung');

-- eingesetzt: 94 Zeilen
INSERT INTO eingesetzt VALUES (1, 8, 'Ersthelfer');
INSERT INTO eingesetzt VALUES (1, 17, 'Ersthelfer');
INSERT INTO eingesetzt VALUES (1, 26, 'Ersthelfer');
INSERT INTO eingesetzt VALUES (1, 43, 'Ersthelfer');
INSERT INTO eingesetzt VALUES (2, 11, 'Ersthelfer');
INSERT INTO eingesetzt VALUES (2, 20, 'Ersthelfer');
INSERT INTO eingesetzt VALUES (2, 28, 'Ersthelfer');
INSERT INTO eingesetzt VALUES (2, 40, 'Ersthelfer');
INSERT INTO eingesetzt VALUES (3, 1, 'Ersthelfer');
INSERT INTO eingesetzt VALUES (3, 7, 'Ersthelfer');
INSERT INTO eingesetzt VALUES (3, 16, 'Ersthelfer');
INSERT INTO eingesetzt VALUES (3, 23, 'Ersthelfer');
INSERT INTO eingesetzt VALUES (3, 25, 'Ersthelfer');
INSERT INTO eingesetzt VALUES (3, 36, 'Ersthelfer');
INSERT INTO eingesetzt VALUES (3, 39, 'Ersthelfer');
INSERT INTO eingesetzt VALUES (3, 45, 'Ersthelfer');
INSERT INTO eingesetzt VALUES (4, 3, 'Ersthelfer');
INSERT INTO eingesetzt VALUES (4, 10, 'Ersthelfer');
INSERT INTO eingesetzt VALUES (4, 14, 'Ersthelfer');
INSERT INTO eingesetzt VALUES (4, 24, 'Ersthelfer');
INSERT INTO eingesetzt VALUES (4, 32, 'Ersthelfer');
INSERT INTO eingesetzt VALUES (4, 35, 'Ersthelfer');
INSERT INTO eingesetzt VALUES (4, 44, 'Ersthelfer');
INSERT INTO eingesetzt VALUES (5, 2, 'Ersthelfer');
INSERT INTO eingesetzt VALUES (5, 4, 'Ersthelfer');
INSERT INTO eingesetzt VALUES (5, 9, 'Ersthelfer');
INSERT INTO eingesetzt VALUES (5, 15, 'Ersthelfer');
INSERT INTO eingesetzt VALUES (5, 21, 'Ersthelfer');
INSERT INTO eingesetzt VALUES (5, 30, 'Ersthelfer');
INSERT INTO eingesetzt VALUES (5, 31, 'Ersthelfer');
INSERT INTO eingesetzt VALUES (5, 34, 'Ersthelfer');
INSERT INTO eingesetzt VALUES (5, 38, 'Ersthelfer');
INSERT INTO eingesetzt VALUES (6, 5, 'Ersthelfer');
INSERT INTO eingesetzt VALUES (6, 12, 'Ersthelfer');
INSERT INTO eingesetzt VALUES (6, 18, 'Ersthelfer');
INSERT INTO eingesetzt VALUES (6, 22, 'Ersthelfer');
INSERT INTO eingesetzt VALUES (6, 29, 'Ersthelfer');
INSERT INTO eingesetzt VALUES (6, 37, 'Ersthelfer');
INSERT INTO eingesetzt VALUES (6, 42, 'Ersthelfer');
INSERT INTO eingesetzt VALUES (7, 6, 'Ersthelfer');
INSERT INTO eingesetzt VALUES (7, 13, 'Ersthelfer');
INSERT INTO eingesetzt VALUES (7, 19, 'Ersthelfer');
INSERT INTO eingesetzt VALUES (7, 27, 'Ersthelfer');
INSERT INTO eingesetzt VALUES (7, 33, 'Ersthelfer');
INSERT INTO eingesetzt VALUES (7, 41, 'Ersthelfer');
INSERT INTO eingesetzt VALUES (7, 46, 'Ersthelfer');
INSERT INTO eingesetzt VALUES (8, 1, 'Assistenz');
INSERT INTO eingesetzt VALUES (8, 9, 'Assistenz');
INSERT INTO eingesetzt VALUES (8, 25, 'Dokumentation');
INSERT INTO eingesetzt VALUES (8, 31, 'Assistenz');
INSERT INTO eingesetzt VALUES (8, 42, 'Assistenz');
INSERT INTO eingesetzt VALUES (9, 10, 'Assistenz');
INSERT INTO eingesetzt VALUES (9, 15, 'Assistenz');
INSERT INTO eingesetzt VALUES (9, 24, 'Assistenz');
INSERT INTO eingesetzt VALUES (9, 39, 'Assistenz');
INSERT INTO eingesetzt VALUES (9, 43, 'Dokumentation');
INSERT INTO eingesetzt VALUES (10, 2, 'Assistenz');
INSERT INTO eingesetzt VALUES (10, 4, 'Dokumentation');
INSERT INTO eingesetzt VALUES (10, 19, 'Assistenz');
INSERT INTO eingesetzt VALUES (10, 29, 'Dokumentation');
INSERT INTO eingesetzt VALUES (10, 34, 'Assistenz');
INSERT INTO eingesetzt VALUES (10, 44, 'Assistenz');
INSERT INTO eingesetzt VALUES (11, 5, 'Assistenz');
INSERT INTO eingesetzt VALUES (11, 14, 'Dokumentation');
INSERT INTO eingesetzt VALUES (11, 21, 'Assistenz');
INSERT INTO eingesetzt VALUES (11, 32, 'Assistenz');
INSERT INTO eingesetzt VALUES (11, 37, 'Assistenz');
INSERT INTO eingesetzt VALUES (11, 46, 'Assistenz');
INSERT INTO eingesetzt VALUES (12, 7, 'Assistenz');
INSERT INTO eingesetzt VALUES (12, 9, 'Dokumentation');
INSERT INTO eingesetzt VALUES (12, 18, 'Assistenz');
INSERT INTO eingesetzt VALUES (12, 27, 'Assistenz');
INSERT INTO eingesetzt VALUES (12, 36, 'Assistenz');
INSERT INTO eingesetzt VALUES (13, 3, 'Dokumentation');
INSERT INTO eingesetzt VALUES (13, 12, 'Assistenz');
INSERT INTO eingesetzt VALUES (13, 20, 'Assistenz');
INSERT INTO eingesetzt VALUES (13, 28, 'Assistenz');
INSERT INTO eingesetzt VALUES (13, 34, 'Dokumentation');
INSERT INTO eingesetzt VALUES (13, 38, 'Assistenz');
INSERT INTO eingesetzt VALUES (13, 45, 'Assistenz');
INSERT INTO eingesetzt VALUES (14, 4, 'Assistenz');
INSERT INTO eingesetzt VALUES (14, 13, 'Assistenz');
INSERT INTO eingesetzt VALUES (14, 23, 'Assistenz');
INSERT INTO eingesetzt VALUES (14, 30, 'Assistenz');
INSERT INTO eingesetzt VALUES (14, 40, 'Dokumentation');
INSERT INTO eingesetzt VALUES (15, 11, 'Assistenz');
INSERT INTO eingesetzt VALUES (15, 17, 'Assistenz');
INSERT INTO eingesetzt VALUES (15, 25, 'Assistenz');
INSERT INTO eingesetzt VALUES (15, 33, 'Assistenz');
INSERT INTO eingesetzt VALUES (15, 37, 'Dokumentation');
INSERT INTO eingesetzt VALUES (18, 8, 'Dokumentation');
INSERT INTO eingesetzt VALUES (18, 18, 'Dokumentation');
INSERT INTO eingesetzt VALUES (18, 26, 'Assistenz');
INSERT INTO eingesetzt VALUES (18, 41, 'Assistenz');

-- Material: 12 Zeilen
INSERT INTO Material VALUES (1, 'Einmalhandschuhe (Paar)', 180);
INSERT INTO Material VALUES (2, 'Kühlpack', 24);
INSERT INTO Material VALUES (3, 'Pflaster', 250);
INSERT INTO Material VALUES (4, 'Mullbinde', 40);
INSERT INTO Material VALUES (5, 'Kompresse', 60);
INSERT INTO Material VALUES (6, 'Dreiecktuch', 15);
INSERT INTO Material VALUES (7, 'Rettungsdecke', 12);
INSERT INTO Material VALUES (8, 'Desinfektionstuch', 120);
INSERT INTO Material VALUES (9, 'Traubenzucker', 40);
INSERT INTO Material VALUES (10, 'Augenspüllösung', 6);
INSERT INTO Material VALUES (11, 'Fingerverband', 30);
INSERT INTO Material VALUES (12, 'Beatmungstuch', 8);

-- verbraucht: 167 Zeilen
INSERT INTO verbraucht VALUES (1, 1, 1);
INSERT INTO verbraucht VALUES (1, 2, 1);
INSERT INTO verbraucht VALUES (2, 1, 1);
INSERT INTO verbraucht VALUES (2, 2, 1);
INSERT INTO verbraucht VALUES (2, 6, 1);
INSERT INTO verbraucht VALUES (3, 1, 1);
INSERT INTO verbraucht VALUES (3, 9, 1);
INSERT INTO verbraucht VALUES (4, 1, 2);
INSERT INTO verbraucht VALUES (4, 2, 1);
INSERT INTO verbraucht VALUES (4, 4, 1);
INSERT INTO verbraucht VALUES (4, 5, 1);
INSERT INTO verbraucht VALUES (4, 8, 1);
INSERT INTO verbraucht VALUES (5, 1, 2);
INSERT INTO verbraucht VALUES (5, 2, 1);
INSERT INTO verbraucht VALUES (5, 3, 1);
INSERT INTO verbraucht VALUES (5, 8, 1);
INSERT INTO verbraucht VALUES (6, 1, 1);
INSERT INTO verbraucht VALUES (6, 3, 1);
INSERT INTO verbraucht VALUES (6, 4, 2);
INSERT INTO verbraucht VALUES (6, 5, 1);
INSERT INTO verbraucht VALUES (6, 8, 2);
INSERT INTO verbraucht VALUES (7, 1, 1);
INSERT INTO verbraucht VALUES (7, 2, 2);
INSERT INTO verbraucht VALUES (7, 6, 1);
INSERT INTO verbraucht VALUES (7, 8, 1);
INSERT INTO verbraucht VALUES (8, 1, 1);
INSERT INTO verbraucht VALUES (8, 3, 1);
INSERT INTO verbraucht VALUES (8, 8, 1);
INSERT INTO verbraucht VALUES (9, 1, 1);
INSERT INTO verbraucht VALUES (9, 2, 1);
INSERT INTO verbraucht VALUES (9, 4, 1);
INSERT INTO verbraucht VALUES (10, 1, 2);
INSERT INTO verbraucht VALUES (10, 3, 1);
INSERT INTO verbraucht VALUES (10, 4, 1);
INSERT INTO verbraucht VALUES (10, 5, 2);
INSERT INTO verbraucht VALUES (10, 8, 1);
INSERT INTO verbraucht VALUES (10, 11, 1);
INSERT INTO verbraucht VALUES (11, 1, 1);
INSERT INTO verbraucht VALUES (11, 7, 1);
INSERT INTO verbraucht VALUES (11, 9, 2);
INSERT INTO verbraucht VALUES (12, 1, 1);
INSERT INTO verbraucht VALUES (12, 2, 2);
INSERT INTO verbraucht VALUES (12, 3, 1);
INSERT INTO verbraucht VALUES (12, 8, 1);
INSERT INTO verbraucht VALUES (13, 1, 1);
INSERT INTO verbraucht VALUES (13, 2, 1);
INSERT INTO verbraucht VALUES (14, 1, 1);
INSERT INTO verbraucht VALUES (14, 9, 2);
INSERT INTO verbraucht VALUES (15, 1, 1);
INSERT INTO verbraucht VALUES (15, 2, 1);
INSERT INTO verbraucht VALUES (15, 3, 1);
INSERT INTO verbraucht VALUES (15, 4, 2);
INSERT INTO verbraucht VALUES (15, 6, 1);
INSERT INTO verbraucht VALUES (16, 1, 1);
INSERT INTO verbraucht VALUES (16, 2, 1);
INSERT INTO verbraucht VALUES (17, 1, 1);
INSERT INTO verbraucht VALUES (17, 8, 1);
INSERT INTO verbraucht VALUES (17, 11, 2);
INSERT INTO verbraucht VALUES (18, 1, 2);
INSERT INTO verbraucht VALUES (18, 3, 3);
INSERT INTO verbraucht VALUES (18, 4, 2);
INSERT INTO verbraucht VALUES (18, 5, 3);
INSERT INTO verbraucht VALUES (18, 8, 3);
INSERT INTO verbraucht VALUES (18, 11, 2);
INSERT INTO verbraucht VALUES (19, 1, 2);
INSERT INTO verbraucht VALUES (19, 2, 1);
INSERT INTO verbraucht VALUES (19, 5, 1);
INSERT INTO verbraucht VALUES (19, 6, 1);
INSERT INTO verbraucht VALUES (20, 1, 2);
INSERT INTO verbraucht VALUES (20, 7, 1);
INSERT INTO verbraucht VALUES (20, 9, 2);
INSERT INTO verbraucht VALUES (21, 1, 2);
INSERT INTO verbraucht VALUES (21, 2, 1);
INSERT INTO verbraucht VALUES (21, 3, 1);
INSERT INTO verbraucht VALUES (21, 4, 1);
INSERT INTO verbraucht VALUES (21, 8, 1);
INSERT INTO verbraucht VALUES (22, 1, 1);
INSERT INTO verbraucht VALUES (22, 2, 1);
INSERT INTO verbraucht VALUES (22, 3, 1);
INSERT INTO verbraucht VALUES (23, 1, 1);
INSERT INTO verbraucht VALUES (23, 2, 1);
INSERT INTO verbraucht VALUES (24, 1, 1);
INSERT INTO verbraucht VALUES (24, 2, 2);
INSERT INTO verbraucht VALUES (25, 1, 1);
INSERT INTO verbraucht VALUES (25, 2, 1);
INSERT INTO verbraucht VALUES (25, 4, 2);
INSERT INTO verbraucht VALUES (25, 6, 1);
INSERT INTO verbraucht VALUES (26, 1, 1);
INSERT INTO verbraucht VALUES (26, 9, 1);
INSERT INTO verbraucht VALUES (27, 1, 2);
INSERT INTO verbraucht VALUES (27, 3, 3);
INSERT INTO verbraucht VALUES (27, 4, 1);
INSERT INTO verbraucht VALUES (27, 5, 2);
INSERT INTO verbraucht VALUES (27, 8, 2);
INSERT INTO verbraucht VALUES (28, 1, 1);
INSERT INTO verbraucht VALUES (28, 9, 2);
INSERT INTO verbraucht VALUES (29, 1, 1);
INSERT INTO verbraucht VALUES (29, 8, 1);
INSERT INTO verbraucht VALUES (29, 10, 1);
INSERT INTO verbraucht VALUES (29, 11, 2);
INSERT INTO verbraucht VALUES (30, 1, 1);
INSERT INTO verbraucht VALUES (30, 2, 1);
INSERT INTO verbraucht VALUES (31, 1, 1);
INSERT INTO verbraucht VALUES (31, 2, 1);
INSERT INTO verbraucht VALUES (31, 5, 1);
INSERT INTO verbraucht VALUES (31, 6, 1);
INSERT INTO verbraucht VALUES (31, 8, 1);
INSERT INTO verbraucht VALUES (32, 1, 2);
INSERT INTO verbraucht VALUES (32, 2, 1);
INSERT INTO verbraucht VALUES (32, 3, 1);
INSERT INTO verbraucht VALUES (32, 8, 1);
INSERT INTO verbraucht VALUES (33, 1, 2);
INSERT INTO verbraucht VALUES (33, 2, 1);
INSERT INTO verbraucht VALUES (33, 3, 1);
INSERT INTO verbraucht VALUES (33, 4, 1);
INSERT INTO verbraucht VALUES (33, 5, 2);
INSERT INTO verbraucht VALUES (33, 6, 1);
INSERT INTO verbraucht VALUES (34, 1, 2);
INSERT INTO verbraucht VALUES (34, 2, 2);
INSERT INTO verbraucht VALUES (34, 4, 1);
INSERT INTO verbraucht VALUES (35, 1, 1);
INSERT INTO verbraucht VALUES (35, 7, 1);
INSERT INTO verbraucht VALUES (35, 9, 1);
INSERT INTO verbraucht VALUES (36, 1, 2);
INSERT INTO verbraucht VALUES (36, 2, 1);
INSERT INTO verbraucht VALUES (36, 3, 1);
INSERT INTO verbraucht VALUES (36, 8, 1);
INSERT INTO verbraucht VALUES (37, 1, 2);
INSERT INTO verbraucht VALUES (37, 3, 1);
INSERT INTO verbraucht VALUES (37, 4, 2);
INSERT INTO verbraucht VALUES (37, 5, 2);
INSERT INTO verbraucht VALUES (37, 8, 2);
INSERT INTO verbraucht VALUES (38, 1, 2);
INSERT INTO verbraucht VALUES (38, 2, 2);
INSERT INTO verbraucht VALUES (38, 3, 1);
INSERT INTO verbraucht VALUES (38, 4, 1);
INSERT INTO verbraucht VALUES (38, 6, 1);
INSERT INTO verbraucht VALUES (39, 1, 1);
INSERT INTO verbraucht VALUES (39, 2, 2);
INSERT INTO verbraucht VALUES (40, 1, 1);
INSERT INTO verbraucht VALUES (40, 9, 1);
INSERT INTO verbraucht VALUES (41, 1, 1);
INSERT INTO verbraucht VALUES (41, 3, 2);
INSERT INTO verbraucht VALUES (41, 4, 1);
INSERT INTO verbraucht VALUES (41, 5, 2);
INSERT INTO verbraucht VALUES (41, 8, 1);
INSERT INTO verbraucht VALUES (42, 1, 1);
INSERT INTO verbraucht VALUES (42, 2, 1);
INSERT INTO verbraucht VALUES (42, 3, 1);
INSERT INTO verbraucht VALUES (42, 8, 1);
INSERT INTO verbraucht VALUES (43, 1, 1);
INSERT INTO verbraucht VALUES (43, 8, 1);
INSERT INTO verbraucht VALUES (43, 10, 1);
INSERT INTO verbraucht VALUES (43, 11, 1);
INSERT INTO verbraucht VALUES (44, 1, 2);
INSERT INTO verbraucht VALUES (44, 2, 1);
INSERT INTO verbraucht VALUES (44, 4, 1);
INSERT INTO verbraucht VALUES (44, 5, 1);
INSERT INTO verbraucht VALUES (45, 1, 1);
INSERT INTO verbraucht VALUES (45, 3, 1);
INSERT INTO verbraucht VALUES (45, 4, 1);
INSERT INTO verbraucht VALUES (45, 5, 2);
INSERT INTO verbraucht VALUES (45, 8, 2);
INSERT INTO verbraucht VALUES (45, 11, 1);
INSERT INTO verbraucht VALUES (46, 1, 1);
INSERT INTO verbraucht VALUES (46, 2, 2);
INSERT INTO verbraucht VALUES (46, 8, 1);

-- EinsatzListe: 11 Zeilen
INSERT INTO EinsatzListe VALUES (34, '2027-02-08', 'Sporthalle', 5, 'Rune Kahrs', '11b', 'Ersthelfer');
INSERT INTO EinsatzListe VALUES (34, '2027-02-08', 'Sporthalle', 10, 'Taalke Hedden', '9c', 'Assistenz');
INSERT INTO EinsatzListe VALUES (34, '2027-02-08', 'Sporthalle', 13, 'Nika Kowalski', '9a', 'Dokumentation');
INSERT INTO EinsatzListe VALUES (35, '2027-02-09', 'Mensa', 4, 'Marit Lienemann', '11a', 'Ersthelfer');
INSERT INTO EinsatzListe VALUES (36, '2027-02-10', 'Pausenhof', 3, 'Keno Ahrensfeld', '11c', 'Ersthelfer');
INSERT INTO EinsatzListe VALUES (36, '2027-02-10', 'Pausenhof', 12, 'Okke Zurborg', '10a', 'Assistenz');
INSERT INTO EinsatzListe VALUES (37, '2027-02-11', 'Klassenraum', 6, 'Frieda Glander', '10a', 'Ersthelfer');
INSERT INTO EinsatzListe VALUES (37, '2027-02-11', 'Klassenraum', 11, 'Yara Haddad', '9b', 'Assistenz');
INSERT INTO EinsatzListe VALUES (37, '2027-02-11', 'Klassenraum', 15, 'Lale Demir', '8c', 'Dokumentation');
INSERT INTO EinsatzListe VALUES (38, '2027-02-12', 'Sporthalle', 5, 'Rune Kahrs', '11b', 'Ersthelfer');
INSERT INTO EinsatzListe VALUES (38, '2027-02-12', 'Sporthalle', 13, 'Nika Kowalski', '9b', 'Assistenz');

-- AusbildungRoh: 6 Zeilen
INSERT INTO AusbildungRoh VALUES (3, 'Keno Ahrensfeld', 'Erste Hilfe, AED', 'Kerstin Haake, Ulf Meinecke', '0000-3141, 0000-2718', 'R 104');
INSERT INTO AusbildungRoh VALUES (8, 'Jule Witte', 'Erste Hilfe', 'Kerstin Haake', '0000-3141', 'R 104');
INSERT INTO AusbildungRoh VALUES (9, 'Linus Vosgerau', 'Erste Hilfe, Sportverletzungen', 'Kerstin Haake, Gesa Wendelken', '0000-3141, 0000-1618', 'Sporthalle');
INSERT INTO AusbildungRoh VALUES (10, 'Taalke Hedden', 'Defi (AED), Funk', 'Ulf Meinecke, Hauke Grotelüschen', '0000-2718, 0000-5772', 'R 104');
INSERT INTO AusbildungRoh VALUES (11, 'Yara Haddad', 'AED', 'Ulf Meinecke', '0000-2781', 'R 104');
INSERT INTO AusbildungRoh VALUES (12, 'Okke Zurborg', 'Erste Hilfe, AED, Funk', 'Kerstin Haake, Ulf Meinecke, Hauke Grotelüschen', '0000-3141, 0000-2718, 0000-5772', 'R 104');

COMMIT;
