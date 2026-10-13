"""PDF-Pipeline (Spec §12.2/12.4): Zuordnung, Plan, Verzeichnisse, --pruefen (Vollständigkeit + Aktualität), Rendern."""
import json
import shutil
import unittest
from pathlib import Path

from hilfen import A, SOFFICE, mini_repo, schreibe_zuordnung, kleines_ab, kleine_praesentation, warmup_karten

import material_gemeinsam as M

AB = {"art": "ab", "nr": "1.1", "ermittlung": "A1-E1", "ds": [1], "niveau": "gA/eA", "titel": "Der erste Auftrag",
      "quelle": "Akte1_Fundbuero/2_Arbeitsblaetter/DD_A1_AB1_Der_erste_Auftrag.docx",
      "loesung": "Akte1_Fundbuero/5_Loesungen/DD_A1_AB1_Der_erste_Auftrag_LSG.docx",
      "datei": "DD_A1-AB1_Der_erste_Auftrag.pdf"}
PRAES = {"art": "praesentation", "titel": "Das Fundbüro", "quelle": "Akte1_Fundbuero/1_Praesentation/DD_A1_Fundbuero.pptx",
         "datei": "DD_A1-Praesentation_Fundbuero.pdf"}
WARMUP = {"art": "warmup", "titel": "Warm-up-Karten Akte 1", "quelle": "Warm-up/DD_Warm-up-Karten_A1.docx",
          "datei": "DD_A1-Warm-up-Karten.pdf"}
HINWEISE = {"art": "lehrerhinweise", "titel": "Lehrerhinweise Akte 1", "quelle": "Akte1_Fundbuero/4_Lehrerhinweise/DD_A1_Lehrerhinweise.docx",
            "datei": "DD_A1-Lehrerhinweise.pdf"}


def gruppe(*materialien):
    return [{"akte": 1, "gruppe": "A1", "ordner": "Akte1_Fundbuero", "titel": "Akte 1 · Das Fundbüro", "materialien": list(materialien)}]


class ZuordnungTest(unittest.TestCase):
    def setUp(self):
        self.wurzel = mini_repo()

    def tearDown(self):
        shutil.rmtree(self.wurzel, ignore_errors=True)

    def test_fehler_in_der_zuordnung(self):
        falsch = [dict(AB, datei="DD_A1-AB1_Fundbüro.pdf"), dict(AB, art="poster", datei="x.pdf"),
                  {k: v for k, v in AB.items() if k != "loesung"} | {"datei": "DD_A1-AB2.pdf"}, dict(AB)]
        schreibe_zuordnung(self.wurzel, gruppe(AB, *falsch))
        meldungen = M.pruefe_zuordnung(M.lade_zuordnung(self.wurzel), self.wurzel, quellen_pruefen=False)
        text = "\n".join(meldungen)
        self.assertIn("Umlaut", text)
        self.assertIn("unbekannte Art", text)
        self.assertIn("loesung fehlt", text)
        self.assertIn("doppelt", text)

    def test_plan_je_art(self):
        schreibe_zuordnung(self.wurzel, gruppe(AB, PRAES, WARMUP, HINWEISE,
                                               {"art": "klausur", "titel": "Klausur", "quelle": "Akte7_Generalprobe/K.docx",
                                                "loesung": "Akte7_Generalprobe/K_EH.docx", "datei": "DD_A7-Klausur.pdf"},
                                               {"art": "generalprobe", "titel": "Generalprobe eA", "quelle": "Akte7_Generalprobe/G.docx",
                                                "loesung": "Akte7_Generalprobe/G_EH.docx", "datei": "DD_A7-Generalprobe_eA.pdf"}))
        ziele = M.plan(M.lade_zuordnung(self.wurzel))
        paare = {(z.ordner, z.datei, z.verfahren, z.erzeuger) for z in ziele}
        self.assertIn(("Arbeitsblaetter_PDF", "DD_A1-AB1_Der_erste_Auftrag.pdf", "pdf", "arbeitsblaetter"), paare)
        self.assertIn(("Loesungen_Portal", "DD_A1-AB1_Der_erste_Auftrag_Loesung.pdf", "pdf", "loesungen"), paare)
        self.assertIn(("Arbeitsblaetter_PDF", "DD_A1-Praesentation_Fundbuero_Handout.pdf", "handout", "praesentationen"), paare)
        self.assertIn(("Lehrkraft_PDF", "DD_A1-Praesentation_Fundbuero.pdf", "notizen", "praesentationen"), paare)
        self.assertIn(("Arbeitsblaetter_PDF", "DD_A1-Warm-up-Karten.pdf", "ohne-loesungsteil", "arbeitsblaetter"), paare)
        self.assertIn(("Loesungen_Portal", "DD_A1-Warm-up-Karten_Loesungen.pdf", "pdf", "loesungen"), paare)
        self.assertIn(("Lehrkraft_PDF", "DD_A1-Lehrerhinweise.pdf", "pdf", "lehrkraft"), paare)
        self.assertIn(("Lehrkraft_PDF", "DD_A7-Klausur.pdf", "pdf", "lehrkraft"), paare)
        self.assertIn(("Loesungen_Portal", "DD_A7-Klausur_Erwartungshorizont.pdf", "pdf", "loesungen"), paare)
        # Generalprobe standardmäßig nur Lehrkraft (Spec §12.4)
        self.assertIn(("Lehrkraft_PDF", "DD_A7-Generalprobe_eA.pdf", "pdf", "lehrkraft"), paare)
        self.assertFalse(any(z.ordner == "Arbeitsblaetter_PDF" and "Generalprobe" in z.datei for z in ziele))
        # nie eine Lösung in der Schülerfassung
        self.assertFalse(any(z.ordner == "Arbeitsblaetter_PDF" and z.fassung not in ("schueler", "handout") for z in ziele))

    def test_verzeichnisse(self):
        schreibe_zuordnung(self.wurzel, gruppe(AB, PRAES))
        v = M.verzeichnisse(M.lade_zuordnung(self.wurzel))
        ab = v["Arbeitsblaetter_PDF"]["dateien"]
        self.assertEqual(ab[0], {"datei": "DD_A1-AB1_Der_erste_Auftrag.pdf", "titel": "AB 1.1 · Der erste Auftrag", "akte": 1,
                                 "gruppe": "A1", "art": "ab", "fassung": "schueler", "niveau": "gA/eA", "ermittlung": "A1-E1",
                                 "ds": [1]})
        self.assertEqual(ab[1]["fassung"], "handout")
        lsg = v["Loesungen_Portal"]["dateien"]
        self.assertEqual(lsg[0]["fassung"], "loesung")
        self.assertEqual(v["Lehrkraft_PDF"]["dateien"][0]["fassung"], "lehrkraft")
        orig = v["Originale"]["dateien"]
        self.assertEqual({o["datei"] for o in orig}, {AB["quelle"], AB["loesung"], PRAES["quelle"]})


class PruefenTest(unittest.TestCase):
    """--pruefen ohne LibreOffice: Vollständigkeit, überzählige PDFs, Aktualität über den Hash, veraltete Verzeichnisse."""

    def setUp(self):
        self.wurzel = mini_repo()
        mat = self.wurzel / "materialien"
        kleines_ab(mat / AB["quelle"])
        kleines_ab(mat / AB["loesung"], fassung="loesung")
        schreibe_zuordnung(self.wurzel, gruppe(AB))

    def tearDown(self):
        shutil.rmtree(self.wurzel, ignore_errors=True)

    def fake_erzeugen(self, erzeuger):
        """Wie erzeugen(), aber statt LibreOffice eine Platzhalter-PDF (für Tests ohne soffice)."""
        M.erzeuge(self.wurzel, erzeuger, renderer=lambda ziel, quelle, aus: aus.write_bytes(b"%PDF-1.4 Platzhalter"),
                  ausgabe=lambda *_: None)

    def test_fehlende_pdf_dann_vollstaendig(self):
        probleme = M.pruefe(self.wurzel, "arbeitsblaetter")
        self.assertTrue(any("fehlt" in p for p in probleme), probleme)
        self.fake_erzeugen("arbeitsblaetter")
        self.assertEqual(M.pruefe(self.wurzel, "arbeitsblaetter"), [])
        self.assertTrue(any("fehlt" in p for p in M.pruefe(self.wurzel, "loesungen")))
        self.fake_erzeugen("loesungen")
        self.assertEqual(M.pruefe(self.wurzel, "loesungen"), [])
        ql = json.loads((self.wurzel / "materialien" / "Arbeitsblaetter_PDF" / "quellen.json").read_text(encoding="utf-8"))
        eintrag = ql["dateien"]["DD_A1-AB1_Der_erste_Auftrag.pdf"]
        self.assertEqual(eintrag["quelle"], AB["quelle"])
        self.assertEqual(len(eintrag["sha256"]), 64)

    def test_veraltete_quelle_wird_erkannt(self):
        self.fake_erzeugen("arbeitsblaetter")
        kleines_ab(self.wurzel / "materialien" / AB["quelle"], text="Geänderter Auftrag.")
        probleme = M.pruefe(self.wurzel, "arbeitsblaetter")
        self.assertTrue(any("veraltet" in p for p in probleme), probleme)

    def test_ueberzaehlige_pdf_und_verzeichnis(self):
        self.fake_erzeugen("arbeitsblaetter")
        extra = self.wurzel / "materialien" / "Arbeitsblaetter_PDF" / "DD_A9-Alt.pdf"
        extra.write_bytes(b"%PDF")
        self.assertTrue(any("überzählig" in p for p in M.pruefe(self.wurzel, "arbeitsblaetter")))
        extra.unlink()
        v = self.wurzel / "materialien" / "Arbeitsblaetter_PDF" / "verzeichnis.json"
        v.write_text('{"dateien": []}\n', encoding="utf-8")
        self.assertTrue(any("verzeichnis.json veraltet" in p for p in M.pruefe(self.wurzel, "arbeitsblaetter")))

    def test_originale_verzeichnis(self):
        self.assertTrue(M.pruefe(self.wurzel, "originale"))
        M.erzeuge(self.wurzel, "originale", ausgabe=lambda *_: None)
        self.assertEqual(M.pruefe(self.wurzel, "originale"), [])
        orig = json.loads((self.wurzel / "materialien" / "Originale" / "verzeichnis.json").read_text(encoding="utf-8"))
        self.assertEqual(orig["dateien"][0]["datei"], AB["quelle"])

    def test_cli_exitcode(self):
        import subprocess
        import sys
        r = subprocess.run([sys.executable, str(M.WERKZEUGE / "arbeitsblaetter_pdf.py"), "--pruefen", "--wurzel", str(self.wurzel)],
                           capture_output=True, text=True)
        self.assertEqual(r.returncode, 1, r.stdout + r.stderr)
        self.assertIn("fehlt", r.stdout)


@unittest.skipUnless(SOFFICE, "LibreOffice (soffice) fehlt – Rendern wird nur lokal getestet")
class RendernTest(unittest.TestCase):
    """Echte Umwandlung: Handout ohne [NUR LEHRKRAFT]-Folien, Notizenseiten, Warm-up ohne Lösungsteil."""

    @classmethod
    def setUpClass(cls):
        cls.wurzel = mini_repo()
        mat = cls.wurzel / "materialien"
        kleines_ab(mat / AB["quelle"])
        kleines_ab(mat / AB["loesung"], fassung="loesung")
        kleine_praesentation(mat / PRAES["quelle"])
        A.warmup_karten_dokument(warmup_karten(), 1).speichern(mat / WARMUP["quelle"])
        schreibe_zuordnung(cls.wurzel, gruppe(AB, PRAES, WARMUP))
        for e in ("arbeitsblaetter", "loesungen", "praesentationen", "lehrkraft", "originale"):
            M.erzeuge(cls.wurzel, e, ausgabe=lambda *_: None)

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.wurzel, ignore_errors=True)

    def pdf(self, ordner, datei):
        from pypdf import PdfReader
        return PdfReader(str(self.wurzel / "materialien" / ordner / datei))

    def test_alles_vollstaendig_und_aktuell(self):
        for e in ("arbeitsblaetter", "loesungen", "praesentationen", "lehrkraft", "originale"):
            self.assertEqual(M.pruefe(self.wurzel, e), [], e)

    def test_handout_ohne_loesungsfolie(self):
        handout = self.pdf("Arbeitsblaetter_PDF", "DD_A1-Praesentation_Fundbuero_Handout.pdf")
        self.assertEqual(len(handout.pages), 2)
        text = "".join(s.extract_text() or "" for s in handout.pages)
        self.assertNotIn(A.MARKER_LEHRKRAFT, text)
        self.assertNotIn("Erst nach der Arbeitsphase", text)
        lk = self.pdf("Lehrkraft_PDF", "DD_A1-Praesentation_Fundbuero.pdf")
        self.assertEqual(len(lk.pages), 3)
        lk_text = "".join(s.extract_text() or "" for s in lk.pages)
        self.assertIn("Erst nach der", lk_text, "Lehrkraftfassung enthält die Notizen")

    def test_warmup_ohne_loesungsteil(self):
        schueler = self.pdf("Arbeitsblaetter_PDF", "DD_A1-Warm-up-Karten.pdf")
        text = "".join(s.extract_text() or "" for s in schueler.pages)
        self.assertNotIn(A.LOESUNGSTEIL_WARMUP, text)
        self.assertIn("W-A1-01", text)
        lsg = self.pdf("Loesungen_Portal", "DD_A1-Warm-up-Karten_Loesungen.pdf")
        self.assertGreater(len(lsg.pages), len(schueler.pages))

    def test_schuelerfassung_ohne_lehrkraft_marker(self):
        ab = self.pdf("Arbeitsblaetter_PDF", AB["datei"])
        self.assertNotIn(A.MARKER_LEHRKRAFT, "".join(s.extract_text() or "" for s in ab.pages))
        lsg = self.pdf("Loesungen_Portal", "DD_A1-AB1_Der_erste_Auftrag_Loesung.pdf")
        self.assertIn(A.MARKER_LEHRKRAFT, "".join(s.extract_text() or "" for s in lsg.pages))


if __name__ == "__main__":
    unittest.main()
