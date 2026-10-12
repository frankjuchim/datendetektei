-- =====================================================================
-- Datenspuren · Pflicht-Datensätze (Story Akte 6 „Schlussplädoyer“)
-- Reihenfolge: schema.sql → pflicht.sql → Generator. Feste Werte; Generator überspringt sie.
-- Story-Fakten: docs/STORY.md, Abschnitt 7 und Anhang A „Datenspuren“.
-- Reserviert: Jahrgang 1988 + Stadtteil Hafenviertel kommt im Einwohnerverzeichnis GENAU dreimal vor
-- (Merle Falkenrath, Tamara Leversen, Ole Brakhage). „Nora Falter“ steht NICHT im Einwohnerverzeichnis.
-- Reserviert: die Adresse 'Kranstraße 7' (nur Merle Falkenrath und ihr Nachbar Rune Siemers).
-- =====================================================================

-- Einwohner: die drei Kandidaten (Jahrgang 1988, Hafenviertel) …
INSERT INTO Einwohner VALUES (1042, 'Merle', 'Falkenrath', 1988, 'Hafenviertel', 'Kranstraße 7');
INSERT INTO Einwohner VALUES (1107, 'Tamara', 'Leversen', 1988, 'Hafenviertel', 'Speicherstraße 14');
INSERT INTO Einwohner VALUES (1163, 'Ole', 'Brakhage', 1988, 'Hafenviertel', 'Lotsengang 2');
-- … ein Nachbar im selben Speicherhaus (ohne Jahrgangsfilter liefert die Adresse zwei Personen) …
INSERT INTO Einwohner VALUES (1218, 'Rune', 'Siemers', 1961, 'Hafenviertel', 'Kranstraße 7');
-- … und weitere „Merle“: der Vorname allein oder Vorname + Jahrgang reichen nicht
INSERT INTO Einwohner VALUES (1190, 'Merle', 'Tönjes', 2004, 'Nordheide', 'Heideweg 21');
INSERT INTO Einwohner VALUES (1231, 'Merle', 'Hinsch', 1988, 'Mühlenfeld', 'Mühlenweg 30');

-- RadExport: die Nachtfahrten (Token von KundenID 77 „Nora Falter“) – identische Startzeitpunkte wie in StadtRad
INSERT INTO RadExport VALUES ('R-7F3A', 1988, 'Hafenviertel', 'Plus', 'Hafenkante', '2026-09-08 01:14');
INSERT INTO RadExport VALUES ('R-7F3A', 1988, 'Hafenviertel', 'Plus', 'Hafenkante', '2026-09-09 01:32');
INSERT INTO RadExport VALUES ('R-7F3A', 1988, 'Hafenviertel', 'Plus', 'Hafenkante', '2026-09-10 01:05');
INSERT INTO RadExport VALUES ('R-7F3A', 1988, 'Hafenviertel', 'Plus', 'Hafenkante', '2026-09-11 01:48');
INSERT INTO RadExport VALUES ('R-7F3A', 1988, 'Hafenviertel', 'Plus', 'Hafenkante', '2026-09-12 01:21');
-- RadExport: Tagfahrten von Tamara Leversen (KundenID 64) – gleicher Jahrgang und Stadtteil, aber Tarif Basis
INSERT INTO RadExport VALUES ('R-21C4', 1988, 'Hafenviertel', 'Basis', 'Alte Werft', '2026-08-26 08:12');
INSERT INTO RadExport VALUES ('R-21C4', 1988, 'Hafenviertel', 'Basis', 'Fischmarkt', '2026-09-03 17:40');
INSERT INTO RadExport VALUES ('R-21C4', 1988, 'Hafenviertel', 'Basis', 'Hafenkante', '2026-09-10 07:55');

-- AppCheckin: Gerät WA-3917 (Merle Falkenrath) ist bei allen fünf Nachtfahrten an der Hafenkante …
INSERT INTO AppCheckin VALUES ('WA-3917', 'Hafenkante', '2026-09-08 01:14');
INSERT INTO AppCheckin VALUES ('WA-3917', 'Hafenkante', '2026-09-09 01:32');
INSERT INTO AppCheckin VALUES ('WA-3917', 'Hafenkante', '2026-09-10 01:05');
INSERT INTO AppCheckin VALUES ('WA-3917', 'Hafenkante', '2026-09-11 01:48');
INSERT INTO AppCheckin VALUES ('WA-3917', 'Hafenkante', '2026-09-12 01:21');
-- … an den anderen Tatorten zur Tatzeit …
INSERT INTO AppCheckin VALUES ('WA-3917', 'Vereinsheim TuS', '2026-08-25 19:02');
INSERT INTO AppCheckin VALUES ('WA-3917', 'Festplatz', '2026-08-29 21:52');
INSERT INTO AppCheckin VALUES ('WA-3917', 'Festplatz', '2026-08-29 23:06');
INSERT INTO AppCheckin VALUES ('WA-3917', 'Vereinsheim TuS', '2026-09-01 18:58');
INSERT INTO AppCheckin VALUES ('WA-3917', 'Fundbüro', '2026-09-14 10:17');
INSERT INTO AppCheckin VALUES ('WA-3917', 'Vereinsheim TuS', '2026-09-15 19:05');
-- … und nachts (kein markierter Ort in der Nähe → Adresse): Standortdaten verraten die Wohnung
INSERT INTO AppCheckin VALUES ('WA-3917', 'Kranstraße 7', '2026-08-24 05:40');
INSERT INTO AppCheckin VALUES ('WA-3917', 'Kranstraße 7', '2026-09-02 04:15');
INSERT INTO AppCheckin VALUES ('WA-3917', 'Kranstraße 7', '2026-09-08 02:41');
INSERT INTO AppCheckin VALUES ('WA-3917', 'Kranstraße 7', '2026-09-09 03:05');
INSERT INTO AppCheckin VALUES ('WA-3917', 'Kranstraße 7', '2026-09-10 02:38');
INSERT INTO AppCheckin VALUES ('WA-3917', 'Kranstraße 7', '2026-09-11 03:22');
INSERT INTO AppCheckin VALUES ('WA-3917', 'Kranstraße 7', '2026-09-12 02:57');
INSERT INTO AppCheckin VALUES ('WA-3917', 'Kranstraße 7', '2026-09-16 05:52');
-- Ablenkungen: WA-5530 (Nachtschicht im Hafen) an 2 der 5 Zeitpunkte und in einer weiteren Nacht
INSERT INTO AppCheckin VALUES ('WA-5530', 'Hafenkante', '2026-09-09 01:32');
INSERT INTO AppCheckin VALUES ('WA-5530', 'Hafenkante', '2026-09-11 01:48');
INSERT INTO AppCheckin VALUES ('WA-5530', 'Hafenkante', '2026-09-15 01:10');
-- WA-1288 (Tamara Leversen): ihre Fahrten, ihre Wohnadresse, das Stadtfest
INSERT INTO AppCheckin VALUES ('WA-1288', 'Alte Werft', '2026-08-26 08:12');
INSERT INTO AppCheckin VALUES ('WA-1288', 'Festplatz', '2026-08-29 22:15');
INSERT INTO AppCheckin VALUES ('WA-1288', 'Fischmarkt', '2026-09-03 17:40');
INSERT INTO AppCheckin VALUES ('WA-1288', 'Speicherstraße 14', '2026-09-05 03:10');
INSERT INTO AppCheckin VALUES ('WA-1288', 'Hafenkante', '2026-09-10 07:55');
INSERT INTO AppCheckin VALUES ('WA-1288', 'Speicherstraße 14', '2026-09-13 04:30');
-- WA-6120 (Rune Siemers, Nachbar): dieselbe Adresse, andere Zeiten
INSERT INTO AppCheckin VALUES ('WA-6120', 'Festplatz', '2026-08-28 19:30');
INSERT INTO AppCheckin VALUES ('WA-6120', 'Kranstraße 7', '2026-09-06 22:40');
INSERT INTO AppCheckin VALUES ('WA-6120', 'Kranstraße 7', '2026-09-13 23:15');
-- weitere Geräte an denselben Orten zu anderen Zeiten
INSERT INTO AppCheckin VALUES ('WA-2046', 'Festplatz', '2026-08-29 22:30');
INSERT INTO AppCheckin VALUES ('WA-2046', 'Vereinsheim TuS', '2026-09-01 19:20');
INSERT INTO AppCheckin VALUES ('WA-4410', 'Fundbüro', '2026-09-14 15:40');

-- FestZahlung: Kartenzahlungen am Kaffeemobil am Samstagabend (aus den Pflicht-Bons der DB Stadtfest).
-- Zwischen 22:00 und 22:59 gibt es KEINE Kartenzahlung („Kartenzahlung gestört“).
INSERT INTO FestZahlung VALUES ('K-4A91', 4, '2026-08-29 21:03', 5.00);   -- Bon 439
INSERT INTO FestZahlung VALUES ('K-0C37', 4, '2026-08-29 21:12', 7.00);   -- Bon 441
INSERT INTO FestZahlung VALUES ('K-7E52', 4, '2026-08-29 21:26', 6.00);   -- Bon 444
INSERT INTO FestZahlung VALUES ('K-2B18', 4, '2026-08-29 21:40', 6.50);   -- Bon 447
INSERT INTO FestZahlung VALUES ('K-9D64', 4, '2026-08-29 21:55', 6.50);   -- Bon 450
INSERT INTO FestZahlung VALUES ('K-5F03', 4, '2026-08-29 23:02', 2.50);   -- Bon 503
INSERT INTO FestZahlung VALUES ('K-3A7C', 4, '2026-08-29 23:19', 5.00);   -- Bon 506
INSERT INTO FestZahlung VALUES ('K-8B25', 4, '2026-08-29 23:31', 3.50);   -- Bon 508
INSERT INTO FestZahlung VALUES ('K-6C49', 4, '2026-08-29 23:50', 2.00);   -- Bon 511

-- VereinExport: vollständig aus der DB TuS abgeleitet (normalisierte Fassung, ohne passive Mitglieder).
-- Genau ein Token mit 1988 / Hafenviertel / Tischtennis (Merle Falkenrath); „Nora Falter“ ohne Angaben.
INSERT INTO VereinExport VALUES ('V-5013', 2011, 'Fußball', 'Mühlenfeld');
INSERT INTO VereinExport VALUES ('V-8792', 1979, 'Tennis', 'Altstadt');
INSERT INTO VereinExport VALUES ('V-2571', 1988, 'Tischtennis', 'Hafenviertel');   -- Merle Falkenrath
INSERT INTO VereinExport VALUES ('V-6350', 1990, 'Fußball', 'Mühlenfeld');
INSERT INTO VereinExport VALUES ('V-6350', 1990, 'Handball', 'Mühlenfeld');
INSERT INTO VereinExport VALUES ('V-0129', 1985, 'Tennis', 'Lindenhof');
INSERT INTO VereinExport VALUES ('V-0129', 1985, 'Turnen', 'Lindenhof');
INSERT INTO VereinExport VALUES ('V-3908', 2014, 'Turnen', 'Nordheide');
INSERT INTO VereinExport VALUES ('V-7687', 1958, 'Tischtennis', 'Altstadt');
INSERT INTO VereinExport VALUES ('V-1466', 2012, 'Fußball', 'Bahnhofsviertel');
INSERT INTO VereinExport VALUES ('V-5245', 1976, 'Tennis', 'Altstadt');
INSERT INTO VereinExport VALUES ('V-9024', 2013, 'Turnen', 'Nordheide');
INSERT INTO VereinExport VALUES ('V-2803', 2010, 'Judo', 'Mühlenfeld');
INSERT INTO VereinExport VALUES ('V-6582', 1969, 'Turnen', 'Lindenhof');
INSERT INTO VereinExport VALUES ('V-0361', 2009, 'Handball', 'Mühlenfeld');
INSERT INTO VereinExport VALUES ('V-0361', 2009, 'Fußball', 'Mühlenfeld');
INSERT INTO VereinExport VALUES ('V-4140', 1995, 'Handball', 'Bahnhofsviertel');
INSERT INTO VereinExport VALUES ('V-7919', 1981, 'Tischtennis', 'Hafenviertel');
INSERT INTO VereinExport VALUES ('V-7919', 1981, 'Tennis', 'Hafenviertel');
INSERT INTO VereinExport VALUES ('V-5477', 2015, 'Fußball', 'Nordheide');
INSERT INTO VereinExport VALUES ('V-9256', 1999, 'Tischtennis', 'Lindenhof');
INSERT INTO VereinExport VALUES ('V-3035', 1972, 'Fußball', 'Mühlenfeld');
INSERT INTO VereinExport VALUES ('V-6814', 2012, 'Handball', 'Nordheide');
INSERT INTO VereinExport VALUES ('V-6814', 2012, 'Turnen', 'Nordheide');
INSERT INTO VereinExport VALUES ('V-0593', 1987, 'Tennis', 'Hafenviertel');
INSERT INTO VereinExport VALUES ('V-4372', 2001, 'Tischtennis', 'Lindenhof');
INSERT INTO VereinExport VALUES ('V-8151', 1993, 'Fußball', 'Bahnhofsviertel');
INSERT INTO VereinExport VALUES ('V-1930', 2016, 'Turnen', 'Mühlenfeld');
INSERT INTO VereinExport VALUES ('V-5709', 2008, 'Handball', 'Hafenviertel');
INSERT INTO VereinExport VALUES ('V-9488', 1961, 'Turnen', 'Altstadt');
INSERT INTO VereinExport VALUES ('V-9488', 1961, 'Tischtennis', 'Altstadt');
INSERT INTO VereinExport VALUES ('V-3267', 2011, 'Tischtennis', 'Nordheide');
INSERT INTO VereinExport VALUES ('V-7046', 1983, 'Tennis', 'Altstadt');
INSERT INTO VereinExport VALUES ('V-4604', 2010, 'Fußball', 'Mühlenfeld');
INSERT INTO VereinExport VALUES ('V-4604', 2010, 'Tennis', 'Mühlenfeld');
INSERT INTO VereinExport VALUES ('V-8383', 1967, 'Handball', 'Mühlenfeld');
INSERT INTO VereinExport VALUES ('V-2162', 1998, 'Tischtennis', 'Lindenhof');
INSERT INTO VereinExport VALUES ('V-5941', 2013, 'Fußball', 'Nordheide');
INSERT INTO VereinExport VALUES ('V-9720', 1991, 'Turnen', 'Bahnhofsviertel');
INSERT INTO VereinExport VALUES ('V-3499', 2014, 'Handball', 'Altstadt');
INSERT INTO VereinExport VALUES ('V-7278', 1974, 'Tennis', 'Lindenhof');
INSERT INTO VereinExport VALUES ('V-7278', 1974, 'Turnen', 'Lindenhof');
INSERT INTO VereinExport VALUES ('V-1057', 1996, 'Fußball', 'Hafenviertel');
INSERT INTO VereinExport VALUES ('V-4836', 2009, 'Tischtennis', 'Mühlenfeld');
INSERT INTO VereinExport VALUES ('V-4836', 2009, 'Handball', 'Mühlenfeld');
INSERT INTO VereinExport VALUES ('V-8615', 1986, 'Tischtennis', 'Hafenviertel');
INSERT INTO VereinExport VALUES ('V-2394', 2012, 'Fußball', 'Bahnhofsviertel');
INSERT INTO VereinExport VALUES ('V-6173', 1955, 'Turnen', 'Altstadt');
INSERT INTO VereinExport VALUES ('V-9952', NULL, 'Tischtennis', NULL);   -- „Nora Falter“ (Tarnname, ohne Angaben)
INSERT INTO VereinExport VALUES ('V-3731', 2005, 'Handball', 'Lindenhof');
INSERT INTO VereinExport VALUES ('V-7510', 1980, 'Tennis', 'Nordheide');
INSERT INTO VereinExport VALUES ('V-1289', 1989, 'Tischtennis', 'Altstadt');
INSERT INTO VereinExport VALUES ('V-1289', 1989, 'Turnen', 'Altstadt');
INSERT INTO VereinExport VALUES ('V-5068', 2011, 'Fußball', 'Mühlenfeld');
INSERT INTO VereinExport VALUES ('V-5068', 2011, 'Tischtennis', 'Mühlenfeld');
INSERT INTO VereinExport VALUES ('V-5068', 2011, 'Handball', 'Mühlenfeld');
INSERT INTO VereinExport VALUES ('V-8847', 2015, 'Turnen', 'Bahnhofsviertel');
INSERT INTO VereinExport VALUES ('V-2626', 1984, 'Fußball', 'Lindenhof');
INSERT INTO VereinExport VALUES ('V-2626', 1984, 'Tennis', 'Lindenhof');
INSERT INTO VereinExport VALUES ('V-6405', 1992, 'Handball', 'Nordheide');
INSERT INTO VereinExport VALUES ('V-6405', 1992, 'Turnen', 'Nordheide');
INSERT INTO VereinExport VALUES ('V-0184', 1970, 'Tischtennis', 'Altstadt');
INSERT INTO VereinExport VALUES ('V-4417', 1988, 'Fußball', 'Hafenviertel');   -- Ole Brakhage
