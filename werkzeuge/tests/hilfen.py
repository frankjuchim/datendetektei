"""Gemeinsame Hilfen der Werkzeug-Tests: temporäres Mini-Repo mit Materialien und seed/arbeitsblaetter.json."""
import json
import shutil
import sys
import tempfile
from pathlib import Path

WERKZEUGE = Path(__file__).resolve().parent.parent
REPO = WERKZEUGE.parent
if str(WERKZEUGE) not in sys.path:
    sys.path.insert(0, str(WERKZEUGE))

import akten_design as A  # noqa: E402

SOFFICE = shutil.which("soffice") or shutil.which("libreoffice")


def mini_repo():
    """Leeres Mini-Repo (materialien/, seed/) in einem temporären Ordner → Path."""
    wurzel = Path(tempfile.mkdtemp(prefix="dd-test-repo-"))
    (wurzel / "materialien").mkdir()
    (wurzel / "seed").mkdir()
    return wurzel


def schreibe_zuordnung(wurzel, gruppen):
    (wurzel / "seed" / "arbeitsblaetter.json").write_text(
        json.dumps({"version": 1, "gruppen": gruppen}, ensure_ascii=False, indent=1), encoding="utf-8")


def kleines_ab(pfad, fassung="schueler", text="Notiere eine Abfrage.", sql=None, ergebnis=None, datenbank="fundbuero",
               material="AB 1.1", kompetenzen=("K15",)):
    d = A.AktenDokument("ab", 1, "Testblatt", fassung=fassung, ermittlung="1.1", ds=1, material=material, datenbank=datenbank)
    d.kopfband()
    inhalt = []
    if sql:
        inhalt.append(A.SQL(sql))
    if ergebnis:
        inhalt.append(A.Ergebnis(*ergebnis))
    d.ermittlungsauftraege([A.Auftrag(1, 1, "PAPIER", text, kompetenzen=kompetenzen, linien=2,
                                      loesung=A.Loesung(*inhalt) if inhalt else A.Loesung("Siehe Tafel."))])
    return d.speichern(pfad)


def kleine_praesentation(pfad):
    p = A.AktenPraesentation(1, "Testfolien", datenbank="fundbuero")
    p.titelfolie("Testfolien", "Untertitel", notizen="Begrüßung.")
    p.merkfolie("Merken", ["SELECT wählt Spalten."], notizen="Kurz sichern.")
    p.loesungsfolie("Lösung", A.SQL("SELECT FundNr\nFROM Fundsache\nWHERE FundNr = 1"), notizen="Erst nach der Arbeitsphase zeigen.")
    return p.speichern(pfad)


def warmup_karten():
    return json.loads((REPO / "seed" / "warmup" / "warmup_a1.json").read_text(encoding="utf-8"))["karten"][:3]
