#!/usr/bin/env python3
"""Erstellungshilfe: Material der Akte 4 „Chaos im Vereinsarchiv“ (DS 7–8) im Akten-Design.

Erzeugt (Spec §11, §12.1; DS_PLANUNG DS 7/DS 8):
  materialien/Akte4_Vereinsarchiv/1_Praesentation/DD_A4_Vereinsarchiv.pptx
  materialien/Akte4_Vereinsarchiv/2_Arbeitsblaetter/DD_A4_AB1_Die_Excel-Liste.docx, DD_A4_AB2_Ordnung_ins_Archiv.docx
  materialien/Akte4_Vereinsarchiv/3_Unplugged/DD_A4_Unplugged_Anomalie-Rennen.docx, DD_A4_Unplugged_Schluessel-Detektiv.docx
  materialien/Akte4_Vereinsarchiv/4_Lehrerhinweise/DD_A4_Lehrerhinweise.docx
  materialien/Akte4_Vereinsarchiv/5_Loesungen/…_LSG.docx (Arbeitsblätter, Unplugged)
  materialien/Warm-up/DD_Warm-up-Karten_A4.docx

Die erzeugten docx/pptx sind danach maßgeblich (Spec §12); dieses Skript ist nur die Erstellungshilfe.
Alle Daten aus der TuS-DB (seed/datenbanken/tus) bzw. eigene, frei erfundene Daten (Anomalie-Rennen, Schlüssel-Detektiv,
Übungstabellen). Aufruf: python3 quellen/material/akte4.py
"""
import json
import sqlite3
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "werkzeuge"))

from akten_design import (  # noqa: E402
    AktenDokument, AktenPraesentation, Auftrag, Ergebnis, Liste, Loesung, Notiz, Schema, SQL, Tabelle,
    abfrage_ergebnis, warmup_karten_dokument)

MAT = REPO / "materialien"
ORDNER = MAT / "Akte4_Vereinsarchiv"
DB = "tus"

ROHLISTE = ("MitgliederlisteRoh(Mitglied, Geburtsjahr, Abteilungen, Trainer, TrainerTelefon, Beitragsgruppe, "
            "Monatsbeitrag, Halle, HallenAdresse, Eintritt)")
ZERLEGUNG = [
    "Mitglied(<u>MitgliedNr</u>, Vorname, Nachname, Geburtsjahr, ↑Beitragsgruppe, Eintritt)",
    "Beitragsgruppe(<u>Gruppe</u>, Monatsbeitrag)",
    "Abteilung(<u>AbteilungNr</u>, Name, ↑TrainerNr, ↑HalleNr)",
    "Trainer(<u>TrainerNr</u>, Name, Telefon)",
    "Halle(<u>HalleNr</u>, Name, Adresse)",
    "Mitgliedschaft(<u>↑MitgliedNr, ↑AbteilungNr</u>, Seit)",
]


# ================================================================== Daten
def _tus():
    c = sqlite3.connect(":memory:")
    c.executescript((REPO / "seed" / "datenbanken" / "tus" / "basis.sql").read_text(encoding="utf-8"))
    return c


TUS = _tus()


def _wert(spalte, v):
    if v is None:
        return "NULL"
    if spalte == "Monatsbeitrag":
        return f"{v:.2f}".replace(".", ",")
    return str(v)


def roh(zeilen, spalten):
    """Ausschnitt der Rohliste (Zeile = rowid wie im Lab) → Tabelle-Zeilen."""
    aus = []
    for nr in zeilen:
        r = TUS.execute(f"SELECT {', '.join(spalten)} FROM MitgliederlisteRoh WHERE rowid = ?", (nr,)).fetchone()
        aus.append([str(nr)] + [_wert(s, v) for s, v in zip(spalten, r)])
    return aus


BREITE = {"Zeile": 1.25, "Mitglied": 2.4, "Geburtsjahr": 2.1, "Abteilungen": 2.1, "Trainer": 2.1, "TrainerTelefon": 2.6,
          "Beitragsgruppe": 2.6, "Monatsbeitrag": 2.45, "Halle": 3.3, "HallenAdresse": 2.6, "Eintritt": 1.9}


def roh_tabelle(zeilen, spalten, groesse=7.5, breiten=None):
    """Ausschnitt der Rohliste als Tabelle mit festen Spaltenbreiten (Kopf in Plex Mono bricht sonst mitten im Wort)."""
    return Tabelle(["Zeile"] + spalten, roh(zeilen, spalten), groesse=groesse,
                   breiten=breiten or [BREITE[k] for k in ["Zeile"] + spalten])


def ergebnis(sql, max_zeilen=None):
    kopf, zeilen = abfrage_ergebnis(sql, DB)
    if max_zeilen and len(zeilen) > max_zeilen:
        return Ergebnis(kopf, zeilen[:max_zeilen], abgeschnitten=True)
    return Ergebnis(kopf, zeilen)


def sql_mit_ergebnis(sql, max_zeilen=None):
    return [SQL(sql), ergebnis(sql, max_zeilen)]


# Anomalie-Rennen: eigene Daten (SG Weserufer, Übungsliste) – 12 Zeilen, wie die Rohliste aufgebaut
RENN_KOPF = ["Zeile", "Mitglied", "Abteilung", "Trainer", "TrainerTelefon", "Beitragsgruppe", "Monatsbeitrag", "Halle",
             "HallenAdresse"]
_M = ("Helge Meyer", "0000-5150")
_H = ("Sönke Habben", "0000-7370")
_T = ("Maren Tebbe", "0000-6260")
_SUED, _NORD = ("Halle Süd", "Deichstraße 11"), ("Halle Nord", "Kornweg 8")
_BEITRAG = {"Kinder": "6,00", "Jugend": "8,50", "Erwachsene": "12,00"}


def _renn(nr, name, abt, tr, gruppe, halle):
    return [str(nr), name, abt, tr[0], tr[1], gruppe, _BEITRAG[gruppe], halle[0], halle[1]]


RENNLISTE = [
    _renn(1, "Lotta Siemers", "Fußball", _M, "Jugend", _SUED),
    _renn(2, "Joris Wilms", "Fußball", _M, "Erwachsene", _SUED),
    _renn(3, "Pia Tiemann", "Volleyball", _M, "Erwachsene", _NORD),
    _renn(4, "Mats Gerdts", "Badminton", _H, "Erwachsene", _NORD),
    _renn(5, "Ida Kampen", "Volleyball", _M, "Jugend", _NORD),
    _renn(6, "Rune Diekmann", "Fußball", _M, "Kinder", _SUED),
    _renn(7, "Levke Hemmen", "Badminton", _H, "Jugend", _NORD),
    _renn(8, "Emil Saathoff", "Fußball", _M, "Erwachsene", _SUED),
    _renn(9, "Smilla Renken", "Judo", _T, "Jugend", _SUED),
    _renn(10, "Hauke Lampe", "Volleyball", _M, "Erwachsene", _NORD),
    _renn(11, "Nele Bohlken", "Badminton", _H, "Kinder", _NORD),
    _renn(12, "Finn Eggers", "Fußball", _M, "Erwachsene", _SUED),
]
RENN_BREITEN = [1.5, 3.2, 2.6, 3.2, 3.3, 3.3, 3.1, 2.3, 3.2]   # cm, Querformat (25,7 cm)
RENN_KARTEN = [
    ("A1", "an alle", "Trainer Helge Meyer hat eine neue Telefonnummer: **0000-4711**. Tragt sie ein."),
    ("A2", "nur für Person B – verdeckt weitergeben", "Trainer Helge Meyer heißt nach der Heirat **Helge Meyer-Kahl**. "
     "Tragt den neuen Namen ein."),
    ("A3", "an alle – 20 Sekunden!", "Der Monatsbeitrag der Gruppe **Erwachsene** steigt von 12,00 € auf **14,00 €**. "
     "Tragt den neuen Beitrag ein."),
    ("A4", "an alle", "Das letzte Judo-Mitglied (**Zeile 9**) tritt aus. Streicht den Streifen durch und legt ihn weg."),
    ("A5", "an alle", "Neue Abteilung **Bouldern**, Trainerin **Kaja Rohlfs** (0000-8480), **Halle Nord** – noch ohne "
     "Mitglieder. Tragt sie auf einem Leerstreifen ein."),
    ("A6", "an alle", "**Halle Süd** zieht um: neue Adresse **Deichweg 3**. Tragt sie ein."),
]

# Schlüssel-Detektiv: eigene Daten (8 Mitglieder + 3 Nachlieferungen)
DETEKTIV_KOPF = ["Vorname", "Nachname", "Geburtsjahr", "Stadtteil", "Eintritt"]
DETEKTIV = [
    ["Tjark", "Bredehorn", "2008", "Lindenhof", "2019-04-01"],
    ["Hanna", "Wöltjen", "1979", "Mühlenfeld", "2005-09-01"],
    ["Ole", "Harjes", "1974", "Nordheide", "1998-03-01"],
    ["Greta", "Schwarting", "2011", "Altstadt", "2020-08-01"],
    ["Milan", "Osterloh", "1993", "Weserufer", "2016-01-01"],
    ["Insa", "Kolthoff", "2006", "Mühlenfeld", "2017-05-01"],
    ["Jasper", "Uphoff", "1965", "Deichkamp", "1990-10-01"],
    ["Leni", "Ihnken", "2014", "Lindenhof", "2022-02-01"],
]
NACHLIEFERUNG = [
    ("1", "Zwei Neuaufnahmen aus dem Oktober",
     [["Pauline", "Wöltjen", "2008", "Mühlenfeld", "2023-06-01"], ["Hanna", "Kück", "2016", "Altstadt", "2019-04-01"]],
     "Prüft euren Schlüssel: Sind alle zehn Mitglieder noch eindeutig bestimmt?"),
    ("2", "Vater und Sohn",
     [["Ole", "Harjes", "2009", "Nordheide", "2021-03-01"]],
     "Ole Harjes (1974) hat seinen Sohn angemeldet – er heißt ebenfalls Ole Harjes."),
    ("3", "Neumitglied ohne Angabe",
     [["Swantje", "Pundt", "NULL", "Weserufer", "2026-09-01"]],
     "Swantje Pundt wollte ihr Geburtsjahr nicht angeben. Außerdem: Könnten Zwillinge den gleichen Vornamen tragen?"),
]


# ================================================================== AB 4.1 „Die Excel-Liste“ (DS 7)
def ab41(fassung):
    d = AktenDokument("ab", 4, "Die Excel-Liste", fassung=fassung, ermittlung="4.1", ds=7, material="AB 4.1",
                      datenbank=DB, untertitel="Redundanz, Anomalien und nicht-atomare Werte")
    d.kopfband()
    d.fall_einstieg("Der TuS Weserstedt verwaltet seine Mitglieder seit Jahren in einer einzigen Liste. Kassenwartin "
                    "Wiebke Lüttjohann bekommt jeden Monat eine andere Beitragssumme heraus – und Helferin Nr. 23 vom "
                    "Stadtfest war über den TuS gemeldet. Bevor ihr irgendetwas ändert, untersucht ihr die Liste selbst.")
    spalten = ["Mitglied", "Abteilungen", "Trainer", "TrainerTelefon", "Halle", "HallenAdresse"]
    d.beweisstueck(1, "Redundanz",
                   "**Redundanz** bedeutet: Dieselbe *Information* ist mehrfach gespeichert. Gemeint sind nicht doppelte "
                   "Zeilen, sondern Angaben, die sich aus anderen Angaben ergeben und trotzdem immer wieder neu "
                   "eingetragen werden. Ausschnitt der Rohliste `MitgliederlisteRoh` (Spalte Zeile = Zeilennummer wie im Lab):",
                   roh_tabelle([22, 25, 27, 28], spalten, breiten=[1.25, 2.3, 2.1, 2.0, 2.6, 3.25, 2.6]),
                   "Dass Jens Meyer die Telefonnummer 0000-31415 hat, steht in **23 Zeilen** der Rohliste – jede Fußball- "
                   "und Tennis-Zeile wiederholt es. Ebenso wiederholt jede Zeile die Adresse der Halle. In Zeile 27 sieht "
                   "man schon die Folge: ein Zahlendreher (0000-31451).")
    d.beweisstueck(2, "Die drei Anomaliearten – immer an einem Datensatz",
                   "Eine **Anomalie** ist ein Fehler, den die Tabellenstruktur beim Ändern, Löschen oder Einfügen "
                   "erzwingt – auch wenn alle sorgfältig arbeiten.",
                   Tabelle(["Begriff", "Erläuterung am Datensatz (Rohliste TuS)"], [
                       ["**Änderungs­anomalie**", "Ändert sich Jens Meyers Telefonnummer, muss sie in allen 23 Zeilen "
                        "geändert werden. Wird eine Zeile vergessen, widerspricht sich die Liste – Zeile 27 mit 0000-31451 "
                        "zeigt, wie das aussieht."],
                       ["**Lösch­anomalie**", "Tritt Timo Rieken, das einzige Judo-Mitglied (Zeile 12), aus und wird die "
                        "Zeile gelöscht, gehen auch die Abteilung Judo und ihr Trainer Ole Wittkamp samt Telefonnummer "
                        "verloren."],
                       ["**Einfüge­anomalie**", "Die neue Abteilung Boule (Trainerin Gesa Thiele, Bouleplatz Weseraue) kann "
                        "nicht eingetragen werden, solange es kein Mitglied gibt – die Spalte Mitglied müsste leer bleiben."],
                   ], breiten=[3.4, 13.2], groesse=9))
    d.beweisstueck(3, "Redundanz → Anomalie: Ursache und Wirkung",
                   Liste(["Dieselbe Information steht mehrfach (**Redundanz**) → **Änderungsanomalie**: Jede Kopie muss "
                          "gefunden und geändert werden, sonst widersprüchliche Werte.",
                          "**Mehrere Sachverhalte** (Mitglied, Abteilung, Trainer, Halle, Beitrag) in **einer** Tabelle → "
                          "**Löschanomalie** (wer eine Person löscht, löscht Angaben über Abteilung, Trainer oder Halle mit) "
                          "und **Einfügeanomalie** (eine Abteilung lässt sich nur zusammen mit einem Mitglied eintragen)."]),
                   "Merke: Anomalien sind **keine Tippfehler**. Tippfehler werden aber durch Redundanz wahrscheinlicher – "
                   "jede Kopie ist eine neue Gelegenheit dafür.")
    d.beweisstueck(4, "Nicht-atomare Werte",
                   "Ein Wert ist **atomar**, wenn er sich nicht weiter sinnvoll zerlegen lässt. „Turnen, Tischtennis“ in "
                   "einer Zelle (Zeile 31, Heike Dannemann) sind zwei Werte. Folgen für SQL:",
                   SQL("SELECT COUNT(*) AS Anzahl\nFROM MitgliederlisteRoh\nWHERE Abteilungen = 'Tischtennis';"),
                   ergebnis("SELECT COUNT(*) AS Anzahl\nFROM MitgliederlisteRoh\nWHERE Abteilungen = 'Tischtennis';"),
                   "`=` vergleicht den ganzen Zellinhalt: Heike Dannemann fehlt. Mit `LIKE '%Tischtennis%'` wird sie "
                   "gefunden (13 Zeilen) – aber Kerrin Bösch mit dem Tippfehler „Tischtenis“ (Zeile 46) fehlt weiter, und "
                   "`LIKE '%tennis%'` fände auch alle Tennis-Zeilen. Tatsächlich hat die Abteilung **14** Mitglieder. "
                   "Auch `COUNT` und `GROUP BY Abteilungen` zählen eine Kommaliste als eigene „Abteilung“.")
    d.beweisstueck(5, "Operator „erläutern“: Art – Datensatz – Folge",
                   Tabelle(["Nur genannt (reicht nicht)", "Erläutert (volle Punktzahl)"], [
                       ["„In der Tabelle kann eine Löschanomalie auftreten, weil Daten verloren gehen.“",
                        "„**Löschanomalie:** Tritt Timo Rieken (Zeile 12) aus und wird seine Zeile gelöscht, **geht** die "
                        "einzige Angabe zur Abteilung Judo und zu ihrem Trainer Ole Wittkamp mit Telefonnummer **verloren**, "
                        "obwohl die Abteilung weiter besteht.“"],
                   ], breiten=[6.2, 10.4], groesse=9),
                   Notiz("Erläutern ist kein vornehmes Wort für nennen", "Drei Bausteine: **Anomalieart** + **konkreter "
                         "Datensatz** (Zeile, Name, Wert) + **Folge** („…, sonst …“). Satzbaustein: „Wenn … geändert/"
                         "gelöscht/eingefügt wird, muss …, sonst …“."))

    renn_sp = [0, 1, 3, 4, 7, 8]  # ohne Abteilung, Beitragsgruppe, Monatsbeitrag
    renn = Tabelle([RENN_KOPF[i] for i in renn_sp], [[z[i] for i in renn_sp] for z in RENNLISTE],
                   breiten=[1.25, 2.3, 2.05, 2.35, 1.6, 2.35], groesse=7.5)
    d.ermittlungsauftraege([
        Auftrag(1, 1, "PAPIER", "Die Übungsliste aus dem Anomalie-Rennen (eigene Daten der SG Weserufer): (a) Markiere "
                "alle Zellen, die die Telefonnummer von **Trainer Meyer** oder die Adresse der **Halle Süd** wiederholen – "
                "die erste Nennung bleibt unmarkiert. (b) Gib an, wie oft die Information „Halle Süd liegt in der "
                "Deichstraße 11“ gespeichert ist und wie oft sie gespeichert sein müsste.", kompetenzen=["K07"],
                inhalt=[renn], linien=1,
                loesung=Loesung("(a) TrainerTelefon 0000-5150 in den Zeilen 2, 3, 5, 6, 8, 10, 12 (erste Nennung Zeile 1); "
                                "HallenAdresse Deichstraße 11 in den Zeilen 2, 6, 8, 9, 12 (erste Nennung Zeile 1). "
                                "(b) 6-mal gespeichert (Zeilen 1, 2, 6, 8, 9, 12), nötig wäre **einmal** – in einer "
                                "eigenen Tabelle für Hallen.",
                                fehler=[("P10", "Auch die erste Nennung markiert – sie ist nötig, erst jede weitere ist "
                                         "redundant."),
                                        ("P10", "Den Trainernamen in jeder Zeile als „doppelten Datensatz“ bezeichnen: "
                                         "Redundant ist die wiederholte *Information* (Telefonnummer, Adresse).")])),
        Auftrag(2, 1, "PAPIER", "Nenne zu jeder Anomalieart eine Auftragskarte aus dem Anomalie-Rennen und notiere, was "
                "dabei in eurer Liste passiert ist.", kompetenzen=["K08"],
                inhalt=[Tabelle(["Anomalieart", "Karte", "Was ist passiert?"],
                                [["Änderungsanomalie", "", ""], ["Löschanomalie", "", ""], ["Einfügeanomalie", "", ""]],
                                breiten=[3.4, 1.6, 7.4], groesse=9)],
                loesung=Loesung("**Änderung:** A1 (Telefon), A2 (Name – nur Person B ändert, danach zwei Namen für "
                                "denselben Trainer), A3 (Beitrag unter Zeitdruck, einzelne Zeilen behalten 12,00 €) oder A6 "
                                "(Adresse). **Löschung:** A4 – mit Zeile 9 verschwinden Judo, Maren Tebbe und 0000-6260. "
                                "**Einfügung:** A5 – Bouldern lässt sich nur mit leerer Spalte Mitglied (und leerem Beitrag) "
                                "eintragen.",
                                fehler=[("P10", "Einfüge- und Löschanomalie vertauscht."),
                                        ("P10", "„Anomalie = jemand hat sich vertippt“ – die Liste erzwingt den Fehler.")])),
        Auftrag(3, 2, "PAPIER", "Erläutere eine **Löschanomalie** an einem konkreten Datensatz der Rohliste – nicht am "
                "Judo-Beispiel aus Beweisstück 2. Tipp: In der ganzen Rohliste gibt es nur diese beiden passiven Mitglieder.",
                kompetenzen=["K08"],
                inhalt=[roh_tabelle([19, 34], ["Mitglied", "Abteilungen", "Beitragsgruppe", "Monatsbeitrag", "Eintritt"],
                                    breiten=[1.25, 2.15, 2.1, 2.5, 2.45, 1.8])],
                linien=3,
                loesung=Loesung("Imke Stührenberg (Zeile 19) ist bereits ausgetreten und ihre Zeile gelöscht. Tritt nun "
                                "auch Malte Grüttner (Zeile 34) aus und wird seine Zeile gelöscht, **geht** die einzige "
                                "Angabe verloren, dass die Beitragsgruppe **Passiv 4,00 €** kostet. Die Beitragsordnung gilt "
                                "aber weiter – für das nächste passive Mitglied kennt niemand mehr den Beitrag.",
                                "Auch richtig: Jede Zeile, deren Löschen die letzte Angabe zu einer Abteilung, einem Trainer, "
                                "einer Halle oder Beitragsgruppe entfernt (am Datensatz begründet).",
                                fehler=[("P10", "Nur „Daten gehen verloren“ ohne Datensatz und ohne zu sagen, *welche* "
                                         "weitere Information verloren geht."),
                                        ("P10", "Löschen von Zeile 19 allein: Passiv bleibt über Zeile 34 erhalten – keine "
                                         "Löschanomalie.")])),
        Auftrag(4, 2, "LAB", "Spiele im Anomalie-Simulator die Aufgaben A4-E1-03 bis A4-E1-05 durch und halte fest, was die "
                "Liste erzwungen hat.", kompetenzen=["K08"],
                inhalt=[Tabelle(["Aufgabe", "Auftrag", "Anomalieart", "Was passiert in der Liste?"],
                                [["A4-E1-03", "Meyer heißt jetzt Meyer-Kahl", "", ""],
                                 ["A4-E1-04", "Der letzte Judoka", "", ""],
                                 ["A4-E1-05", "Boule ohne Mitglieder", "", ""]],
                                breiten=[1.9, 3.6, 2.6, 4.3], groesse=9)],
                loesung=Loesung("03: Änderungsanomalie – nur Zellen mit genau „Jens Meyer“ werden geändert, die Kommaliste "
                                "„Jens Meyer, Sven Albers“ (Zeile 4) bleibt stehen → derselbe Trainer hat zwei Namen. "
                                "04: Löschanomalie – mit Zeile 12 verschwinden Judo, Ole Wittkamp und 0000-16180 (die Halle "
                                "am Mühlenfeld bleibt über andere Zeilen erhalten). 05: Einfügeanomalie – in der neuen "
                                "Zeile 63 bleiben Mitglied, Geburtsjahr, Beitragsgruppe usw. leer.",
                                fehler=[("P10", "Bei 03 nur die eindeutigen „Jens Meyer“-Zellen markiert, die Kommaliste "
                                         "übersehen.")])),
        Auftrag(5, 3, "PAPIER", "Zum 2026-01-01 stieg der Beitrag der Gruppe Erwachsene von 12,00 € auf 14,00 €. "
                "(a) **Erläutere** am Ergebnis der Abfrage den Zusammenhang zwischen Redundanz und Änderungsanomalie. "
                "(b) Wiebke rechnet die ganze Spalte Monatsbeitrag zusammen und erhält 654,50 €. Erläutere einen "
                "**zweiten** Grund, warum diese Summe nicht die Einnahmen des Vereins sein kann (Tipp: Zeilen 5 und 6).",
                kompetenzen=["K10", "K07"],
                inhalt=[SQL("SELECT Monatsbeitrag, COUNT(*) AS Zeilen\nFROM MitgliederlisteRoh\n"
                            "WHERE Beitragsgruppe = 'Erwachsene'\nGROUP BY Monatsbeitrag\nORDER BY Monatsbeitrag;"),
                        ergebnis("SELECT Monatsbeitrag, COUNT(*) AS Zeilen\nFROM MitgliederlisteRoh\n"
                                 "WHERE Beitragsgruppe = 'Erwachsene'\nGROUP BY Monatsbeitrag\nORDER BY Monatsbeitrag;")],
                linien=6,
                loesung=Loesung(
                    "(a) Der Monatsbeitrag hängt nur von der Beitragsgruppe ab, steht aber **redundant** in jeder der 33 "
                    "Erwachsenen-Zeilen. Bei der Erhöhung musste er deshalb in allen 33 Zeilen geändert werden "
                    "(**Änderungsanomalie**); in 3 Zeilen blieb 12,00 € stehen – die Liste widerspricht sich, dieselbe "
                    "Gruppe hat drei verschiedene Beiträge. Weil die Werte ohnehin uneinheitlich waren, fiel ein weiterer "
                    "falscher Wert (0,00 €) nicht auf. Die abweichenden Zeilen:",
                    SQL("SELECT Mitglied, Abteilungen, Monatsbeitrag\nFROM MitgliederlisteRoh\n"
                        "WHERE Beitragsgruppe = 'Erwachsene'\n  AND Monatsbeitrag != 14.00\nORDER BY Monatsbeitrag, Mitglied;"),
                    ergebnis("SELECT Mitglied, Abteilungen, Monatsbeitrag\nFROM MitgliederlisteRoh\n"
                             "WHERE Beitragsgruppe = 'Erwachsene'\n  AND Monatsbeitrag != 14.00\nORDER BY Monatsbeitrag, Mitglied;"),
                    "(b) Wer in mehreren Abteilungen ist, steht in mehreren Zeilen – mit Beitrag in jeder Zeile. Wiebke "
                    "Sandmann (Zeilen 5 und 6) wird doppelt gezählt, obwohl sie nur einen Beitrag zahlt. Auch die "
                    "Personendaten sind also redundant.",
                    fehler=[("P10", "Nur „Redundanz führt zu Anomalien“ ohne Bezug auf die Beitragsgruppe und die Zeilen."),
                            ("P4", "Die Summe über alle Zeilen für die Einnahmen halten (Zeilen ≠ Mitglieder).")])),
    ])
    abi_sp = ["Mitglied", "Abteilungen", "Trainer", "TrainerTelefon", "Monatsbeitrag", "Halle"]
    d.abi_ecke("Gegeben ist ein Ausschnitt der Tabelle MitgliederlisteRoh eines Sportvereins. Gehen Sie davon aus, dass "
               "der Ausschnitt die vollständige Tabelle ist. **Erläutern** Sie an diesem Ausschnitt je ein Beispiel für "
               "eine Einfüge-, eine Änderungs- und eine Löschanomalie.", be=4, operator="erläutern", afb="II",
               kompetenzen=["K08", "K10"],
               inhalt=[roh_tabelle([7, 9, 14, 15, 22, 30], abi_sp)],
               linien=6,
               loesung=Loesung(
                   "**Änderungsanomalie (1 BE):** Die Telefonnummer von Jens Meyer steht in den Zeilen 9, 15 und 22. Ändert "
                   "sie sich, muss sie in allen drei Zeilen geändert werden; wird eine vergessen, hat der Trainer zwei "
                   "Nummern. (Ebenso: Sven Albers in 14/30, Halle am Mühlenfeld in 14/30.)",
                   "**Löschanomalie (1 BE):** Fenja Rademacher (Zeile 7) ist das einzige Mitglied im Turnen. Tritt sie aus "
                   "und wird die Zeile gelöscht, gehen die Abteilung Turnen, die Trainerin Anke Rosendahl mit Telefonnummer "
                   "und die Turnhalle Schulzentrum verloren.",
                   "**Einfügeanomalie (1 BE):** Eine neue Abteilung (z. B. Boule mit Trainerin) oder ein neuer Trainer kann "
                   "erst eingetragen werden, wenn es ein Mitglied gibt; sonst bliebe die Spalte Mitglied leer.",
                   "**1 BE** für die durchgängige Erläuterung am Datensatz (Zeile/Name/Wert und Folge). gA-Variante: zwei "
                   "der drei Anomaliearten, 3 BE.",
                   fehler=[("P10", "Anomalien nur definiert, ohne Datensatz – höchstens 1 BE."),
                           ("P10", "Löschanomalie mit Jens Meyer begründet: Er steht in mehreren Zeilen, durch eine "
                            "Löschung geht nichts verloren.")]))
    d.spur_im_lab("4.1 „Die Excel-Liste“", "A4-E1-01, 02 (Redundanz, Anomalie zuordnen) → A4-E1-03 … 05 im "
                  "Anomalie-Simulator → A4-E1-06 … 08 (nicht-atomare Werte, Erläutern mit Kernpunkten)",
                  werkzeug="Anomalie-Simulator", text="Cold Case im Lab: A4-E1-CC „Tippfehler im Archiv“ (ohne Punkte).")
    d.cold_case("Der Vereinsabend", "Wiebke möchte wissen, welche Mitglieder in **mehr als einer** Abteilung sind. "
                "Begründe, warum das mit der Rohliste schwierig ist, und schlage eine Tabellenstruktur vor, mit der es "
                "per GROUP BY ginge.", kompetenzen=["K14"], linien=4,
                loesung=Loesung(
                    "Schwierig: Manche Mitglieder stehen in mehreren Zeilen (Zeilen 5/6), andere mit einer Kommaliste in "
                    "einer Zeile (Zeilen 4, 31, 35); `GROUP BY Mitglied` würde außerdem die beiden verschiedenen Lukas "
                    "Behrens (Zeilen 1 und 2) zusammenzählen. Besser: Mitglieder mit eigener Nummer und eine Tabelle mit "
                    "**einer Zeile je Mitglied und Abteilung**:",
                    Schema("Mitglied(<u>MitgliedNr</u>, Vorname, Nachname, …)"),
                    Schema("Mitgliedschaft(<u>↑MitgliedNr, ↑AbteilungNr</u>, Seit)"),
                    SQL("SELECT Mitglied.MitgliedNr, Mitglied.Vorname, Mitglied.Nachname,\n       COUNT(*) AS Abteilungen\n"
                        "FROM Mitglied, Mitgliedschaft\nWHERE Mitglied.MitgliedNr = Mitgliedschaft.MitgliedNr\n"
                        "GROUP BY Mitglied.MitgliedNr, Mitglied.Vorname, Mitglied.Nachname\nHAVING COUNT(*) > 1\n"
                        "ORDER BY Mitglied.Nachname;"),
                    ergebnis("SELECT Mitglied.MitgliedNr, Mitglied.Vorname, Mitglied.Nachname,\n       COUNT(*) AS Abteilungen\n"
                             "FROM Mitglied, Mitgliedschaft\nWHERE Mitglied.MitgliedNr = Mitgliedschaft.MitgliedNr\n"
                             "GROUP BY Mitglied.MitgliedNr, Mitglied.Vorname, Mitglied.Nachname\nHAVING COUNT(*) > 1\n"
                             "ORDER BY Mitglied.Nachname;", max_zeilen=4),
                    "13 Mitglieder, Enno Thaden sogar in drei Abteilungen. (Vorgriff auf DS 8.)"))
    ziel = ORDNER / ("5_Loesungen/DD_A4_AB1_Die_Excel-Liste_LSG.docx" if fassung == "loesung"
                     else "2_Arbeitsblaetter/DD_A4_AB1_Die_Excel-Liste.docx")
    return d.speichern(ziel)


# ================================================================== AB 4.2 „Ordnung ins Archiv“ (DS 8)
def ab42(fassung):
    d = AktenDokument("ab", 4, "Ordnung ins Archiv", fassung=fassung, ermittlung="4.2", ds=8, material="AB 4.2",
                      datenbank=DB, untertitel="Schlüssel beurteilen, Tabellen untersuchen, verlustfrei zerlegen")
    d.kopfband()
    d.fall_einstieg("Edda Lorenz: „Das Phantom kam durch, weil die Liste sich selbst widersprechen konnte. Wir bauen dem "
                    "TuS ein Archiv, in dem das unmöglich ist.“ Dazu braucht jede Tabelle einen guten Primärschlüssel – "
                    "und jede Information genau einen Platz.")
    d.beweisstueck(1, "Schlüssel-Check",
                   Liste(["**eindeutig** – für alle *möglichen* Daten, nicht nur für die gerade gespeicherten",
                          "**nie NULL** – jeder Datensatz muss einen Schlüsselwert haben",
                          "**minimal** – kein Attribut lässt sich weglassen, ohne dass die Eindeutigkeit verloren geht"]),
                   "**Ausschnitt-Falle:** Ein Datenausschnitt kann Eindeutigkeit nur **widerlegen**, nie beweisen. In den "
                   "ersten acht Zeilen der Tabelle Mitglied sind alle Nachnamen verschieden – die Tabelle enthält aber zwei "
                   "verschiedene Mitglieder namens Lukas Behrens (2011 und 1979).",
                   "**Natürlich oder künstlich?** Ein natürlicher Schlüssel stammt aus den Daten selbst (z. B. `Gruppe` = "
                   "„Erwachsene“ in Beitragsgruppe). Ist kein natürlicher Schlüssel sicher, vergibt man einen "
                   "**künstlichen**: `MitgliedNr`.",
                   "**Zusammengesetzt:** Erst die Kombination ist eindeutig – z. B. (<u>↑MitgliedNr, ↑AbteilungNr</u>) "
                   "in Mitgliedschaft. Achtung bei **Mehrfachvorkommen**: Darf dasselbe Paar mehrmals vorkommen "
                   "(Wiedereintritt), reicht die Kombination nicht mehr.")
    d.beweisstueck(2, "Eine zusammengelegte Tabelle untersuchen",
                   "**Prüffrage:** Hängt ein Nicht-Schlüssel-Attribut von einem anderen Nicht-Schlüssel-Attribut ab (oder "
                   "nur von einem *Teil* eines zusammengesetzten Schlüssels)? Dann steht dieselbe Information mehrfach "
                   "→ Anomalien sind möglich.",
                   Schema("MitgliedBeitrag(<u>MitgliedNr</u>, Vorname, Nachname, Beitragsgruppe, Monatsbeitrag)"),
                   "Hier hängt Monatsbeitrag von Beitragsgruppe ab: Jede Erwachsenen-Zeile wiederholt 14,00 € → "
                   "Änderungsanomalie bei einer Beitragserhöhung; Einfügeanomalie für eine neue Beitragsgruppe ohne Mitglied.",
                   Schema("Beitragsgruppe(<u>Gruppe</u>, Monatsbeitrag)"),
                   "Hier hängt das einzige Nicht-Schlüssel-Attribut nur vom Schlüssel ab. Jeder Beitrag steht genau einmal: "
                   "**Keine Anomalie möglich.** Auch das ist eine Antwort, die man im Abitur begründen können muss.")
    d.beweisstueck(3, "Verlustfrei und redundanzfrei zerlegen (eA)",
                   Liste(["**Atomar machen** (eine Zeile je Mitglied und Abteilung, Vorname/Nachname) und **Schlüssel "
                          "festlegen** (künstliche Nummern, wo kein natürlicher Schlüssel sicher ist).",
                          "**Abhängigkeiten suchen:** Telefon ← Trainer, Adresse ← Halle, Monatsbeitrag ← Beitragsgruppe, "
                          "Trainer und Halle ← Abteilung, Seit ← Mitglied und Abteilung.",
                          "**Je Sachverhalt eine Tabelle** mit genau den Attributen, die von ihrem Schlüssel abhängen; "
                          "**verbinden** über Fremdschlüssel (↑)."], nummeriert=True),
                   Schema(ZERLEGUNG[0] + " · " + ZERLEGUNG[1]),
                   Schema(ZERLEGUNG[2] + " · " + ZERLEGUNG[3]),
                   Schema(ZERLEGUNG[4] + " · " + ZERLEGUNG[5]),
                   "Kontrolle: Der Verbund ergibt für Enno Thaden wieder die drei Zeilen 54–56 der Rohliste.",
                   Loesung(*sql_mit_ergebnis(
                       "SELECT Mitglied.Vorname, Mitglied.Nachname, Abteilung.Name AS Abteilung, Trainer.Name AS Trainer\n"
                       "FROM Mitglied, Mitgliedschaft, Abteilung, Trainer\n"
                       "WHERE Mitglied.MitgliedNr = Mitgliedschaft.MitgliedNr\n"
                       "  AND Mitgliedschaft.AbteilungNr = Abteilung.AbteilungNr\n"
                       "  AND Abteilung.TrainerNr = Trainer.TrainerNr\n"
                       "  AND Mitglied.Nachname = 'Thaden'\nORDER BY Abteilung.Name;")))
    d.beweisstueck(4, "Redundanzfreiheit begründen (eA) – Musterformulierung",
                   "„Das Schema ist **redundanzfrei**, weil in jeder Tabelle jedes Nicht-Schlüssel-Attribut nur vom "
                   "(ganzen) Primärschlüssel dieser Tabelle abhängt – z. B. Telefon nur von TrainerNr, Monatsbeitrag nur "
                   "von Gruppe. Deshalb steht jede Information genau einmal: Jens Meyers Telefonnummer einmal in Trainer. "
                   "Die Zerlegung ist **verlustfrei**, weil die Tabellen über Fremdschlüssel verbunden sind und ihr Verbund "
                   "jede Zeile der Rohliste wieder ergibt.“")
    d.beweisstueck(5, "KÜR · nicht im Abitur: funktionale Abhängigkeit und Normalformen",
                   "Eine **funktionale Abhängigkeit** A → B bedeutet: Zu jedem Wert von A gehört genau ein Wert von B, "
                   "z. B. `Beitragsgruppe → Monatsbeitrag`.",
                   Liste(["**1. NF:** nur atomare Werte (die Rohliste mit „Fußball, Tennis“ ist nicht in 1. NF).",
                          "**2. NF:** 1. NF, und kein Nicht-Schlüssel-Attribut hängt nur von einem *Teil* eines "
                          "zusammengesetzten Schlüssels ab.",
                          "**3. NF:** 2. NF, und keine transitive Abhängigkeit: MitgliedNr → Beitragsgruppe → Monatsbeitrag "
                          "ist verboten, deshalb eine eigene Tabelle Beitragsgruppe."]),
                   "Im Abitur begründest du Redundanzfreiheit ohne diese Begriffe (Beweisstück 4).")

    trainer = Tabelle(["Name", "Telefon", "Geburtsjahr"],
                      [["Jens Meyer", "0000-31415", "1975"], ["Birte Haschke", "0000-27182", "1990"],
                       ["Ole Wittkamp", "0000-16180", "1968"], ["Gesa Thiele", "NULL", "1959"]], groesse=9)
    kursraum = Tabelle(["KursNr", "Kurs", "Leitung", "Raum", "Etage"],
                       [["1", "Rückenfit", "Anke Rosendahl", "Gymnastikraum", "1. OG"],
                        ["2", "Yoga am Abend", "Hilke Abeling", "Gymnastikraum", "1. OG"],
                        ["3", "Schach-Treff", "Ulf Mammen", "Clubraum", "EG"],
                        ["4", "Erste Hilfe", "Anke Rosendahl", "Clubraum", "EG"],
                        ["5", "Tanz für Kids", "Jana Tebbe", "Spiegelsaal", "2. OG"]], pk=("KursNr",), groesse=9)
    halle = Tabelle(["HalleNr", "Name", "Adresse"],
                    [[str(r[0]), r[1], r[2]] for r in TUS.execute("SELECT HalleNr, Name, Adresse FROM Halle ORDER BY HalleNr")],
                    pk=("HalleNr",), groesse=9)
    spielplan = Tabelle(["SpielNr", "Datum", "Heimteam", "HeimTrainer", "Gastteam", "GastTrainer", "Halle", "HallenAdresse"],
                        [["1", "2026-10-03", "TuS Weserstedt", "Sven Albers", "SV Deichkamp", "Rune Bargmann",
                          "Halle am Mühlenfeld", "Mühlenweg 12"],
                         ["2", "2026-10-10", "SV Deichkamp", "Rune Bargmann", "MTV Nordheide", "Imke Siemers", "Deichhalle",
                          "Deichstraße 20"],
                         ["3", "2026-10-17", "MTV Nordheide", "Imke Siemers", "TuS Weserstedt", "Sven Albers", "Heidehalle",
                          "Heideweg 3"],
                         ["4", "2026-10-24", "TuS Weserstedt", "Sven Albers", "MTV Nordheide", "Imke Siemers",
                          "Turnhalle Schulzentrum", "Schulweg 5"]],
                        pk=("SpielNr",), breiten=[1.5, 1.8, 2.1, 2.35, 2.1, 2.35, 2.2, 2.5], groesse=8)
    auftraege = [
        Auftrag(1, 1, "PAPIER", "Der Vorstand will eine Tabelle `Trainer(Name, Telefon, Geburtsjahr)` anlegen. "
                "**Beurteile** die drei Schlüsselvorschläge **Name**, **Telefon** und **(Name, Geburtsjahr)** anhand der "
                "drei Kriterien und schlage einen besseren vor.", kompetenzen=["K02"], inhalt=[trainer], linien=4,
                loesung=Loesung(
                    "**Name:** nicht geeignet – ein zweiter Trainer mit gleichem Namen ist jederzeit möglich (dass die vier "
                    "Namen verschieden sind, beweist nichts). **Telefon:** nicht geeignet – kann NULL sein (Gesa Thiele), "
                    "kann sich ändern und kann geteilt werden (z. B. Vereinstelefon). **(Name, Geburtsjahr):** sehr "
                    "wahrscheinlich eindeutig, aber nicht garantiert; außerdem kann das Geburtsjahr unbekannt sein. "
                    "**Besser:** künstlicher Schlüssel `TrainerNr` – eindeutig, nie NULL, minimal.",
                    fehler=[("P8", "„Im Ausschnitt sind alle Namen verschieden, also eindeutig“ – Ausschnitt-Falle."),
                            ("P8", "Nie-NULL-Kriterium bei Telefon übersehen.")])),
        Auftrag(2, 2, "PAPIER", "Im Vereinsheim gibt es Kurse in verschiedenen Räumen. **Untersuche** die zusammengelegte "
                "Tabelle `KursRaum` auf Anomalien. Erläutere jede gefundene Anomalie an einem Datensatz.",
                kompetenzen=["K09"], inhalt=[kursraum], linien=5,
                loesung=Loesung(
                    "Etage hängt vom Raum ab, nicht von der KursNr → die Angabe „Gymnastikraum liegt im 1. OG“ steht "
                    "zweimal (Kurse 1, 2), „Clubraum im EG“ ebenfalls (3, 4). **Änderungsanomalie:** Zieht der "
                    "Gymnastikraum ins EG um, müssen die Zeilen 1 und 2 geändert werden, sonst zwei Etagen für einen Raum. "
                    "**Löschanomalie:** Wird Kurs 5 gestrichen, geht verloren, dass der Spiegelsaal im 2. OG liegt. "
                    "**Einfügeanomalie:** Ein neuer Raum ohne Kurs kann nicht eingetragen werden (KursNr wäre NULL).",
                    "Leitung kommt zweimal vor (Anke Rosendahl), es hängen aber keine weiteren Angaben an ihr – dadurch "
                    "entsteht hier keine Anomalie.",
                    fehler=[("P10", "„Anke Rosendahl steht doppelt, also Redundanz“ – ein mehrfach vorkommender Wert ist "
                             "noch keine wiederholte Information."),
                            ("P10", "Anomalien nur benannt, ohne Kurs/Raum.")])),
        Auftrag(3, 2, "PAPIER", "**Begründe**, warum in der Tabelle `Halle` des neuen Archivs keine Anomalie möglich ist. "
                "Gehe dabei auf Ändern, Löschen und Einfügen ein.", kompetenzen=["K09"], inhalt=[halle], linien=4,
                loesung=Loesung(
                    "Name und Adresse hängen nur vom Primärschlüssel HalleNr ab; keine Information steht mehrfach. "
                    "**Ändern:** Eine neue Adresse wird in genau einer Zeile geändert. **Löschen:** Wird eine Halle "
                    "gelöscht, verschwinden nur die Angaben zu dieser Halle – gewollt. **Einfügen:** Eine neue Halle "
                    "(z. B. ein Bootshaus) kann ohne Abteilung oder Mitglied eingetragen werden.",
                    fehler=[("P8", "„Keine Adresse kommt doppelt vor“ – mit den Daten statt mit den Abhängigkeiten "
                             "argumentiert."),
                            ("P10", "Nur „die Tabelle ist klein“ / „hat einen künstlichen Schlüssel“ – keine Begründung.")])),
        Auftrag(4, 3, "PAPIER", "(eA) Der Handballkreis führt den Spielplan in einer Tabelle. Jedes Team hat genau einen "
                "Trainer; in welcher Halle ein Spiel stattfindet, wird je Spiel festgelegt. **Zerlege** `Spielplan` "
                "verlustfrei in redundanzfreie Tabellen und notiere das Schema in Kurzschreibweise (Primärschlüssel "
                "unterstrichen, Fremdschlüssel mit ↑). Daten: siehe Spielplan oben.", kompetenzen=["K11", "K04"], linien=5,
                loesung=Loesung(
                    Schema("Team(<u>Teamname</u>, Trainer)"),
                    Schema("Halle(<u>Hallenname</u>, HallenAdresse)"),
                    Schema("Spiel(<u>SpielNr</u>, Datum, ↑Heimteam, ↑Gastteam, ↑Halle)"),
                    "Heimteam und Gastteam verweisen beide auf Team (zwei Rollen derselben Tabelle – Vorgriff auf DS 10), "
                    "Halle auf Halle. Redundanzfrei: Trainer hängt nur vom Team ab, HallenAdresse nur von der Halle; im "
                    "Spiel bleiben nur Angaben, die vom Spiel abhängen. Verlustfrei: Der Verbund über die drei Fremdschlüssel "
                    "ergibt jede Zeile des Spielplans.",
                    "Auch richtig mit künstlichen Schlüsseln: Team(<u>TeamNr</u>, Name, Trainer), Halle(<u>HalleNr</u>, "
                    "Name, Adresse), Spiel(<u>SpielNr</u>, Datum, ↑HeimTeamNr, ↑GastTeamNr, ↑HalleNr).",
                    fehler=[("P9", "HeimTrainer/GastTrainer im Spiel gelassen – der Trainer eines Teams stünde in jedem "
                             "Spiel erneut."),
                            ("P7", "Zwei Fremdschlüssel gleichen Namens (↑Team, ↑Team) – Rollen Heim/Gast unterscheiden."),
                            ("P9", "Halle dem Team zugeordnet – widerspricht der Vorgabe (TuS spielt in zwei Hallen).")])),
        Auftrag(5, 3, "LAB", "(eA) Löse das Zerlegungs-Puzzle A4-E2-06 und baue in der Schema-Werkbank das neue Archiv "
                "(A4-E2-07). Notiere die Rückmeldung, die dir am meisten geholfen hat, und warum.", kompetenzen=["K11"],
                linien=3,
                loesung=Loesung("Musterzerlegung siehe Beweisstück 3. Häufige Rückmeldungen: „TrainerTelefon hängt von "
                                "Trainer ab, nicht vom Schlüssel (Abteilung)“, „Mitgliedschaft fehlt – die Zuordnung "
                                "Mitglied – Abteilung geht verloren“.",
                                fehler=[("P9", "Zerlegung ohne Mitgliedschaft: nicht verlustfrei."),
                                        ("P9", "Monatsbeitrag in Mitglied gelassen: nicht redundanzfrei.")])),
    ]
    d.ermittlungsauftraege(auftraege[:3])
    d.inhalt("**Material zu Auftrag 4 (eA): Spielplan des Handballkreises (Ausschnitt)**", spielplan)
    d.ermittlungsauftraege(auftraege[3:], ueberschrift=None)
    ah = Tabelle(["AbteilungNr", "Abteilung", "Trainer", "Halle", "HallenAdresse"],
                 [[str(r[0]), r[1], r[2], r[3], r[4]] for r in TUS.execute(
                     "SELECT a.AbteilungNr, a.Name, t.Name, h.Name, h.Adresse FROM Abteilung a, Trainer t, Halle h "
                     "WHERE a.TrainerNr = t.TrainerNr AND a.HalleNr = h.HalleNr ORDER BY a.AbteilungNr")],
                 pk=("AbteilungNr",), groesse=8.5, breiten=[2.5, 2.4, 3.0, 4.4, 3.2])
    d.abi_ecke("Ein Verein legt die Tabellen Abteilung und Halle zur Tabelle AbteilungHalle zusammen (Ausschnitt). "
               "Trainer und Hallen sind über ihren Namen eindeutig. **Untersuchen** Sie die Tabelle auf Anomalien und "
               "**beurteilen** Sie, ob AbteilungNr weiterhin als Primärschlüssel geeignet ist.", be=5,
               operator="untersuchen / beurteilen", afb="II/III", kompetenzen=["K09", "K02", "K08"], inhalt=[ah], linien=5,
               loesung=Loesung(
                   "**Untersuchen (3 BE):** HallenAdresse hängt von Halle ab, nicht von AbteilungNr → „Halle am Mühlenfeld "
                   "liegt im Mühlenweg 12“ steht dreimal (Abteilungen 2, 4, 6). **Änderungsanomalie:** Eine neue Adresse "
                   "muss in drei Zeilen geändert werden, sonst widersprüchlich. **Löschanomalie:** Wird Boule (7) "
                   "aufgelöst, geht verloren, dass der Bouleplatz Weseraue im Auenweg 4 liegt (ebenso Tennis/"
                   "Tennisanlage Lindenhof). **Einfügeanomalie:** Eine neue Halle ohne Abteilung kann nicht eingetragen "
                   "werden. Trainer: Jens Meyer kommt zweimal vor, an ihm hängen hier aber keine weiteren Angaben – keine "
                   "Anomalie.",
                   "**Beurteilen (2 BE):** AbteilungNr ist weiterhin eindeutig (jede Abteilung genau eine Zeile), nie NULL "
                   "und minimal – als Primärschlüssel **geeignet**. Das Problem der Tabelle ist nicht der Schlüssel, "
                   "sondern die Abhängigkeit Halle → HallenAdresse; Abhilfe: Halle als eigene Tabelle, in "
                   "AbteilungHalle nur ↑HalleNr.",
                   fehler=[("P8", "„Schlüssel ungeeignet, weil Halle doppelt vorkommt“ – Schlüssel und Redundanz "
                            "verwechselt."),
                           ("P10", "Anomalien bei Trainer behauptet (Jens Meyer doppelt), ohne abhängige Information."),
                           ("P10", "Anomalie nur benannt, nicht an der Halle am Mühlenfeld erläutert.")]))
    d.spur_im_lab("4.2 „Ordnung ins Archiv“", "A4-E2-01 … 05 (gA/eA: Schlüssel, Ausschnitt-Falle, zusammengelegte "
                  "Tabellen) · A4-E2-06 … 08 (eA: Zerlegen, Begründen) · danach **Verhör 4** (Musikschule)",
                  werkzeug="Zerlegungs-Puzzle, Schema-Werkbank",
                  text="Cold Case im Lab: A4-E2-CC „KÜR – Normalformen-Check“ (ohne Punkte, nicht im Abitur).")
    d.cold_case("KÜR (nicht im Abitur): Normalformen", "Bestimme drei funktionale Abhängigkeiten der Rohliste "
                f"`{ROHLISTE}` und zeige an deiner Zerlegung, dass sie in 3. Normalform ist.",
                kompetenzen=["K13"], linien=5,
                loesung=Loesung(
                    "FAs (über die atomisierte Rohliste mit MitgliedNr): MitgliedNr → Vorname, Nachname, Geburtsjahr, "
                    "Beitragsgruppe, Eintritt · Beitragsgruppe → Monatsbeitrag · Abteilung → Trainer, Halle · Trainer → "
                    "TrainerTelefon · Halle → HallenAdresse · (MitgliedNr, Abteilung) → Seit. Keine FA: Trainer ↛ "
                    "Abteilung (Jens Meyer leitet zwei), Halle ↛ Abteilung.",
                    "Rohliste: nicht 1. NF (Kommalisten). Atomisiert mit Schlüssel (MitgliedNr, Abteilung): nicht 2. NF "
                    "(Vorname hängt nur von MitgliedNr ab). Zerlegung aus Beweisstück 3: atomar; in Mitgliedschaft hängt "
                    "Seit vom ganzen Schlüssel ab (2. NF); in keiner Tabelle hängt ein Nicht-Schlüssel-Attribut von einem "
                    "anderen ab (3. NF) – Monatsbeitrag steht nur noch in Beitragsgruppe."))
    ziel = ORDNER / ("5_Loesungen/DD_A4_AB2_Ordnung_ins_Archiv_LSG.docx" if fassung == "loesung"
                     else "2_Arbeitsblaetter/DD_A4_AB2_Ordnung_ins_Archiv.docx")
    return d.speichern(ziel)


# ================================================================== Unplugged DS 7: Anomalie-Rennen (Querformat)
def _schnittlinie(d):
    p = d.absatz("")
    p.paragraph_format.space_before = d.doc.styles["Normal"].paragraph_format.space_after
    r = p.add_run("✂ " + "- " * int(d.breite * 6.2))
    d._lauf_stil(r, groesse=7, farbe="8F8270")


def anomalie_rennen(fassung):
    d = AktenDokument("unplugged", 4, "Anomalie-Rennen", fassung=fassung, ds=7, material="Unplugged DS 7",
                      untertitel="Kopiervorlage · je Team: 12 Zeilenstreifen, 2 Leerstreifen, 6 Auftragskarten, "
                                 "1 Auswertungsbogen", querformat=True)
    d.kopfband(name_datum=False)
    d.notiz("So läuft das Rennen (20 Minuten)",
            Liste(["Jede Person im Team bekommt 3 Streifen (bei 3 Personen: 4) – „Du pflegst diese Datensätze.“ Person A: "
                   "Zeilen 1–3, B: 4–6, C: 7–9, D: 10–12 (bei drei Personen A: 1–4, B: 5–8, C: 9–12). Fremde Streifen "
                   "nicht anfassen, Absprachen nur flüsternd.",
                   "Die Lehrkraft deckt im 45-Sekunden-Takt Auftragskarten auf. Manche Karten sieht nur **eine** Person.",
                   "Am Ende legt ihr die Streifen wieder zur Liste zusammen und zählt mit dem Auswertungsbogen.",
                   "Gewonnen hat das Team mit den wenigsten Widersprüchen."], nummeriert=True),
            "Die Liste ist eine Übungsliste mit eigenen Daten (SG Weserufer) – im Lab arbeitet ihr danach mit der echten "
            "Liste des TuS Weserstedt.")
    if fassung == "loesung":
        d.ueberschrift("Auflösung für die Lehrkraft", 2)
        d.tabelle(["Karte", "Anomalie", "Was die Liste erzwingt", "Typisches Ergebnis im Team"], [
            ["A1", "Änderung", "Telefon von Meyer in 8 Zeilen (1, 2, 3, 5, 6, 8, 10, 12) ändern", "meist vollständig – "
             "alle haben die Karte gesehen"],
            ["A2", "Änderung", "Name in denselben 8 Zeilen ändern – nur Person B (Zeilen 4–6) weiß davon",
             "Zeilen 5, 6: Meyer-Kahl, übrige: Meyer → zwei Namen für einen Trainer"],
            ["A3", "Änderung", "Beitrag Erwachsene in 6 Zeilen (2, 3, 4, 8, 10, 12) ändern, 20 s Zeit",
             "einzelne Zeilen behalten 12,00 € → zwei Beiträge für dieselbe Gruppe"],
            ["A4", "Löschung", "Zeile 9 streichen", "Judo, Maren Tebbe und 0000-6260 sind weg; Halle Süd bleibt "
             "über andere Zeilen erhalten"],
            ["A5", "Einfügung", "Leerstreifen mit Bouldern – Mitglied, Beitragsgruppe, Beitrag bleiben leer",
             "„unmöglicher“ Eintrag mit leerer Mitglied-Spalte"],
            ["A6", "Änderung", "Adresse der Halle Süd in 6 Zeilen (1, 2, 6, 8, 9, 12) ändern – Zeile 9 ist evtl. "
             "schon gestrichen", "vergessene Zeilen → zwei Adressen für eine Halle"],
        ], breiten=[1.4, 2.4, 10.5, 11.4])
        d.inhalt("Auflösungssatz: *„Fehlerfrei geht es nur, wenn ihr bei jeder Änderung alle Zeilen findet. Das Problem ist "
                 "die Liste, nicht ihr.“* Sicherung: je Anomalieart ein Beispiel mit Zeilennummer an die Tafel, Redundanz "
                 "als Ursache markieren. Übergang zum Lab: Dort heißt die neue Abteilung **Boule** (Trainerin Gesa Thiele, "
                 "Bouleplatz Weseraue, A4-E1-05).")
    # Streifen: 6 je Seite (Querformat)
    d.seitenumbruch()
    d.ueberschrift("Zeilenstreifen – entlang der Linien ausschneiden", 2)
    for i, z in enumerate(RENNLISTE):
        if i == 6:
            d.seitenumbruch()
            d.ueberschrift("Zeilenstreifen (Fortsetzung)", 2)
        d.tabelle(RENN_KOPF, [z], breiten=RENN_BREITEN, groesse=10)
        _schnittlinie(d)
    d.seitenumbruch()
    d.ueberschrift("Leerstreifen für neue Einträge", 2)
    for _ in range(2):
        t = d._datentabelle(d.doc, Tabelle(RENN_KOPF, [[""] * 9], breiten=RENN_BREITEN, groesse=10), d.breite)
        t.rows[1].height = __import__("docx.shared", fromlist=["Cm"]).Cm(1.4)
        _schnittlinie(d)
    # Auftragskarten
    d.seitenumbruch()
    d.ueberschrift("Auftragskarten – für die Lehrkraft, verdeckt und nummeriert", 2)
    tab = d.doc.add_table(rows=2, cols=3)
    from akten_design import _tabelle_breiten, _zelle_rahmen, _zelle_innenabstand, _zeile_nicht_teilen
    _tabelle_breiten(tab, [d.breite / 3] * 3)
    for i, (nr, wer, text) in enumerate(RENN_KARTEN):
        z = tab.rows[i // 3].cells[i % 3]
        _zelle_rahmen(z, "8F8270", 0.75, art="dashed")
        _zelle_innenabstand(z, 0.4, 0.4, 0.4, 0.4)
        p = z.paragraphs[0]
        p.style = d.doc.styles["DD Tabellentext"]
        d._etikett(p, f"AUFTRAG {nr} · {wer.upper()}", groesse=8, farbe="B3261E", fett=True)
        p = z.add_paragraph(style="DD Tabellentext")
        p.paragraph_format.space_before = p.paragraph_format.space_after = d.doc.styles["Normal"].paragraph_format.space_after
        d._text(p, text, groesse=13)
    for zeile in tab.rows:
        _zeile_nicht_teilen(zeile)
        zeile.height = __import__("docx.shared", fromlist=["Cm"]).Cm(6.2)
    d._nach_kasten(d.doc)
    # Auswertungsbogen
    d.seitenumbruch()
    d.ueberschrift("Auswertungsbogen des Teams", 2)
    d.inhalt("Legt die Streifen in der Reihenfolge der Zeilennummern zusammen. Tragt ein, was ihr findet – immer mit "
             "Zeilennummer.")
    d.tabelle(["Was zählt?", "Zeilen und Beispiel", "Anzahl"], [
        ["**Widersprüche:** Dieselbe Sache hat zwei verschiedene Werte (Name, Telefon, Adresse, Beitrag).", "", ""],
        ["**Verlorene Information:** Was weiß niemand mehr, seit ein Streifen gestrichen wurde?", "", ""],
        ["**Unmögliche Einträge:** Zeilen mit Lücken, die eigentlich nicht leer sein dürften.", "", ""],
    ], breiten=[9.0, 13.5, 3.0], groesse=10)
    d.inhalt(Tabelle(["Anomalieart", "Unser Beispiel (Karte, Zeile, Folge)"],
                     [["Änderungsanomalie", ""], ["Löschanomalie", ""], ["Einfügeanomalie", ""]],
                     breiten=[5.0, 20.5], groesse=10),
             "Gesamtzahl der Widersprüche: ________   –   *Redundanz* ist die Ursache von: ______________________________")
    name = ("5_Loesungen/DD_A4_Unplugged_Anomalie-Rennen_LSG.docx" if fassung == "loesung"
            else "3_Unplugged/DD_A4_Unplugged_Anomalie-Rennen.docx")
    return d.speichern(ORDNER / name)


# ================================================================== Unplugged DS 8: Schlüssel-Detektiv
def schluessel_detektiv(fassung):
    from akten_design import _tabelle_breiten, _zelle_rahmen, _zelle_innenabstand, _zeile_nicht_teilen
    d = AktenDokument("unplugged", 4, "Schlüssel-Detektiv", fassung=fassung, ds=8, material="Unplugged DS 8",
                      untertitel="Kopiervorlage · je Team: 8 Datenstreifen, 4 Schlüssel-Kärtchen; bei der Lehrkraft: "
                                 "3 Nachlieferungskarten")
    d.kopfband(name_datum=False)
    d.notiz("So läuft der Schlüssel-Detektiv (15 Minuten)",
            Liste(["Auftrag: *Findet eine möglichst kleine Attributkombination, die jedes Mitglied eindeutig bestimmt.* "
                   "Legt euer Kärtchen „Unser Schlüssel: …“ sichtbar auf den Tisch.",
                   "Die Lehrkraft liefert nacheinander drei Karten mit neuen Mitgliedern nach. Passt euer Schlüssel nicht "
                   "mehr, dreht ihr das Kärtchen um und legt ein neues.",
                   "Am Ende: Kann ein Datenausschnitt je **beweisen**, dass ein Attribut eindeutig ist?"], nummeriert=True))
    if fassung == "loesung":
        d.ueberschrift("Auflösung für die Lehrkraft", 2)
        d.tabelle(["Vorschlag", "fällt bei", "Grund"], [
            ["Nachname (oder Vorname, Geburtsjahr, Eintritt)", "Nachlieferung 1",
             "Pauline Wöltjen (wie Hanna Wöltjen), Hanna Kück (wie Hanna Wöltjen), Geburtsjahr 2008 und Eintritt "
             "2019-04-01 doppelt"],
            ["Stadtteil", "sofort", "Mühlenfeld und Lindenhof schon in den 8 Streifen doppelt"],
            ["(Vorname, Nachname)", "Nachlieferung 2", "Vater und Sohn Ole Harjes"],
            ["(Vorname, Nachname, Geburtsjahr)", "Nachlieferung 3", "Geburtsjahr NULL bei Swantje Pundt (nie NULL "
             "verletzt); Zwillinge gleichen Namens wären möglich"],
            ["(Vorname, Nachname, Geburtsjahr, Stadtteil)", "Impuls", "nicht minimal, wenn drei Attribute schon reichen "
             "würden – und trotzdem nicht sicher"],
            ["MitgliedNr (künstlich)", "–", "eindeutig für alle möglichen Daten, nie NULL, minimal: die sichere Wahl"],
        ], breiten=[5.0, 2.8, 9.2], groesse=9)
        d.inhalt("Sicherung (Werkzeugkarte 6): eindeutig für **alle möglichen** Daten · nie NULL · minimal · künstlicher "
                 "Schlüssel als sichere Wahl. Ein Ausschnitt kann Eindeutigkeit **nur widerlegen**. Danach kurze "
                 "Demonstration „Schere-Zerlegung“ der Rohliste am Beamer.")
    d.ueberschrift("Datenstreifen – ausschneiden (je Team ein Satz)", 2)
    for z in DETEKTIV:
        d.tabelle(DETEKTIV_KOPF, [z], breiten=[3.2, 3.6, 2.9, 3.6, 3.7], groesse=11)
        _schnittlinie(d)
    d.ueberschrift("Schlüssel-Kärtchen", 2)
    tab = d.doc.add_table(rows=2, cols=2)
    _tabelle_breiten(tab, [d.breite / 2] * 2)
    for i in range(4):
        z = tab.rows[i // 2].cells[i % 2]
        _zelle_rahmen(z, "8F8270", 0.75, art="dashed")
        _zelle_innenabstand(z, 0.35, 0.4, 0.35, 0.4)
        p = z.paragraphs[0]
        p.style = d.doc.styles["DD Tabellentext"]
        d._etikett(p, "UNSER SCHLÜSSEL", groesse=8, farbe="B3261E", fett=True)
        p = z.add_paragraph(style="DD Tabellentext")
        d._text(p, "\n____________________________________\n\n____________________________________", groesse=11)
    for zeile in tab.rows:
        _zeile_nicht_teilen(zeile)
    d._nach_kasten(d.doc)
    d.seitenumbruch()
    d.ueberschrift("Nachlieferungskarten – für die Lehrkraft, nacheinander aufdecken", 2)
    for nr, titel, zeilen, text in NACHLIEFERUNG:
        tab = d.doc.add_table(rows=1, cols=1)
        _tabelle_breiten(tab, [d.breite])
        z = tab.rows[0].cells[0]
        _zelle_rahmen(z, "B08D3C", 1.0, art="dashed")
        _zelle_innenabstand(z, 0.35, 0.4, 0.35, 0.4)
        _zeile_nicht_teilen(tab.rows[0])
        p = z.paragraphs[0]
        p.style = d.doc.styles["DD Tabellentext"]
        d._etikett(p, f"NACHLIEFERUNG {nr} · {titel.upper()}", groesse=8.5, farbe="7A5E1F", fett=True)
        d._fuelle(z, [text, Tabelle(DETEKTIV_KOPF, zeilen, breiten=[3.0, 3.4, 2.8, 3.4, 3.6], groesse=11)], d.breite - 0.8)
        d._nach_kasten(d.doc)
    name = ("5_Loesungen/DD_A4_Unplugged_Schluessel-Detektiv_LSG.docx" if fassung == "loesung"
            else "3_Unplugged/DD_A4_Unplugged_Schluessel-Detektiv.docx")
    return d.speichern(ORDNER / name)


# ================================================================== Präsentation
FOLIEN = {}  # Abschnitt → (erste, letzte) Foliennummer, für die Lehrerhinweise


def praesentation():
    p = AktenPraesentation(4, "Chaos im Vereinsarchiv", datenbank=DB)

    def merke(name, start):
        FOLIEN[name] = (start, p._nr)

    p.titelfolie("Chaos im Vereinsarchiv", "Akte 4 · DS 7 „Die Excel-Liste“ · DS 8 „Ordnung ins Archiv“",
                 notizen="Akte 4 eröffnen. Steckbrief-Pinnwand zeigen: Bisher wissen wir – Jahrgang 1988, Hafenviertel, "
                         "Tarnname „Nora Falter“, gemeldet über den TuS (Akte 3). Heute geht die Spur ins Vereinsheim. "
                         "DS 7 = Folien 2–13, DS 8 = ab Folie 14.")
    # ---------------------------------------------------------------- DS 7
    s = p._nr + 1
    p.briefing("DS 7 · Die Excel-Liste",
               "Wiebke Lüttjohann, Kassenwartin des TuS Weserstedt, ist verzweifelt: Ihre Beitragsliste ergibt jeden Monat "
               "eine andere Summe. Der Verein führt alles in einer einzigen Liste – Mitglieder, Abteilungen, Trainer, "
               "Telefonnummern, Beiträge, Hallen. Juri findet das „voll praktisch, alles auf einen Blick“. Praktisch, bis "
               "sich etwas ändert: Dieselbe Information steht dutzendfach in der Liste, und das nennt man Redundanz. "
               "Redundanz führt zu Anomalien – beim Einfügen, beim Ändern und beim Löschen. Im Abitur reicht es nie, eine "
               "Anomalie zu benennen; ihr müsst sie an einem konkreten Datensatz erläutern. Gleich pflegen eure Teams "
               "parallel dieselbe Papierliste, und wir schauen, wie lange sie sich nicht widerspricht.",
               von="Edda Lorenz", notizen="Briefing vorlesen lassen (STORY 5.7b). Warm-up vorher: Karten W-A3-05…08 "
                                          "(10 min). Noch keine Begriffe erklären – erst das Rennen erleben lassen.")
    spalten = ["Mitglied", "Abteilungen", "TrainerTelefon", "Beitragsgruppe", "Monatsbeitrag"]
    p.inhaltsfolie("Die Liste des TuS (Ausdruck)",
                   "Was fällt euch an dieser Liste auf, **bevor** wir irgendetwas ändern?",
                   Tabelle(["Zeile"] + spalten, roh([1, 2, 4, 5, 6, 10, 12], spalten), groesse=13,
                           breiten=[2.2, 5.2, 5.4, 6.4, 4.8, 4.6]),
                   notizen="Impuls stehen lassen, Beobachtungen sammeln (nicht bewerten): gleiche Telefonnummern, zwei Lukas "
                           "Behrens, Wiebke Sandmann zweimal mit 14,00 € und 12,00 €, „Fußball, Handball“ in einer Zelle. "
                           "Begriffe kommen nach dem Rennen.")
    p.unplugged("Anomalie-Rennen",
                ["Jede Person bekommt 3 Zeilenstreifen: „Du pflegst diese Datensätze.“ Fremde Streifen nicht anfassen.",
                 "Ich decke alle 45 Sekunden eine Auftragskarte auf – manche sieht nur **eine** Person.",
                 "Am Ende legt ihr die Liste wieder zusammen und zählt: Widersprüche, verlorene Information, unmögliche "
                 "Einträge.",
                 "Gewonnen hat das Team mit den wenigsten Widersprüchen."],
                material="Streifen, Auftragskarten", dauer="20 MIN",
                notizen="Kopiervorlage DD_A4_Unplugged_Anomalie-Rennen (je Team ein Satz, Zeilennummern aufgedruckt). "
                        "Karten im 45-s-Takt: A1 Telefon (alle) · A2 Meyer-Kahl (NUR Person B, verdeckt) · A3 Beitrag "
                        "12 → 14 € (alle, 20 s Zeitdruck) · A4 Judo-Zeile 9 streichen · A5 Bouldern ohne Mitglieder · A6 "
                        "Halle Süd zieht um. Auflösung: „Fehlerfrei geht es nur, wenn ihr bei jeder Änderung alle Zeilen "
                        "findet. Das Problem ist die Liste, nicht ihr.“")
    p.begriffe("Redundanz und die drei Anomaliearten", [
        ("Redundanz", "Dieselbe Information ist mehrfach gespeichert (z. B. eine Telefonnummer in jeder Zeile)."),
        ("Änderungsanomalie", "Eine Information muss an vielen Stellen geändert werden; wird eine vergessen, "
                              "widerspricht sich die Tabelle."),
        ("Löschanomalie", "Beim Löschen eines Datensatzes geht ungewollt weitere Information verloren."),
        ("Einfügeanomalie", "Etwas lässt sich nicht eintragen, weil eine andere Angabe (noch) fehlt."),
        ("nicht-atomarer Wert", "Mehrere Werte in einer Zelle („Fußball, Tennis“)."),
    ], notizen="Begriffe aus dem Rennen entwickeln: Teams nennen ihr Beispiel (Karte + Zeile), die Lehrkraft ordnet zu. "
               "Wichtig: Redundanz ist nicht „doppelte Zeile“, sondern wiederholte Information. Anomalien sind keine "
               "Tippfehler – sie entstehen auch bei sorgfältiger Pflege.")
    p.begriffe("Anomalien am Datensatz der Rohliste", [
        ("Änderung", "Jens Meyers Telefon steht in 23 Zeilen. Ändert es sich, müssen alle 23 geändert werden – Zeile 27 "
                     "zeigt mit 0000-31451 schon einen Widerspruch."),
        ("Löschung", "Timo Rieken (Zeile 12) ist das einzige Judo-Mitglied. Wird die Zeile gelöscht, sind Judo, Trainer "
                     "Ole Wittkamp und seine Telefonnummer weg."),
        ("Einfügung", "Die Abteilung Boule (Trainerin Gesa Thiele, Bouleplatz Weseraue) kann ohne Mitglied nicht "
                      "eingetragen werden."),
        ("Ursache", "Redundanz → Änderungsanomalie · mehrere Sachverhalte in einer Tabelle → Einfüge- und Löschanomalie"),
    ], notizen="Tafelbild (Ermittler-Notiz). Ausgeführt, nicht nur benannt: jede Zeile = Art + Datensatz + Folge. Hinweis "
               "zum Übergang ins Lab: Im Rennen hieß die neue Abteilung Bouldern, im Lab heißt sie Boule.")
    sql_gleich = "SELECT COUNT(*) AS Anzahl\nFROM MitgliederlisteRoh\nWHERE Abteilungen = 'Tischtennis'"
    p.beispiel_schritte("Beispiel: Wie viele spielen Tischtennis?", sql_gleich,
                        ["**FROM** – alle 62 Zeilen der Rohliste",
                         "**WHERE** – nur Zellen, die *genau* „Tischtennis“ enthalten: „Turnen, Tischtennis“ (Zeile 31) "
                         "fällt heraus",
                         "**SELECT COUNT(*)** – 12 Zeilen",
                         "Die Abteilung hat aber **14** Mitglieder – nicht-atomare Werte und Tippfehler verfälschen die "
                         "Auswertung"],
                        ergebnis=ergebnis(sql_gleich),
                        notizen="Live in der Konsole (/konsole/tus) zeigen. Frage: Welche Abfrage wäre besser? → nächste "
                                "Folie.")
    sql_like = "SELECT Mitglied, Abteilungen\nFROM MitgliederlisteRoh\nWHERE Abteilungen LIKE '%Tisch%'\n  AND Abteilungen != 'Tischtennis'"
    p.beispiel_schritte("Beispiel: Was = übersieht", sql_like,
                        ["**LIKE '%Tisch%'** findet auch Kommalisten und den Tippfehler „Tischtenis“",
                         "**!= 'Tischtennis'** blendet die 12 sauberen Zeilen aus",
                         "Übrig bleiben genau die Zeilen, die `=` übersehen hat",
                         "Aber: `LIKE '%tennis%'` fände auch Tennis – zuverlässig wird es erst mit **einer Zeile je "
                         "Mitglied und Abteilung** (DS 8)"],
                        ergebnis=ergebnis(sql_like),
                        notizen="P6: LIKE ist kein Allheilmittel. Die Lösung ist eine bessere Tabellenstruktur, nicht eine "
                                "schlauere Abfrage. Im Lab dazu A4-E1-06 und A4-E1-08 (dort mit Tennis).")
    p.lab_auftrag("4.1", "Die Excel-Liste", "A4-E1-01 … 08 (★ → ★★ → ★★★)", werkzeug="Anomalie-Simulator (03–05)",
                  hinweise=["Direkt nach dem Rennen: Simulator 03–05 – führe die Änderung so aus, wie die Liste es erlaubt.",
                            "07 und 08: erst schreiben, dann Kernpunkte aufdecken (0 Punkte, zählt als bearbeitet).",
                            "AB 4.1 parallel; schnell fertig? Cold Case „Tippfehler im Archiv“."],
                  notizen="Herumgehen: Wer erläutert nur Begriffe (P10)? Satzbaustein anbieten: „Wenn … geändert wird, "
                          "muss …, sonst …“. Langsame: Simulator zuerst, Werkzeugkarte 6.")
    p.merkfolie("Ermittler-Notiz: Anomalien", [
        "Redundanz = dieselbe Information mehrfach gespeichert – sie ist die Ursache der Änderungsanomalie.",
        "Einfüge- und Löschanomalie entstehen, weil mehrere Sachverhalte in einer Tabelle stehen.",
        "Nicht-atomare Werte („Fußball, Tennis“): `=` übersieht sie, `LIKE` findet auch Teilwörter.",
        "Operator **erläutern** = Anomalieart + konkreter Datensatz + Folge.",
    ], notizen="Merksätze ins Heft. Edda: „Erläutern ist kein vornehmes Wort für nennen.“")
    abi_sp = ["Mitglied", "Abteilungen", "Trainer", "TrainerTelefon", "Halle"]
    p.abi_format("Gegeben ist ein Ausschnitt der Tabelle MitgliederlisteRoh. **Erläutern** Sie an einem Beispiel aus dem "
                 "Ausschnitt eine Änderungsanomalie.", be=3, operator="erläutern",
                 inhalt=[Tabelle(["Zeile"] + abi_sp, roh([14, 16, 23, 30], abi_sp), groesse=13)],
                 notizen="2 Minuten Einzelarbeit, dann zwei Antworten vergleichen: eine bloße Nennung und eine "
                         "Erläuterung. Erst danach die Lösungsfolie zeigen.")
    p.loesungsfolie("Lösung Abi-Format: Änderungsanomalie",
                    "„Die Telefonnummer von Trainer Sven Albers (0000-17320) steht in allen vier Zeilen (14, 16, 23, 30). "
                    "Ändert sie sich, muss sie in jeder dieser Zeilen geändert werden. Wird eine Zeile vergessen, sind für "
                    "denselben Trainer zwei Nummern gespeichert – die Tabelle widerspricht sich.“",
                    "**1 BE** Anomalieart mit Sachverhalt · **1 BE** konkrete Zeilen/Werte · **1 BE** Folge (Widerspruch).",
                    "Typischer Fehler P10: „Bei Änderungen kann es zu Fehlern kommen.“ → höchstens 1 BE.",
                    notizen="Auch richtig: Halle am Mühlenfeld/Adresse in allen vier Zeilen. Zeile 16 („Halle Am "
                            "Mühlenfeld“) zeigt sogar schon eine abweichende Schreibweise.")
    p.inhaltsfolie("Fallbesprechung",
                   "Wiebke Lüttjohanns Liste hat drei verschiedene Beiträge für Erwachsene: 14,00 €, 12,00 € – und einmal "
                   "0,00 €.",
                   "„Mitten in der Liste steht ‚Nora Falter, Tischtennis, Monatsbeitrag 0,00 €‘ – und niemand in der "
                   "Tischtennis-Abteilung hat sie je gesehen.“",
                   notizen="Abschluss-Satz (STORY 5.7c) erst nach der Lab-Phase vorlesen. Zwischen 12,00 € und 14,00 € fiel "
                           "der Eintrag nicht auf – nächste Stunde klären wir, wie das Phantom das ausgenutzt hat.")
    merke("DS 7", s)
    # ---------------------------------------------------------------- DS 8
    s = p._nr + 1
    p.briefing("DS 8 · Ordnung ins Archiv",
               "Wir wissen jetzt, wie das Phantom es gemacht hat. Als der Beitrag für Erwachsene von 12 auf 14 Euro stieg, "
               "musste der neue Betrag in jeder einzelnen Zeile geändert werden, und in einigen Zeilen blieb der alte Wert "
               "stehen. Zwischen 12,00 € und 14,00 € fiel ein Eintrag mit 0,00 € schlicht nicht mehr auf: Das Phantom hat "
               "eine Änderungsanomalie ausgenutzt. Heute sorgen wir dafür, dass so etwas nicht wieder passiert. Dazu "
               "brauchen wir gute Primärschlüssel – eindeutig, nie NULL, minimal, und zwar für alle denkbaren Daten. Dann "
               "zerlegen wir die Liste so, dass jede Information nur noch einmal gespeichert ist und trotzdem nichts "
               "verloren geht.",
               von="Edda Lorenz", notizen="Warm-up vorher: W-A4-01…04 (10 min). Briefing STORY 5.8b. Impuls: „Woran erkennt "
                                          "man ein Mitglied eindeutig?“ – Schlüsselkriterien aus DS 1 wiederholen.")
    p.begriffe("Schlüssel-Check", [
        ("eindeutig", "für **alle möglichen** Daten – ein Ausschnitt kann das nur widerlegen, nie beweisen"),
        ("nie NULL", "jeder Datensatz hat einen Schlüsselwert"),
        ("minimal", "kein Attribut lässt sich weglassen – (MitgliedNr, Nachname) ist nicht minimal"),
        ("künstlicher Schlüssel", "eigene Nummer (MitgliedNr), wenn kein natürlicher Schlüssel sicher ist"),
        ("zusammengesetzt", "erst die Kombination ist eindeutig: (↑MitgliedNr, ↑AbteilungNr) – Achtung bei "
                            "Mehrfachvorkommen (Wiedereintritt)"),
    ], notizen="Die zwei Lukas Behrens (Zeilen 1 und 2) als Beleg, dass der Name nicht reicht. Wiedereintritt: Wer austritt "
               "und später wieder eintritt, erzeugt dasselbe Paar ein zweites Mal – dann braucht man ein zusätzliches "
               "Schlüsselattribut (z. B. Seit).")
    p.unplugged("Schlüssel-Detektiv",
                ["Jedes Team bekommt 8 Datenstreifen und sucht die **kleinste** Attributkombination, die jedes Mitglied "
                 "eindeutig bestimmt.",
                 "Legt euer Kärtchen „Unser Schlüssel: …“ auf den Tisch.",
                 "Ich liefere nach – passt euer Schlüssel noch? Wenn nicht: umdrehen, neu legen.",
                 "Am Ende: Kann ein Ausschnitt Eindeutigkeit beweisen?"],
                material="Datenstreifen, Kärtchen", dauer="15 MIN",
                notizen="Kopiervorlage DD_A4_Unplugged_Schluessel-Detektiv. Nachlieferung 1 (gleicher Nachname, gleicher "
                        "Vorname, gleiches Geburtsjahr und Eintritt) → Einzelattribute fallen. Nachlieferung 2 (Vater und "
                        "Sohn Ole Harjes) → (Vorname, Nachname) fällt. Nachlieferung 3 (Geburtsjahr NULL, Zwillinge) → "
                        "auch die Dreierkombination ist unsicher. Impulse: minimal? Warum vergeben Vereine Nummern?")
    p.inhaltsfolie("Zusammengelegte Tabelle untersuchen",
                   "**Prüffrage:** Hängt ein Nicht-Schlüssel-Attribut von einem anderen Nicht-Schlüssel-Attribut (oder "
                   "nur von einem Teil des Schlüssels) ab?",
                   Schema("MitgliedBeitrag(<u>MitgliedNr</u>, Vorname, Nachname, Beitragsgruppe, Monatsbeitrag)"),
                   "Monatsbeitrag ← Beitragsgruppe: derselbe Betrag steht mehrfach → **Anomalien möglich**.",
                   Schema("Beitragsgruppe(<u>Gruppe</u>, Monatsbeitrag)"),
                   "Jedes Attribut hängt vom ganzen Schlüssel und nur von ihm ab → **keine Anomalie möglich**.",
                   notizen="Seit 2023 kommt im Abitur regelmäßig eine „zusammengelegte Tabelle“. „Keine Anomalie möglich“ "
                           "ist eine echte Antwort (Lab A4-E2-05) – die Begründung läuft über die Abhängigkeiten, nicht "
                           "über die zufälligen Daten.")
    p.inhaltsfolie("Die Zerlegung der Rohliste",
                   "Die Rohliste `MitgliederlisteRoh` wird verlustfrei und redundanzfrei zerlegt in:",
                   *[Schema(s) for s in ZERLEGUNG],
                   notizen="„Schere-Zerlegung“ am Beamer bzw. mit einer Papierkopie der Rohliste: je Sachverhalt eine "
                           "Tabelle. Die Beziehungstabelle heißt Mitgliedschaft (ein Substantiv, weil sie ein eigenes Ding "
                           "mit Attribut Seit ist) – nicht „Sportverein“. FK Mitglied.Beitragsgruppe verweist auf "
                           "Beitragsgruppe.Gruppe (anderer Name ist erlaubt). gA-Kurse: nur zeigen, nicht selbst zerlegen.")
    sql_v = ("SELECT Mitglied.Vorname, Mitglied.Nachname,\n       Abteilung.Name AS Abteilung, Halle.Name AS Halle\n"
             "FROM Mitglied, Mitgliedschaft, Abteilung, Halle\n"
             "WHERE Mitglied.MitgliedNr = Mitgliedschaft.MitgliedNr\n"
             "  AND Mitgliedschaft.AbteilungNr = Abteilung.AbteilungNr\n"
             "  AND Abteilung.HalleNr = Halle.HalleNr\n"
             "  AND Mitglied.Nachname = 'Thaden'\nORDER BY Abteilung.Name")
    p.beispiel_schritte("Beispiel: Ist die Zerlegung verlustfrei?", sql_v,
                        ["**FROM/WHERE** – Verbund über die Fremdschlüssel: Mitglied → Mitgliedschaft → Abteilung → Halle",
                         "**AND Nachname = 'Thaden'** – Enno Thaden steht in der Rohliste in drei Zeilen (54–56)",
                         "**SELECT** – Vorname, Nachname, Abteilung, Halle",
                         "Der Verbund ergibt die drei Rohlisten-Zeilen wieder: **verlustfrei**"],
                        ergebnis=ergebnis(sql_v),
                        notizen="Verlustfrei heißt: Aus den Teiltabellen lässt sich die Rohliste per Verbund wiederherstellen. "
                                "Fehlt Mitgliedschaft, wüsste niemand mehr, wer in welcher Abteilung ist.")
    sql_n = ("SELECT Mitglied.Vorname, Mitglied.Nachname,\n       Beitragsgruppe.Monatsbeitrag\n"
             "FROM Mitglied, Beitragsgruppe\nWHERE Mitglied.Beitragsgruppe = Beitragsgruppe.Gruppe\n"
             "  AND Mitglied.Nachname = 'Falter'")
    p.beispiel_schritte("Beispiel: Wo steht jetzt der Beitrag?", sql_n,
                        ["Der Monatsbeitrag steht nur noch **einmal**: in Beitragsgruppe",
                         "Mitglied verweist mit ↑Beitragsgruppe auf Gruppe",
                         "Auch „Nora Falter“ zahlt im neuen Archiv automatisch 14,00 €",
                         "Eine Erhöhung ändert **eine** Zelle – keine Änderungsanomalie mehr: **redundanzfrei**"],
                        ergebnis=ergebnis(sql_n),
                        notizen="Story-Pointe: Im neuen Schema ist die Manipulation des Phantoms unmöglich. Begründung "
                                "Redundanzfreiheit: Jedes Nicht-Schlüssel-Attribut hängt nur vom Schlüssel seiner Tabelle ab.")
    p.lab_auftrag("4.2", "Ordnung ins Archiv", "A4-E2-01 … 05 (gA/eA) · 06 … 08 (eA) · danach Verhör 4",
                  werkzeug="Zerlegungs-Puzzle (06), Schema-Werkbank (07)",
                  hinweise=["Schließe nie aus einem kleinen Ausschnitt, dass ein Attribut eindeutig ist.",
                            "gA: 01–05 und Verhör 4; eA zusätzlich Zerlegen (06–08).",
                            "AB 4.2 parallel; Cold Case: KÜR Normalformen."],
                  notizen="Verhör 4 (Musikschule) im Kurs auf „auto“/„offen“ stellen. Im gA-Kurs sind A4-E2-06…08 "
                          "ausgeblendet; AB 4.2 Aufträge 4–5 entfallen.")
    p.merkfolie("Ermittler-Notiz: Ordnung im Archiv", [
        "Schlüssel-Check: eindeutig für alle möglichen Daten · nie NULL · minimal – sonst künstlicher Schlüssel.",
        "Zusammengelegte Tabelle: Hängt ein Attribut nicht vom Schlüssel ab → Anomalien; sonst keine Anomalie möglich.",
        "**verlustfrei:** Der Verbund der Teiltabellen ergibt die Rohliste wieder.",
        "**redundanzfrei:** Jede Information steht genau einmal – jedes Nicht-Schlüssel-Attribut hängt nur vom "
        "Schlüssel seiner Tabelle ab.",
    ], notizen="Zerlegtes Schema als Merkkasten an die Tafel (Folie „Die Zerlegung der Rohliste“).")
    p.inhaltsfolie("KÜR · nicht im Abitur: Normalformen",
                   "**Funktionale Abhängigkeit** A → B: Zu jedem Wert von A gehört genau ein Wert von B, z. B. "
                   "Beitragsgruppe → Monatsbeitrag. Im Abitur begründest du Redundanzfreiheit ohne diese Begriffe.",
                   Liste(["**1. NF:** nur atomare Werte – die Rohliste („Fußball, Tennis“) verletzt sie.",
                          "**2. NF:** kein Nicht-Schlüssel-Attribut hängt nur von einem Schlüsselteil ab.",
                          "**3. NF:** keine transitive Abhängigkeit (MitgliedNr → Beitragsgruppe → Monatsbeitrag)."]),
                   notizen="Nur für Interessierte (Kür, K13). Lab-Cold-Case A4-E2-CC und Cold Case auf AB 4.2.")
    p.abi_format("Gegeben ist die Tabelle Mitgliedschaft(<u>↑MitgliedNr, ↑AbteilungNr</u>, Seit) des neuen Archivs. "
                 "**Untersuchen** Sie, ob in dieser Tabelle Anomalien auftreten können.", be=3, operator="untersuchen",
                 notizen="Erwartung: keine Anomalie möglich – mit Begründung über die Abhängigkeit. Schülerinnen und "
                         "Schüler suchen erfahrungsgemäß krampfhaft eine Anomalie (Abi 2023/2026).")
    p.loesungsfolie("Lösung Abi-Format: keine Anomalie möglich",
                    "Das einzige Nicht-Schlüssel-Attribut Seit hängt vom **ganzen** Schlüssel (MitgliedNr, AbteilungNr) ab: "
                    "Wann jemand in eine Abteilung eingetreten ist, gehört zu genau diesem Paar. Keine Information steht "
                    "mehrfach (1 BE).",
                    "Ändern betrifft genau eine Zeile; Löschen entfernt nur diese Mitgliedschaft (Mitglied und Abteilung "
                    "bleiben in ihren Tabellen); Einfügen braucht nur das Paar (1 BE).",
                    "Also ist **keine Anomalie möglich** (1 BE).",
                    "Typischer Fehler P8/P10: „MitgliedNr kommt mehrfach vor, also Redundanz.“",
                    notizen="Wichtig: Mehrfach vorkommende Fremdschlüsselwerte sind keine Redundanz – sie sind Verweise.")
    p.inhaltsfolie("Fallbesprechung",
                   "Beweisstück 4 – **Vereinsausweis:** „TuS Weserstedt · Nora Falter · Abteilung Tischtennis · Beitrag: "
                   "0,00 €“, dort, wo das Foto sein sollte, ein gezeichneter Nachtfalter.",
                   "„Vier Akten, viermal N. F.“ – Edda räumt die halbe Pinnwand frei: „Mit Zetteln kommen wir nicht weiter, "
                   "wir brauchen eine eigene Datenbank.“",
                   notizen="Steckbrief ergänzen: spielt Tischtennis beim TuS · nutzt Schwächen schlecht gebauter Listen · "
                           "„Nora Falter“ ist ein Tarnname. Hinweis auf Verhör 4 und auf Akte 5 (eA: eigener Bauplan).")
    merke("DS 8", s)
    p.speichern(ORDNER / "1_Praesentation" / "DD_A4_Vereinsarchiv.pptx")


# ================================================================== Lehrerhinweise
def lehrerhinweise():
    f7, f8 = FOLIEN.get("DS 7", (2, 13)), FOLIEN.get("DS 8", (14, 26))
    d = AktenDokument("lehrerhinweise", 4, "Lehrerhinweise Akte 4", fassung="lehrkraft", material="Lehrerhinweise A4",
                      datenbank=DB, untertitel="Chaos im Vereinsarchiv · DS 7–8 · Redundanz, Anomalien, Schlüssel, Zerlegung")
    d.kopfband()
    d.ueberschrift("Überblick", 1)
    d.tabelle(["DS", "Thema", "Lab", "Warm-up", "Abi-Bezug"], [
        ["7", "Die Excel-Liste – Redundanz, Einfüge-/Änderungs-/Löschanomalie am Datensatz, nicht-atomare Werte "
              "(K07, K08, K10, K14)", "A4-E1-01…08 (Anomalie-Simulator 03–05), Cold Case A4-E1-CC",
         "W-A3-05…08 (Wiederholung DS 6)", "Anomalien in 18 von 19 Abiturklausuren 2021–2026; Operator „erläutern“ "
                                           "verlangt den Datensatz (P10)"],
        ["8", "Ordnung ins Archiv – Schlüssel beurteilen, zusammengelegte Tabelle untersuchen, verlustfrei und "
              "redundanzfrei zerlegen (K02, K09, K11, K12; Kür K13)", "A4-E2-01…08 (Zerlegungs-Puzzle 06, Schema-Werkbank "
                                                                       "07), Cold Case A4-E2-CC; Verhör 4 · Musikschule",
         "W-A4-01…04 (Wiederholung DS 7)", "Schlüsseleignung 14/19, „zusammengelegte Tabelle“ seit 2023 (u. a. G23N, "
                                           "G25N, E23, E26)"],
    ], breiten=[0.9, 5.4, 4.0, 2.7, 4.0], groesse=8.5)
    d.inhalt("**Material:** Präsentation `DD_A4_Vereinsarchiv.pptx` (DS 7: Folien "
             f"{f7[0]}–{f7[1]}, DS 8: Folien {f8[0]}–{f8[1]}) · AB 4.1 und AB 4.2 mit Lösungen · Kopiervorlagen "
             "Anomalie-Rennen und Schlüssel-Detektiv · Warm-up-Karten A4 · Datenbank `tus` (Rohliste "
             "`MitgliederlisteRoh` mit 62 Zeilen und die normalisierte Fassung).",
             "**Grundkurs (gA):** DS 7 unverändert. DS 8 nur A4-E2-01…05 (Schlüssel, zusammengelegte Tabelle, „keine "
             "Anomalie möglich“); Zerlegen/Redundanzfreiheit (K11, K12) und A4-V-11/12 sind ausgeblendet, AB 4.2 Aufträge "
             "4–5 entfallen. Im gA-Pfad DS 12 (= gA-DS 9) Warm-up mit W-A4-05…08.")
    d.notiz("Story-Faden der Akte", "Auftraggeberin Wiebke Lüttjohann (Kassenwartin des TuS Weserstedt). Zum 2026-01-01 "
            "stieg der Beitrag für Erwachsene von 12,00 € auf 14,00 €, die Liste wurde nur teilweise angepasst. Am "
            "2026-04-01 hat sich das Phantom als „Nora Falter“ (Tischtennis, Geburtsjahr leer) mit 0,00 € eingetragen – "
            "eine ausgenutzte **Änderungsanomalie**. Ein paar Zeilen weiter steht Merle Falkenrath (1988, Tischtennis); "
            "das fällt erst in Akte 6 auf – bitte nicht vorwegnehmen.")

    # ---------------------------------------------------------------- DS 7
    d.ueberschrift("DS 7 · Ermittlung 4.1 „Die Excel-Liste“", 1)
    d.ueberschrift("Ziele", 2)
    d.inhalt(Liste(["**identifizieren** Redundanzen in einer Rohtabelle und **beschreiben** sie (welche Information "
                    "steht wo mehrfach?).",
                    "**nennen** Einfüge-, Änderungs- und Löschanomalie und **erläutern** jede an einem konkreten Datensatz "
                    "der Rohliste.",
                    "**erläutern** den Zusammenhang zwischen Redundanz und Anomalien.",
                    "**erkennen** nicht-atomare Werte („Fußball, Tennis“) und **erläutern** ihre Folgen für Auswertungen "
                    "mit SQL."], nummeriert=True))
    d.ueberschrift("Verlauf", 2)
    d.tabelle(["Phase", "Zeit", "Inhalt / Ablauf", "Sozialform", "Material"], [
        ["Warm-up", "0–10'", "Karten W-A3-05…08 (WHERE/HAVING, Reihenfolge, Analyse, LIMIT)", "EA → Team",
         "Warm-up-Karten A3"],
        ["Briefing", "10–15'", "Akte 4 eröffnen, Briefing (STORY 5.7), Rohliste am Beamer. Impuls: „Was fällt euch an "
                               "dieser Liste auf, bevor wir irgendetwas ändern?“", "LV, UG", f"Folien 1–{f7[0] + 1}"],
        ["Unplugged", "15–35'", "Anomalie-Rennen (siehe unten), danach Begriffsbildung an der Tafel", "Teams",
         "Kopiervorlage Anomalie-Rennen"],
        ["Lab", "35–80'", "Ermittlung 4.1; Anomalie-Simulator (03–05) direkt nach dem Rennen; 07/08 sind Kernpunkte "
                          "(Erläutern am Datensatz). AB 4.1 parallel", "EA", "iPad/Laptop, AB 4.1"],
        ["Fallbesprechung", "80–90'", "Tafelbild Anomalien, Operator „erläutern“ (P10): Nennung vs. Erläuterung; "
                                      "Abi-Format (3 BE); Cliffhanger „Nora Falter, 0,00 €“", "UG",
         f"Folien {f7[1] - 3}–{f7[1]}"],
    ], breiten=[2.4, 1.3, 7.6, 1.9, 3.8], groesse=8.5)
    d.ueberschrift("Unplugged: Anomalie-Rennen (20 min)", 2)
    d.inhalt(Liste([
        "Je Team: 12 Zeilenstreifen einer Übungsliste (eigene Daten der SG Weserufer, Zeilennummern aufgedruckt), 2 "
        "Leerstreifen, 6 Auftragskarten (verdeckt, nummeriert), Auswertungsbogen; Stoppuhr am Beamer.",
        "Jede Person pflegt 3 Streifen (A: 1–3, B: 4–6, C: 7–9, D: 10–12). Fremde Streifen nicht anfassen, Absprachen "
        "nur flüsternd.",
        "Karten im 45-Sekunden-Takt: A1 neue Telefonnummer von Helge Meyer (alle) · A2 Meyer heißt Meyer-Kahl (**nur "
        "Person B**, verdeckt) · A3 Beitrag Erwachsene 12 → 14 € (alle, 20 s) · A4 Judo-Zeile 9 streichen · A5 Bouldern "
        "ohne Mitglieder auf Leerstreifen · A6 Halle Süd zieht in den Deichweg 3.",
        "Streifen zusammenlegen, zählen: Widersprüche (zwei Namen/Telefone für Meyer, Erwachsene mit 12 und 14 €, zwei "
        "Adressen), verlorene Information (Wer trainiert Judo?), unmögliche Einträge (Bouldern ohne Mitglied).",
        "Auflösung: „Fehlerfrei geht es nur, wenn ihr bei jeder Änderung alle Zeilen findet. Das Problem ist die Liste, "
        "nicht ihr.“ Sicherung: drei Anomaliearten mit **eurem** Beispiel (Zeilennummer) an die Tafel, Redundanz als "
        "Ursache markieren.",
        "Übergang: Im Rennen heißt die neue Abteilung Bouldern, im Lab und an der Tafel **Boule** (Trainerin Gesa "
        "Thiele, Bouleplatz Weseraue, A4-E1-05) – kurz darauf hinweisen."], nummeriert=True))
    d.ueberschrift("Tafelbild „Ermittler-Notiz“", 2)
    d.tabelle(["Begriff", "Erläuterung am Datensatz (Rohliste TuS)"], [
        ["Redundanz", "Trainer Jens Meyer mit Telefon 0000-31415 steht in 23 Zeilen (Fußball und Tennis)."],
        ["Änderungsanomalie", "Neue Nummer → 23 Zeilen ändern; vergessene Zeile → Widerspruch (Zeile 27: 0000-31451)."],
        ["Löschanomalie", "Timo Rieken (Zeile 12), einziges Judo-Mitglied, tritt aus → Judo, Ole Wittkamp und Telefon weg."],
        ["Einfügeanomalie", "Boule (Gesa Thiele, Bouleplatz Weseraue) ohne Mitglied nicht eintragbar."],
        ["nicht-atomarer Wert", "„Fußball, Tennis“: `= 'Tennis'` findet das Mitglied nicht, `LIKE '%Tennis%'` findet "
                                "auch Tischtennis."],
    ], breiten=[3.6, 13.3], groesse=8.5)
    d.inhalt("Redundanz ist die Ursache der Änderungsanomalie; Einfüge- und Löschanomalie entstehen, weil **mehrere "
             "Sachverhalte** in **einer** Tabelle stehen. Operator **erläutern** = Anomalieart + konkreter Datensatz + "
             "Folge. Die Ermittler-Notiz im Lab nutzt bewusst ein anderes Beispiel (Birte Haschkes Telefon), damit sie die "
             "Simulator-Aufgaben nicht vorwegnimmt.")
    d.ueberschrift("Typische Schwierigkeiten", 2)
    d.inhalt(Liste([
        "Anomalien nur benannt, nicht am Datensatz erläutert (P10) → Musterantwort mit drei Bausteinen (Art – Datensatz – "
        "Folge), AB 4.1 Beweisstück 5.",
        "Einfüge- und Löschanomalie verwechselt; „Anomalie = Tippfehler“ (Anomalien entstehen auch bei fehlerfreier "
        "Pflege).",
        "Redundanz mit „doppeltem Datensatz“ gleichgesetzt (gleiche **Information**, nicht gleiche Zeile).",
        "Nicht-atomare Werte als harmlos eingeschätzt → Gegenbeispiele Tischtennis (12 statt 14) und Tennis (9 bzw. 23).",
    ]))
    d.ueberschrift("Differenzierung", 2)
    d.inhalt(Liste([
        "*Schnelle:* Cold Case „Der Vereinsabend“ (AB 4.1), Lab-Cold-Case „Tippfehler im Archiv“, Vorgriff: Wie müsste "
        "die Liste zerlegt werden?",
        "*Langsame:* Simulator zuerst (anschaulich), Satzbausteine „Wenn … geändert wird, muss …, sonst …“, "
        "Werkzeugkarte 6 des Ermittler-Handbuchs.",
    ]))
    d.ueberschrift("Vorbereitung", 2)
    d.inhalt(Liste([
        "Kopiervorlage Anomalie-Rennen je Team einmal drucken und schneiden (Streifen, Leerstreifen); Auftragskarten "
        "einmal für die Lehrkraft, A2 ist als „nur für Person B“ markiert; Stoppuhr.",
        "Akte 4 im Kurs freischalten; Warm-up-Karten A3 (W-A3-05…08) bereitlegen.",
    ]))

    # ---------------------------------------------------------------- DS 8
    d.ueberschrift("DS 8 · Ermittlung 4.2 „Ordnung ins Archiv“", 1)
    d.ueberschrift("Ziele", 2)
    d.inhalt(Liste([
        "**beurteilen** die Eignung von (auch zusammengesetzten, künstlichen) Primärschlüsseln nach den Kriterien "
        "eindeutig, nie NULL, minimal – und **begründen**, warum ein Datenausschnitt keine Eindeutigkeit beweist.",
        "**untersuchen** eine gegebene („zusammengelegte“) Tabelle auf Anomalien und **begründen** ggf., dass keine "
        "Anomalie möglich ist.",
        "**zerlegen** eine Rohtabelle verlustfrei in ein redundanzfreies Schema und notieren es in Kurzschreibweise (eA).",
        "**begründen** die Redundanzfreiheit eines Schemas (eA); *Kür:* prüfen Abhängigkeiten mit funktionaler "
        "Abhängigkeit und 1.–3. Normalform."], nummeriert=True))
    d.ueberschrift("Verlauf", 2)
    d.tabelle(["Phase", "Zeit", "Inhalt / Ablauf", "Sozialform", "Material"], [
        ["Warm-up", "0–10'", "Karten W-A4-01…04 (Redundanz, Anomalie benennen, Anomalie erläutern, nicht-atomar)",
         "EA → Team", "Warm-up-Karten A4"],
        ["Briefing", "10–15'", "„Wir räumen das Archiv auf. Aber woran erkennt man ein Mitglied eindeutig?“ Schlüssel"
                               "kriterien wiederholen (DS 1) und vertiefen: künstlich vs. natürlich, zusammengesetzt",
         "LV, UG", f"Folien {f8[0]}–{f8[0] + 1}"],
        ["Unplugged", "15–30'", "Schlüssel-Detektiv (siehe unten), danach „Schere-Zerlegung“ der Rohliste am Beamer",
         "Teams", f"Kopiervorlage, Folien {f8[0] + 2}–{f8[0] + 4}"],
        ["Lab", "30–75'", "Ermittlung 4.2; Zerlegungs-Puzzle (06), Schema-Werkbank (07). gA: 01–05 + Verhör 4. AB 4.2 "
                          "parallel", "EA", "iPad/Laptop, AB 4.2"],
        ["Fallbesprechung", "75–90'", "Zerlegtes Schema als Merkkasten, Redundanzfreiheit begründen; Abi-Format "
                                      "„keine Anomalie möglich“; Vereinsausweis und Cliffhanger; Hinweis Verhör 4; "
                                      "Kür-Kasten Normalformen", "UG", f"Folien {f8[0] + 5}–{f8[1]}"],
    ], breiten=[2.4, 1.3, 7.6, 1.9, 3.8], groesse=8.5)
    d.ueberschrift("Unplugged: Schlüssel-Detektiv (15 min)", 2)
    d.inhalt(Liste([
        "Je Team 8 Datenstreifen (Vorname, Nachname, Geburtsjahr, Stadtteil, Eintritt; eigene Daten) und Kärtchen "
        "„Unser Schlüssel: …“; bei der Lehrkraft 3 Nachlieferungskarten.",
        "Auftrag: „Findet eine möglichst kleine Attributkombination, die jedes Mitglied eindeutig bestimmt.“ Teams legen "
        "ihr Kärtchen (meist Nachname).",
        "Nachlieferung 1: Pauline Wöltjen und Hanna Kück → Nachname, Vorname, Geburtsjahr und Eintritt fallen. Neue "
        "Vorschläge (meist Vorname + Nachname).",
        "Nachlieferung 2: Vater und Sohn Ole Harjes (1974/2009) → nächster Vorschlag (Vorname + Nachname + Geburtsjahr).",
        "Nachlieferung 3: Geburtsjahr unbekannt (NULL) bei Swantje Pundt; Zwillinge gleichen Namens sind unwahrscheinlich, "
        "aber *möglich*.",
        "Impulse: „Kann ein Datenausschnitt je beweisen, dass ein Attribut eindeutig ist?“ (Nein – nur widerlegen) · „Ist "
        "(Vorname, Nachname, Geburtsjahr, Stadtteil) minimal?“ · „Warum vergeben Vereine Mitgliedsnummern?“",
        "Sicherung: Schlüssel-Check (Werkzeugkarte 6) – eindeutig für **alle möglichen** Daten · nie NULL · minimal · "
        "künstlicher Schlüssel als sichere Wahl."], nummeriert=True))
    d.ueberschrift("Tafelbild „Ermittler-Notiz“", 2)
    d.inhalt("**Schlüssel-Check:** eindeutig für alle *möglichen* Daten (ein Ausschnitt kann das nur widerlegen) · nie NULL "
             "· minimal · künstlicher Schlüssel (MitgliedNr), wenn kein natürlicher sicher ist · zusammengesetzt, wenn erst "
             "die Kombination eindeutig ist – Achtung bei Mehrfachvorkommen (Wiedereintritt!).",
             "**Zusammengelegte Tabelle untersuchen:** Hängt ein Nicht-Schlüssel-Attribut nur von einem *Teil* des "
             "Schlüssels oder von einem anderen Nicht-Schlüssel-Attribut ab (Monatsbeitrag ← Beitragsgruppe)? → Anomalien. "
             "Hängt jedes Attribut vom ganzen Schlüssel und nur von ihm ab → **keine Anomalie möglich**.",
             "**Zerlegung der Rohliste (verlustfrei und redundanzfrei):**",
             *[Schema(s) for s in ZERLEGUNG],
             "*verlustfrei* = der Verbund der Teiltabellen ergibt wieder die Rohliste · *redundanzfrei* = jede Information "
             "steht genau einmal; Begründung: jedes Nicht-Schlüssel-Attribut hängt nur vom Schlüssel seiner Tabelle ab. "
             "Die Beziehungstabelle heißt **Mitgliedschaft** (Substantiv mit eigenem Attribut Seit).",
             Notiz("KÜR (nicht im Abitur)", "Funktionale Abhängigkeit `Beitragsgruppe → Monatsbeitrag`; 1. NF: nur atomare "
                   "Werte · 2. NF: kein Nicht-Schlüssel-Attribut hängt von einem Teil eines zusammengesetzten Schlüssels "
                   "ab · 3. NF: keine transitiven Abhängigkeiten (MitgliedNr → Beitragsgruppe → Monatsbeitrag)."))
    d.ueberschrift("Typische Schwierigkeiten", 2)
    d.inhalt(Liste([
        "Eindeutigkeit aus dem Ausschnitt „bewiesen“ (P8) – häufigster Fehler im Abitur (G23N, G25N, E26).",
        "Minimalität übersehen: (MitgliedNr, Nachname) „ist doch eindeutig“.",
        "Zusammengesetzter Schlüssel bei Mehrfachvorkommen (Wiedereintritt) nicht hinterfragt (P8) → A4-E2-04.",
        "„Keine Anomalie möglich“ wird nie als Antwort erwogen (Abi E23, E26) → A4-E2-05, AB 4.2 Auftrag 3, Abi-Format.",
        "Zerlegung verliert Information (Beziehung Mitglied–Abteilung fehlt) oder lässt Redundanz (Beitrag bleibt im "
        "Mitglied).",
        "Mehrfach vorkommende Fremdschlüsselwerte oder Namen werden für Redundanz gehalten – ein Verweis ist keine "
        "wiederholte Information."]))
    d.ueberschrift("Differenzierung", 2)
    d.inhalt(Liste([
        "*Schnelle:* KÜR-Kasten Normalformen (AB 4.2 Beweisstück 5 und Cold Case, Lab-Cold-Case A4-E2-CC), "
        "Spielplan-Zerlegung mit zwei Rollen (Heim/Gast) als Vorgriff auf DS 10.",
        "*Langsame:* Zerlegungs-Puzzle mit Teilfeedback, Werkzeugkarte 6; gA: Schwerpunkt Schlüssel und Anomalien (01–05)."]))
    d.ueberschrift("Vorbereitung", 2)
    d.inhalt(Liste([
        "Kopiervorlage Schlüssel-Detektiv: Datenstreifen und Kärtchen je Team, Nachlieferungskarten einmal; Schere bzw. "
        "Papierkopie der Rohliste für die Demonstration.",
        "Verhör 4 im Kurs auf „auto“/„offen“; im gA-Kurs sind A4-E2-06…08 ausgeblendet.",
        "Hinweis (offene Frage Spec §18): Die Freie Ermittlung `/konsole/tus` zeigt das normalisierte Schema (= Lösung von "
        "A4-E2-07); Ermittlung 4.2 hat deshalb keine Datenbank-Kachel. AB 4.2 Beweisstück 3 zeigt die Zerlegung "
        "ebenfalls – Auftrag 5 (Lab) möglichst vor dem Lesen von Beweisstück 3 bearbeiten lassen."]))
    d.ueberschrift("Verhör 4 · Musikschule (V4)", 2)
    d.inhalt("Kontext-DB `verhoer/musikschule`: Rohliste `UnterrichtRoh` und zusammengelegte Tabelle `LehrkraftRaum` "
             "(keine normalisierten Teiltabellen). Rahmensatz Edda: „Listen wie die vom TuS gibt es überall – zeig mir, "
             "dass du ihre Schwachstellen findest.“ 20 Minuten, 6 Aufgaben (2 × ★, 3 × ★★, 1 × ★★★), Abimodus streng; "
             "gA-Kurse ohne A4-V-11/12. Pool: Redundanz, Anomalieart, Telefonwechsel (Simulator), nicht-atomar, "
             "Schlüsselkandidat, neues Instrument, Ursache, zusammengelegte Tabelle, anomaliefrei, doppelt belegter "
             "Schlüssel, Neuordnung (eA), Begründung (eA).")
    return d.speichern(ORDNER / "4_Lehrerhinweise" / "DD_A4_Lehrerhinweise.docx")


# ================================================================== Warm-up
def warmup():
    karten = json.loads((REPO / "seed" / "warmup" / "warmup_a4.json").read_text(encoding="utf-8"))["karten"]
    return warmup_karten_dokument(karten, 4, "Warm-up-Karten Akte 4").speichern(MAT / "Warm-up" / "DD_Warm-up-Karten_A4.docx")


def main():
    for f in ("schueler", "loesung"):
        ab41(f)
        ab42(f)
        anomalie_rennen(f)
        schluessel_detektiv(f)
    praesentation()
    lehrerhinweise()
    warmup()
    for p in sorted(ORDNER.rglob("*.*")) + [MAT / "Warm-up" / "DD_Warm-up-Karten_A4.docx"]:
        print(f"✔ {p.relative_to(REPO)}")


if __name__ == "__main__":
    main()
