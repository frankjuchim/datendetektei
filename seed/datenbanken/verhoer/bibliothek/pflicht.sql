-- =====================================================================
-- Verhör-Kontext V1 „Stadtbibliothek“ · vollständige Daten (kuratiert, kein Generator):
-- basis.sql = schema.sql + pflicht.sql. Datenstand Montag, 2026-10-12. Pflicht-Randfälle siehe LIESMICH.md
-- (VERHOER_KONTEXTE.md V1, Verhör-Blueprint A1-V-01 … 12):
--   doppelte Titel (je zwei Exemplare): 1/2, 19/20, 37/38 · Titel 'Der …': 3, 12, 21, 27, 36 (5-buchstabige
--   Autoren nur bei 3, 12, 36) · 'Derbyfieber' 8 · 'Die Insel der Kraniche' 15 · Grenzjahre 19/20 (2000),
--   22 (1999), 27/28 (2010), 29 (2011), 24 (Hörbuch 2015), 5 (Hörbuch 2016) · Magazin 6, 17, 22, 31, 41, 49
--   (41 ohne Preis) · Top 5 der verfügbaren Krimis/Thriller 12, 4, 14, 9, 16 (Platz 6: 15 mit 14,95 €),
--   teurer ausgeliehen: Thriller 13 (29,90 €), Krimi 5 (24,95 €) · Preis NULL: 11, 26, 41, 42.
-- =====================================================================

INSERT INTO Medium (MedienNr, Titel, Autor, Medienart, Genre, Erscheinungsjahr, Preis, Standort, AusgeliehenBis) VALUES
  -- Krimis
  (1, 'Tod am Sielhafen', 'Bargmann', 'Buch', 'Krimi', 2019, 12.95, 'Erdgeschoss', NULL),
  (2, 'Tod am Sielhafen', 'Bargmann', 'Buch', 'Krimi', 2019, 12.95, 'Erdgeschoss', '2026-10-20'),
  (3, 'Der Leuchtturmwärter', 'Onken', 'Buch', 'Krimi', 2017, 14.00, 'Erdgeschoss', NULL),
  (4, 'Schwarzes Watt', 'Diekmann', 'Buch', 'Krimi', 2021, 19.95, 'Erdgeschoss', NULL),
  (5, 'Die Spur im Schilf', 'Hedden', 'Hörbuch', 'Krimi', 2016, 24.95, 'Erdgeschoss', '2026-10-27'),
  (6, 'Mord im Moor', 'Renken', 'Buch', 'Krimi', 2008, 9.99, 'Magazin', NULL),
  (7, 'Kalte Fährte', 'Siemers', 'E-Book', 'Krimi', 2023, 7.99, 'Erdgeschoss', '2026-10-14'),
  (8, 'Derbyfieber', 'Haake', 'Buch', 'Krimi', 2020, 13.50, 'Erdgeschoss', '2026-10-16'),
  (9, 'Nachtfähre', 'Tiemann', 'Buch', 'Krimi', 2022, 17.90, 'Obergeschoss', NULL),
  (10, 'Ebbe und Mord', 'Pundt', 'Buch', 'Krimi', 2014, 11.50, 'Obergeschoss', '2026-11-02'),
  (11, 'Verhör um Mitternacht', 'Kampen', 'DVD', 'Krimi', 2012, NULL, 'Erdgeschoss', NULL),
  -- Thriller
  (12, 'Der Schattenmann', 'Lampe', 'Buch', 'Thriller', 2018, 22.00, 'Erdgeschoss', NULL),
  (13, 'Blackout an der Weser', 'Uphoff', 'Buch', 'Thriller', 2024, 29.90, 'Erdgeschoss', '2026-10-30'),
  (14, 'Funkstille', 'Möhlmann', 'Buch', 'Thriller', 2020, 18.50, 'Obergeschoss', NULL),
  (15, 'Die Insel der Kraniche', 'Tebbe', 'Buch', 'Thriller', 2015, 14.95, 'Obergeschoss', NULL),
  (16, 'Code Nordheide', 'Eggers', 'Hörbuch', 'Thriller', 2021, 16.00, 'Erdgeschoss', NULL),
  (17, 'Spiegelglatt', 'Rippen', 'Buch', 'Thriller', 2011, 12.00, 'Magazin', NULL),
  (18, 'Letzte Ausfahrt Hafen', 'Holtorf', 'DVD', 'Thriller', 2019, 15.00, 'Erdgeschoss', '2026-10-22'),
  -- Romane
  (19, 'Sommer in Moorende', 'Harjes', 'Buch', 'Roman', 2000, 16.90, 'Obergeschoss', NULL),
  (20, 'Sommer in Moorende', 'Harjes', 'Buch', 'Roman', 2000, 16.90, 'Obergeschoss', '2026-10-19'),
  (21, 'Der Gezeitenkalender', 'Schwarting', 'Buch', 'Roman', 2005, 19.00, 'Obergeschoss', NULL),
  (22, 'Windstärke zehn', 'Kolthoff', 'Buch', 'Roman', 1999, 14.50, 'Magazin', '2026-10-28'),
  (23, 'Das Haus am Kanal', 'Lindemann', 'Buch', 'Roman', 2013, 21.00, 'Obergeschoss', '2026-11-04'),
  (24, 'Zwischen den Deichen', 'Nordhoff', 'Hörbuch', 'Roman', 2015, 19.95, 'Erdgeschoss', NULL),
  (25, 'Ruf der Möwen', 'Ihnken', 'E-Book', 'Roman', 2019, 9.99, 'Erdgeschoss', '2026-10-15'),
  (26, 'Altes Land, neues Glück', 'Gerdts', 'Buch', 'Roman', 2008, NULL, 'Obergeschoss', '2026-10-21'),
  (27, 'Der lange Winter', 'Rabe', 'Buch', 'Roman', 2010, 18.00, 'Obergeschoss', '2026-10-26'),
  -- Sachbücher
  (28, 'Wattenmeer verstehen', 'Saathoff', 'Buch', 'Sachbuch', 2010, 24.90, 'Obergeschoss', NULL),
  (29, 'Kleine Geschichte der Weser', 'Bohlken', 'Buch', 'Sachbuch', 2011, 22.50, 'Obergeschoss', '2026-10-21'),
  (30, 'Gärtnern im Norden', 'Mammen', 'Buch', 'Sachbuch', 2003, 19.90, 'Obergeschoss', '2026-10-13'),
  (31, 'Programmieren für alle', 'Kück', 'Buch', 'Sachbuch', 1999, 29.00, 'Magazin', NULL),
  (32, 'Datenbanken im Alltag', 'Okafor', 'Buch', 'Sachbuch', 2007, 26.00, 'Obergeschoss', '2026-10-29'),
  (33, 'Vögel an der Küste', 'Hinners', 'Buch', 'Sachbuch', 2016, 15.90, 'Obergeschoss', '2026-11-05'),
  (34, 'Natur und Technik 9/2026', 'Wehrhahn', 'Zeitschrift', 'Sachbuch', 2026, 6.50, 'Erdgeschoss', '2026-10-16'),
  (35, 'Natur und Technik 10/2026', 'Wehrhahn', 'Zeitschrift', 'Sachbuch', 2026, 6.50, 'Erdgeschoss', '2026-10-19'),
  (36, 'Der Weg des Wassers', 'Witte', 'DVD', 'Sachbuch', 2014, 12.99, 'Erdgeschoss', NULL),
  -- Kinderbücher
  (37, 'Die kleine Möwe Mats', 'Demir', 'Buch', 'Kinderbuch', 2018, 11.00, 'Kinderbereich', '2026-10-22'),
  (38, 'Die kleine Möwe Mats', 'Demir', 'Buch', 'Kinderbuch', 2018, 11.00, 'Kinderbereich', '2026-10-23'),
  (39, 'Leo und der Leuchtturm', 'Rossi', 'Buch', 'Kinderbuch', 2020, 12.50, 'Kinderbereich', '2026-10-28'),
  (40, 'Pippa packt aus', 'Kowalski', 'Hörbuch', 'Kinderbuch', 2023, 9.95, 'Kinderbereich', NULL),
  (41, 'Das Geheimnis im Baumhaus', 'Luttmann', 'Buch', 'Kinderbuch', 2009, NULL, 'Magazin', NULL),
  (42, 'Drache Fridolin fliegt', 'Habben', 'Buch', 'Kinderbuch', 2001, NULL, 'Kinderbereich', '2026-10-17'),
  (43, 'Zahlen-Zauberei', 'Jaspers', 'Buch', 'Kinderbuch', 2021, 10.00, 'Kinderbereich', '2026-10-17'),
  (44, 'Kicher-Kompass', 'Engelken', 'DVD', 'Kinderbuch', 2017, 14.99, 'Kinderbereich', '2026-10-24'),
  -- Fantasy
  (45, 'Das Erbe der Sturmkrähen', 'Brakenhoff', 'Buch', 'Fantasy', 2016, 18.95, 'Obergeschoss', '2026-10-31'),
  (46, 'Kristallnebel', 'Glander', 'Hörbuch', 'Fantasy', 2018, 21.95, 'Erdgeschoss', '2026-10-25'),
  (47, 'Die Hüterin des Nordlichts', 'Schierholz', 'Buch', 'Fantasy', 2003, 16.00, 'Obergeschoss', NULL),
  (48, 'Drachenfeuer', 'Haake', 'E-Book', 'Fantasy', 2024, 8.99, 'Erdgeschoss', '2026-10-18'),
  (49, 'Schattenwald', 'Döscher', 'DVD', 'Fantasy', 2012, 9.99, 'Magazin', NULL),
  (50, 'Runenstaub', 'Klattenhoff', 'Buch', 'Fantasy', 1995, 12.00, 'Obergeschoss', '2026-10-18'),
  -- weitere Exemplare
  (51, 'Stimmen im Hafen', 'Wiechmann', 'Hörbuch', 'Roman', 2012, 14.95, 'Erdgeschoss', NULL),
  (52, 'Gezeitenkinder', 'Hemmen', 'Hörbuch', 'Kinderbuch', 2024, 12.95, 'Kinderbereich', '2026-10-20'),
  (53, 'Weserstedter Geschichten', 'Hoffrogge', 'Buch', 'Roman', 2017, 15.50, 'Obergeschoss', '2026-11-06'),
  (54, 'Tatort Lindenhof', 'Ahrensfeld', 'DVD', 'Krimi', 2010, 8.00, 'Erdgeschoss', '2026-10-15'),
  (55, 'Spurensuche im Schnee', 'Meinecke', 'Buch', 'Krimi', 1998, 6.00, 'Obergeschoss', NULL),
  (56, 'Abenteuer Nordsee', 'Vosgerau', 'DVD', 'Sachbuch', 2006, 13.00, 'Obergeschoss', '2026-11-03'),
  (57, 'Leben mit Bienen', 'Bultjer', 'Buch', 'Sachbuch', 2002, 23.00, 'Obergeschoss', '2026-10-27'),
  (58, 'Glanz und Gloria', 'Zurborg', 'Buch', 'Roman', 2022, 22.00, 'Obergeschoss', '2026-10-26'),
  (59, 'Mondscheinpost', 'Stelljes', 'Buch', 'Roman', 1987, 10.50, 'Obergeschoss', '2026-10-30'),
  (60, 'Herbststurm', 'Wöltjen', 'Buch', 'Thriller', 2009, 13.95, 'Obergeschoss', '2026-10-30');
