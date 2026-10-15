'use strict';
// Routen für Single Sign-on, Abmelden und /api/ich (Vertrag §5, INTEGRATION §3).

const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const { JtiSpeicher } = require('../kern/jwt');
const { setzeSitzung, beendeSitzung, nurAngemeldet } = require('../kern/sitzung');
const { neuerState, pruefeZiel, autorisierenUrl, setzeState, werteSsoEndeAus } = require('../kern/sso');
const { upsertAusToken } = require('../kern/konten');
const { leseEinstellungen } = require('../services/stand');

const FEHLER_VORLAGE = fs.readFileSync(path.join(__dirname, '..', '..', 'public', 'sso-fehler.html'), 'utf8');
const FEHLER_CODES = ['ungueltig', 'keine_berechtigung', 'abgebrochen'];
const FEHLER_STATUS = { ungueltig: 401, keine_berechtigung: 403, abgebrochen: 200 };

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (z) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[z]);

/** Fehlerseite: Vorlage mit festem Code aus der Whitelist (nie Eingaben oder Prüfgründe einsetzen). */
function fehlerSeite(konfig, code) {
  const fall = FEHLER_CODES.includes(code) ? code : 'ungueltig';
  // Abschnitt zum Fehlercode schon vom Server sichtbar (auch ohne JavaScript); sso-fehler.js bleibt als Rückfall
  return FEHLER_VORLAGE.replaceAll('__FEHLER__', fall)
    .replace(`data-fall="${fall}" hidden>`, `data-fall="${fall}">`)
    .replaceAll('__PORTAL_URL__', escapeHtml(konfig.portalUrl));
}

function ssoRouten(konfig, db) {
  const router = express.Router();
  const jtiSpeicher = new JtiSpeicher();

  router.get('/sso/start', (req, res) => {
    const state = neuerState();
    setzeState(res, konfig, state);
    res.set('Cache-Control', 'no-store');
    res.redirect(302, autorisierenUrl(konfig, state, pruefeZiel(req.query.ziel)));
  });

  router.get('/sso/ende', (req, res) => {
    res.set('Referrer-Policy', 'no-referrer');
    res.set('Cache-Control', 'no-store');
    const ergebnis = werteSsoEndeAus(req, res, konfig, jtiSpeicher);
    if (!ergebnis.ok) {
      res.status(FEHLER_STATUS[ergebnis.code] || 401).type('html').send(fehlerSeite(konfig, ergebnis.code));
      return;
    }
    const konto = upsertAusToken(db, ergebnis.nutzlast, konfig.jetzt);
    setzeSitzung(res, konfig, konto);
    res.redirect(302, pruefeZiel(req.query.ziel));
  });

  router.get('/abmelden', (req, res) => {
    beendeSitzung(res, konfig);
    res.redirect(302, '/');
  });

  router.get('/abmelden/ueberall', (req, res) => {
    beendeSitzung(res, konfig);
    res.redirect(302, `${konfig.portalUrl}/sso/abmelden?ruecksprung=${encodeURIComponent(konfig.plattformUrl + '/')}`);
  });

  router.get('/api/ich', nurAngemeldet(['schueler', 'lehrkraft', 'superadmin']), (req, res) => {
    const kurse = db
      .prepare(
        'SELECT k.kurs_id AS id, k.name, m.rolle, k.aktiv, k.einstellungen FROM mitgliedschaften m, kurse k ' +
          'WHERE m.kurs_id = k.kurs_id AND m.sub = ? ORDER BY k.kurs_id'
      )
      .all(req.sitzung.sub)
      // scoreboard: ob die Rangliste im Kurs eingeschaltet ist (Link „Rangliste“ in der Lern-Navigation, kopfzeile.js)
      .map((k) => ({ id: k.id, name: k.name, rolle: k.rolle, aktiv: k.aktiv === 1, scoreboard: leseEinstellungen(k.einstellungen).scoreboard }));
    res.set('Cache-Control', 'no-store');
    res.json({ ...req.sitzung, kurse, portalUrl: konfig.portalUrl });
  });

  return router;
}

module.exports = { ssoRouten, fehlerSeite };
