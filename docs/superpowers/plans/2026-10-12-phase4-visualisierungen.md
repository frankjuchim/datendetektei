# Phase 4 – Visualisierungen (Zeitlupe, Spurenbrett, Sortierfächer) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die drei Verstehenshilfen machen sichtbar, was eine Abfrage tut: die **Zeitlupe** spielt jede Abfrage in der
logischen Auswertungsreihenfolge ab, das **Spurenbrett** zeigt den Verbund als Kreuzprodukt aus roten Fäden, die
**Sortierfächer** zeigen GROUP BY, Aggregate, WHERE vorher und HAVING nachher. Alle drei sind als Werkzeugseiten,
aus der Konsole, aus Diagnosen und als Block in Aufgaben erreichbar.

**Architecture:** Eine isomorphe Rechenschicht `src/sql/visual.js` (UMD wie `parser.js`) erzeugt aus dem AST
Schritt-Pläne (interne Abfragen, nie EH-geprüft) und wertet sie über eine injizierte Ausführungsfunktion aus – im
Browser sql.js (Worker aus Phase 2), in Tests better-sqlite3. Die Oberflächen liegen in
`public/static/js/{zeitlupe,spurenbrett,sortierfaecher}/`, Styles in je einer CSS-Datei (DESIGN §10).

**Spec:** §7.6.2, §7.6.3, §7.3 (Diagnosen mit Verlinkung), §3.5; `docs/DESIGN.md` §2.4 (Gruppenfarben), §5.4–5.6, §6,
§7 (Bewegung, Tastatur); `docs/DS_PLANUNG.md` (A2-E1-03 Spurenbrett, A3-E1-04 Sortierfächer, A3-E2 Zeitlupe).

## Global Constraints

- Alles aus Phase 1–3 gilt. Version 0.4.0 am Ende.
- Rechnen im Browser auf der **öffentlichen Übungs-DB** (nie Varianten, nie Verhör-DBs); in Verhören sind die
  Werkzeuge nicht erreichbar.
- Große Zwischentabellen: höchstens 50 Zeilen angezeigt, Zähler exakt (DESIGN §5.4); Kreuzprodukt mit mehr als
  2 000 Fäden wird im Spurenbrett zusammengefasst (Zähler + Hinweis), nie das ganze Kreuzprodukt gezeichnet.
- Gruppen nie nur über Farbe (Name + Legende), höchstens 3 Gruppenfarben, ab Gruppe 4 nur Label (DESIGN §2.4).
- Bewegung: Abspielen 1,8 s je Schritt, reduziert 2,6 s ohne Übergänge; Fäden fallen ab (900 ms) bzw. reduziert nur
  Ausblenden; Pfeiltasten ← → steuern Schritte; alles per Tastatur bedienbar.
- Keine neuen Laufzeitpakete; SVG für Fäden, Textknoten für alle Werte.

## Review Focus

1. Zeitlupe stimmt für alle LIESMICH-Beispielabfragen: Zeilenzahl jedes Schritts = Ergebnis der entsprechenden
   Teilabfrage, letzter Schritt = Ergebnis der Originalabfrage (Test über alle Beispiele aller DBs).
2. WHERE vs. HAVING sichtbar unterschiedlich: WHERE graut Zeilen vor dem Gruppieren, HAVING ganze Gruppen danach.
3. Spurenbrett: „n × m = k Fäden → j bleiben“ stimmt; NULL-Fremdschlüssel hängt an keinem Faden.
4. Keine Lösungsdaten: Blöcke in Aufgaben zeigen nur die im Block hinterlegte Abfrage/Tabelle, nie die Musterlösung.
5. Beamer (1920 × 1080) und iPad (1024/768) ohne Überlauf; `prefers-reduced-motion` respektiert.

---

### Task 1: Rechenschicht `src/sql/visual.js`
Isomorph, ohne Abhängigkeiten; Eingabe AST aus `parser.js` + Funktion `fuehreAus(sql) → { spalten, zeilen }`.
- `zeitlupe(ast, fuehreAus) → schritte[]`: FROM (Kreuzprodukt, Zeilenzahl, Tabellen), WHERE (behaltene/verworfene
  Zeilen), GROUP BY (Gruppenschlüssel je Zeile), HAVING (behaltene/verworfene Gruppen), SELECT (Spalten/Aggregate je
  Gruppe), ORDER BY, LIMIT; je Schritt `{ klausel, nummer, text (ein Satz), zaehler, spalten, zeilen (≤ 50), gesamt,
  markierung }`. Nicht vorhandene Klauseln entfallen. Abfragen außerhalb EH §8 (JOIN, Unterabfrage) → Hinweis „Die
  Zeitlupe zeigt nur Abfragen im Abitur-Umfang“.
- `spurenbrett({ tabellen, bedingung }, fuehreAus) → { tabellen:[{ name, zeilen }], faeden:[[i,j,(k)]], passend:[…],
  gesamt, bleiben, ohneFaden }` (max. 3 Tabellen).
- `sortierfaecher(ast, fuehreAus) → { korb (WHERE-verworfen), faecher:[{ schluessel, zeilen, aggregate,
  havingRaus }], umschalter COUNT/SUM }`.
- Tests mit better-sqlite3 gegen alle LIESMICH-Beispielabfragen (Review Focus 1, 2, 3) und Grenzfälle (leere Gruppen,
  NULL im Gruppenschlüssel, Alias in ORDER BY, LIMIT ohne ORDER BY).
Commit `Visualisierung: Rechenschicht für Zeitlupe, Spurenbrett, Sortierfächer`.

### Task 2: Zeitlupe (Werkzeug)
`/werkzeug/zeitlupe` (Parameter `db`, Abfrage über `sessionStorage`-Übergabe aus Konsole/Diagnose, nicht in der
URL), Layout DESIGN §5.4 (Abfrage links in Schreibreihenfolge mit Auswertungsnummern, rechts Zähler + Erklärung +
Zwischentabelle; verworfene Zeilen grau/durchgestrichen), Abspielen/Zurück/Weiter, Tastatur, reduzierte Bewegung,
Handy 4+3 Reiter. Knopf „Zeitlupe“ in der Konsole aktivieren. Commit `Zeitlupe`.

### Task 3: Spurenbrett (Werkzeug)
`/werkzeug/spurenbrett` nach DESIGN §5.5: Tabellenauswahl (2–3 Tabellen der DB, Zeilen-Stichprobe wählbar, Standard
klein), Karteikarten auf Kork, SVG-Fäden, Bedingung eingeben (Vorschlag aus den FKs), Fäden fallen ab, Zähler,
Ergebnis des Verbunds, Ermittler-Notiz zu NULL. Commit `Spurenbrett`.

### Task 4: Sortierfächer (Werkzeug)
`/werkzeug/sortierfaecher` nach DESIGN §5.6: Abfrage mit hervorgehobener Klausel, WHERE-Korb, Fächer mit
Gruppenfarbe + Name, Aggregatzeile, HAVING graut Fächer, Umschalter COUNT(*) ↔ SUM(Spalte); Handy untereinander.
Commit `Sortierfächer`.

### Task 5: Verlinkung und Blöcke in Aufgaben
- Diagnosen verlinken: `KREUZPRODUKT` → Spurenbrett + Zeitlupe; P1 (`WHERE_MIT_AGG`, `HAVING_OHNE_AGG`) → Zeitlupe;
  P3/P4 (`GB_REGEL`, `ANDERE_WERTE` bei GROUP BY) → Sortierfächer; im Lab und in der Konsole (nie im Verhör).
- Neue Blöcke `zeitlupe`, `spurenbrett`, `sortierfaecher` (`{ t, datenbank, sql | tabellen + bedingung, start? }`):
  `docs/AUFGABENFORMAT.md`, Validator (Abfrage läuft, nur öffentliche DBs, keine Musterlösung der Aufgabe als Block),
  Renderer, Beispielakte, Tests.
- Einbinden in die Inhalte nach DS_PLANUNG: A2-E1-03 (Spurenbrett, `zeilen` auf das Ergebnis), A3-E1-04
  (Sortierfächer zur Kontrolle nach dem Lösen), Intro A3-E2 (Zeitlupe mit einer Beispielabfrage, die keine Aufgabe
  verrät). `npm run validate` grün.
Commit `Visualisierung: Verlinkung aus Diagnosen und Blöcke in Aufgaben`.

### Task 6: Abnahme Phase 4
E2E (`test/e2e/visualisierung.e2e.js`): Zeitlupe aus einer Diagnose öffnen und durchschalten (Tastatur), Spurenbrett
mit NULL-FK, Sortierfächer WHERE vs. HAVING, reduzierte Bewegung; Screenshots Beamer 1920×1080 (hell/dunkel), iPad
1024×768 und 768×1024, Handy 375 nach `docs/screenshots/phase4/`; Version 0.4.0; CLAUDE.md, Spec §18; PR.

## Reihenfolge

Task 1 → Tasks 2, 3, 4 parallel (eigene Dateien) → Task 5 → Task 6.
