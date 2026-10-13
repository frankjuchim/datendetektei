'use strict';
// Themenseite aus dem Seed (Plan Phase 3 Task 10, Spec §7.12): GET /api/themen liefert Akten, Ermittlungen mit DS,
// Kompetenzen, Niveau, Fallen, Anzahl Aufgaben, Verhör-Titel und Materialliste „nach Anmeldung“ – aber keine
// Aufgabentexte, Lösungen, Tipps oder Erklärungen.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const request = require('supertest');
const { testApp } = require('./helpers');
const { erzeugeInhalte } = require('../src/services/inhalte');
const { AKTEN, FALLEN } = require('../src/domain');

const AKTEN_DIR = path.join(__dirname, '..', 'seed', 'akten');
const seedAkten = () =>
  fs
    .readdirSync(AKTEN_DIR)
    .filter((d) => d.endsWith('.json'))
    .map((d) => JSON.parse(fs.readFileSync(path.join(AKTEN_DIR, d), 'utf8')));

function mitInhalten() {
  return testApp({}, (db) => {
    const inhalte = erzeugeInhalte(db);
    inhalte.laden();
    return { inhalte };
  });
}

function texte(wert, out = []) {
  if (typeof wert === 'string') out.push(wert);
  else if (Array.isArray(wert)) wert.forEach((w) => texte(w, out));
  else if (wert && typeof wert === 'object') Object.values(wert).forEach((w) => texte(w, out));
  return out;
}

test('GET /api/themen ohne Inhalte: sieben Akten „folgt“, Fallen P1–P10, Niveaus wie AKTEN', async () => {
  const { app } = testApp();
  const r = await request(app).get('/api/themen');
  assert.equal(r.status, 200);
  assert.match(r.headers['content-type'], /application\/json/);
  const d = r.body;
  assert.deepEqual(d.akten.map((a) => a.nr), [1, 2, 3, 4, 5, 6, 7]);
  for (const a of d.akten) {
    const soll = AKTEN.find((x) => x.nr === a.nr);
    assert.equal(a.titel, soll.titel);
    assert.deepEqual(a.niveaus, [...soll.niveaus]);
    assert.equal(a.status, 'folgt');
    assert.ok(a.ds.length >= 1, `Akte ${a.nr}: DS`);
    assert.ok(a.fach.length > 0);
    assert.ok(a.ermittlungen.length >= 1, `Akte ${a.nr}: geplante Ermittlungen`);
  }
  assert.deepEqual(d.fallen, FALLEN.map((f) => ({ nr: f.nr, titel: f.titel })));
  assert.deepEqual(
    d.niveaus.filter((n) => n.akte).map((n) => [n.akte, n.eA, n.gA]),
    AKTEN.map((a) => [a.nr, a.niveaus.includes('eA'), a.niveaus.includes('gA')])
  );
  assert.ok(d.niveaus.some((n) => n.kuer === 'K1'));
  assert.ok(d.niveaus.some((n) => n.kuer === 'K2'));
});

test('GET /api/themen mit Seed: Akten 1–3 mit Ermittlungen, DS, Kompetenzen, Fallen, Anzahl, Verhör; 4–7 folgen', async () => {
  const { app } = mitInhalten();
  const d = (await request(app).get('/api/themen')).body;
  for (const roh of seedAkten().filter((x) => !x.kuer)) {
    const a = d.akten.find((x) => x.nr === roh.welt);
    assert.ok(a, `Akte ${roh.welt}`);
    assert.equal(a.status, 'offen');
    assert.equal(a.titel, roh.titel);
    assert.equal(a.farbe, roh.farbe);
    assert.deepEqual(a.ermittlungen.map((e) => e.id), roh.levels.map((l) => l.id));
    for (const l of roh.levels) {
      const e = a.ermittlungen.find((x) => x.id === l.id);
      assert.equal(e.titel, l.titel);
      assert.deepEqual(e.ds, l.ds);
      assert.equal(e.nr, l.nr);
      assert.equal(e.niveau, l.niveau || 'alle');
      assert.equal(e.aufgaben, l.aufgaben.length);
      assert.equal(e.coldCase, !!l.coldCase);
      const aufgaben = roh.aufgaben.filter((x) => l.aufgaben.includes(x.id));
      const kompetenzen = [...new Set(aufgaben.flatMap((x) => x.kompetenzen || []))].sort();
      assert.deepEqual(e.kompetenzen.map((k) => k.id), kompetenzen);
      for (const k of e.kompetenzen) assert.ok(k.titel && k.titel.length > 3, `Kurztitel zu ${k.id}`);
      const fallen = [...new Set(aufgaben.flatMap((x) => x.fallen || []))];
      assert.deepEqual([...e.fallen].sort(), fallen.sort());
      assert.equal(Object.values(e.arten).reduce((s, n) => s + n, 0), l.aufgaben.length);
    }
    assert.equal(a.verhoer.titel, roh.boss.titel);
    assert.equal(a.verhoer.dauerMin, roh.boss.dauerMin);
    assert.deepEqual(a.ds, [...new Set(roh.levels.flatMap((l) => l.ds))]);
  }
  const vorhanden = new Set(seedAkten().map((x) => x.welt));
  for (const nr of [4, 5, 6, 7].filter((n) => !vorhanden.has(n))) assert.equal(d.akten.find((a) => a.nr === nr).status, 'folgt');
});

test('GET /api/themen verrät keine Aufgabentexte, Lösungen, Tipps oder Erklärungen', async () => {
  const { app } = mitInhalten();
  const r = await request(app).get('/api/themen');
  const json = r.text;
  for (const s of ['"loesung"', '"tipps"', '"erklaerung"', '"inhalt"', '"interaktion"', '"briefing"', '"pool"']) {
    assert.ok(!json.includes(s), `${s} in /api/themen`);
  }
  let geprueft = 0;
  for (const akte of seedAkten()) {
    for (const a of akte.aufgaben) {
      const geheim = [a.titel, ...texte(a.inhalt), ...texte(a.interaktion), ...texte(a.loesung), ...texte(a.tipps), ...texte(a.erklaerung)];
      for (const g of geheim) {
        if (g.length < 16) continue; // kurze Werte (Spaltennamen, Fachbegriffe, Kategorien) kommen legitim vor
        geprueft++;
        assert.ok(!json.includes(JSON.stringify(g).slice(1, -1)), `${a.id} verrät: ${g.slice(0, 60)}`);
      }
    }
  }
  assert.ok(geprueft > 500, `zu wenige geprüfte Texte: ${geprueft}`);
});

test('GET /api/themen: Materialliste je Akte nur als Titel „nach Anmeldung“', async () => {
  const { app } = mitInhalten();
  const d = (await request(app).get('/api/themen')).body;
  for (const a of d.akten) {
    assert.ok(a.materialien.length >= (a.nr === 7 ? 2 : 3), `Akte ${a.nr}`);
    for (const m of a.materialien) {
      // mit Whitelist-Einträgen (Phase 7) erscheinen Lehrkraft-PDFs als „nach Anmeldung (Lehrkraft)“ (MATERIALIEN.md §7)
      assert.ok(['nach Anmeldung', 'nach Anmeldung (Lehrkraft)'].includes(m.zugang), m.zugang);
      assert.equal(m.url, undefined);
    }
    const arten = a.materialien.map((m) => m.art);
    for (const art of ['Arbeitsblatt', 'Präsentations-Handout', 'Warm-up-Karten']) {
      if (a.nr === 7 && art === 'Warm-up-Karten') continue;
      assert.ok(arten.includes(art), `Akte ${a.nr}: ${art}`);
    }
  }
  const a1 = d.akten.find((a) => a.nr === 1);
  assert.ok(a1.materialien.some((m) => /AB 1\.1/.test(m.titel)), 'Arbeitsblatt-Titel aus dem Seed (ab)');
});

test('/themen: Seite lädt themen.js, behält #niveaus und die Freie Ermittlung', async () => {
  const { app } = testApp();
  const r = await request(app).get('/themen');
  assert.equal(r.status, 200);
  assert.match(r.text, /<script src="\/static\/js\/themen\.js\?v=[^"]+" defer><\/script>/);
  assert.match(r.text, /id="niveaus"/);
  assert.match(r.text, /id="akten-themen"/);
  assert.match(r.text, /id="freie-ermittlung"/);
  assert.match(r.text, /href="\/konsole\/eisdiele"/);
});
