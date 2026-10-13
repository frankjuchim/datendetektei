'use strict';
// Validator für die Kür K1 (Plan Phase 6 Task 7, AUFGABENFORMAT §1, §6.6.1): Welt 8 nur mit kuer: true, ids K1-E…,
// nur eA, Schreib-Aufgaben nur in der Kür (und der Test-Beispielakte), Prüfpunkte, Musterskript erfüllt alle Prüfpunkte,
// Gegenprobe ohne eigenes Skript.

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { ladeDatenbanken } = require('../src/sql/datenbanken');
const { erzeugeSandbox } = require('../src/sql/sandbox');
const { erzeugePruefer } = require('../src/sql/pruefer');
const { validiereAkten } = require('../src/content/validator');

const KUER_TEXT = fs.readFileSync(path.join(__dirname, '..', 'seed', 'akten', 'kuer.json'), 'utf8');
const AKTE_TEXT = fs.readFileSync(path.join(__dirname, 'fixtures', 'akte_beispiel.json'), 'utf8');
const kuer = () => JSON.parse(KUER_TEXT);
const aufgabe = (j, id) => j.aufgaben.find((a) => a.id === id);

let umgebung;
before(() => {
  const datenbanken = ladeDatenbanken(undefined, { namen: ['detektei', 'fundbuero', 'eisdiele'], log: () => {} });
  const roh = {};
  for (const n of datenbanken.namen) roh[n] = { haupt: datenbanken.haupt(n), varianten: datenbanken.varianten(n) };
  const sandbox = erzeugeSandbox({ prozesse: 2, datenbanken: roh });
  const schemata = Object.fromEntries(datenbanken.namen.map((n) => [n, datenbanken.schema(n)]));
  umgebung = { datenbanken, sandbox, sqlPruefer: erzeugePruefer({ sandbox, schemata }) };
});
after(() => umgebung.sandbox.beende());

const validiere = (json, name = 'kuer.json') => validiereAkten([{ name, json }], umgebung);
async function erwarteFehler(json, muster, id) {
  const r = await validiere(json);
  const treffer = r.fehler.filter((f) => muster.test(f.text) && (id === undefined || f.id === id));
  assert.ok(treffer.length > 0, `kein Fehler ${muster} ${id || ''} – gefunden: ${JSON.stringify(r.fehler, null, 1)}`);
}

test('seed/akten/kuer.json ist fehlerfrei (auch ohne Hinweise)', async () => {
  const r = await validiere(kuer());
  assert.deepEqual(r.fehler, []);
  assert.deepEqual(r.hinweise, []);
  assert.equal(r.aufgaben, 6);
});

test('Welt 8 nur mit kuer: true; kuer nur mit welt 8; Kür ohne Verhör; ids K1-E…', async () => {
  const ohne = kuer();
  delete ohne.kuer;
  await erwarteFehler(ohne, /welt 8 ist die Kür/);
  const falscheWelt = kuer();
  falscheWelt.welt = 3;
  await erwarteFehler(falscheWelt, /Die Kür hat welt 8/);
  const mitBoss = kuer();
  mitBoss.boss = { id: 'K1-V', pool: [] };
  await erwarteFehler(mitBoss, /kein Verhör/);
  const id = kuer();
  aufgabe(id, 'K1-E1-01').id = 'A8-E1-01';
  id.levels[0].aufgaben[0] = 'A8-E1-01';
  await erwarteFehler(id, /Format K1-E<k>-<nn>/);
});

test('Kür nur eA (entfällt im gA-Pfad): Ermittlung und Aufgaben', async () => {
  const j = kuer();
  j.levels[0].niveau = 'alle';
  await erwarteFehler(j, /Kür K1 entfällt im gA-Pfad/);
  const k = kuer();
  aufgabe(k, 'K1-E1-02').niveau = 'alle';
  await erwarteFehler(k, /Kür K1 entfällt im gA-Pfad/, 'K1-E1-02');
});

test('schreiben nur in der Kür (und welt 9); abimodus aus; keine datenbank/varianten; start gültig', async () => {
  const akte = JSON.parse(AKTE_TEXT);
  akte.welt = 3;
  akte.levels.forEach((l) => (l.id = l.id.replace('A9', 'A3')));
  akte.levels.forEach((l) => {
    l.aufgaben = l.aufgaben.map((x) => x.replace('A9', 'A3'));
    if (l.coldCase) l.coldCase = l.coldCase.replace('A9', 'A3');
    if (l.plaedoyer) delete l.plaedoyer;
  });
  delete akte.boss;
  akte.aufgaben = akte.aufgaben.filter((a) => !/-V-/.test(a.id)).map((a) => ({ ...a, id: a.id.replace('A9', 'A3') }));
  const r = await validiereAkten([{ name: 'akte3.json', json: akte }], umgebung);
  assert.ok(r.fehler.some((f) => f.id === 'A3-E2-CC' && /nur in der Kür-Akte/.test(f.text)), JSON.stringify(r.fehler));

  const j = kuer();
  aufgabe(j, 'K1-E1-01').interaktion.abimodus = 'hinweis';
  await erwarteFehler(j, /abimodus "aus"/, 'K1-E1-01');
  const d = kuer();
  aufgabe(d, 'K1-E1-01').interaktion.datenbank = 'detektei';
  await erwarteFehler(d, /datenbank gibt es bei schreiben nicht/, 'K1-E1-01');
  const s = kuer();
  aufgabe(s, 'K1-E1-05').interaktion.start = { titel: 'x', datenbank: 'verhoer/mensa' };
  await erwarteFehler(s, /öffentliche Übungs-DB/, 'K1-E1-05');
  const beide = kuer();
  aufgabe(beide, 'K1-E1-05').interaktion.start = { titel: 'x', datenbank: 'detektei', skript: 'SELECT 1;' };
  await erwarteFehler(beide, /entweder datenbank/, 'K1-E1-05');
  const kaputt = kuer();
  aufgabe(kaputt, 'K1-E1-02').interaktion.start.skript = 'CREATE TABLE (';
  await erwarteFehler(kaputt, /nicht ausführbar/, 'K1-E1-02');
});

test('Prüfpunkte: Format, Musterskript erfüllt alle, Gegenprobe, verbotenes Musterskript', async () => {
  const leer = kuer();
  aufgabe(leer, 'K1-E1-01').loesung.pruefung = [];
  await erwarteFehler(leer, /pruefung .* fehlt/, 'K1-E1-01');
  const art = kuer();
  aufgabe(art, 'K1-E1-01').loesung.pruefung[0].art = 'irgendwas';
  await erwarteFehler(art, /unbekannte art/, 'K1-E1-01');
  const regex = kuer();
  aufgabe(regex, 'K1-E1-04').loesung.pruefung[0].muster = '(';
  await erwarteFehler(regex, /kein gültiger regulärer Ausdruck/, 'K1-E1-04');
  const muster = kuer();
  aufgabe(muster, 'K1-E1-01').loesung.pruefung[1].sql = 'SELECT 0';
  await erwarteFehler(muster, /erfüllt den Prüfpunkt .* nicht/, 'K1-E1-01');
  const gegen = kuer();
  aufgabe(gegen, 'K1-E1-02').loesung.pruefung = [{ text: 'Immer wahr.', sql: 'SELECT 1' }];
  await erwarteFehler(gegen, /schon ohne eigenes Skript erfüllt/, 'K1-E1-02');
  const verboten = kuer();
  aufgabe(verboten, 'K1-E1-01').loesung.sql = 'PRAGMA foreign_keys = OFF;';
  await erwarteFehler(verboten, /Musterskript nicht zulässig \(verboten: PRAGMA\)/, 'K1-E1-01');
  const feld = kuer();
  aufgabe(feld, 'K1-E1-02').loesung.pruefung[2].sql = 'SELECT 1';
  await erwarteFehler(feld, /Feld „sql“ passt nicht zu art „zeilen“/, 'K1-E1-02');
});
