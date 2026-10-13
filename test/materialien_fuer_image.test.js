'use strict';
// Materialien fürs Docker-Image (Spec §12.4): nur PDFs + Whitelists, Originale nur mit ORIGINALE_IM_IMAGE=1.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { zusammenstellen } = require('../scripts/materialien_fuer_image');

function baue() {
  const q = fs.mkdtempSync(path.join(os.tmpdir(), 'dd-mat-'));
  const schreibe = (rel, inhalt = 'x') => {
    fs.mkdirSync(path.dirname(path.join(q, rel)), { recursive: true });
    fs.writeFileSync(path.join(q, rel), inhalt);
  };
  schreibe('Arbeitsblaetter_PDF/verzeichnis.json', '{"dateien":[]}');
  schreibe('Arbeitsblaetter_PDF/DD_A1-AB1.pdf');
  schreibe('Arbeitsblaetter_PDF/quellen.json', '{}');
  schreibe('Loesungen_Portal/DD_A1-AB1_Loesung.pdf');
  schreibe('Gast_PDF/verzeichnis.json', '{"dateien":[]}');
  schreibe('Akte1_Fundbuero/2_Arbeitsblaetter/DD_A1_AB1.docx');
  schreibe('_Muster/DD_Muster_AB.docx');
  schreibe('Originale/verzeichnis.json', JSON.stringify({ dateien: [{ datei: 'Akte1_Fundbuero/2_Arbeitsblaetter/DD_A1_AB1.docx' }] }));
  return q;
}

test('ohne Originale: nur PDFs und Whitelists', () => {
  const q = baue();
  const k = zusammenstellen(q, path.join(q, '..', path.basename(q) + '-ziel'));
  assert.deepEqual(k.sort(), ['Arbeitsblaetter_PDF/DD_A1-AB1.pdf', 'Arbeitsblaetter_PDF/verzeichnis.json', 'Gast_PDF/verzeichnis.json',
    'Loesungen_Portal/DD_A1-AB1_Loesung.pdf', 'Originale/verzeichnis.json']);
});

test('mit Originalen: gelistete docx dazu, Muster nie; ungültige Pfade sind Fehler', () => {
  const q = baue();
  const k = zusammenstellen(q, fs.mkdtempSync(path.join(os.tmpdir(), 'dd-ziel-')), { originale: true });
  assert.ok(k.includes('Akte1_Fundbuero/2_Arbeitsblaetter/DD_A1_AB1.docx'));
  assert.ok(!k.some((d) => d.includes('_Muster')));
  fs.writeFileSync(path.join(q, 'Originale/verzeichnis.json'), JSON.stringify({ dateien: [{ datei: '../package.json' }] }));
  assert.throws(() => zusammenstellen(q, fs.mkdtempSync(path.join(os.tmpdir(), 'dd-ziel-')), { originale: true }), /ungültiger Pfad/);
});
