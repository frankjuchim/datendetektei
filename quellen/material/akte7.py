#!/usr/bin/env python3
"""Erstellungshilfe: Material der Akte 7 „Die Ermittlerprüfung“ (DS 13, Generalprobe) und der Klausuren im Akten-Design.

Erzeugt (Spec §11.3, §12.1; DS_PLANUNG DS 13 „Blueprint Generalprobe eA/gA“, „Klausur eA A/B“, „Klausur gA B-gA“,
„Nachschreibklausur A/B“):
  materialien/Akte7_Generalprobe/1_Praesentation/DD_A7_Generalprobe.pptx
  materialien/Akte7_Generalprobe/2_Generalprobe/DD_A7_Generalprobe_eA.docx, DD_A7_Generalprobe_gA.docx,
      DD_A7_Fallen-Checkliste.docx (Kopiervorlage Peer-Korrektur)
  materialien/Akte7_Generalprobe/3_Klausur/DD_A7_Klausur_eA.docx, DD_A7_Klausur_gA.docx,
      DD_A7_Nachschreibklausur_eA.docx, DD_A7_Nachschreibklausur_gA.docx
  materialien/Akte7_Generalprobe/4_Lehrerhinweise/DD_A7_Lehrerhinweise.docx
  materialien/Akte7_Generalprobe/5_Erwartungshorizonte/…_Erwartungshorizont.docx (je Prüfung)
  materialien/Warm-up/DD_Warm-up-Karten_A7.docx

Die erzeugten docx/pptx sind danach maßgeblich (Spec §12); dieses Skript ist nur die Erstellungshilfe.
Datenbanken: verhoer/mensa (Generalprobe), pruefung/sanitaetsdienst (Klausur), pruefung/kostuemverleih
(Nachschreibklausur) – alle Ausschnitte und Ergebnistabellen werden aus den DBs gelesen.
Aufruf: python3 quellen/material/akte7.py
"""
import json
import re
import sqlite3
import sys
from dataclasses import dataclass, field
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "werkzeuge"))

import akten_design as A  # noqa: E402
from akten_design import (  # noqa: E402
    AktenDokument, AktenPraesentation, Bewertung, ER, Ergebnis, Liste, Loesung, Notiz, Schema, SQL, Tabelle,
    abfrage_ergebnis, warmup_karten_dokument, zelle_text)

MAT = REPO / "materialien"
ORDNER = MAT / "Akte7_Generalprobe"
MENSA, SAN, KOST = "verhoer/mensa", "pruefung/sanitaetsdienst", "pruefung/kostuemverleih"
EA, GA = "Informatik · erhöhtes Anforderungsniveau (eA)", "Informatik · grundlegendes Anforderungsniveau (gA)"


# ================================================================== Datenbanken
def _db(name):
    c = sqlite3.connect(":memory:")
    c.executescript((REPO / "seed" / "datenbanken" / name / "basis.sql").read_text(encoding="utf-8"))
    return c


DBS = {MENSA: _db(MENSA), SAN: _db(SAN), KOST: _db(KOST)}


def _zahl(v):
    """Kommazahlen mit zwei Nachkommastellen (Preise), sonst wie zelle_text."""
    return f"{v:.2f}".replace(".", ",") if isinstance(v, float) else zelle_text(v)


def _zwei(t):
    return t + "0" if re.fullmatch(r"-?\d+,\d", t) else t


def ausschnitt(db, sql, pk=(), fk=(), weiter=True, groesse=8.5, breiten=None):
    """Tabellenausschnitt (Material) direkt aus der DB; letzte Zeile „…“, wenn weiter=True."""
    cur = DBS[db].execute(sql)
    kopf = [d[0] for d in cur.description]
    zeilen = [[_zahl(v) for v in z] for z in cur.fetchall()]
    if weiter:
        zeilen.append(["…"] * len(kopf))
    return Tabelle(kopf, zeilen, pk=pk, fk=fk, groesse=groesse, breiten=breiten)


def ergebnis(sql, db, max_zeilen=None, breiten=None):
    kopf, zeilen = abfrage_ergebnis(sql, db)
    zeilen = [[_zwei(c) for c in z] for z in zeilen]
    if max_zeilen and len(zeilen) > max_zeilen:
        return Ergebnis(kopf, zeilen[:max_zeilen], abgeschnitten=True, breiten=breiten)
    return Ergebnis(kopf, zeilen, breiten=breiten)


# ================================================================== ER-Diagramme (Chen, Format wie Block `er`)
def ent(i, name, *attr):
    return {"id": i, "name": name, "attribute": [{"name": a.lstrip("_"), "schluessel": a.startswith("_")} for a in attr]}


def bez(i, name, enden, *attr):
    return {"id": i, "name": name, "enden": [dict(zip(("entitaet", "kard", "rolle"), e)) if len(e) == 3 else
                                             {"entitaet": e[0], "kard": e[1]} for e in enden],
            "attribute": [{"name": a} for a in attr]}


def L(**pos):
    return {k.replace("_", "."): {"x": v[0], "y": v[1]} for k, v in pos.items()}


# --- Mensa (Generalprobe eA, Material 4)
MENSA_ENT = [ent("e1", "Person", "_PersonNr", "Vorname", "Nachname", "Rolle", "Klasse"),
             ent("e2", "Angebot", "_AngebotNr", "Datum", "Portionen"),
             ent("e3", "Gericht", "_GerichtNr", "Bezeichnung", "Kategorie", "Preis", "Vegetarisch"),
             ent("e4", "Kuechenkraft", "_KraftNr", "Vorname", "Nachname")]
MENSA_BEZ = [bez("b1", "bestellt", [("e1", "n"), ("e2", "m")], "Menge", "Abgeholt"),
             bez("b2", "bietetAn", [("e3", "1"), ("e2", "n")]),
             bez("b3", "bereitetZu", [("e4", "n"), ("e2", "m")])]
MENSA_LAYOUT = L(e1=(220, 330), e1_0=(70, 250), e1_1=(150, 200), e1_2=(290, 200), e1_3=(70, 420), e1_4=(220, 440),
                 b1=(430, 330), b1_0=(390, 440), b1_1=(500, 455),
                 e2=(640, 330), e2_0=(560, 220), e2_1=(665, 195), e2_2=(770, 225),
                 b2=(850, 330),
                 e3=(1060, 330), e3_0=(950, 220), e3_1=(1085, 190), e3_2=(1215, 235), e3_3=(1225, 310), e3_4=(1225, 385),
                 b3=(640, 465),
                 e4=(640, 600), e4_0=(450, 575), e4_1=(450, 650), e4_2=(830, 620))
ER_MENSA = {"entitaeten": MENSA_ENT, "beziehungen": MENSA_BEZ}

MENSA_LSG_ENT = MENSA_ENT + [ent("e5", "Allergen", "_Kuerzel", "Bezeichnung")]
MENSA_LSG_BEZ = MENSA_BEZ + [bez("b4", "enthaelt", [("e3", "n"), ("e5", "m")], "Hinweis"),
                             bez("b5", "vertritt", [("e4", "1", "Vertretung"), ("e4", "n", "Vertretene")])]
MENSA_LSG = {"entitaeten": MENSA_LSG_ENT, "beziehungen": MENSA_LSG_BEZ}
MENSA_LSG_LAYOUT = dict(MENSA_LAYOUT)
MENSA_LSG_LAYOUT.update(L(b4=(1060, 465), b4_0=(1200, 470), e5=(1060, 600), e5_0=(990, 700), e5_1=(1150, 710),
                          b5=(640, 760)))

# --- Fortbildungsprogramm (Klausur B a)
FORT = {"entitaeten": [ent("e1", "Sanitaeter", "_SanNr", "Vorname", "Nachname", "Klasse"),
                       ent("e2", "Kurs", "_KursNr", "Titel", "Dauer"),
                       ent("e3", "Referent", "_ReferentNr", "Name", "Organisation")],
        "beziehungen": [bez("b1", "nimmtTeil", [("e1", "n"), ("e2", "m")], "Datum", "Bestanden"),
                        bez("b2", "assistiert", [("e1", "n"), ("e2", "m")]),
                        bez("b3", "haelt", [("e3", "1"), ("e2", "n")]),
                        bez("b4", "setztVoraus", [("e2", "n", "Aufbaukurs"), ("e2", "m", "Voraussetzung")])]}
FORT_LAYOUT = L(e1=(230, 330), e1_0=(70, 250), e1_1=(60, 330), e1_2=(70, 410), e1_3=(230, 440),
                b1=(430, 200), b1_0=(370, 90), b1_1=(500, 90),
                b2=(430, 460),
                e2=(640, 330), e2_0=(560, 220), e2_1=(660, 195), e2_2=(760, 225),
                b3=(850, 330),
                e3=(1060, 330), e3_0=(990, 220), e3_1=(1170, 245), e3_2=(1150, 430),
                b4=(640, 560))

# --- Funkgeräte (Klausur B f)
FUNK = {"entitaeten": [ent("e1", "Sanitaeter", "_SanNr"), ent("e2", "Funkgeraet", "_GeraetNr", "Typ"),
                       ent("e3", "Einsatz", "_EinsatzNr")],
        "beziehungen": [bez("b1", "istZugeteilt", [("e1", "1"), ("e2", "n")]),
                        bez("b2", "wirdAusgegeben", [("e2", "n"), ("e3", "m")], "Ausgabezeit")]}
FUNK_LAYOUT = L(e1=(150, 200), e1_0=(150, 90), b1=(440, 200), e2=(730, 200), e2_0=(660, 90), e2_1=(800, 90),
                b2=(1030, 200), b2_0=(1030, 320), e3=(1330, 200), e3_0=(1330, 90))

# --- Aufführungsplanung (Nachschreibklausur B a)
AUFF = {"entitaeten": [ent("e1", "Mitglied", "_MitgliedNr", "Vorname", "Nachname", "Klasse"),
                       ent("e2", "Rolle", "_RollenNr", "Name"),
                       ent("e3", "Auffuehrung", "_AuffNr", "Datum", "Uhrzeit"),
                       ent("e4", "Stueck", "_StueckNr", "Titel"),
                       ent("e5", "Spielort", "_OrtNr", "Bezeichnung", "Plaetze"),
                       ent("e6", "Requisit", "_RequisitNr", "Bezeichnung")],
        "beziehungen": [bez("b1", "spielt", [("e1", "m"), ("e2", "n"), ("e3", "p")]),
                        bez("b2", "vertritt", [("e1", "1", "Zweitbesetzung"), ("e1", "n", "Vertretene")]),
                        bez("b3", "hilftMit", [("e1", "n"), ("e3", "m")], "Aufgabe"),
                        bez("b4", "gehoertZu", [("e4", "1"), ("e2", "n")]),
                        bez("b5", "wirdAufgefuehrt", [("e4", "1"), ("e3", "n")]),
                        bez("b6", "findetStattIn", [("e5", "1"), ("e3", "n")]),
                        bez("b7", "benoetigt", [("e4", "1"), ("e6", "n")])]}
AUFF_LAYOUT = L(e1=(250, 440), e1_0=(80, 360), e1_1=(70, 440), e1_2=(80, 520), e1_3=(250, 330),
                b1=(500, 440),
                e2=(500, 160), e2_0=(420, 60), e2_1=(580, 60),
                b4=(780, 160),
                e4=(1060, 160), e4_0=(990, 60), e4_1=(1130, 60),
                b7=(1300, 160),
                e6=(1300, 330), e6_0=(1240, 430), e6_1=(1390, 430),
                b5=(1060, 440),
                e3=(780, 440), e3_0=(700, 330), e3_1=(840, 320), e3_2=(950, 560),
                b6=(780, 600),
                e5=(780, 780), e5_0=(960, 740), e5_1=(960, 830), e5_2=(800, 890),
                b2=(250, 670),
                b3=(600, 700), b3_0=(600, 810))

# --- Werkstatt (Nachschreibklausur B f)
WERK = {"entitaeten": [ent("e1", "Kostuem", "_KostuemNr"), ent("e2", "Mitglied", "_MitgliedNr"),
                       ent("e3", "Werkstatt", "_WerkstattNr", "Bezeichnung")],
        "beziehungen": [bez("b1", "repariert", [("e1", "n"), ("e2", "m"), ("e3", "p")], "Datum")]}
WERK_LAYOUT = L(e1=(150, 200), e1_0=(150, 90), b1=(480, 200), b1_0=(480, 90), e2=(810, 200), e2_0=(810, 90),
                e3=(480, 400), e3_0=(330, 470), e3_1=(630, 470))



# ================================================================== Prüfungsbaukasten (Aufgabe + Erwartungshorizont)
@dataclass
class Teil:
    """Eine Teilaufgabe: Aufgabentext (gesiezt, Operator fett), AFB-Verteilung (I, II, III), Kernpunkte mit
    Teilpunkten (Bewertungsbogen), Musterlösung, Alternativen, typische Fehler (P-Nummern)."""
    teil: str
    kennung: str
    text: str
    afb: tuple
    kernpunkte: list
    loesung: list = field(default_factory=list)
    varianten: list = field(default_factory=list)
    fehler: list = field(default_factory=list)
    kompetenzen: list = field(default_factory=list)
    inhalt: list = field(default_factory=list)

    @property
    def be(self):
        return sum(self.afb)


EH_HINWEIS = ("**Hinweise zur Bewertung.** Die Kernpunkte nennen, was für die volle Punktzahl erwartet wird; die "
              "Teilpunkte in Klammern sind Richtwerte. Gleichwertige Lösungen (andere Bezeichner, andere Reihenfolge der "
              "Bedingungen, `BETWEEN` statt zwei Vergleichen …) werden voll anerkannt. Alle SQL-Musterlösungen sind nach "
              "EH 2025 §8 formuliert (Verbund nur implizit, GROUP-BY-Regel, kein Alias in HAVING, `!=` statt `<>`) und "
              "maschinell auf der Prüfungs-Datenbank geprüft; die Ergebnistabellen stammen aus der Datenbank. Eine Abfrage, "
              "die in SQLite läuft, aber die EH verletzt (z. B. Spalte weder gruppiert noch aggregiert), erhält für den "
              "betroffenen Kernpunkt keinen Punkt. Typische Fehler sind mit den Fallen-Nummern P1–P10 markiert.")


def _bogen(d, teile, titel):
    zeilen = [Bewertung(t.teil, tuple(f"▸ {k}" for k in t.kernpunkte), afb=t.afb) for t in teile]
    tab = d.bewertungsbogen(zeilen, titel=titel, kennungen={t.teil: t.kennung for t in teile},
                            kompetenzen={t.teil: t.kompetenzen for t in teile if t.kompetenzen})
    for zeile in tab.rows[1:]:
        A._zeile_nicht_teilen(zeile)
    return tab


def pruefung(fassung, *, art, material, titel, untertitel, kurs, dauer, be, datenbank, abschnitte, pfad_aufgabe,
             pfad_eh, gesamt=None):
    """Baut Aufgabenblatt (fassung="schueler") bzw. Erwartungshorizont (fassung="loesung") aus denselben Abschnitten:
    ("aufgabe", Überschrift, [Teil…] wird über die Teile ermittelt) | ("text", str) | ("material", Titel, [Inhalte]) |
    ("teil", Teil) | ("umbruch",)."""
    eh = fassung == "loesung"
    d = AktenDokument("erwartungshorizont" if eh else art, 7, titel, fassung=fassung, ds=13 if art == "generalprobe" else None,
                      material=material, datenbank=datenbank)
    d.klausurkopf(titel, untertitel, kurs=kurs, dauer=dauer, hilfsmittel="Operatorenübersicht", be=be)
    gruppen, aktuell = [], None
    for x in abschnitte:
        if x[0] == "aufgabe":
            aktuell = (x[1], [])
            gruppen.append(aktuell)
        elif x[0] == "teil":
            if aktuell is None:
                aktuell = ("Bewertungsbogen", [])
                gruppen.append(aktuell)
            aktuell[1].append(x[1])
    if eh:
        d.absatz(EH_HINWEIS)
        for kopf, teile in gruppen:
            _bogen(d, teile, "Bewertungsbogen" + ("" if kopf in ("Aufgaben", "Bewertungsbogen") else f" – {kopf}"))
        if gesamt:
            d.absatz(gesamt)
        d.ueberschrift("Aufgaben mit Musterlösungen", 1).paragraph_format.page_break_before = True
    else:
        d.absatz("Bearbeiten Sie die Aufgaben auf gesondertem Papier und notieren Sie auf jedem Blatt Ihren Namen "
                 "(bei der Generalprobe Ihre Ermittlernummer). Die Bewertungseinheiten (BE) stehen hinter jeder Teilaufgabe.")
    umbruch = False   # Seitenumbruch als „Seitenumbruch davor“ am nächsten Absatz (vermeidet Leerseiten)
    for i, x in enumerate(abschnitte):
        if x[0] == "aufgabe":
            d.ueberschrift(x[1], 1).paragraph_format.page_break_before = umbruch
            umbruch = False
        elif x[0] == "text":
            d.absatz(x[1])
        elif x[0] == "material":
            if eh and not x[1].startswith(("1 ·", "4 · Anforderungstext")):
                if "Fortsetzung" not in x[1]:
                    d.absatz(f"*Material {x[1]} – siehe Aufgabenblatt.*")
            else:
                d.materialblock(x[1], *x[2])
        elif x[0] == "umbruch":
            # im Erwartungshorizont nur vor einer neuen Aufgabe umbrechen (Material steht dort verkürzt)
            if not eh or (i + 1 < len(abschnitte) and abschnitte[i + 1][0] == "aufgabe"):
                umbruch = True
        elif x[0] == "teil":
            t = x[1]
            loesung = None
            if eh:
                inhalt = list(t.loesung) + ["Kernpunkte und Teilpunkte: siehe Bewertungsbogen."]
                loesung = Loesung(*inhalt, fehler=t.fehler, varianten=t.varianten)
            absatz = d.teilaufgabe(t.teil, t.text, t.be, kennung=t.kennung, kompetenzen=t.kompetenzen, inhalt=t.inhalt,
                                   loesung=loesung)
            if umbruch:
                absatz.paragraph_format.page_break_before = True
                umbruch = False
            if eh:
                absatz.paragraph_format.keep_with_next = True   # Aufgabe nicht von ihrer Lösung trennen
    return d.speichern(pfad_eh if eh else pfad_aufgabe)


def afb_summe(teile):
    s = [sum(t.afb[i] for t in teile) for i in range(3)]
    g = sum(s)
    return f"I {s[0]} BE ({round(100 * s[0] / g)} %) · II {s[1]} BE ({round(100 * s[1] / g)} %) · III {s[2]} BE ({round(100 * s[2] / g)} %)"


# ================================================================== Generalprobe (Mensa-Vorbestellsystem)
GP_KONTEXT = ("Die Mensa einer Gesamtschule lässt Schülerinnen, Schüler und Beschäftigte ihr Mittagessen online "
              "vorbestellen. Jedes Gericht kann an mehreren Tagen angeboten werden; eine Bestellung bezieht sich immer auf "
              "ein Tagesangebot. Im Attribut Portionen eines Angebots steht die Zahl der **geplanten** Portionen; die "
              "**bestellten** Portionen ergeben sich aus den Mengen der Bestellungen. Abgeholt enthält die Uhrzeit der "
              "Ausgabe und ist NULL, wenn das Essen nicht abgeholt wurde. Küchenkräfte bereiten die Tagesangebote zu. "
              "Eine Person darf dasselbe Tagesangebot auch mehrfach bestellen (z. B. für einen Gast).")
GP_SCHEMA = [Schema("Person(<u>PersonNr</u>, Vorname, Nachname, Rolle, Klasse)"),
             Schema("Gericht(<u>GerichtNr</u>, Bezeichnung, Kategorie, Preis, Vegetarisch)"),
             Schema("Angebot(<u>AngebotNr</u>, ↑GerichtNr, Datum, Portionen)"),
             Schema("Bestellung(<u>BestellNr</u>, ↑PersonNr, ↑AngebotNr, Menge, Abgeholt)"),
             Schema("Kuechenkraft(<u>KraftNr</u>, Vorname, Nachname)"),
             Schema("bereitetZu(<u>↑KraftNr, ↑AngebotNr</u>)")]


def gp_material(ea):
    m = [("material", "1 · Relationenschema", GP_SCHEMA + [
        "Rolle: 'Schüler', 'Lehrkraft' oder 'Personal' (Klasse nur bei Schülerinnen und Schülern, sonst NULL) · "
        "Vegetarisch: 'ja'/'nein' · Preis in Euro · Datum im Format 'JJJJ-MM-TT', Abgeholt im Format 'hh:mm'."]),
        ("material", "2 · Ausschnitte aus den Tabellen", [
            "**Person**", ausschnitt(MENSA, "SELECT * FROM Person WHERE PersonNr IN (6, 14, 17, 30, 36)", pk=("PersonNr",)),
            "**Gericht**", ausschnitt(MENSA, "SELECT * FROM Gericht WHERE GerichtNr IN (2, 3, 4, 6, 9, 13)", pk=("GerichtNr",))]),
        ("material", "2 · Ausschnitte aus den Tabellen (Fortsetzung)", [
            "**Angebot**", ausschnitt(MENSA, "SELECT * FROM Angebot WHERE AngebotNr BETWEEN 41 AND 47", pk=("AngebotNr",),
                                      fk=("GerichtNr",)),
            "**Bestellung**", ausschnitt(MENSA, "SELECT * FROM Bestellung WHERE BestellNr BETWEEN 202 AND 211",
                                         pk=("BestellNr",), fk=("PersonNr", "AngebotNr"))]),
        ("material", "3 · Tabelle BestellUebersicht", [
            "Bevor es das Vorbestellsystem gab, führte die Mensa eine einzige Tabelle. Der folgende Ausschnitt enthält alle "
            "Bestellungen vom 16.03.2027:",
            ausschnitt(MENSA, "SELECT * FROM BestellUebersicht", weiter=False, groesse=8,
                       breiten=[2.0, 1.8, 2.9, 1.4, 2.2, 3.7, 1.2, 1.4])])]
    if ea:
        m.append(("material", "4 · ER-Modell (Ausschnitt)", [ER(ER_MENSA, MENSA_LAYOUT, breite_cm=16.5)]))
    return m


GP_SQL_E = ("SELECT Gericht.Bezeichnung, Gericht.Preis\nFROM Gericht, Angebot\nWHERE Gericht.GerichtNr = Angebot.GerichtNr\n"
            "  AND Angebot.Datum = '2027-03-15'\n  AND Gericht.Vegetarisch = 'ja'\nORDER BY Gericht.Preis")
GP_SQL_F = ("SELECT Gericht.GerichtNr, Gericht.Bezeichnung, SUM(Bestellung.Menge) AS Portionen\n"
            "FROM Gericht, Angebot, Bestellung\nWHERE Gericht.GerichtNr = Angebot.GerichtNr\n"
            "  AND Angebot.AngebotNr = Bestellung.AngebotNr\n  AND Angebot.Datum BETWEEN '2027-03-01' AND '2027-03-31'\n"
            "GROUP BY Gericht.GerichtNr, Gericht.Bezeichnung\nHAVING SUM(Bestellung.Menge) > 50\nORDER BY Portionen DESC")
GP_SQL_G = ("SELECT Person.PersonNr, Person.Vorname, Person.Nachname, COUNT(*) AS Anzahl\nFROM Person, Bestellung, Angebot\n"
            "WHERE Person.PersonNr = Bestellung.PersonNr\n  AND Bestellung.AngebotNr = Angebot.AngebotNr\n"
            "  AND Bestellung.Abgeholt IS NULL\nGROUP BY Person.PersonNr, Person.Vorname, Person.Nachname\n"
            "ORDER BY COUNT(*) DESC\nLIMIT 3")


def gp_teile(ea):
    kenn = "GP-eA" if ea else "GP-gA"
    a = Teil("a", f"{kenn}-a", "**Erläutern** Sie die Kennzeichnungen in der Relation Bestellung (Material 1) und **beurteilen** "
             "Sie, ob das Attributpaar (PersonNr, AngebotNr) anstelle von BestellNr als Primärschlüssel der Relation "
             "Bestellung genügen würde.", (2, 2, 0),
             ["<u>BestellNr</u> als Primärschlüssel: identifiziert jede Bestellung eindeutig (1)",
              "↑PersonNr und ↑AngebotNr als Fremdschlüssel mit Verweis auf Person.PersonNr bzw. Angebot.AngebotNr – wer hat "
              "welches Tagesangebot bestellt (1)",
              "(PersonNr, AngebotNr) nicht geeignet, weil eine Person dasselbe Angebot mehrfach bestellen darf (1)",
              "Beleg an den Daten: Arne Demir (PersonNr 6) hat Angebot 45 zweimal bestellt (BestellNr 204 und 209) (1)"],
             loesung=["BestellNr ist unterstrichen und damit Primärschlüssel: Jeder Wert kommt höchstens einmal vor und ist nie "
                      "NULL, so ist jede Bestellung eindeutig bestimmt. PersonNr und AngebotNr tragen den Pfeil ↑: Es sind "
                      "Fremdschlüssel, deren Werte auf den Primärschlüssel von Person bzw. Angebot verweisen. Über sie ist "
                      "festgehalten, wer bestellt hat und welches Tagesangebot bestellt wurde.",
                      "Das Paar (PersonNr, AngebotNr) wäre nur dann ein geeigneter Schlüssel, wenn jede Person jedes Angebot "
                      "höchstens einmal bestellen könnte. Laut Sachzusammenhang sind Mehrfachbestellungen erlaubt; im "
                      "Ausschnitt kommt das Paar (6, 45) zweimal vor (BestellNr 204 und 209). Das Paar ist also nicht "
                      "eindeutig und als Primärschlüssel ungeeignet."],
             varianten=["Hinweis, dass man Mehrfachbestellungen über eine höhere Menge abbilden und dann (PersonNr, AngebotNr) "
                        "verwenden könnte – voll anerkannt, wenn die Abhängigkeit vom Sachzusammenhang klar wird."],
             fehler=[("P8", "Eindeutigkeit nur am Ausschnitt geprüft („kommt nicht doppelt vor“) bzw. die Zeilen 204/209 übersehen."),
                     ("P7", "Fremdschlüssel nur als „verweist auf eine andere Tabelle“ beschrieben, ohne Ziel-Attribut.")],
             kompetenzen=["K02", "K03", "K05"])
    b = Teil("b", f"{kenn}-b", "**Untersuchen** Sie die Tabelle BestellUebersicht (Material 3) auf Anomalien; gehen Sie dabei "
             "an konkreten Datensätzen auf den Zusammenhang mit der Redundanz ein.", (1, 3, 1),
             ["Redundanz benannt: Name/Klasse je Person, Datum, Gericht und Preis je Gericht mehrfach gespeichert (1)",
              "Änderungsanomalie am Datensatz: Chili sin Carne in Zeile 216 mit 3,25 statt 3,50; Insa Gerdts mit 10b (206) "
              "und 10c (214) (1)",
              "Löschanomalie am Datensatz: Löschen von Bestellung 217 entfernt die einzige Angabe zur Tomatensuppe (und zu "
              "Ida Bultjer) (1)",
              "Einfügeanomalie: neues Gericht oder neue Person ohne Bestellung nicht eintragbar (1)",
              "Zusammenhang: Anomalien entstehen, weil dieselbe Information mehrfach bzw. nur zusammen mit einer Bestellung "
              "gespeichert wird (1)"],
             loesung=["In BestellUebersicht steht zu jeder Bestellung auch alles über Person und Gericht. Dadurch sind Angaben "
                      "**redundant** gespeichert: Der Preis des Hähnchen-Currys steht zehnmal in der Tabelle, Name und Klasse "
                      "von Arne Demir zweimal.",
                      "**Änderungsanomalie:** Ändert sich ein Preis oder eine Klasse, muss jede betroffene Zeile geändert "
                      "werden. Das ist bereits schiefgegangen: Chili sin Carne kostet in den Zeilen 212–215 3,50 €, in Zeile "
                      "216 aber 3,25 €; Insa Gerdts steht in Zeile 206 mit Klasse 10b, in Zeile 214 mit 10c.",
                      "**Löschanomalie:** Wird Bestellung 217 storniert und gelöscht, gehen auch Bezeichnung und Preis der "
                      "Tomatensuppe (und Name von Ida Bultjer) verloren – sie stehen in keiner anderen Zeile.",
                      "**Einfügeanomalie:** Ein neues Gericht (z. B. Kürbissuppe) oder eine neue Person lässt sich erst "
                      "eintragen, wenn es eine Bestellung dazu gibt.",
                      "Ursache aller drei Anomalien ist die Redundanz bzw. die Zusammenlegung verschiedener Sachverhalte "
                      "(Person, Gericht, Bestellung) in einer Tabelle."],
             fehler=[("P10", "Anomalien nur genannt oder allgemein definiert, ohne konkrete Zeilen aus Material 3."),
                     ("P10", "Redundanz mit „doppelten Zeilen“ verwechselt – die Zeilen 204 und 209 sind zwei echte Bestellungen.")],
             kompetenzen=["K07", "K08", "K09", "K10"] if ea else ["K08", "K09", "K10"])
    teile = [a, b]
    if ea:
        teile += [
            Teil("c", "GP-eA-c", "Die Mensa möchte ihr Datenmodell erweitern: Gerichte können **Allergene** enthalten. Ein "
                 "Allergen hat ein Kürzel (z. B. „G“ für glutenhaltiges Getreide) und eine Bezeichnung und kann in vielen "
                 "Gerichten vorkommen. Zu jedem Paar aus Gericht und Allergen soll ein Hinweis gespeichert werden (z. B. "
                 "„nur Spuren“). Außerdem kann jede Küchenkraft bei Abwesenheit von höchstens einer anderen Küchenkraft "
                 "vertreten werden; eine Küchenkraft kann die Vertretung für mehrere andere übernehmen. **Erweitern** Sie das "
                 "ER-Modell (Material 4) um diese Anforderungen. Geben Sie Schlüsselattribute und Kardinalitäten vollständig an.",
                 (0, 3, 3),
                 ["Entitätstyp Allergen mit Schlüsselattribut Kuerzel und Attribut Bezeichnung (1)",
                  "Beziehungstyp enthaelt zwischen Gericht und Allergen (1)",
                  "Kardinalität n:m begründet aus dem Text (1)",
                  "Beziehungsattribut Hinweis an enthaelt, nicht an einem Entitätstyp (1)",
                  "rekursiver Beziehungstyp vertritt an Kuechenkraft mit Rollen (z. B. Vertretung/Vertretene) (1)",
                  "Kardinalität 1:n der rekursiven Beziehung richtig zugeordnet (1)"],
                 loesung=[ER(MENSA_LSG, MENSA_LSG_LAYOUT, breite_cm=15.5, markiert=("e5", "b4", "b5")),
                          "Neu (rot umrandet): Entitätstyp Allergen, Beziehungstypen enthaelt (n:m, Attribut Hinweis) und "
                          "vertritt (rekursiv, 1:n). Eine Küchenkraft in der Rolle Vertretung vertritt n andere; jede "
                          "Küchenkraft hat höchstens eine Vertretung."],
                 fehler=[("P9", "Hinweis als Attribut von Gericht oder Allergen – er hängt vom Paar ab."),
                         ("P9", "vertritt als n:m modelliert oder ohne Rollen; Kardinalitäten vertauscht."),
                         ("P9", "Schlüsselattribut von Allergen nicht unterstrichen.")],
                 kompetenzen=["K35", "K36", "K37", "K39"]),
            Teil("d", "GP-eA-d", "**Überführen** Sie den in Teilaufgabe c) ergänzten Teil des ER-Modells in die Kurzschreibweise "
                 "des Relationenschemas und **begründen** Sie die Umsetzung des Beziehungstyps enthaelt.", (1, 1, 1),
                 ["Allergen(<u>Kuerzel</u>, Bezeichnung) und enthaelt(<u>↑GerichtNr, ↑Kuerzel</u>, Hinweis) (1)",
                  "Kuechenkraft(<u>KraftNr</u>, Vorname, Nachname, ↑VertretungNr) – Fremdschlüssel mit eigenem Namen (1)",
                  "Begründung: n:m braucht eigene Relation, beide Fremdschlüssel bilden den Primärschlüssel, Hinweis gehört "
                  "zum Paar (1)"],
                 loesung=[Schema("Allergen(<u>Kuerzel</u>, Bezeichnung)"),
                          Schema("enthaelt(<u>↑GerichtNr, ↑Kuerzel</u>, Hinweis)"),
                          Schema("Kuechenkraft(<u>KraftNr</u>, Vorname, Nachname, ↑VertretungNr)"),
                          "enthaelt ist eine n:m-Beziehung: Ein Gericht kann mehrere Allergene enthalten und ein Allergen in "
                          "mehreren Gerichten vorkommen. Ein Fremdschlüssel in Gericht oder Allergen könnte nur einen Partner "
                          "aufnehmen; deshalb entsteht eine eigene Relation, deren Primärschlüssel aus beiden Fremdschlüsseln "
                          "besteht. Der Hinweis hängt genau von diesem Paar ab und steht deshalb dort. vertritt (1:n) wird "
                          "dagegen über den Fremdschlüssel ↑VertretungNr in Kuechenkraft umgesetzt."],
                 varianten=["Andere Namen (z. B. ↑VertreterNr, GerichtAllergen) – voll anerkannt, wenn Schlüssel und Verweise stimmen."],
                 fehler=[("P9", "enthaelt mit eigenem künstlichen Schlüssel, aber ohne die beiden Fremdschlüssel."),
                         ("P9", "↑KraftNr als zweite Spalte gleichen Namens in Kuechenkraft (Name schon vergeben).")],
                 kompetenzen=["K04", "K41", "K42"])]
    n = 4 if ea else 2
    bu = "abcdefg"
    teile += [
        Teil(bu[n], f"{kenn}-{bu[n]}", "**Entwerfen** Sie eine SQL-Abfrage, die Bezeichnung und Preis aller vegetarischen "
             "Gerichte ausgibt, die am 15.03.2027 angeboten werden. Das Ergebnis soll aufsteigend nach dem Preis sortiert sein.",
             (2, 1, 0),
             ["Verbund von Gericht und Angebot über GerichtNr (1)",
              "Bedingungen Datum = '2027-03-15' und Vegetarisch = 'ja' mit korrekten Literalen (1)",
              "Ausgabe Bezeichnung, Preis; ORDER BY Preis aufsteigend (1)"],
             loesung=[SQL(GP_SQL_E), ergebnis(GP_SQL_E, MENSA)],
             fehler=[("P5", "Datum als '15.03.2027' oder ohne Hochkommata; 'ja' ohne Hochkommata."),
                     ("P2", "Verbundbedingung vergessen – Kreuzprodukt aus Gericht und Angebot.")],
             kompetenzen=["K17", "K21", "K23", "K32"] if ea else ["K17", "K21", "K23"]),
        Teil(bu[n + 1], f"{kenn}-{bu[n + 1]}", "**Entwerfen** Sie eine SQL-Abfrage, die für jedes Gericht die Gerichtnummer, die "
             "Bezeichnung und die Summe der im März 2027 bestellten Portionen ausgibt. Berücksichtigt werden sollen nur "
             "Gerichte mit mehr als 50 bestellten Portionen; das Ergebnis soll absteigend nach dieser Summe sortiert sein.",
             (1, 3, 1),
             ["Verbund Gericht – Angebot – Bestellung (1)",
              "Zeilenbedingung März 2027 in WHERE (1)",
              "SUM(Bestellung.Menge) statt COUNT bzw. statt Angebot.Portionen (1)",
              "GROUP BY Gericht.GerichtNr, Gericht.Bezeichnung (GROUP-BY-Regel) (1)",
              "HAVING SUM(Bestellung.Menge) > 50 und ORDER BY absteigend (1)"],
             loesung=[SQL(GP_SQL_F), ergebnis(GP_SQL_F, MENSA),
                      "Die Gemüselasagne hat im März genau 50 bestellte Portionen und gehört nicht dazu; ohne die "
                      "März-Bedingung käme sie mit 56 Portionen hinzu."],
             varianten=[SQL(GP_SQL_F.replace("BETWEEN '2027-03-01' AND '2027-03-31'", "LIKE '2027-03-%'"))],
             fehler=[("P1", "März-Bedingung in HAVING bzw. SUM(…) > 50 in WHERE."),
                     ("P4", "COUNT(*) zählt Bestellungen, nicht Portionen."),
                     ("P7", "SUM(Angebot.Portionen) – das sind die geplanten Portionen."),
                     ("P3", "nur nach Bezeichnung gruppiert bzw. GerichtNr im SELECT, aber nicht im GROUP BY."),
                     ("P6", "> 50 als >= 50 (Gemüselasagne käme dazu).")],
             kompetenzen=["K18", "K24", "K25", "K26", "K27"] if ea else ["K24", "K26", "K27"]),
        Teil(bu[n + 2], f"{kenn}-{bu[n + 2]}", "**Analysieren** Sie die folgende SQL-Abfrage im Sachzusammenhang.",
             (2, 2, 0),
             ["Aussage im Sachzusammenhang: die drei Personen mit den meisten nicht abgeholten Bestellungen samt Anzahl (2)",
              "Bedeutung der Klauseln: Verbund, Abgeholt IS NULL, Gruppierung je Person, Sortierung absteigend, LIMIT 3 (1)",
              "Beobachtung: Der Verbund mit Angebot ist für das Ergebnis überflüssig; gezählt werden Bestellungen, nicht "
              "Portionen (1)"],
             inhalt=[SQL(GP_SQL_G)],
             loesung=["Die Abfrage ermittelt die drei Personen (Nummer, Vor- und Nachname), die die meisten Bestellungen "
                      "**nicht abgeholt** haben, und gibt die Anzahl dieser Bestellungen absteigend sortiert aus. Dazu werden "
                      "Person, Bestellung und Angebot verbunden, nur Bestellungen ohne Ausgabezeit (Abgeholt IS NULL) "
                      "berücksichtigt, je Person gruppiert und gezählt. Angebot wird für das Ergebnis nicht gebraucht. Gezählt "
                      "werden Bestellungen, nicht Portionen.", ergebnis(GP_SQL_G, MENSA)],
             fehler=[("P10", "Klauseln nur „übersetzt“ (SELECT wählt …, FROM nimmt …) ohne Aussage über die Mensa."),
                     ("P4", "„die meisten nicht abgeholten Portionen“ – COUNT(*) zählt Bestellungen.")],
             kompetenzen=["K18", "K22", "K28"] if ea else ["K28"])]
    if not ea:
        teile.append(Teil(
            "f", "GP-gA-f", "Die Mensa plant, die Allergie-Angaben der Personen und ihre vollständigen Bestellhistorien "
            "regelmäßig an den externen Caterer und an ein Elternportal zu übermitteln. **Beurteilen** Sie dieses Vorhaben "
            "unter Bezug auf zwei Grundsätze der Datenverarbeitung nach der DSGVO und erläutern Sie eine technische "
            "Schutzmaßnahme.", (0, 2, 2),
            ["Allergie-Angaben sind Gesundheitsdaten (besondere Kategorie, Art. 9 DSGVO): nur mit ausdrücklicher "
             "Einwilligung bzw. eng begrenzt (1)",
             "Zweckbindung: Bestelldaten wurden für die Essensausgabe erhoben; Elternportal und Caterer verfolgen andere "
             "Zwecke (1)",
             "Datenminimierung: Caterer braucht nur Mengen je Gericht und Allergen, keine Namen und Historien; begründetes "
             "Urteil (1)",
             "technische Maßnahme erläutert, z. B. Pseudonymisierung/Aggregation, verschlüsselte Übertragung, Zugriff "
             "nur auf eigene Kinder (1)"],
            loesung=["In dieser Form ist das Vorhaben nicht zulässig. **Zweckbindung:** Die Daten wurden für die Vorbestellung "
                     "und Ausgabe des Essens erhoben; eine Weitergabe an Dritte für andere Zwecke braucht eine eigene "
                     "Rechtsgrundlage. **Datenminimierung:** Der Caterer benötigt nur die Zahl der Portionen je Gericht und "
                     "die Zahl der Portionen ohne bestimmte Allergene – keine Namen und keine Bestellhistorien. Allergie-"
                     "Angaben sind **Gesundheitsdaten** und damit besonders geschützt; sie dürfen nur mit ausdrücklicher "
                     "Einwilligung (bei Minderjährigen der Eltern) verarbeitet werden. Ein Elternportal darf Eltern höchstens "
                     "die Daten ihres eigenen Kindes zeigen.",
                     "**Technische Maßnahme:** Für den Caterer werden die Daten **aggregiert** (Summen je Gericht und "
                     "Allergen) bzw. pseudonymisiert übermittelt; die Übertragung erfolgt verschlüsselt, und im Elternportal "
                     "regelt ein Rechtekonzept, dass nur berechtigte Personen ihre eigenen Daten sehen."],
            fehler=[("P10", "Grundsätze nur genannt, ohne Bezug auf Allergie-Angaben, Caterer und Elternportal; kein Urteil."),
                    ("P10", "Datenschutz mit Datensicherheit verwechselt (nur „Passwort schützen“ als Antwort auf Zweckbindung).")],
            kompetenzen=["K44", "K45", "K46"]))
    return teile


def generalprobe(ea, fassung):
    teile = gp_teile(ea)
    niv = "eA" if ea else "gA"
    abschnitte = [("text", GP_KONTEXT)] + gp_material(ea) + [("aufgabe", "Aufgaben")]
    abschnitte += [("teil", t) for t in teile]
    return pruefung(fassung, art="generalprobe", material=f"GP-{niv}",
                    titel=f"Generalprobe Datenbanken ({niv})", untertitel="Die Ermittlerprüfung · Kontext: Mensa-Vorbestellsystem",
                    kurs=EA if ea else GA, dauer="70 Minuten" if ea else "60 Minuten", be=30 if ea else 25, datenbank=MENSA,
                    abschnitte=abschnitte,
                    pfad_aufgabe=ORDNER / "2_Generalprobe" / f"DD_A7_Generalprobe_{niv}.docx",
                    pfad_eh=ORDNER / "5_Erwartungshorizonte" / f"DD_A7_Generalprobe_{niv}_Erwartungshorizont.docx",
                    gesamt=f"**AFB-Verteilung:** {afb_summe(teile)}.")


# ================================================================== Klausur (Schulsanitätsdienst)
KL_KONTEXT = ("Der Schulsanitätsdienst einer Oberschule dokumentiert seine Einsätze bei Unfällen und Erkrankungen im "
              "Schulalltag: wer bei einem Einsatz eingesetzt war und in welcher Rolle, wo und wann der Einsatz stattfand und "
              "welches Material verbraucht wurde. Neue Mitglieder werden von einer erfahrenen Sanitäterin bzw. einem "
              "erfahrenen Sanitäter betreut; die Leitung des Sanitätsdienstes hat keine Betreuung.")
KL_SCHEMA = [Schema("Sanitaeter(<u>SanNr</u>, Vorname, Nachname, Klasse, Stufe, ↑BetreuerNr)"),
             Schema("Einsatz(<u>EinsatzNr</u>, Datum, Uhrzeit, Ort, Art)"),
             Schema("eingesetzt(<u>↑SanNr, ↑EinsatzNr</u>, Rolle)"),
             Schema("Material(<u>MatNr</u>, Bezeichnung, Bestand)"),
             Schema("verbraucht(<u>↑EinsatzNr, ↑MatNr</u>, Menge)")]
KL_SQL_D = ("SELECT Datum, Uhrzeit, Art\nFROM Einsatz\nWHERE Datum BETWEEN '2027-01-01' AND '2027-01-31'\n"
            "  AND Ort IN ('Sporthalle', 'Pausenhof')\nORDER BY Datum")
KL_SQL_E = ("SELECT s.Vorname, s.Nachname, b.Vorname AS BetreuerVorname, b.Nachname AS BetreuerNachname\n"
            "FROM Sanitaeter s, Sanitaeter b\nWHERE s.BetreuerNr = b.SanNr")
KL_SQL_F = ("SELECT Material.MatNr, Material.Bezeichnung, SUM(verbraucht.Menge) AS Verbrauch\nFROM Material, verbraucht\n"
            "WHERE Material.MatNr = verbraucht.MatNr\nGROUP BY Material.MatNr, Material.Bezeichnung\n"
            "HAVING SUM(verbraucht.Menge) > 20\nORDER BY Verbrauch DESC")
KL_SQL_G = ("SELECT Sanitaeter.SanNr, Sanitaeter.Vorname, Sanitaeter.Nachname, COUNT(*) AS Anzahl\n"
            "FROM Sanitaeter, eingesetzt, Einsatz\nWHERE Sanitaeter.SanNr = eingesetzt.SanNr\n"
            "  AND eingesetzt.EinsatzNr = Einsatz.EinsatzNr\n  AND Einsatz.Art = 'Sportunfall'\n"
            "GROUP BY Sanitaeter.SanNr, Sanitaeter.Vorname, Sanitaeter.Nachname\nORDER BY COUNT(*) DESC\nLIMIT 1")
KL_SQL_H1 = "SELECT SanNr, Vorname, Nachname\nFROM Sanitaeter\nORDER BY SanNr"
KL_SQL_H2 = "SELECT DISTINCT SanNr\nFROM eingesetzt\nORDER BY SanNr"


def kl_material_a():
    return [("text", KL_KONTEXT),
            ("material", "1 · Relationenschema", KL_SCHEMA + [
                "↑BetreuerNr verweist auf die SanNr der betreuenden Person (NULL: keine Betreuung). Stufe: 'Anfänger', "
                "'Fortgeschritten', 'Leitung' · Ort: 'Sporthalle', 'Sporthallenflur', 'Pausenhof', 'Mensa', 'Klassenraum', "
                "'Treppenhaus' · Art: 'Sportunfall', 'Kreislauf', 'Schnittwunde', 'Prellung', 'Sonstiges' · Rolle: "
                "'Ersthelfer', 'Assistenz', 'Dokumentation' · Datum 'JJJJ-MM-TT', Uhrzeit 'hh:mm'."]),
            ("material", "2 · Ausschnitte aus den Tabellen", [
                "**Sanitaeter**", ausschnitt(SAN, "SELECT * FROM Sanitaeter WHERE SanNr IN (1, 2, 3, 5, 8, 13, 16)",
                                             pk=("SanNr",), fk=("BetreuerNr",)),
                "**Einsatz**", ausschnitt(SAN, "SELECT * FROM Einsatz WHERE EinsatzNr BETWEEN 21 AND 25", pk=("EinsatzNr",))]),
            ("material", "2 · Ausschnitte aus den Tabellen (Fortsetzung)", [
                "**eingesetzt**", ausschnitt(SAN, "SELECT * FROM eingesetzt WHERE EinsatzNr BETWEEN 21 AND 23 ORDER BY EinsatzNr, SanNr",
                                             pk=("SanNr", "EinsatzNr"), fk=("SanNr", "EinsatzNr")),
                "**Material**", ausschnitt(SAN, "SELECT * FROM Material WHERE MatNr <= 5", pk=("MatNr",)),
                "**verbraucht**", ausschnitt(SAN, "SELECT * FROM verbraucht WHERE EinsatzNr BETWEEN 21 AND 23",
                                             pk=("EinsatzNr", "MatNr"), fk=("EinsatzNr", "MatNr"))]),
            ("material", "3 · Tabelle EinsatzListe", [
                "Bis zum Umstieg auf die Datenbank führte der Sanitätsdienst eine Tabellenkalkulation. Ausschnitt (alle "
                "Einsätze vom 08.02. bis 12.02.2027):",
                ausschnitt(SAN, "SELECT * FROM EinsatzListe", weiter=False, groesse=8.5)])]


def kl_teile_a():
    return [
        Teil("a", "KL-A-a", "**Erläutern** Sie die Kennzeichnungen in der Relation Sanitaeter (Material 1), insbesondere die "
             "Bedeutung von ↑BetreuerNr.", (2, 1, 0),
             ["SanNr unterstrichen: Primärschlüssel, identifiziert jede Person im Sanitätsdienst eindeutig (1)",
              "↑BetreuerNr: Fremdschlüssel, verweist auf Sanitaeter.SanNr derselben Relation (1)",
              "Bedeutung im Sachzusammenhang: Betreuung neuer durch erfahrene Mitglieder (rekursive Beziehung); anderer "
              "Name, weil SanNr schon vergeben ist; NULL bei der Leitung (1)"],
             loesung=["SanNr ist unterstrichen und damit **Primärschlüssel** der Relation. ↑BetreuerNr ist ein "
                      "**Fremdschlüssel**: Sein Wert ist die SanNr einer anderen Person derselben Relation, nämlich der "
                      "betreuenden Sanitäterin bzw. des betreuenden Sanitäters (z. B. wird Keno Ahrensfeld, SanNr 3, von "
                      "SanNr 1 betreut). Damit ist die rekursive Beziehung *betreut* umgesetzt. Der Fremdschlüssel trägt einen "
                      "eigenen Namen, weil es SanNr in der Relation schon gibt. Bei der Leitung (SanNr 1 und 2) ist er NULL."],
             fehler=[("P7", "↑BetreuerNr als Verweis auf eine (nicht vorhandene) Relation Betreuer gedeutet."),
                     ("P10", "Kennzeichnungen nur benannt („PK“, „FK“) ohne Erläuterung im Sachzusammenhang.")],
             kompetenzen=["K03", "K04", "K05"]),
        Teil("b", "KL-A-b", "Bei langen Einsätzen, etwa beim Sportfest, wechseln Sanitäterinnen und Sanitäter mitunter ihre "
             "Rolle: Wer zunächst assistiert, übernimmt später die Erstversorgung. **Beurteilen** Sie, ob (SanNr, EinsatzNr) "
             "unter dieser Bedingung als Primärschlüssel der Relation eingesetzt geeignet ist.", (0, 2, 1),
             ["Ein Paar (SanNr, EinsatzNr) kann nur eine Zeile und damit nur eine Rolle haben (1)",
              "Rollenwechsel erfordert zwei Zeilen mit demselben Paar → Schlüssel nicht mehr eindeutig, also ungeeignet (1)",
              "begründeter Vorschlag, z. B. Rolle in den Schlüssel aufnehmen (SanNr, EinsatzNr, Rolle) oder Beginn der Rolle "
              "speichern (1)"],
             loesung=["Ohne Rollenwechsel ist das Paar geeignet: Jede Person ist bei einem Einsatz höchstens einmal "
                      "eingesetzt. Mit Rollenwechsel müsste dieselbe Person beim selben Einsatz zweimal gespeichert werden "
                      "(z. B. Jule Witte beim Sportfest-Einsatz 9 erst als Assistenz, dann als Ersthelferin). Das Paar "
                      "(SanNr, EinsatzNr) wäre dann nicht mehr eindeutig und ist als Primärschlüssel **ungeeignet**. Abhilfe: "
                      "Rolle in den Primärschlüssel aufnehmen (SanNr, EinsatzNr, Rolle) – sofern niemand dieselbe Rolle "
                      "zweimal übernimmt – oder zusätzlich den Zeitpunkt des Rollenbeginns speichern."],
             varianten=["Künstlicher Schlüssel (EinsatzRolleNr) mit begründeter Beurteilung – voll anerkannt."],
             fehler=[("P8", "Eignung am Tabellenausschnitt beurteilt („kommt nicht doppelt vor“), ohne den Rollenwechsel."),
                     ("P10", "Urteil ohne Begründung („nein, weil Rollen wechseln“).")],
             kompetenzen=["K02"]),
        Teil("c", "KL-A-c", "**Untersuchen** Sie die Tabelle EinsatzListe (Material 3) auf Anomalien; gehen Sie dabei an "
             "konkreten Datensätzen auf den Zusammenhang mit der Redundanz ein.", (1, 3, 1),
             ["Redundanz: Datum und Ort je Einsatz, Name und Klasse je Person mehrfach (1)",
              "Änderungsanomalie am Datensatz: Nika Kowalski mit 9a (Einsatz 34) und 9b (Einsatz 38) (1)",
              "Löschanomalie am Datensatz: Einsatz 35 (Mensa, 09.02.) steht nur in einer Zeile (1)",
              "Einfügeanomalie: neue Person ohne Einsatz bzw. Einsatz ohne eingesetzte Person nicht eintragbar (1)",
              "Zusammenhang zwischen Redundanz und Anomalie erläutert (1)"],
             loesung=["In EinsatzListe sind Einsatz und Person zusammengelegt. **Redundant** sind Datum und Ort je Einsatz "
                      "(Einsatz 34 dreimal) sowie Name und Klasse je Person (Rune Kahrs zweimal, Nika Kowalski zweimal).",
                      "**Änderungsanomalie:** Ein Klassenwechsel muss in allen Zeilen nachgetragen werden – bei Nika Kowalski "
                      "ist das schon schiefgegangen (9a in Einsatz 34, 9b in Einsatz 38).",
                      "**Löschanomalie:** Einsatz 35 (Mensa, 09.02.2027, Kreislauf) steht nur in der Zeile von Marit Lienemann. "
                      "Wird diese Zeile gelöscht, ist der ganze Einsatz verschwunden.",
                      "**Einfügeanomalie:** Eine neue Sanitäterin, die noch nicht eingesetzt war (z. B. Mats Engelken), lässt "
                      "sich nicht eintragen, ohne eine Einsatzzeile zu erfinden.",
                      "Die Anomalien entstehen, weil Angaben, die nur von der Person bzw. nur vom Einsatz abhängen, in jeder "
                      "Zeile wiederholt werden."],
             fehler=[("P10", "Anomaliearten nur definiert, ohne Zeilen aus Material 3."),
                     ("P10", "Zwei Zeilen von Rune Kahrs als „Fehler“ gewertet – sie sind korrekt, nur redundant.")],
             kompetenzen=["K07", "K08", "K09", "K10"]),
        Teil("d", "KL-A-d", "**Entwerfen** Sie eine SQL-Abfrage, die Datum, Uhrzeit und Art aller Einsätze im Januar 2027 "
             "ausgibt, die in der Sporthalle oder auf dem Pausenhof stattfanden. Das Ergebnis soll nach dem Datum sortiert sein.",
             (2, 1, 0),
             ["Zeitraum Januar 2027 mit korrekten Datumsliteralen, z. B. BETWEEN '2027-01-01' AND '2027-01-31' (1)",
              "Ortsbedingung mit IN bzw. geklammertem OR (1)",
              "Ausgabe Datum, Uhrzeit, Art und ORDER BY Datum (1)"],
             loesung=[SQL(KL_SQL_D), ergebnis(KL_SQL_D, SAN),
                      "Die Einsätze am 18.12.2026 und am 01.02.2027 (Sporthalle) sowie der am 11.01.2027 im Sporthallenflur "
                      "gehören nicht dazu."],
             varianten=[SQL(KL_SQL_D.replace("WHERE Datum BETWEEN '2027-01-01' AND '2027-01-31'\n  AND Ort IN ('Sporthalle', 'Pausenhof')",
                                             "WHERE Datum LIKE '2027-01-%'\n  AND (Ort = 'Sporthalle' OR Ort = 'Pausenhof')"))],
             fehler=[("P6", "OR ohne Klammern: Ort = 'Sporthalle' OR Ort = 'Pausenhof' AND … liefert alle Sporthallen-Einsätze."),
                     ("P6", "Ort LIKE 'Sporthalle%' – erfasst den Sporthallenflur."),
                     ("P5", "Datum als '01.01.2027' oder ohne Hochkommata.")],
             kompetenzen=["K15", "K18", "K21", "K32"]),
        Teil("e", "KL-A-e", "**Entwerfen** Sie eine SQL-Abfrage, die für jede betreute Sanitäterin und jeden betreuten "
             "Sanitäter den Vor- und Nachnamen sowie den Vor- und Nachnamen der betreuenden Person ausgibt.", (1, 2, 1),
             ["zwei Tabellenaliase für Sanitaeter (Verbund der Relation mit sich selbst) (1)",
              "Verbundbedingung in der richtigen Richtung: s.BetreuerNr = b.SanNr (1)",
              "Ausgabe der vier Namensspalten mit Tabellenpräfix (1)",
              "unterscheidbare Spaltennamen (Alias) bzw. erkennbare Zuordnung von Person und Betreuung (1)"],
             loesung=[SQL(KL_SQL_E), ergebnis(KL_SQL_E, SAN, max_zeilen=8),
                      "Ergebnis: 16 Zeilen. Die Leitung (Tjark Holtorf, Svea Möhlmann) erscheint nicht als betreute Person, "
                      "weil BetreuerNr dort NULL ist – das entspricht der Aufgabenstellung."],
             fehler=[("P7", "ohne Tabellenaliase (FROM Sanitaeter, Sanitaeter) bzw. Spalten ohne Präfix – mehrdeutig."),
                     ("P7", "Verbund vertauscht (s.SanNr = b.BetreuerNr): dann stehen die Betreuten in den Betreuer-Spalten."),
                     ("P2", "Verbundbedingung fehlt – Kreuzprodukt 18 × 18.")],
             kompetenzen=["K16", "K24"]),
        Teil("f", "KL-A-f", "**Entwerfen** Sie eine SQL-Abfrage, die Nummer und Bezeichnung aller Materialien mit einem "
             "Gesamtverbrauch von mehr als 20 Stück sowie den Gesamtverbrauch ausgibt, absteigend nach dem Gesamtverbrauch "
             "sortiert.", (1, 3, 1),
             ["Verbund Material – verbraucht (1)",
              "SUM(verbraucht.Menge) statt COUNT (1)",
              "GROUP BY Material.MatNr, Material.Bezeichnung (1)",
              "HAVING SUM(verbraucht.Menge) > 20 (1)",
              "ORDER BY absteigend nach dem Verbrauch (1)"],
             loesung=[SQL(KL_SQL_F), ergebnis(KL_SQL_F, SAN),
                      "Die Kompresse mit genau 20 Stück gehört nicht dazu."],
             fehler=[("P1", "SUM(…) > 20 in WHERE."),
                     ("P4", "COUNT(*) > 20 – zählt Einsätze, nicht Stück (nur drei Materialien)."),
                     ("P3", "nur nach Bezeichnung gruppiert bzw. MatNr nicht im GROUP BY."),
                     ("P7", "SUM(Material.Bestand) statt des Verbrauchs.")],
             kompetenzen=["K21", "K23", "K25", "K26", "K27"]),
        Teil("g", "KL-A-g", "**Analysieren** Sie die folgende SQL-Abfrage im Sachzusammenhang.", (2, 2, 0),
             ["Aussage: die Person aus dem Sanitätsdienst, die bei den meisten Sportunfällen eingesetzt war, mit Anzahl (2)",
              "Klauseln: Verbund über eingesetzt, Filter Art = 'Sportunfall', Gruppierung je Person, absteigend, LIMIT 1 (1)",
              "Hinweis: Rolle spielt keine Rolle; bei Gleichstand würde nur eine Person ausgegeben (1)"],
             inhalt=[SQL(KL_SQL_G)],
             loesung=["Die Abfrage ermittelt, welche Sanitäterin bzw. welcher Sanitäter bei den **meisten Sportunfällen** "
                      "eingesetzt war – in welcher Rolle, ist egal – und gibt Nummer, Namen und Anzahl dieser Einsätze aus. "
                      "Dazu werden die Einsätze über eingesetzt den Personen zugeordnet, nur Sportunfälle gezählt, je Person "
                      "gruppiert, absteigend sortiert und nur die erste Zeile ausgegeben. Hätten zwei Personen gleich viele "
                      "Einsätze, würde nur eine davon angezeigt.", ergebnis(KL_SQL_G, SAN)],
             fehler=[("P10", "Beschreibung der Klauseln ohne Aussage über den Sanitätsdienst."),
                     ("P10", "„alle Sportunfälle“ – LIMIT 1 übersehen.")],
             kompetenzen=["K22", "K28"]),
        Teil("h", "KL-A-h", "Die Leitung möchte wissen, welche Sanitäterinnen und Sanitäter noch nie eingesetzt wurden. "
             "**Beschreiben** Sie ein Vorgehen, mit dem sich das ermitteln lässt, ohne eine Unterabfrage zu verwenden.",
             (0, 2, 1),
             ["Schritt 1: alle Personen aus Sanitaeter abfragen (1)",
              "Schritt 2: alle SanNr abfragen, die in eingesetzt vorkommen (DISTINCT) (1)",
              "Vergleich der Listen: wer in Schritt 1, aber nicht in Schritt 2 vorkommt; Begründung, warum ein Verbund "
              "allein nicht genügt (1)"],
             loesung=["Ein Verbund von Sanitaeter und eingesetzt liefert nur Personen, die **mindestens einmal** eingesetzt "
                      "waren – wer nie eingesetzt war, fällt heraus. Vorgehen in zwei Schritten:",
                      SQL(KL_SQL_H1), SQL(KL_SQL_H2),
                      "Wer in der ersten Liste steht, aber nicht in der zweiten, wurde noch nie eingesetzt (hier SanNr 16 "
                      "Mats Engelken und 17 Tomke Beckhusen)."],
             varianten=["Anzahl der Einsätze je Person per Verbund und GROUP BY ermitteln und mit der Liste aller Personen "
                        "vergleichen – voll anerkannt."],
             fehler=[("P2", "WHERE Sanitaeter.SanNr != eingesetzt.SanNr – liefert fast alle Kombinationen."),
                     ("P5", "„WHERE EinsatzNr IS NULL“ im Verbund – im Verbund gibt es diese Zeilen gar nicht.")],
             kompetenzen=["K30"])]


KL_FORTBILDUNG = ("Der Sanitätsdienst bietet Fortbildungskurse an. Jeder Kurs hat eine Nummer, einen Titel und eine Dauer "
                  "in Stunden. Ein Kurs wird von genau einer externen Referentin bzw. einem externen Referenten gehalten; "
                  "von ihnen werden eine Nummer, der Name und die Organisation gespeichert, für die sie tätig sind. Eine "
                  "Referentin bzw. ein Referent kann mehrere Kurse halten. Sanitäterinnen und Sanitäter nehmen an Kursen "
                  "teil; gespeichert werden das Datum der Teilnahme und ob der Kurs bestanden wurde. Erfahrene "
                  "Sanitäterinnen und Sanitäter können außerdem in Kursen assistieren. Manche Kurse setzen andere Kurse "
                  "voraus (z. B. setzt „AED-Training“ den „Erste-Hilfe-Grundkurs“ voraus); ein Kurs kann mehrere "
                  "Voraussetzungen haben und selbst Voraussetzung für mehrere Kurse sein.")
KL_PROTOKOLL = ("Der Sanitätsdienst möchte Einsatzprotokolle künftig in einer Cloud-App führen. Gespeichert werden Name und "
                "Klasse der versorgten Person, Art der Verletzung bzw. Erkrankung, Vorerkrankungen, die durchgeführten "
                "Maßnahmen und die eingesetzten Sanitäterinnen und Sanitäter. Die Schulleitung soll monatlich eine "
                "Statistik erhalten, außerdem sollen Klassenlehrkräfte die Protokolle ihrer Klasse einsehen können.")


def kl_material_b():
    return [("material", "4 · Anforderungstext „Fortbildungsprogramm“", [KL_FORTBILDUNG]),
            ("material", "5 · Ausschnitt eines Relationenschemas", [
                Schema("Funkgeraet(<u>GeraetNr</u>, Typ, ↑SanNr)"),
                Schema("Ausgabe(<u>↑GeraetNr, ↑EinsatzNr</u>, Ausgabezeit)"),
                "↑SanNr verweist auf Sanitaeter, ↑EinsatzNr auf Einsatz (Material 1)."]),
            ("material", "6 · Digitale Einsatzprotokolle", [KL_PROTOKOLL])]


def kl_teile_b():
    return [
        Teil("a", "KL-B-a", "**Entwickeln** Sie zum Anforderungstext (Material 4) ein ER-Modell in Chen-Notation mit allen "
             "Entitätstypen, Schlüsselattributen, Beziehungstypen, Kardinalitäten und Beziehungsattributen.", (3, 5, 2),
             ["Entitätstypen Sanitaeter, Kurs, Referent mit Attributen (2) und unterstrichenen Schlüsselattributen (1)",
              "haelt: Referent 1 – Kurs n (1)",
              "nimmtTeil: Sanitaeter n – Kurs m (1) mit Beziehungsattributen Datum und Bestanden (1)",
              "assistiert als zweiter, eigener Beziehungstyp zwischen Sanitaeter und Kurs, n:m (1)",
              "setztVoraus rekursiv an Kurs (1), n:m mit Rollen (z. B. Aufbaukurs/Voraussetzung) (1)",
              "Benennung nach EH (Verben in lowerCamelCase, Entitätstypen im Singular) (1)"],
             loesung=[ER(FORT, FORT_LAYOUT, breite_cm=15.5)],
             varianten=["Weitere sinnvolle Attribute (z. B. Klasse) oder andere Verben (z. B. besucht, unterstuetzt)."],
             fehler=[("P9", "nimmtTeil und assistiert zu einer Beziehung zusammengefasst."),
                     ("P9", "Datum/Bestanden an Kurs oder Sanitaeter statt an nimmtTeil."),
                     ("P9", "setztVoraus als 1:n oder ohne Rollen; Kardinalität von haelt vertauscht.")],
             kompetenzen=["K35", "K36", "K37", "K38", "K47"]),
        Teil("b", "KL-B-b", "**Begründen** Sie die Kardinalitäten der Beziehungstypen nimmtTeil und haelt im Sachzusammenhang.",
             (1, 2, 0),
             ["haelt: ein Kurs hat genau eine Referentin bzw. einen Referenten, diese können mehrere Kurse halten → 1:n (1)",
              "nimmtTeil: eine Person kann an mehreren Kursen teilnehmen, ein Kurs hat mehrere Teilnehmende → n:m (1)",
              "Kardinalität jeweils in beide Richtungen gelesen und am Text belegt (1)"],
             loesung=["**haelt (1:n):** Laut Text wird ein Kurs von genau einer externen Person gehalten (Seite Referent: 1); "
                      "eine Referentin kann aber mehrere Kurse halten (Seite Kurs: n).",
                      "**nimmtTeil (n:m):** Eine Sanitäterin kann an mehreren Kursen teilnehmen, und an einem Kurs nehmen "
                      "mehrere Sanitäterinnen und Sanitäter teil."],
             fehler=[("P9", "nur eine Leserichtung betrachtet."), ("P10", "Kardinalität genannt, aber nicht am Text begründet.")],
             kompetenzen=["K34"]),
        Teil("c", "KL-B-c", "Die Leitung des Sanitätsdienstes behauptet: „Mit dem ER-Modell lässt sich sicherstellen, dass ein "
             "Kurs höchstens 12 Teilnehmende hat.“ **Beurteilen** Sie diese Aussage.", (0, 1, 1),
             ["Kardinalitäten 1, n, m drücken nur „eins“ bzw. „beliebig viele“ aus; eine Höchstzahl ist nicht darstellbar (1)",
              "Urteil: Aussage falsch; die Grenze muss z. B. in der Anwendung bzw. als Integritätsbedingung geprüft werden (1)"],
             loesung=["Die Aussage trifft nicht zu. In der Chen-Notation nach EH gibt es nur die Kardinalitäten 1, n und m. "
                      "Das „m“ bei nimmtTeil bedeutet „beliebig viele“ – eine Obergrenze von 12 lässt sich nicht ausdrücken. "
                      "Sie muss zusätzlich festgehalten und z. B. von der Anwendung beim Anmelden geprüft werden."],
             fehler=[("P10", "„stimmt, man schreibt 12 an die Kante“ – keine (min,max)-Notation im EH.")],
             kompetenzen=["K40"]),
        Teil("d", "KL-B-d", "**Erstellen** Sie zu Ihrem ER-Modell aus Teilaufgabe a) das Relationenschema in Kurzschreibweise.",
             (3, 2, 1),
             ["Relationen Sanitaeter, Kurs, Referent mit Primärschlüsseln (1)",
              "Kurs mit Fremdschlüssel ↑ReferentNr (1:n auf der n-Seite) (1)",
              "nimmtTeil mit zusammengesetztem Primärschlüssel aus zwei Fremdschlüsseln (1) und Datum, Bestanden (1)",
              "assistiert als eigene Relation (1)",
              "setztVoraus mit zwei Fremdschlüsseln auf Kurs, einer davon umbenannt (1)"],
             loesung=[Schema("Sanitaeter(<u>SanNr</u>, Vorname, Nachname, Klasse)"),
                      Schema("Referent(<u>ReferentNr</u>, Name, Organisation)"),
                      Schema("Kurs(<u>KursNr</u>, Titel, Dauer, ↑ReferentNr)"),
                      Schema("nimmtTeil(<u>↑SanNr, ↑KursNr</u>, Datum, Bestanden)"),
                      Schema("assistiert(<u>↑SanNr, ↑KursNr</u>)"),
                      Schema("setztVoraus(<u>↑KursNr, ↑VoraussetzungNr</u>)"),
                      "Folgefehler aus a) werden nicht erneut abgezogen, wenn die Überführung zum eigenen Modell passt."],
             varianten=["nimmtTeil mit Datum im Primärschlüssel, wenn Wiederholungen nicht bestandener Kurse möglich sein sollen – "
                        "mit Begründung voll anerkannt."],
             fehler=[("P9", "↑KursNr in Referent (Fremdschlüssel auf der 1-Seite)."),
                     ("P9", "setztVoraus(↑KursNr, ↑KursNr) – zwei gleichnamige Attribute.")],
             kompetenzen=["K04", "K41"]),
        Teil("e", "KL-B-e", "**Begründen** Sie, warum der Beziehungstyp setztVoraus als eigene Relation umgesetzt werden muss, "
             "während haelt durch einen Fremdschlüssel umgesetzt werden kann.", (0, 1, 1),
             ["haelt ist 1:n: jeder Kurs hat genau einen Verweis → ein Fremdschlüssel in Kurs genügt (1)",
              "setztVoraus ist n:m: ein Kurs kann mehrere Voraussetzungen haben → ein einzelnes Attribut reicht nicht, "
              "eigene Relation mit zwei Fremdschlüsseln (1)"],
             loesung=["Bei haelt (1:n) gehört zu jedem Kurs genau eine Referentin bzw. ein Referent – ein einziger Wert "
                      "↑ReferentNr in Kurs reicht. setztVoraus ist dagegen n:m: Ein Kurs kann mehrere Voraussetzungen haben "
                      "und Voraussetzung für mehrere Kurse sein. In Kurs müsste man dafür mehrere Werte in einer Zelle "
                      "speichern (nicht atomar); deshalb entsteht eine eigene Relation mit zwei Fremdschlüsseln auf Kurs."],
             fehler=[("P9", "„rekursiv ⇒ immer eigene Relation“ – entscheidend ist die Kardinalität.")],
             kompetenzen=["K42"]),
        Teil("f", "KL-B-f", "Gegeben ist ein Ausschnitt eines weiteren Relationenschemas (Material 5). **Erstellen** Sie das "
             "zugehörige ER-Diagramm.", (1, 2, 0),
             ["Entitätstyp Funkgeraet mit GeraetNr (Schlüssel) und Typ; Sanitaeter und Einsatz mit Schlüsseln (1)",
              "Sanitaeter 1 – Funkgeraet n aus dem Fremdschlüssel ↑SanNr (1)",
              "Funkgeraet n – Einsatz m mit Beziehungsattribut Ausgabezeit aus der Relation Ausgabe (1)"],
             loesung=[ER(FUNK, FUNK_LAYOUT, breite_cm=13),
                      "Die Beziehungsnamen sind frei wählbar (z. B. *gehoertZu*, *wirdAusgegeben*)."],
             fehler=[("P9", "Ausgabe als Entitätstyp ohne eigenes Schlüsselattribut."),
                     ("P9", "Kardinalität bei ↑SanNr vertauscht (Funkgeraet 1 – Sanitaeter n).")],
             kompetenzen=["K43"]),
        Teil("g", "KL-B-g", "**Beurteilen** Sie das Vorhaben digitaler Einsatzprotokolle (Material 6) unter Bezug auf zwei "
             "Grundsätze der DSGVO und auf die besondere Kategorie der Gesundheitsdaten und erläutern Sie eine technische "
             "Maßnahme zum Schutz der Daten.", (1, 2, 1),
             ["Gesundheitsdaten (Verletzungsart, Vorerkrankungen) als besondere Kategorie erkannt (1)",
              "zwei Grundsätze am Fall angewendet, z. B. Zweckbindung (Statistik, Einsicht der Klassenlehrkräfte) und "
              "Datenminimierung (Statistik ohne Namen) (1)",
              "begründetes Urteil (1)",
              "technische Maßnahme erläutert, z. B. Verschlüsselung, Rollen- und Rechtekonzept, Pseudonymisierung der "
              "Statistik, Speicherfristen (1)"],
             loesung=["Angaben zu Verletzungen und Vorerkrankungen sind **Gesundheitsdaten** und gehören zu den besonders "
                      "geschützten Kategorien. Ihre Verarbeitung ist nur eng begrenzt zulässig (z. B. zur Versorgung und mit "
                      "Einwilligung). **Zweckbindung:** Die Protokolle dienen der Erstversorgung und der Dokumentation; eine "
                      "Einsicht aller Klassenlehrkräfte geht darüber hinaus. **Datenminimierung:** Die Schulleitung braucht "
                      "für eine Statistik nur Anzahlen je Art und Ort – keine Namen und Klassen. Urteil: Das Vorhaben ist "
                      "nur vertretbar, wenn die Statistik anonymisiert ist, die Einsicht auf die Leitung des Sanitätsdienstes "
                      "beschränkt bleibt und die Cloud-Speicherung den Anforderungen genügt (Auftragsverarbeitung, Speicherort).",
                      "**Technische Maßnahme:** Verschlüsselung der Protokolle bei Übertragung und Speicherung sowie ein "
                      "Rechtekonzept, das Zugriff nur für die Leitung erlaubt; für die Statistik nur aggregierte Werte."],
             fehler=[("P10", "nur Grundsätze aufgezählt, ohne Bezug auf das Szenario und ohne Urteil."),
                     ("P10", "Datensicherheit (Passwort) als Antwort auf eine Frage der Zulässigkeit.")],
             kompetenzen=["K44", "K45", "K46"])]


def ausbildung_material(nr):
    return ("material", f"{nr} · Rohliste der Fortbildungen", [
        "Vor der Datenbank wurden die Fortbildungen in einer Tabellenkalkulation festgehalten (Ausschnitt):",
        ausschnitt(SAN, "SELECT * FROM AusbildungRoh", weiter=False, groesse=8,
                   breiten=[1.3, 2.6, 3.2, 3.7, 3.3, 1.9])])


def kl_teile_bga():
    return [
        Teil("a", "KL-BgA-a", "**Untersuchen** Sie die Tabelle AusbildungRoh (Material 4) auf Redundanzen und nicht-atomare "
             "Werte; erläutern Sie die Folgen für die Auswertung „Wie viele Sanitäterinnen und Sanitäter haben den "
             "AED-Kurs besucht?“", (1, 2, 1),
             ["Redundanz: Referent und Telefonnummer mehrfach (z. B. Kerstin Haake / 0000-3141 in vier Zeilen) (1)",
              "nicht-atomare Werte: Kurse, Referent, RefTelefon als Listen in einer Zelle (1)",
              "Folge für die Auswertung: Kurse = 'AED' findet nur eine Zeile, LIKE '%AED%' ist unsicher (Schreibweise "
              "„Defi (AED)“) (1)",
              "Ergebnis/Einordnung: tatsächlich vier, aber nur durch manuelles Lesen; Raum je Zeile ist keinem Kurs "
              "zuzuordnen (1)"],
             loesung=["**Redundant** sind Referent und Telefonnummer: Kerstin Haake mit 0000-3141 steht in vier Zeilen, Ulf "
                      "Meinecke in vier Zeilen. **Nicht atomar** sind Kurse, Referent und RefTelefon – sie enthalten Listen "
                      "(„Erste Hilfe, AED“), deren Teile nur über die Reihenfolge zusammengehören; der Raum lässt sich bei "
                      "mehreren Kursen keinem Kurs zuordnen.",
                      "Für die Auswertung heißt das: Eine Bedingung Kurse = 'AED' trifft nur die Zeile von Yara Haddad. Mit "
                      "Kurse LIKE '%AED%' wären es vier – das gelingt aber nur, weil „Defi (AED)“ zufällig die Buchstaben "
                      "enthält; jede abweichende Schreibweise (etwa „Defibrillator“) würde übersehen. Eine verlässliche "
                      "Zählung ist so nicht möglich."],
             fehler=[("P10", "nur „es gibt Redundanz“ ohne Datensatz; Folgen für die Auswertung nicht erläutert.")],
             kompetenzen=["K07", "K14"]),
        Teil("b", "KL-BgA-b", "**Erläutern** Sie je eine Einfüge- und eine Löschanomalie an einem konkreten Datensatz der "
             "Tabelle AusbildungRoh.", (1, 2, 0),
             ["Einfügeanomalie: neuer Kurs bzw. neue Referentin ohne teilnehmende Person nicht eintragbar (1)",
              "Löschanomalie: Löschen der Zeile von Linus Vosgerau entfernt die einzige Angabe zu Gesa Wendelken und zum "
              "Kurs Sportverletzungen (1)",
              "jeweils am konkreten Datensatz erläutert (1)"],
             loesung=["**Einfügeanomalie:** Ein neuer Kurs (z. B. „Funk für Fortgeschrittene“) mit einer neuen Referentin "
                      "lässt sich erst eintragen, wenn eine Sanitäterin bzw. ein Sanitäter daran teilnimmt – jede Zeile "
                      "beginnt mit einer Person.",
                      "**Löschanomalie:** Verlässt Linus Vosgerau den Sanitätsdienst und wird seine Zeile gelöscht, gehen "
                      "auch die einzigen Angaben zum Kurs „Sportverletzungen“ und zu Gesa Wendelken samt Telefonnummer verloren."],
             varianten=["Änderungsanomalie statt einer der beiden nur mit Teilpunkt (Ulf Meinecke mit 0000-2718 und 0000-2781)."],
             fehler=[("P10", "Anomalie nur definiert, ohne Zeile aus Material 4.")],
             kompetenzen=["K08"]),
        Teil("c", "KL-BgA-c", "**Beurteilen** Sie das Vorhaben digitaler Einsatzprotokolle (Material 5) unter Bezug auf zwei "
             "Grundsätze der DSGVO und auf die besondere Kategorie der Gesundheitsdaten. Grenzen Sie dabei Datenschutz und "
             "Datensicherheit voneinander ab.", (1, 2, 2),
             ["Gesundheitsdaten als besondere Kategorie erkannt (1)",
              "zwei Grundsätze am Fall angewendet (Zweckbindung, Datenminimierung, Speicherbegrenzung …) (2)",
              "Abgrenzung: Datenschutz = Schutz der Person/Rechtmäßigkeit der Verarbeitung; Datensicherheit = technischer "
              "Schutz der Daten (Verschlüsselung, Zugriff, Backup) (1)",
              "begründetes Urteil (1)"],
             loesung=["Verletzungsart und Vorerkrankungen sind **Gesundheitsdaten** (besondere Kategorie) und nur eng begrenzt "
                      "zu verarbeiten. **Zweckbindung:** Erhoben für Versorgung und Dokumentation – die Einsicht aller "
                      "Klassenlehrkräfte dient anderen Zwecken. **Datenminimierung:** Für die Statistik genügen Anzahlen ohne "
                      "Namen und Klassen.",
                      "**Datenschutz** fragt, ob und wozu personenbezogene Daten verarbeitet werden dürfen (Schutz der "
                      "Persönlichkeitsrechte). **Datensicherheit** sorgt technisch dafür, dass die Daten nicht verloren gehen "
                      "oder in falsche Hände geraten (Verschlüsselung, Zugriffsrechte, Sicherungen). Urteil: nur mit "
                      "anonymisierter Statistik, eng begrenztem Zugriff und gesicherter Cloud vertretbar."],
             fehler=[("P10", "Datenschutz und Datensicherheit gleichgesetzt."), ("P10", "kein Urteil.")],
             kompetenzen=["K44", "K45", "K46"]),
        Teil("d", "KL-BgA-d", "Die Schulleitung überlegt, die Einsatzprotokolle automatisiert auszuwerten, um Häufungen von "
             "Unfällen einzelnen Schülerinnen und Schülern zuzuordnen. **Erörtern** Sie Chancen und Risiken dieser "
             "Auswertung.", (0, 2, 1),
             ["Chance: Gefahrenstellen und Risikogruppen erkennen, gezielte Prävention (1)",
              "Risiko: Profilbildung über einzelne Personen, Stigmatisierung, Fehlschlüsse aus kleinen Zahlen (1)",
              "abwägendes Fazit, z. B. Auswertung nach Ort/Art statt nach Personen (1)"],
             loesung=["**Chancen:** Häufungen nach Ort (z. B. Sporthalle) oder Art lassen sich erkennen; Prävention wird gezielter. "
                      "**Risiken:** Werden Unfälle Personen zugeordnet, entstehen Profile („unfallanfällig“), die zu "
                      "Stigmatisierung führen können; bei kleinen Zahlen sind Fehlschlüsse wahrscheinlich, und Gesundheitsdaten "
                      "würden für einen neuen Zweck genutzt. **Fazit:** Eine Auswertung nach Ort, Art und Zeit ohne "
                      "Personenbezug erreicht das Ziel weitgehend und vermeidet die Profilbildung."],
             fehler=[("P10", "nur Chancen oder nur Risiken; kein Fazit.")],
             kompetenzen=["K46"])]


def klausur(ea, fassung):
    ta, tb = kl_teile_a(), (kl_teile_b() if ea else kl_teile_bga())
    niv = "eA" if ea else "gA"
    abschnitte = [("aufgabe", "Aufgabe A · Einsätze des Sanitätsdienstes (30 BE)")] + kl_material_a() + \
        [("umbruch",)] + [("teil", t) for t in ta] + [("umbruch",)]
    if ea:
        abschnitte += [("aufgabe", "Aufgabe B · Fortbildungsprogramm und Einsatzprotokolle (30 BE)"),
                       ("text", "Der Sanitätsdienst (Aufgabe A) plant eine Erweiterung seiner Datenbank.")] + kl_material_b()
    else:
        abschnitte += [("aufgabe", "Aufgabe B · Fortbildungen und Einsatzprotokolle (15 BE)"),
                       ("text", "Der Sanitätsdienst (Aufgabe A) will seine Fortbildungen in die Datenbank übernehmen und plant "
                                "digitale Einsatzprotokolle."),
                       ausbildung_material(4), ("material", "5 · Digitale Einsatzprotokolle", [KL_PROTOKOLL])]
    abschnitte += [("teil", t) for t in tb]
    gesamt = f"**Gesamt:** {60 if ea else 45} BE · AFB {afb_summe(ta + tb)}."
    if ea:
        gesamt += (" **Kürzung auf 45 BE (modular):** Aufgabe A a, c, e, f, g (21 BE) und Aufgabe B a, c, d, e, g (24 BE); "
                   "Bearbeitungszeit dann 90 Minuten.")
    return pruefung(fassung, art="klausur", material=f"KL-{niv}", titel=f"Klausur Datenbanken ({niv})",
                    untertitel="Kontext: Schulsanitätsdienst", kurs=EA if ea else GA,
                    dauer="135 Minuten" if ea else "90 Minuten", be=60 if ea else 45, datenbank=SAN, abschnitte=abschnitte,
                    pfad_aufgabe=ORDNER / "3_Klausur" / f"DD_A7_Klausur_{niv}.docx",
                    pfad_eh=ORDNER / "5_Erwartungshorizonte" / f"DD_A7_Klausur_{niv}_Erwartungshorizont.docx", gesamt=gesamt)


# ================================================================== Nachschreibklausur (Kostümverleih der Theater-AG)
NK_KONTEXT = ("Die Theater-AG eines Gymnasiums verleiht ihren Kostümfundus an die eigenen Mitglieder für Proben und "
              "Aufführungen. Erfasst wird, wer welches Kostüm für welche Rolle in welchem Stück von wann bis wann ausgeliehen "
              "hat; Bis ist NULL, solange das Kostüm nicht zurückgegeben ist. Ältere Mitglieder begleiten als Patin bzw. "
              "Pate neue Mitglieder.")
NK_SCHEMA = [Schema("Mitglied(<u>MitgliedNr</u>, Vorname, Nachname, Klasse, ↑PateNr)"),
             Schema("Kostuem(<u>KostuemNr</u>, Bezeichnung, Groesse, Epoche, Zustand)"),
             Schema("Stueck(<u>StueckNr</u>, Titel, Premiere)"),
             Schema("Rolle(<u>RollenNr</u>, Name, ↑StueckNr)"),
             Schema("Ausleihe(<u>AusleihNr</u>, ↑KostuemNr, ↑MitgliedNr, ↑RollenNr, Von, Bis)")]
NK_SQL_D = ("SELECT Kostuem.Bezeichnung, Mitglied.Vorname, Mitglied.Nachname\nFROM Kostuem, Ausleihe, Mitglied\n"
            "WHERE Kostuem.KostuemNr = Ausleihe.KostuemNr\n  AND Ausleihe.MitgliedNr = Mitglied.MitgliedNr\n"
            "  AND Ausleihe.Bis IS NULL")
NK_SQL_E = ("SELECT Stueck.Titel, Rolle.Name, Kostuem.Bezeichnung\nFROM Stueck, Rolle, Ausleihe, Kostuem\n"
            "WHERE Stueck.StueckNr = Rolle.StueckNr\n  AND Rolle.RollenNr = Ausleihe.RollenNr\n"
            "  AND Ausleihe.KostuemNr = Kostuem.KostuemNr\n  AND Kostuem.Epoche = 'Barock'")
NK_SQL_F = ("SELECT Mitglied.MitgliedNr, Mitglied.Vorname, Mitglied.Nachname, COUNT(*) AS Ausleihen\n"
            "FROM Mitglied, Ausleihe\nWHERE Mitglied.MitgliedNr = Ausleihe.MitgliedNr\n"
            "GROUP BY Mitglied.MitgliedNr, Mitglied.Vorname, Mitglied.Nachname\nHAVING COUNT(*) > 3\n"
            "ORDER BY COUNT(*) DESC\nLIMIT 3")
NK_SQL_G = ("SELECT m.Vorname, m.Nachname, m.Klasse, p.Vorname AS PateVorname, p.Nachname AS PateNachname\n"
            "FROM Mitglied m, Mitglied p\nWHERE m.PateNr = p.MitgliedNr\n  AND p.Klasse LIKE '12%'")
NK_SQL_H1 = "SELECT KostuemNr, Bezeichnung\nFROM Kostuem\nORDER BY KostuemNr"
NK_SQL_H2 = "SELECT DISTINCT KostuemNr\nFROM Ausleihe\nORDER BY KostuemNr"


def nk_material_a():
    return [("text", NK_KONTEXT),
            ("material", "1 · Relationenschema", NK_SCHEMA + [
                "↑PateNr verweist auf die MitgliedNr der Patin bzw. des Paten (NULL: ohne Pate). Epoche: 'Antike', "
                "'Mittelalter', 'Barock', '19. Jahrhundert', 'Moderne' · Groesse 'S', 'M', 'L', 'XL' · Zustand 'gut', "
                "'reparaturbedürftig' · Klasse '7a' … '12c' · Datum 'JJJJ-MM-TT'."]),
            ("material", "2 · Ausschnitte aus den Tabellen", [
                "**Mitglied**", ausschnitt(KOST, "SELECT * FROM Mitglied WHERE MitgliedNr IN (1, 2, 3, 6, 9, 16, 20)",
                                           pk=("MitgliedNr",), fk=("PateNr",)),
                "**Kostuem**", ausschnitt(KOST, "SELECT * FROM Kostuem WHERE KostuemNr IN (6, 7, 14, 15, 17, 23)",
                                          pk=("KostuemNr",)),
                "**Stueck**", ausschnitt(KOST, "SELECT * FROM Stueck", pk=("StueckNr",), weiter=False)]),
            ("material", "2 · Ausschnitte aus den Tabellen (Fortsetzung)", [
                "**Rolle**", ausschnitt(KOST, "SELECT * FROM Rolle WHERE RollenNr IN (1, 2, 3, 13, 15, 16)", pk=("RollenNr",),
                                        fk=("StueckNr",)),
                "**Ausleihe**", ausschnitt(KOST, "SELECT * FROM Ausleihe WHERE KostuemNr IN (6, 14, 15)", pk=("AusleihNr",),
                                           fk=("KostuemNr", "MitgliedNr", "RollenNr"))]),
            ("material", "3 · Tabelle KostuemRolle", [
                "Für die Kostümplanung führt die Kostümwartin eine eigene Tabelle (Ausschnitt):",
                ausschnitt(KOST, "SELECT * FROM KostuemRolle", weiter=False, groesse=8.5,
                           breiten=[2.1, 3.4, 1.9, 3.4, 3.8, 2.3])])]


def nk_teile_a():
    return [
        Teil("a", "NK-A-a", "**Erläutern** Sie die Kennzeichnungen in den Relationen Ausleihe und Mitglied (Material 1), "
             "insbesondere die Bedeutung von ↑PateNr.", (2, 1, 0),
             ["AusleihNr bzw. MitgliedNr unterstrichen: Primärschlüssel (1)",
              "↑KostuemNr, ↑MitgliedNr, ↑RollenNr in Ausleihe: Fremdschlüssel auf Kostuem, Mitglied, Rolle (1)",
              "↑PateNr verweist auf Mitglied.MitgliedNr derselben Relation (rekursive Beziehung), eigener Name, NULL ohne Pate (1)"],
             loesung=["In Ausleihe ist AusleihNr Primärschlüssel; ↑KostuemNr, ↑MitgliedNr und ↑RollenNr sind Fremdschlüssel "
                      "und halten fest, welches Kostüm von wem für welche Rolle ausgeliehen wurde. In Mitglied ist "
                      "MitgliedNr Primärschlüssel; ↑PateNr ist ein Fremdschlüssel auf Mitglied.MitgliedNr – also auf ein "
                      "anderes Mitglied derselben Relation, die Patin bzw. den Paten (rekursive Beziehung *istPateVon*). Der "
                      "Name weicht ab, weil MitgliedNr schon vergeben ist; NULL bedeutet „ohne Pate“ (z. B. Greta Schwarting)."],
             fehler=[("P7", "↑PateNr als Verweis auf eine Relation Pate gedeutet."),
                     ("P10", "Kennzeichnungen nur benannt.")],
             kompetenzen=["K03", "K04", "K05"]),
        Teil("b", "NK-A-b", "Mitglieder leihen dasselbe Kostüm mitunter mehrfach aus, etwa erst für Proben und später für die "
             "Aufführungen. **Beurteilen** Sie, ob (KostuemNr, MitgliedNr) anstelle von AusleihNr als Primärschlüssel der "
             "Relation Ausleihe geeignet wäre.", (0, 2, 1),
             ["Paar wäre nur eindeutig, wenn jedes Mitglied jedes Kostüm höchstens einmal ausleiht (1)",
              "Gegenbeispiel aus Material 2: Pauline Tebbe (6) leiht Kostüm 15 zweimal aus → ungeeignet (1)",
              "Alternative begründet, z. B. (KostuemNr, MitgliedNr, Von) oder künstlicher Schlüssel AusleihNr (1)"],
             loesung=["Das Paar ist **ungeeignet**: Wiederholte Ausleihen sind ausdrücklich vorgesehen und kommen in den Daten "
                      "vor – Mitglied 6 hat Kostüm 15 zweimal ausgeliehen (Ausleihe 2 und 9). Beide Ausleihen hätten "
                      "denselben Schlüsselwert. Eindeutig wäre z. B. (KostuemNr, MitgliedNr, Von), weil dasselbe Mitglied "
                      "dasselbe Kostüm nicht zweimal am selben Tag ausleiht; einfacher bleibt der künstliche Schlüssel AusleihNr."],
             fehler=[("P8", "„kommt im Ausschnitt nicht doppelt vor“ bzw. Zeilen 2/9 übersehen."),
                     ("P8", "(KostuemNr, Von) vorgeschlagen, ohne Minimalität und Eindeutigkeit zu begründen.")],
             kompetenzen=["K02"]),
        Teil("c", "NK-A-c", "**Untersuchen** Sie die Tabelle KostuemRolle (Material 3) auf Anomalien; gehen Sie dabei an "
             "konkreten Datensätzen auf den Zusammenhang mit der Redundanz ein.", (1, 3, 1),
             ["Redundanz: Stück und Premiere je Rolle, Bezeichnung je Kostüm mehrfach (1)",
              "Änderungsanomalie: Premiere von „Der Hof des Mondkönigs“ in der Zeile Ritterrüstung 2027-03-12 statt 2027-03-19 (1)",
              "Löschanomalie: Zeile Königsmantel/Mondkönig ist die einzige zu Kostüm 11 und Rolle 11 (1)",
              "Einfügeanomalie: Kostüm ohne geplante Rolle bzw. neues Stück ohne Kostüm nicht eintragbar (1)",
              "Zusammenhang zwischen Redundanz und Anomalie (1)"],
             loesung=["**Redundant** sind Titel und Premiere des Stücks (neunmal „Der Hof des Mondkönigs“) sowie die "
                      "Bezeichnung eines Kostüms, das mehreren Rollen zugeordnet ist (Justaucorps rot zweimal).",
                      "**Änderungsanomalie:** Eine Verschiebung der Premiere muss in allen Zeilen nachgetragen werden – in der "
                      "Zeile Ritterrüstung steht bereits 2027-03-12 statt 2027-03-19.",
                      "**Löschanomalie:** Wird die Zuordnung Königsmantel – Mondkönig gestrichen, sind Bezeichnung des "
                      "Kostüms 11 und Name der Rolle 11 nicht mehr gespeichert.",
                      "**Einfügeanomalie:** Ein neues Kostüm oder ein neues Stück lässt sich erst eintragen, wenn es eine "
                      "Zuordnung von Kostüm und Rolle gibt.",
                      "Ursache: Angaben, die nur vom Stück bzw. nur vom Kostüm abhängen, stehen in jeder Zuordnungszeile."],
             fehler=[("P10", "Anomalien ohne konkrete Zeilen; Redundanz mit „doppelte Zeile“ verwechselt.")],
             kompetenzen=["K07", "K08", "K09", "K10"]),
        Teil("d", "NK-A-d", "**Entwerfen** Sie eine SQL-Abfrage, die für alle noch nicht zurückgegebenen Kostüme die "
             "Bezeichnung sowie Vor- und Nachname des ausleihenden Mitglieds ausgibt.", (2, 1, 0),
             ["Verbund Kostuem – Ausleihe – Mitglied (1)", "Bedingung Ausleihe.Bis IS NULL (1)",
              "Ausgabe Bezeichnung, Vorname, Nachname (1)"],
             loesung=[SQL(NK_SQL_D), ergebnis(NK_SQL_D, KOST)],
             fehler=[("P5", "Bis = NULL – liefert kein Ergebnis."), ("P2", "Verbundbedingung zu Mitglied vergessen.")],
             kompetenzen=["K18", "K23"]),
        Teil("e", "NK-A-e", "**Entwerfen** Sie eine SQL-Abfrage, die für alle Ausleihen von Kostümen der Epoche Barock den Titel "
             "des Stücks, den Namen der Rolle und die Bezeichnung des Kostüms ausgibt.", (1, 2, 1),
             ["vier Tabellen im FROM (1)", "drei korrekte Verbundbedingungen über die Fremdschlüssel (1)",
              "Bedingung Epoche = 'Barock' (1)", "Ausgabe mit eindeutigen Spaltennamen (1)"],
             loesung=[SQL(NK_SQL_E), ergebnis(NK_SQL_E, KOST),
                      "Die Rolle Marquis kommt nicht vor, weil für sie nie ein Kostüm ausgeliehen wurde."],
             fehler=[("P2", "Verbund Rolle – Ausleihe vergessen: jede Ausleihe mit allen Rollen kombiniert."),
                     ("P7", "StueckNr bzw. RollenNr ohne Tabellenpräfix (mehrdeutig)."),
                     ("P2", "Stück direkt mit Ausleihe verbunden (Ausleihe hat keine StueckNr).")],
             kompetenzen=["K16", "K24"]),
        Teil("f", "NK-A-f", "**Entwerfen** Sie eine SQL-Abfrage, die die drei Mitglieder (Nummer, Vor- und Nachname) mit den "
             "meisten Ausleihen und die Anzahl ihrer Ausleihen ausgibt. Berücksichtigt werden sollen nur Mitglieder mit "
             "mehr als drei Ausleihen.", (1, 3, 1),
             ["Verbund Mitglied – Ausleihe (1)", "COUNT(*) je Mitglied mit GROUP BY MitgliedNr, Vorname, Nachname (1)",
              "HAVING COUNT(*) > 3 (1)", "ORDER BY COUNT(*) DESC (1)", "LIMIT 3 (1)"],
             loesung=[SQL(NK_SQL_F), ergebnis(NK_SQL_F, KOST),
                      "Achtung: Zwei Mitglieder heißen Lasse Kück (11a und 7b, je 3 Ausleihen). Wer nur nach Vor- und "
                      "Nachname gruppiert, erhält „Lasse Kück“ mit 6 Ausleihen auf Platz 1."],
             fehler=[("P1", "COUNT(*) > 3 in WHERE."), ("P3", "nur nach Namen gruppiert (Lasse Kück verschmilzt)."),
                     ("P4", "SUM statt COUNT.")],
             kompetenzen=["K22", "K26", "K27"]),
        Teil("g", "NK-A-g", "**Analysieren** Sie die folgende SQL-Abfrage im Sachzusammenhang.", (2, 2, 0),
             ["Aussage: alle Mitglieder, deren Patin bzw. Pate eine 12. Klasse besucht, mit Name und Klasse sowie Name der "
              "Patin bzw. des Paten (2)",
              "Erläuterung: zwei Rollen derselben Relation (m = betreutes Mitglied, p = Pate), LIKE '12%' (1)",
              "Mitglieder ohne Pate oder mit Pate aus Jahrgang 11 fehlen (1)"],
             inhalt=[SQL(NK_SQL_G)],
             loesung=["Die Abfrage verbindet Mitglied mit sich selbst: m steht für das betreute Mitglied, p für seine Patin "
                      "bzw. seinen Paten. Ausgegeben werden Name und Klasse aller Mitglieder, deren Patin bzw. Pate eine "
                      "**12. Klasse** besucht (LIKE '12%' – 12a, 12b, 12c), zusammen mit dem Namen der Patin bzw. des Paten. "
                      "Mitglieder ohne Pate oder mit einem Paten aus Jahrgang 11 erscheinen nicht.",
                      ergebnis(NK_SQL_G, KOST)],
             fehler=[("P10", "„alle Mitglieder aus Jahrgang 12“ – die Bedingung betrifft p, nicht m."),
                     ("P10", "Klauseln nur übersetzt.")],
             kompetenzen=["K19", "K24", "K28"]),
        Teil("h", "NK-A-h", "Die Kostümwartin möchte wissen, welche Kostüme noch nie ausgeliehen wurden. **Beschreiben** Sie "
             "ein Vorgehen, mit dem sich das ermitteln lässt, ohne eine Unterabfrage zu verwenden.", (0, 2, 1),
             ["Schritt 1: alle Kostüme abfragen (1)", "Schritt 2: alle KostuemNr aus Ausleihe (DISTINCT) (1)",
              "Vergleich der Listen und Begründung, warum ein Verbund allein nicht genügt (1)"],
             loesung=["Ein Verbund von Kostuem und Ausleihe enthält nur Kostüme, die mindestens einmal ausgeliehen wurden. "
                      "Deshalb in zwei Schritten:", SQL(NK_SQL_H1), SQL(NK_SQL_H2),
                      "Kostüme der ersten Liste, die in der zweiten fehlen, wurden nie ausgeliehen (hier 5, 18, 37, 38, 40)."],
             fehler=[("P2", "WHERE Kostuem.KostuemNr != Ausleihe.KostuemNr – liefert fast alle Kombinationen.")],
             kompetenzen=["K30"])]


NK_AUFFUEHRUNG = ("Die Theater-AG plant ihre Aufführungen. Jedes Stück (Nummer, Titel) wird mehrmals aufgeführt; eine "
                  "Aufführung hat eine Nummer, ein Datum und eine Uhrzeit und findet an genau einem Spielort statt (Nummer, "
                  "Bezeichnung, Anzahl der Plätze). Zu jedem Stück gehören Rollen (Nummer, Name) und Requisiten (Nummer, "
                  "Bezeichnung); jede Rolle und jedes Requisit gehört zu genau einem Stück. Gespeichert wird, welches "
                  "Mitglied (Nummer, Vorname, Nachname, Klasse) in welcher Aufführung welche Rolle spielt. Ein Mitglied kann "
                  "in einer Aufführung mehrere kleine Rollen übernehmen, und manche Rollen (z. B. „Chor“) werden in einer "
                  "Aufführung von mehreren Mitgliedern gespielt. Für jedes Mitglied kann es eine Zweitbesetzung geben, die "
                  "bei Krankheit einspringt; ein Mitglied kann Zweitbesetzung für mehrere andere sein. Außerdem helfen "
                  "Mitglieder bei Aufführungen hinter der Bühne mit; dabei wird ihre Aufgabe gespeichert (z. B. „Licht“).")
NK_HOMEPAGE = ("Die Theater-AG möchte auf der Schulhomepage Fotos aller Aufführungen veröffentlichen, außerdem eine "
               "Mitgliederliste mit Vorname, Nachname, Klasse und den gespielten Rollen. Die Fotos zeigen Mitglieder auf der "
               "Bühne und im Publikum.")


def nk_material_b():
    return [("material", "4 · Anforderungstext „Aufführungsplanung“", [NK_AUFFUEHRUNG]),
            ("material", "5 · Ausschnitt eines Relationenschemas", [
                Schema("Werkstatt(<u>WerkstattNr</u>, Bezeichnung)"),
                Schema("repariert(<u>↑KostuemNr, ↑MitgliedNr, ↑WerkstattNr</u>, Datum)"),
                "↑KostuemNr verweist auf Kostuem, ↑MitgliedNr auf Mitglied (Material 1), ↑WerkstattNr auf Werkstatt."]),
            ("material", "6 · Veröffentlichung auf der Schulhomepage", [NK_HOMEPAGE])]


def nk_teile_b():
    return [
        Teil("a", "NK-B-a", "**Entwickeln** Sie zum Anforderungstext (Material 4) ein ER-Modell in Chen-Notation mit allen "
             "Entitätstypen, Schlüsselattributen, Beziehungstypen, Kardinalitäten und Beziehungsattributen.", (3, 5, 2),
             ["sechs Entitätstypen mit Attributen (2) und Schlüsselattributen (1)",
              "1:n-Beziehungen Stück–Rolle, Stück–Requisit, Stück–Aufführung, Spielort–Aufführung (2)",
              "ternärer Beziehungstyp spielt zwischen Mitglied, Rolle und Aufführung (m:n:p) (2)",
              "rekursiver Beziehungstyp vertritt an Mitglied, 1:n, mit Rollen (1)",
              "hilftMit Mitglied n – Aufführung m mit Beziehungsattribut Aufgabe (1)",
              "Benennung nach EH (1)"],
             loesung=[ER(AUFF, AUFF_LAYOUT, breite_cm=16)],
             varianten=["spielt mit anderen Kardinalitäten, wenn sie aus einer begründeten Lesart des Textes folgen (z. B. "
                        "Mitglied 1, falls Rollen nie geteilt würden) – mit Begründung anerkannt."],
             fehler=[("P9", "spielt in zwei binäre Beziehungen zerlegt (Mitglied–Rolle, Rolle–Aufführung) – Information geht verloren."),
                     ("P9", "Aufgabe als Attribut von Mitglied; vertritt ohne Rollen bzw. n:m."),
                     ("P9", "Spielort als Attribut von Aufführung trotz eigener Attribute.")],
             kompetenzen=["K35", "K36", "K37", "K38", "K47"]),
        Teil("b", "NK-B-b", "**Begründen** Sie die Kardinalitäten der Beziehungstypen findetStattIn (Spielort – Aufführung) und "
             "vertritt im Sachzusammenhang.", (1, 2, 0),
             ["findetStattIn: Aufführung an genau einem Spielort, Spielort für viele Aufführungen → 1:n (1)",
              "vertritt: jedes Mitglied hat höchstens eine Zweitbesetzung, eine Zweitbesetzung kann für mehrere einspringen "
              "→ 1:n (1)", "jeweils beide Leserichtungen am Text belegt (1)"],
             loesung=["**findetStattIn (1:n):** Eine Aufführung findet an genau einem Spielort statt; an einem Spielort finden "
                      "viele Aufführungen statt.",
                      "**vertritt (1:n, rekursiv):** Für ein Mitglied gibt es höchstens eine Zweitbesetzung (Seite "
                      "Zweitbesetzung: 1), ein Mitglied kann aber Zweitbesetzung für mehrere andere sein (Seite Vertretene: n)."],
             fehler=[("P9", "nur eine Leserichtung."), ("P9", "vertritt als 1:1 („jeder vertritt einen“).")],
             kompetenzen=["K34"]),
        Teil("c", "NK-B-c", "Ein Mitglied der AG schlägt vor, die Rolle einfach als Attribut von Mitglied zu speichern. "
             "**Beurteilen** Sie diesen Vorschlag im Vergleich zur Modellierung von Rolle als Entitätstyp.", (0, 1, 1),
             ["Attribut erlaubt nur eine Rolle je Mitglied, keine Zuordnung zu Stück und Aufführung, Redundanz der Rollennamen (1)",
              "Urteil: Entitätstyp nötig, weil Rollen eigene Eigenschaften und Beziehungen haben (1)"],
             loesung=["Als Attribut von Mitglied könnte jedes Mitglied nur **eine** Rolle haben (bzw. mehrere nur als Liste – "
                      "nicht atomar); die Zugehörigkeit der Rolle zum Stück und die Verbindung zur Aufführung gingen verloren, "
                      "und Rollen ohne Besetzung ließen sich nicht speichern. Da Rollen eigene Eigenschaften (Nummer, Name) "
                      "und Beziehungen (Stück, spielt) haben, ist der Entitätstyp die angemessene Modellierung."],
             fehler=[("P10", "Urteil ohne Bezug auf die Anforderungen.")],
             kompetenzen=["K40"]),
        Teil("d", "NK-B-d", "**Erstellen** Sie zu Ihrem ER-Modell aus Teilaufgabe a) das Relationenschema in Kurzschreibweise.",
             (3, 2, 1),
             ["Relationen der sechs Entitätstypen mit Primärschlüsseln (1)",
              "Fremdschlüssel der 1:n-Beziehungen auf der n-Seite (↑StueckNr in Rolle, Requisit, Auffuehrung; ↑OrtNr) (1)",
              "spielt mit drei Fremdschlüsseln als Primärschlüssel (1)",
              "↑ZweitbesetzungNr in Mitglied (1)", "hilftMit mit Primärschlüssel aus zwei Fremdschlüsseln und Aufgabe (1)",
              "Kurzschreibweise korrekt (unterstrichen, ↑) (1)"],
             loesung=[Schema("Stueck(<u>StueckNr</u>, Titel)"),
                      Schema("Spielort(<u>OrtNr</u>, Bezeichnung, Plaetze)"),
                      Schema("Auffuehrung(<u>AuffNr</u>, Datum, Uhrzeit, ↑StueckNr, ↑OrtNr)"),
                      Schema("Rolle(<u>RollenNr</u>, Name, ↑StueckNr)"),
                      Schema("Requisit(<u>RequisitNr</u>, Bezeichnung, ↑StueckNr)"),
                      Schema("Mitglied(<u>MitgliedNr</u>, Vorname, Nachname, Klasse, ↑ZweitbesetzungNr)"),
                      Schema("spielt(<u>↑MitgliedNr, ↑RollenNr, ↑AuffNr</u>)"),
                      Schema("hilftMit(<u>↑MitgliedNr, ↑AuffNr</u>, Aufgabe)"),
                      "Folgefehler aus a) werden nicht erneut abgezogen."],
             fehler=[("P9", "spielt ohne ↑AuffNr bzw. Schlüssel nur aus zwei Attributen ohne Begründung."),
                     ("P9", "Fremdschlüssel auf der 1-Seite (z. B. ↑RollenNr in Stueck).")],
             kompetenzen=["K04", "K41"]),
        Teil("e", "NK-B-e", "**Begründen** Sie die Wahl des Primärschlüssels der Relation, die aus dem Beziehungstyp spielt "
             "entsteht.", (0, 1, 1),
             ["kein Paar genügt: Mitglied kann in einer Aufführung mehrere Rollen spielen, eine Rolle wird in einer "
              "Aufführung von mehreren Mitgliedern gespielt, ein Mitglied spielt eine Rolle in mehreren Aufführungen (1)",
              "daher alle drei Fremdschlüssel zusammen; minimal (1)"],
             loesung=["(MitgliedNr, AuffNr) reicht nicht, weil ein Mitglied in einer Aufführung mehrere Rollen spielen kann. "
                      "(RollenNr, AuffNr) reicht nicht, weil eine Rolle wie „Chor“ in einer Aufführung von mehreren "
                      "Mitgliedern gespielt wird. (MitgliedNr, RollenNr) reicht nicht, weil dasselbe Mitglied dieselbe Rolle in "
                      "vielen Aufführungen spielt. Erst alle drei Fremdschlüssel zusammen identifizieren eine Zeile; der "
                      "Schlüssel ist minimal, weil keiner weggelassen werden kann."],
             fehler=[("P8", "Schlüssel ohne Minimalitäts- bzw. Eindeutigkeitsargument.")],
             kompetenzen=["K42"]),
        Teil("f", "NK-B-f", "Gegeben ist ein Ausschnitt eines weiteren Relationenschemas (Material 5). **Erstellen** Sie das "
             "zugehörige ER-Diagramm.", (1, 2, 0),
             ["Entitätstyp Werkstatt mit Schlüsselattribut; Kostuem und Mitglied mit Schlüsseln (1)",
              "ternärer Beziehungstyp repariert zwischen Kostuem, Mitglied und Werkstatt, n:m:p (1)",
              "Datum als Beziehungsattribut (1)"],
             loesung=[ER(WERK, WERK_LAYOUT, breite_cm=10),
                      "Alle drei Fremdschlüssel bilden gemeinsam den Primärschlüssel – daher eine ternäre Beziehung mit dem "
                      "Attribut Datum."],
             fehler=[("P9", "drei binäre Beziehungen statt einer ternären."), ("P9", "Datum an Kostuem oder Werkstatt.")],
             kompetenzen=["K43"]),
        Teil("g", "NK-B-g", "**Beurteilen** Sie das Vorhaben der Theater-AG (Material 6) unter Bezug auf die Grundsätze "
             "Einwilligung, Zweckbindung und Datenminimierung und schlagen Sie eine Maßnahme vor.", (1, 2, 1),
             ["Fotos sind personenbezogene Daten; Veröffentlichung nur mit Einwilligung (bei Minderjährigen der Eltern) (1)",
              "Zweckbindung: Daten der AG-Verwaltung nicht ohne Weiteres für die Homepage (1)",
              "Datenminimierung: Klasse und vollständige Namen nicht nötig; Publikum besonders kritisch; Urteil (1)",
              "Maßnahme, z. B. nur Vornamen, Einwilligungsformular, keine Publikumsfotos, geschützter Bereich (1)"],
             loesung=["Fotos und Namen sind personenbezogene Daten; ihre Veröffentlichung im Internet ist nur mit "
                      "**Einwilligung** zulässig (bei Minderjährigen auch der Eltern) – für Personen im Publikum liegt sie "
                      "nicht vor. **Zweckbindung:** Die Mitgliederdaten wurden für die Organisation der AG erhoben, nicht "
                      "für die Öffentlichkeitsarbeit. **Datenminimierung:** Für eine Würdigung der Aufführung genügen Stück, "
                      "Rollen und ggf. Vornamen – die Klasse ist überflüssig. Urteil: so nicht zulässig.",
                      "**Maßnahme:** Einwilligungen schriftlich einholen, nur Bühnenfotos ohne Publikum, Liste ohne Klassen "
                      "(nur Vornamen) bzw. im passwortgeschützten Schulbereich."],
             fehler=[("P10", "Grundsätze nur genannt; Publikum übersehen; kein Urteil.")],
             kompetenzen=["K44", "K45", "K46"])]


def kostuemliste_material(nr):
    return ("material", f"{nr} · Alte Kostümliste", [
        "Bevor es die Datenbank gab, führte die Kostümwartin diese Liste (Ausschnitt):",
        ausschnitt(KOST, "SELECT * FROM KostuemlisteRoh", weiter=False, groesse=8,
                   breiten=[2.8, 1.6, 3.5, 4.1, 3.0, 2.4])])


def nk_teile_bga():
    return [
        Teil("a", "NK-BgA-a", "**Untersuchen** Sie die Kostümliste (Material 4) auf Redundanzen und nicht-atomare Werte; "
             "erläutern Sie die Folgen für die Auswertung „Welche Kostüme werden im Stück „Der Hof des Mondkönigs“ "
             "eingesetzt?“", (1, 2, 1),
             ["Redundanz: Verantwortliche mit Telefon mehrfach (Kerstin Haake viermal) (1)",
              "nicht-atomar: Rollen, Stücke, Verantwortliche, Telefon als Listen (1)",
              "Folge: Stuecke = 'Der Hof des Mondkönigs' findet das Justaucorps rot nicht; Zuordnung von Rolle und Stück nur über "
              "die Reihenfolge (1)", "begründete Einordnung, z. B. LIKE unsicher, manuelle Prüfung nötig (1)"],
             loesung=["**Redundant**: Kerstin Haake mit 0000-4410 steht in vier Zeilen, Heiko Wendelken in drei. **Nicht "
                      "atomar** sind Rollen, Stuecke, Verantwortliche und Telefon (z. B. „Kammerdiener, Gesandter aus "
                      "Venedig“); welche Rolle zu welchem Stück gehört, ergibt sich nur aus der Reihenfolge.",
                      "Eine Abfrage mit Stuecke = 'Der Hof des Mondkönigs' findet nur Königsmantel und Ritterrüstung, nicht "
                      "aber das Justaucorps rot, bei dem das Stück in einer Liste steht. Mit LIKE wird es gefunden, doch "
                      "jede abweichende Schreibweise ginge verloren – die Auswertung ist unzuverlässig."],
             fehler=[("P10", "keine konkreten Zeilen; Folgen für die Auswertung fehlen.")]),
        Teil("b", "NK-BgA-b", "**Erläutern** Sie je eine Einfüge- und eine Löschanomalie an einem konkreten Datensatz der "
             "Kostümliste.", (1, 2, 0),
             ["Einfügeanomalie: neues Stück oder neue verantwortliche Person ohne Kostüm nicht eintragbar (1)",
              "Löschanomalie: Löschen der Zeile Toga entfernt die einzige Angabe zur Rolle „Chor“ (1)", "jeweils am Datensatz erläutert (1)"],
             loesung=["**Einfügeanomalie:** Ein neues Stück lässt sich erst eintragen, wenn ihm ein Kostüm zugeordnet ist – "
                      "jede Zeile beschreibt ein Kostüm.",
                      "**Löschanomalie:** Wird die Toga aus dem Fundus entfernt und ihre Zeile gelöscht, verschwindet die "
                      "Rolle „Chor“ aus der Liste, die nur dort vorkommt."],
             varianten=["Änderungsanomalie (Heiko Wendelken mit 0000-5521 und 0000-5512) statt einer der beiden nur mit Teilpunkt."],
             fehler=[("P10", "nur Definition ohne Datensatz.")]),
        Teil("c", "NK-BgA-c", "**Beurteilen** Sie das Vorhaben der Theater-AG (Material 5) unter Bezug auf zwei Grundsätze der "
             "DSGVO. Grenzen Sie dabei Datenschutz und Datensicherheit voneinander ab.", (1, 2, 2),
             ["Fotos/Namen personenbezogen; Einwilligung nötig, Publikum ohne Einwilligung (1)",
              "zwei Grundsätze am Fall: Zweckbindung, Datenminimierung (Klasse überflüssig) (2)",
              "Abgrenzung Datenschutz – Datensicherheit (1)", "begründetes Urteil (1)"],
             loesung=["Fotos und Mitgliederliste sind personenbezogene Daten. Für eine Veröffentlichung braucht es die "
                      "**Einwilligung** der Abgebildeten (bei Minderjährigen der Eltern), für das Publikum liegt sie nicht vor. "
                      "**Zweckbindung:** Die Daten wurden für die AG-Organisation erhoben. **Datenminimierung:** Klasse und "
                      "Nachname sind für die Homepage nicht nötig.",
                      "**Datenschutz** regelt, ob personenbezogene Daten veröffentlicht werden dürfen; **Datensicherheit** "
                      "schützt Daten technisch vor Verlust und unbefugtem Zugriff (z. B. Passwortbereich, Verschlüsselung). "
                      "Urteil: in dieser Form nicht zulässig; möglich mit Einwilligung, ohne Publikum und ohne Klassen."],
             fehler=[("P10", "Datenschutz und Datensicherheit gleichgesetzt; kein Urteil.")]),
        Teil("d", "NK-BgA-d", "Die AG-Leitung überlegt, aus den Ausleihdaten automatisch einen „Zuverlässigkeitswert“ je "
             "Mitglied zu berechnen (z. B. verspätete oder fehlende Rückgaben) und ihn bei der Rollenvergabe zu "
             "berücksichtigen. **Erörtern** Sie Chancen und Risiken dieser automatisierten Auswertung.", (0, 2, 1),
             ["Chance: Verluste vermeiden, Kostümpflege planbar (1)",
              "Risiko: Profilbildung, Fehlbewertung (Gründe für Verspätung unbekannt), Benachteiligung bei Rollen (1)",
              "abwägendes Fazit (1)"],
             loesung=["**Chancen:** Kostüme gehen seltener verloren, Rückgaben lassen sich besser planen. **Risiken:** Es "
                      "entsteht ein Profil über einzelne Mitglieder; der Wert bildet Ursachen (Krankheit, Absprachen) nicht ab "
                      "und kann bei der Rollenvergabe zu ungerechter Benachteiligung führen – eine automatisierte "
                      "Entscheidung über Personen. **Fazit:** Erinnerungen an offene Ausleihen erreichen das Ziel ohne "
                      "Bewertung von Personen; ein Zuverlässigkeitswert sollte nicht in die Rollenvergabe eingehen."],
             fehler=[("P10", "einseitig, ohne Fazit.")])]


def nachschreibklausur(ea, fassung):
    ta, tb = nk_teile_a(), (nk_teile_b() if ea else nk_teile_bga())
    niv = "eA" if ea else "gA"
    abschnitte = [("aufgabe", "Aufgabe A · Kostümverleih der Theater-AG (30 BE)")] + nk_material_a() + \
        [("umbruch",)] + [("teil", t) for t in ta] + [("umbruch",)]
    if ea:
        abschnitte += [("aufgabe", "Aufgabe B · Aufführungsplanung und Schulhomepage (30 BE)"),
                       ("text", "Die Theater-AG (Aufgabe A) möchte auch ihre Aufführungen mit der Datenbank planen.")] + \
            nk_material_b()
    else:
        abschnitte += [("aufgabe", "Aufgabe B · Kostümliste und Schulhomepage (15 BE)"),
                       ("text", "Die Theater-AG (Aufgabe A) hat ihre Kostüme früher in einer Liste geführt und plant einen "
                                "Auftritt auf der Schulhomepage."),
                       kostuemliste_material(4), ("material", "5 · Veröffentlichung auf der Schulhomepage", [NK_HOMEPAGE])]
    abschnitte += [("teil", t) for t in tb]
    gesamt = f"**Gesamt:** {60 if ea else 45} BE · AFB {afb_summe(ta + tb)}."
    if ea:
        gesamt += " **Kürzung auf 45 BE (modular):** Aufgabe A a, c, e, f, g (21 BE) und Aufgabe B a, c, d, e, g (24 BE)."
    return pruefung(fassung, art="klausur", material=f"NK-{niv}", titel=f"Nachschreibklausur Datenbanken ({niv})",
                    untertitel="Kontext: Kostümverleih der Theater-AG", kurs=EA if ea else GA,
                    dauer="135 Minuten" if ea else "90 Minuten", be=60 if ea else 45, datenbank=KOST, abschnitte=abschnitte,
                    pfad_aufgabe=ORDNER / "3_Klausur" / f"DD_A7_Nachschreibklausur_{niv}.docx",
                    pfad_eh=ORDNER / "5_Erwartungshorizonte" / f"DD_A7_Nachschreibklausur_{niv}_Erwartungshorizont.docx",
                    gesamt=gesamt)


def tabelle(d, kopf, zeilen, breiten=None, groesse=9.0):
    """Datentabelle direkt ins Dokument; Zeilen werden nicht über Seiten geteilt."""
    tab = d._datentabelle(d.doc, Tabelle(kopf, zeilen, breiten=breiten, groesse=groesse), d.breite)
    for zeile in tab.rows[1:]:
        A._zeile_nicht_teilen(zeile)
    return tab


# ================================================================== Fallen-Checkliste (Kopiervorlage Peer-Korrektur)
FALLEN = [
    ("P1", "WHERE/HAVING", "Steht jede Bedingung mit Aggregatfunktion in HAVING und jede Bedingung an einzelne Datensätze "
     "in WHERE?", "W-A7-01"),
    ("P2", "Verbund fehlt/vervielfacht", "Hat jede Tabelle im FROM ihre Verbundbedingung? Vervielfacht eine überflüssige "
     "Tabelle die Summen?", "W-A7-02"),
    ("P3", "GROUP-BY-Regel", "Ist jede Spalte im SELECT gruppiert oder aggregiert – und wird nach dem Schlüssel gruppiert, "
     "nicht nur nach dem Namen?", "W-A7-03"),
    ("P4", "COUNT/SUM", "Werden Datensätze gezählt (COUNT) oder Mengen addiert (SUM) – passend zur Frage?", "W-A7-04"),
    ("P5", "NULL und Literale", "IS NULL statt = NULL? Text und Datum in Hochkommata, Datum als 'JJJJ-MM-TT'?", "W-A7-05"),
    ("P6", "Bedingungslogik", "Klammern bei AND/OR? Grenzen (> oder >=, BETWEEN) wie in der Aufgabe?", "W-A7-06"),
    ("P7", "Mehrdeutig/falsch benannt", "Gleichnamige Spalten mit Tabellenname? Die richtige Spalte gewählt? Aliase beim "
     "Verbund einer Tabelle mit sich selbst?", "W-A7-06"),
    ("P8", "Schlüssel falsch beurteilt", "Eindeutigkeit für alle denkbaren Daten begründet – nicht nur am Ausschnitt?", "W-A7-07"),
    ("P9", "ER/Überführung fehlerhaft", "Kardinalitäten in beide Richtungen gelesen? n:m als eigene Relation, 1:n als "
     "Fremdschlüssel auf der n-Seite? Beziehungsattribute richtig platziert?", "W-A7-08"),
    ("P10", "Operator verfehlt", "„Erläutern“ am Beispiel, „analysieren“ im Sachzusammenhang, „beurteilen“ mit "
     "begründetem Urteil?", "W-A7-09/10"),
]


def fallen_checkliste():
    d = AktenDokument("unplugged", 7, "Fallen-Checkliste P1–P10", fassung="schueler", ds=13, material="Fallen-Checkliste",
                      untertitel="Kopiervorlage für die Peer-Korrektur der Generalprobe (je Arbeit ein Blatt)")
    d.kopfband(name_datum=False)
    d.fall_einstieg("Edda: „Eine Ermittlerin erkennt auch die Fehler der anderen – und lernt daraus für die eigenen. "
                    "Korrigiert fair: nach Kernpunkten, nicht nach Gefühl.“")
    d.absatz("**Ermittlernummer der Arbeit:** ________   **korrigiert von:** ________   **Fassung:** eA ☐  gA ☐")
    d.ueberschrift("So gehst du vor", 2)
    d.inhalt(Liste(["Erst Kernpunkt im Erwartungshorizont lesen, dann die Lösung; SQL in der Freien Ermittlung (Mensa) "
                    "ausführen und mit der Musterergebnistabelle vergleichen – anderes Ergebnis heißt: Kernpunkt prüfen, "
                    "nicht automatisch 0 BE.",
                    "Jede gefundene Falle ankreuzen (Teilaufgabe notieren), BE eintragen, Rückmeldung schreiben."],
                   nummeriert=True))
    d.ueberschrift("Fallen-Check", 2)
    tab = tabelle(d, ["Falle", "Prüffrage", "gefunden in Teil", "Warm-up"],
                    [[f"**{n}** {k}", f, "", w] for n, k, f, w in FALLEN], breiten=[3.4, 8.6, 2.6, 2.4], groesse=8.5)
    for zeile in tab.rows[1:]:
        A._zeile_nicht_teilen(zeile)
    d.ueberschrift("Bewertung je Teilaufgabe", 2)
    tabelle(d, ["Teil", "max. BE", "erreicht", "fehlender Kernpunkt / Bemerkung"],
              [[f"{b})", "", "", ""] for b in "abcdefg"] + [["Summe", "", "", ""]], breiten=[1.5, 2.0, 2.0, 11.5])
    d.absatz("**Rückmeldung – stark:** ______________________________  **üben:** ______________________ (W-A7-____)")
    d.seitenumbruch()
    d.ueberschrift("Kurs-Strichliste der Fallen", 1)
    d.absatz("Für die Tafel bzw. die Lehrkraft: Jede Korrekturgruppe macht für jede gefundene Falle einen Strich. Neben das "
             "Fallen-Profil des Kurses aus dem Lab gelegt, ergeben sich die Wiederholungsschwerpunkte vor der Klausur.")
    tab = tabelle(d, ["Falle", "Strichliste", "Summe", "im Lab-Profil auf Platz"],
                    [[f"**{n}** {k}", "", "", ""] for n, k, _f, _w in FALLEN], breiten=[4.4, 8.2, 1.8, 2.6])
    for zeile in tab.rows[1:]:
        A._zeile_nicht_teilen(zeile)
    d.notiz("Wiederholung planen", "Die drei häufigsten Fallen des Kurses: ____________ · ____________ · ____________. "
            "Passende Warm-up-Karten: W-A7-01 … W-A7-10 (Leitner-Trainer), Verhör 7 im Lab als Generalprobe vor der Klausur.")
    return d.speichern(ORDNER / "2_Generalprobe" / "DD_A7_Fallen-Checkliste.docx")


# ================================================================== Lehrerhinweise
def _schluessel_zeilen():
    import math
    stufen = [(15, 95), (14, 90), (13, 85), (12, 80), (11, 75), (10, 70), (9, 65), (8, 60), (7, 55), (6, 50), (5, 45),
              (4, 40), (3, 33), (2, 27), (1, 20)]
    return [[f"{np:02d}", f"ab {p} %"] + [str(math.ceil(p * be / 100)) for be in (60, 45, 30, 25)] for np, p in stufen] + \
        [["00", "unter 20 %", "–", "–", "–", "–"]]


def lehrerhinweise():
    d = AktenDokument("lehrerhinweise", 7, "Lehrerhinweise Akte 7", fassung="lehrkraft", ds=13, material="Lehrerhinweise A7",
                      untertitel="Die Ermittlerprüfung (DS 13) · Generalprobe, Peer-Korrektur, Klausur und Nachschreibklausur")
    d.kopfband()
    d.ueberschrift("Überblick", 1)
    tabelle(d, ["DS", "Thema", "Lab", "Warm-up", "Abi-Bezug"], [
        ["13", "Die Ermittlerprüfung: Generalprobe eA (30 BE, 70') bzw. gA (25 BE, 60'), Peer-Korrektur, Fallen-Check, "
         "Lizenzen", "Verhör 7 · Mensa (A7-V-01 … 15, 30', Abimodus streng); Freie Ermittlung Mensa für die Korrektur",
         "entfällt; W-A6-01 … 06 und W-A7-01 … 10 als Hausaufgabe im Leitner-Trainer",
         "Format 2025/26: Teilaufgaben a–g (2–6 BE), 2 × SQL entwerfen + 1 × analysieren, Schlüssel, Anomalien an der "
         "zusammengelegten Tabelle, ER erweitern/überführen (eA), Datenschutz (gA)"],
        ["Klausur", "Schulsanitätsdienst: eA A + B (60 BE, modular 45 BE), gA A + B-gA (45 BE)", "–", "–",
         "rekursive Beziehung, Verbund einer Tabelle mit sich selbst, Vorgehen in Worten, ER aus Text, Rückrichtung, Gesundheitsdaten"],
        ["Nachschreib­klausur", "Kostümverleih der Theater-AG: gleicher Bauplan", "–", "–",
         "ternäre und rekursive Beziehung, vier Tabellen, LIKE beim Verbund einer Tabelle mit sich selbst, Veröffentlichung im Internet"]],
        breiten=[2.2, 4.4, 3.5, 3.1, 3.8], groesse=8.5)
    d.ueberschrift("Material dieser Akte", 2)
    tabelle(d, ["Datei", "Inhalt", "Zugriff"], [
        ["DD_A7_Generalprobe_eA/gA", "Aufgabenblatt mit Material (Mensa-Vorbestellsystem)", "Lehrkraft (Freigabe für "
         "Schüler möglich)"],
        ["…_Erwartungshorizont", "Bewertungsbogen (I/II/III/BE), Musterlösungen mit Ergebnistabellen, typische Fehler",
         "Lehrkraft"],
        ["DD_A7_Fallen-Checkliste", "Kopiervorlage Peer-Korrektur + Kurs-Strichliste", "Schüler"],
        ["DD_A7_Klausur_eA/gA, DD_A7_Nachschreibklausur_eA/gA", "Klausuren mit Erwartungshorizont", "Lehrkraft"],
        ["DD_A7_Generalprobe.pptx", "Ablauf, Operatoren, Zeitbudget, Fallen-Check, Peer-Korrektur", "Handout / Lehrkraft"],
        ["DD_Warm-up-Karten_A7", "W-A7-01 … 10 (Fallen-Check P1–P10, Zeitbudget)", "Schüler / Lösungen Lehrkraft"]],
        breiten=[5.4, 7.8, 3.8], groesse=8.5)

    d.ueberschrift("DS 13 · Die Ermittlerprüfung", 1)
    d.ueberschrift("Ziele", 2)
    d.inhalt(Liste(["Die Schülerinnen und Schüler **bearbeiten** eine Prüfungsaufgabe im Abitur-Format (eA 30 BE / gA 25 BE) "
                    "unter Zeitbudget und **wenden** die Operatoren sachgerecht **an**.",
                    "Sie **beurteilen** fremde Lösungen anhand eines Erwartungshorizonts mit Kernpunkten und Teilpunkten.",
                    "Sie **analysieren** ihr Fallen-Profil (P1–P10) und **leiten** gezielte Wiederholungen **ab**."],
                   nummeriert=True))
    d.ueberschrift("Verlauf", 2)
    tabelle(d, ["Phase", "Zeit", "Inhalt / Ablauf", "Sozialform", "Material"], [
        ["Organisation", "0–5'", "Sitzordnung, Hilfsmittel (Operatorenübersicht), Zeitbudget ≈ 2 min je BE, Ermittlernummern "
         "austeilen", "Plenum", "Präsentation Folien 1–5"],
        ["Generalprobe", "5–75'", "eA 30 BE in 70'; gA 25 BE in 60', die letzten 10' Fallen-Check der eigenen Lösung",
         "EA", "Generalprobe eA/gA"],
        ["Peer-Korrektur", "75–87'", "Tausch über Kreuz; SQL-Teile nach Erwartungshorizont, Ausführen in der Freien "
         "Ermittlung (Mensa), Fallen ankreuzen; übrige Teile als Hausaufgabe", "Paare",
         "Erwartungshorizont (Auszug SQL), Fallen-Checkliste, Lab"],
        ["Abschluss", "87–90'", "Kurs-Strichliste neben das Fallen-Profil aus dem Lab; Endstand festschreiben, Urkunden "
         "„Detektei-Lizenz“; Verhör 7 als Hausaufgabe", "Plenum", "Urkunden (Lehrkraft-Bereich)"]],
        breiten=[2.5, 1.4, 6.6, 2.3, 4.2], groesse=8.5)
    d.ueberschrift("Peer-Korrektur (Ablauf)", 2)
    d.inhalt(Liste([
        "Abgabe mit Ermittlernummer statt Namen; die Lehrkraft verteilt über Kreuz – nie innerhalb des eigenen Teams.",
        "Die Korrekturgruppen erhalten den Erwartungshorizont der SQL-Teile (eA e–g, gA c–e): Kernpunkte mit Teilpunkten "
        "und typischen Fehlern. Die Lehrkraft schaltet die Mensa-DB in der **Freien Ermittlung** frei; jede SQL-Lösung "
        "wird ausgeführt und mit der Musterergebnistabelle verglichen. Abweichung bei lauffähiger Abfrage → Kernpunkt "
        "prüfen, nicht automatisch 0 BE.",
        "Jede gefundene Falle wird auf der Fallen-Checkliste angekreuzt (mit Teilaufgabe).",
        "Rückgabe mit Kommentar „stark: … / üben: … (Warm-up-Karte W-A7-…)“. Die Teile a–d (eA) bzw. a, b, f (gA) "
        "korrigieren die Gruppen zu Hause und geben sie in der nächsten Stunde zurück.",
        "Kurs-Strichliste der Fallen an der Tafel neben dem Fallen-Profil des Kurses (Lehrkraft-Bereich) → gemeinsame "
        "Wiederholungsschwerpunkte vor der Klausur."], nummeriert=True))
    d.ueberschrift("Kalibrierung der Korrektur", 2)
    d.inhalt(Liste([
        "Vor der Korrektur einen Kernpunkt gemeinsam an einer anonymen Beispiellösung bewerten (z. B. Teil f mit "
        "`COUNT(*)` statt `SUM(Menge)`: 4 von 5 BE, Kernpunkt P4 fehlt).",
        "Die Lehrkraft korrigiert 3–4 Arbeiten stichprobenartig zweit. Weicht eine Peer-Bewertung je Teilaufgabe um mehr "
        "als 1 BE ab, wird der Kernpunkt im Plenum geklärt (meist Teilpunkte bei Analyse- und Anomalie-Teilen).",
        "Zu großzügig: „Abfrage läuft“ ersetzt keinen Kernpunkt (GROUP-BY-Regel, kein Alias in HAVING). Zu streng: "
        "andere Bezeichner, andere Reihenfolge der Bedingungen, `LIKE '2027-03-%'` statt BETWEEN sind voll richtig.",
        "Die Generalprobe wird nicht benotet; die BE dienen der Selbsteinschätzung (Bewertungsschlüssel unten zur "
        "Orientierung)."]))
    d.ueberschrift("Typische Schwierigkeiten", 2)
    d.inhalt(Liste([
        "Zeitnot bei den ER-Teilaufgaben (eA) → Zeitbudget vorher besprechen; ER nach SQL bearbeiten ist erlaubt.",
        "Analyse ohne Sachzusammenhang (P10): „SELECT wählt …“ statt „die drei Personen mit den meisten nicht abgeholten "
        "Bestellungen“.",
        "Anomalien nur definiert, ohne Zeilen aus BestellUebersicht (P10); Zeilen 204/209 als „Fehler“ gedeutet.",
        "SQL läuft in SQLite, verletzt aber die EH (GROUP-BY-Regel, Alias in HAVING) → im Erwartungshorizont als "
        "Punktabzug markiert."]))
    d.ueberschrift("Differenzierung", 2)
    d.inhalt(Liste(["gA-Fassung (25 BE, ohne ER, mit Datenschutz-Teil); Nachteilsausgleich nach Schulregel.",
                    "Schnelle: Fallen-Check der eigenen Lösung, dann Verhör 7 im Lab.",
                    "Langsame: in der Korrektur nur die SQL-Teile; Warm-up-Karten zu den eigenen Fallen als Hausaufgabe."]))
    d.ueberschrift("Vorbereitung", 2)
    d.inhalt(Liste([
        "Generalprobe eA/gA und Fallen-Checklisten kopieren; Erwartungshorizont der SQL-Teile je Paar einmal.",
        "Mensa-DB für die Freie Ermittlung nach der Abgabe freischalten; Verhör 7 im Kurs auf „offen“ stellen "
        "(gA: A7-V-12, -14, -15 sind ausgeblendet).",
        "Urkunden „Detektei-Lizenz“ im Lehrkraft-Bereich vorbereiten (Endstand).",
        "Freigabe: Die Generalprobe ist standardmäßig nur für Lehrkräfte sichtbar; soll sie im Portal für Schüler "
        "erscheinen, in seed/arbeitsblaetter.json `\"freigabe\": \"schueler\"` setzen und die PDFs neu erzeugen."]))
    d.notiz("Verhör 7 · Mensa (V7)", "Kontext-DB verhoer/mensa (dieselbe wie die Generalprobe, andere Aufgaben). Rahmensatz "
            "Edda: „Letzte Probe vor der Lizenz: ein ganzer Fall, ohne mich.“ 30 Minuten, 8 Aufgaben (3 × ★, 3 × ★★, 2 × ★★★), "
            "Abimodus streng, keine Rückmeldung während des Verhörs.")

    d.ueberschrift("Klausur und Nachschreibklausur", 1)
    d.absatz("Separater Termin (nicht in den 15 DS). Beide Klausuren haben denselben Bauplan in neuen, nüchternen Kontexten; "
             "alle Daten sind frei erfunden, kein Abitur-Originaltext.")
    tabelle(d, ["Fassung", "Aufbau", "BE", "Zeit", "AFB I / II / III"], [
        ["Klausur eA", "A (Abitur-Format, SQL, Schlüssel, Anomalien) + B (ER aus Text, Überführung, Rückrichtung, "
         "Datenschutz)", "60", "135'", "18 / 31 / 11 BE (30 / 52 / 18 %)"],
        ["Klausur eA, gekürzt", "A a, c, e, f, g + B a, c, d, e, g", "45", "90'", "laut Bewertungsbogen"],
        ["Klausur gA", "A + B-gA (Rohliste, Anomalien, Datenschutz, Profilbildung)", "45", "90'", "12 / 24 / 9 BE (27 / 53 / 20 %)"],
        ["Nachschreibklausur eA/gA", "gleicher Bauplan, Kontext Kostümverleih", "60 / 45", "135' / 90'", "wie Klausur"]],
        breiten=[3.4, 7.4, 1.3, 1.7, 3.2], groesse=8.5)
    d.inhalt(Liste([
        "**Datenbanken:** Die Tabellenausschnitte und Ergebnistabellen stammen aus `pruefung/sanitaetsdienst` bzw. "
        "`pruefung/kostuemverleih` (seed/datenbanken/pruefung/…, LIESMICH mit allen Randfällen). Diese DBs sind bewusst "
        "**nicht** in der Plattform verfügbar – Klausuraufgaben bleiben unbekannt.",
        "**EH-2025-Konformität:** Alle SQL-Musterlösungen halten EH §8 ein (Verbund implizit, GROUP-BY-Regel, kein Alias in "
        "HAVING, `!=`, Literale) und sind maschinell geprüft (`npm run material:sql`). ER nach EH §7 (Chen, 1/n/m/p, "
        "Schlüsselattribute unterstrichen).",
        "**Erwartungshorizont:** Bewertungsbogen „Teil | Erwartete Prüfungsleistungen | I | II | III | BE“ mit Kernpunkten "
        "und Teilpunkten, danach jede Teilaufgabe mit Musterlösung, Alternativen und typischen Fehlern (P-Nummern).",
        "**Kürzung:** Bei der gekürzten eA-Fassung die nicht gewählten Teilaufgaben im Aufgabenblatt streichen (Word) und "
        "die BE-Angabe im Kopf auf 45 setzen; Aufgabe B verweist auf Material 1 von Aufgabe A."]))
    d.ueberschrift("Bewertungsschlüssel (Orientierung)", 2).paragraph_format.page_break_before = True
    d.absatz("Übliche Zuordnung von Anteil der BE zu Notenpunkten in der Oberstufe; maßgeblich ist der Beschluss der "
             "Fachkonferenz. Angegeben ist die Mindestzahl der BE.")
    tabelle(d, ["Notenpunkte", "Anteil", "60 BE", "45 BE", "30 BE", "25 BE"], _schluessel_zeilen(),
            breiten=[2.4, 3.0, 2.2, 2.2, 2.2, 2.2], groesse=8.5)
    return d.speichern(ORDNER / "4_Lehrerhinweise" / "DD_A7_Lehrerhinweise.docx")


# ================================================================== Präsentation
BSP_SQL = ("SELECT Stand.StandNr, Stand.Name, COUNT(*) AS Produkte\nFROM Stand, Produkt\n"
           "WHERE Stand.StandNr = Produkt.StandNr\n  AND Produkt.Preis >= 3\nGROUP BY Stand.StandNr, Stand.Name\n"
           "HAVING COUNT(*) > 2\nORDER BY Produkte DESC, Stand.StandNr")
ABI_SQL = ("SELECT Helfer.Verein, COUNT(*) AS Anzahl\nFROM Helfer\nWHERE Helfer.Verein IS NOT NULL\n"
           "GROUP BY Helfer.Verein\nHAVING COUNT(*) >= 10\nORDER BY Anzahl DESC")


def praesentation():
    p = AktenPraesentation(7, "Die Ermittlerprüfung", datenbank="stadtfest")
    p.titelfolie("Die Ermittlerprüfung", "Akte 7 · DS 13 · Generalprobe im Abitur-Format",
                 notizen="Sitzordnung wie in einer Klausur. Ermittlernummern austeilen (für die anonyme Peer-Korrektur). "
                         "Hilfsmittel: nur die Operatorenübersicht.")
    p.briefing("Die Ermittlerprüfung", "„Sechs Akten, ein Phantom, eine unbequeme Debatte – ihr habt viel ermittelt. Heute "
               "zeigt ihr, dass ihr das auch ohne mich könnt: eine Aufgabe im Abitur-Format, in einem Kontext, den ihr noch "
               "nie gesehen habt. Lest jeden Operator genau. Danach korrigiert ihr euch gegenseitig – und es gibt Lizenzen. "
               "Denkt an die Klammern.“",
               notizen="Briefing vorlesen (STORY 5.13). Betonen: kein Story-Kontext, keine Tipps, Zeit im Blick behalten.")
    p.inhaltsfolie("Ablauf der Doppelstunde", Tabelle(["Zeit", "Was", "Wie"], [
        ["0–5'", "Organisation, Zeitbudget", "Plenum"],
        ["5–75'", "Generalprobe: eA 30 BE (70'), gA 25 BE (60') + 10' Fallen-Check", "Einzelarbeit"],
        ["75–87'", "Peer-Korrektur der SQL-Teile nach Erwartungshorizont", "Paare, Lab"],
        ["87–90'", "Fallen-Strichliste, Endstand, Detektei-Lizenzen", "Plenum"]], groesse=14),
        notizen="Ablauf kurz zeigen; Hausaufgabe vorab ankündigen: Verhör 7 im Lab vor der Klausur.")
    p.begriffe("Operatoren genau lesen", [
        ("nennen / angeben", "ohne Begründung aufzählen"),
        ("erläutern", "nachvollziehbar machen – mit Beispiel aus dem Material"),
        ("analysieren", "Abfrage im Sachzusammenhang beschreiben: Was liefert sie über …?"),
        ("beurteilen", "begründetes Urteil – Kriterien nennen, entscheiden"),
        ("entwerfen", "SQL-Abfrage notieren (EH §8)"),
        ("erweitern / überführen / erstellen", "Modell bzw. Schema vervollständigen oder neu notieren"),
        ("beschreiben", "Vorgehen in eigenen Worten, schrittweise")],
        notizen="Werkzeugkarte 7 des Ermittler-Handbuchs. Fallen P10: „erläutern“ heißt nicht „nennen“.")
    p.inhaltsfolie("Zeitbudget: rund 2 Minuten je BE", Tabelle(["Teilaufgabe", "BE", "Zeit"], [
        ["Schlüssel / Kennzeichnungen", "4", "8'"], ["Anomalien an der Tabelle", "5", "10'"],
        ["ER erweitern + überführen (eA)", "6 + 3", "≈ 18'"], ["SQL entwerfen", "3 + 5", "≈ 16'"],
        ["SQL analysieren", "4", "8'"], ["Puffer / Fallen-Check", "–", "10'"]], groesse=14),
        "Reihenfolge frei wählbar – z. B. SQL zuerst, ER danach.",
        notizen="W-A7-10 übt genau das: Zeitbudget je Teilaufgabe aufstellen. gA: statt ER der Datenschutz-Teil (4 BE).")
    sql_ergebnis = Ergebnis(*abfrage_ergebnis(BSP_SQL, "stadtfest"))
    p.beispiel_schritte("Analysieren im Sachzusammenhang – ein Beispiel", BSP_SQL, [
        "**FROM/WHERE:** Stände mit ihren Produkten verbinden, nur Produkte ab 3 €",
        "**GROUP BY:** je Stand (Nummer und Name) eine Gruppe",
        "**HAVING:** nur Stände mit mehr als zwei solchen Produkten",
        "**Im Sachzusammenhang:** „Welche Stände bieten beim Stadtfest mehr als zwei Produkte ab 3 € an – und wie viele?“"],
        ergebnis=sql_ergebnis,
        notizen="Eigene Beispieldaten (Stadtfest, Akte 3), keine Prüfungsaufgabe. Kontrast zeigen: Klauseln übersetzen "
                "(P10) vs. Aussage im Sachzusammenhang.")
    p.unplugged("Peer-Korrektur nach Kernpunkten", [
        "Arbeiten über Kreuz tauschen – nur Ermittlernummern, nie im eigenen Team.",
        "Kernpunkt lesen, dann die Lösung: Teilpunkte vergeben, nicht nach Gefühl.",
        "SQL in der Freien Ermittlung (Mensa) ausführen und mit der Musterergebnistabelle vergleichen.",
        "Jede gefundene Falle auf der Fallen-Checkliste ankreuzen.",
        "Rückmeldung: ein „stark“, ein „üben“ mit Warm-up-Karte."],
        material="Erwartungshorizont (SQL-Teile), Fallen-Checkliste", dauer="12 MIN",
        notizen="Lehrkraft geht herum und korrigiert 3–4 Arbeiten zweit (Kalibrierung). Abweichung > 1 BE je Teil → im "
                "Plenum klären.")
    p.merkfolie("Fallen-Check P1–P5", [f"**{n} {k}:** {f}" for n, k, f, _w in FALLEN[:5]],
                notizen="Vor der Abgabe: die eigene Lösung gegen diese Fragen prüfen (gA: letzte 10 Minuten).")
    p.merkfolie("Fallen-Check P6–P10", [f"**{n} {k}:** {f}" for n, k, f, _w in FALLEN[5:]],
                notizen="P8–P10 betreffen Text- und Modellierungsteile – dort gibt es oft Teilpunkte.")
    p.lab_auftrag("7.1", "Die Ermittlerprüfung", "Verhör 7 · Mensa (8 Aufgaben, 30 Minuten)", werkzeug="Freie Ermittlung (Mensa)",
                  hinweise=["Während der Korrektur: SQL-Lösungen in der Freien Ermittlung ausführen.",
                            "Hausaufgabe vor der Klausur: Verhör 7 – ohne Tipps, Abimodus streng.",
                            "Warm-up-Karten W-A7-01 … 10 im Leitner-Trainer."],
                  notizen="Die Mensa-DB nach der Abgabe freischalten. Das Verhör nutzt dieselbe DB, aber andere Aufgaben.")
    p.abi_format("Gegeben ist die folgende SQL-Abfrage zur Datenbank des Stadtfests. **Analysieren** Sie die Abfrage im "
                 "Sachzusammenhang.", be=3, operator="analysieren", inhalt=[SQL(ABI_SQL)],
                 notizen="Zwei Minuten Einzelarbeit, dann Partnervergleich mit den Kernpunkten (Folie danach nur Lehrkraft).")
    p.loesungsfolie("Lösung: Analyse im Sachzusammenhang",
                    "Die Abfrage gibt alle Vereine aus, aus denen mindestens zehn Helferinnen und Helfer beim Stadtfest "
                    "mitgearbeitet haben, mit ihrer Anzahl, absteigend sortiert. Helfer ohne Verein werden nicht gezählt.",
                    "Ergebnis auf der Stadtfest-Datenbank:", Tabelle(*abfrage_ergebnis(ABI_SQL, "stadtfest"), groesse=14),
                    notizen="Kernpunkte: Aussage über Vereine (1), Bedingung mindestens zehn – >= (1), ohne Verein "
                            "ausgeschlossen + Sortierung (1).")
    p.merkfolie("Abschluss: Detektei-Lizenz", [
        "Kurs-Strichliste der Fallen neben das Fallen-Profil aus dem Lab legen.",
        "Die drei häufigsten Fallen = unsere Wiederholung vor der Klausur.",
        "Endstand festschreiben – Edda unterschreibt die Lizenzen.",
        "„Geschlossen. Bis zum nächsten Fall.“"],
        notizen="Urkunden aus dem Lehrkraft-Bereich drucken. Polaroid „Detektei-Lizenz“ an die Pinnwand (STORY 5.13 c).")
    return p.speichern(ORDNER / "1_Praesentation" / "DD_A7_Generalprobe.pptx")


# ================================================================== Warm-up und Hauptprogramm
def warmup():
    karten = json.loads((REPO / "seed" / "warmup" / "warmup_a7.json").read_text(encoding="utf-8"))["karten"]
    return warmup_karten_dokument(karten, 7, "Warm-up-Karten Akte 7").speichern(MAT / "Warm-up" / "DD_Warm-up-Karten_A7.docx")


def main():
    for f in ("schueler", "loesung"):
        for ea in (True, False):
            generalprobe(ea, f)
            klausur(ea, f)
            nachschreibklausur(ea, f)
    fallen_checkliste()
    lehrerhinweise()
    praesentation()
    warmup()
    for p in sorted(ORDNER.rglob("*.*")) + [MAT / "Warm-up" / "DD_Warm-up-Karten_A7.docx"]:
        print(f"✔ {p.relative_to(REPO)}")


if __name__ == "__main__":
    main()
