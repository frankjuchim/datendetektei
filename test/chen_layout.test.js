'use strict';
// ER-Layouts der Akte 5 (Abnahme Phase 5): weder die von Hand gesetzten Layouts (Blöcke er, start-Diagramme) noch die
// automatisch gesetzten Musterlösungen (chen.js ergaenzeLayout) dürfen Elemente überlappen lassen oder Kanten,
// Attributlinien und Kardinalitäts-Plättchen über fremde Elemente legen.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const WURZEL = path.join(__dirname, '..');
const lies = (p) => fs.readFileSync(path.join(WURZEL, p), 'utf8');
const ladeChen = () => import('data:text/javascript,' + encodeURIComponent(lies('public/static/js/bauplan/chen.js')));

/** Umgebende Rechtecke (Rauten und Ellipsen leicht verkleinert, weil ihre Ecken leer sind). */
function rahmen(C, e, p) {
  if (e.art === 'entitaet') return { x0: p.x - 80, x1: p.x + 80, y0: p.y - 30, y1: p.y + 30 };
  if (e.art === 'beziehung') {
    const hb = (C.rauteBreite(e.el.name) / 2) * 0.75;
    return { x0: p.x - hb, x1: p.x + hb, y0: p.y - 28, y1: p.y + 28 };
  }
  const rx = C.attrRx(e.el.name) * 0.9;
  return { x0: p.x - rx, x1: p.x + rx, y0: p.y - 20, y1: p.y + 20 };
}
const schneiden = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
/** Strecke p–q schneidet Rechteck b (Liang-Barsky). */
function streckeTrifft(p, q, b) {
  let t0 = 0;
  let t1 = 1;
  const dx = q.x - p.x;
  const dy = q.y - p.y;
  for (const [pp, qq] of [[-dx, p.x - b.x0], [dx, b.x1 - p.x], [-dy, p.y - b.y0], [dy, b.y1 - p.y]]) {
    if (pp === 0) {
      if (qq < 0) return false;
      continue;
    }
    const r = qq / pp;
    if (pp < 0) {
      if (r > t1) return false;
      if (r > t0) t0 = r;
    } else {
      if (r < t0) return false;
      if (r < t1) t1 = r;
    }
  }
  return true;
}

/** → Liste der Kollisionen (leer = sauber). */
function kollisionen(C, graph, layout) {
  const alle = C.elemente(graph);
  const ents = new Set(alle.filter((e) => e.art === 'entitaet').map((e) => e.id));
  const boxen = alle.map((e) => ({ e, b: rahmen(C, e, layout[e.id]) }));
  const aus = [];
  for (let i = 0; i < boxen.length; i++) {
    for (let j = i + 1; j < boxen.length; j++) if (schneiden(boxen[i].b, boxen[j].b)) aus.push(`${boxen[i].e.id} überlappt ${boxen[j].e.id}`);
  }
  const linien = alle.filter((e) => e.art === 'attribut').map((e) => ({ p: layout[e.id], q: layout[e.besitzer.id], enden: [e.id, e.besitzer.id], name: `Linie ${e.id}` }));
  const plaettchen = [];
  for (const e of alle.filter((x) => x.art === 'beziehung')) {
    for (const k of C.kanten(e.el, layout, ents)) {
      linien.push({ p: k.start, q: k.bis, enden: [e.id, k.ende.entitaet], name: `Kante ${e.id}→${k.ende.entitaet}` });
      if (k.ende.kard) plaettchen.push({ name: `Plättchen ${e.id}/${k.ende.entitaet}`, b: { x0: k.mitte.x - 12, x1: k.mitte.x + 12, y0: k.mitte.y - 12, y1: k.mitte.y + 12 } });
    }
  }
  for (const l of linien) {
    for (const { e, b } of boxen) {
      if (l.enden.includes(e.id)) continue;
      if (streckeTrifft(l.p, l.q, { x0: b.x0 + 4, x1: b.x1 - 4, y0: b.y0 + 4, y1: b.y1 - 4 })) aus.push(`${l.name} kreuzt ${e.id}`);
    }
  }
  for (const pl of plaettchen) for (const { e, b } of boxen) if (schneiden(pl.b, b)) aus.push(`${pl.name} liegt auf ${e.id}`);
  return aus;
}

function layoutsDerAkte(datei) {
  const akte = JSON.parse(lies(`seed/akten/${datei}`));
  const faelle = [];
  for (const l of akte.levels) (l.intro || []).forEach((b, i) => b.t === 'er' && faelle.push({ name: `${l.id} intro[${i}]`, graph: b.graph, layout: b.layout }));
  for (const a of akte.aufgaben) {
    const teile = Array.isArray(a.interaktion) ? a.interaktion : [a.interaktion];
    const loesungen = Array.isArray(a.interaktion) ? a.loesung || [] : [a.loesung];
    (a.inhalt || []).forEach((b, i) => b.t === 'er' && faelle.push({ name: `${a.id} inhalt[${i}]`, graph: b.graph, layout: b.layout }));
    teile.forEach((ia, ti) => {
      if (ia && ia.start && ia.start.graph) faelle.push({ name: `${a.id} start`, graph: ia.start.graph, layout: ia.start.layout });
      const lo = loesungen[ti];
      if (ia && ia.kind === 'er' && lo && Array.isArray(lo.muster)) lo.muster.forEach((m, mi) => faelle.push({ name: `${a.id} muster[${mi}] (automatisch)`, graph: m, layout: null }));
    });
  }
  return faelle;
}

test('ER-Layouts der Akte 5 (von Hand und automatisch) ohne Überlappungen und gekreuzte Elemente', async () => {
  const C = await ladeChen();
  const faelle = layoutsDerAkte('akte5.json');
  assert.ok(faelle.length >= 30, `Anzahl Layouts: ${faelle.length}`);
  const fehler = [];
  for (const f of faelle) {
    const layout = f.layout ? f.layout : C.ergaenzeLayout(f.graph, {});
    for (const k of kollisionen(C, f.graph, layout)) fehler.push(`${f.name}: ${k}`);
  }
  assert.deepEqual(fehler, []);
});

test('ergaenzeLayout: Attribute meiden Beziehungskanten und Kardinalitäts-Plättchen', async () => {
  const C = await ladeChen();
  // Ermittler mit drei Attributen, zwei Beziehungen zu Lehrgang und eine rekursive (wie A5-E2-07)
  const graph = {
    entitaeten: [
      { id: 'm1', name: 'Ermittler', attribute: [{ name: 'ErmittlerNr', schluessel: true }, { name: 'Name' }, { name: 'Dienstgrad' }] },
      { id: 'm2', name: 'Lehrgang', attribute: [{ name: 'LehrgangNr', schluessel: true }, { name: 'Thema' }, { name: 'Beginn' }] }
    ],
    beziehungen: [
      { id: 'b1', name: 'besucht', enden: [{ entitaet: 'm1', kard: 'n' }, { entitaet: 'm2', kard: 'm' }], attribute: [{ name: 'Note' }] },
      { id: 'b2', name: 'leitet', enden: [{ entitaet: 'm1', kard: '1' }, { entitaet: 'm2', kard: 'n' }], attribute: [] },
      { id: 'b3', name: 'betreut', enden: [{ entitaet: 'm1', kard: '1', rolle: 'Mentor' }, { entitaet: 'm1', kard: 'n', rolle: 'Neuling' }], attribute: [] }
    ]
  };
  assert.deepEqual(kollisionen(C, graph, C.ergaenzeLayout(graph, {})), []);
});
