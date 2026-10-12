# Datendetektei Weserstedt – Ermitteln mit Datenbanken

Unterrichtseinheit **Datenbanken** für den Informatikunterricht der Oberstufe in Niedersachsen (Leistungskurs eA,
Grundkurs-Pfad gA, Abitur ab 2027) mit eigener Lernplattform im Verbund **InfoLabs**.

Der Kurs arbeitet als Ermittlerteam der *Datendetektei Weserstedt*: Mit SQL werden Fälle aufgeklärt, ein chaotisches
Vereinsarchiv zeigt, warum Datenbanken gut modelliert sein müssen, die Detektei entwirft ihre eigene Fall-Datenbank –
und am Ende führt das Verknüpfen von Daten zum „Phantom“ und zur Frage, was Datenschutz eigentlich schützt.

> **Status:** Planung abgeschlossen (Phase 0). Umsetzung in Claude Code nach `docs/superpowers/plans/`.

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

## Lizenz

Noch festzulegen (Vorschlag: Materialien CC BY-NC-SA 4.0). Abituraufgaben des Landes Niedersachsen sind nicht
enthalten; es wird nur auf sie verwiesen.
