'use strict';
// Gemeinsame Test-Helfer (node:test + supertest). Keine Klarnamen: nur Fantasienamen und example-Adressen.

const crypto = require('node:crypto');
const { erzeugeApp } = require('../src/app');

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

/** App für supertest: frisches Schlüsselpaar, PORTAL_PUBLIC_KEY = dessen öffentlicher Teil. */
function testApp(ueberschreiben = {}) {
  const schluessel = neuesSchluesselpaar();
  const konfig = testKonfig({ portalPublicKey: schluessel.publicPem, ...ueberschreiben });
  const db = null;
  const app = erzeugeApp(konfig, db);
  return { app, db, konfig, schluessel };
}

module.exports = { testKonfig, testApp, neuesSchluesselpaar };
