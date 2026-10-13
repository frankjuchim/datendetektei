-- =====================================================================
-- Video-Datenbank „Schachturnier“ · vollständige Daten (kuratiert, kein Generator): basis.sql = schema.sql + pflicht.sql.
-- Jugendschach in Weserstedt: drei Vereine, zehn Spielerinnen und Spieler (zwei vereinslos, zwei ohne Wertung),
-- zwei Turniere mit 18 Partien (eine noch nicht beendet). Alle Namen frei erfunden (seed/datenbanken/namen.json).
-- =====================================================================

INSERT INTO Verein (VereinNr, Name, Ort) VALUES
  (1, 'SK Weserspringer', 'Weserstedt'),
  (2, 'Turm Lindenhof', 'Weserstedt'),
  (3, 'SV Rochade Moorbach', 'Moorbach');

INSERT INTO Spieler (SpielerNr, Vorname, Nachname, Jahrgang, Wertung, VereinNr) VALUES
  (1, 'Imke', 'Bargmann', 2008, 1620, 1),
  (2, 'Mats', 'Okafor', 2009, 1480, 1),
  (3, 'Fenja', 'Harjes', 2007, 1755, 2),
  (4, 'Joris', 'Kampen', 2010, NULL, 2),
  (5, 'Smilla', 'Onken', 2008, 1390, 3),
  (6, 'Keno', 'Uphoff', 2009, NULL, NULL),
  (7, 'Tomke', 'Saathoff', 2007, 1830, 3),
  (8, 'Hauke', 'Demir', 2010, 1210, 1),
  (9, 'Levke', 'Wilms', 2009, 1545, NULL),
  (10, 'Arne', 'Bargmann', 2006, 1690, 2);

INSERT INTO Turnier (TurnierNr, Bezeichnung, Datum, Ort) VALUES
  (1, 'Frühjahrsblitz', '2026-03-14', 'Jugendzentrum Lindenhof'),
  (2, 'Weserbrücken-Pokal', '2026-05-09', 'Rathausfoyer');

INSERT INTO Partie (PartieNr, TurnierNr, Runde, WeissNr, SchwarzNr, Ergebnis) VALUES
  (1, 1, 1, 1, 2, '1-0'),
  (2, 1, 1, 3, 4, '1-0'),
  (3, 1, 1, 5, 7, '0-1'),
  (4, 1, 1, 8, 10, '0-1'),
  (5, 1, 2, 2, 3, '0-1'),
  (6, 1, 2, 4, 1, 'remis'),
  (7, 1, 2, 10, 7, 'remis'),
  (8, 1, 2, 5, 8, '1-0'),
  (9, 1, 3, 7, 3, '1-0'),
  (10, 1, 3, 1, 10, '0-1'),
  (11, 1, 3, 2, 5, 'remis'),
  (12, 1, 3, 4, 8, '1-0'),
  (13, 2, 1, 3, 6, '1-0'),
  (14, 2, 1, 9, 7, '0-1'),
  (15, 2, 1, 10, 1, 'remis'),
  (16, 2, 2, 6, 9, 'remis'),
  (17, 2, 2, 7, 10, '1-0'),
  (18, 2, 2, 1, 3, NULL);
