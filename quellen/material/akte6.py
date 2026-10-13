#!/usr/bin/env python3
"""Erstellungshilfe: Material der Akte 6 „Datenspuren“ (DS 12, Ermittlung 6.1 „Das Phantom“) im Akten-Design.

Erzeugt (Spec §11, §12.1; DS_PLANUNG DS 12; STORY 4.6, 5.12, 7, 8):
  materialien/Akte6_Datenspuren/1_Praesentation/DD_A6_Datenspuren.pptx
  materialien/Akte6_Datenspuren/2_Arbeitsblaetter/DD_A6_AB1_Das_Phantom.docx
  materialien/Akte6_Datenspuren/3_Unplugged/DD_A6_Unplugged_Steh_auf_wenn.docx,
                                            DD_A6_Unplugged_Rollenkarten-Debatte.docx
  materialien/Akte6_Datenspuren/4_Lehrerhinweise/DD_A6_Lehrerhinweise.docx
  materialien/Akte6_Datenspuren/5_Loesungen/…_LSG.docx (Arbeitsblatt, beide Unplugged)
  materialien/Warm-up/DD_Warm-up-Karten_A6.docx

Die Auflösung des Phantoms (Name, früherer Beruf) steht nur in Lehrkraft-/Lösungsfassungen und auf Folien mit
`nur_lehrkraft=True` (fehlen im Handout). Die Schülerfassung der Rollenkarten lässt Name und Hintergrund des Phantoms
offen (wird nach dem Schlussplädoyer eingetragen).

Daten: DB `datenspuren` (seed/datenbanken/datenspuren) bzw. eigene, frei erfundene Daten (Profilkarten, Datenschutz-
hinweise der WeserApp, Rollen- und Argumentkarten nach STORY 8). Die erzeugten docx/pptx sind danach maßgeblich
(Spec §12); dieses Skript ist nur die Erstellungshilfe. Aufruf: python3 quellen/material/akte6.py
"""
import json
import re
import sys
from collections import Counter
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "werkzeuge"))

from docx.shared import Cm  # noqa: E402

from akten_design import (  # noqa: E402
    AktenDokument, AktenPraesentation, Auftrag, Ergebnis, Liste, Loesung, Notiz, Schema, SQL, Tabelle,
    abfrage_ergebnis, warmup_karten_dokument, _tabelle_breiten, _zelle_rahmen, _zelle_innenabstand,
    _zeile_nicht_teilen, _zelle_flaeche)

MAT = REPO / "materialien"
ORDNER = MAT / "Akte6_Datenspuren"
DB = "datenspuren"

SCHEMA = [
    "Einwohner(<u>EinwohnerNr</u>, Vorname, Nachname, Jahrgang, Stadtteil, Strasse)",
    "RadExport(<u>KundenToken</u>, Jahrgang, Stadtteil, Tarif, StartStation, <u>Start</u>)",
    "FestZahlung(<u>KartenToken</u>, StandNr, <u>Zeitpunkt</u>, Betrag)",
    "VereinExport(<u>MitgliedToken</u>, Geburtsjahr, <u>Abteilung</u>, Stadtteil)",
    "AppCheckin(<u>Geraet</u>, Ort, <u>Zeitpunkt</u>)",
]


# ================================================================== Hilfen
def umbrechen(text, breite=58):
    """Lange SELECT-/GROUP-BY-Zeilen nach Kommas umbrechen (wie quellen/material/akte3.py) – für schmale Lösungskästen."""
    aus = []
    for zeile in text.split("\n"):
        m = re.match(r"(SELECT DISTINCT |SELECT |GROUP BY )(.*)", zeile)
        if len(zeile) <= breite or not m:
            aus.append(zeile)
            continue
        einzug, teile, aktuell = " " * len(m.group(1)), m.group(2).split(", "), m.group(1)
        for i, t in enumerate(teile):
            stueck = t + ("," if i < len(teile) - 1 else "")
            if aktuell.strip() and len(aktuell) + len(stueck) + 1 > breite and aktuell not in (m.group(1), einzug):
                aus.append(aktuell.rstrip())
                aktuell = einzug
            aktuell += stueck + " "
        aus.append(aktuell.rstrip())
    return "\n".join(aus)


def S(text, breite=58, **kw):
    """SQL für Word: Semikolon am Ende, lange Zeilen umbrochen."""
    return SQL(umbrechen(text.strip("\n").rstrip(";"), breite) + ";", **kw)


def ergebnis(sql, max_zeilen=None, breiten=None):
    kopf, zeilen = abfrage_ergebnis(sql, DB)
    if max_zeilen and len(zeilen) > max_zeilen:
        return Ergebnis(kopf, zeilen[:max_zeilen], abgeschnitten=True, breiten=breiten)
    return Ergebnis(kopf, zeilen, breiten=breiten)


def sql_mit_ergebnis(sql, max_zeilen=None, breite=58):
    return [S(sql, breite), ergebnis(sql, max_zeilen)]


def daten(sql):
    return abfrage_ergebnis(sql, DB)


# ================================================================== Schlussplädoyer (Lab A6-E1-09 … 14, Musterlösungen)
SPUREN = [
    ("09", "Spur 1: Fünf Nächte an der Hafenkante",
     "Welche Fahrten begannen vom 08.09. bis 12.09. an der Hafenkante?",
     "SELECT KundenToken, Start, Jahrgang, Stadtteil, Tarif\nFROM RadExport\nWHERE StartStation = 'Hafenkante'\n"
     "  AND Start BETWEEN '2026-09-08 00:00'\n                AND '2026-09-12 23:59'\nORDER BY Start", None,
     "Neun Fahrten, davon fünf **nachts (01–02 Uhr)** – alle unter **R-7F3A** (1988, Hafenviertel, Plus); die übrigen "
     "vier sind Tagesfahrten verschiedener Tokens."),
    ("10", "Spur 2: Wie viele teilen diese Merkmale?",
     "Wie viele verschiedene Tokens haben 1988 + Hafenviertel + Plus?",
     "SELECT DISTINCT KundenToken\nFROM RadExport\nWHERE Jahrgang = 1988\n  AND Stadtteil = 'Hafenviertel'\n  AND Tarif = 'Plus'",
     None, "Nur **ein** Token: Drei harmlose Angaben wirken wie ein Name. (COUNT(*) je Merkmalsgruppe zählte Fahrten, nicht "
           "Menschen – P4.)"),
    ("11", "Spur 3: Das Handy fährt mit",
     "Welches Gerät war zur selben Zeit am selben Ort?",
     "SELECT AppCheckin.Geraet, COUNT(*) AS Treffer\nFROM RadExport, AppCheckin\nWHERE AppCheckin.Ort = RadExport.StartStation\n"
     "  AND AppCheckin.Zeitpunkt = RadExport.Start\n  AND RadExport.KundenToken = 'R-7F3A'\nGROUP BY AppCheckin.Geraet\n"
     "ORDER BY Treffer DESC", None,
     "**WA-3917** passt zu allen fünf Fahrten; WA-5530 (Nachtschicht im Hafen) nur zu zwei."),
    ("12", "Spur 4: Wo war das Gerät sonst?",
     "Wo hat das Gerät sonst eingecheckt?",
     "SELECT Ort, Zeitpunkt\nFROM AppCheckin\nWHERE Geraet = 'WA-3917'\nORDER BY Zeitpunkt", 9,
     "19 Check-ins: dienstags Vereinsheim TuS, Festplatz am 29.08. vor 22 und nach 23 Uhr, Fundbüro am 14.09. um 10:17, "
     "Hafenkante in den Tatnächten – und nachts immer wieder **Kranstraße 7**."),
    ("13", "Spur 5: Wer aus dem TuS passt?",
     "Welches Vereinsmitglied hat dieselben Merkmale?",
     "SELECT MitgliedToken\nFROM VereinExport\nWHERE Geburtsjahr = 1988\n  AND Stadtteil = 'Hafenviertel'\n"
     "  AND Abteilung = 'Tischtennis'", None,
     "Genau **V-2571** (Tischtennis). „Nora Falter“ (V-9952) hat kein Geburtsjahr und fällt heraus (P5)."),
    ("14", "Spur 6: Die Enttarnung",
     "Wer wohnt an der Adresse, an der das Gerät nachts eincheckt?",
     "SELECT DISTINCT e.Vorname, e.Nachname\nFROM Einwohner e, AppCheckin a, RadExport r\nWHERE a.Ort = e.Strasse\n"
     "  AND a.Geraet = 'WA-3917'\n  AND r.KundenToken = 'R-7F3A'\n  AND r.Jahrgang = e.Jahrgang\n  AND r.Stadtteil = e.Stadtteil",
     None, "**Merle Falkenrath** – ohne DISTINCT erschiene sie einmal je Kombination aus Check-in und Fahrt (P2); ohne "
           "Jahrgang/Stadtteil käme der Nachbar Rune Siemers (1961) hinzu."),
]


# ================================================================== Unplugged „Steh auf, wenn …“: 30 Profilkarten (eigene Daten)
# (Jahrgang, Stadtteil, Tarif, Verein, Lieblingsstand) – Runde 1: 1988 (7) → Hafenviertel (3) → Plus (1);
# Runde 2: Lieblingsstand Fischbrötchen (6) → Verein Ruderclub Weser (2) → Tarif Schule (1).
PROFILE = [
    (1988, "Hafenviertel", "Plus", "Schachclub Altstadt", "Kaffeemobil"),        # bleibt in Runde 1 übrig
    (1988, "Hafenviertel", "Basis", "TuS – Fußball", "Bratwurst"),
    (1988, "Hafenviertel", "Basis", "kein Verein", "Crêpes"),
    (1988, "Lindenhof", "Plus", "Chor Lindenhof", "Kaffeemobil"),
    (1988, "Altstadt", "Plus", "TuS – Tischtennis", "Eiswagen"),
    (1988, "Nordheide", "Basis", "kein Verein", "Fischbrötchen"),
    (1988, "Mühlenfeld", "Plus", "TuS – Handball", "Losbude"),
    (1986, "Hafenviertel", "Plus", "Ruderclub Weser", "Kaffeemobil"),
    (1991, "Hafenviertel", "Plus", "kein Verein", "Bratwurst"),
    (1979, "Hafenviertel", "Basis", "TuS – Tischtennis", "Fischbrötchen"),
    (2008, "Hafenviertel", "Schule", "Ruderclub Weser", "Crêpes"),
    (2009, "Altstadt", "Schule", "TuS – Fußball", "Eiswagen"),
    (2008, "Altstadt", "Schule", "Ruderclub Weser", "Fischbrötchen"),        # bleibt in Runde 2 übrig
    (1972, "Altstadt", "Basis", "Chor Lindenhof", "Kaffeemobil"),
    (1995, "Altstadt", "Plus", "kein Verein", "Crêpes"),
    (1965, "Lindenhof", "Basis", "Schachclub Altstadt", "Fischbrötchen"),
    (2007, "Lindenhof", "Schule", "TuS – Handball", "Losbude"),
    (1999, "Lindenhof", "Plus", "kein Verein", "Bratwurst"),
    (1983, "Lindenhof", "Basis", "TuS – Tennis", "Eiswagen"),
    (2009, "Mühlenfeld", "Schule", "TuS – Tischtennis", "Crêpes"),
    (1977, "Mühlenfeld", "Plus", "Ruderclub Weser", "Fischbrötchen"),
    (1990, "Mühlenfeld", "Basis", "kein Verein", "Kaffeemobil"),
    (2001, "Nordheide", "Basis", "TuS – Fußball", "Bratwurst"),
    (2008, "Nordheide", "Schule", "Chor Lindenhof", "Eiswagen"),
    (1985, "Nordheide", "Plus", "kein Verein", "Losbude"),
    (1968, "Weserufer", "Basis", "kein Verein", "Fischbrötchen"),
    (1994, "Weserufer", "Plus", "TuS – Tennis", "Crêpes"),
    (2003, "Bahnhofsviertel", "Basis", "kein Verein", "Bratwurst"),
    (1981, "Bahnhofsviertel", "Plus", "Schachclub Altstadt", "Kaffeemobil"),
    (2009, "Deichkamp", "Schule", "TuS – Handball", "Eiswagen"),
]
# feste, „gemischte“ Kartennummern (die Reihenfolge der Liste soll beim Austeilen nichts verraten)
PROFIL_NR = [17, 4, 23, 9, 28, 12, 2, 20, 6, 14, 30, 11, 25, 1, 19, 8, 26, 15, 3, 22, 10, 27, 5, 18, 29, 13, 24, 7, 21, 16]


def _profile_pruefen():
    assert len(PROFILE) == 30 and sorted(PROFIL_NR) == list(range(1, 31))
    r1 = [p for p in PROFILE if p[0] == 1988]
    r1b = [p for p in r1 if p[1] == "Hafenviertel"]
    r1c = [p for p in r1b if p[2] == "Plus"]
    r2 = [p for p in PROFILE if p[4] == "Fischbrötchen"]
    r2b = [p for p in r2 if p[3] == "Ruderclub Weser"]
    r2c = [p for p in r2b if p[2] == "Schule"]
    assert (len(r1), len(r1b), len(r1c)) == (7, 3, 1), (len(r1), len(r1b), len(r1c))
    assert (len(r2), len(r2b), len(r2c)) == (6, 2, 1), (len(r2), len(r2b), len(r2c))
    # Kein Profil ist allein schon durch Jahrgang + Stadtteil eindeutig? Doch – genau das ist der Impuls (Zählung für die LSG)
    return Counter((p[0], p[1]) for p in PROFILE)


GRUPPEN = _profile_pruefen()
PROFIL_RUNDE1 = PROFIL_NR[0]
PROFIL_RUNDE2 = PROFIL_NR[12]


# ================================================================== Rollenkarten-Debatte (STORY 8, je 4 Argumentkarten)
ROLLEN = [
    {"nr": 1, "rolle": "Stadt Weserstedt", "person": "Bürgermeisterin Annegret Vollmers",
     "lage": "Die Stadt wurde durch das Phantom geschädigt (Fundbuch, Lastenräder, Festkasse, Vereinsliste). Sie hat der "
             "Detektei pseudonyme Exporte aus StadtRad, Stadtfest, TuS, WeserApp und dem Einwohnerverzeichnis überlassen.",
     "position": "Die Weitergabe war verantwortbar – die Stadt wurde geschädigt und hat nur pseudonyme Daten herausgegeben.",
     "argumente": [
         ("Rechtsgrundlage", "Alle Daten wurden rechtmäßig erhoben: Ausleihvertrag bei StadtRad, Abrechnung des "
                             "Stadtfests, Vereinsverwaltung – es gab jeweils eine Rechtsgrundlage."),
         ("Datenminimierung", "Wir haben keine Namen weitergegeben, nur Tokens. An Datenminimierung haben wir gedacht."),
         ("öffentliches Interesse", "Manipulationen an städtischen Daten zu stoppen liegt im öffentlichen Interesse; die "
                                    "Bürgerinnen und Bürger erwarten Aufklärung."),
         ("Speicherbegrenzung", "Die Exporte gingen nur an die beauftragte Detektei und werden nach Abschluss des Falls "
                                "gelöscht."),
     ],
     "leitfrage": "Ist „Fahndung“ ein neuer Zweck, für den die Daten nie erhoben wurden (Zweckbindung) – und wer hätte über "
                  "diese Weitergabe entscheiden dürfen?"},
    {"nr": 2, "rolle": "Datendetektei", "person": "Edda Lorenz",
     "lage": "Die Detektei hat im Auftrag der Stadt die Exporte verknüpft und das Phantom enttarnt. Zwei Unbeteiligte standen "
             "dabei kurz auf der Kandidatenliste.",
     "position": "Wir hatten einen Auftrag und ein gutes Ziel – aber wir müssen uns fragen, ob das genügt.",
     "argumente": [
         ("Auftrag", "Die Stadt hat uns die Daten freiwillig übergeben; wir haben nichts gehackt."),
         ("Datenminimierung", "Wir haben nur so viel verknüpft wie nötig und die Unbeteiligten nicht weiter verfolgt."),
         ("Datensicherheit", "Ohne Aufklärung hätte das Phantom womöglich weitere Datenbestände manipuliert – die "
                             "Integrität der städtischen Daten stand auf dem Spiel."),
         ("Vertraulichkeit", "Wir haben die Ergebnisse nur der Stadt mitgeteilt und nichts veröffentlicht."),
     ],
     "leitfrage": "Rechtfertigt ein richtiges Ergebnis die Methode – und darf eine private Detektei Daten verknüpfen, für die "
                  "es keine Rechtsgrundlage und keine Einwilligung der Betroffenen gibt?"},
    {"nr": 3, "rolle": "Das Phantom", "person": "„Nora Falter“",
     "lage": "Hinter dem Tarnnamen „Nora Falter“ steht eine Person, die im Schlussplädoyer enttarnt wird. Sie hat absichtlich "
             "Datenpannen gelegt – und nichts behalten.",
     "lage_lk": "Merle Falkenrath, Jahrgang 1988, Hafenviertel, Tischtennis beim TuS – bis 2025 Datenschutzbeauftragte der "
                "Stadt. Ihr Gutachten „Wie gläsern ist Weserstedt?“ verschwand in einer Schublade; ihr Zugang wurde nach dem "
                "Ausscheiden nie gesperrt. Sie hat nichts behalten und niemanden verletzt.",
     "position": "Ich habe sichtbar gemacht, was die Stadt seit Jahren ignoriert.",
     "argumente": [
         ("Quasi-Identifikatoren", "„Pseudonym“ ist nicht „anonym“: Jahrgang, Stadtteil und Tarif genügen, um Menschen zu "
                                   "erkennen – die Detektei hat es bewiesen."),
         ("Transparenz / Speicherbegrenzung", "Die WeserApp speichert minutengenaue Check-ins monatelang, ohne dass es "
                                              "jemand weiß."),
         ("Datensicherheit", "Die Daten der Stadt waren schlecht geschützt: Zugänge wurden nicht gesperrt, Änderungen "
                             "nicht geprüft. Ich habe nichts behalten und niemanden verletzt."),
         ("Datenminimierung", "Für eine Fahrrad-Abrechnung braucht niemand Jahrgang, Stadtteil und Startzeit im Export – "
                              "die Stadt gibt mehr heraus als nötig."),
     ],
     "argumente_lk": {2: ("Datensicherheit", "Mein Zugang als ehemalige Datenschutzbeauftragte wurde nie gesperrt; die "
                                             "Stadt schützt ihre Daten nicht. Ich habe nichts behalten und niemanden "
                                             "verletzt.")},
     "leitfrage": "Darf man selbst Regeln brechen, um zu zeigen, dass andere Regeln gebrochen werden?"},
    {"nr": 4, "rolle": "Bürgerin", "person": "Tamara Leversen, Hafenviertel, Jahrgang 1988",
     "lage": "Sie nutzt StadtRad (Tarif Basis) und die WeserApp. Weil sie 1988 geboren ist und im Hafenviertel wohnt, stand sie "
             "kurz auf der Kandidatenliste der Detektei – obwohl sie mit nichts zu tun hat.",
     "position": "Ich war verdächtig, ohne irgendetwas getan zu haben – und niemand hat mich gefragt.",
     "argumente": [
         ("Transparenz", "Ich wusste nicht, dass die WeserApp an jeder StadtRad-Station automatisch eincheckt."),
         ("Einwilligung / Zweckbindung", "Ich habe für Fahrrad und App eingewilligt, nicht für eine Fahndung."),
         ("informationelle Selbstbestimmung", "Ich will wissen und mitentscheiden, wer was über mich weiß."),
         ("Speicherbegrenzung", "Die App hat gespeichert, wo ich nachts bin – meine Adresse. Das soll sofort gelöscht "
                                "werden."),
     ],
     "leitfrage": "Was müsste die Stadt ändern, damit du ihr deine Daten wieder anvertraust?"},
    {"nr": 5, "rolle": "Landesdatenschutzbehörde", "person": "Referent Mats Oltmanns",
     "lage": "Die (fiktive) Aufsichtsbehörde prüft unabhängig, ob Stadt und Detektei datenschutzgerecht gehandelt haben.",
     "position": "Wir prüfen unabhängig – und sehen Probleme auf allen Seiten.",
     "argumente": [
         ("Rechtsgrundlage / Zweckbindung", "Pseudonymisierte Daten sind personenbezogen. Ihre Weitergabe an eine private "
                                            "Stelle braucht eine Rechtsgrundlage; ein neuer Zweck muss geprüft werden."),
         ("Datenminimierung / Speicherbegrenzung", "Für die Verkehrsplanung reichen aggregierte Zahlen je Station und "
                                                   "Stunde – keine Einzel-Check-ins mit Gerätekennung über Monate."),
         ("Datensicherheit", "Zugänge ehemaliger Beschäftigter sperren, Zugriffsrechte nach Rollen, Änderungen "
                             "protokollieren, Exporte verschlüsseln."),
         ("Profilbildung", "Wer viele Quellen automatisiert verknüpft, erzeugt Bewegungsprofile. Kleine Gruppen müssen "
                           "deshalb vor jeder Weitergabe zusammengefasst werden."),
     ],
     "leitfrage": "Welche technischen und organisatorischen Maßnahmen hätten alle vier Taten – und die Enttarnung – "
                  "verhindert?"},
]

WESERAPP = [
    ("A · Werbung", "„Wir nutzen deine Check-ins, um dir passende Angebote unserer Partner anzuzeigen. Mit der Nutzung der "
                    "App erklärst du dich damit einverstanden.“"),
    ("B · Standort", "„Die App erfasst deinen Standort auch im Hintergrund. Ist kein markierter Ort in der Nähe, speichern wir "
                     "die nächstgelegene Adresse. Check-ins bewahren wir zur Verbesserung unserer Dienste auf.“"),
    ("C · Interaktionen", "„Wir werten aus, welche Orte du wie oft besuchst und welche Funktionen du nutzt, und erstellen "
                          "daraus ein Nutzungsprofil. Daten können an Stellen der Stadtverwaltung weitergegeben werden.“"),
]


# ================================================================== AB 6.1 „Das Phantom“ (DS 12)
def ab61(fassung):
    d = AktenDokument("ab", 6, "Das Phantom", fassung=fassung, ermittlung="6.1", ds=12, material="AB 6.1",
                      datenbank=DB, untertitel="Datenschutz, Quasi-Identifikatoren, Datenschutz und Datensicherheit")
    d.kopfband()
    d.fall_einstieg("Die Stadt hat der Detektei „anonymisierte“ Exporte aus StadtRad, Stadtfest, Verein und WeserApp "
                    "übergeben – dazu einen Auszug aus dem Einwohnerverzeichnis. Edda Lorenz: „Wenn das Phantom darin steckt, "
                    "finden wir es. Die Frage ist nur: Dürfen wir das?“")
    d.beweisstueck(1, "Informationelle Selbstbestimmung und DSGVO-Grundsätze",
                   "**Informationelle Selbstbestimmung:** Jede Person entscheidet grundsätzlich selbst über Preisgabe und "
                   "Verwendung ihrer persönlichen Daten. Die Datenschutz-Grundverordnung (DSGVO) macht daraus Grundsätze:",
                   Tabelle(["Grundsatz", "Bedeutung", "Beispiel aus Weserstedt"], [
                       ["**Rechtmäßigkeit** (Einwilligung)", "Jede Verarbeitung braucht eine Rechtsgrundlage, z. B. eine "
                        "freiwillige, informierte, widerrufbare Einwilligung.", "StadtRad darf Fahrten für die Abrechnung "
                        "speichern (Vertrag) – nicht für eine Fahndung."],
                       ["**Zweckbindung**", "Daten nur für den Zweck nutzen, für den sie erhoben wurden.",
                        "Vereinsdaten mit Fest- und Raddaten zusammenführen ist ein neuer Zweck."],
                       ["**Datenminimierung**", "Nur so viele Daten wie nötig.", "Jahrgang und Tarif sind für eine "
                        "Ausleihstatistik nicht nötig."],
                       ["**Transparenz**", "Betroffene wissen, wer was wozu verarbeitet.", "Niemand wusste von der "
                        "Weitergabe an die Detektei."],
                       ["**Speicherbegrenzung**", "Löschen, sobald der Zweck erfüllt ist.", "Check-ins aus vielen Monaten "
                        "statt Löschung nach dem Check-in."],
                       ["**besondere Kategorien**", "Gesundheits-, Religions-, biometrische Daten u. a. sind besonders "
                        "geschützt.", "Puls- und Schrittdaten einer Fitness-App."],
                   ], breiten=[3.4, 6.2, 7.0], groesse=8.5))
    d.beweisstueck(2, "Personenbezogen – pseudonym – anonym",
                   Liste(["**personenbezogen:** Die Person ist bestimmt oder bestimmbar (Name, Adresse, Kundennummer …).",
                          "**pseudonym:** Ein Kennzeichen ersetzt den Namen (`R-21C4`, `WA-1288`). Mit Zusatzwissen lässt sich "
                          "die Person bestimmen – die Daten **bleiben personenbezogen**.",
                          "**anonym:** Keine Person ist mehr bestimmbar, z. B. eine Summe je Stadtteil über viele Menschen.",
                          "**Quasi-Identifikatoren** wie Jahrgang, Stadtteil, Tarif oder Zeitmuster sind einzeln harmlos – "
                          "zusammen bilden sie **kleine Gruppen**, oft mit nur einer Person (**Re-Identifizierung**)."]),
                   "Wie klein werden die Gruppen? Alle Einwohner mit Jahrgang 1988:",
                   *sql_mit_ergebnis("SELECT Stadtteil, COUNT(*) AS Einwohner\nFROM Einwohner\nWHERE Jahrgang = 1988\n"
                                     "GROUP BY Stadtteil"),
                   "Wer weiß, dass eine Person 1988 geboren ist und in Mühlenfeld wohnt, kennt sie – ohne Namen.")
    d.beweisstueck(3, "Datenschutz und Datensicherheit",
                   Tabelle(["", "Datenschutz", "Datensicherheit"], [
                       ["schützt …", "**Personen** und ihr Recht auf informationelle Selbstbestimmung",
                        "die **Daten** selbst: Vertraulichkeit, Integrität (unverfälscht), Verfügbarkeit"],
                       ["fragt …", "*Dürfen* diese Daten überhaupt so verarbeitet werden?", "Sind die Daten vor Verlust, "
                        "Manipulation und unbefugtem Zugriff *sicher*?"],
                       ["Beispiele", "Zweckbindung, Einwilligung, Datenminimierung, Löschfristen",
                        "Verschlüsselung, Zugriffsrechte, Passwörter, Protokolle, Backups"],
                   ], breiten=[2.0, 7.2, 7.4], groesse=8.5),
                   "Beides hängt zusammen: Ein nie gesperrter Zugang (Datensicherheit) ermöglichte die Manipulation des "
                   "Fundbuchs – und verletzt damit auch den Schutz der Personen darin.")
    d.beweisstueck(4, "Technische und organisatorische Maßnahmen",
                   Tabelle(["Maßnahme", "So wirkt sie"], [
                       ["**Aggregation**", "nur Summen veröffentlichen (Ausleihen je Station und Stunde) statt einzelner Fahrten"],
                       ["**Mindestgruppengröße / Vergröberung**", "keine Gruppen unter z. B. 5 Personen; Jahrzehnt statt "
                        "Jahrgang, Stadtteil statt Adresse"],
                       ["**Pseudonymisierung** mit wechselnden Kennzeichen", "Zuordnungstabelle getrennt und geschützt; "
                        "neues Token je Export"],
                       ["**Zugriffsrechte, Verschlüsselung**", "nur Berechtigte sehen die Daten; alte Zugänge sperren"],
                       ["**Löschfristen**", "Check-ins nach z. B. 7 Tagen löschen (Speicherbegrenzung)"],
                   ], breiten=[5.2, 11.4], groesse=8.5))
    d.beweisstueck(5, "Chancen und Risiken automatisierter Datenanalyse",
                   Liste(["**Chancen:** Verkehrsplanung (wo fehlen Räder?), Betrug und Manipulation aufdecken, Muster "
                          "erkennen, die kein Mensch in Tabellen sähe.",
                          "**Risiken:** **Profilbildung** (Bewegungs- und Freizeitmuster, Wohnadresse aus Standortdaten), "
                          "Unbeteiligte geraten unter Verdacht, Daten werden für neue Zwecke missbraucht."]))

    # Ermittlungsaufträge -----------------------------------------------------------------
    situationen = Tabelle(["Situation", "verletzter Grundsatz"], [
        ["a) Der TuS-Export enthält Geburtsjahr und Stadtteil jedes Mitglieds, obwohl die Stadt nur wissen wollte, wie groß "
         "die Abteilungen sind.", ""],
        ["b) Die Kartenzahlungen vom Stadtfest dienten der Abrechnung der Stände – jetzt prüft die Detektei damit Alibis.", ""],
        ["c) In den Hinweisen der WeserApp steht nirgends, dass sie nachts die nächstgelegene Adresse speichert.", ""],
        ["d) Im Fundbuch stehen noch Name und Telefonnummer von Personen, die 2019 Fundsachen abgeholt haben.", ""],
        ["e) Die Stadt gibt das Einwohnerverzeichnis an eine private Detektei – ohne Einwilligung und ohne Gesetz, das "
         "es erlaubt.", ""],
    ], breiten=[9.0, 3.4], groesse=8.5)
    rad = Tabelle(*daten("SELECT KundenToken, Jahrgang, Stadtteil, Tarif, StartStation, Start\nFROM RadExport\n"
                         "WHERE KundenToken = 'R-D3A1'\nORDER BY Start"), groesse=8.5,
                breiten=[2.3, 1.8, 1.9, 1.1, 2.6, 2.7])
    verein = Tabelle(*daten("SELECT MitgliedToken, Geburtsjahr, Abteilung, Stadtteil\nFROM VereinExport\n"
                            "WHERE MitgliedToken = 'V-5245'"), groesse=8.5,
                   breiten=[2.6, 2.4, 2.2, 2.2])
    sql_1976 = "SELECT COUNT(*) AS Personen\nFROM Einwohner\nWHERE Jahrgang = 1976\n  AND Stadtteil = 'Altstadt'"
    spuren_tab = Tabelle(["Spur", "Frage", "Indiz (dein Ergebnis)"],
                         [[s[1].split(":")[0], s[2], ""] for s in SPUREN], breiten=[1.5, 5.3, 5.6], groesse=8.5)
    weserapp = Tabelle(["Auszug", "Datenschutzhinweis der WeserApp (fiktiv)"], [list(w) for w in WESERAPP],
                       breiten=[2.5, 9.9], groesse=8.5)

    loes_spuren = []
    for nr, titel, _frage, sql, max_z, indiz in SPUREN:
        loes_spuren += [f"**A6-E1-{nr} · {titel}**", S(sql, 56), ergebnis(sql, max_z), indiz]

    tab = d.ermittlungsauftraege([
        Auftrag(1, 1, "PAPIER", "Ordne jeder Situation den Grundsatz zu, der verletzt wird (Beweisstück 1).",
                kompetenzen=["K44"], inhalt=[situationen],
                loesung=Loesung("a) **Datenminimierung** · b) **Zweckbindung** · c) **Transparenz** · d) "
                                "**Speicherbegrenzung** · e) **Rechtmäßigkeit** (keine Rechtsgrundlage, keine Einwilligung).",
                                "Auch vertretbar: b) zusätzlich Rechtmäßigkeit, c) zusätzlich Datenminimierung – wenn "
                                "begründet.",
                                fehler=[("P10", "Grundsatz nur genannt, wo eine Begründung verlangt ist."),
                                        ("P10", "Zweckbindung und Rechtmäßigkeit verwechselt: Auch eine erlaubte Erhebung "
                                                "erlaubt keinen neuen Zweck.")])),
        Auftrag(2, 2, "PAPIER", "**Erläutere** an den Ausschnitten, warum die Pseudonymisierung der Exporte die Personen nicht "
                "anonym macht. Gehe auf Quasi-Identifikatoren und die Gruppengröße ein.", kompetenzen=["K46"],
                inhalt=["RadExport (alle Fahrten des Tokens R-D3A1):", rad, "VereinExport (Ausschnitt):", verein,
                        "Einwohnerverzeichnis:", S(sql_1976), ergebnis(sql_1976)],
                linien=3,
                loesung=Loesung(
                    "Die Tokens R-D3A1 und V-5245 ersetzen nur den Namen. Jahrgang/Geburtsjahr (1976) und Stadtteil "
                    "(Altstadt) sind **Quasi-Identifikatoren**: Im Einwohnerverzeichnis gibt es nur **zwei** Personen mit "
                    "dieser Kombination. Über die gleichen Werte lassen sich RadExport und VereinExport verknüpfen – "
                    "wahrscheinlich dieselbe Person, die Tennis spielt und den Tarif Plus nutzt. Mit Zusatzwissen (z. B. "
                    "„meine Nachbarin spielt Tennis“) ist sie eindeutig bestimmt. Pseudonyme Daten bleiben deshalb "
                    "**personenbezogen**; anonym wären erst Summen über große Gruppen.",
                    fehler=[("P10", "„Es steht kein Name drin, also anonym.“"),
                            ("P2", "Aus dem gemeinsamen Jahrgang sicher auf dieselbe Person schließen – zwei Personen "
                                   "kommen infrage; die Verknüpfung liefert Kandidaten, keinen Beweis.")])),
        Auftrag(3, 2, "LAB", "Ermittle im **Schlussplädoyer** (A6-E1-09 … 14) Schritt für Schritt und halte jedes Indiz fest.",
                kompetenzen=["K24", "K26"], inhalt=[spuren_tab],
                loesung=Loesung(*loes_spuren,
                                fehler=[("P6", "Spur 1 mit fünf BETWEEN-Fenstern ohne Klammern um die OR-Gruppe – die "
                                               "Station gilt dann nur für die erste Nacht."),
                                        ("P4", "Spur 2 mit GROUP BY und COUNT(*): zählt Fahrten, nicht Menschen."),
                                        ("P2", "Spur 6 ohne DISTINCT oder ohne Jahrgangsbedingung (Nachbar Rune "
                                               "Siemers, 1961).")])),
        Auftrag(4, 2, "PAPIER", "**Beurteile** die drei Auszüge aus den Datenschutzhinweisen der WeserApp jeweils anhand "
                "eines passenden Grundsatzes.", kompetenzen=["K45", "K44"], inhalt=[weserapp], linien=3,
                loesung=Loesung(
                    "**A · Werbung:** Keine wirksame **Einwilligung** – sie ist an die Nutzung gekoppelt (nicht freiwillig), "
                    "nicht ausdrücklich und nicht konkret (welche Partner?). Werbung ist außerdem ein anderer Zweck als "
                    "Check-ins (**Zweckbindung**). → So unzulässig; nötig wäre ein freiwilliges, widerrufbares Opt-in.",
                    "**B · Standort:** Verstoß gegen **Datenminimierung** (Hintergrundortung und Adressen sind für Check-ins "
                    "nicht nötig) und **Speicherbegrenzung** („zur Verbesserung“ ohne Frist). Standortdaten verraten die "
                    "Wohnung – genau so wurde das Phantom gefunden. → unzulässig, mindestens Löschfrist und Abschaltbarkeit.",
                    "**C · Interaktionen:** **Profilbildung** und Weitergabe an „Stellen der Stadtverwaltung“ ohne "
                    "benannten Zweck verletzen **Zweckbindung** und **Transparenz**; es fehlt eine Rechtsgrundlage. → "
                    "unzulässig, solange Zweck, Empfänger und Rechtsgrundlage nicht genannt sind.",
                    fehler=[("P10", "Grundsätze nur genannt, ohne Bezug auf den Wortlaut des Auszugs und ohne Urteil."),
                            ("P10", "„Wer die App nutzt, ist selbst schuld“ – keine Beurteilung anhand der Grundsätze.")])),
        Auftrag(5, 3, "PAPIER", "**Erörtere** die Aussage: „Die Detektei hat das Phantom nur gefunden, weil sie selbst alle "
                "Bürger durchleuchtet hat.“", kompetenzen=["K46", "K45"], linien=4,
                loesung=Loesung(
                    "**Dafür:** Die Detektei hat Daten von Hunderten Menschen verknüpft (Rad, Fest, Verein, App, "
                    "Einwohner) – ohne deren Wissen (**Transparenz**), ohne Einwilligung und für einen neuen Zweck "
                    "(**Zweckbindung**). Zwei Unbeteiligte gerieten nur wegen Jahrgang und Stadtteil unter Verdacht; ihre "
                    "Adressen lagen ebenfalls offen. Das ist genau die **Profilbildung**, vor der das Phantom gewarnt hat.",
                    "**Dagegen:** Die Detektei hat nicht „alle“ durchleuchtet, sondern gezielt nach Tatort und Tatzeit "
                    "gefiltert, Unbeteiligte nicht weiter verfolgt und im Auftrag der geschädigten Stadt gehandelt; das "
                    "Aufklären von Manipulationen schützt auch die **Integrität** städtischer Daten.",
                    "**Fazit (Beispiel):** Die Aussage überzeichnet, trifft aber den Kern: Möglich war die Enttarnung nur, "
                    "weil zu viele Daten zu lange und zu genau gespeichert und ohne Rechtsgrundlage weitergegeben wurden. "
                    "Ein gutes Ziel ersetzt keine Rechtsgrundlage – richtig wäre gewesen, die Polizei bzw. eine dafür "
                    "zuständige Stelle mit klarer Rechtsgrundlage ermitteln zu lassen.",
                    fehler=[("P10", "Nur eine Seite dargestellt oder ohne eigenes, begründetes Fazit."),
                            ("P10", "Allgemeine Meinung („Datenschutz ist wichtig“) ohne Bezug zum Fall und zu Grundsätzen.")])),
    ])
    if fassung == "schueler":  # Tabellenzeilen nicht über Seiten teilen (in der Lösung sind Zeilen länger als eine Seite)
        for zeile in tab.rows[1:]:
            _zeile_nicht_teilen(zeile)
    d.abi_ecke("Die Stadt plant, die Ausleihdaten von StadtRad (Kundennummer, Jahrgang, Stadtteil, Start- und Zielstation, "
               "Zeitpunkte) an ein Unternehmen für personalisierte Werbung weiterzugeben. **Beurteilen** Sie dieses "
               "Vorhaben unter Bezug auf zwei Grundsätze des Datenschutzes.", be=4, operator="beurteilen", afb="II/III",
               kompetenzen=["K45", "K44"], linien=4,
               loesung=Loesung(
                   "**Einordnung (1 BE):** Die Daten sind personenbezogen – die Kundennummer ist ein Pseudonym; über "
                   "Jahrgang, Stadtteil und Fahrtmuster (z. B. täglicher Start an derselben Station) sind Personen "
                   "bestimmbar.",
                   "**Zweckbindung (1 BE):** Erhoben wurden die Daten für Ausleihe und Abrechnung; personalisierte Werbung "
                   "ist ein neuer, damit nicht vereinbarer Zweck.",
                   "**Rechtmäßigkeit / Einwilligung bzw. Transparenz (1 BE):** Eine Weitergabe wäre nur mit freiwilliger, "
                   "informierter, ausdrücklicher Einwilligung der Kundschaft zulässig, die jederzeit widerrufen werden kann; "
                   "die Betroffenen müssten vorher erfahren, wer welche Daten wozu erhält.",
                   "**Urteil (1 BE):** In der geplanten Form ist das Vorhaben unzulässig. Vertretbar wäre es nur mit "
                   "Einwilligung (Opt-in) oder mit wirklich anonymen, aggregierten Daten – die für personalisierte Werbung "
                   "aber nicht taugen.",
                   "Auch richtig: Datenminimierung (Zielstation und Zeitpunkte sind für Werbung nicht erforderlich) als "
                   "zweiter Grundsatz.",
                   fehler=[("P10", "Grundsätze nur aufgezählt, kein Urteil – höchstens 2 BE."),
                           ("P10", "„Die Daten sind anonym, weil keine Namen drinstehen“ – Pseudonym ≠ anonym.")]))
    d.spur_im_lab("6.1 „Das Phantom“", "zuerst das **Schlussplädoyer** A6-E1-09 … 14, dann A6-E1-01 … 08 (07/08 als "
                  "Kernpunkte-Aufgaben, Rest als Hausaufgabe) · danach **Verhör 6** · Fitness-App (15 min)",
                  werkzeug="Ermittlungskonsole mit Pinnwand",
                  text="Cold Case im Lab: A6-E1-CC „Wie anonym ist Weserstedt?“ (ohne Punkte).")
    cc1 = "SELECT Jahrgang, Stadtteil, COUNT(*) AS Anzahl\nFROM Einwohner\nGROUP BY Jahrgang, Stadtteil\nHAVING COUNT(*) >= 5"
    cc2 = ("SELECT Stadtteil, COUNT(*) AS Anzahl\nFROM Einwohner\nWHERE Jahrgang BETWEEN 1980 AND 1989\nGROUP BY Stadtteil\n"
           "HAVING COUNT(*) < 5\nORDER BY Anzahl")
    d.cold_case("Mindestgruppengröße", "Schlage eine Regel vor, ab welcher Gruppengröße die Stadt Zahlen aus dem "
                "Einwohnerverzeichnis (gruppiert nach Jahrgang und Stadtteil) veröffentlichen darf. **Prüfe** deine Regel "
                "per SQL an der Tabelle Einwohner – und finde eine Vergröberung, mit der mehr Gruppen groß genug werden.",
                kompetenzen=["K46"], linien=2,
                loesung=Loesung(
                    "Beispielregel: nur Gruppen mit **mindestens 5 Personen** veröffentlichen.",
                    S(cc1), ergebnis(cc1),
                    "Ergebnis: **keine einzige Gruppe** – nach Jahrgang und Stadtteil darf nichts veröffentlicht werden "
                    "(alle 250 Einwohner leben in Gruppen unter 5 Personen; die größte Gruppe hat 4).",
                    "Vergröberung: Jahrzehnt statt Jahrgang (hier die 1980er) – es bleiben trotzdem kleine Gruppen:",
                    S(cc2), ergebnis(cc2),
                    "Also weiter vergröbern (nur Stadtteil, oder Jahrzehnt ohne Stadtteil) oder kleine Gruppen "
                    "zusammenfassen („andere“).",
                    fehler=[("P1", "`WHERE COUNT(*) >= 5` – Bedingungen über Gruppen gehören in HAVING.")]))
    ziel = ORDNER / ("5_Loesungen/DD_A6_AB1_Das_Phantom_LSG.docx" if fassung == "loesung"
                     else "2_Arbeitsblaetter/DD_A6_AB1_Das_Phantom.docx")
    return d.speichern(ziel)


# ================================================================== Unplugged „Steh auf, wenn …“ (Profilkarten)
def _karten_raster(d, karten, spalten, hoehe_cm, fuellen):
    """Schneidekarten im Raster (gestrichelte Rahmen, Zeilen nicht teilen); fuellen(zelle, karte, breite)."""
    breite = d.breite / spalten
    zeilen = (len(karten) + spalten - 1) // spalten
    tab = d.doc.add_table(rows=zeilen, cols=spalten)
    _tabelle_breiten(tab, [breite] * spalten)
    for i in range(zeilen * spalten):
        z = tab.rows[i // spalten].cells[i % spalten]
        _zelle_rahmen(z, "8F8270", 0.75, art="dashed")
        _zelle_innenabstand(z, 0.3, 0.35, 0.3, 0.35)
        z.paragraphs[0].style = d.doc.styles["DD Tabellentext"]
        if i < len(karten):
            fuellen(z, karten[i], breite - 0.7)
    for zeile in tab.rows:
        _zeile_nicht_teilen(zeile)
        zeile.height = Cm(hoehe_cm)
    d._nach_kasten(d.doc)


def _profilkarte(d):
    def fuellen(z, karte, breite):
        nr, (jahrgang, stadtteil, tarif, verein, stand) = karte
        p = z.paragraphs[0]
        d._etikett(p, f"PROFIL {nr:02d}", groesse=8, farbe="B3261E", fett=True)
        for k, v in (("Jahrgang", str(jahrgang)), ("Stadtteil", stadtteil), ("StadtRad-Tarif", tarif), ("Verein", verein),
                     ("Lieblingsstand", stand)):
            q = z.add_paragraph(style="DD Tabellentext")
            q.paragraph_format.space_after = Cm(0.05)
            d._etikett(q, k.upper() + "  ", groesse=6.5)
            d._text(q, f"**{v}**", groesse=10.5)
    return fuellen


def steh_auf(fassung):
    d = AktenDokument("unplugged", 6, "Steh auf, wenn …", fassung=fassung, ds=12, material="Unplugged DS 12a",
                      untertitel="Kopiervorlage · 30 fiktive Profilkarten (Quasi-Identifikatoren) · 7 Minuten")
    d.kopfband(name_datum=False)
    d.notiz("So läuft „Steh auf, wenn …“ (7 Minuten)",
            Liste(["Jede Person zieht verdeckt eine Profilkarte und behält sie für sich. Die Profile sind erfunden – "
                   "**keine** eigenen Daten verwenden.",
                   "Die Lehrkraft nennt nacheinander drei Merkmale. Wer sie alle erfüllt, steht auf (bzw. bleibt stehen).",
                   "Nach jedem Merkmal zählt die Klasse laut: Wie viele stehen noch?",
                   "Zum Schluss: *„Die Person ist nicht genannt – aber eindeutig bestimmt. Was ist ein Quasi-Identifikator?“*"],
                  nummeriert=True),
            "Bei weniger als 30 Personen: Karten so auswählen, dass die Karten mit Jahrgang 1988 auf jeden Fall verteilt "
            "werden (siehe Lösungsfassung).")
    if fassung == "loesung":
        nr_von = {p: n for n, p in zip(PROFIL_NR, PROFILE)}
        r1 = [p for p in PROFILE if p[0] == 1988]
        r2 = [p for p in PROFILE if p[4] == "Fischbrötchen"]
        d.ueberschrift("Ablauf für die Lehrkraft", 2)
        d.tabelle(["Runde", "Ansage", "Es stehen", "Profile"], [
            ["1", "„Alle mit **Jahrgang 1988** stehen auf.“", "7", ", ".join(str(nr_von[p]) for p in r1)],
            ["1", "„… davon nur, wer im **Hafenviertel** wohnt.“", "3",
             ", ".join(str(nr_von[p]) for p in r1 if p[1] == "Hafenviertel")],
            ["1", "„… und den **Tarif Plus** hat.“", "1", f"**{PROFIL_RUNDE1}**"],
            ["2 (optional)", "„Alle, deren **Lieblingsstand das Fischbrötchen** ist.“", "6",
             ", ".join(str(nr_von[p]) for p in r2)],
            ["2", "„… davon nur Mitglieder im **Ruderclub Weser**.“", "2",
             ", ".join(str(nr_von[p]) for p in r2 if p[3] == "Ruderclub Weser")],
            ["2", "„… mit **Tarif Schule**.“", "1", f"**{PROFIL_RUNDE2}**"],
        ], breiten=[2.2, 8.0, 1.8, 5.0], groesse=9)
        einzel = sum(1 for n in GRUPPEN.values() if n == 1)
        d.inhalt("**Impulse:** *„Die Person ist nicht genannt – aber eindeutig bestimmt. Was ist ein Quasi-Identifikator?“* · "
                 "*„Ab welcher Gruppengröße fühlt ihr euch ‚anonym‘?“* · *„Wer von euch wäre schon nach **zwei** Merkmalen "
                 f"allein?“* – In diesem Kartensatz sind {einzel} von 30 Profilen schon durch Jahrgang und Stadtteil "
                 "eindeutig bestimmt.",
                 "**Sicherung (Tafel):** Begriff *Quasi-Identifikator* – Merkmale, die einzeln harmlos sind, zusammen aber "
                 "eine Person bestimmen. „Kleine Gruppen machen Personen erkennbar.“ Brücke zur Akte: Im RadExport steht "
                 "genau eine solche Kombination.",
                 "**Übersicht aller Profile** (Kartennummer → Merkmale):")
        d.tabelle(["Nr.", "Jahrgang", "Stadtteil", "Tarif", "Verein", "Lieblingsstand"],
                  [[str(n)] + [str(x) for x in p] for n, p in sorted(zip(PROFIL_NR, PROFILE))],
                  breiten=[1.2, 1.9, 3.3, 1.8, 4.6, 3.6], groesse=8)
    d.seitenumbruch()
    d.ueberschrift("Profilkarten – entlang der Linien ausschneiden", 2)
    karten = sorted(zip(PROFIL_NR, PROFILE))
    fuellen = _profilkarte(d)
    for start in range(0, 30, 12):
        if start:
            d.seitenumbruch()
        _karten_raster(d, karten[start:start + 12], 3, 5.3, fuellen)
    name = ("5_Loesungen/DD_A6_Unplugged_Steh_auf_wenn_LSG.docx" if fassung == "loesung"
            else "3_Unplugged/DD_A6_Unplugged_Steh_auf_wenn.docx")
    return d.speichern(ORDNER / name)


# ================================================================== Unplugged Rollenkarten-Debatte
def _rollenkarte(d, rolle, lk):
    tab, z = d._kasten(d.doc, d.breite, rand="B3261E", staerke=1.5, flaeche="FBF7EE", nicht_teilen=True)
    d._kastenkopf(z, f"ROLLENKARTE {rolle['nr']}", f"{rolle['rolle']} · {rolle['person']}", farbe="B3261E")
    lage = rolle.get("lage_lk") if lk and rolle.get("lage_lk") else rolle["lage"]
    inhalt = [f"**Ausgangslage:** {lage}"]
    if rolle["nr"] == 3 and not lk:
        inhalt.append("**Nach dem Schlussplädoyer eintragen:** Name ______________________   früherer Beruf "
                      "______________________")
    inhalt += [f"**Eure Position:** *{rolle['position']}*",
               f"**Leitfrage an eure Rolle:** {rolle['leitfrage']}",
               "**Auftrag (6 Minuten):** Lest die vier Argumentkarten, wählt die stärksten aus und ergänzt mindestens ein "
               "eigenes Argument. Verwendet mindestens **zwei** Grundsätze (Zweckbindung, Datenminimierung, "
               "Rechtsgrundlage, Transparenz, Speicherbegrenzung). Bestimmt eine Sprecherin oder einen Sprecher."]
    d._fuelle(z, inhalt, d.breite - 0.6)
    d._nach_kasten(d.doc)
    argumente = list(rolle["argumente"])
    if lk:
        for i, a in rolle.get("argumente_lk", {}).items():
            argumente[i] = a

    def fuellen(zelle, karte, breite):
        i, (grundsatz, text) = karte
        p = zelle.paragraphs[0]
        d._etikett(p, f"ARGUMENT {rolle['nr']}.{i} · {grundsatz.upper()}", groesse=7.5, farbe="7A5E1F", fett=True)
        q = zelle.add_paragraph(style="DD Tabellentext")
        d._text(q, text, groesse=13)

    _karten_raster(d, list(enumerate(argumente, 1)), 2, 6.0, fuellen)


def debatte(fassung):
    lk = fassung == "loesung"
    d = AktenDokument("unplugged", 6, "Durfte die Detektei das?", fassung=fassung, ds=12, material="Unplugged DS 12b",
                      untertitel="Kopiervorlage · Rollenkarten-Debatte · 5 Rollenkarten, je 4 Argumentkarten, "
                                 "Beobachtungsbogen · 25 Minuten")
    d.kopfband(name_datum=False)
    d.notiz("So läuft die Debatte (25 Minuten)",
            Liste(["**Vorbereitung (6'):** Rollengruppen zu 4–6 Personen. Jede Gruppe erhält eine Rollenkarte und vier "
                   "Argumentkarten und verwendet mindestens zwei DSGVO-Grundsätze.",
                   "**Talkrunde (12'):** Je eine Sprecherin oder ein Sprecher pro Rolle, die Lehrkraft moderiert. Die übrigen "
                   "füllen den Beobachtungsbogen aus und dürfen ihrer Sprecherin bzw. ihrem Sprecher Zettel reichen.",
                   "**Rollen ablegen (4'):** Persönliche Abstimmung per Handzeichen, danach zwei Begründungen aus dem Plenum.",
                   "**Sicherung (3'):** Kriterien für ein begründetes Urteil festhalten."], nummeriert=True),
            "Die rechtlichen Aussagen auf den Karten sind didaktisch vereinfacht. Die Debatte hat kein „richtiges“ Ende.")
    d.ueberschrift("Leitfragen der Moderation", 2)
    d.inhalt(Liste(["*„Welcher Zweck rechtfertigt das Zusammenführen?“*",
                    "*„Was hätte die Stadt nie veröffentlichen dürfen?“*",
                    "*„Wer trägt die Verantwortung – wer veröffentlicht oder wer verknüpft?“*"]))
    d.notiz("Ein begründetes Urteil in vier Schritten",
            Liste(["**Grundsatz:** Welcher Grundsatz ist betroffen? (z. B. Zweckbindung)",
                   "**Sachverhalt:** Was genau ist passiert? (Rad-Daten für eine Fahndung genutzt)",
                   "**Abwägung:** Was spricht dafür, was dagegen? (Aufklärung gegen Rechte Unbeteiligter)",
                   "**Urteil:** Klare Aussage mit „weil“. (unzulässig, weil keine Rechtsgrundlage für den neuen Zweck …)"],
                  nummeriert=True))
    d.ueberschrift("Beobachtungsbogen", 2)
    d.tabelle(["Rolle", "stärkstes Argument (mit Grundsatz)", "schwächste Stelle"],
              [[f"{r['nr']} · {r['rolle']}", "", ""] for r in ROLLEN] + [["mein Urteil", "", ""]],
              breiten=[5.0, 6.8, 5.4], groesse=9.5)
    for zeile in d.doc.tables[-1].rows[1:]:
        zeile.height = Cm(1.5)
    if lk:
        d.ueberschrift("Hinweise für die Moderation", 2)
        d.inhalt(Liste([
            "Die Debatte folgt direkt auf die Enttarnung im Schlussplädoyer. Rollenkarte 3 dieser Lösungsfassung nennt Name "
            "und früheren Beruf des Phantoms; in der Schülerfassung tragen die Schülerinnen und Schüler beides nach der "
            "Auflösung selbst ein.",
            "Erwartbare Kernargumente: **Zweckbindung** (Fahndung ist ein neuer Zweck), **Rechtsgrundlage** (private "
            "Detektei, keine Einwilligung), **pseudonym ≠ anonym** (Weitergabe personenbezogener Daten), **Transparenz** "
            "(niemand wusste davon), **Datenminimierung/Speicherbegrenzung** (nächtliche Adress-Check-ins über Monate), "
            "**Datensicherheit** (nie gesperrter Zugang).",
            "Wenn die Runde in Meinungen abdriftet: auf die Pflicht-Grundsätze der Argumentkarten verweisen und das "
            "Vier-Schritte-Schema einfordern (Grundsatz – Sachverhalt – Abwägung – Urteil).",
            "Mögliche begründete Urteile: (1) Die Weitergabe an die Detektei war unzulässig, weil es für den neuen Zweck "
            "keine Rechtsgrundlage gab – zuständig wäre die Polizei. (2) Die Detektei durfte nicht, hat aber das Risiko "
            "sichtbar gemacht; die Hauptverantwortung liegt bei der Stadt, die zu viele Daten zu lange speichert. (3) Das "
            "Phantom hat Unrecht getan, um auf Unrecht hinzuweisen – das rechtfertigt die Taten nicht.",
            "Rollenkarte 4 (Bürgerin) ist für Zurückhaltende gut geeignet; schnelle Schülerinnen und Schüler übernehmen "
            "die Moderation oder die Rolle der Behörde."]))
    for rolle in ROLLEN:
        d.seitenumbruch()
        d.ueberschrift(f"Rolle {rolle['nr']} – {rolle['rolle']}", 2)
        _rollenkarte(d, rolle, lk)
    name = ("5_Loesungen/DD_A6_Unplugged_Rollenkarten-Debatte_LSG.docx" if lk
            else "3_Unplugged/DD_A6_Unplugged_Rollenkarten-Debatte.docx")
    return d.speichern(ORDNER / name)


# ================================================================== Präsentation
FOLIEN = {}


def praesentation():
    p = AktenPraesentation(6, "Datenspuren", datenbank=DB)
    p.titelfolie("Datenspuren", "Akte 6 · DS 12 „Das Phantom“ · Schlussplädoyer und Debatte",
                 notizen="Finale der Einheit. Pinnwand zeigen: Steckbrief mit Nachtfalter, „Nora Falter“, Jahrgang 1988, "
                         "Hafenviertel, Tischtennis beim TuS, an allen Tatorten. Warm-up vorher (10 min): eA W-A5-09…12, "
                         "gA W-A4-05…08.")
    s = p._nr + 1
    p.briefing("DS 12 · Das Phantom",
               "Nora Falter existiert nicht – sie ist ein Tarnname. Bürgermeisterin Annegret Vollmers hat uns deshalb "
               "Datenexporte der Stadt überlassen: StadtRad-Fahrten, Kartenzahlungen vom Stadtfest, einen Export der "
               "TuS-Mitgliederliste, Check-ins der WeserApp und einen Auszug aus dem Einwohnerverzeichnis. In den Exporten "
               "stehen keine Namen, nur Kürzel – man nennt das pseudonym. Aber es stehen Jahrgang, Stadtteil, Tarif und "
               "Uhrzeiten darin, und solche Angaben können zusammen einen Menschen genauso verraten wie ein Name: Man nennt "
               "sie Quasi-Identifikatoren. Heute verknüpft ihr diese Spuren im Schlussplädoyer. Danach reden wir darüber, "
               "was wir da eigentlich getan haben – und diese Frage wird unbequemer als jede Abfrage.",
               notizen="Briefing STORY 5.12b (leicht gekürzt). gA-Kurse (ohne Akte 5) vor dem ersten Satz ergänzen: „Unsere "
                       "Fall-Datenbank zeigt: Nur eine Person ist in allen vier Fällen verdächtig – Nora Falter.“")
    p.inhaltsfolie("Die Exporte der Stadt",
                   "Fünf Tabellen, **keine Fremdschlüssel** – verbunden wird nur über gleiche Werte:",
                   *[Schema(x) for x in SCHEMA],
                   "Gleiche Werte: Jahrgang = Geburtsjahr · Stadtteil · StartStation = Ort · Start = Zeitpunkt · Ort = Strasse",
                   notizen="Die Exporte stammen von verschiedenen Stellen. Kein Bauplan sieht eine Verbindung vor – die "
                           "Verknüpfung entsteht erst durch die Abfrage. Tokens: R- (Rad), K- (Karte), V- (Verein), WA- "
                           "(WeserApp). FestZahlung.StandNr 4 = Kaffeemobil.")
    p.unplugged("Steh auf, wenn …",
                ["Zieht verdeckt eine Profilkarte – die Profile sind erfunden.",
                 "Ich nenne drei Merkmale. Wer alle erfüllt, steht auf bzw. bleibt stehen.",
                 "Nach jedem Merkmal zählen wir: Wie viele stehen noch?",
                 "Niemand hat einen Namen genannt. Wurdet ihr trotzdem erkannt?"],
                material="30 Profilkarten", dauer="7 MIN",
                notizen="Kopiervorlage DD_A6_Unplugged_Steh_auf_wenn. Ansagen: „Alle mit Jahrgang 1988“ (7) → „… nur "
                        "Hafenviertel“ (3) → „… mit Tarif Plus“ (1, Profil 17). Optional Runde 2: Fischbrötchen (6) → "
                        "Ruderclub Weser (2) → Tarif Schule (1, Profil 25). Impulse: Was ist ein Quasi-Identifikator? Ab "
                        "welcher Gruppengröße fühlt ihr euch anonym?")
    p.begriffe("Pseudonym ist nicht anonym", [
        ("personenbezogen", "Person bestimmt oder bestimmbar (Name, Adresse, Kundennummer)"),
        ("pseudonym", "Kennzeichen statt Name – mit Zusatzwissen zuordenbar"),
        ("anonym", "keine Person mehr bestimmbar (z. B. Summe je Stadtteil)"),
        ("Quasi-Identifikator", "einzeln harmlos, zusammen eindeutig (Jahrgang, Stadtteil)"),
        ("Re-Identifizierung", "Person aus „anonymen“ Daten wiedererkennen"),
    ], notizen="Begriffe aus dem Unplugged entwickeln. Wichtig: Pseudonyme Daten bleiben personenbezogen – die DSGVO gilt "
               "für sie. Nur wirklich anonyme Daten fallen heraus.")
    sql_g = "SELECT Stadtteil, COUNT(*) AS Einwohner\nFROM Einwohner\nWHERE Jahrgang = 1988\nGROUP BY Stadtteil"
    p.beispiel_schritte("Beispiel: Wie klein ist die Gruppe?", sql_g,
                        ["**FROM/WHERE** – alle 250 Einwohner, davon nur Jahrgang 1988",
                         "**GROUP BY Stadtteil** – je Stadtteil eine Gruppe",
                         "**COUNT(*)** – Personen je Gruppe",
                         "In Mühlenfeld ist die Gruppe **eine Person**: Jahrgang + Stadtteil wirken wie ein Name"],
                        ergebnis=ergebnis(sql_g),
                        notizen="Live in der Konsole (/konsole/datenspuren). Wie im Unplugged: Mit zwei Merkmalen bleiben im "
                                "Hafenviertel drei, in Mühlenfeld eine Person.")
    sql_v = ("SELECT DISTINCT r.KundenToken, v.MitgliedToken\nFROM RadExport r, VereinExport v\n"
             "WHERE r.Jahrgang = v.Geburtsjahr\n  AND r.Stadtteil = v.Stadtteil\n  AND v.Abteilung = 'Tennis'")
    p.beispiel_schritte("Beispiel: Exporte verknüpfen", sql_v,
                        ["Kein gemeinsamer Schlüssel – Verbund über **gleiche Werte** (Jahrgang = Geburtsjahr, Stadtteil)",
                         "**Stadtteil** gibt es in beiden Tabellen → Alias davor (P7)",
                         "Ohne **DISTINCT**: 7 Zeilen – eine je Fahrt (P2)",
                         "Ergebnis: **Kandidaten**, kein Beweis – Rad-Kunde und Vereinsmitglied *könnten* dieselbe Person sein"],
                        ergebnis=ergebnis(sql_v),
                        notizen="Verbund über Nicht-Schlüssel-Attribute vervielfacht Zeilen; hier ist das gewollt (Kandidaten"
                                "menge), aber COUNT danach vorsichtig deuten. Im Lab dazu A6-E1-05/06.")
    p.inhaltsfolie("Das Schlussplädoyer – sechs Spuren",
                   Liste([s[1].split(":")[0] + ": " + s[2] for s in SPUREN], nummeriert=False),
                   notizen="Jedes Ergebnis wird ein Indiz an der Pinnwand; spätere Spuren dürfen frühere Ergebnisse als Wert "
                           "benutzen (ersetzt Unterabfragen). Ablauf in der Ermittlungskonsole: Nach Spur 6 erscheinen Auflösung und Überleitung. Wer festhängt: "
                           "Tipps nutzen (gestuft). Spur 1: Klammern bzw. ein BETWEEN über den ganzen Zeitraum; Spur 2: "
                           "DISTINCT; Spur 6: DISTINCT und Jahrgangsbedingung.")
    p.lab_auftrag("6.1", "Das Phantom", "Schlussplädoyer A6-E1-09 … 14, dann A6-E1-01 … 06 (07/08 als Hausaufgabe)",
                  werkzeug="Ermittlungskonsole mit Pinnwand",
                  hinweise=["Erst das Schlussplädoyer – die Debatte startet nach der Enttarnung.",
                            "Stadtteil steht in mehreren Exporten: Tabellenname oder Alias davor.",
                            "AB 6.1 Auftrag 3: jedes Indiz notieren."],
                  notizen="35 Minuten statt 45 (Abweichung vom Standardtakt zugunsten der Debatte). Herumgehen: P6 (Klammern "
                          "um OR), P4 (Fahrten statt Menschen), P2 (DISTINCT). Langsame: Schlussplädoyer mit Tipps; 01–06 "
                          "können als Hausaufgabe folgen.")
    loes = [f"**Spur {i}:** " + nur for i, nur in enumerate([
        "R-7F3A – fünf Nachtfahrten, 1988 · Hafenviertel · Plus",
        "nur dieses eine Token hat alle drei Merkmale",
        "Gerät WA-3917 bei allen fünf Fahrten (WA-5530 nur zweimal)",
        "Festplatz 21:52/23:06 · Fundbüro 14.09. 10:17 · dienstags TuS · nachts Kranstraße 7",
        "V-2571 – Tischtennis, 1988, Hafenviertel",
        "Kranstraße 7, Jahrgang 1988: **Merle Falkenrath**"], 1)]
    p.loesungsfolie("Indizienkette des Schlussplädoyers", *loes,
                    notizen="Gegenprobe Spur 4: Am Kaffeemobil (StandNr 4) gibt es am 29.08. zwischen 22:00 und 22:59 keine "
                            "einzige Kartenzahlung (21 Uhr: 5, 23 Uhr: 4). Stufe 6a: drei Kandidaten mit 1988/Hafenviertel – "
                            "Ole Brakhage, Merle Falkenrath, Tamara Leversen.")
    p.inhaltsfolie("Auflösung (1/2)",
                   "Die Indizienkette ist geschlossen: Hinter Nora Falter steht **Merle Falkenrath**, Jahrgang 1988, wohnhaft "
                   "im Hafenviertel, Tischtennisspielerin beim TuS – und bis 2025 **Datenschutzbeauftragte der Stadt "
                   "Weserstedt**. In der Rohliste des TuS stand sie nur ein paar Zeilen unter ihrem Tarnnamen.",
                   "Am Morgen nach der Enttarnung liegt im Fundbüro ein brauner Umschlag mit Nachtfalter: der Messing-Kompass, "
                   "312,50 € „für die Festkasse“, ein Beleg über die nachgezahlten Vereinsbeiträge und der Schlüssel zu "
                   "Schuppen 4 – dort stehen die fünf Lastenräder unbeschädigt.",
                   nur_lehrkraft=True,
                   notizen="STORY 7.1 vorlesen (erscheint im Lab nach Spur 6). Nicht als Triumph inszenieren – die Wendung "
                           "kommt auf der nächsten Folie.")
    p.inhaltsfolie("Auflösung (2/2)",
                   "Dazu ein Brief: Jahrelang hatte sie gewarnt, dass die Stadt zu viele Daten zu lange speichert, dass "
                   "„pseudonym“ nicht „anonym“ heißt und dass ihr alter Verwaltungszugang nie gesperrt wurde. Ihr Gutachten "
                   "verschwand in einer Schublade – also hat sie gezeigt, was sie meinte. Jede Spur war eine absichtlich "
                   "gelegte Datenpanne; am Ende sollte jemand die Daten verknüpfen und sie finden. **Dieser Jemand waren wir.**",
                   "*„Sie hat Unrecht getan, um auf Unrecht hinzuweisen – und wir haben genau das getan, wovor sie gewarnt "
                   "hat.“* (Edda Lorenz)",
                   nur_lehrkraft=True,
                   notizen="Merle Falkenrath hat sich bei der Stadt gemeldet; was aus ihren Taten folgt, entscheiden andere, "
                           "nicht die Detektei. Sie wird weder als Bösewicht noch als Heldin dargestellt.")
    p.inhaltsfolie("Durfte die Detektei das?",
                   "Daten, die für Fahrradverleih, Festabrechnung, Vereinsverwaltung und eine Stadt-App erhoben wurden, haben "
                   "wir für eine Fahndung zusammengeführt – als private Detektei, ohne dass jemand in Weserstedt davon wusste.",
                   "Zwei Unbeteiligte standen auf unserer Kandidatenliste – nur weil sie 1988 geboren sind und im "
                   "Hafenviertel wohnen.",
                   "**Durfte die Detektei das? Was hätte die Stadt nie speichern, nie weitergeben dürfen – und was hätte sie "
                   "technisch anders machen müssen?**",
                   notizen="Überleitung STORY 7.2 (die beiden Unbeteiligten heißen Tamara Leversen und Ole Brakhage – Tamara "
                           "sitzt gleich als Bürgerin in der Talkrunde). Danach Rollen verteilen.")
    p.unplugged("Rollenkarten-Debatte",
                ["Fünf Rollengruppen: Stadt · Detektei · Phantom · Bürgerin · Datenschutzbehörde (6 min vorbereiten).",
                 "Jede Gruppe nutzt mindestens **zwei** DSGVO-Grundsätze.",
                 "Talkrunde mit je einer Sprecherin bzw. einem Sprecher (12 min), die anderen beobachten.",
                 "Rollen ablegen: persönliche Abstimmung, zwei Begründungen (4 min).",
                 "Sicherung: Grundsatz – Sachverhalt – Abwägung – Urteil (3 min)."],
                material="Rollen- und Argumentkarten", dauer="25 MIN",
                notizen="Kopiervorlage DD_A6_Unplugged_Rollenkarten-Debatte (Schülerfassung: Rollenkarte 3 ohne Namen – "
                        "nach der Auflösung eintragen; Lösungsfassung mit vollständiger Karte). Leitfragen: „Welcher Zweck "
                        "rechtfertigt das Zusammenführen?“ – „Was hätte die Stadt nie veröffentlichen dürfen?“ – „Wer trägt "
                        "die Verantwortung – wer veröffentlicht oder wer verknüpft?“ Tische vorher umstellen.")
    s_debatte = p._nr
    p.begriffe("DSGVO-Grundsätze", [
        ("Rechtmäßigkeit", "Rechtsgrundlage nötig, z. B. Einwilligung (widerrufbar)"),
        ("Zweckbindung", "nur für den Zweck, für den erhoben wurde"),
        ("Datenminimierung", "nur so viele Daten wie nötig"),
        ("Transparenz", "Betroffene wissen, wer was wozu verarbeitet"),
        ("Speicherbegrenzung", "löschen, sobald der Zweck erfüllt ist"),
        ("besondere Kategorien", "z. B. Gesundheitsdaten – besonders geschützt"),
    ], notizen="Grundlage: informationelle Selbstbestimmung – jede Person entscheidet grundsätzlich selbst über Preisgabe "
               "und Verwendung ihrer Daten. Weserstedt-Beispiele aus der Debatte zuordnen lassen (Tafelbild).")
    p.inhaltsfolie("Datenschutz oder Datensicherheit?",
                   Tabelle(["", "Datenschutz", "Datensicherheit"], [
                       ["schützt", "Personen und ihre Rechte", "die Daten (vertraulich, unverfälscht, verfügbar)"],
                       ["fragt", "Dürfen wir das?", "Ist es sicher?"],
                       ["Beispiele", "Zweckbindung, Einwilligung, Löschfristen", "Verschlüsselung, Zugriffsrechte, Backups"],
                   ], breiten=[3.6, 11.0, 13.6]),
                   "**Maßnahmen:** Aggregation · Mindestgruppengröße (keine Gruppen unter 5) · Vergröberung (Jahrzehnt statt "
                   "Jahrgang) · wechselnde Pseudonyme · Zugriffsrechte · Verschlüsselung · Löschfristen",
                   notizen="Typische Verwechslung: „Verschlüsselung ist Datenschutz“ – sie ist ein Mittel der Datensicherheit, "
                           "die dem Datenschutz dient. Der nie gesperrte Zugang des Phantoms war ein Datensicherheitsproblem.")
    sql_k = ("SELECT Jahrgang, Stadtteil, COUNT(*) AS Anzahl\nFROM Einwohner\nGROUP BY Jahrgang, Stadtteil\n"
             "HAVING COUNT(*) < 3\nORDER BY Anzahl, Jahrgang, Stadtteil")
    p.beispiel_schritte("Beispiel: Kleine Gruppen finden", sql_k,
                        ["**GROUP BY** – je Kombination aus Jahrgang und Stadtteil eine Gruppe",
                         "**HAVING COUNT(*) < 3** – nur kleine Gruppen (Bedingung über Gruppen → HAVING, P1)",
                         "**ORDER BY Anzahl** – die kleinsten zuerst",
                         "180 Gruppen – jede ist ein Risiko: Wer Jahrgang und Stadtteil kennt, findet die Person fast sicher"],
                        ergebnis=ergebnis(sql_k, max_zeilen=4),
                        notizen="Tafelbild-Abfrage (DS_PLANUNG). Ermittler-Notiz: Jede Gruppe in diesem Ergebnis ist ein "
                                "Risiko. Bezug Cold Case AB 6.1: Mit „mindestens 5“ dürfte die Stadt nach Jahrgang und "
                                "Stadtteil gar nichts veröffentlichen.")
    p.merkfolie("Ermittler-Notiz: Datenspuren", [
        "Informationelle Selbstbestimmung: Jede Person entscheidet grundsätzlich selbst über ihre Daten.",
        "Pseudonym ≠ anonym: Quasi-Identifikatoren lassen sich verknüpfen – kleine Gruppen machen Personen erkennbar.",
        "Datenschutz schützt Personen, Datensicherheit schützt Daten.",
        "Beurteilen = Grundsatz – Sachverhalt – Abwägung – Urteil (mit „weil“).",
    ], notizen="Merkkasten ins Heft. Pinnwand komplett: Steckbrief (nächste Folie nur für die Lehrkraft).")
    p.abi_format("Die Stadt plant, die Ausleihdaten von StadtRad (Kundennummer, Jahrgang, Stadtteil, Start- und Zielstation, "
                 "Zeitpunkte) an ein Unternehmen für personalisierte Werbung weiterzugeben. **Beurteilen** Sie dieses "
                 "Vorhaben unter Bezug auf zwei Grundsätze des Datenschutzes.", be=4, operator="beurteilen",
                 notizen="Drei Minuten Einzelarbeit (AB 6.1 Abi-Ecke), dann eine Antwort mit und eine ohne Urteil vergleichen "
                         "(P10).")
    p.loesungsfolie("Lösung Abi-Format: beurteilen",
                    "**1 BE** Einordnung: pseudonym, aber personenbezogen (Jahrgang, Stadtteil, Fahrtmuster).",
                    "**1 BE** Zweckbindung: erhoben für Ausleihe/Abrechnung – Werbung ist ein neuer Zweck.",
                    "**1 BE** Einwilligung/Transparenz: nur mit freiwilliger, informierter, widerrufbarer Einwilligung.",
                    "**1 BE** Urteil: so unzulässig; allenfalls mit Opt-in oder nur anonym aggregiert.",
                    "Typischer Fehler P10: Grundsätze aufgezählt, kein Urteil → höchstens 2 BE.",
                    notizen="Auch richtig: Datenminimierung als zweiter Grundsatz (Zielstation und Zeitpunkte sind für "
                            "Werbung nicht erforderlich).")
    p.inhaltsfolie("Fallbesprechung",
                   "Edda legt den fertigen Steckbrief auf den Tisch, daneben eure Ausweise:",
                   "*„Der Fall ist gelöst – jetzt will ich sehen, ob ihr auch Fälle lösen könnt, die ihr noch nicht kennt.“*",
                   "**Verhör 6** · Fitness-App (15 min) ist freigeschaltet · Warm-up-Karten W-A6 und W-A7 als Vorbereitung auf "
                   "die Generalprobe (DS 13).",
                   notizen="Abschluss STORY 5.12c. Verhör 6 im Kurs auf „auto“/„offen“ stellen. Ausblick: DS 13 Generalprobe im "
                           "Abitur-Format (eA 30 BE, gA 25 BE).")
    p.inhaltsfolie("Beweisstück 6 – Steckbrief",
                   "**Name:** Merle Falkenrath · Jahrgang 1988 · Hafenviertel (Kranstraße 7) · Tischtennis beim TuS",
                   "**Beruf:** bis 2025 Datenschutzbeauftragte der Stadt Weserstedt",
                   "**Motiv:** zeigen, wie gläsern die Stadt ihre Bürgerinnen und Bürger macht",
                   "Eddas Notiz am Rand: *„Und was sagt das über uns?“*",
                   nur_lehrkraft=True,
                   notizen="Polaroid des vollständigen Steckbriefs (STORY 4.6). Erst nach der Enttarnung zeigen – fehlt im "
                           "Handout.")
    FOLIEN["DS 12"] = (s, p._nr)
    FOLIEN["Debatte"] = s_debatte
    p.speichern(ORDNER / "1_Praesentation" / "DD_A6_Datenspuren.pptx")


# ================================================================== Lehrerhinweise
def lehrerhinweise():
    f = FOLIEN.get("DS 12", (2, 24))
    fd = FOLIEN.get("Debatte", 15)
    d = AktenDokument("lehrerhinweise", 6, "Lehrerhinweise Akte 6", fassung="lehrkraft", material="Lehrerhinweise A6",
                      datenbank=DB, untertitel="Datenspuren · DS 12 · Datenschutz, Quasi-Identifikatoren, Schlussplädoyer, "
                                               "Debatte")
    d.kopfband()
    d.ueberschrift("Überblick", 1)
    d.tabelle(["DS", "Thema", "Lab", "Warm-up", "Abi-Bezug"], [
        ["12", "Das Phantom – pseudonyme Exporte per Verbund und GROUP BY/HAVING verknüpfen, Quasi-Identifikatoren, "
               "DSGVO-Grundsätze, Datenschutz vs. Datensicherheit, Erörterung (K44, K45, K46, K24, K26; Übung K27, K18)",
         "Schlussplädoyer A6-E1-09…14, A6-E1-01…08, Cold Case A6-E1-CC; Verhör 6 · Fitness-App (15')",
         "eA: W-A5-09…12 · gA: W-A4-05…08; W-A6 als Vorbereitung auf DS 13",
         "Datenschutz G22, G23 und KC-Pflicht (IK4.1/IK4.2); Operator „beurteilen“ verlangt ein Urteil (P10)"],
    ], breiten=[0.9, 5.8, 3.9, 2.6, 3.8], groesse=8.5)
    d.inhalt(f"**Material:** Präsentation `DD_A6_Datenspuren.pptx` (Folien {f[0]}–{f[1]}; Folien mit „[NUR LEHRKRAFT]“ – "
             "Indizienkette, Auflösung, Steckbrief, Lösung Abi-Format – fehlen im Handout) · AB 6.1 mit Lösung · Kopiervorlagen "
             "„Steh auf, wenn …“ (30 Profilkarten) und Rollenkarten-Debatte (5 Rollen, je 4 Argumentkarten, "
             "Beobachtungsbogen), jeweils mit Lösungsfassung · Warm-up-Karten A6 · Datenbank `datenspuren` (fünf Exporte "
             "ohne Fremdschlüssel).",
             "**Grundkurs (gA):** DS 12 ist im gA-Pfad die 9. Doppelstunde (direkt nach Akte 4). Alle Aufgaben sind gA/eA; "
             "Warm-up mit W-A4-05…08 statt W-A5-09…12; im Briefing vor dem ersten Satz: „Unsere Fall-Datenbank zeigt: Nur eine "
             "Person ist in allen vier Fällen verdächtig – Nora Falter.“")
    d.notiz("Story-Faden und Auflösung (nicht vorwegnehmen)",
            "Bürgermeisterin Annegret Vollmers überlässt der Detektei pseudonyme Exporte. Das Schlussplädoyer führt über das "
            "Token **R-7F3A** (fünf Nachtfahrten), das Gerät **WA-3917** (WeserApp), das Vereinsmitglied **V-2571** und die "
            "nächtliche Adresse **Kranstraße 7** zu **Merle Falkenrath** (Jahrgang 1988, Hafenviertel, Tischtennis, bis "
            "2025 Datenschutzbeauftragte der Stadt). Zwei Unbeteiligte – Tamara Leversen und Ole Brakhage – standen kurz auf "
            "der Kandidatenliste. Wendung: Die Detektei hat genau das getan, was das Phantom anprangert. Name und Beruf "
            "stehen nur in Lehrkraftmaterial, im Lab erst nach Spur 6.")

    d.ueberschrift("DS 12 · Ermittlung 6.1 „Das Phantom“", 1)
    d.ueberschrift("Ziele", 2)
    d.inhalt(Liste([
        "**verknüpfen** pseudonyme Datenbestände per Verbund über Quasi-Identifikatoren und GROUP BY/HAVING und "
        "**erläutern**, wie kleine Gruppen eine Person erkennbar machen.",
        "**erläutern** das Recht auf informationelle Selbstbestimmung und die DSGVO-Grundsätze (Rechtmäßigkeit/Einwilligung, "
        "Zweckbindung, Datenminimierung, Transparenz, Speicherbegrenzung) sowie besondere Kategorien personenbezogener Daten.",
        "**beurteilen** konkrete Datennutzungen (z. B. Werbung, Weitergabe) anhand der Grundsätze und ihrer Voraussetzungen.",
        "**unterscheiden** Datenschutz und Datensicherheit, **erörtern** Chancen und Risiken automatisierter Datenanalyse "
        "und **nennen** technische Schutzmaßnahmen (Pseudonymisierung, Aggregation, Mindestgruppengröße, Zugriffsrechte, "
        "Verschlüsselung)."], nummeriert=True))
    d.ueberschrift("Verlauf", 2)
    d.tabelle(["Phase", "Zeit", "Inhalt / Ablauf", "Sozialform", "Material"], [
        ["Warm-up", "0–10'", "eA: W-A5-09…12 (Überführung, Schema → ER, Verbund einer Tabelle mit sich selbst) · gA: W-A4-05…08 (Schlüssel, Zerlegung, "
                             "zusammengelegte Tabelle)", "EA → Team", "Warm-up-Karten A5 bzw. A4"],
        ["Briefing + Unplugged", "10–20'", "Finale (STORY 5.12): „Nora Falter“ ist ein Tarnname; Exporte der Stadt. "
                                           "„Steh auf, wenn …“, Impuls: „Niemand hat euren Namen genannt. Wurdet ihr "
                                           "trotzdem erkannt?“ Begriffe pseudonym/anonym, Quasi-Identifikator",
         "Plenum", f"Folien {f[0]}–{f[0] + 6}, Profilkarten"],
        ["Lab-Einsatz", "20–55'", "**Schlussplädoyer** A6-E1-09…14 (Indizienkette → Enttarnung), dann A6-E1-01…06; 07/08 "
                                  "(Kernpunkte) und Rest als Hausaufgabe. AB 6.1 Auftrag 3 parallel", "EA",
         "iPad/Laptop, AB 6.1"],
        ["Debatte", "55–80'", "Auflösung, Überleitung, **Rollenkarten-Debatte „Durfte die Detektei das?“** (siehe unten)",
         "Rollengruppen, Plenum", f"Folien {fd - 4}–{fd}, Rollen- und Argumentkarten"],
        ["Fallbesprechung", "80–90'", "Merkkasten DSGVO-Grundsätze + Datenschutz vs. Datensicherheit + Maßnahmen; Abi-Format "
                                      "(4 BE) beurteilen; Steckbrief komplett; Hinweis Verhör 6 und Warm-up-Hausaufgabe vor "
                                      "der Generalprobe", "UG", f"Folien {fd + 1}–{f[1]}"],
    ], breiten=[2.8, 1.2, 7.0, 2.3, 3.6], groesse=8.5)
    d.inhalt("*Abweichung vom Standardtakt:* Lab 35' statt 45', dafür Debatte 25' (Erörterung KC IK4.1/IK4.2).")

    d.ueberschrift("Unplugged 1: „Steh auf, wenn …“ (7 min)", 2)
    d.inhalt(Liste([
        f"30 fiktive Profilkarten (Jahrgang, Stadtteil, Tarif, Verein, Lieblingsstand; **keine** echten Schülerdaten). Bei "
        "weniger als 30 Personen die Karten mit Jahrgang 1988 auf jeden Fall verteilen.",
        f"Ansagen: „Alle mit Jahrgang 1988 stehen auf.“ (7) → „… davon nur Hafenviertel.“ (3) → „… und Tarif Plus.“ (1 – "
        f"Profil {PROFIL_RUNDE1}). Optional Runde 2: Fischbrötchen (6) → Ruderclub Weser (2) → Tarif Schule (1 – Profil "
        f"{PROFIL_RUNDE2}).",
        "Impulse: *„Die Person ist nicht genannt – aber eindeutig bestimmt. Was ist ein Quasi-Identifikator?“* – *„Ab welcher "
        "Gruppengröße fühlt ihr euch ‚anonym‘?“*",
        "Sicherung: Begriff Quasi-Identifikator, „kleine Gruppen machen Personen erkennbar“ an die Tafel."], nummeriert=True))
    d.ueberschrift("Unplugged 2: Rollenkarten-Debatte „Durfte die Detektei das?“ (25 min)", 2)
    d.inhalt(Liste([
        "Rollen nach STORY 8: **Stadt Weserstedt** (Bürgermeisterin Annegret Vollmers), **Datendetektei** (Edda Lorenz), "
        "**das Phantom** (Merle Falkenrath), **Bürgerin** (Tamara Leversen, Hafenviertel, Jahrgang 1988), "
        "**Landesdatenschutzbehörde** (Referent Mats Oltmanns). Je Rolle 4 Argumentkarten mit DSGVO-Bezug.",
        "**Vorbereitung (6'):** Rollengruppen (je 4–6) sammeln Argumente; jede Gruppe verwendet mindestens zwei Grundsätze "
        "(Zweckbindung, Datenminimierung, Rechtsgrundlage, Transparenz, Speicherbegrenzung).",
        "**Talkrunde (12'):** je eine Sprecherin bzw. ein Sprecher pro Rolle, Lehrkraft moderiert. Leitfragen: *„Welcher "
        "Zweck rechtfertigt das Zusammenführen?“* – *„Was hätte die Stadt nie veröffentlichen dürfen?“* – *„Wer trägt die "
        "Verantwortung – wer veröffentlicht oder wer verknüpft?“*",
        "**Rollen ablegen (4'):** persönliche Abstimmung per Handzeichen, zwei Begründungen aus dem Plenum.",
        "**Sicherung (3'):** Kriterien für ein begründetes Urteil (Grundsatz – Sachverhalt – Abwägung – Urteil) festhalten.",
        "Kopiervorlage: Die **Schülerfassung** nennt Name und Beruf des Phantoms nicht (Feld zum Eintragen nach der "
        "Auflösung) – sie kann also schon vor der Stunde im Portal stehen. Die **Lösungsfassung** enthält die vollständige "
        "Rollenkarte 3 und Moderationshinweise mit möglichen Urteilen. Rechtliche Aussagen sind didaktisch vereinfacht."],
        nummeriert=True))
    d.ueberschrift("Tafelbild „Ermittler-Notiz“", 2)
    d.inhalt("**Informationelle Selbstbestimmung:** Jede Person entscheidet grundsätzlich selbst über Preisgabe und "
             "Verwendung ihrer persönlichen Daten.")
    d.tabelle(["DSGVO-Grundsatz", "Fall Weserstedt"], [
        ["Rechtmäßigkeit / Einwilligung", "Die Rad-Daten wurden für die Abrechnung erhoben – nicht für Fahndung oder Werbung."],
        ["Zweckbindung", "Zusammenführen mit Vereins- und Festdaten ist ein neuer Zweck."],
        ["Datenminimierung", "Jahrgang + Stadtteil + Tarif waren für die Veröffentlichung nicht nötig."],
        ["Transparenz", "Bürger wussten nicht von der Weitergabe."],
        ["Speicherbegrenzung", "Exporte aus mehreren Jahren statt Löschung nach Zweckerfüllung."],
        ["besondere Kategorien", "Gesundheitsdaten (z. B. Fitness-App) besonders geschützt."],
    ], breiten=[4.6, 12.3], groesse=8.5)
    sql_k = ("SELECT Jahrgang, Stadtteil, COUNT(*) AS Anzahl\nFROM Einwohner\nGROUP BY Jahrgang, Stadtteil\n"
             "HAVING COUNT(*) < 3\nORDER BY Anzahl;")
    d.inhalt(Liste(["**Pseudonym ≠ anonym:** Ein Token ersetzt den Namen, aber Quasi-Identifikatoren (Jahrgang, Stadtteil, "
                    "Tarif, Zeitmuster) lassen sich verknüpfen.",
                    "**Datenschutz** schützt Personen und ihre Rechte; **Datensicherheit** schützt Daten (Vertraulichkeit, "
                    "Integrität, Verfügbarkeit) – technische Mittel für beides.",
                    "**Maßnahmen:** Aggregation, Mindestgruppengröße (z. B. keine Gruppen < 5), Vergröberung (Jahrzehnt statt "
                    "Jahrgang), wechselnde Pseudonyme, Zugriffsrechte, Verschlüsselung, Löschfristen."]),
             SQL(sql_k),
             "**Ermittler-Notiz:** Jede Gruppe in diesem Ergebnis ist ein Risiko: Wer Jahrgang und Stadtteil kennt, kann die "
             "Person fast eindeutig bestimmen. (Auf der DB `datenspuren`: 180 Gruppen; die Präsentation zeigt die ersten "
             "Zeilen mit eindeutiger Sortierung.)")
    d.ueberschrift("Schlussplädoyer: Indizienkette", 2)
    d.tabelle(["Aufgabe", "Frage", "Ergebnis → Indiz"], [
        [f"A6-E1-{s[0]}", s[2], nur] for s, nur in zip(SPUREN, [
            "R-7F3A: fünf Nachtfahrten (01–02 Uhr), 1988 · Hafenviertel · Plus",
            "genau ein Token (P4: COUNT(*) je Gruppe zählt Fahrten)",
            "WA-3917 mit 5 Treffern, WA-5530 mit 2",
            "19 Check-ins: TuS dienstags, Festplatz 21:52/23:06 am 29.08., Fundbüro 14.09. 10:17, Kranstraße 7 nachts; "
            "Gegenprobe Kaffeemobil 22–23 Uhr: 0 Kartenzahlungen",
            "V-2571 (Tischtennis); V-9952 „Nora Falter“ ohne Geburtsjahr fällt heraus",
            "Merle Falkenrath (ohne DISTINCT Mehrfachzeilen, ohne Jahrgang zusätzlich Nachbar Rune Siemers)"])
    ], breiten=[2.2, 6.3, 8.4], groesse=8.5)
    d.inhalt("Musterabfragen mit Ergebnistabellen: Lösung AB 6.1, Auftrag 3, sowie `seed/datenbanken/datenspuren/LIESMICH.md`. "
             "**Lehrkraft-Hinweis:** Stufe 6 zeigt bewusst, dass zwei Unbeteiligte kurz verdächtig waren – Einstieg in die "
             "Debatte. Auch ihre Adressen liegen im Export (WA-1288 → Speicherstraße 14).")
    d.ueberschrift("Typische Schwierigkeiten", 2)
    d.inhalt(Liste([
        "Verbund über Nicht-Schlüssel-Attribute vervielfacht Zeilen (P2) – hier gewollt als Kandidatenmenge, aber COUNT dann "
        "vorsichtig deuten → DISTINCT.",
        "„Anonym, weil kein Name drinsteht“ → Unplugged-Erfahrung; Begriff Quasi-Identifikator.",
        "Datenschutz und Datensicherheit verwechselt (Verschlüsselung „ist Datenschutz“) → Tafel-Unterscheidung.",
        "Beurteilen ohne Bezug auf Grundsätze oder ohne Urteil (P10) → Schema Grundsatz – Sachverhalt – Abwägung – Urteil.",
        "Debatte driftet in Meinungen ab → Argumentkarten mit Pflicht-Grundsatz.",
        "Spur 1: OR-Fenster ohne Klammern (P6); `HAVING COUNT(*) = 1` statt WHERE (P1, A6-E1-04); Geburtsjahr und Jahrgang "
        "verwechselt (P7)."]))
    d.ueberschrift("Differenzierung", 2)
    d.inhalt(Liste([
        "*Schnelle:* Cold Cases (AB 6.1 „Mindestgruppengröße“, Lab A6-E1-CC „Wie anonym ist Weserstedt?“); Moderationsrolle "
        "in der Debatte; Zusatz: Chancen der Datenanalyse (Verkehrsplanung) gegenüberstellen.",
        "*Langsame:* Schlussplädoyer mit Tipps; Satzbausteine für das Urteil („… ist unzulässig, weil …“); in der Debatte "
        "zunächst Zuhörerrolle mit Beobachtungsbogen."]))
    d.ueberschrift("Vorbereitung", 2)
    d.inhalt(Liste([
        "Profilkarten (30) für „Steh auf, wenn …“ drucken und schneiden – Verteilung vorher prüfen (genau eine Person nach "
        "drei Merkmalen, Übersicht in der Lösungsfassung).",
        "Rollen- und Argumentkarten (Unplugged-Set DS 12) je Rollengruppe einmal; Beobachtungsbogen für alle; Tische für die "
        "Talkrunde umstellen.",
        "Akte 6 freischalten (gA: direkt nach Akte 4); Verhör 6 auf „auto“/„offen“."]))
    d.ueberschrift("Verhör 6 · Fitness-App (V6, 15')", 2)
    d.inhalt("Kontext-DB `verhoer/fitness`: pseudonymer Export `Export(NutzerToken, Geburtsjahr, PLZBereich, Geschlecht, "
             "Schritte, Ruhepuls, Datum)` und Auszüge einer fiktiven Datenschutzerklärung; Gesundheitsdaten als besondere "
             "Kategorie, kleine Gruppen. Rahmensatz Edda: „Du weißt jetzt, wie leicht man Menschen in Daten findet – zeig "
             "mir, dass du weißt, wann man es nicht darf.“ 15 Minuten, 5 aus 8 Aufgaben (2 × ★, 2 × ★★, 1 × ★★★), Abimodus "
             "streng, gA und eA gleich. Pool: Grundsätze, besondere Daten, Selbstbestimmung, Werbung, kleine Gruppen (SQL, "
             "HAVING), re-identifizierbar, Krankenkasse, Schutzmaßnahmen. Beweisstück: Steckbrief.")
    return d.speichern(ORDNER / "4_Lehrerhinweise" / "DD_A6_Lehrerhinweise.docx")


# ================================================================== Warm-up
def warmup():
    karten = json.loads((REPO / "seed" / "warmup" / "warmup_a6.json").read_text(encoding="utf-8"))["karten"]
    return warmup_karten_dokument(karten, 6, "Warm-up-Karten Akte 6").speichern(MAT / "Warm-up" / "DD_Warm-up-Karten_A6.docx")


def main():
    for f in ("schueler", "loesung"):
        ab61(f)
        steh_auf(f)
        debatte(f)
    praesentation()
    lehrerhinweise()
    warmup()
    for p in sorted(ORDNER.rglob("*.*")) + [MAT / "Warm-up" / "DD_Warm-up-Karten_A6.docx"]:
        print(f"✔ {p.relative_to(REPO)}")


if __name__ == "__main__":
    main()
