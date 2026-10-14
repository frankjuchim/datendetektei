# Erklärvideo 6: Vom ER-Modell zum Relationenschema in 5 Regeln

> ERZEUGT aus `video.json` mit `python3 werkzeuge/video_folien.py` – Änderungen in der video.json vornehmen.

*Entitätstypen werden Relationen – und fünf Regeln für 1:n, n:m, 1:1, rekursive und ternäre Beziehungstypen, mit Begründung*

| | |
|---|---|
| **Akte** | Akte 5 · Der Bauplan (eA) |
| **Einsatz** | Akte 5 (eA), DS 11 · Ermittlung 5.3 „Vom Plan zur Datenbank“ (Schema-Werkbank, Verbund mit sich selbst) · AB 5.3 · vor Verhör 5 |
| **Zielgruppe** | Informatik eA (Datenbanken), Akte 5; Wiederholung vor Verhör 5, Klausur und Abitur |
| **Länge** | Ziel 8–10 min · Sprechtext ca. 6:40 min (bei 130 Wörtern/min, inkl. Pausen) |
| **Beispieldaten** | eigenes Beispiel „Tierheim“ aus Video 5 – nicht die Detektei des Labs und nicht das Schulbeispiel der Lab-Intro; Diagramme und Werkbank-Bild aus der Plattform |
| **Folien** | `DD_Video06_ER_zu_Relationenschema_Folien.pptx` (13 Folien, Kamera-Zone unten rechts frei, Sprechertext in den Notizen) |

## Lernziele

- Entitätstypen in Relationen mit Primärschlüssel überführen (Grundregel R1)
- 1:n-, n:m-, 1:1-, rekursive und ternäre Beziehungstypen nach den Regeln R2–R6 überführen
- Die Regeln begründen – insbesondere, warum n:m eine eigene Relation braucht und 1:n nicht
- Fremdschlüssel nach ihrer Rolle benennen (MutterNr) und zusammengesetzte Schlüssel wählen
- Die Rückrichtung Schema → ER-Modell beherrschen und Falle P9 vermeiden

## Hinweise für die Aufnahme

- Spec §13 nennt „5 Regeln“, DS_PLANUNG DS 11 zählt R1–R6: Das Video zeigt die Grundregel R1 (Entitätstyp → Relation) und die **fünf Regeln für Beziehungstypen** R2–R6 – Nummern wie im Merkkasten der DS 11.
- Beispiel „Tierheim“ wie in Video 5; Detektei-Modelle (Lab, AB 5.3, Verhör 5 Kletterhalle) und das Schulbeispiel der Lab-Intro kommen nicht vor.
- Die Abfrage mit zwei Aliasen auf Folie 5 bezieht sich auf das Schema auf der Folie (keine Datenbank: nur Parser und EH-§8-Regeln geprüft, db=keine).
- Werkbank-Bild der Auflösung mit scripts/video_bilder.js (Schema-Werkbank ohne Prüfung).

## YouTube

**Titel:** ER-Modell in Relationenschema überführen: 1:n, n:m, 1:1, rekursiv, ternär (Informatik-Abitur Niedersachsen) | Datendetektei #6

**Sichtbarkeit:** zuerst „nicht gelistet“, nach Freigabe öffentlich (Playlist „Datendetektei“).

**Beschreibung:**

```
Wie wird aus einem ER-Modell ein Relationenschema? In diesem Video lernst du die Grundregel für Entitätstypen und fünf Regeln für Beziehungstypen – 1:n, n:m, 1:1, rekursiv und ternär – jeweils mit Begründung, so wie es im Informatik-Abitur in Niedersachsen verlangt wird. Dazu die Kurzschreibweise nach den Ergänzenden Hinweisen (Primärschlüssel unterstrichen, Fremdschlüssel mit Pfeil), die Rückrichtung vom Schema zum ER-Modell und die Falle P9.

Teil der Unterrichtsreihe „Datendetektei Weserstedt – Ermitteln mit Datenbanken“ (Informatik eA, Abitur ab 2027).
Selbst ausprobieren: Schema-Werkbank https://datendetektei.frankjuchim.de/werkzeug/werkbank

Kapitel:
0:00 Einstieg
0:21 1:n
0:55 n:m
1:59 Rekursiv und ternär
3:38 Jetzt du
5:02 Rückrichtung
5:32 Fallen
5:51 Merksätze
```

_Zeitmarken aus der Textlänge geschätzt – nach dem Schnitt anpassen._

**Tags:** Informatik Abitur, Niedersachsen, Relationenschema, ER-Modell, Überführung, Fremdschlüssel, n:m, rekursive Beziehung, ternäre Beziehung, Kurzschreibweise, Datendetektei

## Drehbuch

### Folie 1 · 0:00 – Vom ER-Modell zum Relationenschema in 5 Regeln · Kapitel „Einstieg“

*Regie: Kamera unten rechts, Titelfolie im Hintergrund.*

**Sprechertext:**

Der Bauplan steht – jetzt wird gebaut. Aus dem ER-Modell wird ein Relationenschema, also die Tabellen der Datenbank. Dafür gibt es eine Grundregel und fünf Regeln für die Beziehungstypen. Nach diesem Video kannst du jede davon anwenden und – genauso wichtig fürs Abitur – begründen.

### Folie 2 · 0:21 – Grundregel R1 und Regel R2: 1:n · Kapitel „1:n“

**Auf der Folie:**

*Bild: `bilder/er_1n.png`*
- `Gehege(GehegeNr, Bereich)`
- `Tier(TierNr, Name, Art, ↑GehegeNr)`
- *Begründung R2:* Jedes Tier lebt in **genau einem** Gehege → **ein** Wert je Tier-Zeile. Umgekehrt bräuchte ein Gehege eine Liste von Tieren – das geht nicht.

**Sprechertext:**

Die Grundregel R1: Jeder Entitätstyp wird eine Relation, seine Attribute werden Spalten, das Schlüsselattribut wird Primärschlüssel – unterstrichen. Jetzt die erste Beziehungsregel, R2 für 1 zu n. Der Fremdschlüssel kommt auf die n-Seite. Tier bekommt also einen Fremdschlüssel GehegeNr, mit Pfeil. Begründung: Jedes Tier lebt in genau einem Gehege, also steht in jeder Tier-Zeile genau ein Wert. Andersherum müsste ein Gehege eine ganze Liste von Tieren speichern – das passt nicht in eine Zelle.

### Folie 3 · 0:55 – Regel R3: n:m bekommt eine eigene Relation · Kapitel „n:m“

**Auf der Folie:**

*Bild: `bilder/er_nm.png`*
- `Helfer(HelferNr, Name)`
- `Tier(TierNr, Name)`
- `betreut(↑HelferNr, ↑TierNr, Seit)`
- *Begründung R3:* Auf **keiner** Seite passt ein einzelner Wert. Das Paar der beiden Fremdschlüssel ist der Schlüssel; „Seit“ wandert mit in die neue Relation.

**Sprechertext:**

Regel R3 für n zu m. Hier passt ein Fremdschlüssel auf keine Seite: Ein Helfer betreut mehrere Tiere, ein Tier hat mehrere Helfer. Deshalb entsteht eine eigene Relation, benannt nach dem Beziehungstyp: betreut. Sie enthält beide Fremdschlüssel, und zusammen bilden sie den Primärschlüssel – beide unterstrichen. Das Beziehungsattribut Seit kommt mit in diese Relation. Und wenn dasselbe Paar mehrmals vorkommen könnte, nimmst du ein weiteres Attribut, etwa ein Datum, mit in den Schlüssel.

### Folie 4 · 1:29 – Regel R4: 1:1

**Auf der Folie:**

- `Tier(TierNr, Name)`
- `Chip(ChipNr, Hersteller, ↑TierNr)`
- *Begründung R4:* Beide Seiten haben je **einen** Partner → der Fremdschlüssel passt auf **eine** Seite. · Meist dorthin, wo das Objekt später entsteht (der Chip wird einem vorhandenen Tier eingesetzt). · Alternative: beide Relationen zusammenlegen.

**Sprechertext:**

Regel R4 für 1 zu 1: Ein Tier trägt genau einen Chip, ein Chip gehört zu genau einem Tier. Hier passt der Fremdschlüssel auf jede der beiden Seiten. Üblich ist die Seite, die später entsteht – der Chip wird einem Tier eingesetzt, das es schon gibt. Also bekommt Chip den Fremdschlüssel TierNr. Man könnte die beiden Relationen auch zusammenlegen. Wichtig ist, dass du deine Entscheidung begründest.

### Folie 5 · 1:59 – Regel R5: rekursiv – der Fremdschlüssel zeigt auf die eigene Relation · Kapitel „Rekursiv und ternär“

**Auf der Folie:**

- `Tier(TierNr, Name, Geburtsjahr, ↑MutterNr)`
*VERBUND DER TABELLE MIT SICH SELBST (ZWEI ALIASE):*

```sql
SELECT j.Name AS Jungtier, m.Name AS Mutter
FROM Tier j, Tier m
WHERE j.MutterNr = m.TierNr
```

*Bild: `bilder/er_rek.png`*

**Sprechertext:**

Regel R5 für rekursive Beziehungen. Es gelten dieselben Regeln wie bei 1 zu n und n zu m – nur zeigt der Fremdschlüssel auf die eigene Relation. Bei stammtAb, eins zu n, bekommt Tier einen Fremdschlüssel. Er kann nicht TierNr heißen, die gibt es schon. Deshalb benennst du ihn nach seiner Rolle: MutterNr. Wäre die Beziehung n zu m, entstünde eine eigene Relation mit zwei Fremdschlüsseln auf Tier. Abfragen dazu nutzen dieselbe Tabelle zweimal mit Aliasen, wie unten: Jungtier und Mutter.

### Folie 6 · 2:36 – Regel R6: ternär

**Auf der Folie:**

*Bild: `bilder/er_ter.png`*
- `lerntKennen(↑InteressentNr, ↑TierNr, ↑HelferNr, Datum)`
- *Begründung R6:* Eigene Relation mit **drei** Fremdschlüsseln. · Dasselbe Trio kann sich mehrmals treffen → **Datum** gehört in den Schlüssel.

**Sprechertext:**

Die letzte Regel, R6, für ternäre Beziehungen. Sie bekommen immer eine eigene Relation mit drei Fremdschlüsseln – einen für jeden beteiligten Entitätstyp. Der Schlüssel besteht zunächst aus diesen dreien. Aber Vorsicht: Kann dieselbe Interessentin dasselbe Tier mit demselben Helfer mehrmals kennenlernen? Natürlich. Dann reichen die drei nicht, und das Datum muss mit in den Schlüssel. Genau diese Überlegung wird im Abitur gern abgefragt.

### Folie 7 · 3:06 – Die Regeln im Überblick

**Auf der Folie:**

*Tabelle DIE REGELN IM ÜBERBLICK: Regel, ER-Modell, Relationenschema (6 Zeilen)*

**Sprechertext:**

Hier alle Regeln auf einen Blick. R1: Entitätstyp wird Relation. R2: Bei 1 zu n kommt der Fremdschlüssel auf die n-Seite. R3: n zu m bekommt eine eigene Relation. R4: Bei 1 zu 1 auf eine Seite. R5: Rekursiv wie R2 oder R3, mit Fremdschlüsseln auf die eigene Relation. R6: Ternär bekommt eine eigene Relation mit drei Fremdschlüsseln. Beziehungsattribute wandern immer dorthin, wo der Fremdschlüssel bzw. die neue Relation steht.

### Folie 8 · 3:38 – Kurz anhalten: Jetzt du! · Kapitel „Jetzt du“

**Auf der Folie:**

*Bild: `bilder/er_pause.png`*
> **Erstelle** zu dem ER-Modell aus Video 5 das Relationenschema in Kurzschreibweise – mit Primärschlüsseln (unterstrichen) und Fremdschlüsseln (↑).

**Sprechertext:**

Jetzt du. Hier das Futter-Modell aus dem letzten Video: Lieferant liefert Futtersorte, Tier frisst Futtersorte mit einer Tagesmenge. Erstelle dazu das Relationenschema in Kurzschreibweise. Welche Regel gilt bei liefert, welche bei frisst? Halte das Video an.

*(ca. 40 s Pause zum Mitdenken – im Schnitt den Hinweis „Video anhalten“ einblenden)*

### Folie 9 · 4:34 – Auflösung

**Auf der Folie:**

*Bild: `bilder/werkbank_loesung.png`*
- `Lieferant(LieferantNr, Firma)`
- `Futtersorte(SorteNr, Bezeichnung, ↑LieferantNr)`
- `Tier(TierNr, Name)`
- `frisst(↑TierNr, ↑SorteNr, Tagesmenge)`

**Sprechertext:**

Die Auflösung. liefert ist 1 zu n, also Regel R2: Futtersorte bekommt den Fremdschlüssel LieferantNr. frisst ist n zu m, also Regel R3: eine eigene Relation frisst mit TierNr und SorteNr als gemeinsamem Primärschlüssel und der Tagesmenge. Oben das Ganze in der Schema-Werkbank der Datendetektei. Häufige Fehler: der Fremdschlüssel beim Lieferanten statt bei der Futtersorte oder die Tagesmenge beim Tier.

### Folie 10 · 5:02 – Rückrichtung: vom Schema zum ER-Modell · Kapitel „Rückrichtung“

**Auf der Folie:**

1. Relation mit **eigenem** Schlüssel → Entitätstyp
2. Fremdschlüssel in einer Entitäts-Relation → **1:n** (n auf der Seite des Fremdschlüssels)
3. Schlüssel aus **zwei** Fremdschlüsseln → **n:m**, aus drei → ternär
4. übrige Attribute dieser Relation → **Beziehungsattribute**

**Sprechertext:**

Im Abitur kommt auch die Rückrichtung vor: Aus einem Schema soll ein ER-Modell werden. Eine Relation mit eigenem Schlüssel wird ein Entitätstyp. Ein Fremdschlüssel in so einer Relation ist eine 1-zu-n-Beziehung – das n steht auf der Seite des Fremdschlüssels. Besteht der Schlüssel einer Relation aus zwei Fremdschlüsseln, war es eine n-zu-m-Beziehung, bei drei eine ternäre. Und die übrigen Attribute dieser Relation sind Beziehungsattribute.

### Folie 11 · 5:32 – Die Fallen bei der Überführung · Kapitel „Fallen“

**Auf der Folie:**

- **P9** Fremdschlüssel auf der falschen Seite: Bei 1:n immer auf die n-Seite – sonst bräuchte eine Zelle mehrere Werte.
- **P9** n:m ohne eigene Relation: Ein Fremdschlüssel in einer der beiden Relationen reicht bei n:m nie.
- **P9** Schlüssel der Beziehungsrelation: Beide (bzw. drei) Fremdschlüssel unterstreichen; bei Mehrfachvorkommen ein Attribut ergänzen.
- **P7** Fremdschlüssel unklar benannt: Bei rekursiven Beziehungen nach der Rolle: MutterNr statt TierNr2.

**Sprechertext:**

Die Fallen bei der Überführung gehören zu P9: der Fremdschlüssel auf der falschen Seite, eine n-zu-m-Beziehung ohne eigene Relation, oder ein unvollständiger Schlüssel in der Beziehungsrelation. Und bei rekursiven Beziehungen P7: Benenne den Fremdschlüssel nach seiner Rolle, also MutterNr, nicht TierNr2.

### Folie 12 · 5:51 – Das nimmst du mit · Kapitel „Merksätze“

**Auf der Folie:**

- R1: Entitätstyp → Relation, Schlüsselattribut → Primärschlüssel.
- R2: 1:n → Fremdschlüssel auf die n-Seite.
- R3: n:m → eigene Relation, Schlüssel aus beiden Fremdschlüsseln.
- R4: 1:1 → Fremdschlüssel auf eine Seite (begründen).
- R5/R6: rekursiv → FK auf die eigene Relation (Rollenname); ternär → eigene Relation mit drei FKs.

**Sprechertext:**

Das nimmst du mit: Entitätstyp wird Relation. Bei 1 zu n kommt der Fremdschlüssel auf die n-Seite. n zu m bekommt eine eigene Relation mit beiden Fremdschlüsseln als Schlüssel. Bei 1 zu 1 entscheidest du dich begründet für eine Seite. Rekursiv zeigt der Fremdschlüssel auf die eigene Relation und heißt nach seiner Rolle, und ternär bekommt eine eigene Relation mit drei Fremdschlüsseln.

### Folie 13 · 6:19 – Weiter im Lab

**Auf der Folie:**

- Ermittlung 5.3 „Vom Plan zur Datenbank“ · A5-E3-01 … 08
- AB 5.3 „Vom Plan zur Datenbank“
- Verhör 5 nach Freischaltung durch die Lehrkraft
- Schema-Werkbank frei zum Üben: /werkzeug/werkbank
- Nächstes Video: Video 7 (optional) – Abi-Check Datenbanken: 10 Fallen und die Operatoren

**Sprechertext:**

Ab ins Lab! In Ermittlung 5.3 baust du aus dem Bauplan der Detektei die Datenbank – in der Schema-Werkbank, und zum Schluss verbindest du eine Tabelle mit sich selbst. Und vor der Prüfung lohnt sich Video 7: der Abi-Check mit allen zehn Fallen und den Operatoren.
