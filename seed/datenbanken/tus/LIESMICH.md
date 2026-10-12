# TuS – Akte 4 „Chaos im Vereinsarchiv“

## Zweck und Story

DB für Redundanz, Anomalien, Schlüssel und Zerlegung (DS 7–8): Die Beitragsliste des **TuS Weserstedt** wurde jahrelang
als Excel-Liste von wechselnden Kassenwarten gepflegt. Die Tabelle `MitgliederlisteRoh` ist dieser Export – **ohne
Schlüssel**, mit Redundanz, nicht-atomaren Zellen, Tippfehlern und widersprüchlichen Beiträgen. Daneben liegt in
derselben DB die **bereinigte, normalisierte Fassung** (Musterzerlegung), auf der auch SQL geübt wird.
Story (STORY.md 4.4, Anhang A): Zum 2026-01-01 stieg der Monatsbeitrag für Erwachsene von **12,00 € auf 14,00 €**; die
Liste wurde nur teilweise angepasst. Am 2026-04-01 hat sich das Phantom als **„Nora Falter“** (Tischtennis, Geburtsjahr
**leer**, Beitragsgruppe `Erwachsene`) in die Liste eingetragen und in *seiner* Zeile den Monatsbeitrag auf **0,00 €**
gesetzt. Zwischen 12,00 € und 14,00 € fiel ein weiterer falscher Wert nicht auf: Das Phantom hat eine
**Änderungsanomalie** ausgenutzt. Ein paar Zeilen weiter steht das echte Mitglied **Merle Falkenrath** (Tischtennis,
Geburtsjahr 1988, seit 2015) – das fällt erst in Akte 6 auf. **Ole Brakhage** (1988, Fußball) ist Mitglied und wird in
Akte 6 kurz verdächtig; Tamara Leversen ist **kein** Mitglied. Die Tischtennis-Abteilung trainiert dienstags in der
**Halle am Mühlenfeld**. Beweisstück: *Vereinsausweis*.

**Datenquelle:** vollständig kuratiert (kein Generator): `basis.sql` = `schema.sql` + `pflicht.sql`. Die Rohliste
enthält jede Anomalie gezielt an benannten Zeilen (Tabelle unten), damit Anomalie-Simulator, Zerlegungs-Puzzle und
Arbeitsblätter auf feste Datensätze verweisen können.

## Relationenschema (Kurzschreibweise)

**Rohliste** (kein Primärschlüssel – das ist der Lerngegenstand):

MitgliederlisteRoh(Mitglied, Geburtsjahr, Abteilungen, Trainer, TrainerTelefon, Beitragsgruppe, Monatsbeitrag, Halle,
HallenAdresse, Eintritt)

**Normalisiert:**

- Mitglied(<u>MitgliedNr</u>, Vorname, Nachname, Geburtsjahr, ↑Beitragsgruppe, Eintritt)
- Beitragsgruppe(<u>Gruppe</u>, Monatsbeitrag)
- Abteilung(<u>AbteilungNr</u>, Name, ↑TrainerNr, ↑HalleNr)
- Trainer(<u>TrainerNr</u>, Name, Telefon)
- Halle(<u>HalleNr</u>, Name, Adresse)
- Mitgliedschaft(<u>↑MitgliedNr</u>, <u>↑AbteilungNr</u>, Seit)

`Mitglied.Beitragsgruppe` → `Beitragsgruppe.Gruppe` (FK mit anderem Namen, natürlicher Text-Schlüssel).

## ER-Modell der normalisierten Fassung (Chen)

- **Entitätstypen:** `Mitglied` (<u>MitgliedNr</u>, Vorname, Nachname, Geburtsjahr, Eintritt), `Beitragsgruppe`
  (<u>Gruppe</u>, Monatsbeitrag), `Abteilung` (<u>AbteilungNr</u>, Name), `Trainer` (<u>TrainerNr</u>, Name, Telefon),
  `Halle` (<u>HalleNr</u>, Name, Adresse).
- **Beziehungstypen:** *gehoertZu* Mitglied (n) – Beitragsgruppe (1); *istMitgliedIn* Mitglied (n) – Abteilung (m) mit
  Beziehungsattribut **Seit** → Tabelle `Mitgliedschaft`; *leitet* Trainer (1) – Abteilung (n) (Jens Meyer leitet Fußball
  und Tennis); *trainiertIn* Abteilung (n) – Halle (1) (drei Abteilungen in der Halle am Mühlenfeld).
- Hinweis zur Benennung: Die Beziehungstabelle heißt fachlich `Mitgliedschaft` (Substantiv; Korrektur aus der alten
  Präsentation „Normalisierung“: nicht „Sportverein“).

## Daten im Überblick

| Kennzahl | Wert |
|---|---|
| Rohliste | 62 Zeilen, 51 Personen (50 verschiedene Namen); meist eine Zeile je Mitglied **und** Abteilung (Wiederholungsgruppe flachgeklopft), 3 Zeilen mit Kommalisten, 2 passive Mitglieder ohne Abteilung (alle Abteilungsspalten NULL) |
| Normalisiert | 51 Mitglieder, 63 Mitgliedschaften, 7 Abteilungen (Boule ohne Mitglieder), 6 Trainer, 5 Hallen, 5 Beitragsgruppen |
| Beitragsgruppen | Kinder 6,00 · Jugend 8,50 · Erwachsene 14,00 (bis 2025: 12,00) · Ermäßigt 7,00 · Passiv 4,00 |
| Abteilungen | 1 Fußball (Jens Meyer, Sportplatz Weseraue) · 2 Tischtennis (Birte Haschke, Halle am Mühlenfeld) · 3 Tennis (Jens Meyer, Tennisanlage Lindenhof) · 4 Judo (Ole Wittkamp, Halle am Mühlenfeld) · 5 Turnen (Anke Rosendahl, Turnhalle Schulzentrum) · 6 Handball (Sven Albers, Halle am Mühlenfeld) · 7 Boule (Gesa Thiele, Bouleplatz Weseraue) |
| Mitglieder je Abteilung | Tischtennis 14 · Fußball 14 · Turnen 13 · Handball 11 · Tennis 10 · Judo 1 · Boule 0 – **Gleichstand auf Rang 1** (eingebaut) |
| „Nora Falter“ in der normalisierten Fassung | bleibt erhalten (Mitglied 42, Geburtsjahr NULL, Beitragsgruppe `Erwachsene`): Weil der Beitrag nur noch in `Beitragsgruppe` steht, „zahlt“ sie dort automatisch 14,00 € – die Manipulation ist im neuen Schema nicht mehr möglich |
| Gleichnamige | Lukas Behrens (2011, Fußball) und Lukas Behrens (1979, Tennis) |

## Eingebaute Anomalien und Fehler (Rohliste)

| Nr. | Art | Konkrete Zeile(n) | Lernziel |
|---|---|---|---|
| A1 | **Änderungsanomalie** (Story) | Nora Falter, Tischtennis: Beitragsgruppe `Erwachsene`, Monatsbeitrag **0.00**, Geburtsjahr NULL, Eintritt 2026-04-01 | Redundanz erlaubt widersprüchliche Werte |
| A2 | Änderungsanomalie | Beitragserhöhung Erwachsene 12,00 → 14,00 (2026-01-01) nicht überall nachgetragen: Nils Detmers (Tennis), Mareike Lüders (Tennis), Wiebke Sandmann **nur** in der Turnen-Zeile (in der Tennis-Zeile 14,00) | dieselbe Person mit zwei Beiträgen |
| A3 | Änderungsanomalie | Telefon von Jens Meyer: `0000-31415`, aber in der Fußball-Zeile von Arne Kuhlmann `0000-31451` | Trainer-Daten 23-mal gespeichert |
| A4 | Inkonsistente Schreibweise | `B. Haschke` (Carla Meinen) statt `Birte Haschke`; `Tischtenis` (Kerrin Bösch); `Fussball` (Rasmus Gieseke); `Halle Am Mühlenfeld` (Rieke Gerken); `Mühlenw. 12` (Henning Abels) | Auswertungen mit `=` werden falsch |
| A5 | Widersprüchliches Datum | Keno Bultmann: Eintritt 2010-07-01 (Fußball-Zeile) und 2011-07-01 (Tennis-Zeile) | Mitglieddaten je Abteilung wiederholt |
| A6 | **Löschanomalie** | Timo Rieken ist das einzige Judo-Mitglied – tritt er aus und wird die Zeile gelöscht, gehen Abteilung Judo, Trainer Ole Wittkamp und dessen Telefon verloren | |
| A7 | **Einfügeanomalie** | Die neue Abteilung Boule (Trainerin Gesa Thiele, Bouleplatz Weseraue) kann ohne Mitglied nicht eingetragen werden – sie existiert nur in der normalisierten Fassung | |
| A8 | Nicht-atomare Werte | Tjark Hinrichs (`Fußball, Handball`), Heike Dannemann (`Turnen, Tischtennis`), Lina Weerts (`Fußball, Tennis`) – auch Trainer, Telefon, Halle, Adresse als Kommaliste | `WHERE Abteilungen = 'Tischtennis'` liefert 12 statt 14 Tischtennis-Mitglieder |
| A9 | Kein Schlüssel / Ausschnitt-Falle (P8) | `Mitglied` ist nicht eindeutig (zwei „Lukas Behrens“ schon in Zeile 1–2, Mehrfachzeilen derselben Person). (Mitglied, Abteilungen) ist in allen 62 Zeilen eindeutig, fachlich aber nicht garantiert (ein zweiter Lukas Behrens im Fußball ist jederzeit möglich) und bei passiven Mitgliedern NULL | Schlüssel nie aus den vorliegenden Daten schließen |
| A10 | NULL in der Rohliste | passive Mitglieder Imke Stührenberg, Malte Grüttner: Abteilungen/Trainer/Halle NULL | Zählen mit `COUNT(Abteilungen)` vs. `COUNT(*)` |

**Story-Abfrage (Rohliste):** `WHERE Beitragsgruppe = 'Erwachsene' AND Monatsbeitrag != 14.00` → 4 Zeilen (3 × 12,00,
1 × 0,00 Nora Falter).

### Auftragskarten für den Anomalie-Simulator (Spec 7.6.6)

| Karte | Auftrag | Was die Rohliste erzwingt | Anomalie |
|---|---|---|---|
| S1 | „Jens Meyer heißt jetzt Meyer-Kahl.“ | 23 Zeilen (Fußball, Tennis, zwei Kommazeilen) ändern; vergessene Zeile → zwei Namen | Änderung |
| S2 | „Der Beitrag für Erwachsene steigt auf 15,00 €.“ | 33 Erwachsenen-Zeilen ändern (schon jetzt uneinheitlich, A1/A2) | Änderung |
| S3 | „Timo Rieken tritt aus.“ | Zeile löschen → Judo, Ole Wittkamp und `0000-16180` verschwinden | Löschung |
| S4 | „Neue Abteilung Boule, Trainerin Gesa Thiele, Bouleplatz Weseraue, Auenweg 4.“ | Zeile ohne Mitglied nötig (Mitglied NULL) | Einfügung |
| S5 | „Die Halle am Mühlenfeld heißt ab sofort Mühlenhalle.“ | 26 Zeilen, zwei Schreibweisen der Halle, teils in Kommalisten versteckt | Änderung |

## Funktionale Abhängigkeiten (für das Zerlegungs-Puzzle)

Grundlage ist die **atomisierte** Rohliste (eine Zeile je Mitglied und Abteilung, Spalte `Abteilung` statt
`Abteilungen`), ergänzt um die künstliche `MitgliedNr` (weil `Mitglied` nicht eindeutig ist) und das Attribut `Seit`.

| Nr. | Funktionale Abhängigkeit | Fachliche Begründung |
|---|---|---|
| F1 | MitgliedNr → Vorname, Nachname, Geburtsjahr, Beitragsgruppe, Eintritt | Daten einer Person |
| F2 | Beitragsgruppe → Monatsbeitrag | Beitragsordnung |
| F3 | Abteilung → Trainer, Halle | jede Abteilung hat genau einen Trainer und eine Halle |
| F4 | Trainer → TrainerTelefon | Kontaktdaten der Person |
| F5 | Halle → HallenAdresse | Ort |
| F6 | MitgliedNr, Abteilung → Seit | Beginn der Mitgliedschaft in dieser Abteilung |

**Schlüssel der atomisierten Rohliste:** {MitgliedNr, Abteilung}. **Keine** funktionalen Abhängigkeiten (Fallen für
das Puzzle): Geburtsjahr ↛ Beitragsgruppe (Ermäßigt/Passiv), Trainer ↛ Abteilung (Jens Meyer leitet zwei),
Halle ↛ Abteilung (drei Abteilungen in derselben Halle), Mitglied (Name) ↛ Geburtsjahr (Lukas Behrens);
Geburtsjahr ↛ Abteilung (1988: Tischtennis **und** Fußball).

**Musterzerlegung** (verlustfrei, redundanzfrei; = normalisierte Fassung oben): Mitglied (F1) · Beitragsgruppe (F2) ·
Abteilung (F3, Trainer und Halle als FK) · Trainer (F4) · Halle (F5) · Mitgliedschaft (F6). Zulässige Alternative:
Trainer und Halle als Text in `Abteilung` lassen ist **nicht** redundanzfrei (F4/F5 verletzt) → Feedback „Telefon hängt
vom Trainer ab, nicht von der Abteilung – Jens Meyer stünde zweimal mit Telefon da.“

Maschinenlesbar für `zerlegen` (wird in `seed/akten/akte4.json` übernommen):

```json
{
  "attribute": ["MitgliedNr", "Vorname", "Nachname", "Geburtsjahr", "Beitragsgruppe", "Monatsbeitrag", "Eintritt",
                "Abteilung", "Seit", "Trainer", "TrainerTelefon", "Halle", "HallenAdresse"],
  "fa": [
    { "links": ["MitgliedNr"], "rechts": ["Vorname", "Nachname", "Geburtsjahr", "Beitragsgruppe", "Eintritt"] },
    { "links": ["Beitragsgruppe"], "rechts": ["Monatsbeitrag"] },
    { "links": ["Abteilung"], "rechts": ["Trainer", "Halle"] },
    { "links": ["Trainer"], "rechts": ["TrainerTelefon"] },
    { "links": ["Halle"], "rechts": ["HallenAdresse"] },
    { "links": ["MitgliedNr", "Abteilung"], "rechts": ["Seit"] }
  ],
  "schluessel": ["MitgliedNr", "Abteilung"]
}
```

## Eingebaute Fallen

| Falle | Wo |
|---|---|
| P8 Schlüssel | Ausschnitt-Falle (A9); `Mitglied` + `Geburtsjahr` ist in den Daten eindeutig, fachlich aber nicht garantiert – und bei Nora Falter ist `Geburtsjahr` NULL (taugt nicht als Schlüsselteil); `Gruppe` als natürlicher Schlüssel |
| P5 NULL | Nora Falter: `Geburtsjahr = NULL` findet nichts, `Geburtsjahr IS NULL` genau sie; `COUNT(Geburtsjahr)` < `COUNT(*)` |
| P10 Operator | Anomalie nur benennen statt an einer Zeile erläutern (A1–A7 liefern die Zeilen) |
| P6 LIKE/`=` | `Abteilungen = 'Tischtennis'` (12) vs. normalisiert (14); `LIKE '%Tisch%'` findet `Tischtenis`, aber auch nichts Falsches – im Gegensatz zu `LIKE '%ball%'` (Fußball **und** Handball) |
| P2 Vervielfachung | Halle × Abteilung × Mitgliedschaft zählt Mitgliedschaften, nicht Personen (Beispiel 8) |
| P3 Gleichnamige | zwei Lukas Behrens |
| Gleichstand | Tischtennis und Fußball je 14 Mitglieder (Rang 1) – „die größte Abteilung“ per `LIMIT 1` ist falsch |

## Randfall-Varianten (nur für SQL-Aufgaben auf der normalisierten Fassung bzw. Rohliste)

| Variante | Delta (IDs ab 901) | Entlarvte Fehlabfrage |
|---|---|---|
| `null` | zwei Rohzeilen mit Beitragsgruppe und Monatsbeitrag NULL (Neuaufnahmen ohne Angabe) | „Zeilen mit falschem Erwachsenenbeitrag“ vs. „ohne Beitrag“: `Monatsbeitrag = NULL`; Anzahl je Gruppe ohne NULL-Gruppe |
| `gleichnamig` | Mitglied 901 Svea Harms (2010, Jugend) in Tischtennis (wie Mitglied 18) | `GROUP BY Mitglied.Vorname, Mitglied.Nachname` |
| `grenze` | Mitglied 902 mit Eintritt genau 2026-01-01 (Tag der Beitragserhöhung); Mitgliedschaft mit Seit genau 2020-01-01 | `Eintritt > '2026-01-01'` für „seit der Erhöhung“; `Seit < '2020-01-01'` für „vor 2020 oder im Jahr 2020“ |
| `gleichstand` | entfällt – Gleichstand Tischtennis/Fußball ist bereits in der Haupt-DB; Aufgaben fragen „alle Abteilungen mit der höchsten Mitgliederzahl“ oder thematisieren ihn | – |
| `leer` | Halle 901 Bootshaus ohne Abteilung (Boule ohne Mitglieder ist bereits in der Haupt-DB) | „Mitglieder je Halle“: Musterlösung muss leere Hallen bewusst ausklammern |

## Beispielabfragen (Abi-Stil)

**1. Wie viele verschiedene Beiträge gibt es je Gruppe?** (Rohliste) – Ergebnis: 7 Zeilen; `Erwachsene` erscheint mit
0.0, 12.0 und 14.0 → Beleg der Änderungsanomalie.

```sql
SELECT Beitragsgruppe, Monatsbeitrag, COUNT(*) AS Zeilen
FROM MitgliederlisteRoh
GROUP BY Beitragsgruppe, Monatsbeitrag
ORDER BY Beitragsgruppe, Monatsbeitrag
```

**2. Falsche Erwachsenenbeiträge** (Rohliste, Story) – Ergebnis: 4 Zeilen (Nils Detmers, Mareike Lüders, Wiebke Sandmann
mit 12.0; Nora Falter mit 0.0).

```sql
SELECT Mitglied, Abteilungen, Monatsbeitrag, Eintritt
FROM MitgliederlisteRoh
WHERE Beitragsgruppe = 'Erwachsene'
  AND Monatsbeitrag != 14.00
ORDER BY Monatsbeitrag
```

**3. Ohne Geburtsjahr** (Rohliste, P5) – Ergebnis: genau eine Zeile, Nora Falter (`= NULL` liefert 0 Zeilen).

```sql
SELECT Mitglied, Abteilungen, Beitragsgruppe, Monatsbeitrag, Eintritt
FROM MitgliederlisteRoh
WHERE Geburtsjahr IS NULL
```

**4. Nicht-atomare Zeilen finden** (Rohliste) – Ergebnis: 3 Zeilen.

```sql
SELECT Mitglied, Abteilungen, Trainer
FROM MitgliederlisteRoh
WHERE Abteilungen LIKE '%,%'
```

**5. Mitglieder je Abteilung** (normalisiert) – Ergebnis: 6 Zeilen (Boule fehlt), Gleichstand Tischtennis/Fußball (14).

```sql
SELECT Abteilung.AbteilungNr, Abteilung.Name, COUNT(*) AS Mitglieder
FROM Abteilung, Mitgliedschaft
WHERE Abteilung.AbteilungNr = Mitgliedschaft.AbteilungNr
GROUP BY Abteilung.AbteilungNr, Abteilung.Name
ORDER BY Mitglieder DESC
```

**6. Monatliche Beitragseinnahmen** (normalisiert) – Ergebnis: eine Zahl (548.0); jedes Mitglied zahlt einmal, egal in
wie vielen Abteilungen – auch Nora Falter mit 14,00 €.

```sql
SELECT SUM(Beitragsgruppe.Monatsbeitrag) AS Einnahmen
FROM Mitglied, Beitragsgruppe
WHERE Mitglied.Beitragsgruppe = Beitragsgruppe.Gruppe
```

**7. Trainer, Abteilung und Halle** (normalisiert, drei Tabellen) – Ergebnis: 7 Zeilen.

```sql
SELECT Trainer.Name AS Trainer, Trainer.Telefon, Abteilung.Name AS Abteilung, Halle.Name AS Halle
FROM Trainer, Abteilung, Halle
WHERE Trainer.TrainerNr = Abteilung.TrainerNr
  AND Abteilung.HalleNr = Halle.HalleNr
ORDER BY Trainer.Name
```

**8. Jahrgang 1988 im Tischtennis** (normalisiert; Vorgriff auf Akte 6) – Ergebnis: genau Merle Falkenrath; Nora Falter
fehlt, weil ihr Geburtsjahr NULL ist.

```sql
SELECT Mitglied.MitgliedNr, Mitglied.Vorname, Mitglied.Nachname, Mitglied.Eintritt
FROM Mitglied, Mitgliedschaft, Abteilung
WHERE Mitglied.MitgliedNr = Mitgliedschaft.MitgliedNr
  AND Mitgliedschaft.AbteilungNr = Abteilung.AbteilungNr
  AND Abteilung.Name = 'Tischtennis'
  AND Mitglied.Geburtsjahr = 1988
```

**9. Abfrage analysieren** – Erwartet: Liefert je Halle die Anzahl der **Abteilungsmitgliedschaften** der dort
trainierenden Abteilungen (Halle am Mühlenfeld: Tischtennis + Judo + Handball = 26), absteigend; wer in zwei
Abteilungen derselben Halle ist, zählt doppelt; Hallen ohne Mitgliedschaften (Bouleplatz) fehlen.

```sql
SELECT Halle.Name, COUNT(*) AS Anzahl
FROM Halle, Abteilung, Mitgliedschaft
WHERE Halle.HalleNr = Abteilung.HalleNr
  AND Abteilung.AbteilungNr = Mitgliedschaft.AbteilungNr
GROUP BY Halle.HalleNr, Halle.Name
ORDER BY Anzahl DESC
```

## Abnahme-Prüfungen

| Prüfung | Erwartung |
|---|---|
| Zeilen | MitgliederlisteRoh 62, Mitglied 51, Mitgliedschaft 63, Abteilung 7, Trainer 6, Halle 5, Beitragsgruppe 5 |
| `SELECT COUNT(*) FROM MitgliederlisteRoh WHERE Beitragsgruppe = 'Erwachsene' AND Monatsbeitrag != 14.00` | 4 |
| `SELECT COUNT(*) FROM MitgliederlisteRoh WHERE Abteilungen LIKE '%,%'` | 3 |
| `SELECT Mitglied FROM MitgliederlisteRoh WHERE Geburtsjahr = 1988` | genau Merle Falkenrath, Ole Brakhage |
| Beispiel 8 | genau Merle Falkenrath |
| Kein Mitglied „Tamara Leversen“ | 0 Zeilen in Rohliste und `Mitglied` |
| Jede normalisierte Mitgliedschaft hat eine Entsprechung in der Rohliste (bis auf Schreibvarianten A4) | Werkzeug-Prüfung beim Erzeugen |
| `VereinExport` (DB Datenspuren) | 1:1 aus `Mitglied` + `Mitgliedschaft` ohne passive Mitglieder abgeleitet (Tokens fest, siehe `datenspuren/LIESMICH.md`) |
