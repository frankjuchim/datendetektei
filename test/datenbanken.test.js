'use strict';
// Übungs-Datenbanken zur Laufzeit (Plan Phase 2 Task 5, Spec §7.2): src/sql/datenbanken.js lädt beim Start jede
// basis.sql (Prüfsumme im Kopf) und baut die Varianten; src/routes/sql.js liefert nur die Haupt-DB der sieben
// Akten-DBs öffentlich aus (/db/<name>.sqlite) und deren Schema (/api/db/<name>/schema).
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Database = require('better-sqlite3');
const request = require('supertest');

const { ladeDatenbanken, OEFFENTLICHE_DATENBANKEN, AKTEN_DATENBANKEN, VERHOER_DATENBANKEN } = require('../src/sql/datenbanken');
const { erzeugeApp } = require('../src/app');
const { oeffneDb } = require('../src/db');
const { testKonfig, testApp } = require('./helpers');
const { ladeSchema } = require('./hilfen_schema');

const SEED = path.join(__dirname, '..', 'seed', 'datenbanken');
const SIEBEN = ['fundbuero', 'stadtrad', 'stadtfest', 'tus', 'detektei', 'datenspuren', 'eisdiele'];

const protokoll = [];
const datenbanken = ladeDatenbanken(SEED, { log: (t) => protokoll.push(t) });

function app(dbs = datenbanken) {
  return erzeugeApp(testKonfig(), oeffneDb(':memory:'), { datenbanken: dbs });
}

/** Alle Tabelleninhalte einer DB (Tabellen nach Namen, Zeilen nach allen Spalten sortiert). */
function inhalt(db) {
  const tabellen = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").pluck().all();
  return tabellen.map((t) => ({ t, zeilen: db.prepare(`SELECT * FROM "${t}" ORDER BY 1, 2`).all() }));
}

/** Kopie einzelner DB-Ordner in ein Temp-Verzeichnis (für Fehlerfälle). */
function tempSeed(namen) {
  const ziel = fs.mkdtempSync(path.join(os.tmpdir(), 'dbs-'));
  for (const n of namen) fs.cpSync(path.join(SEED, n), path.join(ziel, n), { recursive: true });
  return ziel;
}

// ---------------------------------------------------------------- ladeDatenbanken

test('ladeDatenbanken: Akten- und Verhör-DBs geladen, öffentliche Liste fest (nur die sieben Akten-DBs)', () => {
  assert.deepEqual(datenbanken.namen, [...SIEBEN, ...VERHOER_DATENBANKEN]);
  assert.deepEqual(AKTEN_DATENBANKEN, SIEBEN);
  assert.deepEqual([...OEFFENTLICHE_DATENBANKEN].sort(), [...SIEBEN].sort());
  assert.ok(Object.isFrozen(OEFFENTLICHE_DATENBANKEN));
  assert.ok(Object.isFrozen(datenbanken.namen));
});

test('ladeDatenbanken: Haupt-DB als Buffer mit identischem Inhalt wie basis.sql', () => {
  for (const name of SIEBEN) {
    const buffer = datenbanken.haupt(name);
    assert.ok(Buffer.isBuffer(buffer), name);
    const geladen = new Database(buffer, { readonly: true });
    const ausText = new Database(':memory:');
    ausText.exec(fs.readFileSync(path.join(SEED, name, 'basis.sql'), 'utf8'));
    assert.deepEqual(inhalt(geladen), inhalt(ausText), name);
    geladen.close();
    ausText.close();
  }
});

test('ladeDatenbanken: Varianten je DB als Buffer (Eisdiele ohne)', () => {
  assert.deepEqual(Object.keys(datenbanken.varianten('stadtrad')), ['null', 'gleichnamig', 'grenze', 'gleichstand', 'leer']);
  assert.deepEqual(Object.keys(datenbanken.varianten('fundbuero')), ['null', 'gleichnamig', 'grenze', 'gleichstand']);
  assert.deepEqual(datenbanken.varianten('eisdiele'), {});
  const v = new Database(datenbanken.varianten('stadtrad').null, { readonly: true });
  assert.equal(v.prepare('SELECT ZielStation FROM Ausleihe WHERE AusleihID = 9001').pluck().get(), null);
  v.close();
  const h = new Database(datenbanken.haupt('stadtrad'), { readonly: true });
  assert.equal(h.prepare('SELECT COUNT(*) FROM Ausleihe WHERE AusleihID = 9001').pluck().get(), 0);
  h.close();
});

test('ladeDatenbanken: Schema mit PK, FK und Zeilenzahl (kompatibel zu hilfen_schema/regeln)', () => {
  for (const name of SIEBEN) {
    const schema = datenbanken.schema(name);
    assert.deepEqual(schema.map(({ tabelle, spalten }) => ({ tabelle, spalten })), ladeSchema(name), name);
    const db = new Database(datenbanken.haupt(name), { readonly: true });
    for (const t of schema) {
      assert.equal(t.zeilen, db.prepare(`SELECT COUNT(*) FROM "${t.tabelle}"`).pluck().get(), `${name}.${t.tabelle}`);
    }
    db.close();
  }
  const ausleihe = datenbanken.schema('stadtrad').find((t) => t.tabelle === 'Ausleihe');
  const start = ausleihe.spalten.find((s) => s.name === 'StartStation');
  assert.deepEqual(start.fk, { tabelle: 'Station', spalte: 'StationID' });
  assert.equal(ausleihe.spalten.find((s) => s.name === 'AusleihID').pk, true);
  assert.equal(start.pk, false);
});

test('ladeDatenbanken: unbekannter Name ist ein Fehler', () => {
  assert.throws(() => datenbanken.haupt('gibtsnicht'), /gibtsnicht/);
  assert.throws(() => datenbanken.varianten('gibtsnicht'), /gibtsnicht/);
  assert.throws(() => datenbanken.schema('gibtsnicht'), /gibtsnicht/);
  assert.throws(() => datenbanken.haupt('__proto__'), /__proto__/);
});

test('ladeDatenbanken: Startzeit wird protokolliert', () => {
  assert.equal(protokoll.length, 1);
  assert.match(protokoll[0], new RegExp(`${SIEBEN.length + VERHOER_DATENBANKEN.length} Datenbanken`));
  assert.match(protokoll[0], /\d+ ms/);
});

test('ladeDatenbanken: Abbruch, wenn eine basis.sql fehlt', () => {
  const quellen = tempSeed(['fundbuero']);
  fs.rmSync(path.join(quellen, 'fundbuero', 'basis.sql'));
  assert.throws(() => ladeDatenbanken(quellen, { namen: ['fundbuero'], log: () => {} }), /fundbuero.*basis\.sql/);
});

test('ladeDatenbanken: Abbruch, wenn die Prüfsumme im Kopf nicht zum Datenteil passt', () => {
  const quellen = tempSeed(['fundbuero']);
  const datei = path.join(quellen, 'fundbuero', 'basis.sql');
  const text = fs.readFileSync(datei, 'utf8');
  fs.writeFileSync(datei, text.replace("'Messing-Kompass'", "'Messing-Kompaß'"));
  assert.notEqual(fs.readFileSync(datei, 'utf8'), text);
  assert.throws(() => ladeDatenbanken(quellen, { namen: ['fundbuero'], log: () => {} }), /fundbuero.*Prüfsumme/);
  // ohne Prüfsummen-Kopf ebenso
  fs.writeFileSync(datei, text.replace(/^-- SHA-256.*$/m, '-- (entfernt)'));
  assert.throws(() => ladeDatenbanken(quellen, { namen: ['fundbuero'], log: () => {} }), /fundbuero.*Prüfsumme/);
});

test('ladeDatenbanken: Abbruch, wenn eine Variante nicht baut', () => {
  const quellen = tempSeed(['fundbuero']);
  fs.writeFileSync(path.join(quellen, 'fundbuero', 'varianten', 'grenze.sql'), 'INSERT INTO Gibtsnicht VALUES (1);\n');
  assert.throws(() => ladeDatenbanken(quellen, { namen: ['fundbuero'], log: () => {} }), /fundbuero\/grenze/);
});

// ---------------------------------------------------------------- GET /db/:name.sqlite

test('GET /db/stadtrad.sqlite: 200, application/vnd.sqlite3, Cache-Control, ETag, lesbar wie basis.sql', async () => {
  const res = await request(app()).get('/db/stadtrad.sqlite').buffer(true)
    .parse((r, fertig) => { const teile = []; r.on('data', (d) => teile.push(d)); r.on('end', () => fertig(null, Buffer.concat(teile))); });
  assert.equal(res.status, 200);
  assert.match(res.headers['content-type'], /^application\/vnd\.sqlite3/);
  assert.equal(res.headers['cache-control'], 'public, max-age=3600');
  const sha = crypto.createHash('sha256').update(datenbanken.haupt('stadtrad')).digest('hex');
  assert.equal(res.headers.etag, `"${sha}"`);
  assert.ok(res.body.equals(datenbanken.haupt('stadtrad')));
  const db = new Database(res.body, { readonly: true });
  const ausText = new Database(':memory:');
  ausText.exec(fs.readFileSync(path.join(SEED, 'stadtrad', 'basis.sql'), 'utf8'));
  assert.deepEqual(inhalt(db), inhalt(ausText));
  db.close();
  ausText.close();
});

test('GET /db/<name>.sqlite: alle sieben Akten-DBs, If-None-Match → 304', async () => {
  const a = app();
  for (const name of SIEBEN) {
    const res = await request(a).get(`/db/${name}.sqlite`);
    assert.equal(res.status, 200, name);
    const nochmal = await request(a).get(`/db/${name}.sqlite`).set('If-None-Match', res.headers.etag);
    assert.equal(nochmal.status, 304, name);
  }
});

test('GET /db/…: Varianten, Pfadtricks und unbekannte Namen → 404', async () => {
  const a = app();
  for (const pfad of [
    '/db/..%2Fplattform.sqlite', '/db/../plattform.sqlite', '/db/%2e%2e%2Fdata%2Fplattform.sqlite',
    '/db/stadtrad-null.sqlite', '/db/stadtrad.null.sqlite', '/db/stadtrad%2Fnull.sqlite', '/db/stadtrad/null.sqlite',
    '/db/null.sqlite', '/db/gibtsnicht.sqlite', '/db/STADTRAD.sqlite', '/db/stadtrad', '/db/stadtrad.sql',
    '/db/stadtrad.sqlite/', '/db/__proto__.sqlite', '/db/constructor.sqlite', '/db/plattform.sqlite'
  ]) {
    const res = await request(a).get(pfad);
    assert.equal(res.status, 404, pfad);
    assert.doesNotMatch(res.headers['content-type'] || '', /sqlite/, pfad);
  }
});

test('nur die festgelegten öffentlichen DBs: eine weitere geladene DB (z. B. Verhör) bleibt unerreichbar', async () => {
  const quellen = tempSeed(['eisdiele']);
  fs.cpSync(path.join(quellen, 'eisdiele'), path.join(quellen, 'verhoer'), { recursive: true });
  const dbs = ladeDatenbanken(quellen, { namen: ['eisdiele', 'verhoer'], log: () => {} });
  assert.deepEqual(dbs.namen, ['eisdiele', 'verhoer']);
  assert.ok(Buffer.isBuffer(dbs.haupt('verhoer')));
  const a = app(dbs);
  assert.equal((await request(a).get('/db/eisdiele.sqlite')).status, 200);
  assert.equal((await request(a).get('/db/verhoer.sqlite')).status, 404);
  assert.equal((await request(a).get('/api/db/verhoer/schema')).status, 404);
  // öffentlich, aber nicht geladen
  assert.equal((await request(a).get('/db/stadtrad.sqlite')).status, 404);
});

test('ohne Datenbanken (bestehende Aufrufe erzeugeApp(konfig, db)) gibt es /db/ nicht', async () => {
  const { app: ohne } = testApp();
  assert.equal((await request(ohne).get('/db/stadtrad.sqlite')).status, 404);
  assert.equal((await request(ohne).get('/api/db/stadtrad/schema')).status, 404);
});

// ---------------------------------------------------------------- GET /api/db/:name/schema

test('GET /api/db/stadtrad/schema: öffentlich, JSON, PK/FK/Zeilen', async () => {
  const res = await request(app()).get('/api/db/stadtrad/schema');
  assert.equal(res.status, 200);
  assert.match(res.headers['content-type'], /^application\/json/);
  assert.equal(res.headers['cache-control'], 'public, max-age=3600');
  assert.deepEqual(res.body, datenbanken.schema('stadtrad'));
  const ausleihe = res.body.find((t) => t.tabelle === 'Ausleihe');
  assert.deepEqual(ausleihe.spalten.find((s) => s.name === 'StartStation').fk, { tabelle: 'Station', spalte: 'StationID' });
  assert.ok(ausleihe.zeilen > 0);
});

test('GET /api/db/<name>/schema: unbekannt, Variante, Pfadtricks → 404 JSON', async () => {
  const a = app();
  for (const pfad of ['/api/db/gibtsnicht/schema', '/api/db/stadtrad-null/schema', '/api/db/..%2Fstadtrad/schema',
    '/api/db/__proto__/schema', '/api/db/stadtrad/null/schema']) {
    const res = await request(a).get(pfad);
    assert.equal(res.status, 404, pfad);
    assert.deepEqual(res.body, { error: 'Nicht gefunden.' }, pfad);
  }
});

test('Verhör-Kontexte Musikschule und Kletterhalle: geladen, aber nie öffentlich unter /db/ oder /api/db/', async () => {
  const a = app();
  for (const kontext of ['musikschule', 'kletterhalle']) {
    const name = `verhoer/${kontext}`;
    assert.ok(VERHOER_DATENBANKEN.includes(name), name);
    assert.ok(!OEFFENTLICHE_DATENBANKEN.includes(name), name);
    assert.ok(Buffer.isBuffer(datenbanken.haupt(name)), name);
    for (const pfad of [`/db/${kontext}.sqlite`, `/db/verhoer/${kontext}.sqlite`, `/db/verhoer%2F${kontext}.sqlite`,
      `/db/verhoer_${kontext}.sqlite`, `/api/db/${kontext}/schema`, `/api/db/verhoer%2F${kontext}/schema`,
      `/api/db/verhoer/${kontext}/schema`]) {
      const res = await request(a).get(pfad);
      assert.equal(res.status, 404, pfad);
      assert.doesNotMatch(res.headers['content-type'] || '', /sqlite/, pfad);
    }
  }
});
