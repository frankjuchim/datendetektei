'use strict';
// Kür K1: Prüfung von Schreib-Skripten (Interaktion sql mit schreiben: true, AUFGABENFORMAT §6.6.1). Prüfabfragen
// gegen die DB nach dem Schüler-Skript, Vergleich des letzten SELECT mit der Musterlösung, Rückmeldung je Prüfpunkt
// ohne Lösungsdaten.

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

const { erzeugeSandbox } = require('../src/sql/sandbox');
const { erzeugePruefer } = require('../src/sql/pruefer');
const P = require('../src/content/pruefer');

function baueBuffer(name) {
  const db = new Database(':memory:');
  db.exec(fs.readFileSync(path.join(__dirname, '..', 'seed', 'datenbanken', name, 'basis.sql'), 'utf8'));
  const b = db.serialize();
  db.close();
  return b;
}

let sandbox;
let pruefer;
before(() => {
  sandbox = erzeugeSandbox({ prozesse: 2, datenbanken: { detektei: { haupt: baueBuffer('detektei'), varianten: {} } } });
  pruefer = erzeugePruefer({ sandbox, schemata: {} });
});
after(() => sandbox.beende());

const ERMITTLER = 'CREATE TABLE Ermittler (\n  ErmittlerNr INTEGER PRIMARY KEY,\n  Name TEXT NOT NULL,\n  Dienstgrad TEXT\n);';

const ERSTE = {
  id: 'K1-E1-01',
  schreiben: true,
  start: null,
  abimodus: 'aus',
  loesung: {
    sql: ERMITTLER,
    pruefung: [
      { text: 'Die Tabelle Ermittler gibt es.', sql: "SELECT COUNT(*) = 1 FROM sqlite_master WHERE type = 'table' AND name = 'Ermittler'" },
      { text: 'ErmittlerNr ist der Primärschlüssel.', sql: "SELECT COUNT(*) = 1 FROM pragma_table_info('Ermittler') WHERE pk > 0 AND name = 'ErmittlerNr'" },
      { text: 'Name und Dienstgrad sind Spalten.', sql: "SELECT COUNT(*) = 2 FROM pragma_table_info('Ermittler') WHERE lower(name) IN ('name', 'dienstgrad')" }
    ]
  }
};

const VERBUND = {
  id: 'K1-E1-04',
  schreiben: true,
  start: { datenbank: 'detektei' },
  abimodus: 'aus',
  loesung: {
    sql: "SELECT f.Titel, e.Name\nFROM Fall f JOIN Ermittler e ON f.LeiterNr = e.ErmittlerNr\nWHERE f.Status = 'offen';",
    pruefung: [
      { art: 'skript', text: 'Du schreibst den Verbund mit JOIN … ON.', muster: '\\bJOIN\\b[\\s\\S]*\\bON\\b' },
      { art: 'ergebnis', text: 'Dein Ergebnis stimmt mit dem der Abitur-Abfrage überein.' }
    ]
  }
};

test('richtig: alle Prüfpunkte erfüllt; Antwort ohne Lösungsdaten', async () => {
  const r = await pruefer.pruefeSql({ sql: ERMITTLER.replace('Dienstgrad TEXT', 'Dienstgrad TEXT NOT NULL'), aufgabe: ERSTE });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.deepEqual(r.pruefpunkte.map((p) => p.ok), [true, true, true]);
  assert.deepEqual(r.pruefpunkte.map((p) => p.text), ERSTE.loesung.pruefung.map((p) => p.text));
  assert.deepEqual(r.diagnose, []);
  const json = JSON.stringify(r);
  assert.ok(!json.includes('sqlite_master') && !json.includes('pragma_table_info'), 'keine Prüfabfragen in der Antwort');
});

test('falsch: Rückmeldung je Prüfpunkt (welcher fehlt), kein ok', async () => {
  const r = await pruefer.pruefeSql({ sql: 'CREATE TABLE Ermittler (ErmittlerNr INTEGER, Name TEXT);', aufgabe: ERSTE });
  assert.equal(r.ok, false);
  assert.deepEqual(r.pruefpunkte.map((p) => p.ok), [true, false, false]);
});

test('Skript bricht ab: deutsche Diagnose mit Anweisung und Zeile, Prüfpunkte nicht ausgewertet', async () => {
  const r = await pruefer.pruefeSql({ sql: `${ERMITTLER}\nINSERT INTO Ermittler VALUES (1, NULL, NULL);`, aufgabe: ERSTE });
  assert.equal(r.ok, false);
  assert.equal(r.pruefpunkte, null);
  assert.equal(r.diagnose.length, 1);
  assert.equal(r.diagnose[0].code, 'NOT_NULL');
  assert.equal(r.diagnose[0].zeile, 6);
  assert.match(r.diagnose[0].text, /^Anweisung 2 \(Zeile 6\): In Ermittler darf Name nicht leer sein/);
  const verboten = await pruefer.pruefeSql({ sql: 'PRAGMA foreign_keys = OFF;', aufgabe: ERSTE });
  assert.equal(verboten.ok, false);
  assert.equal(verboten.diagnose[0].code, 'VERBOTEN');
});

test('ergebnis + skript: JOIN … ON verlangt, Ergebnis wie das der Musterlösung (Multimenge)', async () => {
  const abi = "SELECT f.Titel, e.Name\nFROM Fall f, Ermittler e\nWHERE f.LeiterNr = e.ErmittlerNr\nAND f.Status = 'offen';";
  const r1 = await pruefer.pruefeSql({ sql: abi, aufgabe: VERBUND });
  assert.equal(r1.ok, false);
  assert.deepEqual(r1.pruefpunkte.map((p) => p.ok), [false, true]);
  const join = "SELECT e.Name, f.Titel FROM Ermittler e INNER JOIN Fall f ON e.ErmittlerNr = f.LeiterNr WHERE f.Status = 'offen'";
  const r2 = await pruefer.pruefeSql({ sql: join, aufgabe: VERBUND });
  assert.deepEqual(r2.pruefpunkte.map((p) => p.ok), [true, false], 'Spaltenreihenfolge zählt');
  const r3 = await pruefer.pruefeSql({ sql: join.replace('SELECT e.Name, f.Titel', 'SELECT f.Titel, e.Name'), aufgabe: VERBUND });
  assert.equal(r3.ok, true, JSON.stringify(r3));
  const kommentar = await pruefer.pruefeSql({ sql: `-- JOIN x ON y\n${abi}`, aufgabe: VERBUND });
  assert.equal(kommentar.pruefpunkte[0].ok, false, 'Kommentare zählen nicht');
  const ohneSelect = await pruefer.pruefeSql({ sql: 'CREATE TABLE x (a);', aufgabe: VERBUND });
  assert.equal(ohneSelect.pruefpunkte[1].ok, false);
});

test('gleich, daten und zeilen: Vergleich mit der Muster-DB, Mindestdaten, Mindestzeilen des letzten SELECT', async () => {
  const aufgabe = {
    schreiben: true,
    start: { skript: ERMITTLER },
    abimodus: 'aus',
    loesung: {
      sql: "INSERT INTO Ermittler VALUES (1, 'A', 'Leitung');\nINSERT INTO Ermittler VALUES (2, 'B', 'Junior');\nINSERT INTO Ermittler VALUES (3, 'C', 'Junior');\nSELECT * FROM Ermittler;",
      pruefung: [
        { art: 'gleich', text: 'Die Spalten von Ermittler sind unverändert.', sql: "SELECT name, pk FROM pragma_table_info('Ermittler')" },
        { art: 'abfrage', text: 'Ermittler enthält mindestens drei Datensätze.', sql: 'SELECT COUNT(*) >= 3 FROM Ermittler' },
        { art: 'zeilen', min: 3, text: 'Dein letztes SELECT zeigt mindestens drei Datensätze.' }
      ]
    }
  };
  const gut =
    "INSERT INTO Ermittler (ErmittlerNr, Name) VALUES (7, 'Mika R.');\nINSERT INTO Ermittler (ErmittlerNr, Name) VALUES (8, 'Lena K.');\n" +
    "INSERT INTO Ermittler (ErmittlerNr, Name, Dienstgrad) VALUES (9, 'Tom B.', 'Junior');\nSELECT Name FROM Ermittler;";
  const r = await pruefer.pruefeSql({ sql: gut, aufgabe });
  assert.equal(r.ok, true, JSON.stringify(r));
  const r2 = await pruefer.pruefeSql({ sql: "ALTER TABLE Ermittler ADD COLUMN Rang TEXT;\n" + gut, aufgabe });
  assert.deepEqual(r2.pruefpunkte.map((p) => p.ok), [false, true, true]);
  const r3 = await pruefer.pruefeSql({ sql: "INSERT INTO Ermittler VALUES (7, 'Mika R.', NULL);\nSELECT * FROM Ermittler;", aufgabe });
  assert.deepEqual(r3.pruefpunkte.map((p) => p.ok), [true, false, false]);
});

test('Musterlösung, die selbst scheitert, ist ein Inhaltsfehler (Error), kein Schülerfehler', async () => {
  const kaputt = { ...ERSTE, id: 'X', loesung: { ...ERSTE.loesung, sql: 'CREATE TABLE (' } };
  await assert.rejects(() => pruefer.musterErgebnisse(kaputt), /Musterlösung/);
  await assert.rejects(() => pruefer.pruefeSql({ sql: ERMITTLER, aufgabe: kaputt }), /Musterlösung/);
});

test('content/pruefer: sql mit schreiben – bis 10 000 Zeichen, Rückmeldung { diagnose, pruefpunkte }', async () => {
  const aufgabe = {
    id: 'K1-E1-01',
    interaktion: { kind: 'sql', schreiben: true, abimodus: 'aus' },
    loesung: { sql: ERMITTLER, pruefung: ERSTE.loesung.pruefung }
  };
  const sqlPruefer = (aufg, sql) => pruefer.pruefeSql({ sql, aufgabe: aufg });
  const lang = ERMITTLER + '\n' + '-- Kommentar\n'.repeat(400);
  assert.ok(lang.length > 4000 && lang.length < 10000);
  const r = await P.pruefeAntwort(aufgabe, lang, { sqlPruefer });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.deepEqual(Object.keys(r.rueckmeldung).sort(), ['diagnose', 'pruefpunkte']);
  await assert.rejects(() => P.pruefeAntwort(aufgabe, 'x'.repeat(10001), { sqlPruefer }), /zu lang/);
  // die Lese-Interaktion bleibt bei 4 000 Zeichen
  await assert.rejects(() => P.pruefeAntwort({ interaktion: { kind: 'sql', datenbank: 'detektei' }, loesung: { sql: 'SELECT 1' } }, 'x'.repeat(4001), { sqlPruefer }), /zu lang/);
  const m = P.musterantwort(aufgabe);
  assert.equal(m, ERMITTLER);
});
