-- =====================================================================
-- Verhör-Kontext V5 „Kletterhalle“ · vollständige Daten (kuratiert, kein Generator):
-- basis.sql = schema.sql + pflicht.sql. Herbst 2026 (Begehungen 2026-09-05 … 2026-10-17).
-- Pflicht-Randfälle (LIESMICH): Wand 1:n Route (4/3/3/2 Routen), jede Route genau eine Wand; klettert n:m (jedes
-- Mitglied mehrere Routen, fast jede Route mehrere Mitglieder); Mitglied 1 / Route 3 an zwei Tagen (erst ohne, dann
-- mit Durchstieg).
-- =====================================================================

INSERT INTO Mitglied (MitgliedsNr, Name, Jahrgang) VALUES
  (1, 'Arne Steenken', 1994),
  (2, 'Smilla Dirksen', 2008),
  (3, 'Deniz Akgül', 1989),
  (4, 'Maren Tiemann', 2001),
  (5, 'Ilias Haddad', 2010),
  (6, 'Vivien Eggers', 1976),
  (7, 'Jannik Möhlmann', 2005),
  (8, 'Fenja Nordhoff', 2012);

INSERT INTO Wand (WandNr, Bereich) VALUES
  (1, 'Nordwand'),
  (2, 'Südwand'),
  (3, 'Überhang'),
  (4, 'Kinderbereich');

INSERT INTO Routenbauer (BauerNr, Name) VALUES
  (1, 'Tomke Bredehorn'),
  (2, 'Helge Schierholz'),
  (3, 'Kaja Wiechmann');

INSERT INTO Route (RoutenNr, Name, Schwierigkeit, WandNr, BauerNr) VALUES
  (1, 'Morgenrot', '5+', 1, 1),
  (2, 'Kante links', '6-', 1, 2),
  (3, 'Gletscherspalte', '7', 1, 1),
  (4, 'Nordlicht', '6+', 1, 3),
  (5, 'Sonnendeck', '4', 2, 2),
  (6, 'Sandsturm', '5', 2, 3),
  (7, 'Mittagspause', '6', 2, 1),
  (8, 'Dachrinne', '7+', 3, 2),
  (9, 'Schwerkraft', '8-', 3, 2),
  (10, 'Fledermaus', '6+', 3, 3),
  (11, 'Raupe', '3', 4, 1),
  (12, 'Marienkäfer', '3+', 4, 3);

INSERT INTO klettert (MitgliedsNr, RoutenNr, Datum, Erfolg) VALUES
  (1, 1, '2026-09-05', 'ja'),
  (1, 3, '2026-09-05', 'nein'),
  (1, 3, '2026-09-12', 'ja'),
  (1, 8, '2026-09-19', 'nein'),
  (1, 9, '2026-10-03', 'nein'),
  (2, 1, '2026-10-11', 'ja'),
  (2, 2, '2026-09-06', 'ja'),
  (2, 4, '2026-09-06', 'ja'),
  (2, 7, '2026-09-13', 'ja'),
  (3, 1, '2026-09-05', 'ja'),
  (3, 5, '2026-09-12', 'ja'),
  (3, 8, '2026-09-26', 'ja'),
  (3, 9, '2026-10-10', 'nein'),
  (4, 2, '2026-09-13', 'nein'),
  (4, 6, '2026-09-20', 'ja'),
  (4, 10, '2026-10-04', 'ja'),
  (5, 5, '2026-09-27', 'ja'),
  (5, 11, '2026-09-20', 'ja'),
  (6, 4, '2026-10-03', 'nein'),
  (6, 7, '2026-09-19', 'ja'),
  (7, 3, '2026-09-26', 'ja'),
  (7, 6, '2026-10-17', 'ja'),
  (7, 10, '2026-10-10', 'ja'),
  (8, 11, '2026-09-27', 'ja'),
  (8, 12, '2026-10-04', 'ja');
