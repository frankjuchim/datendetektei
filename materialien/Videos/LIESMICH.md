# Erklärvideos – Arbeitsweise und Format

Spec §13 (Playlist „Datendetektei“ auf YouTube @frankjuchim). Je Video ein Ordner `NN_Kurztitel/`:

```
video.json                          QUELLE – hier wird bearbeitet (Folien, Sprechertext, Metadaten, Bilder)
DD_VideoNN_Kurztitel_Folien.pptx    ERZEUGT: Folien zum Abfilmen (Akten-Design, Kamera-Zone frei, Sprechertext in den Notizen)
DD_VideoNN_Kurztitel_Skript.md      ERZEUGT: Drehbuch (Lernziele, YouTube-Titel/Beschreibung/Kapitel/Tags, Folie für Folie)
bilder/*.png                        ERZEUGT: Bilder aus der Plattform (scripts/video_bilder.js, nur eigene Beispieldaten)
```

| Nr. | Ordner | Akte · DS | Beispieldaten |
|---|---|---|---|
| 0 (opt.) | `00_So_ermittelst_du` | Start · DS 1 | Bildschirmfotos (Test-Server, „Mika R.“), Eisdiele |
| 1 | `01_SQL-Grundlagen` | A1 · DS 1–2 | DB `video/schachturnier` |
| 2 | `02_Verbund_ohne_JOIN` | A2 · DS 3–4 | DB `video/schachturnier`, Spurenbrett (Eisdiele) |
| 3 | `03_GROUP_BY_und_HAVING` | A3 · DS 5–6 | Eisdiele (eigene Fragen), Sortierfächer, Zeitlupe |
| 4 | `04_Redundanz_und_Schluessel` | A4 · DS 7–8 | Ausleihliste einer Kanu-AG, Schema-Werkbank |
| 5 | `05_ER-Modelle` | A5 · DS 9–10 | „Tierheim“, Bauplan-Tisch |
| 6 | `06_ER_zu_Relationenschema` | A5 · DS 11 | „Tierheim“, Bauplan-Tisch, Schema-Werkbank |
| 7 (opt.) | `07_Abi-Check` | A7 · DS 13 | DB `video/schachturnier` |

Nach jeder Änderung an einer `video.json`:

```
npm run videos -- NN_Kurztitel          # Folien + Drehbuch neu (ohne Angabe: alle)
npm run videos:bilder -- NN_Kurztitel   # zusätzlich die Plattform-Bilder neu rendern (Playwright, Chromium)
npm run videos:pruefen                  # Vollständigkeit, Aktualität, Aufbau, Kamera-Zone (Teil von npm run pruefen)
npm run praesentationen                 # Folien-PDF für Lehrkräfte (Lehrkraft_PDF, Gruppe „Videos“ in seed/arbeitsblaetter.json)
```

Die Folien können danach in PowerPoint nachbearbeitet werden – dann aber nicht erneut erzeugen (oder die Änderung
zusätzlich in die `video.json` übernehmen). `--pruefen` meldet „veraltet“, wenn sich `video.json` oder ein Bild nach
dem Erzeugen geändert hat (Eigenschaft `DD-Video-Quelle` = SHA-256 in der pptx).

## Aufbau (Spec §13, geprüft)

Titelfolie (Einstieg ≤ 30 s ≈ 65 Wörter) → Beispiel mit eigenen Daten → ⏸ Pause-Aufgabe (`typ: pause`) und Auflösung →
Fallen mit P-Nummer → Merksätze (`typ: merke`) → „Weiter im Lab“ (`typ: ende`); 8–14 Folien; jede Folie mit
Sprechertext; mindestens drei YouTube-Kapitel, das erste auf der Titelfolie.

**Kamera-Zone:** unten rechts ab x = 9,35 in, y = 4,55 in bleibt jede Folie frei (`pruefe_kamera_zone`). Die linke
Spalte reicht über die volle Höhe, die rechte Spalte und der breite Bereich `oben` enden über der Zone.

## Format der `video.json`

```json
{ "nr": 1, "kurz": "SQL-Grundlagen", "akte": 1, "aktenname": "Akte 1 · Das Fundbüro",
  "titel": "…", "untertitel": "…", "einsatz_kurz": "Akte 1 · DS 1–2", "einsatz": "…", "laenge": "8–10 min",
  "zielgruppe": "…", "datenbank": "video/schachturnier", "beispieldaten": "…",
  "lernziele": ["…"], "hinweise": ["geprüfte Werte, Regie …"],
  "youtube": { "titel": "…", "beschreibung": "…", "tags": ["…"] },
  "bilder": { "<name>": { "werkzeug": "zeitlupe", "db": "eisdiele", "sql": "…", "schritt": 3 } },
  "folien": [ { "typ": "inhalt", "titel": "…", "kapitel": "…", "regie": "…", "sprechertext": "…", "pause_s": 0,
                "oben": [Block…], "links": [Block…], "rechts": [Block…], "teilung": 6.6 } ] }
```

**Folientypen:** `titel` · `inhalt` (Standard) · `pause` (Etikett „⏸ Video anhalten“ vor den Blöcken) · `merke`
(`punkte` → Ermittler-Notiz) · `ende` (`lab: [{ermittlung, titel, aufgaben, werkzeug} | {text}]`, `material`, `naechstes`).

**Blöcke** (Schrift schrumpft automatisch, bis alles passt; sonst bricht der Generator mit Folie und Bereich ab):

| Block | Wirkung |
|---|---|
| `"Text"` bzw. `{"text": …}` | Absatz (`**fett**`, `*kursiv*`, `` `Code` ``, `<u>PK</u>`, `↑FK`) |
| `{"punkte": [...]}` | Aufzählung, Unterpunkte mit `"  - "` |
| `{"sql": …, "db", "pruefung": "fehlerhaft", "label", "art": "falsch"\|"richtig", "ergebnis": true, "max_zeilen"}` | Konsole (Textfeld „SQL [db=…]“) + Ergebnistabelle **aus der DB** – geprüft von `material_sql_pruefen.py` |
| `{"tabelle": {kopf, zeilen, pk, fk, titel, groesse}}` | Datentabelle |
| `{"schema": [...], "titel"}` | Kurzschreibweise (EH §7) auf einer Karte |
| `{"bild": name, "hoehe"}` | Bild aus `bilder/` (ohne `hoehe`: füllt den Rest) |
| `{"kasten": {farbe: blau\|gold\|rot\|gruen\|papier, titel, text: [...]}}` | Karte; Zeilen mit `"- "` als Aufzählung |
| `{"falle": "P6", "titel", "text"}` | Fallen-Karte mit P-Nummer |
| `{"schritte": [...]}` | nummerierte Schritte |

**Bilder** (`scripts/video_bilder.js`, Test-Server der E2E-Tests): `werkzeug` = `zeitlupe` (`db`, `sql`, `schritt`),
`spurenbrett` (`db`, `tabellen`, `bedingung`, `anwenden`), `sortierfaecher` (`db`, `sql`), `bauplan` (`graph`, `layout`
wie Block `er`; Rand wird abgeschnitten), `werkbank` (`relationen`), `konsole` (`db`, `sql`), `seite` (`pfad`,
`anmelden`); dazu `ausschnitt` (CSS-Selektor), `aktionen`, `breite`, `hoehe`, `thema`.

## Inhaltliche Regeln

- **Eigene Beispieldaten:** nie Lab-, AB-, Verhör-, Warm-up- oder Klausuraufgaben; keine Abitur-Originaltexte.
  SQL-Beispiele laufen auf `seed/datenbanken/video/schachturnier` (nur für Videos, zur Laufzeit nicht geladen) bzw.
  auf der Eisdiele des Gastmodus mit eigenen Fragen (nicht die Demo-Fragen des Probefalls).
- SQL im Abi-Stil (EH §8), Notation EH §7, Fachbegriffe nach EH, Fallen mit P-Nummer (Spec §5); Schülerinnen und
  Schüler werden geduzt, Abitur-Formulierungen gesiezt (Operator fett).
- Veröffentlichung: zuerst „nicht gelistet“, nach Freigabe öffentlich; Einbindung als Link-Knopf (kein Embed).
