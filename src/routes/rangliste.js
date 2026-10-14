'use strict';
// Scoreboard (Vertrag §4: Schüler sehen „das Scoreboard ihrer Kurse (falls aktiv)“, Kurseinstellung scoreboard).
//
//   GET /api/kurse/:kurs/rangliste   Top 10 des Kurses + eigener Platz (Platz, Anzeigename, Rang, Punkte; ohne sub)
//
// Zugang wie die Lern-API (lernen.zugang): Mitglied des aktiven Kurses, Lehrkraft des Kurses, Superadmin; fremder und
// unbekannter Kurs 403, gesperrter Kurs nur Lehrkraft/Superadmin (lesen). Schalter aus: Schüler 404 (wie das
// ausgeschaltete Board), Lehrkraft/Superadmin sehen die Vorschau mit aktiv: false. Daten aus src/services/board.js.

const express = require('express');
const { nurAngemeldet } = require('../kern/sitzung');
const { istKursId } = require('../kern/verbund');
const { erzeugeAuswertung } = require('../services/auswertung');
const { erzeugeBoard } = require('../services/board');

function ranglisteRouten({ db, inhalte, stand, lernen }) {
  const router = express.Router();
  const angemeldet = nurAngemeldet(['schueler', 'lehrkraft', 'superadmin']);
  const board = erzeugeBoard({ db, inhalte, stand, auswertung: erzeugeAuswertung({ db, inhalte, stand }) });

  router.get('/api/kurse/:kurs/rangliste', angemeldet, (req, res) => {
    if (!istKursId(req.params.kurs)) return res.status(400).json({ error: 'Ungültige Kurs-ID.' });
    res.set('Cache-Control', 'no-store');
    const z = lernen.zugang(req.sitzung, req.params.kurs);
    if (z.rolle === 'schueler' && z.einst.scoreboard !== true) return res.status(404).json({ error: 'Nicht gefunden.' });
    res.json(board.rangliste(z.kurs.id, z.rolle === 'schueler' ? z.sub : null));
  });

  // eslint-disable-next-line no-unused-vars
  router.use((err, req, res, next) => {
    if (err && err.name === 'HttpFehler' && err.status >= 400 && err.status < 600) return res.status(err.status).json({ error: err.message });
    next(err);
  });

  return router;
}

module.exports = { ranglisteRouten };
