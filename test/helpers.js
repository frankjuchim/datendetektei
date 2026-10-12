'use strict';
// Gemeinsame Test-Helfer (node:test + supertest). Keine Klarnamen: nur Fantasienamen und example-Adressen.

const crypto = require('node:crypto');
const { erzeugeApp } = require('../src/app');
const { oeffneDb } = require('../src/db');
const { signiere } = require('../src/kern/jwt');

/** Frisches Ed25519-Schlüsselpaar (nur für Tests) als PEM. */
function neuesSchluesselpaar() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  return {
    publicPem: publicKey.export({ type: 'spki', format: 'pem' }),
    privatePem: privateKey.export({ type: 'pkcs8', format: 'pem' })
  };
}

/** Test-Konfiguration (Form wie ladeKonfig); einzelne Felder lassen sich überschreiben. */
function testKonfig(ueberschreiben = {}) {
  return {
    plattformId: 'datendetektei',
    plattformUrl: 'https://datendetektei.example',
    portalUrl: 'https://labs.example',
    portalPublicKey: '',
    authModus: 'portal',
    sessionSecret: 'test-geheimnis-nur-fuer-tests-0123456789',
    dataDir: ':memory:',
    port: 0,
    trustProxy: 0,
    erlaubeHttp: true,
    jetzt: Date.now,
    ...ueberschreiben
  };
}

/** App für supertest: In-Memory-DB, frisches Schlüsselpaar, PORTAL_PUBLIC_KEY = dessen öffentlicher Teil. */
function testApp(ueberschreiben = {}) {
  const schluessel = neuesSchluesselpaar();
  const konfig = testKonfig({ portalPublicKey: schluessel.publicPem, ...ueberschreiben });
  const db = oeffneDb(':memory:');
  const app = erzeugeApp(konfig, db);
  return { app, db, konfig, schluessel };
}

const jetztSek = () => Math.floor(Date.now() / 1000);
const zufallsJti = () => crypto.randomBytes(16).toString('base64url'); // 22 Zeichen

/**
 * SSO-Token wie vom Portal (Vertrag §5): exp − iat = 90 s. Felder lassen sich überschreiben;
 * ein Feld mit Wert undefined wird weggelassen.
 */
function ssoToken(schluessel, konfig, ueberschreiben = {}) {
  const iat = jetztSek();
  const nutzlast = {
    iss: konfig.portalUrl,
    aud: konfig.plattformId,
    sub: 's:1042',
    rolle: 'schueler',
    name: 'Lena K.',
    kurse: [{ id: 'k:17', name: 'Inf-LK 12', rolle: 'mitglied' }],
    iat,
    exp: iat + 90,
    jti: zufallsJti(),
    v: 1,
    ...ueberschreiben
  };
  return signiere(ohneUndefiniert(nutzlast), schluessel.privatePem);
}

/** Verbund-Token wie vom Portal (Vertrag §6): sub „portal“, zweck, exp − iat = 30 s. */
function verbundToken(schluessel, konfig, zweck, ueberschreiben = {}) {
  const iat = jetztSek();
  const nutzlast = {
    iss: konfig.portalUrl,
    aud: konfig.plattformId,
    sub: 'portal',
    zweck,
    iat,
    exp: iat + 30,
    jti: zufallsJti(),
    v: 1,
    ...ueberschreiben
  };
  return signiere(ohneUndefiniert(nutzlast), schluessel.privatePem);
}

function ohneUndefiniert(objekt) {
  return Object.fromEntries(Object.entries(objekt).filter(([, w]) => w !== undefined));
}

module.exports = { testKonfig, testApp, neuesSchluesselpaar, ssoToken, verbundToken };
