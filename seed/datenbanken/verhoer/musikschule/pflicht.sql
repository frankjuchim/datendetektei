-- =====================================================================
-- Verhör-Kontext V4 „Musikschule“ · vollständige Daten (kuratiert, kein Generator):
-- basis.sql = schema.sql + pflicht.sql. Jede Pflicht-Anomalie steht an einer benannten Zeile (Zeile = Reihenfolge
-- in der Liste = rowid); Übersicht „Welche Zeile zeigt welchen Randfall“ in LIESMICH.md – Änderungen nur zusammen.
-- Tarife: Kind 32,00 · Jugend 36,00 · Erwachsen 45,00 · Geschwister 28,00 (Zeile 17: Jugend mit 38,00).
-- Lehrkräfte: Jana Albers (Klavier, Gesang), Okke Tebbe (Klavier, Querflöte), Heiko Bargmann (Gitarre),
-- Linus Hedden (Schlagzeug), Marit Osterloh (Geige), Swantje Uphoff (Cello, nur Zeile 8).
-- =====================================================================

-- Rohliste (30 Zeilen; Reihenfolge = Reihenfolge in der Tabellenkalkulation)
INSERT INTO UnterrichtRoh VALUES ('Lotta Renken', 2013, 'Klavier', 'Jana Albers', '0000-41207', 'Klavierzimmer', 'Jugend', 36.00);
INSERT INTO UnterrichtRoh VALUES ('Finn Wilms', 2016, 'Gitarre', 'Heiko Bargmann', '0000-52318', 'Bandraum', 'Kind', 32.00);
INSERT INTO UnterrichtRoh VALUES ('Hanna Diekmann', 1987, 'Gesang', 'Jana Albers', '0000-41207', 'Klavierzimmer', 'Erwachsen', 45.00);
INSERT INTO UnterrichtRoh VALUES ('Mira Lindemann', 2011, 'Geige', 'Marit Osterloh', '0000-36054', 'Studio', 'Jugend', 36.00);
INSERT INTO UnterrichtRoh VALUES ('Jarne Pundt', 2009, 'Schlagzeug', 'Linus Hedden', '0000-63095', 'Bandraum', 'Jugend', 36.00);
INSERT INTO UnterrichtRoh VALUES ('Pia Kück', 2017, 'Querflöte', 'Okke Tebbe', '0000-27461', 'Konzertsaal', 'Geschwister', 28.00);
INSERT INTO UnterrichtRoh VALUES ('Emil Kück', 2015, 'Gitarre', 'Heiko Bargmann', '0000-52318', 'Bandraum', 'Geschwister', 28.00);
INSERT INTO UnterrichtRoh VALUES ('Taalke Haake', 2012, 'Cello', 'Swantje Uphoff', '0000-19736', 'Streicherzimmer', 'Jugend', 36.00);
INSERT INTO UnterrichtRoh VALUES ('Sönke Engelken', 1979, 'Klavier', 'Okke Tebbe', '0000-27461', 'Konzertsaal', 'Erwachsen', 45.00);
INSERT INTO UnterrichtRoh VALUES ('Ida Mammen', 2014, 'Klavier, Gesang', 'Jana Albers, Jana Albers', '0000-41207, 0000-41207', 'Klavierzimmer, Klavierzimmer', 'Jugend', 36.00);
INSERT INTO UnterrichtRoh VALUES ('Rune Ohlrogge', 2010, 'Gitarre', 'Heiko Bargmann', '0000-52318', 'Bandraum', 'Jugend', 36.00);
INSERT INTO UnterrichtRoh VALUES ('Greta Saathoff', 2018, 'Geige', 'Marit Osterloh', '0000-36054', 'Studio', 'Kind', 32.00);
INSERT INTO UnterrichtRoh VALUES ('Jarne Pundt', 2009, 'Gitarre', 'Heiko Bargmann', '0000-52318', 'Bandraum', 'Jugend', 36.00);
INSERT INTO UnterrichtRoh VALUES ('Lotta Renken', 2013, 'Klavier', 'Okke Tebbe', '0000-27461', 'Konzertsaal', 'Jugend', 36.00);
INSERT INTO UnterrichtRoh VALUES ('Nele Wöltjen', 2004, 'Gesang', 'Jana Albers', '0000-41207', 'Klavierzimmer', 'Erwachsen', 45.00);
INSERT INTO UnterrichtRoh VALUES ('Jasper Holtorf', 2011, 'Gitarre, Schlagzeug', 'Heiko Bargmann, Linus Hedden', '0000-52318, 0000-63095', 'Bandraum, Bandraum', 'Jugend', 36.00);
INSERT INTO UnterrichtRoh VALUES ('Levke Bohlken', 2010, 'Querflöte', 'Okke Tebbe', '0000-27461', 'Konzertsaal', 'Jugend', 38.00);
INSERT INTO UnterrichtRoh VALUES ('Bente Kolthoff', 1992, 'Klavier', 'Jana Albers', '0000-41207', 'Klavierzimmer', 'Erwachsen', 45.00);
INSERT INTO UnterrichtRoh VALUES ('Milan Gerdts', 2016, 'Schlagzeug', 'Linus Hedden', '0000-63095', 'Bandraum', 'Kind', 32.00);
INSERT INTO UnterrichtRoh VALUES ('Mira Lindemann', 2007, 'Querflöte', 'Okke Tebbe', '0000-27461', 'Konzertsaal', 'Erwachsen', 45.00);
INSERT INTO UnterrichtRoh VALUES ('Clara Zurborg', 2019, 'Klavier', 'Okke Tebbe', '0000-27461', 'Konzertsaal', 'Kind', 32.00);
INSERT INTO UnterrichtRoh VALUES ('Enno Thölken', 2012, 'Geige, Querflöte', 'Marit Osterloh, Okke Tebbe', '0000-36054, 0000-27461', 'Studio, Konzertsaal', 'Jugend', 36.00);
INSERT INTO UnterrichtRoh VALUES ('Frieda Habben', 2014, 'Gesang', 'Jana Albers', '0000-41207', 'Klavierzimmer', 'Jugend', 36.00);
INSERT INTO UnterrichtRoh VALUES ('Sönke Engelken', 1979, 'Gitarre', 'Heiko Bargmann', '0000-52318', 'Bandraum', 'Erwachsen', 45.00);
INSERT INTO UnterrichtRoh VALUES ('Yara Okafor', 2015, 'Geige', 'Marit Osterloh', '0000-36054', 'Studio', 'Kind', 32.00);
INSERT INTO UnterrichtRoh VALUES ('Joris Schwarting', 2013, 'Schlagzeug', 'Linus Hedden', '0000-63095', 'Bandraum', 'Jugend', 36.00);
INSERT INTO UnterrichtRoh VALUES ('Insa Rippen', 1998, 'Gitarre', 'Heiko Bargmann', '0000-52318', 'Bandraum', 'Erwachsen', 45.00);
INSERT INTO UnterrichtRoh VALUES ('Pia Kück', 2017, 'Klavier', 'Okke Tebbe', '0000-27461', 'Konzertsaal', 'Geschwister', 28.00);
INSERT INTO UnterrichtRoh VALUES ('Lasse Meinecke', 2010, 'Geige', 'Marit Osterloh', '0000-36054', 'Studio', 'Jugend', 36.00);
INSERT INTO UnterrichtRoh VALUES ('Greta Saathoff', 2018, 'Gitarre', 'Heiko Bargmann', '0000-52318', 'Bandraum', 'Kind', 32.00);

-- Zusammengelegte Tabelle: Heiko Bargmann und Linus Hedden teilen sich den Bandraum (Etage 'EG' doppelt)
INSERT INTO LehrkraftRaum VALUES (1, 'Jana Albers', '0000-41207', 'Klavierzimmer', '1. OG');
INSERT INTO LehrkraftRaum VALUES (2, 'Okke Tebbe', '0000-27461', 'Konzertsaal', 'EG');
INSERT INTO LehrkraftRaum VALUES (3, 'Heiko Bargmann', '0000-52318', 'Bandraum', 'EG');
INSERT INTO LehrkraftRaum VALUES (4, 'Linus Hedden', '0000-63095', 'Bandraum', 'EG');
INSERT INTO LehrkraftRaum VALUES (5, 'Marit Osterloh', '0000-36054', 'Studio', '2. OG');
INSERT INTO LehrkraftRaum VALUES (6, 'Swantje Uphoff', '0000-19736', 'Streicherzimmer', '1. OG');

-- Vergleichstabelle: 5 Räume auf 3 Etagen
INSERT INTO Raum VALUES ('Konzertsaal', 'EG');
INSERT INTO Raum VALUES ('Bandraum', 'EG');
INSERT INTO Raum VALUES ('Klavierzimmer', '1. OG');
INSERT INTO Raum VALUES ('Streicherzimmer', '1. OG');
INSERT INTO Raum VALUES ('Studio', '2. OG');
