'use strict';
// Regelprüfungen P1–P7 und Abimodus (Spec §7.3, §5; DESIGN §9): je Code positive und negative Fälle,
// Schemata aus seed/datenbanken/*/schema.sql, alle LIESMICH-Beispielabfragen und Fehlabfragen.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const request = require('supertest');
const { parse } = require('../src/sql/parser');
const { pruefeRegeln, CODES } = require('../src/sql/regeln');
const { ladeSchema, datenbankNamen, liesmichAbfragen } = require('./hilfen_schema');
const { testApp } = require('./helpers');

const SCHEMA = {};
for (const name of datenbankNamen()) SCHEMA[name] = ladeSchema(name);

function pruefe(sql, optionen = {}) {
  const { ast, fehler } = parse(sql);
  assert.deepEqual(fehler, [], `Parserfehler in ${sql}: ${JSON.stringify(fehler)}`);
  return pruefeRegeln(ast, { abimodus: 'hinweis', ...optionen });
}
const codes = (diagnosen) => diagnosen.map((d) => d.code);
function genau(sql, erwartet, optionen) {
  const d = pruefe(sql, optionen);
  assert.deepEqual(codes(d), erwartet, `${sql}\n${JSON.stringify(d, null, 1)}`);
  return d;
}
const mit = (db) => ({ schema: SCHEMA[db] });

test('Hilfe: Schemata aller sieben Datenbanken mit PK und FK', () => {
  assert.deepEqual(Object.keys(SCHEMA).sort(), ['datenspuren', 'detektei', 'eisdiele', 'fundbuero', 'stadtfest', 'stadtrad', 'tus']);
  const ausleihe = SCHEMA.stadtrad.find((t) => t.tabelle === 'Ausleihe');
  assert.deepEqual(ausleihe.spalten.find((s) => s.name === 'StartStation').fk, { tabelle: 'Station', spalte: 'StationID' });
  assert.equal(ausleihe.spalten.find((s) => s.name === 'AusleihID').pk, true);
});

test('Diagnosen haben code, falle, art, text, zeile, spalte und sind nach Position sortiert', () => {
  const d = pruefe("SELECT Name, COUNT(*) FROM Sorte, Verkauf WHERE Preis = NULL AND Kugeln > 1 OR Vegan = 'ja'", mit('eisdiele'));
  assert.ok(d.length >= 3);
  for (const x of d) {
    assert.deepEqual(Object.keys(x).sort(), ['art', 'code', 'falle', 'spalte', 'text', 'zeile']);
    assert.ok(CODES.includes(x.code), x.code);
    assert.ok(x.art === 'fehler' || x.art === 'hinweis');
    assert.ok(x.zeile >= 1 && x.spalte >= 1);
  }
  const positionen = d.map((x) => x.zeile * 1000 + x.spalte);
  assert.deepEqual(positionen, [...positionen].sort((a, b) => a - b));
});

test('Codes exakt nach Spec §7.3 (plus UNION für den Fremdkörper-Knoten union)', () => {
  assert.deepEqual(
    [...CODES].sort(),
    ['ALIAS_IN_HAVING', 'AND_OR_MISCH', 'GB_REGEL', 'HAVING_OHNE_AGG', 'JOIN_ON', 'KEIN_VERBUND', 'MEHRDEUTIG',
      'NICHT_SELECT', 'NULL_VERGLEICH', 'UNGLEICH_ALT', 'UNION', 'UNTERABFRAGE', 'WHERE_MIT_AGG'].sort()
  );
});

test('ohne AST keine Diagnosen; unbekannter Abimodus wird abgelehnt', () => {
  assert.deepEqual(pruefeRegeln(null, { abimodus: 'streng' }), []);
  assert.throws(() => pruefeRegeln(parse('SELECT 1').ast, { abimodus: 'locker' }), /abimodus/);
});

// ---------------------------------------------------------------------------------------------------------------
// GB_REGEL (P3)

test('GB_REGEL: Spalte neben Aggregat ohne GROUP BY', () => {
  const [d] = genau('SELECT Name, COUNT(*) FROM Sorte', ['GB_REGEL']);
  assert.deepEqual([d.falle, d.art, d.zeile, d.spalte], ['P3', 'fehler', 1, 8]);
  assert.match(d.text, /`Name` steht im SELECT, ist aber weder aggregiert noch in GROUP BY \(P3\)/);
});

test('GB_REGEL: nur Aggregat ohne GROUP BY ist in Ordnung', () => {
  genau('SELECT COUNT(*) FROM Sorte', []);
  genau('SELECT COUNT(*), AVG(Preis), MAX(Preis) - MIN(Preis) FROM Sorte', []);
  genau("SELECT 'gesamt', COUNT(*) FROM Sorte", []);
});

test('GB_REGEL: gruppierte Spalten, qualifiziert oder nicht', () => {
  genau('SELECT Typ, COUNT(*) FROM Rad GROUP BY Typ', []);
  genau('SELECT Rad.Typ, COUNT(*) FROM Rad GROUP BY Typ', []);
  genau('SELECT Typ, SUM(Baujahr) FROM Rad GROUP BY Rad.Typ', []);
  genau('SELECT Typ FROM Rad GROUP BY Typ', []);
});

test('GB_REGEL: Gruppieren nach Kunde.KundenID, Vorname, Nachname ist in Ordnung (mit und ohne Schema)', () => {
  const sql = 'SELECT Kunde.KundenID, Vorname, Nachname, COUNT(*) AS Fahrten\nFROM Kunde, Ausleihe\nWHERE Kunde.KundenID = Ausleihe.KundenID\nGROUP BY Kunde.KundenID, Vorname, Nachname';
  genau(sql, []);
  genau(sql, [], mit('stadtrad'));
});

test('GB_REGEL: funktionale Abhängigkeit vom gruppierten Schlüssel zählt nicht (EH: alle Spalten aufzählen)', () => {
  const sql = 'SELECT Kunde.Vorname, Kunde.Nachname, COUNT(*)\nFROM Kunde, Ausleihe\nWHERE Kunde.KundenID = Ausleihe.KundenID\nGROUP BY Kunde.KundenID';
  const d = genau(sql, ['GB_REGEL', 'GB_REGEL'], mit('stadtrad'));
  assert.match(d[0].text, /`Kunde\.Vorname`/);
  assert.match(d[1].text, /`Kunde\.Nachname`/);
  genau(sql, ['GB_REGEL', 'GB_REGEL']);
});

test('GB_REGEL: Alias in GROUP BY ist erlaubt (auch für Berechnungen)', () => {
  genau('SELECT Typ AS Art, COUNT(*) AS Anzahl FROM Rad GROUP BY Art', []);
  genau('SELECT Wert * 0.05 AS Finderlohn, COUNT(*) FROM Fundsache GROUP BY Finderlohn', []);
  genau('SELECT Baujahr / 5, COUNT(*) FROM Rad GROUP BY Baujahr / 5', []);
  genau('SELECT Baujahr / 5, COUNT(*) FROM Rad GROUP BY Baujahr', []); // Spalte Baujahr ist gruppiert
});

test('GB_REGEL: Berechnung mit nicht gruppierter Spalte, * mit GROUP BY, falscher Selbstverbund-Partner', () => {
  const d = genau('SELECT Typ, Baujahr + 1, COUNT(*) FROM Rad GROUP BY Typ', ['GB_REGEL']);
  assert.match(d[0].text, /`Baujahr`/);
  const s = genau('SELECT * FROM Rad GROUP BY Typ', ['GB_REGEL']);
  assert.match(s[0].text, /\*/);
  genau('SELECT s2.Name, COUNT(*) FROM Station s1, Station s2 WHERE s1.StationID = s2.StationID GROUP BY s1.Name', ['GB_REGEL']);
});

test('GB_REGEL: Spalte nur in HAVING-Aggregat oder ORDER BY löst nichts aus', () => {
  genau('SELECT Typ FROM Rad GROUP BY Typ HAVING AVG(Baujahr) > 2019 ORDER BY Typ', []);
});

// ---------------------------------------------------------------------------------------------------------------
// HAVING_OHNE_AGG, WHERE_MIT_AGG (P1), ALIAS_IN_HAVING (P3)

test('HAVING_OHNE_AGG: Zeilenbedingung im HAVING', () => {
  const [d] = genau("SELECT Zahlart, COUNT(*) FROM Bon GROUP BY Zahlart HAVING Zahlart = 'bar'", ['HAVING_OHNE_AGG']);
  assert.deepEqual([d.falle, d.art, d.zeile, d.spalte], ['P1', 'fehler', 1, 59]);
  assert.match(d.text, /`HAVING Zahlart = 'bar'` prüft einzelne Zeilen – das gehört ins WHERE \(P1\)/);
});

test('HAVING_OHNE_AGG: je Teilbedingung, Aggregat-Bedingungen sind in Ordnung', () => {
  genau('SELECT Zahlart, COUNT(*) FROM Bon GROUP BY Zahlart HAVING COUNT(*) > 2', []);
  genau('SELECT Zahlart FROM Bon GROUP BY Zahlart HAVING COUNT(*) > 2 AND SUM(BonNr) < 900', []);
  const [d] = genau("SELECT Zahlart FROM Bon GROUP BY Zahlart HAVING COUNT(*) > 2 AND Zahlart = 'bar'", ['HAVING_OHNE_AGG']);
  assert.equal(d.spalte, 66);
});

test('WHERE_MIT_AGG: Aggregat im WHERE, auch über einen Alias', () => {
  const [d] = genau('SELECT Typ FROM Rad WHERE COUNT(*) > 2 GROUP BY Typ', ['WHERE_MIT_AGG']);
  assert.deepEqual([d.falle, d.art, d.spalte], ['P1', 'fehler', 27]);
  assert.match(d.text, /`COUNT\(\*\)` im WHERE geht nicht: WHERE filtert vor dem Gruppieren\. Nimm HAVING \(P1\)/);
  const [a] = genau('SELECT Typ, COUNT(*) AS Anzahl FROM Rad WHERE Anzahl > 2 GROUP BY Typ', ['WHERE_MIT_AGG']);
  assert.match(a.text, /`Anzahl`/);
  genau("SELECT Typ FROM Rad WHERE Typ != 'E-Bike'", []);
});

test('ALIAS_IN_HAVING statt HAVING_OHNE_AGG, wenn der Alias ein Aggregat meint', () => {
  const [d] = genau('SELECT Typ, COUNT(*) AS Anzahl FROM Rad GROUP BY Typ HAVING Anzahl > 3', ['ALIAS_IN_HAVING']);
  assert.deepEqual([d.falle, d.art, d.spalte], ['P3', 'fehler', 61]);
  assert.match(d.text, /`Anzahl`/);
  genau('SELECT Typ, COUNT(*) AS Anzahl FROM Rad GROUP BY Typ HAVING COUNT(*) > 3 ORDER BY Anzahl DESC', []);
  // Alias, der zugleich eine echte Spalte ist, ist kein Alias-Gebrauch
  genau("SELECT Typ AS Typ, COUNT(*) FROM Rad GROUP BY Typ HAVING Typ = 'E-Bike'", ['HAVING_OHNE_AGG'], mit('stadtrad'));
});

// ---------------------------------------------------------------------------------------------------------------
// MEHRDEUTIG (P7, braucht Schema)

test('MEHRDEUTIG: Spalte in mehreren FROM-Tabellen ohne Präfix', () => {
  const sql = 'SELECT RadID, Typ FROM Rad, Ausleihe WHERE Rad.RadID = Ausleihe.RadID';
  const [d] = genau(sql, ['MEHRDEUTIG'], mit('stadtrad'));
  assert.deepEqual([d.falle, d.art, d.zeile, d.spalte], ['P7', 'fehler', 1, 8]);
  assert.match(d.text, /Die Spalte RadID gibt es in mehreren Tabellen \(Rad, Ausleihe\)\. Schreib das Tabellenpräfix davor, z\. B\. `Rad\.RadID` \(P7\)/);
  genau(sql, []); // ohne Schema nicht entscheidbar
  genau('SELECT Rad.RadID, Typ FROM Rad, Ausleihe WHERE Rad.RadID = Ausleihe.RadID', [], mit('stadtrad'));
});

test('MEHRDEUTIG: Selbstverbund ohne Alias-Präfix; Alias in ORDER BY ist eindeutig', () => {
  genau('SELECT Name FROM Station s1, Station s2 WHERE s1.StationID = s2.StationID', ['MEHRDEUTIG'], mit('stadtrad'));
  genau(
    'SELECT Rad.RadID AS RadID, COUNT(*) AS Anzahl FROM Rad, Ausleihe WHERE Rad.RadID = Ausleihe.RadID GROUP BY Rad.RadID ORDER BY RadID',
    [],
    mit('stadtrad')
  );
});

test('MEHRDEUTIG: jede Spalte nur einmal gemeldet, auch im WHERE und GROUP BY', () => {
  const d = genau(
    'SELECT StandNr, COUNT(*) FROM Stand, Bon WHERE Stand.StandNr = Bon.StandNr AND StandNr = 4 GROUP BY StandNr',
    ['MEHRDEUTIG'],
    mit('stadtfest')
  );
  assert.equal(d[0].spalte, 8);
});

// ---------------------------------------------------------------------------------------------------------------
// KEIN_VERBUND (P2)

test('KEIN_VERBUND: zwei Tabellen ohne Bedingung', () => {
  const [d] = genau('SELECT * FROM Rad, Station', ['KEIN_VERBUND']);
  assert.deepEqual([d.falle, d.art, d.zeile, d.spalte], ['P2', 'fehler', 1, 20]);
  assert.match(d.text, /Station ist mit keiner anderen Tabelle verbunden/);
  assert.match(d.text, /\(P2\)/);
});

test('KEIN_VERBUND: eine von drei Tabellen hängt nicht am Verbund', () => {
  const [d] = genau(
    'SELECT *\nFROM Kunde, Ausleihe, Station\nWHERE Ausleihe.StartStation = Station.StationID',
    ['KEIN_VERBUND']
  );
  assert.deepEqual([d.zeile, d.spalte], [2, 6]);
  assert.match(d.text, /^Kunde ist mit keiner anderen Tabelle verbunden/);
});

test('KEIN_VERBUND: zwei getrennte Paare melden die kleinere Gruppe', () => {
  const [d] = genau(
    'SELECT * FROM Kunde, Ausleihe, Rad, Station WHERE Kunde.KundenID = Ausleihe.KundenID AND Rad.StationID = Station.StationID',
    ['KEIN_VERBUND']
  );
  assert.match(d.text, /Rad und Station sind mit den übrigen Tabellen nicht verbunden/);
});

test('KEIN_VERBUND: Selbstverbund mit Prädikat ist verbunden', () => {
  genau('SELECT a.AusleihID, s1.Name, s2.Name FROM Ausleihe a, Station s1, Station s2 WHERE a.StartStation = s1.StationID AND a.ZielStation = s2.StationID', []);
  genau('SELECT e.Name, m.Name FROM Ermittler e, Ermittler m WHERE e.MentorNr = m.ErmittlerNr', []);
});

test('KEIN_VERBUND: Verbundbedingung nur in einem OR-Zweig zählt nicht', () => {
  genau("SELECT * FROM Rad, Station WHERE Rad.StationID = Station.StationID OR Rad.Typ = 'E-Bike'", ['KEIN_VERBUND']);
  genau("SELECT * FROM Rad, Station WHERE (Rad.StationID = Station.StationID) AND (Rad.Typ = 'E-Bike' OR Rad.Typ = 'Lastenrad')", []);
});

test('KEIN_VERBUND: unqualifizierte Spalten werden mit Schema aufgelöst, ohne Schema keine Falschmeldung', () => {
  genau('SELECT Titel, Name FROM Fall, Ermittler WHERE LeiterNr = ErmittlerNr', []);
  genau('SELECT Titel, Name FROM Fall, Ermittler WHERE LeiterNr = ErmittlerNr', [], mit('detektei'));
  genau('SELECT Name FROM Sorte, Verkauf WHERE Kugeln > 2', ['KEIN_VERBUND'], mit('eisdiele'));
  // eine Bedingung mit nur einer Spalte kann nie zwei Tabellen verbinden – auch ohne Schema sicher
  genau('SELECT Name FROM Sorte, Verkauf WHERE Kugeln > 2', ['KEIN_VERBUND']);
});

test('KEIN_VERBUND: JOIN … ON zählt als Verbund (nur JOIN_ON-Hinweis)', () => {
  genau('SELECT * FROM Rad JOIN Station ON Rad.StationID = Station.StationID', ['JOIN_ON']);
  genau('SELECT * FROM Rad CROSS JOIN Station', ['JOIN_ON', 'KEIN_VERBUND']);
});

// ---------------------------------------------------------------------------------------------------------------
// NULL_VERGLEICH (P5), AND_OR_MISCH (P6)

test('NULL_VERGLEICH: = NULL und != NULL', () => {
  const [d] = genau('SELECT AusleihID FROM Ausleihe WHERE Ende = NULL', ['NULL_VERGLEICH']);
  assert.deepEqual([d.falle, d.art, d.spalte], ['P5', 'fehler', 38]);
  assert.match(d.text, /`Ende = NULL` ist nie wahr: Mit NULL vergleichst du nur über `IS NULL` \(P5\)/);
  const [n] = genau('SELECT AusleihID FROM Ausleihe WHERE Ende != NULL', ['NULL_VERGLEICH']);
  assert.match(n.text, /`IS NOT NULL`/);
  genau('SELECT AusleihID FROM Ausleihe WHERE NULL = Ende', ['NULL_VERGLEICH']);
  genau('SELECT AusleihID FROM Ausleihe WHERE Ende <> NULL', ['NULL_VERGLEICH', 'UNGLEICH_ALT']);
  genau('SELECT AusleihID FROM Ausleihe WHERE Ende IS NULL OR ZielStation IS NOT NULL', []);
});

test('AND_OR_MISCH: Hinweis bei AND und OR ohne Klammern – auch im strengen Abimodus nur Hinweis', () => {
  for (const sql of [
    "SELECT * FROM Rad WHERE Typ = 'E-Bike' AND Baujahr > 2020 OR Status = 'frei'",
    "SELECT * FROM Rad WHERE Typ = 'E-Bike' OR Baujahr > 2020 AND Status = 'frei'"
  ]) {
    for (const abimodus of ['streng', 'hinweis', 'aus']) {
      const [d] = genau(sql, ['AND_OR_MISCH'], { abimodus });
      assert.deepEqual([d.falle, d.art], ['P6', 'hinweis']);
      assert.match(d.text, /AND bindet stärker als OR\. Setz Klammern, damit klar ist, was zusammengehört \(P6\)/);
    }
  }
  genau("SELECT * FROM Rad WHERE (Typ = 'E-Bike' AND Baujahr > 2020) OR Status = 'frei'", []);
  genau("SELECT * FROM Rad WHERE Typ = 'E-Bike' AND (Baujahr > 2020 OR Status = 'frei')", []);
  genau("SELECT * FROM Rad WHERE Typ = 'E-Bike' OR Typ = 'Lastenrad' OR Status = 'frei'", []);
  genau("SELECT Typ FROM Rad GROUP BY Typ HAVING COUNT(*) > 1 AND MIN(Baujahr) > 2018 OR MAX(Baujahr) = 2026", ['AND_OR_MISCH']);
});

// ---------------------------------------------------------------------------------------------------------------
// Fremdkörper und Abimodus

const FREMD = [
  ['JOIN_ON', 'SELECT Rad.RadID FROM Rad JOIN Station ON Rad.StationID = Station.StationID', /JOIN … ON kommt im Abitur nicht vor\. Schreib den Verbund mit FROM … WHERE/],
  ['JOIN_ON', 'SELECT * FROM Rad LEFT JOIN Station ON Rad.StationID = Station.StationID', /JOIN/],
  ['UNTERABFRAGE', 'SELECT Name FROM Station WHERE StationID IN (SELECT StationID FROM Rad)', /Verschachtelte Abfragen kommen im Abitur nicht vor/],
  ['UNTERABFRAGE', 'SELECT x.Name FROM (SELECT Name FROM Station) x', /Verschachtelte/],
  ['UNTERABFRAGE', 'SELECT Name FROM Station WHERE EXISTS (SELECT * FROM Rad WHERE Rad.StationID = Station.StationID)', /Verschachtelte/],
  ['UNTERABFRAGE', 'WITH RECURSIVE z(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM z) SELECT n FROM z', /Verschachtelte/],
  ['UNGLEICH_ALT', "SELECT * FROM Rad WHERE Typ <> 'E-Bike'", /Im Abitur schreibst du „ungleich“ als `!=`/],
  ['UNION', 'SELECT Name FROM Station UNION SELECT Typ FROM Rad', /UNION/]
];

for (const [code, sql, text] of FREMD) {
  test(`Abimodus: ${code} – streng Fehler, hinweis Hinweis, aus still (${sql.slice(0, 40)}…)`, () => {
    const streng = pruefe(sql, { abimodus: 'streng' }).filter((d) => d.code === code);
    assert.ok(streng.length >= 1, `${code} fehlt`);
    assert.equal(streng[0].art, 'fehler');
    assert.equal(streng[0].falle, null);
    assert.match(streng[0].text, text);
    const hinweis = pruefe(sql, { abimodus: 'hinweis' }).filter((d) => d.code === code);
    assert.equal(hinweis[0].art, 'hinweis');
    assert.deepEqual(pruefe(sql, { abimodus: 'aus' }).filter((d) => d.code === code), []);
  });
}

test('UNTERABFRAGE: Position am verschachtelten SELECT, nur die äußerste gemeldet', () => {
  const d = genau(
    'SELECT Name FROM Station WHERE StationID IN (SELECT StationID FROM Rad WHERE RadID IN (SELECT RadID FROM Ausleihe))',
    ['UNTERABFRAGE']
  );
  assert.equal(d[0].spalte, 46);
});

test('UNGLEICH_ALT auch in einer Unterabfrage, Position am Operator', () => {
  const d = pruefe("SELECT * FROM Rad WHERE Typ <> 'E-Bike'", { abimodus: 'streng' });
  assert.deepEqual([d[0].zeile, d[0].spalte], [1, 29]);
});

test('NICHT_SELECT: DML/DDL ist in streng und hinweis ein Fehler, in aus still', () => {
  for (const sql of ["INSERT INTO Station VALUES (99, 'Neu', 'Altstadt', 4)", 'DROP TABLE Rad', "UPDATE Rad SET Status = 'frei'", 'DELETE FROM Rad', 'CREATE TABLE x (a INTEGER)', 'ALTER TABLE Rad ADD Farbe TEXT']) {
    for (const abimodus of ['streng', 'hinweis']) {
      const [d] = genau(sql, ['NICHT_SELECT'], { abimodus });
      assert.equal(d.art, 'fehler');
      assert.equal(d.falle, null);
      assert.match(d.text, /SELECT/);
      assert.deepEqual([d.zeile, d.spalte], [1, 1]);
    }
    genau(sql, [], { abimodus: 'aus' });
  }
});

test('Standard-Abimodus ist hinweis', () => {
  const d = pruefeRegeln(parse("SELECT * FROM Rad WHERE Typ <> 'x'").ast);
  assert.equal(d[0].art, 'hinweis');
});

test('Regeln gelten auch im Abimodus aus und in jedem Teil einer UNION', () => {
  genau('SELECT Name, COUNT(*) FROM Sorte', ['GB_REGEL'], { abimodus: 'aus' });
  genau('SELECT Name, COUNT(*) FROM Sorte UNION SELECT Typ FROM Rad, Station', ['GB_REGEL', 'UNION', 'KEIN_VERBUND']);
});

test('Texte verraten keine Lösung: kein vollständiges SELECT, kein GROUP-BY-Vorschlag', () => {
  const alle = [
    ...pruefe('SELECT Kunde.Vorname, COUNT(*) FROM Kunde, Ausleihe GROUP BY Kunde.KundenID', mit('stadtrad')),
    ...pruefe("SELECT Typ, COUNT(*) AS Anzahl FROM Rad WHERE Anzahl > 1 GROUP BY Typ HAVING Anzahl > 2 AND Typ = 'x'")
  ];
  for (const d of alle) {
    assert.doesNotMatch(d.text, /SELECT .* FROM/);
    assert.doesNotMatch(d.text, /GROUP BY Kunde/);
  }
});

// ---------------------------------------------------------------------------------------------------------------
// LIESMICH: Beispielabfragen ohne Regelfehler, Fehlabfragen mit Diagnose

const ABFRAGEN = liesmichAbfragen();

// Fehlabfragen, die nur am Ergebnis (über die Randfall-Varianten, Prüfer Task 10) erkennbar sind.
const NUR_AM_ERGEBNIS = {
  detektei: 'nach Namen statt nach Schlüssel gruppiert (P3, Variante gleichnamig)',
  fundbuero: 'Bezeichnung = … passt nur zufällig (Variante gleichnamig)',
  stadtfest: 'Schicht im Verbund vervielfacht Umsätze (P2, Vervielfachung)',
  stadtrad: 'nach Namen statt nach Schlüssel gruppiert (P3, Variante gleichnamig)'
};
const ERWARTET_FEHLABFRAGE = { datenspuren: ['AND_OR_MISCH'] };

for (const a of ABFRAGEN.filter((x) => !x.fehlabfrage)) {
  test(`LIESMICH ohne Regelfehler (streng, mit Schema): ${a.datei}:${a.zeile}`, (t) => {
    const d = pruefe(a.sql, { abimodus: 'streng', schema: SCHEMA[a.db] });
    assert.deepEqual(d.filter((x) => x.art === 'fehler'), [], a.sql);
    if (d.length) t.diagnostic(`Hinweise: ${d.map((x) => x.code).join(', ')}`);
  });
}

for (const a of ABFRAGEN.filter((x) => x.fehlabfrage)) {
  test(`LIESMICH-Fehlabfrage: ${a.datei}:${a.zeile}`, () => {
    const d = pruefe(a.sql, { abimodus: 'streng', schema: SCHEMA[a.db] });
    if (NUR_AM_ERGEBNIS[a.db]) {
      // erlaubt: keine Parser-Diagnose; der Prüfer erkennt sie über die Varianten
      assert.ok(!ERWARTET_FEHLABFRAGE[a.db]);
      return;
    }
    const erwartet = ERWARTET_FEHLABFRAGE[a.db];
    assert.ok(erwartet, `Fehlabfrage ohne Erwartung: ${a.datei}:${a.zeile}`);
    assert.ok(d.length >= 1, 'keine Diagnose');
    for (const code of erwartet) assert.ok(codes(d).includes(code), `${code} fehlt: ${JSON.stringify(d)}`);
    if (a.falle) assert.ok(d.some((x) => x.falle === a.falle), `Falle ${a.falle} nicht diagnostiziert`);
  });
}

test('Liste der nur am Ergebnis erkennbaren Fehlabfragen ist vollständig und aktuell', () => {
  const fehl = ABFRAGEN.filter((x) => x.fehlabfrage);
  assert.equal(fehl.length, 5);
  const ohneDiagnose = fehl
    .filter((a) => pruefe(a.sql, { abimodus: 'streng', schema: SCHEMA[a.db] }).length === 0)
    .map((a) => a.db)
    .sort();
  assert.deepEqual(ohneDiagnose, Object.keys(NUR_AM_ERGEBNIS).sort());
});

// ---------------------------------------------------------------------------------------------------------------
// Isomorph

test('regeln.js läuft im Browser-Kontext zusammen mit parser.js (ohne module/require)', () => {
  const dir = path.join(__dirname, '..', 'src', 'sql');
  const code = fs.readFileSync(path.join(dir, 'regeln.js'), 'utf8');
  assert.ok(!/\brequire\s*\(/.test(code), 'regeln.js darf nichts per require laden');
  const self = {};
  const kontext = vm.createContext({ self });
  vm.runInContext(fs.readFileSync(path.join(dir, 'parser.js'), 'utf8'), kontext);
  vm.runInContext(code, kontext);
  const ast = self.DD_SQL_PARSER.parse('SELECT Name, COUNT(*) FROM Sorte').ast;
  assert.deepEqual([...self.DD_SQL_REGELN.pruefeRegeln(ast, { abimodus: 'streng' }).map((d) => d.code)], ['GB_REGEL']);
});

test('GET /static/js/sql/regeln.js liefert dieselben Bytes', async () => {
  const { app } = testApp();
  const res = await request(app).get('/static/js/sql/regeln.js').buffer(true).parse((r, cb) => {
    const teile = [];
    r.on('data', (d) => teile.push(d));
    r.on('end', () => cb(null, Buffer.concat(teile)));
  });
  assert.equal(res.status, 200);
  assert.match(res.headers['content-type'], /^application\/javascript/);
  assert.ok(Buffer.compare(res.body, fs.readFileSync(path.join(__dirname, '..', 'src', 'sql', 'regeln.js'))) === 0);
});
