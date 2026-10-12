-- Randfall-Variante „gleichstand“ der Übungsdatenbank StadtRad (LIESMICH „Randfall-Varianten“, Spec 7.4).
-- Delta auf einer Kopie der Haupt-DB (basis.sql); Ausleihe ab 9001, Station/Rad/Kunde ab 901.
-- Starts je Station in der Haupt-DB (basis.sql, Stand dieses Deltas): Universität (7) 68, Bahnhof Nord (1) 56,
-- Schulzentrum (12) 50, Mensa (8) 44, Marktplatz (3) 40, …
-- Sechs zusätzliche Fahrten ab der viertstärksten Startstation Mensa (8) bringen sie auf 50: Rang 3 und 4 liegen
-- gleichauf. „Die drei Stationen mit den meisten Starts (bei Gleichstand alle)“ sind 4 Stationen; LIMIT 3 liefert 3.
-- Ändert sich basis.sql, muss die Anzahl neu bestimmt werden (Test db_varianten prüft den Gleichstand).
-- Preise nach Werkstatt-Formel, Ende = Start + DauerMin, tagsüber, Kunden aus 26–80.

PRAGMA foreign_keys = ON;

INSERT INTO Ausleihe (AusleihID, RadID, KundenID, StartStation, ZielStation, Start, Ende, DauerMin, Preis) VALUES
  (9031, 22, 41, 8,  7, '2026-08-22 08:14', '2026-08-22 08:21',  7, 1.56),
  (9032, 24, 47, 8,  3, '2026-08-26 13:37', '2026-08-26 13:53', 16, 3.42),
  (9033, 22, 55, 8,  1, '2026-09-01 07:48', '2026-09-01 08:07', 19, 2.52),
  (9034, 11, 62, 8,  7, '2026-09-07 16:26', '2026-09-07 16:32',  6, 1.48),
  (9035, 24, 70, 8, 12, '2026-09-13 11:05', '2026-09-13 11:29', 24, 4.38),
  (9036,  3, 73, 8,  4, '2026-09-18 09:52', '2026-09-18 10:05', 13, 2.04);
