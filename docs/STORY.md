# Story-Bibel – Datendetektei Weserstedt

| | |
|---|---|
| **Gilt für** | Plattform (Briefings, Pinnwand, Steckbrief, Schlussplädoyer, Urkunden), Präsentationen, Arbeitsblätter („Fall-Einstieg“), Videos, Unplugged-Material |
| **Quelle der Wahrheit** | Design-Spezifikation `docs/superpowers/specs/2026-10-12-datendetektei-design.md` (Abschnitte 3, 6, 7.7, 8, 9). Bei Widerspruch gilt die Spec. |
| **Stand** | 2026-10-12 · Entwurf zur Freigabe durch Frank Juchim |
| **Abhängigkeiten** | Story-Fakten in den Datenbanken: siehe **Anhang A** (muss mit `seed/datenbanken/*/LIESMICH.md` übereinstimmen) |

---

## 1. Ton und Regeln

1. **Alles ist frei erfunden.** Weserstedt, alle Personen, Vereine, Firmen und Orte sind fiktiv. Keine Klarnamen realer
   Personen, keine realen Firmen, keine echten Adressen oder Telefonnummern (Format `0000-…`). Ähnlichkeiten mit realen
   Personen sind nicht beabsichtigt; neue Namen werden gegen die Klarnamen-Liste (`materialien_pruefen.py`) geprüft.
2. **Wirtschafts- und Datenkrimi, altersgerecht.** Keine Gewalt, keine Waffen, keine Bedrohung, keine Verletzten, kein
   Blut, keine Verhaftungsszenen. Das Phantom schadet niemandem körperlich, die Räder bleiben heil, das Geld taucht wieder
   auf. Spannung entsteht durch Rätsel, Indizien und die moralische Wendung, nicht durch Brutalität.
3. **Fachbegriffe ersetzen nie die Story und umgekehrt.** Eine *Akte* ist keine *Tabelle*, ein *Verhör* ist keine
   *Abfrage*. In jedem Briefing stehen die Fachbegriffe nach EH (Tabelle, Datensatz, Attribut, Primärschlüssel,
   Fremdschlüssel, Verbund, Entitätstyp, Beziehungstyp, Kardinalität …) unverändert neben der Story.
4. **Längen:** Lab-Briefing **höchstens 3 Sätze**, Präsentations-Briefing 5–8 Sätze, Abschluss der Fallbesprechung
   **ein** Satz (Cliffhanger). Story im Lab ist Würze, nicht Hauptgericht.
5. **Anrede:** Schülerinnen und Schüler werden **geduzt** (Lab: „du“, Präsentation: „ihr“). Verhöre, Generalprobe,
   Klausur, Erwartungshorizonte und Abi-Ecken sind **gesiezt**, nüchtern, mit Operatoren und `[x BE]`; die Story erscheint
   dort höchstens in **einem Rahmensatz**.
6. **Inklusive Sprache sparsam:** Doppelpunkt-Formen nur dort, wo die Spec sie festlegt (Rangnamen, Abzeichen
   „Architekt:in“, „Datenschützer:in“). Sonst neutrale Formen („Ermittlerteam“, „alle, die …“, „Kundschaft“) oder
   gelegentlich Paarformen („Helferinnen und Helfer“).
7. **Vertragsbegriffe bleiben:** In der Oberfläche heißen Dinge weiterhin *Kurs*, *Kurscode*, *persönlicher Code*,
   *Lehrkraft*, *Warm-up*, *Team*, *Punkte* (keine „XP“). Die Story nennt den Kurs „Ermittlerteam“, die Gruppen zu 3–4
   heißen auch in der Story „Teams“.
8. **Keine Lösungen in der Story.** Briefings verraten Richtung und Werkzeug, nie die fertige Abfrage oder das Ergebnis
   einer bewerteten Aufgabe. Ergebnisse (z. B. „Kundenkonto 77“) erscheinen erst im *Abschluss-Satz* der Fallbesprechung,
   also nachdem die Ermittlung im Unterricht gelaufen ist.
9. **Humor dosiert,** nie auf Kosten von Personen. Juri macht typische Fehler stellvertretend für alle – er wird dafür nie
   bloßgestellt, sondern lernt mit.
10. **Videos:** Edda tritt höchstens im Einstieg (≤ 30 s) mit 1–2 Sätzen auf; Beispiele in Videos und im Gastmodus nutzen
    eigene Daten (Spec 6.4).

---

## 2. Weserstedt

Weserstedt ist eine mittelgroße, fiktive Stadt an der Weser mit altem Hafen, Fachwerk-Altstadt und viel Fahrradverkehr.
Die Stadtteile sind zugleich die Werte des Attributs `Stadtteil` in allen Akten-Datenbanken (Anhang A).

### 2.1 Stadtteile

| Stadtteil | Beschreibung |
|---|---|
| **Altstadt** | Kopfsteinpflaster, Fachwerk und der Marktplatz mit Rathaus. Hier liegen Fundbüro und Detektei, nur drei Gassen voneinander entfernt. |
| **Hafenviertel** | Der alte Binnenhafen: Speicher wurden zu Wohnungen und Ateliers, dazwischen stehen noch Lagerschuppen. Hier liegt die StadtRad-Station Hafenkante – und hier wohnt das Phantom. |
| **Weserufer** | Promenade und die weiten Weserwiesen, auf denen jedes Jahr Ende August das Stadtfest stattfindet. Abends voller Joggerinnen, Hunde und Spaziergänger. |
| **Mühlenfeld** | Grüner Stadtteil um eine alte Windmühle, mit Sportplätzen, der Halle am Mühlenfeld und dem Vereinsheim des TuS Weserstedt. |
| **Nordheide** | Junges Wohngebiet am Stadtrand mit Reihenhäusern, Schulzentrum und viel Pendelverkehr in die Innenstadt. |
| **Lindenhof** | Lebhaftes Viertel mit Cafés, kleinen Läden und der Eisdiele Weserstedt (Gastmodus). |
| **Deichkamp** | Gewerbegebiet hinter dem Deich mit der StadtRad-Werkstatt und Lagerhallen. |
| **Bahnhofsviertel** | Bahnhof, Busbahnhof und die größte StadtRad-Station der Stadt. |

### 2.2 Orte des Stadtplans (Fallebene, Spec 7.7)

Der Stadtplan zeigt die Akten als Orte; gesperrte Akten liegen im Nebel.

| Ort | Akte | Beschreibung |
|---|---|---|
| **Fundbüro** (Altstadt) | 1 | In der „Alten Waage“ am Marktplatz, ein Raum voller Regale mit Schirmen, Schlüsseln und Kuriositäten. Das Fundbuch wird digital geführt – mit einem Verwaltungszugang, den mehr Leute haben, als gut ist. |
| **StadtRad-Station Hafenkante** (Hafenviertel) | 2 | Eine Station direkt am Kai mit Stellplätzen für normale Räder und Lastenräder. Nachts ist es hier still, nur die Laternen und die Terminals leuchten. |
| **Festplatz** (Weserufer) | 3 | Die Weserwiesen, auf denen beim Stadtfest Stände, Bühne und das Kaffeemobil stehen. Den Rest des Jahres grasen hier fast nur Gänse. |
| **Vereinsheim TuS** (Mühlenfeld) | 4 | Holzbau mit Vereinskneipe, Pokalvitrine und einem Büro, in dem ein Laptop mit „der Liste“ steht. Nebenan trainiert die Tischtennis-Abteilung dienstags in der Halle am Mühlenfeld. |
| **Detektei** (Altstadt) | 5 (und 7) | Zwei Räume über einer Buchbinderei in der Kontorgasse: unten Pinnwand und Bauplan-Tisch, oben das Prüfungszimmer. Es riecht nach Tee, Papier und neuem Laptop. Vorschlag: Akte 7 als zweiter Fortschrittsring am selben Gebäude. |
| **Rathaus** (Altstadt) | 6 | Backsteinbau am Marktplatz, Sitz der Bürgermeisterin und der Stadtverwaltung. Hier liegen die Datenbestände, die am Ende zusammengeführt werden. |

Weitere Orte (nur Story, nicht auf dem Stadtplan): **Schuppen 4** am Hafen (Versteck der Lastenräder, Auflösung Akte 6) ·
**Halle am Mühlenfeld** (Tischtennis-Training dienstags 19 Uhr) · **Eisdiele Weserstedt** im Lindenhof (Gastmodus).

---

## 3. Figuren

### 3.1 Edda Lorenz – Chefin der Datendetektei

Kommissarin a. D., Ende 60, 31 Jahre bei der Kriminalpolizei Weserstedt, die meisten davon in der
Wirtschaftskriminalität. Hat ihre Laufbahn mit Karteikästen begonnen und mit Anfang fünfzig SQL gelernt, „weil die
Kartei nicht mehr in den Keller gepasst hat“. Nach der Pensionierung hat sie die Datendetektei gegründet – und sich als
Erstes ein Ermittlerteam gesucht: den Kurs.

- **Persönlichkeit:** trocken, warmherzig, ungeduldig mit Raten, sehr geduldig mit Fehlern. Liebt saubere Begründungen
  und misstraut schnellen Ergebnissen. Trinkt Tee mit Kandis, trägt die Lesebrille an einer Kette und stempelt „GELÖST“
  am liebsten selbst.
- **Rolle:** gibt Aufträge, stellt Fragen, nie Lösungen. Sie ist die Stimme der Operatoren („Begründen heißt: weil“).
  In Akte 6 ist sie die Erste, die zugibt, dass die Detektei eine Grenze überschritten haben könnte.
- **Typische Sätze:**
  - „Erst die Frage, dann die Abfrage.“
  - „Raten ist in diesem Haus verboten. Zählen nicht.“
  - „Zeig mir die Zeilen.“
  - „NULL ist nicht null. NULL heißt: weiß keiner.“
  - „Wer ohne Verbundbedingung verbindet, verdächtigt die halbe Stadt.“
  - „Ein Indiz ist noch kein Beweis.“
  - „Erläutern ist kein vornehmes Wort für nennen.“
  - „Daten lügen nicht. Abfragen manchmal schon.“

### 3.2 Auftraggeberinnen und Auftraggeber je Akte

| Akte | Name | Rolle | Kurzprofil |
|---|---|---|---|
| 1 | **Gesa Ohlendiek** | Leiterin des Fundbüros | Penibel, kennt jedes Fundstück beim Vornamen; ihre Notizen sind trotzdem lückenhaft. |
| 2 | **Bent Hollwedel** | Betriebsleiter StadtRad Weserstedt | Technikbegeistert, nervös wegen der Versicherung; spricht von „seinen“ Rädern. |
| 3 | **Frauke Melchers** | Kassenwartin des Festausschusses | Ehrenamtlich, sehr gründlich; hat nach dem Fest die Becher gezählt und den Fehlbetrag entdeckt. |
| 4 | **Wiebke Lüttjohann** | Kassenwartin des TuS Weserstedt | Verzweifelt an „der Liste“, die jeden Monat eine andere Beitragssumme ergibt. |
| 5 | **Edda Lorenz** | Detektei (in eigener Sache) | Die Pinnwand ist voll – die Detektei braucht eine eigene Fall-Datenbank. |
| 6 | **Annegret Vollmers** | Bürgermeisterin der Stadt Weserstedt | Will das Phantom gefunden wissen und überlässt der Detektei pseudonyme Datenexporte der Stadt. |
| 7 | **Edda Lorenz** | Prüfungskommission | Nimmt die Ermittlerprüfung ab und unterschreibt die Lizenzen. |

### 3.3 Nebenfiguren

| Name | Rolle |
|---|---|
| **Juri Brandes** | 19, Azubi zum Fachinformatiker in der Detektei. Schnell, begeistert, macht die typischen Fehler stellvertretend für alle (die „praktische“ Excel-Liste, 14 Entitätstypen ohne Kardinalität, die „sicher versteckten“ Tresor-Codes). Pflegt die Ermittlungskonsole. |
| **Lene Hartwig** | Reporterin des *Weserstedter Tageblatts*. Liefert Schlagzeilen für Briefing-Folien („Nachtfalter-Zeichen am Hafen – wer ist das Phantom?“). |
| **Selin Aksoy** | Betreiberin des Kaffeemobils auf dem Stadtfest. Hat „Nora“ als freundliche, schnelle Helferin in Erinnerung. |
| **Tamara Leversen** | Einwohnerin im Hafenviertel, Jahrgang 1988. Steht in Akte 6 kurz auf der Kandidatenliste, obwohl sie mit nichts zu tun hat – Bürgerin in der Debatte. |
| **Ole Brakhage** | Einwohner im Hafenviertel, Jahrgang 1988, spielt Fußball beim TuS. Zweiter unbeteiligter Kandidat in Akte 6. |
| **Mats Oltmanns** | Referent der (fiktiven) Landesdatenschutzbehörde. Tritt nur in der Debatte auf. |
| **Pia Wendland** | Inhaberin der Eisdiele Weserstedt – nur im Gastmodus, ohne Bezug zum Phantom. |

### 3.4 Das Phantom – Merle Falkenrath

- **Klarname:** Merle Falkenrath, **Jahrgang 1988**, wohnt im **Hafenviertel**, spielt **Tischtennis** beim TuS Weserstedt.
- **Beruf:** bis 2025 **Datenschutzbeauftragte der Stadt Weserstedt**. Ihr Gutachten „Wie gläsern ist Weserstedt?“
  warnte, dass die Stadt zu viele Daten zu lange speichert, dass „pseudonym“ nicht „anonym“ heißt und dass Zugänge
  ehemaliger Beschäftigter nie gesperrt werden. Das Gutachten verschwand in einer Schublade; sie kündigte.
- **Tarnname überall:** **„Nora Falter“**. Im Fundbuch kürzt sie ihn zu „N. Falter“ – schnell gesprochen: *Nachtfalter*.
- **Signatur:** ein kleiner, gezeichneter **Nachtfalter**. Nachtfalter sind unauffällig, nachtaktiv und werden vom Licht
  angezogen – so wie Daten, die man ans Licht holt.
- **Motiv:** Sie wollte beweisen, wie leicht man durch das Verknüpfen von Daten jeden Bürger durchleuchten kann. Deshalb
  benutzt sie zwar einen falschen Namen, aber **echte Quasi-Identifikatoren** (Jahrgang, Stadtteil): Wer die Daten
  verknüpft, soll sie finden können.
- **Kein Gewinn:** Sie behält nichts. Am Morgen nach der Enttarnung gibt sie im Fundbüro einen braunen Umschlag mit
  Nachtfalter ab: Messing-Kompass, 312,50 € in bar („für die Festkasse“), Beleg über die nachgezahlten Vereinsbeiträge,
  Schlüssel zu Schuppen 4 (dort stehen die fünf Lastenräder unbeschädigt) und ihr Gutachten.
- **Darstellung:** nie als Bösewicht, nie als Heldin. Sie hat Unrecht getan, um auf Unrecht aufmerksam zu machen – das
  bleibt in der Debatte offen. Was rechtlich aus ihren Taten folgt, entscheidet nicht die Detektei.

---

## 4. Die Akten

Jedes gewonnene Verhör bringt ein **Beweisstück** (Polaroid) an die Pinnwand. Der **Steckbrief** des Phantoms füllt sich
mit jeder Akte. Vorschlag: Der Steckbrief-Hinweis einer Akte wird sichtbar, sobald die Schlüssel-Aufgabe der Akte gelöst
**oder** die nächste Akte freigeschaltet ist – so verliert niemand den Story-Faden, nur weil ein Verhör noch aussteht.

### 4.0 Chronik des Phantoms (Hintergrund, nicht vollständig erzählt)

| Wann | Was |
|---|---|
| 2025 | Merle Falkenrath verlässt die Stadtverwaltung; ihr Verwaltungszugang wird nicht gesperrt. |
| 2026-01-01 | TuS erhöht den Monatsbeitrag für Erwachsene von 12,00 € auf 14,00 €; die Liste wird nur teilweise angepasst. |
| 2026-04-01 | „Nora Falter“ erscheint in der TuS-Rohliste (Tischtennis, Monatsbeitrag 0,00 €). |
| 2026-06-18 | Der Messing-Kompass wird an der Weserpromenade gefunden und ins Fundbuch eingetragen. |
| 2026-08-29 (Sa) | Stadtfest: „Nora Falter“ (HelferNr 23) hat Schicht am Kaffeemobil, 22:00–23:00. |
| 2026-09-08 bis 09-12 | Fünf nächtliche Lastenrad-Ausleihen ab Hafenkante über Kundenkonto 77, keine endet. |
| 2026-09-14 (Mo) | Fundbuch-Datensatz des Kompasses wird geändert, der Kompass verlässt das Fundbüro. |
| Herbst 2026 | Die Datendetektei nimmt die Arbeit auf (Story-Gegenwart). |

### 4.1 Akte 1 – Das Fundbüro (DB `Fundbuero`)

- **Auftrag:** Gesa Ohlendiek bittet die Detektei, das Fundbuch zu prüfen: Ein Fundstück ist aus dem Register und aus dem
  Regal verschwunden.
- **Ausgangslage:** Das Fundbuch (Tabelle `Fundsache`) enthält rund 80 Fundsachen. Frau Ohlendiek erinnert sich nur an
  Bruchstücke: „irgendwas aus Messing“, „im Juni oder Juli gefunden“, „mehrere hundert Euro wert“. Im Ausgabebuch des
  Schalters fehlt eine Unterschrift.
- **Spur:** Über eine Kette aus drei Abfragen (Textmuster in `Bezeichnung`, Zeitraum für `Funddatum`, Wert und
  `AbgeholtAm`) bleibt genau ein Datensatz übrig: **„Messing-Kompass“, Wert 450 €**. `AbgeholtAm` ist gesetzt
  (2026-09-14), im Feld `Finder` steht **'N. Falter'**.
- **Auflösung der Teilakte:** Der Datensatz wurde nachträglich geändert. Wer `AbgeholtAm` setzen kann, hat Zugriff auf
  die Verwaltungsdaten der Stadt. „N. Falter“ ist kein Finder, sondern eine Unterschrift: *Nachtfalter*. Wer dahinter
  steckt, bleibt offen.
- **Beweisstück 1 – Fundbuch-Seite:** Polaroid eines Ausdrucks der Fundbuch-Seite; die Zeile „Messing-Kompass · 450 € ·
  Finder: N. Falter · abgeholt 14.09.“ ist mit gelbem Marker hervorgehoben, am Rand ein kleiner, mit Bleistift
  gezeichneter Nachtfalter. Unten auf dem weißen Rand in Eddas Handschrift: „Wer war am Schalter?“
- **Steckbrief danach:** Initialen **„N. F.“** · Signatur **Nachtfalter** · hat Zugriff auf städtische Datenbestände.

### 4.2 Akte 2 – Spur der Räder (DB `StadtRad`)

- **Auftrag:** Bent Hollwedel meldet fünf verschwundene Lastenräder.
- **Ausgangslage:** Die Räder sind seit einigen Nächten nicht mehr aufgetaucht. Die Daten verteilen sich auf Station, Rad,
  Kunde, Ausleihe und Reparatur.
- **Spur:** Fünf nächtliche Ausleihen von **Lastenrädern** ab Station **„Hafenkante“** (Nächte 2026-09-08 bis 2026-09-12,
  jeweils zwischen 01:00 und 02:00 Uhr) haben **`Ende` = NULL** (und keine Zielstation). Alle laufen über das
  Kundenkonto **„Nora Falter“, KundenID 77, Jahrgang 1988, Stadtteil Hafenviertel, Tarif Plus**.
- **Auflösung der Teilakte:** StadtRad prüft bei der Anmeldung keinen Ausweis – ein falscher Name reicht. Auffällig: Der
  Name ist falsch, aber Jahrgang und Stadtteil wirken echt. Wo die Räder sind, bleibt offen.
- **Beweisstück 2 – Schloss-Code:** Polaroid des Displays am Ausleih-Terminal Hafenkante bei Nacht: „Rad entsperrt ·
  Konto 77 · N. Falter“, daneben auf dem Gehäuse ein aufgeklebter Nachtfalter-Sticker; im Hintergrund unscharf die
  Laternen am Kai.
- **Steckbrief danach:** Tarnname **„Nora Falter“** · **Jahrgang 1988** (Angabe im Konto, unbestätigt) · Wohnort laut
  Konto Hafenviertel (unbestätigt) · nachts unterwegs.

### 4.3 Akte 3 – Die Stadtfest-Kasse (DB `Stadtfest`)

- **Auftrag:** Frauke Melchers meldet einen Fehlbetrag von **312,50 €**.
- **Ausgangslage:** Die Festkasse stimmt auf den ersten Blick: Bargeld und Bar-Umsatz laut Kasse passen zusammen. Aber
  bei der Warenzählung wurden mehr Getränke ausgegeben, als die Kasse verkauft hat – Wert der Differenz: 312,50 €.
- **Spur:** Am Stand **„Kaffeemobil“** gibt es in der Stunde **22:00–23:00** auffällig viele Bons mit Positionen der
  **Menge 0**, alle mit **Zahlart bar** (ein Schild „Kartenzahlung gestört“ hing am Wagen). Die Schicht hatte Helferin
  **„Nora Falter“, HelferNr 23, Jahrgang 1988**, gemeldet über den TuS Weserstedt.
- **Auflösung der Teilakte:** Kaffee ausgegeben, bar kassiert, mit Menge 0 gebucht – die Kasse „rechnet richtig“, aber das
  Geld ist weg. Die Listenpreise aller Positionen mit Menge 0 in dieser Schicht ergeben zusammen genau 312,50 €. Zählt man
  Positionen, sieht man das Problem; summiert man Mengen, sieht man nichts (COUNT ↔ SUM, P4).
- **Beweisstück 3 – Kassenbon:** Polaroid eines zerknitterten Bons: „Kaffeemobil · 29.08. · 22:41 · Kaffee 0 × 2,50 € ·
  Summe 0,00 € · bar · Bediener 23“. Auf der Rückseite, halb sichtbar, ein gestempelter Nachtfalter.
- **Steckbrief danach:** **Jahrgang 1988 bestätigt** (zweite, unabhängige Quelle) · arbeitet spät/nachts · **kennt
  Kassensysteme** · Verbindung zum TuS Weserstedt.

### 4.4 Akte 4 – Chaos im Vereinsarchiv (DB `TuS`)

- **Auftrag:** Wiebke Lüttjohann will wissen, warum die Beitragsliste nie stimmt.
- **Ausgangslage:** Der TuS führt alles in einer Rohliste (`MitgliederlisteRoh`): Mitglieder, Abteilungen („Fußball,
  Tennis“ in einer Zelle), Trainer mit Telefonnummer, Beitragsgruppe, Monatsbeitrag, Halle mit Adresse.
- **Spur:** Seit der Beitragserhöhung für Erwachsene (12,00 € → 14,00 €) stehen in der Liste beide Beträge. Zwischen ihnen
  fällt ein Eintrag kaum auf: **„Nora Falter“, Tischtennis, Erwachsene, Monatsbeitrag 0,00 €** (Geburtsjahr leer). Ein paar
  Zeilen weiter steht ein echtes Mitglied: **Merle Falkenrath, Geburtsjahr 1988, Tischtennis** – das fällt erst in Akte 6
  auf.
- **Auflösung der Teilakte:** Das Phantom hat eine **Änderungsanomalie** ausgenutzt: Weil der Monatsbeitrag redundant in
  jeder Zeile steht, waren die Werte ohnehin widersprüchlich, und ein weiterer falscher Wert ging unter. Die Zerlegung in
  redundanzfreie Tabellen (Beitrag nur noch in `Beitragsgruppe`) macht solche Manipulationen sichtbar.
- **Beweisstück 4 – Vereinsausweis:** Polaroid eines laminierten TuS-Mitgliedsausweises: „TuS Weserstedt · Nora Falter ·
  Abteilung Tischtennis · Beitrag: 0,00 €“; dort, wo das Foto sein sollte, ein gezeichneter Nachtfalter.
- **Steckbrief danach:** spielt **Tischtennis** beim TuS · nutzt Schwächen schlecht gebauter Listen · „Nora Falter“ ist
  ein **Tarnname** – im Verein kennt sie niemand.

### 4.5 Akte 5 – Der Bauplan (DB `Detektei`, nur eA)

- **Auftrag:** Die Pinnwand ist voll – die Detektei braucht eine eigene Fall-Datenbank.
- **Ausgangslage:** Vier Fälle, viele Personen, Orte, Aussagen und Beweisstücke, verbunden durch rote Wollfäden. Juri hat
  „schon mal angefangen“ (14 Entitätstypen, keine Kardinalität).
- **Spur:** Nach Architekturwettbewerb und Überführung entsteht die Referenz-Datenbank. In `verdaechtig` ist **Person
  „Nora Falter“ in den Fällen 1–4** erfasst; über die rekursive Beziehung `kennt` ist sie mit Menschen an allen vier
  Tatorten verbunden (u. a. Gesa Ohlendiek, Selin Aksoy, Bekannte bei StadtRad und im TuS).
- **Auflösung der Teilakte:** Nora Falter ist die **einzige** Person, die in allen vier Fällen verdächtig ist. Ihr Netzwerk
  reicht bis in die Stadtverwaltung – sie ist eine Insiderin. Aber laut Bürgermeisterin ist in Weserstedt keine Nora
  Falter gemeldet.
- **Beweisstück 5 – Ermittlungsnetz:** Polaroid der Pinnwand von schräg oben: vier Fallkarten (Fundbüro, Räder,
  Stadtfest, Verein), von jeder führt ein roter Faden zu einer Karteikarte in der Mitte mit „N. F.?“; daneben ein
  ausgedrucktes ER-Diagramm mit der Raute *kennt*, die sich an *Person* zurückschlingt.
- **Steckbrief danach:** **Netzwerk:** einzige Verdächtige in allen vier Fällen · kennt Menschen an jedem Tatort · Insiderin
  der Stadtverwaltung · in Weserstedt nicht gemeldet.
- **gA-Pfad:** Akte 5 entfällt; der Steckbrief-Hinweis wird beim Freischalten von Akte 6 automatisch aufgedeckt, die
  Lehrkraft ergänzt im Briefing DS 12 einen Satz (siehe 5.12).

### 4.6 Akte 6 – Datenspuren (DB `Datenspuren`, auch `StadtRad`, `Stadtfest`)

- **Auftrag:** Bürgermeisterin Annegret Vollmers will das Phantom gefunden wissen und überlässt der Detektei pseudonyme
  Datenexporte: `RadExport`, `FestZahlung`, `VereinExport`, `AppCheckin` (WeserApp) und einen Auszug aus dem
  Einwohnerverzeichnis (`Einwohner`).
- **Ausgangslage:** Keine Namen in den Exporten, nur Tokens – aber Jahrgang, Stadtteil, Tarif, Abteilung und Zeitstempel.
- **Spur:** Schlussplädoyer (Abschnitt 7): Jahrgang 1988 + Hafenviertel lässt wenige Kandidaten, die zeitliche Korrelation
  der Spuren führt zu einem Gerät, und dessen nächtliche Check-ins an der Wohnadresse ‚Kranstraße 7‘ lassen nur eine
  Person übrig (Standortdaten verraten die Wohnung).
- **Auflösung:** **Merle Falkenrath**. Wendung: Die Detektei hat genau das getan, was das Phantom anprangert.
- **Beweisstück 6 – Steckbrief:** Polaroid des vollständig ausgefüllten Steckbriefs; im Namensfeld „Merle Falkenrath“,
  darunter Eddas Notiz: „Und was sagt das über uns?“ Am Rand klebt der braune Umschlag mit dem Nachtfalter.
- **Steckbrief danach:** **Name: Merle Falkenrath** · ehemalige Datenschutzbeauftragte der Stadt · Motiv: zeigen, wie
  gläsern die Stadt ihre Bürger macht.

### 4.7 Akte 7 – Generalprobe

- **Auftrag:** Die Ermittlerprüfung im Abitur-Format (eA 30 BE, gA 25 BE), anschließend Peer-Korrektur und Fallen-Check.
- **Ausgangslage / Spur:** keine Story-Spur; die Prüfung nutzt einen neuen, nüchternen Kontext (Mensa-Vorbestellsystem).
- **Beweisstück 7 – Detektei-Lizenz:** die Urkunde (Abschnitt 10). Als Polaroid: die Lizenz auf Eddas Schreibtisch, daneben
  der Stempel „GELÖST“ und eine leere Teetasse.
- **Steckbrief danach:** Stempel quer über den Steckbrief: **„FALL ABGESCHLOSSEN“**.

### 4.8 Steckbrief im Überblick

| Feld | A1 | A2 | A3 | A4 | A5 | A6 |
|---|---|---|---|---|---|---|
| Signatur / Initialen | Nachtfalter, „N. F.“ | | | | | |
| Tarnname | | „Nora Falter“ | | Tarnname bestätigt | nicht gemeldet | |
| Jahrgang | | 1988 (unbestätigt) | 1988 bestätigt | | | |
| Wohnort | | Hafenviertel (unbestätigt) | | | | Hafenviertel bestätigt |
| Gewohnheiten / Fähigkeiten | Zugriff auf Stadtdaten | nachts unterwegs | arbeitet nachts, kennt Kassen | Tischtennis; kennt Schwächen von Listen | | |
| Netzwerk | | | TuS | TuS | an allen Tatorten, Insiderin | |
| Name / Motiv | | | | | | Merle Falkenrath, ehem. Datenschutzbeauftragte |

---

## 5. Briefings je Doppelstunde

Je DS: **(a)** Lab-Briefing (max. 3 Sätze, „du“) · **(b)** Präsentations-Briefing (5–8 Sätze, „ihr“, wird zum Einstieg
vorgelesen) · **(c)** Abschluss-Satz der Fallbesprechung (Cliffhanger).

### 5.1 DS 1 · Ermittlung 1.1 „Der erste Auftrag“

**(a) Lab:** Willkommen in der Datendetektei! Das Fundbüro hat uns sein Fundbuch geschickt – eine Tabelle mit allen
Fundsachen. Lerne, sie mit SELECT, WHERE und ORDER BY gezielt zu befragen.

**(b) Präsentation:** Moin, Ermittlerteam – ich bin Edda Lorenz, 31 Jahre Kriminalpolizei und ab heute eure Chefin. Die
Datendetektei Weserstedt hat ihren ersten Auftrag: Gesa Ohlendiek vom Fundbüro bittet uns, ihr Fundbuch zu prüfen, weil
dort „etwas nicht stimmt“. In der Stadt reden die Leute seit Wochen über kleine gezeichnete Nachtfalter an merkwürdigen
Orten, und der *Weserstedter Tageblatt* nennt den Unbekannten schon „das Phantom“. Ob das zusammenhängt, weiß ich nicht –
und Raten ist in diesem Haus verboten. Bevor wir suchen, lernen wir lesen: Das Fundbuch ist eine Tabelle, jede Zeile ein
Datensatz, jede Spalte ein Attribut, und die FundNr ist der Primärschlüssel. Gleich bekommt jede und jeder von euch eine
Karteikarte, denn heute seid ihr selbst die Datensätze. Eure Detektei-Ausweise holt ihr euch über das Portal – damit
meldet ihr euch im Lab an.

**(c) Abschluss:** Kurz vor Feierabend ruft Gesa Ohlendiek noch einmal an: „Laut Fundbuch wurde etwas Wertvolles
abgeholt – aber in meinem Ausgabebuch steht keine Unterschrift.“

### 5.2 DS 2 · Ermittlung 1.2 „Das verschwundene Fundstück“

**(a) Lab:** Frau Ohlendiek erinnert sich nur an Bruchstücke: etwas aus Messing, im Sommer gefunden, ziemlich wertvoll.
Kreise das Fundstück mit LIKE, BETWEEN, IN und IS NULL Schritt für Schritt ein. Text und Datum gehören in Hochkommata!

**(b) Präsentation:** Gesa Ohlendiek hat uns ihre Notizen gegeben, und sie sind – freundlich gesagt – lückenhaft:
„irgendwas mit Messing“, „Juni oder Juli“, „mehrere hundert Euro“. Mit einem einfachen Gleichheitszeichen kommen wir da
nicht weit; wir brauchen Werkzeuge für ungefähre Angaben: LIKE für Textmuster, BETWEEN für Zeiträume, IN für Wertelisten.
Und wir müssen mit Lücken umgehen: Wo im Fundbuch nichts steht, steht NULL, und NULL prüft man mit IS NULL. Merkt euch:
Text gehört in einfache Hochkommata, ein Datum schreibt man als 'JJJJ-MM-TT', und „ungleich“ heißt im Abitur `!=`. Im Lab
kreist ihr das Fundstück mit einer Kette aus drei Abfragen ein. Wer fertig ist, stellt sich dem ersten Verhör – meinem
Test, ob ihr das auch in einem fremden Archiv könnt.

**(c) Abschluss:** Im Feld Finder steht „N. Falter“ – sprecht es einmal schnell aus, dann wisst ihr, wer im Fundbuch war:
das Phantom mit dem Nachtfalter.

### 5.3 DS 3 · Ermittlung 2.1 „Der rote Faden“

**(a) Lab:** StadtRad Weserstedt vermisst fünf Lastenräder, und die Antwort steckt in mehreren Tabellen zugleich.
Verbinde Tabellen über Fremdschlüssel mit FROM … WHERE und prüfe im Spurenbrett, welche Fäden übrig bleiben. Vorsicht:
Ohne Verbundbedingung bekommst du jede Zeile mit jeder!

**(b) Präsentation:** Neuer Auftrag: Bent Hollwedel, Betriebsleiter von StadtRad Weserstedt, vermisst fünf Lastenräder,
die nachts einfach verschwunden sind. Seine Daten liegen nicht in einer Tabelle, sondern in mehreren: Stationen, Räder,
Kundschaft, Ausleihen. Verbunden sind sie über Fremdschlüssel – Attribute, die auf den Primärschlüssel einer anderen
Tabelle verweisen. In der Kurzschreibweise unterstreichen wir den Primärschlüssel und setzen vor jeden Fremdschlüssel
einen Pfeil nach oben. Achtung, Falle: Ein Fremdschlüssel muss nicht so heißen wie das, worauf er zeigt – StartStation
zeigt auf Station.StationID. Gleich legen wir mit Wollfäden jede Rad-Karte zu jeder Stations-Karte und schneiden dann
alles ab, was nicht passt. Genau das macht ein Verbund: erst alle Kombinationen, dann die Bedingung.

**(c) Abschluss:** Fünf Ausleihen, alle gestartet an der Station Hafenkante, alle mitten in der Nacht – und bei keiner
steht eine Ende-Zeit.

### 5.4 DS 4 · Ermittlung 2.2 „Nachtfahrten“

**(a) Lab:** Fünf Ausleihen ohne Ende – jetzt willst du wissen, wer sie gestartet hat. Plane deinen Weg durchs Schema über
drei oder vier Tabellen und nutze Tabellenaliase, wenn du eine Tabelle zweimal brauchst. Laufende Ausleihen findest du
mit IS NULL.

**(b) Präsentation:** Bent Hollwedel war heute Morgen hier, sichtlich nervös: Die Räder sind weiter verschwunden, und die
Versicherung stellt Fragen. Wir wissen, wo die Fahrten begannen, aber nicht, wer sie gestartet hat. Dafür planen wir einen
Ermittlungsweg durchs Schema: von der Ausleihe zum Kunden, zum Rad und zur Station. Die Ausleihe hat sogar zwei
Fremdschlüssel auf dieselbe Tabelle, StartStation und ZielStation, deshalb holen wir Station zweimal – mit zwei
verschiedenen Aliasen. Und weil diese Fahrten nie beendet wurden, ist Ende leer: Wir suchen mit `Ende IS NULL`.
Überlegt genau, was mit einer nie beendeten Fahrt passiert, wenn ihr ihre Zielstation verbinden wollt. Skizziert den Weg
zuerst auf Papier, dann tippt ihr – und danach wartet das zweite Verhör.

**(c) Abschluss:** Das Kundenkonto 77 gehört einer „Nora Falter“, Jahrgang 1988 – N. F. wie im Fundbuch –, und während wir
noch staunen, meldet der Festausschuss: In der Stadtfest-Kasse fehlen 312,50 €.

### 5.5 DS 5 · Ermittlung 3.1 „Kassensturz“

**(a) Lab:** In der Stadtfest-Kasse fehlen 312,50 €, und der Festausschuss braucht Zahlen statt Zeilen. Nutze COUNT, SUM,
AVG, MIN und MAX und gruppiere mit GROUP BY. Denk dran: Bons zählen ist nicht dasselbe wie Mengen summieren!

**(b) Präsentation:** Frauke Melchers, Kassenwartin des Festausschusses, hat uns alle Kassendaten des Stadtfests gebracht –
und eine Zahl: 312,50 € Fehlbetrag. Die Datenbank ist groß: Stände, Helferinnen und Helfer, Schichten, Produkte, Bons und
Positionen. Einzelne Zeilen anzuschauen bringt hier nichts; wir müssen verdichten, also zählen, summieren und Durchschnitte
bilden. Dafür gibt es Aggregatfunktionen, und mit GROUP BY bilden wir Gruppen, zum Beispiel je Stand. Es gibt eine eiserne
Regel: Jede Spalte im SELECT ist entweder aggregiert oder steht im GROUP BY. Und gruppiert nach dem Schlüssel, nicht nach
dem Namen – beim Stadtfest halfen zwei Menschen mit genau demselben Namen. Gleich sortiert ihr euch selbst in Fächer: Ihr
seid die Datensätze, und ein paar von euch zählen oder summieren.

**(c) Abschluss:** Am Kaffeemobil gibt es Bons voller Positionen – aber auffällig viele davon mit der Menge 0.

### 5.6 DS 6 · Ermittlung 3.2 „Die Statistik lügt nicht“

**(a) Lab:** Finde heraus, wann und bei wem am Kaffeemobil die Positionen mit Menge 0 entstanden sind. Filtere Zeilen mit
WHERE und Gruppen mit HAVING, und schau in der Zeitlupe nach, wenn eine Summe plötzlich zu groß wird. Am Ende beschreibst
du dein Vorgehen in Worten – wie im Abitur.

**(b) Präsentation:** Die Bons mit Menge 0 lassen mir keine Ruhe. Stellt euch vor: Jemand bekommt einen Kaffee, zahlt bar,
und die Kasse bucht nichts – so verschwindet Geld, ohne dass die Kasse falsch rechnet. Wir müssen wissen, wann und bei
wem: Dazu gruppieren wir, filtern Gruppen mit HAVING und verbinden Bons mit Schichten. Vorsicht beim Verbinden: Wer Bons,
Positionen und Schichten in einen Topf wirft, kann Zeilen vervielfachen, und dann lügt die Statistik eben doch. Die
Zeitlupe zeigt euch, in welcher Reihenfolge die Datenbank eine Abfrage wirklich abarbeitet: FROM, WHERE, GROUP BY,
HAVING, SELECT, ORDER BY, LIMIT. Weil im Abitur gern eine fertige Abfrage vorgelegt wird, übt ihr heute auch, eine
Abfrage im Sachzusammenhang zu analysieren. Danach wartet das dritte Verhör.

**(c) Abschluss:** Die Schicht von 22 bis 23 Uhr am Kaffeemobil hatte Helferin Nr. 23 – Nora Falter, Jahrgang 1988,
gemeldet über den TuS Weserstedt –, und beim TuS stimmt seit Monaten die Beitragsliste nicht.

### 5.7 DS 7 · Ermittlung 4.1 „Die Excel-Liste“

**(a) Lab:** Der TuS Weserstedt führt alle Mitglieder in einer einzigen großen Liste – und genau dort hat sich das Phantom
versteckt. Suche Redundanzen und zeige Einfüge-, Änderungs- und Löschanomalie immer an einem konkreten Datensatz. Im
Anomalie-Simulator führst du Änderungen genau so aus, wie die Liste es zulässt.

**(b) Präsentation:** Wiebke Lüttjohann, Kassenwartin des TuS Weserstedt, ist verzweifelt: Ihre Beitragsliste ergibt jeden
Monat eine andere Summe. Der Verein führt alles in einer einzigen Liste – Mitglieder, Abteilungen, Trainer,
Telefonnummern, Beiträge, Hallen. Juri findet das „voll praktisch, alles auf einen Blick“. Praktisch, bis sich etwas
ändert: Dieselbe Information steht dutzendfach in der Liste, und das nennt man Redundanz. Redundanz führt zu Anomalien –
beim Einfügen, beim Ändern und beim Löschen. Im Abitur reicht es nie, eine Anomalie zu benennen; ihr müsst sie an einem
konkreten Datensatz erläutern. Gleich pflegen eure Teams parallel dieselbe Papierliste, und wir schauen, wie lange sie
sich nicht widerspricht.

**(c) Abschluss:** Mitten in der Liste steht „Nora Falter, Tischtennis, Monatsbeitrag 0,00 €“ – und niemand in der
Tischtennis-Abteilung hat sie je gesehen.

### 5.8 DS 8 · Ermittlung 4.2 „Ordnung ins Archiv“

**(a) Lab:** Jetzt räumst du das Vereinsarchiv auf: Beurteile Schlüssel und zerlege die Rohliste verlustfrei in
redundanzfreie Tabellen. Schließe nie aus einem kleinen Datenausschnitt, dass ein Attribut eindeutig ist. Im
Zerlegungs-Puzzle siehst du sofort, wo noch Redundanz steckt.

**(b) Präsentation:** Wir wissen jetzt, wie das Phantom es gemacht hat. Als der Beitrag für Erwachsene von 12 auf 14 Euro
stieg, musste der neue Betrag in jeder einzelnen Zeile geändert werden, und in einigen Zeilen blieb der alte Wert stehen.
Zwischen 12,00 € und 14,00 € fiel ein Eintrag mit 0,00 € schlicht nicht mehr auf: Das Phantom hat eine Änderungsanomalie
ausgenutzt. Heute sorgen wir dafür, dass so etwas nicht wieder passiert. Dazu brauchen wir gute Primärschlüssel –
eindeutig, nie NULL, minimal, und zwar für alle denkbaren Daten, nicht nur für die zehn Zeilen, die man gerade sieht. Dann
zerlegen wir die Liste so, dass jede Information nur noch einmal gespeichert ist und trotzdem nichts verloren geht. Wer
mehr will, lernt in der Kür die Normalformen als Prüfwerkzeug kennen; für alle wartet das vierte Verhör.

**(c) Abschluss:** Vier Akten, viermal N. F. – Edda räumt die halbe Pinnwand frei und sagt: „Mit Zetteln kommen wir nicht
weiter, wir brauchen eine eigene Datenbank.“

### 5.9 DS 9 · Ermittlung 5.1 „Baupläne lesen“ (eA)

**(a) Lab:** Bevor die Detektei ihre eigene Datenbank baut, lernst du, Baupläne zu lesen: ER-Diagramme in Chen-Notation.
Bestimme Kardinalitäten und begründe sie, auch aus echten Tabellendaten. Achte auf die unterstrichenen
Schlüsselattribute!

**(b) Präsentation:** Unsere Pinnwand ist voll, und Juri hat die rote Wolle aufgebraucht. Bevor wir eine Datenbank bauen,
brauchen wir einen Bauplan, und Baupläne für Datenbanken heißen ER-Diagramme. Ich habe euch einen alten Plan aus dem
Polizeiarchiv mitgebracht: Rechtecke sind Entitätstypen, Rauten Beziehungstypen, Ellipsen Attribute, und unterstrichen
sind die Schlüsselattribute. An den Kanten steht die Kardinalität: 1, n oder m. Eine Kardinalität rät man nicht, man
begründet sie – kann ein Fall mehrere Beweisstücke haben, kann ein Beweisstück zu mehreren Fällen gehören? Auch
Beziehungstypen können Attribute haben, etwa den Grad, wie verdächtig eine Person in einem Fall ist. Gleich verbindet ihr
Rollenkarten mit Fäden und lest die Kardinalität einfach ab.

**(c) Abschluss:** Juri hat schon mal angefangen, den Bauplan der Detektei zu zeichnen – mit vierzehn Entitätstypen und
keiner einzigen Kardinalität.

### 5.10 DS 10 · Ermittlung 5.2 „Der Architekturwettbewerb“ (eA)

**(a) Lab:** Die Detektei braucht einen Bauplan für ihre Fall-Datenbank – entwickle ihn aus dem Anforderungstext. Denk an
rekursive Beziehungen wie „Person kennt Person“ und an mehrere Beziehungen zwischen denselben Entitätstypen. Der
Bauplan-Tisch zeigt dir, welche Kriterien du schon erfüllst.

**(b) Präsentation:** Heute ist Architekturwettbewerb: Jedes Team entwirft den Bauplan für die Fall-Datenbank der
Detektei. Die Anforderungen hängen an der Tafel: Ermittler leiten Fälle, erfahrene Ermittler betreuen neue, Personen sind
in Fällen verdächtig, Personen kennen andere Personen, und eine Aussage macht eine Person in einem Fall an einem Ort. Da
stecken Fallstricke drin: Eine Beziehung kann einen Entitätstyp mit sich selbst verbinden – das ist eine rekursive
Beziehung. Zwischen denselben Entitätstypen kann es mehrere Beziehungen mit verschiedenen Rollen geben, und manche
Beziehungen verbinden sogar drei Entitätstypen. Nicht alles lässt sich mit 1, n und m ausdrücken; „genau drei Zeugen“
zum Beispiel nicht. Am Ende geht ihr auf Galerie-Rundgang und bewertet die anderen Entwürfe mit dem Bewertungsbogen.
Der Siegerentwurf bekommt einen Ehrenplatz an der Pinnwand.

**(c) Abschluss:** Der Siegerentwurf kommt auf den Bauplan-Tisch, und Edda sagt nur: „Schön – nächste Stunde wird daraus
eine echte Datenbank, und dann fragen wir sie, wer Nora Falter kennt.“

### 5.11 DS 11 · Ermittlung 5.3 „Vom Plan zur Datenbank“ (eA)

**(a) Lab:** Jetzt wird aus dem Bauplan eine Datenbank: Überführe das ER-Modell nach den Regeln in ein Relationenschema
und begründe jede Entscheidung. In der Schema-Werkbank setzt du Primärschlüssel und ↑Fremdschlüssel. Danach befragst du
die fertige Fall-Datenbank mit SQL.

**(b) Präsentation:** Ein Bauplan ist schön, aber ermitteln können wir nur mit Tabellen. Für die Überführung gibt es klare
Regeln: Jeder Entitätstyp wird eine Tabelle, bei 1:n wandert der Fremdschlüssel auf die n-Seite, und eine n:m-Beziehung
bekommt eine eigene Tabelle mit zusammengesetztem Schlüssel. Bei einer rekursiven Beziehung zeigt der Fremdschlüssel auf
die eigene Tabelle – oder es entsteht eine Beziehungstabelle mit zwei Fremdschlüsseln auf dieselbe Tabelle, wie bei
`kennt`. Im Abitur reicht die Umsetzung nicht, ihr müsst sie begründen: Warum bekommt n:m eine eigene Tabelle und 1:n
nicht? Manchmal geht es auch rückwärts, und ihr rekonstruiert aus einem Schema das ER-Diagramm. Wenn das Schema steht,
füllt Juri die Referenz-Datenbank mit allem, was wir bisher wissen. Dann stellen wir ihr die entscheidende Frage: Wer ist
in allen vier Fällen verdächtig, und wen kennt diese Person?

**(c) Abschluss:** Die Antwort ist eindeutig – Nora Falter, verdächtig in allen vier Fällen, mit Bekannten an jedem
Tatort –, doch die Bürgermeisterin lässt ausrichten: Eine Nora Falter ist in Weserstedt nicht gemeldet.

### 5.12 DS 12 · Ermittlung 6.1 „Das Phantom“

**(a) Lab:** Die Stadt hat der Detektei pseudonyme Datenexporte überlassen – ohne Namen, aber mit Jahrgang, Stadtteil und
Zeitstempeln. Verknüpfe die Spuren im Schlussplädoyer Schritt für Schritt, bis nur noch eine Person übrig bleibt. Und dann
frag dich, ob wir das hätten tun dürfen.

**(b) Präsentation:** Nora Falter existiert nicht – sie ist ein Tarnname. Bürgermeisterin Annegret Vollmers hat uns deshalb
Datenexporte der Stadt überlassen: StadtRad-Fahrten, Kartenzahlungen vom Stadtfest, einen Export der TuS-Mitgliederliste,
Check-ins der WeserApp und einen Auszug aus dem Einwohnerverzeichnis. In den Exporten stehen keine Namen, nur Kürzel – man
nennt das pseudonym. Aber es stehen Jahrgang, Stadtteil, Tarif und Uhrzeiten darin, und solche Angaben können zusammen
einen Menschen genauso verraten wie ein Name: Man nennt sie Quasi-Identifikatoren. Heute verknüpft ihr diese Spuren mit
Verbund und GROUP BY im Schlussplädoyer. Wenn wir das Phantom haben, setzen wir uns zusammen und reden darüber, was wir da
eigentlich getan haben. Ich sage euch gleich: Diese Frage wird unbequemer als jede Abfrage.

*gA-Ergänzung (Lehrkraft, vor Satz 1):* „Unsere Fall-Datenbank zeigt: Nur eine Person ist in allen vier Fällen
verdächtig – Nora Falter.“

**(c) Abschluss:** Edda legt den fertigen Steckbrief auf den Tisch, daneben eure Ausweise: „Der Fall ist gelöst – jetzt
will ich sehen, ob ihr auch Fälle lösen könnt, die ihr noch nicht kennt.“

### 5.13 DS 13 · „Die Ermittlerprüfung“

**(a) Lab:** Heute ist Ermittlerprüfung: eine Aufgabe im Abitur-Format, ohne Story und ohne Tipps. Lies die Operatoren
genau und behalte die Zeit im Blick. Danach wird nach Kernpunkten korrigiert – und es gibt Lizenzen.

**(b) Präsentation:** Sechs Akten, ein Phantom, eine unbequeme Debatte – ihr habt viel ermittelt. Heute zeigt ihr, dass ihr
das auch ohne mich könnt: Die Ermittlerprüfung ist eine Aufgabe im Abitur-Format, in einem Kontext, den ihr noch nie
gesehen habt. Dort gibt es keine Akten und keine Nachtfalter, sondern Operatoren, Bewertungseinheiten und eine Uhr. Lest
jeden Operator genau: „Erläutern“ heißt nicht „nennen“, und „analysieren“ heißt im Sachzusammenhang. Danach korrigiert
ihr euch gegenseitig nach dem Erwartungshorizont und prüft eure Lösungen gegen die zehn Fallen. Zum Schluss schreibe ich
eure Ränge fest und unterschreibe die Lizenzen. Viel Erfolg – und denkt an die Klammern.

**(c) Abschluss:** Edda hängt das letzte Polaroid an die Pinnwand – eure Detektei-Lizenz – und dreht das Schild an der Tür
um: „Geschlossen. Bis zum nächsten Fall.“

### 5.14 K1 · „Eigene Datenbank bauen“ (Kür, nach DS 11)

**(a) Lab:** Kür! Hier baust du deine eigene kleine Datenbank, fügst Datensätze ein und erlebst, wie die Datenbank falsche
Fremdschlüssel abweist. Alles hier ist ausdrücklich **nicht im Abitur** – eine Spielwiese für Neugierige.

**(b) Präsentation:** Juri ist begeistert: „Ich will die Fall-Datenbank selbst bauen, nicht nur benutzen!“ Heute dürft ihr
das auch: Mit CREATE TABLE legt ihr Tabellen an, und mit PRIMARY KEY und FOREIGN KEY sagt ihr der Datenbank, was ein
Schlüssel ist. Mit INSERT füllt ihr sie – und wenn ihr eine Aussage zu einem Fall eintragt, den es gar nicht gibt,
schlägt die Datenbank Alarm: Das nennt man referentielle Integrität. Zum Schluss zeige ich euch, wie Profis Verbunde oft
schreiben, mit JOIN … ON, und wie ein LEFT JOIN auch Personen ohne Fall findet. Aber merkt euch: Im Abitur schreibt ihr den
Verbund weiterhin mit FROM und WHERE. Jede und jeder bekommt eine eigene Sandbox – kaputtmachen ausdrücklich erlaubt.

**(c) Abschluss:** Mit LEFT JOIN findet Juri alle Personen, die in keinem Fall verdächtig sind – nur eine Person taucht in
jedem Fall auf, und bald wissen wir, wer sich hinter ihr verbirgt.

### 5.15 K2 · „Escape Room Weserstedt“ (Kür, vor DS 13)

**(a) Lab:** Escape Room! Juri hat den Tresor mit den Detektei-Lizenzen verschlossen und die Codes in den Datenbanken
versteckt. Löse mit deinem Team Station für Station – jede richtige Lösung öffnet das nächste Schloss.

**(b) Präsentation:** Ich habe eine schlechte und eine gute Nachricht. Die schlechte: Juri hat die Zahlenschlösser am Tresor
neu eingestellt, in dem eure Detektei-Lizenzen liegen, und die Codes „besonders sicher“ in unseren Datenbanken versteckt.
Die gute: Wer alle Akten verstanden hat, findet sie wieder. Es gibt sechs Stationen, vom Fundbüro bis zu den Datenspuren,
und jede liefert einen Code für das nächste Schloss. Die Codes entstehen aus euren Ergebnissen – wer falsch abfragt,
bekommt einen falschen Code. Der Beamer zeigt, welches Team wie weit ist; Punkte fürs Lab gibt es heute nicht, nur Ruhm.
Und Juri bekommt anschließend eine kleine Schulung in Datensicherheit.

**(c) Abschluss:** Der Tresor ist offen, die Lizenzen liegen bereit – aber Edda schließt die Tür wieder: „Erst die
Prüfung.“

---

## 6. Verhöre V1–V7

Verhöre sind **nüchtern im Abitur-Stil**: gesiezt, Operatoren, `[x BE]`, neuer Kontext (Transfer), Abimodus `streng`,
kein Feedback während des Verhörs. Die Story erscheint nur im **Rahmensatz** auf der Startkarte des Verhörs (geduzt) und
im Beweisstück danach. Timer: V1–V5 20 min, V6 15 min, V7 30 min.

| Verhör | Rahmensatz (Story, geduzt) | Transfer-Kontext (nüchtern) | Beispiel für den Aufgabenton | Beweisstück |
|---|---|---|---|---|
| **V1** (Akte 1) | „Bevor ich dich allein an das Fundbuch lasse, prüfe ich, ob du auch in einem fremden Archiv sauber abfragst.“ | **Stadtbibliothek**: Medienbestand in einer Tabelle (Titel, Medienart, Erscheinungsjahr, Standort, Ausleihstatus). Schwerpunkt SELECT/WHERE, LIKE, BETWEEN, IN, IS NULL, ORDER BY, LIMIT, Ergebnis angeben. | „Entwerfen Sie eine SQL-Abfrage, die alle Medien der Medienart 'Hörbuch' ausgibt, die nach 2015 erschienen sind, absteigend sortiert nach Erscheinungsjahr. [2 BE]“ | Fundbuch-Seite |
| **V2** (Akte 2) | „Wer Räder verfolgen kann, kann auch Busse verfolgen – zeig es mir.“ | **Bürgerbus**: Fahrten, Haltestellen (Start- und Zielhaltestelle als zwei Fremdschlüssel), Fahrerinnen und Fahrer, Fahrzeuge. Schwerpunkt Kurzschreibweise, Verbund über 2–4 Tabellen, Tabellenalias, IS NULL. | „Erläutern Sie die Kennzeichnungen im gegebenen Relationenschema. [3 BE]“ | Schloss-Code |
| **V3** (Akte 3) | „Kassen lügen nicht, aber Abfragen manchmal – beweis mir, dass deine es nicht tun.“ | **Schulkiosk**: Verkäufe, Produkte, Verkaufsschichten. Schwerpunkt Aggregatfunktionen, GROUP-BY-Regel, HAVING vs. WHERE, LIMIT, Abfrage im Sachzusammenhang analysieren, Vorgehen in Worten. | „Analysieren Sie die gegebene SQL-Abfrage und beschreiben Sie, welche Informationen sie im Sachzusammenhang liefert. [4 BE]“ | Kassenbon |
| **V4** (Akte 4) | „Listen wie die vom TuS gibt es überall – zeig mir, dass du ihre Schwachstellen findest.“ | **Musikschule (Rohliste)**: Schülerinnen und Schüler, Instrumente, Lehrkräfte mit Telefonnummer, Unterrichtsräume, Gebühren in einer Tabelle. Schwerpunkt Redundanz, Anomalien am Datensatz, Schlüssel beurteilen (Ausschnitt-Falle), verlustfreie Zerlegung (eA). | „Erläutern Sie an einem Beispiel aus der Tabelle eine Änderungsanomalie. [3 BE]“ | Vereinsausweis |
| **V5** (Akte 5, eA) | „Ein Bauplan, den du nicht selbst gezeichnet hast – lies ihn, erweitere ihn, bau ihn um.“ | **Kletterhalle (ER)**: Mitglieder, Kurse, Trainerinnen und Trainer, Routen; Beziehungsattribute, rekursive Beziehung (Trainer bildet Trainer aus), Überführung, Rückrichtung Schema → ER. | „Erweitern Sie das ER-Diagramm so, dass erfasst werden kann, welche Mitglieder welche Routen an welchem Datum geklettert sind. Begründen Sie die gewählten Kardinalitäten. [5 BE]“ | Ermittlungsnetz |
| **V6** (Akte 6) | „Du weißt jetzt, wie leicht man Menschen in Daten findet – zeig mir, dass du weißt, wann man es nicht darf.“ | **Fitness-App (Datenschutz)**: Puls- und Trainingsdaten (Gesundheitsdaten als besondere Kategorie), Weitergabe an Werbepartner, Pseudonymisierung, Quasi-Identifikatoren, DSGVO-Grundsätze. | „Beurteilen Sie, ob der Anbieter die Trainingsdaten ohne weitere Einwilligung an eine Versicherung weitergeben darf. [4 BE]“ | Steckbrief |
| **V7** (Akte 7) | „Letzte Probe vor der Lizenz: ein ganzer Fall, ohne mich.“ | **Mensa-Vorbestellsystem** (Lab-Generalprobe, Abi-Mix): Schlüssel/Anomalien, ER (eA), SQL entwerfen und analysieren. | „Entwerfen Sie eine SQL-Abfrage, die für jedes Gericht die Anzahl der Vorbestellungen ausgibt … [3 BE]“ | Detektei-Lizenz (mit Urkunde in DS 13) |

---

## 7. Schlussplädoyer (Akte 6)

Abfolge von sechs `sql`-Aufgaben in der Ermittlungskonsole auf der DB `Datenspuren`. Jede Stufe liefert ein Indiz, das auf
der Pinnwand als Karteikarte erscheint. Die Abfrage-Ideen sind hier **nur verbal** und EH-§8-konform beschrieben (impliziter
Verbund über FROM/WHERE, keine Unterabfragen, kein JOIN … ON, keine Funktionen außer Aggregaten). Konkrete Tokens werden in
der DB festgelegt (Anhang A).

| # | Frage | Abfrage-Idee (verbal) | Ergebnis → Indiz |
|---|---|---|---|
| 1 | Welches Kundentoken steckt hinter den fünf Nachtfahrten? | `RadExport` filtern auf StartStation 'Hafenkante' und Start zwischen '2026-09-08 00:00' und '2026-09-12 23:59' (ein BETWEEN über den ganzen Zeitraum, Uhrzeit im Literal – P5), sortiert nach Start; **ohne** Gruppierung. | 9 Fahrten, davon **fünf mitten in der Nacht** (01–02 Uhr) unter **einem Token** (R-7F3A); im Export stehen dazu **Jahrgang 1988, Hafenviertel, Tarif Plus**. → „Das Konto ist pseudonym – aber nicht stumm.“ |
| 2 | Wie viele Menschen teilen sich diese Merkmale? | `SELECT DISTINCT KundenToken` aus `RadExport` mit Jahrgang 1988, Stadtteil 'Hafenviertel' und Tarif 'Plus'. (Gegenprobe: GROUP BY Jahrgang, Stadtteil, Tarif mit COUNT(*) zählt Fahrten, nicht Menschen – P4.) | **Nur ein einziges Token** in dieser Gruppe. → „Kleine Gruppen machen Personen erkennbar: Drei harmlose Angaben wirken wie ein Name.“ |
| 3 | Welches Gerät war zur selben Zeit am selben Ort? | Verbund `RadExport` und `AppCheckin` mit Ort = StartStation und Zeitpunkt = Start, eingeschränkt auf das Token aus Stufe 1; nach Gerät gruppieren und zählen. | **Ein Gerät** passt zu allen fünf Fahrten (die WeserApp checkt an StadtRad-Stationen automatisch ein). → „Das Token hat ein Handy – und das Handy ist überall dabei.“ |
| 4 | Wo war dieses Gerät sonst? | Nur `AppCheckin` für dieses Gerät, sortiert nach Zeitpunkt. Gegenprobe in `FestZahlung` (in der Erklärung, nicht als eigene Abfrage verlangt): Kartenzahlungen am Kaffeemobil am 2026-08-29 zwischen 22:00 und 22:59 zählen und mit der Stunde davor vergleichen. | Check-ins am **Festplatz** kurz vor 22:00 und kurz nach 23:00 am Stadtfest-Abend, am **Fundbüro** am 2026-09-14 vormittags, dienstags abends am **Vereinsheim TuS**, in den Tatnächten an der Hafenkante – und nachts an der **Kranstraße 7**. In der Schicht 22–23 Uhr: **keine einzige Kartenzahlung** am Kaffeemobil. → „Eine Person an allen vier Tatorten, zur Tatzeit.“ |
| 5 | Wer aus dem TuS passt zu diesen Merkmalen? | `VereinExport` mit Geburtsjahr 1988, Stadtteil 'Hafenviertel' und Abteilung 'Tischtennis'. | **Genau ein Mitgliedstoken** – passend zum Steckbrief (Tischtennis) und zu den Dienstagabend-Check-ins. → „Verein, Rad und Fest gehören zu derselben Person.“ |
| 6 | Wie heißt sie? | Ein Verbund `Einwohner e, AppCheckin a, RadExport r`: `a.Ort = e.Strasse`, Gerät aus Stufe 3, Token aus Stufe 1, `r.Jahrgang = e.Jahrgang` und `r.Stadtteil = e.Stadtteil`; Vor- und Nachname mit DISTINCT (ohne Zeitfilter). | Genau **Merle Falkenrath**. Ohne DISTINCT steht sie 40-mal im Ergebnis (8 nächtliche Check-ins × 5 Fahrten, P2); ohne Jahrgang/Stadtteil käme der ältere Nachbar in der Kranstraße 7 dazu. Die beiden anderen mit Jahrgang 1988 im Hafenviertel – **Ole Brakhage** und **Tamara Leversen** – wohnen woanders (Erklärung). Eine „Nora Falter“ gibt es im Verzeichnis nicht. → **Name gefunden.** |

**Lehrkraft-Hinweis:** Stufe 6 zeigt bewusst, dass zwei Unbeteiligte kurz verdächtig waren, nur weil sie im selben
Stadtteil wohnen und im selben Jahr geboren sind (in der Plattform in der Erklärung zu A6-E1-14 und in der Überleitung
7.2). Das ist der Einstieg in die Debatte. *Abfolge an die Blueprints DS_PLANUNG A6-E1-09…14 angeglichen (Phase 6).*

### 7.1 Auflösung (wird nach Stufe 6 eingeblendet)

Die Indizienkette ist geschlossen: Hinter Nora Falter steht Merle Falkenrath, Jahrgang 1988, wohnhaft im Hafenviertel,
Tischtennisspielerin beim TuS – und bis 2025 Datenschutzbeauftragte der Stadt Weserstedt. Erinnert ihr euch an die
Rohliste des TuS? Da stand sie, nur ein paar Zeilen unter ihrem Tarnnamen. Am Morgen nach der Enttarnung wird im
Fundbüro ein brauner Umschlag mit einem Nachtfalter darauf abgegeben. Darin liegen der Messing-Kompass, 312,50 € in bar
mit einem Zettel „für die Festkasse“, ein Beleg über die nachgezahlten Vereinsbeiträge und der Schlüssel zu Schuppen 4 am
Hafen, wo die fünf Lastenräder unbeschädigt stehen. Dazu ein Brief: Jahrelang hatte sie gewarnt, dass die Stadt zu viele
Daten zu lange speichert, dass „pseudonym“ nicht „anonym“ heißt und dass ihr alter Verwaltungszugang nie gesperrt wurde –
mit ihm hat sie den Fundbuch-Eintrag geändert und einen Abholschein gedruckt, den am Schalter niemand hinterfragte. Ihr
Gutachten verschwand in einer Schublade, also hat sie gezeigt, was sie meinte. Jede ihrer Spuren war eine absichtlich
gelegte Datenpanne, und am Ende sollte jemand die Daten verknüpfen und sie finden. Dieser Jemand waren wir. Merle
Falkenrath hat sich bei der Stadt gemeldet; was aus ihren Taten folgt, entscheiden andere, nicht die Detektei. Edda legt
den Brief auf den Tisch: „Sie hat Unrecht getan, um auf Unrecht hinzuweisen – und wir haben genau das getan, wovor sie
gewarnt hat.“

### 7.2 Überleitung zur Erörterung

Bevor ihr feiert, schaut auf das, was wir gerade getan haben: Daten, die für Fahrradverleih, Festabrechnung,
Vereinsverwaltung und eine Stadt-App erhoben wurden, haben wir für eine Fahndung zusammengeführt – als private Detektei,
ohne dass auch nur ein Mensch in Weserstedt davon wusste. Tamara Leversen und Ole Brakhage standen auf unserer
Kandidatenliste, nur weil sie 1988 geboren sind und im Hafenviertel wohnen. **Durfte die Detektei das? Was hätte die
Stadt nie speichern, nie weitergeben dürfen – und was hätte sie technisch anders machen müssen?** Darüber streiten wir
jetzt mit verteilten Rollen.

---

## 8. Debatte DS 12 „Durfte die Detektei das?“

**Ablauf (Vorschlag):** 5 Teams ziehen je eine Rollenkarte (8' Vorbereitung) → Eingangsstatements (je 1') → offene Runde
mit Moderation durch die Lehrkraft (12') → Rollen ablegen, persönliches Fazit → Erörterung auf AB 6.1 (Kernpunkte-
Selbstcheck, Freitext bleibt im Browser). Rechtliche Aussagen auf den Karten sind didaktisch vereinfacht; die Debatte
hat kein „richtiges“ Ende.

**Bezugsrahmen DSGVO (Art. 5, 6, 9):** Rechtmäßigkeit und **Rechtsgrundlage** (z. B. Einwilligung, Vertrag, gesetzliche
Aufgabe) · **Transparenz** · **Zweckbindung** · **Datenminimierung** · **Speicherbegrenzung** · Integrität und
Vertraulichkeit (Datensicherheit) · besondere Kategorien wie Gesundheitsdaten. Pseudonymisierte Daten bleiben
personenbezogen; nur wirklich anonyme Daten fallen heraus.

### Karte 1 – Stadt Weserstedt (Bürgermeisterin Annegret Vollmers)
- **Position:** Die Weitergabe war verantwortbar – die Stadt wurde geschädigt und hat nur pseudonyme Daten herausgegeben.
- **Argumente:**
  1. Alle Daten wurden rechtmäßig erhoben: Ausleihvertrag bei StadtRad, Abrechnung des Stadtfests, Vereinsverwaltung –
     es gab jeweils eine **Rechtsgrundlage**.
  2. Es wurden keine Namen weitergegeben, nur Tokens – die Stadt hat an **Datenminimierung** gedacht.
  3. Manipulationen an städtischen Daten zu stoppen liegt im öffentlichen Interesse; Bürgerinnen und Bürger erwarten
     Aufklärung.
- **Leitfrage:** Ist „Fahndung“ ein neuer Zweck, für den die Daten nie erhoben wurden (**Zweckbindung**) – und wer hätte
  über diese Weitergabe entscheiden dürfen?

### Karte 2 – Datendetektei (Edda Lorenz)
- **Position:** Wir hatten einen Auftrag und ein gutes Ziel – aber wir müssen uns fragen, ob das genügt.
- **Argumente:**
  1. Die Stadt hat uns die Daten freiwillig übergeben; wir haben nichts gehackt.
  2. Wir haben nur so viel verknüpft wie nötig und die Unbeteiligten nicht weiter verfolgt.
  3. Ohne Aufklärung hätte das Phantom womöglich weitere Datenbestände manipuliert.
- **Leitfrage:** Rechtfertigt ein richtiges Ergebnis die Methode – und darf eine private Detektei Daten verknüpfen, für die
  es keine **Rechtsgrundlage** und keine **Einwilligung** der Betroffenen gibt?

### Karte 3 – Das Phantom (Merle Falkenrath)
- **Position:** Ich habe sichtbar gemacht, was die Stadt seit Jahren ignoriert.
- **Argumente:**
  1. „Pseudonym“ ist nicht „anonym“: Jahrgang, Stadtteil und Tarif genügen, um Menschen zu erkennen – die Detektei hat es
     bewiesen.
  2. Die WeserApp speichert minutengenaue Check-ins monatelang, ohne dass es jemand weiß – Verstoß gegen **Transparenz**
     und **Speicherbegrenzung**.
  3. Mein Zugang wurde nie gesperrt; die Stadt schützt ihre Daten nicht (Datensicherheit). Ich habe nichts behalten und
     niemanden verletzt.
- **Leitfrage:** Darf man selbst Regeln brechen, um zu zeigen, dass andere Regeln gebrochen werden?

### Karte 4 – Bürgerin (Tamara Leversen, Hafenviertel, Jahrgang 1988)
- **Position:** Ich war verdächtig, ohne irgendetwas getan zu haben – und niemand hat mich gefragt.
- **Argumente:**
  1. Ich wusste nicht, dass die WeserApp an jeder StadtRad-Station automatisch eincheckt (**Transparenz**).
  2. Ich habe für Fahrrad und App eingewilligt, nicht für eine Fahndung (**Einwilligung**, **Zweckbindung**).
  3. Informationelle Selbstbestimmung heißt: Ich will wissen und mitentscheiden, wer was über mich weiß.
- **Leitfrage:** Was müsste die Stadt ändern, damit du ihr deine Daten wieder anvertraust?

### Karte 5 – Landesdatenschutzbehörde (Referent Mats Oltmanns)
- **Position:** Wir prüfen unabhängig – und sehen Probleme auf allen Seiten.
- **Argumente:**
  1. Pseudonymisierte Daten sind personenbezogen; ihre Weitergabe an eine private Stelle braucht eine **Rechtsgrundlage**,
     ein neuer Zweck muss geprüft werden.
  2. **Datenminimierung** und **Speicherbegrenzung**: Für die Verkehrsplanung reichen aggregierte Zahlen je Station und
     Stunde, keine Einzel-Check-ins mit Gerätekennung über Monate.
  3. Datensicherheit: Zugänge ehemaliger Beschäftigter sperren, Zugriffsrechte nach Rollen, Änderungen protokollieren,
     kleine Gruppen in Exporten zusammenfassen.
- **Leitfrage:** Welche technischen und organisatorischen Maßnahmen hätten alle vier Taten – und die Enttarnung – verhindert?

---

## 9. Escape Room K2 – sechs Stationen

Rahmen: Juri hat die Zahlenschlösser am Tresor der Detektei neu eingestellt und die Codes „besonders sicher“ in den
Datenbanken versteckt. Jede Station liefert bei richtiger Lösung einen **Code**, den der Server aus dem Ergebnis ableitet
(kein Code im Client, Spec 7.10); er öffnet die nächste Station. Aufgaben sind **neu** (keine Lab- oder Verhöraufgaben),
nutzen aber die Akten-Datenbanken. Keine Lab-Punkte.

| # | Station (Story) | Thema | Art der Aufgabe | Wie der Code entsteht |
|---|---|---|---|---|
| 1 | **Das Fundbuch-Schloss** – Juri hat den ersten Code „unter den Fundsachen“ versteckt. | SQL in einer Tabelle (`Fundbuero`): WHERE, LIKE, IS NULL, ORDER BY, LIMIT | `sql`: eine Frage, deren Antwort eine Anzahl von Datensätzen ist | Anzahl der Ergebniszeilen, dreistellig mit führenden Nullen |
| 2 | **Das Speichenschloss** – „Der Code steht auf dem Rad mit der teuersten Reparatur.“ | Verbund über 2–3 Tabellen (`StadtRad`), Tabellenalias | `sql`: genau ein Datensatz als Ergebnis | RadID des gefundenen Rads (vierstellig aufgefüllt) |
| 3 | **Die Geldkassette** – eine Kassette vom Stadtfest mit vierstelligem Schloss. | Aggregation, GROUP BY, HAVING (`Stadtfest`) | `sql`: Anzahl der Gruppen, die eine HAVING-Bedingung erfüllen, und Nummer der stärksten Gruppe | zwei Zahlen hintereinander (z. B. Anzahl + StandNr) |
| 4 | **Der Vereinsspind** – drei Auftragskarten kleben an der Spindtür. | Anomalien und Schlüssel (`TuS`-Rohliste) | `match`: drei Szenarien je einer Anomalieart zuordnen (1 Einfüge-, 2 Änderungs-, 3 Löschanomalie) + `choice`: geeigneter Primärschlüssel | Ziffernfolge der Zuordnung (dreistellig) plus Nummer der richtigen Schlüssel-Option |
| 5 | **Die Planrolle** (eA) – ein ER-Diagramm, auf dessen Rückseite „Wie viele Tische braucht ihr?“ steht. | ER → Relationenschema (Kletterhalle-ähnlicher, neuer Mini-Kontext) | `schema`: Überführung in der Schema-Werkbank | Anzahl der Relationen, gefolgt von der Anzahl der Fremdschlüssel |
| 5 (gA) | **Der Schlüsselkasten** – Ersatzstation ohne ER. | Schlüsselkandidaten, Ausschnitt-Falle | `zellen`: alle Attribute(-kombinationen) markieren, die als Primärschlüssel taugen | Anzahl der geeigneten Kandidaten + Anzahl der Attribute im minimalen Schlüssel |
| 6 | **Der Tresor** – das letzte Schloss, beschriftet: „Wie gläsern ist Weserstedt?“ | Datenschutz (`Datenspuren` + Szenarien) | `match`: fünf Szenarien den DSGVO-Grundsätzen 1–5 zuordnen (Zweckbindung, Datenminimierung, Transparenz, Rechtsgrundlage/Einwilligung, Speicherbegrenzung) | fünfstellige Ziffernfolge der Zuordnung – der Tresor öffnet sich |

---

## 10. Urkunde, Ränge, Abzeichen

### 10.1 Urkunde „Detektei-Lizenz“

> **DATENDETEKTEI WESERSTEDT**
> **Detektei-Lizenz** · Nr. {LizenzNr}
>
> Hiermit wird bestätigt, dass
> **{Anzeigename}**
> im Kurs {Kursname} die Ermittlerprüfung der Datendetektei Weserstedt abgelegt hat.
>
> Die Inhaberin bzw. der Inhaber dieser Lizenz ist befähigt, Datenbestände mit SQL zu befragen, Tabellen über Schlüssel zu
> verbinden, Anomalien aufzuspüren, Baupläne nach den Regeln der Kunst zu entwerfen{eA: und in Datenbanken zu überführen}
> – und dabei die Rechte der Menschen hinter den Daten zu achten.
>
> Erreichter Rang: **{Rang}** · Beweisstücke: {n} von 7 · Weserstedt, {Datum}
>
> Edda Lorenz, Kommissarin a. D., Leiterin der Datendetektei · {Lehrkraft}
>
> *Diese Lizenz ist frei erfunden und berechtigt nicht zu Ermittlungen außerhalb des Unterrichts.*

### 10.2 Rangnamen (Schwellen nach Vertrag: 0 / 10 / 30 / 55 / 80 % der freigeschalteten Punkte)

| Rang | ab | Satz |
|---|---|---|
| **Neuling** | 0 % | Du hast deinen Ausweis und weißt, wo der Tee steht – die erste Spur wartet. |
| **Spürnase** | 10 % | Du findest Datensätze, die andere übersehen, und weißt, dass NULL nicht null ist. |
| **Ermittler:in** | 30 % | Du verbindest Tabellen, ohne die halbe Stadt zu verdächtigen. |
| **Kommissar:in** | 55 % | Du gruppierst, begründest und erkennst eine Anomalie auf den ersten Blick. |
| **Meisterdetektiv:in** | 80 % | Edda fragt inzwischen dich, bevor sie eine Abfrage abschickt. |

### 10.3 Abzeichen (nur automatisch vergeben; Kriterien laut Spec 8, ergänzt als Vorschlag)

| Abzeichen | Kurzbeschreibung |
|---|---|
| **Erste Spur** | Deine erste Aufgabe in der Datendetektei gelöst. |
| **Zehnerserie** | Zehn Aufgaben nacheinander im ersten Versuch gelöst (Vorschlag). |
| **Akte geschlossen** (je Akte) | Alle Ermittlungen einer Akte gelöst – Edda stempelt „GELÖST“. |
| **Beweisstück** (je Verhör) | Ein Verhör gewonnen; das Polaroid hängt an der Pinnwand. |
| **Makellos** | Ein Verhör mit 100 % abgeschlossen. |
| **Ohne Tipp** | 20 Aufgaben der Stufe ★★★ ohne Tipp gelöst. |
| **Fallensucher** | Jede der Fallen P1–P10 mindestens einmal überwunden. |
| **Architekt:in** | Eine ★★★-ER-Aufgabe ohne Fehlversuch gelöst. |
| **Trainingsprofi** | 100 Aufgaben auf dem Trainingsplatz gelöst. |
| **Warm-up-Meister** | 30 Warm-up-Karten in Fach 5 gebracht. |
| **Datenschützer:in** | Akte 6 abgeschlossen – du weißt, wie man Menschen in Daten findet und wann man es lassen sollte. |

---

## 11. Probefall „Eisdiele Weserstedt“ (Gastmodus)

Eigenständiges Mini-Rätsel ohne Bezug zum Phantom. DB `Eisdiele`: `Sorte(SorteNr, Name, Preis, Vegan)` ·
`Verkauf(VerkaufNr, ↑SorteNr, Datum, Kugeln)` (Preis = Preis je Kugel). Nichts wird gespeichert; nie echte Aufgaben.

**Mini-Story (Einstieg, 3 Sätze):** Pia Wendland, Inhaberin der Eisdiele Weserstedt im Lindenhof, hat einen Streit zu
schlichten: Ihre Aushilfe schwört, Stracciatella sei der Sommerhit, weil sie am häufigsten verkauft wurde – Pia ist
sicher, es war Vanille. Dazu will sie wissen, ob sich die neue vegane Sorte lohnt. Hilf ihr mit ein paar Abfragen, und
probier dabei Konsole und Zeitlupe aus.

| # | Demo-Frage (verbal) | Konzept | Werkzeug |
|---|---|---|---|
| 1 | Welche Sorten sind vegan? | SELECT, WHERE | Konsole |
| 2 | Liste alle Sorten nach Preis absteigend, bei gleichem Preis alphabetisch. | ORDER BY mehrstufig | Konsole |
| 3 | Welche Sorten haben „Schoko“ im Namen? | LIKE mit `%` | Konsole |
| 4 | Welche Sorten wurden am 2026-07-12 verkauft, und wie viele Kugeln jeweils? | Verbund Sorte–Verkauf (FROM … WHERE), Datumsliteral | Spurenbrett (Fäden) |
| 5 | Wie oft wurde jede Sorte verkauft, und wie viele Kugeln waren es insgesamt? | GROUP BY, COUNT vs. SUM | Zeitlupe |
| 6 | Welche Sorten haben mehr als 50 € Umsatz gebracht? | Berechnung Kugeln × Preis, SUM, HAVING | Zeitlupe |

**Auflösung des Rätsels:** Beide haben recht – sie zählen Verschiedenes. Stracciatella hat die meisten *Verkäufe*
(COUNT), Vanille die meisten *Kugeln* (SUM). Genau diese Unterscheidung brauchst du im Abitur ständig. (Anforderung an die
Daten: siehe Anhang A.)

---

## 12. Glossar Story ↔ Fachbegriff / Vertragsbegriff

Story-Begriffe stehen **neben** den Fachbegriffen, nie an ihrer Stelle.

| Story-Begriff | Bedeutung | Vertrags-/Codebegriff |
|---|---|---|
| **Datendetektei** | die Plattform | `datendetektei` |
| **Ermittlerteam** | der Kurs (in der Oberfläche weiter „Kurs“) | Kurs |
| **Team** | feste Gruppe aus 3–4 Personen (Unplugged, Wettbewerb) | Team |
| **Akte** | Themenblock mit eigener Datenbank | Welt (`welt`) |
| **Ermittlung** | Lerneinheit, eine je Doppelstunde | Level (`level`) |
| **Verhör** | Abschlussprüfung einer Akte, Abitur-Stil, Timer | Boss (`boss`) |
| **Beweisstück** | Polaroid an der Pinnwand, je gewonnenem Verhör (ähnlich einem Abzeichen, aber Teil der Story) | Boss-Belohnung |
| **Pinnwand** | Sammlung der Beweisstücke | – |
| **Steckbrief** | füllt sich mit jeder Akte mit Hinweisen auf das Phantom | – |
| **Stadtplan** | Übersicht der Akten als Orte | Weltkarte |
| **Briefing** | Story-Einstieg (Lab max. 3 Sätze, Präsentation 5–8) | – |
| **Fallbesprechung** | Sicherungsphase am Ende der DS | – |
| **Ermittlungsakte** | Arbeitsblatt (docx) | Arbeitsblatt |
| **Ermittlungskonsole** | SQL-Editor mit Ausführen/Prüfen/Zeitlupe | `sql`-Interaktion, Konsole |
| **Freie Ermittlung** | Konsole ohne Aufgabe auf einer Akten-DB | – |
| **Zeitlupe** | Visualisierung der Auswertungsreihenfolge | – |
| **Spurenbrett** | Visualisierung Kreuzprodukt → Verbund | – |
| **Sortierfächer** | Visualisierung GROUP BY / HAVING | – |
| **Bauplan / Bauplan-Tisch** | ER-Diagramm / ER-Editor | `er`-Interaktion |
| **Schema-Werkbank** | Editor für Relationenschemata | `schema`-Interaktion |
| **Anomalie-Simulator, Zerlegungs-Puzzle** | Werkzeuge der Akte 4 | `anomalie`, `zerlegen` |
| **Ermittler-Notiz** | Merkkasten | – |
| **Abi-Ecke** | Abitur-Teilaufgabe auf dem AB (gesiezt) | – |
| **Cold Case** | Zusatzfall für Schnelle, ohne Punkte | – |
| **Schlussplädoyer** | Abfolge von SQL-Aufgaben in Akte 6 | `sql`-Aufgaben |
| **Ermittlerprüfung** | Generalprobe im Abitur-Format | Akte 7 |
| **Detektei-Lizenz** | Urkunde | Urkunde |
| **Ermittler-Handbuch** | 8 Werkzeugkarten | – |
| **Ränge** | Neuling … Meisterdetektiv:in | Ränge (Vertragsschwellen) |

**Nie ersetzen:** Tabelle, Datensatz, Attribut, Primärschlüssel, Fremdschlüssel, Verbund, Kreuzprodukt, Aggregatfunktion,
Redundanz, Einfüge-/Änderungs-/Löschanomalie, Entitätstyp, Beziehungstyp, Schlüsselattribut, Kardinalität,
Relationenschema, Quasi-Identifikator, Pseudonymisierung.

---

## Anhang A – Story-Fakten, die in den Datenbanken stehen müssen

**Verbindlich** = vom Auftrag vorgegeben · **Vorschlag** = in dieser Story-Bibel festgelegt, mit den DB-Entwürfen abzugleichen.

**Alle DBs:** Stadtteil-Werte aus 2.1 (Altstadt, Hafenviertel, Weserufer, Mühlenfeld, Nordheide, Lindenhof, Deichkamp,
Bahnhofsviertel) – Vorschlag.

**Fundbuero** (`Fundsache`)
- Verbindlich: Bezeichnung 'Messing-Kompass', Wert 450, `AbgeholtAm` gesetzt, Finder 'N. Falter'.
- Vorschlag: Funddatum '2026-06-18', AbgeholtAm '2026-09-14', Fundort 'Weserpromenade', Stadtteil 'Weserufer'.
- Vorschlag für die Drei-Abfragen-Kette (DS 2): mehrere weitere Fundsachen mit „Messing“ in der Bezeichnung (teils
  außerhalb Juni/Juli), mehrere Fundsachen im Juni/Juli mit Wert unter 400; nur der Kompass erfüllt Messing + Juni/Juli +
  Wert ≥ 400.

**StadtRad**
- Verbindlich: Kunde KundenID 77, Vorname 'Nora', Nachname 'Falter', Jahrgang 1988, Stadtteil 'Hafenviertel', Tarif 'Plus';
  Station 'Hafenkante'; fünf Ausleihen von Rädern mit Typ 'Lastenrad' ab Hafenkante, nachts, `Ende` = NULL.
- Vorschlag: Starts '2026-09-08 01:14', '2026-09-09 01:32', '2026-09-10 01:05', '2026-09-11 01:48', '2026-09-12 01:21';
  ZielStation, DauerMin und Preis = NULL; die fünf Lastenräder mit StationID NULL (Status z. B. 'unterwegs'); Station
  Hafenkante liegt im Stadtteil 'Hafenviertel'. Kein Kunde 'Merle Falkenrath'.

**Stadtfest**
- Verbindlich: Helfer HelferNr 23, 'Nora' 'Falter', Jahrgang 1988; Stand 'Kaffeemobil'; Schicht 22:00–23:00; Fehlbetrag
  312,50 €.
- Vorschlag: Datum Samstag '2026-08-29' (Schicht '2026-08-29 22:00' bis '2026-08-29 23:00'); Helfer.Verein 'TuS Weserstedt';
  alle Bons des Kaffeemobils in dieser Stunde mit Zahlart 'bar' und Helfer 23; die **Summe der Produktpreise aller
  Positionen mit Menge 0** in dieser Stunde am Kaffeemobil = **312,50** (z. B. 125 Positionen 'Kaffee' à 2,50 €; Mischung
  zulässig); Positionen mit Menge 0 sonst nur vereinzelt (≤ 3 je Helfer); zwei gleichnamige Helfer (DS 5); Kaffeemobil
  hat auch vor 22 Uhr und nach 23 Uhr (andere Helfer) Umsatz.

**TuS** (`MitgliederlisteRoh`)
- Verbindlich: Zeile 'Nora Falter', Abteilung Tischtennis, Monatsbeitrag 0,00; Zeile 'Merle Falkenrath', Geburtsjahr 1988,
  Tischtennis.
- Vorschlag: Nora-Falter-Zeile mit leerem Geburtsjahr, Beitragsgruppe 'Erwachsene', Eintritt '2026-04-01'; Erwachsene
  regulär 14,00 €, einige Zeilen noch 12,00 € (Änderungsanomalie); Merle Falkenrath Beitragsgruppe 'Erwachsene', 14,00 €;
  Merle ist das **einzige** Mitglied mit Geburtsjahr 1988 in Tischtennis; Ole Brakhage (1988, Fußball) darf Mitglied sein;
  Tamara Leversen ist kein Mitglied; Tischtennis trainiert dienstags in der Halle am Mühlenfeld. Ob „Nora Falter“ in der
  normalisierten Fassung fehlt (bereinigt) oder bleibt, entscheidet der DB-Entwurf.

**Detektei**
- Verbindlich: Person 'Nora' 'Falter' in `verdaechtig` für die Fälle 1–4; `kennt`-Beziehungen verknüpfen Personen.
- Vorschlag: Fall 1–4 mit den Titeln 'Das Fundbüro', 'Spur der Räder', 'Die Stadtfest-Kasse', 'Chaos im Vereinsarchiv';
  Nora Falter mit Jahrgang 1988, Stadtteil 'Hafenviertel'; sie ist die einzige Person in allen vier Fällen; `kennt` verbindet
  sie mit mindestens einer Person je Tatort (z. B. Gesa Ohlendiek, Bent Hollwedel, Selin Aksoy, Wiebke Lüttjohann);
  Ermittler Edda Lorenz (MentorNr NULL) und Juri Brandes (Mentor Edda); Beweisstücke 'Fundbuch-Seite', 'Schloss-Code',
  'Kassenbon', 'Vereinsausweis' zu den Fällen 1–4; Orte 'Fundbüro', 'Hafenkante', 'Festplatz', 'Vereinsheim TuS'.
  **Merle Falkenrath kommt nicht vor** (sonst Spoiler vor Akte 6).

**Datenspuren**
- Verbindlich: Re-Identifizierung nur über Kombination; Jahrgang 1988 + Hafenviertel → wenige Kandidaten → Merle Falkenrath.
- Vorschlag (Schlussplädoyer, Abschnitt 7):
  - `RadExport`: StartStation als Stationsname ('Hafenkante'); die fünf Nachtfahrten aus StadtRad mit identischen
    Start-Zeitpunkten unter **einem** KundenToken (Jahrgang 1988, 'Hafenviertel', 'Plus'); **kein weiteres Token** mit
    dieser Merkmalskombination.
  - `AppCheckin`: Ort-Werte 'Hafenkante', 'Festplatz', 'Fundbüro', 'Vereinsheim TuS' u. a.; genau **ein Gerät** mit Ort
    'Hafenkante' und exakt denselben Zeitpunkten wie die fünf Fahrten; dasselbe Gerät am 2026-08-29 am 'Festplatz' kurz vor
    22:00 und kurz nach 23:00, am 2026-09-14 vormittags (z. B. 10:17) am 'Fundbüro', an mehreren Dienstagen gegen 19:00 am
    'Vereinsheim TuS' (z. B. 2026-08-25, 2026-09-01, 2026-09-15); andere Geräte an denselben Orten zu anderen Zeiten.
  - `FestZahlung`: am Kaffeemobil am 2026-08-29 zwischen 22:00 und 22:59 **keine** Kartenzahlung, davor und danach
    regelmäßig.
  - `VereinExport`: genau ein MitgliedToken mit Geburtsjahr 1988, 'Hafenviertel', 'Tischtennis' (Merle); ein Token 1988,
    'Hafenviertel', 'Fußball' (Ole Brakhage); ein Eintrag für Nora Falter mit NULL-Werten ist zulässig.
  - `Einwohner`: genau **drei** Einwohner mit Jahrgang 1988 und Stadtteil 'Hafenviertel': Merle Falkenrath, Tamara Leversen,
    Ole Brakhage; **keine** 'Nora Falter'. Spalte `Strasse`: Merle Falkenrath wohnt **'Kranstraße 7'** (Einwohner 1042);
    an derselben Adresse wohnt ein älterer Nachbar (Rune Siemers, 1961), die anderen Kandidaten in anderen Straßen.
  - `AppCheckin`: Das Gerät des Phantoms heißt **WA-3917**; es checkt nachts (ca. 02:30–06:00) an mehreren Tagen am Ort
    'Kranstraße 7' ein (die App speichert ohne markierten Ort die nächste Adresse).
  - StadtRad: Tamara Leversen ist Kundin 64 (1988, Hafenviertel, Tarif Basis); Nachtfahrten = Ausleihen 303–307 mit
    Rädern 41–45 (Status 'vermisst'); der Messing-Kompass ist im Fundbuero FundNr 36.

**Eisdiele** (Gast)
- Vorschlag: mindestens eine vegane Sorte (neu z. B. 'Sanddorn-Mango'), Sorten mit „Schoko“ im Namen, Verkäufe am
  '2026-07-12'; 'Stracciatella' hat die meisten Verkäufe (COUNT), 'Vanille' die meisten Kugeln (SUM); mindestens eine
  Sorte über, eine unter 50 € Umsatz; Preis je Kugel.
