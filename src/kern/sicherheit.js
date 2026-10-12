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

/**
 * Rate-Limit im Arbeitsspeicher (festes Fenster je Schlüssel; IPs nur im RAM, Spec §7.14).
 * Über dem Limit: 429 mit Retry-After (Sekunden); /api/* als JSON, sonst als Text.
 */
function rateLimit({ fensterMs, max, schluessel = () => 'alle', jetzt = Date.now }) {
  const zaehler = new Map();
  return function begrenzer(req, res, next) {
    const t = jetzt();
    if (zaehler.size > 10000) for (const [k, z] of zaehler) if (z.ende <= t) zaehler.delete(k);
    const k = String(schluessel(req));
    let z = zaehler.get(k);
    if (!z || z.ende <= t) {
      z = { anzahl: 0, ende: t + fensterMs };
      zaehler.set(k, z);
    }
    z.anzahl += 1;
    if (z.anzahl <= max) return next();
    res.set('Retry-After', String(Math.max(1, Math.ceil((z.ende - t) / 1000))));
    if ((req.baseUrl + req.path).startsWith('/api/')) return res.status(429).json({ error: 'Zu viele Anfragen.' });
    return res.status(429).type('text/plain; charset=utf-8').send('Zu viele Anfragen – bitte kurz warten.');
  };
}

module.exports = { sicherheitsHeader, pruefeHerkunft, rateLimit, CSP_DIREKTIVEN };
