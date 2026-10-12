'use strict';
// Datenmodell Phase 3 (Migration 2, Spec §7.15) und vollständige Löschung über die Verbund-API (Vertrag §6).
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { oeffneDb, MIGRATIONEN } = require('../src/db');
const { upsertAusToken, loescheKonto, loescheKurs, KONTO_TABELLEN, KURS_TABELLEN } = require('../src/kern/konten');
const { testApp, verbundToken } = require('./helpers');

const LERNSTAND = [
  'fortschritt',
  'fallen_zaehler',
  'abzeichen',
  'erfolge',
  'verhoer_versuche',
  'leitner',
  'training',
  'kernpunkte'
];
const NEU = ['akten', 'aufgaben', ...LERNSTAND, 'fehlabfragen'];

const zahl = (db, sql, ...p) => db.prepare(sql).get(...p).n;

function anmelden(db, sub, name, kurse) {
  upsertAusToken(db, {
    sub,
    rolle: 'schueler',
    name,
    kurse: kurse.map((id) => ({ id, name: 'Inf ' + id, rolle: 'mitglied' }))
  });
}

/** Je Lernstand-Tabelle eine Zeile für (sub, kurs); liefert die Zahl eingefügter Zeilen. */
function lernstandFuer(db, sub, kurs) {
  const t = '2026-10-12T10:00:00Z';
  db.prepare(
    "INSERT INTO fortschritt (sub, kurs_id, aufgabe, status, fehlversuche, tipps, punkte, zeit) VALUES (?, ?, 'A1-E1-01', 'geloest', 1, 0, 8, ?)"
  ).run(sub, kurs, t);
  db.prepare("INSERT INTO fortschritt (sub, kurs_id, aufgabe, status, zeit) VALUES (?, ?, 'A1-E1-02', 'angesehen', ?)").run(sub, kurs, t);
  db.prepare("INSERT INTO fallen_zaehler (sub, kurs_id, falle, anzahl) VALUES (?, ?, 'P5', 2)").run(sub, kurs);
  db.prepare("INSERT INTO abzeichen (sub, kurs_id, abzeichen, zeit) VALUES (?, ?, 'erste-spur', ?)").run(sub, kurs, t);
  db.prepare("INSERT INTO erfolge (kurs_id, sub, art, zeit) VALUES (?, ?, 'abzeichen:erste-spur', ?)").run(kurs, sub, t);
  db.prepare(
    "INSERT INTO verhoer_versuche (sub, kurs_id, akte, aufgaben_json, beginn, ende, punkte, max) VALUES (?, ?, 1, '[]', ?, NULL, 0, 100)"
  ).run(sub, kurs, t);
  db.prepare("INSERT INTO leitner (sub, kurs_id, karte, fach, faellig) VALUES (?, ?, 'W1-01', 2, '2026-10-13')").run(sub, kurs);
  db.prepare("INSERT INTO training (sub, kurs_id, tag, anzahl, punkte) VALUES (?, ?, '2026-10-12', 5, 5)").run(sub, kurs);
  db.prepare("INSERT INTO kernpunkte (sub, kurs_id, aufgabe, haken) VALUES (?, ?, 'A1-E1-11', 2)").run(sub, kurs);
  return 9;
}

function fehlabfrage(db, kurs) {
  db.prepare(
    "INSERT INTO fehlabfragen (kurs_id, aufgabe, sql_norm, anzahl, zuletzt) VALUES (?, 'A1-E1-03', 'SELECT * FROM FUNDSACHE', 3, '2026-10-12T10:00:00Z')"
  ).run(kurs);
  return 1;
}

/** Zwei Schüler in zwei Kursen, Lernstand je sub × Kurs, Fehlabfragen je Kurs. */
function befuellt() {
  const db = oeffneDb(':memory:');
  anmelden(db, 's:1042', 'Lena K.', ['k:17', 'k:18']);
  anmelden(db, 's:1043', 'Mika R.', ['k:17']);
  for (const [s, k] of [['s:1042', 'k:17'], ['s:1042', 'k:18'], ['s:1043', 'k:17']]) lernstandFuer(db, s, k);
  fehlabfrage(db, 'k:17');
  fehlabfrage(db, 'k:18');
  return db;
}

test('Migration 2: alle Tabellen aus Spec §7.15 / Plan Task 4, Schema-Version = Anzahl Migrationen', () => {
  const db = oeffneDb(':memory:');
  assert.ok(MIGRATIONEN.length >= 2);
  const tabellen = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((r) => r.name);
  for (const t of NEU) assert.ok(tabellen.includes(t), t);
  assert.equal(Number(db.prepare("SELECT wert FROM meta WHERE schluessel = 'schema_version'").get().wert), MIGRATIONEN.length);
});

test('fehlabfragen speichern kein sub', () => {
  const db = oeffneDb(':memory:');
  const spalten = db.prepare('PRAGMA table_info(fehlabfragen)').all().map((s) => s.name);
  assert.ok(!spalten.includes('sub'), spalten.join(','));
});

test('Lernstand hängt an konten und kurse (nicht an mitgliedschaften) und bleibt beim Austritt erhalten', () => {
  const db = oeffneDb(':memory:');
  for (const t of LERNSTAND) {
    const fks = db.prepare(`PRAGMA foreign_key_list(${t})`).all();
    const ziele = fks.map((f) => `${f.table}.${f.to}:${f.on_delete}`).sort();
    assert.deepEqual(ziele, ['konten.sub:CASCADE', 'kurse.kurs_id:CASCADE'], t);
  }
  const fk = db.prepare('PRAGMA foreign_key_list(fehlabfragen)').all();
  assert.deepEqual(fk.map((f) => `${f.table}.${f.to}:${f.on_delete}`), ['kurse.kurs_id:CASCADE']);

  anmelden(db, 's:1042', 'Lena K.', ['k:17']);
  lernstandFuer(db, 's:1042', 'k:17');
  anmelden(db, 's:1042', 'Lena K.', []); // Portal hat Lena aus dem Kurs entfernt
  assert.equal(zahl(db, 'SELECT COUNT(*) AS n FROM mitgliedschaften'), 0);
  assert.equal(zahl(db, 'SELECT COUNT(*) AS n FROM fortschritt'), 2, 'Lernstand bleibt bis zur Löschung (Vertrag §5)');
});

test('fortschritt: Status nur aus der Liste, ein Eintrag je sub × Kurs × Aufgabe', () => {
  const db = oeffneDb(':memory:');
  anmelden(db, 's:1042', 'Lena K.', ['k:17']);
  const ins = db.prepare("INSERT INTO fortschritt (sub, kurs_id, aufgabe, status, zeit) VALUES ('s:1042', 'k:17', ?, ?, '')");
  for (const s of ['offen', 'geloest', 'angesehen', 'nachgeloest', 'bearbeitet']) ins.run('A1-E1-' + s, s);
  assert.throws(() => ins.run('A1-E1-99', 'gewonnen'));
  assert.throws(() => ins.run('A1-E1-offen', 'offen'), /UNIQUE|PRIMARY/);
  assert.throws(() => db.prepare("INSERT INTO fortschritt (sub, kurs_id, aufgabe, status, zeit) VALUES ('s:9', 'k:17', 'x', 'offen', '')").run(), /FOREIGN KEY/);
});

test('aufgaben.art nur lab | cc | verhoer', () => {
  const db = oeffneDb(':memory:');
  const ins = db.prepare("INSERT INTO aufgaben (id, akte, ermittlung, art, stufe, punkte, json, fingerabdruck, aktiv) VALUES (?, 1, NULL, ?, 1, 10, '{}', 'x', 1)");
  for (const a of ['lab', 'cc', 'verhoer']) ins.run('A1-' + a, a);
  assert.throws(() => ins.run('A1-boss', 'boss'));
});

test('KONTO_TABELLEN/KURS_TABELLEN enthalten alle Lernstand-Tabellen, Stammzeile zuletzt', () => {
  for (const t of LERNSTAND) {
    assert.ok(KONTO_TABELLEN.includes(t), 'Konto: ' + t);
    assert.ok(KURS_TABELLEN.includes(t), 'Kurs: ' + t);
  }
  assert.ok(KURS_TABELLEN.includes('fehlabfragen'));
  assert.ok(!KONTO_TABELLEN.includes('fehlabfragen'), 'fehlabfragen haben kein sub');
  assert.equal(KONTO_TABELLEN.at(-1), 'konten');
  assert.equal(KURS_TABELLEN.at(-1), 'kurse');
});

test('loescheKonto entfernt den Lernstand in allen Kursen; Zähler stimmt; zweiter Aufruf 0', () => {
  const db = befuellt();
  // 2 × 9 Lernstand-Zeilen + 2 Mitgliedschaften + Konto
  assert.equal(loescheKonto(db, 's:1042'), 2 * 9 + 2 + 1);
  for (const t of LERNSTAND) {
    assert.equal(zahl(db, `SELECT COUNT(*) AS n FROM ${t} WHERE sub = 's:1042'`), 0, t);
    assert.ok(zahl(db, `SELECT COUNT(*) AS n FROM ${t} WHERE sub = 's:1043'`) > 0, 'Mika bleibt: ' + t);
  }
  assert.equal(zahl(db, 'SELECT COUNT(*) AS n FROM fehlabfragen'), 2, 'Fehlabfragen gehören zum Kurs');
  assert.equal(loescheKonto(db, 's:1042'), 0);
});

test('loescheKurs entfernt Lernstand und Fehlabfragen des Kurses; Zähler stimmt; zweiter Aufruf 0', () => {
  const db = befuellt();
  // k:17: 2 Schüler × 9 + 1 Fehlabfrage + 2 Mitgliedschaften + Kurs
  assert.equal(loescheKurs(db, 'k:17'), 2 * 9 + 1 + 2 + 1);
  for (const t of [...LERNSTAND, 'fehlabfragen']) {
    assert.equal(zahl(db, `SELECT COUNT(*) AS n FROM ${t} WHERE kurs_id = 'k:17'`), 0, t);
    assert.ok(zahl(db, `SELECT COUNT(*) AS n FROM ${t} WHERE kurs_id = 'k:18'`) > 0, 'k:18 bleibt: ' + t);
  }
  assert.equal(zahl(db, 'SELECT COUNT(*) AS n FROM konten'), 2, 'Konten bleiben');
  assert.equal(loescheKurs(db, 'k:17'), 0);
});

function verbundLoeschen(t, body) {
  return request(t.app)
    .post('/api/verbund/loeschen')
    .set('Authorization', 'Bearer ' + verbundToken(t.schluessel, t.konfig, 'loeschen'))
    .send(body);
}

test('Verbund-Löschauftrag sub: alle neuen Tabellen leer für das Konto, geloescht = n, dann 0', async () => {
  const t = testApp();
  const db = t.db;
  anmelden(db, 's:1042', 'Lena K.', ['k:17']);
  lernstandFuer(db, 's:1042', 'k:17');
  const r1 = await verbundLoeschen(t, { sub: 's:1042' });
  assert.equal(r1.status, 200);
  assert.deepEqual(r1.body, { geloescht: 9 + 1 + 1 });
  for (const tab of LERNSTAND) assert.equal(zahl(db, `SELECT COUNT(*) AS n FROM ${tab}`), 0, tab);
  const r2 = await verbundLoeschen(t, { sub: 's:1042' });
  assert.deepEqual(r2.body, { geloescht: 0 });
});

test('Verbund-Löschauftrag kurs: Lernstand und Fehlabfragen des Kurses weg, geloescht = n, dann 0', async () => {
  const t = testApp();
  const db = t.db;
  anmelden(db, 's:1042', 'Lena K.', ['k:17']);
  lernstandFuer(db, 's:1042', 'k:17');
  fehlabfrage(db, 'k:17');
  const r1 = await verbundLoeschen(t, { kurs: 'k:17' });
  assert.equal(r1.status, 200);
  assert.deepEqual(r1.body, { geloescht: 9 + 1 + 1 + 1 });
  for (const tab of [...LERNSTAND, 'fehlabfragen']) assert.equal(zahl(db, `SELECT COUNT(*) AS n FROM ${tab}`), 0, tab);
  assert.equal(zahl(db, 'SELECT COUNT(*) AS n FROM konten'), 1, 'Konto bleibt');
  const r2 = await verbundLoeschen(t, { kurs: 'k:17' });
  assert.deepEqual(r2.body, { geloescht: 0 });
});
