'use strict';
// Probelauf Phase 8 (2b): Bedienhinweise der Interaktions-Widgets erscheinen im Lab (geduzt) UND in den gesiezten
// Verhören. Sie sind deshalb neutral formuliert (Infinitiv/Nominalstil): keine du-Formen und keine Imperative der
// 2. Person Singular in den Zeichenketten der Modellierungs-Widgets; „NULL schreibst du als NULL“ ebenso neutral.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const JS = path.join(__dirname, '..', 'public', 'static', 'js');
const DATEIEN = ['kern/modell_interaktionen.js', 'bauplan/tisch.js', 'bauplan/interaktion.js', 'bauplan/block.js', 'werkbank/werkbank.js'];
const DU = /\b(du|Du|dein|deine|deinen|deiner|dir|dich)\b/;
const IMPERATIV = /(^|[.:–]\s+|^\s*)(Tippe|tippe|Ziehe|Markiere|Lege|Zeichne|Ergänze|Wähle|wähle|Gib|Setze|setze|Verbinde|Führe|Lösche|ordne|Ordne)\b/;

/** Zeichenketten-Literale ('…', `…`) außerhalb von Kommentaren. */
function literale(quelle) {
  const ohneKommentare = quelle.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  return [...ohneKommentare.matchAll(/'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g)].map((m) => m[1] ?? m[2]).filter((s) => /\s/.test(s) && /[a-zäöü]/.test(s));
}

test('Modellierungs-Widgets: Bedienhinweise ohne du-Formen und ohne Imperativ (passen in Lab und Verhör)', () => {
  const funde = [];
  for (const d of DATEIEN) {
    for (const s of literale(fs.readFileSync(path.join(JS, d), 'utf8'))) {
      if (DU.test(s) || IMPERATIV.test(s)) funde.push(`${d}: ${s}`);
    }
  }
  assert.deepEqual(funde, []);
});

test('Ergebnistabelle (Interaktion tabelle): NULL-Hinweis neutral', () => {
  const quelle = fs.readFileSync(path.join(JS, 'kern/interaktionen.js'), 'utf8');
  assert.doesNotMatch(quelle, /NULL schreibst du/);
  assert.doesNotMatch(quelle, /Zeilen fügst du/);
});
