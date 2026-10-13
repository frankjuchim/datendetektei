# Phase 6 – Akten 6–7, Lehrkraft-Bereich, Live-Modus, Kür Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die Unterrichtseinheit ist vollständig spielbar und für Lehrkräfte steuerbar: Akte 6 „Datenspuren“ mit
Schlussplädoyer, Pinnwand und Steckbrief, Akte 7 „Generalprobe“ (Verhör 7), Verhör 6; Lehrkraft-Bereich mit
Einstellungen, Auswertung (Matrix, Fallen-Profil, Fehlabfragen, CSV), Vorschau, Beamer-Board, Urkunden und
Material-Downloads (Zugriff nach Rolle, E13); Live-Modus (Duell, Escape Room K2) per SSE; Kür K1 mit Schreib-Sandbox;
Trainingsplatz T8; Kursübersicht im Verbund mit echten Werten.

**Architecture:** Wie Phase 3–5. Neue Services `src/services/{auswertung,vorschau,board,urkunde,material,live,
kuer}.js`, Routen in eigenen Dateien `src/routes/{lehrkraft_auswertung,board,material,live,kuer}.js`. Live-Runden nur
im RAM (Map, Ablauf nach Rundenende), SSE mit Herzschlag. K1-Schreib-Sandbox als eigener Modus der bestehenden Sandbox
(Kindprozess, eigene In-Memory-DB je Schüler × Aufgabe, nur für die Dauer der Anfrage bzw. kurzlebig, CREATE/INSERT/
SELECT erlaubt, sonst wie Phase 2). Material-Downloads lesen nur Whitelists (`verzeichnis.json`), befüllt in Phase 7.

**Tech Stack:** wie bisher, keine neuen Laufzeitpakete (SSE mit Express-Bordmitteln).

**Spec:** §3.3 (Akte 6/7, Kür), §7.7 (Pinnwand, Steckbrief, Schlussplädoyer), §7.8 (T8), §7.9, §7.10, §7.11, §7.12
(Board), §7.13 (Verbund-Übersicht, Löschen), §7.14, §7.15, §8 (Board, Urkunde), §12.4 (Zugriff), E7, E10, E13.
Quellen: `docs/DS_PLANUNG.md` DS 12, DS 13 (V7), K1, K2 (verbindlich), `docs/STORY.md` §4.6–4.8, §5.12–5.15, §6–10,
`seed/datenbanken/datenspuren/LIESMICH.md`, `seed/datenbanken/VERHOER_KONTEXTE.md` V6/V7, `docs/DESIGN.md` §5.10–5.12.

## Global Constraints

- Alles aus Phase 1–5 gilt. Version **0.6.0** am Ende.
- **Rechte:** Jede neue Route mit Rechtetest je Rolle (anonym, Schüler, Lehrkraft fremder Kurs, Lehrkraft eigener Kurs,
  Superadmin). Lehrkräfte sehen nur ihre Kurse; Vorschau/Lösungen nur Lehrkraft/Superadmin; Board nur mit gültigem
  Board-Schlüssel und aktiviertem Board, zeigt nur Anzeigenamen und Punkte (keine `sub`).
- **Datenschutz:** CSV enthält nur Anzeigename, Punkte, Status – keine `sub`, keine Freitexte. Live-Antworten werden
  nach Rundenende verworfen (nur Teilnehmerzahl bleibt), keine Lab-Punkte aus Live. Fehlabfragen anonym. Löschauftrag
  (Verbund) entfernt alle neuen Tabellen-Einträge eines Kontos bzw. Kurses (Test).
- **Lösungsfreiheit:** Schlussplädoyer-Indizien und Auflösung erst nach dem Lösen; Escape-Room-Codes werden nur
  serverseitig aus dem Ergebnis abgeleitet und nie an den Client gesendet, bevor die Station gelöst ist.
- Material-Zugriff exakt nach Spec §12.4 (Schüler-PDF nur angemeldet, Lehrkraft-PDF nur Lehrkraft/Superadmin,
  Originale nur Superadmin, Gast nur Whitelist; sonst 404).

## Review Focus

1. Rechte-Matrix aller neuen Routen; Board ohne `sub`; CSV ohne `sub`.
2. Live: Code-Ableitung serverseitig, SSE-Verbindungen werden aufgeräumt, Runde endet sauber, nichts bleibt gespeichert.
3. K1-Sandbox: Schreibzugriff nur auf die eigene In-Memory-DB, Limits (Zeit, Zeilen, Tabellen, Größe), nie auf
   Akten-DBs oder Plattform-DB.
4. Steckbrief-Regel E10 und Pinnwand-Freischaltung stimmen mit STORY §4.8/§10 überein.
5. Probelauf (E2E) mit Testkurs ≥ 3 Konten inkl. Live-Runde; Löschauftrag entfernt alles.

---

### Task 1: Verhör-Kontexte V6 Fitness-App und V7 Mensa
`seed/datenbanken/verhoer/{fitness,mensa}/` kuratiert nach VERHOER_KONTEXTE (Mensa auch Basis der Generalprobe und
der zusammengelegten Tabelle `BestellUebersicht`), Varianten nur für SQL-Aufgaben (V6-05, V7-03/04/07/08/09/13),
Registrierung, Tests. Commit `Verhör-Kontexte Fitness-App und Mensa`.

### Task 2: Fallebene – Schlussplädoyer, Pinnwand, Steckbrief
Format-Erweiterung (Ermittlung `plaedoyer: { schritte:[aufgabenIds], indizien:{ id: md }, aufloesung: md }` o. ä.,
Indiz/Auflösung erst nach dem Lösen ausgeliefert), Seite `/pinnwand` (Polaroids der gewonnenen Verhöre, Indizienkette
des Plädoyers, Steckbrief nach Regel E10 aus STORY §4.8), Verlinkung vom Stadtplan; Validator, AUFGABENFORMAT, Tests,
E2E. Commit `Fallebene: Schlussplädoyer, Pinnwand, Steckbrief`.

### Task 3: Lehrkraft – Auswertung, Vorschau, CSV, Fehlabfragen, Fallen-Profil
Services + Routen: Matrix Schüler × Ermittlung (Status, Punkte), Verhör-Ergebnisse, Aufgabenstatistik (Lösungsquote,
Ø Fehlversuche), Fallen-Profil P1–P10 je Kurs, häufige Fehlabfragen (anonym), CSV-Export (UTF-8 mit BOM, Semikolon),
Vorschau aller Aufgaben inkl. Lösungen und Verhör-Pools (nur Lehrkraft), Einstellungen vollständig (Akten, Niveau,
Verhör auto/offen/gesperrt, Scoreboard, Board an/aus, Board-Schlüssel neu erzeugen). Superadmin: Seed-Bericht, Inhalte
neu laden, Sicherung (Download der Plattform-DB per `VACUUM INTO`). Rechte-Tests. Commit `Lehrkraft: Auswertung,
Vorschau, Einstellungen`.

### Task 4: Lehrkraft-Oberfläche, Beamer-Board, Urkunden
`/lehrkraft` nach DESIGN §5.11 (Reiter Kurs · Einstellungen · Auswertung · Vorschau · Live · Board · Urkunden ·
Materialien), `/board/:schluessel` nach DESIGN §5.12 (immer dunkel, 20 s Aktualisierung, Top 15, Akten-Fortschritt,
letzte Erfolge), Urkunden „Detektei-Lizenz“ (STORY §10.1) als Druckseite (CSS-Print, je Schüler eine Seite, nur
Anzeigename). E2E + Screenshots. Commit `Lehrkraft-Oberfläche, Beamer-Board, Urkunden`.

### Task 5: Material-Downloads (Zugriff nach Rolle, E13)
`src/services/material.js` + Routen: Schüler-PDF (`Arbeitsblaetter_PDF`), Lehrkraft-PDF (`Loesungen_Portal`,
`Lehrkraft_PDF`), Originale (Superadmin, einzeln + ZIP je Akte ohne neues Paket – ZIP selbst schreiben, „stored“),
Gast-Auswahl; jeweils nur aus `verzeichnis.json`, Pfad-Normalisierung, `sendFile` mit `root`; Themenseite listet
Titel/Akte/Niveau mit „nach Anmeldung“. Dockerfile kopiert `materialien/` (Originale nur mit `ORIGINALE_IM_IMAGE=1`).
Zugriffstests je Stufe mit Test-Whitelists in Fixtures. Commit `Materialien: Downloads nach Rolle`.

### Task 6: Live-Modus (Duell, Escape Room)
`src/services/live.js` (Runden im RAM, Lehrkraft startet/beendet, Teams, Countdown), SSE `/api/live/:runde/ereignisse`
(Herzschlag 20 s, Aufräumen), Antworten per POST; Duell (Richtigkeit + Zeit, Rangliste mit Anzeigenamen), Escape Room
mit 6 Stationen + S5g (gA) nach DS_PLANUNG K2/STORY §9, Code-Ableitung serverseitig, Tipp-Umschlag mit Zeitstrafe;
Inhalte `seed/live/escape.json` + Live-Pool `K2-L-01…20` (validiert); Schüler-Seite `/live`, Lehrkraft-Steuerung +
Beamer-Ansicht. Tests (Rechte, Codes nie im Client, Ende verwirft Daten), E2E mit 3 Schülern. Commit `Live-Modus:
Duell und Escape Room`.

### Task 7: Kür K1 – Schreib-Sandbox und Inhalte
Sandbox-Modus `schreiben` (eigene leere bzw. Startschema-DB je Schüler × Aufgabe, CREATE TABLE/INSERT/SELECT,
`PRAGMA foreign_keys=ON`, Grenzen: 1,5 s, 20 Tabellen, 500 Zeilen je Tabelle, 200 KB), Prüfung über Schema- und
Ergebnisabfragen (`loesung.pruefung`), Interaktion `sql` mit `abimodus: aus` und `schreiben: true`; Konsole-Hinweis
„nicht im Abitur“; Inhalte `seed/akten/kuer.json` K1-E1-01…06 (gA ausgeblendet, Spec §18). Tests. Commit `Kür K1:
Schreib-Sandbox und Inhalte`.

### Tasks 8–9: Inhalte Akte 6 und Akte 7 (parallel)
`seed/akten/akte6.json` (A6-E1-01…14 inkl. Schlussplädoyer, CC, V6 8/5 Timer 15 min) + `warmup_a6.json` (W-A6-…);
`seed/akten/akte7.json` (Level „Die Ermittlerprüfung“ ohne Lab-Aufgaben, V7 15/8 Timer 30 min, gA ohne eA-Aufgaben) +
`warmup_a7.json` (10 Karten). Genau nach DS_PLANUNG/STORY; Abweichungen melden. Commits `Inhalte: Akte 6 …` /
`Inhalte: Akte 7 …`.

### Task 10: Trainingsplatz T8 und Verbund-Kursübersicht
T8 „Fehlerhafte Abfrage: Falle zuordnen“ (Generator mit eigenen Daten, P1–P10); Kursübersicht `/api/verbund/kurse/:id/
uebersicht` mit allen Kennzahlen aus echten Werten (prüfen, ergänzen), Manifest `umfang` (Aufgaben, Level, Bosse) aus
dem Seed. Commit `Trainingsplatz T8, Verbund-Kursübersicht`.

### Task 11: Abnahme Phase 6
E2E-Probelauf: Testkurs mit 3 Schülern + Lehrkraft (Akte 6 Schlussplädoyer, Verhör 6, Pinnwand/Steckbrief, Auswertung,
CSV, Board, Urkunde, Live-Duell + Escape Room, K1); Löschauftrag (Konto und Kurs) entfernt alle Daten (Test über alle
Tabellen); Screenshots `docs/screenshots/phase6/`; Version 0.6.0; CLAUDE.md, Spec §18, DS_PLANUNG; PR.

## Reihenfolge

```
Task 1 ─┬─ Task 8 (Akte 6, braucht Task 2-Format) ─┐
Task 2 ─┤                                           │
Task 3 ─┼─ Task 4 ──────────────────────────────────┼─ Task 11
Task 5 ─┤                                           │
Task 6 ─┤  Task 9 (Akte 7, braucht Task 1) ─────────┤
Task 7 ─┘  Task 10 ─────────────────────────────────┘
```
Parallel in Wellen von höchstens 4–5 Agenten; gemeinsame Dateien (app.js, format.js, validator.js) nur additiv.
