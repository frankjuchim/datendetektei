# Erklärvideo 0: So ermittelst du in der Datendetektei

> ERZEUGT aus `video.json` mit `python3 werkzeuge/video_folien.py` – Änderungen in der video.json vornehmen.

*Anmelden, Stadtplan, Ermittlungen, Konsole mit Ausführen, Prüfen und Zeitlupe, Verhör und Warm-up*

| | |
|---|---|
| **Akte** | Start (vor Akte 1) |
| **Einsatz** | Start, DS 1 (optional) · vor Ermittlung 1.1; als Link im Kurs bereitstellen |
| **Zielgruppe** | alle Schülerinnen und Schüler (eA und gA) beim ersten Start |
| **Länge** | Ziel 3–4 min · Sprechtext ca. 4:44 min (bei 130 Wörtern/min, inkl. Pausen) |
| **Beispieldaten** | Bildschirmfotos der Plattform (Test-Server, Schülerin „Mika R.“, Kurs „Inf-LK 12“, ohne Lernstand); Konsole und Zeitlupe mit einer eigenen Eisdiele-Abfrage – keine Lösung einer Lab-, Verhör- oder Warm-up-Aufgabe |
| **Folien** | `DD_Video00_So_ermittelst_du_Folien.pptx` (12 Folien, Kamera-Zone unten rechts frei, Sprechertext in den Notizen) |

## Lernziele

- Sich über das Portal InfoLabs anmelden und die Datendetektei öffnen
- Stadtplan, Akten und Ermittlungen finden und eine Ermittlung beginnen
- In der Konsole Abfragen ausführen, prüfen und mit der Zeitlupe untersuchen
- Verhör, Warm-up, Training und „Deine Fallen“ (P1–P10) einordnen

## Hinweise für die Aufnahme

- Alle Bilder sind mit scripts/video_bilder.js aus der echten App im Test-Server der E2E-Tests erzeugt (Fantasie-Schülerin „Mika R.“, kein echter Kurs, keine echten Codes).
- Gezeigt werden nur Übersichten (Stadtplan, Akte, Kopf der Ermittlung, Kopf des Warm-up-Trainers, Verhör-Start) – keine Aufgabenlösungen; Konsole und Zeitlupe mit der eigenen Abfrage „Sorten ab 1,70 €“ auf der Eisdiele.
- Das Portal selbst wird nicht abgefilmt; die Anmeldung wird nur erklärt.

## YouTube

**Titel:** So ermittelst du in der Datendetektei – Plattform-Rundgang (Informatik Datenbanken) | Datendetektei #0

**Sichtbarkeit:** zuerst „nicht gelistet“, nach Freigabe öffentlich (Playlist „Datendetektei“).

**Beschreibung:**

```
Ein kurzer Rundgang durch die Datendetektei Weserstedt: Anmeldung über das Portal InfoLabs, der Stadtplan mit den Akten, Ermittlungen mit Aufgaben, die Ermittlungskonsole mit Ausführen, Prüfen und Zeitlupe, das Verhör am Ende jeder Akte sowie Warm-up und Training. Danach kannst du sofort mit Akte 1 loslegen.

Teil der Unterrichtsreihe „Datendetektei Weserstedt – Ermitteln mit Datenbanken“ (Informatik eA/gA, Abitur ab 2027).
Ohne Anmeldung ausprobieren: https://datendetektei.frankjuchim.de/gast

Kapitel:
0:00 Einstieg
0:17 Anmelden
0:42 Stadtplan und Akten
1:48 Konsole
2:48 Fallen
3:13 Jetzt du
3:50 Verhör und Warm-up
4:14 Merksätze
```

_Zeitmarken aus der Textlänge geschätzt – nach dem Schnitt anpassen._

**Tags:** Informatik, Datenbanken, SQL, Datendetektei, Plattform, Tutorial, InfoLabs, Unterricht

## Drehbuch

### Folie 1 · 0:00 – So ermittelst du in der Datendetektei · Kapitel „Einstieg“

*Regie: Kamera unten rechts, Titelfolie im Hintergrund.*

**Sprechertext:**

Willkommen im Ermittlerteam! In drei Minuten zeige ich dir, wie du dich in der Datendetektei zurechtfindest: wo du deine Fälle findest, wie du Abfragen ausführst und prüfst und was es mit Verhören und Warm-ups auf sich hat.

### Folie 2 · 0:17 – Anmelden über das Portal · Kapitel „Anmelden“

**Auf der Folie:**

*Bild: `bilder/start.png`*
- *So geht's:* Portal **InfoLabs** öffnen · mit **Kurscode** und **persönlichem Code** anmelden · „Datendetektei“ wählen – fertig

**Sprechertext:**

Angemeldet wirst du nicht hier, sondern über das Portal InfoLabs – mit dem Kurscode deines Kurses und deinem persönlichen Code. Den bekommst du von deiner Lehrkraft, und du verrätst ihn niemandem. Im Portal wählst du die Datendetektei, und schon bist du drin. Ohne Anmeldung kannst du übrigens im Gastmodus einen kleinen Probefall ausprobieren.

### Folie 3 · 0:42 – Der Stadtplan · Kapitel „Stadtplan und Akten“

**Auf der Folie:**

*Bild: `bilder/stadtplan.png`*
- *Akten:* Jeder Ort ist eine **Akte** mit eigener Datenbank. · Was im Nebel liegt, schaltet deine Lehrkraft später frei. · Rechts: dein Rang und deine Punkte.

**Sprechertext:**

Nach der Anmeldung landest du auf dem Stadtplan von Weserstedt. Jeder Ort ist eine Akte – ein Fall mit einer eigenen Datenbank: das Fundbüro, die Hafenkante, der Festplatz und so weiter. Was noch im Nebel liegt, schaltet deine Lehrkraft frei, wenn ihr so weit seid. Rechts siehst du deinen Rang und deine Punkte.

### Folie 4 · 1:06 – Akte und Ermittlungen

**Auf der Folie:**

*Bild: `bilder/akte.png`*
- *Ermittlungen:* Je Doppelstunde eine **Ermittlung** mit acht Aufgaben (★ bis ★★★). · CC = Cold Case: ohne Punkte, für Profis.

**Sprechertext:**

Tippst du auf eine Akte, siehst du ihre Ermittlungen – eine pro Doppelstunde. Jede Ermittlung hat acht Aufgaben, von einem Stern bis drei Sterne, und am Ende einen Cold Case für alle, die noch mehr wollen. Unten wartet das Verhör der Akte, dazu gleich mehr.

### Folie 5 · 1:27 – In der Ermittlung

**Auf der Folie:**

*Bild: `bilder/ermittlung.png`*
- *Aufbau:* Oben die Aufgabennummern, darunter Briefing und Ermittler-Notizen. · Die Datenbank der Akte kannst du frei erkunden („Freie Ermittlung“).

**Sprechertext:**

In der Ermittlung stehen oben die Aufgaben, darunter das Briefing von Edda Lorenz, der Chefin der Detektei, und Ermittler-Notizen mit den wichtigsten Begriffen. Die Datenbank der Akte kannst du jederzeit in der freien Ermittlung erkunden. Arbeite die Aufgaben der Reihe nach ab – sie bauen aufeinander auf.

### Folie 6 · 1:48 – Die Konsole: Ausführen, Prüfen, Zeitlupe · Kapitel „Konsole“

*Regie: Hier die Eisdiele aus dem Gastmodus mit einer eigenen Abfrage.*

**Auf der Folie:**

*Bild: `bilder/konsole.png`*
- *Drei Knöpfe:* **Ausführen**: Ergebnis ansehen, so oft du willst · **Prüfen**: zählt für die Punkte – Tipps kosten etwas · **Zeitlupe**: Klausel für Klausel nachverfolgen

**Sprechertext:**

Das Herz der Detektei ist die Ermittlungskonsole. Links schreibst du deine Abfrage, rechts siehst du das Schema der Datenbank – tipp auf eine Spalte, um sie einzufügen. Mit Ausführen siehst du das Ergebnis, so oft du willst. Mit Prüfen gibst du deine Lösung ab; das zählt für die Punkte. Wenn du feststeckst, gibt es Tipps, die aber etwas Punkte kosten. Und der Knopf Zeitlupe öffnet ein Werkzeug, mit dem du nachverfolgst, was die Datenbank Schritt für Schritt tut.

### Folie 7 · 2:24 – Die Zeitlupe

**Auf der Folie:**

*Bild: `bilder/zeitlupe.png`*
- *Schritt WHERE:* Die Zeitlupe zeigt, welche Zeilen eine Klausel behält und welche wegfallen – hier 6 von 10 Sorten.

**Sprechertext:**

In der Zeitlupe läuft deine Abfrage in Zeitlupe ab: erst FROM, dann WHERE und so weiter. Bei jedem Schritt siehst du, welche Zeilen übrig bleiben und welche wegfallen – hier sechs von zehn Sorten. Wenn dein Ergebnis nicht stimmt, findest du so meist sofort die Stelle, an der es schiefgeht.

### Folie 8 · 2:48 – Rückmeldungen mit Fallen-Nummer · Kapitel „Fallen“

**Auf der Folie:**

> Wenn etwas nicht stimmt, nennt die Rückmeldung die **Falle** – überall mit derselben Nummer:
- **P6** Bedingungslogik: Beispiel einer Rückmeldung: „AND bindet stärker als OR. Setz Klammern, damit klar ist, was zusammengehört.“
> Unter **Deine Fallen** im Profil siehst du, welche Fallen dich am häufigsten erwischen – genau die übst du im Training.

**Sprechertext:**

Wenn eine Abfrage nicht stimmt, bekommst du eine Rückmeldung – oft mit einer Fallen-Nummer von P1 bis P10, zum Beispiel P6 für Bedingungslogik. Diese Nummern begegnen dir überall: in den Videos, auf den Arbeitsblättern und in deinem Profil. Unter Deine Fallen siehst du, welche dich am häufigsten erwischen. Genau die übst du dann gezielt im Training.

### Folie 9 · 3:13 – Kurz anhalten: Jetzt du! · Kapitel „Jetzt du“

**Auf der Folie:**

> Öffne die Datendetektei – oder ohne Anmeldung den **Gastmodus** – und führe in der Konsole deine erste Abfrage aus:
*EISDIELE (GASTMODUS):*

```sql
SELECT Name, Preis
FROM Sorte
WHERE Preis < 1.6
ORDER BY Name
```

> Öffne danach die **Zeitlupe**: Wie viele Sorten fallen bei WHERE weg?

**Sprechertext:**

Jetzt du: Öffne die Datendetektei oder ohne Anmeldung den Gastmodus und führe diese Abfrage auf der Eisdiele aus. Danach öffnest du die Zeitlupe und schaust nach, wie viele Sorten bei WHERE wegfallen. Halte das Video an.

*(ca. 20 s Pause zum Mitdenken – im Schnitt den Hinweis „Video anhalten“ einblenden)*

### Folie 10 · 3:50 – Verhör, Warm-up und Training · Kapitel „Verhör und Warm-up“

**Auf der Folie:**

*Bild: `bilder/verhoer.png`*
*Bild: `bilder/warmup.png`*
- *Am Ende jeder Akte:* **Verhör**: Aufgaben im Abitur-Stil, auf Zeit, ohne Feedback · **Warm-up**: 5 Minuten Karteikarten zum Einstieg · **Training**: deine Fallen gezielt üben

**Sprechertext:**

Am Ende jeder Akte steht ein Verhör: Aufgaben im Abitur-Stil, auf Zeit und ohne Feedback – wie eine kleine Prüfung. Gewinnst du es, bekommt die Pinnwand der Detektei ein neues Beweisstück. Zum Stundenbeginn gibt es Warm-ups, fünf Minuten Karteikarten zu allem, was du schon kennst. Und im Training übst du gezielt deine Fallen.

### Folie 11 · 4:14 – Das nimmst du mit · Kapitel „Merksätze“

**Auf der Folie:**

- Anmelden über das Portal InfoLabs mit Kurscode und persönlichem Code.
- Stadtplan → Akte → Ermittlung → Aufgaben der Reihe nach.
- Erst **Ausführen**, dann **Prüfen**; bei Fehlern die **Zeitlupe**.
- Fallen-Nummern P1–P10 zeigen, was schiefging – „Deine Fallen“ im Profil.
- Verhör am Ende jeder Akte, Warm-up zum Einstieg.

**Sprechertext:**

Kurz zusammengefasst: Anmelden über das Portal, dann Stadtplan, Akte, Ermittlung. Erst ausführen, dann prüfen, und bei Fehlern die Zeitlupe. Die Fallen-Nummern zeigen dir, was schiefging. Und am Ende jeder Akte wartet ein Verhör.

### Folie 12 · 4:30 – Weiter im Lab

**Auf der Folie:**

- Ermittlung 1.1 „Der erste Auftrag“ · A1-E1-01 … 08
- AB 1.1 „Der erste Auftrag“
- Nächstes Video: Video 1 – SQL-Grundlagen: SELECT, WHERE und die Bedingungsfallen

**Sprechertext:**

Und jetzt los: Dein erster Fall wartet im Fundbüro, Ermittlung 1.1. Wenn du SQL noch einmal in Ruhe sehen willst, schau dir Video 1 an. Viel Erfolg, Ermittlerin, viel Erfolg, Ermittler!
