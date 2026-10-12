// Ergebnisbereich der Ermittlungskonsole (DESIGN.md §4.10, §9): Kopf „N Zeilen · M Spalten“ (+ „angezeigt: 300“),
// Laufzeit, Diagnose mit Fallen-Plakette, Ergebnistabelle (max. 300 Zeilen, Kopf klebt), Leer-, Lauf-, Kein-Treffer-
// und Fehlerzustand. Ausgaben nur als Textknoten.

export const TEXT_LEER = 'Noch nichts ausgeführt. Schreib deine Abfrage und tippe auf „Ausführen“.';
export const TEXT_KEIN_TREFFER = 'Keine Zeile erfüllt alle Bedingungen.';
export const TEXT_LAEUFT = 'Abfrage läuft …';

function el(tag, klasse, text) {
  const e = document.createElement(tag);
  if (klasse) e.className = klasse;
  if (text !== undefined && text !== null) e.textContent = String(text);
  return e;
}

const zahl = (n) => Number(n).toLocaleString('de-DE');
const mehrzahl = (n, eins, viele) => `${zahl(n)} ${n === 1 ? eins : viele}`;

/** Text mit `Code` in Backticks → Textknoten und <code>. */
function mitCode(text) {
  const frag = document.createDocumentFragment();
  String(text)
    .split('`')
    .forEach((teil, i) => {
      if (teil === '') return;
      frag.appendChild(i % 2 === 1 ? el('code', null, teil) : document.createTextNode(teil));
    });
  return frag;
}

/** Diagnose-Block (Parser-/Regel-Hinweise oder ein Fehler). eintraege = [{ falle?, text, zeile? }] */
function diagnose(eintraege, art) {
  const box = el('div', 'diagnose' + (art === 'hinweis' ? ' hinweis' : ''));
  box.setAttribute('role', art === 'hinweis' ? 'note' : 'alert');
  for (const d of eintraege) {
    const zeile = el('p', 'diagnose-zeile');
    if (d.falle) {
      const p = el('span', 'falle', d.falle);
      p.title = `Falle ${d.falle}`;
      zeile.appendChild(p);
    }
    const text = el('span', 'diagnose-text');
    if (d.zeile) text.appendChild(el('span', 'diagnose-ort', `Zeile ${d.zeile}: `));
    text.appendChild(mitCode(d.text));
    zeile.appendChild(text);
    box.appendChild(zeile);
  }
  return box;
}

function hinweisBlock(hinweise) {
  if (!Array.isArray(hinweise) || hinweise.length === 0) return null;
  const art = hinweise.some((h) => h.art === 'fehler') ? 'fehler' : 'hinweis';
  return diagnose(hinweise, art);
}

function quelleText(quelle) {
  return quelle === 'server' ? 'Ausgeführt auf dem Server' : 'Ausgeführt im Browser';
}

function zelle(wert) {
  const td = el('td');
  if (wert === null || wert === undefined) {
    td.appendChild(el('span', 'null', 'NULL'));
  } else if (typeof wert === 'number') {
    td.className = 'zahl';
    td.textContent = String(wert).replace('.', ',');
  } else if (wert instanceof Uint8Array || (wert && typeof wert === 'object')) {
    td.appendChild(el('span', 'null', 'BLOB'));
  } else {
    td.textContent = String(wert);
  }
  return td;
}

export function zeigeLeer(container) {
  container.replaceChildren(el('p', 'ergebnis-leer', TEXT_LEER));
  container.removeAttribute('aria-busy');
}

export function zeigeLaeuft(container) {
  container.replaceChildren(el('p', 'ergebnis-leer laeuft', TEXT_LAEUFT));
  container.setAttribute('aria-busy', 'true');
}

/** Fehler (art 'fehler') oder Abbruch (art 'hinweis') plus ggf. Parser-/Regel-Hinweise. */
export function zeigeFehler(container, text, { art = 'fehler', hinweise = [] } = {}) {
  const frag = document.createDocumentFragment();
  frag.appendChild(diagnose([{ text }], art));
  const h = hinweisBlock(hinweise);
  if (h) frag.appendChild(h);
  container.replaceChildren(frag);
  container.removeAttribute('aria-busy');
}

/** ergebnis = { spalten, zeilen, gesamt, ms, abgeschnitten? }, quelle = 'browser' | 'server' */
export function zeigeErgebnis(container, ergebnis, { quelle = 'browser', hinweise = [] } = {}) {
  const { spalten = [], zeilen = [], gesamt = zeilen.length, ms, abgeschnitten = false } = ergebnis;
  const frag = document.createDocumentFragment();

  const kopf = el('div', 'ergebnis-kopf');
  const links = el('p', 'ergebnis-zahlen');
  const anzahl = abgeschnitten ? `mehr als ${zahl(gesamt)} Zeilen` : mehrzahl(gesamt, 'Zeile', 'Zeilen');
  links.appendChild(el('strong', null, anzahl));
  links.appendChild(document.createTextNode(` · ${mehrzahl(spalten.length, 'Spalte', 'Spalten')}`));
  if (zeilen.length < gesamt) links.appendChild(document.createTextNode(` · angezeigt: ${zahl(zeilen.length)}`));
  kopf.appendChild(links);
  const rechts = el('p', 'ergebnis-zeit', `${quelleText(quelle)}${Number.isFinite(ms) ? ` · ${zahl(Math.round(ms))} ms` : ''}`);
  kopf.appendChild(rechts);
  frag.appendChild(kopf);

  const h = hinweisBlock(hinweise);
  if (h) frag.appendChild(h);

  if (gesamt === 0) {
    frag.appendChild(el('p', 'ergebnis-leer kein-treffer', TEXT_KEIN_TREFFER));
  }
  if (spalten.length > 0) {
    const huelle = el('div', 'tabelle-huelle');
    huelle.tabIndex = 0;
    huelle.setAttribute('role', 'region');
    huelle.setAttribute('aria-label', 'Ergebnistabelle');
    const tabelle = el('table', 'daten ergebnis-tabelle');
    const thead = el('thead');
    const tr = el('tr');
    spalten.forEach((s, i) => {
      const beispiel = zeilen.map((z) => z[i]).find((w) => w !== null && w !== undefined);
      const th = el('th', typeof beispiel === 'number' ? 'zahl' : null, s);
      th.scope = 'col';
      tr.appendChild(th);
    });
    thead.appendChild(tr);
    tabelle.appendChild(thead);
    const tbody = el('tbody');
    for (const zeile of zeilen) {
      const r = el('tr');
      for (const wert of zeile) r.appendChild(zelle(wert));
      tbody.appendChild(r);
    }
    tabelle.appendChild(tbody);
    huelle.appendChild(tabelle);
    frag.appendChild(huelle);
  }
  container.replaceChildren(frag);
  container.removeAttribute('aria-busy');
}
