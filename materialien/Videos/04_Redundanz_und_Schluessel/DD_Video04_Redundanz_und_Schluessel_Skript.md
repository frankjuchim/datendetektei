# Erklärvideo 4: Redundanz, Anomalien und gute Schlüssel

> ERZEUGT aus `video.json` mit `python3 werkzeuge/video_folien.py` – Änderungen in der video.json vornehmen.

*Warum eine zusammengelegte Liste Daten verliert – und woran du einen tragfähigen Schlüssel erkennst*

| | |
|---|---|
| **Akte** | Akte 4 · Chaos im Vereinsarchiv |
| **Einsatz** | Akte 4, DS 7–8 · Ermittlungen 4.1 „Die Excel-Liste“ (Anomalie-Simulator) und 4.2 „Ordnung ins Archiv“ (Zerlegungs-Puzzle, Schema-Werkbank) · AB 4.1, AB 4.2 · vor Verhör 4 |
| **Zielgruppe** | Informatik eA und gA (Datenbanken), Akte 4; Wiederholung vor Verhör 4, Klausur und Abitur |
| **Länge** | Ziel 8–10 min · Sprechtext ca. 6:19 min (bei 130 Wörtern/min, inkl. Pausen) |
| **Beispieldaten** | eigene Ausleihliste einer Kanu-AG (6 Zeilen, Nachlieferung Zeile 7) – nicht die TuS-Liste des Labs, keine AB-, Verhör- oder Klausuraufgabe; Werkbank-Bild mit eigenem Entwurf |
| **Folien** | `DD_Video04_Redundanz_und_Schluessel_Folien.pptx` (12 Folien, Kamera-Zone unten rechts frei, Sprechertext in den Notizen) |

## Lernziele

- Redundanz in einer zusammengelegten Tabelle erkennen und benennen
- Änderungs-, Einfüge- und Löschanomalie **am konkreten Datensatz** erläutern (Operator erläutern, P10)
- Schlüsselkriterien anwenden: eindeutig für alle denkbaren Daten, nie NULL, minimal, möglichst unveränderlich
- Die Ausschnitt-Falle vermeiden: Eindeutigkeit nie nur aus den sichtbaren Zeilen schließen (P8)
- Eine zusammengelegte Tabelle in Relationen mit Primär- und Fremdschlüsseln zerlegen

## Hinweise für die Aufnahme

- Beispiel: eigene Ausleihliste einer Kanu-AG (Rieke Haake, Ole Rippen, Jule Tebbe – Namen aus namen.json, frei erfunden); die TuS-Mitgliederliste des Labs, die Musikschul-Rohliste (Verhör 4) und Prüfungskontexte kommen nicht vor.
- Geprüft von Hand an der Tabelle: K1 steht in Zeilen 1, 3, 5 (Zweier, 2 Plätze); Ole Rippen 10a in Zeilen 2, 3; K3 nur in Zeile 4; (Datum, Name) ist in den 6 Zeilen eindeutig, Nachlieferung Zeile 7 (2026-05-08, K3, Rieke Haake) bricht das.
- Werkbank-Bild: Entwurf Kanu/Person/Ausleihe mit scripts/video_bilder.js (Schema-Werkbank ohne Prüfung).
- Musterantworten sind sachlich formuliert; die Abi-Operatoren stehen fett.

## YouTube

**Titel:** Redundanz und Anomalien (Änderung, Einfügen, Löschen) + Schlüssel richtig wählen (Informatik-Abitur Niedersachsen) | Datendetektei #4

**Sichtbarkeit:** zuerst „nicht gelistet“, nach Freigabe öffentlich (Playlist „Datendetektei“).

**Beschreibung:**

```
Im Informatik-Abitur in Niedersachsen kommt seit Jahren eine „zusammengelegte Tabelle“ vor, an der du Redundanz und Anomalien erläutern sollst. In diesem Video siehst du an einer Ausleihliste, wie Änderungs-, Einfüge- und Löschanomalie entstehen, wie du sie am Datensatz erläuterst (statt sie nur zu benennen), welche Kriterien ein guter Schlüssel erfüllt, warum du Eindeutigkeit nie aus einem Datenausschnitt schließen darfst und wie du die Liste zerlegst. Dazu die Fallen P8 und P10.

Teil der Unterrichtsreihe „Datendetektei Weserstedt – Ermitteln mit Datenbanken“ (Informatik eA/gA, Abitur ab 2027).

Kapitel:
0:00 Einstieg
0:23 Redundanz
0:59 Anomalien
2:00 Jetzt du
3:18 Schlüssel
4:35 Zerlegen
5:17 Fallen
5:40 Merksätze
```

_Zeitmarken aus der Textlänge geschätzt – nach dem Schnitt anpassen._

**Tags:** Informatik Abitur, Niedersachsen, Datenbanken, Redundanz, Anomalie, Änderungsanomalie, Einfügeanomalie, Löschanomalie, Primärschlüssel, Schlüssel, Datendetektei

## Drehbuch

### Folie 1 · 0:00 – Redundanz, Anomalien und gute Schlüssel · Kapitel „Einstieg“

*Regie: Kamera unten rechts, Titelfolie im Hintergrund.*

**Sprechertext:**

Viele Vereine und AGs verwalten ihre Daten in einer einzigen großen Liste. Das geht eine Weile gut – bis Daten sich widersprechen oder plötzlich verschwinden. In diesem Video findest du heraus, warum das passiert, wie du es im Abitur am Datensatz erläuterst und woran du einen guten Schlüssel erkennst.

### Folie 2 · 0:23 – Eine Liste für alles · Kapitel „Redundanz“

**Auf der Folie:**

*Tabelle AUSLEIHLISTE DER KANU-AG (TABELLENKALKULATION): Zeile, Datum, Kanu, Typ, Plaetze, Name, Klasse (6 Zeilen)*
- *Redundanz:* Dieselbe Information steht mehrfach: · „K1 ist ein Zweier mit 2 Plätzen“ in Zeile 1, 3, 5 · „Ole Rippen ist in der 10a“ in Zeile 2 und 3

**Sprechertext:**

Hier die Ausleihliste einer Kanu-AG, geführt in einer Tabellenkalkulation. Jede Zeile ist eine Ausleihe: wann, welches Kanu, welcher Typ, wie viele Plätze, wer, aus welcher Klasse. Schau genau hin: Dass K1 ein Zweier mit zwei Plätzen ist, steht dreimal da – in Zeile 1, 3 und 5. Dass Ole Rippen in die 10a geht, steht zweimal da. Dieselbe Information mehrfach zu speichern, heißt Redundanz. Redundanz allein ist noch kein Fehler – aber sie ist die Ursache für Anomalien.

### Folie 3 · 0:59 – Änderungsanomalie · Kapitel „Anomalien“

**Auf der Folie:**

*Tabelle K1 WIRD ZUM DREIER UMGEBAUT – NUR ZEILE 1 UND 3 WERDEN GEÄNDERT: Zeile, Datum, Kanu, Typ, Plaetze, Name, Klasse (3 Zeilen)*
> Jetzt widersprechen sich die Zeilen: Hat K1 zwei oder drei Plätze?
- *Änderungsanomalie:* Eine Information muss an **mehreren Stellen** geändert werden. · Wird eine Stelle vergessen, ist der Bestand **inkonsistent**.

**Sprechertext:**

Erste Anomalie: die Änderungsanomalie. Die AG baut Kanu K1 zu einem Dreier um. In der Liste müssen jetzt alle Zeilen mit K1 geändert werden. Wer nur die ersten beiden erwischt und Zeile 5 vergisst, hat einen Widerspruch: Ist K1 ein Zweier oder ein Dreier? Die Daten sind inkonsistent. Ursache ist die Redundanz – dieselbe Information steht an mehreren Stellen.

### Folie 4 · 1:26 – Einfüge- und Löschanomalie

**Auf der Folie:**

- *Einfügeanomalie:* Die AG kauft ein neues Kanu **K4 (Einer)**. Solange niemand es ausleiht, gibt es keine Zeile dafür – K4 lässt sich nur mit leeren Feldern für Datum, Name und Klasse eintragen.
- *Löschanomalie:* Ole Rippen verlässt die AG; seine Zeilen 2 und 3 werden gelöscht. Dabei geht **nichts** über ein Kanu verloren – aber wird später Zeile 4 gelöscht, ist auch die Information „K3 ist ein Zweier“ weg.

**Sprechertext:**

Die zweite Anomalie entsteht beim Einfügen. Die AG kauft ein neues Kanu, K4. Solange es niemand ausgeliehen hat, gibt es keine Zeile, in die es passt – du müsstest Datum, Name und Klasse leer lassen. Die dritte Anomalie entsteht beim Löschen. K3 kommt nur in Zeile 4 vor. Wird diese Ausleihe gelöscht, verschwindet mit ihr auch die Information, dass K3 ein Zweier mit zwei Plätzen ist. Man wollte eine Ausleihe löschen und verliert ein Kanu.

### Folie 5 · 2:00 – Kurz anhalten: Jetzt du! · Kapitel „Jetzt du“

**Auf der Folie:**

> Jule Tebbe wechselt in die Klasse **10b**. **Erläutere** am Datensatz, welche Anomalie dabei droht.
*Tabelle AUSLEIHLISTE DER KANU-AG (TABELLENKALKULATION): Zeile, Datum, Kanu, Typ, Plaetze, Name, Klasse (6 Zeilen)*
- *Tipp:* „Erläutern“ heißt: konkrete Zeilen nennen und die Folge beschreiben – nicht nur den Begriff.

**Sprechertext:**

Jetzt du. Jule Tebbe wechselt in die 10b. Erläutere am Datensatz, welche Anomalie dabei droht. Achtung, erläutern heißt im Abitur: Nenn die konkreten Zeilen und beschreib, was passiert – der Begriff allein reicht nicht. Halte das Video an.

*(ca. 30 s Pause zum Mitdenken – im Schnitt den Hinweis „Video anhalten“ einblenden)*

### Folie 6 · 2:48 – Auflösung: benennen reicht nicht

**Auf der Folie:**

- *✘ Nur benannt (P10):* „Es entsteht eine Änderungsanomalie.“
- *✔ Am Datensatz erläutert:* Jules Klasse steht redundant in **Zeile 4 und 6**. Wird beim Klassenwechsel nur Zeile 4 auf 10b geändert, steht in Zeile 6 weiter 9b – die Liste widerspricht sich. Das ist eine **Änderungsanomalie**.

**Sprechertext:**

Die Auflösung. Oben eine Antwort, die nur den Begriff nennt: Es entsteht eine Änderungsanomalie. Das ist richtig, bringt beim Operator erläutern aber kaum Punkte – Falle P10, Operator verfehlt. Unten die vollständige Antwort: Jules Klasse steht redundant in Zeile 4 und 6. Wird nur eine Zeile geändert, steht in der anderen weiter 9b – die Liste widerspricht sich. So eine Antwort nennt Ursache, Zeilen und Folge.

### Folie 7 · 3:18 – Was ist ein guter Schlüssel? · Kapitel „Schlüssel“

**Auf der Folie:**

1. **eindeutig** – für alle denkbaren Daten, nicht nur für die sichtbaren
2. **nie NULL** – jede Zeile hat einen Wert
3. **minimal** – kein Attribut lässt sich weglassen
4. **möglichst unveränderlich** – Namen und Klassen ändern sich, Nummern nicht
- *In der Kanu-Liste:* Kanu allein? Nein – K1 dreimal · Name allein? Nein – Rieke zweimal · Datum + Kanu? Nur, wenn ein Kanu höchstens einmal am Tag ausgeliehen wird

**Sprechertext:**

Um die Liste zu zerlegen, brauchst du gute Schlüssel. Ein Schlüssel muss eindeutig sein – und zwar für alle Daten, die vorkommen könnten, nicht nur für die, die du gerade siehst. Er darf nie NULL sein. Er soll minimal sein, also kein überflüssiges Attribut enthalten. Und er sollte sich möglichst nicht ändern. In unserer Liste scheidet Kanu allein aus, Name allein auch. Datum und Kanu zusammen wären nur dann ein Schlüssel, wenn ein Kanu höchstens einmal pro Tag ausgeliehen wird – das musst du begründen, nicht vermuten.

### Folie 8 · 3:59 – Die Ausschnitt-Falle

**Auf der Folie:**

> In den 6 Zeilen ist **(Datum, Name)** eindeutig. Dann wird nachgeliefert:
*Tabelle NACHLIEFERUNG: Zeile, Datum, Kanu, Typ, Plaetze, Name, Klasse (2 Zeilen)*
> Rieke war am 8. Mai zweimal paddeln – (Datum, Name) ist **kein** Schlüssel.
- *Falle P8:* Eindeutigkeit nie aus einem Datenausschnitt schließen. · Begründe mit der Bedeutung: Kann es das **in der Realität** zweimal geben?

**Sprechertext:**

Und hier die gemeinste Falle beim Schlüssel, die Ausschnitt-Falle. In den sechs Zeilen kommt jede Kombination aus Datum und Name nur einmal vor. Ist das also ein Schlüssel? Dann wird Zeile 7 nachgeliefert: Rieke war am achten Mai zweimal auf dem Wasser, erst mit K1, dann mit K3. Schon ist die Kombination doppelt. Daraus folgt: Schließ Eindeutigkeit nie aus den sichtbaren Zeilen. Begründe mit der Bedeutung – kann es das in der Realität zweimal geben? Das ist Falle P8.

### Folie 9 · 4:35 – Zerlegen: jede Information genau einmal · Kapitel „Zerlegen“

*Regie: Links die Schema-Werkbank der Datendetektei mit dem fertigen Entwurf, rechts die Kurzschreibweise.*

**Auf der Folie:**

*Bild: `bilder/werkbank.png`*
- `Kanu(KanuNr, Typ, Plaetze)`
- `Person(PersonNr, Name, Klasse)`
- `Ausleihe(AusleihNr, Datum, ↑KanuNr, ↑PersonNr)`

**Sprechertext:**

Die Lösung ist das Zerlegen. Alles, was nur vom Kanu abhängt, kommt in die Relation Kanu, alles, was nur von der Person abhängt, in Person. Die Ausleihe verweist mit zwei Fremdschlüsseln darauf. Jetzt steht der Typ von K1 nur noch einmal da, ein neues Kanu bekommt einfach eine eigene Zeile, und das Löschen einer Ausleihe lässt das Kanu stehen. Als Schlüssel der Ausleihe nehmen wir eine eigene Nummer – damit sind auch zwei Fahrten am selben Tag kein Problem. In der Schema-Werkbank der Datendetektei kannst du so etwas selbst bauen.

### Folie 10 · 5:17 – Die Fallen dieses Videos · Kapitel „Fallen“

**Auf der Folie:**

- **P8** Schlüssel falsch beurteilt: Eindeutigkeit aus dem Ausschnitt geschlossen; NULL im Schlüssel; nicht minimal; Mehrfachvorkommen übersehen.
- **P10** Operator verfehlt: Anomalie nur benannt statt am Datensatz erläutert; „begründen“ ohne Begründung; Analyse ohne Sachzusammenhang.
- **P9** Zerlegung fehlerhaft: Fremdschlüssel auf der falschen Seite oder vergessen – die Relationen lassen sich nicht mehr verbinden.

**Sprechertext:**

Die Fallen dieses Videos: P8, der Schlüssel wird falsch beurteilt – vor allem mit der Ausschnitt-Falle. P10, der Operator wird verfehlt: Eine Anomalie nur zu benennen ist keine Erläuterung. Und beim Zerlegen P9: Wenn ein Fremdschlüssel fehlt oder auf der falschen Seite steht, kannst du die Relationen hinterher nicht mehr verbinden.

### Folie 11 · 5:40 – Das nimmst du mit · Kapitel „Merksätze“

**Auf der Folie:**

- Redundanz = dieselbe Information mehrfach gespeichert – sie verursacht Anomalien.
- Änderung: mehrere Stellen ändern; Einfügen: Daten passen nicht ohne andere; Löschen: Information geht mit verloren.
- Anomalien immer am Datensatz erläutern: Zeilen, Ursache, Folge.
- Schlüssel: eindeutig für alle denkbaren Daten, nie NULL, minimal, stabil.
- Zerlegen: jede Information genau einmal, verbunden über Fremdschlüssel.

**Sprechertext:**

Das nimmst du mit: Redundanz heißt, dieselbe Information steht mehrfach – sie verursacht Anomalien beim Ändern, Einfügen und Löschen. Erläutere Anomalien immer am Datensatz. Ein Schlüssel ist eindeutig für alle denkbaren Daten, nie NULL, minimal und stabil. Und beim Zerlegen steht jede Information genau einmal, verbunden über Fremdschlüssel.

### Folie 12 · 6:02 – Weiter im Lab

**Auf der Folie:**

- Ermittlung 4.1 „Die Excel-Liste“ · A4-E1-01 … 08
- Ermittlung 4.2 „Ordnung ins Archiv“ · A4-E2-01 … 08
- AB 4.1 „Die Excel-Liste“ und AB 4.2 „Ordnung ins Archiv“
- Verhör 4 nach Freischaltung durch die Lehrkraft
- Nächstes Video: Video 5 – ER-Modelle nach den Ergänzenden Hinweisen

**Sprechertext:**

Ab ins Lab! Im Vereinsarchiv wartet eine echte Chaos-Liste auf dich – mit dem Anomalie-Simulator in Ermittlung 4.1 und dem Zerlegungs-Puzzle in 4.2. Im nächsten Video planen wir Datenbanken von Anfang an richtig: mit ER-Modellen in Chen-Notation.
