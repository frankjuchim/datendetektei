-- Randfall-Variante „leer“ der Übungsdatenbank Detektei (LIESMICH „Randfall-Varianten“, Spec 7.4).
-- Delta auf einer Kopie der Haupt-DB (basis.sql); IDs ab 9001, Ermittler ab 901.
-- Fall ohne Verdächtige, Aussagen und Beweisstücke; Ermittlerin ohne geleiteten Fall; Ort ohne Aussage.
-- Entlarvt: „Fälle je Leitung“, „Aussagen je Ort“ – die Musterlösung muss festhalten, dass leere Gruppen im
-- impliziten Verbund fehlen.

PRAGMA foreign_keys = ON;

INSERT INTO Ermittler (ErmittlerNr, Name, Dienstgrad, MentorNr) VALUES
  (902, 'Nele Lindemann', 'Junior', 3);

INSERT INTO Fall (FallNr, Titel, Eroeffnet, Status, LeiterNr) VALUES
  (9041, 'Der leere Briefkasten', '2026-09-01', 'ruht', 12);

INSERT INTO Ort (OrtNr, Bezeichnung, Stadtteil) VALUES
  (9042, 'Alter Leuchtturm', 'Weserufer');
