-- Randfall-Variante „gleichnamig“ der Übungsdatenbank Datenspuren (LIESMICH „Randfall-Varianten“, Spec 7.4).
-- Delta auf einer Kopie der Haupt-DB (basis.sql); Einwohner ab 9001, Tokens/Geräte mit Ziffernteil ab 9001.
-- Zweiter Einwohner „Ole Brakhage“ (anderer Jahrgang, anderer Stadtteil) neben Pflicht 1163 (1988, Hafenviertel).
-- Entlarvt: Kandidatenabgleich mit dem Verein über den Namen statt über Jahrgang + Stadtteil;
-- „Adresse von Ole Brakhage“ ohne Jahrgang (zwei Adressen).

INSERT INTO Einwohner (EinwohnerNr, Vorname, Nachname, Jahrgang, Stadtteil, Strasse) VALUES
  (9011, 'Ole', 'Brakhage', 2001, 'Nordheide', 'Heideweg 4');
