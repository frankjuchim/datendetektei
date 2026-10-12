-- =====================================================================
-- Datendetektei Weserstedt · basis.sql der Übungsdatenbank „fundbuero“
-- ERZEUGT von scripts/db_bauen.js (npm run db) – nicht von Hand ändern.
-- Datenbank: fundbuero
-- Seed: datendetektei:fundbuero:v1 (FNV-1a 0x6a46397f)
-- Version: 1
-- SHA-256 (Datenteil): 49f0f8c596854e2d4f52355c53753f48256fd8d81e2ac1f70a908be796b011ed
-- =====================================================================

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

-- ===== Daten (erzeugt) =====
BEGIN;
PRAGMA defer_foreign_keys = ON;

-- Fundsache: 80 Zeilen
INSERT INTO Fundsache VALUES (1, 'E-Reader', 'Elektronik', 'grau', 'Schulzentrum, Pausenhof', 'Nordheide', '2026-04-01', 127.0, 'D. Harjes', NULL);
INSERT INTO Fundsache VALUES (2, 'Regenjacke', 'Kleidung', 'grün', 'Café am Lindenplatz', 'Lindenhof', '2026-04-04', 10.0, NULL, '2026-04-14');
INSERT INTO Fundsache VALUES (3, 'Monatskarte', 'Dokumente', 'braun', 'Station Hafenkante', 'Hafenviertel', '2026-04-05', 9.0, NULL, NULL);
INSERT INTO Fundsache VALUES (4, 'Geldbörse', 'Taschen', 'blau', 'Station Heidepark', 'Nordheide', '2026-04-06', 32.0, 'F. Nowak', '2026-04-26');
INSERT INTO Fundsache VALUES (5, 'Turnbeutel', 'Taschen', 'grau', 'Schulzentrum, Pausenhof', 'Nordheide', '2026-04-07', 14.0, 'H. Ahrensfeld', '2026-04-10');
INSERT INTO Fundsache VALUES (6, 'E-Reader', 'Elektronik', 'weiß', 'Station Alte Werft', 'Hafenviertel', '2026-04-13', 84.0, NULL, NULL);
INSERT INTO Fundsache VALUES (7, 'Brillenetui', 'Sonstiges', NULL, 'Station Universität', 'Lindenhof', '2026-04-17', 40.0, 'U. Kück', '2026-04-18');
INSERT INTO Fundsache VALUES (8, 'Schal', 'Kleidung', 'blau', 'Haltestelle Deichkamp', 'Deichkamp', '2026-04-20', 33.0, 'B. Diekmann', '2026-04-26');
INSERT INTO Fundsache VALUES (9, 'Taschenkompass', 'Spielzeug', 'rot', 'Schulzentrum, Pausenhof', 'Nordheide', '2026-04-21', 3.0, 'L. Cordes', '2026-04-23');
INSERT INTO Fundsache VALUES (10, 'Jacke', 'Kleidung', 'rot', 'Station Alte Werft', 'Hafenviertel', '2026-04-26', 27.0, 'O. Schierholz', '2026-05-03');
INSERT INTO Fundsache VALUES (11, 'Mappe mit Noten', 'Dokumente', 'schwarz', 'Station Mensa', 'Lindenhof', '2026-04-28', 15.0, 'S. Kück', NULL);
INSERT INTO Fundsache VALUES (12, 'Regenjacke', 'Kleidung', NULL, 'Fähranleger', 'Weserufer', '2026-05-06', 46.0, 'V. Jaspers', NULL);
INSERT INTO Fundsache VALUES (13, 'Schlüsselbund', 'Schlüssel', 'weiß', 'Bus Linie 3', 'Bahnhofsviertel', '2026-05-07', NULL, 'H. Ihnken', '2026-05-19');
INSERT INTO Fundsache VALUES (14, 'Schal', 'Kleidung', 'bunt', 'Bus Linie 3', 'Bahnhofsviertel', '2026-05-11', 5.0, 'J. Bödeker', '2026-05-20');
INSERT INTO Fundsache VALUES (15, 'Jacke', 'Kleidung', 'weiß', 'Festplatz', 'Weserufer', '2026-05-11', 10.0, NULL, '2026-06-01');
INSERT INTO Fundsache VALUES (16, 'Briefkastenschlüssel', 'Schlüssel', 'rot', 'Station Universität', 'Lindenhof', '2026-05-11', 17.0, 'K. Kampen', '2026-05-26');
INSERT INTO Fundsache VALUES (17, 'Armbanduhr', 'Schmuck', 'rot', 'Station Fischmarkt', 'Hafenviertel', '2026-05-14', 149.0, 'R. Tiemann', NULL);
INSERT INTO Fundsache VALUES (18, 'Schal', 'Kleidung', 'silber', 'Café am Lindenplatz', 'Lindenhof', '2026-05-15', 9.0, 'H. Eggers', NULL);
INSERT INTO Fundsache VALUES (19, 'Messingschlüssel', 'Schlüssel', 'gold', 'Rathaus, Eingang', 'Altstadt', '2026-05-15', NULL, 'H. Immig', NULL);
INSERT INTO Fundsache VALUES (20, 'Notizbuch', 'Dokumente', 'grau', 'Station Universität', 'Lindenhof', '2026-05-16', 30.0, 'L. Beckhusen', '2026-05-30');
INSERT INTO Fundsache VALUES (21, 'Autoschlüssel', 'Schlüssel', 'braun', 'Fischmarkt', 'Hafenviertel', '2026-05-19', 23.0, 'N. Engelken', NULL);
INSERT INTO Fundsache VALUES (22, 'Ladekabel', 'Elektronik', 'weiß', 'Festplatz', 'Weserufer', '2026-05-20', 100.0, 'N. Klattenhoff', NULL);
INSERT INTO Fundsache VALUES (23, 'Turnbeutel', 'Taschen', 'gelb', 'Vereinsheim TuS', 'Mühlenfeld', '2026-05-23', 33.0, 'S. Wachtendorf', '2026-05-29');
INSERT INTO Fundsache VALUES (24, 'Schlüsselbund', 'Schlüssel', NULL, 'Station Alte Werft', 'Hafenviertel', '2026-05-24', 37.0, 'W. Rabe', '2026-06-05');
INSERT INTO Fundsache VALUES (25, 'Sporttasche', 'Taschen', 'silber', 'Weserpromenade', 'Weserufer', '2026-05-26', 35.0, 'N. Hinners', '2026-06-14');
INSERT INTO Fundsache VALUES (26, 'Helm', 'Fahrradzubehör', 'blau', 'Gewerbegebiet am Deich', 'Deichkamp', '2026-05-27', 44.0, 'F. Kowalski', '2026-06-10');
INSERT INTO Fundsache VALUES (27, 'Armbanduhr', 'Schmuck', 'silber', 'Fischmarkt', 'Hafenviertel', '2026-05-28', NULL, 'P. Rohlfs', NULL);
INSERT INTO Fundsache VALUES (28, 'Schlüsselbund', 'Schlüssel', 'braun', 'Station Klinikum', 'Mühlenfeld', '2026-05-28', 8.0, 'R. Lampe', NULL);
INSERT INTO Fundsache VALUES (29, 'Geldbörse', 'Taschen', 'grau', 'Fähranleger', 'Weserufer', '2026-05-29', 10.0, 'E. Rossi', '2026-06-09');
INSERT INTO Fundsache VALUES (30, 'Kopfhörer', 'Elektronik', 'rot', 'Station Rathaus', 'Altstadt', '2026-06-01', 111.0, 'J. Möhlmann', '2026-06-17');
INSERT INTO Fundsache VALUES (31, 'Brillenetui', 'Sonstiges', NULL, 'Bus Linie 3', 'Bahnhofsviertel', '2026-06-01', 5.0, 'M. Ahrens', NULL);
INSERT INTO Fundsache VALUES (32, 'Fahrradschlüssel', 'Schlüssel', 'bunt', 'Café am Lindenplatz', 'Lindenhof', '2026-06-02', NULL, 'G. Jaspers', NULL);
INSERT INTO Fundsache VALUES (33, 'Notizbuch', 'Dokumente', 'grau', 'Station Universität', 'Lindenhof', '2026-06-03', 12.0, 'L. Hoffrogge', NULL);
INSERT INTO Fundsache VALUES (34, 'Smartphone', 'Elektronik', NULL, 'Haltestelle Deichkamp', 'Deichkamp', '2026-06-09', 27.0, 'F. Harjes', '2026-06-15');
INSERT INTO Fundsache VALUES (35, 'Spielzeugauto', 'Spielzeug', 'schwarz', 'Station Hafenkante', 'Hafenviertel', '2026-06-11', 20.0, 'S. Habben', '2026-06-29');
INSERT INTO Fundsache VALUES (36, 'Messing-Kompass', 'Wertsachen', 'gold', 'Weserpromenade', 'Weserufer', '2026-06-18', 450.0, 'N. Falter', '2026-09-14');
INSERT INTO Fundsache VALUES (37, 'Kompass-Anhänger', 'Schmuck', 'silber', 'Marktplatz', 'Altstadt', '2026-06-19', 25.0, NULL, NULL);
INSERT INTO Fundsache VALUES (38, 'Kuscheltier', 'Spielzeug', 'schwarz', 'Station Bahnhof Süd', 'Bahnhofsviertel', '2026-06-21', 7.0, 'B. Hemmen', '2026-06-24');
INSERT INTO Fundsache VALUES (39, 'Regenjacke', 'Kleidung', 'schwarz', 'Station Alte Werft', 'Hafenviertel', '2026-06-21', 39.0, 'C. Renken', '2026-06-28');
INSERT INTO Fundsache VALUES (40, 'Monatskarte', 'Dokumente', 'weiß', 'Bus Linie 4', 'Bahnhofsviertel', '2026-06-24', NULL, 'R. Ihnken', NULL);
INSERT INTO Fundsache VALUES (41, 'Ball', 'Spielzeug', 'gelb', 'Marktplatz', 'Altstadt', '2026-06-27', 20.0, 'J. Stelljes', NULL);
INSERT INTO Fundsache VALUES (42, 'Fernglas', 'Wertsachen', 'schwarz', 'Station Hafenkante', 'Hafenviertel', '2026-06-27', 180.0, 'K. Wilms', NULL);
INSERT INTO Fundsache VALUES (43, 'Helm', 'Fahrradzubehör', 'bunt', 'Station Marktplatz', 'Altstadt', '2026-07-03', 20.0, 'J. Kück', '2026-07-16');
INSERT INTO Fundsache VALUES (44, 'Goldarmband', 'Schmuck', 'gold', 'Freibad Mühlenfeld', 'Mühlenfeld', '2026-07-03', 320.0, 'R. Aden', '2026-07-06');
INSERT INTO Fundsache VALUES (45, 'Fahrradschlüssel', 'Schlüssel', 'rot', 'Festplatz', 'Weserufer', '2026-07-07', 28.0, NULL, '2026-07-28');
INSERT INTO Fundsache VALUES (46, 'Messing-Kerzenhalter', 'Sonstiges', 'gold', 'Café am Lindenplatz', 'Lindenhof', '2026-07-09', 35.0, 'S. Tebbe', '2026-07-14');
INSERT INTO Fundsache VALUES (47, 'Briefkastenschlüssel', 'Schlüssel', 'schwarz', 'Station Mensa', 'Lindenhof', '2026-07-11', NULL, 'R. Mammen', '2026-07-28');
INSERT INTO Fundsache VALUES (48, 'Smartphone', 'Elektronik', 'braun', 'Gewerbegebiet am Deich', 'Deichkamp', '2026-07-12', 36.0, 'E. Mammen', '2026-07-28');
INSERT INTO Fundsache VALUES (49, 'Kinderuhr', 'Spielzeug', 'bunt', 'Spielplatz am Rathaus', 'Altstadt', '2026-07-18', 8.0, NULL, '2026-07-18');
INSERT INTO Fundsache VALUES (50, 'Armbanduhr', 'Schmuck', NULL, 'Gewerbegebiet am Deich', 'Deichkamp', '2026-07-20', 100.0, 'I. Kahrs', '2026-08-03');
INSERT INTO Fundsache VALUES (51, 'Kamera', 'Wertsachen', 'schwarz', 'Festplatz', 'Weserufer', '2026-07-24', 390.0, 'J. Sanders', NULL);
INSERT INTO Fundsache VALUES (52, 'Mütze', 'Kleidung', NULL, 'Festplatz', 'Weserufer', '2026-07-27', 32.0, 'J. Wöltjen', '2026-08-07');
INSERT INTO Fundsache VALUES (53, 'Handschuh', 'Kleidung', NULL, 'Marktplatz', 'Altstadt', '2026-07-28', 42.0, 'S. Abeling', '2026-07-28');
INSERT INTO Fundsache VALUES (54, 'Armbanduhr', 'Schmuck', NULL, 'Fischmarkt', 'Hafenviertel', '2026-07-30', NULL, 'A. Haddad', '2026-08-19');
INSERT INTO Fundsache VALUES (55, 'Kopfhörer', 'Elektronik', 'braun', 'Schulzentrum, Pausenhof', 'Nordheide', '2026-07-31', 128.0, 'S. Haddad', NULL);
INSERT INTO Fundsache VALUES (56, 'Regenjacke', 'Kleidung', 'blau', 'Station Bahnhof Nord', 'Bahnhofsviertel', '2026-07-31', 40.0, 'T. Habben', '2026-08-03');
INSERT INTO Fundsache VALUES (57, 'Ladekabel', 'Elektronik', NULL, 'Vereinsheim TuS', 'Mühlenfeld', '2026-08-09', 100.0, 'O. Kowalski', '2026-08-28');
INSERT INTO Fundsache VALUES (58, 'Mütze', 'Kleidung', 'gold', 'Station Universität', 'Lindenhof', '2026-08-11', 53.0, 'H. Rippen', NULL);
INSERT INTO Fundsache VALUES (59, 'Rucksack', 'Taschen', 'blau', 'Bus Linie 1', 'Bahnhofsviertel', '2026-08-12', 19.0, 'M. Diekmann', '2026-08-22');
INSERT INTO Fundsache VALUES (60, 'Ladekabel', 'Elektronik', 'schwarz', 'Bus Linie 1', 'Bahnhofsviertel', '2026-08-14', 88.0, 'J. Luttmann', NULL);
INSERT INTO Fundsache VALUES (61, 'Messingglocke', 'Fahrradzubehör', 'gold', 'Station Hafenkante', 'Hafenviertel', '2026-08-21', 12.0, NULL, NULL);
INSERT INTO Fundsache VALUES (62, 'Geldbörse', 'Taschen', 'schwarz', 'Station Rathaus', 'Altstadt', '2026-08-23', 73.0, 'U. Grotelüschen', NULL);
INSERT INTO Fundsache VALUES (63, 'Autoschlüssel', 'Schlüssel', 'blau', 'Café am Lindenplatz', 'Lindenhof', '2026-08-24', 22.0, 'G. Hedden', NULL);
INSERT INTO Fundsache VALUES (64, 'Armbanduhr', 'Schmuck', NULL, 'Fähranleger', 'Weserufer', '2026-08-24', 22.0, 'H. Habben', '2026-09-02');
INSERT INTO Fundsache VALUES (65, 'Geldbörse', 'Taschen', 'gelb', 'Festplatz', 'Weserufer', '2026-08-28', 12.0, 'M. Kolthoff', '2026-09-08');
INSERT INTO Fundsache VALUES (66, 'Schal', 'Kleidung', 'grau', 'Festplatz', 'Weserufer', '2026-08-29', 21.0, 'J. Rossi', NULL);
INSERT INTO Fundsache VALUES (67, 'Smartphone', 'Elektronik', 'gelb', 'Festplatz', 'Weserufer', '2026-08-29', 132.0, 'K. Dirksen', NULL);
INSERT INTO Fundsache VALUES (68, 'Briefkastenschlüssel', 'Schlüssel', 'weiß', 'Festplatz', 'Weserufer', '2026-08-29', 40.0, 'M. Meinecke', NULL);
INSERT INTO Fundsache VALUES (69, 'Fahrradschloss', 'Fahrradzubehör', 'blau', 'Station Alte Werft', 'Hafenviertel', '2026-08-30', 50.0, 'M. Kahrs', NULL);
INSERT INTO Fundsache VALUES (70, 'Luftpumpe', 'Fahrradzubehör', 'gold', 'Station Stadion', 'Mühlenfeld', '2026-09-05', 50.0, 'K. Eggers', '2026-09-05');
INSERT INTO Fundsache VALUES (71, 'Schlüsselbund', 'Schlüssel', 'gold', 'Bus Linie 3', 'Bahnhofsviertel', '2026-09-12', NULL, NULL, NULL);
INSERT INTO Fundsache VALUES (72, 'Ladekabel', 'Elektronik', NULL, 'Festplatz', 'Weserufer', '2026-09-12', 61.0, 'L. Beckhusen', NULL);
INSERT INTO Fundsache VALUES (73, 'Sonnenbrille', 'Sonstiges', 'gelb', 'Station Bahnhof Nord', 'Bahnhofsviertel', '2026-09-13', 39.0, 'C. Tiemann', NULL);
INSERT INTO Fundsache VALUES (74, 'Mütze', 'Kleidung', 'rot', 'Station Hafenkante', 'Hafenviertel', '2026-09-14', 20.0, 'J. Ihnken', '2026-09-14');
INSERT INTO Fundsache VALUES (75, 'Fahrradhelm', 'Fahrradzubehör', 'weiß', 'Station Marktplatz', 'Altstadt', '2026-09-14', 30.0, 'E. Onken', NULL);
INSERT INTO Fundsache VALUES (76, 'Schal', 'Kleidung', 'silber', 'Station Rathaus', 'Altstadt', '2026-09-18', 36.0, 'B. Rohlfs', '2026-09-20');
INSERT INTO Fundsache VALUES (77, 'Smartphone', 'Elektronik', 'blau', 'Station Bahnhof Süd', 'Bahnhofsviertel', '2026-09-19', 79.0, 'A. Petrović', '2026-09-20');
INSERT INTO Fundsache VALUES (78, 'Monatskarte', 'Dokumente', 'braun', 'Bus Linie 1', 'Bahnhofsviertel', '2026-09-19', 12.0, 'D. Steenken', NULL);
INSERT INTO Fundsache VALUES (79, 'Schal', 'Kleidung', 'bunt', 'Festplatz', 'Weserufer', '2026-09-19', 28.0, 'U. Brakenhoff', '2026-09-20');
INSERT INTO Fundsache VALUES (80, 'Regenschirm', 'Sonstiges', 'schwarz', 'Station Heidepark', 'Nordheide', '2026-09-20', 8.0, NULL, NULL);

COMMIT;
