'use strict';
// Verhör-Kontext V2 „Bürgerbus“: vollständig kuratiert, kein Generator (basis.sql = schema.sql + pflicht.sql).
// abnahme() = Tabelle „Abnahme-Prüfungen“ aus seed/datenbanken/verhoer/buergerbus/LIESMICH.md
// (Pflicht-Randfälle aus VERHOER_KONTEXTE.md V2 und dem Verhör-Blueprint A2-V-01 … 12).

const { gleich, wert, spalte, zeilen, zeilenzahlen } = require('./abnahme_hilfen');

const VERBUND_HALT = `FROM Fahrt, Haltestelle s1, Haltestelle s2
  WHERE Fahrt.StartHalt = s1.HaltID AND Fahrt.ZielHalt = s2.HaltID`;

function abnahme(db) {
  const fahrgaeste = spalte(db, 'SELECT Fahrgaeste FROM Fahrt WHERE Fahrgaeste IS NOT NULL ORDER BY Fahrgaeste DESC');
  return [
    ...zeilenzahlen(db, { Haltestelle: 12, Fahrer: 8, Bus: 4, Fahrt: 70 }),
    gleich('A2-V-04 Kreuzprodukt Fahrer × Bus', wert(db, 'SELECT COUNT(*) FROM Fahrer, Bus'), 32),
    gleich('Sitzplätze 8, 8, 9, 12', spalte(db, 'SELECT Sitzplaetze FROM Bus ORDER BY Kennzeichen'), [8, 8, 9, 12]),
    gleich('Start ≠ Ziel', wert(db, 'SELECT COUNT(*) FROM Fahrt WHERE StartHalt = ZielHalt'), 0),
    gleich('Haltestellen-Namen eindeutig', wert(db, 'SELECT COUNT(DISTINCT Name) FROM Haltestelle'), 12),
    gleich('Kennzeichen in der Haupt-DB nie NULL', wert(db, 'SELECT COUNT(*) FROM Fahrt WHERE Kennzeichen IS NULL'), 0),
    gleich('A2-V-10 nicht gezählt: 7 Fahrten, 7 verschiedene Fahrer', zeilen(db,
      'SELECT COUNT(*), COUNT(DISTINCT FahrerNr) FROM Fahrt WHERE Fahrgaeste IS NULL'), [[7, 7]]),
    gleich('Fahrgastzahl 0 (gezählt, ≠ NULL)', spalte(db, 'SELECT FahrtNr FROM Fahrt WHERE Fahrgaeste = 0'), [16]),
    gleich('Fahrgäste passen in den Bus', wert(db, `SELECT COUNT(*) FROM Fahrt, Bus
      WHERE Fahrt.Kennzeichen = Bus.Kennzeichen AND Fahrt.Fahrgaeste > Bus.Sitzplaetze`), 0),
    gleich('Gleichnamige: Hauke Rohlfs = FahrerNr 2 und 7', spalte(db,
      "SELECT FahrerNr FROM Fahrer WHERE Vorname = 'Hauke' AND Nachname = 'Rohlfs'"), [2, 7]),
    gleich('A2-V-08 Fahrer mit Bus > 8 Sitzplätzen (Schlüssel)', spalte(db, `SELECT DISTINCT Fahrer.FahrerNr
      FROM Fahrer, Fahrt, Bus WHERE Fahrer.FahrerNr = Fahrt.FahrerNr AND Fahrt.Kennzeichen = Bus.Kennzeichen
      AND Bus.Sitzplaetze > 8 ORDER BY Fahrer.FahrerNr`), [1, 2, 3, 4, 5, 6, 7]),
    gleich('A2-V-08 DISTINCT über Namen: 6 Zeilen', zeilen(db, `SELECT DISTINCT Fahrer.Vorname, Fahrer.Nachname
      FROM Fahrer, Fahrt, Bus WHERE Fahrer.FahrerNr = Fahrt.FahrerNr AND Fahrt.Kennzeichen = Bus.Kennzeichen
      AND Bus.Sitzplaetze > 8`).length, 6),
    gleich('FahrerNr 8 fuhr nur Busse mit 8 Sitzplätzen', spalte(db, `SELECT DISTINCT Bus.Sitzplaetze FROM Fahrt, Bus
      WHERE Fahrt.Kennzeichen = Bus.Kennzeichen AND Fahrt.FahrerNr = 8`), [8]),
    gleich('A2-V-06 FahrerNr 4 mit mehr als 6', spalte(db,
      'SELECT FahrtNr FROM Fahrt WHERE FahrerNr = 4 AND Fahrgaeste > 6'), [4, 12, 20, 44, 52]),
    gleich('FahrerNr 4 mit genau 6 bzw. NULL', zeilen(db, `SELECT SUM(Fahrgaeste = 6), SUM(Fahrgaeste IS NULL)
      FROM Fahrt WHERE FahrerNr = 4`), [[1, 1]]),
    gleich('A2-V-11 Top 5', spalte(db, `SELECT Fahrt.FahrtNr ${VERBUND_HALT}
      ORDER BY Fahrt.Fahrgaeste DESC LIMIT 5`).sort((a, b) => a - b), [15, 20, 38, 43, 61]),
    gleich('A2-V-11 kein Gleichstand an Platz 5/6 (10 vs. 9)', [fahrgaeste[4], fahrgaeste[5]], [10, 9]),
    gleich('A2-V-12 Nordheide → Nordheide', spalte(db, `SELECT Fahrt.FahrtNr ${VERBUND_HALT}
      AND s1.Ortsteil = 'Nordheide' AND s2.Ortsteil = 'Nordheide'`), [2, 15, 22, 35, 42, 55, 62]),
    gleich('A2-V-12 Nordheide → anderer Ortsteil: 28 Fahrten', wert(db, `SELECT COUNT(*) ${VERBUND_HALT}
      AND s1.Ortsteil = 'Nordheide' AND s2.Ortsteil != 'Nordheide'`), 28),
    gleich('anderer Ortsteil → Nordheide: 32 Fahrten', wert(db, `SELECT COUNT(*) ${VERBUND_HALT}
      AND s1.Ortsteil != 'Nordheide' AND s2.Ortsteil = 'Nordheide'`), 32),
    gleich('Zeitraum Mo–Fr 2026-09-01 … 2026-10-09', zeilen(db, 'SELECT MIN(Datum), MAX(Datum) FROM Fahrt'),
      [['2026-09-01', '2026-10-09']]),
    gleich('FahrtNr chronologisch', wert(db, `SELECT COUNT(*) FROM Fahrt a, Fahrt b
      WHERE a.FahrtNr < b.FahrtNr AND a.Datum || a.Abfahrt > b.Datum || b.Abfahrt`), 0)
  ];
}

module.exports = { abnahme };
