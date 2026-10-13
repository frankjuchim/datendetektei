'use strict';
// CSRF-Schutz für spätere Phasen (Spec §7.14): Origin/Referer + JSON-Pflicht für nicht-GET-Anfragen.
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const { testKonfig } = require('./helpers');
const { pruefeHerkunft } = require('../src/kern/sicherheit');

function app() {
  const konfig = testKonfig();
  const a = express();
  a.use(pruefeHerkunft(konfig));
  a.use(express.json());
  a.all('/api/aktion', (req, res) => res.json({ ok: true }));
  a.post('/api/verbund/loeschen', (req, res) => res.json({ ok: true }));
  return a;
}

test('pruefeHerkunft: GET ohne Origin erlaubt', async () => {
  assert.equal((await request(app()).get('/api/aktion')).status, 200);
});

test('pruefeHerkunft: POST ohne Origin und Referer → 403', async () => {
  const res = await request(app()).post('/api/aktion').send({ a: 1 });
  assert.equal(res.status, 403);
  assert.deepEqual(res.body, { error: 'Anfrage nicht erlaubt.' });
});

test('pruefeHerkunft: fremde Origin bzw. fremder Referer → 403', async () => {
  const a = app();
  assert.equal((await request(a).post('/api/aktion').set('Origin', 'https://boese.example').send({})).status, 403);
  assert.equal((await request(a).post('/api/aktion').set('Origin', 'https://datendetektei.example.boese.example').send({})).status, 403);
  assert.equal((await request(a).post('/api/aktion').set('Origin', 'null').send({})).status, 403);
  assert.equal((await request(a).post('/api/aktion').set('Referer', 'https://boese.example/seite').send({})).status, 403);
  assert.equal((await request(a).post('/api/aktion').set('Referer', 'https://datendetektei.example.boese.example/').send({})).status, 403);
  assert.equal((await request(a).delete('/api/aktion').set('Origin', 'https://boese.example')).status, 403);
});

test('pruefeHerkunft: eigene Origin bzw. eigener Referer mit JSON → erlaubt', async () => {
  const a = app();
  assert.equal((await request(a).post('/api/aktion').set('Origin', 'https://datendetektei.example').send({ a: 1 })).status, 200);
  assert.equal((await request(a).post('/api/aktion').set('Referer', 'https://datendetektei.example/akte/1').send({ a: 1 })).status, 200);
  assert.equal((await request(a).post('/api/aktion').set('Origin', 'https://datendetektei.example')).status, 200, 'ohne Body');
});

test('pruefeHerkunft: POST mit Body ohne JSON → 415', async () => {
  const res = await request(app())
    .post('/api/aktion')
    .set('Origin', 'https://datendetektei.example')
    .set('Content-Type', 'application/x-www-form-urlencoded')
    .send('a=1');
  assert.equal(res.status, 415);
  assert.deepEqual(res.body, { error: 'Nur JSON erlaubt.' });
});

test('pruefeHerkunft: Verbund-API ist ausgenommen (kein Browser beteiligt)', async () => {
  assert.equal((await request(app()).post('/api/verbund/loeschen').send({})).status, 200);
});

test('Sicherheits-Review Phase 8: rateLimit vergisst abgelaufene Schlüssel (IPs) nach dem Zeitfenster', async () => {
  const { rateLimit } = require('../src/kern/sicherheit');
  const uhr = { t: 1000000 };
  const begrenzer = rateLimit({ fensterMs: 60000, max: 5, schluessel: (req) => req.get('x-test-ip'), jetzt: () => uhr.t });
  const a = express();
  a.get('/x', begrenzer, (req, res) => res.json({ ok: true }));
  for (const ip of ['10.0.0.1', '10.0.0.2', '10.0.0.3']) assert.equal((await request(a).get('/x').set('x-test-ip', ip)).status, 200);
  assert.equal(begrenzer.anzahlSchluessel(), 3);
  uhr.t += 61000;
  assert.equal((await request(a).get('/x').set('x-test-ip', '10.0.0.9')).status, 200);
  assert.equal(begrenzer.anzahlSchluessel(), 1, 'abgelaufene IPs sind aus dem Speicher entfernt');
});
