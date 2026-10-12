'use strict';
// Kontrastprüfung (DESIGN.md §3, WCAG 2.1 AA): Formel, Tokens aus tokens.css, alle Paarungen, Skript-Exit-Code.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { kontrastVerhaeltnis, leseTokens, pruefePaare, PAARE } = require('../scripts/kontrast_pruefen');

const nah = (a, b, toleranz = 0.01) => Math.abs(a - b) <= toleranz;

test('kontrastVerhaeltnis nach WCAG 2.1', () => {
  assert.ok(kontrastVerhaeltnis('#1C2B3A', '#F4EDE1') > 4.5);
  assert.ok(nah(kontrastVerhaeltnis('#1C2B3A', '#F4EDE1'), 12.4));
  assert.ok(nah(kontrastVerhaeltnis('#FFFFFF', '#000000'), 21));
  assert.equal(kontrastVerhaeltnis('#B3261E', '#B3261E'), 1);
  assert.equal(kontrastVerhaeltnis('#FFFDF8', '#1C2B3A'), kontrastVerhaeltnis('#1C2B3A', '#FFFDF8'));
  assert.equal(kontrastVerhaeltnis('#fff', '#000'), kontrastVerhaeltnis('#FFFFFF', '#000000'));
  assert.throws(() => kontrastVerhaeltnis('rot', '#000'));
});

test('leseTokens liest hell und dunkel aus tokens.css', () => {
  const { hell, dunkel } = leseTokens();
  assert.equal(hell.tinte, '#1C2B3A');
  assert.equal(dunkel.tinte, '#E8E1D3');
  assert.equal(hell['siegelrot-text'], '#B3261E');
  assert.equal(dunkel['siegelrot-text'], '#EF7068');
  assert.equal(dunkel['sql-schluessel'], '#F2A65A', 'dunkel erbt unveränderte Tokens von hell');
});

test('Paarungsliste deckt DESIGN.md §3 ab (hell und dunkel)', () => {
  const hell = PAARE.filter((p) => p.modus === 'hell');
  const dunkel = PAARE.filter((p) => p.modus === 'dunkel');
  assert.ok(hell.length >= 40, `hell: ${hell.length}`);
  assert.ok(dunkel.length >= 40, `dunkel: ${dunkel.length}`);
  for (const p of PAARE) assert.ok([3, 4.5].includes(p.soll), JSON.stringify(p));
});

test('alle Token-Paarungen erfüllen AA', () => {
  const ergebnisse = pruefePaare(leseTokens(), PAARE);
  const verstoesse = ergebnisse.filter((e) => !e.ok);
  assert.deepEqual(verstoesse, []);
  // Stichproben gegen die Tabelle in DESIGN.md §3
  const finde = (modus, vorder, hinter) => ergebnisse.find((e) => e.modus === modus && e.vorder === vorder && e.hinter === hinter);
  assert.ok(nah(finde('dunkel', 'siegelrot', 'karte').verhaeltnis, 4.17));
  assert.ok(nah(finde('dunkel', 'siegelrot-text', 'karte').verhaeltnis, 5.31));
  assert.ok(nah(finde('hell', 'messing-text', 'karte').verhaeltnis, 5.99));
});

test('npm run kontrast: Exit 0 und ✔-Liste', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, '..', 'scripts', 'kontrast_pruefen.js')], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /✔/);
  assert.doesNotMatch(r.stdout, /✘/);
});
