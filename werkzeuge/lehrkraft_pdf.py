#!/usr/bin/env python3
"""Erzeugt materialien/Lehrkraft_PDF (nur Lehrkraft): Lehrerhinweise, Gesamtmaterial, Generalprobe (Standard), Klausuren. Präsentationen mit Notizenseiten erzeugt praesentationen_pdf.py.

Zuordnung und Dateinamen: seed/arbeitsblaetter.json (docs/MATERIALIEN.md). Erzeugt nur fehlende oder veraltete PDFs
(SHA-256 der Quelle in quellen.json); --alle erzeugt alles neu.

Aufruf: python3 werkzeuge/lehrkraft_pdf.py [--pruefen] [--alle]
  --pruefen: nichts erzeugen; Exit-Code 1, wenn eine PDF fehlt, veraltet oder überzählig ist oder verzeichnis.json
             nicht zur Zuordnung passt (ohne LibreOffice – für die CI).
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from material_gemeinsam import main  # noqa: E402

if __name__ == "__main__":
    main("lehrkraft", __doc__)
