-- Randfall-Variante „grenze“ der Übungsdatenbank Datenspuren (LIESMICH „Randfall-Varianten“, Spec 7.4).
-- Delta auf einer Kopie der Haupt-DB (basis.sql); Einwohner ab 9001, Tokens/Geräte mit Ziffernteil ab 9001.
-- Kartenzahlung am Kaffeemobil (StandNr 4) genau um 23:00 und eine Nachtfahrt ab Marktplatz in der dritten Tatnacht.
-- Entlarvt: Stufe 4b mit BETWEEN '2026-08-29 22:00' AND '2026-08-29 23:00' (1 statt 0);
-- Stufe 1 ohne Klammern um die OR-Gruppe (zusätzliche Zeile R-9022, siehe Fehlabfrage in der LIESMICH).

INSERT INTO FestZahlung (KartenToken, StandNr, Zeitpunkt, Betrag) VALUES
  ('K-9021', 4, '2026-08-29 23:00', 3.5);

INSERT INTO RadExport (KundenToken, Jahrgang, Stadtteil, Tarif, StartStation, Start) VALUES
  ('R-9022', 1979, 'Altstadt', 'Basis', 'Marktplatz', '2026-09-10 03:40');
