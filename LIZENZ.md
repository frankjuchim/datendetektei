# Lizenz – Datendetektei Weserstedt

> **Vorläufige Festlegung (Default bis zur Entscheidung von Frank Juchim, Spec §17 Punkt 3).** Bis dahin gilt
> folgende Regelung; sie kann sich vor einer Veröffentlichung für andere Lehrkräfte noch ändern.

## 1. Unterrichtsmaterialien und Inhalte – CC BY-NC-SA 4.0

Die Unterrichtsmaterialien und Inhalte der Datendetektei stehen unter der Lizenz
**Creative Commons Namensnennung – Nicht kommerziell – Weitergabe unter gleichen Bedingungen 4.0 International**
([CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.de)). Dazu gehören:

- `materialien/` – Arbeitsblätter, Präsentationen, Lösungen, Lehrerhinweise, Generalprobe, Klausuren, Video-Folien und
  -Drehbücher (docx/pptx und die daraus erzeugten PDFs),
- `seed/` – Akten, Aufgaben, Warm-up-Karten, Gastmodus, Live-Inhalte, Fallebene und Story-Texte sowie die
  Übungs- und Verhör-Datenbanken (Schemata, Pflichtdaten, Varianten, erzeugte Daten),
- `docs/` – Unterrichtsplanung (u. a. `DS_PLANUNG.md`, `KOMPETENZMATRIX.md`, `STORY.md`).

**Namensnennung:** „Frank Juchim, Datendetektei Weserstedt“ mit Link auf die Lizenz und Hinweis auf Änderungen.

Alle Personen, Firmen, Orte und Daten in den Materialien und Datenbanken sind frei erfunden.

## 2. Programmcode – alle Rechte vorbehalten

Der Programmcode der Plattform und der Werkzeuge (`src/`, `public/` ohne die unter 3. genannten Drittkomponenten,
`scripts/`, `werkzeuge/`, `quellen/`, `test/`) ist bis zur Entscheidung **nicht** unter einer freien Lizenz
freigegeben: © Frank Juchim, alle Rechte vorbehalten.

Ausnahmen: `src/kern/jwt.js` und `scripts/vertrag_pruefen.js` sind unveränderte Kopien aus dem Portal-Repo
`frankjuchim/labs` und folgen dessen Regelung.

## 3. Drittkomponenten mit eigenen Lizenzen

| Komponente | Ort | Lizenz | Lizenztext |
|---|---|---|---|
| Schriften Barlow, Barlow Condensed (The Barlow Project Authors) | `public/static/fonts/*.woff2`, `werkzeuge/fonts/Barlow*.ttf` | SIL Open Font License 1.1 | `public/static/fonts/OFL.txt`, `werkzeuge/fonts/OFL_Barlow.txt` |
| Schrift IBM Plex Mono (IBM Corp.) | `public/static/fonts/ibm-plex-mono-*.woff2`, `werkzeuge/fonts/IBMPlexMono-*.ttf` | SIL Open Font License 1.1 | `public/static/fonts/OFL.txt`, `werkzeuge/fonts/OFL_IBMPlexMono.txt` |
| sql.js 1.14.2 | `public/static/vendor/sqljs/` | MIT | `public/static/vendor/sqljs/LICENSE` |
| npm-Abhängigkeiten (Laufzeit: express, better-sqlite3 mit SQLite, helmet; Entwicklung: supertest, playwright-core, @fontsource/*, sql.js) | `node_modules/` (nicht im Repo) | MIT; SQLite gemeinfrei; playwright-core Apache-2.0; @fontsource OFL 1.1 | jeweils im Paket |

Die Lizenzen der Drittkomponenten gehen dieser Regelung vor.

## 4. Keine Abituraufgaben

Aufgaben des niedersächsischen Zentralabiturs sind **nicht** enthalten. Materialien verweisen höchstens auf sie
(Jahr, Termin, Teilaufgabe); Klausuren, Generalprobe und Verhöre sind eigene Aufgaben im Abitur-Stil.
