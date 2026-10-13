# Datendetektei – Design-System „Akten-Noir light“

| | |
|---|---|
| **Stand** | 2026-10-12 · Phase 0 (Konzept) |
| **Gilt für** | Plattform `datendetektei.frankjuchim.de` (alle Seiten unter `public/`), Bilder für Videos/Material aus dem Renderer |
| **Quelle der Wahrheit** | Spezifikation `docs/superpowers/specs/2026-10-12-datendetektei-design.md` (Abschnitt 3.1, 7, 8) – bei Widerspruch gilt die Spec |
| **Verbindliche Layouts** | Klickbarer Prototyp `docs/prototyp/prototyp.html`, Screenshots unter `docs/prototyp/screenshots/` |

Dieses Dokument ist die Referenz für Claude Code beim Bau der Oberfläche. Es legt Tokens, Komponenten, Screens,
Responsive-Regeln und Texte fest. Neue Komponenten werden **zuerst hier** eingetragen, dann gebaut.

---

## 1. Leitidee

**Ermittlerakte statt Spiel-Dungeon.** Papier, Tinte, Stempel, roter Faden. Ruhig und gut lesbar in der Schule: auf
dem Beamer aus der letzten Reihe, auf dem iPad im Hochformat, auf dem Handy im Bus. Spannung entsteht über
**Story-Elemente** (Stadtplan, Steckbrief des Phantoms, Beweisstücke, Stempel) und **wenige, gezielte Animationen**
(Stempel schlägt auf, Fäden fallen ab, Zeilen werden grau) – nie über Effekte um ihrer selbst willen.

Drei Materialien tragen die ganze Oberfläche:

| Material | Wo | Wirkung |
|---|---|---|
| **Papier** (`--papier`, `--karte`) | Seiten, Aktendeckel, Karteikarten | ruhig, hell, Lesefläche |
| **Tinte + Siegelrot** (`--tinte`, `--siegelrot`) | Text, roter Faden, Stempel, Hauptaktion | Kontrast, Plattformfarbe |
| **Konsole** (`--konsole`) | Ermittlungskonsole, SQL-Blöcke, Verhör-Kopfband | „Werkzeug“, immer dunkel |

Regeln:
- **Fachbegriffe ersetzen nie die Story-Begriffe** und umgekehrt: Die Akte heißt Akte, die Tabelle heißt Tabelle.
- Die Story bleibt **dekorativ und kurz** (max. 3 Sätze Briefing), der Fachinhalt steht im Vordergrund.
- **Verhöre sind nüchtern** (Abitur-Stil, gesiezt): weniger Story-Optik, mehr Prüfungsbogen.
- Ein einziger Akzent pro Bildschirmbereich: Siegelrot für die Hauptaktion, Messing für Auszeichnungen, Grün für
  „gelöst“, Blau für Hinweise. Keine weiteren Akzentfarben.

**Vertrag §9 SOLL Hausfarben:** bewusst abweichend (eigene Produktidentität, Entscheidung E5), Begründung im README.
Der Link **„⌂ Portal“** in der Kopfzeile bleibt in jeder Ansicht erhalten (Icon `haus` + Text „Portal“, auf dem Handy
nur Icon mit `aria-label`).

---

## 2. Design-Tokens

Alle Farben, Abstände, Radien, Schatten und Schriftgrößen sind CSS-Custom-Properties in
`public/static/css/tokens.css`. **Keine Farbliterale in Komponenten-CSS** (Ausnahme: Konsole-interne Töne, die in
beiden Themes gleich sind, siehe 2.3). Token-Namen sind deutsch, wie im Prototyp.

### 2.1 Kernfarben (exakt aus Spec Abschnitt 8)

| Token | Hell | Dunkel | Verwendung |
|---|---|---|---|
| `--tinte` | `#1C2B3A` | `#E8E1D3` | Text, Überschriften |
| `--papier` | `#F4EDE1` | `#141B22` | Seitenhintergrund |
| `--karte` | `#FFFDF8` | `#1C252E` | Karten, Akten, Tabellen |
| `--siegelrot` | `#B3261E` | `#E0574F` | Plattformfarbe, roter Faden, Hauptknopf, Fehler-Akzent |
| `--messing` | `#B08D3C` | `#D4B062` | Auszeichnungen, Beweisstücke, Rang |
| `--gruen` | `#2F6B4F` | `#5FAF86` | richtig/gelöst |
| `--blau` | `#2C5A85` | `#7FA9D6` | Hinweise, Merkkästen, Fokus |
| `--konsole` | `#11161C` | `#0B0F13` | Ermittlungskonsole (immer dunkel) |
| `--konsole-text` | `#D8E3D0` | `#D8E3D0` | Text in der Konsole |

### 2.2 Abgeleitete Töne

| Token | Hell | Dunkel | Verwendung |
|---|---|---|---|
| `--tinte-2` | `#46525E` | `#BDB6A9` | Sekundärtext, Beschreibungen |
| `--tinte-3` | `#58626D` | `#9C978E` | leiser Text: Etiketten, Meta, `NULL` |
| `--flaeche` | `#EBE2D2` | `#24303B` | Tabellenkopf, Hover, eingelassene Flächen |
| `--flaeche-2` | `#E3D8C4` | `#2B3845` | Ringspur, Schalterbahn, bearbeitete Felder |
| `--rand` | `#D8CCB6` | `#33414E` | dekorative Haarlinien (Karten, Tabellen) |
| `--rand-stark` | `#8F8270` | `#6E7B87` | Ränder von Bedienelementen (≥ 3 : 1) |
| `--siegelrot-text` | `#B3261E` | `#EF7068` | Siegelrot **als Text** (Stempel, Fehlertext) – im Dunkelmodus heller, damit AA |
| `--messing-text` | `#7A5E1F` | `#D4B062` | Messing **als Text** (Rang, „KÜR“) |
| `--messing-grafik` | `#94742B` | `#D4B062` | Messing als Grafik auf Papier (Ringe, Sterne, Leiste) |
| `--auf-akzent` | `#FFFFFF` | `#141B22` | Text auf gefüllten Akzentflächen (Knöpfe rot/grün) |
| `--rot-flaeche` | `#F8E3DF` | `#2F1D21` | Fehler-Feedback, Fallen-Plakette |
| `--gruen-flaeche` | `#E0EEE5` | `#1E3329` | Erfolgs-Feedback, gelöste Aufgabe |
| `--blau-flaeche` | `#E2EAF3` | `#1F2D3D` | Ermittler-Notiz, Tipp |
| `--messing-flaeche` | `#F3E8CD` | `#3A3222` | Rangabzeichen, Bestätigungsleiste, „läuft“ |
| `--kork` / `--kork-punkt` | `#D9BF98` / `#C8A97C` | `#3A3127` / `#463B2F` | Pinnwand, Spurenbrett |
| `--wasser`, `--wasser-rand` | `#C9D9E3`, `#A9C1D1` | `#1C3142`, `#2A4559` | Weser im Stadtplan |
| `--gruenanlage`, `--strasse`, `--block` | `#D5DFC4`, `#FBF7EF`, `#E6DCCB` | `#213026`, `#2A3440`, `#1D2730` | Stadtplan |
| `--nebel` | `#EFE9DF` | `#222C36` | Nebel über gesperrten Akten |
| `--fokus` | `#2C5A85` | `#7FA9D6` | Fokusring |
| `--schatten-farbe`, `--schatten-farbe-stark` | `rgba(28,43,58,.14)`, `.24` | `rgba(0,0,0,.35)`, `.55` | Schatten |

### 2.3 Konsole (in beiden Themes dunkel)

| Token | Wert (beide Themes; nur `--konsole` selbst wechselt) | Verwendung |
|---|---|---|
| `--konsole-flaeche` | `#19212A` / dunkel `#141A20` | Schema-Browser, Knopfleiste |
| `--konsole-rand` | `#2A3540` / dunkel `#26313B` | Trennlinien |
| `--konsole-leise` | `#8A9AA6` | Zeilennummern, Etiketten |
| `--sql-schluessel` | `#F2A65A` | `SELECT`, `FROM`, `WHERE` … |
| `--sql-text` | `#9BD3A6` | `'Zeichenketten'` |
| `--sql-zahl` | `#8CC4FF` | Zahlen |
| `--sql-kommentar` | `#7F8F99` (kursiv) | `-- Kommentar` |
| Aggregat (`COUNT` …) | `#E6C77A` | Funktionsnamen |
| Knöpfe in der Konsole | Ausführen `#E0574F` / Prüfen `#5FAF86`, Text `#141B22` | immer die Dunkelmodus-Akzente, weil der Grund dunkel ist |

### 2.4 Daten-Farben (Diagramme, Zeitlupe, Heatmap)

| Token | Hell | Dunkel | Verwendung |
|---|---|---|---|
| `--gruppe-1` | `#2A64A0` | `#4F8FD6` | Gruppe 1 in Zeitlupe/Sortierfächern |
| `--gruppe-2` | `#B08D3C` | `#B08A35` | Gruppe 2 |
| `--gruppe-3` | `#8A4F96` | `#A874C0` | Gruppe 3 |
| `--heat-1 … --heat-5` | `#DCE6F0 #AFC6DD #7299BF #3F6E9C #1F4A73` | `#22303E #2D4760 #3F6587 #6390BE #9CC0E6` | Lernstand-Matrix (eine Farbe, hell → dunkel; im Dunkelmodus gespiegelt) |
| `--heat-text-hell` / `--heat-text-dunkel` | `#1C2B3A` / `#FFFFFF` | `#E8E1D3` / `#141B22` | Wert in der Zelle: Stufe 1–3 bzw. 4–5 |

- Gruppenfarben sind mit dem Palette-Validator (dataviz-Skill: Helligkeitsband, Chroma, CVD-Abstand ΔE ≥ 8,
  Kontrast ≥ 3 : 1 zur Karte) für **hell und dunkel getrennt** geprüft. Mehr als 3 Gruppen: Gruppen 4+ erhalten nur
  Textlabel und Trennlinie, **keine** neue Farbe (Beispiele so wählen, dass ≤ 3 Gruppen sichtbar sind).
- Gruppen werden **nie nur über Farbe** gekennzeichnet: immer Gruppenname in der Zeile + Legende.
- Heatmap: 5 Stufen à 20 %, 0 % = „nicht begonnen“ als gestrichelte leere Zelle (kein Farbton).
- Fallen-Profil: eine Serie in `--siegelrot` (Fehler-Kontext), keine Legende (der Titel sagt, was gezeigt wird).
- Statusfarben (Grün/Rot) werden nie als Datenfarbe wiederverwendet.

### 2.5 Abstände (4/8-Raster)

| Token | Wert | typische Verwendung |
|---|---|---|
| `--a-1` | 4 px | Icon ↔ Text in Plaketten, Mini-Lücken |
| `--a-2` | 8 px | Knopfgruppen, Listenabstände |
| `--a-3` | 12 px | Feld ↔ Label, Tabellenzellen horizontal |
| `--a-4` | 16 px | Innenabstand kleiner Karten, **Seitenrand Handy** |
| `--a-5` | 24 px | Innenabstand Karten, Abstand zwischen Karten |
| `--a-6` | 32 px | Seitenrand Laptop, Abschnittsabstand |
| `--a-7` | 48 px | großer Abschnittsabstand |
| `--a-8` | 64 px | Seitenende |

Abstände zwischen Geschwistern immer über `gap` (Flex/Grid), nicht über Außenabstände einzelner Elemente.

### 2.6 Radien und Schatten

| Token | Wert | Verwendung |
|---|---|---|
| `--radius-klein` | 3 px | Karteikarte, Steckbrief, Etiketten |
| `--radius` | 6 px | Karten, Knöpfe, Felder, Aktendeckel |
| `--radius-gross` | 10 px | Ermittlungskonsole |
| Stempel | 4 px | Stempelrahmen |
| Plakette/Chip | 999 px | Fallen-Plakette, Schalter |
| `--schatten-1` | `0 1px 0 var(--schatten-farbe), 0 2px 6px var(--schatten-farbe)` | Papier liegt auf (Aktendeckel, Karteikarte, aktiver Navigationspunkt) |
| `--schatten-2` | `0 2px 0 …, 0 8px 22px var(--schatten-farbe-stark)` | Gehoben (Konsole, Polaroid, Tooltip, Handy-Menü) |

Karten bekommen **Rahmen ODER Schatten nach Rolle**: Arbeitsflächen (Karte) nur Rahmen; physische Objekte
(Aktendeckel, Karteikarte, Polaroid) Schatten. Nicht alles gleich rund und gleich schattig.

### 2.7 Typografie

Schriften **selbst gehostet** unter `public/static/fonts/` als **woff2** (Latin + Latin-Ext-Subset, `font-display:
swap`), Lizenz **SIL OFL 1.1** liegt bei (`public/static/fonts/OFL.txt`). Keine Google-Fonts-Einbindung in der
Plattform (CSP `font-src 'self'`). Nur der Prototyp lädt die Schriften von Google Fonts.

| Rolle | Familie | Schnitte | Fallback |
|---|---|---|---|
| Fließtext, UI | **Barlow** | 400, 500, 600, 700, 400 kursiv | `"Segoe UI", system-ui, -apple-system, sans-serif` |
| Überschriften, Stempel, Zahlen-Hero | **Barlow Condensed** | 500, 600, 700 | `"Arial Narrow", "Roboto Condensed", system-ui, sans-serif` |
| SQL, Tabellenköpfe, Etiketten, IDs | **IBM Plex Mono** | 400, 500, 600 | `ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace` |

Dateien (Vorschlag): `barlow-400.woff2`, `barlow-400i.woff2`, `barlow-500.woff2`, `barlow-600.woff2`,
`barlow-700.woff2`, `barlow-condensed-500/600/700.woff2`, `ibm-plex-mono-400/500/600.woff2` (≈ 12 Dateien, je
15–25 KB). `preload` nur für Barlow 400 und Barlow Condensed 600.

**Typo-Skala** (Basis 16 px; ab 1700 px Breite `html { font-size: 18px }` für Beamer):

| Token | rem | px (Basis 16) | Verwendung |
|---|---|---|---|
| `--t-xs` | 0.8125 | 13 | Mono-Etiketten (VERSAL, `letter-spacing: .08em`), Meta |
| `--t-s` | 0.9375 | 15 | Tabellen, Beschreibungen, Knöpfe |
| `--t-m` | 1.0625 | 17 | Fließtext (Zeilenhöhe 1.5, max. ~65 Zeichen) |
| `--t-l` | 1.3125 | 21 | Kartentitel (Condensed 600) |
| `--t-xl` | 1.75 | 28 | Screen-Titel (Condensed 600; Handy 24) |
| `--t-xxl` | 2.5 | 40 | Zähler (Zeitlupe, Spurenbrett), Punkte |

- Überschriften: `text-wrap: balance`, Condensed 600, Zeilenhöhe 1.15.
- Etiketten („AKTE 2 · SPUR DER RÄDER“): Plex Mono 500, versal, `letter-spacing: .08–.12em`, `--tinte-3`.
- Zahlen in Spalten: `font-variant-numeric: tabular-nums`; große Einzelzahlen proportional.
- **Kein Schreibmaschinen-Font für Fließtext.** Stempel-Optik nur über Barlow Condensed 700 + Versalien +
  Rotation + Rahmen.
- Aufgabenfrage: Barlow 600, 1.25 rem – sie ist das Wichtigste auf der Ermittlungsseite.

---

## 3. Kontrastprüfung (WCAG 2.1 AA)

Geprüft mit einem Node-Skript (relative Leuchtdichte nach WCAG 2.1). Soll: Text 4.5 : 1, große Schrift und
Grafik/Bedienelement-Ränder 3 : 1. **Alle Paarungen bestehen.** Das Skript gehört in Phase 1 als
`scripts/kontrast_pruefen.js` ins Repo (liest die Tokens aus `tokens.css`, CI bricht bei ✘ ab).

Wichtige Folgerungen aus der Prüfung:
- `--siegelrot` Dunkel (`#E0574F`) erreicht auf `--karte` nur 4.17 : 1 → **als Text** immer `--siegelrot-text`
  (`#EF7068`, 5.31 : 1). Als Faden/Rand/Füllung bleibt `--siegelrot`.
- `--messing` Hell (`#B08D3C`) auf Papier nur 2.69 : 1 → als Grafik `--messing-grafik` (`#94742B`, 3.77 : 1), als Text
  `--messing-text` (`#7A5E1F`, 5.99 : 1).
- Weißer Text auf `--siegelrot` Dunkel wäre zu schwach → `--auf-akzent` ist im Dunkelmodus `#141B22` (4.67 : 1).
- Heatmap: Text wechselt ab Stufe 4 die Farbe (Stufe 1–2 ≥ 8 : 1, Stufe 5 ≥ 9 : 1, Stufen 3/4 siehe Tabelle).

| Modus | Paarung | Vordergrund | Hintergrund | Verhältnis | Soll | AA |
|---|---|---|---|---|---|---|
| hell | Fließtext auf Seite (`tinte auf papier`) | #1C2B3A | #F4EDE1 | 12.40 : 1 | 4.5 | ✔ |
| hell | Fließtext auf Karte (`tinte auf karte`) | #1C2B3A | #FFFDF8 | 14.19 : 1 | 4.5 | ✔ |
| hell | Text auf Tabellenkopf/Fläche (`tinte auf flaeche`) | #1C2B3A | #EBE2D2 | 11.22 : 1 | 4.5 | ✔ |
| hell | Sekundärtext auf Seite (`tinte2 auf papier`) | #46525E | #F4EDE1 | 6.86 : 1 | 4.5 | ✔ |
| hell | Sekundärtext auf Karte (`tinte2 auf karte`) | #46525E | #FFFDF8 | 7.86 : 1 | 4.5 | ✔ |
| hell | Leiser Text (NULL, Meta) auf Karte (`tinte3 auf karte`) | #58626D | #FFFDF8 | 6.11 : 1 | 4.5 | ✔ |
| hell | Leiser Text auf Fläche (`tinte3 auf flaeche`) | #58626D | #EBE2D2 | 4.83 : 1 | 4.5 | ✔ |
| hell | Siegelrot als Grafik auf Seite (`siegelrot auf papier`) | #B3261E | #F4EDE1 | 5.62 : 1 | 3 | ✔ |
| hell | Siegelrot als Grafik (Faden, Rand) auf Karte (`siegelrot auf karte`) | #B3261E | #FFFDF8 | 6.43 : 1 | 3 | ✔ |
| hell | Roter Text/Stempel auf Karte (`siegelrotText auf karte`) | #B3261E | #FFFDF8 | 6.43 : 1 | 4.5 | ✔ |
| hell | Roter Text auf Seite (`siegelrotText auf papier`) | #B3261E | #F4EDE1 | 5.62 : 1 | 4.5 | ✔ |
| hell | Knopftext auf Siegelrot (`aufRot auf siegelrot`) | #FFFFFF | #B3261E | 6.54 : 1 | 4.5 | ✔ |
| hell | Messing als Grafik (Ring, Stern) auf Karte (`messing auf karte`) | #B08D3C | #FFFDF8 | 3.07 : 1 | 3 | ✔ |
| hell | Messing als Text auf Karte (`messingText auf karte`) | #7A5E1F | #FFFDF8 | 5.99 : 1 | 4.5 | ✔ |
| hell | Grüner Text/Stempel GELÖST auf Karte (`gruen auf karte`) | #2F6B4F | #FFFDF8 | 6.19 : 1 | 4.5 | ✔ |
| hell | Text auf grünem Knopf (`aufGruen auf gruen`) | #FFFFFF | #2F6B4F | 6.29 : 1 | 4.5 | ✔ |
| hell | Blauer Text (Hinweis) auf Karte (`blau auf karte`) | #2C5A85 | #FFFDF8 | 7.10 : 1 | 4.5 | ✔ |
| hell | Blau auf Merkkasten-Fläche (`blau auf blauFlaeche`) | #2C5A85 | #E2EAF3 | 5.95 : 1 | 4.5 | ✔ |
| hell | Text im Merkkasten (`tinte auf blauFlaeche`) | #1C2B3A | #E2EAF3 | 11.88 : 1 | 4.5 | ✔ |
| hell | Text in Fehler-Karte (`tinte auf rotFlaeche`) | #1C2B3A | #F8E3DF | 11.71 : 1 | 4.5 | ✔ |
| hell | Rot auf Fehler-Fläche (`siegelrotText auf rotFlaeche`) | #B3261E | #F8E3DF | 5.31 : 1 | 4.5 | ✔ |
| hell | Grün auf Erfolgs-Fläche (`gruen auf gruenFlaeche`) | #2F6B4F | #E0EEE5 | 5.25 : 1 | 4.5 | ✔ |
| hell | Messing auf Messing-Fläche (`messingText auf messingFlaeche`) | #7A5E1F | #F3E8CD | 5.00 : 1 | 4.5 | ✔ |
| hell | Bedienelement-Rand (Nicht-Text 1.4.11) (`randStark auf karte`) | #8F8270 | #FFFDF8 | 3.69 : 1 | 3 | ✔ |
| hell | Fortschrittsring/Sterne auf Seite (`messingGrafik auf papier`) | #94742B | #F4EDE1 | 3.77 : 1 | 3 | ✔ |
| hell | Roter Faden auf Pinnwand (`siegelrot auf kork`) | #B3261E | #D9BF98 | 3.69 : 1 | 3 | ✔ |
| hell | Fokusring auf Seite (`fokus auf papier`) | #2C5A85 | #F4EDE1 | 6.21 : 1 | 3 | ✔ |
| hell | Gruppenmarke 1 (Zeitlupe) (`gruppe1 auf karte`) | #2A64A0 | #FFFDF8 | 6.02 : 1 | 3 | ✔ |
| hell | Gruppenmarke 2 (Zeitlupe) (`gruppe2 auf karte`) | #B08D3C | #FFFDF8 | 3.07 : 1 | 3 | ✔ |
| hell | Gruppenmarke 3 (Zeitlupe) (`gruppe3 auf karte`) | #8A4F96 | #FFFDF8 | 5.68 : 1 | 3 | ✔ |
| hell | Heatmap: Wert in Stufe 3 (`heatTextHell auf heat3`) | #1C2B3A | #7299BF | 4.82 : 1 | 4.5 | ✔ |
| hell | Heatmap: Wert in Stufe 4 (`heatTextDunkel auf heat4`) | #FFFFFF | #3F6E9C | 5.35 : 1 | 4.5 | ✔ |
| hell | Konsolentext (`konsoleText auf konsole`) | #D8E3D0 | #11161C | 13.69 : 1 | 4.5 | ✔ |
| hell | Zeilennummern/leise in Konsole (`konsoleLeise auf konsole`) | #8A9AA6 | #11161C | 6.28 : 1 | 4.5 | ✔ |
| hell | SQL-Schlüsselwort (`kwSchl auf konsole`) | #F2A65A | #11161C | 8.98 : 1 | 4.5 | ✔ |
| hell | SQL-Zeichenkette (`kwStr auf konsole`) | #9BD3A6 | #11161C | 10.61 : 1 | 4.5 | ✔ |
| hell | SQL-Zahl (`kwZahl auf konsole`) | #8CC4FF | #11161C | 9.91 : 1 | 4.5 | ✔ |
| hell | SQL-Kommentar (`kwKomm auf konsole`) | #7F8F99 | #11161C | 5.45 : 1 | 4.5 | ✔ |
| dunkel | Fließtext auf Seite (`tinte auf papier`) | #E8E1D3 | #141B22 | 13.34 : 1 | 4.5 | ✔ |
| dunkel | Fließtext auf Karte (`tinte auf karte`) | #E8E1D3 | #1C252E | 11.93 : 1 | 4.5 | ✔ |
| dunkel | Text auf Tabellenkopf/Fläche (`tinte auf flaeche`) | #E8E1D3 | #24303B | 10.34 : 1 | 4.5 | ✔ |
| dunkel | Sekundärtext auf Seite (`tinte2 auf papier`) | #BDB6A9 | #141B22 | 8.62 : 1 | 4.5 | ✔ |
| dunkel | Sekundärtext auf Karte (`tinte2 auf karte`) | #BDB6A9 | #1C252E | 7.70 : 1 | 4.5 | ✔ |
| dunkel | Leiser Text (NULL, Meta) auf Karte (`tinte3 auf karte`) | #9C978E | #1C252E | 5.34 : 1 | 4.5 | ✔ |
| dunkel | Leiser Text auf Fläche (`tinte3 auf flaeche`) | #9C978E | #24303B | 4.63 : 1 | 4.5 | ✔ |
| dunkel | Siegelrot als Grafik auf Seite (`siegelrot auf papier`) | #E0574F | #141B22 | 4.67 : 1 | 3 | ✔ |
| dunkel | Siegelrot als Grafik (Faden, Rand) auf Karte (`siegelrot auf karte`) | #E0574F | #1C252E | 4.17 : 1 | 3 | ✔ |
| dunkel | Roter Text/Stempel auf Karte (`siegelrotText auf karte`) | #EF7068 | #1C252E | 5.31 : 1 | 4.5 | ✔ |
| dunkel | Roter Text auf Seite (`siegelrotText auf papier`) | #EF7068 | #141B22 | 5.94 : 1 | 4.5 | ✔ |
| dunkel | Knopftext auf Siegelrot (`aufRot auf siegelrot`) | #141B22 | #E0574F | 4.67 : 1 | 4.5 | ✔ |
| dunkel | Messing als Grafik (Ring, Stern) auf Karte (`messing auf karte`) | #D4B062 | #1C252E | 7.53 : 1 | 3 | ✔ |
| dunkel | Messing als Text auf Karte (`messingText auf karte`) | #D4B062 | #1C252E | 7.53 : 1 | 4.5 | ✔ |
| dunkel | Grüner Text/Stempel GELÖST auf Karte (`gruen auf karte`) | #5FAF86 | #1C252E | 5.88 : 1 | 4.5 | ✔ |
| dunkel | Text auf grünem Knopf (`aufGruen auf gruen`) | #141B22 | #5FAF86 | 6.58 : 1 | 4.5 | ✔ |
| dunkel | Blauer Text (Hinweis) auf Karte (`blau auf karte`) | #7FA9D6 | #1C252E | 6.32 : 1 | 4.5 | ✔ |
| dunkel | Blau auf Merkkasten-Fläche (`blau auf blauFlaeche`) | #7FA9D6 | #1F2D3D | 5.70 : 1 | 4.5 | ✔ |
| dunkel | Text im Merkkasten (`tinte auf blauFlaeche`) | #E8E1D3 | #1F2D3D | 10.75 : 1 | 4.5 | ✔ |
| dunkel | Text in Fehler-Karte (`tinte auf rotFlaeche`) | #E8E1D3 | #2F1D21 | 12.24 : 1 | 4.5 | ✔ |
| dunkel | Rot auf Fehler-Fläche (`siegelrotText auf rotFlaeche`) | #EF7068 | #2F1D21 | 5.45 : 1 | 4.5 | ✔ |
| dunkel | Grün auf Erfolgs-Fläche (`gruen auf gruenFlaeche`) | #5FAF86 | #1E3329 | 5.10 : 1 | 4.5 | ✔ |
| dunkel | Messing auf Messing-Fläche (`messingText auf messingFlaeche`) | #D4B062 | #3A3222 | 6.14 : 1 | 4.5 | ✔ |
| dunkel | Bedienelement-Rand (Nicht-Text 1.4.11) (`randStark auf karte`) | #6E7B87 | #1C252E | 3.58 : 1 | 3 | ✔ |
| dunkel | Fortschrittsring/Sterne auf Seite (`messingGrafik auf papier`) | #D4B062 | #141B22 | 8.42 : 1 | 3 | ✔ |
| dunkel | Roter Faden auf Pinnwand (`siegelrot auf kork`) | #E0574F | #3A3127 | 3.42 : 1 | 3 | ✔ |
| dunkel | Fokusring auf Seite (`fokus auf papier`) | #7FA9D6 | #141B22 | 7.07 : 1 | 3 | ✔ |
| dunkel | Gruppenmarke 1 (Zeitlupe) (`gruppe1 auf karte`) | #4F8FD6 | #1C252E | 4.60 : 1 | 3 | ✔ |
| dunkel | Gruppenmarke 2 (Zeitlupe) (`gruppe2 auf karte`) | #B08A35 | #1C252E | 4.83 : 1 | 3 | ✔ |
| dunkel | Gruppenmarke 3 (Zeitlupe) (`gruppe3 auf karte`) | #A874C0 | #1C252E | 4.38 : 1 | 3 | ✔ |
| dunkel | Heatmap: Wert in Stufe 3 (`heatTextHell auf heat3`) | #E8E1D3 | #3F6587 | 4.72 : 1 | 4.5 | ✔ |
| dunkel | Heatmap: Wert in Stufe 4 (`heatTextDunkel auf heat4`) | #141B22 | #6390BE | 5.18 : 1 | 4.5 | ✔ |
| dunkel | Konsolentext (`konsoleText auf konsole`) | #D8E3D0 | #0B0F13 | 14.49 : 1 | 4.5 | ✔ |
| dunkel | Zeilennummern/leise in Konsole (`konsoleLeise auf konsole`) | #8A9AA6 | #0B0F13 | 6.64 : 1 | 4.5 | ✔ |
| dunkel | SQL-Schlüsselwort (`kwSchl auf konsole`) | #F2A65A | #0B0F13 | 9.50 : 1 | 4.5 | ✔ |
| dunkel | SQL-Zeichenkette (`kwStr auf konsole`) | #9BD3A6 | #0B0F13 | 11.23 : 1 | 4.5 | ✔ |
| dunkel | SQL-Zahl (`kwZahl auf konsole`) | #8CC4FF | #0B0F13 | 10.49 : 1 | 4.5 | ✔ |
| dunkel | SQL-Kommentar (`kwKomm auf konsole`) | #7F8F99 | #0B0F13 | 5.76 : 1 | 4.5 | ✔ |

Zusätzlich geprüft: Heatmap-Stufen 1/2/5 (hell 11.41 / 8.20 / 9.19 : 1, dunkel 10.34 / 7.40 / 9.17 : 1).

---

## 4. Komponenten

Alle Komponenten sind im Prototyp unter **„Bausteine“** zu sehen. Klassen im Prototyp = Vorschlag für die
Plattform. Zustände: *Ruhe · Hover · Fokus · Aktiv/gewählt · Deaktiviert · Fehler* – wo nicht anders genannt gilt:
Hover = `--flaeche` hinterlegt, Fokus = 3 px `--fokus`-Ring mit 2 px Abstand, deaktiviert = 50 % Deckkraft +
`cursor: not-allowed`.

### 4.1 Aktendeckel-Karte (`.aktendeckel`)
Karte mit **Reiter** oben links (Plex Mono, versal: Aufgaben-ID `A2-E2-03`, „AKTE 2“). Reiter verschmilzt nahtlos
mit der Karte (gleiche Fläche, Rand ohne Unterkante). `--schatten-1`, Radius 0 oben links.
- Verwendung: Aufgabe, Akte-Detail, Akten in Listen.
- Zustände: gewählt = Reiter `--siegelrot-text`; gesperrt = Inhalt `--tinte-3`, Schloss-Icon im Reiter.

### 4.2 Stempel (`.stempel`)
Barlow Condensed 700, versal, `letter-spacing .1em`, Rahmen 2.5 px `currentColor` + innerer 1 px-Rahmen,
Rotation −4°. Größen: `klein` (12 px, in Listen), normal (16 px), `gross` (28 px, Feedback/Verhör).

| Stempel | Farbe | Einsatz |
|---|---|---|
| **GELÖST** | `--gruen` | Aufgabe gelöst, Ermittlung abgeschlossen, Bauplan alle Kriterien |
| **ANGESEHEN** | `--tinte-3` | Lösung angesehen (0 Punkte) |
| **ABI-RELEVANT** | `--siegelrot-text` | Aufgaben im Abitur-Format / Abi-Ecke |
| **KÜR** | `--messing-text` | Kür-Inhalte („nicht im Abitur“) |
| BESIEGT · 83 % | `--gruen` | Verhör gewonnen |
| IM VERHÖR | `--siegelrot-text` | laufendes Verhör |

Animation „aufstempeln“: Skalierung 1.9 → 0.94 → 1, Deckkraft 0 → 1, 420 ms, nur beim Erscheinen. Bei
`prefers-reduced-motion` ohne Skalierung.

### 4.3 Polaroid-Beweisstück (`.polaroid`)
Weißer Rahmen (auch im Dunkelmodus weiß – es ist ein Foto), unten breiter Rand mit Beschriftung (Condensed 600),
Reißzwecke (rot, radialer Verlauf), Rotation ±2.5°, `--schatten-2`. Bild: eigene SVG-Illustration auf `#20303F`.
- Zustände: gewonnen (voll) · offen (`.leer`: gestrichelter Rahmen `--tinte-3`, „?“, Name des Verhörs, keine Rotation).
- Beweisstücke: Fundbuch-Seite, Schloss-Code, Kassenbon, Vereinsausweis, Ermittlungsnetz, Steckbrief, Detektei-Lizenz.

### 4.4 Pinnwand + Fäden (`.pinnwand`)
Korkfläche (`--kork` + zwei Punktraster aus `radial-gradient`, innerer Rahmen als Holzleiste). Fäden als SVG-Linien
`--siegelrot`, 2 px (passend: 3 px), runde Enden, kleine Punkte an den Nadeln.
- Kleine Pinnwand (Stadtplan): Raster aus Polaroids, auf dem Handy waagerecht wischbar.
- Spurenbrett: siehe 5.5.

### 4.5 Karteikarte (`.karteikarte`)
Ein Datensatz als Karte: Plex Mono 13 px, rote Linie unter der Kopfzeile (wie echte Karteikarten), Kopf =
Primärschlüssel unterstrichen (`RadID 101`), darunter Attribut/Wert-Paare. Leichte Rotation (±0.8°), Reißzwecke.
`NULL` als `.null`. Zustände: ausgewählt (Rahmen 2 px `--siegelrot`), verworfen (Deckkraft .5).

### 4.6 Merkkasten „Ermittler-Notiz“ (`.notiz`)
`--blau-flaeche`, Icon `notiz` in `--blau`, Titel Condensed 600 versal `--blau`, Text `--t-s`. Für Merksätze,
Rezepte, Hinweise zur Notation. Kein Rahmen, kein Schatten. Tipps verwenden dieselbe Optik als `.feedback.hinweis`
mit Rahmen.

### 4.7 Fallen-Plakette (`.falle`)
Pille 24 px hoch, Plex Mono 600 12 px, `--siegelrot-text` auf `--rot-flaeche`, davor kleine Raute. Inhalt immer nur
die Nummer (`P2`); Kurztitel im `title`/Tooltip und in Listen daneben. In der dunklen Konsole: `#F5A39D` auf `#3A2226`.

### 4.8 Fortschrittsring (`.ring`)
SVG, Durchmesser 56 px (Kopfzeile 40 px, Stadtplan 60 px), Spur 6 px `--flaeche-2`, Wert `--messing-grafik` mit runden
Enden, Start oben, Zahl in der Mitte (Plex Mono 600). Akte geschlossen: zusätzlich grüner Haken-Badge oben rechts.
Animation des Werts 600 ms (reduziert: sofort).

### 4.9 Ranglisten-Zeile (`.rang-zeile`)
Raster: Platz (Condensed 700, Top 3 in `--messing-text`) · Anzeigename + Rang (Mono klein) · aktuelle Akte · Punkte
(Mono, tabellarisch). Zebra mit `--flaeche`. Eigene Zeile: Rahmen 2 px `--messing-grafik`, „(du)“. Mindesthöhe 44 px.
Auf dem Beamer-Board Schrift ×1.5.

### 4.10 Ermittlungskonsole (`.konsole`)
Immer dunkel, Radius 10 px, `--schatten-2`. Aufbau von oben nach unten:
1. **Kopf:** LED + „ERMITTLUNGSKONSOLE“ (Mono versal), rechts Datenbank-Chip „DB: StadtRad · Übungs-DB“.
2. **Editor** (links) + **Schema-Browser** (rechts, 220 px; unter 640 px Konsolenbreite darunter, max. 210 px hoch,
   scrollbar). Editor: Textarea mit Zeilennummern und Syntax-Overlay (Plex Mono 15 px, Zeilenhöhe 1.6), kein
   Zeilenumbruch (waagerecht scrollbar), wächst mit dem Inhalt (min. 190 px). Strg/Cmd+Enter = Ausführen, Tab = zwei
   Leerzeichen. Parser-Hinweise als **Randmarke** an der Zeilennummer (roter Punkt + Tooltip, `aria-describedby`).
3. **Schema-Browser:** Tabellen als aufklappbare Einträge mit Zeilenanzahl; Spalten mit PK unterstrichen, FK mit
   rotem `↑` und Ziel „→ Station“. Antippen fügt `Tabelle.Spalte` an der Cursorposition ein.
4. **Knopfleiste:** links **Ausführen** (rot, mit Tastenkürzel) und **Prüfen** (grün); rechts **Zeitlupe · Tipp ·
   Lösung**. Unter 640 px Konsolenbreite: Raster mit 2 großen + 3 kleinen Knöpfen, ohne Tastenkürzel.
5. **Ergebnis:** Kopfzeile „60 Zeilen · 3 Spalten · Kreuzprodukt 8 × 8 × 5 = 320“ + Laufzeit; darunter
   **Diagnose** (falls vorhanden) und die **Ergebnistabelle** (max. 300 Zeilen, Kopf klebt, max. 300 px hoch,
   scrollbar). Leerzustand: „Noch nichts ausgeführt. Schreib deine Abfrage und tippe auf „Ausführen“.“
   Kein Treffer: „Keine Zeile erfüllt alle Bedingungen.“
6. **Diagnose** (`.diagnose`): linker Balken 3 px rot (Fehler) bzw. blau (Hinweis, z. B. `AND_OR_MISCH`), je Zeile
   Fallen-Plakette + Text; bei P2 Links „Im Spurenbrett ansehen · In der Zeitlupe ansehen“.

Zustände: läuft (Ausführen zeigt Abbrechen-Knopf, nach 3 s automatischer Abbruch) · Fehler (SQLite-Meldung auf
Deutsch) · Ergebnis · Lösung angesehen (Editor bleibt editierbar, Stempel ANGESEHEN in der Aufgabe).

### 4.11 Knöpfe (`.knopf`)

| Variante | Aussehen | Einsatz |
|---|---|---|
| `primaer` | `--siegelrot` gefüllt, Text `--auf-akzent` | eine Hauptaktion je Bereich: Ausführen, Weiter ermitteln, Verhör abgeben |
| `gruen` | `--gruen` gefüllt | Prüfen, Nächste Aufgabe nach Lösung |
| Standard | `--karte`, Rand `--rand-stark` | Zeitlupe, Tipp, Antwort speichern |
| `leise` | ohne Rand | Lösung, Abbrechen, Abspielen, „Als Tabelle anzeigen“ |

- Mindesthöhe 44 px, Barlow 600 15 px, Icon 20 px links, Abstand 8 px.
- **Ausführen** · **Prüfen** · **Zeitlupe** · **Tipp** · **Lösung** haben feste Icons (`play`, `pruefen`, `zeitlupe`,
  `tipp`, `auge`) – überall gleich.
- „Lösung zeigen“ und „Verhör abgeben“ fragen **in der Seite** nach (Bestätigungsleiste `--messing-flaeche`), nie
  per `confirm()`.

### 4.12 Stufen-Sterne (`.sterne`)
★ / ★★ / ★★★ als SVG-Sterne 16 px in `--messing-grafik`, leere Sterne als Umriss `--rand-stark`. Daneben Punkte
(10/20/30). `aria-label="Stufe 2 von 3"`.

### 4.13 Tabellen (`table.daten`)
- Kopf: Plex Mono 600 13 px auf `--flaeche`; Zellen Barlow 15 px, tabellarische Ziffern, Zahlen rechtsbündig.
- **PK** im Kopf unterstrichen (2 px, Abstand 3 px), **FK** mit vorangestelltem `↑` in `--siegelrot-text`.
- **NULL** als `NULL` in Plex Mono kursiv, versal, `--tinte-3` – nie leer lassen.
- Kurzschreibweise in Fließtext: `Rad(RadID, Typ, Baujahr, ↑StationID, Status)` mit unterstrichenem PK (Mono).
- Breite Tabellen scrollen **in ihrem Container** (`overflow-x: auto`), nie die Seite.
- Zustände in Werkzeugen: verworfen (`.weg`: Deckkraft .55 + rote Durchstreichung), Gruppe (Farbmarke links +
  Trennlinie zwischen Gruppen), neu (kurzes Aufleuchten in `--messing-flaeche`).

### 4.14 ER-Elemente in Chen-Notation (EH §7)

| Element | Form | Details |
|---|---|---|
| Entitätstyp | Rechteck 160 × 60, Rand 2 px `--tinte` | Name Condensed 700 23 px, Singular, groß |
| Beziehungstyp | Raute (Breite 120–160), Rand 2 px | Name kursiv 18 px, lowerCamelCase (*leitet*, *verdaechtig*, *kennt*) |
| Attribut | Ellipse, Rand 1.5 px | 16.5 px; **Schlüsselattribut unterstrichen** + 600 |
| Kante | Linie 1.6 px `--tinte` | gerade; rekursiv: zwei Kanten vom selben Rechteck zu den seitlichen Raute-Ecken |
| Kardinalität | `1` / `n` / `m` (ternär `p`) | Plex Mono 600 19 px `--siegelrot-text` auf `--karte`-Plättchen, mittig auf der Kante zwischen Entitätstyp und Raute |

Zustände: Hover (Rand `--blau`) · gewählt (gestrichelter Auswahlrahmen `--siegelrot` + 4 Griffe) · Fokus
(durchgezogener `--fokus`-Rahmen) · fehlerhaft nach Prüfen (roter Kreis um die Kardinalität, Phase 5).
Hintergrund der Zeichenfläche: Karopapier (24 px-Raster in `--flaeche`).

### 4.15 Toast und Feedback
- **Toast** (`.toast`): unten rechts, `--tinte` auf … (invertiert), 3.2 s, `aria-live="polite"`. Nur für
  Bestätigungen („Antwort gespeichert.“, „Board-Link kopiert.“), nie für Fehler, die man lesen muss.
- **Feedback-Karte richtig** (`.feedback.richtig`): `--gruen-flaeche`, Rand `--gruen`; Titel „Sauber ermittelt“,
  ein Satz zur Story, Punkte (`+15 Punkte · 1 Fehlversuch`), **Erklärung erst jetzt** (Vertrag §9), großer Stempel
  GELÖST rechts (Handy: darunter, linksbündig), Knopf „Nächste Aufgabe“.
- **Feedback-Karte falsch** (`.feedback.falsch`): `--rot-flaeche`, Rand `--siegelrot`; Titel „Noch nicht“, Satz
  „Deine Abfrage liefert 60 Zeilen. Fehlversuch 1, die Aufgabe bringt jetzt noch 15 Punkte.“, Diagnoseliste mit
  Fallen-Plaketten, Aktionen „Im Spurenbrett ansehen“ / „In der Zeitlupe ansehen“. **Keine Lösungsdaten.**
- **Tipp** (`.feedback.hinweis`): „Tipp 1 von 2“, Text, Hinweis „Die Aufgabe bringt jetzt höchstens 11 Punkte.“

### 4.16 Weitere Bausteine
- **Schalter** (`.schalter`): 44 × 26 px, an = `--siegelrot`; Label links, immer echtes `<input type="checkbox">`.
- **Segment-Umschalter** (`.segment`): Zeichnen/Liste, eA/gA; gewählt = `--tinte` gefüllt, `aria-pressed`.
- **Steckbrief** (`.steckbrief`): „GESUCHT“ (Condensed 700, Sperrung .18em), Silhouette mit Nachtfalter, Felder
  Signatur/Zugang/Tatzeit/Wohnort …; unbekannte Felder als „· · ·“ in `--tinte-3` mit `aria-label="noch unbekannt"`.
- **Rangabzeichen**: Kreis `--messing-flaeche`, Rand `--messing-grafik`, Stern. Leiste mit Rangschwellen
  0 / 10 / 30 / 55 / 80 %.
- **Tooltip** (`.tooltip`): `--karte`, Rand `--rand-stark`, `--schatten-2`; Wert zuerst (Condensed 20 px), dann
  Kontext. Gleicher Inhalt bei Hover und Tastaturfokus; alles Gezeigte ist auch ohne Tooltip erreichbar (Zellwert,
  Tabellenansicht).

---

## 5. Screens

Allgemeiner Rahmen: **Kopfzeile** (60 px, klebt oben): Siegel-Logo + „DATENDETEKTEI / WESERSTEDT“ · Kurs · ⌂ Portal ·
Hell/Dunkel · Ich (Ring mit % + Anzeigename + Rang/Punkte). **Navigation:** ≥ 1180 px Seitenleiste (232 px), darunter
Reiterleiste unter der Kopfzeile (waagerecht wischbar), < 700 px Menü-Knopf mit aufklappender Liste. Inhalt max.
1320 px breit.

```
┌────────────────────────────────────────────────────────────────────────────┐
│ (◎) DATENDETEKTEI  Kurs Informatik LK 13 · eA        ⌂ Portal  ☾  (34) Jonas│
├──────────────┬─────────────────────────────────────────────────────────────┤
│ ERMITTELN    │  ETIKETT · KONTEXT                                          │
│ ▌Stadtplan   │  Screen-Titel                                               │
│  Ermittlung  │  Einleitung (max. 62 Zeichen breit)                         │
│  Zeitlupe    │  ┌──────────────── Inhalt ────────────────┐                 │
│  Spurenbrett │  │                                        │                 │
│  Bauplan     │  └────────────────────────────────────────┘                 │
│  Verhör      │                                                             │
│ LEHRKRAFT    │                                                             │
│  Auswertung  │                                                             │
└──────────────┴─────────────────────────────────────────────────────────────┘
```

### 5.1 Start / Stadtplan (`/`)
```
┌─────────────────────────────────────────────┐ ┌────────────────────┐
│ STADTPLAN (SVG, Akten-Stil)     BAHNHOFSV.  │ │ (★) Ermittler:in 214│
│  (1✓) Fundbüro ···☁(🔒5+7) Detektei         │ │ ███████░░░░ Ränge  │
│  ALTSTADT        ····(2) Hafenkante  HAFENV.│ ├────────────────────┤
│  ☁(🔒6) Rathaus  ~~~~ WESER ~~~~   ·····(3) │ │ GESUCHT  1/6       │
│  NORDHEIDE   LINDENHOF   Festplatz  ☁(🔒4)  │ │ [Silhouette] Felder│
│                          WESERUFER  Vereinsh│ │                    │
│ Legende: geschlossen · Ring · Nebel · Spur  │ ├────────────────────┤
└─────────────────────────────────────────────┘ │ AKTE 2 (Reiter)    │
 Pinnwand der Detektei            1/7           │ (58) Spur der Räder│
┌─────────────────────────────────────────────┐ │ 2.1 … [GELÖST]     │
│ [Polaroid] [?] [?] [?] [?] [?] [?]          │ │ 2.2 … ◆läuft       │
└─────────────────────────────────────────────┘ │ [Weiter ermitteln] │
                                                └────────────────────┘
```
- 6 Orte für 7 Akten (Namen und Stadtteile nach `docs/STORY.md` 2.1/2.2): Fundbüro (Altstadt, Akte 1), StadtRad-Station
  **Hafenkante** (Hafenviertel, 2), Festplatz (Weserufer, 3), Vereinsheim TuS (Mühlenfeld, 4), **Detektei** (Altstadt, 5
  und 7 – Schild „AKTE 5 + 7“, Generalprobe im Prüfungszimmer im Obergeschoss), Rathaus (Altstadt, 6). Stadtteil-Etiketten:
  Altstadt, Hafenviertel, Weserufer, Mühlenfeld, Nordheide, Lindenhof, Bahnhofsviertel (Deichkamp liegt außerhalb des Ausschnitts).
- Steckbrief: Hinweise je Akte nach STORY.md 4.x (nach Akte 1: Initialen „N. F.“, Signatur Nachtfalter, Zugang zu
  städtischen Datenbeständen); unbekannte Felder als „· · ·“.
- Ort: Teller + Fortschrittsring + Nummer, darunter Schild (Name + „AKTE 2 · 58 %“). Gesperrt: Schloss statt Zahl,
  gestrichelter Teller, **Nebelwolken** (weichgezeichnete Kreise `--nebel`) – Schilder bleiben lesbar.
- Roter gepunkteter Faden verbindet die bisher bearbeiteten Akten; Nachtfalter (Signatur des Phantoms) als Spur.
- Orte sind Knöpfe (Tab, Enter/Leertaste); Auswahl öffnet das Akte-Detail rechts (Tablet: über Rang/Steckbrief).
- Handy: Plan in eigenem Container waagerecht wischbar (min. 640 px), Pinnwand als waagerechte Leiste.

### 5.2 Akte-Übersicht (`/akte/:nr`)
```
┌ AKTE 2 ───────────────────────────────────────────────────────────────┐
│ (58) Spur der Räder · Hafenkante · Hafenviertel  Briefing (Edda, 3 Sätze)│
├───────────────────────────────┬───────────────────────────────────────┤
│ Ermittlung 2.1 Der rote Faden │ Ermittlung 2.2 Nachtfahrten           │
│ [GELÖST] 8/8 · 140/160 P.     │ 3/8 · ◆läuft · ★★ Mix                  │
│ Aufgaben 01 … 08 (Kacheln)    │ Aufgaben 01 … 08                      │
├───────────────────────────────┴───────────────────────────────────────┤
│ Verhör 2: Bürgerbus · bereit (ab 60 %) · 20 min   [Verhör beginnen]   │
│ Werkzeuge: Freie Ermittlung · Spurenbrett · Zeitlupe · Warm-up A2     │
└───────────────────────────────────────────────────────────────────────┘
```
Aufgabenkacheln 44 × 44 px: offen (Rand), gelöst (grün), aktuell (2 px rot), angesehen (grau + Auge).

### 5.3 Ermittlung (Aufgabe + Konsole) (`/ermittlung/:id`)
```
 AKTE 2 · SPUR DER RÄDER › ERMITTLUNG 2.2                  [01][02][03][04]…
 Nachtfahrten
┌ A2-E2-03 ─────────────────┐ ┌─ ● ERMITTLUNGSKONSOLE ──── DB: StadtRad ─┐
│ ★★☆ 20 Punkte [ABI-REL.]  │ │ 1 SELECT …               │ SCHEMA        │
│ ▌Briefing (2 Sätze)       │ │ 2 FROM …                 │ ▸ Station   3 │
│ Welche Lastenräder sind   │ │ 3 WHERE …                │ ▾ Rad       8 │
│ gerade ausgeliehen?       │ │                          │   RadID ↑Stat.│
│ Detail (Spalten)          │ ├──────────────────────────┴───────────────┤
│ ┌ ERMITTLER-NOTIZ ──────┐ │ │ [▶ Ausführen][✓ Prüfen]   [Zeitlupe][Tipp][Lösung]│
│ └───────────────────────┘ │ ├──────────────────────────────────────────┤
│ [Tipp 1 von 2]            │ │ 60 Zeilen · Kreuzprodukt 8×8×5 = 320      │
│ [Feedback-Karte]          │ │ ▌◆P2 Verbundbedingung fehlt …             │
└───────────────────────────┘ │ ┌ Ergebnistabelle ┐                       │
                              └──────────────────────────────────────────┘
```
- Desktop: Aufgabe 300–380 px | Konsole Rest. < 1100 px: Aufgabe über der Konsole.
- Interaktionen ohne Konsole (`zeilen`, `zellen`, `ergebnis`, `gaps` …) ersetzen die Konsole durch eine Karte
  gleicher Breite.
- Entwurf wird geräte-lokal gespeichert (`localStorage`, try/catch), nie auf dem Server.

### 5.4 Zeitlupe (`/werkzeug/zeitlupe`, auch aus Diagnose)
```
 [FROM 1][WHERE 2][GROUP BY 3][HAVING 4][SELECT 5][ORDER BY 6][LIMIT 7]   (Handy 4+3)
┌ SQL (dunkel) ───────────┐ ┌─────────────────────────────────────────────┐
│5 SELECT … (ausgegraut)  │ │  2      HAVING COUNT(*) >= 2                │
│1 FROM Bon               │ │ GRUPPEN Ganze Gruppen fallen weg …          │
│2 WHERE …                │ │ ■ Crêpes ■ Grill ■ Lose                     │
│▌4 HAVING … (aktiv)      │ │ ┌ Stand │ BonNr │ Zahlart │ Betrag ┐        │
│6 ORDER BY … (später)    │ │ │▌Crêpes│ 2     │ bar     │  4,50  │        │
├─────────────────────────┤ │ │▌Grill │ 1     │ bar     │ 12,50  │        │
│[‹ Zurück][Weiter ›] ▷   │ │ │▌Lose  │ 8 (durchgestrichen)      │        │
│ MERKSATZ WHERE/HAVING   │ │ └──────────────────────────────────┘        │
└─────────────────────────┘ └─────────────────────────────────────────────┘
```
- Links die Abfrage **in Schreibreihenfolge** mit Auswertungsnummer am Rand; aktive Klausel hervorgehoben (roter
  Balken), spätere halbtransparent.
- Rechts großer Zähler (Zeilen bzw. Gruppen), Klausel als Titel, ein Satz Erklärung, Zwischentabelle.
- Verworfene Zeilen bleiben sichtbar (grau, durchgestrichen) – der Unterschied ist die Lektion.
- Abspielen: 1.8 s je Schritt (reduziert: 2.6 s, ohne Übergänge); Pfeiltasten ← → bedienen die Schritte (Phase 4).
- Große Zwischentabellen: max. 50 Zeilen angezeigt, Zähler bleibt exakt („480 Zeilen, 50 angezeigt“).

### 5.5 Spurenbrett (`/werkzeug/spurenbrett`)
```
┌───────────────────────────────────────────────────────────────────────┐
│ (○─) WHERE Rad.StationID = Station.StationID          12 Fäden · 4 × 3│
└───────────────────────────────────────────────────────────────────────┘
┌ KORK ─────────────────────────────────────────────────────────────────┐
│ [Rad]                                              [Station]          │
│ ┌RadID 101┐ ╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱  ┌StationID 1┐           │
│ ┌RadID 103┐  (12 rote Fäden = Kreuzprodukt)    ┌StationID 2┐           │
│ ┌RadID 108┐                                    ┌StationID 3┐           │
│ ┌RadID 102 ↑StationID NULL┐                                           │
└───────────────────────────────────────────────────────────────────────┘
 nach dem Einschalten: Ergebnis des Verbunds (3 Zeilen) | Ermittler-Notiz zu NULL
```
- Fäden: Start rechts an der Rad-Karte, Ende links an der Station, Endpunkte leicht versetzt, damit sich Fäden
  unterscheiden. Bedingung an: unpassende Fäden **fallen ab** (nach unten + leichte Drehung + Ausblenden, 900 ms);
  passende werden 3 px dick. Reduzierte Bewegung: nur Ausblenden.
- Zähler: „12 Fäden · 4 × 3 Kombinationen“ → „3 von 12 Fäden halten · Rad 102 hängt an keinem“ (in der Plattform
  allgemein: „12 × 40 = 480 Fäden → 40 bleiben“).
- In der Plattform zusätzlich: freie Bedingung eingeben, dritte Tabelle (max. 3), Block in Aufgaben.

### 5.6 Sortierfächer (`/werkzeug/sortierfaecher`)
```
 Abfrage (dunkel, Klausel hervorgehoben)                      [‹][›] ▷
┌ WHERE-Korb ──────────┐   ┌ Fach Crêpes ┐ ┌ Fach Grill ┐ ┌ Fach Lose ┐
│ ✗ Bon 3 (Karte)      │   │ Bon 2  4,50 │ │ Bon 1 12,50│ │ Bon 8 2,00│
│ ✗ Bon 4 (Karte)  …   │   │ Bon 6  9,00 │ │ Bon 7  8,00│ │           │
└──────────────────────┘   │─────────────│ │ Bon 10 6,50│ │ HAVING ✗  │
                           │ COUNT 2     │ │ COUNT 3    │ │ (grau)    │
                           │ SUM 13,50   │ │ SUM 27,00  │ │           │
                           └─────────────┘ └────────────┘ └───────────┘
```
- Karteikarten fallen in Fächer (Kopf in Gruppenfarbe + Name). WHERE entfernt Karten **vorher** (roter Korb links),
  HAVING graut **ganze Fächer** nachher aus. Je Fach Aggregatzeile (Mono). Umschalter COUNT(*) ↔ SUM(Menge) zeigt P4.
- Handy: Fächer untereinander, WHERE-Korb eingeklappt mit Zähler.

### 5.7 Bauplan-Tisch (`/werkzeug/bauplan`, Interaktion `er`)
```
 AKTE 5 · DER BAUPLAN › A5-E2-04 ★★★                     [✎ Zeichnen|☰ Liste]
 Anforderungstext (3–5 Sätze)
[+Entitätstyp][+Beziehungstyp][+Attribut][⊶ Verbinden]           [✓ Prüfen]
┌ Karopapier ─────────────────────────────────────────┐ ┌ EIGENSCHAFTEN ───┐
│ (ErmittlerNr)(Name)    (FallNr)(Titel)  (PersonNr)… │ │ Beziehungstyp ·  │
│ [Ermittler]─1─<leitet>─n─[Fall]─m─<verdaechtig>─n─[Person]│ rekursiv        │
│ (Dienstgrad)           (Status)  (Grad)    n╲  ╱1   │ │ Name [kennt]     │
│                                         ┌<kennt>┐   │ │ Kard. links  [n] │
└─────────────────────────────────────────────────────┘ │ Kard. rechts [1] │
                                                        ├ PRÜFERGEBNIS 4/6 ┤
                                                        │ ✔ … ✘ … ◆P9      │
                                                        └──────────────────┘
```
- **Zeichenmodus:** Elemente antippen → Auswahlrahmen + Seitenpanel (Name, Attribute mit Schlüssel-Häkchen,
  Kardinalität je Ende als Auswahl 1/n/m). Ziehen/Zoomen per Pointer Events (Phase 5). Tastatur: Tab durch
  Elemente, Enter wählt, Pfeiltasten verschieben (Phase 5).
- **Listenmodus:** dieselben Daten als Formular-Karten (je Entitätstyp: Attribute + Schlüssel; je Beziehungstyp:
  Enden + Kardinalität + Attribute). Barrierearm, iPad-tauglich. Erzeugt dasselbe JSON.
- **Prüfen:** Kriterienliste wie ein Erwartungshorizont: ✔ grün / ✘ rot + Fallen-Plakette, Zähler „4 von 6“; alle
  Pflichtkriterien → Stempel GELÖST.
- Handy: Zeichenfläche waagerecht wischbar (min. 620 px) + Hinweis auf den Listenmodus.

### 5.8 Schema-Werkbank (`/werkzeug/werkbank`, Interaktion `schema`)
```
┌ Relation Ermittler ───────┐   ┌ Relation Fall ─────────────────┐
│ ErmittlerNr  [PK✓] [FK ]  │   │ FallNr [PK✓]                   │
│ Name                      │   │ Titel                          │
│ MentorNr     [FK→Ermittler]│◄──│ LeiterNr [FK→ Ermittler ▾]     │
└───────────────────────────┘   └────────────────────────────────┘
 Vorschau Kurzschreibweise:  Fall(FallNr, Titel, ↑LeiterNr)          [✓ Prüfen]
 Teilfeedback je Relation:   Fall ✔ · kennt ✘ „zusammengesetzter Schlüssel fehlt“ ◆P9
```
- Relationen als Karteikarten; Attribut antippen schaltet PK (Unterstreichung) / FK (↑ + Zielauswahl, Pfeil zur
  Zielrelation als roter Faden). Live-Vorschau in Kurzschreibweise (Mono).
- Startzustand optional aus ER generiert („nur Schlüssel setzen“).

### 5.9 Verhör (Timer) (`/verhoer/:akte`)
```
┌ (dunkles Kopfband) VERHÖR 2 · AKTE 2 · AUFGABE 3 VON 6        (◔) 17:42 ┐
├─────────────────────────────────────────────────────┬───────────────────┤
│ Kontext (gesiezt)                                   │ [IM VERHÖR]       │
│ ┌ Schema in Kurzschreibweise ┐                      │ AUFGABEN          │
│ Entwerfen Sie … [4 BE]                              │ [1][2][3][4][5][6]│
│ ┌ Editor (dunkel, ohne Ausführen/Prüfen) ┐          │ kein Feedback …   │
│ [Antwort speichern] [Nächste Aufgabe ›]             │ [Verhör abgeben]  │
└─────────────────────────────────────────────────────┴───────────────────┘
 Ende:  [BESIEGT · 83 %]  „Das Verhör ist gewonnen.“  25 von 30 BE · ◆P2 …  [Polaroid]
```
- Nüchtern: keine Story-Illustration im Kampf, Operator fett, `[x BE]` in Mono. Kein Ausführen/Prüfen (Abimodus
  `streng`), Speichern ohne Rückmeldung zum Inhalt.
- Timer: Ring + mm:ss (Mono 28 px), unter 5 min rot; Zeit läuft serverseitig, der Client zeigt nur an.
  `role="timer"`, Ansage nur bei 5 min und 1 min (`aria-live`), nicht jede Sekunde.
- Ende: Stempel BESIEGT/NICHT BESIEGT + Prozent, BE, Fallen der Fehlversuche, Polaroid des Beweisstücks
  (nur bei Sieg), Knöpfe „Zur Pinnwand“, „Aufgaben ansehen“. Ab hier wieder geduzt.

### 5.10 Pinnwand / Steckbrief (`/pinnwand`)
```
┌ KORK ───────────────────────────────────────────────────┬ GESUCHT ───────┐
│ [Fundbuch-Seite]──faden──[Schloss-Code]──[Kassenbon]    │ [Silhouette]   │
│        ╲                     ╱                          │ Signatur …     │
│       [Vereinsausweis]   [?]      [?]                    │ Zugang …       │
│ Fäden verbinden Beweisstücke mit Steckbrief-Feldern     │ Tatzeit · · ·  │
└─────────────────────────────────────────────────────────┴────────────────┘
```
Polaroid antippen → Karte mit Story-Text (2–3 Sätze) und der Erkenntnis für den Steckbrief. Nach Akte 6:
Auflösung, Steckbrief-Stempel „ENTTARNT“ und Überleitung zur Erörterung.

### 5.11 Lehrkraft-Auswertung (`/lehrkraft`)
```
 LEHRKRAFT · KURS INFORMATIK LK 13      14 Schüler:innen · 58 % Ø · 12/14 V1 besiegt
┌ Lernstand je Ermittlung ─────────────────────────────┐ ┌ Einstellungen ──────┐
│ Legende: ┄ nicht begonnen  ▁▂▃▄▅ 0→100 %              │ │ Niveau [eA|gA]      │
│           E1.1 E1.2 V1  E2.1 E2.2 V2  E3.1            │ │ Akten freischalten  │
│ Lena K.   ▅80  ▅87 ▅86✓ ▅94  ▃42 ▄72✓ ▂29             │ │  Akte 1 … 7 (○─)    │
│ Jonas M.  …                                          │ │ Verhöre [auto ▾]    │
└──────────────────────────────────────────────────────┘ │ Scoreboard (○─)     │
┌ Fallen-Profil des Kurses ────────────────────────────┐ │ Beamer-Board (○─)   │
│ P1 WHERE ↔ HAVING      ██ 4                          │ │ [Board-Link kopieren]│
│ P2 Verbund fehlt …     ████████████████ 31           │ └─────────────────────┘
│ …  P8 Schlüssel …      | Akte gesperrt               │
│ 0      10      20      30      40   [Als Tabelle]    │
└──────────────────────────────────────────────────────┘
```
- **Matrix:** Zeilen = Anzeigenamen, Spalten = Ermittlungen + Verhöre (Verhöre rot beschriftet, ✓ = besiegt).
  Zellen 52 × 36 px, Heatmap-Stufen + Wert; Namensspalte klebt beim waagerechten Scrollen. Tooltip/Fokus: Wert,
  Fehlversuche, Tipps. Klick auf Zelle → Detail der Aufgaben (Phase 6).
- **Fallen-Profil:** waagerechte Balken P1–P10 in fester Reihenfolge, Balken ≤ 24 px, 4 px runde Enden, Wert am
  Balkenende, eine Achse mit runden Ticks, gesperrte Akten als „Akte gesperrt“ statt 0. Tabellenansicht zum Aufklappen.
- **Einstellungen:** Niveau eA/gA (gA blendet Akte 5 aus: Zeile ausgegraut, Schalter deaktiviert, „bei gA
  ausgeblendet“), Akten-Schalter, Verhöre automatisch ab 60 % / offen / gesperrt, Scoreboard, Beamer-Board, Board-Link.
- Weitere Reiter (Phase 6): Aufgabenstatistik, häufige Fehlabfragen (anonym), Vorschau, Live, Urkunden, Materialien.

### 5.12 Beamer-Board (`/board/:schluessel`, 1920 × 1080)
```
┌ (◎) DATENDETEKTEI · Informatik LK 13 ───────────────────────── 10:42 ┐
│ RANGLISTE (Top 15)                 │ AKTEN-FORTSCHRITT DES KURSES      │
│ 1  Aylin T.   Kommissar:in  388    │ (1)92 %  (2)61 %  (3)14 %  🔒🔒🔒  │
│ 2  Clara B.   Kommissar:in  361    ├───────────────────────────────────┤
│ …                                  │ LETZTE ERFOLGE                    │
│ 15 …                               │ [GELÖST] Mira H. · A2-E2-05 ★★★   │
│                                    │ [BESIEGT] Ben S. · Verhör 1       │
└────────────────────────────────────┴───────────────────────────────────┘
```
Immer Dunkelmodus (Beamer-Kontrast), Grundschrift 28 px, Ranglisten-Zeilen 56 px, keine Bedienelemente,
Aktualisierung alle 20 s mit weichem Einblenden neuer Erfolge (reduziert: ohne). Nur Anzeigenamen.

### 5.13 Gast (`/gast`)
```
┌ Banner (messing-flaeche): PROBEFALL „EISDIELE WESERSTEDT“ · nichts wird gespeichert ┐
 Stadtplan-Ausschnitt mit EINEM Ort (Eisdiele) · 6 Demo-Aufgaben als Aufgabenkacheln
 Ermittlung wie 5.3 (Konsole + Zeitlupe auf DB Eisdiele) · Lehrkraft-Demo (erfundener Kurs)
 [Mit dem Portal anmelden]  [Themenübersicht]
```
Gleiche Komponenten, Kopfzeile ohne „Ich“, stattdessen Knopf „Anmelden“. Nie echte Aufgaben oder Lösungen.

---

## 6. Responsive

| Stufe | Breite | Navigation | Layout-Regeln |
|---|---|---|---|
| **Beamer** | ≥ 1700 px (Ziel 1920) | Seitenleiste | `html` 18 px; Inhalt max. 1320 px zentriert; Tabellen/ER skalieren mit; Fokus auf Lesbarkeit aus 8 m |
| **Laptop** | 1180–1699 px | Seitenleiste 232 px | zweispaltige Screens (Aufgabe \| Konsole, Plan \| Seitenspalte) |
| **iPad quer** | 1024 px | Reiterleiste | Aufgabe über Konsole; Stadtplan voll breit, Seitenspalte als 2er-Raster |
| **iPad hoch** | 768 px | Reiterleiste | einspaltig; Schema-Browser unter dem Editor; Matrix scrollt im Container |
| **Handy** | 375 px | Menü-Knopf | **16 px Seitenrand**, einspaltig; Plan/ER/Matrix/Tabellen scrollen in eigenen Containern |

- **Kein horizontales Scrollen der Seite** bei keiner Breite. Nur Tabellen, Diagramme und Code dürfen breiter sein,
  jeweils in einem eigenen `overflow-x: auto`-Container. Flex/Grid-Kinder mit Text/Code/Tabellen bekommen `min-width: 0`.
- Die Konsole nutzt **Container-Queries** (`container-type: inline-size`), nicht Viewport-Breakpoints – sie steckt
  je nach Seite in unterschiedlich breiten Spalten.
- Klebende Elemente: Kopfzeile `top: env(safe-area-inset-top)`; Reiterleiste darunter.
- **Touch-Ziele ≥ 44 × 44 px** (Knöpfe, Kacheln, Schalter, Schema-Spalten 44 px hoch,
  ER-Elemente groß genug). Hover ist nie die einzige Möglichkeit.
- Getestet im Prototyp (Playwright): 1440 × 900, 1024 × 768, 375 × 812, hell und dunkel, ohne Seiten-Überlauf und
  ohne Konsolenfehler.

---

## 7. Fokus, Barrierefreiheit, Bewegung

- **Fokus:** `:focus-visible` = 3 px `--fokus`, 2 px Abstand; in SVG (Stadtplan, ER) eigener Fokusrahmen. Nie
  `outline: none` ohne Ersatz.
- **Tastatur:** alle Werkzeuge bedienbar (Stadtplan-Orte, ER-Elemente: Tab/Enter; Zeitlupe: Knöpfe, später ←/→;
  Spurenbrett: echter Schalter). Konsole: Strg/Cmd+Enter, Tab rückt ein (Esc, dann Tab verlässt den Editor).
- **Semantik:** echte `<button>`, `<a>`, `<input>`; `aria-current="page"` für Navigation, `aria-current="step"` für
  Aufgaben/Zeitlupe, `aria-pressed` für Segmente, `aria-live="polite"` für Ergebnis, Zähler, Toasts.
- **Nie nur Farbe:** Status immer mit Text/Icon (Stempel, ✔/✘, Plakette), Gruppen mit Namen, Heatmap mit Wert.
- **Bewegungsrichtlinien:**
  - Dauer 200–420 ms (`--dauer: 220ms`, Kurve `cubic-bezier(.2,.7,.2,1)`), Ausnahme Fäden 900 ms.
  - Bewegung erklärt etwas (Faden fällt = Kombination verworfen; Zeile grau = gefiltert; Stempel = abgeschlossen).
  - Höchstens **ein** orchestrierter Moment pro Aktion; keine Dauer-Animationen, kein Wackeln, kein Konfetti.
  - **`prefers-reduced-motion: reduce`**: alle Übergänge/Animationen ≈ 0 ms; Fäden blenden nur aus; Zeitlupe
    springt; Stempel erscheint ohne Skalierung; Abspielen langsamer.
- Seite ist **im Ruhezustand vollständig**: nichts startet unsichtbar und wartet auf Scroll-Ereignisse.

---

## 8. Ikonografie

- **Eigene SVG-Icons** als Sprite `public/static/img/icons.svg` (`<symbol>` + `<use href>`), 24 × 24-Raster, Strich
  1.8 px, runde Enden, `stroke="currentColor"`, keine Füllung (Ausnahme Stern). **Keine Icon-CDNs, keine
  Icon-Fonts.**
- Satz (Prototyp): `plan` (Stadtplan), `ermittlung` (Lupe), `zeitlupe` (Sanduhr), `faden` (Spurenbrett), `bauplan`
  (Chen-Miniatur), `verhoer` (Verhörlampe), `lehrkraft` (Matrix), `bausteine`, `haus` (⌂ Portal), `mond`, `menue`,
  `play`, `pause`, `pruefen` (Haken im schrägen Stempel), `tipp` (Glühbirne), `auge` (Lösung), `schloss`,
  `zurueck`, `vor`, `notiz`, `falter` (Signatur des Phantoms), `stern`, `kopieren`, `plus`, `liste`, `stift`,
  `verbinden`.
- Icons stehen neben Text; reine Icon-Knöpfe haben `aria-label` und `title`.
- Logo: Siegel (doppelter roter Ring) mit Lupe in Tinte; Favicon = Siegel ohne Innenring (`/static/favicon.svg`).
- Illustrationen (Stadtplan, Beweisstücke, Steckbrief) als eigene SVGs im gleichen Stil: flache Flächen aus den
  Tokens, keine Verläufe außer der Reißzwecke, Text in den Plattformschriften.

---

## 9. Texte und Mikrotexte

- Schüler werden **geduzt**, kurz und aktiv. Verhöre, Generalprobe, Klausur, Abi-Ecken **gesiezt** mit Operator
  (fett) und `[x BE]`.
- Begriffe nach Vertrag: Kurs, Kurscode, persönlicher Code, Lehrkraft, Warm-up, Team. **Keine „XP“** – es heißt
  Punkte. Fachbegriffe nach EH: Entitätstyp, Beziehungstyp, Schlüsselattribut, Kardinalität, Verbund, Datensatz.
- Knöpfe sagen, was passiert: „Ausführen“, „Prüfen“, „Lösung zeigen“, „Verhör abgeben“, „Board-Link kopieren“.
  Bestätigung danach im gleichen Wortlaut („Board-Link kopiert.“).
- Fehler erklären Ursache **und** Weg, ohne Entschuldigung und ohne Lösung zu verraten.

**Diagnosemeldungen (Muster, immer mit P-Nummer, wo zutreffend):**

| Code | Meldung |
|---|---|
| `KEIN_VERBUND` | „480 Zeilen = 12 × 40 → Verbundbedingung fehlt (P2)“ · im Detail: „Kunde ist mit keiner anderen Tabelle verbunden. FROM allein ergibt 8 × 8 × 5 = 320 Kombinationen.“ |
| Vervielfachung | „Deine Summe ist 3-mal so groß wie erwartet. Der Verbund über Bon, Position und Schicht vervielfacht Zeilen (P2).“ |
| `NULL_VERGLEICH` | „`Ende = NULL` ist nie wahr: Mit NULL vergleichst du nur über `IS NULL` (P5).“ |
| Text ohne Hochkommata | „Die Spalte Lastenrad gibt es nicht. Text gehört in Hochkommata: `'Lastenrad'` (P5).“ |
| `MEHRDEUTIG` | „Die Spalte RadID gibt es in mehreren Tabellen (Rad, Ausleihe). Schreib das Tabellenpräfix davor, z. B. `Rad.RadID` (P7).“ |
| `GB_REGEL` | „`Name` steht im SELECT, ist aber weder aggregiert noch in GROUP BY (P3).“ |
| `HAVING_OHNE_AGG` | „`HAVING Zahlart = 'bar'` prüft einzelne Zeilen – das gehört ins WHERE (P1).“ |
| `WHERE_MIT_AGG` | „`COUNT(*)` im WHERE geht nicht: WHERE filtert vor dem Gruppieren. Nimm HAVING (P1).“ |
| COUNT ↔ SUM | „Gefragt ist die Anzahl verkaufter Tickets, nicht die Anzahl der Käufe: SUM(Anzahl) statt COUNT(*) (P4).“ |
| `AND_OR_MISCH` (Hinweis) | „AND bindet stärker als OR. Setz Klammern, damit klar ist, was zusammengehört (P6).“ |
| Grenze | „Deine Abfrage passt nur zufällig: Auf einer Prüf-Datenbank fehlt ein Wert genau auf der Grenze. `>` oder `>=`? (P6)“ |
| Zufallstreffer | „Stimmt auf der Übungs-DB, aber nicht auf einer Prüf-DB. Denk an Gleichnamige, NULL und Grenzwerte.“ |
| Reihenfolge | „Alle Zeilen stimmen, nur die Reihenfolge nicht. Prüf dein ORDER BY.“ |
| Spalten | „Deine Abfrage liefert 4 Spalten, gefragt sind 3: RadID, Typ, Nachname.“ |
| `JOIN_ON` | „JOIN … ON kommt im Abitur nicht vor. Schreib den Verbund mit FROM … WHERE.“ |
| `UNGLEICH_ALT` | „Im Abitur schreibst du „ungleich“ als `!=`.“ |
| `UNTERABFRAGE` | „Verschachtelte Abfragen kommen im Abitur nicht vor.“ |
| SQLite `no such column` | „Die Spalte X gibt es nicht – Tippfehler oder fehlendes Tabellenpräfix?“ |
| ER (P9) | „✘ Kardinalität bei kennt: Eine Person kennt viele Personen und wird von vielen gekannt (P9).“ |

Weitere Mikrotexte: Leerzustand Konsole „Noch nichts ausgeführt. Schreib deine Abfrage und tippe auf „Ausführen“.“ ·
Gesperrte Akte „Diese Akte liegt noch im Nebel. Deine Lehrkraft schaltet sie frei, sobald ihr so weit seid.“ ·
Lösung „Lösung zeigen? Die Aufgabe bringt dann keine Punkte mehr.“ · Verhör „Während des Verhörs gibt es kein
Feedback. Der beste Versuch zählt, ein neuer ist nach 12 Stunden möglich.“ · Erfolg „Sauber ermittelt“ · Misserfolg
„Noch nicht“.

---

## 10. Technische Vorgaben

- **Keine Inline-Skripte und keine Inline-Styles** (CSP `script-src 'self' 'wasm-unsafe-eval'`, kein
  `unsafe-inline`): keine `style="…"`-Attribute, keine `on…`-Handler, kein `<script>` mit Inhalt. Dynamische Werte
  (Ringwert, Balkenbreite, Fadenkoordinaten) über **SVG-Attribute** (`stroke-dashoffset`, `x1`) oder
  `element.style.setProperty('--wert', …)` aus Modulen (CSSOM ist von der CSP nicht betroffen). Der Prototyp nutzt
  der Kürze halber Inline-Styles und ein Inline-Skript – das gilt **nicht** für die Plattform.
- **Ausgaben als Textknoten** (`textContent`, `createElement`); `innerHTML` nur für statische, eigene Vorlagen ohne
  Nutzerdaten.
- **CSS-Struktur:** `tokens.css` (nur Custom Properties, hell + dunkel) · `basis.css` (Reset, Typografie, Rahmen) ·
  `komponenten.css` · je Werkzeug eine Datei (`konsole.css`, `zeitlupe.css`, `spurenbrett.css`, `bauplan.css` …).
  Keine Farbliterale außerhalb von `tokens.css` (Prüfskript in Phase 1: Regex auf `#[0-9a-f]{3,8}` außerhalb).
- **Dunkelmodus:** helle Werte auf `:root`; dunkle Werte in
  `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { … } }` **und** in
  `:root[data-theme="dark"] { … }` (gleiche Werte), jeweils mit `color-scheme: dark`. Umschalter in der Kopfzeile
  setzt `data-theme` und merkt die Wahl in `localStorage` (try/catch). `body` setzt immer `background: var(--papier)`.
- Konsole und Beamer-Board sind in beiden Themes dunkel (eigene Tokens), Polaroid-Rahmen ist immer weiß.
- **Schriften:** woff2 selbst gehostet, `font-display: swap`, Fallback-Stacks wie in 2.7.
- **SVG:** Farben über Klassen und Tokens, jede Form mit expliziter Füllung; Text in SVG in den Plattformschriften;
  `viewBox` mit Rand für äußere Beschriftungen.
- **Prototyp-Abweichungen** (bewusst): Google Fonts, Inline-Skript/-Styles, Mini-Auswertung statt sql.js, Beispieldaten
  im Skript (StadtRad-Auszug mit Stationen Hafenkante/Bahnhof/Marktplatz und Kundenkonto 77 „Nora Falter“, Jahrgang 1988,
  Hafenviertel, Tarif Plus – konsistent mit STORY.md Anhang A, aber nur ein Ausschnitt der echten Übungs-DB). Alles andere (Tokens, Klassen, Maße, Texte) ist übernehmbar.

---

## 11. Offene Designfragen

1. **Edda Lorenz als Figur:** Briefings bisher nur als Text mit rotem Rand. Porträt-Illustration (Akten-Stil) für
   Lab-Intro und Videos gewünscht?
2. **Stadtplan auf dem Handy:** waagerecht wischbar mit automatischem Sprung zur aktuellen Akte (jetzt) oder
   zusätzlich eine Aktenliste unter dem Plan?
3. **Heatmap-Werte:** Zahlen in jeder Zelle (jetzt, gut für Lehrkräfte) oder nur Farbe + Tooltip mit Umschalter
   „Werte zeigen“ (Datenschutz: Matrix nie auf den Beamer)?
4. **Beamer-Board** immer dunkel (Vorschlag) oder dem Theme folgend?
5. **Akte 7 am Detektei-Gebäude:** Prototyp folgt dem STORY.md-Vorschlag (ein Ort, Schild „AKTE 5 + 7“). Alternative:
   zweiter Fortschrittsring am selben Gebäude, sobald Akte 7 freigeschaltet ist – oder ein eigener Ort. Bei gA (ohne
   Akte 5) zeigt das Schild nur „AKTE 7“.
6. **Steckbrief-Zeitpunkt:** Der Hinweis einer Akte erscheint nach STORY.md, sobald die Schlüssel-Aufgabe gelöst **oder**
   die nächste Akte freigeschaltet ist. Im Prototyp (Akte 3 schon frei, 2.2 noch offen) zeigt der Steckbrief bewusst nur
   die Hinweise aus Akte 1, damit er das Ergebnis von 2.2 („Nora Falter“) nicht vorwegnimmt – Regel bitte bestätigen
   oder anpassen („nächste Akte abgeschlossen“ statt „freigeschaltet“).
7. **Kontrast-Prüfskript** als `scripts/kontrast_pruefen.js` in die CI aufnehmen (Vorschlag) – dann braucht es einen
   Eintrag in Spec 7.1 (keine neue Abhängigkeit, reines Node).
