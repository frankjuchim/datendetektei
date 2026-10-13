'use strict';
// Verbund-Kursübersicht (Vertrag v1.2 §6, Spec §7.13; Plan Phase 6 Task 10) und Manifest-umfang aus dem Seed (§7, Spec §10).
// Format exakt nach §6: { kurs, stand, schueler: [{ sub, punkte, geloest, anteil, zuletzt }], welten: [{ nr, titel, anteil }] }
// – echte Werte aus dem Lernstand, keine Namen, Antworten, Lösungen oder Freitexte.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const request = require('supertest');

const { musterantwort } = require('../src/content/pruefer');
const { oeffneDb } = require('../src/db');
const { erzeugeInhalte, umfangVon } = require('../src/services/inhalte');
const { AKTEN } = require('../src/domain');
const { STANDARD_UMFANG } = require('../src/kern/manifest');
const { pruefeManifest } = require('../scripts/vertrag_pruefen');
const { verbundToken } = require('./helpers');
const H = require('./hilfen_lernen');

const A = (id) => `${H.K17}/aufgaben/${id}`;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const SEED_AKTEN = path.join(__dirname, '..', 'seed', 'akten');

async function uebersicht(u, kurs = 'k%3A17') {
  const token = verbundToken(u.schluessel, u.konfig, 'kurs-uebersicht');
  return request(u.app).get(`/api/verbund/kurse/${kurs}/uebersicht`).set('Authorization', 'Bearer ' + token);
}

test('Kursübersicht: genau die Felder aus §6 mit gültigen Typen und Wertebereichen', async () => {
  const u = H.umgebung();
  const s = await H.client(u, H.SCHUELERIN);
  await H.client(u, H.SCHUELER2);
  H.einstellen(u.db, 'k:17', { akten: [1, 9], niveau: 'eA' });
  await s.post(A('A9-E1-02') + '/pruefen', { antwort: musterantwort(u.inhalte.aufgabe('A9-E1-02')) });
  const r = await uebersicht(u);
  assert.equal(r.status, 200);
  assert.equal(r.headers['cache-control'], 'no-store');
  assert.deepEqual(Object.keys(r.body).sort(), ['kurs', 'schueler', 'stand', 'welten']);
  assert.equal(r.body.kurs, 'k:17');
  assert.match(r.body.stand, ISO);
  assert.equal(r.body.schueler.length, 2, 'Teilnehmerzahl = Mitglieder des Kurses');
  for (const x of r.body.schueler) {
    assert.deepEqual(Object.keys(x).sort(), ['anteil', 'geloest', 'punkte', 'sub', 'zuletzt']);
    assert.match(x.sub, /^s:\d+$/);
    assert.ok(Number.isInteger(x.punkte) && x.punkte >= 0);
    assert.ok(Number.isInteger(x.geloest) && x.geloest >= 0);
    assert.ok(typeof x.anteil === 'number' && x.anteil >= 0 && x.anteil <= 1);
    assert.match(x.zuletzt, ISO);
  }
  for (const w of r.body.welten) {
    assert.deepEqual(Object.keys(w).sort(), ['anteil', 'nr', 'titel']);
    assert.ok(Number.isInteger(w.nr));
    assert.equal(typeof w.titel, 'string');
    assert.ok(w.anteil >= 0 && w.anteil <= 1);
  }
  assert.ok(r.body.schueler[0].punkte > 0 && r.body.schueler[0].geloest === 1);
});

test('Kursübersicht: zuletzt = letzte Aktivität im Kurs (Lösen, Verhör), sonst die letzte Anmeldung', async () => {
  const u = H.umgebung();
  const s = await H.client(u, H.SCHUELERIN);
  await H.client(u, H.SCHUELER2);
  H.einstellen(u.db, 'k:17', { akten: [9], niveau: 'eA' });
  await s.post(A('A9-E1-02') + '/pruefen', { antwort: musterantwort(u.inhalte.aufgabe('A9-E1-02')) });
  // Anmeldungen liegen lange zurück; Lena hat danach gearbeitet
  u.db.prepare("UPDATE konten SET zuletzt = '2026-01-05T08:00:00Z'").run();
  u.db.prepare("UPDATE fortschritt SET zeit = '2026-03-01T09:30:00Z' WHERE sub = 's:1042'").run();
  let r = await uebersicht(u);
  const zu = (sub) => r.body.schueler.find((x) => x.sub === sub).zuletzt;
  assert.equal(zu('s:1042'), '2026-03-01T09:30:00Z');
  assert.equal(zu('s:1043'), '2026-01-05T08:00:00Z', 'ohne Aktivität: letzte Anmeldung');
  // Verhör-Versuch (beendet) später als die letzte Lösung
  u.db
    .prepare("INSERT INTO verhoer_versuche (sub, kurs_id, akte, aufgaben_json, beginn, ende, punkte, max) VALUES ('s:1042', 'k:17', 9, '[]', '2026-03-02T10:00:00Z', '2026-03-02T10:20:00Z', 0, 10)")
    .run();
  r = await uebersicht(u);
  assert.equal(zu('s:1042'), '2026-03-02T10:20:00Z');
  // Aktivität in einem anderen Kurs zählt nicht
  u.db.prepare("INSERT INTO kurse (kurs_id, name) VALUES ('k:99', 'Anderer Kurs')").run();
  u.db.prepare("INSERT INTO fortschritt (sub, kurs_id, aufgabe, status, punkte, zeit) VALUES ('s:1043', 'k:99', 'A9-E1-01', 'geloest', 10, '2026-04-01T00:00:00Z')").run();
  r = await uebersicht(u);
  assert.equal(zu('s:1043'), '2026-01-05T08:00:00Z');
  // ohne jede Zeitangabe: null
  u.db.prepare("UPDATE konten SET zuletzt = '' WHERE sub = 's:1043'").run();
  r = await uebersicht(u);
  assert.equal(zu('s:1043'), null);
});

test('Kursübersicht: welten nur mit den Akten des Kurs-Niveaus (gA ohne Akte 5), anteil = Durchschnitt der Schüler', async () => {
  for (const niveau of ['eA', 'gA']) {
    const u = H.umgebung();
    const s = await H.client(u, H.SCHUELERIN);
    await H.client(u, H.SCHUELER2);
    H.einstellen(u.db, 'k:17', { akten: [9], niveau });
    await s.post(A('A9-E1-01') + '/pruefen', { antwort: ['d'] });
    const r = await uebersicht(u);
    const nrs = r.body.welten.map((w) => w.nr);
    assert.equal(nrs.includes(5), niveau === 'eA', `${niveau}: Akte 5`);
    for (const nr of [1, 2, 3, 4, 6, 7]) assert.ok(nrs.includes(nr), `${niveau}: Akte ${nr}`);
    assert.deepEqual(nrs, [...nrs].sort((a, b) => a - b), 'aufsteigend');
    const lena = r.body.schueler.find((x) => x.sub === 's:1042');
    const w9 = r.body.welten.find((w) => w.nr === 9);
    assert.ok(lena.anteil > 0);
    assert.ok(Math.abs(w9.anteil - lena.anteil / 2) < 1e-9, `${niveau}: Durchschnitt über beide Schüler`);
  }
});

test('Kursübersicht: keine Namen, Antworten, Lösungen, Freitexte oder Kursnamen', async () => {
  const u = H.umgebung();
  const s = await H.client(u, H.SCHUELERIN);
  await H.client(u, H.LEHRKRAFT);
  H.einstellen(u.db, 'k:17', { akten: [9], niveau: 'eA' });
  const a = u.inhalte.aufgabe('A9-E1-02');
  await s.post(A('A9-E1-02') + '/pruefen', { antwort: musterantwort(a) });
  const r = await uebersicht(u);
  const json = JSON.stringify(r.body);
  for (const verboten of ['Lena', 'Frau M.', 'Inf-LK', 'l:7', 'loesung', 'antwort', 'erklaerung', a.titel]) {
    assert.ok(!json.includes(verboten), verboten);
  }
  assert.deepEqual(r.body.schueler.map((x) => x.sub), ['s:1042'], 'nur Schüler (Rolle mitglied)');
});

/* ---------------------------------------------------------------- Manifest umfang aus dem Seed */

function erwarteterUmfang() {
  const akten = fs
    .readdirSync(SEED_AKTEN)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(fs.readFileSync(path.join(SEED_AKTEN, f), 'utf8')))
    .filter((d) => AKTEN.some((p) => p.nr === d.welt)); // Kür und andere Dateien zählen nicht
  return {
    welten: AKTEN.length,
    level: akten.reduce((s, d) => s + (d.levels.length || (d.welt === 7 ? 1 : 0)), 0),
    aufgaben: akten.reduce((s, d) => s + d.levels.reduce((t, l) => t + l.aufgaben.length, 0), 0), // ohne Cold Cases
    bosse: akten.filter((d) => d.boss && d.boss.pool && d.boss.pool.length).length
  };
}

test('Manifest umfang wird aus seed/akten berechnet (Lab-Aufgaben ohne Cold Cases, Verhöre als Bosse)', async () => {
  const db = oeffneDb(':memory:');
  const inhalte = erzeugeInhalte(db);
  inhalte.laden({ verzeichnis: SEED_AKTEN });
  const soll = erwarteterUmfang();
  assert.deepEqual(inhalte.umfang(), soll);
  assert.ok(soll.aufgaben >= 80 && soll.level >= 11 && soll.bosse >= 5, JSON.stringify(soll));
  // Cold Cases sind nicht dabei
  const cc = inhalte.akten().flatMap((a) => a.levels.map((l) => l.coldCase).filter(Boolean));
  assert.ok(cc.length > 0);
  const lab = inhalte.akten().filter((a) => !a.kuer).flatMap((a) => a.levels.flatMap((l) => l.aufgaben));
  assert.equal(lab.length, soll.aufgaben);
  for (const id of cc) assert.ok(!lab.includes(id), id);
});

test('Manifest umfang: Akten außerhalb des Plans (Beispielakte, Kür) zählen nicht; ohne Plan-Akten Standardwerte', async () => {
  const db = oeffneDb(':memory:');
  const inhalte = erzeugeInhalte(db);
  inhalte.laden({ verzeichnis: H.KEINE_AKTEN, dateien: [H.FIXTURE] });
  assert.deepEqual(inhalte.umfang(), { ...STANDARD_UMFANG });
  assert.deepEqual(umfangVon(inhalte.akten()), { welten: 1, level: 2, aufgaben: 20, bosse: 1 }, 'reine Zählung der Beispielakte');
  const dateien = fs.readdirSync(SEED_AKTEN).map((f) => path.join(SEED_AKTEN, f));
  inhalte.laden({ verzeichnis: H.KEINE_AKTEN, dateien: [...dateien, H.FIXTURE] });
  assert.ok(inhalte.akte(9), 'Beispielakte geladen');
  assert.deepEqual(inhalte.umfang(), erwarteterUmfang());
});

test('Manifest über HTTP: umfang aus dem Seed, welten-Liste passt zu umfang.welten, pruefeManifest leer', async () => {
  const dateien = fs.readdirSync(SEED_AKTEN).map((f) => path.join(SEED_AKTEN, f));
  const u = H.umgebung({ dateien });
  const m = (await request(u.app).get('/api/plattform')).body;
  assert.deepEqual(m.umfang, erwarteterUmfang());
  assert.equal(m.welten.length, m.umfang.welten);
  assert.deepEqual(pruefeManifest(m), []);
});
