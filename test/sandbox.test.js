'use strict';
// Sandbox mit Kindprozessen (Spec §7.4, §18; Plan Phase 2 Task 9, Review Focus 1 und 2).

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const childProcess = require('node:child_process');
const Database = require('better-sqlite3');

const { erzeugeSandbox, vorpruefen } = require('../src/sql/sandbox');

const SEED = path.join(__dirname, '..', 'seed', 'datenbanken');

/** Baut eine DB aus basis.sql und liefert sie serialisiert; `aendern(db)` erzeugt daraus eine Variante. */
function baueBuffer(name, aendern) {
  const db = new Database(':memory:');
  db.exec(fs.readFileSync(path.join(SEED, name, 'basis.sql'), 'utf8'));
  if (aendern) aendern(db);
  const buffer = db.serialize();
  db.close();
  return buffer;
}

function zaehle(buffer, tabelle) {
  const db = new Database(buffer);
  const n = db.prepare('SELECT COUNT(*) AS n FROM ' + tabelle).get().n;
  db.close();
  return n;
}

const datenbanken = {
  stadtrad: {
    haupt: baueBuffer('stadtrad'),
    varianten: { null: baueBuffer('stadtrad', (db) => db.exec('DELETE FROM Reparatur WHERE ReparaturID > 3')) }
  },
  fundbuero: { haupt: baueBuffer('fundbuero'), varianten: {} },
  tus: { haupt: baueBuffer('tus'), varianten: {} },
  eisdiele: { haupt: baueBuffer('eisdiele'), varianten: {} }
};
const ANZAHL_AUSLEIHE = zaehle(datenbanken.stadtrad.haupt, 'Ausleihe');
const ANZAHL_REPARATUR = zaehle(datenbanken.stadtrad.haupt, 'Reparatur');
const ENDLOS = 'WITH RECURSIVE z(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM z) SELECT COUNT(*) FROM z';

/** Wartet, bis alle Prozesse ihre Buffer geladen haben. */
async function bisBereit(sb) {
  while (!sb.status().prozesse.every((p) => p.bereit)) await new Promise((r) => setTimeout(r, 10));
}

let sandbox;
before(() => {
  sandbox = erzeugeSandbox({ prozesse: 2, zeitlimitMs: 1500, maxZeilen: 5000, datenbanken });
});
after(() => sandbox.beende());

// ---------- Vorprüfung (Elternprozess) ----------

test('Vorprüfung: verbotene Wörter außerhalb von Strings und Kommentaren, Länge, leere Abfrage', () => {
  assert.equal(vorpruefen('SELECT 1').ok, true);
  assert.equal(vorpruefen("SELECT 'ATTACH pragma load_extension' FROM Station").ok, true, 'in String erlaubt');
  assert.equal(vorpruefen('SELECT 1 -- PRAGMA\n').ok, true, 'im Zeilenkommentar erlaubt');
  assert.equal(vorpruefen('SELECT /* VACUUM */ 1').ok, true, 'im Blockkommentar erlaubt');
  assert.equal(vorpruefen("SELECT Name FROM Station WHERE Name = 'it''s ATTACH'").ok, true, 'verdoppeltes Hochkomma');
  assert.equal(vorpruefen('SELECT Vacuumzeit FROM T').ok, true, 'nur ganze Wörter');
  for (const [sql, wort] of [
    ["ATTACH 'x' AS y", 'ATTACH'],
    ['detach y', 'DETACH'],
    ['PRAGMA table_info(Station)', 'PRAGMA'],
    ['SELECT * FROM pragma_table_info(\'Station\')', 'PRAGMA'],
    ['vacuum', 'VACUUM'],
    ["SELECT load_extension('x')", 'LOAD_EXTENSION'],
    ['SELECT "load_extension"(\'x\')', 'LOAD_EXTENSION'],
    ['.tables', '.'],
    ['SELECT 1\n  .schema', '.'],
    ["SELECT 'a' /* x */ ; Pragma query_only = OFF", 'PRAGMA']
  ]) {
    const e = vorpruefen(sql);
    assert.equal(e.ok, false, sql);
    assert.equal(e.code, 'verboten', sql);
    assert.equal(e.wort, wort, sql);
  }
  const lang = vorpruefen('SELECT ' + '1 + '.repeat(1000) + '1');
  assert.equal(lang.code, 'zu_lang');
  assert.equal(vorpruefen('SELECT ' + ' '.repeat(3993)).ok, true, 'genau 4000 Zeichen');
  assert.equal(vorpruefen('   ').code, 'leer');
  assert.equal(vorpruefen(null).code, 'leer');
});

// ---------- normale Ausführung ----------

test('SELECT liefert Spalten, Zeilen als Arrays, Anzahl und Laufzeit', async () => {
  const e = await sandbox.fuehreAus({ db: 'stadtrad', sql: 'SELECT StationID, Name FROM Station WHERE StationID <= 2 ORDER BY StationID' });
  assert.equal(e.ok, true);
  assert.deepEqual(e.spalten, ['StationID', 'Name']);
  assert.deepEqual(e.zeilen, [[1, 'Bahnhof Nord'], [2, 'Bahnhof Süd']]);
  assert.equal(e.anzahl, 2);
  assert.equal(e.abgeschnitten, false);
  assert.equal(typeof e.ms, 'number');
});

test('Variante wird gewählt; unbekannte DB/Variante → unbekannte_db', async () => {
  const haupt = await sandbox.fuehreAus({ db: 'stadtrad', sql: 'SELECT COUNT(*) FROM Reparatur' });
  const variante = await sandbox.fuehreAus({ db: 'stadtrad', variante: 'null', sql: 'SELECT COUNT(*) FROM Reparatur' });
  assert.equal(haupt.zeilen[0][0], ANZAHL_REPARATUR);
  assert.equal(variante.zeilen[0][0], 3);
  assert.equal((await sandbox.fuehreAus({ db: 'gibtsnicht', sql: 'SELECT 1' })).code, 'unbekannte_db');
  assert.equal((await sandbox.fuehreAus({ db: 'stadtrad', variante: 'gibtsnicht', sql: 'SELECT 1' })).code, 'unbekannte_db');
  assert.equal((await sandbox.fuehreAus({ db: 'constructor', sql: 'SELECT 1' })).code, 'unbekannte_db');
});

test('SQL-Fehler → sql_fehler mit Rohmeldung von SQLite', async () => {
  const e = await sandbox.fuehreAus({ db: 'eisdiele', sql: 'SELECT * FROM GibtEsNicht' });
  assert.equal(e.ok, false);
  assert.equal(e.code, 'sql_fehler');
  assert.match(e.text, /no such table: GibtEsNicht/);
});

test('Zeilenlimit: mehr als 5 000 Zeilen → abgeschnitten, anzahl = 5 000', async () => {
  const start = Date.now();
  const e = await sandbox.fuehreAus({ db: 'stadtrad', sql: 'SELECT * FROM Ausleihe a, Ausleihe b' });
  assert.equal(e.ok, true);
  assert.equal(e.abgeschnitten, true);
  assert.equal(e.anzahl, 5000);
  assert.equal(e.zeilen.length, 5000);
  assert.equal(e.spalten.length, 18);
  assert.ok(Date.now() - start < 1600);
});

// ---------- Review Focus 2: Ablehnung ohne Ausführung, Haupt-DB unverändert ----------

test('Schreib- und Sonderanweisungen werden abgelehnt; die Haupt-DB bleibt unverändert', async () => {
  const faelle = [
    ['SELECT 1; DROP TABLE Ausleihe', 'mehrere_anweisungen'],
    ['SELECT 1; DELETE FROM Ausleihe', 'mehrere_anweisungen'],
    ["ATTACH 'x' AS y", 'verboten'],
    ['PRAGMA query_only = OFF', 'verboten'],
    ["SELECT load_extension('x')", 'verboten'],
    ['.tables', 'verboten'],
    ['INSERT INTO Ausleihe (AusleihID) VALUES (99999)', 'nicht_lesend'],
    ['UPDATE Ausleihe SET Preis = 0', 'nicht_lesend'],
    ['DELETE FROM Ausleihe', 'nicht_lesend'],
    ['DROP TABLE Ausleihe', 'nicht_lesend'],
    ['CREATE TABLE Beweis (x)', 'nicht_lesend'],
    ['WITH a AS (SELECT 1) DELETE FROM Ausleihe', 'nicht_lesend'],
    ['BEGIN', 'nicht_lesend'],
    ['SAVEPOINT s', 'nicht_lesend']
  ];
  for (const [sql, code] of faelle) {
    const e = await sandbox.fuehreAus({ db: 'stadtrad', sql });
    assert.equal(e.ok, false, sql);
    assert.equal(e.code, code, sql);
    assert.equal(typeof e.text, 'string');
  }
  const n = await sandbox.fuehreAus({ db: 'stadtrad', sql: 'SELECT COUNT(*) FROM Ausleihe' });
  assert.equal(n.zeilen[0][0], ANZAHL_AUSLEIHE);
  const t = await sandbox.fuehreAus({ db: 'stadtrad', sql: "SELECT COUNT(*) FROM sqlite_master WHERE name = 'Beweis'" });
  assert.equal(t.zeilen[0][0], 0);
  // auch der Buffer im Elternprozess ist unverändert
  assert.equal(zaehle(datenbanken.stadtrad.haupt, 'Ausleihe'), ANZAHL_AUSLEIHE);
});

test('zu lange Abfrage → zu_lang, ohne Ausführung', async () => {
  const e = await sandbox.fuehreAus({ db: 'stadtrad', sql: 'SELECT ' + 'x'.repeat(4001) });
  assert.equal(e.code, 'zu_lang');
});

// ---------- Review Focus 1: Zeitlimit, Pool danach voll einsatzbereit ----------

test('Endlosabfrage → zeitlimit nach ~1,5 s; zwei parallele Endlosabfragen + eine normale → normale < 3,5 s', async () => {
  const pidsVorher = sandbox.status().prozesse.map((p) => p.pid);
  const start = Date.now();
  const endlos1 = sandbox.fuehreAus({ db: 'stadtrad', sql: ENDLOS });
  const endlos2 = sandbox.fuehreAus({ db: 'tus', sql: ENDLOS });
  const normal = sandbox.fuehreAus({ db: 'fundbuero', sql: 'SELECT 42' }).then((e) => ({ e, ms: Date.now() - start }));
  const [a, b, c] = await Promise.all([endlos1, endlos2, normal]);
  const gesamt = Date.now() - start;
  assert.equal(a.code, 'zeitlimit');
  assert.equal(b.code, 'zeitlimit');
  assert.ok(gesamt >= 1400, 'nicht zu früh abgebrochen: ' + gesamt);
  assert.equal(c.e.ok, true);
  assert.deepEqual(c.e.zeilen, [[42]]);
  assert.ok(c.ms < 3500, 'normale Abfrage zu spät: ' + c.ms + ' ms');

  // Pool wieder voll: zwei Prozesse, neue PIDs, beide beantworten parallel Abfragen
  const status = sandbox.status();
  assert.equal(status.prozesse.length, 2);
  for (const p of status.prozesse) assert.ok(!pidsVorher.includes(p.pid), 'getöteter Prozess wurde ersetzt');
  const t0 = Date.now();
  const parallel = await Promise.all([1, 2, 3, 4].map((i) => sandbox.fuehreAus({ db: 'stadtrad', sql: 'SELECT ' + i })));
  assert.deepEqual(parallel.map((e) => e.zeilen[0][0]), [1, 2, 3, 4]);
  assert.ok(Date.now() - t0 < 1000);
});

test('großes Kreuzprodukt blockiert nicht länger als ~1,6 s', async () => {
  const start = Date.now();
  const e = await sandbox.fuehreAus({ db: 'stadtrad', sql: 'SELECT COUNT(*) FROM Ausleihe a, Ausleihe b, Ausleihe c' });
  const ms = Date.now() - start;
  assert.ok(e.code === 'zeitlimit' || e.abgeschnitten === true || e.ok === true, JSON.stringify(e).slice(0, 200));
  assert.ok(ms < 1700, 'zu lange: ' + ms);
  const f = await sandbox.fuehreAus({ db: 'stadtrad', sql: 'SELECT * FROM Ausleihe a, Ausleihe b, Ausleihe c' });
  assert.equal(f.abgeschnitten, true);
  const danach = await sandbox.fuehreAus({ db: 'stadtrad', sql: 'SELECT COUNT(*) FROM Station' });
  assert.equal(danach.ok, true);
});

// ---------- Absturz, Warteschlange ----------

test('Absturz eines Prozesses: laufende Anfrage → absturz, Prozess wird ersetzt', async () => {
  const laufend = sandbox.fuehreAus({ db: 'stadtrad', sql: ENDLOS });
  await new Promise((r) => setTimeout(r, 150));
  const belegt = sandbox.status().prozesse.find((p) => p.belegt);
  assert.ok(belegt, 'ein Prozess ist belegt');
  process.kill(belegt.pid, 'SIGKILL');
  const e = await laufend;
  assert.equal(e.ok, false);
  assert.equal(e.code, 'absturz');
  const danach = await Promise.all([sandbox.fuehreAus({ db: 'eisdiele', sql: 'SELECT 1' }), sandbox.fuehreAus({ db: 'eisdiele', sql: 'SELECT 2' })]);
  assert.ok(danach.every((x) => x.ok));
  const status = sandbox.status();
  assert.equal(status.prozesse.length, 2);
  assert.ok(!status.prozesse.some((p) => p.pid === belegt.pid));
});

test('Warteschlange: FIFO, höchstens 50 wartend, sonst ueberlastet', async () => {
  const klein = erzeugeSandbox({ prozesse: 1, zeitlimitMs: 300, datenbanken });
  try {
    await bisBereit(klein);
    const reihenfolge = [];
    const zusagen = [];
    zusagen.push(klein.fuehreAus({ db: 'eisdiele', sql: ENDLOS })); // belegt den einzigen Prozess
    for (let i = 0; i < 50; i++) {
      zusagen.push(klein.fuehreAus({ db: 'eisdiele', sql: 'SELECT ' + i }).then((e) => { reihenfolge.push(e.zeilen[0][0]); return e; }));
    }
    const zuViel = await klein.fuehreAus({ db: 'eisdiele', sql: 'SELECT 999' });
    assert.equal(zuViel.code, 'ueberlastet');
    assert.equal(klein.status().wartend, 50);
    const alle = await Promise.all(zusagen);
    assert.equal(alle[0].code, 'zeitlimit');
    assert.deepEqual(reihenfolge, Array.from({ length: 50 }, (_, i) => i));
  } finally {
    klein.beende();
  }
});

test('beende(): wartende und laufende Anfragen werden beantwortet, Prozesse sind weg', async () => {
  const kurz = erzeugeSandbox({ prozesse: 1, datenbanken });
  const laufend = kurz.fuehreAus({ db: 'eisdiele', sql: ENDLOS });
  const wartend = kurz.fuehreAus({ db: 'eisdiele', sql: 'SELECT 1' });
  await new Promise((r) => setTimeout(r, 100));
  const pids = kurz.status().prozesse.map((p) => p.pid);
  kurz.beende();
  assert.equal((await laufend).ok, false);
  assert.equal((await wartend).ok, false);
  assert.equal((await kurz.fuehreAus({ db: 'eisdiele', sql: 'SELECT 1' })).ok, false);
  await new Promise((r) => setTimeout(r, 100));
  for (const pid of pids) assert.throws(() => process.kill(pid, 0), 'Prozess ' + pid + ' läuft noch');
});

// ---------- Umgebung des Kindprozesses ----------

test('Kindprozess startet ohne SESSION_SECRET (nur NODE_ENV), ohne execArgv, mit advanced-Serialisierung', async () => {
  const altesGeheimnis = process.env.SESSION_SECRET;
  process.env.SESSION_SECRET = 'geheim-nur-im-elternprozess';
  const originalFork = childProcess.fork;
  const aufrufe = [];
  childProcess.fork = function (...args) {
    aufrufe.push(args);
    return originalFork.apply(this, args);
  };
  let sb;
  try {
    sb = erzeugeSandbox({ prozesse: 1, datenbanken });
    assert.equal(aufrufe.length, 1);
    const optionen = aufrufe[0][2];
    assert.deepEqual(Object.keys(optionen.env), ['NODE_ENV']);
    assert.deepEqual(optionen.execArgv, []);
    assert.equal(optionen.serialization, 'advanced');
    assert.match(aufrufe[0][0], /sandbox-prozess\.js$/);
    // echter Blick in die Umgebung des laufenden Kindprozesses (Linux)
    assert.equal((await sb.fuehreAus({ db: 'eisdiele', sql: 'SELECT 1' })).ok, true);
    const pid = sb.status().prozesse[0].pid;
    const datei = '/proc/' + pid + '/environ';
    if (fs.existsSync(datei)) {
      const umgebung = fs.readFileSync(datei, 'utf8');
      assert.ok(!umgebung.includes('SESSION_SECRET'));
      assert.ok(!umgebung.includes('geheim-nur-im-elternprozess'));
    }
  } finally {
    childProcess.fork = originalFork;
    if (altesGeheimnis === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = altesGeheimnis;
    if (sb) sb.beende();
  }
});

test('Speicher: riesige Werte (zeroblob, Verdopplung per rekursiver CTE) → ergebnis_zu_gross, kein Absturz', async () => {
  const blob = await sandbox.fuehreAus({ db: 'stadtrad', sql: 'SELECT zeroblob(900000000)' });
  assert.equal(blob.ok, false, JSON.stringify(blob).slice(0, 200));
  assert.equal(blob.code, 'ergebnis_zu_gross');
  const verdoppelt = await sandbox.fuehreAus({
    db: 'stadtrad',
    sql: "WITH RECURSIVE t(n, s) AS (SELECT 1, 'x' UNION ALL SELECT n + 1, s || s FROM t WHERE n < 40) SELECT n, s FROM t"
  });
  assert.equal(verdoppelt.ok, false);
  assert.equal(verdoppelt.code, 'ergebnis_zu_gross');
  // viele mittelgroße Werte: Zeilenzahl klein, Bytes groß
  const breit = await sandbox.fuehreAus({ db: 'stadtrad', sql: 'SELECT zeroblob(1000000) FROM Station, Station' });
  assert.equal(breit.ok, false);
  assert.equal(breit.code, 'ergebnis_zu_gross');
  const normal = await sandbox.fuehreAus({ db: 'stadtrad', sql: 'SELECT COUNT(*) FROM Station' });
  assert.equal(normal.ok, true, 'Prozess arbeitet danach normal weiter');
});

test('Diagnose: ergebnis_zu_gross → deutscher Text, Art fehler (keine Rohmeldung)', () => {
  const { ausSandboxFehler } = require('../src/sql/diagnose');
  const d = ausSandboxFehler({ ok: false, code: 'ergebnis_zu_gross', text: 'Ergebnis zu groß' });
  assert.equal(d.code, 'ERGEBNIS_ZU_GROSS');
  assert.equal(d.art, 'fehler');
  assert.match(d.text, /zu groß/);
});
