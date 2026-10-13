'use strict';
// Live-Modus (Plan Phase 6 Task 6, Spec §7.10): Seiten, API und SSE. Fachlogik in src/services/live.js.
//
// Seiten:
//   GET  /live                                Schüler: beitreten, antworten, Code, Tipp (alle Rollen; Lehrkräfte sehen einen Hinweis)
//   GET  /lehrkraft/live                      Lehrkraft-Steuerung (Baustein public/static/js/live/steuerung.js)
//   GET  /live/:runde/beamer                  Beamer-Ansicht (immer dunkel), nur Lehrkraft/Superadmin
// API (nur angemeldet; Kurszugehörigkeit prüft der Dienst):
//   GET  /api/kurse/:kurs/live                aktuelle Runde des Kurses { runde, statistik? }
//   GET  /api/kurse/:kurs/live/inhalte        Auswahl für die Lehrkraft (Pool, Stationen – ohne Lösungen)
//   POST /api/kurse/:kurs/live                Runde starten { modus: duell|escape, aufgaben?, zeitSek?, teams?, dauerMin?, tippNachMin?, niveau? }
//   GET  /api/live/:runde[?sicht=beamer]      Zustand (Sicht nach Rolle)
//   GET  /api/live/:runde/ereignisse[?sicht=beamer]   SSE: „zustand“ bei jeder Änderung, „ende“, Herzschlag 20 s
//   POST /api/live/:runde/beitreten           { team }
//   POST /api/live/:runde/antwort             Duell { aufgabe, antwort } · Escape { antwort }
//   POST /api/live/:runde/code                { code }
//   POST /api/live/:runde/tipp                {}
//   POST /api/live/:runde/steuerung           { aktion: naechste|schliessen|los|tippsFrei|verlaengern|ende, an?, min? }
// Rate-Limits je Konto: alle POSTs 120/min (konfig.rateLimits.lernen), Antworten 30/min (konfig.rateLimits.pruefenSql);
// falsche Codes begrenzt der Dienst je Team. Körper über 20 000 Zeichen → 413.

const path = require('node:path');
const express = require('express');
const { nurAngemeldet } = require('../kern/sitzung');
const { rateLimit } = require('../kern/sicherheit');
const { istKursId } = require('../kern/verbund');

const PUBLIC_DIR = path.join(__dirname, '..', '..', 'public');
const MAX_KOERPER = 20000;

function seite(datei) {
  return (req, res) => {
    res.set('Cache-Control', 'no-cache');
    res.sendFile(datei, { root: PUBLIC_DIR });
  };
}

function liveRouten({ live, konfig }) {
  const router = express.Router();
  const angemeldet = nurAngemeldet(['schueler', 'lehrkraft', 'superadmin']);
  const lehrkraft = nurAngemeldet(['lehrkraft', 'superadmin']);
  const limits = konfig.rateLimits || {};
  const jetzt = konfig.jetzt || Date.now;
  const jeKonto = (req) => req.sitzung.sub;
  const postLimit = rateLimit({ fensterMs: 60000, max: 120, ...limits.lernen, schluessel: jeKonto, jetzt });
  const antwortLimit = rateLimit({ fensterMs: 60000, max: 30, ...limits.pruefenSql, schluessel: jeKonto, jetzt });

  const kurs = (req, res, next) => {
    if (!istKursId(req.params.kurs)) return res.status(400).json({ error: 'Ungültige Kurs-ID.' });
    next();
  };
  const runde = (req, res, next) => {
    if (!live.istRundeId(req.params.runde)) return res.status(404).json({ error: 'Diese Live-Runde gibt es nicht (mehr).' });
    next();
  };
  const groesse = (req, res, next) => {
    let laenge = 0;
    try {
      laenge = JSON.stringify(req.body === undefined ? {} : req.body).length;
    } catch {
      laenge = Infinity;
    }
    if (laenge > MAX_KOERPER) return res.status(413).json({ error: 'Die Antwort ist zu groß.' });
    next();
  };
  const json = (f) => async (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json(await f(req));
  };
  const sicht = (req) => (req.query.sicht === 'beamer' ? 'beamer' : null);

  /* ---------- Seiten ---------- */
  router.get('/live', angemeldet, seite('live.html'));
  router.get('/lehrkraft/live', lehrkraft, seite('lehrkraft-live.html'));
  router.get('/live/:runde/beamer', (req, res, next) => {
    if (!live.istRundeId(req.params.runde)) return next();
    return lehrkraft(req, res, () => seite('live-beamer.html')(req, res));
  });

  /* ---------- Kurs ---------- */
  const k = '/api/kurse/:kurs/live';
  router.get(k, angemeldet, kurs, json((req) => live.kursRunde(req.sitzung, req.params.kurs)));
  router.get(k + '/inhalte', angemeldet, kurs, json((req) => live.auswahl(req.sitzung, req.params.kurs)));
  router.post(k, angemeldet, kurs, postLimit, groesse, json((req) => live.starten(req.sitzung, req.params.kurs, req.body)));

  /* ---------- Runde ---------- */
  const r = '/api/live/:runde';
  router.get(r, angemeldet, runde, json((req) => live.zustand(req.sitzung, req.params.runde, sicht(req))));
  router.post(r + '/beitreten', angemeldet, runde, postLimit, groesse, json((req) => live.beitreten(req.sitzung, req.params.runde, req.body)));
  router.post(r + '/antwort', angemeldet, runde, postLimit, antwortLimit, groesse, json((req) => live.antworten(req.sitzung, req.params.runde, req.body)));
  router.post(r + '/code', angemeldet, runde, postLimit, groesse, json((req) => live.code(req.sitzung, req.params.runde, req.body)));
  router.post(r + '/tipp', angemeldet, runde, postLimit, json((req) => live.tipp(req.sitzung, req.params.runde)));
  router.post(r + '/steuerung', angemeldet, runde, postLimit, groesse, json((req) => live.steuern(req.sitzung, req.params.runde, req.body)));

  // SSE: Fehler (401/403/404) vor dem Öffnen des Streams als JSON; danach nur noch Ereignisse.
  router.get(r + '/ereignisse', angemeldet, runde, (req, res, next) => {
    let abo;
    try {
      abo = live.abonnieren(req.sitzung, req.params.runde, sicht(req), {
        schreibe: (text) => res.write(text),
        schliesse: () => res.end()
      });
    } catch (e) {
      return next(e);
    }
    res.status(200).set({
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Accel-Buffering': 'no',
      Connection: 'keep-alive'
    });
    res.flushHeaders();
    req.socket.setNoDelay(true);
    req.socket.setTimeout(0);
    res.on('close', () => abo.ende());
    abo.start();
  });

  // eslint-disable-next-line no-unused-vars
  router.use((err, req, res, next) => {
    if (err && (err.name === 'HttpFehler' || err.name === 'AntwortFehler') && err.status >= 400 && err.status < 600) {
      if (err.retryAfter) res.set('Retry-After', String(err.retryAfter));
      return res.status(err.status).json({ error: err.message });
    }
    next(err);
  });

  return router;
}

module.exports = { liveRouten };
