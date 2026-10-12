'use strict';
// HTML-Seiten (statische Dateien aus public/, nur über diese expliziten Routen) und GET /api/akten.
// Die Seiten enthalten keine Nutzerdaten; das Browser-Skript holt sie per fetch (/api/ich, /api/akten, /api/plattform).

const path = require('node:path');
const express = require('express');
const { nurAngemeldet } = require('../kern/sitzung');
const { AKTEN } = require('../domain');
const { OEFFENTLICHE_DATENBANKEN } = require('../sql/datenbanken');

// Ermittlungskonsole „Freie Ermittlung“ (Plan Phase 2 Task 12): die Eisdiele (Probefall) ohne Anmeldung,
// die übrigen Akten-DBs nur angemeldet (alle Rollen). Die Seite ist für alle DBs dieselbe; das Skript liest den
// DB-Namen aus dem Pfad.
const KONSOLE_OHNE_ANMELDUNG = new Set(['eisdiele']);
const KONSOLE_ROLLEN = ['schueler', 'lehrkraft', 'superadmin'];

const PUBLIC_DIR = path.join(__dirname, '..', '..', 'public');

const OEFFENTLICH = {
  '/': 'index.html',
  '/gast': 'gast.html',
  '/themen': 'themen.html',
  '/datenschutz': 'datenschutz.html'
};

function seite(datei) {
  return function sende(req, res) {
    res.set('Cache-Control', 'no-cache');
    res.sendFile(datei, { root: PUBLIC_DIR });
  };
}

function seitenRouten() {
  const router = express.Router();

  for (const [pfad, datei] of Object.entries(OEFFENTLICH)) router.get(pfad, seite(datei));
  router.get('/lehrkraft', nurAngemeldet(['lehrkraft', 'superadmin']), seite('lehrkraft.html'));

  const konsoleAngemeldet = nurAngemeldet(KONSOLE_ROLLEN);
  const konsole = seite('konsole.html');
  router.get('/konsole/:db', (req, res, next) => {
    const name = req.params.db;
    if (!OEFFENTLICHE_DATENBANKEN.includes(name)) return next();
    if (KONSOLE_OHNE_ANMELDUNG.has(name)) return konsole(req, res);
    return konsoleAngemeldet(req, res, () => konsole(req, res));
  });

  const akten = { akten: AKTEN.map((a) => ({ nr: a.nr, titel: a.titel, niveaus: [...a.niveaus] })) };
  router.get('/api/akten', (req, res) => {
    res.set('Cache-Control', 'public, max-age=300');
    res.json(akten);
  });

  return router;
}

module.exports = { seitenRouten, PUBLIC_DIR };
