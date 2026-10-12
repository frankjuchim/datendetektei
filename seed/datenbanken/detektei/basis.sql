-- =====================================================================
-- Datendetektei Weserstedt · basis.sql der Übungsdatenbank „detektei“
-- ERZEUGT von scripts/db_bauen.js (npm run db) – nicht von Hand ändern.
-- Datenbank: detektei
-- Seed: datendetektei:detektei:v1 (FNV-1a 0x4f8e70e2)
-- Version: 1
-- SHA-256 (Datenteil): e8be6cbb8655fdbed4a62d6b19f59dc5e3dbeb621d2e199d11bc5dcab9b36e5f
-- =====================================================================

-- =====================================================================
-- Datendetektei Weserstedt · Übungsdatenbank „Detektei“ (Akten 5 und 6)
-- = Referenzlösung des Architekturwettbewerbs (DS 10/11)
-- Kurzschreibweise:
--   Ermittler(ErmittlerNr, Name, Dienstgrad, ↑MentorNr)          rekursiv 1:n (betreut)
--   Fall(FallNr, Titel, Eroeffnet, Status, ↑LeiterNr)
--   Person(PersonNr, Vorname, Nachname, Jahrgang, Stadtteil)
--   kennt(↑PersonNr, ↑BekannterNr, Seit)                        rekursiv n:m
--   verdaechtig(↑PersonNr, ↑FallNr, Grad)                       n:m
--   Ort(OrtNr, Bezeichnung, Stadtteil)
--   Aussage(↑PersonNr, ↑FallNr, ↑OrtNr, Zeitpunkt, Inhalt)      ternär (Person, Fall, Ort)
--                                                               PK: PersonNr, FallNr, OrtNr, Zeitpunkt
--   Beweisstueck(BeweisNr, Bezeichnung, ↑FallNr, ↑OrtNr)
-- =====================================================================

PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS Beweisstueck;
DROP TABLE IF EXISTS Aussage;
DROP TABLE IF EXISTS Ort;
DROP TABLE IF EXISTS verdaechtig;
DROP TABLE IF EXISTS kennt;
DROP TABLE IF EXISTS Person;
DROP TABLE IF EXISTS Fall;
DROP TABLE IF EXISTS Ermittler;

CREATE TABLE Ermittler (
  ErmittlerNr INTEGER PRIMARY KEY,
  Name        TEXT    NOT NULL,
  Dienstgrad  TEXT    NOT NULL CHECK (Dienstgrad IN ('Leitung', 'Senior', 'Junior', 'Praktikum', 'Ausbildung')),
  MentorNr    INTEGER,                              -- NULL: niemand betreut diese Person
  CHECK (MentorNr IS NULL OR MentorNr != ErmittlerNr),
  FOREIGN KEY (MentorNr) REFERENCES Ermittler(ErmittlerNr)
);

CREATE TABLE Fall (
  FallNr    INTEGER PRIMARY KEY,                    -- Erfassungsnummer in der neuen Datenbank
  Titel     TEXT    NOT NULL,
  Eroeffnet TEXT    NOT NULL CHECK (Eroeffnet LIKE '____-__-__'),
  Status    TEXT    NOT NULL CHECK (Status IN ('offen', 'ruht', 'abgeschlossen')),
  LeiterNr  INTEGER NOT NULL,
  FOREIGN KEY (LeiterNr) REFERENCES Ermittler(ErmittlerNr)
);

CREATE TABLE Person (
  PersonNr  INTEGER PRIMARY KEY,
  Vorname   TEXT    NOT NULL,
  Nachname  TEXT    NOT NULL,
  Jahrgang  INTEGER CHECK (Jahrgang IS NULL OR Jahrgang BETWEEN 1930 AND 2012),  -- NULL: unbekannt
  Stadtteil TEXT    CHECK (Stadtteil IS NULL OR Stadtteil IN ('Altstadt', 'Hafenviertel', 'Weserufer',
                       'Mühlenfeld', 'Nordheide', 'Lindenhof', 'Deichkamp', 'Bahnhofsviertel'))   -- NULL: unbekannt
);

-- gerichtet: PersonNr gibt an, BekannterNr zu kennen (nicht automatisch umgekehrt)
CREATE TABLE kennt (
  PersonNr    INTEGER NOT NULL,
  BekannterNr INTEGER NOT NULL,
  Seit        INTEGER CHECK (Seit IS NULL OR Seit BETWEEN 1950 AND 2026),   -- Jahr
  PRIMARY KEY (PersonNr, BekannterNr),
  CHECK (PersonNr != BekannterNr),
  FOREIGN KEY (PersonNr)    REFERENCES Person(PersonNr),
  FOREIGN KEY (BekannterNr) REFERENCES Person(PersonNr)
);

CREATE TABLE verdaechtig (
  PersonNr INTEGER NOT NULL,
  FallNr   INTEGER NOT NULL,
  Grad     TEXT    NOT NULL CHECK (Grad IN ('gering', 'mittel', 'hoch')),
  PRIMARY KEY (PersonNr, FallNr),
  FOREIGN KEY (PersonNr) REFERENCES Person(PersonNr),
  FOREIGN KEY (FallNr)   REFERENCES Fall(FallNr)
);

CREATE TABLE Ort (
  OrtNr       INTEGER PRIMARY KEY,
  Bezeichnung TEXT    NOT NULL UNIQUE,
  Stadtteil   TEXT    NOT NULL CHECK (Stadtteil IN ('Altstadt', 'Hafenviertel', 'Weserufer', 'Mühlenfeld',
                                                    'Nordheide', 'Lindenhof', 'Deichkamp', 'Bahnhofsviertel'))
);

-- ternäre Beziehung sagtAus (Person, Fall, Ort; m:n:p). Zeitpunkt gehört zum Schlüssel, weil dieselbe
-- Person im selben Fall am selben Ort mehrfach aussagen kann (Überführung mit Begründung, DS 11).
CREATE TABLE Aussage (
  PersonNr  INTEGER NOT NULL,
  FallNr    INTEGER NOT NULL,
  OrtNr     INTEGER NOT NULL,
  Zeitpunkt TEXT    NOT NULL CHECK (Zeitpunkt LIKE '____-__-__ __:__'),
  Inhalt    TEXT    NOT NULL,
  PRIMARY KEY (PersonNr, FallNr, OrtNr, Zeitpunkt),
  FOREIGN KEY (PersonNr) REFERENCES Person(PersonNr),
  FOREIGN KEY (FallNr)   REFERENCES Fall(FallNr),
  FOREIGN KEY (OrtNr)    REFERENCES Ort(OrtNr)
);

CREATE TABLE Beweisstueck (
  BeweisNr    INTEGER PRIMARY KEY,
  Bezeichnung TEXT    NOT NULL,
  FallNr      INTEGER NOT NULL,
  OrtNr       INTEGER,                              -- NULL: Fundort unbekannt
  FOREIGN KEY (FallNr) REFERENCES Fall(FallNr),
  FOREIGN KEY (OrtNr)  REFERENCES Ort(OrtNr)
);

-- ===== Daten (erzeugt) =====
BEGIN;
PRAGMA defer_foreign_keys = ON;

-- Ermittler: 12 Zeilen
INSERT INTO Ermittler VALUES (1, 'Edda Lorenz', 'Leitung', NULL);
INSERT INTO Ermittler VALUES (2, 'Juri Brandes', 'Ausbildung', 1);
INSERT INTO Ermittler VALUES (3, 'Maren Kolthoff', 'Senior', 1);
INSERT INTO Ermittler VALUES (4, 'Helge Saathoff', 'Senior', 1);
INSERT INTO Ermittler VALUES (5, 'Imke Tiemann', 'Junior', 3);
INSERT INTO Ermittler VALUES (6, 'Jannik Rippen', 'Junior', 3);
INSERT INTO Ermittler VALUES (7, 'Svea Hinners', 'Junior', 4);
INSERT INTO Ermittler VALUES (8, 'Deniz Akgül', 'Junior', 4);
INSERT INTO Ermittler VALUES (9, 'Lotta Wehrhahn', 'Praktikum', 5);
INSERT INTO Ermittler VALUES (10, 'Rasmus Uphoff', 'Praktikum', 7);
INSERT INTO Ermittler VALUES (11, 'Smilla Döscher', 'Praktikum', 5);
INSERT INTO Ermittler VALUES (12, 'Ulf Witte', 'Senior', NULL);

-- Fall: 12 Zeilen
INSERT INTO Fall VALUES (1, 'Das Fundbüro', '2026-09-21', 'offen', 3);
INSERT INTO Fall VALUES (2, 'Spur der Räder', '2026-09-22', 'offen', 4);
INSERT INTO Fall VALUES (3, 'Die Stadtfest-Kasse', '2026-09-28', 'offen', 3);
INSERT INTO Fall VALUES (4, 'Chaos im Vereinsarchiv', '2026-10-05', 'offen', 1);
INSERT INTO Fall VALUES (5, 'Die vertauschten Koffer', '2025-11-16', 'abgeschlossen', 4);
INSERT INTO Fall VALUES (6, 'Falsche Rechnungen im Hafenamt', '2026-01-03', 'abgeschlossen', 7);
INSERT INTO Fall VALUES (7, 'Der doppelte Bauantrag', '2026-01-07', 'ruht', 5);
INSERT INTO Fall VALUES (8, 'Die verschwundene Gästeliste', '2026-02-21', 'abgeschlossen', 5);
INSERT INTO Fall VALUES (9, 'Ein Konto zu viel', '2026-03-18', 'abgeschlossen', 1);
INSERT INTO Fall VALUES (10, 'Das Rätsel im Stadtarchiv', '2026-05-26', 'abgeschlossen', 12);
INSERT INTO Fall VALUES (11, 'Der stille Teilhaber', '2026-08-19', 'ruht', 5);
INSERT INTO Fall VALUES (12, 'Die Wasseruhr der Mühle', '2026-08-26', 'abgeschlossen', 8);

-- Person: 60 Zeilen
INSERT INTO Person VALUES (1, 'Fenja', 'Habben', 1959, 'Nordheide');
INSERT INTO Person VALUES (2, 'Swantje', 'Mammen', 1964, 'Altstadt');
INSERT INTO Person VALUES (3, 'Gesa', 'Zurborg', 1962, 'Hafenviertel');
INSERT INTO Person VALUES (4, 'Wiebke', 'Luttmann', 1995, 'Altstadt');
INSERT INTO Person VALUES (5, 'Gesa', 'Ohlendiek', 1967, 'Altstadt');
INSERT INTO Person VALUES (6, 'Enno', 'Osterloh', 1990, NULL);
INSERT INTO Person VALUES (7, 'Ilias', 'Haake', 1975, 'Deichkamp');
INSERT INTO Person VALUES (8, 'Bent', 'Hollwedel', 1979, 'Lindenhof');
INSERT INTO Person VALUES (9, 'Carla', 'Tebbe', 1947, 'Nordheide');
INSERT INTO Person VALUES (10, 'Gesa', 'Wachtendorf', 1960, 'Altstadt');
INSERT INTO Person VALUES (11, 'Carla', 'Eggers', 1947, 'Weserufer');
INSERT INTO Person VALUES (12, 'Levke', 'Haake', 1944, 'Mühlenfeld');
INSERT INTO Person VALUES (13, 'Nora', 'Falter', 1988, 'Hafenviertel');
INSERT INTO Person VALUES (14, 'Marit', 'Harjes', 1946, 'Weserufer');
INSERT INTO Person VALUES (15, 'Swantje', 'Dirksen', 1983, 'Deichkamp');
INSERT INTO Person VALUES (16, 'Wiebke', 'Ahrensfeld', NULL, 'Mühlenfeld');
INSERT INTO Person VALUES (17, 'Sönke', 'Ahlers', 1982, 'Deichkamp');
INSERT INTO Person VALUES (18, 'Greta', 'Hedden', 1997, 'Hafenviertel');
INSERT INTO Person VALUES (19, 'Okke', 'Jaspers', 1969, 'Weserufer');
INSERT INTO Person VALUES (20, 'Pia', 'Demir', 1946, 'Lindenhof');
INSERT INTO Person VALUES (21, 'Frauke', 'Melchers', 1958, 'Weserufer');
INSERT INTO Person VALUES (22, 'Selin', 'Aksoy', 1979, 'Lindenhof');
INSERT INTO Person VALUES (23, 'Kaja', 'Schwarting', 1994, 'Deichkamp');
INSERT INTO Person VALUES (24, 'Meike', 'Kahrs', 1955, 'Mühlenfeld');
INSERT INTO Person VALUES (25, 'Milan', 'Zurborg', 1981, 'Weserufer');
INSERT INTO Person VALUES (26, 'Rune', 'Bredehorn', 1949, 'Mühlenfeld');
INSERT INTO Person VALUES (27, 'Wiebke', 'Lüttjohann', 1971, 'Mühlenfeld');
INSERT INTO Person VALUES (28, 'Rieke', 'Bredehorn', 1996, 'Weserufer');
INSERT INTO Person VALUES (29, 'Heiko', 'Lampe', 2002, 'Hafenviertel');
INSERT INTO Person VALUES (30, 'Keno', 'Bargmann', 1983, 'Nordheide');
INSERT INTO Person VALUES (31, 'Yara', 'Hoffrogge', 1959, 'Weserufer');
INSERT INTO Person VALUES (32, 'Jannik', 'Grotelüschen', 1989, 'Deichkamp');
INSERT INTO Person VALUES (33, 'Wiebke', 'Eggers', 2001, 'Altstadt');
INSERT INTO Person VALUES (34, 'Birte', 'Haschke', 1975, 'Mühlenfeld');
INSERT INTO Person VALUES (35, 'Aylin', 'Wöltjen', 1940, 'Deichkamp');
INSERT INTO Person VALUES (36, 'Karla', 'Nordhoff', 1998, 'Bahnhofsviertel');
INSERT INTO Person VALUES (37, 'Hanna', 'Bödeker', 1955, 'Deichkamp');
INSERT INTO Person VALUES (38, 'Anna', 'Rohlfs', 1947, 'Deichkamp');
INSERT INTO Person VALUES (39, 'Lotta', 'Vosgerau', NULL, 'Hafenviertel');
INSERT INTO Person VALUES (40, 'Nele', 'Brakenhoff', 1950, 'Weserufer');
INSERT INTO Person VALUES (41, 'Jarne', 'Kampen', 1971, 'Hafenviertel');
INSERT INTO Person VALUES (42, 'Lasse', 'Engelken', 1996, 'Weserufer');
INSERT INTO Person VALUES (43, 'Henning', 'Abels', 1967, 'Mühlenfeld');
INSERT INTO Person VALUES (44, 'Insa', 'Okafor', 1999, NULL);
INSERT INTO Person VALUES (45, 'Lale', 'Backhaus', 1987, 'Nordheide');
INSERT INTO Person VALUES (46, 'Ole', 'Bultjer', 1950, 'Weserufer');
INSERT INTO Person VALUES (47, 'Kaja', 'Nordhoff', 1998, 'Nordheide');
INSERT INTO Person VALUES (48, 'Jarne', 'Hedden', 1955, 'Altstadt');
INSERT INTO Person VALUES (49, 'Taalke', 'Schierholz', 1942, 'Deichkamp');
INSERT INTO Person VALUES (50, 'Vivien', 'Dählmann', 2004, 'Nordheide');
INSERT INTO Person VALUES (51, 'Taalke', 'Wöltjen', 1982, 'Altstadt');
INSERT INTO Person VALUES (52, 'Karla', 'Glander', NULL, 'Deichkamp');
INSERT INTO Person VALUES (53, 'Noemi', 'Pundt', 1981, 'Hafenviertel');
INSERT INTO Person VALUES (54, 'Karla', 'Schwarting', 1963, 'Hafenviertel');
INSERT INTO Person VALUES (55, 'Arne', 'Kahrs', 1981, 'Nordheide');
INSERT INTO Person VALUES (56, 'Clara', 'Meinecke', 1993, 'Weserufer');
INSERT INTO Person VALUES (57, 'Greta', 'Okafor', 1973, 'Bahnhofsviertel');
INSERT INTO Person VALUES (58, 'Lasse', 'Jaspers', 1993, 'Bahnhofsviertel');
INSERT INTO Person VALUES (59, 'Aylin', 'Haake', 1994, 'Lindenhof');
INSERT INTO Person VALUES (60, 'Jasper', 'Möhlmann', 1989, 'Weserufer');

-- kennt: 82 Zeilen
INSERT INTO kennt VALUES (1, 33, 2013);
INSERT INTO kennt VALUES (2, 20, 2005);
INSERT INTO kennt VALUES (3, 23, 2025);
INSERT INTO kennt VALUES (3, 36, 2023);
INSERT INTO kennt VALUES (4, 24, 2019);
INSERT INTO kennt VALUES (4, 35, 2021);
INSERT INTO kennt VALUES (4, 49, NULL);
INSERT INTO kennt VALUES (5, 30, 2014);
INSERT INTO kennt VALUES (8, 17, 2019);
INSERT INTO kennt VALUES (9, 5, 2022);
INSERT INTO kennt VALUES (9, 19, 2026);
INSERT INTO kennt VALUES (10, 49, 2020);
INSERT INTO kennt VALUES (11, 44, 2005);
INSERT INTO kennt VALUES (12, 4, NULL);
INSERT INTO kennt VALUES (13, 5, 2026);
INSERT INTO kennt VALUES (13, 8, 2026);
INSERT INTO kennt VALUES (13, 22, 2026);
INSERT INTO kennt VALUES (13, 27, 2026);
INSERT INTO kennt VALUES (13, 30, 2026);
INSERT INTO kennt VALUES (14, 16, 2006);
INSERT INTO kennt VALUES (15, 38, 1998);
INSERT INTO kennt VALUES (15, 57, 1996);
INSERT INTO kennt VALUES (15, 58, 2019);
INSERT INTO kennt VALUES (16, 35, 2018);
INSERT INTO kennt VALUES (16, 51, 1995);
INSERT INTO kennt VALUES (17, 8, 2019);
INSERT INTO kennt VALUES (19, 9, 2026);
INSERT INTO kennt VALUES (20, 24, 2019);
INSERT INTO kennt VALUES (21, 22, 2021);
INSERT INTO kennt VALUES (21, 42, 2023);
INSERT INTO kennt VALUES (22, 13, 2026);
INSERT INTO kennt VALUES (23, 53, 2004);
INSERT INTO kennt VALUES (24, 4, 2019);
INSERT INTO kennt VALUES (24, 25, 2010);
INSERT INTO kennt VALUES (24, 58, 2009);
INSERT INTO kennt VALUES (25, 24, 2002);
INSERT INTO kennt VALUES (25, 50, 2020);
INSERT INTO kennt VALUES (26, 18, 2004);
INSERT INTO kennt VALUES (27, 34, 2008);
INSERT INTO kennt VALUES (27, 43, 1997);
INSERT INTO kennt VALUES (28, 36, 2012);
INSERT INTO kennt VALUES (28, 46, 2017);
INSERT INTO kennt VALUES (29, 31, 2025);
INSERT INTO kennt VALUES (29, 38, 2024);
INSERT INTO kennt VALUES (29, 58, 2011);
INSERT INTO kennt VALUES (30, 5, 2014);
INSERT INTO kennt VALUES (31, 16, NULL);
INSERT INTO kennt VALUES (31, 57, 1999);
INSERT INTO kennt VALUES (32, 54, 2007);
INSERT INTO kennt VALUES (32, 57, 2005);
INSERT INTO kennt VALUES (33, 1, 2013);
INSERT INTO kennt VALUES (33, 22, 2025);
INSERT INTO kennt VALUES (34, 13, 2026);
INSERT INTO kennt VALUES (35, 16, 2018);
INSERT INTO kennt VALUES (35, 26, 2023);
INSERT INTO kennt VALUES (35, 59, 2009);
INSERT INTO kennt VALUES (36, 25, 2005);
INSERT INTO kennt VALUES (36, 54, 2021);
INSERT INTO kennt VALUES (38, 15, 1998);
INSERT INTO kennt VALUES (38, 29, 2024);
INSERT INTO kennt VALUES (40, 44, 2025);
INSERT INTO kennt VALUES (41, 17, 2016);
INSERT INTO kennt VALUES (44, 40, 2025);
INSERT INTO kennt VALUES (45, 9, 2004);
INSERT INTO kennt VALUES (46, 10, 2020);
INSERT INTO kennt VALUES (46, 28, 2017);
INSERT INTO kennt VALUES (48, 44, 2010);
INSERT INTO kennt VALUES (49, 4, NULL);
INSERT INTO kennt VALUES (49, 36, 2004);
INSERT INTO kennt VALUES (50, 8, 2021);
INSERT INTO kennt VALUES (50, 28, 2017);
INSERT INTO kennt VALUES (52, 34, 2023);
INSERT INTO kennt VALUES (52, 56, 2004);
INSERT INTO kennt VALUES (55, 18, 2025);
INSERT INTO kennt VALUES (55, 59, 2023);
INSERT INTO kennt VALUES (56, 55, 1999);
INSERT INTO kennt VALUES (56, 58, 2018);
INSERT INTO kennt VALUES (57, 15, 1996);
INSERT INTO kennt VALUES (57, 19, 2011);
INSERT INTO kennt VALUES (57, 30, 2000);
INSERT INTO kennt VALUES (58, 29, 2011);
INSERT INTO kennt VALUES (59, 55, 2023);

-- verdaechtig: 26 Zeilen
INSERT INTO verdaechtig VALUES (3, 11, 'gering');
INSERT INTO verdaechtig VALUES (7, 8, 'mittel');
INSERT INTO verdaechtig VALUES (9, 10, 'gering');
INSERT INTO verdaechtig VALUES (13, 1, 'hoch');
INSERT INTO verdaechtig VALUES (13, 2, 'hoch');
INSERT INTO verdaechtig VALUES (13, 3, 'hoch');
INSERT INTO verdaechtig VALUES (13, 4, 'mittel');
INSERT INTO verdaechtig VALUES (23, 7, 'mittel');
INSERT INTO verdaechtig VALUES (26, 6, 'gering');
INSERT INTO verdaechtig VALUES (28, 9, 'gering');
INSERT INTO verdaechtig VALUES (29, 7, 'gering');
INSERT INTO verdaechtig VALUES (31, 7, 'gering');
INSERT INTO verdaechtig VALUES (33, 12, 'hoch');
INSERT INTO verdaechtig VALUES (35, 8, 'gering');
INSERT INTO verdaechtig VALUES (41, 2, 'gering');
INSERT INTO verdaechtig VALUES (42, 1, 'gering');
INSERT INTO verdaechtig VALUES (42, 3, 'gering');
INSERT INTO verdaechtig VALUES (43, 4, 'gering');
INSERT INTO verdaechtig VALUES (44, 6, 'gering');
INSERT INTO verdaechtig VALUES (48, 11, 'gering');
INSERT INTO verdaechtig VALUES (50, 8, 'mittel');
INSERT INTO verdaechtig VALUES (51, 8, 'gering');
INSERT INTO verdaechtig VALUES (52, 5, 'gering');
INSERT INTO verdaechtig VALUES (53, 6, 'gering');
INSERT INTO verdaechtig VALUES (58, 5, 'mittel');
INSERT INTO verdaechtig VALUES (60, 6, 'gering');

-- Ort: 15 Zeilen
INSERT INTO Ort VALUES (1, 'Fundbüro', 'Altstadt');
INSERT INTO Ort VALUES (2, 'Hafenkante', 'Hafenviertel');
INSERT INTO Ort VALUES (3, 'Festplatz', 'Weserufer');
INSERT INTO Ort VALUES (4, 'Vereinsheim TuS', 'Mühlenfeld');
INSERT INTO Ort VALUES (5, 'Detektei', 'Altstadt');
INSERT INTO Ort VALUES (6, 'Rathaus', 'Altstadt');
INSERT INTO Ort VALUES (7, 'Halle am Mühlenfeld', 'Mühlenfeld');
INSERT INTO Ort VALUES (8, 'Bahnhofshalle', 'Bahnhofsviertel');
INSERT INTO Ort VALUES (9, 'Stadtarchiv', 'Altstadt');
INSERT INTO Ort VALUES (10, 'Hafenamt', 'Hafenviertel');
INSERT INTO Ort VALUES (11, 'Schulzentrum', 'Nordheide');
INSERT INTO Ort VALUES (12, 'Café am Lindenplatz', 'Lindenhof');
INSERT INTO Ort VALUES (13, 'Lagerhalle 3', 'Deichkamp');
INSERT INTO Ort VALUES (14, 'Weserpromenade', 'Weserufer');
INSERT INTO Ort VALUES (15, 'Alte Mühle', 'Mühlenfeld');

-- Aussage: 60 Zeilen
INSERT INTO Aussage VALUES (2, 12, 8, '2026-08-31 12:32', 'Ich habe nur meine übliche Runde gemacht. Es war viel Betrieb.');
INSERT INTO Aussage VALUES (3, 11, 13, '2026-08-26 13:55', 'Ich bin erst später dazugekommen. Ich habe niemanden gesehen.');
INSERT INTO Aussage VALUES (5, 1, 1, '2026-09-21 09:20', 'Der Messing-Kompass wurde am 18.06. an der Weserpromenade gefunden. Die Abholung am 14.09. habe ich nicht eingetragen, im Ausgabebuch fehlt die Unterschrift.');
INSERT INTO Aussage VALUES (5, 1, 1, '2026-09-23 10:05', 'Der Eintrag wurde über einen Verwaltungszugang geändert, nicht am Schalter.');
INSERT INTO Aussage VALUES (6, 6, 13, '2026-02-04 17:11', 'Mir ist nichts Ungewöhnliches aufgefallen. Ich habe niemanden gesehen.');
INSERT INTO Aussage VALUES (7, 5, 11, '2025-12-07 18:51', 'Ich kenne die Abläufe dort seit Jahren. Ich erinnere mich nicht an die Uhrzeit.');
INSERT INTO Aussage VALUES (7, 8, 5, '2026-03-25 09:51', 'An dem Abend war ich nicht in der Stadt. Das steht auch im Protokoll.');
INSERT INTO Aussage VALUES (7, 8, 13, '2026-03-05 18:25', 'Ich bin erst später dazugekommen. Das Licht war schon aus.');
INSERT INTO Aussage VALUES (8, 2, 2, '2026-09-22 14:00', 'Fünf Lastenräder wurden nachts über dasselbe Kundenkonto ausgeliehen und nie zurückgegeben.');
INSERT INTO Aussage VALUES (9, 10, 9, '2026-06-30 17:34', 'Ich habe die Unterlagen nur kurz gesehen. Das steht auch im Protokoll.');
INSERT INTO Aussage VALUES (10, 9, 9, '2026-03-21 13:47', 'Ich bin erst später dazugekommen. Ich habe niemanden gesehen.');
INSERT INTO Aussage VALUES (10, 9, 9, '2026-04-19 15:49', 'Die Tür war wie immer abgeschlossen. Es war viel Betrieb.');
INSERT INTO Aussage VALUES (10, 9, 13, '2026-04-20 10:42', 'Ich bin erst später dazugekommen. Das steht auch im Protokoll.');
INSERT INTO Aussage VALUES (10, 10, 12, '2026-06-17 18:24', 'Ich war an dem Tag bis zum Nachmittag im Büro. Ich habe niemanden gesehen.');
INSERT INTO Aussage VALUES (14, 11, 8, '2026-08-31 17:32', 'Ich habe die Unterlagen nur kurz gesehen. Mehr kann ich dazu nicht sagen.');
INSERT INTO Aussage VALUES (16, 6, 12, '2026-01-16 17:13', 'Ich kenne die Abläufe dort seit Jahren. Das steht auch im Protokoll.');
INSERT INTO Aussage VALUES (16, 7, 7, '2026-02-11 12:51', 'Ich habe die Unterlagen nur kurz gesehen. Ich erinnere mich nicht an die Uhrzeit.');
INSERT INTO Aussage VALUES (16, 7, 15, '2026-01-10 12:51', 'Mir ist nichts Ungewöhnliches aufgefallen. Ich erinnere mich nicht an die Uhrzeit.');
INSERT INTO Aussage VALUES (16, 12, 7, '2026-08-27 17:41', 'Die Tür war wie immer abgeschlossen. Fragen Sie am besten die Kollegin.');
INSERT INTO Aussage VALUES (18, 8, 7, '2026-03-10 17:19', 'Ich habe nur meine übliche Runde gemacht. Ich habe es sofort gemeldet.');
INSERT INTO Aussage VALUES (18, 9, 11, '2026-03-23 12:59', 'An dem Abend war ich nicht in der Stadt. Es war viel Betrieb.');
INSERT INTO Aussage VALUES (20, 9, 15, '2026-04-09 12:58', 'An dem Abend war ich nicht in der Stadt. Das Licht war schon aus.');
INSERT INTO Aussage VALUES (21, 3, 5, '2026-09-28 15:30', 'Bei der Warenzählung wurden mehr Getränke ausgegeben als verkauft, Wert der Differenz 312,50 Euro.');
INSERT INTO Aussage VALUES (22, 3, 3, '2026-09-28 11:00', 'Von 22 bis 23 Uhr hat eine freundliche Helferin vom TuS kassiert. Am Wagen hing ein Schild: Kartenzahlung gestört.');
INSERT INTO Aussage VALUES (25, 11, 11, '2026-09-05 11:30', 'Ich bin erst später dazugekommen. Ich habe es sofort gemeldet.');
INSERT INTO Aussage VALUES (26, 6, 11, '2026-01-28 13:37', 'An dem Abend war ich nicht in der Stadt. Ich habe niemanden gesehen.');
INSERT INTO Aussage VALUES (26, 6, 12, '2026-02-02 18:42', 'Ich habe die Unterlagen nur kurz gesehen. Fragen Sie am besten die Kollegin.');
INSERT INTO Aussage VALUES (27, 4, 4, '2026-10-05 18:30', 'In der Liste stand bei Nora Falter ein Monatsbeitrag von 0,00 Euro.');
INSERT INTO Aussage VALUES (29, 7, 8, '2026-02-06 18:54', 'Ich bin erst später dazugekommen. Ich erinnere mich nicht an die Uhrzeit.');
INSERT INTO Aussage VALUES (30, 1, 6, '2026-09-24 14:10', 'Zugänge ehemaliger Beschäftigter werden bei uns nicht automatisch gesperrt.');
INSERT INTO Aussage VALUES (31, 12, 13, '2026-09-07 11:22', 'Die Tür war wie immer abgeschlossen. Ich habe es sofort gemeldet.');
INSERT INTO Aussage VALUES (33, 10, 8, '2026-06-23 16:03', 'Mir ist nichts Ungewöhnliches aufgefallen. Ich erinnere mich nicht an die Uhrzeit.');
INSERT INTO Aussage VALUES (33, 12, 9, '2026-09-11 11:10', 'Ich war an dem Tag bis zum Nachmittag im Büro. Das Licht war schon aus.');
INSERT INTO Aussage VALUES (34, 4, 7, '2026-10-06 19:15', 'Eine Nora Falter hat in der Tischtennis-Abteilung nie mittrainiert.');
INSERT INTO Aussage VALUES (35, 8, 5, '2026-03-03 09:11', 'Ich habe die Unterlagen nur kurz gesehen. Ich habe es sofort gemeldet.');
INSERT INTO Aussage VALUES (35, 8, 5, '2026-03-14 12:10', 'An dem Abend war ich nicht in der Stadt. Das steht auch im Protokoll.');
INSERT INTO Aussage VALUES (36, 7, 15, '2026-01-13 11:54', 'Die Tür war wie immer abgeschlossen. Ich erinnere mich nicht an die Uhrzeit.');
INSERT INTO Aussage VALUES (38, 12, 14, '2026-09-10 14:33', 'Ich habe die Unterlagen nur kurz gesehen. Das Licht war schon aus.');
INSERT INTO Aussage VALUES (40, 8, 10, '2026-03-23 17:35', 'An dem Abend war ich nicht in der Stadt. Fragen Sie am besten die Kollegin.');
INSERT INTO Aussage VALUES (41, 2, 2, '2026-09-24 22:30', 'Ich arbeite nachts im Hafen. Wer die Lastenräder geholt hat, habe ich nicht gesehen.');
INSERT INTO Aussage VALUES (44, 5, 8, '2025-12-08 12:27', 'Ich habe nur meine übliche Runde gemacht. Das steht auch im Protokoll.');
INSERT INTO Aussage VALUES (44, 5, 11, '2025-11-21 17:05', 'Ich habe nur meine übliche Runde gemacht. Es war viel Betrieb.');
INSERT INTO Aussage VALUES (44, 8, 13, '2026-03-01 14:32', 'Ich war an dem Tag bis zum Nachmittag im Büro. Fragen Sie am besten die Kollegin.');
INSERT INTO Aussage VALUES (46, 5, 12, '2025-11-28 09:52', 'Ich habe die Unterlagen nur kurz gesehen. Ich habe niemanden gesehen.');
INSERT INTO Aussage VALUES (47, 9, 11, '2026-04-26 13:04', 'Ich habe die Unterlagen nur kurz gesehen. Ich habe es sofort gemeldet.');
INSERT INTO Aussage VALUES (49, 6, 9, '2026-01-17 18:41', 'Mir ist nichts Ungewöhnliches aufgefallen. Es war viel Betrieb.');
INSERT INTO Aussage VALUES (49, 10, 5, '2026-06-19 16:00', 'Ich habe nur meine übliche Runde gemacht. Das steht auch im Protokoll.');
INSERT INTO Aussage VALUES (49, 10, 9, '2026-06-09 18:24', 'Ich war an dem Tag bis zum Nachmittag im Büro. Ich habe niemanden gesehen.');
INSERT INTO Aussage VALUES (50, 9, 13, '2026-04-25 18:18', 'Mir ist nichts Ungewöhnliches aufgefallen. Ich habe es sofort gemeldet.');
INSERT INTO Aussage VALUES (50, 10, 14, '2026-06-17 16:37', 'Ich bin erst später dazugekommen. Das Licht war schon aus.');
INSERT INTO Aussage VALUES (55, 7, 13, '2026-01-24 10:35', 'Die Tür war wie immer abgeschlossen. Ich erinnere mich nicht an die Uhrzeit.');
INSERT INTO Aussage VALUES (55, 7, 13, '2026-02-01 12:21', 'An dem Abend war ich nicht in der Stadt. Das steht auch im Protokoll.');
INSERT INTO Aussage VALUES (56, 5, 5, '2025-12-10 17:28', 'Ich bin erst später dazugekommen. Das Licht war schon aus.');
INSERT INTO Aussage VALUES (56, 5, 6, '2025-12-14 11:45', 'Ich kenne die Abläufe dort seit Jahren. Das steht auch im Protokoll.');
INSERT INTO Aussage VALUES (57, 12, 5, '2026-09-13 09:41', 'Ich war an dem Tag bis zum Nachmittag im Büro. Ich erinnere mich nicht an die Uhrzeit.');
INSERT INTO Aussage VALUES (58, 5, 6, '2025-12-14 09:44', 'Ich war an dem Tag bis zum Nachmittag im Büro. Ich habe es sofort gemeldet.');
INSERT INTO Aussage VALUES (58, 5, 12, '2025-11-24 13:02', 'Ich habe die Unterlagen nur kurz gesehen. Ich habe niemanden gesehen.');
INSERT INTO Aussage VALUES (59, 6, 8, '2026-01-06 18:02', 'Mir ist nichts Ungewöhnliches aufgefallen. Das Licht war schon aus.');
INSERT INTO Aussage VALUES (59, 12, 12, '2026-09-06 10:21', 'Ich habe die Unterlagen nur kurz gesehen. Das steht auch im Protokoll.');
INSERT INTO Aussage VALUES (59, 12, 14, '2026-09-13 10:48', 'Ich war an dem Tag bis zum Nachmittag im Büro. Fragen Sie am besten die Kollegin.');

-- Beweisstueck: 30 Zeilen
INSERT INTO Beweisstueck VALUES (1, 'Fundbuch-Seite', 1, 1);
INSERT INTO Beweisstueck VALUES (2, 'Schloss-Code', 2, 2);
INSERT INTO Beweisstueck VALUES (3, 'Kassenbon', 3, 3);
INSERT INTO Beweisstueck VALUES (4, 'Vereinsausweis', 4, 4);
INSERT INTO Beweisstueck VALUES (5, 'Nachtfalter-Skizze', 2, NULL);
INSERT INTO Beweisstueck VALUES (6, 'Lieferschein', 5, 9);
INSERT INTO Beweisstueck VALUES (7, 'Briefumschlag', 5, NULL);
INSERT INTO Beweisstueck VALUES (8, 'Notizzettel', 5, 12);
INSERT INTO Beweisstueck VALUES (9, 'Fotokopie', 5, 8);
INSERT INTO Beweisstueck VALUES (10, 'Briefumschlag', 6, 9);
INSERT INTO Beweisstueck VALUES (11, 'Gästebuch', 6, 11);
INSERT INTO Beweisstueck VALUES (12, 'Fotokopie', 6, 12);
INSERT INTO Beweisstueck VALUES (13, 'Gästebuch', 7, 10);
INSERT INTO Beweisstueck VALUES (14, 'Schlüsselkopie', 7, 11);
INSERT INTO Beweisstueck VALUES (15, 'Quittung', 7, 11);
INSERT INTO Beweisstueck VALUES (16, 'Briefumschlag', 7, 12);
INSERT INTO Beweisstueck VALUES (17, 'Notizzettel', 8, 14);
INSERT INTO Beweisstueck VALUES (18, 'USB-Stick', 8, 14);
INSERT INTO Beweisstueck VALUES (19, 'Lieferschein', 8, 6);
INSERT INTO Beweisstueck VALUES (20, 'Briefumschlag', 8, 13);
INSERT INTO Beweisstueck VALUES (21, 'Quittung', 9, 5);
INSERT INTO Beweisstueck VALUES (22, 'Fotokopie', 9, 13);
INSERT INTO Beweisstueck VALUES (23, 'Notizzettel', 9, 6);
INSERT INTO Beweisstueck VALUES (24, 'Notizzettel', 10, 8);
INSERT INTO Beweisstueck VALUES (25, 'Gästebuch', 10, 10);
INSERT INTO Beweisstueck VALUES (26, 'Quittung', 10, 6);
INSERT INTO Beweisstueck VALUES (27, 'Briefumschlag', 10, 8);
INSERT INTO Beweisstueck VALUES (28, 'Gästebuch', 11, 5);
INSERT INTO Beweisstueck VALUES (29, 'USB-Stick', 11, 9);
INSERT INTO Beweisstueck VALUES (30, 'Gästebuch', 12, 15);

COMMIT;
