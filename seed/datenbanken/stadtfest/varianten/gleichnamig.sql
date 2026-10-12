-- Randfall-Variante „gleichnamig“ der Übungsdatenbank Stadtfest (LIESMICH „Randfall-Varianten“, Spec 7.4).
-- Delta auf einer Kopie der Haupt-DB (basis.sql); Bon/Produkt ab 9001, Helfer/Stand ab 901.
-- Umsatzstärkster Kassierer der Haupt-DB (basis.sql, Stand dieses Deltas): Helferin 51 Ida Rohlfs (1990,
-- Freiwillige Feuerwehr) mit 273,50 €. Helferin 903 heißt genauso (anderer Jahrgang, anderer Verein) und kassiert
-- an einer zweiten Kasse am Bierwagen (Stand 5). Entlarvt: Umsatz je Kassierer mit
-- GROUP BY Helfer.Vorname, Helfer.Nachname (beide Ida Rohlfs verschmelzen, P3).

PRAGMA foreign_keys = ON;

INSERT INTO Helfer (HelferNr, Vorname, Nachname, Jahrgang, Verein) VALUES
  (903, 'Ida', 'Rohlfs', 1968, 'Shantychor Weserstedt');

INSERT INTO Schicht (HelferNr, StandNr, Beginn, Ende) VALUES
  (903, 5, '2026-08-29 20:00', '2026-08-29 22:00');

INSERT INTO Bon (BonNr, StandNr, HelferNr, Zeitpunkt, Zahlart) VALUES
  (9011, 5, 903, '2026-08-29 20:18', 'bar'),
  (9012, 5, 903, '2026-08-29 20:52', 'Karte'),
  (9013, 5, 903, '2026-08-29 21:09', 'bar'),
  (9014, 5, 903, '2026-08-29 21:41', 'bar');

-- Bierwagen: 17 Pils 3,50 · 18 Radler 3,50 · 19 Alkoholfreies Bier 3,00 · 20 Wasser 2,00
INSERT INTO Position (BonNr, ProduktNr, Menge) VALUES
  (9011, 17, 2),
  (9012, 18, 1),
  (9012, 20, 2),
  (9013, 17, 3),
  (9014, 19, 1),
  (9014, 17, 1);
