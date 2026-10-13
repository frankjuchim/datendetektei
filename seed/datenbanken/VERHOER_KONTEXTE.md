# Kontexte der Verhöre, der Generalprobe und der Klausuren

Verhöre (Bosse), Lab-Generalprobe, Generalprobe und Klausuren nutzen **eigene kleine Datenbanken in neuen,
nüchternen Kontexten** (Transfer, Spec 3.1 und 9). Die Story erscheint dort höchstens in **einem Rahmensatz** auf der
Startkarte (STORY.md Abschnitt 6). Dieses Dokument legt je Kontext das Relationenschema, den Sachzusammenhang, die
Zielkompetenzen und die **Pflicht-Randfälle** fest, die die Aufgaben aus `docs/DS_PLANUNG.md` (Verhör- und
Klausur-Blueprints) lösbar und trennscharf machen. Die SQL-Dateien (`seed/datenbanken/verhoer/<kontext>/schema.sql`,
`pflicht.sql`, `varianten/*.sql`, `LIESMICH.md`) werden vollständig kuratiert (kein Generator) und von
`scripts/db_bauen.js` unter dem Namen `verhoer/<kontext>` gebaut und geprüft (nie öffentlich). Fertig: V1
`verhoer/bibliothek`, V2 `verhoer/buergerbus`, V3 `verhoer/kiosk` (Phase 3, Task 11), V4 `verhoer/musikschule`,
V5 `verhoer/kletterhalle` (Phase 5, Task 6), V6 `verhoer/fitness`, V7 `verhoer/mensa` (Phase 6, Task 1) – die jeweilige `LIESMICH.md`
nennt die konkreten Pflicht-Datensätze und ist für die Aufgaben maßgeblich.

**Gemeinsame Regeln**
- Alle Namen, Orte, Einrichtungen frei erfunden (Namen aus `namen.json`); keine Abiturtexte oder -daten übernommen,
  nur das Aufgabenformat (Operatoren, BE).
- Konventionen wie in den Akten-DBs (LIESMICH.md Abschnitt 2/3): Tabellen Singular UpperCamelCase, Beziehungstabellen
  lowerCamelCase, Spalten ohne Umlaute, Datum `'JJJJ-MM-TT'`, Zeitpunkt `'JJJJ-MM-TT hh:mm'`, Uhrzeit `'hh:mm'`,
  Telefon `'0000-…'`, Ja/Nein als `'ja'`/`'nein'`.
- Jede SQL-Aufgabe hat eine Musterlösung im EH-§8-Umfang (Abimodus `streng`), die auf der Kontext-DB **und** ihren
  Randfall-Varianten (gleiche Typen wie Spec 7.4) das fachlich richtige Ergebnis liefert.
- **LIMIT-Aufgaben** nur, wo die Daten an der Schnittkante keinen Gleichstand haben (unten jeweils als Pflicht vermerkt).
- Zeitraum der Kontexte: Schuljahr 2026/27 (V1–V6: Herbst 2026; Mensa, Sanitätsdienst, Theater-AG: Frühjahr 2027).

| Kontext | Einsatz | Timer | Schwerpunkt | Kompetenzen (Kern) |
|---|---|---|---|---|
| V1 Stadtbibliothek | Verhör 1 (Akte 1) | 20' | SQL in einer Tabelle | K01, K02, K15–K22, K29, K32 |
| V2 Bürgerbus | Verhör 2 (Akte 2) | 20' | Verbund, zwei FKs auf dieselbe Tabelle | K03–K05, K16, K18, K23, K24 |
| V3 Schulkiosk | Verhör 3 (Akte 3) | 20' | Aggregation, GROUP BY/HAVING, Analyse | K22, K25–K31 |
| V4 Musikschule | Verhör 4 (Akte 4) | 20' | Rohliste, Anomalien, Schlüssel, Zerlegung | K02, K07–K12, K14 |
| V5 Kletterhalle | Verhör 5 (Akte 5, eA) | 20' | ER lesen/ergänzen/entwickeln, Überführung | K33–K43 |
| V6 Fitness-App | Verhör 6 (Akte 6) | 15' | Datenschutz + SQL (kleine Gruppen) | K44–K46, K26, K27 |
| V7 Mensa-Vorbestellsystem | Verhör 7 + Generalprobe eA/gA (Akte 7) | 30' / 70' | Abitur-Mix | alle |
| Schulsanitätsdienst | Klausur eA (A + B) und gA (A + B-gA) | – | rekursive Beziehung, Self-Join, Modellierung, Datenschutz | alle |
| Kostümverleih der Theater-AG | Nachschreibklausur eA/gA | – | wie Klausur, anderer Kontext | alle |

---

## V1 · Stadtbibliothek (eine Tabelle)

**Schema**

- Medium(<u>MedienNr</u>, Titel, Autor, Medienart, Genre, Erscheinungsjahr, Preis, Standort, AusgeliehenBis)

**Kontext:** Die Stadtbibliothek Weserstedt verwaltet ihren Bestand in einer einzigen Tabelle. Jede Zeile ist ein
Exemplar; `AusgeliehenBis` enthält das Rückgabedatum, ist also NULL, wenn das Medium im Regal steht. `Autor` enthält nur
den Nachnamen, `Preis` den Wiederbeschaffungswert in Euro (NULL bei Schenkungen).

**Rahmensatz (Startkarte):** „Bevor ich dich allein an das Fundbuch lasse, prüfe ich, ob du auch in einem fremden Archiv
sauber abfragst.“

**Wertebereiche:** Medienart `Buch`, `Hörbuch`, `E-Book`, `DVD`, `Zeitschrift` · Genre `Krimi`, `Thriller`, `Roman`,
`Sachbuch`, `Kinderbuch`, `Fantasy` · Standort `Erdgeschoss`, `Obergeschoss`, `Kinderbereich`, `Magazin` ·
Erscheinungsjahr 1985–2026 · ≈ 60 Datensätze.

**Zielkompetenzen:** K01, K02, K15, K16, K17, K18, K19, K20, K21, K22, K29, K32, K47 (Blueprint A1-V-01 … 12;
STORY-Beispiel „Hörbücher nach 2015, absteigend“).

**Pflicht-Randfälle**
| Randfall | Daten | Für |
|---|---|---|
| NULL | ≈ 40 % `AusgeliehenBis` NULL; 4 Medien mit `Preis` NULL | A1-V-04, -11, -12 (P5) |
| Ausschnitt-Falle | Titel im Aufgabenausschnitt eindeutig, im Bestand drei Titel doppelt (zwei Exemplare) | A1-V-02 (P8) |
| Bedingungslogik | Krimis mit Preis ≤ 15 und Thriller mit Preis > 15 **und** ≤ 15, sodass `Krimi OR Thriller AND Preis > 15` sichtbar anders ist als mit Klammern | A1-V-05 (P6) |
| LIKE | Titel mit `'Der '` am Anfang (5), `'Derbyfieber'` (beginnt mit „Der“, aber ohne Leerzeichen), `'Die Insel der …'` (enthält „der“); Autorennamen mit genau 5 Buchstaben (`'Rabe'` nicht, `'Onken'`, `'Lampe'`, `'Witte'`) | A1-V-06 |
| Grenzjahre | Romane/Sachbücher mit Erscheinungsjahr genau 2000 und 2010 sowie 1999/2011; Hörbücher 2015 und 2016 | A1-V-07, STORY-Beispiel (P6) |
| Magazin | 6 Medien im Standort `'Magazin'`, eines mit Preis NULL (Ersatzkosten NULL) | A1-V-09 |
| Top 5 | die fünf teuersten **verfügbaren** Krimis/Thriller ohne Gleichstand zu Platz 6; ein noch teurerer, aber ausgeliehener Thriller | A1-V-11 |

---

## V2 · Bürgerbus (Verbund)

**Schema**

- Haltestelle(<u>HaltID</u>, Name, Ortsteil)
- Fahrer(<u>FahrerNr</u>, Vorname, Nachname, Telefon)
- Bus(<u>Kennzeichen</u>, Sitzplaetze)
- Fahrt(<u>FahrtNr</u>, ↑FahrerNr, ↑Kennzeichen, ↑StartHalt, ↑ZielHalt, Datum, Abfahrt, Fahrgaeste)

`StartHalt` und `ZielHalt` verweisen beide auf `Haltestelle.HaltID` (abweichende Namen, P7); `Kennzeichen` ist ein
natürlicher Text-Schlüssel im fiktiven Format `'BB-101'`.

**Kontext:** Ehrenamtliche fahren den Bürgerbus der Gemeinde Brookdorf, der die Ortsteile der Gemeinde mit dem
Weserstedter Stadtteil Nordheide verbindet. Jede Fahrt wird mit Fahrerin/Fahrer, Bus, Start- und Zielhaltestelle,
Datum, Abfahrtszeit und gezählter Fahrgastzahl erfasst; wird nicht gezählt, bleibt `Fahrgaeste` leer.

**Rahmensatz:** „Wer Räder verfolgen kann, kann auch Busse verfolgen – zeig es mir.“

**Wertebereiche:** Ortsteil `Brookdorf`, `Heidkamp`, `Moorende`, `Nordheide` · 12 Haltestellen · 8 Fahrer · 4 Busse
(Sitzplätze 8, 8, 9, 12) · ≈ 70 Fahrten im September/Oktober 2026 · Abfahrt `'hh:mm'`.

**Zielkompetenzen:** K03, K04, K05, K16, K18, K23, K24, K29, K47 (Blueprint A2-V-01 … 12).

**Pflicht-Randfälle**
| Randfall | Daten | Für |
|---|---|---|
| zwei FKs auf dieselbe Tabelle | alle Fahrten mit Start ≠ Ziel; Haltestellen-Namen eindeutig | A2-V-07, -11, -12 |
| NULL | 7 Fahrten mit `Fahrgaeste` NULL (verschiedene Fahrer) | A2-V-10 (P5); Verbund verliert nichts, aber `Fahrgaeste > 6` blendet sie aus |
| Gleichnamige | zwei Fahrer „Hauke Rohlfs“ (FahrerNr 2 und 7) | A2-V-08 (DISTINCT über Namen vs. Schlüssel) |
| FahrerNr 4 | Fahrerin mit Fahrten mit genau 6 und mit mehr als 6 Fahrgästen | A2-V-06 (`> 6`, P6) |
| Grenze Sitzplätze | Busse mit genau 8 Sitzplätzen (zählen nicht als „mehr als 8“) | A2-V-08 |
| Kreuzprodukt | Tabellengrößen im Aufgabentext angegeben (8 × 4 = 32) | A2-V-04 |
| Ortsteilwechsel | Fahrten Nordheide → Nordheide (gleicher Ortsteil, andere Haltestelle) und Nordheide → andere Ortsteile | A2-V-12 (`s1.Ortsteil = 'Nordheide' AND s2.Ortsteil != 'Nordheide'`) |
| Top 5 | Fahrgastzahlen auf Platz 5 und 6 verschieden | A2-V-11 |

---

## V3 · Schulkiosk (Aggregation)

**Schema**

- Produkt(<u>ProduktNr</u>, Bezeichnung, Kategorie, Preis)
- Helfer(<u>HelferNr</u>, Vorname, Nachname, Klasse)
- Schicht(<u>SchichtNr</u>, ↑HelferNr, Datum, Pause)
- Verkauf(<u>VerkaufNr</u>, ↑SchichtNr, Zeitpunkt, Zahlart)
- Posten(<u>↑VerkaufNr</u>, <u>↑ProduktNr</u>, Anzahl)

(Angeglichen an den Verhör-Blueprint in `docs/DS_PLANUNG.md` – A3-V-11 verbindet Helfer, Schicht, Verkauf, Posten,
Produkt – und STORY 6 „Verkaufsschichten“; früher hier `Verkauf(…, ↑HelferNr, …)` ohne `Schicht`.)

**Kontext:** Die Kiosk-AG einer Gesamtschule verkauft in den großen Pausen Brötchen, Getränke und Snacks. In jeder
Pause kassieren Helferinnen und Helfer der AG in Schichten; jeder Verkauf gehört zu einer Schicht und besteht aus
Posten (Produkt und Anzahl); bezahlt wird bar oder mit der aufladbaren Schülerkarte.

**Rahmensatz:** „Kassen lügen nicht, aber Abfragen manchmal – beweis mir, dass deine es nicht tun.“

**Wertebereiche:** Kategorie `Brötchen`, `Getränk`, `Snack`, `Obst` · Zahlart `bar`, `Karte` · 14 Produkte,
10 Helfer, 20 Schichten (je Pause zwei), ≈ 120 Verkäufe in einer Schulwoche, ≈ 200 Posten.

**Zielkompetenzen:** K22, K23, K24, K25, K26, K27, K28, K29, K30, K31 (Blueprint A3-V-01 … 12).

**Pflicht-Randfälle**
| Randfall | Daten | Für |
|---|---|---|
| COUNT ↔ SUM | Brötchen-Posten mit Anzahl 1–4 (Anzahl Verkäufe ≠ Stückzahl) | A3-V-02, -06 (P4) |
| Gleichnamige | zwei Helfer „Jule Kahrs“ (Klassen 8b und 10a) | A3-V-11 (P3) |
| Gleichstand Kategorien | Brötchen und Getränk je 4 Produkte | A3-V-05 (keine LIMIT-Frage darauf) |
| Produkt ohne Verkauf | „Apfelschorle 0,5 l“ nie verkauft | A3-V-06 (fehlt im Verbund), Cold Case |
| Grenze HAVING | Kategorie `Snack` mit Durchschnittspreis genau 1.50; Helfer mit Umsatz genau 50.00 | A3-V-07 (`> 1.50`), A3-V-11 (`> 50`) (P6) |
| Top 3 | Umsätze der drei umsatzstärksten Produkte paarweise verschieden und verschieden vom vierten | A3-V-08 |
| Vervielfachung | gegebene Fehlabfrage über `Verkauf, Posten, Produkt`, in der die Bedingung `Posten.VerkaufNr = Verkauf.VerkaufNr` fehlt (Kreuzprodukt mit `Verkauf`); Daten so gewählt, dass die zu hohe Summe nicht sofort absurd wirkt | A3-V-10 (P2) |

---

## V4 · Musikschule (Rohliste, Anomalien, Schlüssel)

**Schema**

- UnterrichtRoh(Schueler, Geburtsjahr, Instrumente, Lehrkraft, LehrkraftTelefon, Raum, Tarif, Monatsgebuehr) – ohne Schlüssel
- LehrkraftRaum(<u>LehrkraftNr</u>, Name, Telefon, Raum, Etage) – zusammengelegte Tabelle
- Raum(<u>Raum</u>, Etage) – Vergleichstabelle ohne mögliche Anomalie

**Musterzerlegung** (für A4-V-11/12, eA):
Schueler(<u>SchuelerNr</u>, Vorname, Nachname, Geburtsjahr, ↑Tarif) · Tarif(<u>Tarif</u>, Monatsgebuehr) ·
Lehrkraft(<u>LehrkraftNr</u>, Name, Telefon, ↑Raum) · Raum(<u>Raum</u>, Etage) ·
belegt(<u>↑SchuelerNr</u>, <u>Instrument</u>, <u>↑LehrkraftNr</u>)
Funktionale Abhängigkeiten: SchuelerNr → Name, Geburtsjahr, Tarif · Tarif → Monatsgebuehr · Lehrkraft → Telefon, Raum ·
Raum → Etage. Keine: Instrument ↛ Lehrkraft (Klavier bei zwei Lehrkräften), Lehrkraft ↛ Instrument.

**Kontext:** Die Musikschule Weserstedt hat ihre Anmeldungen bisher in einer Tabellenkalkulation gepflegt: je Zeile eine
Schülerin oder ein Schüler mit Instrument(en), Lehrkraft samt Telefonnummer, Unterrichtsraum, Tarif und Monatsgebühr.
Vor der Umstellung auf eine Datenbank soll die Liste begutachtet werden.

**Rahmensatz:** „Listen wie die vom TuS gibt es überall – zeig mir, dass du ihre Schwachstellen findest.“

**Wertebereiche:** ≈ 30 Rohzeilen, 6 Lehrkräfte (darunter **Jana Albers**), 7 Instrumente (Klavier, Gitarre, Geige,
Querflöte, Schlagzeug, Cello, Gesang), 5 Räume auf 3 Etagen, Tarife `Kind`, `Jugend`, `Erwachsen`, `Geschwister`.

**Zielkompetenzen:** K02, K07, K08, K09, K10, K11, K12, K14 (Blueprint A4-V-01 … 12).

**Pflicht-Randfälle**
| Randfall | Daten | Für |
|---|---|---|
| Redundanz | Telefon von Jana Albers in 6 Zeilen; Monatsgebühr je Tarif in jeder Zeile | A4-V-01, -03 |
| Änderungsanomalie (eingebaut) | Tarif `Jugend` einmal mit 38,00 statt 36,00 € | A4-V-07 |
| Einfügeanomalie | Harfe (neues Angebot, noch ohne Anmeldung) nicht eintragbar | A4-V-06 |
| Löschanomalie | einzige Cello-Schülerin → mit ihrer Zeile verschwinden Cello und Lehrkraft-Telefon | A4-V-02 |
| nicht-atomar | 3 Zeilen mit `'Klavier, Gesang'` u. ä. (Lehrkraft und Telefon ebenfalls als Liste) | A4-V-04 |
| Ausschnitt-Falle | im Aufgabenausschnitt alle Schülernamen verschieden, in der Gesamtliste zwei „Mira Lindemann“ (verschiedene Geburtsjahre) | A4-V-05 (P8) |
| Mehrfachvorkommen | ein Schüler belegt Klavier bei zwei Lehrkräften → (Schueler, Instrument) nicht eindeutig | A4-V-10 (P8) |
| zusammengelegte Tabelle | `LehrkraftRaum`: zwei Lehrkräfte im selben Raum → Etage doppelt (Änderungsanomalie möglich); `Raum(Raum, Etage)` anomaliefrei | A4-V-08, -09 |

---

## V5 · Kletterhalle (ER) – angeglichen an DS_PLANUNG

**Angeglichen an DS_PLANUNG** (Verhör-Blueprint V5, Rangfolge Spec > DS_PLANUNG > übrige; Phase 5 Task 6): Die
Beziehung Mitglied–Route heißt *klettert*, Kurse leitet ein *Trainer*, die rekursive Beziehung ist *bildetAus*
(Trainer–Trainer), Mitglied–Kurs hat die zwei Beziehungen *besucht* und *assistiertIn*. Frühere Fassung: *begeht*,
Kursleitung durch ein Mitglied, rekursiv *sichert* (Mitglied–Mitglied, n:m). Routenbauer bleibt (A5-V-13).

**Kontext:** Die Kletterhalle Weserstedt plant eine neue Mitgliederverwaltung. Erfasst werden sollen Mitglieder, Wände
und Routen, die Trainerinnen und Trainer samt ihrer Ausbildung, die Kurse der Halle sowie die Ergebnisse der
Hallenwettkämpfe.

**Rahmensatz:** „Ein Bauplan, den du nicht selbst gezeichnet hast – lies ihn, erweitere ihn, bau ihn um.“

**Anforderungstext (Material für A5-V-07 … 15; gesiezt im Aufgabenblatt):**
> Jedes Mitglied der Kletterhalle hat eine Mitgliedsnummer, einen Namen und einen Jahrgang. Die Halle besteht aus
> Wänden mit Nummer und Bereich (z. B. „Nordwand“). An jeder Wand gibt es mehrere Routen; eine Route (Nummer, Name,
> Schwierigkeit) befindet sich an genau einer Wand und wurde von genau einem Routenbauer (Nummer, Name) geschraubt.
> Mitglieder klettern Routen; für jede Begehung werden das Datum und der Erfolg (Durchstieg ja/nein) gespeichert.
> Die Halle beschäftigt Trainerinnen und Trainer (Nummer, Name). Jede Trainerin und jeder Trainer wurde von höchstens
> einer anderen Trainerin bzw. einem anderen Trainer der Halle ausgebildet und kann selbst mehrere ausbilden.
> Kurse (Nummer, Titel, Termin) werden von genau einer Trainerin oder einem Trainer geleitet. Mitglieder besuchen
> Kurse; außerdem können Mitglieder in Kursen assistieren.
> Bei Hallenwettkämpfen (Nummer, Titel, Datum) erhält jedes teilnehmende Mitglied für jede gekletterte Route Punkte.

**Musterlösung ER (Chen):**
- **Entitätstypen:** `Mitglied` (<u>MitgliedsNr</u>, Name, Jahrgang) · `Wand` (<u>WandNr</u>, Bereich) · `Route`
  (<u>RoutenNr</u>, Name, Schwierigkeit) · `Routenbauer` (<u>BauerNr</u>, Name) · `Trainer` (<u>TrainerNr</u>, Name) ·
  `Kurs` (<u>KursNr</u>, Titel, Termin) · `Wettkampf` (<u>WettkampfNr</u>, Titel, Datum).
- **Beziehungstypen:** *hat* Wand (1) – Route (n) · *schraubt* Routenbauer (1) – Route (n) · *klettert* Mitglied (n) –
  Route (m) mit **Datum, Erfolg** · *bildetAus* Trainer (1, Rolle Ausbildende) – Trainer (n, Rolle Ausgebildete),
  **rekursiv 1:n** · *leitet* Trainer (1) – Kurs (n) · *besucht* Mitglied (n) – Kurs (m) und *assistiertIn*
  Mitglied (n) – Kurs (m) (**zwei Beziehungen zwischen denselben Entitätstypen**) · *wertet* **ternär** Mitglied (m) –
  Route (n) – Wettkampf (p) mit **Punkte** (Relation `Wertung`).
- Grenzen der Notation: „höchstens 8 Teilnehmende je Kurs“, „jede Route hat mindestens drei Begehungen“ sind mit 1/n/m
  nicht darstellbar (A5-V-10). Mögliche Cold-Case-Variante: rekursiv **n:m** *sichert* Mitglied – Mitglied (wer wen
  schon gesichert hat).

**Musterlösung Relationenschema:**
Mitglied(<u>MitgliedsNr</u>, Name, Jahrgang) · Wand(<u>WandNr</u>, Bereich) · Routenbauer(<u>BauerNr</u>, Name) ·
Route(<u>RoutenNr</u>, Name, Schwierigkeit, ↑WandNr, ↑BauerNr) ·
klettert(<u>↑MitgliedsNr</u>, <u>↑RoutenNr</u>, <u>Datum</u>, Erfolg) – Datum im Schlüssel, weil dieselbe Route
mehrfach geklettert wird · Trainer(<u>TrainerNr</u>, Name, ↑AusbilderNr) – rekursiv 1:n, `AusbilderNr` verweist auf
`Trainer` (NULL, wenn extern ausgebildet) · Kurs(<u>KursNr</u>, Titel, Termin, ↑TrainerNr) ·
besucht(<u>↑MitgliedsNr</u>, <u>↑KursNr</u>) · assistiertIn(<u>↑MitgliedsNr</u>, <u>↑KursNr</u>) ·
Wettkampf(<u>WettkampfNr</u>, Titel, Datum) · Wertung(<u>↑MitgliedsNr</u>, <u>↑RoutenNr</u>, <u>↑WettkampfNr</u>, Punkte).

**Mini-DB für Kardinalität aus Daten** (A5-V-03/04; `verhoer/kletterhalle`): `Mitglied` (8), `Wand` (4),
`Routenbauer` (3), `Route` (12, jede Route genau eine WandNr), `klettert` (25 Zeilen, Mitglieder mit mehreren Routen
**und** Routen mit mehreren Mitgliedern; dasselbe Paar einmal an zwei Tagen).

**Neuer Anbau (A5-V-13, eigener kurzer Text):** Boulderbereich mit Blöcken (Nummer, Farbe), Griffe (Nummer, Form) gehören
zu genau einem Hersteller und werden an mehreren Blöcken verwendet (n:m, Anzahl), Routenbauer schrauben Blöcke (1:n).

**Rückwärts (A5-V-14):** gegebenes Schema `Route(…, ↑WandNr, ↑BauerNr)`, `klettert(…)`, `Trainer(…, ↑AusbilderNr)` →
ER rekonstruieren.

**Zielkompetenzen:** K33, K34, K35, K36, K37, K38, K39, K40, K41, K42, K43, K47 (Blueprint A5-V-01 … 15).

**Randfälle / Fallen:** Beziehungsattribut Datum/Erfolg an *klettert* statt an Route (P9); Rollenangaben an
*bildetAus*; rekursive 1:n-Beziehung als FK in derselben Relation (keine eigene Tabelle); FK auf der n-Seite
(`Route.WandNr`, `Kurs.TrainerNr`); n:m ohne eigene Tabelle (P9); *besucht*/*assistiertIn* als zwei getrennte
Relationen; ternäre Überführung mit dreiteiligem Schlüssel.

---

## V6 · Fitness-App (Datenschutz + SQL)

**Schema**

- Export(<u>NutzerToken</u>, Geburtsjahr, PLZBereich, Geschlecht, Schritte, Ruhepuls, <u>Datum</u>)

**Kontext:** Eine (fiktive) Fitness-App zeichnet Schritte und Ruhepuls ihrer Nutzerinnen und Nutzer auf und möchte einen
pseudonymisierten Export mit einer Krankenkasse und mit Werbepartnern teilen. Dazu gehören vier kurze Auszüge aus der
Datenschutzerklärung (A: Werbung, B: Weitergabe an Partner, C: Speicherdauer „unbegrenzt“, D: Standortfreigabe).

**Rahmensatz:** „Du weißt jetzt, wie leicht man Menschen in Daten findet – zeig mir, dass du weißt, wann man es nicht
darf.“

**Wertebereiche:** 25 Tokens `'N-000'`, je 1–4 Tage im Export (≈ 60 Zeilen) · Geburtsjahr 1950–2008 · PLZBereich
fiktiv `'001'` … `'006'` · Geschlecht `'w'`, `'m'`, `'d'` · Schritte 800–18 000 · Ruhepuls 48–92, **NULL**, wenn kein
Messgerät verbunden war.

**Zielkompetenzen:** K44, K45, K46, K26, K27, K29 (Blueprint A6-V-01 … 08).

**Pflicht-Randfälle**
| Randfall | Daten | Für |
|---|---|---|
| kleine Gruppen | 4 Kombinationen (Geburtsjahr, PLZBereich) mit genau **einem** Token; in der Mehrtagesfassung hat eine davon vier Zeilen | A6-V-05 (P1; siehe Hinweis unten) |
| Re-Identifizierung | Kontextkarte: „Ihr Nachbar, Jahrgang 1949, wohnt im Bereich 004, nutzt die App“ – genau ein Token passt; Kontextkarte zwei passt auf drei Tokens (nicht eindeutig) | A6-V-06 |
| besondere Kategorie | Ruhepuls = Gesundheitsdatum; Schritte nur in Kombination | A6-V-02, -07 |
| NULL | 6 Zeilen Ruhepuls NULL | Zusatzfrage `IS NULL` |

*Hinweis zur Umsetzung von A6-V-05:* Im Verhör wird eine Fassung des Exports **mit genau einer Zeile je NutzerToken**
(Stichtag) verwendet, damit `GROUP BY Geburtsjahr, PLZBereich HAVING COUNT(*) = 1` ohne Unterabfrage korrekt ist; die
Mehrtagesfassung dient nur der Diskussion „Zeilen ≠ Personen“ (P4). Umsetzung (Phase 6): beide Fassungen in einer DB – `Export` =
Stichtagsfassung (2026-10-05, 25 Zeilen), `ExportVerlauf` = Mehrtagesfassung (60 Zeilen, gleiche Spalten); das
Geburtsjahr 1949 der Kontextkarte ist die einzige Ausnahme vom Wertebereich 1950–2008.

---

## V7 · Mensa-Vorbestellsystem (Lab-Generalprobe und Generalprobe)

**Schema**

- Person(<u>PersonNr</u>, Vorname, Nachname, Rolle, Klasse)
- Gericht(<u>GerichtNr</u>, Bezeichnung, Kategorie, Preis, Vegetarisch)
- Angebot(<u>AngebotNr</u>, ↑GerichtNr, Datum, Portionen)
- Bestellung(<u>BestellNr</u>, ↑PersonNr, ↑AngebotNr, Menge, Abgeholt)
- Kuechenkraft(<u>KraftNr</u>, Vorname, Nachname)
- bereitetZu(<u>↑KraftNr</u>, <u>↑AngebotNr</u>)
- BestellUebersicht(BestellNr, PersonNr, Name, Klasse, Datum, Gericht, Preis, Menge) – zusammengelegte Tabelle ohne Schlüssel

**Kontext:** Die Mensa einer Gesamtschule lässt Schülerinnen, Schüler und Beschäftigte Mittagessen online vorbestellen.
Jedes Gericht kann an mehreren Tagen angeboten werden; eine Bestellung bezieht sich auf ein Tagesangebot, `Abgeholt`
enthält die Uhrzeit der Ausgabe (`'hh:mm'`) und ist NULL, wenn das Essen nicht abgeholt wurde. Küchenkräfte bereiten
die Tagesangebote zu.

**Rahmensatz:** „Letzte Probe vor der Lizenz: ein ganzer Fall, ohne mich.“

**ER-Material (Generalprobe eA):** Person (n) — *bestellt* (Menge, Abgeholt) — (m) Angebot · Gericht (1) —
*wirdAngeboten* — (n) Angebot · Küchenkraft (n) — *bereitetZu* — (m) Angebot. Erweiterungen (Aufgaben): Gericht (n) —
*enthaelt* (Hinweis bzw. Mengenangabe) — (m) Allergen; Küchenkraft *vertritt* Küchenkraft (rekursiv).

**Wertebereiche:** Rolle `Schüler`, `Lehrkraft`, `Personal` (Klasse nur bei Schülern, sonst NULL) · Kategorie `Hauptgericht`,
`Suppe`, `Salat`, `Dessert` · Vegetarisch `'ja'`/`'nein'` · Zeitraum 2027-03-01 bis 2027-03-26 (Mo–Fr) · ≈ 40 Personen,
14 Gerichte, ≈ 60 Angebote, ≈ 300 Bestellungen.

**Zielkompetenzen:** alle Bereiche (Blueprint A7-V-01 … 15, GP-eA-a … g, GP-gA-a … f).

**Pflicht-Randfälle**
| Randfall | Daten | Für |
|---|---|---|
| Mehrfachbestellung | eine Person bestellt dasselbe Angebot zweimal (zwei BestellNr) | A7-V-01, GP-a (P8) |
| Löschanomalie | in `BestellUebersicht` hat ein Gericht nur eine Bestellung | A7-V-02, GP-b |
| Änderungsanomalie | `BestellUebersicht`: Preis eines Gerichts in einer Zeile abweichend; Klasse einer Person in zwei Zeilen verschieden | A7-V-11, GP-b |
| Grenzpreis | vegetarisches Gericht mit Preis genau 4.00 | A7-V-03 (`< 4`) (P6) |
| Stichtag | am 2027-03-15 vier Angebote, davon zwei vegetarisch | A7-V-04, GP-e |
| NULL | ≈ 10 % `Abgeholt` NULL; eine Person mit drei nicht abgeholten Bestellungen | A7-V-07, GP-g |
| COUNT ↔ SUM | Mengen 1–3 (Portionen ≠ Bestellungen) | A7-V-08, GP-f (P4) |
| HAVING-Grenze | ein Gericht mit genau 50 Portionen im März, eines mit 51 | GP-f (`> 50`) |
| Vielbesteller | genau drei Personen mit mehr als 10 Bestellungen, eine mit genau 10 | A7-V-09 |
| Top 3 der Woche | Umsätze 2027-03-15 … 19 auf Platz 3 und 4 verschieden | A7-V-13 |
| LIMIT 3 (Analyse) | nicht abgeholte Bestellungen je Person ohne Gleichstand auf Platz 3/4 | GP-g |

*Umsetzung (Phase 6):* Fr 2027-03-26 ist Karfreitag – der März endet in den Daten mit Do 2027-03-25; zusätzlich eine
Februarwoche (2027-02-22 … 26), damit „im März 2027“ (GP-f) ein echter Zeilenfilter ist. Einzelheiten in
`verhoer/mensa/LIESMICH.md`.

---

## Klausur · Schulsanitätsdienst (eA: A + B; gA: A + B-gA)

**Schema Aufgabe A**

- Sanitaeter(<u>SanNr</u>, Vorname, Nachname, Klasse, Stufe, ↑BetreuerNr)
- Einsatz(<u>EinsatzNr</u>, Datum, Uhrzeit, Ort, Art)
- eingesetzt(<u>↑SanNr</u>, <u>↑EinsatzNr</u>, Rolle)
- Material(<u>MatNr</u>, Bezeichnung, Bestand)
- verbraucht(<u>↑EinsatzNr</u>, <u>↑MatNr</u>, Menge)
- EinsatzListe(EinsatzNr, Datum, Ort, SanNr, Name, Klasse, Rolle) – zusammengelegte Tabelle

`BetreuerNr` verweist auf `Sanitaeter.SanNr` (**rekursive Beziehung** *betreut*, abweichender Name): Erfahrene
Sanitäterinnen und Sanitäter betreuen neue.

**Kontext:** Der Schulsanitätsdienst einer Oberschule dokumentiert seine Einsätze bei Unfällen und Erkrankungen im
Schulalltag: wer eingesetzt war (in welcher Rolle), wo und wann der Einsatz stattfand und welches Material verbraucht
wurde. Neue Mitglieder werden von einer erfahrenen Person betreut.

**Wertebereiche:** Stufe `Anfänger`, `Fortgeschritten`, `Leitung` · Ort `Sporthalle`, `Pausenhof`, `Mensa`,
`Klassenraum`, `Treppenhaus` · Art `Sportunfall`, `Kreislauf`, `Schnittwunde`, `Prellung`, `Sonstiges` · Rolle
`Ersthelfer`, `Assistenz`, `Dokumentation` · Zeitraum 2026-11-02 bis 2027-02-26 · ≈ 18 Sanitäter, ≈ 45 Einsätze,
12 Materialien.

**Material Aufgabe B (eA):** Anforderungstext „Fortbildungsprogramm“ (Kurse – Referent 1:n, Sanitäter *nimmtTeil*
n:m mit Datum/bestanden, Sanitäter *assistiert* n:m, Kurs *setztVoraus* Kurs rekursiv n:m) sowie Schema-Ausschnitt
Funkgeraet(<u>GeraetNr</u>, Typ, ↑SanNr) · Ausgabe(<u>↑GeraetNr</u>, <u>↑EinsatzNr</u>, Ausgabezeit) für die
Rückrichtung; Szenario „digitale Einsatzprotokolle“ (Gesundheitsdaten, Cloud, Statistik an die Schulleitung).

**Material Aufgabe B-gA:** AusbildungRoh(SanNr, Name, Kurse, Referent, RefTelefon, Raum) mit mehrwertigen Zellen
(„AED, Erste Hilfe“) und dem Datenschutz-Szenario.

**Zielkompetenzen:** A: K02, K03, K04, K05, K07–K10, K15, K16, K18, K21–K28, K30, K32 · B: K34–K38, K40–K43, K44–K46 ·
B-gA: K07, K08, K14, K44–K46 (Blueprints KL-A-a … h, KL-B-a … g, KL-BgA-a … d).

**Pflicht-Randfälle**
| Randfall | Daten | Für |
|---|---|---|
| Self-Join + NULL | zwei Sanitäter ohne Betreuer (Stufe Leitung) | KL-A-e (P5, P7): fehlen im Self-Join; Erwartungshorizont nennt das |
| Rollenwechsel | ein Sanitäter wechselt bei einem langen Einsatz die Rolle (fachlich zwei Rollen je Paar) | KL-A-b (P8) |
| Anomalien | `EinsatzListe`: Klasse eines Sanitäters in zwei Zeilen verschieden; Einsatz mit nur einem Sanitäter (Löschanomalie) | KL-A-c |
| Grenzdaten | Einsätze am 2027-01-04 (erster Schultag) und 2027-01-29 (letzter Januar-Schultag), knapp außerhalb am 2026-12-18 und 2027-02-01 | KL-A-d (`BETWEEN '2027-01-01' AND '2027-01-31'`, P6) |
| IN | Orte `Sporthalle` und `Pausenhof` plus `Sporthallenflur` (nicht gemeint) | KL-A-d |
| HAVING-Grenze | ein Material mit Gesamtverbrauch genau 20, eines mit 21 | KL-A-f (`> 20`, P1/P4) |
| LIMIT 1 | Sanitäter mit den meisten Sportunfällen eindeutig | KL-A-g |
| nie eingesetzt | zwei neue Sanitäter ohne Einsatz | KL-A-h (Vorgehen in Worten, ohne Unterabfrage: z. B. Liste aller und Liste der eingesetzten vergleichen) |

---

## Nachschreibklausur · Kostümverleih der Theater-AG

**Schema Aufgabe A**

- Mitglied(<u>MitgliedNr</u>, Vorname, Nachname, Klasse, ↑PateNr)
- Kostuem(<u>KostuemNr</u>, Bezeichnung, Groesse, Epoche, Zustand)
- Stueck(<u>StueckNr</u>, Titel, Premiere)
- Rolle(<u>RollenNr</u>, Name, ↑StueckNr)
- Ausleihe(<u>AusleihNr</u>, ↑KostuemNr, ↑MitgliedNr, ↑RollenNr, Von, Bis)
- KostuemRolle(KostuemNr, Bezeichnung, RollenNr, Rolle, Stueck, Premiere) – zusammengelegte Tabelle

`PateNr` verweist auf `Mitglied.MitgliedNr` (**rekursive Beziehung** *istPateVon*: ältere Mitglieder begleiten neue).
`Bis` ist NULL, solange das Kostüm nicht zurückgegeben ist.

**Kontext:** Die Theater-AG eines Gymnasiums verleiht ihren Kostümfundus an die eigenen Mitglieder für Proben und
Aufführungen. Erfasst wird, wer welches Kostüm für welche Rolle in welchem Stück von wann bis wann ausgeliehen hat.

**Wertebereiche:** Epoche `Antike`, `Mittelalter`, `Barock`, `19. Jahrhundert`, `Moderne` · Groesse `S`, `M`, `L`, `XL` ·
Zustand `gut`, `reparaturbedürftig` · Klasse `'7a'` … `'12c'` · ≈ 25 Mitglieder, 40 Kostüme, 4 Stücke, 20 Rollen,
≈ 80 Ausleihen (2026-09 bis 2027-03).

**Material Aufgabe B (eA):** Anforderungstext „Aufführungsplanung“ (Aufführungen an Spielorten; Mitglied *spielt* Rolle
in Aufführung – ternär; Zweitbesetzung *vertritt* Mitglied – rekursiv; Requisit gehört zu genau einem Stück) sowie
Schema-Ausschnitt Werkstatt(<u>WerkstattNr</u>, Bezeichnung) · repariert(<u>↑KostuemNr</u>, <u>↑MitgliedNr</u>,
<u>Datum</u>, ↑WerkstattNr) für die Rückrichtung; Szenario Veröffentlichung von Fotos und Mitgliederliste auf der
Schulhomepage. **gA:** KostuemlisteRoh(Kostuem, Groesse, Rollen, Stuecke, Verantwortliche, Telefon) + Datenschutz-Szenario.

**Zielkompetenzen:** wie Klausur (Blueprints NK-A-a … h, NK-B-a … g).

**Pflicht-Randfälle**
| Randfall | Daten | Für |
|---|---|---|
| NULL | 6 Ausleihen mit `Bis` NULL | NK-A-d (P5) |
| Wiederholtes Ausleihen | dasselbe Kostüm vom selben Mitglied zweimal ausgeliehen | NK-A-b (P8) |
| Anomalien | `KostuemRolle`: Premiere eines Stücks in einer Zeile abweichend; Kostüm, das nur einer Rolle zugeordnet ist | NK-A-c |
| vier Tabellen | Barock-Kostüme in zwei Stücken, eine Barock-Rolle ohne Ausleihe | NK-A-e (P2, P7) |
| HAVING + LIMIT | Mitglieder mit 4, 5, 6 und genau 3 Ausleihen; Platz 3/4 ohne Gleichstand | NK-A-f (P1, P3) |
| Self-Join + LIKE | Paten in Klassen `'12a'`, `'12b'`, `'11c'`; Mitglieder ohne Pate | NK-A-g |
| nie ausgeliehen | 5 Kostüme ohne Ausleihe | NK-A-h |
