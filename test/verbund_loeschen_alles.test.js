'use strict';
// Abnahme Phase 6 (Plan Task 11, Review Focus 5): Der Verbund-Löschauftrag (Vertrag §6) entfernt ALLE Daten eines
// Kontos bzw. eines Kurses aus der Plattform-DB. Die Daten entstehen über die echten Routen (Lernen, Tipp, Kernpunkte,
// Fehlabfragen, Verhör, Warm-up/Leitner, Trainingsplatz, Board-Schlüssel, Live-Teilnahme). Danach durchsucht der Test
// jede Tabelle aus sqlite_master und jede ihrer Spalten: Kein Wert enthält die gelöschte sub bzw. kurs_id. Neue
// Tabellen späterer Phasen werden so automatisch erfasst. Die übrigen Konten/Kurse bleiben unberührt.

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const request = require('supertest');
const { verbundToken } = require('./helpers');
const { musterantwort } = require('../src/content/pruefer');
const G = require('../src/content/generatoren');
const { ladeWarmupKarten } = require('../src/services/warmup');
const { ladeDatenbanken } = require('../src/sql/datenbanken');
const { ladeLiveInhalte } = require('../src/content/live');
const H = require('./hilfen_lernen');

const { K17, K18 } = H;
const WARMUP = ladeWarmupKarten({ verzeichnis: path.join(__dirname, 'fixtures', 'gibt-es-nicht'), dateien: [path.join(__dirname, 'fixtures', 'warmup_beispiel.json')] });
const LIVE = ladeLiveInhalte({ datenbanken: ladeDatenbanken(undefined, { log: () => {} }) });
const LEHRKRAFT18 = { sub: 'l:8', rolle: 'lehrkraft', name: 'Herr T.', kurse: [{ id: 'k:18', name: 'Inf-GK 12', rolle: 'lehrkraft' }] };
const FALSCH = 'SELECT Bezeichnung FROM Fundsache';

/** Tabellen der Plattform-DB mit ihren Spalten (ohne SQLite-interne Tabellen). */
function tabellen(db) {
  return db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .all()
    .map(({ name }) => ({ name, spalten: db.prepare(`SELECT name FROM pragma_table_info(?)`).all(name).map((s) => s.name) }));
}

/** Fundstellen eines Werts (auch innerhalb von JSON-Texten) in allen Tabellen: [„tabelle.spalte: n“]. */
function fundstellen(db, wert) {
  const treffer = [];
  for (const t of tabellen(db)) {
    for (const s of t.spalten) {
      const n = db.prepare(`SELECT COUNT(*) AS n FROM "${t.name}" WHERE instr(CAST("${s}" AS TEXT), ?) > 0`).get(wert).n;
      if (n) treffer.push(`${t.name}.${s}: ${n}`);
    }
  }
  return treffer;
}

/** Zeilen je Tabelle mit Spalte `spalte` = wert. */
function zeilenJeTabelle(db, spalte, wert) {
  const out = {};
  for (const t of tabellen(db)) {
    if (!t.spalten.includes(spalte)) continue;
    out[t.name] = db.prepare(`SELECT COUNT(*) AS n FROM "${t.name}" WHERE "${spalte}" = ?`).get(wert).n;
  }
  return out;
}

/** Alles, was ein Konto im Kurs tun kann, über die echten Routen. */
async function aktivitaeten(s, kurs) {
  const A = (id) => `${kurs}/aufgaben/${id}`;
  const ok = (r, was) => assert.equal(r.status, 200, `${was}: ${JSON.stringify(r.body)}`);
  ok(await s.post(A('A9-E1-02') + '/tipp'), 'Tipp');
  ok(await s.post(A('A9-E1-03') + '/pruefen', { antwort: FALSCH }), 'Fehlabfrage');
  ok(await s.post(A('A9-E1-04') + '/pruefen', { antwort: [...musterantwort(H.beispiel().aufgaben.find((a) => a.id === 'A9-E1-04'))].reverse() }), 'falsche Antwort');
  for (const id of ['A9-E1-01', 'A9-E1-02', 'A9-E1-12']) {
    const r = await s.post(A(id) + '/pruefen', { antwort: musterantwort(H.beispiel().aufgaben.find((a) => a.id === id)) });
    ok(r, id);
    assert.equal(r.body.geloest, true, id);
  }
  ok(await s.post(A('A9-E1-11') + '/kernpunkte', { haken: 2 }), 'Kernpunkte');
  // Verhör 9: starten, eine Antwort, abgeben
  const v = await s.post(`${kurs}/verhoere/9/start`);
  ok(v, 'Verhör start');
  const erste = v.body.aufgaben[0];
  ok(await s.post(`${kurs}/verhoere/9/antwort`, { aufgabe: erste.id, antwort: musterantwort(H.beispiel().aufgaben.find((a) => a.id === erste.id)) }), 'Verhör antwort');
  ok(await s.post(`${kurs}/verhoere/9/abgeben`), 'Verhör abgeben');
  // Warm-up (Leitner)
  ok(await s.post(`${kurs}/warmup/ziehen`, {}), 'Warm-up ziehen');
  ok(await s.post(`${kurs}/warmup/karten/W-A9-01/aufdecken`), 'Warm-up aufdecken');
  ok(await s.post(`${kurs}/warmup/karten/W-A9-01/bewerten`, { ergebnis: 'gewusst' }), 'Warm-up bewerten');
  // Trainingsplatz
  const n = await s.post(`${kurs}/training/neu`, { typ: 'T1' });
  ok(n, 'Training neu');
  const a = G.erzeuge(n.body.typ, n.body.seed);
  ok(await s.post(`${kurs}/training/pruefen`, { typ: n.body.typ, seed: n.body.seed, signatur: n.body.signatur, antwort: musterantwort(a) }), 'Training prüfen');
}

async function befuelle() {
  const u = H.umgebung({ optionen: { warmupKarten: WARMUP, liveInhalte: LIVE } });
  const lena = await H.client(u, H.SCHUELERIN);
  const mika = await H.client(u, H.SCHUELER2);
  const noa = await H.client(u, H.FREMD);
  const l17 = await H.client(u, H.LEHRKRAFT);
  const l18 = await H.client(u, LEHRKRAFT18);
  for (const k of ['k:17', 'k:18']) H.einstellen(u.db, k, { akten: [9], niveau: 'eA', verhoer: 'offen', scoreboard: true, beamer: true });
  await aktivitaeten(lena, K17);
  await aktivitaeten(mika, K17);
  await aktivitaeten(noa, K18);
  for (const [l, k] of [[l17, 'k:17'], [l18, 'k:18']]) {
    assert.equal((await l.post(`/api/lehrkraft/kurse/${encodeURIComponent(k)}/board-schluessel`)).status, 200);
  }
  // Live-Duell in beiden Kursen, alle treten bei (nur im RAM)
  const runden = {};
  for (const [l, k, s] of [[l17, K17, [lena, mika]], [l18, K18, [noa]]]) {
    const r = await l.post(`${k}/live`, { modus: 'duell', aufgaben: ['K2-L-01'] });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    runden[k] = r.body.id;
    for (const x of s) assert.equal((await x.post(`/api/live/${r.body.id}/beitreten`, {})).status, 200);
  }
  return { u, lena, mika, noa, l17, l18, runden };
}

const loeschen = (u, body) =>
  request(u.app).post('/api/verbund/loeschen').set('Authorization', 'Bearer ' + verbundToken(u.schluessel, u.konfig, 'loeschen')).send(body);

test('Befüllung erreicht jede Tabelle mit sub bzw. kurs_id (sonst prüfte die Löschung zu wenig)', async () => {
  const { u } = await befuelle();
  const konto = zeilenJeTabelle(u.db, 'sub', 's:1042');
  assert.ok(Object.keys(konto).length >= 11, Object.keys(konto).join(', '));
  for (const [t, n] of Object.entries(konto)) assert.ok(n > 0, `keine Zeile für s:1042 in ${t}`);
  const kurs = zeilenJeTabelle(u.db, 'kurs_id', 'k:17');
  for (const [t, n] of Object.entries(kurs)) assert.ok(n > 0, `keine Zeile für k:17 in ${t}`);
  assert.ok(kurs.fehlabfragen > 0 && kurs.kurse === 1);
  assert.ok(u.db.prepare("SELECT board_schluessel FROM kurse WHERE kurs_id = 'k:17'").get().board_schluessel);
});

test('Löschauftrag Konto: keine Spalte irgendeiner Tabelle enthält danach die sub; Live-Teilnahme beendet; Rest bleibt', async () => {
  const { u, mika, l17, runden } = await befuelle();
  assert.ok(fundstellen(u.db, 's:1042').length > 0);
  const vorherMika = zeilenJeTabelle(u.db, 'sub', 's:1043');
  const vorherNoa = zeilenJeTabelle(u.db, 'sub', 's:2001');

  const r = await loeschen(u, { sub: 's:1042' });
  assert.equal(r.status, 200);
  assert.ok(r.body.geloescht >= 12, `geloescht: ${r.body.geloescht}`);
  assert.deepEqual(fundstellen(u.db, 's:1042'), [], 'Reste des Kontos');
  // Live: nur noch Mika in der Runde
  const z = (await l17.get(`/api/live/${runden[K17]}`)).body;
  assert.deepEqual(z.teilnehmer.map((x) => x.name), ['Mika R.']);
  assert.ok(!JSON.stringify(z).includes('s:1042'));
  // andere Konten unverändert, Kurs bleibt
  assert.deepEqual(zeilenJeTabelle(u.db, 'sub', 's:1043'), vorherMika);
  assert.deepEqual(zeilenJeTabelle(u.db, 'sub', 's:2001'), vorherNoa);
  assert.equal((await mika.get(`${K17}/stand`)).status, 200);
  assert.equal(u.db.prepare("SELECT COUNT(*) AS n FROM kurse WHERE kurs_id = 'k:17'").get().n, 1);
  // idempotent
  assert.deepEqual((await loeschen(u, { sub: 's:1042' })).body, { geloescht: 0 });
});

test('Löschauftrag Kurs: keine Spalte irgendeiner Tabelle enthält danach die kurs_id; Board und Live-Runde weg; Rest bleibt', async () => {
  const { u, l18, runden } = await befuelle();
  const board = u.db.prepare("SELECT board_schluessel FROM kurse WHERE kurs_id = 'k:17'").get().board_schluessel;
  assert.equal((await request(u.app).get('/api/board/' + board)).status, 200);
  const vorher18 = zeilenJeTabelle(u.db, 'kurs_id', 'k:18');

  const r = await loeschen(u, { kurs: 'k:17' });
  assert.equal(r.status, 200);
  assert.ok(r.body.geloescht >= 20, `geloescht: ${r.body.geloescht}`);
  assert.deepEqual(fundstellen(u.db, 'k:17'), [], 'Reste des Kurses');
  assert.deepEqual(fundstellen(u.db, board), [], 'Board-Schlüssel');
  assert.equal((await request(u.app).get('/api/board/' + board)).status, 404);
  assert.equal(u.app.locals.live.intern(runden[K17]), null, 'Live-Runde des Kurses gelöscht');
  // Konten bleiben (Vertrag §6: Kurslöschung entfernt nur den Kursbezug), anderer Kurs unverändert
  assert.equal(u.db.prepare("SELECT COUNT(*) AS n FROM konten WHERE sub IN ('s:1042', 's:1043', 'l:7')").get().n, 3);
  assert.deepEqual(zeilenJeTabelle(u.db, 'kurs_id', 'k:18'), vorher18);
  assert.ok(u.app.locals.live.intern(runden[K18]), 'Runde k:18 läuft weiter');
  assert.equal((await l18.get(`/api/live/${runden[K18]}`)).status, 200);
  assert.deepEqual((await loeschen(u, { kurs: 'k:17' })).body, { geloescht: 0 });
  // auch die Live-Statistik (RAM) des Kurses ist weg: Lehrkraft meldet sich neu an (legt den Kurs neu an)
  const neu = await H.client(u, H.LEHRKRAFT);
  const k = (await neu.get(`${K17}/live`)).body;
  assert.equal(k.runde, null);
  assert.deepEqual(k.statistik, [], 'Live-Statistik des gelöschten Kurses');
});
