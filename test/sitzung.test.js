'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const { testKonfig } = require('./helpers');
const { oeffneDb } = require('../src/db');
const { upsertAusToken, loescheKonto } = require('../src/kern/konten');
const { setzeSitzung, leseSitzung, beendeSitzung, setzeCookie, leseCookie, nurAngemeldet } = require('../src/kern/sitzung');

const TAG_SEK = 24 * 3600;

/** Mini-App mit Hilfsrouten: Sitzung setzen/lesen/beenden und geschützte Seiten. */
function aufbau(ueberschreiben = {}) {
  let uhr = Date.parse('2026-10-12T08:00:00Z');
  const konfig = testKonfig({ jetzt: () => uhr, ...ueberschreiben });
  const db = oeffneDb(':memory:');
  const app = express();
  app.locals.konfig = konfig;
  app.locals.db = db;
  app.get('/setzen/:sub/:rolle', (req, res) => {
    setzeSitzung(res, konfig, { sub: req.params.sub, rolle: req.params.rolle });
    res.json({ ok: true });
  });
  app.get('/lesen', (req, res) => res.json({ sitzung: leseSitzung(req, konfig, db) }));
  app.get('/beenden', (req, res) => {
    beendeSitzung(res, konfig);
    res.json({ ok: true });
  });
  app.get('/cookie/setzen', (req, res) => {
    setzeCookie(res, konfig, 'dd_test', 'wert-123', 60);
    res.json({ ok: true });
  });
  app.get('/cookie/lesen', (req, res) => res.json({ wert: leseCookie(req, konfig, 'dd_test') }));
  app.get('/geschuetzt', nurAngemeldet(['lehrkraft', 'superadmin']), (req, res) => res.json({ sitzung: req.sitzung }));
  app.get('/api/geschuetzt', nurAngemeldet(['lehrkraft', 'superadmin']), (req, res) => res.json({ sitzung: req.sitzung }));
  return { app, konfig, db, stelleUhr: (ms) => (uhr = ms), uhr: () => uhr };
}

function konto(db, sub = 's:1042', rolle = 'schueler', name = 'Lena K.') {
  const kursRolle = rolle === 'schueler' ? 'mitglied' : 'lehrkraft';
  upsertAusToken(db, { sub, rolle, name, kurse: [{ id: 'k:17', name: 'Inf-LK 12', rolle: kursRolle }] });
}

/** Set-Cookie-Kopf eines Cookies finden. */
function setCookie(res, name) {
  return (res.headers['set-cookie'] || []).find((c) => c.startsWith(name + '='));
}
/** „name=wert“ für den Cookie-Kopf der nächsten Anfrage. */
function cookiePaar(res, name) {
  const c = setCookie(res, name);
  return c ? c.split(';')[0] : '';
}

test('Sitzung Schüler hält 30 Tage', async () => {
  const { app, db } = aufbau();
  konto(db);
  const res = await request(app).get('/setzen/s:1042/schueler');
  const c = setCookie(res, 'dd_s');
  assert.ok(c, 'dd_s gesetzt');
  assert.match(c, /Max-Age=2592000(;|$)/);
  assert.equal(30 * TAG_SEK, 2592000);
});

test('Sitzung Lehrkraft hält 8 Stunden', async () => {
  const { app, db } = aufbau();
  konto(db, 'l:7', 'lehrkraft', 'Frau Beispiel');
  konto(db, 'a:1', 'superadmin', 'Admin');
  const l = await request(app).get('/setzen/l:7/lehrkraft');
  assert.match(setCookie(l, 'dd_s'), /Max-Age=28800(;|$)/);
  const a = await request(app).get('/setzen/a:1/superadmin');
  assert.match(setCookie(a, 'dd_s'), /Max-Age=28800(;|$)/);
});

test('Cookie-Attribute: HttpOnly, SameSite=Lax, Path=/, Secure außer bei ERLAUBE_HTTP', async () => {
  const mitHttp = aufbau({ erlaubeHttp: true });
  const c1 = setCookie(await request(mitHttp.app).get('/setzen/s:1042/schueler'), 'dd_s');
  assert.match(c1, /; HttpOnly/);
  assert.match(c1, /; SameSite=Lax/);
  assert.match(c1, /; Path=\//);
  assert.doesNotMatch(c1, /Secure/);
  const ohneHttp = aufbau({ erlaubeHttp: false });
  const c2 = setCookie(await request(ohneHttp.app).get('/setzen/s:1042/schueler'), 'dd_s');
  assert.match(c2, /; Secure/);
  assert.match(c2, /; HttpOnly/);
});

test('Sitzung wird gelesen und liefert sub, rolle, name aus dem Konto', async () => {
  const { app, db } = aufbau();
  konto(db);
  const paar = cookiePaar(await request(app).get('/setzen/s:1042/schueler'), 'dd_s');
  // Wert: <base64url-JSON>.<hmac>
  const wert = paar.slice('dd_s='.length);
  const [daten, mac] = wert.split('.');
  assert.match(mac, /^[A-Za-z0-9_-]{43}$/);
  const inhalt = JSON.parse(Buffer.from(daten, 'base64url').toString('utf8'));
  assert.deepEqual(Object.keys(inhalt).sort(), ['bis', 'rolle', 'sub']);
  const res = await request(app).get('/lesen').set('Cookie', paar);
  assert.deepEqual(res.body.sitzung, { sub: 's:1042', rolle: 'schueler', name: 'Lena K.' });
});

test('manipuliertes Cookie wird verworfen', async () => {
  const { app, db } = aufbau();
  konto(db);
  konto(db, 'a:1', 'superadmin', 'Admin');
  const paar = cookiePaar(await request(app).get('/setzen/s:1042/schueler'), 'dd_s');
  const [daten, mac] = paar.slice('dd_s='.length).split('.');
  // Inhalt austauschen (Rechteausweitung), Signatur behalten
  const boese = Buffer.from(JSON.stringify({ sub: 'a:1', rolle: 'superadmin', bis: Date.now() + 1e9 })).toString('base64url');
  for (const c of [`dd_s=${boese}.${mac}`, `dd_s=${daten}.${mac.slice(0, -2)}xx`, `dd_s=${daten}`, 'dd_s=', 'dd_s=.']) {
    const res = await request(app).get('/lesen').set('Cookie', c);
    assert.equal(res.body.sitzung, null, c);
  }
});

test('setzeCookie/leseCookie: signiert, fremder Name mit gleichem Wert wird nicht angenommen', async () => {
  const { app } = aufbau();
  const res = await request(app).get('/cookie/setzen');
  const paar = cookiePaar(res, 'dd_test');
  assert.match(setCookie(res, 'dd_test'), /Max-Age=60(;|$)/);
  assert.equal((await request(app).get('/cookie/lesen').set('Cookie', `andere=1; ${paar}`)).body.wert, 'wert-123');
  const wert = paar.slice('dd_test='.length);
  assert.equal((await request(app).get('/cookie/lesen').set('Cookie', `dd_test=wert-124.${wert.split('.')[1]}`)).body.wert, null);
  assert.equal((await request(app).get('/cookie/lesen')).body.wert, null);
});

test('abgelaufene Sitzung wird verworfen', async () => {
  const { app, db, stelleUhr, uhr } = aufbau();
  konto(db, 'l:7', 'lehrkraft', 'Frau Beispiel');
  const start = uhr();
  const paar = cookiePaar(await request(app).get('/setzen/l:7/lehrkraft'), 'dd_s');
  stelleUhr(start + 8 * 3600 * 1000 - 1000);
  assert.ok((await request(app).get('/lesen').set('Cookie', paar)).body.sitzung);
  stelleUhr(start + 8 * 3600 * 1000 + 1000);
  assert.equal((await request(app).get('/lesen').set('Cookie', paar)).body.sitzung, null);
});

test('gelöschtes Konto beendet Sitzung', async () => {
  const { app, db } = aufbau();
  konto(db);
  const paar = cookiePaar(await request(app).get('/setzen/s:1042/schueler'), 'dd_s');
  assert.ok((await request(app).get('/lesen').set('Cookie', paar)).body.sitzung);
  loescheKonto(db, 's:1042');
  assert.equal((await request(app).get('/lesen').set('Cookie', paar)).body.sitzung, null);
});

test('beendeSitzung löscht das Cookie', async () => {
  const { app } = aufbau();
  const c = setCookie(await request(app).get('/beenden'), 'dd_s');
  assert.match(c, /^dd_s=;/);
  assert.match(c, /Max-Age=0/);
});

test('nurAngemeldet leitet HTML auf /sso/start mit ziel um', async () => {
  const { app } = aufbau();
  const res = await request(app).get('/geschuetzt?akte=2');
  assert.equal(res.status, 302);
  assert.equal(res.headers.location, '/sso/start?ziel=' + encodeURIComponent('/geschuetzt?akte=2'));
});

test('nurAngemeldet antwortet bei /api/* mit 401 JSON', async () => {
  const { app } = aufbau();
  const res = await request(app).get('/api/geschuetzt');
  assert.equal(res.status, 401);
  assert.deepEqual(res.body, { error: 'Nicht angemeldet.' });
});

test('nurAngemeldet: falsche Rolle → 403 (HTML-Seite bzw. JSON), richtige Rolle → req.sitzung', async () => {
  const { app, db } = aufbau();
  konto(db);
  konto(db, 'l:7', 'lehrkraft', 'Frau Beispiel');
  const schueler = cookiePaar(await request(app).get('/setzen/s:1042/schueler'), 'dd_s');
  const html = await request(app).get('/geschuetzt').set('Cookie', schueler);
  assert.equal(html.status, 403);
  assert.match(html.headers['content-type'], /text\/html/);
  assert.match(html.text, /Kein Zugriff/);
  const api = await request(app).get('/api/geschuetzt').set('Cookie', schueler);
  assert.equal(api.status, 403);
  assert.deepEqual(api.body, { error: 'Keine Berechtigung.' });
  const lehrkraft = cookiePaar(await request(app).get('/setzen/l:7/lehrkraft'), 'dd_s');
  const ok = await request(app).get('/api/geschuetzt').set('Cookie', lehrkraft);
  assert.equal(ok.status, 200);
  assert.deepEqual(ok.body.sitzung, { sub: 'l:7', rolle: 'lehrkraft', name: 'Frau Beispiel' });
});
