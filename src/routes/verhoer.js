'use strict';
// Verhör-API (Plan Phase 3 Task 7, Spec §7.9). Fachlogik in src/services/verhoer.js; nur angemeldet.
//
//   GET  /api/kurse/:kurs/verhoere/:akte            Status (frei/grund, Dauer, Anzahl, bester Versuch, laufend, nächster Versuch ab)
//   POST /api/kurse/:kurs/verhoere/:akte/start      neuen Versuch beginnen (oder laufenden fortsetzen) → Aufgaben ohne Lösungsdaten
//   GET  /api/kurse/:kurs/verhoere/:akte/versuch    laufender Versuch (Aufgaben + beantwortet) bzw. Ergebnis des letzten
//   POST /api/kurse/:kurs/verhoere/:akte/antwort    { aufgabe, antwort } → { gespeichert: true } (keine Rückmeldung)
//   POST /api/kurse/:kurs/verhoere/:akte/abgeben    beendet den Versuch → Ergebnis
//
// Rate-Limits je Konto: alle POSTs 120/min (konfig.rateLimits.lernen), Antworten auf sql-Aufgaben 30/min
// (konfig.rateLimits.pruefenSql). Fehler als JSON { error[, naechsterVersuchAb] } mit deutschem Text ohne Details.

const express = require('express');
const { nurAngemeldet } = require('../kern/sitzung');
const { rateLimit } = require('../kern/sicherheit');
const { istKursId } = require('../kern/verbund');

function verhoerRouten({ verhoer, konfig }) {
  const router = express.Router();
  const angemeldet = nurAngemeldet(['schueler', 'lehrkraft', 'superadmin']);
  const limits = konfig.rateLimits || {};
  const jetzt = konfig.jetzt || Date.now;
  const jeKonto = (req) => req.sitzung.sub;
  const sqlLimit = rateLimit({ fensterMs: 60000, max: 30, ...limits.pruefenSql, schluessel: jeKonto, jetzt });
  const postLimit = rateLimit({ fensterMs: 60000, max: 120, ...limits.lernen, schluessel: jeKonto, jetzt });
  const sqlBegrenzer = (req, res, next) =>
    req.body && verhoer.istSqlAufgabe(req.body.aufgabe) ? sqlLimit(req, res, next) : next();

  const kurs = (req, res, next) => {
    if (!istKursId(req.params.kurs)) return res.status(400).json({ error: 'Ungültige Kurs-ID.' });
    next();
  };
  const json = (f) => async (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json(await f(req));
  };
  const basis = '/api/kurse/:kurs/verhoere/:akte';
  const p = (req) => [req.sitzung, req.params.kurs, req.params.akte];

  router.get(basis, angemeldet, kurs, json((req) => verhoer.status(...p(req))));
  router.post(basis + '/start', angemeldet, kurs, postLimit, json((req) => verhoer.starten(...p(req))));
  router.get(basis + '/versuch', angemeldet, kurs, json((req) => verhoer.versuch(...p(req))));
  router.post(basis + '/antwort', angemeldet, kurs, postLimit, sqlBegrenzer, json((req) => verhoer.antworten(...p(req), req.body)));
  router.post(basis + '/abgeben', angemeldet, kurs, postLimit, json((req) => verhoer.abgeben(...p(req))));

  // eslint-disable-next-line no-unused-vars
  router.use((err, req, res, next) => {
    if (err && (err.name === 'HttpFehler' || err.name === 'AntwortFehler') && err.status >= 400 && err.status < 600) {
      return res.status(err.status).json({ error: err.message, ...(err.daten || {}) });
    }
    next(err);
  });

  return router;
}

module.exports = { verhoerRouten };
