"""materialien_pruefen.py: Altbegriffe, <>, JOIN außerhalb Kür, Klarnamen, PDF-Namen, SQL außerhalb „SQL-Code“,
Schülerfassungen ohne Lösungsmarker (Quelle und PDF)."""
import shutil
import unittest

from hilfen import A, SOFFICE, mini_repo, schreibe_zuordnung, kleines_ab

import material_gemeinsam as M
import materialien_pruefen as P


def ab_eintrag(quelle="Akte1_Fundbuero/2_Arbeitsblaetter/DD_A1_AB1_Test.docx"):
    return {"art": "ab", "nr": "1.1", "titel": "Test", "quelle": quelle,
            "loesung": "Akte1_Fundbuero/5_Loesungen/DD_A1_AB1_Test_LSG.docx", "datei": "DD_A1-AB1_Test.pdf"}


class BegriffeTest(unittest.TestCase):
    def setUp(self):
        self.wurzel = mini_repo()
        self.mat = self.wurzel / "materialien"

    def tearDown(self):
        shutil.rmtree(self.wurzel, ignore_errors=True)

    def doc(self, name, *inhalt, kuer=False):
        d = A.AktenDokument("ab", "K" if kuer else 1, "Test", material="AB 1.1", datenbank="fundbuero", kuer=kuer)
        d.inhalt(*inhalt)
        return d.speichern(self.mat / name)

    def fehler(self, pfad, klarnamen=()):
        return P.pruefe_datei(pfad, self.wurzel, klarnamen=klarnamen)[0]

    def test_sauberes_dokument(self):
        pfad = self.doc("ok.docx", "Ein **Entitätstyp** ist kein Array von Daten, sondern … – nie „Entitätsmenge“ sagen.",
                        "Verbund ohne JOIN: `FROM a, b WHERE …`; `!=` statt `<>`.", A.SQL("SELECT FundNr FROM Fundsache"))
        self.assertEqual(self.fehler(pfad), [])

    def test_altbegriffe_und_ungleich(self):
        pfad = self.doc("alt.docx", "Jede Entitätsmenge hat Attribute.", "Für 10 XP gibt es einen Stern.",
                        "Speichere die Werte in einem Array.", "Bedingung: Wert <> 3")
        text = "\n".join(self.fehler(pfad))
        for begriff in ("Entitätsmenge", "XP", "Array", "<>"):
            self.assertIn(begriff, text)

    def test_join_nur_in_der_kuer(self):
        pfad = self.doc("join.docx", "Schreibe FROM Rad JOIN Station ON Rad.StationID = Station.StationID.")
        self.assertTrue(any("JOIN" in f for f in self.fehler(pfad)))
        pfad = self.doc("kuer.docx", "Schreibe FROM Rad JOIN Station ON Rad.StationID = Station.StationID (nicht im Abitur).",
                        kuer=True)
        self.assertEqual(self.fehler(pfad), [])

    def test_sql_ausserhalb_sql_code(self):
        pfad = self.doc("roh.docx", "SELECT Bezeichnung FROM Fundsache WHERE Wert > 3")
        self.assertTrue(any("SQL-Code" in f for f in self.fehler(pfad)))

    def test_klarnamen(self):
        pfad = self.doc("name.docx", "Frau Erika Beispielreal hat das Fundbuch geführt.")
        self.assertTrue(any("Klarname" in f for f in self.fehler(pfad, klarnamen=["Erika Beispielreal"])))
        self.assertTrue(P.lade_klarnamen(), "werkzeuge/klarnamen.txt enthält Einträge")

    def test_pptx_texte_und_notizen(self):
        p = A.AktenPraesentation(1, "T")
        p.merkfolie("Merken", ["Eine Entitätsmenge …"], notizen="Achtung: <> nicht verwenden.")
        pfad = p.speichern(self.mat / "f.pptx")
        text = "\n".join(self.fehler(pfad))
        self.assertIn("Entitätsmenge", text)
        self.assertNotIn("<>", text, "„<> nicht verwenden“ ist eine Erklärung")


class SchuelerfassungTest(unittest.TestCase):
    def setUp(self):
        self.wurzel = mini_repo()
        self.mat = self.wurzel / "materialien"

    def tearDown(self):
        shutil.rmtree(self.wurzel, ignore_errors=True)

    def test_quelle_mit_loesung_ist_fehler(self):
        e = ab_eintrag()
        kleines_ab(self.mat / e["quelle"], fassung="loesung")  # versehentlich die Lösungsfassung als Schülerblatt
        kleines_ab(self.mat / e["loesung"], fassung="loesung")
        schreibe_zuordnung(self.wurzel, [{"akte": 1, "gruppe": "A1", "ordner": "Akte1_Fundbuero", "titel": "A1", "materialien": [e]}])
        fehler = P.pruefe_schuelerfassungen(self.wurzel)
        self.assertTrue(any("Lösungsmarker" in f for f in fehler), fehler)

    def test_pdf_namen_und_pdf_marker(self):
        (self.mat / "Arbeitsblaetter_PDF").mkdir()
        (self.mat / "Arbeitsblaetter_PDF" / "DD_A1-Übung.pdf").write_bytes(b"%PDF")
        fehler = P.pruefe_pdf_namen(self.wurzel)
        self.assertTrue(any("Übung" in f for f in fehler))
        self.assertTrue(P.hat_loesungsmarker("Seite 1 N U R   L E H R K R A F T"))
        self.assertTrue(P.hat_loesungsmarker("… Lösungen der Warm-up-Karten …"))
        self.assertFalse(P.hat_loesungsmarker("Ermittlungsaufträge – Lösung selbst finden"))

    @unittest.skipUnless(SOFFICE, "LibreOffice fehlt")
    def test_schueler_pdf_mit_lehrkraft_marker(self):
        e = ab_eintrag()
        kleines_ab(self.mat / e["quelle"], fassung="loesung")
        kleines_ab(self.mat / e["loesung"], fassung="loesung")
        schreibe_zuordnung(self.wurzel, [{"akte": 1, "gruppe": "A1", "ordner": "Akte1_Fundbuero", "titel": "A1", "materialien": [e]}])
        M.erzeuge(self.wurzel, "arbeitsblaetter", ausgabe=lambda *_: None)
        fehler = P.pruefe_schueler_pdfs(self.wurzel)
        self.assertTrue(any("DD_A1-AB1_Test.pdf" in f for f in fehler), fehler)


if __name__ == "__main__":
    unittest.main()
