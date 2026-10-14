'use strict';
// Seitenrouten des Lehrkraft-Bereichs (Plan Phase 6 Task 4): /lehrkraft (Reiter-Oberfläche), Urkunden-Druckseite
// /lehrkraft/urkunden?kurs=… und Beamer-Board /board/:schluessel – Rechte je Rolle, 404 bei ungültigem Board,
// keine Nutzerdaten im HTML, Bausteine der Seiten.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const request = require('supertest');
const H = require('./hilfen_lernen');

const PUBLIC = path.join(__dirname, '..', 'public');
const STATIC = path.join(PUBLIC, 'static');
const LEHRKRAFT18 = { sub: 'l:8', rolle: 'lehrkraft', name: 'Herr P.', kurse: [{ id: 'k:18', name: 'Inf-GK 12', rolle: 'lehrkraft' }] };
const URKUNDEN = '/lehrkraft/urkunden?kurs=' + encodeURIComponent('k:17');

async function start() {
  const u = H.umgebung();
  const s = await H.client(u, H.SCHUELERIN);
  const fremd = await H.client(u, H.FREMD);
  const l = await H.client(u, H.LEHRKRAFT);
  const l18 = await H.client(u, LEHRKRAFT18);
  const admin = await H.client(u, H.SUPERADMIN);
  const put = (c, kurs, body) =>
    request(u.app)
      .put(`/api/lehrkraft/kurse/${encodeURIComponent(kurs)}/einstellungen`)
      .set('Cookie', c.cookie)
      .set('Origin', u.konfig.plattformUrl)
      .send(body);
  return { u, s, fremd, l, l18, admin, put };
}

/* ---------- /lehrkraft ---------- */

test('/lehrkraft: Kopf-Navigation wie Algo Quest (Kurse · Aufgaben · Materialien · Themen · Verwaltung verborgen), Modul statt altem Skript', async () => {
  const { l } = await start();
  const r = await l.get('/lehrkraft');
  assert.equal(r.status, 200);
  assert.match(r.headers['content-type'], /text\/html/);
  const nav = /<nav class="lern-nav lk-nav" id="lk-nav"[^>]*>([\s\S]*?)<\/nav>/.exec(r.text);
  assert.ok(nav, 'Kopf-Navigation');
  const bereiche = [...nav[1].matchAll(/data-bereich="([a-z]+)"/g)].map((m) => m[1]);
  assert.deepEqual(bereiche, ['kurse', 'aufgaben', 'materialien', 'themen', 'verwaltung']);
  assert.match(nav[1], /href="#\/verwaltung" data-bereich="verwaltung" hidden/);
  assert.match(r.text, /id="lk-ansicht"/);
  assert.doesNotMatch(r.text, /id="lk-kurs"/, 'keine Kurs-Auswahl mehr (Kursliste wie Algo Quest)');
  assert.match(r.text, /<script type="module" src="\/static\/js\/lehrkraft\/seite\.js\?v=/);
  assert.doesNotMatch(r.text, /\/static\/js\/lehrkraft\.js/);
  assert.doesNotMatch(r.text, /Auswertung folgt in Phase 6/);
  // Vorschau rendert Aufgaben: Parser und Styles der Lernoberfläche und Modellierung
  for (const css of ['lernen', 'konsole', 'modellierung', 'bauplan', 'werkbank', 'live', 'lehrkraft']) {
    assert.match(r.text, new RegExp(`/static/css/${css}\\.css\\?v=`), css);
  }
  assert.match(r.text, /<script src="\/static\/js\/sql\/parser\.js\?v=[^"]+" defer><\/script>/);
});

/* ---------- Urkunden ---------- */

test('/lehrkraft/urkunden ohne Sitzung: 302 auf /sso/start mit Rücksprung', async () => {
  const { u } = await start();
  const r = await request(u.app).get(URKUNDEN);
  assert.equal(r.status, 302);
  assert.equal(r.headers.location, '/sso/start?ziel=' + encodeURIComponent(URKUNDEN));
});

test('/lehrkraft/urkunden: Schüler 403, fremde Lehrkraft 403, eigene Lehrkraft und Superadmin 200', async () => {
  const { s, fremd, l, l18, admin } = await start();
  for (const c of [s, fremd]) {
    const r = await c.get(URKUNDEN);
    assert.equal(r.status, 403);
    assert.match(r.text, /Kein Zugriff/);
  }
  const r18 = await l18.get(URKUNDEN);
  assert.equal(r18.status, 403);
  assert.match(r18.text, /Kein Zugriff/);
  for (const c of [l, admin]) {
    const r = await c.get(URKUNDEN);
    assert.equal(r.status, 200);
    assert.match(r.text, /Detektei-Lizenz/);
    assert.match(r.text, /\/static\/css\/urkunde\.css\?v=/);
    assert.match(r.text, /<script type="module" src="\/static\/js\/lehrkraft\/urkunden-seite\.js\?v=/);
    assert.equal(r.headers['cache-control'], 'no-cache');
  }
  // Superadmin auch für Kurse ohne eigene Mitgliedschaft; unbekannter Kurs → 403
  assert.equal((await admin.get('/lehrkraft/urkunden?kurs=' + encodeURIComponent('k:18'))).status, 200);
  assert.equal((await admin.get('/lehrkraft/urkunden?kurs=' + encodeURIComponent('k:999'))).status, 403);
});

test('/lehrkraft/urkunden ohne oder mit ungültiger Kurs-ID: 404', async () => {
  const { l } = await start();
  for (const p of ['/lehrkraft/urkunden', '/lehrkraft/urkunden?kurs=17', '/lehrkraft/urkunden?kurs=k:abc', '/lehrkraft/urkunden?kurs=k:17&kurs=k:18']) {
    const r = await l.get(p);
    assert.equal(r.status, 404, p);
  }
});

/* ---------- Beamer-Board ---------- */

test('/board/:schluessel: ungültig, unbekannt oder ausgeschaltet → 404-Seite', async () => {
  const { u, l, put } = await start();
  for (const p of ['/board/x', '/board/' + 'A'.repeat(32), '/board/' + 'A'.repeat(33), '/board/', '/board.html']) {
    const r = await request(u.app).get(p);
    assert.equal(r.status, 404, p);
    assert.match(r.headers['content-type'], /text\/html/);
  }
  // eingeschaltet → 200; ausgeschaltet → 404 (Schlüssel bleibt)
  const k = (await put(l, 'k:17', { beamer: true })).body.kurs.board.schluessel;
  const an = await request(u.app).get('/board/' + k);
  assert.equal(an.status, 200);
  await put(l, 'k:17', { beamer: false });
  assert.equal((await request(u.app).get('/board/' + k)).status, 404);
});

test('/board/:schluessel: öffentlich, immer dunkel, kein Referrer, nicht im Cache; neuer Schlüssel macht den alten ungültig', async () => {
  const { u, l, put } = await start();
  const k1 = (await put(l, 'k:17', { beamer: true })).body.kurs.board.schluessel;
  const r = await request(u.app).get('/board/' + k1);
  assert.equal(r.status, 200);
  assert.equal(r.headers['referrer-policy'], 'no-referrer');
  assert.equal(r.headers['cache-control'], 'no-store');
  assert.match(r.text, /<html lang="de" data-theme="dark"/);
  assert.match(r.text, /<script type="module" src="\/static\/js\/board\/board\.js\?v=/);
  assert.match(r.text, /\/static\/css\/board\.css\?v=/);
  assert.doesNotMatch(r.text, /kopfzeile\.js/, 'keine Bedienelemente, keine Anmeldung');
  assert.doesNotMatch(r.text, /Inf-LK 12|Lena/, 'keine Nutzerdaten im HTML');
  const neu = await request(u.app)
    .post(`/api/lehrkraft/kurse/${encodeURIComponent('k:17')}/board-schluessel`)
    .set('Cookie', l.cookie)
    .set('Origin', u.konfig.plattformUrl)
    .send({});
  const k2 = neu.body.kurs.board.schluessel;
  assert.notEqual(k2, k1);
  assert.equal((await request(u.app).get('/board/' + k1)).status, 404);
  assert.equal((await request(u.app).get('/board/' + k2)).status, 200);
});

test('/board/:schluessel: gesperrter Kurs → 404', async () => {
  const { u, l, put } = await start();
  const k = (await put(l, 'k:17', { beamer: true })).body.kurs.board.schluessel;
  u.db.prepare("UPDATE kurse SET aktiv = 0 WHERE kurs_id = 'k:17'").run();
  assert.equal((await request(u.app).get('/board/' + k)).status, 404);
});

test('/board: Rate-Limit je IP (429 nach vielen Aufrufen)', async () => {
  const u = H.umgebung({ konfig: { rateLimits: { board: { max: 3 } } } });
  const status = [];
  for (let i = 0; i < 5; i++) status.push((await request(u.app).get('/board/' + 'B'.repeat(32))).status);
  assert.deepEqual(status.slice(0, 3), [404, 404, 404]);
  assert.equal(status[4], 429);
});

/* ---------- Statische Regeln der neuen Bausteine ---------- */

test('Lehrkraft-, Board- und Urkunden-Module: ES-Module mit Versions-Import, nur Textknoten, keine Inline-Styles', () => {
  const dateien = [
    ...fs.readdirSync(path.join(STATIC, 'js', 'lehrkraft')).map((d) => path.join(STATIC, 'js', 'lehrkraft', d)),
    path.join(STATIC, 'js', 'board', 'board.js')
  ];
  assert.ok(dateien.length >= 8, 'Module fehlen');
  for (const datei of dateien) {
    const js = fs.readFileSync(datei, 'utf8');
    assert.doesNotMatch(js, /innerHTML|outerHTML|insertAdjacentHTML|document\.write/, datei);
    assert.doesNotMatch(js, /setAttribute\(\s*['"]style['"]/, datei);
    assert.doesNotMatch(js, /\.style\.(?!setProperty)/, datei);
    assert.doesNotMatch(js, /^import .* from /m, datei);
    assert.doesNotMatch(js, /\bsub\b\s*:/, `${datei}: keine sub`);
  }
  const board = fs.readFileSync(path.join(STATIC, 'js', 'board', 'board.js'), 'utf8');
  assert.match(board, /20000/, '20 s Aktualisierung');
  assert.match(board, /prefers-reduced-motion/);
});

test('board.css und urkunde.css: reduzierte Bewegung, Druck-Layout A4', () => {
  const board = fs.readFileSync(path.join(STATIC, 'css', 'board.css'), 'utf8');
  assert.match(board, /@media \(prefers-reduced-motion: reduce\)/);
  const urkunde = fs.readFileSync(path.join(STATIC, 'css', 'urkunde.css'), 'utf8');
  assert.match(urkunde, /@media print/);
  assert.match(urkunde, /@page\s*\{[^}]*size:\s*A4/);
  assert.match(urkunde, /break-after:\s*page/);
});
