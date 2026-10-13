'use strict';
// Prüfungs-Kontext „Schulsanitätsdienst“ (Klausur eA: A + B, gA: A + B-gA; Akte 7): vollständig kuratiert, kein
// Generator (basis.sql = schema.sql + pflicht.sql). abnahme() = Tabelle „Abnahme-Prüfungen“ aus
// seed/datenbanken/pruefung/sanitaetsdienst/LIESMICH.md (Pflicht-Randfälle aus VERHOER_KONTEXTE.md „Klausur ·
// Schulsanitätsdienst“, Blueprints KL-A-a … h, KL-BgA-a … d).

const { gleich, wert, spalte, zeilen, zeilenzahlen } = require('./abnahme_hilfen');

function abnahme(db) {
  const verbrauch = zeilen(db, `SELECT Material.MatNr, SUM(verbraucht.Menge) AS Verbrauch FROM Material, verbraucht
    WHERE Material.MatNr = verbraucht.MatNr GROUP BY Material.MatNr ORDER BY Verbrauch DESC`);
  const sportunfaelle = spalte(db, `SELECT COUNT(*) FROM eingesetzt, Einsatz WHERE eingesetzt.EinsatzNr = Einsatz.EinsatzNr
    AND Einsatz.Art = 'Sportunfall' GROUP BY eingesetzt.SanNr ORDER BY COUNT(*) DESC`);
  return [
    ...zeilenzahlen(db, { Sanitaeter: 18, Einsatz: 46, eingesetzt: 94, Material: 12, verbraucht: 167, EinsatzListe: 11,
      AusbildungRoh: 6 }),
    gleich('Zeitraum 2026-11-02 … 2027-02-26, keine Einsätze in den Weihnachtsferien', [
      wert(db, 'SELECT MIN(Datum) FROM Einsatz'), wert(db, 'SELECT MAX(Datum) FROM Einsatz'),
      wert(db, "SELECT COUNT(*) FROM Einsatz WHERE Datum BETWEEN '2026-12-23' AND '2027-01-01'")
    ], ['2026-11-02', '2027-02-26', 0]),
    gleich('nur Werktage', wert(db, "SELECT COUNT(*) FROM Einsatz WHERE strftime('%w', Datum) IN ('0', '6')"), 0),
    gleich('KL-A-e: ohne Betreuer genau die Leitung (1, 2)', spalte(db,
      "SELECT SanNr FROM Sanitaeter WHERE BetreuerNr IS NULL ORDER BY SanNr"), [1, 2]),
    gleich('KL-A-e: Self-Join liefert 16 Paare', wert(db,
      'SELECT COUNT(*) FROM Sanitaeter s, Sanitaeter b WHERE s.BetreuerNr = b.SanNr'), 16),
    gleich('Betreuung nur durch Fortgeschrittene oder Leitung', wert(db, `SELECT COUNT(*) FROM Sanitaeter s, Sanitaeter b
      WHERE s.BetreuerNr = b.SanNr AND b.Stufe = 'Anfänger'`), 0),
    gleich('je Einsatz genau eine Person als Ersthelfer', wert(db, `SELECT COUNT(*) FROM Einsatz WHERE EinsatzNr NOT IN
      (SELECT EinsatzNr FROM eingesetzt WHERE Rolle = 'Ersthelfer' GROUP BY EinsatzNr HAVING COUNT(*) = 1)`), 0),
    gleich('KL-A-d: Januar, Sporthalle oder Pausenhof (Grenztage 04. und 29.)', zeilen(db, `SELECT Datum, Uhrzeit, Art
      FROM Einsatz WHERE Datum BETWEEN '2027-01-01' AND '2027-01-31' AND Ort IN ('Sporthalle', 'Pausenhof') ORDER BY Datum`),
    [['2027-01-04', '08:50', 'Sportunfall'], ['2027-01-08', '10:20', 'Prellung'], ['2027-01-13', '13:40', 'Sportunfall'],
      ['2027-01-19', '10:50', 'Schnittwunde'], ['2027-01-22', '08:30', 'Kreislauf'], ['2027-01-29', '09:55', 'Sportunfall']]),
    gleich('KL-A-d: knapp außerhalb (2026-12-18, 2027-02-01) und Sporthallenflur im Januar', [
      spalte(db, "SELECT Datum FROM Einsatz WHERE Datum IN ('2026-12-18', '2027-02-01') AND Ort IN ('Sporthalle', 'Pausenhof') ORDER BY Datum"),
      wert(db, "SELECT COUNT(*) FROM Einsatz WHERE Ort = 'Sporthallenflur' AND Datum LIKE '2027-01-%'")
    ], [['2026-12-18', '2027-02-01'], 1]),
    gleich('KL-A-f: Verbrauch > 20 (Kompresse genau 20)', verbrauch.filter((z) => z[1] > 20),
      [[1, 61], [2, 34], [8, 27], [3, 23], [4, 21]]),
    gleich('KL-A-f: HAVING-Grenze Kompresse 20, COUNT ≠ SUM', [
      wert(db, 'SELECT SUM(Menge) FROM verbraucht WHERE MatNr = 5'),
      spalte(db, 'SELECT MatNr FROM verbraucht GROUP BY MatNr HAVING COUNT(*) > 20 ORDER BY MatNr')
    ], [20, [1, 2, 8]]),
    gleich('Beatmungstuch (12) nie verbraucht', wert(db, 'SELECT COUNT(*) FROM verbraucht WHERE MatNr = 12'), 0),
    gleich('KL-A-g: meiste Sportunfälle eindeutig (Rune Kahrs 9, Platz 2: 5)', sportunfaelle.slice(0, 2), [9, 5]),
    gleich('KL-A-g: LIMIT 1', spalte(db, `SELECT Sanitaeter.SanNr FROM Sanitaeter, eingesetzt, Einsatz
      WHERE Sanitaeter.SanNr = eingesetzt.SanNr AND eingesetzt.EinsatzNr = Einsatz.EinsatzNr AND Einsatz.Art = 'Sportunfall'
      GROUP BY Sanitaeter.SanNr, Sanitaeter.Vorname, Sanitaeter.Nachname ORDER BY COUNT(*) DESC LIMIT 1`), [5]),
    gleich('KL-A-h: nie eingesetzt 16, 17', spalte(db,
      'SELECT SanNr FROM Sanitaeter WHERE SanNr NOT IN (SELECT SanNr FROM eingesetzt) ORDER BY SanNr'), [16, 17]),
    gleich('KL-A-c: EinsatzListe = Einsätze 34–38, Einsatz 35 nur einmal', [
      spalte(db, 'SELECT DISTINCT EinsatzNr FROM EinsatzListe ORDER BY EinsatzNr'),
      spalte(db, 'SELECT EinsatzNr FROM EinsatzListe GROUP BY EinsatzNr HAVING COUNT(*) = 1')
    ], [[34, 35, 36, 37, 38], [35]]),
    gleich('KL-A-c: Klasse von SanNr 13 widersprüchlich (9a/9b), sonst wie Sanitaeter', [
      spalte(db, 'SELECT DISTINCT Klasse FROM EinsatzListe WHERE SanNr = 13 ORDER BY Klasse'),
      wert(db, `SELECT COUNT(*) FROM EinsatzListe, Sanitaeter WHERE EinsatzListe.SanNr = Sanitaeter.SanNr
        AND EinsatzListe.Klasse != Sanitaeter.Klasse`)
    ], [['9a', '9b'], 1]),
    gleich('EinsatzListe passt sonst zu Einsatz und eingesetzt', wert(db, `SELECT COUNT(*) FROM EinsatzListe l, Einsatz e, eingesetzt g
      WHERE l.EinsatzNr = e.EinsatzNr AND g.EinsatzNr = l.EinsatzNr AND g.SanNr = l.SanNr AND l.Datum = e.Datum AND l.Ort = e.Ort
      AND l.Rolle = g.Rolle`), 11),
    gleich('KL-BgA-a: mehrwertige Zellen; AED nur einmal als ganzer Wert', [
      wert(db, "SELECT COUNT(*) FROM AusbildungRoh WHERE Kurse LIKE '%,%'"),
      wert(db, "SELECT COUNT(*) FROM AusbildungRoh WHERE Kurse = 'AED'"),
      wert(db, "SELECT COUNT(*) FROM AusbildungRoh WHERE Kurse LIKE '%AED%'")
    ], [4, 1, 4]),
    gleich('KL-BgA-b: Telefon von Ulf Meinecke widersprüchlich', wert(db,
      "SELECT COUNT(*) FROM AusbildungRoh WHERE Referent = 'Ulf Meinecke' AND RefTelefon != '0000-2718'"), 1)
  ];
}

module.exports = { abnahme };
