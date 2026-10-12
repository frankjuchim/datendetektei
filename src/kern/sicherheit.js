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

module.exports = { sicherheitsHeader, CSP_DIREKTIVEN };
