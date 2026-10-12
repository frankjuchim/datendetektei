'use strict';
// TuS (Akte 4): vollständig kuratiert, kein Generator (basis.sql = schema.sql + pflicht.sql).
// abnahme() = Tabelle „Abnahme-Prüfungen“ aus seed/datenbanken/tus/LIESMICH.md, ergänzt um Kennzahlen aus
// „Daten im Überblick“. Die Zeile „VereinExport (DB Datenspuren)“ gehört zur Abnahme von Datenspuren.

const { gleich, wert, spalte, zeilen, zeilenzahlen } = require('./abnahme_hilfen');

// Schreibvarianten der Rohliste (A4), die bei der Zuordnung normalisiert → Rohliste toleriert werden
const SCHREIBVARIANTEN = new Map([['Tischtenis', 'Tischtennis'], ['Fussball', 'Fußball']]);

/** Mitgliedschaften (normalisiert) ohne Entsprechung in der Rohliste (Name, Geburtsjahr, Abteilung). */
function mitgliedschaftenOhneRohzeile(db) {
  const roh = db.prepare('SELECT Mitglied, Geburtsjahr, Abteilungen FROM MitgliederlisteRoh').all();
  const normalisiert = db.prepare(`
    SELECT Mitglied.Vorname, Mitglied.Nachname, Mitglied.Geburtsjahr, Abteilung.Name AS Abteilung
    FROM Mitglied, Mitgliedschaft, Abteilung
    WHERE Mitglied.MitgliedNr = Mitgliedschaft.MitgliedNr
      AND Mitgliedschaft.AbteilungNr = Abteilung.AbteilungNr
    ORDER BY Mitglied.MitgliedNr, Abteilung.AbteilungNr`).all();
  const fehlend = [];
  for (const m of normalisiert) {
    const name = `${m.Vorname} ${m.Nachname}`;
    const treffer = roh.some((r) => r.Mitglied === name && r.Geburtsjahr === m.Geburtsjahr && r.Abteilungen !== null &&
      r.Abteilungen.split(',').map((a) => a.trim()).map((a) => SCHREIBVARIANTEN.get(a) || a).includes(m.Abteilung));
    if (!treffer) fehlend.push(`${name} (${m.Abteilung})`);
  }
  return fehlend;
}

function abnahme(db) {
  return [
    ...zeilenzahlen(db, {
      MitgliederlisteRoh: 62, Mitglied: 51, Mitgliedschaft: 63, Abteilung: 7, Trainer: 6, Halle: 5, Beitragsgruppe: 5
    }),
    gleich('Falsche Erwachsenenbeiträge (Rohliste)',
      wert(db, "SELECT COUNT(*) FROM MitgliederlisteRoh WHERE Beitragsgruppe = 'Erwachsene' AND Monatsbeitrag != 14.00"), 4),
    gleich('Nicht-atomare Zeilen (Rohliste)',
      wert(db, "SELECT COUNT(*) FROM MitgliederlisteRoh WHERE Abteilungen LIKE '%,%'"), 3),
    gleich('Jahrgang 1988 in der Rohliste',
      [...new Set(spalte(db, 'SELECT Mitglied FROM MitgliederlisteRoh WHERE Geburtsjahr = 1988'))].sort(),
      ['Merle Falkenrath', 'Ole Brakhage']),
    gleich('Beispiel 8: Jahrgang 1988 im Tischtennis', spalte(db, `
      SELECT Mitglied.Vorname || ' ' || Mitglied.Nachname
      FROM Mitglied, Mitgliedschaft, Abteilung
      WHERE Mitglied.MitgliedNr = Mitgliedschaft.MitgliedNr
        AND Mitgliedschaft.AbteilungNr = Abteilung.AbteilungNr
        AND Abteilung.Name = 'Tischtennis'
        AND Mitglied.Geburtsjahr = 1988`), ['Merle Falkenrath']),
    gleich('Kein Mitglied Tamara Leversen',
      wert(db, "SELECT COUNT(*) FROM MitgliederlisteRoh WHERE Mitglied = 'Tamara Leversen'") +
      wert(db, "SELECT COUNT(*) FROM Mitglied WHERE Vorname = 'Tamara' AND Nachname = 'Leversen'"), 0),
    gleich('Jede Mitgliedschaft hat eine Rohzeile (bis auf Schreibvarianten A4)', mitgliedschaftenOhneRohzeile(db), []),
    // Kennzahlen aus „Daten im Überblick“
    gleich('Mitglieder je Abteilung (Gleichstand auf Rang 1, Boule leer)', zeilen(db, `
      SELECT Abteilung.Name, COUNT(Mitgliedschaft.MitgliedNr)
      FROM Abteilung LEFT JOIN Mitgliedschaft ON Abteilung.AbteilungNr = Mitgliedschaft.AbteilungNr
      GROUP BY Abteilung.AbteilungNr, Abteilung.Name
      ORDER BY Abteilung.AbteilungNr`),
    [['Fußball', 14], ['Tischtennis', 14], ['Tennis', 10], ['Judo', 1], ['Turnen', 13], ['Handball', 11], ['Boule', 0]]),
    gleich('Nora Falter: Mitglied 42, Geburtsjahr NULL, Erwachsene', zeilen(db,
      'SELECT MitgliedNr, Geburtsjahr, Beitragsgruppe FROM Mitglied WHERE Vorname = ? AND Nachname = ?', 'Nora', 'Falter'),
    [[42, null, 'Erwachsene']]),
    gleich('Monatliche Beitragseinnahmen (Beispiel 6)', wert(db, `
      SELECT SUM(Beitragsgruppe.Monatsbeitrag)
      FROM Mitglied, Beitragsgruppe
      WHERE Mitglied.Beitragsgruppe = Beitragsgruppe.Gruppe`), 548),
    gleich('Verschiedene Beiträge je Gruppe in der Rohliste (Beispiel 1)',
      wert(db, 'SELECT COUNT(*) FROM (SELECT DISTINCT Beitragsgruppe, Monatsbeitrag FROM MitgliederlisteRoh)'), 7)
  ];
}

module.exports = { abnahme };
