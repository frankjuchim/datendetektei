# Übungsdatenbanken der Datendetektei Weserstedt

Dieser Ordner enthält alle Datenbanken der Lernplattform *Datendetektei* als **SQL-Quellen**. Der Server baut daraus beim
Start die öffentlichen Übungs-DBs (`/db/<name>.sqlite`) und die Prüf-Varianten (nur im Speicher), siehe Spec Abschnitt 7.4
und 9. Alle Personen, Orte, Firmen und Vereine sind frei erfunden.

## 1. Überblick

| Ordner | DB-Name (Plattform) | Akte | Tabellen | Zielgröße | Datenquelle |
|---|---|---|---|---|---|
| `fundbuero/` | Fundbuero | 1 | `Fundsache` | 80 Zeilen | 15 Pflicht + Generator |
| `stadtrad/` | StadtRad | 2, 6 | `Station`, `Rad`, `Kunde`, `Ausleihe`, `Reparatur` | ≈ 640 Zeilen | SQL-Werkstatt (verschoben auf 21.08.–20.09.) + Pflicht + Generator |
| `stadtfest/` | Stadtfest | 3, 6 | `Stand`, `Helfer`, `Schicht`, `Produkt`, `Bon`, `Position` | ≈ 1 500 Zeilen | Stammdaten + Pflicht (ganzer Samstagabend am Kaffeemobil) + Generator |
| `tus/` | TuS | 4 | `MitgliederlisteRoh` + `Mitglied`, `Beitragsgruppe`, `Abteilung`, `Trainer`, `Halle`, `Mitgliedschaft` | 62 Rohzeilen, 137 normalisiert | **vollständig kuratiert**, kein Generator |
| `detektei/` | Detektei | 5, 6 | `Ermittler`, `Fall`, `Person`, `kennt`, `verdaechtig`, `Ort`, `Aussage`, `Beweisstueck` | ≈ 300 Zeilen | Pflicht + Generator |
| `datenspuren/` | Datenspuren | 6 | `Einwohner`, `RadExport`, `FestZahlung`, `VereinExport`, `AppCheckin` | ≈ 1 150 Zeilen | Pflicht + Ableitung aus StadtRad/Stadtfest/TuS/Detektei + Generator |
| `eisdiele/` | Eisdiele | Gast | `Sorte`, `Verkauf` | 67 Zeilen | **vollständig kuratiert** (nur Demo) |

**Abweichungen von Spec Abschnitt 9 (Stand 2026-10-12):** `Datenspuren.Einwohner` hat zusätzlich die Spalte `Strasse`
(Akte-6-Schlussplädoyer rein per SQL lösbar, siehe `datenspuren/LIESMICH.md`); die früheren Ergänzungen
`Stadtfest.Kassenabrechnung` und `Datenspuren.AppKonto` sind entfallen; `Detektei.Aussage` hat den Schlüssel
(PersonNr, FallNr, OrtNr, Zeitpunkt); `Detektei.Ermittler.Dienstgrad` kennt zusätzlich `Ausbildung`; NULL-fähig sind
`TuS.Mitglied.Geburtsjahr` und `Datenspuren.VereinExport.Geburtsjahr/Stadtteil` (Tarnname „Nora Falter“).

Die Kontexte der Verhöre, der Generalprobe und der Klausuren (eigene kleine DBs, Transfer) sind in
[`VERHOER_KONTEXTE.md`](VERHOER_KONTEXTE.md) beschrieben; ihre SQL-Dateien entstehen zusammen mit den Aufgaben.

### Dateien je DB-Ordner

| Datei | Inhalt | Wer schreibt sie? |
|---|---|---|
| `LIESMICH.md` | Zweck, Story-Bezug, Schema (Kurzschreibweise), ER (Chen), Generator-Vorgaben, Pflicht-Datensätze, Fallen, Varianten, Beispielabfragen, Abnahme-Prüfungen | Hand (Phase 0) |
| `schema.sql` | `CREATE TABLE` (SQLite) mit PRIMARY KEY, FOREIGN KEY, CHECK | Hand |
| `pflicht.sql` | INSERTs der Story-Datensätze und der Stammdaten, ohne die sie ungültig wären; bei TuS/Eisdiele alle Daten | Hand bzw. Werkzeug der Inhaltserstellung (Stadtfest, Eisdiele, `VereinExport` erzeugt) |
| `uebernahme.sql` | nur StadtRad: Daten der SQL-Werkstatt, umbenannt (erzeugt aus `quelle_sql-werkstatt.sql`) | erzeugt, nicht von Hand ändern |
| `basis.sql` | **erzeugt** von `scripts/db_bauen.js`: Schema + alle Daten der Haupt-DB, sortiert, mit Kopfkommentar (Seed, Version, Prüfsumme) | Generator |
| `varianten/<typ>.sql` | Delta-Skripte (INSERT/UPDATE/DELETE) für die Randfall-Varianten, angewandt auf eine Kopie der Haupt-DB | Hand (Phase 2), Vorgaben in der jeweiligen `LIESMICH.md` |

## 2. Namenskonventionen (Spec 6.1)

- **Tabellen:** Singular, UpperCamelCase (`Ausleihe`, `Fundsache`, `Beweisstueck`).
- **Spalten:** UpperCamelCase **ohne Umlaute und ß** (`Stellplaetze`, `Eroeffnet`, `Beweisstueck`); künstliche Schlüssel
  heißen `…ID` (nur StadtRad, aus der SQL-Werkstatt) bzw. `…Nr`.
- **Beziehungstabellen** aus n:m- bzw. rekursiven n:m-Beziehungen heißen wie der Beziehungstyp in lowerCamelCase
  (`kennt`, `verdaechtig`), wie in den Abituraufgaben (`kauft`, `hatDrucker`). Ausnahmen mit eigener fachlicher
  Bedeutung behalten einen Substantiv-Namen (`Position`, `Mitgliedschaft`, `Schicht`, `Aussage`) – siehe jeweilige LIESMICH.
- **Fremdschlüssel** dürfen anders heißen als der referenzierte Primärschlüssel (`StartStation` → `Station.StationID`,
  `MentorNr` → `Ermittler.ErmittlerNr`, `Beitragsgruppe` → `Beitragsgruppe.Gruppe`) – gewollt für Falle P7.
- **Werte** dürfen Umlaute und ß enthalten (`'Mühlenfeld'`, `'Getränke'`, `'Ermäßigt'`, `'Kranstraße 7'`). Wichtig für
  LIKE: SQLite vergleicht Groß/Klein nur bei ASCII-Buchstaben unabhängig; Bezeichnungen beginnen deshalb nie mit Umlaut.

## 3. Datentypen und Literale

| Art | Speicherung | Beispiel | Hinweis |
|---|---|---|---|
| Datum | `TEXT 'JJJJ-MM-TT'` | `'2026-06-18'` | Vergleich als Text funktioniert wegen des Formats |
| Zeitpunkt | `TEXT 'JJJJ-MM-TT hh:mm'` (24 h, führende Nullen) | `'2026-08-29 22:00'` | **Falle P5/P6:** `Start <= '2026-09-20'` schließt `'2026-09-20 14:00'` aus |
| Adresse | `TEXT 'Straße Hausnummer'` | `'Kranstraße 7'` | nur `Datenspuren.Einwohner.Strasse` und Adress-Check-ins |
| Geld | `REAL`, Euro, höchstens 2 Nachkommastellen | `312.50` | Summen in Aufgaben auf ganze Cent geprüft (Prüfer rundet 1e-6) |
| Jahr | `INTEGER` | `1988` | `Jahrgang`, `Geburtsjahr`, `Baujahr`, `Seit` (Detektei) |
| Ja/Nein | `TEXT 'ja'/'nein'` | `Vegan = 'ja'` | keine 0/1-Wahrheitswerte |
| Telefon | `TEXT '0000-…'` | `'0000-31415'` | nie echte Nummern |
| Fehlender Wert | `NULL` | | nie leere Zeichenkette `''` als Ersatz für NULL |

**Stadtteile von Weserstedt** (Story-Bibel 2.1; überall gleich geschrieben, per CHECK abgesichert): `Altstadt`,
`Hafenviertel`, `Weserufer`, `Mühlenfeld`, `Nordheide`, `Lindenhof`, `Deichkamp`, `Bahnhofsviertel`. (Die SQL-Werkstatt
nutzte `Bahnhof`, `Hafen`, `Univiertel`, `Weststadt`, `Südpark`; bei der Übernahme abgebildet, siehe
`stadtrad/LIESMICH.md`.)

## 4. Gemeinsamer Zeitstrahl der Story (alle DBs passen dazu; Quelle: STORY.md 4.0 und Anhang A)

| Datum | Ereignis | DB(s) |
|---|---|---|
| 2025 | Merle Falkenrath verlässt die Stadtverwaltung; ihr Verwaltungszugang wird nicht gesperrt | (Story) |
| 2026-01-01 | TuS erhöht den Erwachsenenbeitrag von 12,00 € auf 14,00 €; die Liste wird nur teilweise angepasst | TuS |
| 2026-04-01 | „Nora Falter“ erscheint in der TuS-Rohliste (Tischtennis, 0,00 €, Geburtsjahr leer) | TuS, Datenspuren |
| 2026-04-01 … 09-20 | Zeitraum des Fundbuchs | Fundbuero |
| Do 2026-06-18 | Messing-Kompass an der Weserpromenade gefunden (FundNr 36, Wert 450 €) | Fundbuero |
| 2026-08-21 … 09-20 | Zeitraum von StadtRad und aller Exporte der Datenspuren (Datenstand 2026-09-20 ≈ 20:00) | StadtRad, Datenspuren |
| Di 2026-08-25, 09-01, 09-15, ≈ 19:00 | Tischtennis-Training; Gerät WA-3917 checkt am Vereinsheim TuS ein | Datenspuren |
| Fr 2026-08-28 / Sa 2026-08-29 | Stadtfest auf den Weserwiesen; Sa 22:00–23:00 kassiert Helferin 23 „Nora Falter“ am Kaffeemobil (Positionen mit Menge 0 = 312,50 €, keine Kartenzahlung); WA-3917 am Festplatz 21:52 und 23:06 | Stadtfest, Datenspuren |
| 2026-09-08 … 09-12, 01:05–01:48 | fünf Nachtfahrten: Lastenräder 41–45 ab Hafenkante, Kunde 77 „Nora Falter“, nie zurück; WA-3917 jeweils an der Hafenkante, danach nachts an der Kranstraße 7 | StadtRad, Datenspuren |
| Mo 2026-09-14 | Fundbuch-Eintrag des Kompasses geändert (AbgeholtAm, Finder 'N. Falter'); WA-3917 um 10:17 im Fundbüro | Fundbuero, Datenspuren |
| 2026-09-21 / 09-22 / 09-28 / 10-05 | Detektei eröffnet Fall 1 Das Fundbüro / 2 Spur der Räder / 3 Die Stadtfest-Kasse / 4 Chaos im Vereinsarchiv | Detektei |
| Herbst 2026 | Story-Gegenwart: Die Detektei ermittelt (Akten 1–6) | – |

## 5. Aufbau: `basis.sql` + `varianten/*.sql`

**Bau-Reihenfolge je DB** (in `scripts/db_bauen.js`, jede Datei mit `PRAGMA foreign_keys = ON`):

1. `schema.sql`
2. nur StadtRad: `uebernahme.sql`
3. `pflicht.sql` – **Pflicht-Datensätze zuerst**, mit festen Schlüsseln
4. Generator (außer TuS und Eisdiele) nach den Vorgaben der DB-`LIESMICH.md`
5. Abnahme: `PRAGMA foreign_key_check`, `PRAGMA integrity_check`, alle „Abnahme-Prüfungen“ der DB-`LIESMICH.md`, alle
   Beispielabfragen fehlerfrei → dann `basis.sql` schreiben (Schema + INSERTs je Tabelle nach Primärschlüssel sortiert)
6. Varianten: Für jede Datei `varianten/<typ>.sql`: Kopie der Haupt-DB → Delta ausführen → FK-/Integritätsprüfung →
   als Buffer für den Prüfer bereitstellen (nie öffentlich).

**Vergabe künstlicher Schlüssel:** Pflicht-IDs sind fest. Der Generator vergibt die übrigen IDs lückenlos aufsteigend in
chronologischer Reihenfolge und **überspringt belegte IDs**. Kleine Brüche der Chronologie an Pflicht-IDs sind erlaubt;
**keine Aufgabe darf aus der Reihenfolge künstlicher Schlüssel auf die Zeit schließen.** Varianten-Datensätze verwenden
den reservierten Bereich **ab 9001** (bzw. ab 901 bei Tabellen mit zweistelligen IDs, z. B. `Station`, `Stand`,
`Ermittler`), damit Delta-Skripte unabhängig von den Generator-Daten funktionieren.

### Variantentypen (Spec 7.4)

| Typ | Datei | Was das Delta tut | Entlarvt typischerweise |
|---|---|---|---|
| `null` | `varianten/null.sql` | setzt bzw. fügt NULL in FK- und Vergleichsspalten ein | `= NULL`, verschwundene Zeilen im Verbund, `COUNT(spalte)` vs. `COUNT(*)`, `!=` ohne NULL-Gedanken (P4, P5) |
| `gleichnamig` | `varianten/gleichnamig.sql` | fügt Personen/Dinge mit identischem Namen (anderer Schlüssel) ein | Gruppieren nach Name statt Schlüssel, Filtern nach Name statt Schlüssel (P3, P8) |
| `grenze` | `varianten/grenze.sql` | Werte genau auf Bedingungsgrenzen (Datum, Uhrzeit, Betrag, Anzahl) | `>` statt `>=`, falsche BETWEEN-Grenzen, Datum-gegen-Zeitpunkt-Vergleich (P5, P6) |
| `gleichstand` | `varianten/gleichstand.sql` | erzeugt Gleichstände an der Schnittkante von ORDER BY … LIMIT bzw. MAX | Top-n per LIMIT, wenn die Aufgabe „alle mit dem Höchstwert“ verlangt (Spec 6.2) |
| `leer` | `varianten/leer.sql` | Gruppe/Datensatz ohne zugehörige Zeilen (Stand ohne Bon, Station ohne Rad) | Annahmen über vollständige Gruppen; Musterlösung muss leere Gruppen bewusst behandeln |

Eine Aufgabe nennt in `varianten: [...]`, welche Varianten gelten. Die Musterlösung muss auf der Haupt-DB **und** allen
genannten Varianten das fachlich richtige Ergebnis liefern (Validator, Spec 7.16). Varianten, die für eine DB keinen
Sinn ergeben, sind in der DB-`LIESMICH.md` als „entfällt“ begründet.

## 6. Generator `scripts/db_bauen.js` (wird in Claude Code gebaut)

**Aufruf:** `node scripts/db_bauen.js [--db <name>] [--pruefen]` – ohne `--pruefen` schreibt er `basis.sql`; mit
`--pruefen` baut er neu und vergleicht byteweise mit dem eingecheckten `basis.sql` (CI: muss identisch sein).

**Determinismus**
- Ein PRNG je DB, z. B. *mulberry32*, Seed = 32-Bit-Hash (FNV-1a) von `"datendetektei:<db>:v1"`. **Kein** `Math.random`,
  **kein** `Date.now`; alle Zeitpunkte werden aus festen Startwerten berechnet.
- Feste Iterationsreihenfolge (Arrays, keine Objekt-Schlüssel-Reihenfolge, stabile Sortierung). Gleiche Eingabe →
  byteidentisches `basis.sql`.
- Wird eine Vorgabe verletzt (z. B. Kassenkette passt nicht), zieht der Generator **deterministisch** neu
  (Teil-Seed + Zähler), höchstens 1 000 Versuche, sonst Abbruch mit Meldung.

**Namen:** ausschließlich aus [`namen.json`](namen.json) (kuratiert, unauffällig, ohne Prominente). Reservierte Nachnamen
(Figuren der Story-Bibel: `Falter`, `Falkenrath`, `Lorenz`, `Brandes`, `Leversen`, `Brakhage`, `Ohlendiek`, `Hollwedel`,
`Melchers`, `Lüttjohann`, `Aksoy`, `Vollmers`, `Oltmanns`, `Hartwig`, `Wendland` …, vollständige Liste in
`namen.json`) und die reservierte Kombination *Jahrgang 1988 + Hafenviertel* werden nie zusätzlich erzeugt.
Gleichnamige entstehen nur dort, wo eine LIESMICH sie ausdrücklich verlangt. Straßen für `Einwohner.Strasse` stehen je
Stadtteil in `namen.json`; reservierte Adressen (`Kranstraße 7`, `Speicherstraße 14`, `Lotsengang 2`) nie zusätzlich.

**Ablauf je DB:** Pflicht laden → Mengengerüst aus der DB-LIESMICH (Zeilenzahlen, Wertebereiche, Verteilungen,
NULL-Anteile, Zeitraum) erzeugen → Abnahme-Prüfungen → `basis.sql`. Die Vorgaben stehen in jeder DB-LIESMICH im
Abschnitt **„Datenumfang und Verteilung“**; was dort nicht festgelegt ist, wählt der Generator plausibel und
gleichverteilt.

**DB-übergreifende Ableitungen** (Konsistenz der Welt, Bau-Reihenfolge `stadtrad` → `stadtfest` → `tus` → `detektei` →
`datenspuren`):
- `Datenspuren.RadExport` = alle Ausleihen aus StadtRad (2026-08-21 … 09-20; Token je Kunde, Jahrgang/Stadtteil/Tarif
  aus `Kunde`, Stationsname, Start).
- `Datenspuren.FestZahlung` = alle Bons mit Zahlart `'Karte'` aus Stadtfest (Kartentoken je zahlender Person, Betrag = Bonsumme).
- `Datenspuren.VereinExport` = aus TuS (bereits vollständig in `datenspuren/pflicht.sql`).
- `Datenspuren.Einwohner` enthält zusätzlich die Personen aus StadtRad, Stadtfest, TuS und Detektei (außer „Nora Falter“)
  mit gleichem Jahrgang und Stadtteil.
- `Datenspuren.AppCheckin`: Geräte eines Teils der StadtRad-Kundschaft checken bei jeder Ausleihe an der Startstation ein.
- Personen, die in mehreren DBs vorkommen, haben überall denselben Jahrgang und Stadtteil (z. B. Selin Aksoy 1979,
  Lindenhof; Henning Abels 1967, Mühlenfeld; Tamara Leversen 1988, Hafenviertel).

**Abnahme:** Jede DB-LIESMICH enthält Abnahme-Prüfungen (Abfrage + erwartetes Ergebnis). Der Generator führt sie nach
dem Erzeugen aus; schlägt eine fehl, wird nicht geschrieben. Zusätzlich laufen alle Beispielabfragen der LIESMICH
(`npm run validate` prüft sie später auch auf EH-§8-Konformität).

## 7. SQL-Stil der Beispielabfragen (EH 2025 §8, Spec 6.2)

Nur `SELECT`; Verbund **implizit** (`FROM a, b WHERE a.fk = b.pk`), kein `JOIN`; keine Unterabfragen; `!=` statt `<>`;
Tabellenalias ohne `AS`; Spaltenalias mit `AS`; **kein Alias in HAVING** (Aggregat wiederholen); Alias in ORDER BY
erlaubt; GROUP-BY-Regel strikt (jede nicht aggregierte SELECT-Spalte steht im GROUP BY, gruppiert wird nach Schlüssel).
Codeblöcke, die bewusst falsch sind, beginnen mit der Kommentarzeile `-- Fehlabfrage`.
