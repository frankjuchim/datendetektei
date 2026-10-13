'use strict';
// Test-Server für E2E-Tests der Browser-Konsole: die echte App (erzeugeApp, gleiche CSP) plus Test-Routen, die es
// im Betrieb nicht gibt – Testseiten aus test/e2e/seiten/ und Übungs-DBs, die zur Laufzeit aus seed/datenbanken/
// (schema.sql + pflicht.sql) gebaut werden. Nichts davon liegt in public/.

const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const express = require('express');
const Database = require('better-sqlite3');
const { sicherheitsHeader } = require('../../src/kern/sicherheit');
const { testApp, meldeAn } = require('../helpers');
const { ladeDatenbanken } = require('../../src/sql/datenbanken');
const { erzeugeSandbox } = require('../../src/sql/sandbox');
const { erzeugePruefer } = require('../../src/sql/pruefer');
const { erzeugeInhalte } = require('../../src/services/inhalte');
const { ladeWarmupKarten } = require('../../src/services/warmup');
const { ladeLiveInhalte } = require('../../src/content/live');

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
 * mitDatenbanken: echte Übungs-DBs (basis.sql) und Sandbox wie im Betrieb (/db/, /api/db/, /api/sql/ausfuehren).
 * mitInhalten: zusätzlich die echten Akten (seed/akten), der SQL-Prüfer und die Warm-up-Karten wie in src/server.js
 *   (Lern-API, Verhöre, Warm-up, Trainingsplatz, Live-Modus aus seed/live); schließt mitDatenbanken ein. rateLimits: Überschreibungen für Tests.
 * aktenDateien: weitere Akten-Dateien (z. B. test/fixtures/akte_beispiel.json) zusätzlich zu seed/akten (wie AKTEN_DATEIEN).
 * aktenVerzeichnis: anderes Verzeichnis statt seed/akten (z. B. eine Kopie ohne einzelne Akten).
 * materialVerzeichnis: Wurzel der Materialien (z. B. test/fixtures/materialien).
 * Die Plattform-URL ist die tatsächliche Adresse (mit Port), damit die Origin-Prüfung für POSTs greift.
 * → { url, t (testApp-Ergebnis), anmelden(nutzer) → Cookie „dd_s=…“, schliessen() }
 */
async function starteTestServer({ strengeCsp = false, mitDatenbanken = false, mitInhalten = false, rateLimits = null, aktenDateien = null, materialVerzeichnis = null, aktenVerzeichnis = null } = {}) {
  if (mitInhalten) mitDatenbanken = true;
  let weiter = (req, res) => {
    res.statusCode = 503;
    res.end();
  };
  const server = http.createServer((req, res) => weiter(req, res));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}`;

  let sandbox = null;
  const appOptionen = materialVerzeichnis ? { materialVerzeichnis } : {};
  if (mitDatenbanken) {
    const datenbanken = ladeDatenbanken(undefined, { log: () => {} });
    sandbox = erzeugeSandbox({
      prozesse: 1,
      datenbanken: Object.fromEntries(
        datenbanken.namen.map((n) => [n, { haupt: datenbanken.haupt(n), varianten: datenbanken.varianten(n) }])
      )
    });
    Object.assign(appOptionen, { datenbanken, sandbox });
    if (mitInhalten) {
      appOptionen.pruefer = erzeugePruefer({
        sandbox,
        schemata: Object.fromEntries(datenbanken.namen.map((n) => [n, datenbanken.schema(n)]))
      });
      appOptionen.warmupKarten = ladeWarmupKarten();
      appOptionen.liveInhalte = ladeLiveInhalte({ datenbanken });
    }
  }
  const konfigTest = { plattformUrl: url, ...(rateLimits ? { rateLimits } : {}) };
  const t = testApp(konfigTest, (db) => {
    if (!mitInhalten) return appOptionen;
    const inhalte = erzeugeInhalte(db);
    inhalte.laden({
      ...(aktenDateien && aktenDateien.length ? { dateien: aktenDateien } : {}),
      ...(aktenVerzeichnis ? { verzeichnis: aktenVerzeichnis } : {})
    });
    return { ...appOptionen, inhalte };
  });
  const { app } = t;
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
  weiter = aussen;

  return {
    url,
    t,
    anmelden: (nutzer = {}) => meldeAn(t, nutzer),
    schliessen: () => {
      if (sandbox) sandbox.beende();
      server.closeAllConnections();
      return new Promise((resolve) => server.close(resolve));
    }
  };
}

module.exports = { starteTestServer, baueTestDb };
