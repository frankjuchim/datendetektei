'use strict';
// Erklärvideos als Link-Knöpfe (Spec §13, Plan Phase 7 Task 11): seed/videos.json (Validator, Abgleich mit
// materialien/Videos), nur YouTube-Links, Anzeige an Ermittlung (passende DS), Themenseite und Lehrkraft-Reiter
// Materialien – nur mit url. Rechte (Ermittlung nur mit Zugang, /api/material-Videos nur angemeldet, gA ohne eA-Video),
// CSP unverändert, Links nur als <a href> mit rel="noopener noreferrer", kein Embed.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const request = require('supertest');
const H = require('./hilfen_lernen');
const { youtubeUrl, pruefeVideos, ladeVideos, erzeugeVideos, STANDARD_DATEI } = require('../src/services/videos');

const WURZEL = path.join(__dirname, '..');
const VIDEO_ORDNER = path.join(WURZEL, 'materialien', 'Videos');
const ID1 = 'dQw4w9WgXcQ';
const ID3 = 'abcDEF12345';
const ID5 = 'Z_y-x0987ab';

/** Testdaten: Video 0, 1, 3 und 5 (eA) mit Link, Video 2 ohne. */
function daten() {
  return {
    version: 1,
    videos: [
      { nr: 0, titel: 'So ermittelst du', akte: 0, ds: [1], niveau: 'beide', url: `https://youtu.be/${ID3.slice(0, 10)}Q?si=abc123` },
      { nr: 1, titel: 'SQL-Grundlagen', akte: 1, ds: [1, 2], niveau: 'beide', url: `https://www.youtube.com/watch?v=${ID1}` },
      { nr: 2, titel: 'Verbund ohne JOIN', akte: 2, ds: [3, 4], niveau: 'beide', url: null },
      { nr: 3, titel: 'GROUP BY und HAVING', akte: 3, ds: [5, 6], niveau: 'beide', url: `https://www.youtube.com/watch?v=${ID3}&t=42s` },
      { nr: 5, titel: 'ER-Modelle', akte: 5, ds: [9, 10], niveau: 'eA', url: `https://youtu.be/${ID5}` }
    ]
  };
}

/* ---------- URL-Prüfung ---------- */

test('youtubeUrl: nur https://www.youtube.com/watch?v=<ID> und https://youtu.be/<ID>, Normalform ohne Tracking', () => {
  assert.equal(youtubeUrl(`https://www.youtube.com/watch?v=${ID1}`), `https://www.youtube.com/watch?v=${ID1}`);
  assert.equal(youtubeUrl(`https://www.youtube.com/watch?v=${ID1}&t=90s`), `https://www.youtube.com/watch?v=${ID1}&t=90`);
  assert.equal(youtubeUrl(`https://youtu.be/${ID1}`), `https://www.youtube.com/watch?v=${ID1}`);
  assert.equal(youtubeUrl(`https://youtu.be/${ID1}?si=Ab_c-12`), `https://www.youtube.com/watch?v=${ID1}`);
  assert.equal(youtubeUrl(`https://youtu.be/${ID1}?t=12`), `https://www.youtube.com/watch?v=${ID1}&t=12`);
  for (const falsch of [
    null,
    '',
    `http://www.youtube.com/watch?v=${ID1}`,
    `https://youtube.com/watch?v=${ID1}`,
    `https://m.youtube.com/watch?v=${ID1}`,
    `https://www.youtube.com/embed/${ID1}`,
    `https://www.youtube-nocookie.com/embed/${ID1}`,
    `https://www.youtube.com/watch?v=${ID1}&list=PL123`,
    `https://www.youtube.com/watch?v=${ID1.slice(0, 10)}`,
    `https://www.youtube.com/watch?v=${ID1}"><script>`,
    `https://www.youtube.com.example/watch?v=${ID1}`,
    `https://youtu.be/${ID1}/../x`,
    `javascript:alert(1)//https://youtu.be/${ID1}`,
    `https://www.youtube.com/@frankjuchim`,
    `https://evil.example/?u=https://youtu.be/${ID1}`
  ]) {
    assert.equal(youtubeUrl(falsch), null, String(falsch));
  }
});

/* ---------- Validator ---------- */

test('seed/videos.json: gültig, alle url null (Standard bis zum Hochladen), passend zu materialien/Videos/*/video.json', () => {
  const d = JSON.parse(fs.readFileSync(STANDARD_DATEI, 'utf8'));
  const r = pruefeVideos(d, { videoOrdner: VIDEO_ORDNER });
  assert.deepEqual(r.fehler, []);
  assert.deepEqual(r.hinweise.filter((h) => !/noch keine Video-Links/.test(h)), []);
  const quellen = fs
    .readdirSync(VIDEO_ORDNER)
    .filter((o) => fs.existsSync(path.join(VIDEO_ORDNER, o, 'video.json')))
    .map((o) => ({ ordner: o, ...JSON.parse(fs.readFileSync(path.join(VIDEO_ORDNER, o, 'video.json'), 'utf8')) }));
  assert.equal(d.videos.length, quellen.length, 'je Video-Quelle ein Eintrag');
  for (const q of quellen) {
    const v = d.videos.find((x) => x.nr === q.nr);
    assert.ok(v, `Video ${q.nr} fehlt in seed/videos.json`);
    assert.equal(v.titel, q.titel, `Titel Video ${q.nr}`);
    assert.equal(v.akte, q.akte, `Akte Video ${q.nr}`);
    assert.equal(v.ordner, q.ordner, `Ordner Video ${q.nr}`);
  }
  // Spec §13: DS-Zuordnung
  const ds = Object.fromEntries(d.videos.map((v) => [v.nr, v.ds]));
  assert.deepEqual(ds, { 0: [1], 1: [1, 2], 2: [3, 4], 3: [5, 6], 4: [7, 8], 5: [9, 10], 6: [11], 7: [13] });
  // Standard: noch keine Links → keine Knöpfe
  assert.deepEqual(erzeugeVideos(ladeVideos()).alle(), []);
});

test('pruefeVideos: Fehler bei falscher URL, doppelter nr, ungültigen DS/Akte/Niveau, unbekannten Feldern', () => {
  assert.deepEqual(pruefeVideos(daten()).fehler, []);
  const kaputt = (aendern) => {
    const d = daten();
    aendern(d);
    return pruefeVideos(d).fehler.join(' | ');
  };
  assert.match(kaputt((d) => (d.videos[1].url = `https://www.youtube.com/embed/${ID1}`)), /kein erlaubter YouTube-Link/);
  assert.match(kaputt((d) => (d.videos[1].url = 'https://vimeo.com/123')), /kein erlaubter YouTube-Link/);
  assert.match(kaputt((d) => (d.videos[1].nr = 0)), /doppelt/);
  assert.match(kaputt((d) => (d.videos[3].url = d.videos[1].url)), /url doppelt/);
  assert.match(kaputt((d) => (d.videos[1].ds = [])), /ds/);
  assert.match(kaputt((d) => (d.videos[1].ds = [14])), /ds/);
  assert.match(kaputt((d) => (d.videos[1].akte = 8)), /akte/);
  assert.match(kaputt((d) => (d.videos[1].niveau = 'alle')), /niveau/);
  assert.match(kaputt((d) => (d.videos[1].embed = true)), /unbekanntes Feld „embed“/);
  assert.match(kaputt((d) => (d.version = 2)), /version/);
  assert.match(pruefeVideos([]).fehler.join(), /erwartet/);
  // fehlerhafte Datei → keine Videos (nie ein ungeprüfter Link)
  assert.equal(erzeugeVideos({ version: 1, videos: [{ nr: 1, titel: 'x', akte: 1, ds: [1], url: 'https://evil.example/' }] }).alle().length, 0);
});

test('Validator (npm run validate) prüft seed/videos.json', () => {
  const quelle = fs.readFileSync(path.join(WURZEL, 'scripts', 'validate.js'), 'utf8');
  assert.match(quelle, /pruefeVideos/);
});

/* ---------- Dienst ---------- */

test('Dienst: nur Videos mit Link, Zuordnung über DS, gA ohne eA-Videos, Normalform', () => {
  const v = erzeugeVideos(daten());
  assert.deepEqual(v.alle().map((x) => x.nr), [0, 1, 3, 5]);
  assert.deepEqual(v.alle({ niveau: 'gA' }).map((x) => x.nr), [0, 1, 3]);
  assert.deepEqual(v.fuerDs([1]).map((x) => x.nr), [0, 1]);
  assert.deepEqual(v.fuerDs([3, 4]).map((x) => x.nr), [], 'Video 2 ohne url erscheint nicht');
  assert.deepEqual(v.fuerDs([10], { niveau: 'gA' }).map((x) => x.nr), []);
  assert.equal(v.fuerDs([5])[0].url, `https://www.youtube.com/watch?v=${ID3}&t=42`);
  assert.equal(v.fuerDs([1])[0].url, `https://www.youtube.com/watch?v=${ID3.slice(0, 10)}Q`);
});

/* ---------- Routen und Rechte ---------- */

function umgebung(videos = daten()) {
  return H.umgebung({ optionen: { videos } });
}

test('Ermittlung: Videos der passenden DS (nur mit Zugang), sonst leer', async () => {
  const u = umgebung();
  const s = await H.client(u, H.SCHUELERIN);
  H.einstellen(u.db, 'k:17', { akten: [9], niveau: 'eA' });
  const e1 = await s.get(`${H.K17}/ermittlungen/A9-E1`).expect(200);
  assert.deepEqual(e1.body.ermittlung.videos, [
    { nr: 0, titel: 'So ermittelst du', url: `https://www.youtube.com/watch?v=${ID3.slice(0, 10)}Q` },
    { nr: 1, titel: 'SQL-Grundlagen', url: `https://www.youtube.com/watch?v=${ID1}` }
  ]);
  const e2 = await s.get(`${H.K17}/ermittlungen/A9-E2`).expect(200);
  assert.deepEqual(e2.body.ermittlung.videos.map((x) => x.nr), [3]);
  // ohne Anmeldung bzw. fremder Kurs: kein Zugriff (wie bisher)
  await request(u.app).get(`${H.K17}/ermittlungen/A9-E1`).expect(401);
  const fremd = await H.client(u, H.FREMD);
  const r = await fremd.get(`${H.K17}/ermittlungen/A9-E1`);
  assert.ok([403, 404].includes(r.status), `fremder Kurs: ${r.status}`);
  // Lehrkraft des Kurses sieht die Videos ebenfalls
  const l = await H.client(u, H.LEHRKRAFT);
  assert.equal((await l.get(`${H.K17}/ermittlungen/A9-E1`).expect(200)).body.ermittlung.videos.length, 2);
});

test('Ermittlung ohne eingetragene Links: videos leer', async () => {
  const d = daten();
  for (const v of d.videos) v.url = null;
  const u = umgebung(d);
  const s = await H.client(u, H.SCHUELERIN);
  H.einstellen(u.db, 'k:17', { akten: [9], niveau: 'eA' });
  assert.deepEqual((await s.get(`${H.K17}/ermittlungen/A9-E1`).expect(200)).body.ermittlung.videos, []);
});

test('Themenseite: Videos je Akte nach DS (öffentlich, nur mit Link)', async () => {
  const u = umgebung();
  const r = await request(u.app).get('/api/themen').expect(200);
  const akte = (nr) => r.body.akten.find((a) => a.nr === nr);
  assert.deepEqual(akte(1).videos.map((v) => v.nr), [0, 1]);
  assert.deepEqual(akte(2).videos, []);
  assert.deepEqual(akte(5).videos, [{ nr: 5, titel: 'ER-Modelle', niveau: 'eA', url: `https://www.youtube.com/watch?v=${ID5}` }]);
  for (const a of r.body.akten) for (const v of a.videos) assert.deepEqual(Object.keys(v).sort(), ['niveau', 'nr', 'titel', 'url']);
});

test('GET /api/material: Videos nur angemeldet; gA-Kurs ohne eA-Video; Lehrkraft und Superadmin alle', async () => {
  const u = umgebung();
  const anonym = await request(u.app).get('/api/material').expect(200);
  assert.equal(anonym.body.videos, undefined, 'anonym keine Videos über /api/material');
  const s = await H.client(u, H.SCHUELERIN);
  H.einstellen(u.db, 'k:17', { akten: [9], niveau: 'eA' });
  assert.deepEqual((await s.get('/api/material').expect(200)).body.videos.map((v) => v.nr), [0, 1, 3, 5]);
  const ga = await H.client(u, H.FREMD);
  H.einstellen(u.db, 'k:18', { niveau: 'gA' });
  assert.deepEqual((await ga.get('/api/material').expect(200)).body.videos.map((v) => v.nr), [0, 1, 3]);
  const l = await H.client(u, H.LEHRKRAFT);
  assert.deepEqual((await l.get('/api/material?kurs=k%3A17').expect(200)).body.videos.map((v) => v.nr), [0, 1, 3, 5]);
  const a = await H.client(u, H.SUPERADMIN);
  assert.deepEqual((await a.get('/api/material').expect(200)).body.videos.map((v) => v.nr), [0, 1, 3, 5]);
});

/* ---------- CSP und Einbindung ---------- */

test('CSP unverändert: keine YouTube-Quelle, kein frame-src; Seiten ohne iframe/embed', async () => {
  const u = umgebung();
  for (const p of ['/themen', '/api/themen', '/lehrkraft']) {
    const r = await request(u.app).get(p);
    const csp = r.headers['content-security-policy'];
    assert.ok(csp, `CSP fehlt bei ${p}`);
    assert.doesNotMatch(csp, /youtube|youtu\.be|frame-src|child-src/i, p);
    assert.match(csp, /default-src 'self'/);
    assert.match(csp, /frame-ancestors 'none'/);
  }
  const dateien = [];
  const sammle = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name !== 'vendor' && e.name !== 'fonts') sammle(p);
      } else if (/\.(html|js|css)$/.test(e.name)) dateien.push(p);
    }
  };
  sammle(path.join(WURZEL, 'public'));
  for (const p of dateien) {
    const text = fs.readFileSync(p, 'utf8');
    assert.doesNotMatch(text, /<iframe|createElement\(\s*['"](?:iframe|embed|object)['"]|youtube(?:-nocookie)?\.com\/embed/i, path.relative(WURZEL, p));
  }
});

test('Video-Knöpfe nur als <a href> mit target _blank und rel="noopener noreferrer" (alle Stellen)', () => {
  const stellen = [
    'public/static/js/kern/api.js',
    'public/static/js/themen.js'
  ];
  for (const rel of stellen) {
    const text = fs.readFileSync(path.join(WURZEL, rel), 'utf8');
    assert.match(text, /video-knopf/, rel);
    assert.match(text, /\.rel = 'noopener noreferrer'/, rel);
    assert.match(text, /\.target = '_blank'/, rel);
    assert.match(text, /youtube\\\.com\\\/watch/, `${rel}: Client prüft die Normalform erneut`);
  }
  // Ermittlung und Lehrkraft-Reiter nutzen den gemeinsamen Helfer
  for (const rel of ['public/static/js/lernen/ermittlung.js', 'public/static/js/lehrkraft/material.js']) {
    assert.match(fs.readFileSync(path.join(WURZEL, rel), 'utf8'), /A\.videoKnopf\(/, rel);
  }
});
