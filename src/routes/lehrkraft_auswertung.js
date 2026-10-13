'use strict';
// Lehrkraft-Auswertung, Vorschau, Beamer-Board-API und Superadmin-Funktionen (Plan Phase 6 Task 3, Spec §7.11,
// §7.12, §7.14). Die Einstellungen (inkl. Board-Schlüssel) stehen in src/routes/lehrkraft.js.
//
//   GET  /api/lehrkraft/kurse/:kurs/auswertung                Matrix, Verhöre, Aufgabenstatistik, Fallen, Fehlabfragen
//   GET  /api/lehrkraft/kurse/:kurs/auswertung.csv            CSV (UTF-8 mit BOM, Semikolon)
//   GET  /api/lehrkraft/kurse/:kurs/vorschau                  alle Akten/Ermittlungen/Aufgaben/Verhör-Pools
//   GET  /api/lehrkraft/kurse/:kurs/vorschau/aufgaben/:id     eine Aufgabe mit Lösung, Erklärung, Tipps
//   GET  /api/board/:schluessel                               öffentlich: Beamer-Board (nur wenn eingeschaltet)
//   GET  /api/admin/seed-bericht                              Superadmin: letzter Seed-Bericht
//   POST /api/admin/inhalte-neu-laden                         Superadmin: Akten neu einspielen
//   GET  /api/admin/sicherung                                 Superadmin: Plattform-DB (VACUUM INTO) als Download
//
// Rechte: Lehrkraft nur für Kurse, in denen sie laut Mitgliedschaft Lehrkraft ist; Superadmin für alle. Schüler 403.
// Fremder und unbekannter Kurs: 403 (gleiche Antwort). Gesperrter Kurs: lesen erlaubt. Board: ungültiger, unbekannter
// oder ausgeschalteter Schlüssel und gesperrter Kurs → 404 (gleiche Antwort), Rate-Limit je IP.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const express = require('express');
const { nurAngemeldet } = require('../kern/sitzung');
const { istKursId } = require('../kern/verbund');
const { rateLimit } = require('../kern/sicherheit');
const { erzeugeAuswertung } = require('../services/auswertung');
const { erzeugeVorschau } = require('../services/vorschau');
const { erzeugeBoard } = require('../services/board');

class Fehler extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const AUFGABEN_ID = /^[A-Za-z0-9-]{1,40}$/;

function lehrkraftAuswertungRouten({ db, inhalte = null, stand = null, konfig }) {
  const router = express.Router();
  const lehrkraft = nurAngemeldet(['lehrkraft', 'superadmin']);
  const superadmin = nurAngemeldet(['superadmin']);
  const jetzt = konfig.jetzt || Date.now;
  const limits = konfig.rateLimits || {};
  const auswertung = inhalte && stand ? erzeugeAuswertung({ db, inhalte, stand }) : null;
  const vorschau = inhalte && stand ? erzeugeVorschau({ inhalte, stand }) : null;
  const board = auswertung ? erzeugeBoard({ db, inhalte, stand, auswertung, jetzt }) : null;

  const keinCache = (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  };

  /** Lesender Zugriff auf einen Kurs: Lehrkraft des Kurses oder Superadmin. → Kurs-ID */
  function kursLesen(req) {
    const kursId = req.params.kurs;
    if (!istKursId(kursId)) throw new Fehler(400, 'Ungültige Kurs-ID.');
    const k = db.prepare('SELECT kurs_id FROM kurse WHERE kurs_id = ?').get(kursId);
    let erlaubt = !!k && req.sitzung.rolle === 'superadmin';
    if (k && req.sitzung.rolle === 'lehrkraft') {
      const m = db.prepare('SELECT rolle FROM mitgliedschaften WHERE sub = ? AND kurs_id = ?').get(req.sitzung.sub, kursId);
      erlaubt = !!m && m.rolle === 'lehrkraft';
    }
    if (!erlaubt) throw new Fehler(403, 'Kein Zugriff auf diesen Kurs.');
    if (!auswertung) throw new Fehler(503, 'Die Inhalte sind gerade nicht geladen.');
    return kursId;
  }

  /* ---------- Lehrkraft ---------- */

  router.get('/api/lehrkraft/kurse/:kurs/auswertung', lehrkraft, keinCache, (req, res) => {
    res.json(auswertung.auswertung(kursLesen(req)));
  });

  router.get('/api/lehrkraft/kurse/:kurs/auswertung.csv', lehrkraft, keinCache, (req, res) => {
    const { dateiname, inhalt } = auswertung.csv(kursLesen(req));
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Content-Disposition', `attachment; filename="${dateiname}"`);
    res.send(Buffer.from(inhalt, 'utf8'));
  });

  router.get('/api/lehrkraft/kurse/:kurs/vorschau', lehrkraft, keinCache, (req, res) => {
    res.json(vorschau.uebersicht(kursLesen(req)));
  });

  router.get('/api/lehrkraft/kurse/:kurs/vorschau/aufgaben/:id', lehrkraft, keinCache, (req, res) => {
    const kursId = kursLesen(req);
    const id = req.params.id;
    const a = AUFGABEN_ID.test(id) ? vorschau.aufgabe(kursId, id) : null;
    if (!a) throw new Fehler(404, 'Aufgabe nicht gefunden.');
    res.json(a);
  });

  /* ---------- Beamer-Board (öffentlich) ---------- */

  router.use('/api/board', rateLimit({ fensterMs: 60000, max: 60, ...limits.board, schluessel: (req) => req.ip, jetzt }));
  router.get('/api/board/:schluessel', keinCache, (req, res) => {
    const d = board ? board.daten(req.params.schluessel) : null;
    if (!d) throw new Fehler(404, 'Nicht gefunden.');
    res.json(d);
  });

  /* ---------- Superadmin ---------- */

  function berichtSicht() {
    const b = inhalte ? inhalte.bericht() : null;
    const bericht = b
      ? {
          zeit: b.zeit,
          dateien: b.dateien.map((d) => ({
            datei: path.basename(d.datei),
            welt: d.welt,
            status: d.status,
            fehler: [...d.fehler],
            aufgaben: d.aufgaben,
            ausgelassen: d.ausgelassen,
            deaktiviert: d.deaktiviert
          })),
          entfernt: [...b.entfernt]
        }
      : { zeit: null, dateien: [], entfernt: [] };
    const akten = inhalte
      ? inhalte.akten().map((a) => ({
          nr: a.nr,
          titel: a.titel,
          ermittlungen: a.levels.length,
          aufgaben: a.levels.reduce((s, l) => s + l.aufgaben.length, 0),
          coldCases: a.levels.filter((l) => l.coldCase).length,
          verhoerPool: a.boss ? a.boss.pool.length : 0
        }))
      : [];
    return { bericht, umfang: inhalte ? inhalte.umfang() : null, akten };
  }

  router.get('/api/admin/seed-bericht', superadmin, keinCache, (req, res) => {
    res.json(berichtSicht());
  });

  router.post('/api/admin/inhalte-neu-laden', superadmin, keinCache, (req, res) => {
    if (!inhalte) throw new Fehler(503, 'Die Inhalte sind gerade nicht geladen.');
    try {
      inhalte.neuLaden();
    } catch (err) {
      console.error('Inhalte neu laden fehlgeschlagen:', err && err.message);
      throw new Fehler(500, 'Die Inhalte konnten nicht neu geladen werden.');
    }
    res.json(berichtSicht());
  });

  router.use('/api/admin/sicherung', rateLimit({ fensterMs: 60000, max: 6, ...limits.sicherung, jetzt }));
  router.get('/api/admin/sicherung', superadmin, keinCache, (req, res) => {
    const zeit = new Date(jetzt()).toISOString().replace(/\.\d{3}Z$/, 'Z').replace(/:/g, '-');
    const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'dd-sicherung-'));
    const datei = path.join(ordner, 'sicherung.sqlite');
    let inhalt;
    try {
      db.prepare('VACUUM INTO ?').run(datei);
      inhalt = fs.readFileSync(datei);
    } finally {
      fs.rmSync(ordner, { recursive: true, force: true });
    }
    res.set('Content-Type', 'application/octet-stream');
    res.set('Content-Disposition', `attachment; filename="datendetektei-sicherung-${zeit}.sqlite"`);
    res.send(inhalt);
  });

  // Fachliche Fehler mit ihrem deutschen Text; alles andere an den allgemeinen Fehler-Handler.
  // eslint-disable-next-line no-unused-vars
  router.use((err, req, res, next) => {
    if (err instanceof Fehler) return res.status(err.status).json({ error: err.message });
    next(err);
  });

  return router;
}

module.exports = { lehrkraftAuswertungRouten };
