'use strict';
// Konfiguration nach Vertrag §8 (gleiche Variablennamen auf allen Plattformen).
// ladeKonfig wirft bei ungültigen Werten einen Error mit deutscher Meldung (Startabbruch).

const crypto = require('node:crypto');

const ID_MUSTER = /^[a-z][a-z0-9-]{1,30}$/;
const PEM_MUSTER = /-----BEGIN PUBLIC KEY-----[\s\S]*?-----END PUBLIC KEY-----/g;

/**
 * Öffentlich bekannte Entwicklungswerte (test/fixtures/dev_portal_public.pem, scripts/dev.js): im Betrieb
 * (NODE_ENV=production) verboten – mit dem öffentlichen Gegenstück könnte jede:r SSO-Tokens bzw. Sitzungen fälschen
 * (Sicherheits-Review Phase 8).
 */
const ENTWICKLUNGS_SCHLUESSEL = 'MCowBQYDK2VwAyEALWvEE6c/Ll/2VCFsYbKMLSDwHRvGUSPVXw335cVsmH8=';
const ENTWICKLUNGS_GEHEIMNIS = 'entwicklung-unsicher-nicht-im-betrieb-verwenden';

function fehler(meldung) {
  return new Error(`Konfiguration ungültig: ${meldung}`);
}

/** Basis-URL prüfen (http/https, ohne Query/Fragment) und abschließende Schrägstriche entfernen. */
function basisUrl(name, wert) {
  const text = String(wert || '').trim();
  if (!text) throw fehler(`${name} fehlt.`);
  let url;
  try {
    url = new URL(text);
  } catch {
    throw fehler(`${name} ist keine gültige URL.`);
  }
  if (!['https:', 'http:'].includes(url.protocol) || url.search || url.hash || url.username || url.password) {
    throw fehler(`${name} muss eine http(s)-Adresse ohne Query und Fragment sein.`);
  }
  return text.replace(/\/+$/, '');
}

/** PORTAL_PUBLIC_KEY: einzeilig mit Literal „\n“ erlaubt, mehrere PEM-Blöcke erlaubt; jeder Block muss Ed25519 sein. */
function portalSchluessel(wert) {
  const text = String(wert || '').replace(/\\n/g, '\n').trim();
  if (!text) throw fehler('PORTAL_PUBLIC_KEY fehlt.');
  const bloecke = text.match(PEM_MUSTER) || [];
  if (bloecke.length === 0) throw fehler('PORTAL_PUBLIC_KEY enthält keinen PEM-Block „PUBLIC KEY“.');
  for (const pem of bloecke) {
    let key;
    try {
      key = crypto.createPublicKey(pem);
    } catch {
      throw fehler('PORTAL_PUBLIC_KEY ist nicht lesbar.');
    }
    if (key.asymmetricKeyType !== 'ed25519') throw fehler('PORTAL_PUBLIC_KEY muss ein Ed25519-Schlüssel sein.');
  }
  return bloecke.join('\n') + '\n';
}

function ganzzahl(name, wert, standard, min, max) {
  if (wert === undefined || wert === '') return standard;
  const text = String(wert).trim();
  if (!/^\d+$/.test(text)) throw fehler(`${name} muss eine ganze Zahl sein.`);
  const zahl = Number(text);
  if (zahl < min || zahl > max) throw fehler(`${name} liegt außerhalb von ${min}…${max}.`);
  return zahl;
}

/**
 * Konfiguration aus der Umgebung.
 * PLATTFORM_URL ist Pflicht (Vertrag §8 erlaubt „sonst aus der Anfrage“; im Modus portal brauchen wir sie aber fest
 * für die Rücksprung-Adresse, die im Portal zeichengenau hinterlegt ist – aus Host-Headern abgeleitet wäre sie fälschbar).
 */
function ladeKonfig(env = process.env) {
  const plattformId = (env.PLATTFORM_ID || 'datendetektei').trim();
  if (!ID_MUSTER.test(plattformId)) throw fehler('PLATTFORM_ID muss dem Muster ^[a-z][a-z0-9-]{1,30}$ entsprechen.');

  const authModus = (env.AUTH_MODUS || 'portal').trim();
  if (authModus !== 'portal') throw fehler('AUTH_MODUS muss „portal“ sein (lokale Anmeldung gibt es hier nicht).');

  const plattformUrl = basisUrl('PLATTFORM_URL', env.PLATTFORM_URL);
  const portalUrl = basisUrl('PORTAL_URL', env.PORTAL_URL);
  const portalPublicKey = portalSchluessel(env.PORTAL_PUBLIC_KEY);

  const sessionSecret = env.SESSION_SECRET || '';
  if (sessionSecret.length < 32) throw fehler('SESSION_SECRET fehlt oder ist kürzer als 32 Zeichen.');

  if (env.NODE_ENV === 'production') {
    if (portalPublicKey.replace(/\s+/g, '').includes(ENTWICKLUNGS_SCHLUESSEL)) {
      throw fehler('PORTAL_PUBLIC_KEY ist der öffentliche Entwicklungsschlüssel aus test/fixtures – im Betrieb nicht erlaubt.');
    }
    if (sessionSecret === ENTWICKLUNGS_GEHEIMNIS) throw fehler('SESSION_SECRET ist der Entwicklungswert aus scripts/dev.js – im Betrieb nicht erlaubt.');
  }

  return {
    plattformId,
    plattformUrl,
    portalUrl,
    portalPublicKey,
    authModus,
    sessionSecret,
    dataDir: env.DATA_DIR || './data',
    port: ganzzahl('PORT', env.PORT, 3000, 1, 65535),
    trustProxy: ganzzahl('TRUST_PROXY', env.TRUST_PROXY, 0, 0, 10),
    erlaubeHttp: env.ERLAUBE_HTTP === '1',
    jetzt: Date.now
  };
}

module.exports = { ladeKonfig };
