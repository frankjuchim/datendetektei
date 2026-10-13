// Illustrationen der Beweisstücke (DESIGN.md §4.3, §8; STORY.md §4.1–4.7): flache SVG-Motive auf dunklem Grund
// (#20303F, Polaroid-Bild), 100 × 100. Nur DOM-Knoten (createElementNS), keine Zeichenketten als HTML.
// Namen wie in seed/fallebene.json (bild): fundbuch, schloss, bon, ausweis, netz, steckbrief, lizenz.

const NS = 'http://www.w3.org/2000/svg';
const PAPIER = '#F4EDE1';
const LINIE = '#8F8270';
const STIFT = '#46525E';
const MARKER = '#F2D35A';
const ROT = '#C8423A';
const MESSING = '#D4B062';

function s(tag, attr = {}, kinder = []) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attr)) e.setAttribute(k, String(v));
  for (const k of kinder) e.appendChild(k);
  return e;
}

function text(t, attr) {
  const e = s('text', { 'font-family': 'IBM Plex Mono, monospace', ...attr });
  e.textContent = t;
  return e;
}

/** Kleiner Nachtfalter (Signatur des Phantoms) an Position x/y. */
function falter(x, y, farbe = STIFT, gross = 1) {
  const g = s('g', { transform: `translate(${x} ${y}) scale(${gross})`, fill: 'none', stroke: farbe, 'stroke-width': 1.1, 'stroke-linecap': 'round' });
  g.appendChild(s('path', { d: 'M0 -4v8' }));
  g.appendChild(s('path', { d: 'M0 -1c-2-3-6-3-6-1s3 2 6 2c3 0 6 0 6-2s-4-2-6 1' }));
  g.appendChild(s('path', { d: 'M0 0c-2 0-5 1-4 3s4 0 4-2M0 0c2 0 5 1 4 3s-4 0-4-2' }));
  return g;
}

const MOTIVE = {
  fundbuch() {
    return [
      s('rect', { x: 18, y: 12, width: 64, height: 78, rx: 2, fill: PAPIER }),
      s('rect', { x: 24, y: 43, width: 52, height: 7, fill: MARKER, opacity: 0.85 }),
      s('path', { d: 'M26 24h48M26 34h48M26 46.5h48M26 58h48M26 68h36', stroke: LINIE, 'stroke-width': 2.2 }),
      falter(72, 80)
    ];
  },
  schloss() {
    return [
      s('circle', { cx: 18, cy: 16, r: 3, fill: MARKER, opacity: 0.5 }),
      s('circle', { cx: 84, cy: 20, r: 2.5, fill: MARKER, opacity: 0.4 }),
      s('rect', { x: 22, y: 26, width: 56, height: 62, rx: 6, fill: '#3A4A5A' }),
      s('rect', { x: 28, y: 32, width: 44, height: 26, rx: 2, fill: '#0F1A12' }),
      text('ENTSPERRT', { x: 50, y: 42, 'text-anchor': 'middle', 'font-size': 6.5, fill: '#8FE3A0' }),
      text('KONTO 77', { x: 50, y: 52, 'text-anchor': 'middle', 'font-size': 6.5, fill: '#8FE3A0' }),
      s('rect', { x: 32, y: 64, width: 36, height: 14, rx: 2, fill: '#26323D' }),
      falter(66, 80, MARKER, 1.1)
    ];
  },
  bon() {
    return [
      s('path', { d: 'M28 10h44v76l-4-3-4 3-4-3-4 3-4-3-4 3-4-3-4 3-4-3-4 3-4-3z', fill: PAPIER }),
      text('KAFFEEMOBIL', { x: 50, y: 22, 'text-anchor': 'middle', 'font-size': 5.6, fill: STIFT }),
      s('path', { d: 'M33 30h34M33 38h26M33 46h30', stroke: LINIE, 'stroke-width': 2 }),
      text('0 × 2,50', { x: 33, y: 58, 'font-size': 6, fill: ROT }),
      text('0,00 €', { x: 67, y: 72, 'text-anchor': 'end', 'font-size': 7, 'font-weight': 600, fill: STIFT })
    ];
  },
  ausweis() {
    return [
      s('rect', { x: 12, y: 26, width: 76, height: 50, rx: 5, fill: PAPIER }),
      s('rect', { x: 12, y: 26, width: 76, height: 10, rx: 5, fill: '#2F6B4F' }),
      s('rect', { x: 18, y: 42, width: 22, height: 28, rx: 2, fill: '#D8CEBC' }),
      falter(29, 56, STIFT, 1.3),
      s('path', { d: 'M46 46h34M46 55h28M46 64h20', stroke: LINIE, 'stroke-width': 2.2 })
    ];
  },
  netz() {
    const punkte = [[20, 22], [80, 22], [20, 78], [80, 78]];
    const kinder = punkte.map(([x, y]) => s('line', { x1: x, y1: y, x2: 50, y2: 50, stroke: ROT, 'stroke-width': 1.8 }));
    for (const [x, y] of punkte) kinder.push(s('rect', { x: x - 9, y: y - 7, width: 18, height: 14, rx: 1.5, fill: PAPIER }));
    kinder.push(s('rect', { x: 37, y: 41, width: 26, height: 18, rx: 1.5, fill: MARKER }));
    kinder.push(text('N. F.?', { x: 50, y: 53, 'text-anchor': 'middle', 'font-size': 6.5, 'font-weight': 600, fill: STIFT }));
    return kinder;
  },
  steckbrief() {
    return [
      s('rect', { x: 20, y: 10, width: 60, height: 80, rx: 2, fill: PAPIER }),
      text('GESUCHT', { x: 50, y: 21, 'text-anchor': 'middle', 'font-size': 7.5, 'font-weight': 700, fill: STIFT }),
      s('circle', { cx: 50, cy: 38, r: 8, fill: '#9AA3AC' }),
      s('path', { d: 'M34 60c1-9 7-13 16-13s15 4 16 13z', fill: '#9AA3AC' }),
      s('path', { d: 'M28 68h44M28 76h32', stroke: LINIE, 'stroke-width': 2 }),
      s('rect', { x: 58, y: 70, width: 26, height: 18, rx: 1.5, fill: '#A0784A', transform: 'rotate(8 71 79)' }),
      falter(71, 79, PAPIER, 0.9)
    ];
  },
  lizenz() {
    return [
      s('rect', { x: 14, y: 16, width: 62, height: 46, rx: 2, fill: PAPIER }),
      s('path', { d: 'M22 28h46M22 36h40M22 44h30', stroke: LINIE, 'stroke-width': 2 }),
      s('circle', { cx: 62, cy: 52, r: 7, fill: 'none', stroke: ROT, 'stroke-width': 1.8 }),
      s('rect', { x: 22, y: 68, width: 30, height: 12, rx: 2, fill: 'none', stroke: '#5FAF86', 'stroke-width': 2, transform: 'rotate(-6 37 74)' }),
      s('path', { d: 'M66 72h16v12a8 8 0 0 1-16 0z', fill: MESSING }),
      s('path', { d: 'M82 76c4 0 4 6 0 6', fill: 'none', stroke: MESSING, 'stroke-width': 2 })
    ];
  }
};

/** SVG-Illustration eines Beweisstücks (unbekannter Name → Fragezeichen). */
export function beweisBild(name, beschriftung) {
  const wurzel = s('svg', { viewBox: '0 0 100 100', role: 'img', 'aria-label': beschriftung || 'Beweisstück' }, []);
  const motiv = MOTIVE[name];
  if (motiv) for (const k of motiv()) wurzel.appendChild(k);
  else wurzel.appendChild(text('?', { x: 50, y: 62, 'text-anchor': 'middle', 'font-size': 36, fill: PAPIER }));
  return wurzel;
}

export const BILDER = Object.freeze(Object.keys(MOTIVE));
