"""kompetenz_abdeckung.py: KOMPETENZMATRIX × seed/akten × seed/warmup × Materialien (DD-Kompetenzen)."""
import json
import shutil
import unittest

from hilfen import A, REPO, mini_repo

import kompetenz_abdeckung as K

MATRIX = """# Kompetenzmatrix

| ID | Kompetenz | Niveau | Einführung DS | Übung (DS) | Lab-Aufgaben-IDs | AB/Abi-Ecke | Warm-up-IDs | Verhör-IDs | Generalprobe-Teil | Klausur-Teil | Video |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **K01** | Aufbau | gA/eA | 1 | – | A1-E1-01 | AB 1.1/1 | W-A1-01 | A1-V-01 | – | – | 0, 1 |
| **K02** | Primärschlüssel | gA/eA | 1, 8 | – | A1-E1-02, A4-E2-01 | AB 1.1/2, AB 1.1/Abi-Ecke | W-A1-04 | A1-V-02 | GP-eA-a | KL-A-b | 1 |
| **K06** | Integrität | Kür | K1 | – | K1-E1-03 | – | – | – | – | – | – |
| **K15** | SELECT | gA/eA | 1 | – | – | – | – | – | – | – | 1 |
"""


class AbdeckungTest(unittest.TestCase):
    def setUp(self):
        self.wurzel = mini_repo()
        (self.wurzel / "docs").mkdir()
        (self.wurzel / "docs" / "KOMPETENZMATRIX.md").write_text(MATRIX, encoding="utf-8")
        (self.wurzel / "seed" / "akten").mkdir()
        (self.wurzel / "seed" / "warmup").mkdir()
        akte = {"welt": 1, "aufgaben": [{"id": "A1-E1-01", "kompetenzen": ["DB-K01"]}, {"id": "A1-E1-02", "kompetenzen": ["DB-K03"]},
                                        {"id": "A1-V-01", "kompetenzen": ["DB-K01"]}, {"id": "A1-V-02", "kompetenzen": ["DB-K02"]}]}
        (self.wurzel / "seed" / "akten" / "akte1.json").write_text(json.dumps(akte), encoding="utf-8")
        (self.wurzel / "seed" / "warmup" / "warmup_a1.json").write_text(json.dumps(
            {"karten": [{"id": "W-A1-01", "kompetenz": ["DB-K01"]}, {"id": "W-A1-04", "kompetenz": ["DB-K02"]}]}), encoding="utf-8")
        d = A.AktenDokument("ab", 1, "Test", material="AB 1.1", fassung="loesung")
        d.ermittlungsauftraege([A.Auftrag(1, 1, "PAPIER", "…", kompetenzen=["K01"]), A.Auftrag(2, 1, "PAPIER", "…", kompetenzen=["K02"])])
        d.abi_ecke("**Entwerfen** Sie …", 2, kompetenzen=["K15"])
        d.speichern(self.wurzel / "materialien" / "Akte1" / "DD_A1_AB1_LSG.docx")

    def tearDown(self):
        shutil.rmtree(self.wurzel, ignore_errors=True)

    def test_matrix_lesen(self):
        m = K.lese_matrix(self.wurzel / "docs" / "KOMPETENZMATRIX.md")
        self.assertEqual([k.id for k in m], ["K01", "K02", "K06", "K15"])
        self.assertEqual(m[1].lab, ["A1-E1-02", "A4-E2-01"])
        self.assertEqual(m[1].ab, ["AB 1.1/2", "AB 1.1/Abi-Ecke"])
        self.assertEqual(m[1].pruefung, ["A1-V-02", "GP-eA-a", "KL-A-b"])
        self.assertTrue(m[2].kuer)

    def test_befunde(self):
        b = K.analysiere(self.wurzel)
        text = "\n".join(f"{x.art}: {x.text}" for x in b)
        self.assertIn("A1-E1-02", text)  # Matrix sagt K02, Aufgabe hat K03
        self.assertIn("AB 1.1/Abi-Ecke", text)  # Material ordnet K15 zu, Matrix K02
        self.assertIn("K15", text)  # Lücke: kein Lab, keine Prüfung
        self.assertNotIn("K06", text, "Kür-Kompetenzen sind nicht abiturverbindlich")
        luecken = [x for x in b if x.art == "luecke"]
        self.assertTrue(any("K15" in x.text for x in luecken))

    def test_ausnahmen(self):
        # begründete Ausnahme: K15 ohne Lab-Aufgabe ist kein Fehler mehr, die übrige Lücke (Prüfung) bleibt
        b = K.analysiere(self.wurzel, ausnahmen={("K15", "Lab-Aufgabe"): "Test"})
        self.assertTrue(any(x.art == "ausnahme" and x.text.startswith("K15") for x in b))
        luecke = [x.text for x in b if x.art == "luecke" and x.text.startswith("K15")]
        self.assertEqual(len(luecke), 1)
        self.assertNotIn("Lab-Aufgabe", luecke[0])
        self.assertIn("Prüfungsaufgabe", luecke[0])
        # Ausnahme ohne Lücke (K01 hat ein Arbeitsblatt) → veraltet; Kompetenzen außerhalb der Matrix werden ignoriert
        b = K.analysiere(self.wurzel, ausnahmen={("K01", "Arbeitsblatt"): "Test", ("K99", "Arbeitsblatt"): "Test"})
        veraltet = [x.text for x in b if x.art == "ausnahme_veraltet"]
        self.assertEqual(len(veraltet), 1)
        self.assertIn("K01", veraltet[0])

    def test_echtes_repo_streng_ohne_fehler(self):
        # Abnahme Phase 7: echte Matrix, Akten und Materialien – nur begründete Ausnahmen (K12, K22), keine Lücken
        b = K.analysiere(REPO)
        self.assertEqual([x.text for x in b if x.art not in ("offen", "ausnahme")], [])
        self.assertEqual(sorted(k for k, _ in K.AUSNAHMEN), ["K12", "K22"])

    def test_echtes_repo_laeuft(self):
        b = K.analysiere(REPO)
        self.assertIsInstance(b, list)


if __name__ == "__main__":
    unittest.main()
