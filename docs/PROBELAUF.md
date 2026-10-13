# Probelauf im Unterricht – Checkliste und Rückmeldebogen

Phase 8 schließt mit einem Probelauf durch einen echten Testkurs bzw. Kolleg:innen ab (Spec §16). Diese Liste bündelt
die noch ausstehenden Abnahmetests der Phasen 1, 2 und 6, die nur mit echten Geräten im Schulnetz möglich sind.
Befunde bitte mit Gerät, Browser, Uhrzeit und Seite notieren (Screenshot genügt) – nie mit Klarnamen von
Schüler:innen.

## A. Vorbereitung (Admin/Lehrkraft, ca. 15 min)

- [ ] Live-Instanz: `https://datendetektei.frankjuchim.de/healthz` zeigt die erwartete Version.
- [ ] `node scripts/vertrag_pruefen.js https://datendetektei.frankjuchim.de` meldet keine Fehler.
- [ ] Portal: Plattform *Datendetektei* eingetragen, Manifest geprüft, Rücksprung `…/sso/ende` bestätigt.
- [ ] Testkurs „Probelauf“ im Portal mit Plattform Datendetektei; zwei Lehrkräfte (Inhaberin + Mitlehrkraft).
- [ ] Mindestens drei Testkonten (Fantasienamen, z. B. „Mika R.“, „Lena K.“, „Ole T.“), Codeliste gedruckt.
- [ ] Einstellungen: Akten 1–2 frei, Niveau eA; ein zweiter Kurs mit Niveau gA.

## B. Anmeldung und Verbund (Phase 1)

- [ ] Schüler:in: Portal → *Weiter zur Datendetektei* → Stadtplan mit eigenem Namen.
- [ ] Lehrkraft: Portal → Datendetektei → Lehrkraft-Bereich zeigt nur eigene Kurse.
- [ ] Admin: Reiter *System* sichtbar (Seed-Bericht, Sicherung).
- [ ] Abmelden und *Überall abmelden* führen zurück zum Portal.
- [ ] Portal → Kursübersicht der Datendetektei zeigt Kennzahlen (Anzahl, Fortschritt), keine Namen außerhalb des Kurses.
- [ ] Schüler:in im Portal aus dem Kurs entfernen → nach kurzer Zeit in der Datendetektei verschwunden.

## C. Geräte (Phase 2/4)

Je Gerät eine Ermittlung in Akte 1 lösen (Konsole: Ausführen, Prüfen, Tipp), Zeitlupe öffnen, Seite drehen.

| Gerät | Browser | Konsole (WASM) | Prüfen | Zeitlupe | Darstellung | Bemerkung |
|---|---|---|---|---|---|---|
| iPad (hoch/quer) | Safari | | | | | |
| Chromebook | Chrome | | | | | |
| Schul-PC | Edge/Firefox | | | | | |
| Smartphone | beliebig | | | | | |
| Beamer (1920×1080) | – | | | | | |

- [ ] Schulnetz sperrt WebAssembly? Dann muss „Ausführen“ trotzdem Ergebnisse zeigen (Server-Ausführung).
- [ ] Bauplan-Tisch (Akte 5) mit Finger/Stift auf dem iPad: Entitätstyp anlegen, verbinden, verschieben.

## D. Unterricht (eine Doppelstunde)

- [ ] Warm-up zu Beginn (5 min) auf allen Geräten.
- [ ] Ermittlung bearbeiten; Lehrkraft beobachtet die Auswertung live (Matrix, Fallen-Profil).
- [ ] Verhör V1 im Modus *offen* mit allen Testkonten gleichzeitig.
- [ ] Beamer-Board einschalten, Link am Beamer öffnen, Aktualisierung nach einer gelösten Aufgabe.
- [ ] Materialien: Schüler:in lädt ein Arbeitsblatt, Lehrkraft die Lösung und ein ZIP.

## E. Live-Modus im Schul-WLAN (Phase 6)

- [ ] Duell mit ≥ 3 Teilnehmenden: Beitritt unter `/live`, Fragen erscheinen ohne Verzögerung, Ergebnis am Beamer.
- [ ] Escape Room: zwei Stationen lösen, Code eingeben.
- [ ] WLAN eines Geräts kurz trennen → nach Wiederverbinden wieder in der Runde.
- [ ] Proxy/Filter der Schule lässt Server-Sent Events durch (keine Pufferung > 2 s).

## F. Abschluss

- [ ] Testkurs im Portal löschen → Daten in der Datendetektei entfernt (Lehrkraft-Bereich zeigt den Kurs nicht mehr).
- [ ] Befunde gesammelt an Frank; offene Entscheidungen aus Spec §18 (Phasen 5–8) besprochen.

---

## Rückmeldebogen für Kolleg:innen

| Frage | 1 (trifft nicht zu) – 5 (trifft zu) | Kommentar |
|---|---|---|
| Die Aufgaben passen zum Kerncurriculum und den Ergänzenden Hinweisen (EH 2025). | | |
| SQL-Stil und Notation entsprechen dem Abitur-Stil. | | |
| Die Rückmeldungen der Prüfung helfen beim Weiterarbeiten, ohne die Lösung zu verraten. | | |
| Die Story motiviert, ohne vom Fachinhalt abzulenken. | | |
| Der Lehrkraft-Bereich zeigt mir, wo mein Kurs steht. | | |
| Die Materialien (Arbeitsblätter, Präsentationen) kann ich ohne Anpassung einsetzen. | | |
| Der Zeitbedarf je Doppelstunde ist realistisch. | | |

Was hat gefehlt? Was war zu viel? Welche Aufgabe war fehlerhaft oder missverständlich (Aufgaben-ID, z. B. `A2-E1-04`)?
