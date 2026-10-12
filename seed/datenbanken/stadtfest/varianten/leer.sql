-- Randfall-Variante „leer“ der Übungsdatenbank Stadtfest (LIESMICH „Randfall-Varianten“, Spec 7.4).
-- Delta auf einer Kopie der Haupt-DB (basis.sql); Bon/Produkt ab 9001, Helfer/Stand ab 901.
-- Stand mit Produkt, aber ohne Bon; Helferin mit Schicht, aber ohne Bon. Entlarvt: FROM Stand, Produkt als
-- Umsatzbasis (das Bastelzelt erscheint); Musterlösungen müssen festhalten, dass Stände ohne Bon im impliziten
-- Verbund nicht erscheinen.

PRAGMA foreign_keys = ON;

INSERT INTO Stand (StandNr, Name, Art, Platz) VALUES
  (901, 'Bastelzelt', 'Spiel', 'Festwiese');

INSERT INTO Produkt (ProduktNr, Bezeichnung, Preis, StandNr) VALUES
  (9001, 'Bastelset', 5.0, 901);

INSERT INTO Helfer (HelferNr, Vorname, Nachname, Jahrgang, Verein) VALUES
  (904, 'Levke', 'Harjes', 1983, 'Förderverein Schulzentrum');

INSERT INTO Schicht (HelferNr, StandNr, Beginn, Ende) VALUES
  (904, 901, '2026-08-29 14:00', '2026-08-29 18:00');
