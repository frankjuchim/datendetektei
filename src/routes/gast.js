'use strict';
// Gastmodus ohne Anmeldung (Spec §7.12, E13; Plan Phase 3 Task 10). Nichts wird gespeichert.
//
//   GET  /api/gast/probefall                   Probefall Eisdiele (öffentliche Sicht, ohne Lösungen/Tipps/Erklärungen)
//   POST /api/gast/aufgaben/:id/pruefen        { antwort } → { ok, rueckmeldung, geloest, loesung? }
//   POST /api/gast/aufgaben/:id/tipp           { nr } → { nr, tipp, anzahl }
//   POST /api/gast/aufgaben/:id/loesung        {} → { loesung, erklaerung } (nur auf ausdrücklichen Wunsch)
//   GET  /api/gast/lehrkraft                   erfundener Demo-Kurs (nur lesend)
//   GET  /api/gast/material                    Gast-PDF-Whitelist (Titel + Link)
//   GET  /gast/material/<datei>                PDF nur aus der Whitelist (auch Akte1/…), sonst 404
//
// Rate-Limits je IP (nur im RAM): Prüfen 30/min (konfig.rateLimits.gastPruefen), alle Gast-POSTs 120/min
// (konfig.rateLimits.gast). Origin-Prüfung und JSON-Pflicht übernimmt pruefeHerkunft in app.js.

const express = require('express');
const { rateLimit } = require('../kern/sicherheit');
const { sendeMaterial, schluesselAus, CACHE } = require('./material');

function gastRouten({ gast, pruefer = null, konfig }) {
  const router = express.Router({ caseSensitive: true, strict: true });
  const limits = konfig.rateLimits || {};
  const jetzt = konfig.jetzt || Date.now;
  const jeIp = (req) => 'gast:' + req.ip;
  // je IP: ganze Klassen hinter einer Schul-NAT teilen sich eine Adresse
  const pruefLimit = rateLimit({ fensterMs: 60000, max: 120, ...limits.gastPruefen, schluessel: jeIp, jetzt });
  const postLimit = rateLimit({ fensterMs: 60000, max: 600, ...limits.gast, schluessel: jeIp, jetzt });

  const json = (f) => async (req, res, next) => {
    try {
      res.set('Cache-Control', 'no-store');
      res.json(await f(req));
    } catch (e) {
      next(e);
    }
  };
  const aufgabe = '/api/gast/aufgaben/:id';

  router.get('/api/gast/probefall', json(() => gast.probefall()));
  router.post(aufgabe + '/pruefen', postLimit, pruefLimit, json((req) => gast.pruefen(req.params.id, req.body, { pruefer })));
  router.post(aufgabe + '/tipp', postLimit, json((req) => gast.tipp(req.params.id, req.body)));
  router.post(aufgabe + '/loesung', postLimit, json((req) => gast.loesung(req.params.id)));
  router.get('/api/gast/lehrkraft', json(() => gast.lehrkraft()));
  router.get('/api/gast/material', json(() => gast.materialListe()));

  router.get('/gast/material/*datei', (req, res, next) => {
    const schluessel = schluesselAus(req.params.datei);
    const ziel = schluessel && gast.materialPfad(schluessel);
    if (!ziel) return next();
    return sendeMaterial(res, next, ziel, CACHE.gast);
  });

  // Fachliche Fehler (HttpFehler) mit ihrem deutschen Text; alles andere an den allgemeinen Fehler-Handler.
  // eslint-disable-next-line no-unused-vars
  router.use((err, req, res, next) => {
    if (err && err.name === 'HttpFehler' && err.status >= 400 && err.status < 600) {
      return res.status(err.status).json({ error: err.message });
    }
    next(err);
  });

  return router;
}

module.exports = { gastRouten };
