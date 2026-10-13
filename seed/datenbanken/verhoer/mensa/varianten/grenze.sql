-- Randfall-Variante „grenze“ des Verhör-Kontexts V7 Mensa-Vorbestellsystem (LIESMICH „Randfall-Varianten“).
-- Delta auf einer Kopie der Haupt-DB (basis.sql); IDs im reservierten Bereich ab 9021.
-- Zwei Angebote an den Rändern des Monats: Mi 2027-03-31 (Projekttag, Fischstäbchen, 8 Portionen – im März, damit
-- kommen die Fischstäbchen auf 52 Portionen) und Mo 2027-04-12 (nach den Osterferien, Gemüselasagne, 3 Portionen –
-- nicht mehr im März). Bestellt von Personen mit wenigen Bestellungen (keine über 10).
-- Entlarvt bei GP-eA-f/GP-gA-d (Portionen im März 2027, HAVING > 50): ein Datumsfilter, der am letzten Datentag der
-- Haupt-DB endet (z. B. Datum <= '2027-03-25' oder Datum < '2027-03-31'), und ein Filter ohne Obergrenze
-- (nur Datum >= '2027-03-01' – Gemüselasagne käme mit 53 Portionen dazu, P6).

PRAGMA foreign_keys = ON;

INSERT INTO Angebot (AngebotNr, GerichtNr, Datum, Portionen) VALUES
  (9021, 5, '2027-03-31', 20),
  (9022, 2, '2027-04-12', 20);

INSERT INTO Bestellung (BestellNr, PersonNr, AngebotNr, Menge, Abgeholt) VALUES
  (9021, 35, 9021, 2, '12:00'),
  (9022, 37, 9021, 2, '12:05'),
  (9023, 38, 9021, 2, '12:30'),
  (9024, 39, 9021, 2, '12:45'),
  (9025, 33, 9022, 2, '12:15'),
  (9026, 34, 9022, 1, '12:20');
