#!/usr/bin/env python3
"""Kompetenzabdeckung: docs/KOMPETENZMATRIX.md × seed/akten × seed/warmup × Materialien (Spec Erfolgskriterium 1,
Plan Phase 7 Review Focus 2).

Materialien melden ihre Kompetenzen über die Dokumenteigenschaft „DD-Kompetenzen“ (JSON {Bezug: [DB-K…]}), die
werkzeuge/akten_design.py beim Speichern aus Auftrag(..., kompetenzen=…), abi_ecke(...), cold_case(...) und
teilaufgabe(...) schreibt. Bezüge wie in der Matrix: „AB 1.1/3“, „AB 1.1/Abi-Ecke“, „AB 4.2/Cold Case“, „GP-eA-a“, „KL-A-b“.

Befunde:
  luecke     abiturverbindliche Kompetenz (nicht Kür) ohne Lab-Aufgabe, ohne Arbeitsblatt-Bezug oder ohne Prüfungsaufgabe
             (Verhör, Generalprobe, Klausur) – gezählt wird nur, was es tatsächlich gibt (Akten, Materialien)
  ausnahme   Lücke, die in AUSNAHMEN begründet ist (kein Fehler, wird immer angezeigt)
  ausnahme_veraltet  Eintrag in AUSNAHMEN ohne Lücke – Ausnahme entfernen (Fehler mit --streng)
  abweichung Matrix nennt einen Bezug, die Aufgabe/das Material ordnet die Kompetenz aber nicht zu (oder umgekehrt)
  offen      Bezug aus der Matrix, dessen Akte/Material es noch nicht gibt
Standard: alles nur als Hinweis (Exit 0). Mit --streng (Abnahme Phase 7) sind Lücken und Abweichungen Fehler.

Aufruf: python3 werkzeuge/kompetenz_abdeckung.py [--streng] [--alle]   (--alle zeigt auch „offen“)
"""
from __future__ import annotations

import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

WERKZEUGE = Path(__file__).resolve().parent
REPO = WERKZEUGE.parent
sys.path.insert(0, str(WERKZEUGE))

from akten_design import lese_eigenschaften  # noqa: E402

LEER = {"", "–", "-", "—"}

# Begründete Ausnahmen der Abnahme Phase 7 (Spec §18, Eintrag „Phase 7, Umsetzungsentscheidungen“, offene Frage an
# Frank): Die Matrix nennt für K12 und K22 kein Arbeitsblatt. Inhaltlich behandeln AB 4.2 (Beweisstück 4
# „Redundanzfreiheit begründen“, Auftrag 4) und AB 3.2 (Beweisstück 3 „Top-n mit LIMIT“, Auftrag 4) beide
# Kompetenzen; ohne Entscheidung von Frank wird weder die Matrix noch die Zuordnung im Material geändert.
# Schlüssel: (Kompetenz, fehlender Teil) → Begründung. Eine Ausnahme gilt nur, solange die Lücke besteht
# (sonst Befund „ausnahme_veraltet“).
AUSNAHMEN = {
    ("K12", "Arbeitsblatt"): "Matrix ohne AB-Bezug; Inhalt in AB 4.2 (Beweisstück 4, Auftrag 4) – Spec §18, offene Frage",
    ("K22", "Arbeitsblatt"): "Matrix ohne AB-Bezug; Inhalt in AB 3.2 (Beweisstück 3, Auftrag 4) – Spec §18, offene Frage",
}


@dataclass
class Kompetenz:
    id: str
    titel: str
    niveau: str
    lab: list = field(default_factory=list)
    ab: list = field(default_factory=list)
    warmup: list = field(default_factory=list)
    pruefung: list = field(default_factory=list)

    @property
    def kuer(self):
        return self.niveau.lower().startswith("kür")


@dataclass
class Befund:
    art: str
    text: str


def _liste(zelle):
    zelle = zelle.strip()
    if zelle in LEER:
        return []
    return [x.strip() for x in zelle.split(",") if x.strip() and x.strip() not in LEER]


def lese_matrix(datei):
    aus = []
    for zeile in Path(datei).read_text(encoding="utf-8").splitlines():
        m = re.match(r"^\|\s*\*\*(K\d\d)\*\*\s*\|", zeile)
        if not m:
            continue
        z = [c.strip() for c in zeile.strip().strip("|").split("|")]
        if len(z) < 11:
            continue
        aus.append(Kompetenz(id=m.group(1), titel=z[1], niveau=z[2], lab=_liste(z[5]), ab=_liste(z[6]), warmup=_liste(z[7]),
                             pruefung=_liste(z[8]) + _liste(z[9]) + _liste(z[10])))
    return aus


def _norm(k):
    return k if k.startswith("DB-") else "DB-" + k


def lade_aufgaben(wurzel):
    aus = {}
    for f in sorted((Path(wurzel) / "seed" / "akten").glob("*.json")):
        d = json.loads(f.read_text(encoding="utf-8"))
        for a in d.get("aufgaben", []):
            aus[a["id"]] = set(a.get("kompetenzen", []))
    return aus


def lade_warmup(wurzel):
    aus = {}
    for f in sorted((Path(wurzel) / "seed" / "warmup").glob("*.json")):
        for k in json.loads(f.read_text(encoding="utf-8")).get("karten", []):
            aus[k["id"]] = set(k.get("kompetenz", []))
    return aus


def lade_materialien(wurzel):
    """→ (bezuege {Bezug: set(DB-K…)}, materialien {DD-Material: Datei})."""
    bezuege, materialien = {}, {}
    mat = Path(wurzel) / "materialien"
    for p in sorted(mat.rglob("*.docx")) if mat.exists() else []:
        if p.name.startswith("~$") or "_Muster" in p.parts:
            continue
        eig = lese_eigenschaften(p)
        if eig.get("DD-Material"):
            materialien.setdefault(eig["DD-Material"], p)
        try:
            for bezug, ks in json.loads(eig.get("DD-Kompetenzen", "{}")).items():
                bezuege.setdefault(bezug, set()).update(ks)
        except json.JSONDecodeError:
            pass
    return bezuege, materialien


def _material_von(bezug):
    m = re.match(r"^(AB \d+\.\d+|K\d)/", bezug)
    if m:
        return m.group(1)
    m = re.match(r"^((?:GP|KL|NK)-[A-Za-z]+)-[a-z]$", bezug)
    return m.group(1) if m else None


def _akte_von(aufgaben_id):
    m = re.match(r"^A(\d)-", aufgaben_id)
    return int(m.group(1)) if m else None


def analysiere(wurzel=REPO, ausnahmen=None):
    wurzel = Path(wurzel)
    ausnahmen = AUSNAHMEN if ausnahmen is None else ausnahmen
    genutzt = set()
    matrix = lese_matrix(wurzel / "docs" / "KOMPETENZMATRIX.md")
    aufgaben = lade_aufgaben(wurzel)
    warmup = lade_warmup(wurzel)
    bezuege, materialien = lade_materialien(wurzel)
    akten_da = {_akte_von(i) for i in aufgaben}
    befunde = []
    for k in matrix:
        if k.kuer:
            continue
        kk = _norm(k.id)
        # Matrix → Daten
        for a in k.lab + [p for p in k.pruefung if re.match(r"^A\d-V-", p)]:
            if a in aufgaben:
                if kk not in aufgaben[a]:
                    befunde.append(Befund("abweichung", f"{k.id}: Matrix nennt {a}, die Aufgabe ordnet {k.id} nicht zu"))
            elif _akte_von(a) in akten_da:
                befunde.append(Befund("abweichung", f"{k.id}: Aufgabe {a} aus der Matrix gibt es nicht"))
            else:
                befunde.append(Befund("offen", f"{k.id}: Aufgabe {a} (Akte noch nicht vorhanden)"))
        for w in k.warmup:
            if w in warmup and kk not in warmup[w]:
                befunde.append(Befund("abweichung", f"{k.id}: Matrix nennt Warm-up {w}, die Karte ordnet {k.id} nicht zu"))
        for b in k.ab + [p for p in k.pruefung if _material_von(p)]:
            if b in bezuege:
                if kk not in bezuege[b]:
                    befunde.append(Befund("abweichung", f"{k.id}: Matrix nennt {b}, das Material ordnet dort {', '.join(sorted(bezuege[b]))} zu"))
            elif _material_von(b) in materialien:
                befunde.append(Befund("abweichung", f"{k.id}: {b} fehlt im Material ({materialien[_material_von(b)].name})"))
            else:
                befunde.append(Befund("offen", f"{k.id}: {b} (Material noch nicht vorhanden)"))
        # Abdeckung mit echten Daten
        lab = [a for a in aufgaben if kk in aufgaben[a] and not re.match(r"^A\d-V-", a)]
        pruef = [a for a in aufgaben if kk in aufgaben[a] and re.match(r"^A\d-V-", a)] + \
                [b for b in bezuege if kk in bezuege[b] and re.match(r"^(GP|KL|NK)-", b)]
        ab = [b for b in bezuege if kk in bezuege[b] and re.match(r"^(AB|K\d)", b)]
        fehlt = [n for n, liste in (("Lab-Aufgabe", lab), ("Arbeitsblatt", ab), ("Prüfungsaufgabe", pruef)) if not liste]
        for n in [n for n in fehlt if (k.id, n) in ausnahmen]:
            genutzt.add((k.id, n))
            befunde.append(Befund("ausnahme", f"{k.id} ({k.titel[:50]}): ohne {n} – {ausnahmen[(k.id, n)]}"))
        fehlt = [n for n in fehlt if (k.id, n) not in ausnahmen]
        if fehlt:
            befunde.append(Befund("luecke", f"{k.id} ({k.titel[:50]}): ohne {', '.join(fehlt)}"))
    ids = {k.id for k in matrix}
    for kid, teil in sorted(a for a in set(ausnahmen) - genutzt if a[0] in ids):
        befunde.append(Befund("ausnahme_veraltet", f"{kid}: Ausnahme „ohne {teil}“ greift nicht mehr – aus AUSNAHMEN entfernen"))
    # Daten → Matrix (Materialbezüge, die die Matrix nicht kennt)
    in_matrix = {}
    for k in matrix:
        for b in k.ab + k.pruefung:
            in_matrix.setdefault(b, set()).add(_norm(k.id))
    for b, ks in sorted(bezuege.items()):
        extra = sorted(ks - in_matrix.get(b, set()))
        if extra:
            befunde.append(Befund("abweichung", f"{b}: Material ordnet {', '.join(x.replace('DB-', '') for x in extra)} zu, die Matrix nicht"))
    return befunde


def main():
    streng = "--streng" in sys.argv
    befunde = analysiere()
    zaehler = {}
    ohne_fehler = {"offen", "ausnahme"}
    for b in befunde:
        zaehler[b.art] = zaehler.get(b.art, 0) + 1
        if b.art != "offen" or "--alle" in sys.argv:
            print(f"{'✘' if streng and b.art not in ohne_fehler else '·'} [{b.art}] {b.text}")
    print("Kompetenzabdeckung: " + ", ".join(f"{n} {a}" for a, n in sorted(zaehler.items())) + (" – keine Befunde." if not befunde else "")
          + ("" if streng else " (Hinweise; Fehler erst mit --streng in der Abnahme)"))
    sys.exit(1 if streng and any(b.art not in ohne_fehler for b in befunde) else 0)


if __name__ == "__main__":
    main()
