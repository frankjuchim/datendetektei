-- =====================================================================
-- StadtRad · Pflicht-Datensätze (Story Akte 2 + Akte 6)
-- Reihenfolge beim Bau: schema.sql → uebernahme.sql → pflicht.sql → Generator
-- IDs sind fest; der Generator überspringt belegte IDs.
-- Story-Fakten: docs/STORY.md, Anhang A „StadtRad“.
-- =====================================================================

-- Neue Station (nicht in der SQL-Werkstatt): Tatort der Nachtfahrten
INSERT INTO Station VALUES (13, 'Hafenkante', 'Hafenviertel', 8);

-- Fünf neue Lastenräder, seit den Nachtfahrten verschwunden (stehen unbeschädigt in Schuppen 4)
INSERT INTO Rad VALUES (41, 'Lastenrad', 2026, NULL, 'vermisst');
INSERT INTO Rad VALUES (42, 'Lastenrad', 2026, NULL, 'vermisst');
INSERT INTO Rad VALUES (43, 'Lastenrad', 2026, NULL, 'vermisst');
INSERT INTO Rad VALUES (44, 'Lastenrad', 2026, NULL, 'vermisst');
INSERT INTO Rad VALUES (45, 'Lastenrad', 2026, NULL, 'vermisst');

-- Kundinnen und Kunden
INSERT INTO Kunde VALUES (52, 'Lena', 'Cordes', 1987, 'Basis', 'Altstadt');           -- gleichnamig mit KundenID 3
INSERT INTO Kunde VALUES (64, 'Tamara', 'Leversen', 1988, 'Basis', 'Hafenviertel');   -- unbeteiligt, gleiche Quasi-Identifikatoren (Akte 6)
INSERT INTO Kunde VALUES (77, 'Nora', 'Falter', 1988, 'Plus', 'Hafenviertel');        -- Tarnname des Phantoms

-- Die fünf Nachtfahrten des Phantoms: Lastenrad ab Hafenkante, nie zurückgegeben
-- (ZielStation, Ende, DauerMin, Preis = NULL)
INSERT INTO Ausleihe VALUES (303, 41, 77, 13, NULL, '2026-09-08 01:14', NULL, NULL, NULL);
INSERT INTO Ausleihe VALUES (304, 42, 77, 13, NULL, '2026-09-09 01:32', NULL, NULL, NULL);
INSERT INTO Ausleihe VALUES (305, 43, 77, 13, NULL, '2026-09-10 01:05', NULL, NULL, NULL);
INSERT INTO Ausleihe VALUES (306, 44, 77, 13, NULL, '2026-09-11 01:48', NULL, NULL, NULL);
INSERT INTO Ausleihe VALUES (307, 45, 77, 13, NULL, '2026-09-12 01:21', NULL, NULL, NULL);

-- Tagfahrten von Tamara Leversen (erscheinen auch im RadExport der DB Datenspuren);
-- Preis nach Werkstatt-Formel Citybike 1,00 € + 0,08 €/min
INSERT INTO Ausleihe VALUES (308, 31, 64, 5, 3, '2026-08-26 08:12', '2026-08-26 08:30', 18, 2.44);
INSERT INTO Ausleihe VALUES (309, 3, 64, 6, 13, '2026-09-03 17:40', '2026-09-03 17:52', 12, 1.96);
INSERT INTO Ausleihe VALUES (310, 27, 64, 13, 1, '2026-09-10 07:55', '2026-09-10 08:16', 21, 2.68);
