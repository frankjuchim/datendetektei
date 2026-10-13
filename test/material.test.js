'use strict';
// Material-Downloads nach Rolle (Plan Phase 6 Task 5, Spec §7.11, §7.12, §12.4, E13).
// Fixture-Materialien unter test/fixtures/materialien (kleine Dummy-Dateien + Whitelists verzeichnis.json).
// Zugriffsmatrix je Stufe und Rolle, Pfadangriffe, nicht gelistete/fehlende Dateien 404, Gast nur Whitelist,
// Lösungs-/Klausur-PDFs in der Gast-Auswahl nur ausdrücklich (sonst übersprungen, Prüfung meldet Warnung),
// ZIP der Originale je Akte (stored + CRC32, mit unzip und in Node lesbar).

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const zlib = require('node:zlib');
const { execFileSync } = require('node:child_process');
const request = require('supertest');
const { testApp, meldeAn } = require('./helpers');
const { erzeugeMaterial, pruefeVerzeichnisse, STUFEN } = require('../src/services/material');
const { crc32, zipTeile } = require('../src/services/zip');

const FIX = path.join(__dirname, 'fixtures', 'materialien');
const WURZEL = path.join(__dirname, '..');

const SCHUELERIN = { sub: 's:1042', rolle: 'schueler', name: 'Lena K.', kurse: [{ id: 'k:17', name: 'Inf-LK 12', rolle: 'mitglied' }] };
const GA_SCHUELER = { sub: 's:2001', rolle: 'schueler', name: 'Noa T.', kurse: [{ id: 'k:18', name: 'Inf-GK 12', rolle: 'mitglied' }] };
const LEHRKRAFT = { sub: 'l:7', rolle: 'lehrkraft', name: 'Frau M.', kurse: [{ id: 'k:17', name: 'Inf-LK 12', rolle: 'lehrkraft' }] };
const SUPERADMIN = { sub: 'a:1', rolle: 'superadmin', name: 'Admin', kurse: [] };

const AB1 = 'Arbeitsblaetter_PDF/Akte1/DD_A1-AB1_Der_erste_Auftrag.pdf';
const AB5 = 'Arbeitsblaetter_PDF/Akte5/DD_A5-AB1_Bauplaene_lesen.pdf';
const LSG = 'Loesungen_Portal/Akte1/DD_A1-AB1_Der_erste_Auftrag_LSG.pdf';
const LH = 'Lehrkraft_PDF/Akte1/DD_A1_Lehrerhinweise.pdf';
const KLAUSUR = 'Lehrkraft_PDF/Akte7/DD_A7_Klausur_eA.pdf';
const DOCX = 'Akte1_Fundbuero/2_Arbeitsblaetter/DD_A1_AB1_Der_erste_Auftrag.docx';
const PPTX = 'Akte1_Fundbuero/1_Praesentation/DD_A1_Fundbüro.pptx';

/** URL einer Datei: Segmente einzeln kodiert. */
const url = (stufe, rel) => `/material/${stufe}/` + rel.split('/').map(encodeURIComponent).join('/');

function app(verzeichnis = FIX, ueberschreiben = {}) {
  return testApp(ueberschreiben, { materialVerzeichnis: verzeichnis });
}

async function clients(t) {
  const c = {};
  for (const [name, wer] of [['schueler', SCHUELERIN], ['ga', GA_SCHUELER], ['lehrkraft', LEHRKRAFT], ['superadmin', SUPERADMIN]]) {
    const cookie = await meldeAn(t, wer);
    c[name] = (p) => request(t.app).get(p).set('Cookie', cookie);
  }
  c.anonym = (p) => request(t.app).get(p);
  return c;
}

function kursNiveau(db, kursId, niveau) {
  const alt = JSON.parse(db.prepare('SELECT einstellungen FROM kurse WHERE kurs_id = ?').get(kursId).einstellungen);
  db.prepare('UPDATE kurse SET einstellungen = ? WHERE kurs_id = ?').run(JSON.stringify({ ...alt, niveau }), kursId);
}

/** Kopie der Fixture in ein Temp-Verzeichnis (für Tests, die Whitelists ändern). */
function kopie(tt) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dd-material-'));
  fs.cpSync(FIX, dir, { recursive: true });
  tt.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

/* ---------- Service ---------- */

test('Service: Stufen, Rollen und Ordner nach Spec §12.4', () => {
  assert.deepEqual(STUFEN.schueler.ordner, ['Arbeitsblaetter_PDF']);
  assert.deepEqual(STUFEN.schueler.rollen, ['schueler', 'lehrkraft', 'superadmin']);
  assert.deepEqual(STUFEN.lehrkraft.ordner, ['Loesungen_Portal', 'Lehrkraft_PDF']);
  assert.deepEqual(STUFEN.lehrkraft.rollen, ['lehrkraft', 'superadmin']);
  assert.deepEqual(STUFEN.original.rollen, ['superadmin']);
});

test('Service: nur gültige, vorhandene Whitelist-Einträge; Pfadangriffe werden beim Laden verworfen', () => {
  const log = [];
  const m = erzeugeMaterial({ verzeichnis: FIX, log: (z) => log.push(z) });
  // eintraege: gültige Einträge (ohne Existenzprüfung); liste: nur vorhandene Dateien
  assert.deepEqual(m.eintraege('schueler').map((e) => e.pfad), [AB1, AB5, 'Arbeitsblaetter_PDF/Akte1/DD_A1-AB3_Fehlt.pdf']);
  assert.deepEqual(m.liste('schueler').map((e) => e.datei), [AB1, AB5]);
  assert.deepEqual(m.eintraege('lehrkraft').map((e) => e.pfad), [LSG, LH, KLAUSUR]);
  assert.deepEqual(m.liste('original').map((e) => e.datei).sort(), [
    '00_Gesamt/DD_Gesamtuebersicht.docx',
    PPTX,
    DOCX,
    'Akte2_Raeder/2_Arbeitsblaetter/DD_A2_AB1_Der_rote_Faden.docx'
  ].sort());
  // Gast: LSG und Klausur ohne „ausdruecklich“ übersprungen, falscher Ordner übersprungen
  assert.deepEqual(m.eintraege('gast').map((e) => e.pfad), [AB1, LH]);
  for (const angriff of ['../geheim.pdf', 'Akte1/../../geheim.pdf', '.versteckt.pdf', 'verzeichnis.json']) {
    assert.ok(log.some((z) => z.includes(angriff)), `nicht gemeldet: ${angriff}`);
  }
  assert.equal(m.datei('schueler', 'Arbeitsblaetter_PDF/Akte1/DD_A1-AB3_Fehlt.pdf'), null, 'fehlende Datei');
  assert.equal(m.datei('schueler', 'Arbeitsblaetter_PDF/Akte1/DD_A1-AB2_Nicht_gelistet.pdf'), null, 'nicht gelistet');
  assert.equal(m.datei('schueler', LH), null, 'Lehrkraft-Datei über Schüler-Stufe');
  assert.equal(m.datei('lehrkraft', 'geheim.pdf'), null);
  const d = m.datei('schueler', AB1);
  assert.equal(d.root, FIX);
  assert.equal(d.rel, AB1);
});

test('Service: Einträge mit Titel, Akte, Niveau, Art; Standardwerte', () => {
  const m = erzeugeMaterial({ verzeichnis: FIX });
  const [e] = m.eintraege('schueler');
  assert.equal(e.titel, 'AB 1.1 Der erste Auftrag');
  assert.equal(e.akte, 1);
  assert.equal(e.niveau, 'beide');
  assert.equal(e.art, 'arbeitsblatt');
  const lsg = m.eintraege('lehrkraft')[0];
  assert.equal(lsg.art, 'loesung');
});

test('Service: Ordner ohne Whitelist → leere Stufe, kein Absturz', () => {
  const m = erzeugeMaterial({ verzeichnis: path.join(FIX, 'gibt-es-nicht') });
  for (const s of Object.keys(STUFEN)) assert.deepEqual(m.eintraege(s), []);
});

/* ---------- Zugriffsmatrix ---------- */

test('Zugriffsmatrix: Schüler-PDF angemeldet (alle Rollen), Lehrkraft-PDF nur Lehrkraft/Superadmin, Originale nur Superadmin', async () => {
  const t = app();
  const c = await clients(t);
  const matrix = [
    // [Pfad, anonym, schueler, lehrkraft, superadmin]
    [url('schueler', AB1), 404, 200, 200, 200],
    [url('lehrkraft', LSG), 404, 404, 200, 200],
    [url('lehrkraft', LH), 404, 404, 200, 200],
    [url('lehrkraft', KLAUSUR), 404, 404, 200, 200],
    [url('original', DOCX), 404, 404, 404, 200],
    [url('original', PPTX), 404, 404, 404, 200],
    ['/material/original-zip/1', 404, 404, 404, 200]
  ];
  for (const [p, ...soll] of matrix) {
    const ist = [];
    for (const rolle of ['anonym', 'schueler', 'lehrkraft', 'superadmin']) ist.push((await c[rolle](p)).status);
    assert.deepEqual(ist, soll, p);
  }
});

test('Downloads: Inhalt, Content-Type, Content-Disposition (ASCII), nosniff, Caching je Stufe', async () => {
  const t = app();
  const c = await clients(t);
  const ab = await c.schueler(url('schueler', AB1));
  assert.equal(ab.status, 200);
  assert.match(ab.headers['content-type'], /^application\/pdf/);
  assert.equal(ab.body.toString(), '%PDF-1.4 AB 1.1 Schuelerfassung\n');
  assert.equal(ab.headers['content-disposition'], 'inline; filename="DD_A1-AB1_Der_erste_Auftrag.pdf"');
  assert.equal(ab.headers['x-content-type-options'], 'nosniff');
  assert.match(ab.headers['cache-control'], /private/);

  const lh = await c.lehrkraft(url('lehrkraft', LH));
  assert.equal(lh.headers['cache-control'], 'private, no-store');

  const pptx = await c.superadmin(url('original', PPTX));
  assert.equal(pptx.status, 200);
  assert.match(pptx.headers['content-type'], /presentationml\.presentation/);
  assert.equal(pptx.headers['content-disposition'], 'attachment; filename="DD_A1_Fundbuero.pptx"');
  assert.equal(pptx.headers['cache-control'], 'private, no-store');
  const docx = await c.superadmin(url('original', DOCX));
  assert.match(docx.headers['content-type'], /wordprocessingml\.document/);
});

test('Nicht gelistet, fehlend, falsche Stufe, Pfadangriffe → 404 (auch für den Superadmin)', async () => {
  const t = app();
  const c = await clients(t);
  const pfade = [
    url('schueler', 'Arbeitsblaetter_PDF/Akte1/DD_A1-AB2_Nicht_gelistet.pdf'),
    url('schueler', 'Arbeitsblaetter_PDF/Akte1/DD_A1-AB3_Fehlt.pdf'),
    url('schueler', 'Arbeitsblaetter_PDF/verzeichnis.json'),
    url('schueler', 'Arbeitsblaetter_PDF/Akte1/.versteckt.pdf'),
    url('schueler', LH),
    url('lehrkraft', AB1),
    url('original', AB1),
    url('original', 'Originale/verzeichnis.json'),
    url('original', 'Akte2_Raeder/2_Arbeitsblaetter/DD_A2_AB2_Fehlt.docx'),
    '/material/schueler/geheim.pdf',
    '/material/schueler/..%2Fgeheim.pdf',
    '/material/schueler/Arbeitsblaetter_PDF/..%2F..%2Fgeheim.pdf',
    '/material/schueler/Arbeitsblaetter_PDF/Akte1/..%2F..%2Fgeheim.pdf',
    '/material/schueler/Arbeitsblaetter_PDF/Akte1/%2e%2e/%2e%2e/geheim.pdf',
    '/material/schueler/Arbeitsblaetter_PDF%2FAkte1%2FDD_A1-AB1_Der_erste_Auftrag.pdf',
    '/material/schueler/Arbeitsblaetter_PDF%5CAkte1%5CDD_A1-AB1_Der_erste_Auftrag.pdf',
    '/material/schueler/%00',
    '/material/schueler/',
    '/material/unbekannt/' + AB1,
    '/material/original/..%2F..%2Fpackage.json',
    '/material/original-zip/9',
    '/material/original-zip/x',
    '/material/original-zip/01'
  ];
  for (const p of pfade) {
    const r = await c.superadmin(p);
    assert.equal(r.status, 404, p);
    assert.ok(!/%PDF|PK-Dummy|"name"/.test(r.text || ''), `${p} verrät Inhalt`);
  }
});

test('Gast: nur die Gast-Whitelist ist öffentlich; Lösung/Klausur nur mit „ausdruecklich“', async (tt) => {
  const t = app();
  const liste = (await request(t.app).get('/api/gast/material')).body;
  assert.deepEqual(liste.dateien.map((d) => d.datei), ['Akte1/DD_A1-AB1_Der_erste_Auftrag.pdf', 'Akte1/DD_A1_Lehrerhinweise.pdf']);
  assert.equal(liste.dateien[0].url, '/gast/material/Akte1/DD_A1-AB1_Der_erste_Auftrag.pdf');
  const r = await request(t.app).get(liste.dateien[0].url);
  assert.equal(r.status, 200);
  assert.equal(r.body.toString(), '%PDF-1.4 AB 1.1 Schuelerfassung\n');
  assert.equal(r.headers['x-content-type-options'], 'nosniff');
  assert.equal((await request(t.app).get('/gast/material/Akte1/DD_A1_Lehrerhinweise.pdf')).status, 200);
  for (const p of ['Akte1/DD_A1-AB1_Der_erste_Auftrag_LSG.pdf', 'Akte7/DD_A7_Klausur_eA.pdf', 'Akte1/DD_A1-AB2_Nicht_gelistet.pdf', 'Akte1/..%2F..%2Fgeheim.pdf', '..%2Fgeheim.pdf']) {
    assert.equal((await request(t.app).get('/gast/material/' + p)).status, 404, p);
  }

  // Frank listet die Lösung ausdrücklich → ausgeliefert, aber die Prüfung warnt.
  const dir = kopie(tt);
  const datei = path.join(dir, 'Gast_PDF', 'verzeichnis.json');
  const v = JSON.parse(fs.readFileSync(datei, 'utf8'));
  v.dateien[2].ausdruecklich = true;
  fs.writeFileSync(datei, JSON.stringify(v));
  const t2 = app(dir);
  assert.equal((await request(t2.app).get('/gast/material/Akte1/DD_A1-AB1_Der_erste_Auftrag_LSG.pdf')).status, 200);
  assert.equal((await request(t2.app).get('/gast/material/Akte7/DD_A7_Klausur_eA.pdf')).status, 404);
  const p = pruefeVerzeichnisse(dir);
  assert.ok(p.hinweise.some((h) => /Gast/.test(h.text) && /DD_A1-AB1_Der_erste_Auftrag_LSG\.pdf/.test(h.text)), JSON.stringify(p.hinweise));
});

test('Gast-Whitelist erkennt Lösungs-/Klausur-PDFs auch am Dateinamen (LSG, Erwartungshorizont, Klausur)', (tt) => {
  const dir = kopie(tt);
  fs.writeFileSync(path.join(dir, 'Arbeitsblaetter_PDF', 'Akte1', 'DD_A1_Erwartungshorizont.pdf'), '%PDF-1.4 EH');
  fs.writeFileSync(
    path.join(dir, 'Gast_PDF', 'verzeichnis.json'),
    JSON.stringify({ dateien: [{ datei: 'Akte1/DD_A1_Erwartungshorizont.pdf', ordner: 'Arbeitsblaetter_PDF', titel: 'getarnt', fassung: 'schueler', art: 'arbeitsblatt' }] })
  );
  const m = erzeugeMaterial({ verzeichnis: dir });
  assert.deepEqual(m.eintraege('gast'), []);
  const p = pruefeVerzeichnisse(dir);
  assert.ok(p.hinweise.some((h) => /Erwartungshorizont/.test(h.text)));
});

/* ---------- Liste ---------- */

test('GET /api/material: je Rolle nur die erlaubten Stufen; anonym nur Gast-Auswahl; no-store', async () => {
  const t = app();
  const c = await clients(t);
  const anonym = await c.anonym('/api/material');
  assert.equal(anonym.status, 200);
  assert.equal(anonym.headers['cache-control'], 'private, no-store');
  assert.equal(anonym.body.rolle, null);
  assert.deepEqual(Object.keys(anonym.body.stufen), ['gast']);

  const s = (await c.schueler('/api/material')).body;
  assert.equal(s.rolle, 'schueler');
  assert.deepEqual(Object.keys(s.stufen), ['gast', 'schueler']);
  assert.deepEqual(s.stufen.schueler.map((e) => e.datei), [AB1, AB5]);
  assert.equal(s.stufen.schueler[0].url, url('schueler', AB1));
  assert.equal(s.zips, undefined);

  const l = (await c.lehrkraft('/api/material')).body;
  assert.deepEqual(Object.keys(l.stufen), ['gast', 'schueler', 'lehrkraft']);
  assert.deepEqual(l.stufen.lehrkraft.map((e) => e.datei), [LSG, LH, KLAUSUR]);

  const a = (await c.superadmin('/api/material')).body;
  assert.deepEqual(Object.keys(a.stufen), ['gast', 'schueler', 'lehrkraft', 'original']);
  assert.equal(a.stufen.original.length, 4);
  assert.deepEqual(a.zips.map((z) => z.akte), [0, 1, 2]);
  assert.equal(a.zips[1].url, '/material/original-zip/1');
  assert.equal(a.zips[1].anzahl, 2);
  // Jeder Eintrag: Titel, Akte, Niveau, Art, Größe, ID
  for (const e of [...a.stufen.schueler, ...a.stufen.original]) {
    for (const k of ['id', 'titel', 'akte', 'niveau', 'art', 'groesse', 'url']) assert.ok(e[k] !== undefined, `${e.datei}: ${k}`);
  }
  // Keine absoluten Pfade in der Antwort
  assert.ok(!JSON.stringify(a).includes(FIX));
});

test('GET /api/material: Schüler im gA-Kurs sieht kein eA-Material; ?kurs nur für eigene Kurse', async () => {
  const t = app();
  const c = await clients(t);
  kursNiveau(t.db, 'k:18', 'gA');
  const ga = (await c.ga('/api/material')).body;
  assert.deepEqual(ga.stufen.schueler.map((e) => e.datei), [AB1]);
  assert.equal(ga.niveau, 'gA');
  // eA-Kurs: alles
  const ea = (await c.schueler('/api/material?kurs=' + encodeURIComponent('k:17'))).body;
  assert.deepEqual(ea.stufen.schueler.map((e) => e.datei), [AB1, AB5]);
  // fremder Kurs → 403, ungültige ID → 400
  assert.equal((await c.schueler('/api/material?kurs=' + encodeURIComponent('k:18'))).status, 403);
  assert.equal((await c.schueler('/api/material?kurs=17')).status, 400);
  // Lehrkraft: eigener gA-Kurs filtert auch Lehrkraft-Material, fremder Kurs 403
  kursNiveau(t.db, 'k:17', 'gA');
  const l = (await c.lehrkraft('/api/material?kurs=' + encodeURIComponent('k:17'))).body;
  assert.deepEqual(l.stufen.lehrkraft.map((e) => e.datei), [LSG, LH]);
  assert.equal((await c.lehrkraft('/api/material?kurs=' + encodeURIComponent('k:18'))).status, 403);
  // ohne kurs: Lehrkraft sieht alles
  assert.equal((await c.lehrkraft('/api/material')).body.stufen.lehrkraft.length, 3);
  // Superadmin: jeder bestehende Kurs
  assert.equal((await c.superadmin('/api/material?kurs=' + encodeURIComponent('k:18'))).status, 200);
  // Download bleibt für angemeldete Schüler möglich (Liste filtert nur)
  assert.equal((await c.ga(url('schueler', AB5))).status, 200);
});

/* ---------- ZIP ---------- */

/** Minimaler ZIP-Leser (zentrales Verzeichnis), prüft CRC32 und Methode stored. */
function leseZip(buf) {
  const ende = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  assert.ok(ende >= 0, 'Endsatz fehlt');
  const anzahl = buf.readUInt16LE(ende + 10);
  let pos = buf.readUInt32LE(ende + 16);
  const out = [];
  for (let i = 0; i < anzahl; i++) {
    assert.equal(buf.readUInt32LE(pos), 0x02014b50);
    const flags = buf.readUInt16LE(pos + 8);
    const methode = buf.readUInt16LE(pos + 10);
    const crc = buf.readUInt32LE(pos + 16);
    const groesse = buf.readUInt32LE(pos + 24);
    const nl = buf.readUInt16LE(pos + 28);
    const el = buf.readUInt16LE(pos + 30);
    const kl = buf.readUInt16LE(pos + 32);
    const lokal = buf.readUInt32LE(pos + 42);
    const name = buf.subarray(pos + 46, pos + 46 + nl).toString(flags & 0x800 ? 'utf8' : 'latin1');
    assert.equal(buf.readUInt32LE(lokal), 0x04034b50);
    const lnl = buf.readUInt16LE(lokal + 26);
    const lel = buf.readUInt16LE(lokal + 28);
    const daten = buf.subarray(lokal + 30 + lnl + lel, lokal + 30 + lnl + lel + groesse);
    assert.equal(methode, 0);
    assert.equal(zlib.crc32(daten), crc, name);
    out.push({ name, daten: daten.toString() });
    pos += 46 + nl + el + kl;
  }
  return out;
}

test('crc32 stimmt mit zlib überein; zipTeile ergibt ein gültiges Archiv', () => {
  for (const s of ['', 'a', 'Datendetektei Weserstedt', 'äöü'.repeat(100)]) assert.equal(crc32(Buffer.from(s)), zlib.crc32(Buffer.from(s)));
  const datum = new Date(2026, 9, 13, 12, 30, 10);
  const buf = Buffer.concat(zipTeile([{ name: 'a/b.txt', daten: Buffer.from('hallo'), datum }, { name: 'ü.txt', daten: Buffer.alloc(0), datum }]));
  assert.deepEqual(leseZip(buf), [{ name: 'a/b.txt', daten: 'hallo' }, { name: 'ü.txt', daten: '' }]);
});

test('ZIP je Akte (nur Superadmin): Originale der Akte, nur vorhandene, mit unzip lesbar', async (tt) => {
  const t = app();
  const c = await clients(t);
  const r = await c.superadmin('/material/original-zip/1').buffer(true).parse((res, cb) => {
    const teile = [];
    res.on('data', (d) => teile.push(d));
    res.on('end', () => cb(null, Buffer.concat(teile)));
  });
  assert.equal(r.status, 200);
  assert.equal(r.headers['content-type'], 'application/zip');
  assert.equal(r.headers['content-disposition'], 'attachment; filename="Datendetektei_Akte1_Originale.zip"');
  assert.equal(r.headers['cache-control'], 'private, no-store');
  assert.equal(r.headers['x-content-type-options'], 'nosniff');
  const eintraege = leseZip(r.body);
  assert.deepEqual(eintraege.map((e) => e.name).sort(), [PPTX, DOCX].sort());
  assert.equal(eintraege.find((e) => e.name === DOCX).daten, 'PK-Dummy AB 1.1 docx\n');

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dd-zip-'));
  tt.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const zip = path.join(dir, 'a.zip');
  fs.writeFileSync(zip, r.body);
  let unzip = true;
  try {
    execFileSync('unzip', ['-v'], { stdio: 'ignore' });
  } catch {
    unzip = false;
  }
  if (unzip) {
    const aus = execFileSync('unzip', ['-t', zip], { encoding: 'utf8' });
    assert.match(aus, /No errors detected/);
  }

  // Akte 0 (übergreifend) und 2; Akte ohne vorhandene Originale → 404
  assert.equal(leseZip((await c.superadmin('/material/original-zip/0').buffer(true).parse(binaer)).body).length, 1);
  assert.equal(leseZip((await c.superadmin('/material/original-zip/2').buffer(true).parse(binaer)).body).length, 1);
  assert.equal((await c.superadmin('/material/original-zip/3')).status, 404);
});

function binaer(res, cb) {
  const teile = [];
  res.on('data', (d) => teile.push(d));
  res.on('end', () => cb(null, Buffer.concat(teile)));
}

test('ZIP: Größenlimit → 413 ohne Inhalt', async () => {
  const t = testApp({}, { materialVerzeichnis: FIX, materialOptionen: { zipLimitBytes: 10 } });
  const c = await clients(t);
  const r = await c.superadmin('/material/original-zip/1');
  assert.equal(r.status, 413);
  assert.match(r.text, /zu groß/);
});

/* ---------- Seiten-Hinweise, Themen ---------- */

test('GET /api/themen: Materialliste aus den Whitelists (Titel, Akte, Niveau, „nach Anmeldung“; Gast mit Link)', async () => {
  const t = app();
  const d = (await request(t.app).get('/api/themen')).body;
  const a1 = d.akten.find((a) => a.nr === 1);
  const titel = a1.materialien.map((m) => m.titel);
  assert.ok(titel.includes('AB 1.1 Der erste Auftrag'));
  assert.ok(titel.includes('Lehrerhinweise Akte 1'));
  for (const m of a1.materialien) {
    assert.ok(['nach Anmeldung', 'nach Anmeldung (Lehrkraft)', 'Gast-Auswahl'].includes(m.zugang), m.zugang);
    assert.ok(m.id && m.niveau && m.art, JSON.stringify(m));
    if (m.zugang === 'Gast-Auswahl') assert.match(m.url, /^\/gast\/material\//);
    else assert.equal(m.url, undefined);
    assert.equal(m.datei, undefined, 'keine Dateipfade auf der öffentlichen Seite');
  }
  // Originale erscheinen nicht; Akte 5 zeigt das eA-Arbeitsblatt mit Niveau
  assert.ok(!JSON.stringify(d).includes('.docx'));
  const a5 = d.akten.find((a) => a.nr === 5);
  assert.ok(a5.materialien.some((m) => m.titel === 'AB 5.1 Baupläne lesen' && m.niveau === 'eA'));
  // Akte ohne Whitelist-Einträge: bisherige Platzhalter
  const a3 = d.akten.find((a) => a.nr === 3);
  assert.ok(a3.materialien.length >= 3);
  // Die IDs passen zu /api/material (Browser verlinkt angemeldet)
  const c = await clients(t);
  const s = (await c.schueler('/api/material')).body;
  // AB 1.1 steht auch in der Gast-Auswahl → öffentlich mit Link; die Lösung nur „nach Anmeldung (Lehrkraft)“
  const ab1 = a1.materialien.find((m) => m.titel === 'AB 1.1 Der erste Auftrag');
  assert.equal(ab1.zugang, 'Gast-Auswahl');
  assert.equal(ab1.url, '/gast/material/Akte1/DD_A1-AB1_Der_erste_Auftrag.pdf');
  assert.ok(s.stufen.schueler.some((e) => e.id === ab1.id));
  const lsg = a1.materialien.find((m) => m.art === 'Lösung');
  assert.equal(lsg.zugang, 'nach Anmeldung (Lehrkraft)');
  const l = (await c.lehrkraft('/api/material')).body;
  assert.ok(l.stufen.lehrkraft.some((e) => e.id === lsg.id));
  // Material ohne Akte (0, Kür) steht unter „uebergreifend“ (hier keins außer Originalen → leer)
  assert.deepEqual(d.materialUebergreifend, []);
});

test('Whitelists im Repo: Format gültig (pruefeVerzeichnisse ohne Fehler)', () => {
  const p = pruefeVerzeichnisse(path.join(WURZEL, 'materialien'));
  assert.deepEqual(p.fehler, []);
});

test('pruefeVerzeichnisse: Formatfehler sind Fehler, fehlende Dateien Hinweise', (tt) => {
  const p = pruefeVerzeichnisse(FIX);
  assert.ok(p.fehler.some((f) => f.text.includes('../geheim.pdf')), JSON.stringify(p.fehler));
  assert.ok(p.hinweise.some((h) => h.text.includes('DD_A1-AB3_Fehlt.pdf')));
  const dir = kopie(tt);
  fs.writeFileSync(path.join(dir, 'Lehrkraft_PDF', 'verzeichnis.json'), '{ kaputt');
  assert.ok(pruefeVerzeichnisse(dir).fehler.some((f) => f.datei.includes('Lehrkraft_PDF')));
});

test('Docker: materialien/ kommt ins Image, Originale nur mit ORIGINALE_IM_IMAGE=1 (Standard)', () => {
  const docker = fs.readFileSync(path.join(WURZEL, 'Dockerfile'), 'utf8');
  assert.match(docker, /^ARG ORIGINALE_IM_IMAGE=1$/m);
  assert.match(docker, /^COPY materialien \.\/materialien$/m);
  assert.match(docker, /ORIGINALE_IM_IMAGE=\$ORIGINALE_IM_IMAGE node materialien_fuer_image\.js/);
  assert.match(docker, /^COPY --from=material \/material \.\/materialien$/m);
  const ignore = fs.readFileSync(path.join(WURZEL, '.dockerignore'), 'utf8').split('\n').map((z) => z.trim());
  assert.ok(!ignore.includes('materialien') && !ignore.includes('materialien/'), '.dockerignore schließt materialien aus');
});

test('Kompatibel mit dem Format der Phase-7-Pipeline (flache Namen, _hinweis, art ab, niveau alle, akte null)', (tt) => {
  const dir = kopie(tt);
  fs.writeFileSync(path.join(dir, 'Arbeitsblaetter_PDF', 'DD_A1-AB1_Flach.pdf'), '%PDF-1.4 flach');
  fs.writeFileSync(
    path.join(dir, 'Arbeitsblaetter_PDF', 'verzeichnis.json'),
    JSON.stringify({
      _hinweis: 'ERZEUGT – nicht von Hand ändern.',
      dateien: [{ datei: 'DD_A1-AB1_Flach.pdf', titel: 'AB 1.1 · Flach', akte: 1, gruppe: 'Akte 1', art: 'ab', fassung: 'schueler', niveau: 'alle', ermittlung: 'A1-E1', ds: 1 }]
    })
  );
  fs.writeFileSync(
    path.join(dir, 'Originale', 'verzeichnis.json'),
    JSON.stringify({ dateien: [{ datei: '00_Gesamt/DD_Gesamtuebersicht.docx', titel: 'Gesamt', akte: null, gruppe: 'Gesamt', art: 'gesamt', fassung: 'lehrkraft' }] })
  );
  const m = erzeugeMaterial({ verzeichnis: dir });
  assert.deepEqual(m.liste('schueler').map((e) => [e.datei, e.niveau, e.art]), [['Arbeitsblaetter_PDF/DD_A1-AB1_Flach.pdf', 'beide', 'ab']]);
  assert.deepEqual(m.zips().map((z) => [z.akte, z.anzahl]), [[0, 1]]);
  assert.deepEqual(pruefeVerzeichnisse(dir).fehler.filter((f) => /Arbeitsblaetter_PDF|Originale/.test(f.datei)), []);
});
