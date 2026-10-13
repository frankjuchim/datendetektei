# Datendetektei Weserstedt – Design-Spezifikation

| | |
|---|---|
| **Projekt** | Unterrichtseinheit „Datenbanken“ + Lernplattform *Datendetektei* (InfoLabs-Verbund) |
| **Zielgruppe** | Informatik Leistungskurs (eA) Niedersachsen, Abitur ab 2027; Grundkurs-Pfad (gA) inklusive |
| **Stand** | 2026-10-12 · Entwurf zur Freigabe durch Frank Juchim |
| **Plattform** | `datendetektei.frankjuchim.de` · `PLATTFORM_ID=datendetektei` · `AUTH_MODUS=portal` |
| **Verbindlich** | Vertrag des Plattform-Verbunds `frankjuchim/labs/VERTRAG.md` v1.2 · KC Informatik GO 2017 · Ergänzende Hinweise (EH) Neufassung 2025 · Operatorenliste 2024 |

Diese Spezifikation ist die **Quelle der Wahrheit** für Claude Code. Alles, was hier festgelegt ist, gilt; Änderungen
werden hier eingetragen (Abschnitt 18, Änderungsprotokoll), bevor sie umgesetzt werden.

---

## 0. Getroffene Entscheidungen (Protokoll der Planungssitzung)

| # | Entscheidung | Begründung / Folge |
|---|---|---|
| E1 | **15 Doppelstunden** (DS à 90 min): 13 Kern-DS + 2 Kür-DS; Klausur an einem **separaten Termin** | 2–3 DS/Woche ≈ 6 Wochen; dichter Plan, Kür entfällt bei Zeitmangel |
| E2 | Setting **„Datendetektei Weserstedt“** (Kurs = Ermittlerteam, durchgehender Fall „Das Phantom“) | Anknüpfung an die SQL-Werkstatt (StadtRad Weserstedt); SQL = Ermitteln |
| E3 | Reihenfolge **Benutzen → Verstehen → Entwerfen**: SQL → Anomalien/Schlüssel → ER/Schema → Datenschutz | Motivierender Einstieg; Chaos-Archiv begründet den Bedarf an Modellierung |
| E4 | Stoff = **Abitur-Kern streng nach EH §7/§8 + markierte Kür** (Normalformen 1–3 als Werkzeug, CREATE/INSERT, Ausblick JOIN … ON/LEFT JOIN); **keine** Relationenalgebra | Abitur-Treue; Kür für Interessierte/Projekt |
| E5 | **Eigenes Produkt** mit eigener Codebasis und eigenem Design (nicht AlgoQuest-Kopie); alle MUSS-Regeln aus Vertrag §9 bleiben | Abweichung von §13.2 (Empfehlung) → Vorschlag VERTRAG 1.3 (Abschnitt 15) |
| E6 | Plattformname **Datendetektei**, Subdomain `datendetektei` | `PLATTFORM_ID` ändert sich nie |
| E7 | **Freitexte** (Begründungen, Analysen) werden **nicht serverseitig gespeichert**; nur Kernpunkt-Selbstcheck | Datensparsam, kein Korrekturaufwand, keine Freitext-Löschfragen |
| E8 | **DOCX/PPTX sind die maßgebliche Fassung** der Materialien (wie AlgoQuest); PDFs werden erzeugt | Vertrautes Bearbeiten in Word/PowerPoint; SQL-Prüfung über Absatzformat „SQL-Code“ (Abschnitt 12.3) |
| E9 | Einsatz im eigenen Kurs **im nächsten Schuljahr** → Qualität vor Tempo, Komplettbau vor dem Start | Kein MVP-Zwang; trotzdem früher Deploy des Gerüsts für Portal-Anbindung |
| E10 | **Steckbrief-Hinweis** einer Akte erscheint, sobald das Verhör der Akte besiegt ist **oder** die Lehrkraft die nächste Akte freischaltet | Kein Vorgriff auf Lösungen innerhalb einer Akte (Planungs-Präzisierung nach Story-Bibel) |
| E12 | **Drei Ausgabestufen für Material:** Schülerfassungen als PDF (Arbeitsblätter, Präsentations-Handouts, Warm-up-Karten ohne Lösungen), Lehrkraftfassungen als PDF (zusätzlich Lösungen, Erwartungshorizonte, Klausuren, Lehrerhinweise, Präsentationen mit Notizen), **Originale docx/pptx nur für den Superadmin** (Download in der Plattform + Repo) | Abschnitt 12.4 |
| E13 | **Materialzugriff nach Rolle** (Entscheidung Frank, 2026-10-12): Im Gastmodus sind nur einzelne, gelistete Schüler- und Lehrkraft-PDFs öffentlich (Demo); alle übrigen PDFs gibt es erst nach Anmeldung, jeweils für die passende Rolle | Abschnitt 12.4, Whitelist `materialien/Gast_PDF/verzeichnis.json` |
| E11 | Akte 6 ist **rein per SQL** lösbar: `Datenspuren.Einwohner` erhält die Spalte `Strasse`; nächtliche App-Check-ins verraten die Wohnadresse | Lerneffekt Datenschutz (Standortdaten); Schlussplädoyer ohne Unterabfragen in 6 Stufen (`seed/datenbanken/datenspuren/LIESMICH.md`) |

---

## 1. Ziel und Erfolgskriterien

**Ziel:** Eine Unterrichtseinheit „Datenbanken“, die alle abiturrelevanten Kompetenzen (KC 2017, EH 2025) in 15 DS
vermittelt – spielerisch, interaktiv, mit einer Lernplattform, die Abfragen live ausführt, sichtbar macht und
abiturgerecht prüft – plus ein vollständiges, für andere Lehrkräfte nutzbares Materialpaket.

**Erfolgskriterien**
1. Jede abiturverbindliche Kompetenz DB-K01 … DB-K47 (Abschnitt 4; ohne Kür K06, K13, K48) ist mindestens einer DS, einer Lab-Aufgabe und einer Prüfungsaufgabe
   (Verhör/Generalprobe/Klausur) zugeordnet – nachgewiesen in der Kompetenzmatrix.
2. Alle SQL-Anweisungen in Plattform, Material und Videos sind maschinell gegen die Datenbanken ausgeführt und vom
   EH-§8-Parser als konform bestätigt (CI grün).
3. Die Plattform besteht die Vertragsprüfung (`scripts/vertrag_pruefen.js`) und alle Testfälle aus `INTEGRATION.md`.
4. Eine fremde Lehrkraft kann die Einheit allein mit Gesamtübersicht + Lehrerhinweisen durchführen.
5. Schülerinnen und Schüler lösen in der Generalprobe eine Abitur-Aufgabe (30 BE) im Mittel mit ≥ 60 %.

**Nicht-Ziele:** Relationenalgebra; Unterabfragen, EXISTS/ANY/ALL, UNION im Kern; Transaktionen; DBMS-Administration;
(min,max)- oder Krähenfuß-Notation (höchstens als Exkurs-Hinweis).

---

## 2. Rahmenvorgaben (verdichtet)

### 2.1 KC 2017, Modul Datenbanken (S. 18)
- **Q-Phase (gA + eA):** Aufbau relationaler Datenbanken erläutern (Datensatz, Attribut, Primärschlüssel,
  Fremdschlüssel, Tabelle); Einfüge-, Änderungs-, Löschanomalien nennen; gegebenes Schema auf Anomalien und
  Redundanzen untersuchen; einfache Abfragen und Verbundabfragen über mehrere Tabellen; Abfragen mit Aggregatfunktionen.
- **Nur eA:** ER-Diagramm interpretieren; mit dem ER-Modell modellieren; ER-Modell in relationales Schema umsetzen;
  gegebene Modellierung beurteilen und verändern.
- **Datenschutz (S. 16):** rechtliche Rahmenbedingungen (informationelle Selbstbestimmung, Datenschutzrichtlinien);
  Chancen und Risiken der automatisierten Datenanalyse. Technische Schutzmöglichkeiten kennen.
- Normalformen, funktionale Abhängigkeit, Relationenalgebra, DDL/DML stehen **nicht** im KC.

### 2.2 EH 2025 §7 – Notation (verbindlich ab Abitur 2027)
- **Kurzschreibweise:** Primärschlüssel **unterstrichen**, Fremdschlüssel mit vorangestelltem **↑**:
  `Produkt(Nummer, Bezeichnung, Anzahl, ↑LKuerzel)` · `Bestellung(↑PNummer, ↑LKuerzel, Preis)`.
  Fremdschlüssel dürfen anders heißen als das referenzierte Attribut.
- **ER-Diagramm in Chen-Notation:** Entitätstyp (Rechteck), Beziehungstyp (Raute), Attribut (Ellipse),
  Schlüsselattribute gekennzeichnet (unterstrichen), Kardinalitäten **1 / n / m** an den Kanten („im Normalfall
  obligatorisch“). Attribute an Beziehungstypen erlaubt; **rekursive Beziehungen** möglich (Beispiel *istPateVon*).
  Fachbegriffe: Entitätstyp, Beziehungstyp, Schlüsselattribut, Kardinalität.
- ⚠ Im Original-PDF zu prüfen (Textextraktion verliert Formen/Unterstreichung/Farbe): Formen im Beispieldiagramm,
  Unterstreichungen, und ob §7/§8 **grün** (Hilfsmittel im Abitur) oder orange markiert sind.

### 2.3 EH 2025 §8 – SQL-Sprachumfang (wörtlich verdichtet)
```
SELECT [DISTINCT] * | spalte1 [AS s1], spalte2 [AS s2], …
FROM tabelle1 [t1], tabelle2 [t2], …
[WHERE bedingung1 (AND | OR) bedingung2 …]
[GROUP BY spalte1, spalte2, … [HAVING gruppenBedingung1 (AND | OR) …]]
[ORDER BY spalte1 [ASC | DESC], …]
[LIMIT anzahl]
```
- Spalten: Attribute, Aggregatfunktionen oder Berechnungen. Alias in GROUP BY und ORDER BY möglich.
- Berechnung `+ - * /` · Vergleich `= != > < >= <=`, `NOT`, `IS NULL`, `IN`, `BETWEEN`, `LIKE` (`_`, `%`).
- Aggregate `AVG COUNT MAX MIN SUM`.
- **GROUP-BY-Regel:** Alle Spalten im SELECT sind aggregiert oder in GROUP BY aufgezählt.
- **„Verschachtelte SQL-Anweisungen werden im Rahmen der zentralen Prüfungsaufgaben nicht thematisiert.“**
- Nicht enthalten: `JOIN … ON` (Verbund nur implizit über FROM/WHERE), Unterabfragen, UNION, DML/DDL, `<>`.

### 2.4 Befunde aus den Abituraufgaben 2021–2026 (19 Klausuren, gA/eA)
- Festes SQL-Muster: **2–3 Abfragen entwerfen + 1 gegebene Abfrage analysieren** („… welche Informationen die
  Abfrage im Sachzusammenhang liefert“).
- Anomalien in 18/19 Klausuren; Schlüsseleignung in 14/19; Verbund in 19/19; GROUP BY in 16/19.
- ER nur eA (9/9 eA, 0/10 gA): ergänzen/erweitern (8/9), seit 2025 auch **von Grund auf entwickeln**,
  Rückrichtung Schema → ER, Kardinalitäten begründen, ternär m:n:p (2025), zwei Rollenbeziehungen (Heim/Gast).
- Wiederkehrendes Muster seit 2023: **„zusammengelegte Tabelle“** auf Anomalien untersuchen.
- Seit 2025: viele kleine Teilaufgaben (a–g, 2–8 BE), neu „Vorgehen in Worten beschreiben“.
- ⚠ Ältere Lösungen verletzen die GROUP-BY-Regel (z. B. 2023 eA, 2025 gA) bzw. nutzen Alias in HAVING → im
  Abi-Kompass als „EH-2025-Hinweis“ markieren; wir lehren den Stil von 2026.
- Prognose 2027/28: rekursive Beziehung (neu im EH-Beispiel, noch nie geprüft), zwei FKs auf dieselbe Tabelle,
  IS NULL/IN/`!=`/LIMIT, konsequente GROUP-BY-Regel.

### 2.5 Operatoren (häufig in DB-Aufgaben)
entwerfen/entwickeln · analysieren/untersuchen · erläutern · beschreiben · begründen · beurteilen · ergänzen/erweitern
· nennen/angeben · erstellen · vergleichen · erörtern. Volle Liste mit Definition: Werkzeugkarte 7 des Ermittler-Handbuchs (Abschnitt 11.4).

### 2.6 Vertrag v1.2 §9 (MUSS) – was die Plattform unabhängig vom eigenen Design einhält
Node ≥ 20, Express, SQLite (better-sqlite3), Vanilla-JS ohne Build, keine CDNs, strikte CSP ohne Inline-Skripte,
`X-Robots-Tag: noindex`, Healthcheck, Docker + CapRover, `main` = live nur nach Freigabe, GitHub-Prüfung bei jedem Push ·
Lösungen/Erklärungen/Tipps nur serverseitig und erst nach dem Lösen, Boss-Aufgaben nur im laufenden Kampf ·
nur Anzeigename, `sub`, Kurs-IDs, Lernstand · **Welt → Level (1 je DS) → Arbeitsblatt + Lab + Boss** · Fallen-Liste
P1–P10 · `/gast`, `/themen` · Abitur-Stil · Begriffe „Kurs“, „Kurscode“, „persönlicher Code“, „Lehrkraft“,
„Warm-up“, „Team“ · Punkte nur automatisch · Punkteformel `round(p × max(0.25, 1 − 0.25·F − 0.2·T))`,
Standardpunkte 10/20/30, Rangschwellen 0/10/30/55/80 % · Aufgabenformat AlgoQuest-kompatibel, neue Blöcke im eigenen
`docs/AUFGABENFORMAT.md` mit Tests und Beispielwelt.

**Begriffs-Mapping:** Welt = **Akte**, Level = **Ermittlung** (1 je DS), Boss = **Verhör**. Im Code und im Manifest
bleiben `welt`, `level`, `boss` (Vertragsbegriffe); in der Oberfläche erscheinen Akte/Ermittlung/Verhör.

---

## 3. Didaktisches Konzept

### 3.1 Setting und Story („Das Phantom“)

Der Kurs ist das Ermittlerteam der **Datendetektei Weserstedt**. Chefin ist die (fiktive) Kommissarin a. D.
**Edda Lorenz**, die in Briefings auftritt (Präsentation, Lab-Intro, Videos). Seit Wochen manipuliert ein Unbekannter
– **„das Phantom“** – Datenbestände der Stadt und hinterlässt als Signatur einen Nachtfalter. Jede Akte ist ein
Auftrag mit eigener Datenbank; jedes gewonnene **Verhör** (Boss) bringt ein **Beweisstück** an die Pinnwand der Detektei.

| Akte | Auftrag | Spur zum Phantom | Beweisstück |
|---|---|---|---|
| 1 Das Fundbüro | Ein Fundstück ist aus dem Register verschwunden | Eintrag wurde geändert, Nachtfalter im Feld „Finder“ | Fundbuch-Seite |
| 2 Spur der Räder | Lastenräder von StadtRad verschwinden nachts | Ausleihen ohne Ende-Zeit über ein Kundenkonto | Schloss-Code |
| 3 Die Stadtfest-Kasse | Fehlbetrag in der Stadtfest-Kasse | Auffällige Bons zu einer Uhrzeit an einem Stand | Kassenbon |
| 4 Chaos im Vereinsarchiv | Die Beitragsliste des TuS Weserstedt stimmt nicht | Das Phantom nutzte eine Änderungsanomalie aus | Vereinsausweis |
| 5 Der Bauplan | Die Detektei braucht eine eigene Fall-Datenbank | Alle Spuren werden verknüpft (Personen, „kennt“) | Ermittlungsnetz |
| 6 Datenspuren | Finale: Daten zusammenführen | Quasi-Identifikatoren lassen nur eine Person übrig | Steckbrief |
| 7 Generalprobe | Ermittlerprüfung (Abitur-Format) | – | Detektei-Lizenz (Urkunde) |

**Wendung in Akte 6:** Das Phantom entpuppt sich als (fiktive) Datenschützerin, die zeigen wollte, wie leicht man alle
Bürger durchleuchten kann – und die Detektei hat es nur gefunden, *weil* sie genau das getan hat. Daraus entsteht die
Erörterung: Durfte die Detektei das? Was hätte die Stadt nie speichern dürfen? (KC IK4.1/IK4.2).

**Regeln für die Story:** alle Personen, Firmen und Orte frei erfunden; keine Klarnamen realer Personen; Story-Texte
geduzt und kurz (max. 3 Sätze pro Briefing im Lab); **Fachbegriffe ersetzen nie** die Story-Begriffe (Akte ≠ Tabelle).
Verhöre, Generalprobe und Klausur sind **nüchtern im Abitur-Stil** (gesiezt, Operatoren, BE) und nutzen **neue
Kontexte** (Transfer), nur ein Rahmensatz verbindet sie mit der Story.

### 3.2 Takt einer Doppelstunde

| Phase | Zeit | Inhalt |
|---|---|---|
| Warm-up | 10' | Papierkarte (Wiederholung der Vorstunde, Abi-nah); digital im Leitner-Trainer |
| Briefing / Unplugged | 15–20' | Fall-Einstieg, neue Begriffe, haptische Aktivität |
| Lab-Einsatz | 45' | Ermittlung im Lab (Stufen ★/★★/★★★), Arbeitsblatt parallel |
| Fallbesprechung | 10–15' | Sicherung, Abi-Ecke, Merkkasten, Ausblick |

Sozialformen: feste **Teams** (3–4) für Unplugged, Peer-Check und Wettbewerb an der Tafel; im Lab arbeitet jede/r
für sich (keine Team-Punkte im Lab).

### 3.3 Plan der 15 Doppelstunden

Kompetenz-IDs DB-Kxx siehe Abschnitt 4. ★ = Stufe, AB = Arbeitsblatt („Ermittlungsakte“).

#### Akte 1 – Das Fundbüro (SQL in einer Tabelle)
**DS 1 · Ermittlung 1.1 „Der erste Auftrag“** – K01, K02 (Einstieg), K15, K17, K21
- Briefing: Kick-off der Detektei, Ausweise, Plattform-Start über das Portal; Begriffe Tabelle, Datensatz,
  Attribut, Primärschlüssel am Fundbuch.
- Unplugged **Karteikarten-Filter**: Jede/r hält eine Fundsachen-Karte; die Lehrkraft „ruft“
  `SELECT … WHERE …` – wer passt, steht auf; ORDER BY = Aufstellen in Reihe. Klammern bei AND/OR live erleben (P6).
- Lab: SELECT/FROM/WHERE, Vergleichsoperatoren, AND/OR/NOT, ORDER BY (mehrstufig), Ergebnis vorhersagen.
- AB 1.1 · Abi-Ecke: „Entwerfen Sie eine SQL-Abfrage …“ (2 BE) · Video 0 + 1.

**DS 2 · Ermittlung 1.2 „Das verschwundene Fundstück“** – K15–K22, K32
- DISTINCT, LIKE (`_`, `%`), BETWEEN, IN, IS NULL, Berechnungen, AS, LIMIT; Literale (Text in `'…'`,
  Datum `'JJJJ-MM-TT'`), `!=` statt `<>`.
- Lab-Highlight: Das Fundstück wird über eine Kette aus drei Abfragen eingekreist.
- AB 1.2 · **Verhör 1** (Lab, 20'; Unterricht oder Hausaufgabe).

#### Akte 2 – Spur der Räder (Verbund über mehrere Tabellen)
**DS 3 · Ermittlung 2.1 „Der rote Faden“** – K03, K04, K05, K23, K16
- Fremdschlüssel, Kurzschreibweise (PK unterstrichen, ↑FK), FK mit abweichendem Namen (P7).
- Unplugged **Roter Faden**: zwei Kartenstapel (Räder, Stationen) → Kreuzprodukt mit Wollfäden legen; die
  WHERE-Bedingung kappt alle Fäden, bei denen FK ≠ PK. Danach dasselbe im **Spurenbrett** des Labs.
- Lab: impliziter Verbund `FROM a, b WHERE a.fk = b.pk`, Kreuzprodukt erkennen (P2), Tabellenpräfix (P7).
- AB 2.1 · Video 2.

**DS 4 · Ermittlung 2.2 „Nachtfahrten“** – K24, K18 (IS NULL), K22
- Verbund über 3–4 Tabellen, „Ermittlungsweg durchs Schema“ planen; Tabellenaliase; **zwei FKs auf dieselbe Tabelle**
  (Start-/Zielstation) → Tabelle zweimal mit Alias; laufende Ausleihen mit `ende_zeit IS NULL`.
- AB 2.2 · **Verhör 2**.

#### Akte 3 – Die Stadtfest-Kasse (Aggregation und Gruppierung)
**DS 5 · Ermittlung 3.1 „Kassensturz“** – K25, K26
- Aggregatfunktionen ohne GROUP BY; **COUNT vs. SUM(menge)** (P4); GROUP BY + **GROUP-BY-Regel** (P3);
  nach Schlüssel statt Name gruppieren (Gleichnamige!).
- Unplugged **Menschliches GROUP BY**: Teams stellen sich nach Merkmal in „Fächer“, Zähler/Summierer je Fach.
  Danach **Sortierfächer** im Lab.
- AB 3.1 · Video 3.

**DS 6 · Ermittlung 3.2 „Die Statistik lügt nicht“** – K27, K22, K28, K30, K31
- HAVING vs. WHERE (P1); Top-n mit ORDER BY + LIMIT, Gleichstand-Problem; **Vervielfachung im Verbund** (P2b);
  **Abfrage analysieren** im Sachzusammenhang (P10) und **Vorgehen in Worten**; **Zeitlupe** der Auswertungsreihenfolge.
- AB 3.2 · **Verhör 3** (SQL-Gesamt).

#### Akte 4 – Chaos im Vereinsarchiv (Redundanz, Anomalien, Schlüssel)
**DS 7 · Ermittlung 4.1 „Die Excel-Liste“** – K07, K08, K10, K14
- Rohtabelle des TuS Weserstedt: Redundanz, Einfüge-/Änderungs-/Löschanomalie **am konkreten Datensatz**
  (P10: Anomalie ohne Beispiel), nicht-atomare Werte („Fußball, Tennis“).
- Unplugged **Anomalie-Rennen**: Teams pflegen parallel dieselbe Papierliste nach Änderungsaufträgen (Trainerwechsel,
  Austritt, neue Abteilung) – am Ende widerspricht sich die Liste. Danach **Anomalie-Simulator** im Lab.
- AB 4.1 · Video 4.

**DS 8 · Ermittlung 4.2 „Ordnung ins Archiv“** – K02, K09, K11, K12 (K13 Kür)
- Schlüssel beurteilen: eindeutig, nicht NULL, minimal; **Ausschnitt-Falle** (P8); künstlich vs. natürlich;
  „zusammengelegte Tabelle“ untersuchen (auch: „keine Anomalie möglich“); verlustfrei und redundanzfrei zerlegen,
  Redundanzfreiheit begründen. **Kür:** funktionale Abhängigkeit, 1.–3. NF als Prüfwerkzeug.
- Lab: **Zerlegungs-Puzzle**.
- AB 4.2 · **Verhör 4**.

#### Akte 5 – Der Bauplan (ER-Modell und Überführung, nur eA)
**DS 9 · Ermittlung 5.1 „Baupläne lesen“** – K33, K34, K36
- Chen-Notation nach EH §7; ER im Sachzusammenhang erläutern; Kardinalitäten 1:1/1:n/n:m über Mengendiagramme und
  **aus Tabellendaten** ableiten; Beziehungsattribute.
- Unplugged **Fäden-Kardinalitäten**: Rollenkarten (Ermittler, Fälle, Beweisstücke) – Verbindungen mit Fäden legen,
  Kardinalität ablesen.
- AB 5.1 · Video 5.

**DS 10 · Ermittlung 5.2 „Der Architekturwettbewerb“** – K35, K37, K38, K39, K40
- ER aus Anforderungstext entwickeln/erweitern; **rekursive Beziehung** (Person *kennt* Person, Ermittler *betreut*
  Ermittler); zwei Beziehungen zwischen denselben Entitätstypen (Rollen); ternär m:n:p lesen; Grenzen der Notation
  („genau drei“ ist mit 1/n/m nicht ausdrückbar); Modellierungen beurteilen.
- **Architekturwettbewerb**: Teams modellieren die Fall-Datenbank der Detektei auf Plakat/iPad, Galerie-Rundgang mit
  Bewertungsbogen (Kriterien = Kernpunkte), danach **Bauplan-Tisch** im Lab.
- AB 5.2.

**DS 11 · Ermittlung 5.3 „Vom Plan zur Datenbank“** – K41, K42, K43, K23/K24 (Transfer)
- Überführungsregeln: Entitätstyp → Tabelle; 1:n → FK auf der n-Seite (inkl. Beziehungsattribute); n:m → eigene
  Tabelle mit zusammengesetztem Schlüssel (bzw. zusätzlichem Schlüsselattribut, wenn Paare mehrfach vorkommen);
  1:1; rekursiv (FK auf die eigene Tabelle bzw. Beziehungstabelle mit zwei FKs); ternär. Umsetzungen **begründen**;
  Rückrichtung Schema → ER.
- Lab: **Schema-Werkbank**; danach SQL auf der eigenen (Referenz-)Fall-Datenbank.
- AB 5.3 · Video 6 · **Verhör 5**.

#### Akte 6 – Datenspuren (Datenschutz und automatisierte Datenanalyse)
**DS 12 · Ermittlung 6.1 „Das Phantom“** – K44, K45, K46, K24, K26
- Verknüpfen pseudonymer Datenbestände (StadtRad, Stadtfest, Verein, WeserApp) per Verbund und GROUP BY;
  Quasi-Identifikatoren (Jahrgang + Stadtteil + Tarif) → Enttarnung; **Schlussplädoyer** im Lab.
- Danach Erörterung: DSGVO-Grundsätze (Zweckbindung, Datenminimierung, Transparenz, Rechtsgrundlage/Einwilligung,
  Speicherbegrenzung), besondere Kategorien (Gesundheitsdaten), kleine Gruppen machen Personen erkennbar,
  Datenschutz vs. Datensicherheit, technische Maßnahmen (Pseudonymisierung, Aggregation, Zugriffsrechte).
- Rollenkarten-Debatte „Durfte die Detektei das?“ (Stadt, Detektei, Phantom, Bürgerin, Datenschutzbehörde).
- AB 6.1 (ersetzt/erweitert das bisherige Datenschutz-AB auf LK-Niveau) · **Verhör 6** (kurz, 15').

#### Akte 7 – Generalprobe
**DS 13 · „Die Ermittlerprüfung“** – alle
- Probeklausur im Abitur-Format: eA 30 BE (~70'), gA-Variante 25 BE; danach Peer-Korrektur nach Kernpunkten
  (Erwartungshorizont), Fallen-Check P1–P10. Verhör 7 (Lab-Generalprobe, 30') optional als Hausaufgabe.
- Abschluss: Endstand festschreiben, Urkunden „Detektei-Lizenz“.

#### Kür (entfallen bei Zeitmangel)
**K1 · „Eigene Datenbank bauen“** (nach DS 11): CREATE TABLE mit PRIMARY KEY/FOREIGN KEY, INSERT, referentielle
Integrität erleben (FK-Verletzung), Ausblick `JOIN … ON` und `LEFT JOIN` (Personen ohne Fall) – klar markiert als
**„nicht im Abitur“**. Lab: Sandbox-Konsole im Schreibmodus (pro Schüler eigene In-Memory-DB).

**K2 · „Escape Room Weserstedt“** (vor DS 13): Live-Modus im Kurs – Teams lösen Stationen (SQL, Schlüssel, ER),
jede richtige Lösung liefert einen Code für das nächste Schloss; Beamer-Rangliste. Wiederholung aller Akten.

**Klausur** (separater Termin, nicht in den 15 DS): eA + gA, Klausur und Nachschreibklausur mit Erwartungshorizont.

### 3.4 Grundkurs-Pfad (gA)
Akte 5 entfällt (ER ist nur eA). gA-Kurse: DS 1–8, 12, 13 (= 10 DS) + optional K2. Lehrkraft stellt im Kurs „Niveau:
gA“ ein → Akte 5 und eA-markierte Aufgaben sind ausgeblendet; Ränge beziehen sich wie üblich auf freigeschaltete Welten.
Generalprobe/Klausur liegen in gA-Fassung (25 BE) vor.

### 3.5 Differenzierung
- Stufen ★/★★/★★★ in jeder Ermittlung (Mix ≈ 40/40/20 %), Tipps (kosten Punkte), „Lösung zeigen“.
- **Cold Case** auf jedem AB und im Lab (ohne Punkte): offene Zusatzfälle für Schnelle.
- Kür-Inhalte (Normalformen, JOIN-Ausblick) als markierte Zusatzermittlungen.
- Zeitlupe, Spurenbrett und Sortierfächer als Verstehenshilfen für Langsamere – jederzeit aus der Konsole aufrufbar.

---

## 4. Kompetenzraster Datenbanken (DB-K01 … DB-K48)

Niveau: **gA/eA** = beide · **eA** = nur eA · **Kür** = nicht abiturverbindlich. Quelle: KC S. = Kerncurriculum,
EH § = Ergänzende Hinweise 2025, Abi = Beleg in Abituraufgaben. DS = Einführung (spätere DS üben weiter).

| ID | Kompetenz | Niveau | Quelle | DS |
|---|---|---|---|---|
| **A – Relationales Modell und Schlüssel** |||||
| K01 | Aufbau relationaler DB mit Tabelle, Datensatz, Attribut erläutern | gA/eA | KC S. 18 | 1 |
| K02 | Primärschlüssel erläutern; Eignung (auch zusammengesetzt, künstlich) begründen/beurteilen | gA/eA | KC; Abi 22–26 | 1, 8 |
| K03 | Fremdschlüssel erläutern und als Verweis nutzen (auch mit abweichendem Namen) | gA/eA | KC; EH §7 | 3 |
| K04 | Kurzschreibweise lesen/notieren (PK unterstrichen, ↑FK) | gA/eA | EH §7 | 3 |
| K05 | Kennzeichnungen im Schema erläutern | gA/eA | Abi G21N, G23N, G24N | 3 |
| K06 | Referentielle Integrität erläutern | Kür | – | K1 |
| **B – Redundanz, Anomalien, Schemaqualität** |||||
| K07 | Redundanzen identifizieren und beschreiben | gA/eA | KC; Abi E21 | 7 |
| K08 | Einfüge-, Änderungs-, Löschanomalie nennen und an konkreten Daten erläutern | gA/eA | KC; Abi 18/19 | 7 |
| K09 | Gegebenes Schema auf Anomalien untersuchen (auch „keine Anomalie möglich“) | gA/eA | KC; Abi E23, E26 | 8 |
| K10 | Zusammenhang Redundanz ↔ Anomalie erläutern | gA/eA | Abi G21N, E26 | 7 |
| K11 | Tabelle verlustfrei in ein redundanzfreies Schema zerlegen | eA | KC eA; Abi E22N | 8 |
| K12 | Redundanzfreiheit eines Schemas begründen | eA | Abi E26 | 8 |
| K13 | Funktionale/volle/transitive Abhängigkeit; 1.–3. NF als Prüfwerkzeug | Kür | – | 8 |
| K14 | Nicht-atomare Werte erkennen und Folgen für Auswertungen erläutern | gA/eA | Abi E21, G24N | 7 |
| **C – SQL (Umfang EH §8)** |||||
| K15 | SELECT … FROM … WHERE, `*`, DISTINCT | gA/eA | EH §8 | 1 |
| K16 | Spaltenalias AS, Tabellenalias, qualifizierte Namen | gA/eA | EH §8 | 2, 3 |
| K17 | Vergleiche, AND/OR/NOT, Klammersetzung | gA/eA | EH §8; Abi E26, G23 | 1 |
| K18 | BETWEEN, IN (Werteliste), IS NULL | gA/eA | EH §8 | 2, 4 |
| K19 | LIKE mit `_` und `%` | gA/eA | EH §8 | 2 |
| K20 | Berechnungen in Spalten und Bedingungen | gA/eA | EH §8; Abi E21, E25 | 2 |
| K21 | ORDER BY ASC/DESC, mehrstufig, auch über Alias/Aggregat | gA/eA | EH §8 | 1 |
| K22 | LIMIT (Top-n, „die meisten“) | gA/eA | EH §8; Abi E22N, E26 | 2, 6 |
| K23 | Verbund über 2 Tabellen (implizit, FK = PK) | gA/eA | KC; EH §8 | 3 |
| K24 | Verbund über ≥ 3 Tabellen; zwei FKs auf dieselbe Tabelle (Tabellenalias) | gA/eA | Abi E25, E26 | 4 |
| K25 | Aggregatfunktionen AVG, COUNT, MAX, MIN, SUM (auch ohne GROUP BY) | gA/eA | KC; EH §8 | 5 |
| K26 | GROUP BY unter Einhaltung der GROUP-BY-Regel | gA/eA | EH §8 | 5 |
| K27 | HAVING; WHERE und HAVING unterscheiden | gA/eA | EH §8; Abi E22 | 6 |
| K28 | Gegebene Abfrage analysieren, Information im Sachzusammenhang beschreiben | gA/eA | Abi 14/19 | 6 |
| K29 | Ergebnis einer Abfrage / Anzahl Datensätze konkret angeben | gA/eA | Abi G21, G24 | 1–6 |
| K30 | Vorgehen zur Beantwortung einer Frage in Worten beschreiben | gA/eA | Abi E25N, G25N | 6 |
| K31 | Korrektheit einer Abfrage beurteilen / Fehler finden | eA | Abi E21N, E22 | 6 |
| K32 | Literale korrekt notieren (Text `'…'`, Datum `'JJJJ-MM-TT'`, Zahl) | gA/eA | Abi | 2 |
| **D – ER-Modellierung (Chen, EH §7)** |||||
| K33 | Gegebenes ER-Diagramm im Sachzusammenhang interpretieren | eA | KC eA; EH §7 | 9 |
| K34 | Kardinalitäten 1:1, 1:n, n:m bestimmen und begründen (auch aus Daten/Mengendiagrammen) | eA | Abi E22, E23N, E25 | 9 |
| K35 | ER-Modell aus Anforderungstext entwickeln (Schlüssel und Kardinalitäten vollständig) | eA | KC eA; Abi E26 | 10 |
| K36 | Attribute an Beziehungstypen modellieren | eA | EH §7 | 9 |
| K37 | Rekursive Beziehungen modellieren | eA | EH §7 | 10 |
| K38 | Mehrere Beziehungen zwischen denselben Entitätstypen; ternär m:n:p lesen/ergänzen | eA | Abi E25 | 10 |
| K39 | Gegebenes ER-Modell ergänzen/erweitern | eA | Abi 8/9 eA | 10 |
| K40 | Modellierung beurteilen (Alternativen, Vollständigkeit, Grenzen der Notation) | eA | KC eA; Abi E21, E25 | 10 |
| K41 | ER-Modell in Relationenschema überführen (alle Regeln) | eA | KC eA; Abi E21, E26 | 11 |
| K42 | Umsetzungsregeln begründen (n:m eigene Tabelle, 1:n nicht) | eA | Abi E21N, E22 | 11 |
| K43 | Aus Relationenschema das ER-Diagramm rekonstruieren | eA | Abi E21N, E25N | 11 |
| **E – Datenschutz, Informatik und Gesellschaft** |||||
| K44 | Rechtliche Rahmenbedingungen: informationelle Selbstbestimmung, DSGVO-Grundsätze | gA/eA | KC S. 16 | 12 |
| K45 | Prinzipien auf Fälle anwenden; Nutzungen (z. B. Werbung) und deren Voraussetzungen beurteilen | gA/eA | KC; Abi G23N | 12 |
| K46 | Chancen/Risiken automatisierter Datenanalyse; Profilbildung, Quasi-Identifikatoren; Datenschutz vs. Datensicherheit, technische Maßnahmen | gA/eA | KC S. 16; Abi G22, G23 | 12 |
| **F – Prozessbezogen** |||||
| K47 | Fachsprache der EH konsequent nutzen (Entitätstyp, Beziehungstyp, Kardinalität, PK/FK) | gA/eA | PK3.1 | alle |
| K48 | Datenbank im Team planen, umsetzen, dokumentieren | Kür | KC S. 20 | K1 |

Die **Kompetenzmatrix** (Lieferung in Phase 0, Abschnitt 16; Teil der Gesamtübersicht, Abschnitt 11.4) ordnet jeder ID die Lab-Aufgaben-IDs, AB-Aufgaben, Warm-up-Karten,
Verhör- und Klausuraufgaben zu; ein Prüfskript meldet IDs ohne Prüfungsaufgabe.

---

## 5. Fallen P1–P10 (Datenbanken)

Gleiches Schema wie AlgoQuest (Nummer · Kurztitel · Erläuterung). Verbindlich überall: Lab-Feld `fallen`, Profil
„Deine Fallen“, Fallen-Profil des Kurses, Werkzeugkarte 8, Lehrerhinweise, Videos, Erwartungshorizonte.

| Nr. | Kurztitel | Erläuterung | Beleg (Abi) |
|---|---|---|---|
| P1 | WHERE ↔ HAVING | Zeilenbedingung in HAVING oder Gruppenbedingung in WHERE; WHERE filtert *vor* dem Gruppieren | E22 c, E23 c, E26 g |
| P2 | Verbund fehlt oder vervielfacht | Verbundbedingung fehlt (Kreuzprodukt), falscher FK-Pfad, oder Verbund über zwei 1:n-Beziehungen vervielfacht Zeilen → COUNT/SUM falsch | E21N b |
| P3 | GROUP-BY-Regel | Spalte im SELECT weder aggregiert noch gruppiert; nach Name statt Schlüssel gruppiert (Gleichnamige verschmelzen) | EH §8; G25 f |
| P4 | COUNT ↔ SUM | „Anzahl Tickets“ = SUM(Anzahl), „Anzahl Käufe“ = COUNT(*); COUNT(*) vs. COUNT(spalte) bei NULL | E21N b3, E23N d |
| P5 | NULL und Literale | `= NULL` statt `IS NULL`; Text ohne Hochkommata; Datumsformat/Typ (Text vs. Zahl) falsch | E22 c, G25N e |
| P6 | Bedingungslogik | AND/OR ohne Klammern; Grenzen (`>` statt `>=`, BETWEEN inklusive); LIKE-Platzhalter falsch | E26 f, G23 b |
| P7 | Mehrdeutig oder falsch benannt | Tabellenpräfix fehlt bei gleichnamigen Spalten; FK heißt anders als der PK; Alias falsch verwendet | G23N b, E25 |
| P8 | Schlüssel falsch beurteilt | Eindeutigkeit aus Datenausschnitt geschlossen; NULL im Schlüssel; nicht minimal; Mehrfachvorkommen übersehen | G23N a, G25N b, E26 e |
| P9 | ER oder Überführung fehlerhaft | Kardinalität vertauscht/fehlt, Schlüsselattribut nicht markiert, Beziehungsattribut falsch platziert, FK auf falscher Seite, n:m ohne eigene Tabelle | E21 b, E22 b |
| P10 | Operator verfehlt | Analyse ohne Sachzusammenhang; Anomalie nur benannt statt am Datensatz erläutert; „begründen“ ohne Begründung | Operatorenliste |

---

## 6. Konventionen (gelten in Plattform, Material, Videos)

### 6.1 Notation
- **Kurzschreibweise:** `Ausleihe(AusleihID, ↑RadID, ↑KundenID, ↑StartStation, ↑ZielStation, Start, Ende)`;
  PK unterstrichen (in der Plattform als unterstrichener Text, in Word als Unterstreichung), FK mit `↑` direkt vor dem
  Attributnamen, Komma + Leerzeichen als Trenner.
- **ER-Diagramme:** Chen-Notation nach EH §7, Kardinalitäten nur `1`, `n`, `m` (ternär zusätzlich `p`), Schlüsselattribute
  unterstrichen, Beziehungsnamen als Verb in lowerCamelCase (*leitet*, *istPateVon*, *kennt*), Entitätstypen im Singular,
  großgeschrieben.
- **Tabellen- und Spaltennamen in unseren Datenbanken:** Tabellen im Singular, UpperCamelCase (`Ausleihe`,
  `Fundsache`); Spalten UpperCamelCase ohne Umlaute (`Stellplaetze`, `Funddatum`); künstliche Schlüssel `…ID`/`…Nr`.
  (Abweichung zur SQL-Werkstatt, die snake_case nutzt – die StadtRad-Daten werden beim Übernehmen umbenannt.)
- **Beziehungstabellen** aus n:m- bzw. rekursiven Beziehungen heißen wie der Beziehungstyp in lowerCamelCase
  (`kennt`, `verdaechtig`) – so wie in den Abituraufgaben (`kauft`, `hatDrucker`). Ausnahme: Beziehungen, die fachlich
  ein eigenes Ding mit eigenem Namen sind, dürfen als Substantiv heißen (`Aussage` = ternäre Beziehung Person–Fall–Ort,
  `Schicht`, `Mitgliedschaft`, `Position`).

### 6.2 SQL-Stil (Abi-Stil 2026)
- Schlüsselwörter groß, je Klausel eine Zeile, AND-Bedingungen eingerückt.
- **Verbund nur implizit:** `FROM Rad, Station WHERE Rad.StationID = Station.StationID`.
- Tabellenalias **ohne AS** wie im EH (`FROM Station s1, Station s2`); `AS` bei Tabellen wird akzeptiert, nicht gelehrt.
- Spaltenalias mit `AS`; **kein Alias in HAVING** (Aggregat wiederholen); Alias in ORDER BY erlaubt.
- `!=` statt `<>`; Text in einfachen Hochkommata; Datum als Text `'JJJJ-MM-TT'` (Uhrzeit `'JJJJ-MM-TT hh:mm'`).
- **GROUP-BY-Regel strikt:** z. B. `GROUP BY Kunde.KundenID, Kunde.Vorname, Kunde.Nachname`.
- `/` zwischen Ganzzahlen = ganzzahlige Division (SQLite verhält sich gleich) – in Aufgaben thematisieren.
- LIMIT-Aufgaben nur auf Daten ohne Gleichstand an der Schnittkante (oder Gleichstand ausdrücklich thematisieren).

### 6.3 Sprache
- Alles auf Deutsch (UI, Code-Bezeichner, Kommentare, Commits, Doku). Schüler werden **geduzt**; Verhöre,
  Generalprobe, Klausur, Erwartungshorizonte, Abi-Ecken **gesiezt** mit Operatoren und `[x BE]`.
- Begriffe nach Vertrag: Kurs, Kurscode, persönlicher Code, Lehrkraft, Warm-up, Team; keine „XP“.
- Fachbegriffe nach EH: Entitätstyp/Beziehungstyp (nicht „Entitätsmenge“), Primär-/Fremdschlüssel, Verbund,
  Datensatz, Attribut.

### 6.4 Daten und Namen
- Alle Namen frei erfunden, Personennamen in Daten als Vorname + Nachname aus kuratierter Liste ohne reale Bezüge,
  keine realen Firmen; keine echten Adressen/Telefonnummern (Format `0000-…`).
- Beispiele in Videos und Gastmodus sind **eigene Daten**, nie Lab-/AB-/Klausuraufgaben (keine Lösungen verraten).

---

## 7. Plattform

### 7.1 Architektur im Überblick

```
Browser (Vanilla JS, ES-Module, keine Build-Stufe)            Server (Node ≥ 20, Express 5)
┌──────────────────────────────────────────────┐            ┌─────────────────────────────────────────────┐
│ Seiten: start, akte, ermittlung, konsole,     │  JSON/SSE  │ src/kern/   SSO-Client, Sitzung, Sicherheit,│
│ lehrkraft, board, themen, gast, urkunden      │◄─────────►│             Verbund-API, Manifest, Punkte   │
│ Renderer (Blöcke), Interaktionen              │            │ src/sql/    EH8-Parser, Sandbox-Pool,       │
│ sql-worker.js  ── sql.js (WASM, selbst gehost)│            │             SQL-Prüfer, Diagnose, Fehlertexte│
│ Zeitlupe · Spurenbrett · Sortierfächer        │            │ src/er/     ER-Graph-Abgleich, Schema-Prüfer│
│ Bauplan-Tisch (SVG) · Schema-Werkbank         │            │ src/content Prüfer je Interaktion, Validator,│
│ Anomalie-Simulator · Zerlegungs-Puzzle        │            │             Trainings-Generatoren           │
└──────────────────────────────────────────────┘            │ src/services Lernen, Verhör, Warm-up, Live, │
                                                            │             Auswertung, Material, Gast      │
       Übungs-DBs (öffentlich, ohne Randfälle) ◄────────────│ data/ (Volume): plattform.sqlite            │
                                                            │ seed/: Akten-JSON, DB-Skripte, Warm-up      │
                                                            └─────────────────────────────────────────────┘
```

- **Kern** (`src/kern/`): alles, was Vertrag §13.3 als gemeinsamen Kern nennt (Sicherheit, Sitzungen, SSO-Client,
  Verbund-API, Manifest, Punkte/Ränge, Basis-Renderer und Basis-Interaktionen). Keine Abhängigkeit von `src/sql`
  oder `src/er`. Ziel: später ohne Umbau als `lab-kern` auslagerbar. `src/kern/jwt.js` = unverändert aus
  `frankjuchim/labs/src/jwt.js`; `scripts/vertrag_pruefen.js` = unverändert aus labs.
- Abhängigkeiten (Laufzeit): `express`, `better-sqlite3`, `helmet`; Browser: `sql.js` (MIT) als vendorte Datei.
  Entwicklung: `supertest`, `playwright-core`. Keine weiteren Pakete ohne Eintrag in diesem Abschnitt.

### 7.2 SQL im Browser („Ausführen“)
- `public/static/vendor/sql-wasm.js` + `sql-wasm.wasm` (sql.js, Version festnageln, Lizenz beilegen), geladen in
  einem **Web Worker** (`sql-worker.js`). Abbruch-Knopf und automatischer Abbruch nach 3 s → `worker.terminate()` +
  Neustart. Ergebnisanzeige max. 300 Zeilen (Zähler zeigt Gesamtzahl).
- Jede Akte hat eine **öffentliche Übungs-DB** (ohne Randfall-Varianten), ausgeliefert als SQLite-Datei unter
  `/db/<name>.sqlite` (Cache 1 h). Sie ist identisch mit der „Haupt-DB“ des Prüfers.
- **CSP** (zusätzlich zu den AlgoQuest-Regeln): `script-src 'self' 'wasm-unsafe-eval'; worker-src 'self';
  connect-src 'self'`. Kein `unsafe-inline`, kein `unsafe-eval`. `wasm-unsafe-eval` ist keine Inline-Ausnahme
  (README begründet es). Fallback, falls WASM blockiert ist: „Ausführen“ läuft **serverseitig** über die Sandbox
  (`POST /api/sql/ausfuehren`, nur Haupt-DB, Rate-Limit, Abschnitt 18); `sql-asm.js` nur dort, wo er im Worker läuft
  (Feature-Erkennung per Probelauf).
- Entwürfe je Aufgabe nur im `localStorage` des Geräts (try/catch, Gerät-lokal), nie auf dem Server.

### 7.3 EH-§8-Parser (`src/sql/parser.js`, isomorph: Server und Browser)
- Eigener Tokenizer + rekursiver Abstieg für **genau** den Sprachumfang aus Abschnitt 2.3, plus erkannte
  „Fremdkörper“ (JOIN … ON, Unterabfrage, `<>`, UNION, DML/DDL), die als eigener Knoten geparst werden, damit gezielt
  gewarnt werden kann. Ausgabe: AST mit Positionen (Zeile/Spalte) für Markierungen im Editor.
- **Regelprüfungen** (Code · Falle · Text-Beispiel):
  | Code | P | Prüfung |
  |---|---|---|
  | `GB_REGEL` | P3 | SELECT-Spalte weder aggregiert noch in GROUP BY |
  | `HAVING_OHNE_AGG` | P1 | HAVING-Bedingung ohne Aggregat → gehört in WHERE |
  | `WHERE_MIT_AGG` | P1 | Aggregat in WHERE |
  | `ALIAS_IN_HAVING` | P3 | Spaltenalias in HAVING (nicht EH-konform) |
  | `MEHRDEUTIG` | P7 | Spalte existiert in mehreren FROM-Tabellen ohne Präfix |
  | `KEIN_VERBUND` | P2 | ≥ 2 Tabellen in FROM, aber kein Verbundprädikat zwischen einer Tabelle und den übrigen |
  | `NULL_VERGLEICH` | P5 | `= NULL` / `!= NULL` |
  | `AND_OR_MISCH` | P6 | AND und OR auf einer Ebene ohne Klammern (Hinweis, kein Fehler) |
  | `JOIN_ON` | – | JOIN … ON erkannt → Abimodus: „Im Abitur schreibst du den Verbund mit FROM … WHERE“ |
  | `UNTERABFRAGE` | – | verschachteltes SELECT → nicht im Abitur |
  | `UNGLEICH_ALT` | – | `<>` → „Im Abitur: !=“ |
  | `NICHT_SELECT` | – | DML/DDL in einer SELECT-Aufgabe |
- **Abimodus-Stufen** je Aufgabe: `streng` (Verhör, Generalprobe: Fremdkörper = Fehlversuch mit Hinweis),
  `hinweis` (Ermittlungen: Abfrage läuft, Hinweis wird angezeigt), `aus` (Kür-Sandbox).
- **Fehlertexte:** SQLite-Meldungen werden auf deutsche Texte abgebildet (`no such column: X` → „Die Spalte X gibt es
  nicht – Tippfehler oder fehlendes Tabellenpräfix?“). Liste in `src/sql/fehlertexte.js`, getestet.

### 7.4 SQL-Prüfung auf dem Server („Prüfen“)
- **Sandbox** (`src/sql/sandbox.js`): Pool aus 2–4 **Kindprozessen** (`child_process.fork`, Abschnitt 18: `worker_threads`
  lassen sich während einer laufenden SQLite-Abfrage nicht beenden); jeder Prozess hält die DB-Varianten als Buffer und
  erzeugt je Prüfung eine In-Memory-Kopie (`new Database(buffer)`, im Spike geprüft).
  Pro Anweisung: nur **eine** Anweisung; bei SELECT-Aufgaben `stmt.readonly` muss wahr sein + `PRAGMA query_only`;
  verbotene Tokens (ATTACH, DETACH, PRAGMA, VACUUM, load_extension, `.`-Befehle); max. 4 000 Zeichen; **Zeitlimit
  1,5 s** (danach Prozess mit `SIGKILL` beenden und neu starten); max. 5 000 Ergebniszeilen; Rate-Limit je Konto (z. B. 30/min).
  Kein Zugriff auf die Plattform-Datenbank (eigener Prozesskontext, keine Dateipfade).
- **Prüfablauf** für Interaktion `sql`:
  1. Parsen + Regelprüfung (Abimodus der Aufgabe).
  2. Schüler- und Musterabfrage auf **Haupt-DB + allen Randfall-Varianten** der Aufgabe ausführen.
  3. Vergleich je Variante: Spaltenanzahl; Spaltennamen nur bei `aliasPflicht` (normalisiert: Groß/Klein, Leerzeichen,
     Umlaute); Zeilen als **Multimenge** (Zahlen auf 1e-6 gerundet, Text getrimmt, NULL eigener Wert);
     Reihenfolge nur bei `sortierung: [{spalte, richtung}]` (mehrstufig, Gleichstände beliebig).
  4. Richtig ⇔ alle Varianten stimmen. Sonst **Diagnose** (keine Lösungsdaten zurück):
     Zeilenzahl zu viel/zu wenig · Produkt der Tabellengrößen → P2 · fehlende Zeilen = genau die NULL-FK-Zeilen → P5 ·
     richtig bis auf Reihenfolge · falsche Spaltenanzahl/-namen · „stimmt auf der Übungs-DB, aber nicht auf einer
     Prüf-DB“ (→ Hinweis „Deine Abfrage passt nur zufällig – denk an Gleichnamige/NULL/Grenzwerte“) + Parser-Hinweise.
  5. Antwort: `{ ok, diagnose: [{code, falle, text}], zeilen: <Anzahl Schülerergebnis> }`; Erklärung/Musterlösung erst
     nach Lösen oder „Lösung zeigen“ (Vertrag §9).
- **Randfall-Varianten** je DB (erzeugt per Skript, Abschnitt 9): `+null` (NULL in FK/Vergleichsspalten), `+gleichnamig`
  (doppelte Namen), `+grenze` (Werte genau auf Grenzen), `+gleichstand` (Ties), `+leer` (Gruppen ohne Zeilen).
  Eine Aufgabe nennt, welche Varianten gelten (`varianten: ["null","gleichnamig"]`).

### 7.5 Aufgabenformat – neue Blöcke und Interaktionen
Basis bleibt AlgoQuest `docs/AUFGABENFORMAT.md` (Blöcke `text`, `hinweis`, `code`, `tabelle`; Interaktionen `gaps`,
`choice`, `order`, `lines`, `match`; Punkte, Tipps, `fallen`, `erklaerung`, Boss-Pool, Validator). Ids: `A<n>-E<k>-<nn>`
(Akte n, Ermittlung k) bzw. `A<n>-V-<nn>` (Verhör). Neu im eigenen `docs/AUFGABENFORMAT.md`:

**Blöcke**
| Block | Zweck |
|---|---|
| `dbtabelle` | Datentabelle mit Kopf (PK unterstrichen, ↑FK), NULL als „NULL“ grau; optional Zellen markiert; Lücken möglich |
| `schema` | Relationenschema in Kurzschreibweise (eine oder mehrere Relationen) |
| `er` | ER-Diagramm (Chen) aus JSON-Graph + Layout, als SVG |
| `mengen` | Mengendiagramm zweier Mengen mit Verbindungslinien (Kardinalitäten) |
| `sql` | SQL mit Zeilennummern und Hervorhebung (wie `code`, Sprache SQL) |
| `datenbank` | Verweis auf Übungs-DB + Schema-Browser-Kachel („Diese Ermittlung nutzt: StadtRad“) |

**Interaktionen** (Prüfung immer serverseitig)
| `kind` | Inhalt | Prüfung |
|---|---|---|
| `sql` | Abfrage schreiben in der Ermittlungskonsole (Ausführen lokal, Prüfen am Server) | Abschnitt 7.4; Felder `loesung.sql`, `datenbank`, `varianten`, `sortierung`, `aliasPflicht`, `abimodus` |
| `zeilen` | Zeilen einer `dbtabelle` antippen (z. B. „welche Datensätze liefert WHERE …?“, „welche Zeilen sind redundant?“) | Menge der Zeilen-Indizes |
| `zellen` | Zellen antippen (Redundanz, Anomalie-Stelle, Schlüsselkandidat) | Menge der Zellen; optional Reihenfolge |
| `ergebnis` | Ergebnistabelle einer gegebenen Abfrage vorhersagen (Zeilen/Spalten ausfüllen; Zeilen hinzufügen/löschen) | Multimenge bzw. Liste, normalisiert |
| `schema` | Schema-Werkbank: Relationen und Attribute anlegen, PK (Unterstreichen) und ↑FK + Zielrelation setzen | Deterministischer Abgleich gegen Musterschemata (mehrere zulässige Lösungen, Synonyme je Aufgabe); Teilfeedback je Relation |
| `er` | Bauplan-Tisch: Modi `lesen` (Elemente antippen/zuordnen), `ergaenzen` (Startdiagramm), `entwickeln` (leer) | Graph-Abgleich (Abschnitt 7.6.4) mit Kriterienliste und Teilfeedback |
| `zerlegen` | Zerlegungs-Puzzle: Spalten einer Rohtabelle auf neue Tabellen verteilen, Schlüssel markieren | Verlustfreiheit + Redundanzfreiheit anhand hinterlegter funktionaler Abhängigkeiten; Musterzerlegungen |
| `anomalie` | Anomalie-Simulator: Operation (INSERT/UPDATE/DELETE-Szenario) auswählen/ausführen, Anomalieart zuordnen | Zuordnung + betroffene Zellen |
| `kernpunkte` | Freitext (bleibt im Browser) → Kernpunkte aufdecken → selbst abhaken | **0 Punkte**, Status „bearbeitet“; nur Häkchen-Anzahl wird gespeichert (E7) |

Jeder neue Block/jede neue Interaktion braucht: Renderer + Interaktion (Browser), Prüfer + Validator-Regeln (Server),
Eintrag in `docs/AUFGABENFORMAT.md`, Beispiel in `test/fixtures/akte_beispiel.json`, Tests.

### 7.6 Die Werkzeuge im Detail

#### 7.6.1 Ermittlungskonsole
Editor (Textarea mit Zeilennummern, Syntaxfarben über eigenes Overlay, Strg/Cmd+Enter), Schema-Browser (Tabellen,
Spalten, PK/FK, Mini-ER der Beziehungen), Ergebnistabelle, Knöpfe **Ausführen · Prüfen · Zeitlupe · Tipp · Lösung
zeigen**. Parser-Hinweise erscheinen als Randmarken an der Zeile. Frei nutzbar auch außerhalb von Aufgaben
(„Freie Ermittlung“ je Akte-DB).

#### 7.6.2 Zeitlupe
Spielt eine (Schüler-)Abfrage in der logischen Auswertungsreihenfolge ab: **FROM** (Kreuzprodukt, Zeilenzahl groß
eingeblendet) → **WHERE** (verworfene Zeilen grau) → **GROUP BY** (Zeilen farbig nach Gruppe) → **HAVING** (Gruppen
grau) → **SELECT** (Spalten/Aggregate) → **ORDER BY** → **LIMIT**. Umsetzung im Browser: aus dem AST werden
Teilabfragen erzeugt und mit sql.js ausgeführt; große Zwischentabellen werden gekürzt angezeigt (Zähler bleibt
exakt). Aus Diagnosen verlinkt („In der Zeitlupe ansehen“).

#### 7.6.3 Spurenbrett und Sortierfächer
- **Spurenbrett:** zwei (bis drei) kleine Tabellen als Karteikarten auf einer Pinnwand; alle Kombinationen als rote
  Fäden (Kreuzprodukt); Bedingung eingeben → nicht passende Fäden fallen ab; Zähler „45 × 13 = 585 Fäden → passende bleiben“.
  Auch als Block in Aufgaben (`interaktion: zeilen` auf das Ergebnis).
- **Sortierfächer:** Datensätze fallen nach GROUP-BY-Schlüssel in Fächer; Aggregat je Fach; WHERE entfernt Zeilen
  *vorher* (rote Markierung), HAVING entfernt Fächer *nachher*. Visualisiert P1/P3/P4.

#### 7.6.4 Bauplan-Tisch (ER-Editor, Chen)
- SVG-Zeichenfläche (Pointer Events, Ziehen, Zoomen), Elemente: Entitätstyp, Beziehungstyp (beliebig viele Kanten:
  binär, rekursiv, ternär), Attribut (an Entitäts- oder Beziehungstyp, Schlüssel-Schalter → unterstrichen),
  Kardinalität je Kante (1/n/m/p). **Listenmodus** (Formular) erzeugt dasselbe JSON – barrierearm, iPad-tauglich.
- Datenmodell: `{ entitaeten:[{id,name,attribute:[{name,schluessel}]}], beziehungen:[{id,name,enden:[{entitaet,kard}],
  attribute:[…]}] }`, Layout getrennt.
- **Graph-Abgleich** (Server): Namensnormalisierung (Groß/Klein, Umlaute, Singular/Plural, Synonymliste je Aufgabe) →
  Zuordnung der Entitätstypen (optimal, z. B. ungarische Methode über Ähnlichkeit) → Beziehungen über das verbundene
  Paar (Name frei) → Kardinalitäten (inkl. Richtung), rekursive/ternäre Beziehungen, Beziehungsattribute, Schlüssel.
  Mehrere Musterlösungen bzw. Äquivalenzregeln (n:m ↔ aufgelöste Zwischenentität; Attribut an Beziehung ↔ an
  Entität, wo fachlich gleichwertig). Ausgabe: **Kriterienliste mit Teilfeedback** wie ein Erwartungshorizont
  („✔ alle Entitätstypen · ✘ Kardinalität zwischen Fall und Ermittler · ✔ Schlüssel markiert“). Gelöst = alle
  Pflichtkriterien erfüllt.

#### 7.6.5 Schema-Werkbank
Relationen als Karten; Attribute antippen → unterstrichen (PK) / ↑ (FK, mit Pfeil zur Zielrelation). Startzustand
optional aus einem ER-Diagramm generiert („nur Schlüssel setzen“) oder leer. Prüfung deterministisch nach den
Überführungsregeln (Abschnitt 3.3, DS 11) gegen zulässige Musterschemata; Teilfeedback je Relation.

#### 7.6.6 Anomalie-Simulator und Zerlegungs-Puzzle
- **Simulator:** Rohtabelle; Auftragskarten („Trainer Meyer heißt jetzt Meyer-Kahl“, „Letztes Mitglied der Abteilung
  Judo tritt aus“, „Neue Abteilung ohne Mitglieder“) → Schüler führt die Änderung *so aus, wie die Tabelle es erlaubt*
  (Zellen ändern/Zeile löschen/Zeile anlegen) → die Plattform zeigt den Widerspruch bzw. Informationsverlust; dann
  Anomalieart zuordnen.
- **Zerlegungs-Puzzle:** Spaltenchips auf neue Tabellen ziehen, Schlüssel setzen; Prüfung anhand der hinterlegten
  funktionalen Abhängigkeiten: verlustfrei (Verbund ergibt die Rohtabelle) und redundanzfrei (keine FA, deren linke
  Seite kein Schlüssel ist). Feedback: „Beitrag hängt von Beitragsgruppe ab, nicht vom Mitglied – Redundanz bleibt.“

### 7.7 Fallebene
- **Stadtplan Weserstedt** (SVG, eigene Illustration im Akten-Stil): Akten als Orte (Fundbüro, StadtRad-Station,
  Festplatz, Vereinsheim, Detektei, Rathaus); Fortschrittsring je Ort; gesperrte Akten im Nebel.
- **Pinnwand** mit Beweisstücken (Polaroid-Optik), freigeschaltet durch gewonnene Verhöre.
- **Steckbrief des Phantoms**: füllt sich mit jeder Akte (Hinweise aus der Story).
- **Schlussplädoyer** (Akte 6): Abfolge von `sql`-Aufgaben, deren Ergebnisse die Indizienkette bilden; am Ende Auflösung
  + Überleitung zur Erörterung.

### 7.8 Warm-up und Trainingsplatz
- **Warm-up-Trainer:** Leitner wie AlgoQuest (5 Fächer, 0/1/3/7/14 Tage, „gewusst/teilweise/nicht“), Filter nach
  Akte/Kategorie, ohne Punkte; Karten-JSON `{"version":1,"karten":[{id,akte,kategorie,titel,aufgabe,sql,loesung,
  loesungSql,minuten}]}`.
- **Trainingsplatz** (Generatoren, deterministisch mit Seed, 1 Punkt je Aufgabe, max. 30/Tag):
  T1 Ergebnis vorhersagen (WHERE/ORDER BY/LIMIT auf Zufallstabelle) · T2 GROUP-BY-Ergebnis vorhersagen ·
  T3 Zeilenzahl eines Kreuzprodukts/Verbunds bestimmen · T4 Kardinalität aus Beispieldaten bestimmen ·
  T5 Schlüsselkandidat in Beispieldaten finden (inkl. Ausschnitt-Falle) · T6 Mini-ER → Kurzschreibweise ·
  T7 Anomalieart zu einem Szenario zuordnen · T8 Fehlerhafte Abfrage: Falle (P-Nummer) zuordnen.

### 7.9 Verhöre (Bosse)
Pool je Akte 12–15 Aufgaben (Transfer-Kontexte, gesiezt), Ziehung 6–8 nach Stufenmix, Timer serverseitig
(V1–V5: 20 min, V6: 15 min, V7: 30 min, +30 s Kulanz), kein Feedback im Kampf, bester Versuch zählt, neuer Versuch
nach 12 h, „besiegt“ ab 50 %, Freischaltung automatisch ab 60 % der Level-Punkte der Akte (Kurs-Einstellung:
auto/offen/gesperrt; **je Akte überschreibbar** – `verhoerAkten: { "<nr>": "auto"|"offen"|"gesperrt" }`, sonst gilt
der Kursmodus). Akte 7 (Generalprobe, ohne Lab-Aufgaben): im Modus „auto“ frei, sobald die Akte freigeschaltet ist.
Ziehung je Verhör laut Blueprint (V6: 5 aus 8). Gewonnen → Beweisstück. Abimodus `streng`.

### 7.10 Live-Modus (Kür 2 „Escape Room“, auch als Duell)
- Lehrkraft startet eine Live-Runde für einen Kurs (Aufgaben aus Pool `live` je Akte oder Escape-Room-Szenario mit
  Stationen). Schüler treten aus dem Lab bei (angemeldet), optional Team-Nummer wählen. Übertragung per **SSE**
  (`/api/live/:runde/ereignisse`), Antworten per POST.
- Escape-Room: Jede Station liefert bei richtiger Lösung einen **Code**, der serverseitig aus dem Ergebnis abgeleitet
  wird (kein Code im Client) und die nächste Station öffnet; Countdown; Beamer zeigt Fortschritt je Team.
- Duell: gleiche Aufgabe für alle, Punkte für Richtigkeit + Zeit, Rangliste mit Anzeigenamen.
- **Keine Lab-Punkte** aus dem Live-Modus (Vergleichbarkeit im Portal bleibt unberührt); Ergebnisse werden nach
  Rundenende verworfen (nur Teilnehmerzahl/Statistik bleibt).

### 7.11 Lehrkraft-Bereich
Kurse (aus dem Portal), je Kurs: **Einstellungen** (Akten und Kür freischalten, Niveau eA/gA, Verhör auto/offen/gesperrt
für den Kurs und je Akte, Scoreboard an/aus, Beamer-Board an/aus – Einstellung `beamer`), **Auswertung** (Matrix Schüler × Ermittlung, Verhör-Ergebnisse,
Aufgabenstatistik mit Lösungsquote und Ø Fehlversuchen, **Fallen-Profil P1–P10**, häufige Fehlabfragen anonymisiert,
CSV-Export ohne `sub`, UTF-8 mit BOM, Semikolon, Formel-Schutz), **Vorschau** aller Aufgaben inkl. Lösungen und
Verhör-Pools, **Live-Modus**, **Board-Link** (eigener Board-Schlüssel je Kurs, 192 Bit, beim ersten Einschalten erzeugt,
neu erzeugbar; Board unter `/board/<schlüssel>` ohne Anmeldung, immer dunkel, nur Anzeigenamen und Punkte), **Urkunden**, **Materialien** (Downloads nur aus Whitelist
`materialien/Lehrkraft_PDF/verzeichnis.json`, nur angemeldet; Abschnitt 12.4). Superadmin zusätzlich: Seed-Bericht, Inhalte neu
laden, Sicherung (Download der Plattform-DB per `VACUUM INTO`), **Originale** (docx/pptx aus `materialien/Originale/verzeichnis.json`, einzeln oder als ZIP je Akte).

### 7.12 Öffentliche Seiten
- `/gast` – Probefall „Eisdiele Weserstedt“ (eigene Mini-DB, 6 Demo-Aufgaben inkl. Konsole und Zeitlupe; Lehrkraft-
  Demo mit erfundenem Kurs; nichts wird gespeichert; nie echte Aufgaben).
- `/themen` – alle Akten/Ermittlungen mit DS, Inhalten, Kompetenzen, Materialliste (PDF-Download nur nach Anmeldung bzw. Gast-Auswahl, E13), Video-Link, Warm-up-PDF
  ohne Lösungsteil; Querschnitte „nach Falle“ und „nach Aufgabentyp“; keine Lösungen.
- `/board/<boardSchluessel>` – Beamer-Board (Top 15, Akten-Fortschritt, letzte Erfolge, 20 s Aktualisierung), nur
  wenn im Kurs aktiviert.
- `/datenschutz` – plattformspezifische Ergänzung, verlinkt die zentrale Erklärung des Portals.

### 7.13 Verbund-Anbindung (Vertrag v1.2)
- **SSO** nach §5 / INTEGRATION.md §3: `/sso/start`, `/sso/ende` (state-Cookie signiert, httpOnly, SameSite=Lax,
  secure, 10 min; `pruefe(token, PORTAL_PUBLIC_KEY, {iss, aud, maxDauerSek:120})` mit **immer gesetztem** iss/aud;
  jti einmalig; Upsert Konto/Kurse/Mitgliedschaften; Sitzung Schüler ≤ 30 Tage, Lehrkraft/Superadmin ≤ 8 h;
  Referrer-Policy no-referrer, Cache-Control no-store, Token nie loggen). Zusätzliche Prüfungen: `sub`-Präfix passt
  zur `rolle`, `kurse[].id` matcht `^k:\d+$`.
- **Verbund-API** nach §6: `POST /api/verbund/loeschen` (sub oder kurs; idempotent; löscht Lernstand, Verhöre,
  Leitner, Live-Reste, Fehlabfragen des Kurses), `GET /api/verbund/kurse/:kursId/uebersicht`,
  `POST /api/verbund/kurse/:kursId` (unbekannter Kurs → anlegen, 200; `aktiv:false` → Kurs gesperrt: Schüler kein
  Zugriff, Lehrkraft lesend). Eigener JtiSpeicher, `maxDauerSek: 60`, `sub === "portal"`, `zweck` exakt.
- **Manifest** `GET /api/plattform` (CORS `*`):
```json
{ "vertrag": "1.2", "id": "datendetektei", "name": "Datendetektei",
  "titel": "Datendetektei Weserstedt – Ermitteln mit Datenbanken",
  "themenfeld": "Daten und Datenbanken",
  "kurs": "Informatik eA und gA, Niedersachsen, Abitur ab 2027",
  "niveaus": ["eA", "gA"],
  "beschreibung": "SQL, Schlüssel und Anomalien, ER-Modell und Datenschutz – als Ermittlungsfälle mit Live-SQL.",
  "farbe": "#B3261E", "version": "0.1.0", "basis": "https://datendetektei.frankjuchim.de",
  "icon": "/static/favicon.svg",
  "urls": { "start": "/", "gast": "/gast", "themen": "/themen", "lehrkraft": "/lehrkraft",
            "datenschutz": "/datenschutz", "healthz": "/healthz", "ssoStart": "/sso/start", "ssoEnde": "/sso/ende",
            "niveaus": "/themen#niveaus" },
  "auth": { "modus": "portal", "portal": "https://labs.frankjuchim.de", "sso": true },
  "umfang": { "welten": 7, "level": 13, "aufgaben": 0, "bosse": 7 },
  "welten": [ { "nr": 1, "titel": "Das Fundbüro" }, { "nr": 2, "titel": "Spur der Räder" },
              { "nr": 3, "titel": "Die Stadtfest-Kasse" }, { "nr": 4, "titel": "Chaos im Vereinsarchiv" },
              { "nr": 5, "titel": "Der Bauplan" }, { "nr": 6, "titel": "Datenspuren" },
              { "nr": 7, "titel": "Generalprobe" } ],
  "faehigkeiten": ["gast", "themen", "lehrkraft-materialien", "sql-konsole", "live"] }
```
  (`umfang.aufgaben` wird aus dem Seed berechnet.) `/lehrkraft` ohne Sitzung → 302 auf `/sso/start` (nicht 401).
- **Konfiguration** §8: `PLATTFORM_ID=datendetektei`, `PLATTFORM_URL=https://datendetektei.frankjuchim.de`,
  `PORTAL_URL=https://labs.frankjuchim.de`, `PORTAL_PUBLIC_KEY` (Inhalt von `/sso/schluessel.pem`), `AUTH_MODUS=portal`,
  `SESSION_SECRET`, `DATA_DIR=/app/data`, `PORT=80`, `TRUST_PROXY=1`.
- Nach Deploy: Superadmin trägt die Plattform im Portal ein, bestätigt `https://datendetektei.frankjuchim.de/sso/ende`,
  schaltet Lehrkräfte frei.

### 7.14 Datenschutz und Sicherheit
- Gespeichert: `sub`, Anzeigename, Rolle, Kurs-IDs/-namen, Lernstand (Status, Fehlversuche, Tipps, Punkte je Aufgabe),
  Fallen-Zähler, Verhör-Versuche, Leitner-Stand, Trainingsplatz-Zähler, Kernpunkt-Häkchenzahl.
- **Nicht** gespeichert: Freitexte (E7), SQL-Entwürfe (nur Gerät-lokal), Live-Antworten nach Rundenende,
  IP-Adressen (nur RAM für Rate-Limits).
- **Häufige Fehlabfragen:** je Kurs × Aufgabe die normalisierte falsche Abfrage ohne `sub`, mit Zähler, max. 20 je
  Aufgabe, max. 500 Zeichen; gelöscht mit dem Kurs.
- Sicherheit wie Vertrag §9 + AlgoQuest-Muster: helmet/CSP (7.2), CSRF über Origin/Referer + JSON-Pflicht,
  signierte httpOnly-Cookies, Rate-Limits (Prüfen, Verhör, SSO, Verbund-API), Eingaben validiert, Plattform-SQL
  parametrisiert, Ausgaben als Textknoten, `X-Robots-Tag: noindex`.

### 7.15 Datenmodell der Plattform (`data/plattform.sqlite`)
`meta` · `konten` (sub, name, rolle, zuletzt) · `kurse` (kurs_id, name, aktiv, einstellungen JSON, board_schluessel) ·
`mitgliedschaften` (sub, kurs_id, rolle) · `akten` / `aufgaben` (Seed, JSON, Fingerabdruck) · `fortschritt`
(sub, kurs_id, aufgabe, status, fehlversuche, tipps, punkte, zeit) · `fallen_zaehler` · `fehlabfragen` (kurs_id,
aufgabe, sql_norm, anzahl) · `abzeichen` · `erfolge` (Board-Feed) · `training` · `verhoer_versuche` ·
`warmup_karten` · `leitner` · `kernpunkte` (sub, kurs_id, aufgabe, haken) · `live_runden` (flüchtig).
Lernstand wird **je sub × Kurs** geführt (Vertrag §3 „unter sub und Kurs-ID“).

### 7.16 Qualitätssicherung, CI, Deploy
- Tests (`node:test` + supertest): Parser (Grammatik, jede Regel, Positionen), Sandbox (Zeitlimit, Schreibversuch,
  verbotene Tokens, Zeilenlimit), SQL-Prüfer (Multimenge, Sortierung, Alias, Varianten, Diagnosen), ER-Abgleich
  (Synonyme, Alternativen, rekursiv, ternär), Schema-Prüfer, Zerlegung (FA-Logik), alle Interaktionen, Rechte,
  **SSO-/Verbund-Testfälle aus INTEGRATION.md §5 vollständig**, Manifest (`pruefeManifest` → leere Liste), Gast-API
  (nie echte Inhalte), Material-Whitelist (keine Lösungen öffentlich).
- `npm run validate`: Akten-JSON (Schema, Ids, Verweise, Lösung besteht eigene Prüfung, **jede `sql`-Lösung läuft auf
  allen Varianten und ist EH-konform**, ER/Schema-Lösungen gültig).
- `npm run e2e`: Playwright-Durchlauf inkl. Konsole, Zeitlupe, Bauplan-Tisch; Screenshots nach `docs/screenshots/`.
- `werkzeuge/material_sql_pruefen.py`: extrahiert alle Absätze im Format „SQL-Code“ aus docx/pptx, führt sie gegen die
  angegebene DB aus und prüft EH-Konformität (Abschnitt 12.3).
- **Deploy per CapRover-Webhook** auf `main` (Entscheidung Frank, Abschnitt 18); die GitHub-Prüfung läuft bei jedem Push,
  blockiert den Deploy aber nicht. Deshalb: Feature-Branch, grüne Prüfung, Freigabe, dann `main`.
- Dockerfile (node:22-bookworm-slim, Build-Tools für better-sqlite3 im Build-Stage), HEALTHCHECK `/healthz`,
  `captain-definition`, Persistent Directory `/app/data`, TZ Europe/Berlin.

---

## 8. Design-System „Akten-Noir light“

**Leitidee:** Ermittlerakte statt Spiel-Dungeon – Papier, Tinte, Stempel, roter Faden; ruhig und gut lesbar
(Schule, Beamer, iPad), Spannung über Story-Elemente und Animationen in Maßen, nicht über Effekte.

| Token | Hell | Dunkel | Verwendung |
|---|---|---|---|
| `--tinte` | #1C2B3A | #E8E1D3 | Text, Überschriften |
| `--papier` | #F4EDE1 | #141B22 | Seitenhintergrund |
| `--karte` | #FFFDF8 | #1C252E | Karten, Akten |
| `--siegelrot` | #B3261E | #E0574F | Plattformfarbe, roter Faden, Fehler-Akzent |
| `--messing` | #B08D3C | #D4B062 | Auszeichnungen, Beweisstücke, Rang |
| `--gruen` | #2F6B4F | #5FAF86 | richtig/gelöst |
| `--blau` | #2C5A85 | #7FA9D6 | Hinweise, Merkkästen |
| `--konsole` | #11161C | #0B0F13 | Ermittlungskonsole (immer dunkel), Text #D8E3D0 |

- **Schriften** (selbst gehostet, OFL): *Barlow* (Fließtext), *Barlow Condensed* (Überschriften, Stempel),
  *IBM Plex Mono* (SQL, Tabellenköpfe) – wie in der SQL-Werkstatt (Wiedererkennung). Kein Schreibmaschinen-Font für
  Fließtext; Stempel-Optik über Barlow Condensed + Rotation + Rahmen.
- **Komponenten:** Aktendeckel-Karte (Reiter mit Aktennummer), Stempel (GELÖST, ANGESEHEN, ABI-RELEVANT, KÜR),
  Polaroid (Beweisstück), Pinnwand mit Fäden (SVG), Karteikarte (Datensatz), Merkkasten „Ermittler-Notiz“,
  Fallen-Plakette „P3“, Fortschrittsring, Ranglisten-Zeile, Konsole.
- **Ränge** (Schwellen nach Vertrag 0/10/30/55/80 %, Namen Vorschlag): Neuling · Spürnase · Ermittler:in ·
  Kommissar:in · Meisterdetektiv:in.
- **Abzeichen** (Vorschlag, nur automatisch): Erste Spur · Zehnerserie · Akte geschlossen (je Akte) · Beweisstück
  (je Verhör) · Makellos (Verhör 100 %) · Ohne Tipp (20 × ★★★) · Fallensucher (alle P1–P10 je einmal überwunden) ·
  Architekt:in (★★★-ER-Aufgabe ohne Fehlversuch) · Trainingsprofi (100 Trainingsaufgaben) · Warm-up-Meister
  (30 Karten in Fach 5) · Datenschützer:in (Akte 6 abgeschlossen).
- **Barrierefreiheit:** WCAG 2.1 AA (Kontraste beider Themes geprüft), Fokus sichtbar, alle Werkzeuge per Tastatur,
  Bauplan-Tisch mit Listenmodus, Touch-Ziele ≥ 44 px, `prefers-reduced-motion` respektiert.
- **Vertrag §9 SOLL Hausfarben:** bewusst abweichend (eigene Produktidentität); Begründung im README. Link „⌂ Portal“
  in der Kopfzeile bleibt.
- Der klickbare **Design-Prototyp** (Abschnitt 16, Phase 0) legt Layouts verbindlich fest; `docs/DESIGN.md` hält
  Tokens und Komponenten fest.

---

## 9. Datenbanken

Alle Daten frei erfunden, deterministisch erzeugt, Quelle als SQL im Repo:
`seed/datenbanken/<name>/basis.sql` + `varianten/<variante>.sql` (Delta-Skripte). Beim Start baut der Server daraus
die Haupt-DB (öffentlich unter `/db/<name>.sqlite`) und die Prüf-Varianten (nur im Speicher). Jede DB hat eine
`LIESMICH.md` (Schema in Kurzschreibweise, ER, Story-Bezug, eingebaute Randfälle).

| DB | Akte | Schema (Kurzschreibweise, PK = erste Attribute, ↑ = FK) | Größe | Eingebaute Fallen/Randfälle |
|---|---|---|---|---|
| **Fundbuero** | 1 | `Fundsache(FundNr, Bezeichnung, Kategorie, Farbe, Fundort, Stadtteil, Funddatum, Wert, Finder, AbgeholtAm)` | ~80 | NULL in Farbe/Wert/AbgeholtAm; Grenzdaten; ähnliche Bezeichnungen für LIKE; manipulierter Datensatz (Story) |
| **StadtRad** | 2, 6 | `Station(StationID, Name, Stadtteil, Stellplaetze)` · `Rad(RadID, Typ, Baujahr, ↑StationID, Status)` · `Kunde(KundenID, Vorname, Nachname, Jahrgang, Tarif, Stadtteil)` · `Ausleihe(AusleihID, ↑RadID, ↑KundenID, ↑StartStation, ↑ZielStation, Start, Ende, DauerMin, Preis)` · `Reparatur(ReparaturID, ↑RadID, Datum, Grund, Kosten)` | ~400 | aus der SQL-Werkstatt übernommen und umbenannt; zwei FKs auf Station; laufende Ausleihen (Ende/ZielStation NULL); Rad in Werkstatt (StationID NULL); Gleichnamige |
| **Stadtfest** | 3, 6 | `Stand(StandNr, Name, Art, Platz)` · `Helfer(HelferNr, Vorname, Nachname, Jahrgang, Verein)` · `Schicht(↑HelferNr, ↑StandNr, Beginn, Ende)` · `Produkt(ProduktNr, Bezeichnung, Preis, ↑StandNr)` · `Bon(BonNr, ↑StandNr, ↑HelferNr, Zeitpunkt, Zahlart)` · `Position(↑BonNr, ↑ProduktNr, Menge)` | ~1 500 | COUNT(Bon) ≠ SUM(Menge) (P4); Vervielfachung Bon × Position × Schicht (P2); Gleichstände für LIMIT; Stand ohne Umsatz |
| **TuS** | 4 | Roh: `MitgliederlisteRoh(Mitglied, Geburtsjahr, Abteilungen, Trainer, TrainerTelefon, Beitragsgruppe, Monatsbeitrag, Halle, HallenAdresse, Eintritt)` · normalisiert: `Mitglied(MitgliedNr, Vorname, Nachname, Geburtsjahr, ↑Beitragsgruppe, Eintritt)` · `Beitragsgruppe(Gruppe, Monatsbeitrag)` · `Abteilung(AbteilungNr, Name, ↑TrainerNr, ↑HalleNr)` · `Trainer(TrainerNr, Name, Telefon)` · `Halle(HalleNr, Name, Adresse)` · `Mitgliedschaft(↑MitgliedNr, ↑AbteilungNr, Seit)` | ~60 roh | mehrwertige Zellen, widersprüchliche Beiträge (Änderungsanomalie), Tippfehler-Varianten; hinterlegte funktionale Abhängigkeiten für das Zerlegungs-Puzzle |
| **Detektei** | 5, 6 | `Ermittler(ErmittlerNr, Name, Dienstgrad, ↑MentorNr)` (rekursiv 1:n) · `Fall(FallNr, Titel, Eroeffnet, Status, ↑LeiterNr)` · `Person(PersonNr, Vorname, Nachname, Jahrgang, Stadtteil)` · `kennt(↑PersonNr, ↑BekannterNr, Seit)` (rekursiv n:m) · `verdaechtig(↑PersonNr, ↑FallNr, Grad)` · `Ort(OrtNr, Bezeichnung, Stadtteil)` · `Aussage(↑PersonNr, ↑FallNr, ↑OrtNr, Zeitpunkt, Inhalt)` (ternär) · `Beweisstueck(BeweisNr, Bezeichnung, ↑FallNr, ↑OrtNr)` | ~300 | = Referenzlösung des Architekturwettbewerbs; Self-Join über MentorNr/BekannterNr; ternäre Beziehung |
| **Datenspuren** | 6 | pseudonyme Exporte: `RadExport(KundenToken, Jahrgang, Stadtteil, Tarif, StartStation, Start)` · `FestZahlung(KartenToken, StandNr, Zeitpunkt, Betrag)` · `VereinExport(MitgliedToken, Geburtsjahr, Abteilung, Stadtteil)` · `AppCheckin(Geraet, Ort, Zeitpunkt)` · `Einwohner(EinwohnerNr, Vorname, Nachname, Jahrgang, Stadtteil, Strasse)` | ~1 150 | Re-Identifizierung nur über Kombination (Jahrgang + Stadtteil + zeitliche Korrelation + nächtlicher Check-in an der Wohnadresse, E11); kleine Gruppen |
| **Eisdiele** | Gast | `Sorte(SorteNr, Name, Preis, Vegan)` · `Verkauf(VerkaufNr, ↑SorteNr, Datum, Kugeln)` | ~50 | nur Demo |

**Verhör-, Generalprobe- und Klausur-Kontexte** (eigene kleine DBs, nüchtern, Transfer): V1 Stadtbibliothek ·
V2 Bürgerbus · V3 Schulkiosk · V4 Musikschule (Rohliste) · V5 Kletterhalle (ER) · V6 Fitness-App (Datenschutz) ·
V7/Generalprobe Mensa-Vorbestellsystem · Klausur Schulsanitätsdienst (rekursive Beziehung, Self-Join) ·
Nachschreibklausur Kostümverleih der Theater-AG.

---

## 10. Inhaltsumfang (Zielgrößen)

| Akte | Ermittlungen | Lab-Aufgaben | Verhör-Pool (Ziehung) | Warm-up-Karten | Interaktionsmix (mind. 5 Arten je Akte) |
|---|---|---|---|---|---|
| 1 Fundbüro | 2 | 16 | 12 (6) | 8 | sql, ergebnis, zeilen, gaps, choice, lines, order |
| 2 Räder | 2 | 16 | 12 (6) | 8 | sql, ergebnis, zeilen, gaps, match, lines |
| 3 Stadtfest | 2 | 16 | 12 (6) | 8 | sql, ergebnis, kernpunkte (Analyse), choice, lines, order |
| 4 Vereinsarchiv | 2 | 16 | 12 (6) | 8 | anomalie, zellen, zerlegen, schema, choice, kernpunkte |
| 5 Bauplan (eA) | 3 | 24 | 15 (8) | 12 | er (alle Modi), schema, match, choice, kernpunkte, sql |
| 6 Datenspuren | 1 | 8 + Schlussplädoyer 6 | 8 (5) | 6 | sql, kernpunkte, choice, match, zeilen |
| 7 Generalprobe | – | – | 15 (8, Lab-Generalprobe) | 10 | Abi-Mix |
| Kür | K1/K2 | 6 (Sandbox) | – | – | sql (Schreibmodus), Live-Pool 20, Escape-Room 6 Stationen |
| **Summe** | **12 + Akte 7** | **≈ 108** | **≈ 86** | **≈ 60** | |

Warm-up Akte 5: **12 Karten** bestätigt (Phase 5; W-A5-09…12 wiederholen DS 11 in DS 12).
Akte 7 ist das 13. Level ohne Lab-Aufgaben (nur Verhör 7 = Lab-Generalprobe). Zusätzlich je Ermittlung eine
**Cold-Case-Aufgabe** `A<n>-E<k>-CC` mit 0 Punkten (zählt nicht für Ränge/Freischaltung). Verbindlicher Blueprint aller
Aufgaben: `docs/DS_PLANUNG.md`; Abdeckung: `docs/KOMPETENZMATRIX.md`.

Stufenmix je Ermittlung ≈ 40/40/20 (★/★★/★★★ = 10/20/30 Punkte); jede Aufgabe mit Erklärung und – wo passend –
Fallen-Nummer; Lab-Aufgaben nicht 1:1 aus Arbeitsblättern (gleiche Konzepte, andere Daten/Fragen).

---

## 11. Arbeitsblätter, Präsentationen, Prüfungen – Aufbau

### 11.1 Arbeitsblatt („Ermittlungsakte“, docx maßgeblich)
1. Kopfband: `AKTE 2 · ERMITTLUNG 2.1 · DS 3` + Titel + Name/Datum; rechts Stempel der Akte.
2. **Fall-Einstieg** (2–3 Sätze Story).
3. **Beweisstück**-Kästen (Infoteile mit Beispiel, Notation nach EH, SQL in Format „SQL-Code“).
4. **Ermittlungsaufträge** 1…n mit ★–★★★, Kennzeichnung PAPIER / LAB, vorgedruckte Tabellen/Schemata.
5. **Abi-Ecke** (rot gerahmt): eine Teilaufgabe im Abitur-Stil, gesiezt, Operator fett, `[x BE]`.
6. **Spur im Lab**: welche Ermittlung, welche Aufgaben, welches Werkzeug (Zeitlupe, Spurenbrett …).
7. **Cold Case** (für Schnelle, ohne Punkte).
Lösung: gleiche Datei-Struktur `…_LSG.docx`, Lösungen + typische Fehler mit P-Nummer.

### 11.2 Präsentation je Akte (pptx maßgeblich, 16:9)
Dunkler „Fallbesprechung“-Stil (Tinte-Hintergrund, Papierkarten, roter Faden), Gliederung je DS: Briefing-Folie
(Story) → Begriffe/Notation → Beispiel Schritt für Schritt → Unplugged-Anleitung → Lab-Auftrag → Merkfolie → Abi-Format-
Beispiel. Sprechernotizen mit Moderationshinweisen. Übernimmt die Inhalte deiner bisherigen Präsentationen
„ER-Modell“ und „Normalisierung“ mit diesen Korrekturen: Entitätstyp/Beziehungstyp statt Entitätsmenge; Schlüssel im
ER markiert; Regeln für rekursive und ternäre Beziehungen sowie Beziehungsattribute bei 1:n; zusätzliches
Schlüsselattribut bei mehrfach vorkommenden Paaren; Anomaliearten ausgeführt; Beispieldaten konsistent (2001/2011);
„Mitgliedschaft“ statt „Sportverein“ als Beziehungstabelle; Tippfehler.

### 11.3 Generalprobe und Klausuren (Abitur-Format)
- **Generalprobe eA (30 BE, ~70')** im Stil 2025/26 (Teilaufgaben a–g, je 2–8 BE, ein Operator je Teil):
  ≈ 9 BE Schlüssel/Anomalien/Redundanz · ≈ 9 BE ER (entwickeln/erweitern, überführen) · ≈ 12 BE SQL
  (2 entwerfen, 1 analysieren); AFB ≈ 30/50/20. **gA-Fassung 25 BE** ohne ER, mit Datenschutz-Teil.
- **Klausur eA (60 BE, modular auf 45 BE kürzbar):** Aufgabe A (30 BE, Abitur-Format, neuer Kontext) + Aufgabe B
  (30 BE: Modellierung aus Text, Überführung, Datenschutz-Beurteilung). **Nachschreibklausur** gleicher Bauplan,
  anderer Kontext. gA-Fassungen entsprechend.
- **Erwartungshorizonte:** Bewertungsbogen „Erwartete Prüfungsleistungen | I | II | III | BE“ mit Kernpunkten,
  Alternativen/Teilpunkte, typische Fehler (P-Nummern), Musterlösung (SQL maschinell geprüft, Ergebnistabelle
  beigefügt), Hinweis auf EH-2025-Konformität.

### 11.4 Weitere Lehrkraft-Materialien
- **Gesamtübersicht** (DS-Plan, Kompetenzmatrix, Abi-Bezugsmatrix, Materialliste, Checkliste vor dem Einsatz).
- **Lehrerhinweise je Akte:** Überblick (DS | Thema | Lab | Warm-up | Abi-Bezug) · je DS Ziele, Verlauf
  (Phase/Zeit/Inhalt/Sozialform/Material), typische Schwierigkeiten, Differenzierung, Vorbereitung, Unplugged-Ablauf.
- **Abi-Kompass:** Zuordnung aller 19 vorliegenden Abituraufgaben (Jahr/Termin/Teilaufgabe) zu Akten und Kompetenzen,
  mit EH-2025-Hinweisen (GROUP-BY-Regel, Alias in HAVING). **Keine Originaltexte** (Urheberrecht des
  Kultusministeriums) – nur Verweise und eigene Übungen im gleichen Stil.
- **Ermittler-Handbuch** (8 Werkzeugkarten, laminierbar): 1 SQL nach EH §8 · 2 Auswertungsreihenfolge (Zeitlupe) ·
  3 Verbund-Rezept · 4 ER-Notation EH §7 · 5 Überführungsregeln · 6 Schlüssel- und Anomalie-Check · 7 Operatoren ·
  8 Abi-Check P1–P10 + Zeitbudget.
- **Unplugged-Sets:** Karteikarten Fundbüro (DS 1), Kartenstapel Räder/Stationen + Fäden (DS 3), Fächerkarten
  (DS 5), Anomalie-Rennen (DS 7), Rollenkarten Kardinalitäten (DS 9), Bewertungsbogen Architekturwettbewerb (DS 10),
  Rollenkarten Debatte (DS 12), Escape-Room-Stationen (K2).
- **Warm-up-Karten** (docx, 2 × A5 je Seite; Lösungsteil ab eigener Seite, wird für die öffentliche PDF abgeschnitten).

---

## 12. Material-Systematik und Pipeline

### 12.1 Ordner
```
materialien/
  00_Gesamt/                DD_Gesamtuebersicht.docx, DD_Abi-Kompass.docx, DD_Ermittler-Handbuch.docx
  Akte1_Fundbuero/          1_Praesentation/ 2_Arbeitsblaetter/ 3_Unplugged/ 4_Lehrerhinweise/ 5_Loesungen/
  Akte2_Raeder/ … Akte6_Datenspuren/
  Akte7_Generalprobe/       Generalprobe eA/gA, Klausur, Nachschreibklausur, Erwartungshorizonte
  Kuer/                     K1_Eigene_Datenbank, K2_Escape_Room
  Warm-up/                  DD_Warm-up-Karten_A<n>.docx + warmup_a<n>.json
  Videos/                   NN_Kurztitel/video.json → Folien.pptx + Skript.md (erzeugt)
  Arbeitsblaetter_PDF/      ERZEUGT, Schülerfassungen (nur angemeldet, E13): Arbeitsblätter, Präsentations-Handouts,
                            Warm-up-Karten ohne Lösungsteil, Ermittler-Handbuch, Unplugged-Kopiervorlagen – nie Lösungen
  Loesungen_Portal/         ERZEUGT, nur Lehrkraft
  Gast_PDF/                 nur verzeichnis.json: öffentliche Demo-Auswahl (einzelne Schüler-/Lehrkraft-PDFs, E13)
  Lehrkraft_PDF/            ERZEUGT, nur Lehrkraft, + verzeichnis.json (Whitelist)
  Originale/                ERZEUGT: nur verzeichnis.json (Whitelist der docx/pptx für den Superadmin-Download)
```
Benennung: `DD_A<n>_AB<k>_<Thema>.docx`, Lösung `…_LSG.docx`, PDF ohne Umlaute `DD_A<n>-AB<k>_<Thema>.pdf`;
Präsentation `DD_A<n>_<Aktenname>.pptx`; Lehrerhinweise `DD_A<n>_Lehrerhinweise.docx`. Zuordnung AB ↔ Ermittlung in
`seed/arbeitsblaetter.json`.

### 12.2 Pipeline
Wie AlgoQuest: `werkzeuge/arbeitsblaetter_pdf.py`, `loesungen_pdf.py`, `lehrkraft_pdf.py` (soffice headless; Fonts
aus `werkzeuge/fonts/` installieren), jeweils `--pruefen` für Vollständigkeit; CI prüft Vollständigkeit und – neu –
**Aktualität** (Hash der docx im PDF-Verzeichnis). Neu: `werkzeuge/praesentationen_pdf.py` erzeugt je pptx zwei PDFs –
**Handout** (Schülerfassung: ohne Sprechernotizen, Folien mit dem Notiz-Marker `[NUR LEHRKRAFT]` werden ausgelassen,
z. B. Lösungsfolien) und **Lehrkraftfassung** (alle Folien, Notizenseiten). `werkzeuge/originale_verzeichnis.py`
schreibt `materialien/Originale/verzeichnis.json`.

### 12.4 Ausgabeformate und Zugriff

| Material | Schüler (PDF, **angemeldet**; nur die Gast-Auswahl öffentlich, s. u.) | Lehrkraft (PDF, angemeldet, Whitelist) | Superadmin (Original) |
|---|---|---|---|
| Arbeitsblätter | ✔ Aufgabenfassung | ✔ + Lösung | docx |
| Präsentationen | ✔ Handout ohne Notizen/Lösungsfolien | ✔ mit Notizenseiten | pptx |
| Warm-up-Karten | ✔ ohne Lösungsteil | ✔ mit Lösungen | docx |
| Ermittler-Handbuch, Unplugged-Vorlagen | ✔ | ✔ | docx |
| Lehrerhinweise, Gesamtübersicht, Abi-Kompass | – | ✔ | docx |
| Generalprobe | ✔ Aufgaben (Entscheidung der Lehrkraft, Standard: nur Lehrkraft) | ✔ + Erwartungshorizont | docx |
| Klausur, Nachschreibklausur | – | ✔ + Erwartungshorizont | docx |
| Video-Folien und Drehbücher | – | ✔ (Folien als PDF) | pptx/md |

**Zugriff nach Rolle (E13):** Schülerfassungen bekommt nur, wer angemeldet ist (Rolle `schueler`, `lehrkraft` oder
`superadmin`), Lehrkraftfassungen nur `lehrkraft`/`superadmin`, Originale nur `superadmin`. **Öffentlich** (Gastmodus
`/gast`, ohne Anmeldung) ist nur eine kleine, ausdrücklich gelistete **Demo-Auswahl**: einzelne Schüler-PDFs und
einzelne Lehrkraft-PDFs, die Frank festlegt (Whitelist `materialien/Gast_PDF/verzeichnis.json`, Standard: leer, bis
Frank auswählt; keine Lösungen zu echten Lab-/Verhör-/Klausuraufgaben, die nicht ohnehin in der Demo stehen). Die
Themenseite nennt die übrigen Materialien nur (Titel, Akte, Niveau) mit dem Hinweis „nach Anmeldung“.

Tests sichern ab: ohne Anmeldung ist jede PDF außerhalb der Gast-Whitelist 404 (bzw. 302 auf `/sso/start` bei
Seitenaufrufen); kein Lösungs-, Erwartungshorizont- oder Klausur-PDF in der Gast-Auswahl, außer Frank listet es
ausdrücklich; Lehrkraft-Downloads
nur angemeldet und nur aus der Whitelist; Originale nur für die Rolle `superadmin` (sonst 404). Die Originale kommen
nur ins Docker-Image, wenn `ORIGINALE_IM_IMAGE=1` gesetzt ist (Standard: ja, Größe prüfen).

### 12.3 SQL in docx/pptx maschinell prüfen
- Jede SQL-Anweisung steht in der Absatzformatvorlage **„SQL-Code“** (pptx: Textfeld mit Name `SQL`).
- Zugehörige Datenbank: benutzerdefinierte Dokumenteigenschaft `DD-Datenbank` (Standard) oder Kommentarzeile
  `-- DB: Stadtfest` über der Anweisung.
- In Lösungen folgt optional eine Tabelle im Format **„Ergebnistabelle“** → das Skript vergleicht sie mit dem
  tatsächlichen Ergebnis.
- `werkzeuge/material_sql_pruefen.py` (+ Node-Parser über CLI) meldet: Syntaxfehler, EH-Verstöße (außer in
  Kür-Dokumenten), Ergebnisabweichungen. Läuft in `npm run pruefen` und in der CI.
- Weitere Prüfung `materialien_pruefen.py`: Altbegriffe („Entitätsmenge“, „Array“, „XP“), `<>`, `JOIN` außerhalb
  Kür, Klarnamen-Liste, Umlaute in PDF-Dateinamen.

---

## 13. Erklärvideos (YouTube @frankjuchim, Playlist „Datendetektei“)

| Nr. | Titel | Akte · Einsatz | Länge | Kern |
|---|---|---|---|---|
| 0 (opt.) | So ermittelst du in der Datendetektei | Start, DS 1 | 3–4 min | Portal-Login, Stadtplan, Ermittlung, Konsole (Ausführen/Prüfen/Zeitlupe), Verhör, Warm-up |
| 1 | SQL-Grundlagen: SELECT, WHERE und die Bedingungsfallen | A1 · DS 1–2 | 8–10 | Klauseln, Klammern bei AND/OR, LIKE, BETWEEN, IS NULL, ORDER BY/LIMIT, P5/P6 |
| 2 | Verbund ohne JOIN: Wie `FROM a, b WHERE` funktioniert | A2 · DS 3–4 | 8–10 | Kreuzprodukt → Filter, FK = PK, Präfix, drei Tabellen, zwei FKs auf eine Tabelle, P2/P7 |
| 3 | GROUP BY und HAVING – so wie im Abitur | A3 · DS 5–6 | 10–12 | Auswertungsreihenfolge, GROUP-BY-Regel, WHERE vs. HAVING, COUNT vs. SUM, P1/P3/P4 |
| 4 | Redundanz, Anomalien und gute Schlüssel | A4 · DS 7–8 | 8–10 | drei Anomaliearten am Datensatz, Schlüsselkriterien, Ausschnitt-Falle, Zerlegen, P8/P10 |
| 5 | ER-Modelle nach den Ergänzenden Hinweisen | A5 · DS 9–10 | 10–12 | Chen, 1/n/m, Schlüsselattribute, Beziehungsattribute, rekursiv, ternär, P9 |
| 6 | Vom ER-Modell zum Relationenschema in 5 Regeln | A5 · DS 11 | 8–10 | Regeln + Begründungen, Rückrichtung, P9 |
| 7 (opt.) | Abi-Check Datenbanken: 10 Fallen und die Operatoren | A7 · DS 13 | 10 | P1–P10, Operatoren „analysieren/erläutern/beurteilen“, Zeitbudget |

Format wie AlgoQuest: `video.json` (Quelle) → Folien (pptx, Akten-Design, Kamera-Zone unten rechts frei, Sprechertext in
Notizen) + Drehbuch (`…_Skript.md`: Lernziele, YouTube-Titel/Beschreibung/Kapitel/Tags, Folie für Folie) – erzeugt mit
`werkzeuge/video_folien.py`. Aufbau: Einstieg ≤ 30 s → Beispiel (eigene Daten) → ⏸ Pause-Aufgabe → Fallen →
Merksätze → „Weiter im Lab“. Bilder aus der Plattform (Zeitlupe, Spurenbrett, Bauplan-Tisch) per Renderer.
Erst „nicht gelistet“, dann öffentlich. Einbindung als Link-Knopf (kein Embed) an Ermittlung, Themenseite, Materialien (Links in `seed/videos.json`, nur YouTube; §18 Phase 7).
Produktionsreihenfolge: 0/1 vor Start, dann je Akte eine Woche vorher.

---

## 14. Repository-Struktur

```
datendetektei/
  README.md                  Überblick, Betrieb, Vertragsbezug, SOLL-Abweichungen (Hausfarben) mit Begründung
  CLAUDE.md                  Arbeitsregeln für Claude Code (Konventionen, Befehle, QS, Verbote)
  docs/
    superpowers/specs/       diese Spezifikation
    superpowers/plans/       Implementierungsplan(e)
    AUFGABENFORMAT.md        verbindliches Aufgabenformat (AlgoQuest-Basis + neue Blöcke/Interaktionen)
    DESIGN.md                Design-System, Komponenten, Screens
    STORY.md                 Story-Bibel (Figuren, Akten, Beweisstücke, Texte)
    VERTRAG_VORSCHLAG_1.3.md Änderungsvorschlag für frankjuchim/labs
    screenshots/
  src/
    kern/                    jwt.js (unverändert), sso.js, sitzung.js, sicherheit.js, verbund.js, manifest.js, punkte.js
    sql/                     parser.js, regeln.js, sandbox.js, sandbox-prozess.js, pruefer.js, diagnose.js, fehlertexte.js
    er/                      graph.js, abgleich.js, schema-pruefer.js, zerlegung.js
    content/                 pruefer.js (je Interaktion), validator.js, generatoren.js, format.js
    services/                inhalte, lernen, verhoer, warmup, training, live, auswertung, material, gast, stand
    routes/                  schueler.js, lehrkraft.js, admin.js, gast.js, live.js, sso.js, verbund.js
    app.js, server.js, db.js, domain.js
  public/
    *.html                   index, akte, ermittlung, konsole, lehrkraft, board, themen, gast, urkunden, datenschutz, 404
    static/css/, static/fonts/, static/img/ (Stadtplan, Beweisstücke)
    static/js/               kern/ (render, interaktionen, api), konsole/, zeitlupe/, spurenbrett/, sortierfaecher/,
                             bauplan/, werkbank/, anomalie/, zerlegung/, live/, lehrkraft/
    static/vendor/           sql-wasm.js, sql-wasm.wasm, sql-asm.js, LICENSE
  seed/
    akten/akte1.json … akte7.json, kuer.json
    datenbanken/<name>/basis.sql, varianten/*.sql, LIESMICH.md
    warmup/warmup_a1.json …
    gast/probefall.json
    arbeitsblaetter.json
  materialien/               siehe Abschnitt 12
  werkzeuge/                 *_pdf.py, material_sql_pruefen.py, materialien_pruefen.py, video_folien.py, fonts/
  scripts/                   vertrag_pruefen.js (unverändert), validate.js, db_bauen.js
  test/                      *.test.js, fixtures/akte_beispiel.json, e2e/
  .github/workflows/         pruefung.yml (Tests + Inhalte; Deploy per CapRover-Webhook auf main)
  Dockerfile, captain-definition, .dockerignore, package.json
```

---

## 15. Vertragsbezug und Vorschlag VERTRAG 1.3

**Eingehalten:** alle MUSS-Regeln §5–§10 (Abschnitt 2.6, 7.13, 7.14).

**Abweichungen (nicht still):**
| Punkt | Art | Umgang |
|---|---|---|
| §13.2 „Neue Plattformen starten als Kopie von Algo Quest“ | Empfehlung | eigene Codebasis (E5) → Vorschlag 1.3 |
| §9 SOLL Hausfarben | SOLL | eigene Farben, Begründung im README |
| Beamer-Board ohne Kurscode | intern | eigener Board-Schlüssel je Kurs-ID (kein Vertragsinhalt) |
| Fähigkeiten `sql-konsole`, `live` | Nebenversion | im Vorschlag 1.3 als bekannte Fähigkeiten aufnehmen |

**Textvorschlag für `VERTRAG.md` (Version 1.3):**

> **§13.2 (neu gefasst):** Neue Plattformen starten als Kopie von Algo Quest (AlgoQuest-README Teil G) **oder mit
> eigener Codebasis**, wenn sie §5–§10 vollständig erfüllen, das Aufgabenformat nach §9 kompatibel erweitern und den
> gemeinsamen Kern (§13.3) in einem eigenen Ordner (`src/kern/`) ohne Abhängigkeit von themenspezifischem Code führen.
> In beiden Fällen setzen sie sofort Manifest und SSO nach `docs/INTEGRATION.md` um und verweisen in README und
> CLAUDE.md auf diesen Vertrag.
>
> **§7 (Ergänzung):** Bekannte Fähigkeiten: `gast`, `themen`, `lehrkraft-materialien`, `sql-konsole` (Plattform führt
> SQL-Abfragen von Schülern aus), `live` (Live-Runden im Kurs über Server-Sent Events).
>
> **§6 (Klarstellung):** `POST /api/verbund/kurse/:kursId` für einen der Plattform unbekannten Kurs legt diesen an und
> antwortet `200` (nicht `404`).
>
> **§14:** `| 1.3 | <Datum der Annahme> | §13.2 eigene Codebasis zulässig (Kern in src/kern/); §7 Liste bekannter Fähigkeiten;
> §6 Klarstellung unbekannter Kurs bei kurs-aendern |`

**Klärungsbedarf (für Frank als Vertragsverantwortlichen, keine Blockade):** Inhaberin vs. Mitlehrkraft im Token nicht
unterscheidbar (wer darf Kurs-Einstellungen ändern? – Datendetektei: alle Lehrkräfte des Kurses); Bedeutung von
„Kurs gesperrt“ (Datendetektei: Schüler kein Zugriff, Lehrkraft lesend).

---

## 16. Phasen, Meilensteine und Übergabe an Claude Code

### Phase 0 – Cowork (Konzept, kein App-Code)
Lieferungen: diese Spec · `docs/STORY.md` · `seed/datenbanken/*/LIESMICH.md` (Schemata, Randfälle) ·
DS-Feinplanung + Kompetenzmatrix · `docs/DESIGN.md` + klickbarer Design-Prototyp der Kernscreens (Stadtplan,
Ermittlung mit Konsole, Zeitlupe, Bauplan-Tisch, Lehrkraft-Auswertung) · `docs/VERTRAG_VORSCHLAG_1.3.md` ·
`CLAUDE.md` · `README.md` (Gerüst) · Implementierungsplan (`docs/superpowers/plans/`).
**➜ Übergabe:** Frank pusht diese Dateien als initialen Commit nach `frankjuchim/datendetektei` (Branch `main`,
CapRover noch **nicht** verbunden). Danach arbeitet Claude Code ausschließlich im Repo weiter.

### Phasen in Claude Code (jeweils Feature-Branch, PR, grüne Prüfung, Freigabe)
| Phase | Inhalt | Abnahmekriterium |
|---|---|---|
| 1 Gerüst + Kern | Express-App, CSP, Sitzung, SSO, Verbund-API, Manifest, `/healthz`, Gastmodus-Hülle, Design-Grundlagen, Dockerfile, CI + Deploy-Action | `vertrag_pruefen.js` grün; alle INTEGRATION-Testfälle grün; im Portal eingetragen, SSO-Login als Testschüler funktioniert |
| 2 SQL-Engine | Parser + Regeln, Sandbox, Prüfer, Diagnosen, Fehlertexte, DB-Bau aus SQL, Konsole (Browser, Worker) | Prüfer-Testsuite inkl. Randfall-Varianten; Konsole läuft auf iPad/Chromebook |
| 3 Akten 1–3 | Inhalte A1–A3 (Ermittlungen, Verhöre, Warm-ups), Lernen/Punkte/Ränge, Verhör-Engine, Stadtplan v1 | `npm run validate` grün; e2e-Durchlauf A1 |
| 4 Visualisierungen | Zeitlupe, Spurenbrett, Sortierfächer, Verlinkung aus Diagnosen | e2e + Sichtprüfung Beamer/iPad |
| 5 Akten 4–5 | Anomalie-Simulator, Zerlegungs-Puzzle, Schema-Werkbank, Bauplan-Tisch + ER-Abgleich, Inhalte A4–A5 | Abgleich-Testsuite (Synonyme, Alternativen, rekursiv, ternär) |
| 6 Akte 6–7 + Lehrkraft | Datenspuren, Schlussplädoyer, Pinnwand/Steckbrief, Lab-Generalprobe, Lehrkraft-Auswertung, Board, Urkunden, Live-Modus, Kür K1 | Probelauf mit Testkurs; Fallen-Profil plausibel |
| 7 Materialien + Videos | docx/pptx im Akten-Design, Pipeline, SQL-Prüfung der Materialien, Lehrerhinweise, Klausuren, Videoskripte + Folien | `npm run pruefen` grün; Kompetenzmatrix ohne Lücken |
| 8 Probelauf | Durchlauf mit einem Testkurs/Kolleg:innen, Korrekturen, Datenschutzseite mit Schulangaben | Freigabe durch Frank |

Zeitrahmen (Vorschlag, Einsatz nächstes Schuljahr): Phasen 1–3 bis Ende Februar, 4–6 bis zu den Osterferien,
7–8 bis zu den Sommerferien.

---

## 17. Offene Punkte und Risiken

**Offene Punkte (vor bzw. während Phase 1 klären)**
1. EH-Original-PDF prüfen: Formen im ER-Beispiel, Unterstreichungen, Farbe der Überschriften §7/§8 (Hilfsmittel?).
2. Fachbezogene Hinweise für die Abiturjahrgänge 2027/2028 (Schwerpunkte) beschaffen und einarbeiten.
3. Lizenz für Materialien und Plattforminhalte für andere Lehrkräfte festlegen (Vorschlag: CC BY-NC-SA 4.0 für
   Materialien; Code-Lizenz nach Wunsch).
4. Angaben der Schule für `/datenschutz` (Verantwortliche, DSB, Hoster, Rechtsgrundlage).
5. VERTRAG 1.3 (Vorschlag der Datendetektei) annehmen (Frank als Verantwortlicher des Verbunds).
6. GitHub-Repo `frankjuchim/datendetektei` anlegen; CapRover-App `datendetektei` mit Persistent Directory `/app/data`.

**Risiken und Gegenmaßnahmen**
| Risiko | Gegenmaßnahme |
|---|---|
| Funktionsumfang wächst über 15-DS-Bedarf hinaus | Phasen mit Abnahmekriterien; Kür-Funktionen (Live, K1) erst in Phase 6 |
| Freies ER-Modellieren schwer automatisch prüfbar | Eng gefasste Anforderungstexte, Synonymlisten, mehrere Musterlösungen, Kriterien-Teilfeedback; offene Modellierung zusätzlich im Unterricht (Architekturwettbewerb) |
| Schulnetz blockiert WASM | Fallback `sql-asm.js`; Prüfung ohnehin serverseitig |
| better-sqlite3-Deserialisierung/Worker-Verhalten | Spike zu Beginn von Phase 2; Alternative: Datei-Kopien im tmpfs |
| Große Kreuzprodukte auf iPads (Zeitlupe) | Anzeige gekürzt, Zähler exakt; Zeitlimit im Worker |
| Inhaltsmenge (~250 Aufgaben + Material) | JSON maßgeblich, Validator prüft jede Lösung maschinell; parallele Agenten mit exklusiven Dateien |
| Alte Abiturlösungen widersprechen EH 2025 | Abi-Kompass markiert; Plattform lehrt Stil 2026 |

---

## 18. Änderungsprotokoll

| Datum | Änderung |
|---|---|
| 2026-10-12 | Erstfassung nach Planungssitzung (Entscheidungen E1–E9) |
| 2026-10-12 | E12 Ausgabestufen Material (Schüler-PDF, Lehrkraft-PDF, Originale für Superadmin), Abschnitt 12.4 |
| 2026-10-12 | Phase-0-Abgleich: E10 (Steckbrief-Regel), E11 (`Einwohner.Strasse`), Namensausnahme Beziehungstabellen, Akte 6 + `zeilen`, Level-Zählung, Cold Cases; Kontrast-Text-Tokens siehe `docs/DESIGN.md` |
| 2026-10-12 | **Phase 1, Vertragsstand:** `labs/VERTRAG.md` liegt inzwischen als **v1.2** vor (Anforderungsniveaus: Niveau-Übersicht eA/gA ohne Anmeldung, Manifest `niveaus` KANN, `urls.niveaus` SOLL). Die Plattform folgt v1.2: Manifest `vertrag: "1.2"`, `niveaus: ["eA","gA"]`, `urls.niveaus: "/themen#niveaus"`, `kurs` nennt beide Niveaus; `/themen` erhält den Abschnitt `#niveaus` (Akte 5 nur eA, Abschnitt 3.4). Unser Änderungsvorschlag heißt damit **1.3** (`docs/VERTRAG_VORSCHLAG_1.3.md`); Verweise in README, CLAUDE.md, Abschnitt 15 angepasst. |
| 2026-10-12 | **Phase 1, Umsetzungsentscheidungen:** `PLATTFORM_URL` und `PORTAL_URL` sind Pflicht (Vertrag §8 erlaubt „sonst aus der Anfrage“; im Modus `portal` wäre ein aus dem Host-Header abgeleiteter Rücksprung fälschbar). SSO-Fehlerseite: ungültig/abgelaufen/state → 401, `keine_berechtigung` → 403, `abgebrochen` → 200, nie eine Sitzung. Anzeigename im Token 1–200 Zeichen (Portal erlaubt Lehrkraft-Namen bis 80). Ein per Verbund-API gesperrter Kurs wird durch einen Login nicht entsperrt (nur `kurs-aendern` mit `aktiv: true`). Neuer öffentlicher Endpunkt `GET /api/akten` (nr, titel, niveaus – keine Inhalte). Aus `public/` wird nur `/static` als Verzeichnis ausgeliefert, Seiten über eigene Routen (sonst umginge `/lehrkraft.html` die Rechteprüfung). Niveau-Tabelle: Kür K1 bei gA „entfällt“ (Abschnitt 3.4 nennt für gA nur K2) – Bestätigung durch Frank offen. |
| 2026-10-12 | **Deploy-Weg (Entscheidung Frank):** CapRover bleibt per GitHub-Webhook mit `main` verbunden; die geplante Action `deploy.yml` (Deploy erst nach grüner Prüfung) entfällt, damit nicht doppelt deployt wird. Folge: Eine rote Prüfung blockiert den Live-Build nicht mehr → nach `main` nur mit grüner Prüfung auf dem Feature-Branch (CLAUDE.md, README, Abschnitt 7.16). |
| 2026-10-12 | **E13 Materialzugriff (Entscheidung Frank):** Schüler-PDFs sind nicht mehr allgemein öffentlich. Öffentlich (Gastmodus) nur eine gelistete Demo-Auswahl einzelner Schüler- und Lehrkraft-PDFs (`materialien/Gast_PDF/verzeichnis.json`); alles andere nur nach Anmeldung für die passende Rolle. Angepasst: E13, Abschnitte 7.12, 12.1, 12.4, CLAUDE.md, Hinweis auf `/themen`. Umsetzung in Phase 3 (Gastmodus/Themen) und Phase 7 (Pipeline, Zugriffstests). |
| 2026-10-12 | **Bestätigt (Frank):** Kür K1 entfällt im gA-Pfad (Abschnitt 3.4; Niveau-Tabelle auf `/themen`). |
| 2026-10-12 | **Sandbox mit Kindprozessen statt `worker_threads` (Spike vor Phase 2):** better-sqlite3 öffnet eine DB aus einem Buffer im Worker problemlos (`new Database(buffer)`, `query_only`, `stmt.readonly` wie erwartet). Aber `worker.terminate()` beendet eine **laufende** Abfrage nicht (Endlos-CTE blockierte den Prozess > 2 min) – das Zeitlimit 1,5 s wäre so nicht durchsetzbar. Ein per `child_process.fork` gestarteter Prozess wird mit `SIGKILL` nach 1,5 s zuverlässig beendet. Abschnitt 7.4 und CLAUDE.md angepasst. |
| 2026-10-12 | **WASM-Fallback (Befund Phase 2, Default bis Entscheidung Frank):** `sql-asm.js` läuft unter unserer CSP (kein `eval`), aber in Chromium **nicht im Web Worker** – der Worker-Stack ist zu klein (`RangeError` schon beim ersten Parsen; auch `-memory-growth`/`-debug`-Builds). Im Hauptthread liefe er, wäre dort aber nicht abbrechbar (Endlosabfrage friert den Tab ein). **Default:** Erkennt der Worker, dass weder WASM noch asm.js nutzbar sind, führt die Konsole „Ausführen“ serverseitig über die Sandbox aus (`POST /api/sql/ausfuehren`: nur Haupt-DB, gleiche Limits wie „Prüfen“, Rate-Limit je Konto bzw. IP im Gastmodus). Alternativen für Frank: nur „Prüfen“ ohne freies Ausführen, oder asm.js im Hauptthread ohne Abbruch. |
| 2026-10-12 | **Phase 2, Umsetzungsentscheidungen:** (1) Parser: zusätzlicher Regelcode `UNION` (folgt dem Abimodus); `NICHT_SELECT` ist auch im Abimodus `hinweis` ein Fehler (still nur bei `aus`, Kür K1); ohne Angabe gilt Abimodus `hinweis`; `HAVING` ohne `GROUP BY` und falsche Klauselreihenfolge sind Parsefehler; ohne Diagnose akzeptiert: Funktionen wie `ROUND`, `\|\|`, `%`, `OFFSET`, Alias ohne `AS`, `"Namen"`, `SELECT` ohne `FROM`; `CASE`/`CAST` sind Syntaxfehler. (2) Prüfer: zusätzliche Diagnosen `ANDERE_WERTE` und `SPALTENREIHENFOLGE`, Art `technisch` (Überlast, Absturz); **Spaltenreihenfolge zählt immer**; Sortierrichtung folgt dem ORDER BY der Musterlösung; Regel-Fehler machen eine Antwort nie „richtig“, auch im Abimodus `hinweis`. (3) Sandbox liefert bei mehr als 5 000 Zeilen keine exakte Gesamtzahl (`abgeschnitten`); keine Byte-Grenze je Ergebnis (Restrisiko Speicher, Absturz wird abgefangen). (4) Datenbanken: Quelldaten der SQL-Werkstatt (StadtRad) verletzen einzelne Generator-Regeln selbst (unverändert übernommen); Datenspuren: Deichkamp ≈ 6 % statt ≈ 2 % (Personen der Quell-DBs sind fest verteilt) – Vorschlag für die LIESMICH: „Weserufer und Deichkamp je ≈ 6–8 %“; Varianten Stadtfest `null`/`gleichnamig` mit zweiter Kasse (Lockerung nur in der Variante), Detektei `gleichnamig` zusätzlich `kennt (9011 → 46)`. (5) Offene Formulierungen in LIESMICH: TuS `grenze` („Seit < '2020-01-01'“), StadtRad `gleichnamig` (Kundin 9 wohnt in der Altstadt). (6) Vorschlag, nicht gebaut: Hinweisregeln `GB_NAME` (P3, gruppiert nach Name ohne Schlüssel) und `VERVIELFACHUNG` (P2) per Schema – der Prüfer erkennt beides bereits über die Varianten. (7) Hinweis für Phase 3: DS_PLANUNG A1-E1-07 erwartet 5 Schmuck-Zeilen, die DB hat 7. |
| 2026-10-12 | **Phase 3, Umsetzungsentscheidungen:** (1) Verhör-Kontext V3 Schulkiosk mit Tabelle `Schicht` (DS_PLANUNG/STORY gehen VERHOER_KONTEXTE vor; dort angeglichen). (2) Inhalte A1–A3 folgen den Daten: Blueprint-Abweichungen (nicht existierende Kategorien in A1, A1-E1-07 Fahrradzubehör, A2-E1-07, A3-E2-03 Grenze > 100, A3-E2-CC, gleichnamiges Helferpaar „Lotta Bödeker“, W-A2-02) sind in DS_PLANUNG nachgezogen; Intro-Notizen zeigen nie Musterlösungen späterer Aufgaben. Aktenfarben: A1 `#8C2F39`, A2 `#2C5A85`, A3 `#9C5B12`. (3) Fundbuero-Varianten ergänzt (9003 Messing-Fundstück ohne Wert, 9012 „Kompass (Messing)“), damit die Indizienkette A1-E2-06/07 trennscharf ist. (4) Lernen: Superadmin hat Zugriff auf alle Kurse; Lernstand von Lehrkräften zählt nicht in Kursübersicht/Feed; Niveau-Filter gilt auch für Lehrkräfte; Migration 3 `serien` (Zehnerserie). (5) Verhör: gA-Kurse ziehen nur Aufgaben für alle Niveaus (ggf. weniger Aufgaben, kein Rückfall auf den vollen Pool); Antworten werden nur als richtig/falsch + Punkte gespeichert (Entwürfe im `localStorage`); Lehrkräfte ohne Freischaltung und ohne 12-h-Pause. (6) Trainingsplatz: Seed per HMAC (sub, Kurs, Typ, Tag, laufende Nummer) statt Tabelle verbrauchter Seeds; nicht an Akten-Freischaltung gebunden. (7) Gastmodus: eigenes Probefall-Format (6 Aufgaben `G-nn`, validiert, Textabgleich gegen die Akten); `materialien/` liegt (noch) nicht im Docker-Image, die Gast-Auswahl ist live leer bis Phase 7. (8) Offene Fragen an Frank: Soll ein für gA nicht erfüllbarer Verhör-Mix ein Validator-Fehler sein (jetzt Hinweis)? Sollen gA-Kurse bei zu kleinem Pool auf den vollen Pool zurückfallen? Soll der Trainingsplatz T2/T3 erst nach Akte 2/3 erscheinen? |
| 2026-10-12 | **Phase 4, Umsetzungsentscheidungen:** Rechenschicht `src/sql/visual.js` (isomorph) nimmt den SQL-Text (nicht den AST), weil Klauselbereiche aus dem Originaltext gebraucht werden. Die Werkzeuge rechnen nur im Browser (sql.js); ohne WebAssembly erscheint ein Hinweis, **kein** Server-Rückfall (eine Zeitlupe braucht 10–15 interne Abfragen). Diagnose-Links: `KREUZPRODUKT` und `KEIN_VERBUND` → Spurenbrett + Zeitlupe, P1-Codes → Zeitlupe, `GB_REGEL`/`ANDERE_WERTE` bei GROUP BY → Sortierfächer, nie im Verhör, immer mit der eigenen Abfrage. Neue Blöcke `zeitlupe`, `spurenbrett`, `sortierfaecher` (nicht im Verhör, Block-SQL ≠ Musterlösung derselben Akte). Sortierfächer-Umschalter nie mit Schlüsselspalten; Zeitlupe zeigt je Gruppe höchstens 6 Zeilen (Zähler exakt). Parser-Befund: bei `(a OR b) AND c` beginnt der Elternknoten hinter der Klammer (Positionsangabe); `visual.js` gleicht aus. |
| 2026-10-13 | **Phase 5, Umsetzungsentscheidungen:** (1) Modellierungs-Kern `src/er`: Hinweise als `{ code, text, falle }`, Zusatzcodes `FK_ZUVIEL`, `RELATION_*`; strenge Zählung (Folgefehler zählen), großzügige Zuordnung (Attribut-Überdeckung ≥ 2 und ≥ Hälfte, künstliche Schlüssel umbenennbar, Fremdschlüssel mit gleicher Zielrelation werden gepaart); Äquivalenzen werden auf die Muster angewandt; Rückmeldungen nennen nur Namen aus der Schülerlösung („zwischen A und B fehlt ein Beziehungstyp“), der Verlustfreiheits-Hinweis nennt „Tabelle n“; Zerlegungs-Hinweise nennen funktionale Abhängigkeiten mit sichtbaren Spalten (gewollt, §7.6.6). (2) Aufgabenformat: Prüfung in `src/content/modellierung.js`; `zellen.reihenfolge` in der Interaktion; er-Lesen gibt beim Prüfen keine Teil-Rückmeldung (`{}`, gegen Probieren); feste öffentliche Feldliste je neuer Interaktion; Attribut-Ids `<elementId>.<index>`; Layout ist Pflicht für jedes Element; Validator: PK je Relation im Muster, `p` nur ternär; `zerlegen` ohne `muster` → BCNF-Zerlegung als Musterantwort. (3) Anomalie-Simulator: Original-Tabelle ausgeblendet, Befund nur aus sichtbaren Daten; Einfügen nur über „Zeile anlegen“ mit `simulation.werte`; Zerlegen-Vorschau setzt ↑, wenn eine Spaltenmenge Schlüssel einer anderen Tabelle ist; Entwürfe bleiben nach dem Lösen. (4) Kernpunkte in gemischten Aufgaben: `POST …/kernpunkte` erst nach Lösen bzw. Lösung zeigen, `{ haken: n | [n] }`, gespeichert wird die Summe (Tabelle `kernpunkte` mit einer Spalte), der Status bleibt; Validator-Fehler, wenn ein `schema`-Block eine `datenbank`-Kachel derselben Blockliste doppelt (schema-Blöcke aus A1-E1/A2-E1-Intro entfernt). (5) Trainingsplatz: T4 (Kardinalität, auch n:1 als Leserichtung) und T6 (Überführung, Optionen als Schema-Blöcke „Vorschlag A–D“ mit ER-Block) nur eA – in gA-Kursen ausgeblendet (400). (6) Verhör 4 Musikschule ohne normalisierte Teiltabellen (Musterzerlegung = Lösung A4-V-11), keine Varianten für V4/V5 (keine SQL-Aufgaben); FA-Liste mit den Spaltennamen der Rohliste plus Etage aus Raum, Schlüssel {SchuelerNr, Instrument, LehrkraftNr}; „Albers“ als vorgegebener Nachname (Ausnahmeliste im Namens-Test); in A4-V-01 zählt jedes Vorkommen redundanter Werte. Verhör 5 an DS_PLANUNG angeglichen (klettert, Trainer, bildetAus, besucht/assistiertIn, ternär *wertet* mit Relation Wertung); VERHOER_KONTEXTE nachgezogen. (7) Inhalte Akte 4 (Farbe `#5E4A8C`) und Akte 5 (Farbe `#17585C`) folgen den Daten; DS_PLANUNG nachgezogen (Anhang Nr. 14–25): Boule statt Bouldern (Papier-Rennen behält Bouldern), mehrteilige Aufgaben, kernpunkte 0 Punkte, Ermittler-Notizen ohne Vorwegnahme, A4-E2-07 nennt Relationen und Attribute, A4-E2-03 nur HallenAdresse-Zellen, Spalte Zeile (`rowid`) in Ausschnitten; A5-V-07 „Das Beziehungsattribut“, A5-E2-02 Zuordnung aller Elemente (zweite Beziehung Person–Fall = *meldet*, 1:n), Detektei-Kachel nur in A5-E3-08/CC, E3-Intro mit Schulbeispiel, A5-E3-06 ohne `nm_aufgeloest`, A5-E3-08 ohne gleichnamige Variante, A5-E1-03 Mengendiagramm mit echten Daten. (8) Abnahme: automatisches Layout der Musterlösungen (`chen.js` `ergaenzeLayout`) meidet Überlappungen, Kanten und Kardinalitäts-Plättchen (Test `chen_layout.test.js` über alle ER-Layouts der Akte 5); Akte-5-Seite verlinkt Bauplan-Tisch und Schema-Werkbank; Version 0.5.0. (9) **Offene Fragen an Frank (Default gilt):** (a) Die öffentliche TuS-DB enthält die normalisierte Fassung und zeigt damit die Lösung von A4-E2-07 (Schema-Browser der Freien Ermittlung) – Default: bleibt (LIESMICH gewollt; A4-E2 hat keine Datenbank-Kachel). Gleiches gilt für die Freie Ermittlung `/konsole/detektei` (Schema = Lösung der Überführungsaufgaben A5-E3-02/04/07) – Default: bleibt. (b) T4/T6 nur eA – Default: so. (c) Der Hinweis „sieht wie ein Fremdschlüssel aus“ greift auch bei Attributen auf `…Nr` ohne Verweis – Default: bleibt. |
| 2026-10-13 | **Phase 6, Umsetzungsentscheidungen:** (1) **Fallebene:** Format `levels[].plaedoyer` (Schritte, Indizien, Auflösung, Überleitung), Indiz erst nach dem Lösen des Schritts – auch „Lösung zeigen“ gibt es frei –, Auflösung nach dem letzten Schritt; `seed/fallebene.json` (Beweisstücke, Steckbrief-Hinweise; AUFGABENFORMAT §11, SEED_VERSION `akten-2`); Pinnwand `/pinnwand`, Stadtplan-Steckbrief aus der API. Regel E10 präzisiert: „nächste Akte“ = irgendeine spätere Akte des Plans (1–7) freigeschaltet; Zusatz `auchNachPlaedoyer` (Akte 6: Name/Motiv auch nach abgeschlossenem Plädoyer). Lehrkräfte sehen die Indizienkette auch gesperrter Akten. (2) **Lehrkraft:** Einstellung Board heißt `beamer`; `verhoerAkten` überschreibt den Kursmodus je Akte (§7.9/§7.11 nachgetragen); Board-Schlüssel 192 Bit, beim ersten Einschalten automatisch; CSV ohne `sub`, mit Formel-Schutz; Superadmin: Seed-Bericht, Inhalte neu laden, Sicherung per `VACUUM INTO`; Urkunden als Druckseite (eine A4-Seite je Schüler:in, Auswahl ab Rang). Der Scoreboard-Schalter wird nur gespeichert (keine Schüler-Rangliste). (3) **Materialien:** Whitelist-Format `docs/MATERIALIEN.md`; Downloads einheitlich 404 statt 302; Niveau-Filter nur in der Liste; Themenseite nennt Lehrkraft-Material „nach Anmeldung (Lehrkraft)“; Gast-Lösungen nur mit `ausdruecklich: true`; ZIP eigen (stored); Dockerfile-Stufe `material`, `ORIGINALE_IM_IMAGE=1` Standard (bei 0 auch `.md` heraus). (4) **Live-Modus** (nur RAM): Station S5g als `choice` statt `zellen`; Code-Eingabe auch ohne vorheriges Lösen (höchstens 5 Fehlversuche/min); Lehrkraft sieht die Codes in der Steuerung; Beamer nur mit Lehrkraft-Anmeldung; Duell-Ergebnis erst nach dem Schließen; im Escape Room bei falscher `match`/`choice`-Antwort keine Einzelrückmeldung; Statistik (Modus, Teilnehmerzahl, Datum) nur im RAM, wird mit dem Kurs gelöscht; Verbund-Löschung entfernt Konto bzw. Runden über den Hook `nachLoeschen`; AUFGABENFORMAT §12. (5) **Verhör-Kontexte:** V6 Fitness-App mit `Export` (Stichtag) und `ExportVerlauf`, Geburtsjahr 1949 als Ausnahme, Varianten nur `null`; V7 Mensa mit Daten bis 2027-03-25 (Karfreitag), ergänzte Februarwoche, Varianten `gleichnamig` und `grenze`; Beziehungstyp Gericht–Angebot einheitlich *bietetAn*. (6) **Akte 6** (Farbe `#4A5A1A`): Plädoyer-Abfolge nach DS_PLANUNG (Spur 1 ohne GROUP BY, Spur 4 nur AppCheckin, Spur 6 ohne Zeitfilter; STORY §7 und LIESMICH Datenspuren angeglichen); A6-E1-09 liefert 9 Zeilen; A6-E1-04 zweiteilig (Antwort 150); A6-E1-05 mit V-7046; Ermittler-Notiz ohne Tafelbild-SQL; Cold Case Ergebnis 100 %; A6-V-03 „Recht auf Selbstbestimmung“; V6 zieht 5 aus 8. (7) **Akte 7** (Farbe `#383E47`): Ermittlung ohne Aufgaben nur in Welt 7 erlaubt; Verhör 7 im Modus „auto“ frei mit der Akte-7-Freischaltung; „Akte geschlossen“ nur für Akten mit Lab-Aufgaben; V7-Rahmensatz aus STORY §6; A7-V-11 nur eingetretene Widersprüche (7 Zellen); *vertritt* 1:n (gleich in GP-eA-c); Allergen mit Schlüssel `Kuerzel`, *enthaelt* mit Mengenangabe. (8) **Kür K1:** Welt 8 mit `kuer: true` (`domain.KUER`, nicht in `AKTEN` → Manifest `welten`/`umfang` bleiben bei 7, keine Verbund-Welt), nur eA (gA-Wechsel mit freigeschalteter Kür → 400), Kür-Punkte zählen zu den Gesamtpunkten, nicht zu Rang, Abzeichen und „Akte geschlossen“. Schreib-Sandbox `fuehreSkriptAus`: frische In-Memory-DB je Anfrage, Fremdschlüssel an, 1,5 s, ≤ 200 Anweisungen, ≤ 20 eigene Tabellen, ≤ 500 Zeilen je Tabelle, ≤ 1 MB zusätzlich (`max_page_count`; Plan nannte 200 KB), Skript ≤ 10 000 Zeichen, zusätzlich verboten TEMP/TRIGGER/VIEW/VIRTUAL; Route `POST /api/kurse/:kurs/aufgaben/:id/skript` (30/min, nichts gespeichert, keine Fehlabfragen); Format `loesung.pruefung` (AUFGABENFORMAT §1.1/§6.6.1); K1-E1-03 mit Teil b) (`choice`); Intro-Tafelbild mit Schulbeispiel. (9) **Trainingsplatz T8 und Verbund:** T8 übt P1–P7 (P8–P10 nicht als Abfrage); Kursübersicht `zuletzt` = letzte Aktivität; gA-Kurs ohne Akte 5 in `welten`; `umfang` nur Akten 1–7. (10) **Abnahme:** E2E-Probelauf (`test/e2e/probelauf.e2e.js`, Screenshots `docs/screenshots/phase6/probelauf_*`); Test `test/verbund_loeschen_alles.test.js` durchsucht alle Tabellen aus `sqlite_master` nach sub bzw. kurs_id; dabei behoben: Live-Statistik des gelöschten Kurses blieb im RAM; Meldung „Neue Abzeichen“ nennt die Akte; Lehrkraft-Kopf zählt die Kür nicht als Akte; Stempel in der Board-Vorschau überdeckte den Namen. Version 0.6.0. (11) **Offene Fragen an Frank (Default gilt):** (a) Das Board zeigt den Kursnamen öffentlich (DESIGN §5.12; wer den Link kennt, sieht ihn) – Default: bleibt. (b) Steckbrief-Feld Name/Motiv schon nach abgeschlossenem Plädoyer (E10-Zusatz `auchNachPlaedoyer`) – Default: ja. Dazu Befund des Probelaufs: Schaltet die Lehrkraft Akte 7 frei, sehen nach E10 alle den vollständigen Steckbrief **mit Namen**, auch wer das Plädoyer nicht gelöst hat – Default: bleibt (Akte 7 folgt im Unterricht auf DS 12). (c) Live-Statistik nur im RAM (geht beim Neustart verloren) oder in der DB? – Default: RAM. (d) Verhör 7 im Modus „auto“ frei mit der Akte-7-Freischaltung oder erst, wenn alle Akten 1–6 frei sind? – Default: mit Akte 7. (e) Beweisstücke-Nenner auf der Urkunde im gA-Kurs: 6 (ohne Verhör 5, umgesetzt) oder 7 wie eA? – Default: 6. (f) Scoreboard-Schalter ohne Schüler-Rangliste (nur gespeichert) – Rangliste für Schüler:innen bauen oder Schalter entfernen? – Default: bleibt gespeichert, ohne Wirkung. |
| 2026-10-13 | **Phase 7, Umsetzungsentscheidungen:** (1) **Pipeline und Design-Modul:** `werkzeuge/akten_design.py` (python-docx/python-pptx) mit Fonts als TTF aus google/fonts (Barlow hat kein ↑/★ → ↑ in IBM Plex Mono, ★ als Symbol-Fallback; ↔ und ✔ fehlen in Barlow → ersetzt); ER-Grafiken mit Pillow, Geometrie wie `chen.js`; SQL-Steuerangaben als versteckter Text `[[DD: …]]`; `quellen.json` je PDF-Ordner mit SHA-256 der Quelle → die CI prüft Vollständigkeit und Aktualität ohne LibreOffice (`--pruefen`); Dockerfile-Stufe `material` über `scripts/materialien_fuer_image.js`. Erstellungsskripte `quellen/material/*.py` sind nur Erstellungshilfen (nicht byte-reproduzierbar): danach sind die docx/pptx maßgeblich; nach einem erneuten Lauf eines Skripts die Pipeline neu laufen lassen und nur die gewollt geänderten Dateien committen. (2) **Whitelists:** zusätzliche Art `handout` (Präsentations-Handout bei den Schülerfassungen); `niveau` nur `eA`/`gA`/`beide`; Gruppe Gesamt mit `akte: 0`, Kür mit `akte: "kuer"`; Video-Folien nur Lehrkraft, Drehbücher (`.md`) nicht in der Originale-Whitelist. (3) **Prüfwerkzeuge:** `materialien_pruefen.py` lässt `<>` nur in Sätzen mit Verneinungswort zu (Erklärung „statt <>“) und ignoriert „Self-Join“ beim JOIN-Muster; `kompetenz_abdeckung.py --streng` läuft jetzt in `npm run pruefen` und in der CI, mit begründeten Ausnahmen (`AUSNAHMEN`: K12, K22, siehe (9a)); neue Tests `test/material_echt.test.js` (Zugriff je Stufe mit den echten Whitelists) und `werkzeuge/tests/test_schuelerfassungen.py` (Text aller Schüler-PDFs ohne Lösungsmarker und ohne Story-Auflösung). (4) **Material Akten 1–3:** eigene Ausschnitte und Unplugged-Daten (A1, `db=keine`), Kopiervorlage Detektei-Ausweise; AB 1.2 Auftrag 2 mit „(gemeint: …)“; AB 2.2 Altstadt statt Hafenviertel (0 Zeilen) und Clara Rossi statt Lea Meiners, zwei bewusste Kreuzprodukte als fehlerhaft markiert; AB 3.1/3.2 an die Stadtfest-Daten angepasst (Gruppierung nach BonNr, Vervielfachung mit Position); Foliennummern der Verlaufspläne sind Richtwerte. (5) **Material Akten 4–6:** Anomalie-Rennen mit eigener Übungsliste „SG Weserufer“, Schlüssel-Detektiv „Ole Harjes“, Löschanomalie in AB 4.1 an der Beitragsgruppe Passiv; Akte 5 mit fünfseitigen ABs (ER-Platz), R1–R6 am Schulbeispiel, Musterbeitrag „Hafenkante“, *vertritt* 1:n; Akte 6 Debatte mit 4 Argumenten je Rolle, Auflösung nur in Lehrkraftfassungen. DS_PLANUNG (Blueprints und Anhang Nr. 29–38) angeglichen. (6) **Akte 7:** Prüfungs-DBs `seed/datenbanken/pruefung/{sanitaetsdienst,kostuemverleih}` (nie öffentlich geladen), Kostümverleih 26 Mitglieder/77 Ausleihen mit zwei „Lasse Kück“; NK-B-f ternär; Rollenwechsel nur im Text; Fallen-Checkliste als Kopiervorlage. (7) **Gesamt, Kür, Videos:** Gesamtübersicht mit vollständiger Materialliste (alle Akten, Kür, Videos); Abi-Kompass mit 18 belegten Kennungen, die 19. „Zuordnung offen“, Termine teils offen; K1-AB ohne Kompetenz-Zuordnung; K2-Lehrkraftfassung als Lösung; Bonus-Schloss auf Papier; Operatoren-Karte selbst formuliert. Videos 0–7 auf der eigenen Video-DB `video/schachturnier` (nie in der Plattform geladen), Video 6 als „R1 + 5 Regeln“, „Self-Join“ auf Folien umschrieben, Sprechzeiten-Schätzung unter der Ziellänge. (8) **Video-Link-Knöpfe (Abschnitt 13):** `seed/videos.json` (Nr, Titel, Akte, DS, Niveau, Ordner, `url` = null bis zum Hochladen); erlaubt nur `https://www.youtube.com/watch?v=<ID>` und `https://youtu.be/<ID>` (Validator), ausgegeben in Normalform ohne Tracking-Parameter; Anzeige als `<a href>` mit `target="_blank"` und `rel="noopener noreferrer"` an der Ermittlung (gleiche DS), auf der Themenseite (je Akte) und im Lehrkraft-Reiter Materialien; kein Embed, CSP unverändert; eA-Videos fehlen in gA-Kursen. Abnahme: Version 0.7.0, Sichtprüfung je Akte (Kontaktbögen `docs/screenshots/phase7/`). (9) **Offene Fragen an Frank (Default gilt):** (a) Die Kompetenzmatrix nennt für K12 (Redundanzfreiheit begründen) und K22 (LIMIT) kein Arbeitsblatt; inhaltlich stehen beide in AB 4.2 bzw. AB 3.2 – Matrix und Material-Zuordnung ergänzen (z. B. „AB 4.2/4“, „AB 3.2/4“)? Default: Ausnahme im Werkzeug, Matrix unverändert. (b) Abi-Kompass: Liste der 19 vorliegenden Klausuren (Spec §2.4) – nur 18 Kennungen sind belegt, Termine teils offen; bitte die vollständige Liste (Jahr/Termin/Niveau) bestätigen. Default: 19. Eintrag „Zuordnung offen“. (c) Gast-Auswahl (E13): `materialien/Gast_PDF/verzeichnis.json` ist leer – welche Schüler-/Lehrkraft-PDFs sollen öffentlich sein? Default: leer. (d) `werkzeuge/klarnamen.txt` enthält nur Platzhalter (Mustermann) – echte Namen aus dem Kurs/Kollegium ergänzen? Default: Platzhalter. (e) Bewertungsschlüssel BE → Notenpunkte für Generalprobe/Klausuren (Fachkonferenz). Default: kein Schlüssel im Material. (f) Hilfsmittel in Generalprobe und Klausuren: EH §7/§8 (Notation, SQL-Umfang) als Hilfsmittel zulassen? Default: nur die Operatorenübersicht (Prüfungskopf). (g) Video-Links: Frank trägt die YouTube-URLs nach dem Hochladen in `seed/videos.json` ein; mit eingetragener URL steht der Link auf der öffentlichen Themenseite (ein „nicht gelistetes“ Video wird damit auffindbar). Default: `url: null`, keine Knöpfe. (h) Warm-up-Karte W-A6-03 zeigt im Schüler-PDF (und im Warm-up-Trainer) den Datensatz „WA-3917 · Kranstraße 7“ – die Adresse der Auflösung von Akte 6, ohne Namen. Umformulieren (andere Adresse) oder lassen? Default: bleibt (Ausnahme im Test `test_schuelerfassungen.py`). |
| 2026-10-13 | **Phase 8, Probelauf und Feinschliff:** (1) **Probelauf** in vier Bereichen (Akten 1–3 mit Konsole und Werkzeugen, Akten 4–5 mit Modellierung, Akten 6–7 mit Kür/Training/Urkunden, Lehrkraft-Bereich mit Live/Board/Gast) als Schüler:in eA/gA, Lehrkraft, Superadmin und Gast auf 390/768/1024/1366/1920 px, hell/dunkel, reduzierte Bewegung; jeder Befund mit Regressionstest (`test/e2e/probelauf8_*.e2e.js`) bzw. Sichtprüfung (`docs/screenshots/phase8/`). Behoben u. a.: Doppelklicks (Tipp, Warm-up, Live „Nächste Aufgabe“ – Steuerung sendet die gesehene Nummer `nach`, sonst 409), Bauplan-Tisch per Finger (iPad), Zuordnungen mit vielen Kategorien, Urkunde mit langen Namen, Rückmeldungen am Handy außer Sicht, Beamer nach abgelehntem Ereignisstrom, Abzeichen-Nenner im gA-Kurs, Touch-Ziele < 44 px. **Anrede:** Bedienhinweise der Widgets im Verhör gesiezt (Option `sie` in `erzeugeAufgabe`, Lab geduzt); Lehrkraft-Seiten gesiezt (`<html data-anrede="sie">`). Prüfer-Rückmeldung `zeilen: null`, wenn die Abfrage nicht lief. (2) **Lektorat:** Verhör 2 mit `[x BE]` (Vorschlag 1/2/2/1/2/3/3/3/2/3/4/4), Operatoren einheitlich, Datum im Fließtext TT.MM.JJJJ, „Verbundbedingung“. (3) **Sicherheits-Review** (`docs/SICHERHEIT_PRUEFUNG.md`): Speicherwächter der Sandbox (better-sqlite3 ignoriert `hard_heap_limit` wegen `SQLITE_DEFAULT_MEMSTATUS=0` – Kindprozess wird bei > 128 MB Zuwachs ersetzt, `ergebnis_zu_gross`), Varianten erst nach Treffer auf der Haupt-DB, Parser lehnt Klammertiefe > 40 ab (`ZU_TIEF`), Escape-Code-Bremse zusätzlich je Konto, Sicherungs-Limit nach der Anmeldung, Entwicklungsschlüssel/-geheimnis mit `NODE_ENV=production` abgelehnt (Start bricht ab), Rate-Limit vergisst abgelaufene IPs. **Rate-Limits für Schul-NAT:** `/sso` 300/min je IP (vorher 30), Gast-Prüfen 120/min und übrige Gast-Anfragen 600/min je IP, Verbund-API 120/min je IP statt gesamt. (4) **Datenschutzseite** vollständig (alle Tabellen, RAM-Daten, Cookies, Gerätespeicher, Empfänger, Protokolle), Schulangaben als Platzhalter mit Entwurfs-Hinweis wie im Portal; Test `test/datenschutz.test.js` gegen `sqlite_master`, Cookie-Konstanten und localStorage-Schlüssel. (5) **Lizenz (Default bis Entscheidung Frank):** `LIZENZ.md` – Materialien und Inhalte CC BY-NC-SA 4.0 (Namensnennung „Frank Juchim, Datendetektei Weserstedt“), Programmcode alle Rechte vorbehalten, Drittkomponenten (OFL-Fonts, sql.js MIT); Hinweis auf `/datenschutz#lizenz` und in der Fußzeile der Themenseite. (6) **Doku:** `docs/ANLEITUNG_LEHRKRAFT.md`, `docs/PROBELAUF.md` (Checkliste für den Probelauf im Unterricht mit den ausstehenden Geräte-/WLAN-Abnahmetests, Rückmeldebogen). Version 0.8.0; 1.0.0 nach Franks Freigabe des Probelaufs. (7) **Offene Fragen an Frank (Default gilt):** (a) Lizenz bestätigen. (b) Schulangaben für `/datenschutz` (Verantwortliche, DSB, Rechtsgrundlage, Hoster, Protokolle beim Hoster, Sicherungsdauer). (c) BE-Werte Verhör 2. (d) Escape-Codes S3/S5/S5g haben 2 Ziffern (trotz Bremse in ~20 min erratbar) – auf 3 Ziffern umstellen (auch Papier-Umschläge)? Default: bleibt. (e) Sandbox mit 2 Kindprozessen: Prozessanzahl einstellbar und ≤ 1 laufender Auftrag je Konto? Default: bleibt. (f) Urkunde: Standard-Auswahl „ab Rang …“ statt alle? Default: alle. (g) SSO-Fehlerseite `keine_berechtigung` spricht auch Lehrkräfte als Schüler:innen an (Text aus labs INTEGRATION.md) – neutralen Text für den Vertrag vorschlagen? Default: bleibt. (h) Kurswechsel im Portal wirkt erst bei der nächsten Anmeldung (Sitzung 30 Tage; Löschungen sofort) – Vertragsthema. (i) Eingabefelder Lücke 36 px/Zelle 40 px unter 44 px – Default: bleibt (Zeilenabstand). (j) Verhör am Handy: Timer scrollt mit – Default: bleibt. (k) Lese-ER-Diagramme am Handy klein (Liste vorhanden) – Default: bleibt. (l) PK in Mini-Markdown nur fett statt unterstrichen (neue Syntax nötig) – Default: bleibt. (m) Escape Room „ihr/euer“ vs. STORY „du“; Verhör-Rahmensätze duzen; „Detektei Lorenz“ in der Oberfläche – Default: bleibt. (n) `POST /api/sql/ausfuehren` ohne Anmeldung 30/min je IP (nur bei gesperrtem WebAssembly, nur Eisdiele) – Default: bleibt. (o) Live-Abnahme (Task 1): Der CapRover-Build von `main` (0ee413e, Phasen 2–7) brauchte gut eine Stunde; danach `vertrag_pruefen.js` gegen die Live-Instanz grün (0.7.0), CSP und `X-Robots-Tag` wie spezifiziert, Lehrkraft-PDFs anonym 404. |
| 2026-10-13 | **Entscheidungen Frank zu Phase 8 (7):** (a) **Lizenz bestätigt:** Materialien und Inhalte CC BY-NC-SA 4.0 (Namensnennung „Frank Juchim, Datendetektei Weserstedt“), Programmcode alle Rechte vorbehalten (`LIZENZ.md`, `/datenschutz#lizenz`). (b) Schulangaben folgen später (Platzhalter bleiben). (c) BE-Werte Verhör 2 bestätigt. (d) **Escape-Codes ≥ 3 Ziffern** (Validator `CODE_MIN` 3): S3 6412 (+ Schichten des stärksten Stands), S5 4313 (+ Anzahl aller Attribute, Quelle `attribute`), S5g 213 (+ Attribute aller tauglichen Schlüssel, Quelle `attributeRichtig`); AUFGABENFORMAT §12, STORY, DS_PLANUNG, K2-Stationen und -Lehrkraftfassung angepasst. Bonus-Schloss (nur Papier, Lehrkraft prüft) bleibt 08. (e) **Sandbox:** `SANDBOX_PROZESSE` (1–16, Standard min(4, max(2, Kerne − 1)); je Kindprozess ~60 MB + bis 128 MB während einer Abfrage); höchstens ein laufender Sandbox-Auftrag je Konto routenübergreifend (`auftragsSperre`, 429 `LAEUFT_NOCH`), ohne Anmeldung bis zu 4 je IP (Schul-NAT im Gastmodus); wackelige Sandbox-Tests (Zombie nach SIGKILL, Ersatzprozesse in der Zeitmessung) robust gemacht. (f) Urkunden-Auswahl bleibt „alle“. **Offen:** Schüler-Scoreboard (Schalter `scoreboard` ohne Wirkung) bauen oder Schalter entfernen; Bremse für falsche Escape-Antworten (Auswahl-Stationen ohne Bremse durchprobierbar: S5g ≤ 63, S4 ≈ 108 Kombinationen). |
