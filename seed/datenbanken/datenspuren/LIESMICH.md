# Datenspuren – Akte 6 „Datenspuren“ (Finale)

## Zweck und Story

Finale (DS 12): **Verknüpfen pseudonymer Datenbestände** per Verbund und GROUP BY, Quasi-Identifikatoren, kleine Gruppen,
Re-Identifizierung – und danach die Erörterung „Durfte die Detektei das?“ (KC IK4.1/IK4.2, K44–K46).

Story (STORY.md 4.6, 7, Anhang A): Bürgermeisterin Annegret Vollmers überlässt der Detektei pseudonyme Datenexporte der
Stadt: Fahrten von StadtRad (`RadExport`), Kartenzahlungen vom Stadtfest (`FestZahlung`), einen Export der TuS-Liste
(`VereinExport`), Standort-Check-ins der städtischen WeserApp (`AppCheckin`) und einen Auszug aus dem
Einwohnerverzeichnis (`Einwohner`). In den Exporten stehen **keine Namen**, nur Tokens – aber Jahrgang, Stadtteil, Tarif,
Abteilung, Orte und Zeitstempel. Im **Schlussplädoyer** (sechs `sql`-Aufgaben) bleibt am Ende genau eine Person übrig:
**Merle Falkenrath**, Jahrgang 1988, Hafenviertel, Tischtennis beim TuS, bis 2025 Datenschutzbeauftragte der Stadt.
Den letzten Schritt liefert ein Datenschutz-Lehrstück: Die WeserApp speichert nachts, wenn kein markierter Ort in der
Nähe ist, die **nächstgelegene Adresse** – das Gerät des Phantoms „wohnt“ in der **Kranstraße 7**, und das
Einwohnerverzeichnis verrät, wer dort mit Jahrgang 1988 gemeldet ist. Zwei Unbeteiligte (Tamara Leversen, Ole Brakhage)
stehen kurz auf der Kandidatenliste, nur weil sie 1988 geboren sind und im Hafenviertel wohnen – Einstieg in die
Debatte. Beweisstück: *Steckbrief*.

## Relationenschema (Kurzschreibweise)

- Einwohner(<u>EinwohnerNr</u>, Vorname, Nachname, Jahrgang, Stadtteil, Strasse)
- RadExport(<u>KundenToken</u>, Jahrgang, Stadtteil, Tarif, StartStation, <u>Start</u>)
- FestZahlung(<u>KartenToken</u>, StandNr, <u>Zeitpunkt</u>, Betrag)
- VereinExport(<u>MitgliedToken</u>, Geburtsjahr, <u>Abteilung</u>, Stadtteil)
- AppCheckin(<u>Geraet</u>, Ort, <u>Zeitpunkt</u>)

**Keine Fremdschlüssel** – das ist der Lerngegenstand: Die Exporte stammen von verschiedenen Stellen und lassen sich
nur über **Quasi-Identifikatoren** (Jahrgang/Geburtsjahr, Stadtteil) sowie über **Zeit und Ort** verknüpfen
(`RadExport.StartStation` = `AppCheckin.Ort` und `RadExport.Start` = `AppCheckin.Zeitpunkt`; `AppCheckin.Ort` =
`Einwohner.Strasse`). `FestZahlung.StandNr` entspricht `Stand.StandNr` der DB Stadtfest (4 = Kaffeemobil), ist hier aber
kein Fremdschlüssel (die Tabelle `Stand` ist nicht Teil des Exports).

| Attribut | Bedeutung / Wertebereich |
|---|---|
| Einwohner.Strasse | Straße und Hausnummer (`'Kranstraße 7'`); mehrere Einwohner können dieselbe Adresse haben |
| KundenToken / KartenToken / MitgliedToken | `'R-0000'` / `'K-0000'` / `'V-0000'` (hexadezimal, ein Token je Person und Stelle) |
| RadExport.StartStation | Stationsname wie in StadtRad (`'Hafenkante'`) |
| VereinExport.Geburtsjahr, .Stadtteil | NULL = Angabe fehlt (nur „Nora Falter“) |
| AppCheckin.Geraet | `'WA-0000'` |
| AppCheckin.Ort | markierter Ort (`'Hafenkante'`, `'Festplatz'`, `'Fundbüro'`, `'Vereinsheim TuS'`, Stationsnamen …) **oder** nächstgelegene Adresse (`'Kranstraße 7'`) |
| Zeitpunkte | `'JJJJ-MM-TT hh:mm'`, Exportzeitraum 2026-08-21 bis 2026-09-20 |

### Ergänzungen und Abweichungen gegenüber Spec Abschnitt 9

- **Ergänzung `Einwohner.Strasse`** (neu): Ohne sie ginge der letzte Schritt des Schlussplädoyers nur über den Steckbrief
  bzw. den Rückgriff auf die TuS-Rohliste (Akte 4). Mit der Adresse führt ein Verbund `AppCheckin × Einwohner` über
  `Ort = Strasse` (plus Jahrgang/Stadtteil-Filter) eindeutig zu Merle Falkenrath – **ohne Unterabfrage**. Didaktischer
  Mehrwert: Standortdaten verraten die Wohnadresse (Datenminimierung, Speicherbegrenzung, Transparenz).
- **`AppKonto` entfällt** (war im früheren Entwurf eine Ergänzung mit Vorname/Jahrgang/Stadtteil je Gerät): Mit
  `Strasse` wird sie nicht mehr gebraucht; `AppCheckin` entspricht wieder der Spec.
- Zusammengesetzte Primärschlüssel der Exporte (Spec nennt keine) – fachlich: je Person nur eine Fahrt/Zahlung/
  Mitgliedschaft/Check-in zum selben Zeitpunkt bzw. in derselben Abteilung.
- `VereinExport.Geburtsjahr` und `.Stadtteil` NULL-fähig (Eintrag „Nora Falter“ laut Story-Bibel).

## ER-Modell (Chen)

Fünf **Entitätstypen ohne Beziehungstypen**: `Einwohner` (<u>EinwohnerNr</u>, …), `Fahrt` aus dem RadExport
(<u>KundenToken</u>, <u>Start</u>, …), `Kartenzahlung` (<u>KartenToken</u>, <u>Zeitpunkt</u>, …),
`Vereinsmitgliedschaft` (<u>MitgliedToken</u>, <u>Abteilung</u>, …), `Checkin` (<u>Geraet</u>, <u>Zeitpunkt</u>, Ort).
Genau das ist die Pointe für die Fallbesprechung: **Kein Bauplan sieht eine Verbindung vor** – die Verknüpfung entsteht
erst durch die Abfrage über gleiche Werte (Jahrgang, Stadtteil, Ort, Zeit). Fachlich steckt hinter jedem Token eine
Person (Beziehung *gehoertZu* Person 1 – n Fahrt usw.), die die Stadt bewusst weggelassen hat (Pseudonymisierung).

## Datenumfang und Verteilung (Generator)

Bau-Reihenfolge `stadtrad` → `stadtfest` → `tus` → `detektei` → `datenspuren` (DB-übergreifende Ableitungen).
Ziel ≈ 1 150 Zeilen (Spec: ≈ 800; mehr, weil der RadExport alle StadtRad-Ausleihen des Zeitraums enthält).

| Tabelle | Pflicht | Generator / Ableitung | Ziel |
|---|---|---|---|
| Einwohner | 6 | Personen aus StadtRad, Stadtfest, TuS, Detektei + Auffüllen → EinwohnerNr 1001–1250 | 250 |
| RadExport | 8 | alle übrigen Ausleihen aus StadtRad | 469 |
| FestZahlung | 9 | alle übrigen Kartenbons aus Stadtfest | ≈ 180 |
| VereinExport | 63 (vollständig) | – | 63 |
| AppCheckin | 34 | ≈ 170 | ≈ 200 |

- **Einwohner:** enthält alle Kundinnen und Kunden von StadtRad (außer KundenID 77), alle Helfer des Stadtfests (außer
  HelferNr 23), alle Mitglieder des TuS (außer „Nora Falter“) und alle Personen der Detektei-DB (außer PersonNr 13) –
  jeweils mit **gleichem Jahrgang und Stadtteil** (wo die Quelle keinen Stadtteil hat, zieht der Generator einen;
  TuS-Mitglieder bekommen den Stadtteil aus `VereinExport`). Gleicher Vor- und Nachname **und** Jahrgang in zwei
  Quellen = dieselbe Person (ein Datensatz). Rest bis 250 aus `namen.json`. Jahrgang 1930–2020; Stadtteile:
  Hafenviertel, Altstadt, Lindenhof, Mühlenfeld, Nordheide, Bahnhofsviertel je 14–18 %, Weserufer ≈ 6 %, Deichkamp ≈ 2 %.
  **Reserviert:** Jahrgang 1988 + Hafenviertel genau dreimal (Pflicht); kein Einwohner „Nora Falter“; Nachname
  `Falkenrath` nur Pflicht 1042.
- **Strasse:** `'<Straße> <Hausnummer>'` aus der Straßenliste des Stadtteils in `namen.json` (Hausnummer 1–40);
  höchstens 3 Einwohner je Adresse; **reserviert:** `'Kranstraße 7'` (nur 1042 und 1218), `'Speicherstraße 14'` (nur
  1107), `'Lotsengang 2'` (nur 1163). Andere Hausnummern der Kranstraße sind erlaubt (Falle `LIKE 'Kranstraße%'`).
- **RadExport:** eine Zeile je Ausleihe aus StadtRad: Token je KundenID (`77 → 'R-7F3A'`, `64 → 'R-21C4'`, sonst
  zufällig, eindeutig), Jahrgang/Stadtteil/Tarif aus `Kunde`, `StartStation` = `Station.Name`, `Start` unverändert.
  **Kein weiteres Token** mit 1988 + Hafenviertel + Plus (folgt aus der Reservierung in StadtRad).
- **FestZahlung:** eine Zeile je Bon mit Zahlart `'Karte'` aus Stadtfest, Betrag = Bonsumme; Token je zahlender Person
  (≈ 20 % der Tokens zahlen 2–3-mal, auch an verschiedenen Ständen). Am Kaffeemobil am 2026-08-29 zwischen 22:00 und
  22:59 **keine** Zeile (folgt aus Stadtfest).
- **VereinExport:** vollständig in `pflicht.sql` (1:1 aus `Mitglied` + `Mitgliedschaft` der DB TuS ohne passive
  Mitglieder; Tokens fest). Genau **ein** Token mit 1988 + Hafenviertel + Tischtennis (`V-2571`, Merle Falkenrath),
  eines mit 1988 + Hafenviertel + Fußball (`V-4417`, Ole Brakhage), „Nora Falter“ als `V-9952` mit NULL-Werten.
- **AppCheckin** (Geräte `'WA-0000'`, zufällig, eindeutig):
  - für ≈ 30 % der StadtRad-Kundschaft (nicht 77; 64 = Pflichtgerät `WA-1288`) ein Gerät, das bei **jeder** ihrer
    Ausleihen zum Startzeitpunkt an der Startstation eincheckt;
  - ≈ 60 weitere Check-ins an markierten Orten: `Festplatz` (2026-08-28 16:00–23:59, 2026-08-29 14:00–23:59),
    `Vereinsheim TuS` (abends 17:00–21:59), `Fundbüro` (werktags 09:00–15:59), `Rathaus`, `Bahnhofshalle`;
  - für ≈ 15 Geräte, die einem Einwohner zugeordnet sind (Zuordnung wird **nicht** gespeichert), 1–3 nächtliche
    Adress-Check-ins (00:00–05:59) an dessen `Strasse`;
  - **Sperren:** kein weiteres Gerät an `'Hafenkante'` zwischen 00:00 und 05:59 (nur Pflicht `WA-3917`, `WA-5530`);
    kein weiteres Gerät an `'Kranstraße 7'`; kein weiteres Gerät im `Fundbüro` am 2026-09-14 zwischen 10:00 und 10:59;
    kein anderes Gerät mit Check-ins an allen vier Tatorten (Hafenkante, Festplatz, Fundbüro, Vereinsheim TuS).

## Pflicht-Datensätze (`pflicht.sql`)

| Datensatz | Werte | Zweck |
|---|---|---|
| Einwohner 1042, 1107, 1163 | Merle Falkenrath (Kranstraße 7) · Tamara Leversen (Speicherstraße 14) · Ole Brakhage (Lotsengang 2) – alle 1988, Hafenviertel | die drei Kandidaten (Stufe 6) |
| Einwohner 1218 | Rune Siemers, 1961, Hafenviertel, **Kranstraße 7** | Nachbar: ohne Jahrgangsfilter liefert die Adresse zwei Personen |
| Einwohner 1190, 1231 | Merle Tönjes (2004, Nordheide) · Merle Hinsch (1988, Mühlenfeld) | Vorname allein bzw. Vorname + Jahrgang reichen nicht |
| RadExport `R-7F3A` | 1988, Hafenviertel, Plus, Hafenkante; Start 2026-09-08 01:14 / 09-09 01:32 / 09-10 01:05 / 09-11 01:48 / 09-12 01:21 | die fünf Nachtfahrten (= StadtRad 303–307) |
| RadExport `R-21C4` | 1988, Hafenviertel, **Basis**; 08-26 08:12 Alte Werft · 09-03 17:40 Fischmarkt · 09-10 07:55 Hafenkante | Tamara Leversen (= StadtRad 308–310) |
| AppCheckin `WA-3917` | Hafenkante zu allen fünf Fahrtzeiten; Vereinsheim TuS 08-25 19:02, 09-01 18:58, 09-15 19:05 (dienstags); Festplatz 08-29 21:52 und 23:06; Fundbüro 09-14 10:17; **Kranstraße 7** nachts (08-24 05:40, 09-02 04:15, 09-08 02:41, 09-09 03:05, 09-10 02:38, 09-11 03:22, 09-12 02:57, 09-16 05:52) | das Gerät des Phantoms (19 Check-ins) |
| AppCheckin `WA-5530` | Hafenkante 09-09 01:32, 09-11 01:48, 09-15 01:10 | Nachtschicht im Hafen – passt zu 2 von 5 Fahrten |
| AppCheckin `WA-1288` | Tamaras Fahrtstationen, Festplatz 08-29 22:15, Speicherstraße 14 nachts | Unbeteiligte – auch ihre Adresse liegt offen |
| AppCheckin `WA-6120`, `WA-2046`, `WA-4410` | Nachbar Rune Siemers (Kranstraße 7 abends), weitere Geräte an Festplatz, Vereinsheim, Fundbüro zu anderen Zeiten | gleiche Orte, andere Zeiten |
| FestZahlung (9) | Kaffeemobil 2026-08-29: 5 Kartenzahlungen 21:03–21:55, 4 Kartenzahlungen 23:02–23:50, **keine** 22:00–22:59 | Gegenprobe Stufe 4 (= Stadtfest-Bons 439–450, 503–512) |
| VereinExport (63) | vollständig, siehe oben | Stufe 5 |

## Schlussplädoyer (STORY.md Abschnitt 7) – Musterabfragen

Sechs `sql`-Aufgaben in der Ermittlungskonsole; jede liefert ein Indiz für die Pinnwand. Alle Abfragen sind EH-§8-konform
(nur SELECT, impliziter Verbund `FROM a, b WHERE …`, kein JOIN, keine Unterabfrage, `!=` statt `<>`, GROUP-BY-Regel
strikt, kein Alias in HAVING). Erwartete Ergebnisse gelten für die Pflicht-Daten **und** für die vollständige Haupt-DB
(Abnahme-Prüfungen unten). Spätere Stufen dürfen die Ergebnisse früherer Stufen als Literal verwenden (`'R-7F3A'`,
`'WA-3917'`) – das ist der Ermittlungsweg und ersetzt Unterabfragen.

**Stufe 1 · Welches Kundentoken steckt hinter den fünf Nachtfahrten?** (★, K17, K18, K26 · P6) – Je Nacht ein
BETWEEN, die OR-Gruppe steht in Klammern. Ergebnis: genau eine Zeile `R-7F3A | 1988 | Hafenviertel | Plus | 5`.
→ Indiz: „Das Konto ist pseudonym – aber nicht stumm.“

```sql
SELECT KundenToken, Jahrgang, Stadtteil, Tarif, COUNT(*) AS Fahrten
FROM RadExport
WHERE StartStation = 'Hafenkante'
  AND (Start BETWEEN '2026-09-08 00:00' AND '2026-09-08 04:00'
    OR Start BETWEEN '2026-09-09 00:00' AND '2026-09-09 04:00'
    OR Start BETWEEN '2026-09-10 00:00' AND '2026-09-10 04:00'
    OR Start BETWEEN '2026-09-11 00:00' AND '2026-09-11 04:00'
    OR Start BETWEEN '2026-09-12 00:00' AND '2026-09-12 04:00')
GROUP BY KundenToken, Jahrgang, Stadtteil, Tarif
```

**Stufe 2 · Wie viele Menschen teilen sich diese Merkmale?** (★, K15, K17 · P4) – Ergebnis: **ein** Token (`R-7F3A`).
Gegenprobe ohne Tarif: zwei Tokens (`R-7F3A`, `R-21C4` = Tamara Leversen). Wer stattdessen
`GROUP BY Jahrgang, Stadtteil, Tarif` mit `COUNT(*)` zählt, zählt Fahrten, nicht Menschen (P4).
→ Indiz: „Kleine Gruppen machen Personen erkennbar: Drei harmlose Angaben wirken wie ein Name.“

```sql
SELECT DISTINCT KundenToken
FROM RadExport
WHERE Jahrgang = 1988
  AND Stadtteil = 'Hafenviertel'
  AND Tarif = 'Plus'
```

**Stufe 3 · Welches Gerät war zur selben Zeit am selben Ort?** (★★, K23, K24, K26 · P2, P7) – Verbund über Ort und
Zeit. Ergebnis: `WA-3917 | 5` und `WA-5530 | 2` – nur ein Gerät passt zu **allen** fünf Fahrten.
→ Indiz: „Das Token hat ein Handy – und das Handy ist überall dabei.“

```sql
SELECT AppCheckin.Geraet, COUNT(*) AS Treffer
FROM RadExport, AppCheckin
WHERE RadExport.StartStation = AppCheckin.Ort
  AND RadExport.Start = AppCheckin.Zeitpunkt
  AND RadExport.KundenToken = 'R-7F3A'
GROUP BY AppCheckin.Geraet
ORDER BY Treffer DESC
```

**Stufe 4a · Wo war dieses Gerät sonst?** (★, K15, K21) – Ergebnis: 19 Check-ins, chronologisch: Vereinsheim TuS an drei
Dienstagabenden, Festplatz am Stadtfest-Samstag kurz vor 22:00 und kurz nach 23:00, Hafenkante in den fünf Tatnächten,
Fundbüro am 2026-09-14 um 10:17 – und nachts immer wieder **Kranstraße 7**.

```sql
SELECT Ort, Zeitpunkt
FROM AppCheckin
WHERE Geraet = 'WA-3917'
ORDER BY Zeitpunkt
```

**Stufe 4b · Gegenprobe Kaffeemobil** (★, K18, K25, K32 · P6) – Kartenzahlungen am Kaffeemobil in der Stunde
22:00–22:59. Ergebnis: **0**; dieselbe Abfrage für 21:00–21:59 liefert 5, für 23:00–23:59 liefert 4 (Pflicht-Daten;
in der Haupt-DB ≥ 3).
→ Indiz: „Eine Person an allen vier Tatorten, zur Tatzeit.“

```sql
SELECT COUNT(*) AS Kartenzahlungen
FROM FestZahlung
WHERE StandNr = 4
  AND Zeitpunkt BETWEEN '2026-08-29 22:00' AND '2026-08-29 22:59'
```

```sql
SELECT COUNT(*) AS Kartenzahlungen
FROM FestZahlung
WHERE StandNr = 4
  AND Zeitpunkt BETWEEN '2026-08-29 21:00' AND '2026-08-29 21:59'
```

**Stufe 5 · Wer aus dem TuS passt zu diesen Merkmalen?** (★, K17 · P5) – Ergebnis: genau `V-2571` (Tischtennis, passend
zu den Dienstagabend-Check-ins). Der Eintrag „Nora Falter“ (`V-9952`) hat kein Geburtsjahr und fällt heraus.
→ Indiz: „Verein, Rad und Fest gehören zu derselben Person.“

```sql
SELECT MitgliedToken, Geburtsjahr, Abteilung, Stadtteil
FROM VereinExport
WHERE Geburtsjahr = 1988
  AND Stadtteil = 'Hafenviertel'
  AND Abteilung = 'Tischtennis'
```

**Stufe 6a · Wer kommt infrage?** (★, K15, K21) – Ergebnis: drei Kandidaten, nach Nachname: Ole Brakhage (Lotsengang 2),
Merle Falkenrath (Kranstraße 7), Tamara Leversen (Speicherstraße 14). Eine „Nora Falter“ gibt es nicht.

```sql
SELECT EinwohnerNr, Vorname, Nachname, Strasse
FROM Einwohner
WHERE Jahrgang = 1988
  AND Stadtteil = 'Hafenviertel'
ORDER BY Nachname
```

**Stufe 6b · Wie heißt sie?** (★★★, K23, K17 · P2, P7) – Verbund `AppCheckin × Einwohner` über `Ort = Strasse`,
eingeschränkt auf das Gerät aus Stufe 3 und die Merkmale aus Stufe 1. Ergebnis: genau **1042 | Merle | Falkenrath |
Kranstraße 7**. Ohne die Jahrgangsbedingung erscheint zusätzlich der Nachbar Rune Siemers; ohne die Gerätebedingung
auch Tamara Leversen (ihr Gerät verrät ihre Adresse ebenso); ohne `DISTINCT` erscheint Merle achtmal (einmal je
nächtlichem Check-in, P2).
→ **Name gefunden.**

```sql
SELECT DISTINCT Einwohner.EinwohnerNr, Einwohner.Vorname, Einwohner.Nachname, Einwohner.Strasse
FROM AppCheckin, Einwohner
WHERE AppCheckin.Ort = Einwohner.Strasse
  AND AppCheckin.Geraet = 'WA-3917'
  AND Einwohner.Jahrgang = 1988
  AND Einwohner.Stadtteil = 'Hafenviertel'
```

**Meisterstück (Cold Case, ohne Punkte):** Stufen 1, 3 und 6 in **einer** Abfrage – vom Kundentoken über das Gerät zur
Adresse, ohne Unterabfrage (Tabelle `AppCheckin` zweimal mit Alias). Ergebnis: genau Merle Falkenrath.

```sql
SELECT DISTINCT e.Vorname, e.Nachname, e.Strasse
FROM RadExport r, AppCheckin a1, AppCheckin a2, Einwohner e
WHERE r.StartStation = a1.Ort
  AND r.Start = a1.Zeitpunkt
  AND a1.Geraet = a2.Geraet
  AND a2.Ort = e.Strasse
  AND r.KundenToken = 'R-7F3A'
  AND e.Jahrgang = r.Jahrgang
  AND e.Stadtteil = r.Stadtteil
```

**Lehrkraft-Hinweis:** Stufe 6a zeigt bewusst zwei Unbeteiligte; Stufe 4a/6b zeigen, dass auch deren Wohnadressen im
Export liegen (`WA-1288` → Speicherstraße 14). Gesprächsimpulse: Datenminimierung (wozu nächtliche Adress-Check-ins?),
Speicherbegrenzung, Transparenz (wussten die Nutzerinnen und Nutzer davon?), Zweckbindung (Fahndung ≠ Verkehrsplanung).

## Eingebaute Fallen

| Falle | Wo in den Daten |
|---|---|
| P2 Verbund vervielfacht | Verbund über Nicht-Schlüssel (Jahrgang/Stadtteil, Ort = Strasse) erzeugt Kandidatenmengen mit Wiederholungen → `DISTINCT`; `COUNT(*)` nach einem solchen Verbund zählt Kombinationen |
| P4 COUNT ↔ Personen | `RadExport` hat eine Zeile je Fahrt: `COUNT(*)` je Merkmalsgruppe zählt Fahrten, nicht Menschen |
| P5 NULL | `V-9952` (Nora Falter) mit Geburtsjahr/Stadtteil NULL: fällt bei `= 1988` heraus, aber auch bei `!= 1988`; `Geburtsjahr IS NULL` findet ihn |
| P6 Bedingungslogik | fünf BETWEEN-Fenster mit OR **in Klammern** (sonst gilt `StartStation = 'Hafenkante'` nur für die erste Nacht); Stunde 22:00–22:59 statt `BETWEEN … '23:00'` |
| P7 Benennung | `Jahrgang` (RadExport, Einwohner) vs. `Geburtsjahr` (VereinExport); `Stadtteil` in drei Tabellen → Präfix; `Ort` ↔ `StartStation` ↔ `Strasse` |
| P1 | „Kombinationen mit genau einer Person“: `HAVING COUNT(*) = 1` (nicht WHERE) |

## Randfall-Varianten

| Variante | Delta (IDs/Tokens ab 9001) | Entlarvte Fehlabfrage |
|---|---|---|
| `null` | VereinExport `V-9001` (Geburtsjahr NULL, Tischtennis, Hafenviertel) | „Tischtennis-Mitglieder, die nicht 1988 geboren sind“ nur mit `Geburtsjahr != 1988` (verliert NULL); „Mitglieder ohne Geburtsjahr“ mit `Geburtsjahr = NULL` |
| `gleichnamig` | Einwohner 9011 **Ole Brakhage** (Jahrgang 2001, Nordheide, Heideweg 4) | Kandidatenabgleich mit dem Verein über den **Namen** statt über Jahrgang + Stadtteil; „Adresse von Ole Brakhage“ ohne Jahrgang |
| `grenze` | FestZahlung `K-9021`, Kaffeemobil, genau `'2026-08-29 23:00'`; RadExport `R-9022` (1979, Altstadt, Basis) ab **Marktplatz** am `'2026-09-10 03:40'` | Stufe 4b mit `BETWEEN '2026-08-29 22:00' AND '2026-08-29 23:00'` (→ 1 statt 0); Stufe 1 ohne Klammern um die OR-Gruppe (→ zusätzliche Zeile `R-9022`, siehe Fehlabfrage) |
| `gleichstand` | zusätzliche Einwohner, sodass die zwei größten Gruppen (Jahrgang, Stadtteil) gleich groß sind (nach dem ersten Bau festlegen) | „die größte Gruppe“ per `ORDER BY … LIMIT 1` |
| `leer` | alle Einwohner im Stadtteil Deichkamp gelöscht; Gerät `WA-9041` nur mit Adress-Check-ins an Adressen ohne Einwohner | „Einwohner je Stadtteil“: Deichkamp erscheint nicht; Verbund über `Ort = Strasse` liefert für `WA-9041` nichts |

```sql
-- Fehlabfrage (P6): ohne Klammern gilt die Station nur für die erste Nacht
-- (auf der Übungs-DB zufällig richtig, Variante grenze entlarvt sie)
SELECT KundenToken, COUNT(*) AS Fahrten
FROM RadExport
WHERE StartStation = 'Hafenkante'
  AND Start BETWEEN '2026-09-08 00:00' AND '2026-09-08 04:00'
   OR Start BETWEEN '2026-09-09 00:00' AND '2026-09-09 04:00'
   OR Start BETWEEN '2026-09-10 00:00' AND '2026-09-10 04:00'
   OR Start BETWEEN '2026-09-11 00:00' AND '2026-09-11 04:00'
   OR Start BETWEEN '2026-09-12 00:00' AND '2026-09-12 04:00'
GROUP BY KundenToken
```

## Beispielabfragen (Abi-Stil, außerhalb des Schlussplädoyers)

**1. Wie groß sind die Gruppen?** (A6-E1-03) – Anzahl der Einwohner je Jahrgang und Stadtteil, kleinste Gruppen zuerst.

```sql
SELECT Jahrgang, Stadtteil, COUNT(*) AS Anzahl
FROM Einwohner
GROUP BY Jahrgang, Stadtteil
ORDER BY Anzahl, Jahrgang
```

**2. Allein in der Gruppe** (A6-E1-04, P1) – Kombinationen aus Jahrgang und Stadtteil mit genau einer Person; jede Zeile
ist eine eindeutig bestimmbare Person.

```sql
SELECT Jahrgang, Stadtteil
FROM Einwohner
GROUP BY Jahrgang, Stadtteil
HAVING COUNT(*) = 1
```

**3. Exporte verknüpfen** (A6-E1-06) – RadExport und VereinExport über die Quasi-Identifikatoren verbinden; Token-Paare
ohne Wiederholung. Auf den Pflicht-Daten: `R-7F3A` und `R-21C4` je mit `V-2571` (Tischtennis) und `V-4417` (Fußball) –
vier mögliche Paare, also noch keine eindeutige Zuordnung.

```sql
SELECT DISTINCT RadExport.KundenToken, VereinExport.MitgliedToken, VereinExport.Abteilung
FROM RadExport, VereinExport
WHERE RadExport.Jahrgang = VereinExport.Geburtsjahr
  AND RadExport.Stadtteil = VereinExport.Stadtteil
ORDER BY RadExport.KundenToken
```

**4. Wer ist am Stadtfest-Samstag am Festplatz eingecheckt?** – Geräte mit Anzahl der Check-ins am 2026-08-29.

```sql
SELECT Geraet, COUNT(*) AS Checkins
FROM AppCheckin
WHERE Ort = 'Festplatz'
  AND Zeitpunkt LIKE '2026-08-29%'
GROUP BY Geraet
ORDER BY Checkins DESC
```

**5. Nächtliche Adress-Check-ins** – Alle Check-ins zwischen 00:00 und 05:59 an Orten, die wie eine Adresse aussehen
(Ziffer am Ende), mit Gerät; zeigt, wie viele Wohnadressen der Export verrät. Auf den Pflicht-Daten: 10 Zeilen
(`WA-3917`, `WA-1288`).

```sql
SELECT Geraet, Ort, Zeitpunkt
FROM AppCheckin
WHERE Ort LIKE '% _%'
  AND (Ort LIKE '%0' OR Ort LIKE '%1' OR Ort LIKE '%2' OR Ort LIKE '%3' OR Ort LIKE '%4'
    OR Ort LIKE '%5' OR Ort LIKE '%6' OR Ort LIKE '%7' OR Ort LIKE '%8' OR Ort LIKE '%9')
  AND (Zeitpunkt LIKE '% 00:%' OR Zeitpunkt LIKE '% 01:%' OR Zeitpunkt LIKE '% 02:%'
    OR Zeitpunkt LIKE '% 03:%' OR Zeitpunkt LIKE '% 04:%' OR Zeitpunkt LIKE '% 05:%')
ORDER BY Geraet, Zeitpunkt
```

**6. Umsatz mit Karte je Stand** – Anzahl und Summe der Kartenzahlungen je StandNr.

```sql
SELECT StandNr, COUNT(*) AS Zahlungen, SUM(Betrag) AS Summe
FROM FestZahlung
GROUP BY StandNr
ORDER BY Summe DESC
```

**7. Abfrage analysieren** – Erwartet: Liefert für jede Abteilung des TuS, wie viele Mitgliedschaften von Personen aus
dem Hafenviertel es gibt, nur Abteilungen mit mindestens zwei solchen Mitgliedschaften, absteigend; Einträge ohne
Stadtteil (Nora Falter) zählen nicht mit.

```sql
SELECT Abteilung, COUNT(*) AS Anzahl
FROM VereinExport
WHERE Stadtteil = 'Hafenviertel'
GROUP BY Abteilung
HAVING COUNT(*) >= 2
ORDER BY Anzahl DESC
```

## Abnahme-Prüfungen (nach dem Generieren)

| Prüfung | Erwartung |
|---|---|
| Zeilen | Einwohner 250, RadExport = Anzahl StadtRad-Ausleihen (469), VereinExport 63, FestZahlung = Kartenbons Stadtfest, AppCheckin 180–230 |
| Stufe 1 | genau eine Zeile `R-7F3A`, 5 Fahrten |
| Stufe 2 | genau `R-7F3A`; ohne Tarif genau `R-7F3A`, `R-21C4` |
| Stufe 3 | erste Zeile `WA-3917` mit 5; alle übrigen Geräte ≤ 2 |
| Stufe 4b | 0 (22 Uhr); ≥ 3 (21 Uhr) und ≥ 3 (23 Uhr) |
| Stufe 5 | genau `V-2571` |
| Stufe 6a | genau 1042, 1107, 1163 |
| Stufe 6b und Meisterstück | genau Merle Falkenrath |
| `SELECT COUNT(*) FROM Einwohner WHERE Nachname = 'Falter'` | 0 |
| `SELECT EinwohnerNr FROM Einwohner WHERE Strasse = 'Kranstraße 7'` | genau 1042, 1218 |
| `SELECT DISTINCT Geraet FROM AppCheckin WHERE Ort = 'Kranstraße 7'` | genau `WA-3917`, `WA-6120` |
| Konsistenz | jeder RadExport-Datensatz entspricht einer StadtRad-Ausleihe (Token ↔ KundenID, Start, Stationsname); jede FestZahlung einem Kartenbon; Einwohner aus anderen DBs mit gleichem Jahrgang/Stadtteil |
