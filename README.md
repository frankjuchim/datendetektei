# Datendetektei Weserstedt – Ermitteln mit Datenbanken

Unterrichtseinheit **Datenbanken** für den Informatikunterricht der Oberstufe in Niedersachsen (Leistungskurs eA,
Grundkurs-Pfad gA, Abitur ab 2027) mit eigener Lernplattform im Verbund **InfoLabs**.

Der Kurs arbeitet als Ermittlerteam der *Datendetektei Weserstedt*: Mit SQL werden Fälle aufgeklärt, ein chaotisches
Vereinsarchiv zeigt, warum Datenbanken gut modelliert sein müssen, die Detektei entwirft ihre eigene Fall-Datenbank –
und am Ende führt das Verknüpfen von Daten zum „Phantom“ und zur Frage, was Datenschutz eigentlich schützt.

> **Status:** Phasen 1–6 umgesetzt (Kern, SQL-Engine, Lernkern mit Akten 1–3, Visualisierungen, Akten 4–5 mit
> Modellierung, Akten 6–7 mit Schlussplädoyer und Pinnwand, Kür K1, Live-Modus, Lehrkraft-Bereich mit Beamer-Board und
> Urkunden; Version 0.6.0). Weitere Phasen nach `docs/superpowers/plans/`.

## Überblick

| | |
|---|---|
| Umfang | 15 Doppelstunden: 13 Kern-DS in 7 Akten + 2 Kür-DS; Klausur separat |
| Plattform | `https://datendetektei.frankjuchim.de` · `PLATTFORM_ID=datendetektei` · Login nur über das Portal (`AUTH_MODUS=portal`) |
| Highlights | Ermittlungskonsole mit Live-SQL (sql.js), serverseitige Prüfung gegen versteckte Randfall-Datenbanken, EH-§8-Parser mit Abimodus, Zeitlupe der Auswertungsreihenfolge, Spurenbrett, Sortierfächer, ER-Editor in Chen-Notation, Schema-Werkbank, Anomalie-Simulator, Live-Modus/Escape Room |
| Material | Präsentationen, Arbeitsblätter („Ermittlungsakten“) + Lösungen, Unplugged-Sets, Ermittler-Handbuch, Warm-up-Karten, Generalprobe, Klausur + Nachschreibklausur mit Erwartungshorizonten, Lehrerhinweise, Videoskripte |

## Dokumentation

- Spezifikation: [`docs/superpowers/specs/2026-10-12-datendetektei-design.md`](docs/superpowers/specs/2026-10-12-datendetektei-design.md)
- Roadmap und Pläne: [`docs/superpowers/plans/`](docs/superpowers/plans/)
- Feinplanung und Aufgaben-Blueprints: [`docs/DS_PLANUNG.md`](docs/DS_PLANUNG.md) · Kompetenzmatrix: [`docs/KOMPETENZMATRIX.md`](docs/KOMPETENZMATRIX.md)
- Story-Bibel: [`docs/STORY.md`](docs/STORY.md) · Design-System: [`docs/DESIGN.md`](docs/DESIGN.md) · Prototyp: [`docs/prototyp/`](docs/prototyp/)
- Datenbanken: [`seed/datenbanken/`](seed/datenbanken/)
- Arbeitsregeln für Claude Code: [`CLAUDE.md`](CLAUDE.md)

## Verbund InfoLabs

Verbindlich ist der Vertrag [`frankjuchim/labs/VERTRAG.md`](https://github.com/frankjuchim/labs/blob/main/VERTRAG.md)
(Version 1.2) mit der Anschlussanleitung `docs/INTEGRATION.md`. Die Plattform baut kein eigenes Login: Single Sign-on
nach §5 (Ed25519-JWT), Manifest `GET /api/plattform` (§7), Verbund-API (§6).

**Begründete Abweichungen von SOLL-Regeln (Vertrag §9):**
- *Hausfarben:* Die Datendetektei nutzt ein eigenes Design-System („Akten-Noir light“, Plattformfarbe Siegelrot
  `#B3261E`), weil Setting und Werkzeuge (Akten, Pinnwand, Konsole) eine eigene, zusammenhängende Bildsprache brauchen.
  Kontraste sind nach WCAG AA geprüft; der Link „⌂ Portal“ steht in der Kopfzeile.
- *Empfehlung §13.2 (Kopie von Algo Quest):* eigene Codebasis mit gemeinsamem Kern in `src/kern/`
  (Vorschlag für Vertrag 1.3: [`docs/VERTRAG_VORSCHLAG_1.3.md`](docs/VERTRAG_VORSCHLAG_1.3.md)).
- *CSP:* zusätzlich `'wasm-unsafe-eval'` und `worker-src 'self'` für die SQL-Engine im Browser (sql.js). Das ist keine
  Inline-Ausnahme; ohne WASM greift ein asm.js-Fallback.

## Entwicklung

`npm install`, `npm test`, `npm run dev` (Port 3000, Daten in `./data`, ohne echtes Portal). `npm run dev` nutzt das
Schlüsselpaar `test/fixtures/dev_portal_{public,private}.pem` – **nur für Entwicklung und Tests**: Der private
Schlüssel liegt öffentlich im Repo und ist damit wertlos; im Betrieb nie verwenden.

## Datenbanken und SQL

Die sieben Übungsdatenbanken (und die nicht öffentlichen Verhör-Kontexte) entstehen deterministisch aus
`seed/datenbanken/<name>/` (`schema.sql`, `pflicht.sql`, Generator `scripts/db/<name>.js`): `npm run db` schreibt
`basis.sql`, `npm run db:pruefen` baut neu und vergleicht byteweise (CI). Randfall-Varianten liegen als Delta-Skripte
in `varianten/` und sind nie öffentlich. Öffentlich ist nur die Haupt-DB unter `/db/<name>.sqlite`.

Schüler-SQL läuft im Browser (sql.js im Web Worker, Abbruch nach 3 s) und zur Prüfung auf dem Server in einer
Sandbox aus Kindprozessen (nur lesend, 1,5 s, 5 000 Zeilen). Ist WebAssembly gesperrt, führt der Server auch
„Ausführen“ aus. Freie Ermittlung: `/konsole/<db>` (Eisdiele ohne Anmeldung).
Verstehens- und Modellierungswerkzeuge: `/werkzeug/zeitlupe`, `/werkzeug/spurenbrett`, `/werkzeug/sortierfaecher`
(angemeldet bzw. mit `?db=eisdiele`), `/werkzeug/bauplan` (Bauplan-Tisch, ER in Chen-Notation) und `/werkzeug/werkbank`
(Schema-Werkbank) ohne Anmeldung; geprüft wird nur in den Aufgaben, serverseitig (`src/er`, `src/content/modellierung.js`).

## Seiten für Schüler:innen und Lehrkräfte

| Seite | Inhalt |
|---|---|
| `/` | Stadtplan mit Akten, kleiner Pinnwand und Steckbrief; Kür als eigener Abschnitt |
| `/akte/<n>`, `/ermittlung/<id>` | Akte und Ermittlung (Lab-Aufgaben, Konsole, Schlussplädoyer in Akte 6) |
| `/verhoer/<n>`, `/warmup`, `/training` | Verhöre, Warm-up (Leitner), Trainingsplatz |
| `/pinnwand` | Beweisstücke der gewonnenen Verhöre, Indizienkette des Plädoyers, Steckbrief des Phantoms |
| `/live` | Live-Runde beitreten (Duell, Escape Room) |
| `/lehrkraft` | Lehrkraft-Bereich: Übersicht, Einstellungen, Auswertung (Matrix, Fallen-Profil, CSV), Vorschau mit Lösungen, Live, Board, Urkunden, Materialien; Superadmin zusätzlich System |
| `/lehrkraft/live`, `/live/<runde>/beamer` | Live-Steuerung und Beamer-Ansicht (nur Lehrkraft) |
| `/lehrkraft/urkunden` | Druckseite „Detektei-Lizenz“ (eine A4-Seite je Schüler:in) |
| `/board/<schlüssel>` | Beamer-Board ohne Anmeldung (Rangliste, Akten-Fortschritt, letzte Erfolge; nur Anzeigenamen) |

Die Kür K1 („Eigene Datenbank bauen“, nur eA, nicht im Abitur) nutzt eine **Schreib-Sandbox**: je Anfrage eine frische
In-Memory-Datenbank im Kindprozess (CREATE/INSERT erlaubt, Fremdschlüssel an, 1,5 s, Größen- und Zeilengrenzen), nichts
wird gespeichert. Alle übrigen Aufgaben bleiben nur lesend.

## Inhalte

Lab-Aufgaben, Verhöre und Warm-up-Karten liegen als JSON in `seed/akten/akte<n>.json` (Kür: `seed/akten/kuer.json`) und `seed/warmup/warmup_a<n>.json`
(Format: [`docs/AUFGABENFORMAT.md`](docs/AUFGABENFORMAT.md)), der Gastmodus in `seed/gast/probefall.json`, Beweisstücke und Steckbrief in
`seed/fallebene.json`, Live-Pool und Escape Room in `seed/live/`. Der Server
spielt sie beim Start per Upsert ein; `npm run validate` prüft Format, Verweise und jede SQL-Musterlösung in der Sandbox
auf Haupt-DB und allen Varianten (EH-§8-konform). Verhör-Kontexte (eigene, nicht öffentliche DBs) liegen unter
`seed/datenbanken/verhoer/`.

## Betrieb (CapRover)

Umgebungsvariablen (Vertrag §8):

| Variable | Wert |
|---|---|
| `PLATTFORM_ID` | `datendetektei` |
| `PLATTFORM_URL` | `https://datendetektei.frankjuchim.de` |
| `PORTAL_URL` | `https://labs.frankjuchim.de` |
| `PORTAL_PUBLIC_KEY` | Inhalt von `https://labs.frankjuchim.de/sso/schluessel.pem` |
| `AUTH_MODUS` | `portal` |
| `SESSION_SECRET` | zufällig, ≥ 32 Zeichen |
| `DATA_DIR` | `/app/data` (Persistent Directory) |
| `PORT` | `80` |
| `TRUST_PROXY` | `1` |

Nach dem ersten Deploy: Superadmin trägt die Plattform im Portal unter „Plattformen“ ein, bestätigt die
Rücksprung-Adresse `https://datendetektei.frankjuchim.de/sso/ende` und schaltet Lehrkräfte frei.

Vorlage für die Variablen: [`.env.example`](.env.example). Container: `Dockerfile` (Node 22, läuft als `node`,
Port 80, `HEALTHCHECK` auf `/healthz`, `TZ=Europe/Berlin`), `captain-definition`; Persistent Directory `/app/data`.

**Deploy per Webhook:** `main` ist über einen GitHub-Webhook direkt mit CapRover verbunden – jeder Push auf `main`
startet sofort den Live-Build (wie bei Algo Quest und dem Portal). Die GitHub Action „Prüfung“
(`.github/workflows/pruefung.yml`: Tests, App-Start, `vertrag_pruefen.js`, Kontrastprüfung, Docker-Build und
Container-Start) läuft bei jedem Push, blockiert den Deploy aber nicht. Deshalb nur auf Feature-Branches arbeiten und
erst nach grüner Prüfung und Freigabe nach `main` übernehmen.

## Lizenz

Noch festzulegen (Vorschlag: Materialien CC BY-NC-SA 4.0). Abituraufgaben des Landes Niedersachsen sind nicht
enthalten; es wird nur auf sie verwiesen.
