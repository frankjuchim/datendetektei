'use strict';
// Tokenizer und Parser nach EH §8 (Spec §2.3, §7.3): Grammatik-Tabelle, Positionen, Fremdkörper-Knoten,
// alle Beispielabfragen der LIESMICH-Dateien, Syntax-Hervorhebung, isomorphe Auslieferung.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const request = require('supertest');
const { zerlege, parse, hebeHervor } = require('../src/sql/parser');
const { liesmichAbfragen } = require('./hilfen_schema');
const { testApp } = require('./helpers');

/** Alle Knoten eines Typs (Tiefensuche über alle Objekt-Felder). */
function knoten(wurzel, typ) {
  const gefunden = [];
  (function laufe(k) {
    if (Array.isArray(k)) return k.forEach(laufe);
    if (!k || typeof k !== 'object') return;
    if (k.typ === typ) gefunden.push(k);
    for (const [schluessel, wert] of Object.entries(k)) {
      if (schluessel !== 'start' && schluessel !== 'ende') laufe(wert);
    }
  })(wurzel);
  return gefunden;
}

function ok(sql) {
  const { ast, fehler } = parse(sql);
  assert.deepEqual(fehler, [], `unerwarteter Fehler für ${sql}: ${JSON.stringify(fehler)}`);
  assert.ok(ast, 'AST fehlt');
  return ast;
}

function falsch(sql, code, zeile, spalte) {
  const { ast, fehler } = parse(sql);
  assert.equal(ast, null, `AST trotz Fehler für ${sql}`);
  assert.ok(fehler.length >= 1, `kein Fehler für ${sql}`);
  const f = fehler[0];
  assert.equal(f.code, code, `${sql}: ${JSON.stringify(f)}`);
  if (zeile !== undefined) assert.deepEqual([f.zeile, f.spalte], [zeile, spalte], `${sql}: Position ${JSON.stringify(f)}`);
  assert.equal(typeof f.text, 'string');
  assert.ok(f.text.length > 5);
  return f;
}

// ---------------------------------------------------------------------------------------------------------------
// Grammatik-Tabelle: gültige Abfragen (je mit kurzer Strukturprüfung)

const GUELTIG = [
  ['SELECT * FROM Station', (a) => {
    assert.equal(a.typ, 'select');
    assert.equal(a.spalten[0].ausdruck.typ, 'stern');
    assert.equal(a.from[0].typ, 'tabelle');
    assert.equal(a.from[0].name, 'Station');
  }],
  ['select name from station where name = \'x\' order by name', (a) => {
    assert.equal(a.where.typ, 'vergleich');
    assert.equal(a.orderBy.length, 1);
  }],
  ['SELECT DISTINCT Typ FROM Rad', (a) => assert.equal(a.distinct, true)],
  ['SELECT Typ FROM Rad', (a) => assert.equal(a.distinct, false)],
  ['SELECT Name AS Station, Stellplaetze FROM Station', (a) => {
    assert.equal(a.spalten[0].alias, 'Station');
    assert.equal(a.spalten[0].aliasMitAs, true);
    assert.equal(a.spalten[1].alias, null);
  }],
  ['SELECT Name Station FROM Station', (a) => {
    assert.equal(a.spalten[0].alias, 'Station');
    assert.equal(a.spalten[0].aliasMitAs, false);
  }],
  ['SELECT Name AS "Name der Station" FROM Station', (a) => assert.equal(a.spalten[0].alias, 'Name der Station')],
  ['SELECT s.Name FROM Station s', (a) => {
    assert.equal(a.from[0].alias, 's');
    assert.equal(a.from[0].aliasMitAs, false);
    assert.deepEqual([a.spalten[0].ausdruck.tabelle, a.spalten[0].ausdruck.spalte], ['s', 'Name']);
  }],
  ['SELECT s.Name FROM Station AS s', (a) => assert.equal(a.from[0].aliasMitAs, true)],
  ['SELECT s.* FROM Station s', (a) => assert.equal(a.spalten[0].ausdruck.tabelle, 's')],
  ['SELECT Rad.RadID, Station.Name FROM Rad, Station WHERE Rad.StationID = Station.StationID', (a) => {
    assert.equal(a.from.length, 2);
    assert.equal(a.where.operator, '=');
    assert.equal(a.where.links.typ, 'name');
  }],
  ['SELECT * FROM Station s1, Station s2 WHERE s1.Stadtteil = s2.Stadtteil AND s1.StationID < s2.StationID', (a) => {
    assert.deepEqual(a.from.map((t) => t.alias), ['s1', 's2']);
    assert.equal(a.where.typ, 'logisch');
    assert.equal(a.where.operator, 'AND');
  }],
  ['SELECT RadID FROM Rad WHERE StationID IS NULL', (a) => {
    assert.equal(a.where.typ, 'istNull');
    assert.equal(a.where.nicht, false);
  }],
  ['SELECT RadID FROM Rad WHERE StationID IS NOT NULL', (a) => assert.equal(a.where.nicht, true)],
  ["SELECT RadID FROM Rad WHERE Typ IN ('E-Bike', 'Lastenrad')", (a) => {
    assert.equal(a.where.typ, 'in');
    assert.equal(a.where.liste.length, 2);
    assert.equal(a.where.nicht, false);
  }],
  ['SELECT RadID FROM Rad WHERE RadID NOT IN (1, 2, 3)', (a) => assert.equal(a.where.nicht, true)],
  ['SELECT RadID FROM Rad WHERE Baujahr BETWEEN 2018 AND 2020', (a) => {
    assert.equal(a.where.typ, 'between');
    assert.equal(a.where.von.wert, 2018);
    assert.equal(a.where.bis.wert, 2020);
  }],
  ['SELECT RadID FROM Rad WHERE Baujahr NOT BETWEEN 2018 AND 2020 AND Typ = \'E-Bike\'', (a) => {
    assert.equal(a.where.typ, 'logisch');
    assert.equal(a.where.links.typ, 'between');
    assert.equal(a.where.links.nicht, true);
  }],
  ["SELECT Name FROM Sorte WHERE Name LIKE '%Schoko%'", (a) => {
    assert.equal(a.where.typ, 'like');
    assert.equal(a.where.muster.wert, '%Schoko%');
  }],
  ["SELECT Name FROM Sorte WHERE Name NOT LIKE '_a%'", (a) => assert.equal(a.where.nicht, true)],
  ['SELECT Name FROM Sorte WHERE NOT (Preis > 2 OR Vegan = \'ja\')', (a) => {
    assert.equal(a.where.typ, 'nicht');
    assert.equal(a.where.ausdruck.klammern, true);
    assert.equal(a.where.ausdruck.operator, 'OR');
  }],
  ["SELECT Name FROM Sorte WHERE Preis > 2 AND (Vegan = 'ja' OR Name = 'Zitrone')", (a) => {
    assert.equal(a.where.operator, 'AND');
    assert.equal(a.where.rechts.operator, 'OR');
    assert.equal(a.where.rechts.klammern, true);
  }],
  ["SELECT Name FROM Sorte WHERE Preis > 2 AND Vegan = 'ja' OR Name = 'Zitrone'", (a) => {
    // AND bindet stärker als OR
    assert.equal(a.where.operator, 'OR');
    assert.equal(a.where.links.operator, 'AND');
    assert.equal(a.where.links.klammern, false);
  }],
  ['SELECT Preis * 2 + 1 FROM Sorte', (a) => {
    const e = a.spalten[0].ausdruck;
    assert.equal(e.typ, 'rechnung');
    assert.equal(e.operator, '+');
    assert.equal(e.links.operator, '*');
  }],
  ['SELECT (Preis + 1) * 2 FROM Sorte', (a) => {
    const e = a.spalten[0].ausdruck;
    assert.equal(e.operator, '*');
    assert.equal(e.links.operator, '+');
    assert.equal(e.links.klammern, true);
  }],
  ['SELECT -Preis, Preis - -1 FROM Sorte', (a) => assert.equal(a.spalten[0].ausdruck.typ, 'vorzeichen')],
  ['SELECT 7 / 2', (a) => {
    assert.deepEqual(a.from, []);
    assert.equal(a.spalten[0].ausdruck.operator, '/');
  }],
  ['SELECT COUNT(*) FROM Rad', (a) => {
    const g = a.spalten[0].ausdruck;
    assert.equal(g.typ, 'aggregat');
    assert.equal(g.name, 'COUNT');
    assert.equal(g.argument.typ, 'stern');
  }],
  ['SELECT count(DISTINCT Typ) FROM Rad', (a) => {
    const g = a.spalten[0].ausdruck;
    assert.equal(g.name, 'COUNT');
    assert.equal(g.distinct, true);
    assert.equal(g.argument.spalte, 'Typ');
  }],
  ['SELECT AVG(Preis), MIN(Preis), MAX(Preis), SUM(Preis) FROM Sorte', (a) => {
    assert.deepEqual(a.spalten.map((s) => s.ausdruck.name), ['AVG', 'MIN', 'MAX', 'SUM']);
  }],
  ['SELECT SUM(Verkauf.Kugeln * Sorte.Preis) AS Umsatz FROM Sorte, Verkauf', (a) => {
    assert.equal(a.spalten[0].ausdruck.argument.typ, 'rechnung');
  }],
  ['SELECT Typ, COUNT(*) AS Anzahl FROM Rad GROUP BY Typ HAVING COUNT(*) > 2', (a) => {
    assert.equal(a.groupBy.length, 1);
    assert.equal(a.having.typ, 'vergleich');
    assert.equal(a.having.links.typ, 'aggregat');
  }],
  ['SELECT Name, Preis FROM Sorte ORDER BY Preis DESC, Name ASC', (a) => {
    assert.deepEqual(a.orderBy.map((o) => o.richtung), ['DESC', 'ASC']);
    assert.equal(a.orderBy[0].typ, 'sortierung');
  }],
  ['SELECT Name FROM Sorte ORDER BY Preis', (a) => assert.equal(a.orderBy[0].richtung, null)],
  ['SELECT Name FROM Sorte ORDER BY Preis DESC LIMIT 3', (a) => assert.equal(a.limit.wert, 3)],
  ['SELECT Name FROM Sorte WHERE Preis != 2', (a) => assert.equal(a.where.operator, '!=')],
  ['SELECT Name FROM Sorte WHERE Preis <> 2', (a) => assert.equal(a.where.operator, '<>')],
  ['SELECT Name FROM Sorte WHERE Preis >= 1 AND Preis <= 2 AND Preis < 3 AND Preis > 0', (a) => {
    assert.deepEqual(knoten(a, 'vergleich').map((v) => v.operator).sort(), ['<', '<=', '>', '>='].sort());
  }],
  ["SELECT Name FROM Stand WHERE Name = 'Café ''Zur Weser'''", (a) => assert.equal(a.where.rechts.wert, "Café 'Zur Weser'")],
  ["SELECT Name FROM Station WHERE Stadtteil = 'Mühlenfeld'", (a) => assert.equal(a.where.rechts.wert, 'Mühlenfeld')],
  ["SELECT Name FROM Station WHERE Stadtteil = ''", (a) => assert.equal(a.where.rechts.wert, '')],
  ['SELECT Preis FROM Sorte WHERE Preis = 3.5 OR Preis = .5 OR Preis = 1e1', (a) => {
    assert.deepEqual(knoten(a, 'zahl').map((z) => z.wert).sort((x, y) => x - y), [0.5, 3.5, 10]);
  }],
  ['SELECT Name FROM Sorte WHERE Preis = NULL', (a) => assert.equal(a.where.rechts.typ, 'null')],
  ["SELECT AusleihID FROM Ausleihe WHERE Start >= '2026-09-20 14:00'", (a) => assert.equal(a.where.rechts.typ, 'text')],
  ['-- Kommentar oben\nSELECT Name -- hinter der Spalte\nFROM Station', (a) => assert.equal(a.spalten.length, 1)],
  ['SELECT /* Block\n Kommentar */ Name FROM Station', (a) => assert.equal(a.spalten[0].ausdruck.spalte, 'Name')],
  ['SELECT Name FROM Station;', (a) => assert.equal(a.typ, 'select')],
  ['SELECT Name FROM Station;  -- fertig\n', (a) => assert.equal(a.typ, 'select')],
  ['SELECT ROUND(AVG(Preis), 2) AS Schnitt FROM Sorte', (a) => {
    const f = a.spalten[0].ausdruck;
    assert.equal(f.typ, 'funktion');
    assert.equal(f.name, 'ROUND');
    assert.equal(f.argumente[0].typ, 'aggregat');
  }],
  ['SELECT Name FROM Sorte WHERE Name LIKE \'a%\' ESCAPE \'\\\'', (a) => assert.equal(a.where.typ, 'like')],
  // Fremdkörper (eigene Knoten, damit die Regeln gezielt warnen)
  ['SELECT Rad.RadID FROM Rad JOIN Station ON Rad.StationID = Station.StationID', (a) => {
    const j = a.from[0];
    assert.equal(j.typ, 'join');
    assert.equal(j.art, 'INNER');
    assert.equal(j.links.name, 'Rad');
    assert.equal(j.rechts.name, 'Station');
    assert.equal(j.on.typ, 'vergleich');
  }],
  ['SELECT * FROM Rad r LEFT OUTER JOIN Station s ON r.StationID = s.StationID', (a) => {
    assert.equal(a.from[0].art, 'LEFT');
    assert.equal(a.from[0].rechts.alias, 's');
  }],
  ['SELECT * FROM Rad CROSS JOIN Station', (a) => assert.equal(a.from[0].art, 'CROSS')],
  ['SELECT * FROM Rad INNER JOIN Station USING (StationID)', (a) => assert.deepEqual(a.from[0].using, ['StationID'])],
  ['SELECT Name FROM Station WHERE StationID IN (SELECT StationID FROM Rad)', (a) => {
    assert.equal(a.where.typ, 'in');
    assert.equal(a.where.abfrage.typ, 'unterabfrage');
    assert.equal(a.where.abfrage.abfrage.typ, 'select');
  }],
  ['SELECT x.Name FROM (SELECT Name FROM Station) x', (a) => {
    assert.equal(a.from[0].typ, 'unterabfrage');
    assert.equal(a.from[0].alias, 'x');
  }],
  ['SELECT Name FROM Station WHERE EXISTS (SELECT * FROM Rad WHERE Rad.StationID = Station.StationID)', (a) => {
    assert.equal(a.where.typ, 'unterabfrage');
    assert.equal(a.where.art, 'exists');
  }],
  ['SELECT Name, (SELECT COUNT(*) FROM Rad) FROM Station', (a) => assert.equal(a.spalten[1].ausdruck.art, 'skalar')],
  ['SELECT Name FROM Station UNION SELECT Typ FROM Rad', (a) => {
    assert.equal(a.typ, 'union');
    assert.equal(a.teile.length, 2);
    assert.deepEqual(a.operatoren, ['UNION']);
  }],
  ['SELECT Name FROM Station UNION ALL SELECT Typ FROM Rad EXCEPT SELECT Name FROM Kunde', (a) => {
    assert.deepEqual(a.operatoren, ['UNION ALL', 'EXCEPT']);
  }],
  ['WITH RECURSIVE z(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM z) SELECT n FROM z', (a) => {
    assert.equal(a.typ, 'unterabfrage');
    assert.equal(a.art, 'with');
    assert.equal(a.rekursiv, true);
    assert.equal(a.abfrage.typ, 'select');
  }],
  ["INSERT INTO Station VALUES (99, 'Neu', 'Altstadt', 4)", (a) => {
    assert.equal(a.typ, 'nichtSelect');
    assert.equal(a.anweisung, 'INSERT');
  }],
  ['DROP TABLE Station', (a) => assert.equal(a.anweisung, 'DROP')],
  ['create table x (a integer)', (a) => assert.equal(a.anweisung, 'CREATE')],
  ["UPDATE Rad SET Status = 'frei'", (a) => assert.equal(a.anweisung, 'UPDATE')],
  ['DELETE FROM Rad', (a) => assert.equal(a.anweisung, 'DELETE')],
  ['ALTER TABLE Rad ADD COLUMN Farbe TEXT', (a) => assert.equal(a.anweisung, 'ALTER')],
  ["PRAGMA table_info('Rad')", (a) => assert.equal(a.anweisung, 'PRAGMA')],
  ["ATTACH 'x' AS y", (a) => assert.equal(a.anweisung, 'ATTACH')]
];

for (const [sql, pruefe] of GUELTIG) {
  test(`gültig: ${sql.replace(/\n/g, '⏎')}`, () => pruefe(ok(sql)));
}

// ---------------------------------------------------------------------------------------------------------------
// Grammatik-Tabelle: ungültige Abfragen mit Code und Position (Zeile/Spalte, 1-basiert)

const UNGUELTIG = [
  ['', 'LEER', 1, 1],
  ['   \n  ', 'LEER', 1, 1],
  ['-- nur ein Kommentar', 'LEER', 1, 1],
  ['SELECT FROM Station', 'SYNTAX', 1, 8],
  ['SELECT Name FROM', 'UNERWARTETES_ENDE', 1, 17],
  ['SELECT Name FROM Station WHERE', 'UNERWARTETES_ENDE', 1, 31],
  ['SELECT Name\nFROM Station\nWHERE Preis >', 'UNERWARTETES_ENDE', 3, 14],
  ['SELECT Name FORM Station', 'SYNTAX', 1, 18],
  ["SELECT Name FROM Station WHERE Name = 'Hafen", 'TEXT_OFFEN', 1, 39],
  ["SELECT Name\nFROM Station\nWHERE Name = 'Ha\nfen", 'TEXT_OFFEN', 3, 14],
  ['SELECT Name FROM Station ORDER BY Name WHERE StationID = 1', 'KLAUSEL_REIHENFOLGE', 1, 40],
  ['SELECT Typ, COUNT(*) FROM Rad HAVING COUNT(*) > 1 GROUP BY Typ', 'HAVING_OHNE_GROUP_BY', 1, 31],
  ['SELECT Name FROM Station WHERE Name = 1 WHERE Name = 2', 'KLAUSEL_REIHENFOLGE', 1, 41],
  ['SELECT Name FROM Station; DROP TABLE Station', 'MEHRERE_ANWEISUNGEN', 1, 27],
  ['SELECT 1; SELECT 2', 'MEHRERE_ANWEISUNGEN', 1, 11],
  ['SELECT (Preis FROM Sorte', 'KLAMMER_FEHLT', 1, 15],
  ['SELECT Name FROM Sorte WHERE Preis = 1)', 'SYNTAX', 1, 39],
  ['SELECT Name FROM Sorte WHERE Name = ‘Zitrone’', 'UNBEKANNTES_ZEICHEN', 1, 37],
  ['SELECT Name FROM Sorte WHERE Name = „Zitrone“', 'UNBEKANNTES_ZEICHEN', 1, 37],
  ['SELECT Name FROM Sorte WHERE Preis ! 1', 'UNBEKANNTES_ZEICHEN', 1, 36],
  ['SELECT Name,, Preis FROM Sorte', 'SYNTAX', 1, 13],
  ['SELECT Name, FROM Sorte', 'SYNTAX', 1, 14],
  ['SELECT Name FROM Sorte WHERE Preis IS 5', 'SYNTAX', 1, 39],
  ['SELECT Name FROM Sorte LIMIT', 'UNERWARTETES_ENDE', 1, 29],
  ['SELECT Name Preis Vegan FROM Sorte', 'SYNTAX', 1, 19],
  ['FROM Sorte SELECT Name', 'SYNTAX', 1, 1],
  ['SELECT Typ FROM Rad GROUP Typ', 'SYNTAX', 1, 27],
  ['SELECT Typ FROM Rad ORDER Typ', 'SYNTAX', 1, 27],
  ['SELECT Name FROM Sorte WHERE Preis BETWEEN 1', 'UNERWARTETES_ENDE', 1, 45],
  ['SELECT Name FROM Sorte WHERE Name IN ()', 'SYNTAX', 1, 39],
  ['SELECT COUNT( FROM Sorte', 'SYNTAX', 1, 15],
  ['SELECT * * FROM Sorte', 'SYNTAX', 1, 10],
  ["SELECT Name FROM Sorte WHERE Name = 'a' 'b'", 'SYNTAX', 1, 41],
  ['SELECT CASE WHEN Preis > 2 THEN 1 END FROM Sorte', 'SYNTAX', 1, 8],
  ['SELECT Name FROM Sorte WHERE Preis = 3 /* offen', 'KOMMENTAR_OFFEN', 1, 40],
  ['SELECT s. FROM Station s', 'SYNTAX', 1, 11]
];

for (const [sql, code, zeile, spalte] of UNGUELTIG) {
  test(`ungültig (${code}): ${JSON.stringify(sql)}`, () => falsch(sql, code, zeile, spalte));
}

test('FORM statt FROM: Fehlertext nennt Komma oder Tippfehler', () => {
  const f = falsch('SELECT Name FORM Station', 'SYNTAX');
  assert.match(f.text, /FORM/);
  assert.match(f.text, /Komma|Tippfehler/);
});

test('Fehlertexte sind deutsch und nennen das gefundene Wort', () => {
  const f = falsch('SELECT FROM Station', 'SYNTAX');
  assert.match(f.text, /FROM/);
  assert.match(f.text, /erwartet|Erwartet/);
  const e = falsch('SELECT Name FROM', 'UNERWARTETES_ENDE');
  assert.match(e.text, /Tabelle/);
  const k = falsch('SELECT Name FROM Station ORDER BY Name WHERE StationID = 1', 'KLAUSEL_REIHENFOLGE');
  assert.match(k.text, /WHERE/);
  const m = falsch('SELECT 1; SELECT 2', 'MEHRERE_ANWEISUNGEN');
  assert.match(m.text, /eine Anweisung/);
  const t = falsch('SELECT Name FROM Sorte WHERE Name = ‘Zitrone’', 'UNBEKANNTES_ZEICHEN');
  assert.match(t.text, /'/);
});

// ---------------------------------------------------------------------------------------------------------------
// Positionen an Knoten

test('Knoten tragen Start- und Endposition (Zeile/Spalte 1-basiert, Ende exklusiv)', () => {
  const sql = 'SELECT Kunde.Vorname, COUNT(*) AS Fahrten\nFROM Kunde, Ausleihe\nWHERE Kunde.KundenID = Ausleihe.KundenID\n  AND Ausleihe.Preis > 2\nGROUP BY Kunde.Vorname';
  const a = ok(sql);
  assert.deepEqual(a.start, { zeile: 1, spalte: 1, index: 0 });
  assert.equal(a.ende.index, sql.length);
  const n = a.spalten[0].ausdruck;
  assert.deepEqual([n.start.zeile, n.start.spalte, n.ende.zeile, n.ende.spalte], [1, 8, 1, 21]);
  const g = a.spalten[1].ausdruck;
  assert.deepEqual([g.start.zeile, g.start.spalte], [1, 23]);
  assert.deepEqual([a.from[1].start.zeile, a.from[1].start.spalte], [2, 13]);
  const v = a.where.rechts; // Ausleihe.Preis > 2
  assert.equal(v.typ, 'vergleich');
  assert.deepEqual([v.start.zeile, v.start.spalte], [4, 7]);
  assert.deepEqual([a.groupBy[0].start.zeile, a.groupBy[0].start.spalte], [5, 10]);
  for (const k of [...knoten(a, 'name'), ...knoten(a, 'aggregat'), ...knoten(a, 'vergleich'), ...knoten(a, 'tabelle')]) {
    assert.ok(k.start && k.ende, `${k.typ} ohne Position`);
    assert.equal(sql.slice(k.start.index, k.ende.index).length > 0, true);
  }
  assert.equal(sql.slice(n.start.index, n.ende.index), 'Kunde.Vorname');
});

test('Windows-Zeilenenden zählen als ein Zeilenwechsel', () => {
  const a = ok('SELECT Name\r\nFROM Station\r\nWHERE Name = 1');
  assert.deepEqual([a.where.start.zeile, a.where.start.spalte], [3, 7]);
});

// ---------------------------------------------------------------------------------------------------------------
// Tokenizer

test('zerlege liefert Tokens mit Art, Wert und Position, ohne Leerraum und Kommentare', () => {
  const { tokens, fehler } = zerlege("SELECT s.Name -- x\nFROM Station s WHERE Preis >= 2.5 AND Name != 'Kai''s'");
  assert.deepEqual(fehler, []);
  assert.deepEqual(
    tokens.map((t) => [t.art, t.wert]),
    [
      ['schluessel', 'SELECT'], ['name', 's'], ['operator', '.'], ['name', 'Name'],
      ['schluessel', 'FROM'], ['name', 'Station'], ['name', 's'], ['schluessel', 'WHERE'], ['name', 'Preis'],
      ['operator', '>='], ['zahl', '2.5'], ['schluessel', 'AND'], ['name', 'Name'], ['operator', '!='],
      ['text', "Kai's"]
    ]
  );
  assert.deepEqual(tokens[4].start, { zeile: 2, spalte: 1, index: 19 });
});

test('zerlege: Schlüsselwörter unabhängig von Groß-/Kleinschreibung, Umlaute in Namen', () => {
  const { tokens } = zerlege('select Größe from Ware');
  assert.deepEqual(tokens.map((t) => [t.art, t.wert]), [['schluessel', 'SELECT'], ['name', 'Größe'], ['schluessel', 'FROM'], ['name', 'Ware']]);
  assert.equal(tokens[0].roh, 'select');
});

test('zerlege meldet offenen Text mit Position des Hochkommas', () => {
  const { fehler } = zerlege("SELECT 'abc");
  assert.equal(fehler.length, 1);
  assert.deepEqual([fehler[0].code, fehler[0].zeile, fehler[0].spalte], ['TEXT_OFFEN', 1, 8]);
});

// ---------------------------------------------------------------------------------------------------------------
// Syntax-Hervorhebung für das Overlay der Konsole

test('hebeHervor deckt den Text lückenlos ab und klassifiziert Tokens', () => {
  const sql = "SELECT Typ, COUNT(*) AS Anzahl -- je Typ\nFROM Rad\nWHERE Baujahr >= 2020 AND Typ != 'E-Bike'";
  const teile = hebeHervor(sql);
  assert.equal(teile.map((t) => t.text).join(''), sql);
  const klasse = (text) => teile.find((t) => t.text === text).klasse;
  assert.equal(klasse('SELECT'), 'schluessel');
  assert.equal(klasse('COUNT'), 'aggregat');
  assert.equal(klasse('Typ'), 'name');
  assert.equal(klasse('2020'), 'zahl');
  assert.equal(klasse("'E-Bike'"), 'text');
  assert.equal(klasse('-- je Typ'), 'kommentar');
  assert.equal(klasse('>='), 'operator');
  assert.equal(klasse('\n'), 'leer');
  const erlaubt = new Set(['schluessel', 'aggregat', 'text', 'zahl', 'kommentar', 'name', 'operator', 'leer']);
  for (const t of teile) assert.ok(erlaubt.has(t.klasse), t.klasse);
});

test('hebeHervor verträgt unvollständige Eingaben (offener Text, fremde Zeichen)', () => {
  for (const sql of ["SELECT 'offen", 'SELECT ‘x’ § ?', 'SELECT /* offen', '', 'SELECT "Name']) {
    const teile = hebeHervor(sql);
    assert.equal(teile.map((t) => t.text).join(''), sql);
  }
  assert.equal(hebeHervor("WHERE x = 'offen").pop().klasse, 'text');
});

// ---------------------------------------------------------------------------------------------------------------
// Alle Beispielabfragen der LIESMICH-Dateien

const ABFRAGEN = liesmichAbfragen();

test('LIESMICH-Dateien enthalten Beispielabfragen und Fehlabfragen', () => {
  assert.ok(ABFRAGEN.length >= 60, `nur ${ABFRAGEN.length} Abfragen gefunden`);
  assert.ok(ABFRAGEN.some((a) => a.fehlabfrage));
});

for (const a of ABFRAGEN) {
  test(`LIESMICH parst: ${a.datei}:${a.zeile}`, () => {
    const { ast, fehler } = parse(a.sql);
    assert.deepEqual(fehler, [], a.sql);
    assert.ok(ast.typ === 'select', `${a.datei}:${a.zeile} ist kein einfaches SELECT`);
  });
}

// ---------------------------------------------------------------------------------------------------------------
// Isomorph: läuft ohne module (Browser) und wird byte-gleich ausgeliefert

const SQL_DIR = path.join(__dirname, '..', 'src', 'sql');

test('parser.js läuft ohne module/require und hängt sich an self', () => {
  const code = fs.readFileSync(path.join(SQL_DIR, 'parser.js'), 'utf8');
  assert.ok(!/\brequire\s*\(/.test(code), 'parser.js darf nichts per require laden');
  const self = {};
  vm.runInNewContext(code, { self });
  assert.equal(typeof self.DD_SQL_PARSER.parse, 'function');
  assert.equal(self.DD_SQL_PARSER.parse('SELECT Name FROM Station').ast.typ, 'select');
  // ohne self: global (this)
  const kontext = {};
  vm.runInNewContext(code, kontext);
  assert.equal(typeof kontext.DD_SQL_PARSER.hebeHervor, 'function');
});

test('GET /static/js/sql/parser.js liefert dieselben Bytes wie src/sql/parser.js', async () => {
  const { app } = testApp();
  const res = await request(app).get('/static/js/sql/parser.js').buffer(true).parse((r, cb) => {
    const teile = [];
    r.on('data', (d) => teile.push(d));
    r.on('end', () => cb(null, Buffer.concat(teile)));
  });
  assert.equal(res.status, 200);
  assert.match(res.headers['content-type'], /^application\/javascript/);
  assert.match(res.headers['cache-control'], /max-age=3600/);
  assert.ok(Buffer.compare(res.body, fs.readFileSync(path.join(SQL_DIR, 'parser.js'))) === 0);
});

test('GET /static/js/sql/ liefert nur die Whitelist', async () => {
  const { app } = testApp();
  for (const p of ['/static/js/sql/sandbox.js', '/static/js/sql/..%2Fapp.js', '/static/js/sql/datenbanken.js', '/static/js/sql/PARSER.JS']) {
    const res = await request(app).get(p);
    assert.equal(res.status, 404, p);
  }
});

test('Sicherheits-Review Phase 8: tief verschachtelte Klammern → Parsefehler ZU_TIEF statt Stapelüberlauf', () => {
  for (const tiefe of [60, 2000]) {
    const sql = 'SELECT ' + '('.repeat(tiefe) + '1' + ')'.repeat(tiefe);
    let r;
    assert.doesNotThrow(() => {
      r = parse(sql);
    });
    assert.equal(r.ast, null);
    assert.equal(r.fehler[0].code, 'ZU_TIEF');
    assert.match(r.fehler[0].text, /verschachtelt/);
  }
  assert.doesNotThrow(() => parse('SELECT ' + '('.repeat(3990)));
  const flach = parse('SELECT ' + '('.repeat(30) + '1' + ')'.repeat(30));
  assert.ok(flach.ast, 'übliche Verschachtelung bleibt erlaubt');
});
