-- Randfall-Variante „grenze“ der Übungsdatenbank TuS (LIESMICH „Randfall-Varianten“, Spec 7.4).
-- Delta auf einer Kopie der Haupt-DB (basis.sql); IDs im reservierten Bereich ab 901.
-- Mitglied 902 tritt genau am Tag der Beitragserhöhung ein (2026-01-01); Mitglied 903 ist seit genau 2020-01-01 in
-- der Tennis-Abteilung (eigenes Mitglied, damit Seit nicht vor dem Eintritt liegt und Haupt-Datensätze unverändert
-- bleiben). Entlarvt: Eintritt > '2026-01-01' für „seit der Erhöhung“ (verliert 902); Grenzfehler bei Seit rund um
-- 2020-01-01 (< statt <= bzw. > statt >=).
-- Normalisierte Fassung und Rohliste werden gleich ergänzt (Erwachsenenbeitrag 14,00 €). Handball (11 → 12) und
-- Tennis (10 → 11) gewählt, damit kein neuer Gleichstand mit Tischtennis/Fußball (je 14) entsteht.

PRAGMA foreign_keys = ON;

INSERT INTO Mitglied (MitgliedNr, Vorname, Nachname, Geburtsjahr, Beitragsgruppe, Eintritt) VALUES
  (902, 'Joris', 'Renken', 1987, 'Erwachsene', '2026-01-01'),
  (903, 'Hilke', 'Bohlken', 1975, 'Erwachsene', '2020-01-01');

INSERT INTO Mitgliedschaft (MitgliedNr, AbteilungNr, Seit) VALUES
  (902, 6, '2026-01-01'),
  (903, 3, '2020-01-01');

INSERT INTO MitgliederlisteRoh (Mitglied, Geburtsjahr, Abteilungen, Trainer, TrainerTelefon, Beitragsgruppe,
                                Monatsbeitrag, Halle, HallenAdresse, Eintritt) VALUES
  ('Joris Renken', 1987, 'Handball', 'Sven Albers', '0000-17320', 'Erwachsene', 14.0,
   'Halle am Mühlenfeld', 'Mühlenweg 12', '2026-01-01'),
  ('Hilke Bohlken', 1975, 'Tennis', 'Jens Meyer', '0000-31415', 'Erwachsene', 14.0,
   'Tennisanlage Lindenhof', 'Lindenallee 7', '2020-01-01');
