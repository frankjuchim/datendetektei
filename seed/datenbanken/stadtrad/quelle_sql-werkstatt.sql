-- =====================================================================
-- StadtRad Weserstedt - Beispieldatenbank fuer die Fortbildung
-- Informatik Sek I - Grundlagenschulung (Vertiefung), Modul Datenbanken
-- =====================================================================

DROP TABLE IF EXISTS werkstatt;
DROP TABLE IF EXISTS ausleihen;
DROP TABLE IF EXISTS raeder;
DROP TABLE IF EXISTS kunden;
DROP TABLE IF EXISTS stationen;
DROP TABLE IF EXISTS ausleihen_roh;

CREATE TABLE stationen (
  station_id   INTEGER PRIMARY KEY,
  name         TEXT NOT NULL,
  stadtteil    TEXT NOT NULL,
  stellplaetze INTEGER NOT NULL
);

CREATE TABLE raeder (
  rad_id     INTEGER PRIMARY KEY,
  typ        TEXT NOT NULL,
  baujahr    INTEGER NOT NULL,
  station_id INTEGER,
  status     TEXT NOT NULL,
  FOREIGN KEY (station_id) REFERENCES stationen(station_id)
);

CREATE TABLE kunden (
  kunden_id INTEGER PRIMARY KEY,
  vorname   TEXT NOT NULL,
  nachname  TEXT NOT NULL,
  jahrgang  INTEGER NOT NULL,
  tarif     TEXT NOT NULL,
  stadtteil TEXT NOT NULL
);

CREATE TABLE ausleihen (
  ausleih_id       INTEGER PRIMARY KEY,
  rad_id           INTEGER NOT NULL,
  kunden_id        INTEGER NOT NULL,
  start_station_id INTEGER NOT NULL,
  ziel_station_id  INTEGER NOT NULL,
  start_zeit       TEXT NOT NULL,
  ende_zeit        TEXT NOT NULL,
  dauer_min        INTEGER NOT NULL,
  preis            REAL NOT NULL,
  FOREIGN KEY (rad_id) REFERENCES raeder(rad_id),
  FOREIGN KEY (kunden_id) REFERENCES kunden(kunden_id),
  FOREIGN KEY (start_station_id) REFERENCES stationen(station_id),
  FOREIGN KEY (ziel_station_id) REFERENCES stationen(station_id)
);

CREATE TABLE werkstatt (
  reparatur_id INTEGER PRIMARY KEY,
  rad_id       INTEGER NOT NULL,
  datum        TEXT NOT NULL,
  grund        TEXT NOT NULL,
  kosten       REAL NOT NULL,
  FOREIGN KEY (rad_id) REFERENCES raeder(rad_id)
);

-- Absichtlich unstrukturierte Tabelle fuer den Einstieg (Redundanzen!)
CREATE TABLE ausleihen_roh (
  nr             INTEGER PRIMARY KEY,
  kunde          TEXT,
  tarif          TEXT,
  geburtsjahr    INTEGER,
  rad_id         INTEGER,
  rad_typ        TEXT,
  start_station  TEXT,
  start_stadtteil TEXT,
  ziel_station   TEXT,
  start_zeit     TEXT,
  ende_zeit      TEXT,
  dauer_min      INTEGER
);

-- ---------- stationen ----------
INSERT INTO stationen VALUES (1, 'Bahnhof Nord', 'Bahnhof', 24);
INSERT INTO stationen VALUES (2, 'Bahnhof Süd', 'Bahnhof', 18);
INSERT INTO stationen VALUES (3, 'Marktplatz', 'Altstadt', 20);
INSERT INTO stationen VALUES (4, 'Rathaus', 'Altstadt', 12);
INSERT INTO stationen VALUES (5, 'Alte Werft', 'Hafen', 16);
INSERT INTO stationen VALUES (6, 'Fischmarkt', 'Hafen', 10);
INSERT INTO stationen VALUES (7, 'Universität', 'Univiertel', 30);
INSERT INTO stationen VALUES (8, 'Mensa', 'Univiertel', 20);
INSERT INTO stationen VALUES (9, 'Stadion', 'Weststadt', 14);
INSERT INTO stationen VALUES (10, 'Klinikum', 'Weststadt', 16);
INSERT INTO stationen VALUES (11, 'Südpark', 'Südpark', 12);
INSERT INTO stationen VALUES (12, 'Schulzentrum', 'Südpark', 22);

-- ---------- raeder ----------
INSERT INTO raeder VALUES (1, 'Citybike', 2023, 4, 'ausgeliehen');
INSERT INTO raeder VALUES (2, 'Citybike', 2021, 4, 'frei');
INSERT INTO raeder VALUES (3, 'Citybike', 2023, 3, 'frei');
INSERT INTO raeder VALUES (4, 'Citybike', 2024, 1, 'frei');
INSERT INTO raeder VALUES (5, 'E-Bike', 2021, 1, 'ausgeliehen');
INSERT INTO raeder VALUES (6, 'Citybike', 2021, 12, 'frei');
INSERT INTO raeder VALUES (7, 'Citybike', 2025, 1, 'frei');
INSERT INTO raeder VALUES (8, 'E-Bike', 2019, 2, 'frei');
INSERT INTO raeder VALUES (9, 'Citybike', 2021, 9, 'ausgeliehen');
INSERT INTO raeder VALUES (10, 'Lastenrad', 2019, NULL, 'Werkstatt');
INSERT INTO raeder VALUES (11, 'Citybike', 2022, 7, 'frei');
INSERT INTO raeder VALUES (12, 'Lastenrad', 2020, 1, 'frei');
INSERT INTO raeder VALUES (13, 'E-Bike', 2025, 3, 'frei');
INSERT INTO raeder VALUES (14, 'Citybike', 2020, 6, 'frei');
INSERT INTO raeder VALUES (15, 'E-Bike', 2022, NULL, 'Werkstatt');
INSERT INTO raeder VALUES (16, 'Lastenrad', 2023, NULL, 'Werkstatt');
INSERT INTO raeder VALUES (17, 'Citybike', 2022, 11, 'frei');
INSERT INTO raeder VALUES (18, 'Citybike', 2022, 8, 'ausgeliehen');
INSERT INTO raeder VALUES (19, 'E-Bike', 2020, 7, 'frei');
INSERT INTO raeder VALUES (20, 'Citybike', 2022, 11, 'ausgeliehen');
INSERT INTO raeder VALUES (21, 'Citybike', 2020, 1, 'frei');
INSERT INTO raeder VALUES (22, 'Citybike', 2024, 8, 'frei');
INSERT INTO raeder VALUES (23, 'Citybike', 2022, 11, 'ausgeliehen');
INSERT INTO raeder VALUES (24, 'E-Bike', 2020, 8, 'frei');
INSERT INTO raeder VALUES (25, 'Lastenrad', 2021, NULL, 'Werkstatt');
INSERT INTO raeder VALUES (26, 'Citybike', 2022, 2, 'frei');
INSERT INTO raeder VALUES (27, 'Citybike', 2021, 1, 'frei');
INSERT INTO raeder VALUES (28, 'E-Bike', 2023, 12, 'frei');
INSERT INTO raeder VALUES (29, 'E-Bike', 2023, 3, 'ausgeliehen');
INSERT INTO raeder VALUES (30, 'Citybike', 2023, 11, 'frei');
INSERT INTO raeder VALUES (31, 'Citybike', 2021, 4, 'frei');
INSERT INTO raeder VALUES (32, 'Citybike', 2024, 6, 'ausgeliehen');
INSERT INTO raeder VALUES (33, 'Citybike', 2023, 11, 'frei');
INSERT INTO raeder VALUES (34, 'E-Bike', 2021, 12, 'frei');
INSERT INTO raeder VALUES (35, 'E-Bike', 2024, 9, 'ausgeliehen');
INSERT INTO raeder VALUES (36, 'Citybike', 2019, 2, 'frei');
INSERT INTO raeder VALUES (37, 'E-Bike', 2021, 1, 'frei');
INSERT INTO raeder VALUES (38, 'Citybike', 2025, 4, 'frei');
INSERT INTO raeder VALUES (39, 'Citybike', 2025, NULL, 'Werkstatt');
INSERT INTO raeder VALUES (40, 'E-Bike', 2025, 3, 'frei');

-- ---------- kunden ----------
INSERT INTO kunden VALUES (1, 'Mia', 'Ahrens', 1995, 'Basis', 'Bahnhof');
INSERT INTO kunden VALUES (2, 'Ben', 'Bruhns', 2000, 'Plus', 'Hafen');
INSERT INTO kunden VALUES (3, 'Lena', 'Cordes', 2009, 'Schule', 'Südpark');
INSERT INTO kunden VALUES (4, 'Jonas', 'Dierks', 1974, 'Plus', 'Südpark');
INSERT INTO kunden VALUES (5, 'Emma', 'Ehlers', 1995, 'Basis', 'Weststadt');
INSERT INTO kunden VALUES (6, 'Luca', 'Focken', 2002, 'Basis', 'Bahnhof');
INSERT INTO kunden VALUES (7, 'Sofia', 'Gerdes', 2010, 'Schule', 'Bahnhof');
INSERT INTO kunden VALUES (8, 'Noah', 'Harms', 2002, 'Basis', 'Univiertel');
INSERT INTO kunden VALUES (9, 'Hanna', 'Immig', 1968, 'Plus', 'Altstadt');
INSERT INTO kunden VALUES (10, 'Elias', 'Janssen', 2000, 'Basis', 'Univiertel');
INSERT INTO kunden VALUES (11, 'Marie', 'Kruse', 2010, 'Schule', 'Bahnhof');
INSERT INTO kunden VALUES (12, 'Paul', 'Lammers', 2002, 'Basis', 'Bahnhof');
INSERT INTO kunden VALUES (13, 'Lea', 'Meiners', 1998, 'Basis', 'Univiertel');
INSERT INTO kunden VALUES (14, 'Finn', 'Nolte', 2010, 'Schule', 'Südpark');
INSERT INTO kunden VALUES (15, 'Clara', 'Oltmanns', 1992, 'Plus', 'Univiertel');
INSERT INTO kunden VALUES (16, 'Tim', 'Poppe', 2006, 'Schule', 'Weststadt');
INSERT INTO kunden VALUES (17, 'Nele', 'Ricken', 2010, 'Schule', 'Univiertel');
INSERT INTO kunden VALUES (18, 'Jan', 'Sanders', 1968, 'Plus', 'Altstadt');
INSERT INTO kunden VALUES (19, 'Ida', 'Tammen', 1995, 'Plus', 'Altstadt');
INSERT INTO kunden VALUES (20, 'Ole', 'Ubben', 2000, 'Plus', 'Südpark');
INSERT INTO kunden VALUES (21, 'Frieda', 'Vosskuhl', 1990, 'Basis', 'Bahnhof');
INSERT INTO kunden VALUES (22, 'Malte', 'Warnken', 2000, 'Plus', 'Bahnhof');
INSERT INTO kunden VALUES (23, 'Greta', 'Xylander', 2010, 'Schule', 'Univiertel');
INSERT INTO kunden VALUES (24, 'Henry', 'Ziegler', 2004, 'Basis', 'Hafen');
INSERT INTO kunden VALUES (25, 'Ronja', 'Aden', 1983, 'Basis', 'Weststadt');

-- ---------- ausleihen ----------
INSERT INTO ausleihen VALUES (1, 15, 19, 11, 6, '2026-05-01 14:04', '2026-05-01 14:17', 13, 3.06);
INSERT INTO ausleihen VALUES (2, 35, 23, 6, 3, '2026-05-01 15:37', '2026-05-01 16:17', 40, 6.3);
INSERT INTO ausleihen VALUES (3, 17, 15, 1, 10, '2026-05-01 10:10', '2026-05-01 10:25', 15, 2.2);
INSERT INTO ausleihen VALUES (4, 14, 5, 11, 3, '2026-05-01 11:30', '2026-05-01 11:43', 13, 2.04);
INSERT INTO ausleihen VALUES (5, 39, 20, 7, 12, '2026-05-01 16:13', '2026-05-01 16:41', 28, 3.24);
INSERT INTO ausleihen VALUES (6, 18, 9, 7, 1, '2026-05-01 16:15', '2026-05-01 16:24', 9, 1.72);
INSERT INTO ausleihen VALUES (7, 18, 7, 5, 8, '2026-05-01 07:48', '2026-05-01 08:10', 22, 2.76);
INSERT INTO ausleihen VALUES (8, 21, 10, 10, 7, '2026-05-01 16:19', '2026-05-01 16:25', 6, 1.48);
INSERT INTO ausleihen VALUES (9, 1, 18, 3, 7, '2026-05-01 17:10', '2026-05-01 17:36', 26, 3.08);
INSERT INTO ausleihen VALUES (10, 28, 20, 1, 2, '2026-05-01 19:01', '2026-05-01 19:56', 55, 8.1);
INSERT INTO ausleihen VALUES (11, 33, 21, 10, 5, '2026-05-01 17:53', '2026-05-01 18:01', 8, 1.64);
INSERT INTO ausleihen VALUES (12, 38, 10, 7, 2, '2026-05-01 13:05', '2026-05-01 13:11', 6, 1.48);
INSERT INTO ausleihen VALUES (13, 22, 21, 1, 7, '2026-05-02 12:05', '2026-05-02 12:31', 26, 3.08);
INSERT INTO ausleihen VALUES (14, 11, 4, 2, 7, '2026-05-02 21:16', '2026-05-02 21:26', 10, 1.8);
INSERT INTO ausleihen VALUES (15, 26, 16, 1, 9, '2026-05-02 10:49', '2026-05-02 10:54', 5, 1.4);
INSERT INTO ausleihen VALUES (16, 9, 2, 10, 3, '2026-05-02 08:38', '2026-05-02 08:56', 18, 2.44);
INSERT INTO ausleihen VALUES (17, 17, 8, 4, 10, '2026-05-02 09:16', '2026-05-02 09:40', 24, 2.92);
INSERT INTO ausleihen VALUES (18, 24, 21, 1, 12, '2026-05-02 09:56', '2026-05-02 10:15', 19, 3.78);
INSERT INTO ausleihen VALUES (19, 13, 11, 7, 1, '2026-05-02 12:01', '2026-05-02 12:16', 15, 3.3);
INSERT INTO ausleihen VALUES (20, 25, 24, 2, 9, '2026-05-03 13:51', '2026-05-03 14:26', 35, 6.2);
INSERT INTO ausleihen VALUES (21, 6, 16, 2, 12, '2026-05-03 08:31', '2026-05-03 08:46', 15, 2.2);
INSERT INTO ausleihen VALUES (22, 27, 1, 12, 3, '2026-05-03 08:00', '2026-05-03 08:35', 35, 3.8);
INSERT INTO ausleihen VALUES (23, 37, 22, 12, 5, '2026-05-03 17:03', '2026-05-03 17:47', 44, 6.78);
INSERT INTO ausleihen VALUES (24, 6, 17, 10, 1, '2026-05-03 20:05', '2026-05-03 20:11', 6, 1.48);
INSERT INTO ausleihen VALUES (25, 27, 24, 11, 3, '2026-05-03 13:21', '2026-05-03 13:33', 12, 1.96);
INSERT INTO ausleihen VALUES (26, 12, 11, 12, 1, '2026-05-03 08:13', '2026-05-03 08:39', 26, 5.12);
INSERT INTO ausleihen VALUES (27, 3, 8, 11, 7, '2026-05-03 16:38', '2026-05-03 16:56', 18, 2.44);
INSERT INTO ausleihen VALUES (28, 25, 23, 2, 1, '2026-05-03 09:33', '2026-05-03 10:08', 35, 6.2);
INSERT INTO ausleihen VALUES (29, 7, 10, 4, 1, '2026-05-03 10:40', '2026-05-03 10:47', 7, 1.56);
INSERT INTO ausleihen VALUES (30, 28, 22, 2, 5, '2026-05-03 13:05', '2026-05-03 13:45', 40, 6.3);
INSERT INTO ausleihen VALUES (31, 31, 6, 8, 4, '2026-05-03 16:47', '2026-05-03 17:07', 20, 2.6);
INSERT INTO ausleihen VALUES (32, 4, 16, 4, 7, '2026-05-04 08:57', '2026-05-04 09:23', 26, 3.08);
INSERT INTO ausleihen VALUES (33, 38, 5, 6, 1, '2026-05-04 08:08', '2026-05-04 08:28', 20, 2.6);
INSERT INTO ausleihen VALUES (34, 33, 23, 3, 5, '2026-05-04 09:19', '2026-05-04 09:28', 9, 1.72);
INSERT INTO ausleihen VALUES (35, 14, 13, 3, 9, '2026-05-04 21:38', '2026-05-04 21:48', 10, 1.8);
INSERT INTO ausleihen VALUES (36, 39, 1, 1, 2, '2026-05-04 14:48', '2026-05-04 14:58', 10, 1.8);
INSERT INTO ausleihen VALUES (37, 20, 1, 1, 8, '2026-05-04 08:03', '2026-05-04 08:16', 13, 2.04);
INSERT INTO ausleihen VALUES (38, 37, 21, 1, 7, '2026-05-04 14:03', '2026-05-04 14:33', 30, 5.1);
INSERT INTO ausleihen VALUES (39, 4, 2, 12, 2, '2026-05-04 08:25', '2026-05-04 08:38', 13, 2.04);
INSERT INTO ausleihen VALUES (40, 7, 10, 7, 1, '2026-05-04 11:57', '2026-05-04 12:04', 7, 1.56);
INSERT INTO ausleihen VALUES (41, 18, 2, 3, 4, '2026-05-04 10:09', '2026-05-04 10:33', 24, 2.92);
INSERT INTO ausleihen VALUES (42, 4, 11, 2, 12, '2026-05-05 18:40', '2026-05-05 19:15', 35, 3.8);
INSERT INTO ausleihen VALUES (43, 26, 18, 12, 7, '2026-05-05 18:59', '2026-05-05 19:25', 26, 3.08);
INSERT INTO ausleihen VALUES (44, 9, 7, 12, 7, '2026-05-05 18:16', '2026-05-05 18:40', 24, 2.92);
INSERT INTO ausleihen VALUES (45, 32, 9, 3, 8, '2026-05-05 17:56', '2026-05-05 18:06', 10, 1.8);
INSERT INTO ausleihen VALUES (46, 23, 9, 5, 9, '2026-05-05 07:49', '2026-05-05 08:11', 22, 2.76);
INSERT INTO ausleihen VALUES (47, 7, 19, 12, 2, '2026-05-05 11:13', '2026-05-05 11:18', 5, 1.4);
INSERT INTO ausleihen VALUES (48, 11, 20, 7, 10, '2026-05-05 18:49', '2026-05-05 19:01', 12, 1.96);
INSERT INTO ausleihen VALUES (49, 33, 13, 8, 1, '2026-05-06 17:19', '2026-05-06 17:35', 16, 2.28);
INSERT INTO ausleihen VALUES (50, 40, 8, 7, 1, '2026-05-06 21:28', '2026-05-06 22:01', 33, 5.46);
INSERT INTO ausleihen VALUES (51, 22, 9, 11, 5, '2026-05-06 20:51', '2026-05-06 21:09', 18, 2.44);
INSERT INTO ausleihen VALUES (52, 15, 17, 12, 3, '2026-05-06 08:09', '2026-05-06 09:11', 62, 8.94);
INSERT INTO ausleihen VALUES (53, 11, 6, 7, 12, '2026-05-06 20:14', '2026-05-06 20:26', 12, 1.96);
INSERT INTO ausleihen VALUES (54, 36, 9, 3, 2, '2026-05-06 09:11', '2026-05-06 09:33', 22, 2.76);
INSERT INTO ausleihen VALUES (55, 36, 10, 3, 1, '2026-05-06 14:30', '2026-05-06 14:44', 14, 2.12);
INSERT INTO ausleihen VALUES (56, 32, 6, 9, 12, '2026-05-06 16:37', '2026-05-06 16:59', 22, 2.76);
INSERT INTO ausleihen VALUES (57, 17, 4, 2, 4, '2026-05-06 07:32', '2026-05-06 07:44', 12, 1.96);
INSERT INTO ausleihen VALUES (58, 20, 25, 8, 4, '2026-05-06 11:23', '2026-05-06 11:47', 24, 2.92);
INSERT INTO ausleihen VALUES (59, 9, 6, 9, 1, '2026-05-06 08:14', '2026-05-06 08:26', 12, 1.96);
INSERT INTO ausleihen VALUES (60, 40, 24, 1, 7, '2026-05-07 19:30', '2026-05-07 19:45', 15, 3.3);
INSERT INTO ausleihen VALUES (61, 19, 12, 7, 12, '2026-05-07 07:00', '2026-05-07 07:30', 30, 5.1);
INSERT INTO ausleihen VALUES (62, 20, 9, 7, 3, '2026-05-07 08:50', '2026-05-07 09:00', 10, 1.8);
INSERT INTO ausleihen VALUES (63, 28, 19, 5, 3, '2026-05-07 10:43', '2026-05-07 10:58', 15, 3.3);
INSERT INTO ausleihen VALUES (64, 35, 23, 12, 9, '2026-05-07 18:27', '2026-05-07 19:03', 36, 5.82);
INSERT INTO ausleihen VALUES (65, 34, 20, 12, 7, '2026-05-07 16:43', '2026-05-07 17:53', 70, 9.9);
INSERT INTO ausleihen VALUES (66, 31, 13, 3, 8, '2026-05-07 10:03', '2026-05-07 10:12', 9, 1.72);
INSERT INTO ausleihen VALUES (67, 12, 7, 8, 3, '2026-05-07 09:44', '2026-05-07 10:29', 45, 7.4);
INSERT INTO ausleihen VALUES (68, 36, 18, 3, 10, '2026-05-07 15:51', '2026-05-07 16:05', 14, 2.12);
INSERT INTO ausleihen VALUES (69, 21, 14, 4, 9, '2026-05-07 11:29', '2026-05-07 11:41', 12, 1.96);
INSERT INTO ausleihen VALUES (70, 7, 14, 6, 3, '2026-05-07 13:53', '2026-05-07 14:15', 22, 2.76);
INSERT INTO ausleihen VALUES (71, 12, 24, 3, 6, '2026-05-07 18:23', '2026-05-07 19:47', 84, 12.08);
INSERT INTO ausleihen VALUES (72, 23, 12, 6, 10, '2026-05-08 07:52', '2026-05-08 08:23', 31, 3.48);
INSERT INTO ausleihen VALUES (73, 37, 6, 1, 7, '2026-05-08 20:41', '2026-05-08 20:58', 17, 3.54);
INSERT INTO ausleihen VALUES (74, 1, 13, 5, 11, '2026-05-08 08:44', '2026-05-08 09:08', 24, 2.92);
INSERT INTO ausleihen VALUES (75, 15, 8, 9, 10, '2026-05-08 19:30', '2026-05-08 20:03', 33, 5.46);
INSERT INTO ausleihen VALUES (76, 24, 24, 12, 4, '2026-05-08 08:05', '2026-05-08 08:14', 9, 2.58);
INSERT INTO ausleihen VALUES (77, 8, 25, 6, 7, '2026-05-08 17:33', '2026-05-08 18:35', 62, 8.94);
INSERT INTO ausleihen VALUES (78, 14, 20, 7, 4, '2026-05-08 08:01', '2026-05-08 08:09', 8, 1.64);
INSERT INTO ausleihen VALUES (79, 3, 22, 8, 5, '2026-05-09 11:13', '2026-05-09 11:19', 6, 1.48);
INSERT INTO ausleihen VALUES (80, 37, 13, 11, 1, '2026-05-09 11:26', '2026-05-09 11:56', 30, 5.1);
INSERT INTO ausleihen VALUES (81, 15, 7, 3, 11, '2026-05-09 13:26', '2026-05-09 13:43', 17, 3.54);
INSERT INTO ausleihen VALUES (82, 16, 17, 1, 10, '2026-05-09 07:28', '2026-05-09 08:36', 68, 10.16);
INSERT INTO ausleihen VALUES (83, 31, 9, 10, 5, '2026-05-09 17:14', '2026-05-09 17:19', 5, 1.4);
INSERT INTO ausleihen VALUES (84, 12, 13, 11, 1, '2026-05-09 18:41', '2026-05-09 19:26', 45, 7.4);
INSERT INTO ausleihen VALUES (85, 36, 22, 8, 5, '2026-05-09 21:41', '2026-05-09 21:52', 11, 1.88);
INSERT INTO ausleihen VALUES (86, 35, 7, 7, 5, '2026-05-09 13:16', '2026-05-09 13:52', 36, 5.82);
INSERT INTO ausleihen VALUES (87, 39, 21, 11, 7, '2026-05-09 15:10', '2026-05-09 15:17', 7, 1.56);
INSERT INTO ausleihen VALUES (88, 25, 21, 10, 5, '2026-05-09 08:35', '2026-05-09 08:57', 22, 4.64);
INSERT INTO ausleihen VALUES (89, 16, 5, 1, 3, '2026-05-09 17:07', '2026-05-09 17:33', 26, 5.12);
INSERT INTO ausleihen VALUES (90, 16, 7, 3, 2, '2026-05-10 17:00', '2026-05-10 18:00', 60, 9.2);
INSERT INTO ausleihen VALUES (91, 32, 12, 10, 3, '2026-05-10 15:47', '2026-05-10 15:52', 5, 1.4);
INSERT INTO ausleihen VALUES (92, 15, 5, 1, 11, '2026-05-10 12:19', '2026-05-10 13:21', 62, 8.94);
INSERT INTO ausleihen VALUES (93, 3, 6, 11, 12, '2026-05-10 18:00', '2026-05-10 18:18', 18, 2.44);
INSERT INTO ausleihen VALUES (94, 3, 6, 1, 8, '2026-05-10 15:00', '2026-05-10 15:14', 14, 2.12);
INSERT INTO ausleihen VALUES (95, 24, 8, 12, 5, '2026-05-10 13:54', '2026-05-10 14:15', 21, 4.02);
INSERT INTO ausleihen VALUES (96, 29, 14, 2, 1, '2026-05-10 14:27', '2026-05-10 14:51', 24, 4.38);
INSERT INTO ausleihen VALUES (97, 28, 25, 8, 2, '2026-05-11 12:32', '2026-05-11 13:27', 55, 8.1);
INSERT INTO ausleihen VALUES (98, 32, 25, 2, 10, '2026-05-11 14:24', '2026-05-11 14:36', 12, 1.96);
INSERT INTO ausleihen VALUES (99, 32, 19, 6, 8, '2026-05-11 07:47', '2026-05-11 08:22', 35, 3.8);
INSERT INTO ausleihen VALUES (100, 4, 3, 10, 1, '2026-05-11 08:25', '2026-05-11 08:56', 31, 3.48);
INSERT INTO ausleihen VALUES (101, 40, 22, 3, 9, '2026-05-11 12:59', '2026-05-11 13:39', 40, 6.3);
INSERT INTO ausleihen VALUES (102, 4, 21, 1, 9, '2026-05-11 17:44', '2026-05-11 17:53', 9, 1.72);
INSERT INTO ausleihen VALUES (103, 11, 10, 7, 4, '2026-05-11 17:52', '2026-05-11 18:16', 24, 2.92);
INSERT INTO ausleihen VALUES (104, 27, 6, 8, 1, '2026-05-11 07:56', '2026-05-11 08:24', 28, 3.24);
INSERT INTO ausleihen VALUES (105, 37, 21, 8, 1, '2026-05-12 13:22', '2026-05-12 14:32', 70, 9.9);
INSERT INTO ausleihen VALUES (106, 16, 18, 7, 12, '2026-05-12 17:54', '2026-05-12 18:29', 35, 6.2);
INSERT INTO ausleihen VALUES (107, 9, 8, 5, 7, '2026-05-12 14:23', '2026-05-12 14:54', 31, 3.48);
INSERT INTO ausleihen VALUES (108, 33, 12, 2, 3, '2026-05-12 10:22', '2026-05-12 10:33', 11, 1.88);
INSERT INTO ausleihen VALUES (109, 36, 11, 12, 5, '2026-05-12 19:48', '2026-05-12 20:16', 28, 3.24);
INSERT INTO ausleihen VALUES (110, 24, 7, 3, 2, '2026-05-12 17:43', '2026-05-12 17:54', 11, 2.82);
INSERT INTO ausleihen VALUES (111, 20, 9, 10, 4, '2026-05-12 10:20', '2026-05-12 10:46', 26, 3.08);
INSERT INTO ausleihen VALUES (112, 23, 23, 9, 12, '2026-05-12 17:15', '2026-05-12 17:31', 16, 2.28);
INSERT INTO ausleihen VALUES (113, 18, 15, 3, 12, '2026-05-13 13:38', '2026-05-13 13:47', 9, 1.72);
INSERT INTO ausleihen VALUES (114, 34, 20, 9, 2, '2026-05-13 18:46', '2026-05-13 19:48', 62, 8.94);
INSERT INTO ausleihen VALUES (115, 12, 13, 11, 7, '2026-05-13 17:35', '2026-05-13 17:53', 18, 4.16);
INSERT INTO ausleihen VALUES (116, 25, 9, 3, 8, '2026-05-13 17:37', '2026-05-13 17:59', 22, 4.64);
INSERT INTO ausleihen VALUES (117, 33, 13, 1, 12, '2026-05-13 10:36', '2026-05-13 10:45', 9, 1.72);
INSERT INTO ausleihen VALUES (118, 13, 12, 7, 8, '2026-05-13 18:53', '2026-05-13 19:20', 27, 4.74);
INSERT INTO ausleihen VALUES (119, 11, 20, 5, 6, '2026-05-13 09:20', '2026-05-13 09:51', 31, 3.48);
INSERT INTO ausleihen VALUES (120, 11, 20, 1, 10, '2026-05-13 16:13', '2026-05-13 16:26', 13, 2.04);
INSERT INTO ausleihen VALUES (121, 7, 11, 12, 8, '2026-05-14 16:11', '2026-05-14 16:17', 6, 1.48);
INSERT INTO ausleihen VALUES (122, 17, 14, 12, 3, '2026-05-14 17:48', '2026-05-14 18:04', 16, 2.28);
INSERT INTO ausleihen VALUES (123, 16, 5, 7, 2, '2026-05-14 18:49', '2026-05-14 19:19', 30, 5.6);
INSERT INTO ausleihen VALUES (124, 33, 1, 12, 10, '2026-05-14 21:20', '2026-05-14 21:31', 11, 1.88);
INSERT INTO ausleihen VALUES (125, 17, 9, 2, 5, '2026-05-14 17:32', '2026-05-14 17:43', 11, 1.88);
INSERT INTO ausleihen VALUES (126, 21, 7, 8, 5, '2026-05-14 17:18', '2026-05-14 17:49', 31, 3.48);
INSERT INTO ausleihen VALUES (127, 16, 15, 4, 10, '2026-05-14 17:48', '2026-05-14 18:28', 40, 6.8);
INSERT INTO ausleihen VALUES (128, 2, 13, 10, 2, '2026-05-14 20:52', '2026-05-14 20:59', 7, 1.56);
INSERT INTO ausleihen VALUES (129, 31, 18, 3, 1, '2026-05-14 14:08', '2026-05-14 14:43', 35, 3.8);
INSERT INTO ausleihen VALUES (130, 29, 19, 1, 8, '2026-05-14 19:35', '2026-05-14 20:08', 33, 5.46);
INSERT INTO ausleihen VALUES (131, 37, 13, 8, 10, '2026-05-14 12:35', '2026-05-14 13:11', 36, 5.82);
INSERT INTO ausleihen VALUES (132, 4, 16, 7, 4, '2026-05-14 13:50', '2026-05-14 14:16', 26, 3.08);
INSERT INTO ausleihen VALUES (133, 28, 23, 1, 7, '2026-05-15 20:03', '2026-05-15 20:27', 24, 4.38);
INSERT INTO ausleihen VALUES (134, 29, 22, 12, 1, '2026-05-15 19:27', '2026-05-15 20:07', 40, 6.3);
INSERT INTO ausleihen VALUES (135, 18, 2, 5, 10, '2026-05-15 14:18', '2026-05-15 14:31', 13, 2.04);
INSERT INTO ausleihen VALUES (136, 8, 2, 7, 1, '2026-05-15 11:34', '2026-05-15 11:43', 9, 2.58);
INSERT INTO ausleihen VALUES (137, 35, 22, 2, 11, '2026-05-15 18:21', '2026-05-15 18:38', 17, 3.54);
INSERT INTO ausleihen VALUES (138, 9, 24, 9, 3, '2026-05-15 15:22', '2026-05-15 15:37', 15, 2.2);
INSERT INTO ausleihen VALUES (139, 2, 6, 7, 2, '2026-05-15 17:34', '2026-05-15 17:40', 6, 1.48);
INSERT INTO ausleihen VALUES (140, 21, 14, 12, 11, '2026-05-16 07:22', '2026-05-16 07:36', 14, 2.12);
INSERT INTO ausleihen VALUES (141, 22, 14, 1, 12, '2026-05-16 21:51', '2026-05-16 22:09', 18, 2.44);
INSERT INTO ausleihen VALUES (142, 8, 24, 3, 8, '2026-05-16 17:38', '2026-05-16 18:48', 70, 9.9);
INSERT INTO ausleihen VALUES (143, 32, 11, 2, 11, '2026-05-16 13:19', '2026-05-16 13:33', 14, 2.12);
INSERT INTO ausleihen VALUES (144, 9, 1, 1, 3, '2026-05-16 11:22', '2026-05-16 11:31', 9, 1.72);
INSERT INTO ausleihen VALUES (145, 11, 1, 11, 3, '2026-05-16 08:12', '2026-05-16 08:43', 31, 3.48);
INSERT INTO ausleihen VALUES (146, 7, 4, 10, 1, '2026-05-16 07:10', '2026-05-16 07:20', 10, 1.8);
INSERT INTO ausleihen VALUES (147, 7, 19, 8, 1, '2026-05-16 08:10', '2026-05-16 08:19', 9, 1.72);
INSERT INTO ausleihen VALUES (148, 28, 9, 7, 1, '2026-05-16 12:42', '2026-05-16 13:26', 44, 6.78);
INSERT INTO ausleihen VALUES (149, 10, 25, 12, 3, '2026-05-16 18:55', '2026-05-16 20:19', 84, 12.08);
INSERT INTO ausleihen VALUES (150, 20, 12, 8, 5, '2026-05-16 09:07', '2026-05-16 09:33', 26, 3.08);
INSERT INTO ausleihen VALUES (151, 13, 9, 7, 3, '2026-05-16 12:44', '2026-05-16 13:17', 33, 5.46);
INSERT INTO ausleihen VALUES (152, 15, 14, 9, 5, '2026-05-17 21:44', '2026-05-17 21:57', 13, 3.06);
INSERT INTO ausleihen VALUES (153, 31, 25, 5, 2, '2026-05-17 07:36', '2026-05-17 07:48', 12, 1.96);
INSERT INTO ausleihen VALUES (154, 20, 4, 2, 8, '2026-05-17 15:41', '2026-05-17 15:54', 13, 2.04);
INSERT INTO ausleihen VALUES (155, 30, 22, 7, 1, '2026-05-17 16:15', '2026-05-17 16:28', 13, 2.04);
INSERT INTO ausleihen VALUES (156, 37, 22, 1, 2, '2026-05-17 07:05', '2026-05-17 07:32', 27, 4.74);
INSERT INTO ausleihen VALUES (157, 21, 22, 7, 1, '2026-05-17 17:58', '2026-05-17 18:10', 12, 1.96);
INSERT INTO ausleihen VALUES (158, 5, 1, 5, 4, '2026-05-17 21:00', '2026-05-17 21:15', 15, 3.3);
INSERT INTO ausleihen VALUES (159, 26, 17, 2, 6, '2026-05-17 18:18', '2026-05-17 18:38', 20, 2.6);
INSERT INTO ausleihen VALUES (160, 13, 18, 7, 12, '2026-05-17 13:23', '2026-05-17 13:38', 15, 3.3);
INSERT INTO ausleihen VALUES (161, 29, 12, 8, 7, '2026-05-18 14:59', '2026-05-18 15:47', 48, 7.26);
INSERT INTO ausleihen VALUES (162, 7, 14, 10, 7, '2026-05-18 19:48', '2026-05-18 20:04', 16, 2.28);
INSERT INTO ausleihen VALUES (163, 27, 11, 7, 9, '2026-05-18 10:47', '2026-05-18 11:03', 16, 2.28);
INSERT INTO ausleihen VALUES (164, 30, 10, 10, 1, '2026-05-18 07:34', '2026-05-18 07:56', 22, 2.76);
INSERT INTO ausleihen VALUES (165, 25, 5, 7, 2, '2026-05-18 18:36', '2026-05-18 20:06', 90, 12.8);
INSERT INTO ausleihen VALUES (166, 14, 12, 9, 3, '2026-05-18 10:48', '2026-05-18 11:23', 35, 3.8);
INSERT INTO ausleihen VALUES (167, 2, 14, 12, 1, '2026-05-18 21:07', '2026-05-18 21:19', 12, 1.96);
INSERT INTO ausleihen VALUES (168, 24, 15, 3, 6, '2026-05-18 16:50', '2026-05-18 17:03', 13, 3.06);
INSERT INTO ausleihen VALUES (169, 9, 16, 11, 12, '2026-05-18 20:35', '2026-05-18 20:49', 14, 2.12);
INSERT INTO ausleihen VALUES (170, 20, 25, 8, 3, '2026-05-18 08:48', '2026-05-18 09:23', 35, 3.8);
INSERT INTO ausleihen VALUES (171, 36, 10, 3, 5, '2026-05-18 08:35', '2026-05-18 08:46', 11, 1.88);
INSERT INTO ausleihen VALUES (172, 15, 14, 8, 6, '2026-05-18 20:46', '2026-05-18 21:26', 40, 6.3);
INSERT INTO ausleihen VALUES (173, 11, 12, 3, 2, '2026-05-19 09:27', '2026-05-19 09:33', 6, 1.48);
INSERT INTO ausleihen VALUES (174, 16, 23, 7, 5, '2026-05-19 16:14', '2026-05-19 17:22', 68, 10.16);
INSERT INTO ausleihen VALUES (175, 37, 15, 8, 7, '2026-05-19 08:38', '2026-05-19 08:47', 9, 2.58);
INSERT INTO ausleihen VALUES (176, 16, 10, 5, 3, '2026-05-19 07:46', '2026-05-19 08:12', 26, 5.12);
INSERT INTO ausleihen VALUES (177, 18, 13, 6, 3, '2026-05-19 13:56', '2026-05-19 14:12', 16, 2.28);
INSERT INTO ausleihen VALUES (178, 12, 20, 11, 6, '2026-05-19 08:49', '2026-05-19 09:34', 45, 7.4);
INSERT INTO ausleihen VALUES (179, 23, 7, 11, 4, '2026-05-19 18:29', '2026-05-19 18:39', 10, 1.8);
INSERT INTO ausleihen VALUES (180, 32, 4, 1, 7, '2026-05-19 19:45', '2026-05-19 20:09', 24, 2.92);
INSERT INTO ausleihen VALUES (181, 21, 9, 1, 2, '2026-05-19 08:51', '2026-05-19 08:59', 8, 1.64);
INSERT INTO ausleihen VALUES (182, 14, 19, 12, 7, '2026-05-19 15:16', '2026-05-19 15:26', 10, 1.8);
INSERT INTO ausleihen VALUES (183, 2, 11, 12, 2, '2026-05-19 11:41', '2026-05-19 12:01', 20, 2.6);
INSERT INTO ausleihen VALUES (184, 38, 2, 10, 6, '2026-05-19 14:56', '2026-05-19 15:08', 12, 1.96);
INSERT INTO ausleihen VALUES (185, 18, 7, 1, 12, '2026-05-19 08:07', '2026-05-19 08:16', 9, 1.72);
INSERT INTO ausleihen VALUES (186, 24, 13, 12, 10, '2026-05-20 18:56', '2026-05-20 19:36', 40, 6.3);
INSERT INTO ausleihen VALUES (187, 35, 24, 2, 11, '2026-05-20 08:35', '2026-05-20 08:48', 13, 3.06);
INSERT INTO ausleihen VALUES (188, 24, 22, 7, 9, '2026-05-20 07:59', '2026-05-20 08:43', 44, 6.78);
INSERT INTO ausleihen VALUES (189, 29, 11, 3, 2, '2026-05-20 09:41', '2026-05-20 10:00', 19, 3.78);
INSERT INTO ausleihen VALUES (190, 9, 13, 9, 6, '2026-05-20 12:24', '2026-05-20 12:35', 11, 1.88);
INSERT INTO ausleihen VALUES (191, 8, 19, 6, 10, '2026-05-20 14:55', '2026-05-20 16:05', 70, 9.9);
INSERT INTO ausleihen VALUES (192, 20, 25, 7, 8, '2026-05-20 10:08', '2026-05-20 10:16', 8, 1.64);
INSERT INTO ausleihen VALUES (193, 38, 15, 3, 1, '2026-05-20 17:32', '2026-05-20 17:54', 22, 2.76);
INSERT INTO ausleihen VALUES (194, 16, 6, 7, 8, '2026-05-20 14:06', '2026-05-20 15:14', 68, 10.16);
INSERT INTO ausleihen VALUES (195, 37, 19, 4, 2, '2026-05-20 16:14', '2026-05-20 16:29', 15, 3.3);
INSERT INTO ausleihen VALUES (196, 4, 14, 10, 8, '2026-05-20 12:16', '2026-05-20 12:40', 24, 2.92);
INSERT INTO ausleihen VALUES (197, 28, 13, 3, 7, '2026-05-21 14:52', '2026-05-21 15:13', 21, 4.02);
INSERT INTO ausleihen VALUES (198, 24, 3, 5, 2, '2026-05-21 16:22', '2026-05-21 16:37', 15, 3.3);
INSERT INTO ausleihen VALUES (199, 25, 19, 3, 1, '2026-05-21 16:14', '2026-05-21 17:29', 75, 11.0);
INSERT INTO ausleihen VALUES (200, 20, 17, 7, 1, '2026-05-21 18:30', '2026-05-21 18:58', 28, 3.24);
INSERT INTO ausleihen VALUES (201, 26, 7, 8, 12, '2026-05-21 07:57', '2026-05-21 08:02', 5, 1.4);
INSERT INTO ausleihen VALUES (202, 29, 17, 7, 3, '2026-05-21 18:39', '2026-05-21 18:58', 19, 3.78);
INSERT INTO ausleihen VALUES (203, 13, 17, 8, 7, '2026-05-21 17:11', '2026-05-21 18:21', 70, 9.9);
INSERT INTO ausleihen VALUES (204, 34, 2, 11, 6, '2026-05-21 09:57', '2026-05-21 10:27', 30, 5.1);
INSERT INTO ausleihen VALUES (205, 38, 9, 8, 3, '2026-05-21 08:05', '2026-05-21 08:16', 11, 1.88);
INSERT INTO ausleihen VALUES (206, 21, 16, 8, 1, '2026-05-21 07:44', '2026-05-21 08:10', 26, 3.08);
INSERT INTO ausleihen VALUES (207, 14, 2, 7, 5, '2026-05-21 19:37', '2026-05-21 19:47', 10, 1.8);
INSERT INTO ausleihen VALUES (208, 30, 1, 7, 2, '2026-05-22 12:37', '2026-05-22 12:46', 9, 1.72);
INSERT INTO ausleihen VALUES (209, 22, 9, 5, 7, '2026-05-22 11:01', '2026-05-22 11:07', 6, 1.48);
INSERT INTO ausleihen VALUES (210, 40, 14, 12, 10, '2026-05-22 18:29', '2026-05-22 19:24', 55, 8.1);
INSERT INTO ausleihen VALUES (211, 20, 10, 1, 8, '2026-05-22 20:40', '2026-05-22 20:56', 16, 2.28);
INSERT INTO ausleihen VALUES (212, 20, 7, 1, 5, '2026-05-22 18:58', '2026-05-22 19:26', 28, 3.24);
INSERT INTO ausleihen VALUES (213, 4, 17, 12, 7, '2026-05-22 15:19', '2026-05-22 15:43', 24, 2.92);
INSERT INTO ausleihen VALUES (214, 1, 5, 5, 3, '2026-05-22 09:05', '2026-05-22 09:40', 35, 3.8);
INSERT INTO ausleihen VALUES (215, 36, 3, 1, 3, '2026-05-22 11:05', '2026-05-22 11:21', 16, 2.28);
INSERT INTO ausleihen VALUES (216, 36, 19, 11, 5, '2026-05-22 15:50', '2026-05-22 15:57', 7, 1.56);
INSERT INTO ausleihen VALUES (217, 35, 4, 5, 7, '2026-05-22 08:46', '2026-05-22 09:07', 21, 4.02);
INSERT INTO ausleihen VALUES (218, 28, 19, 7, 3, '2026-05-23 21:51', '2026-05-23 22:00', 9, 2.58);
INSERT INTO ausleihen VALUES (219, 17, 9, 7, 6, '2026-05-23 10:25', '2026-05-23 10:56', 31, 3.48);
INSERT INTO ausleihen VALUES (220, 13, 11, 3, 1, '2026-05-23 09:10', '2026-05-23 09:34', 24, 4.38);
INSERT INTO ausleihen VALUES (221, 15, 18, 12, 8, '2026-05-23 07:48', '2026-05-23 08:01', 13, 3.06);
INSERT INTO ausleihen VALUES (222, 5, 23, 12, 11, '2026-05-23 21:10', '2026-05-23 21:27', 17, 3.54);
INSERT INTO ausleihen VALUES (223, 31, 9, 10, 7, '2026-05-23 07:11', '2026-05-23 07:33', 22, 2.76);
INSERT INTO ausleihen VALUES (224, 6, 13, 8, 3, '2026-05-23 16:23', '2026-05-23 16:43', 20, 2.6);
INSERT INTO ausleihen VALUES (225, 16, 22, 10, 1, '2026-05-23 13:00', '2026-05-23 13:22', 22, 4.64);
INSERT INTO ausleihen VALUES (226, 15, 22, 8, 11, '2026-05-24 14:57', '2026-05-24 15:59', 62, 8.94);
INSERT INTO ausleihen VALUES (227, 20, 17, 3, 12, '2026-05-24 17:00', '2026-05-24 17:10', 10, 1.8);
INSERT INTO ausleihen VALUES (228, 26, 17, 7, 2, '2026-05-24 16:26', '2026-05-24 16:33', 7, 1.56);
INSERT INTO ausleihen VALUES (229, 40, 23, 8, 12, '2026-05-24 16:17', '2026-05-24 16:32', 15, 3.3);
INSERT INTO ausleihen VALUES (230, 7, 10, 3, 1, '2026-05-24 11:29', '2026-05-24 11:47', 18, 2.44);
INSERT INTO ausleihen VALUES (231, 33, 22, 7, 6, '2026-05-24 19:50', '2026-05-24 19:58', 8, 1.64);
INSERT INTO ausleihen VALUES (232, 8, 7, 5, 10, '2026-05-24 13:15', '2026-05-24 13:34', 19, 3.78);
INSERT INTO ausleihen VALUES (233, 1, 25, 7, 8, '2026-05-24 15:09', '2026-05-24 15:18', 9, 1.72);
INSERT INTO ausleihen VALUES (234, 22, 18, 11, 3, '2026-05-24 14:12', '2026-05-24 14:20', 8, 1.64);
INSERT INTO ausleihen VALUES (235, 31, 13, 11, 4, '2026-05-24 18:46', '2026-05-24 19:14', 28, 3.24);
INSERT INTO ausleihen VALUES (236, 7, 2, 8, 3, '2026-05-24 19:43', '2026-05-24 19:51', 8, 1.64);
INSERT INTO ausleihen VALUES (237, 17, 18, 5, 8, '2026-05-24 10:14', '2026-05-24 10:25', 11, 1.88);
INSERT INTO ausleihen VALUES (238, 6, 13, 1, 7, '2026-05-24 18:56', '2026-05-24 19:04', 8, 1.64);
INSERT INTO ausleihen VALUES (239, 8, 25, 12, 3, '2026-05-25 19:13', '2026-05-25 19:24', 11, 2.82);
INSERT INTO ausleihen VALUES (240, 37, 14, 1, 12, '2026-05-25 19:08', '2026-05-25 19:44', 36, 5.82);
INSERT INTO ausleihen VALUES (241, 3, 18, 3, 1, '2026-05-25 16:59', '2026-05-25 17:09', 10, 1.8);
INSERT INTO ausleihen VALUES (242, 31, 17, 7, 5, '2026-05-25 07:16', '2026-05-25 07:30', 14, 2.12);
INSERT INTO ausleihen VALUES (243, 23, 7, 1, 12, '2026-05-25 17:51', '2026-05-25 17:56', 5, 1.4);
INSERT INTO ausleihen VALUES (244, 2, 15, 12, 10, '2026-05-25 19:31', '2026-05-25 19:42', 11, 1.88);
INSERT INTO ausleihen VALUES (245, 7, 17, 1, 12, '2026-05-25 16:52', '2026-05-25 17:03', 11, 1.88);
INSERT INTO ausleihen VALUES (246, 1, 25, 7, 4, '2026-05-25 16:09', '2026-05-25 16:16', 7, 1.56);
INSERT INTO ausleihen VALUES (247, 4, 18, 3, 7, '2026-05-26 17:59', '2026-05-26 18:09', 10, 1.8);
INSERT INTO ausleihen VALUES (248, 25, 14, 11, 9, '2026-05-26 11:41', '2026-05-26 12:49', 68, 10.16);
INSERT INTO ausleihen VALUES (249, 40, 2, 3, 8, '2026-05-26 19:55', '2026-05-26 20:39', 44, 6.78);
INSERT INTO ausleihen VALUES (250, 14, 11, 12, 2, '2026-05-26 08:57', '2026-05-26 09:05', 8, 1.64);
INSERT INTO ausleihen VALUES (251, 1, 1, 1, 5, '2026-05-26 08:52', '2026-05-26 09:14', 22, 2.76);
INSERT INTO ausleihen VALUES (252, 33, 1, 5, 12, '2026-05-26 09:23', '2026-05-26 09:49', 26, 3.08);
INSERT INTO ausleihen VALUES (253, 23, 5, 12, 2, '2026-05-26 21:35', '2026-05-26 21:50', 15, 2.2);
INSERT INTO ausleihen VALUES (254, 3, 7, 12, 2, '2026-05-26 12:22', '2026-05-26 12:33', 11, 1.88);
INSERT INTO ausleihen VALUES (255, 7, 15, 5, 4, '2026-05-27 18:14', '2026-05-27 18:49', 35, 3.8);
INSERT INTO ausleihen VALUES (256, 25, 6, 8, 1, '2026-05-27 19:12', '2026-05-27 19:38', 26, 5.12);
INSERT INTO ausleihen VALUES (257, 40, 8, 1, 3, '2026-05-27 14:49', '2026-05-27 15:00', 11, 2.82);
INSERT INTO ausleihen VALUES (258, 6, 20, 9, 1, '2026-05-27 11:06', '2026-05-27 11:37', 31, 3.48);
INSERT INTO ausleihen VALUES (259, 7, 2, 3, 7, '2026-05-27 12:45', '2026-05-27 12:51', 6, 1.48);
INSERT INTO ausleihen VALUES (260, 16, 8, 5, 10, '2026-05-27 09:52', '2026-05-27 10:44', 52, 8.24);
INSERT INTO ausleihen VALUES (261, 4, 13, 5, 3, '2026-05-27 10:36', '2026-05-27 10:50', 14, 2.12);
INSERT INTO ausleihen VALUES (262, 3, 15, 2, 3, '2026-05-28 18:32', '2026-05-28 19:03', 31, 3.48);
INSERT INTO ausleihen VALUES (263, 32, 25, 4, 3, '2026-05-28 20:46', '2026-05-28 21:17', 31, 3.48);
INSERT INTO ausleihen VALUES (264, 11, 25, 12, 7, '2026-05-28 17:47', '2026-05-28 18:02', 15, 2.2);
INSERT INTO ausleihen VALUES (265, 13, 11, 4, 5, '2026-05-28 12:03', '2026-05-28 12:20', 17, 3.54);
INSERT INTO ausleihen VALUES (266, 16, 15, 9, 7, '2026-05-28 18:03', '2026-05-28 18:29', 26, 5.12);
INSERT INTO ausleihen VALUES (267, 18, 23, 8, 4, '2026-05-28 18:03', '2026-05-28 18:13', 10, 1.8);
INSERT INTO ausleihen VALUES (268, 38, 24, 12, 1, '2026-05-28 20:09', '2026-05-28 20:23', 14, 2.12);
INSERT INTO ausleihen VALUES (269, 33, 7, 2, 1, '2026-05-28 12:03', '2026-05-28 12:14', 11, 1.88);
INSERT INTO ausleihen VALUES (270, 27, 2, 1, 8, '2026-05-28 10:59', '2026-05-28 11:30', 31, 3.48);
INSERT INTO ausleihen VALUES (271, 31, 3, 9, 2, '2026-05-28 08:37', '2026-05-28 08:51', 14, 2.12);
INSERT INTO ausleihen VALUES (272, 35, 9, 7, 12, '2026-05-28 19:02', '2026-05-28 19:15', 13, 3.06);
INSERT INTO ausleihen VALUES (273, 37, 22, 1, 9, '2026-05-28 17:37', '2026-05-28 18:01', 24, 4.38);
INSERT INTO ausleihen VALUES (274, 40, 10, 7, 8, '2026-05-29 17:11', '2026-05-29 17:41', 30, 5.1);
INSERT INTO ausleihen VALUES (275, 8, 25, 5, 1, '2026-05-29 15:46', '2026-05-29 16:16', 30, 5.1);
INSERT INTO ausleihen VALUES (276, 17, 3, 1, 7, '2026-05-29 18:58', '2026-05-29 19:13', 15, 2.2);
INSERT INTO ausleihen VALUES (277, 13, 8, 7, 8, '2026-05-29 12:57', '2026-05-29 13:33', 36, 5.82);
INSERT INTO ausleihen VALUES (278, 3, 24, 6, 7, '2026-05-29 18:57', '2026-05-29 19:12', 15, 2.2);
INSERT INTO ausleihen VALUES (279, 23, 11, 1, 7, '2026-05-29 10:46', '2026-05-29 11:04', 18, 2.44);
INSERT INTO ausleihen VALUES (280, 29, 5, 11, 2, '2026-05-29 13:06', '2026-05-29 13:33', 27, 4.74);
INSERT INTO ausleihen VALUES (281, 19, 4, 1, 4, '2026-05-30 07:04', '2026-05-30 07:25', 21, 4.02);
INSERT INTO ausleihen VALUES (282, 35, 23, 1, 12, '2026-05-30 19:45', '2026-05-30 20:33', 48, 7.26);
INSERT INTO ausleihen VALUES (283, 8, 10, 7, 10, '2026-05-30 14:18', '2026-05-30 14:27', 9, 2.58);
INSERT INTO ausleihen VALUES (284, 9, 21, 8, 12, '2026-05-30 13:53', '2026-05-30 14:13', 20, 2.6);
INSERT INTO ausleihen VALUES (285, 37, 8, 8, 7, '2026-05-30 17:56', '2026-05-30 18:29', 33, 5.46);
INSERT INTO ausleihen VALUES (286, 9, 15, 7, 8, '2026-05-30 16:51', '2026-05-30 17:17', 26, 3.08);
INSERT INTO ausleihen VALUES (287, 26, 12, 12, 4, '2026-05-30 20:02', '2026-05-30 20:33', 31, 3.48);
INSERT INTO ausleihen VALUES (288, 14, 13, 3, 1, '2026-05-30 20:52', '2026-05-30 21:06', 14, 2.12);
INSERT INTO ausleihen VALUES (289, 6, 7, 8, 5, '2026-05-30 10:06', '2026-05-30 10:12', 6, 1.48);
INSERT INTO ausleihen VALUES (290, 10, 25, 7, 1, '2026-05-30 08:23', '2026-05-30 08:41', 18, 4.16);
INSERT INTO ausleihen VALUES (291, 37, 2, 7, 3, '2026-05-30 18:58', '2026-05-30 19:38', 40, 6.3);
INSERT INTO ausleihen VALUES (292, 37, 9, 11, 8, '2026-05-31 18:51', '2026-05-31 19:02', 11, 2.82);
INSERT INTO ausleihen VALUES (293, 6, 21, 7, 9, '2026-05-31 08:12', '2026-05-31 08:24', 12, 1.96);
INSERT INTO ausleihen VALUES (294, 34, 12, 7, 3, '2026-05-31 11:35', '2026-05-31 11:52', 17, 3.54);
INSERT INTO ausleihen VALUES (295, 23, 8, 6, 8, '2026-05-31 15:41', '2026-05-31 15:48', 7, 1.56);
INSERT INTO ausleihen VALUES (296, 22, 22, 7, 10, '2026-05-31 17:00', '2026-05-31 17:15', 15, 2.2);
INSERT INTO ausleihen VALUES (297, 34, 14, 11, 7, '2026-05-31 15:21', '2026-05-31 15:36', 15, 3.3);
INSERT INTO ausleihen VALUES (298, 33, 2, 8, 2, '2026-05-31 16:20', '2026-05-31 16:33', 13, 2.04);
INSERT INTO ausleihen VALUES (299, 23, 11, 7, 3, '2026-05-31 14:08', '2026-05-31 14:43', 35, 3.8);
INSERT INTO ausleihen VALUES (300, 25, 17, 8, 10, '2026-05-31 16:46', '2026-05-31 17:26', 40, 6.8);
INSERT INTO ausleihen VALUES (301, 7, 9, 12, 6, '2026-05-31 16:01', '2026-05-31 16:16', 15, 2.2);
INSERT INTO ausleihen VALUES (302, 32, 15, 10, 4, '2026-05-31 08:13', '2026-05-31 08:28', 15, 2.2);

-- ---------- werkstatt ----------
INSERT INTO werkstatt VALUES (1, 36, '2026-05-01', 'Schaltung', 132.43);
INSERT INTO werkstatt VALUES (2, 10, '2026-05-01', 'Inspektion', 66.0);
INSERT INTO werkstatt VALUES (3, 7, '2026-05-03', 'Licht defekt', 141.6);
INSERT INTO werkstatt VALUES (4, 33, '2026-05-03', 'Schaltung', 126.66);
INSERT INTO werkstatt VALUES (5, 23, '2026-05-03', 'Akku getauscht', 38.28);
INSERT INTO werkstatt VALUES (6, 31, '2026-05-03', 'Akku getauscht', 12.23);
INSERT INTO werkstatt VALUES (7, 36, '2026-05-05', 'Sattel ersetzt', 71.0);
INSERT INTO werkstatt VALUES (8, 30, '2026-05-07', 'Inspektion', 42.67);
INSERT INTO werkstatt VALUES (9, 22, '2026-05-10', 'Sattel ersetzt', 139.78);
INSERT INTO werkstatt VALUES (10, 33, '2026-05-10', 'Platter Reifen', 42.46);
INSERT INTO werkstatt VALUES (11, 1, '2026-05-11', 'Akku getauscht', 113.73);
INSERT INTO werkstatt VALUES (12, 27, '2026-05-12', 'Schaltung', 68.99);
INSERT INTO werkstatt VALUES (13, 8, '2026-05-21', 'Platter Reifen', 42.91);
INSERT INTO werkstatt VALUES (14, 33, '2026-05-22', 'Akku getauscht', 64.27);
INSERT INTO werkstatt VALUES (15, 25, '2026-05-24', 'Bremse defekt', 116.5);
INSERT INTO werkstatt VALUES (16, 8, '2026-05-25', 'Rahmen verbogen', 90.85);
INSERT INTO werkstatt VALUES (17, 40, '2026-05-25', 'Bremse defekt', 45.18);
INSERT INTO werkstatt VALUES (18, 11, '2026-05-27', 'Akku getauscht', 113.3);
INSERT INTO werkstatt VALUES (19, 13, '2026-05-28', 'Licht defekt', 71.78);
INSERT INTO werkstatt VALUES (20, 25, '2026-05-29', 'Sattel ersetzt', 123.82);
INSERT INTO werkstatt VALUES (21, 9, '2026-05-30', 'Bremse defekt', 28.49);
INSERT INTO werkstatt VALUES (22, 10, '2026-05-30', 'Licht defekt', 111.73);
INSERT INTO werkstatt VALUES (23, 2, '2026-05-30', 'Bremse defekt', 22.39);
INSERT INTO werkstatt VALUES (24, 19, '2026-05-31', 'Inspektion', 70.71);

-- ---------- ausleihen_roh ----------
INSERT INTO ausleihen_roh VALUES (1, 'Mia Ahrens', 'Basis', 1995, 7, 'E-Bike', 'Marktplatz', 'Altstadt', 'Universität', '2026-05-04 08:12', '2026-05-04 08:31', 19);
INSERT INTO ausleihen_roh VALUES (2, 'Ben Bruhns', 'Schule', 2008, 12, 'Citybike', 'Schulzentrum', 'Südpark', 'Marktplatz', '2026-05-04 13:40', '2026-05-04 13:58', 18);
INSERT INTO ausleihen_roh VALUES (3, 'Mia Ahrens', 'Plus', 1995, 7, 'E-Bike', 'Universität', 'Univiertel', 'Marktplatz', '2026-05-04 17:05', '2026-05-04 17:26', 21);
INSERT INTO ausleihen_roh VALUES (4, 'Lena Cordes', 'Basis', 1987, 3, 'Citybike', 'Markplatz', 'Altstadt', 'Alte Werft', '2026-05-05 09:02', '2026-05-05 09:20', 18);
INSERT INTO ausleihen_roh VALUES (5, 'Ben Bruhns', 'Schule', 2008, 12, 'Citybike', 'Marktplatz', 'Altstadt', 'Schulzentrum', '2026-05-05 15:10', '2026-05-05 15:29', 19);
INSERT INTO ausleihen_roh VALUES (6, 'Jonas Dierks', 'Plus', 1979, 21, 'Lastenrad', 'Fischmarkt', 'Hafen', 'Klinikum', '2026-05-06 10:15', '2026-05-06 11:02', 47);
INSERT INTO ausleihen_roh VALUES (7, 'Mia Ahrens', 'Plus', 1995, 7, 'E-Bike', 'Marktplatz ', 'Altstadt', 'Bahnhof Nord', '2026-05-07 07:55', '2026-05-07 08:09', 14);
INSERT INTO ausleihen_roh VALUES (8, 'Lena Cordes', 'Basis', 1987, 3, 'Citybike', 'Alte Werft', 'Hafen', NULL, '2026-05-07 18:30', NULL, NULL);
INSERT INTO ausleihen_roh VALUES (9, 'Emma Ehlers', 'Schule', 2009, 15, 'Citybike', 'Schulzentrum', 'Südpark', 'Südpark', '2026-05-08 14:22', '2026-05-08 14:33', 11);
INSERT INTO ausleihen_roh VALUES (10, 'Jonas Dierks', 'Plus', 1979, 21, 'Lastenrad', 'Klinikum', 'Weststadt', 'Fischmarkt', '2026-05-08 16:40', '2026-05-08 17:21', 41);
INSERT INTO ausleihen_roh VALUES (11, 'Luca Focken', 'Basis', 2002, 7, 'E-Bike', 'Bahnhof Nord', 'Bahnhof', 'Universität', '2026-05-09 08:03', '2026-05-09 08:24', 21);
INSERT INTO ausleihen_roh VALUES (12, 'Lena Cordes', 'Basis', 1987, 3, 'Citybike', 'Marktplatz', 'Altstadt', 'Rathaus', '2026-05-10 11:11', '2026-05-10 11:19', 8);
