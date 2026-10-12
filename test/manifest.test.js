'use strict';
// Manifest GET /api/plattform (Vertrag v1.2 §7, Spec §7.13 in der Fassung nach Spec §18).
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { testApp, ssoToken } = require('./helpers');
const { pruefeManifest } = require('../scripts/vertrag_pruefen');
const { baueManifest } = require('../src/kern/manifest');

/** Erwartetes Manifest exakt nach Spec §7.13 (basis/portal aus der Konfiguration). */
function erwartet(basis, portal) {
  return {
    vertrag: '1.2',
    id: 'datendetektei',
    name: 'Datendetektei',
    titel: 'Datendetektei Weserstedt – Ermitteln mit Datenbanken',
    themenfeld: 'Daten und Datenbanken',
    kurs: 'Informatik eA und gA, Niedersachsen, Abitur ab 2027',
    niveaus: ['eA', 'gA'],
    beschreibung: 'SQL, Schlüssel und Anomalien, ER-Modell und Datenschutz – als Ermittlungsfälle mit Live-SQL.',
    farbe: '#B3261E',
    version: '0.4.0',
    basis,
    icon: '/static/favicon.svg',
    urls: {
      start: '/',
      gast: '/gast',
      themen: '/themen',
      lehrkraft: '/lehrkraft',
      datenschutz: '/datenschutz',
      healthz: '/healthz',
      ssoStart: '/sso/start',
      ssoEnde: '/sso/ende',
      niveaus: '/themen#niveaus'
    },
    auth: { modus: 'portal', portal, sso: true },
    umfang: { welten: 7, level: 13, aufgaben: 0, bosse: 7 },
    welten: [
      { nr: 1, titel: 'Das Fundbüro' },
      { nr: 2, titel: 'Spur der Räder' },
      { nr: 3, titel: 'Die Stadtfest-Kasse' },
      { nr: 4, titel: 'Chaos im Vereinsarchiv' },
      { nr: 5, titel: 'Der Bauplan' },
      { nr: 6, titel: 'Datenspuren' },
      { nr: 7, titel: 'Generalprobe' }
    ],
    faehigkeiten: ['gast', 'themen', 'lehrkraft-materialien', 'sql-konsole', 'live']
  };
}

test('Manifest hat exakt die Felder aus Spec §7.13 (Vertrag v1.2)', async () => {
  const { app } = testApp();
  const res = await request(app).get('/api/plattform');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, erwartet('https://datendetektei.example', 'https://labs.example'));
});

test('baueManifest nimmt basis und portal aus der Konfiguration, umfang als Parameter', () => {
  const konfig = { plattformId: 'datendetektei', plattformUrl: 'https://datendetektei.frankjuchim.de', portalUrl: 'https://labs.frankjuchim.de' };
  assert.deepEqual(baueManifest(konfig), erwartet('https://datendetektei.frankjuchim.de', 'https://labs.frankjuchim.de'));
  assert.deepEqual(baueManifest(konfig, { welten: 7, level: 13, aufgaben: 42, bosse: 7 }).umfang, { welten: 7, level: 13, aufgaben: 42, bosse: 7 });
});

test('pruefeManifest liefert keine Fehler', async () => {
  const { app } = testApp();
  const res = await request(app).get('/api/plattform');
  assert.deepEqual(pruefeManifest(res.body), []);
});

test('CORS *', async () => {
  const { app } = testApp();
  const res = await request(app).get('/api/plattform').set('Origin', 'https://labs.example');
  assert.equal(res.headers['access-control-allow-origin'], '*');
  assert.equal(res.headers['cache-control'], 'public, max-age=300');
});

test('version gleich healthz', async () => {
  const { app } = testApp();
  const m = await request(app).get('/api/plattform');
  const h = await request(app).get('/healthz');
  assert.equal(m.body.version, h.body.version);
  assert.equal(m.body.version, require('../package.json').version);
});

test('basis = PLATTFORM_URL', async () => {
  const { app } = testApp({ plattformUrl: 'https://andere.example' });
  assert.equal((await request(app).get('/api/plattform')).body.basis, 'https://andere.example');
});

test('auth.modus portal, sso true, ssoStart /sso/start', async () => {
  const { app } = testApp();
  const m = (await request(app).get('/api/plattform')).body;
  assert.equal(m.auth.modus, 'portal');
  assert.equal(m.auth.sso, true);
  assert.equal(m.auth.portal, 'https://labs.example');
  assert.equal(m.urls.ssoStart, '/sso/start');
  assert.equal(m.urls.ssoEnde, '/sso/ende');
});

test('Manifest enthält keine Konten- oder Kursdaten', async () => {
  const t = testApp();
  const start = await request(t.app).get('/sso/start?ziel=%2F');
  const state = new URL(start.headers.location).searchParams.get('state');
  const cookie = start.headers['set-cookie'].find((c) => c.startsWith('dd_sso_state=')).split(';')[0];
  const ende = await request(t.app)
    .get('/sso/ende?' + new URLSearchParams({ token: ssoToken(t.schluessel, t.konfig), state, ziel: '/' }))
    .set('Cookie', cookie);
  assert.equal(ende.status, 302);
  assert.equal(t.db.prepare('SELECT COUNT(*) AS n FROM konten').get().n, 1);
  const json = (await request(t.app).get('/api/plattform')).text;
  assert.ok(!json.includes('s:1042'));
  assert.ok(!json.includes('k:17'));
  assert.ok(!json.includes('Lena'));
  assert.ok(!json.includes('Inf-LK'));
});
