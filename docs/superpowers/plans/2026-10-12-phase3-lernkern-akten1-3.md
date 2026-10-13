# Phase 3 – Lernkern und Akten 1–3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die Datendetektei wird benutzbar: Akten 1–3 mit allen Ermittlungen, Cold Cases, Verhören V1–V3 und Warm-ups
laufen für Schülerinnen und Schüler über das Portal-Login; Lernstand, Punkte, Ränge und Abzeichen entstehen
automatisch; Lehrkräfte schalten Akten frei; der Gastmodus zeigt den Probefall Eisdiele; die Themenseite zeigt echte
Inhalte ohne Lösungen.

**Architecture:** Aufgabenformat kompatibel zu Algo Quest (`frankjuchim/algoquest` `docs/AUFGABENFORMAT.md`, Version 2;
Welt = Akte, Level = Ermittlung, Boss = Verhör) mit eigenen Blöcken und Interaktionen in `docs/AUFGABENFORMAT.md`.
Prüfer je Interaktion in `src/content/` (Basis-Interaktionen nach dem Muster von Algo Quest `src/content/checker.js`
neu geschrieben, `sql` über `src/sql/pruefer.js` aus Phase 2). Seed-Mechanik mit Upsert nach id + Fingerabdruck.
Lernstand je `sub × Kurs` (Vertrag §3). Fachlogik in `src/services/`, Routen in `src/routes/`, Seiten in `public/`.

**Tech Stack:** wie Phase 1/2, keine neuen Laufzeitpakete.

**Spec:** §2.6 (Vertrag §9: Punkteformel, Ränge, Begriffe), §3 (Didaktik, gA-Pfad), §5 (Fallen), §7.5 (Format),
§7.7 (Stadtplan), §7.8 (Warm-up, Trainingsplatz T1–T3), §7.9 (Verhöre), §7.12 (Gast, Themen), §7.14, §7.15
(Datenmodell), §8 (Ränge, Abzeichen), §10 (Inhaltsumfang), E7, E10, E13. Quellen: `docs/DS_PLANUNG.md` DS 1–6 (Blueprints
aller Lab-, Verhör- und Warm-up-Aufgaben – **verbindlich**), `docs/KOMPETENZMATRIX.md`, `docs/STORY.md` (Briefings,
Anhang A), `seed/datenbanken/VERHOER_KONTEXTE.md` V1–V3, `docs/DESIGN.md` §5.1–5.3, §5.9, §5.13, §9.

## Global Constraints

- Alles aus Phase 1/2 gilt weiter. Version 0.3.0 am Ende.
- **Sicherheit (Vertrag §9):** `loesung`, `erklaerung`, nicht abgerufene `tipps`, Musterlösungs-SQL und
  Verhör-Aufgaben verlassen den Server nie vor dem Lösen/Aufdecken bzw. außerhalb eines laufenden Verhörs. Jede neue
  API-Route bekommt einen Test „liefert keine Lösungsdaten“ (Suche nach Lösungswerten im JSON).
- **Datenschutz:** Freitexte nie an den Server (E7, `kernpunkte` speichert nur die Häkchen-Anzahl); SQL-Entwürfe nur
  im `localStorage`; Fehlabfragen nur normalisiert, ohne `sub`, max. 20 je Kurs × Aufgabe, max. 500 Zeichen.
- **Punkte:** `round(p × max(0.25, 1 − 0.25·F − 0.2·T))`, Standard 10/20/30, „Lösung zeigen“ → 0 Punkte, leere Antwort
  ist kein Fehlversuch; Cold Cases 0 Punkte und nicht in Rängen/Freischaltung. Ränge 0/10/30/55/80 % der Level-Punkte
  der **freigeschalteten** Akten (Namen Spec §8).
- **Inhalte:** Jede SQL-Musterlösung läuft auf Haupt-DB **und** allen in `varianten` genannten Varianten, ist im
  Abimodus `streng` regelfrei und wird vom Prüfer als richtig erkannt (Validator). Lab-Aufgaben nicht 1:1 aus den
  Arbeitsblättern. Schüler geduzt, Verhöre gesiezt mit Operator und `[x BE]` nicht nötig im Lab (nur Punkte).
- Verhör-DBs V1–V3 vollständig kuratiert unter `seed/datenbanken/verhoer/<kontext>/{schema,pflicht}.sql` + `LIESMICH.md`
  + Varianten, gebaut von `db_bauen.js` (wie TuS: ohne Generator); nie öffentlich unter `/db/`.
- Content-Dateien gehören je genau einem Agenten (`seed/akten/akte1.json` …), damit parallel geschrieben werden kann.

## Review Focus

1. Schüler eines Kurses sieht nur freigeschaltete Akten seines Kurses; gesperrter Kurs (`aktiv: false`) → kein Zugriff
   für Schüler, Lehrkraft nur lesend; Schüler eines anderen Kurses kommt nicht an den Lernstand (IDs raten).
2. Kein Weg an Lösungen vorbei: `GET /api/aufgaben/:id` (Lab) ohne `loesung/erklaerung/tipps`; Verhör-Aufgaben nur mit
   laufendem Versuch; Musterlösung erst nach Lösen bzw. „Lösung zeigen“; Diagnose ohne Musterzeilen.
3. Verhör-Timer serverseitig: Antworten nach Ablauf + 30 s werden nicht gewertet; ein zweiter Versuch vor 12 h → 409.
4. Punkte und Rang stimmen nach Fehlversuchen, Tipps und „Lösung zeigen“ (Tabelle von Fällen); Kursübersicht im
   Verbund (§6) liefert echte Werte, ohne Namen.
5. Validator lehnt eine Akte ab, deren SQL-Lösung auf einer Variante falsch ist oder gegen EH §8 verstößt.

---

### Task 1: Aufgabenformat-Dokument und Beispielakte

**Files:** Create `docs/AUFGABENFORMAT.md`, `test/fixtures/akte_beispiel.json`.

Grundlage: Algo Quest `docs/AUFGABENFORMAT.md` (lesend aus `https://github.com/frankjuchim/algoquest`). Datei
`seed/akten/akte<n>.json` mit `version: 2`, `welt` (= Aktennummer 1–7), `titel`, `farbe`, `levels` (= Ermittlungen,
ids `A<n>-E<k>`, zusätzlich `coldCase`, `briefing`, `niveau` `alle|eA`), `boss` (= Verhör, id `A<n>-V`, zusätzlich
`kontextDb`, `rahmensatz`, `abimodus: "streng"`, `dauerMin`, `anzahl`, `mix`, `pool`, optional `maxJeKind`),
`aufgaben`. Kategorien (eigene Liste, Spec §4 Bereiche): `Relationales Modell` · `Schlüssel` · `Anomalien` ·
`SQL eine Tabelle` · `SQL Verbund` · `SQL Aggregation` · `Abfrage analysieren` · `ER-Modell` · `Überführung` ·
`Datenschutz`. Blöcke: Basis `text`, `hinweis`, `code`, `tabelle` + neu `dbtabelle`, `schema`, `sql`, `datenbank`
(`er`, `mengen` folgen in Phase 5 – im Dokument als „folgt“ markiert). Interaktionen: Basis `gaps`, `choice`, `order`,
`lines`, `match` + neu `sql`, `zeilen`, `ergebnis`, `kernpunkte` (Phase 5: `zellen`, `anomalie`, `zerlegen`, `schema`,
`er`). Antwortformate und Prüfregeln vollständig beschreiben. Beispielakte (`welt: 9`) enthält jeden Block und jede
Interaktion dieser Phase mindestens einmal, inkl. Verhör-Pool, Cold Case und `sql`-Aufgabe mit Varianten.
Commit `Format: AUFGABENFORMAT.md und Beispielakte`.

### Task 2: Prüfer je Interaktion

**Files:** `src/content/format.js` (Mini-Markdown-Prüfung, Lücken `[[id]]`, Normalisierung), `src/content/pruefer.js`
(`pruefeAntwort(aufgabe, antwort, { sqlPruefer }) → Promise<{ ok, rueckmeldung }>`), Test `test/pruefer_interaktionen.test.js`.

Basis-Interaktionen nach den Regeln aus Algo Quest §6 (gaps mit `zahl`/`auswahl`/`text` + Normen `code`/`text`/`exakt`
und iPad-Vereinheitlichung; choice; order mit `ersteFalschePosition`; lines; match; mehrteilig). Neu: `zeilen` (Menge der
Zeilenindizes einer `dbtabelle`), `ergebnis` (Ergebnistabelle vorhersagen: Multimenge bzw. Liste bei `reihenfolge:
true`, Zellen normalisiert wie der SQL-Prüfer), `sql` (delegiert an `pruefeSql`, Phase 2), `kernpunkte` (immer
„bearbeitet“, Antwort = Anzahl Häkchen, 0 Punkte). Rückmeldungen ohne Lösungsdaten.
- [ ] **Step 1:** Je Interaktion Fälle richtig/falsch/leer/ungültig; Musterantwort aus der Lösung wird als richtig erkannt.
- [ ] **Step 2–4.** **Step 5:** Commit `Prüfer: Basis-Interaktionen, zeilen, ergebnis, sql, kernpunkte`.

### Task 3: Validator und `npm run validate`

**Files:** `src/content/validator.js`, `scripts/validate.js` (`node scripts/validate.js [datei…] [--json]`), Test
`test/validator.test.js`.

Prüft alles aus Algo Quest §8 (Schema, ids, Eindeutigkeit über Dateien, Verweise, Lücken ↔ Felder, Lösung ↔
Interaktion, Punkte/Stufen, Kategorien, Fallen, Verhör-Mix erfüllbar) plus: `sql`-Aufgaben – Datenbank bekannt,
Varianten existieren, Musterlösung läuft in der Sandbox auf Haupt-DB + allen Varianten, `pruefeRegeln` im Abimodus
`streng` ohne Fehler, Prüfer erkennt die Musterlösung als richtig; `ergebnis`-Aufgaben mit `quelleSql` – die angegebene
Lösung stimmt mit dem echten Ergebnis überein; `zeilen`-Aufgaben mit `quelleSql` ebenso; `dbtabelle`-Blöcke mit
`quelle` stimmen mit der DB überein. Verhör-Aufgaben nutzen nur die `kontextDb` ihres Verhörs. Niveau-Regeln (Akte 5 eA).
- [ ] **Step 1:** Fehlerfälle (Review Focus 5) + Beispielakte grün. **Step 5:** Commit `Validator: Akten-Format inkl. SQL-Lösungen auf allen Varianten`.

### Task 4: Seed-Mechanik und Datenmodell

**Files:** Modify `src/db.js` (Migration 2: `akten`, `aufgaben` (id, akte, ermittlung, art lab|cc|verhoer, json,
fingerabdruck, aktiv), `fortschritt` (sub, kurs_id, aufgabe, status offen|geloest|angesehen|nachgeloest|bearbeitet,
fehlversuche, tipps, punkte, zeit), `fallen_zaehler` (sub, kurs_id, falle, anzahl), `fehlabfragen` (kurs_id, aufgabe,
sql_norm, anzahl), `abzeichen` (sub, kurs_id, abzeichen, zeit), `erfolge` (kurs_id, sub, art, zeit), `verhoer_versuche`
(id, sub, kurs_id, akte, aufgaben_json, beginn, ende, punkte, max), `leitner` (sub, kurs_id, karte, fach, faellig),
`training` (sub, kurs_id, tag, anzahl, punkte), `kernpunkte` (sub, kurs_id, aufgabe, haken)); `src/services/inhalte.js`
(Laden aller `seed/akten/*.json` beim Start, Upsert nach id, Deaktivieren fehlender, Fingerabdruck, fehlertolerant,
Seed-Bericht); `KONTO_TABELLEN`/`KURS_TABELLEN` erweitern (Verbund-Löschung, Test: Löschauftrag entfernt alle Daten).
Manifest `umfang` aus dem Seed (`aufgaben` = Lab ohne Cold Cases, `level` = Ermittlungen + Akte 7, `bosse`).
Commit `Lernkern: Datenmodell und Seed-Mechanik`.

### Task 5: Lernen, Punkte, Ränge, Abzeichen, Fehlabfragen

**Files:** `src/services/lernen.js`, `src/services/stand.js`, `src/domain.js` (RAENGE, ABZEICHEN, FALLEN),
`src/routes/schueler.js`, Tests `test/lernen.test.js`, `test/rechte.test.js`.

API (alle mit `nurAngemeldet`, Kurs aus Query/Body, Mitgliedschaft geprüft, Kurs aktiv, Akte freigeschaltet, Niveau
gA blendet eA aus): `GET /api/kurse/:kurs/stand` (Akten, Ermittlungen, Fortschrittsring, Punkte, Rang, Abzeichen,
Fallen-Zähler „Deine Fallen“), `GET /api/kurse/:kurs/aufgaben/:id` (ohne Lösungsdaten; mit abgerufenen Tipps; nach
Lösen mit Erklärung + Musterlösung), `POST …/pruefen` (Antwort, Rate-Limit 30/min je Konto für `sql`), `POST …/tipp`,
`POST …/loesung-zeigen`, `POST …/kernpunkte` (nur Anzahl). Fehlversuche je Falle zählen; Fehlabfragen normalisiert
speichern. Abzeichen dieser Phase: Erste Spur, Zehnerserie, Akte geschlossen, Beweisstück, Makellos, Ohne Tipp.
Verbund-Kursübersicht (§6) mit echten Werten (`punkte`, `geloest`, `anteil`, `welten[].anteil`).
- [ ] **Step 1:** Review Focus 1, 2, 4 als Tests; Rechte je Rolle (Schüler, Lehrkraft, Superadmin, fremder Kurs).
- [ ] **Step 5:** Commit `Lernkern: Lernen, Punkte, Ränge, Abzeichen`.

### Task 6: Kurs-Einstellungen (minimal) für Lehrkräfte

**Files:** `src/routes/lehrkraft.js`, Modify `public/lehrkraft.html` + `public/static/js/lehrkraft.js`; Test
`test/lehrkraft.test.js`. Je Kurs: Akten freischalten (1–7), Niveau eA/gA, Verhör auto/offen/gesperrt; nur Lehrkräfte
des Kurses (laut Token) und Superadmin; gesperrter Kurs nur lesend; Origin-Prüfung + JSON. Die volle Auswertung folgt
in Phase 6. Commit `Lehrkraft: Kurs-Einstellungen (Akten, Niveau, Verhör)`.

### Task 7: Verhör-Engine

**Files:** `src/services/verhoer.js`, Routen in `src/routes/schueler.js`, Test `test/verhoer.test.js`.
Freischaltung (auto ab 60 % der Level-Punkte der Akte / offen / gesperrt), Ziehung nach `mix` und `maxJeKind`
(deterministisch je Versuch gespeichert), Reihenfolge Stufe 1 → 3, Timer serverseitig (+30 s Kulanz), Antworten
werden gespeichert, aber **ohne Rückmeldung** gewertet, Abgabe oder Zeitablauf beendet; bester Versuch zählt; neuer
Versuch frühestens nach 12 h; „besiegt“ ab 50 % → Beweisstück + Abzeichen; Abimodus `streng`; Verhör-Aufgaben nur
während des laufenden Versuchs abrufbar; nach Ende Ergebnis je Aufgabe (richtig/falsch) ohne Musterlösungen.
- [ ] **Step 1:** Review Focus 3 + Ziehung + Rechte. **Step 5:** Commit `Lernkern: Verhör-Engine`.

### Task 8: Warm-up-Trainer und Trainingsplatz T1–T3

**Files:** `src/services/warmup.js`, `src/services/training.js`, `src/content/generatoren.js`, Routen, Tests.
Warm-up: Karten `seed/warmup/warmup_a<n>.json` (`{"version":1,"karten":[{id,akte,kategorie,titel,aufgabe,sql,loesung,
loesungSql,minuten,kompetenz,falle}]}`), Leitner 5 Fächer (0/1/3/7/14 Tage), „gewusst/teilweise/nicht“, Filter nach
Akte, ohne Punkte; Lösung erst nach Aufdecken. Trainingsplatz: Generatoren T1 (Ergebnis vorhersagen: WHERE/ORDER
BY/LIMIT auf einer Zufallstabelle), T2 (GROUP-BY-Ergebnis), T3 (Zeilenzahl Kreuzprodukt/Verbund), deterministisch mit
Seed, Prüfung serverseitig über den Seed (Aufgabe wird nicht gespeichert), 1 Punkt je Aufgabe, max. 30 Punkte/Tag.
Commit `Lernkern: Warm-up-Trainer und Trainingsplatz T1–T3`.

### Task 9: Oberfläche Schüler

**Files:** `public/index.html` (Stadtplan v1 nach DESIGN §5.1: SVG mit sieben Orten, Fortschrittsring, Nebel für
gesperrte Akten, Aktenliste darunter auf dem Handy), `public/akte.html` (`/akte/:nr`, DESIGN §5.2), `public/ermittlung.html`
(`/ermittlung/:id`, DESIGN §5.3: Aufgabenkarte + Konsole mit Prüfen/Tipp/Lösung, Interaktionskarte für Nicht-SQL),
`public/verhoer.html` (`/verhoer/:akte`, DESIGN §5.9: Timer, keine Rückmeldung, Abgabe), `public/warmup.html`,
`public/training.html`, `public/static/js/kern/{api,render,interaktionen}.js` (Renderer für alle Blöcke, Interaktionen
inkl. Mischen von choice/order/match, Bug-Hunt gestuft wie Algo Quest), Kursauswahl bei mehreren Kursen, Rang und
„Deine Fallen“ im Profil, Stempel GELÖST/ANGESEHEN. Konsole aus Phase 2 mit aktivierten Knöpfen Prüfen/Tipp/Lösung
(Zeitlupe folgt Phase 4). Version 0.3.0. E2E `test/e2e/akte1.e2e.js`: Schüler meldet sich (Test-Token) an, löst A1-E1
vollständig inkl. Fehlversuch und Tipp, startet Verhör 1, gibt ab; Screenshots 1440/1024/768/375 hell/dunkel nach
`docs/screenshots/phase3/`. Commit `Oberfläche: Stadtplan, Akte, Ermittlung, Verhör, Warm-up, Training`.

### Task 10: Gastmodus „Probefall Eisdiele“ und Themenseite

**Files:** `seed/gast/probefall.json` (6 eigene Demo-Aufgaben auf der Eisdiele-DB, nie echte Aufgaben – Validator
prüft, dass keine id/kein Text aus `seed/akten` vorkommt), `src/services/gast.js`, `src/routes/gast.js` (nichts wird
gespeichert, Prüfung serverseitig, Lösungen erst nach Lösen), `public/gast.html` (Konsole auf Eisdiele, Lehrkraft-Demo
mit erfundenem Kurs nur lesend), Gast-PDF-Whitelist `materialien/Gast_PDF/verzeichnis.json` (leer, Mechanik + Test,
E13); `public/themen.html` aus dem Seed (Akten, Ermittlungen mit DS, Kompetenzen, Niveau-Übersicht `#niveaus`, Fallen,
Materialliste „nach Anmeldung“, keine Lösungen; Test durchsucht die Antwort nach Lösungswerten). Commit
`Gastmodus Probefall Eisdiele und Themenseite aus dem Seed`.

### Task 11: Verhör-Kontexte V1–V3 (Datenbanken)

**Files:** `seed/datenbanken/verhoer/{bibliothek,buergerbus,kiosk}/{schema.sql,pflicht.sql,LIESMICH.md,varianten/*.sql}`,
Modify `scripts/db_bauen.js` (Verhör-DBs wie kuratierte DBs, nie öffentlich). Pflicht-Randfälle exakt nach
`VERHOER_KONTEXTE.md`; Abnahme-Prüfungen in der LIESMICH. Kann parallel zu Tasks 1–10 laufen.
Commit `Verhör-Kontexte V1–V3: Datenbanken`.

### Tasks 12–14: Inhalte Akten 1, 2, 3 (parallel, je ein Agent)

**Files:** `seed/akten/akte<n>.json`, `seed/warmup/warmup_a<n>.json` (je ein Agent besitzt genau seine zwei Dateien).
Nach `docs/DS_PLANUNG.md` (DS 1–2 / 3–4 / 5–6): je Ermittlung 8 Lab-Aufgaben exakt nach Blueprint (ID, Titel, Stufe,
Interaktion, Kompetenz, Falle, Niveau, Inhalt) + Cold Case; Verhör-Pool nach Verhör-Blueprint (12 Aufgaben, Ziehung 6,
Mix) auf der Kontext-DB aus Task 11; Warm-up-Karten nach Blueprint (W-A<n>-…); Briefings und Intro nach `docs/STORY.md`
(max. 3 Sätze); jede Aufgabe mit Erklärung, Tipps (1–2), Fallen; konkrete Werte aus den gebauten DBs (nie raten:
Ergebnis per Sandbox ermitteln). Jede SQL-Musterlösung: Haupt-DB + genannte Varianten + Abimodus streng (`npm run
validate` grün). Abgleich mit `docs/KOMPETENZMATRIX.md` (jede dort für A1–A3 genannte ID existiert).
Commits `Inhalte: Akte <n> (Ermittlungen, Cold Cases, Verhör <n>, Warm-up)`.

### Task 15: CI, Doku, Abnahme Phase 3

- [ ] CI: `npm run validate` und `npm run e2e` in `pruefung.yml`; CLAUDE.md/README (Befehle, Inhalte), Spec §18.
- [ ] PR `phase3/…` → grüne Prüfung → Freigabe durch Frank → Merge → Live-Prüfung (Vertrag, Akte 1 als Testschüler).
- [ ] Abnahmekriterium (Roadmap): `npm run validate` grün (jede SQL-Lösung auf allen Varianten, EH-konform);
  e2e-Durchlauf Akte 1 als Schüler; Screenshots.

---

## Reihenfolge und Parallelisierung

```
Task 1 ─ Task 2 ─ Task 3 ─┬─ Task 4 ─ Task 5 ─┬─ Task 7 ─┐
                          │                   ├─ Task 6  ├─ Task 9 ─ Task 15
Task 11 (parallel) ───────┤                   └─ Task 8 ─┘   Task 10 ─┘
                          └─ Tasks 12, 13, 14 (parallel, brauchen Format + Validator + DBs)
```

## Risiken

| Risiko | Gegenmaßnahme |
|---|---|
| Blueprint verlangt Daten, die die DB nicht hergibt | Ergebnis per Sandbox ermitteln; Abweichung melden und in DS_PLANUNG/LIESMICH (bzw. Spec §18) auflösen, nicht still ändern |
| Inhaltsagenten schreiben uneinheitlich | Beispielakte + Stilregeln + Validator; Endredaktion durch den Hauptagenten (Stichproben je Akte) |
| Umfang (≈ 90 Aufgaben + 36 Verhör + 24 Warm-ups) | drei parallele Agenten mit exklusiven Dateien; Validator als harte Grenze |
