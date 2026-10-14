'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { oeffneDb, MIGRATIONEN } = require('../src/db');
const {
  upsertAusToken,
  loescheKonto,
  loescheKurs,
  aendereKurs,
  kursUebersicht,
  STANDARD_EINSTELLUNGEN
} = require('../src/kern/konten');
const { AKTEN } = require('../src/domain');

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

function nutzlast(extra = {}) {
  return {
    sub: 's:1042',
    rolle: 'schueler',
    name: 'Lena K.',
    kurse: [
      { id: 'k:17', name: 'Inf-LK 12', rolle: 'mitglied' },
      { id: 'k:18', name: 'Inf-GK 12', rolle: 'mitglied' }
    ],
    ...extra
  };
}

const mitgliedschaften = (db, sub) =>
  db.prepare('SELECT kurs_id, rolle FROM mitgliedschaften WHERE sub = ? ORDER BY kurs_id').all(sub);

test('Schema: Tabellen, Schema-Version und Fremdschlüssel', () => {
  const db = oeffneDb(':memory:');
  const tabellen = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
    .all()
    .map((r) => r.name);
  for (const t of ['meta', 'konten', 'kurse', 'mitgliedschaften']) assert.ok(tabellen.includes(t), t);
  const version = db.prepare("SELECT wert FROM meta WHERE schluessel = 'schema_version'").get().wert;
  assert.equal(Number(version), MIGRATIONEN.length);
  assert.equal(db.pragma('foreign_keys', { simple: true }), 1);
  assert.throws(() =>
    db.prepare("INSERT INTO konten (sub, name, rolle, zuletzt) VALUES ('x:1', 'X', 'gast', '')").run()
  );
});

test('Datei-DB nutzt WAL und Migrationen laufen nur einmal', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dd-db-'));
  try {
    const datei = path.join(dir, 'plattform.sqlite');
    const db1 = oeffneDb(datei);
    assert.equal(db1.pragma('journal_mode', { simple: true }), 'wal');
    upsertAusToken(db1, nutzlast());
    db1.close();
    const db2 = oeffneDb(datei);
    assert.equal(db2.prepare('SELECT COUNT(*) AS n FROM konten').get().n, 1);
    db2.close();
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('upsert legt Konto, Kurse und Mitgliedschaften an', () => {
  const db = oeffneDb(':memory:');
  const lk = nutzlast({
    sub: 'l:7',
    rolle: 'lehrkraft',
    name: 'Frau M.',
    kurse: [
      { id: 'k:17', name: 'Inf-LK 12', rolle: 'lehrkraft' },
      { id: 'k:18', name: 'Inf-GK 12', rolle: 'mitglied' }
    ]
  });
  const ergebnis = upsertAusToken(db, lk);
  assert.deepEqual(ergebnis, { sub: 'l:7', rolle: 'lehrkraft', name: 'Frau M.' });
  const konto = db.prepare('SELECT * FROM konten WHERE sub = ?').get('l:7');
  assert.equal(konto.name, 'Frau M.');
  assert.equal(konto.rolle, 'lehrkraft');
  assert.match(konto.zuletzt, ISO);
  const kurs = db.prepare('SELECT * FROM kurse WHERE kurs_id = ?').get('k:17');
  assert.equal(kurs.name, 'Inf-LK 12');
  assert.equal(kurs.aktiv, 1);
  assert.deepEqual(JSON.parse(kurs.einstellungen), STANDARD_EINSTELLUNGEN);
  assert.deepEqual(mitgliedschaften(db, 'l:7'), [
    { kurs_id: 'k:17', rolle: 'lehrkraft' },
    { kurs_id: 'k:18', rolle: 'mitglied' }
  ]);
});

test('STANDARD_EINSTELLUNGEN nach Plan', () => {
  assert.deepEqual(STANDARD_EINSTELLUNGEN, {
    akten: [1],
    niveau: 'eA',
    verhoer: 'auto',
    scoreboard: true,
    beamer: false
  });
});

test('erneuter Login ohne Kurs entfernt nur die Mitgliedschaft', () => {
  const db = oeffneDb(':memory:');
  upsertAusToken(db, nutzlast());
  db.prepare("UPDATE kurse SET einstellungen = '{\"akten\":[1,2]}' WHERE kurs_id = 'k:18'").run();
  upsertAusToken(db, nutzlast({ name: 'Lena K', kurse: [{ id: 'k:17', name: 'Inf-LK 12', rolle: 'mitglied' }] }));
  assert.deepEqual(mitgliedschaften(db, 's:1042'), [{ kurs_id: 'k:17', rolle: 'mitglied' }]);
  assert.equal(db.prepare('SELECT name FROM konten WHERE sub = ?').get('s:1042').name, 'Lena K');
  const k18 = db.prepare('SELECT * FROM kurse WHERE kurs_id = ?').get('k:18');
  assert.ok(k18, 'Kurs bleibt');
  assert.equal(k18.einstellungen, '{"akten":[1,2]}', 'Einstellungen bleiben');
});

test('Kursname wird aktualisiert', () => {
  const db = oeffneDb(':memory:');
  upsertAusToken(db, nutzlast());
  upsertAusToken(db, nutzlast({ kurse: [{ id: 'k:17', name: 'Inf-LK 13', rolle: 'mitglied' }] }));
  assert.equal(db.prepare('SELECT name FROM kurse WHERE kurs_id = ?').get('k:17').name, 'Inf-LK 13');
});

test('upsert ist atomar: ungültige Kursrolle ändert nichts', () => {
  const db = oeffneDb(':memory:');
  assert.throws(() =>
    upsertAusToken(db, nutzlast({ kurse: [{ id: 'k:17', name: 'Inf-LK 12', rolle: 'chef' }] }))
  );
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM konten').get().n, 0);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM kurse').get().n, 0);
});

test('loescheKonto ist idempotent', () => {
  const db = oeffneDb(':memory:');
  upsertAusToken(db, nutzlast());
  const n = loescheKonto(db, 's:1042');
  assert.ok(n > 0);
  assert.equal(n, 3, 'Konto + zwei Mitgliedschaften');
  assert.equal(loescheKonto(db, 's:1042'), 0);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM mitgliedschaften').get().n, 0);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM kurse').get().n, 2, 'Kurse bleiben');
});

test('loescheKurs löscht Mitgliedschaften mit', () => {
  const db = oeffneDb(':memory:');
  upsertAusToken(db, nutzlast());
  upsertAusToken(db, nutzlast({ sub: 's:1043', name: 'Mika R.' }));
  const n = loescheKurs(db, 'k:17');
  assert.equal(n, 3, 'Kurs + zwei Mitgliedschaften');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM kurse WHERE kurs_id = ?').get('k:17').n, 0);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM mitgliedschaften WHERE kurs_id = 'k:17'").get().n, 0);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM mitgliedschaften WHERE kurs_id = 'k:18'").get().n, 2);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM konten').get().n, 2, 'Konten bleiben');
  assert.equal(loescheKurs(db, 'k:17'), 0);
});

test('aendereKurs legt unbekannten Kurs an', () => {
  const db = oeffneDb(':memory:');
  aendereKurs(db, 'k:99', { name: 'Inf-GK 11' });
  const kurs = db.prepare('SELECT * FROM kurse WHERE kurs_id = ?').get('k:99');
  assert.equal(kurs.name, 'Inf-GK 11');
  assert.equal(kurs.aktiv, 1);
  assert.deepEqual(JSON.parse(kurs.einstellungen), STANDARD_EINSTELLUNGEN);
  aendereKurs(db, 'k:100', {});
  assert.ok(db.prepare('SELECT * FROM kurse WHERE kurs_id = ?').get('k:100'));
});

test('aktiv false sperrt', () => {
  const db = oeffneDb(':memory:');
  upsertAusToken(db, nutzlast());
  aendereKurs(db, 'k:17', { aktiv: false });
  let kurs = db.prepare('SELECT * FROM kurse WHERE kurs_id = ?').get('k:17');
  assert.equal(kurs.aktiv, 0);
  assert.equal(kurs.name, 'Inf-LK 12', 'Name bleibt ohne Angabe');
  aendereKurs(db, 'k:17', { aktiv: true, name: 'Inf-LK 13' });
  kurs = db.prepare('SELECT * FROM kurse WHERE kurs_id = ?').get('k:17');
  assert.equal(kurs.aktiv, 1);
  assert.equal(kurs.name, 'Inf-LK 13');
  // Gesperrter Kurs wird durch einen Login nicht still entsperrt.
  aendereKurs(db, 'k:17', { aktiv: false });
  upsertAusToken(db, nutzlast());
  assert.equal(db.prepare('SELECT aktiv FROM kurse WHERE kurs_id = ?').get('k:17').aktiv, 0);
});

test('kursUebersicht unbekannter Kurs liefert null', () => {
  const db = oeffneDb(':memory:');
  assert.equal(kursUebersicht(db, 'k:404'), null);
});

test('kursUebersicht bekannter Kurs: Format Vertrag §6, schueler nur Rolle mitglied', () => {
  const db = oeffneDb(':memory:');
  upsertAusToken(db, nutzlast());
  upsertAusToken(db, nutzlast({ sub: 's:1043', name: 'Mika R.' }));
  upsertAusToken(
    db,
    nutzlast({ sub: 'l:7', rolle: 'lehrkraft', name: 'Frau M.', kurse: [{ id: 'k:17', name: 'Inf-LK 12', rolle: 'lehrkraft' }] })
  );
  const u = kursUebersicht(db, 'k:17');
  assert.deepEqual(Object.keys(u).sort(), ['kurs', 'schueler', 'stand', 'welten']);
  assert.equal(u.kurs, 'k:17');
  assert.match(u.stand, ISO);
  assert.deepEqual(u.schueler.map((s) => s.sub), ['s:1042', 's:1043']);
  for (const s of u.schueler) {
    assert.deepEqual(Object.keys(s).sort(), ['anteil', 'geloest', 'punkte', 'sub', 'zuletzt']);
    assert.equal(s.punkte, 0);
    assert.equal(s.geloest, 0);
    assert.equal(s.anteil, 0);
    assert.match(s.zuletzt, ISO);
  }
  assert.deepEqual(u.welten, AKTEN.map((a) => ({ nr: a.nr, titel: a.titel, anteil: 0 })));
  const json = JSON.stringify(u);
  assert.ok(!json.includes('Lena') && !json.includes('Mika') && !json.includes('Frau M.'), 'keine Namen');
});

test('AKTEN: sieben Akten, Akte 5 nur eA', () => {
  assert.equal(AKTEN.length, 7);
  assert.deepEqual(
    AKTEN.map((a) => a.titel),
    ['Das Fundbüro', 'Spur der Räder', 'Die Stadtfest-Kasse', 'Chaos im Vereinsarchiv', 'Der Bauplan', 'Datenspuren', 'Generalprobe']
  );
  assert.deepEqual(AKTEN.map((a) => a.nr), [1, 2, 3, 4, 5, 6, 7]);
  for (const a of AKTEN) assert.deepEqual(a.niveaus, a.nr === 5 ? ['eA'] : ['eA', 'gA']);
});
