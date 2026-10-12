-- Randfall-Variante „null“ der Übungsdatenbank Datenspuren (LIESMICH „Randfall-Varianten“, Spec 7.4).
-- Delta auf einer Kopie der Haupt-DB (basis.sql); Einwohner ab 9001, Tokens/Geräte mit Ziffernteil ab 9001.
-- Zweiter Vereinseintrag ohne Geburtsjahr (neben „Nora Falter“ V-9952), diesmal mit Stadtteil.
-- Entlarvt: „Tischtennis-Mitglieder, die nicht 1988 geboren sind“ nur mit Geburtsjahr != 1988 (verliert V-9001);
-- „Mitglieder ohne Geburtsjahr“ mit Geburtsjahr = NULL (findet nichts).

INSERT INTO VereinExport (MitgliedToken, Geburtsjahr, Abteilung, Stadtteil) VALUES
  ('V-9001', NULL, 'Tischtennis', 'Hafenviertel');
