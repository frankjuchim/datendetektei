#!/usr/bin/env python3
"""Erzeugt je Präsentation zwei PDFs: Handout (Arbeitsblaetter_PDF/*_Handout.pdf, ohne Folien mit [NUR LEHRKRAFT] in den Notizen, ohne Notizen) und Lehrkraftfassung mit Notizenseiten (Lehrkraft_PDF); Video-Folien als PDF nach Lehrkraft_PDF.

Zuordnung und Dateinamen: seed/arbeitsblaetter.json (docs/MATERIALIEN.md). Erzeugt nur fehlende oder veraltete PDFs
(SHA-256 der Quelle in quellen.json); --alle erzeugt alles neu.

Aufruf: python3 werkzeuge/praesentationen_pdf.py [--pruefen] [--alle]
  --pruefen: nichts erzeugen; Exit-Code 1, wenn eine PDF fehlt, veraltet oder überzählig ist oder verzeichnis.json
             nicht zur Zuordnung passt (ohne LibreOffice – für die CI).
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from material_gemeinsam import main  # noqa: E402

if __name__ == "__main__":
    main("praesentationen", __doc__)
