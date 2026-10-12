-- Randfall-Variante „null“ des Verhör-Kontexts V2 Bürgerbus (LIESMICH „Randfall-Varianten“, Spec 7.4).
-- Delta auf einer Kopie der Haupt-DB (basis.sql); IDs im reservierten Bereich ab 9001.
-- Eine nicht gezählte Fahrt mit einem Ersatzfahrzeug, dessen Kennzeichen nicht erfasst wurde (FK Kennzeichen NULL).
-- Entlarvt: überflüssige Tabellen im Verbund – wer bei „Fahrten ohne Fahrgastzahl mit Datum und Fahrername“
-- (A2-V-10) oder „Fahrten mit Fahrer“ (A2-V-03) zusätzlich Bus mit Fahrt.Kennzeichen = Bus.Kennzeichen
-- verbindet, verliert Fahrt 9001.

PRAGMA foreign_keys = ON;

INSERT INTO Fahrt (FahrtNr, FahrerNr, Kennzeichen, StartHalt, ZielHalt, Datum, Abfahrt, Fahrgaeste) VALUES
  (9001, 3, NULL, 7, 10, '2026-10-02', '13:05', NULL);
