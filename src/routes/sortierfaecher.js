'use strict';
// Werkzeugseite „Sortierfächer“ (Plan Phase 4 Task 4, DESIGN.md §5.6): GET /werkzeug/sortierfaecher[?db=<name>].
// Gerechnet wird nur im Browser (sql.js auf der öffentlichen Übungs-DB, src/sql/visual.js); die Seite selbst enthält
// keine Daten. Rechte wie die Ermittlungskonsole: ?db=eisdiele ohne Anmeldung, alles andere (auch ohne db) nur
// angemeldet (alle Rollen). Unbekannte oder mehrfach angegebene DB → 404, bevor die Anmeldung geprüft wird.

const express = require('express');
const { nurAngemeldet } = require('../kern/sitzung');
const { OEFFENTLICHE_DATENBANKEN } = require('../sql/datenbanken');
const { PUBLIC_DIR } = require('./seiten');

const OHNE_ANMELDUNG = new Set(['eisdiele']);
const ROLLEN = ['schueler', 'lehrkraft', 'superadmin'];

function sortierfaecherRouten() {
  const router = express.Router({ caseSensitive: true, strict: true });
  const angemeldet = nurAngemeldet(ROLLEN);

  function sende(req, res) {
    res.set('Cache-Control', 'no-cache');
    res.sendFile('sortierfaecher.html', { root: PUBLIC_DIR });
  }

  router.get('/werkzeug/sortierfaecher', (req, res, next) => {
    const db = req.query.db;
    if (db !== undefined && (typeof db !== 'string' || !OEFFENTLICHE_DATENBANKEN.includes(db))) return next();
    if (db !== undefined && OHNE_ANMELDUNG.has(db)) return sende(req, res);
    return angemeldet(req, res, () => sende(req, res));
  });

  return router;
}

module.exports = { sortierfaecherRouten };
