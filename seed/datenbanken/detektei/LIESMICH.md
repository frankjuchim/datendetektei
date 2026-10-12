# Detektei – Akte 5 „Der Bauplan“ (auch Akte 6)

## Zweck und Story

Die Fall-Datenbank der Detektei ist die **Referenzlösung des Architekturwettbewerbs** (DS 10) und der Überführung (DS 11):
Entitätstypen, 1:n- und n:m-Beziehungen, **rekursive Beziehungen** (Ermittler *betreut* Ermittler 1:n, Person *kennt*
Person n:m), eine **ternäre Beziehung** (*sagtAus*: Person, Fall, Ort) und Beziehungsattribute. Danach wird sie mit SQL
befragt (DS 11, Lab A5-E3-08): Self-Join mit Tabellenalias, Verbund über 3–4 Tabellen, GROUP BY/HAVING. Nur eA; im
gA-Pfad entfällt die Akte (der Steckbrief-Hinweis wird automatisch aufgedeckt).

Story (STORY.md 4.5, Anhang A): Die Pinnwand ist voll – vier Fälle (**1 Das Fundbüro, 2 Spur der Räder, 3 Die
Stadtfest-Kasse, 4 Chaos im Vereinsarchiv**), viele Personen, Orte, Aussagen und Beweisstücke. Juri Brandes hat „schon
mal angefangen“ (14 Entitätstypen, keine Kardinalität). In `verdaechtig` ist **Person 13 „Nora Falter“** (Jahrgang 1988,
Hafenviertel) in den Fällen 1–4 erfasst – als **einzige** Person in allen vier Fällen. Über `kennt` ist sie mit Menschen
an allen Tatorten verbunden (Gesa Ohlendiek, Bent Hollwedel, Selin Aksoy, Wiebke Lüttjohann) und mit Keno Bargmann aus
der IT der Stadtverwaltung – sie ist eine Insiderin. Laut Bürgermeisterin ist in Weserstedt aber keine Nora Falter
gemeldet. **Merle Falkenrath kommt in dieser DB nicht vor** (kein Spoiler vor Akte 6). Beweisstück der Akte:
*Ermittlungsnetz*.

## Relationenschema (Kurzschreibweise)

- Ermittler(<u>ErmittlerNr</u>, Name, Dienstgrad, ↑MentorNr)
- Fall(<u>FallNr</u>, Titel, Eroeffnet, Status, ↑LeiterNr)
- Person(<u>PersonNr</u>, Vorname, Nachname, Jahrgang, Stadtteil)
- kennt(<u>↑PersonNr</u>, <u>↑BekannterNr</u>, Seit)
- verdaechtig(<u>↑PersonNr</u>, <u>↑FallNr</u>, Grad)
- Ort(<u>OrtNr</u>, Bezeichnung, Stadtteil)
- Aussage(<u>↑PersonNr</u>, <u>↑FallNr</u>, <u>↑OrtNr</u>, <u>Zeitpunkt</u>, Inhalt)
- Beweisstueck(<u>BeweisNr</u>, Bezeichnung, ↑FallNr, ↑OrtNr)

Fremdschlüssel mit **anderem Namen** als der referenzierte Primärschlüssel (P7): `Ermittler.MentorNr` →
`Ermittler.ErmittlerNr` (auf die **eigene** Tabelle), `Fall.LeiterNr` → `Ermittler.ErmittlerNr`, `kennt.BekannterNr` →
`Person.PersonNr` (zwei FKs auf dieselbe Tabelle). `kennt` ist **gerichtet** (PersonNr gibt an, BekannterNr zu kennen).

| Attribut | Wertebereich |
|---|---|
| Dienstgrad | `Leitung`, `Senior`, `Junior`, `Praktikum`, `Ausbildung` (Juri) |
| Status | `offen`, `ruht`, `abgeschlossen` |
| Grad | `gering`, `mittel`, `hoch` |
| Seit | Jahr (INTEGER), NULL = unbekannt |
| Jahrgang, Stadtteil (Person) | NULL = unbekannt |
| Beweisstueck.OrtNr | NULL = Fundort unbekannt |

**Abweichung zur Spec-Tabelle (Abschnitt 9):** `Aussage` hat den Primärschlüssel (PersonNr, FallNr, OrtNr,
**Zeitpunkt**), weil dieselbe Person im selben Fall am selben Ort mehrfach aussagen kann (Pflicht: Gesa Ohlendiek,
Fall 1, Fundbüro, zweimal) – passend zu DS_PLANUNG A5-E3-07. `Dienstgrad` um `Ausbildung` ergänzt.

## ER-Modell (Chen) – Referenzlösung

**Entitätstypen** (Rechtecke, Schlüsselattribut unterstrichen):
`Ermittler` (<u>ErmittlerNr</u>, Name, Dienstgrad) · `Fall` (<u>FallNr</u>, Titel, Eroeffnet, Status) · `Person`
(<u>PersonNr</u>, Vorname, Nachname, Jahrgang, Stadtteil) · `Ort` (<u>OrtNr</u>, Bezeichnung, Stadtteil) ·
`Beweisstueck` (<u>BeweisNr</u>, Bezeichnung).

**Beziehungstypen** (Rauten) mit Kardinalitäten:

| Beziehungstyp | Beteiligte (Kardinalität) | Attribute | Art | Überführung |
|---|---|---|---|---|
| *betreut* | Ermittler als Mentor (1) – Ermittler als Betreute(r) (n) | – | **rekursiv 1:n** | FK `MentorNr` in `Ermittler` |
| *leitet* | Ermittler (1) – Fall (n) | – | 1:n | FK `LeiterNr` in `Fall` |
| *kennt* | Person (n) – Person (m) | Seit | **rekursiv n:m** | Tabelle `kennt` mit zwei FKs auf `Person` |
| *verdaechtig* | Person (n) – Fall (m) | Grad | n:m | Tabelle `verdaechtig` |
| *sagtAus* | Person (m) – Fall (n) – Ort (p) | Zeitpunkt, Inhalt | **ternär m:n:p** | Tabelle `Aussage`, Schlüssel aus drei FKs + Zeitpunkt |
| *gehoertZu* | Fall (1) – Beweisstueck (n) | – | 1:n | FK `FallNr` in `Beweisstueck` |
| *gefundenAn* | Ort (1) – Beweisstueck (n) | – | 1:n | FK `OrtNr` in `Beweisstueck` |

Begründungen im Sachzusammenhang (Kernpunkte für DS 9–11): Eine Person kann in mehreren Fällen verdächtig sein, in einem
Fall können mehrere Personen verdächtig sein → n:m; der Verdachtsgrad hängt vom **Paar** ab → Attribut am
Beziehungstyp. Ein Fall hat genau eine Leitung, eine Ermittlerin kann mehrere Fälle leiten → 1:n, FK auf der n-Seite.
Grenzen der Notation (K40): „jeder Fall hat **genau eine** Leitung“ ist mit 1 ausgedrückt, „höchstens drei Praktikanten
je Mentor“ oder „ein Beweisstück ohne bekannten Fundort“ (optionale Teilnahme) nicht – Anmerkung zum Modell nötig.
Zwei Beziehungen zwischen denselben Entitätstypen (K38) zeigt die Erweiterung im Lab (A5-E2-02: Person *meldet* Fall
neben *verdaechtig*).

## Datenumfang und Verteilung (Generator)

Ziel ≈ 300 Zeilen. Pflicht siehe unten; `Ermittler` ist vollständig.

| Tabelle | Pflicht | Generator | Ziel |
|---|---|---|---|
| Ermittler | 12 | – | 12 |
| Fall | 4 (1–4) | 8 (5–12) | 12 |
| Person | 12 | 48 → PersonNr 1–60 lückenlos | 60 |
| kennt | 16 | ≈ 64 | ≈ 80 |
| verdaechtig | 8 | ≈ 22 | ≈ 30 |
| Ort | 7 | 8 (8–15) | 15 |
| Aussage | 9 | ≈ 50 | ≈ 60 |
| Beweisstueck | 5 | ≈ 20 | ≈ 25 |

- **Fälle 5–12** (ältere Aufträge der Detektei, alle **ohne** Bezug zum Phantom): Titel aus der festen Liste
  `Die vertauschten Koffer`, `Das Rätsel im Stadtarchiv`, `Falsche Rechnungen im Hafenamt`, `Der doppelte Bauantrag`,
  `Die verschwundene Gästeliste`, `Ein Konto zu viel`, `Die Wasseruhr der Mühle`, `Der stille Teilhaber`;
  Eroeffnet 2025-11-01 bis 2026-08-31, aufsteigend mit der FallNr; Status `abgeschlossen` (6) und `ruht` (2);
  LeiterNr nur Dienstgrad `Leitung`, `Senior` oder `Junior`; **Ermittler 2, 9, 10, 11 leiten keinen Fall**.
- **Personen:** Vor-/Nachname aus `namen.json` (reservierte Nachnamen nie); Jahrgang 1940–2008, **NULL ≈ 5 %**;
  Stadtteil gleichverteilt, **NULL ≈ 5 %**; **Jahrgang 1988 + Hafenviertel ist reserviert** (nur Person 13); keine
  Gleichnamigen (nur in der Variante `gleichnamig`); kein Vorname `Merle`.
- **kennt:** jede erzeugte Person kennt 0–3 andere (gerichtet, nie sich selbst), ≈ 30 % der Paare auch umgekehrt;
  Seit 1990–2026, NULL ≈ 10 %; genau **3 erzeugte Paare mit Seit = 2020** (Grenze für „seit 2020“); niemand außer
  Person 13 kennt Personen an allen vier Phantom-Tatorten.
- **verdaechtig:** nur für Fälle 5–12, je Fall 1–4 Personen, Grad gering 50 % / mittel 30 % / hoch 20 %; erzeugte
  Personen sind **nie** in den Fällen 1–4 verdächtig und höchstens in **einem** Fall (damit Nora 4 und Lasse Engelken 2
  die einzigen Mehrfachverdächtigen sind; Variante `gleichstand` ändert das gezielt).
- **Orte 8–15:** `Bahnhofshalle` (Bahnhofsviertel), `Stadtarchiv` (Altstadt), `Hafenamt` (Hafenviertel), `Schulzentrum`
  (Nordheide), `Café am Lindenplatz` (Lindenhof), `Lagerhalle 3` (Deichkamp), `Weserpromenade` (Weserufer),
  `Alte Mühle` (Mühlenfeld). Bezeichnungen eindeutig.
- **Aussagen:** nur Fälle 5–12, Zeitpunkt nach `Eroeffnet` (09:00–19:59), 3–8 je Fall; genau **3 Fälle**, in denen eine
  Person am selben Ort zweimal aussagt; Inhalt aus Satzbausteinen (neutral, kurz).
- **Beweisstücke:** 1–4 je Fall 5–12, Bezeichnung aus fester Liste (`Quittung`, `Schlüsselkopie`, `Fotokopie`,
  `USB-Stick`, `Notizzettel`, `Gästebuch`, `Lieferschein`, `Briefumschlag`), OrtNr **NULL ≈ 10 %**.

## Pflicht-Datensätze (`pflicht.sql`)

| Datensatz | Werte | Zweck |
|---|---|---|
| Ermittler 1–12 | 1 Edda Lorenz (Leitung, Mentor NULL) · 2 Juri Brandes (Ausbildung, Mentor 1) · 3 Maren Kolthoff, 4 Helge Saathoff (Senior, Mentor 1) · 5–8 Junior · 9–11 Praktikum · 12 Ulf Witte (Senior, Mentor NULL) | rekursive Beziehung, zwei NULL-Mentoren |
| Fall 1–4 | Das Fundbüro (2026-09-21, Leitung 3) · Spur der Räder (2026-09-22, 4) · Die Stadtfest-Kasse (2026-09-28, 3) · Chaos im Vereinsarchiv (2026-10-05, 1); alle `offen` | Phantom-Fälle |
| Ort 1–7 | Fundbüro, Detektei, Rathaus (Altstadt) · Hafenkante (Hafenviertel) · Festplatz (Weserufer) · Vereinsheim TuS, Halle am Mühlenfeld (Mühlenfeld) | Tatorte |
| Person **13** | Nora Falter, 1988, Hafenviertel | Tarnname des Phantoms |
| Personen 5, 8, 17, 21, 22, 27, 30, 34 | Gesa Ohlendiek (Fundbüro) · Bent Hollwedel (StadtRad) · Sönke Ahlers (StadtRad-Werkstatt) · Frauke Melchers (Festausschuss) · Selin Aksoy (Kaffeemobil) · Wiebke Lüttjohann (Kassenwartin TuS) · Keno Bargmann (IT der Stadtverwaltung) · Birte Haschke (Trainerin Tischtennis) | Menschen an den Tatorten |
| Personen 41, 42, 43 | Jarne Kampen (Fall 2, gering) · Lasse Engelken (Fall 1 und 3, gering) · Henning Abels (Fall 4, gering) | Ablenkungen |
| kennt | Nora → 5, 8, 22, 27, 30 (alle seit 2026); 22 → 13, 34 → 13 (2026); weitere Bekanntschaften zwischen den Nebenfiguren | Netzwerk |
| verdaechtig | Nora in 1, 2, 3 (hoch), 4 (mittel) | einzige Person in allen vier Fällen |
| Aussage | 9 Aussagen zu den Fällen 1–4, darunter Gesa Ohlendiek zweimal (Fall 1, Fundbüro, 09-21 und 09-23) | ternäre Beziehung, Schlüssel mit Zeitpunkt |
| Beweisstueck 1–5 | Fundbuch-Seite (Fall 1, Fundbüro) · Schloss-Code (2, Hafenkante) · Kassenbon (3, Festplatz) · Vereinsausweis (4, Vereinsheim TuS) · Nachtfalter-Skizze (2, Ort NULL) | Pinnwand; NULL-Fundort |

## Eingebaute Fallen

| Falle | Wo in den Daten |
|---|---|
| P7 Benennung/Alias | Self-Join `Ermittler e, Ermittler m` (MentorNr ≠ ErmittlerNr im Namen); `Person p, kennt k, Person b` – ohne Alias mehrdeutig; `Stadtteil` in Person **und** Ort |
| P5 NULL | Edda Lorenz und Ulf Witte verschwinden im Self-Join (MentorNr NULL); Beweisstück 5 verschwindet im Verbund mit `Ort`; `MentorNr = NULL` liefert nichts |
| P2 Vervielfachung | Person × verdaechtig × Aussage: Gesa Ohlendiek erscheint doppelt; „Anzahl Verdachtsfälle“ über einen Verbund mit `Aussage` zählt Aussagen mit |
| P1/P3 | „in allen vier Fällen“ = `WHERE FallNr IN (1, 2, 3, 4)` + `HAVING COUNT(*) = 4`; Gruppierung nach Schlüssel (Variante `gleichnamig`) |
| P8 Schlüssel | (PersonNr, FallNr, OrtNr) als Schlüssel von `Aussage` scheitert an Gesas zwei Aussagen |
| P9 Überführung | `kennt` und `verdaechtig` brauchen eigene Tabellen; *betreut* nicht (FK in `Ermittler`); FK von *leitet* auf der n-Seite (`Fall`) |

## Randfall-Varianten

| Variante | Delta (IDs ab 9001; Ermittler ab 901) | Entlarvte Fehlabfrage |
|---|---|---|
| `null` | Ermittler 901 Junior **ohne Mentor**; Person 9001 mit Jahrgang und Stadtteil NULL, verdächtig in Fall 5; Beweisstück 9002 (Fall 1) mit OrtNr NULL | „Ermittler ohne Mentor“ mit `MentorNr = NULL`; „Beweisstücke zu Fall 1 mit Fundort“ – wer „alle Beweisstücke“ verlangt, verliert 9002 im Verbund |
| `gleichnamig` | Person 9011 **Nora Falter** (Jahrgang 1959, Nordheide), verdächtig nur in Fall 2 | „Wer ist in allen vier Fällen verdächtig?“ mit `GROUP BY Person.Vorname, Person.Nachname` → 5 statt 4 Treffer, Ergebnis leer (P3); „Wen kennt Nora Falter?“ über den Namen statt PersonNr 13 |
| `grenze` | kennt (42 → 5, Seit 2020); Fall 9021 mit Eroeffnet genau 2026-01-01 | „Bekanntschaften seit 2020“ mit `Seit > 2020`; „Fälle aus 2026“ mit `Eroeffnet > '2026-01-01'` |
| `gleichstand` | Person 9031 verdächtig in Fall 5 und 6 (gleichauf mit Lasse Engelken auf Rang 2) | „die zwei Personen mit den meisten Verdachtsfällen (bei Gleichstand alle)“ per `LIMIT 2` |
| `leer` | Fall 9041 ohne Verdächtige, Aussagen und Beweisstücke; Ermittler 902 ohne geleiteten Fall; Ort 9042 ohne Aussage | „Fälle je Leitung“, „Aussagen je Ort“: Musterlösung muss festhalten, dass leere Gruppen im impliziten Verbund fehlen |

```sql
-- Fehlabfrage (Variante gleichnamig): nach Namen statt nach Schlüssel gruppiert
SELECT Person.Vorname, Person.Nachname, COUNT(*) AS Faelle
FROM Person, verdaechtig
WHERE Person.PersonNr = verdaechtig.PersonNr
  AND verdaechtig.FallNr IN (1, 2, 3, 4)
GROUP BY Person.Vorname, Person.Nachname
HAVING COUNT(*) = 4
```

## Beispielabfragen (Abi-Stil)

**1. Wer betreut wen?** (rekursiv 1:n, Self-Join) – „Entwerfen Sie eine SQL-Abfrage, die zu jeder Ermittlerin und jedem
Ermittler den Namen der betreuenden Person ausgibt.“ Ergebnis: 10 Zeilen; Edda Lorenz und Ulf Witte fehlen (MentorNr NULL).

```sql
SELECT e.Name AS Ermittler, m.Name AS Mentor
FROM Ermittler e, Ermittler m
WHERE e.MentorNr = m.ErmittlerNr
ORDER BY m.Name, e.Name
```

**2. In allen vier Fällen verdächtig** – Ergebnis: genau Person 13, Nora Falter.

```sql
SELECT Person.PersonNr, Person.Vorname, Person.Nachname
FROM Person, verdaechtig
WHERE Person.PersonNr = verdaechtig.PersonNr
  AND verdaechtig.FallNr IN (1, 2, 3, 4)
GROUP BY Person.PersonNr, Person.Vorname, Person.Nachname
HAVING COUNT(*) = 4
```

**3. Wen kennt Nora Falter?** (rekursiv n:m, zwei Aliase auf `Person`) – Ergebnis: 5 Zeilen (Aksoy, Bargmann,
Hollwedel, Lüttjohann, Ohlendiek), alle seit 2026.

```sql
SELECT b.Vorname, b.Nachname, b.Stadtteil, k.Seit
FROM Person p, kennt k, Person b
WHERE p.PersonNr = k.PersonNr
  AND k.BekannterNr = b.PersonNr
  AND p.PersonNr = 13
ORDER BY b.Nachname
```

**4. Bekanntschaften seit 2020** (DS_PLANUNG A5-E3-08) – Vor- und Nachname aller Personen mit Vor- und Nachname ihrer
Bekannten, nur Bekanntschaften seit 2020, sortiert nach Nachname. Ergebnis auf den Pflicht-Daten: 9 Zeilen.

```sql
SELECT p.Vorname, p.Nachname, b.Vorname AS BekannterVorname, b.Nachname AS BekannterNachname, k.Seit
FROM Person p, kennt k, Person b
WHERE p.PersonNr = k.PersonNr
  AND k.BekannterNr = b.PersonNr
  AND k.Seit >= 2020
ORDER BY p.Nachname
```

**5. Mehrfach verdächtig** (DS_PLANUNG A5-E1-08) – Personen, die in mehr als einem Fall verdächtig sind, mit Anzahl.
Ergebnis: Nora Falter 4, Lasse Engelken 2.

```sql
SELECT Person.PersonNr, Person.Vorname, Person.Nachname, COUNT(*) AS Faelle
FROM Person, verdaechtig
WHERE Person.PersonNr = verdaechtig.PersonNr
GROUP BY Person.PersonNr, Person.Vorname, Person.Nachname
HAVING COUNT(*) > 1
ORDER BY Faelle DESC
```

**6. Wer hat wo in welchem Fall ausgesagt?** (ternäre Beziehung, vier Tabellen) – Ergebnis auf den Pflicht-Daten:
9 Zeilen, chronologisch.

```sql
SELECT Person.Vorname, Person.Nachname, Fall.Titel, Ort.Bezeichnung, Aussage.Zeitpunkt
FROM Person, Aussage, Fall, Ort
WHERE Person.PersonNr = Aussage.PersonNr
  AND Aussage.FallNr = Fall.FallNr
  AND Aussage.OrtNr = Ort.OrtNr
ORDER BY Aussage.Zeitpunkt
```

**7. Fälle je Leitung** – Ergebnis auf den Pflicht-Daten: Maren Kolthoff 2, Edda Lorenz 1, Helge Saathoff 1.

```sql
SELECT Ermittler.ErmittlerNr, Ermittler.Name, COUNT(*) AS Faelle
FROM Ermittler, Fall
WHERE Ermittler.ErmittlerNr = Fall.LeiterNr
GROUP BY Ermittler.ErmittlerNr, Ermittler.Name
ORDER BY Faelle DESC, Ermittler.Name
```

**8. Abfrage analysieren** – Erwartet: Liefert für jeden Stadtteil, in dem ein Beweisstück zu einem der Fälle 1–4
gefunden wurde, die Anzahl dieser Beweisstücke; Beweisstücke ohne bekannten Fundort (Nachtfalter-Skizze) und
Stadtteile ohne Fund erscheinen nicht.

```sql
SELECT Ort.Stadtteil, COUNT(*) AS Beweisstuecke
FROM Beweisstueck, Ort
WHERE Beweisstueck.OrtNr = Ort.OrtNr
  AND Beweisstueck.FallNr BETWEEN 1 AND 4
GROUP BY Ort.Stadtteil
```

## Abnahme-Prüfungen (nach dem Generieren)

| Prüfung | Erwartung |
|---|---|
| Zeilen | Ermittler 12, Fall 12, Person 60, Ort 15; kennt 70–90, verdaechtig 25–35, Aussage 50–70, Beweisstueck 20–30 |
| Beispiel 2 | genau Person 13 |
| Beispiel 5 | genau 13 (4) und 42 (2) |
| `SELECT COUNT(*) FROM Person WHERE Nachname = 'Falkenrath' OR Vorname = 'Merle'` | 0 |
| `SELECT PersonNr FROM Person WHERE Jahrgang = 1988 AND Stadtteil = 'Hafenviertel'` | genau 13 |
| `SELECT COUNT(*) FROM verdaechtig WHERE FallNr IN (1, 2, 3, 4)` | 8 |
| `SELECT COUNT(*) FROM Ermittler WHERE MentorNr IS NULL` | 2 |
| `SELECT COUNT(*) FROM kennt WHERE Seit = 2020` | 3 |
| Self-Join-Kreise | kein Ermittler ist (indirekt) sein eigener Mentor |
| `Datenspuren.Einwohner` | enthält alle Personen dieser DB außer Nora Falter mit gleichem Jahrgang/Stadtteil (sofern nicht NULL) |
