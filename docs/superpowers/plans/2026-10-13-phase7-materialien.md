# Phase 7 – Materialien und Videos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Alle Unterrichtsmaterialien liegen als maßgebliche docx/pptx im Akten-Design vor (Arbeitsblätter mit
Lösungen, Präsentationen, Lehrerhinweise, Unplugged-Vorlagen, Warm-up-Karten, Gesamtübersicht, Abi-Kompass,
Ermittler-Handbuch, Generalprobe, Klausur, Nachschreibklausur mit Erwartungshorizonten, Kür), daraus erzeugte PDFs in
drei Ausgabestufen (Spec §12.4), maschinelle SQL- und Begriffsprüfung, Folien und Drehbücher für 8 Videos.

**Architecture:** Python-Werkzeuge in `werkzeuge/` nach dem Muster von Algo Quest (`/home/user/frankjuchim/algoquest/
werkzeuge/*.py`, nur lesen): gemeinsames Design-Modul `werkzeuge/akten_design.py` (python-docx/python-pptx: Kopfband,
Stempel, Beweisstück-Kasten, Abi-Ecke, Absatzformate „SQL-Code“ und „Ergebnistabelle“, Folienlayout „Fallbesprechung“).
Erstellungsskripte je Akte unter `quellen/material/akte<n>.py` (nur Erstellungshilfe – die erzeugten docx/pptx sind
danach maßgeblich und werden direkt gepflegt, Spec §12). PDF-Pipeline mit LibreOffice (`soffice --headless`), Fonts
aus `werkzeuge/fonts/`. SQL-Prüfung über den Node-Parser (`src/sql/parser.js`, `regeln.js`) und better-sqlite3 per
kleinem CLI `scripts/sql_pruefen_cli.js`.

**Spec:** §6 (Konventionen), §11 (Aufbau), §12 (Ordner, Pipeline, Zugriff, SQL-Prüfung), §13 (Videos), E12, E13;
`docs/DS_PLANUNG.md` (AB-, Prüfungs-, Warm-up-, Unplugged-Blueprints je DS – **verbindlich**),
`docs/KOMPETENZMATRIX.md`, `docs/STORY.md`, `docs/DESIGN.md` (Farben, Schriften), `seed/akten/*.json` (Lab-Bezüge).

## Global Constraints

- Notation EH §7, SQL-Stil EH §8 (Abi-Stil 2026) in allen Materialien; „Entitätstyp“ statt „Entitätsmenge“; keine XP;
  `JOIN … ON` nur in Kür-Dokumenten mit Kennzeichnung „nicht im Abitur“. Schüler geduzt, Abi-Ecke/Prüfungen gesiezt,
  Operatoren fett, `[x BE]`.
- Jede SQL-Anweisung im Absatzformat „SQL-Code“ mit Datenbank (`DD-Datenbank` bzw. `-- DB:`); Lösungen mit
  „Ergebnistabelle“ – `material_sql_pruefen.py` muss alles grün melden.
- Arbeitsblätter nicht 1:1 wie Lab-Aufgaben (gleiche Konzepte, andere Fragen); keine Originaltexte von
  Abituraufgaben (nur Verweise Jahr/Termin/Teilaufgabe); alle Daten erfunden.
- PDFs ohne Umlaute im Dateinamen; Schülerfassungen nie mit Lösungen (Präsentations-Handout ohne `[NUR LEHRKRAFT]`-
  Folien und ohne Notizen; Warm-up-Karten ohne Lösungsteil).
- Zugriff und Downloads baut Phase 6 (Task 5); Phase 7 befüllt nur die Whitelists `verzeichnis.json`.
- Gast-Auswahl `materialien/Gast_PDF/verzeichnis.json` bleibt leer, bis Frank auswählt (E13).

## Review Focus

1. `npm run pruefen` grün: Vollständigkeit + Aktualität (Hash) der PDFs, SQL-Prüfung, Begriffsprüfung.
2. Kompetenzmatrix gegen echte Aufgaben ohne Lücken (Skript), jede Kompetenz in Lab/AB/Prüfung abgedeckt.
3. Sichtprüfung gerenderter PDFs je Akte (Seitenumbrüche, Tabellen, Unterstreichungen, ↑).
4. Keine Lösung in einer Schülerfassung (Test durchsucht Schüler-PDF-Texte nach Lösungsmarkern).

---

### Task 1: Design-Modul, Vorlagen, Pipeline und Prüfwerkzeuge
`werkzeuge/akten_design.py`, Fonts (`werkzeuge/fonts/`, lizenzfrei, gleiche wie Plattform), Muster-docx/pptx je Typ
(AB, LSG, Lehrerhinweise, Präsentation, Warm-up-Karten, Klausur + EH), `werkzeuge/{arbeitsblaetter_pdf,loesungen_pdf,
lehrkraft_pdf,praesentationen_pdf,originale_verzeichnis,material_sql_pruefen,materialien_pruefen,kompetenz_abdeckung}.py`
mit `--pruefen`, `seed/arbeitsblaetter.json` (Zuordnung AB ↔ Ermittlung, für Themenseite und Pipeline), npm-Skripte
(`arbeitsblaetter`, `loesungen`, `lehrkraft`, `praesentationen`, `pruefen` erweitern), CI-Schritte (Vollständigkeit,
Aktualität, SQL, Begriffe – ohne LibreOffice nur `--pruefen`). Python-Tests unter `werkzeuge/tests/`.
Commit `Materialien: Design-Modul, Pipeline und Prüfwerkzeuge`.

### Tasks 2–8: Material je Akte (parallel, je ein Agent besitzt seinen Ordner)
Je Akte nach DS_PLANUNG: Arbeitsblätter `DD_A<n>_AB<k>_<Thema>.docx` + `…_LSG.docx`, Präsentation
`DD_A<n>_<Aktenname>.pptx` (Fallbesprechung-Stil, Sprechernotizen, Lösungsfolien mit `[NUR LEHRKRAFT]`),
Lehrerhinweise, Unplugged-Kopiervorlagen, Warm-up-Karten `DD_Warm-up-Karten_A<n>.docx` (aus `seed/warmup`),
Erstellungsskript `quellen/material/akte<n>.py`, PDFs erzeugt, Whitelists ergänzt, SQL-Prüfung grün, Sichtprüfung.
Akte 7: Generalprobe eA/gA, Klausur eA/gA (A + B, B-gA), Nachschreibklausur mit Erwartungshorizonten (Bewertungsbogen
I/II/III/BE, Kernpunkte, Teilpunkte, P-Nummern, Musterlösungen mit Ergebnistabellen) auf eigenen Prüfungs-DBs
(`seed/datenbanken/pruefung/{sanitaetsdienst,kostuemverleih}` kuratiert; Mensa aus Phase 6).
Commits `Materialien: Akte <n>`.

### Task 9: Gesamtmaterial und Kür
`00_Gesamt/`: Gesamtübersicht, Abi-Kompass (19 Abituraufgaben 2021–2026 nur als Verweise, Zuordnung zu Akten und
Kompetenzen aus Spec §2.4 und KOMPETENZMATRIX), Ermittler-Handbuch (8 Werkzeugkarten); `Kuer/` K1 (AB + LSG,
„nicht im Abitur“) und K2 (Escape-Room-Stationsumschläge, Ablauf). Commit `Materialien: Gesamt und Kür`.

### Task 10: Videos
`materialien/Videos/NN_Kurztitel/video.json` × 8 (0–7, Spec §13), `werkzeuge/video_folien.py` (nach Algo Quest:
Folien im Akten-Design, Kamera-Zone unten rechts frei, Sprechertext in Notizen, Drehbuch `…_Skript.md` mit Lernzielen,
YouTube-Titel/Beschreibung/Kapitel/Tags), Bilder aus der Plattform per Playwright-Renderer (Zeitlupe, Spurenbrett,
Bauplan-Tisch) mit eigenen Beispieldaten. Commit `Videos: Quellen, Folien, Drehbücher`.

### Task 11: Abnahme Phase 7
`npm run pruefen` grün, Kompetenzabdeckung ohne Lücken, Zugriffstests je Stufe (mit Phase 6), Sichtprüfung (Stichprobe
je Akte, Screenshots der PDF-Seiten), CLAUDE.md/README/Spec §18, Version, PR.

## Reihenfolge

```
Task 1 ─┬─ Tasks 2–8 (Akten, parallel in Wellen) ─┐
        ├─ Task 9 ─────────────────────────────────┼─ Task 11
        └─ Task 10 ────────────────────────────────┘
```
Phase 7 läuft auf `phase7/materialien` parallel zu Phase 6; vor der Abnahme wird Phase 6 hineingemergt (Downloads,
Mensa-DB, Akten 6/7).
