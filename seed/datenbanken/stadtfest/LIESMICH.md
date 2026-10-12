# Stadtfest – Akte 3 „Die Stadtfest-Kasse“ (auch Akte 6)

## Zweck und Story

Aggregations-DB (DS 5–6): Aggregatfunktionen, **COUNT vs. SUM(Menge)** (P4), GROUP BY mit GROUP-BY-Regel (P3),
HAVING vs. WHERE (P1), Top-n mit LIMIT, **Vervielfachung im Verbund** (P2), Abfragen analysieren, Vorgehen in Worten.

Story (STORY.md 4.3, Anhang A): Das Weserstedter Stadtfest findet auf den Weserwiesen statt (Festplatz, Stadtteil
Weserufer; **Fr 2026-08-28** 16–24 Uhr, **Sa 2026-08-29** 14–24 Uhr). Frauke Melchers, Kassenwartin des Festausschusses,
meldet einen Fehlbetrag von **312,50 €**: Bargeld und Bar-Umsatz laut Kasse passen zusammen, aber bei der Warenzählung
wurden mehr Getränke ausgegeben, als die Kasse verkauft hat. Am **Kaffeemobil** (Stand 4) gibt es am Samstag in der
Stunde **22:00–23:00** auffällig viele Bons mit Positionen der **Menge 0**, alle **bar** (am Wagen hing „Kartenzahlung
gestört“). Kassiert hat Helferin **23 „Nora Falter“** (Jahrgang 1988, gemeldet über den TuS Weserstedt). Kaffee
ausgegeben, bar kassiert, mit Menge 0 gebucht: Die Kasse „rechnet richtig“, aber das Geld ist weg. Die **Listenpreise
aller Positionen mit Menge 0** in dieser Schicht ergeben zusammen genau **312,50 €**. Zählt man Positionen, sieht man das
Problem; summiert man Mengen, sieht man nichts (COUNT ↔ SUM, P4). Beweisstück: *Kassenbon* (Bon 486: „Kaffeemobil ·
29.08. · 22:41 · Kaffee 0 × 2,50 € · Summe 0,00 € · bar · Bediener 23“). In Akte 6 liefert der Kartenzahlungs-Export
(`FestZahlung`) den Hinweis, dass am Kaffeemobil in genau dieser Stunde keine einzige Kartenzahlung stattfand.

## Relationenschema (Kurzschreibweise)

- Stand(<u>StandNr</u>, Name, Art, Platz)
- Helfer(<u>HelferNr</u>, Vorname, Nachname, Jahrgang, Verein)
- Schicht(<u>↑HelferNr</u>, <u>↑StandNr</u>, <u>Beginn</u>, Ende)
- Produkt(<u>ProduktNr</u>, Bezeichnung, Preis, ↑StandNr)
- Bon(<u>BonNr</u>, ↑StandNr, ↑HelferNr, Zeitpunkt, Zahlart)
- Position(<u>↑BonNr</u>, <u>↑ProduktNr</u>, Menge)

`Bon.HelferNr` = wer kassiert hat („Bediener“; in jeder Kassenschicht genau eine Person). `Zahlart` ∈ {`'bar'`,
`'Karte'`}. `Position.Menge` ≥ 0 (0 = Position ohne Menge). `Platz` = Bereich des Festplatzes (`Bühne`, `Promenade`,
`Festwiese`). Zeitpunkte `'JJJJ-MM-TT hh:mm'`; „24:00 Uhr“ ist `'2026-08-29 00:00'` bzw. `'2026-08-30 00:00'`.

*Hinweis:* Der frühere Entwurf enthielt eine Tabelle `Kassenabrechnung` (gezählter Kassenbestand). Sie entfällt, weil der
Fehlbetrag laut Story nicht in der Kasse, sondern bei der Warenzählung auffällt und sich mit einer einzigen EH-konformen
Abfrage aus `Position`/`Produkt` ergibt (Beispiel 5) – das Schema entspricht damit wieder Spec Abschnitt 9.

## ER-Modell (Chen)

- **Entitätstypen:** `Stand` (<u>StandNr</u>, Name, Art, Platz), `Helfer` (<u>HelferNr</u>, Vorname, Nachname, Jahrgang,
  Verein), `Produkt` (<u>ProduktNr</u>, Bezeichnung, Preis), `Bon` (<u>BonNr</u>, Zeitpunkt, Zahlart).
- **Beziehungstypen:**
  - *arbeitetAn* zwischen Helfer (n) und Stand (m), Beziehungsattribute **Beginn**, Ende → Tabelle `Schicht`; da dieselbe
    Person mehrfach am selben Stand arbeitet, gehört `Beginn` zum Schlüssel.
  - *bietetAn*: Stand (1) – Produkt (n).
  - *enthaelt* zwischen Bon (n) und Produkt (m), Beziehungsattribut **Menge** → Tabelle `Position`.
  - *gehoertZu*: Stand (1) – Bon (n); *kassiert*: Helfer (1) – Bon (n).

## Datenumfang und Verteilung (Generator)

Ziel ≈ 1 500 Zeilen. Stände (8) und Produkte (26) sind vollständig in `pflicht.sql`, außerdem der ganze Samstagabend am
Kaffeemobil (21:00–23:59: Schichten, 74 Bons, 152 Positionen).

| Tabelle | Pflicht | Generator | Ziel |
|---|---|---|---|
| Stand | 8 | – | 8 |
| Produkt | 26 | – | 26 |
| Helfer | 2 (Nr. 7, 23) | 58 → HelferNr 1–60 lückenlos | 60 |
| Schicht | 3 | Kassenschichten + Zusatzschichten | ≈ 120 |
| Bon | 74 (439–512) | ≈ 450 | ≈ 525 |
| Position | 152 | ≈ 700 | ≈ 850 |

- **Helfer:** Jahrgang 1950–2008, **kein weiterer Jahrgang 1988**; Verein: `TuS Weserstedt` 25 %,
  `Freiwillige Feuerwehr Weserstedt` 20 %, `Förderverein Schulzentrum` 20 %, `Shantychor Weserstedt` 15 %,
  **NULL 20 %**. Genau **ein gleichnamiges Paar** (gleicher Vor- und Nachname, verschiedene HelferNr, verschiedener
  Jahrgang; beide mit eigener Kassenschicht). Genau **2 Helfer ohne Schicht** (kurzfristig abgesagt). Reservierte
  Nachnamen aus `namen.json` nie.
- **Kassenschichten** (je eine `Schicht` der kassierenden Person; alle Bons der Schicht tragen ihre HelferNr):
  Kaffeemobil stündlich, alle anderen Stände mit Verkauf (1, 2, 3, 5, 6, 7) in 2-Stunden-Blöcken; Fr 16–24, Sa 14–24.
  Sa 21–22 und 23–24 am Kaffeemobil kassiert Selin Aksoy (7), Sa 22–23 Nora Falter (23) – alles Pflicht.
- **Zusatzschichten** (Ausgabe, Grill, Spülen): je Stand mit Verkauf 1–2 weitere Personen in 2–4-Stunden-Schichten;
  Info-Zelt (8): 2 Personen je 4-Stunden-Schicht, **ohne Kasse, ohne Produkte, ohne Bons**. Helferin 23 hat nur die
  Pflicht-Schicht.
- **Bons:** Zeitpunkt innerhalb der Kassenschicht, **nie auf einer vollen Stunde** (Minute 01–59; volle Stunden nur in
  der Variante `grenze`); `Bon.HelferNr` = Kassierer der Schicht. Bons je Stunde: Kaffeemobil 4–8 (Sa ab 18 Uhr 8–12),
  Bierwagen 4–8, Grillhütte 3–7, übrige 1–4. Am Kaffeemobil Sa 21:00–23:59 **keine** weiteren Bons (Pflicht).
- **Zahlart:** Anteil Karte: Kaffeemobil 45 %, Bierwagen 35 %, sonst 40 %.
- **Positionen:** 1–3 je Bon (60/30/10 %), verschiedene Produkte des eigenen Standes; Menge 1–3 (Los: 1–10).
  **Positionen mit Menge 0:** höchstens eine je Stand und Tag, **höchstens 2 je Helfer** und nie am Kaffeemobil (außer
  Pflicht). Produkt 26 (Kinderpunsch) wird nie verkauft.
- Umsatzsummen je Stand paarweise verschieden (Top-n ohne Gleichstand); Stückzahlen der drei meistverkauften Produkte
  paarweise verschieden und verschieden vom vierten.
- **Kopplung an Datenspuren:** `FestZahlung` = alle Bons mit Zahlart `'Karte'` (Token je zahlender Person, ≈ 20 % der
  Tokens zahlen zwei- bis dreimal; Betrag = Bonsumme).

## Pflicht-Datensätze (`pflicht.sql`)

`pflicht.sql` ist mit einem kleinen Werkzeug erzeugt (Prüfsummen siehe Kommentar im Kopf der Datei).

| Datensatz | Werte |
|---|---|
| Stände 1–8 | 1 Grillhütte (Essen, Festwiese), 2 Fischbrötchen-Kutter (Essen, Promenade), 3 Saftbar (Getränke, Bühne), **4 Kaffeemobil (Getränke, Promenade)**, 5 Bierwagen (Getränke, Bühne), 6 Crêpes-Stand (Süßes, Festwiese), 7 Losbude (Spiel, Festwiese), 8 Info-Zelt (Info, Bühne) |
| Produkte 1–26 | Kaffeemobil: 11 Kaffee 2,50 · 12 Cappuccino 3,00 · 13 Latte Macchiato 3,50 · 14 Kakao 2,50 · 15 Espresso 2,00 · 16 Waffel 3,00; übrige Stände siehe `pflicht.sql`; 26 Kinderpunsch (Saftbar) ohne Verkauf |
| Helfer **23** | Nora Falter, 1988, TuS Weserstedt – Schicht (23, 4, 2026-08-29 22:00, 2026-08-29 23:00) |
| Helfer 7 | Selin Aksoy, 1979, ohne Verein (Betreiberin) – Schichten Sa 21–22 und 23–24 am Kaffeemobil |
| Bons 439–450, 503–512 | Selin Aksoy, 21:03–21:55 bzw. 23:02–23:57, davon 5 bzw. 4 mit Karte |
| Bons **451–502** | Stand 4, Helfer 23, **alle bar**, 22:01–22:59: **12 Verkaufsbons** (Barumsatz 55,00 €) und **40 Bons nur mit Positionen der Menge 0** – zusammen **110 Positionen** (40 × Kaffee, 30 × Cappuccino, 20 × Latte Macchiato, 15 × Kakao, 5 × Waffel), Listenpreise **312,50 €** |
| Bon **486** | 22:41, nur Kaffee mit Menge 0 (Beweisstück) |

## Eingebaute Fallen

| Falle | Wo in den Daten |
|---|---|
| P1 WHERE ↔ HAVING | „Helfer mit mindestens 3 Positionen der Menge 0“: `Menge = 0` gehört in WHERE, `COUNT(*) >= 3` in HAVING |
| P2 Vervielfachung | Verbund Bon × Position zählt Positionen statt Bons; zusätzlich × Schicht (über StandNr) vervielfacht Umsätze um die Zahl der Schichten am Stand |
| P3 GROUP-BY-Regel | gleichnamiges Helferpaar; `SELECT Helfer.Nachname, SUM(…) … GROUP BY Helfer.HelferNr` ist nach EH nicht zulässig (Nachname nicht gruppiert) |
| P4 COUNT ↔ SUM | „Anzahl verkaufter Kaffees“ = `SUM(Menge)`, „Anzahl Bons“ = `COUNT(*)` über Bon; Positionen mit Menge 0 zählen bei COUNT mit, bei SUM nicht – in Noras Stunde 52 Bons, 125 Positionen, aber nur 20 verkaufte Artikel |
| P6 Grenzen | Schicht [Beginn, Ende): `BETWEEN '2026-08-29 22:00' AND '2026-08-29 23:00'` zählt einen Bon um 23:00 mit (Variante `grenze`); Samstag per `LIKE '2026-08-29%'` |
| P10 Analyse | Beispiel 8 im Sachzusammenhang beschreiben (Bons je Stand und Zahlart am Samstag) |
| Leere Gruppen | Info-Zelt und Kinderpunsch erscheinen in keiner Verbund-Auswertung |

## Randfall-Varianten

| Variante | Delta (IDs ab 9001, Helfer/Stand ab 901) | Entlarvte Fehlabfrage |
|---|---|---|
| `null` | Helfer 901, 902 mit Verein NULL, mit Kassenschicht und Bons an der Saftbar | „Bons von Helfern, die nicht im TuS sind“ mit `Verein != 'TuS Weserstedt'` (verliert NULL); `COUNT(Verein)` statt `COUNT(*)` |
| `gleichnamig` | Helfer 903 mit Vor- und Nachnamen des umsatzstärksten Kassierers, eigene Kassenschicht + Bons am Bierwagen | Umsatz je Kassierer `GROUP BY Helfer.Vorname, Helfer.Nachname` |
| `grenze` | Bon 9021 am Kaffeemobil genau `'2026-08-29 23:00'` (bar, Kassiererin 7, eine Position Kaffee mit Menge 0); Bon 9022 genau `'2026-08-28 18:00'` am Bierwagen | Fehlbetrag-Abfrage mit `BETWEEN '2026-08-29 22:00' AND '2026-08-29 23:00'` (→ 315,00 € statt 312,50 €) |
| `gleichstand` | zusätzliche Bons, sodass die Stände auf Rang 2 und 3 nach Umsatz genau gleich viel einnehmen (Betrag nach dem ersten Bau aus `basis.sql` festlegen) | „die umsatzstärksten Stände (bei Gleichstand alle)“ per `LIMIT 2` |
| `leer` | Stand 901 Bastelzelt (Spiel, Festwiese) mit Produkt 9001 Bastelset, aber ohne Bon; Helfer 904 mit Schicht, aber ohne Bon | `FROM Stand, Produkt` als Umsatzbasis; Musterlösungen müssen festhalten, dass Stände ohne Bon im impliziten Verbund nicht erscheinen |

```sql
-- Fehlabfrage (P2): Schicht in den Verbund genommen – Umsätze vervielfachen sich
SELECT Stand.Name, SUM(Position.Menge * Produkt.Preis) AS Umsatz
FROM Stand, Schicht, Bon, Position, Produkt
WHERE Stand.StandNr = Schicht.StandNr
  AND Stand.StandNr = Bon.StandNr
  AND Bon.BonNr = Position.BonNr
  AND Position.ProduktNr = Produkt.ProduktNr
GROUP BY Stand.StandNr, Stand.Name
```

## Beispielabfragen (Abi-Stil)

**1. Umsatz je Stand** – Ergebnis: Spalten StandNr, Name, Umsatz; 7 Zeilen (Info-Zelt fehlt), absteigend.

```sql
SELECT Stand.StandNr, Stand.Name, SUM(Position.Menge * Produkt.Preis) AS Umsatz
FROM Stand, Bon, Position, Produkt
WHERE Stand.StandNr = Bon.StandNr
  AND Bon.BonNr = Position.BonNr
  AND Position.ProduktNr = Produkt.ProduktNr
GROUP BY Stand.StandNr, Stand.Name
ORDER BY Umsatz DESC
```

**2a. Anzahl Bons in der verdächtigen Stunde** (COUNT) – Ergebnis: 52.

```sql
SELECT COUNT(*) AS Bons
FROM Bon
WHERE StandNr = 4
  AND Zeitpunkt BETWEEN '2026-08-29 22:00' AND '2026-08-29 22:59'
```

**2b. Positionen und verkaufte Artikel in derselben Stunde** (COUNT ↔ SUM) – Ergebnis: 125 Positionen, aber nur
20 Artikel.

```sql
SELECT COUNT(*) AS Positionen, SUM(Position.Menge) AS Artikel
FROM Bon, Position
WHERE Bon.BonNr = Position.BonNr
  AND Bon.StandNr = 4
  AND Bon.Zeitpunkt BETWEEN '2026-08-29 22:00' AND '2026-08-29 22:59'
```

**3. Auffällige Positionen** – Helfer mit mindestens drei Positionen der Menge 0. Ergebnis: genau Helferin 23 mit 110.

```sql
SELECT Helfer.HelferNr, Helfer.Vorname, Helfer.Nachname, COUNT(*) AS Nullpositionen
FROM Helfer, Bon, Position
WHERE Helfer.HelferNr = Bon.HelferNr
  AND Bon.BonNr = Position.BonNr
  AND Position.Menge = 0
GROUP BY Helfer.HelferNr, Helfer.Vorname, Helfer.Nachname
HAVING COUNT(*) >= 3
```

**4. Zahlarten in der verdächtigen Stunde** – Ergebnis: eine Zeile `bar | 52`. Mit dem Muster `'2026-08-29 21:%'`
bzw. `'2026-08-29 23:%'` liefert dieselbe Abfrage auf den Pflicht-Daten bar 7 / Karte 5 bzw. bar 6 / Karte 4.

```sql
SELECT Zahlart, COUNT(*) AS Bons
FROM Bon
WHERE StandNr = 4
  AND Zeitpunkt LIKE '2026-08-29 22:%'
GROUP BY Zahlart
```

**5. Der Fehlbetrag** (★★★, ohne Unterabfrage) – Summe der Listenpreise aller Positionen mit Menge 0 am Kaffeemobil
in der Stunde 22:00–22:59. Ergebnis: 312.5.

```sql
SELECT SUM(Produkt.Preis) AS Fehlbetrag
FROM Bon, Position, Produkt
WHERE Bon.BonNr = Position.BonNr
  AND Position.ProduktNr = Produkt.ProduktNr
  AND Bon.StandNr = 4
  AND Position.Menge = 0
  AND Bon.Zeitpunkt BETWEEN '2026-08-29 22:00' AND '2026-08-29 22:59'
```

**6. Wer war am Samstagabend am Kaffeemobil?** – Ergebnis: Vorname, Nachname, Verein, Beginn, Ende (auf den
Pflicht-Daten: Selin Aksoy 21–22, Nora Falter 22–23, Selin Aksoy 23–24).

```sql
SELECT Helfer.Vorname, Helfer.Nachname, Helfer.Verein, Schicht.Beginn, Schicht.Ende
FROM Helfer, Schicht, Stand
WHERE Helfer.HelferNr = Schicht.HelferNr
  AND Schicht.StandNr = Stand.StandNr
  AND Stand.Name = 'Kaffeemobil'
  AND Schicht.Beginn >= '2026-08-29 20:00'
ORDER BY Schicht.Beginn
```

**7. Die drei meistverkauften Produkte** (nach Stückzahl) – Ergebnis: 3 Zeilen ProduktNr, Bezeichnung, Verkauft.

```sql
SELECT Produkt.ProduktNr, Produkt.Bezeichnung, SUM(Position.Menge) AS Verkauft
FROM Produkt, Position
WHERE Produkt.ProduktNr = Position.ProduktNr
GROUP BY Produkt.ProduktNr, Produkt.Bezeichnung
ORDER BY Verkauft DESC
LIMIT 3
```

**8. Abfrage analysieren** – Erwartet: Liefert für jeden Stand, an dem am Samstag kassiert wurde, getrennt nach Bar- und
Kartenzahlung die Anzahl der Bons, alphabetisch nach Standname; Stände ohne Bon am Samstag (Info-Zelt) erscheinen
nicht; Bons nur mit Positionen der Menge 0 zählen mit.

```sql
SELECT Stand.Name, Bon.Zahlart, COUNT(*) AS Anzahl
FROM Stand, Bon
WHERE Stand.StandNr = Bon.StandNr
  AND Bon.Zeitpunkt LIKE '2026-08-29%'
GROUP BY Stand.StandNr, Stand.Name, Bon.Zahlart
ORDER BY Stand.Name
```

## Abnahme-Prüfungen (nach dem Generieren)

| Prüfung | Erwartung |
|---|---|
| Zeilen gesamt | 1 400–1 650; Helfer 60; Stand 8; Produkt 26 |
| Beispiel 5 | 312.5 |
| Beispiel 3 | genau HelferNr 23 mit 110 |
| `SELECT COUNT(*), MIN(HelferNr), MAX(HelferNr), MIN(Zahlart), MAX(Zahlart) FROM Bon WHERE StandNr = 4 AND Zeitpunkt >= '2026-08-29 22:00' AND Zeitpunkt < '2026-08-29 23:00'` | 52, 23, 23, bar, bar |
| Kaffeemobil hat Bons vor 22 Uhr und nach 23 Uhr am Samstag | je ≥ 8 |
| `SELECT COUNT(*) FROM Position WHERE ProduktNr = 26` · `SELECT COUNT(*) FROM Bon WHERE StandNr = 8` | 0 · 0 |
| Positionen mit Menge 0 außerhalb Helfer 23 | ≤ 2 je Helfer, insgesamt ≤ 6 |
| Bons auf voller Stunde (`Zeitpunkt LIKE '%:00'`) | 0 |
| Gleichnamige Helfer (`GROUP BY Vorname, Nachname HAVING COUNT(*) > 1`) | genau 1 Paar |
| `SELECT COUNT(*) FROM Helfer WHERE Jahrgang = 1988` | 1 (Nr. 23) |
| Beispiel 1 | 7 Zeilen, Umsätze paarweise verschieden |
| Jeder Bon liegt in einer Kassenschicht seines Kassierers am selben Stand | Werkzeug-Prüfung |
