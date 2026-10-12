# Phase 1 – Gerüst und Kern (Verbund-Anbindung) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eine lauffähige, vertragskonforme Plattform-Hülle „Datendetektei“: Anmeldung nur über das InfoLabs-Portal
(SSO), Verbund-API, Manifest, Healthcheck, Seitenhülle im neuen Design, Docker-Image und CI mit Deploy erst nach grüner
Prüfung – noch ohne Lerninhalte.

**Architecture:** Express-5-App mit Fabrikfunktion `erzeugeApp(konfig, db)` (testbar mit supertest, ohne Port). Alles,
was Vertrag §13.3 als gemeinsamen Kern nennt, liegt in `src/kern/` und hängt nur von `node:*`, `express`,
`better-sqlite3` ab. Plattform-Daten in einer SQLite-Datei (`DATA_DIR/plattform.sqlite`), Konten/Kurse werden
ausschließlich per Upsert aus dem SSO-Token angelegt.

**Tech Stack:** Node ≥ 20 (Docker: node:22-bookworm-slim), Express 5, better-sqlite3, helmet; Tests: `node:test` +
supertest; keine weiteren Laufzeitpakete. Fonts: `@fontsource/barlow`, `@fontsource/barlow-condensed`,
`@fontsource/ibm-plex-mono` nur als devDependencies zum einmaligen Kopieren der woff2-Dateien.

**Spec:** `docs/superpowers/specs/2026-10-12-datendetektei-design.md` (§2.6, §7.1, §7.13–7.16, §8, §14) und
Vertrag `https://github.com/frankjuchim/labs/blob/main/VERTRAG.md` v1.1 + `docs/INTEGRATION.md` (beides vor Beginn
lesen; das labs-Repo ist öffentlich: `git clone --depth 1 https://github.com/frankjuchim/labs` in den Scratchpad).

## Global Constraints

- Sprache: Deutsch in Code-Bezeichnern, Kommentaren, Commits, UI. Schüler geduzt.
- `PLATTFORM_ID=datendetektei` (Regex `^[a-z][a-z0-9-]{1,30}$`), `AUTH_MODUS=portal` (in Phase 1 ist nur `portal`
  erlaubt; andere Werte → Startabbruch mit Meldung).
- `src/kern/jwt.js` und `scripts/vertrag_pruefen.js` **byte-identisch** aus `frankjuchim/labs` (`src/jwt.js`,
  `scripts/vertrag_pruefen.js`) kopieren und nie ändern.
- `pruefe()` immer mit `iss: konfig.portalUrl`, `aud: konfig.plattformId`; SSO `maxDauerSek: 120`, Verbund
  `maxDauerSek: 60`; zwei getrennte `JtiSpeicher`.
- Sitzungsdauer: Schüler 30 Tage, Lehrkraft und Superadmin 8 Stunden. Cookies signiert (HMAC-SHA256 mit
  `SESSION_SECRET`), `HttpOnly; SameSite=Lax; Path=/`, `Secure` außer bei `ERLAUBE_HTTP=1` (nur Entwicklung/Tests).
  Cookie-Namen: `dd_s` (Sitzung), `dd_sso_state` (state, Max-Age 600).
- CSP exakt: `default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self'; connect-src 'self';
  img-src 'self' data:; style-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self';
  object-src 'none'`. Header `X-Robots-Tag: noindex`. Kein `x-powered-by`.
- Keine Inline-Skripte/-Styles, keine CDNs; Ausgaben im Browser nur als Textknoten.
- Version: `package.json` `"version": "0.1.0"`; `/healthz` und Manifest lesen sie aus `package.json`.
- Nichts loggen, was ein Token enthält (Query-String von `/sso/ende` nie protokollieren).

## Review Focus

1. `ziel` mit `//boese.example`, `/\boese`, `%2F%2Fboese` oder absoluter URL → Weiterleitung auf `/` (nie extern).
2. Token mit `sub`, das nicht zur `rolle` passt (`s:5` mit `rolle: "lehrkraft"`), oder `kurse[].id` ohne Format
   `^k:\d+$` → 401, keine Sitzung, kein Konto angelegt.
3. Erneuter Login, nachdem ein Kurs im Token fehlt → Mitgliedschaft entfernt, Konto und (künftiger) Lernstand bleiben.
4. Zwei Browser-Tabs starten parallel `/sso/start` → das zweite `/sso/ende` scheitert am state; Antwort ist eine
   verständliche HTML-Seite (Status 401) mit Link „Erneut anmelden“, kein roher Fehlertext.
5. `POST /api/verbund/loeschen` mit `{}` oder mit beiden Feldern `sub` und `kurs` → 400; mit gültigem, aber unbekanntem
   `sub` → 200 `{ "geloescht": 0 }`.

---

### Task 1: Projektgerüst, App-Fabrik, Sicherheits-Header, Healthcheck

**Files:**
- Create: `package.json`, `src/app.js`, `src/server.js`, `src/kern/sicherheit.js`, `public/404.html`
- Test: `test/app.test.js`, `test/helpers.js`

**Interfaces:**
- Produces: `erzeugeApp(konfig, db) → express.Application` (`src/app.js`); `sicherheitsHeader() → middleware`
  (`src/kern/sicherheit.js`); `test/helpers.js` exportiert `testKonfig(ueberschreiben?) → konfig` und
  `testApp(ueberschreiben?) → { app, db, konfig, schluessel }` (in-memory DB, frisches Ed25519-Schlüsselpaar,
  `ERLAUBE_HTTP` gesetzt) – in Task 1 als Minimalfassung, in Task 2–4 um Konfiguration, DB und Token-Helfer erweitert.
- package.json scripts: `start` (`node src/server.js`), `dev`, `test` (`node --test test/*.test.js`),
  `vertrag` (`node scripts/vertrag_pruefen.js http://localhost:3000`).

- [ ] **Step 1: Failing tests** in `test/app.test.js`:
  - `healthz liefert status ok und version aus package.json` → `GET /healthz` 200, Body `{ status: 'ok', version: '0.1.0' }`.
  - `CSP ist exakt gesetzt` → Header `content-security-policy` enthält `'wasm-unsafe-eval'` und `worker-src 'self'`,
    enthält weder `unsafe-inline` noch `unsafe-eval'` ohne `wasm-`.
  - `X-Robots-Tag noindex und kein x-powered-by`.
  - `unbekannte Seite liefert 404-Seite` → `GET /gibtsnicht` 404, `text/html`.
- [ ] **Step 2:** `npm test` → FAIL (Module fehlen).
- [ ] **Step 3:** Implementieren: helmet mit obiger CSP (`useDefaults: false`), `app.disable('x-powered-by')`,
  `express.json({ limit: '100kb' })`, `express.static('public', { maxAge: '1h' })`, 404-Handler. `src/server.js` liest
  Konfiguration (Task 2) und DB (Task 3) – bis dahin mit Platzhalter-Aufruf, der in Task 2/3 ersetzt wird.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** Commit `Gerüst: App-Fabrik, Sicherheits-Header, Healthcheck`.

### Task 2: Konfiguration

**Files:**
- Create: `src/kern/konfig.js`
- Test: `test/konfig.test.js`

**Interfaces:**
- Produces: `ladeKonfig(env = process.env) → { plattformId, plattformUrl, portalUrl, portalPublicKey, authModus,
  sessionSecret, dataDir, port, trustProxy, erlaubeHttp }`; wirft `Error` mit deutscher Meldung bei ungültigen Werten.

- [ ] **Step 1: Failing tests:**
  - `gültige Umgebung wird übernommen` (PLATTFORM_ID `datendetektei`, URLs ohne `/` am Ende, `PORT` als Zahl).
  - `PLATTFORM_ID mit Großbuchstaben wird abgelehnt` → wirft, Meldung enthält `PLATTFORM_ID`.
  - `AUTH_MODUS lokal wird abgelehnt` (nur `portal` zulässig).
  - `fehlender PORTAL_PUBLIC_KEY wird abgelehnt`.
  - `PORTAL_PUBLIC_KEY einzeilig mit \n wird zu PEM` (Literal `\n` → Zeilenumbruch; mehrere PEM-Blöcke bleiben erhalten).
  - `SESSION_SECRET kürzer als 32 Zeichen wird abgelehnt`.
  - `abschließender Schrägstrich in PORTAL_URL wird entfernt`.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implementieren; Standardwerte: `PLATTFORM_ID` = `datendetektei`, `DATA_DIR` = `./data`,
  `PORT` = 3000, `TRUST_PROXY` = 0. `src/server.js` nutzt `ladeKonfig()` und bricht mit lesbarer Meldung ab.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** Commit `Kern: Konfiguration nach Vertrag §8`.

### Task 3: Plattform-Datenbank und Konten aus dem Token

**Files:**
- Create: `src/db.js`, `src/kern/konten.js`
- Test: `test/konten.test.js`

**Interfaces:**
- Produces:
  - `oeffneDb(pfad | ':memory:') → Database` (better-sqlite3, `journal_mode = WAL` bei Datei, `foreign_keys = ON`,
    Schema-Version in `meta`).
  - Schema v1: `meta(schluessel TEXT PK, wert TEXT)`; `konten(sub TEXT PK, name TEXT NOT NULL, rolle TEXT NOT NULL
    CHECK(rolle IN ('schueler','lehrkraft','superadmin')), zuletzt TEXT NOT NULL)`; `kurse(kurs_id TEXT PK, name TEXT
    NOT NULL, aktiv INTEGER NOT NULL DEFAULT 1, einstellungen TEXT NOT NULL DEFAULT '{}', board_schluessel TEXT)`;
    `mitgliedschaften(sub TEXT REFERENCES konten ON DELETE CASCADE, kurs_id TEXT REFERENCES kurse ON DELETE CASCADE,
    rolle TEXT NOT NULL CHECK(rolle IN ('mitglied','lehrkraft')), PRIMARY KEY(sub, kurs_id))`.
  - `upsertAusToken(db, nutzlast) → { sub, rolle, name }` – in einer Transaktion: Konto upsert, unbekannte Kurse mit
    `STANDARD_EINSTELLUNGEN` anlegen, Kursnamen aktualisieren, Mitgliedschaften des `sub` exakt auf die Token-Liste setzen.
  - `STANDARD_EINSTELLUNGEN = { akten: [1], niveau: 'eA', verhoer: 'auto', scoreboard: false, beamer: false }`.
  - `loescheKonto(db, sub) → number` (Anzahl gelöschter Zeilen über alle konto-bezogenen Tabellen),
    `loescheKurs(db, kursId) → number`, `aendereKurs(db, kursId, { name?, aktiv? }) → void` (unbekannt → anlegen),
    `kursUebersicht(db, kursId) → object | null` (Format Vertrag §6; in Phase 1 `punkte/geloest/anteil` = 0,
    `welten` = Akten aus `src/domain.js` mit `anteil` 0; `zuletzt` = `konten.zuletzt`).
  - `src/domain.js`: `AKTEN = [{ nr: 1, titel: 'Das Fundbüro' }, { nr: 2, titel: 'Spur der Räder' }, { nr: 3, titel: 'Die
    Stadtfest-Kasse' }, { nr: 4, titel: 'Chaos im Vereinsarchiv' }, { nr: 5, titel: 'Der Bauplan' }, { nr: 6, titel:
    'Datenspuren' }, { nr: 7, titel: 'Generalprobe' }]`.

- [ ] **Step 1: Failing tests:**
  - `upsert legt Konto, Kurse und Mitgliedschaften an` (Token mit zwei Kursen, Rollen mitglied/lehrkraft).
  - `erneuter Login ohne Kurs entfernt nur die Mitgliedschaft` (Konto und Kurs bleiben).
  - `Kursname wird aktualisiert`.
  - `loescheKonto ist idempotent` → erster Aufruf > 0, zweiter 0.
  - `loescheKurs löscht Mitgliedschaften mit`.
  - `aendereKurs legt unbekannten Kurs an` und `aktiv false sperrt`.
  - `kursUebersicht unbekannter Kurs liefert null`; bekannter Kurs: `schueler` enthält nur Rolle `mitglied`.
- [ ] **Step 2:** FAIL. **Step 3:** Implementieren. **Step 4:** PASS.
- [ ] **Step 5:** Commit `Kern: Plattform-Datenbank, Konten und Kurse aus dem Token`.

### Task 4: Vertragsdateien und Testschlüssel

**Files:**
- Create: `src/kern/jwt.js` (Kopie labs `src/jwt.js`), `scripts/vertrag_pruefen.js` (Kopie labs), Erweiterung
  `test/helpers.js`
- Test: `test/jwt.test.js`

**Interfaces:**
- Consumes: `signiere, pruefe, JtiSpeicher` aus `src/kern/jwt.js`.
- Produces in `test/helpers.js`: `ssoToken(schluessel, konfig, ueberschreiben?) → string` (Standard-Nutzlast: `iss`
  Portal, `aud` `datendetektei`, `sub: 's:1042'`, `rolle: 'schueler'`, `name: 'Lena K.'`, `kurse: [{ id: 'k:17', name:
  'Inf-LK 12', rolle: 'mitglied' }]`, `iat` jetzt, `exp` jetzt + 90, `jti` 22 Zeichen Zufall, `v: 1`);
  `verbundToken(schluessel, konfig, zweck, ueberschreiben?) → string` (`sub: 'portal'`, `exp − iat = 30`).

- [ ] **Step 1: Failing test** `jwt.js ist unverändert aus labs` → SHA-256 der Datei gleich dem in
  `test/fixtures/labs_hashes.json` hinterlegten Wert (Hash beim Kopieren einmal berechnen und eintragen; ebenso für
  `scripts/vertrag_pruefen.js`). Zweiter Test: `ssoToken wird von pruefe akzeptiert`.
- [ ] **Step 2:** FAIL. **Step 3:** Dateien kopieren, Hashes eintragen, Helfer schreiben. **Step 4:** PASS.
- [ ] **Step 5:** Commit `Kern: jwt.js und vertrag_pruefen.js aus labs (unverändert)`.

### Task 5: Sitzung

**Files:**
- Create: `src/kern/sitzung.js`
- Test: `test/sitzung.test.js`

**Interfaces:**
- Produces: `setzeSitzung(res, konfig, { sub, rolle }) → void`; `leseSitzung(req, konfig, db) → { sub, rolle, name } | null`
  (prüft Signatur, Ablauf und dass das Konto noch existiert); `beendeSitzung(res, konfig) → void`;
  `setzeCookie(res, konfig, name, wert, maxAgeSek)`, `leseCookie(req, konfig, name) → string | null` (HMAC,
  `timingSafeEqual`); Middleware `nurAngemeldet(rollen[]) ` → ohne Sitzung bei HTML-Anfragen 302 auf
  `/sso/start?ziel=<originalUrl>`, bei `/api/*` 401 JSON.

- [ ] **Step 1: Failing tests:** `Sitzung Schüler hält 30 Tage` (Max-Age 2592000), `Sitzung Lehrkraft hält 8 Stunden`
  (28800), `manipuliertes Cookie wird verworfen`, `abgelaufene Sitzung wird verworfen` (Uhr injizierbar über
  `konfig.jetzt`), `gelöschtes Konto beendet Sitzung`, `nurAngemeldet leitet HTML auf /sso/start mit ziel um`.
- [ ] **Step 2:** FAIL. **Step 3:** Implementieren (Wert = base64url-JSON `{ sub, rolle, bis }`). **Step 4:** PASS.
- [ ] **Step 5:** Commit `Kern: signierte Sitzungen`.

### Task 6: Single Sign-on (Vertrag §5, INTEGRATION §3/§5)

**Files:**
- Create: `src/kern/sso.js`, `src/routes/sso.js`, `public/sso-fehler.html` (statische Seite, Text per Query-Code über
  externes Skript `public/static/js/sso-fehler.js`)
- Test: `test/sso.test.js`

**Interfaces:**
- Consumes: Task 3 `upsertAusToken`, Task 4 `pruefe`/`JtiSpeicher`, Task 5 Sitzung.
- Produces: `pruefeZiel(ziel) → string` (nur relative Pfade, sonst `/`); `pruefeSsoNutzlast(n) → string | null`
  (Fehlergrund oder null); Routen `GET /sso/start`, `GET /sso/ende`, `GET /abmelden` (nur Plattform-Sitzung, 302 `/`),
  `GET /abmelden/ueberall` (302 `PORTAL_URL/sso/abmelden?ruecksprung=<PLATTFORM_URL>/`), `GET /api/ich`
  (`{ sub, rolle, name, kurse: [{ id, name, rolle }], portalUrl }` oder 401).

- [ ] **Step 1: Failing tests** (jeweils eigener Testname, Erwartungen aus INTEGRATION §5):
  - `start setzt state-Cookie und leitet zum Portal` → 302, Location beginnt mit
    `https://labs.example/sso/autorisieren?plattform=datendetektei&ruecksprung=https%3A%2F%2Fdatendetektei.example%2Fsso%2Fende&state=`,
    state 22 Zeichen base64url, `ziel` übernommen.
  - `gültiges Token mit richtigem state` → 302 auf `ziel`, `dd_s` gesetzt, Konto `s:1042` in DB, Kurs `k:17` angelegt.
  - `falsche Signatur`, `falsches aud`, `falsches iss`, `abgelaufen`, `exp − iat > 120`, `wiederverwendetes jti`,
    `state fehlt`, `state ungleich Cookie` → je 401, keine Sitzung.
  - `sub passt nicht zur rolle` und `Kurs-ID ohne k:-Format` → 401 (Review Focus 2).
  - `fehler=keine_berechtigung` und `fehler=abgebrochen` → verständliche HTML-Seite, keine Sitzung (abgebrochen mit
    Link zur Startseite/Gastmodus).
  - `ziel=//boese.example`, `ziel=/\boese`, `ziel=https://boese.example` → Weiterleitung auf `/` (Review Focus 1).
  - `/sso/ende antwortet mit Referrer-Policy no-referrer und Cache-Control no-store`.
  - `state-Cookie wird in /sso/ende immer gelöscht`.
  - `paralleler zweiter Login scheitert mit HTML-Seite und Link „Erneut anmelden“` (Review Focus 4).
  - `abmelden/ueberall leitet zum Portal mit ruecksprung`.
- [ ] **Step 2:** FAIL. **Step 3:** Implementieren nach Spec §7.13; Fehlerantworten als HTML-Seite mit Status 401,
  Fehlergrund nur intern (nie Token-Inhalt ausgeben). Zugriffsprotokoll (falls vorhanden) ohne Query-String.
- [ ] **Step 4:** PASS. **Step 5:** Commit `Kern: Single Sign-on nach Vertrag §5`.

### Task 7: Verbund-API und Rate-Limits (Vertrag §6)

**Files:**
- Create: `src/kern/verbund.js`, `src/routes/verbund.js`; Modify: `src/kern/sicherheit.js`
- Test: `test/verbund.test.js`

**Interfaces:**
- Consumes: Task 3 `loescheKonto/loescheKurs/aendereKurs/kursUebersicht`, Task 4 Token-Helfer.
- Produces: `verbundAuth(konfig, jtiSpeicher, zweck) → middleware` (Bearer, `maxDauerSek: 60`, `sub === 'portal'`,
  `zweck` exakt, jti einmalig; jeder Fehler → 401 `{ "error": "Token ungültig." }` ohne Details);
  `rateLimit({ fensterMs, max, schluessel: req => string }) → middleware` (RAM, 429 mit `Retry-After`);
  Routen `POST /api/verbund/loeschen`, `GET /api/verbund/kurse/:kursId/uebersicht`, `POST /api/verbund/kurse/:kursId`.
  Rate-Limits: `/sso/*` 30/min je IP, `/api/verbund/*` 120/min gesamt.

- [ ] **Step 1: Failing tests:**
  - `ohne Token`, `falsches aud`, `falscher zweck`, `exp − iat > 60`, `wiederverwendet`, `sub nicht portal` → je 401.
  - `loeschen sub zweimal` → 200 `{ geloescht: n>0 }`, dann 200 `{ geloescht: 0 }`.
  - `loeschen kurs entfernt Kurs und Mitgliedschaften`.
  - `loeschen ohne sub und kurs` und `mit beiden` → 400 (Review Focus 5).
  - `uebersicht unbekannter Kurs` → 404; bekannter Kurs → Format §6, enthält keine Namen.
  - `kurs-aendern unbekannter Kurs legt an` → 200 `{ ok: true }`; `aktiv false` sperrt.
  - `kursId URL-kodiert k%3A17 wird erkannt`.
  - `Rate-Limit greift` (konfigurierbares `max` im Test, z. B. 3) → 429.
- [ ] **Step 2:** FAIL. **Step 3:** Implementieren. **Step 4:** PASS.
- [ ] **Step 5:** Commit `Kern: Verbund-API nach Vertrag §6, Rate-Limits`.

### Task 8: Manifest (Vertrag §7)

**Files:**
- Create: `src/kern/manifest.js`; Modify: `src/app.js`
- Test: `test/manifest.test.js`

**Interfaces:**
- Produces: `baueManifest(konfig, umfang = { welten: 7, level: 13, aufgaben: 0, bosse: 7 }) → object` exakt nach Spec
  §7.13 (Titel, Beschreibung, Farbe `#B3261E`, `urls.lehrkraft: '/lehrkraft'`, `faehigkeiten: ['gast', 'themen',
  'lehrkraft-materialien', 'sql-konsole', 'live']`, `welten` = `AKTEN` aus `src/domain.js`); Route `GET /api/plattform`
  mit `Access-Control-Allow-Origin: *` und `Cache-Control: public, max-age=300`.

- [ ] **Step 1: Failing tests:** `pruefeManifest liefert keine Fehler` (aus `scripts/vertrag_pruefen.js`), `CORS *`,
  `version gleich healthz`, `basis = PLATTFORM_URL`, `auth.modus portal, sso true, ssoStart /sso/start`,
  `Manifest enthält keine Konten- oder Kursdaten` (nach SSO-Login eines Testschülers: JSON enthält weder `s:1042` noch
  `k:17`).
- [ ] **Step 2:** FAIL. **Step 3:** Implementieren. **Step 4:** PASS.
- [ ] **Step 5:** Commit `Kern: Manifest nach Vertrag §7`.

### Task 9: Seitenhülle und Design-Grundlagen

**Files:**
- Create: `public/index.html`, `public/lehrkraft.html`, `public/gast.html`, `public/themen.html`,
  `public/datenschutz.html`, `public/static/css/tokens.css` (alle Tokens aus `docs/DESIGN.md` §2–3 inkl.
  `--siegelrot-text`, `--messing-text`, `--messing-grafik`, hell/dunkel über `prefers-color-scheme` und
  `[data-theme]`), `public/static/css/basis.css`, `public/static/fonts/*.woff2` + `fonts.css` + `OFL.txt`,
  `public/static/js/kern/kopfzeile.js`, `public/static/favicon.svg`, `scripts/fonts_kopieren.js`,
  `scripts/kontrast_pruefen.js`; Modify: `src/app.js`
- Test: `test/seiten.test.js`, `test/kontrast.test.js`

**Interfaces:**
- Consumes: `/api/ich` (Task 6), `nurAngemeldet` (Task 5).
- Produces: Kopfzeile (Logo „Datendetektei“, Anzeigename, „⌂ Portal“-Link auf `portalUrl`, Abmelden), Startseite mit
  „Anmelden über InfoLabs“ (`/sso/start`) und Link zum Gastmodus; `/lehrkraft` nur für Rolle lehrkraft/superadmin
  (sonst 302 `/sso/start?ziel=/lehrkraft` bzw. 403-Seite für Schüler); `/gast` und `/themen` öffentlich mit
  Platzhalterinhalt „Probefall Eisdiele folgt“ bzw. Aktenliste aus `AKTEN`; `/datenschutz` mit Verweis auf
  `<PORTAL_URL>/datenschutz` und Platzhaltern `[Angaben der Schule]`.
  `kontrastVerhaeltnis(hexA, hexB) → number`; `scripts/kontrast_pruefen.js` liest die Paarungsliste aus `docs/DESIGN.md`
  (Tabelle „Kontrastprüfung“) bzw. `scripts/kontrast_paare.json` und meldet jede Paarung < 4.5 (Text) / < 3 (Grafik).

- [ ] **Step 1: Failing tests:**
  - `Startseite, Gast, Themen, Datenschutz liefern 200 text/html`.
  - `/lehrkraft ohne Sitzung leitet auf /sso/start?ziel=%2Flehrkraft` (302, **nicht** 401 – vertrag_pruefen).
  - `/lehrkraft als Schüler liefert 403-Seite`.
  - `HTML-Seiten enthalten kein Inline-Skript und kein style-Attribut` (Regex über alle `public/*.html`).
  - `Fonts werden lokal ausgeliefert` (`/static/fonts/barlow-latin-400-normal.woff2` 200, `font/woff2`).
  - `kontrastVerhaeltnis('#1C2B3A', '#F4EDE1') > 4.5` und `alle Token-Paarungen erfüllen AA`.
- [ ] **Step 2:** FAIL. **Step 3:** Implementieren nach `docs/DESIGN.md` (Kopfzeile, Akten-Look der Startseite;
  Prototyp `docs/prototyp/` als Vorlage, aber ohne Inline-Code). Fonts per `scripts/fonts_kopieren.js` aus den
  @fontsource-Paketen (latin, 400/600/700, Plex Mono 400/600) kopieren und committen.
- [ ] **Step 4:** PASS; Sichtprüfung per Playwright-Screenshot (1440, 1024, 375; hell/dunkel) im Scratchpad ansehen.
- [ ] **Step 5:** Commit `Oberfläche: Seitenhülle, Design-Tokens, Fonts, Kontrastprüfung`.

### Task 10: Docker, CapRover, CI und Deploy nach grüner Prüfung

**Files:**
- Create: `Dockerfile`, `.dockerignore`, `captain-definition`, `.github/workflows/pruefung.yml`,
  `.github/workflows/deploy.yml`, `.env.example`
- Test: CI selbst + lokaler Durchlauf

**Interfaces:**
- Dockerfile: zweistufig `node:22-bookworm-slim` (Build-Stage mit `python3 make g++` für better-sqlite3, `npm ci
  --omit=dev`), Laufzeit als User `node`, `setcap` für Port 80 oder `PORT=80` mit `cap_net_bind_service`, `TZ=Europe/Berlin`,
  `HEALTHCHECK` auf `/healthz`, `VOLUME /app/data`; ins Image nur `src/`, `public/`, `seed/`, `scripts/`, `package*.json`.
- `pruefung.yml` (jeder Push/PR): `npm ci` → `npm test` → App im Hintergrund starten (Test-Konfiguration mit
  generiertem Schlüssel) → `node scripts/vertrag_pruefen.js http://localhost:3000` → `node scripts/kontrast_pruefen.js`
  → `docker build`.
- `deploy.yml`: `on: workflow_run` (Workflow „Prüfung“, `branches: [main]`, `types: [completed]`), nur wenn
  `conclusion == 'success'`; `npx caprover deploy --caproverUrl ${{ secrets.CAPROVER_URL }} --appToken
  ${{ secrets.CAPROVER_APP_TOKEN }} --appName datendetektei --branch main`.

- [ ] **Step 1:** Lokal: `docker build -t datendetektei .` → Erfolg; Container mit Testumgebung starten,
  `curl -s localhost:8080/healthz` → `{"status":"ok","version":"0.1.0"}`; `npm run vertrag` gegen den Container → keine
  Fehler.
- [ ] **Step 2:** Workflows anlegen; Push auf Feature-Branch → „Prüfung“ grün (Link im PR).
- [ ] **Step 3:** README-Abschnitt „Betrieb“ um Secrets `CAPROVER_URL`, `CAPROVER_APP_TOKEN` ergänzen; CapRover-App
  **ohne** GitHub-Webhook (Deploy nur über die Action).
- [ ] **Step 4:** Commit `Betrieb: Docker, CI und Deploy nach grüner Prüfung`.

### Task 11: Abnahme Phase 1 (mit Frank)

**Files:** Modify `README.md`, `CLAUDE.md` (Befehle), `docs/superpowers/specs/…` §18 (Änderungsprotokoll)

- [ ] **Step 1:** PR `phase1` → Frank gibt frei → Merge nach `main` → Deploy-Action läuft → `https://datendetektei.frankjuchim.de/healthz` ok.
- [ ] **Step 2:** `node scripts/vertrag_pruefen.js https://datendetektei.frankjuchim.de` → keine Fehler.
- [ ] **Step 3 (Frank im Portal):** Plattform unter „Plattformen“ eintragen, Rücksprung
  `https://datendetektei.frankjuchim.de/sso/ende` bestätigen, Testkurs anlegen und Plattform freischalten.
- [ ] **Step 4:** Login als Testschüler und Testlehrkraft über das Portal → Kopfzeile zeigt Namen; `/lehrkraft` nur
  für Lehrkraft; „Überall abmelden“ funktioniert; Kursübersicht im Portal erscheint (Werte 0).
- [ ] **Step 5:** Protokoll der Abnahme in den PR; Spec §18 ergänzen; Commit `Phase 1 abgenommen`.
