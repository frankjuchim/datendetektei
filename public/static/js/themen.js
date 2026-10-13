'use strict';
// Themenseite /themen aus dem Seed (Spec §7.12, Plan Phase 3 Task 10): holt GET /api/themen und zeichnet Akten
// (Ermittlungen mit DS, Kompetenzen, Fallen, Anzahl Aufgaben, Verhör), Kür, Fallen P1–P10, Materialliste „nach
// Anmeldung“ (angemeldet mit Links aus GET /api/material, Gast-Auswahl öffentlich) und die Niveau-Tabelle #niveaus. Keine Lösungen (die API liefert keine). Ausgaben nur als Textknoten.
(function () {
  const SPRITE = '/static/img/icons.svg#';
  const ARTEN = {
    sql: 'Konsole',
    choice: 'Auswahl',
    zeilen: 'Zeilen antippen',
    ergebnis: 'Ergebnis vorhersagen',
    gaps: 'Lücken',
    order: 'Puzzle',
    lines: 'Fehler finden',
    match: 'Zuordnen',
    kernpunkte: 'Freitext mit Kernpunkten'
  };

  function el(tag, klasse, text) {
    const e = document.createElement(tag);
    if (klasse) e.className = klasse;
    if (text !== undefined && text !== null) e.textContent = String(text);
    return e;
  }
  function icon(name) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'icon');
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS(ns, 'use');
    use.setAttribute('href', SPRITE + name);
    svg.appendChild(use);
    return svg;
  }
  const $ = (id) => document.getElementById(id);

  function niveauPlaketten(niveaus) {
    const box = el('span', 'niveaus');
    for (const n of niveaus) box.appendChild(el('span', 'niveau ' + n.toLowerCase(), n));
    return box;
  }

  function verhoerMarke(titel) {
    const m = el('span', 'verhoer-marke');
    m.appendChild(icon('i-verhoer'));
    m.appendChild(document.createTextNode(titel));
    return m;
  }

  function ermittlungZeile(akte, e, letzte) {
    const li = el('li');
    li.appendChild(el('span', 'ds-nr', e.ds.length ? 'DS ' + e.ds.join(', ') : 'DS –'));
    const titel = akte.nr === 7 ? `„${e.titel}“` : `Ermittlung ${e.nr} „${e.titel}“`;
    li.appendChild(el('span', 'ds-titel', titel));
    const inhalt = el('span', 'ds-inhalt', e.beschreibung || '');
    if (letzte && akte.verhoer && akte.verhoer.titel) {
      inhalt.appendChild(document.createTextNode(' '));
      inhalt.appendChild(verhoerMarke(akte.verhoer.titel));
    }
    li.appendChild(inhalt);

    if (akte.status === 'offen') {
      const meta = el('span', 'ermittlung-meta');
      meta.appendChild(el('span', null, `${e.aufgaben} Aufgaben`));
      if (e.coldCase) meta.appendChild(el('span', null, '· Cold Case'));
      if (e.niveau === 'eA') meta.appendChild(el('span', 'niveau ea', 'nur eA'));
      const arten = Object.entries(e.arten || {})
        .sort((x, y) => y[1] - x[1])
        .map(([k, n]) => `${n} × ${ARTEN[k] || k}`);
      if (arten.length) meta.appendChild(el('span', null, '· ' + arten.join(', ')));
      li.appendChild(meta);
      if (e.kompetenzen.length) {
        const ul = el('div', 'chip-liste');
        ul.appendChild(el('span', 'nur-sr', 'Kompetenzen:'));
        for (const k of e.kompetenzen) {
          const c = el('span', 'chip');
          c.appendChild(el('span', 'kid', k.id.replace('DB-', '')));
          c.appendChild(document.createTextNode(k.titel));
          c.title = k.id;
          ul.appendChild(c);
        }
        li.appendChild(ul);
      }
      if (e.fallen.length) {
        const ul = el('div', 'chip-liste');
        ul.appendChild(el('span', 'nur-sr', 'Fallen:'));
        for (const p of e.fallen) {
          const f = el('span', 'falle', p);
          f.title = (FALLEN_TITEL[p] && `Falle ${p}: ${FALLEN_TITEL[p]}`) || `Falle ${p}`;
          ul.appendChild(f);
        }
        li.appendChild(ul);
      }
    }
    return li;
  }

  let FALLEN_TITEL = {};

  // Materialliste (Phase 6 Task 5, E13): Titel, Niveau, Zugang. Gast-Auswahl mit öffentlichem Link; die übrigen
  // Einträge verlinkt erst verlinkeMaterial() nach Anmeldung (GET /api/material, gleiche id).
  function zugangLink(span, url) {
    const a = el('a', null, 'PDF öffnen');
    a.href = url;
    span.replaceChildren(a);
  }
  function materialListe(liste, label) {
    const mat = el('ul', 'material-themen');
    mat.setAttribute('aria-label', label);
    for (const m of liste) {
      const li = el('li');
      if (m.id) li.dataset.material = m.id;
      const titel = el('span', null, m.titel);
      if (m.niveau === 'eA' || m.niveau === 'gA') {
        titel.appendChild(document.createTextNode(' '));
        titel.appendChild(el('span', 'niveau ' + m.niveau.toLowerCase(), m.niveau));
      }
      li.appendChild(titel);
      const zugang = el('span', 'zugang', m.zugang);
      if (m.url) zugangLink(zugang, m.url);
      li.appendChild(zugang);
      mat.appendChild(li);
    }
    return mat;
  }

  /** Angemeldet: Material mit Download-Link versehen (nur, was die Rolle laut /api/material darf). */
  function verlinkeMaterial() {
    fetch('/api/material', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d || !d.rolle || !d.stufen) return;
        const urls = new Map();
        for (const stufe of ['lehrkraft', 'schueler', 'gast']) {
          for (const e of d.stufen[stufe] || []) if (!urls.has(e.id)) urls.set(e.id, e.url);
        }
        for (const li of document.querySelectorAll('.material-themen li[data-material]')) {
          const url = urls.get(li.dataset.material);
          const zugang = li.querySelector('.zugang');
          if (url && zugang && !zugang.querySelector('a')) zugangLink(zugang, url);
        }
      })
      .catch(() => {});
  }

  function akteArtikel(a) {
    const art = el('article', 'aktendeckel akte-thema');
    art.id = 'akte-' + a.nr;
    art.dataset.status = a.status;
    art.setAttribute('aria-labelledby', `akte-${a.nr}-titel`);
    art.appendChild(el('span', 'reiter', a.nr === 5 ? 'Akte 5 · nur eA' : `Akte ${a.nr}`));
    const innen = el('div', 'aktendeckel-innen');
    const kopf = el('div', 'kopfzeile');
    const h2 = el('h2', null, a.titel);
    h2.id = `akte-${a.nr}-titel`;
    kopf.appendChild(h2);
    kopf.appendChild(niveauPlaketten(a.niveaus));
    innen.appendChild(kopf);
    innen.appendChild(el('p', 'fach', a.fach));
    if (a.status === 'folgt') innen.appendChild(el('span', 'stempel klein angesehen akte-status-folgt', 'folgt'));
    const ol = el('ol', 'ds-liste');
    a.ermittlungen.forEach((e, i) => ol.appendChild(ermittlungZeile(a, e, i === a.ermittlungen.length - 1)));
    innen.appendChild(ol);
    innen.appendChild(materialListe(a.materialien, `Materialien zu Akte ${a.nr}`));
    art.appendChild(innen);
    return art;
  }

  function kuerArtikel(kuer, uebergreifend) {
    const art = el('article', 'aktendeckel akte-thema');
    art.id = 'kuer';
    art.setAttribute('aria-labelledby', 'kuer-titel');
    art.appendChild(el('span', 'reiter', 'Kür'));
    const innen = el('div', 'aktendeckel-innen');
    const kopf = el('div', 'kopfzeile');
    const h2 = el('h2', null, 'Kür – wenn Zeit bleibt');
    h2.id = 'kuer-titel';
    kopf.appendChild(h2);
    kopf.appendChild(el('span', 'stempel kuer klein', 'Kür'));
    innen.appendChild(kopf);
    innen.appendChild(el('p', 'fach', 'Zusatzermittlungen, deutlich markiert'));
    const ol = el('ol', 'ds-liste');
    for (const k of kuer) {
      const li = el('li');
      li.appendChild(el('span', 'ds-nr', k.id));
      li.appendChild(el('span', 'ds-titel', `„${k.titel}“ (${k.wann})`));
      li.appendChild(el('span', 'ds-inhalt', k.beschreibung));
      ol.appendChild(li);
    }
    innen.appendChild(ol);
    if (uebergreifend.length) innen.appendChild(materialListe(uebergreifend, 'Material zu allen Akten und zur Kür'));
    art.appendChild(innen);
    return art;
  }

  function niveauZeile(n) {
    const tr = el('tr');
    if (n.akte) {
      tr.dataset.akte = String(n.akte);
      tr.dataset.niveaus = [n.eA ? 'eA' : null, n.gA ? 'gA' : null].filter(Boolean).join(' ');
    } else tr.dataset.kuer = n.kuer;
    const th = el('th', null, n.akte ? `Akte ${n.akte} · ${n.titel}` : `Kür ${n.kuer} · ${n.titel}`);
    th.scope = 'row';
    tr.appendChild(th);
    tr.appendChild(el('td', null, n.fach));
    tr.appendChild(el('td', 'mitte', n.ds));
    for (const [ja, name] of [[n.eA, 'eA'], [n.gA, 'gA']]) {
      const td = el('td', 'mitte');
      td.appendChild(ja ? el('span', 'ja', `✔ ${name}`) : el('span', 'nein', '– entfällt'));
      tr.appendChild(td);
    }
    return tr;
  }

  function zeichne(d) {
    FALLEN_TITEL = Object.fromEntries(d.fallen.map((f) => [f.nr, f.titel]));
    const container = $('akten-themen');
    const frag = document.createDocumentFragment();
    for (const a of d.akten) frag.appendChild(akteArtikel(a));
    frag.appendChild(kuerArtikel(d.kuer, d.materialUebergreifend || []));
    container.replaceChildren(frag);
    container.removeAttribute('aria-busy');

    const fallen = $('fallen-liste');
    fallen.replaceChildren();
    for (const f of d.fallen) {
      const li = el('li');
      li.appendChild(el('span', 'falle', f.nr));
      li.appendChild(document.createTextNode(f.titel));
      fallen.appendChild(li);
    }

    const tbody = $('niveaus-zeilen');
    tbody.replaceChildren(...d.niveaus.map(niveauZeile));
    document.documentElement.dataset.themen = 'bereit';
    verlinkeMaterial();

    // Sprungziel (#akte-3) erst nach dem Zeichnen erreichbar
    if (window.location.hash) {
      const ziel = document.getElementById(window.location.hash.slice(1));
      if (ziel) ziel.scrollIntoView();
    }
  }

  function start() {
    fetch('/api/themen', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Themen'))))
      .then(zeichne)
      .catch(() => {
        const c = $('akten-themen');
        c.replaceChildren(el('p', 'themen-laedt', 'Die Übersicht konnte nicht geladen werden. Lade die Seite neu.'));
        c.removeAttribute('aria-busy');
      });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
