# Fitness-App – Verhör-Kontext V6 (Verhör 6, Akte 6)

## Zweck

Eigene kleine DB für **Verhör 6** (Transfer, nüchtern, Abitur-Stil; Spec 3.1, 7.9; `VERHOER_KONTEXTE.md` V6;
`docs/DS_PLANUNG.md` „Verhör-Blueprint: Verhör 6“, Aufgaben **A6-V-01 … 08**, Timer 15 min). Schwerpunkt Datenschutz:
Pseudonymisierung, Quasi-Identifikatoren, kleine Gruppen, Gesundheitsdaten als besondere Kategorie; SQL nur in
**A6-V-05** (`sql`), Datensätze in **A6-V-06** (`zeilen`).

- **Name in der Plattform:** `verhoer/fitness` (Ordner `seed/datenbanken/verhoer/fitness/`, Modul
  `scripts/db/verhoer_fitness.js`). **Nie öffentlich**; geladen nur für die Prüfung im laufenden Verhör.
- **Datenquelle:** vollständig kuratiert, kein Generator: `basis.sql` = `schema.sql` + `pflicht.sql` (Schritte und
  Ruhepuls mit einem kleinen Werkzeug erzeugt, die Gruppen nach Geburtsjahr und PLZBereich fest vorgegeben).
- **Rahmensatz (Startkarte, STORY 6):** „Du weißt jetzt, wie leicht man Menschen in Daten findet – zeig mir, dass du
  weißt, wann man es nicht darf.“ (DS_PLANUNG: „Eine Fitness-App möchte Nutzerdaten mit einer Krankenkasse und
  Werbepartnern teilen.“)
- **Kontext (Aufgabentext):** Eine (fiktive) Fitness-App zeichnet Schritte und Ruhepuls ihrer Nutzerinnen und Nutzer
  auf und möchte einen pseudonymisierten Export mit einer Krankenkasse und mit Werbepartnern teilen. Statt eines
  Namens enthält der Export nur ein `NutzerToken`. Dazu gehören vier kurze Auszüge aus der Datenschutzerklärung
  (A: Werbung, B: Weitergabe an Partner, C: Speicherdauer „unbegrenzt“, D: Standortfreigabe) – Texte in den Aufgaben.
- **Keine Namen:** Der Kontext enthält bewusst keine Personennamen (pseudonymer Export).

**Abweichung von `VERHOER_KONTEXTE.md` (dort nur die Tabelle `Export`):** Der Hinweis zu A6-V-05 verlangt eine Fassung
**mit genau einer Zeile je NutzerToken** (Stichtag), damit `GROUP BY Geburtsjahr, PLZBereich HAVING COUNT(*) = 1` ohne
Unterabfrage korrekt ist, und zusätzlich die **Mehrtagesfassung** (≈ 60 Zeilen, Diskussion „Zeilen ≠ Personen“).
Beide liegen deshalb in derselben DB: `Export` = Stichtagsfassung (Name und Spalten wie im Schema), `ExportVerlauf` =
Mehrtagesfassung mit denselben Spalten. Außerdem liegt das Geburtsjahr **1949** des Nachbarn (Kontextkarte, Pflicht)
außerhalb des Wertebereichs 1950–2008; es ist das einzige.

## Relationenschema (Kurzschreibweise)

- Export(<u>NutzerToken</u>, Geburtsjahr, PLZBereich, Geschlecht, Schritte, Ruhepuls, <u>Datum</u>)
- ExportVerlauf(<u>NutzerToken</u>, Geburtsjahr, PLZBereich, Geschlecht, Schritte, Ruhepuls, <u>Datum</u>)

NutzerToken `'N-000'` (Pseudonym, drei Ziffern, ohne Reihenfolge) · Geburtsjahr 1949–2007 · PLZBereich fiktiv `'001'`
… `'006'` · Geschlecht `'w'`, `'m'`, `'d'` · Schritte 800–18 000 (Tageswert, auf 10 gerundet) · Ruhepuls 48–92,
**NULL**, wenn kein Messgerät verbunden war · Datum `'JJJJ-MM-TT'`. Stichtag `'2026-10-05'` (Mo); der Verlauf umfasst
Fr 2026-10-02 … Mo 2026-10-05.

Datenschutz-Einordnung (für A6-V-02/-07): **Ruhepuls** ist ein Gesundheitsdatum (besondere Kategorie, Art. 9 DSGVO);
**Schritte** sind für sich kein Gesundheitsdatum, lassen aber in Kombination Rückschlüsse zu; **Geburtsjahr,
PLZBereich, Geschlecht** sind Quasi-Identifikatoren; das Token ist ein Pseudonym (keine Anonymisierung).

## Daten im Überblick

25 NutzerToken; `Export` 25 Zeilen (Stichtag), `ExportVerlauf` 60 Zeilen (1–4 Tage je Token; jede Zeile von `Export`
steht unverändert auch im Verlauf). Gruppen nach (Geburtsjahr, PLZBereich) am Stichtag:

| Geburtsjahr | PLZBereich | Tokens | Geschlecht | Besonderheit |
|---|---|---|---|---|
| 1990 | 002 | N-100, N-137, N-249, N-367 | w, w, m, w | Kontextkarte 2 (Frau): drei Tokens |
| 2001 | 004 | N-523, N-651, N-652, N-798 | m, m, w, w | |
| 1975 | 003 | N-427, N-482, N-888 | w, m, w | |
| 1998 | 001 | N-122, N-379, N-600 | d, w, m | |
| 2007 | 005 | N-581, N-852, N-877 | w, m, m | 2007 kommt zweimal vor |
| 1958 | 006 | N-302, N-847 | w, w | |
| 1963 | 002 | N-700, N-778 | w, m | N-700 am Stichtag ohne Ruhepuls; 1963 kommt zweimal vor |
| **1949** | **004** | **N-687** | m | **kleine Gruppe**; Kontextkarte 1 (Nachbar); **vier** Zeilen im Verlauf |
| **1963** | **006** | **N-596** | m | **kleine Gruppe** |
| **1985** | **003** | **N-880** | w | **kleine Gruppe**; Ruhepuls am Stichtag NULL |
| **2007** | **001** | **N-182** | w | **kleine Gruppe** |

Ruhepuls NULL: im Verlauf 6 Zeilen (N-302 04.10., N-652 03.10., N-700 05.10., N-852 04.10., N-877 04.10., N-880 05.10.),
im Export 2 (N-700, N-880).

## Pflicht-Randfälle (`pflicht.sql`)

| Randfall | Daten | Für |
|---|---|---|
| kleine Gruppen | genau 4 Kombinationen (Geburtsjahr, PLZBereich) mit genau einem Token: (1949, 004), (1963, 006), (1985, 003), (2007, 001); im Verlauf hat (1949, 004) vier Zeilen | A6-V-05 (P1: Bedingung über Gruppen in HAVING) |
| Zeilen ≠ Personen | auf `ExportVerlauf` liefert dieselbe Abfrage nur (1963, 006) und (2007, 001) – N-687 und N-880 haben mehrere Zeilen | A6-V-05/-06 (P4, Diskussion) |
| Re-Identifizierung | Kontextkarte 1 „Ihr Nachbar, Jahrgang 1949, wohnt im Bereich 004, nutzt die App“ → genau N-687 (vier Datensätze im Verlauf, alle zuordenbar); Kontextkarte 2 „Ihre Kollegin, Jahrgang 1990, wohnt im Bereich 002“ → drei Tokens (nicht eindeutig) | A6-V-06 |
| besondere Kategorie | Ruhepuls = Gesundheitsdatum; Schritte nur in Kombination | A6-V-02, -07 |
| NULL | 6 Zeilen Ruhepuls NULL im Verlauf; eine kleine Gruppe (N-880) und eine Zweiergruppe (N-700) am Stichtag ohne Ruhepuls | A6-V-05 (`COUNT(Ruhepuls)` statt `COUNT(*)`), Zusatzfrage `IS NULL` |

## Eingebaute Fallen

| Falle | Wo | Ergebnis statt richtig |
|---|---|---|
| P1 WHERE ↔ HAVING | `WHERE COUNT(*) = 1` (Beispiel 9) | Fehler |
| P3/Gruppierung zu grob | nur `GROUP BY Geburtsjahr` | 1949, 1985 (1963 und 2007 kommen zweimal vor) |
| Gruppierung zu fein | zusätzlich `Geschlecht` | 11 statt 4 Kombinationen |
| P4 Zeilen ≠ Personen | Abfrage auf `ExportVerlauf` | 2 statt 4 Kombinationen |
| P5 NULL | `HAVING COUNT(Ruhepuls) = 1` | (1963, 002) fälschlich dabei, (1985, 003) fehlt |
| Vorfilter | `WHERE Ruhepuls IS NOT NULL` vor dem Gruppieren | (1963, 002) dabei, (1985, 003) fehlt |

## Randfall-Varianten

| Variante | Delta | Entlarvte Fehlabfrage |
|---|---|---|
| `null` | Token N-901 (1971, 005, d) am Stichtag ohne Ruhepuls (im Verlauf zwei Tage, beide ohne Ruhepuls) – fünfte kleine Gruppe | A6-V-05 mit `COUNT(Ruhepuls)` (die Gruppe fehlt) und Abfragen, die nur zufällig vier Kombinationen liefern (`ORDER BY COUNT(*) LIMIT 4`, fest eingetragene Jahrgänge) |
| `gleichnamig` | entfällt – keine Namen (pseudonymer Export) | – |
| `grenze` | entfällt – Gruppengröße 1 vs. 2 ist in der Haupt-DB enthalten | – |
| `gleichstand` | entfällt – keine LIMIT-Aufgabe | – |
| `leer` | entfällt – jede Kombination hat mindestens einen Token | – |

**Empfehlung `varianten` je Aufgabe:** A6-V-05: `["null"]`. A6-V-06 (`zeilen`) zeigt einen Ausschnitt aus
`ExportVerlauf` (z. B. alle Zeilen der Jahrgänge 1949 und 1990, Quelle Beispiel 3/4).

## Beispielabfragen (Abi-Stil)

**1. Kleine Gruppen (A6-V-05)** – „Entwerfen Sie eine Abfrage, die alle Kombinationen aus Geburtsjahr und PLZBereich
ausgibt, zu denen nur ein NutzerToken gehört.“ Ergebnis: (1949, 004), (1963, 006), (1985, 003), (2007, 001).

```sql
SELECT Geburtsjahr, PLZBereich
FROM Export
GROUP BY Geburtsjahr, PLZBereich
HAVING COUNT(*) = 1
```

**2. Gruppengrößen** – Ergebnis: 11 Zeilen; zwei Vierergruppen (1990/002, 2001/004), drei Dreiergruppen, zwei
Zweiergruppen, vier Einzelne.

```sql
SELECT Geburtsjahr, PLZBereich, COUNT(*) AS Anzahl
FROM Export
GROUP BY Geburtsjahr, PLZBereich
ORDER BY Anzahl DESC
```

**3. Kontextkarte 1 (A6-V-06)** – alle Datensätze, die zum Nachbarn (Jahrgang 1949, Bereich 004) gehören. Ergebnis: vier
Zeilen von N-687 (02.10. 1830 Schritte/69, 03.10. 3150/72, 04.10. 8750/79, 05.10. 6200/76).

```sql
SELECT NutzerToken, Datum, Schritte, Ruhepuls
FROM ExportVerlauf
WHERE Geburtsjahr = 1949
  AND PLZBereich = '004'
ORDER BY Datum
```

**4. Kontextkarte 2 (A6-V-06)** – Kollegin, Jahrgang 1990, Bereich 002. Ergebnis: N-100, N-137, N-367 – nicht eindeutig.

```sql
SELECT NutzerToken, Schritte, Ruhepuls
FROM Export
WHERE Geburtsjahr = 1990
  AND PLZBereich = '002'
  AND Geschlecht = 'w'
```

**5. Ohne Messgerät (Zusatzfrage NULL)** – Ergebnis: 6 Zeilen (N-302, N-652, N-700, N-852, N-877, N-880).

```sql
SELECT NutzerToken, Datum
FROM ExportVerlauf
WHERE Ruhepuls IS NULL
```

**6. Vollständige Verläufe** – Tokens mit Werten an allen vier Tagen. Ergebnis: N-523, N-581, N-687.

```sql
SELECT NutzerToken, COUNT(*) AS Tage
FROM ExportVerlauf
GROUP BY NutzerToken
HAVING COUNT(*) = 4
```

**7. Ruhepuls je Geschlecht am Stichtag** – `AVG` und `COUNT(Ruhepuls)` ignorieren NULL. Ergebnis: d 1/1/51, m 10/10/66.1,
w 14/12/61.67.

```sql
SELECT Geschlecht, COUNT(*) AS Personen, COUNT(Ruhepuls) AS MitPuls, AVG(Ruhepuls) AS Puls
FROM Export
GROUP BY Geschlecht
```

**8. Zeilen ≠ Personen (Diskussion zu A6-V-05)** – dieselbe Abfrage auf der Mehrtagesfassung zählt Zeilen, nicht
Personen. Ergebnis: nur (1963, 006) und (2007, 001); (1949, 004) mit vier und (1985, 003) mit zwei Zeilen fehlen.

```sql
SELECT Geburtsjahr, PLZBereich
FROM ExportVerlauf
GROUP BY Geburtsjahr, PLZBereich
HAVING COUNT(*) = 1
```

**9. Aggregat in WHERE (A6-V-05)**

```sql
-- Fehlabfrage (P1): Bedingung über Gruppen gehört in HAVING
SELECT Geburtsjahr, PLZBereich
FROM Export
WHERE COUNT(*) = 1
GROUP BY Geburtsjahr, PLZBereich
```

Nur am Ergebnis erkennbar (stehen in `test/db_verhoer.test.js`): `COUNT(Ruhepuls)` statt `COUNT(*)`, nur nach
Geburtsjahr gruppiert, zusätzlich nach Geschlecht gruppiert, `WHERE Ruhepuls IS NOT NULL`, `ORDER BY COUNT(*) LIMIT 4`
(Variante `null`).

## Abnahme-Prüfungen

| Prüfung | Erwartung |
|---|---|
| Zeilen | Export 25, ExportVerlauf 60 |
| Export | 25 Tokens, nur 2026-10-05 |
| ExportVerlauf | 25 Tokens, 2026-10-02 … 2026-10-05 |
| Export ⊂ Verlauf | alle 25 Zeilen unverändert im Verlauf |
| Ruhepuls NULL | Verlauf 6; Export N-700, N-880 |
| Beispiel 1 | (1949, 004), (1963, 006), (1985, 003), (2007, 001) |
| `COUNT(Ruhepuls) = 1` | (1949, 004), (1963, 002), (1963, 006), (2007, 001) |
| Beispiel 8 | (1963, 006), (2007, 001) |
| nur Geburtsjahr | 1949, 1985 |
| Kontextkarte 1 / 2 | N-687 mit 4 Zeilen / N-100, N-137, N-367 |
| Geburtsjahre außerhalb 1950–2008 | nur 1949 |
