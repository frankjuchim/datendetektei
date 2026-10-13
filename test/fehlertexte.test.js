'use strict';
// Deutsche Fehlertexte für SQLite- und sql.js-Meldungen (Spec §7.3, DESIGN §9): Ursache und Weg, geduzt,
// ohne Rohmeldung (außer dem betroffenen Namen), ohne Lösung.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const request = require('supertest');
const Database = require('better-sqlite3');
const fehlertexte = require('../src/sql/fehlertexte');
const { übersetze, uebersetze, ordneZu } = fehlertexte;
const { SEED } = require('./hilfen_schema');
const { testApp } = require('./helpers');

const ENGLISCH = /no such|syntax error|ambiguous|misuse|wrong number|incomplete|unrecognized|readonly|statement|attempt/i;

const FAELLE = [
  ['no such column: Lastenrad', 'KEINE_SPALTE', [/^Die Spalte Lastenrad gibt es nicht – Tippfehler oder fehlendes Tabellenpräfix\?/, /'Lastenrad'/, /P5/]],
  ['no such column: x.Typ', 'KEINE_SPALTE', [/Die Spalte x\.Typ gibt es nicht/, /FROM/]],
  ['no such table: Raeder', 'KEINE_TABELLE', [/Die Tabelle Raeder gibt es nicht/]],
  ['ambiguous column name: RadID', 'MEHRDEUTIG', [/Die Spalte RadID gibt es in mehreren Tabellen/, /Tabellenpräfix/, /\(P7\)/]],
  ['near "Rad": syntax error', 'SYNTAX', [/„Rad“/]],
  ['near "FROM": syntax error', 'SYNTAX', [/„FROM“/]],
  ['misuse of aggregate function COUNT()', 'AGGREGAT_FALSCH', [/COUNT\(\)/, /HAVING/, /\(P1\)/]],
  ['misuse of aggregate: MAX()', 'AGGREGAT_FALSCH', [/MAX\(\)/]],
  ['wrong number of arguments to function SUM()', 'ARGUMENTE', [/SUM\(\)/, /Argument/]],
  ['incomplete input', 'UNVOLLSTAENDIG', [/zu früh/]],
  ['unrecognized token: "\'abc FROM Rad"', 'TEXT_OFFEN', [/Hochkomma/]],
  ['unrecognized token: ""x"', 'UNBEKANNTES_ZEICHEN', [/Hochkommata/]],
  ['unrecognized token: "!"', 'UNBEKANNTES_ZEICHEN', [/!/]],
  ['attempt to write a readonly database', 'SCHREIBGESCHUETZT', [/nur gelesen/, /SELECT/]],
  ['no such function: ROUNDX', 'KEINE_FUNKTION', [/ROUNDX/, /AVG, COUNT, MAX, MIN und SUM/]],
  ['1st ORDER BY term out of range - should be between 1 and 3', 'NUMMER_ZU_GROSS', [/ORDER BY/]],
  ['The supplied SQL string contains more than one statement', 'MEHRERE_ANWEISUNGEN', [/eine Anweisung/]],
  ['The supplied SQL string contains no statements', 'LEER', [/leer/]],
  ['SELECTs to the left and right of UNION do not have the same number of result columns', 'UNION_SPALTEN', [/Spalten/]],
  ['aggregate functions are not allowed in the GROUP BY clause', 'AGGREGAT_IM_GROUP_BY', [/GROUP BY/]],
  ['sub-select returns 2 columns - expected 1', 'UNTERABFRAGE_SPALTEN', [/Unterabfrage/]],
  ['HAVING clause on a non-aggregate query', 'HAVING_OHNE_GROUP_BY', [/HAVING/, /GROUP BY/]],
  ['a GROUP BY clause is required before HAVING', 'HAVING_OHNE_GROUP_BY', [/HAVING/]],
  ['This statement does not return data. Use run() instead', 'NICHT_SELECT', [/SELECT/]],
  ['Too few parameter values were provided', 'PARAMETER', [/\?/]],
  ['Missing named parameters', 'PARAMETER', [/\?/]],
  ['datatype mismatch', 'DATENTYP', [/Datentyp/]],
  ['row value misused', 'ZEILENWERT', [/IN/]],
  ['interrupted', 'ZEITLIMIT', [/abgebrochen/]],
  // sql.js und Error-Objekte: Präfix „Error: “ wird ignoriert
  ['Error: no such column: Lastenrad', 'KEINE_SPALTE', [/Lastenrad/]],
  ['SqliteError: no such table: Kunden', 'KEINE_TABELLE', [/Kunden/]]
];

for (const [meldung, code, muster] of FAELLE) {
  test(`übersetze: ${meldung}`, () => {
    const z = ordneZu(meldung);
    assert.equal(z.code, code);
    assert.equal(z.text, übersetze(meldung));
    for (const m of muster) assert.match(z.text, m);
    assert.doesNotMatch(z.text, ENGLISCH, 'englische Rohmeldung im Text');
  });
}

test('interne Codes der Sandbox: Zeitlimit, Zeilenlimit, verbotene Anweisung, Länge, Überlastung', () => {
  assert.match(übersetze({ code: 'ZEITLIMIT' }), /1,5 s/);
  assert.match(übersetze({ code: 'ZEITLIMIT', ms: 3000 }), /3 s/);
  assert.match(übersetze('ZEITLIMIT'), /zu lange/);
  assert.match(übersetze({ code: 'ZEILENLIMIT' }), /5 000 Zeilen/);
  assert.match(übersetze({ code: 'ZEILENLIMIT', max: 300 }), /300 Zeilen/);
  assert.match(übersetze({ code: 'ZEILENLIMIT' }), /\(P2\)/);
  assert.match(übersetze({ code: 'VERBOTEN', wort: 'PRAGMA' }), /^PRAGMA ist hier nicht erlaubt/);
  assert.match(übersetze({ code: 'VERBOTEN' }), /nicht erlaubt/);
  assert.match(übersetze({ code: 'ZU_LANG' }), /4 000 Zeichen/);
  assert.match(übersetze({ code: 'UEBERLASTET' }), /noch einmal/);
  assert.match(übersetze({ code: 'NICHT_LESEND' }), /nur gelesen/);
  assert.equal(ordneZu({ code: 'ZEITLIMIT' }).code, 'ZEITLIMIT');
});

test('interne Codes der Sandbox: Absturz und beendet (Prüfer, Task 10)', () => {
  assert.equal(ordneZu({ code: 'ABSTURZ' }).code, 'ABSTURZ');
  assert.match(übersetze({ code: 'ABSTURZ' }), /noch einmal/);
  assert.equal(ordneZu({ code: 'BEENDET' }).code, 'BEENDET');
  assert.match(übersetze({ code: 'BEENDET' }), /gerade nicht/);
  for (const c of ['ABSTURZ', 'BEENDET']) {
    assert.ok(fehlertexte.INTERNE_CODES.includes(c));
    assert.doesNotMatch(übersetze({ code: c }), ENGLISCH);
  }
});

test('Error-Objekte (better-sqlite3) werden über message übersetzt', () => {
  const e = new Error('no such column: Farbe');
  e.code = 'SQLITE_ERROR';
  assert.equal(ordneZu(e).code, 'KEINE_SPALTE');
  assert.match(übersetze(e), /Farbe/);
});

test('Unbekanntes → allgemeiner Text ohne Details der Rohmeldung', () => {
  for (const m of ['disk I/O error at /app/data/plattform.sqlite', 'database disk image is malformed', '', null, undefined, 42, { foo: 1 }]) {
    const z = ordneZu(m);
    assert.equal(z.code, 'ALLGEMEIN');
    assert.doesNotMatch(z.text, /plattform|disk|malformed|\/app/);
    assert.match(z.text, /Abfrage/);
  }
});

test('Namen werden gekürzt und ohne Steuerzeichen übernommen', () => {
  const lang = 'x'.repeat(200);
  const t = übersetze('no such column: ' + lang + '\u0007');
  assert.ok(t.length < 400);
  assert.doesNotMatch(t, /\u0007/);
  assert.match(t, /…/);
});

test('alias uebersetze ist dieselbe Funktion', () => {
  assert.equal(uebersetze, übersetze);
});

test('echte Meldungen von better-sqlite3 werden alle erkannt (kein allgemeiner Text)', () => {
  const db = new Database(':memory:');
  db.exec(fs.readFileSync(path.join(SEED, 'stadtrad', 'schema.sql'), 'utf8'));
  const ro = new Database(db.serialize(), { readonly: true });
  const abfragen = [
    'SELECT Lastenrad FROM Rad', 'SELECT Typ FROM Raeder', 'SELECT RadID FROM Rad, Ausleihe', 'SELECT Typ FORM Rad',
    'SELECT Typ FROM Rad WHERE COUNT(*) > 1', 'SELECT SUM(Baujahr, Typ) FROM Rad', 'SELECT Typ FROM Rad WHERE',
    "SELECT 'abc FROM Rad", 'SELECT Typ FROM Rad WHERE Typ ! 1', 'SELECT ROUNDX(Baujahr) FROM Rad',
    'SELECT Typ FROM Rad ORDER BY 5', 'SELECT 1; SELECT 2', '', "INSERT INTO Rad VALUES (1, 'E-Bike', 2020, NULL, 'frei')",
    'SELECT Typ FROM Rad GROUP BY COUNT(*)', 'SELECT Typ FROM Rad HAVING Typ = 1'
  ];
  for (const sql of abfragen) {
    let fehler = null;
    try {
      const stmt = ro.prepare(sql);
      if (stmt.reader) stmt.all();
      else stmt.run();
    } catch (e) {
      fehler = e;
    }
    assert.ok(fehler, `kein Fehler für ${sql}`);
    const z = ordneZu(fehler);
    assert.notEqual(z.code, 'ALLGEMEIN', `${sql}: ${fehler.message}`);
    assert.doesNotMatch(z.text, ENGLISCH, `${sql}: ${z.text}`);
  }
  ro.close();
  db.close();
});

test('fehlertexte.js läuft ohne module/require (Browser) und wird byte-gleich ausgeliefert', async () => {
  const datei = path.join(__dirname, '..', 'src', 'sql', 'fehlertexte.js');
  const code = fs.readFileSync(datei, 'utf8');
  assert.ok(!/\brequire\s*\(/.test(code));
  const self = {};
  vm.runInNewContext(code, { self });
  assert.match(self.DD_SQL_FEHLERTEXTE.übersetze('no such column: Typo'), /Typo/);
  const { app } = testApp();
  const res = await request(app).get('/static/js/sql/fehlertexte.js').buffer(true).parse((r, cb) => {
    const teile = [];
    r.on('data', (d) => teile.push(d));
    r.on('end', () => cb(null, Buffer.concat(teile)));
  });
  assert.equal(res.status, 200);
  assert.match(res.headers['content-type'], /^application\/javascript/);
  assert.ok(Buffer.compare(res.body, fs.readFileSync(datei)) === 0);
});
