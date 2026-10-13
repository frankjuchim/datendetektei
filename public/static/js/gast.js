// Gastmodus /gast (Spec §7.12, DESIGN.md §5.13, Plan Phase 3 Task 10): Probefall „Eisdiele Weserstedt“ mit
// Aufgabenkarten, Ermittlungskonsole (Module aus ./konsole/) und Prüfen über die Gast-API, Tipps, Lösung,
// Lehrkraft-Demo und Gast-PDFs. Nichts wird gespeichert: Status und Tipps zählt nur diese Seite; SQL-Entwürfe liegen
// nur im localStorage dieses Geräts. Ausgaben ausschließlich als Textknoten.

const version = new URL(import.meta.url).searchParams.get('v') || '';
const mitVersion = (pfad) => (version ? `${pfad}?v=${encodeURIComponent(version)}` : pfad);

const ARTEN = {
  sql: 'Konsole',
  choice: 'Auswahl',
  zeilen: 'Zeilen antippen',
  ergebnis: 'Ergebnis vorhersagen',
  gaps: 'Lücken',
  order: 'Puzzle',
  lines: 'Zeilen finden',
  match: 'Zuordnen'
};
const TEXT_SERVER = 'Das hat gerade nicht geklappt. Versuch es gleich noch einmal.';
const TEXT_ZU_VIELE = 'Du hast in kurzer Zeit sehr viele Antworten geschickt. Warte einen Moment und versuch es dann noch einmal.';
const TEXT_SCHEMA = 'Das Schema konnte nicht geladen werden. Lade die Seite neu.';
const SPRITE = '/static/img/icons.svg#';

const $ = (id) => document.getElementById(id);

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

function speicherLesen(schluessel) {
  try {
    return window.localStorage.getItem(schluessel);
  } catch {
    return null;
  }
}
function speicherSchreiben(schluessel, wert) {
  try {
    window.localStorage.setItem(schluessel, wert);
  } catch {
    /* nicht speicherbar (privater Modus) */
  }
}

const zahlText = (w) => (typeof w === 'number' ? String(w).replace('.', ',') : String(w));

/* ---------- Mini-Markdown (AUFGABENFORMAT §5) als DOM ---------- */

/** Inline: **fett**, *kursiv*, `code` → Fragment aus Textknoten und Elementen. */
function inline(text) {
  const frag = document.createDocumentFragment();
  const re = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g;
  let pos = 0;
  let m;
  const s = String(text);
  while ((m = re.exec(s))) {
    if (m.index > pos) frag.appendChild(document.createTextNode(s.slice(pos, m.index)));
    const t = m[0];
    if (t.startsWith('`')) frag.appendChild(el('code', null, t.slice(1, -1)));
    else if (t.startsWith('**')) frag.appendChild(el('strong', null, t.slice(2, -2)));
    else frag.appendChild(el('em', null, t.slice(1, -1)));
    pos = m.index + t.length;
  }
  if (pos < s.length) frag.appendChild(document.createTextNode(s.slice(pos)));
  return frag;
}

/** Zeilen mit einfachem Umbruch → <br>. */
function mitUmbruch(ziel, text) {
  String(text)
    .split('\n')
    .forEach((zeile, i) => {
      if (i > 0) ziel.appendChild(document.createElement('br'));
      ziel.appendChild(inline(zeile));
    });
  return ziel;
}

/** Absätze (Leerzeile) und Listen (- ) → Fragment. */
function markdown(md) {
  const frag = document.createDocumentFragment();
  for (const absatz of String(md || '').split(/\n\s*\n/)) {
    const zeilen = absatz.split('\n');
    if (zeilen.every((z) => /^\s*- /.test(z))) {
      const ul = el('ul');
      for (const z of zeilen) ul.appendChild(mitUmbruch(el('li'), z.replace(/^\s*- /, '')));
      frag.appendChild(ul);
    } else {
      frag.appendChild(mitUmbruch(el('p'), absatz));
    }
  }
  return frag;
}

/* ---------- Blöcke ---------- */

function sqlHervorheben(ziel, sql) {
  const parser = window.DD_SQL_PARSER;
  const klassen = { schluessel: 'sql-kw', text: 'sql-str', zahl: 'sql-num', kommentar: 'sql-komm', aggregat: 'sql-agg' };
  let teile;
  try {
    teile = parser ? parser.hebeHervor(sql) : [{ text: sql }];
  } catch {
    teile = [{ text: sql }];
  }
  for (const t of teile) {
    const k = klassen[t.klasse];
    ziel.appendChild(k ? el('span', k, t.text) : document.createTextNode(t.text));
  }
}

function codeBlock(b, sql) {
  const pre = el('pre', 'code-block' + (sql ? ' sql-block' : ''));
  const code = el('code');
  if (sql) sqlHervorheben(code, b.sql);
  else code.textContent = b.code;
  pre.appendChild(code);
  return pre;
}

function zelle(wert) {
  const td = el('td');
  if (wert === null || wert === undefined) td.appendChild(el('span', 'null', 'NULL'));
  else {
    td.textContent = zahlText(wert);
    if (typeof wert === 'number') td.className = 'zahl';
  }
  return td;
}

function dbTabelle(b, { auswahl = null } = {}) {
  const rahmen = el('div', 'tabelle-rahmen');
  const tabelle = el('table', 'daten');
  tabelle.appendChild(el('caption', null, b.tabelle));
  const thead = el('thead');
  const tr = el('tr');
  if (auswahl) {
    const th = el('th', 'wahl-spalte');
    th.appendChild(el('span', 'nur-sr', 'Auswahl'));
    tr.appendChild(th);
  }
  for (const k of b.kopf || []) {
    const th = el('th');
    th.scope = 'col';
    if (k.fk) th.appendChild(el('span', 'fk-pfeil', '↑'));
    th.appendChild(el('span', k.pk ? 'pk' : null, k.name));
    tr.appendChild(th);
  }
  thead.appendChild(tr);
  tabelle.appendChild(thead);
  const tbody = el('tbody');
  (b.zeilen || []).forEach((zeile, i) => {
    const r = el('tr');
    if (auswahl) {
      const td = el('td', 'wahl-spalte');
      const label = el('label', 'wahl-ziel');
      const box = el('input');
      box.type = auswahl.mehrfach ? 'checkbox' : 'radio';
      box.name = 'zeilen-wahl';
      box.value = String(i);
      box.setAttribute('aria-label', `Zeile ${i + 1}: ${zeile.map((w) => (w === null ? 'NULL' : zahlText(w))).join(', ')}`);
      const markiere = () => {
        for (const b of auswahl.boxen) b.closest('tr').classList.toggle('gewaehlt', b.checked);
      };
      box.addEventListener('change', markiere);
      r.classList.add('waehlbar');
      r.addEventListener('click', (e) => {
        if (e.target.closest('label')) return;
        box.click();
      });
      label.appendChild(box);
      td.appendChild(label);
      r.appendChild(td);
      auswahl.boxen.push(box);
    }
    for (const w of zeile) r.appendChild(zelle(w));
    tbody.appendChild(r);
  });
  tabelle.appendChild(tbody);
  rahmen.appendChild(tabelle);
  return rahmen;
}

function schemaBlock(b) {
  const ul = el('ul', 'kurzschreibweise');
  for (const r of b.relationen || []) {
    const li = el('li');
    li.appendChild(el('span', 'relation', r.name));
    li.appendChild(document.createTextNode('('));
    (r.attribute || []).forEach((a, i) => {
      if (i > 0) li.appendChild(document.createTextNode(', '));
      if (a.fk) li.appendChild(el('span', 'fk-pfeil', '↑'));
      li.appendChild(el('span', a.pk ? 'pk' : null, a.name));
    });
    li.appendChild(document.createTextNode(')'));
    ul.appendChild(li);
  }
  return ul;
}

function tabelleBlock(b) {
  const rahmen = el('div', 'tabelle-rahmen');
  const t = el('table', 'daten');
  const tr = el('tr');
  for (const k of b.kopf || []) tr.appendChild(el('th', null, k));
  const thead = el('thead');
  thead.appendChild(tr);
  t.appendChild(thead);
  const tbody = el('tbody');
  for (const z of b.zeilen || []) {
    const r = el('tr');
    for (const w of z) r.appendChild(el('td', null, w));
    tbody.appendChild(r);
  }
  t.appendChild(tbody);
  rahmen.appendChild(t);
  return rahmen;
}

/** Ein Block → Element. optionen.auswahl: Zeilenwahl für dbtabelle (Interaktion zeilen). */
function block(b, optionen = {}) {
  switch (b && b.t) {
    case 'text': {
      const d = el('div', 'block-text');
      d.appendChild(markdown(b.md));
      return d;
    }
    case 'hinweis': {
      const box = el('aside', 'notiz');
      box.appendChild(icon('i-notiz'));
      const inhalt = el('div', 'notiz-inhalt');
      inhalt.appendChild(markdown(b.md));
      box.appendChild(inhalt);
      return box;
    }
    case 'code':
      return codeBlock(b, false);
    case 'sql':
      return codeBlock(b, true);
    case 'tabelle':
      return tabelleBlock(b);
    case 'dbtabelle':
      return dbTabelle(b, optionen);
    case 'schema':
      return schemaBlock(b);
    case 'datenbank': {
      const a = el('a', 'knopf leise', 'Datenbank in der Freien Ermittlung öffnen');
      a.href = `/konsole/${encodeURIComponent(b.name)}`;
      return a;
    }
    default:
      return el('div');
  }
}

function bloecke(liste, ziel, optionenJeIndex = () => ({})) {
  ziel.replaceChildren();
  (liste || []).forEach((b, i) => ziel.appendChild(block(b, optionenJeIndex(i))));
}

/* ---------- API ---------- */

async function api(pfad, { methode = 'GET', body } = {}) {
  let antwort;
  try {
    antwort = await fetch(pfad, {
      method: methode,
      credentials: 'same-origin',
      headers: body === undefined ? { Accept: 'application/json' } : { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
  } catch {
    return { fehler: TEXT_SERVER };
  }
  let daten = null;
  try {
    daten = await antwort.json();
  } catch {
    daten = null;
  }
  if (antwort.status === 429) return { fehler: TEXT_ZU_VIELE };
  if (!antwort.ok) return { fehler: (daten && daten.error) || TEXT_SERVER, status: antwort.status };
  return daten || { fehler: TEXT_SERVER };
}

/* ---------- Seite ---------- */

const zustand = new Map(); // id → { status: 'offen'|'geloest'|'angesehen', tipps: [] }
let fall = null;
let aktuell = null; // { aufgabe, sammle(), zeigeLoesung(l) }
let konsole = null; // Promise der Konsole (einmal aufgebaut)

function zustandVon(id) {
  if (!zustand.has(id)) zustand.set(id, { status: 'offen', tipps: [] });
  return zustand.get(id);
}

function stempel(status) {
  if (status === 'geloest') return el('span', 'stempel klein geloest', 'Gelöst');
  if (status === 'angesehen') return el('span', 'stempel klein angesehen', 'Angesehen');
  return null;
}

function zeichneKacheln() {
  const liste = $('gast-aufgaben');
  liste.replaceChildren();
  fall.aufgaben.forEach((a, i) => {
    const li = el('li');
    const knopf = el('button', 'aufgabe-kachel');
    knopf.type = 'button';
    knopf.dataset.id = a.id;
    if (aktuell && aktuell.aufgabe.id === a.id) knopf.setAttribute('aria-current', 'true');
    knopf.appendChild(el('span', 'kachel-nr', String(i + 1)));
    const text = el('span', 'kachel-text');
    text.appendChild(el('span', 'kachel-titel', a.titel));
    const art = [].concat(a.interaktion)[0].kind;
    text.appendChild(el('span', 'kachel-art', `${'★'.repeat(a.stufe)} · ${ARTEN[art] || art}`));
    knopf.appendChild(text);
    const s = stempel(zustandVon(a.id).status);
    if (s) knopf.appendChild(s);
    knopf.addEventListener('click', () => oeffne(a.id, { fokus: true }));
    li.appendChild(knopf);
    liste.appendChild(li);
  });
}

/* ---------- Konsole (einmal aufgebaut, für alle sql-Aufgaben) ---------- */

async function baueKonsole() {
  const [{ erzeugeEditor }, { zeigeSchema, zeigeSchemaFehler }, ergebnis, { erzeugeAusfuehrer }] = await Promise.all([
    import(mitVersion('./konsole/editor.js')),
    import(mitVersion('./konsole/schema.js')),
    import(mitVersion('./konsole/ergebnis.js')),
    import(mitVersion('./konsole/ausfuehren.js'))
  ]);
  if (/Mac|iPhone|iPad/.test(navigator.platform || '')) $('taste').textContent = '⌘ ↵';
  let schema = null;
  let entwurfSchluessel = null;
  let laeuft = null;

  function hinweise(sql) {
    const parser = window.DD_SQL_PARSER;
    const regeln = window.DD_SQL_REGELN;
    if (!parser || !regeln || !sql.trim()) return [];
    try {
      const { ast, fehler } = parser.parse(sql);
      if (fehler && fehler.length) return fehler.map((f) => ({ code: f.code, falle: null, art: 'fehler', text: f.text, zeile: f.zeile, spalte: f.spalte }));
      return regeln.pruefeRegeln(ast, { schema: schema || undefined, abimodus: 'hinweis' });
    } catch {
      return [];
    }
  }

  const editor = erzeugeEditor({
    textarea: $('sql-eingabe'),
    overlay: $('editor-hl'),
    zeilen: $('editor-zeilen'),
    hinweisListe: $('editor-hinweise'),
    beiAusfuehren: () => ausfuehren(),
    beiAenderung: (sql) => {
      if (entwurfSchluessel) speicherSchreiben(entwurfSchluessel, sql);
      editor.setzeMarken(hinweise(sql));
    }
  });

  fetch('/api/db/eisdiele/schema', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Schema'))))
    .then((daten) => {
      schema = daten;
      zeigeSchema($('schema-liste'), schema, { beiSpalte: (text) => editor.fuegeEin(text) });
      editor.setzeMarken(hinweise(editor.wert()));
    })
    .catch(() => zeigeSchemaFehler($('schema-liste'), TEXT_SCHEMA));

  const ausfuehrer = erzeugeAusfuehrer({ dbUrl: '/db/eisdiele.sqlite' });
  let modus = 'browser';
  $('konsole-modus').textContent = 'Konsole wird vorbereitet …';
  const modusBestimmt = ausfuehrer.bereit.then(
    () => {
      modus = 'browser';
      $('konsole-modus').textContent = 'läuft im Browser';
    },
    () => {
      modus = 'server';
      $('konsole-modus').textContent = 'läuft auf dem Server';
    }
  );

  async function aufDemServer(sql, signal) {
    let r;
    try {
      r = await fetch('/api/sql/ausfuehren', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ db: 'eisdiele', sql }),
        signal
      });
    } catch {
      return { fehler: signal.aborted ? 'Abfrage abgebrochen.' : TEXT_SERVER };
    }
    const d = await r.json().catch(() => null);
    if (r.status === 429) return { fehler: TEXT_ZU_VIELE };
    if (d && typeof d.fehler === 'string') return { fehler: d.fehler };
    if (!r.ok || !d || !Array.isArray(d.spalten)) return { fehler: TEXT_SERVER };
    return d;
  }

  function setzeLaeuft(an) {
    $('k-abbrechen').hidden = !an;
    $('k-ausfuehren').disabled = an;
  }

  async function ausfuehren() {
    if (laeuft) return;
    const sql = editor.wert();
    const h = hinweise(sql);
    editor.setzeMarken(h);
    const flaeche = $('ergebnis');
    if (!sql.trim()) {
      ergebnis.zeigeFehler(flaeche, 'Keine Abfrage gefunden. Schreib zuerst eine Abfrage.');
      return;
    }
    const kontrolle = new AbortController();
    laeuft = { abbrechen: () => (modus === 'browser' ? ausfuehrer.abbrechen() : kontrolle.abort()) };
    setzeLaeuft(true);
    ergebnis.zeigeLaeuft(flaeche);
    let antwort;
    let quelle;
    try {
      await modusBestimmt;
      quelle = modus;
      antwort = modus === 'browser' ? await ausfuehrer.fuehreAus(sql) : await aufDemServer(sql, kontrolle.signal);
    } catch {
      antwort = { fehler: TEXT_SERVER };
    } finally {
      laeuft = null;
      setzeLaeuft(false);
    }
    if (antwort && typeof antwort.fehler === 'string') {
      const f = window.DD_SQL_FEHLERTEXTE;
      let text = antwort.fehler;
      if (f && !/[äöüß]|Abfrage|Datenbank/.test(text)) text = f.ordneZu(text).text;
      ergebnis.zeigeFehler(flaeche, text, { art: antwort.abgebrochen ? 'hinweis' : 'fehler', hinweise: h });
      return;
    }
    ergebnis.zeigeErgebnis(flaeche, antwort, { quelle, hinweise: h });
  }

  $('k-ausfuehren').addEventListener('click', () => ausfuehren());
  $('k-abbrechen').addEventListener('click', () => laeuft && laeuft.abbrechen());

  return {
    fuerAufgabe(id, startSql) {
      entwurfSchluessel = `dd-entwurf:gast:${id}`;
      const entwurf = speicherLesen(entwurfSchluessel);
      editor.setzeWert(entwurf !== null ? entwurf : startSql);
      editor.setzeMarken(hinweise(editor.wert()));
      ergebnis.zeigeLeer($('ergebnis'));
    },
    wert: () => editor.wert()
  };
}

/* ---------- Interaktionen ---------- */

function mischen(liste) {
  const a = [...liste];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function choiceInteraktion(ia, ziel) {
  const feld = el('fieldset', 'auswahl');
  feld.appendChild(el('legend', 'nur-sr', ia.mehrfach ? 'Wähle alle passenden Antworten.' : 'Wähle eine Antwort.'));
  const boxen = [];
  for (const o of mischen(ia.optionen || [])) {
    const label = el('label', 'auswahl-option');
    label.dataset.id = o.id;
    const box = el('input');
    box.type = ia.mehrfach ? 'checkbox' : 'radio';
    box.name = 'auswahl';
    box.value = o.id;
    label.appendChild(box);
    const text = el('span', 'auswahl-text');
    if (o.code) {
      const pre = el('pre', 'code-block sql-block');
      const code = el('code');
      sqlHervorheben(code, o.code);
      pre.appendChild(code);
      text.appendChild(pre);
    } else text.appendChild(inline(o.md || ''));
    label.appendChild(text);
    feld.appendChild(label);
    boxen.push(box);
  }
  ziel.appendChild(feld);
  return {
    sammle: () => boxen.filter((b) => b.checked).map((b) => b.value),
    zeigeLoesung: (l) => {
      const richtig = new Set((l && l.richtig) || []);
      for (const b of boxen) b.closest('label').classList.toggle('richtig', richtig.has(b.value));
    }
  };
}

function ergebnisInteraktion(ia, ziel) {
  const rahmen = el('div', 'tabelle-rahmen ergebnis-eingabe');
  const t = el('table', 'daten');
  t.appendChild(el('caption', null, 'Deine Vorhersage'));
  const kopf = el('tr');
  kopf.appendChild(el('th', 'zeilen-nr', '#'));
  for (const k of ia.kopf || []) {
    const th = el('th', null, k);
    th.scope = 'col';
    kopf.appendChild(th);
  }
  const thead = el('thead');
  thead.appendChild(kopf);
  t.appendChild(thead);
  const tbody = el('tbody');
  const felder = [];
  const anzahl = Number.isInteger(ia.zeilenAnzahl) ? ia.zeilenAnzahl : 3;
  for (let z = 0; z < anzahl; z++) {
    const tr = el('tr');
    tr.appendChild(el('td', 'zeilen-nr', String(z + 1)));
    const zeile = [];
    (ia.kopf || []).forEach((k) => {
      const td = el('td');
      const inp = el('input', 'zellen-eingabe');
      inp.type = 'text';
      inp.autocomplete = 'off';
      inp.spellcheck = false;
      inp.setAttribute('aria-label', `Zeile ${z + 1}, ${k}`);
      td.appendChild(inp);
      tr.appendChild(td);
      zeile.push(inp);
    });
    felder.push(zeile);
    tbody.appendChild(tr);
  }
  t.appendChild(tbody);
  rahmen.appendChild(t);
  ziel.appendChild(rahmen);
  return {
    sammle: () => felder.map((z) => z.map((i) => i.value)),
    zeigeLoesung: () => {}
  };
}

/* ---------- Aufgabe öffnen ---------- */

async function oeffne(id, { fokus = false } = {}) {
  const a = fall.aufgaben.find((x) => x.id === id);
  if (!a) return;
  const karte = $('gast-aufgabe');
  karte.hidden = false;
  karte.dataset.aufgabe = a.id;
  const art = [].concat(a.interaktion)[0];
  $('aufgabe-meta').textContent = `Aufgabe ${fall.aufgaben.indexOf(a) + 1} von ${fall.aufgaben.length} · ${'★'.repeat(a.stufe)} · ${a.kategorie}`;
  $('aufgabe-titel').textContent = a.titel;
  $('rueckmeldung').replaceChildren();
  $('loesung').hidden = true;
  $('loesung').replaceChildren();

  let auswahl = null;
  if (art.kind === 'zeilen') auswahl = { mehrfach: art.mehrfach !== false, boxen: [] };
  bloecke(a.inhalt, $('aufgabe-inhalt'), (i) => (auswahl && i === art.block ? { auswahl } : {}));

  const ziel = $('aufgabe-interaktion');
  ziel.replaceChildren();
  $('konsole').hidden = art.kind !== 'sql';
  let interaktion;
  if (art.kind === 'sql') {
    if (!konsole) konsole = baueKonsole();
    const k = await konsole;
    k.fuerAufgabe(a.id, 'SELECT *\nFROM Sorte');
    interaktion = { sammle: () => k.wert(), zeigeLoesung: () => {} };
  } else if (art.kind === 'choice') {
    interaktion = choiceInteraktion(art, ziel);
  } else if (art.kind === 'ergebnis') {
    interaktion = ergebnisInteraktion(art, ziel);
  } else if (art.kind === 'zeilen') {
    ziel.appendChild(el('p', 'hinweis-klein', 'Tippe in der Tabelle oben die passenden Zeilen an.'));
    interaktion = {
      sammle: () => auswahl.boxen.filter((b) => b.checked).map((b) => Number(b.value)),
      zeigeLoesung: (l) => {
        const richtig = new Set((l && l.zeilen) || []);
        auswahl.boxen.forEach((b, i) => b.closest('tr').classList.toggle('richtig', richtig.has(i)));
      }
    };
  } else {
    ziel.appendChild(el('p', 'hinweis-klein', 'Diese Aufgabenart gibt es im Probefall nicht.'));
    interaktion = { sammle: () => null, zeigeLoesung: () => {} };
  }
  aktuell = { aufgabe: a, ...interaktion };
  zeigeStatus();
  zeichneTipps();
  const i = fall.aufgaben.indexOf(a);
  $('k-vorher').disabled = i === 0;
  $('k-nachher').disabled = i === fall.aufgaben.length - 1;
  zeichneKacheln();
  if (fokus) {
    $('aufgabe-titel').focus();
    karte.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }
}

function zeigeStatus() {
  const z = zustandVon(aktuell.aufgabe.id);
  const s = stempel(z.status);
  $('aufgabe-stempel').replaceChildren(...(s ? [s] : []));
}

function zeichneTipps() {
  const a = aktuell.aufgabe;
  const z = zustandVon(a.id);
  const liste = $('tipps');
  liste.replaceChildren();
  z.tipps.forEach((t, i) => {
    const li = el('li', 'tipp');
    li.appendChild(el('span', 'tipp-nr', `Tipp ${i + 1}`));
    const text = el('span', 'tipp-text');
    text.appendChild(inline(t));
    li.appendChild(text);
    liste.appendChild(li);
  });
  const knopf = $('k-tipp');
  knopf.hidden = a.tippsAnzahl === 0;
  knopf.disabled = z.tipps.length >= a.tippsAnzahl;
  knopf.lastChild.textContent = z.tipps.length ? `Noch ein Tipp (${z.tipps.length}/${a.tippsAnzahl})` : 'Tipp';
}

function zeigeRueckmeldung(art, titel, zeilen = []) {
  const box = el('div', 'rueckmeldung-box ' + art);
  box.setAttribute('role', art === 'falsch' ? 'alert' : 'status');
  box.appendChild(el('p', 'rueckmeldung-titel', titel));
  for (const z of zeilen) {
    const p = el('p', 'rueckmeldung-zeile');
    if (z.falle) {
      const f = el('span', 'falle', z.falle);
      f.title = `Falle ${z.falle}`;
      p.appendChild(f);
    }
    p.appendChild(inline(z.text));
    box.appendChild(p);
  }
  $('rueckmeldung').replaceChildren(box);
}

function zeigeLoesung(l) {
  const a = aktuell.aufgabe;
  const ziel = $('loesung');
  ziel.replaceChildren();
  ziel.appendChild(el('h3', null, 'Lösung'));
  const loesung = l.loesung || {};
  if (loesung.sql) ziel.appendChild(codeBlock({ sql: loesung.sql }, true));
  if (Array.isArray(loesung.zeilen) && [].concat(a.interaktion)[0].kind === 'ergebnis') {
    ziel.appendChild(tabelleBlock({ kopf: [].concat(a.interaktion)[0].kopf, zeilen: loesung.zeilen.map((z) => z.map(zahlText)) }));
  }
  aktuell.zeigeLoesung(loesung);
  const erkl = el('div', 'erklaerung');
  bloecke(l.erklaerung || [], erkl);
  ziel.appendChild(erkl);
  ziel.hidden = false;
}

async function pruefen() {
  if (!aktuell) return;
  const a = aktuell.aufgabe;
  const knopf = $('k-pruefen');
  knopf.disabled = true;
  const r = await api(`/api/gast/aufgaben/${encodeURIComponent(a.id)}/pruefen`, { methode: 'POST', body: { antwort: aktuell.sammle() } });
  knopf.disabled = false;
  if (aktuell.aufgabe !== a) return;
  if (r.fehler) {
    zeigeRueckmeldung('hinweis', r.fehler);
    return;
  }
  const z = zustandVon(a.id);
  if (r.ok) {
    if (z.status === 'offen') z.status = 'geloest';
    zeigeRueckmeldung('richtig', 'Sauber ermittelt!');
    if (r.loesung) zeigeLoesung(r.loesung);
  } else {
    const zeilen = [];
    const rm = r.rueckmeldung || {};
    if (Array.isArray(rm.diagnose)) for (const d of rm.diagnose) zeilen.push({ falle: d.falle, text: d.text });
    if (Number.isInteger(rm.zeilen) && [].concat(a.interaktion)[0].kind === 'sql') {
      zeilen.push({ text: `Deine Abfrage liefert ${rm.zeilen} ${rm.zeilen === 1 ? 'Zeile' : 'Zeilen'}.` });
    }
    if (rm.zeilenzahl === 'zu_viele') zeilen.push({ text: 'Du hast zu viele Zeilen ausgefüllt.' });
    if (rm.zeilenzahl === 'zu_wenige') zeilen.push({ text: 'Es fehlen noch Zeilen.' });
    if (rm.nurReihenfolge) zeilen.push({ text: 'Die Zeilen stimmen, nur die Reihenfolge nicht.' });
    if (!zeilen.length) zeilen.push({ text: 'Schau dir die Aufgabe noch einmal genau an – ein Tipp hilft weiter.' });
    zeigeRueckmeldung('falsch', 'Noch nicht.', zeilen);
  }
  zeigeStatus();
  zeichneKacheln();
}

async function tipp() {
  if (!aktuell) return;
  const a = aktuell.aufgabe;
  const z = zustandVon(a.id);
  if (z.tipps.length >= a.tippsAnzahl) return;
  const r = await api(`/api/gast/aufgaben/${encodeURIComponent(a.id)}/tipp`, { methode: 'POST', body: { nr: z.tipps.length + 1 } });
  if (r.fehler) {
    zeigeRueckmeldung('hinweis', r.fehler);
    return;
  }
  z.tipps.push(r.tipp);
  if (aktuell.aufgabe === a) zeichneTipps();
}

async function loesungZeigen() {
  if (!aktuell) return;
  const a = aktuell.aufgabe;
  const r = await api(`/api/gast/aufgaben/${encodeURIComponent(a.id)}/loesung`, { methode: 'POST', body: {} });
  if (r.fehler) {
    zeigeRueckmeldung('hinweis', r.fehler);
    return;
  }
  const z = zustandVon(a.id);
  if (z.status === 'offen') z.status = 'angesehen';
  if (aktuell.aufgabe !== a) return;
  zeigeLoesung(r);
  zeigeStatus();
  zeichneKacheln();
}

/* ---------- Lehrkraft-Demo ---------- */

function tabelle(caption, kopf, zeilen) {
  const rahmen = el('div', 'tabelle-rahmen');
  const t = el('table', 'daten');
  t.appendChild(el('caption', null, caption));
  const thead = el('thead');
  const tr = el('tr');
  for (const k of kopf) {
    const th = el('th', k.klasse || null, k.text);
    th.scope = 'col';
    tr.appendChild(th);
  }
  thead.appendChild(tr);
  t.appendChild(thead);
  const tbody = el('tbody');
  for (const z of zeilen) {
    const r = el('tr');
    z.forEach((w, i) => {
      const td = el(i === 0 ? 'th' : 'td', kopf[i] && kopf[i].klasse ? kopf[i].klasse : null);
      if (i === 0) td.scope = 'row';
      if (w instanceof Node) td.appendChild(w);
      else td.textContent = String(w);
      r.appendChild(td);
    });
    tbody.appendChild(r);
  }
  t.appendChild(tbody);
  rahmen.appendChild(t);
  return rahmen;
}

function anteil(wert) {
  const box = el('span', 'anteil');
  const m = el('meter');
  m.min = 0;
  m.max = 1;
  m.value = wert;
  m.setAttribute('aria-hidden', 'true');
  box.appendChild(m);
  box.appendChild(el('span', 'anteil-text', `${Math.round(wert * 100)} %`));
  return box;
}

async function zeigeLehrkraft() {
  const ziel = $('lehrkraft-inhalt');
  const d = await api('/api/gast/lehrkraft');
  if (d.fehler) {
    ziel.replaceChildren(el('p', 'hinweis-klein', d.fehler));
    return;
  }
  const frag = document.createDocumentFragment();
  const kurs = el('div', 'karte demo-kurs');
  kurs.appendChild(el('span', 'etikett', 'Kurs'));
  kurs.appendChild(el('h3', null, d.kurs.name));
  kurs.appendChild(
    el('p', 'hinweis-klein', `${d.kurs.schueler} Schülerinnen und Schüler · Niveau ${d.kurs.niveau}` +
      (d.kurs.freigeschaltet.length ? ` · freigeschaltet: Akte ${d.kurs.freigeschaltet.join(', ')}` : ''))
  );
  kurs.appendChild(el('p', 'demo-hinweis', d.hinweis));
  frag.appendChild(kurs);
  frag.appendChild(
    tabelle(
      'Rangliste (erfunden)',
      [{ text: 'Name' }, { text: 'Punkte', klasse: 'zahl' }, { text: 'Rang' }, { text: 'Gelöst', klasse: 'zahl' }, { text: 'Verhöre', klasse: 'zahl' }, { text: 'Zuletzt' }],
      d.schueler.map((s) => [s.name, s.punkte, s.rang, s.geloest, s.verhoere, s.zuletztAktiv])
    )
  );
  if (d.ermittlungen.length) {
    frag.appendChild(
      tabelle(
        'Fortschritt je Ermittlung (Durchschnitt)',
        [{ text: 'Ermittlung' }, { text: 'Fortschritt' }],
        d.ermittlungen.map((e) => [`${e.nr} ${e.titel}`, anteil(e.durchschnitt)])
      )
    );
  }
  const fallen = [...d.fallen].filter((f) => f.fehlversuche > 0).sort((x, y) => y.fehlversuche - x.fehlversuche);
  frag.appendChild(
    tabelle(
      'Fallen-Profil des Kurses',
      [{ text: 'Falle' }, { text: 'Kurztitel' }, { text: 'Fehlversuche', klasse: 'zahl' }],
      fallen.map((f) => [f.nr, f.titel, f.fehlversuche])
    )
  );
  frag.appendChild(
    tabelle(
      'Probefall: Quote richtig',
      [{ text: 'Aufgabe' }, { text: 'Quote' }, { text: 'Fehlversuche (Schnitt)', klasse: 'zahl' }],
      d.probefall.map((p) => [`${p.id} ${p.titel}`, anteil(p.quote), String(p.fehlversucheSchnitt).replace('.', ',')])
    )
  );
  ziel.replaceChildren(frag);
}

async function zeigeMaterial() {
  const d = await api('/api/gast/material');
  if (d.fehler || !Array.isArray(d.dateien) || !d.dateien.length) return;
  const liste = $('material-liste');
  for (const m of d.dateien) {
    const li = el('li');
    const a = el('a', null, m.titel);
    a.href = m.url;
    li.appendChild(a);
    li.appendChild(el('span', 'hinweis-klein', m.fassung === 'lehrkraft' ? ' · Lehrkraftfassung' : ' · Schülerfassung'));
    liste.appendChild(li);
  }
  $('gast-material').hidden = false;
}

/* ---------- Start ---------- */

async function start() {
  $('k-pruefen').addEventListener('click', () => pruefen());
  $('k-tipp').addEventListener('click', () => tipp());
  $('k-loesung').addEventListener('click', () => loesungZeigen());
  $('k-vorher').addEventListener('click', () => {
    const i = fall.aufgaben.indexOf(aktuell.aufgabe);
    if (i > 0) oeffne(fall.aufgaben[i - 1].id, { fokus: true });
  });
  $('k-nachher').addEventListener('click', () => {
    const i = fall.aufgaben.indexOf(aktuell.aufgabe);
    if (i < fall.aufgaben.length - 1) oeffne(fall.aufgaben[i + 1].id, { fokus: true });
  });

  zeigeLehrkraft();
  zeigeMaterial();

  const d = await api('/api/gast/probefall');
  if (d.fehler) {
    $('gast-briefing').replaceChildren(el('p', null, d.fehler));
    return;
  }
  fall = d;
  const briefing = $('gast-briefing');
  briefing.replaceChildren(el('p', null, d.briefing));
  briefing.appendChild(el('cite', null, 'Pia Wendland, Eisdiele Weserstedt'));
  bloecke(d.intro, $('gast-intro'));
  const gewuenscht = /^#(G-\d{2})$/.exec(window.location.hash);
  await oeffne(gewuenscht && d.aufgaben.some((a) => a.id === gewuenscht[1]) ? gewuenscht[1] : d.aufgaben[0].id);
  document.documentElement.dataset.gast = 'bereit';
}

start();
