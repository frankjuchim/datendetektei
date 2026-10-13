'use strict';
// Verhör-Kontext V4 „Musikschule“: vollständig kuratiert, kein Generator (basis.sql = schema.sql + pflicht.sql).
// abnahme() = Tabelle „Abnahme-Prüfungen“ aus seed/datenbanken/verhoer/musikschule/LIESMICH.md
// (Pflicht-Randfälle aus VERHOER_KONTEXTE.md V4 und dem Verhör-Blueprint A4-V-01 … 12).

const { gleich, wert, spalte, zeilen, zeilenzahlen } = require('./abnahme_hilfen');

function abnahme(db) {
  return [
    ...zeilenzahlen(db, { UnterrichtRoh: 30, LehrkraftRaum: 6, Raum: 5 }),
    gleich('Redundanz: Zeilen von Jana Albers (A4-V-01, -03)', spalte(db,
      "SELECT rowid FROM UnterrichtRoh WHERE Lehrkraft LIKE '%Jana Albers%' ORDER BY rowid"), [1, 3, 10, 15, 18, 23]),
    gleich('Redundanz: Telefon von Jana Albers überall gleich', spalte(db,
      "SELECT DISTINCT LehrkraftTelefon FROM UnterrichtRoh WHERE Lehrkraft LIKE '%Jana Albers%' ORDER BY 1"),
    ['0000-41207', '0000-41207, 0000-41207']),
    gleich('Tarif und Monatsgebühr (Jugend einmal 38.00, A4-V-07)', zeilen(db,
      'SELECT Tarif, Monatsgebuehr, COUNT(*) FROM UnterrichtRoh GROUP BY Tarif, Monatsgebuehr ORDER BY Tarif, Monatsgebuehr'),
    [['Erwachsen', 45, 7], ['Geschwister', 28, 3], ['Jugend', 36, 13], ['Jugend', 38, 1], ['Kind', 32, 6]]),
    gleich('Änderungsanomalie in Zeile 17 (Levke Bohlken)', zeilen(db,
      "SELECT rowid, Schueler FROM UnterrichtRoh WHERE Tarif = 'Jugend' AND Monatsgebuehr != 36.00"), [[17, 'Levke Bohlken']]),
    gleich('Einfügeanomalie: keine Harfe (A4-V-06)', wert(db,
      "SELECT COUNT(*) FROM UnterrichtRoh WHERE Instrumente LIKE '%Harfe%'"), 0),
    gleich('Löschanomalie: einzige Cello-Zeile = einzige Zeile von Swantje Uphoff (A4-V-02)', [
      spalte(db, "SELECT rowid FROM UnterrichtRoh WHERE Instrumente LIKE '%Cello%'"),
      spalte(db, "SELECT rowid FROM UnterrichtRoh WHERE Lehrkraft LIKE '%Swantje Uphoff%' OR LehrkraftTelefon LIKE '%0000-19736%'")
    ], [[8], [8]]),
    gleich('nicht-atomar: Zeilen 10, 16, 22 (A4-V-04)', spalte(db,
      "SELECT rowid FROM UnterrichtRoh WHERE Instrumente LIKE '%,%' AND Lehrkraft LIKE '%,%' AND LehrkraftTelefon LIKE '%,%' ORDER BY rowid"),
    [10, 16, 22]),
    gleich('Ausschnitt-Falle: Zeilen 1–12 ohne doppelten Namen (A4-V-05)', wert(db,
      'SELECT COUNT(DISTINCT Schueler) FROM UnterrichtRoh WHERE rowid <= 12'), 12),
    gleich('Ausschnitt-Falle: zwei „Mira Lindemann“ (Zeile 4: 2011, Zeile 20: 2007)', zeilen(db,
      "SELECT rowid, Geburtsjahr FROM UnterrichtRoh WHERE Schueler = 'Mira Lindemann' ORDER BY rowid"), [[4, 2011], [20, 2007]]),
    gleich('Schueler mehrfach (Schueler ist kein Schlüssel)', zeilen(db,
      'SELECT Schueler, COUNT(*) FROM UnterrichtRoh GROUP BY Schueler HAVING COUNT(*) > 1 ORDER BY Schueler'),
    [['Greta Saathoff', 2], ['Jarne Pundt', 2], ['Lotta Renken', 2], ['Mira Lindemann', 2], ['Pia Kück', 2], ['Sönke Engelken', 2]]),
    gleich('Mehrfachvorkommen (Schueler, Instrumente): Lotta Renken, Klavier bei zwei Lehrkräften (A4-V-10)', zeilen(db,
      `SELECT Schueler, Instrumente, COUNT(*), COUNT(DISTINCT Lehrkraft) FROM UnterrichtRoh
       GROUP BY Schueler, Instrumente HAVING COUNT(*) > 1`), [['Lotta Renken', 'Klavier', 2, 2]]),
    gleich('Instrument ↛ Lehrkraft: Klavier bei zwei Lehrkräften', spalte(db,
      "SELECT DISTINCT Lehrkraft FROM UnterrichtRoh WHERE Instrumente = 'Klavier' ORDER BY Lehrkraft"), ['Jana Albers', 'Okke Tebbe']),
    gleich('Lehrkraft → Telefon, Raum gilt in den atomaren Zeilen', wert(db,
      `SELECT COUNT(*) FROM UnterrichtRoh a, UnterrichtRoh b WHERE a.Lehrkraft = b.Lehrkraft
       AND (a.LehrkraftTelefon != b.LehrkraftTelefon OR a.Raum != b.Raum)`), 0),
    gleich('Rohliste passt zu LehrkraftRaum', wert(db,
      `SELECT COUNT(*) FROM UnterrichtRoh WHERE Lehrkraft NOT LIKE '%,%' AND NOT EXISTS (SELECT 1 FROM LehrkraftRaum l
       WHERE l.Name = UnterrichtRoh.Lehrkraft AND l.Telefon = UnterrichtRoh.LehrkraftTelefon AND l.Raum = UnterrichtRoh.Raum)`), 0),
    gleich('Zusammengelegt: zwei Lehrkräfte im Bandraum, Etage doppelt (A4-V-08)', zeilen(db,
      'SELECT Raum, Etage, COUNT(*) FROM LehrkraftRaum GROUP BY Raum, Etage HAVING COUNT(*) > 1'), [['Bandraum', 'EG', 2]]),
    gleich('LehrkraftRaum stimmt mit Raum überein', wert(db, `SELECT COUNT(*) FROM LehrkraftRaum
      WHERE NOT EXISTS (SELECT 1 FROM Raum WHERE Raum.Raum = LehrkraftRaum.Raum AND Raum.Etage = LehrkraftRaum.Etage)`), 0),
    gleich('Raum: 5 Räume auf 3 Etagen (A4-V-09)', zeilen(db, 'SELECT COUNT(*), COUNT(DISTINCT Etage) FROM Raum'), [[5, 3]]),
    gleich('keine NULL in der Rohliste', wert(db, `SELECT COUNT(*) FROM UnterrichtRoh WHERE Schueler IS NULL
      OR Geburtsjahr IS NULL OR Instrumente IS NULL OR Lehrkraft IS NULL OR LehrkraftTelefon IS NULL OR Raum IS NULL
      OR Tarif IS NULL OR Monatsgebuehr IS NULL`), 0)
  ];
}

module.exports = { abnahme };
