'use strict';
// Entwicklungsstart ohne echtes Portal: setzt eine Entwicklungsumgebung und startet src/server.js.
// NUR für die Entwicklung – der Schlüssel aus test/fixtures ist öffentlich und wertlos (test/fixtures/dev_portal_*.pem).
// Bereits gesetzte Umgebungsvariablen haben Vorrang.

const fs = require('node:fs');
const path = require('node:path');

const wurzel = path.join(__dirname, '..');
const standard = {
  PLATTFORM_URL: 'http://localhost:3000',
  PORTAL_URL: 'http://localhost:3100',
  PORTAL_PUBLIC_KEY: fs.readFileSync(path.join(wurzel, 'test', 'fixtures', 'dev_portal_public.pem'), 'utf8'),
  SESSION_SECRET: 'entwicklung-unsicher-nicht-im-betrieb-verwenden',
  DATA_DIR: './data',
  PORT: '3000',
  ERLAUBE_HTTP: '1'
};
for (const [name, wert] of Object.entries(standard)) {
  if (process.env[name] === undefined || process.env[name] === '') process.env[name] = wert;
}

require('../src/server.js');
