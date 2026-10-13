'use strict';
// Prüfungs-Kontext „Kostümverleih der Theater-AG“ (Nachschreibklausur eA: A + B, gA: A + B-gA; Akte 7): vollständig
// kuratiert, kein Generator (basis.sql = schema.sql + pflicht.sql). abnahme() = Tabelle „Abnahme-Prüfungen“ aus
// seed/datenbanken/pruefung/kostuemverleih/LIESMICH.md (Pflicht-Randfälle aus VERHOER_KONTEXTE.md „Nachschreibklausur ·
// Kostümverleih der Theater-AG“, Blueprints NK-A-a … h).

const { gleich, wert, spalte, zeilen, zeilenzahlen } = require('./abnahme_hilfen');

const VIER = `Stueck.StueckNr = Rolle.StueckNr AND Rolle.RollenNr = Ausleihe.RollenNr
  AND Ausleihe.KostuemNr = Kostuem.KostuemNr`;

function abnahme(db) {
  const jeMitglied = spalte(db, 'SELECT COUNT(*) FROM Ausleihe GROUP BY MitgliedNr ORDER BY COUNT(*) DESC');
  return [
    ...zeilenzahlen(db, { Mitglied: 26, Kostuem: 40, Stueck: 4, Rolle: 20, Ausleihe: 77, KostuemRolle: 10,
      KostuemlisteRoh: 6 }),
    gleich('Zeitraum der Ausleihen 2026-09 … 2027-03, Bis nie vor Von', [
      wert(db, 'SELECT MIN(Von) FROM Ausleihe'), wert(db, 'SELECT MAX(Von) FROM Ausleihe'),
      wert(db, 'SELECT COUNT(*) FROM Ausleihe WHERE Bis < Von')
    ], ['2026-09-07', '2027-03-15', 0]),
    gleich('kein Kostüm gleichzeitig zweimal verliehen', wert(db, `SELECT COUNT(*) FROM Ausleihe a, Ausleihe b
      WHERE a.KostuemNr = b.KostuemNr AND a.AusleihNr < b.AusleihNr
      AND a.Von <= COALESCE(b.Bis, '9999-12-31') AND b.Von <= COALESCE(a.Bis, '9999-12-31')`), 0),
    gleich('AusleihNr chronologisch', wert(db, `SELECT COUNT(*) FROM Ausleihe a, Ausleihe b
      WHERE a.AusleihNr < b.AusleihNr AND a.Von > b.Von`), 0),
    gleich('NK-A-d: 6 Ausleihen mit Bis NULL', spalte(db,
      'SELECT KostuemNr FROM Ausleihe WHERE Bis IS NULL ORDER BY KostuemNr'), [1, 2, 6, 14, 32, 34]),
    gleich('NK-A-b: wiederholtes Ausleihen nur Kostüm 15 / Mitglied 6', zeilen(db, `SELECT KostuemNr, MitgliedNr, COUNT(*)
      FROM Ausleihe GROUP BY KostuemNr, MitgliedNr HAVING COUNT(*) > 1`), [[15, 6, 2]]),
    gleich('NK-A-e: Barock-Ausleihen in zwei Stücken (11 Zeilen), Marquis ohne Ausleihe', [
      wert(db, `SELECT COUNT(*) FROM Stueck, Rolle, Ausleihe, Kostuem WHERE ${VIER} AND Kostuem.Epoche = 'Barock'`),
      spalte(db, `SELECT DISTINCT Stueck.StueckNr FROM Stueck, Rolle, Ausleihe, Kostuem WHERE ${VIER}
        AND Kostuem.Epoche = 'Barock' ORDER BY Stueck.StueckNr`),
      wert(db, 'SELECT COUNT(*) FROM Ausleihe WHERE RollenNr = 2')
    ], [11, [1, 3], 0]),
    gleich('NK-A-f: Ausleihen je Mitglied 6, 5, 4, dann 3 (kein Gleichstand an Platz 3/4)', jeMitglied.slice(0, 4), [6, 5, 4, 3]),
    gleich('NK-A-f: Top 3 mit mehr als 3 Ausleihen', spalte(db, `SELECT Mitglied.MitgliedNr FROM Mitglied, Ausleihe
      WHERE Mitglied.MitgliedNr = Ausleihe.MitgliedNr GROUP BY Mitglied.MitgliedNr, Mitglied.Vorname, Mitglied.Nachname
      HAVING COUNT(*) > 3 ORDER BY COUNT(*) DESC LIMIT 3`), [6, 13, 1]),
    gleich('NK-A-f (P3): gleichnamig Lasse Kück (9, 20) je 3 – nach Namen gruppiert 6', [
      spalte(db, "SELECT COUNT(*) FROM Mitglied, Ausleihe WHERE Mitglied.MitgliedNr = Ausleihe.MitgliedNr AND Vorname = 'Lasse' AND Nachname = 'Kück' GROUP BY Mitglied.MitgliedNr ORDER BY Mitglied.MitgliedNr"),
      wert(db, "SELECT COUNT(*) FROM Mitglied, Ausleihe WHERE Mitglied.MitgliedNr = Ausleihe.MitgliedNr AND Vorname = 'Lasse' AND Nachname = 'Kück'")
    ], [[3, 3], 6]),
    gleich('NK-A-g: Paten in 12a, 12b, 11c, 11a; Self-Join mit 12% liefert 10 Mitglieder', [
      spalte(db, 'SELECT DISTINCT p.Klasse FROM Mitglied m, Mitglied p WHERE m.PateNr = p.MitgliedNr ORDER BY p.Klasse'),
      wert(db, "SELECT COUNT(*) FROM Mitglied m, Mitglied p WHERE m.PateNr = p.MitgliedNr AND p.Klasse LIKE '12%'"),
      wert(db, 'SELECT COUNT(*) FROM Mitglied WHERE PateNr IS NULL')
    ], [['11a', '11c', '12a', '12b'], 10, 9]),
    gleich('NK-A-h: nie ausgeliehen 5, 18, 37, 38, 40', spalte(db,
      'SELECT KostuemNr FROM Kostuem WHERE KostuemNr NOT IN (SELECT KostuemNr FROM Ausleihe) ORDER BY KostuemNr'),
    [5, 18, 37, 38, 40]),
    gleich('NK-A-c: Premiere in KostuemRolle einmal abweichend, Königsmantel nur einmal', [
      spalte(db, "SELECT DISTINCT Premiere FROM KostuemRolle WHERE Stueck = 'Der Hof des Mondkönigs' ORDER BY Premiere"),
      wert(db, 'SELECT COUNT(*) FROM KostuemRolle WHERE KostuemNr = 11'),
      wert(db, 'SELECT COUNT(*) FROM KostuemRolle WHERE KostuemNr = 17')
    ], [['2027-03-12', '2027-03-19'], 1, 2]),
    gleich('KostuemRolle passt sonst zu Kostuem, Rolle, Stueck', wert(db, `SELECT COUNT(*) FROM KostuemRolle kr, Kostuem k,
      Rolle r, Stueck s WHERE kr.KostuemNr = k.KostuemNr AND kr.RollenNr = r.RollenNr AND r.StueckNr = s.StueckNr
      AND kr.Bezeichnung = k.Bezeichnung AND kr.Rolle = r.Name AND kr.Stueck = s.Titel AND kr.Premiere = s.Premiere`), 9),
    gleich('KostuemlisteRoh: mehrwertige Zellen, Telefon von Heiko Wendelken einmal abweichend', [
      wert(db, "SELECT COUNT(*) FROM KostuemlisteRoh WHERE Rollen LIKE '%,%'"),
      wert(db, "SELECT COUNT(*) FROM KostuemlisteRoh WHERE Verantwortliche = 'Heiko Wendelken' AND Telefon != '0000-5521'")
    ], [2, 1])
  ];
}

module.exports = { abnahme };
