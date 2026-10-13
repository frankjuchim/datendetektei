# Materialien der Datendetektei Weserstedt

Maßgeblich sind die **docx/pptx** in diesem Ordner; die PDFs werden daraus erzeugt. Ausführlich: `docs/MATERIALIEN.md`.

## Aufbau (Spec §12.1)

```
00_Gesamt/            DD_Gesamtuebersicht.docx, DD_Abi-Kompass.docx, DD_Ermittler-Handbuch.docx
Akte1_Fundbuero/      1_Praesentation/ 2_Arbeitsblaetter/ 3_Unplugged/ 4_Lehrerhinweise/ 5_Loesungen/
Akte2_Raeder/ Akte3_Stadtfest/ Akte4_Vereinsarchiv/ Akte5_Bauplan/ Akte6_Datenspuren/
Akte7_Generalprobe/   Generalprobe eA/gA, Klausur, Nachschreibklausur, Erwartungshorizonte
Kuer/                 K1_Eigene_Datenbank, K2_Escape_Room
Warm-up/              DD_Warm-up-Karten_A<n>.docx
Videos/               NN_Kurztitel/video.json → Folien.pptx + Skript.md
_Muster/              Vorlagen für jeden Dokumenttyp (nicht im Unterricht, nicht im Image)
Arbeitsblaetter_PDF/  ERZEUGT – Schülerfassungen (nur angemeldet), nie Lösungen
Loesungen_Portal/     ERZEUGT – Lösungen, Erwartungshorizonte (nur Lehrkraft)
Lehrkraft_PDF/        ERZEUGT – Präsentationen mit Notizen, Lehrerhinweise, Prüfungen (nur Lehrkraft)
Originale/            ERZEUGT – nur verzeichnis.json (docx/pptx für den Superadmin)
Gast_PDF/             verzeichnis.json – öffentliche Demo-Auswahl, legt Frank fest (Standard leer)
```
In den erzeugten Ordnern: `verzeichnis.json` (Whitelist für den Server) und `quellen.json` (Hash der Quelle).

## Benennung

- Arbeitsblatt `DD_A<n>_AB<k>_<Thema>.docx`, Lösung `…_LSG.docx`, PDF `DD_A<n>-AB<k>_<Thema>.pdf` (ohne Umlaute)
- Präsentation `DD_A<n>_<Aktenname>.pptx`, Lehrerhinweise `DD_A<n>_Lehrerhinweise.docx`
- Warm-up-Karten `DD_Warm-up-Karten_A<n>.docx`
- Jede Datei, die eine PDF bekommt, steht in `seed/arbeitsblaetter.json` (Art, Titel, Quelle, Lösung, PDF-Name).

## Befehle

```
npm run material:pdf        # alle PDFs + Verzeichnisse erzeugen (LibreOffice; nur Fehlendes/Veraltetes)
npm run arbeitsblaetter | loesungen | praesentationen | lehrkraft | originale   # einzeln
npm run material:sql        # jede SQL-Anweisung prüfen (Syntax, EH §8, Ergebnistabellen)
npm run material:pruefen    # Begriffe, Klarnamen, PDF-Namen, Schülerfassungen ohne Lösungen
npm run material:kompetenzen
npm run pruefen             # alles (wie die CI)
python3 quellen/material/muster.py   # Muster neu erzeugen
```
Nach jeder Änderung an einem docx/pptx die PDFs neu erzeugen und mitcommitten – die CI prüft über den Hash, ob sie
aktuell sind. Schriften: `werkzeuge/fonts/*.ttf` (Barlow, Barlow Condensed, IBM Plex Mono) zum Bearbeiten installieren.

## Regeln für SQL in Dokumenten

1. Jede Anweisung im Absatzformat **„SQL-Code“** (PowerPoint: Textfeld mit dem Namen **„SQL“**), Zeilenumbrüche mit
   Umschalt+Enter.
2. Datenbank über die Dokumenteigenschaft **DD-Datenbank** oder eine Zeile `-- DB: Stadtfest` über der Anweisung.
3. Absichtlich fehlerhaftes SQL (Fehler finden) mit verstecktem Text `[[DD: fehlerhaft]]`, Ausschnitte mit
   `[[DD: aus]]` (Word: Schrift → Ausgeblendet).
4. In Lösungen folgt eine Tabelle im Format **„Ergebnistabelle“** (Kopfzeile = Spaltennamen, `NULL` ausschreiben,
   letzte Zeile „…“ wenn gekürzt).
5. Stil nach EH §8: Verbund nur implizit, kein `JOIN … ON` (nur Kür, „nicht im Abitur“), `!=` statt `<>`,
   GROUP-BY-Regel, kein Alias in HAVING.

Schülerfassungen enthalten nie Lösungen: Lösungs- und Lehrkraftfassungen tragen „NUR LEHRKRAFT“ in der Fußzeile,
Lösungsfolien den Notiz-Marker `[NUR LEHRKRAFT]` (fehlen im Handout), Warm-up-Lösungen beginnen auf eigener Seite mit
„Lösungen der Warm-up-Karten“ (die Schüler-PDF endet davor).
