#!/usr/bin/env node
'use strict';
// Stellt die Materialien für das Docker-Image zusammen (Spec §12.1/§12.4, Plan Phase 7 Task 1; Downloads: Phase 6 Task 5).
//   node scripts/materialien_fuer_image.js <quelle: materialien/> <ziel>
// Kopiert: Arbeitsblaetter_PDF, Loesungen_Portal, Lehrkraft_PDF (nur *.pdf + verzeichnis.json), Gast_PDF/verzeichnis.json,
// Originale/verzeichnis.json und – nur mit ORIGINALE_IM_IMAGE=1 – die dort gelisteten docx/pptx (Pfade relativ zu
// materialien/, ohne „..“). Alles andere (Muster, Quellen-Hashes, Video-Rohdaten) bleibt draußen.
const fs = require('node:fs');
const path = require('node:path');

const PDF_ORDNER = ['Arbeitsblaetter_PDF', 'Loesungen_Portal', 'Lehrkraft_PDF'];
const ORIGINAL = /^[A-Za-z0-9_][A-Za-z0-9 ._()-]*(\/[A-Za-z0-9_][A-Za-z0-9 ._()-]*)*\.(docx|pptx)$/;

function kopiere(von, nach) {
  fs.mkdirSync(path.dirname(nach), { recursive: true });
  fs.copyFileSync(von, nach);
}

function zusammenstellen(quelle, ziel, { originale = false } = {}) {
  const kopiert = [];
  const nimm = (rel) => {
    const von = path.join(quelle, rel);
    if (!fs.existsSync(von)) return;
    kopiere(von, path.join(ziel, rel));
    kopiert.push(rel);
  };
  for (const o of PDF_ORDNER) {
    nimm(`${o}/verzeichnis.json`);
    const ordner = path.join(quelle, o);
    if (fs.existsSync(ordner)) for (const d of fs.readdirSync(ordner).sort()) if (d.endsWith('.pdf')) nimm(`${o}/${d}`);
  }
  nimm('Gast_PDF/verzeichnis.json');
  nimm('Originale/verzeichnis.json');
  if (originale) {
    const datei = path.join(quelle, 'Originale', 'verzeichnis.json');
    const liste = fs.existsSync(datei) ? JSON.parse(fs.readFileSync(datei, 'utf8')).dateien || [] : [];
    for (const e of liste) {
      const rel = String(e && e.datei);
      if (!ORIGINAL.test(rel) || rel.split('/').includes('..')) throw new Error(`Originale: ungültiger Pfad ${rel}`);
      if (!fs.existsSync(path.join(quelle, rel))) throw new Error(`Originale: ${rel} fehlt`);
      nimm(rel);
    }
  }
  return kopiert;
}

if (require.main === module) {
  const [quelle, ziel] = process.argv.slice(2);
  if (!quelle || !ziel) {
    console.error('Aufruf: node scripts/materialien_fuer_image.js <materialien> <ziel>');
    process.exit(2);
  }
  const originale = process.env.ORIGINALE_IM_IMAGE === '1';
  fs.mkdirSync(ziel, { recursive: true });
  const k = zusammenstellen(quelle, ziel, { originale });
  console.log(`Materialien fürs Image: ${k.length} Dateien${originale ? ' (mit Originalen)' : ' (ohne Originale)'}.`);
}

module.exports = { zusammenstellen };
