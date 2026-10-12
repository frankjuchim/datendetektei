# Phase 2 – SQL-Engine (Datenbanken, Parser, Sandbox, Prüfer, Konsole) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Alles, was SQL in der Datendetektei braucht – ohne Lerninhalte: die sieben Übungsdatenbanken werden
deterministisch aus `seed/datenbanken/` gebaut (Haupt-DB + Randfall-Varianten), ein EH-§8-Parser erkennt Abi-Stil und
Fallen, eine Sandbox führt Schüler-SQL sicher aus, der Prüfer vergleicht gegen Musterlösungen auf allen Varianten und
liefert Diagnosen ohne Lösungsdaten, und die Ermittlungskonsole läuft im Browser (sql.js im Worker) – auf iPad und
Chromebook.

**Architecture:** Drei Schichten, jede für sich testbar.
1. **Bau** (`scripts/db_bauen.js` + `scripts/db/<name>.js`): Schema → Übernahme → Pflicht → Generator → Abnahme →
   `basis.sql` (eingecheckt, byte-deterministisch). Varianten = handgeschriebene Delta-Skripte `varianten/<typ>.sql`.
2. **Server** (`src/sql/`): `datenbanken.js` lädt beim Start jede `basis.sql` (+ Varianten) einmal in den Speicher und
   hält sie als serialisierte Buffer; `parser.js`/`regeln.js` (isomorph); `sandbox.js` (Pool aus Kindprozessen,
   `sandbox-prozess.js`); `pruefer.js` + `diagnose.js` + `fehlertexte.js`. `src/sql` hängt nicht von `src/kern` ab
   (umgekehrt auch nicht); Routen in `src/routes/sql.js`.
3. **Browser** (`public/static/js/konsole/`): `sql-worker.js` mit vendortem sql.js 1.14.2 (WASM, Fallback asm.js),
   Konsole (Editor, Schema-Browser, Ergebnis, Diagnose), Seite `/konsole/:db` („Freie Ermittlung“).

**Tech Stack:** wie Phase 1. Neu: `sql.js` 1.14.2 nur als devDependency zum Kopieren der Vendor-Dateien
(`scripts/sqljs_kopieren.js`, Lizenz MIT beilegen). Keine weiteren Laufzeitpakete.

**Spec:** §2.3 (EH §8), §5 (Fallen), §6.2 (SQL-Stil), §7.2–7.4, §7.6.1, §9, §17 (Risiken), §18 (Sandbox mit
Kindprozessen). Quellen: `seed/datenbanken/LIESMICH.md` (Bau, Determinismus, Variantentypen) und je DB
`seed/datenbanken/<name>/LIESMICH.md` (Generator-Vorgaben, Pflicht-Datensätze, Varianten, Beispielabfragen,
Abnahme-Prüfungen), `docs/DESIGN.md` §2.3, §4.10, §5.3, §6, §7.

## Global Constraints

- Alle Vorgaben aus Phase 1 gelten weiter (Sprache, CSP, keine Inline-Skripte, Textknoten, TDD, kleine Commits).
- **Determinismus:** kein `Math.random`, kein `Date.now` im Bau; PRNG mulberry32, Seed = FNV-1a-32 von
  `"datendetektei:<db>:v1"`; feste Iterationsreihenfolge. `node scripts/db_bauen.js --pruefen` muss in CI byteidentisch sein.
- **Namen** nur aus `seed/datenbanken/namen.json`; reservierte Nachnamen, Adressen und die Kombination Jahrgang 1988 +
  Hafenviertel nie zusätzlich erzeugen. Varianten-IDs ab 9001 (bzw. 901).
- **Sandbox (Spec §7.4, §18):** Kindprozesse (`child_process.fork`), nie `worker_threads` für Schüler-SQL. Je Anfrage:
  genau eine Anweisung, ≤ 4 000 Zeichen, verbotene Tokens (`ATTACH`, `DETACH`, `PRAGMA`, `VACUUM`, `load_extension`,
  Zeilen mit `.` am Anfang), `stmt.readonly === true` + `PRAGMA query_only = ON`, Zeitlimit **1,5 s** (danach `SIGKILL`
  und Ersatzprozess), ≤ 5 000 Ergebniszeilen (Iterator, Abbruch danach). Kein Dateipfad im Kindprozess; er bekommt nur
  Buffer. Prozesse ohne Umgebungsvariablen starten (`env: {}` + nur `NODE_ENV`), damit `SESSION_SECRET` dort nie liegt.
- **Prüfantworten enthalten nie Lösungsdaten** (keine Musterzeilen, keine Musterspalten-Namen außer bei `aliasPflicht`
  als „Spaltenname erwartet: …“ – nur wenn die Aufgabe ihn ohnehin nennt).
- Öffentlich ausgeliefert wird nur die **Haupt-DB** (`/db/<name>.sqlite`); Varianten nie (Test). Die Übungs-DBs sind
  keine Materialien im Sinne von E13 und bleiben öffentlich (Spec §7.2).
- Nach Änderungen an `public/static/**`: `?v=` in `public/*.html` und `package.json` erhöhen (Phase 2 → 0.2.0).

## Review Focus

1. Eine Endlosabfrage (`WITH RECURSIVE …`) oder ein riesiges Kreuzprodukt blockiert den Server nie länger als ~1,6 s;
   danach ist der Pool wieder voll einsatzbereit (Test mit parallelen Anfragen).
2. `SELECT 1; DROP TABLE x`, `ATTACH 'x' AS y`, `PRAGMA …`, `SELECT load_extension('x')`, `.tables`, `INSERT …` in einer
   SELECT-Aufgabe → abgelehnt mit Fehlertext, keine Ausführung; die Haupt-DB im Speicher bleibt unverändert.
3. Eine Abfrage, die auf der Übungs-DB zufällig das richtige Ergebnis liefert (z. B. Gruppieren nach Name), wird über
   die Varianten als falsch erkannt – mit Diagnose „passt nur zufällig“, ohne Lösungszeilen.
4. Parser: jede Beispielabfrage aus allen `LIESMICH.md` (außer `-- Fehlabfrage`) parst ohne Regelverstoß; jede
   `-- Fehlabfrage` löst mindestens die dort genannte Diagnose aus.
5. `basis.sql` aller DBs ist byteidentisch reproduzierbar; alle Abnahme-Prüfungen der LIESMICH-Dateien sind grün.

---

### Task 1: Bau-Rahmen `scripts/db_bauen.js`

**Files:** Create `scripts/db_bauen.js`, `scripts/db/zufall.js` (mulberry32, FNV-1a, Hilfen `waehle`, `gewichtet`,
`zeitpunkt`), `scripts/db/namen.js` (Zugriff auf `namen.json` inkl. Sperrlisten), `scripts/db/sql_schreiben.js`
(INSERTs je Tabelle nach PK sortiert, Kopfkommentar mit Seed, Version, SHA-256 der Daten); Test `test/db_bauen.test.js`.

**Interfaces:** `baueDb(name, { quellen }) → { db: Database, bericht }`; `schreibeBasis(name, db) → string`;
CLI `node scripts/db_bauen.js [--db <name>] [--pruefen]`; npm-Scripts `db` und `db:pruefen`.

- [ ] **Step 1: Failing tests:** gleicher Seed → gleiche Folge; FNV-1a-Referenzwerte; `zeitpunkt()` formatiert
  `'JJJJ-MM-TT hh:mm'`; Sperrliste greift (reservierter Nachname wird nie gezogen); `schreibeBasis` sortiert nach PK und
  ist für zwei Läufe byteidentisch; Bau-Reihenfolge `schema → uebernahme → pflicht → generator → abnahme`;
  `PRAGMA foreign_key_check`/`integrity_check` leer, sonst Abbruch ohne Schreiben.
- [ ] **Step 2–4:** FAIL → implementieren (TuS und Eisdiele ohne Generator als erste DBs durchbauen) → PASS.
- [ ] **Step 5:** Commit `DB-Bau: deterministischer Rahmen, TuS und Eisdiele`.

### Task 2: Generatoren Fundbuero und StadtRad

**Files:** `scripts/db/fundbuero.js`, `scripts/db/stadtrad.js` (je `{ generiere(db, zufall, namen), abnahme(db) }`);
`seed/datenbanken/{fundbuero,stadtrad}/basis.sql` (erzeugt); Test `test/db_generatoren.test.js`.

- [ ] **Step 1: Failing tests:** je DB alle Zeilen der Tabelle „Abnahme-Prüfungen“ aus der LIESMICH als eigener Test
  (Abfrage + erwartetes Ergebnis bzw. Bereich); Zeilenzahlen und NULL-Anteile laut „Datenumfang und Verteilung“;
  Pflicht-Datensätze unverändert (Vergleich mit `pflicht.sql`).
- [ ] **Step 2–4:** FAIL → Generatoren nach LIESMICH → PASS.
- [ ] **Step 5:** Commit `DB-Bau: Generatoren Fundbuero und StadtRad`.

### Task 3: Generatoren Stadtfest, Detektei, Datenspuren

Wie Task 2 (`scripts/db/{stadtfest,detektei,datenspuren}.js`). Datenspuren leitet aus den fertigen DBs ab
(`RadExport`, `FestZahlung`, `Einwohner`, `AppCheckin`; Bau-Reihenfolge stadtrad → stadtfest → tus → detektei →
datenspuren). Personen in mehreren DBs: gleicher Jahrgang und Stadtteil (Test). Kassenkette Stadtfest und
Re-Identifizierung Datenspuren (E11, Schlussplädoyer in 6 Stufen aus `datenspuren/LIESMICH.md`) als Abnahme-Tests.
Commit `DB-Bau: Generatoren Stadtfest, Detektei, Datenspuren`.

> Tasks 2 und 3 können parallel von zwei Agenten bearbeitet werden (getrennte Dateien); Datenspuren erst, wenn
> StadtRad und Stadtfest fertig sind.

### Task 4: Randfall-Varianten

**Files:** `seed/datenbanken/<name>/varianten/{null,gleichnamig,grenze,gleichstand,leer}.sql` nach den Tabellen
„Randfall-Varianten“ der LIESMICH-Dateien (begründete „entfällt“-Einträge: Fundbuero `leer`, TuS `gleichstand`,
Eisdiele alle); Erweiterung `db_bauen.js`: Varianten bauen und prüfen; Test `test/db_varianten.test.js`.

- [ ] **Step 1: Failing tests:** jede Variante läuft auf einer Kopie der Haupt-DB fehlerfrei, FK-/Integritätsprüfung
  leer; IDs im reservierten Bereich; je Variante die in der LIESMICH genannte Wirkung (z. B. StadtRad `null`:
  Ausleihe 9001 mit `ZielStation IS NULL`; `gleichstand`: Rang 3 und 4 gleich) als Abfrage-Test.
- [ ] **Step 2–4:** FAIL → Deltas schreiben → PASS.
- [ ] **Step 5:** Commit `DB-Bau: Randfall-Varianten aller Datenbanken`.

### Task 5: Datenbanken zur Laufzeit und `/db/<name>.sqlite`

**Files:** `src/sql/datenbanken.js`, `src/routes/sql.js`, Modify `src/app.js`, `src/server.js`; Test `test/datenbanken.test.js`.

**Interfaces:** `ladeDatenbanken(seedDir) → { namen, haupt(name) → Buffer, varianten(name) → { typ: Buffer }, schema(name)
→ [{ tabelle, spalten: [{ name, typ, pk, fk: { tabelle, spalte } | null }], zeilen }] }` (einmal beim Start, aus
`basis.sql` + Deltas, Startzeit im Log). Route `GET /db/:name.sqlite` (nur bekannte Namen, `application/vnd.sqlite3`,
`Cache-Control: public, max-age=3600`, ETag = SHA-256), `GET /api/db/:name/schema` (öffentlich).

- [ ] **Step 1: Failing tests:** alle 7 Namen bekannt; `/db/stadtrad.sqlite` 200 und von better-sqlite3 lesbar mit
  identischem Inhalt wie `basis.sql`; `/db/..%2Fplattform.sqlite`, `/db/stadtrad-null.sqlite`, unbekannter Name → 404;
  Schema enthält PK/FK (StadtRad `Ausleihe.StartStation → Station.StationID`); Start bricht ab, wenn eine `basis.sql`
  fehlt oder nicht zu `db_bauen --pruefen` passt (Prüfsumme im Kopf).
- [ ] **Step 2–4.** **Step 5:** Commit `SQL: Übungs-Datenbanken zur Laufzeit, öffentliche Haupt-DB`.

### Task 6: Tokenizer und Parser nach EH §8 (isomorph)

**Files:** `src/sql/parser.js` (UMD-Muster: CommonJS im Server, `window.DD_SQL` im Browser; keine Abhängigkeiten),
ausgeliefert unter `/static/js/sql/parser.js` (Route auf die Datei in `src/sql`, gleiche Bytes); Test `test/parser.test.js`.

**Interfaces:** `zerlege(sql) → { tokens, fehler }`; `parse(sql) → { ast, fehler: [{ code, text, zeile, spalte }] }`.
AST-Knoten mit `{ typ, start: { zeile, spalte }, ende }`: `select` (distinct, spalten mit alias, from mit Tabellenalias
mit/ohne AS, where, groupBy, having, orderBy mit ASC/DESC, limit), Ausdrücke (Vergleiche inkl. `!=`/`<>`, `IS [NOT]
NULL`, `[NOT] IN (Liste)`, `[NOT] BETWEEN`, `[NOT] LIKE`, AND/OR/NOT mit Klammern, `+ - * /`, Aggregatfunktionen
`AVG COUNT MAX MIN SUM` inkl. `COUNT(*)`/`COUNT(DISTINCT x)`, Literale Text/Zahl/NULL, qualifizierte Namen
`t.spalte`, `*`, `t.*`) und **Fremdkörper-Knoten** `join` (JOIN … ON, LEFT JOIN), `unterabfrage`, `union`,
`nichtSelect` (INSERT/UPDATE/DELETE/CREATE/DROP/ALTER), damit Regeln gezielt warnen können. Kommentare `--` und
`/* */` erlaubt. Groß-/Kleinschreibung der Schlüsselwörter egal.

- [ ] **Step 1: Failing tests:** Grammatik-Tabelle (≥ 60 Fälle: gültig/ungültig, Positionen von Fehlern in Zeile/Spalte,
  Umlaute in Text-Literalen, `''`-Escape, mehrzeilige Abfragen); **alle Beispielabfragen aus allen
  `seed/datenbanken/**/LIESMICH.md` parsen** (Extraktion der ```sql-Blöcke im Test).
- [ ] **Step 2–4.** **Step 5:** Commit `SQL: EH-§8-Parser (isomorph)`.

### Task 7: Regeln und Abimodus

**Files:** `src/sql/regeln.js` (isomorph wie der Parser), Test `test/regeln.test.js`.

**Interfaces:** `pruefeRegeln(ast, { schema?, abimodus: 'streng'|'hinweis'|'aus' }) → [{ code, falle, art:
'fehler'|'hinweis', text, zeile, spalte }]`. Codes exakt nach Spec §7.3 (`GB_REGEL`, `HAVING_OHNE_AGG`, `WHERE_MIT_AGG`,
`ALIAS_IN_HAVING`, `MEHRDEUTIG` (braucht Schema), `KEIN_VERBUND` (Graph der Verbundprädikate über FROM-Tabellen),
`NULL_VERGLEICH`, `AND_OR_MISCH` (Hinweis), `JOIN_ON`, `UNTERABFRAGE`, `UNGLEICH_ALT`, `NICHT_SELECT`). Abimodus: bei
`streng` sind Fremdkörper Fehler, bei `hinweis` Hinweise, bei `aus` still. Texte geduzt, kurz, deutsch, ohne Lösung.

- [ ] **Step 1: Failing tests:** je Code positive und negative Fälle (z. B. GROUP-BY-Regel mit Alias in GROUP BY
  erlaubt; Gruppieren nach `Kunde.KundenID, Vorname, Nachname` ok; `HAVING Anzahl > 3` mit Alias → `ALIAS_IN_HAVING`;
  Self-Join `Station s1, Station s2` mit Prädikat → kein `KEIN_VERBUND`); **alle LIESMICH-Beispielabfragen ohne
  Regelverstoß, jede `-- Fehlabfrage` mit der dort genannten Falle**.
- [ ] **Step 2–4.** **Step 5:** Commit `SQL: Regelprüfungen P1–P7 und Abimodus`.

### Task 8: Deutsche Fehlertexte

**Files:** `src/sql/fehlertexte.js` (isomorph), Test `test/fehlertexte.test.js`.
`übersetze(meldung) → text` für SQLite- und sql.js-Meldungen: `no such column`, `no such table`, `ambiguous column
name`, `near "…": syntax error`, `misuse of aggregate`, `wrong number of arguments`, `incomplete input`,
`unrecognized token`, `attempt to write a readonly database`, Zeitlimit, Zeilenlimit, verbotene Anweisung; Unbekanntes
→ allgemeiner Text ohne Rohmeldung-Details außer dem betroffenen Namen. Commit `SQL: deutsche Fehlertexte`.

### Task 9: Sandbox mit Kindprozessen

**Files:** `src/sql/sandbox.js`, `src/sql/sandbox-prozess.js`, Test `test/sandbox.test.js`.

**Interfaces:** `erzeugeSandbox({ prozesse = 2, zeitlimitMs = 1500, maxZeilen = 5000, datenbanken }) → { fuehreAus({ db,
variante?, sql, modus: 'lesen' }) → Promise<{ ok, spalten, zeilen, abgeschnitten, ms } | { ok: false, code, text }>,
beende() }`. Warteschlange, wenn alle Prozesse belegt (max. 50 wartend, sonst `ueberlastet`). Prozess bekommt die
Buffer einmal beim Start (IPC, `serialization: 'advanced'`), hält je DB/Variante ein geöffnetes Original und kopiert je
Anfrage über `serialize()`/`new Database(buffer)` (Spike: < 5 ms bei Stadtfest prüfen, sonst Tabellenkopie im Speicher).

- [ ] **Step 1: Failing tests:** Review Focus 1 und 2 vollständig; Zeilenlimit 5 000 mit `abgeschnitten: true`;
  Haupt-DB nach Schreibversuch unverändert; zwei parallele Endlosabfragen + eine normale Abfrage → normale Antwort
  < 3,5 s; Absturz eines Prozesses wird ersetzt; Kindprozess hat kein `SESSION_SECRET` in `process.env`.
- [ ] **Step 2–4.** **Step 5:** Commit `SQL: Sandbox mit Kindprozessen, Zeit- und Zeilenlimit`.

### Task 10: Prüfer und Diagnose

**Files:** `src/sql/pruefer.js`, `src/sql/diagnose.js`, Test `test/pruefer.test.js` + `test/fixtures/sql_aufgaben.json`
(≥ 25 Prüf-Fälle über alle DBs, je mit Muster, richtigen Varianten-Schreibweisen und typischen Fehlabfragen).

**Interfaces:** `pruefeSql({ sql, aufgabe: { datenbank, loesung: { sql }, varianten, sortierung?, aliasPflicht?,
abimodus } }, sandbox, datenbanken) → { ok, diagnose: [{ code, falle, text }], zeilen }` nach Spec §7.4 Schritt 1–5:
Multimenge (Zahlen 1e-6, Text getrimmt, NULL eigener Wert), Spaltenanzahl, Spaltennamen nur bei `aliasPflicht`
(normalisiert), Reihenfolge nur bei `sortierung` (mehrstufig, Gleichstände beliebig). Diagnosen: `ZU_VIELE_ZEILEN`,
`ZU_WENIGE_ZEILEN`, `KREUZPRODUKT` (Zeilenzahl = Produkt der Tabellengrößen → P2), `NULL_ZEILEN_FEHLEN` (→ P5),
`NUR_REIHENFOLGE`, `SPALTENANZAHL`, `SPALTENNAME`, `NUR_ZUFAELLIG` (Übungs-DB ok, Variante nicht), plus Parser-Regeln.
Musterlösung wird beim Laden einer Aufgabe einmal je Variante ausgeführt und gecacht (nur serverseitig).

- [ ] **Step 1: Failing tests:** Review Focus 3; jede Diagnose mit eigenem Fall; Antwort-JSON enthält keine Werte aus
  dem Musterergebnis (Test durchsucht die Antwort nach allen Musterzellen); `zeilen` = Anzahl des Schülerergebnisses.
- [ ] **Step 2–4.** **Step 5:** Commit `SQL: Prüfer mit Varianten und Diagnosen`.

### Task 11: Browser – sql.js im Worker

**Files:** `scripts/sqljs_kopieren.js` → `public/static/vendor/sqljs/{sql-wasm.js,sql-wasm.wasm,sql-asm.js,LICENSE}`
(sql.js 1.14.2); `public/static/js/konsole/sql-worker.js`, `public/static/js/konsole/ausfuehren.js`; Modify `src/app.js`
(MIME `application/wasm`); Test `test/vendor.test.js` + Playwright-Test im Scratchpad bzw. `test/e2e/` (vorgezogen aus
Phase 3, nur Konsole).

**Interfaces:** `ausfuehren.js` → `erzeugeAusfuehrer({ dbUrl }) → { fuehreAus(sql) → Promise<{ spalten, zeilen,
gesamt, ms } | { fehler }>, abbrechen(), schema() }`; Worker lädt die DB per `fetch` (gleiche Herkunft), führt nur
die erste Anweisung aus; nach 3 s `terminate()` + Neustart (im Browser beendet `terminate` den Worker sicher);
Anzeige max. 300 Zeilen, `gesamt` exakt; WASM-Erkennung mit Fallback `sql-asm.js`.

- [ ] **Step 1: Failing tests:** Vendor-Dateien vorhanden, Hash in `test/fixtures/vendor_hashes.json`; `.wasm` mit
  `application/wasm`; E2E: Abfrage auf Fundbuero liefert erwartete Zeilen; Endlosabfrage → Abbruch nach 3 s, danach
  wieder ausführbar; ohne WASM (Seite mit `WebAssembly` entfernt per Init-Skript) läuft der Fallback; keine CSP-Meldung.
- [ ] **Step 2–4.** **Step 5:** Commit `Konsole: sql.js im Web Worker mit Abbruch und Fallback`.

### Task 12: Ermittlungskonsole (Oberfläche) und „Freie Ermittlung“

**Files:** `public/konsole.html`, `public/static/css/konsole.css`, `public/static/js/konsole/{editor,schema,ergebnis,
konsole}.js`; Route `GET /konsole/:db` (alle sieben DBs für angemeldete Konten, `eisdiele` auch ohne Anmeldung);
Modify `public/themen.html`/`index.html` (Link „Freie Ermittlung“); Tests `test/seiten.test.js` (erweitert), E2E.

Nach `docs/DESIGN.md` §4.10 und §5.3: Editor mit Zeilennummern und Syntax-Overlay (Tokenizer aus `parser.js`),
Strg/Cmd+Enter, Tab = zwei Leerzeichen, Randmarken für Parser-Hinweise (Abimodus `hinweis`), Schema-Browser (PK
unterstrichen, FK `↑` + Ziel, Antippen fügt `Tabelle.Spalte` ein), Ergebniskopf („60 Zeilen · 3 Spalten“), Diagnose mit
Fallen-Plakette, Leer- und Fehlerzustände mit den Mikrotexten aus DESIGN §9, Entwurf im `localStorage` (try/catch). Die
Knöpfe Prüfen/Zeitlupe/Tipp/Lösung erscheinen erst mit Aufgaben (Phase 3/4) – hier ausgeblendet.

- [ ] **Step 1: Failing tests:** `/konsole/eisdiele` ohne Anmeldung 200, `/konsole/stadtrad` ohne Anmeldung 302 auf
  `/sso/start?ziel=…`, unbekannte DB 404; E2E: Abfrage tippen → Strg+Enter → Tabelle; `<>` zeigt Randmarke
  `UNGLEICH_ALT`; Antippen im Schema fügt Spalte ein; Entwurf übersteht Neuladen; kein `innerHTML`.
- [ ] **Step 2–4.** **Step 5:** Sichtprüfung per Playwright: **iPad** 1024×768 und 768×1024 (Touch, `hasTouch`),
  **Chromebook** 1366×768, Handy 375; hell/dunkel; Screenshots nach `docs/screenshots/phase2/` (diese gehören ins Repo,
  Abnahme). Commit `Konsole: Ermittlungskonsole und Freie Ermittlung`.

### Task 13: CI, Doku, Version

**Files:** Modify `.github/workflows/pruefung.yml` (`npm run db:pruefen`, E2E der Konsole mit Chromium),
`package.json` (Version 0.2.0, Scripts `db`, `db:pruefen`, `sqljs`, `e2e`), `public/*.html` (`?v=0.2.0`), `CLAUDE.md`
(Befehle), `README.md` (Abschnitt „Datenbanken bauen“), `docs/superpowers/specs/…` §18 (Abweichungen dieser Phase).
Commit `Phase 2: CI, Doku, Version 0.2.0`.

### Task 14: Abnahme Phase 2 (mit Frank)

- [ ] PR `phase2/sql-engine` → grüne Prüfung → Freigabe → Merge (Webhook deployt).
- [ ] Live: `node scripts/vertrag_pruefen.js https://datendetektei.frankjuchim.de` (Version 0.2.0); `/konsole/eisdiele`
  ohne Anmeldung nutzbar; nach Login `/konsole/stadtrad`.
- [ ] Frank prüft die Konsole auf einem echten iPad und einem Chromebook der Schule (inkl. Schulnetz: WASM oder
  Fallback?) und meldet Auffälligkeiten.
- [ ] Protokoll im PR (Testausgabe, Screenshot-Liste, Abnahme-Prüfungen der DBs), Spec §18 ergänzen,
  Commit `Phase 2 abgenommen`.

---

## Reihenfolge und Parallelisierung

```
Task 1 ─┬─ Task 2 ─┐
        └─ Task 3 ─┴─ Task 4 ─ Task 5 ─┐
Task 6 ─ Task 7 ─ Task 8 ──────────────┼─ Task 9 ─ Task 10 ─┐
Task 11 ───────────────────────────────┴────────────────────┴─ Task 12 ─ Task 13 ─ Task 14
```
Parser/Regeln (6–8) hängen nicht vom DB-Bau ab und können parallel zu 1–4 laufen; die LIESMICH-Beispielabfragen
in den Parser-Tests brauchen keine gebauten DBs. Task 11 (Vendor + Worker) ist ebenfalls unabhängig.

## Risiken

| Risiko | Gegenmaßnahme |
|---|---|
| Generator-Vorgaben einer LIESMICH sind widersprüchlich oder unerfüllbar | Abbruch mit Meldung; Widerspruch melden und in der LIESMICH bzw. Spec §18 auflösen, bevor umgesetzt wird (CLAUDE.md) |
| Kopie je Prüfung zu langsam (Stadtfest/Datenspuren) | Messung in Task 9; sonst ein schreibgeschütztes Original je Prozess (Lesen ist durch `query_only` + `readonly` abgesichert) |
| sql.js-WASM im Schulnetz blockiert | asm.js-Fallback (Task 11), Abnahme im Schulnetz (Task 14) |
| Parser zu streng/zu locker gegenüber echten Schülerabfragen | Grammatik-Tabelle + alle LIESMICH-Beispiele; in Phase 3 Fehlabfragen-Liste der Lehrkraft als Rückkopplung |
