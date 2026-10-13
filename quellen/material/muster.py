#!/usr/bin/env python3
"""Erstellungshilfe: Muster-Dokumente im Akten-Design (materialien/_Muster/) – Vorlage für die Akten-Skripte
quellen/material/akte<n>.py. Zeigt jeden Baustein von werkzeuge/akten_design.py einmal.

Die erzeugten docx/pptx sind (wie alle Materialien) danach maßgeblich; dieses Skript ist nur die Erstellungshilfe.
Aufruf: python3 quellen/material/muster.py   (überschreibt materialien/_Muster/*)
"""
import json
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "werkzeuge"))

from akten_design import (  # noqa: E402
    AktenDokument, AktenPraesentation, Auftrag, Bewertung, ER, Ergebnis, Liste, Loesung, Notiz, Schema, SQL, Tabelle,
    abfrage_ergebnis, warmup_karten_dokument)

ZIEL = REPO / "materialien" / "_Muster"
FUNDSACHE = "Fundsache(<u>FundNr</u>, Bezeichnung, Kategorie, Farbe, Fundort, Stadtteil, Funddatum, Wert, Finder, AbgeholtAm)"


def ergebnis(sql, db="fundbuero", max_zeilen=None):
    kopf, zeilen = abfrage_ergebnis(sql, db)
    if max_zeilen and len(zeilen) > max_zeilen:
        return Ergebnis(kopf, zeilen[:max_zeilen], abgeschnitten=True)
    return Ergebnis(kopf, zeilen)


def er_beispiel():
    akte5 = json.loads((REPO / "seed" / "akten" / "akte5.json").read_text(encoding="utf-8"))
    for a in akte5["aufgaben"]:
        for b in a.get("inhalt", []):
            if b.get("t") == "er":
                return ER(b["graph"], b["layout"], breite_cm=12)
    raise SystemExit("kein ER-Block in akte5.json")


# ------------------------------------------------------------------ Arbeitsblatt + Lösung (eine Funktion, zwei Fassungen)
def arbeitsblatt(fassung):
    d = AktenDokument("ab", 1, "Der erste Auftrag", fassung=fassung, ermittlung="1.1", ds=1, material="Muster AB",
                      datenbank="fundbuero", untertitel="Muster-Arbeitsblatt – Vorlage für die Akten (Inhalt gekürzt)")
    d.kopfband()
    d.fall_einstieg("Gesa Ohlendiek vom Fundbüro Weserstedt bittet die Detektei, ihr Fundbuch zu prüfen – "
                    "„irgendetwas stimmt da nicht“. Bevor ihr ermittelt, müsst ihr das Fundbuch lesen und befragen können.")
    d.beweisstueck(1, "Aufbau einer Tabelle",
                   "Das Fundbuch ist eine **Tabelle** (Relation). Jede Zeile ist ein **Datensatz**, jede Spalte ein "
                   "**Attribut**, jeder Eintrag ein **Attributwert**. Ausschnitt:",
                   Tabelle(["FundNr", "Bezeichnung", "Kategorie", "Stadtteil", "Wert"],
                           [["1", "E-Reader", "Elektronik", "Nordheide", "127"], ["2", "Regenjacke", "Kleidung", "Lindenhof", "10"],
                            ["3", "Monatskarte", "Dokumente", "Hafenviertel", "9"]], pk=("FundNr",)),
                   "In Kurzschreibweise (Primärschlüssel unterstrichen, Fremdschlüssel mit ↑):",
                   Schema(FUNDSACHE))
    d.beweisstueck(2, "Das Abfrage-Gerüst",
                   "Eine Abfrage beantwortet drei Fragen: *Welche Spalten?* (SELECT) – *Aus welcher Tabelle?* (FROM) – "
                   "*Welche Zeilen?* (WHERE); ORDER BY legt die Reihenfolge fest.",
                   SQL("SELECT Bezeichnung, Wert\nFROM Fundsache\nWHERE Kategorie = 'Schlüssel'\n  AND Wert > 20\nORDER BY Wert DESC;"),
                   Notiz("Klammern retten Fälle", "AND bindet stärker als OR – im Zweifel Klammern setzen. Text steht in "
                         "`'…'`, Zahlen ohne Hochkommata."))
    d.ermittlungsauftraege([
        Auftrag(1, 1, "PAPIER", "Beschrifte im Ausschnitt aus Beweisstück 1 je ein Beispiel für Tabelle, Datensatz, Attribut "
                "und Attributwert.", kompetenzen=["K01"], linien=2,
                loesung=Loesung("Tabelle: Fundsache · Datensatz: z. B. die Zeile 2 Regenjacke … · Attribut: z. B. Stadtteil · "
                                "Attributwert: z. B. 'Lindenhof'.")),
        Auftrag(2, 2, "PAPIER", "Entscheide begründet, ob **FundNr** oder **Bezeichnung** Primärschlüssel sein kann.",
                kompetenzen=["K02"], linien=3,
                loesung=Loesung("FundNr: eindeutig für alle möglichen Daten, nie NULL, minimal. Bezeichnung nicht – es kann "
                                "jederzeit eine zweite Regenjacke abgegeben werden.",
                                fehler=[("P8", "„Im Ausschnitt ist die Bezeichnung eindeutig“ – ein Ausschnitt beweist nichts.")])),
        Auftrag(3, 2, "PAPIER", "Gib an, welche Zeilen des Ausschnitts die Bedingung `Kategorie = 'Kleidung' OR Wert > 100` "
                "erfüllen. Trage die FundNr ein.", kompetenzen=["K17", "K29"],
                inhalt=[Tabelle(["Bedingung", "FundNr"], [["Kategorie = 'Kleidung' OR Wert > 100", ""]])],
                loesung=Loesung("FundNr 1 (Wert 127) und 2 (Kleidung).")),
        Auftrag(4, 2, "PAPIER", "Notiere eine Abfrage: alle Fundsachen aus dem Stadtteil Lindenhof mit Bezeichnung und "
                "Funddatum, die neuesten zuerst.", kompetenzen=["K15", "K21"], linien=4,
                loesung=Loesung(SQL("SELECT Bezeichnung, Funddatum\nFROM Fundsache\nWHERE Stadtteil = 'Lindenhof'\nORDER BY Funddatum DESC;"),
                                ergebnis("SELECT Bezeichnung, Funddatum\nFROM Fundsache\nWHERE Stadtteil = 'Lindenhof'\n"
                                         "ORDER BY Funddatum DESC;", max_zeilen=4),
                                fehler=[("P5", "`Stadtteil = Lindenhof` ohne Hochkommata – dann sucht SQL eine Spalte Lindenhof.")])),
        Auftrag(5, 3, "LAB", "Alle Schlüssel mit einem Wert über 20 €, aber nicht aus dem Hafenviertel – sortiert nach Wert "
                "absteigend. Prüfe deine Abfrage in der Konsole.", kompetenzen=["K17", "K21"],
                loesung=Loesung(SQL("SELECT Bezeichnung, Stadtteil, Wert\nFROM Fundsache\nWHERE Kategorie = 'Schlüssel'\n"
                                    "  AND Wert > 20\n  AND Stadtteil != 'Hafenviertel'\nORDER BY Wert DESC;"),
                                ergebnis("SELECT Bezeichnung, Stadtteil, Wert\nFROM Fundsache\nWHERE Kategorie = 'Schlüssel'\n"
                                         "  AND Wert > 20\n  AND Stadtteil != 'Hafenviertel'\nORDER BY Wert DESC;"),
                                varianten=[SQL("SELECT Bezeichnung, Stadtteil, Wert\nFROM Fundsache\nWHERE Kategorie = 'Schlüssel'\n"
                                               "  AND Wert > 20\n  AND NOT Stadtteil = 'Hafenviertel'\nORDER BY Wert DESC;")])),
    ])
    d.abi_ecke("Gegeben ist die Tabelle Fundsache. **Entwerfen** Sie eine SQL-Abfrage, die Bezeichnung und Wert aller "
               "Fundsachen ausgibt, die im Stadtteil Altstadt gefunden wurden und einen Wert von mehr als 20 € haben.",
               be=2, operator="entwerfen", afb="II", kompetenzen=["K15", "K17"],
               loesung=Loesung(SQL("SELECT Bezeichnung, Wert\nFROM Fundsache\nWHERE Stadtteil = 'Altstadt'\n  AND Wert > 20;"),
                               ergebnis("SELECT Bezeichnung, Wert\nFROM Fundsache\nWHERE Stadtteil = 'Altstadt'\n  AND Wert > 20;"),
                               "1 BE für SELECT/FROM, 1 BE für die vollständige Bedingung."))
    d.spur_im_lab("1.1 „Der erste Auftrag“", "A1-E1-01 … A1-E1-08", werkzeug="Zeitlupe (WHERE-Schritt) bei Klammerfehlern")
    d.cold_case("Die Nachtfalter-Liste", "Welche Bedingungen bräuchtest du, um Finder-Einträge zu finden, die keine "
                "Personennamen sind? Notiere Ideen – in DS 2 bekommst du das passende Werkzeug.", kompetenzen=["K15"],
                loesung=Loesung("Ideen genügen, z. B. „Finder enthält keinen Punkt“; in DS 2 mit LIKE."))
    name = "DD_Muster_AB_LSG.docx" if fassung == "loesung" else "DD_Muster_AB.docx"
    return d.speichern(ZIEL / name)


# ------------------------------------------------------------------ Präsentation
def praesentation():
    p = AktenPraesentation(1, "Das Fundbüro", datenbank="fundbuero")
    p.titelfolie("Das Fundbüro", "Akte 1 · Muster-Präsentation im Stil „Fallbesprechung“",
                 notizen="Begrüßung, Teams bilden, Detektei-Ausweise austeilen (10 min).")
    p.briefing("Der erste Auftrag", "„Im Fundbuch stimmt etwas nicht. Bevor ihr ermittelt, lernt ihr, es zu lesen und zu "
               "befragen.“", notizen="Briefing vorlesen lassen. Impuls: Wo werden über euch Daten in Tabellen gespeichert?")
    p.begriffe("Begriffe am Fundbuch", [("Tabelle (Relation)", "Fundsache"), ("Datensatz", "eine Zeile = eine Fundsache"),
                                         ("Attribut", "eine Spalte, z. B. Kategorie"), ("Primärschlüssel", "<u>FundNr</u>: eindeutig, nie NULL, minimal")],
               inhalt=[Schema(FUNDSACHE)], notizen="Begriffe gemeinsam am Ausschnitt beschriften.")
    sql = "SELECT Bezeichnung, Wert\nFROM Fundsache\nWHERE Kategorie = 'Schlüssel'\n  AND Wert > 20\nORDER BY Wert DESC;"
    p.beispiel_schritte("Beispiel Schritt für Schritt", sql,
                        ["**FROM** – alle Zeilen der Tabelle Fundsache", "**WHERE** – nur Schlüssel mit Wert über 20 €",
                         "**ORDER BY** – teuerste zuerst", "**SELECT** – nur Bezeichnung und Wert zeigen"],
                        ergebnis=ergebnis(sql, max_zeilen=3), notizen="Reihenfolge der Auswertung betonen (Zeitlupe).")
    p.unplugged("Karteikarten-Filter", ["Jede/r zieht eine Karteikarte.", "WHERE = aufstehen, SELECT = vorlesen.",
                                         "AND und OR live erleben – erst vermuten, dann auflösen.", "ORDER BY: eine Reihe bilden."],
                material="30 Karteikarten", dauer="15 MIN", notizen="Karten vorher mischen; Foto der Reihe für die Sicherung.")
    p.lab_auftrag("1.1", "Der erste Auftrag", "A1-E1-01 … 08 (★ → ★★ → ★★★)", werkzeug="Zeitlupe",
                  hinweise=["Erst „Ausführen“, dann „Prüfen“.", "Bei Fehlern: Zeitlupe öffnen."], notizen="Herumgehen, Fehler P5/P6 sammeln.")
    p.merkfolie("Ermittler-Notiz", ["SELECT wählt Spalten – WHERE wählt Zeilen – ORDER BY ordnet.",
                                    "AND bindet stärker als OR: Klammern setzen.", "Text in `'…'`, Zahlen ohne Hochkommata."],
                notizen="Merksätze ins Heft.")
    p.abi_format("**Entwerfen** Sie eine SQL-Abfrage, die Bezeichnung und Wert aller Fundsachen aus der Altstadt mit einem "
                 "Wert von mehr als 20 € ausgibt.", be=2, operator="entwerfen", notizen="Zwei Minuten Einzelarbeit, dann Partner-Check.")
    p.inhaltsfolie("ER-Diagramm (Chen-Notation)", er_beispiel(), notizen="Muster für Grafiken: ER-Diagramm aus dem Akten-Format.")
    p.loesungsfolie("Lösung Abi-Format", SQL("SELECT Bezeichnung, Wert\nFROM Fundsache\nWHERE Stadtteil = 'Altstadt'\n  AND Wert > 20;"),
                    notizen="Erst nach der Einzelarbeit zeigen. 1 BE SELECT/FROM, 1 BE Bedingung.")
    p.speichern(ZIEL / "DD_Muster_Praesentation.pptx")
    v = AktenPraesentation(1, "Video-Muster", kamera_zone=True, datenbank="fundbuero")
    v.titelfolie("SQL-Grundlagen", "Video 1 · Muster mit Kamera-Zone unten rechts")
    v.beispiel_schritte("Beispiel", sql, ["FROM", "WHERE", "ORDER BY", "SELECT"], notizen="Sprechertext …")
    v.merkfolie("Merksätze", ["SELECT wählt Spalten.", "WHERE wählt Zeilen."])
    v.speichern(ZIEL / "DD_Muster_Video_Folien.pptx")


# ------------------------------------------------------------------ Lehrerhinweise
def lehrerhinweise():
    d = AktenDokument("lehrerhinweise", 1, "Lehrerhinweise Akte 1", fassung="lehrkraft", material="Muster Lehrerhinweise",
                      datenbank="fundbuero", untertitel="Muster – Überblick, Ziele, Verlauf, Schwierigkeiten, Vorbereitung")
    d.kopfband()
    d.ueberschrift("Überblick", 1)
    d.tabelle(["DS", "Thema", "Lab", "Warm-up", "Abi-Bezug"],
              [["1", "Der erste Auftrag", "A1-E1-01…08", "– (Kick-off)", "SQL entwerfen (2021–2026, je Termin)"],
               ["2", "Das verschwundene Fundstück", "A1-E2-01…08", "W-A1-01…04", "LIKE, IS NULL, BETWEEN"]],
              breiten=[1.2, 4.6, 3.2, 3.0, 5.0])
    d.ueberschrift("DS 1 · Der erste Auftrag", 1)
    d.ueberschrift("Ziele", 2)
    d.inhalt(Liste(["**erläutern** den Aufbau einer Tabelle mit Fachbegriffen", "**beurteilen** die Eignung eines Primärschlüssels",
                    "**entwerfen** Abfragen mit SELECT, FROM, WHERE, ORDER BY"], nummeriert=True))
    d.ueberschrift("Verlauf", 2)
    d.tabelle(["Phase", "Zeit", "Inhalt", "Sozialform", "Material"],
              [["Kick-off", "0–10'", "Briefing, Teams, Ausweise", "Plenum", "Präsentation Folien 1–4"],
               ["Unplugged", "20–35'", "Karteikarten-Filter", "Plenum", "30 Karteikarten"],
               ["Lab", "35–80'", "Ermittlung 1.1, AB 1.1 parallel", "EA", "iPad/Laptop, AB 1.1"]],
              breiten=[2.4, 1.6, 6.4, 2.4, 4.2])
    d.ueberschrift("Typische Schwierigkeiten", 2)
    d.inhalt(Liste(["AND/OR ohne Klammern (P6) → Zeitlupe zeigt verworfene Zeilen.",
                    "Text ohne Hochkommata (P5) → Fehlermeldung gemeinsam deuten:"]),
             SQL("SELECT Bezeichnung\nFROM Fundsache\nWHERE Kategorie = Kleidung;", pruefung="fehlerhaft"))
    d.notiz("Vorbereitung", "Kurs im Portal anlegen, Datendetektei freischalten, Akte 1 öffnen; Karteikarten laminieren.")
    d.speichern(ZIEL / "DD_Muster_Lehrerhinweise.docx")


# ------------------------------------------------------------------ Warm-up-Karten
def warmup():
    karten = json.loads((REPO / "seed" / "warmup" / "warmup_a1.json").read_text(encoding="utf-8"))["karten"][:4]
    warmup_karten_dokument(karten, 1, "Warm-up-Karten Akte 1 (Muster)").speichern(ZIEL / "DD_Muster_Warm-up-Karten.docx")


# ------------------------------------------------------------------ Klausur + Erwartungshorizont
KIOSK = [Schema("Helfer(<u>HelferNr</u>, Vorname, Nachname, Klasse)"),
         Schema("Schicht(<u>SchichtNr</u>, ↑HelferNr, Datum, Pause)"),
         Schema("Verkauf(<u>VerkaufNr</u>, ↑SchichtNr, Zeitpunkt, Zahlart)"),
         Schema("Posten(<u>↑VerkaufNr, ↑ProduktNr</u>, Anzahl)"),
         Schema("Produkt(<u>ProduktNr</u>, Bezeichnung, Kategorie, Preis)")]
SQL_F = ("SELECT Produkt.ProduktNr, Produkt.Bezeichnung, SUM(Posten.Anzahl) AS Stueck\nFROM Produkt, Posten\n"
         "WHERE Produkt.ProduktNr = Posten.ProduktNr\nGROUP BY Produkt.ProduktNr, Produkt.Bezeichnung\n"
         "HAVING SUM(Posten.Anzahl) > 40\nORDER BY Stueck DESC;")


def klausur(fassung):
    eh = fassung == "loesung"
    d = AktenDokument("erwartungshorizont" if eh else "klausur", 7, "Klausur Datenbanken – Muster", fassung=fassung,
                      material="Muster KL", datenbank="verhoer/kiosk")
    d.klausurkopf("Klausur Datenbanken – Aufgabe A (Muster)", "Kontext: Schulkiosk (Übungs-DB als Platzhalter)",
                  dauer="90 Minuten", hilfsmittel="keine", be=12)
    d.absatz("Der Schulkiosk speichert Helferinnen und Helfer, Schichten, Verkäufe und Produkte. Gegeben ist das "
             "folgende Relationenschema:")
    d.materialblock("1 · Relationenschema", *KIOSK)
    if not eh:
        d.teilaufgabe("a", "**Erläutern** Sie die Kennzeichnungen in der Relation Posten.", 3, kompetenzen=["K03", "K05"], linien=5)
        d.teilaufgabe("b", "**Entwerfen** Sie eine SQL-Abfrage, die für jedes Produkt (Nummer, Bezeichnung) die Anzahl "
                      "verkaufter Stück ausgibt – nur Produkte mit mehr als 40 Stück, absteigend sortiert.", 5,
                      kompetenzen=["K24", "K25", "K26", "K27"], linien=7)
        d.teilaufgabe("c", "**Erweitern** Sie das abgebildete ER-Modell so, dass Fälle von mehreren Ermittlern gemeinsam "
                      "geleitet werden können.", 4, kompetenzen=["K39"], inhalt=[er_beispiel()])
        d.speichern(ZIEL / "DD_Muster_Klausur.docx")
        return
    d.bewertungsbogen([
        Bewertung("a", ("Kernpunkte: (VerkaufNr, ProduktNr) ist zusammengesetzter Primärschlüssel (unterstrichen); beide "
                        "Attribute sind Fremdschlüssel (↑) auf Verkauf bzw. Produkt.",
                        "Teilpunkte: je Kennzeichnung 1 BE. Typischer Fehler P8: „ProduktNr allein ist Schlüssel“."), afb=(2, 1, 0)),
        Bewertung("b", ("Musterlösung (maschinell geprüft):", SQL(SQL_F), ergebnis(SQL_F, "verhoer/kiosk", max_zeilen=3),
                        "Kernpunkte: Verbund über ProduktNr (1), SUM statt COUNT (1, P4), GROUP-BY-Regel (1, P3), "
                        "HAVING statt WHERE (1, P1), Sortierung (1)."), afb=(1, 3, 1)),
        Bewertung("c", ("Beziehungstyp *leitet* wird n:m; ggf. Attribut Rolle an der Beziehung. Begründung im Sachzusammenhang.",
                        "Typischer Fehler P9: Kardinalität 1:n beibehalten."), afb=(0, 2, 2)),
    ], kompetenzen={"a": ["K03", "K05"], "b": ["K24", "K25", "K26", "K27"], "c": ["K39"]})
    d.absatz("Hinweis: Alle SQL-Teile sind nach EH 2025 §8 formuliert (GROUP-BY-Regel, kein Alias in HAVING).")
    d.speichern(ZIEL / "DD_Muster_Klausur_Erwartungshorizont.docx")


def main():
    ZIEL.mkdir(parents=True, exist_ok=True)
    arbeitsblatt("schueler")
    arbeitsblatt("loesung")
    praesentation()
    lehrerhinweise()
    warmup()
    klausur("schueler")
    klausur("loesung")
    for p in sorted(ZIEL.iterdir()):
        print(f"✔ {p.relative_to(REPO)}")


if __name__ == "__main__":
    main()
