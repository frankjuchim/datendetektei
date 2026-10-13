'use strict';
// Seitenrouten des Lehrkraft-Bereichs (Plan Phase 6 Task 4, Spec §7.11, §7.12, §8, DESIGN §5.11, §5.12):
//
//   GET /lehrkraft/urkunden?kurs=k:<id>   Druckseite „Detektei-Lizenz“ (nur Lehrkraft des Kurses bzw. Superadmin)
//   GET /board/:schluessel                Beamer-Board (öffentlich; nur mit gültigem Schlüssel, eingeschaltetem Board
//                                         und aktivem Kurs – sonst die 404-Seite wie bei jeder unbekannten Adresse)
//
// Die Seiten enthalten keine Nutzerdaten; die Skripte holen sie über die APIs aus src/routes/lehrkraft_auswertung.js
// (Auswertung, Board). /lehrkraft selbst liefert src/routes/seiten.js.

const express = require('express');
const { nurAngemeldet } = require('../kern/sitzung');
const { istKursId } = require('../kern/verbund');
const { rateLimit } = require('../kern/sicherheit');
const { istBoardSchluessel } = require('../services/board');
const { PUBLIC_DIR } = require('./seiten');

function seite(datei, cache = 'no-cache') {
  return (req, res) => {
    res.set('Cache-Control', cache);
    res.sendFile(datei, { root: PUBLIC_DIR });
  };
}

function lehrkraftSeitenRouten({ db, stand = null, konfig }) {
  const router = express.Router();
  const lehrkraft = nurAngemeldet(['lehrkraft', 'superadmin']);
  const limits = konfig.rateLimits || {};
  const jetzt = konfig.jetzt || Date.now;

  /* ---------- Urkunden (Druckseite) ---------- */
  const urkunden = seite('lehrkraft-urkunden.html');
  router.get('/lehrkraft/urkunden', lehrkraft, (req, res, next) => {
    const kursId = req.query.kurs;
    if (typeof kursId !== 'string' || !istKursId(kursId)) return next();
    const k = db.prepare('SELECT kurs_id FROM kurse WHERE kurs_id = ?').get(kursId);
    let erlaubt = !!k && req.sitzung.rolle === 'superadmin';
    if (k && req.sitzung.rolle === 'lehrkraft') {
      const m = db.prepare('SELECT rolle FROM mitgliedschaften WHERE sub = ? AND kurs_id = ?').get(req.sitzung.sub, kursId);
      erlaubt = !!m && m.rolle === 'lehrkraft';
    }
    if (!erlaubt) return res.status(403).sendFile('403.html', { root: PUBLIC_DIR });
    return urkunden(req, res);
  });

  /* ---------- Beamer-Board (öffentlich, geheimer Schlüssel in der Adresse) ---------- */
  /** Ist das Board zum Schlüssel gerade erreichbar? (gleiche Regel wie GET /api/board/:schluessel) */
  function boardAktiv(schluessel) {
    if (!stand || !istBoardSchluessel(schluessel)) return false;
    const z = db.prepare('SELECT kurs_id FROM kurse WHERE board_schluessel = ?').get(schluessel);
    if (!z) return false;
    const k = stand.kurs(z.kurs_id);
    return !!k && k.aktiv && k.einstellungen.beamer === true;
  }

  const board = seite('board.html', 'no-store');
  router.use('/board', rateLimit({ fensterMs: 60000, max: 60, ...limits.board, schluessel: (req) => req.ip, jetzt }));
  router.get('/board/:schluessel', (req, res, next) => {
    if (!boardAktiv(req.params.schluessel)) return next();
    // Der Schlüssel steht in der Adresse: nie als Referrer weitergeben.
    res.set('Referrer-Policy', 'no-referrer');
    return board(req, res);
  });

  return router;
}

module.exports = { lehrkraftSeitenRouten };
