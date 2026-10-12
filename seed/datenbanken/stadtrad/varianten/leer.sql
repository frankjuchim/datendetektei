-- Randfall-Variante „leer“ der Übungsdatenbank StadtRad (LIESMICH „Randfall-Varianten“, Spec 7.4).
-- Delta auf einer Kopie der Haupt-DB (basis.sql); Ausleihe ab 9001, Station/Rad/Kunde ab 901.
-- Neue Station Deichtor ohne Räder und Ausleihen, neuer Kunde ohne Ausleihe. Entlarvt: FROM Station, Rad ohne
-- Verbund (Deichtor erscheint mit Zahlen); Musterlösungen müssen festhalten, dass leere Gruppen im impliziten
-- Verbund nicht erscheinen.

PRAGMA foreign_keys = ON;

INSERT INTO Station (StationID, Name, Stadtteil, Stellplaetze) VALUES
  (901, 'Deichtor', 'Deichkamp', 10);

INSERT INTO Kunde (KundenID, Vorname, Nachname, Jahrgang, Tarif, Stadtteil) VALUES
  (902, 'Taalke', 'Wöltjen', 1997, 'Basis', 'Deichkamp');
