# CLAUDE.md – Datendetektei Weserstedt

## Projektüberblick

„Datendetektei Weserstedt – Ermitteln mit Datenbanken“ ist die Unterrichtseinheit **Datenbanken** für den Informatik-
Leistungskurs (eA, Grundkurs-Pfad gA) in Niedersachsen, Abitur ab 2027 (KC 2017 + Ergänzende Hinweise Neufassung 2025
= „EH“). 15 Doppelstunden: 13 Kern-DS in 7 Akten + 2 Kür-DS. Das Repo enthält:

1. **WebApp „Datendetektei“** – eine Plattform des Verbunds **InfoLabs** (Login nur über das Portal,
   `AUTH_MODUS=portal`). Live unter `https://datendetektei.frankjuchim.de` (CapRover).
2. **Unterrichtsmaterial** (`materialien/`, docx/pptx = maßgebliche Fassung) und **Planung** (`docs/`).

> ⚠️ Verbindlich ist der **Vertrag des Plattform-Verbunds** `https://github.com/frankjuchim/labs/blob/main/VERTRAG.md`
> (Version 1.2) mit der Anschlussanleitung `docs/INTEGRATION.md` desselben Repos. Abweichungen nie still: als Text für
> VERTRAG.md vorschlagen (neue Version, Eintrag in §14) – siehe `docs/VERTRAG_VORSCHLAG_1.3.md`.

> ⚠️ **Deploy:** CapRover wird ausschließlich von der GitHub Action `deploy.yml` nach grüner Prüfung auf `main`
> angestoßen. Nur auf Feature-Branches arbeiten; nach `main` nur nach ausdrücklicher Freigabe durch Frank.

## Quellen der Wahrheit (vor jeder Arbeit lesen, was die Aufgabe betrifft)

| Datei | Inhalt |
|---|---|
| `docs/superpowers/specs/2026-10-12-datendetektei-design.md` | **Spezifikation** (Entscheidungen E1–E11, Plattform, Konventionen, Phasen) – maßgeblich |
| `docs/superpowers/plans/` | Roadmap + Implementierungsplan je Phase (Phase 1 liegt vor; weitere Phasen vor Beginn mit superpowers:writing-plans erstellen) |
| `docs/DS_PLANUNG.md` | Feinplanung DS 1–13, K1, K2: Verlauf, Tafelbilder, **Blueprints aller Lab-, Verhör-, Warm-up- und Prüfungsaufgaben** |
| `docs/KOMPETENZMATRIX.md` | DB-K01…K48 × Aufgaben, Fallen-Abdeckung, Abi-Bezug |
| `docs/STORY.md` | Story-Bibel (Figuren, Briefings, Beweisstücke, Schlussplädoyer, Anhang A = Story-Fakten in den DBs) |
| `docs/DESIGN.md` + `docs/prototyp/` | Design-System „Akten-Noir light“, Komponenten, Screens; klickbarer Prototyp + Screenshots |
| `seed/datenbanken/**/LIESMICH.md` | Schemata, Pflicht-Datensätze, Randfall-Varianten, Generator-Vorgaben, Beispielabfragen |
| `seed/datenbanken/VERHOER_KONTEXTE.md` | Schemata der Verhör-, Generalprobe- und Klausurkontexte |

Widersprechen sich Dateien: Spec > DS_PLANUNG > STORY > übrige. Widerspruch melden und in der Spec (Abschnitt 18,
Änderungsprotokoll) auflösen, bevor umgesetzt wird.

## Ordnerstruktur (Ziel, Spec §14)

```
src/kern/      gemeinsamer Kern (später lab-kern): jwt.js (UNVERÄNDERT aus frankjuchim/labs), konfig, sitzung,
               sicherheit, sso, verbund, manifest, punkte – keine Abhängigkeit von src/sql oder src/er
src/sql/       EH-§8-Parser (isomorph), Regeln, Sandbox (worker_threads + better-sqlite3), Prüfer, Diagnose, Fehlertexte
src/er/        ER-Graph-Abgleich, Schema-Prüfer, Zerlegung (funktionale Abhängigkeiten)
src/content/   Prüfer je Interaktion, Validator, Trainings-Generatoren
src/services/  inhalte, lernen, verhoer, warmup, training, live, auswertung, material, gast, stand
src/routes/    schueler, lehrkraft, admin, gast, live, sso, verbund
public/        Seiten + static/{css,fonts,img,js,vendor}; sql.js vendort (sql-wasm.js/.wasm, sql-asm.js)
seed/          akten/*.json, datenbanken/<name>/{schema,pflicht}.sql + varianten/*.sql, warmup/, gast/, arbeitsblaetter.json
materialien/   docx/pptx je Akte (maßgeblich) + erzeugte PDFs: Arbeitsblaetter_PDF = Schülerfassungen (öffentlich, auch
               Präsentations-Handouts), Loesungen_Portal + Lehrkraft_PDF nur Lehrkraft, Originale (docx/pptx) nur
               Superadmin – jeweils Whitelist verzeichnis.json (Spec §12.4)
werkzeuge/     Python: *_pdf.py, material_sql_pruefen.py, materialien_pruefen.py, video_folien.py, fonts/
scripts/       vertrag_pruefen.js (UNVERÄNDERT aus labs), validate.js, db_bauen.js
test/          node:test + supertest; fixtures/akte_beispiel.json; e2e/ (Playwright)
```

## Befehle (Stand Phase 1; spätere Phasen ergänzen hier)

```
npm install
npm test                 # node --test test/*.test.js
npm run dev              # Port 3000, DATA_DIR=./data, Testschlüssel aus test/fixtures (kein echtes Portal nötig)
npm run vertrag          # node scripts/vertrag_pruefen.js http://localhost:3000
npm run kontrast         # WCAG-AA-Kontraste der Design-Tokens (scripts/kontrast_paare.json)
npm run fonts            # woff2 aus @fontsource nach public/static/fonts kopieren (nur bei Font-Änderungen)
npm run validate         # (ab Phase 2/3) Akten-JSON + SQL-Lösungen auf allen DB-Varianten
npm run e2e              # (ab Phase 3) Playwright; Chromium unter /opt/pw-browsers bzw. PLAYWRIGHT_BROWSERS_PATH
npm run pruefen          # alles: test, validate, Material-SQL, Materialien
```
docx/pptx rendern: `soffice --headless --convert-to pdf --outdir <scratch> <datei>`.

## Konventionen

### Sprache und Ansprache
- Alles auf Deutsch (Code-Bezeichner, Kommentare, Commits, UI, Doku).
- Schülerinnen und Schüler werden **geduzt**; Verhöre, Generalprobe, Klausuren, Erwartungshorizonte, Abi-Ecken im
  **Abitur-Stil gesiezt** („Entwerfen Sie …“, Operatoren fett, `[x BE]`).
- Vertragsbegriffe: Kurs, Kurscode, persönlicher Code, Lehrkraft, Warm-up, Team; **keine XP**; Punkte nur automatisch.
- Oberfläche: Welt = **Akte**, Level = **Ermittlung**, Boss = **Verhör** (im Code/Manifest bleiben welt/level/boss).
- Fachbegriffe nach EH: Entitätstyp, Beziehungstyp, Schlüsselattribut, Kardinalität, Primär-/Fremdschlüssel, Verbund.
  Nie „Entitätsmenge“. Story-Begriffe ersetzen nie Fachbegriffe.

### Notation (EH §7)
- Kurzschreibweise: PK **unterstrichen**, FK mit vorangestelltem **↑**: `Ausleihe(AusleihID, ↑RadID, …)`.
- ER: Chen-Notation, Kardinalitäten nur `1`/`n`/`m` (ternär `p`), Schlüsselattribute unterstrichen, Beziehungstypen als
  Verb in lowerCamelCase, Entitätstypen Singular. Keine (min,max)-, keine Krähenfuß-Notation.
- Namen in unseren DBs: Tabellen Singular UpperCamelCase, Spalten UpperCamelCase ohne Umlaute, Beziehungstabellen
  lowerCamelCase (`kennt`); Ausnahmen mit eigenem Namen (`Aussage`, `Schicht`, `Mitgliedschaft`, `Position`).

### SQL-Stil (EH §8, Abi-Stil 2026) – gilt in Plattform, Material, Videos
- Nur SELECT im Kern. **Verbund nur implizit** (`FROM a, b WHERE a.x = b.y`); **kein** `JOIN … ON`, **keine
  Unterabfragen**, kein UNION; `!=` statt `<>`; Text `'…'`; Datum `'JJJJ-MM-TT'` bzw. `'JJJJ-MM-TT hh:mm'`.
- Schlüsselwörter groß, je Klausel eine Zeile; Tabellenalias **ohne** AS; Spaltenalias mit AS.
- **GROUP-BY-Regel strikt** (jede SELECT-Spalte aggregiert oder gruppiert); **kein Alias in HAVING**.
- JOIN … ON, LEFT JOIN, CREATE/INSERT nur in der Kür K1, sichtbar markiert „nicht im Abitur“.

### Fallen P1–P10 (Spec §5, überall gleiche Nummern)
P1 WHERE ↔ HAVING · P2 Verbund fehlt/vervielfacht · P3 GROUP-BY-Regel · P4 COUNT ↔ SUM · P5 NULL und Literale ·
P6 Bedingungslogik · P7 mehrdeutig/falsch benannt · P8 Schlüssel falsch beurteilt · P9 ER/Überführung fehlerhaft ·
P10 Operator verfehlt.

### Daten und Namen
- Alle Personen, Firmen, Orte frei erfunden (`seed/datenbanken/namen.json`, reservierte Story-Namen beachten);
  keine Klarnamen realer Personen, keine echten Adressen/Telefonnummern.
- Beispiele in Videos und Gastmodus sind eigene Daten – nie Lab-/AB-/Verhör-/Klausuraufgaben.
- Keine Originaltexte der Abituraufgaben ins Repo (Urheberrecht) – nur Verweise (Jahr/Termin/Teilaufgabe).

## Qualitätssicherung (vor jedem Commit)
- **TDD:** erst der fehlschlagende Test, dann der Code (superpowers:test-driven-development).
- `npm test` grün; ab Phase 2 zusätzlich `npm run validate`; bei Material `npm run pruefen`.
- **Jede SQL-Lösung programmatisch prüfen:** auf Haupt-DB + allen Randfall-Varianten ausführen, EH-§8-Parser ohne
  Verstöße. Prüfskripte ins Scratchpad, nicht ins Repo (außer sie gehören zu `scripts/`/`werkzeuge/`).
- Neue Blöcke/Interaktionen: Renderer + Interaktion + Prüfer + Validator + `docs/AUFGABENFORMAT.md` +
  `test/fixtures/akte_beispiel.json` + Tests (Vertrag §9).
- Nach Änderungen an `public/static/**`: `?v=`-Version in `public/*.html` und `package.json` erhöhen.
- docx/pptx in `materialien/` sind maßgeblich → direkt bearbeiten, danach rendern und ansehen; PDFs neu erzeugen
  (`npm run arbeitsblaetter|loesungen|lehrkraft`) und mitcommitten. SQL in docx im Absatzformat „SQL-Code“.

## Datenschutz und Sicherheit (Vertrag §9/§10, Spec §7.14)
- **Lösungen, Erklärungen, nicht abgerufene Tipps verlassen den Server nie vor dem Lösen/Aufdecken**; Verhör-Aufgaben
  nur im laufenden Verhör; Prüfung ausschließlich serverseitig; Antworten des SQL-Prüfers enthalten keine Lösungsdaten.
- Gespeichert nur: `sub`, Anzeigename, Rolle, Kurs-IDs, Lernstand. **Freitexte nie** (E7), SQL-Entwürfe nur im
  `localStorage` des Geräts, Live-Antworten nach Rundenende verwerfen, IPs nur im RAM.
- Schüler-SQL nur in der Sandbox (eigener Worker, In-Memory-Kopie, nur lesend, 1,5 s, 5 000 Zeilen, verbotene Tokens).
- CSP: `default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self'; connect-src 'self'; img-src 'self' data:;
  style-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'` – keine Inline-
  Skripte/-Styles, keine CDNs, Ausgaben nur als Textknoten. `X-Robots-Tag: noindex`.
- `/sso/ende`: `Referrer-Policy: no-referrer`, `Cache-Control: no-store`, Token nie loggen (Query abschneiden).
- `pruefe()` aus `src/kern/jwt.js` **immer** mit `iss` und `aud` aufrufen (sonst prüft es sie nicht).

## Git
- Feature-Branch je Plan-Aufgabe/Phase (`phase1/…`), kleine Commits auf Deutsch, PR nach `main` nur nach Freigabe.
- `src/kern/jwt.js` und `scripts/vertrag_pruefen.js` nie verändern (Vertragsänderung!) – bei Bedarf neu aus labs kopieren.

## Offene Entscheidungen (Default gilt, bis Frank anders entscheidet)
| Frage | Default |
|---|---|
| Porträt-Illustration Edda Lorenz | nein (Silhouette/Initialen-Stempel) |
| Stadtplan auf dem Handy | wischbarer Plan + Aktenliste darunter |
| Werte in Heatmap-Zellen | Farbe + Wert (wie Prototyp) |
| Beamer-Board | immer dunkel |
| Akte 7 auf dem Stadtplan | am Detektei-Gebäude (zweiter Ring) |
| Kontrastprüfung in CI | ja, `scripts/kontrast_pruefen.js` (Phase 1, Design-Grundlagen) |
| Lizenz Materialien | offen (Vorschlag CC BY-NC-SA 4.0) – vor Veröffentlichung klären |
