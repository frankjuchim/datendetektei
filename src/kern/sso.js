'use strict';
// Single Sign-on nach Vertrag §5 / INTEGRATION §3 (Plattform-Seite). Reine Prüf- und Hilfsfunktionen;
// die Routen stehen in src/routes/sso.js. Nie Tokens oder Prüfgründe an den Browser oder ins Log geben.

const crypto = require('node:crypto');
const { pruefe } = require('./jwt');
const { leseCookie, setzeCookie, loescheCookie } = require('./sitzung');

const STATE_COOKIE = 'dd_sso_state';
const STATE_DAUER_SEK = 600;
const SSO_MAX_DAUER_SEK = 120;
const ZIEL_MAX_LAENGE = 2000;

const SUB_MUSTER = /^[asl]:\d+$/;
const KURS_MUSTER = /^k:\d+$/;
const PRAEFIX_ZU_ROLLE = { s: 'schueler', l: 'lehrkraft', a: 'superadmin' };
const STEUERZEICHEN = /[\u0000-\u001f\u007f]/;

/** state: 16 Byte Zufall, base64url (22 Zeichen). */
function neuerState() {
  return crypto.randomBytes(16).toString('base64url');
}

/** Ein Pfad ist sicher, wenn er mit genau einem „/“ beginnt, kein „\“ und keine Steuerzeichen enthält. */
function sichererPfad(p) {
  return p.startsWith('/') && !p.startsWith('//') && !p.includes('\\') && !STEUERZEICHEN.test(p);
}

/**
 * ziel prüfen: nur relative Pfade (genau ein führendes „/“, kein „\“, keine Steuerzeichen), auch in
 * (mehrfach) URL-dekodierter Form; sonst „/“. So führt auch „/%2F%2Fboese“ nie nach extern.
 */
function pruefeZiel(ziel) {
  if (typeof ziel !== 'string' || ziel.length === 0 || ziel.length > ZIEL_MAX_LAENGE) return '/';
  let form = ziel;
  for (let i = 0; i < 5; i++) {
    if (!sichererPfad(form)) return '/';
    let dekodiert;
    try {
      dekodiert = decodeURIComponent(form);
    } catch {
      return '/';
    }
    if (dekodiert === form) return ziel;
    form = dekodiert;
  }
  return '/'; // zu oft kodiert
}

/** URL zum Portal (Reihenfolge plattform, ruecksprung, state, ziel; Kodierung nach URLSearchParams). */
function autorisierenUrl(konfig, state, ziel) {
  const q = new URLSearchParams({
    plattform: konfig.plattformId,
    ruecksprung: konfig.plattformUrl + '/sso/ende',
    state,
    ziel
  });
  return `${konfig.portalUrl}/sso/autorisieren?${q.toString()}`;
}

/** Inhalt eines (signaturgeprüften) SSO-Tokens prüfen. Liefert einen internen Fehlergrund oder null. */
function pruefeSsoNutzlast(n) {
  if (!n || typeof n !== 'object') return 'inhalt';
  if (typeof n.sub !== 'string' || !SUB_MUSTER.test(n.sub)) return 'sub';
  if (!Object.values(PRAEFIX_ZU_ROLLE).includes(n.rolle)) return 'rolle';
  if (PRAEFIX_ZU_ROLLE[n.sub[0]] !== n.rolle) return 'sub-rolle';
  if (typeof n.name !== 'string' || n.name.trim().length < 1 || n.name.length > 60) return 'name';
  if (!Array.isArray(n.kurse) || n.kurse.length > 1000) return 'kurse';
  const kursRolle = n.rolle === 'schueler' ? 'mitglied' : 'lehrkraft';
  for (const k of n.kurse) {
    if (!k || typeof k !== 'object') return 'kurs';
    if (typeof k.id !== 'string' || !KURS_MUSTER.test(k.id)) return 'kurs-id';
    if (typeof k.name !== 'string' || k.name.length > 200) return 'kurs-name';
    if (k.rolle !== kursRolle) return 'kurs-rolle';
  }
  return null;
}

/** state-Cookie für /sso/start setzen. */
function setzeState(res, konfig, state) {
  setzeCookie(res, konfig, STATE_COOKIE, state, STATE_DAUER_SEK);
}

/**
 * /sso/ende auswerten (Reihenfolge INTEGRATION §3.2): state (Cookie wird immer gelöscht), fehler, Token (pruefe mit
 * iss/aud/maxDauerSek 120 und der Uhr aus konfig.jetzt), jti einmalig, Inhalt.
 * Liefert { ok: true, nutzlast } oder { ok: false, code, grund } – code ist ein fester Seitencode
 * (ungueltig | keine_berechtigung | abgebrochen), grund nur für interne Zwecke.
 */
function werteSsoEndeAus(req, res, konfig, jtiSpeicher) {
  const cookieState = leseCookie(req, konfig, STATE_COOKIE);
  loescheCookie(res, konfig, STATE_COOKIE);
  const q = req.query || {};
  if (!cookieState || typeof q.state !== 'string' || q.state !== cookieState) return { ok: false, code: 'ungueltig', grund: 'state' };
  if (q.fehler !== undefined) {
    if (q.fehler === 'keine_berechtigung' || q.fehler === 'abgebrochen') return { ok: false, code: q.fehler, grund: 'portal' };
    return { ok: false, code: 'ungueltig', grund: 'portal' };
  }
  const jetztSek = Math.floor(konfig.jetzt() / 1000);
  const p = pruefe(q.token, konfig.portalPublicKey, {
    iss: konfig.portalUrl,
    aud: konfig.plattformId,
    maxDauerSek: SSO_MAX_DAUER_SEK,
    jetztSek
  });
  if (!p.ok) return { ok: false, code: 'ungueltig', grund: p.grund };
  // jti zuerst verbrauchen – auch ein Token mit fehlerhaftem Inhalt ist danach verbraucht.
  if (!jtiSpeicher.merke(p.nutzlast.jti, p.nutzlast.exp, jetztSek)) return { ok: false, code: 'ungueltig', grund: 'wiederverwendet' };
  const grund = pruefeSsoNutzlast(p.nutzlast);
  if (grund) return { ok: false, code: 'ungueltig', grund };
  return { ok: true, nutzlast: p.nutzlast };
}

module.exports = {
  STATE_COOKIE,
  STATE_DAUER_SEK,
  SSO_MAX_DAUER_SEK,
  neuerState,
  pruefeZiel,
  autorisierenUrl,
  pruefeSsoNutzlast,
  setzeState,
  werteSsoEndeAus
};
