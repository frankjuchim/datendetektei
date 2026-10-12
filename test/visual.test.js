'use strict';
// Rechenschicht der Visualisierungen (Plan Phase 4 Task 1, Spec §7.6.2/7.6.3): Zeitlupe, Spurenbrett, Sortierfächer.
// Review Focus 1: alle LIESMICH-Beispielabfragen gegen basis.sql – Zähler je Schritt = Kontrollabfrage, letzter
// Schritt = Originalergebnis. Review Focus 2 (WHERE ↔ HAVING) und 3 (Fäden, NULL-Fremdschlüssel), Grenzfälle.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const request = require('supertest');
const Database = require('better-sqlite3');
const visual = require('../src/sql/visual');
const { parse, zerlege } = require('../src/sql/parser');
const { liesmichAbfragen, SEED } = require('./hilfen_schema');
const { testApp } = require('./helpers');

const SQL_DIR = path.join(__dirname, '..', 'src', 'sql');

// ---------------------------------------------------------------------------------------------------------------
// Hilfen

const dbs = new Map();
function db(name) {
  if (!dbs.has(name)) {
    const d = new Database(':memory:');
    d.exec(fs.readFileSync(path.join(SEED, name, 'basis.sql'), 'utf8'));
    dbs.set(name, d);
  }
  return dbs.get(name);
}

/**
 * Asynchroner Adapter wie der Worker im Browser: { spalten, zeilen (≤ 300), gesamt } bzw. { fehler } – nie ein Wurf.
 * zaehler.anfragen zählt die Abfragen (Aufwand im Blick behalten).
 */
function adapter(d) {
  const f = async (sql) => {
    f.anfragen++;
    try {
      const stmt = d.prepare(sql);
      const spalten = stmt.columns().map((c) => c.name);
      const alle = stmt.raw(true).all();
      return { spalten, zeilen: alle.slice(0, 300), gesamt: alle.length };
    } catch (e) {
      return { fehler: e.message };
    }
  };
  f.anfragen = 0;
  return f;
}

function wert(d, sql) {
  return d.prepare(sql).pluck().get();
}
function alleZeilen(d, sql) {
  return d.prepare(sql).raw(true).all();
}
function schluessel(z) {
  return JSON.stringify(z);
}
function multimenge(zeilen) {
  return zeilen.map(schluessel).sort();
}

/** Text eines AST-Knotens; der Parser lässt die Klammer eines geklammerten linken Teils weg („(a OR b) AND c“). */
function text(sql, k) {
  const t = sql.slice(k.start.index, k.ende.index);
  let tiefe = 0;
  let minimum = 0;
  for (const tok of zerlege(t).tokens) {
    if (tok.art === 'operator' && tok.wert === '(') tiefe++;
    if (tok.art === 'operator' && tok.wert === ')') minimum = Math.min(minimum, --tiefe);
  }
  return '('.repeat(-minimum) + t;
}
/** Position des Schlüsselworts vor einem Knoten (z. B. ORDER vor dem ersten ORDER-BY-Ausdruck). */
function schluesselwortVor(sql, k, wort) {
  return sql.toUpperCase().lastIndexOf(wort, k.start.index);
}

/** Selbst gebaute Kontrollabfragen aus dem AST (unabhängig von visual.js). */
function kontrollen(sql) {
  const ast = parse(sql).ast;
  const F = ast.from.length ? sql.slice(ast.from[0].start.index, ast.from[ast.from.length - 1].ende.index) : null;
  const W = ast.where ? text(sql, ast.where) : null;
  const G = ast.groupBy.map((g) => text(sql, g)).join(', ');
  const H = ast.having ? text(sql, ast.having) : null;
  const basis = 'FROM ' + F + (W ? ' WHERE ' + W : '');
  let ohneOrder = sql;
  if (ast.orderBy.length) ohneOrder = sql.slice(0, schluesselwortVor(sql, ast.orderBy[0], 'ORDER'));
  else if (ast.limit) ohneOrder = sql.slice(0, schluesselwortVor(sql, ast.limit, 'LIMIT'));
  return { ast, F, W, G, H, basis, ohneOrder: ohneOrder.trim() };
}

function erwarteteKlauseln(ast) {
  const k = [];
  if (ast.from.length) k.push('FROM');
  if (ast.where) k.push('WHERE');
  if (ast.groupBy.length) k.push('GROUP BY');
  if (ast.having) k.push('HAVING');
  k.push('SELECT');
  if (ast.orderBy.length) k.push('ORDER BY');
  if (ast.limit) k.push('LIMIT');
  return k;
}

function schritt(ergebnis, klausel) {
  return ergebnis.schritte.find((s) => s.klausel === klausel);
}

// ---------------------------------------------------------------------------------------------------------------
// Review Focus 1: alle Beispielabfragen aller LIESMICH-Dateien

const BEISPIELE = liesmichAbfragen().filter((a) => !a.fehlabfrage);

test('LIESMICH liefert genug Beispielabfragen', () => {
  assert.ok(BEISPIELE.length >= 80, `nur ${BEISPIELE.length}`);
});

for (const a of BEISPIELE) {
  test(`Zeitlupe stimmt: ${a.datei}:${a.zeile}`, async () => {
    const d = db(a.db);
    const f = adapter(d);
    const erg = await visual.zeitlupe(a.sql, f);
    assert.equal(erg.fehler, undefined, erg.fehler);
    assert.equal(erg.hinweis, null);
    const k = kontrollen(a.sql);
    assert.deepEqual(
      erg.schritte.map((s) => s.klausel),
      erwarteteKlauseln(k.ast)
    );
    erg.schritte.forEach((s, i) => {
      assert.equal(s.nummer, i + 1);
      assert.ok(typeof s.text === 'string' && s.text.length > 10 && !/undefined|NaN|null/.test(s.text), s.text);
      assert.ok(s.zeilen.length <= 50);
      assert.ok(s.spalten.length > 0);
      for (const z of s.zeilen) assert.equal(z.werte.length, s.spalten.length);
      // Bereich: Klausel im SQL-Text
      const stueck = a.sql.slice(s.bereich.start, s.bereich.ende).toUpperCase();
      assert.ok(stueck.startsWith(s.klausel === 'GROUP BY' ? 'GROUP' : s.klausel === 'ORDER BY' ? 'ORDER' : s.klausel), stueck);
    });

    // FROM: Kreuzprodukt
    const from = schritt(erg, 'FROM');
    const produkt = k.ast.from
      .map((t) => wert(d, `SELECT COUNT(*) FROM "${t.name}"`))
      .reduce((x, y) => x * y, 1);
    assert.equal(from.zaehler.wert, produkt);
    assert.equal(from.gesamt, produkt);
    if (produkt <= 200000) assert.equal(wert(d, `SELECT COUNT(*) FROM ${k.F}`), produkt);
    assert.equal(from.zeilen.length, Math.min(50, produkt));

    // WHERE
    let nachWhere = produkt;
    if (k.W) {
      const w = schritt(erg, 'WHERE');
      nachWhere = wert(d, `SELECT COUNT(*) ${k.basis}`);
      assert.equal(w.zaehler.wert, nachWhere);
      assert.equal(w.zaehler.vorher, produkt);
      assert.equal(w.markierung.behalten, nachWhere);
      assert.equal(w.markierung.verworfen, produkt - nachWhere);
      // Markierungen stimmen je Zeile (eindeutig über die künstliche Zeilennummer)
      const ids = new Set();
      for (const z of w.zeilen) {
        assert.ok(!ids.has(z.id), 'Zeilennummer doppelt');
        ids.add(z.id);
        assert.equal(typeof z.verworfen, 'boolean');
      }
      if (nachWhere > 0) assert.ok(w.zeilen.some((z) => !z.verworfen));
      if (produkt - nachWhere > 0) assert.ok(w.zeilen.some((z) => z.verworfen));
    }

    // GROUP BY / HAVING
    if (k.G) {
      const g = schritt(erg, 'GROUP BY');
      const gruppen = wert(d, `SELECT COUNT(*) FROM (SELECT 1 ${k.basis} GROUP BY ${k.G})`);
      assert.equal(g.zaehler.wert, gruppen);
      assert.equal(g.zaehler.vorher, nachWhere);
      assert.equal(g.zaehler.einheit, gruppen === 1 ? 'Gruppe' : 'Gruppen');
      for (const z of g.zeilen) assert.ok(g.gruppen.some((gr) => gr.nr === z.gruppe), 'Zeile ohne Gruppe');
      const summe = g.gruppen.reduce((s, gr) => s + gr.anzahl, 0);
      assert.ok(summe <= nachWhere);
      if (k.H) {
        const h = schritt(erg, 'HAVING');
        const behalten = wert(d, `SELECT COUNT(*) FROM (SELECT 1 ${k.basis} GROUP BY ${k.G} HAVING ${k.H})`);
        assert.equal(h.zaehler.wert, behalten);
        assert.equal(h.zaehler.vorher, gruppen);
      }
    }

    // SELECT
    const sel = schritt(erg, 'SELECT');
    const nachSelect = wert(d, `SELECT COUNT(*) FROM (${k.ohneOrder})`);
    assert.equal(sel.zaehler.wert, nachSelect);

    // letzter Schritt = Ergebnis der Originalabfrage
    const original = alleZeilen(d, a.sql);
    const letzter = erg.schritte[erg.schritte.length - 1];
    assert.equal(letzter.zaehler.wert, original.length);
    const behalten = letzter.zeilen.filter((z) => !z.verworfen).map((z) => z.werte);
    const spalten = d.prepare(a.sql).columns().map((c) => c.name);
    assert.deepEqual(letzter.spalten, spalten);
    if (original.length <= 50) {
      if (k.ast.orderBy.length) assert.deepEqual(behalten, original);
      else assert.deepEqual(multimenge(behalten), multimenge(original));
    } else if (k.ast.orderBy.length) {
      assert.deepEqual(behalten, original.slice(0, behalten.length));
    } else {
      const alle = new Set(original.map(schluessel));
      for (const z of behalten) assert.ok(alle.has(schluessel(z)));
    }
    assert.ok(f.anfragen <= 30, `${f.anfragen} Abfragen`);
  });
}

// ---------------------------------------------------------------------------------------------------------------
// Review Focus 2: WHERE graut Zeilen vor dem Gruppieren, HAVING ganze Gruppen danach

test('WHERE markiert einzelne Zeilen, HAVING ganze Gruppen', async () => {
  const sql = [
    'SELECT Stadtteil, COUNT(*) AS Offen',
    'FROM Fundsache',
    "WHERE Kategorie != 'Schlüssel'",
    'GROUP BY Stadtteil',
    'HAVING COUNT(*) >= 8',
    'ORDER BY Offen DESC'
  ].join('\n');
  const d = db('fundbuero');
  const erg = await visual.zeitlupe(sql, adapter(d));
  assert.equal(erg.fehler, undefined);
  const w = schritt(erg, 'WHERE');
  assert.equal(w.markierung.art, 'zeilen');
  assert.ok(w.zeilen.some((z) => z.verworfen) && w.zeilen.some((z) => !z.verworfen));
  assert.ok(w.zeilen.every((z) => z.gruppe === undefined));

  const g = schritt(erg, 'GROUP BY');
  assert.equal(g.markierung.art, 'gruppen');
  assert.ok(g.zeilen.every((z) => !z.verworfen), 'GROUP BY verwirft nichts');

  const h = schritt(erg, 'HAVING');
  assert.equal(h.markierung.art, 'gruppen');
  const gruppenBehalten = wert(d, "SELECT COUNT(*) FROM (SELECT 1 FROM Fundsache WHERE Kategorie != 'Schlüssel' GROUP BY Stadtteil HAVING COUNT(*) >= 8)");
  const gruppenAlle = wert(d, "SELECT COUNT(DISTINCT Stadtteil) FROM Fundsache WHERE Kategorie != 'Schlüssel'");
  assert.ok(gruppenBehalten > 0 && gruppenBehalten < gruppenAlle, 'Testdaten: HAVING soll filtern');
  // jede Gruppe: alle Zeilen gleich markiert, Markierung = Gruppenstatus
  for (const gr of h.gruppen) {
    const zeilen = h.zeilen.filter((z) => z.gruppe === gr.nr);
    assert.ok(zeilen.length > 0);
    for (const z of zeilen) assert.equal(z.verworfen, !gr.behalten);
  }
  assert.ok(h.gruppen.some((gr) => gr.behalten) && h.gruppen.some((gr) => !gr.behalten), 'beide Arten sichtbar');
  assert.equal(h.markierung.behalten, gruppenBehalten);
  assert.equal(h.markierung.verworfen, gruppenAlle - gruppenBehalten);
  // Gruppenschlüssel der Zeile passt zum Gruppennamen
  const idx = h.spalten.indexOf('Stadtteil');
  for (const z of h.zeilen) {
    const gr = h.gruppen.find((x) => x.nr === z.gruppe);
    assert.deepEqual(gr.schluessel, [z.werte[idx]]);
  }
});

test('Gruppenfarben 1–3, ab Gruppe 4 keine Farbe; Name aus dem Schlüssel', async () => {
  const sql = 'SELECT Kategorie, COUNT(*) AS Anzahl\nFROM Fundsache\nGROUP BY Kategorie';
  const erg = await visual.zeitlupe(sql, adapter(db('fundbuero')));
  const g = schritt(erg, 'GROUP BY');
  assert.ok(g.gruppen.length >= 4);
  assert.deepEqual(
    g.gruppen.map((x) => x.farbe),
    g.gruppen.map((x, i) => (i < 3 ? i + 1 : null))
  );
  for (const gr of g.gruppen) assert.equal(gr.name, String(gr.schluessel[0]));
  // SELECT-Zeilen tragen die Gruppe
  const sel = schritt(erg, 'SELECT');
  assert.ok(sel.zeilen.every((z) => typeof z.gruppe === 'number'));
});

// ---------------------------------------------------------------------------------------------------------------
// Review Focus 3: Spurenbrett

test('Spurenbrett: 45 × 13 = 585 Fäden → passende bleiben; NULL-Fremdschlüssel hängt an keinem Faden', async () => {
  const d = db('stadtrad');
  const erg = await visual.spurenbrett(
    { tabellen: [{ name: 'Rad', limit: 50 }, { name: 'Station', limit: 50 }], bedingung: 'Rad.StationID = Station.StationID' },
    adapter(d)
  );
  assert.equal(erg.fehler, undefined, erg.fehler);
  assert.equal(erg.tabellen[0].zeilen.length, 45);
  assert.equal(erg.tabellen[1].zeilen.length, 13);
  assert.equal(erg.gesamt, 585);
  assert.equal(erg.rechnung, '45 × 13');
  const passend = wert(d, 'SELECT COUNT(*) FROM Rad, Station WHERE Rad.StationID = Station.StationID');
  assert.equal(erg.bleiben, passend);
  assert.equal(erg.passend.length, passend);
  assert.equal(erg.faeden.length, 585);
  assert.equal(erg.zusammengefasst, false);
  // NULL-Fremdschlüssel: Rad 1 hat StationID NULL
  const radSpalten = erg.tabellen[0].spalten;
  const iRad = erg.tabellen[0].zeilen.findIndex((z) => z[radSpalten.indexOf('RadID')] === 1);
  assert.ok(erg.ohneFaden.some((o) => o.tabelle === 0 && o.zeile === iRad));
  assert.ok(!erg.passend.some((p) => p[0] === iRad));
  const nullRaeder = wert(d, 'SELECT COUNT(*) FROM Rad WHERE StationID IS NULL');
  assert.equal(erg.ohneFaden.filter((o) => o.tabelle === 0).length, nullRaeder);
  // jeder passende Faden erfüllt die Bedingung
  const sIdRad = radSpalten.indexOf('StationID');
  const sIdSt = erg.tabellen[1].spalten.indexOf('StationID');
  for (const [i, j] of erg.passend) assert.equal(erg.tabellen[0].zeilen[i][sIdRad], erg.tabellen[1].zeilen[j][sIdSt]);
});

test('Spurenbrett: Auswahl über Primärschlüssel, Standard klein, Vorschlag aus den FKs', async () => {
  const d = db('stadtrad');
  const erg = await visual.spurenbrett(
    { tabellen: [{ name: 'Rad', zeilen: [1, 2, 3, 4] }, { name: 'Station' }], bedingung: 'Rad.StationID = Station.StationID' },
    adapter(d)
  );
  assert.equal(erg.fehler, undefined, erg.fehler);
  assert.deepEqual(erg.tabellen[0].zeilen.map((z) => z[0]), [1, 2, 3, 4]);
  assert.ok(erg.tabellen[1].zeilen.length >= 2 && erg.tabellen[1].zeilen.length <= 6);
  assert.equal(erg.gesamt, 4 * erg.tabellen[1].zeilen.length);
  assert.deepEqual(erg.tabellen[0].pk, [0]);

  const schema = [
    { tabelle: 'Station', spalten: [{ name: 'StationID', pk: true, fk: null }, { name: 'Name', pk: false, fk: null }] },
    { tabelle: 'Rad', spalten: [{ name: 'RadID', pk: true, fk: null }, { name: 'StationID', pk: false, fk: { tabelle: 'Station', spalte: 'StationID' } }] }
  ];
  assert.equal(visual.vorschlag(schema, ['Rad', 'Station']), 'Rad.StationID = Station.StationID');
  assert.equal(visual.vorschlag(schema, [{ name: 'Station' }, { name: 'Rad' }]), 'Rad.StationID = Station.StationID');
  assert.equal(visual.vorschlag(schema, ['Station']), null);
  // Form aus dem Worker (name statt tabelle), drei Tabellen
  const schema3 = [
    { name: 'Ausleihe', spalten: [{ name: 'AusleihID', pk: true }, { name: 'RadID', fk: { tabelle: 'Rad', spalte: 'RadID' } }, { name: 'KundenID', fk: { tabelle: 'Kunde', spalte: 'KundenID' } }] },
    { name: 'Rad', spalten: [{ name: 'RadID', pk: true }] },
    { name: 'Kunde', spalten: [{ name: 'KundenID', pk: true }] }
  ];
  assert.equal(
    visual.vorschlag(schema3, ['Rad', 'Ausleihe', 'Kunde']),
    'Ausleihe.RadID = Rad.RadID AND Ausleihe.KundenID = Kunde.KundenID'
  );
});

test('Spurenbrett: drei Tabellen, Fäden als Tripel; > 2000 Fäden werden zusammengefasst', async () => {
  const d = db('stadtrad');
  const f = adapter(d);
  const klein = await visual.spurenbrett(
    {
      tabellen: [{ name: 'Ausleihe', limit: 5 }, { name: 'Rad', limit: 6 }, { name: 'Kunde', limit: 4 }],
      bedingung: 'Ausleihe.RadID = Rad.RadID AND Ausleihe.KundenID = Kunde.KundenID'
    },
    f
  );
  assert.equal(klein.fehler, undefined, klein.fehler);
  assert.equal(klein.gesamt, 120);
  assert.equal(klein.rechnung, '5 × 6 × 4');
  assert.equal(klein.faeden.length, 120);
  assert.ok(klein.faeden.every((x) => x.length === 3));

  const gross = await visual.spurenbrett(
    { tabellen: [{ name: 'Ausleihe', limit: 50 }, { name: 'Kunde', limit: 50 }], bedingung: 'Ausleihe.KundenID = Kunde.KundenID' },
    f
  );
  assert.equal(gross.fehler, undefined, gross.fehler);
  assert.equal(gross.gesamt, 2500);
  assert.equal(gross.zusammengefasst, true);
  assert.deepEqual(gross.faeden, []);
  assert.ok(typeof gross.hinweis === 'string' && gross.hinweis.length > 0);
  assert.equal(gross.bleiben, gross.passend.length);
});

test('Spurenbrett: Bedingung nur mit Spalten der gewählten Tabellen, sonst deutscher Fehler', async () => {
  const f = adapter(db('stadtrad'));
  const basis = { tabellen: [{ name: 'Rad' }, { name: 'Station' }] };
  for (const bedingung of [
    'Rad.StationID = Kunde.KundenID',
    'Rad.Gibtsnicht = 1',
    'StationID = 1',
    '1 = 1; DROP TABLE Rad',
    '1 = 1 GROUP BY Rad.Typ',
    'Rad.StationID IN (SELECT StationID FROM Station)',
    'Rad.StationID = '
  ]) {
    const erg = await visual.spurenbrett({ ...basis, bedingung }, f);
    assert.ok(typeof erg.fehler === 'string' && erg.fehler.length > 0, bedingung);
    assert.doesNotMatch(erg.fehler, /no such|syntax error/, bedingung);
  }
  const unbekannt = await visual.spurenbrett({ tabellen: [{ name: 'Rad' }, { name: 'Gibtsnicht' }], bedingung: '1 = 1' }, f);
  assert.ok(unbekannt.fehler);
  const zuViele = await visual.spurenbrett(
    { tabellen: [{ name: 'Rad' }, { name: 'Station' }, { name: 'Kunde' }, { name: 'Ausleihe' }], bedingung: '1 = 1' },
    f
  );
  assert.ok(zuViele.fehler);
  // Selbstverbund mit Alias
  const selbst = await visual.spurenbrett(
    {
      tabellen: [{ name: 'Station', alias: 's1', limit: 3 }, { name: 'Station', alias: 's2', limit: 3 }],
      bedingung: 's1.Stadtteil = s2.Stadtteil'
    },
    f
  );
  assert.equal(selbst.fehler, undefined, selbst.fehler);
  assert.equal(selbst.gesamt, 9);
  assert.ok(selbst.bleiben >= 3);
});

// ---------------------------------------------------------------------------------------------------------------
// Sortierfächer

test('Sortierfächer: Korb (WHERE), Fächer mit Aggregaten, HAVING graut Fächer, Umschalter COUNT ↔ SUM', async () => {
  const d = db('stadtrad');
  const sql = [
    'SELECT Rad.Typ, COUNT(*) AS Reparaturen, SUM(Reparatur.Kosten) AS Gesamtkosten',
    'FROM Rad, Reparatur',
    'WHERE Rad.RadID = Reparatur.RadID',
    'GROUP BY Rad.Typ',
    'HAVING COUNT(*) > 10'
  ].join('\n');
  const erg = await visual.sortierfaecher(sql, adapter(d));
  assert.equal(erg.fehler, undefined, erg.fehler);
  const produkt = wert(d, 'SELECT (SELECT COUNT(*) FROM Rad) * (SELECT COUNT(*) FROM Reparatur)');
  const kept = wert(d, 'SELECT COUNT(*) FROM Rad, Reparatur WHERE Rad.RadID = Reparatur.RadID');
  assert.equal(erg.korb.anzahl, produkt - kept);
  assert.ok(erg.korb.zeilen.length > 0 && erg.korb.zeilen.length <= 20);
  const kontrolle = alleZeilen(
    d,
    'SELECT Rad.Typ, COUNT(*), SUM(Reparatur.Kosten), COUNT(*) > 10 FROM Rad, Reparatur WHERE Rad.RadID = Reparatur.RadID GROUP BY Rad.Typ ORDER BY Rad.Typ'
  );
  assert.equal(erg.gesamt, kontrolle.length);
  assert.equal(erg.faecher.length, kontrolle.length);
  assert.deepEqual(erg.aggregate, ['COUNT(*)', 'SUM(Reparatur.Kosten)']);
  erg.faecher.forEach((fach, i) => {
    assert.deepEqual(fach.schluessel, [kontrolle[i][0]]);
    assert.equal(fach.anzahl, kontrolle[i][1]);
    assert.deepEqual(fach.aggregate, [kontrolle[i][1], kontrolle[i][2]]);
    assert.equal(fach.havingRaus, kontrolle[i][3] === 0);
    assert.ok(fach.zeilen.length <= Math.min(fach.anzahl, 8));
    assert.equal(fach.farbe, i < 3 ? i + 1 : null);
  });
  assert.equal(erg.umschalter.spalte, 'Reparatur.Kosten');
  erg.faecher.forEach((fach, i) => {
    assert.equal(erg.umschalter.werte[i].count, kontrolle[i][1]);
    assert.equal(erg.umschalter.werte[i].sum, kontrolle[i][2]);
  });
  assert.ok(erg.bereiche.where && erg.bereiche.groupBy && erg.bereiche.having);
  assert.equal(sql.slice(erg.bereiche.having.start, erg.bereiche.having.ende), 'HAVING COUNT(*) > 10');
});

test('Sortierfächer: nur COUNT → Umschalter mit einer Zahlenspalte; ohne GROUP BY ein Fach; ohne Aggregat Hinweis', async () => {
  const d = db('stadtfest');
  const nurCount = await visual.sortierfaecher(
    'SELECT Bon.StandNr, COUNT(*) AS Positionen\nFROM Bon, Position\nWHERE Bon.BonNr = Position.BonNr\nGROUP BY Bon.StandNr',
    adapter(d)
  );
  assert.equal(nurCount.fehler, undefined, nurCount.fehler);
  assert.equal(nurCount.umschalter.spalte, 'Position.Menge');
  const summen = alleZeilen(d, 'SELECT COUNT(*), SUM(Position.Menge) FROM Bon, Position WHERE Bon.BonNr = Position.BonNr GROUP BY Bon.StandNr ORDER BY Bon.StandNr');
  nurCount.umschalter.werte.forEach((w, i) => assert.deepEqual([w.count, w.sum], summen[i]));

  const eins = await visual.sortierfaecher('SELECT COUNT(*) AS Bons\nFROM Bon\nWHERE StandNr = 4', adapter(d));
  assert.equal(eins.fehler, undefined, eins.fehler);
  assert.equal(eins.faecher.length, 1);
  assert.equal(eins.faecher[0].anzahl, wert(d, 'SELECT COUNT(*) FROM Bon WHERE StandNr = 4'));
  assert.equal(eins.korb.anzahl, wert(d, 'SELECT COUNT(*) FROM Bon WHERE StandNr != 4'));

  const ohne = await visual.sortierfaecher('SELECT Name FROM Stand', adapter(d));
  assert.ok(typeof ohne.hinweis === 'string');
  assert.deepEqual(ohne.faecher, []);
});

// ---------------------------------------------------------------------------------------------------------------
// Grenzfälle der Zeitlupe

test('leere Gruppen: WHERE verwirft alles → 0 Gruppen; Aggregat ohne GROUP BY → eine Zeile', async () => {
  const d = db('fundbuero');
  const f = adapter(d);
  const leer = await visual.zeitlupe("SELECT Kategorie, COUNT(*) AS Anzahl\nFROM Fundsache\nWHERE Wert < -1\nGROUP BY Kategorie", f);
  assert.equal(leer.fehler, undefined, leer.fehler);
  assert.equal(schritt(leer, 'WHERE').zaehler.wert, 0);
  assert.equal(schritt(leer, 'GROUP BY').zaehler.wert, 0);
  assert.deepEqual(schritt(leer, 'GROUP BY').gruppen, []);
  assert.equal(schritt(leer, 'SELECT').zaehler.wert, 0);

  const agg = await visual.zeitlupe('SELECT COUNT(*) AS Anzahl, MAX(Wert) AS Hoechstwert\nFROM Fundsache\nWHERE Wert < -1', f);
  const sel = schritt(agg, 'SELECT');
  assert.equal(sel.zaehler.wert, 1);
  assert.equal(sel.zaehler.vorher, 0);
  assert.equal(sel.markierung.aggregate, true);
  assert.deepEqual(sel.zeilen.map((z) => z.werte), [[0, null]]);
  assert.match(sel.text, /eine Gruppe|eine einzige/);
  assert.deepEqual(agg.schritte.map((s) => s.klausel), ['FROM', 'WHERE', 'SELECT']);
});

test('NULL im Gruppenschlüssel bildet eine eigene Gruppe', async () => {
  const d = db('stadtrad');
  const erg = await visual.zeitlupe('SELECT StationID, COUNT(*) AS Raeder\nFROM Rad\nGROUP BY StationID', adapter(d));
  const g = schritt(erg, 'GROUP BY');
  assert.equal(g.zaehler.wert, wert(d, 'SELECT COUNT(*) FROM (SELECT 1 FROM Rad GROUP BY StationID)'));
  const nullGruppe = g.gruppen.find((x) => x.schluessel[0] === null);
  assert.ok(nullGruppe, 'NULL-Gruppe fehlt');
  assert.equal(nullGruppe.name, 'NULL');
  assert.equal(nullGruppe.nr, 1);
  assert.equal(nullGruppe.anzahl, wert(d, 'SELECT COUNT(*) FROM Rad WHERE StationID IS NULL'));
  const i = g.spalten.indexOf('StationID');
  for (const z of g.zeilen.filter((z) => z.gruppe === nullGruppe.nr)) assert.equal(z.werte[i], null);
});

test('Spaltenalias in ORDER BY, GROUP BY über Alias und Nummer, Alias in HAVING', async () => {
  const d = db('fundbuero');
  const f = adapter(d);
  for (const sql of [
    'SELECT Kategorie AS Art, COUNT(*) AS Anzahl\nFROM Fundsache\nGROUP BY Art\nHAVING Anzahl >= 2\nORDER BY Anzahl DESC, Art',
    'SELECT Kategorie, COUNT(*) AS Anzahl\nFROM Fundsache\nGROUP BY 1\nORDER BY 2 DESC, 1'
  ]) {
    const erg = await visual.zeitlupe(sql, f);
    assert.equal(erg.fehler, undefined, erg.fehler);
    const original = alleZeilen(d, sql);
    const letzter = erg.schritte[erg.schritte.length - 1];
    assert.equal(letzter.klausel, 'ORDER BY');
    assert.deepEqual(letzter.zeilen.map((z) => z.werte), original);
    const gruppen = wert(d, 'SELECT COUNT(DISTINCT Kategorie) FROM Fundsache');
    assert.equal(schritt(erg, 'GROUP BY').zaehler.wert, gruppen);
    assert.deepEqual(schritt(erg, 'ORDER BY').markierung.nach.map((n) => n.richtung), ['DESC', 'ASC']);
  }
});

test('LIMIT mit und ohne ORDER BY; OFFSET', async () => {
  const d = db('fundbuero');
  const f = adapter(d);
  const mit = await visual.zeitlupe('SELECT FundNr, Wert\nFROM Fundsache\nORDER BY Wert DESC, FundNr\nLIMIT 3', f);
  const l = schritt(mit, 'LIMIT');
  assert.equal(l.zaehler.wert, 3);
  assert.equal(l.zaehler.vorher, wert(d, 'SELECT COUNT(*) FROM Fundsache'));
  assert.deepEqual(l.zeilen.filter((z) => !z.verworfen).map((z) => z.werte), alleZeilen(d, 'SELECT FundNr, Wert FROM Fundsache ORDER BY Wert DESC, FundNr LIMIT 3'));
  assert.ok(l.zeilen.slice(3).every((z) => z.verworfen));
  assert.equal(l.markierung.limit, 3);

  const ohne = await visual.zeitlupe('SELECT FundNr\nFROM Fundsache\nLIMIT 2', f);
  assert.deepEqual(ohne.schritte.map((s) => s.klausel), ['FROM', 'SELECT', 'LIMIT']);
  const lo = schritt(ohne, 'LIMIT');
  assert.equal(lo.zaehler.wert, 2);
  assert.match(lo.text, /ORDER BY/);

  const off = await visual.zeitlupe('SELECT FundNr\nFROM Fundsache\nORDER BY FundNr\nLIMIT 2 OFFSET 3', f);
  const lf = schritt(off, 'LIMIT');
  assert.deepEqual(lf.zeilen.filter((z) => !z.verworfen).map((z) => z.werte), alleZeilen(d, 'SELECT FundNr FROM Fundsache ORDER BY FundNr LIMIT 2 OFFSET 3'));
  assert.deepEqual(lf.zeilen.slice(0, 3).map((z) => z.verworfen), [true, true, true]);
  assert.equal(lf.markierung.offset, 3);
});

test('DISTINCT als Teil von SELECT: doppelte Zeilen werden gestrichen', async () => {
  const d = db('fundbuero');
  const erg = await visual.zeitlupe('SELECT DISTINCT Kategorie\nFROM Fundsache', adapter(d));
  const sel = schritt(erg, 'SELECT');
  const n = wert(d, 'SELECT COUNT(DISTINCT Kategorie) FROM Fundsache');
  assert.equal(sel.zaehler.wert, n);
  assert.equal(sel.zaehler.vorher, wert(d, 'SELECT COUNT(*) FROM Fundsache'));
  assert.equal(sel.markierung.distinct, true);
  const behalten = sel.zeilen.filter((z) => !z.verworfen).map((z) => schluessel(z.werte));
  assert.equal(new Set(behalten).size, behalten.length, 'behaltene Zeilen sind verschieden');
  assert.ok(sel.zeilen.some((z) => z.verworfen));
  assert.match(sel.text, /DISTINCT/);
});

test('Kreuzprodukt über 100 000 Zeilen: exakter Zähler, Stichprobe und Hinweis', async () => {
  const d = db('stadtrad');
  const f = adapter(d);
  const erg = await visual.zeitlupe('SELECT Kunde.Nachname, Station.Name\nFROM Ausleihe, Kunde, Station\nWHERE Ausleihe.KundenID = Kunde.KundenID\n  AND Ausleihe.StartStation = Station.StationID', f);
  assert.equal(erg.fehler, undefined, erg.fehler);
  const from = schritt(erg, 'FROM');
  const n = wert(d, 'SELECT (SELECT COUNT(*) FROM Ausleihe) * (SELECT COUNT(*) FROM Kunde) * (SELECT COUNT(*) FROM Station)');
  assert.ok(n > 100000);
  assert.equal(from.zaehler.wert, n);
  assert.equal(from.zeilen.length, 50);
  assert.match(from.hinweis, /Stichprobe/);
  assert.match(from.zaehler.rechnung, /^\d+ × \d+ × \d+$/);
  assert.equal(from.markierung.tabellen.length, 3);
  assert.deepEqual(from.markierung.tabellen[0].spalten, [0, from.markierung.tabellen[1].spalten[0]]);
  // Qualifizierte Spaltennamen bei mehreren Tabellen, relevante Spalten markiert
  assert.ok(from.spalten.includes('Kunde.Nachname'));
  assert.equal(from.relevant[from.spalten.indexOf('Kunde.Nachname')], true);
  assert.equal(from.relevant[from.spalten.indexOf('Kunde.Tarif')], false);
});

test('Abfragen außerhalb des Abitur-Umfangs, Parse- und Datenbankfehler', async () => {
  const f = adapter(db('stadtrad'));
  for (const sql of [
    'SELECT * FROM Rad JOIN Station ON Rad.StationID = Station.StationID',
    'SELECT * FROM Rad WHERE StationID IN (SELECT StationID FROM Station)',
    'SELECT RadID FROM Rad UNION SELECT StationID FROM Station',
    'DELETE FROM Rad'
  ]) {
    const erg = await visual.zeitlupe(sql, f);
    assert.equal(erg.fehler, undefined, sql);
    assert.equal(erg.hinweis, 'Die Zeitlupe zeigt nur Abfragen im Abitur-Umfang.');
    assert.deepEqual(erg.schritte, []);
  }
  const parse = await visual.zeitlupe('SELECT FROM Rad', f);
  assert.ok(typeof parse.fehler === 'string' && parse.fehler.length > 0);
  const spalte = await visual.zeitlupe('SELECT Farbe FROM Rad', f);
  assert.match(spalte.fehler, /Farbe/);
  assert.doesNotMatch(spalte.fehler, /no such column/);
  // Übersetzung injizierbar
  const eigen = await visual.zeitlupe('SELECT Farbe FROM Rad', f, { uebersetze: () => 'Eigener Text' });
  assert.equal(eigen.fehler, 'Eigener Text');
  // Ausführung, die wirft statt { fehler } zu liefern
  const wirft = await visual.zeitlupe('SELECT RadID FROM Rad', async () => {
    throw new Error('no such table: Rad');
  });
  assert.match(wirft.fehler, /Rad/);
  // Zeitlimit des Workers: Text unverändert durchreichen
  const zeit = await visual.zeitlupe('SELECT RadID FROM Rad', async () => ({ fehler: 'Abgebrochen: zu lange.', abgebrochen: true }));
  assert.equal(zeit.fehler, 'Abgebrochen: zu lange.');
});

test('ohne FROM: nur der SELECT-Schritt', async () => {
  const erg = await visual.zeitlupe('SELECT 1 + 2 AS Summe', adapter(db('eisdiele')));
  assert.equal(erg.fehler, undefined, erg.fehler);
  assert.deepEqual(erg.schritte.map((s) => s.klausel), ['SELECT']);
  assert.deepEqual(erg.schritte[0].zeilen[0].werte, [3]);
});

// ---------------------------------------------------------------------------------------------------------------
// Isomorph und Auslieferung

test('visual.js läuft im Browser ohne module (mit DD_SQL_PARSER) und hängt sich an self', async () => {
  const self = {};
  vm.runInNewContext(fs.readFileSync(path.join(SQL_DIR, 'parser.js'), 'utf8'), { self });
  vm.runInNewContext(fs.readFileSync(path.join(SQL_DIR, 'fehlertexte.js'), 'utf8'), { self });
  vm.runInNewContext(fs.readFileSync(path.join(SQL_DIR, 'visual.js'), 'utf8'), { self });
  const v = self.DD_SQL_VISUAL;
  assert.equal(typeof v.zeitlupe, 'function');
  assert.equal(typeof v.spurenbrett, 'function');
  assert.equal(typeof v.sortierfaecher, 'function');
  assert.equal(typeof v.vorschlag, 'function');
  const erg = await v.zeitlupe('SELECT Name FROM Sorte WHERE Preis > 1', adapter(db('eisdiele')));
  assert.equal(erg.fehler, undefined, erg.fehler);
  assert.equal(erg.schritte.length, 3);
  const fehler = await v.zeitlupe('SELECT Farbe FROM Sorte', adapter(db('eisdiele')));
  assert.match(fehler.fehler, /Farbe/);
});

test('GET /static/js/sql/visual.js liefert dieselben Bytes wie src/sql/visual.js', async () => {
  const { app } = testApp();
  const res = await request(app).get('/static/js/sql/visual.js').buffer(true).parse((r, cb) => {
    const teile = [];
    r.on('data', (x) => teile.push(x));
    r.on('end', () => cb(null, Buffer.concat(teile)));
  });
  assert.equal(res.status, 200);
  assert.match(res.headers['content-type'], /^application\/javascript/);
  assert.ok(Buffer.compare(res.body, fs.readFileSync(path.join(SQL_DIR, 'visual.js'))) === 0);
});
