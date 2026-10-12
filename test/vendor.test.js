'use strict';
// Selbst gehostetes sql.js (Spec §7.2): Vendor-Dateien unverändert (SHA-256), Lizenz beiliegend, richtige MIME-Typen,
// Worker und Ausführer vorhanden und CSP-tauglich (kein eval/new Function).

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const request = require('supertest');
const { testApp } = require('./helpers');

const wurzel = path.join(__dirname, '..');
const VENDOR = 'public/static/vendor/sqljs';
const DATEIEN = ['sql-wasm.js', 'sql-wasm.wasm', 'sql-asm.js', 'LICENSE'];
const sha256 = (datei) => crypto.createHash('sha256').update(fs.readFileSync(path.join(wurzel, datei))).digest('hex');

test('sql.js 1.14.2: alle Vendor-Dateien vorhanden und mit festgehaltenem Hash', () => {
  const hashes = require('./fixtures/vendor_hashes.json');
  assert.equal(hashes.version, '1.14.2');
  for (const datei of DATEIEN) {
    const rel = `${VENDOR}/${datei}`;
    assert.match(hashes.dateien[rel] || '', /^[0-9a-f]{64}$/, `${rel} fehlt in vendor_hashes.json`);
    assert.equal(sha256(rel), hashes.dateien[rel], rel);
  }
  assert.deepEqual(Object.keys(hashes.dateien).sort(), DATEIEN.map((d) => `${VENDOR}/${d}`).sort());
});

test('sql.js: devDependency exakt 1.14.2 und Kopier-Skript als npm-Script', () => {
  const pkg = require('../package.json');
  assert.equal(pkg.devDependencies['sql.js'], '1.14.2');
  assert.equal(pkg.dependencies['sql.js'], undefined, 'sql.js ist keine Laufzeitabhängigkeit');
  assert.equal(pkg.scripts.sqljs, 'node scripts/sqljs_kopieren.js');
  assert.ok(fs.existsSync(path.join(wurzel, 'scripts/sqljs_kopieren.js')));
});

test('sql.js: Vendor-Dateien gleichen dem installierten Paket (sofern installiert)', (t) => {
  const ordner = path.join(wurzel, 'node_modules', 'sql.js');
  if (!fs.existsSync(path.join(ordner, 'package.json'))) {
    t.skip('sql.js nicht installiert');
    return;
  }
  assert.equal(require(path.join(ordner, 'package.json')).version, '1.14.2');
  for (const datei of DATEIEN) {
    const quelle = datei === 'LICENSE' ? path.join(ordner, 'LICENSE') : path.join(ordner, 'dist', datei);
    assert.ok(fs.readFileSync(quelle).equals(fs.readFileSync(path.join(wurzel, VENDOR, datei))), datei);
  }
});

test('Lizenz (MIT) liegt bei', () => {
  const lizenz = fs.readFileSync(path.join(wurzel, VENDOR, 'LICENSE'), 'utf8');
  assert.match(lizenz, /MIT license/i);
  assert.match(lizenz, /sql\.js authors/);
});

test('Vendor-JS nutzt weder eval noch new Function (CSP ohne unsafe-eval)', () => {
  for (const datei of ['sql-wasm.js', 'sql-asm.js']) {
    const js = fs.readFileSync(path.join(wurzel, VENDOR, datei), 'utf8');
    assert.doesNotMatch(js, /\beval\s*\(|new\s+Function\s*\(/, datei);
  }
});

test('.wasm wird als application/wasm ausgeliefert, .js als JavaScript, mit CSP', async () => {
  const { app } = testApp();
  const wasm = await request(app).get('/static/vendor/sqljs/sql-wasm.wasm');
  assert.equal(wasm.status, 200);
  assert.match(wasm.headers['content-type'], /^application\/wasm/);
  for (const url of [
    '/static/vendor/sqljs/sql-wasm.js',
    '/static/vendor/sqljs/sql-asm.js',
    '/static/js/konsole/sql-worker.js',
    '/static/js/konsole/ausfuehren.js'
  ]) {
    const res = await request(app).get(url);
    assert.equal(res.status, 200, url);
    assert.match(res.headers['content-type'], /javascript/, url);
    assert.match(res.headers['content-security-policy'], /script-src 'self' 'wasm-unsafe-eval'/, url);
  }
});

test('Worker lädt nur Vendor-Dateien der eigenen Herkunft und kennt den asm.js-Fallback', () => {
  const worker = fs.readFileSync(path.join(wurzel, 'public/static/js/konsole/sql-worker.js'), 'utf8');
  assert.match(worker, /importScripts\(/);
  assert.match(worker, /sql-wasm\.js/);
  assert.match(worker, /sql-asm\.js/);
  assert.match(worker, /typeof WebAssembly [!=]== 'object'/);
  assert.match(worker, /new WebAssembly\.Module\(/, 'Test-Instanziierung');
  assert.doesNotMatch(worker, /https?:\/\//, 'keine externen URLs');
  const ausfuehren = fs.readFileSync(path.join(wurzel, 'public/static/js/konsole/ausfuehren.js'), 'utf8');
  assert.match(ausfuehren, /export function erzeugeAusfuehrer/);
  assert.doesNotMatch(ausfuehren, /https?:\/\//, 'keine externen URLs');
});
