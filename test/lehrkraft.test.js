'use strict';
// Kurs-Einstellungen für Lehrkräfte (Plan Phase 3 Task 6, Review Focus 1): GET /api/lehrkraft/kurse und
// PUT /api/lehrkraft/kurse/:kurs/einstellungen – Rechte je Rolle, Validierung, gesperrter Kurs, Wirkung auf den
// Stand der Schüler, CSRF/Origin, keine Lösungsdaten.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const request = require('supertest');
const H = require('./hilfen_lernen');
const { musterantwort } = require('../src/content/pruefer');

const AKTE2 = path.join(__dirname, '..', 'seed', 'akten', 'akte2.json');
const LISTE = '/api/lehrkraft/kurse';
const EINST = (kurs) => `/api/lehrkraft/kurse/${encodeURIComponent(kurs)}/einstellungen`;
const LEHRKRAFT18 = { sub: 'l:8', rolle: 'lehrkraft', name: 'Herr P.', kurse: [{ id: 'k:18', name: 'Inf-GK 12', rolle: 'lehrkraft' }] };

async function start(opt = {}) {
  const u = H.umgebung(opt);
  const s = await H.client(u, H.SCHUELERIN);
  const s2 = await H.client(u, H.SCHUELER2);
  const fremd = await H.client(u, H.FREMD);
  const l = await H.client(u, H.LEHRKRAFT);
  const l18 = await H.client(u, LEHRKRAFT18);
  const admin = await H.client(u, H.SUPERADMIN);
  H.einstellen(u.db, 'k:17', { akten: [9], niveau: 'eA' });
  H.einstellen(u.db, 'k:18', { akten: [9], niveau: 'eA' });
  const put = (c, kurs, body) =>
    request(u.app).put(EINST(kurs)).set('Cookie', c.cookie).set('Origin', u.konfig.plattformUrl).send(body);
  return { u, s, s2, fremd, l, l18, admin, put };
}

const einstellungenIn = (db, kurs) => JSON.parse(db.prepare('SELECT einstellungen FROM kurse WHERE kurs_id = ?').get(kurs).einstellungen);
const GUELTIG = { akten: [1, 2], niveau: 'eA', verhoer: 'offen' };

/* ---------------------------------------------------------------- GET /api/lehrkraft/kurse */

test('GET kurse: ohne Sitzung 401, Schüler 403', async () => {
  const { u, s } = await start();
  assert.equal((await request(u.app).get(LISTE)).status, 401);
  assert.equal((await s.get(LISTE)).status, 403);
});

test('GET kurse: Lehrkraft sieht nur ihre Kurse mit Einstellungen und Kennzahlen', async () => {
  const { l } = await start();
  const r = await l.get(LISTE);
  assert.equal(r.status, 200);
  assert.equal(r.headers['cache-control'], 'no-store');
  assert.deepEqual(r.body.kurse.map((k) => k.id), ['k:17']);
  const k = r.body.kurse[0];
  assert.equal(k.name, 'Inf-LK 12');
  assert.equal(k.aktiv, true);
  assert.equal(k.nurLesen, false);
  assert.deepEqual(k.einstellungen, { akten: [9], niveau: 'eA', verhoer: 'auto', verhoerAkten: {}, scoreboard: false, beamer: false });
  assert.deepEqual(k.board, { aktiv: false, schluessel: null });
  assert.equal(k.kennzahlen.schueler, 2);
  assert.equal(k.kennzahlen.anteil, 0);
  // Auswahl für die Oberfläche: Akten 1–7 mit Niveaus und die Kür (8, nur eA)
  assert.deepEqual(r.body.akten.map((a) => a.nr), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.deepEqual(r.body.akten.find((a) => a.nr === 5).niveaus, ['eA']);
  assert.deepEqual(r.body.akten.find((a) => a.nr === 8), { nr: 8, titel: 'Kür: Eigene Datenbank bauen', niveaus: ['eA'], kuer: true });
});

test('GET kurse: Kennzahlen = Anzahl Schüler und Durchschnitts-Anteil (ohne Namen)', async () => {
  const { u, s, l } = await start();
  const r1 = await s.post(H.K17 + '/aufgaben/A9-E1-02/pruefen', { antwort: musterantwort(u.inhalte.aufgabe('A9-E1-02')) });
  assert.equal(r1.status, 200);
  const kz = u.app.locals.stand.kennzahlen('k:17', ['s:1042', 's:1043']);
  const erwartet = [...kz.schueler.values()].reduce((x, w) => x + w.anteil, 0) / 2;
  const k = (await l.get(LISTE)).body.kurse[0];
  assert.equal(k.kennzahlen.schueler, 2);
  assert.ok(erwartet > 0);
  assert.ok(Math.abs(k.kennzahlen.anteil - erwartet) < 1e-9);
  const text = JSON.stringify(k);
  assert.ok(!text.includes('Lena') && !text.includes('s:1042'), 'keine Namen oder subs');
});

test('GET kurse: Superadmin sieht alle Kurse', async () => {
  const { admin } = await start();
  const r = await admin.get(LISTE);
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.kurse.map((k) => k.id), ['k:17', 'k:18']);
});

test('GET kurse: gesperrter Kurs wird nur lesend geliefert', async () => {
  const { u, l } = await start();
  u.db.prepare("UPDATE kurse SET aktiv = 0 WHERE kurs_id = 'k:17'").run();
  const k = (await l.get(LISTE)).body.kurse[0];
  assert.equal(k.aktiv, false);
  assert.equal(k.nurLesen, true);
});

test('GET kurse: liefert keine Lösungsdaten', async () => {
  const { l } = await start();
  const text = JSON.stringify((await l.get(LISTE)).body);
  for (const a of H.beispiel().aufgaben) {
    if (a.loesung && typeof a.loesung.sql === 'string') assert.ok(!text.includes(a.loesung.sql), a.id);
    assert.ok(!text.includes('"loesung"') && !text.includes('"erklaerung"') && !text.includes('"tipps"'));
  }
});

/* ---------------------------------------------------------------- PUT einstellungen: Rechte */

test('PUT einstellungen: ohne Sitzung 401', async () => {
  const { u } = await start();
  const r = await request(u.app).put(EINST('k:17')).set('Origin', u.konfig.plattformUrl).send(GUELTIG);
  assert.equal(r.status, 401);
});

test('PUT einstellungen: Schüler 403, fremde Lehrkraft 403, unbekannter Kurs 403', async () => {
  const { u, s, l18, l, put } = await start();
  assert.equal((await put(s, 'k:17', GUELTIG)).status, 403);
  assert.equal((await put(l18, 'k:17', GUELTIG)).status, 403);
  assert.equal((await put(l, 'k:18', GUELTIG)).status, 403);
  assert.equal((await put(l, 'k:999', GUELTIG)).status, 403);
  assert.deepEqual(einstellungenIn(u.db, 'k:17').akten, [9]);
});

test('PUT einstellungen: Lehrkraft des Kurses und Superadmin ok; andere Einstellungen bleiben', async () => {
  const { u, l, admin, put } = await start();
  H.einstellen(u.db, 'k:17', { scoreboard: true, beamer: true });
  const r = await put(l, 'k:17', GUELTIG);
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.kurs.einstellungen, { akten: [1, 2], niveau: 'eA', verhoer: 'offen', verhoerAkten: {}, scoreboard: true, beamer: true });
  const e = einstellungenIn(u.db, 'k:17');
  assert.deepEqual(e.akten, [1, 2]);
  assert.equal(e.verhoer, 'offen');
  assert.equal(e.scoreboard, true);
  assert.equal(e.beamer, true);

  const r2 = await put(admin, 'k:18', { akten: [3, 1, 1], niveau: 'gA', verhoer: 'gesperrt' });
  assert.equal(r2.status, 200);
  assert.deepEqual(einstellungenIn(u.db, 'k:18').akten, [1, 3]);
  assert.equal(einstellungenIn(u.db, 'k:18').niveau, 'gA');
});

test('PUT einstellungen: Teil-Änderung lässt die übrigen Werte stehen', async () => {
  const { u, l, put } = await start();
  assert.equal((await put(l, 'k:17', { verhoer: 'gesperrt' })).status, 200);
  const e = einstellungenIn(u.db, 'k:17');
  assert.deepEqual(e.akten, [9]);
  assert.equal(e.niveau, 'eA');
  assert.equal(e.verhoer, 'gesperrt');
});

test('PUT einstellungen: gesperrter Kurs → 403 (nur lesend), auch für den Superadmin', async () => {
  const { u, l, admin, put } = await start();
  u.db.prepare("UPDATE kurse SET aktiv = 0 WHERE kurs_id = 'k:17'").run();
  const r = await put(l, 'k:17', GUELTIG);
  assert.equal(r.status, 403);
  assert.match(r.body.error, /gesperrt/);
  assert.equal((await put(admin, 'k:17', GUELTIG)).status, 403);
  assert.deepEqual(einstellungenIn(u.db, 'k:17').akten, [9]);
});

/* ---------------------------------------------------------------- PUT einstellungen: Validierung */

test('PUT einstellungen: Validierung (400 mit deutschem Text, nichts gespeichert)', async () => {
  const { u, l, put } = await start();
  const falsch = [
    {},
    [],
    { akten: [0] },
    { akten: [10] },
    { akten: [9] },
    { akten: [1.5] },
    { akten: ['1'] },
    { akten: 1 },
    { akten: null },
    { niveau: 'ea' },
    { niveau: 'GA' },
    { verhoer: 'immer' },
    { verhoer: '' },
    { akten: [1], scoreboard: 'an' },
    { akten: [1], beamer: 1 },
    { akten: [1], unbekannt: 1 },
    { akten: [1, 5], niveau: 'gA' },
    { akten: [1, 8], niveau: 'gA' }
  ];
  for (const body of falsch) {
    const r = await put(l, 'k:17', body);
    assert.equal(r.status, 400, JSON.stringify(body));
    assert.equal(typeof r.body.error, 'string');
  }
  // gA bei bereits freigeschalteter Akte 5 → 400
  assert.equal((await put(l, 'k:17', { akten: [1, 5] })).status, 200);
  assert.equal((await put(l, 'k:17', { niveau: 'gA' })).status, 400);
  const e = einstellungenIn(u.db, 'k:17');
  assert.deepEqual(e.akten, [1, 5]);
  assert.equal(e.niveau, 'eA');
  // ungültige Kurs-ID
  assert.equal((await put(l, '17', GUELTIG)).status, 400);
  // leeres Akten-Array ist erlaubt (alle Akten zu)
  assert.equal((await put(l, 'k:17', { akten: [] })).status, 200);
});

/* ---------------------------------------------------------------- CSRF/Origin */

test('PUT einstellungen: ohne oder mit fremder Origin 403, ohne JSON 415', async () => {
  const { u, l } = await start();
  const ohne = await request(u.app).put(EINST('k:17')).set('Cookie', l.cookie).send(GUELTIG);
  assert.equal(ohne.status, 403);
  const fremd = await request(u.app).put(EINST('k:17')).set('Cookie', l.cookie).set('Origin', 'https://boese.example').send(GUELTIG);
  assert.equal(fremd.status, 403);
  const text = await request(u.app)
    .put(EINST('k:17'))
    .set('Cookie', l.cookie)
    .set('Origin', u.konfig.plattformUrl)
    .set('Content-Type', 'text/plain')
    .send('akten=1');
  assert.equal(text.status, 415);
  assert.deepEqual(einstellungenIn(u.db, 'k:17').akten, [9]);
});

/* ---------------------------------------------------------------- Wirkung */

test('Wirkung: nach Freischalten von Akte 2 sieht der Schüler sie im Stand', async () => {
  const { s, l, put } = await start({ dateien: [AKTE2] });
  const vorher = (await s.get(H.K17 + '/stand')).body.akten.find((a) => a.nr === 2);
  assert.equal(vorher.freigeschaltet, false);
  assert.deepEqual(vorher.ermittlungen, []);
  assert.equal((await put(l, 'k:17', { akten: [2] })).status, 200);
  const nachher = (await s.get(H.K17 + '/stand')).body.akten.find((a) => a.nr === 2);
  assert.equal(nachher.freigeschaltet, true);
  assert.ok(nachher.ermittlungen.length > 0);
  assert.equal((await s.get(H.K17 + '/ermittlungen/A2-E1')).status, 200);
});

test('Wirkung: Niveau gA blendet eA-Ermittlungen aus', async () => {
  const { s, l, put } = await start();
  const ids = async () => (await s.get(H.K17 + '/stand')).body.akten.find((a) => a.nr === 9).ermittlungen.map((e) => e.id);
  assert.deepEqual(await ids(), ['A9-E1', 'A9-E2']);
  assert.equal((await put(l, 'k:17', { niveau: 'gA' })).status, 200);
  assert.deepEqual(await ids(), ['A9-E1']);
  assert.equal((await s.get(H.K17 + '/ermittlungen/A9-E2')).status, 404);
  assert.equal((await s.get(H.K17 + '/stand')).body.kurs.niveau, 'gA');
});

test('Wirkung: Verhör-Modus gesperrt sperrt das Verhör im Stand', async () => {
  const { s, l, put } = await start();
  assert.equal((await put(l, 'k:17', { verhoer: 'gesperrt' })).status, 200);
  const v = (await s.get(H.K17 + '/stand')).body.akten.find((a) => a.nr === 9).verhoer;
  assert.equal(v.frei, false);
  assert.match(v.grund, /gesperrt/);
  assert.equal((await put(l, 'k:17', { verhoer: 'offen' })).status, 200);
  assert.equal((await s.get(H.K17 + '/stand')).body.akten.find((a) => a.nr === 9).verhoer.frei, true);
});
