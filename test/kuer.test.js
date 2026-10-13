'use strict';
// Kür K1 in der Plattform (Plan Phase 6 Task 7): Inhalte seed/akten/kuer.json (Welt 8, kuer: true), Ausführen-Route
// POST /api/kurse/:kurs/aufgaben/:id/skript (Rechte, Rate-Limit, keine Speicherung), Prüfen über die Lern-API,
// Kür ohne Rangwirkung, nicht im Manifest-umfang, nicht in den Verbund-Welten, im gA-Pfad ausgeblendet.

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const request = require('supertest');
const Database = require('better-sqlite3');

const H = require('./hilfen_lernen');
const { erzeugeSandbox } = require('../src/sql/sandbox');
const { erzeugePruefer } = require('../src/sql/pruefer');
const { KUER } = require('../src/domain');

const KUER_DATEI = path.join(__dirname, '..', 'seed', 'akten', 'kuer.json');
const kuer = () => JSON.parse(fs.readFileSync(KUER_DATEI, 'utf8'));
const { K17, K18 } = H;
const SKRIPT = (kurs, id) => `${kurs}/aufgaben/${id}/skript`;
const LEHRKRAFT_FREMD = { sub: 'l:8', rolle: 'lehrkraft', name: 'Herr P.', kurse: [{ id: 'k:18', name: 'Inf-GK 12', rolle: 'lehrkraft' }] };

const ERMITTLER = 'CREATE TABLE Ermittler (\n  ErmittlerNr INTEGER PRIMARY KEY,\n  Name TEXT NOT NULL,\n  Dienstgrad TEXT\n);';

let sandbox;
let pruefer;
before(() => {
  const db = new Database(':memory:');
  db.exec(fs.readFileSync(path.join(__dirname, '..', 'seed', 'datenbanken', 'detektei', 'basis.sql'), 'utf8'));
  const haupt = db.serialize();
  db.close();
  sandbox = erzeugeSandbox({ prozesse: 2, datenbanken: { detektei: { haupt, varianten: {} } } });
  pruefer = erzeugePruefer({ sandbox, schemata: {} });
});
after(() => sandbox.beende());

async function start({ konfig = {}, niveau = 'eA', akten = [8, 9] } = {}) {
  const u = H.umgebung({ pruefer, dateien: [KUER_DATEI], optionen: { sandbox }, konfig });
  const s = await H.client(u, H.SCHUELERIN);
  const fremd = await H.client(u, H.FREMD);
  const l = await H.client(u, H.LEHRKRAFT);
  const lFremd = await H.client(u, LEHRKRAFT_FREMD);
  const admin = await H.client(u, H.SUPERADMIN);
  H.einstellen(u.db, 'k:17', { akten, niveau });
  H.einstellen(u.db, 'k:18', { akten, niveau: 'eA' });
  return { u, s, fremd, l, lFremd, admin };
}

/** Anzahl Zeilen aller Plattform-Tabellen (für „nichts gespeichert“). */
function tabellenStand(db) {
  const namen = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").pluck().all();
  return Object.fromEntries(namen.map((n) => [n, db.prepare(`SELECT COUNT(*) FROM "${n}"`).pluck().get()]));
}

/* ---------------------------------------------------------------- Inhalte */

test('kuer.json: Welt 8, kuer: true, K1-E1-01…06 nach Blueprint (Stufen 2/2/2, nur eA), alle sql-Teile schreiben/aus', () => {
  const d = kuer();
  assert.equal(d.welt, KUER.nr);
  assert.equal(d.kuer, true);
  assert.equal(d.titel, KUER.titel);
  assert.equal(d.boss, undefined);
  assert.deepEqual(d.levels.map((l) => [l.id, l.niveau]), [['K1-E1', 'eA']]);
  assert.deepEqual(d.levels[0].aufgaben, ['K1-E1-01', 'K1-E1-02', 'K1-E1-03', 'K1-E1-04', 'K1-E1-05', 'K1-E1-06']);
  assert.deepEqual(d.aufgaben.map((a) => a.stufe), [1, 1, 2, 2, 3, 3]);
  assert.deepEqual(d.aufgaben.map((a) => a.titel), ['Die erste Tabelle', 'Akten anlegen', 'Der verbotene Verweis', 'Zwei Schreibweisen', 'Personen ohne Fall', 'Unsere Datenbank']);
  for (const a of d.aufgaben) {
    assert.equal(a.niveau, 'eA', a.id);
    assert.match(JSON.stringify(a.inhalt), /KÜR – nicht im Abitur/, `${a.id}: sichtbar markiert`);
    for (const ia of [].concat(a.interaktion).filter((x) => x.kind === 'sql')) {
      assert.equal(ia.schreiben, true, a.id);
      assert.equal(ia.abimodus, 'aus', a.id);
    }
  }
  assert.match(JSON.stringify(d.levels[0].intro), /KÜR – nicht im Abitur/);
  // K1-E1-06: Teamprojekt mit Kernkriterien und Kernpunkten für die drei Abfragen
  const t = d.aufgaben[5];
  assert.deepEqual(t.interaktion.map((x) => x.kind), ['sql', 'kernpunkte']);
  assert.ok(t.loesung[0].pruefung.some((p) => /n:m/.test(p.text)));
  assert.ok(t.loesung[0].pruefung.some((p) => p.art === 'daten'));
});

test('Öffentliche Sicht: schreiben, abimodus aus, Start nur mit Titel – kein Startskript, keine Prüfpunkte vor dem Lösen', async () => {
  const { s } = await start();
  for (const id of ['K1-E1-02', 'K1-E1-03', 'K1-E1-05']) {
    const r = await s.get(`${K17}/aufgaben/${id}`);
    assert.equal(r.status, 200, id);
    const ia = [].concat(r.body.aufgabe.interaktion)[0];
    assert.equal(ia.kind, 'sql');
    assert.equal(ia.schreiben, true);
    assert.equal(ia.abimodus, 'aus');
    assert.deepEqual(Object.keys(ia.start), ['titel']);
    const json = JSON.stringify(r.body);
    for (const geheim of ['pruefung', 'pragma_', 'sqlite_master', 'INSERT INTO Ermittler', 'LEFT JOIN verdaechtig']) {
      assert.ok(!json.includes(geheim), `${id} verrät ${geheim}`);
    }
    assert.equal(r.body.loesung, undefined);
  }
});

/* ---------------------------------------------------------------- Ausführen-Route */

test('Ausführen: Schülerin führt ein Skript aus – Protokoll, Ergebnis, Schema; FK-Verletzung mit deutscher Meldung', async () => {
  const { s } = await start();
  const ok = await s.post(SKRIPT(K17, 'K1-E1-01'), { skript: `${ERMITTLER}\nINSERT INTO Ermittler VALUES (1, 'Edda Lorenz', 'Leitung');\nSELECT * FROM Ermittler;` });
  assert.equal(ok.status, 200);
  assert.equal(ok.headers['cache-control'], 'no-store');
  assert.equal(ok.body.ok, true);
  assert.deepEqual(ok.body.protokoll.map((p) => p.art), ['CREATE TABLE', 'INSERT', 'SELECT']);
  assert.deepEqual(ok.body.ergebnis, { spalten: ['ErmittlerNr', 'Name', 'Dienstgrad'], zeilen: [[1, 'Edda Lorenz', 'Leitung']], gesamt: 1, abgeschnitten: false });
  assert.equal(ok.body.tabellen[0].tabelle, 'Ermittler');

  // K1-E1-03 startet mit Detektei-light (Ermittler 1–3) – der Start kommt aus dem Inhalt, nicht aus der Anfrage
  const fk = await s.post(SKRIPT(K17, 'K1-E1-03'), {
    skript: 'CREATE TABLE Fall (\n  FallNr INTEGER PRIMARY KEY,\n  Titel TEXT,\n  LeiterNr INTEGER NOT NULL,\n  FOREIGN KEY (LeiterNr) REFERENCES Ermittler(ErmittlerNr)\n);\nINSERT INTO Fall VALUES (10, \'Das Phantom\', 7);'
  });
  assert.equal(fk.status, 200);
  assert.equal(fk.body.ok, false);
  assert.equal(fk.body.code, 'FREMDSCHLUESSEL');
  assert.equal(fk.body.anweisung, 2);
  assert.equal(fk.body.zeile, 7);
  assert.match(fk.body.fehler, /^Anweisung 2 \(Zeile 7\): Fremdschlüssel verletzt/);
  assert.ok(!/FOREIGN KEY constraint failed/.test(fk.body.fehler), 'keine Rohmeldung');
  assert.deepEqual(fk.body.protokoll.map((p) => p.art), ['CREATE TABLE']);

  // leeres Skript: nur das Schema des Starts (Detektei-light bzw. Kopie der Detektei-DB)
  const light = await s.post(SKRIPT(K17, 'K1-E1-03'), { skript: '' });
  assert.deepEqual(light.body.tabellen.map((t) => [t.tabelle, t.zeilen]), [['Ermittler', 3]]);
  assert.equal(light.body.ergebnis, null);
  const det = await s.post(SKRIPT(K17, 'K1-E1-05'), { skript: '  ' });
  assert.ok(det.body.tabellen.some((t) => t.tabelle === 'verdaechtig'));
  // Grenzen und verbotene Wörter
  const verboten = await s.post(SKRIPT(K17, 'K1-E1-01'), { skript: "ATTACH DATABASE 'x.db' AS x;" });
  assert.equal(verboten.body.ok, false);
  assert.equal(verboten.body.code, 'VERBOTEN');
});

test('Ausführen: ungültige Anfragen → 400; keine Schreib-Aufgabe → 404; Start/Datenbank nie aus der Anfrage', async () => {
  const { s } = await start();
  for (const body of [{}, { skript: 1 }, { skript: 'x'.repeat(10001) }, { skript: 'SELECT 1;', start: { datenbank: 'verhoer/mensa' } }, []]) {
    const r = await s.post(SKRIPT(K17, 'K1-E1-01'), body);
    assert.equal(r.status, 400, JSON.stringify(body).slice(0, 60));
  }
  assert.equal((await s.post(SKRIPT(K17, 'A9-E1-02'), { skript: 'SELECT 1;' })).status, 404, 'Lese-Aufgabe');
  assert.equal((await s.post(SKRIPT(K17, 'K1-E1-99'), { skript: 'SELECT 1;' })).status, 404);
  assert.equal((await s.post(SKRIPT('/api/kurse/17', 'K1-E1-01'), { skript: 'SELECT 1;' })).status, 400);
});

test('Rechte: anonym 401, Schüler/Lehrkraft fremder Kurs 403, eigener Kurs und Superadmin 200; nicht freigeschaltet 403', async () => {
  const { u, s, fremd, l, lFremd, admin } = await start();
  const body = { skript: 'SELECT 1;' };
  assert.equal((await request(u.app).post(SKRIPT(K17, 'K1-E1-01')).set('Origin', u.konfig.plattformUrl).send(body)).status, 401);
  assert.equal((await fremd.post(SKRIPT(K17, 'K1-E1-01'), body)).status, 403);
  assert.equal((await lFremd.post(SKRIPT(K17, 'K1-E1-01'), body)).status, 403);
  for (const c of [s, l, admin]) {
    const r = await c.post(SKRIPT(K17, 'K1-E1-01'), body);
    assert.equal(r.status, 200);
    assert.equal(r.body.ok, true);
  }
  // fremde Origin (CSRF)
  const csrf = await request(u.app).post(SKRIPT(K17, 'K1-E1-01')).set('Cookie', s.cookie).set('Origin', 'https://boese.example').send(body);
  assert.equal(csrf.status, 403);
  // Kür nicht freigeschaltet: Schüler 403, Lehrkraft (Vorschau) 200
  H.einstellen(u.db, 'k:17', { akten: [9] });
  assert.equal((await s.post(SKRIPT(K17, 'K1-E1-01'), body)).status, 403);
  assert.equal((await l.post(SKRIPT(K17, 'K1-E1-01'), body)).status, 200);
  // gesperrter Kurs: Schüler 403
  H.einstellen(u.db, 'k:17', { akten: [8] });
  u.db.prepare("UPDATE kurse SET aktiv = 0 WHERE kurs_id = 'k:17'").run();
  assert.equal((await s.post(SKRIPT(K17, 'K1-E1-01'), body)).status, 403);
});

test('gA-Pfad: Kür ausgeblendet (Stand, Aufgabe, Ausführen 404)', async () => {
  const { s, l } = await start({ niveau: 'gA', akten: [9] });
  const st = (await s.get(K17 + '/stand')).body;
  assert.ok(!st.akten.some((a) => a.nr === 8));
  assert.equal((await s.get(`${K17}/aufgaben/K1-E1-01`)).status, 404);
  assert.equal((await s.post(SKRIPT(K17, 'K1-E1-01'), { skript: 'SELECT 1;' })).status, 404);
  assert.equal((await l.get(`${K17}/ermittlungen/K1-E1`)).status, 404);
});

test('Rate-Limit je Konto (konfig.rateLimits.kuerSkript) → 429', async () => {
  const { s, l } = await start({ konfig: { rateLimits: { kuerSkript: { max: 2 } } } });
  assert.equal((await s.post(SKRIPT(K17, 'K1-E1-01'), { skript: 'SELECT 1;' })).status, 200);
  assert.equal((await s.post(SKRIPT(K17, 'K1-E1-01'), { skript: 'SELECT 1;' })).status, 200);
  assert.equal((await s.post(SKRIPT(K17, 'K1-E1-01'), { skript: 'SELECT 1;' })).status, 429);
  assert.equal((await l.post(SKRIPT(K17, 'K1-E1-01'), { skript: 'SELECT 1;' })).status, 200, 'anderes Konto');
});

test('Keine Speicherung: Ausführen ändert keine Plattform-Tabelle; Prüfen speichert nur den Lernstand, keine Fehlabfragen', async () => {
  const { u, s } = await start();
  const vorher = tabellenStand(u.db);
  for (let i = 0; i < 3; i++) await s.post(SKRIPT(K17, 'K1-E1-01'), { skript: `${ERMITTLER}\nINSERT INTO Ermittler VALUES (${i}, 'Lena K.', NULL);` });
  assert.deepEqual(tabellenStand(u.db), vorher);
  const falsch = await s.post(`${K17}/aufgaben/K1-E1-01/pruefen`, { antwort: 'CREATE TABLE Ermittler (ErmittlerNr INTEGER, Name TEXT);' });
  assert.equal(falsch.status, 200);
  assert.equal(falsch.body.ok, false);
  assert.equal(u.db.prepare('SELECT COUNT(*) FROM fehlabfragen').pluck().get(), 0, 'Skripte landen nicht in den Fehlabfragen');
  const json = JSON.stringify(u.db.prepare('SELECT * FROM fortschritt').all());
  assert.ok(!json.includes('CREATE TABLE'), 'kein Skript im Lernstand');
});

test('Prüfen: richtig/falsch mit Prüfpunkten; mehrteilige K1-E1-03 (sql + choice) und K1-E1-06 (sql + kernpunkte)', async () => {
  const { s } = await start();
  const P = (id, antwort) => s.post(`${K17}/aufgaben/${id}/pruefen`, { antwort });
  const f = await P('K1-E1-01', 'CREATE TABLE Ermittler (ErmittlerNr INTEGER, Name TEXT, Dienstgrad TEXT);');
  assert.equal(f.body.ok, false);
  assert.deepEqual(f.body.rueckmeldung.pruefpunkte.map((p) => p.ok), [true, false, true, true]);
  assert.equal(f.body.loesung, undefined, 'keine Lösung vor dem Lösen');
  const r = await P('K1-E1-01', ERMITTLER);
  assert.equal(r.body.ok, true, JSON.stringify(r.body.rueckmeldung));
  assert.equal(r.body.geloest, true);
  assert.ok(r.body.loesung.loesung.sql.includes('CREATE TABLE'));

  const fall = "CREATE TABLE Fall (FallNr INTEGER PRIMARY KEY, Titel TEXT, LeiterNr INTEGER, FOREIGN KEY (LeiterNr) REFERENCES Ermittler(ErmittlerNr));\nINSERT INTO Fall VALUES (10, 'Das Phantom', 1);";
  const t3 = await P('K1-E1-03', [fall, ['b']]);
  assert.equal(t3.body.ok, false);
  assert.equal(t3.body.rueckmeldung.teile[0].pruefpunkte.every((p) => p.ok), true);
  const t3ok = await P('K1-E1-03', [fall, ['a']]);
  assert.equal(t3ok.body.ok, true);

  const team = `CREATE TABLE Band (BandNr INTEGER PRIMARY KEY, Name TEXT);
CREATE TABLE Song (SongNr INTEGER PRIMARY KEY, Titel TEXT);
CREATE TABLE spielt (BandNr INTEGER, SongNr INTEGER, PRIMARY KEY (BandNr, SongNr), FOREIGN KEY (BandNr) REFERENCES Band(BandNr), FOREIGN KEY (SongNr) REFERENCES Song(SongNr));
INSERT INTO Band VALUES (1, 'Die Weserwellen'); INSERT INTO Band VALUES (2, 'Nordlicht');
INSERT INTO Song VALUES (1, 'Hafenblues'); INSERT INTO Song VALUES (2, 'Deichlied');
INSERT INTO spielt VALUES (1, 1); INSERT INTO spielt VALUES (2, 1);`;
  const t6 = await P('K1-E1-06', [team, 0]);
  assert.equal(t6.body.ok, true, JSON.stringify(t6.body.rueckmeldung));
  const ohneNm = await P('K1-E1-06', [team.replace('PRIMARY KEY (BandNr, SongNr), ', ''), 0]);
  assert.equal(ohneNm.body.ok, false);
  const punkte = ohneNm.body.rueckmeldung.teile[0].pruefpunkte;
  assert.deepEqual(punkte.map((p) => p.ok), [true, false, false, true]);
});

/* ---------------------------------------------------------------- Kür ohne Rangwirkung */

test('Kür ohne Rangwirkung: Punkte zählen zu den Gesamtpunkten, nicht zum Rang; Stand markiert kuer', async () => {
  const { s } = await start();
  const vorher = (await s.get(K17 + '/stand')).body;
  const k = vorher.akten.find((a) => a.nr === 8);
  assert.equal(k.kuer, true);
  assert.equal(k.titel, KUER.titel);
  assert.equal(vorher.akten.find((a) => a.nr === 9).kuer, false);
  const r = await s.post(`${K17}/aufgaben/K1-E1-01/pruefen`, { antwort: ERMITTLER });
  assert.equal(r.body.punkteErhalten, 10);
  const nachher = (await s.get(K17 + '/stand')).body;
  assert.equal(nachher.punkte.gesamt, vorher.punkte.gesamt + 10);
  assert.equal(nachher.rang.maxPunkte, vorher.rang.maxPunkte, 'Kür-Punkte nicht in der Rang-Basis');
  assert.equal(nachher.rang.punkte, vorher.rang.punkte);
  assert.ok(!nachher.abzeichen.some((z) => z.akte === 8), 'kein Abzeichen „Akte geschlossen“ für die Kür');
});

test('Manifest-umfang und Verbund-Welten ohne Kür', async () => {
  const { u } = await start();
  const umfang = u.inhalte.umfang();
  assert.equal(umfang.welten, 1, 'nur die Beispielakte zählt');
  assert.ok(!u.inhalte.akten().filter((a) => !a.kuer).some((a) => a.nr === 8));
  const m = (await request(u.app).get('/api/plattform')).body;
  assert.ok(!m.welten.some((w) => w.nr === 8));
  assert.deepEqual(m.umfang, umfang);
  const st = u.app.locals.stand;
  const kz = st.kennzahlen('k:17', ['s:1042']);
  assert.ok(!kz.welten.some((w) => w.nr === 8));
});

test('Lehrkraft: Kür freischalten (8) nur eA; Wechsel zu gA mit freigeschalteter Kür → 400', async () => {
  const { u, l } = await start({ akten: [] });
  const put = (body) => request(u.app).put('/api/lehrkraft/kurse/k%3A17/einstellungen').set('Cookie', l.cookie).set('Origin', u.konfig.plattformUrl).send(body);
  assert.equal((await put({ akten: [1, 8] })).status, 200);
  const r = await put({ niveau: 'gA' });
  assert.equal(r.status, 400);
  assert.match(r.body.error, /Kür K1/);
});
