# Fundbuero – Akte 1 „Das Fundbüro“

## Zweck und Story

Einstiegs-DB für SQL in **einer Tabelle** (DS 1–2): SELECT/WHERE/ORDER BY, LIKE, BETWEEN, IN, IS NULL, Berechnungen,
LIMIT, erste Aggregate. Story (STORY.md 4.1, Anhang A): Gesa Ohlendiek, Leiterin des Fundbüros, vermisst ein Fundstück
aus Register und Regal. Sie erinnert sich nur an Bruchstücke: „irgendwas aus Messing“, „im Juni oder Juli gefunden“,
„mehrere hundert Euro wert“. Über eine **Kette aus drei Abfragen** (Textmuster in `Bezeichnung` → Zeitraum für
`Funddatum` → `Wert`) bleibt genau ein Datensatz übrig: der **Messing-Kompass** (FundNr 36, Wert 450 €, gefunden am
2026-06-18 an der Weserpromenade). `AbgeholtAm` ist gesetzt (**2026-09-14**), im Feld `Finder` steht **`'N. Falter'`** –
schnell gesprochen *Nachtfalter*, die Signatur des Phantoms. Der Datensatz wurde mit einem Verwaltungszugang
nachträglich geändert; im Ausgabebuch fehlt die Unterschrift. Beweisstück der Akte: *Fundbuch-Seite*.

## Relationenschema (Kurzschreibweise)

Fundsache(<u>FundNr</u>, Bezeichnung, Kategorie, Farbe, Fundort, Stadtteil, Funddatum, Wert, Finder, AbgeholtAm)

| Attribut | Typ | Bedeutung / Wertebereich |
|---|---|---|
| FundNr | INTEGER | Eingangsnummer im Fundbuch, 1–80 lückenlos |
| Bezeichnung | TEXT | z. B. `'Schlüsselbund'`, `'Messing-Kompass'` |
| Kategorie | TEXT | `Schlüssel`, `Elektronik`, `Kleidung`, `Schmuck`, `Taschen`, `Dokumente`, `Fahrradzubehör`, `Spielzeug`, `Wertsachen`, `Sonstiges` |
| Farbe | TEXT | NULL = nicht erfasst |
| Fundort | TEXT | Ortsbeschreibung, passend zum Stadtteil |
| Stadtteil | TEXT | einer der acht Stadtteile (Altstadt, Hafenviertel, Weserufer, Mühlenfeld, Nordheide, Lindenhof, Deichkamp, Bahnhofsviertel) |
| Funddatum | TEXT | `'JJJJ-MM-TT'`, 2026-04-01 bis 2026-09-20 |
| Wert | REAL | geschätzter Wert in Euro, NULL = unbekannt |
| Finder | TEXT | `'V. Nachname'`, NULL = anonym abgegeben |
| AbgeholtAm | TEXT | `'JJJJ-MM-TT'`, NULL = noch nicht abgeholt |

## ER-Modell (Chen)

Ein **Entitätstyp** `Fundsache` mit den Attributen oben; Schlüsselattribut `FundNr` (unterstrichen). Keine
Beziehungstypen. *Cold Case / Ausblick Akte 5:* Finder und Abholende als eigener Entitätstyp `Person` mit den
Beziehungstypen *findet* (Person 1 – n Fundsache) und *holtAb* (Person 1 – n Fundsache) – zwei Beziehungen zwischen
denselben Entitätstypen.

## Datenumfang und Verteilung (Generator)

- **80 Zeilen**: 15 Pflicht + 65 erzeugt; FundNr 1–80 lückenlos, aufsteigend nach Funddatum (gleiche Tage erlaubt;
  die Pflicht-Daten passen in diese Ordnung).
- **Funddatum:** 2026-04-01 bis 2026-09-20 (Datenstand), ≈ 0,45 Funde pro Tag, Wochenenden etwas häufiger; Ende August
  (Stadtfest 28./29.08.) gehäuft am Festplatz.
- **Kategorie** (Anteile ≈): Kleidung 20 %, Schlüssel 15 %, Elektronik 15 %, Taschen 10 %, Dokumente 8 %,
  Fahrradzubehör 8 %, Schmuck 7 %, Spielzeug 7 %, Sonstiges 7 %, Wertsachen 3 %.
- **Bezeichnung** je Kategorie aus festen Listen, z. B. Schlüssel: `Schlüsselbund`, `Fahrradschlüssel`,
  `Autoschlüssel`, `Briefkastenschlüssel`; Elektronik: `Smartphone`, `Kopfhörer`, `Powerbank`, `Ladekabel`, `E-Reader`;
  Kleidung: `Jacke`, `Mütze`, `Schal`, `Handschuh`, `Regenjacke`; Taschen: `Rucksack`, `Sporttasche`, `Geldbörse`,
  `Turnbeutel`; Dokumente: `Monatskarte`, `Bibliotheksausweis`, `Notizbuch`, `Mappe mit Noten`; Fahrradzubehör: `Helm`,
  `Fahrradschloss`, `Luftpumpe`, `Fahrradlicht`; Schmuck: `Ring`, `Halskette`, `Ohrringe`, `Armbanduhr`; Spielzeug:
  `Kuscheltier`, `Ball`, `Spielzeugauto`; Wertsachen: `Kamera`, `Fernglas`; Sonstiges: `Regenschirm`, `Sonnenbrille`,
  `Brillenetui`, `Trinkflasche`. **Keine** weitere Bezeichnung enthält `ompass` oder `essing` (LIKE-Aufgaben);
  `uhr` nur in `Armbanduhr` (3–5 erzeugte, davon mindestens eine im Hafenviertel oder der Altstadt mit Wert ≥ 10).
  Mehrfach vorkommende Bezeichnungen sind normal (z. B. mehrere `Regenschirm`).
- **Farbe:** `schwarz`, `blau`, `rot`, `grün`, `grau`, `weiß`, `braun`, `gelb`, `silber`, `gold`, `bunt`; **NULL ≈ 15 %**.
- **Fundort/Stadtteil:** Orte je Stadtteil, u. a. die StadtRad-Stationen (`Station Marktplatz`, `Station Hafenkante`,
  `Station Heidepark`, …), `Bus Linie 1`–`Bus Linie 5`, `Festplatz` und `Weserpromenade` (Weserufer), `Freibad Mühlenfeld`,
  `Vereinsheim TuS` (Mühlenfeld), `Schulzentrum, Pausenhof` (Nordheide), `Café am Lindenplatz` (Lindenhof),
  `Gewerbegebiet am Deich` (Deichkamp), `Rathaus, Eingang`, `Marktplatz` (Altstadt), `Bahnhofshalle` (Bahnhofsviertel).
  Fundort und Stadtteil passen immer zusammen.
- **Wert:** ganze Euro nach Kategorie (Kleidung 5–60, Elektronik 15–150, Schmuck 10–150, Wertsachen 60–150 …);
  **erzeugte Werte ≤ 150** (damit die vier höchsten Werte 450/390/320/180 eindeutig Pflicht-Datensätze sind);
  genau 3 erzeugte Zeilen mit Wert **100** und 2 mit **50** (Grenzwerte); **NULL ≈ 10 %**.
  Im Zeitraum Juni–Juli hat **nur** FundNr 36 einen Wert ≥ 400.
- **Finder:** `'V. Nachname'` aus `namen.json`, **NULL ≈ 12 %**; nie Initial `N.` mit Nachname auf `F`, nie `falter`.
- **AbgeholtAm:** ≈ 55 % gesetzt, 0–21 Tage nach Funddatum, höchstens 2026-09-20; mindestens 2 Zeilen mit
  `AbgeholtAm = Funddatum`. **Nur** FundNr 36 liegt mehr als 60 Tage zwischen Fund und Abholung (für Lehrkraft-Hinweis;
  in EH-SQL nicht berechenbar).

## Pflicht-Datensätze (`pflicht.sql`)

| FundNr | Bezeichnung | Zweck |
|---|---|---|
| **36** | Messing-Kompass, Wertsachen, gold, Weserpromenade (Weserufer), 2026-06-18, Wert 450, Finder `'N. Falter'`, AbgeholtAm 2026-09-14 | **Story** (manipulierter Eintrag) |
| 19 / 46 / 61 | Messingschlüssel (2026-05-15, Wert NULL) · Messing-Kerzenhalter (2026-07-09, 35 €) · Messingglocke (2026-08-21, 12 €) | Kette Schritt 1/2: „Messing“ auch außerhalb Juni/Juli bzw. mit kleinem Wert |
| 9 / 37 | Taschenkompass (Spielzeug, 3 €) · Kompass-Anhänger (Finder NULL, 25 €) | LIKE-Falle `'%kompass%'` vs. `'Kompass%'` |
| 42 / 44 / 51 | Fernglas 180 € (Hafenkante, offen) · Goldarmband 320 € · Kamera 390 € (Festplatz, offen) | Kette Schritt 3: wertvoll im Juni/Juli, aber unter 400 € |
| 31 / 56 | Brillenetui 2026-06-01 · Regenjacke 2026-07-31 | Grenzdaten für `BETWEEN '2026-06-01' AND '2026-07-31'` |
| 75 / 80 | Fahrradhelm 2026-09-14 · Regenschirm 2026-09-20 | Grenzdaten „Septemberwoche“ (DS_PLANUNG A1-E2-04) |
| 27 / 49 | Armbanduhr (Hafenviertel, Wert NULL) · Kinderuhr (Altstadt, 8 €) | Uhren-Kette (DS_PLANUNG A1-E2-06/07) |

## Eingebaute Fallen

| Falle | Wo in den Daten |
|---|---|
| P5 NULL und Literale | `AbgeholtAm IS NULL` (offen) vs. `= NULL`; Wert/Farbe/Finder NULL; Datum als Text in Hochkommata; `Wert >= 400` verliert den Messingschlüssel (NULL) stillschweigend |
| P6 Bedingungslogik | Grenzdaten 2026-06-01/2026-07-31 (BETWEEN inklusive); Wert genau 100/50; `Kategorie = 'Schmuck' OR Kategorie = 'Wertsachen' AND Wert > 100` ohne Klammern; LIKE `'%kompass%'` trifft drei Datensätze, `'%Messing%'` vier |
| P4 COUNT ↔ SUM | `COUNT(Wert)` < `COUNT(*)` wegen NULL; `AVG(Wert)` ignoriert NULL |
| P10 Operator verfehlt | Analyse-Aufgabe (Beispiel 9) ohne Sachzusammenhang („zählt Zeilen“) |
| Sortierung mit NULL | SQLite sortiert NULL als kleinsten Wert (bei DESC zuletzt) – in Aufgaben nie auf die Position von NULL bauen |

## Randfall-Varianten

| Variante | Delta (IDs ab 9001) | Entlarvte Fehlabfrage |
|---|---|---|
| `null` | 9001 Handschuh ohne Farbe/Wert/Finder (offen); 9002 Rucksack mit Wert NULL, abgeholt | „Anzahl Fundsachen ohne bekannten Wert“ mit `WHERE Wert = NULL` (→ 0); „Fundsachen, die nicht schwarz sind (auch ohne Farbangabe)“ nur mit `Farbe != 'schwarz'` |
| `gleichnamig` | 9011 zweiter **Messing-Kompass** (Replik, 2026-07-02, 15 €, Altstadt, Finder `'T. Habben'`, abgeholt 2026-07-04) | „Zeige den Eintrag mit der Nachtfalter-Signatur“ bzw. „das wertvolle Messing-Fundstück“ mit `WHERE Bezeichnung = 'Messing-Kompass'` statt Finder/Wert-Bedingung |
| `grenze` | 9021 Fund 2026-06-01, Wert 100; 9022 Fund 2026-07-31, Wert 100, `AbgeholtAm = Funddatum`; 9023 Fund 2026-05-31, Wert 99.5; 9024 Fund 2026-09-20 | `Funddatum > '2026-06-01'`, `Funddatum < '2026-07-31'`, `Wert > 100` statt `>= 100`, `BETWEEN '2026-09-14' AND '2026-09-19'` |
| `gleichstand` | 9031 Silberkette, Wert 320 (gleich mit FundNr 44 auf Rang 3) | „alle Fundsachen mit einem der drei höchsten Werte“ per `ORDER BY Wert DESC LIMIT 3` (eine Zeile fällt zufällig weg) |
| `leer` | entfällt – eine Tabelle ohne Fremdschlüssel, GROUP BY erzeugt keine leeren Gruppen | – |

```sql
-- Fehlabfrage (Variante gleichnamig): passt auf der Übungs-DB nur zufällig
SELECT FundNr, Bezeichnung, Funddatum, Wert, Finder
FROM Fundsache
WHERE Bezeichnung = 'Messing-Kompass'
```

## Beispielabfragen (Abi-Stil)

**1. Offene Fundsachen im Hafenviertel** – „Entwerfen Sie eine SQL-Abfrage, die alle noch nicht abgeholten Fundsachen
aus dem Stadtteil Hafenviertel mit Nummer, Bezeichnung, Fundort und Funddatum ausgibt, die neuesten zuerst.“
Ergebnis: 4 Spalten; auf den Pflicht-Daten FundNr 61, 42, 27.

```sql
SELECT FundNr, Bezeichnung, Fundort, Funddatum
FROM Fundsache
WHERE Stadtteil = 'Hafenviertel'
  AND AbgeholtAm IS NULL
ORDER BY Funddatum DESC
```

**2. Alles mit „Kompass“** – Ergebnis: genau FundNr 9, 36, 37 (LIKE vergleicht ASCII-Buchstaben ohne Groß/Klein).

```sql
SELECT FundNr, Bezeichnung, Kategorie, Wert
FROM Fundsache
WHERE Bezeichnung LIKE '%kompass%'
```

**3. Indizienkette 1/3: Messing** – Ergebnis: genau FundNr 19, 36, 46, 61.

```sql
SELECT FundNr, Bezeichnung, Funddatum, Wert
FROM Fundsache
WHERE Bezeichnung LIKE '%Messing%'
ORDER BY Funddatum
```

**4. Indizienkette 2/3: Messing im Juni oder Juli** – Ergebnis: genau FundNr 36 und 46.

```sql
SELECT FundNr, Bezeichnung, Funddatum, Wert
FROM Fundsache
WHERE Bezeichnung LIKE '%Messing%'
  AND Funddatum BETWEEN '2026-06-01' AND '2026-07-31'
```

**5. Indizienkette 3/3: das wertvolle Fundstück** – Ergebnis: genau eine Zeile: 36, Messing-Kompass, 450, AbgeholtAm
2026-09-14, Finder `'N. Falter'`.

```sql
SELECT FundNr, Bezeichnung, Wert, AbgeholtAm, Finder
FROM Fundsache
WHERE Bezeichnung LIKE '%Messing%'
  AND Funddatum BETWEEN '2026-06-01' AND '2026-07-31'
  AND Wert >= 400
```

**6. Statistik je Kategorie** – Anzahl und durchschnittlicher Wert je Kategorie, nur Kategorien mit mindestens zwei
Fundsachen, die häufigste zuerst. Ergebnis: Spalten Kategorie, Anzahl, Durchschnittswert (AVG ignoriert NULL).

```sql
SELECT Kategorie, COUNT(*) AS Anzahl, AVG(Wert) AS Durchschnittswert
FROM Fundsache
GROUP BY Kategorie
HAVING COUNT(*) >= 2
ORDER BY Anzahl DESC
```

**7. Die drei wertvollsten Fundsachen** – Ergebnis: 36 (450), 51 (390), 44 (320); garantiert ohne Gleichstand an der
Schnittkante (Generatorvorgabe Wert ≤ 150).

```sql
SELECT FundNr, Bezeichnung, Wert
FROM Fundsache
ORDER BY Wert DESC
LIMIT 3
```

**8. Finderlohn und Septemberwoche** – Für Fundsachen aus der Woche vom 2026-09-14 bis 2026-09-20 sollen Bezeichnung,
Wert und ein Finderlohn von 5 % ausgegeben werden. Ergebnis: auf den Pflicht-Daten FundNr 75 (1.5) und 80 (0.4).

```sql
SELECT FundNr, Bezeichnung, Wert, Wert * 0.05 AS Finderlohn
FROM Fundsache
WHERE Funddatum BETWEEN '2026-09-14' AND '2026-09-20'
ORDER BY Finderlohn DESC
```

**9. Abfrage analysieren** – „Analysieren Sie die folgende Abfrage und beschreiben Sie, welche Informationen sie im
Sachzusammenhang liefert.“ Erwartet: Für jeden Stadtteil die Anzahl der Fundsachen, die vor Juli 2026 gefunden und bis
zum Datenstand nicht abgeholt wurden; Stadtteile ohne solche Fundsachen erscheinen nicht; absteigend nach Anzahl.

```sql
SELECT Stadtteil, COUNT(*) AS Offen
FROM Fundsache
WHERE AbgeholtAm IS NULL
  AND Funddatum < '2026-07-01'
GROUP BY Stadtteil
ORDER BY Offen DESC
```

## Abnahme-Prüfungen (nach dem Generieren)

| Prüfung | Erwartung |
|---|---|
| `SELECT COUNT(*), MIN(FundNr), MAX(FundNr) FROM Fundsache` | 80, 1, 80 |
| Beispiel 5 | genau FundNr 36 |
| `SELECT FundNr FROM Fundsache WHERE Bezeichnung LIKE '%ompass%'` | genau 9, 36, 37 |
| `SELECT FundNr FROM Fundsache WHERE Bezeichnung LIKE '%essing%'` | genau 19, 36, 46, 61 |
| `SELECT FundNr FROM Fundsache WHERE Finder LIKE 'N. F%' OR Finder LIKE '%falter%'` | genau 36 |
| `SELECT FundNr FROM Fundsache ORDER BY Wert DESC LIMIT 5` | 36, 51, 44, 42, dann ein Wert ≤ 150 |
| `SELECT COUNT(*) FROM Fundsache WHERE AbgeholtAm < Funddatum` | 0 |
| NULL-Anteile | Farbe 10–20 %, Wert 8–15 %, Finder 8–15 %, AbgeholtAm 40–50 % |
| `SELECT COUNT(*) FROM Fundsache WHERE AbgeholtAm = Funddatum` | ≥ 2 |
| `SELECT COUNT(*) FROM Fundsache WHERE Wert = 100` | 3 |
| `SELECT COUNT(*) FROM Fundsache WHERE Funddatum BETWEEN '2026-09-14' AND '2026-09-20'` | ≥ 3 (inkl. Grenzdaten 75, 80) |
