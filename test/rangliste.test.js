'use strict';
// Scoreboard: Rangliste des eigenen Kurses für Schüler:innen (Vertrag §4, Kurseinstellung scoreboard).
// GET /api/kurse/:kurs/rangliste – Top 10 + eigener Platz, nur Anzeigenamen, ohne Lehrkräfte, ohne sub.
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const H = require('./hilfen_lernen');

const { K17, K18 } = H;
const RL = (k) => k + '/rangliste';

async function start({ scoreboard = true, extra = 14 } = {}) {
  const u = H.umgebung();
  const s = await H.client(u, H.SCHUELERIN);
  const s2 = await H.client(u, H.SCHUELER2);
  const fremd = await H.client(u, H.FREMD);
  const l = await H.client(u, H.LEHRKRAFT);
  const admin = await H.client(u, H.SUPERADMIN);
  H.einstellen(u.db, 'k:17', { akten: [9], niveau: 'eA', scoreboard });
  H.einstellen(u.db, 'k:18', { akten: [9], niveau: 'eA', scoreboard: true });
  const konto = u.db.prepare("INSERT INTO konten (sub, name, rolle, zuletzt) VALUES (?, ?, 'schueler', '2026-10-13T08:00:00Z')");
  const mitglied = u.db.prepare("INSERT INTO mitgliedschaften (sub, kurs_id, rolle) VALUES (?, ?, 'mitglied')");
  const punkte = u.db.prepare("INSERT INTO training (sub, kurs_id, tag, anzahl, punkte) VALUES (?, ?, '2026-10-13', 1, ?)");
  // 14 weitere Schüler:innen mit verschiedenen Punkten (200, 190, …) – Lena und Mika (0 Punkte) liegen dahinter
  for (let i = 0; i < extra; i++) {
    konto.run(`s:${3000 + i}`, `Kim ${String.fromCharCode(65 + i)}.`);
    mitglied.run(`s:${3000 + i}`, 'k:17');
    punkte.run(`s:${3000 + i}`, 'k:17', 200 - 10 * i);
  }
  // Lehrkraft mit vielen Punkten – erscheint nie in der Rangliste
  punkte.run('l:7', 'k:17', 5000);
  // Schüler im fremden Kurs mit Punkten – erscheint nie
  punkte.run('s:2001', 'k:18', 999);
  return { u, s, s2, fremd, l, admin };
}

test('Rangliste: Top 10 und zusätzlich der eigene Platz, nur Anzeigename/Rang/Punkte, keine sub', async () => {
  const { s } = await start();
  const r = await s.get(RL(K17));
  assert.equal(r.status, 200);
  assert.equal(r.headers['cache-control'], 'no-store');
  const b = r.body;
  assert.equal(b.kurs.name, 'Inf-LK 12');
  assert.equal(b.aktiv, true);
  assert.equal(b.teilnehmende, 16);
  assert.equal(b.rangliste.length, 10);
  assert.deepEqual(
    b.rangliste.map((z) => z.platz),
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  );
  assert.equal(b.rangliste[0].name, 'Kim A.');
  assert.equal(b.rangliste[0].punkte, 200);
  for (const z of b.rangliste) assert.deepEqual(Object.keys(z).sort(), ['name', 'platz', 'punkte', 'rang']);
  assert.equal(typeof b.rangliste[0].rang, 'string');
  // eigener Platz außerhalb der Top 10: Gleichstand mit Mika → Platz 15
  assert.deepEqual(b.eigene, { platz: 15, name: 'Lena K.', rang: b.eigene.rang, punkte: 0, ich: true });
  const text = JSON.stringify(b);
  for (const x of ['s:1042', 's:1043', 's:3000', 'l:7', 'a:1', 'k:17', 'Frau M.', 'Noa T.', '5000', '999']) assert.ok(!text.includes(x), x);
});

test('Rangliste: eigene Zeile in den Top 10 ist markiert, dann kein Extra-Platz', async () => {
  const { u, s } = await start();
  u.db.prepare("INSERT INTO training (sub, kurs_id, tag, anzahl, punkte) VALUES ('s:1042', 'k:17', '2026-10-13', 1, 195)").run();
  const b = (await s.get(RL(K17))).body;
  assert.equal(b.eigene, null);
  const ich = b.rangliste.filter((z) => z.ich);
  assert.equal(ich.length, 1);
  assert.deepEqual(ich[0], { platz: 2, name: 'Lena K.', rang: ich[0].rang, punkte: 195, ich: true });
  assert.equal(b.rangliste.length, 10);
});

test('Rangliste: Gleichstand → gleicher Platz (wie Board), kleiner Kurs ohne Lücke', async () => {
  const { u, s, s2 } = await start({ extra: 2 });
  u.db.prepare("INSERT INTO training (sub, kurs_id, tag, anzahl, punkte) VALUES ('s:1043', 'k:17', '2026-10-13', 1, 190)").run();
  const b = (await s.get(RL(K17))).body;
  assert.deepEqual(
    b.rangliste.map((z) => [z.platz, z.name, z.punkte]),
    [
      [1, 'Kim A.', 200],
      [2, 'Kim B.', 190],
      [2, 'Mika R.', 190],
      [4, 'Lena K.', 0]
    ]
  );
  assert.equal(b.eigene, null);
  assert.equal(b.rangliste[3].ich, true);
  const b2 = (await s2.get(RL(K17))).body;
  assert.equal(b2.rangliste.find((z) => z.ich).name, 'Mika R.');
});

test('Rangliste: Schalter aus → Schüler 404; Lehrkraft und Superadmin sehen die Vorschau (aktiv: false)', async () => {
  const { s, l, admin } = await start({ scoreboard: false });
  const r = await s.get(RL(K17));
  assert.equal(r.status, 404);
  assert.equal(r.body.error, 'Nicht gefunden.');
  for (const c of [l, admin]) {
    const v = await c.get(RL(K17));
    assert.equal(v.status, 200);
    assert.equal(v.body.aktiv, false);
    assert.equal(v.body.eigene, null);
    assert.ok(v.body.rangliste.every((z) => !z.ich));
    assert.ok(!JSON.stringify(v.body).includes('Frau M.'));
  }
});

test('Rangliste: Rechte – anonym 401, ungültige ID 400, fremder/unbekannter Kurs 403, gesperrter Kurs', async () => {
  const { u, s, fremd, l, admin } = await start();
  assert.equal((await request(u.app).get(RL(K17))).status, 401);
  assert.equal((await s.get('/api/kurse/17/rangliste')).status, 400);
  assert.equal((await fremd.get(RL(K17))).status, 403);
  assert.equal((await s.get(RL(K18))).status, 403);
  assert.equal((await l.get(RL(K18))).status, 403);
  assert.equal((await s.get(RL('/api/kurse/' + encodeURIComponent('k:999')))).status, 403);
  assert.equal((await admin.get(RL(K18))).status, 200);
  // fremder Kurs zeigt nur die eigenen Mitglieder
  const f = (await fremd.get(RL(K18))).body;
  assert.deepEqual(
    f.rangliste.map((z) => z.name),
    ['Noa T.']
  );
  // gesperrter Kurs: Schüler 403, Lehrkraft/Superadmin lesen
  u.db.prepare("UPDATE kurse SET aktiv = 0 WHERE kurs_id = 'k:17'").run();
  assert.equal((await s.get(RL(K17))).status, 403);
  assert.equal((await l.get(RL(K17))).status, 200);
  assert.equal((await admin.get(RL(K17))).status, 200);
});

test('Stand: kurs.scoreboard zeigt der Oberfläche, ob die Rangliste sichtbar ist', async () => {
  const { u, s } = await start({ scoreboard: false });
  assert.equal((await s.get(K17 + '/stand')).body.kurs.scoreboard, false);
  H.einstellen(u.db, 'k:17', { scoreboard: true });
  assert.equal((await s.get(K17 + '/stand')).body.kurs.scoreboard, true);
});

/* ---------- Standard eingeschaltet für neue Kurse (Entscheidung Frank, 0.8.2) ---------- */

const { oeffneDb } = require('../src/db');
const { upsertAusToken, aendereKurs } = require('../src/kern/konten');
const { leseEinstellungen } = require('../src/services/stand');

const einst = (db, id) => leseEinstellungen(db.prepare('SELECT einstellungen FROM kurse WHERE kurs_id = ?').get(id).einstellungen);

test('Standard: neuer Kurs (SSO oder Verbund) hat die Rangliste eingeschaltet', () => {
  const db = oeffneDb(':memory:');
  upsertAusToken(db, { sub: 's:1042', rolle: 'schueler', name: 'Lena K.', kurse: [{ id: 'k:17', name: 'Inf-LK 12', rolle: 'mitglied' }] });
  aendereKurs(db, 'k:20', { name: 'Inf-GK 13' });
  assert.equal(einst(db, 'k:17').scoreboard, true);
  assert.equal(einst(db, 'k:20').scoreboard, true);
});

test('Standard: gespeichertes scoreboard false bleibt aus (auch nach erneutem Login), fehlender Schlüssel → an', () => {
  const db = oeffneDb(':memory:');
  // Kurs aus 0.8.1: beim Anlegen wurde der damalige Standard mit scoreboard: false gespeichert
  db.prepare("INSERT INTO kurse (kurs_id, name, einstellungen) VALUES ('k:17', 'Inf-LK 12', ?)").run(
    JSON.stringify({ akten: [1], niveau: 'eA', verhoer: 'auto', scoreboard: false, beamer: false })
  );
  db.prepare("INSERT INTO kurse (kurs_id, name, einstellungen) VALUES ('k:18', 'Inf-GK 12', ?)").run(JSON.stringify({ akten: [1, 2] }));
  upsertAusToken(db, {
    sub: 's:1042',
    rolle: 'schueler',
    name: 'Lena K.',
    kurse: [
      { id: 'k:17', name: 'Inf-LK 12', rolle: 'mitglied' },
      { id: 'k:18', name: 'Inf-GK 12', rolle: 'mitglied' }
    ]
  });
  aendereKurs(db, 'k:17', { name: 'Inf-LK 12a', aktiv: true });
  assert.equal(einst(db, 'k:17').scoreboard, false);
  assert.equal(einst(db, 'k:18').scoreboard, true);
});

test('/api/ich nennt je Kurs, ob die Rangliste eingeschaltet ist (für den Link in der Navigation)', async () => {
  const { s, u } = await start({ scoreboard: false });
  let ich = (await s.get('/api/ich')).body;
  assert.deepEqual(ich.kurse.map((k) => [k.id, k.scoreboard]), [['k:17', false]]);
  H.einstellen(u.db, 'k:17', { scoreboard: true });
  ich = (await s.get('/api/ich')).body;
  assert.deepEqual(ich.kurse.map((k) => [k.id, k.scoreboard]), [['k:17', true]]);
});

test('Migration 4 (Entscheidung Frank, 0.8.3): bestehende Kurse bekommen die Rangliste einmalig eingeschaltet, übrige Einstellungen bleiben', () => {
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'dd-mig4-'));
  const datei = path.join(ordner, 'db.sqlite');
  try {
    // Stand 0.8.2: Schema 3, Kurs mit gespeichertem scoreboard: false, ein Kurs mit kaputtem JSON
    let db = oeffneDb(datei);
    db.prepare("UPDATE meta SET wert = '3' WHERE schluessel = 'schema_version'").run();
    db.prepare("INSERT INTO kurse (kurs_id, name, einstellungen) VALUES ('k:17', 'Inf-LK 12', ?)").run(
      JSON.stringify({ akten: [1, 2], niveau: 'gA', verhoer: 'offen', scoreboard: false, beamer: true })
    );
    db.prepare("INSERT INTO kurse (kurs_id, name, einstellungen) VALUES ('k:18', 'Inf-GK 12', 'kaputt')").run();
    db.close();
    db = oeffneDb(datei);
    assert.deepEqual(einst(db, 'k:17'), { ...einst(db, 'k:17'), akten: [1, 2], niveau: 'gA', verhoer: 'offen', beamer: true, scoreboard: true });
    assert.equal(einst(db, 'k:18').scoreboard, true);
    // Danach wieder ausgeschaltet bleibt aus (die Migration läuft nur einmal)
    db.prepare('UPDATE kurse SET einstellungen = json_set(einstellungen, \'$.scoreboard\', json(\'false\')) WHERE kurs_id = ?').run('k:17');
    db.close();
    db = oeffneDb(datei);
    assert.equal(einst(db, 'k:17').scoreboard, false);
    db.close();
  } finally {
    fs.rmSync(ordner, { recursive: true, force: true });
  }
});
