// Blöcke `er` und `mengen` (AUFGABENFORMAT §5.7, DESIGN.md §4.14): SVG aus chen.js plus eine Listen- bzw.
// Tabellenalternative (aufklappbar, auch für Screenreader). Im Lesen-Modus der Interaktion `er` (wahl) sind die
// Elemente antippbar – in der Zeichnung (Tab/Enter/Leertaste) und in der Liste (echte Knöpfe). Nur Textknoten.
// Kein Import von kern/render.js (render.js lädt dieses Modul).

const V = new URL(import.meta.url).search;
const C = await import('./chen.js' + V);

function el(tag, klasse, text) {
  const e = document.createElement(tag);
  if (klasse) e.className = klasse;
  if (text !== undefined && text !== null) e.textContent = String(text);
  return e;
}

const nameVon = C.nameVon;

/**
 * Liste aller Elemente als Alternative zur Zeichnung.
 * knopf(id, text) → Element: im Lesen-Modus ein Knopf, sonst Text.
 */
function elementListe(graph, knopf) {
  const box = el('div', 'er-liste');
  const ents = Array.isArray(graph.entitaeten) ? graph.entitaeten : [];
  const bez = Array.isArray(graph.beziehungen) ? graph.beziehungen : [];
  const namen = new Map(ents.map((e) => [e.id, nameVon(e)]));
  if (ents.length) {
    box.appendChild(el('p', 'etikett', 'Entitätstypen'));
    const ul = el('ul', 'er-liste-gruppe');
    for (const e of ents) {
      const li = el('li');
      li.appendChild(knopf(e.id, nameVon(e), 'entitaet'));
      const attr = Array.isArray(e.attribute) ? e.attribute : [];
      if (attr.length) {
        const ua = el('ul', 'er-liste-attribute');
        attr.forEach((a, i) => {
          const la = el('li');
          la.appendChild(knopf(C.attributId(e.id, i), nameVon(a), 'attribut', a.schluessel === true));
          ua.appendChild(la);
        });
        li.appendChild(ua);
      }
      ul.appendChild(li);
    }
    box.appendChild(ul);
  }
  if (bez.length) {
    box.appendChild(el('p', 'etikett', 'Beziehungstypen'));
    const ul = el('ul', 'er-liste-gruppe');
    for (const b of bez) {
      const li = el('li');
      li.appendChild(knopf(b.id, nameVon(b), 'beziehung'));
      const enden = (Array.isArray(b.enden) ? b.enden : []).map(
        (x) => `${namen.get(x.entitaet) || '?'} (${x.kard ? x.kard : '?'}${x.rolle ? `, Rolle ${x.rolle}` : ''})`
      );
      if (enden.length) li.appendChild(el('span', 'er-liste-enden', ` zwischen ${enden.join(' und ')}`));
      const attr = Array.isArray(b.attribute) ? b.attribute : [];
      if (attr.length) {
        const ua = el('ul', 'er-liste-attribute');
        attr.forEach((a, i) => {
          const la = el('li');
          la.appendChild(knopf(C.attributId(b.id, i), nameVon(a), 'attribut', false));
          ua.appendChild(la);
        });
        li.appendChild(ua);
      }
      ul.appendChild(li);
    }
    box.appendChild(ul);
  }
  return box;
}

/**
 * Block `er`.
 * @param {object} b { graph, layout, markiert? }
 * @param {object|null} wahl Lesen-Modus: { klick(id), registriere(api) }; api.zeichne({ gedrueckt?, klassen?, etiketten? })
 */
export function erBlock(b, wahl = null) {
  const graph = b && typeof b.graph === 'object' && b.graph ? b.graph : { entitaeten: [], beziehungen: [] };
  const layout = b && typeof b.layout === 'object' && b.layout ? b.layout : {};
  const markiert = new Set(Array.isArray(b && b.markiert) ? b.markiert : []);
  const figur = el('figure', 'er-block' + (wahl ? ' waehlbar' : ''));
  const flaeche = el('div', 'er-flaeche');
  const svg = C.svgEl('svg', { focusable: 'false' }, 'chen-svg');
  const anzahl = (graph.entitaeten || []).length;
  const anzahlB = (graph.beziehungen || []).length;
  const zusammenfassung = `ER-Diagramm mit ${anzahl} ${anzahl === 1 ? 'Entitätstyp' : 'Entitätstypen'} und ${anzahlB} ${anzahlB === 1 ? 'Beziehungstyp' : 'Beziehungstypen'}`;
  if (wahl) {
    svg.setAttribute('role', 'group');
    svg.setAttribute('aria-label', `${zusammenfassung} – tippe Elemente an`);
  } else {
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', `${zusammenfassung}. Die Liste darunter beschreibt alle Elemente.`);
  }
  flaeche.appendChild(svg);
  figur.appendChild(flaeche);

  let zustand = { gedrueckt: null, klassen: new Map(), etiketten: new Map() };
  const listenKnoepfe = new Map();
  function klassenFuer() {
    const k = new Map();
    for (const id of markiert) k.set(id, 'markiert');
    for (const [id, c] of zustand.klassen) k.set(id, [k.get(id), c].filter(Boolean).join(' '));
    if (zustand.gedrueckt) for (const id of zustand.gedrueckt) k.set(id, [k.get(id), 'gewaehlt'].filter(Boolean).join(' '));
    return k;
  }
  function zeichne() {
    const fokus = document.activeElement && svg.contains(document.activeElement) ? document.activeElement.getAttribute('data-id') : null;
    C.zeichne(svg, graph, layout, { bedienbar: !!wahl, klassen: klassenFuer(), etiketten: zustand.etiketten, gedrueckt: wahl ? zustand.gedrueckt || new Set() : null, viewBox: true });
    if (fokus) {
      const neu = svg.querySelector(`[data-id="${CSS.escape(fokus)}"]`);
      if (neu) neu.focus();
    }
    for (const [id, k] of listenKnoepfe) {
      const an = zustand.gedrueckt ? zustand.gedrueckt.has(id) : false;
      k.setAttribute('aria-pressed', an ? 'true' : 'false');
      const et = k.querySelector('.er-liste-etikett');
      if (et) et.textContent = zustand.etiketten.get(id) ? ` – ${zustand.etiketten.get(id)}` : '';
      k.classList.toggle('loesung', /\bloesung\b/.test(zustand.klassen.get(id) || ''));
      k.classList.toggle('falsch', /\bfalsch\b/.test(zustand.klassen.get(id) || ''));
    }
  }

  if (wahl) {
    svg.addEventListener('click', (e) => {
      const g = e.target.closest && e.target.closest('[data-id]');
      if (g && svg.contains(g)) wahl.klick(g.getAttribute('data-id'));
    });
    svg.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const g = e.target.closest && e.target.closest('[data-id]');
      if (!g) return;
      e.preventDefault();
      wahl.klick(g.getAttribute('data-id'));
    });
  }

  const details = el('details', 'er-alternative');
  if (wahl) details.open = false;
  details.appendChild(el('summary', null, wahl ? 'Als Liste antippen' : 'Als Liste anzeigen'));
  details.appendChild(
    elementListe(graph, (id, text, art, schluessel = false) => {
      const artText = art === 'entitaet' ? 'Entitätstyp' : art === 'beziehung' ? 'Beziehungstyp' : schluessel ? 'Schlüsselattribut' : 'Attribut';
      if (!wahl) {
        const s = el('span', 'er-liste-eintrag');
        s.appendChild(el('span', 'er-liste-art', artText + ' '));
        s.appendChild(el('span', schluessel ? 'pk' : art === 'beziehung' ? 'er-kursiv' : null, text));
        if (markiert.has(id)) s.appendChild(el('span', 'er-liste-markiert', ' (hervorgehoben)'));
        return s;
      }
      const k = el('button', 'er-liste-knopf');
      k.type = 'button';
      k.dataset.id = id;
      k.setAttribute('aria-pressed', 'false');
      k.appendChild(el('span', 'er-liste-art', artText + ' '));
      k.appendChild(el('span', schluessel ? 'pk' : art === 'beziehung' ? 'er-kursiv' : null, text));
      k.appendChild(el('span', 'er-liste-etikett', ''));
      k.addEventListener('click', () => wahl.klick(id));
      listenKnoepfe.set(id, k);
      return k;
    })
  );
  figur.appendChild(details);

  zeichne();
  if (wahl) {
    wahl.registriere({
      zeichne(neu) {
        zustand = {
          gedrueckt: neu && neu.gedrueckt ? new Set(neu.gedrueckt) : null,
          klassen: neu && neu.klassen instanceof Map ? neu.klassen : new Map(Object.entries((neu && neu.klassen) || {})),
          etiketten: neu && neu.etiketten instanceof Map ? neu.etiketten : new Map(Object.entries((neu && neu.etiketten) || {}))
        };
        zeichne();
      },
      sperren(an) {
        figur.classList.toggle('gesperrt', !!an);
        for (const k of listenKnoepfe.values()) k.disabled = !!an;
      },
      elemente: () => C.elemente(graph),
      graph
    });
  }
  return figur;
}

/** Block `mengen`: zwei Ovale mit Elementen und Linien, dazu die Verbindungen als Tabelle. */
export function mengenBlock(b) {
  const figur = el('figure', 'mengen-block');
  const flaeche = el('div', 'er-flaeche');
  const svg = C.zeichneMengen(b || {});
  const l = (b && b.links) || { name: '', elemente: [] };
  const r = (b && b.rechts) || { name: '', elemente: [] };
  svg.setAttribute('aria-label', `Mengendiagramm: ${l.name} (${(l.elemente || []).length} Elemente) und ${r.name} (${(r.elemente || []).length} Elemente). Die Verbindungen stehen in der Tabelle darunter.`);
  flaeche.appendChild(svg);
  figur.appendChild(flaeche);
  const details = el('details', 'er-alternative');
  details.appendChild(el('summary', null, 'Verbindungen als Tabelle'));
  const rahmen = el('div', 'tabelle-rahmen');
  const t = el('table', 'daten');
  t.appendChild(el('caption', 'nur-sr', `Verbindungen zwischen ${l.name} und ${r.name}`));
  const kopf = el('tr');
  for (const n of [l.name, r.name]) {
    const th = el('th', null, n);
    th.scope = 'col';
    kopf.appendChild(th);
  }
  const thead = el('thead');
  thead.appendChild(kopf);
  t.appendChild(thead);
  const tbody = el('tbody');
  const linien = Array.isArray(b && b.linien) ? b.linien : [];
  const verbunden = { l: new Set(), r: new Set() };
  for (const [i, j] of linien) {
    verbunden.l.add(i);
    verbunden.r.add(j);
    const tr = el('tr');
    tr.appendChild(el('td', null, (l.elemente || [])[i]));
    tr.appendChild(el('td', null, (r.elemente || [])[j]));
    tbody.appendChild(tr);
  }
  (l.elemente || []).forEach((w, i) => {
    if (verbunden.l.has(i)) return;
    const tr = el('tr');
    tr.appendChild(el('td', null, w));
    tr.appendChild(el('td', 'leise', 'ohne Verbindung'));
    tbody.appendChild(tr);
  });
  (r.elemente || []).forEach((w, j) => {
    if (verbunden.r.has(j)) return;
    const tr = el('tr');
    tr.appendChild(el('td', 'leise', 'ohne Verbindung'));
    tr.appendChild(el('td', null, w));
    tbody.appendChild(tr);
  });
  t.appendChild(tbody);
  rahmen.appendChild(t);
  details.appendChild(rahmen);
  figur.appendChild(details);
  return figur;
}

/** Nur-Lese-Diagramm eines Graphen ohne Layout (z. B. Musterlösung): Positionen werden automatisch gesetzt. */
export function erBild(graph, layout = {}) {
  return erBlock({ graph, layout: C.ergaenzeLayout(graph, layout) });
}
