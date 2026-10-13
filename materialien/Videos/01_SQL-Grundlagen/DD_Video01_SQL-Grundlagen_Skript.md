# Erklärvideo 1: SQL-Grundlagen: SELECT, WHERE und die Bedingungsfallen

> ERZEUGT aus `video.json` mit `python3 werkzeuge/video_folien.py` – Änderungen in der video.json vornehmen.

*Spalten wählen, Zeilen filtern, sortieren – und die Fallen bei AND/OR und NULL umgehen*

| | |
|---|---|
| **Akte** | Akte 1 · Das Fundbüro |
| **Einsatz** | Akte 1, DS 1–2 · Ermittlungen 1.1 „Der erste Auftrag“ und 1.2 „Das verschwundene Fundstück“ · AB 1.1, AB 1.2 · Hausaufgabe nach DS 1 |
| **Zielgruppe** | Informatik eA und gA (Datenbanken), Akte 1; Wiederholung vor Verhör 1, Klausur und Abitur |
| **Länge** | Ziel 8–10 min · Sprechtext ca. 7:38 min (bei 130 Wörtern/min, inkl. Pausen) |
| **Beispieldaten** | eigene Video-DB `video/schachturnier` (Jugendschach in Weserstedt: Spieler, Verein) – keine Lab-, AB-, Verhör- oder Klausuraufgabe |
| **Folien** | `DD_Video01_SQL-Grundlagen_Folien.pptx` (14 Folien, Kamera-Zone unten rechts frei, Sprechertext in den Notizen) |

## Lernziele

- Eine SQL-Abfrage aus SELECT, FROM, WHERE, ORDER BY und LIMIT aufbauen und die Aufgabe jeder Klausel nennen
- Bedingungen mit Vergleichsoperatoren (=, !=, <, <=, >, >=), AND, OR und Klammern formulieren (P6)
- Muster mit LIKE (% und _) und Bereiche mit BETWEEN (Grenzen eingeschlossen) nutzen
- Fehlende Werte mit IS NULL bzw. IS NOT NULL finden und Texte in Hochkommata schreiben (P5)
- Ergebnisse mehrstufig sortieren (ASC/DESC) und mit LIMIT begrenzen

## Hinweise für die Aufnahme

- Alle Beispiele laufen auf der eigenen Video-DB `video/schachturnier` (seed/datenbanken/video/schachturnier) – nicht auf der Fundbüro-DB des Labs; das Video verrät keine Lab-, AB- oder Verhörlösung.
- Alle Ergebnistabellen auf den Folien sind aus der DB erzeugt und mit werkzeuge/material_sql_pruefen.py geprüft (EH §8, Abimodus streng).
- Geprüfte Werte: Jahrgang >= 2009 → 5 Personen; ohne Klammern 4 Zeilen (Imke Bargmann, Jahrgang 2008, rutscht durch), mit Klammern 3; LIKE '%ke' → Imke, Tomke, Hauke, Levke; BETWEEN 1480 AND 1690 trifft beide Grenzen (4 Zeilen); Wertung IS NULL → Joris, Keno; = NULL → keine Zeile; Top 3: 1830, 1755, 1690.
- Pause-Folie: Im Schnitt den Hinweis „Video anhalten“ einblenden; die Auflösung kommt erst auf der nächsten Folie.
- Kamera unten rechts; auf den SQL-Folien beim Erklären mit dem Mauszeiger die Klausel zeigen, über die gerade gesprochen wird.

## YouTube

**Titel:** SQL-Grundlagen: SELECT, WHERE, AND/OR, LIKE, BETWEEN, IS NULL (Informatik-Abitur Niedersachsen) | Datendetektei #1

**Sichtbarkeit:** zuerst „nicht gelistet“, nach Freigabe öffentlich (Playlist „Datendetektei“).

**Beschreibung:**

```
Wie schreibst du eine SQL-Abfrage so, wie es das Informatik-Abitur in Niedersachsen verlangt? In diesem Video baust du Abfragen aus SELECT, FROM und WHERE, kombinierst Bedingungen mit AND, OR und Klammern, suchst mit LIKE und BETWEEN, findest fehlende Werte mit IS NULL und sortierst mit ORDER BY und LIMIT. Dazu die typischen Fallen: AND bindet stärker als OR, BETWEEN schließt die Grenzen ein, und mit NULL vergleicht man nie mit =.

Teil der Unterrichtsreihe „Datendetektei Weserstedt – Ermitteln mit Datenbanken“ (Informatik eA/gA, Abitur ab 2027).
Selbst ausprobieren: https://datendetektei.frankjuchim.de/gast

Kapitel:
0:00 Einstieg
0:26 Beispieldaten
1:07 Das Abfrage-Gerüst
1:47 AND, OR und Klammern
2:54 LIKE und BETWEEN
4:04 NULL und Texte
4:41 ORDER BY und LIMIT
5:16 Jetzt du
6:23 Fallen
6:55 Merksätze
```

_Zeitmarken aus der Textlänge geschätzt – nach dem Schnitt anpassen._

**Tags:** Informatik Abitur, Niedersachsen, SQL, SELECT, WHERE, AND OR, LIKE, BETWEEN, IS NULL, ORDER BY, Datenbanken, Datendetektei

## Drehbuch

### Folie 1 · 0:00 – SQL-Grundlagen: SELECT, WHERE und die Bedingungsfallen · Kapitel „Einstieg“

*Regie: Kamera unten rechts, Titelfolie im Hintergrund.*

**Sprechertext:**

Willkommen in der Datendetektei! Jede Ermittlung beginnt mit einer Frage an die Datenbank – und die stellst du in SQL. Nach diesem Video kannst du Spalten auswählen, Zeilen gezielt filtern und sortieren. Und du kennst die zwei Fallen, über die im Abitur fast alle einmal stolpern: AND und OR ohne Klammern und der Vergleich mit NULL.

### Folie 2 · 0:26 – Unsere Beispieldaten: ein Schachturnier · Kapitel „Beispieldaten“

**Auf der Folie:**

- `Spieler(SpielerNr, Vorname, Nachname, Jahrgang, Wertung, ↑VereinNr)`
*Tabelle TABELLE SPIELER (VOLLSTÄNDIG): SpielerNr, Vorname, Nachname, Jahrgang, Wertung, VereinNr (10 Zeilen)*

**Sprechertext:**

Unsere Beispieldaten kommen nicht aus dem Fundbüro, sondern von einem Jugend-Schachturnier in Weserstedt. Die Tabelle Spieler hat zehn Zeilen. Jede Person hat eine SpielerNr – das ist der Primärschlüssel, deshalb ist er unterstrichen. Dazu Vorname, Nachname, Jahrgang und eine Wertung, also eine Spielstärke. VereinNr ist ein Fremdschlüssel, erkennbar am Pfeil: Er verweist auf eine zweite Tabelle Verein, die brauchen wir erst im nächsten Video. Achte schon jetzt auf die Einträge NULL: Joris und Keno haben noch keine Wertung, Keno und Levke spielen ohne Verein. NULL heißt: Hier steht kein Wert.

### Folie 3 · 1:07 – Das Abfrage-Gerüst · Kapitel „Das Abfrage-Gerüst“

*Regie: Beim Sprechen die Schritte rechts von oben nach unten zeigen.*

**Auf der Folie:**

*SQL:*

```sql
SELECT Vorname, Nachname, Jahrgang
FROM Spieler
WHERE Jahrgang >= 2009
```
*Ergebnis: 5 Zeile(n) – Vorname, Nachname, Jahrgang*

1. **FROM** – aus welcher Tabelle? Hier: Spieler
2. **WHERE** – jede Zeile prüfen: Jahrgang >= 2009?
3. **SELECT** – nur diese Spalten anzeigen

**Sprechertext:**

Das Grundgerüst jeder Abfrage hat drei Teile. Geschrieben wird SELECT, FROM, WHERE – gedacht wird aber in einer anderen Reihenfolge. Zuerst FROM: Aus welcher Tabelle kommen die Daten? Dann WHERE: Die Datenbank prüft jede einzelne Zeile, ob die Bedingung wahr ist – hier: Jahrgang größer oder gleich 2009. Nur die passenden Zeilen bleiben übrig. Zum Schluss SELECT: Welche Spalten willst du sehen? Ergebnis: fünf Personen. Merke dir: WHERE filtert Zeilen, SELECT wählt Spalten. Und im Abitur-Stil steht jede Klausel in einer eigenen Zeile, Schlüsselwörter groß.

### Folie 4 · 1:47 – AND bindet stärker als OR · Kapitel „AND, OR und Klammern“

**Auf der Folie:**

> Gesucht: Mitglieder von Verein 1 **oder** 2, die 2009 oder später geboren sind.
*✘ OHNE KLAMMERN · FALLE P6:*

```sql
SELECT Vorname, Nachname, Jahrgang
FROM Spieler
WHERE VereinNr = 1 OR VereinNr = 2
  AND Jahrgang >= 2009
```
*Ergebnis: 4 Zeile(n) – Vorname, Nachname, Jahrgang*

- *Was die Datenbank liest:* `VereinNr = 1 OR (VereinNr = 2 AND Jahrgang >= 2009)` · Alle aus Verein 1 kommen durch – auch Imke, Jahrgang **2008**.

**Sprechertext:**

Jetzt wird es knifflig. Gesucht sind Mitglieder von Verein 1 oder 2, die 2009 oder später geboren sind. Die Abfrage links sieht vernünftig aus – aber im Ergebnis steht Imke Bargmann mit Jahrgang 2008. Warum? AND bindet stärker als OR, so wie Punkt- vor Strichrechnung. Die Datenbank liest also: VereinNr gleich 1 – oder: VereinNr gleich 2 und Jahrgang ab 2009. Für Verein 1 wird das Alter gar nicht geprüft. Das ist Falle P6, Bedingungslogik.

### Folie 5 · 2:21 – Mit Klammern stimmt es

**Auf der Folie:**

*✔ MIT KLAMMERN:*

```sql
SELECT Vorname, Nachname, Jahrgang
FROM Spieler
WHERE (VereinNr = 1 OR VereinNr = 2)
  AND Jahrgang >= 2009
```
*Ergebnis: 3 Zeile(n) – Vorname, Nachname, Jahrgang*

- *Regel:* Kommen AND und OR in einer Bedingung vor: **immer Klammern setzen**. · Kontrolle: Passt **jede** Ergebniszeile zur Frage?

**Sprechertext:**

Die Lösung sind Klammern. Erst wird das OR geklammert: Verein 1 oder Verein 2. Dann muss für alle zusätzlich der Jahrgang passen. Jetzt bleiben drei Personen übrig: Mats, Joris und Hauke – und alle drei sind 2009 oder später geboren. Gewöhn dir an: Sobald AND und OR gemeinsam auftauchen, setzt du Klammern. Und prüfe am Ende jede Zeile des Ergebnisses gegen die Frage. Das kostet zehn Sekunden und rettet Punkte.

### Folie 6 · 2:54 – Platzhalter mit LIKE · Kapitel „LIKE und BETWEEN“

**Auf der Folie:**

*SQL:*

```sql
SELECT Vorname, Nachname
FROM Spieler
WHERE Vorname LIKE '%ke'
```
*Ergebnis: 4 Zeile(n) – Vorname, Nachname*

- *Platzhalter:* `%` beliebig viele Zeichen (auch keins) · `_` genau ein Zeichen · `'%ke'` endet auf „ke“, `'B%'` beginnt mit B · ohne `%` sucht LIKE den genauen Text (P6)

**Sprechertext:**

Manchmal kennst du nur einen Teil eines Textes. Dafür gibt es LIKE mit zwei Platzhaltern. Das Prozentzeichen steht für beliebig viele Zeichen – auch für gar keins. Der Unterstrich steht für genau ein Zeichen. Prozent k e findet also alle Vornamen, die auf k e enden: Imke, Hauke, Tomke und Levke. Und B Prozent würde alle Nachnamen finden, die mit B beginnen. Eine typische Falle: LIKE ohne Prozentzeichen sucht genau diesen Text und findet dann oft nichts.

### Folie 7 · 3:29 – Bereiche mit BETWEEN – Grenzen zählen mit

**Auf der Folie:**

*SQL:*

```sql
SELECT Vorname, Nachname, Wertung
FROM Spieler
WHERE Wertung BETWEEN 1480 AND 1690
```
*Ergebnis: 4 Zeile(n) – Vorname, Nachname, Wertung*

- *BETWEEN = >= und <=:* `Wertung >= 1480 AND Wertung <= 1690` · Beide Grenzen gehören dazu: Mats (1480) und Arne (1690) sind dabei. `>` statt `>=` verliert sie (P6).

**Sprechertext:**

Für Bereiche gibt es BETWEEN. Wertung zwischen 1480 und 1690 liefert vier Personen. Schau genau hin: Mats hat genau 1480 und Arne genau 1690 – beide sind dabei. BETWEEN schließt die Grenzen nämlich ein. Es ist dasselbe wie größer gleich 1480 und kleiner gleich 1690. Wer stattdessen größer und kleiner schreibt, verliert genau die Grenzfälle – auch das zählt zu Falle P6. Lies im Abitur deshalb genau: Heißt es „mindestens“, „mehr als“ oder „bis einschließlich“?

### Folie 8 · 4:04 – NULL ist kein Wert – IS NULL · Kapitel „NULL und Texte“

**Auf der Folie:**

*✘ FALLE P5:*

```sql
SELECT Vorname, Nachname
FROM Spieler
WHERE Wertung = NULL
```
*Ergebnis: 0 Zeile(n) – Vorname, Nachname*

*✔ RICHTIG:*

```sql
SELECT Vorname, Nachname
FROM Spieler
WHERE Wertung IS NULL
```
*Ergebnis: 2 Zeile(n) – Vorname, Nachname*

- *Falle P5: NULL und Literale:* NULL = „unbekannt“: `= NULL` ist nie wahr → `IS NULL`, `IS NOT NULL` · Text in Hochkommata: `Nachname = 'Onken'` · Datum als Text: `'2026-03-14'`

**Sprechertext:**

Joris und Keno haben noch keine Wertung. Die naheliegende Abfrage „Wertung gleich NULL“ liefert aber keine einzige Zeile. NULL ist kein Wert, sondern bedeutet „unbekannt“ – und ob etwas Unbekanntes gleich etwas anderem ist, ist wieder unbekannt, also nie wahr. Richtig ist IS NULL, beziehungsweise IS NOT NULL für alle mit Wertung. Das ist Falle P5. Dazu gehören auch Literale: Texte stehen immer in einfachen Hochkommata, etwa Nachname gleich 'Onken', und ein Datum schreibst du als Text im Format Jahr-Monat-Tag.

### Folie 9 · 4:41 – Sortieren und begrenzen: ORDER BY und LIMIT · Kapitel „ORDER BY und LIMIT“

**Auf der Folie:**

*SQL:*

```sql
SELECT Vorname, Nachname, Wertung
FROM Spieler
ORDER BY Wertung DESC
LIMIT 3
```
*Ergebnis: 3 Zeile(n) – Vorname, Nachname, Wertung*

- *Sortieren:* `ASC` aufsteigend (Standard), `DESC` absteigend · mehrstufig: `ORDER BY Nachname, Vorname` · `LIMIT 3` erst **nach** dem Sortieren · NULL steht in SQLite bei ASC oben, bei DESC unten

**Sprechertext:**

Die drei stärksten Spielerinnen und Spieler? Erst sortieren, dann begrenzen. ORDER BY Wertung DESC sortiert absteigend, ASC wäre aufsteigend und ist der Standard. LIMIT 3 schneidet danach die ersten drei Zeilen ab: Tomke, Fenja und Arne. Du kannst auch mehrstufig sortieren, zum Beispiel erst nach Nachname und bei Gleichstand nach Vorname – bei uns wichtig, denn es gibt zwei Bargmanns. Kleiner Hinweis zu NULL: In SQLite stehen fehlende Werte beim aufsteigenden Sortieren oben, beim absteigenden unten.

### Folie 10 · 5:16 – Kurz anhalten: Jetzt du! · Kapitel „Jetzt du“

**Auf der Folie:**

> Gesucht sind alle Spielerinnen und Spieler aus **Verein 3** oder **ohne Verein** – mit Vorname, Nachname und VereinNr, **sortiert nach Nachname**.
> Schreib die Abfrage auf, bevor du weiterschaust.
- `Spieler(SpielerNr, Vorname, Nachname, Jahrgang, Wertung, ↑VereinNr)`
- *Tipp:* „Ohne Verein“ heißt: In VereinNr steht NULL. · Wie viele Zeilen erwartest du?

**Sprechertext:**

Jetzt bist du dran. Gesucht sind alle aus Verein 3 oder ohne Verein, mit Vorname, Nachname und VereinNr, sortiert nach Nachname. Halte das Video an und schreib die Abfrage auf. Überleg dir auch, wie viele Zeilen herauskommen müssten.

*(ca. 20 s Pause zum Mitdenken – im Schnitt den Hinweis „Video anhalten“ einblenden)*

### Folie 11 · 5:53 – Auflösung

**Auf der Folie:**

*SQL:*

```sql
SELECT Vorname, Nachname, VereinNr
FROM Spieler
WHERE VereinNr = 3 OR VereinNr IS NULL
ORDER BY Nachname
```
*Ergebnis: 4 Zeile(n) – Vorname, Nachname, VereinNr*

- *Typische Fehler:* `VereinNr = NULL` → nur Verein 3 (P5) · ORDER BY vergessen oder nach SpielerNr sortiert · nur OR – hier sind keine Klammern nötig

**Sprechertext:**

Hier die Auflösung. In der Bedingung steht VereinNr gleich 3 oder VereinNr IS NULL. Da es nur OR ist, brauchst du keine Klammern. Danach ORDER BY Nachname. Ergebnis: vier Zeilen – Smilla Onken und Tomke Saathoff aus Verein 3, dazu Keno Uphoff und Levke Wilms ohne Verein. Wer VereinNr gleich NULL geschrieben hat, bekommt nur die zwei aus Verein 3 – genau Falle P5.

### Folie 12 · 6:23 – Die Fallen dieses Videos · Kapitel „Fallen“

**Auf der Folie:**

- **P6** Bedingungslogik: AND und OR ohne Klammern; `>` statt `>=`; BETWEEN schließt die Grenzen ein; LIKE ohne `%` oder mit `*`.
- **P5** NULL und Literale: `= NULL` statt `IS NULL`; Text ohne Hochkommata; Datum nicht als `'JJJJ-MM-TT'`.
- **P10** Ergebnis nicht kontrolliert: Im Abitur zählt die richtige Abfrage – lies jede Ergebniszeile gegen die Frage.

**Sprechertext:**

Fassen wir die Fallen zusammen. P6, Bedingungslogik: AND und OR ohne Klammern, größer statt größer gleich, und LIKE ohne Prozentzeichen. P5, NULL und Literale: gleich NULL statt IS NULL, Texte ohne Hochkommata, ein Datum im falschen Format. Und ein allgemeiner Tipp: Kontrolliere dein Ergebnis Zeile für Zeile gegen die Frage. In der Datendetektei hilft dir dabei die Zeitlupe – sie zeigt dir Klausel für Klausel, welche Zeilen übrig bleiben.

### Folie 13 · 6:55 – Das nimmst du mit · Kapitel „Merksätze“

**Auf der Folie:**

- Gedacht wird FROM → WHERE → SELECT → ORDER BY → LIMIT.
- WHERE filtert Zeilen, SELECT wählt Spalten.
- AND bindet stärker als OR – bei Mischung immer Klammern.
- BETWEEN schließt beide Grenzen ein; LIKE mit `%` und `_`.
- Fehlende Werte nur mit `IS NULL` / `IS NOT NULL`; Texte in `'…'`.

**Sprechertext:**

Das nimmst du mit: Gedacht wird FROM, WHERE, SELECT, dann sortieren und begrenzen. WHERE filtert Zeilen, SELECT wählt Spalten. AND bindet stärker als OR, also bei Mischung immer Klammern. BETWEEN schließt beide Grenzen ein, LIKE arbeitet mit Prozent und Unterstrich. Und fehlende Werte findest du nur mit IS NULL.

### Folie 14 · 7:17 – Weiter im Lab

**Auf der Folie:**

- Ermittlung 1.1 „Der erste Auftrag“ · A1-E1-01 … 08
- Ermittlung 1.2 „Das verschwundene Fundstück“ · A1-E2-01 … 08
- AB 1.1 „Der erste Auftrag“ und AB 1.2 „Das verschwundene Fundstück“
- Warm-up-Karten Akte 1 im Lab
- Nächstes Video: Video 2 – Verbund ohne JOIN: Wie `FROM a, b WHERE` funktioniert

**Sprechertext:**

Und jetzt ab ins Lab! In den Ermittlungen 1.1 und 1.2 im Fundbüro wartet ein echter Fall auf dich – mit Konsole und Zeitlupe. Im nächsten Video verbinden wir zwei und drei Tabellen miteinander – ganz ohne JOIN, so wie im Abitur. Bis dann!
