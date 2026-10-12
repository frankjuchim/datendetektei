-- Randfall-Variante „gleichstand“ der Übungsdatenbank Stadtfest (LIESMICH „Randfall-Varianten“, Spec 7.4).
-- Delta auf einer Kopie der Haupt-DB (basis.sql); Bon/Produkt ab 9001, Helfer/Stand ab 901.
-- Umsatz je Stand in der Haupt-DB (basis.sql, Stand dieses Deltas): Grillhütte 1080,00 € · Kaffeemobil 1041,00 € ·
-- Bierwagen 876,00 € · Fischbrötchen-Kutter 632,50 € · …
-- 15 zusätzliche Bons am Bierwagen zu je 11,00 € (zusammen 165,00 €) heben ihn auf 1041,00 €: Rang 2 und 3 liegen
-- gleichauf, Rang 1 bleibt allein. „Die umsatzstärksten Stände (bei Gleichstand alle)“ für zwei Plätze sind 3 Stände;
-- LIMIT 2 liefert 2. Ändert sich basis.sql, muss der Betrag neu bestimmt werden (Test db_varianten prüft ihn).
-- Jeder Bon liegt in der Kassenschicht seines Kassierers am Bierwagen, nie auf einer vollen Stunde.

PRAGMA foreign_keys = ON;

INSERT INTO Bon (BonNr, StandNr, HelferNr, Zeitpunkt, Zahlart) VALUES
  (9031, 5, 14, '2026-08-28 16:37', 'bar'),
  (9032, 5, 14, '2026-08-28 17:22', 'Karte'),
  (9033, 5,  1, '2026-08-28 18:26', 'bar'),
  (9034, 5,  1, '2026-08-28 19:13', 'bar'),
  (9035, 5, 37, '2026-08-28 20:48', 'Karte'),
  (9036, 5, 37, '2026-08-28 21:27', 'bar'),
  (9037, 5, 60, '2026-08-28 22:52', 'bar'),
  (9038, 5, 60, '2026-08-28 23:31', 'Karte'),
  (9039, 5, 60, '2026-08-29 14:38', 'bar'),
  (9040, 5, 40, '2026-08-29 16:57', 'Karte'),
  (9041, 5, 40, '2026-08-29 17:24', 'bar'),
  (9042, 5, 33, '2026-08-29 18:43', 'bar'),
  (9043, 5, 33, '2026-08-29 19:36', 'Karte'),
  (9044, 5, 57, '2026-08-29 21:14', 'bar'),
  (9045, 5,  1, '2026-08-29 22:47', 'bar');

-- Bierwagen: 17 Pils 3,50 · 18 Radler 3,50 · 19 Alkoholfreies Bier 3,00 · 20 Wasser 2,00; jeder Bon 11,00 €
INSERT INTO Position (BonNr, ProduktNr, Menge) VALUES
  (9031, 17, 2), (9031, 20, 2),
  (9032, 18, 2), (9032, 20, 2),
  (9033, 19, 3), (9033, 20, 1),
  (9034, 17, 1), (9034, 18, 1), (9034, 20, 2),
  (9035, 17, 2), (9035, 20, 2),
  (9036, 18, 2), (9036, 20, 2),
  (9037, 17, 2), (9037, 20, 2),
  (9038, 19, 3), (9038, 20, 1),
  (9039, 18, 2), (9039, 20, 2),
  (9040, 17, 1), (9040, 18, 1), (9040, 20, 2),
  (9041, 17, 2), (9041, 20, 2),
  (9042, 18, 2), (9042, 20, 2),
  (9043, 17, 2), (9043, 20, 2),
  (9044, 19, 3), (9044, 20, 1),
  (9045, 17, 1), (9045, 18, 1), (9045, 20, 2);
