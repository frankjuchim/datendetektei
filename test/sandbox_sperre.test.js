'use strict';
// Sicherheitsprüfung Phase 8, Befund F3: höchstens ein laufender (oder wartender) Sandbox-Auftrag je Konto (ohne
// Anmeldung je IP). Ein zweiter Auftrag desselben Kontos → 429 mit deutschem Text (code LAEUFT_NOCH), andere Konten
// kommen parallel durch. Die Sperre gilt routenübergreifend (Prüfen in Ermittlung/Verhör/Live, Gast-Prüfen,
// /api/sql/ausfuehren, K1-Skript) und wird nach dem Ende freigegeben – auch nach Fehler, Zeitlimit und abgebrochener
// Verbindung (dann erst, wenn der Auftrag wirklich fertig ist).

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');
const request = require('supertest');
const H = require('./hilfen_lernen');
const { ladeDatenbanken } = require('../src/sql/datenbanken');
const { ladeLiveInhalte } = require('../src/content/live');
const { erzeugeSandbox } = require('../src/sql/sandbox');
const { auftragsSperre } = require('../src/kern/sicherheit');

const { K17 } = H;
const datenbanken = ladeDatenbanken(undefined, { log: () => {} });
const LIVE = ladeLiveInhalte({ datenbanken });

/** Schranke: der nächste Auftrag wartet, bis oeffne() gerufen wird; alle übrigen laufen sofort. */
function schranke() {
  let halten = false;
  let oeffnen = null;
  return {
    halteNaechsten() {
      halten = true;
    },
    async warte() {
      if (!halten) return;
      halten = false;
      await new Promise((r) => { oeffnen = r; });
    },
    oeffne() {
      if (oeffnen) oeffnen();
      oeffnen = null;
    },
    get wartet() {
      return oeffnen !== null;
    }
  };
}

async function bis(bedingung) {
  for (let i = 0; i < 200 && !bedingung(); i++) await new Promise((r) => setTimeout(r, 5));
  assert.ok(bedingung(), 'Bedingung nicht erreicht');
}

/** App mit gebremstem SQL-Prüfer und gebremster Sandbox (Stubs, keine Kindprozesse). */
async function start() {
  const s = schranke();
  const stub = H.stubPruefer();
  const pruefer = {
    async pruefeSql(a) {
      await s.warte();
      return stub.pruefeSql(a);
    }
  };
  const sandbox = {
    async fuehreAus() {
      await s.warte();
      return { ok: true, spalten: ['eins'], zeilen: [[1]], anzahl: 1, abgeschnitten: false, ms: 1 };
    },
    async fuehreSkriptAus() {
      await s.warte();
      return { ok: false, code: 'absturz', text: 'egal' };
    }
  };
  const u = H.umgebung({ pruefer, optionen: { sandbox, liveInhalte: LIVE }, konfig: { rateLimits: { pruefenSql: { max: 1000 } }, sandboxAuftraegeJeIp: 1 } });
  const lena = await H.client(u, H.SCHUELERIN);
  const mika = await H.client(u, H.SCHUELER2);
  H.einstellen(u.db, 'k:17', { akten: [9], niveau: 'eA', verhoer: 'offen' });
  return { u, s, lena, mika };
}

const A = (id) => `${K17}/aufgaben/${id}`;
const AUSFUEHREN = '/api/sql/ausfuehren';

/** Startet eine Anfrage, ohne auf die Antwort zu warten (supertest startet erst mit then()). */
function laufend(anfrage) {
  return new Promise((r) => { anfrage.then(r, r); });
}

test('Middleware: zweiter Auftrag desselben Schlüssels → 429 LAEUFT_NOCH, anderer Schlüssel läuft parallel, Freigabe danach', async () => {
  const sperre = auftragsSperre();
  const s = schranke();
  const app = express();
  app.get('/api/x', sperre.middleware({ schluessel: (req) => req.query.wer }), async (req, res) => {
    if (req.query.halten) s.halteNaechsten();
    await s.warte();
    res.json({ ok: true });
  });
  const erste = laufend(request(app).get('/api/x?wer=a&halten=1'));
  await bis(() => s.wartet);
  assert.equal(sperre.anzahl(), 1);
  const zweite = await request(app).get('/api/x?wer=a');
  assert.equal(zweite.status, 429);
  assert.equal(zweite.body.code, 'LAEUFT_NOCH');
  assert.match(zweite.body.error, /läuft noch/);
  assert.equal(zweite.headers['retry-after'], '1');
  assert.equal((await request(app).get('/api/x?wer=b')).status, 200, 'anderer Schlüssel');
  s.oeffne();
  assert.equal((await erste).status, 200);
  assert.equal(sperre.anzahl(), 0);
  assert.equal((await request(app).get('/api/x?wer=a')).status, 200, 'nach dem Ende frei');
});

test('Middleware: Freigabe auch nach Fehler im Handler (Fehler-Handler antwortet)', async () => {
  const sperre = auftragsSperre();
  const app = express();
  app.get('/api/x', sperre.middleware({ schluessel: () => 'a' }), async () => {
    throw new Error('kaputt');
  });
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => res.status(500).json({ error: 'Fehler.' }));
  assert.equal((await request(app).get('/api/x')).status, 500);
  assert.equal(sperre.anzahl(), 0);
  assert.equal((await request(app).get('/api/x')).status, 500, 'nicht 429');
});

test('Middleware: abgebrochene Verbindung gibt erst frei, wenn der Auftrag fertig ist; Sicherung nach haltMs', async () => {
  const sperre = auftragsSperre();
  const s = schranke();
  const app = express();
  app.get('/api/x', sperre.middleware({ schluessel: () => 'a' }), async (req, res) => {
    if (req.query.halten) s.halteNaechsten();
    await s.warte();
    res.json({ ok: true });
  });
  const server = app.listen(0);
  try {
    const port = server.address().port;
    const abgebrochen = http.get({ port, path: '/api/x?halten=1' });
    abgebrochen.on('error', () => {});
    await bis(() => s.wartet);
    abgebrochen.destroy();
    await new Promise((r) => setTimeout(r, 30));
    assert.equal((await request(server).get('/api/x')).status, 429, 'Abbruch umgeht die Sperre nicht');
    s.oeffne();
    await bis(() => sperre.anzahl() === 0);
    assert.equal((await request(server).get('/api/x')).status, 200);
  } finally {
    server.close();
  }

  // Sicherung: hängt ein Auftrag, gibt die Sperre spätestens nach haltMs frei.
  const kurz = auftragsSperre({ haltMs: 50 });
  const app2 = express();
  app2.get('/api/y', kurz.middleware({ schluessel: () => 'a' }), () => {});
  const haengt = request(app2).get('/api/y').timeout(300);
  haengt.then(() => {}, () => {});
  await bis(() => kurz.anzahl() === 1);
  await bis(() => kurz.anzahl() === 0);
});

test('Routen: ein Auftrag je Konto über alle Sandbox-Routen; andere Konten und Nicht-SQL laufen weiter', async () => {
  const { s, lena, mika } = await start();
  s.halteNaechsten();
  const erste = laufend(lena.post(AUSFUEHREN, { db: 'eisdiele', sql: 'SELECT 1' }));
  await bis(() => s.wartet);

  const gesperrt = [
    ['Ausführen', lena.post(AUSFUEHREN, { db: 'eisdiele', sql: 'SELECT 1' })],
    ['Prüfen sql', lena.post(A('A9-E1-02') + '/pruefen', { antwort: 'SELECT 1' })],
    ['Verhör sql', lena.post(`${K17}/verhoere/9/antwort`, { aufgabe: 'A9-V-03', antwort: 'SELECT 1' })],
    ['Live-Antwort', lena.post('/api/live/abcdefghijkl/antwort', { aufgabe: 'x', antwort: 'SELECT 1' })],
    ['K1-Skript', lena.post(A('K1-E1-01') + '/skript', { skript: 'SELECT 1;' })]
  ];
  for (const [name, anfrage] of gesperrt) {
    const r = await anfrage;
    assert.equal(r.status, 429, name);
    assert.equal(r.body.code, 'LAEUFT_NOCH', name);
    assert.equal(r.body.error, 'Deine vorige Abfrage läuft noch. Warte kurz und versuch es dann noch einmal.', name);
  }
  // Nicht-SQL-Prüfung desselben Kontos ist nicht betroffen
  assert.equal((await lena.post(A('A9-E1-01') + '/pruefen', { antwort: ['a'] })).status, 200);
  // anderes Konto parallel
  assert.equal((await mika.post(AUSFUEHREN, { db: 'eisdiele', sql: 'SELECT 1' })).status, 200);
  assert.equal((await mika.post(A('A9-E1-02') + '/pruefen', { antwort: 'SELECT 1' })).status, 200);

  s.oeffne();
  assert.equal((await erste).status, 200);
  assert.equal((await lena.post(A('A9-E1-02') + '/pruefen', { antwort: 'SELECT 1' })).status, 200, 'nach dem Ende frei');
});

test('Routen: ohne Anmeldung je IP (Gast-Prüfen und Eisdiele-Ausführen teilen sich die Sperre; Grenze hier 1, Standard 4)', async () => {
  const { u, s, lena } = await start();
  const anonym = (pfad, body) => request(u.app).post(pfad).set('Origin', u.konfig.plattformUrl).send(body);
  s.halteNaechsten();
  const erste = laufend(anonym('/api/gast/aufgaben/G-01/pruefen', { antwort: 'SELECT Name FROM Sorte' }));
  await bis(() => s.wartet);
  for (const r of [
    await anonym('/api/gast/aufgaben/G-01/pruefen', { antwort: 'SELECT 1' }),
    await anonym(AUSFUEHREN, { db: 'eisdiele', sql: 'SELECT 1' })
  ]) {
    assert.equal(r.status, 429);
    assert.equal(r.body.code, 'LAEUFT_NOCH');
    assert.match(r.body.error, /von diesem Anschluss/);
  }
  // Gast-Aufgabe ohne SQL ist nicht betroffen; angemeldetes Konto (eigener Schlüssel) auch nicht
  assert.equal((await anonym('/api/gast/aufgaben/G-05/pruefen', { antwort: ['b'] })).status, 200);
  assert.equal((await lena.post(AUSFUEHREN, { db: 'eisdiele', sql: 'SELECT 1' })).status, 200);
  s.oeffne();
  assert.equal((await erste).status, 200);
  assert.equal((await anonym(AUSFUEHREN, { db: 'eisdiele', sql: 'SELECT 1' })).status, 200);
});

test('Echte Sandbox: nach Zeitlimit und nach Fehler ist das Konto sofort wieder frei', async () => {
  const sandbox = erzeugeSandbox({
    prozesse: 2,
    zeitlimitMs: 300,
    datenbanken: { eisdiele: { haupt: datenbanken.haupt('eisdiele'), varianten: {} } }
  });
  try {
    const u = H.umgebung({ optionen: { sandbox, datenbanken } });
    const lena = await H.client(u, H.SCHUELERIN);
    const endlos = 'WITH RECURSIVE z(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM z) SELECT COUNT(*) FROM z';
    const r1 = await lena.post(AUSFUEHREN, { db: 'eisdiele', sql: endlos });
    assert.equal(r1.body.code, 'ZEITLIMIT');
    const r2 = await lena.post(AUSFUEHREN, { db: 'eisdiele', sql: 'SELECT * FROM GibtsNicht' });
    assert.equal(r2.status, 200);
    assert.ok(r2.body.fehler);
    const r3 = await lena.post(AUSFUEHREN, { db: 'eisdiele', sql: 'SELECT 1 AS eins' });
    assert.equal(r3.status, 200);
    assert.deepEqual(r3.body.zeilen, [[1]]);
  } finally {
    sandbox.beende();
  }
});
