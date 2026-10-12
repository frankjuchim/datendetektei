'use strict';
// Serverseitiges Ausführen als Fallback ohne WASM (Spec §18, Plan Phase 2 Task 12): POST /api/sql/ausfuehren.
// Nur öffentliche Akten-DBs, nur die Haupt-DB (Varianten nie), Eisdiele ohne Anmeldung, die übrigen nur angemeldet,
// Rate-Limit 30/min je Konto bzw. je IP, Origin-Prüfung + JSON, höchstens 300 Zeilen, deutsche Fehlertexte.

const test = require('node:test');
const assert = require('node:assert/strict');
const Database = require('better-sqlite3');
const request = require('supertest');
const { testApp, meldeAn } = require('./helpers');
const { ladeDatenbanken, AKTEN_DATENBANKEN } = require('../src/sql/datenbanken');
const { erzeugeSandbox } = require('../src/sql/sandbox');

const ORIGIN = 'https://datendetektei.example';
const datenbanken = ladeDatenbanken(undefined, { log: () => {} });
const sandboxDbs = Object.fromEntries(
  datenbanken.namen.map((n) => [n, { haupt: datenbanken.haupt(n), varianten: datenbanken.varianten(n) }])
);

let sandbox;
test.before(() => {
  sandbox = erzeugeSandbox({ prozesse: 2, datenbanken: sandboxDbs });
});
test.after(() => sandbox.beende());

function app(sb = sandbox, ueberschreiben = {}) {
  return testApp(ueberschreiben, { datenbanken, sandbox: sb });
}

function post(t, body, cookie) {
  const r = request(t.app).post('/api/sql/ausfuehren').set('Origin', ORIGIN).send(body);
  return cookie ? r.set('Cookie', cookie) : r;
}

/* ---------- Rechte ---------- */

test('Eisdiele ohne Anmeldung: Ergebnis mit Spalten, Zeilen, Gesamtzahl, Laufzeit', async () => {
  const t = app();
  const res = await post(t, { db: 'eisdiele', sql: 'SELECT SorteNr, Name FROM Sorte ORDER BY SorteNr' });
  assert.equal(res.status, 200);
  assert.match(res.headers['cache-control'], /no-store/);
  assert.deepEqual(res.body.spalten, ['SorteNr', 'Name']);
  assert.equal(res.body.gesamt, 10);
  assert.equal(res.body.zeilen.length, 10);
  assert.equal(res.body.zeilen[0][0], 1);
  assert.equal(res.body.abgeschnitten, false);
  assert.equal(typeof res.body.ms, 'number');
});

test('Übrige Akten-DBs ohne Anmeldung: 401; angemeldet: 200', async () => {
  const t = app();
  for (const name of AKTEN_DATENBANKEN.filter((n) => n !== 'eisdiele')) {
    const res = await post(t, { db: name, sql: 'SELECT 1 AS eins' });
    assert.equal(res.status, 401, name);
    assert.deepEqual(Object.keys(res.body), ['error']);
  }
  const cookie = await meldeAn(t);
  for (const name of AKTEN_DATENBANKEN) {
    const res = await post(t, { db: name, sql: 'SELECT 1 AS eins' }, cookie);
    assert.equal(res.status, 200, name);
    assert.deepEqual(res.body.zeilen, [[1]], name);
  }
});

test('Lehrkraft und Admin dürfen ebenfalls ausführen', async () => {
  const t = app();
  for (const nutzer of [
    { sub: 'l:7', rolle: 'lehrkraft', name: 'Frau Beispiel', kurse: [] },
    { sub: 'a:1', rolle: 'superadmin', name: 'Admin', kurse: [] }
  ]) {
    const cookie = await meldeAn(t, nutzer);
    const res = await post(t, { db: 'stadtrad', sql: 'SELECT COUNT(*) FROM Station' }, cookie);
    assert.equal(res.status, 200, nutzer.rolle);
  }
});

test('Unbekannte oder nicht öffentliche DB: 404 (auch angemeldet)', async () => {
  const t = app();
  const cookie = await meldeAn(t);
  for (const db of ['gibtsnicht', 'verhoer', '../eisdiele', 'Eisdiele', '__proto__', 'constructor']) {
    const res = await post(t, { db, sql: 'SELECT 1' }, cookie);
    assert.equal(res.status, 404, db);
    assert.deepEqual(res.body, { error: 'Nicht gefunden.' });
  }
});

test('Ungültige Anfragen: 400 (fehlende Felder, falsche Typen, zu lang)', async () => {
  const t = app();
  for (const body of [{}, { db: 'eisdiele' }, { sql: 'SELECT 1' }, { db: 'eisdiele', sql: 5 }, { db: 7, sql: 'SELECT 1' },
    { db: 'eisdiele', sql: 'SELECT 1' + ' '.repeat(4000) }]) {
    const res = await post(t, body);
    assert.equal(res.status, 400, JSON.stringify(body).slice(0, 60));
    assert.deepEqual(res.body, { error: 'Ungültige Anfrage.' });
  }
});

test('Origin-Prüfung und JSON-Pflicht wie für alle POSTs', async () => {
  const t = app();
  const ohneOrigin = await request(t.app).post('/api/sql/ausfuehren').send({ db: 'eisdiele', sql: 'SELECT 1' });
  assert.equal(ohneOrigin.status, 403);
  const fremd = await request(t.app)
    .post('/api/sql/ausfuehren')
    .set('Origin', 'https://boese.example')
    .send({ db: 'eisdiele', sql: 'SELECT 1' });
  assert.equal(fremd.status, 403);
  const formular = await request(t.app)
    .post('/api/sql/ausfuehren')
    .set('Origin', ORIGIN)
    .type('form')
    .send('db=eisdiele&sql=SELECT+1');
  assert.equal(formular.status, 415);
});

test('Ohne Sandbox-Option gibt es die Route nicht', async () => {
  const t = testApp({}, { datenbanken });
  const res = await post(t, { db: 'eisdiele', sql: 'SELECT 1' });
  assert.equal(res.status, 404);
});

/* ---------- Rate-Limit ---------- */

test('Rate-Limit: 30 je Minute je IP ohne Anmeldung, je Konto mit Anmeldung (getrennt)', async () => {
  const t = app();
  for (let i = 0; i < 30; i++) {
    const res = await post(t, { db: 'eisdiele' }); // ungültig, zählt trotzdem
    assert.equal(res.status, 400, `Anfrage ${i + 1}`);
  }
  const zuViel = await post(t, { db: 'eisdiele', sql: 'SELECT 1' });
  assert.equal(zuViel.status, 429);
  assert.deepEqual(zuViel.body, { error: 'Zu viele Anfragen.' });
  assert.ok(Number(zuViel.headers['retry-after']) >= 1);

  // Angemeldetes Konto hat ein eigenes Kontingent (gleiche IP).
  const lena = await meldeAn(t);
  const ok = await post(t, { db: 'eisdiele', sql: 'SELECT 1' }, lena);
  assert.equal(ok.status, 200);
  for (let i = 1; i < 30; i++) await post(t, { db: 'stadtrad' }, lena);
  assert.equal((await post(t, { db: 'eisdiele', sql: 'SELECT 1' }, lena)).status, 429);

  // Ein anderes Konto zählt getrennt.
  const mika = await meldeAn(t, { sub: 's:2001', name: 'Mika R.' });
  assert.equal((await post(t, { db: 'eisdiele', sql: 'SELECT 1' }, mika)).status, 200);
});

test('Rate-Limit: nach Ablauf des Fensters wieder frei', async () => {
  let jetzt = 1_000_000;
  const t = app(sandbox, { jetzt: () => jetzt });
  for (let i = 0; i < 30; i++) await post(t, { db: 'eisdiele' });
  assert.equal((await post(t, { db: 'eisdiele' })).status, 429);
  jetzt += 60_001;
  assert.equal((await post(t, { db: 'eisdiele' })).status, 400);
});

/* ---------- Ausführung und Fehler ---------- */

test('Höchstens 300 Zeilen, Gesamtzahl exakt; über 5 000 abgeschnitten', async () => {
  const t = app();
  const kreuz = await post(t, { db: 'eisdiele', sql: 'SELECT v1.VerkaufNr, v2.VerkaufNr FROM Verkauf v1, Verkauf v2' });
  assert.equal(kreuz.status, 200);
  assert.equal(kreuz.body.zeilen.length, 300);
  assert.equal(kreuz.body.gesamt, 57 * 57);
  assert.equal(kreuz.body.abgeschnitten, false);

  const riesig = await post(t, { db: 'eisdiele', sql: 'SELECT 1 FROM Verkauf a, Verkauf b, Verkauf c' });
  assert.equal(riesig.status, 200);
  assert.equal(riesig.body.zeilen.length, 300);
  assert.equal(riesig.body.gesamt, 5000);
  assert.equal(riesig.body.abgeschnitten, true);
});

test('Verbotene Anweisungen werden abgelehnt (deutscher Text, keine Ausführung)', async () => {
  const t = app();
  const faelle = [
    ['PRAGMA table_info(Sorte)', 'VERBOTEN', /PRAGMA ist hier nicht erlaubt/],
    ["ATTACH 'x.db' AS y", 'VERBOTEN', /ATTACH ist hier nicht erlaubt/],
    ["SELECT load_extension('x')", 'VERBOTEN', /nicht erlaubt/],
    ['.tables', 'VERBOTEN', /nicht erlaubt/],
    ["INSERT INTO Sorte VALUES (99, 'Test', 1, 'ja')", 'NICHT_LESEND', /nur gelesen/],
    ['DELETE FROM Verkauf', 'NICHT_LESEND', /nur gelesen/],
    ['SELECT 1; DROP TABLE Sorte', 'MEHRERE_ANWEISUNGEN', /nur eine Anweisung/]
  ];
  for (const [sql, code, text] of faelle) {
    const res = await post(t, { db: 'eisdiele', sql });
    assert.equal(res.status, 200, sql);
    assert.equal(res.body.code, code, sql);
    assert.match(res.body.fehler, text, sql);
    assert.equal(res.body.zeilen, undefined, sql);
  }
  // Haupt-DB unverändert
  const n = await post(t, { db: 'eisdiele', sql: 'SELECT COUNT(*) FROM Verkauf' });
  assert.deepEqual(n.body.zeilen, [[57]]);
});

test('SQLite-Fehler kommen über fehlertexte.js auf Deutsch', async () => {
  const t = app();
  const res = await post(t, { db: 'eisdiele', sql: 'SELECT Geschmack FROM Sorte' });
  assert.equal(res.status, 200);
  assert.equal(res.body.code, 'KEINE_SPALTE');
  assert.match(res.body.fehler, /Die Spalte Geschmack gibt es nicht/);
  assert.doesNotMatch(JSON.stringify(res.body), /no such column/);
});

test('Endlosabfrage: Zeitlimit mit deutschem Text, danach wieder ausführbar', async () => {
  const t = app();
  const res = await post(t, {
    db: 'eisdiele',
    sql: 'WITH RECURSIVE c(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM c) SELECT COUNT(*) FROM c'
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.code, 'ZEITLIMIT');
  assert.match(res.body.fehler, /zu lange gerechnet/);
  const danach = await post(t, { db: 'eisdiele', sql: 'SELECT COUNT(*) FROM Sorte' });
  assert.deepEqual(danach.body.zeilen, [[10]]);
});

test('Sandbox nicht verfügbar: 503 mit deutschem Text', async () => {
  const kaputt = { fuehreAus: async () => ({ ok: false, code: 'absturz', text: 'Sandbox nicht verfügbar' }) };
  const t = app(kaputt);
  const res = await post(t, { db: 'eisdiele', sql: 'SELECT 1' });
  assert.equal(res.status, 503);
  assert.match(res.body.fehler, /konnte gerade nicht ausgeführt werden/);
  const voll = app({ fuehreAus: async () => ({ ok: false, code: 'ueberlastet', text: 'Sandbox überlastet' }) });
  const res2 = await post(voll, { db: 'eisdiele', sql: 'SELECT 1' });
  assert.equal(res2.status, 503);
  assert.match(res2.body.fehler, /Versuch es in ein paar Sekunden/);
});

/* ---------- Varianten nie erreichbar ---------- */

test('Die Route gibt nie eine Variante an die Sandbox weiter', async () => {
  const aufrufe = [];
  const spion = {
    fuehreAus: async (auftrag) => {
      aufrufe.push(auftrag);
      return { ok: true, spalten: ['x'], zeilen: [[1]], anzahl: 1, abgeschnitten: false, ms: 1 };
    }
  };
  const t = app(spion);
  const cookie = await meldeAn(t);
  await post(t, { db: 'stadtrad', variante: 'null', sql: 'SELECT 1' }, cookie);
  await post(t, { db: 'stadtrad', sql: 'SELECT 1', modus: 'schreiben', varianten: ['null'] }, cookie);
  assert.equal(aufrufe.length, 2);
  for (const a of aufrufe) assert.deepEqual(a, { db: 'stadtrad', sql: 'SELECT 1' });
});

test('Ergebnis stammt immer aus der Haupt-DB, auch wenn eine Variante verlangt wird', async () => {
  const t = app();
  const cookie = await meldeAn(t);
  // Tabelle suchen, deren Zeilenzahl sich in einer Variante unterscheidet
  let fall = null;
  for (const name of AKTEN_DATENBANKEN) {
    for (const [typ, puffer] of Object.entries(datenbanken.varianten(name))) {
      const haupt = new Database(datenbanken.haupt(name));
      const variante = new Database(puffer);
      for (const { tabelle } of datenbanken.schema(name)) {
        const a = haupt.prepare(`SELECT COUNT(*) AS n FROM "${tabelle}"`).get().n;
        const b = variante.prepare(`SELECT COUNT(*) AS n FROM "${tabelle}"`).get().n;
        if (a !== b && !fall) fall = { name, typ, tabelle, haupt: a };
      }
      haupt.close();
      variante.close();
    }
  }
  assert.ok(fall, 'keine Variante mit abweichender Zeilenzahl gefunden');
  const res = await post(t, { db: fall.name, variante: fall.typ, sql: `SELECT COUNT(*) FROM ${fall.tabelle}` }, cookie);
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.zeilen, [[fall.haupt]]);
});
