'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKonfig } = require('../src/kern/konfig');

const PEM = fs.readFileSync(path.join(__dirname, 'fixtures', 'dev_portal_public.pem'), 'utf8');

function umgebung(extra = {}) {
  return {
    PLATTFORM_ID: 'datendetektei',
    PLATTFORM_URL: 'https://datendetektei.example',
    PORTAL_URL: 'https://labs.example',
    PORTAL_PUBLIC_KEY: PEM,
    AUTH_MODUS: 'portal',
    SESSION_SECRET: 'x'.repeat(32),
    DATA_DIR: '/app/data',
    PORT: '8080',
    TRUST_PROXY: '1',
    ...extra
  };
}

test('gültige Umgebung wird übernommen', () => {
  const k = ladeKonfig(umgebung());
  assert.equal(k.plattformId, 'datendetektei');
  assert.equal(k.plattformUrl, 'https://datendetektei.example');
  assert.equal(k.portalUrl, 'https://labs.example');
  assert.equal(k.portalPublicKey.trim(), PEM.trim());
  assert.equal(k.authModus, 'portal');
  assert.equal(k.sessionSecret, 'x'.repeat(32));
  assert.equal(k.dataDir, '/app/data');
  assert.equal(k.port, 8080);
  assert.equal(k.trustProxy, 1);
  assert.equal(k.erlaubeHttp, false);
  assert.equal(typeof k.jetzt, 'function');
  assert.ok(Math.abs(k.jetzt() - Date.now()) < 1000);
});

test('Standardwerte für PLATTFORM_ID, DATA_DIR, PORT, TRUST_PROXY, AUTH_MODUS', () => {
  const env = umgebung();
  for (const n of ['PLATTFORM_ID', 'DATA_DIR', 'PORT', 'TRUST_PROXY', 'AUTH_MODUS']) delete env[n];
  const k = ladeKonfig(env);
  assert.equal(k.plattformId, 'datendetektei');
  assert.equal(k.dataDir, './data');
  assert.equal(k.port, 3000);
  assert.equal(k.trustProxy, 0);
  assert.equal(k.authModus, 'portal');
});

test('PLATTFORM_ID mit Großbuchstaben wird abgelehnt', () => {
  assert.throws(() => ladeKonfig(umgebung({ PLATTFORM_ID: 'Datendetektei' })), /PLATTFORM_ID/);
});

test('AUTH_MODUS lokal wird abgelehnt', () => {
  assert.throws(() => ladeKonfig(umgebung({ AUTH_MODUS: 'lokal' })), /AUTH_MODUS/);
  assert.throws(() => ladeKonfig(umgebung({ AUTH_MODUS: 'beides' })), /AUTH_MODUS/);
});

test('fehlender PORTAL_PUBLIC_KEY wird abgelehnt', () => {
  const env = umgebung();
  delete env.PORTAL_PUBLIC_KEY;
  assert.throws(() => ladeKonfig(env), /PORTAL_PUBLIC_KEY/);
  assert.throws(() => ladeKonfig(umgebung({ PORTAL_PUBLIC_KEY: 'kein Schlüssel' })), /PORTAL_PUBLIC_KEY/);
});

test('PORTAL_PUBLIC_KEY einzeilig mit \\n wird zu PEM', () => {
  const einzeilig = PEM.trim().replace(/\n/g, '\\n');
  assert.ok(!einzeilig.includes('\n'));
  const k = ladeKonfig(umgebung({ PORTAL_PUBLIC_KEY: einzeilig }));
  assert.equal(k.portalPublicKey.trim(), PEM.trim());
  // Mehrere PEM-Blöcke bleiben erhalten (Schlüsselwechsel, Vertrag §5).
  const zwei = einzeilig + '\\n' + einzeilig;
  const k2 = ladeKonfig(umgebung({ PORTAL_PUBLIC_KEY: zwei }));
  assert.equal((k2.portalPublicKey.match(/-----BEGIN PUBLIC KEY-----/g) || []).length, 2);
});

test('SESSION_SECRET kürzer als 32 Zeichen wird abgelehnt', () => {
  assert.throws(() => ladeKonfig(umgebung({ SESSION_SECRET: 'x'.repeat(31) })), /SESSION_SECRET/);
  const env = umgebung();
  delete env.SESSION_SECRET;
  assert.throws(() => ladeKonfig(env), /SESSION_SECRET/);
});

test('abschließender Schrägstrich in PORTAL_URL wird entfernt', () => {
  const k = ladeKonfig(umgebung({ PORTAL_URL: 'https://labs.example/', PLATTFORM_URL: 'https://datendetektei.example//' }));
  assert.equal(k.portalUrl, 'https://labs.example');
  assert.equal(k.plattformUrl, 'https://datendetektei.example');
});

test('fehlende PORTAL_URL oder PLATTFORM_URL wird abgelehnt', () => {
  const ohnePortal = umgebung();
  delete ohnePortal.PORTAL_URL;
  assert.throws(() => ladeKonfig(ohnePortal), /PORTAL_URL/);
  const ohnePlattform = umgebung();
  delete ohnePlattform.PLATTFORM_URL;
  assert.throws(() => ladeKonfig(ohnePlattform), /PLATTFORM_URL/);
  assert.throws(() => ladeKonfig(umgebung({ PORTAL_URL: 'labs.example' })), /PORTAL_URL/);
});

test('ERLAUBE_HTTP=1 und ungültiger PORT', () => {
  assert.equal(ladeKonfig(umgebung({ ERLAUBE_HTTP: '1' })).erlaubeHttp, true);
  assert.throws(() => ladeKonfig(umgebung({ PORT: 'achtzig' })), /PORT/);
});

test('Sicherheits-Review Phase 8: Entwicklungsschlüssel und -geheimnis werden im Betrieb (NODE_ENV=production) abgelehnt', () => {
  // test/fixtures/dev_portal_*.pem ist öffentlich: mit diesem öffentlichen Schlüssel könnte jede:r Tokens fälschen.
  assert.throws(() => ladeKonfig(umgebung({ NODE_ENV: 'production' })), /Entwicklungsschlüssel/);
  const einzeilig = PEM.trim().replace(/\n/g, '\\n');
  assert.throws(() => ladeKonfig(umgebung({ NODE_ENV: 'production', PORTAL_PUBLIC_KEY: einzeilig })), /Entwicklungsschlüssel/);
  const crypto = require('node:crypto');
  const anderer = crypto.generateKeyPairSync('ed25519').publicKey.export({ type: 'spki', format: 'pem' });
  assert.doesNotThrow(() => ladeKonfig(umgebung({ NODE_ENV: 'production', PORTAL_PUBLIC_KEY: anderer })));
  assert.throws(
    () => ladeKonfig(umgebung({ NODE_ENV: 'production', PORTAL_PUBLIC_KEY: anderer, SESSION_SECRET: 'entwicklung-unsicher-nicht-im-betrieb-verwenden' })),
    /SESSION_SECRET/
  );
  // in der Entwicklung bleibt alles erlaubt
  assert.doesNotThrow(() => ladeKonfig(umgebung()));
});

test('F3 (Phase 8): SANDBOX_PROZESSE wird übernommen, Grenzen 1…16, ungültige Werte brechen den Start ab', () => {
  assert.equal(ladeKonfig(umgebung({ SANDBOX_PROZESSE: '1' })).sandboxProzesse, 1);
  assert.equal(ladeKonfig(umgebung({ SANDBOX_PROZESSE: '6' })).sandboxProzesse, 6);
  assert.equal(ladeKonfig(umgebung({ SANDBOX_PROZESSE: ' 16 ' })).sandboxProzesse, 16);
  for (const falsch of ['0', '17', '-2', '2.5', 'zwei', '3x']) {
    assert.throws(() => ladeKonfig(umgebung({ SANDBOX_PROZESSE: falsch })), /SANDBOX_PROZESSE/, falsch);
  }
});

test('F3 (Phase 8): Standard der Sandbox-Prozesse = min(4, max(2, Kerne − 1))', () => {
  const { standardSandboxProzesse } = require('../src/kern/konfig');
  assert.deepEqual([1, 2, 3, 4, 5, 8, 64].map(standardSandboxProzesse), [2, 2, 2, 3, 4, 4, 4]);
  const os = require('node:os');
  const k = ladeKonfig(umgebung());
  assert.equal(k.sandboxProzesse, standardSandboxProzesse(os.availableParallelism()));
  assert.equal(ladeKonfig(umgebung({ SANDBOX_PROZESSE: '' })).sandboxProzesse, k.sandboxProzesse);
});
