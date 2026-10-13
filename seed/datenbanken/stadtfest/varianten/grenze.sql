-- Randfall-Variante „grenze“ der Übungsdatenbank Stadtfest (LIESMICH „Randfall-Varianten“, Spec 7.4).
-- Delta auf einer Kopie der Haupt-DB (basis.sql); Bon/Produkt ab 9001, Helfer/Stand ab 901.
-- Bons genau auf einer vollen Stunde (in der Haupt-DB gibt es keine). Schichten gelten als [Beginn, Ende).
-- Entlarvt: Fehlbetrag-Abfrage mit BETWEEN '2026-08-29 22:00' AND '2026-08-29 23:00' – Bon 9021 um 23:00 gehört
-- schon zu Selin Aksoys Schicht 23–24 und bringt einen weiteren Kaffee mit Menge 0 hinein (315,00 € statt 312,50 €).

PRAGMA foreign_keys = ON;

INSERT INTO Bon (BonNr, StandNr, HelferNr, Zeitpunkt, Zahlart) VALUES
  -- Kaffeemobil, Kassiererin 7 (Schicht 2026-08-29 23:00–24:00)
  (9021, 4, 7, '2026-08-29 23:00', 'bar'),
  -- Bierwagen, Kassierer 1 (Schicht 2026-08-28 18:00–20:00; die Schicht davor endet um 18:00)
  (9022, 5, 1, '2026-08-28 18:00', 'bar');

INSERT INTO Position (BonNr, ProduktNr, Menge) VALUES
  (9021, 11, 0),   -- Kaffee, Menge 0
  (9022, 17, 2);   -- Pils 0,3 l
