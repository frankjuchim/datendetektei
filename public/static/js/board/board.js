// Beamer-Board /board/:schluessel (DESIGN §5.12, Spec §7.12): holt GET /api/board/:schluessel alle 20 s, zeigt
// Top 15, Akten-Fortschritt und letzte Erfolge; neue Erfolge blenden weich ein (bei prefers-reduced-motion ohne
// Bewegung). Ungültig/ausgeschaltet (404): freundlicher Hinweis, es wird weiter nachgefragt. Keine Bedienelemente,
// nur Anzeigenamen. Ausgaben nur als Textknoten.

const V = new URL(import.meta.url).search;
const R = await import('../kern/render.js' + V);
const { el, h } = R;

const $ = (id) => document.getElementById(id);
const AKTUALISIERUNG_MS = 20000;
const schluessel = decodeURIComponent(window.location.pathname.split('/')[2] || '');
const ruhig = window.matchMedia('(prefers-reduced-motion: reduce)');
const STEMPEL = { geloest: ['Gelöst', 'geloest'], verhoer: ['Besiegt', 'besiegt'], abzeichen: ['Abzeichen', 'abzeichen'] };

let bekannt = null; // Schlüssel der zuletzt gezeigten Erfolge (für „neu“)

function uhr() {
  $('board-uhr').textContent = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

function zeit(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

function rangliste(liste) {
  const ol = $('board-rangliste');
  if (!liste.length) {
    ol.replaceChildren(el('li', 'board-leer', 'Noch keine Punkte – die erste Spur wartet.'));
    return;
  }
  ol.replaceChildren(
    ...liste.map((z) => {
      const li = el('li', 'board-zeile' + (z.platz <= 3 ? ' top' : ''));
      li.append(
        el('span', 'board-platz', String(z.platz)),
        h('span', 'board-name', el('strong', null, z.name), el('span', 'board-rang', z.rang)),
        el('span', 'board-punkte', Number(z.punkte).toLocaleString('de-DE'))
      );
      li.setAttribute('aria-label', `Platz ${z.platz}: ${z.name}, ${z.rang}, ${z.punkte} Punkte`);
      return li;
    })
  );
}

function akten(liste) {
  $('board-akten').replaceChildren(
    ...liste.map((a) => {
      const li = el('li', 'board-akte' + (a.freigeschaltet ? '' : ' gesperrt'));
      if (typeof a.farbe === 'string' && /^#[0-9a-fA-F]{6}$/.test(a.farbe)) li.style.setProperty('--akte-farbe', a.farbe);
      if (a.freigeschaltet) li.appendChild(R.ring(a.anteil, { label: `${a.nr === 8 ? 'Kür' : 'Akte ' + a.nr}: ${Math.round(a.anteil * 100)} Prozent` }));
      else {
        const s = el('span', 'board-schloss');
        s.appendChild(R.icon('i-schloss'));
        li.appendChild(s);
      }
      li.appendChild(el('strong', null, a.nr === 8 ? 'Kür' : `Akte ${a.nr}`));
      li.appendChild(el('span', null, a.freigeschaltet ? `${Math.round(a.anteil * 100)} %` : 'gesperrt'));
      li.title = a.titel;
      return li;
    })
  );
}

function erfolgSchluessel(e) {
  return [e.art, e.name, e.zeit, e.aufgabe || e.akte || e.abzeichen].join('|');
}

function erfolge(liste) {
  const ul = $('board-erfolge');
  const neueSchluessel = new Set(liste.map(erfolgSchluessel));
  const items = liste.map((e) => {
    const [text, klasse] = STEMPEL[e.art] || [e.art, ''];
    const li = el('li', 'board-erfolg');
    if (bekannt && !bekannt.has(erfolgSchluessel(e)) && !ruhig.matches) li.classList.add('neu');
    const was =
      e.art === 'geloest' ? `${e.titel} · ${e.aufgabe}` : e.art === 'verhoer' ? e.titel : `${e.abzeichen}${e.akte ? ` (Akte ${e.akte})` : ''}`;
    li.append(
      el('span', 'stempel klein ' + klasse, text),
      h('span', 'board-erfolg-text', el('strong', null, e.name), ` · ${was}`),
      h('span', 'board-erfolg-zeit', e.art === 'geloest' && e.stufe ? R.sterne(e.stufe) : null, zeit(e.zeit))
    );
    return li;
  });
  if (!items.length) items.push(el('li', 'board-leer', 'Noch keine Erfolge – gleich geht es los.'));
  ul.replaceChildren(...items);
  // Was nicht ganz auf den Bildschirm passt, fällt weg (kein Scrollen am Beamer)
  while (ul.children.length > 1 && ul.scrollHeight > ul.clientHeight + 1) ul.lastElementChild.remove();
  bekannt = neueSchluessel;
}

function nichtErreichbar() {
  $('board-raster').hidden = true;
  $('board-kurs').textContent = '';
  const hinweis = $('board-hinweis');
  hinweis.hidden = false;
  hinweis.className = 'board-hinweis fehler';
  hinweis.textContent = 'Dieses Board ist gerade nicht erreichbar. Vielleicht wurde es ausgeschaltet oder der Link erneuert – die Lehrkraft findet den aktuellen Link im Lehrkraft-Bereich.';
  document.title = 'Board nicht erreichbar – Datendetektei';
}

async function laden() {
  uhr();
  let antwort;
  try {
    antwort = await fetch('/api/board/' + encodeURIComponent(schluessel), { headers: { Accept: 'application/json' }, cache: 'no-store', referrerPolicy: 'no-referrer' });
  } catch {
    // Netz weg: letzten Stand stehen lassen
    document.documentElement.dataset.board = 'offline';
    return;
  }
  if (antwort.status === 404) {
    nichtErreichbar();
    document.documentElement.dataset.board = 'fehlt';
    return;
  }
  if (!antwort.ok) return;
  const d = await antwort.json();
  $('board-kurs').textContent = d.kurs && d.kurs.name ? d.kurs.name : '';
  document.title = `Beamer-Board${d.kurs && d.kurs.name ? ' · ' + d.kurs.name : ''} – Datendetektei`;
  $('board-hinweis').hidden = true;
  $('board-raster').hidden = false;
  rangliste(d.rangliste || []);
  akten(d.akten || []);
  erfolge(d.erfolge || []);
  document.documentElement.dataset.board = 'bereit';
  document.documentElement.dataset.boardZeit = d.zeit || '';
}

laden();
setInterval(laden, AKTUALISIERUNG_MS);
setInterval(uhr, 15000);
