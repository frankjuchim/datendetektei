'use strict';
// Test-Server für E2E-Tests der Browser-Konsole: die echte App (erzeugeApp, gleiche CSP) plus Test-Routen, die es
// im Betrieb nicht gibt – Testseiten aus test/e2e/seiten/ und Übungs-DBs, die zur Laufzeit aus seed/datenbanken/
// (schema.sql + pflicht.sql) gebaut werden. Nichts davon liegt in public/.

const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const Database = require('better-sqlite3');
const { sicherheitsHeader } = require('../../src/kern/sicherheit');
const { testApp } = require('../helpers');

const WURZEL = path.join(__dirname, '..', '..');
const SEITEN = path.join(__dirname, 'seiten');

/** Baut eine Übungs-DB aus schema.sql + pflicht.sql (ohne Generator) und liefert sie als SQLite-Datei (Buffer). */
function baueTestDb(name) {
  const ordner = path.join(WURZEL, 'seed', 'datenbanken', name);
  const db = new Database(':memory:');
  try {
    db.exec(fs.readFileSync(path.join(ordner, 'schema.sql'), 'utf8'));
    db.exec(fs.readFileSync(path.join(ordner, 'pflicht.sql'), 'utf8'));
    return db.serialize();
  } finally {
    db.close();
  }
}

/**
 * Startet den Test-Server auf 127.0.0.1 (freier Port).
 * strengeCsp: CSP ohne 'wasm-unsafe-eval' (simuliert ein Umfeld, in dem WebAssembly nicht ausgeführt werden darf).
 */
async function starteTestServer({ strengeCsp = false } = {}) {
  const { app } = testApp({ plattformUrl: 'http://127.0.0.1' });
  const dbs = { fundbuero: baueTestDb('fundbuero'), eisdiele: baueTestDb('eisdiele') };
  const aussen = express();
  aussen.disable('x-powered-by');

  if (strengeCsp) {
    aussen.use((req, res, next) => {
      const setze = res.setHeader.bind(res);
      res.setHeader = (name, wert) =>
        setze(name, /^content-security-policy$/i.test(name) ? String(wert).replace(/\s*'wasm-unsafe-eval'/g, '') : wert);
      next();
    });
  }

  const test = express.Router();
  test.use(sicherheitsHeader());
  test.get('/test/seiten/:datei', (req, res, next) => {
    if (!/^[a-z-]+\.(html|js)$/.test(req.params.datei)) return next();
    res.set('Cache-Control', 'no-store');
    // Mit root: send prüft Punkt-Ordner nur im relativen Teil (der Worktree liegt ggf. unter .claude/).
    res.sendFile(req.params.datei, { root: SEITEN });
  });
  test.get('/test/db/:name.sqlite', (req, res, next) => {
    const puffer = dbs[req.params.name];
    if (!puffer) return next();
    res.type('application/vnd.sqlite3').send(puffer);
  });
  aussen.use(test);
  aussen.use(app);

  const server = await new Promise((resolve) => {
    const s = aussen.listen(0, '127.0.0.1', () => resolve(s));
  });
  const url = `http://127.0.0.1:${server.address().port}`;
  return { url, schliessen: () => new Promise((resolve) => server.close(resolve)) };
}

module.exports = { starteTestServer, baueTestDb };
