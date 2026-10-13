-- Randfall-Variante „gleichnamig“ der Übungsdatenbank StadtRad (LIESMICH „Randfall-Varianten“, Spec 7.4).
-- Delta auf einer Kopie der Haupt-DB (basis.sql); Ausleihe ab 9001, Station/Rad/Kunde ab 901.
-- Eine zweite Hanna Immig (wie Vielfahrerin 9, aber 1990, Basis, Bahnhofsviertel) mit 6 Fahrten:
-- GROUP BY Kunde.Vorname, Kunde.Nachname verschmilzt beide Kundinnen (P3).
-- Fahrten nach Werkstatt-Formel (Citybike 1,00 € + 0,08 €/min, E-Bike 1,50 € + 0,12 €/min), Ende = Start + DauerMin,
-- tagsüber, ohne Überschneidung mit anderen Fahrten desselben Rades.

PRAGMA foreign_keys = ON;

INSERT INTO Kunde (KundenID, Vorname, Nachname, Jahrgang, Tarif, Stadtteil) VALUES
  (901, 'Hanna', 'Immig', 1990, 'Basis', 'Bahnhofsviertel');

INSERT INTO Ausleihe (AusleihID, RadID, KundenID, StartStation, ZielStation, Start, Ende, DauerMin, Preis) VALUES
  (9011,  4, 901, 1,  3, '2026-08-24 07:42', '2026-08-24 07:56', 14, 2.12),
  (9012,  8, 901, 2,  7, '2026-08-31 17:05', '2026-08-31 17:26', 21, 4.02),
  (9013, 21, 901, 3,  1, '2026-09-04 12:18', '2026-09-04 12:27',  9, 1.72),
  (9014, 26, 901, 2,  8, '2026-09-09 08:03', '2026-09-09 08:20', 17, 2.36),
  (9015, 37, 901, 1, 12, '2026-09-15 18:44', '2026-09-15 19:12', 28, 4.86),
  (9016, 27, 901, 7,  2, '2026-09-18 10:31', '2026-09-18 10:43', 12, 1.96);
