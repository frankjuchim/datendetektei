'use strict';
// Verhör-Kontext V7 „Mensa-Vorbestellsystem“ (Verhör 7 = Lab-Generalprobe, Generalprobe eA/gA): vollständig kuratiert,
// kein Generator (basis.sql = schema.sql + pflicht.sql). abnahme() = Tabelle „Abnahme-Prüfungen“ aus
// seed/datenbanken/verhoer/mensa/LIESMICH.md (Pflicht-Randfälle aus VERHOER_KONTEXTE.md V7, Blueprints A7-V-01 … 15,
// GP-eA-a … g, GP-gA-a … f).

const { gleich, bereich, wert, spalte, zeilen, zeilenzahlen } = require('./abnahme_hilfen');

const VERBUND = 'Gericht.GerichtNr = Angebot.GerichtNr AND Angebot.AngebotNr = Bestellung.AngebotNr';

function abnahme(db) {
  const umsatzWoche = spalte(db, `SELECT SUM(Bestellung.Menge * Gericht.Preis) AS Umsatz FROM Gericht, Angebot, Bestellung
    WHERE ${VERBUND} AND Angebot.Datum BETWEEN '2027-03-15' AND '2027-03-19' GROUP BY Gericht.GerichtNr ORDER BY Umsatz DESC`);
  const nichtAbgeholt = spalte(db, `SELECT COUNT(*) FROM Bestellung WHERE Abgeholt IS NULL
    GROUP BY PersonNr ORDER BY COUNT(*) DESC`);
  return [
    ...zeilenzahlen(db, { Person: 40, Gericht: 14, Angebot: 68, Bestellung: 319, Kuechenkraft: 5, bereitetZu: 112,
      BestellUebersicht: 16 }),
    gleich('Angebote im März / am Stichtag 2027-03-15', [
      wert(db, "SELECT COUNT(*) FROM Angebot WHERE Datum LIKE '2027-03-%'"),
      wert(db, "SELECT COUNT(*) FROM Angebot WHERE Datum = '2027-03-15'")
    ], [58, 4]),
    gleich('nur Werktage, nicht am Karfreitag 2027-03-26', wert(db,
      "SELECT COUNT(*) FROM Angebot WHERE strftime('%w', Datum) IN ('0', '6') OR Datum = '2027-03-26'"), 0),
    gleich('Klasse genau bei Schülerinnen und Schülern', wert(db,
      "SELECT COUNT(*) FROM Person WHERE (Rolle = 'Schüler') != (Klasse IS NOT NULL)"), 0),
    gleich('Portionen (geplant) ≥ bestellte Portionen je Angebot', wert(db, `SELECT COUNT(*) FROM Angebot
      WHERE Portionen < (SELECT SUM(Menge) FROM Bestellung WHERE Bestellung.AngebotNr = Angebot.AngebotNr)`), 0),
    gleich('A7-V-01 Mehrfachbestellung: Person 6, Angebot 45 (204, 209)', zeilen(db, `SELECT PersonNr, AngebotNr, COUNT(*)
      FROM Bestellung GROUP BY PersonNr, AngebotNr HAVING COUNT(*) > 1`), [[6, 45, 2]]),
    gleich('A7-V-03 Grenzpreis: vegetarisch genau 4.00', spalte(db,
      "SELECT Bezeichnung FROM Gericht WHERE Vegetarisch = 'ja' AND Preis = 4"), ['Gemüselasagne']),
    gleich('A7-V-03 vegetarisch unter 4 €', spalte(db,
      "SELECT GerichtNr FROM Gericht WHERE Vegetarisch = 'ja' AND Preis < 4 ORDER BY GerichtNr"), [4, 6, 9, 11, 12, 13, 14]),
    gleich('A7-V-04 Gerichte am 2027-03-15', spalte(db, `SELECT Gericht.GerichtNr FROM Gericht, Angebot
      WHERE Gericht.GerichtNr = Angebot.GerichtNr AND Angebot.Datum = '2027-03-15' ORDER BY Gericht.GerichtNr`), [1, 4, 10, 13]),
    gleich('GP-e vegetarisch am Stichtag, aufsteigend nach Preis', zeilen(db, `SELECT Gericht.Bezeichnung, Gericht.Preis
      FROM Gericht, Angebot WHERE Gericht.GerichtNr = Angebot.GerichtNr AND Angebot.Datum = '2027-03-15'
      AND Gericht.Vegetarisch = 'ja' ORDER BY Gericht.Preis`), [['Schokopudding', 1.25], ['Käsespätzle', 3.75]]),
    gleich('A7-V-07 nicht abgeholt: 31 (Person 30: 5, 7: 4, 19: 3, Platz 4: 2)', [
      wert(db, 'SELECT COUNT(*) FROM Bestellung WHERE Abgeholt IS NULL'), nichtAbgeholt.slice(0, 4)
    ], [31, [5, 4, 3, 2]]),
    gleich('GP-g LIMIT 3 nicht abgeholt', spalte(db, `SELECT Person.PersonNr FROM Person, Bestellung, Angebot
      WHERE Person.PersonNr = Bestellung.PersonNr AND Bestellung.AngebotNr = Angebot.AngebotNr AND Bestellung.Abgeholt IS NULL
      GROUP BY Person.PersonNr, Person.Vorname, Person.Nachname ORDER BY COUNT(*) DESC LIMIT 3`), [30, 7, 19]),
    gleich('A7-V-08 Mengen 1–3, Portionen ≠ Bestellungen', zeilen(db,
      'SELECT MIN(Menge), MAX(Menge), COUNT(*), SUM(Menge) FROM Bestellung'), [[1, 3, 319, 468]]),
    gleich('A7-V-08 Portionen je Gericht (Kürbissuppe nie angeboten)', zeilen(db, `SELECT Gericht.GerichtNr,
      SUM(Bestellung.Menge) FROM Gericht, Angebot, Bestellung WHERE ${VERBUND} GROUP BY Gericht.GerichtNr
      ORDER BY Gericht.GerichtNr`),
    [[1, 68], [2, 56], [3, 51], [4, 35], [5, 48], [6, 30], [7, 63], [8, 22], [9, 21], [10, 15], [11, 14], [12, 18], [13, 27]]),
    gleich('A7-V-09 mehr als 10 Bestellungen: 3, 17, 25; genau 10: Person 9', [
      spalte(db, 'SELECT PersonNr FROM Bestellung GROUP BY PersonNr HAVING COUNT(*) > 10 ORDER BY PersonNr'),
      spalte(db, 'SELECT PersonNr FROM Bestellung GROUP BY PersonNr HAVING COUNT(*) = 10')
    ], [[3, 17, 25], [9]]),
    gleich('A7-V-13 Top 3 der Woche 2027-03-15 … 19', spalte(db, `SELECT Gericht.GerichtNr FROM Gericht, Angebot, Bestellung
      WHERE ${VERBUND} AND Angebot.Datum BETWEEN '2027-03-15' AND '2027-03-19' GROUP BY Gericht.GerichtNr
      ORDER BY SUM(Bestellung.Menge * Gericht.Preis) DESC LIMIT 3`), [7, 1, 4]),
    gleich('A7-V-13 Umsätze Platz 1–4', umsatzWoche.slice(0, 4), [63.75, 63, 52.5, 47.5]),
    gleich('GP-f Portionen im März > 50', zeilen(db, `SELECT Gericht.GerichtNr, SUM(Bestellung.Menge) AS Portionen
      FROM Gericht, Angebot, Bestellung WHERE ${VERBUND} AND Angebot.Datum BETWEEN '2027-03-01' AND '2027-03-31'
      GROUP BY Gericht.GerichtNr HAVING SUM(Bestellung.Menge) > 50 ORDER BY Portionen DESC`), [[1, 63], [7, 57], [3, 51]]),
    gleich('GP-f HAVING-Grenze: Gemüselasagne genau 50, Curry 51 (davon 11 am 2027-03-01)', zeilen(db, `SELECT Gericht.GerichtNr,
      SUM(Bestellung.Menge), SUM(CASE WHEN Angebot.Datum = '2027-03-01' THEN Bestellung.Menge ELSE 0 END)
      FROM Gericht, Angebot, Bestellung WHERE ${VERBUND} AND Angebot.Datum LIKE '2027-03-%' AND Gericht.GerichtNr IN (2, 3)
      GROUP BY Gericht.GerichtNr`), [[2, 50, 0], [3, 51, 11]]),
    gleich('BestellUebersicht: Tomatensuppe nur einmal', spalte(db,
      'SELECT Gericht FROM BestellUebersicht GROUP BY Gericht HAVING COUNT(*) = 1'), ['Tomatensuppe']),
    gleich('BestellUebersicht: Klasse von Person 14 verschieden (10b/10c), Chili-Preis 3.25/3.50', [
      spalte(db, 'SELECT DISTINCT Klasse FROM BestellUebersicht WHERE PersonNr = 14 ORDER BY Klasse'),
      spalte(db, "SELECT DISTINCT Preis FROM BestellUebersicht WHERE Gericht = 'Chili sin Carne' ORDER BY Preis")
    ], [['10b', '10c'], [3.25, 3.5]]),
    bereich('Anteil nicht abgeholt (≈ 10 %)', wert(db,
      'SELECT 1.0 * SUM(Abgeholt IS NULL) / COUNT(*) FROM Bestellung'), 0.08, 0.12),
    gleich('BestellNr chronologisch', wert(db, `SELECT COUNT(*) FROM Bestellung b1, Angebot a1, Bestellung b2, Angebot a2
      WHERE b1.AngebotNr = a1.AngebotNr AND b2.AngebotNr = a2.AngebotNr AND b1.BestellNr < b2.BestellNr AND a1.Datum > a2.Datum`), 0)
  ];
}

module.exports = { abnahme };
