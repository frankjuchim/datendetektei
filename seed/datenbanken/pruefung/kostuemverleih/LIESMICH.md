# Kostümverleih der Theater-AG – Prüfungs-Kontext der Nachschreibklausur (eA: A + B, gA: A + B-gA; Akte 7)

## Zweck

Eigene kleine DB für die **Nachschreibklausur** (gleicher Bauplan wie die Klausur, anderer Kontext;
`docs/DS_PLANUNG.md` „Blueprint Nachschreibklausur eA – Aufgabe A/B“, Teilaufgaben **NK-A-a … h**, **NK-B-a … g**;
gA: NK-A + B-gA-Bauplan im Kostüm-Kontext). Die Daten liefern die Tabellenausschnitte des Materials, die
Musterlösungen mit Ergebnistabellen im Erwartungshorizont und die Grundlage der maschinellen SQL-Prüfung.

- **Name:** `pruefung/kostuemverleih` (Ordner `seed/datenbanken/pruefung/kostuemverleih/`, Modul
  `scripts/db/pruefung_kostuemverleih.js`). Gebaut und geprüft von `npm run db` / `npm run db:pruefen`, genutzt von
  `scripts/sql_pruefen_cli.js`. **Nie öffentlich und zur Laufzeit nicht geladen** (wie `pruefung/sanitaetsdienst`).
- **Datenquelle:** vollständig kuratiert, kein Generator: `basis.sql` = `schema.sql` + `pflicht.sql` (Pflicht-Ausleihen
  fest; weitere Probenausleihen mit einem kleinen Werkzeug ohne Überschneidung je Kostüm verteilt, feste Anzahl je
  Mitglied).
- **Kontext (Aufgabentext):** Die Theater-AG eines Gymnasiums verleiht ihren Kostümfundus an die eigenen Mitglieder für
  Proben und Aufführungen. Erfasst wird, wer welches Kostüm für welche Rolle in welchem Stück von wann bis wann
  ausgeliehen hat. Ältere Mitglieder begleiten als Patin bzw. Pate neue Mitglieder.

**Abweichungen von `VERHOER_KONTEXTE.md`:**
1. **Gleichnamige Mitglieder:** zwei Mitglieder heißen „Lasse Kück“ (9, 11a und 20, 7b, je 3 Ausleihen). Wer in NK-A-f
   nach Vor- und Nachname statt nach MitgliedNr gruppiert, erhält „Lasse Kück“ mit 6 Ausleihen auf Platz 1 (P3). Die
   Pflicht-Werte „4, 5, 6 und genau 3“ bleiben (Pauline Tebbe 6, Jana Hinners 5, Greta Schwarting 4, danach 3).
2. 26 Mitglieder und 77 Ausleihen (VERHOER_KONTEXTE: ≈ 25 bzw. ≈ 80).
3. Die Rohliste `KostuemlisteRoh` (Material B-gA) liegt als Tabelle in der DB (wie `AusbildungRoh` beim Sanitätsdienst).

## Relationenschema (Kurzschreibweise)

- Mitglied(<u>MitgliedNr</u>, Vorname, Nachname, Klasse, ↑PateNr)
- Kostuem(<u>KostuemNr</u>, Bezeichnung, Groesse, Epoche, Zustand)
- Stueck(<u>StueckNr</u>, Titel, Premiere)
- Rolle(<u>RollenNr</u>, Name, ↑StueckNr)
- Ausleihe(<u>AusleihNr</u>, ↑KostuemNr, ↑MitgliedNr, ↑RollenNr, Von, Bis)
- KostuemRolle(KostuemNr, Bezeichnung, RollenNr, Rolle, Stueck, Premiere) – zusammengelegte Tabelle **ohne Schlüssel**
- KostuemlisteRoh(Kostuem, Groesse, Rollen, Stuecke, Verantwortliche, Telefon) – Rohliste **ohne Schlüssel** (B-gA)

`PateNr` verweist auf `Mitglied.MitgliedNr` (rekursive Beziehung *istPateVon*, NULL = ohne Patin bzw. Paten). `Bis` ist
NULL, solange das Kostüm nicht zurückgegeben ist. Epoche `'Antike'`, `'Mittelalter'`, `'Barock'`, `'19. Jahrhundert'`,
`'Moderne'` · Groesse `'S'`, `'M'`, `'L'`, `'XL'` · Zustand `'gut'`, `'reparaturbedürftig'` · Klasse `'7a'` … `'12c'` ·
Datum `'JJJJ-MM-TT'`.

## Material Aufgabe B (eA) und B-gA

**Anforderungstext „Aufführungsplanung“ (NK-B-a … e):** Die Theater-AG plant ihre Aufführungen. Jedes Stück (Nummer,
Titel) wird mehrmals aufgeführt; eine Aufführung hat eine Nummer, ein Datum und eine Uhrzeit und findet an genau einem
Spielort statt (Nummer, Bezeichnung, Anzahl der Plätze). Zu jedem Stück gehören Rollen (Nummer, Name) und Requisiten
(Nummer, Bezeichnung); jede Rolle und jedes Requisit gehört zu genau einem Stück. Gespeichert wird, welches Mitglied in
welcher Aufführung welche Rolle spielt: Ein Mitglied kann in einer Aufführung mehrere kleine Rollen übernehmen, und
manche Rollen (z. B. „Chor“) werden in einer Aufführung von mehreren Mitgliedern gespielt. Für jedes Mitglied kann es
eine Zweitbesetzung geben, die bei Krankheit einspringt; ein Mitglied kann Zweitbesetzung für mehrere andere sein.
Außerdem helfen Mitglieder bei Aufführungen hinter der Bühne mit; dabei wird ihre Aufgabe gespeichert (z. B. „Licht“).

**Muster-ER:** `Stueck` (<u>StueckNr</u>, Titel) · `Auffuehrung` (<u>AuffNr</u>, Datum, Uhrzeit) · `Spielort`
(<u>OrtNr</u>, Bezeichnung, Plaetze) · `Rolle` (<u>RollenNr</u>, Name) · `Requisit` (<u>RequisitNr</u>, Bezeichnung) ·
`Mitglied` (<u>MitgliedNr</u>, Vorname, Nachname, Klasse) · *wirdAufgefuehrt* Stueck (1) – Auffuehrung (n) ·
*findetStattIn* Spielort (1) – Auffuehrung (n) · *gehoertZu* Stueck (1) – Rolle (n) · *benoetigt* Stueck (1) –
Requisit (n) · *spielt* **ternär** Mitglied (m) – Rolle (n) – Auffuehrung (p) · *vertritt* Mitglied (1, Rolle
Zweitbesetzung) – Mitglied (n, Rolle Vertretene), **rekursiv 1:n** · *hilftMit* Mitglied (n) – Auffuehrung (m) mit
**Aufgabe**. Relationen u. a. spielt(<u>↑MitgliedNr</u>, <u>↑RollenNr</u>, <u>↑AuffNr</u>) ·
Mitglied(<u>MitgliedNr</u>, Vorname, Nachname, Klasse, ↑ZweitbesetzungNr) · hilftMit(<u>↑MitgliedNr</u>, <u>↑AuffNr</u>,
Aufgabe).

**Schema-Ausschnitt für die Rückrichtung (NK-B-f):** Werkstatt(<u>WerkstattNr</u>, Bezeichnung) ·
repariert(<u>↑KostuemNr</u>, <u>↑MitgliedNr</u>, <u>↑WerkstattNr</u>, Datum) → Entitätstyp `Werkstatt`
(<u>WerkstattNr</u>, Bezeichnung) und **ternäre** Beziehung *repariert* Kostuem (n) – Mitglied (m) – Werkstatt (p) mit
dem Beziehungsattribut **Datum** (alle drei Fremdschlüssel bilden zusammen den Primärschlüssel). Nicht in den Daten.
Abweichung von VERHOER_KONTEXTE (dort `Datum` im Schlüssel, `↑WerkstattNr` nicht): so ist die Rückrichtung eindeutig.

**Szenario „Schulhomepage“ (NK-B-g, B-gA):** Die Theater-AG möchte Fotos aller Aufführungen und eine Mitgliederliste
mit Vorname, Nachname, Klasse und gespielten Rollen auf der Schulhomepage veröffentlichen.

**Rohliste `KostuemlisteRoh` (B-gA):** sechs Zeilen; Rollen, Stücke, Verantwortliche und Telefon teils mehrwertig
(„Kammerdiener, Gesandter aus Venedig“); Heiko Wendelken steht einmal mit `0000-5512` statt `0000-5521`.

## Daten im Überblick

26 Mitglieder (Paten: 1 Greta Schwarting 12a, 2 Jasper Haake 12b, 3 Aylin Rossi 11c, 5 Milan Osterloh 11a; 9 ohne
Patin bzw. Paten), 40 Kostüme (je Epoche 6–9; 5 nie ausgeliehen), 4 Stücke, 20 Rollen (5 je Stück), 77 Ausleihen
(2026-09-07 … 2027-03-15; 6 noch nicht zurückgegeben), 10 Zeilen `KostuemRolle`, 6 Zeilen `KostuemlisteRoh`.

| StueckNr | Titel | Premiere | Epochen der Kostüme |
|---|---|---|---|
| 1 | Das Fest im Spiegelsaal | 2026-11-20 | Barock |
| 2 | Nebel über dem Deich | 2027-01-29 | 19. Jahrhundert |
| 3 | Der Hof des Mondkönigs | 2027-03-19 | Mittelalter, Barock (Gesandter aus Venedig) |
| 4 | Das Orakel am Kai | 2027-06-11 | Antike, Moderne (Proben laufen) |

| MitgliedNr | Name | Klasse | Ausleihen | Besonderheit |
|---|---|---|---|---|
| 6 | Pauline Tebbe | 10b | **6** | Kostüm 15 zweimal (Ausleihe 2 und 9) |
| 13 | Jana Hinners | 10c | **5** | |
| 1 | Greta Schwarting | 12a | **4** | Patin von 5 Mitgliedern |
| 9 / 20 | Lasse Kück | 11a / 7b | 3 / 3 | gleichnamig (P3) |
| 25 | Vivien Schierholz | 12b | 0 | |

## Pflicht-Randfälle (`pflicht.sql`)

| Randfall | Daten | Für |
|---|---|---|
| NULL | 6 Ausleihen mit `Bis` NULL (Kostüme 1, 2, 6, 14, 32, 34) | NK-A-d (P5) |
| Wiederholtes Ausleihen | Kostüm 15 (Reifrockkleid rosé) von Mitglied 6 zweimal (Proben, Aufführungen) | NK-A-b (P8) |
| Anomalien | `KostuemRolle`: Premiere von „Der Hof des Mondkönigs“ in der Zeile Ritterrüstung 2027-03-12 statt 2027-03-19; Königsmantel (11) nur in einer Zeile; Justaucorps rot (17) in zwei Zeilen | NK-A-c |
| vier Tabellen | Barock-Kostüme in Stück 1 und 3 (11 Ausleihen); Barock-Rolle Marquis (2) ohne Ausleihe | NK-A-e (P2, P7) |
| HAVING + LIMIT | 6, 5, 4, dann 3 (Platz 3/4 ohne Gleichstand) | NK-A-f (P1, P3) |
| Self-Join + LIKE | Paten in 12a, 12b, 11c, 11a; 9 Mitglieder ohne Pate; 10 Mitglieder mit Pate aus Jahrgang 12 | NK-A-g |
| nie ausgeliehen | Kostüme 5, 18, 37, 38, 40 | NK-A-h |

## Eingebaute Fallen

| Falle | Wo | Ergebnis statt richtig |
|---|---|---|
| P1 WHERE ↔ HAVING | NK-A-f mit `WHERE COUNT(*) > 3` | Fehler |
| P2 Verbund | NK-A-e ohne `Rolle.RollenNr = Ausleihe.RollenNr` | Kreuzprodukt (je Ausleihe alle 20 Rollen) |
| P3 GROUP-BY-Regel | NK-A-f nach `Vorname, Nachname` gruppiert | „Lasse Kück“ mit 6 auf Platz 1 |
| P5 NULL | NK-A-d mit `Bis = NULL` | leer |
| P7 Benennung | NK-A-e: `Name` ohne Tabellenpräfix ist hier eindeutig (nur Rolle.Name), aber `StueckNr`, `RollenNr`, `KostuemNr` nicht | Fehler „mehrdeutig“ |

## Randfall-Varianten

Entfallen: Prüfungs-DBs dienen nur der Material-Prüfung; alle Randfälle liegen in der Haupt-DB (kein `varianten/`).

## Beispielabfragen (Abi-Stil)

**1. Nicht zurückgegeben (NK-A-d)** – Ergebnis: 6 Zeilen (Kettenhemd – Ole Klattenhoff, Hafenmeisterin-Uniform – Aylin
Rossi, Orakelgewand – Pauline Tebbe, Matrosenanzug – Linus Wachtendorf, Tunika – Zoe Mammen, Toga – Bente Heinemeyer).

```sql
SELECT Kostuem.Bezeichnung, Mitglied.Vorname, Mitglied.Nachname
FROM Kostuem, Ausleihe, Mitglied
WHERE Kostuem.KostuemNr = Ausleihe.KostuemNr
  AND Ausleihe.MitgliedNr = Mitglied.MitgliedNr
  AND Ausleihe.Bis IS NULL
```

**2. Barock-Ausleihen (NK-A-e, vier Tabellen)** – Ergebnis: 11 Zeilen aus „Das Fest im Spiegelsaal“ und „Der Hof des
Mondkönigs“.

```sql
SELECT Stueck.Titel, Rolle.Name, Kostuem.Bezeichnung
FROM Stueck, Rolle, Ausleihe, Kostuem
WHERE Stueck.StueckNr = Rolle.StueckNr
  AND Rolle.RollenNr = Ausleihe.RollenNr
  AND Ausleihe.KostuemNr = Kostuem.KostuemNr
  AND Kostuem.Epoche = 'Barock'
```

**3. Die drei Mitglieder mit den meisten Ausleihen (NK-A-f)** – Ergebnis: 6 Pauline Tebbe 6, 13 Jana Hinners 5,
1 Greta Schwarting 4.

```sql
SELECT Mitglied.MitgliedNr, Mitglied.Vorname, Mitglied.Nachname, COUNT(*) AS Ausleihen
FROM Mitglied, Ausleihe
WHERE Mitglied.MitgliedNr = Ausleihe.MitgliedNr
GROUP BY Mitglied.MitgliedNr, Mitglied.Vorname, Mitglied.Nachname
HAVING COUNT(*) > 3
ORDER BY COUNT(*) DESC
LIMIT 3
```

**4. Analyse (NK-A-g, Self-Join)** – „Analysieren Sie die gegebene SQL-Abfrage im Sachzusammenhang.“ Erwartet: alle
Mitglieder, deren Patin bzw. Pate in eine 12. Klasse geht, mit Name und Klasse sowie dem Namen der Patin bzw. des
Paten; Mitglieder ohne Pate fehlen. Ergebnis: 10 Zeilen (Patin Greta Schwarting, Pate Jasper Haake).

```sql
SELECT m.Vorname, m.Nachname, m.Klasse, p.Vorname AS PateVorname, p.Nachname AS PateNachname
FROM Mitglied m, Mitglied p
WHERE m.PateNr = p.MitgliedNr
  AND p.Klasse LIKE '12%'
```

**5. Nie ausgeliehen (NK-A-h), Schritt 1: alle Kostüme** – Ergebnis: 40 Zeilen.

```sql
SELECT KostuemNr, Bezeichnung
FROM Kostuem
ORDER BY KostuemNr
```

**6. Nie ausgeliehen (NK-A-h), Schritt 2: ausgeliehene Kostüme** – Ergebnis: 35 Nummern; es fehlen 5, 18, 37, 38, 40.

```sql
SELECT DISTINCT KostuemNr
FROM Ausleihe
ORDER BY KostuemNr
```

**7. Widersprüchliche Premiere (NK-A-c)** – Ergebnis: 2027-03-12 und 2027-03-19.

```sql
SELECT DISTINCT Stueck, Premiere
FROM KostuemRolle
WHERE Stueck = 'Der Hof des Mondkönigs'
```

**8. Wiederholtes Ausleihen (NK-A-b)** – Ergebnis: Kostüm 15, Mitglied 6, 2 Ausleihen.

```sql
SELECT KostuemNr, MitgliedNr, COUNT(*) AS Anzahl
FROM Ausleihe
GROUP BY KostuemNr, MitgliedNr
HAVING COUNT(*) > 1
```

**9. Gleichnamige Mitglieder (P3)** – Ergebnis: 9 Lasse Kück 11a, 20 Lasse Kück 7b.

```sql
SELECT MitgliedNr, Vorname, Nachname, Klasse
FROM Mitglied
WHERE Vorname = 'Lasse'
  AND Nachname = 'Kück'
```

**10. Aggregat in WHERE (NK-A-f)**

```sql
-- Fehlabfrage (P1): Bedingung über Gruppen gehört in HAVING
SELECT Mitglied.MitgliedNr, Mitglied.Vorname, Mitglied.Nachname
FROM Mitglied, Ausleihe
WHERE Mitglied.MitgliedNr = Ausleihe.MitgliedNr
  AND COUNT(*) > 3
GROUP BY Mitglied.MitgliedNr, Mitglied.Vorname, Mitglied.Nachname
```

**11. Vergleich mit NULL (NK-A-d)**

```sql
-- Fehlabfrage (P5): Vergleich mit NULL ist nie wahr – richtig ist IS NULL
SELECT AusleihNr, KostuemNr
FROM Ausleihe
WHERE Bis = NULL
```

## Abnahme-Prüfungen

| Prüfung | Erwartung |
|---|---|
| Zeilen | Mitglied 26, Kostuem 40, Stueck 4, Rolle 20, Ausleihe 77, KostuemRolle 10, KostuemlisteRoh 6 |
| Zeitraum / Bis ≥ Von | Von 2026-09-07 … 2027-03-15 / keine Verletzung |
| Überschneidung | kein Kostüm gleichzeitig zweimal verliehen; AusleihNr chronologisch |
| Beispiel 1 | Kostüme 1, 2, 6, 14, 32, 34 |
| Beispiel 8 | nur (15, 6) zweimal |
| Beispiel 2 | 11 Zeilen aus Stück 1 und 3; Marquis (2) ohne Ausleihe |
| Beispiel 3 | 6, 13, 1; Anzahlen 6, 5, 4, dann 3 |
| Gleichnamig | Lasse Kück 9 und 20 je 3, nach Namen 6 |
| Beispiel 4 | Pate-Klassen 11a, 11c, 12a, 12b; 10 Zeilen; 9 ohne Pate |
| nie ausgeliehen | 5, 18, 37, 38, 40 |
| KostuemRolle | Premieren 2027-03-12/2027-03-19; Königsmantel einmal, Justaucorps rot zweimal; 9 Zeilen widerspruchsfrei |
| KostuemlisteRoh | 2 Zeilen mit mehreren Rollen; Telefon von Heiko Wendelken einmal abweichend |
