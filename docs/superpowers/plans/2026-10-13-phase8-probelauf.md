# Phase 8 – Probelauf und Feinschliff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die Plattform ist bereit für den Probelauf mit einem echten Testkurs und Kolleg:innen: Live-Instanz
vertragsgemäß abgenommen, ein systematischer Probelauf aller Rollen auf allen Zielgeräten mit behobenen Befunden,
Lektorat aller Texte, Sicherheits-Review, Datenschutzseite vollständig (Schulangaben als markierte Platzhalter),
Lizenz festgelegt (Default bis Franks Entscheidung), Kurzanleitung für Lehrkräfte und Protokollvorlage für den
Probelauf im Unterricht, Doku und Screenshots auf Stand. Version 0.8.0; 1.0.0 erst nach Franks Freigabe des
Probelaufs.

**Architecture:** Keine neuen Funktionen. Befunde werden als Liste je Bereich erfasst (Scratchpad), jeder Befund mit
fehlschlagendem Test (Unit oder E2E) behoben; reine Text-/Darstellungsbefunde mit Sichtprüfung (Screenshots).
Parallele Agenten mit exklusiven Bereichen; gemeinsame Dateien (`public/static/css/*`, `src/app.js`) nur additiv.

**Spec:** §16 (Phase 8), §17 (offene Punkte 3–5), §7 (Plattform), §8 (Design), §10 Vertrag; Roadmap Phase 8.

## Global Constraints

- Vertrag 1.2 unverändert; `src/kern/jwt.js` und `scripts/vertrag_pruefen.js` byte-gleich mit labs (Test).
- Keine neuen Datenkategorien, keine neuen externen Ressourcen, CSP unverändert, Ausgaben nur als Textknoten.
- Lösungen verlassen den Server nie vor dem Lösen (Sicherheits-Review prüft jede Route).
- Schulangaben, Rechtsgrundlage, Hoster: nur Platzhalter `[…]` (Klasse `platzhalter`), nie erfunden.
- docx/pptx nur ändern, wenn ein Befund es verlangt; dann rendern, PDFs neu erzeugen, `npm run pruefen` grün.
- Nach Änderungen an `public/static/**`: `?v=` in `public/*.html` und `package.json` erhöhen (macht die Abnahme).

## Review Focus

1. Live-Instanz: `vertrag_pruefen.js` grün, `/healthz` = Manifest-Version, Zugriffsstufen der Materialien live.
2. Jeder Befund des Probelaufs hat einen Test oder eine Sichtprüfung; keine offenen „kritisch/hoch“.
3. Keine Lösungsdaten in Antworten vor dem Lösen (Sicherheits-Review mit Belegen je Route).
4. Datenschutzseite deckt jede gespeicherte Datenkategorie ab (Test gegen `sqlite_master`).

---

### Task 1: Live-Abnahme
`node scripts/vertrag_pruefen.js https://datendetektei.frankjuchim.de`, `/healthz`, Gastmodus, Themenseite,
Material-Downloads anonym (nur Gast-Auswahl, sonst 404), Sicherheits-Header (CSP, `X-Robots-Tag`), `/db/*.sqlite`
nur öffentliche DBs. Befunde → Task 2 bzw. Bericht.

### Task 2: Probelauf je Bereich (parallel, je ein Agent)
Mit dem E2E-Testserver und Playwright (Chromium) als Schüler:in eA und gA, Lehrkraft, Superadmin, Gast, auf
Smartphone (390×844), iPad hoch/quer (768×1024, 1024×768), Chromebook (1366×768), Beamer (1920×1080):
Funktion, Texte (Ansprache, Fachbegriffe EH, Tippfehler), Darstellung (kein horizontales Scrollen, Touch-Ziele
≥ 44 px, Fokus sichtbar, Tastaturbedienung, Hell/Dunkel, `prefers-reduced-motion`), Fehlerfälle (Netz weg,
Sitzung abgelaufen, Doppelklick), Ladezeiten.
- **2a** Start, Stadtplan, Akten 1–3, Konsole, Zeitlupe, Spurenbrett, Sortierfächer, Warm-up, Verhöre V1–V3.
- **2b** Akten 4–5, Anomalie, Zerlegung, Schema-Werkbank, Bauplan-Tisch, Verhöre V4–V5, Werkzeugseiten.
- **2c** Akten 6–7, Plädoyer, Pinnwand/Steckbrief, V6/V7, Kür K1, Trainingsplatz T1–T8, Urkunden.
- **2d** Lehrkraft-Bereich (alle Reiter), Live-Modus (Duell, Escape Room, Beamer), Board, Materialien je Rolle,
  Gastmodus, Themenseite, Datenschutz, Fehlerseiten, SSO-Fehlerseite.
Je Bereich: Befundliste (Schwere kritisch/hoch/mittel/niedrig), Fixes mit Test, Screenshots
`docs/screenshots/phase8/<bereich>_*`. Commit `Probelauf <bereich>: …`.

### Task 3: Lektorat der Inhalte
Alle Texte in `seed/**/*.json` (Akten, Warm-up, Gast, Live, Fallebene, Training) und `public/*.html`: Rechtschreibung,
Ansprache (du / Abitur-Stil Sie), Fachbegriffe nach EH (§6, „Entitätstyp“), Story-Konsistenz mit STORY.md,
Konsistenz der Begriffe (Akte/Ermittlung/Verhör). Nur Text, keine Lösungen ändern; `npm run validate` grün.
Commit `Lektorat: …`.

### Task 4: Sicherheits-Review
Jede Route (`src/routes/*`): Rechte je Rolle, Lösungsdaten vor dem Lösen, Rate-Limits, Eingabegrenzen, Sandbox
(Lesen/Schreiben), SSE-Grenzen, Board-Schlüssel, Material-Pfade (Traversal), Header, Logging (keine Tokens, keine
Query bei `/sso/ende`), `npm audit`. Befunde mit fehlschlagendem Test beheben; Bericht mit Belegen je Route.
Commit `Sicherheit: …`.

### Task 5: Datenschutz und Lizenz
`public/datenschutz.html` vollständig: jede Tabelle/Datenkategorie (auch Live, Kür, Board, Fehlabfragen, Trainings-
und Warm-up-Stand, Sicherung), Speicherdauer, Empfänger (nur Portal, nur Kennzahlen), Rechtsgrundlage/Hoster/
Verantwortliche als Platzhalter wie im Portal; Test, dass jede Tabelle aus `sqlite_master` auf der Seite genannt ist
(Zuordnungsliste im Test). Lizenz: `LIZENZ.md` (Default: Materialien und Inhalte CC BY-NC-SA 4.0 laut Vorschlag
Spec §17, Code „alle Rechte vorbehalten“ bis Frank entscheidet), Hinweis in README, Fußzeile der Themenseite.
Commit `Datenschutz und Lizenz`.

### Task 6: Anleitung und Probelauf-Protokoll
`docs/ANLEITUNG_LEHRKRAFT.md` (Kurs im Portal anlegen, Plattform freischalten, Akten freigeben, Niveau, Verhöre,
Board, Live-Runde, Materialien, Auswertung lesen, Datenschutz-Kurzfassung) und `docs/PROBELAUF.md` (Checkliste für den
Probelauf im Unterricht: Geräte, WLAN/SSE, Abnahmetests aus Phasen 1/2/6, Rückmeldebogen für Kolleg:innen).
Commit `Doku: Anleitung und Probelauf`.

### Task 7: Abnahme Phase 8
Alle Befunde gemergt, `npm test`, `npm run validate`, `npm run pruefen`, `npm run e2e`, `npm run kontrast`,
`npm run vertrag` grün; `?v=`/Version 0.8.0; Spec §18 „Phase 8“, CLAUDE.md, README; PR nach `main`.

## Reihenfolge

```
Task 1 ─┬─ Task 2a–2d (parallel) ─┐
        ├─ Task 3 ────────────────┤
        ├─ Task 4 ────────────────┼─ Task 7
        ├─ Task 5 ────────────────┤
        └─ Task 6 ────────────────┘
```
