'use strict';
// Routen der Verbund-API (Vertrag §6). Reihenfolge je Route: Rate-Limit → Token → JSON → Validierung.
// Keine Origin-Prüfung (kein Browser beteiligt); eigener JtiSpeicher getrennt vom SSO.

const express = require('express');
const { JtiSpeicher } = require('../kern/jwt');
const { verbundAuth, pruefeLoeschAuftrag, pruefeKursAenderung, istKursId } = require('../kern/verbund');
const { loescheKonto, loescheKurs, aendereKurs, kursUebersicht } = require('../kern/konten');

const UNGUELTIG = { error: 'Ungültige Anfrage.' };

/** JSON-Body nach der Authentifizierung: anderer Content-Type (oder keiner) → 415, kaputtes JSON → 400. */
function nurJson() {
  const parser = express.json({ limit: '10kb' });
  return function json(req, res, next) {
    if (!req.is('application/json')) return res.status(415).json({ error: 'Nur JSON erlaubt.' });
    parser(req, res, (err) => (err ? res.status(400).json(UNGUELTIG) : next()));
  };
}

function kursIdPruefen(req, res, next) {
  if (!istKursId(req.params.kursId)) return res.status(400).json(UNGUELTIG);
  next();
}

function verbundRouten(konfig, db) {
  const router = express.Router();
  const jti = new JtiSpeicher();
  const auth = (zweck) => verbundAuth(konfig, jti, zweck);

  router.post('/api/verbund/loeschen', auth('loeschen'), nurJson(), (req, res) => {
    const auftrag = pruefeLoeschAuftrag(req.body);
    if (!auftrag) return res.status(400).json({ error: 'Genau eines von sub oder kurs angeben.' });
    const geloescht = auftrag.sub ? loescheKonto(db, auftrag.sub) : loescheKurs(db, auftrag.kurs);
    res.json({ geloescht });
  });

  router.get('/api/verbund/kurse/:kursId/uebersicht', auth('kurs-uebersicht'), kursIdPruefen, (req, res) => {
    const uebersicht = kursUebersicht(db, req.params.kursId, konfig.jetzt);
    if (!uebersicht) return res.status(404).json({ error: 'Kurs unbekannt.' });
    res.set('Cache-Control', 'no-store');
    res.json(uebersicht);
  });

  router.post('/api/verbund/kurse/:kursId', auth('kurs-aendern'), kursIdPruefen, nurJson(), (req, res) => {
    const aenderung = pruefeKursAenderung(req.body);
    if (!aenderung) return res.status(400).json(UNGUELTIG);
    aendereKurs(db, req.params.kursId, aenderung);
    res.json({ ok: true });
  });

  return router;
}

module.exports = { verbundRouten };
