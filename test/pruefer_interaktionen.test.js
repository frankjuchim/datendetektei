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

test('format: Block- und Interaktionslisten (Phase 5: er, mengen, zellen, anomalie, zerlegen, schema, er)', () => {
  for (const b of ['text', 'hinweis', 'code', 'tabelle', 'dbtabelle', 'schema', 'sql', 'datenbank', 'er', 'mengen']) assert.ok(F.BLOCK_TYPEN.includes(b), b);
  for (const k of ['gaps', 'choice', 'order', 'lines', 'match', 'sql', 'zeilen', 'ergebnis', 'kernpunkte', 'zellen', 'anomalie', 'zerlegen', 'schema', 'er']) {
    assert.ok(F.INTERAKTIONEN.includes(k), k);
  }
  assert.deepEqual(F.BLOCK_TYPEN_PHASE5, []);
  assert.deepEqual(F.INTERAKTIONEN_PHASE5, []);
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

test('sql: nicht ausführbare Abfrage meldet keine Zeilenzahl (null statt 0, Probelauf Phase 8)', async () => {
  const a = aufgabe('A9-E1-02');
  const fehler = async () => ({ ok: false, diagnose: [{ code: 'TABELLE_UNBEKANNT', falle: null, text: 'Die Tabelle X gibt es nicht.' }], zeilen: null });
  const r = await P.pruefeAntwort(a, 'SELECT *\nFROM X', { sqlPruefer: fehler });
  assert.equal(r.ok, false);
  assert.equal(r.rueckmeldung.zeilen, null);
  const leer = await P.pruefeAntwort(a, ' ', { sqlPruefer: fehler });
  assert.equal(leer.rueckmeldung.zeilen, null);
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

test('unbekannte Interaktion wird abgelehnt', async () => {
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
    case 'zellen': return [[0, 0]];
    case 'anomalie': return { art: 'keine', zellen: [[0, 0]] };
    case 'zerlegen': return { tabellen: [{ attribute: ia.attribute, schluessel: [ia.attribute[0]] }] };
    case 'schema': return (ia.start || [{ name: 'Akte', attribute: [{ name: 'Nr' }] }]).map((r) => ({ ...r, attribute: r.attribute.map((x) => ({ ...x, pk: true })) }));
    case 'er':
      if (ia.modus === 'lesen') return { elemente: ['e1'] };
      return { entitaeten: [{ id: 'x1', name: 'Akte', attribute: [{ name: 'AkteNr', schluessel: true }] }], beziehungen: [] };
    default: throw new Error(ia.kind);
  }
}

const MODELLIERUNG = ['zellen', 'anomalie', 'zerlegen', 'schema', 'er'];

test('Rückmeldungen enthalten keine Lösungsdaten (falsche und richtige Antworten)', async () => {
  for (const a of AKTE.aufgaben) {
    const ts = F.teile(a);
    const falsch = Array.isArray(a.interaktion) ? ts.map((t) => falscheAntwort(t.interaktion)) : falscheAntwort(a.interaktion);
    // Modellierung: Rückmeldungen nennen Namen, die der Schüler selbst verwendet hat, und sichtbare Spalten der Aufgabe –
    // dort wird nur die falsche Antwort mit den nicht sichtbaren Lösungswerten verglichen (eigener Test unten).
    if (ts.some((t) => MODELLIERUNG.includes(t.interaktion.kind))) {
      const sichtbar = JSON.stringify([a.inhalt, a.interaktion, falsch]);
      const r = await pruefe(a, falsch);
      const json = JSON.stringify(r.rueckmeldung);
      for (const w of loesungsWerte(a).filter((x) => !sichtbar.includes(x))) {
        assert.ok(!json.includes(w), `${a.id}: Rückmeldung ${json} enthält Lösungswert ${w}`);
      }
      continue;
    }
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

/* ---------------------------------------------------------------- Phase 5: zellen, anomalie, zerlegen, schema, er */

const H = require('./hilfen_er');

test('zellen: Menge [Zeile, Spalte] 0-basiert, Hülle { zellen }, leer, außerhalb, mehrfach false, reihenfolge', async () => {
  const a = aufgabe('A9-E2-03');
  let r = await pruefe(a, [[3, 4], [1, 4]]);
  assert.equal(r.ok, true);
  assert.deepEqual(r.rueckmeldung, {});
  assert.equal((await pruefe(a, { zellen: [[1, 4], [3, 4], [1, 4]] })).ok, true, 'Doppelte zählen einmal');
  assert.equal((await pruefe(a, [{ zeile: 1, spalte: 4 }, { zeile: 3, spalte: 4 }])).ok, true, 'auch als { zeile, spalte }');
  r = await pruefe(a, [[1, 4]]);
  assert.equal(r.ok, false);
  assert.equal(r.leer, false);
  r = await pruefe(a, []);
  assert.equal(r.leer, true);
  await wirftAntwortFehler(pruefe(a, [[4, 0]]));
  await wirftAntwortFehler(pruefe(a, [[0, 5]]));
  await wirftAntwortFehler(pruefe(a, [[0]]));
  await wirftAntwortFehler(pruefe(a, 'A1'));
  await wirftAntwortFehler(pruefe(a, new Array(301).fill([0, 0])));
  const eine = { ...structuredClone(a), interaktion: { ...a.interaktion, mehrfach: false }, loesung: { zellen: [[1, 4]] } };
  assert.equal((await pruefe(eine, [[1, 4]])).ok, true);
  assert.equal((await pruefe(eine, [[1, 4], [3, 4]])).ok, false);
  const folge = { ...structuredClone(a), interaktion: { ...a.interaktion, reihenfolge: true } };
  assert.equal((await pruefe(folge, [[1, 4], [3, 4]])).ok, true);
  assert.equal((await pruefe(folge, [[3, 4], [1, 4]])).ok, false, 'Reihenfolge zählt');
});

test('anomalie: Art und Zellen, Rückmeldung ok/falsch ohne Lösungswerte, leer, ungültig, neue Zeile beim Einfügen', async () => {
  const a = aufgabe('A9-E2-04');
  let r = await pruefe(a, { art: 'aenderung', zellen: [[3, 4], [0, 4], [1, 4]] });
  assert.equal(r.ok, true);
  assert.deepEqual(r.rueckmeldung, { art: 'ok', zellen: 'ok' });
  r = await pruefe(a, { art: 'loeschung', zellen: [[0, 4], [1, 4], [3, 4]] });
  assert.equal(r.ok, false);
  assert.deepEqual(r.rueckmeldung, { art: 'falsch', zellen: 'ok' });
  r = await pruefe(a, { art: 'aenderung', zellen: [[0, 4]] });
  assert.deepEqual(r.rueckmeldung, { art: 'ok', zellen: 'falsch' });
  assert.equal((await pruefe(a, {})).leer, true);
  assert.equal((await pruefe(a, { art: '', zellen: [] })).leer, true);
  assert.equal((await pruefe(a, { art: 'keine' })).leer, false);
  await wirftAntwortFehler(pruefe(a, { art: 'chaos', zellen: [] }));
  await wirftAntwortFehler(pruefe(a, { art: 'aenderung', zellen: [[4, 0]] }), 'neue Zeile nur beim Einfügen');
  const ein = structuredClone(a);
  ein.interaktion = { ...ein.interaktion, operation: 'einfuegen', simulation: { werte: [null, null, 'Bouldern', 'Kruse', null] } };
  ein.loesung = { art: 'einfuegung', zellen: [[4, 0], [4, 1]] };
  assert.equal((await pruefe(ein, { art: 'einfuegung', zellen: [[4, 1], [4, 0]] })).ok, true);
  await wirftAntwortFehler(pruefe(ein, { art: 'einfuegung', zellen: [[5, 0]] }));
});

test('zerlegen: Musterzerlegung, BCNF-Musterantwort ohne muster, Hinweise je Tabelle, Grenzen', async () => {
  const a = aufgabe('A9-E2-05');
  const T = (attribute, schluessel) => ({ attribute, schluessel });
  let r = await pruefe(a, { tabellen: [T(['Trainer', 'TrainerTelefon'], ['Trainer']), T(['Halle', 'Abteilung', 'Trainer'], ['Abteilung'])] });
  assert.equal(r.ok, true);
  assert.deepEqual(Object.keys(r.rueckmeldung).sort(), ['hinweise', 'redundanzfrei', 'tabellen', 'verlustfrei', 'vollstaendig']);
  // ohne muster: berechnete Zerlegung ist die Musterantwort
  const ohne = structuredClone(a);
  delete ohne.loesung.muster;
  const m = P.musterantwort(ohne);
  assert.equal((await pruefe(ohne, m)).ok, true, JSON.stringify(m));
  // Redundanz: Hinweis nennt die Spalten der Aufgabe
  r = await pruefe(a, { tabellen: [T(['Abteilung', 'Trainer', 'TrainerTelefon', 'Halle'], ['Abteilung'])] });
  assert.equal(r.ok, false);
  assert.equal(r.rueckmeldung.redundanzfrei, false);
  assert.ok(r.rueckmeldung.tabellen[0].hinweise.some((h) => h.code === 'REDUNDANZ' && /TrainerTelefon/.test(h.text) && /Trainer/.test(h.text)));
  // leer und Grenzen
  assert.equal((await pruefe(a, { tabellen: [] })).leer, true);
  assert.equal((await pruefe(a, { tabellen: [T([], [])] })).leer, true);
  assert.equal((await pruefe(a, [T(['Abteilung'], ['Abteilung'])])).ok, false, 'auch als Liste');
  await wirftAntwortFehler(pruefe(a, { tabellen: [T(['Abteilung', 'Beitrag'], ['Abteilung'])] }));
  await wirftAntwortFehler(pruefe(a, { tabellen: [T(['Abteilung'], ['Trainer'])] }));
  await wirftAntwortFehler(pruefe(a, { tabellen: new Array(5).fill(T(['Abteilung'], [])) }), 'tabellenMax 4');
  await wirftAntwortFehler(pruefe(a, { tabellen: [T('Abteilung', [])] }));
  await wirftAntwortFehler(pruefe(a, { tabellen: [T(['x'.repeat(41)], [])] }));
});

test('schema: Werkbank, Modus schluessel (nur PK/FK änderbar), Teilfeedback je Relation, leer, Grenzen', async () => {
  const a = aufgabe('A9-E2-06');
  const muster = P.musterantwort(a);
  let r = await pruefe(a, muster);
  assert.equal(r.ok, true);
  assert.deepEqual(Object.keys(r.rueckmeldung).sort(), ['fehlend', 'hinweise', 'relationen', 'ueberzaehlig']);
  // als nackte Liste, Reihenfolge der Relationen und Attribute egal
  r = await pruefe(a, [...muster.relationen].reverse());
  assert.equal(r.ok, true);
  // Fremdschlüssel fehlt
  const ohneFk = structuredClone(muster.relationen);
  delete ohneFk[1].attribute.find((x) => x.name === 'SorteNr').fk;
  r = await pruefe(a, { relationen: ohneFk });
  assert.equal(r.ok, false);
  const verkauf = r.rueckmeldung.relationen.find((x) => x.name === 'Verkauf');
  assert.equal(verkauf.ok, false);
  assert.ok(verkauf.hinweise.some((h) => h.code === 'FK_FEHLT'));
  // unveränderter Start = leer; keine Relation = leer
  assert.equal((await pruefe(a, { relationen: a.interaktion.start })).leer, true);
  assert.equal((await pruefe(a, { relationen: [] })).leer, true);
  // Modus schluessel: Attributmenge oder Relation geändert → Formfehler
  const mehr = structuredClone(muster.relationen);
  mehr[0].attribute.push({ name: 'Preis' });
  await wirftAntwortFehler(pruefe(a, { relationen: mehr }));
  await wirftAntwortFehler(pruefe(a, { relationen: [muster.relationen[0]] }));
  // Grenzen und Form
  await wirftAntwortFehler(pruefe(a, { relationen: [{ name: 'x'.repeat(41), attribute: [{ name: 'A' }] }] }));
  await wirftAntwortFehler(pruefe(a, { relationen: new Array(31).fill(0).map((_, i) => ({ name: `R${i}`, attribute: [{ name: 'A' }] })) }));
  await wirftAntwortFehler(pruefe(a, { relationen: [{ name: 'R', attribute: [{ name: 'A', fk: 'Gibtsnicht' }] }] }));
  await wirftAntwortFehler(pruefe(a, { relationen: 'Sorte(SorteNr)' }));
  // Modus frei: Relationen frei, Synonyme
  const frei = structuredClone(a);
  frei.interaktion = { kind: 'schema', modus: 'frei' };
  frei.loesung.synonyme = { Verkauf: ['Bestellung'] };
  const umbenannt = structuredClone(muster.relationen);
  umbenannt[1].name = 'Bestellung';
  assert.equal((await pruefe(frei, { relationen: umbenannt })).ok, true);
});

test('er ergaenzen: Graph-Abgleich mit Kriterienliste, Synonyme, Startelemente dürfen nicht fehlen, leer, Grenzen', async () => {
  const a = aufgabe('A9-E2-07');
  const start = a.interaktion.start.graph;
  const mit = (enden, name = 'leitet') => ({ ...structuredClone(start), beziehungen: [{ id: 'b9', name, enden, attribute: [] }] });
  let r = await pruefe(a, mit([{ entitaet: 'e1', kard: '1' }, { entitaet: 'e2', kard: 'n' }]));
  assert.equal(r.ok, true, JSON.stringify(r.rueckmeldung));
  assert.deepEqual(Object.keys(r.rueckmeldung).sort(), ['gesamt', 'hinweise', 'kriterien', 'richtig']);
  assert.equal(r.rueckmeldung.richtig, r.rueckmeldung.gesamt);
  // auch als { graph, layout } (Layout wird ignoriert); Name frei; Synonym
  assert.equal((await pruefe(a, { graph: mit([{ entitaet: 'e2', kard: 'm' }, { entitaet: 'e1', kard: '1' }], 'fuehrt'), layout: { e1: { x: 1, y: 1 } } })).ok, true);
  const syn = mit([{ entitaet: 'e1', kard: '1' }, { entitaet: 'e2', kard: 'n' }]);
  syn.entitaeten[0].name = 'Detektiv';
  assert.equal((await pruefe(a, syn)).ok, true);
  // vertauschte Kardinalität: Kriterium kardinalitaeten falsch
  r = await pruefe(a, mit([{ entitaet: 'e1', kard: 'n' }, { entitaet: 'e2', kard: '1' }]));
  assert.equal(r.ok, false);
  assert.equal(r.rueckmeldung.kriterien.find((k) => k.id === 'kardinalitaeten').ok, false);
  assert.deepEqual(r.rueckmeldung.hinweise, []);
  // Startelement gelöscht bzw. umbenannt → falsch mit Hinweis START_FEHLT
  const ohne = mit([{ entitaet: 'e1', kard: '1' }, { entitaet: 'e2', kard: 'n' }]);
  ohne.entitaeten[1].attribute = ohne.entitaeten[1].attribute.filter((x) => x.name !== 'Titel');
  r = await pruefe(a, ohne);
  assert.equal(r.ok, false);
  assert.ok(r.rueckmeldung.hinweise.some((h) => h.code === 'START_FEHLT'));
  // leer: nichts oder unveränderter Start
  assert.equal((await pruefe(a, {})).leer, true);
  assert.equal((await pruefe(a, structuredClone(start))).leer, true);
  assert.equal((await pruefe(a, mit([{ entitaet: 'e1' }, { entitaet: 'e2' }]))).leer, false);
  // Grenzen: ≤ 30 Elemente je Art, ≤ 30 Attribute, Namen ≤ 40 Zeichen
  const viele = (n) => new Array(n).fill(0).map((_, i) => ({ id: `x${i}`, name: `E${i}`, attribute: [] }));
  await wirftAntwortFehler(pruefe(a, { entitaeten: viele(31), beziehungen: [] }));
  assert.equal((await pruefe(a, { entitaeten: viele(30), beziehungen: [] })).ok, false);
  await wirftAntwortFehler(pruefe(a, { entitaeten: [{ id: 'x', name: 'E'.repeat(41) }], beziehungen: [] }));
  await wirftAntwortFehler(pruefe(a, { entitaeten: [{ id: 'x', name: 'E', attribute: new Array(31).fill({ name: 'A' }) }], beziehungen: [] }));
  await wirftAntwortFehler(pruefe(a, { entitaeten: [{ id: 'x', name: 7 }], beziehungen: [] }));
  await wirftAntwortFehler(pruefe(a, { entitaeten: [], beziehungen: [{ id: 'b', name: 'r', enden: new Array(4).fill({ entitaet: 'x', kard: 'n' }) }] }));
  await wirftAntwortFehler(pruefe(a, 'Ermittler leitet Fall'));
});

test('er lesen: Element-Ids (Attribute <id>.<i>), Zuordnung mit Kategorien, Rückmeldung leer, ungültige Ids', async () => {
  const a = aufgabe('A9-E2-08');
  let r = await pruefe(a, { elemente: ['e1.0', 'b1', 'e2', 'e1', 'e2.0'] });
  assert.equal(r.ok, true);
  assert.deepEqual(r.rueckmeldung, {});
  assert.equal((await pruefe(a, ['e1', 'e2', 'b1', 'e1.0', 'e2.0'])).ok, true, 'auch als Liste');
  r = await pruefe(a, { elemente: ['e1', 'e2', 'b1', 'e1.0', 'e2.0', 'e1.1'] });
  assert.equal(r.ok, false);
  assert.deepEqual(r.rueckmeldung, {});
  assert.equal((await pruefe(a, { elemente: [] })).leer, true);
  await wirftAntwortFehler(pruefe(a, { elemente: ['e3'] }));
  await wirftAntwortFehler(pruefe(a, { elemente: ['e1.7'] }));
  const zu = structuredClone(a);
  zu.interaktion.kategorien = [{ id: 'ent', md: 'Entitätstyp' }, { id: 'att', md: 'Attribut' }];
  zu.loesung = { zuordnung: { e1: 'ent', e2: 'ent', 'e1.1': 'att' } };
  assert.equal((await pruefe(zu, { zuordnung: { e1: 'ent', e2: 'ent', 'e1.1': 'att', b1: '' } })).ok, true);
  assert.equal((await pruefe(zu, { zuordnung: { e1: 'att', e2: 'ent', 'e1.1': 'att' } })).ok, false);
  assert.equal((await pruefe(zu, {})).leer, true);
  await wirftAntwortFehler(pruefe(zu, { zuordnung: { e1: 'raute' } }));
  await wirftAntwortFehler(pruefe(zu, { zuordnung: { e9: 'ent' } }));
});

/** Name als ganzes Wort (nicht Teil eines längeren Schülernamens wie „verdaechtigt“). */
const alsWort = (n) => new RegExp(`(^|[^A-Za-z0-9])${n}([^A-Za-z0-9]|$)`);

/** Alle Namen (Entitätstypen, Beziehungstypen, Attribute, Rollen) eines Graphen bzw. Schemas. */
function namenVon(wert, out = new Set()) {
  if (Array.isArray(wert)) wert.forEach((w) => namenVon(w, out));
  else if (wert && typeof wert === 'object') {
    for (const [k, v] of Object.entries(wert)) {
      if ((k === 'name' || k === 'rolle' || k === 'fk') && typeof v === 'string') out.add(v);
      else namenVon(v, out);
    }
  }
  return out;
}

test('er/schema: Rückmeldungen nennen keine Musternamen, die der Schüler nicht verwendet hat (Review Focus 3)', async () => {
  // Detektei-Muster (7 Beziehungstypen), Schüler zeichnet nur einen Teil – mit eigenen Namen und Fehlern
  const muster = H.detektei('m_');
  const er = {
    id: 'T-ER', inhalt: [{ t: 'text', md: 'Entwickeln Sie das ER-Modell.' }],
    interaktion: { kind: 'er', modus: 'entwickeln' },
    loesung: { muster: [muster], synonyme: { Ermittler: ['Detektiv'] }, aequivalenzen: ['nm_aufgeloest', 'attribut_an_n_seite'] }
  };
  const schueler = H.graph('s_', [['Detektiv', '_DetektivNr Name'], ['Akte', '_AktenNr Titel Grad'], ['Zeuge', 'Name']],
    [['bearbeitet', 'Detektiv:n Akte:1'], ['verdaechtigt', 'Zeuge:n Akte:m']]);
  const r = await P.pruefeAntwort(er, schueler);
  assert.equal(r.ok, false);
  const json = JSON.stringify(r.rueckmeldung);
  const benutzt = namenVon(schueler);
  const verboten = [...namenVon(muster)].filter((n) => ![...benutzt].some((b) => b.toLowerCase() === n.toLowerCase()));
  assert.ok(verboten.length > 10);
  for (const n of verboten) assert.ok(!alsWort(n).test(json), `Rückmeldung nennt Musternamen „${n}“: ${json}`);
  // Schema: Muster Detektei-Ausschnitt, Schüler mit eigenen Relationennamen
  const sm = [
    { name: 'Ermittler', attribute: [{ name: 'ErmittlerNr', pk: true }, { name: 'Name' }, { name: 'MentorNr', fk: 'Ermittler' }] },
    { name: 'Fall', attribute: [{ name: 'FallNr', pk: true }, { name: 'Titel' }, { name: 'LeiterNr', fk: 'Ermittler' }] },
    { name: 'verdaechtig', attribute: [{ name: 'PersonNr', pk: true, fk: 'Person' }, { name: 'FallNr', pk: true, fk: 'Fall' }, { name: 'Grad' }] },
    { name: 'Person', attribute: [{ name: 'PersonNr', pk: true }, { name: 'Nachname' }] }
  ];
  const sch = { id: 'T-S', inhalt: [], interaktion: { kind: 'schema', modus: 'frei' }, loesung: { muster: [sm] } };
  const s = [{ name: 'Akte', attribute: [{ name: 'AktenNr', pk: true }, { name: 'Titel' }] }, { name: 'Zeuge', attribute: [{ name: 'Name', pk: true }] }];
  const rs = await P.pruefeAntwort(sch, { relationen: s });
  assert.equal(rs.ok, false);
  const js = JSON.stringify(rs.rueckmeldung);
  const sb = namenVon(s);
  for (const n of namenVon(sm)) if (!sb.has(n)) assert.ok(!alsWort(n).test(js), `Schema-Rückmeldung nennt „${n}“: ${js}`);
});

test('neue Interaktionen im Verhör: Prüfung wie sonst (abimodus streng stört nicht), mehrteilig mit anderen Teilen', async () => {
  const a = aufgabe('A9-E2-04');
  const r = await P.pruefeAntwort(a, P.musterantwort(a), { abimodus: 'streng' });
  assert.equal(r.ok, true);
  const mehr = {
    id: 'T-M', inhalt: aufgabe('A9-E2-03').inhalt,
    interaktion: [aufgabe('A9-E2-03').interaktion, aufgabe('A9-E2-05').interaktion],
    loesung: [aufgabe('A9-E2-03').loesung, aufgabe('A9-E2-05').loesung]
  };
  const m = P.musterantwort(mehr);
  assert.equal((await P.pruefeAntwort(mehr, m)).ok, true);
  const r2 = await P.pruefeAntwort(mehr, [m[0], { tabellen: [] }]);
  assert.equal(r2.ok, false);
  assert.equal(r2.leer, false);
  assert.equal(r2.rueckmeldung.teile.length, 2);
});
