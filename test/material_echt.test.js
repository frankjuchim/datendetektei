'use strict';
// Abnahme Phase 7 (Plan Task 11, Spec §12.4, E13): Zugriff je Stufe mit den ECHTEN Whitelists unter materialien/.
// - jede in einer verzeichnis.json gelistete Datei existiert, keine ungelisteten PDFs in den Ausgabeordnern
// - Schülerfassungen: anonym 404, als Schüler:in 200 (Lehrkraft, Superadmin ebenfalls)
// - Lehrkraft-PDFs (Loesungen_Portal, Lehrkraft_PDF): als Schüler:in 404, als Lehrkraft 200
// - Originale (docx/pptx): nur Superadmin 200, sonst 404
// - Gast-Auswahl (Gast_PDF) leer, solange Frank nichts auswählt; /gast/material/* liefert nichts
// - Schülerfassungen nie aus Lösungsquellen (Fassung, Dateiname); Lösungen nie in der Schüler-Whitelist
// HEAD-Anfragen (kein Datentransfer), je Stufe eine GET-Stichprobe mit Inhaltstyp.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const request = require('supertest');
const { testApp, meldeAn } = require('./helpers');
const { STANDARD_VERZEICHNIS, pruefeVerzeichnisse } = require('../src/services/material');

const MAT = STANDARD_VERZEICHNIS;
const SCHUELERIN = { sub: 's:1042', rolle: 'schueler', name: 'Lena K.', kurse: [{ id: 'k:17', name: 'Inf-LK 12', rolle: 'mitglied' }] };
const LEHRKRAFT = { sub: 'l:7', rolle: 'lehrkraft', name: 'Frau M.', kurse: [{ id: 'k:17', name: 'Inf-LK 12', rolle: 'lehrkraft' }] };
const SUPERADMIN = { sub: 'a:1', rolle: 'superadmin', name: 'Admin', kurse: [] };

const liesListe = (ordner) => JSON.parse(fs.readFileSync(path.join(MAT, ordner, 'verzeichnis.json'), 'utf8')).dateien;
const url = (stufe, rel) => `/material/${stufe}/` + rel.split('/').map(encodeURIComponent).join('/');

const SCHUELER = liesListe('Arbeitsblaetter_PDF');
const LOESUNGEN = liesListe('Loesungen_Portal');
const LEHRKRAFT_PDF = liesListe('Lehrkraft_PDF');
const ORIGINALE = liesListe('Originale');
const GAST = liesListe('Gast_PDF');

let t;
let c;

test.before(async () => {
  t = testApp({}, { materialVerzeichnis: MAT, videos: null });
  c = { anonym: (p) => request(t.app).head(p), anonymGet: (p) => request(t.app).get(p) };
  for (const [name, wer] of [['schueler', SCHUELERIN], ['lehrkraft', LEHRKRAFT], ['superadmin', SUPERADMIN]]) {
    const cookie = await meldeAn(t, wer);
    c[name] = (p) => request(t.app).head(p).set('Cookie', cookie);
    c[name + 'Get'] = (p) => request(t.app).get(p).set('Cookie', cookie);
  }
});

test('Whitelists vollständig: jede gelistete Datei existiert, keine ungelisteten PDFs, validate ohne Fehler/Hinweise', () => {
  assert.ok(SCHUELER.length >= 30, `Schülerfassungen: ${SCHUELER.length}`);
  assert.ok(LOESUNGEN.length >= 25 && LEHRKRAFT_PDF.length >= 10 && ORIGINALE.length >= 80);
  for (const [ordner, liste] of [['Arbeitsblaetter_PDF', SCHUELER], ['Loesungen_Portal', LOESUNGEN], ['Lehrkraft_PDF', LEHRKRAFT_PDF]]) {
    const gelistet = new Set(liste.map((e) => e.datei));
    for (const d of gelistet) assert.ok(fs.statSync(path.join(MAT, ordner, d)).isFile(), `${ordner}/${d} fehlt`);
    const vorhanden = fs.readdirSync(path.join(MAT, ordner)).filter((n) => n.endsWith('.pdf'));
    assert.deepEqual(vorhanden.filter((n) => !gelistet.has(n)), [], `${ordner}: ungelistete PDFs`);
  }
  for (const e of ORIGINALE) {
    assert.match(e.datei, /\.(docx|pptx)$/, e.datei);
    assert.ok(fs.statSync(path.join(MAT, e.datei)).isFile(), `Original ${e.datei} fehlt`);
  }
  const r = pruefeVerzeichnisse(MAT);
  assert.deepEqual(r.fehler, []);
  assert.deepEqual(r.hinweise, []);
});

test('Schülerfassungen sind nie Lösungen; Lösungen und Klausuren nie in der Schüler-Whitelist', () => {
  for (const e of SCHUELER) {
    assert.ok(['schueler', 'handout'].includes(e.fassung), `${e.datei}: fassung ${e.fassung}`);
    assert.doesNotMatch(e.datei, /Loesung|LSG|Erwartungshorizont|Klausur|Lehrkraft|Lehrerhinweise/i, e.datei);
    assert.ok(!['klausur', 'lehrerhinweise', 'gesamt', 'video'].includes(e.art), `${e.datei}: art ${e.art}`);
    if (e.art === 'generalprobe') assert.fail(`${e.datei}: Generalprobe ohne Freigabe in den Schülerfassungen`);
  }
  for (const e of [...LOESUNGEN, ...LEHRKRAFT_PDF]) assert.ok(['loesung', 'lehrkraft'].includes(e.fassung), `${e.datei}: fassung ${e.fassung}`);
  // Präsentationen: Handout bei den Schülern, Fassung mit Notizen nur Lehrkraft
  const handouts = SCHUELER.filter((e) => e.art === 'handout');
  assert.ok(handouts.length >= 7, `Handouts: ${handouts.length}`);
  for (const h of handouts) assert.equal(h.fassung, 'handout');
  assert.ok(!SCHUELER.some((e) => e.art === 'praesentation'), 'Präsentation mit Notizen nicht bei den Schülern');
  for (const h of handouts) assert.match(h.datei, /_Handout\.pdf$/);
});

test('Gast-Auswahl (E13, Auswahl Frank): nur die gelisteten PDFs öffentlich, keine Lösungen', async () => {
  assert.equal(GAST.length, 7);
  const r = await request(t.app).get('/api/material').expect(200);
  assert.deepEqual(Object.keys(r.body.stufen), ['gast']);
  assert.deepEqual(r.body.stufen.gast.map((e) => e.datei).sort(), GAST.map((e) => e.datei).sort());
  for (const e of r.body.stufen.gast) {
    assert.doesNotMatch(e.datei, /Loesung|LSG|Erwartungshorizont|Klausur/);
    await request(t.app).get(e.url).expect(200);
  }
  const gelistet = new Set(GAST.map((e) => e.datei));
  const s = SCHUELER.find((e) => !gelistet.has(e.datei));
  await request(t.app).get('/gast/material/' + encodeURIComponent(s.datei)).expect(404);
  await request(t.app).get('/gast/material/Arbeitsblaetter_PDF/' + encodeURIComponent(s.datei)).expect(404);
});

test('Schülerfassungen: anonym 404, Schüler:in, Lehrkraft und Superadmin 200', async () => {
  for (const e of SCHUELER) {
    const p = url('schueler', `Arbeitsblaetter_PDF/${e.datei}`);
    assert.equal((await c.anonym(p)).status, 404, `anonym ${e.datei}`);
    assert.equal((await c.schueler(p)).status, 200, `Schüler:in ${e.datei}`);
  }
  const p = url('schueler', `Arbeitsblaetter_PDF/${SCHUELER[0].datei}`);
  assert.equal((await c.lehrkraft(p)).status, 200);
  assert.equal((await c.superadmin(p)).status, 200);
  const g = await c.schuelerGet(p).expect(200);
  assert.equal(g.headers['content-type'], 'application/pdf');
  assert.equal(g.headers['cache-control'], 'private, no-cache');
  assert.equal(g.body.subarray(0, 5).toString(), '%PDF-');
  // gleiche Datei unter der Lehrkraft-Stufe gibt es nicht
  assert.equal((await c.lehrkraft(url('lehrkraft', `Arbeitsblaetter_PDF/${SCHUELER[0].datei}`))).status, 404);
});

test('Lehrkraft-PDFs (Lösungen, Lehrerhinweise, Prüfungen, Video-Folien): anonym/Schüler:in 404, Lehrkraft und Superadmin 200', async () => {
  for (const [ordner, liste] of [['Loesungen_Portal', LOESUNGEN], ['Lehrkraft_PDF', LEHRKRAFT_PDF]]) {
    for (const e of liste) {
      const p = url('lehrkraft', `${ordner}/${e.datei}`);
      assert.equal((await c.anonym(p)).status, 404, `anonym ${e.datei}`);
      assert.equal((await c.schueler(p)).status, 404, `Schüler:in ${e.datei}`);
      assert.equal((await c.lehrkraft(p)).status, 200, `Lehrkraft ${e.datei}`);
      // Schüler:in auch nicht über die Schüler-Stufe
      assert.equal((await c.schueler(url('schueler', `${ordner}/${e.datei}`))).status, 404, `Schüler-Stufe ${e.datei}`);
    }
  }
  const p = url('lehrkraft', `Loesungen_Portal/${LOESUNGEN[0].datei}`);
  assert.equal((await c.superadmin(p)).status, 200);
  const g = await c.lehrkraftGet(p).expect(200);
  assert.equal(g.headers['cache-control'], 'private, no-store');
});

test('Originale (docx/pptx): nur Superadmin 200, Lehrkraft/Schüler:in/anonym 404', async () => {
  for (const e of ORIGINALE) {
    const p = url('original', e.datei);
    assert.equal((await c.superadmin(p)).status, 200, `Superadmin ${e.datei}`);
    assert.equal((await c.lehrkraft(p)).status, 404, `Lehrkraft ${e.datei}`);
  }
  const p = url('original', ORIGINALE[0].datei);
  assert.equal((await c.schueler(p)).status, 404);
  assert.equal((await c.anonym(p)).status, 404);
  const g = await c.superadminGet(p).expect(200);
  assert.match(g.headers['content-disposition'], /^attachment;/);
});

test('GET /api/material mit echten Whitelists: Stufen je Rolle', async () => {
  const s = (await c.schuelerGet('/api/material').expect(200)).body;
  assert.deepEqual(Object.keys(s.stufen).sort(), ['gast', 'schueler']);
  assert.equal(s.stufen.schueler.length, SCHUELER.length);
  const l = (await c.lehrkraftGet('/api/material?kurs=k%3A17').expect(200)).body;
  assert.deepEqual(Object.keys(l.stufen).sort(), ['gast', 'lehrkraft', 'schueler']);
  assert.equal(l.stufen.lehrkraft.length, LOESUNGEN.length + LEHRKRAFT_PDF.length);
  const a = (await c.superadminGet('/api/material').expect(200)).body;
  assert.equal(a.stufen.original.length, ORIGINALE.length);
  assert.ok(a.zips.length >= 8, 'ZIP je Akte, Gesamt und Kür');
});
