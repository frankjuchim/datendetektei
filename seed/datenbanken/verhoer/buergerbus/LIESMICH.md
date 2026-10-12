# Bürgerbus – Verhör-Kontext V2 (Verhör 2, Akte 2)

## Zweck

Eigene kleine DB für **Verhör 2** (Transfer, nüchtern, Abitur-Stil; Spec 3.1, 7.9; `VERHOER_KONTEXTE.md` V2;
`docs/DS_PLANUNG.md` „Verhör-Blueprint: Verhör 2“, Aufgaben **A2-V-01 … 12**). Schwerpunkt Kurzschreibweise,
Fremdschlüssel, Verbund über 2–4 Tabellen, **zwei Fremdschlüssel auf dieselbe Tabelle** (Tabellenalias), IS NULL.

- **Name in der Plattform:** `verhoer/buergerbus` (Ordner `seed/datenbanken/verhoer/buergerbus/`, Modul
  `scripts/db/verhoer_buergerbus.js`). **Nie öffentlich**; geladen nur für die Prüfung im laufenden Verhör.
- **Datenquelle:** vollständig kuratiert, kein Generator: `basis.sql` = `schema.sql` + `pflicht.sql` (Fahrten mit einem
  kleinen Werkzeug im festen Wechsel von Fahrern, Bussen und Strecken erzeugt, Pflicht-Randfälle danach gesetzt).
- **Rahmensatz (Startkarte, STORY 6):** „Wer Räder verfolgen kann, kann auch Busse verfolgen – zeig es mir.“
  (DS_PLANUNG nennt als Variante „Ein Nachbarort bittet die Detektei, die Fahrtenliste seines Bürgerbusses
  auszuwerten.“ – die Inhalte wählen einen; STORY 6 ist die Quelle.)
- **Kontext (Aufgabentext):** Ehrenamtliche fahren den Bürgerbus der Gemeinde Brookdorf, der die Ortsteile Brookdorf,
  Heidkamp und Moorende mit dem Weserstedter Stadtteil Nordheide verbindet. Jede Fahrt wird mit Fahrerin/Fahrer, Bus,
  Start- und Zielhaltestelle, Datum, Abfahrtszeit und gezählter Fahrgastzahl erfasst; wird nicht gezählt, bleibt
  `Fahrgaeste` leer.

## Relationenschema (Kurzschreibweise)

- Haltestelle(<u>HaltID</u>, Name, Ortsteil)
- Fahrer(<u>FahrerNr</u>, Vorname, Nachname, Telefon)
- Bus(<u>Kennzeichen</u>, Sitzplaetze)
- Fahrt(<u>FahrtNr</u>, ↑FahrerNr, ↑Kennzeichen, ↑StartHalt, ↑ZielHalt, Datum, Abfahrt, Fahrgaeste)

`StartHalt` und `ZielHalt` verweisen beide auf `Haltestelle.HaltID` (abweichende Namen, P7); `Kennzeichen` ist ein
natürlicher Text-Schlüssel (`'BB-101'` … `'BB-104'`). Ortsteil `'Brookdorf'`, `'Heidkamp'`, `'Moorende'`,
`'Nordheide'`; Datum `'JJJJ-MM-TT'`, Abfahrt `'hh:mm'`; Telefon `'0000-…'`. `Fahrgaeste` NULL = nicht gezählt,
0 = gezählt, niemand mitgefahren. `Fahrt.Kennzeichen` ist im Schema NULL-fähig, in der Haupt-DB aber nie NULL (nur
Variante `null`).

## ER-Modell (Chen)

Entitätstypen Haltestelle, Fahrer, Bus, Fahrt; Beziehungstypen *faehrt* Fahrer (1) – Fahrt (n), *eingesetztIn*
Bus (1) – Fahrt (n), *startetAn* und *endetAn* je Haltestelle (1) – Fahrt (n) → vier Fremdschlüssel in `Fahrt`.

## Daten im Überblick

| HaltID | Name | Ortsteil |
|---|---|---|
| 1 / 2 / 3 | Kirchplatz / Alte Schmiede / Feuerwehrhaus | Brookdorf |
| 4 / 5 / 6 | Schule Heidkamp / Birkenweg / Dorfgemeinschaftshaus | Heidkamp |
| 7 / 8 / 9 | Mühle Moorende / Torfstich / Hofladen | Moorende |
| 10 / 11 / 12 | Bahnhof Nordheide / Gesundheitszentrum / Marktplatz Nordheide | Nordheide |

Fahrer 1 Gesa Bredehorn, 2 Hauke Rohlfs, 3 Ulf Meinecke, 4 Imke Tebbe, 5 Sönke Harjes, 6 Taalke Bödeker, 7 Hauke
Rohlfs, 8 Okke Thölken · Busse BB-101 (8), BB-102 (8), BB-103 (9), BB-104 (12) · 70 Fahrten Mo–Fr 2026-09-01 …
2026-10-09 (je Tag 2, mittwochs und freitags 3), FahrtNr chronologisch; 63 gezählt, zusammen 361 Fahrgäste.

## Pflicht-Randfälle (`pflicht.sql`)

| Randfall | Daten | Für |
|---|---|---|
| zwei FKs auf dieselbe Tabelle | alle Fahrten mit `StartHalt ≠ ZielHalt` (CHECK); Haltestellen-Namen eindeutig (UNIQUE) | A2-V-07, -11, -12 |
| NULL | 7 Fahrten ohne Zählung, 7 verschiedene Fahrer: 9 (1), 18 (2), 27 (3), 37 (5), 48 (8), 55 (7), 60 (4); Fahrt 16 mit 0 Fahrgästen | A2-V-10 (P5); `Fahrgaeste > 6` blendet NULL aus, `= 0` ist nicht „ohne Zählung“ |
| Gleichnamige | zwei Fahrer „Hauke Rohlfs“ (FahrerNr 2 und 7), beide auch mit BB-103/BB-104 | A2-V-08 (DISTINCT über Namen: 6 Zeilen, über Schlüssel: 7) |
| FahrerNr 4 | Imke Tebbe: Fahrten mit genau 6 (36), mehr als 6 (4, 12, 20, 44, 52), weniger und NULL (60) | A2-V-06 (`> 6`, P6) |
| Grenze Sitzplätze | BB-101 und BB-102 mit genau 8 Sitzplätzen; Fahrer 8 fuhr nur diese | A2-V-08 (`> 8` vs. `>= 8`) |
| Kreuzprodukt | 8 Fahrer × 4 Busse = 32 | A2-V-04 |
| Ortsteilwechsel | Nordheide → Nordheide: 2, 15, 22, 35, 42, 55, 62; Nordheide → anderer Ortsteil: 28 Fahrten; anderer Ortsteil → Nordheide: 32 Fahrten; übrige 3 Fahrten ohne Nordheide | A2-V-12 |
| Top 5 | Fahrgäste 12 (43, 61), 11 (15, 20), 10 (38); alle übrigen ≤ 9 – Platz 5 ≠ Platz 6; Fahrgäste nie mehr als Sitzplätze | A2-V-11 |

## Eingebaute Fallen

| Falle | Wo |
|---|---|
| P2 Verbund | `FROM Fahrt, Fahrer` ohne Bedingung → 560 Zeilen; drei Tabellen mit nur einer Verbundbedingung (A2-V-09) |
| P5 NULL | `Fahrgaeste = NULL` liefert nichts; `Fahrgaeste = 0` liefert Fahrt 16 statt der 7 nicht gezählten |
| P6 | `> 6` vs. `>= 6` (Fahrt 36), `> 8` vs. `>= 8` (Fahrer 8) |
| P7 | `StartHalt`/`ZielHalt` heißen anders als `HaltID`; ohne Alias ist `Haltestelle.Name` doppelt bzw. mehrdeutig |

## Randfall-Varianten

| Variante | Delta (IDs ab 9001 bzw. 901) | Entlarvte Fehlabfrage |
|---|---|---|
| `null` | 9001 nicht gezählte Fahrt (Fahrer 3, Mühle Moorende → Bahnhof Nordheide) mit **Kennzeichen NULL** (Ersatzfahrzeug nicht erfasst) | überflüssiger Verbund mit `Bus` bei A2-V-03/-10 (`Fahrt.Kennzeichen = Bus.Kennzeichen` verliert 9001); auf der Haupt-DB zufällig gleich |
| `gleichnamig` | 901 zweite Fahrerin „Imke Tebbe“ mit Fahrten 9011 (8 Fahrgäste, BB-103) und 9012 (4) | A2-V-06 über `Fahrer.Nachname = 'Tebbe'` statt `FahrerNr = 4` (liefert 9011 zusätzlich) |
| `grenze` | entfällt – genau 6 Fahrgäste (Fahrerin 4) und genau 8 Sitzplätze sind Pflicht-Datensätze der Haupt-DB | – |
| `gleichstand` | entfällt – A2-V-11 ist eine LIMIT-Aufgabe mit ausdrücklich gleichstandsfreier Schnittkante; eine Aufgabe „alle mit dem Höchstwert“ gibt es in V2 nicht | – |
| `leer` | entfällt – keine Gruppierung in V2; jede Haltestelle, jeder Fahrer und jeder Bus kommt in Fahrten vor, und Datensätze ohne Partner fallen im impliziten Verbund ohnehin korrekt weg | – |

Beide Varianten ändern die Tabellengrößen (Fahrer 9 bzw. Fahrt 71/72) – A2-V-04 ist eine `ergebnis`-Aufgabe mit
gegebenen Größen und läuft nicht auf Varianten. **Empfehlung `varianten` je Aufgabe:** A2-V-03, -07, -10:
`["null"]` · A2-V-06: `["gleichnamig"]` · A2-V-08, -11, -12: `["null", "gleichnamig"]` (Ergebnis bleibt fachlich
richtig; Fahrt 9001 hat keine Fahrgastzahl, 9011 liegt mit 8 unter Platz 5).

## Beispielabfragen (Abi-Stil)

**1. Fahrten mit Fahrer (A2-V-03)** – Ergebnis: 70 Zeilen.

```sql
SELECT Fahrt.Datum, Fahrt.Abfahrt, Fahrer.Nachname
FROM Fahrt, Fahrer
WHERE Fahrt.FahrerNr = Fahrer.FahrerNr
```

**2. Volle Busse (A2-V-06)** – Fahrten der Fahrerin mit der FahrerNr 4 mit mehr als 6 Fahrgästen. Ergebnis: 4, 12,
20, 44, 52.

```sql
SELECT Fahrt.FahrtNr, Fahrt.Datum, Fahrt.Fahrgaeste, Fahrer.Vorname, Fahrer.Nachname
FROM Fahrt, Fahrer
WHERE Fahrt.FahrerNr = Fahrer.FahrerNr
  AND Fahrer.FahrerNr = 4
  AND Fahrt.Fahrgaeste > 6
```

**3. Start und Ziel (A2-V-07)** – Ergebnis: 70 Zeilen.

```sql
SELECT Fahrt.FahrtNr, s1.Name AS Start, s2.Name AS Ziel
FROM Fahrt, Haltestelle s1, Haltestelle s2
WHERE Fahrt.StartHalt = s1.HaltID
  AND Fahrt.ZielHalt = s2.HaltID
```

**4. Große Busse (A2-V-08)** – Namen ohne Wiederholung. Ergebnis: 6 Zeilen (Hauke Rohlfs einmal, Okke Thölken fehlt).

```sql
SELECT DISTINCT Fahrer.Vorname, Fahrer.Nachname
FROM Fahrer, Fahrt, Bus
WHERE Fahrer.FahrerNr = Fahrt.FahrerNr
  AND Fahrt.Kennzeichen = Bus.Kennzeichen
  AND Bus.Sitzplaetze > 8
```

**5. Fehlende Zählung (A2-V-10)** – Ergebnis: 7 Zeilen (9, 18, 27, 37, 48, 55, 60), Fahrt 16 (0 Fahrgäste) nicht.

```sql
SELECT Fahrt.FahrtNr, Fahrt.Datum, Fahrer.Vorname, Fahrer.Nachname
FROM Fahrt, Fahrer
WHERE Fahrt.FahrerNr = Fahrer.FahrerNr
  AND Fahrt.Fahrgaeste IS NULL
```

**6. Spitzenfahrten (A2-V-11)** – die fünf Fahrten mit den meisten Fahrgästen. Ergebnis: 43, 61 (12), 15, 20 (11),
38 (10); Platz 6 hat 9.

```sql
SELECT Fahrt.FahrtNr, Fahrt.Fahrgaeste, s1.Name AS Start, s2.Name AS Ziel
FROM Fahrt, Haltestelle s1, Haltestelle s2
WHERE Fahrt.StartHalt = s1.HaltID
  AND Fahrt.ZielHalt = s2.HaltID
ORDER BY Fahrt.Fahrgaeste DESC
LIMIT 5
```

**7. Ortsteilwechsel (A2-V-12)** – Fahrten, die in Nordheide beginnen und in einem anderen Ortsteil enden. Ergebnis:
28 Zeilen (ohne die 7 Fahrten Nordheide → Nordheide).

```sql
SELECT Fahrt.FahrtNr, Fahrt.Datum, s1.Name AS Start, s2.Name AS Ziel, s2.Ortsteil
FROM Fahrt, Haltestelle s1, Haltestelle s2
WHERE Fahrt.StartHalt = s1.HaltID
  AND Fahrt.ZielHalt = s2.HaltID
  AND s1.Ortsteil = 'Nordheide'
  AND s2.Ortsteil != 'Nordheide'
```

**8. Fahrten eines Busses mit Fahrer und Start (Verbund über vier Tabellen)** – alle Fahrten mit dem Bus BB-104,
neueste zuerst. Ergebnis: 16 Zeilen.

```sql
SELECT Fahrt.Datum, Fahrt.Abfahrt, Fahrer.Nachname, Haltestelle.Name AS Start, Bus.Sitzplaetze
FROM Fahrt, Fahrer, Haltestelle, Bus
WHERE Fahrt.FahrerNr = Fahrer.FahrerNr
  AND Fahrt.StartHalt = Haltestelle.HaltID
  AND Fahrt.Kennzeichen = Bus.Kennzeichen
  AND Bus.Kennzeichen = 'BB-104'
ORDER BY Fahrt.Datum DESC
```

**9. Kreuzprodukt (A2-V-04)** – 8 × 4 = 32 Zeilen; bewusst ohne Verbundbedingung.

```sql
-- Fehlabfrage (P2): Kreuzprodukt ohne Verbundbedingung
SELECT *
FROM Fahrer, Bus
```

**10. Fehlerzeile (A2-V-09)** – drei Tabellen, aber nur eine Verbundbedingung: jede Fahrt wird mit allen 12
Haltestellen kombiniert.

```sql
-- Fehlabfrage (P2): Verbundbedingung für Haltestelle fehlt
SELECT Fahrt.Datum, Fahrer.Nachname, Haltestelle.Name
FROM Fahrt, Fahrer, Haltestelle
WHERE Fahrt.FahrerNr = Fahrer.FahrerNr
```

## Abnahme-Prüfungen

| Prüfung | Erwartung |
|---|---|
| Zeilen | Haltestelle 12, Fahrer 8, Bus 4, Fahrt 70 |
| `SELECT COUNT(*) FROM Fahrer, Bus` | 32 |
| Sitzplätze | 8, 8, 9, 12 |
| `StartHalt = ZielHalt` / `Kennzeichen IS NULL` | 0 / 0 |
| Haltestellen-Namen | 12 verschiedene |
| `Fahrgaeste IS NULL` | 7 Fahrten, 7 verschiedene Fahrer; `Fahrgaeste = 0` nur Fahrt 16 |
| Fahrgäste > Sitzplätze | 0 |
| Hauke Rohlfs | FahrerNr 2 und 7 |
| A2-V-08 | Schlüssel 1–7 (ohne 8), Namen 6 Zeilen; Fahrer 8 nur Busse mit 8 Sitzplätzen |
| Beispiel 2 | 4, 12, 20, 44, 52; Fahrerin 4 einmal genau 6, einmal NULL |
| Beispiel 6 | 15, 20, 38, 43, 61; Platz 5/6: 10 vs. 9 |
| A2-V-12 | Nordheide → Nordheide 2, 15, 22, 35, 42, 55, 62; Beispiel 7 28 Zeilen; anderer Ortsteil → Nordheide 32 |
| Zeitraum | 2026-09-01 … 2026-10-09; FahrtNr chronologisch |
