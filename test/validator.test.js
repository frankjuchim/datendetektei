'use strict';
// Validator für Akten- und Warm-up-Dateien (Plan Phase 3 Task 3, docs/AUFGABENFORMAT.md §8, Review Focus 5).
// Grundlage: Beispielakte (test/fixtures/akte_beispiel.json) muss grün sein; je Fehlerklasse ein manipulierter Fall.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const childProcess = require('node:child_process');

const { ladeDatenbanken } = require('../src/sql/datenbanken');
const { erzeugeSandbox } = require('../src/sql/sandbox');
const { erzeugePruefer } = require('../src/sql/pruefer');
const { validiereAkten, mixErfuellbar } = require('../src/content/validator');

const WURZEL = path.join(__dirname, '..');
const AKTE_TEXT = fs.readFileSync(path.join(__dirname, 'fixtures', 'akte_beispiel.json'), 'utf8');
const WARMUP_TEXT = fs.readFileSync(path.join(__dirname, 'fixtures', 'warmup_beispiel.json'), 'utf8');

let umgebung;

test.before(() => {
  const datenbanken = ladeDatenbanken(undefined, { log: () => {} });
  const roh = {};
  for (const name of datenbanken.namen) roh[name] = { haupt: datenbanken.haupt(name), varianten: datenbanken.varianten(name) };
  const sandbox = erzeugeSandbox({ prozesse: 2, datenbanken: roh });
  const schemata = {};
  for (const name of datenbanken.namen) schemata[name] = datenbanken.schema(name);
  const sqlPruefer = erzeugePruefer({ sandbox, schemata });
  umgebung = { datenbanken, sandbox, sqlPruefer };
});

test.after(() => {
  if (umgebung) umgebung.sandbox.beende();
});

function akte() {
  return JSON.parse(AKTE_TEXT);
}
function aufgabe(json, id) {
  const a = json.aufgaben.find((x) => x.id === id);
  assert.ok(a, `Aufgabe ${id} fehlt in der Beispielakte`);
  return a;
}
function validiere(json, name = 'akte_beispiel.json', weitere = []) {
  return validiereAkten([{ name, json }, ...weitere], umgebung);
}
/** Erwartet mindestens einen Fehler, dessen Text auf `muster` passt (optional an Aufgabe `id`). */
async function erwarteFehler(json, muster, id) {
  const r = await validiere(json);
  const treffer = r.fehler.filter((f) => muster.test(f.text) && (id === undefined || f.id === id));
  assert.ok(treffer.length > 0, `kein Fehler ${muster} ${id || ''} – gefunden: ${JSON.stringify(r.fehler, null, 1)}`);
  return r;
}

/* ---------- Grundfall ---------- */

test('Beispielakte und Warm-up-Beispiel: keine Fehler, Aufgaben gezählt', async () => {
  const r = await validiereAkten(
    [
      { name: 'akte_beispiel.json', json: akte() },
      { name: 'warmup_beispiel.json', json: JSON.parse(WARMUP_TEXT) }
    ],
    umgebung
  );
  assert.deepEqual(r.fehler, []);
  assert.equal(r.aufgaben, akte().aufgaben.length);
  assert.equal(r.karten, 2);
  assert.ok(Array.isArray(r.hinweise));
  for (const h of r.hinweise) assert.equal(typeof h.text, 'string');
});

test('Datei als Text wird geparst; kaputtes JSON ist ein Fehler auf Dateiebene', async () => {
  const gut = await validiereAkten([{ name: 'a.json', json: AKTE_TEXT }], umgebung);
  assert.deepEqual(gut.fehler, []);
  const schlecht = await validiereAkten([{ name: 'kaputt.json', json: '{ "version": 2, ' }], umgebung);
  assert.equal(schlecht.fehler.length, 1);
  assert.equal(schlecht.fehler[0].datei, 'kaputt.json');
  assert.match(schlecht.fehler[0].text, /JSON/);
});

test('Schema: version, welt, levels und Pflichtfelder', async () => {
  const j = akte();
  j.version = 1;
  await erwarteFehler(j, /version/);
  const k = akte();
  delete k.levels;
  await erwarteFehler(k, /levels/);
  const l = akte();
  aufgabe(l, 'A9-E1-01').kategorie = 'SQL allgemein';
  await erwarteFehler(l, /kategorie/, 'A9-E1-01');
  const m = akte();
  aufgabe(m, 'A9-E1-01').fallen = ['P11'];
  await erwarteFehler(m, /Falle/, 'A9-E1-01');
  const n = akte();
  aufgabe(n, 'A9-E1-01').stufe = 4;
  await erwarteFehler(n, /stufe/, 'A9-E1-01');
});

/* ---------- SQL-Lösungen (Review Focus 5) ---------- */

test('SQL: Musterlösung auf einer Variante nicht eindeutig (Gleichstand an der LIMIT-Grenze) → Fehler', async () => {
  const j = akte();
  aufgabe(j, 'A9-E1-03').interaktion.varianten = ['gleichstand'];
  const r = await erwarteFehler(j, /gleichstand/, 'A9-E1-03');
  assert.ok(r.fehler.some((f) => /LIMIT/.test(f.text)));
  // Ohne die Variante ist dieselbe Aufgabe in Ordnung.
  const ohne = await validiere(akte());
  assert.ok(!ohne.fehler.some((f) => f.id === 'A9-E1-03'));
});

test('SQL: LIMIT ohne ORDER BY ist nicht eindeutig → Fehler', async () => {
  const j = akte();
  aufgabe(j, 'A9-E1-CC').loesung.sql = "SELECT FundNr, Bezeichnung, Finder\nFROM Fundsache\nWHERE Finder LIKE '%alter%'\nLIMIT 1";
  await erwarteFehler(j, /ORDER BY/, 'A9-E1-CC');
});

test('SQL: Musterlösung nicht ausführbar → Fehler', async () => {
  const j = akte();
  aufgabe(j, 'A9-E1-02').loesung.sql = "SELECT Bezeichnung, Gewicht\nFROM Fundsache\nWHERE Kategorie = 'Wertsachen'";
  await erwarteFehler(j, /Musterlösung/, 'A9-E1-02');
});

test('SQL: unbekannte Datenbank oder Variante, die es für die DB nicht gibt → Fehler', async () => {
  const j = akte();
  aufgabe(j, 'A9-E2-01').interaktion.varianten = ['null'];
  await erwarteFehler(j, /Variante/, 'A9-E2-01');
  const k = akte();
  aufgabe(k, 'A9-E1-02').interaktion.datenbank = 'fundamt';
  await erwarteFehler(k, /Datenbank/, 'A9-E1-02');
  const l = akte();
  aufgabe(l, 'A9-E1-02').interaktion.varianten = ['zufall'];
  await erwarteFehler(l, /Variante/, 'A9-E1-02');
});

test('SQL: EH-Verstoß im Abimodus streng (JOIN … ON, <>) → Fehler, auch wenn die Aufgabe „hinweis“ hat', async () => {
  const j = akte();
  aufgabe(j, 'A9-E2-01').loesung.sql =
    'SELECT s.Name, SUM(v.Kugeln) AS Kugeln\nFROM Sorte s JOIN Verkauf v ON s.SorteNr = v.SorteNr\nGROUP BY s.SorteNr, s.Name';
  await erwarteFehler(j, /JOIN/, 'A9-E2-01');
  const k = akte();
  aufgabe(k, 'A9-E1-02').loesung.sql =
    "SELECT Bezeichnung, Wert\nFROM Fundsache\nWHERE Kategorie <> 'Kleidung'\n  AND Wert >= 100\nORDER BY Wert DESC";
  await erwarteFehler(k, /!=|<>/, 'A9-E1-02');
});

test('SQL: GROUP-BY-Regel verletzt → Fehler', async () => {
  const j = akte();
  aufgabe(j, 'A9-E2-01').loesung.sql = 'SELECT s.Name, SUM(v.Kugeln) AS Kugeln\nFROM Sorte s, Verkauf v\nWHERE s.SorteNr = v.SorteNr\nGROUP BY s.SorteNr';
  await erwarteFehler(j, /GROUP BY|gruppiert|Gruppe/i, 'A9-E2-01');
});

test('SQL: sortierung nennt eine Spalte, die das Ergebnis nicht hat → Fehler', async () => {
  const j = akte();
  aufgabe(j, 'A9-E1-02').interaktion.sortierung = [{ spalte: 'Preis', richtung: 'DESC' }];
  await erwarteFehler(j, /sortierung/, 'A9-E1-02');
});

/* ---------- ergebnis / zeilen / dbtabelle mit Quelle ---------- */

test('ergebnis: quelleSql liefert ein anderes Ergebnis als loesung.zeilen → Fehler', async () => {
  const j = akte();
  aufgabe(j, 'A9-E1-06').loesung.zeilen[1] = ['Kamera', 380];
  await erwarteFehler(j, /quelleSql/, 'A9-E1-06');
  const k = akte();
  const a = aufgabe(k, 'A9-E1-06');
  [a.loesung.zeilen[0], a.loesung.zeilen[1]] = [a.loesung.zeilen[1], a.loesung.zeilen[0]];
  await erwarteFehler(k, /quelleSql|Reihenfolge/, 'A9-E1-06');
  const l = akte();
  delete aufgabe(l, 'A9-E2-02').loesung.datenbank;
  await erwarteFehler(l, /datenbank/, 'A9-E2-02');
});

test('zeilen: quelleSql passt nicht zu loesung.zeilen → Fehler', async () => {
  const j = akte();
  aufgabe(j, 'A9-E1-05').loesung.zeilen = [6];
  await erwarteFehler(j, /quelleSql/, 'A9-E1-05');
});

test('dbtabelle: Zeilen stimmen nicht mit quelle überein → Fehler', async () => {
  const j = akte();
  aufgabe(j, 'A9-E1-01').inhalt[1].zeilen[2][3] = 'messing';
  await erwarteFehler(j, /quelle/, 'A9-E1-01');
  const k = akte();
  aufgabe(k, 'A9-E1-01').inhalt[1].zeilen[0][1] = '[[g9]]';
  await erwarteFehler(k, /quelle|Lücke/, 'A9-E1-01');
});

/* ---------- Lücken, ids, Verweise ---------- */

test('Lücken: fehlende Lücke, doppelte Lücke, Lücke ohne Feld, Lücke in der Erklärung → Fehler', async () => {
  const j = akte();
  const a = aufgabe(j, 'A9-E1-07');
  a.inhalt[3].zeilen[1][1] = '_';
  await erwarteFehler(j, /g5/, 'A9-E1-07');
  const k = akte();
  aufgabe(k, 'A9-E1-07').inhalt[2].md = 'Wie viele Datensätze liefert die Abfrage? [[g4]] [[g1]]';
  await erwarteFehler(k, /g1/, 'A9-E1-07');
  const l = akte();
  aufgabe(l, 'A9-E1-07').inhalt[0].md += ' [[g7]]';
  await erwarteFehler(l, /g7/, 'A9-E1-07');
  const m = akte();
  aufgabe(m, 'A9-E1-07').erklaerung.push({ t: 'text', md: 'Lücke [[g1]]' });
  await erwarteFehler(m, /Lücke/, 'A9-E1-07');
});

test('Lösung passt nicht zur Interaktion (choice, order, lines, match, gaps-auswahl) → Fehler', async () => {
  const faelle = [
    ['A9-E1-01', (a) => (a.loesung.richtig = ['z'])],
    ['A9-E1-04', (a) => (a.loesung.reihenfolgen = [['a', 'q']])],
    ['A9-E1-08', (a) => (a.loesung.zeilen = [3, 4, 9])],
    ['A9-E1-09', (a) => (a.loesung.e1 = 'x')],
    ['A9-E1-07', (a) => (a.loesung.g2 = ['=>'])],
    ['A9-E1-06', (a) => (a.interaktion.zeilenAnzahl = 4)],
    ['A9-E1-05', (a) => (a.interaktion.block = 1)]
  ];
  for (const [id, aendere] of faelle) {
    const j = akte();
    aendere(aufgabe(j, id));
    await erwarteFehler(j, /./, id);
  }
});

test('doppelte id in einer Datei und über Dateien hinweg → Fehler', async () => {
  const j = akte();
  j.aufgaben.push({ ...aufgabe(j, 'A9-E1-01') });
  await erwarteFehler(j, /doppelt/, 'A9-E1-01');

  const zweite = akte();
  zweite.welt = 8;
  zweite.levels = [];
  delete zweite.boss;
  zweite.aufgaben = [aufgabe(zweite, 'A9-E1-01')];
  const r = await validiere(akte(), 'akte_beispiel.json', [{ name: 'akte8.json', json: zweite }]);
  assert.ok(r.fehler.some((f) => f.datei === 'akte8.json' && /A9-E1-01/.test(f.text + (f.id || ''))), JSON.stringify(r.fehler));
});

test('id-Formate: falsches Format, falsche Akte, Aufgabe in der falschen Ermittlung → Fehler', async () => {
  const j = akte();
  aufgabe(j, 'A9-E1-01').id = 'A9-E1-1';
  j.levels[0].aufgaben[0] = 'A9-E1-1';
  await erwarteFehler(j, /Format/);
  const k = akte();
  k.levels[1].aufgaben.push('A9-E1-01');
  k.levels[0].aufgaben = k.levels[0].aufgaben.filter((x) => x !== 'A9-E1-01');
  await erwarteFehler(k, /A9-E1-01/);
});

test('Verhör-Aufgabe in einer Ermittlung → Fehler', async () => {
  const j = akte();
  j.levels[0].aufgaben.push('A9-V-01');
  await erwarteFehler(j, /Verhör/);
});

test('Cold Case: Punkte ≠ 0 oder in levels.aufgaben → Fehler; coldCase verweist ins Leere → Fehler', async () => {
  const j = akte();
  aufgabe(j, 'A9-E1-CC').punkte = 10;
  await erwarteFehler(j, /Cold Case/, 'A9-E1-CC');
  const k = akte();
  k.levels[0].aufgaben.push('A9-E1-CC');
  await erwarteFehler(k, /Cold Case/);
  const l = akte();
  l.levels[0].coldCase = 'A9-E1-01';
  await erwarteFehler(l, /coldCase/);
});

test('kernpunkte: Punkte ≠ 0 → Fehler; kernpunkte im Verhör → Fehler', async () => {
  const j = akte();
  aufgabe(j, 'A9-E1-11').punkte = 10;
  await erwarteFehler(j, /kernpunkte/, 'A9-E1-11');
  const k = akte();
  const kp = { ...aufgabe(k, 'A9-E1-11'), id: 'A9-V-05' };
  k.aufgaben.push(kp);
  k.boss.pool.push('A9-V-05');
  await erwarteFehler(k, /kernpunkte/, 'A9-V-05');
});

test('intro: schema-Block, der das Schema des datenbank-Blocks wiederholt → Fehler (Briefing ohne doppeltes Schema)', async () => {
  const j = akte();
  j.levels[0].intro.splice(1, 0, {
    t: 'schema',
    relationen: [{ name: 'Fundsache', attribute: [{ name: 'FundNr', pk: true }, { name: 'Bezeichnung' }] }]
  });
  await erwarteFehler(j, /doppelt/);
  // Ein schema-Block mit anderen Relationen (z. B. Entwurf) bleibt erlaubt.
  const k = akte();
  k.levels[0].intro.splice(1, 0, { t: 'schema', relationen: [{ name: 'Entwurf', attribute: [{ name: 'Nr', pk: true }] }] });
  const r = await validiere(k);
  assert.deepEqual(r.fehler.filter((f) => /doppelt/.test(f.text)), []);
});

/* ---------- Verhör ---------- */

test('Verhör-Mix nicht erfüllbar (Stufe fehlt, maxJeKind, Summe ≠ anzahl) → Fehler', async () => {
  const j = akte();
  j.boss.mix = { 1: 0, 2: 3, 3: 0 };
  await erwarteFehler(j, /Mix/);
  const k = akte();
  k.boss.mix = { 1: 2, 2: 1, 3: 0 };
  k.boss.maxJeKind = { choice: 0 };
  await erwarteFehler(k, /Mix/);
  const l = akte();
  l.boss.mix = { 1: 1, 2: 1, 3: 0 };
  await erwarteFehler(l, /anzahl/);
});

test('mixErfuellbar: Stufen und Obergrenzen je Art (Flussproblem)', () => {
  const pool = [
    { stufe: 1, art: 'choice' },
    { stufe: 1, art: 'choice' },
    { stufe: 1, art: 'gaps' },
    { stufe: 2, art: 'sql' },
    { stufe: 2, art: 'choice' },
    { stufe: 3, art: 'sql' }
  ];
  assert.equal(mixErfuellbar(pool, { 1: 2, 2: 2, 3: 1 }, { choice: 2 }), true);
  assert.equal(mixErfuellbar(pool, { 1: 2, 2: 2, 3: 1 }, { choice: 1 }), false);
  assert.equal(mixErfuellbar(pool, { 1: 3, 2: 1, 3: 1 }, { choice: 2, sql: 1 }), false);
  assert.equal(mixErfuellbar(pool, { 1: 3, 2: 1, 3: 0 }, {}), true);
  assert.equal(mixErfuellbar(pool, { 1: 4, 2: 0, 3: 0 }, {}), false);
});

test('Verhör: kontextDb muss eine Verhör-DB sein; Aufgaben nur auf der kontextDb', async () => {
  const j = akte();
  j.boss.kontextDb = 'eisdiele';
  await erwarteFehler(j, /kontextDb/);
  const k = akte();
  aufgabe(k, 'A9-V-03').interaktion.datenbank = 'verhoer/bibliothek';
  aufgabe(k, 'A9-V-03').interaktion.varianten = [];
  await erwarteFehler(k, /kontextDb/, 'A9-V-03');
  const l = akte();
  aufgabe(l, 'A9-V-04').inhalt[2].quelle.datenbank = 'eisdiele';
  await erwarteFehler(l, /kontextDb/, 'A9-V-04');
  const m = akte();
  aufgabe(m, 'A9-V-01').inhalt.push({ t: 'datenbank', name: 'eisdiele' });
  await erwarteFehler(m, /datenbank/, 'A9-V-01');
  const n = akte();
  n.boss.abimodus = 'hinweis';
  await erwarteFehler(n, /abimodus/);
});

test('Lab-Aufgabe auf einer Verhör-DB → Fehler (nur öffentliche Akten-DBs)', async () => {
  const j = akte();
  const a = aufgabe(j, 'A9-E1-02');
  a.interaktion.datenbank = 'verhoer/kiosk';
  a.interaktion.varianten = [];
  a.interaktion.sortierung = [{ spalte: 'Preis', richtung: 'DESC' }];
  a.loesung.sql = "SELECT Bezeichnung, Preis\nFROM Produkt\nWHERE Kategorie = 'Getränk'\nORDER BY Preis DESC";
  await erwarteFehler(j, /öffentlich/, 'A9-E1-02');
  const k = akte();
  k.levels[0].intro[0].name = 'verhoer/kiosk';
  await erwarteFehler(k, /datenbank/);
});

/* ---------- Niveau, Punkte, Markdown ---------- */

test('Niveau: Akte 5 komplett eA', async () => {
  const j = JSON.parse(AKTE_TEXT.replace(/A9-/g, 'A5-'));
  j.welt = 5;
  const r = await validiere(j);
  assert.ok(r.fehler.some((f) => /eA/.test(f.text)), JSON.stringify(r.fehler));
  for (const l of j.levels) l.niveau = 'eA';
  j.boss.niveau = 'eA';
  for (const a of j.aufgaben) delete a.niveau;
  const gut = await validiere(j);
  assert.deepEqual(gut.fehler.filter((f) => /eA|niveau/i.test(f.text)), []);
});

test('Markdown: HTML-Tag und unausgeglichene ** → Fehler', async () => {
  const j = akte();
  aufgabe(j, 'A9-E1-01').inhalt[0].md = 'Ein <u>Ausschnitt</u>';
  await erwarteFehler(j, /HTML/, 'A9-E1-01');
  const k = akte();
  aufgabe(k, 'A9-E1-01').inhalt[0].md = 'Ein **Ausschnitt';
  await erwarteFehler(k, /\*\*/, 'A9-E1-01');
});

test('Hinweise: abweichende Punkte, fehlende Erklärung, Aufgabe nirgends verwendet', async () => {
  const j = akte();
  aufgabe(j, 'A9-E1-01').punkte = 15;
  delete aufgabe(j, 'A9-E1-02').erklaerung;
  j.levels[0].aufgaben = j.levels[0].aufgaben.filter((x) => x !== 'A9-E1-12');
  const r = await validiere(j);
  assert.deepEqual(r.fehler, []);
  assert.ok(r.hinweise.some((h) => h.id === 'A9-E1-01' && /punkte/i.test(h.text)));
  assert.ok(r.hinweise.some((h) => h.id === 'A9-E1-02' && /erklaerung/.test(h.text)));
  assert.ok(r.hinweise.some((h) => h.id === 'A9-E1-12' && /verwendet/.test(h.text)));
});

/* ---------- Phase 5: Blöcke er/mengen, Interaktionen zellen, anomalie, zerlegen, schema, er ---------- */

/** Erwartet je Manipulation einen Fehler an Aufgabe id, dessen Text auf muster passt. */
async function fehlerJe(id, faelle) {
  for (const [muster, manipuliere] of faelle) {
    const j = akte();
    manipuliere(aufgabe(j, id), j);
    await erwarteFehler(j, muster, id);
  }
}

test('Block er: Graph wohlgeformt, Layout für jedes Element (Attribute <id>.<i>), markiert, Ids; auch in Erklärung', async () => {
  await fehlerJe('A9-E2-08', [
    [/layout für „e1\.1“ fehlt/, (a) => delete a.inhalt[1].layout['e1.1']],
    [/unbekannte Element „e9“/, (a) => (a.inhalt[1].layout.e9 = { x: 1, y: 1 })],
    [/außerhalb/, (a) => (a.inhalt[1].layout.e1 = { x: -5, y: 1 })],
    [/layout .*fehlt/, (a) => delete a.inhalt[1].layout],
    [/markiert: unbekanntes Element/, (a) => (a.inhalt[1].markiert = ['e1', 'x'])],
    [/graph: .*Entitätstyp/, (a) => (a.inhalt[1].graph.beziehungen[0].enden[1].entitaet = 'e7')],
    [/id .*erlaubt sind/, (a) => {
      const b = a.inhalt[1];
      b.graph.entitaeten[0].id = 'e.1';
      b.graph.beziehungen[0].enden[0].entitaet = 'e.1';
    }],
    [/unbekanntes Feld „farbe“/, (a) => (a.inhalt[1].farbe = 'rot')],
    [/layout/, (a) => a.erklaerung.push({ t: 'er', graph: a.inhalt[1].graph, layout: {} })]
  ]);
});

test('Block mengen: Seiten mit Namen und 1–30 Elementen, Linien-Indizes gültig und eindeutig', async () => {
  await fehlerJe('A9-E2-07', [
    [/linien\[1\]/, (a) => (a.inhalt[1].linien[1] = [0, 3])],
    [/linien\[2\]: Linie doppelt/, (a) => (a.inhalt[1].linien[2] = [0, 0])],
    [/rechts\.elemente/, (a) => (a.inhalt[1].rechts.elemente = [])],
    [/links\.name/, (a) => delete a.inhalt[1].links.name],
    [/linien muss/, (a) => (a.inhalt[1].linien = 'x')]
  ]);
});

test('zellen: block ist dbtabelle, Zellen existieren, mehrfach false braucht genau eine Zelle', async () => {
  await fehlerJe('A9-E2-03', [
    [/zellen\[1\] liegt nicht in der Tabelle/, (a) => (a.loesung.zellen[1] = [4, 4])],
    [/zellen\[0\] liegt nicht/, (a) => (a.loesung.zellen[0] = [0, 5])],
    [/dbtabelle-Blocks/, (a) => (a.interaktion.block = 0)],
    [/genau eine Zelle/, (a) => (a.interaktion.mehrfach = false)],
    [/mehrfach/, (a) => a.loesung.zellen.push([1, 4])],
    [/reihenfolge muss/, (a) => (a.interaktion.reihenfolge = 'ja')]
  ]);
});

test('anomalie: Art aus der Liste, Operation, Simulation passt zur Tabelle, Zellen existieren (neue Zeile nur beim Einfügen)', async () => {
  await fehlerJe('A9-E2-04', [
    [/art muss/, (a) => (a.loesung.art = 'aenderungsanomalie')],
    [/operation muss/, (a) => (a.interaktion.operation = 'update')],
    [/auftrag/, (a) => delete a.interaktion.auftrag],
    [/alt kommt in der Spalte TrainerTelefon nicht vor/, (a) => (a.interaktion.simulation.alt = '0421-77')],
    [/simulation\.spalte/, (a) => (a.interaktion.simulation.spalte = 9)],
    [/zellen\[0\] liegt nicht/, (a) => (a.loesung.zellen[0] = [4, 4])],
    [/simulation\.zeilen/, (a) => {
      a.interaktion.operation = 'loeschen';
      a.interaktion.simulation = { zeilen: [7] };
    }],
    [/simulation\.werte/, (a) => {
      a.interaktion.operation = 'einfuegen';
      a.interaktion.simulation = { werte: [null] };
    }]
  ]);
  const j = akte();
  const a = aufgabe(j, 'A9-E2-04');
  a.interaktion.operation = 'einfuegen';
  a.interaktion.simulation = { werte: [null, null, 'Bouldern', 'Kruse', null] };
  a.loesung = { art: 'einfuegung', zellen: [[4, 0], [4, 1]] };
  const r = await validiere(j);
  assert.deepEqual(r.fehler, []);
  a.loesung.art = 'loeschung';
  const r2 = await validiere(j);
  assert.ok(r2.hinweise.some((h) => h.id === 'A9-E2-04' && /passt nicht zur operation/.test(h.text)));
});

test('zerlegen: FA-Spalten ⊆ attribute, Musterzerlegung gelöst, Schlüssel ist Kandidat, ohne muster berechnete Zerlegung', async () => {
  await fehlerJe('A9-E2-05', [
    [/fa\[1\] nennt „Telefon“/, (a) => (a.loesung.fa[1].rechts = ['Telefon'])],
    [/muster\[0\] ist nach den fa nicht gelöst/, (a) => a.loesung.muster[0].tabellen[0].attribute.push('TrainerTelefon')],
    [/muster\[0\] ist nach den fa nicht gelöst/, (a) => (a.loesung.muster[0].tabellen[1].schluessel = ['TrainerTelefon'])],
    [/schluessel ist kein Schlüsselkandidat/, (a) => (a.loesung.schluessel = ['Trainer'])],
    [/tabellenMax ist 1/, (a) => (a.interaktion.tabellenMax = 1)],
    [/attribute muss/, (a) => (a.interaktion.attribute = ['Abteilung'])],
    [/fa \(Liste/, (a) => delete a.loesung.fa],
    [/unbekanntes Feld „fa“/, (a) => (a.interaktion.fa = a.loesung.fa)]
  ]);
  const j = akte();
  delete aufgabe(j, 'A9-E2-05').loesung.muster;
  assert.deepEqual((await validiere(j)).fehler, []);
});

test('schema: Musterschemata wohlgeformt und gelöst, Modus schluessel mit festem Gerüst, PK je Relation, keine Umlaute', async () => {
  await fehlerJe('A9-E2-06', [
    [/keinen Primärschlüssel/, (a) => delete a.loesung.muster[0][0].attribute[0].pk],
    [/dieselben Relationen und Attribute wie start/, (a) => a.loesung.muster[0][0].attribute.push({ name: 'Preis' })],
    [/ohne Umlaute/, (a) => {
      a.loesung.muster[0][0].attribute[1].name = 'Größe';
      a.interaktion.start[0].attribute[1].name = 'Größe';
    }],
    [/Zielrelation/, (a) => (a.loesung.muster[0][1].attribute[2].fk = 'Eissorte')],
    [/braucht start/, (a) => delete a.interaktion.start],
    [/modus muss/, (a) => (a.interaktion.modus = 'werkbank')],
    [/muster \(Liste/, (a) => (a.loesung.muster = [])],
    [/synonyme/, (a) => (a.loesung.synonyme = { Sorte: 'Eissorte' })]
  ]);
});

test('er: Muster vollständig und Chen-konform, gelöst, Startgraph Teil jedes Musters, Modi, Lesen-Lösung', async () => {
  await fehlerJe('A9-E2-07', [
    [/Entitätstyp „fall“ – Name/, (a) => (a.loesung.muster[0].entitaeten[1].name = 'fall')],
    [/Beziehungstyp „Leitet“ – Verb in lowerCamelCase/, (a) => (a.loesung.muster[0].beziehungen[0].name = 'Leitet')],
    [/braucht ein Schlüsselattribut/, (a) => (a.loesung.muster[0].entitaeten[1].attribute[0].schluessel = false)],
    [/Kardinalität/, (a) => delete a.loesung.muster[0].beziehungen[0].enden[1].kard],
    [/p nur bei ternären/, (a) => (a.loesung.muster[0].beziehungen[0].enden[1].kard = 'p')],
    [/Attribut „Größe“ ohne Umlaute/, (a) => a.loesung.muster[0].entitaeten[1].attribute.push({ name: 'Größe' })],
    [/Startdiagramm ist kein Teil dieses Musters/, (a) => {
      a.interaktion.start.graph.entitaeten[1].attribute.push({ name: 'Datum' });
      a.interaktion.start.layout['e2.2'] = { x: 600, y: 40 };
    }],
    [/Startdiagramm ist kein Teil dieses Musters/, (a) => {
      a.interaktion.start.graph.beziehungen.push({ id: 'b1', name: 'leitet', enden: [{ entitaet: 'e1', kard: 'n' }, { entitaet: 'e2', kard: '1' }], attribute: [] });
      a.interaktion.start.layout.b1 = { x: 300, y: 120 };
    }],
    [/start\.layout/, (a) => delete a.interaktion.start.layout['e2.1']],
    [/braucht start/, (a) => delete a.interaktion.start],
    [/entwickeln beginnt leer/, (a) => (a.interaktion.modus = 'entwickeln')],
    [/modus muss/, (a) => (a.interaktion.modus = 'zeichnen')],
    [/aequivalenzen/, (a) => (a.loesung.aequivalenzen = ['alles'])],
    [/kriterien/, (a) => (a.loesung.kriterien = [])],
    [/unbekanntes Feld „muster“/, (a) => (a.interaktion.muster = a.loesung.muster)]
  ]);
  // Startdiagramm ohne Kardinalitäten (werden ergänzt) ist erlaubt
  const j = akte();
  const a = aufgabe(j, 'A9-E2-07');
  a.interaktion.start.graph.beziehungen.push({ id: 'b1', name: 'leitet', enden: [{ entitaet: 'e1' }, { entitaet: 'e2' }], attribute: [] });
  a.interaktion.start.layout.b1 = { x: 300, y: 120 };
  assert.deepEqual((await validiere(j)).fehler, []);
  await fehlerJe('A9-E2-08', [
    [/elemente: unbekanntes Element „e1\.5“/, (a) => a.loesung.elemente.push('e1.5')],
    [/er-Blocks/, (a) => (a.interaktion.block = 0)],
    [/zuordnung/, (a) => (a.interaktion.kategorien = [{ id: 'a', md: 'A' }, { id: 'b', md: 'B' }])],
    [/unbekannte Kategorie/, (a) => {
      a.interaktion.kategorien = [{ id: 'a', md: 'A' }, { id: 'b', md: 'B' }];
      a.loesung = { zuordnung: { e1: 'c' } };
    }]
  ]);
});

test('Verhör: alle fünf neuen Interaktionen und die Blöcke er/mengen sind erlaubt (kernpunkte weiterhin nicht)', async () => {
  const j = akte();
  const neu = ['A9-E2-03', 'A9-E2-04', 'A9-E2-05', 'A9-E2-06', 'A9-E2-07', 'A9-E2-08'];
  neu.forEach((id, i) => {
    const kopie = structuredClone(aufgabe(j, id));
    kopie.id = `A9-V-${String(5 + i).padStart(2, '0')}`;
    j.aufgaben.push(kopie);
    j.boss.pool.push(kopie.id);
  });
  const r = await validiere(j);
  assert.deepEqual(r.fehler, []);
});

/* ---------- Verstehenshilfen als Blöcke (Phase 4 Task 5) ---------- */

const blockVon = (liste, t) => liste.find((b) => b && b.t === t);

test('Beispielakte enthält je einen Block zeitlupe, spurenbrett und sortierfaecher (gültig)', async () => {
  const j = akte();
  const e2 = j.levels.find((l) => l.id === 'A9-E2');
  assert.ok(blockVon(e2.intro, 'zeitlupe'), 'zeitlupe im Intro von A9-E2');
  assert.ok(blockVon(aufgabe(j, 'A9-E2-01').inhalt, 'spurenbrett'), 'spurenbrett in A9-E2-01');
  assert.ok(blockVon(aufgabe(j, 'A9-E2-02').erklaerung, 'sortierfaecher'), 'sortierfaecher in der Erklärung von A9-E2-02');
  const r = await validiere(j);
  assert.deepEqual(r.fehler, []);
});

test('Block zeitlupe: Abfrage muss laufen, EH-konform sein, start nur eine vorhandene Klausel', async () => {
  const intro = (j) => blockVon(j.levels.find((l) => l.id === 'A9-E2').intro, 'zeitlupe');
  const a = akte();
  intro(a).sql = 'SELECT Gibtsnicht\nFROM Sorte';
  await erwarteFehler(a, /zeitlupe.*(nicht ausführbar|Gibtsnicht)/);
  const b = akte();
  intro(b).sql = 'SELECT Sorte.Name\nFROM Sorte JOIN Verkauf ON Sorte.SorteNr = Verkauf.SorteNr';
  await erwarteFehler(b, /zeitlupe.*EH/);
  const c = akte();
  intro(c).start = 'HAVING';
  intro(c).sql = 'SELECT Name\nFROM Sorte\nWHERE Preis > 1';
  await erwarteFehler(c, /start.*HAVING/);
  const d = akte();
  intro(d).start = 'JOIN';
  await erwarteFehler(d, /start/);
  const e = akte();
  delete intro(e).sql;
  await erwarteFehler(e, /sql/);
});

test('Blöcke der Verstehenshilfen: nur öffentliche Akten-DBs, nie im Verhör', async () => {
  const a = akte();
  blockVon(a.levels.find((l) => l.id === 'A9-E2').intro, 'zeitlupe').datenbank = 'verhoer/kiosk';
  await erwarteFehler(a, /öffentlich/);
  const b = akte();
  blockVon(aufgabe(b, 'A9-E2-01').inhalt, 'spurenbrett').datenbank = 'gibtsnicht';
  await erwarteFehler(b, /öffentlich/, 'A9-E2-01');
  const c = akte();
  aufgabe(c, 'A9-V-01').inhalt.push({ t: 'sortierfaecher', datenbank: 'eisdiele', sql: 'SELECT Vegan, COUNT(*) AS Sorten\nFROM Sorte\nGROUP BY Vegan' });
  await erwarteFehler(c, /Verhör/, 'A9-V-01');
  const d = akte();
  aufgabe(d, 'A9-V-02').erklaerung.push({ t: 'zeitlupe', datenbank: 'eisdiele', sql: 'SELECT Name\nFROM Sorte' });
  await erwarteFehler(d, /Verhör/, 'A9-V-02');
});

test('Block-SQL darf nicht die Musterlösung einer sql-Aufgabe derselben Akte sein (normalisiert)', async () => {
  const j = akte();
  const muster = aufgabe(j, 'A9-E2-01').loesung.sql;
  // andere Leerzeichen, Groß/Klein, Semikolon – trotzdem dieselbe Abfrage
  blockVon(j.levels.find((l) => l.id === 'A9-E2').intro, 'zeitlupe').sql = muster.replace(/\n/g, '\n  ').toLowerCase().replace('as kugeln', 'AS Kugeln') + ';';
  await erwarteFehler(j, /Musterlösung.*A9-E2-01/);
  const k = akte();
  blockVon(aufgabe(k, 'A9-E2-02').erklaerung, 'sortierfaecher').sql = aufgabe(k, 'A9-E2-01').loesung.sql;
  await erwarteFehler(k, /Musterlösung/, 'A9-E2-02');
});

test('Block sortierfaecher: Abfrage braucht GROUP BY oder eine Aggregatfunktion und muss laufen', async () => {
  const a = akte();
  blockVon(aufgabe(a, 'A9-E2-02').erklaerung, 'sortierfaecher').sql = 'SELECT Name\nFROM Sorte';
  await erwarteFehler(a, /GROUP BY/, 'A9-E2-02');
  const b = akte();
  blockVon(aufgabe(b, 'A9-E2-02').erklaerung, 'sortierfaecher').sql = 'SELECT Vegan, COUNT(*) AS Sorten\nFROM Eis\nGROUP BY Vegan';
  await erwarteFehler(b, /sortierfaecher/, 'A9-E2-02');
});

test('Block spurenbrett: 2–3 Tabellen, zeilen (Primärschlüssel) vorhanden oder limit 1–50, Bedingung gültig', async () => {
  const sb = (j) => blockVon(aufgabe(j, 'A9-E2-01').inhalt, 'spurenbrett');
  const a = akte();
  sb(a).tabellen = [{ name: 'Sorte' }];
  await erwarteFehler(a, /zwei oder drei Tabellen/, 'A9-E2-01');
  const b = akte();
  sb(b).tabellen[0].name = 'Eis';
  await erwarteFehler(b, /Eis/, 'A9-E2-01');
  const c = akte();
  sb(c).tabellen[1] = { name: 'Verkauf', zeilen: [1, 2, 999999] };
  await erwarteFehler(c, /999999|zeilen/, 'A9-E2-01');
  const d = akte();
  sb(d).tabellen[0] = { name: 'Sorte', limit: 80 };
  await erwarteFehler(d, /limit/, 'A9-E2-01');
  const e = akte();
  sb(e).tabellen[0] = { name: 'Sorte', limit: 3, zeilen: [1] };
  await erwarteFehler(e, /zeilen.*limit|limit.*zeilen/, 'A9-E2-01');
  const f = akte();
  sb(f).bedingung = 'Sorte.SorteNr = Kunde.SorteNr';
  await erwarteFehler(f, /spurenbrett/, 'A9-E2-01');
});

/* ---------- Warm-up-Karten ---------- */

function warmup() {
  return JSON.parse(WARMUP_TEXT);
}
async function erwarteWarmupFehler(json, muster) {
  const r = await validiereAkten([{ name: 'warmup_a9.json', json }], umgebung);
  assert.ok(r.fehler.some((f) => muster.test(f.text)), `kein Fehler ${muster} – gefunden: ${JSON.stringify(r.fehler, null, 1)}`);
}

test('Warm-up: Format, ids, loesungSql läuft auf der DB und ist EH-konform', async () => {
  const a = warmup();
  a.karten[0].id = 'W-1-01';
  await erwarteWarmupFehler(a, /Format/);
  const b = warmup();
  b.karten[1].id = b.karten[0].id;
  await erwarteWarmupFehler(b, /doppelt/);
  const c = warmup();
  c.karten[1].loesungSql = 'SELECT Bezeichnung\nFROM Fundsache\nWHERE Gewicht IS NULL';
  await erwarteWarmupFehler(c, /loesungSql/);
  const d = warmup();
  c.karten[1].loesungSql = 'SELECT f.Bezeichnung\nFROM Fundsache f JOIN Station s ON f.StationNr = s.StationNr';
  await erwarteWarmupFehler(c, /JOIN/);
  delete d.karten[1].datenbank;
  await erwarteWarmupFehler(d, /datenbank/);
  const e = warmup();
  e.karten[1].datenbank = 'verhoer/kiosk';
  await erwarteWarmupFehler(e, /öffentlich/);
  const f = warmup();
  f.karten[0].kategorie = 'Allgemeines';
  f.karten[0].minuten = 0;
  await erwarteWarmupFehler(f, /kategorie/);
  await erwarteWarmupFehler(f, /minuten/);
  const g = warmup();
  g.karten[0].kompetenz = ['K99'];
  g.karten[0].falle = ['P11'];
  await erwarteWarmupFehler(g, /kompetenz/);
  await erwarteWarmupFehler(g, /falle/);
  const h = warmup();
  h.karten[0].akte = 3;
  await erwarteWarmupFehler(h, /akte/);
});

/* ---------- scripts/validate.js ---------- */

function skript(args, cwd = WURZEL) {
  return childProcess.spawnSync(process.execPath, [path.join(WURZEL, 'scripts', 'validate.js'), ...args], {
    cwd,
    encoding: 'utf8',
    timeout: 60000
  });
}

test('scripts/validate.js: Beispielakte grün (Exit 0), --json maschinenlesbar', () => {
  const r = skript([path.join('test', 'fixtures', 'akte_beispiel.json'), path.join('test', 'fixtures', 'warmup_beispiel.json')]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /0 Fehler|in Ordnung/);
  const j = skript(['--json', path.join('test', 'fixtures', 'akte_beispiel.json')]);
  assert.equal(j.status, 0, j.stderr);
  const daten = JSON.parse(j.stdout);
  assert.deepEqual(daten.fehler, []);
  assert.equal(daten.aufgaben, akte().aufgaben.length);
});

test('scripts/validate.js: fehlerhafte Datei → Exit 1 mit Meldung', () => {
  const ordner = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'validate-'));
  try {
    const j = akte();
    aufgabe(j, 'A9-E1-03').interaktion.varianten = ['gleichstand'];
    const datei = path.join(ordner, 'akte9.json');
    fs.writeFileSync(datei, JSON.stringify(j));
    const r = skript([datei, '--ohne-hinweise']);
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /A9-E1-03/);
    assert.doesNotMatch(r.stdout, /Hinweis:/);
  } finally {
    fs.rmSync(ordner, { recursive: true, force: true });
  }
});

test('scripts/validate.js: ohne Argumente alle seed/akten + seed/warmup (leer → grün mit Hinweis)', () => {
  const r = skript([]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const akten = path.join(WURZEL, 'seed', 'akten');
  const vorhanden = fs.existsSync(akten) && fs.readdirSync(akten).some((d) => d.endsWith('.json'));
  if (!vorhanden) assert.match(r.stdout, /keine Akten/i);
});

test('package.json: npm-Script validate', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(WURZEL, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts.validate, 'node scripts/validate.js');
});
