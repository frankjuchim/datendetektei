// Bauplan-Tisch (Plan Phase 5 Task 4; Spec §7.6.4, DESIGN.md §4.14, §5.7, §6, §7): ER-Editor in Chen-Notation.
//   Zeichnen: Karopapier-SVG, Werkzeugleiste (+Entitätstyp, +Beziehungstyp, +Attribut, Verbinden, Zoom), Auswahl mit
//             Eigenschaften-Panel, Ziehen und Verschieben per Pointer Events (Maus, Stift, Finger), Zoomen (Knöpfe,
//             Strg + Mausrad), Tastatur: Tab durch die Elemente, Enter/Leertaste wählt, Pfeiltasten verschieben
//             (mit Umschalt weiter), Entf löscht, Esc hebt die Auswahl auf.
//   Liste:    dieselben Daten als Formular-Karten (je Entitätstyp Attribute + Schlüssel, je Beziehungstyp Enden +
//             Kardinalität + Rolle + Attribute) – barrierearm, erzeugt dasselbe JSON.
// Modi: ergaenzen (Startdiagramm; dessen Elemente, Namen, Attribute und Enden bleiben), entwickeln (leer), frei
// (Werkzeugseite, ohne Prüfung). Graph-Format wie AUFGABENFORMAT §5.7; das Layout bleibt im Browser (Entwurf im
// localStorage je Aufgabe). Prüfergebnis: Kriterienliste ✔/✘ mit Fallen-Plakette, Zähler „4 von 6“, Stempel GELÖST.
// Nur Textknoten; Positionen über SVG-Attribute (CSP).

const V = new URL(import.meta.url).search;
const [C, B, R] = await Promise.all([import('./chen.js' + V), import('./block.js' + V), import('../kern/render.js' + V)]);
const { el, h, knopf } = R;

export const GRENZEN = Object.freeze({ elemente: 30, attribute: 30, name: 40, enden: 3 });
const KARD_OPTIONEN = ['', '1', 'n', 'm', 'p'];
const ANSICHT_SCHLUESSEL = 'dd-bauplan-ansicht';
const SCHRITT = 10;
const SCHRITT_GROSS = 40;
const MIN_B = 620;
const MIN_H = 380;

const istObjekt = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const s = (v) => (v === null || v === undefined ? '' : String(v));
const klemme = (v) => Math.max(0, Math.min(5000, Math.round(v)));
const normName = (v) => s(v).trim().toLowerCase();

function lies(schluessel) {
  if (!schluessel) return null;
  try {
    const roh = window.localStorage.getItem(schluessel);
    return roh === null ? null : JSON.parse(roh);
  } catch {
    return null;
  }
}
function schreib(schluessel, wert) {
  if (!schluessel) return;
  try {
    if (wert === null) window.localStorage.removeItem(schluessel);
    else window.localStorage.setItem(schluessel, JSON.stringify(wert));
  } catch {
    /* privater Modus – der Entwurf bleibt nur bis zum Neuladen */
  }
}

/** Graph in die Arbeitsform bringen (fehlende Felder ergänzen, Grenzen einhalten). */
export function normalisiere(roh) {
  const g = istObjekt(roh) ? roh : {};
  const liste = (x) => (Array.isArray(x) ? x.slice(0, GRENZEN.elemente) : []);
  const name = (x) => s(x).slice(0, GRENZEN.name);
  const entitaeten = liste(g.entitaeten)
    .filter(istObjekt)
    .map((e) => ({
      id: s(e.id),
      name: name(e.name),
      attribute: liste(e.attribute).filter(istObjekt).map((a) => ({ name: name(a.name), schluessel: a.schluessel === true }))
    }));
  const beziehungen = liste(g.beziehungen)
    .filter(istObjekt)
    .map((b) => ({
      id: s(b.id),
      name: name(b.name),
      enden: (Array.isArray(b.enden) ? b.enden : []).slice(0, GRENZEN.enden).filter(istObjekt).map((x) => ({ entitaet: s(x.entitaet), kard: s(x.kard).trim().slice(0, 2), rolle: name(x.rolle) })),
      attribute: liste(b.attribute).filter(istObjekt).map((a) => ({ name: name(a.name) }))
    }));
  return { entitaeten, beziehungen };
}

/** Antwortform (AUFGABENFORMAT §7): Namen getrimmt, Enden nur mit vorhandenem Entitätstyp, Rolle nur wenn gesetzt. */
export function antwortForm(graph) {
  const ids = new Set(graph.entitaeten.map((e) => e.id));
  return {
    entitaeten: graph.entitaeten.map((e) => ({ id: e.id, name: e.name.trim(), attribute: e.attribute.map((a) => ({ name: a.name.trim(), schluessel: a.schluessel === true })) })),
    beziehungen: graph.beziehungen.map((b) => ({
      id: b.id,
      name: b.name.trim(),
      enden: b.enden.filter((x) => ids.has(x.entitaet)).map((x) => (x.rolle.trim() ? { entitaet: x.entitaet, kard: x.kard, rolle: x.rolle.trim() } : { entitaet: x.entitaet, kard: x.kard })),
      attribute: b.attribute.map((a) => ({ name: a.name.trim() }))
    }))
  };
}

/** Vergleichsform (ohne Ids): für „unverändert wie der Start“. */
function vergleichsForm(graph) {
  const a = antwortForm(normalisiere(graph));
  const namen = new Map(a.entitaeten.map((e) => [e.id, normName(e.name)]));
  return JSON.stringify({
    e: a.entitaeten.map((e) => [normName(e.name), e.attribute.map((x) => normName(x.name) + (x.schluessel ? '*' : '')).sort()]).sort(),
    b: a.beziehungen.map((b) => [normName(b.name), b.enden.map((x) => `${namen.get(x.entitaet)}|${x.kard}|${normName(x.rolle)}`).sort(), b.attribute.map((x) => normName(x.name)).sort()]).sort()
  });
}

/** Namen einer Beziehung aus einem Kriterien-Teiltext („„leitet“ (zwischen …): Kardinalität falsch.“). */
function nameAusTeil(text) {
  const m = /^„([^“]+)“/.exec(s(text));
  return m ? m[1] : null;
}

/**
 * Bauplan-Tisch erzeugen.
 * @param {object} opt
 *   modus        'ergaenzen' | 'entwickeln' | 'frei'
 *   start        { graph, layout } (nur ergaenzen)
 *   entwurf      localStorage-Schlüssel für Graph + Layout (oder null)
 *   beiAenderung () => void
 *   titel        Überschrift für Screenreader (Standard „Bauplan-Tisch“)
 */
export function erzeugeTisch(opt = {}) {
  const modus = ['ergaenzen', 'entwickeln', 'frei'].includes(opt.modus) ? opt.modus : 'entwickeln';
  const startGraph = modus === 'ergaenzen' && istObjekt(opt.start) ? normalisiere(opt.start.graph) : { entitaeten: [], beziehungen: [] };
  const startLayout = modus === 'ergaenzen' && istObjekt(opt.start) && istObjekt(opt.start.layout) ? opt.start.layout : {};
  const startForm = vergleichsForm(startGraph);

  // Feste Teile des Startdiagramms (ergaenzen): Elemente, vorhandene Namen, Attribute (die ersten k), Enden (die ersten k)
  const fest = { ids: new Set(), namen: new Set(), attribute: new Map(), enden: new Map() };
  for (const e of startGraph.entitaeten) {
    fest.ids.add(e.id);
    if (e.name.trim()) fest.namen.add(e.id);
    fest.attribute.set(e.id, e.attribute.length);
  }
  for (const b of startGraph.beziehungen) {
    fest.ids.add(b.id);
    if (b.name.trim()) fest.namen.add(b.id);
    fest.attribute.set(b.id, b.attribute.length);
    fest.enden.set(b.id, b.enden.length);
  }

  let graph = structuredClone(startGraph);
  let layout = C.ergaenzeLayout(graph, startLayout);
  const gespeichert = lies(opt.entwurf);
  if (gespeichert && istObjekt(gespeichert.graph) && passtZumStart(normalisiere(gespeichert.graph))) {
    graph = normalisiere(gespeichert.graph);
    layout = C.ergaenzeLayout(graph, gespeichert.layout);
  }

  let auswahl = null; // Element-Id (auch Attribut-Id)
  let verbinden = null; // null | { erstes: id|null }
  let gesperrt = false;
  let fehlerKard = new Set();
  let ansicht = 'zeichnen';
  try {
    if (window.localStorage.getItem(ANSICHT_SCHLUESSEL) === 'liste') ansicht = 'liste';
  } catch {
    /* Standard: Zeichnen */
  }

  function passtZumStart(g) {
    if (modus !== 'ergaenzen') return true;
    const ents = new Map(g.entitaeten.map((e) => [e.id, e]));
    const bez = new Map(g.beziehungen.map((b) => [b.id, b]));
    for (const e of startGraph.entitaeten) {
      const x = ents.get(e.id);
      if (!x || (fest.namen.has(e.id) && x.name !== e.name) || x.attribute.length < e.attribute.length) return false;
      if (e.attribute.some((a, i) => x.attribute[i].name !== a.name)) return false;
    }
    for (const b of startGraph.beziehungen) {
      const x = bez.get(b.id);
      if (!x || (fest.namen.has(b.id) && x.name !== b.name) || x.enden.length < b.enden.length || x.attribute.length < b.attribute.length) return false;
    }
    return true;
  }

  /* ---------- Zugriff ---------- */

  const entitaet = (id) => graph.entitaeten.find((e) => e.id === id) || null;
  const beziehung = (id) => graph.beziehungen.find((b) => b.id === id) || null;
  function finde(id) {
    if (id === null || id === undefined) return null;
    const punkt = String(id).lastIndexOf('.');
    if (punkt > 0) {
      const besitzerId = id.slice(0, punkt);
      const index = Number(id.slice(punkt + 1));
      const besitzer = entitaet(besitzerId) || beziehung(besitzerId);
      if (!besitzer || !Number.isInteger(index) || !besitzer.attribute[index]) return null;
      return { art: 'attribut', id, el: besitzer.attribute[index], besitzer, index };
    }
    const e = entitaet(id);
    if (e) return { art: 'entitaet', id, el: e };
    const b = beziehung(id);
    if (b) return { art: 'beziehung', id, el: b };
    return null;
  }
  const besitzerVon = (id) => {
    const f = finde(id);
    if (!f) return null;
    return f.art === 'attribut' ? { art: f.besitzer.enden ? 'beziehung' : 'entitaet', id: f.besitzer.id, el: f.besitzer } : f;
  };
  function loeschbar(id) {
    const f = finde(id);
    if (!f) return false;
    if (f.art === 'attribut') return f.index >= (fest.attribute.get(f.besitzer.id) || 0);
    return !fest.ids.has(id);
  }
  const nameFest = (id) => fest.namen.has(id);
  const attributFest = (besitzerId, i) => i < (fest.attribute.get(besitzerId) || 0);
  const endeFest = (bezId, i) => i < (fest.enden.get(bezId) || 0);

  function neueId(praefix) {
    const belegt = new Set([...graph.entitaeten.map((e) => e.id), ...graph.beziehungen.map((b) => b.id)]);
    let n = 1;
    while (belegt.has(praefix + n)) n++;
    return praefix + n;
  }

  /* ---------- Gerüst ---------- */

  const wurzel = el('section', 'bauplan ansicht-' + ansicht + ' modus-' + modus);
  wurzel.setAttribute('aria-label', opt.titel || 'Bauplan-Tisch');
  const kopf = el('div', 'bp-kopf');
  const segment = el('div', 'segment bp-ansicht');
  segment.setAttribute('role', 'group');
  segment.setAttribute('aria-label', 'Ansicht');
  const kZeichnen = knopf('Zeichnen', 'segment-knopf', 'i-stift');
  const kListe = knopf('Liste', 'segment-knopf', 'i-liste');
  kZeichnen.dataset.ansicht = 'zeichnen';
  kListe.dataset.ansicht = 'liste';
  segment.append(kZeichnen, kListe);
  const kopfText = el('p', 'bp-kopf-text', modus === 'ergaenzen' ? 'Ergänze das vorgegebene Diagramm. Vorgegebene Elemente bleiben stehen.' : 'Zeichne den Bauplan in Chen-Notation.');
  kopf.append(kopfText, segment);

  const handyHinweis = h('p', 'bp-handy-hinweis', 'Auf dem Handy geht es im Listenmodus leichter. ');
  const zurListe = el('button', 'knopf-link', 'Zur Liste wechseln');
  zurListe.type = 'button';
  zurListe.addEventListener('click', () => setzeAnsicht('liste', true));
  handyHinweis.appendChild(zurListe);

  // Werkzeugleiste
  const leiste = el('div', 'bp-werkzeuge');
  leiste.setAttribute('role', 'toolbar');
  leiste.setAttribute('aria-label', 'Werkzeuge des Bauplan-Tischs');
  const kEnt = knopf('Entitätstyp', 'knopf', 'i-plus');
  const kBez = knopf('Beziehungstyp', 'knopf', 'i-plus');
  const kAttr = knopf('Attribut', 'knopf', 'i-plus');
  const kVerb = knopf('Verbinden', 'knopf', 'i-verbinden');
  kEnt.dataset.werkzeug = 'entitaet';
  kBez.dataset.werkzeug = 'beziehung';
  kAttr.dataset.werkzeug = 'attribut';
  kVerb.dataset.werkzeug = 'verbinden';
  kEnt.setAttribute('aria-label', 'Entitätstyp hinzufügen');
  kBez.setAttribute('aria-label', 'Beziehungstyp hinzufügen');
  kAttr.setAttribute('aria-label', 'Attribut zum gewählten Element hinzufügen');
  kVerb.setAttribute('aria-pressed', 'false');
  const zoom = el('div', 'bp-zoom');
  const kKleiner = knopf('−', 'knopf leise bp-zoom-knopf');
  const kGroesser = knopf('+', 'knopf leise bp-zoom-knopf');
  const kEinpassen = knopf('Einpassen', 'knopf leise');
  kKleiner.setAttribute('aria-label', 'Verkleinern');
  kKleiner.title = 'Verkleinern';
  kGroesser.setAttribute('aria-label', 'Vergrößern');
  kGroesser.title = 'Vergrößern';
  zoom.append(kKleiner, kGroesser, kEinpassen);
  leiste.append(h('div', 'bp-werkzeuge-links', kEnt, kBez, kAttr, kVerb), zoom);

  const status = el('p', 'bp-status');
  status.setAttribute('aria-live', 'polite');

  // Zeichenfläche
  const flaeche = el('div', 'bp-flaeche');
  const svg = C.svgEl('svg', { focusable: 'false', role: 'group', 'aria-label': 'Zeichenfläche: Tab wählt ein Element, Enter bearbeitet es, Pfeiltasten verschieben, Entf löscht.' }, 'chen-svg bp-svg');
  const papier = C.svgEl('rect', { x: -5000, y: -5000, width: 15000, height: 15000 }, 'bp-karo');
  const inhalt = C.svgEl('g', {}, 'bp-inhalt');
  const defs = C.svgEl('defs');
  const muster = C.svgEl('pattern', { id: 'bp-karo-' + Math.random().toString(36).slice(2, 8), width: 24, height: 24, patternUnits: 'userSpaceOnUse' });
  muster.appendChild(C.svgEl('path', { d: 'M 24 0 L 0 0 0 24' }, 'bp-karo-linie'));
  defs.appendChild(muster);
  papier.setAttribute('fill', `url(#${muster.getAttribute('id')})`);
  svg.append(defs, papier, inhalt);
  flaeche.appendChild(svg);

  const seite = el('div', 'bp-seite');
  const panel = el('section', 'bp-panel');
  panel.setAttribute('aria-label', 'Eigenschaften');
  const ergebnisBox = el('section', 'bp-ergebnis');
  ergebnisBox.setAttribute('aria-live', 'polite');
  ergebnisBox.hidden = true;
  seite.append(panel, ergebnisBox);

  const liste = el('div', 'bp-liste');
  const arbeit = el('div', 'bp-arbeit');
  arbeit.append(flaeche, liste, seite);
  const loesungBox = el('div', 'bp-loesung');
  loesungBox.hidden = true;
  wurzel.append(kopf, handyHinweis, leiste, status, arbeit, loesungBox);

  /* ---------- Ansicht (viewBox) ---------- */

  let view = null;
  function einpassen() {
    const r = C.grenzen(graph, layout) || { x: 0, y: 0, b: 0, h: 0 };
    const rand = 48;
    const b = Math.max(MIN_B, r.b + 2 * rand);
    const hh = Math.max(MIN_H, r.h + 2 * rand);
    view = { x: r.x + r.b / 2 - b / 2, y: r.y + r.h / 2 - hh / 2, b, h: hh };
    if (!C.grenzen(graph, layout)) view = { x: 0, y: 0, b: MIN_B, h: MIN_H };
    setzeView();
  }
  function setzeView() {
    svg.setAttribute('viewBox', `${view.x.toFixed(1)} ${view.y.toFixed(1)} ${view.b.toFixed(1)} ${view.h.toFixed(1)}`);
  }
  function zoome(faktor, um = null) {
    const mitte = um || { x: view.x + view.b / 2, y: view.y + view.h / 2 };
    const b = Math.max(240, Math.min(6000, view.b * faktor));
    const f = b / view.b;
    view = { x: mitte.x - (mitte.x - view.x) * f, y: mitte.y - (mitte.y - view.y) * f, b, h: view.h * f };
    setzeView();
  }
  function svgPunkt(clientX, clientY) {
    const m = svg.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    const p = svg.createSVGPoint();
    p.x = clientX;
    p.y = clientY;
    const q = p.matrixTransform(m.inverse());
    return { x: q.x, y: q.y };
  }

  /* ---------- Zeichnen ---------- */

  let geplant = false;
  function zeichneSpaeter() {
    if (geplant) return;
    geplant = true;
    window.requestAnimationFrame(() => {
      geplant = false;
      zeichneSvg();
    });
  }
  function zeichneSvg() {
    const fokus = document.activeElement && svg.contains(document.activeElement) ? document.activeElement.getAttribute('data-id') : null;
    const klassen = new Map();
    if (verbinden && verbinden.erstes) klassen.set(verbinden.erstes, 'verbinden-start');
    for (const id of fest.ids) klassen.set(id, [klassen.get(id), 'fest'].filter(Boolean).join(' '));
    C.zeichne(inhalt, graph, layout, { bedienbar: true, klassen, auswahl, offeneKard: true, fehlerKard });
    if (fokus) {
      const neu = inhalt.querySelector(`[data-id="${CSS.escape(fokus)}"]`);
      if (neu) neu.focus({ preventScroll: true });
    }
    wurzel.classList.toggle('verbinden-an', !!verbinden);
  }

  function aktualisiereLeiste() {
    const voll = (liste2) => liste2.length >= GRENZEN.elemente;
    kEnt.disabled = gesperrt || voll(graph.entitaeten);
    kBez.disabled = gesperrt || voll(graph.beziehungen);
    const b = auswahl ? besitzerVon(auswahl) : null;
    kAttr.disabled = gesperrt || !b || b.el.attribute.length >= GRENZEN.attribute;
    kAttr.title = b ? `Attribut an „${C.nameVon(b.el)}“ anhängen` : 'Wähle zuerst einen Entitäts- oder Beziehungstyp.';
    kVerb.disabled = gesperrt;
    kVerb.setAttribute('aria-pressed', verbinden ? 'true' : 'false');
    kZeichnen.setAttribute('aria-pressed', ansicht === 'zeichnen' ? 'true' : 'false');
    kListe.setAttribute('aria-pressed', ansicht === 'liste' ? 'true' : 'false');
  }

  /** Liegt ein Element außerhalb der Ansicht (z. B. neu angelegt), wird die Ansicht eingepasst. */
  function sichtbarMachen(id) {
    const p = layout[id];
    if (!p || !view) return;
    if (p.x - 90 < view.x || p.x + 90 > view.x + view.b || p.y - 50 < view.y || p.y + 50 > view.y + view.h) einpassen();
  }

  function geaendert({ struktur = false, panelNeu = false } = {}) {
    fehlerKard = new Set();
    schreib(opt.entwurf, { graph, layout });
    if (struktur || panelNeu) zeichneFormulare();
    zeichneSpaeter();
    aktualisiereLeiste();
    if (typeof opt.beiAenderung === 'function') opt.beiAenderung();
  }
  function melde(text) {
    status.textContent = text || '';
  }

  /* ---------- Bearbeiten ---------- */

  function freiePosition(breiteHalbe = 90, hoeheHalbe = 40) {
    const mitte = view ? { x: view.x + view.b / 2, y: view.y + view.h / 2 } : { x: 300, y: 200 };
    const belegt = Object.values(layout);
    const frei = (x, y) => belegt.every((q) => Math.abs(q.x - x) > breiteHalbe + 70 || Math.abs(q.y - y) > hoeheHalbe + 40);
    for (let ring = 0; ring < 12; ring++) {
      for (let k = 0; k < Math.max(1, ring * 6); k++) {
        const w = (2 * Math.PI * k) / Math.max(1, ring * 6);
        const x = mitte.x + Math.cos(w) * ring * 120;
        const y = mitte.y + Math.sin(w) * ring * 80;
        if (x > breiteHalbe && y > hoeheHalbe && frei(x, y)) return { x: klemme(x), y: klemme(y) };
      }
    }
    return { x: klemme(mitte.x), y: klemme(mitte.y) };
  }

  function neueEntitaet() {
    if (gesperrt || graph.entitaeten.length >= GRENZEN.elemente) return null;
    const id = neueId('e');
    graph.entitaeten.push({ id, name: '', attribute: [] });
    layout[id] = freiePosition(80, 30);
    auswahl = id;
    melde('Neuer Entitätstyp angelegt. Gib ihm einen Namen.');
    sichtbarMachen(id);
    geaendert({ struktur: true });
    fokussiereName(id);
    return id;
  }
  function neueBeziehung(enden = []) {
    if (gesperrt || graph.beziehungen.length >= GRENZEN.elemente) return null;
    const id = neueId('b');
    graph.beziehungen.push({ id, name: '', enden: enden.map((e) => ({ entitaet: e, kard: '', rolle: '' })), attribute: [] });
    const punkte = enden.map((e) => layout[e]).filter(Boolean);
    if (punkte.length) {
      let x = punkte.reduce((a, p) => a + p.x, 0) / punkte.length;
      let y = punkte.reduce((a, p) => a + p.y, 0) / punkte.length;
      if (new Set(enden).size === 1) y += 200;
      const belegt = Object.values(layout);
      let n = 0;
      while (belegt.some((q) => Math.abs(q.x - x) < 120 && Math.abs(q.y - y) < 60) && n < 10) {
        y += n % 2 ? -100 * (n + 1) : 100 * (n + 1);
        n++;
      }
      layout[id] = { x: klemme(x), y: klemme(y) };
    } else {
      layout[id] = freiePosition(80, 37);
    }
    auswahl = id;
    sichtbarMachen(id);
    melde(enden.length ? 'Neuer Beziehungstyp angelegt. Gib ihm einen Namen und setze die Kardinalitäten.' : 'Neuer Beziehungstyp angelegt. Verbinde ihn mit Entitätstypen.');
    geaendert({ struktur: true });
    fokussiereName(id);
    return id;
  }
  function neuesAttribut(besitzerId) {
    const b = finde(besitzerId);
    if (gesperrt || !b || b.art === 'attribut' || b.el.attribute.length >= GRENZEN.attribute) return null;
    b.el.attribute.push(b.art === 'entitaet' ? { name: '', schluessel: false } : { name: '' });
    const id = C.attributId(b.id, b.el.attribute.length - 1);
    const p = layout[b.id] || { x: 200, y: 200 };
    layout[id] = C.attributPlatz(p, b.art, Object.values(layout));
    auswahl = id;
    melde('Neues Attribut angelegt.');
    sichtbarMachen(id);
    geaendert({ struktur: true });
    fokussiereAttribut(b.id, b.el.attribute.length - 1);
    return id;
  }
  function neuesEnde(bezId, entitaetId = '') {
    const b = beziehung(bezId);
    if (gesperrt || !b || b.enden.length >= GRENZEN.enden) return false;
    b.enden.push({ entitaet: entitaetId, kard: '', rolle: '' });
    geaendert({ struktur: true });
    return true;
  }
  function verschiebeAttributLayout(besitzerId, abIndex, anzahl) {
    // Attribut abIndex wurde entfernt: Layout der folgenden Attribute rückt nach
    for (let j = abIndex; j < anzahl; j++) {
      const von = layout[C.attributId(besitzerId, j + 1)];
      if (von) layout[C.attributId(besitzerId, j)] = von;
      else delete layout[C.attributId(besitzerId, j)];
    }
    delete layout[C.attributId(besitzerId, anzahl)];
  }
  function loesche(id) {
    if (gesperrt || !loeschbar(id)) return false;
    const f = finde(id);
    if (f.art === 'attribut') {
      f.besitzer.attribute.splice(f.index, 1);
      verschiebeAttributLayout(f.besitzer.id, f.index, f.besitzer.attribute.length);
      auswahl = f.besitzer.id;
      melde(`Attribut ${C.nameVon(f.el)} gelöscht.`);
    } else {
      for (let i = 0; i < f.el.attribute.length; i++) delete layout[C.attributId(id, i)];
      delete layout[id];
      if (f.art === 'entitaet') {
        graph.entitaeten = graph.entitaeten.filter((e) => e.id !== id);
        for (const b of graph.beziehungen) b.enden = b.enden.filter((x, i) => x.entitaet !== id || endeFest(b.id, i));
      } else {
        graph.beziehungen = graph.beziehungen.filter((b) => b.id !== id);
      }
      auswahl = null;
      melde(`${f.art === 'entitaet' ? 'Entitätstyp' : 'Beziehungstyp'} ${C.nameVon(f.el)} gelöscht.`);
    }
    if (verbinden && verbinden.erstes === id) verbinden = null;
    geaendert({ struktur: true });
    return true;
  }
  function verschiebe(id, dx, dy) {
    const f = finde(id);
    if (!f || gesperrt) return;
    const ids = [id];
    if (f.art !== 'attribut') f.el.attribute.forEach((_, i) => ids.push(C.attributId(id, i)));
    for (const x of ids) {
      const p = layout[x];
      if (p) layout[x] = { x: klemme(p.x + dx), y: klemme(p.y + dy) };
    }
  }

  function aktiviere(id) {
    if (gesperrt) return;
    if (verbinden) return verbindeMit(id);
    auswahl = id;
    zeichneFormulare();
    zeichneSvg();
    aktualisiereLeiste();
  }

  function verbindeMit(id) {
    const f = besitzerVon(id);
    if (!f) return;
    if (!verbinden.erstes) {
      verbinden.erstes = f.id;
      melde(`Verbinden: „${C.nameVon(f.el)}“ gewählt. Tippe jetzt das zweite Element an.`);
      zeichneSvg();
      return;
    }
    const a = besitzerVon(verbinden.erstes);
    const b = f;
    verbinden = null;
    if (!a) return beendeVerbinden();
    if (a.art === 'entitaet' && b.art === 'entitaet') {
      if (graph.beziehungen.length >= GRENZEN.elemente) {
        melde('Höchstens 30 Beziehungstypen.');
        return beendeVerbinden();
      }
      neueBeziehung([a.id, b.id]);
      melde(a.id === b.id ? `Rekursiver Beziehungstyp an „${C.nameVon(a.el)}“ angelegt. Gib ihm einen Namen, Rollen und Kardinalitäten.` : `Beziehungstyp zwischen „${C.nameVon(a.el)}“ und „${C.nameVon(b.el)}“ angelegt. Gib ihm einen Namen und setze die Kardinalitäten.`);
      return beendeVerbinden(false);
    }
    if (a.art === 'beziehung' && b.art === 'beziehung') {
      melde('Verbinde einen Entitätstyp mit einem Beziehungstyp oder zwei Entitätstypen miteinander.');
      return beendeVerbinden();
    }
    const bez = a.art === 'beziehung' ? a : b;
    const ent = a.art === 'entitaet' ? a : b;
    if (bez.el.enden.length >= GRENZEN.enden) {
      melde('Ein Beziehungstyp hat höchstens drei Enden (ternär).');
      return beendeVerbinden();
    }
    bez.el.enden.push({ entitaet: ent.id, kard: '', rolle: '' });
    auswahl = bez.id;
    melde(`„${C.nameVon(ent.el)}“ mit „${C.nameVon(bez.el)}“ verbunden. Setze die Kardinalität.`);
    geaendert({ struktur: true });
    return beendeVerbinden(false);
  }
  function beendeVerbinden(neuZeichnen = true) {
    verbinden = null;
    aktualisiereLeiste();
    if (neuZeichnen) zeichneSvg();
  }

  /* ---------- Formulare (Panel im Zeichenmodus, Karten im Listenmodus) ---------- */

  let fokusNachZeichnen = null;
  function fokussiereName(id) {
    fokusNachZeichnen = { id, feld: 'name' };
    setzeFokus();
  }
  function fokussiereAttribut(id, i) {
    fokusNachZeichnen = { id, feld: 'attr', i };
    setzeFokus();
  }
  function setzeFokus() {
    if (!fokusNachZeichnen) return;
    const ziel = ansicht === 'liste' ? liste : panel;
    const karte = ziel.querySelector(`[data-element="${CSS.escape(fokusNachZeichnen.id)}"]`);
    let feld = null;
    if (karte) {
      feld = fokusNachZeichnen.feld === 'name' ? karte.querySelector('.bp-name-feld') : karte.querySelectorAll('.bp-attr-name')[fokusNachZeichnen.i];
    }
    fokusNachZeichnen = null;
    if (feld && !feld.disabled && !feld.readOnly) feld.focus();
  }

  let feldNr = 0;
  const feldId = () => `bp-f-${Math.random().toString(36).slice(2, 7)}-${++feldNr}`;
  function textFeld(wert, label, { klasse = '', festgelegt = false, beiEingabe }) {
    const id = feldId();
    const lab = el('label', 'bp-label', label);
    lab.htmlFor = id;
    const inp = el('input', 'bp-feld ' + klasse);
    inp.id = id;
    inp.type = 'text';
    inp.value = wert;
    inp.maxLength = GRENZEN.name;
    inp.autocomplete = 'off';
    inp.spellcheck = false;
    inp.setAttribute('autocapitalize', 'off');
    inp.setAttribute('autocorrect', 'off');
    inp.readOnly = festgelegt;
    inp.disabled = gesperrt;
    if (festgelegt) inp.title = 'Vorgegeben – bleibt so.';
    inp.addEventListener('input', () => beiEingabe(inp.value.slice(0, GRENZEN.name)));
    return { lab, inp };
  }

  function entfernenKnopf(text, beiKlick) {
    const k = el('button', 'knopf-icon bp-entfernen', '✕');
    k.type = 'button';
    k.setAttribute('aria-label', text);
    k.title = text;
    k.disabled = gesperrt;
    k.addEventListener('click', beiKlick);
    return k;
  }

  function attributZeile(besitzer, art, a, i, markiertIndex) {
    const zeile = el('li', 'bp-attr' + (markiertIndex === i ? ' aktiv' : ''));
    const festA = attributFest(besitzer.id, i);
    const { lab, inp } = textFeld(a.name, `Attribut ${i + 1}`, {
      klasse: 'bp-attr-name',
      festgelegt: festA,
      beiEingabe: (w) => {
        a.name = w;
        geaendert();
      }
    });
    lab.classList.add('nur-sr');
    inp.placeholder = 'Attributname';
    zeile.append(lab, inp);
    if (art === 'entitaet') {
      const cbId = feldId();
      const cb = el('input', 'bp-schluessel');
      cb.type = 'checkbox';
      cb.id = cbId;
      cb.checked = a.schluessel === true;
      cb.disabled = gesperrt;
      cb.addEventListener('change', () => {
        a.schluessel = cb.checked;
        geaendert();
      });
      const cl = el('label', 'bp-schluessel-label', 'Schlüssel');
      cl.htmlFor = cbId;
      zeile.append(h('span', 'bp-schluessel-zeile', cb, cl));
    }
    if (!festA) {
      zeile.appendChild(
        entfernenKnopf(`Attribut ${C.nameVon(a)} entfernen`, () => {
          loesche(C.attributId(besitzer.id, i));
        })
      );
    }
    return zeile;
  }

  function attributListe(f, art, markiertIndex) {
    const feld = el('fieldset', 'bp-gruppe');
    feld.appendChild(el('legend', 'etikett', 'Attribute'));
    const ul = el('ul', 'bp-attr-liste');
    f.attribute.forEach((a, i) => ul.appendChild(attributZeile(f, art, a, i, markiertIndex)));
    if (!f.attribute.length) ul.appendChild(el('li', 'bp-leer', 'Noch keine Attribute.'));
    feld.appendChild(ul);
    const plus = knopf('Attribut', 'knopf leise', 'i-plus');
    plus.setAttribute('aria-label', `Attribut zu „${C.nameVon(f)}“ hinzufügen`);
    plus.disabled = gesperrt || f.attribute.length >= GRENZEN.attribute;
    plus.dataset.aktion = 'attribut';
    plus.addEventListener('click', () => neuesAttribut(f.id));
    feld.appendChild(plus);
    return feld;
  }

  function endeZeile(bez, ende, i) {
    const zeile = el('li', 'bp-ende');
    const festE = endeFest(bez.id, i);
    // Entitätstyp
    const selId = feldId();
    const sel = el('select', 'bp-feld bp-ende-ziel');
    sel.id = selId;
    sel.appendChild(el('option', null, '– Entitätstyp –'));
    sel.firstChild.value = '';
    for (const e of graph.entitaeten) {
      const o = el('option', null, C.nameVon(e));
      o.value = e.id;
      sel.appendChild(o);
    }
    sel.value = graph.entitaeten.some((e) => e.id === ende.entitaet) ? ende.entitaet : '';
    sel.disabled = gesperrt || festE;
    sel.addEventListener('change', () => {
      ende.entitaet = sel.value;
      geaendert();
    });
    const selLab = el('label', 'nur-sr', `Ende ${i + 1}: Entitätstyp`);
    selLab.htmlFor = selId;
    // Kardinalität
    const kId = feldId();
    const kard = el('select', 'bp-feld bp-ende-kard');
    kard.id = kId;
    for (const k of KARD_OPTIONEN) {
      const o = el('option', null, k || '–');
      o.value = k;
      kard.appendChild(o);
    }
    kard.value = KARD_OPTIONEN.includes(ende.kard) ? ende.kard : '';
    kard.disabled = gesperrt;
    kard.addEventListener('change', () => {
      ende.kard = kard.value;
      geaendert();
    });
    const kLab = el('label', 'bp-label bp-kard-label', 'Kard.');
    kLab.htmlFor = kId;
    kLab.setAttribute('aria-label', `Ende ${i + 1}: Kardinalität`);
    // Rolle
    const { lab: rLab, inp: rolle } = textFeld(ende.rolle, `Ende ${i + 1}: Rolle (optional)`, {
      klasse: 'bp-ende-rolle',
      beiEingabe: (w) => {
        ende.rolle = w;
        geaendert();
      }
    });
    rLab.classList.add('nur-sr');
    rolle.placeholder = 'Rolle (optional)';
    zeile.append(selLab, sel, h('span', 'bp-kard-zeile', kLab, kard), rLab, rolle);
    if (!festE) {
      zeile.appendChild(
        entfernenKnopf(`Ende ${i + 1} entfernen`, () => {
          bez.enden.splice(i, 1);
          geaendert({ struktur: true });
        })
      );
    }
    return zeile;
  }

  function formular(f, art, markiertIndex = -1) {
    const karte = el('article', `bp-karte bp-karte-${art}`);
    karte.dataset.element = f.id;
    const kopfK = el('div', 'bp-karte-kopf');
    kopfK.appendChild(el('span', 'etikett', art === 'entitaet' ? 'Entitätstyp' : 'Beziehungstyp' + (new Set(f.enden.map((x) => x.entitaet)).size === 1 && f.enden.length > 1 ? ' · rekursiv' : f.enden.length === 3 ? ' · ternär' : '')));
    if (fest.ids.has(f.id)) kopfK.appendChild(el('span', 'bp-fest', 'vorgegeben'));
    karte.appendChild(kopfK);
    const { lab, inp } = textFeld(f.name, art === 'entitaet' ? 'Name (Singular)' : 'Name (Verb, z. B. leitet)', {
      klasse: 'bp-name-feld',
      festgelegt: nameFest(f.id),
      beiEingabe: (w) => {
        f.name = w;
        geaendert();
      }
    });
    inp.setAttribute('aria-label', `Name des ${art === 'entitaet' ? 'Entitätstyps' : 'Beziehungstyps'}`);
    karte.append(h('div', 'bp-feldgruppe', lab, inp));
    if (art === 'beziehung') {
      const feld = el('fieldset', 'bp-gruppe');
      feld.appendChild(el('legend', 'etikett', 'Enden und Kardinalitäten'));
      const ul = el('ul', 'bp-enden');
      f.enden.forEach((x, i) => ul.appendChild(endeZeile(f, x, i)));
      if (!f.enden.length) ul.appendChild(el('li', 'bp-leer', 'Noch nicht verbunden.'));
      feld.appendChild(ul);
      const plus = knopf('Ende', 'knopf leise', 'i-plus');
      plus.setAttribute('aria-label', `Ende zu „${C.nameVon(f)}“ hinzufügen`);
      plus.disabled = gesperrt || f.enden.length >= GRENZEN.enden;
      plus.dataset.aktion = 'ende';
      plus.addEventListener('click', () => neuesEnde(f.id));
      feld.appendChild(plus);
      karte.appendChild(feld);
    }
    karte.appendChild(attributListe(f, art, markiertIndex));
    if (!fest.ids.has(f.id)) {
      const weg = knopf(art === 'entitaet' ? 'Entitätstyp löschen' : 'Beziehungstyp löschen', 'knopf leise bp-loeschen');
      weg.disabled = gesperrt;
      weg.addEventListener('click', () => loesche(f.id));
      karte.appendChild(weg);
    }
    return karte;
  }

  function zeichneFormulare() {
    // Panel (Zeichenmodus): Formular des gewählten Elements
    panel.replaceChildren();
    panel.appendChild(el('h3', 'etikett bp-panel-titel', 'Eigenschaften'));
    const f = auswahl ? finde(auswahl) : null;
    if (!f) {
      auswahl = null;
      panel.appendChild(el('p', 'bp-leer', 'Tippe ein Element an, um es zu bearbeiten. Neue Elemente legst du mit den Knöpfen über der Zeichenfläche an.'));
    } else if (f.art === 'attribut') {
      panel.appendChild(formular(f.besitzer, f.besitzer.enden ? 'beziehung' : 'entitaet', f.index));
    } else {
      panel.appendChild(formular(f.el, f.art));
    }
    // Liste (Listenmodus): alle Elemente
    liste.replaceChildren();
    const abschnittE = el('section', 'bp-liste-abschnitt');
    abschnittE.appendChild(el('h3', 'bp-liste-titel', 'Entitätstypen'));
    if (!graph.entitaeten.length) abschnittE.appendChild(el('p', 'bp-leer', 'Noch keine Entitätstypen.'));
    for (const e of graph.entitaeten) abschnittE.appendChild(formular(e, 'entitaet'));
    const plusE = knopf('Entitätstyp', 'knopf', 'i-plus');
    plusE.dataset.aktion = 'entitaet';
    plusE.setAttribute('aria-label', 'Entitätstyp hinzufügen');
    plusE.disabled = gesperrt || graph.entitaeten.length >= GRENZEN.elemente;
    plusE.addEventListener('click', () => neueEntitaet());
    abschnittE.appendChild(plusE);
    const abschnittB = el('section', 'bp-liste-abschnitt');
    abschnittB.appendChild(el('h3', 'bp-liste-titel', 'Beziehungstypen'));
    if (!graph.beziehungen.length) abschnittB.appendChild(el('p', 'bp-leer', 'Noch keine Beziehungstypen.'));
    for (const b of graph.beziehungen) abschnittB.appendChild(formular(b, 'beziehung'));
    const plusB = knopf('Beziehungstyp', 'knopf', 'i-plus');
    plusB.dataset.aktion = 'beziehung';
    plusB.setAttribute('aria-label', 'Beziehungstyp hinzufügen');
    plusB.disabled = gesperrt || graph.beziehungen.length >= GRENZEN.elemente;
    plusB.addEventListener('click', () => neueBeziehung([]));
    abschnittB.appendChild(plusB);
    liste.append(abschnittE, abschnittB);
    setzeFokus();
  }

  /* ---------- Ansicht wechseln ---------- */

  function setzeAnsicht(neu, fokus = false) {
    ansicht = neu === 'liste' ? 'liste' : 'zeichnen';
    wurzel.classList.toggle('ansicht-liste', ansicht === 'liste');
    wurzel.classList.toggle('ansicht-zeichnen', ansicht === 'zeichnen');
    try {
      window.localStorage.setItem(ANSICHT_SCHLUESSEL, ansicht);
    } catch {
      /* ohne Speicher bleibt die Wahl bis zum Neuladen */
    }
    verbinden = null;
    zeichneFormulare();
    aktualisiereLeiste();
    if (ansicht === 'zeichnen') {
      if (!view) einpassen();
      zeichneSvg();
    }
    if (fokus) (ansicht === 'liste' ? kListe : kZeichnen).focus();
  }
  kZeichnen.addEventListener('click', () => setzeAnsicht('zeichnen'));
  kListe.addEventListener('click', () => setzeAnsicht('liste'));

  /* ---------- Werkzeugleiste ---------- */

  kEnt.addEventListener('click', () => neueEntitaet());
  kBez.addEventListener('click', () => neueBeziehung([]));
  kAttr.addEventListener('click', () => {
    const b = auswahl ? besitzerVon(auswahl) : null;
    if (b) neuesAttribut(b.id);
  });
  kVerb.addEventListener('click', () => {
    if (verbinden) {
      verbinden = null;
      melde('Verbinden beendet.');
    } else {
      verbinden = { erstes: null };
      melde('Verbinden: Tippe das erste Element an – zwei Entitätstypen ergeben einen neuen Beziehungstyp, Entitätstyp und Beziehungstyp ein neues Ende.');
    }
    aktualisiereLeiste();
    zeichneSvg();
  });
  kKleiner.addEventListener('click', () => zoome(1.25));
  kGroesser.addEventListener('click', () => zoome(0.8));
  kEinpassen.addEventListener('click', () => einpassen());

  /* ---------- Pointer: Ziehen, Verschieben der Ansicht, Antippen ---------- */

  let zug = null; // { id|null, pointerId, start: client, svgStart, orte: Map, bewegt, pan? }
  svg.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const g = e.target.closest && e.target.closest('[data-id]');
    const id = g && inhalt.contains(g) ? g.getAttribute('data-id') : null;
    if (!id && e.pointerType === 'touch') return; // Wischen auf dem Papier scrollt die Fläche
    const svgStart = svgPunkt(e.clientX, e.clientY);
    const orte = new Map();
    if (id) {
      const f = finde(id);
      const ids = [id];
      if (f && f.art !== 'attribut') f.el.attribute.forEach((_, i) => ids.push(C.attributId(id, i)));
      for (const x of ids) if (layout[x]) orte.set(x, { ...layout[x] });
    }
    zug = { id, pointerId: e.pointerId, start: { x: e.clientX, y: e.clientY }, svgStart, orte, bewegt: false, view: { ...view } };
    try {
      svg.setPointerCapture(e.pointerId);
    } catch {
      /* ältere Browser */
    }
    if (id) e.preventDefault();
  });
  svg.addEventListener('pointermove', (e) => {
    if (!zug || e.pointerId !== zug.pointerId) return;
    const dx = e.clientX - zug.start.x;
    const dy = e.clientY - zug.start.y;
    if (!zug.bewegt && Math.hypot(dx, dy) < 4) return;
    zug.bewegt = true;
    if (zug.id) {
      if (gesperrt) return;
      const p = svgPunkt(e.clientX, e.clientY);
      const ddx = p.x - zug.svgStart.x;
      const ddy = p.y - zug.svgStart.y;
      for (const [x, o] of zug.orte) layout[x] = { x: klemme(o.x + ddx), y: klemme(o.y + ddy) };
      zeichneSpaeter();
    } else {
      const m = svg.getScreenCTM();
      const f = m ? 1 / m.a : 1;
      view = { ...zug.view, x: zug.view.x - dx * f, y: zug.view.y - dy * f };
      setzeView();
    }
  });
  function zugEnde(e) {
    if (!zug || e.pointerId !== zug.pointerId) return;
    const z = zug;
    zug = null;
    if (z.bewegt) {
      if (z.id) {
        zeichneSvg();
        schreib(opt.entwurf, { graph, layout });
        if (typeof opt.beiAenderung === 'function') opt.beiAenderung();
      }
      return;
    }
    if (z.id) aktiviere(z.id);
    else if (!verbinden && auswahl) {
      auswahl = null;
      zeichneFormulare();
      zeichneSvg();
      aktualisiereLeiste();
    }
  }
  svg.addEventListener('pointerup', zugEnde);
  svg.addEventListener('pointercancel', (e) => {
    if (zug && e.pointerId === zug.pointerId) zug = null;
  });
  svg.addEventListener(
    'wheel',
    (e) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      zoome(e.deltaY > 0 ? 1.1 : 0.9, svgPunkt(e.clientX, e.clientY));
    },
    { passive: false }
  );

  /* ---------- Tastatur ---------- */

  svg.addEventListener('keydown', (e) => {
    const g = e.target.closest && e.target.closest('[data-id]');
    if (!g) return;
    const id = g.getAttribute('data-id');
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      aktiviere(id);
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      verbinden = null;
      auswahl = null;
      melde('');
      zeichneFormulare();
      zeichneSvg();
      aktualisiereLeiste();
      return;
    }
    const pfeile = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (pfeile[e.key]) {
      e.preventDefault();
      if (gesperrt) return;
      const schritt = e.shiftKey ? SCHRITT_GROSS : SCHRITT;
      verschiebe(id, pfeile[e.key][0] * schritt, pfeile[e.key][1] * schritt);
      geaendert();
      return;
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      if (!loeschbar(id)) {
        melde('Dieses Element ist vorgegeben und bleibt stehen.');
        return;
      }
      const ids = [...inhalt.querySelectorAll('[data-id]')].map((x) => x.getAttribute('data-id'));
      const pos = ids.indexOf(id);
      loesche(id);
      zeichneSvg();
      const rest = [...inhalt.querySelectorAll('[data-id]')];
      const ziel = rest[Math.min(pos, rest.length - 1)];
      if (ziel) ziel.focus({ preventScroll: true });
    }
  });

  /* ---------- Prüfergebnis und Lösung ---------- */

  function zeigeErgebnis(rm) {
    if (modus === 'frei') return;
    const r = istObjekt(rm) ? rm : {};
    const kriterien = Array.isArray(r.kriterien) ? r.kriterien : [];
    const hinweise = Array.isArray(r.hinweise) ? r.hinweise : [];
    if (!kriterien.length && !hinweise.length) {
      ergebnisBox.hidden = true;
      return;
    }
    const richtig = Number.isInteger(r.richtig) ? r.richtig : kriterien.filter((k) => k.ok).length;
    const gesamt = Number.isInteger(r.gesamt) ? r.gesamt : kriterien.length;
    const geloest = richtig === gesamt && !hinweise.length;
    ergebnisBox.replaceChildren();
    ergebnisBox.hidden = false;
    ergebnisBox.classList.toggle('geloest', geloest);
    const kopfE = el('div', 'bp-ergebnis-kopf');
    kopfE.appendChild(el('h3', 'etikett', 'Prüfergebnis'));
    kopfE.appendChild(el('span', 'bp-zaehler zahlen', `${richtig} von ${gesamt}`));
    ergebnisBox.appendChild(kopfE);
    const ul = el('ul', 'bp-kriterien');
    for (const k of kriterien) {
      const li = el('li', k.ok ? 'ok' : 'falsch');
      li.appendChild(el('span', 'bp-zeichen', k.ok ? '✔' : '✘')).setAttribute('aria-hidden', 'true');
      const t = el('span', 'bp-kriterium-text');
      t.appendChild(el('span', 'nur-sr', k.ok ? 'Erfüllt: ' : 'Nicht erfüllt: '));
      t.appendChild(document.createTextNode(s(k.text)));
      li.appendChild(t);
      if (k.falle && !k.ok) li.appendChild(R.falle(k.falle));
      const teile = Array.isArray(k.teile) ? k.teile.filter((x) => x && x.text) : [];
      if (teile.length && teile.some((x) => !x.ok)) {
        const tl = el('ul', 'bp-teile');
        for (const x of teile) {
          const tli = el('li', x.ok ? 'ok' : 'falsch');
          tli.appendChild(el('span', 'bp-zeichen', x.ok ? '✔' : '✘')).setAttribute('aria-hidden', 'true');
          tli.appendChild(el('span', null, s(x.text)));
          tl.appendChild(tli);
        }
        li.appendChild(tl);
      }
      ul.appendChild(li);
    }
    for (const x of hinweise) {
      const li = el('li', 'falsch hinweis');
      li.appendChild(el('span', 'bp-zeichen', '✘')).setAttribute('aria-hidden', 'true');
      li.appendChild(el('span', 'bp-kriterium-text', s(x.text)));
      if (x.falle) li.appendChild(R.falle(x.falle));
      ul.appendChild(li);
    }
    ergebnisBox.appendChild(ul);
    if (geloest) ergebnisBox.appendChild(R.stempel('Gelöst', 'geloest', { groesse: 'gross', auftritt: true }));
    // Kardinalitäten, die laut Prüfung falsch sind, rot umkreisen (nur eigene Namen)
    fehlerKard = new Set();
    const kard = kriterien.find((k) => k.id === 'kardinalitaeten');
    if (kard && Array.isArray(kard.teile)) {
      for (const x of kard.teile) {
        if (x.ok) continue;
        const n = nameAusTeil(x.text);
        if (!n) continue;
        for (const b of graph.beziehungen) if (normName(b.name) === normName(n)) fehlerKard.add(b.id);
      }
    }
    zeichneSvg();
  }

  function zeigeLoesung(lo) {
    const l = istObjekt(lo) ? lo : {};
    const muster = Array.isArray(l.muster) ? l.muster.find(istObjekt) : null;
    if (!muster) return;
    loesungBox.replaceChildren(el('p', 'etikett', 'Musterlösung'), B.erBild(muster));
    if (Array.isArray(l.muster) && l.muster.length > 1) loesungBox.appendChild(el('p', 'bp-leer', `Es gibt ${l.muster.length} zulässige Lösungen – gezeigt ist die erste.`));
    loesungBox.hidden = false;
  }

  function sperren(an) {
    gesperrt = !!an;
    wurzel.classList.toggle('gesperrt', gesperrt);
    verbinden = null;
    zeichneFormulare();
    aktualisiereLeiste();
    zeichneSvg();
  }

  function setze(a) {
    if (!istObjekt(a)) return;
    const roh = istObjekt(a.graph) ? a.graph : a;
    if (!Array.isArray(roh.entitaeten) && !Array.isArray(roh.beziehungen)) return;
    const neu = normalisiere(roh);
    if (JSON.stringify(antwortForm(neu)) === JSON.stringify(antwortForm(graph))) return;
    if (!passtZumStart(neu)) return;
    graph = neu;
    layout = C.ergaenzeLayout(graph, istObjekt(a.layout) ? a.layout : layout);
    auswahl = null;
    schreib(opt.entwurf, { graph, layout });
    zeichneFormulare();
    einpassen();
    zeichneSvg();
    aktualisiereLeiste();
  }

  function leeren() {
    graph = structuredClone(startGraph);
    layout = C.ergaenzeLayout(graph, startLayout);
    auswahl = null;
    verbinden = null;
    fehlerKard = new Set();
    ergebnisBox.hidden = true;
    schreib(opt.entwurf, null);
    zeichneFormulare();
    einpassen();
    zeichneSvg();
    aktualisiereLeiste();
    melde('Der Bauplan ist wieder wie am Anfang.');
    if (typeof opt.beiAenderung === 'function') opt.beiAenderung();
  }

  // Erstes Zeichnen
  einpassen();
  setzeAnsicht(ansicht);

  return {
    el: wurzel,
    antwort: () => antwortForm(graph),
    leer() {
      if (!graph.entitaeten.length && !graph.beziehungen.length) return true;
      return modus === 'ergaenzen' && vergleichsForm(graph) === startForm;
    },
    setze,
    zeigeErgebnis,
    zeigeLoesung,
    sperren,
    leeren,
    ansicht: (neu) => setzeAnsicht(neu),
    layout: () => ({ ...layout })
  };
}
