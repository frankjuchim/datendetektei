# Datendetektei – Aufgabenformat (Seed-Dateien `seed/akten/akte<N>.json`)

Dieses Dokument beschreibt das verbindliche Format der Akten-Dateien so, wie die Plattform es **rendert und prüft**.
Grundlage ist das Aufgabenformat von Algo Quest (`frankjuchim/algoquest`, `docs/AUFGABENFORMAT.md`, Version 2) mit den
Erweiterungen aus Spec §7.5. Begriffe: **Welt = Akte**, **Level = Ermittlung**, **Boss = Verhör** – in JSON, Code und
Manifest bleiben `welt`, `levels`, `boss`.

Eine vollständige Beispieldatei mit jeder Block- und Interaktionsart dieser Phase liegt in
`test/fixtures/akte_beispiel.json` (`welt: 9`, nur für Tests – nicht in `seed/akten` ablegen).

Prüfen: `npm run validate` (alle Dateien in `seed/akten` und `seed/warmup`) oder `node scripts/validate.js <datei> …`
(Optionen `--json`, `--ohne-hinweise`).
Exit-Code 1 bei Fehlern. Prüfer: `src/content/pruefer.js`, Hilfsfunktionen: `src/content/format.js`.

Seit Phase 5 sind alle Blöcke und Interaktionen aus Spec §7.5 verfügbar (Modellierung: Blöcke `er`, `mengen` in §5.7,
Interaktionen `zellen`, `anomalie`, `zerlegen`, `schema`, `er` in §6.11; Prüfung in `src/content/modellierung.js` auf
dem Modellierungs-Kern `src/er`).

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
| `welt` | ja | Aktennummer 1–7 (8 = Kür mit `kuer: true`, 9 nur in der Test-Beispielakte); jede Nummer nur in einer Datei |
| `kuer` | nein | `true` nur für die Kür K1 (`seed/akten/kuer.json`, `welt: 8`), siehe 1.1 |
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

### 1.1 Kür K1 (`seed/akten/kuer.json`, Phase 6)

Die Kür „Eigene Datenbank bauen“ (Spec §3.3, DS_PLANUNG K1) ist eine eigene Welt **8** mit `"kuer": true`:

- ids `K1-E<k>` (Ermittlung) und `K1-E<k>-<nn>` (Aufgaben); kein Verhör (`boss` fehlt).
- Nur eA: Ermittlungen und Aufgaben mit `niveau: "eA"` – im gA-Pfad ist die Kür ausgeblendet (Spec §3.4, §18).
- **Ohne Rangwirkung:** Kür-Punkte zählen zu den Gesamtpunkten, aber nicht zum Rang (Anteil an den Punkten der
  freigeschalteten Akten), nicht zum Abzeichen „Akte geschlossen“, nicht zu den Welten der Verbund-Kursübersicht und
  nicht zum Manifest-`umfang`; das Manifest nennt weiter die sieben Akten (`welten`). Die Lehrkraft schaltet die Kür wie
  eine Akte frei (Einstellung `akten` enthält dann `8`); auf dem Stadtplan steht sie als eigener Abschnitt unter dem Plan.
- Alles sichtbar markiert „KÜR – nicht im Abitur“; `sql`-Aufgaben sind Schreib-Aufgaben (6.6.1).

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
| `aufgaben` | ja | Reihenfolge der Aufgaben der Ermittlung. Jede Aufgabe steht in genau einer Ermittlung; Verhör-Aufgaben und Cold Cases nie. Leer (`[]`) nur in **Akte 7** (Generalprobe, Spec §10): Die Ermittlung „Die Ermittlerprüfung“ trägt nur Briefing und Ermittler-Notiz, geprüft wird im Verhör 7 |

Ziel je Ermittlung (DS_PLANUNG): rund 8 Aufgaben, Stufenmix etwa 40/40/20 % (3/3/2).

**Ermittlung ohne Lab-Aufgaben (Akte 7):** zählt im Manifest-`umfang` als Level, hat 0 Level-Punkte und erscheint
nicht als Spalte der Lehrkraft-Auswertung; das Verhör der Akte ist im Modus `auto` frei, sobald die Akte im Kurs
freigeschaltet ist (keine 60-%-Schwelle ohne Level-Punkte; `gesperrt`/`offen` wie sonst); das Abzeichen „Akte
geschlossen“ gibt es für sie nicht.

### 2.1 Schlussplädoyer `plaedoyer` (Akte 6, Spec §7.7, STORY §7)

Optionales Feld einer Ermittlung: eine Abfolge von `sql`-Aufgaben **derselben Ermittlung**, deren Ergebnisse die
Indizienkette bilden; nach dem letzten Schritt folgen Auflösung und Überleitung zur Erörterung.

```json
"plaedoyer": {
  "titel": "Schlussplädoyer",
  "schritte": ["A6-E1-09", "A6-E1-10", "A6-E1-11", "A6-E1-12", "A6-E1-13", "A6-E1-14"],
  "indizien": {
    "A6-E1-09": "Das Konto ist pseudonym – aber nicht stumm.",
    "…": "…"
  },
  "aufloesung": "Die Indizienkette ist geschlossen: Hinter Nora Falter steht …\n\nAm Morgen nach der Enttarnung …",
  "ueberleitung": "Bevor ihr feiert, schaut auf das, was wir gerade getan haben: … **Durfte die Detektei das?** …"
}
```

| Feld | Pflicht | Regel |
|---|---|---|
| `titel` | nein | Anzeige (Standard „Schlussplädoyer“) |
| `schritte` | ja | ≥ 1 Aufgaben-ids, ohne Doppelte; jede steht in `aufgaben` **dieser** Ermittlung, in derselben Reihenfolge, und ist eine **einteilige `sql`-Aufgabe** |
| `indizien` | ja | genau ein Text je Schritt (Schlüssel = Aufgaben-id), Mini-Markdown, ohne Lücken – das Indiz, das als Karteikarte an die Pinnwand kommt |
| `aufloesung` | ja | Mini-Markdown (Absätze mit Leerzeile), ohne Lücken; erscheint nach dem letzten Schritt |
| `ueberleitung` | nein | Mini-Markdown; Überleitung zur Erörterung (Merkkasten unter der Auflösung) |

**Lösungsdaten:** Indizien, Auflösung und Überleitung bleiben auf dem Server. Ein Indiz wird erst ausgeliefert, wenn
sein Schritt erledigt ist (`geloest`, `nachgeloest` oder `angesehen` – nach „Lösung zeigen“ ist die Musterlösung
ohnehin offen); Auflösung und Überleitung erst, wenn **alle** Schritte erledigt sind. Die Schritte sind normale
Aufgaben (Punkte, Tipps, Prüfung wie immer). API: `GET …/ermittlungen/:id` → `ermittlung.plaedoyer` = `{ titel,
anzahl, erledigt, abgeschlossen, schritte: [{ nr, id, titel, status, indiz? }], aufloesung?, ueberleitung? }` (ohne
Plädoyer `null`); `GET …/aufgaben/:id`, `POST …/pruefen`, `POST …/loesung-zeigen` eines Schritts → zusätzlich
`plaedoyer` = `{ titel, nr, anzahl, erledigt, abgeschlossen, indiz?, aufloesung?, ueberleitung? }`.
Beispiel: Ermittlung `A9-E1` in `test/fixtures/akte_beispiel.json`.

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
| `kontextDb` | ja | Transfer-Datenbank des Verhörs, immer eine Verhör-DB `verhoer/<kontext>` (`seed/datenbanken/verhoer/<kontext>`, `VERHOER_KONTEXTE.md`); in der Beispielakte `verhoer/kiosk`. Verhör-DBs sind **nie** öffentlich unter `/db/`; Ermittlungen dürfen sie nicht verwenden |
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
- Aufgabenstellungen verwenden nur **Operatoren der KM-Liste** (`werkzeuge/operatoren.json`, geprüft von `test/operatoren.test.js`); Bedienhinweise (tippen, wählen, markieren …) sind erlaubt.
- Verhör-Aufgaben sind **gesiezt** und im Abitur-Stil (Operator fett); `kernpunkte` kommt im Verhör nicht vor. Die
  Modellierungs-Interaktionen (`zellen`, `anomalie`, `zerlegen`, `schema`, `er`) und die Blöcke `er`/`mengen` sind im
  Verhör erlaubt (wie alle Verhör-Aufgaben ohne Rückmeldung).
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

Die Zeilen einer `dbtabelle` sind das Ziel der Interaktion `zeilen` (6.7), ihre Zellen das Ziel von `zellen` und
`anomalie` (6.11).

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
`intro` der Ermittlung. Die Kachel zeigt das Schema schon: Ein `schema`-Block in derselben Blockliste, dessen Relationen
alle Tabellen dieser DB sind, wäre doppelt und ist ein Validator-Fehler.

### 5.6 Verstehenshilfen: `zeitlupe`, `spurenbrett`, `sortierfaecher` (Phase 4)

```json
{ "t": "zeitlupe", "datenbank": "stadtfest", "sql": "SELECT …\nFROM …\nWHERE …\nGROUP BY …", "start": "WHERE" }
{ "t": "spurenbrett", "datenbank": "stadtrad",
  "tabellen": [ { "name": "Rad", "zeilen": [2, 3, 10] }, { "name": "Station", "limit": 4 } ],
  "bedingung": "Rad.StationID = Station.StationID" }
{ "t": "sortierfaecher", "datenbank": "stadtfest", "sql": "SELECT ProduktNr, COUNT(*) AS Positionen\nFROM Position\nGROUP BY ProduktNr" }
```

| Feld | Pflicht | Bedeutung |
|---|---|---|
| `datenbank` | ja | öffentliche Akten-DB (`fundbuero` … `eisdiele`); **nie** eine Verhör-DB |
| `sql` | ja (`zeitlupe`, `sortierfaecher`) | die Abfrage des Blocks – EH-konform (Abimodus `streng`), höchstens 10 000 Zeichen; bei `sortierfaecher` mit `GROUP BY` oder Aggregatfunktion |
| `start` | nein (`zeitlupe`) | Klausel, bei der die Zeitlupe beginnt: `FROM`, `WHERE`, `GROUP BY`, `HAVING`, `SELECT`, `ORDER BY` oder `LIMIT`; muss in der Abfrage vorkommen |
| `tabellen` | ja (`spurenbrett`) | zwei oder drei Tabellen `{ name, zeilen? \| limit? }`: `zeilen` = Primärschlüsselwerte (bei zusammengesetztem Schlüssel je Zeile eine Liste), `limit` = die ersten n Zeilen (1–50, Standard 5); nicht beides |
| `bedingung` | nein (`spurenbrett`) | Verbundbedingung (WHERE-Teil ohne `WHERE`); fehlt sie, zeigt das Brett alle Fäden des Kreuzprodukts |

Darstellung: kompakte eingebettete Fassung des Werkzeugs, gerechnet im Browser (sql.js-Worker) auf der öffentlichen
Übungs-DB – Zeitlupe als Schrittliste mit Zählern, Spurenbrett mit Karteikarten und Fäden („6 × 4 = 24 Fäden → 5
bleiben“), Sortierfächer mit Fächern, Aggregaten und Korb – und ein Knopf, der das volle Werkzeug mit genau dieser
Abfrage öffnet (Übergabe per `sessionStorage`). Ohne WebAssembly erscheint der Hinweis der Werkzeuge.

Regeln (Validator):
- Nur in Ermittlungen, Cold Cases und im Intro; **im Verhör verboten** (auch der Seed-Loader lässt solche
  Verhör-Aufgaben aus). Keine Lücken.
- Die Abfrage bzw. das Brett läuft über `src/sql/visual.js` mit better-sqlite3 auf der Haupt-DB (nie Varianten) –
  dieselbe Rechenschicht wie im Browser. `zeilen` müssen existieren; mehr als 2 000 Fäden sind ein Fehler.
- **Keine Lösungsdaten:** `sql` darf (normalisiert: ohne Leerraum, Groß/Klein, `;`) nicht die Musterlösung einer
  `sql`-Aufgabe derselben Akte sein. Ein Block zeigt nur die eigene Abfrage bzw. Tabelle. Was erst nach dem Lösen
  sichtbar sein soll (z. B. das Brett *mit* Bedingung zu einer `zeilen`-Aufgabe, die Sortierfächer zu einer
  `ergebnis`-Aufgabe), gehört in die `erklaerung`.

### 5.7 Modellierung: `er` und `mengen` (Phase 5)

**`er` – ER-Diagramm (Chen) als SVG**

```json
{ "t": "er",
  "graph": {
    "entitaeten": [ { "id": "e1", "name": "Sorte",   "attribute": [ { "name": "SorteNr", "schluessel": true }, { "name": "Name" } ] },
                    { "id": "e2", "name": "Verkauf", "attribute": [ { "name": "VerkaufNr", "schluessel": true }, { "name": "Kugeln" } ] } ],
    "beziehungen": [ { "id": "b1", "name": "wirdVerkauft",
                       "enden": [ { "entitaet": "e1", "kard": "1" }, { "entitaet": "e2", "kard": "n" } ], "attribute": [] } ] },
  "layout": { "e1": { "x": 80, "y": 140 }, "e1.0": { "x": 30, "y": 50 }, "e1.1": { "x": 150, "y": 50 },
              "b1": { "x": 300, "y": 140 },
              "e2": { "x": 520, "y": 140 }, "e2.0": { "x": 470, "y": 50 }, "e2.1": { "x": 590, "y": 50 } },
  "markiert": ["b1"] }
```

| Feld | Pflicht | Bedeutung |
|---|---|---|
| `graph` | ja | Graph-Format des Bauplan-Tischs (Spec §7.6.4): `entitaeten: [{ id, name, attribute: [{ name, schluessel? }] }]`, `beziehungen: [{ id, name, enden: [{ entitaet, kard, rolle? }], attribute: [{ name }] }]`. Kardinalität `1`, `n`, `m`, `p` (`p` nur ternär); 2 Enden (binär; rekursiv = zweimal derselbe Entitätstyp, dann mit `rolle`) oder 3 (ternär). Grenzen: ≤ 30 Entitäts-/Beziehungstypen, ≤ 30 Attribute je Element, Namen ≤ 40 Zeichen. Im Block dürfen Beziehungsname und Kardinalitäten fehlen (z. B. „Was fehlt?“) |
| `layout` | ja | Position `{ x, y }` (Mittelpunkt, SVG-Einheiten 0–5000) für **jedes** Element: Entitätstypen, Beziehungstypen und Attribute – kein Element ohne Position, keine unbekannte Id |
| `markiert` | nein | Liste von Element-Ids, die hervorgehoben werden |

**Element-Ids:** Entitäts- und Beziehungstypen tragen ihre `id` (1–40 Zeichen aus A–Z, a–z, 0–9, `_`, `-`; **kein
Punkt**). Ein Attribut hat die Id **`<id des Elements>.<Index>`** (Index 0-basiert in dessen `attribute`): `e1.0` ist
`SorteNr`, `b1.0` wäre das erste Attribut der Beziehung `b1`. Dieselben Ids gelten für `layout`, `markiert`, den
Lesen-Modus der Interaktion `er` und das Startdiagramm von `ergaenzen`. Darstellung nach DESIGN §4.14 (Rechteck,
Raute, Ellipse, Schlüsselattribute unterstrichen, Kardinalität an der Kante), Textknoten, Tabellenalternative für
Screenreader.

**`mengen` – Mengendiagramm zweier Mengen mit Verbindungslinien (Kardinalitäten)**

```json
{ "t": "mengen",
  "links":  { "name": "Ermittler", "elemente": ["E-01", "E-02"] },
  "rechts": { "name": "Fall",      "elemente": ["F-07", "F-08", "F-09"] },
  "linien": [[0, 0], [0, 1], [1, 2]] }
```

| Feld | Pflicht | Bedeutung |
|---|---|---|
| `links`, `rechts` | ja | `{ name, elemente }`: Name der Menge (≤ 40 Zeichen) und 1–30 Elemente (Text ≤ 40 Zeichen oder Zahl) |
| `linien` | ja | Paare `[i, j]`: Element `i` links ist mit Element `j` rechts verbunden (0-basiert, jedes Paar höchstens einmal; leere Liste erlaubt) |

Beide Blöcke: keine Lücken; erlaubt in `inhalt`, Teil-`inhalt`, `intro`, `erklaerung` und im Verhör. Namen und
Elemente sind Bezeichner bzw. kurze Beispielwerte, keine Freitexte.

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
Leer: nur Leerraum. Max. 4 000 Zeichen. Rückmeldung `{ diagnose, zeilen }` (Anzahl der Zeilen des **Schüler**ergebnisses; `null`, wenn die Abfrage nicht ausgeführt werden konnte).

### 6.6.1 `sql` mit `schreiben: true` – Kür-Sandbox (nur Kür K1)

```json
"interaktion": { "kind": "sql", "schreiben": true, "abimodus": "aus",
                 "start": { "titel": "Detektei-light (Ermittler)", "skript": "CREATE TABLE Ermittler (…);\nINSERT INTO …" } },
"loesung": {
  "sql": "CREATE TABLE Fall (…);\nINSERT INTO Fall VALUES (10, 'Das Phantom', 1);",
  "pruefung": [
    { "text": "Die Tabelle Fall gibt es mit FallNr als Primärschlüssel.",
      "sql": "SELECT SUM(pk > 0) = 1 AND SUM(pk > 0 AND lower(name) = 'fallnr') = 1 FROM pragma_table_info('Fall')" },
    { "art": "skript", "text": "Du verwendest LEFT JOIN … ON.", "muster": "\\bLEFT\\s+JOIN\\b[\\s\\S]*\\bON\\b" },
    { "art": "ergebnis", "text": "Dein letztes SELECT liefert genau die Personen ohne Fall." }
  ]
}
```

Die Schülerin schreibt ein **Skript** (mehrere Anweisungen, getrennt durch `;`). „Ausführen“ und „Prüfen“ laufen
immer auf dem Server in der Sandbox (Kindprozess, `src/sql/sandbox.js` `fuehreSkriptAus`): je Anfrage eine **frische
In-Memory-DB** – leer, eine Kopie einer öffentlichen Übungs-DB (`start.datenbank`) oder aus dem Startskript
(`start.skript`) –, `PRAGMA foreign_keys = ON`, danach das Skript. Nichts bleibt gespeichert; das Skript liegt nur im
`localStorage` des Geräts. Ausführen: `POST /api/kurse/:kurs/aufgaben/:id/skript { skript }` (Protokoll je Anweisung,
Ergebnis des letzten `SELECT`, Schema; leeres Skript = nur das Startschema).

| Feld | Pflicht | Bedeutung |
|---|---|---|
| `schreiben` | ja | `true` – nur in der Kür-Akte (und der Test-Beispielakte) |
| `abimodus` | ja | immer `"aus"` (keine Abitur-Regeln; die Konsole zeigt das Band „KÜR – nicht im Abitur“ mit dem Hinweis auf `FROM … WHERE`) |
| `start` | nein | `{ titel }` (leere DB), `{ titel, datenbank }` (Kopie einer öffentlichen Übungs-DB) oder `{ titel, skript }` (Startskript, ≤ 20 000 Zeichen). An den Browser geht nur `titel` |
| `datenbank`, `varianten`, `sortierung`, `aliasPflicht` | – | gibt es hier nicht |
| `loesung.sql` | ja | Musterskript (≤ 10 000 Zeichen, nur erlaubte Anweisungen) |
| `loesung.pruefung` | ja | 1–30 Prüfpunkte (Tabelle unten); `text` ist die Rückmeldung an die Schülerin – ohne Lösungsdaten formulieren |

| `art` | Felder | erfüllt, wenn … |
|---|---|---|
| `abfrage` (Standard) | `sql` | die Prüfabfrage auf der DB nach dem Skript genau einen wahren Wert liefert (eine Zeile, eine Spalte, ≠ 0/NULL/'') – z. B. über `sqlite_master`, `pragma_table_info('T')`, `pragma_foreign_key_list('T')`, Zählabfragen |
| `gleich` | `sql` | die Prüfabfrage dasselbe Ergebnis (Multimenge) liefert wie auf der DB nach dem Musterskript |
| `daten` | `min` | jede eigene (nicht vom Start mitgebrachte) Tabelle mindestens `min` Datensätze hat |
| `ergebnis` | – | das letzte `SELECT` des Skripts dasselbe Ergebnis liefert wie das letzte `SELECT` des Musterskripts (Multimenge, Spaltenanzahl und -reihenfolge zählen, Spaltennamen nicht) |
| `zeilen` | `min` | das letzte `SELECT` mindestens `min` Zeilen liefert |
| `skript` | `muster` | der reguläre Ausdruck (ohne Groß/Klein) auf das Skript ohne Texte und Kommentare passt |

Prüfabfragen stammen aus dem Inhalt (dürfen also `pragma_…` nutzen) und laufen nur lesend (`query_only`). Richtig ⇔ das
Skript läuft ohne Fehler und alle Prüfpunkte sind erfüllt. Rückmeldung `{ diagnose, pruefpunkte: [{ text, ok }] }`;
bricht das Skript ab, `pruefpunkte: null` und eine Diagnose „Anweisung n (Zeile z): …“ (deutsche Texte aus
`src/sql/fehlertexte_schreiben.js`, z. B. „Fremdschlüssel verletzt …“). Schreib-Skripte landen nie in den
Fehlabfragen. Max. 10 000 Zeichen.

**Sandbox-Grenzen** (je Anfrage): Zeitlimit 1,5 s für Startskript + Skript + Prüfabfragen (danach SIGKILL), höchstens
200 Anweisungen, 20 eigene Tabellen, 500 Datensätze je Tabelle (Starttabellen: mindestens ihr Startbestand), 1 MB
zusätzlicher Speicher (`max_page_count`), 5 000 Ergebniszeilen (angezeigt 300). Verboten (außerhalb von Texten und
Kommentaren): `ATTACH`, `DETACH`, `PRAGMA` (auch `pragma_…`), `VACUUM`, `load_extension`, `TEMP`/`TEMPORARY`,
`TRIGGER`, `VIEW`, `VIRTUAL`, Punkt-Befehle – Begründung in `src/sql/skript.js`.

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
- **`kernpunkte`-Teile neben anderen Teilen** (z. B. Cold Cases): Beim Prüfen gilt der Teil als bearbeitet (Häkchen-
  Anzahl, vor dem Lösen 0) und zählt weder für „richtig“ noch für „leer“ – sind nur die kernpunkte-Teile ausgefüllt,
  ist die Antwort leer (kein Fehlversuch). Gelöst ist die Aufgabe, wenn alle übrigen Teile richtig sind; dann werden
  die Kernpunkte aufgedeckt (`loesung.kernpunkte`: Liste je Teil, sonst `null`). Die Selbstkontrolle geht danach (oder
  nach „Lösung zeigen“) an `POST …/kernpunkte` mit `{ haken: n }` bzw. bei mehreren kernpunkte-Teilen
  `{ haken: [n je kernpunkte-Teil] }`; gespeichert wird die Summe, der Status bleibt. Vorher: 400. Nie Freitext.
- Optional je Teil: `frage` (Mini-Markdown, darf Lücken enthalten) und `inhalt` (Blöcke) – werden über dem Teil
  angezeigt. Beginnt `frage` mit „a)“, entfällt die automatische Überschrift „Teil a)“.
- `block` in `lines`/`zeilen` bezieht sich immer auf `inhalt` der **Aufgabe**.
- Schrittprüfung: `{ "antwort": <Teilantwort>, "teilweise": true, "teil": k }` nur für `order` → `ok` und
  Rückmeldung `{ ersteFalschePosition, vollstaendig }`.
- **Bug-Hunt gestuft:** Beginnt eine mehrteilige Aufgabe mit `lines`, zeigt der Client die späteren Teile erst, wenn
  Teil a) richtig ist; dafür ist `teilweise: true, teil: 0` auch für diesen `lines`-Teil erlaubt (`{ ok }`, falsch =
  Fehlversuch). Im Verhör wird Teil a) ohne Rückmeldung „festgelegt“. Teil b) beginnt mit „b)“.

### 6.11 Modellierung: `zellen`, `anomalie`, `zerlegen`, `schema`, `er` (Phase 5)

Gemeinsam: Prüfung in `src/content/modellierung.js` (auf `src/er`). Was der Browser zum Bedienen braucht, steht in
`interaktion` und wird **genau mit diesen Feldern** ausgeliefert (dazu `kind`, `frage`, `inhalt`); alles andere –
Muster, Synonyme, FAs, Zellen, Anomalieart – steht in `loesung` und verlässt den Server erst nach dem Lösen. Ein
anderes Feld in `interaktion` ist ein Validator-Fehler. Namen in Antworten sind Bezeichner (≤ 40 Zeichen, ≤ 30 Elemente
je Art), keine Freitexte (E7) – gespeichert wird nur richtig/falsch und Punkte. Grenzen überschritten, falscher Typ
oder unbekannte Zelle/Spalte/Id → `AntwortFehler` (400, kein Fehlversuch). Alle fünf sind im Verhör erlaubt.

**`zellen` – Zellen einer `dbtabelle` antippen** (Redundanz, Anomalie-Stelle, Schlüsselkandidat)

```json
"interaktion": { "kind": "zellen", "block": 1, "mehrfach": true, "reihenfolge": false },
"loesung": { "zellen": [[1, 4], [3, 4]] }
```

| Feld | Bedeutung |
|---|---|
| `block` | Index eines `dbtabelle`-Blocks in `inhalt` (Pflicht) |
| `mehrfach` | Standard `true`; `false` → genau eine Zelle |
| `reihenfolge` | Standard `false` (Menge); `true` → die Reihenfolge des Antippens zählt (Liste) |
| `loesung.zellen` | `[zeile, spalte]`, **0-basiert**, ohne Doppelte; leere Menge erlaubt |

Leer: nichts angetippt (außer die Lösung ist leer). Rückmeldung `{}`.

**`anomalie` – Anomalie-Simulator** (Spec §7.6.6)

```json
"interaktion": { "kind": "anomalie", "block": 1, "auftrag": "Trainer **Hollmann** hat eine neue Telefonnummer: 0421-99.",
                 "operation": "aendern", "simulation": { "spalte": 4, "alt": "0421-11", "neu": "0421-99" } },
"loesung": { "art": "aenderung", "zellen": [[0, 4], [1, 4], [3, 4]] }
```

| Feld | Bedeutung |
|---|---|
| `block` | Index der `dbtabelle` (die Rohtabelle; der Simulator arbeitet auf einer **Kopie** im Browser) |
| `auftrag` | Text der Auftragskarte (Mini-Markdown) |
| `operation` | `aendern` · `loeschen` · `einfuegen` |
| `simulation` | Angaben für den Simulator: `aendern` `{ spalte, alt, neu }` (Zellen der Spalte mit Wert `alt` sollen `neu` werden; `alt` kommt in der Spalte vor) · `loeschen` `{ zeilen: [i, …] }` (zu löschende Zeilen) · `einfuegen` `{ werte: [Zelle je Spalte] }` (bekannte Werte der neuen Zeile, `null` = müsste leer bleiben) |
| `loesung.art` | `einfuegung` · `aenderung` · `loeschung` · `keine` |
| `loesung.zellen` | betroffene Zellen `[zeile, spalte]` (0-basiert); bei `einfuegen` hat die neue Zeile den Index `zeilen.length` |

Den Widerspruch bzw. Informationsverlust berechnet der Browser aus den sichtbaren Daten (z. B. Spaltenpaare, deren
Gleichheit vorher galt und nach der Änderung verletzt ist; Werte, die nach dem Löschen nirgends mehr stehen). Antwort
`{ art, zellen }`. Leer: keine Art und keine Zelle. Richtig ⇔ Art und Zellenmenge stimmen. Rückmeldung
`{ art: "ok"|"falsch", zellen: "ok"|"falsch" }` – ohne Lösungswerte.

**`zerlegen` – Zerlegungs-Puzzle** (Verlust- und Redundanzfreiheit)

```json
"interaktion": { "kind": "zerlegen", "attribute": ["Abteilung", "Trainer", "TrainerTelefon", "Halle"], "tabellenMax": 4 },
"loesung": { "fa": [ { "links": ["Abteilung"], "rechts": ["Trainer", "Halle"] }, { "links": ["Trainer"], "rechts": ["TrainerTelefon"] } ],
             "schluessel": ["Abteilung"],
             "muster": [ { "tabellen": [ { "attribute": ["Abteilung", "Trainer", "Halle"], "schluessel": ["Abteilung"] },
                                         { "attribute": ["Trainer", "TrainerTelefon"], "schluessel": ["Trainer"] } ] } ] }
```

| Feld | Bedeutung |
|---|---|
| `attribute` | Spaltenchips der Rohtabelle (2–30, eindeutig) – die Namen, die die Schüler sehen |
| `tabellenMax` | höchstens so viele Tabellen (1–30, Standard 30) |
| `loesung.fa` | funktionale Abhängigkeiten `{ links, rechts }`, alle Spalten aus `attribute` (Format wie `seed/datenbanken/tus/LIESMICH.md`) |
| `loesung.schluessel` | optional: Schlüssel der Rohtabelle (muss Schlüsselkandidat sein) |
| `loesung.muster` | optional: Musterzerlegungen `[{ tabellen }]` (nur Anzeige nach dem Lösen und Musterantwort); fehlt es, ist eine berechnete BCNF-Zerlegung die Musterantwort |

Prüfung `pruefeZerlegung` (Spec §7.6.6): gelöst ⇔ alle Spalten verteilt, verlustfrei (Chase), jede Tabelle mit
richtigem, minimalem Schlüssel und ohne Redundanz (jede projizierte FA hat links einen Schlüssel). Jede Zerlegung, die
das erfüllt, ist richtig – nicht nur die Muster. Antwort `{ tabellen: [{ attribute, schluessel }] }` (nur Spalten aus
`attribute`, Schlüssel ⊆ Tabelle); leere Tabellen werden ignoriert. Leer: keine Tabelle mit Spalten. Rückmeldung
`{ vollstaendig, verlustfrei, redundanzfrei, tabellen: [{ ok, hinweise: [{ code, text }] }], hinweise }` – Hinweise je
Tabelle (Index wie in der Antwort) mit den Codes aus `src/er/zerlegung.js` (`SCHLUESSEL_FEHLT`, `REDUNDANZ` „TrainerTelefon
hängt von Trainer ab, nicht vom Schlüssel (Abteilung) – Redundanz bleibt.“ …); Texte nennen nur Spalten der Aufgabe.

**`schema` – Schema-Werkbank** (Relationen, PK, ↑FK gegen Musterschemata)

```json
"interaktion": { "kind": "schema", "modus": "schluessel",
                 "start": [ { "name": "Sorte", "attribute": [ { "name": "SorteNr" }, { "name": "Name" } ] },
                            { "name": "Verkauf", "attribute": [ { "name": "VerkaufNr" }, { "name": "Kugeln" }, { "name": "SorteNr" } ] } ] },
"loesung": { "muster": [ [ { "name": "Sorte", "attribute": [ { "name": "SorteNr", "pk": true }, { "name": "Name" } ] },
                           { "name": "Verkauf", "attribute": [ { "name": "VerkaufNr", "pk": true }, { "name": "Kugeln" }, { "name": "SorteNr", "fk": "Sorte" } ] } ] ],
             "synonyme": { "Verkauf": ["Bestellung"] } }
```

| Feld | Bedeutung |
|---|---|
| `modus` | `schluessel`: Relationen und Attribute stehen fest (aus `start`), nur PK (`pk`) und FK (`fk` + Zielrelation) werden gesetzt · `frei`: Relationen und Attribute selbst anlegen |
| `start` | Startzustand: Relationen im Format des Blocks `schema` (§5.3); Pflicht bei `schluessel`, bei `frei` optional |
| `loesung.muster` | Liste zulässiger Schemata (je eine Liste von Relationen oder `{ relationen }`) |
| `loesung.synonyme` | optional `{ "Name": ["Synonym", …] }` für Relationen und Attribute |

Antwort `{ relationen }` (ganz leere Karten – ohne Name und Attribute – entfallen). Formfehler (`pruefeSchemaForm`:
Name fehlt, doppelt, FK auf eine nicht vorhandene Relation, Grenzen) und im Modus `schluessel` jede andere Relationen-
oder Attributmenge als im Start → `AntwortFehler`. Leer: keine Relation oder unverändert wie `start`. Prüfung
`gleicheSchemaAb` (Name/Attributmenge zuordnen, PK, FK samt Ziel, abweichende FK-Namen nach Rolle zulässig).
Rückmeldung `{ relationen: [{ name, ok, hinweise: [{ code, text, falle }] }], fehlend, ueberzaehlig, hinweise }` –
`name` und Texte nennen nur Relationen und Attribute des Schülers; Fehlendes nur als Anzahl bzw. Code (`RELATION_FEHLT`,
`NM_OHNE_TABELLE`).

**`er` – Bauplan-Tisch** (Modi `lesen`, `ergaenzen`, `entwickeln`; Spec §7.6.4)

```json
"interaktion": { "kind": "er", "modus": "ergaenzen",
                 "start": { "graph": { "entitaeten": [ … ], "beziehungen": [] }, "layout": { "e1": { "x": 80, "y": 120 }, "e1.0": { … }, … } } },
"loesung": { "muster": [ { "entitaeten": [ … ], "beziehungen": [ { "id": "mb1", "name": "leitet", "enden": [ { "entitaet": "m1", "kard": "1" }, { "entitaet": "m2", "kard": "n" } ], "attribute": [] } ] } ],
             "synonyme": { "Ermittler": ["Detektiv"] }, "aequivalenzen": ["nm_aufgeloest"], "kriterien": ["beziehungen", "kardinalitaeten"] }

"interaktion": { "kind": "er", "modus": "lesen", "block": 1 },
"loesung": { "elemente": ["e1", "e2", "b1", "e1.0", "e2.0"] }

"interaktion": { "kind": "er", "modus": "lesen", "block": 1, "kategorien": [ { "id": "ent", "md": "Entitätstyp" }, { "id": "rolle", "md": "Rolle" } ] },
"loesung": { "zuordnung": { "e1": "ent", "e2": "ent" } }
```

| Feld | Bedeutung |
|---|---|
| `modus` | `lesen` (Elemente eines gegebenen Diagramms antippen bzw. Kategorien zuordnen) · `ergaenzen` (Startdiagramm vervollständigen) · `entwickeln` (leere Zeichenfläche) |
| `block` | nur `lesen`: Index eines `er`-Blocks in `inhalt` |
| `kategorien` | nur `lesen`: `[{ id, md }]` (≥ 2) → Zuordnungs-Modus; ohne → Antipp-Modus |
| `start` | nur `ergaenzen` (Pflicht): `{ graph, layout }` wie Block `er`; Kardinalitäten und Beziehungsnamen dürfen fehlen (sie sind zu ergänzen) |
| `loesung.muster` | `ergaenzen`/`entwickeln`: Liste zulässiger Graphen (vollständig, Chen-konform); die beste zählt |
| `loesung.synonyme`, `aequivalenzen`, `kriterien` | optional: Synonymgruppen; `nm_aufgeloest` (n:m ↔ Zwischenentität mit zwei 1:n), `attribut_an_n_seite`; Teilmenge der Kriterien `entitaeten`, `schluessel`, `attribute`, `beziehungen`, `kardinalitaeten`, `beziehungsattribute` (Standard: alle) |
| `loesung.elemente` / `loesung.zuordnung` | `lesen`: Menge der richtigen Element-Ids bzw. `{ Element-Id: Kategorie-id }` (Ids siehe §5.7, Attribute `<id>.<i>`) |

- **Lesen:** Antwort `{ elemente }` bzw. `{ zuordnung }` (leere Kategorie = nicht zugeordnet), nur Ids des Blocks.
  Richtig ⇔ Menge bzw. Zuordnung exakt (`pruefeLesen`). Leer: nichts gewählt. Rückmeldung `{}`.
- **Ergänzen/Entwickeln:** Antwort = Graph (Ids frei, Layout bleibt im Browser). Prüfung `gleicheAb` gegen alle
  Muster (Namen mit Synonymen, Groß/Klein, Singular/Plural; Beziehungsnamen frei; Kardinalitäten strukturell 1 vs.
  viele, Richtung zählt; Äquivalenzen). Gelöst ⇔ alle Kriterien erfüllt – bei `ergaenzen` zusätzlich müssen alle
  Elemente des Startdiagramms (Entitätstypen, Beziehungstypen, Attribute – über ihre Namen) noch vorhanden sein, sonst
  falsch mit Hinweis `START_FEHLT`. Leer: kein Element bzw. unverändertes Startdiagramm. Rückmeldung
  `{ kriterien: [{ id, text, ok, falle?, teile: [{ text, ok }] }], richtig, gesamt, hinweise: [{ code, text, falle }] }`
  („2 von 4 Entitätstypen gefunden“, „Kardinalität zwischen „Ermittler“ und „Fall“ falsch“) – Texte nennen nur Namen,
  die der Schüler selbst verwendet hat, nie Namen der Musterlösung.

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
| zellen | `[[1,4],[3,4]]` (oder `{ "zellen": [...] }`, Zelle auch `{ "zeile", "spalte" }`) – 0-basiert |
| anomalie | `{ "art": "aenderung", "zellen": [[0,4]] }` – `art` leer `""` = noch nicht gewählt |
| zerlegen | `{ "tabellen": [ { "attribute": ["Trainer","TrainerTelefon"], "schluessel": ["Trainer"] } ] }` (oder die Liste) |
| schema | `{ "relationen": [ { "name": "Sorte", "attribute": [ { "name": "SorteNr", "pk": true }, … ] } ] }` (oder die Liste) |
| er (`ergaenzen`, `entwickeln`) | Graph `{ "entitaeten": [...], "beziehungen": [...] }` (oder `{ "graph": …, "layout": … }` – das Layout bleibt im Browser) |
| er (`lesen`) | `{ "elemente": ["e1","e1.0"] }` (oder die Liste) bzw. mit `kategorien` `{ "zuordnung": { "e1": "ent" } }` |
| mehrteilig | Array der Teilantworten |

## 8. Was der Validator prüft (`src/content/validator.js`)

Alles aus Algo Quest §8: Schema (Pflichtfelder, Typen), id-Formate und Eindeutigkeit (auch über Dateien), Verweise
(Ermittlung → Aufgaben, `coldCase`, Verhör-Pool, keine Doppelverwendung, Verhör-Aufgaben nicht in Ermittlungen), Lücken ↔
Felder (jede Lücke hat ein Feld, jedes Feld genau eine Lücke, keine Lücken in Erklärungen), Lösung passt zur Interaktion
(Optionen, ids, Zeilen, Indizes), Mini-Markdown, Punkte/Stufen, Kategorien, Fallen, Verhör-Mix samt `maxJeKind`
erfüllbar und Summe = `anzahl`, Musterantwort wird vom Prüfer als richtig erkannt (`musterantwort`). Dazu:

- `sql`: Datenbank bekannt, Varianten existieren, Musterlösung läuft in der Sandbox auf Haupt-DB + allen Varianten,
  `pruefeRegeln` im Abimodus `streng` ohne Fehler, der Prüfer erkennt die Musterlösung als richtig.
- `sql` mit `LIMIT`: `ORDER BY` ist Pflicht, und auf Haupt-DB und jeder genannten Variante darf an der Schnittkante kein
  Gleichstand liegen (Spec §6.2; die Variante `gleichstand` deckt das auf) – sonst wäre die Musterlösung zufällig.
- `sortierung` nennt nur Spalten, die das Ergebnis der Musterlösung hat.
- Datenbanken: Ermittlungen und Cold Cases nutzen nur öffentliche Akten-DBs (`sql.datenbank`, `quelle.datenbank`,
  `loesung.datenbank`, Block `datenbank`); Verhör-Aufgaben nur die `kontextDb`, und `kontextDb` ist eine Verhör-DB.
- `ergebnis` und `zeilen` mit `quelleSql`: das echte Ergebnis entspricht der angegebenen Lösung (`ergebnis` braucht
  dazu `loesung.datenbank`).
- `dbtabelle` mit `quelle`: die Zeilen stimmen mit der DB überein.
- `zeitlupe`, `spurenbrett`, `sortierfaecher` (5.6): öffentliche Akten-DB, nicht im Verhör, Abfrage EH-konform und über
  `visual.js` darstellbar (`start` kommt vor, Sortierfächer mit Gruppen, `zeilen` vorhanden, ≤ 2 000 Fäden), Block-SQL ≠
  Musterlösung einer `sql`-Aufgabe derselben Akte.
- `sql` mit `schreiben: true` (6.6.1): nur in der Kür (`kuer: true`) bzw. der Test-Beispielakte, `abimodus: "aus"`,
  kein `datenbank`/`varianten`/`sortierung`/`aliasPflicht`; `start` mit `titel` und höchstens einem von `datenbank`
  (öffentliche Übungs-DB) oder `skript`; Musterskript zulässig (verbotene Wörter, Länge, Anweisungen), läuft samt Start
  in der Sandbox und erfüllt **jeden** Prüfpunkt (Fehler nennt den Prüfpunkt); Prüfpunkte mit bekannter `art` und
  passenden Feldern, `muster` als regulärer Ausdruck gültig; **Gegenprobe:** mit dem Skript `SELECT 1;` darf nicht
  jeder Prüfpunkt erfüllt sein.
- Kür (`kuer: true`): `welt` 8 (und `welt` 8 nur mit `kuer`), kein Verhör, ids `K1-E<k>` / `K1-E<k>-<nn>`, alles
  `niveau: "eA"`.
- `lines.block` zeigt auf `sql`/`code`, `zeilen.block` auf `dbtabelle`; Indizes im Bereich.
- Verhör: `abimodus: "streng"`, Aufgaben nutzen nur die `kontextDb`; kein `kernpunkte`; kein `datenbank`-Block und keine Verstehenshilfen;
  Mix je Stufe samt `maxJeKind` erfüllbar (maximaler Fluss Stufe → Art), sonst Fehler; für gA-Kurse (nur `alle`) Hinweis.
- `plaedoyer` (§2.1): Schritte existieren in der Ermittlung, einteilige `sql`-Aufgaben, Reihenfolge wie in `aufgaben`,
  keine Doppelten; genau ein Indiz je Schritt; `aufloesung` Pflicht; Mini-Markdown ohne Lücken; keine weiteren Felder.
- Cold Cases und `kernpunkte`: `punkte` 0. Niveau-Regeln (Akte 5 ganz `eA`: Ermittlungen und Verhör mit
  `niveau: "eA"`, keine Aufgabe mit `niveau: "alle"`).
- Modellierung (§5.7, §6.11; `src/content/modellierung.js`):
  - Block `er`: Graph wohlgeformt (`pruefeGraphForm`), Ids im Block-Format, `layout` für jedes Element (Attribute
    `<id>.<i>`), keine unbekannten Ids in `layout`/`markiert`, keine weiteren Felder. Block `mengen`: Seiten mit Namen
    und 1–30 Elementen, Linien-Indizes gültig, keine doppelte Linie.
  - Neue Interaktionen enthalten nur ihre öffentlichen Felder (§6.11) – ein anderes Feld (z. B. `fa` oder `muster` in
    `interaktion`) ist ein Fehler, denn `interaktion` geht an den Browser.
  - `zellen`/`anomalie`: `block` zeigt auf eine `dbtabelle`, Lösungszellen existieren (bei `einfuegen` auch die neue
    Zeile), keine doppelten Zellen; `mehrfach: false` = genau eine Zelle. `anomalie`: `art` ∈ einfuegung, aenderung,
    loeschung, keine; `operation` ∈ aendern, loeschen, einfuegen; `simulation` passt zur Tabelle (`alt` kommt in der
    Spalte vor, Zeilen existieren, `werte` so lang wie `kopf`); Hinweis, wenn `art` nicht zur Operation passt.
  - `zerlegen`: 2–30 eindeutige Spalten, FA-Spalten ⊆ `attribute`, `schluessel` ist Schlüsselkandidat, jede
    Musterzerlegung ist laut `pruefeZerlegung` gelöst (und hält `tabellenMax` ein); ohne `muster` muss die berechnete
    BCNF-Zerlegung gelöst sein (sie ist dann die Musterantwort).
  - `schema`: `modus`; `start` wohlgeformt (`pruefeSchemaForm`; Pflicht bei `schluessel`); jedes Muster wohlgeformt,
    ohne Umlaute, mit Primärschlüssel je Relation und vom Schema-Abgleich als gelöst erkannt; bei `schluessel`
    dieselben Relationen und Attribute wie `start`.
  - `er`: `modus`; `lesen` mit `block` auf einen `er`-Block und `elemente` bzw. (mit `kategorien`) `zuordnung` nur mit
    vorhandenen Ids und Kategorien; `ergaenzen` mit `start { graph, layout }` (Kardinalitäten dürfen fehlen);
    `entwickeln` ohne `start`. Jedes Muster vollständig (`pruefeGraphForm` mit `vollstaendig`) und Chen-konform:
    Entitätstypen beginnen groß (Singular, ohne Umlaute/Leerzeichen), Beziehungstypen lowerCamelCase, jeder
    Entitätstyp hat ein Schlüsselattribut, `p` nur ternär, Attribute und Rollen ohne Umlaute; das Muster erfüllt sich
    selbst (`gleicheAb` → gelöst); das Startdiagramm ist Teil **jedes** Musters (Namen samt Synonymen, Attribute,
    Schlüssel, gesetzte Kardinalitäten). `synonyme`, `aequivalenzen`, `kriterien` mit gültigen Werten.
  - Die Musterantwort (Muster, Musterzerlegung bzw. berechnete Zerlegung, Lösungszellen) erkennt der Prüfer als richtig.

- ids: `A<n>-E<k>-<nn>` (steht in der Ermittlung `A<n>-E<k>`), `A<n>-E<k>-CC` (nur als `coldCase` von `A<n>-E<k>`),
  `A<n>-V-<nn>` (nur im Verhör-Pool); `n` = `welt`; eindeutig über alle Dateien, jede `welt` nur einmal.

Hinweise (keine Fehler): abweichende Punkte, fehlende Erklärung, fehlende Farbe, nicht verwendete Aufgaben, Lösung
ohne Liste bei gaps, Verhör mit `anzahl` außerhalb 6–8 bzw. Pool außerhalb 12–15, Briefing mit mehr als drei Sätzen,
Musterlösung ohne Ergebniszeile, `welt: 9` (Testakte).

Aufruf als Modul: `validiereAkten([{ name, json }], { datenbanken, sandbox, sqlPruefer }) → Promise<{ fehler, hinweise,
aufgaben, karten }>` (Einträge `{ datei, id?, text }`); Warm-up-Dateien werden am Namen (`warmup…`) bzw. an `karten`
erkannt.

## 9. Warm-up-Karten (`seed/warmup/warmup_a<n>.json`)

Karten für den Warm-up-Trainer (Leitner, ohne Punkte; Spec §7.8) und die Papierkarten (DS_PLANUNG „Warm-up-Karten“).
Beispiel: `test/fixtures/warmup_beispiel.json`.

```json
{ "version": 1, "karten": [
  { "id": "W-A1-06", "akte": 1, "kategorie": "SQL eine Tabelle", "titel": "Die NULL-Falle",
    "aufgabe": "Erkläre, warum diese Abfrage keine Zeile liefert, und korrigiere die Bedingung.",
    "sql": "SELECT Bezeichnung\nFROM Fundsache\nWHERE AbgeholtAm = NULL", "datenbank": "fundbuero",
    "loesung": "Ein Vergleich mit NULL ergibt nie wahr. Richtig ist `IS NULL`.",
    "loesungSql": "SELECT Bezeichnung\nFROM Fundsache\nWHERE AbgeholtAm IS NULL",
    "minuten": 2, "kompetenz": ["DB-K18"], "falle": ["P5"] } ] }
```

| Feld | Pflicht | Regel |
|---|---|---|
| `id` | ja | `W-A<n>-<nn>`, eindeutig; `n` = `akte` = Nummer im Dateinamen |
| `akte` | ja | Akte, deren Inhalt die Karte wiederholt (1–7) |
| `kategorie` | ja | ein Wert aus KATEGORIEN (§4) |
| `titel`, `aufgabe`, `loesung` | ja | Texte (Mini-Markdown, geduzt); `loesung` erst nach dem Aufdecken |
| `sql` | nein | SQL, das auf der Karte gezeigt wird – darf absichtlich fehlerhaft sein (wird nicht geprüft) |
| `datenbank` | bei `sql`/`loesungSql` | öffentliche Akten-DB (`fundbuero` …), nie eine Verhör-DB |
| `loesungSql` | nein | Lösungsabfrage: muss auf `datenbank` laufen, im Abimodus `streng` regelfrei sein, bei `LIMIT` eindeutig |
| `minuten` | ja | Bearbeitungszeit 1–15 |
| `kompetenz` | ja | Liste von Kompetenz-IDs `DB-K01` … `DB-K48` (Kurzform `K01` erlaubt) |
| `falle` | nein | Liste aus `P1` … `P10` (leer oder `null`, wenn keine) |

## 10. Gastmodus: Probefall (`seed/gast/probefall.json`)

Der Probefall „Eisdiele Weserstedt“ (Spec §7.12, STORY.md §11) ist ein **eigenes kleines Format**: Er wird nicht in
die Plattform-DB eingespielt, nichts daran wird gespeichert (keine Fehlversuche, keine Tipps, keine Punkte).
Die Aufgaben selbst haben dasselbe Format wie Akten-Aufgaben (§4–§7).

```json
{ "version": 1, "titel": "Probefall Eisdiele Weserstedt", "datenbank": "eisdiele",
  "briefing": "Pia Wendland … (höchstens drei Sätze)",
  "intro": [ { "t": "schema", "relationen": [ … ] }, { "t": "hinweis", "md": "…" } ],
  "aufgaben": [ { "id": "G-01", "titel": "…", "stufe": 1, "kategorie": "SQL eine Tabelle",
                  "kompetenzen": ["DB-K15"], "fallen": ["P5"], "inhalt": [ … ],
                  "interaktion": { "kind": "sql", "datenbank": "eisdiele" },
                  "loesung": { "sql": "SELECT …" }, "tipps": ["…"], "erklaerung": [ … ] } ] }
```

| Feld | Regel |
|---|---|
| `version` | immer `1` |
| `datenbank` | immer `eisdiele`; jede Datenbank-Angabe der Aufgaben (`sql.datenbank`, `loesung.datenbank`, `quelle.datenbank`, Block `datenbank`) muss `eisdiele` sein |
| `briefing`, `intro` | wie bei einer Ermittlung (§2) |
| `aufgaben` | **genau 6** Aufgaben, ids `G-<nn>`; Mix aus `sql` (2–3), `zeilen`, `ergebnis`, `choice`; kein `kernpunkte` |

**Nie echte Aufgaben** (Spec §6.4): Der Validator (`validiereProbefall`, läuft in `npm run validate`) lehnt eine id aus
`seed/akten` und jeden Text (ab 20 Zeichen, Groß/Klein und Leerraum egal) ab, der in einer Akten-Aufgabe vorkommt
(Titel, Inhalt, Interaktion, Lösung, Tipps, Erklärung). Die Aufgaben selbst prüft er intern als Test-Akte (welt 9, eine
Ermittlung) mit allen Regeln aus §8 – jede SQL-Lösung läuft also in der Sandbox, ist im Abimodus `streng` regelfrei und
wird vom Prüfer erkannt; `ergebnis`/`zeilen` mit `quelleSql` werden gegen die DB geprüft.

**API (ohne Anmeldung, Rate-Limit je IP):** `GET /api/gast/probefall` (öffentliche Sicht wie §4.2, mit `tippsAnzahl`),
`POST /api/gast/aufgaben/:id/pruefen` `{ antwort }` → `{ ok, rueckmeldung, geloest, loesung? }` (Lösung und Erklärung
nur nach dem Lösen), `POST …/tipp` `{ nr }` → `{ nr, tipp, anzahl }`, `POST …/loesung` → `{ loesung, erklaerung }`
(nur auf ausdrücklichen Wunsch – im Gastmodus erlaubt, weil es reine Demo-Aufgaben sind).

## 11. Fallebene: Beweisstücke und Steckbrief (`seed/fallebene.json`)

Daten der Pinnwand (Spec §7.7, STORY §4 und §6, DESIGN §5.10). Das Schlussplädoyer steht in der Ermittlung (§2.1).
Geprüft von `pruefeFallebene` (`src/services/fallebene.js`) beim Start und in `npm run validate`.

```json
{ "version": 1,
  "beweisstuecke": [
    { "akte": 1, "titel": "Fundbuch-Seite", "bild": "fundbuch", "text": "Ein Ausdruck der Fundbuch-Seite …",
      "notiz": "Wer war am Schalter?" } ],
  "steckbrief": {
    "felder": [ { "id": "signatur", "titel": "Signatur / Initialen" }, { "id": "name", "titel": "Name / Motiv" } ],
    "hinweise": [
      { "akte": 1, "eintraege": [ { "feld": "signatur", "text": "Nachtfalter, Initialen „N. F.“" } ] },
      { "akte": 6, "auchNachPlaedoyer": "A6-E1", "stempel": "Enttarnt",
        "eintraege": [ { "feld": "wohnort", "text": "Hafenviertel (bestätigt)", "ersetzt": true } ] },
      { "akte": 7, "stempel": "Fall abgeschlossen", "eintraege": [] } ] } }
```

| Feld | Regel |
|---|---|
| `beweisstuecke[]` | je Akte höchstens eines: `akte`, `titel`, `bild` ∈ `fundbuch`, `schloss`, `bon`, `ausweis`, `netz`, `steckbrief`, `lizenz` (SVG-Motive in `public/static/js/lernen/pinnwand_bilder.js`), `text` (Polaroid-Text, 2–3 Sätze, Mini-Markdown), `notiz` (optional, Eddas Handschrift) |
| `steckbrief.felder[]` | `id` (Kleinbuchstaben, eindeutig), `titel` – Reihenfolge = Anzeige |
| `steckbrief.hinweise[]` | je Akte höchstens einer: `eintraege` (`feld` aus `felder`, `text` Mini-Markdown, `ersetzt: true` verdrängt frühere Einträge des Felds, z. B. „1988 (bestätigt)“), optional `stempel` (über dem Steckbrief: „Enttarnt“, „Fall abgeschlossen“) und `auchNachPlaedoyer` (Ermittlungs-id) |

**Freischaltung (Regel E10, Spec §0):** Der Hinweis einer Akte *n* ist sichtbar, sobald das Verhör der Akte gewonnen
ist (bester beendeter Versuch ≥ 50 %) **oder** im Kurs eine spätere Akte des Plans (1–7) freigeschaltet ist; mit
`auchNachPlaedoyer` zusätzlich, sobald das Plädoyer dieser Ermittlung abgeschlossen ist. Hinweise gelten unabhängig vom
Niveau (gA: der Hinweis der Akte 5 erscheint mit der Freischaltung der Akte 6). Ein **Beweisstück** (Titel, Bild,
Text, Notiz und die Einträge seines Hinweises als „Erkenntnis“) erscheint nur nach dem gewonnenen Verhör; vorher nur
„Verhör n“. Polaroids gibt es nur für Akten des Kurs-Niveaus (gA: ohne Akte 5).

**API:** `GET /api/kurse/:kurs/pinnwand` (angemeldet, Zugang wie die Lern-API) → `{ kurs, beweisstuecke: [{ akte,
verhoer, gewonnen, titel?, bild?, text?, notiz?, erkenntnis? }], steckbrief: { felder: [{ id, titel, eintraege: [{
akte, text }] }], hinweise, gesamt, stempel }, plaedoyer }`. `plaedoyer` ist das erste Plädoyer der sichtbaren Akten
(Form wie `ermittlung.plaedoyer` in §2.1, dazu `frei: true`, `akte`, `ermittlung`), für Schüler einer nicht
freigeschalteten Akte nur `{ frei: false, akte: { nr } }`, ohne Plädoyer `null`. Seite: `/pinnwand`.

## 12. Live-Modus: Live-Pool und Escape Room (`seed/live/`)

Inhalte der Kür K2 (Spec §7.10, DS_PLANUNG K2, STORY §9). Sie werden **nicht** in die Plattform-DB eingespielt
(`src/content/live.js` lädt sie beim Start in den Speicher); Live-Runden bringen keine Lab-Punkte. Die Aufgaben haben
das Format aus §4–§7 (inkl. `loesung`, `erklaerung`) und werden mit `pruefeAntwort` geprüft.

**`pool.json`** – Duell-Aufgaben `K2-L-01…20`:

```json
{ "version": 1, "titel": "Live-Pool …", "aufgaben": [
  { "id": "K2-L-03", "akte": 1, "zeitSek": 90, "titel": "…", "stufe": 2, "kategorie": "SQL eine Tabelle",
    "inhalt": [ … ], "interaktion": { "kind": "sql", "datenbank": "fundbuero" }, "loesung": { "sql": "…" }, "erklaerung": [ … ] } ] }
```

| Feld | Regel |
|---|---|
| `akte` | 1–6: die Akte, die die Aufgabe wiederholt (Soll A1 4 · A2 3 · A3 4 · A4 3 · A5 3 · A6 3, sonst Hinweis) |
| `zeitSek` | 10–90 Sekunden Bearbeitungszeit |
| `interaktion` | nur `ergebnis`, `choice`, `sql` (öffentliche Akten-DBs) |
| `niveau` | Akte 5 immer `eA` (in gA-Kursen nicht auswählbar) |

**`escape.json`** – Szenario mit Stationen:

```json
{ "version": 1, "titel": "Escape Room Weserstedt", "briefing": "…", "abschluss": "…",
  "dauerMin": 55, "tippNachMin": 10, "tippStrafeMin": 2,
  "stationen": [ { "id": "S1", "nr": 1, "titel": "Das Fundbuch-Schloss", "niveau": "alle", "story": "…",
                   "code": { "teile": [ { "quelle": "anzahlZeilen", "stellen": 3 } ] },
                   "aufgabe": { "id": "K2-S1", …, "tipps": ["… (genau einer: der Tipp-Umschlag)"] } } ] }
```

| Feld | Regel |
|---|---|
| `id`, `nr` | `S1`…`S6` mit `nr` 1–6; gA-Ersatzstation `S5g` (nr 5, `niveau: "gA"`); `S5` hat `niveau: "eA"` |
| `niveau` | `alle` · `eA` · `gA`; eA-Weg und gA-Weg haben je genau die Stationen 1–6 in Reihenfolge |
| `aufgabe.id` | `K2-<Station>`; genau ein Tipp (Tipp-Umschlag, kostet `tippStrafeMin` Minuten) |
| `code.teile` | Regel, wie der Server den Code **aus der Lösung** berechnet (Ziffern aneinander, `stellen` = mit Nullen auffüllen) |

Code-Quellen: `anzahlZeilen` (Zeilenzahl des Ergebnisses der Musterlösung) · `zelle` `{ zeile, spalte }` (1-basiert,
ganze Zahl) · `zuordnung` (match: je Element in Dateireihenfolge die Nummer der Kategorie) · `auswahl` (choice: Nummer
der einzigen richtigen Option in Dateireihenfolge) · `anzahlRichtig` · `minimalerSchluessel` (kleinste Attributzahl
der richtigen Optionen „(A, B)“) · `attributeRichtig` (Summe der Attributzahlen aller richtigen Optionen) ·
`relationen` · `fremdschluessel` · `attribute` (Anzahl aller Attribute; schema: aus allen Musterlösungen gleich). `teil`
(1-basiert) wählt bei mehrteiligen Aufgaben den Teil. Der Code steht **nie** im JSON und verlässt den Server erst, wenn
ein Team die Station gelöst hat.

**Bremsen beim Raten** (Server, `src/services/live.js`, nur im RAM, mit dem Rundenende bzw. der Verbund-Löschung
verworfen): höchstens **5 falsche Codes** (`/code`) und höchstens **10 falsche Antworten** (`/antwort`) je Team und
Minute (gleitendes Fenster), jeweils **zusätzlich je Konto** – ein Team-Wechsel umgeht sie nicht. Darüber antwortet der
Server mit 429, `Retry-After` (Sekunden) und `{ error, bremse: true }`; die Schülerseite zeigt dann den Text des
Servers („Zu viele falsche Antworten – atmet kurz durch …“). Während der Antwort-Bremse wird **jede** Antwort
abgelehnt, auch eine richtige (sonst ließe sich mit dem Durchprobieren einfach weitermachen); gebremste Anfragen
werden nicht geprüft und ändern nichts (keine Wertung, keine Zeitstrafe). Richtige und leere Antworten zählen nicht
mit; das Fenster gilt über Stationswechsel hinweg. Das Duell hat keine solche Bremse (eine Antwort je Person und Aufgabe).

Der Validator (`validiereLive`, in `npm run validate`) prüft das Format, die Aufgaben intern als Test-Akte (welt 9:
A9-E1 = Pool, A9-E2 = Stationen) mit allen Regeln aus §8 (SQL in der Sandbox), dass kein Text (ab 20 Zeichen) aus
`seed/akten` stammt (Transfer), und die Codes: berechenbar, 3–8 Ziffern (Sicherheitsprüfung F4: zwei Ziffern wären trotz Code-Bremse erratbar), je Station verschieden, nicht in der
öffentlichen Sicht; ein Zellen-Code eines mehrzeiligen Ergebnisses braucht `sortierung` und keinen Gleichstand.
