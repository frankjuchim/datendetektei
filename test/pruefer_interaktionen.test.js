'use strict';
// Prüfer je Interaktion (Plan Phase 3 Task 2, docs/AUFGABENFORMAT.md §6): richtig/falsch/leer/ungültig je Art,
// Normalisierungen, Rückmeldungen ohne Lösungsdaten, Musterantwort für jede Aufgabe der Beispielakte.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const F = require('../src/content/format');
const P = require('../src/content/pruefer');

const AKTE = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'akte_beispiel.json'), 'utf8'));
const aufgabe = (id) => {
  const a = AKTE.aufgaben.find((x) => x.id === id);
  assert.ok(a, `Aufgabe ${id} fehlt in der Beispielakte`);
  return a;
};

// Stub für den SQL-Prüfer aus Phase 2: richtig, wenn die Abfrage (Leerraum zusammengefasst) der Musterlösung gleicht.
const kompakt = (s) => String(s).replace(/\s+/g, ' ').trim();
function stubSqlPruefer(aufrufe = []) {
  return async (a, sql) => {
    aufrufe.push({ aufgabe: a, sql });
    const ok = kompakt(sql) === kompakt(a.loesung.sql);
    return {
      ok,
      diagnose: ok ? [] : [{ code: 'ZU_WENIGE_ZEILEN', falle: null, text: 'Es fehlen Zeilen.', geheim: 'x' }],
      zeilen: ok ? 3 : 1
    };
  };
}
const pruefe = (a, antwort, opt = {}) => P.pruefeAntwort(a, antwort, { sqlPruefer: stubSqlPruefer(), ...opt });

async function wirftAntwortFehler(versprechen) {
  await assert.rejects(versprechen, (e) => e instanceof P.AntwortFehler && e.status === 400);
}

/* ---------------------------------------------------------------- format.js */

test('format: Lücken in allen Blockarten (auch sql, dbtabelle, schema, Teil-Fragen)', () => {
  const ids = F.alleLuecken(aufgabe('A9-E1-07')).map((l) => l.id).sort();
  assert.deepEqual(ids, ['g1', 'g2', 'g3', 'g4', 'g5']);
  const teil = F.alleLuecken(aufgabe('A9-E1-10')).map((l) => l.id).sort();
  assert.deepEqual(teil, ['g1', 'g2']);
  const db = F.luecken([
    { t: 'dbtabelle', tabelle: 'T', kopf: [{ name: 'A' }], zeilen: [['[[z1]]'], [3]] },
    { t: 'schema', relationen: [{ name: 'R', attribute: [{ name: '[[s1]]', pk: true }] }] }
  ]).map((l) => l.id);
  assert.deepEqual(db, ['z1', 's1']);
});

test('format: Block- und Interaktionslisten, Phase-5-Elemente getrennt', () => {
  for (const b of ['text', 'hinweis', 'code', 'tabelle', 'dbtabelle', 'schema', 'sql', 'datenbank']) assert.ok(F.BLOCK_TYPEN.includes(b), b);
  for (const b of ['er', 'mengen']) {
    assert.ok(!F.BLOCK_TYPEN.includes(b));
    assert.ok(F.BLOCK_TYPEN_PHASE5.includes(b));
  }
  for (const k of ['gaps', 'choice', 'order', 'lines', 'match', 'sql', 'zeilen', 'ergebnis', 'kernpunkte']) assert.ok(F.INTERAKTIONEN.includes(k), k);
  for (const k of ['zellen', 'anomalie', 'zerlegen', 'schema', 'er']) {
    assert.ok(!F.INTERAKTIONEN.includes(k));
    assert.ok(F.INTERAKTIONEN_PHASE5.includes(k));
  }
  assert.equal(F.KATEGORIEN.length, 10);
  assert.deepEqual(F.FALLEN, ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10']);
});

test('format: Normalisierung code/text/exakt und iPad-Vereinheitlichung', () => {
  assert.equal(F.normText(" WHERE  Wert >= 400 ", 'code'), 'WHEREWert>=400');
  assert.equal(F.normText('‘%Messing%’', 'code'), "'%Messing%'");
  assert.equal(F.normText('„Kompass“', 'code'), '"Kompass"');
  assert.equal(F.normText('a ≤ b ≠ c ≥ d', 'code'), 'a<=b!=c>=d');
  assert.equal(F.normText('x − 1 – 2', 'code'), 'x-1-2');
  assert.equal(F.normText('  Group   BY ', 'text'), 'group by');
  assert.equal(F.normText(' Ab  c ', 'exakt'), 'Ab  c');
  assert.equal(F.normText('‘a’', 'exakt'), '‘a’');
  assert.equal(F.alsZahl('1,5'), 1.5);
  assert.equal(F.alsZahl('1e2'), 100);
  assert.ok(Number.isNaN(F.alsZahl('zwölf')));
});

test('format: Mini-Markdown-Prüfung', () => {
  assert.deepEqual(F.pruefeMarkdown('**fett**, *kursiv*, `COUNT(*)` und\n- Liste'), []);
  assert.equal(F.pruefeMarkdown('**fett').length, 1);
  assert.equal(F.pruefeMarkdown('`code').length, 1);
  assert.equal(F.pruefeMarkdown('PK <u>FundNr</u>').length, 1);
  assert.deepEqual(F.pruefeMarkdown('Preis < 5 und Wert > 3'), []);
});

test('format: Zellen normalisieren wie der SQL-Prüfer', () => {
  const n = F.normZelle;
  assert.equal(n(''), n(null));
  assert.equal(n('null'), n(null));
  assert.equal(n(' NULL '), n(undefined));
  assert.equal(n('450'), n(450));
  assert.equal(n('450,0'), n(450));
  assert.equal(n(0.1 + 0.2), n('0.3'));
  assert.notEqual(n(1.5), n(1.6));
  assert.equal(n('  Messing-Kompass '), n('Messing-Kompass'));
  assert.equal(n("'Kamera'"), n('Kamera'));
  assert.equal(n('Sanddorn  Mango'), n('Sanddorn Mango'));
  assert.notEqual(n('kamera'), n('Kamera'));
  assert.notEqual(n('NULL'), n('Null-Text'));
});

/* ---------------------------------------------------------------- gaps */

test('gaps: richtig mit Varianten der Schreibweise', async () => {
  const a = aufgabe('A9-E1-07');
  const r = await pruefe(a, { g1: '‘%Messing%’', g2: '>=', g3: ' not ', g4: '1,0', g5: '_' });
  assert.equal(r.ok, true);
  assert.equal(r.leer, false);
  assert.deepEqual(r.rueckmeldung, { felder: { g1: true, g2: true, g3: true, g4: true, g5: true } });
});

test('gaps: falsch je Feld, Groß/Klein bei code, exakt ohne Vereinheitlichung', async () => {
  const a = aufgabe('A9-E1-07');
  const r = await pruefe(a, { g1: "'%messing%'", g2: '>', g3: 'NOT', g4: '2', g5: ' _ ' });
  assert.equal(r.ok, false);
  assert.deepEqual(r.rueckmeldung.felder, { g1: false, g2: false, g3: true, g4: false, g5: true });
  const auswahl = await pruefe(a, { g1: "'%Messing%'", g2: '≥', g3: 'NOT', g4: '1', g5: '_' });
  assert.equal(auswahl.rueckmeldung.felder.g2, false, 'auswahl vergleicht exakt');
});

test('gaps: leer und ungültig', async () => {
  const a = aufgabe('A9-E1-07');
  const r = await pruefe(a, { g1: '  ', g2: '' });
  assert.equal(r.leer, true);
  assert.equal(r.ok, false);
  assert.equal((await pruefe(a, undefined)).leer, true);
  await wirftAntwortFehler(pruefe(a, { g1: { x: 1 } }));
  await wirftAntwortFehler(pruefe(a, { g1: 'x'.repeat(501) }));
});

test('gaps: zahl mit Textlösung fällt auf Textvergleich zurück', async () => {
  const a = {
    id: 'T-1', interaktion: { kind: 'gaps', felder: { g1: { typ: 'zahl' } } }, loesung: { g1: ['n'] }, inhalt: []
  };
  assert.equal((await pruefe(a, { g1: 'n' })).ok, true);
  assert.equal((await pruefe(a, { g1: 'm' })).ok, false);
  const einzeln = { ...a, loesung: { g1: '7' } };
  assert.equal((await pruefe(einzeln, { g1: '7.0' })).ok, true, 'Einzelwert statt Liste wird akzeptiert');
});

/* ---------------------------------------------------------------- choice */

test('choice: Menge exakt, leer, ungültig', async () => {
  const a = aufgabe('A9-E1-12');
  assert.equal((await pruefe(a, ['c', 'a'])).ok, true);
  assert.equal((await pruefe(a, { gewaehlt: ['a', 'c', 'a'] })).ok, true);
  assert.equal((await pruefe(a, ['a'])).ok, false);
  assert.equal((await pruefe(a, ['a', 'c', 'd'])).ok, false);
  const leer = await pruefe(a, []);
  assert.equal(leer.leer, true);
  assert.equal(leer.ok, false);
  await wirftAntwortFehler(pruefe(a, 'a'));
  await wirftAntwortFehler(pruefe(a, [{ id: 'a' }]));
});

/* ---------------------------------------------------------------- order */

test('order: richtig, ersteFalschePosition, Distraktor, Schrittprüfung', async () => {
  const a = aufgabe('A9-E1-04');
  const r = await pruefe(a, ['a', 'b', 'c', 'd']);
  assert.equal(r.ok, true);
  assert.equal(r.rueckmeldung.ersteFalschePosition, null);
  const f = await pruefe(a, ['a', 'b', 'x', 'd']);
  assert.equal(f.ok, false);
  assert.equal(f.rueckmeldung.ersteFalschePosition, 2);
  assert.equal((await pruefe(a, ['a', 'b', 'c'])).ok, false);
  assert.equal((await pruefe(a, [])).leer, true);
  const schritt = await pruefe(a, ['a', 'b'], { teilweise: true });
  assert.deepEqual(
    { ok: schritt.ok, voll: schritt.rueckmeldung.vollstaendig, pos: schritt.rueckmeldung.ersteFalschePosition },
    { ok: true, voll: false, pos: null }
  );
  const schrittFalsch = await pruefe(a, ['b'], { teilweise: true });
  assert.equal(schrittFalsch.ok, false);
  assert.equal(schrittFalsch.rueckmeldung.ersteFalschePosition, 0);
  await wirftAntwortFehler(pruefe(a, { reihenfolge: 'abcd' }));
});

test('Schrittprüfung nur für order und Bug-Hunt-Teil a)', async () => {
  await wirftAntwortFehler(pruefe(aufgabe('A9-E1-12'), ['a'], { teilweise: true }));
  await wirftAntwortFehler(pruefe(aufgabe('A9-E1-02'), 'SELECT 1', { teilweise: true }));
});

/* ---------------------------------------------------------------- lines */

test('lines: Menge 1-basiert, leer, ungültig', async () => {
  const a = aufgabe('A9-E1-08');
  assert.equal((await pruefe(a, [5, 3, 4])).ok, true);
  assert.equal((await pruefe(a, { zeilen: ['3', '4', '5'] })).ok, true);
  assert.equal((await pruefe(a, [3, 4])).ok, false);
  assert.equal((await pruefe(a, [])).leer, true);
  await wirftAntwortFehler(pruefe(a, [1.5]));
  await wirftAntwortFehler(pruefe(a, ['drei']));
});

/* ---------------------------------------------------------------- match */

test('match: je Element, leer', async () => {
  const a = aufgabe('A9-E1-09');
  const r = await pruefe(a, { e1: 'f', e2: 's', e3: 'p', e4: 'd' });
  assert.equal(r.ok, true);
  const f = await pruefe(a, { e1: 'f', e2: 'p', e3: 's' });
  assert.equal(f.ok, false);
  assert.deepEqual(f.rueckmeldung.elemente, { e1: true, e2: false, e3: false, e4: false });
  assert.equal((await pruefe(a, {})).leer, true);
  await wirftAntwortFehler(pruefe(a, { e1: ['f'] }));
});

/* ---------------------------------------------------------------- mehrteilig */

test('mehrteilig: alle Teile richtig, Rückmeldung je Teil, Bug-Hunt Teil a) einzeln', async () => {
  const a = aufgabe('A9-E1-10');
  const r = await pruefe(a, [[3], { g1: '(', g2: ')' }]);
  assert.equal(r.ok, true);
  assert.equal(r.rueckmeldung.teile.length, 2);
  const halb = await pruefe(a, [[3], { g1: '(', g2: '' }]);
  assert.equal(halb.ok, false);
  assert.deepEqual(halb.rueckmeldung.teile[1].felder, { g1: true, g2: false });
  assert.equal((await pruefe(a, [[], {}])).leer, true);
  assert.equal((await pruefe(a, [3], { teilweise: true, teil: 0 })).ok, true);
  assert.equal((await pruefe(a, [4], { teilweise: true, teil: 0 })).ok, false);
  await wirftAntwortFehler(pruefe(a, [3], { teilweise: true, teil: 1 }));
  await wirftAntwortFehler(pruefe(a, [3], { teilweise: true, teil: 7 }));
  await wirftAntwortFehler(pruefe(a, { g1: '(' }));
  await wirftAntwortFehler(pruefe(a, [[3], {}, {}]));
});

/* ---------------------------------------------------------------- zeilen */

test('zeilen: Menge 0-basiert, Indizes im Bereich, mehrfach false', async () => {
  const a = aufgabe('A9-E1-05');
  assert.equal((await pruefe(a, [7, 6])).ok, true);
  assert.equal((await pruefe(a, { zeilen: [6, 7, 6] })).ok, true);
  assert.equal((await pruefe(a, [6])).ok, false, 'Schmuck für 25 € fehlt (AND vor OR)');
  assert.equal((await pruefe(a, [0, 6, 7])).ok, false);
  const leer = await pruefe(a, []);
  assert.equal(leer.leer, true);
  await wirftAntwortFehler(pruefe(a, [8]));
  await wirftAntwortFehler(pruefe(a, [-1]));
  await wirftAntwortFehler(pruefe(a, ['x']));

  const einzeln = { ...a, interaktion: { ...a.interaktion, mehrfach: false }, loesung: { zeilen: [6] } };
  assert.equal((await pruefe(einzeln, [6])).ok, true);
  assert.equal((await pruefe(einzeln, [6, 7])).ok, false);

  const keine = { ...a, loesung: { zeilen: [] } };
  const r = await pruefe(keine, []);
  assert.equal(r.ok, true, 'leere Lösungsmenge: leere Antwort ist richtig');
  assert.equal(r.leer, false);
});

/* ---------------------------------------------------------------- ergebnis */

test('ergebnis mit Reihenfolge: Liste, Zellen normalisiert', async () => {
  const a = aufgabe('A9-E1-06');
  const r = await pruefe(a, [['Messing-Kompass', '450'], [" 'Kamera' ", '390,0'], ['Fernglas', 180]]);
  assert.equal(r.ok, true);
  assert.deepEqual(r.rueckmeldung, { zeilenzahl: 'passt', nurReihenfolge: false });
  const vertauscht = await pruefe(a, { zeilen: [['Kamera', '390'], ['Messing-Kompass', '450'], ['Fernglas', '180']] });
  assert.equal(vertauscht.ok, false);
  assert.equal(vertauscht.rueckmeldung.nurReihenfolge, true);
  const falsch = await pruefe(a, [['Messing-Kompass', '450'], ['Kamera', '391'], ['Fernglas', '180']]);
  assert.equal(falsch.ok, false);
  assert.equal(falsch.rueckmeldung.nurReihenfolge, false);
  const kurz = await pruefe(a, [['Messing-Kompass', '450'], ['Kamera', '390']]);
  assert.equal(kurz.ok, false, 'fehlende Zeilen gelten als leer');
  assert.equal((await pruefe(a, [['', ''], ['', ''], ['', '']])).leer, true);
  assert.equal((await pruefe(a, [])).leer, true);
  await wirftAntwortFehler(pruefe(a, [['a', 'b'], ['a', 'b'], ['a', 'b'], ['a', 'b']]));
  await wirftAntwortFehler(pruefe(a, [['nur eine Zelle']]));
  await wirftAntwortFehler(pruefe(a, [['a', { x: 1 }]]));
  await wirftAntwortFehler(pruefe(a, 'Messing-Kompass'));
});

test('ergebnis mit freien Zeilen: Multimenge, Zeilenzahl-Rückmeldung, leere Zeilen ignoriert', async () => {
  const a = aufgabe('A9-E2-02');
  const r = await pruefe(a, [['Zitrone'], [''], ['Sanddorn-Mango'], ['Erdbeere']]);
  assert.equal(r.ok, true);
  const zuViele = await pruefe(a, [['Zitrone'], ['Sanddorn-Mango'], ['Erdbeere'], ['Vanille']]);
  assert.equal(zuViele.ok, false);
  assert.equal(zuViele.rueckmeldung.zeilenzahl, 'zu_viele');
  const zuWenige = await pruefe(a, [['Zitrone']]);
  assert.equal(zuWenige.rueckmeldung.zeilenzahl, 'zu_wenige');
  const doppelt = await pruefe(a, [['Zitrone'], ['Zitrone'], ['Erdbeere']]);
  assert.equal(doppelt.ok, false, 'Multimenge: Duplikate zählen');
  assert.equal(doppelt.rueckmeldung.zeilenzahl, 'passt');
  assert.equal((await pruefe(a, [[''], ['  ']])).leer, true);
});

test('ergebnis: NULL-Zellen', async () => {
  const a = {
    id: 'T-2', inhalt: [],
    interaktion: { kind: 'ergebnis', kopf: ['Bezeichnung', 'Wert'], freieZeilen: true },
    loesung: { zeilen: [['Messingschlüssel', null], ['Messingglocke', 12]] }
  };
  assert.equal((await pruefe(a, [['Messingglocke', '12'], ['Messingschlüssel', 'NULL']])).ok, true);
  assert.equal((await pruefe(a, [['Messingglocke', '12'], ['Messingschlüssel', '']])).ok, true);
  assert.equal((await pruefe(a, [['Messingglocke', '12'], ['Messingschlüssel', '0']])).ok, false);
});

/* ---------------------------------------------------------------- kernpunkte */

test('kernpunkte: immer bearbeitet, nur Anzahl, kein Freitext', async () => {
  const a = aufgabe('A9-E1-11');
  const r = await pruefe(a, 2);
  assert.equal(r.ok, true);
  assert.equal(r.leer, false);
  assert.deepEqual(r.rueckmeldung, { bearbeitet: true, haken: 2 });
  assert.deepEqual((await pruefe(a, { haken: 0 })).rueckmeldung, { bearbeitet: true, haken: 0 });
  await wirftAntwortFehler(pruefe(a, 'Die Abfrage liefert offene Fundsachen.'));
  await wirftAntwortFehler(pruefe(a, { haken: 1, text: 'Freitext' }));
  await wirftAntwortFehler(pruefe(a, 4));
  await wirftAntwortFehler(pruefe(a, -1));
  await wirftAntwortFehler(pruefe(a, 1.5));
});

test('kernpunkte in mehrteiligen Aufgaben: zählt nicht als Antwort (leer), ok hängt nur an den übrigen Teilen', async () => {
  const a = {
    id: 'X-01',
    interaktion: [
      { kind: 'gaps', frage: 'a) [[g1]]', felder: { g1: { typ: 'zahl' } } },
      { kind: 'kernpunkte', frage: 'b) Begründe.', kernpunkte: ['eins', 'zwei'] }
    ],
    loesung: [{ g1: ['8'] }, null]
  };
  let r = await pruefe(a, [{ g1: '' }, 0]);
  assert.equal(r.leer, true, 'nur ein kernpunkte-Teil ohne übrige Antwort ist leer');
  r = await pruefe(a, [{ g1: '' }, 2]);
  assert.equal(r.leer, true, 'Häkchen allein sind keine Antwort');
  r = await pruefe(a, [{ g1: '8' }, 0]);
  assert.equal(r.leer, false);
  assert.equal(r.ok, true);
  assert.deepEqual(r.rueckmeldung.teile[1], { bearbeitet: true, haken: 0 });
  r = await pruefe(a, [{ g1: '7' }, 2]);
  assert.equal(r.ok, false);
  await wirftAntwortFehler(pruefe(a, [{ g1: '8' }, 'Mein Freitext']));
});

/* ---------------------------------------------------------------- sql */

test('sql: delegiert an den injizierten Prüfer mit Aufgabe nach Phase-2-Schnittstelle', async () => {
  const a = aufgabe('A9-E1-02');
  const aufrufe = [];
  const r = await P.pruefeAntwort(a, { sql: a.loesung.sql }, { sqlPruefer: stubSqlPruefer(aufrufe) });
  assert.equal(r.ok, true);
  assert.deepEqual(r.rueckmeldung, { diagnose: [], zeilen: 3 });
  assert.equal(aufrufe.length, 1);
  assert.deepEqual(aufrufe[0].aufgabe, {
    datenbank: 'fundbuero',
    varianten: ['grenze', 'gleichstand'],
    sortierung: [{ spalte: 'Wert', richtung: 'DESC' }],
    aliasPflicht: false,
    abimodus: 'hinweis',
    loesung: { sql: a.loesung.sql }
  });
});

test('sql: Standardwerte, Abimodus-Vorgabe (Verhör), Diagnose ohne Zusatzfelder', async () => {
  const cc = aufgabe('A9-E1-CC');
  const aufrufe = [];
  const r = await P.pruefeAntwort(cc, 'SELECT * FROM Fundsache', { sqlPruefer: stubSqlPruefer(aufrufe), abimodus: 'streng' });
  assert.equal(r.ok, false);
  assert.deepEqual(r.rueckmeldung, { diagnose: [{ code: 'ZU_WENIGE_ZEILEN', falle: null, text: 'Es fehlen Zeilen.' }], zeilen: 1 });
  assert.deepEqual(aufrufe[0].aufgabe.sortierung, []);
  assert.equal(aufrufe[0].aufgabe.aliasPflicht, false);
  assert.equal(aufrufe[0].aufgabe.abimodus, 'streng');
  assert.deepEqual(aufrufe[0].aufgabe.varianten, ['null']);
});

test('sql: leer ruft den Prüfer nicht auf, ungültig, fehlender Prüfer', async () => {
  const a = aufgabe('A9-E1-02');
  const aufrufe = [];
  const r = await P.pruefeAntwort(a, '   \n ', { sqlPruefer: stubSqlPruefer(aufrufe) });
  assert.equal(r.leer, true);
  assert.equal(r.ok, false);
  assert.equal(aufrufe.length, 0);
  await wirftAntwortFehler(pruefe(a, 'S'.repeat(4001)));
  await wirftAntwortFehler(pruefe(a, ['SELECT 1']));
  await assert.rejects(P.pruefeAntwort(a, 'SELECT 1', {}), (e) => !(e instanceof P.AntwortFehler));
});

/* ---------------------------------------------------------------- allgemein */

test('unbekannte Interaktion und Phase-5-Interaktion werden abgelehnt', async () => {
  await wirftAntwortFehler(pruefe({ id: 'T', inhalt: [], interaktion: { kind: 'zellen' }, loesung: {} }, []));
  await wirftAntwortFehler(pruefe({ id: 'T', inhalt: [], interaktion: { kind: 'tree' }, loesung: {} }, []));
});

test('Musterantwort ist für jede Aufgabe der Beispielakte richtig (sql mit Stub)', async () => {
  const kinds = new Set();
  for (const a of AKTE.aufgaben) {
    for (const t of F.teile(a)) kinds.add(t.interaktion.kind);
    const m = P.musterantwort(a);
    const r = await pruefe(a, JSON.parse(JSON.stringify(m)));
    assert.equal(r.ok, true, `${a.id}: Musterantwort ${JSON.stringify(m)} nicht richtig`);
    assert.equal(r.leer, false, `${a.id}: Musterantwort gilt als leer`);
  }
  for (const k of F.INTERAKTIONEN) assert.ok(kinds.has(k), `Beispielakte ohne Interaktion ${k}`);
});

// Alle Lösungswerte einer Aufgabe (Texte ab 3 Zeichen, Zahlen ab 2 Stellen) – dürfen in keiner Rückmeldung stehen.
function loesungsWerte(a) {
  const werte = [];
  const sammle = (v) => {
    if (v === null || v === undefined) return;
    if (Array.isArray(v)) return v.forEach(sammle);
    if (typeof v === 'object') return Object.values(v).forEach(sammle);
    const s = String(v);
    if (s.length >= 3 || (typeof v === 'number' && s.length >= 2)) werte.push(s);
  };
  sammle(a.loesung);
  for (const t of F.teile(a)) if (t.interaktion.kind === 'kernpunkte') sammle(t.interaktion.kernpunkte);
  return werte;
}

// Eine plausible, aber falsche Antwort je Teil.
function falscheAntwort(ia) {
  switch (ia.kind) {
    case 'gaps': return Object.fromEntries(Object.keys(ia.felder).map((k) => [k, 'x']));
    case 'choice': return [ia.optionen[0].id === 'a' ? 'b' : 'a'];
    case 'order': return ia.teile.map((t) => t.id).reverse();
    case 'lines': return [1];
    case 'match': return Object.fromEntries(ia.elemente.map((e) => [e.id, 'falsch']));
    case 'sql': return 'SELECT * FROM Fundsache';
    case 'zeilen': return [0];
    case 'ergebnis': return [ia.kopf.map(() => 'falsch')];
    case 'kernpunkte': return 1;
    default: throw new Error(ia.kind);
  }
}

test('Rückmeldungen enthalten keine Lösungsdaten (falsche und richtige Antworten)', async () => {
  for (const a of AKTE.aufgaben) {
    const ts = F.teile(a);
    const falsch = Array.isArray(a.interaktion) ? ts.map((t) => falscheAntwort(t.interaktion)) : falscheAntwort(a.interaktion);
    for (const antwort of [falsch, P.musterantwort(a)]) {
      const r = await pruefe(a, antwort);
      const json = JSON.stringify(r.rueckmeldung);
      for (const w of loesungsWerte(a)) {
        assert.ok(!json.includes(w), `${a.id}: Rückmeldung ${json} enthält Lösungswert ${w}`);
      }
    }
  }
});

test('antwortKurz kürzt lange Antworten', () => {
  assert.equal(P.antwortKurz(['abc']), '"abc"');
  assert.ok(P.antwortKurz(['x'.repeat(400)]).length <= 300);
});
