# Erklärvideo 3: GROUP BY und HAVING – so wie im Abitur

> ERZEUGT aus `video.json` mit `python3 werkzeuge/video_folien.py` – Änderungen in der video.json vornehmen.

*Auswertungsreihenfolge, GROUP-BY-Regel, WHERE gegen HAVING und COUNT gegen SUM*

| | |
|---|---|
| **Akte** | Akte 3 · Die Stadtfest-Kasse |
| **Einsatz** | Akte 3, DS 5–6 · Ermittlungen 3.1 „Kassensturz“ (Sortierfächer) und 3.2 „Die Statistik lügt nicht“ (Zeitlupe) · AB 3.1, AB 3.2 · vor Verhör 3 |
| **Zielgruppe** | Informatik eA und gA (Datenbanken), Akte 3; Wiederholung vor Verhör 3, Klausur und Abitur |
| **Länge** | Ziel 10–12 min · Sprechtext ca. 7:06 min (bei 130 Wörtern/min, inkl. Pausen) |
| **Beispieldaten** | Eisdiele des Gastmodus (`eisdiele`: Sorte, Verkauf) mit eigenen Fragen – nicht die Demo-Fragen des Probefalls, keine Lab-, AB-, Verhör- oder Klausuraufgabe |
| **Folien** | `DD_Video03_GROUP_BY_und_HAVING_Folien.pptx` (13 Folien, Kamera-Zone unten rechts frei, Sprechertext in den Notizen) |

## Lernziele

- Die Auswertungsreihenfolge FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT beschreiben
- Gruppen bilden und mit COUNT, SUM, AVG, MIN und MAX je Gruppe auswerten
- Die GROUP-BY-Regel anwenden: jede Spalte im SELECT ist aggregiert oder steht im GROUP BY (P3)
- Zeilenbedingungen (WHERE) von Gruppenbedingungen (HAVING) unterscheiden – ohne Alias im HAVING (P1)
- COUNT(*) (Anzahl Zeilen) von SUM(Spalte) (Summe eines Werts) unterscheiden (P4)

## Hinweise für die Aufnahme

- Datenbank: Eisdiele des Gastmodus, aber mit eigenen Fragen (Auswertung je Tag, große Verkäufe ab 3 Kugeln, Wochenende) – die sechs Demo-Fragen des Probefalls (STORY 11) und dessen Auflösung (Verkäufe und Kugeln je Sorte über die ganze Woche) werden nicht gezeigt.
- Geprüfte Werte: je Tag 8–9 Verkäufe, am 2026-07-06 9 Verkäufe mit 21 Kugeln; Verkäufe ab 3 Kugeln: an sechs Tagen mindestens 2 (2026-07-12 nur 1); Wochenende ab 2026-07-11 mindestens zwei Verkäufe: 5 Sorten.
- Bilder: Sortierfächer (Abfrage „je Tag“) und Zeitlupe (Schritt HAVING) mit scripts/video_bilder.js aus der Plattform.
- Pause-Folie: Im Schnitt den Hinweis „Video anhalten“ einblenden.

## YouTube

**Titel:** SQL GROUP BY und HAVING: GROUP-BY-Regel, WHERE vs. HAVING, COUNT vs. SUM (Informatik-Abitur Niedersachsen) | Datendetektei #3

**Sichtbarkeit:** zuerst „nicht gelistet“, nach Freigabe öffentlich (Playlist „Datendetektei“).

**Beschreibung:**

```
GROUP BY und HAVING sind im Informatik-Abitur in Niedersachsen Pflicht – und voller Fallen. In diesem Video lernst du die Auswertungsreihenfolge einer SQL-Abfrage, die GROUP-BY-Regel (jede SELECT-Spalte aggregiert oder gruppiert), den Unterschied zwischen WHERE und HAVING und warum COUNT(*) etwas anderes zählt als SUM. Dazu Sortierfächer und Zeitlupe aus der Datendetektei und die Fallen P1, P3 und P4.

Teil der Unterrichtsreihe „Datendetektei Weserstedt – Ermitteln mit Datenbanken“ (Informatik eA/gA, Abitur ab 2027).
Selbst ausprobieren (Eisdiele im Gastmodus): https://datendetektei.frankjuchim.de/gast

Kapitel:
0:00 Einstieg
0:26 Auswertungsreihenfolge
1:05 GROUP BY
2:13 GROUP-BY-Regel
3:25 WHERE gegen HAVING
4:28 Jetzt du
5:45 Fallen
6:22 Merksätze
```

_Zeitmarken aus der Textlänge geschätzt – nach dem Schnitt anpassen._

**Tags:** Informatik Abitur, Niedersachsen, SQL, GROUP BY, HAVING, COUNT, SUM, Aggregatfunktion, WHERE HAVING, Datenbanken, Datendetektei

## Drehbuch

### Folie 1 · 0:00 – GROUP BY und HAVING – so wie im Abitur · Kapitel „Einstieg“

*Regie: Kamera unten rechts, Titelfolie im Hintergrund.*

**Sprechertext:**

Wie viele Verkäufe gab es pro Tag? Welcher Stand hat mehr als hundert Euro eingenommen? Solche Fragen beantwortest du mit GROUP BY und HAVING. Im Abitur kommen sie fast immer vor – und genau hier passieren die meisten Fehler. Nach diesem Video weißt du, in welcher Reihenfolge die Datenbank denkt, und du umgehst die drei großen Fallen.

### Folie 2 · 0:26 – Die Reihenfolge, in der die Datenbank denkt · Kapitel „Auswertungsreihenfolge“

**Auf der Folie:**

1. **FROM** – Tabellen (bei mehreren: Kreuzprodukt)
2. **WHERE** – einzelne Zeilen filtern
3. **GROUP BY** – Zeilen in Gruppen (Fächer) sortieren
4. **HAVING** – ganze Gruppen filtern
5. **SELECT** – je Gruppe eine Ergebniszeile berechnen
6. **ORDER BY**, **LIMIT** – sortieren, abschneiden
- `Sorte(SorteNr, Name, Preis, Vegan)`
- `Verkauf(VerkaufNr, ↑SorteNr, Datum, Kugeln)`

**Sprechertext:**

Unsere Beispieldaten kommen diesmal aus der Eisdiele im Gastmodus: Sorten und Verkäufe, jeder Verkauf mit Datum und Anzahl Kugeln. Bevor wir gruppieren, das Wichtigste: Geschrieben wird SELECT zuerst, ausgewertet aber in dieser Reihenfolge. FROM holt die Tabellen. WHERE filtert einzelne Zeilen. GROUP BY sortiert die übrigen Zeilen in Gruppen, wie in Fächer. HAVING wirft ganze Gruppen raus. Erst dann berechnet SELECT für jede Gruppe eine Ergebniszeile. Zum Schluss wird sortiert und abgeschnitten. Fast jede Falle in diesem Video lässt sich mit dieser Reihenfolge erklären.

### Folie 3 · 1:05 – Gruppieren: eine Zeile je Tag · Kapitel „GROUP BY“

**Auf der Folie:**

*SQL:*

```sql
SELECT Datum, COUNT(*) AS Verkaeufe, SUM(Kugeln) AS Kugeln
FROM Verkauf
GROUP BY Datum
```
*Ergebnis: 7 Zeile(n) – Datum, Verkaeufe, Kugeln*

- *Aggregatfunktionen:* `COUNT(*)` zählt Zeilen der Gruppe · `SUM`, `AVG`, `MIN`, `MAX` rechnen mit einer Spalte · eine Gruppe → **eine** Ergebniszeile

**Sprechertext:**

Pia, die Inhaberin, will wissen, wie jeder Tag gelaufen ist. GROUP BY Datum steckt alle Verkäufe eines Tages in dasselbe Fach. Für jedes Fach entsteht genau eine Ergebniszeile. In dieser Zeile kannst du mit Aggregatfunktionen rechnen: COUNT Stern zählt, wie viele Verkäufe im Fach liegen, SUM Kugeln addiert die Kugeln. Am Montag, dem sechsten Juli, waren es neun Verkäufe mit zusammen einundzwanzig Kugeln. Die anderen Tage hatten je acht Verkäufe – aber unterschiedlich viele Kugeln.

### Folie 4 · 1:40 – In den Sortierfächern

*Regie: Bild groß zeigen; optional live im Gastmodus (Werkzeug Sortierfächer, Eisdiele) vorführen.*

**Auf der Folie:**

*Bild: `bilder/sortierfaecher.png`*
- *Ein Fach je Datum:* Hier Freitag bis Sonntag (`WHERE Datum >= '2026-07-10'`): jeder Verkauf landet im Fach seines Tages. · COUNT zählt die Karten im Fach, SUM addiert die Kugeln darauf.

**Sprechertext:**

So sieht das in den Sortierfächern der Datendetektei aus – der Übersicht halber nur für Freitag bis Sonntag. Jeder Verkauf ist eine Karte, und jede Karte wandert in das Fach ihres Datums. Über jedem Fach siehst du, was die Aggregatfunktion daraus macht. Du kannst dort zwischen COUNT und SUM umschalten – und genau da liegt der Unterschied, den wir gleich als Falle P4 brauchen: COUNT zählt Karten, SUM addiert Werte auf den Karten.

### Folie 5 · 2:13 – Die GROUP-BY-Regel · Kapitel „GROUP-BY-Regel“

**Auf der Folie:**

*✘ FALLE P3:*

```sql
SELECT Datum, Kugeln, COUNT(*)
FROM Verkauf
GROUP BY Datum
```

*✔ RICHTIG:*

```sql
SELECT Datum, SUM(Kugeln) AS Kugeln, COUNT(*) AS Verkaeufe
FROM Verkauf
GROUP BY Datum
```

- *Regel (EH §8):* Jede Spalte im SELECT ist **aggregiert** oder steht im **GROUP BY**. · Welche „Kugeln“ soll die Zeile vom 6. Juli zeigen – es gibt neun Werte!

**Sprechertext:**

Jetzt die wichtigste Regel. Oben steht Kugeln im SELECT – aber nicht im GROUP BY und nicht in einer Aggregatfunktion. Welcher Wert soll in der Zeile vom sechsten Juli stehen? Dort liegen neun Verkäufe mit verschiedenen Kugelzahlen. Manche Datenbanken nehmen dann irgendeinen Wert, im Abitur ist das ein Fehler: Falle P3. Die Regel lautet: Jede Spalte im SELECT ist entweder aggregiert oder steht im GROUP BY. Unten ist es richtig: Die Kugeln werden summiert.

### Folie 6 · 2:48 – Gruppieren nach dem Schlüssel

**Auf der Folie:**

*SQL:*

```sql
SELECT Sorte.SorteNr, Sorte.Name, COUNT(*) AS Verkaeufe
FROM Sorte, Verkauf
WHERE Sorte.SorteNr = Verkauf.SorteNr
  AND Verkauf.Kugeln >= 2
  AND Sorte.Preis >= 1.7
GROUP BY Sorte.SorteNr, Sorte.Name
```
*Ergebnis: 5 Zeile(n) – SorteNr, Name, Verkaeufe*

- *Warum SorteNr?:* Nach dem **Primärschlüssel** gruppieren – Namen können doppelt sein (P3). · Name steht zusätzlich im GROUP BY, damit er im SELECT stehen darf.

**Sprechertext:**

Mit einem Verbund geht das genauso. Hier zählen wir, wie oft jede Sorte ab 1,70 Euro je Kugel mit mindestens zwei Kugeln verkauft wurde – Stracciatella sechsmal, Karamell viermal. Gruppiert wird nach dem Primärschlüssel SorteNr – nicht nur nach dem Namen. Warum? Zwei verschiedene Dinge können denselben Namen haben, denk an zwei Personen namens Bargmann. Wer nur nach dem Namen gruppiert, wirft sie in ein Fach. Der Name steht trotzdem mit im GROUP BY, damit er laut GROUP-BY-Regel im SELECT stehen darf.

### Folie 7 · 3:25 – WHERE filtert Zeilen, HAVING filtert Gruppen · Kapitel „WHERE gegen HAVING“

**Auf der Folie:**

*SQL:*

```sql
SELECT Datum, COUNT(*) AS Grosse
FROM Verkauf
WHERE Kugeln >= 3
GROUP BY Datum
HAVING COUNT(*) >= 2
```
*Ergebnis: 6 Zeile(n) – Datum, Grosse*

- *Zwei Filter:* `WHERE Kugeln >= 3`: jeder **Verkauf** einzeln, vor dem Gruppieren · `HAVING COUNT(*) >= 2`: jeder **Tag** als Ganzes, danach · der 12. Juli hat nur einen großen Verkauf → fällt raus

**Sprechertext:**

Jetzt beide Filter in einer Abfrage. Gesucht sind Tage mit mindestens zwei großen Verkäufen, also mit drei oder mehr Kugeln. Ob ein Verkauf groß ist, ist eine Eigenschaft einer einzelnen Zeile – das gehört ins WHERE, vor dem Gruppieren. Ob ein Tag mindestens zwei davon hat, ist eine Eigenschaft der ganzen Gruppe – das gehört ins HAVING, nach dem Gruppieren. Ergebnis: sechs Tage. Nur der zwölfte Juli fällt weg, denn dort gab es nur einen großen Verkauf.

### Folie 8 · 4:01 – In der Zeitlupe: der Schritt HAVING

*Regie: Bild zeigen; optional live: Zeitlupe im Gastmodus mit der Eisdiele, Schritt für Schritt.*

**Auf der Folie:**

*Bild: `bilder/zeitlupe_having.png`*
- *Zeitlupe:* Klausel für Klausel in Auswertungsreihenfolge. · Bei HAVING wird die ganze Gruppe grau – nicht einzelne Zeilen.

**Sprechertext:**

In der Zeitlupe kannst du genau das verfolgen. Sie spielt die Abfrage in Auswertungsreihenfolge ab, Klausel für Klausel. Hier stehen wir beim Schritt HAVING: Die Gruppe vom zwölften Juli wird als Ganzes verworfen. Wenn du dir bei einer Abfrage unsicher bist, schick sie aus der Konsole in die Zeitlupe und schau, welche Zeilen und Gruppen an welcher Stelle verschwinden.

### Folie 9 · 4:28 – Kurz anhalten: Jetzt du! · Kapitel „Jetzt du“

**Auf der Folie:**

> Welche Sorten wurden am **Wochenende** (ab **2026-07-11**) **mindestens zweimal** verkauft? Gib SorteNr, Name und die Anzahl der Verkäufe aus – die häufigste Sorte zuerst.
- `Sorte(SorteNr, Name, Preis, Vegan)`
- `Verkauf(VerkaufNr, ↑SorteNr, Datum, Kugeln)`
- *Tipp:* Was ist eine Zeilenbedingung, was eine Gruppenbedingung? · Wonach wird gruppiert?

**Sprechertext:**

Jetzt du. Welche Sorten wurden am Wochenende, also ab dem elften Juli, mindestens zweimal verkauft? Gib SorteNr, Name und die Anzahl der Verkäufe aus, die häufigste Sorte zuerst. Überleg dir: Was davon ist eine Zeilenbedingung, was eine Gruppenbedingung? Halte das Video an.

*(ca. 30 s Pause zum Mitdenken – im Schnitt den Hinweis „Video anhalten“ einblenden)*

### Folie 10 · 5:18 – Auflösung

**Auf der Folie:**

*SQL:*

```sql
SELECT Sorte.SorteNr, Sorte.Name, COUNT(*) AS Verkaeufe
FROM Sorte, Verkauf
WHERE Sorte.SorteNr = Verkauf.SorteNr
  AND Verkauf.Datum >= '2026-07-11'
GROUP BY Sorte.SorteNr, Sorte.Name
HAVING COUNT(*) >= 2
ORDER BY Verkaeufe DESC
```
*Ergebnis: 5 Zeile(n) – SorteNr, Name, Verkaeufe*

- *Typische Fehler:* Datum im HAVING (P1) · `HAVING Verkaeufe >= 2` – Alias im HAVING (P1) · `SUM(Kugeln)` statt `COUNT(*)` (P4)

**Sprechertext:**

Die Auflösung: Das Datum ist eine Zeilenbedingung, also WHERE, zusammen mit der Verbundbedingung. Gruppiert wird nach SorteNr und Name. Mindestens zwei Verkäufe ist eine Gruppenbedingung, also HAVING COUNT Stern größer gleich 2 – und zwar ausgeschrieben, nicht mit dem Alias. In ORDER BY darfst du den Alias dagegen verwenden. Ergebnis: fünf Sorten. Wer SUM Kugeln nimmt, zählt Kugeln statt Verkäufe.

### Folie 11 · 5:45 – Die Fallen bei GROUP BY · Kapitel „Fallen“

**Auf der Folie:**

- **P1** WHERE ↔ HAVING: Aggregat im WHERE (`WHERE COUNT(*) >= 2` geht nicht), Zeilenbedingung im HAVING, Alias im HAVING.
- **P3** GROUP-BY-Regel: Spalte im SELECT weder aggregiert noch gruppiert; nach Name statt nach Schlüssel gruppiert.
- **P4** COUNT ↔ SUM: „Anzahl Verkäufe“ = `COUNT(*)`, „Anzahl Kugeln“ = `SUM(Kugeln)`. `COUNT(Spalte)` zählt keine NULL-Werte.
*✘ P1:*

```sql
SELECT Datum, COUNT(*)
FROM Verkauf
WHERE COUNT(*) >= 9
GROUP BY Datum
```


**Sprechertext:**

Die drei Fallen dieses Videos. P1, WHERE gegen HAVING: Eine Aggregatfunktion im WHERE geht nicht, weil WHERE vor dem Gruppieren läuft – rechts siehst du so einen Fehler. Umgekehrt gehört eine Zeilenbedingung nicht ins HAVING, und ein Alias hat im HAVING nichts zu suchen. P3, die GROUP-BY-Regel, und gruppiere nach dem Schlüssel. P4, COUNT gegen SUM: Lies genau, ob nach der Anzahl der Verkäufe oder der Anzahl der Kugeln gefragt ist. Und COUNT einer Spalte zählt NULL-Werte nicht mit.

### Folie 12 · 6:22 – Das nimmst du mit · Kapitel „Merksätze“

**Auf der Folie:**

- FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT.
- Eine Gruppe ergibt genau eine Ergebniszeile.
- Jede SELECT-Spalte ist aggregiert oder steht im GROUP BY – gruppiere nach dem Schlüssel.
- WHERE filtert Zeilen vor dem Gruppieren, HAVING filtert Gruppen danach – ohne Alias.
- COUNT(*) zählt Zeilen, SUM(Spalte) addiert Werte.

**Sprechertext:**

Das nimmst du mit: die Auswertungsreihenfolge von FROM bis LIMIT. Eine Gruppe ergibt genau eine Ergebniszeile. Jede Spalte im SELECT ist aggregiert oder gruppiert, und gruppiert wird nach dem Schlüssel. WHERE filtert Zeilen vor dem Gruppieren, HAVING filtert Gruppen danach, ohne Alias. Und COUNT zählt Zeilen, SUM addiert Werte.

### Folie 13 · 6:44 – Weiter im Lab

**Auf der Folie:**

- Ermittlung 3.1 „Kassensturz“ · A3-E1-01 … 08
- Ermittlung 3.2 „Die Statistik lügt nicht“ · A3-E2-01 … 08
- AB 3.1 „Kassensturz“ und AB 3.2 „Die Statistik lügt nicht“
- Verhör 3 nach Freischaltung durch die Lehrkraft
- Nächstes Video: Video 4 – Redundanz, Anomalien und gute Schlüssel

**Sprechertext:**

Ab ins Lab! In Akte 3 fehlt Geld in der Stadtfest-Kasse – mit Sortierfächern in Ermittlung 3.1 und der Zeitlupe in 3.2 kommst du dem Fehlbetrag auf die Spur. Im nächsten Video schauen wir uns an, warum schlecht gebaute Tabellen Daten durcheinanderbringen: Redundanz, Anomalien und gute Schlüssel.
