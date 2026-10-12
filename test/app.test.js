'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { testApp } = require('./helpers');

test('healthz liefert status ok und version aus package.json', async () => {
  const { app } = testApp();
  const res = await request(app).get('/healthz');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { status: 'ok', version: require('../package.json').version });
  assert.equal(res.body.version, '0.1.0');
});

test('CSP ist exakt gesetzt', async () => {
  const { app } = testApp();
  const res = await request(app).get('/healthz');
  const csp = res.headers['content-security-policy'];
  // Direktiven einzeln vergleichen (helmet trennt mit „;“ ohne Leerzeichen).
  const direktiven = (t) => t.split(';').map((d) => d.trim()).filter(Boolean);
  assert.deepEqual(
    direktiven(csp),
    direktiven(
    "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self'; connect-src 'self'; " +
      "img-src 'self' data:; style-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'none'; " +
      "form-action 'self'; object-src 'none'"
    )
  );
  assert.ok(csp.includes("'wasm-unsafe-eval'"));
  assert.ok(csp.includes("worker-src 'self'"));
  assert.ok(!csp.includes('unsafe-inline'));
  assert.ok(!/(^|[^-])unsafe-eval'/.test(csp), 'unsafe-eval nur als wasm-unsafe-eval');
});

test('X-Robots-Tag noindex und kein x-powered-by', async () => {
  const { app } = testApp();
  const res = await request(app).get('/healthz');
  assert.equal(res.headers['x-robots-tag'], 'noindex');
  assert.equal(res.headers['x-powered-by'], undefined);
});

test('unbekannte Seite liefert 404-Seite', async () => {
  const { app } = testApp();
  const res = await request(app).get('/gibtsnicht');
  assert.equal(res.status, 404);
  assert.match(res.headers['content-type'], /text\/html/);
  assert.match(res.text, /nicht gefunden/i);
  assert.match(res.text, /href="\/"/);
});

test('unbekannter API-Pfad liefert 404 als JSON', async () => {
  const { app } = testApp();
  const res = await request(app).get('/api/gibtsnicht');
  assert.equal(res.status, 404);
  assert.match(res.headers['content-type'], /json/);
});
