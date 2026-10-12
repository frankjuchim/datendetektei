-- Randfall-Variante „leer“ der Übungsdatenbank TuS (LIESMICH „Randfall-Varianten“, Spec 7.4).
-- Delta auf einer Kopie der Haupt-DB (basis.sql); IDs im reservierten Bereich ab 901.
-- Halle ohne Abteilung (Boule ohne Mitglieder gibt es schon in der Haupt-DB). Entlarvt: „Mitglieder je Halle“ –
-- die Musterlösung muss festhalten, dass leere Hallen im impliziten Verbund nicht erscheinen.

PRAGMA foreign_keys = ON;

INSERT INTO Halle (HalleNr, Name, Adresse) VALUES
  (901, 'Bootshaus', 'Fährstraße 9');
