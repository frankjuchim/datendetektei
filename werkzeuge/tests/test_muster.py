"""Muster-Dokumente (materialien/_Muster): vorhanden, SQL-Prüfung und Begriffsprüfung grün; absichtliche Fehler werden gefunden."""
import shutil
import unittest
import zipfile

from hilfen import REPO, mini_repo

import material_sql_pruefen as S
import materialien_pruefen as P

MUSTER = REPO / "materialien" / "_Muster"
ERWARTET = ["DD_Muster_AB.docx", "DD_Muster_AB_LSG.docx", "DD_Muster_Praesentation.pptx", "DD_Muster_Lehrerhinweise.docx",
            "DD_Muster_Warm-up-Karten.docx", "DD_Muster_Klausur.docx", "DD_Muster_Klausur_Erwartungshorizont.docx",
            "DD_Muster_Video_Folien.pptx"]


def ersetze_im_docx(quelle, ziel, alt, neu):
    with zipfile.ZipFile(quelle) as zin, zipfile.ZipFile(ziel, "w", zipfile.ZIP_DEFLATED) as zout:
        for info in zin.infolist():
            daten = zin.read(info.filename)
            if info.filename == "word/document.xml":
                text = daten.decode("utf-8")
                assert alt in text, alt
                daten = text.replace(alt, neu, 1).encode("utf-8")
            zout.writestr(info, daten)


class MusterTest(unittest.TestCase):
    def test_alle_muster_da_und_gruen(self):
        dateien = [MUSTER / n for n in ERWARTET]
        for d in dateien:
            self.assertTrue(d.exists(), d)
        ergebnis = S.pruefe_dateien(dateien)
        for pfad, befunde in ergebnis.items():
            self.assertEqual([b for b in befunde if b["art"] != "hinweis"], [], pfad.name)
        self.assertGreaterEqual(sum(len(S.sammle(d)) for d in dateien), 10)
        for d in dateien:
            self.assertEqual(P.pruefe_datei(d)[0], [], d.name)

    def test_absichtliche_fehler_im_muster(self):
        tmp = mini_repo()
        try:
            lsg = MUSTER / "DD_Muster_AB_LSG.docx"
            # Ergebnistabelle verfälscht
            falsch = tmp / "erg.docx"
            ersetze_im_docx(lsg, falsch, ">Briefkastenschlüssel<", ">Haustürschlüssel<")
            self.assertTrue(any(b["art"] == "ergebnis" for b in S.pruefe_dateien([falsch])[falsch]))
            # EH-Verstoß: <> statt !=
            ungleich = tmp / "ungl.docx"
            ersetze_im_docx(lsg, ungleich, "Stadtteil != 'Hafenviertel'", "Stadtteil &lt;&gt; 'Hafenviertel'")
            self.assertTrue([b for b in S.pruefe_dateien([ungleich])[ungleich] if b["art"] != "hinweis"])
            self.assertTrue(any("<>" in f for f in P.pruefe_datei(ungleich)[0]))
            # Altbegriff
            alt = tmp / "alt.docx"
            ersetze_im_docx(lsg, alt, "Jede Zeile ist ein", "Jede Entitätsmenge ist ein")
            self.assertTrue(any("Entitätsmenge" in f for f in P.pruefe_datei(alt)[0]))
        finally:
            shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    unittest.main()
