'use strict';
// Signierte Cookies und Sitzungen (Spec §7.13, Plan Global Constraints).
// Cookie-Wert: <wert>.<hmac>, HMAC-SHA256 mit SESSION_SECRET über „<name>=<wert>“ (Name gebunden, damit ein
// signierter Wert nicht unter einem anderen Cookie-Namen verwendet werden kann).
// Sitzungswert: base64url-JSON { sub, rolle, bis } (bis in ms). Uhr: konfig.jetzt.

const crypto = require('node:crypto');
const path = require('node:path');

const SITZUNG_COOKIE = 'dd_s';
const SITZUNG_DAUER_SEK = { schueler: 30 * 24 * 3600, lehrkraft: 8 * 3600, superadmin: 8 * 3600 };
const SEITE_403 = path.join(__dirname, '..', '..', 'public', '403.html');

function mac(konfig, name, wert) {
  return crypto.createHmac('sha256', konfig.sessionSecret).update(`${name}=${wert}`).digest('base64url');
}

function attribute(konfig, maxAgeSek) {
  const teile = ['Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${maxAgeSek}`];
  if (!konfig.erlaubeHttp) teile.push('Secure');
  return teile.join('; ');
}

/** Signiertes Cookie setzen. wert darf weder „;“ noch Leerzeichen enthalten (base64url bzw. Token-Zeichen). */
function setzeCookie(res, konfig, name, wert, maxAgeSek) {
  res.append('Set-Cookie', `${name}=${wert}.${mac(konfig, name, wert)}; ${attribute(konfig, maxAgeSek)}`);
}

function loescheCookie(res, konfig, name) {
  res.append('Set-Cookie', `${name}=; ${attribute(konfig, 0)}`);
}

/** Wert eines signierten Cookies oder null (fehlt, Signatur falsch). Vergleich mit timingSafeEqual. */
function leseCookie(req, konfig, name) {
  const kopf = req.headers.cookie;
  if (typeof kopf !== 'string') return null;
  const eintrag = kopf
    .split(';')
    .map((s) => s.trim())
    .find((s) => s.startsWith(name + '='));
  if (!eintrag) return null;
  const roh = eintrag.slice(name.length + 1);
  const i = roh.lastIndexOf('.');
  if (i < 1) return null;
  const wert = roh.slice(0, i);
  const a = Buffer.from(roh.slice(i + 1));
  const b = Buffer.from(mac(konfig, name, wert));
  return a.length === b.length && crypto.timingSafeEqual(a, b) ? wert : null;
}

/** Sitzung setzen (Dauer nach Rolle: Schüler 30 Tage, Lehrkraft/Superadmin 8 Stunden). */
function setzeSitzung(res, konfig, { sub, rolle }) {
  const dauerSek = SITZUNG_DAUER_SEK[rolle];
  if (!dauerSek) throw new Error('Unbekannte Rolle für die Sitzung.');
  const bis = konfig.jetzt() + dauerSek * 1000;
  const wert = Buffer.from(JSON.stringify({ sub, rolle, bis })).toString('base64url');
  setzeCookie(res, konfig, SITZUNG_COOKIE, wert, dauerSek);
}

/** Sitzung lesen: Signatur, Ablauf und Konto (muss noch existieren, gleiche Rolle) – sonst null. */
function leseSitzung(req, konfig, db) {
  const wert = leseCookie(req, konfig, SITZUNG_COOKIE);
  if (!wert) return null;
  let s;
  try {
    s = JSON.parse(Buffer.from(wert, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (!s || typeof s.sub !== 'string' || typeof s.rolle !== 'string' || !Number.isFinite(s.bis)) return null;
  if (s.bis <= konfig.jetzt()) return null;
  const konto = db.prepare('SELECT sub, rolle, name FROM konten WHERE sub = ?').get(s.sub);
  if (!konto || konto.rolle !== s.rolle) return null;
  return { sub: konto.sub, rolle: konto.rolle, name: konto.name };
}

function beendeSitzung(res, konfig) {
  loescheCookie(res, konfig, SITZUNG_COOKIE);
}

/**
 * Middleware: nur mit Sitzung in einer der Rollen. Ohne Sitzung: HTML → 302 /sso/start?ziel=…, /api/* → 401 JSON.
 * Falsche Rolle: HTML → 403-Seite, /api/* → 403 JSON. Hängt req.sitzung an.
 */
function nurAngemeldet(rollen) {
  return function angemeldet(req, res, next) {
    const { konfig, db } = req.app.locals;
    const api = req.path.startsWith('/api/');
    const sitzung = leseSitzung(req, konfig, db);
    if (!sitzung) {
      if (api) return res.status(401).json({ error: 'Nicht angemeldet.' });
      return res.redirect(302, '/sso/start?ziel=' + encodeURIComponent(req.originalUrl));
    }
    if (!rollen.includes(sitzung.rolle)) {
      if (api) return res.status(403).json({ error: 'Keine Berechtigung.' });
      return res.status(403).sendFile(SEITE_403);
    }
    req.sitzung = sitzung;
    next();
  };
}

module.exports = {
  SITZUNG_COOKIE,
  SITZUNG_DAUER_SEK,
  setzeCookie,
  leseCookie,
  loescheCookie,
  setzeSitzung,
  leseSitzung,
  beendeSitzung,
  nurAngemeldet
};
