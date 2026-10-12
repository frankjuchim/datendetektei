'use strict';
// Werkzeug „Spurenbrett“ (Plan Phase 4 Task 3, DESIGN.md §5.5): GET /werkzeug/spurenbrett[?db=<name>].
// Die Seite rechnet im Browser (sql.js-Worker, src/sql/visual.js) auf der öffentlichen Übungs-DB. Wie bei der
// Ermittlungskonsole: ?db=eisdiele (Probefall) ohne Anmeldung, sonst angemeldet (alle Rollen). Nur Namen aus
// OEFFENTLICHE_DATENBANKEN – nie Varianten oder Verhör-DBs; unbekannte oder mehrfache db-Parameter → 404.

const express = require('express');
const { nurAngemeldet } = require('../kern/sitzung');
const { OEFFENTLICHE_DATENBANKEN } = require('../sql/datenbanken');
const { PUBLIC_DIR } = require('./seiten');

const OHNE_ANMELDUNG = new Set(['eisdiele']);
const ROLLEN = ['schueler', 'lehrkraft', 'superadmin'];

function spurenbrettRouten() {
  const router = express.Router({ caseSensitive: true, strict: true });
  const angemeldet = nurAngemeldet(ROLLEN);

  function sende(req, res) {
    res.set('Cache-Control', 'no-cache');
    res.sendFile('spurenbrett.html', { root: PUBLIC_DIR });
  }

  router.get('/werkzeug/spurenbrett', (req, res, next) => {
    const db = req.query.db;
    if (db !== undefined && (typeof db !== 'string' || !OEFFENTLICHE_DATENBANKEN.includes(db))) return next();
    if (OHNE_ANMELDUNG.has(db)) return sende(req, res);
    return angemeldet(req, res, () => sende(req, res));
  });

  return router;
}

module.exports = { spurenbrettRouten };
