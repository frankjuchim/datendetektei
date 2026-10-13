# Materialien – Design-Modul, Zuordnung, Pipeline, Prüfwerkzeuge

| | |
|---|---|
| **Bezug** | Spec §6, §11, §12 (12.1 Ordner, 12.2 Pipeline, 12.3 SQL-Prüfung, 12.4 Zugriff), §13; Plan Phase 7 Task 1 |
| **Stand** | 2026-10-13 · Phase 7 Task 1 |
| **Vorlagen** | `materialien/_Muster/` (erzeugt von `quellen/material/muster.py`) – jeder Baustein einmal |

Die docx/pptx in `materialien/` sind **maßgeblich**. Erstellungsskripte (`quellen/material/akte<n>.py`) sind nur
Erstellungshilfen; danach wird direkt im Dokument gepflegt (Word/PowerPoint/LibreOffice) und die PDFs werden neu
erzeugt.

## 1 Design-Modul `werkzeuge/akten_design.py`

Akten-Noir light (DESIGN.md §2, §4) für Word und PowerPoint. Farben als Konstanten (`TINTE`, `PAPIER`, `KARTE`,
`SIEGELROT`, `MESSING`, `GRUEN`, `BLAU`, … und dunkel `D_*`), Akten-Stammdaten in `AKTEN[n]` (`titel`, `ordner`,
`stempel`, `farbe`, `db`; außerdem `0` = Gesamt, `"K"` = Kür).

**Schriften** wie die Plattform (SIL OFL 1.1): Barlow (Fließtext), Barlow Condensed SemiBold/Bold (Überschriften,
Stempel), IBM Plex Mono (SQL, Etiketten, Tabellenköpfe) – als TTF in `werkzeuge/fonts/` (aus `google/fonts`, dieselben
Familien wie die woff2-Subsets der Plattform). Die Pipeline installiert sie für LibreOffice nach
`~/.local/share/fonts/datendetektei`; zum Bearbeiten in Word die TTF einmal installieren. Barlow hat kein ↑ und kein ★:
↑ steht automatisch in Plex Mono, ★ in „Segoe UI Symbol“ (LibreOffice ersetzt sie unter Linux automatisch).

**ER-Diagramme:** eigene Zeichnung mit Pillow (`er_png`), Geometrie 1:1 wie `public/static/js/bauplan/chen.js`
(gleiches `{graph, layout}`-Format wie Block `er` in den Akten, Rechteck 160 × 60, Raute, Ellipsen, Kardinalitäts-
plättchen, Rollen bei rekursiven Beziehungen). Grund: robust ohne Browser, identisch in docx und pptx, Layouts aus
`seed/akten` direkt wiederverwendbar. (Für Videos mit Werkzeug-Screenshots bleibt der Playwright-Renderer, Task 10.)

### 1.1 Inhalte (für docx und pptx gleich)

| Baustein | Signatur | Wirkung |
|---|---|---|
| Text | `"… **fett** *kursiv* `Code` <u>PK</u> ↑FK ★★"` | Absatz mit Mini-Auszeichnung |
| SQL | `SQL(text, db=None, pruefung="ja"\|"fehlerhaft"\|"aus", kuer=False)` | Absatzformat „SQL-Code“ (pptx: Textfeld „SQL“) |
| Tabelle | `Tabelle(kopf, zeilen, ergebnis=False, pk=(), fk=(), breiten=None, abgeschnitten=False, groesse=9)` | Daten-/Ergebnistabelle; PK im Kopf unterstrichen, FK mit ↑ |
| Ergebnis | `Ergebnis(kopf, zeilen, abgeschnitten=False, breiten=None)` | Tabellenformat „Ergebnistabelle“ (wird geprüft) |
| Schema | `Schema("Ausleihe(<u>AusleihID</u>, ↑RadID, Start)")` | Kurzschreibweise EH §7 |
| Liste | `Liste(punkte, nummeriert=False)` | Aufzählung |
| Bild | `Bild(pfad, breite_cm=8)` | Grafik |
| ER | `ER(graph, layout, breite_cm=None, markiert=())` | Chen-Diagramm |
| Linien | `Linien(anzahl=3)` | Schreiblinien, nur Schülerfassung |
| Loesung | `Loesung(*inhalt, fehler=[("P6", "…")], varianten=[SQL(...)])` | nur Lösungsfassung (grüner Kasten „LÖSUNG“, „Auch richtig“, „Typische Fehler“ mit P-Nummer) |
| Notiz | `Notiz(titel, *inhalt)` | Merkkasten „Ermittler-Notiz“ |
| Auftrag | `Auftrag(nr, stufe, ort, text, kompetenzen=(), inhalt=(), linien=0, loesung=None)` | Zeile der Ermittlungsaufträge (stufe 1–3, ort `PAPIER`/`LAB`) |
| Bewertung | `Bewertung(teil, inhalt, afb=(I, II, III))` | Zeile des Bewertungsbogens (BE = Summe) |

### 1.2 Word: `AktenDokument`

```python
AktenDokument(art, akte, titel, *, fassung="schueler"|"loesung"|"lehrkraft", ermittlung=None, ds=None, material=None,
              datenbank=None, kuer=False, untertitel=None, querformat=False, stempel=None)
```
A4, Ränder 2,0/1,6 cm, Kopfzeile „DATENDETEKTEI WESERSTEDT · AKTE n · …“, Fußzeile mit Kennung, Seitenzahl und – in
Lösungs-/Lehrkraftfassung – **„NUR LEHRKRAFT“** (Marker für die Prüfung der Schülerfassungen). Eine Bau-Funktion mit
dem Parameter `fassung` erzeugt Arbeitsblatt **und** Lösung (siehe `quellen/material/muster.py`).

| Methode | Zweck |
|---|---|
| `kopfband(name_datum=True)` | „AKTE n · ERMITTLUNG n.k · DS x“ + Titel + Name/Datum (bzw. „LÖSUNG · NUR LEHRKRAFT“), rechts Stempel der Akte |
| `fall_einstieg(text)` | Story-Einstieg (kursiv, roter Faden) |
| `beweisstueck(nr, titel, *inhalt)` | Beweisstück-Kasten (Messing) |
| `notiz(titel, *inhalt)` | Ermittler-Notiz |
| `ermittlungsauftraege(auftraege, ueberschrift="Ermittlungsaufträge")` | Tabelle Nr. · Stufe ★ · Ort PAPIER/LAB · Auftrag |
| `abi_ecke(text, be, *, operator=None, afb=None, kompetenzen=(), inhalt=(), linien=4, loesung=None)` | rot gerahmt, gesiezt, „[x BE]“ wird ergänzt; Operator/AFB nur in der Lösung |
| `spur_im_lab(ermittlung, aufgaben, werkzeug=None, text=None)` | Kasten „Spur im Lab“ |
| `cold_case(titel, text, *inhalt, kompetenzen=(), linien=3, loesung=None)` | gestrichelt, „ohne Punkte“ |
| `klausurkopf(titel, untertitel=None, *, kurs=…, dauer=None, hilfsmittel=None, be=None)` | nüchterner Prüfungskopf |
| `materialblock(titel, *inhalt)` | „MATERIAL …“ einer Prüfung |
| `teilaufgabe(teil, text, be, *, kennung=None, kompetenzen=(), inhalt=(), linien=0, loesung=None)` | „a) **Erläutern** Sie … [4 BE]“ |
| `bewertungsbogen(zeilen, titel="Bewertungsbogen", kennungen=None, kompetenzen=None)` | Teil · Erwartete Prüfungsleistungen · I · II · III · BE + Summenzeile mit AFB-Anteilen |
| `ueberschrift(text, ebene=2)`, `absatz(text)`, `inhalt(*inhalt)`, `tabelle(kopf, zeilen, breiten=None, ergebnis=False, pk=(), fk=())`, `seitenumbruch()` | allgemein |
| `speichern(pfad)` | schreibt Kern- und benutzerdefinierte Eigenschaften (s. u.) |

`warmup_karten_dokument(karten, akte, titel=None)` → `AktenDokument`: Karten aus `seed/warmup/warmup_a<n>.json`, zwei
A5-Karten je A4-Seite mit Schnittlinie, danach **ab eigener Seite** „Lösungen der Warm-up-Karten“ (die Schüler-PDF
endet davor).

Formatvorlagen im Dokument: Absatz **„SQL-Code“** (Plex Mono 9 pt, grau hinterlegt), Tabellen **„Ergebnistabelle“**
und „Datentabelle“, „DD Tabellentext“, „DD Schreiblinie“, „DD Fall-Einstieg“, „DD Abstand“; Überschriften 1–3 in
Barlow Condensed (Ebene 2 mit rotem Faden).

**Benutzerdefinierte Dokumenteigenschaften** (Word: Datei → Eigenschaften → Anpassen):
`DD-Art`, `DD-Fassung`, `DD-Akte`, `DD-Kuer` (ja/nein), `DD-Datenbank` (Standard-DB für alle SQL-Absätze),
`DD-Material` (z. B. „AB 1.1“, „GP-eA“), `DD-Kompetenzen` (JSON `{"AB 1.1/3": ["DB-K17"], "GP-eA-a": [...]}`, aus
`kompetenzen=` der Bausteine – Grundlage von `kompetenz_abdeckung.py`). Hilfen: `setze_eigenschaften(pfad, dict)`,
`lese_eigenschaften(pfad)`.

### 1.3 PowerPoint: `AktenPraesentation`

```python
AktenPraesentation(akte, titel, *, kamera_zone=False, datenbank=None, kuer=False)
```
16:9, Stil „Fallbesprechung“: Tinte-Hintergrund, Papierkarten, roter Faden unter dem Titel, Etikett „AKTE n · …“,
Fußzeile mit Foliennummer. Jede Folienmethode nimmt `notizen=""` (Sprechernotizen) und `nur_lehrkraft=False`
(setzt **„[NUR LEHRKRAFT]“** an den Anfang der Notizen und einen roten Chip auf die Folie → fehlt im Handout).

| Methode | Folientyp |
|---|---|
| `titelfolie(titel, untertitel=None)` | Titel + Stempel |
| `briefing(titel, text, *, von="Edda Lorenz", bild=None)` | Story-Karte |
| `begriffe(titel, paare=None, *, inhalt=())` | Begriffe/Notation (Tabelle Fachbegriff · Bedeutung) |
| `beispiel_schritte(titel, sql, schritte, *, ergebnis=None)` | SQL in der dunklen Konsole + nummerierte Schritte (+ Ergebnistabelle) |
| `unplugged(titel, schritte, *, material=None, dauer=None)` | Unplugged-Anleitung |
| `lab_auftrag(ermittlung, titel, aufgaben, *, werkzeug=None, hinweise=())` | „Ab ins Lab“ |
| `merkfolie(titel, punkte, *, inhalt=())` | Ermittler-Notiz |
| `abi_format(text, be, *, operator=None, inhalt=())` | Abi-Ecke, gesiezt |
| `inhaltsfolie(titel, *inhalt, karte=True)` | allgemein (z. B. ER-Diagramm) |
| `loesungsfolie(titel, *inhalt)` | immer `[NUR LEHRKRAFT]` |
| `speichern(pfad)` | inkl. Eigenschaften `DD-Datenbank`, `DD-Kamera-Zone` |

SQL-Textfelder heißen **„SQL“** (Steuerangaben im Namen: „SQL [db=kiosk, fehlerhaft]“), Ergebnistabellen
**„Ergebnistabelle“**. `kamera_zone=True` (Videos) hält unten rechts (ab x = 9,35 in, y = 4,55 in) frei;
`pruefe_kamera_zone(pfad)` listet Formen in der Zone.

### 1.4 Weitere Funktionen

`stempel_png(text, pfad, farbe=SIEGELROT)` · `er_png(graph, layout, pfad, massstab=3.0, markiert=(), hintergrund="FFFFFF")`
→ `(pfad, b, h)` · `abfrage_ergebnis(sql, datenbank, max_zeilen=200)` → `(kopf, zeilen)` als Text (für
`Ergebnis(*abfrage_ergebnis(...))`) · `sql_cli(eintraege, modus)` · `laeufe(text)`, `nur_text(text)` · Konstanten
`MARKER_LEHRKRAFT`, `LOESUNGSTEIL_WARMUP`, `NOTIZ_NUR_LEHRKRAFT`.

## 2 Zuordnung `seed/arbeitsblaetter.json`

```json
{ "version": 1,
  "gruppen": [
    { "gruppe": "A1", "akte": 1, "ordner": "Akte1_Fundbuero", "titel": "Akte 1 · Das Fundbüro",
      "materialien": [
        { "art": "ab", "nr": "1.1", "ermittlung": "A1-E1", "ds": [1], "niveau": "beide", "titel": "Der erste Auftrag",
          "quelle": "Akte1_Fundbuero/2_Arbeitsblaetter/DD_A1_AB1_Der_erste_Auftrag.docx",
          "loesung": "Akte1_Fundbuero/5_Loesungen/DD_A1_AB1_Der_erste_Auftrag_LSG.docx",
          "datei": "DD_A1-AB1_Der_erste_Auftrag.pdf" },
        { "art": "praesentation", "titel": "Das Fundbüro", "quelle": "Akte1_Fundbuero/1_Praesentation/DD_A1_Fundbuero.pptx",
          "datei": "DD_A1-Praesentation_Fundbuero.pdf" },
        { "art": "warmup", "titel": "Warm-up-Karten Akte 1", "quelle": "Warm-up/DD_Warm-up-Karten_A1.docx",
          "datei": "DD_A1-Warm-up-Karten.pdf" } ] } ] }
```
Gruppen: `Gesamt` (00_Gesamt), `A1`…`A7`, `Kuer`, `Videos` (`akte` = Nummer bzw. `null`). Pfade `quelle`/`loesung`
relativ zu `materialien/`; `datei` = PDF-Name **ohne Umlaute** (`[A-Za-z0-9._-]`), in allen Ausgabeordnern eindeutig.
Die Ausgabeordner sind **flach** (keine Unterordner) – so passt das Format zur Gast-Whitelist (`datei` + `ordner`).

| art | Quelle → Schülerfassung (Arbeitsblaetter_PDF) | → Lehrkraft (Loesungen_Portal / Lehrkraft_PDF) |
|---|---|---|
| `ab`, `kuer` | `datei` | `loesung` → `…_Loesung.pdf` (Pflicht bei `ab`) |
| `unplugged`, `handbuch` | `datei` | optional `loesung` → `…_Loesung.pdf` |
| `warmup` | `datei` ohne Lösungsteil | dieselbe Quelle vollständig → `…_Loesungen.pdf` |
| `praesentation` (pptx) | `…_Handout.pdf` (ohne `[NUR LEHRKRAFT]`-Folien, ohne Notizen) | Lehrkraft_PDF `datei` mit Notizenseiten |
| `lehrerhinweise`, `gesamt` | – | Lehrkraft_PDF `datei` |
| `generalprobe` | nur mit `"freigabe": "schueler"` | sonst Lehrkraft_PDF `datei`; `loesung` → `…_Erwartungshorizont.pdf` |
| `klausur` | – | Lehrkraft_PDF `datei`; `loesung` → `…_Erwartungshorizont.pdf` |
| `video` (pptx) | – | Lehrkraft_PDF `datei` (Folien) |

Die Themenseite kann dieselbe Datei lesen (Titel, Akte, Niveau, `ermittlung`).

## 3 Whitelists `materialien/<Ordner>/verzeichnis.json`

Erzeugt aus der Zuordnung (nie von Hand ändern) für `Arbeitsblaetter_PDF`, `Loesungen_Portal`, `Lehrkraft_PDF` und
`Originale`:
```json
{ "_hinweis": "ERZEUGT …",
  "dateien": [ { "datei": "DD_A1-AB1_Der_erste_Auftrag.pdf", "titel": "AB 1.1 · Der erste Auftrag", "akte": 1,
                 "gruppe": "A1", "art": "ab", "fassung": "schueler", "niveau": "beide", "ermittlung": "A1-E1", "ds": [1] } ] }
```
- `datei`: PDF-Name im selben Ordner (flach); bei **Originale** der Pfad der docx/pptx relativ zu `materialien/`
  (mit Unterordnern, z. B. `Akte1_Fundbuero/2_Arbeitsblaetter/…docx`).
- `fassung`: `schueler` | `handout` | `loesung` | `lehrkraft`; `niveau`, `ermittlung`, `ds` nur wenn angegeben.
- Gast-Auswahl bleibt `materialien/Gast_PDF/verzeichnis.json` im Format von `src/services/gast.js`
  (`{datei, ordner, titel, fassung}`), Standard leer (E13).
- Daneben `quellen.json` je PDF-Ordner: `{ "dateien": { "<pdf>": { "quelle", "sha256", "verfahren" } } }` (Aktualität).

Docker-Image: `scripts/materialien_fuer_image.js` kopiert PDFs + Whitelists, die Originale nur mit
`ORIGINALE_IM_IMAGE=1` (Build-Argument, Standard 1).

## 4 Pipeline

```
npm run arbeitsblaetter   # Arbeitsblaetter_PDF (Schülerfassungen, Warm-up ohne Lösungsteil)
npm run loesungen         # Loesungen_Portal
npm run praesentationen   # Handouts (Arbeitsblaetter_PDF) + Lehrkraftfassungen mit Notizenseiten (Lehrkraft_PDF)
npm run lehrkraft         # Lehrkraft_PDF (Lehrerhinweise, Gesamt, Generalprobe, Klausuren)
npm run originale         # Originale/verzeichnis.json
npm run material:pdf      # alles in dieser Reihenfolge
```
Jedes Skript erzeugt nur fehlende/veraltete PDFs (`--alle` erzwingt alles), aktualisiert `quellen.json` und
`verzeichnis.json` und entfernt überzählige PDFs. `--pruefen` (CI, ohne LibreOffice): Exit 1, wenn eine PDF fehlt,
veraltet (SHA-256 der Quelle ≠ `quellen.json`) oder überzählig ist oder ein Verzeichnis nicht zur Zuordnung passt.
Umwandlung: `soffice --headless --convert-to pdf` (Notizenseiten über den Filter `ExportNotesPages`/
`ExportOnlyNotesPages`), Warm-up-Kürzung und Textprüfung mit `pypdf`. Benötigt lokal: python-docx, python-pptx, pypdf,
Pillow, LibreOffice.

## 5 SQL in Materialien (Spec §12.3)

- Jede Anweisung im Absatzformat **„SQL-Code“** (pptx: Textfeld „SQL“) – ein Absatz je Anweisung, Zeilen mit
  Umschalt+Enter. Ein folgender SQL-Code-Absatz, der nicht mit SELECT/WITH/CREATE/INSERT/… oder `--` beginnt, gilt als
  Fortsetzung.
- Datenbank: Dokumenteigenschaft `DD-Datenbank` oder Kommentarzeile `-- DB: Stadtfest` (gilt ab dort im Block) oder
  versteckt `[[DD: db=…]]`. Namen wie in `seed/datenbanken` (`fundbuero`, `Fundbüro`, `kiosk`, `verhoer/kiosk`,
  `pruefung/…`), `keine` = nur Parser und Regeln, `leer` = eigene leere DB (nur Kür, CREATE/INSERT je Datei).
- Steuerangaben als **versteckter Text** `[[DD: fehlerhaft]]` (absichtlich falsch – die Prüfung muss einen Befund
  finden), `[[DD: aus]]` (nicht prüfen, z. B. Ausschnitt), `[[DD: kuer]]`. Das Design-Modul setzt sie aus `SQL(...)`.
- Lösungen: direkt danach eine Tabelle im Format **„Ergebnistabelle“** – erste Zeile = Spaltennamen, Zahlen mit Komma
  erlaubt (Vergleich auf die angezeigten Nachkommastellen), `NULL` für NULL, letzte Zeile „…“ = abgeschnitten;
  Reihenfolge zählt nur mit ORDER BY.
- `npm run material:sql` (`werkzeuge/material_sql_pruefen.py` → `scripts/sql_pruefen_cli.js`) meldet Syntaxfehler,
  EH-§8-Verstöße (Abimodus streng; Kür: aus), Ausführungsfehler auf Haupt-DB **und allen Randfall-Varianten** und
  Ergebnisabweichungen.

## 6 Weitere Prüfungen

- `npm run material:pruefen` (`materialien_pruefen.py`): Altbegriffe „Entitätsmenge“, „Array“, „XP“; `<>`; `JOIN`
  außerhalb der Kür; SQL außerhalb „SQL-Code“; Klarnamen aus `werkzeuge/klarnamen.txt` (auch Autor-Eigenschaft);
  Umlaute in PDF-Namen; Schülerfassungen (Quell-docx und alle PDFs in `Arbeitsblaetter_PDF`) ohne Lösungsmarker
  („NUR LEHRKRAFT“, „[NUR LEHRKRAFT]“, „Lösungen der Warm-up-Karten“, „LÖSUNG ·“, „ERWARTUNGSHORIZONT ·“).
  Erklärungen wie „`!=` statt `<>`“ oder „Verbund ohne JOIN“ sind erlaubt.
- `npm run material:kompetenzen` (`kompetenz_abdeckung.py`): KOMPETENZMATRIX × `seed/akten` × `seed/warmup` ×
  `DD-Kompetenzen` der Materialien; Lücken (Lab/Arbeitsblatt/Prüfung) und Abweichungen als Hinweise, mit `--streng`
  als Fehler (Abnahme, Task 11).
- `npm run material:tests`: Python-Tests `werkzeuge/tests/` (Rendern nur, wenn LibreOffice vorhanden ist).
- `npm run pruefen`: test, validate, Material-Tests, `--pruefen` aller Pipeline-Skripte, SQL-, Begriffs- und
  Kompetenzprüfung.

Maßgeblich: Spec §12 (Ordner §12.1, Pipeline §12.2, Zugriff §12.4) und E13. Diese Datei beschreibt, was der Server
erwartet (Phase 6 Task 5); die Pipeline (Phase 7, `werkzeuge/*_pdf.py`) erzeugt PDFs und Whitelists.

## 7 Zugriff nach Rolle (E13, Plattform)

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

## 8 Whitelists aus Sicht der Plattform (src/services/material.js)

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

## 9 Docker-Image

Siehe Dockerfile (Stufe `material`, `scripts/materialien_fuer_image.js`): PDFs und Whitelists immer, Originale nur mit `ORIGINALE_IM_IMAGE=1` (Standard).

## 10 Video-Links `seed/videos.json` (Spec §13)

Die Erklärvideos erscheinen als **Link-Knopf** (kein Embed) an der Ermittlung (gleiche Doppelstunde), auf der
Themenseite (je Akte, öffentlich) und im Lehrkraft-Reiter „Materialien“ – aber **nur, wenn `url` gesetzt ist**.

```json
{ "version": 1,
  "videos": [ { "nr": 1, "titel": "SQL-Grundlagen: …", "akte": 1, "ds": [1, 2], "niveau": "beide",
                "ordner": "01_SQL-Grundlagen", "url": null } ] }
```

| Feld | Bedeutung |
|---|---|
| `nr`, `titel`, `akte`, `ordner` | wie `materialien/Videos/<ordner>/video.json` (Test `test/videos.test.js` gleicht ab); `akte` 0 = Start |
| `ds` | Doppelstunden (1–13); bestimmt, an welchen Ermittlungen und Akten der Knopf erscheint |
| `niveau` | `eA`, `gA`, `beide` – eA-Videos fehlen in gA-Kursen (Ermittlung, `/api/material`) |
| `url` | `null` (Standard) oder **nur** `https://www.youtube.com/watch?v=<ID>` (optional `&t=<s>`) bzw. `https://youtu.be/<ID>` (optional `?si=…`/`?t=…`), ID 11 Zeichen |

Nach dem Hochladen (zuerst „nicht gelistet“) trägt Frank die URL ein und prüft mit `npm run validate`. Achtung: Mit
eingetragener URL steht der Link auf der **öffentlichen** Themenseite – ein „nicht gelistetes“ Video ist damit für
alle auffindbar, die die Seite öffnen. Die Plattform gibt immer die Normalform `https://www.youtube.com/watch?v=<ID>`
aus (Tracking-Parameter wie `si` entfallen); Links öffnen mit `target="_blank"` und `rel="noopener noreferrer"`. Die
CSP bleibt unverändert (kein `frame-src`). Eine fehlerhafte Datei schaltet alle Video-Knöpfe ab (Log beim Start).
