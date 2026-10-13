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

> ⚠️ **`main` ist direkt mit CapRover verbunden (Webhook): Jeder Push auf `main` startet sofort den Live-Build –
> auch wenn die GitHub-Prüfung rot ist.** Nur auf Feature-Branches arbeiten; nach `main` nur nach ausdrücklicher
> Freigabe durch Frank und mit grüner Prüfung auf dem Feature-Branch.

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
src/sql/       EH-§8-Parser (isomorph), Regeln, Sandbox (Kindprozesse + better-sqlite3), Prüfer, Diagnose, Fehlertexte
src/er/        Modellierungs-Kern (reine Funktionen): namen (Normalisierung, Synonyme), abgleich (ER-Graph gegen
               Musterlösungen), zuordnung, schema (Relationenschema-Abgleich), zerlegung (FA, Hülle, Chase)
src/content/   Prüfer je Interaktion, Validator, Trainings-Generatoren
src/services/  inhalte, lernen, verhoer, warmup, training, live, auswertung, material, gast, stand
src/routes/    schueler, lehrkraft, admin, gast, live, sso, verbund
public/        Seiten + static/{css,fonts,img,js,vendor}; sql.js vendort (sql-wasm.js/.wasm, sql-asm.js);
               Werkzeuge static/js/{zeitlupe,spurenbrett,sortierfaecher,bauplan,werkbank}
seed/          akten/*.json, datenbanken/<name>/{schema,pflicht}.sql + varianten/*.sql, warmup/, gast/, live/,
               fallebene.json, arbeitsblaetter.json (Material ↔ Ermittlung), videos.json (YouTube-Links)
materialien/   docx/pptx je Akte (maßgeblich) + erzeugte PDFs: Arbeitsblaetter_PDF = Schülerfassungen (nur angemeldet; öffentlich nur Gast-Auswahl Gast_PDF, E13; auch
               Präsentations-Handouts), Loesungen_Portal + Lehrkraft_PDF nur Lehrkraft, Originale (docx/pptx) nur
               Superadmin – jeweils Whitelist verzeichnis.json (Spec §12.4)
werkzeuge/     Python: akten_design.py, *_pdf.py, material_sql_pruefen.py, materialien_pruefen.py, kompetenz_abdeckung.py,
               video_folien.py, fonts/, tests/
quellen/       material/*.py – Erstellungshilfen der Materialien (danach sind die docx/pptx maßgeblich)
scripts/       vertrag_pruefen.js (UNVERÄNDERT aus labs), validate.js, db_bauen.js
test/          node:test + supertest; fixtures/akte_beispiel.json; e2e/ (Playwright)
```

## Befehle (Stand Phase 7)

```
npm install
npm test                 # node --test test/*.test.js
npm run dev              # Port 3000, DATA_DIR=./data, Testschlüssel aus test/fixtures (kein echtes Portal nötig)
npm run vertrag          # node scripts/vertrag_pruefen.js http://localhost:3000
npm run kontrast         # WCAG-AA-Kontraste der Design-Tokens (scripts/kontrast_paare.json)
npm run fonts            # woff2 aus @fontsource nach public/static/fonts kopieren (nur bei Font-Änderungen)
npm run db               # Übungs- und Verhör-DBs aus seed/datenbanken bauen → <db>/basis.sql (deterministisch)
npm run db:pruefen       # neu bauen und byteweise mit basis.sql vergleichen, alle Varianten prüfen (CI)
npm run sqljs            # sql.js-Vendor-Dateien nach public/static/vendor/sqljs kopieren (nur bei Versionswechsel)
npm run validate         # seed/akten, seed/warmup, seed/gast: Format + jede SQL-Lösung auf allen Varianten, EH-konform
AKTEN_DATEIEN=test/fixtures/akte_beispiel.json npm run dev   # zusätzlich die Beispielakte (welt 9) laden
npm run e2e              # Playwright (test/e2e/*.e2e.js); Chromium aus /opt/pw-browsers bzw. CHROMIUM_PFAD; SCREENSHOTS=1 für Fotos
                         # (Phase 5: test/e2e/modellierung.e2e.js mit echten Akten 4/5 → docs/screenshots/phase5/)
                         # (Phase 6: test/e2e/probelauf.e2e.js – Testkurs mit Lehrkraft + 3 Schüler:innen über alle
                         #  Akten, Live-Duell, Board, Urkunden, Kür → docs/screenshots/phase6/probelauf_*)
npm run pruefen          # alles: test, validate, material:tests, material:vollstaendig, material:sql, material:pruefen,
                         # material:kompetenzen (streng; begründete Ausnahmen in werkzeuge/kompetenz_abdeckung.py)

# Materialien (Phase 7; LibreOffice + python-docx/-pptx, pypdf, Pillow; Details docs/MATERIALIEN.md)
npm run arbeitsblaetter  # Schülerfassungen → materialien/Arbeitsblaetter_PDF (Warm-up ohne Lösungsteil)
npm run loesungen        # Lösungen → materialien/Loesungen_Portal
npm run praesentationen  # Handouts (Arbeitsblaetter_PDF) + Fassungen mit Notizen (Lehrkraft_PDF)
npm run lehrkraft        # Lehrerhinweise, Gesamt, Generalprobe, Klausuren, Video-Folien → materialien/Lehrkraft_PDF
npm run originale        # materialien/Originale/verzeichnis.json (docx/pptx, nur Superadmin)
npm run material:pdf     # alle fünf in dieser Reihenfolge (nur fehlende/veraltete; --alle erzwingt alles)
npm run material:vollstaendig  # --pruefen aller Pipeline-Skripte (Vollständigkeit, SHA-256-Aktualität; ohne LibreOffice)
npm run material:sql     # jede SQL-Anweisung in docx/pptx gegen ihre DB (EH §8, Ergebnistabellen)
npm run material:pruefen # Begriffe, `<>`/JOIN, Klarnamen (werkzeuge/klarnamen.txt), PDF-Namen, Schülerfassungen ohne Lösung
npm run material:kompetenzen   # KOMPETENZMATRIX × Akten × Warm-up × Material (--streng)
npm run material:tests   # Python-Tests werkzeuge/tests (u. a. Schüler-PDFs ohne Lösung/Story-Auflösung)
npm run videos           # Videos: video.json → Folien (pptx) + Drehbuch (md); npm run videos:bilder rendert vorher die
                         # Plattform-Bilder (Playwright); npm run videos:pruefen; npm run db:video baut video/schachturnier
```
docx/pptx rendern: `soffice --headless --convert-to pdf --outdir <scratch> <datei>`.

**Materialien (Phase 7):** `quellen/material/akte<n>.py`, `gesamt.py`, `kuer.py` sind nur **Erstellungshilfen** – danach
sind die docx/pptx in `materialien/` maßgeblich und werden direkt bearbeitet. Ein Skript nie „nebenbei“ neu laufen
lassen: es überschreibt alle seine Dateien (nicht byte-reproduzierbar). Muss es laufen (z. B. `gesamt.py` für die
Materialliste nach neuen Einträgen in `seed/arbeitsblaetter.json`), danach unveränderte Dateien per `git checkout`
zurückholen, `npm run material:pdf` laufen lassen, die geänderten Seiten rendern und ansehen und PDFs + `quellen.json` +
Verzeichnisse mitcommitten. Neue Materialien immer über `seed/arbeitsblaetter.json` eintragen (die Whitelists
`verzeichnis.json` erzeugt die Pipeline – nie von Hand). Erklärvideos: Links nur in `seed/videos.json` (nur YouTube,
Link-Knopf, kein Embed). Sichtprüfung der Phase 7: `docs/screenshots/phase7/`.

Seiten (Phase 6): `/pinnwand` (Beweisstücke, Indizienkette des Schlussplädoyers, Steckbrief nach Regel E10),
`/live` (Live-Runde beitreten), `/lehrkraft` (Reiter Übersicht, Einstellungen, Auswertung, Vorschau, Live, Board,
Urkunden, Materialien; Superadmin zusätzlich System), `/lehrkraft/live` + `/live/<runde>/beamer` (Steuerung, Beamer),
`/lehrkraft/urkunden` (Druckseite), `/board/<schlüssel>` (Beamer-Board ohne Anmeldung, immer dunkel, nur Anzeigenamen).
Fallebene in `seed/fallebene.json`, Live-Inhalte in `seed/live/`, Kür K1 in `seed/akten/kuer.json` (Welt 8, `kuer: true`,
nur eA, keine Verbund-Welt). Neue Tabellen müssen vom Verbund-Löschauftrag erfasst werden
(`test/verbund_loeschen_alles.test.js` durchsucht alle Tabellen).

Werkzeugseiten (ohne Anmeldung, ohne Prüfung, Entwurf im `localStorage`): `/werkzeug/bauplan` (Bauplan-Tisch, ER in
Chen-Notation, Zeichnen + Liste), `/werkzeug/werkbank` (Schema-Werkbank); angemeldet bzw. mit `?db=eisdiele`:
`/werkzeug/zeitlupe`, `/werkzeug/spurenbrett`, `/werkzeug/sortierfaecher`. ER-Layouts in Akten: `test/chen_layout.test.js` prüft Überlappungen.

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
  (`npm run material:pdf`) und mitcommitten; `npm run pruefen` grün. SQL in docx im Absatzformat „SQL-Code“.

## Datenschutz und Sicherheit (Vertrag §9/§10, Spec §7.14)
- **Lösungen, Erklärungen, nicht abgerufene Tipps verlassen den Server nie vor dem Lösen/Aufdecken**; Verhör-Aufgaben
  nur im laufenden Verhör; Prüfung ausschließlich serverseitig; Antworten des SQL-Prüfers enthalten keine Lösungsdaten.
- Gespeichert nur: `sub`, Anzeigename, Rolle, Kurs-IDs, Lernstand. **Freitexte nie** (E7), SQL-Entwürfe nur im
  `localStorage` des Geräts, Live-Antworten nach Rundenende verwerfen, IPs nur im RAM.
- Schüler-SQL nur in der Sandbox (eigener Kindprozess, Abbruch per SIGKILL, In-Memory-Kopie, nur lesend, 1,5 s, 5 000 Zeilen, verbotene Tokens).
  **Einzige Ausnahme: Schreibmodus der Kür K1** (`fuehreSkriptAus`, `POST /api/kurse/:kurs/aufgaben/:id/skript`): je
  Anfrage eine frische In-Memory-DB (leer oder Startschema), CREATE/INSERT erlaubt, FK an, 1,5 s, ≤ 200 Anweisungen,
  ≤ 20 Tabellen, ≤ 500 Zeilen je Tabelle, ≤ 1 MB, Skript ≤ 10 000 Zeichen, TEMP/TRIGGER/VIEW/VIRTUAL verboten; nie
  Akten-DBs oder die Plattform-DB, nichts wird gespeichert.
- Live-Modus nur im RAM (Antworten, Teams, Statistik); Board und CSV ohne `sub`.
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
