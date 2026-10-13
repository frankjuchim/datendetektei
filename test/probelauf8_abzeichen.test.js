'use strict';
// Probelauf Phase 8 (Bereich 2c): Abzeichen nach Kurs-Niveau. Im gA-Kurs gibt es Akte 5 nicht (Spec §3.4) – ihre
// Abzeichen „Akte geschlossen“ und „Beweisstück“ dürfen dort nicht als (unerreichbare) Abzeichen erscheinen.

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const H = require('./hilfen_lernen');

const AKTE5 = path.join(__dirname, '..', 'seed', 'akten', 'akte5.json');

async function abzeichenIds(niveau) {
  const u = H.umgebung({ dateien: [AKTE5] });
  const s = await H.client(u, H.SCHUELERIN);
  H.einstellen(u.db, 'k:17', { akten: [5, 9], niveau });
  const st = (await s.get(H.K17 + '/stand')).body;
  return st.abzeichen.map((a) => a.id);
}

test('Abzeichen: eA-Kurs zeigt die Abzeichen der Akte 5', async () => {
  const ids = await abzeichenIds('eA');
  assert.ok(ids.includes('akte-geschlossen-5'));
  assert.ok(ids.includes('beweisstueck-5'));
});

test('Abzeichen: gA-Kurs zeigt keine Abzeichen der Akte 5 (dort nicht erreichbar)', async () => {
  const ids = await abzeichenIds('gA');
  assert.ok(!ids.includes('akte-geschlossen-5'), ids.join(','));
  assert.ok(!ids.includes('beweisstueck-5'), ids.join(','));
  assert.ok(ids.includes('akte-geschlossen-9'));
});
