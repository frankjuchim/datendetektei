# Materialien – Ablage, Zugriff, Whitelists

Maßgeblich: Spec §12 (Ordner §12.1, Pipeline §12.2, Zugriff §12.4) und E13. Diese Datei beschreibt, was der Server
erwartet (Phase 6 Task 5); die Pipeline (Phase 7, `werkzeuge/*_pdf.py`) erzeugt PDFs und Whitelists.

## Zugriff nach Rolle (E13)

| Stufe | Ordner | Wer | Route |
|---|---|---|---|
| `gast` | Auswahl aus `Arbeitsblaetter_PDF`, `Lehrkraft_PDF` (`Loesungen_Portal` nur ausdrücklich) | alle, ohne Anmeldung | `GET /gast/material/<datei>` |
| `schueler` | `Arbeitsblaetter_PDF` | angemeldet: `schueler`, `lehrkraft`, `superadmin` | `GET /material/schueler/<pfad>` |
| `lehrkraft` | `Loesungen_Portal`, `Lehrkraft_PDF` | `lehrkraft`, `superadmin` | `GET /material/lehrkraft/<pfad>` |
| `original` | docx/pptx/md in den Akten-Ordnern (Liste: `Originale/verzeichnis.json`) | nur `superadmin` | `GET /material/original/<pfad>`, ZIP je Akte `GET /material/original-zip/<0–7\|kuer>` |

- `<pfad>` ist der Pfad relativ zu `materialien/` (z. B. `Arbeitsblaetter_PDF/Akte1/DD_A1-AB1_Der_erste_Auftrag.pdf`),
  jedes Segment URL-kodiert. Die Links liefert `GET /api/material`.
- Ausgeliefert wird nur, was in der Whitelist steht **und** existiert. Alles andere – anonym, falsche Rolle, nicht
  gelistet, Datei fehlt, ungültiger Pfad – ist **404** (gleiche Antwort; die Existenz wird nicht verraten).
- `GET /api/material[?kurs=k:<id>]`: `{ rolle, niveau, stufen: { gast, schueler?, lehrkraft?, original? }, zips? }`;
  anonym nur `gast`. Jeder Eintrag: `id, datei, titel, akte, niveau, art, groesse, url`. Schüler, deren Kurse alle gA
  sind (bzw. mit `?kurs=` eines gA-Kurses, auch für Lehrkräfte), sehen kein Material mit `niveau: "eA"`. `?kurs=` nur
  für eigene Kurse (Superadmin: jeder bestehende), sonst 403. Der Download selbst filtert nicht nach Niveau.
- Kopfzeilen: `Content-Disposition` mit ASCII-Dateinamen (Umlaute ausgeschrieben; PDF `inline`, sonst `attachment`),
  `X-Content-Type-Options: nosniff`; Schülerfassungen `private, no-cache`, Lehrkraft und Originale `private, no-store`.
- ZIP der Originale: selbst geschrieben (Methode „stored“, CRC32, UTF-8-Namen, Pfade relativ zu `materialien/`),
  Größenlimit 200 MB (sonst 413 mit Hinweis „einzeln herunterladen“); Einträge ohne `akte` zählen zu 0 (übergreifend).
- Themenseite `/themen`: Titel, Akte, Niveau, Art mit „nach Anmeldung“ bzw. „nach Anmeldung (Lehrkraft)“ (keine
  Dateipfade, keine Originale); Einträge der Gast-Auswahl mit öffentlichem Link. Angemeldet verlinkt der Browser
  zusätzlich, was `GET /api/material` erlaubt (gleiche `id`). Ohne Whitelist-Einträge einer Akte bleiben die geplanten
  Titel stehen.

## Whitelists

Je Ordner eine Datei `materialien/<Ordner>/verzeichnis.json` (`Arbeitsblaetter_PDF`, `Loesungen_Portal`,
`Lehrkraft_PDF`, `Originale`, `Gast_PDF`). Fehlt sie, ist die Stufe leer.

```json
{
  "dateien": [
    { "datei": "Akte1/DD_A1-AB1_Der_erste_Auftrag.pdf", "titel": "AB 1.1 Der erste Auftrag", "akte": 1,
      "niveau": "beide", "art": "arbeitsblatt" }
  ]
}
```

| Feld | Pflicht | Bedeutung |
|---|---|---|
| `datei` | ja | Pfad relativ zum eigenen Ordner (Unterordner erlaubt, auch flache Namen). **Originale:** relativ zu `materialien/` (z. B. `Akte1_Fundbuero/2_Arbeitsblaetter/DD_A1_AB1_….docx`), nie in einem erzeugten Ordner |
| `titel` | empfohlen | Anzeigetitel (Standard: Dateiname) |
| `akte` | empfohlen | `1`–`7`, `0` = übergreifend (Gesamt, Handbuch …), `"kuer"`; `null` = übergreifend |
| `niveau` | nein | `eA`, `gA`, `beide` (Standard; `alle` gilt als `beide`) |
| `art` | nein | `arbeitsblatt`, `loesung`, `praesentation`, `handout`, `warmup`, `handbuch`, `unplugged`, `lehrerhinweise`, `pruefung`, `erwartungshorizont`, `gesamt`, `video`; die Kurzformen der Pipeline `ab`, `generalprobe`, `klausur`, `kuer` gelten mit |

Weitere Felder (z. B. `_hinweis`, `gruppe`, `fassung`, `ermittlung`, `ds` aus der Pipeline) werden ignoriert.

**Pfadregeln** (beim Laden geprüft, ungültige Einträge werden übersprungen und gemeldet): Segmente aus Buchstaben,
Ziffern, `_ - . ( ) + ,` und Leerzeichen, beginnend mit Buchstabe/Ziffer/`_`, kein `..`, keine versteckten Dateien,
kein `\`; Endungen: PDF-Stufen nur `.pdf`, Originale `.docx`, `.pptx`, `.md`. Beim Ausliefern prüft der Server
zusätzlich, dass die Datei (auch nach Symlinks) unter `materialien/` liegt; `sendFile` immer mit `root`.

**Gast-Auswahl** `Gast_PDF/verzeichnis.json` (Standard leer, Frank wählt aus): Einträge zusätzlich mit
`"ordner": "Arbeitsblaetter_PDF" | "Lehrkraft_PDF" | "Loesungen_Portal"` und optional `"fassung": "schueler" | "lehrkraft"`;
`datei` relativ zu diesem Ordner. Was nach Lösung, Erwartungshorizont oder Klausur aussieht (Ordner
`Loesungen_Portal`, `art` loesung/pruefung/erwartungshorizont/klausur, `fassung: "loesung"` oder Dateiname mit `LSG`,
`Loesung`, `Erwartungshorizont`, `Klausur`, `EH`), wird nur mit `"ausdruecklich": true` ausgeliefert – und
`npm run validate` warnt dann trotzdem.

**Prüfung:** `npm run validate` prüft alle Whitelists (`pruefeVerzeichnisse` in `src/services/material.js`):
Formatfehler (JSON, Pfad, Endung, `akte`/`niveau`/`art`, doppelt) sind Fehler; gelistete, aber fehlende Dateien und
Lösungen in der Gast-Auswahl sind Hinweise.

## Docker-Image

`materialien/` kommt ins Image (Stufe `material` im `Dockerfile`). Die Originale (alle `.docx`, `.pptx`, `.md`) nur mit
`ORIGINALE_IM_IMAGE=1` (Build-Arg, Standard `1`); `docker build --build-arg ORIGINALE_IM_IMAGE=0 .` entfernt sie –
der Superadmin sieht dann keine Originale (die Liste filtert fehlende Dateien). Der Build gibt die Größe von
`materialien/` aus (Spec §12.4: Größe prüfen).
