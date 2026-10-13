# Erklärvideo 2: Verbund ohne JOIN: Wie FROM a, b WHERE funktioniert

> ERZEUGT aus `video.json` mit `python3 werkzeuge/video_folien.py` – Änderungen in der video.json vornehmen.

*Vom Kreuzprodukt zum Verbund – mit zwei, drei Tabellen und zwei Fremdschlüsseln auf dieselbe Tabelle*

| | |
|---|---|
| **Akte** | Akte 2 · Spur der Räder |
| **Einsatz** | Akte 2, DS 3–4 · Ermittlungen 2.1 „Der rote Faden“ (Spurenbrett) und 2.2 „Nachtfahrten“ · AB 2.1, AB 2.2 · vor Verhör 2 |
| **Zielgruppe** | Informatik eA und gA (Datenbanken), Akte 2; Wiederholung vor Verhör 2, Klausur und Abitur |
| **Länge** | Ziel 8–10 min · Sprechtext ca. 6:31 min (bei 130 Wörtern/min, inkl. Pausen) |
| **Beispieldaten** | eigene Video-DB `video/schachturnier` (Verein, Spieler, Turnier, Partie); Spurenbrett-Bild mit der Eisdiele des Gastmodus – keine Lab-, AB-, Verhör- oder Klausuraufgabe |
| **Folien** | `DD_Video02_Verbund_ohne_JOIN_Folien.pptx` (13 Folien, Kamera-Zone unten rechts frei, Sprechertext in den Notizen) |

## Lernziele

- Erklären, dass FROM mit mehreren Tabellen das Kreuzprodukt bildet und die Verbundbedingung daraus die passenden Paare filtert
- Die Verbundbedingung als Fremdschlüssel = Primärschlüssel mit Tabellenpräfix formulieren
- Einen Weg durch das Relationenschema über drei Tabellen finden (n Tabellen → n − 1 Verbundbedingungen)
- Eine Tabelle mit Aliasen zweimal einbinden, wenn zwei Fremdschlüssel auf sie verweisen
- Die Fallen P2 (Verbund fehlt) und P7 (mehrdeutig, FK heißt anders als PK) erkennen

## Hinweise für die Aufnahme

- Alle SQL-Beispiele laufen auf der eigenen Video-DB `video/schachturnier`; das Spurenbrett-Bild zeigt die Eisdiele des Gastmodus (Sorte × Verkauf, eigene Auswahl) – nichts davon ist eine Lab-, AB- oder Verhöraufgabe.
- Geprüfte Werte: Spieler × Verein = 30 Zeilen; mit Verbundbedingung 8 (Keno Uphoff und Levke Wilms sind vereinslos); Pokal (TurnierNr 2) 6 Partien; Pokal Runde 1: Fenja–Keno 1-0, Levke–Tomke 0-1, Arne–Imke remis; Pause: Frühjahrsblitz Runde 3, Schwarz → Fenja, Arne, Smilla, Hauke.
- Spurenbrett-Bild: erzeugt mit scripts/video_bilder.js (Eisdiele, 4 Sorten × 6 Verkäufe, Bedingung angewendet).
- Pause-Folie: Im Schnitt den Hinweis „Video anhalten“ einblenden.

## YouTube

**Titel:** SQL-Verbund ohne JOIN: FROM a, b WHERE – Kreuzprodukt, Fremdschlüssel, Alias (Informatik-Abitur Niedersachsen) | Datendetektei #2

**Sichtbarkeit:** zuerst „nicht gelistet“, nach Freigabe öffentlich (Playlist „Datendetektei“).

**Beschreibung:**

```
Im Informatik-Abitur in Niedersachsen verbindest du Tabellen ohne JOIN: mit FROM a, b und einer Verbundbedingung im WHERE. In diesem Video siehst du, warum ohne Bedingung das Kreuzprodukt entsteht, wie du Fremdschlüssel = Primärschlüssel mit Tabellenpräfix schreibst, wie du über drei Tabellen gehst und wie du eine Tabelle mit zwei Aliasen einbindest, wenn zwei Fremdschlüssel auf sie zeigen (Weiß und Schwarz beim Schach). Dazu die Fallen P2 und P7.

Teil der Unterrichtsreihe „Datendetektei Weserstedt – Ermitteln mit Datenbanken“ (Informatik eA/gA, Abitur ab 2027).
Selbst ausprobieren (Spurenbrett mit der Eisdiele): https://datendetektei.frankjuchim.de/gast

Kapitel:
0:00 Einstieg
0:24 Fremdschlüssel
0:56 Kreuzprodukt
1:25 Verbundbedingung
2:26 Drei Tabellen
3:28 Alias
4:02 Jetzt du
5:16 Fallen
5:46 Merksätze
```

_Zeitmarken aus der Textlänge geschätzt – nach dem Schnitt anpassen._

**Tags:** Informatik Abitur, Niedersachsen, SQL, Verbund, Kreuzprodukt, Fremdschlüssel, Primärschlüssel, Alias, Self-Join, Datenbanken, Datendetektei

## Drehbuch

### Folie 1 · 0:00 – Verbund ohne JOIN: Wie FROM a, b WHERE funktioniert · Kapitel „Einstieg“

*Regie: Kamera unten rechts, Titelfolie im Hintergrund.*

**Sprechertext:**

Eine Tabelle allein verrät selten den Täter. Die Spur führt fast immer über mehrere Tabellen – im Abitur aber ganz ohne JOIN. Du schreibst einfach FROM a, b und eine Bedingung im WHERE. Nach diesem Video weißt du, was dabei im Hintergrund passiert, und du kannst zwei und drei Tabellen sicher verbinden.

### Folie 2 · 0:24 – Zwei Tabellen, ein Schlüssel · Kapitel „Fremdschlüssel“

**Auf der Folie:**

- `Verein(VereinNr, Name, Ort)`
- `Spieler(SpielerNr, Vorname, Nachname, Jahrgang, Wertung, ↑VereinNr)`
*Tabelle TABELLE VEREIN: VereinNr, Name, Ort (3 Zeilen)*
- *Fremdschlüssel:* `Spieler.VereinNr` (↑) verweist auf den Primärschlüssel `Verein.VereinNr`. · Imke hat VereinNr 1 → SK Weserspringer. Keno und Levke: NULL, kein Verein.

**Sprechertext:**

Wir bleiben beim Schachturnier aus Video 1. Neben der Tabelle Spieler gibt es die Tabelle Verein mit drei Vereinen. In Spieler steht nur die VereinNr – der Pfeil zeigt: Das ist ein Fremdschlüssel. Er verweist auf den Primärschlüssel VereinNr in der Tabelle Verein. Imke hat die VereinNr 1, sie spielt also beim SK Weserspringer. Den Vereinsnamen findest du aber nur in der anderen Tabelle. Genau dafür brauchst du den Verbund.

### Folie 3 · 0:56 – Schritt 1: FROM a, b bildet das Kreuzprodukt · Kapitel „Kreuzprodukt“

**Auf der Folie:**

*✘ OHNE VERBUNDBEDINGUNG · FALLE P2:*

```sql
SELECT Spieler.Vorname, Verein.Name
FROM Spieler, Verein
```
*Ergebnis: 30 Zeile(n) – Vorname, Name*

- *Jede mit jedem:* 10 Spieler × 3 Vereine = **30 Zeilen**. · Imke steht bei allen drei Vereinen – zwei davon sind falsch.

**Sprechertext:**

Was passiert, wenn du einfach beide Tabellen in FROM schreibst? Die Datenbank kombiniert jede Zeile von Spieler mit jeder Zeile von Verein. Das heißt Kreuzprodukt: zehn mal drei gleich dreißig Zeilen. Imke steht plötzlich bei allen drei Vereinen – nur eine Kombination stimmt. Fehlt die Verbundbedingung, ist das Falle P2. Im Abitur erkennst du sie oft daran, dass Zahlen viel zu groß werden.

### Folie 4 · 1:25 – Schritt 2: Fremdschlüssel = Primärschlüssel · Kapitel „Verbundbedingung“

**Auf der Folie:**

*SQL:*

```sql
SELECT Spieler.Vorname, Spieler.Nachname, Verein.Name
FROM Spieler, Verein
WHERE Spieler.VereinNr = Verein.VereinNr
```
*Ergebnis: 8 Zeile(n) – Vorname, Nachname, Name*

- *Verbundbedingung:* Nur Paare, bei denen FK und PK **übereinstimmen**. · Präfix `Tabelle.Spalte`, weil VereinNr in beiden Tabellen vorkommt. · Keno und Levke fehlen: NULL findet keinen Partner.

**Sprechertext:**

Jetzt kommt die Verbundbedingung ins WHERE: Spieler.VereinNr gleich Verein.VereinNr. Von den dreißig Paaren bleiben nur die, bei denen Fremdschlüssel und Primärschlüssel übereinstimmen – acht Zeilen, jede Person mit ihrem richtigen Verein. Weil VereinNr in beiden Tabellen vorkommt, schreibst du den Tabellennamen davor. Und schau, wer fehlt: Keno und Levke. Ihr Fremdschlüssel ist NULL, also finden sie keinen Partner und fallen im Verbund heraus.

### Folie 5 · 1:54 – Im Spurenbrett: Fäden, die passen, bleiben

*Regie: Bild groß zeigen; optional live im Gastmodus vorführen (Werkzeug Spurenbrett, Eisdiele).*

**Auf der Folie:**

*Bild: `bilder/spurenbrett.png`*
- *Eisdiele (Gastmodus):* 4 Sorten × 6 Verkäufe = 24 Fäden. · Bedingung `Sorte.SorteNr = Verkauf.SorteNr` → 3 Fäden bleiben; Karten ohne Faden fehlen im Ergebnis.

**Sprechertext:**

So sieht das im Spurenbrett der Datendetektei aus – hier mit der Eisdiele aus dem Gastmodus. Links ein paar Sorten, rechts ein paar Verkäufe. Ohne Bedingung spannt das Spurenbrett einen Faden von jeder Sorte zu jedem Verkauf: das Kreuzprodukt. Mit der Bedingung Sorte.SorteNr gleich Verkauf.SorteNr fallen alle Fäden ab, die nicht passen. Übrig bleibt genau der Verbund. Probier es selbst aus, das Spurenbrett gibt es auch im Lab.

### Folie 6 · 2:26 – Drei Tabellen: der Weg durchs Schema · Kapitel „Drei Tabellen“

**Auf der Folie:**

- `Verein(VereinNr, Name, Ort)`
- `Spieler(SpielerNr, Vorname, Nachname, Jahrgang, Wertung, ↑VereinNr)`
- `Turnier(TurnierNr, Bezeichnung, Datum, Ort)`
- `Partie(PartieNr, ↑TurnierNr, Runde, ↑WeissNr, ↑SchwarzNr, Ergebnis)`
1. Welche Spalten brauche ich – in welchen Tabellen stehen sie?
2. Weg suchen: über Fremdschlüssel von Tabelle zu Tabelle (Turnier → Partie → Spieler)
3. Je Übergang eine Verbundbedingung: **n Tabellen → n − 1 Bedingungen**

**Sprechertext:**

Oft liegen die gesuchten Daten weiter auseinander. Hier das ganze Schema unseres Turniers: Verein, Spieler, Turnier und Partie. Angenommen, du willst wissen, wer beim Pokal mit Weiß gespielt hat. Die Turnierbezeichnung steht in Turnier, der Name in Spieler – direkt verbunden sind die beiden nicht. Der Weg führt über Partie: Turnier zu Partie über TurnierNr, Partie zu Spieler über WeissNr. Faustregel: Bei n Tabellen brauchst du n minus eine Verbundbedingung.

### Folie 7 · 2:58 – Drei Tabellen in einer Abfrage

**Auf der Folie:**

*SQL:*

```sql
SELECT Turnier.Bezeichnung, Partie.Runde, Spieler.Nachname AS Weiss
FROM Turnier, Partie, Spieler
WHERE Turnier.TurnierNr = Partie.TurnierNr
  AND Partie.WeissNr = Spieler.SpielerNr
  AND Turnier.TurnierNr = 2
```
*Ergebnis: 6 Zeile(n) – Bezeichnung, Runde, Weiss*

- *Aufbau des WHERE:* zwei Verbundbedingungen (3 Tabellen) · dann die Fachbedingung: nur der Pokal · FK `WeissNr` heißt anders als PK `SpielerNr`

**Sprechertext:**

Und so sieht die Abfrage aus. In FROM stehen alle drei Tabellen. Im WHERE zuerst die zwei Verbundbedingungen: Turnier.TurnierNr gleich Partie.TurnierNr und Partie.WeissNr gleich Spieler.SpielerNr. Danach, mit AND angehängt, die eigentliche Frage: nur Turnier 2, der Pokal. Ergebnis: sechs Partien. Achte auf die zweite Bedingung – der Fremdschlüssel heißt WeissNr, der Primärschlüssel SpielerNr. Die Namen müssen nicht gleich sein, entscheidend ist, worauf der Fremdschlüssel verweist.

### Folie 8 · 3:28 – Zwei Fremdschlüssel auf dieselbe Tabelle · Kapitel „Alias“

**Auf der Folie:**

*SQL:*

```sql
SELECT w.Vorname AS Weiss, s.Vorname AS Schwarz, Partie.Ergebnis
FROM Partie, Spieler w, Spieler s
WHERE Partie.WeissNr = w.SpielerNr
  AND Partie.SchwarzNr = s.SpielerNr
  AND Partie.TurnierNr = 2
  AND Partie.Runde = 1
```
*Ergebnis: 3 Zeile(n) – Weiss, Schwarz, Ergebnis*

- *Spieler zweimal:* `Spieler w` und `Spieler s`: dieselbe Tabelle mit zwei Aliasen (ohne AS). · Jeder Fremdschlüssel bekommt seine eigene Kopie.

**Sprechertext:**

Jetzt der Klassiker, der im Abitur gern vorkommt: Partie hat zwei Fremdschlüssel auf dieselbe Tabelle – WeissNr und SchwarzNr. Wenn du beide Namen sehen willst, brauchst du die Tabelle Spieler zweimal. Dafür gibst du ihr in FROM zwei Aliase: Spieler w und Spieler s – im Abitur-Stil ohne AS. Jetzt verbindest du WeissNr mit w.SpielerNr und SchwarzNr mit s.SpielerNr. Ergebnis für Runde 1 des Pokals: Fenja gegen Keno, Levke gegen Tomke, Arne gegen Imke.

### Folie 9 · 4:02 – Kurz anhalten: Jetzt du! · Kapitel „Jetzt du“

**Auf der Folie:**

> Gesucht: Vorname und Nachname aller, die beim **Frühjahrsblitz (TurnierNr 1)** in **Runde 3 mit Schwarz** gespielt haben – dazu der **Name ihres Vereins**.
- `Spieler(SpielerNr, Vorname, Nachname, Jahrgang, Wertung, ↑VereinNr)`
- `Partie(PartieNr, ↑TurnierNr, Runde, ↑WeissNr, ↑SchwarzNr, Ergebnis)`
- `Verein(VereinNr, Name, Ort)`
- *Tipp:* Wie viele Tabellen – und wie viele Verbundbedingungen? · Welcher Fremdschlüssel steht für Schwarz?

**Sprechertext:**

Jetzt du. Gesucht sind alle, die beim Frühjahrsblitz in Runde 3 mit Schwarz gespielt haben, mit Vor- und Nachname und dem Namen ihres Vereins. Überleg zuerst: Welche Tabellen brauchst du, wie viele Verbundbedingungen, und welcher Fremdschlüssel steht für Schwarz? Halte das Video an und schreib die Abfrage auf.

*(ca. 25 s Pause zum Mitdenken – im Schnitt den Hinweis „Video anhalten“ einblenden)*

### Folie 10 · 4:49 – Auflösung

**Auf der Folie:**

*SQL:*

```sql
SELECT Spieler.Vorname, Spieler.Nachname, Verein.Name
FROM Partie, Spieler, Verein
WHERE Partie.SchwarzNr = Spieler.SpielerNr
  AND Spieler.VereinNr = Verein.VereinNr
  AND Partie.TurnierNr = 1
  AND Partie.Runde = 3
```
*Ergebnis: 4 Zeile(n) – Vorname, Nachname, Name*

- *Typische Fehler:* `WeissNr` statt `SchwarzNr` – falscher FK-Pfad (P2) · Verbund zu Verein vergessen → 12 statt 4 Zeilen (P2) · `VereinNr` ohne Präfix → mehrdeutig (P7)

**Sprechertext:**

Die Auflösung: drei Tabellen – Partie, Spieler und Verein – also zwei Verbundbedingungen. Partie.SchwarzNr gleich Spieler.SpielerNr und Spieler.VereinNr gleich Verein.VereinNr. Dazu TurnierNr gleich 1 und Runde gleich 3. Ergebnis: vier Personen. Wer die zweite Verbundbedingung vergisst, bekommt zwölf Zeilen, weil jede Person mit allen drei Vereinen kombiniert wird. Und wer WeissNr statt SchwarzNr nimmt, findet die falschen Leute.

### Folie 11 · 5:16 – Die Fallen beim Verbund · Kapitel „Fallen“

**Auf der Folie:**

- **P2** Verbund fehlt oder vervielfacht: Verbundbedingung vergessen (Kreuzprodukt), falscher FK-Pfad – oder ein Verbund über zwei 1:n-Beziehungen vervielfacht Zeilen und verfälscht COUNT/SUM.
- **P7** Mehrdeutig oder falsch benannt: Präfix fehlt bei gleichnamigen Spalten; FK heißt anders als der PK (`WeissNr` → `SpielerNr`); Alias falsch verwendet.
*✘ P7 · VereinNr – welche?:*

```sql
SELECT Vorname, Name
FROM Spieler, Verein
WHERE VereinNr = VereinNr
```


**Sprechertext:**

Zwei Fallen gehören zum Verbund. P2: Die Verbundbedingung fehlt, du gehst über den falschen Fremdschlüssel – oder du verbindest so viele Tabellen, dass sich Zeilen vervielfachen und Summen falsch werden. P7: Mehrdeutige Spaltennamen. Unten siehst du VereinNr gleich VereinNr ohne Präfix – die Datenbank weiß nicht, welche gemeint ist, und meldet einen Fehler. Und denk dran: Ein Fremdschlüssel darf anders heißen als der Primärschlüssel.

### Folie 12 · 5:46 – Das nimmst du mit · Kapitel „Merksätze“

**Auf der Folie:**

- `FROM a, b` bildet das Kreuzprodukt – erst das WHERE macht daraus den Verbund.
- Verbundbedingung: Fremdschlüssel = Primärschlüssel, immer mit Präfix.
- n Tabellen → n − 1 Verbundbedingungen, dann die Fachbedingungen mit AND.
- Zwei FKs auf eine Tabelle → Tabelle zweimal mit Alias: `Spieler w, Spieler s`.
- Zeilen mit NULL im Fremdschlüssel fallen im Verbund heraus.

**Sprechertext:**

Das nimmst du mit: FROM a, b bildet das Kreuzprodukt, erst das WHERE macht daraus den Verbund. Die Verbundbedingung lautet Fremdschlüssel gleich Primärschlüssel, immer mit Präfix. Bei n Tabellen brauchst du n minus eine Verbundbedingung. Zeigen zwei Fremdschlüssel auf dieselbe Tabelle, nimmst du sie zweimal mit Alias. Und Zeilen mit NULL im Fremdschlüssel fallen heraus.

### Folie 13 · 6:11 – Weiter im Lab

**Auf der Folie:**

- Ermittlung 2.1 „Der rote Faden“ · A2-E1-01 … 08
- Ermittlung 2.2 „Nachtfahrten“ · A2-E2-01 … 08
- AB 2.1 „Der rote Faden“ und AB 2.2 „Nachtfahrten“
- Verhör 2 nach Freischaltung durch die Lehrkraft
- Nächstes Video: Video 3 – GROUP BY und HAVING, so wie im Abitur

**Sprechertext:**

Ab ins Lab! In Akte 2 folgst du der Spur der Räder – mit dem Spurenbrett in Ermittlung 2.1 und den Nachtfahrten in 2.2. Im nächsten Video geht es ums Zählen und Summieren: GROUP BY und HAVING, so wie im Abitur. Bis dann!
