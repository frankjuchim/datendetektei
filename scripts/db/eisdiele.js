'use strict';
// Eisdiele (Gastmodus): vollständig kuratiert, kein Generator (basis.sql = schema.sql + pflicht.sql).
// abnahme() = Tabelle „Abnahme-Prüfungen“ aus seed/datenbanken/eisdiele/LIESMICH.md.

const { gleich, bereich, wert, zeilen, zeilenzahlen } = require('./abnahme_hilfen');

/** Alle Sorten mit dem Höchstwert eines Aggregats (Gleichstände sichtbar). */
function spitze(db, aggregat) {
  const werte = zeilen(db, `
    SELECT Sorte.Name, ${aggregat} AS Wert
    FROM Sorte, Verkauf
    WHERE Sorte.SorteNr = Verkauf.SorteNr
    GROUP BY Sorte.SorteNr, Sorte.Name`);
  const max = Math.max(...werte.map((w) => w[1]));
  return werte.filter((w) => w[1] === max).map(([name, w]) => [name, w]);
}

function abnahme(db) {
  const umsatz = zeilen(db, `
    SELECT Sorte.Name, SUM(Verkauf.Kugeln * Sorte.Preis)
    FROM Sorte, Verkauf
    WHERE Sorte.SorteNr = Verkauf.SorteNr
    GROUP BY Sorte.SorteNr, Sorte.Name`);
  return [
    ...zeilenzahlen(db, { Sorte: 10, Verkauf: 57 }),
    gleich('Meiste Verkäufe (COUNT): genau Stracciatella', spitze(db, 'COUNT(*)'), [['Stracciatella', 12]]),
    gleich('Meiste Kugeln (SUM): genau Vanille', spitze(db, 'SUM(Verkauf.Kugeln)'), [['Vanille', 36]]),
    gleich('Umsatz > 50 €: genau Vanille', umsatz.filter((u) => u[1] > 50 + 1e-9).map((u) => u[0]), ['Vanille']),
    gleich('Mindestens eine Sorte mit Umsatz ≤ 50 €', umsatz.some((u) => u[1] <= 50 + 1e-9), true),
    gleich('Pistazie nie verkauft', wert(db, 'SELECT COUNT(*) FROM Verkauf WHERE SorteNr = 9'), 0),
    bereich('Verkäufe am 2026-07-12', wert(db, "SELECT COUNT(*) FROM Verkauf WHERE Datum = '2026-07-12'"), 5)
  ];
}

module.exports = { abnahme };
