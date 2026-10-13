'use strict';
// Kür K1: Schreib-Sandbox (Plan Phase 6 Task 7, Review Focus 3). Schreibzugriff nur auf die eigene In-Memory-DB je
// Anfrage, Grenzen (Zeit, Zeilen, Tabellen, Größe, Anweisungen), nie auf Akten-DBs oder die Plattform-DB.

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Database = require('better-sqlite3');

const { erzeugeSandbox } = require('../src/sql/sandbox');
const { zerlege, vorpruefenSkript, artVon, MAX_SKRIPT } = require('../src/sql/skript');
const FS = require('../src/sql/fehlertexte_schreiben');

const SEED = path.join(__dirname, '..', 'seed', 'datenbanken');

function baueBuffer(name) {
  const db = new Database(':memory:');
  db.exec(fs.readFileSync(path.join(SEED, name, 'basis.sql'), 'utf8'));
  const b = db.serialize();
  db.close();
  return b;
}

const DETEKTEI = baueBuffer('detektei');
const ANZAHL_PERSON = (() => {
  const db = new Database(DETEKTEI);
  const n = db.prepare('SELECT COUNT(*) FROM Person').pluck().get();
  db.close();
  return n;
})();

const ERMITTLER = 'CREATE TABLE Ermittler (\n  ErmittlerNr INTEGER PRIMARY KEY,\n  Name TEXT NOT NULL,\n  Dienstgrad TEXT\n);';

let sandbox;
before(() => {
  sandbox = erzeugeSandbox({ prozesse: 2, zeitlimitMs: 1500, datenbanken: { detektei: { haupt: DETEKTEI, varianten: {} } } });
});
after(() => sandbox.beende());

// ---------- reine Hilfen ----------

test('zerlege: Anweisungen an ; außerhalb von Texten, Bezeichnern und Kommentaren, mit Startzeile', () => {
  const s = "-- Kopf\nCREATE TABLE a (x TEXT);\nINSERT INTO a VALUES ('1;2');\n/* ; */ SELECT \"x;y\" FROM a\n;\n  ;";
  const { anweisungen } = zerlege(s);
  assert.deepEqual(
    anweisungen.map((a) => [a.sql.replace(/\s+/g, ' '), a.zeile]),
    [
      ['-- Kopf CREATE TABLE a (x TEXT)', 1],
      ["INSERT INTO a VALUES ('1;2')", 3],
      ['/* ; */ SELECT "x;y" FROM a', 4]
    ]
  );
  assert.equal(artVon('  create table a (x)'), 'CREATE TABLE');
  assert.equal(artVon('insert into a values (1)'), 'INSERT');
  assert.equal(artVon('-- x\nSELECT 1'), 'SELECT');
});

test('vorpruefenSkript: verbotene Wörter (ATTACH, PRAGMA, VACUUM, TEMP, TRIGGER, VIEW …), Länge, Leere', () => {
  assert.equal(vorpruefenSkript(ERMITTLER + "\nINSERT INTO Ermittler VALUES (1, 'pragma attach', NULL);").ok, true);
  for (const [skript, wort] of [
    ["ATTACH DATABASE '/tmp/x.db' AS x;", 'ATTACH'],
    ['PRAGMA foreign_keys = OFF;', 'PRAGMA'],
    ["SELECT * FROM pragma_table_info('a');", 'PRAGMA'],
    ["VACUUM INTO '/tmp/kopie.db';", 'VACUUM'],
    ["SELECT load_extension('x');", 'LOAD_EXTENSION'],
    ['CREATE TEMP TABLE t (x);', 'TEMP'],
    ['CREATE TEMPORARY TABLE t (x);', 'TEMP'],
    ['CREATE TRIGGER t AFTER INSERT ON a BEGIN DELETE FROM a; END;', 'TRIGGER'],
    ['CREATE VIEW v AS SELECT 1;', 'VIEW'],
    ['CREATE VIRTUAL TABLE v USING fts5(x);', 'VIRTUAL'],
    ['DETACH x;', 'DETACH'],
    ['.tables', '.']
  ]) {
    const r = vorpruefenSkript(skript);
    assert.equal(r.ok, false, skript);
    assert.equal(r.code, 'verboten', skript);
    assert.equal(r.wort, wort, skript);
  }
  assert.equal(vorpruefenSkript('').code, 'leer');
  assert.equal(vorpruefenSkript('-- nur ein Kommentar\n;').code, 'leer');
  assert.equal(vorpruefenSkript('x'.repeat(MAX_SKRIPT + 1)).code, 'zu_lang');
  assert.equal(vorpruefenSkript('SELECT 1;'.repeat(201)).code, 'zu_viele_anweisungen');
});

// ---------- Ausführen ----------

test('Skript: CREATE TABLE, INSERT, SELECT in einer frischen leeren DB; Protokoll, letztes Ergebnis, Schema', async () => {
  const skript = `${ERMITTLER}\nINSERT INTO Ermittler VALUES (1, 'Edda Lorenz', 'Leitung');\nINSERT INTO Ermittler VALUES (2, 'Juri Brandt', 'Junior');\nSELECT Name FROM Ermittler ORDER BY ErmittlerNr;`;
  const r = await sandbox.fuehreSkriptAus({ skript });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.deepEqual(r.protokoll.map((p) => [p.art, p.aenderungen, p.zeile]), [
    ['CREATE TABLE', 0, 1],
    ['INSERT', 1, 6],
    ['INSERT', 1, 7],
    ['SELECT', null, 8]
  ]);
  assert.deepEqual(r.ergebnis.spalten, ['Name']);
  assert.deepEqual(r.ergebnis.zeilen, [['Edda Lorenz'], ['Juri Brandt']]);
  assert.equal(r.tabellen.length, 1);
  assert.equal(r.tabellen[0].tabelle, 'Ermittler');
  assert.equal(r.tabellen[0].zeilen, 2);
  assert.deepEqual(r.tabellen[0].spalten.map((s) => [s.name, s.pk]), [['ErmittlerNr', true], ['Name', false], ['Dienstgrad', false]]);

  // Der Zustand lebt nur für eine Anfrage: die nächste beginnt wieder leer.
  const zweite = await sandbox.fuehreSkriptAus({ skript: 'SELECT COUNT(*) FROM Ermittler;' });
  assert.equal(zweite.ok, false);
  assert.equal(zweite.code, 'sql_fehler');
  assert.match(zweite.text, /no such table/);
});

test('FOREIGN KEY ist eingeschaltet: Verletzung bricht mit Anweisungsnummer und Zeile ab; deutscher Text', async () => {
  const skript = `${ERMITTLER}
INSERT INTO Ermittler VALUES (1, 'Edda Lorenz', 'Leitung');
CREATE TABLE Fall (
  FallNr INTEGER PRIMARY KEY,
  Titel TEXT,
  LeiterNr INTEGER NOT NULL,
  FOREIGN KEY (LeiterNr) REFERENCES Ermittler(ErmittlerNr)
);
INSERT INTO Fall VALUES (10, 'Das Phantom', 7);
SELECT * FROM Fall;`;
  const r = await sandbox.fuehreSkriptAus({ skript });
  assert.equal(r.ok, false);
  assert.equal(r.code, 'sql_fehler');
  assert.equal(r.anweisung, 4);
  assert.equal(r.zeile, 13);
  assert.equal(r.art, 'INSERT');
  assert.match(r.text, /FOREIGN KEY constraint failed/);
  assert.equal(r.protokoll.length, 3, 'Anweisungen vor dem Fehler stehen im Protokoll');
  const d = FS.ordneZu(r);
  assert.equal(d.code, 'FREMDSCHLUESSEL');
  assert.match(d.text, /Fremdschlüssel verletzt/);
  assert.match(d.text, /referentielle Integrität/i);

  const richtig = await sandbox.fuehreSkriptAus({ skript: skript.replace("'Das Phantom', 7", "'Das Phantom', 1") });
  assert.equal(richtig.ok, true, JSON.stringify(richtig));
  assert.deepEqual(richtig.ergebnis.zeilen, [[10, 'Das Phantom', 1]]);
});

test('Deutsche Meldungen: Primärschlüssel doppelt, NOT NULL, Tabelle existiert, Spaltenzahl, unbekannte Spalte', async () => {
  const faelle = [
    [`${ERMITTLER}\nINSERT INTO Ermittler VALUES (1, 'A', NULL);\nINSERT INTO Ermittler VALUES (1, 'B', NULL);`, 'PRIMAERSCHLUESSEL', /Primärschlüssel/],
    [`${ERMITTLER}\nINSERT INTO Ermittler VALUES (1, NULL, NULL);`, 'NOT_NULL', /Name/],
    [`${ERMITTLER}\n${ERMITTLER}`, 'TABELLE_DA', /Ermittler gibt es schon/],
    [`${ERMITTLER}\nINSERT INTO Ermittler VALUES (1, 'A');`, 'WERTEANZAHL', /3 Spalten/],
    [`${ERMITTLER}\nINSERT INTO Ermittler (Rang) VALUES ('x');`, 'SPALTE_FEHLT', /Rang/]
  ];
  for (const [skript, code, muster] of faelle) {
    const r = await sandbox.fuehreSkriptAus({ skript });
    assert.equal(r.ok, false, skript);
    const d = FS.ordneZu(r);
    assert.equal(d.code, code, `${skript} → ${r.text}`);
    assert.match(d.text, muster);
    assert.ok(!/constraint|failed/i.test(d.text), 'keine Rohmeldung');
  }
  // Fehler im Lesemodus-Stil (no such table) kommen aus den allgemeinen Fehlertexten
  const r = await sandbox.fuehreSkriptAus({ skript: 'SELECT * FROM Gibtsnicht;' });
  assert.equal(FS.ordneZu(r).code, 'KEINE_TABELLE');
});

test('Grenzen: höchstens 500 Zeilen je Tabelle, 20 Tabellen, 1 MB, 5 000 Ergebniszeilen', async () => {
  const zuViele = await sandbox.fuehreSkriptAus({
    skript: 'CREATE TABLE t (x INTEGER);\nWITH RECURSIVE r(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM r LIMIT 501) INSERT INTO t SELECT n FROM r;'
  });
  assert.equal(zuViele.ok, false);
  assert.equal(zuViele.code, 'zu_viele_zeilen');
  assert.equal(zuViele.tabelle, 't');
  assert.equal(zuViele.anweisung, 2);
  assert.match(FS.ordneZu(zuViele).text, /500/);

  const genau = await sandbox.fuehreSkriptAus({
    skript: 'CREATE TABLE t (x INTEGER);\nWITH RECURSIVE r(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM r LIMIT 500) INSERT INTO t SELECT n FROM r;'
  });
  assert.equal(genau.ok, true, JSON.stringify(genau));

  const tabellen = Array.from({ length: 21 }, (_, i) => `CREATE TABLE t${i} (x);`).join('\n');
  const t = await sandbox.fuehreSkriptAus({ skript: tabellen });
  assert.equal(t.ok, false);
  assert.equal(t.code, 'zu_viele_tabellen');
  assert.equal(t.anweisung, 21);
  assert.match(FS.ordneZu(t).text, /20 Tabellen/);

  const gross = await sandbox.fuehreSkriptAus({
    skript: 'CREATE TABLE b (x BLOB);\nWITH RECURSIVE r(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM r LIMIT 300) INSERT INTO b SELECT randomblob(5000) FROM r;'
  });
  assert.equal(gross.ok, false);
  assert.equal(gross.code, 'zu_gross');
  assert.match(FS.ordneZu(gross).text, /1 MB/);

  const lang = await sandbox.fuehreSkriptAus({ skript: 'WITH RECURSIVE r(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM r) SELECT n FROM r;' });
  assert.equal(lang.ok, true);
  assert.equal(lang.ergebnis.anzahl, 5000);
  assert.equal(lang.ergebnis.abgeschnitten, true);
});

test('Endlosschleife (rekursive CTE ohne Ausgabe) → Zeitlimit, Prozess wird ersetzt', async () => {
  const start = Date.now();
  const r = await sandbox.fuehreSkriptAus({
    skript: 'CREATE TABLE t (x);\nWITH RECURSIVE z(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM z) SELECT COUNT(*) FROM z;'
  });
  assert.equal(r.ok, false);
  assert.equal(r.code, 'zeitlimit');
  assert.ok(Date.now() - start < 4000);
  const danach = await sandbox.fuehreSkriptAus({ skript: 'SELECT 1;' });
  assert.equal(danach.ok, true);
});

test('Kein Dateizugriff: ATTACH, VACUUM INTO und PRAGMA werden vor dem Start abgewiesen; es entsteht keine Datei', async () => {
  const ziel = path.join(os.tmpdir(), `dd-kuer-${process.pid}-${Date.now()}.db`);
  for (const skript of [
    `ATTACH DATABASE '${ziel}' AS x;\nCREATE TABLE x.t (a);`,
    `CREATE TABLE t (a);\nVACUUM INTO '${ziel}';`,
    `PRAGMA foreign_keys = OFF;`,
    `CREATE TABLE "pragma_table_info" (x);`
  ]) {
    const r = await sandbox.fuehreSkriptAus({ skript });
    assert.equal(r.ok, false, skript);
    assert.equal(r.code, 'verboten', skript);
  }
  assert.equal(fs.existsSync(ziel), false);
});

test('Startdatenbank: Kopie der öffentlichen Detektei-DB – Änderungen wirken nie auf das Original', async () => {
  const r = await sandbox.fuehreSkriptAus({
    start: { datenbank: 'detektei' },
    skript: 'DELETE FROM kennt;\nDELETE FROM Aussage;\nDELETE FROM verdaechtig;\nSELECT COUNT(*) FROM verdaechtig;'
  });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.deepEqual(r.ergebnis.zeilen, [[0]]);
  const neu = await sandbox.fuehreSkriptAus({ start: { datenbank: 'detektei' }, skript: 'SELECT COUNT(*) FROM Person;' });
  assert.deepEqual(neu.ergebnis.zeilen, [[ANZAHL_PERSON]]);
  // Original-Buffer unverändert
  const db = new Database(DETEKTEI);
  assert.ok(db.prepare('SELECT COUNT(*) FROM verdaechtig').pluck().get() > 0);
  db.close();
  // Starttabellen dürfen mehr als 500 Zeilen haben; die Grenze gilt für neue Zeilen darüber hinaus nicht strenger
  const unbekannt = await sandbox.fuehreSkriptAus({ start: { datenbank: 'gibtsnicht' }, skript: 'SELECT 1;' });
  assert.equal(unbekannt.code, 'unbekannte_db');
});

test('Startskript (z. B. Detektei-light) läuft vor dem Schülerskript; seine Tabellen zählen nicht zu den 20 eigenen', async () => {
  const start = { skript: `${ERMITTLER}\nINSERT INTO Ermittler VALUES (1, 'Edda Lorenz', 'Leitung');` };
  const r = await sandbox.fuehreSkriptAus({ start, skript: 'SELECT Name FROM Ermittler;' });
  assert.equal(r.ok, true);
  assert.deepEqual(r.ergebnis.zeilen, [['Edda Lorenz']]);
  const tabellen = Array.from({ length: 20 }, (_, i) => `CREATE TABLE t${i} (x);`).join('\n');
  assert.equal((await sandbox.fuehreSkriptAus({ start, skript: tabellen })).ok, true);
  const kaputt = await sandbox.fuehreSkriptAus({ start: { skript: 'CREATE TABLE (' }, skript: 'SELECT 1;' });
  assert.equal(kaputt.ok, false);
  assert.equal(kaputt.code, 'start_fehler');
});

test('Prüfabfragen laufen nach dem Skript auf derselben DB (auch pragma_…), nur lesend; daten zählt eigene Tabellen', async () => {
  const skript = `${ERMITTLER}\nINSERT INTO Ermittler VALUES (1, 'Edda Lorenz', 'Leitung');\nINSERT INTO Ermittler VALUES (2, 'Juri Brandt', 'Junior');`;
  const r = await sandbox.fuehreSkriptAus({
    skript,
    pruefungen: [
      { art: 'abfrage', sql: "SELECT COUNT(*) = 1 FROM pragma_table_info('Ermittler') WHERE name = 'ErmittlerNr' AND pk = 1" },
      { art: 'abfrage', sql: 'SELECT COUNT(*) >= 3 FROM Ermittler' },
      { art: 'abfrage', sql: 'DELETE FROM Ermittler' },
      { art: 'daten', min: 2 },
      { art: 'daten', min: 3 },
      { art: 'gleich', sql: 'SELECT Name FROM Ermittler' }
    ]
  });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.deepEqual(r.pruefungen[0].zeilen, [[1]]);
  assert.deepEqual(r.pruefungen[1].zeilen, [[0]]);
  assert.ok(r.pruefungen[2].fehler, 'Prüfabfragen sind nur lesend');
  assert.equal(r.pruefungen[3].ok, true);
  assert.equal(r.pruefungen[4].ok, false);
  assert.deepEqual(r.pruefungen[5].zeilen, [['Edda Lorenz'], ['Juri Brandt']]);
});

test('Lesemodus bleibt unverändert: fuehreAus mit modus schreiben wird abgewiesen', async () => {
  const r = await sandbox.fuehreAus({ db: 'detektei', sql: 'SELECT 1', modus: 'schreiben' });
  assert.equal(r.ok, false);
  assert.equal(r.code, 'nicht_lesend');
});

test('Speicher: riesige Werte im Schreibmodus → ergebnis_zu_gross mit deutschem Text', async () => {
  const r = await sandbox.fuehreSkriptAus({ skript: 'SELECT zeroblob(900000000);' });
  assert.equal(r.ok, false, JSON.stringify(r).slice(0, 200));
  assert.equal(r.code, 'ergebnis_zu_gross');
  assert.match(FS.ordneZu(r).text, /zu groß/);
  const ok = await sandbox.fuehreSkriptAus({ skript: 'SELECT 1;' });
  assert.equal(ok.ok, true);
});
