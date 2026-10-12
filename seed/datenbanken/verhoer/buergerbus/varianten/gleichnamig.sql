-- Randfall-Variante „gleichnamig“ des Verhör-Kontexts V2 Bürgerbus (LIESMICH „Randfall-Varianten“, Spec 7.4).
-- Delta auf einer Kopie der Haupt-DB (basis.sql); IDs im reservierten Bereich ab 901 (Fahrer) bzw. 9001 (Fahrt).
-- Eine zweite Fahrerin „Imke Tebbe“ (FahrerNr 901) mit einer vollen und einer schwach besetzten Fahrt.
-- Entlarvt: „Fahrten der Fahrerin mit der FahrerNr 4 mit mehr als 6 Fahrgästen“ (A2-V-06) über
-- Fahrer.Nachname = 'Tebbe' statt Fahrer.FahrerNr = 4 (bzw. Fahrt.FahrerNr = 4).

PRAGMA foreign_keys = ON;

INSERT INTO Fahrer (FahrerNr, Vorname, Nachname, Telefon) VALUES
  (901, 'Imke', 'Tebbe', '0000-41291');

INSERT INTO Fahrt (FahrtNr, FahrerNr, Kennzeichen, StartHalt, ZielHalt, Datum, Abfahrt, Fahrgaeste) VALUES
  (9011, 901, 'BB-103', 4, 10, '2026-09-26', '09:30', 8),
  (9012, 901, 'BB-101', 10, 4, '2026-09-26', '12:30', 4);
