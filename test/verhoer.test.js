'use strict';
// Verhör-Engine (Plan Phase 3 Task 7, Spec §7.9, Review Focus 3): Freischaltung, Ziehung nach mix/maxJeKind (gA),
// serverseitiger Timer mit 30 s Kulanz, keine Rückmeldung im Verhör, keine Lösungsdaten, bester Versuch, 12 h Pause,
// „besiegt“ ab 50 % mit Beweisstück/Makellos, Rechte. Uhr über konfig.jetzt; SQL über Stub, einmal echte Sandbox.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const request = require('supertest');

const { musterantwort } = require('../src/content/pruefer');
const { ziehe, mulberry32, KULANZ_MS, SPERRE_MS } = require('../src/services/verhoer');
const { verbundToken } = require('./helpers');
const H = require('./hilfen_lernen');

const { K17, K18 } = H;
const V9 = `${K17}/verhoere/9`;
const MIN = 60 * 1000;
const STD = 60 * MIN;

/** Umgebung mit stellbarer Uhr; Standard: Akte 9 frei, Verhör „offen“. */
async function start(opt = {}) {
  const uhr = { t: Date.now() };
  const u = H.umgebung({ ...opt, konfig: { jetzt: () => uhr.t, ...(opt.konfig || {}) } });
  const s = await H.client(u, opt.wer || H.SCHUELERIN);
  H.einstellen(u.db, 'k:17', { akten: [9], niveau: 'eA', verhoer: 'offen', ...(opt.einstellungen || {}) });
  return { u, s, uhr };
}

const richtig = (u, id) => musterantwort(u.inhalte.aufgabe(id));
const falsch = (u, id) => {
  const a = u.inhalte.aufgabe(id);
  switch (a.interaktion.kind) {
    case 'choice':
      return ['c'];
    case 'gaps':
      return { g1: '24' };
    case 'sql':
      return 'SELECT Bezeichnung FROM Produkt';
    case 'zeilen':
      return [1, 2];
    default:
      throw new Error('kein Falschbeispiel für ' + a.interaktion.kind);
  }
};

/** Verdächtige Zeichenketten: Lösungen, Erklärungen, geheime Interaktionsfelder der Beispiel-Verhöraufgaben. */
const GEHEIM = [
  '"loesung"',
  '"erklaerung"',
  '"richtig":[',
  '"quelleSql"',
  '"varianten"',
  '"sortierung"',
  '"tipps"',
  "WHERE Kategorie = 'Getränk'",
  'Unterstrichen ist',
  '14 · 10 = 140',
  'AND bindet stärker',
  'ORDER BY ProduktNr',
  '[5,9,10,11]'
];
function keineLoesungsdaten(body, wo) {
  const json = JSON.stringify(body);
  for (const g of GEHEIM) assert.ok(!json.includes(g), `${wo}: enthält ${g}`);
}

/* ---------------------------------------------------------------- Ziehung (rein) */

function synthetisch() {
  const liste = [];
  const neu = (id, stufe, kind, niveau = 'alle') => liste.push({ id, stufe, punkte: stufe * 10, niveau, interaktion: { kind } });
  neu('V-01', 1, 'choice');
  neu('V-02', 1, 'choice');
  neu('V-03', 1, 'choice');
  neu('V-04', 1, 'gaps');
  neu('V-05', 1, 'gaps', 'eA');
  neu('V-06', 2, 'sql');
  neu('V-07', 2, 'choice');
  neu('V-08', 2, 'sql');
  neu('V-09', 2, 'zeilen', 'eA');
  neu('V-10', 2, 'ergebnis');
  neu('V-11', 3, 'sql');
  neu('V-12', 3, 'sql', 'eA');
  neu('V-13', 3, 'choice');
  neu('V-14', 3, 'zeilen');
  const m = new Map(liste.map((a) => [a.id, a]));
  const boss = { anzahl: 6, mix: { 1: 2, 2: 3, 3: 1 }, maxJeKind: { choice: 1, sql: 2 }, pool: liste.map((a) => a.id) };
  return { boss, aufgabe: (id) => m.get(id) };
}

test('Ziehung: Mix je Stufe, maxJeKind, Reihenfolge Stufe 1 → 3 (viele Seeds)', () => {
  const { boss, aufgabe } = synthetisch();
  const gesehen = new Set();
  for (let seed = 1; seed <= 300; seed++) {
    const ids = ziehe(boss, aufgabe, { niveau: 'eA', zufall: mulberry32(seed) });
    assert.equal(ids.length, 6);
    assert.equal(new Set(ids).size, 6, 'keine Doppelten');
    const st = ids.map((id) => aufgabe(id).stufe);
    assert.deepEqual(st, [1, 1, 2, 2, 2, 3], `Mix und Reihenfolge (Seed ${seed})`);
    const arten = ids.map((id) => aufgabe(id).interaktion.kind);
    assert.ok(arten.filter((k) => k === 'choice').length <= 1, `maxJeKind choice (Seed ${seed}): ${arten}`);
    assert.ok(arten.filter((k) => k === 'sql').length <= 2, `maxJeKind sql (Seed ${seed})`);
    ids.forEach((id) => gesehen.add(id));
  }
  // Zufall wirkt: alle erlaubten Aufgaben kommen irgendwann vor
  for (const id of ['V-01', 'V-02', 'V-03', 'V-04', 'V-05', 'V-06', 'V-07', 'V-08', 'V-09', 'V-10', 'V-11', 'V-12', 'V-13', 'V-14']) {
    assert.ok(gesehen.has(id), id);
  }
});

test('Ziehung: deterministisch je Seed, gA zieht nur Aufgaben für alle', () => {
  const { boss, aufgabe } = synthetisch();
  assert.deepEqual(ziehe(boss, aufgabe, { niveau: 'eA', zufall: mulberry32(7) }), ziehe(boss, aufgabe, { niveau: 'eA', zufall: mulberry32(7) }));
  for (let seed = 1; seed <= 200; seed++) {
    const ids = ziehe(boss, aufgabe, { niveau: 'gA', zufall: mulberry32(seed) });
    assert.ok(!ids.some((id) => aufgabe(id).niveau === 'eA'), `gA ohne eA (Seed ${seed}): ${ids}`);
    assert.deepEqual(ids.map((id) => aufgabe(id).stufe), [1, 1, 2, 2, 2, 3]);
  }
});

test('Ziehung: reicht eine Stufe nicht, wird aus dem Rest aufgefüllt; kleiner Pool → weniger Aufgaben', () => {
  const { aufgabe } = synthetisch();
  const boss = { anzahl: 4, mix: { 1: 1, 2: 1, 3: 2 }, pool: ['V-01', 'V-06', 'V-07', 'V-11'] };
  const ids = ziehe(boss, aufgabe, { niveau: 'eA', zufall: mulberry32(3) });
  assert.equal(ids.length, 4);
  assert.deepEqual(ids.map((id) => aufgabe(id).stufe), [1, 2, 2, 3]);
  const klein = ziehe({ anzahl: 6, mix: { 1: 2, 2: 3, 3: 1 }, pool: ['V-01', 'V-11'] }, aufgabe, { niveau: 'eA', zufall: mulberry32(3) });
  assert.deepEqual(klein, ['V-01', 'V-11']);
});

/* ---------------------------------------------------------------- Status und Start */

test('Status vor dem ersten Versuch: frei, Dauer, Anzahl, keine Versuche', async () => {
  const { s, uhr } = await start();
  const r = await s.get(V9);
  assert.equal(r.status, 200);
  assert.equal(r.body.frei, true);
  assert.equal(r.body.grund, null);
  assert.equal(r.body.verhoer.id, 'A9-V');
  assert.equal(r.body.verhoer.dauerMin, 20);
  assert.equal(r.body.verhoer.anzahl, 3);
  assert.equal(typeof r.body.verhoer.rahmensatz, 'string');
  assert.equal(r.body.versuche, 0);
  assert.equal(r.body.bester, null);
  assert.equal(r.body.besiegt, false);
  assert.equal(r.body.laufend, null);
  assert.equal(r.body.naechsterVersuchAb, null);
  assert.equal(r.body.serverZeit, new Date(uhr.t).toISOString());
  keineLoesungsdaten(r.body, 'Status');
});

test('Start: Versuchs-id, Endzeit, Aufgaben Stufe 1 → 3 in öffentlicher Sicht (Abimodus streng), ohne Lösungsdaten', async () => {
  const { u, s, uhr } = await start();
  const r = await s.post(V9 + '/start');
  assert.equal(r.status, 200);
  assert.ok(Number.isInteger(r.body.id));
  assert.equal(r.body.beginn, new Date(uhr.t).toISOString());
  assert.equal(r.body.ende, new Date(uhr.t + 20 * MIN).toISOString());
  assert.equal(r.body.laeuft, true);
  assert.equal(r.body.aufgaben.length, 3);
  assert.deepEqual(r.body.aufgaben.map((a) => a.stufe), [1, 2, 3]);
  assert.equal(r.body.max, 60);
  assert.ok(['A9-V-01', 'A9-V-02'].includes(r.body.aufgaben[0].id));
  const sql = r.body.aufgaben.find((a) => a.id === 'A9-V-03');
  assert.deepEqual(sql.interaktion, { kind: 'sql', datenbank: 'verhoer/kiosk', abimodus: 'streng' });
  assert.ok(r.body.aufgaben.every((a) => a.beantwortet === false));
  assert.ok(r.body.aufgaben.every((a) => !('tippsAnzahl' in a)), 'keine Tipps im Verhör');
  keineLoesungsdaten(r.body, 'Start');
  // Ziehung gespeichert
  const z = u.db.prepare('SELECT * FROM verhoer_versuche WHERE id = ?').get(r.body.id);
  assert.deepEqual(JSON.parse(z.aufgaben_json).aufgaben, r.body.aufgaben.map((a) => a.id));
  assert.equal(z.max, 60);
  assert.equal(z.ende, null);
});

test('Start während eines laufenden Versuchs liefert denselben Versuch (gleiche Ziehung)', async () => {
  const { s } = await start();
  const a = await s.post(V9 + '/start');
  const b = await s.post(V9 + '/start');
  assert.equal(b.status, 200);
  assert.equal(b.body.id, a.body.id);
  assert.deepEqual(b.body.aufgaben.map((x) => x.id), a.body.aufgaben.map((x) => x.id));
  const c = await s.get(V9 + '/versuch');
  assert.deepEqual(c.body.aufgaben.map((x) => x.id), a.body.aufgaben.map((x) => x.id));
  const st = await s.get(V9);
  assert.equal(st.body.laufend.id, a.body.id);
});

/* ---------------------------------------------------------------- Antworten ohne Rückmeldung */

test('Antwort: nur { gespeichert: true }, gleich bei richtig und falsch; Status „beantwortet“ ohne Wertung; keine Rohantwort gespeichert', async () => {
  const { u, s } = await start();
  const v = (await s.post(V9 + '/start')).body;
  const [a1, a2, a3] = v.aufgaben.map((a) => a.id);
  let r = await s.post(V9 + '/antwort', { aufgabe: a1, antwort: richtig(u, a1) });
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, { gespeichert: true });
  r = await s.post(V9 + '/antwort', { aufgabe: a2, antwort: 'SELECT Bezeichnung FROM Produkt WHERE Preis > 999' });
  assert.deepEqual(r.body, { gespeichert: true });
  assert.equal(u.pruefer.aufrufe.at(-1).aufgabe.abimodus, 'streng', 'Abimodus streng im Verhör');
  r = await s.post(V9 + '/antwort', { aufgabe: a3, antwort: falsch(u, a3) });
  assert.deepEqual(r.body, { gespeichert: true });

  const g = await s.get(V9 + '/versuch');
  assert.equal(g.status, 200);
  assert.equal(g.body.laeuft, true);
  assert.deepEqual(g.body.aufgaben.map((a) => a.beantwortet), [true, true, true]);
  for (const a of g.body.aufgaben) {
    assert.ok(!('ok' in a) && !('erreicht' in a) && !('antwort' in a), 'keine Wertung, keine Antwort');
  }
  assert.ok(!('punkte' in g.body), 'keine Punkte während des Versuchs');
  keineLoesungsdaten(g.body, 'Versuch');

  const zeile = u.db.prepare('SELECT * FROM verhoer_versuche WHERE id = ?').get(v.id);
  const roh = JSON.stringify(zeile);
  assert.ok(!roh.includes('Preis > 999'), 'SQL-Antwort nicht gespeichert');
  const erg = JSON.parse(zeile.ergebnisse_json);
  assert.deepEqual(Object.keys(erg).sort(), [a1, a2, a3].sort());
  for (const e of Object.values(erg)) assert.deepEqual(Object.keys(e).sort(), ['ok', 'punkte']);
  assert.equal(erg[a1].ok, true);
  assert.equal(erg[a2].ok, false);
});

test('Antwort: erneute Antwort überschreibt; fremde Aufgabe 400; leere Antwort entfernt die Wertung', async () => {
  const { u, s } = await start();
  const v = (await s.post(V9 + '/start')).body;
  const a1 = v.aufgaben[0].id;
  await s.post(V9 + '/antwort', { aufgabe: a1, antwort: falsch(u, a1) });
  await s.post(V9 + '/antwort', { aufgabe: a1, antwort: richtig(u, a1) });
  let erg = JSON.parse(u.db.prepare('SELECT ergebnisse_json FROM verhoer_versuche WHERE id = ?').get(v.id).ergebnisse_json);
  assert.equal(erg[a1].ok, true);
  const nicht = ['A9-V-01', 'A9-V-02'].find((id) => id !== a1);
  let r = await s.post(V9 + '/antwort', { aufgabe: nicht, antwort: richtig(u, nicht) });
  assert.equal(r.status, 400);
  r = await s.post(V9 + '/antwort', { aufgabe: 'A9-E1-01', antwort: ['d'] });
  assert.equal(r.status, 400);
  const leer = u.inhalte.aufgabe(a1).interaktion.kind === 'choice' ? [] : { g1: '' };
  r = await s.post(V9 + '/antwort', { aufgabe: a1, antwort: leer });
  assert.deepEqual(r.body, { gespeichert: true });
  erg = JSON.parse(u.db.prepare('SELECT ergebnisse_json FROM verhoer_versuche WHERE id = ?').get(v.id).ergebnisse_json);
  assert.equal(erg[a1], undefined);
  const g = await s.get(V9 + '/versuch');
  assert.equal(g.body.aufgaben[0].beantwortet, false);
});

test('Antwort ohne laufenden Versuch → 409; Versuch ohne je gestartet → 404', async () => {
  const { s } = await start();
  let r = await s.post(V9 + '/antwort', { aufgabe: 'A9-V-01', antwort: ['a'] });
  assert.equal(r.status, 409);
  r = await s.get(V9 + '/versuch');
  assert.equal(r.status, 404);
  r = await s.post(V9 + '/abgeben');
  assert.equal(r.status, 409);
});

/* ---------------------------------------------------------------- Review Focus 3: Timer und 12 h */

test('Timer: Antwort bis Ende + 30 s wird gewertet, danach 409 und Versuch automatisch ausgewertet', async () => {
  const { u, s, uhr } = await start();
  const t0 = uhr.t;
  const v = (await s.post(V9 + '/start')).body;
  const [a1, a2, a3] = v.aufgaben.map((a) => a.id); // Stufe 1 (10), 2 (20), 3 (30)
  await s.post(V9 + '/antwort', { aufgabe: a1, antwort: richtig(u, a1) });
  uhr.t = t0 + 20 * MIN + KULANZ_MS; // genau Ende + Kulanz: noch gültig
  let r = await s.post(V9 + '/antwort', { aufgabe: a2, antwort: richtig(u, a2) });
  assert.equal(r.status, 200);
  uhr.t = t0 + 20 * MIN + KULANZ_MS + 1000;
  r = await s.post(V9 + '/antwort', { aufgabe: a3, antwort: richtig(u, a3) });
  assert.equal(r.status, 409);
  assert.match(r.body.error, /Zeit/);

  const z = u.db.prepare('SELECT * FROM verhoer_versuche WHERE id = ?').get(v.id);
  assert.equal(z.ende, new Date(t0 + 20 * MIN + KULANZ_MS).toISOString(), 'Ende = Frist + Kulanz');
  assert.equal(z.punkte, 30);
  const g = await s.get(V9 + '/versuch');
  assert.equal(g.body.laeuft, false);
  assert.equal(g.body.punkte, 30);
  assert.equal(g.body.max, 60);
  assert.equal(g.body.prozent, 50);
  assert.equal(g.body.besiegt, true);
  assert.deepEqual(g.body.aufgaben.map((a) => a.richtig), [true, true, false]);
  keineLoesungsdaten(g.body, 'Ergebnis');
});

test('Zeitablauf ohne weiteren Zugriff: Status wertet beim nächsten Zugriff aus', async () => {
  const { u, s, uhr } = await start();
  const t0 = uhr.t;
  const v = (await s.post(V9 + '/start')).body;
  const a1 = v.aufgaben[0].id;
  await s.post(V9 + '/antwort', { aufgabe: a1, antwort: richtig(u, a1) });
  uhr.t = t0 + 3 * STD;
  const st = await s.get(V9);
  assert.equal(st.body.laufend, null);
  assert.equal(st.body.versuche, 1);
  assert.deepEqual(st.body.bester, { punkte: 10, max: 60, prozent: 17, besiegt: false });
  // 12 h ab Ende (= Frist + Kulanz), nicht ab dem Zugriff
  assert.equal(st.body.naechsterVersuchAb, new Date(t0 + 20 * MIN + KULANZ_MS + SPERRE_MS).toISOString());
});

test('Zweiter Versuch vor 12 h → 409 mit Zeitpunkt; danach möglich', async () => {
  const { s, uhr } = await start();
  await s.post(V9 + '/start');
  uhr.t += 5 * MIN;
  const ab = await s.post(V9 + '/abgeben');
  assert.equal(ab.status, 200);
  assert.equal(ab.body.laeuft, false);
  const ende = uhr.t;
  uhr.t = ende + SPERRE_MS - 1000;
  let r = await s.post(V9 + '/start');
  assert.equal(r.status, 409);
  assert.equal(r.body.naechsterVersuchAb, new Date(ende + SPERRE_MS).toISOString());
  assert.match(r.body.error, /12 Stunden/);
  const st = await s.get(V9);
  assert.equal(st.body.naechsterVersuchAb, new Date(ende + SPERRE_MS).toISOString());
  uhr.t = ende + SPERRE_MS;
  r = await s.post(V9 + '/start');
  assert.equal(r.status, 200);
  assert.equal(r.body.laeuft, true);
});

/* ---------------------------------------------------------------- Ergebnis, bester Versuch, Abzeichen */

async function spieleVerhoer(u, s, anzahlRichtig) {
  const v = (await s.post(V9 + '/start')).body;
  assert.equal(v.laeuft, true, JSON.stringify(v));
  for (const [i, a] of v.aufgaben.entries()) {
    await s.post(V9 + '/antwort', { aufgabe: a.id, antwort: i < anzahlRichtig ? richtig(u, a.id) : falsch(u, a.id) });
  }
  const r = await s.post(V9 + '/abgeben');
  assert.equal(r.status, 200);
  return r.body;
}

test('Abgabe 100 %: Ergebnis je Aufgabe ohne Musterlösungen, Beweisstück + Makellos, Erfolge-Feed, Punkte im Stand', async () => {
  const { u, s } = await start();
  const e = await spieleVerhoer(u, s, 3);
  assert.equal(e.punkte, 60);
  assert.equal(e.max, 60);
  assert.equal(e.prozent, 100);
  assert.equal(e.besiegt, true);
  assert.deepEqual(e.aufgaben.map((a) => [a.richtig, a.erreicht]), [[true, 10], [true, 20], [true, 30]]);
  assert.ok(e.aufgaben.every((a) => typeof a.titel === 'string' && Object.keys(a).sort().join() === 'erreicht,id,punkte,richtig,stufe,titel'));
  assert.deepEqual(e.neueAbzeichen.map((a) => a.id).sort(), ['beweisstueck-9', 'makellos']);
  keineLoesungsdaten(e, 'Abgabe');
  const feed = u.db.prepare("SELECT art FROM erfolge WHERE sub = 's:1042'").all().map((z) => z.art);
  assert.ok(feed.includes('abzeichen:beweisstueck-9'));
  assert.ok(feed.includes('verhoer:9'));
  const st = await s.get(`${K17}/stand`);
  assert.equal(st.body.punkte.verhoer, 60);
  const akte = st.body.akten.find((a) => a.nr === 9);
  assert.equal(akte.verhoer.besiegt, true);
});

test('Unter 50 %: nicht besiegt, kein Abzeichen; bester Versuch zählt (späterer schlechterer ändert nichts)', async () => {
  const { u, s, uhr } = await start();
  let e = await spieleVerhoer(u, s, 1); // 10 von 60
  assert.equal(e.besiegt, false);
  assert.deepEqual(e.neueAbzeichen, []);
  uhr.t += SPERRE_MS;
  e = await spieleVerhoer(u, s, 3); // 60
  assert.equal(e.besiegt, true);
  uhr.t += SPERRE_MS;
  e = await spieleVerhoer(u, s, 0); // 0
  assert.equal(e.punkte, 0);
  const st = await s.get(V9);
  assert.equal(st.body.versuche, 3);
  assert.deepEqual(st.body.bester, { punkte: 60, max: 60, prozent: 100, besiegt: true });
  assert.equal(st.body.besiegt, true);
  const stand = await s.get(`${K17}/stand`);
  assert.equal(stand.body.punkte.verhoer, 60);
  const g = await s.get(V9 + '/versuch');
  assert.equal(g.body.punkte, 0, 'versuch = letzter Versuch');
});

/* ---------------------------------------------------------------- Verhör-Aufgaben nie außerhalb */

test('Verhör-Aufgaben sind über /aufgaben/:id nie abrufbar (auch nicht während des Versuchs)', async () => {
  const { s } = await start();
  for (const id of ['A9-V-01', 'A9-V-03']) {
    assert.equal((await s.get(`${K17}/aufgaben/${id}`)).status, 404);
    assert.equal((await s.post(`${K17}/aufgaben/${id}/pruefen`, { antwort: ['a'] })).status, 404);
  }
  await s.post(V9 + '/start');
  for (const id of ['A9-V-01', 'A9-V-02', 'A9-V-03', 'A9-V-04']) {
    assert.equal((await s.get(`${K17}/aufgaben/${id}`)).status, 404);
    assert.equal((await s.post(`${K17}/aufgaben/${id}/loesung-zeigen`)).status, 404);
  }
});

/* ---------------------------------------------------------------- Freischaltung */

test('Freischaltung: gesperrt → 403; auto erst ab 60 % der Level-Punkte; offen sofort', async () => {
  const { u, s } = await start({ einstellungen: { verhoer: 'gesperrt' } });
  let r = await s.get(V9);
  assert.equal(r.body.frei, false);
  assert.match(r.body.grund, /gesperrt/);
  assert.equal((await s.post(V9 + '/start')).status, 403);

  H.einstellen(u.db, 'k:17', { verhoer: 'auto' });
  r = await s.get(V9);
  assert.equal(r.body.frei, false);
  assert.match(r.body.grund, /60 %/);
  assert.equal((await s.post(V9 + '/start')).status, 403);

  // Lab-Punkte direkt eintragen, bis knapp unter bzw. über 60 %
  const akte = u.inhalte.akte(9);
  const ids = akte.levels.flatMap((l) => l.aufgaben);
  const max = ids.reduce((s2, id) => s2 + u.inhalte.aufgabe(id).punkte, 0);
  const ins = u.db.prepare("INSERT INTO fortschritt (sub, kurs_id, aufgabe, status, punkte, zeit) VALUES ('s:1042', 'k:17', ?, 'geloest', ?, '2026-10-12T08:00:00Z')");
  let summe = 0;
  for (const id of ids) {
    const p = u.inhalte.aufgabe(id).punkte;
    if (summe + p >= Math.ceil(0.6 * max)) break;
    ins.run(id, p);
    summe += p;
  }
  r = await s.get(V9);
  assert.equal(r.body.frei, false, `${summe} von ${max}`);
  const naechste = ids.find((id) => !u.db.prepare("SELECT 1 FROM fortschritt WHERE sub = 's:1042' AND aufgabe = ?").get(id));
  ins.run(naechste, u.inhalte.aufgabe(naechste).punkte);
  r = await s.get(V9);
  assert.equal(r.body.frei, true);
  assert.equal((await s.post(V9 + '/start')).status, 200);
});

test('Akte nicht freigeschaltet → 403; unbekannte Akte → 404; ungültige Akte → 400', async () => {
  const { u, s } = await start({ einstellungen: { akten: [] } });
  assert.equal((await s.get(V9)).status, 403);
  assert.equal((await s.post(V9 + '/start')).status, 403);
  H.einstellen(u.db, 'k:17', { akten: [9] });
  assert.equal((await s.get(`${K17}/verhoere/8`)).status, 404);
  assert.equal((await s.get(`${K17}/verhoere/abc`)).status, 400);
});

/* ---------------------------------------------------------------- Rechte */

test('Rechte: fremder Kurs 403 (auch mit erratener Versuchs-id), gesperrter Kurs: Schüler 403, Lehrkraft nur lesend', async () => {
  const { u, s } = await start();
  const v = (await s.post(V9 + '/start')).body;
  const fremd = await H.client(u, H.FREMD);
  assert.equal((await fremd.get(V9)).status, 403);
  assert.equal((await fremd.post(V9 + '/start')).status, 403);
  assert.equal((await fremd.get(V9 + '/versuch')).status, 403);
  assert.equal((await fremd.post(V9 + '/antwort', { aufgabe: v.aufgaben[0].id, antwort: ['a'] })).status, 403);
  // eigener Kurs k:18 hat keinen Versuch – Versuche anderer bleiben unsichtbar
  H.einstellen(u.db, 'k:18', { akten: [9], verhoer: 'offen' });
  const eigen = await fremd.get(`${K18}/verhoere/9/versuch`);
  assert.equal(eigen.status, 404);
  // anderer Schüler im selben Kurs sieht den Versuch nicht
  const s2 = await H.client(u, H.SCHUELER2);
  assert.equal((await s2.get(V9 + '/versuch')).status, 404);
  assert.equal((await s2.post(V9 + '/antwort', { aufgabe: v.aufgaben[0].id, antwort: ['a'] })).status, 409);

  u.db.prepare("UPDATE kurse SET aktiv = 0 WHERE kurs_id = 'k:17'").run();
  assert.equal((await s.get(V9)).status, 403);
  assert.equal((await s.post(V9 + '/antwort', { aufgabe: v.aufgaben[0].id, antwort: ['a'] })).status, 403);
  const l = await H.client(u, H.LEHRKRAFT);
  assert.equal((await l.get(V9)).status, 200);
  assert.equal((await l.post(V9 + '/start')).status, 403);
});

test('Ohne Anmeldung 401; Origin-Prüfung bei POST', async () => {
  const { u } = await start();
  assert.equal((await request(u.app).get(V9)).status, 401);
  const s = await H.client(u, H.SCHUELERIN);
  const r = await request(u.app).post(V9 + '/start').set('Cookie', s.cookie).set('Origin', 'https://boese.example').send({});
  assert.equal(r.status, 403);
});

test('Lehrkraft testet: auch bei gesperrtem Verhör, ohne 12-h-Pause, zählt nicht in der Kursübersicht', async () => {
  const { u, s } = await start({ einstellungen: { verhoer: 'gesperrt' } });
  const l = await H.client(u, H.LEHRKRAFT);
  const st = await l.get(V9);
  assert.equal(st.body.frei, true);
  const e1 = await spieleVerhoer(u, l, 3);
  assert.equal(e1.prozent, 100);
  const e2 = await spieleVerhoer(u, l, 0);
  assert.equal(e2.punkte, 0);
  assert.equal((await s.get(V9)).body.frei, false, 'Schüler weiterhin gesperrt');
  const token = verbundToken(u.schluessel, u.konfig, 'kurs-uebersicht');
  const r = await request(u.app).get('/api/verbund/kurse/k%3A17/uebersicht').set('Authorization', 'Bearer ' + token);
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.schueler.map((x) => [x.sub, x.punkte]), [['s:1042', 0]]);
  const feed = u.db.prepare("SELECT art FROM erfolge WHERE sub = 'l:7'").all();
  assert.deepEqual(feed, [], 'kein Erfolge-Feed für Lehrkräfte');
});

/* ---------------------------------------------------------------- gA-Kurs (Fixture-Variante) */

test('gA-Kurs zieht nur Aufgaben für alle (Pool mit eA-Aufgabe)', async (t) => {
  const d = H.beispiel();
  const v04 = d.aufgaben.find((a) => a.id === 'A9-V-04');
  v04.niveau = 'eA';
  const v05 = { ...structuredClone(v04), id: 'A9-V-05', titel: 'Bedingungslogik II', niveau: undefined };
  delete v05.niveau;
  d.aufgaben.push(v05);
  d.boss.pool.push('A9-V-05');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'verhoer-ga-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const datei = path.join(dir, 'akte_beispiel.json');
  fs.writeFileSync(datei, JSON.stringify(d));
  // eigene Umgebung: nur die Variante (gleiche welt 9)
  const uhr = { t: Date.now() };
  const { erzeugeInhalte } = require('../src/services/inhalte');
  const { testApp } = require('./helpers');
  let inhalte;
  const u = testApp({ jetzt: () => uhr.t }, (db) => {
    inhalte = erzeugeInhalte(db);
    inhalte.laden({ verzeichnis: H.KEINE_AKTEN, dateien: [datei] });
    return { inhalte, pruefer: H.stubPruefer() };
  });
  u.inhalte = inhalte;
  const l = await H.client(u, H.LEHRKRAFT);
  H.einstellen(u.db, 'k:17', { akten: [9], niveau: 'gA', verhoer: 'offen' });
  const gesehen = new Set();
  for (let i = 0; i < 12; i++) {
    const v = (await l.post(V9 + '/start')).body;
    assert.equal(v.aufgaben.length, 3);
    v.aufgaben.forEach((a) => gesehen.add(a.id));
    await l.post(V9 + '/abgeben');
  }
  assert.ok(!gesehen.has('A9-V-04'), 'eA-Aufgabe nie im gA-Kurs');
  assert.ok(gesehen.has('A9-V-05'));
});

/* ---------------------------------------------------------------- Integration mit echter Sandbox */

test('Integration: echter SQL-Prüfer (Sandbox, verhoer/kiosk) – richtig gewertet, Unterabfrage im Abimodus streng falsch', async (t) => {
  const { ladeAlle } = require('../scripts/db_bauen');
  const { erzeugeSandbox } = require('../src/sql/sandbox');
  const { schemaAus } = require('../src/sql/schema');
  const { erzeugePruefer } = require('../src/sql/pruefer');
  const datenbanken = ladeAlle(undefined, { namen: ['verhoer/kiosk'] });
  const sandbox = erzeugeSandbox({ prozesse: 1, datenbanken });
  t.after(() => sandbox.beende());
  const pruefer = erzeugePruefer({ sandbox, schemata: { 'verhoer/kiosk': schemaAus(datenbanken['verhoer/kiosk'].haupt) } });

  const { u, s, uhr } = await start({ pruefer });
  let v = (await s.post(V9 + '/start')).body;
  let r = await s.post(V9 + '/antwort', { aufgabe: 'A9-V-03', antwort: "SELECT Bezeichnung, Preis\nFROM Produkt\nWHERE Kategorie = 'Getränk'\nORDER BY Preis DESC" });
  assert.deepEqual(r.body, { gespeichert: true });
  let erg = JSON.parse(u.db.prepare('SELECT ergebnisse_json FROM verhoer_versuche WHERE id = ?').get(v.id).ergebnisse_json);
  assert.deepEqual(erg['A9-V-03'], { ok: true, punkte: 20 });
  // gleiches Ergebnis, aber mit Unterabfrage: im Verhör (streng) falsch
  r = await s.post(V9 + '/antwort', {
    aufgabe: 'A9-V-03',
    antwort: "SELECT Bezeichnung, Preis\nFROM Produkt\nWHERE Kategorie IN (SELECT Kategorie FROM Produkt WHERE Kategorie = 'Getränk')\nORDER BY Preis DESC"
  });
  assert.deepEqual(r.body, { gespeichert: true });
  erg = JSON.parse(u.db.prepare('SELECT ergebnisse_json FROM verhoer_versuche WHERE id = ?').get(v.id).ergebnisse_json);
  assert.deepEqual(erg['A9-V-03'], { ok: false, punkte: 0 });
  const ab = await s.post(V9 + '/abgeben');
  assert.equal(ab.body.aufgaben.find((a) => a.id === 'A9-V-03').richtig, false);
  keineLoesungsdaten(ab.body, 'Abgabe (Sandbox)');
  uhr.t += SPERRE_MS;
  v = (await s.post(V9 + '/start')).body;
  assert.equal(v.laeuft, true);
});
