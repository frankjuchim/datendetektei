# StadtRad – Akte 2 „Spur der Räder“ (auch Akte 6)

## Zweck und Story

Verbund-DB (DS 3–4): Fremdschlüssel, Kurzschreibweise, impliziter Verbund über 2–4 Tabellen, **zwei Fremdschlüssel auf
dieselbe Tabelle** (`StartStation`/`ZielStation` → `Station`), Tabellenaliase, laufende Ausleihen mit `Ende IS NULL`.
Story (STORY.md 4.2, Anhang A): Bent Hollwedel, Betriebsleiter von StadtRad Weserstedt, vermisst fünf **Lastenräder**.
In den Nächten **2026-09-08 bis 2026-09-12** (jeweils zwischen 01:00 und 02:00 Uhr) wird an der Station **Hafenkante**
je ein Lastenrad über das Kundenkonto **77 „Nora Falter“** (Jahrgang 1988, Hafenviertel, Tarif Plus) ausgeliehen und
nie zurückgegeben: `Ende`, `ZielStation`, `DauerMin`, `Preis` sind NULL, die Räder 41–45 stehen auf `'vermisst'`
(StationID NULL). StadtRad prüft bei der Anmeldung keinen Ausweis – der Name ist falsch, Jahrgang und Stadtteil wirken
echt. Beweisstück: *Schloss-Code*. In Akte 6 liefert StadtRad die Quasi-Identifikatoren (Jahrgang, Stadtteil, Tarif)
für den pseudonymen `RadExport` der DB Datenspuren; Kundin 64 **Tamara Leversen** (1988, Hafenviertel, aber Tarif
Basis) ist dort die unbeteiligte Doppelgängerin. Ein Kundenkonto „Merle Falkenrath“ gibt es nicht.

Die Ausleihdaten stammen aus der **SQL-Werkstatt** der Lehrkraft (`quelle_sql-werkstatt.sql`, eigenes Werk) – Namen,
Räder und Stationen unverändert, Stadtteile auf die Story abgebildet und alle Zeitangaben um 16 Wochen verschoben
(Wiedererkennung für Kurse, die die Werkstatt kennen).

## Relationenschema (Kurzschreibweise)

- Station(<u>StationID</u>, Name, Stadtteil, Stellplaetze)
- Rad(<u>RadID</u>, Typ, Baujahr, ↑StationID, Status)
- Kunde(<u>KundenID</u>, Vorname, Nachname, Jahrgang, Tarif, Stadtteil)
- Ausleihe(<u>AusleihID</u>, ↑RadID, ↑KundenID, ↑StartStation, ↑ZielStation, Start, Ende, DauerMin, Preis)
- Reparatur(<u>ReparaturID</u>, ↑RadID, Datum, Grund, Kosten)

Fremdschlüssel: `Rad.StationID` → `Station.StationID` (NULL = nicht an einer Station); `Ausleihe.RadID` → `Rad`;
`Ausleihe.KundenID` → `Kunde`; `Ausleihe.StartStation` und `Ausleihe.ZielStation` → `Station.StationID` (P7: anderer
Name als der Primärschlüssel); `Reparatur.RadID` → `Rad`.

## ER-Modell (Chen)

- **Entitätstypen:** `Station` (<u>StationID</u>, Name, Stadtteil, Stellplaetze), `Rad` (<u>RadID</u>, Typ, Baujahr,
  Status), `Kunde` (<u>KundenID</u>, Vorname, Nachname, Jahrgang, Tarif, Stadtteil), `Reparatur` (<u>ReparaturID</u>,
  Datum, Grund, Kosten).
- **Beziehungstypen:**
  - *stehtAn* zwischen Rad (n) und Station (1) – ein Rad steht an höchstens einer Station (aktuell; NULL möglich).
  - *erhaelt* zwischen Rad (1) und Reparatur (n).
  - *Ausleihe* als Beziehung zwischen Kunde, Rad und Station ist fachlich ein eigener **Entitätstyp** `Ausleihe`
    (<u>AusleihID</u>, Start, Ende, DauerMin, Preis), weil dasselbe Paar Kunde–Rad mehrfach vorkommt. Beziehungstypen:
    *leiht* Kunde (1) – Ausleihe (n), *betrifft* Rad (1) – Ausleihe (n), **zwei Beziehungen** zu Station:
    *beginntAn* Station (1) – Ausleihe (n) und *endetAn* Station (1) – Ausleihe (n) (Rollen Start/Ziel; vgl. Heim/Gast).
- Didaktischer Hinweis (DS 11): Alternative Modellierung als n:m-Beziehung *leiht* zwischen Kunde und Rad mit
  Beziehungsattributen geht nur mit zusätzlichem Schlüsselattribut (AusleihID), weil Paare mehrfach vorkommen.

## Übernahme aus der SQL-Werkstatt

**Abbildung alt → neu** (`uebernahme.sql` wird daraus erzeugt, nie von Hand geändert):

| SQL-Werkstatt (snake_case) | Datendetektei | Änderung |
|---|---|---|
| `stationen(station_id, name, stadtteil, stellplaetze)` | `Station(StationID, Name, Stadtteil, Stellplaetze)` | Stadtteile umbenannt (unten); Station 11 `'Südpark'` heißt `'Heidepark'`; neue Station 13 Hafenkante (Pflicht) |
| `raeder(rad_id, typ, baujahr, station_id, status)` | `Rad(RadID, Typ, Baujahr, StationID, Status)` | neuer Statuswert `'vermisst'`; Räder mit Status `'ausgeliehen'` bekommen `StationID = NULL` (Rad ist unterwegs), die frühere Station wird Startstation ihrer laufenden Ausleihe |
| `kunden(kunden_id, vorname, nachname, jahrgang, tarif, stadtteil)` | `Kunde(KundenID, Vorname, Nachname, Jahrgang, Tarif, Stadtteil)` | Stadtteile umbenannt |
| `ausleihen(ausleih_id, rad_id, kunden_id, start_station_id, ziel_station_id, start_zeit, ende_zeit, dauer_min, preis)` | `Ausleihe(AusleihID, RadID, KundenID, StartStation, ZielStation, Start, Ende, DauerMin, Preis)` | **`ZielStation`, `Ende`, `DauerMin`, `Preis` jetzt NULL-fähig** (laufende/nie beendete Ausleihen); FK-Namen ohne `_id`; Zeiten **+112 Tage** |
| `werkstatt(reparatur_id, rad_id, datum, grund, kosten)` | `Reparatur(ReparaturID, RadID, Datum, Grund, Kosten)` | Tabelle heißt nach dem Entitätstyp (Singular), nicht nach dem Ort; Datum +112 Tage |

**Stadtteile** (Story-Bibel 2.1): `Bahnhof` → `Bahnhofsviertel`, `Hafen` → `Hafenviertel`, `Altstadt` bleibt,
`Univiertel` → `Lindenhof`, `Weststadt` → `Mühlenfeld`, `Südpark` → `Nordheide`. Weserufer und Deichkamp haben keine
Station; dort wohnen nur vom Generator erzeugte Kundinnen und Kunden.

**Zeitverschiebung:** Werkstatt-Zeitraum 2026-05-01 … 2026-05-31 + 112 Tage (16 Wochen, gleiche Wochentage) =
**2026-08-21 … 2026-09-20**. Damit decken die Werkstatt-Daten den ganzen Story-Zeitraum ab (Stadtfest 28./29.08.,
Nachtfahrten 08.–12.09.). Alle Werkstatt-Fahrten starten zwischen 07:00 und 21:59 Uhr.

Das Werkzeug `uebernahme.sql` ← `quelle_sql-werkstatt.sql` ist ein kurzes Python-Skript (sqlite3, nur Standardbibliothek);
es wird in Phase 1 als `scripts/stadtrad_uebernahme.py` ins Repository übernommen.
| `ausleihen_roh(…)` | – | **entfällt** (Begründung unten) |

**Warum `ausleihen_roh` entfällt:** (1) Akte 2 übt den Verbund; eine Rohtabelle im Schema-Browser lenkt ab und lädt zu
Abfragen ohne Verbund ein. (2) Redundanz und Anomalien behandelt Akte 4 nach dem **TuS-Prinzip**: eigene DB mit
Rohliste *und* normalisierter Fassung, hinterlegten funktionalen Abhängigkeiten und gezielt eingebauten Anomalien – das
leistet `ausleihen_roh` nicht. (3) Ihre Daten widersprechen den Haupttabellen (z. B. „Ben Bruhns“ mit Tarif Schule und
Jahrgang 2008 statt Plus/2000) – in einer Ermittlungsgeschichte wären das falsche Spuren ohne Auflösung. Die Tabelle
bleibt in `quelle_sql-werkstatt.sql` erhalten und kann als Cold Case in Akte 4 („Wie gut ist diese Tabelle?“) dienen.
Ihre „Lena Cordes, 1987“ lebt als gleichnamige Kundin 52 weiter.

## Datenumfang und Verteilung (Generator)

Zeitraum gesamt **2026-08-21 bis 2026-09-20**, Datenstand **2026-09-20 ≈ 20:00**. Die Werkstatt-Daten (verschoben)
decken den ganzen Zeitraum ab; der Generator ergänzt Fahrten der neuen Kundinnen und Kunden, Fahrten an der
Hafenkante, die laufenden Ausleihen, Kunden und Reparaturen.

| Tabelle | Bestand nach Übernahme + Pflicht | Generator ergänzt | Ziel |
|---|---|---|---|
| Station | 13 | – | 13 |
| Rad | 45 (40 Werkstatt + 41–45) | – | 45 |
| Kunde | 28 (1–25, 52, 64, 77) | 52 Kunden → IDs 26–80 lückenlos | 80 |
| Ausleihe | 302 (Werkstatt) + 8 Pflicht (303–310) | 150 reguläre Fahrten (311–460) + 9 laufende Ausleihen (461–469) | 469 |
| Reparatur | 24 (Werkstatt) | 12 im Zeitraum (IDs 25–36) | 36 |

- **Kunden 26–80:** Jahrgang 1950–2012 (Schwerpunkt 1975–2005); Tarif `Schule` nur für Jahrgang ≥ 2007 (dann immer),
  sonst Basis 60 % / Plus 40 %; Stadtteile gleichverteilt über alle acht Stadtteile; **Jahrgang 1988 + Hafenviertel ist
  reserviert** (nur 64, 77); keine weiteren Gleichnamigen (einziges Paar: Lena Cordes 3/52); reservierte Nachnamen aus
  `namen.json` nie; genau **2 Kunden ohne jede Ausleihe** (Neuanmeldungen vom 2026-09-19/20).
- **Reguläre Fahrten (150):** im ganzen Zeitraum, 3–7 pro Tag, überwiegend von Kunden 26–80 (jede bzw. jeder mit
  mindestens einer Fahrt, außer den zwei Neuanmeldungen); Start **nur zwischen 06:00 und 23:30** (damit die fünf
  Nachtfahrten die einzigen Starts zwischen 00:00 und 05:59 sind); DauerMin 5–90, rechtsschief (Median ≈ 18);
  ZielStation ≠ StartStation in ≈ 95 % der Fälle; `Ende = Start + DauerMin`; Preis nach Werkstatt-Formel: Citybike
  1,00 € + 0,08 €/min, E-Bike 1,50 € + 0,12 €/min, Lastenrad 2,00 € + 0,12 €/min (Tarif ohne Einfluss).
  Station 13 Hafenkante als Start oder Ziel in **10–15** dieser Fahrten (tagsüber). Kunde 77 und 64 erhalten **keine**
  weiteren Fahrten (nur Pflicht). Räder 41–45 werden nie regulär verwendet; Räder mit Status `'Werkstatt'` (10, 15, 16,
  25, 39) nach dem 2026-09-15 nicht mehr.
- **Laufende Ausleihen (9):** je eine für jedes Rad mit Status `'ausgeliehen'` (1, 5, 9, 18, 20, 23, 29, 32, 35),
  Start am **2026-09-20 zwischen 15:00 und 19:00**, StartStation = frühere Station laut Kommentar in `uebernahme.sql`
  (1→4, 5→1, 9→9, 18→8, 20→11, 23→11, 29→3, 32→6, 35→9), `ZielStation`, `Ende`, `DauerMin`, `Preis` NULL;
  Kunden zufällig (nicht 64/77). Reguläre Fahrten am 20.09. starten vor 15:00.
- **Reparaturen 25–36:** Datum im Zeitraum; je eine für die Werkstatt-Räder 10, 15, 16, 25, 39 (Datum 16.–20.09.),
  sieben weitere zufällig aus Rad 1–40; Grund aus `Schaltung`, `Inspektion`, `Licht defekt`, `Sattel ersetzt`,
  `Platter Reifen`, `Bremse defekt`, `Rahmen verbogen`, bei E-Bikes zusätzlich `Akku getauscht`; Kosten 10–150 €.
- **Kopplung an Datenspuren:** `RadExport` = alle Ausleihen (Token je Kunde); für ≈ 30 % der Kundinnen und Kunden
  erzeugt der Generator ein WeserApp-Gerät, das bei jeder ihrer Ausleihen zum Startzeitpunkt an der Startstation
  eincheckt (siehe `datenspuren/LIESMICH.md`).

## Pflicht-Datensätze (`pflicht.sql`)

| Datensatz | Werte | Zweck |
|---|---|---|
| Station 13 | Hafenkante, Hafenviertel, 8 Stellplätze | Tatort |
| Rad 41–45 | Lastenrad, Baujahr 2026, StationID NULL, `'vermisst'` | verschwundene Räder |
| Kunde **77** | Nora Falter, 1988, Plus, Hafenviertel | **Tarnkonto des Phantoms** |
| Ausleihe 303–307 | Kunde 77, Rad 41/42/43/44/45, Start Hafenkante, Start 2026-09-08 01:14 / 09-09 01:32 / 09-10 01:05 / 09-11 01:48 / 09-12 01:21; Ziel, Ende, Dauer, Preis NULL | **Nachtfahrten** |
| Kunde 64 + Ausleihe 308–310 | Tamara Leversen, 1988, Basis, Hafenviertel; Tagfahrten 08-26 08:12 (Alte Werft → Marktplatz), 09-03 17:40 (Fischmarkt → Hafenkante), 09-10 07:55 (Hafenkante → Bahnhof Nord) | unbeteiligte Doppelgängerin (gleicher Jahrgang und Stadtteil, anderer Tarif) |
| Kunde 52 | Lena Cordes, 1987, Basis, Altstadt | gleichnamig mit Kundin 3 (Lena Cordes, 2009) |

## Eingebaute Fallen

| Falle | Wo in den Daten |
|---|---|
| P2 Verbund fehlt/vervielfacht | `FROM Ausleihe, Station` ohne Bedingung → 469 × 13 Zeilen; Verbund `Ausleihe`–`Station` über die falsche Spalte (`StationID` gibt es in Ausleihe nicht – Fehlermeldung als Lernanlass) |
| P5 NULL | `Ende IS NULL` (14 Zeilen) vs. `Ende = NULL`; Verbund über `ZielStation` verliert alle laufenden Ausleihen; `Rad.StationID IS NULL` (Werkstatt, unterwegs, vermisst); Datum-vs-Zeitpunkt: `Start <= '2026-09-20'` verliert alle Fahrten vom 20.09. |
| P7 Benennung | zwei FKs auf `Station` → Tabelle zweimal mit Alias (`Station s1, Station s2`); FK-Namen ≠ PK-Name; mehrdeutige Spalte `Stadtteil` (Kunde und Station), `StationID` (Rad und Station) ohne Präfix |
| P3 GROUP-BY-Regel / Gleichnamige | Lena Cordes (3 und 52): Gruppieren nach Namen verschmilzt zwei Kundinnen |
| P4 COUNT ↔ SUM | `COUNT(*)` Fahrten vs. `SUM(DauerMin)`; `COUNT(Ende)` zählt laufende Ausleihen nicht mit |
| P6 Bedingungslogik | Nachtfenster per LIKE (`'% 01:%'`) oder je Nacht ein BETWEEN (OR-Gruppe in Klammern!); `Typ = 'Lastenrad' AND Ende IS NULL OR …` ohne Klammern |

## Randfall-Varianten

| Variante | Delta (IDs ab 9001; Station/Rad/Kunde ab 901) | Entlarvte Fehlabfrage |
|---|---|---|
| `null` | Ausleihe 9001: Kunde 9, Rad 2, Ende gesetzt, **ZielStation NULL** (frei abgestellt); Rad 901 Citybike `'frei'` mit StationID NULL (GPS-Ausfall) | „Anzahl abgeschlossener Fahrten von Kunde 9“ über Verbund mit Zielstation (verliert 9001); `ZielStation = NULL`; „freie Räder je Station“ ohne Gedanken an NULL |
| `gleichnamig` | Kunde 901 **Hanna Immig**, 1990, Basis, Bahnhofsviertel (wie Vielfahrerin 9) + 6 Fahrten 9011–9016 | `GROUP BY Kunde.Vorname, Kunde.Nachname` → beide Hanna Immig verschmelzen (P3) |
| `grenze` | 9021 Start 2026-09-20 00:00 (Mitternacht); 9022 Start 2026-08-31 23:55, Ende 2026-09-01 00:10; 9023 DauerMin genau 60; 9024 Preis genau 5.00 | `Start BETWEEN '2026-09-01' AND '2026-09-20'` (Datum gegen Zeitpunkt), `DauerMin > 60` für „mindestens eine Stunde“, „im September beendet“ über `Start` |
| `gleichstand` | so viele zusätzliche Fahrten (9031 ff.) ab der viertstärksten Startstation, dass Rang 3 und 4 gleichauf liegen (Anzahl wird nach dem ersten Bau aus `basis.sql` bestimmt und fest eingetragen) | „die drei Stationen mit den meisten Starts (bei Gleichstand alle)“ per `LIMIT 3` |
| `leer` | Station 901 **Deichtor** (Deichkamp, 10 Stellplätze) ohne Räder und Ausleihen; Kunde 902 ohne Ausleihe | `FROM Station, Rad` ohne Verbund (Deichtor erscheint mit Zahlen); Musterlösungen müssen festhalten, dass leere Gruppen im impliziten Verbund nicht erscheinen |

```sql
-- Fehlabfrage (Variante gleichnamig): nach Namen statt nach Schlüssel gruppiert
SELECT Kunde.Vorname, Kunde.Nachname, COUNT(*) AS Fahrten
FROM Kunde, Ausleihe
WHERE Kunde.KundenID = Ausleihe.KundenID
GROUP BY Kunde.Vorname, Kunde.Nachname
```

## Beispielabfragen (Abi-Stil)

**1. Nie beendete Ausleihen** – Nummer, Start, Name der Kundin/des Kunden und Name der Startstation aller Ausleihen
ohne Ende, chronologisch. Ergebnis: 5 Spalten; auf Übernahme + Pflicht die 5 Nachtfahrten von Nora Falter, in der
vollständigen DB zusätzlich 9 laufende Ausleihen vom 20.09.

```sql
SELECT Ausleihe.AusleihID, Ausleihe.Start, Kunde.Vorname, Kunde.Nachname, Station.Name AS Startstation
FROM Ausleihe, Kunde, Station
WHERE Ausleihe.KundenID = Kunde.KundenID
  AND Ausleihe.StartStation = Station.StationID
  AND Ausleihe.Ende IS NULL
ORDER BY Ausleihe.Start
```

**2. Von wo nach wo?** (zwei FKs auf dieselbe Tabelle) – alle Fahrten von Kundin 64 mit Start- und Zielstation.
Ergebnis: 3 Zeilen (Alte Werft → Marktplatz, Fischmarkt → Hafenkante, Hafenkante → Bahnhof Nord).

```sql
SELECT a.AusleihID, a.Start, s1.Name AS Von, s2.Name AS Nach
FROM Ausleihe a, Station s1, Station s2
WHERE a.StartStation = s1.StationID
  AND a.ZielStation = s2.StationID
  AND a.KundenID = 64
ORDER BY a.Start
```

**3. Räder ohne Station** – Ergebnis: 19 Räder (5 Werkstatt, 9 ausgeliehen, 5 vermisst).

```sql
SELECT RadID, Typ, Status
FROM Rad
WHERE StationID IS NULL
ORDER BY Status, RadID
```

**4. Vielfahrer** – Kundinnen und Kunden mit mindestens 15 Fahrten, mit Anzahl und Gesamtbetrag, nach Schlüssel
gruppiert. Ergebnis: Spalten KundenID, Vorname, Nachname, Fahrten, Umsatz (auf Übernahme + Pflicht 6 Zeilen).

```sql
SELECT Kunde.KundenID, Kunde.Vorname, Kunde.Nachname, COUNT(*) AS Fahrten, SUM(Ausleihe.Preis) AS Umsatz
FROM Kunde, Ausleihe
WHERE Kunde.KundenID = Ausleihe.KundenID
GROUP BY Kunde.KundenID, Kunde.Vorname, Kunde.Nachname
HAVING COUNT(*) >= 15
ORDER BY Fahrten DESC
```

**5. Nachtfahrten** – Ausleihen, die zwischen 01:00 und 03:59 Uhr begonnen haben, mit Radtyp und Name der
Startstation. Ergebnis: genau die 5 Fahrten mit den Lastenrädern 41–45, alle ab Hafenkante.

```sql
SELECT Ausleihe.AusleihID, Ausleihe.RadID, Rad.Typ, Station.Name, Ausleihe.Start
FROM Ausleihe, Rad, Station
WHERE Ausleihe.RadID = Rad.RadID
  AND Ausleihe.StartStation = Station.StationID
  AND (Ausleihe.Start LIKE '% 01:%' OR Ausleihe.Start LIKE '% 02:%' OR Ausleihe.Start LIKE '% 03:%')
ORDER BY Ausleihe.Start
```

**6. Reparaturkosten je Radtyp** – Anzahl Reparaturen, Summe und Durchschnitt der Kosten je Typ.

```sql
SELECT Rad.Typ, COUNT(*) AS Reparaturen, SUM(Reparatur.Kosten) AS Gesamtkosten, AVG(Reparatur.Kosten) AS Schnitt
FROM Rad, Reparatur
WHERE Rad.RadID = Reparatur.RadID
GROUP BY Rad.Typ
ORDER BY Gesamtkosten DESC
```

**7. Die drei beliebtesten Startstationen** – Ergebnis: 3 Zeilen; Abnahme garantiert keinen Gleichstand auf Rang 3/4.

```sql
SELECT Station.StationID, Station.Name, COUNT(*) AS Starts
FROM Ausleihe, Station
WHERE Ausleihe.StartStation = Station.StationID
GROUP BY Station.StationID, Station.Name
ORDER BY Starts DESC
LIMIT 3
```

**8. Abfrage analysieren** – Erwartet: Liefert für jede Station, an der derzeit mindestens zwei E-Bikes stehen, den
Stationsnamen und die Anzahl dieser E-Bikes; Räder ohne Station (unterwegs, in der Werkstatt, vermisst) und Stationen
mit höchstens einem E-Bike erscheinen nicht.

```sql
SELECT Station.Name, COUNT(*) AS Anzahl
FROM Rad, Station
WHERE Rad.StationID = Station.StationID
  AND Rad.Typ = 'E-Bike'
GROUP BY Station.StationID, Station.Name
HAVING COUNT(*) >= 2
```

## Abnahme-Prüfungen (nach dem Generieren)

| Prüfung | Erwartung |
|---|---|
| Zeilen je Tabelle | Station 13, Rad 45, Kunde 80, Ausleihe 469, Reparatur 36 |
| `SELECT AusleihID FROM Ausleihe WHERE Start LIKE '% 00:%' OR Start LIKE '% 01:%' OR Start LIKE '% 02:%' OR Start LIKE '% 03:%' OR Start LIKE '% 04:%' OR Start LIKE '% 05:%'` | genau 303, 304, 305, 306, 307 |
| `SELECT MIN(Start), MAX(Start) FROM Ausleihe` | ≥ '2026-08-21 00:00', ≤ '2026-09-20 20:00' |
| `SELECT COUNT(*) FROM Ausleihe WHERE Ende IS NULL` | 14 |
| `SELECT KundenID, COUNT(*) FROM Ausleihe WHERE KundenID IN (64, 77) GROUP BY KundenID` | 64 → 3, 77 → 5 |
| `SELECT KundenID FROM Kunde WHERE Jahrgang = 1988 AND Stadtteil = 'Hafenviertel'` | genau 64, 77 |
| `SELECT Vorname, Nachname FROM Kunde GROUP BY Vorname, Nachname HAVING COUNT(*) > 1` | genau Lena Cordes |
| `SELECT COUNT(*) FROM Ausleihe WHERE RadID BETWEEN 41 AND 45` | 5 |
| `SELECT COUNT(*) FROM Kunde WHERE Nachname = 'Falkenrath'` | 0 |
| Ausleihen am Stadtfest-Samstag (`Start LIKE '2026-08-29%'`) | ≥ 5 (DS_PLANUNG A2-E2-02) |
| Beispiel 7 mit `LIMIT 4` | Rang 3 und Rang 4 haben verschiedene Anzahlen |
| Preis aller beendeten Ausleihen | entspricht der Formel je Radtyp (auf Cent) |
| Kunden ohne Ausleihe | genau 2 |
