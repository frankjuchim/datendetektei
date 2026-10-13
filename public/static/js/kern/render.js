// Renderer der Aufgabenblöcke (docs/AUFGABENFORMAT.md §5, DESIGN.md §4): text/hinweis (Mini-Markdown), code, sql (mit
// Zeilennummern und Hervorhebung über window.DD_SQL_PARSER.hebeHervor), tabelle, dbtabelle (PK unterstrichen, ↑FK,
// NULL grau, Markierungen), schema (Kurzschreibweise), datenbank (Kachel), zeitlupe/spurenbrett/sortierfaecher
// (eingebettete Verstehenshilfen, Phase 4), er/mengen (Modellierung, Phase 5: bauplan/block.js). Dazu kleine Bausteine: Sterne, Ring,
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

/* ---------- Verstehenshilfen als Blöcke (Phase 4): zeitlupe, spurenbrett, sortierfaecher ---------- */
// Kompakte eingebettete Fassung des Werkzeugs: gerechnet im Browser (sql.js-Worker, öffentliche Übungs-DB) über
// src/sql/visual.js – Zeitlupe als Schrittliste mit Zählern, Spurenbrett mit Karteikarten und Fäden, Sortierfächer mit
// Fächern und Aggregaten – plus Knopf ins volle Werkzeug (Übergabe per sessionStorage, konsole/werkzeuge.js).
// Ein Block zeigt nur seine eigene Abfrage bzw. Tabelle; Lösungsdaten erreichen den Browser hierüber nie.

const V = new URL(import.meta.url).search;
const WERKZEUG = Object.freeze({
  zeitlupe: { titel: 'Zeitlupe', icon: 'i-zeitlupe', knopf: 'In der Zeitlupe öffnen' },
  spurenbrett: { titel: 'Spurenbrett', icon: 'i-faden', knopf: 'Im Spurenbrett öffnen' },
  sortierfaecher: { titel: 'Sortierfächer', icon: 'i-karte', knopf: 'In den Sortierfächern öffnen' }
});
const SKRIPTE = [
  ['DD_SQL_PARSER', '/static/js/sql/parser.js'],
  ['DD_SQL_FEHLERTEXTE', '/static/js/sql/fehlertexte.js'],
  ['DD_SQL_VISUAL', '/static/js/sql/visual.js']
];
const TEXT_WB_LAEDT = 'Wird vorbereitet …';
const TEXT_WB_LADEFEHLER = 'Die Datenbank konnte nicht geladen werden. Lade die Seite neu.';
const ausfuehrerJeDb = new Map(); // db → Promise<{ fuehreAus, schema } | { fehler }>

/* ---------- Modellierung (Phase 5): Blöcke er und mengen aus bauplan/block.js (SVG nach DESIGN §4.14) ---------- */
// ctx.erAuswahl(blockIndex) → { klick(id), registriere(api) } für die Interaktion er im Lesen-Modus (oder null).
const BAUPLAN = await import('../bauplan/block.js' + V);

function blockEr(b, ctx, index) {
  const wahl = ctx && typeof ctx.erAuswahl === 'function' ? ctx.erAuswahl(index) : null;
  return BAUPLAN.erBlock(b, wahl);
}
let skripteGeladen = null;

/** Klassische Skripte (Parser, Fehlertexte, Rechenschicht) nachladen, falls die Seite sie nicht schon hat. */
function ladeSkripte() {
  if (!skripteGeladen) {
    skripteGeladen = SKRIPTE.reduce(
      (kette, [global, pfad]) =>
        kette.then(
          () =>
            window[global] ||
            new Promise((resolve, reject) => {
              const s = document.createElement('script');
              s.src = pfad + V;
              s.addEventListener('load', resolve);
              s.addEventListener('error', () => reject(new Error(pfad)));
              document.head.appendChild(s);
            })
        ),
      Promise.resolve()
    );
  }
  return skripteGeladen;
}

/** Ein Ausführer je DB und Seite (alle Blöcke teilen ihn), dazu das Schema. */
function rechnerFuer(db) {
  if (!ausfuehrerJeDb.has(db)) {
    const p = (async () => {
      try {
        await ladeSkripte();
        const { erzeugeAusfuehrer, werkzeugBereit } = await import('../konsole/ausfuehren.js' + V);
        const ausfuehrer = erzeugeAusfuehrer({ dbUrl: `/db/${encodeURIComponent(db)}.sqlite` });
        const f = await werkzeugBereit(ausfuehrer);
        if (f) return { fehler: f.art === 'wasm' ? f.text : TEXT_WB_LADEFEHLER };
        const schema = await fetch(`/api/db/${encodeURIComponent(db)}/schema`, { credentials: 'same-origin', headers: { Accept: 'application/json' } })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null);
        return { fuehreAus: (sql) => ausfuehrer.fuehreAus(sql), schema: Array.isArray(schema) ? schema : null };
      } catch {
        return { fehler: TEXT_WB_LADEFEHLER };
      }
    })();
    ausfuehrerJeDb.set(db, p);
  }
  return ausfuehrerJeDb.get(db);
}

/** Zahl wie in visual.js: Tausender mit geschütztem Leerzeichen (33 240). */
const wbZahl = (n) => String(n).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');
function wbWert(w) {
  if (w === null || w === undefined) return el('span', 'null', 'NULL');
  if (typeof w === 'number') return document.createTextNode(String(w).replace('.', ','));
  return document.createTextNode(String(w));
}

/** Rahmen eines Werkzeug-Blocks: Kopf, Inhalt (zunächst „wird vorbereitet“), Knopf ins Werkzeug. */
function werkzeugRahmen(b, art, uebergabe) {
  const w = WERKZEUG[art];
  const db = String(b.datenbank || '');
  const box = el('figure', `werkzeug-block wb-${art}`);
  box.setAttribute('aria-label', `${w.titel}: ${DATENBANK_TITEL[db] || db}`);
  const kopf = el('figcaption', 'wb-kopf');
  kopf.appendChild(icon(w.icon));
  kopf.appendChild(el('span', 'wb-titel', w.titel));
  kopf.appendChild(el('span', 'wb-db', `${DATENBANK_TITEL[db] || db} · Übungs-DB`));
  box.appendChild(kopf);
  const inhalt = el('div', 'wb-inhalt');
  box.appendChild(inhalt);
  const status = el('p', 'wb-status', TEXT_WB_LAEDT);
  status.setAttribute('role', 'status');
  box.appendChild(status);
  const reihe = el('div', 'knopf-reihe wb-knoepfe');
  const oeffnen = knopf(w.knopf, 'knopf', w.icon);
  oeffnen.dataset.werkzeug = art;
  oeffnen.addEventListener('click', async () => {
    const W = await import('../konsole/werkzeuge.js' + V);
    W.oeffneWerkzeug(art, { db, ...uebergabe });
  });
  reihe.appendChild(oeffnen);
  box.appendChild(reihe);
  return {
    box,
    inhalt,
    reihe,
    status(text, art2 = '') {
      status.className = 'wb-status' + (art2 ? ' ' + art2 : '');
      status.textContent = text || '';
      status.hidden = !text;
    }
  };
}

function blockZeitlupe(b) {
  const r = werkzeugRahmen(b, 'zeitlupe', { sql: String(b.sql || ''), zurueck: window.location.pathname, start: b.start || null });
  r.inhalt.appendChild(block({ t: 'sql', sql: String(b.sql || ''), nummern: false }));
  const liste = el('ol', 'wb-schritte');
  r.inhalt.appendChild(liste);
  rechnerFuer(b.datenbank).then(async (rechner) => {
    if (rechner.fehler) return r.status(rechner.fehler, 'fehler');
    let erg;
    try {
      erg = await window.DD_SQL_VISUAL.zeitlupe(String(b.sql || ''), rechner.fuehreAus);
    } catch {
      erg = { fehler: 'Diese Abfrage kann hier nicht Schritt für Schritt gezeigt werden.' };
    }
    if (erg.fehler || !erg.schritte || !erg.schritte.length) return r.status(erg.fehler || erg.hinweis, 'fehler');
    r.status('');
    for (const s of erg.schritte) {
      const li = el('li', 'wb-schritt' + (b.start && s.klausel === b.start ? ' aktiv' : ''));
      li.appendChild(el('span', 'wb-nr', s.nummer));
      const kopf = el('p', 'wb-schritt-kopf');
      kopf.appendChild(el('strong', 'wb-klausel', s.klausel));
      const z = s.zaehler || {};
      const zahlText = (z.rechnung ? `${z.rechnung} = ` : '') + `${wbZahl(z.wert)} ${z.einheit || ''}`.trim();
      kopf.appendChild(el('span', 'wb-zaehler', zahlText));
      li.appendChild(kopf);
      li.appendChild(el('p', 'wb-schritt-text', s.text));
      if (b.start && s.klausel === b.start) li.setAttribute('aria-current', 'step');
      liste.appendChild(li);
    }
  });
  return r.box;
}

function blockSortierfaecher(b) {
  const r = werkzeugRahmen(b, 'sortierfaecher', { sql: String(b.sql || '') });
  r.inhalt.appendChild(block({ t: 'sql', sql: String(b.sql || ''), nummern: false }));
  const korb = el('p', 'wb-korb');
  korb.hidden = true;
  const faecher = el('ul', 'wb-faecher');
  const hinweis = el('p', 'wb-hinweis');
  hinweis.hidden = true;
  r.inhalt.append(korb, faecher, hinweis);
  rechnerFuer(b.datenbank).then(async (rechner) => {
    if (rechner.fehler) return r.status(rechner.fehler, 'fehler');
    let erg;
    try {
      erg = await window.DD_SQL_VISUAL.sortierfaecher(String(b.sql || ''), rechner.fuehreAus);
    } catch {
      erg = { fehler: 'Diese Abfrage kann hier nicht einsortiert werden.' };
    }
    if (erg.fehler || !erg.faecher || !erg.faecher.length) return r.status(erg.fehler || erg.hinweis, 'fehler');
    r.status('');
    if (erg.korb && erg.korb.anzahl > 0) {
      korb.hidden = false;
      korb.appendChild(el('strong', null, 'Korb (WHERE): '));
      korb.appendChild(document.createTextNode(`${wbZahl(erg.korb.anzahl)} ${erg.korb.anzahl === 1 ? 'Zeile fällt' : 'Zeilen fallen'} schon vor dem Gruppieren heraus.`));
    }
    for (const f of erg.faecher) {
      const li = el('li', 'wb-fach' + (f.farbe ? ` g${f.farbe}` : ' g-ohne') + (f.havingRaus ? ' raus' : ''));
      const kopf = el('p', 'wb-fach-kopf');
      if (f.farbe) {
        const marke = el('span', 'wb-marke', '');
        marke.setAttribute('aria-hidden', 'true');
        kopf.appendChild(marke);
      }
      kopf.appendChild(el('strong', 'wb-fach-name', f.name || 'alle Zeilen'));
      kopf.appendChild(el('span', 'wb-fach-zahl', `${wbZahl(f.anzahl)} ${f.anzahl === 1 ? 'Karte' : 'Karten'}`));
      li.appendChild(kopf);
      const dl = el('dl', 'wb-aggregate');
      (erg.aggregate || []).forEach((name, i) => {
        dl.appendChild(el('dt', null, name));
        const dd = el('dd');
        dd.appendChild(wbWert(f.aggregate ? f.aggregate[i] : null));
        dl.appendChild(dd);
      });
      li.appendChild(dl);
      if (f.havingRaus) li.appendChild(el('p', 'wb-raus', 'fällt durch HAVING heraus'));
      faecher.appendChild(li);
    }
    if (erg.hinweis) {
      hinweis.hidden = false;
      hinweis.textContent = erg.hinweis;
    }
  });
  return r.box;
}

/** Spalten einer Karteikarte: Primärschlüssel, Fremdschlüssel zu den anderen Tabellen, eine weitere Spalte (≤ 3). */
function kartenSpalten(t, alle, schema) {
  const eintrag = Array.isArray(schema) ? schema.find((x) => String(x.tabelle).toLowerCase() === t.name.toLowerCase()) : null;
  const andere = new Set(alle.filter((x) => x !== t).map((x) => x.name.toLowerCase()));
  const fk = new Set();
  if (eintrag) {
    for (const s of eintrag.spalten || []) if (s.fk && andere.has(String(s.fk.tabelle).toLowerCase())) fk.add(s.name);
  }
  const wahl = [...t.pk];
  t.spalten.forEach((s, i) => {
    if (fk.has(s) && !wahl.includes(i)) wahl.push(i);
  });
  const weitere = t.spalten.findIndex((s, i) => !wahl.includes(i) && !/(id|nr)$/i.test(s));
  if (weitere >= 0) wahl.splice(Math.min(wahl.length, t.pk.length), 0, weitere);
  return wahl.slice(0, 3);
}

function blockSpurenbrett(b) {
  const tabellen = Array.isArray(b.tabellen) ? b.tabellen : [];
  const r = werkzeugRahmen(b, 'spurenbrett', {
    tabellen: tabellen.map((t) => ({ name: t.name, limit: Array.isArray(t.zeilen) ? Math.min(50, t.zeilen.length) : t.limit || 5 })),
    bedingung: typeof b.bedingung === 'string' ? b.bedingung : ''
  });
  if (typeof b.bedingung === 'string' && b.bedingung.trim()) {
    r.inhalt.appendChild(block({ t: 'sql', sql: 'WHERE ' + b.bedingung.trim(), nummern: false }));
  }
  const zaehler = el('p', 'wb-zaehler-zeile');
  zaehler.hidden = true;
  const brett = el('div', 'wb-brett');
  const ohne = el('p', 'wb-hinweis');
  ohne.hidden = true;
  r.inhalt.append(zaehler, brett, ohne);
  rechnerFuer(b.datenbank).then(async (rechner) => {
    if (rechner.fehler) return r.status(rechner.fehler, 'fehler');
    let erg;
    try {
      erg = await window.DD_SQL_VISUAL.spurenbrett({ tabellen: tabellen.map((t) => ({ ...t })), bedingung: b.bedingung }, rechner.fuehreAus);
    } catch {
      erg = { fehler: 'Das Spurenbrett kann hier nicht gezeigt werden.' };
    }
    if (erg.fehler) return r.status(erg.fehler, 'fehler');
    r.status('');
    zaehler.hidden = false;
    zaehler.textContent = erg.text;
    if (erg.zusammengefasst) {
      ohne.hidden = false;
      ohne.textContent = erg.hinweis;
      return;
    }
    // Karteikarten je Tabelle in einer Spalte
    brett.classList.add(`spalten-${erg.tabellen.length}`);
    const karten = erg.tabellen.map((t, ti) => {
      const stapel = el('div', 'wb-stapel');
      stapel.appendChild(el('p', 'wb-stapel-titel', t.name));
      const spalten = kartenSpalten(t, erg.tabellen, rechner.schema);
      const els = t.zeilen.map((z, zi) => {
        const karte = el('div', 'wb-karte');
        const dl = el('dl');
        for (const i of spalten) {
          dl.appendChild(el('dt', null, t.spalten[i]));
          const dd = el('dd');
          dd.appendChild(wbWert(z[i]));
          dl.appendChild(dd);
        }
        karte.appendChild(dl);
        if (erg.ohneFaden.some((o) => o.tabelle === ti && o.zeile === zi)) {
          karte.classList.add('ohne-faden');
          karte.appendChild(el('span', 'wb-kein-faden', 'kein Faden'));
        }
        stapel.appendChild(karte);
        return karte;
      });
      brett.appendChild(stapel);
      return els;
    });
    // Fäden als SVG über dem Brett (Segmente zwischen benachbarten Spalten)
    const flaeche = svg('svg', { 'aria-hidden': 'true', focusable: 'false' }, 'wb-faeden');
    brett.appendChild(flaeche);
    const segmente = new Map(); // 'k:i:j' → passt?
    const passend = new Set((erg.passend || []).map((p) => p.join(',')));
    for (const f of erg.faeden) {
      const passt = !erg.passend || passend.has(f.join(','));
      for (let k = 0; k + 1 < f.length; k++) {
        const key = `${k}:${f[k]}:${f[k + 1]}`;
        segmente.set(key, segmente.get(key) || passt);
      }
    }
    function zeichne() {
      if (!brett.isConnected) return;
      const basis = brett.getBoundingClientRect();
      flaeche.setAttribute('width', String(Math.round(basis.width)));
      flaeche.setAttribute('height', String(Math.round(basis.height)));
      flaeche.setAttribute('viewBox', `0 0 ${Math.round(basis.width)} ${Math.round(basis.height)}`);
      flaeche.replaceChildren();
      for (const [key, passt] of segmente) {
        const [k, i, j] = key.split(':').map(Number);
        const a = karten[k][i].getBoundingClientRect();
        const c = karten[k + 1][j].getBoundingClientRect();
        const linie = svg('line', {
          x1: (a.right - basis.left).toFixed(1),
          y1: (a.top + a.height / 2 - basis.top).toFixed(1),
          x2: (c.left - basis.left).toFixed(1),
          y2: (c.top + c.height / 2 - basis.top).toFixed(1)
        }, 'wb-faden' + (erg.passend ? (passt ? ' passt' : ' weg') : ''));
        flaeche.appendChild(linie);
      }
    }
    if (typeof ResizeObserver === 'function') new ResizeObserver(() => zeichne()).observe(brett);
    window.requestAnimationFrame(zeichne);
    if (erg.ohneFaden.length && erg.passend) {
      ohne.hidden = false;
      const namen = erg.ohneFaden.map((o) => {
        const t = erg.tabellen[o.tabelle];
        return `${t.name} ${t.pk.map((p) => (t.zeilen[o.zeile][p] === null ? 'NULL' : String(t.zeilen[o.zeile][p]))).join('/')}`;
      });
      ohne.textContent = `Ohne Faden: ${namen.join(', ')}. Für diese Karten erfüllt keine Kombination die Bedingung – ein Vergleich mit NULL ist nie wahr.`;
    }
  });
  return r.box;
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
    case 'zeitlupe':
      return blockZeitlupe(b);
    case 'spurenbrett':
      return blockSpurenbrett(b);
    case 'sortierfaecher':
      return blockSortierfaecher(b);
    case 'er':
      return blockEr(b, ctx, index);
    case 'mengen':
      return BAUPLAN.mengenBlock(b);
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
