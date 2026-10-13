'use strict';
// Trainingsplatz T4–T7 (Plan Phase 5 Task 5, Spec §7.8): Kardinalität aus Daten, Schlüsselkandidat, Mini-ER →
// Kurzschreibweise, Anomalieart. Alle mit choice (genau eine richtige Option); die Lösung wird hier unabhängig vom
// Generator aus den sichtbaren Daten bzw. dem ER-Graphen nachgerechnet.
const test = require('node:test');
const assert = require('node:assert/strict');

const G = require('../src/content/generatoren');
const F = require('../src/content/format');
const { pruefeAntwort, musterantwort } = require('../src/content/pruefer');
const H = require('./hilfen_lernen');

const { K17 } = H;
const T = K17 + '/training';
const TYPEN = ['T4', 'T5', 'T6', 'T7'];
const SEEDS = Array.from({ length: 200 }, (_, i) => (i * 2654435761 + 99) >>> 0);

const optionMd = (a, id) => a.interaktion.optionen.find((o) => o.id === id).md;
const richtigeMd = (a) => optionMd(a, a.loesung.richtig[0]);
const tabelle = (a) => a.inhalt.find((b) => b.t === 'dbtabelle');
const spaltenwerte = (b, name) => b.zeilen.map((z) => z[b.kopf.findIndex((k) => k.name === name)]);
const zaehle = (werte) => werte.reduce((m, w) => m.set(w, (m.get(w) || 0) + 1), new Map());

/** Alle Mini-Markdown-Texte einer Aufgabe. */
function texte(a) {
  const out = [a.interaktion.frage, ...a.interaktion.optionen.map((o) => o.md)];
  for (const b of [...a.inhalt, ...a.erklaerung]) if (typeof b.md === 'string') out.push(b.md);
  return out;
}

/* ---------------------------------------------------------------- allgemein */

test('T4–T7: choice mit genau einer richtigen Option; Prüfer akzeptiert nur sie; Format sauber', async () => {
  for (const typ of TYPEN) {
    for (const seed of SEEDS) {
      const a = G.erzeuge(typ, seed);
      const wo = `${typ}/${seed}`;
      const ia = a.interaktion;
      assert.equal(ia.kind, 'choice', wo);
      assert.equal(ia.mehrfach, false, wo);
      assert.equal(a.punkte, 1, wo);
      assert.ok(ia.optionen.length >= 4, wo);
      const ids = ia.optionen.map((o) => o.id);
      assert.equal(new Set(ids).size, ids.length, `${wo}: Ids eindeutig`);
      assert.equal(new Set(ia.optionen.map((o) => o.md)).size, ids.length, `${wo}: Optionstexte verschieden`);
      for (const o of ia.optionen) assert.deepEqual(Object.keys(o).sort(), ['id', 'md'], wo);
      assert.equal(a.loesung.richtig.length, 1, `${wo}: genau eine richtige Option`);
      assert.ok(ids.includes(a.loesung.richtig[0]), wo);
      assert.equal((await pruefeAntwort(a, musterantwort(a))).ok, true, wo);
      for (const id of ids.filter((x) => x !== a.loesung.richtig[0])) {
        assert.equal((await pruefeAntwort(a, [id])).ok, false, `${wo}: Option ${id} darf nicht richtig sein`);
      }
      assert.ok(F.KATEGORIEN.includes(a.kategorie), wo);
      assert.ok(a.kompetenz.every((k) => /^DB-K(0[1-9]|[1-3]\d|4[0-8])$/.test(k)), wo);
      for (const b of [...a.inhalt, ...a.erklaerung]) assert.ok(F.BLOCK_TYPEN.includes(b.t), `${wo}: Block ${b.t}`);
      for (const t of texte(a)) assert.deepEqual(F.pruefeMarkdown(t), [], `${wo}: ${t}`);
      assert.ok(a.erklaerung.length >= 1, wo);
    }
  }
});

test('T4–T7: deterministisch, vielfältig, öffentliche Sicht ohne Lösung', () => {
  for (const typ of TYPEN) {
    const verschieden = new Set();
    for (const seed of SEEDS.slice(0, 40)) {
      const a = G.erzeuge(typ, seed);
      assert.deepEqual(G.erzeuge(typ, seed), a);
      const o = G.oeffentlich(a);
      verschieden.add(JSON.stringify(o));
      assert.deepEqual(Object.keys(o).sort(), ['inhalt', 'interaktion', 'kategorie', 'kompetenz', 'titel', 'typ']);
      const json = JSON.stringify(o);
      for (const verboten of ['loesung', 'richtig"', 'erklaerung', 'fehler']) assert.ok(!json.includes(verboten), `${typ}/${seed}: ${verboten}`);
    }
    assert.ok(verschieden.size >= 35, `${typ}: ${verschieden.size} verschiedene Aufgaben`);
  }
});

test('T4–T7: Option-Id verrät die Lösung nicht (richtige Option über die Seeds verteilt)', () => {
  for (const typ of TYPEN) {
    const ids = new Set(SEEDS.map((s) => G.erzeuge(typ, s).loesung.richtig[0]));
    assert.ok(ids.size >= 4, `${typ}: ${[...ids]}`);
  }
});

/* ---------------------------------------------------------------- T4 */

test('T4: Kardinalität aus den sichtbaren Daten gestützt, Leserichtung beachtet; Erklärung nennt den Sachzusammenhang', () => {
  const gesehen = new Set();
  for (const seed of SEEDS) {
    const a = G.erzeuge('T4', seed);
    const wo = `T4/${seed}`;
    const b = tabelle(a);
    const [, x, y] = /Leserichtung (\w+) – (\w+)/.exec(a.interaktion.frage);
    const fks = b.kopf.filter((k) => k.fk);
    let soll;
    if (fks.length === 2) {
      // Beziehungstabelle: beide Seiten müssen mehrfach vorkommen, und zwar mit verschiedenen Partnern
      const [s1, s2] = fks.map((k) => k.name);
      const paare = b.zeilen.map((z) => z.join('|'));
      assert.equal(new Set(paare).size, paare.length, `${wo}: Paare eindeutig`);
      assert.ok([...zaehle(spaltenwerte(b, s1)).values()].some((n) => n >= 2), `${wo}: ${s1} mehrfach`);
      assert.ok([...zaehle(spaltenwerte(b, s2)).values()].some((n) => n >= 2), `${wo}: ${s2} mehrfach`);
      assert.ok(fks.every((k) => k.pk), `${wo}: zusammengesetzter PK`);
      soll = 'n : m';
    } else {
      assert.equal(fks.length, 1, wo);
      const ziel = fks[0].fk; // Entitätstyp auf der 1-Seite
      const mehrfach = [...zaehle(spaltenwerte(b, fks[0].name)).values()].some((n) => n >= 2);
      if (!mehrfach) soll = '1 : 1';
      else soll = x === ziel ? '1 : n' : 'n : 1';
      assert.ok([x, y].includes(ziel) && [x, y].includes(b.tabelle), `${wo}: Leserichtung nennt beide Entitätstypen`);
    }
    assert.equal(richtigeMd(a), soll, wo);
    gesehen.add(soll);
    const erkl = a.erklaerung.map((e) => e.md).join(' ');
    assert.match(erkl, /Sachzusammenhang/, wo);
    assert.match(erkl, /stützen/, wo);
    assert.ok(a.inhalt.some((e) => e.t === 'hinweis'), `${wo}: Hinweis zum Sachzusammenhang`);
  }
  assert.deepEqual([...gesehen].sort(), ['1 : 1', '1 : n', 'n : 1', 'n : m']);
});

/* ---------------------------------------------------------------- T5 */

test('T5: richtige Kombination eindeutig, nie NULL, minimal; Distraktoren: Ausschnitt-Falle, NULL, nicht minimal, nicht eindeutig', () => {
  let zusammengesetzt = 0;
  for (const seed of SEEDS) {
    const a = G.erzeuge('T5', seed);
    const wo = `T5/${seed}`;
    const b = tabelle(a);
    assert.ok(b.kopf.every((k) => !k.pk && !k.fk), `${wo}: Ausschnitt verrät den Schlüssel nicht`);
    const spalten = (md) => [...md.matchAll(/`(\w+)`/g)].map((m) => m[1]);
    const eindeutig = (liste) => {
      const w = b.zeilen.map((z) => JSON.stringify(liste.map((s) => z[b.kopf.findIndex((k) => k.name === s)])));
      return new Set(w).size === w.length;
    };
    const mitNull = (liste) => liste.some((s) => spaltenwerte(b, s).includes(null));
    const richtig = spalten(richtigeMd(a));
    assert.ok(richtig.every((s) => b.kopf.some((k) => k.name === s)), wo);
    assert.ok(eindeutig(richtig) && !mitNull(richtig), `${wo}: richtig eindeutig, ohne NULL`);
    if (richtig.length > 1) {
      zusammengesetzt++;
      for (const s of richtig) assert.ok(!eindeutig([s]), `${wo}: ${s} allein schon eindeutig → nicht minimal`);
    }
    const arten = new Set();
    for (const o of a.interaktion.optionen.filter((x) => x.id !== a.loesung.richtig[0])) {
      const sp = spalten(o.md);
      if (mitNull(sp)) arten.add('null');
      else if (!eindeutig(sp)) arten.add('nichtEindeutig');
      else if (richtig.every((s) => sp.includes(s)) && sp.length > richtig.length) arten.add('nichtMinimal');
      else if (sp.length === 1 && !richtig.includes(sp[0])) arten.add('falle');
      else assert.fail(`${wo}: Distraktor ${o.md} ist nicht eindeutig falsch`);
    }
    assert.deepEqual([...arten].sort(), ['falle', 'nichtEindeutig', 'nichtMinimal', 'null'], wo);
    const erkl = a.erklaerung.map((e) => e.md).join('\n');
    for (const kriterium of ['Ausschnitt-Falle', 'nie leer', 'nicht minimal', 'nicht eindeutig']) assert.ok(erkl.includes(kriterium), `${wo}: ${kriterium}`);
  }
  assert.ok(zusammengesetzt > 10 && zusammengesetzt < SEEDS.length - 10, `zusammengesetzt: ${zusammengesetzt}`);
});

/* ---------------------------------------------------------------- T6 */

/** Relationen vergleichbar machen: Name, PK-Menge, FKs, übrige Attribute (je sortiert). */
function kanonisch(relationen) {
  return JSON.stringify(
    relationen
      .map((r) => ({
        name: r.name,
        pk: r.attribute.filter((x) => x.pk).map((x) => x.name).sort(),
        fk: r.attribute.filter((x) => x.fk).map((x) => `${x.name}>${x.fk}`).sort(),
        alle: r.attribute.map((x) => x.name).sort()
      }))
      .sort((p, q) => p.name.localeCompare(q.name))
  );
}

/** Unabhängige Überführung des Mini-ER (EH: R1 Entitätstyp, R2 1:n, R3 n:m). */
function ueberfuehre(graph) {
  const rel = new Map(graph.entitaeten.map((e) => [e.id, { name: e.name, attribute: e.attribute.map((x) => ({ name: x.name, ...(x.schluessel ? { pk: true } : {}) })) }]));
  const schluessel = (id) => graph.entitaeten.find((e) => e.id === id).attribute.find((x) => x.schluessel).name;
  const name = (id) => rel.get(id).name;
  const out = [...rel.values()];
  for (const b of graph.beziehungen) {
    const [e1, e2] = b.enden;
    const attr = b.attribute.map((x) => ({ name: x.name }));
    if (e1.kard === '1' || e2.kard === '1') {
      const eins = e1.kard === '1' ? e1 : e2;
      const n = e1.kard === '1' ? e2 : e1;
      rel.get(n.entitaet).attribute.push({ name: schluessel(eins.entitaet), fk: name(eins.entitaet) }, ...attr);
    } else {
      out.push({ name: b.name, attribute: [...b.enden.map((e) => ({ name: schluessel(e.entitaet), pk: true, fk: name(e.entitaet) })), ...attr] });
    }
  }
  return out;
}

test('T6: genau ein Vorschlag entspricht der Überführung des ER-Graphen; Graph wohlgeformt; Skizze passt', () => {
  const vielfalt = new Set();
  for (const seed of SEEDS) {
    const a = G.erzeuge('T6', seed);
    const wo = `T6/${seed}`;
    const { graph, layout } = a.er;
    assert.equal(a.er.t, 'er');
    // Graph-Format Spec §7.6.4
    const ids = [...graph.entitaeten.map((e) => e.id), ...graph.beziehungen.map((b) => b.id)];
    assert.equal(new Set(ids).size, ids.length, wo);
    for (const id of ids) assert.ok(layout[id] && Number.isFinite(layout[id].x) && Number.isFinite(layout[id].y), `${wo}: layout ${id}`);
    for (const e of graph.entitaeten) assert.equal(e.attribute.filter((x) => x.schluessel).length, 1, wo);
    const b = graph.beziehungen[0];
    assert.match(b.name, /^[a-z][A-Za-z]*$/, `${wo}: Beziehungstyp lowerCamelCase`);
    for (const e of b.enden) {
      assert.ok(graph.entitaeten.some((x) => x.id === e.entitaet), wo);
      assert.ok(['1', 'n', 'm'].includes(e.kard), wo);
    }
    // Der er-Block erscheint erst, wenn der Browser ihn zeichnen kann (Task 3)
    assert.ok(!a.inhalt.some((x) => x.t === 'er'), wo);
    // Skizze nennt Entitätstypen, Beziehungstyp und Kardinalitäten in Zeichenreihenfolge
    const skizze = a.inhalt.find((x) => x.t === 'code').code;
    const [l, r] = b.enden.map((e) => graph.entitaeten.find((x) => x.id === e.entitaet).name);
    assert.ok(skizze.startsWith(`[${l}] ——${b.enden[0].kard}—— <${b.name}> ——${b.enden[1].kard}—— [${r}]`), `${wo}: ${skizze}`);
    for (const x of b.attribute) assert.ok(skizze.includes(`(${x.name})`), wo);

    const soll = kanonisch(ueberfuehre(graph));
    const vorschlaege = [];
    a.inhalt.forEach((x, i) => {
      if (x.t === 'schema') vorschlaege.push({ buchstabe: /Vorschlag ([A-D])/.exec(a.inhalt[i - 1].md)[1], k: kanonisch(x.relationen) });
    });
    assert.equal(vorschlaege.length, 4, wo);
    assert.equal(new Set(vorschlaege.map((v) => v.k)).size, 4, `${wo}: Vorschläge verschieden`);
    const treffer = vorschlaege.filter((v) => v.k === soll);
    assert.equal(treffer.length, 1, `${wo}: genau ein richtiger Vorschlag`);
    assert.equal(richtigeMd(a), `Vorschlag ${treffer[0].buchstabe}`, wo);
    assert.equal(kanonisch(a.erklaerung.find((x) => x.t === 'schema').relationen), soll, `${wo}: Erklärung zeigt das richtige Schema`);
    vielfalt.add(`${b.enden.map((e) => e.kard).join(':')}${b.attribute.length ? '+attr' : ''}`);
  }
  for (const v of ['1:n', 'n:1', 'n:m', '1:n+attr', 'n:1+attr', 'n:m+attr']) assert.ok(vielfalt.has(v), `T6: ${v}`);
});

/* ---------------------------------------------------------------- T7 */

test('T7: Anomalieart folgt aus Tabelle und Vorgang (auch „keine Anomalie“ bei anomaliefreier Tabelle)', () => {
  const arten = new Set();
  for (const seed of SEEDS) {
    const a = G.erzeuge('T7', seed);
    const wo = `T7/${seed}`;
    const b = tabelle(a);
    const vorgang = a.interaktion.frage;
    const gruppenSpalte = b.kopf[1].name;
    let soll;
    if (b.kopf.some((k) => k.pk)) {
      soll = 'keine Anomalie';
      const namen = spaltenwerte(b, 'Name');
      assert.equal(new Set(namen).size, namen.length, `${wo}: jede Gruppe genau einmal`);
    } else if (/meldet sich ab/.test(vorgang)) {
      const person = /\*\*Vorgang:\*\* (\w+) meldet/.exec(vorgang)[1];
      const zeile = b.zeilen.find((z) => z[0] === person);
      assert.ok(zeile, wo);
      assert.equal(spaltenwerte(b, gruppenSpalte).filter((g) => g === zeile[1]).length, 1, `${wo}: einziger Eintrag`);
      soll = 'Löschanomalie';
    } else if (/übernimmt ab sofort/.test(vorgang)) {
      const g = /„([^“]+)“/.exec(vorgang)[1];
      assert.ok(spaltenwerte(b, gruppenSpalte).filter((x) => x === g).length >= 2, `${wo}: Redundanz`);
      soll = 'Änderungsanomalie';
    } else {
      assert.match(vorgang, /noch niemand/, wo);
      const g = /„([^“]+)“/.exec(vorgang)[1];
      assert.ok(!spaltenwerte(b, gruppenSpalte).includes(g), `${wo}: neue Gruppe`);
      soll = 'Einfügeanomalie';
    }
    assert.equal(richtigeMd(a), soll, wo);
    arten.add(soll);
    // Abhängige Spalten sind je Gruppe konsistent (die Rohliste ist widerspruchsfrei, nur redundant)
    const proGruppe = new Map();
    for (const z of b.zeilen) {
      const k = JSON.stringify(z.slice(2));
      if (proGruppe.has(z[1])) assert.equal(proGruppe.get(z[1]), k, wo);
      proGruppe.set(z[1], k);
    }
  }
  assert.deepEqual([...arten].sort(), ['Einfügeanomalie', 'Löschanomalie', 'keine Anomalie', 'Änderungsanomalie'].sort());
});

/* ---------------------------------------------------------------- API */

async function start(niveau = 'eA') {
  const u = H.umgebung();
  const s = await H.client(u, H.SCHUELERIN);
  H.einstellen(u.db, 'k:17', { akten: [9], niveau });
  return { u, s };
}

test('API: T4–T7 neu → öffentlich ohne Lösung; richtig → 1 Punkt + Erklärung; falsch → 0 Punkte, keine Lösung', async () => {
  const { s } = await start();
  for (const typ of TYPEN) {
    const n = await s.post(T + '/neu', { typ });
    assert.equal(n.status, 200, typ);
    assert.deepEqual(n.body.aufgabe, G.oeffentlich(G.erzeuge(typ, n.body.seed)));
    const json = JSON.stringify(n.body);
    assert.ok(!json.includes('loesung') && !json.includes('erklaerung') && !json.includes('"richtig"'), typ);
    const a = G.erzeuge(typ, n.body.seed);
    const falsch = a.interaktion.optionen.find((o) => o.id !== a.loesung.richtig[0]).id;
    const f = await s.post(T + '/pruefen', { typ, seed: n.body.seed, signatur: n.body.signatur, antwort: [falsch] });
    assert.equal(f.status, 200);
    assert.equal(f.body.ok, false);
    assert.equal(f.body.punkteErhalten, 0);
    assert.ok(!('loesung' in f.body) && !('erklaerung' in f.body), `${typ}: falsch ohne Lösung`);
    const r = await s.post(T + '/pruefen', { typ, seed: n.body.seed, signatur: n.body.signatur, antwort: musterantwort(a) });
    assert.equal(r.body.ok, true, typ);
    assert.equal(r.body.punkteErhalten, 1, typ);
    assert.deepEqual(r.body.loesung, a.loesung);
    assert.ok(Array.isArray(r.body.erklaerung) && r.body.erklaerung.length, typ);
  }
  const st = (await s.get(K17 + '/stand')).body;
  assert.equal(st.punkte.training, 4);
});

test('API: gA-Kurs sieht die eA-Typen T4 und T6 nicht (Spec §3.4)', async () => {
  const { s } = await start('gA');
  const r = await s.get(T);
  assert.equal(r.status, 200);
  assert.deepEqual(
    r.body.generatoren.map((g) => g.typ),
    ['T1', 'T2', 'T3', 'T5', 'T7']
  );
  for (const typ of ['T4', 'T6']) assert.equal((await s.post(T + '/neu', { typ })).status, 400, typ);
  for (const typ of ['T5', 'T7']) assert.equal((await s.post(T + '/neu', { typ })).status, 200, typ);
});
