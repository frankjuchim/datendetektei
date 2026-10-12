'use strict';
// HTML-Seiten (statische Dateien aus public/, nur über diese expliziten Routen) und GET /api/akten.
// Die Seiten enthalten keine Nutzerdaten; das Browser-Skript holt sie per fetch (/api/ich, /api/akten, /api/plattform).

const path = require('node:path');
const express = require('express');
const { nurAngemeldet } = require('../kern/sitzung');
const { AKTEN } = require('../domain');

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

  const akten = { akten: AKTEN.map((a) => ({ nr: a.nr, titel: a.titel, niveaus: [...a.niveaus] })) };
  router.get('/api/akten', (req, res) => {
    res.set('Cache-Control', 'public, max-age=300');
    res.json(akten);
  });

  return router;
}

module.exports = { seitenRouten, PUBLIC_DIR };
