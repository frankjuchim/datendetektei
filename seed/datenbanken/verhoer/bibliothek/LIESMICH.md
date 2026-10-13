# Stadtbibliothek – Verhör-Kontext V1 (Verhör 1, Akte 1)

## Zweck

Eigene kleine DB für **Verhör 1** (Transfer, nüchtern, Abitur-Stil; Spec 3.1, 7.9; `VERHOER_KONTEXTE.md` V1;
`docs/DS_PLANUNG.md` „Verhör-Blueprint: Verhör 1“, Aufgaben **A1-V-01 … 12**). Schwerpunkt SQL in **einer** Tabelle:
SELECT/WHERE, LIKE, BETWEEN, IN, IS NULL, berechnete Spalte, ORDER BY, LIMIT.

- **Name in der Plattform:** `verhoer/bibliothek` (Ordner `seed/datenbanken/verhoer/bibliothek/`, Modul
  `scripts/db/verhoer_bibliothek.js`). **Nie öffentlich** (kein `/db/…`, kein Download, kein Schema-Browser für
  Gäste); geladen nur für die Prüfung im laufenden Verhör.
- **Datenquelle:** vollständig kuratiert, kein Generator: `basis.sql` = `schema.sql` + `pflicht.sql`.
- **Rahmensatz (Startkarte, STORY 6):** „Bevor ich dich allein an das Fundbuch lasse, prüfe ich, ob du auch in einem
  fremden Archiv sauber abfragst.“
- **Kontext (Aufgabentext):** Die Stadtbibliothek Weserstedt verwaltet ihren Bestand in einer einzigen Tabelle. Jede
  Zeile ist ein Exemplar; `AusgeliehenBis` enthält das Rückgabedatum und ist NULL, wenn das Medium im Regal steht.
  `Autor` enthält nur den Nachnamen, `Preis` den Wiederbeschaffungswert in Euro (NULL bei Schenkungen).
  Datenstand: Montag, 2026-10-12.

## Relationenschema (Kurzschreibweise)

- Medium(<u>MedienNr</u>, Titel, Autor, Medienart, Genre, Erscheinungsjahr, Preis, Standort, AusgeliehenBis)

Wertebereiche (per CHECK): Medienart `'Buch'`, `'Hörbuch'`, `'E-Book'`, `'DVD'`, `'Zeitschrift'` · Genre `'Krimi'`,
`'Thriller'`, `'Roman'`, `'Sachbuch'`, `'Kinderbuch'`, `'Fantasy'` · Standort `'Erdgeschoss'`, `'Obergeschoss'`,
`'Kinderbereich'`, `'Magazin'` · Erscheinungsjahr 1985–2026 · `AusgeliehenBis` `'JJJJ-MM-TT'` (2026-10-13 …
2026-11-06) oder NULL · `Preis` REAL oder NULL. Titel beginnen nie mit einem Umlaut (LIKE, LIESMICH §2).

## Daten im Überblick

60 Exemplare (57 verschiedene Titel): Krimi 13, Thriller 8, Roman 13, Sachbuch 11, Kinderbuch 9, Fantasy 6 (je Genre
gezählt nach Exemplaren; Roman inkl. Hörbücher/E-Books). 23 verfügbar (38 %), 37 ausgeliehen; 4 ohne Preis.

## Pflicht-Randfälle (`pflicht.sql`)

| Randfall | MedienNr | Für |
|---|---|---|
| NULL | 23 × `AusgeliehenBis` NULL (38 %); `Preis` NULL bei 11 (verfügbarer Krimi), 26, 41 (Magazin), 42 | A1-V-04, -09, -11, -12 (P5) |
| Ausschnitt-Falle | genau drei Titel doppelt (zwei Exemplare): „Tod am Sielhafen“ 1/2 (Krimi), „Sommer in Moorende“ 19/20, „Die kleine Möwe Mats“ 37/38 – im Aufgabenausschnitt nur je eines | A1-V-02 (P8: Titel ist kein Schlüssel) |
| Bedingungslogik | Krimis ≤ 15 € (1, 3, 6, 7, 8, 10, 54, 55) und > 15 € (4, 5, 9); Thriller > 15 € (12, 13, 14, 16) und ≤ 15 € (15, 17, 18 genau 15,00, 60); Krimi 11 ohne Preis | A1-V-05 (P6) |
| LIKE | Titel mit `'Der '` am Anfang: 3 (Onken), 12 (Lampe), 21 (Schwarting), 27 (Rabe), 36 (Witte); `'Derbyfieber'` 8 (Haake, 5 Buchstaben); `'Die Insel der Kraniche'` 15 (Tebbe) und `'Leo und der Leuchtturm'` 39 (Rossi) enthalten „der “ | A1-V-06 (P6) |
| Grenzjahre | Roman 2000 (19, 20), Roman 2010 (27), Sachbuch 2010 (28), Roman 1999 (22), Sachbuch 1999 (31), Sachbuch 2011 (29); Krimi 2010 (54) außerhalb von IN; Hörbuch 2015 (24) und 2016 (5) | A1-V-07, -10, STORY-Beispiel (P6) |
| Magazin | 6 Medien (6, 17, 22, 31, 41, 49), 41 ohne Preis → `Ersatzkosten` NULL | A1-V-09 |
| Top 5 | verfügbare Krimis/Thriller nach Preis: 12 (22,00), 4 (19,95), 14 (18,50), 9 (17,90), 16 (16,00) – Platz 6: 15 (14,95); teurer, aber ausgeliehen: Thriller 13 (29,90) und Krimi 5 (24,95); verfügbarer Krimi 11 ohne Preis steht bei DESC am Ende | A1-V-11 (P6) |

## Eingebaute Fallen

| Falle | Wo |
|---|---|
| P5 NULL | `AusgeliehenBis = NULL` liefert nichts (A1-V-12); `Preis + 5` ist bei 41 NULL; `ORDER BY Preis DESC` sortiert NULL ans Ende – keine Aufgabe baut auf die Position von NULL |
| P6 Bedingungslogik | `Genre = 'Krimi' OR Genre = 'Thriller' AND Preis > 15` (AND bindet stärker: alle 13 Krimis + 4 Thriller); dasselbe bei A1-V-07 (Romane außerhalb 2000–2010) und A1-V-11 (ausgeliehener Krimi 5 rutscht in die Top 5); `'Der%'` (Derbyfieber), `'%der %'` (15, 39), `'_____%'` (21 Schwarting), `'____'` (27 Rabe); `> 2015` vs. `>= 2015` (24) |
| P8 Schlüssel | Titel im Ausschnitt eindeutig, im Bestand dreimal doppelt → nur `MedienNr` ist Primärschlüssel |

## Randfall-Varianten

| Variante | Delta (IDs ab 9001) | Entlarvte Fehlabfrage |
|---|---|---|
| `null` | entfällt – NULL in `AusgeliehenBis` (38 %) und `Preis` (4, auch im Magazin und bei einem verfügbaren Krimi) liegt schon in der Haupt-DB; weitere NULL-Spalten gibt es nicht (alle übrigen NOT NULL) | – |
| `gleichnamig` | 9001 zweites Exemplar „Der Leuchtturmwärter“ (Onken, Krimi, 14,00 €, Obergeschoss, verfügbar) | `SELECT DISTINCT Titel, Autor …` bei A1-V-06 (auf der Haupt-DB zufällig gleich, weil kein Treffer doppelt ist); bei A1-V-03 entlarvt schon die Haupt-DB (1/2) |
| `grenze` | entfällt – alle Grenzwerte der Blueprint-Aufgaben (2000/2010, 1999/2011, Hörbuch 2015/2016, Preis genau 15,00, Autor mit 4/5/≥ 6 Buchstaben) sind Pflicht-Datensätze der Haupt-DB | – |
| `gleichstand` | entfällt – A1-V-11 ist eine LIMIT-Aufgabe und braucht **ausdrücklich** eine gleichstandsfreie Schnittkante; eine Aufgabe „alle mit dem Höchstwert“ gibt es in V1 nicht | – |
| `leer` | entfällt – eine Tabelle ohne Fremdschlüssel, keine Gruppen | – |

**Empfehlung `varianten` je Aufgabe:** A1-V-03, -04, -06, -10: `["gleichnamig"]` · A1-V-07, -09, -11: `[]` (die Variante
ändert dort nichts Entscheidendes; A1-V-11 darf sie trotzdem nennen, 9001 liegt unter Platz 5).

## Beispielabfragen (Abi-Stil)

**1. Krimis (A1-V-03)** – „Entwerfen Sie eine SQL-Abfrage, die Titel und Autor aller Medien des Genres 'Krimi'
ausgibt.“ Ergebnis: 13 Zeilen, „Tod am Sielhafen“ zweimal.

```sql
SELECT Titel, Autor
FROM Medium
WHERE Genre = 'Krimi'
```

**2. Verfügbar (A1-V-04)** – Ergebnis: 23 Zeilen.

```sql
SELECT Titel, Standort
FROM Medium
WHERE AusgeliehenBis IS NULL
```

**3. Titelsuche (A1-V-06)** – Titel beginnt mit „Der “, Autor genau fünf Buchstaben. Ergebnis: 3, 12, 36.

```sql
SELECT MedienNr, Titel, Autor
FROM Medium
WHERE Titel LIKE 'Der %'
  AND Autor LIKE '_____'
```

**4. Jahrgänge (A1-V-07)** – Romane oder Sachbücher von 2000 bis 2010 einschließlich. Ergebnis: 10 Zeilen (19, 20,
21, 26, 27, 28, 30, 32, 56, 57).

```sql
SELECT MedienNr, Titel, Genre, Erscheinungsjahr
FROM Medium
WHERE Genre IN ('Roman', 'Sachbuch')
  AND Erscheinungsjahr BETWEEN 2000 AND 2010
```

**5. Ersatzkosten (A1-V-09)** – Ergebnis: 6 Zeilen, „Das Geheimnis im Baumhaus“ mit Ersatzkosten NULL.

```sql
SELECT Titel, Preis + 5 AS Ersatzkosten
FROM Medium
WHERE Standort = 'Magazin'
```

**6. Hörbücher (A1-V-10 = STORY-Beispiel)** – „Entwerfen Sie eine SQL-Abfrage, die alle Medien der Medienart
'Hörbuch' ausgibt, die nach 2015 erschienen sind, absteigend sortiert nach Erscheinungsjahr. [2 BE]“ Ergebnis: 52
(2024), 40 (2023), 16 (2021), 46 (2018), 5 (2016) – ohne Gleichstand im Jahr.

```sql
SELECT *
FROM Medium
WHERE Medienart = 'Hörbuch'
  AND Erscheinungsjahr > 2015
ORDER BY Erscheinungsjahr DESC
```

**7. Die teuersten (A1-V-11)** – die fünf teuersten verfügbaren Medien der Genres Krimi oder Thriller. Ergebnis: 12,
4, 14, 9, 16 (Platz 6 kostet 14,95 €, kein Gleichstand).

```sql
SELECT MedienNr, Titel, Preis
FROM Medium
WHERE (Genre = 'Krimi' OR Genre = 'Thriller')
  AND AusgeliehenBis IS NULL
ORDER BY Preis DESC
LIMIT 5
```

**8. Bedingungslogik mit Klammern (Auflösung zu A1-V-05)** – Ergebnis: 4, 5, 9, 12, 13, 14, 16.

```sql
SELECT MedienNr, Titel, Genre, Preis
FROM Medium
WHERE (Genre = 'Krimi' OR Genre = 'Thriller')
  AND Preis > 15
```

**9. Zeilen der gegebenen Abfrage (A1-V-05)** – ohne Klammern bindet AND stärker: alle 13 Krimis (auch 11 ohne Preis)
und die Thriller über 15 € (12, 13, 14, 16), zusammen 17 Zeilen. Die Regelprüfung gibt dazu nur einen Hinweis.

```sql
-- Fehlabfrage (P6): AND bindet stärker als OR
SELECT MedienNr, Titel, Genre, Preis
FROM Medium
WHERE Genre = 'Krimi' OR Genre = 'Thriller' AND Preis > 15
```

**10. Fehlersuche (A1-V-12)** – NULL-Vergleich mit `=` liefert keine Zeile.

```sql
-- Fehlabfrage (P5): Vergleich mit NULL
SELECT Titel, Standort
FROM Medium
WHERE AusgeliehenBis = NULL
```

## Abnahme-Prüfungen

| Prüfung | Erwartung |
|---|---|
| `SELECT COUNT(*) FROM Medium` | 60 |
| Anteil `AusgeliehenBis IS NULL` | 35–45 % (ist 38 %) |
| `SELECT MedienNr FROM Medium WHERE Preis IS NULL` | 11, 26, 41, 42 |
| Titel mit `COUNT(*) > 1` | genau „Die kleine Möwe Mats“, „Sommer in Moorende“, „Tod am Sielhafen“ |
| `Titel LIKE 'Der %'` | 3, 12, 21, 27, 36 |
| Beispiel 3 / mit `'Der%'` / mit `'%der %'` | 3, 12, 36 / zusätzlich 8 / zusätzlich 15, 39 |
| Beispiel 4 | 19, 20, 21, 26, 27, 28, 30, 32, 56, 57; Roman/Sachbuch 1999/2011: 22, 29, 31 |
| Beispiel 6 | 52, 40, 16, 46, 5; Hörbuch 2015: 24 |
| Magazin | 6 Medien, 5 mit Preis |
| Beispiel 9 | 13 Krimis + 4 Thriller; Thriller > 15 € / ≤ 15 €: 4 / 4 |
| Beispiel 7 | 12, 4, 14, 9, 16; Preis Platz 5 > Platz 6; teurer ausgeliehen: 13 (29,90), 5 (24,95) |
| `AusgeliehenBis <= '2026-10-12'` | 0 (alle Rückgabedaten nach dem Datenstand) |
| Titel mit Umlaut am Anfang | 0 |
