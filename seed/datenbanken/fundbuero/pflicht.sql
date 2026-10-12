-- =====================================================================
-- Fundbuero · Pflicht-Datensätze (werden VOR dem Generator eingefügt,
-- FundNr sind fest; der Generator überspringt belegte Nummern)
-- Zeitraum des Fundbuchs: 2026-04-01 bis 2026-09-20 (Datenstand 2026-09-20)
-- Story-Fakten: docs/STORY.md, Anhang A „Fundbuero“.
-- =====================================================================

-- Story (Akte 1): der manipulierte Eintrag.
-- Gefunden am Do 2026-06-18 an der Weserpromenade; am Mo 2026-09-14 hat das Phantom mit seinem
-- alten Verwaltungszugang „abgeholt“ eingetragen (im Ausgabebuch fehlt die Unterschrift) und den
-- Finder durch 'N. Falter' (Nachtfalter-Signatur) ersetzt.
INSERT INTO Fundsache VALUES (36, 'Messing-Kompass', 'Wertsachen', 'gold', 'Weserpromenade',
                              'Weserufer', '2026-06-18', 450, 'N. Falter', '2026-09-14');

-- Drei-Abfragen-Kette (DS 2): weitere „Messing“-Fundsachen, teils außerhalb Juni/Juli
INSERT INTO Fundsache VALUES (19, 'Messingschlüssel', 'Schlüssel', 'gold', 'Rathaus, Eingang',
                              'Altstadt', '2026-05-15', NULL, 'H. Immig', NULL);
INSERT INTO Fundsache VALUES (46, 'Messing-Kerzenhalter', 'Sonstiges', 'gold', 'Café am Lindenplatz',
                              'Lindenhof', '2026-07-09', 35, 'S. Tebbe', '2026-07-14');
INSERT INTO Fundsache VALUES (61, 'Messingglocke', 'Fahrradzubehör', 'gold', 'Station Hafenkante',
                              'Hafenviertel', '2026-08-21', 12, NULL, NULL);

-- LIKE-Fallen rund um „Kompass“ (P6)
INSERT INTO Fundsache VALUES (9, 'Taschenkompass', 'Spielzeug', 'rot', 'Schulzentrum, Pausenhof',
                              'Nordheide', '2026-04-21', 3, 'L. Cordes', '2026-04-23');
INSERT INTO Fundsache VALUES (37, 'Kompass-Anhänger', 'Schmuck', 'silber', 'Marktplatz',
                              'Altstadt', '2026-06-19', 25, NULL, NULL);

-- Wertvolle Fundsachen im Juni/Juli unter 400 € (Kette: nur der Kompass hat Wert >= 400)
INSERT INTO Fundsache VALUES (42, 'Fernglas', 'Wertsachen', 'schwarz', 'Station Hafenkante',
                              'Hafenviertel', '2026-06-27', 180, 'K. Wilms', NULL);
INSERT INTO Fundsache VALUES (44, 'Goldarmband', 'Schmuck', 'gold', 'Freibad Mühlenfeld',
                              'Mühlenfeld', '2026-07-03', 320, 'R. Aden', '2026-07-06');
INSERT INTO Fundsache VALUES (51, 'Kamera', 'Wertsachen', 'schwarz', 'Festplatz',
                              'Weserufer', '2026-07-24', 390, 'J. Sanders', NULL);

-- Grenzdaten für BETWEEN (P6): erster/letzter Tag des Zeitraums Juni–Juli und der Septemberwoche
INSERT INTO Fundsache VALUES (31, 'Brillenetui', 'Sonstiges', NULL, 'Bus Linie 3',
                              'Bahnhofsviertel', '2026-06-01', 5, 'M. Ahrens', NULL);
INSERT INTO Fundsache VALUES (56, 'Regenjacke', 'Kleidung', 'blau', 'Station Bahnhof Nord',
                              'Bahnhofsviertel', '2026-07-31', 40, 'T. Habben', '2026-08-03');
INSERT INTO Fundsache VALUES (75, 'Fahrradhelm', 'Fahrradzubehör', 'weiß', 'Station Marktplatz',
                              'Altstadt', '2026-09-14', 30, 'E. Onken', NULL);
INSERT INTO Fundsache VALUES (80, 'Regenschirm', 'Sonstiges', 'schwarz', 'Station Heidepark',
                              'Nordheide', '2026-09-20', 8, NULL, NULL);

-- Uhren für die Indizienkette (DS_PLANUNG A1-E2-06/07): Wert fehlt bzw. unter 10 €
INSERT INTO Fundsache VALUES (27, 'Armbanduhr', 'Schmuck', 'silber', 'Fischmarkt',
                              'Hafenviertel', '2026-05-28', NULL, 'P. Rohlfs', NULL);
INSERT INTO Fundsache VALUES (49, 'Kinderuhr', 'Spielzeug', 'bunt', 'Spielplatz am Rathaus',
                              'Altstadt', '2026-07-18', 8, NULL, '2026-07-18');
