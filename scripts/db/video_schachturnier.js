'use strict';
// Video-Datenbank „Schachturnier“ (Erklärvideos 1, 2, 7; seed/datenbanken/video/schachturnier/LIESMICH.md):
// vollständig kuratiert – die Daten stehen in pflicht.sql, generiere() fügt nichts hinzu. Gebaut und geprüft mit
// npm run db:video bzw. npm run db:video:pruefen (nicht Teil von npm run db: zur Laufzeit nie geladen, nie öffentlich).
// abnahme() sichert die Werte, die Folien und Drehbücher der Videos verwenden.

const { gleich, wert, spalte, zeilen, zeilenzahlen } = require('./abnahme_hilfen');

/** Kuratiert: alle Daten stehen in pflicht.sql. */
function generiere() {}

function abnahme(db) {
  return [
    ...zeilenzahlen(db, { Verein: 3, Spieler: 10, Turnier: 2, Partie: 18 }),
    gleich('Video 1: Jahrgang ab 2009 → 5 Personen', wert(db, 'SELECT COUNT(*) FROM Spieler WHERE Jahrgang >= 2009'), 5),
    gleich('Video 1 (P6): ohne Klammern 4, mit Klammern 3 Zeilen', [
      wert(db, 'SELECT COUNT(*) FROM Spieler WHERE VereinNr = 1 OR VereinNr = 2 AND Jahrgang >= 2009'),
      wert(db, 'SELECT COUNT(*) FROM Spieler WHERE (VereinNr = 1 OR VereinNr = 2) AND Jahrgang >= 2009')
    ], [4, 3]),
    gleich('Video 1: BETWEEN trifft beide Grenzen (1480 und 1690)', spalte(db,
      'SELECT Wertung FROM Spieler WHERE Wertung BETWEEN 1480 AND 1690 ORDER BY Wertung'), [1480, 1545, 1620, 1690]),
    gleich('Video 1 (P5): zwei ohne Wertung, „= NULL“ findet keine', [
      wert(db, 'SELECT COUNT(*) FROM Spieler WHERE Wertung IS NULL'),
      wert(db, 'SELECT COUNT(*) FROM Spieler WHERE Wertung = NULL')
    ], [2, 0]),
    gleich('Video 1: Top 3 nach Wertung ohne Gleichstand', spalte(db,
      'SELECT SpielerNr FROM Spieler ORDER BY Wertung DESC LIMIT 4'), [7, 3, 10, 1]),
    gleich('Video 1: LIKE %ke → Imke, Tomke, Hauke, Levke', spalte(db,
      "SELECT Vorname FROM Spieler WHERE Vorname LIKE '%ke' ORDER BY SpielerNr"), ['Imke', 'Tomke', 'Hauke', 'Levke']),
    gleich('Video 2: Kreuzprodukt Spieler × Verein = 30, Verbund = 8 (zwei vereinslos)', [
      wert(db, 'SELECT COUNT(*) FROM Spieler, Verein'),
      wert(db, 'SELECT COUNT(*) FROM Spieler, Verein WHERE Spieler.VereinNr = Verein.VereinNr')
    ], [30, 8]),
    gleich('Video 2: Gleichnamige Bargmann (1, 10) in verschiedenen Vereinen', zeilen(db,
      "SELECT SpielerNr, VereinNr FROM Spieler WHERE Nachname = 'Bargmann' ORDER BY SpielerNr"), [[1, 1], [10, 2]]),
    gleich('Video 2: Pokal Runde 1 mit beiden Namen', zeilen(db, `SELECT w.Vorname, s.Vorname, Partie.Ergebnis
      FROM Partie, Spieler w, Spieler s WHERE Partie.WeissNr = w.SpielerNr AND Partie.SchwarzNr = s.SpielerNr
      AND Partie.TurnierNr = 2 AND Partie.Runde = 1 ORDER BY Partie.PartieNr`),
    [['Fenja', 'Keno', '1-0'], ['Levke', 'Tomke', '0-1'], ['Arne', 'Imke', 'remis']]),
    gleich('Video 2/7: genau eine Partie ohne Ergebnis', spalte(db, 'SELECT PartieNr FROM Partie WHERE Ergebnis IS NULL'), [18]),
    gleich('Video 7: Partien je Turnier 12/6', zeilen(db,
      'SELECT TurnierNr, COUNT(*) FROM Partie GROUP BY TurnierNr ORDER BY TurnierNr'), [[1, 12], [2, 6]]),
    gleich('Video 7: COUNT(*) 18 ↔ COUNT(Ergebnis) 17', [
      wert(db, 'SELECT COUNT(*) FROM Partie'), wert(db, 'SELECT COUNT(Ergebnis) FROM Partie')
    ], [18, 17])
  ];
}

module.exports = { generiere, abnahme };
