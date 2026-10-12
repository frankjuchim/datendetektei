'use strict';
// Verbund-API (Vertrag §6, INTEGRATION §4/§5) und Rate-Limits – inkl. Review Focus 5.
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { testApp, verbundToken, neuesSchluesselpaar } = require('./helpers');
const { upsertAusToken } = require('../src/kern/konten');
const { rateLimit } = require('../src/kern/sicherheit');

const jetztSek = () => Math.floor(Date.now() / 1000);
const UNGUELTIG = { error: 'Token ungültig.' };

function lena(db) {
  upsertAusToken(db, {
    sub: 's:1042',
    rolle: 'schueler',
    name: 'Lena K.',
    kurse: [{ id: 'k:17', name: 'Inf-LK 12', rolle: 'mitglied' }]
  });
}

function post(t, pfad, token, body) {
  let r = request(t.app).post(pfad);
  if (token) r = r.set('Authorization', 'Bearer ' + token);
  return body === undefined ? r : r.send(body);
}
function get(t, pfad, token) {
  const r = request(t.app).get(pfad);
  return token ? r.set('Authorization', 'Bearer ' + token) : r;
}
const tok = (t, zweck, extra) => verbundToken(t.schluessel, t.konfig, zweck, extra);

/* ---------- Authentifizierung (INTEGRATION §5) ---------- */

test('ohne Token', async () => {
  const t = testApp();
  for (const res of [
    await post(t, '/api/verbund/loeschen', null, { sub: 's:1' }),
    await get(t, '/api/verbund/kurse/k%3A17/uebersicht'),
    await post(t, '/api/verbund/kurse/k%3A17', null, { name: 'x' }),
    await request(t.app).post('/api/verbund/loeschen').set('Authorization', 'Basic abc').send({ sub: 's:1' }),
    await request(t.app).post('/api/verbund/loeschen').set('Authorization', 'Bearer ').send({ sub: 's:1' })
  ]) {
    assert.equal(res.status, 401);
    assert.deepEqual(res.body, UNGUELTIG);
  }
});

test('falsches aud', async () => {
  const t = testApp();
  const res = await post(t, '/api/verbund/loeschen', tok(t, 'loeschen', { aud: 'algoquest' }), { sub: 's:1' });
  assert.equal(res.status, 401);
  assert.deepEqual(res.body, UNGUELTIG);
});

test('falsches iss und falsche Signatur', async () => {
  const t = testApp();
  assert.equal((await post(t, '/api/verbund/loeschen', tok(t, 'loeschen', { iss: 'https://boese.example' }), { sub: 's:1' })).status, 401);
  const fremd = verbundToken(neuesSchluesselpaar(), t.konfig, 'loeschen');
  assert.equal((await post(t, '/api/verbund/loeschen', fremd, { sub: 's:1' })).status, 401);
});

test('falscher zweck', async () => {
  const t = testApp();
  lena(t.db);
  assert.equal((await post(t, '/api/verbund/loeschen', tok(t, 'kurs-aendern'), { sub: 's:1' })).status, 401);
  assert.equal((await get(t, '/api/verbund/kurse/k%3A17/uebersicht', tok(t, 'loeschen'))).status, 401);
  assert.equal((await post(t, '/api/verbund/kurse/k%3A17', tok(t, 'kurs-uebersicht'), { name: 'x' })).status, 401);
  assert.equal((await post(t, '/api/verbund/loeschen', tok(t, undefined), { sub: 's:1' })).status, 401, 'zweck fehlt');
});

test('exp − iat > 60', async () => {
  const t = testApp();
  const j = jetztSek();
  const res = await post(t, '/api/verbund/loeschen', tok(t, 'loeschen', { iat: j, exp: j + 61 }), { sub: 's:1' });
  assert.equal(res.status, 401);
  assert.deepEqual(res.body, UNGUELTIG);
  // genau 60 s ist erlaubt (so stellt das Portal aus)
  assert.equal((await post(t, '/api/verbund/loeschen', tok(t, 'loeschen', { iat: j, exp: j + 60 }), { sub: 's:1' })).status, 200);
});

test('abgelaufen (auch nach der Uhr aus konfig.jetzt)', async () => {
  const t = testApp();
  const j = jetztSek();
  assert.equal((await post(t, '/api/verbund/loeschen', tok(t, 'loeschen', { iat: j - 100, exp: j - 50 }), { sub: 's:1' })).status, 401);
  const spaeter = testApp({ jetzt: () => Date.now() + 10 * 60 * 1000 });
  assert.equal((await post(spaeter, '/api/verbund/loeschen', tok(spaeter, 'loeschen'), { sub: 's:1' })).status, 401);
});

test('wiederverwendet', async () => {
  const t = testApp();
  const einmal = tok(t, 'loeschen');
  assert.equal((await post(t, '/api/verbund/loeschen', einmal, { sub: 's:1' })).status, 200);
  const res = await post(t, '/api/verbund/loeschen', einmal, { sub: 's:1' });
  assert.equal(res.status, 401);
  assert.deepEqual(res.body, UNGUELTIG);
});

test('sub nicht portal', async () => {
  const t = testApp();
  const res = await post(t, '/api/verbund/loeschen', tok(t, 'loeschen', { sub: 's:1042' }), { sub: 's:1' });
  assert.equal(res.status, 401);
  assert.deepEqual(res.body, UNGUELTIG);
});

test('SSO-Token (anderer jti-Speicher, kein zweck) wird von der Verbund-API abgelehnt', async () => {
  const { ssoToken } = require('./helpers');
  const t = testApp();
  assert.equal((await post(t, '/api/verbund/loeschen', ssoToken(t.schluessel, t.konfig), { sub: 's:1' })).status, 401);
});

/* ---------- loeschen ---------- */

test('loeschen sub zweimal', async () => {
  const t = testApp();
  lena(t.db);
  const r1 = await post(t, '/api/verbund/loeschen', tok(t, 'loeschen'), { sub: 's:1042' });
  assert.equal(r1.status, 200);
  assert.ok(r1.body.geloescht > 0, JSON.stringify(r1.body));
  assert.deepEqual(Object.keys(r1.body), ['geloescht']);
  assert.equal(t.db.prepare('SELECT COUNT(*) AS n FROM konten').get().n, 0);
  const r2 = await post(t, '/api/verbund/loeschen', tok(t, 'loeschen'), { sub: 's:1042' });
  assert.equal(r2.status, 200);
  assert.deepEqual(r2.body, { geloescht: 0 });
});

test('loeschen kurs entfernt Kurs und Mitgliedschaften', async () => {
  const t = testApp();
  lena(t.db);
  const res = await post(t, '/api/verbund/loeschen', tok(t, 'loeschen'), { kurs: 'k:17' });
  assert.equal(res.status, 200);
  assert.equal(res.body.geloescht, 2);
  assert.equal(t.db.prepare('SELECT COUNT(*) AS n FROM kurse').get().n, 0);
  assert.equal(t.db.prepare('SELECT COUNT(*) AS n FROM mitgliedschaften').get().n, 0);
  assert.equal(t.db.prepare('SELECT COUNT(*) AS n FROM konten').get().n, 1, 'Konto bleibt');
  const zweit = await post(t, '/api/verbund/loeschen', tok(t, 'loeschen'), { kurs: 'k:17' });
  assert.deepEqual(zweit.body, { geloescht: 0 });
});

test('loeschen ohne sub und kurs → 400', async () => {
  const t = testApp();
  const res = await post(t, '/api/verbund/loeschen', tok(t, 'loeschen'), {});
  assert.equal(res.status, 400);
  assert.equal(typeof res.body.error, 'string');
});

test('loeschen mit beiden Feldern sub und kurs → 400', async () => {
  const t = testApp();
  lena(t.db);
  const res = await post(t, '/api/verbund/loeschen', tok(t, 'loeschen'), { sub: 's:1042', kurs: 'k:17' });
  assert.equal(res.status, 400);
  assert.equal(t.db.prepare('SELECT COUNT(*) AS n FROM konten').get().n, 1, 'nichts gelöscht');
});

test('loeschen mit gültigem, aber unbekanntem sub → 200 geloescht 0', async () => {
  const t = testApp();
  const res = await post(t, '/api/verbund/loeschen', tok(t, 'loeschen'), { sub: 'l:999' });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { geloescht: 0 });
});

test('loeschen mit ungültigem Format → 400', async () => {
  const t = testApp();
  for (const body of [{ sub: 'x:1' }, { sub: 's:' }, { sub: 17 }, { kurs: '17' }, { kurs: 'k:1a' }, { sub: null }, [{ sub: 's:1' }]]) {
    const res = await post(t, '/api/verbund/loeschen', tok(t, 'loeschen'), body);
    assert.equal(res.status, 400, JSON.stringify(body));
  }
});

test('Nicht-JSON-Body bei POST → 415 erst nach der Authentifizierung', async () => {
  const t = testApp();
  const ohneToken = await request(t.app).post('/api/verbund/loeschen').set('Content-Type', 'text/plain').send('sub=s:1');
  assert.equal(ohneToken.status, 401);
  const mitToken = await request(t.app)
    .post('/api/verbund/loeschen')
    .set('Authorization', 'Bearer ' + tok(t, 'loeschen'))
    .set('Content-Type', 'text/plain')
    .send('sub=s:1');
  assert.equal(mitToken.status, 415);
  const kaputt = await request(t.app)
    .post('/api/verbund/loeschen')
    .set('Authorization', 'Bearer ' + tok(t, 'loeschen'))
    .set('Content-Type', 'application/json')
    .send('{kaputt');
  assert.equal(kaputt.status, 400);
  const kaputtOhne = await request(t.app).post('/api/verbund/loeschen').set('Content-Type', 'application/json').send('{kaputt');
  assert.equal(kaputtOhne.status, 401, 'kaputtes JSON ohne Token: erst 401');
  const leer = await request(t.app).post('/api/verbund/kurse/k%3A17').set('Authorization', 'Bearer ' + tok(t, 'kurs-aendern'));
  assert.equal(leer.status, 415, 'ohne Body kein JSON');
});

/* ---------- Kursübersicht ---------- */

test('uebersicht unbekannter Kurs → 404', async () => {
  const t = testApp();
  const res = await get(t, '/api/verbund/kurse/k%3A99/uebersicht', tok(t, 'kurs-uebersicht'));
  assert.equal(res.status, 404);
  assert.equal(typeof res.body.error, 'string');
});

test('uebersicht bekannter Kurs: Format §6, enthält keine Namen', async () => {
  const t = testApp();
  lena(t.db);
  const res = await get(t, '/api/verbund/kurse/k%3A17/uebersicht', tok(t, 'kurs-uebersicht'));
  assert.equal(res.status, 200);
  assert.deepEqual(Object.keys(res.body).sort(), ['kurs', 'schueler', 'stand', 'welten']);
  assert.equal(res.body.kurs, 'k:17');
  assert.match(res.body.stand, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  assert.equal(res.body.schueler.length, 1);
  assert.deepEqual(Object.keys(res.body.schueler[0]).sort(), ['anteil', 'geloest', 'punkte', 'sub', 'zuletzt']);
  assert.equal(res.body.schueler[0].sub, 's:1042');
  assert.equal(res.body.welten.length, 7);
  assert.deepEqual(Object.keys(res.body.welten[0]).sort(), ['anteil', 'nr', 'titel']);
  const json = JSON.stringify(res.body);
  assert.ok(!json.includes('Lena'), 'kein Schülername');
  assert.ok(!json.includes('Inf-LK'), 'kein Kursname');
});

test('kursId URL-kodiert k%3A17 wird erkannt', async () => {
  const t = testApp();
  lena(t.db);
  assert.equal((await get(t, '/api/verbund/kurse/k%3A17/uebersicht', tok(t, 'kurs-uebersicht'))).status, 200);
  assert.equal((await get(t, '/api/verbund/kurse/k:17/uebersicht', tok(t, 'kurs-uebersicht'))).status, 200);
  assert.equal((await post(t, '/api/verbund/kurse/k%3A17', tok(t, 'kurs-aendern'), { name: 'LK Informatik 13' })).status, 200);
  assert.equal(t.db.prepare("SELECT name FROM kurse WHERE kurs_id = 'k:17'").get().name, 'LK Informatik 13');
});

test('ungültige kursId → 400 erst nach der Authentifizierung', async () => {
  const t = testApp();
  assert.equal((await get(t, '/api/verbund/kurse/17/uebersicht', tok(t, 'kurs-uebersicht'))).status, 400);
  assert.equal((await get(t, '/api/verbund/kurse/k%3Ax/uebersicht', tok(t, 'kurs-uebersicht'))).status, 400);
  assert.equal((await post(t, '/api/verbund/kurse/kurs17', tok(t, 'kurs-aendern'), { name: 'x' })).status, 400);
  assert.equal((await get(t, '/api/verbund/kurse/17/uebersicht')).status, 401);
});

/* ---------- Kurs ändern ---------- */

test('kurs-aendern unbekannter Kurs legt an', async () => {
  const t = testApp();
  const res = await post(t, '/api/verbund/kurse/k%3A40', tok(t, 'kurs-aendern'), { name: 'Inf-GK 13' });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { ok: true });
  assert.deepEqual(t.db.prepare("SELECT name, aktiv FROM kurse WHERE kurs_id = 'k:40'").get(), { name: 'Inf-GK 13', aktiv: 1 });
});

test('kurs-aendern aktiv false sperrt, true entsperrt', async () => {
  const t = testApp();
  lena(t.db);
  assert.deepEqual((await post(t, '/api/verbund/kurse/k%3A17', tok(t, 'kurs-aendern'), { aktiv: false })).body, { ok: true });
  assert.equal(t.db.prepare("SELECT aktiv FROM kurse WHERE kurs_id = 'k:17'").get().aktiv, 0);
  assert.equal(t.db.prepare("SELECT name FROM kurse WHERE kurs_id = 'k:17'").get().name, 'Inf-LK 12', 'Name unverändert');
  await post(t, '/api/verbund/kurse/k%3A17', tok(t, 'kurs-aendern'), { aktiv: true });
  assert.equal(t.db.prepare("SELECT aktiv FROM kurse WHERE kurs_id = 'k:17'").get().aktiv, 1);
});

test('kurs-aendern mit ungültigem Body → 400', async () => {
  const t = testApp();
  for (const body of [{ name: '' }, { name: 'x'.repeat(101) }, { name: 17 }, { aktiv: 'false' }, { aktiv: 0 }, [1]]) {
    const res = await post(t, '/api/verbund/kurse/k%3A17', tok(t, 'kurs-aendern'), body);
    assert.equal(res.status, 400, JSON.stringify(body));
  }
  assert.equal(t.db.prepare('SELECT COUNT(*) AS n FROM kurse').get().n, 0);
});

/* ---------- Rate-Limits ---------- */

test('Rate-Limit greift', async () => {
  const t = testApp({ rateLimits: { verbund: { fensterMs: 60000, max: 3 } } });
  for (let i = 0; i < 3; i++) assert.equal((await post(t, '/api/verbund/loeschen', tok(t, 'loeschen'), { sub: 's:1' })).status, 200);
  const res = await post(t, '/api/verbund/loeschen', tok(t, 'loeschen'), { sub: 's:1' });
  assert.equal(res.status, 429);
  assert.match(res.headers['retry-after'], /^\d+$/);
  assert.equal(typeof res.body.error, 'string');
  // gesamt: auch andere Verbund-Endpunkte und ungültige Anfragen zählen
  assert.equal((await get(t, '/api/verbund/kurse/k%3A17/uebersicht')).status, 429);
});

test('Rate-Limit für /sso/* je IP, Fenster läuft ab (Uhr aus konfig.jetzt)', async () => {
  let uhr = Date.now();
  const t = testApp({ jetzt: () => uhr, rateLimits: { sso: { fensterMs: 60000, max: 3 } } });
  for (let i = 0; i < 3; i++) assert.equal((await request(t.app).get('/sso/start')).status, 302);
  const zuViel = await request(t.app).get('/sso/ende');
  assert.equal(zuViel.status, 429);
  assert.match(zuViel.headers['retry-after'], /^\d+$/);
  assert.equal((await request(t.app).get('/healthz')).status, 200, 'andere Pfade nicht betroffen');
  uhr += 61000;
  assert.equal((await request(t.app).get('/sso/start')).status, 302);
});

test('Standard-Rate-Limits: /sso/* 30 je Minute', async () => {
  const t = testApp();
  for (let i = 0; i < 30; i++) assert.equal((await request(t.app).get('/sso/start')).status, 302);
  assert.equal((await request(t.app).get('/sso/start')).status, 429);
});

test('rateLimit: Schlüssel trennt Zähler', () => {
  let uhr = 0;
  const mw = rateLimit({ fensterMs: 1000, max: 1, schluessel: (req) => req.ip, jetzt: () => uhr });
  const lauf = (ip) => {
    let status = 200;
    const res = { set() { return res; }, status(s) { status = s; return res; }, json() { return res; }, type() { return res; }, send() { return res; } };
    let weiter = false;
    mw({ ip, baseUrl: '', path: '/x' }, res, () => (weiter = true));
    return weiter ? 200 : status;
  };
  assert.equal(lauf('1.1.1.1'), 200);
  assert.equal(lauf('2.2.2.2'), 200);
  assert.equal(lauf('1.1.1.1'), 429);
  uhr = 1001;
  assert.equal(lauf('1.1.1.1'), 200);
});
