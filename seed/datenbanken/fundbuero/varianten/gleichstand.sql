-- Randfall-Variante „gleichstand“ der Übungsdatenbank Fundbuero (LIESMICH „Randfall-Varianten“, Spec 7.4).
-- Delta auf einer Kopie der Haupt-DB (basis.sql); IDs im reservierten Bereich ab 9001.
-- Höchste Werte der Haupt-DB (alle Pflicht, erzeugte Werte ≤ 150): 450 (36), 390 (51), 320 (44), 180 (42).
-- Die Silberkette mit 320 € teilt Rang 3 mit FundNr 44: „alle Fundsachen mit einem der drei höchsten Werte“ sind
-- 4 Zeilen, ORDER BY Wert DESC LIMIT 3 liefert nur 3 (eine der beiden 320-€-Zeilen fällt zufällig weg).

PRAGMA foreign_keys = ON;

INSERT INTO Fundsache (FundNr, Bezeichnung, Kategorie, Farbe, Fundort, Stadtteil, Funddatum, Wert, Finder, AbgeholtAm) VALUES
  (9031, 'Silberkette', 'Schmuck', 'silber', 'Café am Lindenplatz', 'Lindenhof', '2026-08-06', 320, 'S. Haddad', NULL);
