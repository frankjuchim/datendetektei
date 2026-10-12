-- Randfall-Variante „gleichnamig“ der Übungsdatenbank TuS (LIESMICH „Randfall-Varianten“, Spec 7.4).
-- Delta auf einer Kopie der Haupt-DB (basis.sql); IDs im reservierten Bereich ab 901.
-- Eine zweite Svea Harms (2010, Jugend) in Tischtennis – wie Mitglied 18 (1999, Ermäßigt, Tischtennis).
-- Entlarvt: GROUP BY Mitglied.Vorname, Mitglied.Nachname (beide verschmelzen, P3).
-- Normalisierte Fassung und Rohliste werden gleich ergänzt (eine Rohzeile je Mitglied und Abteilung).

PRAGMA foreign_keys = ON;

INSERT INTO Mitglied (MitgliedNr, Vorname, Nachname, Geburtsjahr, Beitragsgruppe, Eintritt) VALUES
  (901, 'Svea', 'Harms', 2010, 'Jugend', '2025-03-01');

INSERT INTO Mitgliedschaft (MitgliedNr, AbteilungNr, Seit) VALUES
  (901, 2, '2025-03-01');

INSERT INTO MitgliederlisteRoh (Mitglied, Geburtsjahr, Abteilungen, Trainer, TrainerTelefon, Beitragsgruppe,
                                Monatsbeitrag, Halle, HallenAdresse, Eintritt) VALUES
  ('Svea Harms', 2010, 'Tischtennis', 'Birte Haschke', '0000-27182', 'Jugend', 8.5,
   'Halle am Mühlenfeld', 'Mühlenweg 12', '2025-03-01');
