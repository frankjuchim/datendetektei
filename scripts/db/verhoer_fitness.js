'use strict';
// Verhör-Kontext V6 „Fitness-App“: vollständig kuratiert, kein Generator (basis.sql = schema.sql + pflicht.sql).
// abnahme() = Tabelle „Abnahme-Prüfungen“ aus seed/datenbanken/verhoer/fitness/LIESMICH.md
// (Pflicht-Randfälle aus VERHOER_KONTEXTE.md V6 und dem Verhör-Blueprint A6-V-01 … 08).

const { gleich, wert, spalte, zeilen, zeilenzahlen } = require('./abnahme_hilfen');

const KLEINE_GRUPPEN = `SELECT Geburtsjahr, PLZBereich FROM Export
  GROUP BY Geburtsjahr, PLZBereich HAVING COUNT(*) = 1 ORDER BY Geburtsjahr`;

function abnahme(db) {
  return [
    ...zeilenzahlen(db, { Export: 25, ExportVerlauf: 60 }),
    gleich('Export: eine Zeile je NutzerToken, nur Stichtag 2026-10-05', zeilen(db,
      'SELECT COUNT(DISTINCT NutzerToken), MIN(Datum), MAX(Datum) FROM Export'), [[25, '2026-10-05', '2026-10-05']]),
    gleich('ExportVerlauf: 25 Tokens, 2026-10-02 … 05, 1–4 Zeilen je Token', zeilen(db,
      'SELECT COUNT(DISTINCT NutzerToken), MIN(Datum), MAX(Datum) FROM ExportVerlauf'), [[25, '2026-10-02', '2026-10-05']]),
    gleich('jede Export-Zeile steht unverändert im Verlauf', wert(db, `SELECT COUNT(*) FROM Export e, ExportVerlauf v
      WHERE e.NutzerToken = v.NutzerToken AND e.Datum = v.Datum AND e.Geburtsjahr = v.Geburtsjahr
      AND e.PLZBereich = v.PLZBereich AND e.Geschlecht = v.Geschlecht AND e.Schritte = v.Schritte
      AND e.Ruhepuls IS v.Ruhepuls`), 25),
    gleich('Ruhepuls NULL: Verlauf 6, Export 2 (N-700, N-880)', [
      wert(db, 'SELECT COUNT(*) FROM ExportVerlauf WHERE Ruhepuls IS NULL'),
      spalte(db, 'SELECT NutzerToken FROM Export WHERE Ruhepuls IS NULL ORDER BY NutzerToken')
    ], [6, ['N-700', 'N-880']]),
    gleich('A6-V-05 kleine Gruppen (genau ein Token)', zeilen(db, KLEINE_GRUPPEN),
      [[1949, '004'], [1963, '006'], [1985, '003'], [2007, '001']]),
    gleich('A6-V-05 Falle COUNT(Ruhepuls) = 1', zeilen(db, `SELECT Geburtsjahr, PLZBereich FROM Export
      GROUP BY Geburtsjahr, PLZBereich HAVING COUNT(Ruhepuls) = 1 ORDER BY Geburtsjahr`),
    [[1949, '004'], [1963, '002'], [1963, '006'], [2007, '001']]),
    gleich('A6-V-05 Falle Verlauf: zählt Zeilen statt Personen', zeilen(db, `SELECT Geburtsjahr, PLZBereich FROM ExportVerlauf
      GROUP BY Geburtsjahr, PLZBereich HAVING COUNT(*) = 1 ORDER BY Geburtsjahr`), [[1963, '006'], [2007, '001']]),
    gleich('A6-V-05 Falle nur Geburtsjahr', spalte(db,
      'SELECT Geburtsjahr FROM Export GROUP BY Geburtsjahr HAVING COUNT(*) = 1 ORDER BY Geburtsjahr'), [1949, 1985]),
    gleich('A6-V-06 Kontextkarte 1 (1949, 004): ein Token, vier Zeilen im Verlauf', zeilen(db, `SELECT NutzerToken, COUNT(*)
      FROM ExportVerlauf WHERE Geburtsjahr = 1949 AND PLZBereich = '004' GROUP BY NutzerToken`), [['N-687', 4]]),
    gleich('A6-V-06 Kontextkarte 2 (1990, 002, w): drei Tokens', spalte(db, `SELECT NutzerToken FROM Export
      WHERE Geburtsjahr = 1990 AND PLZBereich = '002' AND Geschlecht = 'w' ORDER BY NutzerToken`), ['N-100', 'N-137', 'N-367']),
    gleich('Geburtsjahre außerhalb 1950–2008: nur 1949 (Kontextkarte)', spalte(db,
      'SELECT DISTINCT Geburtsjahr FROM ExportVerlauf WHERE Geburtsjahr NOT BETWEEN 1950 AND 2008'), [1949])
  ];
}

module.exports = { abnahme };
