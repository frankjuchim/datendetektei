#!/usr/bin/env python3
"""Erzeugt materialien/Loesungen_Portal (nur Lehrkraft): Lösungen (_Loesung), Erwartungshorizonte (_Erwartungshorizont), Warm-up-Karten mit Lösungen (_Loesungen).

Zuordnung und Dateinamen: seed/arbeitsblaetter.json (docs/MATERIALIEN.md). Erzeugt nur fehlende oder veraltete PDFs
(SHA-256 der Quelle in quellen.json); --alle erzeugt alles neu.

Aufruf: python3 werkzeuge/loesungen_pdf.py [--pruefen] [--alle]
  --pruefen: nichts erzeugen; Exit-Code 1, wenn eine PDF fehlt, veraltet oder überzählig ist oder verzeichnis.json
             nicht zur Zuordnung passt (ohne LibreOffice – für die CI).
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from material_gemeinsam import main  # noqa: E402

if __name__ == "__main__":
    main("loesungen", __doc__)
