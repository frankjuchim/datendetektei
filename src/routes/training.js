'use strict';
// Trainingsplatz T1–T7 (Plan Phase 3 Task 8, Phase 5 Task 5, Spec §7.8). Alle Routen unter /api/kurse/:kurs/training, nur angemeldet.
// Die Aufgabe wird nicht gespeichert: der Client bekommt { typ, seed, signatur, aufgabe } und schickt
// { typ, seed, signatur, antwort } zurück (src/services/training.js).
//
//   GET  /api/kurse/:kurs/training          → { generatoren, heute: { punkte, aufgaben }, maxProTag, punkteGesamt }
//   POST /api/kurse/:kurs/training/neu      { typ } → { typ, seed, signatur, aufgabe, heute, maxProTag }
//   POST /api/kurse/:kurs/training/pruefen  { typ, seed, signatur, antwort }
//                                           → { ok, rueckmeldung, punkteErhalten, gewertet, heute, maxProTag, loesung?, erklaerung? }
//   POST /api/kurse/:kurs/training/loesung  { typ, seed, signatur } → { loesung, erklaerung, heute, maxProTag }

const express = require('express');
const { nurAngemeldet } = require('../kern/sitzung');
const { rateLimit } = require('../kern/sicherheit');
const { istKursId } = require('../kern/verbund');

function trainingRouten({ training, konfig }) {
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
  const json = (f) => async (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json(await f(req));
  };
  const basis = '/api/kurse/:kurs/training';

  router.get(basis, angemeldet, kurs, json((req) => training.info(req.sitzung, req.params.kurs)));
  router.post(basis + '/neu', angemeldet, kurs, postLimit, json((req) => training.neu(req.sitzung, req.params.kurs, req.body)));
  router.post(basis + '/pruefen', angemeldet, kurs, postLimit, json((req) => training.pruefen(req.sitzung, req.params.kurs, req.body)));
  router.post(basis + '/loesung', angemeldet, kurs, postLimit, json((req) => training.loesung(req.sitzung, req.params.kurs, req.body)));

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

module.exports = { trainingRouten };
