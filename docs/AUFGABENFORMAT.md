# Datendetektei – Aufgabenformat (Seed-Dateien `seed/akten/akte<N>.json`)

Dieses Dokument beschreibt das verbindliche Format der Akten-Dateien so, wie die Plattform es **rendert und prüft**.
Grundlage ist das Aufgabenformat von Algo Quest (`frankjuchim/algoquest`, `docs/AUFGABENFORMAT.md`, Version 2) mit den
Erweiterungen aus Spec §7.5. Begriffe: **Welt = Akte**, **Level = Ermittlung**, **Boss = Verhör** – in JSON, Code und
Manifest bleiben `welt`, `levels`, `boss`.

Eine vollständige Beispieldatei mit jeder Block- und Interaktionsart dieser Phase liegt in
`test/fixtures/akte_beispiel.json` (`welt: 9`, nur für Tests – nicht in `seed/akten` ablegen).

Prüfen: `npm run validate` (alle Dateien in `seed/akten`) oder `node scripts/validate.js <datei> …` (Option `--json`).
Exit-Code 1 bei Fehlern. Prüfer: `src/content/pruefer.js`, Hilfsfunktionen: `src/content/format.js`.

Elemente, die erst in **Phase 5** gebaut werden, sind mit *„folgt in Phase 5“* markiert. Der Validator lehnt sie bis
dahin ab (unbekannter Block bzw. unbekannte Interaktion).

---

## 1. Datei

```json
{
  "version": 2, "welt": 1, "titel": "Das Fundbüro", "farbe": "#8C2F39",
  "levels": [ /* Ermittlungen, siehe 2 */ ],
  "boss": { /* Verhör, siehe 3 */ },
  "aufgaben": [ /* Aufgaben, siehe 4 */ ]
}
```

| Feld | Pflicht | Bedeutung |
|---|---|---|
| `version` | ja | immer `2` |
| `welt` | ja | Aktennummer 1–7 (9 nur in der Test-Beispielakte); jede Nummer nur in einer Datei |
| `titel` | ja | Name der Akte („Das Fundbüro“) |
| `farbe` | empfohlen | Aktenfarbe `#RRGGBB` (fehlt sie: Standardfarbe der Akte) |
| `levels` | ja | Ermittlungen der Akte (Reihenfolge = Reihenfolge in der Oberfläche) |
| `boss` | nein | Verhör der Akte (Akte 7: Generalprobe, siehe Spec §3.3) |
| `aufgaben` | ja | alle Aufgaben der Akte: Ermittlungen, Cold Cases und Verhör-Pool |

Beim Start wird jede Datei per **Upsert nach id** eingespielt; Lernstände bleiben erhalten. Aufgaben, die in der neuen
Fassung fehlen, werden deaktiviert (nicht gelöscht). Unveränderte Dateien werden übersprungen (Fingerabdruck).
**Fehlertoleranz:** Eine Datei mit Fehlern auf Dateiebene (kein JSON, `levels` fehlt …) wird übersprungen – die zuletzt
geladene Fassung bleibt aktiv. Einzelne fehlerhafte Aufgaben werden ausgelassen (inkl. Verweisen darauf), der Rest wird
geladen. Alles wird protokolliert (Seed-Bericht im Superadmin-Bereich).

Jede Datei gehört genau einem Bearbeiter bzw. Agenten (`akte1.json` …), damit parallel geschrieben werden kann.

## 2. Ermittlung (Level)

```json
{ "id": "A1-E1", "nr": "1.1", "titel": "Der erste Auftrag", "ds": [1], "ab": "AB 1.1 Der erste Auftrag",
  "niveau": "alle",
  "briefing": "Edda legt dir das Fundbuch auf den Tisch. Bevor du ermittelst, lernst du, wie es aufgebaut ist.",
  "intro": [ { "t": "datenbank", "name": "fundbuero" }, { "t": "hinweis", "md": "**Ermittler-Notiz:** …" } ],
  "coldCase": "A1-E1-CC",
  "aufgaben": ["A1-E1-01", "A1-E1-02"] }
```

| Feld | Pflicht | Bedeutung |
|---|---|---|
| `id` | ja | `A<n>-E<k>` (n = Akte, k = Ermittlung 1–9) |
| `titel` | ja | Titel der Ermittlung |
| `nr` | nein | Anzeige-Nummer „1.1“ |
| `ds` | nein | Doppelstunden (Liste von Zahlen, DS_PLANUNG) |
| `ab` | nein | zugehöriges Arbeitsblatt (nur Anzeige) |
| `niveau` | nein | `"alle"` (Standard, gA und eA) oder `"eA"` (nur Leistungskurs, z. B. ganze Akte 5); gA-Kurse sehen eA-Ermittlungen nicht |
| `briefing` | nein | Story-Einstieg von Edda Lorenz, geduzt, **höchstens drei Sätze** (Spec §3.1), Mini-Markdown |
| `intro` | nein | Blöcke (siehe 5), z. B. `datenbank` und eine Ermittler-Notiz; ohne Lücken |
| `coldCase` | nein | id einer Cold-Case-Aufgabe `A<n>-E<k>-CC` (siehe 4.3) |
| `aufgaben` | ja | Reihenfolge der Aufgaben der Ermittlung. Jede Aufgabe steht in genau einer Ermittlung; Verhör-Aufgaben und Cold Cases nie |

Ziel je Ermittlung (DS_PLANUNG): rund 8 Aufgaben, Stufenmix etwa 40/40/20 % (3/3/2).

## 3. Verhör (Boss)

```json
"boss": { "id": "A1-V", "titel": "Verhör 1 · Stadtbibliothek", "kontextDb": "bibliothek",
          "rahmensatz": "Bevor ich dich allein an das Fundbuch lasse, prüfe ich, ob du auch in einem fremden Archiv sauber abfragst.",
          "abimodus": "streng", "dauerMin": 20, "anzahl": 6,
          "mix": { "1": 2, "2": 3, "3": 1 }, "maxJeKind": { "choice": 1 },
          "pool": ["A1-V-01", "A1-V-02", "…"] }
```

| Feld | Pflicht | Bedeutung |
|---|---|---|
| `id` | ja | `A<n>-V` |
| `titel` | ja | Name des Verhörs |
| `kontextDb` | ja | Transfer-Datenbank des Verhörs (`seed/datenbanken/verhoer/<kontext>`, `VERHOER_KONTEXTE.md`); in der Beispielakte `eisdiele`. Verhör-DBs sind **nie** öffentlich unter `/db/` |
| `rahmensatz` | ja | ein Satz Story-Rahmen für die Startkarte (geduzt, von Edda) |
| `abimodus` | ja | immer `"streng"` (Spec §7.9): gilt für alle `sql`-Aufgaben des Pools und überschreibt deren eigenen Wert |
| `dauerMin` | ja | Timer in Minuten (V1–V5: 20, V6: 15, V7: 30), serverseitig, +30 s Kulanz |
| `anzahl` | ja | Zahl der gezogenen Aufgaben (6–8) |
| `mix` | ja | Aufgaben je Stufe `{ "1": a, "2": b, "3": c }`, Summe = `anzahl` |
| `maxJeKind` | nein | Obergrenze je Interaktionsart bei der Ziehung, z. B. `{ "choice": 1 }` (mehrteilige Aufgaben zählen mit der Art ihres ersten Teils) |
| `pool` | ja | 12–15 Aufgaben `A<n>-V-<nn>` |
| `niveau` | nein | Standard-Niveau des Pools (`alle`/`eA`); einzelne Aufgaben können abweichen (gA-Kurse ziehen nur `alle`) |

- Pool-Aufgaben sind eigene Aufgaben (nie in Ermittlungen) und **nur im laufenden Verhör** abrufbar.
- Ziehung: je Stufe `mix[s]` zufällige Aufgaben unter Beachtung von `maxJeKind`; reicht eine Stufe nicht, wird aus dem
  Rest aufgefüllt (der Validator meldet einen nicht erfüllbaren Mix als Fehler). Reihenfolge im Verhör: Stufe 1 → 3.
- Kein Feedback im Verhör; Punkte = Summe der Punkte richtiger Aufgaben (mehrteilig: alle Teile richtig).
  „Besiegt“ ab 50 %, neuer Versuch nach 12 h, bester Versuch zählt.
- Verhör-Aufgaben sind **gesiezt** und im Abitur-Stil (Operator fett); `kernpunkte` kommt im Verhör nicht vor.
- `sql`-, `ergebnis`- und `zeilen`-Aufgaben des Pools verwenden ausschließlich die `kontextDb` des Verhörs.

## 4. Aufgabe

```json
{ "id": "A1-E1-03", "titel": "Alles im Blick", "stufe": 1, "punkte": 10,
  "kategorie": "SQL eine Tabelle", "fallen": ["P5"],
  "inhalt": [ /* Blöcke, siehe 5 – dürfen Lücken [[id]] enthalten */ ],
  "interaktion": { "kind": "sql", "datenbank": "fundbuero", "varianten": ["null"] },
  "loesung": { "sql": "SELECT Bezeichnung, Kategorie, Fundort\nFROM Fundsache" },
  "tipps": ["Mehrere Spalten trennst du im SELECT mit Kommas."],
  "erklaerung": [ /* Blöcke (ohne Lücken) */ ] }
```

| Feld | Regel |
|---|---|
| `id` | Ermittlung `A<n>-E<k>-<nn>`, Cold Case `A<n>-E<k>-CC`, Verhör `A<n>-V-<nn>`; eindeutig über alle Akten |
| `titel` | Pflicht |
| `stufe` | 1, 2, 3 (★ / ★★ / ★★★) |
| `punkte` | optional, Standard 10/20/30 je Stufe (Abweichung = Hinweis); **0** bei Cold Cases und `kernpunkte` |
| `kategorie` | genau ein Wert aus KATEGORIEN (siehe unten) |
| `niveau` | optional `alle` · `eA` – nur angeben, wenn die Aufgabe vom Niveau ihrer Ermittlung bzw. ihres Verhörs abweicht |
| `fallen` | Teilmenge von `P1`…`P10` (Spec §5, darf leer sein) – Fehlversuche werden je Falle gezählt („Deine Fallen“) |
| `inhalt` | Liste von Blöcken (siehe 5), Pflicht |
| `interaktion` | Objekt **oder Array** (mehrteilige Aufgabe); dann ist `loesung` ein Array gleicher Länge |
| `loesung` | passend zur Interaktion (siehe 6); entfällt nur bei `kernpunkte` |
| `tipps` | optional; jeder abgerufene Tipp kostet 0,2 × Punkte |
| `erklaerung` | wird nach dem Lösen/Aufdecken gezeigt; fehlt sie, gibt der Validator einen Hinweis |

**KATEGORIEN** (Spec §4, Bereiche): `Relationales Modell` · `Schlüssel` · `Anomalien` · `SQL eine Tabelle` ·
`SQL Verbund` · `SQL Aggregation` · `Abfrage analysieren` · `ER-Modell` · `Überführung` · `Datenschutz`

**FALLEN** (Spec §5): P1 WHERE ↔ HAVING · P2 Verbund fehlt/vervielfacht · P3 GROUP-BY-Regel · P4 COUNT ↔ SUM ·
P5 NULL und Literale · P6 Bedingungslogik · P7 mehrdeutig/falsch benannt · P8 Schlüssel falsch beurteilt ·
P9 ER/Überführung fehlerhaft · P10 Operator verfehlt.

### 4.1 Punkte und Status

Beim ersten Lösen `round(punkte × max(0.25, 1 − 0.25·Fehlversuche − 0.2·Tipps))`. Nach „Lösung zeigen“ 0 Punkte
(Aufgabe bleibt übbar, Status „angesehen“; späteres Lösen wird als „nachgelöst“ vermerkt). Erneutes Lösen bringt nichts.
Eine **leere** Antwort zählt nicht als Fehlversuch. Bei der Schrittprüfung zählt jeder falsche Schritt als Fehlversuch.
`kernpunkte`-Aufgaben haben den Status „bearbeitet“ und bringen nie Punkte.

### 4.2 Sicherheit (Vertrag §9)

`loesung`, `erklaerung` und noch nicht abgerufene `tipps` verlassen den Server erst nach dem Lösen/Aufdecken;
Verhör-Aufgaben nur im laufenden Verhör. Von einer `sql`-Interaktion erhält der Browser nur `kind`, `datenbank` und
den wirksamen `abimodus` – `varianten`, `sortierung` und `aliasPflicht` bleiben auf dem Server. Alles, was eine
Lösung verraten würde (`quelleSql`, Musterergebnis, Musterzeilen), steht deshalb **in `loesung`**, nie in `interaktion`.
Rückmeldungen des Prüfers enthalten keine Lösungsdaten (siehe 6).

### 4.3 Cold Case

Freie Zusatzermittlung für Schnelle (DS_PLANUNG „Cold Case im Lab“): id `A<n>-E<k>-CC`, referenziert über
`coldCase` der Ermittlung, steht **nicht** in deren `aufgaben`. `punkte` ist 0 (oder fehlt); Cold Cases zählen weder
für Ränge noch für die Verhör-Freischaltung noch im Manifest-`umfang`. Sonst eine normale Aufgabe (meist `sql`, auch
`kernpunkte`), geprüft wie jede andere.

## 5. Inhaltsblöcke `{ "t": … }`

Alle Texte werden XSS-sicher als Text gerendert (kein HTML). Lücken `[[id]]` (A–Z, a–z, 0–9, `_`, `-`, bis 40 Zeichen)
sind in allen Texten erlaubt außer in `erklaerung`, `intro` und `briefing`; jede Lücke genau einmal pro Aufgabe.

**Mini-Markdown** (`md`, `frage`, Optionen): `**fett**`, `*kursiv*`, `` `code` ``, Absätze (Leerzeile), Listen (`- `),
Zeilenumbruch (einfaches `\n`). Nicht erlaubt: HTML-Tags (z. B. `<u>`); Unterstreichungen für Primärschlüssel nur über
`pk` in `dbtabelle`/`schema`. Der Validator meldet unausgeglichene `**`/`` ` `` und HTML-Tags
(`format.pruefeMarkdown`). Ein `*` innerhalb von `` `…` `` (z. B. `` `COUNT(*)` ``) zählt nicht.

### 5.1 Basis-Blöcke (wie Algo Quest)

| Block | Beispiel | Darstellung |
|---|---|---|
| `text` | `{ "t":"text", "md":"Wie viele Zeilen? [[g1]]" }` | Mini-Markdown |
| `hinweis` | `{ "t":"hinweis", "md":"**Ermittler-Notiz:** …" }` | Merkkasten |
| `code` | `{ "t":"code", "code":"…", "nummern":true, "markiere":[3] }` | Monospace ohne Syntaxfarben (für Nicht-SQL, z. B. Kurzschreibweise als Text, Ausgaben); Zeilennummern (`nummern: false` ohne, Standard `true`), Zeilen in `markiere` (1-basiert) hervorgehoben, Lücken erlaubt |
| `tabelle` | `{ "t":"tabelle", "kopf":["Begriff","Bedeutung"], "zeilen":[["%","[[g1]]"]] }` | einfache Tabelle (Texte), Lücken in Zellen |

### 5.2 `dbtabelle` – Datentabelle

```json
{ "t": "dbtabelle", "tabelle": "Fundsache",
  "kopf": [ { "name": "FundNr", "pk": true }, { "name": "Bezeichnung" }, { "name": "StationNr", "fk": "Station" } ],
  "zeilen": [ [36, "Messing-Kompass", null], [37, "[[g1]]", 4] ],
  "markiert": [ { "zeile": 0, "spalte": 1, "marke": "A" }, { "zeile": 1, "farbe": "rot" } ],
  "quelle": { "datenbank": "fundbuero", "sql": "SELECT FundNr, Bezeichnung, StationNr FROM …" } }
```

| Feld | Pflicht | Bedeutung |
|---|---|---|
| `tabelle` | ja | Tabellenname (Überschrift) |
| `kopf` | ja | Spalten: `name` Pflicht; `pk: true` → unterstrichen; `fk: "<Relation>"` (oder `true`) → mit vorangestelltem **↑** |
| `zeilen` | ja | Liste von Zeilen, jede so lang wie `kopf`; Zellen sind Zahl, Text oder `null` (angezeigt als grau „NULL“); Lücken `[[id]]` in Text-Zellen erlaubt |
| `markiert` | nein | Liste `{ zeile, spalte?, marke?, farbe? }`: `zeile`/`spalte` **0-basiert** (`spalte` fehlt → ganze Zeile), `marke` kurzes Etikett (≤ 3 Zeichen, z. B. „A“), `farbe` `gold` (Standard), `rot`, `gruen`, `blau`, `grau` |
| `quelle` | nein | `{ datenbank, sql }`: der Ausschnitt stammt aus einer Datenbank; der Validator führt `sql` aus und vergleicht mit `zeilen` (Zellen normalisiert wie bei `ergebnis`, Reihenfolge zählt). Für Blöcke mit Lücken nicht verwenden |

Die Zeilen einer `dbtabelle` sind das Ziel der Interaktion `zeilen` (6.7) und – *folgt in Phase 5* – `zellen`.

### 5.3 `schema` – Relationenschema in Kurzschreibweise

```json
{ "t": "schema", "relationen": [
  { "name": "Sorte",   "attribute": [ { "name": "SorteNr", "pk": true }, { "name": "Name" } ] },
  { "name": "Verkauf", "attribute": [ { "name": "VerkaufNr", "pk": true }, { "name": "SorteNr", "fk": "Sorte" }, { "name": "Kugeln" } ] } ] }
```

Dargestellt als `Verkauf(VerkaufNr, ↑SorteNr, Kugeln)` (EH §7): Primärschlüssel unterstrichen (`pk: true`, auch
zusammengesetzt), Fremdschlüssel mit **↑** (`fk`: Name der Zielrelation oder `true`; ein Attribut kann `pk` und `fk`
zugleich sein). Lücken in Attributnamen erlaubt. Relationen- und Attributnamen ohne Umlaute (Spec §6.1).

### 5.4 `sql` – SQL-Abfrage

```json
{ "t": "sql", "sql": "SELECT Bezeichnung\nFROM Fundsache\nWHERE Wert [[g1]] 400", "nummern": true, "markiere": [3] }
```

Wie `code`, aber mit SQL-Hervorhebung (Schlüsselwörter, Literale, Zahlen). `nummern` Standard `true`, `markiere`
1-basierte Zeilen. Lücken erlaubt. Das SQL folgt dem Abi-Stil (Spec §6.2): Schlüsselwörter groß, je Klausel eine Zeile –
außer in Aufgaben, die gezielt fehlerhaftes SQL zeigen (`lines`).

### 5.5 `datenbank` – Verweis auf eine Übungs-DB

```json
{ "t": "datenbank", "name": "fundbuero" }
```

Kachel „Diese Ermittlung nutzt: Fundbüro“ mit Schema-Browser und Download der öffentlichen Übungs-DB
(`/db/<name>.sqlite`). `name` ∈ `fundbuero`, `stadtrad`, `stadtfest`, `tus`, `detektei`, `datenspuren`, `eisdiele`.
Nur für öffentliche Übungs-DBs – **nie** für Verhör-Kontexte (dort `schema` bzw. `dbtabelle` verwenden). Typischer Ort:
`intro` der Ermittlung.

### 5.6 Folgt in Phase 5

| Block | Zweck |
|---|---|
| `er` | ER-Diagramm (Chen) aus JSON-Graph + Layout, als SVG — *folgt in Phase 5* |
| `mengen` | Mengendiagramm zweier Mengen mit Verbindungslinien (Kardinalitäten) — *folgt in Phase 5* |

## 6. Interaktionen und Prüfregeln (Prüfung nur auf dem Server)

`pruefeAntwort(aufgabe, antwort, { sqlPruefer, abimodus?, teilweise?, teil? }) → Promise<{ ok, leer, rueckmeldung,
antworten }>` (`src/content/pruefer.js`). Eine Antwort in unbrauchbarer Form (falscher Typ, zu lang, Index außerhalb)
führt zu einem `AntwortFehler` (HTTP 400, kein Fehlversuch). `rueckmeldung` enthält nur, was in diesem Abschnitt je
Interaktion genannt ist – nie Lösungswerte.

### 6.1 `gaps` – Lücken

```json
"interaktion": { "kind":"gaps", "felder": {
   "g1": { "typ":"zahl", "breite":4 },
   "g2": { "typ":"auswahl", "optionen":[">", ">=", "<", "<="] },
   "g3": { "typ":"text" },
   "g4": { "typ":"text", "norm":"text" } } },
"loesung": { "g1":["570"], "g2":[">="], "g3":["'%Messing%'"], "g4":["NOT"] }
```

- Je Feld eine Liste akzeptierter Antworten (ein einzelner Wert wird akzeptiert, Hinweis im Validator).
- `zahl`: numerisch (Komma = Punkt, Toleranz ±1e-9; `1e2` = 100). Nicht-numerische Lösung → Textvergleich (`code`).
- `auswahl`: exakter Vergleich, Lösung muss in `optionen` stehen. Klappliste; ab drei Optionen mischt der Client die
  Reihenfolge (Zweierlisten bleiben).
- `text`, `norm`:
  - `"code"` (Standard): alle Leerzeichen entfernen, Groß/Klein **beachten**.
  - `"text"`: Leerraum zusammenfassen, Groß/Klein egal (z. B. SQL-Schlüsselwörter).
  - `"exakt"`: exakt (nur äußere Leerzeichen werden ignoriert, keine Vereinheitlichung).
  - Bei `code` und `text` wird zusätzlich vereinheitlicht (iPad-Tastatur, wie Algo Quest): typografische
    Anführungszeichen „ “ ” ‚ ‘ ’ « » → `"`/`'`, Minus/Gedankenstrich − – — → `-`, geschütztes Leerzeichen → Leerzeichen,
    `<-` → `←`, `≤ ≥ ≠` → `<= >= !=`.
- `breite` (1–80 Zeichen) steuert nur die Feldbreite.
- Leer: alle Felder leer. Rückmeldung `{ felder: { g1: true|false, … } }`.

### 6.2 `choice` – Auswahl

```json
"interaktion": { "kind":"choice", "mehrfach":true, "optionen":[{"id":"a","md":"`SorteNr` ist Fremdschlüssel"},{"id":"b","code":"Sorte(SorteNr, Name)"}] },
"loesung": { "richtig": ["a"] }
```
Menge exakt; der Client mischt die Reihenfolge. `mehrfach: false` → genau eine richtige Option. Option mit `md` oder
`code`. Leer: nichts gewählt. Rückmeldung `{}`.

### 6.3 `order` – Puzzle (z. B. SQL-Klauseln)

```json
"interaktion": { "kind":"order", "teile":[{"id":"a","code":"SELECT Bezeichnung"},{"id":"b","code":"FROM Fundsache"},{"id":"x","code":"WHERE Kategorie = Schirm"}] },
"loesung": { "reihenfolgen": [["a","b"]] }
```
Richtig, wenn die Folge einer der Reihenfolgen entspricht; nicht genannte Teile sind Distraktoren. Rückmeldung
`{ ersteFalschePosition }` (0-basiert, längstes gemeinsames Präfix; `null` wenn richtig). Schrittprüfung möglich.

### 6.4 `lines` – Zeilen eines `sql`- oder `code`-Blocks antippen

```json
"interaktion": { "kind":"lines", "block":1, "anzahl":3 },
"loesung": { "zeilen":[3,4,5] }
```
`block` = Index eines **`sql`- oder `code`-Blocks** in `inhalt`; Zeilen **1-basiert**, Menge exakt,
`zeilen.length == anzahl`. Rückmeldung `{}`.

### 6.5 `match` – Zuordnen

```json
"interaktion": { "kind":"match", "elemente":[{"id":"e1","md":"`WHERE`"}], "kategorien":[{"id":"f","md":"filtert Datensätze"}] },
"loesung": { "e1":"f" }
```
Der Client mischt die Elemente; Kategorien bleiben in Dateireihenfolge. Rückmeldung `{ elemente: { e1: true|false } }`.

### 6.6 `sql` – Abfrage schreiben (Ermittlungskonsole)

```json
"interaktion": { "kind":"sql", "datenbank":"fundbuero", "varianten":["grenze","gleichstand"],
                 "sortierung":[ { "spalte":"Wert", "richtung":"DESC" } ], "aliasPflicht":false, "abimodus":"hinweis" },
"loesung": { "sql": "SELECT Bezeichnung, Wert\nFROM Fundsache\nWHERE Kategorie = 'Wertsachen'\n  AND Wert >= 100\nORDER BY Wert DESC" }
```

| Feld | Pflicht | Bedeutung |
|---|---|---|
| `datenbank` | ja | Name der DB (`seed/datenbanken/<name>`, im Verhör = `kontextDb`) |
| `varianten` | nein | Randfall-Varianten, auf denen zusätzlich geprüft wird: Teilmenge von `null`, `gleichnamig`, `grenze`, `gleichstand`, `leer` (nur solche, die es für die DB gibt). Standard `[]` |
| `sortierung` | nein | Reihenfolge wird nur geprüft, wenn angegeben: Liste `{ spalte, richtung }` (mehrstufig; `spalte` = Spaltenname des **Ergebnisses**, Groß/Klein egal, oder Spaltennummer ab 1; `richtung` `ASC`/`DESC`). Gleichstände dürfen beliebig angeordnet sein |
| `aliasPflicht` | nein | `true` → Spaltennamen des Ergebnisses müssen stimmen (normalisiert: Groß/Klein, Leerzeichen, Umlaute). Standard `false` (nur Spaltenanzahl) |
| `abimodus` | nein | `streng` · `hinweis` (Standard in Ermittlungen) · `aus` (nur Kür K1). Im Verhör immer `streng` |
| `loesung.sql` | ja | Musterlösung im Abi-Stil; muss auf Haupt-DB **und** allen `varianten` laufen, im Abimodus `streng` regelfrei sein und vom Prüfer als richtig erkannt werden (Validator) |

Prüfung (Spec §7.4): Parsen + Regelprüfung im Abimodus, Schüler- und Musterabfrage auf Haupt-DB + allen Varianten
in der Sandbox, Vergleich als Multimenge (Zahlen auf 1e-6, Text getrimmt, NULL eigener Wert), Reihenfolge nur bei
`sortierung`. Richtig ⇔ alle Varianten stimmen. `src/content/pruefer.js` delegiert dazu an eine injizierte Funktion
`sqlPruefer(aufgabe, sql) → Promise<{ ok, diagnose: [{ code, falle, text }], zeilen }>` (Phase 2: `src/sql/pruefer.js`),
der die Aufgabe als `{ datenbank, varianten, sortierung, aliasPflicht, abimodus, loesung: { sql } }` erhält.
Leer: nur Leerraum. Max. 4 000 Zeichen. Rückmeldung `{ diagnose, zeilen }` (Anzahl der Zeilen des **Schüler**ergebnisses).

### 6.7 `zeilen` – Zeilen einer `dbtabelle` antippen

```json
"interaktion": { "kind":"zeilen", "block":2, "mehrfach":true },
"loesung": { "zeilen":[6,7], "quelleSql":"SELECT FundNr, Bezeichnung, Kategorie, Wert FROM Fundsache WHERE FundNr BETWEEN 30 AND 37 AND (…)" }
```

- `block` = Index eines **`dbtabelle`-Blocks** in `inhalt`; `mehrfach` (Standard `true`): `false` → genau eine Zeile.
- `loesung.zeilen`: Zeilenindizes der `dbtabelle`, **0-basiert**, Menge exakt (Reihenfolge egal; leere Menge erlaubt,
  wenn keine Zeile passt).
- `loesung.quelleSql` (optional): Abfrage, deren Ergebnis genau die gemeinten Zeilen sind (gleiche Spalten wie `kopf`).
  Der Validator führt sie auf der `datenbank` (Standard: `quelle.datenbank` des Blocks; sonst `loesung.datenbank`) aus
  und vergleicht die Zeilen mit `zeilen[loesung.zeilen]` als Multimenge.
- Typische Fragen: „Welche Datensätze liefert `WHERE …`?“, „Welche Zeilen sind redundant?“. Leer: nichts angetippt –
  außer die Lösung ist leer, dann zählt eine leere Antwort als Antwort. Rückmeldung `{}`.

### 6.8 `ergebnis` – Ergebnistabelle vorhersagen

```json
"interaktion": { "kind":"ergebnis", "kopf":["Bezeichnung","Wert"], "zeilenAnzahl":3, "reihenfolge":true },
"loesung": { "zeilen":[ ["Messing-Kompass",450], ["Kamera",390], ["Fernglas",180] ],
             "quelleSql":"SELECT Bezeichnung, Wert FROM Fundsache WHERE Kategorie = 'Wertsachen' ORDER BY Wert DESC, Bezeichnung",
             "datenbank":"fundbuero" }
```

| Feld | Bedeutung |
|---|---|
| `kopf` | Spaltenüberschriften der Ergebnistabelle (Pflicht) |
| `zeilenAnzahl` | feste Zeilenzahl: der Client zeigt genau so viele Zeilen. **Oder** |
| `freieZeilen: true` | Zeilen selbst hinzufügen/löschen (die Zeilenzahl ist Teil der Aufgabe) |
| `reihenfolge` | `true` → Liste (Reihenfolge zählt), `false` (Standard) → Multimenge |
| `loesung.zeilen` | erwartetes Ergebnis (Zellen Zahl, Text oder `null`) |
| `loesung.quelleSql`, `loesung.datenbank` | optional: Abfrage und DB; der Validator prüft, dass das echte Ergebnis `loesung.zeilen` entspricht (bei `reihenfolge: true` als Liste) |

Zell-Normalisierung (wie der SQL-Prüfer): leere Zelle oder `NULL` (Groß/Klein egal) = NULL; Zahlen numerisch (Komma =
Punkt) und auf 1e-6 gerundet (`450` = `450,0`); Text Unicode-normalisiert, getrimmt, innerer Leerraum zusammengefasst,
Groß/Klein **beachtet**; ein Text in Hochkommata `'…'` bzw. `"…"` zählt ohne die Hochkommata. Bei `freieZeilen` werden
Zeilen, deren Zellen alle leer sind, ignoriert (eine Zeile aus lauter NULL wird als `NULL` eingetippt). Bei
`zeilenAnzahl` darf die Antwort höchstens so viele Zeilen haben (fehlende = leer). Jede Zeile hat genau
`kopf.length` Zellen. Leer: alle Zellen leer.
Rückmeldung `{ zeilenzahl: "passt" | "zu_viele" | "zu_wenige", nurReihenfolge: true|false }` – keine Zellwerte.

### 6.9 `kernpunkte` – Freitext mit Selbstkontrolle (E7)

```json
"interaktion": { "kind":"kernpunkte", "kernpunkte":[ "nennt den Sachzusammenhang: **noch nicht abgeholte** Fundsachen", "…" ] }
```

Die Schülerin schreibt im Browser (der Text verlässt das Gerät **nie**), deckt die Kernpunkte auf und hakt selbst ab.
An den Server geht nur die **Anzahl der Häkchen** (ganze Zahl 0 … `kernpunkte.length`, oder `{ "haken": n }`); Text in
der Antwort ist ein `AntwortFehler`. Keine `loesung`, `punkte: 0`, Status „bearbeitet“, `ok` ist immer `true`.
Rückmeldung `{ bearbeitet: true, haken: n }`. Nicht im Verhör. Die Kernpunkte werden erst nach dem Aufdecken
ausgeliefert (sie sind die Lösung).

### 6.10 Mehrteilige Aufgaben und Schrittprüfung

- `interaktion` als Array, `loesung` als Array gleicher Länge (bei `kernpunkte`-Teilen `null`); gelöst = alle Teile
  richtig. Antwort = Array je Teil. Rückmeldung `{ teile: [Rückmeldung je Teil] }`.
- Optional je Teil: `frage` (Mini-Markdown, darf Lücken enthalten) und `inhalt` (Blöcke) – werden über dem Teil
  angezeigt. Beginnt `frage` mit „a)“, entfällt die automatische Überschrift „Teil a)“.
- `block` in `lines`/`zeilen` bezieht sich immer auf `inhalt` der **Aufgabe**.
- Schrittprüfung: `{ "antwort": <Teilantwort>, "teilweise": true, "teil": k }` nur für `order` → `ok` und
  Rückmeldung `{ ersteFalschePosition, vollstaendig }`.
- **Bug-Hunt gestuft:** Beginnt eine mehrteilige Aufgabe mit `lines`, zeigt der Client die späteren Teile erst, wenn
  Teil a) richtig ist; dafür ist `teilweise: true, teil: 0` auch für diesen `lines`-Teil erlaubt (`{ ok }`, falsch =
  Fehlversuch). Im Verhör wird Teil a) ohne Rückmeldung „festgelegt“. Teil b) beginnt mit „b)“.

### 6.11 Folgt in Phase 5

| `kind` | Zweck |
|---|---|
| `zellen` | Zellen einer `dbtabelle` antippen (Redundanz, Anomalie-Stelle, Schlüsselkandidat) — *folgt in Phase 5* |
| `anomalie` | Anomalie-Simulator: Szenario wählen, Anomalieart zuordnen, betroffene Zellen — *folgt in Phase 5* |
| `zerlegen` | Zerlegungs-Puzzle (Verlust- und Redundanzfreiheit) — *folgt in Phase 5* |
| `schema` | Schema-Werkbank (Relationen, PK, ↑FK gegen Musterschemata) — *folgt in Phase 5* |
| `er` | Bauplan-Tisch, Modi `lesen`/`ergaenzen`/`entwickeln` (Graph-Abgleich) — *folgt in Phase 5* |

## 7. Antwortformate (API)

| Interaktion | `antwort` |
|---|---|
| gaps | `{ "g1": "7", … }` |
| choice | `["a","c"]` (oder `{ "gewaehlt": [...] }`) |
| order | `["a","b","c"]` (oder `{ "reihenfolge": [...] }`) |
| lines | `[3]` (oder `{ "zeilen": [3] }`) – 1-basiert |
| match | `{ "e1": "f" }` |
| sql | `"SELECT …"` (oder `{ "sql": "SELECT …" }`) |
| zeilen | `[6,7]` (oder `{ "zeilen": [6,7] }`) – 0-basiert |
| ergebnis | `[["Kamera","390"], …]` (oder `{ "zeilen": [...] }`); Zellen Text, Zahl oder `null` |
| kernpunkte | `2` (oder `{ "haken": 2 }`) – nur die Anzahl |
| mehrteilig | Array der Teilantworten |

## 8. Was der Validator prüft (`src/content/validator.js`)

Alles aus Algo Quest §8: Schema (Pflichtfelder, Typen), id-Formate und Eindeutigkeit (auch über Dateien), Verweise
(Ermittlung → Aufgaben, `coldCase`, Verhör-Pool, keine Doppelverwendung, Verhör-Aufgaben nicht in Ermittlungen), Lücken ↔
Felder (jede Lücke hat ein Feld, jedes Feld genau eine Lücke, keine Lücken in Erklärungen), Lösung passt zur Interaktion
(Optionen, ids, Zeilen, Indizes), Mini-Markdown, Punkte/Stufen, Kategorien, Fallen, Verhör-Mix samt `maxJeKind`
erfüllbar und Summe = `anzahl`, Musterantwort wird vom Prüfer als richtig erkannt (`musterantwort`). Dazu:

- `sql`: Datenbank bekannt, Varianten existieren, Musterlösung läuft in der Sandbox auf Haupt-DB + allen Varianten,
  `pruefeRegeln` im Abimodus `streng` ohne Fehler, der Prüfer erkennt die Musterlösung als richtig.
- `ergebnis` und `zeilen` mit `quelleSql`: das echte Ergebnis entspricht der angegebenen Lösung.
- `dbtabelle` mit `quelle`: die Zeilen stimmen mit der DB überein.
- `lines.block` zeigt auf `sql`/`code`, `zeilen.block` auf `dbtabelle`; Indizes im Bereich.
- Verhör: `abimodus: "streng"`, Aufgaben nutzen nur die `kontextDb`; kein `kernpunkte`; kein `datenbank`-Block.
- Cold Cases und `kernpunkte`: `punkte` 0. Niveau-Regeln (Akte 5 ganz `eA`).

Hinweise (keine Fehler): abweichende Punkte, fehlende Erklärung, fehlende Farbe, nicht verwendete Aufgaben, Lösung
ohne Liste bei gaps.
