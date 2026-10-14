'use strict';
// Lern-API (Plan Phase 3 Task 5). Alle Routen unter /api/kurse/:kurs/… (kurs = URL-kodierte Kurs-ID, z. B. k%3A17),
// nur angemeldet (Schüler, Lehrkraft, Superadmin). Zugang, Freischaltung und Niveau prüft src/services/lernen.js.
//
//   GET  /api/kurse/:kurs/stand                        Stand (Akten, Ermittlungen, Punkte, Rang, Abzeichen, Fallen)
//   GET  /api/kurse/:kurs/ermittlungen/:id             Ermittlung mit Intro und Aufgabenliste
//   GET  /api/kurse/:kurs/aufgaben/:id                 Aufgabe (öffentliche Sicht + Zustand; nach Lösen/Aufdecken + loesung)
//   POST /api/kurse/:kurs/aufgaben/:id/pruefen         { antwort, teilweise?, teil? }
//   POST /api/kurse/:kurs/aufgaben/:id/tipp            {}
//   POST /api/kurse/:kurs/aufgaben/:id/loesung-zeigen  {}
//   POST /api/kurse/:kurs/aufgaben/:id/kernpunkte      { haken: n | [n je kernpunkte-Teil] }
//
// Rate-Limits je Konto (Spec §7.14): sql-Prüfungen 30/min (konfig.rateLimits.pruefenSql), alle POSTs 120/min
// (konfig.rateLimits.lernen). Fehler als JSON { error } mit deutschem Text ohne Details.

const express = require('express');
const { nurAngemeldet } = require('../kern/sitzung');
const { rateLimit, auftragsSperre } = require('../kern/sicherheit');
const { istKursId } = require('../kern/verbund');

function schuelerRouten({ lernen, konfig, sperre = auftragsSperre() }) {
  const router = express.Router();
  const angemeldet = nurAngemeldet(['schueler', 'lehrkraft', 'superadmin']);
  const limits = konfig.rateLimits || {};
  const jetzt = konfig.jetzt || Date.now;
  const jeKonto = (req) => req.sitzung.sub;
  const sqlLimit = rateLimit({ fensterMs: 60000, max: 30, ...limits.pruefenSql, schluessel: jeKonto, jetzt });
  const postLimit = rateLimit({ fensterMs: 60000, max: 120, ...limits.lernen, schluessel: jeKonto, jetzt });
  // sql-Aufgaben: Rate-Limit, dann höchstens ein Sandbox-Auftrag je Konto (F3, gemeinsame Sperre aus app.js)
  const sqlBegrenzer = sperre.wenn((req) => lernen.istSqlAufgabe(req.params.id), sqlLimit);

  const kurs = (req, res, next) => {
    if (!istKursId(req.params.kurs)) return res.status(400).json({ error: 'Ungültige Kurs-ID.' });
    next();
  };
  const json = (f) => async (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json(await f(req));
  };
  const basis = '/api/kurse/:kurs';
  const aufgabe = basis + '/aufgaben/:id';

  router.get(basis + '/stand', angemeldet, kurs, json((req) => lernen.stand(req.sitzung, req.params.kurs)));
  router.get(basis + '/ermittlungen/:id', angemeldet, kurs, json((req) => lernen.ermittlung(req.sitzung, req.params.kurs, req.params.id)));
  router.get(aufgabe, angemeldet, kurs, json((req) => lernen.aufgabe(req.sitzung, req.params.kurs, req.params.id)));
  router.post(
    aufgabe + '/pruefen',
    angemeldet,
    kurs,
    postLimit,
    sqlBegrenzer,
    json((req) => lernen.pruefen(req.sitzung, req.params.kurs, req.params.id, req.body))
  );
  router.post(aufgabe + '/tipp', angemeldet, kurs, postLimit, json((req) => lernen.tipp(req.sitzung, req.params.kurs, req.params.id)));
  router.post(aufgabe + '/loesung-zeigen', angemeldet, kurs, postLimit, json((req) => lernen.loesungZeigen(req.sitzung, req.params.kurs, req.params.id)));
  router.post(aufgabe + '/kernpunkte', angemeldet, kurs, postLimit, json((req) => lernen.kernpunkte(req.sitzung, req.params.kurs, req.params.id, req.body)));

  // Fachliche Fehler (HttpFehler, AntwortFehler) mit ihrem Text; alles andere an den allgemeinen Fehler-Handler.
  // eslint-disable-next-line no-unused-vars
  router.use((err, req, res, next) => {
    if (err && (err.name === 'HttpFehler' || err.name === 'AntwortFehler') && err.status >= 400 && err.status < 600) {
      return res.status(err.status).json({ error: err.message });
    }
    next(err);
  });

  return router;
}

module.exports = { schuelerRouten };
