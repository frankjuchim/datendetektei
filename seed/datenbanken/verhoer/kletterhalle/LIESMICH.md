# Kletterhalle – Verhör-Kontext V5 (Verhör 5, Akte 5, nur eA)

## Zweck

Kontext für **Verhör 5** (Transfer, nüchtern, Abitur-Stil; Spec 3.1, 7.9; `VERHOER_KONTEXTE.md` V5;
`docs/DS_PLANUNG.md` „Verhör-Blueprint: Verhör 5“, Aufgaben **A5-V-01 … 15**). Schwerpunkt ER lesen, ergänzen und
entwickeln, Kardinalitäten begründen, Überführung ins Relationenschema und zurück. Die meisten Aufgaben arbeiten nur mit
ER-Diagrammen und Schemata; diese **Mini-DB** liefert die Daten für die beiden Aufgaben „Kardinalität aus Daten“
(**A5-V-03** Mengendiagramm Wand–Route, **A5-V-04** Tabellenausschnitt der Begehungen) und dient als `quelle` der
`dbtabelle`-Blöcke. SQL-Aufgaben gibt es in V5 nicht.

- **Name in der Plattform:** `verhoer/kletterhalle` (Ordner `seed/datenbanken/verhoer/kletterhalle/`, Modul
  `scripts/db/verhoer_kletterhalle.js`). **Nie öffentlich**; geladen nur für das laufende Verhör.
- **Datenquelle:** vollständig kuratiert, kein Generator: `basis.sql` = `schema.sql` + `pflicht.sql`.
- **Rahmensatz (Startkarte, STORY 6):** „Ein Bauplan, den du nicht selbst gezeichnet hast – lies ihn, erweitere ihn,
  bau ihn um.“ (DS_PLANUNG: „Die Kletterhalle Weserstedt plant eine neue Mitgliederverwaltung und bittet die Detektei um
  ein Gutachten.“)
- **Umfang der Mini-DB:** genau der Ausschnitt der Musterlösung, den A5-V-03/04 brauchen – `Mitglied`, `Wand`,
  `Routenbauer`, `Route`, `begeht`. Kurse, Sichern und Wettkämpfe stehen nur im ER-Modell bzw. Relationenschema unten
  (keine Tabellen, damit die Mini-DB keine Lösung von A5-V-09/11/15 vorwegnimmt).

**Abweichung zwischen den Quellen (gemeldet, nicht still aufgelöst):** Der Verhör-Blueprint in `docs/DS_PLANUNG.md`
nennt die Beziehung Mitglied–Route *klettert* und einen Entitätstyp *Trainer* (mit *bildetAus*, *leitet*,
*assistiertIn*); `VERHOER_KONTEXTE.md` V5 (Anforderungstext, Musterlösung) nennt sie *begeht*, die Routen schraubt ein
*Routenbauer*, Kurse leitet ein *Mitglied*, und *sichert* ist die rekursive Beziehung. Die Mini-DB folgt
`VERHOER_KONTEXTE.md` (Tabelle `begeht`). Die Aufgaben A5-V-02/04/07/08/09/11/12/15 (Task 8) müssen dieselben Namen
verwenden – entweder werden die Blueprint-Texte auf *begeht*/*sichert* angepasst oder die Musterlösung hier auf
*klettert*/*Trainer* (dann `begeht` → `klettert` umbenennen und `npm run db`).

## Relationenschema der Mini-DB (Kurzschreibweise)

- Mitglied(<u>MitgliedsNr</u>, Name, Jahrgang)
- Wand(<u>WandNr</u>, Bereich)
- Routenbauer(<u>BauerNr</u>, Name)
- Route(<u>RoutenNr</u>, Name, Schwierigkeit, ↑WandNr, ↑BauerNr)
- begeht(<u>↑MitgliedsNr</u>, <u>↑RoutenNr</u>, <u>Datum</u>, Erfolg)

`Schwierigkeit` als UIAA-Grad (`'3'` … `'8-'`), `Erfolg` `'ja'`/`'nein'` (Durchstieg), Datum `'JJJJ-MM-TT'`.

## Anforderungstext (aus VERHOER_KONTEXTE V5, Material für A5-V-07 … 15)

> Jedes Mitglied der Kletterhalle hat eine Mitgliedsnummer, einen Namen und einen Jahrgang. Die Halle besteht aus
> Wänden mit Nummer und Bereich (z. B. „Nordwand“). An jeder Wand gibt es mehrere Routen; eine Route (Nummer, Name,
> Schwierigkeit) befindet sich an genau einer Wand und wurde von genau einem Routenbauer (Nummer, Name) geschraubt.
> Mitglieder begehen Routen; für jede Begehung werden das Datum und der Erfolg (Durchstieg ja/nein) gespeichert.
> Beim Klettern sichern sich Mitglieder gegenseitig; es soll festgehalten werden, wer wen schon gesichert hat.
> Kurse (Nummer, Titel, Termin) werden von genau einem Mitglied geleitet und von mehreren Mitgliedern besucht.
> Bei Hallenwettkämpfen (Nummer, Titel, Datum) erhält jedes teilnehmende Mitglied für jede gekletterte Route Punkte.

## Muster-ER (Chen; aus VERHOER_KONTEXTE V5)

- **Entitätstypen:** `Mitglied` (<u>MitgliedsNr</u>, Name, Jahrgang) · `Wand` (<u>WandNr</u>, Bereich) · `Route`
  (<u>RoutenNr</u>, Name, Schwierigkeit) · `Routenbauer` (<u>BauerNr</u>, Name) · `Kurs` (<u>KursNr</u>, Titel, Termin) ·
  `Wettkampf` (<u>WettkampfNr</u>, Titel, Datum).
- **Beziehungstypen:** *hat* Wand (1) – Route (n) · *schraubt* Routenbauer (1) – Route (n) · *begeht* Mitglied (n) –
  Route (m) mit **Datum, Erfolg** · *sichert* Mitglied (n, Rolle Sichernde) – Mitglied (m, Rolle Kletternde),
  **rekursiv n:m** · *leitet* Mitglied (1) – Kurs (n) · *besucht* Mitglied (n) – Kurs (m) (**zwei Beziehungen zwischen
  denselben Entitätstypen**) · *wertet* **ternär** Mitglied (m) – Route (n) – Wettkampf (p) mit **Punkte**.
- Grenzen der Notation (A5-V-10): „höchstens 8 Teilnehmende je Kurs“, „jede Route hat mindestens drei Begehungen“ sind
  mit 1/n/m nicht darstellbar. Variante STORY 6 „Trainer bildet Trainer aus“ (*bildetAus* Mitglied (1) – Mitglied (n))
  nur als Cold Case.

## Muster-Relationenschema (aus VERHOER_KONTEXTE V5)

Mitglied(<u>MitgliedsNr</u>, Name, Jahrgang) · Wand(<u>WandNr</u>, Bereich) · Routenbauer(<u>BauerNr</u>, Name) ·
Route(<u>RoutenNr</u>, Name, Schwierigkeit, ↑WandNr, ↑BauerNr) ·
begeht(<u>↑MitgliedsNr</u>, <u>↑RoutenNr</u>, <u>Datum</u>, Erfolg) – Datum im Schlüssel, weil dieselbe Route mehrfach
begangen wird · sichert(<u>↑SichererNr</u>, <u>↑KlettererNr</u>) – beide verweisen auf `Mitglied` ·
Kurs(<u>KursNr</u>, Titel, Termin, ↑LeiterNr) · besucht(<u>↑MitgliedsNr</u>, <u>↑KursNr</u>) ·
Wettkampf(<u>WettkampfNr</u>, Titel, Datum) · Wertung(<u>↑MitgliedsNr</u>, <u>↑RoutenNr</u>, <u>↑WettkampfNr</u>, Punkte).

Die Mini-DB ist genau der Teil `Mitglied`, `Wand`, `Routenbauer`, `Route`, `begeht` dieses Schemas.

## Daten im Überblick

| WandNr | Bereich | Routen (RoutenNr Name Grad, BauerNr) |
|---|---|---|
| 1 | Nordwand | 1 Morgenrot 5+ (1) · 2 Kante links 6- (2) · 3 Gletscherspalte 7 (1) · 4 Nordlicht 6+ (3) |
| 2 | Südwand | 5 Sonnendeck 4 (2) · 6 Sandsturm 5 (3) · 7 Mittagspause 6 (1) |
| 3 | Überhang | 8 Dachrinne 7+ (2) · 9 Schwerkraft 8- (2) · 10 Fledermaus 6+ (3) |
| 4 | Kinderbereich | 11 Raupe 3 (1) · 12 Marienkäfer 3+ (3) |

Routenbauer: 1 Tomke Bredehorn, 2 Helge Schierholz, 3 Kaja Wiechmann (je 4 Routen).
Mitglieder: 1 Arne Steenken (1994), 2 Smilla Dirksen (2008), 3 Deniz Akgül (1989), 4 Maren Tiemann (2001),
5 Ilias Haddad (2010), 6 Vivien Eggers (1976), 7 Jannik Möhlmann (2005), 8 Fenja Nordhoff (2012).
`begeht`: 25 Begehungen vom 2026-09-05 bis 2026-10-17, 19 mit Durchstieg; jedes Mitglied 2–5 Begehungen auf mindestens
zwei Routen, jede Route begangen, 11 von 12 Routen von mindestens zwei Mitgliedern (Route 12 nur von Mitglied 8).

## Pflicht-Randfälle

| Randfall | Daten | Für |
|---|---|---|
| 1:n aus Daten | Wand 1–4 mit 4/3/3/2 Routen; `Route.WandNr` NOT NULL, also jede Route an genau einer Wand | A5-V-03 (P9: nicht n:m, nicht 1:1) |
| n:m aus Daten | Mitglied 1 begeht Route 1, 3, 8, 9; Route 1 wird von Mitglied 1, 2, 3 begangen | A5-V-04 (P9: nicht 1:n) |
| Paar an zwei Tagen | Mitglied 1 / Route 3: 2026-09-05 `nein`, 2026-09-12 `ja` | A5-V-04, A5-V-11/12 (Datum im Schlüssel von `begeht`; P9 Beziehungsattribut) |
| FK auf der n-Seite | `Route.WandNr`, `Route.BauerNr` | A5-V-05 |

## Hinweise für A5-V-03 und A5-V-04

- **A5-V-03 Mengendiagramm Wand–Route:** alle 4 Wände und 12 Routen (Tabelle „Daten im Überblick“). Jede Route hat
  genau einen Pfeil zu einer Wand, jede Wand mehrere Routen → *hat* Wand (1) – Route (n). Distraktoren: n:m (wer
  übersieht, dass keine Route an zwei Wänden hängt), 1:1 (wer nur prüft, dass jede Route genau eine Wand hat),
  vertauschte Richtung „Wand n – Route 1“.
- **A5-V-04 Tabellenausschnitt:** die sechs Zeilen von `begeht` mit (MitgliedsNr, RoutenNr) ∈ {(1, 1), (1, 3), (3, 1),
  (2, 2), (2, 1)} – (1, 3) zweimal, an zwei Tagen –, am besten mit Namen (Beispielabfrage 6). Daran sichtbar: ein
  Mitglied begeht mehrere Routen (Arne Steenken: Morgenrot, Gletscherspalte) **und** eine Route wird von mehreren
  Mitgliedern begangen (Morgenrot: Arne Steenken, Deniz Akgül, Smilla Dirksen) → n:m. Typischer Fehlschluss (P9):
  „Arne Steenken begeht mehrere Routen → 1:n“ (nur eine Leserichtung geprüft). Die doppelte Zeile (1, 3) begründet
  zusätzlich, warum `Datum` zum Schlüssel gehört (A5-V-12).
- Der Ausschnitt verrät keine Lösung anderer Aufgaben (keine Kurs-, Sicher- oder Wettkampfdaten in der DB).

## Randfall-Varianten

**Keine.** Varianten (Spec 7.4) dienen der Ergebnisprüfung von SQL-Musterlösungen; V5 enthält laut Blueprint keine
SQL-Aufgabe (`match`, `choice`, `er`, `schema`). Die Randfälle für A5-V-03/04 sind Pflicht-Datensätze der Haupt-DB.

## Beispielabfragen (Abi-Stil; für Lehrkraft-Material und als Abnahme)

**1. Routen je Wand (A5-V-03)** – Ergebnis: 4 Zeilen mit 4, 3, 3, 2 Routen.

```sql
SELECT Wand.WandNr, Wand.Bereich, COUNT(*) AS Routen
FROM Wand, Route
WHERE Wand.WandNr = Route.WandNr
GROUP BY Wand.WandNr, Wand.Bereich
```

**2. Wand jeder Route (A5-V-03, A5-V-05)** – Ergebnis: 12 Zeilen, jede Route genau einmal.

```sql
SELECT Route.RoutenNr, Route.Name, Wand.Bereich
FROM Route, Wand
WHERE Route.WandNr = Wand.WandNr
ORDER BY Route.RoutenNr
```

**3. Begehungen je Mitglied (A5-V-04)** – Ergebnis: 8 Zeilen, jedes Mitglied mindestens 2.

```sql
SELECT Mitglied.MitgliedsNr, Mitglied.Name, COUNT(*) AS Begehungen
FROM Mitglied, begeht
WHERE Mitglied.MitgliedsNr = begeht.MitgliedsNr
GROUP BY Mitglied.MitgliedsNr, Mitglied.Name
```

**4. Routen mit mehreren Begehungen (A5-V-04)** – Ergebnis: 11 Routen (Route 12 nur einmal begangen).

```sql
SELECT Route.RoutenNr, Route.Name, COUNT(*) AS Begehungen
FROM Route, begeht
WHERE Route.RoutenNr = begeht.RoutenNr
GROUP BY Route.RoutenNr, Route.Name
HAVING COUNT(*) > 1
```

**5. Dasselbe Paar mehrfach (A5-V-12)** – Ergebnis: Mitglied 1, Route 3, 2 Begehungen.

```sql
SELECT MitgliedsNr, RoutenNr, COUNT(*) AS Begehungen
FROM begeht
GROUP BY MitgliedsNr, RoutenNr
HAVING COUNT(*) > 1
```

**6. Tabellenausschnitt für A5-V-04** – Ergebnis: 6 Zeilen, nach Datum.

```sql
SELECT Mitglied.Name, Route.Name AS Route, begeht.Datum, begeht.Erfolg
FROM Mitglied, begeht, Route
WHERE Mitglied.MitgliedsNr = begeht.MitgliedsNr
  AND begeht.RoutenNr = Route.RoutenNr
  AND Route.RoutenNr <= 3
  AND Mitglied.MitgliedsNr <= 3
  AND begeht.Datum <= '2026-10-11'
ORDER BY begeht.Datum
```

**7. Durchstiege je Route** – Ergebnis: 11 Zeilen (Route 9 „Schwerkraft“ ohne Durchstieg fehlt).

```sql
SELECT Route.Name, COUNT(*) AS Durchstiege
FROM Route, begeht
WHERE Route.RoutenNr = begeht.RoutenNr
  AND begeht.Erfolg = 'ja'
GROUP BY Route.RoutenNr, Route.Name
```

**8. Routen je Routenbauer (A5-V-05)** – Ergebnis: je 4.

```sql
SELECT Routenbauer.BauerNr, Routenbauer.Name, COUNT(*) AS Routen
FROM Routenbauer, Route
WHERE Routenbauer.BauerNr = Route.BauerNr
GROUP BY Routenbauer.BauerNr, Routenbauer.Name
```

**9. Begehungen von Arne Steenken** – Ergebnis: 5 Zeilen, Gletscherspalte zweimal.

```sql
SELECT Route.Name, Route.Schwierigkeit, begeht.Datum, begeht.Erfolg
FROM begeht, Route
WHERE begeht.RoutenNr = Route.RoutenNr
  AND begeht.MitgliedsNr = 1
ORDER BY begeht.Datum
```

## Abnahme-Prüfungen

| Prüfung | Erwartung |
|---|---|
| Zeilen | Mitglied 8, Wand 4, Routenbauer 3, Route 12, begeht 22–28 (ist 25) |
| Routen je Wand | 4, 3, 3, 2 |
| Route ohne Wand/Routenbauer | 0 |
| Routen je Routenbauer | 4, 4, 4 |
| Mitglieder mit weniger als 2 Routen | 0 |
| Routen mit mindestens 2 Mitgliedern | 11 |
| begangene Routen | 12 |
| Paar mehrfach | nur Mitglied 1 / Route 3 (`nein`, dann `ja`) |
| Datum | 2026-09-05 … 2026-10-17 |
| Durchstiege / ohne | 19 / 6 |
| Ausschnitt A5-V-04 | 6 Zeilen (1/1, 1/3, 3/1 am 2026-09-05; 2/2 am 2026-09-06; 1/3 am 2026-09-12; 2/1 am 2026-10-11) |
