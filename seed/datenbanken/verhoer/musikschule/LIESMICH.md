# Musikschule – Verhör-Kontext V4 (Verhör 4, Akte 4)

## Zweck

Eigene kleine DB für **Verhör 4** (Transfer, nüchtern, Abitur-Stil; Spec 3.1, 7.9; `VERHOER_KONTEXTE.md` V4;
`docs/DS_PLANUNG.md` „Verhör-Blueprint: Verhör 4“, Aufgaben **A4-V-01 … 12**). Schwerpunkt Redundanz, Anomalien am
Datensatz, Schlüssel beurteilen (Ausschnitt-Falle), nicht-atomare Werte, zusammengelegte Tabelle, verlustfreie und
redundanzfreie Zerlegung (eA). Die Tabellen dienen als `quelle` der `dbtabelle`-Blöcke und als Grundlage der
Interaktionen `zellen`, `anomalie` und `zerlegen` – SQL-Aufgaben gibt es in V4 nicht.

- **Name in der Plattform:** `verhoer/musikschule` (Ordner `seed/datenbanken/verhoer/musikschule/`, Modul
  `scripts/db/verhoer_musikschule.js`). **Nie öffentlich**; geladen nur für das laufende Verhör.
- **Datenquelle:** vollständig kuratiert, kein Generator: `basis.sql` = `schema.sql` + `pflicht.sql`. Jede
  Pflicht-Anomalie steht an einer festen **Zeile** (= Reihenfolge der Liste = `rowid`, Tabelle unten), damit Aufgaben,
  Auftragskarten und Arbeitsblätter auf feste Datensätze verweisen können.
- **Rahmensatz (Startkarte, STORY 6):** „Listen wie die vom TuS gibt es überall – zeig mir, dass du ihre Schwachstellen
  findest.“ (DS_PLANUNG: „Die Musikschule Weserstedt will ihre Anmeldeliste in eine Datenbank überführen und bittet um
  ein Gutachten.“)
- **Kontext (Aufgabentext):** Die Musikschule Weserstedt hat ihre Anmeldungen bisher in einer Tabellenkalkulation
  gepflegt: je Zeile eine Schülerin oder ein Schüler mit Instrument(en), Lehrkraft samt Telefonnummer,
  Unterrichtsraum, Tarif und Monatsgebühr. Vor der Umstellung auf eine Datenbank soll die Liste begutachtet werden.
- **Keine normalisierten Teiltabellen in der DB:** `VERHOER_KONTEXTE.md` legt als Schema nur die Rohliste, die
  zusammengelegte Tabelle `LehrkraftRaum` und die Vergleichstabelle `Raum` fest; die Musterzerlegung ist Lösung von
  A4-V-11/12 (steht im Aufgaben-JSON, nie in einer ausgelieferten Tabelle).

## Relationenschema (Kurzschreibweise)

- UnterrichtRoh(Schueler, Geburtsjahr, Instrumente, Lehrkraft, LehrkraftTelefon, Raum, Tarif, Monatsgebuehr) –
  **ohne Schlüssel** (Lerngegenstand)
- LehrkraftRaum(<u>LehrkraftNr</u>, Name, Telefon, Raum, Etage) – zusammengelegte Tabelle
- Raum(<u>Raum</u>, Etage) – Vergleichstabelle ohne mögliche Anomalie

`Schueler` und `Lehrkraft` als `'Vorname Nachname'`; nicht-atomare Zeilen führen `Instrumente`, `Lehrkraft`,
`LehrkraftTelefon` und `Raum` als Kommaliste in derselben Reihenfolge (wie in der TuS-Rohliste). Etage `'EG'`,
`'1. OG'`, `'2. OG'`. Die Rohliste enthält **keine NULL-Werte** (Anomalien werden nicht mit NULL-Fragen vermischt).

## Daten im Überblick

| Kennzahl | Wert |
|---|---|
| Rohliste | 30 Zeilen, 24 verschiedene Namen (25 Personen: zwei „Mira Lindemann“); 5 Personen mit zwei Zeilen; 3 nicht-atomare Zeilen |
| Tarife | Kind 32,00 (6 Zeilen) · Jugend 36,00 (13 + **1 × 38,00**) · Erwachsen 45,00 (7) · Geschwister 28,00 (3, Pia und Emil Kück) |
| Lehrkräfte | 1 Jana Albers (Klavier, Gesang; Klavierzimmer, 1. OG; `0000-41207`) · 2 Okke Tebbe (Klavier, Querflöte; Konzertsaal, EG; `0000-27461`) · 3 Heiko Bargmann (Gitarre; Bandraum, EG; `0000-52318`) · 4 Linus Hedden (Schlagzeug; Bandraum, EG; `0000-63095`) · 5 Marit Osterloh (Geige; Studio, 2. OG; `0000-36054`) · 6 Swantje Uphoff (Cello; Streicherzimmer, 1. OG; `0000-19736`) |
| Instrumente | Klavier, Gitarre, Geige, Querflöte, Schlagzeug, Cello, Gesang (7); Harfe fehlt (neues Angebot) |
| Räume | Konzertsaal, Bandraum (EG) · Klavierzimmer, Streicherzimmer (1. OG) · Studio (2. OG) – 5 Räume auf 3 Etagen |

Tarif-Regel der Musikschule (für Erläuterungen): Kind bis 11 Jahre, Jugend 12–17, Erwachsen ab 18 (Stichjahr 2026),
Geschwister-Tarif für Geschwisterkinder unabhängig vom Alter → **Geburtsjahr ↛ Tarif**.

## Welche Zeile zeigt welchen Randfall (Pflicht-Randfälle aus VERHOER_KONTEXTE V4)

| Nr. | Randfall | Zeile(n) | Daten | Für |
|---|---|---|---|---|
| M1 | **Redundanz** Lehrkraft-Telefon | 1, 3, 10, 15, 18, 23 | Telefon `0000-41207` von Jana Albers in 6 Zeilen (Zeile 10 zweimal in der Kommaliste) | A4-V-01, -03 |
| M2 | **Redundanz** Monatsgebühr | alle 30 | Monatsgebühr je Tarif in jeder Zeile wiederholt (Jugend 14-mal) | A4-V-01, -07 |
| M3 | **Änderungsanomalie** (eingebaut) | 17 | Levke Bohlken, Tarif `Jugend` mit **38.00** statt 36.00 | A4-V-07 |
| M4 | **Einfügeanomalie** | – | Harfe kommt nicht vor; ohne Anmeldung gibt es keine Zeile, in der sie stehen könnte | A4-V-06 |
| M5 | **Löschanomalie** | 8 | Taalke Haake, einzige Cello-Schülerin: einzige Zeile mit Cello, Swantje Uphoff, `0000-19736` und Streicherzimmer | A4-V-02 |
| M6 | **nicht-atomar** | 10, 16, 22 | `'Klavier, Gesang'` (Jana Albers, Jana Albers), `'Gitarre, Schlagzeug'` (Heiko Bargmann, Linus Hedden), `'Geige, Querflöte'` (Marit Osterloh, Okke Tebbe) – Lehrkraft, Telefon und Raum ebenfalls als Liste | A4-V-04 |
| M7 | **Ausschnitt-Falle** (P8) | 4 und 20 | Ausschnitt Zeile 1–12: alle 12 Namen verschieden; in der Gesamtliste zwei „Mira Lindemann“ (Zeile 4: 2011, Geige, Jugend; Zeile 20: 2007, Querflöte, Erwachsen) | A4-V-05 |
| M8 | **Mehrfachvorkommen** (P8) | 1 und 14 | Lotta Renken belegt Klavier bei Jana Albers **und** bei Okke Tebbe → (Schueler, Instrumente) nicht eindeutig | A4-V-10 |
| M9 | mehrere Zeilen je Person | 5/13, 1/14, 9/24, 6/28, 12/30 | Jarne Pundt, Lotta Renken, Sönke Engelken, Pia Kück, Greta Saathoff je zwei Zeilen; Geburtsjahr und Tarif wiederholt | A4-V-05, -11 |
| M10 | **zusammengelegte Tabelle** | `LehrkraftRaum` 3, 4 | Heiko Bargmann und Linus Hedden im Bandraum → Etage `'EG'` doppelt (Änderungsanomalie möglich, wenn der Bandraum umzieht) | A4-V-08 |
| M11 | anomaliefreie Vergleichstabelle | `Raum` | jeder Raum genau einmal mit seiner Etage | A4-V-09 |
| M12 | keine FA Instrument → Lehrkraft / Lehrkraft → Instrument | 1, 9, 14, 18, 21, 28 / 1, 3 | Klavier bei Albers und Tebbe; Albers unterrichtet Klavier und Gesang | A4-V-10, -11 |
| M13 | keine FA (SchuelerNr, Lehrkraft) → Instrument | 10 | Ida Mammen belegt Klavier **und** Gesang bei Jana Albers | A4-V-11 (Schlüssel dreiteilig) |

**Empfohlene Ausschnitte** (für `dbtabelle`-Blöcke und `zellen`):
- **A4-V-01 Redundanz:** Zeile 1–8, Spalten Schueler, Instrumente, Lehrkraft, LehrkraftTelefon, Raum, Tarif,
  Monatsgebuehr. Redundant (jedes Vorkommen eines im Ausschnitt mehrfach gespeicherten Fakts): LehrkraftTelefon und
  Raum in Zeile 1, 3 (Jana Albers) und 2, 7 (Heiko Bargmann); Monatsgebuehr in Zeile 1, 4, 5, 8 (Jugend) und 6, 7
  (Geschwister) – 14 Zellen. Der gleiche Raumname in Zeile 5 (Linus Hedden, Bandraum) ist **keine** Redundanz der
  Rohliste (andere Lehrkraft). Wer nur „ab dem zweiten Vorkommen“ wertet, legt das in der Aufgabe fest.
- **A4-V-04 nicht-atomar:** Zeile 8–16; Lösung: Instrumente, Lehrkraft, LehrkraftTelefon, Raum in Zeile 10 und 16
  (8 Zellen). Mit Zeile 22 (ganze Liste) 12 Zellen.
- **A4-V-05 Ausschnitt-Falle:** Zeile 1–12 (Namen verschieden); die Gesamtliste zeigt Zeile 4 und 20.
- **A4-V-08 zusammengelegt:** ganze Tabelle `LehrkraftRaum`; Lösung: Etage von LehrkraftNr 3 und 4.

### Auftragskarten für den Anomalie-Simulator (A4-V-03, A4-V-06; Spec 7.6.6)

| Karte | Auftrag | Was die Rohliste erzwingt | Anomalie |
|---|---|---|---|
| V4-S1 (A4-V-03) | „Lehrkraft Albers hat eine neue Telefonnummer: `0000-41299`.“ | 6 Zeilen ändern (1, 3, 15, 18, 23 und in Zeile 10 **beide** Listeneinträge); jede vergessene Stelle → zwei Telefonnummern für dieselbe Person | Änderung |
| V4-S2 (A4-V-06) | „Die Musikschule bietet ab sofort Harfe an (Lehrkraft Swantje Uphoff, Streicherzimmer), noch ohne Anmeldungen.“ | neue Zeile nur mit Schueler, Geburtsjahr, Tarif und Monatsgebuehr leer (NULL) möglich – eine „Anmeldung ohne Schüler“ | Einfügung |

Szenarien für A4-V-02 (Anomalieart zuordnen): „Taalke Haake meldet sich ab; ihre Zeile wird gelöscht.“ → Löschung
(Cello, Swantje Uphoff und ihre Telefonnummer gehen verloren, Zeile 8) · „Der Jugend-Tarif steigt auf 37,00 €.“ →
Änderung (14 Zeilen; schon jetzt uneinheitlich, Zeile 17) · „Eine neue Lehrkraft für Gesang wird eingestellt, hat aber
noch keine Schüler.“ → Einfügung.

## Funktionale Abhängigkeiten (für das Zerlegungs-Puzzle A4-V-11, eA)

Grundlage ist die **atomisierte** Rohliste (eine Zeile je Schüler, Instrument und Lehrkraft; Spalte `Instrument`
statt `Instrumente`), ergänzt um die künstlichen Nummern `SchuelerNr` (weil `Schueler` nicht eindeutig ist, M7) und
`LehrkraftNr` (wie in `LehrkraftRaum`), den in Vor- und Nachname geteilten Namen und um `Etage` aus der Tabelle
`Raum`. Die Spaltennamen der Rohliste bleiben erhalten (`Lehrkraft` = Name der Lehrkraft, `LehrkraftTelefon` =
Telefon) – die Chips im Zerlegungs-Puzzle heißen wie die Spalten, die die Schülerinnen und Schüler sehen.

| Nr. | Funktionale Abhängigkeit | Fachliche Begründung |
|---|---|---|
| F1 | SchuelerNr → Vorname, Nachname, Geburtsjahr, Tarif | Daten einer Person |
| F2 | Tarif → Monatsgebuehr | Gebührenordnung (M2/M3) |
| F3 | LehrkraftNr → Lehrkraft, LehrkraftTelefon, Raum | jede Lehrkraft hat eine Telefonnummer und einen Unterrichtsraum (M1) |
| F4 | Raum → Etage | Lage des Raums (M10) |

**Schlüssel der atomisierten Rohliste:** {SchuelerNr, Instrument, LehrkraftNr}. **Keine** funktionalen
Abhängigkeiten (Fallen für das Puzzle): Instrument ↛ Lehrkraft (Klavier bei zwei Lehrkräften, M12),
Lehrkraft ↛ Instrument (Jana Albers: Klavier und Gesang), (SchuelerNr, LehrkraftNr) ↛ Instrument (Ida Mammen, M13),
(SchuelerNr, Instrument) ↛ LehrkraftNr (Lotta Renken, M8), Raum ↛ Lehrkraft (Bandraum, M10), Geburtsjahr ↛ Tarif
(Geschwister), Schueler (Name) ↛ Geburtsjahr (Mira Lindemann, M7).

**Musterzerlegung** (verlustfrei, redundanzfrei; = `VERHOER_KONTEXTE.md` V4, Attributnamen wie oben):
Schueler(<u>SchuelerNr</u>, Vorname, Nachname, Geburtsjahr, ↑Tarif) · Tarif(<u>Tarif</u>, Monatsgebuehr) ·
Lehrkraft(<u>LehrkraftNr</u>, Lehrkraft, LehrkraftTelefon, ↑Raum) · Raum(<u>Raum</u>, Etage) ·
belegt(<u>↑SchuelerNr</u>, <u>Instrument</u>, <u>↑LehrkraftNr</u>).
Typische nicht redundanzfreie Zwischenlösung: `Lehrkraft(LehrkraftNr, Lehrkraft, LehrkraftTelefon, Raum, Etage)` =
`LehrkraftRaum` → F4 verletzt („Die Etage hängt vom Raum ab, nicht von der Lehrkraft – der Bandraum stünde zweimal mit
Etage da.“). Ohne die Spalte `Etage` (falls die Aufgabe sie weglässt) entfällt die Relation `Raum`.

Maschinenlesbar für `zerlegen` (wird in `seed/akten/akte4.json` übernommen):

```json
{
  "attribute": ["SchuelerNr", "Vorname", "Nachname", "Geburtsjahr", "Tarif", "Monatsgebuehr", "Instrument",
                "LehrkraftNr", "Lehrkraft", "LehrkraftTelefon", "Raum", "Etage"],
  "fa": [
    { "links": ["SchuelerNr"], "rechts": ["Vorname", "Nachname", "Geburtsjahr", "Tarif"] },
    { "links": ["Tarif"], "rechts": ["Monatsgebuehr"] },
    { "links": ["LehrkraftNr"], "rechts": ["Lehrkraft", "LehrkraftTelefon", "Raum"] },
    { "links": ["Raum"], "rechts": ["Etage"] }
  ],
  "schluessel": ["SchuelerNr", "Instrument", "LehrkraftNr"]
}
```

## Eingebaute Fallen

| Falle | Wo |
|---|---|
| P8 Schlüssel | Ausschnitt-Falle M7 (Schueler im Ausschnitt eindeutig, insgesamt nicht); (Schueler, Instrumente) M8; (Schueler, Geburtsjahr, Instrumente, Lehrkraft) ist in den Daten eindeutig, fachlich aber nicht garantiert und bei Kommalisten wertlos; `Raum` ist in `Raum` ein natürlicher Schlüssel, in `LehrkraftRaum` nicht (M10) |
| P10 Operator | Anomalie nur benennen statt an einer Zeile erläutern (M3, M5 liefern die Zeilen); „Redundanz“ ≠ „Anomalie“ (A4-V-07: Redundanz ist die Ursache, die Anomalie die Folge) |
| P6 Bedingungslogik | nicht-atomare Zellen: wer nach `Instrumente = 'Klavier'` sucht, übersieht Ida Mammen (Zeile 10) |
| Geschwister | Geburtsjahr bestimmt den Tarif nicht (Pia Kück 2017 und Emil Kück 2015 zahlen Geschwister-Tarif) |

## Randfall-Varianten

**Keine.** Varianten (Spec 7.4) dienen der Ergebnisprüfung von SQL-Musterlösungen; V4 enthält laut Blueprint keine
SQL-Aufgabe (`zellen`, `choice`, `anomalie`, `zerlegen`). Die Randfälle (Ausschnitt-Falle, Mehrfachvorkommen,
Änderungsanomalie) sind Pflicht-Datensätze der Haupt-DB und dort sichtbar.

## Beispielabfragen (Abi-Stil; für Lehrkraft-Material und als Abnahme)

**1. Zeilen von Jana Albers (M1)** – Ergebnis: 6 Zeilen (1, 3, 10, 15, 18, 23).

```sql
SELECT Schueler, Instrumente, LehrkraftTelefon
FROM UnterrichtRoh
WHERE Lehrkraft LIKE '%Jana Albers%'
```

**2. Gebühren je Tarif (M2/M3)** – Ergebnis: 5 Zeilen; `Jugend` erscheint mit 36.0 (13) und 38.0 (1).

```sql
SELECT Tarif, Monatsgebuehr, COUNT(*) AS Zeilen
FROM UnterrichtRoh
GROUP BY Tarif, Monatsgebuehr
ORDER BY Tarif, Monatsgebuehr
```

**3. Abweichende Jugendgebühr (M3)** – Ergebnis: Levke Bohlken, 38.0.

```sql
SELECT Schueler, Tarif, Monatsgebuehr
FROM UnterrichtRoh
WHERE Tarif = 'Jugend'
  AND Monatsgebuehr != 36.00
```

**4. Nicht-atomare Zeilen (M6)** – Ergebnis: 3 Zeilen (Ida Mammen, Jasper Holtorf, Enno Thölken).

```sql
SELECT Schueler, Instrumente, Lehrkraft
FROM UnterrichtRoh
WHERE Instrumente LIKE '%,%'
```

**5. Cello (M5)** – Ergebnis: genau Taalke Haake mit Swantje Uphoff.

```sql
SELECT Schueler, Lehrkraft, LehrkraftTelefon, Raum
FROM UnterrichtRoh
WHERE Instrumente LIKE '%Cello%'
```

**6. Ist Schueler eindeutig? (M7/M9)** – Ergebnis: 6 Namen mit je 2 Zeilen (darunter Mira Lindemann – zwei Personen).

```sql
SELECT Schueler, COUNT(*) AS Zeilen
FROM UnterrichtRoh
GROUP BY Schueler
HAVING COUNT(*) > 1
```

**7. Zwei Mira Lindemann (M7)** – Ergebnis: 2 Zeilen mit Geburtsjahr 2011 und 2007.

```sql
SELECT Schueler, Geburtsjahr, Instrumente, Tarif
FROM UnterrichtRoh
WHERE Schueler = 'Mira Lindemann'
```

**8. Ist (Schueler, Instrumente) eindeutig? (M8)** – Ergebnis: Lotta Renken, Klavier, 2.

```sql
SELECT Schueler, Instrumente, COUNT(*) AS Zeilen
FROM UnterrichtRoh
GROUP BY Schueler, Instrumente
HAVING COUNT(*) > 1
```

**9. Klavier-Lehrkräfte (M12)** – Ergebnis: Jana Albers, Okke Tebbe (Ida Mammens Kommazeile fehlt, P6).

```sql
SELECT DISTINCT Lehrkraft
FROM UnterrichtRoh
WHERE Instrumente = 'Klavier'
```

**10. Mehrfach gespeicherte Etage (M10)** – Ergebnis: Bandraum, EG, 2.

```sql
SELECT Raum, Etage, COUNT(*) AS Lehrkraefte
FROM LehrkraftRaum
GROUP BY Raum, Etage
HAVING COUNT(*) > 1
```

**11. LehrkraftRaum und Raum im Vergleich** – Ergebnis: 6 Zeilen, Etage jeweils gleich.

```sql
SELECT LehrkraftRaum.Name, LehrkraftRaum.Raum, LehrkraftRaum.Etage, Raum.Etage AS EtageRaum
FROM LehrkraftRaum, Raum
WHERE LehrkraftRaum.Raum = Raum.Raum
```

## Abnahme-Prüfungen

| Prüfung | Erwartung |
|---|---|
| Zeilen | UnterrichtRoh 30, LehrkraftRaum 6, Raum 5 |
| Zeilen von Jana Albers / Telefon | 1, 3, 10, 15, 18, 23 / überall `0000-41207` |
| Tarif × Monatsgebühr | Erwachsen 45 (7), Geschwister 28 (3), Jugend 36 (13), Jugend 38 (1), Kind 32 (6) |
| Jugend ≠ 36,00 | nur Zeile 17 (Levke Bohlken) |
| Harfe | 0 Zeilen |
| Cello / Swantje Uphoff / `0000-19736` | jeweils nur Zeile 8 |
| nicht-atomar | Zeilen 10, 16, 22 (Instrumente, Lehrkraft und Telefon als Liste) |
| Zeile 1–12 | 12 verschiedene Namen |
| Mira Lindemann | Zeile 4 (2011) und Zeile 20 (2007) |
| Schueler mehrfach | Greta Saathoff, Jarne Pundt, Lotta Renken, Mira Lindemann, Pia Kück, Sönke Engelken (je 2) |
| (Schueler, Instrumente) mehrfach | nur Lotta Renken, Klavier, 2 Zeilen, 2 Lehrkräfte |
| Klavier-Lehrkräfte | Jana Albers, Okke Tebbe |
| Lehrkraft → Telefon, Raum | in allen atomaren Zeilen widerspruchsfrei und gleich `LehrkraftRaum` |
| LehrkraftRaum Raum mehrfach | nur Bandraum (EG, 2) |
| LehrkraftRaum ↔ Raum | Etagen stimmen überein; Raum 5 Räume auf 3 Etagen |
| NULL in der Rohliste | keine |
