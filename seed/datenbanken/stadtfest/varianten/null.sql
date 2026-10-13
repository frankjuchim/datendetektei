-- Randfall-Variante „null“ der Übungsdatenbank Stadtfest (LIESMICH „Randfall-Varianten“, Spec 7.4).
-- Delta auf einer Kopie der Haupt-DB (basis.sql); Bon/Produkt ab 9001, Helfer/Stand ab 901.
-- Zwei Helfer ohne Verein (NULL) mit eigener Kassenschicht und Bons an der Saftbar (Stand 3, zweite Kasse).
-- Entlarvt: „Bons von Helfern, die nicht im TuS sind“ mit Verein != 'TuS Weserstedt' (verliert ihre Bons);
-- COUNT(Verein) statt COUNT(*).

PRAGMA foreign_keys = ON;

INSERT INTO Helfer (HelferNr, Vorname, Nachname, Jahrgang, Verein) VALUES
  (901, 'Okke', 'Diekmann', 1972, NULL),
  (902, 'Insa', 'Tebbe', 1995, NULL);

INSERT INTO Schicht (HelferNr, StandNr, Beginn, Ende) VALUES
  (901, 3, '2026-08-28 20:00', '2026-08-28 22:00'),
  (902, 3, '2026-08-29 16:00', '2026-08-29 18:00');

INSERT INTO Bon (BonNr, StandNr, HelferNr, Zeitpunkt, Zahlart) VALUES
  (9001, 3, 901, '2026-08-28 20:14', 'bar'),
  (9002, 3, 901, '2026-08-28 20:47', 'Karte'),
  (9003, 3, 901, '2026-08-28 21:32', 'bar'),
  (9004, 3, 902, '2026-08-29 16:21', 'bar'),
  (9005, 3, 902, '2026-08-29 17:08', 'Karte');

-- Saftbar: 8 Apfelschorle 2,50 · 9 Orangensaft 3,00 · 10 Smoothie 4,50 (26 Kinderpunsch bleibt unverkauft)
INSERT INTO Position (BonNr, ProduktNr, Menge) VALUES
  (9001, 8, 2),
  (9002, 9, 1),
  (9002, 10, 1),
  (9003, 8, 1),
  (9004, 10, 2),
  (9005, 9, 3);
