'use strict';
// Öffentliche Auslieferung der Übungs-Datenbanken (Spec §7.2, Plan Phase 2 Task 5):
//   GET /db/:name.sqlite        Haupt-DB als SQLite-Datei (für sql.js im Browser)
//   GET /api/db/:name/schema    Schema [{ tabelle, spalten: [{ name, typ, pk, fk }], zeilen }]
// Nur Namen aus OEFFENTLICHE_DATENBANKEN, die auch geladen sind; Varianten und Verhör-DBs nie. Kein Dateizugriff
// je Anfrage: ausgeliefert werden die beim Start geladenen Buffer.

const crypto = require('node:crypto');
const express = require('express');
const { OEFFENTLICHE_DATENBANKEN } = require('../sql/datenbanken');

const CACHE = 'public, max-age=3600';

function sqlRouten(datenbanken) {
  // Je öffentlicher, geladener DB einmal: Buffer, ETag (SHA-256), Schema als JSON.
  const eintraege = new Map();
  for (const name of OEFFENTLICHE_DATENBANKEN) {
    if (!datenbanken.namen.includes(name)) continue;
    const buffer = datenbanken.haupt(name);
    eintraege.set(name, {
      buffer,
      etag: `"${crypto.createHash('sha256').update(buffer).digest('hex')}"`,
      schema: JSON.stringify(datenbanken.schema(name))
    });
  }

  function sende(req, res, etag, typ, inhalt) {
    res.set('Content-Type', typ);
    res.set('Cache-Control', CACHE);
    res.set('ETag', etag);
    if (req.fresh) {
      res.status(304).end();
      return;
    }
    res.send(inhalt);
  }

  const router = express.Router({ caseSensitive: true, strict: true });

  router.get('/db/:datei', (req, res, next) => {
    const m = /^([a-z]+)\.sqlite$/.exec(req.params.datei);
    const e = m ? eintraege.get(m[1]) : undefined;
    if (!e) {
      next();
      return;
    }
    sende(req, res, e.etag, 'application/vnd.sqlite3', e.buffer);
  });

  router.get('/api/db/:name/schema', (req, res, next) => {
    const e = eintraege.get(req.params.name);
    if (!e) {
      next();
      return;
    }
    sende(req, res, `${e.etag.slice(0, -1)}-schema"`, 'application/json; charset=utf-8', e.schema);
  });

  return router;
}

module.exports = { sqlRouten };
