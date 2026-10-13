-- Randfall-Variante „leer“ der Übungsdatenbank Datenspuren (LIESMICH „Randfall-Varianten“, Spec 7.4).
-- Delta auf einer Kopie der Haupt-DB (basis.sql); Einwohner ab 9001, Tokens/Geräte mit Ziffernteil ab 9001.
-- Alle Einwohner im Stadtteil Deichkamp werden gelöscht (keine Pflicht-Datensätze darunter); das Gerät WA-9041
-- checkt nachts nur an Deichkamp-Adressen ein, an denen danach niemand mehr gemeldet ist.
-- Entlarvt: „Einwohner je Stadtteil“ – Deichkamp erscheint nicht (Annahme: acht Stadtteile);
-- Verbund AppCheckin × Einwohner über Ort = Strasse liefert für WA-9041 nichts.

DELETE FROM Einwohner WHERE Stadtteil = 'Deichkamp';

INSERT INTO AppCheckin (Geraet, Ort, Zeitpunkt) VALUES
  ('WA-9041', 'Deichstraße 20', '2026-08-27 02:14'),
  ('WA-9041', 'Deichstraße 20', '2026-09-04 04:47'),
  ('WA-9041', 'Am Gewerbepark 7', '2026-09-17 01:33');
