'use strict';
// Sicherheits-Header (Vertrag §9, Spec §7.2/§7.14): strikte CSP ohne Inline-Ausnahmen,
// zusätzlich 'wasm-unsafe-eval' und worker-src 'self' für die SQL-Engine im Browser (sql.js).

const helmet = require('helmet');

const CSP_DIREKTIVEN = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'", "'wasm-unsafe-eval'"],
  workerSrc: ["'self'"],
  connectSrc: ["'self'"],
  imgSrc: ["'self'", 'data:'],
  styleSrc: ["'self'"],
  fontSrc: ["'self'"],
  frameAncestors: ["'none'"],
  baseUri: ["'none'"],
  formAction: ["'self'"],
  objectSrc: ["'none'"]
};

/** Middleware: helmet mit exakter CSP plus X-Robots-Tag: noindex. */
function sicherheitsHeader() {
  const hm = helmet({
    contentSecurityPolicy: { useDefaults: false, directives: CSP_DIREKTIVEN },
    xPoweredBy: false
  });
  return function sicherheit(req, res, next) {
    res.setHeader('X-Robots-Tag', 'noindex');
    hm(req, res, next);
  };
}

const SICHERE_METHODEN = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF-Schutz (Spec §7.14): Nicht-GET-Anfragen außerhalb der Verbund-API müssen von der eigenen Origin kommen
 * (Origin-Kopf, ersatzweise Referer), sonst 403. Anfragen mit Body müssen JSON sein, sonst 415.
 * Die Verbund-API ist ausgenommen (kein Browser beteiligt, eigene Token-Prüfung).
 */
function pruefeHerkunft(konfig) {
  const eigeneOrigin = new URL(konfig.plattformUrl).origin;
  const originVon = (wert) => {
    try {
      return new URL(wert).origin;
    } catch {
      return null;
    }
  };
  return function herkunft(req, res, next) {
    if (SICHERE_METHODEN.has(req.method) || req.path.startsWith('/api/verbund/')) return next();
    const origin = req.get('origin');
    const referer = req.get('referer');
    const quelle = origin !== undefined ? originVon(origin) : referer !== undefined ? originVon(referer) : null;
    if (quelle !== eigeneOrigin) return res.status(403).json({ error: 'Anfrage nicht erlaubt.' });
    const mitBody = Number(req.get('content-length') || 0) > 0 || req.get('transfer-encoding') !== undefined;
    if (mitBody && !req.is('application/json')) return res.status(415).json({ error: 'Nur JSON erlaubt.' });
    next();
  };
}

module.exports = { sicherheitsHeader, pruefeHerkunft, CSP_DIREKTIVEN };
