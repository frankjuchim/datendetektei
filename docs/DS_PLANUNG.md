# Datendetektei Weserstedt – Feinplanung der Doppelstunden (DS 1–13, K1, K2)

| | |
|---|---|
| **Bezug** | Spezifikation `docs/superpowers/specs/2026-10-12-datendetektei-design.md` (Quelle der Wahrheit), Abschnitte 3, 4, 5, 7.5, 9, 10, 11 |
| **Stand** | 2026-10-12 · Phase 0 (Konzept) · Blueprint für Claude Code · Akten 1–3 (Lab, Verhör 1–3, Warm-up A1–A3) an die validierten Inhalte in `seed/akten/` und `seed/warmup/` angeglichen (Phase 3) · Akten 4–5 (Lab, Verhör 4–5, Warm-up A4–A5) angeglichen (Phase 5, siehe Anhang Nr. 14–25) |
| **Zweck** | Verbindlicher Bauplan für Lab-Aufgaben (`seed/akten/akte<n>.json`, `kuer.json`), Verhör-Pools, Warm-up-Karten (`seed/warmup/`), Arbeitsblätter, Lehrerhinweise, Generalprobe und Klausuren |
| **Begleitdokument** | `docs/KOMPETENZMATRIX.md` (Kompetenz-, Fallen-, Interaktions- und Abi-Bezugsmatrix; aus denselben Daten erzeugt) |
| **Story** | `docs/STORY.md` (parallel): Phantom = Merle Falkenrath (Tarnname „Nora Falter“, Jahrgang 1988, Hafenviertel, Tischtennis beim TuS, ehem. Datenschutzbeauftragte); Chefin Edda Lorenz; Azubi Juri Brandes. Story-Fakten in Aufgaben folgen STORY Anhang A |

**Legende und Konventionen**
- **IDs:** Lab `A<n>-E<k>-<nn>` · Verhör `A<n>-V-<nn>` · Warm-up `W-A<n>-<nn>` (Akte = Inhalt, den die Karte wiederholt) · Cold Case im Lab `A<n>-E<k>-CC` (ohne Punkte, nicht mitgezählt) · Kür `K1-E1-<nn>`, Live-Pool `K2-L-<nn>` · Prüfungsteile `GP-eA-*`, `GP-gA-*`, `KL-A-*`, `KL-B-*`, `KL-BgA-*`, `NK-A-*`, `NK-B-*`.
- **Stufen:** ★ = 10, ★★ = 20, ★★★ = 30 Punkte (Vertrag). Ziel je Ermittlung ≈ 40/40/20 → bei 8 Aufgaben 3/3/2.
- **Niveau** je Aufgabe: aus der *ersten* genannten Kompetenz abgeleitet (eA, wenn diese eA ist; ganze Akte 5 = eA). eA-Aufgaben sind im gA-Kurs ausgeblendet.
- **Interaktionen** (Spec 7.5): neu `sql`, `zeilen`, `zellen`, `ergebnis`, `schema`, `er` (Modi lesen/ergaenzen/entwickeln), `zerlegen`, `anomalie`, `kernpunkte` (0 Punkte, Freitext bleibt im Browser) · Basis `gaps`, `choice`, `order`, `lines` (Codezeilen antippen, z. B. fehlerhafte Zeile), `match`. In Verhören wird `kernpunkte` nicht verwendet (0 Punkte); Analyse/Begründung dort als `choice`/`match`/`order`.
- **Notation:** Kurzschreibweise mit PK unterstrichen (`<u>…</u>`) und ↑FK; ER in Chen-Notation nach EH §7 (1/n/m, ternär p).
- **SQL-Stil (EH §8, Abi-Stil 2026):** Verbund nur implizit `FROM a, b WHERE a.fk = b.pk`; keine Unterabfragen, kein `JOIN` (außer markierter Kür), `!=` statt `<>`, GROUP-BY-Regel strikt (alle nicht aggregierten SELECT-Spalten in GROUP BY), kein Alias in HAVING (Alias in ORDER BY erlaubt), Text `'…'`, Datum `'JJJJ-MM-TT'`, Tabellenalias ohne AS.
- **Sprache:** Schüler:innen werden geduzt (Lab, AB, Warm-up); Verhöre, Abi-Ecken, Generalprobe und Klausuren sind gesiezt, nüchtern, mit Operator und `[x BE]`.
- **Konkrete Daten** (Datumswerte, Beträge, Namen in Aufgaben) sind Platzhalter; verbindlich sind die DB-Skripte und `seed/datenbanken/<name>/LIESMICH.md`. Aufgaben, die sich auf Randfälle stützen, nennen die Prüf-Varianten (`+null`, `+gleichnamig`, `+grenze`, `+gleichstand`, `+leer`).

## 1 Überblick über alle Doppelstunden

| DS | Akte | Thema | Kompetenzen | Unplugged | Lab | AB | Verhör | Video |
|---|---|---|---|---|---|---|---|---|
| DS 1 | 1 Das Fundbüro | Der erste Auftrag | K01, K02 (Einstieg), K15, K17, K21 · prozessbezogen K47 | Karteikarten-Filter | A1-E1-01…08 | AB 1.1 | – | 0 (Plattform) + 1 (SQL-Grundlagen) |
| DS 2 | 1 Das Fundbüro | Das verschwundene Fundstück | K15–K22, K32 (Schwerpunkt K16, K18, K19, K20, K22, K32) | Fahndung mit Platzhaltern (LIKE-Karten + NULL-Stuhl) | A1-E2-01…08 (06–08 = Indizienkette) | AB 1.2 | Verhör 1 · Stadtbibliothek (V1) | 1 |
| DS 3 | 2 Spur der Räder | Der rote Faden | K03, K04, K05, K23, K16 | Roter Faden (Kreuzprodukt mit Wollfäden) | A2-E1-01…08 (Spurenbrett) | AB 2.1 | – | 2 |
| DS 4 | 2 Spur der Räder | Nachtfahrten | K24, K18 (IS NULL), K22 · Übung K16, K23 | Ermittlungsweg durchs Schema | A2-E2-01…08 | AB 2.2 | Verhör 2 · Bürgerbus (V2) | 2 |
| DS 5 | 3 Die Stadtfest-Kasse | Kassensturz | K25, K26 · Übung K23, K24, K20, K21 | Menschliches GROUP BY (Fächer) | A3-E1-01…08 (Sortierfächer) | AB 3.1 | – | 3 |
| DS 6 | 3 Die Stadtfest-Kasse | Die Statistik lügt nicht | K27, K22, K28, K30, K31 · Übung K24, K25, K26 | Menschliche Zeitlupe (Klauselkarten) + WHERE-/HAVING-Sortierkarten | A3-E2-01…08 (Zeitlupe) | AB 3.2 | Verhör 3 · Schulkiosk (V3, SQL-Gesamt) | 3 |
| DS 7 | 4 Chaos im Vereinsarchiv | Die Excel-Liste | K07, K08, K10, K14 | Anomalie-Rennen | A4-E1-01…08 (Anomalie-Simulator) | AB 4.1 | – | 4 |
| DS 8 | 4 Chaos im Vereinsarchiv | Ordnung ins Archiv | K02, K09, K11, K12 (K13 Kür) · Übung K03, K04 | Schlüssel-Detektiv (Ausschnitt-Falle mit Nachlieferungen) | A4-E2-01…08 (Zerlegungs-Puzzle, Schema-Werkbank) | AB 4.2 | Verhör 4 · Musikschule (V4, Rohliste) | 4 |
| DS 9 | 5 Der Bauplan (eA) | Baupläne lesen | K33, K34, K36 · prozessbezogen K47 | Fäden-Kardinalitäten (Rollenkarten) | A5-E1-01…08 (Bauplan-Tisch: lesen/ergänzen) | AB 5.1 | – | 5 |
| DS 10 | 5 Der Bauplan (eA) | Der Architekturwettbewerb | K35, K37, K38, K39, K40 · Übung K34, K36, K47 | Architekturwettbewerb mit Galerie-Rundgang | A5-E2-01…08 (Bauplan-Tisch: ergänzen/entwickeln) | AB 5.2 | – | 5 |
| DS 11 | 5 Der Bauplan (eA) | Vom Plan zur Datenbank | K41, K42, K43, K23/K24 (Transfer: Self-Join) · Übung K04, K16 | Regelkarten-Umzug (eigenes Wettbewerbsplakat überführen) | A5-E3-01…08 (Schema-Werkbank, Self-Join) | AB 5.3 | Verhör 5 · Kletterhalle (V5, ER) | 6 |
| DS 12 | 6 Datenspuren | Das Phantom | K44, K45, K46, K24, K26 · Übung K27, K18 | „Steh auf, wenn …“ (Quasi-Identifikatoren) + Rollenkarten-Debatte | A6-E1-01…08 + Schlussplädoyer A6-E1-09…14 | AB 6.1 | Verhör 6 · Fitness-App (V6, Datenschutz, 15') | – (kein Video; Debatte) |
| DS 13 | 7 Generalprobe | Die Ermittlerprüfung | alle (Prüfungsauswahl siehe Teilaufgaben) | – (Probeklausur + Peer-Korrektur) | – (Verhör 7 als Lab-Generalprobe) | Generalprobe eA/gA | Verhör 7 · Mensa (V7, Lab-Generalprobe, 30') | 7 (optional, Abi-Check) |
| K1 (Kür) | Kür | Eigene Datenbank bauen | K06, K48 (Kür) · Transfer K03, K04, K23, K41 | – (Teamplanung auf Papier) | K1-E1-01…06 (Sandbox) | Projektkarte K1 | – | – |
| K2 (Kür) | Kür | Escape Room Weserstedt | Wiederholung aller Akten (Auswahl: K02, K08, K09, K18, K22, K24, K26, K27, K28, K34, K41) | Escape-Room-Stationen (Papierumschläge + Lab) | Live-Pool 20 + Escape-Room 6 Stationen | – | – | – |

### Grundkurs-Pfad (gA, Spec 3.4)

| gA-DS | entspricht | Besonderheit im gA-Kurs |
|---|---|---|
| 1–6 | DS 1–6 | unverändert; A3-E2-07 (Fehler finden, K31) bleibt als Verbund-/Summenübung sichtbar, weil die erste Kompetenz K24 ist |
| 7 | DS 7 | unverändert |
| 8 | DS 8 | nur A4-E2-01…05 (Schlüssel, zusammengelegte Tabelle, „keine Anomalie möglich“); Zerlegen/Redundanzfreiheit (K11, K12) und A4-V-11/12 ausgeblendet; AB 4.2 Aufträge 4–5 entfallen |
| – | DS 9–11 | **entfallen** (Akte 5, ER nur eA; Lehrkraft stellt „Niveau: gA“ ein → Akte 5 ausgeblendet) |
| 9 | DS 12 | Warm-up mit W-A4-05…08 (statt W-A5-09…12); sonst unverändert |
| 10 | DS 13 | Generalprobe gA (25 BE, ohne ER, mit Datenschutz); Verhör 7 ohne A7-V-12/14/15 |
| (opt.) | K2 | Escape Room mit gA-Ersatzstation S5g |

gA-Klausur: Aufgabe A (30 BE, identisch zur eA) + Aufgabe B-gA (15 BE) = 45 BE.

## 2 Zählungen (automatisch aus diesem Blueprint)

| Bestand | Anzahl | Zielgröße Spec §10 |
|---|---|---|
| Lab-Aufgaben Akten 1–6 (inkl. Schlussplädoyer) | 102 | 102 |
| Lab-Aufgaben Kür K1 (Sandbox) | 6 | 6 |
| Lab-Aufgaben gesamt | 108 | ≈ 108 |
| Cold Cases im Lab (ohne Punkte, zusätzlich) | 12 | – |
| Verhör-Aufgaben (Pools V1–V7) | 86 | ≈ 86 |
| Warm-up-Karten | 60 | ≈ 60 |
| Prüfungsteile (Generalprobe eA/gA, Klausur, Nachschreibklausur) | 47 | – |

Detaillierte Matrizen (Kompetenzen, Fallen, Interaktionen, Stufenmix, Abi-Bezug): `docs/KOMPETENZMATRIX.md`.

---

## DS 1 · Ermittlung 1.1 „Der erste Auftrag“ (A1-E1)

| Kopf |  |
|---|---|
| Doppelstunde | DS 1 |
| Akte / Ermittlung | Akte 1 · Ermittlung 1.1 (A1-E1) |
| Titel | Der erste Auftrag |
| Kompetenzen | K01, K02 (Einstieg), K15, K17, K21 · prozessbezogen K47 |
| Fallen-Schwerpunkt | P6 (AND/OR-Klammern), P5 (Text ohne Hochkommata), P8 (Schlüssel aus Ausschnitt – Anbahnung) |
| Datenbank | Fundbuero – `Fundsache(<u>FundNr</u>, Bezeichnung, Kategorie, Farbe, Fundort, Stadtteil, Funddatum, Wert, Finder, AbgeholtAm)` |
| Unplugged | Karteikarten-Filter |
| Video | 0 (Plattform) + 1 (SQL-Grundlagen) |
| Verhör | – |
| Niveau | gA/eA |

### Lernziele
Die Schülerinnen und Schüler …

1. **erläutern** den Aufbau einer relationalen Tabelle mit den Fachbegriffen Tabelle, Datensatz, Attribut, Attributwert und Primärschlüssel am Fundbuch.
2. **beurteilen**, ob ein Attribut als Primärschlüssel geeignet ist (eindeutig, nie NULL, minimal), und erkennen, dass ein Datenausschnitt keine Eindeutigkeit beweist.
3. **entwerfen** SQL-Abfragen mit SELECT, FROM, WHERE (Vergleichsoperatoren, AND/OR/NOT mit korrekter Klammersetzung) und ORDER BY (auch mehrstufig).
4. **geben** das Ergebnis einer gegebenen Abfrage auf einem kleinen Datenausschnitt konkret **an** (Zeilen, Reihenfolge).

### Verlaufsplan
| Phase | Zeit | Inhalt / Ablauf | Sozialform | Material | Lab |
|---|---|---|---|---|---|
| Kick-off (statt Warm-up) | 0–10' | Briefing-Folie „Edda Lorenz“ (STORY 5.1): Die Detektei hat ihren ersten Auftrag – Gesa Ohlendiek vom Fundbüro meldet, im Fundbuch „stimmt etwas nicht“; in der Stadt tauchen gezeichnete Nachtfalter auf, das *Weserstedter Tageblatt* spricht vom „Phantom“. Teams (3–4) bilden, Detektei-Ausweise ausfüllen (Teamname, Ermittlername). Impuls: *„Wo werden über euch Daten in Tabellen gespeichert – und woran erkennt man euch dort eindeutig?“* | Plenum, Teams | Präsentation `DD_A1_Fundbuero.pptx` (Folien 1–4), Ausweiskarten | – |
| Briefing | 10–20' | Fundbuch-Ausschnitt (8 Zeilen) am Beamer: Begriffe Tabelle, Datensatz, Attribut, Attributwert sammeln und beschriften. Primärschlüssel einführen. Impulse: *„Welche Spalte würdet ihr nehmen, um *genau eine* Fundsache zu bezeichnen?“* – *„Im Ausschnitt ist auch die Bezeichnung eindeutig. Reicht das?“* (Ausschnitt-Falle anbahnen) | LV, UG | Folie Fundbuch, Tafel | – |
| Unplugged | 20–35' | **Karteikarten-Filter** (Ablauf siehe unten): SELECT = vorlesen, WHERE = aufstehen, ORDER BY = Reihe bilden; AND/OR live erleben. | Plenum (alle) | Karteikarten-Set Fundbüro (30 Stück) | – |
| Lab-Einsatz | 35–80' | Portal → Datendetektei → Stadtplan → Fundbüro → Ermittlung 1.1. Optional Video 0 (3 min) für die Bedienung. Reihenfolge ★ → ★★ → ★★★; „Ausführen“ vor „Prüfen“; bei Fehlern Zeitlupe. AB 1.1 Auftrag 1–4 parallel auf Papier. Lehrkraft geht herum, sammelt typische Fehler (P5, P6) für die Besprechung. | EA | iPad/Laptop, AB 1.1 | A1-E1-01…08 |
| Fallbesprechung | 80–90' | Merkkasten an der Tafel sichern (Begriffe, Abfrage-Gerüst, Klammerregel). Abi-Ecke gemeinsam lösen (2 BE, Kurzbewertung im Team). Cliffhanger (STORY 5.1c): Laut Fundbuch wurde etwas Wertvolles abgeholt – im Ausgabebuch fehlt die Unterschrift. Hausaufgabe: Video 1, AB-Rest. | UG | Tafel, AB 1.1 | – |

### Unplugged-Aktivität im Detail
**Karteikarten-Filter (15 min).** *Material:* 30 laminierte Karteikarten (A6), je eine Fundsache mit FundNr, Bezeichnung, Kategorie, Farbe, Stadtteil, Wert, Funddatum (eigene Daten, nicht die Lab-DB); ein Schild „FROM Fundsache“ an der Tafel.
1. Jede/r zieht eine Karte (bei kleinen Kursen zwei). Die Lehrkraft „ruft“ Abfragen, die an der Tafel stehen.
2. `SELECT Bezeichnung FROM Fundsache WHERE Kategorie = 'Schirm';` → Wer passt, steht auf und liest **nur** die Bezeichnung vor (Projektion vs. Selektion).
3. `… WHERE Wert > 20 AND Stadtteil = 'Altstadt';` → aufstehen; dann `>=` statt `>`: Wer mit Wert genau 20 steht jetzt zusätzlich auf? (Grenzen, P6)
4. `… WHERE Kategorie = 'Tasche' OR Kategorie = 'Rucksack' AND Wert > 50;` → erst Vermutung per Handzeichen, dann auflösen: AND bindet stärker – die billige Tasche steht auch! Danach mit Klammern um die OR-Bedingung wiederholen.
5. `ORDER BY Wert DESC` → alle Stehenden bilden eine Reihe; `ORDER BY Stadtteil, Wert DESC` → Reihe nach Stadtteil, innerhalb nach Wert (mehrstufig).
*Sicherung:* Foto der Reihe; Tafel: „SELECT wählt Spalten – WHERE wählt Zeilen – ORDER BY ordnet“, „AND vor OR → im Zweifel Klammern“.

### Tafelbild / Merkkasten „Ermittler-Notiz“
**Fundsache**(<u>FundNr</u>, Bezeichnung, Kategorie, Farbe, Fundort, Stadtteil, Funddatum, Wert, Finder, AbgeholtAm)

| Fachbegriff | im Fundbuch |
|---|---|
| Tabelle (Relation) | Fundsache |
| Datensatz | eine Zeile = eine Fundsache |
| Attribut | eine Spalte, z. B. Kategorie |
| Attributwert | ein Eintrag, z. B. 'Kleidung' |
| Primärschlüssel | FundNr: eindeutig für **alle möglichen** Daten, nie NULL, minimal |

```sql
SELECT Bezeichnung, Stadtteil, Wert          -- welche Spalten?
FROM Fundsache                               -- welche Tabelle?
WHERE (Kategorie = 'Kleidung' OR Kategorie = 'Dokumente')
  AND Wert > 30                              -- welche Zeilen?
ORDER BY Stadtteil, Wert DESC;               -- welche Reihenfolge?
```
**Ermittler-Notiz:** AND bindet stärker als OR – Klammern setzen! · Text in `'…'` · ORDER BY mehrstufig: erst nach dem ersten Kriterium, bei Gleichstand nach dem zweiten · ASC ist Standard.

### Lab-Blueprint (A1-E1)

| ID | Titel | Stufe | Interaktion | Kompetenz(en) | Falle(n) | Niveau | Inhalt |
|---|---|---|---|---|---|---|---|
| A1-E1-01 | Das Fundbuch aufschlagen | ★ | `choice` | K01, K47 | – | gA/eA | Am markierten Ausschnitt der Tabelle Fundsache je Markierung entscheiden: Tabelle, Datensatz, Attribut oder Attributwert (4 Teilfragen). |
| A1-E1-02 | Wer ist der Schlüssel? | ★★ | `choice` | K02 | P8 | gA/eA | Begründet auswählen, welches Attribut als Primärschlüssel taugt; im gezeigten Ausschnitt ist auch Bezeichnung zufällig eindeutig (Begründungsoptionen mit Ausschnitt-Falle). |
| A1-E1-03 | Alles im Blick | ★ | `sql` | K15 | – | gA/eA | Bezeichnung, Kategorie und Fundort aller Fundsachen ausgeben. |
| A1-E1-04 | Puzzle der Ermittlungsakte | ★ | `order` | K15, K21 | P5 | gA/eA | Bausteine `SELECT Bezeichnung, Farbe` · `FROM Fundsache` · `WHERE Kategorie = 'Kleidung'` · `ORDER BY Funddatum DESC` in gültige Reihenfolge bringen; Distraktor `WHERE Kategorie = Kleidung` (ohne Hochkommata) aussortieren. |
| A1-E1-05 | Wer steht auf? | ★★ | `zeilen` | K17, K29 | P6 | gA/eA | In zehn Karteikarten-Zeilen diejenigen antippen, die `WHERE Kategorie = 'Taschen' OR Kategorie = 'Schmuck' AND Wert > 50` liefert (AND bindet stärker: jede Tasche, auch für 19 €; Schmuck ohne Wert bleibt sitzen). |
| A1-E1-06 | Klammern retten den Fall | ★★★ | `sql` | K17 | P6 | gA/eA | Alle Fundsachen der Kategorien Taschen oder Schmuck mit Wert über 50 €, die nicht im Hafenviertel gefunden wurden (Klammern um OR, `NOT`), mit Bezeichnung, Stadtteil und Wert. |
| A1-E1-07 | Reihenfolge vorhersagen | ★★ | `ergebnis` | K21, K29 | – | gA/eA | Ergebnistabelle von `SELECT Bezeichnung, Wert FROM Fundsache WHERE Kategorie = 'Fahrradzubehör' AND Wert >= 20 ORDER BY Wert DESC, Bezeichnung` vorhersagen (Ausschnitt: alle 6 Fundsachen der Kategorie Fahrradzubehör; 5 Ergebniszeilen, Grenzwert 20 €, ein Gleichstand im Wert, Reihenfolge zählt). |
| A1-E1-08 | Sortierte Spurensuche | ★★★ | `sql` | K21, K17 | P6 | gA/eA | Alle Fundsachen aus 'Hafenviertel' oder 'Altstadt' mit Wert ab 20 € (`>=`, Variante `+grenze`), sortiert nach Stadtteil aufsteigend, innerhalb nach Funddatum absteigend. |

Stufenmix ★/★★/★★★: **3/3/2 (38/38/25 %)** · Interaktionsarten: `choice`, `ergebnis`, `order`, `sql`, `zeilen`

**Cold Case im Lab (ohne Punkte):** `A1-E1-CC` „Die Nachtfalter-Liste“ (K15, K21) – Freie Ermittlung: Finder, Bezeichnung und FundNr nach Finder sortiert ausgeben und den Finder-Eintrag finden, der schnell gesprochen wie ein Tier klingt ('N. Falter', FundNr 36) – offene Spur für DS 2.

### Arbeitsblatt-Blueprint AB 1.1 („Ermittlungsakte“)

- **Kopfband:** AKTE 1 · ERMITTLUNG 1.1 · DS 1 – „Der erste Auftrag“, Stempel FUNDBÜRO
- **Fall-Einstieg:** Gesa Ohlendiek vom Fundbüro Weserstedt bittet die Detektei, ihr Fundbuch zu prüfen – „irgendetwas stimmt da nicht“. Bevor ihr ermittelt, müsst ihr das Fundbuch lesen und befragen können.

- **Beweisstück-Kästen:**
  1. Aufbau einer Tabelle – Fundbuch-Ausschnitt mit Beschriftung Tabelle/Datensatz/Attribut/Attributwert
  2. Primärschlüssel – drei Kriterien (eindeutig für alle möglichen Daten, nie NULL, minimal) + Warnung „Ausschnitt beweist nichts“
  3. Das Abfrage-Gerüst SELECT – FROM – WHERE – ORDER BY (Format „SQL-Code“, eigenes Beispiel mit Kategorie 'Schlüssel')
  4. Vergleichsoperatoren `= != < > <= >=`, AND/OR/NOT, Klammerregel (AND vor OR)

- **Ermittlungsaufträge:**

| Nr. | Stufe | Ort | Auftrag | Kompetenz |
|---|---|---|---|---|
| 1 | ★ | PAPIER | Beschrifte im Fundbuch-Ausschnitt Tabelle, Datensatz, Attribut und Attributwert. | K01 |
| 2 | ★ | PAPIER | Entscheide begründet, ob FundNr, Bezeichnung oder Funddatum Primärschlüssel sein kann. | K02 |
| 3 | ★★ | PAPIER | Markiere die Zeilen, die `WHERE Kategorie = 'Sonstiges' OR Farbe = 'schwarz' AND Wert < 10` liefert – einmal wie notiert, einmal mit Klammern um die OR-Bedingung. | K17, K29 |
| 4 | ★★ | PAPIER | Notiere eine Abfrage: alle Fundsachen aus dem Stadtteil 'Lindenhof' mit Bezeichnung und Funddatum, neueste zuerst. | K15, K21 |
| 5 | ★★★ | LAB | Fundsachen mit Wert ab 100 € oder der Kategorie 'Schmuck', aber nicht aus dem Hafenviertel – sortiert nach Stadtteil und absteigend nach Wert. | K17, K21 |

- **Abi-Ecke** (rot gerahmt, K15, K17): Gegeben ist die Tabelle Fundsache. **Entwerfen** Sie eine SQL-Abfrage, die Bezeichnung und Wert aller Fundsachen ausgibt, die im Stadtteil Altstadt gefunden wurden und einen Wert von mehr als 20 € haben. **[2 BE]** – Operator **entwerfen**, AFB II.

- **Spur im Lab:** Ermittlung 1.1, Aufgaben A1-E1-01…08; Werkzeug Zeitlupe (WHERE-Schritt) bei Klammerfehlern.

- **Cold Case:** „Die Nachtfalter-Liste“: Welche Bedingungen bräuchtest du, um Finder-Einträge zu finden, die keine Personennamen sind? Notiere Ideen – in DS 2 bekommst du das passende Werkzeug (LIKE).

### Warm-up
Erste Stunde: Die Warm-up-Phase entfällt; die 10 Minuten dienen dem Kick-off (Ausweise, Teams, Portal-Login).
Die Warm-up-Karten **W-A1-01…04** wiederholen diese DS und werden zu Beginn von DS 2 eingesetzt.

### Typische Schwierigkeiten · Differenzierung · Vorbereitung
**Typische Schwierigkeiten**
- Portal-Login scheitert (persönlicher Code vergessen) → Kursliste mit Codes bereithalten; notfalls `/gast` (Eisdiele) zum Ausprobieren, zählt nicht.
- Spalten- und Zeilenauswahl verwechselt (`SELECT` vs. `WHERE`) → Bild aus dem Unplugged: „aufstehen = WHERE, vorlesen = SELECT“.
- AND/OR ohne Klammern (P6) → Zeitlupe zeigt die verworfenen Zeilen; Merkkasten.
- Text ohne Hochkommata (P5) → deutsche Fehlermeldung „Die Spalte Kleidung gibt es nicht …“ gemeinsam deuten.
- Primärschlüssel aus dem Ausschnitt „bewiesen“ (P8) → Gegenbeispiel-Frage „Kann es morgen eine zweite Fundsache *Regenschirm* geben?“

**Differenzierung**
- *Schnelle:* ★★★-Aufgaben, Cold Case (AB + Lab), Freie Ermittlung in der Konsole (eigene Fragen an das Fundbuch).
- *Langsame:* ★-Aufgaben zuerst, Tipps (kosten Punkte), Zeitlupe, Ermittler-Handbuch Werkzeugkarte 1; Partner-Check im Team (Lab bleibt Einzelarbeit).

**Vorbereitung**
- Kurs im Portal vorhanden, Datendetektei für den Kurs freigeschaltet, Akte 1 offen, Niveau eA/gA eingestellt.
- Karteikarten-Set Fundbüro (30 Karten) gedruckt und laminiert; Detektei-Ausweise; Beamer mit Präsentation Akte 1.
- Geräte geladen, WLAN getestet (Konsole lädt `/db/fundbuero.sqlite`); Video-0-Link im Kurs bereit.

---

## DS 2 · Ermittlung 1.2 „Das verschwundene Fundstück“ (A1-E2)

| Kopf |  |
|---|---|
| Doppelstunde | DS 2 |
| Akte / Ermittlung | Akte 1 · Ermittlung 1.2 (A1-E2) |
| Titel | Das verschwundene Fundstück |
| Kompetenzen | K15–K22, K32 (Schwerpunkt K16, K18, K19, K20, K22, K32) |
| Fallen-Schwerpunkt | P5 (NULL, Literale, Datumsformat), P6 (BETWEEN inklusive, LIKE-Platzhalter, Klammern) |
| Datenbank | Fundbuero (wie DS 1) – Randfälle: NULL in Farbe/Wert/AbgeholtAm, Grenzdaten, ähnliche Bezeichnungen, manipulierter Datensatz |
| Unplugged | Fahndung mit Platzhaltern (LIKE-Karten + NULL-Stuhl) |
| Video | 1 |
| Verhör | Verhör 1 · Stadtbibliothek (V1) |
| Niveau | gA/eA |

### Lernziele
Die Schülerinnen und Schüler …

1. **entwerfen** Bedingungen mit LIKE (`_`, `%`), BETWEEN, IN und IS NULL und **begründen**, warum `= NULL` nie zutrifft.
2. **notieren** Literale korrekt (Text `'…'`, Datum `'JJJJ-MM-TT'`, Dezimalzahl mit Punkt) und verwenden `!=` statt `<>`.
3. **entwerfen** Abfragen mit Berechnungen, Spaltenalias (AS), DISTINCT und LIMIT (Top-n ohne Gleichstand).
4. **kreisen** ein Fundstück über eine Kette aufeinander aufbauender Abfragen **ein** und **beschreiben** das Vorgehen in Worten.

### Verlaufsplan
| Phase | Zeit | Inhalt / Ablauf | Sozialform | Material | Lab |
|---|---|---|---|---|---|
| Warm-up | 0–10' | Karten W-A1-01…04 (Wiederholung DS 1) in Einzelarbeit, Vergleich im Team; Lehrkraft löst Karte 02 (Klammer-Check) an der Tafel auf. | EA → Team | Warm-up-Karten A1 (Papier) | Leitner optional |
| Briefing | 10–20' | Gesa Ohlendieks Notizen (STORY 5.2): *„irgendwas mit Messing“, „Juni oder Juli“, „mehrere hundert Euro“* – ein Fundstück ist aus Register und Regal verschwunden. Neue Werkzeuge an Beispielen: LIKE, BETWEEN, IN, IS NULL, DISTINCT, Berechnung + AS, LIMIT, Literale. Impulse: *„Wie findet ihr alles aus Messing, wenn ihr nicht wisst, ob ‚Messingleuchter‘ oder ‚Kompass (Messing)‘ eingetragen ist?“* – *„Was bedeutet ein leeres Feld AbgeholtAm?“* | LV, UG | Präsentation Akte 1 (Folien 10–18) | – |
| Unplugged | 20–30' | **Fahndung mit Platzhaltern** (Ablauf siehe unten). | Teams | Wortkarten, Musterkarten, NULL-Karte | – |
| Lab-Einsatz | 30–75' | Ermittlung 1.2: Aufgaben 01–05 (Werkzeuge), dann Indizienkette 06–08 (Messing → Juni/Juli + Wert → abgeholt ohne Unterschrift). AB 1.2 parallel. | EA | iPad/Laptop, AB 1.2 | A1-E2-01…08 |
| Fallbesprechung | 75–90' | Indizienkette gemeinsam rekonstruieren (*„Welche Bedingung hat den entscheidenden Datensatz verraten?“* → Messing-Kompass, 450 €, Fundort Weserpromenade, AbgeholtAm '2026-09-14' gesetzt, Finder 'N. Falter' – schnell gesprochen: *Nachtfalter*). Merkkasten Literale/NULL. Abi-Ecke (3 BE) im Team, Kurzvergleich. Hinweis Verhör 1 (20', bis DS 3 als Hausaufgabe im Lab). | UG | Tafel | Verhör 1 freigeschaltet |

### Unplugged-Aktivität im Detail
**Fahndung mit Platzhaltern (10 min).** *Material je Team:* 12 Wortkarten (Bezeichnungen wie „Schal“, „Schlüssel“, „Schlüsselbund“, „Mütze“, „Matze“, „Taschenuhr“, „Armbanduhr“, „Uhrenkette“, „Tischtennisschläger“ …), 6 Musterkarten (`'Sch%'`, `'%uhr'`, `'%uhr%'`, `'M_tze'`, `'_a%'`, `'Schl_ssel'`), 1 leere Karte mit Aufschrift NULL.
1. Teams ordnen jeder Musterkarte alle passenden Wortkarten zu (Wettlauf, 4 min); Lehrkraft prüft stichprobenartig – Streitfälle: Passt „Uhrenkette“ zu `'%uhr'`? (Nein – Groß/Klein ist in SQLite bei LIKE egal, aber `%uhr` verlangt das Ende.)
2. **NULL-Stuhl:** Eine Person erhält die NULL-Karte als „Farbe“. Lehrkraft ruft `WHERE Farbe = NULL` – wer steht auf? Niemand, auch NULL nicht. Dann `WHERE Farbe IS NULL`. Ebenso `WHERE Farbe != 'rot'` – NULL bleibt sitzen!
3. `BETWEEN 10 AND 20` mit Wertkarten 10/15/20/21 → Grenzen gehören dazu.
*Sicherung:* Drei Merksätze auf der Tafel: „`%` beliebig viele, `_` genau ein Zeichen“ · „NULL nur mit IS NULL“ · „BETWEEN schließt beide Grenzen ein“.

### Tafelbild / Merkkasten „Ermittler-Notiz“
```sql
WHERE Bezeichnung LIKE 'Schl%'                           -- % = beliebig viele Zeichen (auch keins)
WHERE Bezeichnung LIKE 'M_tze'                           -- _ = genau ein Zeichen
WHERE Funddatum BETWEEN '2026-09-01' AND '2026-09-30'    -- Grenzen inklusive
WHERE Kategorie IN ('Schmuck', 'Elektronik')             -- Werteliste
WHERE AbgeholtAm IS NULL                                 -- niemals: = NULL
WHERE Kategorie != 'Kleidung'                            -- im Abitur: !=
SELECT DISTINCT Stadtteil FROM Fundsache;                -- Duplikate entfernen

SELECT Bezeichnung, Wert, Wert * 0.05 AS Finderlohn
FROM Fundsache
WHERE Kategorie IN ('Schmuck', 'Elektronik')
ORDER BY Finderlohn DESC
LIMIT 3;
```
**Ermittler-Notiz Literale:** Text `'Hafenviertel'` · Datum `'2026-09-30'` (Text im Format JJJJ-MM-TT, deshalb sortier- und vergleichbar) · Zahl `0.05` ohne Hochkommata · `7 / 2` ergibt bei Ganzzahlen `3` (ganzzahlige Division) · LIMIT nur, wenn an der Schnittkante kein Gleichstand ist.

### Lab-Blueprint (A1-E2)

| ID | Titel | Stufe | Interaktion | Kompetenz(en) | Falle(n) | Niveau | Inhalt |
|---|---|---|---|---|---|---|---|
| A1-E2-01 | Platzhalter-Fahndung | ★ | `gaps` | K19 | P6 | gA/eA | LIKE-Muster in drei Abfragen ergänzen: Bezeichnungen, die mit 'Schl' beginnen, die auf 'uhr' enden, und 'M?tze' mit genau einem unbekannten Zeichen. |
| A1-E2-02 | Noch nicht abgeholt | ★ | `sql` | K18, K15 | P5 | gA/eA | Alle verschiedenen Kategorien (DISTINCT), in denen es noch nicht abgeholte Fundsachen gibt (`AbgeholtAm IS NULL`), alphabetisch. |
| A1-E2-03 | Fehler im Protokoll | ★ | `lines` | K32, K18 | P5 | gA/eA | In einer sechszeiligen Abfrage die fehlerhaften Zeilen antippen (`= NULL`, Datum ohne Hochkommata, `<>` statt `!=`). |
| A1-E2-04 | Die Septemberwoche | ★★ | `sql` | K18, K32 | P6 | gA/eA | Alle Fundsachen mit Funddatum zwischen '2026-09-14' und '2026-09-20' (BETWEEN inklusive; Grenzdatum liegt in den Daten), sortiert nach Funddatum. |
| A1-E2-05 | Finderlohn | ★★ | `sql` | K20, K16, K18, K22 | P6 | gA/eA | Bezeichnung, Wert und `Wert * 0.05 AS Finderlohn` für Fundsachen der Kategorien Schmuck oder Elektronik (IN); nur die drei höchsten Finderlöhne (ORDER BY Alias + LIMIT 3, kein Gleichstand). |
| A1-E2-06 | Indizienkette 1/3: Irgendwas mit Messing | ★★ | `sql` | K19, K15 | P6 | gA/eA | Alle Fundsachen mit „Messing“ in der Bezeichnung (`LIKE '%Messing%'`) mit FundNr, Bezeichnung, Funddatum und Wert – mehrere Treffer, teils außerhalb Juni/Juli. |
| A1-E2-07 | Indizienkette 2/3: Sommer und mehrere hundert Euro | ★★★ | `sql` | K18, K17, K19, K32 | P5, P6 | gA/eA | Messing-Fundsachen mit Funddatum zwischen '2026-06-01' und '2026-07-31' (BETWEEN), deren Wert mindestens 400 € beträgt oder unbekannt ist (`Wert >= 400 OR Wert IS NULL` in Klammern) – auf der Haupt-DB bleibt schon hier nur FundNr 36 (Messing-Kompass) übrig; Variante `+null` (Messingleuchter mit unbekanntem Wert) prüft das `OR Wert IS NULL`. |
| A1-E2-08 | Indizienkette 3/3: Abgeholt ohne Unterschrift | ★★★ | `sql` | K18, K17, K32 | P5 | gA/eA | Bedingungen aus 06/07 plus `NOT AbgeholtAm IS NULL`: bestätigt, dass der Kandidat aus 07 abgeholt wurde, und deckt Fundort und Finder auf – Bezeichnung, Fundort, Wert, AbgeholtAm und Finder ausgeben (Messing-Kompass, 'Weserpromenade', 450, '2026-09-14', 'N. Falter'). |

Stufenmix ★/★★/★★★: **3/3/2 (38/38/25 %)** · Interaktionsarten: `gaps`, `lines`, `sql`

**Cold Case im Lab (ohne Punkte):** `A1-E2-CC` „Der Schatten-Finder“ (K19, K29) – Wie viele Fundsachen tragen im Feld Finder einen Eintrag, der 'falter' enthält (`LIKE '%falter%'`)? Nur einer: 'N. Falter' beim Messing-Kompass (FundNr 36) – das Phantom hat nur diesen einen Datensatz geändert.

### Arbeitsblatt-Blueprint AB 1.2 („Ermittlungsakte“)

- **Kopfband:** AKTE 1 · ERMITTLUNG 1.2 · DS 2 – „Das verschwundene Fundstück“, Stempel FUNDBÜRO
- **Fall-Einstieg:** Frau Ohlendiek erinnert sich nur an Bruchstücke: etwas aus Messing, im Juni oder Juli gefunden, mehrere hundert Euro wert. Edda Lorenz: „Raten ist in diesem Haus verboten. Zählen nicht.“

- **Beweisstück-Kästen:**
  1. LIKE mit `%` und `_` – Tabelle Muster ↔ Treffer
  2. BETWEEN, IN, IS NULL – mit Warnkasten „`= NULL` ist nie wahr“
  3. Literale: Text, Datum `'JJJJ-MM-TT'`, Zahl; `!=` statt `<>`
  4. Berechnungen und AS, DISTINCT, ORDER BY über Alias, LIMIT

- **Ermittlungsaufträge:**

| Nr. | Stufe | Ort | Auftrag | Kompetenz |
|---|---|---|---|---|
| 1 | ★ | PAPIER | Gib zu jedem Muster zwei passende und ein unpassendes Wort an: `'Sch%'`, `'%ring'`, `'_a%'`. | K19 |
| 2 | ★ | PAPIER | Korrigiere fünf fehlerhafte Bedingungen (NULL-Vergleich, Datum ohne Hochkommata, `<>`, Dezimalkomma); hinter jeder Bedingung steht „(gemeint: …)“, damit die Korrektur eindeutig ist (Material Phase 7). | K18, K32 |
| 3 | ★★ | PAPIER | Gib an, welche Datensätze `WHERE Wert BETWEEN 10 AND 20` aus einer Tabelle mit den Werten 9,50 / 10 / 20 / 20,50 / NULL liefert. | K18, K29 |
| 4 | ★★ | LAB | Liste alle verschiedenen Kategorien, die im Hafenviertel vorkommen. | K15 |
| 5 | ★★★ | PAPIER | Beschreibe in Worten, mit welchen drei Abfragen du den Messing-Kompass eingekreist hast. | K30 |

- **Abi-Ecke** (rot gerahmt, K18, K32, K21): **Entwerfen** Sie eine SQL-Abfrage, die Bezeichnung und Funddatum aller noch nicht abgeholten Fundsachen ausgibt, die im September 2026 gefunden wurden. Die neuesten Funde sollen zuerst erscheinen. **[3 BE]** – Operator **entwerfen**, AFB I/II.

- **Spur im Lab:** Ermittlung 1.2, A1-E2-01…08 (Indizienkette 06–08); danach Verhör 1 (20') im Lab.

- **Cold Case:** „Finderlohn-Stufen“: Der Finderlohn beträgt 5 % bis 500 € Wert und 3 % vom Mehrwert darüber. Entwirf eine Abfrage für Fundsachen bis 500 € und überlege, warum der Rest mit unseren SQL-Mitteln umständlich wird.

### Warm-up-Karten

Wiederholung von DS 1 (Begriffe, Klammern, Sortieren, Schlüssel).

| ID | Titel | Aufgabe | Min. | Kompetenz | Falle |
|---|---|---|---|---|---|
| W-A1-01 | Begriffe am Fundbuch | An einem Tabellenausschnitt Tabelle, Datensatz, Attribut und Attributwert benennen. | 2' | K01, K47 | – |
| W-A1-02 | Klammer-Check | Angeben, welche von sechs Zeilen `WHERE Kategorie = 'Sonstiges' OR Farbe = 'rot' AND Wert > 10` liefert – und was Klammern um die OR-Bedingung ändern. | 3' | K17, K29 | P6 |
| W-A1-03 | Zweistufig sortieren | Abfrage notieren: alle Fundsachen, sortiert nach Kategorie aufsteigend, innerhalb nach Wert absteigend. | 3' | K21, K15 | – |
| W-A1-04 | Schlüsselfrage | Begründen, warum Bezeichnung kein Primärschlüssel ist, obwohl sie im Ausschnitt eindeutig ist. | 2' | K02 | P8 |

### Typische Schwierigkeiten · Differenzierung · Vorbereitung
**Typische Schwierigkeiten**
- `= NULL` / `!= NULL` (P5) → NULL-Stuhl erinnern; Parser-Hinweis `NULL_VERGLEICH`.
- Datum ohne Hochkommata (`2026-09-01` wird als Rechnung 2026−9−1 gelesen!) bzw. deutsches Datumsformat (P5).
- `%` und `_` vertauscht, `LIKE 'uhr'` ohne Platzhalter (P6).
- BETWEEN-Grenzen falsch eingeschätzt (P6); `>` statt `>=`.
- LIMIT ohne ORDER BY („die drei teuersten“) → Ergebnis zufällig.
- Alias in WHERE verwendet (`WHERE Finderlohn > 5`) → in SQLite möglich, im Abitur nicht vorgesehen: Berechnung wiederholen.

**Differenzierung**
- *Schnelle:* Cold Case (Finderlohn-Stufen), Lab-Cold-Case „Schatten-Finder“, Verhör 1 schon in der Stunde.
- *Langsame:* Indizienkette mit Tipps; Werkzeugkarte 1; Musterkarten aus dem Unplugged liegen aus.

**Vorbereitung**
- Wort-/Musterkarten je Team (Unplugged-Set A1), NULL-Karte.
- Verhör 1 im Kurs auf „auto“ (Freischaltung ab 60 % der Akte-1-Punkte) oder „offen“ stellen, wenn als Hausaufgabe gedacht.

### Verhör-Blueprint: Verhör 1 · Stadtbibliothek (V1)

**Kontext-DB „Stadtbibliothek“** (eigene kleine DB, ~60 Datensätze, nüchtern, Abitur-Stil):
`Medium(<u>MedienNr</u>, Titel, Autor, Medienart, Genre, Erscheinungsjahr, Preis, Standort, AusgeliehenBis)` (Medienart z. B. 'Buch', 'Hörbuch', 'DVD'; Ausleihstatus über AusgeliehenBis, STORY 6) – Randfälle: AusgeliehenBis NULL (verfügbar), Preis NULL, Titel mit/ohne Artikel, Grenzjahre.
Rahmensatz (STORY 6, geduzt auf der Startkarte): „Bevor ich dich allein an das Fundbuch lasse, prüfe ich, ob du auch in einem fremden Archiv sauber abfragst.“ Timer 20 min, Abimodus `streng`, kein Feedback im Kampf.

| ID | Titel | Stufe | Interaktion | Kompetenz(en) | Falle(n) | Niveau | Aufgabe (gesiezt, Transfer) |
|---|---|---|---|---|---|---|---|
| A1-V-01 | Begriffe | ★ | `choice` | K01, K47 | – | gA/eA | Geben Sie an, welcher Fachbegriff (Datensatz, Attribut, Attributwert, Primärschlüssel) die markierte Stelle der Tabelle Medium bezeichnet. |
| A1-V-02 | Schlüssel | ★ | `choice` | K02 | P8 | gA/eA | Beurteilen Sie, welches Attribut als Primärschlüssel geeignet ist; der Ausschnitt enthält nur eindeutige Titel. |
| A1-V-03 | Krimis | ★ | `sql` | K15, K17 | P5 | gA/eA | Entwerfen Sie eine Abfrage, die Titel und Autor aller Medien des Genres 'Krimi' ausgibt. |
| A1-V-04 | Verfügbar | ★ | `sql` | K18 | P5 | gA/eA | Entwerfen Sie eine Abfrage, die alle zurzeit nicht ausgeliehenen Medien (AusgeliehenBis IS NULL) mit Titel und Standort ausgibt. |
| A1-V-05 | Bedingungslogik | ★ | `zeilen` | K17, K29 | P6 | gA/eA | Geben Sie an, welche Datensätze `WHERE Genre = 'Krimi' OR Genre = 'Thriller' AND Preis > 15` liefert. |
| A1-V-06 | Titelsuche | ★★ | `sql` | K19 | P6 | gA/eA | Entwerfen Sie eine Abfrage für alle Medien, deren Titel mit 'Der ' beginnt und deren Autor genau fünf Buchstaben lang ist. |
| A1-V-07 | Jahrgänge | ★★ | `sql` | K18, K32 | P6 | gA/eA | Entwerfen Sie eine Abfrage für alle Medien der Genres Roman oder Sachbuch (IN), erschienen von 2000 bis 2010 einschließlich. |
| A1-V-08 | Sortierung | ★★ | `ergebnis` | K21, K29 | – | gA/eA | Geben Sie das Ergebnis einer gegebenen Abfrage mit `ORDER BY Genre, Erscheinungsjahr DESC` für den Ausschnitt aller 7 DVDs des Bestands (`WHERE Medienart = 'DVD'`) an. |
| A1-V-09 | Ersatzkosten | ★★ | `sql` | K20, K16 | – | gA/eA | Entwerfen Sie eine Abfrage, die für alle Medien im Standort 'Magazin' Titel und `Preis + 5 AS Ersatzkosten` ausgibt. |
| A1-V-10 | Hörbücher | ★★ | `sql` | K15, K21 | – | gA/eA | Entwerfen Sie eine Abfrage, die Titel, Autor und Erscheinungsjahr aller Medien der Medienart 'Hörbuch' ausgibt, die nach 2015 erschienen sind, absteigend sortiert nach Erscheinungsjahr. |
| A1-V-11 | Die teuersten | ★★★ | `sql` | K22, K17, K18 | P6 | gA/eA | Entwerfen Sie eine Abfrage für die fünf teuersten verfügbaren Medien der Genres Krimi oder Thriller. |
| A1-V-12 | Fehlersuche | ★★★ | `lines` | K32, K18 | P5 | gA/eA | Geben Sie die Zeilen einer gegebenen Abfrage an, die fehlerhaft notiert sind (NULL-Vergleich, Text- und Datumsliterale). |

Pool-Mix ★/★★/★★★: **5/5/2 (42/42/17 %)** · Ziehung 6 = 2 × ★ + 3 × ★★ + 1 × ★★★ (max. 1 Aufgabe je Interaktionsart `choice`).

---

## DS 3 · Ermittlung 2.1 „Der rote Faden“ (A2-E1)

| Kopf |  |
|---|---|
| Doppelstunde | DS 3 |
| Akte / Ermittlung | Akte 2 · Ermittlung 2.1 (A2-E1) |
| Titel | Der rote Faden |
| Kompetenzen | K03, K04, K05, K23, K16 |
| Fallen-Schwerpunkt | P2 (Verbundbedingung fehlt → Kreuzprodukt), P7 (Präfix fehlt, FK heißt anders als PK) |
| Datenbank | StadtRad – `Station(<u>StationID</u>, Name, Stadtteil, Stellplaetze)` · `Rad(<u>RadID</u>, Typ, Baujahr, ↑StationID, Status)` · `Kunde(<u>KundenID</u>, Vorname, Nachname, Jahrgang, Tarif, Stadtteil)` · `Ausleihe(<u>AusleihID</u>, ↑RadID, ↑KundenID, ↑StartStation, ↑ZielStation, Start, Ende, DauerMin, Preis)` · `Reparatur(<u>ReparaturID</u>, ↑RadID, Datum, Grund, Kosten)` |
| Unplugged | Roter Faden (Kreuzprodukt mit Wollfäden) |
| Video | 2 |
| Verhör | – |
| Niveau | gA/eA |

### Lernziele
Die Schülerinnen und Schüler …

1. **erläutern** Primär- und Fremdschlüssel sowie die Kennzeichnungen der Kurzschreibweise (PK unterstrichen, ↑FK) am StadtRad-Schema – auch für Fremdschlüssel mit abweichendem Namen (StartStation → StationID).
2. **beschreiben** den Verbund als Kreuzprodukt mit anschließender Filterung (FK = PK) und **bestimmen** die Zeilenzahl eines Kreuzprodukts.
3. **entwerfen** Verbundabfragen über zwei Tabellen im impliziten Stil `FROM a, b WHERE a.fk = b.pk` mit qualifizierten Spaltennamen.
4. **erklären**, warum Datensätze mit NULL im Fremdschlüssel im Verbund nicht erscheinen.

### Verlaufsplan
| Phase | Zeit | Inhalt / Ablauf | Sozialform | Material | Lab |
|---|---|---|---|---|---|
| Warm-up | 0–10' | Karten W-A1-05…08 (LIKE, NULL, BETWEEN, LIMIT); Auflösung Karte 06 (NULL-Falle) an der Tafel. | EA → Team | Warm-up-Karten A1 | Leitner optional |
| Briefing | 10–20' | Akte 2 öffnen (STORY 5.3): Bent Hollwedel, Betriebsleiter von StadtRad, vermisst fünf Lastenräder, die nachts verschwunden sind. Schema am Beamer in Kurzschreibweise. Impulse: *„Wo steht, an welcher Station Rad 17 steht?“* – *„Warum steht dort nicht der Stationsname?“* (Redundanz vermeiden) – *„StartStation und ZielStation – worauf verweisen sie, obwohl sie anders heißen?“* Begriffe Fremdschlüssel, ↑-Kennzeichnung. | LV, UG | Präsentation `DD_A2_Raeder.pptx` (Folien 1–9) | – |
| Unplugged | 20–35' | **Roter Faden** (Ablauf siehe unten): Kreuzprodukt legen, Verbundbedingung kappt Fäden. | Teams | Kartenstapel Räder/Stationen, Wollfäden | – |
| Lab-Einsatz | 35–80' | Ermittlung 2.1; Einstieg über das **Spurenbrett** (A2-E1-03), dann Kurzschreibweise und SQL. AB 2.1 parallel. | EA | iPad/Laptop, AB 2.1 | A2-E1-01…08 |
| Fallbesprechung | 80–90' | Verbund-Rezept als Merkkasten (Werkzeugkarte 3). Abi-Ecke „Erläutern Sie die Kennzeichnungen …“ (3 BE): zwei Teamlösungen vergleichen – Kernpunkte abhaken. Cliffhanger (STORY 5.3c): fünf Ausleihen, alle ab Station Hafenkante, alle mitten in der Nacht – bei keiner steht eine Ende-Zeit. | UG | Tafel | – |

### Unplugged-Aktivität im Detail
**Roter Faden (15 min).** *Material je Team:* 4 große Stationskarten (StationID, Name, Stadtteil; eine Station ohne Räder), 6 Radkarten (RadID, Typ, StationID; ein Rad mit StationID = NULL „in Werkstatt“), 24 vorgeschnittene rote Wollfäden (50 cm), Klebepunkte. Eigene Daten, nicht die Lab-DB.
1. Stationskarten links, Radkarten rechts auf den Tisch. Auftrag `FROM Rad, Station`: Verbindet **jedes** Rad mit **jeder** Station durch einen Faden. Zählen: 6 × 4 = 24 Fäden = 24 Zeilen des Kreuzprodukts.
2. Auftrag `WHERE Rad.StationID = Station.StationID`: Entfernt alle Fäden, bei denen die Nummern nicht übereinstimmen. Es bleiben 5 Fäden.
3. Impulse: *„Wo ist Rad 6?“* (StationID NULL → kein Faden bleibt) – *„Warum taucht Station Deichtor nicht auf?“* (kein Rad verweist auf sie) – *„Was passiert, wenn ihr die WHERE-Bedingung vergesst?“* (24 Zeilen, Unsinn wie „Rad 1 steht überall“).
4. Zusatz für schnelle Teams: `AND Station.Stadtteil = 'Hafenviertel'` – welche Fäden bleiben?
*Sicherung:* Foto des Tisches nach Schritt 2; Tafel „Verbund = Kreuzprodukt + Filter FK = PK“. Danach dasselbe im Spurenbrett des Labs (Zähler „45 × 13 = 585 Fäden → nur die 26 Räder mit Station bleiben“).

### Tafelbild / Merkkasten „Ermittler-Notiz“
**Station**(<u>StationID</u>, Name, Stadtteil, Stellplaetze)
**Rad**(<u>RadID</u>, Typ, Baujahr, ↑StationID, Status)
**Ausleihe**(<u>AusleihID</u>, ↑RadID, ↑KundenID, ↑StartStation, ↑ZielStation, Start, Ende, DauerMin, Preis)

- **Primärschlüssel** (unterstrichen): identifiziert jeden Datensatz eindeutig.
- **Fremdschlüssel** (↑): verweist auf den Primärschlüssel einer Tabelle; er **darf anders heißen** (`Ausleihe.StartStation` → `Station.StationID`) und darf NULL sein (Rad in der Werkstatt).

```sql
SELECT Rad.RadID, Rad.Typ, Station.Name
FROM Rad, Station
WHERE Rad.StationID = Station.StationID
  AND Station.Stadtteil = 'Hafenviertel';
```
**Verbund-Rezept:** ① alle beteiligten Tabellen in FROM ② je Tabellenpaar eine Verbundbedingung FK = PK (n Tabellen → mindestens n − 1 Bedingungen) ③ gleichnamige Spalten mit Tabellenpräfix ④ erst dann weitere Bedingungen mit AND.
Ohne ② entsteht das Kreuzprodukt: 45 Räder × 13 Stationen = 585 Zeilen; mit Verbundbedingung bleiben 26 (19 Räder ohne Station fallen heraus).

### Lab-Blueprint (A2-E1)

| ID | Titel | Stufe | Interaktion | Kompetenz(en) | Falle(n) | Niveau | Inhalt |
|---|---|---|---|---|---|---|---|
| A2-E1-01 | Der Pfeil im Schema | ★ | `choice` | K03, K05 | – | gA/eA | Im Schema `Rad(RadID, Typ, Baujahr, ↑StationID, Status)` die zutreffenden Aussagen zu ↑StationID und der Unterstreichung auswählen (Mehrfachauswahl, Richtung des Verweises Rad → Station). |
| A2-E1-02 | Zeichen der Kurzschreibweise | ★ | `match` | K04, K05 | – | gA/eA | Kennzeichnungen (unterstrichen, ↑, zwei unterstrichene Attribute, ↑ und unterstrichen) ihren Bedeutungen zuordnen – an Rad und einer geplanten Tabelle Ladeplatz(↑StationID, PlatzNr, Leistung). |
| A2-E1-03 | Spurenbrett | ★ | `zeilen` | K23, K03 | P2 | gA/eA | Auf dem Spurenbrett (6 Räder × 4 Stationen) die Fäden/Zeilen antippen, die `Rad.StationID = Station.StationID` erfüllen; Rad mit StationID NULL bleibt ohne Faden. |
| A2-E1-04 | Wohin zeigt der Pfeil? | ★★ | `gaps` | K04, K03 | P7 | gA/eA | Kurzschreibweise von Ausleihe vervollständigen: fehlende ↑ setzen und angeben, auf welche Relation StartStation, ZielStation und KundenID verweisen. |
| A2-E1-05 | 585 Fäden | ★★ | `ergebnis` | K23, K29 | P2 | gA/eA | Zeilenzahl von `SELECT * FROM Rad, Station` (ohne WHERE) und mit Verbundbedingung angeben (Zahlen aus dem Schema-Browser ablesen: 45 × 13 = 585; mit Bedingung 26, weil 19 Räder `StationID` NULL haben). |
| A2-E1-06 | Wo steht welches Rad? | ★★ | `sql` | K23, K16 | P7 | gA/eA | RadID, Typ und Name der Station aller Räder (Präfix bei der gleichnamigen Spalte StationID). |
| A2-E1-07 | Keine Citybikes am Bahnhof | ★★★ | `sql` | K23, K17 | P2, P7 | gA/eA | Alle Räder, die **keine** Citybikes sind (`Rad.Typ != 'Citybike'`) und an einer Station im Stadtteil Bahnhofsviertel stehen, mit RadID, Typ und Stationsname, sortiert nach Stationsname. |
| A2-E1-08 | Gerade unterwegs | ★★★ | `sql` | K23, K18 | P5 | gA/eA | Alle Lastenräder, die gerade ausgeliehen sind (`Ausleihe.Ende IS NULL`), mit RadID, Start und KundenID. |

Stufenmix ★/★★/★★★: **3/3/2 (38/38/25 %)** · Interaktionsarten: `choice`, `ergebnis`, `gaps`, `match`, `sql`, `zeilen`

**Cold Case im Lab (ohne Punkte):** `A2-E1-CC` „Räder ohne Heimat“ (K18, K23) – Warum fehlen in deiner Lösung zu A2-E1-06 einige Räder? Finde sie mit einer Abfrage auf Rad allein und erkläre, was mit ihnen im Verbund passiert.

### Arbeitsblatt-Blueprint AB 2.1 („Ermittlungsakte“)

- **Kopfband:** AKTE 2 · ERMITTLUNG 2.1 · DS 3 – „Der rote Faden“, Stempel STADTRAD
- **Fall-Einstieg:** Bent Hollwedel von StadtRad vermisst fünf Lastenräder. Er hat der Detektei die Datenbank geöffnet – aber die Informationen sind auf mehrere Tabellen verteilt.

- **Beweisstück-Kästen:**
  1. Das StadtRad-Schema in Kurzschreibweise (PK unterstrichen, ↑FK) mit Pfeildiagramm der Verweise
  2. Fremdschlüssel mit abweichendem Namen (StartStation/ZielStation → StationID)
  3. Kreuzprodukt und Verbund – Bild aus dem Roten Faden, Zeilenzahl-Formel
  4. Verbund-Rezept (vier Schritte) mit Beispiel im Format „SQL-Code“

- **Ermittlungsaufträge:**

| Nr. | Stufe | Ort | Auftrag | Kompetenz |
|---|---|---|---|---|
| 1 | ★ | PAPIER | Erläutere die Kennzeichnungen in `Reparatur(ReparaturID, ↑RadID, Datum, Grund, Kosten)`. | K04, K05 |
| 2 | ★ | PAPIER | Bestimme die Zeilenzahl von `FROM Kunde, Ausleihe` ohne WHERE (Tabellengrößen gegeben). | K23, K29 |
| 3 | ★★ | PAPIER | Notiere die Verbundbedingung für Ausleihe–Station über die Startstation und begründe das Präfix. | K03, K16 |
| 4 | ★★ | LAB | Alle Reparaturen über 100 € mit Datum, Grund und Typ des Rades. | K23 |
| 5 | ★★★ | PAPIER | Erkläre, warum `SELECT Name FROM Rad, Station WHERE StationID = StationID` nicht funktioniert, und korrigiere. | K16, K23 |

- **Abi-Ecke** (rot gerahmt, K04, K05, K03): Gegeben ist die Relation `Ausleihe(AusleihID, ↑RadID, ↑KundenID, ↑StartStation, ↑ZielStation, Start, Ende, DauerMin, Preis)`. **Erläutern** Sie die Kennzeichnungen in dieser Relation. **[3 BE]** – Operator **erläutern**, AFB I/II.

- **Spur im Lab:** Ermittlung 2.1, Einstieg Spurenbrett (A2-E1-03), dann A2-E1-01…08.

- **Cold Case:** „Doppelt verbunden“: Wie viele Zeilen liefert `FROM Ausleihe, Station WHERE Ausleihe.StartStation = Station.StationID OR Ausleihe.ZielStation = Station.StationID`? Erkläre, was diese Abfrage eigentlich zeigt.

### Warm-up-Karten

Wiederholung von DS 2 (LIKE, NULL, BETWEEN, LIMIT).

| ID | Titel | Aufgabe | Min. | Kompetenz | Falle |
|---|---|---|---|---|---|
| W-A1-05 | Platzhalter | Zu den Mustern 'Sch%', '%ring', 'M_tze' und '_a%' je ein passendes und ein unpassendes Wort nennen. | 2' | K19 | P6 |
| W-A1-06 | Die NULL-Falle | Erklären, warum `WHERE AbgeholtAm = NULL` keine Zeile liefert, und die Bedingung korrigieren. | 2' | K18 | P5 |
| W-A1-07 | Grenzgänger | Angeben, ob ein Fund vom '2026-09-30' von `BETWEEN '2026-09-01' AND '2026-09-30'` erfasst wird, und zwei falsch notierte Datumsliterale korrigieren. | 3' | K18, K32 | P5, P6 |
| W-A1-08 | Top 3 | Abfrage notieren: die drei wertvollsten noch nicht abgeholten Fundsachen mit Bezeichnung und Wert. | 3' | K22, K18, K21 | P5 |

### Typische Schwierigkeiten · Differenzierung · Vorbereitung
**Typische Schwierigkeiten**
- Verbundbedingung vergessen → riesige Ergebnistabelle (P2); Diagnose „Zeilenzahl = Produkt der Tabellengrößen“ → Spurenbrett.
- `WHERE StationID = StationID` ohne Präfix → „mehrdeutig“ (P7, Parser `MEHRDEUTIG`).
- Fremdschlüssel mit anderem Namen nicht erkannt (`Ausleihe.StartStation = Station.StationID`) (P7).
- Verwechslung PK/FK-Richtung: „Station verweist auf Rad“ → Pfeil zeigt immer zum Primärschlüssel.
- NULL im FK: Räder in der Werkstatt „verschwinden“ – kein Fehler der Abfrage, sondern Verbundlogik.

**Differenzierung**
- *Schnelle:* Cold Case „Doppelt verbunden“; Lab-Cold-Case; Ausblick auf drei Tabellen (Kunde–Ausleihe–Rad).
- *Langsame:* Spurenbrett frei nutzen, Verbund-Rezept (Werkzeugkarte 3) als Schablone, ★-Aufgaben mit Tipp.

**Vorbereitung**
- Unplugged-Set „Roter Faden“: je Team 4 Stations- und 6 Radkarten, 24 Wollfäden (vorher schneiden!).
- Akte 2 freischalten; Schema-Plakat StadtRad (A3) aufhängen.

---

## DS 4 · Ermittlung 2.2 „Nachtfahrten“ (A2-E2)

| Kopf |  |
|---|---|
| Doppelstunde | DS 4 |
| Akte / Ermittlung | Akte 2 · Ermittlung 2.2 (A2-E2) |
| Titel | Nachtfahrten |
| Kompetenzen | K24, K18 (IS NULL), K22 · Übung K16, K23 |
| Fallen-Schwerpunkt | P2 (falscher FK-Pfad), P5 (IS NULL, laufende Ausleihen fallen beim Verbund über ZielStation heraus), P7 (Alias, zwei FKs auf Station) |
| Datenbank | StadtRad (wie DS 3) – Randfälle: laufende Ausleihen (Ende/ZielStation NULL), Rad in Werkstatt (StationID NULL), Gleichnamige |
| Unplugged | Ermittlungsweg durchs Schema |
| Video | 2 |
| Verhör | Verhör 2 · Bürgerbus (V2) |
| Niveau | gA/eA |

### Lernziele
Die Schülerinnen und Schüler …

1. **planen** den „Ermittlungsweg durchs Schema“ (welche Tabellen, welche Verbundbedingungen) und **beschreiben** ihn in Worten.
2. **entwerfen** Verbundabfragen über drei und vier Tabellen mit Tabellenaliasen.
3. **entwerfen** Abfragen, in denen eine Tabelle zweimal (mit zwei Aliasen) vorkommt, weil zwei Fremdschlüssel auf sie verweisen (Start-/Zielstation).
4. **erläutern**, warum laufende Ausleihen (ZielStation NULL) beim Verbund über die Zielstation herausfallen, und **berücksichtigen** `IS NULL` korrekt.

### Verlaufsplan
| Phase | Zeit | Inhalt / Ablauf | Sozialform | Material | Lab |
|---|---|---|---|---|---|
| Warm-up | 0–10' | Karten W-A2-01…04 (Kurzschreibweise, Kreuzprodukt, Verbund über zwei Tabellen, FK mit anderem Namen). | EA → Team | Warm-up-Karten A2 | Leitner optional |
| Briefing | 10–20' | Bent Hollwedel (STORY 5.4): *„Die Räder sind weiter verschwunden, die Versicherung stellt Fragen.“* Wir wissen, wo die Fahrten begannen (Hafenkante), aber nicht, wer sie gestartet hat. Frage → Tabellen: Kunde, Ausleihe, Rad, Station. Impulse: *„Welche Tabellen braucht ihr für ‚Name des Kunden + Name der Startstation‘?“* – *„Die Ausleihe hat zwei Pfeile auf Station. Wie bekommt ihr *beide* Stationsnamen in eine Zeile?“* Tabellenalias einführen. | LV, UG | Präsentation Akte 2 (Folien 12–20), Schema-Plakat | – |
| Unplugged | 20–35' | **Ermittlungsweg durchs Schema** (Ablauf siehe unten). | Teams | Schema-Karten, Fragekarten, Faden | – |
| Lab-Einsatz | 35–80' | Ermittlung 2.2; Reihenfolge ★ → ★★★, 07/08 = Nachtfahrten des verdächtigen Kontos. AB 2.2 parallel. | EA | iPad/Laptop, AB 2.2 | A2-E2-01…08 |
| Fallbesprechung | 80–90' | Story-Auflösung Akte 2: Kundenkonto 77 „Nora Falter“, Jahrgang 1988, Hafenviertel, Tarif Plus – N. F. wie im Fundbuch (Beweisstück Schloss-Code); Cliffhanger: In der Stadtfest-Kasse fehlen 312,50 €. Merkkasten: zwei Aliase für eine Tabelle; IS NULL. Abi-Ecke (4 BE). Hinweis Verhör 2 (20'). | UG | Tafel | Verhör 2 freigeschaltet |

### Unplugged-Aktivität im Detail
**Ermittlungsweg durchs Schema (15 min).** *Material je Team:* 5 Tabellenkarten (A5, mit Attributen; PK unterstrichen, ↑FK rot), 2 zusätzliche leere Karten „Kopie von …“, 4 Fragekarten, ein langer Faden, Folienstift.
1. Fragekarte 1: *„Vor- und Nachname aller Kunden, die ein Lastenrad ausgeliehen haben.“* Das Team legt nur die benötigten Karten in eine Reihe (Kunde – Ausleihe – Rad) und spannt den Faden über die Verweise; an jeden Übergang wird die Verbundbedingung geschrieben.
2. Fragekarte 2: *„Name der Start- **und** Zielstation jeder Ausleihe.“* → Ausleihe hat zwei Pfeile auf Station. Das Team merkt: eine Station-Karte reicht nicht. Lösung: „Kopie von Station“ anlegen → Alias `s1`, `s2`.
3. Fragekarte 3: *„Welche Kunden haben Räder ausgeliehen, die an der Station *Deichtor* stehen?“* (Pfad über Rad.StationID statt über StartStation – zwei mögliche Pfade, unterschiedliche Bedeutung!).
4. Fragekarte 4 (★★★): *„Wo sind die Räder gerade, die noch unterwegs sind?“* → ZielStation ist NULL: ein Verbund über ZielStation verliert genau diese Ausleihen.
*Sicherung:* Teams fotografieren Wege; an der Tafel die Lösung zu Karte 2 als SQL notieren.

### Tafelbild / Merkkasten „Ermittler-Notiz“
```sql
SELECT k.Vorname, k.Nachname, s1.Name AS Startort, s2.Name AS Zielort, a.DauerMin
FROM Ausleihe a, Kunde k, Station s1, Station s2
WHERE a.KundenID = k.KundenID
  AND a.StartStation = s1.StationID
  AND a.ZielStation = s2.StationID
ORDER BY a.DauerMin DESC
LIMIT 5;
```
```sql
SELECT k.Vorname, k.Nachname, r.RadID, s.Name AS Startort, a.Start
FROM Ausleihe a, Kunde k, Rad r, Station s
WHERE a.KundenID = k.KundenID
  AND a.RadID = r.RadID
  AND a.StartStation = s.StationID
  AND r.Typ = 'Lastenrad'
  AND a.Ende IS NULL;
```
**Ermittler-Notiz:** Zwei Fremdschlüssel auf dieselbe Tabelle → Tabelle zweimal in FROM mit zwei Aliasen (Alias ohne AS, wie in den EH). · Laufende Ausleihen haben `Ende IS NULL` und `ZielStation IS NULL` → ein Verbund über ZielStation lässt sie verschwinden. · Ermittlungsweg: Frage → benötigte Attribute → Tabellen → Verbundbedingungen → Filter → Sortierung.

### Lab-Blueprint (A2-E2)

| ID | Titel | Stufe | Interaktion | Kompetenz(en) | Falle(n) | Niveau | Inhalt |
|---|---|---|---|---|---|---|---|
| A2-E2-01 | Welche Verbundbedingung gehört wohin? | ★ | `match` | K24, K03 | P7 | gA/eA | Tabellenpaaren (Ausleihe–Rad, Ausleihe–Kunde, Ausleihe–Station über Start, Rad–Station) die passende Verbundbedingung zuordnen. |
| A2-E2-02 | Ausleihen am Stadtfest-Samstag | ★ | `sql` | K23, K16, K19 | P7 | gA/eA | Vor- und Nachname der Kunden und Startzeit aller Ausleihen am 2026-08-29 (`a.Start LIKE '2026-08-29%'`), mit Tabellenalias. |
| A2-E2-03 | Der gerissene Faden | ★ | `lines` | K24 | P2, P7 | gA/eA | In einer Verbundabfrage über drei Tabellen (Lastenrad-Ausleihen) die Zeile mit der falschen Verbundbedingung antippen (`a.RadID = r.StationID` statt `a.RadID = r.RadID`). |
| A2-E2-04 | Vier Tabellen, eine Spur | ★★ | `sql` | K24 | P2 | gA/eA | Kundenname, Radtyp und Name der Startstation aller Ausleihen mit einem Preis über 10 €. |
| A2-E2-05 | Von hier nach dort | ★★ | `sql` | K24, K16 | P7 | gA/eA | Alle abgeschlossenen Ausleihen mit AusleihID sowie Name der Start- und der Zielstation (Station zweimal: s1, s2). |
| A2-E2-06 | Die leere Zielstation | ★★ | `ergebnis` | K18, K29 | P5 | gA/eA | Zeilenzahl vorhersagen: `… WHERE ZielStation IS NULL` vs. `… WHERE ZielStation = NULL` auf einem Ausschnitt mit 3 laufenden Ausleihen. |
| A2-E2-07 | Nachtfahrten | ★★★ | `sql` | K24, K18 | P5 | gA/eA | Alle laufenden Ausleihen (`Ende IS NULL`) von Lastenrädern ab Station 'Hafenkante' mit Kundenname, KundenID und Start, sortiert nach Start (fünf Fahrten 2026-09-08…12, jeweils 01–02 Uhr, Konto 77). |
| A2-E2-08 | Die längsten Fahrten | ★★★ | `sql` | K24, K22, K16 | P7 | gA/eA | Die fünf längsten abgeschlossenen Fahrten (DauerMin) mit Kundenname, Start- und Zielstationsname (Station zweimal, LIMIT 5, kein Gleichstand an Platz 5). |

Stufenmix ★/★★/★★★: **3/3/2 (38/38/25 %)** · Interaktionsarten: `ergebnis`, `lines`, `match`, `sql`

**Cold Case im Lab (ohne Punkte):** `A2-E2-CC` „Rundfahrten“ (K24, K17) – Welche Kunden beenden ihre Fahrt an derselben Station, an der sie begonnen haben? Gib zusätzlich den Stadtteil dieser Station aus – reicht hier ein Alias?

### Arbeitsblatt-Blueprint AB 2.2 („Ermittlungsakte“)

- **Kopfband:** AKTE 2 · ERMITTLUNG 2.2 · DS 4 – „Nachtfahrten“, Stempel STADTRAD
- **Fall-Einstieg:** Fünf Nächte (8. bis 12. September), jeweils zwischen 01:00 und 02:00 Uhr, starten an der Station Hafenkante Lastenrad-Ausleihen, die nie enden. Edda Lorenz: „Folgt dem Faden durch alle Tabellen.“

- **Beweisstück-Kästen:**
  1. Ermittlungsweg durchs Schema – Schrittfolge mit Pfeildiagramm
  2. Tabellenalias – Kurzform und Pflicht, wenn eine Tabelle zweimal vorkommt
  3. Zwei Fremdschlüssel auf dieselbe Tabelle – Beispiel Start-/Zielstation
  4. NULL im Verbund – laufende Ausleihen

- **Ermittlungsaufträge:**

| Nr. | Stufe | Ort | Auftrag | Kompetenz |
|---|---|---|---|---|
| 1 | ★ | PAPIER | Beschreibe den Ermittlungsweg für „Name aller Kunden, die ein Rad an der Station Fischmarkt ausgeliehen haben“. | K24, K30 |
| 2 | ★ | PAPIER | Ergänze die fehlende Verbundbedingung in einer vorgegebenen Abfrage über vier Tabellen. | K24 |
| 3 | ★★ | LAB | Alle Reparaturen an Rädern, die zurzeit an einer Station in der **Altstadt** stehen (Reparatur, Rad, Station; im Hafenviertel gäbe es 0 Zeilen – Material Phase 7). | K24 |
| 4 | ★★ | PAPIER | Notiere eine Abfrage mit Start- und Zielstationsname für alle Ausleihen von Kundin **Clara Rossi** (in der DB vorhanden, mit laufender Ausleihe; Material Phase 7). | K24, K16 |
| 5 | ★★★ | PAPIER | Begründe, warum die Abfrage aus Auftrag 4 laufende Ausleihen nicht anzeigt, und beschreibe, wie du sie trotzdem (ohne Zielstation) erhältst. | K18, K24 |

- **Abi-Ecke** (rot gerahmt, K24, K16, K17): **Entwerfen** Sie eine SQL-Abfrage, die für alle Ausleihen, die im Stadtteil Hafenviertel begonnen und in einem anderen Stadtteil beendet wurden, die AusleihID sowie die Namen von Start- und Zielstation ausgibt. **[4 BE]** – Operator **entwerfen**, AFB II/III.

- **Spur im Lab:** Ermittlung 2.2, A2-E2-01…08; danach Verhör 2 (20').

- **Cold Case:** „Ein Konto, viele Räder“: Finde heraus, ob ein Kundenkonto mehrere Räder gleichzeitig ausgeliehen hat (laufende Ausleihen). Beschreibe dein Vorgehen – mit GROUP BY geht es ab DS 5 eleganter.

### Warm-up-Karten

Wiederholung von DS 3 (Schlüssel, Kurzschreibweise, Verbund über zwei Tabellen).

| ID | Titel | Aufgabe | Min. | Kompetenz | Falle |
|---|---|---|---|---|---|
| W-A2-01 | Kurzschreibweise lesen | Die Kennzeichnungen in `Reparatur(ReparaturID, ↑RadID, Datum, Grund, Kosten)` erläutern. | 2' | K04, K05 | – |
| W-A2-02 | Fäden zählen | Zeilenzahl von `SELECT * FROM Ausleihe, Kunde` (469 und 80 Datensätze) ohne WHERE (469 · 80 = 37 520) und mit der Verbundbedingung `Ausleihe.KundenID = Kunde.KundenID` (469) angeben. | 2' | K23, K29 | P2 |
| W-A2-03 | Zwei Tabellen | Abfrage notieren: Typ jedes Rades und Name seiner Station. | 3' | K23, K16 | P7 |
| W-A2-04 | Anderer Name, gleicher Verweis | Verbundbedingung für Ausleihe und Station über die Zielstation notieren und das Präfix begründen. | 3' | K03, K16 | P7 |

### Typische Schwierigkeiten · Differenzierung · Vorbereitung
**Typische Schwierigkeiten**
- Eine Station-Tabelle für Start und Ziel → Bedingung `StartStation = StationID AND ZielStation = StationID` liefert nur Rundfahrten (P7/P2).
- Aliase in SELECT nicht verwendet, nachdem sie in FROM vergeben wurden (`Station.Name` trotz `Station s1`) → Fehler.
- Verbund über den falschen Pfad (Rad.StationID statt Ausleihe.StartStation) – syntaktisch korrekt, inhaltlich falsch (P2).
- Laufende Ausleihen verschwinden unbemerkt (P5) → Prüf-Variante `+null` zeigt „passt nur zufällig“.
- Zu wenige Verbundbedingungen bei vier Tabellen (Zähler n − 1).

**Differenzierung**
- *Schnelle:* Cold Case, Lab-Cold-Case „Rundfahrten“, Verhör 2 in der Stunde.
- *Langsame:* Schema-Karten aus dem Unplugged liegen weiter aus; Werkzeugkarte 3; Spurenbrett mit drei Tabellen.

**Vorbereitung**
- Schema-Karten-Set (5 Tabellen + 2 Kopie-Karten) je Team, Fragekarten.
- Verhör 2 im Kurs auf „auto“/„offen“.

### Verhör-Blueprint: Verhör 2 · Bürgerbus (V2)

**Kontext-DB „Bürgerbus“** (eigene kleine DB):
`Haltestelle(<u>HaltID</u>, Name, Ortsteil)` · `Fahrer(<u>FahrerNr</u>, Vorname, Nachname, Telefon)` · `Bus(<u>Kennzeichen</u>, Sitzplaetze)` ·
`Fahrt(<u>FahrtNr</u>, ↑FahrerNr, ↑Kennzeichen, ↑StartHalt, ↑ZielHalt, Datum, Abfahrt, Fahrgaeste)` – zwei FKs auf Haltestelle, Fahrgaeste teils NULL, gleichnamige Fahrer.
Rahmensatz: „Wer Räder verfolgen kann, kann auch Busse verfolgen – zeig es mir.“ Timer 20 min, Abimodus `streng`.

| ID | Titel | Stufe | Interaktion | Kompetenz(en) | Falle(n) | Niveau | Aufgabe (gesiezt, Transfer) |
|---|---|---|---|---|---|---|---|
| A2-V-01 | Fremdschlüssel | ★ | `choice` | K03 | – | gA/eA | Geben Sie an, welche Aussage die Bedeutung von ↑FahrerNr in der Relation Fahrt korrekt beschreibt. |
| A2-V-02 | Kennzeichnungen | ★ | `match` | K04, K05 | P7 | gA/eA | Ordnen Sie den Kennzeichnungen des Schemas Fahrt ihre Bedeutung zu (auch ↑StartHalt → Haltestelle). |
| A2-V-03 | Fahrten mit Fahrer | ★ | `sql` | K23 | P2 | gA/eA | Entwerfen Sie eine Abfrage, die für alle Fahrten Datum, Abfahrt und Nachname des Fahrers ausgibt. |
| A2-V-04 | Kreuzprodukt | ★ | `ergebnis` | K23, K29 | P2 | gA/eA | Geben Sie die Anzahl der Datensätze von `SELECT * FROM Fahrer, Bus` an (Tabellengrößen gegeben). |
| A2-V-05 | Passende Paare | ★ | `zeilen` | K23 | P2 | gA/eA | Geben Sie an, welche Zeilen des Kreuzprodukts Fahrt × Fahrer die Verbundbedingung erfüllen. |
| A2-V-06 | Volle Busse | ★★ | `sql` | K23, K17 | P7 | gA/eA | Entwerfen Sie eine Abfrage für alle Fahrten der Fahrerin mit der FahrerNr 4 mit mehr als 6 Fahrgästen, inklusive Fahrername. |
| A2-V-07 | Start und Ziel | ★★ | `sql` | K24, K16 | P7 | gA/eA | Entwerfen Sie eine Abfrage, die zu jeder Fahrt die Namen der Start- und der Zielhaltestelle ausgibt. |
| A2-V-08 | Große Busse | ★★ | `sql` | K24 | P2 | gA/eA | Entwerfen Sie eine Abfrage, die die Namen aller Fahrer ohne Wiederholung ausgibt, die einen Bus mit mehr als 8 Sitzplätzen gefahren haben. |
| A2-V-09 | Fehlerzeile | ★★ | `lines` | K24 | P2, P7 | gA/eA | Geben Sie die fehlerhafte Zeile einer Verbundabfrage über drei Tabellen an. |
| A2-V-10 | Fehlende Zählung | ★★ | `sql` | K18, K23 | P5 | gA/eA | Entwerfen Sie eine Abfrage für alle Fahrten ohne eingetragene Fahrgastzahl mit Datum und Fahrernamen. |
| A2-V-11 | Spitzenfahrten | ★★★ | `sql` | K24, K22 | P7 | gA/eA | Entwerfen Sie eine Abfrage für die fünf Fahrten mit den meisten Fahrgästen inklusive der Namen von Start- und Zielhaltestelle. |
| A2-V-12 | Ortsteilwechsel | ★★★ | `sql` | K24, K17 | P6, P7 | gA/eA | Entwerfen Sie eine Abfrage für alle Fahrten, die im Ortsteil Nordheide beginnen und in einem anderen Ortsteil enden. |

Pool-Mix ★/★★/★★★: **5/5/2 (42/42/17 %)** · Ziehung 6 = 2 × ★ + 3 × ★★ + 1 × ★★★ (max. 1 Aufgabe je Interaktionsart `choice`); mindestens eine Aufgabe zu zwei FKs auf dieselbe Tabelle (A2-V-07, -11 oder -12).

---

## DS 5 · Ermittlung 3.1 „Kassensturz“ (A3-E1)

| Kopf |  |
|---|---|
| Doppelstunde | DS 5 |
| Akte / Ermittlung | Akte 3 · Ermittlung 3.1 (A3-E1) |
| Titel | Kassensturz |
| Kompetenzen | K25, K26 · Übung K23, K24, K20, K21 |
| Fallen-Schwerpunkt | P3 (GROUP-BY-Regel, nach Name statt Schlüssel gruppiert), P4 (COUNT ↔ SUM, COUNT(*) vs. COUNT(spalte)) |
| Datenbank | Stadtfest – `Stand(<u>StandNr</u>, Name, Art, Platz)` · `Helfer(<u>HelferNr</u>, Vorname, Nachname, Jahrgang, Verein)` · `Schicht(<u>↑HelferNr, ↑StandNr, Beginn</u>, Ende)` · `Produkt(<u>ProduktNr</u>, Bezeichnung, Preis, ↑StandNr)` · `Bon(<u>BonNr</u>, ↑StandNr, ↑HelferNr, Zeitpunkt, Zahlart)` · `Position(<u>↑BonNr, ↑ProduktNr</u>, Menge)` |
| Unplugged | Menschliches GROUP BY (Fächer) |
| Video | 3 |
| Verhör | – |
| Niveau | gA/eA |

### Lernziele
Die Schülerinnen und Schüler …

1. **entwerfen** Abfragen mit den Aggregatfunktionen COUNT, SUM, AVG, MIN, MAX ohne GROUP BY und **unterscheiden** COUNT(*), COUNT(spalte) und SUM(Menge).
2. **beschreiben** die Wirkung von GROUP BY als Bildung von Gruppen (Fächern) mit je einer Ergebniszeile.
3. **entwerfen** gruppierte Abfragen unter strikter Einhaltung der GROUP-BY-Regel und gruppieren nach dem Schlüssel (nicht nur nach dem Namen).
4. **geben** das Ergebnis einer gruppierten Abfrage auf einem kleinen Datenausschnitt konkret **an**.

### Verlaufsplan
| Phase | Zeit | Inhalt / Ablauf | Sozialform | Material | Lab |
|---|---|---|---|---|---|
| Warm-up | 0–10' | Karten W-A2-05…08 (Ermittlungsweg, Station zweimal, IS NULL, Fehlerzeile). | EA → Team | Warm-up-Karten A2 | Leitner optional |
| Briefing | 10–20' | Akte 3 (STORY 5.5): Frauke Melchers, Kassenwartin des Festausschusses, meldet *312,50 € Fehlbetrag*. Schema Stadtfest; Impulse: *„Wie viele Bons gab es? Wie viele Bratwürste wurden verkauft? – Ist das dieselbe Zahl?“* (COUNT vs. SUM) – *„Wir wollen die Anzahl je Stand. Wie viele Ergebniszeilen erwartet ihr?“* | LV, UG | Präsentation `DD_A3_Stadtfest.pptx` (Folien 1–10) | – |
| Unplugged | 20–35' | **Menschliches GROUP BY** (Ablauf siehe unten): Fächer bilden, zählen, summieren, GROUP-BY-Regel erleben. | Plenum, Teams | Bon-Karten, Fächerschilder | – |
| Lab-Einsatz | 35–80' | Ermittlung 3.1; Einstieg über **Sortierfächer** (A3-E1-04). AB 3.1 parallel. | EA | iPad/Laptop, AB 3.1 | A3-E1-01…08 |
| Fallbesprechung | 80–90' | Merkkasten GROUP-BY-Regel + COUNT/SUM. Abi-Ecke (4 BE). Cliffhanger (STORY 5.5c): Am Kaffeemobil gibt es Bons voller Positionen – aber auffällig viele mit der Menge 0. Impuls: *„Wie finden wir nur die auffälligen Gruppen?“* (HAVING) | UG | Tafel | – |

### Unplugged-Aktivität im Detail
**Menschliches GROUP BY (15 min).** *Material:* 30 Bon-Karten (BonNr, Stand, Helfer, Zahlart, Menge, Betrag; eigene Daten), 4 Fächerschilder (Standnamen) für die Raumecken, Tafel mit Ergebnistabelle.
1. Jede/r erhält eine Bon-Karte. `SELECT COUNT(*) FROM Bon` → alle stehen auf, Zähler/in zählt: eine Zahl, eine Ergebniszeile.
2. `… GROUP BY Stand` → alle gehen in die Ecke ihres Standes (Fach). Je Fach bestimmt das Team einen **Zähler** (COUNT(*)) und einen **Summierer** (SUM(Betrag)); Ergebnisse an die Tafel: eine Zeile je Fach.
3. `SELECT Stand, Helfer, COUNT(*) … GROUP BY Stand` → *„Welchen Helfer soll euer Fach melden?“* Im Fach stehen verschiedene Helfer → keine eindeutige Antwort → **GROUP-BY-Regel**.
4. `SELECT Stand, SUM(Menge)` vs. `COUNT(*)` → Fach mit vielen Kleinbons vs. wenigen Großbons: andere Rangfolge (P4).
5. `WHERE Zahlart = 'Karte'` **vor** dem Gruppieren: Barzahler setzen sich, bevor die Fächer gebildet werden (Vorbereitung auf DS 6).
*Sicherung:* Ergebnistabelle an der Tafel bleibt als Tafelbild; Merksatz zur GROUP-BY-Regel.

### Tafelbild / Merkkasten „Ermittler-Notiz“
```sql
SELECT COUNT(*) AS Bons, MIN(Zeitpunkt) AS ErsterBon, MAX(Zeitpunkt) AS LetzterBon
FROM Bon;                                        -- ohne GROUP BY: genau eine Ergebniszeile

SELECT Stand.StandNr, Stand.Name, COUNT(*) AS AnzahlBons
FROM Bon, Stand
WHERE Bon.StandNr = Stand.StandNr
GROUP BY Stand.StandNr, Stand.Name
ORDER BY AnzahlBons DESC;

SELECT Produkt.ProduktNr, Produkt.Bezeichnung, SUM(Position.Menge) AS Stueck
FROM Position, Produkt
WHERE Position.ProduktNr = Produkt.ProduktNr
GROUP BY Produkt.ProduktNr, Produkt.Bezeichnung;
```
**GROUP-BY-Regel:** Jede Spalte im SELECT ist entweder aggregiert oder in GROUP BY aufgezählt. · Nach dem **Schlüssel** gruppieren (zwei Helferinnen heißen „Lotta Bödeker“!) und Namen zusätzlich in GROUP BY aufnehmen. · `COUNT(*)` zählt Zeilen, `COUNT(Spalte)` zählt Nicht-NULL-Werte, `SUM(Menge)` addiert Stückzahlen. · „Anzahl Käufe“ = COUNT(*), „Anzahl verkaufter Stück“ = SUM(Menge).

### Lab-Blueprint (A3-E1)

| ID | Titel | Stufe | Interaktion | Kompetenz(en) | Falle(n) | Niveau | Inhalt |
|---|---|---|---|---|---|---|---|
| A3-E1-01 | Welche Funktion? | ★ | `choice` | K25 | P4 | gA/eA | Zu vier Fragen (Anzahl Bons, verkaufte Bratwürste, teuerstes Produkt, Durchschnittspreis) die passende Aggregatfunktion auswählen. |
| A3-E1-02 | Erster und letzter Bon | ★ | `sql` | K25 | – | gA/eA | Anzahl aller Bons sowie Zeitpunkt des ersten und letzten Bons (COUNT, MIN, MAX ohne GROUP BY). |
| A3-E1-03 | Wie viele Bratwürste? | ★ | `sql` | K25, K23 | P4 | gA/eA | Gesamtzahl verkaufter Bratwürste: `SUM(Position.Menge)` über Position und Produkt (Bezeichnung 'Bratwurst'). |
| A3-E1-04 | Sortierfächer | ★★ | `ergebnis` | K26, K29 | P4 | gA/eA | Ergebnis von `SELECT ProduktNr, COUNT(*), SUM(Menge) FROM Position GROUP BY ProduktNr` für einen Ausschnitt von 10 Positionen vorhersagen (Sortierfächer zur Kontrolle). |
| A3-E1-05 | Bons je Stand | ★★ | `sql` | K26, K23 | P3 | gA/eA | Anzahl Bons je Stand mit StandNr und Name (`GROUP BY Stand.StandNr, Stand.Name`), absteigend sortiert. |
| A3-E1-06 | Regelverstoß | ★★ | `lines` | K26 | P3 | gA/eA | In drei Abfragen jeweils die Zeile antippen, die gegen die GROUP-BY-Regel verstößt (oder „korrekt“). |
| A3-E1-07 | Umsatz je Helfer | ★★★ | `sql` | K26, K25, K20, K24 | P3 | gA/eA | Umsatz `SUM(Position.Menge * Produkt.Preis)` je Helfer über Bon, Position, Produkt, Helfer; gruppiert nach HelferNr, Vorname, Nachname (Prüf-Variante `+gleichnamig`). |
| A3-E1-08 | Bons oder Stück? | ★★★ | `sql` | K25, K26, K21 | P4, P3 | gA/eA | Je Produkt die Anzahl der Positionen (`COUNT(*)`) und die verkaufte Stückzahl (`SUM(Menge)`) in einer Abfrage, sortiert nach Stückzahl absteigend (Alias in ORDER BY) – beim Kaffee des Kaffeemobils klaffen beide Zahlen auffällig auseinander (Positionen mit Menge 0). |

Stufenmix ★/★★/★★★: **3/3/2 (38/38/25 %)** · Interaktionsarten: `choice`, `ergebnis`, `lines`, `sql`

**Cold Case im Lab (ohne Punkte):** `A3-E1-CC` „Der stille Stand“ (K26, K23) – Welcher Stand taucht in deiner Lösung zu A3-E1-05 gar nicht auf? Finde ihn ohne Unterabfrage (8 Stände, 7 Ergebniszeilen → Info-Zelt, Stand 8, ohne Bon) – mit welchen Mitteln geht das, und wo stößt das Abitur-SQL an Grenzen?

### Arbeitsblatt-Blueprint AB 3.1 („Ermittlungsakte“)

- **Kopfband:** AKTE 3 · ERMITTLUNG 3.1 · DS 5 – „Kassensturz“, Stempel STADTFEST
- **Fall-Einstieg:** Nach dem Stadtfest am 29. August fehlen in der Festkasse 312,50 €. Die Stände haben jeden Verkauf als Bon erfasst. Edda Lorenz: „Zählt nicht Zettel – zählt, was verkauft wurde.“

- **Beweisstück-Kästen:**
  1. Aggregatfunktionen COUNT, SUM, AVG, MIN, MAX mit Beispiel ohne GROUP BY
  2. COUNT(*) vs. COUNT(Spalte) vs. SUM(Menge) – Gegenüberstellung an einer Mini-Tabelle
  3. GROUP BY als Fächer – Bild aus dem Unplugged
  4. GROUP-BY-Regel und „nach dem Schlüssel gruppieren“

- **Ermittlungsaufträge:**

| Nr. | Stufe | Ort | Auftrag | Kompetenz |
|---|---|---|---|---|
| 1 | ★ | PAPIER | Ordne vier Fragen der passenden Aggregatfunktion zu und begründe COUNT oder SUM. | K25 |
| 2 | ★ | PAPIER | Gib das Ergebnis einer gruppierten Abfrage auf einer Tabelle mit 8 Positionen an. | K26, K29 |
| 3 | ★★ | LAB | Durchschnittlicher Produktpreis je Standart (Stand.Art). | K26, K25 |
| 4 | ★★ | PAPIER | Prüfe drei Abfragen auf die GROUP-BY-Regel und korrigiere die fehlerhaften. | K26 |
| 5 | ★★★ | PAPIER | Erkläre, warum `GROUP BY Helfer.Nachname` beim Umsatz je Helfer zu falschen Ergebnissen führen kann. | K26 |

- **Abi-Ecke** (rot gerahmt, K24, K25, K26): **Entwerfen** Sie eine SQL-Abfrage, die für jeden Stand die Standnummer, den Namen und die Anzahl der dort verkauften Produkte (Stückzahl) ausgibt. **[4 BE]** – Operator **entwerfen**, AFB II.

- **Spur im Lab:** Ermittlung 3.1, Einstieg Sortierfächer (A3-E1-04), dann A3-E1-01…08.

- **Cold Case:** „Kartenzahler“: Welcher Anteil der Bons wurde mit Karte bezahlt? Überlege, wie du das mit zwei Abfragen ermitteln kannst, und notiere beide.

### Warm-up-Karten

Wiederholung von DS 4 (Verbund über mehrere Tabellen, Aliase, IS NULL).

| ID | Titel | Aufgabe | Min. | Kompetenz | Falle |
|---|---|---|---|---|---|
| W-A2-05 | Ermittlungsweg | Für „Namen aller Kunden, die ein Lastenrad ausgeliehen haben“ die benötigten Tabellen und Verbundbedingungen angeben. | 2' | K24, K30 | P2 |
| W-A2-06 | Station zweimal | Abfrage notieren: AusleihID mit Name der Start- und der Zielstation. | 3' | K24, K16 | P7 |
| W-A2-07 | Unterwegs | Abfrage notieren: alle laufenden Ausleihen mit Kundennamen. | 3' | K18, K23 | P5 |
| W-A2-08 | Fehlerzeile | In einer Abfrage über vier Tabellen die fehlende Verbundbedingung ergänzen. | 2' | K24 | P2 |

### Typische Schwierigkeiten · Differenzierung · Vorbereitung
**Typische Schwierigkeiten**
- Name im SELECT, aber nicht in GROUP BY (P3) → SQLite liefert trotzdem ein Ergebnis! Parser-Hinweis `GB_REGEL` und Merksatz: „läuft ≠ richtig“.
- Gruppieren nur nach Name → Gleichnamige verschmelzen (P3; Variante `+gleichnamig`).
- COUNT statt SUM für Stückzahlen (P4) bzw. `COUNT(Farbe)` übersieht NULL.
- Aggregat ohne GROUP BY mit weiterer Spalte (`SELECT Name, MAX(Preis)`) → in SQLite „zufälliger“ Name.
- Verbund vergessen bei Produkt/Position (P2).

**Differenzierung**
- *Schnelle:* Cold Case Kartenzahler; Lab-Cold-Case „Der stille Stand“; Vorgriff HAVING.
- *Langsame:* Sortierfächer jederzeit aus der Konsole; Werkzeugkarte 2 (Auswertungsreihenfolge); ★★-Aufgaben mit Tipp.

**Vorbereitung**
- Bon-Karten (30) und 4 Fächerschilder; Raumecken frei.
- Akte 3 freischalten; Sortierfächer-Demo am Beamer testen.

---

## DS 6 · Ermittlung 3.2 „Die Statistik lügt nicht“ (A3-E2)

| Kopf |  |
|---|---|
| Doppelstunde | DS 6 |
| Akte / Ermittlung | Akte 3 · Ermittlung 3.2 (A3-E2) |
| Titel | Die Statistik lügt nicht |
| Kompetenzen | K27, K22, K28, K30, K31 · Übung K24, K25, K26 |
| Fallen-Schwerpunkt | P1 (WHERE ↔ HAVING), P2 (Vervielfachung im Verbund), P10 (Analyse ohne Sachzusammenhang) |
| Datenbank | Stadtfest (wie DS 5) – Randfälle: Gleichstände für LIMIT, Vervielfachung Bon × Position × Schicht, Stand ohne Umsatz |
| Unplugged | Menschliche Zeitlupe (Klauselkarten) + WHERE-/HAVING-Sortierkarten |
| Video | 3 |
| Verhör | Verhör 3 · Schulkiosk (V3, SQL-Gesamt) |
| Niveau | gA/eA (K31 eA) |

### Lernziele
Die Schülerinnen und Schüler …

1. **unterscheiden** Zeilen- und Gruppenbedingungen und **entwerfen** Abfragen mit WHERE und HAVING in einer Anweisung (ohne Alias in HAVING).
2. **entwerfen** Top-n-Abfragen mit ORDER BY und LIMIT und **erläutern** das Gleichstand-Problem an der Schnittkante.
3. **analysieren** eine gegebene Abfrage und **beschreiben** die gelieferte Information im Sachzusammenhang; **beschreiben** das Vorgehen zur Beantwortung einer Frage in Worten.
4. **beurteilen** die Korrektheit einer Abfrage, insbesondere die Vervielfachung von Zeilen beim Verbund über zwei 1:n-Beziehungen (eA).

### Verlaufsplan
| Phase | Zeit | Inhalt / Ablauf | Sozialform | Material | Lab |
|---|---|---|---|---|---|
| Warm-up | 0–10' | Karten W-A3-01…04 (COUNT/SUM, GROUP-BY-Regel, Ergebnis vorhersagen, Gleichnamige). | EA → Team | Warm-up-Karten A3 | Leitner optional |
| Briefing | 10–20' | STORY 5.6: *„Jemand bekommt einen Kaffee, zahlt bar, und die Kasse bucht Menge 0 – so verschwindet Geld, ohne dass die Kasse falsch rechnet.“* Impulse: *„Wie zeigen wir nur Helfer mit mehr als 3 Positionen der Menge 0? Kann das in WHERE stehen?“* – *„Juri hat Bons, Positionen und Schichten verbunden – plötzlich ist der Fehlbetrag dreimal so hoch. Was ist passiert?“* | LV, UG | Präsentation Akte 3 (Folien 12–22) | – |
| Unplugged | 20–30' | **Menschliche Zeitlupe** (Ablauf siehe unten). | Plenum, Teams | 7 Klauselkarten, 12 Bedingungskarten | – |
| Lab-Einsatz | 30–75' | Ermittlung 3.2; Zeitlupe bei jeder Fehldiagnose nutzen. 06 und 08 sind `kernpunkte`-Aufgaben (Freitext bleibt im Browser). AB 3.2 parallel. | EA | iPad/Laptop, AB 3.2 | A3-E2-01…08 |
| Fallbesprechung | 75–90' | Analyse-Schema an der Tafel („Die Abfrage liefert für jede/n … die/den …, aber nur …, sortiert nach …“) an der Lösung von A3-E2-06; Story: Schicht 22–23 Uhr am Kaffeemobil, Helferin Nr. 23 „Nora Falter“, Jahrgang 1988, gemeldet über den TuS → Beweisstück Kassenbon; Cliffhanger: beim TuS stimmt die Beitragsliste nicht. Abi-Ecke (4 BE) als Analyse. Hinweis Verhör 3 (SQL-Gesamt, 20'). | UG | Tafel | Verhör 3 freigeschaltet |

### Unplugged-Aktivität im Detail
**Menschliche Zeitlupe (10 min).** *Material:* 7 große Klauselkarten (FROM, WHERE, GROUP BY, HAVING, SELECT, ORDER BY, LIMIT), 12 Bedingungskarten für die Teams (z. B. `Menge > 2`, `SUM(Menge) > 100`, `Zahlart = 'bar'`, `COUNT(*) >= 50`, `Zeitpunkt BETWEEN …`, `AVG(Preis) < 3`).
1. Sieben Freiwillige erhalten die Klauselkarten in Schreibreihenfolge. Das Plenum sortiert sie um in **Auswertungsreihenfolge**: FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT. Impuls: *„Warum kann WHERE noch nicht wissen, wie viele Bons eine Gruppe hat?“*
2. Teams sortieren ihre Bedingungskarten auf zwei Stapel „vor dem Gruppieren (WHERE)“ / „nach dem Gruppieren (HAVING)“ – Wettlauf, Auflösung durch die Klausel-Personen.
3. Zusatzfrage: *„Warum darf in ORDER BY der Alias stehen, in HAVING laut EH aber nicht?“* (SELECT wird erst nach HAVING ausgewertet.)
*Sicherung:* Reihenfolge als Leiste über der Tafel; Werkzeugkarte 2.

### Tafelbild / Merkkasten „Ermittler-Notiz“
```sql
SELECT Helfer.HelferNr, Helfer.Vorname, Helfer.Nachname, COUNT(*) AS NullPositionen
FROM Bon, Position, Helfer
WHERE Bon.BonNr = Position.BonNr
  AND Bon.HelferNr = Helfer.HelferNr
  AND Position.Menge = 0
  AND Bon.Zeitpunkt BETWEEN '2026-08-29 00:00' AND '2026-08-29 23:59'
GROUP BY Helfer.HelferNr, Helfer.Vorname, Helfer.Nachname
HAVING COUNT(*) > 3
ORDER BY NullPositionen DESC;
```
**Auswertungsreihenfolge:** FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT.
- WHERE filtert **Zeilen vor** dem Gruppieren, HAVING filtert **Gruppen danach** (Aggregat wiederholen, kein Alias in HAVING).
- Top-n: `ORDER BY … DESC LIMIT n` – nur eindeutig, wenn an Platz n kein Gleichstand besteht.
- **Vervielfachung:** Bon × Position × Schicht, Schicht nur über den Stand verbunden – jede Position erscheint so oft, wie es am Stand passende Schichten gibt → SUM zu hoch (drei Schichten: 312,50 € werden zu 937,50 €). Nur Tabellen verbinden, die für die Frage nötig sind.
- **Analyse im Sachzusammenhang:** „Die Abfrage liefert für jede Helferin/jeden Helfer (Nummer, Name) die Anzahl der am Stadtfest-Samstag gebuchten Positionen mit Menge 0, aber nur, wenn es mehr als drei sind – absteigend nach Anzahl.“ (nicht: „zählt Zeilen und gruppiert“).
- **Vorgehen in Worten:** benötigte Tabellen → Verbund → Zeilenfilter → Gruppierung → Gruppenfilter → Sortierung/Begrenzung.

### Lab-Blueprint (A3-E2)

| ID | Titel | Stufe | Interaktion | Kompetenz(en) | Falle(n) | Niveau | Inhalt |
|---|---|---|---|---|---|---|---|
| A3-E2-01 | Die Zeitlupe ordnen | ★ | `order` | K27 | P1 | gA/eA | Die Klauseln FROM, WHERE, GROUP BY, HAVING, SELECT, ORDER BY, LIMIT in Auswertungsreihenfolge bringen. |
| A3-E2-02 | Vorher oder nachher? | ★ | `choice` | K27 | P1 | gA/eA | Für sechs Bedingungen entscheiden, ob sie in WHERE oder HAVING gehören. |
| A3-E2-03 | Die großen Stände | ★ | `sql` | K27, K26 | P1 | gA/eA | Stände mit mehr als 100 Bons (HAVING COUNT(*) > 100) mit StandNr und Name (Kaffeemobil, Bierwagen). |
| A3-E2-04 | Die auffällige Stunde | ★★ | `sql` | K27, K26, K18 | P1, P3 | gA/eA | Je Helfer die Anzahl der Positionen mit Menge 0 am Stand 'Kaffeemobil' am 2026-08-29 (BETWEEN '2026-08-29 00:00' AND '2026-08-29 23:59'), nur Helfer mit mehr als 3 solcher Positionen (WHERE + HAVING) → nur HelferNr 23. |
| A3-E2-05 | Die Top 3 | ★★ | `sql` | K22, K21, K26 | P6 | gA/eA | Die drei Produkte mit der höchsten verkauften Stückzahl (ORDER BY SUM(Menge) DESC LIMIT 3; kein Gleichstand an Platz 3). |
| A3-E2-06 | Was sagt diese Abfrage? | ★★ | `kernpunkte` | K28, K29 | P10 | gA/eA | Gegebene Abfrage (Verbund Bon–Stand, WHERE Zahlart, GROUP BY, HAVING, ORDER BY) im Sachzusammenhang analysieren; Kernpunkte aufdecken und abhaken. |
| A3-E2-07 | Dreimal zu viel | ★★★ | `sql` | K24, K25, K31 | P2 | gA/eA | Fehlbetrag berechnen: Summe der Listenpreise aller Positionen mit Menge 0 am Kaffeemobil zwischen '2026-08-29 22:00' und '2026-08-29 22:59'; eine gegebene Abfrage verbindet zusätzlich Schicht nur über den Stand (drei Schichten ab 21 Uhr) und verdreifacht die Summe auf 937,50 – Fehler erkennen, korrekte Abfrage ohne Schicht schreiben (Ergebnis 312,50). |
| A3-E2-08 | In Worten ermitteln | ★★★ | `kernpunkte` | K30, K28 | P10 | gA/eA | Beschreiben, wie man ermittelt, wer am 2026-08-29 von 22 bis 23 Uhr die Schicht am Kaffeemobil hatte und ob die Positionen mit Menge 0 in diese Schicht fallen (Tabellen Schicht, Helfer, Bon, Position, Stand; Verbund, Filter, Gruppierung, Sortierung). |

Stufenmix ★/★★/★★★: **3/3/2 (38/38/25 %)** · Interaktionsarten: `choice`, `kernpunkte`, `order`, `sql`

**Cold Case im Lab (ohne Punkte):** `A3-E2-CC` „Gleichstand an der Kante“ (K22, K21) – Der Festausschuss will „die zwei Stände mit den meisten Kartenzahlungen“ ehren: Kartenzahlungen je Stand absteigend ausgeben (noch ohne LIMIT). Was fällt an Platz 2 und 3 auf (Grillhütte und Bierwagen je 36), was liefert `LIMIT 2`? Formuliere eine bessere Frage, die eindeutig beantwortbar ist.

### Arbeitsblatt-Blueprint AB 3.2 („Ermittlungsakte“)

- **Kopfband:** AKTE 3 · ERMITTLUNG 3.2 · DS 6 – „Die Statistik lügt nicht“, Stempel STADTFEST
- **Fall-Einstieg:** Die Kasse rechnet richtig – und trotzdem fehlen 312,50 €. Am Kaffeemobil stehen Bons mit Positionen der Menge 0. Edda Lorenz: „Daten lügen nicht. Abfragen manchmal schon.“

- **Beweisstück-Kästen:**
  1. Auswertungsreihenfolge (Zeitlupe) als Leiste
  2. WHERE vs. HAVING – Vorher/Nachher-Bild aus den Sortierfächern
  3. Top-n mit LIMIT und das Gleichstand-Problem
  4. Vervielfachung im Verbund – Beispiel mit drei Tabellen
  5. Analyse im Sachzusammenhang und Vorgehen in Worten – Satzbausteine

- **Ermittlungsaufträge:**

| Nr. | Stufe | Ort | Auftrag | Kompetenz |
|---|---|---|---|---|
| 1 | ★ | PAPIER | Sortiere sechs Bedingungen in WHERE oder HAVING ein. | K27 |
| 2 | ★★ | PAPIER | Analysiere eine gegebene Abfrage und beschreibe die Information im Sachzusammenhang. | K28 |
| 3 | ★★ | LAB | Stände, deren durchschnittlicher Produktpreis unter 3 € liegt. | K27, K26 |
| 4 | ★★ | PAPIER | Beschreibe dein Vorgehen: Welcher Stand hatte am Festsamstag den höchsten Kartenumsatz? | K30 |
| 5 | ★★★ | PAPIER | Beurteile eine gegebene Abfrage mit drei Tabellen (Vervielfachung) und korrigiere sie. | K31, K24 |

- **Abi-Ecke** (rot gerahmt, K28): Gegeben ist folgende SQL-Abfrage (Verbund Bon–Produkt–Position, WHERE auf Zeitpunkt, GROUP BY Produkt, HAVING SUM(Menge) > 50, ORDER BY … DESC). **Analysieren** Sie die Abfrage, indem Sie beschreiben, welche Informationen sie im Sachzusammenhang liefert. **[4 BE]** – Operator **analysieren**, AFB II.

- **Spur im Lab:** Ermittlung 3.2, A3-E2-01…08; Zeitlupe aus jeder Diagnose; danach Verhör 3 (SQL-Gesamt).

- **Cold Case:** „Die Kasse stimmt doch“: Zeige mit zwei Abfragen, dass die Summe der Bons je Stand und die Gesamtsumme zusammenpassen – und an welcher Stelle der Fehlbetrag entsteht.

### Warm-up-Karten

Wiederholung von DS 5 (Aggregation, GROUP BY).

| ID | Titel | Aufgabe | Min. | Kompetenz | Falle |
|---|---|---|---|---|---|
| W-A3-01 | COUNT oder SUM? | Für „Anzahl Bons“ und „Anzahl verkaufter Crêpes“ die passende Aggregatfunktion angeben und begründen. | 2' | K25 | P4 |
| W-A3-02 | Regel-Check | Prüfen, ob `SELECT Stand.Name, Bon.Zahlart, COUNT(*) … GROUP BY Stand.Name` die GROUP-BY-Regel erfüllt, und korrigieren. | 3' | K26 | P3 |
| W-A3-03 | Fächer füllen | Ergebnis von `SELECT Zahlart, COUNT(*) FROM Bon GROUP BY Zahlart` für 8 gegebene Bons angeben. | 2' | K26, K29 | – |
| W-A3-04 | Zwei Lotta Bödeker | Begründen, warum für den Umsatz je Person nach Helfer.HelferNr und nicht nur nach Vor- und Nachnamen gruppiert wird (sonst 68,00 € + 67,50 € = 135,50 € in einem Fach). | 3' | K26 | P3 |

### Typische Schwierigkeiten · Differenzierung · Vorbereitung
**Typische Schwierigkeiten**
- Aggregat in WHERE (`WHERE COUNT(*) > 5`) oder Zeilenbedingung in HAVING (P1) → Parser `WHERE_MIT_AGG` / `HAVING_OHNE_AGG`, Sortierfächer.
- Alias in HAVING (`HAVING Bons > 5`) → in SQLite lauffähig, laut EH nicht vorgesehen (Parser `ALIAS_IN_HAVING`).
- LIMIT bei Gleichstand – „Die Top 3“ ist nicht eindeutig (P6) → Cold Case.
- Vervielfachung nicht bemerkt (P2): Ergebnis „sieht plausibel aus“.
- Analyse als Nacherzählung der Syntax („wählt aus, gruppiert, …“) statt Sachzusammenhang (P10).

**Differenzierung**
- *Schnelle:* Cold Cases (AB und Lab), Verhör 3 in der Stunde, Zusatz: eigene Analyse-Aufgabe für das Team formulieren.
- *Langsame:* Satzbausteine für die Analyse (AB-Kasten), Zeitlupe, Werkzeugkarte 2; `kernpunkte`-Aufgaben zuerst mündlich im Team.

**Vorbereitung**
- Klausel- und Bedingungskarten; Zeitlupe-Demo (Abfrage aus dem Tafelbild) am Beamer.
- Verhör 3 im Kurs auf „auto“/„offen“.

### Verhör-Blueprint: Verhör 3 · Schulkiosk (V3, SQL-Gesamt)

**Kontext-DB „Schulkiosk“** (eigene kleine DB):
`Produkt(<u>ProduktNr</u>, Bezeichnung, Kategorie, Preis)` · `Helfer(<u>HelferNr</u>, Vorname, Nachname, Klasse)` · `Schicht(<u>SchichtNr</u>, ↑HelferNr, Datum, Pause)` (Verkaufsschichten, STORY 6) · `Verkauf(<u>VerkaufNr</u>, ↑SchichtNr, Zeitpunkt, Zahlart)` · `Posten(<u>↑VerkaufNr, ↑ProduktNr</u>, Anzahl)` – Gleichnamige, Kategorien mit Gleichstand, ein Produkt ohne Verkauf.
Rahmensatz: „Kassen lügen nicht, aber Abfragen manchmal – beweis mir, dass deine es nicht tun.“ Timer 20 min, Abimodus `streng`.

| ID | Titel | Stufe | Interaktion | Kompetenz(en) | Falle(n) | Niveau | Aufgabe (gesiezt, Transfer) |
|---|---|---|---|---|---|---|---|
| A3-V-01 | Kennzahlen | ★ | `sql` | K25 | – | gA/eA | Entwerfen Sie eine Abfrage, die die Anzahl aller Verkäufe und den Zeitpunkt des ersten Verkaufs ausgibt. |
| A3-V-02 | Brötchen zählen | ★ | `choice` | K25 | P4 | gA/eA | Geben Sie an, welche Abfrage die Anzahl der verkauften Brötchen (nicht der Verkäufe) liefert. |
| A3-V-03 | Vorher oder nachher | ★ | `choice` | K27 | P1 | gA/eA | Geben Sie für vier Bedingungen an, ob sie in WHERE oder HAVING stehen müssen. |
| A3-V-04 | Gruppenergebnis | ★ | `ergebnis` | K26, K29 | – | gA/eA | Geben Sie das Ergebnis einer gegebenen gruppierten Abfrage für einen Ausschnitt von 8 Posten an. |
| A3-V-05 | Sortiment | ★ | `sql` | K26 | P3 | gA/eA | Entwerfen Sie eine Abfrage, die je Kategorie die Anzahl der Produkte ausgibt. |
| A3-V-06 | Stückzahlen | ★★ | `sql` | K26, K23 | P3, P4 | gA/eA | Entwerfen Sie eine Abfrage, die je Produkt (Nummer, Bezeichnung) die verkaufte Stückzahl ausgibt. |
| A3-V-07 | Teure Kategorien | ★★ | `sql` | K27 | P1 | gA/eA | Entwerfen Sie eine Abfrage für alle Kategorien mit einem Durchschnittspreis über 1.50 €. |
| A3-V-08 | Bestseller | ★★ | `sql` | K22, K21 | P6 | gA/eA | Entwerfen Sie eine Abfrage für die drei Produkte mit dem höchsten Umsatz (kein Gleichstand). |
| A3-V-09 | Analyse | ★★ | `choice` | K28 | P10 | gA/eA | Geben Sie an, welche Beschreibung die Information einer gegebenen Abfrage im Sachzusammenhang zutreffend wiedergibt. |
| A3-V-10 | Zu hohe Summe | ★★ | `choice` | K31 | P2 | eA | Beurteilen Sie, warum eine gegebene Umsatzabfrage über drei Tabellen zu hohe Werte liefert. |
| A3-V-11 | Umsatz je Helfer | ★★★ | `sql` | K26, K24 | P3 | gA/eA | Entwerfen Sie eine Abfrage, die je Helfer (Nummer, Vor- und Nachname) den Gesamtumsatz ausgibt (Helfer, Schicht, Verkauf, Posten, Produkt), nur Helfer mit mehr als 50 € Umsatz. |
| A3-V-12 | Vorgehen | ★★★ | `order` | K30 | P10 | gA/eA | Bringen Sie die Schritte zur Beantwortung einer gegebenen Frage (Tabellen, Verbund, Zeilenfilter, Gruppierung, Gruppenfilter, Sortierung) in eine sinnvolle Reihenfolge. |

Pool-Mix ★/★★/★★★: **5/5/2 (42/42/17 %)** · Ziehung 6 = 2 × ★ + 3 × ★★ + 1 × ★★★, max. 2 × `choice` (Pflicht: mind. eine `sql`-Aufgabe mit GROUP BY und eine Analyse- oder Fehleraufgabe).

---

## DS 7 · Ermittlung 4.1 „Die Excel-Liste“ (A4-E1)

| Kopf |  |
|---|---|
| Doppelstunde | DS 7 |
| Akte / Ermittlung | Akte 4 · Ermittlung 4.1 (A4-E1) |
| Titel | Die Excel-Liste |
| Kompetenzen | K07, K08, K10, K14 |
| Fallen-Schwerpunkt | P10 (Anomalie nur benannt statt am Datensatz erläutert), P6 (LIKE auf mehrwertigen Zellen) |
| Datenbank | TuS (Rohliste) – `MitgliederlisteRoh(Mitglied, Geburtsjahr, Abteilungen, Trainer, TrainerTelefon, Beitragsgruppe, Monatsbeitrag, Halle, HallenAdresse, Eintritt)` (62 Zeilen; mehrwertige Zellen, widersprüchliche Beiträge, Tippfehler-Varianten). Ausschnitte im Lab zeigen zusätzlich die Spalte **Zeile** (`rowid`), damit Zeilennummern in Aufgabe, Tafel und Simulator übereinstimmen |
| Unplugged | Anomalie-Rennen |
| Video | 4 |
| Verhör | – |
| Niveau | gA/eA |

### Lernziele
Die Schülerinnen und Schüler …

1. **identifizieren** Redundanzen in einer Rohtabelle und **beschreiben** sie (welche Information steht wo mehrfach?).
2. **nennen** Einfüge-, Änderungs- und Löschanomalie und **erläutern** jede an einem konkreten Datensatz der Rohliste.
3. **erläutern** den Zusammenhang zwischen Redundanz und Anomalien.
4. **erkennen** nicht-atomare Werte („Fußball, Tennis“) und **erläutern** ihre Folgen für Auswertungen mit SQL.

### Verlaufsplan
| Phase | Zeit | Inhalt / Ablauf | Sozialform | Material | Lab |
|---|---|---|---|---|---|
| Warm-up | 0–10' | Karten W-A3-05…08 (WHERE/HAVING, Zeitlupe, Analyse, LIMIT). | EA → Team | Warm-up-Karten A3 | Leitner optional |
| Briefing | 10–15' | Akte 4 (STORY 5.7): Wiebke Lüttjohann, Kassenwartin des TuS Weserstedt, verzweifelt – ihre Beitragsliste ergibt jeden Monat eine andere Summe. Juri findet die Liste „voll praktisch“. Rohliste (Excel-Ausdruck) am Beamer. Impuls: *„Was fällt euch an dieser Liste auf, bevor wir irgendetwas ändern?“* | LV, UG | Präsentation `DD_A4_Vereinsarchiv.pptx` (Folien 1–6) | – |
| Unplugged | 15–35' | **Anomalie-Rennen** (Ablauf siehe unten), anschließend Begriffsbildung an der Tafel. | Teams | Rohlisten-Streifen, Auftragskarten | – |
| Lab-Einsatz | 35–80' | Ermittlung 4.1; **Anomalie-Simulator** (03–05) direkt nach dem Rennen. 07/08 sind `kernpunkte` (Erläutern am Datensatz). AB 4.1 parallel. | EA | iPad/Laptop, AB 4.1 | A4-E1-01…08 |
| Fallbesprechung | 80–90' | Story-Cliffhanger (STORY 5.7c): Mitten in der Liste steht „Nora Falter, Tischtennis, Monatsbeitrag 0,00 €“ – zwischen 12,00 € und 14,00 € fiel der Eintrag nicht auf. Merkkasten Anomalien + Operator „erläutern“ (P10): Beispielantwort mit Datensatz-Bezug vs. bloße Nennung. Abi-Ecke (4 BE). | UG | Tafel | – |

### Unplugged-Aktivität im Detail
**Anomalie-Rennen (20 min).** *Material je Team:* Rohlisten-Ausschnitt (12 Zeilen, eigene Daten) als Streifen – jede Zeile ein Papierstreifen; 6 Auftragskarten (verdeckt, nummeriert); Stifte; Stoppuhr am Beamer.
1. Jedes Teammitglied erhält 3–4 Zeilenstreifen („Du pflegst diese Datensätze“). Niemand darf fremde Streifen anfassen; Absprachen nur flüsternd.
2. Die Lehrkraft deckt im 45-Sekunden-Takt Aufträge auf; einige werden **nur einem** Teammitglied gezeigt (Karte wandert verdeckt):
   - A1 „Trainer Helge Meyer hat eine neue Telefonnummer: 0000-4711.“ (an alle) · A2 „Trainer Helge Meyer heißt nach der Heirat Helge Meyer-Kahl.“ (nur an Mitglied B) · A3 „Der Monatsbeitrag der Gruppe *Erwachsene* steigt von 12 € auf 14 €.“ (an alle, unter Zeitdruck) · A4 „Das letzte Judo-Mitglied (Zeile 9) tritt aus – streicht den Streifen.“ · A5 „Neue Abteilung *Bouldern*, Trainerin Kaja Rohlfs (0000-8480), Halle Nord – noch ohne Mitglieder. Tragt sie ein.“ · A6 „Halle Süd zieht um: neue Adresse Deichweg 3.“
   *Hinweis:* Das Papier-Rennen nutzt eine eigene Übungsliste „SG Weserufer“ (12 Zeilen; Trainer Helge Meyer, Sönke Habben, Maren Tebbe; Judo = Zeile 9; Bouldern, Halle Nord/Süd; Namen aus `namen.json`, Material Phase 7). Im Lab und an der Tafel heißt die neue Abteilung **Boule** (Trainerin Gesa Thiele, Bouleplatz Weseraue, A4-E1-05) – beim Übergang zum Simulator kurz darauf hinweisen.
3. Streifen wieder zur Liste zusammenlegen; Teams zählen Widersprüche (gleicher Trainer, verschiedene Namen/Telefone; Gruppe *Erwachsene* mit zwei Beiträgen), verlorene Information (Wer trainiert Judo? Wo ist die Judo-Halle?) und unmögliche Einträge (Bouldern ohne Mitglied → leere Mitglied-Spalte).
4. Wertung: Team mit den wenigsten Widersprüchen gewinnt – Auflösung: *„Fehlerfrei geht es nur, wenn ihr bei jeder Änderung alle Zeilen findet. Das Problem ist die Liste, nicht ihr.“*
*Sicherung:* Drei Anomaliearten mit **eurem** konkreten Beispiel (Zeilennummer) an die Tafel; Redundanz als Ursache markieren.

### Tafelbild / Merkkasten „Ermittler-Notiz“
| Begriff | Erläuterung am Datensatz (Rohliste TuS) |
|---|---|
| **Redundanz** | Dieselbe Information ist mehrfach gespeichert: Trainer Jens Meyer mit Telefon 0000-31415 steht in 23 Zeilen der Rohliste (Fußball und Tennis). |
| **Änderungsanomalie** | Ändert sich Meyers Telefonnummer, muss sie in allen 23 Zeilen geändert werden; wird eine vergessen, widerspricht sich die Liste – eine Zeile mit dem Zahlendreher 0000-31451 zeigt, wie das aussieht. |
| **Löschanomalie** | Tritt Timo Rieken, das einzige Judo-Mitglied (Zeile 12), aus und wird die Zeile gelöscht, gehen auch die Abteilung Judo und ihr Trainer Ole Wittkamp samt Telefonnummer verloren. |
| **Einfügeanomalie** | Die neue Abteilung Boule (Trainerin Gesa Thiele, Bouleplatz Weseraue) kann nicht eingetragen werden, solange es kein Mitglied gibt (Mitglied-Spalte müsste leer bleiben). |
| **nicht-atomarer Wert** | „Fußball, Tennis“ in einer Zelle: `WHERE Abteilungen = 'Tennis'` findet das Mitglied nicht; `LIKE '%Tennis%'` findet auch „Tischtennis“. |

**Ermittler-Notiz:** Redundanz ist die Ursache der Änderungsanomalie; Einfüge- und Löschanomalie entstehen, weil **mehrere Sachverhalte** (Mitglied, Abteilung, Trainer, Halle, Beitrag) in **einer** Tabelle stehen. · Operator **erläutern** = Anomalieart + konkreter Datensatz + Folge (P10). · *Im Lab* nennt die Ermittler-Notiz ein anderes Beispiel (Birte Haschkes Telefonnummer in den Tischtennis-Zeilen), damit sie die Simulator-Aufgaben 03–05 nicht vorwegnimmt; das Tafelbild entsteht erst in der Fallbesprechung.

### Lab-Blueprint (A4-E1)

| ID | Titel | Stufe | Interaktion | Kompetenz(en) | Falle(n) | Niveau | Inhalt |
|---|---|---|---|---|---|---|---|
| A4-E1-01 | Doppelte Spuren | ★ | `zellen` | K07 | – | gA/eA | Im Ausschnitt der Rohliste in den Spalten TrainerTelefon und HallenAdresse alle Zellen antippen, deren Information weiter oben im Ausschnitt schon gespeichert ist (die erste Nennung ist nötig, jede weitere redundant). |
| A4-E1-02 | Welche Anomalie? | ★ | `choice` ×4 | K08 | – | gA/eA | Mehrteilig (a–d): vier Szenarien – neue Telefonnummer von Anke Rosendahl, Austritt des einzigen Mitglieds einer Abteilung, neue Abteilung Rudern ohne Mitglieder, Beitragserhöhung Jugend 8,50 € → 9,00 € – je der drohenden Anomalieart zuordnen. |
| A4-E1-03 | Meyer heißt jetzt Meyer-Kahl | ★ | `anomalie` | K08 | P10 | gA/eA | Simulator: Der Auftrag ändert nur Zellen mit genau „Jens Meyer“; die Zeile „Jens Meyer, Sven Albers“ bleibt stehen → Widerspruch, Änderungsanomalie; alle sechs Zellen markieren, die angepasst werden müssten (auch die Kommaliste). |
| A4-E1-04 | Der letzte Judoka | ★★ | `anomalie` | K08 | P10 | gA/eA | Simulator: Timo Rieken, das einzige Judo-Mitglied, tritt aus (Zeile löschen) → Löschanomalie; die Zellen markieren, deren Information danach nirgends mehr steht (Abteilung Judo, Trainer Ole Wittkamp, Telefon – die Halle am Mühlenfeld bleibt über andere Zeilen erhalten). |
| A4-E1-05 | Boule ohne Mitglieder | ★★ | `anomalie` | K08 | P10 | gA/eA | Simulator: neue Abteilung Boule (Trainerin Gesa Thiele, Bouleplatz Weseraue) als Zeile 63 anlegen („Zeile anlegen“ mit vorgegebenen Werten) → Einfügeanomalie; in der neuen Zeile die Zellen markieren, die leer bleiben müssten. |
| A4-E1-06 | Mehr als ein Wert | ★★ | `zellen` ×2 | K14 | P6 | gA/eA | Mehrteilig: (a) alle Zellen mit nicht-atomaren Werten antippen; (b) genau die eine Zelle der Spalte Abteilungen antippen, die `LIKE '%Tennis%'` fälschlich mitfindet (Tischtennis). |
| A4-E1-07 | 12 oder 14 Euro? | ★★★ | `kernpunkte` | K10, K08 | P10 | gA/eA | Erläutern, wie seit der Beitragserhöhung für Erwachsene (12,00 € → 14,00 €) widersprüchliche Monatsbeiträge entstanden sind (Redundanz → Änderungsanomalie) und warum der Eintrag „Nora Falter, 0,00 €“ darin unterging – mit Bezug auf konkrete Datensätze. Selbstkontrolle über Kernpunkte (0 Punkte, zählt als bearbeitet). |
| A4-E1-08 | Wie viele spielen Tennis? | ★★★ | `kernpunkte` | K14 | P10 | gA/eA | Erläutern, warum „Wie viele Mitglieder hat die Abteilung Tennis?“ mit der Rohliste per SQL nicht zuverlässig beantwortet werden kann (zwei Abfragen liefern 9 bzw. 23), und eine bessere Speicherung skizzieren. Kernpunkte, 0 Punkte. |

Stufenmix ★/★★/★★★: **3/3/2 (38/38/25 %)** · Interaktionsarten: `anomalie`, `choice`, `kernpunkte`, `zellen` · mehrteilig: 02, 06 · `kernpunkte`-Aufgaben bringen 0 Punkte (Rang und Freischaltung zählen sie als bearbeitet)

**Cold Case im Lab (ohne Punkte):** `A4-E1-CC` „Tippfehler im Archiv“ (K07, K19, P6) – `sql` + `kernpunkte`: Die Halle am Mühlenfeld soll „Mühlenhalle“ heißen. (a) Alle verschiedenen Kombinationen aus Halle und HallenAdresse mit LIKE finden, in denen die Halle vorkommt – auch in Kommalisten und abweichender Schreibweise; (b) erläutern, welche Anomalie die Schreibweisen verursacht haben.

### Arbeitsblatt-Blueprint AB 4.1 („Ermittlungsakte“)

- **Kopfband:** AKTE 4 · ERMITTLUNG 4.1 · DS 7 – „Die Excel-Liste“, Stempel VEREINSHEIM
- **Fall-Einstieg:** Der TuS Weserstedt verwaltet seine Mitglieder seit Jahren in einer einzigen Liste. Kassenwartin Wiebke Lüttjohann bekommt jeden Monat eine andere Beitragssumme heraus – und Helferin Nr. 23 vom Stadtfest war über den TuS gemeldet.

- **Beweisstück-Kästen:**
  1. Redundanz – Definition und Beispiel aus der Rohliste
  2. Die drei Anomaliearten – je ein konkretes Beispiel (Tabelle aus dem Tafelbild)
  3. Redundanz ↔ Anomalie – Ursache-Wirkungs-Pfeile
  4. Nicht-atomare Werte und ihre Folgen für WHERE/LIKE/COUNT
  5. Operator „erläutern“ – Musterantwort vs. bloße Nennung

- **Ermittlungsaufträge:**

| Nr. | Stufe | Ort | Auftrag | Kompetenz |
|---|---|---|---|---|
| 1 | ★ | PAPIER | Markiere in der Rohliste alle redundanten Einträge zu Trainer Meyer und Halle Süd. | K07 |
| 2 | ★ | PAPIER | Nenne zu jeder Anomalieart ein Szenario aus dem Anomalie-Rennen. | K08 |
| 3 | ★★ | PAPIER | Erläutere eine Löschanomalie an einem konkreten Datensatz der Rohliste – nicht am Judo-Beispiel (Material Phase 7: die beiden passiven Mitglieder, Zeilen 19 und 34, Beitragsgruppe Passiv 4,00 €). | K08 |
| 4 | ★★ | LAB | Simulator-Aufgaben A4-E1-03…05 durchspielen und die Zuordnung festhalten. | K08 |
| 5 | ★★★ | PAPIER | Erläutere den Zusammenhang zwischen Redundanz und Änderungsanomalie am Beispiel der Beitragsgruppe Erwachsene (12,00 € / 14,00 €). | K10, K07 |

- **Abi-Ecke** (rot gerahmt, K08, K10): Gegeben ist ein Ausschnitt der Tabelle MitgliederlisteRoh. **Erläutern** Sie an diesem Ausschnitt je ein Beispiel für eine Einfüge-, eine Änderungs- und eine Löschanomalie. [Variante gA: zwei der drei Anomaliearten, 3 BE] **[4 BE]** – Operator **erläutern**, AFB II.

- **Spur im Lab:** Ermittlung 4.1, Anomalie-Simulator (A4-E1-03…05), danach A4-E1-06…08.

- **Cold Case:** „Der Vereinsabend“: Die Kassenwartin möchte wissen, wie viele Mitglieder in mehr als einer Abteilung sind. Begründe, warum das mit der Rohliste schwierig ist, und schlage eine Tabellenstruktur vor, mit der es per GROUP BY ginge.

### Warm-up-Karten

Wiederholung von DS 6 (HAVING, Auswertungsreihenfolge, Analyse, LIMIT).

| ID | Titel | Aufgabe | Min. | Kompetenz | Falle |
|---|---|---|---|---|---|
| W-A3-05 | WHERE oder HAVING? | Für vier Bedingungen angeben, ob sie in WHERE oder HAVING gehören, und je einen Grund nennen. | 2' | K27 | P1 |
| W-A3-06 | Reihenfolge | Die Auswertungsreihenfolge der Klauseln notieren und erklären, warum der Alias in HAVING nicht verwendet wird. | 2' | K27 | P1 |
| W-A3-07 | Ein Satz Sachzusammenhang | Eine gegebene GROUP-BY/HAVING-Abfrage in einem Satz im Sachzusammenhang beschreiben. | 3' | K28 | P10 |
| W-A3-08 | Platz drei | Begründen, ob die Abfrage „die drei umsatzstärksten Stände“ bei einem Gleichstand auf Platz 3/4 eindeutig ist. | 3' | K22 | P6 |

### Typische Schwierigkeiten · Differenzierung · Vorbereitung
**Typische Schwierigkeiten**
- Anomalien nur benannt, nicht am Datensatz erläutert (P10) → Musterantwort mit drei Bausteinen (Art – Datensatz – Folge).
- Einfüge- und Löschanomalie verwechselt; „Anomalie = Tippfehler“ (Missverständnis: Anomalien entstehen auch bei fehlerfreier Pflege).
- Redundanz mit „doppelter Datensatz“ gleichgesetzt (gleiche **Information**, nicht gleiche Zeile).
- Nicht-atomare Werte als harmlos eingeschätzt → LIKE-Gegenbeispiel Tischtennis.

**Differenzierung**
- *Schnelle:* Cold Case Vereinsabend, Lab-Cold-Case Tippfehler, Vorgriff: Wie müsste die Liste zerlegt werden?
- *Langsame:* Simulator zuerst (anschaulich), Satzbausteine „Wenn … geändert wird, muss …, sonst …“; Werkzeugkarte 6.

**Vorbereitung**
- Anomalie-Rennen: Rohlisten-Streifen je Team (12 Zeilen, Zeilennummern aufgedruckt), 6 Auftragskarten (A2 markiert „nur für eine Person“), Stoppuhr.
- Akte 4 freischalten.

---

## DS 8 · Ermittlung 4.2 „Ordnung ins Archiv“ (A4-E2)

| Kopf |  |
|---|---|
| Doppelstunde | DS 8 |
| Akte / Ermittlung | Akte 4 · Ermittlung 4.2 (A4-E2) |
| Titel | Ordnung ins Archiv |
| Kompetenzen | K02, K09, K11, K12 (K13 Kür) · Übung K03, K04 |
| Fallen-Schwerpunkt | P8 (Schlüssel aus Ausschnitt, nicht minimal, Mehrfachvorkommen), P10 (Begründung fehlt), P7 (FK mit abweichendem Namen) |
| Datenbank | TuS – Rohliste + normalisiert: `Mitglied(<u>MitgliedNr</u>, Vorname, Nachname, Geburtsjahr, ↑Beitragsgruppe, Eintritt)` · `Beitragsgruppe(<u>Gruppe</u>, Monatsbeitrag)` · `Abteilung(<u>AbteilungNr</u>, Name, ↑TrainerNr, ↑HalleNr)` · `Trainer(<u>TrainerNr</u>, Name, Telefon)` · `Halle(<u>HalleNr</u>, Name, Adresse)` · `Mitgliedschaft(<u>↑MitgliedNr, ↑AbteilungNr</u>, Seit)` |
| Unplugged | Schlüssel-Detektiv (Ausschnitt-Falle mit Nachlieferungen) |
| Video | 4 |
| Verhör | Verhör 4 · Musikschule (V4, Rohliste) |
| Niveau | gA/eA (Zerlegen, Redundanzfreiheit: eA) |

### Lernziele
Die Schülerinnen und Schüler …

1. **beurteilen** die Eignung von (auch zusammengesetzten, künstlichen) Primärschlüsseln nach den Kriterien eindeutig, nie NULL, minimal – und **begründen**, warum ein Datenausschnitt keine Eindeutigkeit beweist.
2. **untersuchen** eine gegebene („zusammengelegte“) Tabelle auf Anomalien und **begründen** ggf., dass keine Anomalie möglich ist.
3. **zerlegen** eine Rohtabelle verlustfrei in ein redundanzfreies Schema und notieren es in Kurzschreibweise (eA).
4. **begründen** die Redundanzfreiheit eines Schemas (eA); *Kür:* prüfen Abhängigkeiten mit funktionaler Abhängigkeit und 1.–3. Normalform.

### Verlaufsplan
| Phase | Zeit | Inhalt / Ablauf | Sozialform | Material | Lab |
|---|---|---|---|---|---|
| Warm-up | 0–10' | Karten W-A4-01…04 (Redundanz, Anomalie benennen, Anomalie erläutern, nicht-atomar). | EA → Team | Warm-up-Karten A4 | Leitner optional |
| Briefing | 10–15' | *„Wir räumen das Archiv auf. Aber woran erkennt man ein Mitglied eindeutig?“* Schlüsselkriterien wiederholen (DS 1) und vertiefen: künstlich vs. natürlich, zusammengesetzt. | LV, UG | Präsentation Akte 4 (Folien 10–14) | – |
| Unplugged | 15–30' | **Schlüssel-Detektiv** (Ablauf siehe unten); danach kurze Demonstration „Schere-Zerlegung“ der Rohliste am Beamer. | Teams | Datenstreifen, Nachlieferungskarten | – |
| Lab-Einsatz | 30–75' | Ermittlung 4.2; Zerlegungs-Puzzle (06) und Schema-Werkbank (07). gA-Kurse: 01–05 + Verhör 4 (Zerlegen ist eA). AB 4.2 parallel. | EA | iPad/Laptop, AB 4.2 | A4-E2-01…08 |
| Fallbesprechung | 75–90' | Zerlegtes Schema als Merkkasten; Redundanzfreiheit begründen (Kernpunkte). Abi-Ecke (5 BE) „zusammengelegte Tabelle“. Beweisstück Vereinsausweis; Cliffhanger (STORY 5.8c): „Vier Akten, viermal N. F. – wir brauchen eine eigene Datenbank.“ Hinweis Verhör 4. *Kür-Kasten* (Normalformen) für Interessierte. | UG | Tafel | Verhör 4 freigeschaltet |

### Unplugged-Aktivität im Detail
**Schlüssel-Detektiv (15 min).** *Material je Team:* 8 Datenstreifen (Vorname, Nachname, Geburtsjahr, Stadtteil, Eintritt; eigene Daten), Kärtchen „Unser Schlüssel: …“, bei der Lehrkraft 3 Nachlieferungskarten.
1. Auftrag: *„Findet eine möglichst kleine Attributkombination, die jedes Mitglied eindeutig bestimmt.“* Teams legen ihr Kärtchen (meist „Nachname“).
2. Nachlieferung 1: ein neues Mitglied mit gleichem Nachnamen → alle „Nachname“-Teams fallen. Neue Vorschläge (Vorname + Nachname).
3. Nachlieferung 2: Vater und Sohn „Ole Harjes“ (1974/2009; Material Phase 7 statt „Tim Brandt“) → nächster Vorschlag (Vorname + Nachname + Geburtsjahr).
4. Nachlieferung 3: Zwillinge mit gleichem Vornamen? Unwahrscheinlich, aber *möglich* – und: Geburtsjahr unbekannt (NULL) bei einem Neumitglied.
5. Impulse: *„Kann ein Datenausschnitt je beweisen, dass ein Attribut eindeutig ist?“* (Nein – nur widerlegen) – *„Ist (Vorname, Nachname, Geburtsjahr, Stadtteil) minimal, wenn schon drei Attribute reichen würden?“* – *„Warum vergeben Vereine Mitgliedsnummern?“*
*Sicherung:* Schlüssel-Check (Werkzeugkarte 6) an der Tafel: eindeutig für **alle möglichen** Daten · nie NULL · minimal · künstlicher Schlüssel als sichere Wahl.

### Tafelbild / Merkkasten „Ermittler-Notiz“
**Schlüssel-Check:** eindeutig für alle *möglichen* Daten (ein Ausschnitt kann das nur widerlegen) · nie NULL · minimal (kein Attribut weglassbar) · künstlicher Schlüssel (MitgliedNr), wenn kein natürlicher sicher ist · zusammengesetzt, wenn erst die Kombination eindeutig ist – Achtung bei Mehrfachvorkommen (Wiedereintritt!).

**Zusammengelegte Tabelle untersuchen:** Hängt ein Nicht-Schlüssel-Attribut nur von einem *Teil* des Schlüssels oder von einem anderen Nicht-Schlüssel-Attribut ab (Monatsbeitrag ← Beitragsgruppe)? → dieselbe Information steht mehrfach → Anomalien. Hängt jedes Attribut vom ganzen Schlüssel und nur von ihm ab → **keine Anomalie möglich**.

**Zerlegung der Rohliste (verlustfrei und redundanzfrei):**
- Mitglied(<u>MitgliedNr</u>, Vorname, Nachname, Geburtsjahr, ↑Beitragsgruppe, Eintritt)
- Beitragsgruppe(<u>Gruppe</u>, Monatsbeitrag)
- Abteilung(<u>AbteilungNr</u>, Name, ↑TrainerNr, ↑HalleNr)
- Trainer(<u>TrainerNr</u>, Name, Telefon)
- Halle(<u>HalleNr</u>, Name, Adresse)
- Mitgliedschaft(<u>↑MitgliedNr, ↑AbteilungNr</u>, Seit)

**Ermittler-Notiz:** *verlustfrei* = der Verbund der Teiltabellen ergibt wieder die Rohliste · *redundanzfrei* = jede Information (z. B. Meyers Telefonnummer) steht genau einmal; Begründung: jedes Nicht-Schlüssel-Attribut hängt nur vom Schlüssel seiner Tabelle ab.

> **KÜR (nicht im Abitur):** funktionale Abhängigkeit `Beitragsgruppe → Monatsbeitrag`; 1. NF: nur atomare Werte · 2. NF: kein Nicht-Schlüssel-Attribut hängt von einem Teil eines zusammengesetzten Schlüssels ab · 3. NF: keine transitiven Abhängigkeiten (MitgliedNr → Beitragsgruppe → Monatsbeitrag).

### Lab-Blueprint (A4-E2)

| ID | Titel | Stufe | Interaktion | Kompetenz(en) | Falle(n) | Niveau | Inhalt |
|---|---|---|---|---|---|---|---|
| A4-E2-01 | Drei Kriterien | ★ | `choice` ×4 | K02 | P8 | gA/eA | Mehrteilig (a–d): `MitgliedNr`, `Nachname`, `(MitgliedNr, Nachname)`, `(Vorname, Nachname, Geburtsjahr)` – je beurteilen, ob als Primärschlüssel von Mitglied geeignet, sonst die verletzten Kriterien (eindeutig, nie NULL, minimal) wählen (Mehrfachauswahl). |
| A4-E2-02 | Die Ausschnitt-Falle | ★ | `zellen` + `choice` | K02 | P8 | gA/eA | Mehrteilig: (a) im Ausschnitt scheint Nachname eindeutig – in der Nachlieferung die Zellen antippen, die die Eindeutigkeit widerlegen; (b) wählen, was ein Ausschnitt über Eindeutigkeit zeigen kann (nur widerlegen, nie beweisen). |
| A4-E2-03 | Wo droht Ärger? | ★ | `zellen` | K09, K07 | P10 | gA/eA | In der zusammengelegten Tabelle `AbteilungHalle(AbteilungNr, Abteilung, Trainer, Halle, HallenAdresse)` die Zellen markieren, an denen eine Änderungsanomalie auftreten kann: die HallenAdresse-Zellen der mehrfach genannten Halle am Mühlenfeld (Trainer und Halle stehen nur über ihren eindeutigen Namen in der Tabelle). |
| A4-E2-04 | Wieder eingetreten | ★★ | `choice` ×2 | K02 | P8 | gA/eA | `Mitgliedschaft(↑MitgliedNr, ↑AbteilungNr, Seit, Bis)` – Wiedereintritt erzeugt eine neue Zeile: (a) beurteilen, ob (MitgliedNr, AbteilungNr) Primärschlüssel bleiben kann (Mehrfachvorkommen); (b) geeignete Primärschlüssel wählen (Mehrfachauswahl). `Bis` gibt es nur in der Aufgabe, nicht in der TuS-DB. |
| A4-E2-05 | Keine Anomalie möglich? | ★★ | `choice` ×2 | K09 | P8 | gA/eA | Mehrteilig: (a) von drei gegebenen Tabellen diejenige wählen, in der keine Anomalie möglich ist; (b) die zutreffende Begründung auswählen. |
| A4-E2-06 | Zerlegungs-Puzzle: Abteilungen | ★★ | `zerlegen` | K11 | – | eA | Spalten Abteilung, Trainer, TrainerTelefon, Halle, HallenAdresse auf neue Tabellen verteilen und Schlüssel setzen (Teilzerlegung; Rückmeldung je Tabelle über die hinterlegten funktionalen Abhängigkeiten, z. B. „TrainerTelefon hängt von Trainer ab, nicht vom Schlüssel (Abteilung)“). |
| A4-E2-07 | Das neue Archiv | ★★★ | `schema` | K11, K04, K03 | P7 | eA | Schema-Werkbank (Modus `frei`): vollständige Zerlegung der Rohliste mit PK und ↑FK anlegen. Der Aufgabentext nennt die sechs Relationen und ihre Attribute (künstliche Schlüssel MitgliedNr, AbteilungNr, TrainerNr, HalleNr; Gruppe, Name, Telefon, Adresse, Seit), damit der Abgleich eindeutig ist; FK Mitglied.Beitragsgruppe → Beitragsgruppe.Gruppe (abweichender Name zulässig). |
| A4-E2-08 | Beweis der Ordnung | ★★★ | `kernpunkte` | K12, K11 | P10 | eA | Begründen, dass das Schema aus 07 redundanzfrei und die Zerlegung verlustfrei ist; Kernpunkte abhaken (0 Punkte). |

Stufenmix ★/★★/★★★: **3/3/2 (38/38/25 %)** · Interaktionsarten: `choice`, `kernpunkte`, `schema`, `zellen`, `zerlegen` · mehrteilig: 01, 02, 04, 05 · Ermittlung 4.2 hat **keine** Datenbank-Kachel: Das normalisierte TuS-Schema zeigt die Lösung von A4-E2-07 (die Freie Ermittlung `/konsole/tus` zeigt es weiterhin, offene Frage in Spec §18).

**Cold Case im Lab (ohne Punkte):** `A4-E2-CC` „KÜR: Normalformen-Check“ (K13, K11) – Ohne Punkte, nicht im Abitur: Bestimme in der Rohliste drei funktionale Abhängigkeiten und prüfe deine Zerlegung auf 1., 2. und 3. Normalform.

### Arbeitsblatt-Blueprint AB 4.2 („Ermittlungsakte“)

- **Kopfband:** AKTE 4 · ERMITTLUNG 4.2 · DS 8 – „Ordnung ins Archiv“, Stempel VEREINSHEIM
- **Fall-Einstieg:** Edda Lorenz: „Das Phantom kam durch, weil die Liste sich selbst widersprechen konnte. Wir bauen dem TuS ein Archiv, in dem das unmöglich ist.“

- **Beweisstück-Kästen:**
  1. Schlüssel-Check: Kriterien, Ausschnitt-Falle, künstlich/natürlich, zusammengesetzt
  2. Zusammengelegte Tabelle untersuchen – Prüffrage und Beispiel „keine Anomalie möglich“
  3. Verlustfreie und redundanzfreie Zerlegung – Schritt für Schritt an der Rohliste (eA)
  4. Redundanzfreiheit begründen – Musterformulierung (eA)
  5. KÜR-Kasten: funktionale Abhängigkeit und Normalformen (nicht im Abitur)

- **Ermittlungsaufträge:**

| Nr. | Stufe | Ort | Auftrag | Kompetenz |
|---|---|---|---|---|
| 1 | ★ | PAPIER | Beurteile drei Schlüsselvorschläge für Trainer(Name, Telefon, Geburtsjahr) anhand der Kriterien. | K02 |
| 2 | ★★ | PAPIER | Untersuche die zusammengelegte Tabelle `KursRaum(KursNr, Kurs, Leitung, Raum, Etage)` auf Anomalien. | K09 |
| 3 | ★★ | PAPIER | Begründe, warum in `Halle(HalleNr, Name, Adresse)` keine Anomalie möglich ist. | K09 |
| 4 | ★★★ | PAPIER | Zerlege die Tabelle `Spielplan(SpielNr, Datum, Heimteam, HeimTrainer, Gastteam, GastTrainer, Halle, HallenAdresse)` redundanzfrei und notiere das Schema in Kurzschreibweise. (eA) | K11, K04 |
| 5 | ★★★ | LAB | Zerlegungs-Puzzle und Schema-Werkbank (A4-E2-06/07). (eA) | K11 |

- **Abi-Ecke** (rot gerahmt, K09, K02, K08): Ein Verein legt die Tabellen Abteilung und Halle zu `AbteilungHalle(AbteilungNr, Abteilung, Trainer, Halle, HallenAdresse)` zusammen. **Untersuchen** Sie die Tabelle auf Anomalien und **beurteilen** Sie, ob AbteilungNr weiterhin als Primärschlüssel geeignet ist. **[5 BE]** – Operator **untersuchen / beurteilen**, AFB II/III.

- **Spur im Lab:** Ermittlung 4.2: A4-E2-01…05 (gA/eA), 06–08 (eA); danach Verhör 4.

- **Cold Case:** KÜR (nicht im Abitur): Bestimme funktionale Abhängigkeiten der Rohliste und zeige an deiner Zerlegung, dass sie in 3. Normalform ist.

### Warm-up-Karten

Wiederholung von DS 7 (Redundanz, Anomalien, nicht-atomare Werte).

| ID | Titel | Aufgabe | Min. | Kompetenz | Falle |
|---|---|---|---|---|---|
| W-A4-01 | Redundanz finden | In einem Tabellenausschnitt die mehrfach gespeicherte Information benennen. | 2' | K07 | – |
| W-A4-02 | Anomalie benennen | Drei kurze Szenarien der richtigen Anomalieart zuordnen. | 2' | K08 | – |
| W-A4-03 | Am Datensatz erläutern | Eine Änderungsanomalie an einer gegebenen Zeile in zwei Sätzen erläutern (Art – Datensatz – Folge). | 3' | K08, K10 | P10 |
| W-A4-04 | Ein Feld, zwei Werte | Erklären, welches Problem `WHERE Abteilungen = 'Tennis'` bei der Zelle „Fußball, Tennis“ hat. | 3' | K14 | P6 |

### Typische Schwierigkeiten · Differenzierung · Vorbereitung
**Typische Schwierigkeiten**
- Eindeutigkeit aus dem Ausschnitt „bewiesen“ (P8) – häufigster Fehler im Abitur (G23N, G25N, E26).
- Minimalität übersehen: (MitgliedNr, Nachname) „ist doch eindeutig“.
- Zusammengesetzter Schlüssel bei Mehrfachvorkommen (Wiedereintritt) nicht hinterfragt (P8).
- „Keine Anomalie möglich“ wird nie als Antwort erwogen (Abi E23, E26) → Aufgabe A4-E2-05.
- Zerlegung verliert Information (Beziehung Mitglied–Abteilung fehlt) oder lässt Redundanz (Beitrag bleibt im Mitglied).

**Differenzierung**
- *Schnelle:* KÜR-Kasten Normalformen (AB, Lab-Cold-Case), Spielplan-Zerlegung mit zwei Rollen (Heim/Gast) als Vorgriff auf DS 10.
- *Langsame:* Zerlegungs-Puzzle mit Teilfeedback, Werkzeugkarte 6; gA: Schwerpunkt Schlüssel und Anomalien (01–05).

**Vorbereitung**
- Datenstreifen und Nachlieferungskarten je Team; Schere/Papierkopie der Rohliste für die Demo.
- Verhör 4 im Kurs auf „auto“/„offen“; im gA-Kurs sind A4-E2-06…08 ausgeblendet.

### Verhör-Blueprint: Verhör 4 · Musikschule (V4, Rohliste)

**Kontext-DB „Musikschule“** (Rohliste + zusammengelegte Tabelle; **keine** normalisierten Teiltabellen, weil deren Schema die Lösung von A4-V-11 wäre; keine Varianten, da V4 keine SQL-Aufgaben hat):
`UnterrichtRoh(Schueler, Geburtsjahr, Instrumente, Lehrkraft, LehrkraftTelefon, Raum, Tarif, Monatsgebuehr)` – mehrwertige Zellen, Redundanz bei Lehrkraft/Telefon und Tarif/Gebühr; zusätzlich zusammengelegte Tabelle `LehrkraftRaum(LehrkraftNr, Name, Telefon, Raum, Etage)`.
Rahmensatz (Edda): „Listen wie die vom TuS gibt es überall – zeig mir, dass du ihre Schwachstellen findest.“ Kontext-Einleitung je Aufgabe: Die Musikschule Weserstedt will ihre Anmeldeliste `UnterrichtRoh` in eine Datenbank überführen und bittet um ein Gutachten. Timer 20 min, Abimodus `streng`.

| ID | Titel | Stufe | Interaktion | Kompetenz(en) | Falle(n) | Niveau | Aufgabe (gesiezt, Transfer) |
|---|---|---|---|---|---|---|---|
| A4-V-01 | Redundanz | ★ | `zellen` | K07 | – | gA/eA | Geben Sie alle Zellen des Ausschnitts an, die redundante Information enthalten. |
| A4-V-02 | Anomalieart | ★ | `choice` ×3 | K08 | – | gA/eA | Geben Sie zu drei Szenarien der Musikschule (einzige Cello-Schülerin meldet sich ab, Tarif Jugend steigt, neue Gesangslehrkraft ohne Schüler) die jeweilige Anomalieart an. |
| A4-V-03 | Telefonwechsel | ★ | `anomalie` | K08 | P10 | gA/eA | Führen Sie die Änderung „Lehrkraft Jana Albers hat eine neue Telefonnummer“ im Simulator aus, ordnen Sie die entstehende Anomalie zu und markieren Sie alle Zellen, die angepasst werden müssten. |
| A4-V-04 | Mehrere Instrumente | ★ | `zellen` | K14 | P6 | gA/eA | Geben Sie die Zellen mit nicht-atomaren Werten an. |
| A4-V-05 | Schlüsselkandidat | ★ | `choice` | K02 | P8 | gA/eA | Beurteilen Sie, ob Schueler als Primärschlüssel geeignet ist; im Ausschnitt sind alle Namen verschieden. |
| A4-V-06 | Neues Instrument | ★★ | `anomalie` | K08 | P10 | gA/eA | Führen Sie „Die Musikschule bietet ab sofort Harfe an (Lehrkraft Swantje Uphoff, Streicherzimmer), noch ohne Anmeldungen“ aus, ordnen Sie die Anomalie zu und markieren Sie die Zellen, die leer bleiben müssten. |
| A4-V-07 | Ursache | ★★ | `choice` | K10 | P10 | gA/eA | Geben Sie an, welche Aussage den Zusammenhang zwischen Redundanz und Änderungsanomalie korrekt erläutert. |
| A4-V-08 | Zusammengelegt | ★★ | `zellen` | K09 | P10 | gA/eA | Untersuchen Sie die Tabelle LehrkraftRaum und geben Sie die Zellen an, an denen eine Änderungsanomalie möglich ist. |
| A4-V-09 | Anomaliefrei? | ★★ | `choice` | K09 | P8 | gA/eA | Geben Sie an, in welcher von drei Tabellen keine Anomalie möglich ist. |
| A4-V-10 | Doppelt belegt | ★★ | `choice` | K02 | P8 | gA/eA | Beurteilen Sie den Schlüssel (Schueler, Instrument), wenn Schüler dasselbe Instrument bei zwei Lehrkräften belegen dürfen. |
| A4-V-11 | Neuordnung | ★★★ | `zerlegen` | K11, K02 | – | eA | Zerlegen Sie die Rohliste verlustfrei in redundanzfreie Tabellen und kennzeichnen Sie die Schlüssel (hinterlegte Abhängigkeiten mit den Spaltennamen der Rohliste und Etage aus Raum; Schlüssel der Rohliste {SchuelerNr, Instrument, LehrkraftNr}). |
| A4-V-12 | Begründung | ★★★ | `choice` | K12 | P10 | eA | Geben Sie an, welche Begründung die Redundanzfreiheit des gegebenen Schemas korrekt belegt. |

Pool-Mix ★/★★/★★★: **5/5/2 (42/42/17 %)** · Ziehung 6 = 2 × ★ + 3 × ★★ + 1 × ★★★, höchstens 3 × `choice`; gA-Kurse ziehen ohne A4-V-11/12 (eA) → ★★★ entfällt, es wird aufgefüllt (Validator-Hinweis). In A4-V-01 zählt jedes Vorkommen redundanter Werte.

---

## DS 9 · Ermittlung 5.1 „Baupläne lesen“ (A5-E1) – nur eA

| Kopf |  |
|---|---|
| Doppelstunde | DS 9 |
| Akte / Ermittlung | Akte 5 · Ermittlung 5.1 (A5-E1) |
| Titel | Baupläne lesen |
| Kompetenzen | K33, K34, K36 · prozessbezogen K47 |
| Fallen-Schwerpunkt | P9 (Kardinalität vertauscht/fehlt, Schlüsselattribut nicht markiert, Beziehungsattribut falsch platziert), P10 (Erläutern ohne Sachzusammenhang) |
| Datenbank | Detektei (ER-Sicht) – Ausschnitte: Ermittler–*leitet*–Fall (1:n), Person–*verdaechtig*–Fall (n:m, Attribut Grad), Fall–Beweisstück (1:n), Beweisstück–Ort (n:1). Die Datenbank-Kachel der Detektei steht in Akte 5 nur in A5-E3-08 und A5-E3-CC (ihr Schema ist die Lösung der Überführungsaufgaben); Tabellenausschnitte stehen direkt in den Aufgaben |
| Unplugged | Fäden-Kardinalitäten (Rollenkarten) |
| Video | 5 |
| Verhör | – |
| Niveau | eA |

### Lernziele
Die Schülerinnen und Schüler …

1. **benennen** die Elemente der Chen-Notation nach EH §7 (Entitätstyp, Beziehungstyp, Attribut, Schlüsselattribut, Kardinalität) und **interpretieren** ein gegebenes ER-Diagramm im Sachzusammenhang.
2. **bestimmen** Kardinalitäten 1:1, 1:n und n:m aus Texten, Mengendiagrammen und Tabellendaten und **begründen** sie in beide Leserichtungen.
3. **modellieren** Attribute an Beziehungstypen und **begründen**, warum ein Attribut zur Beziehung und nicht zu einem Entitätstyp gehört.
4. **verwenden** die Fachsprache der EH konsequent (Entitätstyp/Beziehungstyp statt „Entitätsmenge“).

### Verlaufsplan
| Phase | Zeit | Inhalt / Ablauf | Sozialform | Material | Lab |
|---|---|---|---|---|---|
| Warm-up | 0–10' | Karten W-A4-05…08 (Schlüsselkriterien, Ausschnitt-Falle, Zerlegung, zusammengelegte Tabelle). | EA → Team | Warm-up-Karten A4 | Leitner optional |
| Briefing | 10–20' | Akte 5: *„Die Detektei braucht eine eigene Fall-Datenbank. Bevor wir bauen, lernen wir Baupläne lesen.“* Chen-Notation am Ausschnitt Ermittler–leitet–Fall. Impulse: *„Was sagt die 1 an der Kante bei Ermittler – und was die n bei Fall?“* – *„Wo steht der Verdachtsgrad: bei der Person, beim Fall oder dazwischen?“* | LV, UG | Präsentation `DD_A5_Bauplan.pptx` (Folien 1–12; übernimmt korrigierte Inhalte der Präsentation „ER-Modell“) | – |
| Unplugged | 20–35' | **Fäden-Kardinalitäten** (Ablauf siehe unten). | Plenum | Rollenkarten, Fäden, Etiketten | – |
| Lab-Einsatz | 35–80' | Ermittlung 5.1 im **Bauplan-Tisch** (Modi `lesen` und `ergaenzen`; Listenmodus für iPad). AB 5.1 parallel. | EA | iPad/Laptop, AB 5.1 | A5-E1-01…08 |
| Fallbesprechung | 80–90' | Leseschablone „Ein … kann … mehrere/genau ein …“ in beide Richtungen; Merkkasten Notation. Abi-Ecke (4 BE) Kardinalitäten begründen. Cliffhanger (STORY 5.9c): Juri hat „schon mal angefangen“ – vierzehn Entitätstypen, keine Kardinalität. Ausblick: Architekturwettbewerb (Teams bilden, Anforderungstext vorab lesen). | UG | Tafel | – |

### Unplugged-Aktivität im Detail
**Fäden-Kardinalitäten (15 min).** *Material:* Rollenkarten zum Umhängen – 4 × Ermittler, 6 × Fall, 6 × Person, 1 × Dienstausweis je Ermittler (4); Wollfäden; Klebeetiketten.
1. **1:n:** *„Jeder Fall wird von genau einem Ermittler geleitet.“* Jede Fall-Person nimmt einen Faden zu genau einem Ermittler. Ablesen: Ein Ermittler hält 0–3 Fäden (n), jeder Fall genau einen (1). Notation: Ermittler —1— ◇leitet◇ —n— Fall.
2. **n:m:** *„Personen können in mehreren Fällen verdächtig sein, ein Fall hat mehrere Verdächtige.“* Fäden zwischen Personen und Fällen: Auf beiden Seiten mehrere Fäden → n:m.
3. **1:1:** *„Jeder Ermittler hat genau einen Dienstausweis, jeder Ausweis gehört genau einem Ermittler.“*
4. **Beziehungsattribut:** *„Wo schreiben wir den Verdachtsgrad hin?“* Ein Etikett „Grad: hoch“ kommt an den **Faden** zwischen Person 3 und Fall 2 – nicht an die Person (in Fall 5 ist sie nur „gering“ verdächtig) und nicht an den Fall.
5. Impuls: *„Woran erkennt ihr in einer Tabelle, welche Kardinalität vorliegt?“* (Wert der FK-Spalte kommt mehrfach vor → n-Seite.)
*Sicherung:* Foto der Fadennetze; Tafel: drei Kardinalitäten mit Leseschablone.

### Tafelbild / Merkkasten „Ermittler-Notiz“
**Chen-Notation nach EH §7** (Rechteck = Entitätstyp · Raute = Beziehungstyp · Ellipse = Attribut · unterstrichen = Schlüsselattribut · 1/n/m an den Kanten)

```
[Ermittler] ——1—— <leitet> ——n—— [Fall]
   (ErmittlerNr unterstrichen), (Name), (Dienstgrad)        (FallNr unterstrichen), (Titel), (Eroeffnet), (Status)

[Person] ——n—— <verdaechtig> ——m—— [Fall]
                     |
                  (Grad)            ← Attribut am Beziehungstyp
```
**Leseschablone (beide Richtungen):** „Ein Ermittler leitet mehrere (n) Fälle; jeder Fall wird von genau einem (1) Ermittler geleitet.“ · „Eine Person kann in mehreren Fällen verdächtig sein, in einem Fall können mehrere Personen verdächtig sein (n:m); der Verdachtsgrad gehört zum Paar Person–Fall.“

**Kardinalität aus Daten:** Kommt in der Tabelle `verdaechtig` dieselbe PersonNr mit verschiedenen FallNr vor **und** dieselbe FallNr mit verschiedenen PersonNr → n:m. Daten können eine Kardinalität nur *stützen*, die Begründung kommt aus dem Sachzusammenhang.
**Ermittler-Notiz:** Fachbegriffe Entitätstyp, Beziehungstyp, Schlüsselattribut, Kardinalität – nie „Entitätsmenge“. Beziehungsnamen als Verb (*leitet*, *kennt*).

### Lab-Blueprint (A5-E1)

| ID | Titel | Stufe | Interaktion | Kompetenz(en) | Falle(n) | Niveau | Inhalt |
|---|---|---|---|---|---|---|---|
| A5-E1-01 | Die Zeichen des Bauplans | ★ | `match` | K33, K47 | – | eA | Rechteck, Raute, Ellipse, unterstrichene Ellipse und Kantenbeschriftung den Fachbegriffen Entitätstyp, Beziehungstyp, Attribut, Schlüsselattribut, Kardinalität zuordnen. |
| A5-E1-02 | Bauplan lesen | ★ | `er` (lesen) | K33 | P9 | eA | Bauplan-Tisch (Modus `lesen`): im Diagramm Ermittler–leitet–Fall–gehoertZu–Beweisstück alle Entitätstypen, Beziehungstypen und Schlüsselattribute antippen (sonst nichts). |
| A5-E1-03 | Fäden zählen | ★ | `choice` ×2 | K34 | P9 | eA | Mengendiagramm mit echten Daten der Fall-Datenbank (4 Ermittler, 6 Fälle; Juri Brandes leitet keinen Fall): (a) Kardinalität von *leitet* bestimmen, (b) die richtigen Lesesätze wählen (Mehrfachauswahl). |
| A5-E1-04 | Die Tabelle verrät es | ★★ | `choice` ×2 | K34 | P9 | eA | Ausschnitt der Tabelle `verdaechtig(PersonNr, FallNr, Grad)` (Fälle 1–3): (a) die gestützte Kardinalität n:m wählen, (b) die tragfähige Begründung wählen. |
| A5-E1-05 | Im Sachzusammenhang | ★★ | `kernpunkte` | K33, K34 | P10 | eA | Das ER-Diagramm Fall–gehoertZu–Beweisstück–gefundenAn–Ort im Sachzusammenhang erläutern (Kardinalitäten in beiden Richtungen); Kernpunkte abhaken (0 Punkte). |
| A5-E1-06 | Der Verdachtsgrad | ★★ | `er` (ergänzen) | K36 | P9 | eA | Bauplan-Tisch (Modus `ergaenzen`): Nora Falter ist in Fall 1 *hoch*, in Fall 4 *mittel* verdächtig – das Attribut Grad korrekt am Beziehungstyp verdaechtig anbringen (nicht an Person oder Fall). |
| A5-E1-07 | Fehlende Kardinalitäten | ★★★ | `er` (ergänzen) | K34, K36 | P9 | eA | Im Startdiagramm (Ermittler, Fall, Beweisstück, Ort; Juri hat keine Kardinalität eingetragen) alle Kardinalitäten aus Tabellenausschnitten Fall und Beweisstueck (ohne Datenbank-Kachel) setzen und das Attribut Fundzeitpunkt am Beziehungstyp gefundenAn platzieren. |
| A5-E1-08 | Beleg aus der Datenbank | ★★★ | `sql` | K34, K26, K27 | P1, P3 | eA | Per SQL belegen, dass Personen in mehreren Fällen verdächtig sind: PersonNr, Vor- und Nachname mit Anzahl Fälle, nur bei mehr als einem Fall (GROUP BY + HAVING über Person und verdaechtig). |

Stufenmix ★/★★/★★★: **3/3/2 (38/38/25 %)** · Interaktionsarten: `choice`, `er`, `kernpunkte`, `match`, `sql` · mehrteilig: 03, 04

**Cold Case im Lab (ohne Punkte):** `A5-E1-CC` „1:1 oder 1:n?“ (K34, K40) – `choice` + `kernpunkte`: Ein Ermittler hat einen Dienstwagen. (a) Kardinalität von *faehrt* bei „genau ein Wagen je Person“ wählen; (b) mit Daten aus dem Fuhrpark-Ausschnitt (nicht in der Fall-DB) diskutieren, was sich im Schichtbetrieb ändert.

### Arbeitsblatt-Blueprint AB 5.1 („Ermittlungsakte“)

- **Kopfband:** AKTE 5 · ERMITTLUNG 5.1 · DS 9 – „Baupläne lesen“, Stempel DETEKTEI (eA)
- **Fall-Einstieg:** Die Pinnwand der Detektei ist voller Fäden, und Juri hat die rote Wolle aufgebraucht. Edda bringt einen alten Bauplan aus dem Polizeiarchiv mit – ihr müsst ihn lesen können, bevor ihr selbst einen entwerft.

- **Beweisstück-Kästen:**
  1. Chen-Notation nach EH §7 – Legende mit allen Elementen
  2. Kardinalitäten 1:1, 1:n, n:m – Mengendiagramm + Leseschablone in beiden Richtungen
  3. Kardinalität aus Tabellendaten ableiten – Vorgehen und Grenzen
  4. Attribute an Beziehungstypen – Verdachtsgrad als Beispiel

- **Ermittlungsaufträge:**

| Nr. | Stufe | Ort | Auftrag | Kompetenz |
|---|---|---|---|---|
| 1 | ★ | PAPIER | Beschrifte die Elemente eines gegebenen ER-Diagramms mit den Fachbegriffen. | K33, K47 |
| 2 | ★ | PAPIER | Bestimme die Kardinalitäten in drei Mengendiagrammen. | K34 |
| 3 | ★★ | PAPIER | Erläutere das ER-Diagramm Fall–Beweisstück–Ort im Sachzusammenhang. | K33 |
| 4 | ★★ | PAPIER | Leite aus den Tabellen Ermittler und Fall die Kardinalität von *leitet* ab und begründe. | K34 |
| 5 | ★★★ | LAB | Bauplan-Tisch: fehlende Kardinalitäten und Beziehungsattribut ergänzen (A5-E1-07). | K34, K36 |

- **Abi-Ecke** (rot gerahmt, K34, K33): Gegeben ist ein ER-Diagramm zur Fallverwaltung. **Begründen** Sie die Kardinalitäten der Beziehungstypen *leitet* und *verdaechtig* im Sachzusammenhang. **[4 BE]** – Operator **begründen**, AFB II.

- **Spur im Lab:** Ermittlung 5.1 im Bauplan-Tisch (Modi lesen/ergänzen).

- **Cold Case:** „Dienstwagen“: 1:1 oder 1:n? Entscheide begründet für zwei verschiedene Organisationsformen der Detektei.

### Warm-up-Karten

Wiederholung von DS 8 (Schlüssel, Zerlegung, zusammengelegte Tabelle). gA-Kurse überspringen DS 9–11; diese Karten werden dort in DS 12 eingesetzt.

| ID | Titel | Aufgabe | Min. | Kompetenz | Falle |
|---|---|---|---|---|---|
| W-A4-05 | Schlüsselkriterien | Die drei Kriterien für einen Primärschlüssel nennen und eines an einem Beispiel erläutern. | 2' | K02 | P8 |
| W-A4-06 | Ausschnitt-Falle | Begründen, warum aus einem Ausschnitt mit verschiedenen Nachnamen nicht folgt, dass Nachname Primärschlüssel sein kann. | 2' | K02 | P8 |
| W-A4-07 | Verlustfrei? | Prüfen, ob eine gegebene Zerlegung (Beitragsgruppe ohne Verweis aus Mitglied) verlustfrei ist, und korrigieren. | 3' | K11, K03 | – |
| W-A4-08 | Zusammengelegt | Untersuchen, ob in `Halle(HalleNr, Name, Adresse)` Anomalien möglich sind. | 3' | K09 | P10 |

### Typische Schwierigkeiten · Differenzierung · Vorbereitung
**Typische Schwierigkeiten**
- Kardinalität an der falschen Kante notiert (P9): „Ein Ermittler – n“ wird an den Ermittler geschrieben → Leseschablone: die Zahl steht beim **gegenüberliegenden** Entitätstyp, über den man spricht („Ein Ermittler leitet *n Fälle*“ → n an der Kante zu Fall).
- Kardinalität nur aus wenigen Datenzeilen „bewiesen“ (vgl. P8) → Sachzusammenhang als Begründung.
- Beziehungsattribut an einen Entitätstyp gehängt (P9).
- Altbegriffe aus früheren Materialien („Entitätsmenge“) → konsequent korrigieren.

**Differenzierung**
- *Schnelle:* Cold Case Dienstwagen; Anforderungstext für DS 10 vorab lesen und Entitätstypen markieren.
- *Langsame:* Listenmodus im Bauplan-Tisch; Werkzeugkarte 4; Rollenkarten-Fotos als Erinnerung.

**Vorbereitung**
- Rollenkarten-Set Kardinalitäten (DS 9), Fäden, Etiketten.
- Akte 5 nur in eA-Kursen freischalten; Bauplan-Tisch auf den Schülergeräten testen (Touch, Listenmodus).

---

## DS 10 · Ermittlung 5.2 „Der Architekturwettbewerb“ (A5-E2) – nur eA

| Kopf |  |
|---|---|
| Doppelstunde | DS 10 |
| Akte / Ermittlung | Akte 5 · Ermittlung 5.2 (A5-E2) |
| Titel | Der Architekturwettbewerb |
| Kompetenzen | K35, K37, K38, K39, K40 · Übung K34, K36, K47 |
| Fallen-Schwerpunkt | P9 (Kardinalität, Schlüssel, Beziehungsattribut, rekursive/ternäre Beziehung fehlerhaft) |
| Datenbank | Detektei – Referenzlösung des Wettbewerbs: Ermittler (rekursiv *betreut* 1:n), Fall, Person (rekursiv *kennt* n:m mit Seit), *verdaechtig* (n:m, Grad), Ort, *sagtAus* (ternär Person/Fall/Ort, Zeitpunkt, Inhalt), Beweisstück |
| Unplugged | Architekturwettbewerb mit Galerie-Rundgang |
| Video | 5 |
| Verhör | – |
| Niveau | eA |

### Lernziele
Die Schülerinnen und Schüler …

1. **entwickeln** ein ER-Modell aus einem Anforderungstext mit vollständigen Schlüsselattributen und Kardinalitäten.
2. **modellieren** rekursive Beziehungen (Ermittler *betreut* Ermittler, Person *kennt* Person) und mehrere Beziehungstypen zwischen denselben Entitätstypen; **lesen** und **ergänzen** ternäre Beziehungen (m:n:p).
3. **erweitern** ein gegebenes ER-Modell nach neuen Anforderungen.
4. **beurteilen** Modellierungen (Alternativen, Vollständigkeit) und **erläutern** Grenzen der Notation (z. B. „genau drei“ ist mit 1/n/m nicht ausdrückbar).

### Verlaufsplan
| Phase | Zeit | Inhalt / Ablauf | Sozialform | Material | Lab |
|---|---|---|---|---|---|
| Warm-up | 0–10' | Karten W-A5-01…04 (Notation, Kardinalität aus Mengendiagramm/Daten, Beziehungsattribut). | EA → Team | Warm-up-Karten A5 | Leitner optional |
| Briefing | 10–20' | Neue Bausteine an Mini-Beispielen: **rekursiv** (*istPateVon* aus den EH → *betreut*), **zwei Beziehungen** zwischen denselben Entitätstypen (Heim-/Gastteam), **ternär** (Person sagt in einem Fall an einem Ort aus). Impulse: *„Wer betreut wen? Kann eine Raute zweimal an dasselbe Rechteck?“* – *„Reichen drei binäre Beziehungen statt der ternären? Was geht verloren?“* | LV, UG | Präsentation Akte 5 (Folien 14–24) | – |
| Wettbewerb | 20–50' | **Architekturwettbewerb**: Teams modellieren die Fall-Datenbank der Detektei nach dem Anforderungstext auf Plakat (A2) oder iPad (Bauplan-Tisch, Modus `entwickeln`, Export als Bild). | Teams | Anforderungstext, Plakate, Stifte | optional |
| Galerie | 50–65' | **Galerie-Rundgang** mit Bewertungsbogen (Kriterien = Kernpunkte): jedes Team bewertet zwei fremde Entwürfe; Siegerentwurf per Punktekleber. | Teams, Plenum | Bewertungsbogen, Klebepunkte | – |
| Lab-Einsatz | 65–85' | Ermittlung 5.2 starten (01–06 in der Stunde, 07/08 als Hausaufgabe). | EA | iPad/Laptop, AB 5.2 | A5-E2-01…08 |
| Fallbesprechung | 85–90' | Referenzlösung (= Detektei-DB) neben dem Siegerentwurf; Abweichungen als Alternativen würdigen (K40). Hausaufgabe: AB 5.2, Lab 07/08. | UG | Beamer | – |

*Abweichung vom Standardtakt:* Wettbewerb + Galerie ersetzen den Großteil der Lab-Zeit (20' statt 45'); Lab-Rest als Hausaufgabe.

### Unplugged-Aktivität im Detail
**Architekturwettbewerb (45 min inkl. Galerie).**
*Anforderungstext (auf AB 5.2 und Folie):* „Die Detektei verwaltet ihre **Ermittler** (Nummer, Name, Dienstgrad). Erfahrene Ermittler **betreuen** als Mentor mehrere Neulinge; jeder Neuling hat höchstens einen Mentor. Jeder **Fall** (Nummer, Titel, Eröffnungsdatum, Status) wird von genau einem Ermittler **geleitet**. **Personen** (Nummer, Vorname, Nachname, Jahrgang, Stadtteil) können in mehreren Fällen **verdächtig** sein, jeweils mit einem Verdachtsgrad. Personen **kennen** einander seit einem bestimmten Datum. Personen **sagen** zu einem Fall an einem **Ort** (Nummer, Bezeichnung, Stadtteil) zu einem Zeitpunkt **aus**; der Inhalt wird festgehalten. **Beweisstücke** (Nummer, Bezeichnung) gehören zu genau einem Fall und wurden an genau einem Ort gefunden.“
1. *Modellierphase (30'):* Rollen im Team – Moderation, Zeichner:in, Textprüfer:in (hakt jede Information im Text ab), Notationsprüfer:in (EH §7).
2. *Galerie (15'):* Plakate hängen aus; jedes Team bewertet zwei Entwürfe mit dem **Bewertungsbogen**: ☐ alle 5 Entitätstypen ☐ Schlüsselattribute markiert ☐ *leitet* 1:n richtig ☐ *betreut* rekursiv 1:n ☐ *kennt* rekursiv n:m mit Attribut Seit ☐ *verdaechtig* n:m mit Attribut Grad ☐ *sagtAus* ternär mit Zeitpunkt/Inhalt ☐ Beweisstück 1:n zu Fall und zu Ort ☐ Fachsprache/Notation EH §7 ☐ Lesbarkeit. Je Kriterium 1 Punkt; Kommentar „Das würden wir übernehmen: …“.
3. *Siegerehrung:* Punktekleber; Siegerteam erhält Stempel „ARCHITEKTUR“ auf dem Ausweis.
*Sicherung:* Fotos aller Plakate in den Kurs-Ordner; Referenzlösung im Lab (Bauplan-Tisch, nach dem Lösen von A5-E2-07).

### Tafelbild / Merkkasten „Ermittler-Notiz“
```
Rekursiv 1:n:     [Ermittler] ——1 (Mentor)—— <betreut> ——n (Neuling)—— [Ermittler]
Rekursiv n:m:     [Person] ——n—— <kennt> ——m—— [Person]      (Seit) an der Raute
Zwei Beziehungen: [Team] ——1—— <spieltHeim> ——n—— [Spiel] ——n—— <spieltGast> ——1—— [Team]
Ternär m:n:p:     [Person] ——m—— <sagtAus> ——n—— [Fall]
                                   |  (Zeitpunkt), (Inhalt)
                                   p
                                 [Ort]
```
**Ermittler-Notiz:** Rekursive Beziehung = Beziehungstyp mit zwei Kanten zum selben Entitätstyp; Rollen an die Kanten schreiben. · Zwei Rollen (Heim/Gast, Leiter/Verdächtiger) = zwei Beziehungstypen. · Ternär: eine Raute, drei Kanten; die Information „wer – in welchem Fall – wo“ ist nur zu dritt eindeutig. · **Grenzen der Notation:** „genau drei Ermittler je Team“, „höchstens 12 Teilnehmende“, „Mentor muss höheren Dienstgrad haben“ lassen sich mit 1/n/m nicht ausdrücken → als Anmerkung zum Modell. · **Beurteilen:** Alternativen benennen (Attribut vs. eigener Entitätstyp, n:m vs. aufgelöste Zwischenentität), Folgen abwägen, Urteil begründen.

### Lab-Blueprint (A5-E2)

| ID | Titel | Stufe | Interaktion | Kompetenz(en) | Falle(n) | Niveau | Inhalt |
|---|---|---|---|---|---|---|---|
| A5-E2-01 | Wer betreut wen? | ★ | `choice` | K37 | P9 | eA | Zur rekursiven Beziehung Ermittler–betreut–Ermittler (1:n) die zutreffenden Aussagen im Sachzusammenhang auswählen. |
| A5-E2-02 | Drei Kanten, eine Raute | ★ | `er` (lesen, Zuordnung) | K38 | P9 | eA | Bauplan-Tisch (Modus `lesen` mit Kategorien): **jedes** Element des Diagramms einer von fünf Kategorien zuordnen (Entitätstyp, binärer Beziehungstyp, ternärer Beziehungstyp, Schlüsselattribut, Attribut eines Beziehungstyps). Diagramm: Person–*verdaechtig*–Fall (n:m, Grad), Person–*meldet*–Fall (1:n) und ternär *sagtAus* mit Ort (Zeitpunkt, Inhalt). |
| A5-E2-03 | Wer kennt wen? | ★ | `er` (ergänzen) | K37, K36 | P9 | eA | Rekursive Beziehung kennt (n:m) mit Attribut Seit an Person ergänzen. |
| A5-E2-04 | Neue Spur: Fahrzeuge | ★★ | `er` (ergänzen) | K39 | P9 | eA | Gegebenes Detektei-Diagramm nach Anforderungstext erweitern: Fahrzeug (Kennzeichen, Marke) gehört genau einer Person (*besitzt*), wurde an Orten gesichtet (*gesichtetAn*, n:m mit Zeitpunkt). |
| A5-E2-05 | Die Aussage | ★★ | `er` (ergänzen) | K38, K36 | P9 | eA | Ternäre Beziehung sagtAus (Person, Fall, Ort) mit Kardinalitäten m:n:p und Attributen Zeitpunkt, Inhalt ergänzen. |
| A5-E2-06 | Grenzen des Plans | ★★ | `choice` ×4 | K40 | – | eA | Mehrteilig (a–d): „genau drei Ermittler je Team“, „genau ein leitender Ermittler je Fall“, „höchstens drei Praktikanten je Mentor“, „beliebig viele Fälle je Person“ – je entscheiden, ob mit 1/n/m darstellbar oder eine Anmerkung zum Modell nötig ist. |
| A5-E2-07 | Die Ermittlerschule | ★★★ | `er` (entwickeln) | K35, K37, K38 | P9 | eA | Bauplan-Tisch (Modus `entwickeln`): ER-Modell aus Anforderungstext – Ermittler besucht Lehrgang (n:m, Note), Ermittler leitet Lehrgang (1:n), Ermittler betreut Ermittler (rekursiv 1:n, Rollen Mentor/Neuling), Lehrgang findet in Raum statt (n:1); Äquivalenz „n:m als aufgelöste Zwischenentität“ wird anerkannt. |
| A5-E2-08 | Zwei Entwürfe im Vergleich | ★★★ | `kernpunkte` | K40, K35 | P10 | eA | Zwei Wettbewerbsentwürfe (Ort als Attribut vs. Entitätstyp; n:m vs. aufgelöste Zwischenentität) beurteilen; Kernpunkte abhaken (0 Punkte). |

Stufenmix ★/★★/★★★: **3/3/2 (38/38/25 %)** · Interaktionsarten: `choice`, `er`, `kernpunkte` · mehrteilig: 06

**Cold Case im Lab (ohne Punkte):** `A5-E2-CC` „Das Phantom-Netz“ (K37, K40) – `er` (ergänzen) + `kernpunkte`: (a) „Person ist Komplizin von Person“ als zweiten rekursiven Beziehungstyp an Person modellieren (zusätzlich zu kennt); (b) mit der Variante „Attribut Komplize an kennt“ vergleichen.

### Arbeitsblatt-Blueprint AB 5.2 („Ermittlungsakte“)

- **Kopfband:** AKTE 5 · ERMITTLUNG 5.2 · DS 10 – „Der Architekturwettbewerb“, Stempel DETEKTEI (eA)
- **Fall-Einstieg:** Edda Lorenz schreibt einen Wettbewerb aus: Das Team mit dem besten Bauplan für die Fall-Datenbank bekommt den Stempel ARCHITEKTUR – und sein Entwurf wird gebaut.

- **Beweisstück-Kästen:**
  1. Vom Text zum Modell – Vorgehen (Substantive → Entitätstypen, Verben → Beziehungstypen, Mengenangaben → Kardinalitäten)
  2. Rekursive Beziehungen – *betreut* (1:n) und *kennt* (n:m), Rollen an den Kanten
  3. Mehrere Beziehungen zwischen denselben Entitätstypen – Heim/Gast
  4. Ternäre Beziehung m:n:p – *sagtAus*
  5. Grenzen der Notation und Beurteilen von Modellierungen

- **Ermittlungsaufträge:**

| Nr. | Stufe | Ort | Auftrag | Kompetenz |
|---|---|---|---|---|
| 1 | ★ | PAPIER | Markiere im Anforderungstext Entitätstypen, Beziehungstypen, Attribute und Mengenangaben in vier Farben. | K35 |
| 2 | ★★ | PAPIER | Entwickle das ER-Modell zum Anforderungstext des Wettbewerbs (Teamplakat). | K35, K37, K38 |
| 3 | ★★ | PAPIER | Erweitere das Modell: Ein Fall kann einen Vorgängerfall haben (Wiederaufnahme). | K39, K37 |
| 4 | ★★★ | PAPIER | Beurteile den Siegerentwurf mit dem Bewertungsbogen und schlage eine Verbesserung vor. | K40 |
| 5 | ★★★ | LAB | Bauplan-Tisch: Ermittlerschule entwickeln (A5-E2-07). | K35 |

- **Abi-Ecke** (rot gerahmt, K39, K37, K36): Die Detektei möchte zusätzlich erfassen, welche Ermittler gemeinsam an einem Fall arbeiten, wobei jeweils die Rolle (z. B. Spurensicherung) festgehalten wird, und welcher Ermittler welchen anderen vertritt. **Erweitern** Sie das gegebene ER-Modell entsprechend. **[5 BE]** – Operator **erweitern**, AFB II/III.

- **Spur im Lab:** Ermittlung 5.2 im Bauplan-Tisch (ergänzen/entwickeln), 07/08 als Hausaufgabe.

- **Cold Case:** „Das Phantom-Netz“: Modelliere zusätzlich „Person ist Komplizin von Person in einem Fall“. Welche Art von Beziehung entsteht?

### Warm-up-Karten

Wiederholung von DS 9 (Notation, Kardinalitäten, Beziehungsattribute).

| ID | Titel | Aufgabe | Min. | Kompetenz | Falle |
|---|---|---|---|---|---|
| W-A5-01 | Notation benennen | In einem kleinen ER-Diagramm Entitätstyp, Beziehungstyp, Schlüsselattribut und Kardinalität benennen. | 2' | K33, K47 | – |
| W-A5-02 | Mengenbild | Kardinalität aus einem Mengendiagramm bestimmen und in beiden Richtungen formulieren. | 2' | K34 | P9 |
| W-A5-03 | Aus den Daten | Aus einer Tabelle Leihe(LeserNr, BuchNr) die Kardinalität ableiten und begründen. | 3' | K34 | P9 |
| W-A5-04 | Wohin mit der Note? | Begründen, an welches Element die Note in Schüler–belegt–Kurs gehört. | 3' | K36 | P9 |

### Typische Schwierigkeiten · Differenzierung · Vorbereitung
**Typische Schwierigkeiten**
- Rekursive Beziehung als zweiter Entitätstyp „Mentor“ modelliert (P9) → Rollen an Kanten statt neuer Entitätstyp.
- Ternäre Beziehung in drei binäre zerlegt – Information „wer – wo – in welchem Fall“ geht verloren.
- Attribute vergessen oder Schlüsselattribute nicht markiert (P9).
- Galerie-Bewertung zu oberflächlich → Bewertungsbogen mit Pflichtkommentar.
- Zeit: Teams verlieren sich in Details → Textprüfer:in hakt Informationen ab, Zeitansage nach 15'.

**Differenzierung**
- *Schnelle:* Cold Cases, Zusatzanforderungen (Vorgängerfall, Komplizenschaft), Notationsprüfer:in-Rolle.
- *Langsame:* Startgerüst (Entitätstypen vorgegeben), Listenmodus, Werkzeugkarte 4; im Team die Rolle Textprüfer:in.

**Vorbereitung**
- Plakate A2, Stifte, Klebepunkte, Bewertungsbögen (Unplugged-Set DS 10); Anforderungstext als Folie.
- Referenzlösung im Bauplan-Tisch erst nach dem Wettbewerb sichtbar (Lösung nur serverseitig nach dem Lösen).

---

## DS 11 · Ermittlung 5.3 „Vom Plan zur Datenbank“ (A5-E3) – nur eA

| Kopf |  |
|---|---|
| Doppelstunde | DS 11 |
| Akte / Ermittlung | Akte 5 · Ermittlung 5.3 (A5-E3) |
| Titel | Vom Plan zur Datenbank |
| Kompetenzen | K41, K42, K43, K23/K24 (Transfer: Self-Join) · Übung K04, K16 |
| Fallen-Schwerpunkt | P9 (FK auf falscher Seite, n:m ohne eigene Tabelle, Schlüssel der Beziehungsrelation falsch), P7 (Alias beim Self-Join) |
| Datenbank | Detektei – `Ermittler(<u>ErmittlerNr</u>, Name, Dienstgrad, ↑MentorNr)` · `Fall(<u>FallNr</u>, Titel, Eroeffnet, Status, ↑LeiterNr)` · `Person(<u>PersonNr</u>, Vorname, Nachname, Jahrgang, Stadtteil)` · `kennt(<u>↑PersonNr, ↑BekannterNr</u>, Seit)` · `verdaechtig(<u>↑PersonNr, ↑FallNr</u>, Grad)` · `Ort(<u>OrtNr</u>, Bezeichnung, Stadtteil)` · `Aussage(<u>↑PersonNr, ↑FallNr, ↑OrtNr, Zeitpunkt</u>, Inhalt)` · `Beweisstueck(<u>BeweisNr</u>, Bezeichnung, ↑FallNr, ↑OrtNr)` |
| Unplugged | Regelkarten-Umzug (eigenes Wettbewerbsplakat überführen) |
| Video | 6 |
| Verhör | Verhör 5 · Kletterhalle (V5, ER) |
| Niveau | eA |

### Lernziele
Die Schülerinnen und Schüler …

1. **überführen** ein ER-Modell nach den Regeln (Entitätstyp, 1:n, n:m, 1:1, rekursiv, ternär, Beziehungsattribute) in ein Relationenschema in Kurzschreibweise.
2. **begründen** die Umsetzungsregeln, insbesondere warum n:m eine eigene Relation benötigt und 1:n nicht, sowie wann ein zusätzliches Schlüsselattribut nötig ist.
3. **rekonstruieren** aus einem gegebenen Relationenschema das ER-Diagramm (Rückrichtung).
4. **entwerfen** Abfragen auf der eigenen Fall-Datenbank, auch mit Self-Join über rekursive Beziehungen (Tabelle zweimal mit Alias).

### Verlaufsplan
| Phase | Zeit | Inhalt / Ablauf | Sozialform | Material | Lab |
|---|---|---|---|---|---|
| Warm-up | 0–10' | Karten W-A5-05…08 (rekursiv, ternär, Text → Mini-ER, Grenzen der Notation). | EA → Team | Warm-up-Karten A5 | Leitner optional |
| Briefing | 10–20' | *„Der Siegerentwurf steht – jetzt wird gebaut.“* Regeln an der Referenzlösung entwickeln (fragend-entwickelnd): Impulse: *„Wohin kommt der Verweis bei leitet – in Ermittler oder in Fall? Probiert beides an Daten aus.“* – *„Warum kann Person keinen Fremdschlüssel FallNr bekommen, wenn sie in mehreren Fällen verdächtig ist?“* | UG | Präsentation Akte 5 (Folien 26–36; übernimmt korrigierte Regeln aus „ER-Modell“) | – |
| Unplugged | 20–35' | **Regelkarten-Umzug** (Ablauf siehe unten). | Teams | Regelkarten, Teamplakat aus DS 10 | – |
| Lab-Einsatz | 35–80' | Ermittlung 5.3: Schema-Werkbank (02, 04, 07), Rückrichtung (06), danach SQL auf der Fall-Datenbank (08, Self-Join). AB 5.3 parallel. | EA | iPad/Laptop, AB 5.3 | A5-E3-01…08 |
| Fallbesprechung | 80–90' | Merkkasten Überführungsregeln (Werkzeugkarte 5) mit Begründungen. Abi-Ecke (5 BE). Beweisstück „Ermittlungsnetz“: Nora Falter ist als einzige Person in allen vier Fällen verdächtig und kennt Menschen an jedem Tatort; Cliffhanger (STORY 5.11c): Eine Nora Falter ist in Weserstedt nicht gemeldet. Hinweis Verhör 5 (ER, 20'). | UG | Tafel | Verhör 5 freigeschaltet |

### Unplugged-Aktivität im Detail
**Regelkarten-Umzug (15 min).** *Material je Team:* 6 Regelkarten (R1 Entitätstyp, R2 1:n, R3 n:m, R4 1:1, R5 rekursiv, R6 ternär; Vorderseite Regel, Rückseite Begründung), das eigene Wettbewerbsplakat aus DS 10, leere Relationenkarten (A6), rote und schwarze Stifte.
1. Für jedes Rechteck des Plakats entsteht eine Relationenkarte (R1), Schlüssel unterstrichen.
2. Für jede Raute zieht das Team die passende Regelkarte und „zieht um“: Attribute und Fremdschlüssel (rot, mit ↑) werden auf Relationenkarten geschrieben oder es entsteht eine neue Karte (n:m, ternär, rekursiv n:m).
3. Kontrolle über Probedaten: Je Team drei Beispielzeilen für *verdaechtig* eintragen – passt jede Zeile ohne Mehrfachwerte und ohne Wiederholung von Personendaten?
4. Austausch: Zwei Teams prüfen gegenseitig mit der Frage *„Welche Regel habt ihr hier angewendet – und warum nicht eine andere?“*
*Sicherung:* Regelkarten bleiben im Team (laminiert); Werkzeugkarte 5 im Ermittler-Handbuch.

### Tafelbild / Merkkasten „Ermittler-Notiz“
| Regel | ER | Umsetzung (Beispiel Detektei) | Begründung |
|---|---|---|---|
| R1 Entitätstyp | [Fall] | Fall(<u>FallNr</u>, Titel, Eroeffnet, Status, …) | Schlüsselattribut → Primärschlüssel |
| R2 1:n | Ermittler —1— *leitet* —n— Fall | Fall(<u>FallNr</u>, …, ↑LeiterNr) | Jeder Fall hat genau einen Leiter → ein Wert pro Zeile auf der n-Seite; Beziehungsattribute ebenfalls dorthin |
| R3 n:m | Person —n— *verdaechtig* —m— Fall | verdaechtig(<u>↑PersonNr, ↑FallNr</u>, Grad) | Auf keiner Seite passt ein einzelner Wert (sonst nicht-atomar oder Redundanz → Anomalien); Paar ist Schlüssel; kommen Paare mehrfach vor → zusätzliches Schlüsselattribut (z. B. Datum oder eigene Nr.) |
| R4 1:1 | Ermittler —1— *hat* —1— Dienstausweis | Dienstausweis(<u>AusweisNr</u>, …, ↑ErmittlerNr) | FK auf einer Seite (meist der, die „später entsteht“); alternativ zusammenlegen |
| R5 rekursiv | Ermittler *betreut* Ermittler (1:n) · Person *kennt* Person (n:m) | Ermittler(<u>ErmittlerNr</u>, Name, Dienstgrad, ↑MentorNr) · kennt(<u>↑PersonNr, ↑BekannterNr</u>, Seit) | wie R2/R3, Fremdschlüssel verweisen auf die eigene Relation; Namen nach Rolle |
| R6 ternär | Person, Fall, Ort — *sagtAus* | Aussage(<u>↑PersonNr, ↑FallNr, ↑OrtNr, Zeitpunkt</u>, Inhalt) | eigene Relation mit drei FKs; Zeitpunkt in den Schlüssel, da dieselbe Person im selben Fall am selben Ort mehrfach aussagen kann |

```sql
SELECT e.Name AS Ermittler, m.Name AS Mentor
FROM Ermittler e, Ermittler m
WHERE e.MentorNr = m.ErmittlerNr
ORDER BY m.Name;
```
**Ermittler-Notiz:** Self-Join = dieselbe Tabelle zweimal mit verschiedenen Aliasen, Verbund über den rekursiven FK. · Rückrichtung Schema → ER: Relation mit eigenem Schlüssel → Entitätstyp; FK in einer Entitätsrelation → 1:n (FK auf der n-Seite); Relation, deren Schlüssel aus zwei/drei FKs besteht → n:m bzw. ternär; Nicht-Schlüssel-Attribute dieser Relation → Beziehungsattribute.

### Lab-Blueprint (A5-E3)

| ID | Titel | Stufe | Interaktion | Kompetenz(en) | Falle(n) | Niveau | Inhalt |
|---|---|---|---|---|---|---|---|
| A5-E3-01 | Wohin mit dem Verweis? | ★ | `choice` ×2 | K41 | P9 | eA | Mehrteilig: (a) für leitet (Ermittler 1 : n Fall) die korrekte Überführung wählen, (b) begründen, warum Juris Vorschlag (geleitete Fälle in Ermittler) an den Probedaten scheitert. |
| A5-E3-02 | Nur noch Schlüssel setzen | ★ | `schema` (Schlüssel) | K41, K04 | P9 | eA | Schema-Werkbank (Modus `schluessel`, Relationen Fall, Beweisstueck, Ort vorgegeben): Primärschlüssel antippen und ↑FK mit Zielrelation setzen. |
| A5-E3-03 | Regel-Memory | ★ | `match` | K41 | – | eA | Beziehungsarten (1:n, n:m, 1:1, rekursiv 1:n, rekursiv n:m, ternär) der passenden Umsetzungsregel zuordnen. |
| A5-E3-04 | Verdacht und Bekanntschaft | ★★ | `schema` (frei) | K41 | P9 | eA | verdaechtig (n:m mit Grad) und kennt (rekursiv n:m mit Seit) überführen – Person und Fall liegen schon in der Werkbank; zusammengesetzte Schlüssel, FK-Namen nach Rolle (BekannterNr). |
| A5-E3-05 | Warum eine eigene Tabelle? | ★★ | `kernpunkte` | K42 | P10 | eA | Begründen, warum n:m eine eigene Relation benötigt und 1:n nicht (Mehrfachwerte/Redundanz → Anomalien); Kernpunkte abhaken. |
| A5-E3-06 | Der Plan rückwärts | ★★ | `er` (entwickeln) | K43 | P9 | eA | Aus dem Schema Ermittler(…, ↑MentorNr), Fall(…, ↑LeiterNr), Person, verdaechtig(↑PersonNr, ↑FallNr, Grad) das ER-Diagramm im Bauplan-Tisch rekonstruieren; **ohne** Äquivalenz „aufgelöste Zwischenentität“ – verdaechtig muss als n:m-Beziehungstyp mit Grad erkannt werden. |
| A5-E3-07 | Aussagen mehrfach | ★★★ | `schema` (frei) | K41, K42 | P9 | eA | Ternäre Beziehung sagtAus in die Relation Aussage überführen; Gesa Ohlendiek hat zu Fall 1 im Fundbüro zweimal ausgesagt → Schlüssel so wählen, dass dieselbe Person im selben Fall am selben Ort mehrfach aussagen kann (Zeitpunkt oder AussageNr). |
| A5-E3-08 | Wer kennt Nora Falter? | ★★★ | `sql` | K24, K16 | P7 | eA | Self-Join auf der Fall-Datenbank (einzige Datenbank-Kachel der Akte neben dem Cold Case): Vor- und Nachname aller Bekannten der Person 'Nora' 'Falter' mit dem Jahr Seit (`Person p, kennt k, Person b`), sortiert nach Nachname – Bekannte an allen vier Tatorten. Varianten `null` und `grenze` (keine gleichnamige Variante). |

Stufenmix ★/★★/★★★: **3/3/2 (38/38/25 %)** · Interaktionsarten: `choice`, `er`, `kernpunkte`, `match`, `schema`, `sql` · mehrteilig: 01 · Die Intro-Notiz der Ermittlung erklärt die Regeln R1–R6 am **Schulbeispiel** (Kurs, Lehrkraft, Schueler), nicht an der Detektei – sonst stünden die Lösungen von 02, 04 und 07 schon da.

**Cold Case im Lab (ohne Punkte):** `A5-E3-CC` „Mentor-Kette“ (K24, K16, P7, P5) – `sql` + `choice`: (a) zu jedem Ermittler den Mentor und den Mentor des Mentors ausgeben (Ermittler dreimal mit Alias); (b) wählen, welche Ermittler fehlen und warum (ohne Mentor bzw. ohne Mentor des Mentors).

### Arbeitsblatt-Blueprint AB 5.3 („Ermittlungsakte“)

- **Kopfband:** AKTE 5 · ERMITTLUNG 5.3 · DS 11 – „Vom Plan zur Datenbank“, Stempel DETEKTEI (eA)
- **Fall-Einstieg:** Der Bauplan ist genehmigt. Jetzt müsst ihr ihn in Tabellen gießen – und zwar so, dass das Phantom keine Anomalie mehr ausnutzen kann.

- **Beweisstück-Kästen:**
  1. Überführungsregeln R1–R6 mit Beispielen (Tabelle aus dem Tafelbild)
  2. Begründungen: Warum n:m eine eigene Relation braucht, 1:n nicht
  3. Zusätzliches Schlüsselattribut bei mehrfach vorkommenden Paaren
  4. Rückrichtung Schema → ER – Erkennungsmerkmale
  5. Self-Join über rekursive Fremdschlüssel (Format „SQL-Code“)

- **Ermittlungsaufträge:**

| Nr. | Stufe | Ort | Auftrag | Kompetenz |
|---|---|---|---|---|
| 1 | ★ | PAPIER | Überführe das ER-Modell Fall–Beweisstück–Ort in Kurzschreibweise. | K41, K04 |
| 2 | ★★ | PAPIER | Überführe kennt und verdaechtig und begründe deine Schlüsselwahl. | K41, K42 |
| 3 | ★★ | PAPIER | Rekonstruiere aus einem Schema zur Bibliothek (Leser, Buch, leiht, Autor) das ER-Diagramm. | K43 |
| 4 | ★★ | LAB | Gib alle Fälle mit Titel und Namen des leitenden Ermittlers aus (FK LeiterNr). | K23, K03 |
| 5 | ★★★ | PAPIER | Begründe, warum `Person(PersonNr, …, ↑FallNr)` die Beziehung verdaechtig nicht korrekt umsetzt (Anomalien an Beispieldaten). | K42, K08 |

- **Abi-Ecke** (rot gerahmt, K41, K42): Gegeben ist das ER-Modell der Detektei-Erweiterung (Ermittler *vertritt* Ermittler, Ermittler *arbeitetMitAn* Fall mit Attribut Rolle). **Überführen** Sie das Modell in ein Relationenschema in Kurzschreibweise und **begründen** Sie die Umsetzung des Beziehungstyps *arbeitetMitAn*. **[5 BE]** – Operator **überführen (erstellen) / begründen**, AFB II/III.

- **Spur im Lab:** Ermittlung 5.3: Schema-Werkbank, Bauplan-Tisch (Rückrichtung), Konsole auf der Fall-Datenbank; danach Verhör 5.

- **Cold Case:** „Mentor-Kette“: Gib zu jedem Ermittler Mentor und Mentor des Mentors aus. Begründe, warum Ermittler ohne Mentor fehlen.

### Warm-up-Karten

Wiederholung von DS 10 (rekursiv, ternär, Modellieren, Grenzen der Notation).

| ID | Titel | Aufgabe | Min. | Kompetenz | Falle |
|---|---|---|---|---|---|
| W-A5-05 | Rekursiv lesen | Die rekursive Beziehung *istPateVon* (1:n) in beiden Richtungen im Sachzusammenhang formulieren. | 2' | K37, K33 | P9 |
| W-A5-06 | Ternär lesen | Erläutern, welche Information die ternäre Beziehung *sagtAus* speichert, die drei binäre Beziehungen nicht speichern. | 3' | K38 | P9 |
| W-A5-07 | Text → Mini-ER | Aus zwei Sätzen („Ein Kurs wird von genau einer Lehrkraft geleitet. Schüler belegen mehrere Kurse.“) ein Mini-ER skizzieren. | 3' | K35 | P9 |
| W-A5-08 | Grenzen | Begründen, warum „Jede Band hat genau vier Mitglieder“ mit 1/n/m nicht darstellbar ist. | 2' | K40 | – |

### Typische Schwierigkeiten · Differenzierung · Vorbereitung
**Typische Schwierigkeiten**
- FK auf der 1-Seite (FallNr in Ermittler) (P9) → Probedaten: Ermittler mit drei Fällen braucht drei Werte in einer Zelle.
- n:m ohne eigene Relation oder Beziehungsrelation ohne zusammengesetzten Schlüssel (P9).
- Beziehungsattribut bei 1:n in die falsche Relation (P9) → gehört auf die n-Seite.
- Rekursiver FK gleich benannt wie der PK (`ErmittlerNr` zweimal) → Rollenname (MentorNr) wählen.
- Self-Join ohne zwei Aliase oder Spalten ohne Alias-Präfix (P7).

**Differenzierung**
- *Schnelle:* Cold Case Mentor-Kette; eigene Wettbewerbs-Lösung in der Schema-Werkbank nachbauen; Ausblick Kür K1 (eigene DB bauen).
- *Langsame:* Regelkarten liegen aus; Schema-Werkbank mit Startzustand aus dem ER; Werkzeugkarte 5.

**Vorbereitung**
- Regelkarten-Set (laminiert) je Team; Teamplakate aus DS 10 mitbringen.
- Verhör 5 im Kurs auf „auto“/„offen“; Video 6 freigeben.

### Verhör-Blueprint: Verhör 5 · Kletterhalle (V5, ER)

**Kontext „Kletterhalle“** (nur ER/Schema, eigene Mini-DB für die Kardinalität-aus-Daten-Aufgaben):
Mitglied(MitgliedsNr, Name, Jahrgang) · Trainer(TrainerNr, Name) · Kurs(KursNr, Titel, Termin) · Route(RoutenNr, Name, Schwierigkeit) · Wand(WandNr, Bereich) · Wettkampf(WettkampfNr, Titel, Datum); *klettert* (Mitglied–Route, n:m, Datum, Erfolg) · *bildetAus* (rekursiv Trainer–Trainer, STORY 6) · *leitet* (Trainer–Kurs) · *besucht*/*assistiertIn* (zwei Beziehungen Mitglied–Kurs) · *wertet* (ternär Mitglied, Route, Wettkampf mit Punkten; Relation `Wertung`). Keine Varianten (V5 hat keine SQL-Aufgaben).
Rahmensatz (Edda): „Ein Bauplan, den du nicht selbst gezeichnet hast – lies ihn, erweitere ihn, bau ihn um.“ Kontext-Einleitung je Aufgabe: Die Kletterhalle Weserstedt plant eine neue Mitgliederverwaltung und bittet um ein Gutachten zum Datenmodell. Timer 20 min, Abimodus `streng`.

| ID | Titel | Stufe | Interaktion | Kompetenz(en) | Falle(n) | Niveau | Aufgabe (gesiezt, Transfer) |
|---|---|---|---|---|---|---|---|
| A5-V-01 | Notation | ★ | `match` | K33, K47 | – | eA | Ordnen Sie den Elementen des gegebenen ER-Diagramms die Fachbegriffe nach den Ergänzenden Hinweisen zu. |
| A5-V-02 | Diagramm deuten | ★ | `choice` | K33 | P10 | eA | Geben Sie an, welche Aussage das ER-Diagramm Mitglied–klettert–Route im Sachzusammenhang korrekt wiedergibt. |
| A5-V-03 | Mengendiagramm | ★ | `choice` | K34 | P9 | eA | Bestimmen Sie die Kardinalität aus dem gegebenen Mengendiagramm Wand–Route. |
| A5-V-04 | Aus den Daten | ★ | `choice` | K34 | P9 | eA | Bestimmen Sie die Kardinalität von klettert anhand des gegebenen Tabellenausschnitts. |
| A5-V-05 | Fremdschlüssel platzieren | ★ | `choice` | K41 | P9 | eA | Geben Sie an, in welcher Relation der Fremdschlüssel für Wand —1— hat —n— Route steht. |
| A5-V-06 | Regeln | ★ | `match` | K41 | – | eA | Ordnen Sie den Beziehungsarten die Umsetzungsregel zu. |
| A5-V-07 | Das Beziehungsattribut | ★★ | `er` (ergänzen) | K36 | P9 | eA | Erweitern Sie das ER-Diagramm so, dass erfasst werden kann, welche Mitglieder welche Routen geklettert sind – mit Datum und Erfolg je Begehung (Attribute an der richtigen Stelle). |
| A5-V-08 | Ausbildung | ★★ | `er` | K37 | P9 | eA | Ergänzen Sie die Beziehung „Trainer bildet Trainer aus“ mit Kardinalitäten (jede Trainerin/jeder Trainer wurde von höchstens einer Person ausgebildet). |
| A5-V-09 | Kurse | ★★ | `er` | K39, K38 | P9 | eA | Erweitern Sie das ER-Modell: Kurse werden von genau einem Trainer geleitet, Mitglieder besuchen Kurse und können in anderen Kursen assistieren. |
| A5-V-10 | Grenzen | ★★ | `choice` | K40 | – | eA | Beurteilen Sie, welche Anforderung („höchstens 8 Teilnehmende je Kurs“ …) mit der Notation nicht darstellbar ist. |
| A5-V-11 | Überführung n:m | ★★ | `schema` | K41 | P9 | eA | Überführen Sie klettert mit seinen Attributen in die Kurzschreibweise. |
| A5-V-12 | Begründung | ★★ | `choice` | K42 | P10 | eA | Geben Sie an, welche Begründung für die eigene Relation zu klettert zutrifft. |
| A5-V-13 | Neuer Anbau | ★★★ | `er` | K35 | P9 | eA | Entwickeln Sie zu einem kurzen Anforderungstext (Boulderbereich, Griffe, Routenbauer) ein vollständiges ER-Modell. |
| A5-V-14 | Rückwärts | ★★★ | `er` | K43 | P9 | eA | Rekonstruieren Sie aus dem gegebenen Relationenschema das ER-Diagramm. |
| A5-V-15 | Wettkampf | ★★★ | `schema` | K41, K38 | P9 | eA | Überführen Sie die ternäre Beziehung *wertet* (Relation Wertung) und die rekursive Beziehung bildetAus in Relationen. |

Pool-Mix ★/★★/★★★: **6/6/3 (40/40/20 %)** · Ziehung 8 = 3 × ★ + 3 × ★★ + 2 × ★★★, höchstens 3 × `choice` und 3 × `er` (statt „mindestens eine Aufgabe je Bereich“; Stufe ★★★ besteht nur aus er-/schema-Aufgaben, Überführen und Lesen kommen damit praktisch immer vor). Verhör 5 nur eA.

---

## DS 12 · Ermittlung 6.1 „Das Phantom“ (A6-E1)

| Kopf |  |
|---|---|
| Doppelstunde | DS 12 |
| Akte / Ermittlung | Akte 6 · Ermittlung 6.1 (A6-E1) |
| Titel | Das Phantom |
| Kompetenzen | K44, K45, K46, K24, K26 · Übung K27, K18 |
| Fallen-Schwerpunkt | P2 (Verbund über Nicht-Schlüssel-Attribute vervielfacht), P1 (HAVING COUNT(*) = 1), P10 (Beurteilen ohne Begründung) |
| Datenbank | Datenspuren – `RadExport(KundenToken, Jahrgang, Stadtteil, Tarif, StartStation, Start)` · `FestZahlung(KartenToken, StandNr, Zeitpunkt, Betrag)` · `VereinExport(MitgliedToken, Geburtsjahr, Abteilung, Stadtteil)` · `AppCheckin(Geraet, Ort, Zeitpunkt)` · `Einwohner(<u>EinwohnerNr</u>, Vorname, Nachname, Jahrgang, Stadtteil, Strasse)` (pseudonyme Exporte, Re-Identifizierung nur über Kombination; `Strasse` neu gegenüber Spec §9) |
| Unplugged | „Steh auf, wenn …“ (Quasi-Identifikatoren) + Rollenkarten-Debatte |
| Video | – (kein Video; Debatte) |
| Verhör | Verhör 6 · Fitness-App (V6, Datenschutz, 15') |
| Niveau | gA/eA |

### Lernziele
Die Schülerinnen und Schüler …

1. **verknüpfen** pseudonyme Datenbestände per Verbund über Quasi-Identifikatoren und GROUP BY/HAVING und **erläutern**, wie kleine Gruppen eine Person erkennbar machen.
2. **erläutern** das Recht auf informationelle Selbstbestimmung und die DSGVO-Grundsätze (Rechtmäßigkeit/Einwilligung, Zweckbindung, Datenminimierung, Transparenz, Speicherbegrenzung) sowie besondere Kategorien personenbezogener Daten.
3. **beurteilen** konkrete Datennutzungen (z. B. Werbung, Weitergabe) anhand der Grundsätze und ihrer Voraussetzungen.
4. **unterscheiden** Datenschutz und Datensicherheit, **erörtern** Chancen und Risiken automatisierter Datenanalyse und **nennen** technische Schutzmaßnahmen (Pseudonymisierung, Aggregation, Mindestgruppengröße, Zugriffsrechte, Verschlüsselung).

### Verlaufsplan
| Phase | Zeit | Inhalt / Ablauf | Sozialform | Material | Lab |
|---|---|---|---|---|---|
| Warm-up | 0–10' | eA: Karten W-A5-09…12 (Überführung, Schema → ER, Self-Join). gA: Karten W-A4-05…08 (Schlüssel, Zerlegung, zusammengelegte Tabelle). | EA → Team | Warm-up-Karten A5 bzw. A4 | Leitner optional |
| Briefing + Unplugged | 10–20' | Finale (STORY 5.12): Nora Falter ist ein Tarnname; Bürgermeisterin Annegret Vollmers überlässt der Detektei pseudonyme Exporte (StadtRad, Stadtfest, TuS, WeserApp, Einwohnerverzeichnis). gA: vorher der Satz „Unsere Fall-Datenbank zeigt: Nur eine Person ist in allen vier Fällen verdächtig – Nora Falter.“ **„Steh auf, wenn …“** (Ablauf siehe unten). Impuls: *„Niemand hat euren Namen genannt. Wurdet ihr trotzdem erkannt?“* | Plenum | Profilkarten | – |
| Lab-Einsatz | 20–55' | **Schlussplädoyer** A6-E1-09…14 (Indizienkette → Enttarnung), dann A6-E1-01…06; 07/08 (`kernpunkte`) und Rest als Hausaufgabe. | EA | iPad/Laptop, AB 6.1 | A6-E1-09…14, 01…06 |
| Debatte | 55–80' | **Rollenkarten-Debatte „Durfte die Detektei das?“** (Ablauf siehe unten). | Rollengruppen, Plenum | Rollenkarten, Argumentkarten | – |
| Fallbesprechung | 80–90' | Merkkasten DSGVO-Grundsätze + Datenschutz vs. Datensicherheit + Maßnahmen. Abi-Ecke (4 BE) Beurteilen. Pinnwand komplett: Steckbrief. Hinweis Verhör 6 (15') und Warm-up-Hausaufgabe vor der Generalprobe. | UG | Tafel | Verhör 6 freigeschaltet |

*Abweichung vom Standardtakt:* Lab 35' statt 45', dafür Debatte 25' (Erörterung KC IK4.1/IK4.2).

### Unplugged-Aktivität im Detail
**„Steh auf, wenn …“ (7 min).** *Material:* 30 fiktive Profilkarten (Jahrgang, Stadtteil, Tarif, Verein, Lieblingsstand; **keine** echten Schülerdaten), so verteilt, dass nach drei Merkmalen genau eine Karte übrig bleibt.
1. „Alle mit Jahrgang 1988 stehen auf.“ (≈ 7) → „… davon nur Hafenviertel.“ (3) → „… und Tarif Plus.“ (1).
2. Impuls: *„Die Person ist nicht genannt – aber eindeutig bestimmt. Was ist ein Quasi-Identifikator?“* – *„Ab welcher Gruppengröße fühlt ihr euch ‚anonym‘?“*
*Sicherung:* Begriff Quasi-Identifikator, „kleine Gruppen machen Personen erkennbar“ an die Tafel.

**Rollenkarten-Debatte „Durfte die Detektei das?“ (25 min).** *Material:* 5 Rollenkarten mit Ausgangslage und Interessen, je 4 Argumentkarten mit DSGVO-Bezug (Unplugged-Set DS 12).
- Rollen nach STORY 8: **Stadt Weserstedt** (Bürgermeisterin Annegret Vollmers), **Datendetektei** (Edda Lorenz), **das Phantom** (Merle Falkenrath, ehemalige Datenschutzbeauftragte der Stadt), **Bürgerin** (Tamara Leversen, Hafenviertel, Jahrgang 1988 – stand unschuldig auf der Kandidatenliste), **Landesdatenschutzbehörde** (Referent Mats Oltmanns).
1. Vorbereitung (6'): Rollengruppen (je 4–6) sammeln Argumente; jede Gruppe muss mindestens zwei Grundsätze (Zweckbindung, Datenminimierung, Rechtsgrundlage, Transparenz, Speicherbegrenzung) verwenden.
2. Talkrunde (12'): je eine Sprecherin/ein Sprecher pro Rolle, Lehrkraft moderiert; Leitfragen: *„Welcher Zweck rechtfertigt das Zusammenführen?“* – *„Was hätte die Stadt nie veröffentlichen dürfen?“* – *„Wer trägt die Verantwortung – wer veröffentlicht oder wer verknüpft?“*
3. Rollen ablegen (4'): persönliche Abstimmung per Handzeichen, zwei Begründungen aus dem Plenum.
4. Sicherung (3'): Kriterien für ein begründetes Urteil (Grundsatz – Sachverhalt – Abwägung – Urteil) festhalten.

### Tafelbild / Merkkasten „Ermittler-Notiz“
**Informationelle Selbstbestimmung:** Jede Person entscheidet grundsätzlich selbst über Preisgabe und Verwendung ihrer persönlichen Daten.

| DSGVO-Grundsatz | Fall Weserstedt |
|---|---|
| Rechtmäßigkeit / Einwilligung | Die Rad-Daten wurden für die Abrechnung erhoben – nicht für Fahndung oder Werbung. |
| Zweckbindung | Zusammenführen mit Vereins- und Festdaten ist ein neuer Zweck. |
| Datenminimierung | Jahrgang + Stadtteil + Tarif waren für die Veröffentlichung nicht nötig. |
| Transparenz | Bürger wussten nicht von der Weitergabe. |
| Speicherbegrenzung | Exporte aus mehreren Jahren statt Löschung nach Zweckerfüllung. |
| besondere Kategorien | Gesundheitsdaten (z. B. Fitness-App) besonders geschützt. |

- **Pseudonym ≠ anonym:** Ein Token ersetzt den Namen, aber Quasi-Identifikatoren (Jahrgang, Stadtteil, Tarif, Zeitmuster) lassen sich verknüpfen.
- **Datenschutz** schützt Personen und ihre Rechte; **Datensicherheit** schützt Daten (Vertraulichkeit, Integrität, Verfügbarkeit) – technische Mittel für beides.
- **Maßnahmen:** Aggregation, Mindestgruppengröße (z. B. keine Gruppen < 5), Vergröberung (Jahrzehnt statt Jahrgang), wechselnde Pseudonyme, Zugriffsrechte, Verschlüsselung, Löschfristen.

```sql
SELECT Jahrgang, Stadtteil, COUNT(*) AS Anzahl
FROM Einwohner
GROUP BY Jahrgang, Stadtteil
HAVING COUNT(*) < 3
ORDER BY Anzahl;
```
**Ermittler-Notiz:** Jede Gruppe in diesem Ergebnis ist ein Risiko: Wer Jahrgang und Stadtteil kennt, kann die Person fast eindeutig bestimmen.

*Plattform (Phase 6):* Die Ermittler-Notiz im Lab enthält den Merkkasten **ohne** diese SQL-Abfrage (sie wäre die Lösung von A6-E1-03/04); die Abfrage gehört nur an die Tafel nach dem Lab-Einsatz. Aktenfarbe A6 `#4A5A1A`.

### Lab-Blueprint (A6-E1)

Die Ermittlung besteht aus 8 Aufgaben (Datenschutz + Verknüpfung) und dem **Schlussplädoyer** (6 `sql`-Aufgaben, Abschnitt 7.7 der Spec): Jedes Ergebnis wird als Indiz an die Pinnwand geheftet; nach A6-E1-14 folgt die Auflösung. Ablauf nach STORY 7, letzter Schritt neu: Verbund AppCheckin × Einwohner über `Ort = Strasse` (das Gerät des Phantoms checkt nachts an 'Kranstraße 7' ein). Nach A6-E1-14 erscheint die Auflösung (STORY 7.1: Merle Falkenrath, Jahrgang 1988, Hafenviertel, Tischtennis, ehemalige Datenschutzbeauftragte) und die Überleitung zur Debatte (STORY 7.2: Tamara Leversen und Ole Brakhage standen kurz auf der Kandidatenliste). Alle sechs Aufgaben laufen auf der DB Datenspuren.

**Aufgaben A6-E1-01…08**

| ID | Titel | Stufe | Interaktion | Kompetenz(en) | Falle(n) | Niveau | Inhalt |
|---|---|---|---|---|---|---|---|
| A6-E1-01 | Die Grundsätze | ★ | `match` | K44 | – | gA/eA | DSGVO-Grundsätze (Zweckbindung, Datenminimierung, Transparenz, Speicherbegrenzung, Rechtmäßigkeit) ihren Beschreibungen und je einem Beispiel aus Weserstedt zuordnen. |
| A6-E1-02 | Pseudonym oder anonym? | ★ | `choice` | K46 | – | gA/eA | Für vier Datensätze (Token mit Jahrgang/Stadtteil, reine Monatssumme je Stadtteil, Name + Adresse, Gerätekennung) entscheiden: personenbezogen, pseudonym oder anonym. |
| A6-E1-03 | Wie groß sind die Gruppen? | ★ | `sql` | K26, K25, K46 | P3 | gA/eA | Anzahl der Einwohner je Jahrgang und Stadtteil, aufsteigend nach Anzahl sortiert. |
| A6-E1-04 | Allein in der Gruppe | ★★ | `sql` + `gaps` | K27, K46 | P1 | gA/eA | Zweiteilig: a) nur Kombinationen aus Jahrgang und Stadtteil mit genau einer Person (`HAVING COUNT(*) = 1`); b) Lücke: wie viele Einwohner sind damit eindeutig bestimmbar? (150) |
| A6-E1-05 | Dieselbe Person? | ★★ | `zeilen` | K46 | P2 | gA/eA | Gegeben ein TuS-Mitglied aus dem VereinExport (V-7046, 1983, Altstadt, Tennis – bewusst nicht das Phantom); im RadExport-Ausschnitt (24.–26.08.) alle Zeilen antippen, die nach Jahrgang = Geburtsjahr und Stadtteil zu derselben Person gehören könnten (zwei Fahrten von R-4BB5). |
| A6-E1-06 | Exporte verknüpfen | ★★ | `sql` | K23, K46 | P2 | gA/eA | RadExport und VereinExport über `Jahrgang = Geburtsjahr AND Stadtteil = Stadtteil` verbinden (Verbund über Quasi-Identifikatoren); KundenToken, MitgliedToken und Abteilung ohne Duplikate. |
| A6-E1-07 | Werbung mit Raddaten? | ★★★ | `kernpunkte` | K45, K44 | P10 | gA/eA | Beurteilen, ob die Stadt die Rad-Exporte an einen Werbepartner weitergeben darf (Zweckbindung, Einwilligung, Widerruf, Transparenz); Kernpunkte abhaken. |
| A6-E1-08 | So hätte es sein müssen | ★★★ | `kernpunkte` | K46, K44 | P10 | gA/eA | Technische und organisatorische Maßnahmen für eine datenschutzgerechte Veröffentlichung erläutern und Datenschutz von Datensicherheit abgrenzen. |

**Schlussplädoyer A6-E1-09…14**

| ID | Titel | Stufe | Interaktion | Kompetenz(en) | Falle(n) | Niveau | Inhalt |
|---|---|---|---|---|---|---|---|
| A6-E1-09 | Spur 1: Fünf Nächte an der Hafenkante | ★ | `sql` | K18, K21, K32 | P5 | gA/eA | RadExport: alle Fahrten mit StartStation 'Hafenkante' und Start zwischen '2026-09-08 00:00' und '2026-09-12 23:59', mit KundenToken, Start, Jahrgang, Stadtteil und Tarif, sortiert nach Start – 9 Zeilen: fünf Nachtfahrten (01–02 Uhr) unter einem Token R-7F3A (1988, Hafenviertel, Plus), vier Tagfahrten anderer Tokens (ohne GROUP BY; Blueprint so beibehalten). |
| A6-E1-10 | Spur 2: Wie viele teilen diese Merkmale? | ★ | `sql` | K15, K17 | P4 | gA/eA | Alle verschiedenen KundenToken (DISTINCT) mit Jahrgang 1988, Stadtteil 'Hafenviertel' und Tarif 'Plus' → nur ein Token. Erklärung thematisiert: GROUP BY mit COUNT(*) zählt hier Fahrten, nicht Menschen. |
| A6-E1-11 | Spur 3: Das Handy fährt mit | ★★ | `sql` | K23, K26 | P2 | gA/eA | RadExport × AppCheckin über `AppCheckin.Ort = RadExport.StartStation AND AppCheckin.Zeitpunkt = RadExport.Start`, eingeschränkt auf das Token aus Spur 1; je Gerät die Anzahl Treffer (GROUP BY Geraet) → ein Gerät passt zu allen fünf Fahrten. |
| A6-E1-12 | Spur 4: Wo war das Gerät sonst? | ★★ | `sql` | K15, K21, K32 | P5 | gA/eA | Nur AppCheckin: alle Check-ins des Geräts aus Spur 3, sortiert nach Zeitpunkt – Festplatz am 2026-08-29 vor 22:00 und nach 23:00, Fundbüro am 2026-09-14 vormittags, dienstags Vereinsheim TuS, nachts 'Kranstraße 7'. (Gegenprobe FestZahlung: keine Kartenzahlung am Kaffeemobil 22:00–22:59 – in der Erklärung.) |
| A6-E1-13 | Spur 5: Wer aus dem TuS passt? | ★★ | `sql` | K17, K15 | P5 | gA/eA | VereinExport: alle MitgliedToken mit Geburtsjahr 1988, Stadtteil 'Hafenviertel' und Abteilung 'Tischtennis' → genau ein Token (passend zu Steckbrief und Dienstagabend-Check-ins). |
| A6-E1-14 | Spur 6: Die Enttarnung | ★★★ | `sql` | K24, K17, K46 | P2 | gA/eA | `Einwohner e, AppCheckin a, RadExport r`: `a.Ort = e.Strasse` (Check-ins des Geräts WA-3917 an einer Wohnadresse – 'Kranstraße 7'; ohne Zeitfilter), `r.Jahrgang = e.Jahrgang AND r.Stadtteil = e.Stadtteil` für das Token aus Spur 1; Vor- und Nachname ohne Duplikate (DISTINCT) → genau eine Person: Merle Falkenrath. |

Stufenmix ★/★★/★★★: **5/6/3 (36/43/21 %)** · Interaktionsarten: `choice`, `kernpunkte`, `match`, `sql`, `zeilen`

**Cold Case im Lab (ohne Punkte):** `A6-E1-CC` „Wie anonym ist Weserstedt?“ (K46, K26) – Bestimme für die Einwohner-Tabelle, wie viel Prozent der Einwohner in einer Gruppe (Jahrgang, Stadtteil) mit weniger als 5 Personen leben – zwei Abfragen, Rechnung im Kopf. Was ändert sich bei Jahrzehnt statt Jahrgang? *Ergebnis laut Daten:* **100 %** (250 Einwohner, keine Gruppe mit 5 oder mehr Personen, die größte hat 4); mit Jahrzehnt statt Jahrgang noch 67 von 250 (26,8 %). Teile: `sql` + `gaps` + `kernpunkte`.

### Arbeitsblatt-Blueprint AB 6.1 („Ermittlungsakte“)

- **Kopfband:** AKTE 6 · ERMITTLUNG 6.1 · DS 12 – „Das Phantom“, Stempel RATHAUS (ersetzt/erweitert das bisherige Datenschutz-AB auf LK-Niveau)
- **Fall-Einstieg:** Die Stadt hat der Detektei „anonymisierte“ Exporte aus StadtRad, Stadtfest, Verein und WeserApp übergeben. Edda Lorenz: „Wenn das Phantom darin steckt, finden wir es. Die Frage ist nur: Dürfen wir das?“

- **Beweisstück-Kästen:**
  1. Informationelle Selbstbestimmung und DSGVO-Grundsätze – Tabelle mit Weserstedt-Beispielen
  2. Personenbezogen – pseudonym – anonym; Quasi-Identifikatoren und kleine Gruppen
  3. Datenschutz vs. Datensicherheit
  4. Technische Maßnahmen (Pseudonymisierung, Aggregation, Mindestgruppengröße, Zugriffsrechte, Verschlüsselung, Löschfristen)
  5. Chancen und Risiken automatisierter Datenanalyse (Profilbildung)

- **Ermittlungsaufträge:**

| Nr. | Stufe | Ort | Auftrag | Kompetenz |
|---|---|---|---|---|
| 1 | ★ | PAPIER | Ordne fünf Situationen aus der Story dem jeweils verletzten Grundsatz zu. | K44 |
| 2 | ★★ | PAPIER | Erläutere an den Exporten, warum Pseudonymisierung allein nicht anonymisiert. | K46 |
| 3 | ★★ | LAB | Schlussplädoyer A6-E1-09…14. | K24, K26 |
| 4 | ★★ | PAPIER | Beurteile die Datenschutzhinweise der WeserApp (drei Auszüge: Werbung, Standort, Interaktionen) anhand der Grundsätze. (überarbeitete Fassung von Aufgabe 2 des bisherigen Datenschutz-ABs) | K45, K44 |
| 5 | ★★★ | PAPIER | Erörtere: „Die Detektei hat das Phantom nur gefunden, weil sie selbst alle Bürger durchleuchtet hat.“ | K46, K45 |

- **Abi-Ecke** (rot gerahmt, K45, K44): Die Stadt plant, die Ausleihdaten von StadtRad (Kundennummer, Jahrgang, Stadtteil, Start- und Zielstation, Zeitpunkte) an ein Unternehmen für personalisierte Werbung weiterzugeben. **Beurteilen** Sie dieses Vorhaben unter Bezug auf zwei Grundsätze des Datenschutzes. **[4 BE]** – Operator **beurteilen**, AFB II/III.

- **Spur im Lab:** Ermittlung 6.1: zuerst Schlussplädoyer (A6-E1-09…14), dann A6-E1-01…08; danach Verhör 6 (15').

- **Cold Case:** „Mindestgruppengröße“: Schlage eine Regel vor, ab welcher Gruppengröße die Stadt Daten veröffentlichen darf, und prüfe sie per SQL an der Einwohner-Tabelle.

### Warm-up-Karten

eA: Wiederholung von DS 11 (Überführung, Schema → ER, Self-Join). gA-Kurse nutzen hier W-A4-05…08 (Wiederholung DS 8, siehe DS 9).

| ID | Titel | Aufgabe | Min. | Kompetenz | Falle |
|---|---|---|---|---|---|
| W-A5-09 | 1:n überführen | Ermittler —1— leitet —n— Fall in Kurzschreibweise überführen und die Lage des FK begründen. | 2' | K41, K42 | P9 |
| W-A5-10 | n:m überführen | Schüler —n— belegt —m— Kurs (Attribut Note) in Kurzschreibweise überführen. | 2' | K41 | P9 |
| W-A5-11 | Rückwärts | Aus `Spiel(SpielNr, Datum, ↑HeimNr, ↑GastNr)` und `Team(TeamNr, Name)` das ER-Diagramm skizzieren. | 3' | K43, K38 | P9 |
| W-A5-12 | Self-Join | Abfrage notieren: jeder Ermittler mit dem Namen seines Mentors. | 3' | K24, K16 | P7 |

### Typische Schwierigkeiten · Differenzierung · Vorbereitung
**Typische Schwierigkeiten**
- Verbund über Nicht-Schlüssel-Attribute vervielfacht Zeilen (P2) – hier gewollt als Kandidatenmenge, aber COUNT dann vorsichtig deuten → DISTINCT.
- „Anonym, weil kein Name drinsteht“ → Unplugged-Erfahrung; Begriff Quasi-Identifikator.
- Datenschutz und Datensicherheit verwechselt (Verschlüsselung „ist Datenschutz“) → Tafel-Unterscheidung.
- Beurteilen ohne Bezug auf Grundsätze oder ohne Urteil (P10) → Schema Grundsatz – Sachverhalt – Abwägung – Urteil.
- Debatte driftet in Meinungen ab → Argumentkarten mit Pflicht-Grundsatz.

**Differenzierung**
- *Schnelle:* Cold Cases; Moderationsrolle in der Debatte; Zusatz: Chancen der Datenanalyse (Verkehrsplanung) gegenüberstellen.
- *Langsame:* Schlussplädoyer mit Tipps; Satzbausteine für das Urteil; in der Debatte zunächst Zuhörerrolle mit Beobachtungsbogen.

**Vorbereitung**
- Profilkarten (30) für „Steh auf, wenn …“ – Verteilung vorher prüfen (genau eine Person nach drei Merkmalen).
- Rollen- und Argumentkarten (Unplugged-Set DS 12); Tische für Talkrunde umstellen.
- Akte 6 freischalten (gA: direkt nach Akte 4); Verhör 6 auf „auto“/„offen“.

### Verhör-Blueprint: Verhör 6 · Fitness-App (V6, Datenschutz, 15')

**Kontext „Fitness-App“** (kleiner pseudonymer Export + Auszüge einer fiktiven Datenschutzerklärung):
`Export(NutzerToken, Geburtsjahr, PLZBereich, Geschlecht, Schritte, Ruhepuls, Datum)` – Gesundheitsdaten (besondere Kategorie), kleine Gruppen.
Rahmensatz: „Eine Fitness-App möchte Nutzerdaten mit einer Krankenkasse und Werbepartnern teilen.“ Timer 15 min, Abimodus `streng`.

| ID | Titel | Stufe | Interaktion | Kompetenz(en) | Falle(n) | Niveau | Aufgabe (gesiezt, Transfer) |
|---|---|---|---|---|---|---|---|
| A6-V-01 | Grundsätze | ★ | `match` | K44 | – | gA/eA | Ordnen Sie den Auszügen aus der Datenschutzerklärung der Fitness-App den jeweils betroffenen Grundsatz der DSGVO zu. |
| A6-V-02 | Besondere Daten | ★ | `choice` | K46 | – | gA/eA | Geben Sie an, welche der erfassten Daten zu den besonderen Kategorien personenbezogener Daten gehören und welche Maßnahme der Datensicherheit dient. |
| A6-V-03 | Recht auf Selbstbestimmung | ★ | `choice` | K44 | – | gA/eA | Geben Sie an, welche Aussage das Recht auf informationelle Selbstbestimmung zutreffend beschreibt. |
| A6-V-04 | Werbung | ★★ | `choice` | K45 | P10 | gA/eA | Beurteilen Sie, unter welchen Voraussetzungen die App Nutzungsdaten für personalisierte Werbung verwenden darf. |
| A6-V-05 | Kleine Gruppen | ★★ | `sql` | K27, K26, K46 | P1 | gA/eA | Entwerfen Sie eine Abfrage, die alle Kombinationen aus Geburtsjahr und PLZBereich ausgibt, zu denen nur ein NutzerToken gehört. |
| A6-V-06 | Re-Identifizierbar | ★★ | `zeilen` | K46 | P2 | gA/eA | Geben Sie an, welche Datensätze des Exports trotz Pseudonym einer bekannten Person zugeordnet werden können. |
| A6-V-07 | Die Krankenkasse | ★★★ | `choice` | K45 | P10 | gA/eA | Beurteilen Sie die geplante Weitergabe der Ruhepuls-Daten an eine Krankenkasse; wählen Sie die fachlich tragfähige Beurteilung. |
| A6-V-08 | Schutzmaßnahmen | ★★★ | `match` | K46 | – | gA/eA | Ordnen Sie den Risiken (Re-Identifizierung, Datenleck, unbefugter Zugriff, zu lange Speicherung) geeignete technische Maßnahmen zu. |

Pool-Mix ★/★★/★★★: **3/3/2 (38/38/25 %)** · Ziehung 5 = 2 × ★ + 2 × ★★ + 1 × ★★★.

---

## DS 13 · Akte 7 „Die Ermittlerprüfung“ (Generalprobe) + Klausur-Blueprints

| Kopf |  |
|---|---|
| Doppelstunde | DS 13 |
| Akte / Ermittlung | Akte 7 · Generalprobe (A7; Level „Die Ermittlerprüfung“ ohne Lab-Ermittlung) |
| Titel | Die Ermittlerprüfung |
| Kompetenzen | alle (Prüfungsauswahl siehe Teilaufgaben) |
| Fallen-Schwerpunkt | P1–P10 (Fallen-Check in der Peer-Korrektur) |
| Datenbank | Mensa-Vorbestellsystem (Generalprobe, Verhör 7) · Schulsanitätsdienst (Klausur) · Kostümverleih der Theater-AG (Nachschreibklausur) – jeweils eigene kleine DB, nüchtern |
| Unplugged | – (Probeklausur + Peer-Korrektur) |
| Video | 7 (optional, Abi-Check) |
| Verhör | Verhör 7 · Mensa (V7, Lab-Generalprobe, 30') |
| Niveau | eA (30 BE) / gA (25 BE) |

### Lernziele
Die Schülerinnen und Schüler …

1. **bearbeiten** eine Prüfungsaufgabe im Abitur-Format (eA 30 BE / gA 25 BE) unter Zeitbudget und **wenden** die Operatoren sachgerecht **an**.
2. **beurteilen** fremde Lösungen anhand eines Erwartungshorizonts mit Kernpunkten und Teilpunkten.
3. **analysieren** ihr eigenes Fallen-Profil (P1–P10) und **leiten** gezielte Wiederholungen **ab**.

### Verlaufsplan
| Phase | Zeit | Inhalt / Ablauf | Sozialform | Material | Lab |
|---|---|---|---|---|---|
| Organisation | 0–5' | Sitzordnung, Regeln, Hilfsmittel nach Abitur-Vorgabe (EH §7/§8 als Hilfsmittel – offener Punkt 1 der Spec), Zeitbudget-Hinweis (≈ 2 min je BE). | Plenum | Aufgabenblätter eA/gA | – |
| Generalprobe | 5–75' | eA: 30 BE (70'); gA: 25 BE (60') – gA nutzt die letzten 10' für den Fallen-Check der eigenen Lösung. | EA | Generalprobe eA/gA (Abschnitt unten) | – |
| Peer-Korrektur | 75–87' | Tausch über Kreuz (andere Teams, Ermittlernummer statt Name). Korrektur der SQL-Teile e–g mit Erwartungshorizont; die Lehrkraft schaltet die Mensa-DB in der **Freien Ermittlung** frei → Korrektor:innen führen die SQL-Lösungen aus und vergleichen mit der Musterergebnistabelle. Jede gefundene Falle wird auf der **Fallen-Checkliste** (P1–P10) angekreuzt. Restliche Teile (a–d) als Hausaufgabe, Rückgabe nächste Stunde. | Paare | Erwartungshorizont, Fallen-Checkliste, Lab | Freie Ermittlung (Mensa) |
| Abschluss | 87–90' | Fallen-Strichliste des Kurses an der Tafel neben dem Fallen-Profil aus dem Lab; Endstand festschreiben, Urkunden „Detektei-Lizenz“ (Druck aus dem Lehrkraft-Bereich). Verhör 7 (30') als Hausaufgabe vor der Klausur. | Plenum | Urkunden | Verhör 7 |

### Warm-up-Karten

In DS 13 entfällt das Warm-up. Die Karten **W-A6-01…06** (Wiederholung DS 12) und **W-A7-01…10** (Abi-Mix, Fallen P1–P10)
werden als **Hausaufgabe vor der Generalprobe** im Leitner-Trainer bearbeitet; findet K2 statt, dienen W-A6-01…04 dort als Warm-up.

| ID | Titel | Aufgabe | Min. | Kompetenz | Falle |
|---|---|---|---|---|---|
| W-A6-01 | Grundsatz erkennen | Zu drei Situationen den betroffenen DSGVO-Grundsatz angeben. | 2' | K44 | – |
| W-A6-02 | Quasi-Identifikator | Erklären, warum Jahrgang + Stadtteil + Tarif eine Person identifizieren können, obwohl kein Name gespeichert ist. | 2' | K46 | – |
| W-A6-03 | Pseudonym oder anonym? | Für zwei Datensätze entscheiden und begründen, ob sie pseudonym oder anonym sind. | 2' | K46 | – |
| W-A6-04 | Schutz oder Sicherheit? | Vier Maßnahmen Datenschutz bzw. Datensicherheit zuordnen. | 2' | K46 | – |
| W-A6-05 | Werbung erlaubt? | Zwei Voraussetzungen nennen, unter denen Nutzungsdaten für Werbung verwendet werden dürfen. | 2' | K45 | P10 |
| W-A6-06 | Kleine Gruppen finden | Abfrage notieren: alle Kombinationen aus Jahrgang und Stadtteil mit weniger als 3 Einwohnern. | 3' | K27, K46 | P1 |
| W-A7-01 | Fallen-Check P1 | Eine fehlerhafte Abfrage mit Aggregat in WHERE korrigieren. | 2' | K27 | P1 |
| W-A7-02 | Fallen-Check P2 | Erklären, warum eine Umsatzsumme über Bon, Position und Schicht zu hoch ist. | 3' | K31, K24 | P2 |
| W-A7-03 | Fallen-Check P3 | Eine Abfrage so ergänzen, dass sie die GROUP-BY-Regel erfüllt und Gleichnamige trennt. | 2' | K26 | P3 |
| W-A7-04 | Fallen-Check P4 | Entscheiden: „Anzahl verkaufter Tickets“ – COUNT(*) oder SUM(Anzahl)? | 1' | K25 | P4 |
| W-A7-05 | Fallen-Check P5 | Drei fehlerhafte Literale bzw. NULL-Vergleiche korrigieren. | 2' | K32, K18 | P5 |
| W-A7-06 | Fallen-Check P6/P7 | Klammern setzen und fehlende Tabellenpräfixe ergänzen. | 2' | K17, K16 | P6, P7 |
| W-A7-07 | Fallen-Check P8 | Begründen, warum ein Datenausschnitt die Eignung eines Primärschlüssels nicht beweist. | 2' | K02 | P8 |
| W-A7-08 | Fallen-Check P9 | Einen Überführungsfehler (FK auf der 1-Seite) finden und korrigieren. | 2' | K41 | P9 |
| W-A7-09 | Fallen-Check P10 | Eine Analyse ohne Sachzusammenhang in einen Satz mit Sachzusammenhang umschreiben. | 2' | K28 | P10 |
| W-A7-10 | Zeitbudget und Operatoren | Zu einer Aufgabe mit 30 BE ein Zeitbudget je Teilaufgabe erstellen und die Operatoren „analysieren“, „erläutern“, „beurteilen“ unterscheiden. | 3' | K47 | P10 |

### Typische Schwierigkeiten · Differenzierung · Vorbereitung
**Typische Schwierigkeiten**
- Zeitnot bei ER-Teilaufgaben (eA) → Zeitbudget (≈ 2 min/BE) vorher besprechen, ER nach SQL bearbeiten erlaubt.
- Peer-Korrektur zu großzügig/zu streng → Kernpunkte mit Teilpunkten, Zweitkorrektur durch die Lehrkraft stichprobenartig.
- SQL „läuft“ in SQLite, verletzt aber die EH (GROUP-BY-Regel, Alias in HAVING) → im Erwartungshorizont als Punktabzug markiert.

**Differenzierung**
- gA-Fassung (25 BE, ohne ER, mit Datenschutz-Teil); Nachteilsausgleich nach Schulregel.
- Schnelle: Fallen-Check der eigenen Lösung, dann Verhör 7 im Lab.

**Vorbereitung**
- Generalprobe eA/gA, Erwartungshorizonte (Bewertungsbogen I/II/III/BE), Fallen-Checklisten kopieren.
- Mensa-DB für die Freie Ermittlung nach der Abgabe freischaltbar; Urkunden im Lehrkraft-Bereich vorbereiten (Endstand).
- Klausurtermin (separat, nicht in den 15 DS) mit Klausur- und Nachschreibklausur-Fassung vorbereiten.

### Verhör-Blueprint: Verhör 7 · Mensa (V7, Lab-Generalprobe, 30')

**Kontext-DB „Mensa-Vorbestellsystem“** (auch Basis der Generalprobe, andere Teilaufgaben):
`Person(<u>PersonNr</u>, Vorname, Nachname, Rolle, Klasse)` · `Gericht(<u>GerichtNr</u>, Bezeichnung, Kategorie, Preis, Vegetarisch)` · `Angebot(<u>AngebotNr</u>, ↑GerichtNr, Datum, Portionen)` · `Bestellung(<u>BestellNr</u>, ↑PersonNr, ↑AngebotNr, Menge, Abgeholt)` – Abgeholt NULL = nicht abgeholt; zusammengelegte Tabelle `BestellUebersicht` für Anomalie-Aufgaben.
Rahmensatz (STORY 6, wie VERHOER_KONTEXTE): „Letzte Probe vor der Lizenz: ein ganzer Fall, ohne mich.“ Kontext-Einleitung je Aufgabe: Die Mensa einer Gesamtschule lässt das Mittagessen online vorbestellen. Timer 30 min, Abimodus `streng`. Aktenfarbe A7 `#383E47`; Akte 7 hat keine Lab-Aufgaben, Verhör 7 ist im Modus „auto“ frei, sobald Akte 7 freigeschaltet ist. eA-markierte Aufgaben (A7-V-12, -14, -15) sind im gA-Kurs ausgeblendet.

| ID | Titel | Stufe | Interaktion | Kompetenz(en) | Falle(n) | Niveau | Aufgabe (gesiezt, Transfer) |
|---|---|---|---|---|---|---|---|
| A7-V-01 | Schlüssel | ★ | `choice` | K02 | P8 | gA/eA | Beurteilen Sie, ob (PersonNr, AngebotNr) als Primärschlüssel von Bestellung geeignet ist, wenn Personen dasselbe Angebot mehrfach bestellen dürfen. |
| A7-V-02 | Anomalie | ★ | `choice` | K08 | P10 | gA/eA | Geben Sie an, welche Anomalie in der Tabelle BestellUebersicht beim Löschen der letzten Bestellung eines Gerichts auftritt. |
| A7-V-03 | Vegetarisch | ★ | `sql` | K15, K17 | P5 | gA/eA | Entwerfen Sie eine Abfrage für alle vegetarischen Gerichte unter 4 € mit Bezeichnung und Preis. |
| A7-V-04 | Tagesangebot | ★ | `sql` | K23, K32 | P5 | gA/eA | Entwerfen Sie eine Abfrage, die die Bezeichnungen aller am '2027-03-15' angebotenen Gerichte ausgibt. |
| A7-V-05 | Gruppenergebnis | ★ | `ergebnis` | K26, K29 | – | gA/eA | Geben Sie das Ergebnis einer gegebenen gruppierten Abfrage für einen Ausschnitt von 8 Bestellungen an. |
| A7-V-06 | WHERE oder HAVING | ★ | `choice` | K27 | P1 | gA/eA | Geben Sie an, welche der vier Abfragen die Frage „Gerichte mit mehr als 30 bestellten Portionen“ korrekt beantwortet. |
| A7-V-07 | Nicht abgeholt | ★★ | `sql` | K24, K18 | P5 | gA/eA | Entwerfen Sie eine Abfrage für alle nicht abgeholten Bestellungen mit Name der Person, Datum und Gericht. |
| A7-V-08 | Portionen je Gericht | ★★ | `sql` | K26, K25 | P3, P4 | gA/eA | Entwerfen Sie eine Abfrage, die je Gericht (Nummer, Bezeichnung) die Summe der bestellten Portionen ausgibt. |
| A7-V-09 | Vielbesteller | ★★ | `sql` | K27, K24 | P1 | gA/eA | Entwerfen Sie eine Abfrage für alle Personen mit mehr als 10 Bestellungen. |
| A7-V-10 | Analyse | ★★ | `choice` | K28 | P10 | gA/eA | Geben Sie an, welche Beschreibung die Information einer gegebenen Abfrage im Sachzusammenhang zutreffend wiedergibt. |
| A7-V-11 | Zusammengelegt | ★★ | `zellen` | K09, K07 | P10 | gA/eA | Untersuchen Sie BestellUebersicht (Bestellungen vom 2027-03-16, von Hand nachgetragen) und geben Sie alle Zellen an, die an einer **bereits eingetretenen** Änderungsanomalie (Widerspruch) beteiligt sind – 7 Zellen (Klasse bzw. Preis). |
| A7-V-12 | Kardinalität | ★★ | `choice` | K34 | P9 | eA | Bestimmen Sie die Kardinalität zwischen Gericht und Angebot anhand der Daten und des Sachzusammenhangs. |
| A7-V-13 | Top 3 der Woche | ★★★ | `sql` | K24, K22 | P2 | gA/eA | Entwerfen Sie eine Abfrage für die drei Gerichte mit dem höchsten Umsatz in der Woche vom '2027-03-15' bis '2027-03-19'. |
| A7-V-14 | Allergene | ★★★ | `er` | K39, K36 | P9 | eA | Erweitern Sie das ER-Modell: Gerichte enthalten Allergene (n:m, Mengenangabe; Allergen mit Schlüssel Kuerzel). |
| A7-V-15 | Überführung | ★★★ | `schema` | K41 | P9 | eA | Überführen Sie das erweiterte ER-Modell (Allergene, Vertretung unter Küchenkräften: *vertritt* rekursiv 1:n – jede Küchenkraft hat höchstens eine feste Vertretung) in Relationen. |

Pool-Mix ★/★★/★★★: **6/6/3 (40/40/20 %)** · Ziehung 8 = 3 × ★ + 3 × ★★ + 2 × ★★★ (gA: aus 12 Aufgaben, ★★★ nur A7-V-13).

### Blueprint Generalprobe eA (30 BE, ≈ 70') – Kontext Mensa-Vorbestellsystem

**Material:** Schema in Kurzschreibweise (s. Verhör 7), Ausschnitte aller Tabellen, zusammengelegte Tabelle `BestellUebersicht(BestellNr, PersonNr, Name, Klasse, Datum, Gericht, Preis, Menge)`, ER-Modell (Person — *bestellt* — Angebot — *bietetAn* — Gericht, Küchenkraft — *bereitetZu* — Angebot). Aufbau nach Spec 11.3: ≈ 9 BE Schlüssel/Anomalien, ≈ 9 BE ER, ≈ 12 BE SQL (2 entwerfen, 1 analysieren). Gesiezt, ein Operator je Teil (Doppeloperatoren nur, wo das Abitur sie nutzt).

| ID | Teil | Operator | Inhalt | BE | I | II | III | Kompetenzen | Fallen |
|---|---|---|---|---|---|---|---|---|---|
| GP-eA-a | a | **erläutern / beurteilen** | Kennzeichnungen in Bestellung erläutern; beurteilen, ob (PersonNr, AngebotNr) als Primärschlüssel von Bestellung genügen würde (Mehrfachbestellung). | 4 | 2 | 2 |  | K05, K03, K02 | P8 |
| GP-eA-b | b | **untersuchen** | BestellUebersicht auf Anomalien untersuchen und den Zusammenhang mit der Redundanz an konkreten Datensätzen erläutern. | 5 | 1 | 3 | 1 | K08, K09, K10, K07 | P10 |
| GP-eA-c | c | **erweitern** | ER-Modell erweitern: Gerichte enthalten Allergene (n:m, Attribut Hinweis); Küchenkräfte vertreten einander (rekursiv, 1:n: höchstens eine feste Vertretung je Küchenkraft – wie A7-V-15); Schlüsselattribute und Kardinalitäten vollständig. | 6 |  | 3 | 3 | K39, K37, K36, K35 | P9 |
| GP-eA-d | d | **überführen / begründen** | Den erweiterten Teil in Kurzschreibweise überführen und die Umsetzung von *enthaelt* begründen. | 3 | 1 | 1 | 1 | K41, K42, K04 | P9 |
| GP-eA-e | e | **entwerfen** | SQL: Bezeichnung und Preis aller vegetarischen Gerichte, die am '2027-03-15' angeboten werden, aufsteigend nach Preis. | 3 | 2 | 1 |  | K23, K17, K21, K32 | P5, P7 |
| GP-eA-f | f | **entwerfen** | SQL: für jedes Gericht (Nummer, Bezeichnung) die Summe der im März 2027 bestellten Portionen, nur Gerichte mit mehr als 50 Portionen, absteigend sortiert. | 5 | 1 | 3 | 1 | K24, K25, K26, K27, K18 | P1, P3, P4 |
| GP-eA-g | g | **analysieren** | Gegebene Abfrage (Person, Bestellung, Angebot; WHERE Abgeholt IS NULL; GROUP BY PersonNr, Vorname, Nachname; ORDER BY COUNT(*) DESC; LIMIT 3) im Sachzusammenhang analysieren. | 4 | 2 | 2 |  | K28, K22, K18 | P10 |
|  | **Summe** |  |  | **30** | 9 | 15 | 6 |  |  |

AFB-Verteilung: I 9 BE (30 %) · II 15 BE (50 %) · III 6 BE (20 %)

### Blueprint Generalprobe gA (25 BE, ≈ 60') – Kontext Mensa-Vorbestellsystem

Gleiches Material ohne ER-Modell; zusätzlicher Datenschutz-Teil.

| ID | Teil | Operator | Inhalt | BE | I | II | III | Kompetenzen | Fallen |
|---|---|---|---|---|---|---|---|---|---|
| GP-gA-a | a | **erläutern / beurteilen** | Kennzeichnungen in Bestellung erläutern; Eignung von (PersonNr, AngebotNr) als Primärschlüssel beurteilen. | 4 | 2 | 2 |  | K05, K03, K02 | P8 |
| GP-gA-b | b | **untersuchen** | BestellUebersicht auf Anomalien untersuchen (an konkreten Datensätzen). | 5 | 1 | 3 | 1 | K08, K09, K10 | P10 |
| GP-gA-c | c | **entwerfen** | SQL wie GP-eA-e (vegetarische Gerichte am Stichtag, sortiert). | 3 | 2 | 1 |  | K23, K17, K21 | P5 |
| GP-gA-d | d | **entwerfen** | SQL wie GP-eA-f (Portionen je Gericht, WHERE + HAVING). | 5 | 1 | 3 | 1 | K24, K26, K27 | P1, P3 |
| GP-gA-e | e | **analysieren** | Gegebene Abfrage wie GP-eA-g im Sachzusammenhang analysieren. | 4 | 2 | 2 |  | K28 | P10 |
| GP-gA-f | f | **beurteilen** | Die Mensa will Allergie-Angaben und Bestellhistorien an den Caterer und ein Elternportal übermitteln: unter Bezug auf zwei Grundsätze beurteilen und eine technische Schutzmaßnahme erläutern. | 4 |  | 2 | 2 | K44, K45, K46 | P10 |
|  | **Summe** |  |  | **25** | 8 | 13 | 4 |  |  |

AFB-Verteilung: I 8 BE (32 %) · II 13 BE (52 %) · III 4 BE (16 %)

**Ablauf der Peer-Korrektur (beide Fassungen):**
1. Abgabe mit Ermittlernummer; Lehrkraft verteilt über Kreuz (nie innerhalb des eigenen Teams).
2. Erwartungshorizont je Teilaufgabe als Kernpunkt-Liste mit Teilpunkten und typischen Fehlern (P-Nummern); SQL-Teile werden in der Freien Ermittlung (Mensa-DB) ausgeführt und mit der Musterergebnistabelle verglichen – Abweichung bei lauffähiger Abfrage → Kernpunkt prüfen, nicht automatisch 0 BE.
3. Fallen-Checkliste P1–P10: jede beobachtete Falle ankreuzen und Teilaufgabe notieren.
4. Rückgabe mit Kommentar „stark: … / üben: … (Warm-up-Karte W-A7-…)“; Lehrkraft prüft 3–4 Arbeiten stichprobenartig nach (Kalibrierung).
5. Kurs-Strichliste der Fallen neben dem Fallen-Profil aus dem Lab → gemeinsame Wiederholungsschwerpunkte vor der Klausur.

### Blueprint Klausur eA – Aufgabe A (30 BE, Abitur-Format) – Kontext Schulsanitätsdienst

**Klausur eA: 60 BE (Aufgabe A + B), separater Termin.** Material A: `Sanitaeter(<u>SanNr</u>, Vorname, Nachname, Klasse, Stufe, ↑BetreuerNr)` (rekursiv) · `Einsatz(<u>EinsatzNr</u>, Datum, Uhrzeit, Ort, Art)` · `eingesetzt(<u>↑SanNr, ↑EinsatzNr</u>, Rolle)` · `Material(<u>MatNr</u>, Bezeichnung, Bestand)` · `verbraucht(<u>↑EinsatzNr, ↑MatNr</u>, Menge)` + Tabellenausschnitte + zusammengelegte Tabelle `EinsatzListe(EinsatzNr, Datum, Ort, SanNr, Name, Klasse, Rolle)`.

| ID | Teil | Operator | Inhalt | BE | I | II | III | Kompetenzen | Fallen |
|---|---|---|---|---|---|---|---|---|---|
| KL-A-a | a | **erläutern** | Kennzeichnungen in Sanitaeter erläutern, insbesondere ↑BetreuerNr (Verweis auf die eigene Relation, abweichender Name). | 3 | 2 | 1 |  | K03, K04, K05 | P7 |
| KL-A-b | b | **beurteilen** | Eignung von (SanNr, EinsatzNr) als Primärschlüssel von eingesetzt beurteilen, wenn Sanitäter bei langen Einsätzen die Rolle wechseln. | 3 |  | 2 | 1 | K02 | P8 |
| KL-A-c | c | **untersuchen** | EinsatzListe auf Anomalien untersuchen; Zusammenhang mit der Redundanz an Datensätzen erläutern. | 5 | 1 | 3 | 1 | K07, K08, K09, K10 | P10 |
| KL-A-d | d | **entwerfen** | SQL: alle Einsätze im Januar 2027 an den Orten Sporthalle oder Pausenhof (BETWEEN, IN) mit Datum, Uhrzeit und Art, nach Datum sortiert. | 3 | 2 | 1 |  | K15, K18, K32, K21 | P5, P6 |
| KL-A-e | e | **entwerfen** | SQL: Vor- und Nachname jeder Sanitäterin/jedes Sanitäters mit Vor- und Nachname der betreuenden Person (Self-Join). | 4 | 1 | 2 | 1 | K24, K16 | P7 |
| KL-A-f | f | **entwerfen** | SQL: Materialien (Nummer, Bezeichnung) mit einem Gesamtverbrauch von mehr als 20 Stück, absteigend nach Verbrauch. | 5 | 1 | 3 | 1 | K23, K25, K26, K27, K21 | P1, P3, P4 |
| KL-A-g | g | **analysieren** | Gegebene Abfrage (Sanitaeter, eingesetzt, Einsatz; WHERE Art = 'Sportunfall'; GROUP BY; ORDER BY COUNT(*) DESC; LIMIT 1) im Sachzusammenhang analysieren. | 4 | 2 | 2 |  | K28, K22 | P10 |
| KL-A-h | h | **beschreiben** | Vorgehen in Worten beschreiben: Wie lässt sich ermitteln, welche Sanitäter noch nie eingesetzt wurden? (ohne Unterabfrage) | 3 |  | 2 | 1 | K30 | P10 |
|  | **Summe** |  |  | **30** | 9 | 16 | 5 |  |  |

AFB-Verteilung: I 9 BE (30 %) · II 16 BE (53 %) · III 5 BE (17 %)

### Blueprint Klausur eA – Aufgabe B (30 BE: Modellierung, Überführung, Datenschutz)

**Material B:** Anforderungstext „Fortbildungsprogramm des Sanitätsdienstes“: Kurse (Nummer, Titel, Dauer) werden von genau einer externen Referentin/einem externen Referenten (Nummer, Name, Organisation) gehalten; Sanitäter:innen nehmen an Kursen teil (Datum, bestanden) und können in anderen Kursen assistieren; Kurse setzen andere Kurse voraus. Zusätzlich Schema-Ausschnitt `Funkgeraet(<u>GeraetNr</u>, Typ, ↑SanNr)` · `Ausgabe(<u>↑GeraetNr, ↑EinsatzNr</u>, Ausgabezeit)` für die Rückrichtung und ein Szenario „digitale Einsatzprotokolle“.

| ID | Teil | Operator | Inhalt | BE | I | II | III | Kompetenzen | Fallen |
|---|---|---|---|---|---|---|---|---|---|
| KL-B-a | a | **entwickeln** | ER-Modell zum Anforderungstext entwickeln (Entitätstypen, Schlüsselattribute, Beziehungstypen, Kardinalitäten, Beziehungsattribute; rekursiv *setztVoraus*; zwei Beziehungen Sanitäter–Kurs). | 10 | 3 | 5 | 2 | K35, K36, K37, K38, K47 | P9 |
| KL-B-b | b | **begründen** | Kardinalitäten von *nimmtTeil* und *haelt* im Sachzusammenhang begründen. | 3 | 1 | 2 |  | K34 | P9, P10 |
| KL-B-c | c | **beurteilen** | Aussage beurteilen: „Mit dem ER-Modell lässt sich sicherstellen, dass ein Kurs höchstens 12 Teilnehmende hat.“ | 2 |  | 1 | 1 | K40 | P10 |
| KL-B-d | d | **erstellen** | ER-Modell aus a) in ein Relationenschema in Kurzschreibweise überführen. | 6 | 3 | 2 | 1 | K41, K04 | P9 |
| KL-B-e | e | **begründen** | Begründen, warum *setztVoraus* eine eigene Relation erfordert, *haelt* dagegen als Fremdschlüssel umgesetzt wird. | 2 |  | 1 | 1 | K42 | P9 |
| KL-B-f | f | **erstellen** | Aus dem Schema-Ausschnitt Funkgeraet/Ausgabe das ER-Diagramm rekonstruieren. | 3 | 1 | 2 |  | K43 | P9 |
| KL-B-g | g | **beurteilen** | Digitale Einsatzprotokolle (Name, Klasse, Verletzungsart, Cloud-Speicherung, Statistik an die Schulleitung) unter Bezug auf zwei Grundsätze und die besondere Kategorie Gesundheitsdaten beurteilen; eine technische Maßnahme erläutern. | 4 | 1 | 2 | 1 | K44, K45, K46 | P10 |
|  | **Summe** |  |  | **30** | 9 | 15 | 6 |  |  |

AFB-Verteilung: I 9 BE (30 %) · II 15 BE (50 %) · III 6 BE (20 %)

**Gesamtverteilung Klausur eA (A + B, 60 BE):** I 18 BE (30 %) · II 31 BE (52 %) · III 11 BE (18 %).
**Kürzung auf 45 BE (modular):** A a, c, e, f, g (21 BE) + B a, c, d, e, g (24 BE).

### Blueprint Klausur gA – Aufgabe B-gA (15 BE; gA-Klausur = Aufgabe A 30 BE + B-gA 15 BE = 45 BE)

Material: Rohliste `AusbildungRoh(SanNr, Name, Kurse, Referent, RefTelefon, Raum)` mit mehrwertigen Zellen; Szenario digitale Einsatzprotokolle.

| ID | Teil | Operator | Inhalt | BE | I | II | III | Kompetenzen | Fallen |
|---|---|---|---|---|---|---|---|---|---|
| KL-BgA-a | a | **untersuchen** | AusbildungRoh auf Redundanzen und nicht-atomare Werte untersuchen; Folgen für eine Auswertung „Wie viele haben den AED-Kurs?“ erläutern. | 4 | 1 | 2 | 1 | K07, K14 | P10 |
| KL-BgA-b | b | **erläutern** | Je eine Einfüge- und Löschanomalie an einem konkreten Datensatz erläutern. | 3 | 1 | 2 |  | K08 | P10 |
| KL-BgA-c | c | **beurteilen** | Digitale Einsatzprotokolle unter Bezug auf zwei Grundsätze und die besondere Kategorie Gesundheitsdaten beurteilen; Datenschutz und Datensicherheit abgrenzen. | 5 | 1 | 2 | 2 | K44, K45, K46 | P10 |
| KL-BgA-d | d | **erörtern** | Chancen und Risiken einer automatisierten Auswertung der Einsatzprotokolle (Profilbildung) erörtern. | 3 |  | 2 | 1 | K46 | P10 |
|  | **Summe** |  |  | **15** | 3 | 8 | 4 |  |  |

AFB-Verteilung: I 3 BE (20 %) · II 8 BE (53 %) · III 4 BE (27 %)

**Gesamtverteilung Klausur gA (A + B-gA, 45 BE):** I 12 BE (27 %) · II 24 BE (53 %) · III 9 BE (20 %).

### Blueprint Nachschreibklausur eA – Aufgabe A (30 BE) – Kontext Kostümverleih der Theater-AG

**Gleicher Bauplan wie die Klausur, anderer Kontext.** Material: `Mitglied(<u>MitgliedNr</u>, Vorname, Nachname, Klasse, ↑PateNr)` (rekursiv *istPateVon*) · `Kostuem(<u>KostuemNr</u>, Bezeichnung, Groesse, Epoche, Zustand)` · `Stueck(<u>StueckNr</u>, Titel, Premiere)` · `Rolle(<u>RollenNr</u>, Name, ↑StueckNr)` · `Ausleihe(<u>AusleihNr</u>, ↑KostuemNr, ↑MitgliedNr, ↑RollenNr, Von, Bis)` (Bis NULL = nicht zurückgegeben) + zusammengelegte Tabelle `KostuemRolle(KostuemNr, Bezeichnung, RollenNr, Rolle, Stueck, Premiere)`.

| ID | Teil | Operator | Inhalt | BE | I | II | III | Kompetenzen | Fallen |
|---|---|---|---|---|---|---|---|---|---|
| NK-A-a | a | **erläutern** | Kennzeichnungen in Ausleihe und Mitglied (↑PateNr) erläutern. | 3 | 2 | 1 |  | K03, K04, K05 | P7 |
| NK-A-b | b | **beurteilen** | Eignung von (KostuemNr, MitgliedNr) als Primärschlüssel von Ausleihe beurteilen (wiederholtes Ausleihen). | 3 |  | 2 | 1 | K02 | P8 |
| NK-A-c | c | **untersuchen** | KostuemRolle auf Anomalien untersuchen und den Zusammenhang mit der Redundanz erläutern. | 5 | 1 | 3 | 1 | K07, K08, K09, K10 | P10 |
| NK-A-d | d | **entwerfen** | SQL: alle nicht zurückgegebenen Kostüme (Bis IS NULL) mit Bezeichnung sowie Vor- und Nachname. | 3 | 2 | 1 |  | K18, K23 | P5 |
| NK-A-e | e | **entwerfen** | SQL: Titel des Stücks, Rollenname und Kostümbezeichnung aller Ausleihen von Kostümen der Epoche Barock (vier Tabellen). | 4 | 1 | 2 | 1 | K24, K16 | P2, P7 |
| NK-A-f | f | **entwerfen** | SQL: die drei Mitglieder (Nummer, Name) mit den meisten Ausleihen, nur Mitglieder mit mehr als 3 Ausleihen. | 5 | 1 | 3 | 1 | K26, K27, K22 | P1, P3 |
| NK-A-g | g | **analysieren** | Gegebene Abfrage (Self-Join Mitglied m, Mitglied p; WHERE p.Klasse LIKE '12%') im Sachzusammenhang analysieren. | 4 | 2 | 2 |  | K28, K19, K24 | P10 |
| NK-A-h | h | **beschreiben** | Vorgehen in Worten beschreiben: Welche Kostüme wurden noch nie ausgeliehen? | 3 |  | 2 | 1 | K30 | P10 |
|  | **Summe** |  |  | **30** | 9 | 16 | 5 |  |  |

AFB-Verteilung: I 9 BE (30 %) · II 16 BE (53 %) · III 5 BE (17 %)

### Blueprint Nachschreibklausur eA – Aufgabe B (30 BE)

Anforderungstext „Aufführungsplanung“: Aufführungen (Datum) an Spielorten; Mitglieder spielen in einer Aufführung eine Rolle (ternär); Zweitbesetzungen vertreten Mitglieder (rekursiv); Requisiten gehören zu genau einem Stück. Schema-Ausschnitt `Werkstatt`/`repariert(↑KostuemNr, ↑MitgliedNr, Datum)` für die Rückrichtung; Szenario Veröffentlichung auf der Schulhomepage.

| ID | Teil | Operator | Inhalt | BE | I | II | III | Kompetenzen | Fallen |
|---|---|---|---|---|---|---|---|---|---|
| NK-B-a | a | **entwickeln** | ER-Modell zum Anforderungstext entwickeln (inkl. ternärer und rekursiver Beziehung, Beziehungsattribute). | 10 | 3 | 5 | 2 | K35, K36, K37, K38, K47 | P9 |
| NK-B-b | b | **begründen** | Kardinalitäten zweier Beziehungstypen begründen. | 3 | 1 | 2 |  | K34 | P9 |
| NK-B-c | c | **beurteilen** | Modellierungsalternative „Rolle als Attribut von Mitglied“ vs. „Rolle als Entitätstyp“ beurteilen. | 2 |  | 1 | 1 | K40 | P10 |
| NK-B-d | d | **erstellen** | ER-Modell in ein Relationenschema in Kurzschreibweise überführen. | 6 | 3 | 2 | 1 | K41, K04 | P9 |
| NK-B-e | e | **begründen** | Schlüsselwahl der Relation zur ternären Beziehung begründen. | 2 |  | 1 | 1 | K42 | P9 |
| NK-B-f | f | **erstellen** | Aus dem Schema-Ausschnitt Werkstatt/repariert das ER-Diagramm rekonstruieren. | 3 | 1 | 2 |  | K43 | P9 |
| NK-B-g | g | **beurteilen** | Veröffentlichung von Aufführungsfotos und einer Mitgliederliste mit Klassen und Rollen auf der Schulhomepage beurteilen (Einwilligung, Zweckbindung, Datenminimierung) und eine Maßnahme vorschlagen. | 4 | 1 | 2 | 1 | K44, K45, K46 | P10 |
|  | **Summe** |  |  | **30** | 9 | 15 | 6 |  |  |

AFB-Verteilung: I 9 BE (30 %) · II 15 BE (50 %) · III 6 BE (20 %)

**Gesamtverteilung Nachschreibklausur eA:** wie Klausur (I 18 / II 31 / III 11 BE). gA-Nachschreibklausur: NK-A + B-gA-Bauplan im Kostüm-Kontext (Rohliste `KostuemlisteRoh`, Datenschutz Homepage).

---

## K1 · Kür „Eigene Datenbank bauen“ (nach DS 11) – KÜR: NICHT IM ABITUR

| Kopf |  |
|---|---|
| Doppelstunde | K1 (Kür) |
| Akte / Ermittlung | Kür 1 (K1-E1, eigene Welt „Kür“ in `seed/akten/kuer.json`) |
| Titel | Eigene Datenbank bauen |
| Kompetenzen | K06, K48 (Kür) · Transfer K03, K04, K23, K41 |
| Fallen-Schwerpunkt | – (Kür; Abimodus `aus`) |
| Datenbank | Sandbox-Konsole im Schreibmodus: pro Schüler:in eigene In-Memory-DB (leer oder Startschema Detektei-light) |
| Unplugged | – (Teamplanung auf Papier) |
| Video | – |
| Verhör | – |
| Niveau | Kür (nur eA – entfällt im gA-Pfad, Spec §3.4/§18) |

### Lernziele
Die Schülerinnen und Schüler …

1. **erstellen** Tabellen mit `CREATE TABLE` inklusive `PRIMARY KEY` und `FOREIGN KEY … REFERENCES` und füllen sie mit `INSERT INTO`. *(nicht im Abitur)*
2. **erläutern** referentielle Integrität an einer erlebten FK-Verletzung. *(nicht im Abitur)*
3. **vergleichen** den Abitur-Verbund `FROM a, b WHERE` mit `JOIN … ON` und nutzen `LEFT JOIN`, um Datensätze ohne Partner zu finden. *(nicht im Abitur)*
4. **planen** im Team eine kleine Datenbank, setzen sie um und **dokumentieren** sie.

### Verlaufsplan
| Phase | Zeit | Inhalt / Ablauf | Sozialform | Material | Lab |
|---|---|---|---|---|---|
| Warm-up | 0–10' | Karten W-A5-09…12 erneut (Überführung) oder freie Wahl im Leitner-Trainer. | EA | Leitner | Warm-up |
| Briefing | 10–20' | Stempel **KÜR – nicht im Abitur** auf jeder Folie. Vom Schema zur Tabelle: `CREATE TABLE` mit Datentypen (INTEGER, TEXT), PRIMARY KEY, FOREIGN KEY; `INSERT INTO`. Impuls: *„Was soll passieren, wenn ein Fall auf einen Ermittler verweist, den es nicht gibt?“* | LV | Präsentation Kür K1 | – |
| Lab-Einsatz | 20–55' | Sandbox: K1-E1-01…05 (Abimodus `aus`; Hinweis „Im Abitur schreibst du den Verbund mit FROM … WHERE“ bleibt sichtbar). | EA | iPad/Laptop | K1-E1-01…05 |
| Teamprojekt | 55–85' | K1-E1-06: Teams planen eine Mini-DB (eigenes Thema, 3–4 Tabellen, mind. eine n:m-Beziehung), notieren Schema in Kurzschreibweise, setzen sie um, schreiben drei Abfragen im Abitur-Stil und dokumentieren auf einer Projektkarte. | Teams | Projektkarte (A4) | K1-E1-06 |
| Abschluss | 85–90' | Zwei Teams stellen ihre DB in 2' vor; Projektkarten an die Pinnwand. | Plenum | – | – |

### Tafelbild / Merkkasten „Ermittler-Notiz“
> **KÜR – nicht im Abitur.** Im Abitur schreibst du den Verbund ausschließlich mit `FROM … WHERE`.

```sql
-- KÜR (nicht im Abitur)
CREATE TABLE Ermittler (
  ErmittlerNr INTEGER PRIMARY KEY,
  Name        TEXT NOT NULL,
  MentorNr    INTEGER REFERENCES Ermittler(ErmittlerNr)
);
CREATE TABLE Fall (
  FallNr  INTEGER PRIMARY KEY,
  Titel   TEXT,
  LeiterNr INTEGER NOT NULL,
  FOREIGN KEY (LeiterNr) REFERENCES Ermittler(ErmittlerNr)
);
INSERT INTO Ermittler VALUES (1, 'Edda Lorenz', NULL);
INSERT INTO Fall VALUES (10, 'Das Phantom', 7);      -- Fehler: Ermittler 7 existiert nicht

SELECT p.Vorname, p.Nachname, v.FallNr               -- Ausblick: Personen ohne Fall
FROM Person p LEFT JOIN verdaechtig v ON p.PersonNr = v.PersonNr;
```
**Referentielle Integrität:** Jeder Fremdschlüsselwert verweist auf einen existierenden Primärschlüsselwert (oder ist NULL). Das DBMS verhindert Verstöße (in SQLite mit `PRAGMA foreign_keys = ON`, in der Sandbox voreingestellt).

### Lab-Blueprint (K1-E1)

| ID | Titel | Stufe | Interaktion | Kompetenz(en) | Falle(n) | Niveau | Inhalt |
|---|---|---|---|---|---|---|---|
| K1-E1-01 | Die erste Tabelle | ★ | `sql` | K04, K48 | – | Kür | KÜR: `CREATE TABLE Ermittler` mit ErmittlerNr als PRIMARY KEY, Name und Dienstgrad anlegen (Prüfung über Schema-Abfrage). |
| K1-E1-02 | Akten anlegen | ★ | `sql` | K48 | – | Kür | KÜR: drei Ermittler mit `INSERT INTO` eintragen, dann mit SELECT kontrollieren. |
| K1-E1-03 | Der verbotene Verweis | ★★ | `sql` | K06, K03 | – | Kür | KÜR: Tabelle Fall mit `FOREIGN KEY (LeiterNr) REFERENCES Ermittler` anlegen, einen Fall mit nicht existierendem Leiter einfügen (Fehlermeldung deuten), dann korrekt einfügen. |
| K1-E1-04 | Zwei Schreibweisen | ★★ | `sql` | K23 | – | Kür | KÜR (Ausblick): eine gegebene Abitur-Verbundabfrage mit `JOIN … ON` umschreiben und Gleichheit der Ergebnisse prüfen. |
| K1-E1-05 | Personen ohne Fall | ★★★ | `sql` | K23 | – | Kür | KÜR (Ausblick): mit `LEFT JOIN` alle Personen der Detektei-DB ausgeben, die in keinem Fall verdächtig sind (Zeilen mit NULL im Fall-Teil). |
| K1-E1-06 | Unsere Datenbank | ★★★ | `sql` | K48, K41 | – | Kür | KÜR-Teamprojekt: eigene Mini-DB (3–4 Tabellen, eine n:m-Beziehung) planen, mit CREATE/INSERT umsetzen und drei Abfragen im Abitur-Stil formulieren (Prüfung: Kernkriterien-Check der Sandbox, Dokumentation auf Projektkarte). |

Stufenmix ★/★★/★★★: **2/2/2 (33/33/33 %)** · Interaktionsarten: `sql`

**Umsetzung (Phase 6, `seed/akten/kuer.json`):** Welt 8 mit `kuer: true`, ohne Rangwirkung (AUFGABENFORMAT §1.1); alle
`sql`-Teile sind Schreib-Aufgaben (§6.6.1) mit Prüfpunkten. Start: 01 leer, 02 Tabelle Ermittler (leer), 03
„Detektei-light“ (Ermittler 1–3), 04/05 Kopie der Detektei-DB, 06 leer. K1-E1-03 hat zusätzlich Teil b) (`choice`:
Warum wurde LeiterNr 7 abgewiesen?), damit das Deuten der Fehlermeldung geprüft wird; K1-E1-06 = `sql` (Kernkriterien:
≥ 3 Tabellen, Primärschlüssel je Tabelle, Beziehungstabelle mit zusammengesetztem Primärschlüssel aus zwei
Fremdschlüsseln, je Tabelle ≥ 2 Datensätze) + `kernpunkte` (drei Abfragen im Abitur-Stil, Schema auf der Projektkarte).
Das Intro zeigt das Tafelbild mit einem Schulbeispiel (Klasse/Schueler) statt Ermittler/Fall, damit es die Lösungen von
K1-E1-01/03 nicht vorwegnimmt.

### Typische Schwierigkeiten · Differenzierung · Vorbereitung
**Typische Schwierigkeiten**
- Verwechslung von Kür- und Abitur-Syntax → Stempel auf jeder Folie, Parser-Hinweis `JOIN_ON` bleibt auch im Abimodus `aus` sichtbar.
- FK-Prüfung in SQLite standardmäßig aus → Sandbox setzt `PRAGMA foreign_keys = ON` (serverseitig/Worker, nicht vom Schüler).
- Datentypen werden überschätzt (SQLite ist typschwach) – kurz erwähnen, nicht vertiefen.

**Differenzierung:** Schnelle: CHECK-Bedingungen, `ON DELETE CASCADE` ausprobieren. Langsame: Startschema „Detektei-light“ statt leerer DB.
**Vorbereitung:** Kür-Welt im Kurs freischalten; Projektkarten (A4) kopieren; Sandbox-Schreibmodus testen (In-Memory pro Schüler:in, nichts wird gespeichert).

---

## K2 · Kür „Escape Room Weserstedt“ (vor DS 13)

| Kopf |  |
|---|---|
| Doppelstunde | K2 (Kür) |
| Akte / Ermittlung | Kür 2 (Live-Modus, keine Lab-Punkte) |
| Titel | Escape Room Weserstedt |
| Kompetenzen | Wiederholung aller Akten (Auswahl: K02, K08, K09, K18, K22, K24, K26, K27, K28, K34, K41) |
| Fallen-Schwerpunkt | P1–P10 (Wiederholung) |
| Datenbank | Live-Modus (SSE): Escape-Room-Szenario mit 6 Stationen; Stationen nutzen die Akten-DBs (Fundbuero, StadtRad, Stadtfest, TuS, Detektei) |
| Unplugged | Escape-Room-Stationen (Papierumschläge + Lab) |
| Video | – |
| Verhör | – |
| Niveau | gA/eA (Station 5 nur eA, gA-Ersatzstation 5g) |

### Lernziele
Die Schülerinnen und Schüler …

1. **wiederholen** die Inhalte aller Akten unter Zeitdruck im Team.
2. **wenden** SQL, Schlüssel-/Anomaliewissen und ER-Wissen in neuen Aufgaben **an**.
3. **reflektieren** ihre häufigsten Fallen vor der Generalprobe.

### Verlaufsplan
| Phase | Zeit | Inhalt / Ablauf | Sozialform | Material | Lab |
|---|---|---|---|---|---|
| Warm-up | 0–10' | Karten W-A6-01…04 (Datenschutz, Wiederholung DS 12). | EA | Warm-up-Karten A6 | Leitner optional |
| Briefing | 10–15' | STORY 5.15: Juri hat die Zahlenschlösser am Tresor mit den Detektei-Lizenzen neu eingestellt und die Codes „besonders sicher“ in den Datenbanken versteckt – sechs Stationen, sechs Codes. Regeln, Teams (3–4), Beamer-Rangliste. | Plenum | Beamer (Live-Board) | Live-Runde starten |
| Escape Room | 15–70' | Teams lösen Stationen 1–6 in fester Reihenfolge; jede richtige Lösung liefert serverseitig einen Code, der die nächste Station öffnet; Papierumschlag je Station mit Material (Tabellenausschnitte, ER-Ausschnitte). Countdown 55'. | Teams | Stationsumschläge, iPads | Escape-Room-Szenario |
| Duell-Runde | 70–80' | Optional: Live-Duell mit Aufgaben aus dem Live-Pool (gleiche Aufgabe für alle, Punkte für Richtigkeit + Zeit). | EA | – | Live-Pool |
| Auswertung | 80–90' | Rangliste, häufigste Fehler je Station (anonym), Fallen-Ausblick auf die Generalprobe. Ergebnisse werden nach Rundenende verworfen. | Plenum | – | – |

### Typische Schwierigkeiten · Differenzierung · Vorbereitung
**Umsetzung (Phase 6):** Code-Eingabe auch ohne vorheriges Lösen möglich (höchstens 5 Fehlversuche je Minute); die Lehrkraft sieht die Codes in der Steuerung; Beamer nur mit Lehrkraft-Anmeldung; im Duell erscheint das Ergebnis erst nach dem Schließen der Aufgabe; bei falscher `match`/`choice`-Antwort im Escape Room keine Einzelrückmeldung; Statistik (Modus, Teilnehmerzahl, Datum) nur im RAM.

**Typische Schwierigkeiten:** Teams hängen an einer Station fest → nach 10' gibt die Lehrkraft einen Tipp-Umschlag frei (Zeitstrafe 2'). Dominante Teammitglieder → Rolle „Tastatur wechselt je Station“.
**Differenzierung:** gA-Ersatzstation S5g (Schlüsselkasten); Zusatzschloss (Bonus) für schnelle Teams: Self-Join auf der Detektei-DB.
**Vorbereitung:** Live-Runde im Lehrkraft-Bereich testen (SSE durch Schul-WLAN?), Stationsumschläge packen, Beamer-Board, Countdown.

### Escape-Room-Stationen (Blueprint)

| Station (STORY 9) | Thema | Aufgabe (Kurzbeschreibung) | Kompetenzen | Code-Ableitung (serverseitig) |
|---|---|---|---|---|
| S1 Das Fundbuch-Schloss | SQL in einer Tabelle (Fundbuero) | `sql`: eine Frage mit WHERE, LIKE, IS NULL, deren Antwort eine Anzahl von Datensätzen ist | K17, K18, K19, K29 | Anzahl der Ergebniszeilen, dreistellig mit führenden Nullen |
| S2 Das Speichenschloss | Verbund über 2–3 Tabellen (StadtRad), Alias | `sql`: das Rad mit der teuersten Reparatur (ORDER BY … LIMIT 1, kein Gleichstand) | K23, K22, K16 | RadID, vierstellig aufgefüllt |
| S3 Die Geldkassette | GROUP BY/HAVING (Stadtfest) | `sql`: Anzahl der Gruppen, die eine HAVING-Bedingung erfüllen, und Nummer der stärksten Gruppe | K26, K27, K22 | drei Zahlen hintereinander (Anzahl + StandNr + Schichten des stärksten Stands) |
| S4 Der Vereinsspind | Anomalien und Schlüssel (TuS-Rohliste) | `match`: drei Szenarien je einer Anomalieart zuordnen + `choice`: geeigneter Primärschlüssel | K08, K02 | Ziffernfolge der Zuordnung + Nummer der Schlüssel-Option |
| S5 Die Planrolle (eA) | ER → Relationenschema (neuer Mini-Kontext) | `schema`: Überführung in der Schema-Werkbank | K41, K34 | Anzahl der Relationen + Anzahl der Fremdschlüssel + Anzahl aller Attribute |
| S5g Der Schlüsselkasten (gA-Ersatz) | Schlüsselkandidaten, Ausschnitt-Falle | `choice` (umgesetzt statt `zellen`): die als Primärschlüssel tauglichen Attribute(-kombinationen) auswählen | K02 | Anzahl geeigneter Kandidaten + Attributzahl des minimalen Schlüssels + Attributzahl aller geeigneten Kandidaten |
| S6 Der Tresor | Datenschutz (Datenspuren + Szenarien) | `match`: fünf Szenarien den Grundsätzen Zweckbindung, Datenminimierung, Transparenz, Rechtsgrundlage/Einwilligung, Speicherbegrenzung zuordnen | K44, K45 | fünfstellige Ziffernfolge der Zuordnung |

**Live-Pool (20 Aufgaben, je Akte 3–4, Typ `ergebnis`/`choice`/`sql`, kurze Bearbeitungszeit ≤ 90 s):** A1 4 · A2 3 · A3 4 · A4 3 · A5 3 (eA) · A6 3. IDs `K2-L-01…20`; Inhalte nicht identisch mit Lab-, Verhör- oder Prüfungsaufgaben (Transfer). Keine Lab-Punkte, keine Speicherung nach Rundenende (Spec 7.10).

---

## Anhang: Abweichungen, Präzisierungen und offene Punkte gegenüber der Spec

| # | Stelle in der Spec | Festlegung in diesem Blueprint | Vorschlag |
|---|---|---|---|
| 1 | §10 „Summe 13 Ermittlungen“ vs. Tabelle (12) und Manifest `level: 13` | Akten 1–6 haben 12 Ermittlungen mit Lab-Aufgaben; das 13. Level ist Akte 7 „Die Ermittlerprüfung“ ohne Lab-Aufgaben (Inhalt: Verhör 7 = Lab-Generalprobe). | Spec §10: Zeile Akte 7 „Ermittlungen: 1 (ohne Lab, nur Verhör 7)“ ergänzen. |
| 2 | §10 Interaktionsmix Akte 6 (nur 4 Arten genannt) vs. „mind. 5 Arten je Akte“ | Akte 6 nutzt zusätzlich `zeilen` (A6-E1-05) → 5 Arten. | Tabelle §10 um `zeilen` ergänzen. |
| 3 | §3.2 Takt | DS 1 ohne Warm-up (Kick-off); DS 10 (Wettbewerb/Galerie, Lab 20'), DS 12 (Debatte 25', Lab 35'), DS 13 (Probeklausur) weichen bewusst ab. | Spec §3.2 um Hinweis „Sonder-DS 1, 10, 12, 13“ ergänzen. |
| 4 | §7.8/§10 Warm-up-Einsatz | Karten wiederholen die **Vorstunde**: W-A1 in DS 2–3, W-A2 in DS 4–5, W-A3 in DS 6–7, W-A4 in DS 8–9 (gA: W-A4-05…08 in DS 12), W-A5 in DS 10–12, W-A6/W-A7 als Hausaufgabe vor DS 13 (bzw. Warm-up in K2). | – |
| 5 | §3.3 DS 2 (kein Unplugged genannt), DS 4, DS 6, DS 8, DS 11, DS 12 | Unplugged ergänzt: Fahndung mit Platzhaltern (DS 2), Ermittlungsweg durchs Schema (DS 4), Menschliche Zeitlupe (DS 6), Schlüssel-Detektiv (DS 8), Regelkarten-Umzug (DS 11), „Steh auf, wenn …“ (DS 12). | Unplugged-Sets §11.4 entsprechend erweitern. |
| 6 | §9 Detektei: `Aussage(↑PersonNr, ↑FallNr, ↑OrtNr, Zeitpunkt, Inhalt)` | Beziehungstyp im ER heißt *sagtAus*; Relation bleibt `Aussage` wie in §9; Primärschlüssel (PersonNr, FallNr, OrtNr, Zeitpunkt), da Mehrfachaussagen möglich (Lerngegenstand A5-E3-07). Konvention §6.1 („Beziehungsrelationen heißen wie der Beziehungstyp“) würde `sagtAus` verlangen. | Entweder Relation in `sagtAus` umbenennen oder §6.1 um Ausnahme ergänzen; PK in LIESMICH festschreiben. |
| 7 | §9 Stadtfest `Schicht(↑HelferNr, ↑StandNr, Beginn, Ende)`, „PK = erste Attribute“ | PK (HelferNr, StandNr, Beginn) angenommen (Helfer kann mehrere Schichten am selben Stand haben). | In LIESMICH festschreiben. |
| 8 | §9 Datenspuren: `Einwohner(EinwohnerNr, Vorname, Nachname, Jahrgang, Stadtteil)` | **Neu (Koordination 2026-10-12):** `Einwohner` erhält die Spalte `Strasse`; das Gerät des Phantoms checkt nachts an 'Kranstraße 7' ein. Schlussplädoyer A6-E1-09…14 folgt STORY 7 (Hafenkante-Nächte 2026-09-08…12 → ein Token 1988/Hafenviertel/Plus → ein Gerät → Check-in-Verlauf → VereinExport Tischtennis), der letzte Schritt ist der Verbund AppCheckin × Einwohner über `Ort = Strasse` (mit RadExport über Jahrgang/Stadtteil). Alle Schritte laufen auf **einer** DB (Datenspuren), kein Verbund mit Stadtfest-`Stand`. | Spec §9 und STORY Anhang A um `Einwohner.Strasse` und den Check-in 'Kranstraße 7' ergänzen; Merle Falkenrath wohnt in der Kranstraße 7, Tamara Leversen und Ole Brakhage an anderen Adressen; kein Gleichstand bei Spur 3. |
| 9 | §5 / Abi-Muster „Vorgehen in Worten“ ohne Unterabfragen | Fragen wie „nie eingesetzt“ (KL-A-h, NK-A-h) werden nur **in Worten** beantwortet (Mengenvergleich), nicht per SQL (keine Unterabfragen im Kern). | – |
| 10 | Operator „überführen“ | In Generalprobe/Lab als „überführen“ verwendet; in den Klausuren nach Operatorenliste als **erstellen** („Erstellen Sie aus dem ER-Modell ein Relationenschema …“). | Werkzeugkarte 7 ergänzt „überführen = erstellen eines Relationenschemas“. |
| 11 | Cold Cases im Lab | Je Ermittlung eine Cold-Case-Aufgabe `A<n>-E<k>-CC` ohne Punkte (zusätzlich zu den 108); K13 (Kür Normalformen) wird über `A4-E2-CC` abgedeckt. | Validator: Cold Cases mit `punkte: 0`, nicht in Rang-/Freischaltberechnung. |
| 12 | Interaktion `lines` | Bedeutung hier: Codezeilen einer Abfrage antippen (z. B. fehlerhafte Zeile). Falls `lines` in AlgoQuest anders definiert ist, diese Aufgaben auf `choice` mit Zeilennummern umstellen. | In `docs/AUFGABENFORMAT.md` prüfen. |
| 13 | Story-Abgleich mit `docs/STORY.md` | Story-Fakten übernommen: Messing-Kompass (Wert 450, Fundort 'Weserpromenade', AbgeholtAm '2026-09-14', Finder 'N. Falter'); Konto 77 „Nora Falter“, Tarif 'Plus', Nachtfahrten 2026-09-08…12 01–02 Uhr ab 'Hafenkante'; Stand 'Kaffeemobil', Festtag 2026-08-29, Schicht 22:00–23:00, HelferNr 23, Fehlbetrag 312,50 € über Positionen mit Menge 0; TuS-Beitrag Erwachsene 12 → 14 €, „Nora Falter“ 0,00 €; Auftraggeber:innen und Debattenrollen nach STORY 3.2/8; Escape-Room-Stationen nach STORY 9; Verhör-Kontexte V1/V3/V5 an STORY 6 angepasst (Medienart, Verkaufsschichten, Trainer bildet Trainer aus). | – |
| 14 | DS 7–8 / Akte 4 (Phase 5) | Inhalte folgen den Daten der TuS-DB: Tafelbild mit echten Werten (Jens Meyer 0000-31415 in 23 Zeilen, Zahlendreher 0000-31451; Judo = Timo Rieken, Zeile 12); Einfügeanomalie im Lab und an der Tafel mit **Boule** (Gesa Thiele, Bouleplatz Weseraue) statt Bouldern – das Papier-Rennen behält Bouldern als eigene Daten (Hinweis im Ablauf). Ausschnitte zeigen eine Spalte Zeile (`rowid`). Aktenfarbe A4 `#5E4A8C`. | – |
| 15 | Mehrteilige Aufgaben | A4-E1-02, A4-E1-06 (b: genau eine Zelle), A4-E2-01/02/04/05, A5-E1-03/04, A5-E2-06, A5-E3-01, alle Cold Cases außer A4-E2-CC sowie A4-V-02 sind mehrteilig (Interaktion als Liste von Teilen). A4-E2-04 nutzt eine erweiterte `Mitgliedschaft(…, Seit, Bis)` nur im Aufgabentext. | – |
| 16 | `kernpunkte` | Aufgaben mit Kernpunkten bringen 0 Punkte und zählen nach dem Abhaken als bearbeitet; in gemischten Aufgaben erst nach Lösen/Lösung sichtbar. | – |
| 17 | Ermittler-Notizen | Intro-Notizen nehmen keine Lab-Lösung vorweg: A4-E1 erklärt Redundanz an Birte Haschke (nicht an Meyer), A4-E2 hat keine Datenbank-Kachel (normalisiertes TuS-Schema = Lösung A4-E2-07), A5-E3 erklärt R1–R6 am Schulbeispiel. A4-E2-07 nennt im Text alle Relationen und Attribute. | – |
| 18 | A4-E2-03 | Änderungsanomalie nur an den HallenAdresse-Zellen der mehrfach genannten Halle am Mühlenfeld; Trainer und Halle stehen nur über ihren eindeutigen Namen in der Tabelle. | – |
| 19 | Verhör 4 | Kontext Musikschule ohne normalisierte Teiltabellen (Musterzerlegung = Lösung A4-V-11), keine Varianten; FA-Liste mit Spaltennamen der Rohliste plus Etage aus Raum, Schlüssel {SchuelerNr, Instrument, LehrkraftNr}; in A4-V-01 zählt jedes Vorkommen redundanter Werte; „Albers“ ist ein vorgegebener Nachname (Ausnahmeliste im Namens-Test). | – |
| 20 | DS 9–11 / Akte 5 (Phase 5) | Datenbank-Kachel der Detektei nur in A5-E3-08 und A5-E3-CC (sonst wären die Überführungslösungen sichtbar); Tabellenausschnitte stehen direkt in den Aufgaben. A5-E1-03 zeigt das Mengendiagramm mit echten Daten der Fall-DB. Aktenfarbe A5 `#17585C`. | – |
| 21 | A5-E2-02 | Lesen-Modus mit Kategorien: **alle** Elemente werden zugeordnet; die zweite Beziehung Person–Fall heißt *meldet* (1:n). | – |
| 22 | A5-E3-06, A5-E3-08 | A5-E3-06 ohne Äquivalenz `nm_aufgeloest` (verdaechtig muss als n:m erkannt werden); A5-E3-08 ohne gleichnamige Variante (Varianten `null`, `grenze`), `Seit` ist ein Jahr. | – |
| 23 | Verhör 5 | Kontext an DS_PLANUNG angeglichen (klettert, Trainer, bildetAus, besucht/assistiertIn, ternär *wertet* mit Relation Wertung, Wettkampf); VERHOER_KONTEXTE nachgezogen. A5-V-07 heißt „Das Beziehungsattribut“. Ziehung mit maxJeKind (choice 3, er 3) statt „je Bereich mindestens eine“. | – |
| 24 | Warm-up A5 | 12 Karten (W-A5-01…12, W-A5-09…12 in DS 12) – wie geplant, keine Abweichung. | Spec §10 bestätigt. |
| 25 | Trainingsplatz T4–T7 | T4 (Kardinalität) und T6 (Überführung) nur eA (in gA-Kursen ausgeblendet); T4 bietet auch n:1 (Leserichtung); T6-Optionen als Schema-Blöcke „Vorschlag A–D“ mit ER-Block. | – |
| 26 | DS 12 / Akte 6 (Phase 6) | Abfolge des Schlussplädoyers nach diesem Blueprint (Spur 1 ohne GROUP BY, Spur 4 nur AppCheckin mit FestZahlung-Gegenprobe in der Erklärung, Spur 6 ohne Zeitfilter); A6-E1-09 liefert 9 Zeilen; A6-E1-04 zweiteilig (150); A6-E1-05 mit V-7046 statt Phantom-Daten; Cold Case 100 %; Ermittler-Notiz ohne Tafelbild-SQL; A6-V-03 „Recht auf Selbstbestimmung“; V6 zieht 5 aus 8. Aktenfarbe A6 `#4A5A1A`. STORY §7 angeglichen. | – |
| 27 | DS 13 / Akte 7 (Phase 6) | V7-Rahmensatz aus STORY 6; A7-V-11 nur eingetretene Widersprüche (7 Zellen); *vertritt* 1:n in A7-V-15 und GP-eA-c; Beziehungstyp Gericht–Angebot einheitlich *bietetAn* (auch VERHOER_KONTEXTE, LIESMICH Mensa); Allergen mit Schlüssel Kuerzel, *enthaelt* mit Mengenangabe. Aktenfarbe A7 `#383E47`. | – |
| 28 | K1 / K2 (Phase 6) | Kür K1 nur eA (Welt 8, `kuer: true`, Punkte ohne Rangwirkung), K1-E1-03 mit Teil b) (`choice`), Intro mit Schulbeispiel; K2: S5g als `choice` statt `zellen`. | – |
| 29 | Material Phase 7 (allgemein) | Die docx/pptx in `materialien/` sind maßgeblich; die Blueprints hier wurden dort, wo sie konkrete Werte nennen, an das Material angeglichen (AB 1.2 Auftrag 2, AB 2.2 Aufträge 3/4, AB 4.1 Auftrag 3, Anomalie-Rennen, Schlüssel-Detektiv). Foliennummern in den Verlaufsplänen („Folien 12–20“) sind Richtwerte – die Präsentationen haben je DS den Aufbau Briefing → Begriffe → Beispiel → Unplugged → Lab → Merkfolie → Abi-Format, die Zahl der Folien weicht ab (v. a. Akte 3 und 5). | – |
| 30 | AB 1.1–1.2, Unplugged A1 (Phase 7) | AB 1.2 Auftrag 2 mit „(gemeint: …)“; Fundbuch-Ausschnitte und Unplugged-Daten (Karteikarten, Platzhalter-Fahndung) sind eigene Daten (`db=keine`); zusätzliche Kopiervorlage Detektei-Ausweise für den Kick-off. | – |
| 31 | AB 2.2 (Phase 7) | Auftrag 3 Altstadt statt Hafenviertel (dort 0 Zeilen); Kundin Clara Rossi statt Lea Meiners (Aufträge 4/5, mit laufender Ausleihe); zwei absichtliche Kreuzprodukte sind als fehlerhaft markiert (SQL-Prüfung `fehlerhaft`). | – |
| 32 | AB 3.1–3.2 (Phase 7) | AB 3.1 Auftrag 2 gruppiert die Positionen der Bons 400–404 nach BonNr; AB 3.2 Auftrag 5 zeigt die Vervielfachung durch die zusätzliche Tabelle Position (eA-Schwerpunkt). | – |
| 33 | Akte 4 (Phase 7) | Anomalie-Rennen mit eigener Übungsliste „SG Weserufer“ (Helge Meyer, Kaja Rohlfs u. a. aus `namen.json`); Schlüssel-Detektiv Vater und Sohn „Ole Harjes“; Löschanomalie in AB 4.1 an der Beitragsgruppe Passiv (Judo bleibt dem Lab A4-E1-04 vorbehalten); Abi-Format-Folien mit eigenen Aufgaben. | – |
| 34 | Akte 5 (Phase 7) | ABs 5.1–5.3 je 5 Seiten (Platz für ER-Diagramme); R1–R6 am Schulbeispiel; Verdachtsgrad-Beispiel aus dem Unplugged; Musterbeitrag „Hafenkante“ im Architekturwettbewerb; *vertritt* 1:n in der Abi-Ecke; Cold Cases als Varianten. | – |
| 35 | Akte 6 (Phase 7) | Rollenkarten-Debatte mit 4 Argumenten je Rolle (STORY 8) als eigene Kopiervorlage; Auflösung (Name, Motiv) nur in Lehrkraftfassungen. Warm-up-Karte W-A6-03 zeigt seit 2026-10-14 einen neutralen Datensatz (`WA-5208 · Lindenweg 12`) statt Gerät und Adresse der Auflösung (Entscheidung Frank, Spec §18). | – |
| 36 | Akte 7 (Phase 7) | Prüfungs-DBs `seed/datenbanken/pruefung/{sanitaetsdienst,kostuemverleih}` (nie öffentlich); Kostümverleih mit 26 Mitgliedern und 77 Ausleihen, zwei Mitglieder „Lasse Kück“ (GROUP-BY-Falle); NK-B-f ternär; Rollenwechsel nur im Text; Fallen-Checkliste als Kopiervorlage (art `unplugged`). Bewertungsschlüssel BE → Notenpunkte (Schlüssel der Oberstufe Niedersachsen) in allen Erwartungshorizonten (Entscheidung Frank 2026-10-14); Hilfsmittel: Operatorenübersicht. | – |
| 37 | Gesamt, Kür, Videos (Phase 7) | Abi-Kompass: 18 von 19 Klausuren einzeln belegt – genügt (Entscheidung Frank 2026-10-14); K1-AB ohne Kompetenz-Zuordnung (Matrix kennt kein AB K1); K2-Lehrkraftfassung als Lösung; Bonus-Schloss auf Papier; Operatoren-Karte selbst formuliert. Videos: eigene Video-DB `video/schachturnier`; Video 6 „R1 + 5 Regeln“; YouTube-Links als Link-Knöpfe aus `seed/videos.json`, sobald Frank sie einträgt. | – |
| 38 | Kompetenzmatrix K12, K22 (Phase 7) | K12 → AB 4.2/4 (Auftrag um „Begründe, dass dein Schema redundanzfrei ist“ ergänzt), K22 → AB 3.2/4 (LIMIT 1); Matrix, Material-Eigenschaften und `kompetenz_abdeckung.py` ohne Ausnahmen (Entscheidung Frank 2026-10-14, Spec §18). | – |
