'use strict';
// Sandbox-Sperre ohne Anmeldung: je IP mehrere gleichzeitige Aufträge (Schul-NAT), angemeldet einer je Konto.

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');
const { auftragsSperre } = require('../src/kern/sicherheit');

test('Ohne Anmeldung (je IP) mehrere gleichzeitige Aufträge, damit eine Klasse hinter einer Schul-NAT sich nicht gegenseitig sperrt', { timeout: 20000 }, async () => {
  const sperre = auftragsSperre({ maxJeIp: 3 });
  const halte = [];
  const app = express();
  app.set('trust proxy', 1);
  app.use((req, res, next) => { req.sitzung = req.get('x-konto') ? { sub: req.get('x-konto') } : null; next(); });
  app.post('/x', sperre.middleware(), (req, res) => { halte.push(() => res.json({ ok: true })); });
  const server = app.listen(0);
  try {
    const port = server.address().port;
    // node:http direkt (ohne Proxy-Umgebung, ohne Keep-alive); liefert { status }
    const senden = (kopf = {}) => new Promise((ok, fehler) => {
      const req = http.request({ host: '127.0.0.1', port, path: '/x', method: 'POST', agent: false, headers: { 'x-forwarded-for': '203.0.113.5', ...kopf } }, (res) => {
        res.resume();
        res.on('end', () => ok({ status: res.statusCode }));
      });
      req.on('error', fehler);
      req.end();
    });
    const warteBis = async (n) => {
      const bis = Date.now() + 3000;
      while (halte.length < n) {
        assert.ok(Date.now() < bis, `nur ${halte.length} von ${n} Aufträgen laufen`);
        await new Promise((r) => setTimeout(r, 5));
      }
    };
    const laufend = [senden(), senden(), senden()];
    await warteBis(3);
    assert.equal((await senden()).status, 429, 'vierter gleichzeitiger Auftrag derselben IP');
    // Angemeldet bleibt es bei einem Auftrag je Konto – auch hinter derselben IP.
    const konto = senden({ 'x-konto': 's:1' });
    await warteBis(4);
    assert.equal((await senden({ 'x-konto': 's:1' })).status, 429);
    halte.splice(0).forEach((f) => f());
    for (const r of [...laufend, konto]) assert.equal((await r).status, 200);
    const wieder = senden();
    await warteBis(1);
    halte.splice(0).forEach((f) => f());
    assert.equal((await wieder).status, 200, 'nach dem Ende wieder frei');
  } finally {
    halte.splice(0).forEach((f) => f());
    server.closeAllConnections();
    server.close();
  }
});
