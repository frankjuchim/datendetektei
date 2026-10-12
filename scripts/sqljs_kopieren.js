#!/usr/bin/env node
'use strict';
// Kopiert sql.js (devDependency, exakt 1.14.2) nach public/static/vendor/sqljs/ (Spec §7.2): sql-wasm.js + .wasm
// (WebAssembly) und sql-asm.js (Fallback ohne WebAssembly) sowie die MIT-Lizenz. Schreibt die SHA-256-Werte nach
// test/fixtures/vendor_hashes.json (test/vendor.test.js prüft sie).
// Aufruf: npm run sqljs – das Ergebnis wird committet; im Betrieb wird das Paket nicht gebraucht.

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const WURZEL = path.join(__dirname, '..');
const ZIEL_REL = 'public/static/vendor/sqljs';
const ZIEL = path.join(WURZEL, ZIEL_REL);
const HASHES = path.join(WURZEL, 'test', 'fixtures', 'vendor_hashes.json');
const VERSION = '1.14.2';
const DATEIEN = [
  ['dist/sql-wasm.js', 'sql-wasm.js'],
  ['dist/sql-wasm.wasm', 'sql-wasm.wasm'],
  ['dist/sql-asm.js', 'sql-asm.js'],
  ['LICENSE', 'LICENSE']
];

function main() {
  const ordner = path.join(WURZEL, 'node_modules', 'sql.js');
  const version = JSON.parse(fs.readFileSync(path.join(ordner, 'package.json'), 'utf8')).version;
  if (version !== VERSION) throw new Error(`sql.js ${version} installiert, erwartet ${VERSION}.`);

  fs.mkdirSync(ZIEL, { recursive: true });
  const dateien = {};
  for (const [quelle, ziel] of DATEIEN) {
    const inhalt = fs.readFileSync(path.join(ordner, quelle));
    fs.writeFileSync(path.join(ZIEL, ziel), inhalt);
    dateien[`${ZIEL_REL}/${ziel}`] = crypto.createHash('sha256').update(inhalt).digest('hex');
    console.log(`${ziel.padEnd(14)} ${(inhalt.length / 1024).toFixed(0).padStart(6)} KiB`);
  }
  fs.writeFileSync(HASHES, `${JSON.stringify({ version: VERSION, dateien }, null, 2)}\n`);
  console.log(`sql.js ${VERSION} nach ${ZIEL_REL} kopiert, Hashes in test/fixtures/vendor_hashes.json.`);
}

main();
