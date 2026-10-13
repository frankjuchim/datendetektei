'use strict';
// Prüfer und Diagnose (Spec §7.4, §5; Plan Phase 2 Task 10, Review Focus 3).
// Fälle: test/fixtures/sql_aufgaben.json (Musterlösungen, richtige Schreibweisen, typische Fehlabfragen).

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

const { ladeAlle } = require('../scripts/db_bauen');
const { erzeugeSandbox } = require('../src/sql/sandbox');
const { schemaAus } = require('../src/sql/schema');
const { erzeugePruefer } = require('../src/sql/pruefer');
const diagnose = require('../src/sql/diagnose');

const FIXTURE = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'sql_aufgaben.json'), 'utf8'));
const DBS = ['fundbuero', 'stadtrad', 'stadtfest', 'tus', 'detektei', 'datenspuren'];

let sandbox;
let pruefer;
let schemata;

before(() => {
  const datenbanken = ladeAlle(undefined, { namen: DBS });
  schemata = {};
  for (const name of DBS) schemata[name] = schemaAus(datenbanken[name].haupt);
  sandbox = erzeugeSandbox({ prozesse: 2, datenbanken });
  pruefer = erzeugePruefer({ sandbox, schemata });
});

after(() => {
  if (sandbox) sandbox.beende();
});

/** Alle Zellwerte (als Text) eines Ergebnisses. */
function zellwerte(ergebnis) {
  const werte = new Set();
  for (const zeile of ergebnis.zeilen) for (const w of zeile) if (w !== null) werte.add(String(w));
  return werte;
}

// ---------------------------------------------------------------------------------------------------- schema.js

test('schemaAus: Tabellen, Spalten mit Typ/PK/FK und Zeilenzahl aus der Haupt-DB', () => {
  const s = schemata.stadtrad;
  const ausleihe = s.find((t) => t.tabelle === 'Ausleihe');
  assert.equal(ausleihe.zeilen, 469);
  const id = ausleihe.spalten.find((x) => x.name === 'AusleihID');
  assert.deepEqual(id, { name: 'AusleihID', typ: 'INTEGER', pk: true, fk: null });
  const ziel = ausleihe.spalten.find((x) => x.name === 'ZielStation');
  assert.deepEqual(ziel.fk, { tabelle: 'Station', spalte: 'StationID' });
  assert.equal(s.find((t) => t.tabelle === 'Station').zeilen, 13);
  assert.ok(!s.some((t) => t.tabelle.startsWith('sqlite_')));
  // Verbundtabelle mit zusammengesetztem Schlüssel
  const schicht = schemata.stadtfest.find((t) => t.tabelle === 'Schicht');
  assert.deepEqual(schicht.spalten.filter((x) => x.pk).map((x) => x.name), ['HelferNr', 'StandNr', 'Beginn']);
});

// ---------------------------------------------------------------------------------------------------- diagnose.js

test('Zellvergleich: Zahlen auf 1e-6, 5 == 5.0, Text getrimmt, NULL eigener Wert, Text ≠ Zahl', () => {
  const k = diagnose.zellSchluessel;
  assert.equal(k(5), k(5.0));
  assert.equal(k(0.1 + 0.2), k(0.3));
  assert.equal(k(1.0000004), k(1));
  assert.notEqual(k(1.00001), k(1));
  assert.equal(k(' Kaffee '), k('Kaffee'));
  assert.notEqual(k(null), k('NULL'));
  assert.notEqual(k(null), k(''));
  assert.notEqual(k(null), k(0));
  assert.notEqual(k('5'), k(5));
  assert.equal(k(-0), k(0));
});

test('Spaltennamen normalisiert: Groß/Klein, Leerzeichen, Umlaute', () => {
  const n = diagnose.normalisiereSpaltenname;
  assert.equal(n('Durchschnitts Wert'), n('durchschnittswert'));
  assert.equal(n('Fälle'), n('Faelle'));
  assert.equal(n('Größe'), n('groesse'));
  assert.equal(n('Übung'), n('UEBUNG'));
  assert.notEqual(n('Anzahl'), n('Anzahl2'));
});

test('vergleiche: Multimenge, Spaltenanzahl, Reihenfolge nur mit Sortierung (Gleichstände beliebig)', () => {
  const muster = { spalten: ['a', 'b'], zeilen: [[1, 'x'], [1, 'y'], [2, 'z']], anzahl: 3, abgeschnitten: false };
  const v = (zeilen, opt = {}) =>
    diagnose.vergleiche({ spalten: ['a', 'b'], zeilen, anzahl: zeilen.length, abgeschnitten: false }, muster, opt);
  assert.equal(v([[2, 'z'], [1, 'y'], [1, 'x']]).gleich, true, 'ohne Sortierung egal');
  assert.equal(v([[1, 'x'], [1, 'x'], [2, 'z']]).gleich, false, 'Multimenge, nicht Menge');
  const sort = { sortierung: [{ spalte: 'a', richtung: 'ASC' }] };
  assert.equal(v([[1, 'y'], [1, 'x'], [2, 'z']], sort).gleich, true, 'Gleichstand in a beliebig');
  const falsch = v([[2, 'z'], [1, 'x'], [1, 'y']], sort);
  assert.equal(falsch.gleich, false);
  assert.equal(falsch.nurReihenfolge, true);
  const breit = diagnose.vergleiche({ spalten: ['a'], zeilen: [[1], [1], [2]], anzahl: 3 }, muster, {});
  assert.equal(breit.spaltenanzahl, false);
});

// ---------------------------------------------------------------------------------------------------- Fixture

test('Fixture: mindestens 25 Aufgaben über sechs Datenbanken, mit richtigen und falschen Versuchen', () => {
  const aufgaben = FIXTURE.aufgaben;
  assert.ok(aufgaben.length >= 25, `nur ${aufgaben.length} Aufgaben`);
  assert.deepEqual([...new Set(aufgaben.map((a) => a.aufgabe.datenbank))].sort(), [...DBS].sort());
  const versuche = aufgaben.flatMap((a) => a.versuche);
  assert.ok(versuche.some((v) => v.ok) && versuche.some((v) => !v.ok));
  // die vier LIESMICH-Fehlabfragen ohne Parser-Diagnose (Review Focus 3)
  const liesmich = versuche.filter((v) => v.liesmich).map((v) => v.liesmich).sort();
  assert.deepEqual(liesmich, ['detektei:149', 'fundbuero:103', 'stadtfest:122', 'stadtrad:149']);
  // jede Diagnose des Prüfers hat einen eigenen Fall
  const codes = new Set(versuche.flatMap((v) => v.codes || []));
  for (const c of ['ZU_VIELE_ZEILEN', 'ZU_WENIGE_ZEILEN', 'KREUZPRODUKT', 'NULL_ZEILEN_FEHLEN', 'NUR_REIHENFOLGE',
    'SPALTENANZAHL', 'SPALTENNAME', 'SPALTENREIHENFOLGE', 'ANDERE_WERTE', 'NUR_ZUFAELLIG']) {
    assert.ok(codes.has(c), `kein Fall für ${c}`);
  }
});

test('Musterlösungen laufen auf Haupt-DB und allen Varianten ohne Regelverstoß', async () => {
  for (const { aufgabe } of FIXTURE.aufgaben) {
    const r = await pruefer.pruefeSql({ sql: aufgabe.loesung.sql, aufgabe });
    assert.equal(r.ok, true, `${aufgabe.id}: ${JSON.stringify(r.diagnose)}`);
    assert.deepEqual(r.diagnose.filter((d) => d.art === 'fehler'), [], aufgabe.id);
    const m = await pruefer.musterErgebnisse(aufgabe);
    assert.deepEqual(Object.keys(m.varianten).sort(), [...aufgabe.varianten].sort(), aufgabe.id);
  }
});

for (const { aufgabe, versuche } of FIXTURE.aufgaben) {
  versuche.forEach((versuch, i) => {
    test(`${aufgabe.id} #${i + 1}: ${versuch.beschreibung}`, async () => {
      const r = await pruefer.pruefeSql({ sql: versuch.sql, aufgabe });
      const codes = r.diagnose.map((d) => d.code);
      assert.equal(r.ok, versuch.ok, `ok erwartet ${versuch.ok}, Diagnosen: ${JSON.stringify(r.diagnose)}`);
      for (const c of versuch.codes || []) assert.ok(codes.includes(c), `${c} fehlt in ${codes.join(', ')}`);
      for (const c of versuch.ohneCodes || []) assert.ok(!codes.includes(c), `${c} unerwartet`);
      for (const d of r.diagnose) {
        assert.equal(typeof d.code, 'string');
        assert.ok(d.falle === null || /^P\d+$/.test(d.falle), d.code);
        assert.ok(['fehler', 'hinweis', 'technisch'].includes(d.art), d.code);
        assert.ok(typeof d.text === 'string' && d.text.length > 0, d.code);
      }
      if (versuch.ok) assert.ok(!r.diagnose.some((d) => d.art === 'fehler'));
      else assert.ok(r.diagnose.some((d) => d.art === 'fehler'), 'nicht ok ohne Fehler-Diagnose');
      if (versuch.ohneErgebnis) assert.equal(r.zeilen, null);
      else assert.equal(typeof r.zeilen, 'number');
    });
  });
}

test('zeilen = Anzahl des Schülerergebnisses auf der Haupt-DB', async () => {
  const aufgabe = FIXTURE.aufgaben.find((a) => a.aufgabe.id === 'fb-kompass').aufgabe;
  const r = await pruefer.pruefeSql({ sql: "SELECT FundNr, Bezeichnung FROM Fundsache WHERE Bezeichnung LIKE 'Kompass%'", aufgabe });
  const direkt = await sandbox.fuehreAus({ db: 'fundbuero', sql: "SELECT FundNr FROM Fundsache WHERE Bezeichnung LIKE 'Kompass%'" });
  assert.equal(r.zeilen, direkt.anzahl);
  const voll = await pruefer.pruefeSql({ sql: 'SELECT FundNr, Bezeichnung FROM Fundsache', aufgabe });
  assert.equal(voll.zeilen, 80);
});

test('Review Focus 3: „passt nur zufällig“ nennt nur den Variantentyp allgemein, nie die Variante selbst', async () => {
  const aufgabe = FIXTURE.aufgaben.find((a) => a.aufgabe.id === 'det-alle-vier').aufgabe;
  const sql = FIXTURE.aufgaben.find((a) => a.aufgabe.id === 'det-alle-vier').versuche[1].sql;
  const r = await pruefer.pruefeSql({ sql, aufgabe });
  const d = r.diagnose.find((x) => x.code === 'NUR_ZUFAELLIG');
  assert.ok(d);
  assert.match(d.text, /zufällig/);
  assert.match(d.text, /Gleichnamig/i);
  assert.equal(d.falle, 'P3');
  assert.doesNotMatch(JSON.stringify(r), /gleichnamig"|variante|9011/i);
});

test('Antwort enthält keine Lösungsdaten (alle Musterzellen, die nicht auch im Schülerergebnis stehen)', async () => {
  let geprueft = 0;
  for (const { aufgabe, versuche } of FIXTURE.aufgaben) {
    const muster = await pruefer.musterErgebnisse(aufgabe);
    const musterErgebnisse = [muster.haupt, ...Object.values(muster.varianten)];
    for (const versuch of versuche) {
      const antwort = await pruefer.pruefeSql({ sql: versuch.sql, aufgabe });
      const json = JSON.stringify(antwort);
      // eigene Werte der Schülerin/des Schülers dürfen vorkommen
      const eigene = new Set();
      for (const v of [null, ...aufgabe.varianten]) {
        const e = await sandbox.fuehreAus({ db: aufgabe.datenbank, variante: v, sql: versuch.sql });
        if (e.ok) for (const w of zellwerte(e)) eigene.add(w);
      }
      for (const m of musterErgebnisse) {
        for (const w of zellwerte(m)) {
          if (w.length < 3 || eigene.has(w) || versuch.sql.includes(w) || w === String(antwort.zeilen)) continue;
          assert.ok(!json.includes(w), `${aufgabe.id}: Musterwert „${w}“ in der Antwort: ${json}`);
          geprueft++;
        }
      }
      // keine Musterspaltennamen (außer bei aliasPflicht, die die Aufgabe nennt)
      if (!aufgabe.aliasPflicht) {
        for (const s of muster.haupt.spalten) {
          if (s.length >= 4 && !versuch.sql.includes(s)) assert.ok(!json.includes(s), `${aufgabe.id}: Spaltenname ${s}`);
        }
      }
    }
  }
  assert.ok(geprueft > 500, `zu wenige Werte geprüft: ${geprueft}`);
});

test('Musterergebnis je Variante wird einmal berechnet und gecacht (nach id + Fingerabdruck des Muster-SQL)', async () => {
  let aufrufe = 0;
  const zaehlend = {
    fuehreAus(auftrag) {
      aufrufe++;
      return sandbox.fuehreAus(auftrag);
    }
  };
  const p = erzeugePruefer({ sandbox: zaehlend, schemata });
  const aufgabe = FIXTURE.aufgaben.find((a) => a.aufgabe.id === 'fb-offen-hafen').aufgabe;
  const n = 1 + aufgabe.varianten.length;
  await p.pruefeSql({ sql: aufgabe.loesung.sql, aufgabe });
  assert.equal(aufrufe, 2 * n);
  await Promise.all([p.pruefeSql({ sql: aufgabe.loesung.sql, aufgabe }), p.pruefeSql({ sql: aufgabe.loesung.sql, aufgabe })]);
  assert.equal(aufrufe, 4 * n, 'Muster nicht erneut ausgeführt');
  // geänderte Musterlösung → neuer Fingerabdruck
  const geaendert = { ...aufgabe, loesung: { sql: aufgabe.loesung.sql + '\n' } };
  await p.pruefeSql({ sql: aufgabe.loesung.sql, aufgabe: geaendert });
  assert.equal(aufrufe, 6 * n);
});

test('Fehlerhafte Musterlösung oder unbekannte Variante → Fehler (Inhaltsfehler, kein Schülerfehler)', async () => {
  const basis = { id: 'kaputt', datenbank: 'fundbuero', abimodus: 'hinweis', varianten: [] };
  await assert.rejects(pruefer.musterErgebnisse({ ...basis, loesung: { sql: 'SELECT Gibtsnicht FROM Fundsache' } }), /Musterlösung/);
  await assert.rejects(
    pruefer.pruefeSql({ sql: 'SELECT 1', aufgabe: { ...basis, id: 'kaputt2', varianten: ['erfunden'], loesung: { sql: 'SELECT FundNr FROM Fundsache' } } }),
    /Musterlösung/
  );
});

test('Sandbox-Codes werden auf deutsche Texte abgebildet (zeitlimit, ueberlastet, absturz)', async () => {
  const aufgabe = { id: 'technik', datenbank: 'fundbuero', abimodus: 'aus', varianten: [], loesung: { sql: 'SELECT FundNr FROM Fundsache' } };
  for (const [code, erwartet, art] of [
    ['zeitlimit', 'ZEITLIMIT', 'fehler'],
    ['ueberlastet', 'UEBERLASTET', 'technisch'],
    ['absturz', 'ABSTURZ', 'technisch'],
    ['beendet', 'BEENDET', 'technisch']
  ]) {
    const falsch = {
      fuehreAus(auftrag) {
        if (auftrag.sql === aufgabe.loesung.sql) return sandbox.fuehreAus(auftrag);
        return Promise.resolve({ ok: false, code, text: 'roh', ms: 1500 });
      }
    };
    const r = await erzeugePruefer({ sandbox: falsch, schemata }).pruefeSql({ sql: 'SELECT FundNr FROM Fundsache f', aufgabe });
    assert.equal(r.ok, false);
    const d = r.diagnose.find((x) => x.code === erwartet);
    assert.ok(d, `${code} → ${JSON.stringify(r.diagnose)}`);
    assert.equal(d.art, art);
    assert.doesNotMatch(d.text, /roh/);
  }
});

test('Endlosabfrage: Zeitlimit als Diagnose, danach prüft der Prüfer weiter', async () => {
  const aufgabe = FIXTURE.aufgaben.find((a) => a.aufgabe.id === 'fb-kompass').aufgabe;
  const r = await pruefer.pruefeSql({
    sql: 'WITH RECURSIVE z(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM z) SELECT COUNT(*) FROM z',
    aufgabe: { ...aufgabe, abimodus: 'aus' }
  });
  assert.equal(r.ok, false);
  assert.ok(r.diagnose.some((d) => d.code === 'ZEITLIMIT'), JSON.stringify(r.diagnose));
  const danach = await pruefer.pruefeSql({ sql: aufgabe.loesung.sql, aufgabe });
  assert.equal(danach.ok, true);
});
