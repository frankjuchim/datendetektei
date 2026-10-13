'use strict';
// Trainingsplatz T8 „Falle erkennen“ (Plan Phase 6 Task 10, Spec §5 und §7.8): eine fehlerhafte Abfrage mit genau einer
// typischen Falle (P1–P7) zu einer Frage im Sachzusammenhang; choice mit vier P-Optionen. Die fehlerhafte Abfrage wird
// mit dem EH-§8-Parser (src/sql/parser.js) und den Regelprüfungen (src/sql/regeln.js) nachgeprüft, die Korrektur
// zusätzlich in SQLite gegen das gezeigte Schema.
const test = require('node:test');
const assert = require('node:assert/strict');
const Database = require('better-sqlite3');

const G = require('../src/content/generatoren');
const F = require('../src/content/format');
const P = require('../src/sql/parser');
const R = require('../src/sql/regeln');
const { FALLEN } = require('../src/domain');
const { pruefeAntwort, musterantwort } = require('../src/content/pruefer');
const H = require('./hilfen_lernen');

const SEEDS = Array.from({ length: 400 }, (_, i) => (i * 2654435761 + 7) >>> 0);
const P1_P7 = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'];
const TITEL = new Map(FALLEN.map((f) => [f.nr, f.titel]));
/** Fachlich verwechselbare Ablenker je Variante (Spec §5). */
const OHNE = { 'P1-having-zeile': ['P3'], 'P4-count-spalte': ['P5'], 'P6-like': ['P5'], 'P7-alias': ['P2'], 'P7-fk-name': ['P2'] };

const sqlBloecke = (bloecke) => bloecke.filter((b) => b.t === 'sql').map((b) => b.sql);
const richtigeMd = (a) => a.interaktion.optionen.find((o) => o.id === a.loesung.richtig[0]).md;

/** Regelbefunde einer Abfrage gegen das Schema der Aufgabe. */
function befunde(sql, schema) {
  const r = P.parse(sql);
  assert.deepEqual(r.fehler, [], `Parsefehler in:\n${sql}`);
  return R.pruefeRegeln(r.ast, { schema, abimodus: 'streng' });
}

/** Leere Tabellen nach dem Schema der Aufgabe anlegen; Abfrage vorbereiten (prüft Tabellen- und Spaltennamen). */
function laeuft(sql, schema) {
  const db = new Database(':memory:');
  try {
    for (const t of schema) db.exec(`CREATE TABLE ${t.tabelle} (${t.spalten.map((s) => s.name).join(', ')})`);
    db.prepare(sql).all();
    return true;
  } catch {
    return false;
  } finally {
    db.close();
  }
}

/** Alle Mini-Markdown-Texte einer Aufgabe. */
function texte(a) {
  const out = [a.interaktion.frage, ...a.interaktion.optionen.map((o) => o.md)];
  for (const b of [...a.inhalt, ...a.erklaerung]) if (typeof b.md === 'string') out.push(b.md);
  return out;
}

test('T8 steht in der Generatorliste (alle Niveaus)', () => {
  const g = G.GENERATOREN.find((x) => x.typ === 'T8');
  assert.ok(g, 'T8 fehlt');
  assert.equal(g.niveau, 'alle');
  assert.ok(g.titel && g.beschreibung);
  assert.ok(G.istTyp('T8'));
});

test('T8: choice mit vier P-Optionen, genau eine richtig; Prüfer akzeptiert nur sie; Format sauber', async () => {
  for (const seed of SEEDS) {
    const a = G.erzeuge('T8', seed);
    const wo = `T8/${seed}`;
    const ia = a.interaktion;
    assert.equal(ia.kind, 'choice', wo);
    assert.equal(ia.mehrfach, false, wo);
    assert.equal(a.punkte, 1, wo);
    assert.equal(ia.optionen.length, 4, wo);
    const nummern = ia.optionen.map((o) => /^(P\d+) · (.+)$/.exec(o.md));
    assert.ok(nummern.every(Boolean), `${wo}: Optionen „Pn · Titel“`);
    for (const [, nr, titel] of nummern) {
      assert.ok(P1_P7.includes(nr), `${wo}: ${nr}`);
      assert.equal(titel, TITEL.get(nr), wo);
    }
    assert.equal(new Set(nummern.map((m) => m[1])).size, 4, `${wo}: Fallen verschieden`);
    // verwechselbare Fallen nie als Ablenker (z. B. COUNT(spalte) bei NULL ist P4, nicht P5)
    for (const p of [...a.pruefung.ohne, ...(OHNE[a.pruefung.variante] || [])]) assert.ok(!nummern.some((m) => m[1] === p), `${wo}: Ablenker ${p}`);
    assert.equal(a.loesung.richtig.length, 1, wo);
    assert.equal(a.falle.length, 1, wo);
    assert.ok(richtigeMd(a).startsWith(`${a.falle[0]} · `), `${wo}: richtige Option = Falle der Abfrage`);
    assert.equal((await pruefeAntwort(a, musterantwort(a))).ok, true, wo);
    for (const o of ia.optionen.filter((x) => x.id !== a.loesung.richtig[0])) {
      assert.equal((await pruefeAntwort(a, [o.id])).ok, false, `${wo}: ${o.md}`);
    }
    assert.equal(a.kategorie, 'Abfrage analysieren', wo);
    assert.ok(F.KATEGORIEN.includes(a.kategorie), wo);
    assert.ok(a.kompetenz.includes('DB-K31'), wo);
    assert.ok(a.kompetenz.every((k) => /^DB-K(0[1-9]|[1-3]\d|4[0-8])$/.test(k)), wo);
    for (const b of [...a.inhalt, ...a.erklaerung]) assert.ok(F.BLOCK_TYPEN.includes(b.t), `${wo}: Block ${b.t}`);
    for (const t of texte(a)) assert.deepEqual(F.pruefeMarkdown(t), [], `${wo}: ${t}`);
    // Aufgabe: Sachzusammenhang, Schema (Kurzschreibweise), Frage, genau eine Abfrage
    assert.ok(a.inhalt.some((b) => b.t === 'schema'), `${wo}: Schema`);
    assert.equal(sqlBloecke(a.inhalt).length, 1, `${wo}: genau eine Abfrage`);
    assert.ok(a.inhalt.some((b) => b.t === 'text' && /^\*\*Frage:\*\* /.test(b.md)), `${wo}: Frage im Sachzusammenhang`);
  }
});

test('T8: fehlerhafte Abfrage parsebar, Regeln melden nur die eigene Falle; Korrektur regelkonform und lauffähig', () => {
  let erkannt = 0;
  for (const seed of SEEDS) {
    const a = G.erzeuge('T8', seed);
    const wo = `T8/${seed}`;
    const { schema, fehlerhaft, korrektur, erkennbar } = a.pruefung;
    assert.equal(sqlBloecke(a.inhalt)[0], fehlerhaft, wo);
    assert.notEqual(korrektur, fehlerhaft, wo);
    const b = befunde(fehlerhaft, schema);
    for (const d of b) assert.equal(d.falle, a.falle[0], `${wo}: fremder Befund ${d.code}\n${fehlerhaft}`);
    if (erkennbar) {
      assert.ok(b.some((d) => d.falle === a.falle[0]), `${wo}: Regel erkennt ${a.falle[0]} nicht\n${fehlerhaft}`);
      erkannt++;
    }
    assert.deepEqual(befunde(korrektur, schema), [], `${wo}: Korrektur mit Befund\n${korrektur}`);
    assert.ok(laeuft(korrektur, schema), `${wo}: Korrektur läuft nicht\n${korrektur}`);
    // Erklärung nennt die Falle und zeigt die Korrektur
    assert.deepEqual(sqlBloecke(a.erklaerung), [korrektur], wo);
    const erkl = a.erklaerung.filter((x) => x.t === 'text').map((x) => x.md).join(' ');
    assert.ok(erkl.includes(a.falle[0]) && erkl.includes(TITEL.get(a.falle[0])), `${wo}: Erklärung nennt die Falle`);
    assert.match(erkl, /Korrektur|richtig/i, wo);
  }
  assert.ok(erkannt >= SEEDS.length / 3, `nur ${erkannt} Aufgaben regelbasiert nachgeprüft`);
});

test('T8: Abi-Stil – Schlüsselwörter groß, je Klausel eine Zeile, Verbund implizit, Tabellenalias ohne AS', () => {
  for (const seed of SEEDS.slice(0, 150)) {
    const a = G.erzeuge('T8', seed);
    for (const sql of [a.pruefung.fehlerhaft, a.pruefung.korrektur]) {
      const zeilen = sql.split('\n');
      assert.match(zeilen[0], /^SELECT /, sql);
      for (const z of zeilen) assert.match(z, /^(SELECT|FROM|WHERE|GROUP BY|HAVING|ORDER BY) /, sql);
      assert.ok(!/\bJOIN\b|\bON\b|<>/.test(sql), sql);
      assert.ok(!/FROM .*\bAS\b/.test(sql), sql);
      for (const w of ['select ', 'from ', 'where ', 'group by', 'having ', ' and ', ' or ']) assert.ok(!sql.includes(w), `${w} klein: ${sql}`);
    }
  }
});

test('T8: deterministisch, vielfältig (alle Fallen P1–P7, alle Varianten), Lösung nicht an der Id erkennbar', () => {
  const fallen = new Set();
  const varianten = new Set();
  const ids = new Set();
  const oeffentlich = new Set();
  const kontexte = new Set();
  for (const seed of SEEDS) {
    const a = G.erzeuge('T8', seed);
    assert.deepEqual(G.erzeuge('T8', seed), a);
    fallen.add(a.falle[0]);
    varianten.add(a.pruefung.variante);
    ids.add(a.loesung.richtig[0]);
    oeffentlich.add(JSON.stringify(G.oeffentlich(a)));
    kontexte.add(a.pruefung.schema.map((t) => t.tabelle).join('/'));
  }
  assert.deepEqual([...fallen].sort(), P1_P7);
  assert.ok(varianten.size >= 18, `nur ${varianten.size} Varianten: ${[...varianten]}`);
  assert.equal(ids.size, 4, 'richtige Option über a–d verteilt');
  assert.ok(oeffentlich.size >= SEEDS.length * 0.9, `${oeffentlich.size} verschiedene Aufgaben`);
  assert.ok(kontexte.size >= 4, `Kontexte: ${[...kontexte]}`);
});

test('T8: öffentliche Sicht ohne Lösung, Falle, Korrektur oder Prüfdaten', () => {
  for (const seed of SEEDS.slice(0, 120)) {
    const a = G.erzeuge('T8', seed);
    const o = G.oeffentlich(a);
    assert.deepEqual(Object.keys(o).sort(), ['inhalt', 'interaktion', 'kategorie', 'kompetenz', 'titel', 'typ']);
    const json = JSON.stringify(o);
    for (const verboten of ['loesung', 'richtig"', 'erklaerung', 'pruefung', 'korrektur', 'falle"', a.pruefung.korrektur]) {
      assert.ok(!json.includes(verboten), `T8/${seed}: ${verboten}`);
    }
    // Titel und Kompetenzen verraten die Falle nicht (für alle Aufgaben gleich)
    assert.equal(o.titel, 'Welche Falle?');
    assert.deepEqual(o.kompetenz, ['DB-K31', 'DB-K28']);
  }
});

test('T8: eigene Fantasiedaten – keine Tabellen aus Lab-, Verhör- oder Übungsdatenbanken', () => {
  const fremd = new Set(['Fundstueck', 'Fahrrad', 'Ausleihe', 'Kunde', 'Station', 'Stand', 'Verkauf', 'Mitglied', 'Person', 'Buch', 'Sorte', 'Eis']);
  for (const seed of SEEDS.slice(0, 100)) {
    for (const t of G.erzeuge('T8', seed).pruefung.schema) assert.ok(!fremd.has(t.tabelle), t.tabelle);
  }
});

/* ---------------------------------------------------------------- API */

test('API: T8 im Trainingsplatz (eA und gA), neu → öffentlich; richtig → 1 Punkt + Erklärung mit Korrektur', async () => {
  for (const niveau of ['eA', 'gA']) {
    const u = H.umgebung();
    const s = await H.client(u, H.SCHUELERIN);
    H.einstellen(u.db, 'k:17', { akten: [9], niveau });
    const T = H.K17 + '/training';
    const info = await s.get(T);
    assert.ok(info.body.generatoren.some((g) => g.typ === 'T8'), niveau);
    const n = await s.post(T + '/neu', { typ: 'T8' });
    assert.equal(n.status, 200);
    assert.deepEqual(n.body.aufgabe, G.oeffentlich(G.erzeuge('T8', n.body.seed)));
    const a = G.erzeuge('T8', n.body.seed);
    const falsch = a.interaktion.optionen.find((o) => o.id !== a.loesung.richtig[0]).id;
    const f = await s.post(T + '/pruefen', { typ: 'T8', seed: n.body.seed, signatur: n.body.signatur, antwort: [falsch] });
    assert.equal(f.status, 200);
    assert.equal(f.body.ok, false);
    assert.equal(f.body.loesung, undefined);
    const r = await s.post(T + '/pruefen', { typ: 'T8', seed: n.body.seed, signatur: n.body.signatur, antwort: musterantwort(a) });
    assert.equal(r.body.ok, true);
    assert.equal(r.body.punkteErhalten, 1);
    assert.deepEqual(sqlBloecke(r.body.erklaerung), [a.pruefung.korrektur]);
  }
});
