'use strict';
// App-Fabrik: erzeugeApp(konfig, db) liefert eine Express-App ohne Port (testbar mit supertest).

const path = require('node:path');
const express = require('express');
const { sicherheitsHeader, pruefeHerkunft, rateLimit } = require('./kern/sicherheit');
const { ssoRouten } = require('./routes/sso');
const { verbundRouten } = require('./routes/verbund');
const { manifestRoute } = require('./kern/manifest');
const { seitenRouten } = require('./routes/seiten');
const { sqlSkriptRouten } = require('./routes/sql_skripte');
const { version: VERSION } = require('../package.json');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');

function erzeugeApp(konfig, db) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', konfig.trustProxy || 0);
  app.locals.konfig = konfig;
  app.locals.db = db;

  app.use(sicherheitsHeader());
  // Rate-Limits (Spec §7.13/§7.14): /sso/* je IP, Verbund-API gesamt; per konfig.rateLimits überschreibbar.
  const limits = konfig.rateLimits || {};
  const jetzt = konfig.jetzt || Date.now;
  app.use('/sso', rateLimit({ fensterMs: 60000, max: 30, ...limits.sso, schluessel: (req) => req.ip, jetzt }));
  app.use('/api/verbund', rateLimit({ fensterMs: 60000, max: 120, ...limits.verbund, jetzt }));

  // Verbund-API vor dem allgemeinen JSON-Parser: JSON wird erst nach der Token-Prüfung gelesen.
  app.use(verbundRouten(konfig, db));

  app.use(pruefeHerkunft(konfig));
  app.use(express.json({ limit: '100kb' }));

  app.get('/healthz', (req, res) => {
    res.json({ status: 'ok', version: VERSION });
  });

  app.get('/api/plattform', manifestRoute(konfig));
  app.use(ssoRouten(konfig, db));
  app.use(seitenRouten());

  // Isomorphe SQL-Module (Parser, Regeln, Fehlertexte) aus src/sql – vor dem statischen Verzeichnis.
  app.use(sqlSkriptRouten());

  // Nur public/static/ wird als Verzeichnis ausgeliefert; HTML-Seiten nur über die Routen oben.
  app.use('/static', express.static(path.join(PUBLIC_DIR, 'static'), { maxAge: '1h', index: false }));

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
