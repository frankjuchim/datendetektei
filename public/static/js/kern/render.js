// Renderer der Aufgabenblöcke (docs/AUFGABENFORMAT.md §5, DESIGN.md §4): text/hinweis (Mini-Markdown), code, sql (mit
// Zeilennummern und Hervorhebung über window.DD_SQL_PARSER.hebeHervor), tabelle, dbtabelle (PK unterstrichen, ↑FK,
// NULL grau, Markierungen), schema (Kurzschreibweise), datenbank (Kachel). Dazu kleine Bausteine: Sterne, Ring,
// Stempel, Fallen-Plakette. Alle Texte als Textknoten – nie HTML aus Zeichenketten.
//
// ctx (optional) verbindet die Blöcke mit den Interaktionen:
//   ctx.gap(id) → Eingabeelement für die Lücke [[id]] (oder null)
//   ctx.zeilenWahl(blockIndex) → { registriere(zeilenEls), klick(nr) } für lines (Zeilen 1-basiert) oder null
//   ctx.zeilenAuswahl(blockIndex) → { registriere(zeilenEls), klick(index) } für zeilen (0-basiert) oder null

const SPRITE = '/static/img/icons.svg#';
const SVG_NS = 'http://www.w3.org/2000/svg';
const LUECKE_RE = /\[\[([A-Za-z0-9_-]{1,40})\]\]/g;

export const FALLEN = Object.freeze({
  P1: 'WHERE ↔ HAVING',
  P2: 'Verbund fehlt oder vervielfacht',
  P3: 'GROUP-BY-Regel',
  P4: 'COUNT ↔ SUM',
  P5: 'NULL und Literale',
  P6: 'Bedingungslogik',
  P7: 'Mehrdeutig oder falsch benannt',
  P8: 'Schlüssel falsch beurteilt',
  P9: 'ER oder Überführung fehlerhaft',
  P10: 'Operator verfehlt'
});

const DATENBANK_TITEL = Object.freeze({
  fundbuero: 'Fundbüro',
  stadtrad: 'StadtRad',
  stadtfest: 'Stadtfest',
  tus: 'TuS Weserstedt',
  detektei: 'Detektei',
  datenspuren: 'Datenspuren',
  eisdiele: 'Eisdiele'
});

const SQL_KLASSEN = { schluessel: 'sql-kw', text: 'sql-str', zahl: 'sql-num', kommentar: 'sql-komm', aggregat: 'sql-agg', operator: 'sql-op' };

/* ---------- DOM-Helfer ---------- */

/** Element mit Klasse und Text (Text immer als Textknoten). */
export function el(tag, klasse, text) {
  const e = document.createElement(tag);
  if (klasse) e.className = klasse;
  if (text !== undefined && text !== null) e.textContent = String(text);
  return e;
}

/** Element mit Kindern (Knoten, Zeichenketten als Textknoten, null wird übersprungen). */
export function h(tag, klasse, ...kinder) {
  const e = el(tag, klasse);
  anhaengen(e, kinder);
  return e;
}

export function anhaengen(e, kinder) {
  for (const k of kinder.flat(Infinity)) {
    if (k === null || k === undefined || k === false) continue;
    e.appendChild(typeof k === 'string' || typeof k === 'number' ? document.createTextNode(String(k)) : k);
  }
  return e;
}

export function svg(tag, attribute = {}, klasse) {
  const e = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attribute)) e.setAttribute(k, String(v));
  if (klasse) e.setAttribute('class', klasse);
  return e;
}

/** SVG-Icon aus dem Sprite. */
export function icon(name, klasse) {
  const s = svg('svg', { 'aria-hidden': 'true' }, 'icon' + (klasse ? ' ' + klasse : ''));
  s.appendChild(svg('use', { href: SPRITE + name }));
  return s;
}

/** Knopf mit optionalem Icon. */
export function knopf(text, klasse = 'knopf', iconName = null) {
  const b = el('button', klasse);
  b.type = 'button';
  if (iconName) b.appendChild(icon(iconName));
  b.appendChild(document.createTextNode(text));
  return b;
}

/** Fisher-Yates – Antwortreihenfolgen nie fest vorgeben (Algo Quest, CLAUDE.md). */
export function mische(liste) {
  const a = [...liste];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ---------- Mini-Markdown ---------- */

function luecke(id, ctx) {
  const feld = ctx && typeof ctx.gap === 'function' ? ctx.gap(id) : null;
  if (feld) return feld;
  return el('span', 'luecke-leer', '[[' + id + ']]');
}

/** Text mit Lücken (ohne weitere Formatierung), Zeilenumbrüche als <br>. */
function textMitLuecken(text, ctx, umbrueche = true) {
  const frag = document.createDocumentFragment();
  let rest = 0;
  const s = String(text);
  for (const m of s.matchAll(LUECKE_RE)) {
    textMitUmbruch(frag, s.slice(rest, m.index), umbrueche);
    frag.appendChild(luecke(m[1], ctx));
    rest = m.index + m[0].length;
  }
  textMitUmbruch(frag, s.slice(rest), umbrueche);
  return frag;
}

function textMitUmbruch(frag, text, umbrueche) {
  if (!text) return;
  const teile = umbrueche ? text.split('\n') : [text];
  teile.forEach((t, i) => {
    if (i > 0) frag.appendChild(el('br'));
    if (t) frag.appendChild(document.createTextNode(t));
  });
}

/** Inline-Markdown: **fett**, *kursiv*, `code`, Lücken [[id]], Zeilenumbruch. */
export function inline(text, ctx) {
  const s = String(text ?? '');
  const frag = document.createDocumentFragment();
  let puffer = '';
  const leeren = () => {
    if (puffer) frag.appendChild(textMitLuecken(puffer, ctx));
    puffer = '';
  };
  let i = 0;
  while (i < s.length) {
    if (s[i] === '`') {
      const j = s.indexOf('`', i + 1);
      if (j > i) {
        leeren();
        const c = el('code');
        c.appendChild(textMitLuecken(s.slice(i + 1, j), ctx, false));
        frag.appendChild(c);
        i = j + 1;
        continue;
      }
    }
    if (s.startsWith('**', i)) {
      const j = s.indexOf('**', i + 2);
      if (j > i + 2) {
        leeren();
        const b = el('strong');
        b.appendChild(inline(s.slice(i + 2, j), ctx));
        frag.appendChild(b);
        i = j + 2;
        continue;
      }
    }
    if (s[i] === '*' && s[i + 1] !== '*' && s[i + 1] !== ' ' && s[i + 1] !== undefined) {
      const j = s.indexOf('*', i + 1);
      if (j > i + 1 && s[j - 1] !== ' ') {
        leeren();
        const k = el('em');
        k.appendChild(inline(s.slice(i + 1, j), ctx));
        frag.appendChild(k);
        i = j + 1;
        continue;
      }
    }
    puffer += s[i];
    i++;
  }
  leeren();
  return frag;
}

/** Mini-Markdown mit Absätzen (Leerzeile) und Listen („- “). tag 'span' → nur inline. */
export function md(text, ctx, tag = 'div') {
  if (tag === 'span') {
    const s = el('span', 'md');
    s.appendChild(inline(text, ctx));
    return s;
  }
  const box = el(tag, 'md');
  const absaetze = String(text ?? '').split(/\n\s*\n/);
  for (const absatz of absaetze) {
    const zeilen = absatz.split('\n');
    let liste = null;
    let p = null;
    for (const zeile of zeilen) {
      const punkt = /^\s*[-•]\s+(.*)$/.exec(zeile);
      if (punkt) {
        if (!liste) {
          liste = el('ul');
          box.appendChild(liste);
        }
        const li = el('li');
        li.appendChild(inline(punkt[1], ctx));
        liste.appendChild(li);
        p = null;
        continue;
      }
      liste = null;
      if (!p) {
        p = el('p');
        box.appendChild(p);
      } else {
        p.appendChild(el('br'));
      }
      p.appendChild(inline(zeile, ctx));
    }
  }
  return box;
}

/* ---------- SQL-Hervorhebung ---------- */

/** SQL-Text (ohne Lücken) als hervorgehobene Spans. */
export function sqlHervorheben(text) {
  const frag = document.createDocumentFragment();
  const parser = window.DD_SQL_PARSER;
  let teile;
  try {
    teile = parser && typeof parser.hebeHervor === 'function' ? parser.hebeHervor(String(text)) : [{ text: String(text) }];
  } catch {
    teile = [{ text: String(text) }];
  }
  for (const t of teile) {
    const klasse = SQL_KLASSEN[t.klasse];
    frag.appendChild(klasse ? el('span', klasse, t.text) : document.createTextNode(t.text));
  }
  return frag;
}

/** Eine Code-/SQL-Zeile mit Lücken; SQL-Teile zwischen den Lücken hervorgehoben. */
function codeZeile(text, ctx, istSql) {
  const frag = document.createDocumentFragment();
  let rest = 0;
  const teil = (t) => (istSql ? sqlHervorheben(t) : document.createTextNode(t));
  for (const m of String(text).matchAll(LUECKE_RE)) {
    if (m.index > rest) frag.appendChild(teil(text.slice(rest, m.index)));
    frag.appendChild(luecke(m[1], ctx));
    rest = m.index + m[0].length;
  }
  if (rest < text.length) frag.appendChild(teil(text.slice(rest)));
  return frag;
}

/* ---------- Blöcke ---------- */

function blockCode(b, ctx, index, istSql) {
  const zeilen = String(istSql ? b.sql : b.code).split('\n');
  const nummern = b.nummern !== false;
  const markiert = new Set(Array.isArray(b.markiere) ? b.markiere : []);
  const wahl = ctx && typeof ctx.zeilenWahl === 'function' ? ctx.zeilenWahl(index) : null;
  const box = el('div', 'code-block' + (istSql ? ' sql' : '') + (nummern || wahl ? ' mit-nummern' : '') + (wahl ? ' waehlbar' : ''));
  box.setAttribute('role', 'group');
  box.setAttribute('aria-label', istSql ? 'SQL-Abfrage' : 'Code');
  const els = [];
  zeilen.forEach((z, i) => {
    const nr = i + 1;
    const zeile = el(wahl ? 'button' : 'div', 'code-zeile' + (markiert.has(nr) ? ' markiert' : ''));
    if (wahl) {
      zeile.type = 'button';
      zeile.setAttribute('aria-pressed', 'false');
      zeile.setAttribute('aria-label', `Zeile ${nr}: ${z.trim() || '(leer)'}`);
      zeile.addEventListener('click', () => wahl.klick(nr));
    }
    if (nummern || wahl) zeile.appendChild(el('span', 'code-nr', nr));
    const text = el('span', 'code-text');
    text.appendChild(z === '' ? document.createTextNode(' ') : codeZeile(z, ctx, istSql));
    zeile.appendChild(text);
    box.appendChild(zeile);
    els.push(zeile);
  });
  if (wahl) wahl.registriere(els);
  const huelle = el('div', 'code-huelle');
  huelle.appendChild(box);
  return huelle;
}

function zellInhalt(wert, ctx) {
  if (wert === null || wert === undefined) return el('span', 'null', 'NULL');
  if (typeof wert === 'number') return document.createTextNode(String(wert).replace('.', ','));
  return textMitLuecken(String(wert), ctx);
}

function blockTabelle(b, ctx) {
  const huelle = el('div', 'tabelle-rahmen');
  const t = el('table', 'daten');
  const kopf = el('tr');
  for (const k of b.kopf || []) {
    const th = el('th');
    th.scope = 'col';
    th.appendChild(inline(k, ctx));
    kopf.appendChild(th);
  }
  t.appendChild(h('thead', null, kopf));
  const tbody = el('tbody');
  for (const z of b.zeilen || []) {
    const tr = el('tr');
    for (const zelle of z) {
      const td = el('td');
      if (typeof zelle === 'string') td.appendChild(inline(zelle, ctx));
      else td.appendChild(zellInhalt(zelle, ctx));
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  t.appendChild(tbody);
  huelle.appendChild(t);
  return huelle;
}

function spaltenKopf(k) {
  const th = el('th');
  th.scope = 'col';
  if (k.fk) {
    const pfeil = el('span', 'fk-pfeil', '↑');
    pfeil.title = typeof k.fk === 'string' ? `Fremdschlüssel auf ${k.fk}` : 'Fremdschlüssel';
    th.appendChild(pfeil);
  }
  const name = el('span', k.pk ? 'pk' : null);
  name.appendChild(textMitLuecken(k.name, null));
  th.appendChild(name);
  const rolle = [k.pk ? 'Primärschlüssel' : '', k.fk ? 'Fremdschlüssel' + (typeof k.fk === 'string' ? ` auf ${k.fk}` : '') : ''].filter(Boolean);
  if (rolle.length) th.appendChild(el('span', 'nur-sr', ` (${rolle.join(', ')})`));
  return th;
}

function blockDbtabelle(b, ctx, index) {
  const auswahl = ctx && typeof ctx.zeilenAuswahl === 'function' ? ctx.zeilenAuswahl(index) : null;
  const huelle = el('div', 'tabelle-rahmen dbtabelle' + (auswahl ? ' waehlbar' : ''));
  const t = el('table', 'daten');
  const cap = el('caption', null, b.tabelle);
  t.appendChild(cap);
  const kopf = el('tr');
  if (auswahl) {
    const th = el('th', 'wahl-spalte');
    th.scope = 'col';
    th.appendChild(el('span', 'nur-sr', 'Auswahl'));
    kopf.appendChild(th);
  }
  (b.kopf || []).forEach((k, i) => {
    const th = spaltenKopf(k);
    const beispiel = (b.zeilen || []).map((z) => z[i]).find((w) => w !== null && w !== undefined);
    if (typeof beispiel === 'number') th.classList.add('zahl');
    kopf.appendChild(th);
  });
  t.appendChild(h('thead', null, kopf));
  const marken = new Map();
  for (const m of Array.isArray(b.markiert) ? b.markiert : []) {
    const key = m.zeile + ':' + (Number.isInteger(m.spalte) ? m.spalte : '*');
    marken.set(key, m);
  }
  const tbody = el('tbody');
  const zeilenEls = [];
  (b.zeilen || []).forEach((z, zi) => {
    const tr = el('tr');
    const ganz = marken.get(zi + ':*');
    if (ganz) tr.classList.add('markiert', 'farbe-' + (ganz.farbe || 'gold'));
    if (auswahl) {
      const td = el('td', 'wahl-spalte');
      const b2 = el('button', 'zeilen-knopf');
      b2.type = 'button';
      b2.setAttribute('aria-pressed', 'false');
      b2.setAttribute('aria-label', `Zeile ${zi + 1} wählen: ${z.map((w) => (w === null ? 'NULL' : String(w))).join(', ')}`);
      b2.appendChild(el('span', 'zeilen-haken', ''));
      b2.addEventListener('click', (e) => {
        e.stopPropagation();
        auswahl.klick(zi);
      });
      td.appendChild(b2);
      tr.appendChild(td);
      tr.addEventListener('click', () => auswahl.klick(zi));
    }
    z.forEach((wert, si) => {
      const td = el('td', typeof wert === 'number' ? 'zahl' : null);
      td.appendChild(zellInhalt(wert, ctx));
      const m = marken.get(zi + ':' + si);
      if (m) td.classList.add('markiert', 'farbe-' + (m.farbe || 'gold'));
      const marke = m || (si === 0 ? ganz : null);
      if (marke && marke.marke) {
        const etikett = el('span', 'marke', marke.marke);
        etikett.setAttribute('aria-label', `Markierung ${marke.marke}`);
        td.appendChild(etikett);
      }
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
    zeilenEls.push(tr);
  });
  t.appendChild(tbody);
  huelle.appendChild(t);
  if (auswahl) auswahl.registriere(zeilenEls);
  return huelle;
}

/** Kurzschreibweise Relation(PK unterstrichen, ↑FK, …). */
export function relation(r, ctx) {
  const zeile = el('div', 'relation');
  zeile.appendChild(el('span', 'relation-name', r.name));
  zeile.appendChild(document.createTextNode('('));
  (r.attribute || []).forEach((a, i) => {
    if (i > 0) zeile.appendChild(document.createTextNode(', '));
    if (a.fk) zeile.appendChild(el('span', 'fk-pfeil', '↑'));
    const n = el('span', a.pk ? 'pk' : null);
    n.appendChild(textMitLuecken(a.name, ctx, false));
    zeile.appendChild(n);
  });
  zeile.appendChild(document.createTextNode(')'));
  const sr = (r.attribute || []).filter((a) => a.pk).map((a) => a.name);
  if (sr.length) zeile.appendChild(el('span', 'nur-sr', ` Primärschlüssel: ${sr.join(', ')}.`));
  return zeile;
}

function blockSchema(b, ctx) {
  const box = el('div', 'schema-block');
  box.setAttribute('role', 'group');
  box.setAttribute('aria-label', 'Relationenschema');
  for (const r of b.relationen || []) box.appendChild(relation(r, ctx));
  return box;
}

const zahlText = (n) => Number(n).toLocaleString('de-DE');

function blockDatenbank(b) {
  const name = String(b.name || '');
  const titel = DATENBANK_TITEL[name] || name;
  const box = el('div', 'db-kachel');
  const kopf = el('div', 'db-kachel-kopf');
  kopf.appendChild(icon('i-konsole'));
  const t = el('p', 'db-kachel-titel');
  t.appendChild(el('span', 'etikett', 'Diese Ermittlung nutzt'));
  t.appendChild(el('strong', null, titel));
  kopf.appendChild(t);
  box.appendChild(kopf);
  const tabellen = el('ul', 'db-kachel-tabellen');
  tabellen.appendChild(el('li', 'leise', 'Schema wird geladen …'));
  box.appendChild(tabellen);
  const reihe = el('div', 'knopf-reihe');
  const frei = el('a', 'knopf', 'Freie Ermittlung');
  frei.href = '/konsole/' + encodeURIComponent(name);
  frei.prepend(icon('i-konsole'));
  const laden = el('a', 'knopf leise', 'Datenbank herunterladen');
  laden.href = '/db/' + encodeURIComponent(name) + '.sqlite';
  laden.setAttribute('download', name + '.sqlite');
  reihe.append(frei, laden);
  box.appendChild(reihe);
  fetch('/api/db/' + encodeURIComponent(name) + '/schema', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Schema'))))
    .then((schema) => {
      tabellen.replaceChildren();
      for (const tab of Array.isArray(schema) ? schema : []) {
        const li = el('li');
        li.appendChild(relation({ name: tab.tabelle, attribute: (tab.spalten || []).map((s) => ({ name: s.name, pk: s.pk, fk: s.fk ? s.fk.tabelle : null })) }));
        li.appendChild(el('span', 'db-zeilen', `${zahlText(tab.zeilen)} ${tab.zeilen === 1 ? 'Zeile' : 'Zeilen'}`));
        tabellen.appendChild(li);
      }
    })
    .catch(() => tabellen.replaceChildren(el('li', 'leise', 'Das Schema konnte nicht geladen werden.')));
  return box;
}

function blockHinweis(b, ctx) {
  const box = el('div', 'notiz');
  box.appendChild(icon('i-notiz'));
  const inhalt = md(b.md, ctx);
  inhalt.classList.add('notiz-inhalt');
  box.appendChild(inhalt);
  return box;
}

/** Einen Block rendern. */
export function block(b, ctx, index) {
  if (!b || typeof b !== 'object') return el('div');
  switch (b.t) {
    case 'text':
      return md(b.md, ctx);
    case 'hinweis':
      return blockHinweis(b, ctx);
    case 'code':
      return blockCode(b, ctx, index, false);
    case 'sql':
      return blockCode(b, ctx, index, true);
    case 'tabelle':
      return blockTabelle(b, ctx);
    case 'dbtabelle':
      return blockDbtabelle(b, ctx, index);
    case 'schema':
      return blockSchema(b, ctx);
    case 'datenbank':
      return blockDatenbank(b);
    default:
      return el('p', 'leise', 'Dieser Baustein kann hier noch nicht angezeigt werden.');
  }
}

/** Liste von Blöcken; jedes Element trägt data-block (Index in der Liste). */
export function bloecke(liste, ctx) {
  const box = el('div', 'bloecke');
  (Array.isArray(liste) ? liste : []).forEach((b, i) => {
    const e = block(b, ctx, i);
    e.dataset.block = String(i);
    box.appendChild(e);
  });
  return box;
}

/* ---------- Kleine Bausteine ---------- */

/** Stufen-Sterne ★★☆ (DESIGN §4.12). */
export function sterne(stufe) {
  const s = el('span', 'sterne');
  s.setAttribute('role', 'img');
  s.setAttribute('aria-label', `Stufe ${stufe} von 3`);
  for (let i = 1; i <= 3; i++) s.appendChild(icon('i-stern', i <= stufe ? 'voll' : 'leer'));
  return s;
}

/** Fortschrittsring (DESIGN §4.8) – Wert über stroke-dashoffset (SVG-Attribut, CSP-fest). */
export function ring(anteil, { text = null, groesse = 56, geschlossen = false, label = null } = {}) {
  const r = 23;
  const umfang = 2 * Math.PI * r;
  const wert = Math.max(0, Math.min(1, Number(anteil) || 0));
  const s = svg('svg', { viewBox: '0 0 56 56', width: groesse, height: groesse }, 'ring' + (geschlossen ? ' geschlossen' : ''));
  if (label) {
    s.setAttribute('role', 'img');
    s.setAttribute('aria-label', label);
  } else {
    s.setAttribute('aria-hidden', 'true');
  }
  s.appendChild(svg('circle', { cx: 28, cy: 28, r }, 'spur'));
  s.appendChild(svg('circle', { cx: 28, cy: 28, r, 'stroke-dasharray': umfang.toFixed(1), 'stroke-dashoffset': (umfang * (1 - wert)).toFixed(1) }, 'wert'));
  const t = svg('text', { x: 28, y: 29 });
  t.textContent = text === null ? String(Math.round(wert * 100)) : String(text);
  s.appendChild(t);
  return s;
}

/** Stempel (DESIGN §4.2). art: geloest | angesehen | abi | kuer; groesse: klein | gross. */
export function stempel(text, art = '', { groesse = '', auftritt = false } = {}) {
  return el('span', ['stempel', art, groesse, auftritt ? 'auftritt' : ''].filter(Boolean).join(' '), text);
}

/** Fallen-Plakette (DESIGN §4.7): nur die Nummer, Kurztitel im title und für Screenreader. */
export function falle(nr, { hell = true } = {}) {
  const p = el('span', 'falle' + (hell ? ' hell' : ''), nr);
  const titel = FALLEN[nr];
  if (titel) {
    p.title = `Falle ${nr}: ${titel}`;
    p.setAttribute('aria-label', `Falle ${nr}: ${titel}`);
  }
  return p;
}

/** Text mit `code` (Diagnosen) → Textknoten und <code>. */
export function mitCode(text) {
  const frag = document.createDocumentFragment();
  String(text ?? '')
    .split('`')
    .forEach((teil, i) => {
      if (teil === '') return;
      frag.appendChild(i % 2 === 1 ? el('code', null, teil) : document.createTextNode(teil));
    });
  return frag;
}

/** Diagnoseliste (hell, für Feedback-Karten). */
export function diagnoseListe(diagnose) {
  const ul = el('ul', 'diagnose-liste');
  for (const d of Array.isArray(diagnose) ? diagnose : []) {
    const li = el('li', d.art === 'hinweis' ? 'hinweis' : null);
    if (d.falle) li.appendChild(falle(d.falle));
    const t = el('span', 'diagnose-text');
    if (d.zeile) t.appendChild(el('span', 'diagnose-ort', `Zeile ${d.zeile}: `));
    t.appendChild(mitCode(d.text));
    li.appendChild(t);
    ul.appendChild(li);
  }
  return ul;
}

export { DATENBANK_TITEL };
