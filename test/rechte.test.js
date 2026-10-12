'use strict';
// Rechte der Lern-API (Plan Phase 3 Task 5, Review Focus 1 und 2): Sitzung, Mitgliedschaft, gesperrter Kurs,
// Freischaltung der Akte, Niveau gA, Rollen Schüler/Lehrkraft/Superadmin; keine Lösungsdaten vor dem Lösen.
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const H = require('./hilfen_lernen');

const { K17, K18 } = H;
const A = (kurs, id) => `${kurs}/aufgaben/${id}`;

async function start() {
  const u = H.umgebung();
  const s = await H.client(u, H.SCHUELERIN);
  const fremd = await H.client(u, H.FREMD);
  const l = await H.client(u, H.LEHRKRAFT);
  const admin = await H.client(u, H.SUPERADMIN);
  H.einstellen(u.db, 'k:17', { akten: [9], niveau: 'eA' });
  H.einstellen(u.db, 'k:18', { akten: [9], niveau: 'eA' });
  return { u, s, fremd, l, admin };
}

const POSTS = [
  ['pruefen', { antwort: ['d'] }],
  ['tipp', {}],
  ['loesung-zeigen', {}]
];

test('ohne Sitzung: 401 für alle Endpunkte', async () => {
  const { u } = await start();
  for (const p of [K17 + '/stand', K17 + '/ermittlungen/A9-E1', A(K17, 'A9-E1-01')]) {
    assert.equal((await request(u.app).get(p)).status, 401, p);
  }
  for (const [weg, body] of [...POSTS, ['kernpunkte', { haken: 1 }]]) {
    const r = await request(u.app).post(A(K17, 'A9-E1-01') + '/' + weg).set('Origin', u.konfig.plattformUrl).send(body);
    assert.equal(r.status, 401, weg);
  }
});

test('ungültige Kurs-ID → 400', async () => {
  const { s } = await start();
  assert.equal((await s.get('/api/kurse/17/stand')).status, 400);
  assert.equal((await s.get('/api/kurse/' + encodeURIComponent('k:x') + '/stand')).status, 400);
});

test('fremder Kurs: Schüler kommt weder an Stand noch an Aufgaben noch an POSTs (IDs raten)', async () => {
  const { u, s, fremd } = await start();
  await fremd.post(A(K18, 'A9-E1-01') + '/pruefen', { antwort: ['d'] });
  assert.equal((await s.get(K18 + '/stand')).status, 403);
  assert.equal((await s.get(A(K18, 'A9-E1-01'))).status, 403);
  for (const [weg, body] of POSTS) assert.equal((await s.post(A(K18, 'A9-E1-01') + '/' + weg, body)).status, 403, weg);
  // unbekannter Kurs: gleiche Antwort wie fremder Kurs
  assert.equal((await s.get('/api/kurse/' + encodeURIComponent('k:999') + '/stand')).status, 403);
  // Lernstand im eigenen Kurs enthält nichts aus dem fremden Kurs
  const st = (await s.get(K17 + '/stand')).body;
  assert.equal(st.punkte.gesamt, 0);
  assert.equal(u.db.prepare("SELECT COUNT(*) AS n FROM fortschritt WHERE sub = 's:1042'").get().n, 0);
  // Lehrkraft von k:17 kommt nicht in k:18
  const { l } = await start();
  assert.equal((await l.get(K18 + '/stand')).status, 403);
});

test('gesperrter Kurs: Schüler kein Zugriff, Lehrkraft nur lesend', async () => {
  const { u, s, l, admin } = await start();
  u.db.prepare("UPDATE kurse SET aktiv = 0 WHERE kurs_id = 'k:17'").run();
  assert.equal((await s.get(K17 + '/stand')).status, 403);
  assert.equal((await s.get(A(K17, 'A9-E1-01'))).status, 403);
  for (const [weg, body] of POSTS) assert.equal((await s.post(A(K17, 'A9-E1-01') + '/' + weg, body)).status, 403, weg);

  const st = await l.get(K17 + '/stand');
  assert.equal(st.status, 200);
  assert.equal(st.body.kurs.nurLesen, true);
  assert.equal((await l.get(A(K17, 'A9-E1-01'))).status, 200);
  for (const [weg, body] of POSTS) assert.equal((await l.post(A(K17, 'A9-E1-01') + '/' + weg, body)).status, 403, weg);
  assert.equal((await l.post(A(K17, 'A9-E1-11') + '/kernpunkte', { haken: 1 })).status, 403);
  for (const [weg, body] of POSTS) assert.equal((await admin.post(A(K17, 'A9-E1-01') + '/' + weg, body)).status, 403, weg);
});

test('nicht freigeschaltete Akte: Schüler 403 und im Stand im Nebel; Lehrkraft und Superadmin sehen alle', async () => {
  const { u, s, l, admin } = await start();
  H.einstellen(u.db, 'k:17', { akten: [1] });
  assert.equal((await s.get(A(K17, 'A9-E1-01'))).status, 403);
  assert.equal((await s.get(K17 + '/ermittlungen/A9-E1')).status, 403);
  for (const [weg, body] of POSTS) assert.equal((await s.post(A(K17, 'A9-E1-01') + '/' + weg, body)).status, 403, weg);
  const st = (await s.get(K17 + '/stand')).body;
  const a9 = st.akten.find((a) => a.nr === 9);
  assert.equal(a9.frei, false);
  assert.deepEqual(a9.ermittlungen, []);

  assert.equal((await l.get(A(K17, 'A9-E1-01'))).status, 200);
  assert.equal((await l.post(A(K17, 'A9-E1-01') + '/pruefen', { antwort: ['d'] })).status, 200);
  const stl = (await l.get(K17 + '/stand')).body;
  assert.equal(stl.akten.find((a) => a.nr === 9).frei, true);
  assert.equal(stl.akten.find((a) => a.nr === 9).freigeschaltet, false);
  assert.equal((await admin.get(A(K17, 'A9-E1-01'))).status, 200);
});

test('Niveau gA blendet eA-Ermittlungen und eA-Aufgaben aus (404) – für alle Rollen', async () => {
  const { u, s, l } = await start();
  H.einstellen(u.db, 'k:17', { niveau: 'gA' });
  for (const c of [s, l]) {
    assert.equal((await c.get(A(K17, 'A9-E2-01'))).status, 404);
    assert.equal((await c.get(A(K17, 'A9-E2-02'))).status, 404, 'Aufgabe einer eA-Ermittlung');
    assert.equal((await c.get(K17 + '/ermittlungen/A9-E2')).status, 404);
    assert.equal((await c.post(A(K17, 'A9-E2-01') + '/pruefen', { antwort: 'SELECT 1' })).status, 404);
  }
  H.einstellen(u.db, 'k:17', { niveau: 'eA' });
  assert.equal((await s.get(A(K17, 'A9-E2-01'))).status, 200);
});

test('Verhör-Aufgaben und unbekannte Aufgaben sind über die Lern-API nicht abrufbar (404)', async () => {
  const { s, l } = await start();
  for (const c of [s, l]) {
    assert.equal((await c.get(A(K17, 'A9-V-01'))).status, 404);
    assert.equal((await c.post(A(K17, 'A9-V-01') + '/pruefen', { antwort: ['a'] })).status, 404);
    assert.equal((await c.post(A(K17, 'A9-V-01') + '/loesung-zeigen')).status, 404);
    assert.equal((await c.get(A(K17, 'A9-E1-99'))).status, 404);
  }
});

test('Superadmin: jeder bestehende Kurs (ohne Mitgliedschaft), Stand mit allen Akten', async () => {
  const { admin } = await start();
  const r = await admin.get(K18 + '/stand');
  assert.equal(r.status, 200);
  assert.equal(r.body.kurs.rolle, 'lehrkraft');
  assert.equal((await admin.get('/api/kurse/' + encodeURIComponent('k:999') + '/stand')).status, 403);
});

test('CSRF: POST ohne eigene Origin → 403', async () => {
  const { u, s } = await start();
  const r = await request(u.app).post(A(K17, 'A9-E1-01') + '/pruefen').set('Cookie', s.cookie).send({ antwort: ['d'] });
  assert.equal(r.status, 403);
});

/* ---------------------------------------------------------------- Review Focus 2: keine Lösungsdaten */

/** Geheime Texte einer Aufgabe (Lösung, Erklärung, Tipps, Kernpunkte, Varianten, Quellabfragen), ab 6 Zeichen. */
function geheimnisse(a) {
  const out = new Set();
  const sammle = (w) => {
    if (typeof w === 'string') {
      if (w.trim().length >= 6) out.add(w);
    } else if (Array.isArray(w)) w.forEach(sammle);
    else if (w && typeof w === 'object') Object.values(w).forEach(sammle);
  };
  sammle(a.loesung);
  sammle(a.erklaerung);
  sammle(a.tipps);
  for (const ia of [].concat(a.interaktion)) {
    sammle(ia.kernpunkte);
    sammle(ia.varianten);
    sammle(ia.sortierung);
  }
  for (const b of a.inhalt || []) if (b.quelle) sammle(b.quelle.sql);
  return [...out];
}

/** Texte, die auch sichtbar im Inhalt stehen dürfen (z. B. Abfrage im Aufgabentext), sind keine Geheimnisse. */
function sichtbar(a) {
  return JSON.stringify({ inhalt: (a.inhalt || []).map((b) => ({ ...b, quelle: undefined })), interaktion: [].concat(a.interaktion).map((ia) => ({ ...ia, kernpunkte: undefined, varianten: undefined, sortierung: undefined })) });
}

test('GET aufgaben/:id liefert vor dem Lösen keine Lösungsdaten (alle Aufgaben der Beispielakte)', async () => {
  const { u, s } = await start();
  const daten = H.beispiel();
  let geprueft = 0;
  for (const a of daten.aufgaben) {
    if (/-V-/.test(a.id)) continue;
    const r = await s.get(A(K17, a.id));
    assert.equal(r.status, 200, a.id);
    const json = JSON.stringify(r.body);
    const offen = sichtbar(a);
    for (const g of geheimnisse(a)) {
      if (offen.includes(JSON.stringify(g).slice(1, -1))) continue;
      assert.ok(!json.includes(JSON.stringify(g).slice(1, -1)), `${a.id} verrät „${g.slice(0, 40)}“`);
    }
    for (const k of ['loesung', 'erklaerung', 'kernpunkte', 'varianten', 'sortierung', 'quelleSql', 'quelle']) {
      assert.ok(!json.includes(`"${k}":`), `${a.id}: Feld ${k}`);
    }
    geprueft++;
  }
  assert.ok(geprueft >= 14);
  // Ermittlungs-Ansicht und Stand ebenso
  for (const p of [K17 + '/ermittlungen/A9-E1', K17 + '/stand']) {
    const json = JSON.stringify((await s.get(p)).body);
    for (const k of ['loesung', 'erklaerung', 'kernpunkte', 'tipps']) assert.ok(!json.includes(`"${k}":`), `${p}: ${k}`);
  }
  assert.ok(u);
});

test('Tipps: nur abgerufene; falsche Antwort (sql/Diagnose) ohne Musterlösung; nach dem Lösen Erklärung und SQL', async () => {
  const { s } = await start();
  let r = await s.post(A(K17, 'A9-E1-02') + '/tipp');
  assert.deepEqual(r.body.zustand.tipps, ['„Mindestens 100“ heißt: 100 gehört dazu.']);
  r = await s.get(A(K17, 'A9-E1-02'));
  assert.ok(!JSON.stringify(r.body).includes('ORDER BY … DESC'), 'zweiter Tipp nicht abgerufen');
  r = await s.post(A(K17, 'A9-E1-02') + '/pruefen', { antwort: 'SELECT Bezeichnung FROM Fundsache' });
  const json = JSON.stringify(r.body);
  assert.ok(!json.includes("Kategorie = 'Wertsachen'"));
  assert.ok(!json.includes('"loesung"'));
  r = await s.post(A(K17, 'A9-E1-02') + '/pruefen', { antwort: "SELECT Bezeichnung, Wert FROM Fundsache WHERE Kategorie = 'Wertsachen' AND Wert >= 100 ORDER BY Wert DESC" });
  assert.equal(r.body.ok, true);
  assert.match(r.body.loesung.loesung.sql, /Wert >= 100/);
  assert.ok(r.body.loesung.erklaerung.length > 0);
  assert.equal(r.body.zustand.tipps.length, 2, 'nach dem Lösen alle Tipps');
});
