# Schulsanitätsdienst – Prüfungs-Kontext der Klausur (eA: Aufgabe A + B, gA: Aufgabe A + B-gA; Akte 7)

## Zweck

Eigene kleine DB für die **Klausur** (separater Termin, nicht in den 15 DS; `docs/DS_PLANUNG.md` „Blueprint Klausur eA –
Aufgabe A/B“ und „Blueprint Klausur gA – Aufgabe B-gA“, Teilaufgaben **KL-A-a … h**, **KL-B-a … g**, **KL-BgA-a … d**).
Die Daten liefern die Tabellenausschnitte des Materials, die Musterlösungen mit Ergebnistabellen im Erwartungshorizont
und die Grundlage der maschinellen SQL-Prüfung (`npm run material:sql`).

- **Name:** `pruefung/sanitaetsdienst` (Ordner `seed/datenbanken/pruefung/sanitaetsdienst/`, Modul
  `scripts/db/pruefung_sanitaetsdienst.js`). Gebaut und geprüft von `npm run db` / `npm run db:pruefen`, genutzt von
  `scripts/sql_pruefen_cli.js` (Datenbank `pruefung/sanitaetsdienst`). **Nie öffentlich und zur Laufzeit nicht
  geladen** (`PRUEFUNG_DATENBANKEN` in `src/sql/datenbanken.js` steht weder in `OEFFENTLICHE_DATENBANKEN` noch in
  `ALLE_DATENBANKEN`) – Klausurdaten gehören nicht in die Freie Ermittlung.
- **Datenquelle:** vollständig kuratiert, kein Generator: `basis.sql` = `schema.sql` + `pflicht.sql` (Verbrauchsmengen
  mit einem kleinen Werkzeug auf feste Summen gebracht, alle Pflicht-Randfälle fest).
- **Kontext (Aufgabentext):** Der Schulsanitätsdienst einer Oberschule dokumentiert seine Einsätze bei Unfällen und
  Erkrankungen im Schulalltag: wer eingesetzt war (in welcher Rolle), wo und wann der Einsatz stattfand und welches
  Material verbraucht wurde. Neue Mitglieder werden von einer erfahrenen Sanitäterin bzw. einem erfahrenen Sanitäter
  betreut.

**Abweichungen von `VERHOER_KONTEXTE.md`:**
1. **Rollenwechsel (KL-A-b):** Mit dem Primärschlüssel (SanNr, EinsatzNr) lässt sich ein Rollenwechsel während eines
   Einsatzes gar nicht speichern – genau das ist die Pointe der Teilaufgabe. Der Randfall steht deshalb im
   Aufgabentext (Sportfest am 2026-11-20, Einsatz 9: Jule Witte beginnt als Assistenz und übernimmt später die
   Erstversorgung), nicht als zweite Zeile in den Daten.
2. `Ort` kennt zusätzlich den Wert `'Sporthallenflur'` (Pflicht-Randfall „IN“ aus VERHOER_KONTEXTE).
3. Die Rohliste `AusbildungRoh` (Material B-gA) liegt als Tabelle in der DB, damit der Ausschnitt im Material
   und die Anomalie-Beispiele im Erwartungshorizont aus denselben Daten stammen.

## Relationenschema (Kurzschreibweise)

- Sanitaeter(<u>SanNr</u>, Vorname, Nachname, Klasse, Stufe, ↑BetreuerNr)
- Einsatz(<u>EinsatzNr</u>, Datum, Uhrzeit, Ort, Art)
- eingesetzt(<u>↑SanNr</u>, <u>↑EinsatzNr</u>, Rolle)
- Material(<u>MatNr</u>, Bezeichnung, Bestand)
- verbraucht(<u>↑EinsatzNr</u>, <u>↑MatNr</u>, Menge)
- EinsatzListe(EinsatzNr, Datum, Ort, SanNr, Name, Klasse, Rolle) – zusammengelegte Tabelle **ohne Schlüssel**
- AusbildungRoh(SanNr, Name, Kurse, Referent, RefTelefon, Raum) – Rohliste **ohne Schlüssel** (Aufgabe B-gA)

`BetreuerNr` verweist auf `Sanitaeter.SanNr` (rekursive Beziehung *betreut*, abweichender Name; NULL bei der Leitung).
Stufe `'Anfänger'`, `'Fortgeschritten'`, `'Leitung'` · Ort `'Sporthalle'`, `'Sporthallenflur'`, `'Pausenhof'`, `'Mensa'`,
`'Klassenraum'`, `'Treppenhaus'` · Art `'Sportunfall'`, `'Kreislauf'`, `'Schnittwunde'`, `'Prellung'`, `'Sonstiges'` ·
Rolle `'Ersthelfer'`, `'Assistenz'`, `'Dokumentation'` (je Einsatz genau eine Person als Ersthelfer) · Datum
`'JJJJ-MM-TT'`, Uhrzeit `'hh:mm'`.

## Material Aufgabe B (eA) und B-gA

**Anforderungstext „Fortbildungsprogramm“ (KL-B-a … e):** Der Sanitätsdienst bietet Fortbildungskurse an. Jeder Kurs
hat eine Nummer, einen Titel und eine Dauer in Stunden. Ein Kurs wird von genau einer externen Referentin bzw. einem
externen Referenten gehalten (Nummer, Name, Organisation); eine Referentin bzw. ein Referent kann mehrere Kurse halten.
Sanitäterinnen und Sanitäter nehmen an Kursen teil; gespeichert werden das Datum der Teilnahme und ob der Kurs bestanden
wurde. Erfahrene Sanitäterinnen und Sanitäter können außerdem in Kursen assistieren. Manche Kurse setzen andere Kurse
voraus (z. B. „AED-Training“ setzt „Erste Hilfe Grundkurs“ voraus); ein Kurs kann mehrere Voraussetzungen haben und
Voraussetzung für mehrere Kurse sein.

**Muster-ER:** `Sanitaeter` (<u>SanNr</u>, Vorname, Nachname, Klasse) · `Kurs` (<u>KursNr</u>, Titel, Dauer) ·
`Referent` (<u>ReferentNr</u>, Name, Organisation) · *haelt* Referent (1) – Kurs (n) · *nimmtTeil* Sanitaeter (n) –
Kurs (m) mit **Datum, Bestanden** · *assistiert* Sanitaeter (n) – Kurs (m) · *setztVoraus* Kurs (n, Rolle Aufbaukurs) –
Kurs (m, Rolle Voraussetzung), **rekursiv n:m**. Relationen: Referent(<u>ReferentNr</u>, Name, Organisation) ·
Kurs(<u>KursNr</u>, Titel, Dauer, ↑ReferentNr) · nimmtTeil(<u>↑SanNr</u>, <u>↑KursNr</u>, Datum, Bestanden) ·
assistiert(<u>↑SanNr</u>, <u>↑KursNr</u>) · setztVoraus(<u>↑KursNr</u>, <u>↑VoraussetzungNr</u>).

**Schema-Ausschnitt für die Rückrichtung (KL-B-f):** Funkgeraet(<u>GeraetNr</u>, Typ, ↑SanNr) ·
Ausgabe(<u>↑GeraetNr</u>, <u>↑EinsatzNr</u>, Ausgabezeit) → Sanitaeter (1) – *istZugeteilt* – (n) Funkgeraet ·
Funkgeraet (n) – *wirdAusgegeben* (Ausgabezeit) – (m) Einsatz. Nicht in den Daten.

**Szenario „digitale Einsatzprotokolle“ (KL-B-g, KL-BgA-c/d):** Der Sanitätsdienst will Einsatzprotokolle künftig in
einer Cloud-App führen: Name und Klasse der versorgten Person, Art der Verletzung bzw. Erkrankung, Maßnahmen; die
Schulleitung soll monatlich eine Statistik erhalten. Gesundheitsdaten = besondere Kategorie (Art. 9 DSGVO).

**Rohliste `AusbildungRoh` (KL-BgA-a/b):** sechs Zeilen mit mehrwertigen Zellen („Erste Hilfe, AED“), Referent und
Telefon in derselben Reihenfolge wie die Kurse, ein Raum je Zeile (unklar, für welchen Kurs). „AED“ steht einmal als
ganzer Wert, zweimal in einer Liste und einmal als „Defi (AED)“ – die Frage „Wie viele haben den AED-Kurs?“ lässt sich
weder mit `= 'AED'` (1) noch sicher mit `LIKE` beantworten. Ulf Meinecke steht in Zeile SanNr 11 mit `0000-2781`
statt `0000-2718` (Änderungsanomalie).

## Daten im Überblick

18 Sanitäterinnen und Sanitäter (2 Leitung, 5 Fortgeschritten, 11 Anfänger), 46 Einsätze (2026-11-02 … 2027-02-26,
nur Schultage, keine in den Weihnachtsferien), 94 Zeilen `eingesetzt` (1–3 je Einsatz), 12 Materialien, 167 Zeilen
`verbraucht`, 11 Zeilen `EinsatzListe`, 6 Zeilen `AusbildungRoh`.

| SanNr | Name | Klasse | Stufe | Betreuung | Besonderheit |
|---|---|---|---|---|---|
| 1 | Tjark Holtorf | 12b | Leitung | – | ohne Betreuer (fehlt im Self-Join) |
| 2 | Svea Möhlmann | 12a | Leitung | – | ohne Betreuer |
| 5 | Rune Kahrs | 11b | Fortgeschritten | 1 | 9 Sportunfälle (KL-A-g, Platz 2: Taalke Hedden mit 5) |
| 13 | Nika Kowalski | 9a | Anfänger | 4 | in `EinsatzListe` einmal mit 9b |
| 16 | Mats Engelken | 8a | Anfänger | 5 | nie eingesetzt |
| 17 | Tomke Beckhusen | 8b | Anfänger | 7 | nie eingesetzt |

| MatNr | Bezeichnung | Gesamtverbrauch | Einsätze (COUNT) |
|---|---|---|---|
| 1 | Einmalhandschuhe (Paar) | **61** | 46 |
| 2 | Kühlpack | **34** | 27 |
| 8 | Desinfektionstuch | **27** | 21 |
| 3 | Pflaster | **23** | 18 |
| 4 | Mullbinde | **21** | 16 |
| 5 | Kompresse | 20 (Grenze) | 12 |
| 9, 11, 6, 7, 10 | Traubenzucker, Fingerverband, Dreiecktuch, Rettungsdecke, Augenspüllösung | 12, 9, 8, 3, 2 | |
| 12 | Beatmungstuch | – (nie verbraucht) | 0 |

## Pflicht-Randfälle (`pflicht.sql`)

| Randfall | Daten | Für |
|---|---|---|
| Self-Join + NULL | Leitung 1 und 2 ohne Betreuer – im Self-Join 16 statt 18 Zeilen | KL-A-e (P5, P7) |
| Rollenwechsel | im Aufgabentext (Einsatz 9, Sportfest) – mit PK (SanNr, EinsatzNr) nicht speicherbar | KL-A-b (P8) |
| Anomalien | `EinsatzListe` (Woche 2027-02-08 … 12): Nika Kowalski mit 9a (Einsatz 34) und 9b (Einsatz 38); Einsatz 35 (Mensa, Kreislauf) nur in einer Zeile | KL-A-c |
| Grenzdaten | Sporthalle/Pausenhof am 2027-01-04 und 2027-01-29 (im Ergebnis), am 2026-12-18 und 2027-02-01 (knapp außerhalb) | KL-A-d (P6) |
| IN | 2027-01-11 im `Sporthallenflur` (mit `LIKE 'Sporthalle%'` fälschlich dabei) | KL-A-d |
| HAVING-Grenze | Kompresse genau 20, Mullbinde 21 | KL-A-f (`> 20`, P1/P4) |
| COUNT ↔ SUM | `COUNT(*) > 20` liefert nur Handschuhe, Kühlpack, Desinfektionstuch | KL-A-f (P4) |
| LIMIT 1 | Rune Kahrs 9 Sportunfälle, Platz 2 mit 5 | KL-A-g |
| nie eingesetzt | 16, 17 | KL-A-h |

## Eingebaute Fallen

| Falle | Wo | Ergebnis statt richtig |
|---|---|---|
| P1 WHERE ↔ HAVING | KL-A-f mit `WHERE SUM(…) > 20` | Fehler (Aggregat in WHERE) |
| P4 COUNT ↔ SUM | KL-A-f mit `COUNT(*)` | 3 statt 5 Materialien, falsche Werte |
| P5 NULL | KL-A-e: `BetreuerNr = NULL` statt `IS NULL` bei der Suche nach der Leitung | leer |
| P6 Grenzen/Logik | KL-A-d ohne Klammern (`Ort = 'Sporthalle' OR Ort = 'Pausenhof' AND …`), `Datum > '2027-01-04'`, `< '2027-01-29'` | zusätzliche Sporthallen-Einsätze bzw. fehlende Randtage |
| P7 Benennung | KL-A-e ohne Tabellenalias bzw. Verbund `s.SanNr = b.BetreuerNr` vertauscht | Fehler bzw. „wen betreut wer“ verdreht |

## Randfall-Varianten

Entfallen: Prüfungs-DBs dienen nur der Material-Prüfung; alle Randfälle liegen in der Haupt-DB (kein `varianten/`).

## Beispielabfragen (Abi-Stil)

**1. Januar-Einsätze in Sporthalle oder Pausenhof (KL-A-d)** – Ergebnis: 6 Zeilen (2027-01-04 Sportunfall … 2027-01-29
Sportunfall).

```sql
SELECT Datum, Uhrzeit, Art
FROM Einsatz
WHERE Datum BETWEEN '2027-01-01' AND '2027-01-31'
  AND Ort IN ('Sporthalle', 'Pausenhof')
ORDER BY Datum
```

**2. Betreuung (KL-A-e, Self-Join)** – Ergebnis: 16 Zeilen; die Leitung (1, 2) fehlt, weil BetreuerNr NULL ist.

```sql
SELECT s.Vorname, s.Nachname, b.Vorname AS BetreuerVorname, b.Nachname AS BetreuerNachname
FROM Sanitaeter s, Sanitaeter b
WHERE s.BetreuerNr = b.SanNr
```

**3. Verbrauch über 20 (KL-A-f)** – Ergebnis: 1 Einmalhandschuhe (Paar) 61, 2 Kühlpack 34, 8 Desinfektionstuch 27,
3 Pflaster 23, 4 Mullbinde 21.

```sql
SELECT Material.MatNr, Material.Bezeichnung, SUM(verbraucht.Menge) AS Verbrauch
FROM Material, verbraucht
WHERE Material.MatNr = verbraucht.MatNr
GROUP BY Material.MatNr, Material.Bezeichnung
HAVING SUM(verbraucht.Menge) > 20
ORDER BY Verbrauch DESC
```

**4. Analyse (KL-A-g)** – „Analysieren Sie die gegebene SQL-Abfrage im Sachzusammenhang.“ Erwartet: die Person aus dem
Sanitätsdienst, die bei den meisten Sportunfällen eingesetzt war (in irgendeiner Rolle), mit Anzahl. Ergebnis: 5 Rune
Kahrs 9.

```sql
SELECT Sanitaeter.SanNr, Sanitaeter.Vorname, Sanitaeter.Nachname, COUNT(*) AS Anzahl
FROM Sanitaeter, eingesetzt, Einsatz
WHERE Sanitaeter.SanNr = eingesetzt.SanNr
  AND eingesetzt.EinsatzNr = Einsatz.EinsatzNr
  AND Einsatz.Art = 'Sportunfall'
GROUP BY Sanitaeter.SanNr, Sanitaeter.Vorname, Sanitaeter.Nachname
ORDER BY COUNT(*) DESC
LIMIT 1
```

**5. Nie eingesetzt (KL-A-h), Schritt 1: alle Sanitäterinnen und Sanitäter** – Ergebnis: 18 Zeilen.

```sql
SELECT SanNr, Vorname, Nachname
FROM Sanitaeter
ORDER BY SanNr
```

**6. Nie eingesetzt (KL-A-h), Schritt 2: alle, die mindestens einmal eingesetzt waren** – Ergebnis: 16 Nummern; der
Vergleich mit Schritt 1 liefert 16 Mats Engelken und 17 Tomke Beckhusen (ohne Unterabfrage).

```sql
SELECT DISTINCT SanNr
FROM eingesetzt
ORDER BY SanNr
```

**7. Löschanomalie in EinsatzListe (KL-A-c)** – Ergebnis: Einsatz 35.

```sql
SELECT EinsatzNr, COUNT(*) AS Zeilen
FROM EinsatzListe
GROUP BY EinsatzNr
HAVING COUNT(*) = 1
```

**8. Widersprüchliche Klasse (KL-A-c)** – Ergebnis: 13 Nika Kowalski 9a und 13 Nika Kowalski 9b.

```sql
SELECT DISTINCT SanNr, Name, Klasse
FROM EinsatzListe
WHERE SanNr = 13
```

**9. Leitung ohne Betreuung** – Ergebnis: 1 Tjark Holtorf, 2 Svea Möhlmann.

```sql
SELECT SanNr, Vorname, Nachname
FROM Sanitaeter
WHERE BetreuerNr IS NULL
```

**10. Aggregat in WHERE (KL-A-f)**

```sql
-- Fehlabfrage (P1): Bedingung über Gruppen gehört in HAVING
SELECT Material.MatNr, Material.Bezeichnung
FROM Material, verbraucht
WHERE Material.MatNr = verbraucht.MatNr
  AND SUM(verbraucht.Menge) > 20
GROUP BY Material.MatNr, Material.Bezeichnung
```

**11. Vergleich mit NULL**

```sql
-- Fehlabfrage (P5): Vergleich mit NULL ist nie wahr – richtig ist IS NULL
SELECT SanNr, Vorname, Nachname
FROM Sanitaeter
WHERE BetreuerNr = NULL
```

## Abnahme-Prüfungen

| Prüfung | Erwartung |
|---|---|
| Zeilen | Sanitaeter 18, Einsatz 46, eingesetzt 94, Material 12, verbraucht 167, EinsatzListe 11, AusbildungRoh 6 |
| Zeitraum / Ferien / Werktage | 2026-11-02 … 2027-02-26 / keine Einsätze 2026-12-23 … 2027-01-01 / nur Mo–Fr |
| Betreuung | ohne Betreuer genau 1, 2; Self-Join 16 Paare; nie durch Anfänger |
| Ersthelfer | je Einsatz genau eine Person |
| Beispiel 1 / Grenzen | 6 Zeilen (04., 08., 13., 19., 22., 29.01.) / 2026-12-18, 2027-02-01 außerhalb, ein Sporthallenflur-Einsatz im Januar |
| Beispiel 3 / Grenze | 1 (61), 2 (34), 8 (27), 3 (23), 4 (21) / Kompresse 20; `COUNT(*) > 20` → 1, 2, 8 |
| Beatmungstuch | nie verbraucht |
| Beispiel 4 | Rune Kahrs (5) mit 9, Platz 2 mit 5 |
| nie eingesetzt | 16, 17 |
| EinsatzListe | Einsätze 34–38; 35 nur einmal; SanNr 13 mit 9a/9b, sonst passend zu Sanitaeter, Einsatz, eingesetzt |
| AusbildungRoh | 4 mehrwertige Kurs-Zellen; `= 'AED'` 1, `LIKE '%AED%'` 4; Telefon von Ulf Meinecke einmal abweichend |
