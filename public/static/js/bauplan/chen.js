// Chen-Zeichenmodul (Plan Phase 5 Task 3/4; DESIGN.md §4.14, AUFGABENFORMAT §5.7): ER-Diagramme und Mengendiagramme
// als SVG – reine Darstellung, ohne Abhängigkeiten (auch nicht von kern/render.js, das dieses Modul selbst lädt).
//   Entitätstyp  Rechteck 160 × 60, Name Condensed 700
//   Beziehungstyp Raute (Breite 120–160), Name kursiv
//   Attribut     Ellipse, Schlüsselattribut unterstrichen + 600
//   Kante        gerade Linie; rekursiv: zwei Kanten zu den seitlichen Raute-Ecken; ternär: drei Kanten
//   Kardinalität Plättchen (1/n/m/p) mittig auf der Kante zwischen Entitätstyp und Raute; Rolle daneben
// Jedes Element ist eine Gruppe <g data-id="…"> mit <title> (und optional tabindex/role/aria-label) – die Ids folgen
// dem Aufgabenformat (Entitäts-/Beziehungstypen: ihre id, Attribute `<id>.<Index>`). Texte nur als Textknoten,
// Positionen nur über SVG-Attribute (CSP: keine Inline-Styles). Farben kommen aus bauplan.css (Tokens).

const SVG_NS = 'http://www.w3.org/2000/svg';

export const MASSE = Object.freeze({
  entB: 160,
  entH: 60,
  rauteH: 74,
  rauteMin: 120,
  rauteMax: 160,
  attrRy: 22,
  plaettchen: 28,
  rand: 36
});
export const KARDINALITAETEN = Object.freeze(['1', 'n', 'm', 'p']);

const istObjekt = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const text = (v) => (v === null || v === undefined ? '' : String(v));

/** SVG-Element mit Attributen (Werte als Zeichenketten) und Klasse. */
export function svgEl(tag, attribute = {}, klasse) {
  const e = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attribute)) if (v !== undefined && v !== null) e.setAttribute(k, String(v));
  if (klasse) e.setAttribute('class', klasse);
  return e;
}

function textEl(inhalt, attribute, klasse) {
  const t = svgEl('text', attribute, klasse);
  t.textContent = text(inhalt);
  return t;
}

export const attributId = (elementId, index) => `${elementId}.${index}`;

/** Breite der Raute je Name (120–160). */
export function rauteBreite(name) {
  return Math.max(MASSE.rauteMin, Math.min(MASSE.rauteMax, 44 + text(name).length * 9.5));
}

/** Halbachse der Attribut-Ellipse je Name. */
export function attrRx(name) {
  return Math.max(46, Math.min(104, 18 + text(name).length * 4.7));
}

/** Liste der Elemente eines Graphen: { id, art: 'entitaet'|'beziehung'|'attribut', el, besitzer?, index? }. */
export function elemente(graph) {
  const aus = [];
  const g = istObjekt(graph) ? graph : {};
  const attr = (el) =>
    (Array.isArray(el.attribute) ? el.attribute : []).forEach((a, i) => aus.push({ id: attributId(el.id, i), art: 'attribut', el: a, besitzer: el, index: i }));
  for (const e of Array.isArray(g.entitaeten) ? g.entitaeten : []) {
    if (!istObjekt(e)) continue;
    aus.push({ id: text(e.id), art: 'entitaet', el: e });
  }
  for (const b of Array.isArray(g.beziehungen) ? g.beziehungen : []) {
    if (!istObjekt(b)) continue;
    aus.push({ id: text(b.id), art: 'beziehung', el: b });
  }
  for (const e of Array.isArray(g.entitaeten) ? g.entitaeten : []) if (istObjekt(e)) attr(e);
  for (const b of Array.isArray(g.beziehungen) ? g.beziehungen : []) if (istObjekt(b)) attr(b);
  return aus;
}

/* ---------- Geometrie ---------- */

/** Punkt auf dem Rand eines Rechtecks (Mitte c, halbe Breite/Höhe) in Richtung ziel. */
function rechteckRand(c, hb, hh, ziel) {
  const dx = ziel.x - c.x;
  const dy = ziel.y - c.y;
  if (!dx && !dy) return { x: c.x, y: c.y };
  const t = Math.min(dx ? hb / Math.abs(dx) : Infinity, dy ? hh / Math.abs(dy) : Infinity);
  return { x: c.x + dx * Math.min(1, t), y: c.y + dy * Math.min(1, t) };
}

/** Punkt auf dem Rand einer Raute (Mitte c, halbe Breite/Höhe) in Richtung ziel. */
function rautenRand(c, hb, hh, ziel) {
  const dx = ziel.x - c.x;
  const dy = ziel.y - c.y;
  if (!dx && !dy) return { x: c.x, y: c.y };
  const t = 1 / (Math.abs(dx) / hb + Math.abs(dy) / hh);
  return { x: c.x + dx * Math.min(1, t), y: c.y + dy * Math.min(1, t) };
}

/** Kanten eines Beziehungstyps: [{ ende, index, von, bis, mitte, normal }] (nur Enden mit bekanntem Entitätstyp). */
export function kanten(bez, layout, entitaetenIds) {
  const p = layout[bez.id];
  if (!p) return [];
  const hb = rauteBreite(bez.name) / 2;
  const hh = MASSE.rauteH / 2;
  const enden = Array.isArray(bez.enden) ? bez.enden : [];
  const zaehler = new Map();
  for (const e of enden) zaehler.set(e.entitaet, (zaehler.get(e.entitaet) || 0) + 1);
  const gesehen = new Map();
  const aus = [];
  enden.forEach((ende, index) => {
    const q = layout[ende.entitaet];
    if (!q || !entitaetenIds.has(ende.entitaet)) return;
    let bis;
    if (zaehler.get(ende.entitaet) > 1) {
      // rekursiv: erste Kante zur linken, zweite zur rechten Raute-Ecke (dritte: untere Ecke)
      const nr = gesehen.get(ende.entitaet) || 0;
      gesehen.set(ende.entitaet, nr + 1);
      bis = nr === 0 ? { x: p.x - hb, y: p.y } : nr === 1 ? { x: p.x + hb, y: p.y } : { x: p.x, y: p.y + hh };
    } else {
      bis = rautenRand(p, hb, hh, q);
    }
    const von = rechteckRand(q, MASSE.entB / 2, MASSE.entH / 2, bis);
    const mitte = { x: (von.x + bis.x) / 2, y: (von.y + bis.y) / 2 };
    const laenge = Math.hypot(bis.x - von.x, bis.y - von.y) || 1;
    aus.push({ ende, index, start: q, von, bis, mitte, normal: { x: -(bis.y - von.y) / laenge, y: (bis.x - von.x) / laenge } });
  });
  return aus;
}

/** Ausdehnung eines Elements um seinen Mittelpunkt (halbe Breite/Höhe). */
function ausdehnung(e) {
  if (e.art === 'entitaet') return { hb: MASSE.entB / 2, hh: MASSE.entH / 2 };
  if (e.art === 'beziehung') return { hb: rauteBreite(e.el.name) / 2, hh: MASSE.rauteH / 2 };
  return { hb: attrRx(e.el.name), hh: MASSE.attrRy };
}

/** Umgebendes Rechteck aller Elemente mit Position: { x, y, b, h } (oder null). */
export function grenzen(graph, layout) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const e of elemente(graph)) {
    const p = layout[e.id];
    if (!p) continue;
    const { hb, hh } = ausdehnung(e);
    x0 = Math.min(x0, p.x - hb);
    y0 = Math.min(y0, p.y - hh);
    x1 = Math.max(x1, p.x + hb);
    y1 = Math.max(y1, p.y + hh);
  }
  if (x0 === Infinity) return null;
  return { x: x0, y: y0, b: x1 - x0, h: y1 - y0 };
}

const GRENZE = 5000;
const klemme = (v) => Math.max(0, Math.min(GRENZE, Math.round(v)));

/** Freie Position für ein Attribut rund um seinen Besitzer (Plätze auf zwei Ringen). */
export function attributPlatz(besitzer, art, belegt) {
  const ringe = art === 'beziehung' ? [[125, 95], [185, 135]] : [[150, 100], [215, 150]];
  // Winkel (Grad, 0 = rechts, −90 = oben); Entitätstypen zuerst oben, Beziehungstypen zuerst unten
  const winkel = art === 'beziehung' ? [90, 55, 125, 20, 160, -90, -20, -160] : [-90, -60, -120, -30, -150, 0, 180, 30, 150, 90];
  const frei = (x, y) => belegt.every((q) => Math.abs(q.x - x) > 95 || Math.abs(q.y - y) > 44);
  for (const [rx, ry] of ringe) {
    for (const w of winkel) {
      const x = besitzer.x + rx * Math.cos((w * Math.PI) / 180);
      const y = besitzer.y + ry * Math.sin((w * Math.PI) / 180);
      if (x < 40 || y < 30) continue;
      if (frei(x, y)) return { x: klemme(x), y: klemme(y) };
    }
  }
  return { x: klemme(besitzer.x + 60), y: klemme(besitzer.y + 120) };
}

/**
 * Fehlende Positionen ergänzen (vorhandene bleiben): Entitätstypen im Raster, Beziehungstypen in der Mitte ihrer
 * Entitätstypen (rekursiv darunter), Attribute rund um ihren Besitzer. Liefert ein neues Layout-Objekt.
 */
export function ergaenzeLayout(graph, layout = {}) {
  const aus = {};
  const alle = elemente(graph);
  const ids = new Set(alle.map((e) => e.id));
  for (const [id, p] of Object.entries(istObjekt(layout) ? layout : {})) {
    if (ids.has(id) && istObjekt(p) && Number.isFinite(p.x) && Number.isFinite(p.y)) aus[id] = { x: p.x, y: p.y };
  }
  const belegt = () => Object.values(aus);
  const frei = (x, y, abstandX, abstandY) => belegt().every((q) => Math.abs(q.x - x) > abstandX || Math.abs(q.y - y) > abstandY);
  // Entitätstypen: Raster mit 3 Spalten
  let platz = 0;
  for (const e of alle.filter((x) => x.art === 'entitaet')) {
    if (aus[e.id]) continue;
    for (;;) {
      const x = 160 + (platz % 3) * 400;
      const y = 200 + Math.floor(platz / 3) * 330;
      platz++;
      if (frei(x, y, 180, 90) || platz > 200) {
        aus[e.id] = { x, y };
        break;
      }
    }
  }
  // Beziehungstypen: Schwerpunkt der Entitätstypen
  for (const e of alle.filter((x) => x.art === 'beziehung')) {
    if (aus[e.id]) continue;
    const punkte = (e.el.enden || []).map((x) => aus[x.entitaet]).filter(Boolean);
    let x;
    let y;
    if (!punkte.length) {
      x = 360;
      y = 120;
    } else {
      x = punkte.reduce((s, q) => s + q.x, 0) / punkte.length;
      y = punkte.reduce((s, q) => s + q.y, 0) / punkte.length;
      const verschieden = new Set((e.el.enden || []).map((q) => q.entitaet)).size;
      if (verschieden === 1) y += 200;
    }
    let versuch = 0;
    while (!frei(x, y, 120, 60) && versuch < 12) {
      y += versuch % 2 ? -110 * (versuch + 1) : 110 * (versuch + 1);
      versuch++;
    }
    aus[e.id] = { x: klemme(x), y: klemme(y) };
  }
  // Attribute
  for (const e of alle.filter((x) => x.art === 'attribut')) {
    if (aus[e.id]) continue;
    const b = aus[e.besitzer.id] || { x: 200, y: 200 };
    aus[e.id] = attributPlatz(b, e.besitzer.enden ? 'beziehung' : 'entitaet', belegt());
  }
  return aus;
}

/* ---------- Beschriftungen für Screenreader ---------- */

/** Name oder Ersatz „ohne Namen“. */
export const nameVon = (el) => (text(el && el.name).trim() ? text(el.name).trim() : 'ohne Namen');

export function beschreibung(e, graph) {
  const entitaeten = new Map((graph.entitaeten || []).map((x) => [x.id, x]));
  if (e.art === 'entitaet') {
    const attr = (e.el.attribute || []).map((a) => (a.schluessel ? `${nameVon(a)} (Schlüssel)` : nameVon(a)));
    return `Entitätstyp ${nameVon(e.el)}${attr.length ? `, Attribute: ${attr.join(', ')}` : ', ohne Attribute'}`;
  }
  if (e.art === 'beziehung') {
    const enden = (e.el.enden || []).map((x) => {
      const ziel = entitaeten.get(x.entitaet);
      return `${ziel ? nameVon(ziel) : 'kein Entitätstyp'} (${x.kard ? x.kard : 'Kardinalität offen'}${x.rolle ? `, Rolle ${x.rolle}` : ''})`;
    });
    const attr = (e.el.attribute || []).map(nameVon);
    return `Beziehungstyp ${nameVon(e.el)}${enden.length ? ` zwischen ${enden.join(' und ')}` : ', noch ohne Entitätstypen'}${attr.length ? `, Attribute: ${attr.join(', ')}` : ''}`;
  }
  return `${e.el.schluessel ? 'Schlüsselattribut' : 'Attribut'} ${nameVon(e.el)} von ${nameVon(e.besitzer)}`;
}

/* ---------- Zeichnen ---------- */

/** Text auf eine Breite begrenzen (textLength), wenn die geschätzte Breite zu groß ist. */
function passeEin(t, inhalt, zeichenBreite, max) {
  const breite = text(inhalt).length * zeichenBreite;
  if (breite > max) {
    t.setAttribute('textLength', String(Math.round(max)));
    t.setAttribute('lengthAdjust', 'spacingAndGlyphs');
  }
}

function auswahlRahmen(hb, hh) {
  const g = svgEl('g', { 'aria-hidden': 'true' }, 'chen-auswahl');
  const r = 8;
  g.appendChild(svgEl('rect', { x: -hb - r, y: -hh - r, width: 2 * hb + 2 * r, height: 2 * hh + 2 * r, rx: 3 }, 'chen-auswahl-rahmen'));
  for (const [x, y] of [[-hb - r, -hh - r], [hb + r, -hh - r], [-hb - r, hh + r], [hb + r, hh + r]]) {
    g.appendChild(svgEl('rect', { x: x - 4, y: y - 4, width: 8, height: 8 }, 'chen-griff'));
  }
  return g;
}

function fokusRahmen(hb, hh) {
  return svgEl('rect', { x: -hb - 5, y: -hh - 5, width: 2 * hb + 10, height: 2 * hh + 10, rx: 4, 'aria-hidden': 'true' }, 'chen-fokusrahmen');
}

/**
 * Zeichnet ein ER-Diagramm in ein vorhandenes <svg> (Inhalt wird ersetzt; viewBox setzt der Aufrufer oder opt.viewBox).
 * @param {SVGSVGElement} ziel
 * @param {{ entitaeten, beziehungen }} graph
 * @param {object} layout { id: { x, y } } – fehlende Positionen werden ergänzt (ergaenzeLayout)
 * @param {object} [opt]
 *   bedienbar       Elemente fokussierbar (tabindex 0, role button)
 *   klassen         Map/Objekt id → zusätzliche Klassen (z. B. 'gewaehlt', 'loesung', 'falsch', 'markiert')
 *   auswahl         id des gewählten Elements (Auswahlrahmen mit Griffen)
 *   etiketten       Map id → kurzes Etikett (Lesen-Modus mit Kategorien)
 *   offeneKard      leere Kardinalitäten als „?“-Plättchen zeigen (Editor)
 *   fehlerKard      Set von Beziehungs-Ids, deren Kardinalitäten nach dem Prüfen falsch sind (roter Kreis)
 *   gedrueckt       Set von Ids mit aria-pressed="true" (Antipp-Modus); nur mit bedienbar
 *   viewBox         true: viewBox aus den Grenzen setzen (Blöcke)
 * @returns {{ layout, ids: string[] }} ids in Tab-Reihenfolge
 */
export function zeichne(ziel, graph, layout, opt = {}) {
  const g0 = istObjekt(graph) ? graph : { entitaeten: [], beziehungen: [] };
  const lay = ergaenzeLayout(g0, layout);
  const klassen = opt.klassen instanceof Map ? opt.klassen : new Map(Object.entries(opt.klassen || {}));
  const etiketten = opt.etiketten instanceof Map ? opt.etiketten : new Map(Object.entries(opt.etiketten || {}));
  const fehlerKard = opt.fehlerKard instanceof Set ? opt.fehlerKard : new Set(opt.fehlerKard || []);
  const gedrueckt = opt.gedrueckt instanceof Set ? opt.gedrueckt : null;
  const alle = elemente(g0);
  const entIds = new Set(alle.filter((e) => e.art === 'entitaet').map((e) => e.id));

  const kantenEbene = svgEl('g', { 'aria-hidden': 'true' }, 'chen-kanten');
  const elementEbene = svgEl('g', {}, 'chen-elemente');
  const plaettchenEbene = svgEl('g', { 'aria-hidden': 'true' }, 'chen-plaettchen');

  // Attributlinien
  for (const e of alle.filter((x) => x.art === 'attribut')) {
    const a = lay[e.id];
    const b = lay[e.besitzer.id];
    if (a && b) kantenEbene.appendChild(svgEl('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y }, 'chen-attributlinie'));
  }
  // Beziehungskanten + Kardinalitäten
  for (const e of alle.filter((x) => x.art === 'beziehung')) {
    for (const k of kanten(e.el, lay, entIds)) {
      kantenEbene.appendChild(svgEl('line', { x1: k.start.x, y1: k.start.y, x2: k.bis.x, y2: k.bis.y }, 'chen-kante'));
      const kard = text(k.ende.kard).trim();
      if (kard || opt.offeneKard) {
        const pg = svgEl('g', { transform: `translate(${k.mitte.x.toFixed(1)} ${k.mitte.y.toFixed(1)})` }, 'chen-kard' + (kard ? '' : ' offen'));
        const s = MASSE.plaettchen;
        if (fehlerKard.has(e.id)) pg.appendChild(svgEl('circle', { r: s / 2 + 7 }, 'chen-kard-fehler'));
        pg.appendChild(svgEl('rect', { x: -s / 2, y: -s / 2, width: s, height: s, rx: 4 }, 'chen-kard-flaeche'));
        pg.appendChild(textEl(kard || '?', { x: 0, y: 1, 'text-anchor': 'middle', 'dominant-baseline': 'central' }, 'chen-kard-text'));
        plaettchenEbene.appendChild(pg);
      }
      if (text(k.ende.rolle).trim()) {
        // Rolle neben dem Plättchen, auf der Seite der Kante, die von der Raute wegzeigt
        const p = lay[e.id];
        const versatz = 22;
        const a1 = { x: k.mitte.x + k.normal.x * versatz, y: k.mitte.y + k.normal.y * versatz };
        const a2 = { x: k.mitte.x - k.normal.x * versatz, y: k.mitte.y - k.normal.y * versatz };
        const q = Math.hypot(a1.x - p.x, a1.y - p.y) >= Math.hypot(a2.x - p.x, a2.y - p.y) ? a1 : a2;
        const anker = q.x < k.mitte.x - 4 ? 'end' : q.x > k.mitte.x + 4 ? 'start' : 'middle';
        plaettchenEbene.appendChild(textEl(k.ende.rolle, { x: q.x.toFixed(1), y: q.y.toFixed(1), 'text-anchor': anker, 'dominant-baseline': 'central' }, 'chen-rolle'));
      }
    }
  }

  // Elemente (Tab-Reihenfolge: Entitätstypen, Beziehungstypen, Attribute je Besitzer)
  const ids = [];
  const reihenfolge = alle;
  const tabReihe = [];
  for (const e of alle.filter((x) => x.art !== 'attribut')) {
    tabReihe.push(e.id);
    (e.el.attribute || []).forEach((_, i) => tabReihe.push(attributId(e.id, i)));
  }
  const gruppen = new Map();
  for (const e of reihenfolge) {
    const p = lay[e.id];
    if (!p) continue;
    const zusatz = text(klassen.get(e.id));
    const g = svgEl('g', { 'data-id': e.id, 'data-art': e.art, transform: `translate(${p.x} ${p.y})` }, `chen-el chen-${e.art}${zusatz ? ' ' + zusatz : ''}`);
    const titel = svgEl('title');
    titel.textContent = beschreibung(e, g0);
    g.appendChild(titel);
    const { hb, hh } = ausdehnung(e);
    if (opt.bedienbar) {
      g.setAttribute('tabindex', '0');
      g.setAttribute('role', 'button');
      g.setAttribute('aria-label', beschreibung(e, g0) + (etiketten.get(e.id) ? `, zugeordnet: ${etiketten.get(e.id)}` : ''));
      if (gedrueckt) g.setAttribute('aria-pressed', gedrueckt.has(e.id) ? 'true' : 'false');
      g.appendChild(fokusRahmen(hb, hh));
    }
    if (e.art === 'entitaet') {
      g.appendChild(svgEl('rect', { x: -hb, y: -hh, width: 2 * hb, height: 2 * hh }, 'chen-form'));
      const t = textEl(nameVon(e.el) === 'ohne Namen' ? '…' : e.el.name, { x: 0, y: 1, 'text-anchor': 'middle', 'dominant-baseline': 'central' }, 'chen-name');
      passeEin(t, e.el.name, 11.5, 2 * hb - 14);
      g.appendChild(t);
    } else if (e.art === 'beziehung') {
      g.appendChild(svgEl('polygon', { points: `${-hb},0 0,${-hh} ${hb},0 0,${hh}` }, 'chen-form'));
      const t = textEl(nameVon(e.el) === 'ohne Namen' ? '…' : e.el.name, { x: 0, y: 1, 'text-anchor': 'middle', 'dominant-baseline': 'central' }, 'chen-name');
      passeEin(t, e.el.name, 9.4, 2 * hb - 46);
      g.appendChild(t);
    } else {
      g.appendChild(svgEl('ellipse', { cx: 0, cy: 0, rx: hb, ry: hh }, 'chen-form'));
      const t = textEl(nameVon(e.el) === 'ohne Namen' ? '…' : e.el.name, { x: 0, y: 1, 'text-anchor': 'middle', 'dominant-baseline': 'central' }, 'chen-name' + (e.el.schluessel ? ' chen-schluessel' : ''));
      passeEin(t, e.el.name, 8.6, 2 * hb - 16);
      g.appendChild(t);
    }
    if (etiketten.get(e.id)) {
      const et = svgEl('g', { transform: `translate(0 ${-hh - 14})`, 'aria-hidden': 'true' }, 'chen-etikett');
      const inhalt = text(etiketten.get(e.id));
      const b = Math.max(36, inhalt.length * 7.6 + 16);
      et.appendChild(svgEl('rect', { x: -b / 2, y: -11, width: b, height: 22, rx: 11 }, 'chen-etikett-flaeche'));
      et.appendChild(textEl(inhalt, { x: 0, y: 1, 'text-anchor': 'middle', 'dominant-baseline': 'central' }, 'chen-etikett-text'));
      g.appendChild(et);
    }
    if (opt.auswahl === e.id) g.appendChild(auswahlRahmen(hb, hh));
    gruppen.set(e.id, g);
  }
  for (const id of tabReihe) if (gruppen.has(id)) ids.push(id);
  // DOM-Reihenfolge = Tab-Reihenfolge (Element, danach seine Attribute)
  for (const id of ids) elementEbene.appendChild(gruppen.get(id));

  ziel.replaceChildren(kantenEbene, elementEbene, plaettchenEbene);
  if (opt.viewBox) {
    const r = grenzen(g0, lay) || { x: 0, y: 0, b: 400, h: 200 };
    const rand = MASSE.rand;
    const vx = Math.floor(r.x - rand);
    const vy = Math.floor(r.y - rand);
    const vb = Math.ceil(r.b + 2 * rand);
    const vh = Math.ceil(r.h + 2 * rand);
    ziel.setAttribute('viewBox', `${vx} ${vy} ${vb} ${vh}`);
    ziel.setAttribute('width', String(vb));
    ziel.setAttribute('height', String(vh));
  }
  return { layout: lay, ids };
}

/* ---------- Mengendiagramm ---------- */

/**
 * Mengendiagramm (Block `mengen`): zwei Ovale mit Elementen, Linien zwischen verbundenen Elementen.
 * @returns {SVGSVGElement}
 */
export function zeichneMengen(b) {
  const links = istObjekt(b.links) ? b.links : { name: '', elemente: [] };
  const rechts = istObjekt(b.rechts) ? b.rechts : { name: '', elemente: [] };
  const l = Array.isArray(links.elemente) ? links.elemente : [];
  const r = Array.isArray(rechts.elemente) ? rechts.elemente : [];
  const n = Math.max(1, l.length, r.length);
  const zeile = 36;
  const breite = 520;
  const kopf = 44;
  const ry = (n * zeile) / 2 + 28;
  const hoehe = kopf + 2 * ry + 16;
  const cy = kopf + ry;
  const cxL = 130;
  const cxR = breite - 130;
  const s = svgEl('svg', { viewBox: `0 0 ${breite} ${Math.ceil(hoehe)}`, width: breite, height: Math.ceil(hoehe), role: 'img', focusable: 'false' }, 'mengen-svg');
  const titel = svgEl('title');
  titel.textContent = `Mengendiagramm ${text(links.name)} und ${text(rechts.name)}`;
  s.appendChild(titel);
  s.appendChild(svgEl('ellipse', { cx: cxL, cy, rx: 112, ry }, 'mengen-oval'));
  s.appendChild(svgEl('ellipse', { cx: cxR, cy, rx: 112, ry }, 'mengen-oval'));
  s.appendChild(textEl(links.name, { x: cxL, y: 22, 'text-anchor': 'middle', 'dominant-baseline': 'central' }, 'mengen-name'));
  s.appendChild(textEl(rechts.name, { x: cxR, y: 22, 'text-anchor': 'middle', 'dominant-baseline': 'central' }, 'mengen-name'));
  const yVon = (i, anzahl) => cy - ((anzahl - 1) * zeile) / 2 + i * zeile;
  const punktL = (i) => ({ x: cxL + 58, y: yVon(i, l.length) });
  const punktR = (j) => ({ x: cxR - 58, y: yVon(j, r.length) });
  const linienEbene = svgEl('g', {}, 'mengen-linien');
  for (const paar of Array.isArray(b.linien) ? b.linien : []) {
    if (!Array.isArray(paar) || !(paar[0] < l.length) || !(paar[1] < r.length)) continue;
    const a = punktL(paar[0]);
    const c = punktR(paar[1]);
    linienEbene.appendChild(svgEl('line', { x1: a.x, y1: a.y, x2: c.x, y2: c.y }, 'mengen-linie'));
  }
  s.appendChild(linienEbene);
  l.forEach((w, i) => {
    const p = punktL(i);
    s.appendChild(textEl(w, { x: p.x - 16, y: p.y, 'text-anchor': 'end', 'dominant-baseline': 'central' }, 'mengen-element'));
    s.appendChild(svgEl('circle', { cx: p.x, cy: p.y, r: 5 }, 'mengen-punkt'));
  });
  r.forEach((w, j) => {
    const p = punktR(j);
    s.appendChild(svgEl('circle', { cx: p.x, cy: p.y, r: 5 }, 'mengen-punkt'));
    s.appendChild(textEl(w, { x: p.x + 16, y: p.y, 'text-anchor': 'start', 'dominant-baseline': 'central' }, 'mengen-element'));
  });
  return s;
}
