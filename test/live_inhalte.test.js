'use strict';
// Live-Modus, Inhalte (Plan Phase 6 Task 6): Code-Regeln der Escape-Room-Stationen, Laden von seed/live und der
// Validator für Pool und Escape Room (Format, Lösungen, Codes ableitbar und eindeutig, Transfer statt Kopie).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeDatenbanken } = require('../src/sql/datenbanken');
const { erzeugeSandbox } = require('../src/sql/sandbox');
const { erzeugePruefer } = require('../src/sql/pruefer');
const L = require('../src/content/live');

const SEED = path.join(__dirname, '..', 'seed');
const lies = (n) => fs.readFileSync(path.join(SEED, 'live', n), 'utf8');
const json = (n) => JSON.parse(lies(n));
const akten = () => fs.readdirSync(path.join(SEED, 'akten')).map((n) => ({ name: n, json: fs.readFileSync(path.join(SEED, 'akten', n), 'utf8') }));

let datenbanken;
let sandbox;
let umgebung;
test.before(() => {
  datenbanken = ladeDatenbanken(undefined, { log: () => {} });
  const roh = {};
  const schemata = {};
  for (const n of datenbanken.namen) {
    roh[n] = { haupt: datenbanken.haupt(n), varianten: datenbanken.varianten(n) };
    schemata[n] = datenbanken.schema(n);
  }
  sandbox = erzeugeSandbox({ prozesse: 2, datenbanken: roh });
  umgebung = { datenbanken, sandbox, sqlPruefer: erzeugePruefer({ sandbox, schemata }) };
});
test.after(() => sandbox && sandbox.beende());

/* ---------- Code-Regeln ---------- */

const sqlStation = (teile, zeilen) => ({
  code: { teile },
  aufgabe: { interaktion: { kind: 'sql', datenbank: 'x' }, loesung: { sql: 'SELECT 1' } },
  _zeilen: zeilen
});
const fuehreAusMit = (zeilen) => () => ({ ok: true, spalten: ['a', 'b'], zeilen });

test('Code: anzahlZeilen mit führenden Nullen, zelle, zusammengesetzt', () => {
  const z = [[4, 'Kaffeemobil'], [7, 'Losbude'], [5, 'Bierwagen']];
  assert.equal(L.berechneCode(sqlStation([{ quelle: 'anzahlZeilen', stellen: 3 }]), fuehreAusMit(z)), '003');
  assert.equal(L.berechneCode(sqlStation([{ quelle: 'zelle', zeile: 1, spalte: 1, stellen: 4 }]), fuehreAusMit(z)), '0004');
  assert.equal(L.berechneCode(sqlStation([{ quelle: 'anzahlZeilen' }, { quelle: 'zelle', zeile: 2, spalte: 1 }, { quelle: 'zelle', zeile: 1, spalte: 1 }]), fuehreAusMit(z)), '374');
});

test('Code: Fehler bei zu vielen Stellen, Text-Zellen, fehlender Interaktion und zu kurzem Code', () => {
  const z = Array.from({ length: 12 }, (_, i) => [i, 'x']);
  assert.throws(() => L.berechneCode(sqlStation([{ quelle: 'anzahlZeilen', stellen: 1 }]), fuehreAusMit(z)), L.CodeFehler);
  assert.throws(() => L.berechneCode(sqlStation([{ quelle: 'zelle', zeile: 1, spalte: 2 }, { quelle: 'anzahlZeilen' }]), fuehreAusMit(z)), /keine ganze Zahl/);
  assert.throws(() => L.berechneCode(sqlStation([{ quelle: 'zuordnung' }]), fuehreAusMit(z)), /match/);
  assert.throws(() => L.berechneCode(sqlStation([{ quelle: 'anzahlZeilen' }]), fuehreAusMit([[1]])), /Ziffern/);
  // Sicherheitsprüfung F4: mindestens drei Ziffern (zwei Ziffern sind trotz Code-Bremse in ≈ 20 min erratbar)
  assert.throws(() => L.berechneCode(sqlStation([{ quelle: 'anzahlZeilen' }, { quelle: 'zelle', zeile: 2, spalte: 1 }]), fuehreAusMit([[4, 'a'], [7, 'b']])), /3–8 Ziffern/);
  assert.throws(() => L.berechneCode({ code: {}, aufgabe: {} }, null), /code\.teile/);
});

test('Code: zuordnung, auswahl, anzahlRichtig, minimalerSchluessel, attributeRichtig, relationen/fremdschluessel/attribute', () => {
  const s4 = {
    code: { teile: [{ quelle: 'zuordnung', teil: 1 }, { quelle: 'auswahl', teil: 2 }] },
    aufgabe: {
      interaktion: [
        { kind: 'match', elemente: [{ id: 'e1' }, { id: 'e2' }], kategorien: [{ id: 'k1' }, { id: 'k2' }, { id: 'k3' }] },
        { kind: 'choice', optionen: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] }
      ],
      loesung: [{ e1: 'k3', e2: 'k1' }, { richtig: ['b'] }]
    }
  };
  assert.equal(L.berechneCode(s4), '312');
  const s5g = {
    code: { teile: [{ quelle: 'anzahlRichtig' }, { quelle: 'minimalerSchluessel' }, { quelle: 'attributeRichtig' }] },
    aufgabe: { interaktion: { kind: 'choice', mehrfach: true, optionen: [{ id: 'a', code: '(A, B)' }, { id: 'b', code: '(C, D, E)' }, { id: 'c', code: '(F)' }] }, loesung: { richtig: ['a', 'b'] } }
  };
  assert.equal(L.berechneCode(s5g), '225');
  const rel = (fk) => [{ name: 'A', attribute: [{ name: 'x', pk: true }] }, { name: 'B', attribute: [{ name: 'y', pk: true }, { name: 'x', fk: fk ? 'A' : undefined }] }];
  const s5 = (muster) => ({ code: { teile: [{ quelle: 'relationen' }, { quelle: 'fremdschluessel' }, { quelle: 'attribute' }] }, aufgabe: { interaktion: { kind: 'schema', modus: 'frei' }, loesung: { muster } } });
  assert.equal(L.berechneCode(s5([rel(true)])), '213');
  assert.throws(() => L.berechneCode(s5([rel(true), rel(false)])), /nicht eindeutig/);
});

test('normCode entfernt Leerzeichen und Trenner', () => {
  assert.equal(L.normCode(' 00 6 '), '006');
  assert.equal(L.normCode('42-513'), '42513');
  assert.equal(L.normCode(null), '');
});

/* ---------- Seed ---------- */

test('seed/live: Pool K2-L-01…20, je Akte 3–4, nur ergebnis/choice/sql, ≤ 90 s, Akte 5 nur eA', () => {
  const p = json('pool.json');
  assert.deepEqual(p.aufgaben.map((a) => a.id), Array.from({ length: 20 }, (_, i) => `K2-L-${String(i + 1).padStart(2, '0')}`));
  const je = {};
  for (const a of p.aufgaben) {
    je[a.akte] = (je[a.akte] || 0) + 1;
    assert.ok(['ergebnis', 'choice', 'sql'].includes(a.interaktion.kind), a.id);
    assert.ok(a.zeitSek <= 90, a.id);
    if (a.akte === 5) assert.equal(a.niveau, 'eA', a.id);
  }
  assert.deepEqual(je, { 1: 4, 2: 3, 3: 4, 4: 3, 5: 3, 6: 3 });
});

test('seed/live: Escape Room mit S1–S6 und S5g, Codes aus den Lösungen, alle verschieden, startbar', () => {
  const l = L.ladeLiveInhalte({ datenbanken });
  assert.deepEqual(l.fehler, []);
  assert.equal(l.pool.size, 20);
  assert.equal(l.escape.startbar, true);
  const codes = Object.fromEntries(l.escape.stationen.map((s) => [s.id, s.code]));
  assert.deepEqual(Object.keys(codes), ['S1', 'S2', 'S3', 'S4', 'S5', 'S5g', 'S6']);
  // Sicherheitsprüfung F4: jede Station (eA und gA) hat einen Code mit mindestens drei Ziffern
  for (const [id, c] of Object.entries(codes)) assert.match(c, /^\d{3,8}$/, `${id}: ${c}`);
  assert.equal(new Set(Object.values(codes)).size, 7);
  assert.deepEqual(L.stationenFuer(l.escape, 'eA').map((s) => s.id), ['S1', 'S2', 'S3', 'S4', 'S5', 'S6']);
  assert.deepEqual(L.stationenFuer(l.escape, 'gA').map((s) => s.id), ['S1', 'S2', 'S3', 'S4', 'S5g', 'S6']);
  // Die Codes stehen nicht im JSON
  const text = lies('escape.json');
  for (const c of Object.values(codes)) if (c.length >= 3) assert.ok(!text.includes(`"${c}"`), c);
  for (const s of json('escape.json').stationen) assert.deepEqual(Object.keys(s.code), ['teile'], `${s.id}: nur die Regel, kein Code`);
});

test('ladeLiveInhalte ohne Datenbanken: Escape Room nicht startbar (Codes unbekannt), Pool vorhanden', () => {
  const l = L.ladeLiveInhalte({});
  assert.equal(l.pool.size, 20);
  assert.equal(l.escape.startbar, false);
});

test('validiereLive: seed/live ist fehlerfrei (Struktur, Lösungen in der Sandbox, Codes, kein Text aus den Akten)', async () => {
  const r = await L.validiereLive({ pool: lies('pool.json'), escape: lies('escape.json') }, umgebung, { akten: akten() });
  assert.deepEqual(r.fehler, []);
  assert.equal(r.aufgaben, 27);
});

test('validiereLive meldet falsche Lösungen, Zeitgrenze, nicht ableitbare und sichtbare Codes, doppelte Codes, Kopien', async () => {
  const p = json('pool.json');
  p.aufgaben[0].zeitSek = 200;
  p.aufgaben[1].loesung.zeilen[0][1] = 21;
  p.aufgaben[3].interaktion = { kind: 'gaps', felder: { g1: { typ: 'text' } } };
  const e = json('escape.json');
  e.stationen[0].aufgabe.inhalt[0].md += ' (Tipp: 006)';
  e.stationen[2].code.teile.push({ quelle: 'auswahl' });
  e.stationen[6].code = { teile: [{ quelle: 'relationen' }] };
  e.stationen[6].aufgabe.erklaerung = [];
  // Kopie einer Akten-Aufgabe als Station 6
  const a1 = JSON.parse(fs.readFileSync(path.join(SEED, 'akten', 'akte1.json'), 'utf8'));
  e.stationen[1].aufgabe.inhalt[0].md = a1.aufgaben.find((x) => x.id === 'A1-E1-08').inhalt.find((b) => b.t === 'text').md;
  // zwei Stationen mit gleichem Code
  e.stationen[3].code = { teile: [{ quelle: 'zuordnung', teil: 1 }, { quelle: 'auswahl', teil: 2 }] };
  e.stationen[4].code = { teile: [{ quelle: 'relationen' }, { quelle: 'fremdschluessel' }] };
  e.stationen[5].code = { teile: [{ quelle: 'anzahlRichtig' }, { quelle: 'minimalerSchluessel' }] };
  e.stationen.push({ ...e.stationen[5], id: 'S5g' });
  const r = await L.validiereLive({ pool: p, escape: e }, umgebung, { akten: akten() });
  const texte = r.fehler.map((x) => `${x.id || ''}: ${x.text}`).join('\n');
  assert.match(texte, /K2-L-01: zeitSek/);
  assert.match(texte, /K2-L-02: .*quelleSql/);
  assert.match(texte, /K2-L-04: .*nur ergebnis, choice, sql/);
  assert.match(texte, /S1: Der Code 006 steht in der öffentlichen Sicht/);
  assert.match(texte, /S3: Code nicht ableitbar/);
  assert.match(texte, /S6: Code nicht ableitbar/);
  assert.match(texte, /S2: Text stammt aus einer Akte \(A1-E1-08\)/);
  assert.match(texte, /Station S5g kommt doppelt vor/);
});

test('validiereLive: unvollständiger gA-Weg und fehlender Tipp-Umschlag sind Fehler', async () => {
  const e = json('escape.json');
  e.stationen = e.stationen.filter((s) => s.id !== 'S5g');
  delete e.stationen[0].aufgabe.tipps;
  const r = await L.validiereLive({ escape: e }, umgebung, {});
  const texte = r.fehler.map((x) => `${x.id || ''}: ${x.text}`).join('\n');
  assert.match(texte, /gA-Weg: Stationen müssen genau 1–6/);
  assert.match(texte, /S1: Der Tipp-Umschlag braucht genau einen Tipp/);
});
