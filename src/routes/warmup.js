'use strict';
// Warm-up-Trainer (Plan Phase 3 Task 8, Spec §7.8). Alle Routen unter /api/kurse/:kurs/warmup, nur angemeldet;
// Zugang (Mitgliedschaft, Kurs aktiv, Freischaltung der Akte) prüft src/services/warmup.js. Ohne Punkte.
//
//   GET  /api/kurse/:kurs/warmup?akte=&kategorie=      Übersicht: Akten, Kategorien, Statistik (Fächer, fällig)
//   POST /api/kurse/:kurs/warmup/ziehen                { akte?, kategorie?, ausser? } → nächste fällige Karte (ohne Lösung)
//   POST /api/kurse/:kurs/warmup/karten/:id/aufdecken  {} → { id, loesung, loesungSql, datenbank, falle }
//   POST /api/kurse/:kurs/warmup/karten/:id/bewerten   { ergebnis: gewusst|teilweise|nicht } → { id, vorher, fach, faelligAb }

const express = require('express');
const { nurAngemeldet } = require('../kern/sitzung');
const { rateLimit } = require('../kern/sicherheit');
const { istKursId } = require('../kern/verbund');

function warmupRouten({ warmup, konfig }) {
  const router = express.Router();
  const angemeldet = nurAngemeldet(['schueler', 'lehrkraft', 'superadmin']);
  const limits = konfig.rateLimits || {};
  const postLimit = rateLimit({
    fensterMs: 60000,
    max: 120,
    ...limits.lernen,
    schluessel: (req) => req.sitzung.sub,
    jetzt: konfig.jetzt || Date.now
  });
  const kurs = (req, res, next) => {
    if (!istKursId(req.params.kurs)) return res.status(400).json({ error: 'Ungültige Kurs-ID.' });
    next();
  };
  const json = (f) => (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json(f(req));
  };
  const basis = '/api/kurse/:kurs/warmup';
  const karte = basis + '/karten/:id';

  router.get(basis, angemeldet, kurs, json((req) => warmup.uebersicht(req.sitzung, req.params.kurs, req.query)));
  router.post(basis + '/ziehen', angemeldet, kurs, postLimit, json((req) => warmup.ziehen(req.sitzung, req.params.kurs, req.body)));
  router.post(karte + '/aufdecken', angemeldet, kurs, postLimit, json((req) => warmup.aufdecken(req.sitzung, req.params.kurs, req.params.id)));
  router.post(
    karte + '/bewerten',
    angemeldet,
    kurs,
    postLimit,
    json((req) => warmup.bewerten(req.sitzung, req.params.kurs, req.params.id, req.body))
  );

  // Fachliche Fehler (HttpFehler) mit ihrem Text; alles andere an den allgemeinen Fehler-Handler.
  // eslint-disable-next-line no-unused-vars
  router.use((err, req, res, next) => {
    if (err && err.name === 'HttpFehler' && err.status >= 400 && err.status < 600) {
      return res.status(err.status).json({ error: err.message });
    }
    next(err);
  });
  return router;
}

module.exports = { warmupRouten };
