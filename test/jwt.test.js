'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { testApp, ssoToken, verbundToken } = require('./helpers');

const wurzel = path.join(__dirname, '..');
const sha256 = (datei) => crypto.createHash('sha256').update(fs.readFileSync(path.join(wurzel, datei))).digest('hex');

test('jwt.js ist unverändert aus labs', () => {
  const hashes = require('./fixtures/labs_hashes.json');
  assert.match(hashes['src/kern/jwt.js'], /^[0-9a-f]{64}$/);
  assert.equal(sha256('src/kern/jwt.js'), hashes['src/kern/jwt.js']);
});

test('vertrag_pruefen.js ist unverändert aus labs', () => {
  const hashes = require('./fixtures/labs_hashes.json');
  assert.match(hashes['scripts/vertrag_pruefen.js'], /^[0-9a-f]{64}$/);
  assert.equal(sha256('scripts/vertrag_pruefen.js'), hashes['scripts/vertrag_pruefen.js']);
});

test('ssoToken wird von pruefe akzeptiert', () => {
  const { pruefe } = require('../src/kern/jwt');
  const { konfig, schluessel } = testApp();
  const token = ssoToken(schluessel, konfig);
  const r = pruefe(token, konfig.portalPublicKey, { iss: konfig.portalUrl, aud: konfig.plattformId, maxDauerSek: 120 });
  assert.equal(r.ok, true, r.grund);
  const n = r.nutzlast;
  assert.equal(n.iss, 'https://labs.example');
  assert.equal(n.aud, 'datendetektei');
  assert.equal(n.sub, 's:1042');
  assert.equal(n.rolle, 'schueler');
  assert.equal(n.name, 'Lena K.');
  assert.deepEqual(n.kurse, [{ id: 'k:17', name: 'Inf-LK 12', rolle: 'mitglied' }]);
  assert.equal(n.exp - n.iat, 90);
  assert.match(n.jti, /^[A-Za-z0-9_-]{22}$/);
  assert.equal(n.v, 1);
  assert.deepEqual(Object.keys(n).sort(), ['aud', 'exp', 'iat', 'iss', 'jti', 'kurse', 'name', 'rolle', 'sub', 'v']);
  // Überschreiben einzelner Felder; jti ist je Token neu.
  const t2 = ssoToken(schluessel, konfig, { rolle: 'lehrkraft', sub: 'l:7' });
  const n2 = pruefe(t2, konfig.portalPublicKey, { iss: konfig.portalUrl, aud: konfig.plattformId }).nutzlast;
  assert.equal(n2.sub, 'l:7');
  assert.notEqual(n2.jti, n.jti);
});

test('verbundToken wird mit maxDauerSek 60 akzeptiert', () => {
  const { pruefe } = require('../src/kern/jwt');
  const { konfig, schluessel } = testApp();
  const token = verbundToken(schluessel, konfig, 'loeschen');
  const r = pruefe(token, konfig.portalPublicKey, { iss: konfig.portalUrl, aud: konfig.plattformId, maxDauerSek: 60 });
  assert.equal(r.ok, true, r.grund);
  assert.equal(r.nutzlast.sub, 'portal');
  assert.equal(r.nutzlast.zweck, 'loeschen');
  assert.equal(r.nutzlast.exp - r.nutzlast.iat, 30);
});

test('Token eines fremden Schlüssels wird abgelehnt', () => {
  const { pruefe } = require('../src/kern/jwt');
  const a = testApp();
  const b = testApp();
  const token = ssoToken(b.schluessel, a.konfig);
  const r = pruefe(token, a.konfig.portalPublicKey, { iss: a.konfig.portalUrl, aud: a.konfig.plattformId });
  assert.equal(r.ok, false);
  assert.equal(r.grund, 'signatur');
});
