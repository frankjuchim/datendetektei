# Mensa-Vorbestellsystem – Verhör-Kontext V7 (Verhör 7 = Lab-Generalprobe, Generalprobe eA/gA, Akte 7)

## Zweck

Eigene kleine DB für **Verhör 7** (Lab-Generalprobe, 30', Abimodus `streng`; `docs/DS_PLANUNG.md` „Verhör-Blueprint:
Verhör 7“, Aufgaben **A7-V-01 … 15**) und Basis der **Generalprobe eA/gA** (Blueprints GP-eA-a … g, GP-gA-a … f) –
Abitur-Mix: Schlüssel, Anomalien an der zusammengelegten Tabelle `BestellUebersicht`, ER, SQL entwerfen und analysieren.

- **Name in der Plattform:** `verhoer/mensa` (Ordner `seed/datenbanken/verhoer/mensa/`, Modul
  `scripts/db/verhoer_mensa.js`). **Nie öffentlich**; geladen nur für die Prüfung im laufenden Verhör.
- **Datenquelle:** vollständig kuratiert, kein Generator: `basis.sql` = `schema.sql` + `pflicht.sql` (bestellte Portionen
  je Angebot fest vorgegeben, Aufteilung in Bestellungen mit Menge 1–3 und Zuordnung zu Personen mit einem kleinen
  Werkzeug erzeugt; Quoten je Person und Pflicht-Randfälle fest).
- **Rahmensatz (Startkarte, STORY 6):** „Letzte Probe vor der Lizenz: ein ganzer Fall, ohne mich.“ (DS_PLANUNG: „Zur
  Ermittlerprüfung wertet die Detektei das Vorbestellsystem einer Schulmensa aus.“)
- **Kontext (Aufgabentext):** Die Mensa einer Gesamtschule lässt Schülerinnen, Schüler und Beschäftigte Mittagessen
  online vorbestellen. Jedes Gericht kann an mehreren Tagen angeboten werden; eine Bestellung bezieht sich auf ein
  Tagesangebot, `Abgeholt` enthält die Uhrzeit der Ausgabe (`'hh:mm'`) und ist NULL, wenn das Essen nicht abgeholt
  wurde. Küchenkräfte bereiten die Tagesangebote zu. `Portionen` im Angebot sind die **geplanten** Portionen; die
  **bestellten** Portionen sind die Summe der Mengen der Bestellungen.

**Abweichungen von `VERHOER_KONTEXTE.md` (Zeitraum 2027-03-01 bis 2027-03-26):**
1. Fr **2027-03-26 ist Karfreitag** – an diesem Tag gibt es keine Angebote; der März endet mit Do 2027-03-25.
2. Zusätzlich eine **Februarwoche** (Mo 2027-02-22 … Fr 2027-02-26, je zwei Angebote), damit „im März 2027“ in GP-eA-f
   bzw. GP-gA-d ein echter Zeilenfilter ist (ohne WHERE kommt die Gemüselasagne mit 56 Portionen dazu, P1).
3. ER-Material: DS_PLANUNG nennt den Beziehungstyp zwischen Gericht und Angebot einmal *wirdAngeboten*
   (VERHOER_KONTEXTE) und einmal *bietetAn* (Generalprobe-Material) – für die Daten ohne Bedeutung, in den Aufgaben
   einheitlich zu wählen.

## Relationenschema (Kurzschreibweise)

- Person(<u>PersonNr</u>, Vorname, Nachname, Rolle, Klasse)
- Gericht(<u>GerichtNr</u>, Bezeichnung, Kategorie, Preis, Vegetarisch)
- Angebot(<u>AngebotNr</u>, ↑GerichtNr, Datum, Portionen)
- Bestellung(<u>BestellNr</u>, ↑PersonNr, ↑AngebotNr, Menge, Abgeholt)
- Kuechenkraft(<u>KraftNr</u>, Vorname, Nachname)
- bereitetZu(<u>↑KraftNr</u>, <u>↑AngebotNr</u>)
- BestellUebersicht(BestellNr, PersonNr, Name, Klasse, Datum, Gericht, Preis, Menge) – zusammengelegte Tabelle **ohne
  Schlüssel**

Rolle `'Schüler'`, `'Lehrkraft'`, `'Personal'` (Klasse nur bei Schülerinnen und Schülern, sonst NULL; CHECK) ·
Kategorie `'Hauptgericht'`, `'Suppe'`, `'Salat'`, `'Dessert'` · Vegetarisch `'ja'`/`'nein'` · Preis in Euro, **immer ein
Vielfaches von 0,25 €** (CHECK) – Summen sind exakt, Umsätze kippen nie durch Rundung · Menge 1–3 · Datum `'JJJJ-MM-TT'`,
Abgeholt `'hh:mm'` (11:40 … 13:39) oder NULL. Person 40 hat nie bestellt, Gericht 14 (Kürbissuppe) wurde nie angeboten.

## ER-Modell (Chen, Material der Generalprobe eA)

Person (n) — *bestellt* (Menge, Abgeholt) — (m) Angebot · Gericht (1) — *wirdAngeboten* — (n) Angebot · Küchenkraft (n)
— *bereitetZu* — (m) Angebot. *bestellt* wird zur Tabelle `Bestellung` mit eigenem Schlüssel `BestellNr`, weil dieselbe
Person dasselbe Angebot mehrfach bestellen darf (A7-V-01, GP-a). Erweiterungen (A7-V-14/-15, GP-eA-c/d): Gericht (n) —
*enthaelt* (Hinweis bzw. Mengenangabe) — (m) Allergen; Küchenkraft *vertritt* Küchenkraft (rekursiv) – nicht in den
Daten.

## Daten im Überblick

40 Personen (31 Schüler, 6 Lehrkräfte, 3 Personal), 14 Gerichte, 68 Angebote (10 im Februar, 58 im März), 319
Bestellungen (468 bestellte Portionen; Menge 1: 202, 2: 85, 3: 32), 5 Küchenkräfte, 112 Zeilen `bereitetZu`
(Hauptgerichte zwei Küchenkräfte, sonst eine), 16 Zeilen `BestellUebersicht`. BestellNr und AngebotNr chronologisch.

| GerichtNr | Bezeichnung | Kategorie | Preis | veg. | Angebote | Portionen gesamt | davon März | Umsatz 15.–19.03. |
|---|---|---|---|---|---|---|---|---|
| 1 | Spaghetti Bolognese | Hauptgericht | 4.50 | nein | 7 | 68 | **63** | **63.00** |
| 2 | Gemüselasagne | Hauptgericht | **4.00** | ja | 6 | 56 | **50** | 36.00 |
| 3 | Hähnchen-Curry mit Reis | Hauptgericht | 4.75 | nein | 5 | 51 | **51** | 47.50 |
| 4 | Käsespätzle | Hauptgericht | 3.75 | ja | 5 | 35 | 30 | **52.50** |
| 5 | Fischstäbchen mit Kartoffelpüree | Hauptgericht | 4.25 | nein | 6 | 48 | 44 | 38.25 |
| 6 | Chili sin Carne | Hauptgericht | 3.50 | ja | 5 | 30 | 26 | 24.50 |
| 7 | Currywurst mit Pommes | Hauptgericht | 3.75 | nein | 7 | 63 | **57** | **63.75** |
| 8 | Falafel-Teller | Hauptgericht | 4.50 | ja | 3 | 22 | 22 | 27.00 |
| 9 | Tomatensuppe | Suppe | 2.25 | ja | 6 | 21 | 18 | 4.50 |
| 10 | Linseneintopf mit Würstchen | Suppe | 2.75 | nein | 4 | 15 | 15 | 13.75 |
| 11 | Gemischter Salat | Salat | 2.50 | ja | 4 | 14 | 12 | 10.00 |
| 12 | Couscous-Salat mit Feta | Salat | 3.25 | ja | 4 | 18 | 16 | 13.00 |
| 13 | Schokopudding | Dessert | 1.25 | ja | 6 | 27 | 24 | 13.75 |
| 14 | Kürbissuppe | Suppe | 2.50 | ja | 0 | – | – | – |

Stichtag **Mo 2027-03-15** (Angebote 41–44): Spaghetti Bolognese, Käsespätzle (veg.), Linseneintopf mit Würstchen,
Schokopudding (veg.). Woche 2027-03-15 … 19: Mo 1, 4, 10, 13 · Di 3, 6, 9 · Mi 7, 2, 11 · Do 5, 8, 13 · Fr 7, 4, 12.

| Person | Name | Rolle/Klasse | Bestellungen | Portionen | nicht abgeholt | Besonderheit |
|---|---|---|---|---|---|---|
| 3 | Pia Pundt | 9a | **14** | 19 | 0 | Vielbesteller |
| 17 | Ida Eggers | 8b | **12** | 17 | 0 | Vielbesteller |
| 25 | Insa Akgül | 10b | **11** | 18 | 2 | Vielbesteller; `COUNT(Abgeholt)` nur 9 |
| 9 | Hilke Akgül | 9a | **10** | 16 | 2 | genau 10 (Grenze `> 10`) |
| 12 | Hanna Dirksen | 7a | 9 | 13 | 0 | `SUM(Menge) > 10`, aber nur 9 Bestellungen |
| 30 | Ole Lindemann | 10b | 8 | 12 | **5** | GP-g Platz 1 |
| 7 | Pia Fehrmann | 5c | 8 | 13 | **4** | GP-g Platz 2 |
| 19 | Joris Wiechmann | 8b | 8 | 11 | **3** | GP-g Platz 3 |
| 6 | Arne Demir | 5c | 8 | 12 | 0 | Mehrfachbestellung (204, 209: Angebot 45 zweimal) |
| 14 | Insa Gerdts | 10b | 8 | 11 | 0 | Klasse in `BestellUebersicht` einmal falsch (10c) |
| 21 | Clara Fehrmann | 6b | 6 | – | – | Namensvorlage der Variante `gleichnamig` |
| 40 | Wiebke Thölken | Personal | 0 | 0 | 0 | nie bestellt |

Alle übrigen Personen: 7–8 Bestellungen, höchstens 2 nicht abgeholt. Nicht abgeholt insgesamt 31 (9,7 %).

## Pflicht-Randfälle (`pflicht.sql`)

| Randfall | Daten | Für |
|---|---|---|
| Mehrfachbestellung | Person 6 bestellt Angebot 45 (Curry am 2027-03-16) zweimal: BestellNr 204 und 209 | A7-V-01, GP-a (P8: (PersonNr, AngebotNr) nicht eindeutig) |
| Löschanomalie | `BestellUebersicht`: Tomatensuppe nur in Zeile 217 – mit ihr verschwinden Bezeichnung und Preis | A7-V-02, GP-b |
| Änderungsanomalie | `BestellUebersicht`: Chili sin Carne in Zeile 216 mit 3.25 statt 3.50; Insa Gerdts (14) in Zeile 206 mit 10b, in Zeile 214 mit 10c | A7-V-11, GP-b |
| Grenzpreis | Gemüselasagne (2) vegetarisch mit genau 4.00 | A7-V-03 (`< 4`: 7 Gerichte, mit `<= 4` 8) (P6) |
| Stichtag | 2027-03-15 vier Angebote, davon zwei vegetarisch (Schokopudding 1.25, Käsespätzle 3.75) | A7-V-04, GP-e |
| NULL | 31 Bestellungen (9,7 %) mit `Abgeholt` NULL; Person 19 genau drei | A7-V-07, GP-g (P5: `= NULL` liefert nichts) |
| COUNT ↔ SUM | Mengen 1–3: 319 Bestellungen, 468 Portionen | A7-V-08, GP-f (P4) |
| HAVING-Grenze | im März Gemüselasagne genau 50 Portionen, Hähnchen-Curry 51 (davon 11 am 2027-03-01) | GP-f (`> 50`; `>= 50` und `Datum > '2027-03-01'` falsch) |
| Vielbesteller | genau drei Personen mit mehr als 10 Bestellungen (3: 14, 17: 12, 25: 11), Person 9 mit genau 10 | A7-V-09 (P1, P6) |
| Top 3 der Woche | Umsätze 2027-03-15 … 19: 63.75 (7), 63.00 (1), 52.50 (4), Platz 4: 47.50 (3) | A7-V-13 |
| LIMIT 3 (Analyse) | nicht abgeholt je Person: 5 (30), 4 (7), 3 (19), Platz 4: 2 – auch nur im März gezählt | GP-g |

## Eingebaute Fallen

| Falle | Wo | Ergebnis statt richtig |
|---|---|---|
| P1 WHERE ↔ HAVING | `WHERE COUNT(*) > 10` (Beispiel 12); GP-f ohne WHERE | Fehler; Gemüselasagne (56) zusätzlich |
| P2 Verbund | A7-V-13 ohne `Angebot.AngebotNr = Bestellung.AngebotNr` | Kreuzprodukt, absurde Umsätze |
| P3 GROUP-BY-Regel | nach Namen bzw. Bezeichnung statt Schlüssel gruppiert | nur in Variante `gleichnamig` sichtbar |
| P4 COUNT ↔ SUM | A7-V-09 mit `SUM(Menge) > 10`; A7-V-13 mit `SUM(Gericht.Preis)` | 31 Personen; Top 3 7, 3, 1 |
| P5 NULL | `Abgeholt = NULL` (Beispiel 13); `COUNT(Abgeholt) > 10` | leer; Person 25 fehlt |
| P6 Grenzen | `Preis <= 4`; `>= 50`; `>= 10`; Wochengrenzen `< '2027-03-19'` bzw. `> '2027-03-15'` | jeweils andere Ergebnisse |
| P7 falsche Spalte | `SUM(Angebot.Portionen)` statt `SUM(Bestellung.Menge)` | geplante statt bestellte Portionen |

## Randfall-Varianten

| Variante | Delta (IDs ab 9001 bzw. 9021) | Entlarvte Fehlabfrage |
|---|---|---|
| `null` | entfällt – die NULL-Randfälle (Abgeholt NULL bei 31 Bestellungen, Klasse NULL bei Beschäftigten, Person 25 mit nicht abgeholten Bestellungen) liegen schon in der Haupt-DB; `Preis` und `Menge` sind nie NULL | – |
| `gleichnamig` | zweite „Clara Fehrmann“ (9001, 9c) mit 5 Bestellungen (drei im Februar, zwei auf Angebot 9011); zweites Gericht „Fischstäbchen mit Kartoffelpüree“ (9011, 4.25) am 2027-03-18 (Angebot 9011, 4 Portionen) | A7-V-09 nach `Vorname, Nachname` gruppiert („Clara Fehrmann“ mit 11), A7-V-08 und A7-V-13 nach `Bezeichnung` gruppiert (Fischstäbchen mit 55.25 auf Platz 3) (P3); die richtigen Ergebnisse von A7-V-09, A7-V-13 und GP-f bleiben gleich |
| `grenze` | Angebot 9021 Mi 2027-03-31 (Fischstäbchen, 8 Portionen) und 9022 Mo 2027-04-12 (Gemüselasagne, 3 Portionen) | GP-f mit Monatsende am letzten Datentag (`<= '2027-03-25'`) bzw. ohne Obergrenze (`>= '2027-03-01'`: Gemüselasagne mit 53); richtig: Spaghetti 63, Currywurst 57, Fischstäbchen 52, Curry 51 |
| `gleichstand` | entfällt – A7-V-13 und GP-g sind LIMIT-Aufgaben mit ausdrücklich gleichstandsfreier Schnittkante | – |
| `leer` | entfällt – Gericht ohne Angebot (Kürbissuppe) und Person ohne Bestellung (40) liegen in der Haupt-DB | – |

**Empfehlung `varianten` je Aufgabe:** A7-V-03, -04, -07: `[]` (Haupt-DB genügt) · A7-V-08: `["gleichnamig"]` ·
A7-V-09: `["gleichnamig", "grenze"]` · A7-V-13: `["gleichnamig", "grenze"]` · GP-eA-e/GP-gA-c: `[]` ·
GP-eA-f/GP-gA-d: `["gleichnamig", "grenze"]`.

## Beispielabfragen (Abi-Stil)

**1. Vegetarisch unter 4 € (A7-V-03)** – Ergebnis: 7 Zeilen (Käsespätzle 3.75, Chili sin Carne 3.5, Tomatensuppe 2.25,
Gemischter Salat 2.5, Couscous-Salat mit Feta 3.25, Schokopudding 1.25, Kürbissuppe 2.5); Gemüselasagne (genau 4.00)
nicht.

```sql
SELECT Bezeichnung, Preis
FROM Gericht
WHERE Vegetarisch = 'ja'
  AND Preis < 4
```

**2. Tagesangebot (A7-V-04)** – Ergebnis: Spaghetti Bolognese, Käsespätzle, Linseneintopf mit Würstchen, Schokopudding.

```sql
SELECT Gericht.Bezeichnung
FROM Gericht, Angebot
WHERE Gericht.GerichtNr = Angebot.GerichtNr
  AND Angebot.Datum = '2027-03-15'
```

**3. Vegetarisch am Stichtag (GP-eA-e, GP-gA-c)** – Ergebnis: Schokopudding 1.25, Käsespätzle 3.75.

```sql
SELECT Gericht.Bezeichnung, Gericht.Preis
FROM Gericht, Angebot
WHERE Gericht.GerichtNr = Angebot.GerichtNr
  AND Angebot.Datum = '2027-03-15'
  AND Gericht.Vegetarisch = 'ja'
ORDER BY Gericht.Preis
```

**4. Nicht abgeholt (A7-V-07)** – Ergebnis: 31 Zeilen, z. B. Clara Pundt, 2027-02-22, Gemüselasagne.

```sql
SELECT Person.Vorname, Person.Nachname, Angebot.Datum, Gericht.Bezeichnung
FROM Person, Bestellung, Angebot, Gericht
WHERE Person.PersonNr = Bestellung.PersonNr
  AND Bestellung.AngebotNr = Angebot.AngebotNr
  AND Angebot.GerichtNr = Gericht.GerichtNr
  AND Bestellung.Abgeholt IS NULL
```

**5. Portionen je Gericht (A7-V-08)** – Ergebnis: 13 Zeilen (Kürbissuppe nie angeboten), z. B. 1 Spaghetti Bolognese
68, 7 Currywurst mit Pommes 63, 2 Gemüselasagne 56.

```sql
SELECT Gericht.GerichtNr, Gericht.Bezeichnung, SUM(Bestellung.Menge) AS Portionen
FROM Gericht, Angebot, Bestellung
WHERE Gericht.GerichtNr = Angebot.GerichtNr
  AND Angebot.AngebotNr = Bestellung.AngebotNr
GROUP BY Gericht.GerichtNr, Gericht.Bezeichnung
```

**6. Vielbesteller (A7-V-09)** – Ergebnis: 3 Pia Pundt 14, 17 Ida Eggers 12, 25 Insa Akgül 11 (Hilke Akgül mit genau 10
nicht).

```sql
SELECT Person.PersonNr, Person.Vorname, Person.Nachname, COUNT(*) AS Bestellungen
FROM Person, Bestellung
WHERE Person.PersonNr = Bestellung.PersonNr
GROUP BY Person.PersonNr, Person.Vorname, Person.Nachname
HAVING COUNT(*) > 10
```

**7. Top 3 der Woche (A7-V-13)** – Ergebnis: 7 Currywurst mit Pommes 63.75, 1 Spaghetti Bolognese 63.0, 4 Käsespätzle
52.5 (Platz 4: Hähnchen-Curry 47.5).

```sql
SELECT Gericht.GerichtNr, Gericht.Bezeichnung, SUM(Bestellung.Menge * Gericht.Preis) AS Umsatz
FROM Gericht, Angebot, Bestellung
WHERE Gericht.GerichtNr = Angebot.GerichtNr
  AND Angebot.AngebotNr = Bestellung.AngebotNr
  AND Angebot.Datum BETWEEN '2027-03-15' AND '2027-03-19'
GROUP BY Gericht.GerichtNr, Gericht.Bezeichnung
ORDER BY Umsatz DESC
LIMIT 3
```

**8. Portionen im März (GP-eA-f, GP-gA-d)** – Ergebnis: 1 Spaghetti Bolognese 63, 7 Currywurst mit Pommes 57, 3
Hähnchen-Curry mit Reis 51; Gemüselasagne (genau 50) nicht.

```sql
SELECT Gericht.GerichtNr, Gericht.Bezeichnung, SUM(Bestellung.Menge) AS Portionen
FROM Gericht, Angebot, Bestellung
WHERE Gericht.GerichtNr = Angebot.GerichtNr
  AND Angebot.AngebotNr = Bestellung.AngebotNr
  AND Angebot.Datum BETWEEN '2027-03-01' AND '2027-03-31'
GROUP BY Gericht.GerichtNr, Gericht.Bezeichnung
HAVING SUM(Bestellung.Menge) > 50
ORDER BY Portionen DESC
```

**9. Analyse (GP-eA-g, GP-gA-e)** – „Analysieren Sie die gegebene SQL-Abfrage im Sachzusammenhang.“ Erwartet: die drei
Personen (Nummer und Name) mit den meisten nicht abgeholten Bestellungen und deren Anzahl, absteigend. Ergebnis: 30 Ole
Lindemann 5, 7 Pia Fehrmann 4, 19 Joris Wiechmann 3 (Platz 4: 2). Der Verbund mit `Angebot` ändert das Ergebnis nicht.

```sql
SELECT Person.PersonNr, Person.Vorname, Person.Nachname, COUNT(*) AS NichtAbgeholt
FROM Person, Bestellung, Angebot
WHERE Person.PersonNr = Bestellung.PersonNr
  AND Bestellung.AngebotNr = Angebot.AngebotNr
  AND Bestellung.Abgeholt IS NULL
GROUP BY Person.PersonNr, Person.Vorname, Person.Nachname
ORDER BY COUNT(*) DESC
LIMIT 3
```

**10. Mehr als 30 Portionen (A7-V-06, richtige Antwort)** – Ergebnis: 1 (68), 2 (56), 3 (51), 4 (35), 5 (48), 7 (63);
Chili sin Carne mit genau 30 nicht.

```sql
SELECT Gericht.GerichtNr, Gericht.Bezeichnung, SUM(Bestellung.Menge) AS Portionen
FROM Gericht, Angebot, Bestellung
WHERE Gericht.GerichtNr = Angebot.GerichtNr
  AND Angebot.AngebotNr = Bestellung.AngebotNr
GROUP BY Gericht.GerichtNr, Gericht.Bezeichnung
HAVING SUM(Bestellung.Menge) > 30
```

**11. Kardinalität aus den Daten (A7-V-12)** – jedes Angebot gehört zu genau einem Gericht, ein Gericht hat bis zu 7
Angebote (Kürbissuppe keines): Gericht (1) – Angebot (n). Ergebnis: 13 Zeilen.

```sql
SELECT Gericht.GerichtNr, Gericht.Bezeichnung, COUNT(*) AS Angebote
FROM Gericht, Angebot
WHERE Gericht.GerichtNr = Angebot.GerichtNr
GROUP BY Gericht.GerichtNr, Gericht.Bezeichnung
```

**12. Aggregat in WHERE (A7-V-09)**

```sql
-- Fehlabfrage (P1): Bedingung über Gruppen gehört in HAVING
SELECT Person.PersonNr, Person.Vorname, Person.Nachname
FROM Person, Bestellung
WHERE Person.PersonNr = Bestellung.PersonNr
  AND COUNT(*) > 10
GROUP BY Person.PersonNr, Person.Vorname, Person.Nachname
```

**13. Vergleich mit NULL (A7-V-07)**

```sql
-- Fehlabfrage (P5): Vergleich mit NULL ist nie wahr – richtig ist IS NULL
SELECT Bestellung.BestellNr, Bestellung.PersonNr
FROM Bestellung
WHERE Bestellung.Abgeholt = NULL
```

Nur am Ergebnis erkennbar (stehen in `test/db_verhoer.test.js`): `Preis <= 4`, `HAVING COUNT(Abgeholt) > 10`,
`SUM(Menge) > 10`, `SUM(Gericht.Preis)` bzw. `COUNT(*)` als Umsatz, Wochengrenzen ohne den 15. bzw. 19., GP-f ohne WHERE,
mit `>= 50` bzw. `Datum > '2027-03-01'`, `SUM(Angebot.Portionen)`; nach Namen bzw. Bezeichnung gruppiert (Variante
`gleichnamig`); Monatsende falsch gesetzt (Variante `grenze`).

## BestellUebersicht (zusammengelegte Tabelle, A7-V-02/-11, GP-b)

Alle 16 Bestellungen vom 2027-03-16 (Reihenfolge = BestellNr = rowid), zusammengelegt aus Person, Bestellung, Angebot
und Gericht – ohne Schlüssel. Redundant: Name/Klasse je Person, Datum, Bezeichnung und Preis je Gericht.

| BestellNr | PersonNr | Name | Klasse | Gericht | Preis | Menge | Besonderheit |
|---|---|---|---|---|---|---|---|
| 202–211 | … | … | … | Hähnchen-Curry mit Reis | 4.75 | 1 | 10 Zeilen, Preis 10-mal gespeichert |
| 204, 209 | 6 | Arne Demir | 5c | Hähnchen-Curry mit Reis | 4.75 | 1 | Mehrfachbestellung |
| 206 | 14 | Insa Gerdts | 10b | Hähnchen-Curry mit Reis | 4.75 | 1 | richtige Klasse |
| 207 | 36 | Dana Eggers | NULL | Hähnchen-Curry mit Reis | 4.75 | 1 | Lehrkraft |
| 212–216 | … | … | … | Chili sin Carne | 3.50 | 2, 2, 1, 1, 1 | |
| 214 | 14 | Insa Gerdts | **10c** | Chili sin Carne | 3.50 | 1 | **Änderungsanomalie** (Klasse) |
| 216 | 17 | Ida Eggers | 8b | Chili sin Carne | **3.25** | 1 | **Änderungsanomalie** (Preis) |
| 217 | 33 | Ida Bultjer | NULL | Tomatensuppe | 2.25 | 2 | **Löschanomalie** (einzige Tomatensuppe) |

Einfügeanomalie (GP-b): ein neues Gericht ohne Bestellung lässt sich nicht eintragen (z. B. Kürbissuppe).

## Abnahme-Prüfungen

| Prüfung | Erwartung |
|---|---|
| Zeilen | Person 40, Gericht 14, Angebot 68, Bestellung 319, Kuechenkraft 5, bereitetZu 112, BestellUebersicht 16 |
| Angebote März / Stichtag | 58 / 4 |
| Wochenenden, Karfreitag | keine Angebote |
| Klasse | genau bei Rolle Schüler gesetzt |
| Portionen | geplante ≥ bestellte je Angebot |
| Mehrfachbestellung | (6, 45) zweimal |
| Grenzpreis / Beispiel 1 | Gemüselasagne / 4, 6, 9, 11, 12, 13, 14 |
| Beispiel 2 / Beispiel 3 | 1, 4, 10, 13 / Schokopudding 1.25, Käsespätzle 3.75 |
| Nicht abgeholt | 31; je Person 5, 4, 3, 2, …; Beispiel 9: 30, 7, 19 |
| Mengen | 1–3; 319 Bestellungen, 468 Portionen |
| Beispiel 5 | 68, 56, 51, 35, 48, 30, 63, 22, 21, 15, 14, 18, 27 |
| Beispiel 6 / genau 10 | 3, 17, 25 / 9 |
| Beispiel 7 / Umsätze Platz 1–4 | 7, 1, 4 / 63.75, 63, 52.5, 47.5 |
| Beispiel 8 / Grenze | 1 (63), 7 (57), 3 (51) / Gemüselasagne 50, Curry 51 (11 am 2027-03-01) |
| BestellUebersicht | Tomatensuppe einmal; Klasse 10b/10c; Chili 3.25/3.50 |
| Anteil nicht abgeholt | 8–12 % (ist 9,7 %) |
| BestellNr | chronologisch |
