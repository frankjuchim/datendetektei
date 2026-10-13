# Erklärvideo 5: ER-Modelle nach den Ergänzenden Hinweisen

> ERZEUGT aus `video.json` mit `python3 werkzeuge/video_folien.py` – Änderungen in der video.json vornehmen.

*Chen-Notation, Kardinalitäten 1/n/m, Schlüssel- und Beziehungsattribute, rekursive und ternäre Beziehungstypen*

| | |
|---|---|
| **Akte** | Akte 5 · Der Bauplan (eA) |
| **Einsatz** | Akte 5 (eA), DS 9–10 · Ermittlungen 5.1 „Baupläne lesen“ und 5.2 „Der Architekturwettbewerb“ (Bauplan-Tisch) · AB 5.1, AB 5.2 |
| **Zielgruppe** | Informatik eA (Datenbanken), Akte 5; Wiederholung vor Verhör 5, Klausur und Abitur |
| **Länge** | Ziel 10–12 min · Sprechtext ca. 5:57 min (bei 130 Wörtern/min, inkl. Pausen) |
| **Beispieldaten** | eigenes Beispiel „Tierheim“ (Tier, Gehege, Chip, Helfer, Interessent, Futtersorte, Lieferant) – nicht die Detektei des Labs, keine AB-, Verhör- oder Klausuraufgabe; Diagramme mit dem Bauplan-Tisch der Plattform |
| **Folien** | `DD_Video05_ER-Modelle_Folien.pptx` (11 Folien, Kamera-Zone unten rechts frei, Sprechertext in den Notizen) |

## Lernziele

- Entitätstypen, Attribute, Schlüsselattribute und Beziehungstypen in Chen-Notation nach EH §7 darstellen
- Kardinalitäten 1:1, 1:n und n:m aus einem Sachtext bestimmen und begründen
- Beziehungsattribute richtig platzieren (am Beziehungstyp, wenn sie zum Paar gehören)
- Rekursive Beziehungstypen mit Rollen und ternäre Beziehungstypen (n, m, p) modellieren
- Die Falle P9 (Kardinalität vertauscht, Schlüssel fehlt, Attribut falsch platziert) vermeiden

## Hinweise für die Aufnahme

- Beispiel „Tierheim“ ist eigens für das Video gewählt; die Detektei-Modelle (Lab, AB 5.x), das Schulbeispiel der Lab-Intro und die Kletterhalle (Verhör 5) kommen nicht vor.
- Alle Diagramme sind mit dem Bauplan-Tisch der Plattform gerendert (scripts/video_bilder.js, Werkzeugseite /werkzeug/bauplan, ohne Prüfung).
- Notation EH §7: Rechteck = Entitätstyp (Singular), Ellipse = Attribut, Schlüsselattribut unterstrichen, Raute = Beziehungstyp (Verb, lowerCamelCase), Kardinalitäten nur 1, n, m (ternär p); keine (min,max)- oder Krähenfuß-Notation.

## YouTube

**Titel:** ER-Modell in Chen-Notation: Kardinalitäten, Beziehungsattribute, rekursiv, ternär (Informatik-Abitur Niedersachsen) | Datendetektei #5

**Sichtbarkeit:** zuerst „nicht gelistet“, nach Freigabe öffentlich (Playlist „Datendetektei“).

**Beschreibung:**

```
So zeichnest du ER-Modelle, wie es die Ergänzenden Hinweise für das Informatik-Abitur in Niedersachsen verlangen: Chen-Notation mit Entitätstypen, Attributen, Schlüsselattributen und Beziehungstypen, Kardinalitäten 1, n und m, Beziehungsattribute am richtigen Ort, rekursive Beziehungen mit Rollen und ternäre Beziehungen. Dazu die Falle P9 und ein Lesetrick für Kardinalitäten.

Teil der Unterrichtsreihe „Datendetektei Weserstedt – Ermitteln mit Datenbanken“ (Informatik eA, Abitur ab 2027).
Selbst zeichnen: Bauplan-Tisch https://datendetektei.frankjuchim.de/werkzeug/bauplan

Kapitel:
0:00 Einstieg
0:20 Bausteine
0:58 Kardinalitäten
2:12 Rekursiv und ternär
3:16 Jetzt du
4:54 Fallen
5:18 Merksätze
```

_Zeitmarken aus der Textlänge geschätzt – nach dem Schnitt anpassen._

**Tags:** Informatik Abitur, Niedersachsen, ER-Modell, Entity-Relationship, Chen-Notation, Kardinalität, Beziehungstyp, rekursive Beziehung, ternäre Beziehung, Datenbanken, Datendetektei

## Drehbuch

### Folie 1 · 0:00 – ER-Modelle nach den Ergänzenden Hinweisen · Kapitel „Einstieg“

*Regie: Kamera unten rechts, Titelfolie im Hintergrund.*

**Sprechertext:**

Bevor eine Datenbank gebaut wird, wird sie geplant – mit einem Bauplan, dem ER-Modell. Im Abitur zeichnest du solche Modelle selbst oder liest sie. Nach diesem Video kennst du alle Bausteine der Chen-Notation, bestimmst Kardinalitäten sicher und modellierst auch rekursive und ternäre Beziehungen.

### Folie 2 · 0:20 – Die Bausteine der Chen-Notation · Kapitel „Bausteine“

**Auf der Folie:**

*Bild: `bilder/er_basis.png`*
- *Notation (EH §7):* Rechteck: **Entitätstyp**, Singular · Ellipse: Attribut, **Schlüsselattribut unterstrichen** · Raute: **Beziehungstyp**, Verb in lowerCamelCase · Kanten mit Kardinalität **1**, **n**, **m**

**Sprechertext:**

Unser Beispiel ist ein Tierheim. Ein Entitätstyp ist eine Art von Dingen, über die wir Daten speichern – hier Tier und Gehege. Er steht in einem Rechteck und heißt immer im Singular. Seine Attribute stehen in Ellipsen. Das Attribut, das jedes Tier eindeutig kennzeichnet, ist das Schlüsselattribut – es wird unterstrichen, hier die TierNr. Die Raute ist der Beziehungstyp: ein Verb in lowerCamelCase, hier lebtIn. An die Kanten schreibst du die Kardinalitäten – nur 1, n und m, keine Krähenfüße und keine Min-Max-Paare.

### Folie 3 · 0:58 – Kardinalitäten bestimmen: 1:n und 1:1 · Kapitel „Kardinalitäten“

**Auf der Folie:**

*Bild: `bilder/er_eins.png`*
- *Lesetrick: zwei Fragen:* In wie vielen Gehegen lebt **ein** Tier? → 1 · Wie viele Tiere leben in **einem** Gehege? → n · Die Zahl steht beim Entitätstyp, der „gezählt“ wird.

**Sprechertext:**

Kardinalitäten bestimmst du mit zwei Fragen, immer aus Sicht eines einzelnen Objekts. Erstens: In wie vielen Gehegen lebt ein Tier? In genau einem – also steht die 1 am Gehege. Zweitens: Wie viele Tiere leben in einem Gehege? Viele – also steht n am Tier. Das ist eine 1-zu-n-Beziehung. Unten eine 1-zu-1-Beziehung: Ein Tier trägt genau einen Chip, und ein Chip gehört zu genau einem Tier. Stell dir die beiden Fragen bei jeder Raute – laut, auch in der Klausur im Kopf.

### Folie 4 · 1:36 – n:m mit Beziehungsattribut

**Auf der Folie:**

*Bild: `bilder/er_nm.png`*
- *Wohin gehört „Seit“?:* Ein Helfer betreut viele Tiere, ein Tier wird von vielen Helfern betreut → **n:m**. · „Seit“ beschreibt das **Paar** Helfer–Tier, nicht den Helfer und nicht das Tier → Attribut **an der Raute**.

**Sprechertext:**

Ehrenamtliche Helferinnen und Helfer betreuen die Tiere. Ein Helfer betreut mehrere Tiere, und ein Tier wird von mehreren Helfern betreut – auf beiden Seiten viele, also n zu m. Jetzt soll gespeichert werden, seit wann jemand ein Tier betreut. Wohin gehört dieses Attribut? Nicht zum Helfer, denn er betreut jedes Tier unterschiedlich lange. Nicht zum Tier, aus demselben Grund. Seit gehört zum Paar aus Helfer und Tier – also an die Raute. Das nennt man ein Beziehungsattribut.

### Folie 5 · 2:12 – Rekursiv: ein Entitätstyp, zwei Rollen · Kapitel „Rekursiv und ternär“

**Auf der Folie:**

*Bild: `bilder/er_rek.png`*
- *Rollen:* Beide Kanten führen zu **Tier**. · Rollen klären, wer wer ist: **Mutter** (1) und **Jungtier** (n). · Eine Mutter hat viele Jungtiere, jedes Jungtier hat eine Mutter.

**Sprechertext:**

Manchmal steht ein Entitätstyp mit sich selbst in Beziehung. Im Tierheim kommen Jungtiere zur Welt, und wir wollen wissen, welches Tier die Mutter ist. Beide Kanten der Raute stammtAb führen zu Tier. Damit klar ist, wer wer ist, schreibst du Rollen an die Kanten: Mutter und Jungtier. Die Kardinalitäten liest du wie gewohnt: Eine Mutter hat viele Jungtiere, jedes Jungtier hat genau eine Mutter. Rekursive Beziehungen stehen neu im Beispiel der Ergänzenden Hinweise – rechne damit.

### Folie 6 · 2:47 – Ternär: drei Entitätstypen an einer Raute

**Auf der Folie:**

*Bild: `bilder/er_ter.png`*
- *Kennenlerntermin:* Ein Interessent lernt ein Tier kennen – begleitet von einem Helfer, an einem Datum. · Nur alle drei zusammen beschreiben den Termin → **ternär**, Kardinalitäten **n, m, p**.

**Sprechertext:**

Und wenn drei Dinge zusammengehören? Bevor jemand ein Tier adoptiert, gibt es Kennenlerntermine: Ein Interessent lernt ein Tier kennen, begleitet von einem Helfer, an einem bestimmten Datum. Diese Information hängt an allen dreien gleichzeitig – keine zwei reichen. Deshalb gibt es eine Raute mit drei Kanten, eine ternäre Beziehung. Die Kardinalitäten heißen dann n, m und p. Das Datum ist wieder ein Beziehungsattribut.

### Folie 7 · 3:16 – Kurz anhalten: Jetzt du! · Kapitel „Jetzt du“

**Auf der Folie:**

> Modelliere in Chen-Notation:
- Jede **Futtersorte** (SorteNr, Bezeichnung) wird von genau **einem Lieferanten** (LieferantNr, Firma) geliefert; ein Lieferant liefert mehrere Sorten.
- Jedes **Tier** bekommt mehrere Futtersorten, eine Sorte wird an mehrere Tiere verfüttert – jeweils mit einer **Tagesmenge**.
- *Tipp:* Zwei Fragen je Raute. · Zu wem gehört die Tagesmenge?

**Sprechertext:**

Jetzt du. Modelliere: Jede Futtersorte wird von genau einem Lieferanten geliefert, ein Lieferant liefert mehrere Sorten. Jedes Tier bekommt mehrere Futtersorten, und eine Sorte wird an mehrere Tiere verfüttert – jeweils mit einer Tagesmenge. Zeichne das ER-Modell mit Schlüsselattributen und Kardinalitäten. Halte das Video an – oder zeichne es direkt im Bauplan-Tisch.

*(ca. 45 s Pause zum Mitdenken – im Schnitt den Hinweis „Video anhalten“ einblenden)*

### Folie 8 · 4:25 – Auflösung

**Auf der Folie:**

*Bild: `bilder/er_pause.png`*
- *Typische Fehler:* 1 und n vertauscht (P9) · Tagesmenge an Tier oder Futtersorte (P9) · Schlüsselattribut nicht unterstrichen (P9) · Plural „Tiere“ statt Entitätstyp Tier

**Sprechertext:**

Die Auflösung: Lieferant und Futtersorte sind über liefert verbunden – eine Futtersorte hat genau einen Lieferanten, also steht die 1 beim Lieferanten und das n bei der Futtersorte. Tier und Futtersorte sind n zu m verbunden, und die Tagesmenge gehört zum Paar aus Tier und Sorte, also an die Raute frisst. Typische Fehler: 1 und n vertauscht, die Tagesmenge am Tier, ein vergessenes Schlüsselattribut.

### Folie 9 · 4:54 – Die Falle P9 im ER-Modell · Kapitel „Fallen“

**Auf der Folie:**

- **P9** Kardinalität vertauscht oder fehlt: Immer die zwei Fragen stellen – die Zahl steht bei dem Entitätstyp, dessen Anzahl gefragt ist.
- **P9** Schlüsselattribut nicht markiert: Jeder Entitätstyp braucht ein unterstrichenes Schlüsselattribut.
- **P9** Beziehungsattribut falsch platziert: Gehört ein Wert zu einem Paar oder Tripel, steht er an der Raute.
- **P10** Kardinalität nicht begründet: „Begründen“ heißt: beide Richtungen im Sachzusammenhang formulieren.

**Sprechertext:**

Die Falle im ER-Modell heißt P9. Kardinalitäten werden vertauscht oder vergessen – stell immer die zwei Fragen. Ein Entitätstyp ohne unterstrichenes Schlüsselattribut. Und ein Beziehungsattribut am falschen Ort. Wenn im Abitur verlangt wird, eine Kardinalität zu begründen, schreib beide Richtungen im Sachzusammenhang auf – ein Satz pro Richtung. Sonst droht P10.

### Folie 10 · 5:18 – Das nimmst du mit · Kapitel „Merksätze“

**Auf der Folie:**

- Rechteck = Entitätstyp (Singular), Ellipse = Attribut, Raute = Beziehungstyp (Verb).
- Schlüsselattribute werden unterstrichen.
- Kardinalität: „Mit wie vielen B ist **ein** A verbunden?“ – beide Richtungen.
- Attribute eines Paars oder Tripels gehören an die Raute.
- Rekursiv: Rollen an die Kanten; ternär: n, m, p.

**Sprechertext:**

Das nimmst du mit: Rechteck, Ellipse, Raute – Entitätstyp im Singular, Attribut, Beziehungstyp als Verb. Schlüsselattribute werden unterstrichen. Kardinalitäten bestimmst du mit zwei Fragen, in beide Richtungen. Attribute eines Paars gehören an die Raute. Und bei rekursiven Beziehungen schreibst du Rollen an die Kanten, bei ternären n, m und p.

### Folie 11 · 5:41 – Weiter im Lab

**Auf der Folie:**

- Ermittlung 5.1 „Baupläne lesen“ · A5-E1-01 … 08
- Ermittlung 5.2 „Der Architekturwettbewerb“ · A5-E2-01 … 08
- AB 5.1 „Baupläne lesen“ und AB 5.2 „Der Architekturwettbewerb“
- Bauplan-Tisch frei zum Üben: /werkzeug/bauplan
- Nächstes Video: Video 6 – Vom ER-Modell zum Relationenschema in 5 Regeln

**Sprechertext:**

Ab ins Lab! In Akte 5 liest und zeichnest du den Bauplan der Detektei auf dem Bauplan-Tisch. Im nächsten Video machen wir aus einem ER-Modell eine Datenbank: vom ER-Modell zum Relationenschema in fünf Regeln.
