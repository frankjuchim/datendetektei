-- =====================================================================
-- Detektei · Pflicht-Datensätze (Stammdaten + Story Akten 1–5)
-- Reihenfolge: schema.sql → pflicht.sql → Generator. IDs fest, Generator überspringt sie.
-- Story-Fakten: docs/STORY.md, Anhang A „Detektei“.
-- Merle Falkenrath kommt in dieser DB NICHT vor (sonst Spoiler vor Akte 6).
-- =====================================================================

-- Ermittlerteam (vollständig). Rekursive Beziehung betreut: MentorNr → ErmittlerNr.
-- Zwei Personen ohne Mentor: die Leitung (1) und ein freier Mitarbeiter (12) → NULL-Falle beim Self-Join.
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

-- Die vier Phantom-Fälle (Akten 1–4)
INSERT INTO Fall VALUES (1, 'Das Fundbüro', '2026-09-21', 'offen', 3);
INSERT INTO Fall VALUES (2, 'Spur der Räder', '2026-09-22', 'offen', 4);
INSERT INTO Fall VALUES (3, 'Die Stadtfest-Kasse', '2026-09-28', 'offen', 3);
INSERT INTO Fall VALUES (4, 'Chaos im Vereinsarchiv', '2026-10-05', 'offen', 1);

-- Orte
INSERT INTO Ort VALUES (1, 'Fundbüro', 'Altstadt');
INSERT INTO Ort VALUES (2, 'Hafenkante', 'Hafenviertel');
INSERT INTO Ort VALUES (3, 'Festplatz', 'Weserufer');
INSERT INTO Ort VALUES (4, 'Vereinsheim TuS', 'Mühlenfeld');
INSERT INTO Ort VALUES (5, 'Detektei', 'Altstadt');
INSERT INTO Ort VALUES (6, 'Rathaus', 'Altstadt');
INSERT INTO Ort VALUES (7, 'Halle am Mühlenfeld', 'Mühlenfeld');

-- Personen
INSERT INTO Person VALUES (5, 'Gesa', 'Ohlendiek', 1967, 'Altstadt');        -- Leiterin Fundbüro
INSERT INTO Person VALUES (8, 'Bent', 'Hollwedel', 1979, 'Lindenhof');       -- Betriebsleiter StadtRad
INSERT INTO Person VALUES (13, 'Nora', 'Falter', 1988, 'Hafenviertel');      -- Tarnname des Phantoms
INSERT INTO Person VALUES (17, 'Sönke', 'Ahlers', 1982, 'Deichkamp');        -- StadtRad-Werkstatt
INSERT INTO Person VALUES (21, 'Frauke', 'Melchers', 1958, 'Weserufer');     -- Kassenwartin Festausschuss
INSERT INTO Person VALUES (22, 'Selin', 'Aksoy', 1979, 'Lindenhof');         -- Betreiberin Kaffeemobil (Stadtfest-Helferin 7)
INSERT INTO Person VALUES (27, 'Wiebke', 'Lüttjohann', 1971, 'Mühlenfeld');  -- Kassenwartin TuS
INSERT INTO Person VALUES (30, 'Keno', 'Bargmann', 1983, 'Nordheide');       -- IT-Abteilung der Stadtverwaltung
INSERT INTO Person VALUES (34, 'Birte', 'Haschke', 1975, 'Mühlenfeld');      -- Trainerin Tischtennis (TuS)
INSERT INTO Person VALUES (41, 'Jarne', 'Kampen', 1971, 'Hafenviertel');     -- Nachtschicht im Hafen (Ablenkung Fall 2)
INSERT INTO Person VALUES (42, 'Lasse', 'Engelken', 1996, 'Weserufer');      -- Helfer am Bierwagen (Ablenkung Fall 1 + 3)
INSERT INTO Person VALUES (43, 'Henning', 'Abels', 1967, 'Mühlenfeld');      -- früherer Kassenwart TuS (Ablenkung Fall 4)

-- kennt (gerichtet: PersonNr gibt an, BekannterNr zu kennen). Nora Falter kennt Menschen an allen vier
-- Tatorten und in der Stadtverwaltung – alle Bekanntschaften „seit 2026“.
INSERT INTO kennt VALUES (13, 5, 2026);
INSERT INTO kennt VALUES (13, 8, 2026);
INSERT INTO kennt VALUES (13, 22, 2026);
INSERT INTO kennt VALUES (13, 27, 2026);
INSERT INTO kennt VALUES (13, 30, 2026);
INSERT INTO kennt VALUES (22, 13, 2026);
INSERT INTO kennt VALUES (34, 13, 2026);
INSERT INTO kennt VALUES (5, 30, 2014);
INSERT INTO kennt VALUES (30, 5, 2014);
INSERT INTO kennt VALUES (8, 17, 2019);
INSERT INTO kennt VALUES (17, 8, 2019);
INSERT INTO kennt VALUES (27, 34, 2008);
INSERT INTO kennt VALUES (27, 43, 1997);
INSERT INTO kennt VALUES (21, 22, 2021);
INSERT INTO kennt VALUES (21, 42, 2023);
INSERT INTO kennt VALUES (41, 17, 2016);

-- verdaechtig: Nora Falter ist die EINZIGE Person in allen vier Fällen; Lasse Engelken in zwei Fällen
INSERT INTO verdaechtig VALUES (13, 1, 'hoch');
INSERT INTO verdaechtig VALUES (13, 2, 'hoch');
INSERT INTO verdaechtig VALUES (13, 3, 'hoch');
INSERT INTO verdaechtig VALUES (13, 4, 'mittel');
INSERT INTO verdaechtig VALUES (42, 1, 'gering');
INSERT INTO verdaechtig VALUES (42, 3, 'gering');
INSERT INTO verdaechtig VALUES (41, 2, 'gering');
INSERT INTO verdaechtig VALUES (43, 4, 'gering');

-- Aussagen (ternär: Person × Fall × Ort; Gesa Ohlendiek sagt im Fall 1 im Fundbüro zweimal aus)
INSERT INTO Aussage VALUES (5, 1, 1, '2026-09-21 09:20', 'Der Messing-Kompass wurde am 18.06. an der Weserpromenade gefunden. Die Abholung am 14.09. habe ich nicht eingetragen, im Ausgabebuch fehlt die Unterschrift.');
INSERT INTO Aussage VALUES (5, 1, 1, '2026-09-23 10:05', 'Der Eintrag wurde über einen Verwaltungszugang geändert, nicht am Schalter.');
INSERT INTO Aussage VALUES (30, 1, 6, '2026-09-24 14:10', 'Zugänge ehemaliger Beschäftigter werden bei uns nicht automatisch gesperrt.');
INSERT INTO Aussage VALUES (8, 2, 2, '2026-09-22 14:00', 'Fünf Lastenräder wurden nachts über dasselbe Kundenkonto ausgeliehen und nie zurückgegeben.');
INSERT INTO Aussage VALUES (41, 2, 2, '2026-09-24 22:30', 'Ich arbeite nachts im Hafen. Wer die Lastenräder geholt hat, habe ich nicht gesehen.');
INSERT INTO Aussage VALUES (22, 3, 3, '2026-09-28 11:00', 'Von 22 bis 23 Uhr hat eine freundliche Helferin vom TuS kassiert. Am Wagen hing ein Schild: Kartenzahlung gestört.');
INSERT INTO Aussage VALUES (21, 3, 5, '2026-09-28 15:30', 'Bei der Warenzählung wurden mehr Getränke ausgegeben als verkauft, Wert der Differenz 312,50 Euro.');
INSERT INTO Aussage VALUES (27, 4, 4, '2026-10-05 18:30', 'In der Liste stand bei Nora Falter ein Monatsbeitrag von 0,00 Euro.');
INSERT INTO Aussage VALUES (34, 4, 7, '2026-10-06 19:15', 'Eine Nora Falter hat in der Tischtennis-Abteilung nie mittrainiert.');

-- Beweisstücke (je Akte eines; Nr. 5 ohne bekannten Fundort)
INSERT INTO Beweisstueck VALUES (1, 'Fundbuch-Seite', 1, 1);
INSERT INTO Beweisstueck VALUES (2, 'Schloss-Code', 2, 2);
INSERT INTO Beweisstueck VALUES (3, 'Kassenbon', 3, 3);
INSERT INTO Beweisstueck VALUES (4, 'Vereinsausweis', 4, 4);
INSERT INTO Beweisstueck VALUES (5, 'Nachtfalter-Skizze', 2, NULL);
