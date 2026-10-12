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

/** [Pfad, Muster für :wert (oder null), Datei] der Schülerseiten. */
const SCHUELER_SEITEN = [
  ['/akte/:wert', /^[1-7]$/, 'akte.html'],
  ['/ermittlung/:wert', /^A[1-9]\d?-E[1-9]\d?$/, 'ermittlung.html'],
  ['/verhoer/:wert', /^[1-7]$/, 'verhoer.html'],
  ['/warmup', null, 'warmup.html'],
  ['/training', null, 'training.html']
];

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

  // Schülerseiten (Plan Phase 3 Task 9): alle Rollen (Lehrkraft/Superadmin als Vorschau). Ungültige Parameter → 404,
  // bevor die Anmeldung geprüft wird; Kurs, Freischaltung und Inhalte prüft die Lern-API.
  const lernenAngemeldet = nurAngemeldet(KONSOLE_ROLLEN);
  for (const [pfad, muster, datei] of SCHUELER_SEITEN) {
    const sende = seite(datei);
    router.get(pfad, (req, res, next) => {
      if (muster && !muster.test(req.params.wert)) return next();
      return lernenAngemeldet(req, res, () => sende(req, res));
    });
  }

  const konsoleAngemeldet = nurAngemeldet(KONSOLE_ROLLEN);
  const konsole = seite('konsole.html');
  router.get('/konsole/:db', (req, res, next) => {
    const name = req.params.db;
    if (!OEFFENTLICHE_DATENBANKEN.includes(name)) return next();
    if (KONSOLE_OHNE_ANMELDUNG.has(name)) return konsole(req, res);
    return konsoleAngemeldet(req, res, () => konsole(req, res));
  });

  // Zeitlupe (Plan Phase 4 Task 2, DESIGN §5.4): angemeldet (alle Rollen); mit ?db=eisdiele auch ohne Anmeldung
  // (wie die Konsole). Die Abfrage kommt nie über die URL, sondern über sessionStorage (dd_zeitlupe). Nur öffentliche
  // Übungs-DBs; alles andere (unbekannt, Verhör-DB, mehrfach, leer) → 404.
  const zeitlupe = seite('zeitlupe.html');
  router.get('/werkzeug/zeitlupe', (req, res, next) => {
    const db = req.query.db;
    if (db === undefined) return konsoleAngemeldet(req, res, () => zeitlupe(req, res));
    if (typeof db !== 'string' || !OEFFENTLICHE_DATENBANKEN.includes(db)) return next();
    if (KONSOLE_OHNE_ANMELDUNG.has(db)) return zeitlupe(req, res);
    return konsoleAngemeldet(req, res, () => zeitlupe(req, res));
  });

  const akten = { akten: AKTEN.map((a) => ({ nr: a.nr, titel: a.titel, niveaus: [...a.niveaus] })) };
  router.get('/api/akten', (req, res) => {
    res.set('Cache-Control', 'public, max-age=300');
    res.json(akten);
  });

  return router;
}

module.exports = { seitenRouten, PUBLIC_DIR };
