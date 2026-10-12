-- Randfall-Variante „null“ der Übungsdatenbank TuS (LIESMICH „Randfall-Varianten“, Spec 7.4).
-- Delta auf einer Kopie der Haupt-DB (basis.sql); IDs im reservierten Bereich ab 901.
-- Zwei Rohzeilen (Neuaufnahmen ohne Angabe) mit Beitragsgruppe und Monatsbeitrag NULL. Nur in der Rohliste: in der
-- normalisierten Fassung ist Mitglied.Beitragsgruppe NOT NULL – genau das verhindert die Lücke dort.
-- Entlarvt: „Zeilen ohne Beitrag“ mit Monatsbeitrag = NULL (→ 0 statt 2); Anzahl je Beitragsgruppe ohne Gedanken an
-- die NULL-Gruppe. „Zeilen mit falschem Erwachsenenbeitrag“ bleibt bei 4 (NULL-Zeilen fallen bei = und != heraus).

PRAGMA foreign_keys = ON;

INSERT INTO MitgliederlisteRoh (Mitglied, Geburtsjahr, Abteilungen, Trainer, TrainerTelefon, Beitragsgruppe,
                                Monatsbeitrag, Halle, HallenAdresse, Eintritt) VALUES
  ('Joris Mammen', 2001, 'Handball', 'Sven Albers', '0000-17320', NULL, NULL,
   'Halle am Mühlenfeld', 'Mühlenweg 12', '2026-09-01'),
  ('Tomke Ihnken', 2012, 'Turnen', 'Anke Rosendahl', '0000-14142', NULL, NULL,
   'Turnhalle Schulzentrum', 'Schulweg 5', '2026-09-15');
