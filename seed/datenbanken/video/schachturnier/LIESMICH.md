# Schachturnier – Beispiel-Datenbank der Erklärvideos

## Zweck

Eigene Beispieldaten für die Erklärvideos **1** (SELECT/WHERE), **2** (Verbund) und **7** (Abi-Check), Spec §13:
Beispiele in Videos sind eigene Daten – **nie** Lab-, AB-, Verhör- oder Klausuraufgaben (CLAUDE.md, Spec 6.4). Die
Folien (`materialien/Videos/NN_…/…_Folien.pptx`) prüfen ihre SQL-Felder mit `-- DB: video/schachturnier` bzw.
`db=video/schachturnier` über `werkzeuge/material_sql_pruefen.py` gegen diese Datenbank.

Zur Laufzeit **nicht geladen** und nie öffentlich (nicht in `AKTEN_DATENBANKEN`/`VERHOER_DATENBANKEN`); gebaut mit
`npm run db:video`, geprüft mit `npm run db:video:pruefen` und `test/db_video.test.js`.

Story (nur im Video): Jugendschach in Weserstedt – drei Vereine, zehn Spielerinnen und Spieler, zwei Turniere.

**Datenquelle:** vollständig kuratiert (kein Generator): `basis.sql` = `schema.sql` + `pflicht.sql`. Namen aus
`seed/datenbanken/namen.json`, frei erfunden.

## Relationenschema (Kurzschreibweise)

- Verein(<u>VereinNr</u>, Name, Ort)
- Spieler(<u>SpielerNr</u>, Vorname, Nachname, Jahrgang, Wertung, ↑VereinNr)
- Turnier(<u>TurnierNr</u>, Bezeichnung, Datum, Ort)
- Partie(<u>PartieNr</u>, ↑TurnierNr, Runde, ↑WeissNr, ↑SchwarzNr, Ergebnis)

`WeissNr` und `SchwarzNr` verweisen **beide** auf `Spieler.SpielerNr` (zwei Fremdschlüssel auf dieselbe Tabelle,
Video 2). `Wertung` = Wertungszahl, `NULL` = noch keine; `VereinNr` `NULL` = vereinslos; `Ergebnis` ∈ {`'1-0'`,
`'0-1'`, `'remis'`}, `NULL` = Partie noch nicht beendet.

## Daten im Überblick

| SpielerNr | Vorname | Nachname | Jahrgang | Wertung | VereinNr |
|---|---|---|---|---|---|
| 1 | Imke | Bargmann | 2008 | 1620 | 1 |
| 2 | Mats | Okafor | 2009 | 1480 | 1 |
| 3 | Fenja | Harjes | 2007 | 1755 | 2 |
| 4 | Joris | Kampen | 2010 | NULL | 2 |
| 5 | Smilla | Onken | 2008 | 1390 | 3 |
| 6 | Keno | Uphoff | 2009 | NULL | NULL |
| 7 | Tomke | Saathoff | 2007 | 1830 | 3 |
| 8 | Hauke | Demir | 2010 | 1210 | 1 |
| 9 | Levke | Wilms | 2009 | 1545 | NULL |
| 10 | Arne | Bargmann | 2006 | 1690 | 2 |

Vereine: 1 SK Weserspringer (Weserstedt), 2 Turm Lindenhof (Weserstedt), 3 SV Rochade Moorbach (Moorbach).
Turniere: 1 Frühjahrsblitz (2026-03-14, 12 Partien in 3 Runden), 2 Weserbrücken-Pokal (2026-05-09, 6 Partien in 2
Runden, Partie 18 noch ohne Ergebnis).

## Eingebaute Effekte (für die Videos)

| Effekt | Wo |
|---|---|
| P6 AND vor OR | `VereinNr = 1 OR VereinNr = 2 AND Jahrgang >= 2009` → 4 statt 3 Zeilen |
| P6 BETWEEN inklusive | `Wertung BETWEEN 1480 AND 1690` trifft beide Grenzen |
| P5 NULL | zwei Spieler ohne Wertung; `= NULL` findet keinen |
| P2 Kreuzprodukt | `FROM Spieler, Verein` ohne Verbund → 30 Zeilen |
| Verbund verliert NULL-FK | zwei vereinslose Spieler fehlen im Verbund (8 statt 10) |
| P7 zwei FKs, gleichnamige Personen | `WeissNr`/`SchwarzNr` → zwei Aliase; Imke und Arne Bargmann |
| P4 COUNT(*) ↔ COUNT(Spalte) | 18 Partien, 17 mit Ergebnis |

## Beispielabfragen

**1. Wer ist 2009 oder später geboren?** – 5 Zeilen.

```sql
SELECT Vorname, Nachname, Jahrgang
FROM Spieler
WHERE Jahrgang >= 2009
```

**2. Mitglieder von Verein 1 oder 2, die 2009 oder später geboren sind** (Klammern!) – Mats, Joris, Hauke.

```sql
SELECT Vorname, Nachname
FROM Spieler
WHERE (VereinNr = 1 OR VereinNr = 2)
  AND Jahrgang >= 2009
```

**3. Die drei höchsten Wertungen** – Tomke 1830, Fenja 1755, Arne 1690.

```sql
SELECT Vorname, Nachname, Wertung
FROM Spieler
ORDER BY Wertung DESC
LIMIT 3
```

**4. Wer hat noch keine Wertung?** – Joris, Keno.

```sql
SELECT Vorname, Nachname
FROM Spieler
WHERE Wertung IS NULL
```

**5. Spieler mit ihrem Verein (Verbund)** – 8 Zeilen, die Vereinslosen fehlen.

```sql
SELECT Spieler.Vorname, Spieler.Nachname, Verein.Name
FROM Spieler, Verein
WHERE Spieler.VereinNr = Verein.VereinNr
```

**6. Partien des Pokals mit Turnierbezeichnung (drei Tabellen)** – 6 Zeilen.

```sql
SELECT Turnier.Bezeichnung, Partie.Runde, Spieler.Nachname AS Weiss
FROM Turnier, Partie, Spieler
WHERE Turnier.TurnierNr = Partie.TurnierNr
  AND Partie.WeissNr = Spieler.SpielerNr
  AND Turnier.TurnierNr = 2
```

**7. Runde 1 des Pokals mit beiden Namen (zwei Fremdschlüssel auf Spieler)** – 3 Zeilen.

```sql
SELECT w.Vorname AS Weiss, s.Vorname AS Schwarz, Partie.Ergebnis
FROM Partie, Spieler w, Spieler s
WHERE Partie.WeissNr = w.SpielerNr
  AND Partie.SchwarzNr = s.SpielerNr
  AND Partie.TurnierNr = 2
  AND Partie.Runde = 1
```

**8. Partien je Turnier, mit und ohne Ergebnis** – 12/12 und 6/5.

```sql
SELECT Turnier.TurnierNr, Turnier.Bezeichnung, COUNT(*) AS Partien, COUNT(Partie.Ergebnis) AS Beendet
FROM Turnier, Partie
WHERE Turnier.TurnierNr = Partie.TurnierNr
GROUP BY Turnier.TurnierNr, Turnier.Bezeichnung
```

**Fehlabfrage (P6): AND bindet stärker als OR** – liefert zusätzlich Imke (Jahrgang 2008). (Als `text`-Block, damit
die LIESMICH-Tests der Übungs-DBs sie nicht als Fehlabfrage zählen; geprüft in `scripts/db/video_schachturnier.js`.)

```text
SELECT Vorname, Nachname
FROM Spieler
WHERE VereinNr = 1 OR VereinNr = 2
  AND Jahrgang >= 2009
```

## Abnahme-Prüfungen

`scripts/db/video_schachturnier.js` (`abnahme`): Zeilenzahlen (3/10/2/18) und jeder Wert, den die Videos zeigen
(5 Personen ab 2009; 4 ↔ 3 Zeilen bei P6; BETWEEN-Grenzen; 2 ohne Wertung, `= NULL` → 0; Top 3 ohne Gleichstand;
LIKE `'%ke'`; 30 ↔ 8 Zeilen beim Verbund; Gleichnamige Bargmann; Pokal Runde 1; eine Partie ohne Ergebnis; 12/6
Partien; COUNT 18 ↔ 17).

## Randfall-Varianten

entfällt – die Videos zeigen feste Ergebnisse auf dieser Datenbank (keine Prüfung von Schülerabfragen).
