-- Randfall-Variante „null“ der Übungsdatenbank StadtRad (LIESMICH „Randfall-Varianten“, Spec 7.4).
-- Delta auf einer Kopie der Haupt-DB (basis.sql); Ausleihe ab 9001, Station/Rad/Kunde ab 901.
-- Entlarvt: „Anzahl abgeschlossener Fahrten von Kunde 9“ über einen Verbund mit der Zielstation (verliert 9001);
-- ZielStation = NULL (→ keine Zeile); „freie Räder je Station“ ohne Gedanken an NULL (Rad 901 fehlt im Verbund).

PRAGMA foreign_keys = ON;

-- Citybike nach GPS-Ausfall: frei, aber keiner Station zugeordnet
INSERT INTO Rad (RadID, Typ, Baujahr, StationID, Status) VALUES
  (901, 'Citybike', 2024, NULL, 'frei');

-- abgeschlossene Fahrt (Ende, Dauer, Preis gesetzt), Rad frei abgestellt: ZielStation NULL
-- Preis nach Werkstatt-Formel: Citybike 1,00 € + 0,08 €/min · 24 min = 2,92 €
INSERT INTO Ausleihe (AusleihID, RadID, KundenID, StartStation, ZielStation, Start, Ende, DauerMin, Preis) VALUES
  (9001, 2, 9, 4, NULL, '2026-09-16 09:12', '2026-09-16 09:36', 24, 2.92);
