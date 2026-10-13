-- =====================================================================
-- Datendetektei Weserstedt · basis.sql der Übungsdatenbank „verhoer/bibliothek“
-- ERZEUGT von scripts/db_bauen.js (npm run db) – nicht von Hand ändern.
-- Datenbank: verhoer/bibliothek
-- Seed: datendetektei:verhoer/bibliothek:v1 (FNV-1a 0x010f7678) – kuratiert, kein Generator
-- Version: 1
-- SHA-256 (Datenteil): 0694675d08bc17a4362ceb42d188e537237368ecbde53da342998ef9f237f6c0
-- =====================================================================

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

-- ===== Daten (erzeugt) =====
BEGIN;
PRAGMA defer_foreign_keys = ON;

-- Medium: 60 Zeilen
INSERT INTO Medium VALUES (1, 'Tod am Sielhafen', 'Bargmann', 'Buch', 'Krimi', 2019, 12.95, 'Erdgeschoss', NULL);
INSERT INTO Medium VALUES (2, 'Tod am Sielhafen', 'Bargmann', 'Buch', 'Krimi', 2019, 12.95, 'Erdgeschoss', '2026-10-20');
INSERT INTO Medium VALUES (3, 'Der Leuchtturmwärter', 'Onken', 'Buch', 'Krimi', 2017, 14.0, 'Erdgeschoss', NULL);
INSERT INTO Medium VALUES (4, 'Schwarzes Watt', 'Diekmann', 'Buch', 'Krimi', 2021, 19.95, 'Erdgeschoss', NULL);
INSERT INTO Medium VALUES (5, 'Die Spur im Schilf', 'Hedden', 'Hörbuch', 'Krimi', 2016, 24.95, 'Erdgeschoss', '2026-10-27');
INSERT INTO Medium VALUES (6, 'Mord im Moor', 'Renken', 'Buch', 'Krimi', 2008, 9.99, 'Magazin', NULL);
INSERT INTO Medium VALUES (7, 'Kalte Fährte', 'Siemers', 'E-Book', 'Krimi', 2023, 7.99, 'Erdgeschoss', '2026-10-14');
INSERT INTO Medium VALUES (8, 'Derbyfieber', 'Haake', 'Buch', 'Krimi', 2020, 13.5, 'Erdgeschoss', '2026-10-16');
INSERT INTO Medium VALUES (9, 'Nachtfähre', 'Tiemann', 'Buch', 'Krimi', 2022, 17.9, 'Obergeschoss', NULL);
INSERT INTO Medium VALUES (10, 'Ebbe und Mord', 'Pundt', 'Buch', 'Krimi', 2014, 11.5, 'Obergeschoss', '2026-11-02');
INSERT INTO Medium VALUES (11, 'Verhör um Mitternacht', 'Kampen', 'DVD', 'Krimi', 2012, NULL, 'Erdgeschoss', NULL);
INSERT INTO Medium VALUES (12, 'Der Schattenmann', 'Lampe', 'Buch', 'Thriller', 2018, 22.0, 'Erdgeschoss', NULL);
INSERT INTO Medium VALUES (13, 'Blackout an der Weser', 'Uphoff', 'Buch', 'Thriller', 2024, 29.9, 'Erdgeschoss', '2026-10-30');
INSERT INTO Medium VALUES (14, 'Funkstille', 'Möhlmann', 'Buch', 'Thriller', 2020, 18.5, 'Obergeschoss', NULL);
INSERT INTO Medium VALUES (15, 'Die Insel der Kraniche', 'Tebbe', 'Buch', 'Thriller', 2015, 14.95, 'Obergeschoss', NULL);
INSERT INTO Medium VALUES (16, 'Code Nordheide', 'Eggers', 'Hörbuch', 'Thriller', 2021, 16.0, 'Erdgeschoss', NULL);
INSERT INTO Medium VALUES (17, 'Spiegelglatt', 'Rippen', 'Buch', 'Thriller', 2011, 12.0, 'Magazin', NULL);
INSERT INTO Medium VALUES (18, 'Letzte Ausfahrt Hafen', 'Holtorf', 'DVD', 'Thriller', 2019, 15.0, 'Erdgeschoss', '2026-10-22');
INSERT INTO Medium VALUES (19, 'Sommer in Moorende', 'Harjes', 'Buch', 'Roman', 2000, 16.9, 'Obergeschoss', NULL);
INSERT INTO Medium VALUES (20, 'Sommer in Moorende', 'Harjes', 'Buch', 'Roman', 2000, 16.9, 'Obergeschoss', '2026-10-19');
INSERT INTO Medium VALUES (21, 'Der Gezeitenkalender', 'Schwarting', 'Buch', 'Roman', 2005, 19.0, 'Obergeschoss', NULL);
INSERT INTO Medium VALUES (22, 'Windstärke zehn', 'Kolthoff', 'Buch', 'Roman', 1999, 14.5, 'Magazin', '2026-10-28');
INSERT INTO Medium VALUES (23, 'Das Haus am Kanal', 'Lindemann', 'Buch', 'Roman', 2013, 21.0, 'Obergeschoss', '2026-11-04');
INSERT INTO Medium VALUES (24, 'Zwischen den Deichen', 'Nordhoff', 'Hörbuch', 'Roman', 2015, 19.95, 'Erdgeschoss', NULL);
INSERT INTO Medium VALUES (25, 'Ruf der Möwen', 'Ihnken', 'E-Book', 'Roman', 2019, 9.99, 'Erdgeschoss', '2026-10-15');
INSERT INTO Medium VALUES (26, 'Altes Land, neues Glück', 'Gerdts', 'Buch', 'Roman', 2008, NULL, 'Obergeschoss', '2026-10-21');
INSERT INTO Medium VALUES (27, 'Der lange Winter', 'Rabe', 'Buch', 'Roman', 2010, 18.0, 'Obergeschoss', '2026-10-26');
INSERT INTO Medium VALUES (28, 'Wattenmeer verstehen', 'Saathoff', 'Buch', 'Sachbuch', 2010, 24.9, 'Obergeschoss', NULL);
INSERT INTO Medium VALUES (29, 'Kleine Geschichte der Weser', 'Bohlken', 'Buch', 'Sachbuch', 2011, 22.5, 'Obergeschoss', '2026-10-21');
INSERT INTO Medium VALUES (30, 'Gärtnern im Norden', 'Mammen', 'Buch', 'Sachbuch', 2003, 19.9, 'Obergeschoss', '2026-10-13');
INSERT INTO Medium VALUES (31, 'Programmieren für alle', 'Kück', 'Buch', 'Sachbuch', 1999, 29.0, 'Magazin', NULL);
INSERT INTO Medium VALUES (32, 'Datenbanken im Alltag', 'Okafor', 'Buch', 'Sachbuch', 2007, 26.0, 'Obergeschoss', '2026-10-29');
INSERT INTO Medium VALUES (33, 'Vögel an der Küste', 'Hinners', 'Buch', 'Sachbuch', 2016, 15.9, 'Obergeschoss', '2026-11-05');
INSERT INTO Medium VALUES (34, 'Natur und Technik 9/2026', 'Wehrhahn', 'Zeitschrift', 'Sachbuch', 2026, 6.5, 'Erdgeschoss', '2026-10-16');
INSERT INTO Medium VALUES (35, 'Natur und Technik 10/2026', 'Wehrhahn', 'Zeitschrift', 'Sachbuch', 2026, 6.5, 'Erdgeschoss', '2026-10-19');
INSERT INTO Medium VALUES (36, 'Der Weg des Wassers', 'Witte', 'DVD', 'Sachbuch', 2014, 12.99, 'Erdgeschoss', NULL);
INSERT INTO Medium VALUES (37, 'Die kleine Möwe Mats', 'Demir', 'Buch', 'Kinderbuch', 2018, 11.0, 'Kinderbereich', '2026-10-22');
INSERT INTO Medium VALUES (38, 'Die kleine Möwe Mats', 'Demir', 'Buch', 'Kinderbuch', 2018, 11.0, 'Kinderbereich', '2026-10-23');
INSERT INTO Medium VALUES (39, 'Leo und der Leuchtturm', 'Rossi', 'Buch', 'Kinderbuch', 2020, 12.5, 'Kinderbereich', '2026-10-28');
INSERT INTO Medium VALUES (40, 'Pippa packt aus', 'Kowalski', 'Hörbuch', 'Kinderbuch', 2023, 9.95, 'Kinderbereich', NULL);
INSERT INTO Medium VALUES (41, 'Das Geheimnis im Baumhaus', 'Luttmann', 'Buch', 'Kinderbuch', 2009, NULL, 'Magazin', NULL);
INSERT INTO Medium VALUES (42, 'Drache Fridolin fliegt', 'Habben', 'Buch', 'Kinderbuch', 2001, NULL, 'Kinderbereich', '2026-10-17');
INSERT INTO Medium VALUES (43, 'Zahlen-Zauberei', 'Jaspers', 'Buch', 'Kinderbuch', 2021, 10.0, 'Kinderbereich', '2026-10-17');
INSERT INTO Medium VALUES (44, 'Kicher-Kompass', 'Engelken', 'DVD', 'Kinderbuch', 2017, 14.99, 'Kinderbereich', '2026-10-24');
INSERT INTO Medium VALUES (45, 'Das Erbe der Sturmkrähen', 'Brakenhoff', 'Buch', 'Fantasy', 2016, 18.95, 'Obergeschoss', '2026-10-31');
INSERT INTO Medium VALUES (46, 'Kristallnebel', 'Glander', 'Hörbuch', 'Fantasy', 2018, 21.95, 'Erdgeschoss', '2026-10-25');
INSERT INTO Medium VALUES (47, 'Die Hüterin des Nordlichts', 'Schierholz', 'Buch', 'Fantasy', 2003, 16.0, 'Obergeschoss', NULL);
INSERT INTO Medium VALUES (48, 'Drachenfeuer', 'Haake', 'E-Book', 'Fantasy', 2024, 8.99, 'Erdgeschoss', '2026-10-18');
INSERT INTO Medium VALUES (49, 'Schattenwald', 'Döscher', 'DVD', 'Fantasy', 2012, 9.99, 'Magazin', NULL);
INSERT INTO Medium VALUES (50, 'Runenstaub', 'Klattenhoff', 'Buch', 'Fantasy', 1995, 12.0, 'Obergeschoss', '2026-10-18');
INSERT INTO Medium VALUES (51, 'Stimmen im Hafen', 'Wiechmann', 'Hörbuch', 'Roman', 2012, 14.95, 'Erdgeschoss', NULL);
INSERT INTO Medium VALUES (52, 'Gezeitenkinder', 'Hemmen', 'Hörbuch', 'Kinderbuch', 2024, 12.95, 'Kinderbereich', '2026-10-20');
INSERT INTO Medium VALUES (53, 'Weserstedter Geschichten', 'Hoffrogge', 'Buch', 'Roman', 2017, 15.5, 'Obergeschoss', '2026-11-06');
INSERT INTO Medium VALUES (54, 'Tatort Lindenhof', 'Ahrensfeld', 'DVD', 'Krimi', 2010, 8.0, 'Erdgeschoss', '2026-10-15');
INSERT INTO Medium VALUES (55, 'Spurensuche im Schnee', 'Meinecke', 'Buch', 'Krimi', 1998, 6.0, 'Obergeschoss', NULL);
INSERT INTO Medium VALUES (56, 'Abenteuer Nordsee', 'Vosgerau', 'DVD', 'Sachbuch', 2006, 13.0, 'Obergeschoss', '2026-11-03');
INSERT INTO Medium VALUES (57, 'Leben mit Bienen', 'Bultjer', 'Buch', 'Sachbuch', 2002, 23.0, 'Obergeschoss', '2026-10-27');
INSERT INTO Medium VALUES (58, 'Glanz und Gloria', 'Zurborg', 'Buch', 'Roman', 2022, 22.0, 'Obergeschoss', '2026-10-26');
INSERT INTO Medium VALUES (59, 'Mondscheinpost', 'Stelljes', 'Buch', 'Roman', 1987, 10.5, 'Obergeschoss', '2026-10-30');
INSERT INTO Medium VALUES (60, 'Herbststurm', 'Wöltjen', 'Buch', 'Thriller', 2009, 13.95, 'Obergeschoss', '2026-10-30');

COMMIT;
