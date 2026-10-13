# Sicherheits-Prüfung Phase 8 (Datendetektei 0.7.0 → 0.8.0)

Stand 2026-10-13, Branch `p8/4`. Adversariales Review aller Routen (`src/app.js`, `src/routes/*`) aus Sicht
neugieriger Schüler:innen mit eigenem Konto und anonymer Internet-Nutzer. Grundlage: Vertrag 1.2 §5/§6/§9/§10,
Spec §7.4/§7.13/§7.14, CLAUDE.md „Datenschutz und Sicherheit“.

**Rollen** in den Tabellen: A = anonym, S = Schüler:in des Kurses, Sf = Schüler:in eines anderen Kurses,
L = Lehrkraft des Kurses, Lf = Lehrkraft eines anderen Kurses, SA = Superadmin, G = gesperrter Kurs.
Belege: die genannten Tests (`npm test`, 1 861 Tests grün) und eine Rollen-Matrix über alle Routen (supertest,
Ergebnis unten, Abschnitt 3).

## 1. Befunde und Behebungen

| Nr | Schwere | Ort | Befund | Behoben / Test |
|---|---|---|---|---|
| B1 | hoch | `src/sql/sandbox.js`, `sandbox-prozess.js` | Speichergrenze der Sandbox wirkungslos: `PRAGMA hard_heap_limit` greift in better-sqlite3 nicht (kompiliert mit `SQLITE_DEFAULT_MEMSTATUS=0`). Große Zwischenwerte mit kleinem Ergebnis belegten ~350 MB je Kindprozess – auch anonym über die Eisdiele-Konsole erreichbar. | ja: Speicherwächter im Elternprozess (VmRSS des Kindprozesses alle 20 ms, > 128 MB Zuwachs → SIGKILL, Ersatzprozess, `ergebnis_zu_gross`). `test/sandbox.test.js` „Speicher (Phase 8)“ (Lese- und Schreibmodus) |
| B2 | mittel | `src/sql/pruefer.js` | Lastverstärkung: Die Schülerabfrage lief immer auf Haupt-DB **und** allen Varianten, auch wenn sie auf der Haupt-DB schon falsch, fehlerhaft oder im Zeitlimit war (bis zu 1 + n × 1,5 s Sandbox-Zeit je Prüfung). | ja: Varianten nur nach Treffer auf der Haupt-DB (Ergebnis identisch). `test/pruefer.test.js` „Sicherheits-Review Phase 8“ |
| B3 | mittel | `src/sql/parser.js` | Tief verschachtelte Klammern (≈ 2 000) → `RangeError` (Stapelüberlauf) → HTTP 500, auch anonym über `/api/gast/…/pruefen`. | ja: Klammertiefe > 40 → Parsefehler `ZU_TIEF` mit deutschem Text, `RangeError` als Rückfall. `test/parser.test.js` „Sicherheits-Review Phase 8“ |
| B4 | mittel | `src/services/live.js` | Escape Room: Die Bremse „5 falsche Codes je Minute“ galt nur je Team; durch Wechsel in andere (leere) Teams ließ sie sich vervielfachen. Die Codes sind 2–5 Ziffern lang. | ja: zusätzlich je Konto (nur RAM, mit Rundenende/Verbund-Löschung verworfen). `test/live.test.js` „Sicherheits-Review Phase 8“ |
| B5 | niedrig | `src/sql/sandbox.js` (`vorpruefen`) | Die Wortprüfung las `"…"`-, `` `…` ``- und `[…]`-Bezeichner nicht als Ganzes; ein Hochkomma darin konnte ein verbotenes Wort verdecken. Keine Ausnutzung möglich (Kindprozess: `query_only`, nur lesende Abfragen, `load_extension` nicht autorisiert, keine Dateien), aber die Schutzschicht war lückenhaft. | ja: Bezeichner werden wie in `src/sql/skript.js` übersprungen. `test/sandbox.test.js` „Vorprüfung (Phase 8)“ |
| B6 | niedrig | `src/routes/lehrkraft_auswertung.js` | Das Limit von `/api/admin/sicherung` (6/min) lag vor der Anmeldeprüfung und galt für alle Absender gemeinsam: anonyme Anfragen konnten den Superadmin aussperren. | ja: Limit nach `nurAngemeldet(['superadmin'])`, je Konto. `test/auswertung.test.js` „Sicherheits-Review Phase 8“ |
| B7 | niedrig | `src/kern/konfig.js` | Der öffentliche Entwicklungsschlüssel (`test/fixtures/dev_portal_public.pem`) und das Entwicklungsgeheimnis aus `scripts/dev.js` wurden auch im Betrieb akzeptiert (Fehlkonfiguration → fälschbare Tokens/Sitzungen). | ja: mit `NODE_ENV=production` Startabbruch mit Meldung. `test/konfig.test.js` „Sicherheits-Review Phase 8“ |
| B8 | niedrig (Datenschutz) | `src/kern/sicherheit.js` (`rateLimit`) | Abgelaufene Zähler (Schlüssel = IP bzw. `sub`) wurden erst ab 10 000 Einträgen entfernt – IPs blieben so bis zum Neustart im RAM statt nur für das Zeitfenster (Datenschutzseite: eine Minute). | ja: Bereinigung höchstens einmal je Fenster beim Zugriff und per Timer (`unref`). `test/sicherheit.test.js` „Sicherheits-Review Phase 8“ |

## 2. Offene Punkte (Entscheidung Frank, nicht gebaut)

| Nr | Schwere | Ort | Punkt | Vorschlag |
|---|---|---|---|---|
| F1 | hoch (Betrieb) | `src/app.js` (`/sso`, 30/min je IP; Plan Phase 1) | Eine Klasse hinter einer Schul-NAT teilt eine IP: Anmeldung = mindestens 2 Anfragen → ab ~15 Schüler:innen pro Minute 429 beim Login im Probelauf. Gleiches gilt anonym für Gastmodus (30 Prüfungen/min je IP) und die Eisdiele-Konsole. | **Behoben (Phase 8):** `/sso` 300/min je IP, Gast-Prüfen 120/min und übrige Gast-Anfragen 600/min je IP (`verbund.test.js`, `gast.test.js`). Offen bleibt `POST /api/sql/ausfuehren` ohne Anmeldung (30/min je IP; greift nur, wenn WebAssembly gesperrt ist, und nur für die Eisdiele). |
| F2 | mittel | `src/app.js` (`/api/verbund`, 120/min gesamt; Plan Phase 1) | Das Limit gilt für alle Absender gemeinsam und vor der Token-Prüfung; Verbund-Aufrufe des Portals können dadurch verzögert werden (das Portal wiederholt Löschaufträge). | **Behoben (Phase 8):** Limit je IP, 120/min (`verbund.test.js`). |
| F3 | mittel | `src/sql/sandbox.js` (2 Kindprozesse) | Kapazität: Wenige Konten mit absichtlich langsamen Abfragen (je 30/min) können die zwei Sandbox-Prozesse auslasten; andere bekommen dann „überlastet“ (503). Begrenzt durch Warteschlange (50), Zeitlimit und B2. | Prozessanzahl per Umgebung einstellbar machen und/oder höchstens einen laufenden Sandbox-Auftrag je Konto. |
| F4 | niedrig | `seed/live/escape.json` | Escape-Codes mit 2 Ziffern (S3, S5, S5g) sind trotz Bremse in ≈ 20 min je Team erratbar. | Inhaltsentscheidung: mindestens 3 Ziffern. |
| F5 | niedrig | Vertrag §5 | Kursänderungen im Portal (Schüler:in wechselt den Kurs) wirken erst bei der nächsten Anmeldung (Schüler-Sitzung 30 Tage). Löschungen wirken sofort (Konto weg → Sitzung ungültig). | Vertragsgemäß; ggf. kürzere Schüler-Sitzung. |

## 3. Rollen-Matrix (HTTP-Status, Beispielakte, Kurs k:17)

| Route | A | S | Sf | L | Lf | SA |
|---|---|---|---|---|---|---|
| GET /api/ich | 401 | 200 | 200 | 200 | 200 | 200 |
| GET /api/kurse/k:17/stand, /ermittlungen/:id, /aufgaben/:id | 401 | 200 | 403 | 200 | 403 | 200 |
| POST /api/kurse/k:17/aufgaben/:id/pruefen, /tipp | 401 | 200 | 403 | 200 | 403 | 200 |
| GET /api/kurse/k:17/aufgaben/&lt;Verhör-Aufgabe&gt; | 401 | 404 | 403 | 404 | 403 | 404 |
| GET /api/kurse/k:17/verhoere/:akte, /warmup, /training, /pinnwand, /live | 401 | 200 | 403 | 200 | 403 | 200 |
| GET /api/kurse/k:17/live/inhalte | 401 | 403 | 403 | 200 | 403 | 200 |
| POST /api/kurse/k:17/live (Runde starten) | 401 | 403 | 403 | 200/409 | 403 | 200/409 |
| GET /api/live/:runde · POST …/steuerung | 401 · 401 | 200 · 403 | 403 · 403 | 200 · 200 | 403 · 403 | 200 · 200 |
| GET /api/lehrkraft/kurse | 401 | 403 | 403 | 200 | 200 (nur eigene) | 200 (alle) |
| GET …/auswertung, …/auswertung.csv, …/vorschau, …/vorschau/aufgaben/:id | 401 | 403 | 403 | 200 | 403 | 200 |
| PUT …/einstellungen · POST …/board-schluessel | 401 | 403 | 403 | 200 | 403 | 200 |
| GET /api/admin/seed-bericht · POST inhalte-neu-laden · GET sicherung | 401 | 403 | 403 | 403 | 403 | 200 |
| GET /lehrkraft, /lehrkraft/live, /live/:runde/beamer (Seiten ohne Daten) | 302 | 403 | 403 | 200 | 200 | 200 |

Gesperrter Kurs (G): Schüler:innen 403 auf alle Kurs-APIs, Lehrkraft/Superadmin nur lesend (`test/rechte.test.js`
„gesperrter Kurs“, `test/lehrkraft.test.js`, `test/live.test.js`). Fremder und unbekannter Kurs antworten gleich (403).

## 4. Prüfung je Route

| Route | Rollen geprüft | Lösungsdaten | Grenzen | Ergebnis / Test |
|---|---|---|---|---|
| `GET /healthz`, `GET /api/plattform` | A | keine | – | ok, nur Version/Manifest (`manifest.test.js`) |
| `GET /sso/start` | A | – | 300/min je IP (F1) | ok: `state` 128 Bit, Cookie HttpOnly/Secure/SameSite=Lax, `ziel` nur relativ, auch mehrfach dekodiert (`sso.test.js`) |
| `GET /sso/ende` | A | – | 300/min je IP | ok: `pruefe()` mit `iss`, `aud`, `maxDauerSek` 120; `jti` einmalig (auch bei Inhaltsfehler verbraucht); `state` zuerst; Fehlerseite ohne Grund; `Referrer-Policy: no-referrer`, `Cache-Control: no-store`; kein Request-Logging im Server (Token/Query nie im Log) (`sso.test.js`) |
| `GET /abmelden`, `/abmelden/ueberall` | alle | – | – | ok (GET-Abmelden ist harmlos; Rücksprung fest) |
| `GET /api/ich` | A, S, L, SA | – | – | ok, `no-store` |
| `POST /api/verbund/loeschen`, `GET …/kurse/:id/uebersicht`, `POST …/kurse/:id` | A (ohne/mit falschem Token), Portal | nur Kennzahlen, keine Namen | 120/min je IP (F2), JSON 10 kB erst nach Token | ok: `pruefe()` mit `iss`/`aud`/60 s, `sub: portal`, `zweck` exakt, eigener `jti`-Speicher; Löschung inkl. RAM (Live) (`verbund*.test.js`, `verbund_loeschen_alles.test.js`) |
| Seiten `/`, `/gast`, `/themen`, `/datenschutz`, Werkzeugseiten | A | keine (statische Seiten) | – | ok: CSP exakt wie CLAUDE.md, `X-Robots-Tag: noindex`, kein Inline-Skript (`seiten.test.js`, `app.test.js`) |
| Schülerseiten `/akte`, `/ermittlung`, `/verhoer`, `/warmup`, `/training`, `/pinnwand`, `/konsole/:db`, `/werkzeug/*` | A, S, L | keine (Daten nur per API) | Parameter-Muster | ok: ungültige Parameter 404, sonst Anmeldung (Eisdiele anonym) |
| `GET /api/kurse/:kurs/stand`, `/ermittlungen/:id` | alle | Intro ohne `dbtabelle.quelle` | – | ok (`rechte.test.js`, `lernen.test.js`) |
| `GET /api/kurse/:kurs/aufgaben/:id` | alle, G | Lösung/Erklärung/Kernpunkte erst nach Lösen/Aufdecken; nur abgerufene Tipps; Verhör-Aufgaben 404 | – | ok; zusätzlich Scan aller 272 echten Aufgaben (öffentliche Sicht vs. Lösungs-, Erklärungs-, Tipp-, Kernpunkttexte): kein Treffer (`rechte.test.js`, `inhalte.test.js`) |
| `POST …/pruefen` | alle, G | Diagnosen ohne Musterwerte (Spec §7.4: Zeilenzahl nur des Schülerergebnisses, „zu viele/zu wenige“, Variantentyp allgemein) | 30/min SQL, 120/min gesamt je Konto; Body 100 kB; SQL ≤ 4 000 Zeichen | ok + B1/B2/B3 (`pruefer.test.js`, `pruefer_interaktionen.test.js`) |
| `POST …/tipp`, `…/loesung-zeigen`, `…/kernpunkte` | alle, G | Tipp einzeln, Lösung nur auf Wunsch (0 Punkte) | 120/min | ok (`lernen.test.js`) |
| `POST …/aufgaben/:id/skript` (Kür K1) | alle, gA | Start/Prüfpunkte bleiben auf dem Server | 30/min, Skript ≤ 10 000, ≤ 200 Anweisungen, ≤ 20 Tabellen, ≤ 500 Zeilen, ≤ 1 MB; verbotene Wörter | ok + B1 (`kuer*.test.js`) |
| `/api/kurse/:kurs/verhoere/:akte` (+ `/start`, `/versuch`, `/antwort`, `/abgeben`) | alle | Aufgaben nur im laufenden Versuch, ohne Tipps; Antwort nur `{ gespeichert }`; Ergebnis nur richtig/falsch je Aufgabe | 30/120 je Konto; Frist serverseitig | ok (`verhoer.test.js`) |
| `/api/kurse/:kurs/warmup/…` | alle | Karte erst auf `aufdecken` (Selbstkontrolle, gewollt) | 120/min | ok (`warmup.test.js`) |
| `/api/kurse/:kurs/training/…` | alle | Lösung nach Prüfen bzw. auf Wunsch (ohne Punkte), Aufgabe HMAC-signiert | 120/min | ok (`training*.test.js`) |
| `GET /api/kurse/:kurs/pinnwand` | alle | Indizien erst nach dem Lösen, Auflösung nach dem letzten Schritt, Steckbrief nach E10 | – | ok (`fallebene.test.js`) |
| Live: `/api/kurse/:kurs/live`, `/inhalte`, `/api/live/:runde/*`, SSE `…/ereignisse` | alle | Duell-Lösung nur in der Steuerungssicht der Lehrkraft; Codes nur fürs lösende Team; Beamer ohne Codes/Lösungen; Ergebnis erst nach dem Schließen | Body ≤ 20 000 Zeichen; 30/120 je Konto; 30 Runden, 80 Teilnehmer, 250 SSE je Runde, 3 SSE je Konto; Codes 5/min je Team **und Konto** (B4); 4 h Höchstdauer | ok + B4 (`live.test.js`) |
| `GET /api/lehrkraft/kurse`, `PUT …/einstellungen`, `POST …/board-schluessel` | alle, G | keine | Felder streng geprüft | ok (`lehrkraft.test.js`) |
| `…/auswertung`, `…/auswertung.csv` | alle | – | – | ok: CSV ohne `sub`, Formel-Schutz (`=+-@`) (`auswertung.test.js`) |
| `…/vorschau`, `…/vorschau/aufgaben/:id` | alle | Lösungen nur für L/SA | ID-Muster | ok (`rechte.test.js` Matrix Phase 6) |
| `GET /api/board/:schluessel`, `GET /board/:schluessel` | A | nur Anzeigenamen/Punkte, keine `sub` | 60/min je IP; Schlüssel 192 Bit | ok: gleiche 404 für falsch/aus/gesperrt; `Referrer-Policy: no-referrer` |
| `GET /lehrkraft/urkunden?kurs=` | alle | – | – | ok (`lehrkraft_seiten.test.js`) |
| `/api/admin/seed-bericht`, `inhalte-neu-laden`, `sicherung` | alle | – | Sicherung 6/min je Konto | ok + B6 |
| Gast: `/api/gast/probefall`, `…/pruefen`, `…/tipp`, `…/loesung`, `/api/gast/lehrkraft`, `/api/gast/material` | A | Probefall ohne Lösungen; Tipp/Lösung nur auf ausdrücklichen Wunsch (gewollt, nichts gespeichert) | 120/600 je IP (F1) | ok + B3 (`gast.test.js`) |
| `GET /api/themen`, `GET /api/akten` | A | keine | – | ok (`themen.test.js`) |
| `GET /api/material`, `/material/:stufe/*`, `/material/original-zip/:akte`, `/gast/material/*` | A, S, L, SA | Lösungen nur L/SA, Originale nur SA, Gast nur Whitelist | Segment-Muster, `dotfiles: deny`, Wurzel per `realpath`, ZIP ≤ 200 MB | ok: Traversal (`..`, `%2F`, `%2e`, `%5C`, `%00`, versteckte Dateien, `verzeichnis.json`) → 404, gleiche Antwort für „verboten“ und „fehlt“; Schlüssel nur aus der Whitelist, beim Ausliefern Wurzel per `realpath` (`material.test.js`, `sendfile.test.js`) |
| `GET /db/:datei`, `/api/db/:name/schema` | A | Haupt-DB öffentlicher Übungs-DBs (Spec §7.2); Varianten und Verhör-DBs nie | Muster `[a-z]+` | ok (`datenbanken.test.js`) |
| `POST /api/sql/ausfuehren` | A (nur Eisdiele), S | nur Haupt-DB, nie Variante | 30/min je Konto bzw. IP, ≤ 4 000 Zeichen | ok + B1/B5 (`sql_ausfuehren.test.js`) |
| `/static/*`, `/static/js/sql/:datei` | A | keine Lösungen in Skripten | Whitelist | ok: nur `public/static` und die feste Whitelist der SQL-Module (`seiten.test.js`, `parser.test.js`) |

## 5. Querschnitt

- **Sandbox** (Lesen und Schreiben): eigener Kindprozess ohne Umgebungsvariablen außer `NODE_ENV`, In-Memory-Kopie je
  Abfrage, `query_only`, nur `reader`-Anweisungen, `trusted_schema = OFF` (Schreibmodus), `load_extension` ist in
  better-sqlite3 nicht autorisiert, ATTACH/PRAGMA/VACUUM/Punkt-Befehle schon im Elternprozess abgewiesen, Zeitlimit
  1,5 s mit SIGKILL, Ergebnis ≤ 5 000 Zeilen und ≤ 4 MB, Speicher ≤ 128 MB Zuwachs (B1), Warteschlange ≤ 50.
- **CSRF**: alle Nicht-GET außerhalb der Verbund-API brauchen eigene Origin/Referer und JSON (`sicherheit.test.js`);
  Cookies `SameSite=Lax`. GET-Routen ändern keinen Lernstand.
- **Prototype-Pollution**: Bodies nur über `JSON.parse` (`__proto__` wird eigene Eigenschaft); Schlüssel aus Bodies
  werden nur nach Whitelist übernommen (Einstellungen, ER-Zuordnung gegen Diagramm-IDs).
- **ReDoS**: Parser, Regeln, Vorprüfung, Skript-Zerlegung und `normalisiereSql` mit 4 000 bzw. 10 000 Zeichen
  bösartiger Eingaben (Klammern, offene Texte/Kommentare, lange `AND`/`IN`/`CASE`-Ketten) ≤ 60 ms; einzige Schwäche war
  die Rekursionstiefe (B3).
- **XSS**: kein `innerHTML`/`insertAdjacentHTML`/`eval` in `public/` (`seiten.test.js`); Links nur aus Server-Inhalten,
  Videos nur YouTube; CSP ohne `unsafe-inline`.
- **Header**: CSP exakt laut CLAUDE.md, `X-Robots-Tag: noindex`, helmet (HSTS, nosniff, frame-ancestors none);
  personenbezogene APIs `Cache-Control: no-store` bzw. `private, no-store`.
- **Logging**: kein Request-Log; nur Startmeldungen und `err.message` bei 500 (keine Tokens, keine Queries).
- **`npm audit --omit=dev`**: 0 Schwachstellen (auch mit dev-Abhängigkeiten 0).
- **Dockerfile**: Laufzeit als Benutzer `node`, `cap_net_bind_service` nur für Port 80; keine Geheimnisse im Image
  (`.dockerignore` ohne `test/`, `.env`, `data/`); Konfiguration nur über Umgebungsvariablen (B7).
- **Nicht-Befunde (bewusst so)**: Diagnosen „zu viele/zu wenige Zeilen“ und die Zeilenzahl des eigenen Ergebnisses
  (Spec §7.4); Warm-up-Karten und Trainingsplatz zeigen Lösungen auf Wunsch (Selbstkontrolle, ohne Punkte); Gast-Tipps
  und -Lösung auf Wunsch; öffentliche Haupt-DBs `/db/*.sqlite` (Spec §7.2); Schülerfassungen für jede angemeldete
  Schüler:in (Niveau-Filter nur in der Liste, Spec §18 Phase 6); Board zeigt den Kursnamen (Spec §18, Frage 11a);
  Beamer-/Steuerungsseiten sind für jede Lehrkraft abrufbar, enthalten aber keine Daten (API 403).
