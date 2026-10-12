-- Randfall-Variante „grenze“ der Übungsdatenbank StadtRad (LIESMICH „Randfall-Varianten“, Spec 7.4).
-- Delta auf einer Kopie der Haupt-DB (basis.sql); Ausleihe ab 9001, Station/Rad/Kunde ab 901.
-- Entlarvt: Start BETWEEN '2026-09-01' AND '2026-09-20' (Datum gegen Zeitpunkt: '2026-09-20 00:00' > '2026-09-20',
-- 9021 fehlt); DauerMin > 60 für „mindestens eine Stunde“ (9023 fehlt); Preis > 5 statt >= 5 (9024 fehlt);
-- „im September beendet“ über Start statt Ende (9022 beginnt am 31.08. und endet am 01.09.).
-- Preise nach Werkstatt-Formel, Ende = Start + DauerMin.

PRAGMA foreign_keys = ON;

INSERT INTO Ausleihe (AusleihID, RadID, KundenID, StartStation, ZielStation, Start, Ende, DauerMin, Preis) VALUES
  -- Start genau um Mitternacht (Citybike, 18 min)
  (9021, 11, 33,  7,  8, '2026-09-20 00:00', '2026-09-20 00:18', 18, 2.44),
  -- über den Monatswechsel (Citybike, 15 min)
  (9022, 30, 34, 11, 12, '2026-08-31 23:55', '2026-09-01 00:10', 15, 2.2),
  -- genau eine Stunde (E-Bike: 1,50 € + 0,12 €/min · 60 min = 8,70 €)
  (9023, 19, 35,  7,  9, '2026-09-06 14:10', '2026-09-06 15:10', 60, 8.7),
  -- Preis genau 5,00 € (Citybike: 1,00 € + 0,08 €/min · 50 min)
  (9024, 31, 36,  4,  5, '2026-09-11 16:20', '2026-09-11 17:10', 50, 5.0);
