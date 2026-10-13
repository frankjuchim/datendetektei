# Datendetektei Weserstedt – Kurzanleitung für Lehrkräfte

Diese Anleitung führt Sie in zehn Minuten vom leeren Kurs zur ersten Ermittlung. Die Datendetektei ist eine Plattform
im Verbund **InfoLabs**: Konten, Kurse und Codes verwalten Sie im Portal, Unterricht und Auswertung finden in der
Datendetektei statt.

## 1. Vorbereitung im Portal (einmalig)

1. **Zugang:** Im Portal (`https://labs.frankjuchim.de`) Lehrkraft-Zugang anfragen. Die Administration gibt Sie frei
   und schaltet die Plattform *Datendetektei* für Sie frei.
2. **Kurs anlegen:** *Kurse → Neuer Kurs*, Name z. B. „Info eA Q1“, Ablaufdatum prüfen (Standard 31.07.), Plattform
   *Datendetektei* ankreuzen.
3. **Schüler:innen aufnehmen:** Kurscode, Beitritts-Link oder QR-Code zeigen. Jede Schülerin und jeder Schüler wählt
   einen Namen (2–30 Zeichen, gern Vorname + Initial) und bekommt einen **persönlichen Code** (`ABC-234`). Die
   Codeliste können Sie im Portal drucken; ohne Code kommt niemand wieder in sein Konto.
4. **Mitlehrkräfte** laden Sie im Portal zum Kurs ein; sie sehen dann denselben Kurs in der Datendetektei.

Schüler:innen öffnen danach im Portal *Meine Plattformen → Weiter zur Datendetektei*. Sie selbst gelangen über
*Plattformen → Datendetektei* in den Lehrkraft-Bereich.

## 2. Kurs einstellen (Lehrkraft-Bereich, Reiter „Einstellungen“)

| Einstellung | Wirkung | Standard |
|---|---|---|
| **Akten** | Welche Akten der Kurs sieht. Schalten Sie Akten passend zum Unterricht frei (Akte 1 in DS 1). | nur Akte 1 |
| **Niveau** | eA (Leistungskurs) oder gA (Grundkurs): gA blendet Akte 5 (komplett eA), eA-Ermittlungen und -Videos, Trainings T4/T6 und die Kür K1 aus. | eA |
| **Verhöre** | *automatisch*: frei, sobald eine Schülerin 60 % der Ermittlungspunkte einer Akte hat · *offen* · *gesperrt*. Je Akte abweichend einstellbar (z. B. Verhör erst in der nächsten Stunde). | automatisch |
| **Beamer-Board** | Erzeugt einen geheimen Link für die Beamer-Rangliste. Wer den Link kennt, sieht Kursname und Anzeigenamen. Link erneuern macht den alten ungültig. | aus |
| **Scoreboard** | Rangliste des Kurses für Ihre Schüler:innen auf dem Stadtplan (Karte „Rangliste deines Kurses“): die besten 10 und zusätzlich der eigene Platz, jeweils Anzeigename, Rang und Punkte; gleiche Punkte – gleicher Platz. Sichtbar nur für Mitglieder dieses Kurses (angemeldet), Lehrkräfte erscheinen nicht. Sie selbst sehen auf dem Stadtplan die Vorschau. Ausschalten blendet die Karte sofort aus. | aus |

Änderungen wirken sofort; Schüler:innen sehen sie beim nächsten Seitenaufruf.

## 3. Im Unterricht

- **Ermittlungen (Lab):** Schüler:innen lösen Aufgaben in der Ermittlungskonsole; geprüft wird auf dem Server gegen
  versteckte Randfall-Datenbanken. Tipps kosten Punkte, „Lösung zeigen“ gibt 0 Punkte.
- **Verhöre:** zeitbegrenzte Abschlussprüfung je Akte im Abitur-Stil (gesiezt); Beweisstück auf der Pinnwand.
- **Warm-up** (5 Minuten zu Stundenbeginn) und **Trainingsplatz** (zufällige Übungen) laufen unabhängig von Akten.
- **Live-Runde** (Reiter *Live* → *Neue Runde*): *Duell* (Quiz in Teams) oder *Escape Room* (Stationen mit Codes).
  Schüler:innen treten unter `/live` bei; die Beamer-Ansicht öffnen Sie aus der Steuerung. Antworten werden nach
  Rundenende verworfen. Benötigt eine stabile WLAN-Verbindung (Server-Sent Events).
- **Werkzeuge ohne Anmeldung** (z. B. für die Tafel): `/werkzeug/bauplan` (ER-Diagramm), `/werkzeug/werkbank`
  (Relationenschema), `/werkzeug/zeitlupe?db=eisdiele`, `/konsole/eisdiele`.

## 4. Auswertung (Reiter „Auswertung“)

- **Matrix** Schüler:in × Ermittlung: Punkte, Fehlversuche, Tipps; Verhöre mit Ergebnis.
- **Fallen-Profil P1–P10:** Welche typischen Fehler (z. B. P1 WHERE ↔ HAVING, P2 fehlender Verbund) im Kurs gehäuft
  auftreten – Grundlage für das nächste Warm-up oder eine Wiederholung.
- **Häufige Fehlabfragen** je Aufgabe (ohne Namen, gezählt) – gut für eine Fehlerbesprechung am Beamer.
- **CSV-Export** (ohne interne Kennungen) für die eigene Unterlage. Die Ergebnisse sind Übungsstände, keine Noten.
- **Vorschau:** alle Aufgaben mit Tipps und Lösungen, auch gesperrte Akten – zur Unterrichtsvorbereitung.

## 5. Materialien (Reiter „Materialien“)

Arbeitsblätter (Schülerfassung), Lösungen, Präsentationen mit Notizen, Lehrerhinweise, Unplugged-Vorlagen,
Warm-up-Karten, Generalprobe und Klausuren mit Erwartungshorizonten als PDF; einzeln oder als ZIP. Schüler:innen sehen
in ihrem Bereich nur die Schülerfassungen. Die bearbeitbaren Originale (docx/pptx) gibt es für die Administration.

## 6. Urkunden

*Lehrkraft-Bereich → Urkunden*: Druckseite „Detektei-Lizenz“, eine A4-Seite je Schüler:in, Auswahl ab einem Rang.
Im Browser drucken bzw. als PDF speichern.

## 7. Datenschutz in Kürze

- Die Datendetektei kennt nur Kennung, Anzeigename, Rolle, Kurse und den Lernstand – keine Kurscodes, persönlichen
  Codes oder Passwörter. Freitexte werden nie gespeichert, SQL-Entwürfe nur auf dem Gerät.
- Löschen Sie einen Kurs oder eine Schülerin im Portal, löscht das Portal die Daten auch in der Datendetektei; nach
  dem Ablaufdatum des Kurses geschieht das automatisch.
- Wählen Sie Namen so, dass sie auf dem Beamer-Board unbedenklich sind (z. B. Vorname + Initial).
- Details: Seite *Datenschutz* der Datendetektei und die zentrale Datenschutzerklärung des Portals.

## 8. Wenn etwas nicht klappt

| Problem | Lösung |
|---|---|
| Schüler:in sieht „keine Berechtigung“ | Ist die Datendetektei im Portal für den Kurs angekreuzt? |
| Akte fehlt | Reiter *Einstellungen → Akten*; bei gA sind eA-Inhalte ausgeblendet. |
| Verhör gesperrt | Modus *automatisch* verlangt 60 % der Ermittlungspunkte; sonst auf *offen* stellen. |
| Konsole „Ausführen“ langsam | Schulnetz sperrt evtl. WebAssembly – dann rechnet der Server; „Prüfen“ läuft immer serverseitig. |
| Live-Runde hängt | Seite neu laden; die Verbindung baut sich wieder auf. Bleibt es dabei, WLAN/Proxy prüfen (Server-Sent Events). |
| Persönlicher Code vergessen | Im Portal neuen Code erzeugen (Lernstand bleibt erhalten). |
