'use strict';
// Fallebene-API (Plan Phase 6 Task 2, Spec §7.7). Fachlogik in src/services/fallebene.js; nur angemeldet, nur lesend.
//
//   GET /api/kurse/:kurs/pinnwand   Beweisstücke (gewonnene Verhöre), Steckbrief (Regel E10), Indizienkette des
//                                   Schlussplädoyers (Indizien/Auflösung erst nach dem Lösen)
//
// Zugang wie die Lern-API (Mitglied/Lehrkraft des Kurses, Superadmin; gesperrter Kurs nur Lehrkraft/Superadmin).

const express = require('express');
const { nurAngemeldet } = require('../kern/sitzung');
const { istKursId } = require('../kern/verbund');

function fallebeneRouten({ fallebene }) {
  const router = express.Router();
  const angemeldet = nurAngemeldet(['schueler', 'lehrkraft', 'superadmin']);

  router.get('/api/kurse/:kurs/pinnwand', angemeldet, (req, res) => {
    if (!istKursId(req.params.kurs)) return res.status(400).json({ error: 'Ungültige Kurs-ID.' });
    res.set('Cache-Control', 'no-store');
    res.json(fallebene.pinnwand(req.sitzung, req.params.kurs));
  });

  // eslint-disable-next-line no-unused-vars
  router.use((err, req, res, next) => {
    if (err && err.name === 'HttpFehler' && err.status >= 400 && err.status < 600) return res.status(err.status).json({ error: err.message });
    next(err);
  });

  return router;
}

module.exports = { fallebeneRouten };
