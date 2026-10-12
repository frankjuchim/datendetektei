'use strict';
// App-Fabrik: erzeugeApp(konfig, db) liefert eine Express-App ohne Port (testbar mit supertest).

const path = require('node:path');
const express = require('express');
const { sicherheitsHeader, pruefeHerkunft } = require('./kern/sicherheit');
const { ssoRouten } = require('./routes/sso');
const { version: VERSION } = require('../package.json');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');

function erzeugeApp(konfig, db) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', konfig.trustProxy || 0);
  app.locals.konfig = konfig;
  app.locals.db = db;

  app.use(sicherheitsHeader());
  app.use(pruefeHerkunft(konfig));
  app.use(express.json({ limit: '100kb' }));

  app.get('/healthz', (req, res) => {
    res.json({ status: 'ok', version: VERSION });
  });

  app.use(ssoRouten(konfig, db));

  app.use(express.static(PUBLIC_DIR, { maxAge: '1h', index: false }));

  // 404: API als JSON, sonst die statische Fehlerseite.
  app.use((req, res) => {
    if (req.path.startsWith('/api/')) {
      res.status(404).json({ error: 'Nicht gefunden.' });
      return;
    }
    res.status(404).sendFile(path.join(PUBLIC_DIR, '404.html'));
  });

  // Fehler: nie Details ausgeben.
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    const status = err.status && err.status >= 400 && err.status < 500 ? err.status : 500;
    if (status === 500) console.error('Interner Fehler:', err && err.message);
    if (req.path.startsWith('/api/')) {
      res.status(status).json({ error: status === 500 ? 'Interner Fehler.' : 'Ungültige Anfrage.' });
      return;
    }
    res.status(status).type('text/plain; charset=utf-8').send(status === 500 ? 'Interner Fehler.' : 'Ungültige Anfrage.');
  });

  return app;
}

module.exports = { erzeugeApp, VERSION };
