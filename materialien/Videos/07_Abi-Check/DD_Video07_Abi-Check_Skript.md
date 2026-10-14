# Erklärvideo 7: Abi-Check Datenbanken: 10 Fallen und die Operatoren

> ERZEUGT aus `video.json` mit `python3 werkzeuge/video_folien.py` – Änderungen in der video.json vornehmen.

*Die Fallen P1–P10 auf einen Blick, was die Operatoren verlangen und wie du deine Zeit einteilst*

| | |
|---|---|
| **Akte** | Akte 7 · Die Ermittlerprüfung |
| **Einsatz** | Akte 7, DS 13 (optional) · vor Generalprobe, Verhör 7 (Lab-Generalprobe) und Klausur · Ermittler-Handbuch Werkzeugkarten 7 und 8 |
| **Zielgruppe** | Informatik eA und gA (Datenbanken); Wiederholung vor Klausur und Abitur |
| **Länge** | Ziel 10 min · Sprechtext ca. 6:02 min (bei 130 Wörtern/min, inkl. Pausen) |
| **Beispieldaten** | eigene Video-DB `video/schachturnier` – keine Lab-, AB-, Verhör-, Generalprobe- oder Klausuraufgabe; keine Originaltexte von Abituraufgaben |
| **Folien** | `DD_Video07_Abi-Check_Folien.pptx` (12 Folien, Kamera-Zone unten rechts frei, Sprechertext in den Notizen) |

## Lernziele

- Die Fallen P1–P10 benennen und in eigenen Lösungen wiederfinden
- Die Operatoren nennen, beschreiben, erläutern, analysieren, begründen, beurteilen und entwerfen/erstellen unterscheiden und sachgerecht anwenden
- Eine fehlerhafte Abfrage systematisch auf Fallen untersuchen und verbessern
- Das Zeitbudget einer Prüfungsaufgabe planen (≈ 2 min je BE)

## Hinweise für die Aufnahme

- Alle Beispiele laufen auf der eigenen Video-DB `video/schachturnier`; Abituraufgaben werden nicht zitiert (nur Fallen, die dort typisch sind – Spec §5 nennt Belege als Verweise).
- Geprüfte Werte: je Turnier 12/12 bzw. 6/5 Partien (COUNT(*) gegen COUNT(Ergebnis)); Vereine mit mindestens drei Mitgliedern: SK Weserspringer und Turm Lindenhof (je 3).
- Zeitbudget nach DS_PLANUNG DS 13: ≈ 2 min je BE; die Operatoren-Beschreibungen sind eigene Kurzfassungen (Werkzeugkarte 7), keine Zitate der Operatorenliste.

## YouTube

**Titel:** Abi-Check Datenbanken: 10 typische Fehler (P1–P10) und die Operatoren (Informatik-Abitur Niedersachsen) | Datendetektei #7

**Sichtbarkeit:** zuerst „nicht gelistet“, nach Freigabe öffentlich (Playlist „Datendetektei“).

**Beschreibung:**

```
Kurz vor der Klausur oder dem Abitur: Die zehn typischen Fallen bei Datenbank-Aufgaben im Informatik-Abitur Niedersachsen – von WHERE gegen HAVING über die GROUP-BY-Regel und NULL bis zu Schlüsseln, ER-Modellen und verfehlten Operatoren. Dazu, was „erläutern“, „analysieren“, „begründen“ und „beurteilen“ wirklich verlangen, eine Fehlersuche zum Mitmachen und eine Faustregel fürs Zeitbudget.

Teil der Unterrichtsreihe „Datendetektei Weserstedt – Ermitteln mit Datenbanken“ (Informatik eA/gA, Abitur ab 2027).

Kapitel:
0:00 Einstieg
0:22 Aufbau und Zeit
0:54 Operatoren
1:25 SQL-Fallen
2:53 Modellierung
3:56 Fehlersuche
5:17 Checkliste
```

_Zeitmarken aus der Textlänge geschätzt – nach dem Schnitt anpassen._

**Tags:** Informatik Abitur, Niedersachsen, Datenbanken, SQL, typische Fehler, Operatoren, Abitur 2027, GROUP BY, ER-Modell, Prüfungsvorbereitung, Datendetektei

## Drehbuch

### Folie 1 · 0:00 – Abi-Check Datenbanken: 10 Fallen und die Operatoren · Kapitel „Einstieg“

*Regie: Kamera unten rechts, Titelfolie im Hintergrund.*

**Sprechertext:**

Die meisten Punkte im Abitur gehen nicht verloren, weil jemand etwas gar nicht kann – sondern durch immer dieselben zehn Fallen. In diesem Video gehen wir sie alle durch, klären, was die Operatoren verlangen, und planen deine Zeit. Danach machst du den Check an deinen eigenen Lösungen.

### Folie 2 · 0:22 – So sieht eine Datenbank-Aufgabe aus · Kapitel „Aufbau und Zeit“

**Auf der Folie:**

- Material: Szenario, Relationenschema oder ER-Modell, oft ein Datenausschnitt
- viele kleine Teilaufgaben (2–8 BE), je ein Operator
- SQL nach EH §8: Verbund nur mit `FROM a, b WHERE`, GROUP-BY-Regel, kein Alias im HAVING
- Zeitbudget: **≈ 2 Minuten je BE**
*Tabelle BEISPIEL: 30 BE: Teil, BE, Zeit (4 Zeilen)*

**Sprechertext:**

Eine Datenbank-Aufgabe beginnt mit Material: einem Szenario, einem Relationenschema oder ER-Modell und oft einem Datenausschnitt. Dann folgen viele kleine Teilaufgaben mit je zwei bis acht Bewertungseinheiten und jeweils einem Operator. SQL schreibst du im Stil der Ergänzenden Hinweise. Als Faustregel für die Zeit: etwa zwei Minuten je BE. Bei dreißig BE sind das rund sechzig Minuten – plus ein paar Minuten zum Kontrollieren. Bleib nicht an einer Teilaufgabe hängen.

### Folie 3 · 0:54 – Was die Operatoren verlangen · Kapitel „Operatoren“

**Auf der Folie:**

*Tabelle: Operator, Was du lieferst (7 Zeilen)*

**Sprechertext:**

Jeder Operator verlangt etwas anderes. Nennen heißt: Fakten, ohne Begründung. Beschreiben: den Sachverhalt geordnet in eigenen Worten. Erläutern geht weiter: Du beschreibst und machst es an einem Beispiel verständlich – bei Anomalien am Datensatz. Analysieren heißt, Merkmale gezielt herauszuarbeiten, immer im Sachzusammenhang. Begründen verlangt ein Weil. Beurteilen verlangt ein Urteil mit Kriterien. Und entwerfen oder erstellen heißt: Du schreibst die Abfrage, zeichnest das Modell oder legst das Schema an.

### Folie 4 · 1:25 – SQL-Fallen I: P1 bis P4 · Kapitel „SQL-Fallen“

**Auf der Folie:**

- **P1** WHERE ↔ HAVING: Aggregat im WHERE; Zeilenbedingung im HAVING; Alias im HAVING.
- **P2** Verbund fehlt oder vervielfacht: Verbundbedingung vergessen, falscher FK-Pfad, Zeilen durch zwei 1:n-Verbünde vervielfacht.
- **P3** GROUP-BY-Regel: SELECT-Spalte weder aggregiert noch gruppiert; nach Name statt Schlüssel gruppiert.
- **P4** COUNT ↔ SUM: Anzahl Zeilen gegen Summe eines Werts; `COUNT(Spalte)` zählt NULL nicht.

**Sprechertext:**

Die SQL-Fallen, Teil eins. P1, WHERE gegen HAVING: Aggregatfunktionen gehören ins HAVING, Zeilenbedingungen ins WHERE, und im HAVING steht kein Alias. P2: Der Verbund fehlt, geht über den falschen Fremdschlüssel oder vervielfacht Zeilen. P3: die GROUP-BY-Regel – jede Spalte im SELECT aggregiert oder gruppiert, gruppiert wird nach dem Schlüssel. P4: COUNT gegen SUM – zählst du Zeilen oder addierst du Werte?

### Folie 5 · 1:54 – P4 im Beispiel: COUNT(*) gegen COUNT(Spalte)

**Auf der Folie:**

*SQL:*

```sql
SELECT Turnier.TurnierNr, Turnier.Bezeichnung, COUNT(*) AS Partien,
       COUNT(Partie.Ergebnis) AS Beendet
FROM Turnier, Partie
WHERE Turnier.TurnierNr = Partie.TurnierNr
GROUP BY Turnier.TurnierNr, Turnier.Bezeichnung
```
*Ergebnis: 2 Zeile(n) – TurnierNr, Bezeichnung, Partien, Beendet*

- *Warum 6 und 5?:* Eine Pokal-Partie hat noch kein Ergebnis (NULL). · `COUNT(*)` zählt sie mit, `COUNT(Partie.Ergebnis)` nicht.

**Sprechertext:**

Ein kleines Beispiel aus unserem Schachturnier. Pro Turnier zählen wir einmal mit COUNT Stern und einmal mit COUNT von Ergebnis. Beim Frühjahrsblitz kommt beide Male zwölf heraus. Beim Pokal aber sechs und fünf – eine Partie ist noch nicht beendet, ihr Ergebnis ist NULL. COUNT Stern zählt Zeilen, COUNT einer Spalte zählt nur Werte, die nicht NULL sind. Lies deshalb genau, was gezählt werden soll.

### Folie 6 · 2:24 – SQL-Fallen II: P5 bis P7

**Auf der Folie:**

- **P5** NULL und Literale: `= NULL` statt `IS NULL`; Text ohne Hochkommata; Datum nicht als `'JJJJ-MM-TT'`.
- **P6** Bedingungslogik: AND/OR ohne Klammern; `>` statt `>=`; BETWEEN schließt Grenzen ein; LIKE-Platzhalter falsch.
- **P7** Mehrdeutig oder falsch benannt: Präfix fehlt bei gleichnamigen Spalten; FK heißt anders als der PK; Alias falsch verwendet.

**Sprechertext:**

Teil zwei. P5: NULL und Literale – mit NULL vergleichst du nur über IS NULL, Texte stehen in Hochkommata, ein Datum im Format Jahr-Monat-Tag. P6: Bedingungslogik – AND bindet stärker als OR, Grenzen genau lesen, LIKE mit Prozent und Unterstrich. P7: mehrdeutige oder falsch benannte Spalten – Präfix bei gleichnamigen Spalten, und ein Fremdschlüssel darf anders heißen als der Primärschlüssel, auf den er zeigt.

### Folie 7 · 2:53 – Modellierungs-Fallen: P8 und P9 · Kapitel „Modellierung“

**Auf der Folie:**

- **P8** Schlüssel falsch beurteilt: Eindeutigkeit aus dem Datenausschnitt geschlossen; NULL im Schlüssel; nicht minimal; Mehrfachvorkommen übersehen.
- **P9** ER oder Überführung fehlerhaft: Kardinalität vertauscht, Schlüsselattribut nicht markiert, Beziehungsattribut falsch platziert, FK auf der falschen Seite, n:m ohne eigene Relation.
- *Gegenmittel:* Schlüssel: „Kann es das in der Realität zweimal geben?“ · Kardinalität: zwei Fragen je Raute · 1:n → FK auf die n-Seite

**Sprechertext:**

Bei Modellierung und Schlüsseln gibt es zwei Fallen. P8: Der Schlüssel wird falsch beurteilt – am häufigsten, weil aus einem Datenausschnitt auf Eindeutigkeit geschlossen wird. Frag dich immer: Kann es das in der Realität zweimal geben? P9: Fehler im ER-Modell oder bei der Überführung – vertauschte Kardinalitäten, fehlende Schlüsselattribute, falsch platzierte Beziehungsattribute, der Fremdschlüssel auf der falschen Seite. Gegenmittel: zwei Fragen je Raute und die Überführungsregeln.

### Folie 8 · 3:24 – P10: Operator verfehlt

**Auf der Folie:**

> **Beurteilen** Sie, ob (Vorname, Nachname) als Primärschlüssel der Relation Spieler geeignet ist.
- *✘ Ohne Kriterium (P10):* „Nein, das ist nicht geeignet.“
- *✔ Mit Kriterien beurteilt:* Ein Primärschlüssel muss für alle denkbaren Daten eindeutig und möglichst unveränderlich sein. Zwei Personen können gleich heißen (es gibt schon zwei Bargmanns, gleiche Vornamen sind möglich), Namen können sich ändern. (Vorname, Nachname) ist daher **nicht geeignet**; SpielerNr erfüllt beide Kriterien.

**Sprechertext:**

Und die zehnte Falle betrifft nicht den Inhalt, sondern den Operator. Die Aufgabe lautet: Beurteilen Sie, ob Vor- und Nachname als Primärschlüssel geeignet sind. Die obere Antwort sagt nur Nein – das ist ein Urteil ohne Kriterium und bringt kaum Punkte. Die untere nennt die Kriterien, wendet sie auf die Situation an und kommt dann zum Urteil. So sieht beurteilen aus. Genauso verlangt erläutern ein Beispiel und begründen ein Weil.

### Folie 9 · 3:56 – Kurz anhalten: Jetzt du! · Kapitel „Fehlersuche“

**Auf der Folie:**

> Gesucht: Vereine mit **mindestens drei** Mitgliedern – mit Name, Ort und Anzahl. **Analysiere** die Abfrage auf alle Fallen:
*✘ ENTHÄLT DREI FALLEN:*

```sql
SELECT Name, Ort, COUNT(*) AS Mitglieder
FROM Spieler, Verein
WHERE Spieler.VereinNr = Verein.VereinNr
  AND COUNT(*) >= 3
GROUP BY VereinNr
```

- `Verein(VereinNr, Name, Ort)`
- `Spieler(SpielerNr, Vorname, Nachname, Jahrgang, Wertung, ↑VereinNr)`

**Sprechertext:**

Fehlersuche! Gesucht sind Vereine mit mindestens drei Mitgliedern, mit Name, Ort und Anzahl. In der Abfrage stecken drei verschiedene Fallen. Halte das Video an und finde sie – mit Nummer.

*(ca. 40 s Pause zum Mitdenken – im Schnitt den Hinweis „Video anhalten“ einblenden)*

### Folie 10 · 4:50 – Auflösung

**Auf der Folie:**

*✔ VERBESSERT:*

```sql
SELECT Verein.VereinNr, Verein.Name, Verein.Ort, COUNT(*) AS Mitglieder
FROM Spieler, Verein
WHERE Spieler.VereinNr = Verein.VereinNr
GROUP BY Verein.VereinNr, Verein.Name, Verein.Ort
HAVING COUNT(*) >= 3
```
*Ergebnis: 2 Zeile(n) – VereinNr, Name, Ort, Mitglieder*

- *Die drei Fallen:* **P1**: `COUNT(*)` im WHERE → HAVING · **P3**: Name, Ort weder gruppiert noch aggregiert · **P7**: `VereinNr` ohne Präfix – mehrdeutig

**Sprechertext:**

Die Auflösung. Erstens P1: COUNT Stern im WHERE geht nicht, die Bedingung gehört ins HAVING. Zweitens P3: Name und Ort stehen im SELECT, aber nicht im GROUP BY. Drittens P7: VereinNr gibt es in beiden Tabellen, also braucht sie ein Präfix. Verbessert gruppieren wir nach Verein.VereinNr, Name und Ort und filtern mit HAVING. Ergebnis: zwei Vereine mit je drei Mitgliedern.

### Folie 11 · 5:17 – Checkliste vor der Abgabe · Kapitel „Checkliste“

**Auf der Folie:**

- Operator gelesen? Erläutern = am Beispiel, begründen = weil, beurteilen = Kriterien + Urteil.
- Jede Tabelle im FROM verbunden (n − 1 Bedingungen), Präfixe gesetzt?
- WHERE für Zeilen, HAVING für Gruppen; GROUP-BY-Regel erfüllt?
- NULL mit IS NULL, Texte in Hochkommata, Klammern bei AND/OR?
- Schlüssel und Kardinalitäten begründet – nicht aus dem Ausschnitt geschlossen?

**Sprechertext:**

Zum Schluss deine Checkliste vor der Abgabe: Hast du den Operator gelesen und erfüllt? Ist jede Tabelle im FROM verbunden, mit Präfixen? WHERE für Zeilen, HAVING für Gruppen, GROUP-BY-Regel erfüllt? NULL mit IS NULL, Texte in Hochkommata, Klammern bei AND und OR? Und sind Schlüssel und Kardinalitäten begründet statt aus dem Ausschnitt geraten?

### Folie 12 · 5:42 – Weiter im Lab

**Auf der Folie:**

- **Verhör 7 · Mensa** – die Lab-Generalprobe unter Zeitdruck (nach Freischaltung)
- **Trainingsplatz** und **Warm-up-Karten** – gezielt die eigenen Fallen üben („Deine Fallen“ im Profil)
- Generalprobe eA/gA (DS 13) mit Peer-Korrektur
- Ermittler-Handbuch: Werkzeugkarte 7 (Operatoren) und 8 (Abi-Check P1–P10)
- Nächstes Video: Alle Videos der Playlist „Datendetektei“ – zum Wiederholen vor der Klausur

**Sprechertext:**

Und jetzt: ab zur Generalprobe! Im Lab wartet Verhör 7 in der Mensa unter Zeitdruck. Im Trainingsplatz und mit den Warm-up-Karten übst du gezielt deine eigenen Fallen – welche das sind, zeigt dir dein Profil. Viel Erfolg in der Klausur und im Abitur!
