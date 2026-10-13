-- Randfall-Variante „gleichstand“ der Übungsdatenbank Datenspuren (LIESMICH „Randfall-Varianten“, Spec 7.4).
-- Delta auf einer Kopie der Haupt-DB (basis.sql); Einwohner ab 9001, Tokens/Geräte mit Ziffernteil ab 9001.
-- Größte (Jahrgang, Stadtteil)-Gruppe der Haupt-DB (basis.sql, Stand dieses Deltas): 1991/Bahnhofsviertel mit
-- 4 Einwohnern, allein auf Rang 1; danach mehrere Gruppen mit 3 (darunter das reservierte 1988/Hafenviertel, das
-- unverändert bleibt). Ein zusätzlicher Einwohner hebt 1983/Nordheide auf 4: Die zwei größten Gruppen sind gleich
-- groß. Entlarvt: „die größte Gruppe“ per ORDER BY … DESC LIMIT 1 (liefert nur eine von zwei).
-- Ändert sich basis.sql, muss die Gruppe neu bestimmt werden (Test db_varianten prüft sie).

INSERT INTO Einwohner (EinwohnerNr, Vorname, Nachname, Jahrgang, Stadtteil, Strasse) VALUES
  (9031, 'Fenja', 'Holtorf', 1983, 'Nordheide', 'Am Schulzentrum 12');
