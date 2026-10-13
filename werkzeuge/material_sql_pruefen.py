#!/usr/bin/env python3
"""Prüft jede SQL-Anweisung in den Unterrichtsmaterialien (Spec §12.3; docs/MATERIALIEN.md „SQL in Materialien“).

Gesammelt wird
  docx: jeder Absatz im Absatzformat „SQL-Code“ (auch in Kästen/Tabellenzellen); ein direkt folgender SQL-Code-Absatz,
        der nicht mit SELECT/WITH/CREATE/INSERT/… oder „--“ beginnt, setzt die Anweisung fort (Enter statt
        Umschalt+Enter in Word); mehrere Anweisungen in einem Absatz werden an „;“ getrennt.
  pptx: jedes Textfeld mit dem Namen „SQL“ (Steuerangaben im Namen: „SQL [db=kiosk, fehlerhaft]“).
Datenbank: versteckter Text [[DD: db=…]] im Absatz > Kommentarzeile „-- DB: Stadtfest“ über der Anweisung >
  Dokumenteigenschaft „DD-Datenbank“. „keine“ = nur Parser und Regeln (z. B. erfundene Tabellen).
Steuerangaben (versteckter Text [[DD: …]] bzw. im Textfeldnamen): fehlerhaft (absichtlich falsch, die Prüfung muss einen
  Befund finden) · aus (nicht prüfen, z. B. Ausschnitt) · kuer (JOIN … ON usw. erlaubt; ebenso Dokumenteigenschaft
  DD-Kuer = ja oder Ordner Kuer/).
Ergebnistabelle: die nächste Tabelle im Tabellenformat „Ergebnistabelle“ (pptx: Tabelle „Ergebnistabelle“ auf
  derselben Folie) gehört zur letzten Anweisung davor und wird mit dem tatsächlichen Ergebnis verglichen
  (Zahlen mit Komma, „NULL“, letzte Zeile „…“ = abgeschnitten; Reihenfolge zählt nur mit ORDER BY).

Gemeldet werden Syntaxfehler, EH-§8-Verstöße (Abimodus streng; Kür: aus), Ausführungsfehler (Haupt-DB und alle
Randfall-Varianten) und Ergebnisabweichungen. Hinweise (AND/OR ohne Klammern) nur mit --hinweise.

Aufruf: python3 werkzeuge/material_sql_pruefen.py [Dateien …] [--hinweise]   (ohne Dateien: alle in materialien/)
Benötigt python-docx, python-pptx und Node (scripts/sql_pruefen_cli.js).
"""
from __future__ import annotations

import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

WERKZEUGE = Path(__file__).resolve().parent
REPO = WERKZEUGE.parent
sys.path.insert(0, str(WERKZEUGE))

from akten_design import lese_eigenschaften, sql_cli  # noqa: E402

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
DIREKTIVE = re.compile(r"\[\[DD:\s*([^\]]*)\]\]")
DB_KOMMENTAR = re.compile(r"^\s*--\s*DB:\s*(.+?)\s*$", re.I | re.M)
SQL_NAME = re.compile(r"^SQL(?:\s*\[(.*)\])?\s*$")
#: Ein SQL-Code-Absatz, der so beginnt, startet eine neue Anweisung; sonst setzt er den Absatz davor fort.
ANFANG = re.compile(r"^\s*(SELECT|WITH|CREATE|INSERT|UPDATE|DELETE|DROP|ALTER|--)\b|^\s*--", re.I)


@dataclass
class Anweisung:
    datei: Path
    ort: str
    sql: str
    db: str | None = None
    pruefung: str = "ja"
    kuer: bool = False
    erwartet: dict | None = None
    sitzung: str = ""


def direktiven(text):
    """„db=kiosk, fehlerhaft“ → {"db": "kiosk", "fehlerhaft": True}."""
    aus = {}
    for teil in (text or "").split(","):
        teil = teil.strip()
        if not teil:
            continue
        if "=" in teil:
            k, v = teil.split("=", 1)
            aus[k.strip().lower()] = v.strip()
        else:
            aus[teil.lower()] = True
    return aus


def teile_anweisungen(text):
    """Trennt an „;“ außerhalb von Zeichenketten und Kommentaren; das „;“ bleibt an der Anweisung."""
    teile, aktuell, i, n = [], [], 0, len(text)
    while i < n:
        c = text[i]
        if c == "'":
            j = i + 1
            while j < n:
                if text[j] == "'" and (j + 1 >= n or text[j + 1] != "'"):
                    break
                j += 2 if text[j] == "'" else 1
            aktuell.append(text[i:j + 1])
            i = j + 1
            continue
        if text.startswith("--", i):
            j = text.find("\n", i)
            j = n if j < 0 else j
            aktuell.append(text[i:j])
            i = j
            continue
        aktuell.append(c)
        if c == ";":
            teile.append("".join(aktuell))
            aktuell = []
        i += 1
    rest = "".join(aktuell)
    if rest.strip():
        teile.append(rest)
    aus = []
    for t in teile:
        t = t.strip("\n ")
        if re.sub(r"--[^\n]*", "", t).strip(" ;\n\t"):
            aus.append(t)
    return aus


def _absatz_text(p):
    """(sichtbarer Text, versteckter Text) eines w:p (w:br → Zeilenumbruch)."""
    sichtbar, versteckt = [], []
    for r in p.iter(W + "r"):
        rpr = r.find(W + "rPr")
        hidden = rpr is not None and rpr.find(W + "vanish") is not None
        ziel = versteckt if hidden else sichtbar
        for k in r:
            if k.tag == W + "t":
                ziel.append(k.text or "")
            elif k.tag in (W + "br", W + "cr"):
                ziel.append("\n")
            elif k.tag == W + "tab":
                ziel.append("\t")
    return "".join(sichtbar), "".join(versteckt)


def _tabelle_docx(tbl):
    zeilen = []
    for tr in tbl.findall(W + "tr"):
        zeile = []
        for tc in tr.findall(W + "tc"):
            texte = [_absatz_text(p)[0] for p in tc.findall(W + "p")]
            zeile.append("\n".join(t for t in texte if t.strip()).strip())
        zeilen.append(zeile)
    return zeilen


def _erwartet(zeilen):
    if not zeilen:
        return None
    kopf, daten = zeilen[0], zeilen[1:]
    abgeschnitten = bool(daten) and all(re.fullmatch(r"…|\.\.\.", c.strip() or "…") for c in daten[-1])
    if abgeschnitten:
        daten = daten[:-1]
    return {"kopf": kopf, "zeilen": daten, "abgeschnitten": abgeschnitten}


def _bloecke_zu_anweisungen(pfad, bloecke, standard_db, kuer_dok):
    """bloecke: [(ort, text, direktiven, erwartet)] → Anweisungen (Ergebnistabelle gehört zur letzten des Blocks)."""
    aus = []
    for ort, text, d, erwartet in bloecke:
        if d.get("aus"):
            continue
        teile = teile_anweisungen(text)
        db_block = d.get("db")
        for i, t in enumerate(teile):
            m = DB_KOMMENTAR.search(t)
            if m:
                db_block = m.group(1)
            aus.append(Anweisung(pfad, ort + (f" (Anweisung {i + 1})" if len(teile) > 1 else ""), t,
                                 db=db_block or standard_db, pruefung="fehlerhaft" if d.get("fehlerhaft") else "ja",
                                 kuer=kuer_dok or bool(d.get("kuer")),
                                 erwartet=erwartet if i == len(teile) - 1 else None, sitzung=str(pfad)))
    return aus


def sammle_docx(pfad, eig):
    from docx import Document
    doc = Document(str(pfad))
    namen = {s.style_id: s.name for s in doc.styles}
    body = doc.element.body
    bloecke, offen, letzter_p, nr = [], None, None, 0
    for el in body.iter(W + "p", W + "tbl"):
        if el.tag == W + "tbl":
            tblpr = el.find(W + "tblPr")
            stil = tblpr.find(W + "tblStyle") if tblpr is not None else None
            if stil is not None and namen.get(stil.get(W + "val")) == "Ergebnistabelle":
                if bloecke and bloecke[-1][3] is None:
                    bloecke[-1][3] = _erwartet(_tabelle_docx(el))
                else:
                    bloecke.append([f"Tabelle ohne SQL davor", "", {"ohne_sql": True}, _erwartet(_tabelle_docx(el))])
            continue
        nr += 1
        ppr = el.find(W + "pPr")
        stil = ppr.find(W + "pStyle") if ppr is not None else None
        if stil is None or namen.get(stil.get(W + "val")) != "SQL-Code":
            if el.getparent() is not None and el.getparent().tag != W + "tc" or _absatz_text(el)[0].strip():
                offen = None
            continue
        sichtbar, versteckt = _absatz_text(el)
        d = {}
        for m in DIREKTIVE.finditer(versteckt):
            d.update(direktiven(m.group(1)))
        if offen is not None and el.getprevious() is letzter_p and sichtbar.strip() and not d \
                and not ANFANG.match(sichtbar):
            offen[1] += "\n" + sichtbar
            offen[2].update(d)
        elif sichtbar.strip():
            offen = [f"Absatz {nr}", sichtbar, d, None]
            bloecke.append(offen)
        else:
            offen = None
        letzter_p = el
    return bloecke


def _formen(shapes):
    for s in shapes:
        if s.shape_type == 6:  # Gruppe
            yield from _formen(s.shapes)
        else:
            yield s


def sammle_pptx(pfad):
    from pptx import Presentation
    bloecke = []
    for i, folie in enumerate(Presentation(str(pfad)).slides, 1):
        letzter = None
        for s in _formen(folie.shapes):
            m = SQL_NAME.match(s.name or "")
            if m and s.has_text_frame:
                text = "\n".join(p.text for p in s.text_frame.paragraphs)
                letzter = [f"Folie {i}", text, direktiven(m.group(1)), None]
                bloecke.append(letzter)
            elif getattr(s, "has_table", False) and s.has_table and s.name == "Ergebnistabelle":
                zeilen = [[c.text.strip() for c in r.cells] for r in s.table.rows]
                if letzter is not None and letzter[3] is None:
                    letzter[3] = _erwartet(zeilen)
                else:
                    bloecke.append([f"Folie {i}: Tabelle ohne SQL davor", "", {"ohne_sql": True}, _erwartet(zeilen)])
    return bloecke


def sammle(pfad):
    """Alle Anweisungen einer docx/pptx (Liste von Anweisung)."""
    pfad = Path(pfad)
    eig = lese_eigenschaften(pfad)
    kuer = eig.get("DD-Kuer") == "ja" or "Kuer" in pfad.parts
    bloecke = sammle_docx(pfad, eig) if pfad.suffix == ".docx" else sammle_pptx(pfad)
    aus = []
    for b in bloecke:
        if b[2].get("ohne_sql"):
            aus.append(Anweisung(pfad, b[0], "", pruefung="ohne_sql", erwartet=b[3]))
    return aus + _bloecke_zu_anweisungen(pfad, [b for b in bloecke if not b[2].get("ohne_sql")], eig.get("DD-Datenbank"), kuer)


def pruefe_dateien(dateien):
    """→ {pfad: [befund]} mit befund = {art, text, ort} (art „hinweis“ ist kein Fehler)."""
    alle, ergebnis = [], {Path(d): [] for d in dateien}
    for d in dateien:
        alle += sammle(d)
    auftraege = []
    for i, a in enumerate(alle):
        if a.pruefung == "ohne_sql":
            ergebnis[a.datei].append({"art": "ergebnis", "ort": a.ort, "text": "Ergebnistabelle ohne SQL-Anweisung davor."})
            continue
        if not a.db:
            ergebnis[a.datei].append({"art": "datenbank", "ort": a.ort,
                                      "text": "Keine Datenbank angegeben (Dokumenteigenschaft DD-Datenbank, -- DB: … oder db=…)."})
            continue
        e = {"id": str(i), "sql": a.sql, "datenbank": a.db, "kuer": a.kuer, "pruefung": a.pruefung, "sitzung": a.sitzung}
        if a.erwartet:
            e["erwartet"] = a.erwartet
        auftraege.append(e)
    if auftraege:
        for antwort in sql_cli(auftraege):
            a = alle[int(antwort["id"])]
            for b in antwort["befunde"]:
                if a.pruefung == "fehlerhaft" and antwort["ok"] and b["art"] != "erwartung":
                    continue  # erwartete Fehler einer absichtlich fehlerhaften Abfrage
                ergebnis[a.datei].append({**b, "ort": a.ort})
    return ergebnis


def alle_dateien(wurzel=REPO):
    mat = Path(wurzel) / "materialien"
    return sorted(p for p in mat.rglob("*") if p.suffix in (".docx", ".pptx") and not p.name.startswith("~$"))


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    mit_hinweisen = "--hinweise" in sys.argv
    dateien = [Path(a).resolve() for a in args] if args else alle_dateien()
    ergebnis = pruefe_dateien(dateien)
    anzahl = sum(len(sammle(d)) for d in dateien) if dateien else 0
    fehler = hinweise = 0
    for pfad, befunde in ergebnis.items():
        echte = [b for b in befunde if b["art"] != "hinweis"]
        weich = [b for b in befunde if b["art"] == "hinweis"]
        fehler += len(echte)
        hinweise += len(weich)
        if echte or (mit_hinweisen and weich):
            try:
                rel = pfad.relative_to(REPO)
            except ValueError:
                rel = pfad
            print(f"{'✘' if echte else '·'} {rel}")
            for b in echte + (weich if mit_hinweisen else []):
                print(f"    {'!' if b['art'] != 'hinweis' else '·'} {b['ort']}: [{b['art']}] {b['text']}")
    print(f"{len(dateien)} Dateien, {anzahl} SQL-Anweisungen geprüft: {fehler} Fehler, {hinweise} Hinweis(e)"
          + ("" if mit_hinweisen else " (anzeigen mit --hinweise)") + ".")
    sys.exit(1 if fehler else 0)


if __name__ == "__main__":
    main()
