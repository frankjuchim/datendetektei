'use strict';
// Prüfungs-Kontexte der Klausur (Schulsanitätsdienst) und der Nachschreibklausur (Kostümverleih der Theater-AG):
// kuratierte DBs unter seed/datenbanken/pruefung/<kontext>/ (VERHOER_KONTEXTE.md, Plan Phase 7 Task 8). Gebaut und
// geprüft wie die Verhör-DBs, aber zur Laufzeit NICHT geladen und nie öffentlich (nur Material-Prüfung).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const request = require('supertest');

const bau = require('../scripts/db_bauen');
const D = require('../src/sql/datenbanken');
const { parse } = require('../src/sql/parser');
const { pruefeRegeln } = require('../src/sql/regeln');
const { ladeSchema } = require('./hilfen_schema');
const { erzeugeApp } = require('../src/app');
const { oeffneDb } = require('../src/db');
const { testKonfig } = require('./helpers');
const namenJson = require('../seed/datenbanken/namen.json');

const SEED = path.join(__dirname, '..', 'seed', 'datenbanken');
const KONTEXTE = ['pruefung/sanitaetsdienst', 'pruefung/kostuemverleih'];
/** Spalten mit vollem Namen „Vorname Nachname“ (bei Rohlisten ggf. als Kommaliste). */
const NAMENSSPALTEN = {
  'pruefung/sanitaetsdienst': ['EinsatzListe.Name', 'AusbildungRoh.Name', 'AusbildungRoh.Referent'],
  'pruefung/kostuemverleih': ['KostuemlisteRoh.Verantwortliche']
};

const spalte = (db, sql) => db.prepare(sql).pluck().all();

test('Prüfungs-DBs: registriert, kuratiert, eigene Module, nicht zur Laufzeit geladen, nicht öffentlich', () => {
  assert.deepEqual(D.PRUEFUNG_DATENBANKEN, KONTEXTE);
  assert.ok(Object.isFrozen(D.PRUEFUNG_DATENBANKEN));
  assert.deepEqual(bau.PRUEFUNG_DBS, KONTEXTE);
  assert.deepEqual(bau.ALLE_DBS, [...bau.REIHENFOLGE, ...bau.VERHOER_DBS, ...KONTEXTE]);
  for (const name of KONTEXTE) {
    assert.ok(bau.KURATIERT.includes(name), name);
    assert.ok(!D.ALLE_DATENBANKEN.includes(name), `${name} wird zur Laufzeit nicht geladen`);
    assert.ok(!D.OEFFENTLICHE_DATENBANKEN.includes(name), `${name} ist nie öffentlich`);
    const modul = bau.ladeModul(name);
    assert.ok(modul && typeof modul.abnahme === 'function', name);
    assert.equal(modul.generiere, undefined, `${name}: kuratiert, kein Generator`);
  }
});

for (const name of KONTEXTE) {
  test(`${name}: Bau ohne Generator, Abnahme-Prüfungen und Beispielabfragen grün`, () => {
    const { db, bericht } = bau.baueDb(name);
    assert.equal(bericht.status, 'fertig', bericht.meldungen.join('; '));
    assert.deepEqual(bericht.schritte, ['schema', 'pflicht', 'kuratiert', 'abnahme']);
    assert.ok(bericht.abnahme.length >= 12, `${bericht.abnahme.length} Abnahme-Prüfungen`);
    for (const p of bericht.abnahme) assert.ok(p.ok, `${p.name}: ist ${JSON.stringify(p.ist)}, soll ${JSON.stringify(p.soll)}`);
    const liesmich = fs.readFileSync(path.join(SEED, name, 'LIESMICH.md'), 'utf8');
    const anzahl = bau.extrahiereSqlBloecke(liesmich).filter((b) => !b.fehlabfrage).length;
    assert.ok(anzahl >= 8, `${anzahl} Beispielabfragen`);
    assert.equal(bericht.beispiele.filter((b) => !b.fehlabfrage && b.ok).length, anzahl);
    db.close();
  });

  test(`${name}: basis.sql byteidentisch reproduzierbar, keine Varianten`, () => {
    const { db } = bau.baueDb(name);
    const eingecheckt = fs.readFileSync(path.join(SEED, name, 'basis.sql'), 'utf8');
    assert.equal(bau.basisText(name, db), eingecheckt);
    assert.match(eingecheckt, /kuratiert, kein Generator/);
    assert.ok(D.pruefeBasisText(eingecheckt).ok);
    assert.deepEqual(bau.varianten(name), []);
    db.close();
  });

  test(`${name}: Beispielabfragen der LIESMICH im Abimodus streng ohne Fehler, Fehlabfragen erkannt`, () => {
    const schema = ladeSchema(name);
    const liesmich = fs.readFileSync(path.join(SEED, name, 'LIESMICH.md'), 'utf8');
    for (const b of bau.extrahiereSqlBloecke(liesmich)) {
      const { ast, fehler } = parse(b.sql);
      assert.deepEqual(fehler, [], `Parserfehler (Zeile ${b.zeile}): ${b.sql}`);
      const d = pruefeRegeln(ast, { abimodus: 'streng', schema });
      if (b.fehlabfrage) {
        const falle = (/\((P\d+)\)/.exec(b.sql.split('\n')[0]) || [])[1];
        assert.ok(d.length >= 1, `Fehlabfrage ohne Diagnose (Zeile ${b.zeile})`);
        if (falle) assert.ok(d.some((x) => x.falle === falle), `Falle ${falle} nicht erkannt (Zeile ${b.zeile})`);
      } else {
        assert.deepEqual(d.filter((x) => x.art === 'fehler'), [], `Zeile ${b.zeile}: ${b.sql}`);
      }
    }
  });

  test(`${name}: Namen frei erfunden (namen.json), keine reservierten Nachnamen`, () => {
    const db = bau.ladeHaupt(name);
    const vor = new Set(namenJson.vornamen);
    const nach = new Set(namenJson.nachnamen);
    let geprueft = 0;
    for (const t of spalte(db, "SELECT name FROM sqlite_master WHERE type = 'table'")) {
      const spalten = db.prepare(`PRAGMA table_info("${t}")`).all().map((s) => s.name);
      for (const s of spalten.filter((x) => ['Vorname', 'Nachname'].includes(x))) {
        for (const w of spalte(db, `SELECT DISTINCT "${s}" FROM "${t}" WHERE "${s}" IS NOT NULL`)) {
          geprueft++;
          assert.ok((s === 'Vorname' ? vor : nach).has(w), `${t}.${s} = ${w} nicht in namen.json`);
          assert.ok(!namenJson.reservierteNachnamen.includes(w), `${t}.${s} = ${w} ist reserviert`);
        }
      }
    }
    for (const angabe of NAMENSSPALTEN[name]) {
      const [t, s] = angabe.split('.');
      for (const liste of spalte(db, `SELECT DISTINCT "${s}" FROM "${t}" WHERE "${s}" IS NOT NULL`)) {
        for (const voll of liste.split(', ')) {
          const teile = voll.split(' ');
          geprueft++;
          assert.equal(teile.length, 2, `${angabe} = ${voll}`);
          assert.ok(vor.has(teile[0]), `${angabe}: Vorname ${teile[0]} nicht in namen.json`);
          assert.ok(nach.has(teile[1]), `${angabe}: Nachname ${teile[1]} nicht in namen.json`);
          assert.ok(!namenJson.reservierteNachnamen.includes(teile[1]), `${angabe} = ${voll} ist reserviert`);
        }
      }
    }
    assert.ok(geprueft > 20);
    db.close();
  });
}

test('lauf --db pruefung/kostuemverleih --pruefen: identisch', () => {
  const zeilen = [];
  assert.equal(bau.lauf({ nur: 'pruefung/kostuemverleih', pruefen: true, log: (t) => zeilen.push(t) }), 0, zeilen.join('\n'));
  assert.match(zeilen.join('\n'), /pruefung\/kostuemverleih: identisch/);
});

test('sql_pruefen_cli: Datenbank „pruefung/<kontext>“ und Kurzname werden gefunden', () => {
  const eintraege = [
    { id: 'a', datenbank: 'pruefung/sanitaetsdienst', sql: 'SELECT SanNr FROM Sanitaeter WHERE BetreuerNr IS NULL',
      erwartet: { kopf: ['SanNr'], zeilen: [['1'], ['2']] } },
    { id: 'b', datenbank: 'Kostümverleih', sql: 'SELECT COUNT(*) AS Anzahl FROM Ausleihe WHERE Bis IS NULL',
      erwartet: { kopf: ['Anzahl'], zeilen: [['6']] } }
  ];
  const r = spawnSync(process.execPath, [path.join(__dirname, '..', 'scripts', 'sql_pruefen_cli.js')],
    { input: JSON.stringify(eintraege), encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const aus = JSON.parse(r.stdout);
  assert.deepEqual(aus.map((x) => x.ok), [true, true], r.stdout);
});

test('Prüfungs-DBs nie unter /db/ oder /api/db/ (auch nicht mit allen DBs geladen)', async () => {
  const datenbanken = D.ladeDatenbanken(SEED, { log: () => {} });
  assert.deepEqual(datenbanken.namen.filter((n) => n.startsWith('pruefung/')), []);
  const a = erzeugeApp(testKonfig(), oeffneDb(':memory:'), { datenbanken });
  for (const kontext of ['sanitaetsdienst', 'kostuemverleih']) {
    for (const pfad of [`/db/${kontext}.sqlite`, `/db/pruefung/${kontext}.sqlite`, `/db/pruefung%2F${kontext}.sqlite`,
      `/db/pruefung_${kontext}.sqlite`, `/api/db/${kontext}/schema`, `/api/db/pruefung%2F${kontext}/schema`,
      `/api/db/pruefung/${kontext}/schema`]) {
      const res = await request(a).get(pfad);
      assert.equal(res.status, 404, pfad);
      assert.doesNotMatch(res.headers['content-type'] || '', /sqlite/, pfad);
    }
  }
});
