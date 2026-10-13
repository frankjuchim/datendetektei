'use strict';
// Auslieferung der isomorphen SQL-Module aus src/sql an den Browser (Spec §7.3): dieselben Bytes wie im Server.
// Nur eine feste Whitelist; die Dateien werden beim Start einmal gelesen (kein Dateipfad aus der Anfrage).

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const express = require('express');

const SQL_DIR = path.join(__dirname, '..', 'sql');
const WHITELIST = ['parser.js', 'regeln.js', 'fehlertexte.js', 'visual.js'];

function sqlSkriptRouten() {
  const dateien = new Map();
  for (const name of WHITELIST) {
    const p = path.join(SQL_DIR, name);
    if (!fs.existsSync(p)) continue;
    const inhalt = fs.readFileSync(p);
    const etag = '"' + crypto.createHash('sha256').update(inhalt).digest('base64url').slice(0, 27) + '"';
    dateien.set(name, { inhalt, etag });
  }

  const router = express.Router({ caseSensitive: true, strict: true });
  router.get('/static/js/sql/:datei', (req, res, next) => {
    const datei = dateien.get(req.params.datei);
    if (!datei) {
      next();
      return;
    }
    res.set('Content-Type', 'application/javascript; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=3600');
    res.set('ETag', datei.etag);
    if (req.fresh) {
      res.status(304).end();
      return;
    }
    res.send(datei.inhalt);
  });
  return router;
}

module.exports = { sqlSkriptRouten, WHITELIST };
