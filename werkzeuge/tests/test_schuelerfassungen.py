"""Abnahme Phase 7 (Review Focus 4): keine Lösung und keine Story-Auflösung in einer Schülerfassung.

Durchsucht den Text ALLER PDFs in materialien/Arbeitsblaetter_PDF (Schülerfassungen, Handouts, Warm-up ohne
Lösungsteil, Unplugged, Handbuch) nach
  - Lösungsmarkern (wie materialien_pruefen.py: „NUR LEHRKRAFT“, „[NUR LEHRKRAFT]“, „Lösungen der Warm-up-Karten“,
    „LÖSUNG ·“, „ERWARTUNGSHORIZONT ·“) und den Kastenüberschriften der Lösungsfassung („Auch richtig“,
    „Typische Fehler“),
  - der Story-Auflösung (Akte 6, STORY §3.4/§7): Name „Falkenrath“, Motiv „Datenschutzbeauftragte“, Adresse
    „Kranstraße 7“.
Begründete Ausnahmen stehen in AUSNAHMEN (Spec §18, offene Frage an Frank). Benötigt pypdf oder pdftotext.
"""
import re
import unittest

from hilfen import REPO

import materialien_pruefen as M

ORDNER = REPO / "materialien" / "Arbeitsblaetter_PDF"

LOESUNG = M.LOESUNGSMARKER + ("Auch richtig", "Typische Fehler")
AUFLOESUNG = ("Falkenrath", "Datenschutzbeauftragte", "Kranstraße 7")

# (PDF, Begriff) → Begründung. W-A6-03 (Warm-up Akte 6, „Pseudonym oder anonym?“) zeigt den Datensatz
# „WA-3917 | Kranstraße 7 | …“ als Aufgabe – die Adresse der Auflösung, aber ohne Namen; offen für Frank (Spec §18).
AUSNAHMEN = {
    ("DD_A6-Warm-up-Karten.pdf", "Kranstraße 7"): "W-A6-03 Aufgabentext (Spec §18, offene Frage)",
}


def kompakt(text):
    return re.sub(r"\s+", "", text)


class SchuelerfassungenTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pdfs = sorted(ORDNER.glob("*.pdf"))
        cls.texte = {}
        for p in cls.pdfs:
            t = M.pdf_text(p)
            if t is None:
                raise unittest.SkipTest("weder pypdf noch pdftotext vorhanden")
            cls.texte[p.name] = t

    def test_alle_pdfs_gelesen(self):
        self.assertGreaterEqual(len(self.pdfs), 30)
        leer = [n for n, t in self.texte.items() if len(t.strip()) < 100]
        self.assertEqual(leer, [], "PDF ohne Text – Prüfung wäre wirkungslos")

    def test_keine_loesungsmarker(self):
        funde = [(n, m) for n, t in self.texte.items() for m in LOESUNG if kompakt(m) in kompakt(t)]
        self.assertEqual(funde, [])

    def test_keine_story_aufloesung(self):
        funde = []
        for n, t in self.texte.items():
            for b in AUFLOESUNG:
                if kompakt(b).lower() in kompakt(t).lower() and (n, b) not in AUSNAHMEN:
                    funde.append((n, b))
        self.assertEqual(funde, [])

    def test_ausnahmen_aktuell(self):
        for (n, b) in AUSNAHMEN:
            self.assertIn(n, self.texte, f"Ausnahme für fehlende Datei {n}")
            self.assertIn(kompakt(b).lower(), kompakt(self.texte[n]).lower(), f"Ausnahme {n}/{b} greift nicht mehr – entfernen")

    def test_aufloesung_steht_in_lehrkraftfassungen(self):
        # Gegenprobe: die Prüfung findet den Namen dort, wo er hingehört (sonst wäre die Textextraktion blind)
        lsg = REPO / "materialien" / "Loesungen_Portal" / "DD_A6-AB1_Das_Phantom_Loesung.pdf"
        self.assertIn("Falkenrath", M.pdf_text(lsg))


if __name__ == "__main__":
    unittest.main()
