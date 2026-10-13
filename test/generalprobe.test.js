'use strict';
// Akte 7 „Generalprobe“ (Plan Phase 6 Task 9, Spec §3.3, §7.9, §10): eine Ermittlung „Die Ermittlerprüfung“ ohne
// Lab-Aufgaben (nur Briefing und Ermittler-Notiz), Verhör 7 als Lab-Generalprobe. Geladen wird die echte
// seed/akten/akte7.json neben der Beispielakte (welt 9).
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const H = require('./hilfen_lernen');

const AKTE7 = path.join(__dirname, '..', 'seed', 'akten', 'akte7.json');
const V7 = `${H.K17}/verhoere/7`;
const AUSW = `/api/lehrkraft/kurse/${encodeURIComponent('k:17')}/auswertung`;

async function start(einstellungen = {}) {
  const u = H.umgebung({ dateien: [AKTE7] });
  const s = await H.client(u, H.SCHUELERIN);
  H.einstellen(u.db, 'k:17', { akten: [9, 7], niveau: 'eA', verhoer: 'auto', ...einstellungen });
  return { u, s };
}

test('Laden: Akte 7 mit einer Ermittlung ohne Aufgaben und Verhör 7 (15 Aufgaben, 30 min)', async () => {
  const { u } = await start();
  const a = u.inhalte.akte(7);
  assert.ok(a, 'Akte 7 geladen');
  assert.deepEqual(a.levels.map((l) => [l.id, l.aufgaben.length, l.maxPunkte]), [['A7-E1', 0, 0]]);
  assert.equal(a.boss.pool.length, 15);
  assert.equal(a.boss.dauerMin, 30);
  const umfang = u.inhalte.umfang();
  assert.equal(umfang.welten, 2);
  assert.equal(umfang.level, 3, 'A9-E1, A9-E2 und A7-E1');
  assert.equal(umfang.bosse, 2);
});

test('Stand: Ermittlung 7.1 mit Briefing und 0 Aufgaben; Verhör 7 frei, sobald Akte 7 freigeschaltet ist', async () => {
  const { s } = await start();
  const r = await s.get(`${H.K17}/stand`);
  assert.equal(r.status, 200);
  const a7 = r.body.akten.find((a) => a.nr === 7);
  assert.equal(a7.frei, true);
  assert.equal(a7.maxPunkte, 0);
  assert.equal(a7.ermittlungen.length, 1);
  assert.equal(a7.ermittlungen[0].id, 'A7-E1');
  assert.equal(a7.ermittlungen[0].anzahl, 0);
  assert.match(a7.ermittlungen[0].briefing, /Ermittlerprüfung/);
  assert.equal(a7.verhoer.frei, true, 'keine Level-Punkte nötig');
  assert.equal(a7.verhoer.grund, null);
  // Akte 9 bleibt bei der 60-%-Regel
  assert.equal(r.body.akten.find((a) => a.nr === 9).verhoer.frei, false);
  const st = await s.get(V7);
  assert.equal(st.status, 200);
  assert.equal(st.body.frei, true);
  assert.equal(st.body.verhoer.dauerMin, 30);
  assert.equal(st.body.verhoer.anzahl, 8);
});

test('Verhör 7: gesperrt bei Kurs-Modus „gesperrt“ und solange Akte 7 nicht freigeschaltet ist', async () => {
  const { u, s } = await start({ verhoerAkten: { 7: 'gesperrt' } });
  let a7 = (await s.get(`${H.K17}/stand`)).body.akten.find((a) => a.nr === 7);
  assert.equal(a7.verhoer.frei, false);
  H.einstellen(u.db, 'k:17', { akten: [9], verhoerAkten: {} });
  a7 = (await s.get(`${H.K17}/stand`)).body.akten.find((a) => a.nr === 7);
  assert.equal(a7.frei, false);
  assert.equal((await s.post(V7 + '/start')).status, 403);
});

test('Verhör 7 starten: 8 Aufgaben (3/3/2), eA-Kurs; gA-Kurs zieht keine eA-Aufgaben', async () => {
  const { u, s } = await start();
  const r = await s.post(V7 + '/start');
  assert.equal(r.status, 200);
  assert.equal(r.body.aufgaben.length, 8);
  assert.deepEqual(r.body.aufgaben.map((a) => a.stufe), [1, 1, 1, 2, 2, 2, 3, 3]);
  const gA = H.umgebung({ dateien: [AKTE7] });
  const s2 = await H.client(gA, H.SCHUELERIN);
  H.einstellen(gA.db, 'k:17', { akten: [7], niveau: 'gA', verhoer: 'auto' });
  const r2 = await s2.post(V7 + '/start');
  assert.equal(r2.status, 200);
  const eA = new Set(['A7-V-12', 'A7-V-14', 'A7-V-15']);
  assert.ok(r2.body.aufgaben.every((a) => !eA.has(a.id)), JSON.stringify(r2.body.aufgaben.map((a) => a.id)));
  assert.ok(u);
});

test('Ermittlung A7-E1 abrufbar: Briefing, Ermittler-Notiz, keine Aufgaben', async () => {
  const { s } = await start();
  const r = await s.get(`${H.K17}/ermittlungen/A7-E1`);
  assert.equal(r.status, 200);
  assert.equal(r.body.ermittlung.titel, 'Die Ermittlerprüfung');
  assert.deepEqual(r.body.ermittlung.aufgaben, []);
  assert.ok(r.body.ermittlung.intro.some((b) => b.t === 'hinweis' && /Ermittler-Notiz/.test(b.md)));
});

test('Abzeichen: „Beweisstück“ für Verhör 7, aber kein „Akte geschlossen“ für die Akte ohne Lab-Aufgaben', async () => {
  const { s } = await start();
  const ids = (await s.get(`${H.K17}/stand`)).body.abzeichen.map((a) => a.id);
  assert.ok(ids.includes('beweisstueck-7'));
  assert.ok(!ids.includes('akte-geschlossen-7'), ids.join(', '));
  assert.ok(ids.includes('akte-geschlossen-9'));
});

test('Auswertung: keine leere Matrix-Spalte für die Ermittlung ohne Aufgaben, Spalte für Verhör 7', async () => {
  const { u } = await start();
  const l = await H.client(u, H.LEHRKRAFT);
  const r = await l.get(AUSW);
  assert.equal(r.status, 200);
  const ids = r.body.spalten.map((x) => x.id);
  assert.ok(!ids.includes('A7-E1'), ids.join(', '));
  assert.ok(ids.includes('A7-V'));
});
