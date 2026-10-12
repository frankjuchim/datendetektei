'use strict';
// Warm-up-Trainer (Plan Phase 3 Task 8, Spec §7.8, AUFGABENFORMAT §9): Karten aus seed/warmup, Leitner 5 Fächer
// (0/1/3/7/14 Tage), gewusst/teilweise/nicht, Filter Akte/Kategorie, nur freigeschaltete Akten, ohne Punkte,
// Lösung erst nach dem Aufdecken.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const request = require('supertest');

const { ladeWarmupKarten, kartenAus, erzeugeWarmup, INTERVALLE_TAGE } = require('../src/services/warmup');
const H = require('./hilfen_lernen');

const { K17, K18 } = H;
const W = K17 + '/warmup';
const FIXTURE = path.join(__dirname, 'fixtures', 'warmup_beispiel.json');
const TAG = 86400000;
const KEIN_VERZEICHNIS = path.join(__dirname, 'fixtures', 'gibt-es-nicht');

/** Fixture (Akte 9) + eine Karte aus Akte 1 (im Test nicht freigeschaltet). */
function karten() {
  return [
    ...ladeWarmupKarten({ verzeichnis: KEIN_VERZEICHNIS, dateien: [FIXTURE] }),
    {
      id: 'W-A1-01',
      akte: 1,
      kategorie: 'SQL eine Tabelle',
      titel: 'Gesperrte Karte',
      aufgabe: 'Diese Karte gehört zu Akte 1.',
      loesung: 'Geheimnis der Akte eins',
      minuten: 2,
      kompetenz: ['DB-K15'],
      falle: []
    }
  ];
}

async function start(opt = {}) {
  const u = H.umgebung({ optionen: { warmupKarten: karten() } });
  const s = await H.client(u, opt.wer || H.SCHUELERIN);
  H.einstellen(u.db, 'k:17', { akten: [9], niveau: 'eA' });
  return { u, s };
}

test('ladeWarmupKarten: Seed-Verzeichnis und Fixture werden gelesen, Pflichtfelder geprüft', () => {
  const alle = ladeWarmupKarten();
  assert.ok(alle.length >= 1, 'seed/warmup enthält Karten');
  assert.ok(alle.every((k) => /^W-A\d-\d{2}$/.test(k.id)));
  const fx = ladeWarmupKarten({ verzeichnis: KEIN_VERZEICHNIS, dateien: [FIXTURE] });
  assert.deepEqual(
    fx.map((k) => k.id),
    ['W-A9-01', 'W-A9-02']
  );
  assert.throws(() => kartenAus({ version: 1, karten: [{ id: 'X' }] }, 'x.json'), /Karte/);
  assert.throws(() => kartenAus({ version: 2, karten: [] }, 'x.json'), /version/);
  assert.deepEqual(ladeWarmupKarten({ verzeichnis: path.join(__dirname, 'gibt-es-nicht') }), []);
});

test('Leitner-Intervalle 0/1/3/7/14 Tage', () => {
  assert.deepEqual(INTERVALLE_TAGE, { 1: 0, 2: 1, 3: 3, 4: 7, 5: 14 });
});

test('Leitner mit injizierter Uhr: gewusst → Fach+1, teilweise bleibt, nicht → Fach 1; Fälligkeit nach Intervall', async () => {
  const { u } = await start();
  let t = Date.parse('2026-10-12T08:00:00Z');
  const w = erzeugeWarmup({ db: u.db, lernen: u.app.locals.lernen, stand: u.app.locals.stand, karten: karten(), jetzt: () => t });
  const sitz = { sub: H.SCHUELERIN.sub, rolle: 'schueler' };

  let z = w.ziehen(sitz, 'k:17', {});
  assert.equal(z.karte.id, 'W-A9-01');
  assert.equal(z.fach, 1);
  assert.equal(z.neu, true);
  assert.equal(z.faellig, 2, 'nur Karten freigeschalteter Akten');

  let b = w.bewerten(sitz, 'k:17', 'W-A9-01', { ergebnis: 'gewusst' });
  assert.equal(b.vorher, 1);
  assert.equal(b.fach, 2);
  assert.equal(b.faelligAb, new Date(t + 1 * TAG).toISOString());

  // Karte 1 ist morgen fällig – jetzt kommt Karte 2.
  z = w.ziehen(sitz, 'k:17', {});
  assert.equal(z.karte.id, 'W-A9-02');
  b = w.bewerten(sitz, 'k:17', 'W-A9-02', { ergebnis: 'teilweise' });
  assert.equal(b.fach, 1, 'teilweise: Fach bleibt');
  assert.equal(b.faelligAb, new Date(t).toISOString(), 'Fach 1: sofort wieder fällig');
  b = w.bewerten(sitz, 'k:17', 'W-A9-02', { ergebnis: 'gewusst' });
  assert.equal(b.fach, 2);

  // nichts fällig
  z = w.ziehen(sitz, 'k:17', {});
  assert.equal(z.karte, null);
  assert.equal(z.grund, 'nichts_faellig');
  assert.equal(z.naechsteFaelligkeit, new Date(t + TAG).toISOString());

  // 1 Tag später: beide fällig; Fach 2 → 3 (3 Tage), → 4 (7), → 5 (14), bleibt 5.
  const erwartet = [
    [3, 3],
    [4, 7],
    [5, 14],
    [5, 14]
  ];
  t += TAG;
  for (const [fach, tage] of erwartet) {
    z = w.ziehen(sitz, 'k:17', { akte: 9, kategorie: 'Relationales Modell' });
    assert.equal(z.karte.id, 'W-A9-01');
    b = w.bewerten(sitz, 'k:17', 'W-A9-01', { ergebnis: 'gewusst' });
    assert.equal(b.fach, fach);
    assert.equal(b.faelligAb, new Date(t + tage * TAG).toISOString());
    t += tage * TAG;
  }
  // nicht → zurück in Fach 1, sofort fällig
  b = w.bewerten(sitz, 'k:17', 'W-A9-01', { ergebnis: 'nicht' });
  assert.equal(b.vorher, 5);
  assert.equal(b.fach, 1);
  assert.equal(b.faelligAb, new Date(t).toISOString());

  // Statistik
  const st = w.uebersicht(sitz, 'k:17', {});
  assert.equal(st.statistik.gesamt, 2);
  assert.equal(st.statistik.neu, 0);
  assert.equal(st.statistik.faecher[1], 1);
  assert.equal(st.statistik.faecher[2], 1);
});

test('ziehen: „ausser“ überspringt die aktuelle Karte, wenn eine andere fällig ist', async () => {
  const { s } = await start();
  const r = await s.post(W + '/ziehen', { ausser: 'W-A9-01' });
  assert.equal(r.status, 200);
  assert.equal(r.body.karte.id, 'W-A9-02');
});

test('Karte zuerst ohne Lösung; Lösung (loesung, loesungSql) erst nach POST aufdecken; ohne Punkte', async () => {
  const { u, s } = await start();
  const fx = ladeWarmupKarten({ verzeichnis: KEIN_VERZEICHNIS, dateien: [FIXTURE] });
  const geheim = fx.flatMap((k) => [k.loesung, k.loesungSql].filter(Boolean));

  const ue = await s.get(W);
  const z1 = await s.post(W + '/ziehen', {});
  const z2 = await s.post(W + '/ziehen', { ausser: 'W-A9-01' });
  for (const r of [ue, z1, z2]) {
    assert.equal(r.status, 200);
    const json = JSON.stringify(r.body);
    assert.ok(!json.includes('"loesung'), 'kein Lösungsfeld');
    for (const g of geheim) assert.ok(!json.includes(JSON.stringify(g).slice(1, -1)), 'kein Lösungstext');
  }
  assert.equal(z2.body.karte.sql, fx[1].sql, 'das (absichtlich fehlerhafte) Karten-SQL wird gezeigt');
  assert.equal(z2.body.karte.datenbank, 'fundbuero');

  const a = await s.post(W + '/karten/W-A9-02/aufdecken');
  assert.equal(a.status, 200);
  assert.equal(a.body.loesung, fx[1].loesung);
  assert.equal(a.body.loesungSql, fx[1].loesungSql);
  assert.deepEqual(a.body.falle, ['P5']);

  const b = await s.post(W + '/karten/W-A9-02/bewerten', { ergebnis: 'gewusst' });
  assert.equal(b.status, 200);
  assert.equal(b.body.fach, 2);
  const st = (await s.get(K17 + '/stand')).body;
  assert.equal(st.punkte.gesamt, 0, 'Warm-up gibt keine Punkte');
  assert.equal(u.db.prepare('SELECT COUNT(*) AS n FROM leitner').get().n, 1);
});

test('Übersicht: Akten mit Anzahl/fällig, Kategorien; Filter Akte und Kategorie', async () => {
  const { s } = await start();
  const r = await s.get(W);
  assert.equal(r.status, 200);
  assert.deepEqual(
    r.body.akten.map((a) => [a.nr, a.anzahl, a.faellig]),
    [[9, 2, 2]]
  );
  assert.deepEqual(
    r.body.kategorien.map((k) => k.kategorie),
    ['Relationales Modell', 'SQL eine Tabelle']
  );
  const f = await s.get(W + '?kategorie=' + encodeURIComponent('SQL eine Tabelle'));
  assert.equal(f.body.statistik.gesamt, 1);
  const z = await s.post(W + '/ziehen', { kategorie: 'SQL eine Tabelle' });
  assert.equal(z.body.karte.id, 'W-A9-02');
  const leer = await s.post(W + '/ziehen', { akte: 3 });
  assert.equal(leer.body.karte, null);
  assert.equal(leer.body.grund, 'keine_karten');
  assert.equal((await s.post(W + '/ziehen', { kategorie: 'Gibt es nicht' })).status, 400);
  assert.equal((await s.post(W + '/ziehen', { akte: 'x' })).status, 400);
  assert.equal((await s.get(W + '?akte=abc')).status, 400);
});

test('Karten nicht freigeschalteter Akten: Schüler 404, Lehrkraft sieht alle', async () => {
  const { u, s } = await start();
  assert.equal((await s.post(W + '/karten/W-A1-01/aufdecken')).status, 404);
  assert.equal((await s.post(W + '/karten/W-A1-01/bewerten', { ergebnis: 'gewusst' })).status, 404);
  assert.equal((await s.post(W + '/karten/W-A9-99/aufdecken')).status, 404);
  const l = await H.client(u, H.LEHRKRAFT);
  const ue = (await l.get(W)).body;
  assert.deepEqual(ue.akten.map((a) => a.nr), [1, 9]);
  assert.equal((await l.post(W + '/karten/W-A1-01/aufdecken')).status, 200);
});

test('bewerten: ungültige Selbsteinschätzung → 400', async () => {
  const { s } = await start();
  assert.equal((await s.post(W + '/karten/W-A9-01/bewerten', { ergebnis: 'super' })).status, 400);
  assert.equal((await s.post(W + '/karten/W-A9-01/bewerten', {})).status, 400);
});

test('Rechte: ohne Sitzung 401, fremder Kurs 403, gesperrter Kurs (Schüler 403, Lehrkraft nur lesend), CSRF 403', async () => {
  const { u, s } = await start();
  assert.equal((await request(u.app).get(W)).status, 401);
  assert.equal((await request(u.app).post(W + '/ziehen').set('Origin', u.konfig.plattformUrl).send({})).status, 401);
  const fremd = await H.client(u, H.FREMD);
  assert.equal((await fremd.get(W)).status, 403);
  assert.equal((await fremd.post(W + '/ziehen', {})).status, 403);
  assert.equal((await s.get(K18 + '/warmup')).status, 403);
  assert.equal((await request(u.app).post(W + '/ziehen').set('Cookie', s.cookie).send({})).status, 403, 'CSRF');

  const l = await H.client(u, H.LEHRKRAFT);
  u.db.prepare("UPDATE kurse SET aktiv = 0 WHERE kurs_id = 'k:17'").run();
  assert.equal((await s.get(W)).status, 403);
  assert.equal((await s.post(W + '/ziehen', {})).status, 403);
  assert.equal((await l.get(W)).status, 200);
  assert.equal((await l.post(W + '/ziehen', {})).status, 200);
  assert.equal((await l.post(W + '/karten/W-A9-01/aufdecken')).status, 200);
  assert.equal((await l.post(W + '/karten/W-A9-01/bewerten', { ergebnis: 'gewusst' })).status, 403);
});

test('ohne warmupKarten gibt es keine Warm-up-Routen (404)', async () => {
  const u = H.umgebung();
  const s = await H.client(u, H.SCHUELERIN);
  assert.equal((await s.get(W)).status, 404);
});
