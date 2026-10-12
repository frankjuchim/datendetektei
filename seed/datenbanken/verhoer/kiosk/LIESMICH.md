# Schulkiosk – Verhör-Kontext V3 (Verhör 3, Akte 3)

## Zweck

Eigene kleine DB für **Verhör 3** (Transfer, nüchtern, Abitur-Stil; Spec 3.1, 7.9; `VERHOER_KONTEXTE.md` V3;
`docs/DS_PLANUNG.md` „Verhör-Blueprint: Verhör 3“, Aufgaben **A3-V-01 … 12**). Schwerpunkt Aggregatfunktionen,
GROUP-BY-Regel, HAVING vs. WHERE, LIMIT, Abfrage im Sachzusammenhang analysieren, Vorgehen in Worten.

- **Name in der Plattform:** `verhoer/kiosk` (Ordner `seed/datenbanken/verhoer/kiosk/`, Modul
  `scripts/db/verhoer_kiosk.js`). **Nie öffentlich**; geladen nur für die Prüfung im laufenden Verhör.
- **Datenquelle:** vollständig kuratiert, kein Generator: `basis.sql` = `schema.sql` + `pflicht.sql` (Verkäufe und
  Posten mit einem kleinen Werkzeug erzeugt, Pflicht-Randfälle danach gesetzt).
- **Rahmensatz (Startkarte, STORY 6):** „Kassen lügen nicht, aber Abfragen manchmal – beweis mir, dass deine es nicht
  tun.“ (DS_PLANUNG: „Die Kiosk-AG einer Gesamtschule bittet um eine Auswertung ihrer Verkaufsdaten.“)
- **Kontext (Aufgabentext):** Die Kiosk-AG einer Gesamtschule verkauft in den beiden großen Pausen Brötchen, Getränke,
  Snacks und Obst. In jeder Pause kassieren zwei Helferinnen bzw. Helfer der AG (je eine Schicht); jeder Verkauf gehört
  zu einer Schicht und besteht aus Posten (Produkt und Anzahl); bezahlt wird bar oder mit der aufladbaren Schülerkarte.

**Abweichung von `VERHOER_KONTEXTE.md` (dort ohne `Schicht`, `Verkauf` mit `↑HelferNr`):** Der Verhör-Blueprint in
`docs/DS_PLANUNG.md` (A3-V-11: „Helfer, Schicht, Verkauf, Posten, Produkt“) und STORY 6 („Verkaufsschichten“) sehen
die Tabelle `Schicht` vor; nach der Rangfolge Spec > DS_PLANUNG > STORY > übrige gilt das Schema mit `Schicht`
(`VERHOER_KONTEXTE.md` ist angepasst).

## Relationenschema (Kurzschreibweise)

- Produkt(<u>ProduktNr</u>, Bezeichnung, Kategorie, Preis)
- Helfer(<u>HelferNr</u>, Vorname, Nachname, Klasse)
- Schicht(<u>SchichtNr</u>, ↑HelferNr, Datum, Pause)
- Verkauf(<u>VerkaufNr</u>, ↑SchichtNr, Zeitpunkt, Zahlart)
- Posten(<u>↑VerkaufNr, ↑ProduktNr</u>, Anzahl)

Kategorie `'Brötchen'`, `'Getränk'`, `'Snack'`, `'Obst'` · Zahlart `'bar'`, `'Karte'` · Pause `1`/`2` (1. bzw. 2. große
Pause, ab 09:30 bzw. 11:15) · Datum `'JJJJ-MM-TT'`, Zeitpunkt `'JJJJ-MM-TT hh:mm'` · Preis in Euro, **immer ein
Vielfaches von 0,25 €** (CHECK) – Summen und Durchschnitte sind exakt, Grenzen wie `> 50` oder `> 1.50` kippen nie durch
Rundung. `Preis` ist NULL-fähig („noch nicht festgelegt“), in der Haupt-DB aber nie NULL (nur Variante `null`).
`Bezeichnung` ist **nicht** eindeutig (Variante `gleichnamig`).

## ER-Modell (Chen)

Entitätstypen Produkt, Helfer, Schicht, Verkauf; Beziehungstypen *kassiert* Helfer (1) – Schicht (n), *gehoertZu*
Schicht (1) – Verkauf (n), *enthaelt* Verkauf (m) – Produkt (n) mit Attribut Anzahl → Beziehungstabelle `Posten`
(Substantiv-Name mit eigener fachlicher Bedeutung, wie `Position` im Stadtfest).

## Daten im Überblick

Schulwoche Mo 2026-09-21 … Fr 2026-09-25; 20 Schichten (je Tag und Pause zwei, jede Helferin/jeder Helfer genau
zwei), 120 Verkäufe (76 bar, 44 Karte), 214 Posten, Gesamtumsatz 424,50 €. VerkaufNr chronologisch.

| ProduktNr | Bezeichnung | Kategorie | Preis | Posten | Stück | Umsatz |
|---|---|---|---|---|---|---|
| 1 | Käsebrötchen | Brötchen | 1.50 | 23 | 38 | 57.00 |
| 2 | Salamibrötchen | Brötchen | 1.75 | 26 | 51 | **89.25** |
| 3 | Laugenbrezel | Brötchen | 1.25 | 31 | 61 | **76.25** |
| 4 | Vollkornbrötchen mit Ei | Brötchen | 2.00 | 11 | 16 | 32.00 |
| 5 | Wasser 0,5 l | Getränk | 0.75 | 15 | 20 | 15.00 |
| 6 | Apfelschorle 0,5 l | Getränk | 1.25 | 0 | – | – |
| 7 | Kakao 0,25 l | Getränk | 1.00 | 16 | 21 | 21.00 |
| 8 | Eistee 0,5 l | Getränk | 1.25 | 24 | 32 | 40.00 |
| 9 | Müsliriegel | Snack | 1.00 | 17 | 17 | 17.00 |
| 10 | Muffin | Snack | 1.50 | 11 | 13 | 19.50 |
| 11 | Pizzaschnecke | Snack | 2.00 | 17 | 19 | 38.00 |
| 12 | Apfel | Obst | 0.50 | 11 | 13 | 6.50 |
| 13 | Banane | Obst | 0.50 | 8 | 12 | 6.00 |
| 14 | Obstbecher | Obst | 1.75 | 4 | 4 | 7.00 |

| HelferNr | Name | Klasse | Schichten | Verkäufe | Umsatz |
|---|---|---|---|---|---|
| 1 | Jule Kahrs | 8b | Mo 1, Fr 2 | 10 | 32.50 |
| 2 | Jule Kahrs | 10a | Mi 1, Fr 2 | 10 | 23.00 |
| 3 | Mats Glander | 9c | Mo 1, Mi 2 | 16 | **75.25** |
| 4 | Lale Demir | 10a | Mo 2, Do 2 | 12 | **50.00** |
| 5 | Rune Hinners | 8b | Mo 2, Do 1 | 10 | 36.25 |
| 6 | Svea Lienemann | 9a | Di 1, Do 1 | 10 | 32.00 |
| 7 | Jarne Bohlken | 10b | Di 1, Mi 2 | 16 | 42.50 |
| 8 | Nika Petrović | 9c | Di 2, Do 2 | 10 | 37.50 |
| 9 | Tjark Siemers | 8a | Di 2, Fr 1 | 10 | 34.25 |
| 10 | Ella Hemmen | 10b | Mi 1, Fr 1 | 16 | **61.25** |

## Pflicht-Randfälle (`pflicht.sql`)

| Randfall | Daten | Für |
|---|---|---|
| COUNT ↔ SUM | 91 Brötchen-Posten mit Anzahl 1–4, zusammen 166 Stück (Anzahl Verkäufe ≠ Stückzahl) | A3-V-02, -06 (P4) |
| Gleichnamige | zwei Helferinnen „Jule Kahrs“ (1: 8b, 32,50 €; 2: 10a, 23,00 €) – je unter 50 €, zusammen 55,50 € | A3-V-11 (P3: nach Namen gruppiert erscheint „Jule Kahrs“ fälschlich mit 55,50 €) |
| Gleichstand Kategorien | Brötchen und Getränk je 4 Produkte, Snack und Obst je 3 | A3-V-05 (keine LIMIT-Frage darauf) |
| Produkt ohne Verkauf | „Apfelschorle 0,5 l“ (6) nie verkauft | A3-V-06 (fehlt im Verbund), Cold Case |
| Grenze HAVING | Snack-Durchschnittspreis genau 1.50 (1.00, 1.50, 2.00); Helferin 4 mit Umsatz genau 50.00 | A3-V-07 (`> 1.50`: nur Brötchen 1.625), A3-V-11 (`> 50`: nur 3 und 10) (P6) |
| Top 3 | Umsätze 89,25 (2) > 76,25 (3) > 57,00 (1) > 40,00 (8) | A3-V-08 |
| Vervielfachung | Fr 2. Pause genau zwei Kartenzahlungen (112, 119), in 112 ein Obstbecher; Obstbecher in der ganzen Woche 4 Stück | A3-V-10 (P2): die gegebene Fehlabfrage (Beispiel 11) liefert 14,00 € statt 1,75 € – „acht Obstbecher in einer Pause“ wirkt nicht sofort absurd |

## Eingebaute Fallen

| Falle | Wo |
|---|---|
| P1 WHERE ↔ HAVING | `WHERE Preis > 1.50 … GROUP BY Kategorie` liefert Brötchen, Obst, Snack statt nur Brötchen; `WHERE AVG(…)` ist ein Fehler |
| P2 Vervielfachung | Verbund ohne `Posten.VerkaufNr = Verkauf.VerkaufNr` (Beispiel 11) |
| P3 GROUP-BY-Regel | nach `Vorname, Nachname` statt `HelferNr` gruppiert (Jule Kahrs); `Bezeichnung` ohne `ProduktNr` (Variante) |
| P4 COUNT ↔ SUM | Brötchen: 91 Posten, 166 Stück; `COUNT(Preis)` statt `COUNT(*)` (Variante `null`) |
| P6 | `> 1.50` vs. `>= 1.50` (Snack), `> 50` vs. `>= 50` (Helferin 4) |
| Leere Gruppe | Apfelschorle erscheint in keiner Verbund-Auswertung |

## Randfall-Varianten

| Variante | Delta (IDs ab 9001 bzw. 901) | Entlarvte Fehlabfrage |
|---|---|---|
| `null` | 9001 „Gemüse-Wrap“ (Snack, Preis NULL, nie verkauft) | A3-V-05 mit `COUNT(Preis)` statt `COUNT(*)` (Snack 3 statt 4); `AVG(Preis)` bleibt (A3-V-07 unverändert), `SUM(Preis) / COUNT(*)` wäre falsch |
| `gleichnamig` | 9011 zweite „Laugenbrezel“ (Brötchen, 1.25) mit Verkauf 9011 (2 Stück, bar) in Schicht 901 (Helferin 6, Do 2. Pause) | A3-V-06 gruppiert nach `Bezeichnung` statt nach `ProduktNr` (P3); Top 3 (A3-V-08), Helfer über 50 € (A3-V-11) und die Kartenzahlungen am Freitag (A3-V-10) bleiben gleich |
| `grenze` | entfällt – Snack-Durchschnitt genau 1.50 und Helferin 4 mit genau 50.00 sind Pflicht-Datensätze der Haupt-DB; Beträge sind exakt (Vielfache von 0,25 €) | – |
| `gleichstand` | entfällt – A3-V-08 ist eine LIMIT-Aufgabe mit ausdrücklich gleichstandsfreier Schnittkante; der Gleichstand Brötchen/Getränk (A3-V-05) liegt schon in der Haupt-DB | – |
| `leer` | entfällt – das Produkt ohne Verkauf (Apfelschorle) ist Pflicht in der Haupt-DB; Helfer ohne Schicht gibt es nicht, weil jede Schicht genau einer Person gehört | – |

**Empfehlung `varianten` je Aufgabe:** A3-V-01, -07: `["null"]` · A3-V-05: `["null", "gleichnamig"]` · A3-V-06:
`["gleichnamig"]` · A3-V-08, -11: `["null", "gleichnamig"]` (Ergebnis unverändert, schützt vor Abfragen, die nur
zufällig passen).

## Beispielabfragen (Abi-Stil)

**1. Kennzahlen (A3-V-01)** – Ergebnis: 120, `'2026-09-21 09:31'`.

```sql
SELECT COUNT(*) AS Verkaeufe, MIN(Zeitpunkt) AS ErsterVerkauf
FROM Verkauf
```

**2. Brötchen zählen (A3-V-02, richtige Antwort)** – Stückzahl, nicht Anzahl der Posten. Ergebnis: 166 (COUNT(*)
wäre 91).

```sql
SELECT SUM(Posten.Anzahl) AS Stueck
FROM Posten, Produkt
WHERE Posten.ProduktNr = Produkt.ProduktNr
  AND Produkt.Kategorie = 'Brötchen'
```

**3. Sortiment (A3-V-05)** – Ergebnis: Brötchen 4, Getränk 4, Obst 3, Snack 3.

```sql
SELECT Kategorie, COUNT(*) AS Anzahl
FROM Produkt
GROUP BY Kategorie
```

**4. Stückzahlen (A3-V-06)** – je Produkt (Nummer, Bezeichnung) die verkaufte Stückzahl. Ergebnis: 13 Zeilen (ohne
Apfelschorle).

```sql
SELECT Produkt.ProduktNr, Produkt.Bezeichnung, SUM(Posten.Anzahl) AS Stueck
FROM Produkt, Posten
WHERE Produkt.ProduktNr = Posten.ProduktNr
GROUP BY Produkt.ProduktNr, Produkt.Bezeichnung
```

**5. Teure Kategorien (A3-V-07)** – Durchschnittspreis über 1.50 €. Ergebnis: nur Brötchen (1.625); Snack genau 1.50.

```sql
SELECT Kategorie, AVG(Preis) AS Durchschnittspreis
FROM Produkt
GROUP BY Kategorie
HAVING AVG(Preis) > 1.50
```

**6. Bestseller (A3-V-08)** – drei Produkte mit dem höchsten Umsatz. Ergebnis: 2 (89.25), 3 (76.25), 1 (57.0); Platz
4 hat 40.0.

```sql
SELECT Produkt.ProduktNr, Produkt.Bezeichnung, SUM(Posten.Anzahl * Produkt.Preis) AS Umsatz
FROM Produkt, Posten
WHERE Produkt.ProduktNr = Posten.ProduktNr
GROUP BY Produkt.ProduktNr, Produkt.Bezeichnung
ORDER BY Umsatz DESC
LIMIT 3
```

**7. Umsatz je Helfer (A3-V-11)** – nur Helfer mit mehr als 50 € Umsatz. Ergebnis: 3 Mats Glander (75.25), 10 Ella
Hemmen (61.25); Lale Demir (genau 50.0) und die beiden Jule Kahrs nicht.

```sql
SELECT Helfer.HelferNr, Helfer.Vorname, Helfer.Nachname, SUM(Posten.Anzahl * Produkt.Preis) AS Umsatz
FROM Helfer, Schicht, Verkauf, Posten, Produkt
WHERE Helfer.HelferNr = Schicht.HelferNr
  AND Schicht.SchichtNr = Verkauf.SchichtNr
  AND Verkauf.VerkaufNr = Posten.VerkaufNr
  AND Posten.ProduktNr = Produkt.ProduktNr
GROUP BY Helfer.HelferNr, Helfer.Vorname, Helfer.Nachname
HAVING SUM(Posten.Anzahl * Produkt.Preis) > 50
```

**8. Analyse (A3-V-09)** – „Analysieren Sie die gegebene SQL-Abfrage und beschreiben Sie, welche Informationen sie im
Sachzusammenhang liefert.“ Erwartet: für jede große Pause der Woche (Datum und Pause) die Anzahl der Verkäufe, die mit
der Schülerkarte bezahlt wurden – nur Pausen mit mindestens fünf Kartenzahlungen, die meisten zuerst. Ergebnis: 6
Zeilen.

```sql
SELECT Schicht.Datum, Schicht.Pause, COUNT(*) AS Kartenzahlungen
FROM Schicht, Verkauf
WHERE Schicht.SchichtNr = Verkauf.SchichtNr
  AND Verkauf.Zahlart = 'Karte'
GROUP BY Schicht.Datum, Schicht.Pause
HAVING COUNT(*) >= 5
ORDER BY Kartenzahlungen DESC
```

**9. Kartenumsatz mit Obstbechern, richtig (Auflösung zu A3-V-10)** – Ergebnis: 1.75.

```sql
SELECT SUM(Posten.Anzahl * Produkt.Preis) AS Umsatz
FROM Verkauf, Posten, Produkt
WHERE Posten.VerkaufNr = Verkauf.VerkaufNr
  AND Posten.ProduktNr = Produkt.ProduktNr
  AND Produkt.Bezeichnung = 'Obstbecher'
  AND Verkauf.Zahlart = 'Karte'
  AND Verkauf.Zeitpunkt >= '2026-09-25 11:00'
```

**10. Vorgehen (A3-V-12, Beispiel)** – „Welche Kategorien brachten an Kartenzahlungen mehr als 30 € ein? Absteigend
nach Umsatz.“ Tabellen → Verbund → Zeilenfilter → Gruppierung → Gruppenfilter → Sortierung. Ergebnis: Brötchen
(105.75), Snack (37.5).

```sql
SELECT Produkt.Kategorie, SUM(Posten.Anzahl * Produkt.Preis) AS Umsatz
FROM Verkauf, Posten, Produkt
WHERE Verkauf.VerkaufNr = Posten.VerkaufNr
  AND Posten.ProduktNr = Produkt.ProduktNr
  AND Verkauf.Zahlart = 'Karte'
GROUP BY Produkt.Kategorie
HAVING SUM(Posten.Anzahl * Produkt.Preis) > 30
ORDER BY Umsatz DESC
```

**11. Zu hohe Summe (A3-V-10)** – „Kartenumsatz mit Obstbechern am Freitag in der 2. großen Pause“. Die Bedingung
`Posten.VerkaufNr = Verkauf.VerkaufNr` fehlt: jeder Obstbecher-Posten der Woche (4 × 1,75 €) wird mit jeder der zwei
passenden Kartenzahlungen kombiniert → 14,00 € statt 1,75 €.

```sql
-- Fehlabfrage (P2): Verbundbedingung Posten.VerkaufNr = Verkauf.VerkaufNr fehlt
SELECT SUM(Posten.Anzahl * Produkt.Preis) AS Umsatz
FROM Verkauf, Posten, Produkt
WHERE Posten.ProduktNr = Produkt.ProduktNr
  AND Produkt.Bezeichnung = 'Obstbecher'
  AND Verkauf.Zahlart = 'Karte'
  AND Verkauf.Zeitpunkt >= '2026-09-25 11:00'
```

**12. Aggregat in WHERE (A3-V-03/-07)**

```sql
-- Fehlabfrage (P1): Bedingung über Gruppen gehört in HAVING
SELECT Kategorie
FROM Produkt
WHERE AVG(Preis) > 1.50
GROUP BY Kategorie
```

Nur am Ergebnis erkennbar (stehen deshalb nicht als Codeblock hier, sondern in `test/db_verhoer.test.js`): nach
`Helfer.Vorname, Helfer.Nachname` gruppiert (Jule Kahrs mit 55,50 € über 50 €, P3); nach `Produkt.Bezeichnung` gruppiert
(Variante `gleichnamig`); `COUNT(Preis)` statt `COUNT(*)` (Variante `null`).

## Abnahme-Prüfungen

| Prüfung | Erwartung |
|---|---|
| Zeilen | Produkt 14, Helfer 10, Schicht 20, Verkauf 120, Posten 214 |
| Beispiel 1 | 120, `'2026-09-21 09:31'` |
| Preise | alle gesetzt, Vielfache von 0,25 € |
| Verkauf ohne Posten / Zeitpunkt ≠ Datum der Schicht | 0 / 0 |
| Schichten je Helfer | genau 2 |
| Brötchen-Posten / Stück / größte Anzahl | 91 / 166 / 4 |
| Jule Kahrs | HelferNr 1 (8b) und 2 (10a) |
| Beispiel 3 | Brötchen 4, Getränk 4, Obst 3, Snack 3 |
| Produkt ohne Posten | nur 6 (Apfelschorle) |
| Snack-Durchschnitt / Beispiel 5 / mit WHERE | 1.5 / Brötchen / Brötchen, Obst, Snack |
| Beispiel 6 | 2, 3, 1; Umsätze Platz 1–4: 89.25, 76.25, 57, 40 |
| Umsatz je Helfer | 32.5, 23, 75.25, 50, 36.25, 32, 42.5, 37.5, 34.25, 61.25 |
| Beispiel 7 / nach Namen gruppiert | 3, 10 / zusätzlich „Jule Kahrs“ mit 55.5 |
| Kartenzahlungen Fr 2. Pause | 112, 119; Obstbecher in der Woche 4 Stück |
| Beispiel 9 / Beispiel 11 | 1.75 / 14 |
| Gesamtumsatz | 350–500 € (ist 424,50 €) |
| VerkaufNr | chronologisch |
