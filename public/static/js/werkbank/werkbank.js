// Schema-Werkbank (Plan Phase 5 Task 4; Spec §7.6.5, DESIGN.md §4.5, §4.13, §5.8, §6, §7): Relationen als
// Karteikarten. Attribut antippen bzw. „PK“ schaltet den Primärschlüssel (unterstrichen), „↑FK“ den Fremdschlüssel mit
// Zielauswahl; ein roter Faden (SVG) führt vom Fremdschlüssel zur Zielrelation. Darunter die Live-Vorschau in
// Kurzschreibweise (PK unterstrichen, ↑FK). Modi: schluessel (Relationen und Attribute aus dem Start stehen fest, nur
// PK/FK), frei (Relationen und Attribute anlegen, umbenennen, löschen). Teilfeedback je Relation nach dem Prüfen
// (✔/✘, Hinweistexte, Fallen-Plakette). Antwort { relationen } wie Block `schema` (AUFGABENFORMAT §5.3, §6.11).
// Nur Textknoten; Fäden über SVG-Attribute (CSP).

const V = new URL(import.meta.url).search;
const R = await import('../kern/render.js' + V);
const { el, h, knopf } = R;

export const GRENZEN = Object.freeze({ relationen: 30, attribute: 30, name: 40 });
const SVG_NS = 'http://www.w3.org/2000/svg';

const istObjekt = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const s = (v) => (v === null || v === undefined ? '' : String(v));
const klein = (v) => s(v).trim().toLowerCase();

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
    /* privater Modus */
  }
}

/** Relationen in die Arbeitsform: [{ name, attribute: [{ name, pk, fk }] }], fk = '' | Zielname | true. */
export function normalisiere(roh) {
  const l = Array.isArray(roh) ? roh : istObjekt(roh) && Array.isArray(roh.relationen) ? roh.relationen : [];
  return l
    .slice(0, GRENZEN.relationen)
    .filter(istObjekt)
    .map((r) => ({
      name: s(r.name).slice(0, GRENZEN.name),
      attribute: (Array.isArray(r.attribute) ? r.attribute : [])
        .slice(0, GRENZEN.attribute)
        .filter(istObjekt)
        .map((a) => ({ name: s(a.name).slice(0, GRENZEN.name), pk: a.pk === true, fk: a.fk === true ? true : typeof a.fk === 'string' ? a.fk.slice(0, GRENZEN.name) : '' }))
    }));
}

/** Antwortform: Namen getrimmt, ganz leere Karten entfallen, FK ohne Ziel = true. */
export function antwortForm(relationen) {
  const namen = new Set(relationen.map((r) => klein(r.name)).filter(Boolean));
  return relationen
    .map((r) => ({
      name: r.name.trim(),
      attribute: r.attribute
        .filter((a) => a.name.trim() || a.pk || a.fk)
        .map((a) => {
          const at = { name: a.name.trim() };
          if (a.pk) at.pk = true;
          if (a.fk === true || (a.fk !== '' && a.fk !== false && !namen.has(klein(a.fk)))) at.fk = true;
          else if (a.fk) at.fk = s(a.fk).trim();
          return at;
        })
    }))
    .filter((r) => r.name || r.attribute.length);
}

/** Kurzschreibweise als Text (für Tests und Screenreader): Name(PK, ↑FK, …), PK in _…_. */
export function kurzschreibweise(r) {
  return `${r.name}(${r.attribute.map((a) => `${a.fk ? '↑' : ''}${a.pk ? `_${a.name}_` : a.name}`).join(', ')})`;
}

/**
 * Werkbank erzeugen.
 * @param {object} opt
 *   modus        'schluessel' | 'frei'
 *   start        Relationen (Format Block `schema`) – Pflicht bei schluessel
 *   entwurf      localStorage-Schlüssel (oder null)
 *   beiAenderung () => void
 *   pruefbar     false: Werkzeugseite ohne Prüfung (kein Ergebnisbereich)
 */
export function erzeugeWerkbank(opt = {}) {
  const modus = opt.modus === 'schluessel' ? 'schluessel' : 'frei';
  const start = normalisiere(opt.start);
  // Im Modus „schluessel“ sind PK/FK des Starts nur Vorbelegung; Relationen und Attribute stehen fest.
  let relationen = structuredClone(start);
  const gespeichert = lies(opt.entwurf);
  if (gespeichert && Array.isArray(gespeichert.relationen)) {
    const neu = normalisiere(gespeichert.relationen);
    if (modus === 'frei' || geruest(neu) === geruest(start)) relationen = neu;
  }
  let gesperrt = false;
  let ergebnis = null; // Map klein(name) → { ok, hinweise }

  function geruest(l) {
    return JSON.stringify(l.map((r) => [klein(r.name), r.attribute.map((a) => klein(a.name))]));
  }

  const wurzel = el('section', 'werkbank modus-' + modus);
  wurzel.setAttribute('aria-label', 'Schema-Werkbank');
  const hinweis = el(
    'p',
    'wk-hinweis',
    modus === 'schluessel'
      ? 'Tippe ein Attribut an, um es als Primärschlüssel zu markieren. Mit „↑FK“ wird es Fremdschlüssel – wähle dann die Zielrelation.'
      : 'Lege Relationen und Attribute an. Tippe „PK“ für den Primärschlüssel und „↑FK“ für einen Fremdschlüssel mit Zielrelation.'
  );
  const leiste = el('div', 'knopf-reihe wk-leiste');
  const plusRel = knopf('Relation', 'knopf', 'i-plus');
  plusRel.dataset.aktion = 'relation';
  plusRel.setAttribute('aria-label', 'Relation hinzufügen');
  if (modus === 'frei') leiste.appendChild(plusRel);
  const brett = el('div', 'wk-brett');
  const karten = el('div', 'wk-karten');
  const faeden = document.createElementNS(SVG_NS, 'svg');
  faeden.setAttribute('class', 'wk-faeden');
  faeden.setAttribute('aria-hidden', 'true');
  faeden.setAttribute('focusable', 'false');
  brett.append(karten, faeden);
  const vorschau = el('section', 'wk-vorschau');
  vorschau.setAttribute('aria-label', 'Vorschau in Kurzschreibweise');
  const ergebnisBox = el('section', 'wk-ergebnis');
  ergebnisBox.setAttribute('aria-live', 'polite');
  ergebnisBox.hidden = true;
  const loesungBox = el('div', 'wk-loesung');
  loesungBox.hidden = true;
  wurzel.append(hinweis);
  if (modus === 'frei') wurzel.appendChild(leiste);
  wurzel.append(brett, vorschau, ergebnisBox, loesungBox);

  let fokusNach = null; // { r, a?, feld }

  function geaendert(neuZeichnen = false) {
    ergebnis = null;
    ergebnisBox.hidden = true;
    schreib(opt.entwurf, { relationen });
    if (neuZeichnen) zeichne();
    else {
      zeichneVorschau();
      zeichneFaeden();
      markiereErgebnis();
    }
    if (typeof opt.beiAenderung === 'function') opt.beiAenderung();
  }

  let nr = 0;
  const fid = () => `wk-${Math.random().toString(36).slice(2, 7)}-${++nr}`;

  function zielAuswahl(r, a, ri, ai) {
    const id = fid();
    const sel = el('select', 'wk-ziel');
    sel.id = id;
    sel.appendChild(el('option', null, '– Zielrelation –'));
    sel.firstChild.value = '';
    for (const z of relationen) {
      if (!z.name.trim()) continue;
      const o = el('option', null, z.name.trim());
      o.value = z.name.trim();
      sel.appendChild(o);
    }
    sel.value = typeof a.fk === 'string' && relationen.some((z) => klein(z.name) === klein(a.fk)) ? relationen.find((z) => klein(z.name) === klein(a.fk)).name.trim() : '';
    sel.disabled = gesperrt;
    sel.setAttribute('aria-label', `Zielrelation des Fremdschlüssels ${a.name || 'ohne Namen'} in ${r.name || 'Relation ' + (ri + 1)}`);
    sel.addEventListener('change', () => {
      a.fk = sel.value || true;
      geaendert();
    });
    sel.dataset.attribut = String(ai);
    return sel;
  }

  function attributZeile(r, a, ri, ai) {
    const li = el('li', 'wk-attr' + (a.pk ? ' pk-an' : '') + (a.fk ? ' fk-an' : ''));
    li.dataset.attribut = String(ai);
    const rname = r.name.trim() || `Relation ${ri + 1}`;
    const aname = a.name.trim() || 'ohne Namen';
    // PK: in „schluessel“ ist das Attribut selbst der Knopf; in „frei“ ein eigener Knopf neben dem Namensfeld
    if (modus === 'schluessel') {
      const b = el('button', 'wk-attr-name');
      b.type = 'button';
      b.setAttribute('aria-pressed', a.pk ? 'true' : 'false');
      b.setAttribute('aria-label', `${aname}: Primärschlüssel ${a.pk ? 'an' : 'aus'}`);
      b.disabled = gesperrt;
      if (a.fk) b.appendChild(el('span', 'fk-pfeil', '↑'));
      b.appendChild(el('span', a.pk ? 'pk' : null, aname));
      b.addEventListener('click', () => {
        a.pk = !a.pk;
        fokusNach = { r: ri, a: ai, feld: 'name' };
        geaendert(true);
      });
      li.appendChild(b);
    } else {
      const pk = el('button', 'wk-schalter wk-pk', 'PK');
      pk.type = 'button';
      pk.setAttribute('aria-pressed', a.pk ? 'true' : 'false');
      pk.setAttribute('aria-label', `${aname}: Primärschlüssel`);
      pk.disabled = gesperrt;
      pk.addEventListener('click', () => {
        a.pk = !a.pk;
        fokusNach = { r: ri, a: ai, feld: 'pk' };
        geaendert(true);
      });
      const id = fid();
      const lab = el('label', 'nur-sr', `Attribut ${ai + 1} von ${rname}`);
      lab.htmlFor = id;
      const inp = el('input', 'wk-feld wk-attr-feld' + (a.pk ? ' pk' : ''));
      inp.id = id;
      inp.type = 'text';
      inp.value = a.name;
      inp.maxLength = GRENZEN.name;
      inp.placeholder = 'Attributname';
      inp.autocomplete = 'off';
      inp.spellcheck = false;
      inp.setAttribute('autocapitalize', 'off');
      inp.disabled = gesperrt;
      inp.addEventListener('input', () => {
        a.name = inp.value.slice(0, GRENZEN.name);
        geaendert();
      });
      li.append(pk, lab, inp);
    }
    const fk = el('button', 'wk-schalter wk-fk', '↑FK');
    fk.type = 'button';
    fk.setAttribute('aria-pressed', a.fk ? 'true' : 'false');
    fk.setAttribute('aria-label', `${aname}: Fremdschlüssel`);
    fk.disabled = gesperrt;
    fk.addEventListener('click', () => {
      a.fk = a.fk ? '' : true;
      fokusNach = { r: ri, a: ai, feld: a.fk ? 'ziel' : 'fk' };
      geaendert(true);
    });
    li.appendChild(fk);
    if (a.fk) li.appendChild(zielAuswahl(r, a, ri, ai));
    if (modus === 'frei') {
      const weg = el('button', 'knopf-icon wk-entfernen', '✕');
      weg.type = 'button';
      weg.setAttribute('aria-label', `Attribut ${aname} entfernen`);
      weg.title = 'Attribut entfernen';
      weg.disabled = gesperrt;
      weg.addEventListener('click', () => {
        r.attribute.splice(ai, 1);
        fokusNach = { r: ri, feld: 'plus' };
        geaendert(true);
      });
      li.appendChild(weg);
    }
    return li;
  }

  function karte(r, ri) {
    const k = el('article', 'karteikarte wk-karte');
    k.dataset.relation = String(ri);
    const kopf = el('div', 'wk-karte-kopf');
    kopf.appendChild(el('span', 'etikett', 'Relation'));
    if (modus === 'schluessel') {
      kopf.appendChild(el('h3', 'wk-karte-name', r.name || 'ohne Namen'));
    } else {
      const id = fid();
      const lab = el('label', 'nur-sr', `Name der Relation ${ri + 1}`);
      lab.htmlFor = id;
      const inp = el('input', 'wk-feld wk-name-feld');
      inp.id = id;
      inp.type = 'text';
      inp.value = r.name;
      inp.maxLength = GRENZEN.name;
      inp.placeholder = 'Name der Relation';
      inp.autocomplete = 'off';
      inp.spellcheck = false;
      inp.setAttribute('autocapitalize', 'off');
      inp.disabled = gesperrt;
      const alt = { name: r.name };
      inp.addEventListener('input', () => {
        const neu = inp.value.slice(0, GRENZEN.name);
        // Fremdschlüssel, die auf den alten Namen zeigen, ziehen mit
        for (const z of relationen) for (const a of z.attribute) if (typeof a.fk === 'string' && a.fk && klein(a.fk) === klein(alt.name)) a.fk = neu;
        alt.name = neu;
        r.name = neu;
        geaendert();
        // Zielauswahlen aktualisieren, ohne die Eingabe zu stören
        for (const sel of karten.querySelectorAll('select.wk-ziel')) {
          const ri2 = Number(sel.closest('.wk-karte').dataset.relation);
          const ai2 = Number(sel.dataset.attribut);
          sel.replaceWith(zielAuswahl(relationen[ri2], relationen[ri2].attribute[ai2], ri2, ai2));
        }
        zeichneFaeden();
      });
      kopf.append(lab, inp);
      const weg = el('button', 'knopf-icon wk-entfernen', '✕');
      weg.type = 'button';
      weg.setAttribute('aria-label', `Relation ${r.name.trim() || ri + 1} löschen`);
      weg.title = 'Relation löschen';
      weg.disabled = gesperrt;
      weg.addEventListener('click', () => {
        const name = klein(r.name);
        relationen.splice(ri, 1);
        if (name) for (const z of relationen) for (const a of z.attribute) if (typeof a.fk === 'string' && klein(a.fk) === name) a.fk = true;
        fokusNach = { feld: 'relation' };
        geaendert(true);
      });
      kopf.appendChild(weg);
    }
    k.appendChild(kopf);
    const ul = el('ul', 'wk-attribute');
    r.attribute.forEach((a, ai) => ul.appendChild(attributZeile(r, a, ri, ai)));
    if (!r.attribute.length) ul.appendChild(el('li', 'wk-leer', 'Noch keine Attribute.'));
    k.appendChild(ul);
    if (modus === 'frei') {
      const plus = knopf('Attribut', 'knopf leise', 'i-plus');
      plus.dataset.aktion = 'attribut';
      plus.setAttribute('aria-label', `Attribut zu ${r.name.trim() || 'Relation ' + (ri + 1)} hinzufügen`);
      plus.disabled = gesperrt || r.attribute.length >= GRENZEN.attribute;
      plus.addEventListener('click', () => {
        r.attribute.push({ name: '', pk: false, fk: '' });
        fokusNach = { r: ri, a: r.attribute.length - 1, feld: 'name' };
        geaendert(true);
      });
      k.appendChild(plus);
    }
    const rueck = el('div', 'wk-rueckmeldung');
    rueck.hidden = true;
    k.appendChild(rueck);
    return k;
  }

  function zeichne() {
    karten.replaceChildren();
    relationen.forEach((r, ri) => karten.appendChild(karte(r, ri)));
    if (!relationen.length) karten.appendChild(el('p', 'wk-leer', modus === 'frei' ? 'Noch keine Relation. Lege mit „Relation“ die erste an.' : 'Keine Relationen vorgegeben.'));
    plusRel.disabled = gesperrt || relationen.length >= GRENZEN.relationen;
    zeichneVorschau();
    markiereErgebnis();
    window.requestAnimationFrame(zeichneFaeden);
    if (fokusNach) {
      const f = fokusNach;
      fokusNach = null;
      let ziel = null;
      if (f.feld === 'relation') ziel = karten.querySelector('.wk-name-feld:last-of-type') || plusRel;
      else {
        const k = karten.querySelector(`.wk-karte[data-relation="${f.r}"]`);
        if (k) {
          if (f.feld === 'kopf') ziel = k.querySelector('.wk-name-feld');
          else if (f.feld === 'plus') ziel = k.querySelector('[data-aktion="attribut"]');
          else {
            const zeile = k.querySelector(`.wk-attr[data-attribut="${f.a}"]`);
            if (zeile) {
              ziel =
                f.feld === 'name' ? zeile.querySelector('.wk-attr-name, .wk-attr-feld') : f.feld === 'pk' ? zeile.querySelector('.wk-pk') : f.feld === 'ziel' ? zeile.querySelector('.wk-ziel') : zeile.querySelector('.wk-fk');
            }
          }
        }
      }
      if (ziel) ziel.focus();
    }
  }

  function zeichneVorschau() {
    vorschau.replaceChildren(el('p', 'etikett', 'Vorschau Kurzschreibweise'));
    const box = el('div', 'schema-block wk-vorschau-liste');
    const form = antwortForm(relationen);
    if (!form.length) box.appendChild(el('p', 'wk-leer', 'Noch leer.'));
    for (const r of form) box.appendChild(R.relation({ name: r.name || '…', attribute: r.attribute.map((a) => ({ ...a, name: a.name || '…' })) }));
    vorschau.appendChild(box);
  }

  /** Roter Faden je Fremdschlüssel: vom ↑FK-Knopf zur Kopfzeile der Zielrelation. */
  function zeichneFaeden() {
    if (!brett.isConnected) return;
    const basis = brett.getBoundingClientRect();
    const b = Math.round(basis.width);
    const hh = Math.round(basis.height);
    faeden.setAttribute('width', String(b));
    faeden.setAttribute('height', String(hh));
    faeden.setAttribute('viewBox', `0 0 ${b} ${hh}`);
    faeden.replaceChildren();
    const kartenEls = [...karten.querySelectorAll('.wk-karte')];
    relationen.forEach((r, ri) => {
      r.attribute.forEach((a, ai) => {
        if (typeof a.fk !== 'string' || !a.fk) return;
        const zi = relationen.findIndex((z) => klein(z.name) === klein(a.fk));
        if (zi < 0) return;
        const quelle = kartenEls[ri] && kartenEls[ri].querySelector(`.wk-attr[data-attribut="${ai}"] .wk-fk`);
        const ziel = kartenEls[zi] && kartenEls[zi].querySelector('.wk-karte-kopf');
        if (!quelle || !ziel) return;
        // Faden läuft zwischen den Karten: vom Kartenrand auf Höhe des Fremdschlüssels zum Rand der Zielkarte
        const q = kartenEls[ri].getBoundingClientRect();
        const z = kartenEls[zi].getBoundingClientRect();
        const y1 = quelle.getBoundingClientRect().top + quelle.getBoundingClientRect().height / 2 - basis.top;
        const y2 = ziel.getBoundingClientRect().top + ziel.getBoundingClientRect().height / 2 - basis.top;
        let x1;
        let x2;
        let c1;
        let c2;
        if (zi !== ri && z.left >= q.right - 1) {
          x1 = q.right - basis.left;
          x2 = z.left - basis.left;
          const m = Math.max(24, (x2 - x1) / 2);
          c1 = x1 + m;
          c2 = x2 - m;
        } else if (zi !== ri && z.right <= q.left + 1) {
          x1 = q.left - basis.left;
          x2 = z.right - basis.left;
          const m = Math.max(24, (x1 - x2) / 2);
          c1 = x1 - m;
          c2 = x2 + m;
        } else {
          // dieselbe Karte oder übereinander: Schleife am rechten Rand
          x1 = q.right - basis.left;
          x2 = z.right - basis.left;
          c1 = Math.max(x1, x2) + 44;
          c2 = c1;
        }
        const d = `M ${x1.toFixed(1)} ${y1.toFixed(1)} C ${c1.toFixed(1)} ${y1.toFixed(1)}, ${c2.toFixed(1)} ${y2.toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}`;
        const p = document.createElementNS(SVG_NS, 'path');
        p.setAttribute('d', d);
        p.setAttribute('class', 'wk-faden');
        faeden.appendChild(p);
        for (const [x, y] of [[x1, y1], [x2, y2]]) {
          const c = document.createElementNS(SVG_NS, 'circle');
          c.setAttribute('cx', x.toFixed(1));
          c.setAttribute('cy', y.toFixed(1));
          c.setAttribute('r', '4');
          c.setAttribute('class', 'wk-nadel');
          faeden.appendChild(c);
        }
      });
    });
  }
  if (typeof ResizeObserver === 'function') new ResizeObserver(() => zeichneFaeden()).observe(brett);

  plusRel.addEventListener('click', () => {
    if (relationen.length >= GRENZEN.relationen) return;
    relationen.push({ name: '', attribute: [{ name: '', pk: false, fk: '' }] });
    fokusNach = { r: relationen.length - 1, feld: 'kopf' };
    geaendert(true);
  });

  /* ---------- Rückmeldung ---------- */

  function markiereErgebnis() {
    for (const k of karten.querySelectorAll('.wk-karte')) {
      const r = relationen[Number(k.dataset.relation)];
      const box = k.querySelector('.wk-rueckmeldung');
      k.classList.remove('ok', 'falsch');
      box.hidden = true;
      box.replaceChildren();
      if (!ergebnis || !r) continue;
      const e = ergebnis.get(klein(r.name));
      if (!e) continue;
      k.classList.add(e.ok ? 'ok' : 'falsch');
      box.hidden = false;
      box.appendChild(el('p', 'wk-urteil', e.ok ? '✔ passt' : '✘ passt noch nicht'));
      if (e.hinweise.length) {
        const ul = el('ul', 'wk-hinweise');
        for (const x of e.hinweise) {
          const li = el('li');
          if (x.falle) li.appendChild(R.falle(x.falle));
          li.appendChild(el('span', null, s(x.text)));
          ul.appendChild(li);
        }
        box.appendChild(ul);
      }
    }
  }

  function zeigeErgebnis(rm) {
    if (opt.pruefbar === false) return;
    const r = istObjekt(rm) ? rm : {};
    const rel = Array.isArray(r.relationen) ? r.relationen : [];
    if (!rel.length && !Number.isInteger(r.fehlend) && !(Array.isArray(r.hinweise) && r.hinweise.length)) {
      ergebnisBox.hidden = true;
      return;
    }
    ergebnis = new Map();
    for (const x of rel) {
      if (!istObjekt(x)) continue;
      ergebnis.set(klein(x.name), { ok: x.ok === true, hinweise: Array.isArray(x.hinweise) ? x.hinweise.filter(istObjekt) : [] });
    }
    markiereErgebnis();
    const ok = rel.filter((x) => x && x.ok).length;
    const fehlend = Number(r.fehlend) || 0;
    const zuviel = Number(r.ueberzaehlig) || 0;
    const hinweise = Array.isArray(r.hinweise) ? r.hinweise.filter(istObjekt) : [];
    const geloest = ok === rel.length && !fehlend && !zuviel && !hinweise.length && rel.length > 0;
    ergebnisBox.replaceChildren();
    ergebnisBox.hidden = false;
    ergebnisBox.classList.toggle('geloest', geloest);
    const kopf = el('div', 'wk-ergebnis-kopf');
    kopf.appendChild(el('h3', 'etikett', 'Prüfergebnis'));
    kopf.appendChild(el('span', 'wk-zaehler zahlen', `${ok} von ${rel.length} ${rel.length === 1 ? 'Relation passt' : 'Relationen passen'}`));
    ergebnisBox.appendChild(kopf);
    const ul = el('ul', 'wk-ergebnis-liste');
    for (const x of rel) {
      const li = el('li', x.ok ? 'ok' : 'falsch');
      li.appendChild(el('span', 'wk-zeichen', x.ok ? '✔' : '✘')).setAttribute('aria-hidden', 'true');
      li.appendChild(el('span', null, `${s(x.name) || 'ohne Namen'}${x.ok ? '' : ` – ${(x.hinweise || []).length} ${(x.hinweise || []).length === 1 ? 'Hinweis' : 'Hinweise'}`}`));
      ul.appendChild(li);
    }
    if (fehlend) ul.appendChild(h('li', 'falsch', el('span', 'wk-zeichen', '✘'), el('span', null, fehlend === 1 ? 'Es fehlt noch eine Relation.' : `Es fehlen noch ${fehlend} Relationen.`)));
    if (zuviel) ul.appendChild(h('li', 'falsch', el('span', 'wk-zeichen', '✘'), el('span', null, zuviel === 1 ? 'Eine Relation ist zu viel.' : `${zuviel} Relationen sind zu viel.`)));
    for (const x of hinweise) {
      const li = el('li', 'falsch');
      li.appendChild(el('span', 'wk-zeichen', '✘'));
      li.appendChild(el('span', null, s(x.text)));
      if (x.falle) li.appendChild(R.falle(x.falle));
      ul.appendChild(li);
    }
    ergebnisBox.appendChild(ul);
    if (geloest) ergebnisBox.appendChild(R.stempel('Gelöst', 'geloest', { groesse: 'gross', auftritt: true }));
  }

  function zeigeLoesung(lo) {
    const l = istObjekt(lo) ? lo : {};
    const m = Array.isArray(l.muster) ? l.muster[0] : null;
    const rel = Array.isArray(m) ? m : istObjekt(m) && Array.isArray(m.relationen) ? m.relationen : null;
    if (!rel) return;
    loesungBox.replaceChildren(el('p', 'etikett', 'Musterschema'));
    loesungBox.appendChild(R.block({ t: 'schema', relationen: rel }));
    if (l.muster.length > 1) loesungBox.appendChild(el('p', 'wk-leer', `Es gibt ${l.muster.length} zulässige Schemata – gezeigt ist das erste.`));
    loesungBox.hidden = false;
  }

  function sperren(an) {
    gesperrt = !!an;
    wurzel.classList.toggle('gesperrt', gesperrt);
    zeichne();
  }

  function setze(a) {
    const neu = normalisiere(a);
    if (!neu.length) return;
    if (JSON.stringify(antwortForm(neu)) === JSON.stringify(antwortForm(relationen))) return;
    if (modus === 'schluessel' && geruest(neu) !== geruest(start)) return;
    relationen = neu;
    schreib(opt.entwurf, { relationen });
    zeichne();
  }

  function leeren() {
    relationen = structuredClone(start);
    ergebnis = null;
    ergebnisBox.hidden = true;
    schreib(opt.entwurf, null);
    zeichne();
    if (typeof opt.beiAenderung === 'function') opt.beiAenderung();
  }

  zeichne();

  return {
    el: wurzel,
    antwort: () => ({ relationen: antwortForm(relationen) }),
    leer() {
      const a = antwortForm(relationen);
      if (!a.length) return true;
      return JSON.stringify(a) === JSON.stringify(antwortForm(start)) && start.length > 0;
    },
    setze,
    zeigeErgebnis,
    zeigeLoesung,
    sperren,
    leeren,
    faeden: () => faeden.querySelectorAll('.wk-faden').length
  };
}
