// Gemeinsame Bausteine der Fallebene (Pinnwand, Stadtplan, Ermittlung): Steckbrief-Karte (DESIGN §4.16, §5.10) und
// Karte „Auflösung“ des Schlussplädoyers mit Überleitung zur Erörterung (STORY §7.1/7.2). Nur Textknoten.

const V = new URL(import.meta.url).search;
const R = await import('../kern/render.js' + V);
const { el, h, svg } = R;

const STEMPEL_ART = { Enttarnt: 'abi', 'Fall abgeschlossen': 'geloest' };

function silhouette(bekannt) {
  const bild = svg('svg', { viewBox: '0 0 96 128', role: 'img', 'aria-label': bekannt ? 'Silhouette mit Nachtfalter' : 'Silhouette, noch unbekannt' }, 'steckbrief-bild');
  bild.appendChild(svg('circle', { cx: 48, cy: 52, r: 20 }, 'silhouette-kopf'));
  bild.appendChild(svg('path', { d: 'M10 128c2-28 18-44 38-44s36 16 38 44z' }, 'silhouette-koerper'));
  const frage = svg('text', { x: 48, y: 61, 'text-anchor': 'middle' }, 'silhouette-frage');
  frage.textContent = '?';
  bild.appendChild(frage);
  if (bekannt) bild.appendChild(svg('use', { href: '/static/img/icons.svg#i-falter', x: 62, y: 96, width: 26, height: 26 }, 'steckbrief-falter'));
  return bild;
}

/** Steckbrief-Karte; kompakt = Stadtplan-Seitenspalte. */
export function steckbriefKarte(sb, { kompakt = false } = {}) {
  const box = el('aside', 'karte steckbrief pw-steckbrief' + (kompakt ? ' kompakt' : ''));
  box.setAttribute('aria-label', 'Steckbrief des Phantoms');
  box.append(el('p', 'steckbrief-titel', 'Gesucht'), el('p', 'steckbrief-unter etikett', `„Das Phantom“ · ${sb.hinweise} von ${sb.gesamt} Hinweisen`));
  if (sb.stempel) box.appendChild(R.stempel(sb.stempel, STEMPEL_ART[sb.stempel] || 'abi', { groesse: 'gross' }));
  const dl = el('dl');
  for (const f of sb.felder) {
    const dt = el('dt', null, f.titel);
    const dd = el('dd', 'pw-feld' + (f.eintraege.length ? ' bekannt' : ''));
    dd.dataset.akten = f.eintraege.map((e) => e.akte).join(',');
    if (!f.eintraege.length) {
      dd.textContent = '· · ·';
      dd.setAttribute('aria-label', 'noch unbekannt');
    } else {
      const liste = el('ul', 'pw-eintraege');
      for (const e of f.eintraege) liste.appendChild(h('li', null, el('span', 'pw-akte-marke', `A${e.akte}`), R.md(e.text, null, 'span')));
      dd.appendChild(liste);
    }
    dl.append(dt, dd);
  }
  box.appendChild(h('div', 'steckbrief-koerper', silhouette(sb.hinweise > 0), dl));
  return box;
}

export function aufloesungKarte(p) {
  const karte = el('section', 'karte pw-aufloesung');
  karte.setAttribute('aria-labelledby', 'pw-aufloesung-titel');
  const kopf = el('div', 'pw-aufloesung-kopf');
  const t = el('h2', null, 'Auflösung');
  t.id = 'pw-aufloesung-titel';
  kopf.append(t, R.stempel('Enttarnt', 'abi'));
  karte.appendChild(kopf);
  karte.appendChild(R.md(p.aufloesung));
  if (p.ueberleitung) {
    const ue = el('div', 'notiz pw-ueberleitung');
    ue.appendChild(el('p', 'notiz-titel', 'Und jetzt: die Erörterung'));
    ue.appendChild(R.md(p.ueberleitung));
    karte.appendChild(ue);
  }
  return karte;
}

