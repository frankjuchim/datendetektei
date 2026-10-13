// Interaktionen der Aufgaben (docs/AUFGABENFORMAT.md §6; Muster Algo Quest public/static/js/interact.js): gaps,
// choice, order, lines, match, zeilen, ergebnis, kernpunkte, sql (über eine Fabrik der Seite), er und schema
// (Bauplan-Tisch und Schema-Werkbank, bauplan/interaktion.js), mehrteilige Aufgaben
// und der gestufte Bug-Hunt. Geprüft wird NUR auf dem Server; hier entstehen Antworten und die Anzeige von
// Rückmeldung und Lösung. choice-Optionen, order-Teile, match-Elemente und Klapplisten (ab drei Optionen) werden bei
// jedem Anzeigen neu gemischt. Freitext (kernpunkte) bleibt im Browser – gesendet wird nur die Häkchen-Anzahl.

const V = new URL(import.meta.url).search;
const R = await import('./render.js' + V);
const { el, h, knopf, mische } = R;
// Modellierung (Phase 5): zellen, anomalie, zerlegen
const M = await import('./modell_interaktionen.js' + V);
// Modellierung (Phase 5): Bauplan-Tisch (er) und Schema-Werkbank (schema) – eigene Module unter bauplan/ und werkbank/
const MODELL = await import('../bauplan/interaktion.js' + V);

const ART_SQL = 'sql';

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
    /* privater Modus */
  }
}

/** Meldung unter einem Teil (aria-live). */
function meldung() {
  const p = el('p', 'teil-meldung');
  p.setAttribute('aria-live', 'polite');
  return p;
}

/* ================= Teile ================= */

/** Lückentext: die Felder entstehen beim Rendern der Blöcke über ctx.gap(id). */
function teilGaps(ia, kontext) {
  const felder = new Map();
  const t = {
    kind: 'gaps',
    besitzt: (id) => Object.prototype.hasOwnProperty.call(ia.felder || {}, id),
    feld(id) {
      if (felder.has(id)) return felder.get(id);
      const f = (ia.felder || {})[id] || {};
      let e;
      if (f.typ === 'auswahl') {
        // ab drei Optionen bei jedem Anzeigen neu mischen; Zweierlisten bleiben
        const optionen = (f.optionen || []).length >= 3 ? mische(f.optionen) : f.optionen || []; // auswahl
        e = el('select', 'luecke');
        e.appendChild(h('option', null, '–'));
        e.firstChild.value = '';
        for (const o of optionen) {
          const opt = el('option', null, String(o));
          opt.value = String(o);
          e.appendChild(opt);
        }
      } else {
        e = el('input', 'luecke');
        e.type = 'text';
        e.autocomplete = 'off';
        e.spellcheck = false;
        e.setAttribute('autocapitalize', 'off');
        e.setAttribute('autocorrect', 'off');
        e.inputMode = f.typ === 'zahl' ? 'decimal' : 'text';
        const breite = Math.max(2, Math.min(40, Number(f.breite) || (f.typ === 'zahl' ? 4 : 10)));
        e.size = breite;
        e.style.setProperty('--breite', breite + 'ch');
      }
      e.setAttribute('aria-label', `Lücke ${id}`);
      e.dataset.luecke = id;
      e.addEventListener('input', () => {
        e.classList.remove('ok', 'falsch');
        e.removeAttribute('aria-invalid');
        kontext.geaendert();
      });
      felder.set(id, e);
      return e;
    },
    ui: null,
    antwort() {
      const a = {};
      for (const id of Object.keys(ia.felder || {})) a[id] = felder.has(id) ? felder.get(id).value : '';
      return a;
    },
    leer() {
      return Object.values(t.antwort()).every((v) => String(v).trim() === '');
    },
    setze(a) {
      if (!a || typeof a !== 'object') return;
      for (const [id, v] of Object.entries(a)) if (felder.has(id)) felder.get(id).value = v ?? '';
    },
    feedback(r) {
      if (!r || !r.felder) return;
      for (const [id, ok] of Object.entries(r.felder)) {
        const e = felder.get(id);
        if (!e) continue;
        e.classList.toggle('ok', !!ok);
        e.classList.toggle('falsch', !ok);
        e.setAttribute('aria-invalid', ok ? 'false' : 'true');
      }
    },
    loesung(lo) {
      for (const [id, e] of felder) {
        const alle = Array.isArray(lo && lo[id]) ? lo[id] : lo && lo[id] !== undefined ? [lo[id]] : [];
        const v = alle.length ? String(alle[0]) : '';
        if (e.tagName === 'SELECT' && ![...e.options].some((o) => o.value === v)) {
          const opt = el('option', null, v);
          opt.value = v;
          e.appendChild(opt);
        }
        e.value = v;
        e.classList.remove('ok', 'falsch');
        e.classList.add('loesung');
        if (alle.length > 1) e.title = 'Auch richtig: ' + alle.slice(1).join(' | ');
      }
    },
    sperren(an) {
      for (const e of felder.values()) e.disabled = an;
    }
  };
  return t;
}

function optionInhalt(o) {
  return o.code !== undefined ? el('code', 'option-code', o.code) : R.md(o.md, null, 'span');
}

function teilChoice(ia, kontext) {
  const gewaehlt = new Set();
  const optionen = mische(ia.optionen || []); // choice
  const els = new Map();
  let gesperrt = false;
  const box = el('div', 'optionen');
  box.setAttribute('role', ia.mehrfach ? 'group' : 'radiogroup');
  box.setAttribute('aria-label', ia.mehrfach ? 'Mehrfachauswahl' : 'Einfachauswahl');
  for (const o of optionen) {
    const b = el('button', 'option' + (ia.mehrfach ? ' mehrfach' : ''));
    b.type = 'button';
    b.setAttribute('role', ia.mehrfach ? 'checkbox' : 'radio');
    b.setAttribute('aria-checked', 'false');
    b.appendChild(el('span', 'option-marke'));
    const t = el('span', 'option-text');
    t.appendChild(optionInhalt(o));
    b.appendChild(t);
    b.addEventListener('click', () => {
      if (gesperrt) return;
      if (ia.mehrfach) {
        if (gewaehlt.has(o.id)) gewaehlt.delete(o.id);
        else gewaehlt.add(o.id);
      } else {
        gewaehlt.clear();
        gewaehlt.add(o.id);
      }
      zeichne();
      kontext.geaendert();
    });
    els.set(o.id, b);
    box.appendChild(b);
  }
  function zeichne() {
    for (const [id, b] of els) {
      b.setAttribute('aria-checked', gewaehlt.has(id) ? 'true' : 'false');
      b.classList.remove('falsch');
    }
  }
  const ui = el('div', 'teil-choice');
  if (ia.mehrfach) ui.appendChild(el('p', 'teil-hinweis', 'Mehrere Antworten können richtig sein.'));
  ui.appendChild(box);
  return {
    kind: 'choice',
    ui,
    antwort: () => [...gewaehlt],
    leer: () => gewaehlt.size === 0,
    setze(a) {
      gewaehlt.clear();
      for (const x of Array.isArray(a) ? a : []) gewaehlt.add(x);
      zeichne();
    },
    feedback(r) {
      if (r && r.ok === false) for (const id of gewaehlt) els.get(id) && els.get(id).classList.add('falsch');
    },
    loesung(lo) {
      const richtig = new Set((lo && lo.richtig) || []);
      for (const [id, b] of els) {
        b.classList.toggle('loesung', richtig.has(id));
        b.classList.toggle('falsch', gewaehlt.has(id) && !richtig.has(id));
      }
    },
    sperren(an) {
      gesperrt = an;
      for (const b of els.values()) b.disabled = an;
    }
  };
}

function teilText(t) {
  return t.code !== undefined ? el('code', 'puzzle-code', t.code) : R.md(t.md, null, 'span');
}

/** Puzzle: Bausteine antippen → in die eigene Reihenfolge übernehmen, dort verschieben oder zurücklegen. */
function teilOrder(ia, kontext) {
  const teile = new Map((ia.teile || []).map((t) => [t.id, t]));
  let pool = mische([...teile.keys()]); // order
  let folge = [];
  let gesperrt = false;
  let markiere = null;
  const poolBox = el('ol', 'puzzle-liste');
  poolBox.setAttribute('aria-label', 'Bausteine');
  const folgeBox = el('ol', 'puzzle-liste folge');
  folgeBox.setAttribute('aria-label', 'Deine Reihenfolge');
  const loesungBox = el('div');
  const ui = h(
    'div',
    'puzzle',
    h('div', 'puzzle-spalte', el('h3', 'etikett', 'Bausteine – antippen zum Übernehmen'), poolBox),
    h('div', 'puzzle-spalte', el('h3', 'etikett', 'Deine Reihenfolge'), folgeBox),
    loesungBox
  );
  function iconKnopf(text, label, f, aus) {
    const b = el('button', 'knopf-icon klein', text);
    b.type = 'button';
    b.setAttribute('aria-label', label);
    b.title = label;
    b.disabled = !!aus;
    b.addEventListener('click', f);
    return b;
  }
  function zeichne() {
    poolBox.replaceChildren();
    folgeBox.replaceChildren();
    if (!pool.length) poolBox.appendChild(el('li', 'teil-hinweis', 'Alle Bausteine verwendet.'));
    for (const id of pool) {
      const nehmen = () => {
        if (gesperrt) return;
        pool = pool.filter((x) => x !== id);
        folge.push(id);
        markiere = null;
        zeichne();
        kontext.geaendert();
      };
      const b = el('button', 'puzzle-teil');
      b.type = 'button';
      b.disabled = gesperrt;
      b.appendChild(teilText(teile.get(id)));
      b.appendChild(el('span', 'puzzle-pfeil', '→'));
      b.setAttribute('aria-label', 'Übernehmen: ' + (teile.get(id).code || teile.get(id).md || id));
      b.addEventListener('click', nehmen);
      poolBox.appendChild(h('li', null, b));
    }
    if (!folge.length) folgeBox.appendChild(el('li', 'teil-hinweis', 'Tippe die Bausteine in der richtigen Reihenfolge an.'));
    folge.forEach((id, i) => {
      const cls = markiere !== null ? (i < markiere ? ' richtig' : i === markiere ? ' falsch' : '') : '';
      const li = el('li', 'puzzle-teil gesetzt' + cls);
      li.appendChild(el('span', 'puzzle-pos', i + 1));
      li.appendChild(teilText(teile.get(id)));
      const tausch = (j) => {
        [folge[i], folge[j]] = [folge[j], folge[i]];
        markiere = null;
        zeichne();
        kontext.geaendert();
      };
      li.appendChild(
        h(
          'span',
          'puzzle-knoepfe',
          iconKnopf('↑', 'nach oben', () => tausch(i - 1), gesperrt || i === 0),
          iconKnopf('↓', 'nach unten', () => tausch(i + 1), gesperrt || i === folge.length - 1),
          iconKnopf('✕', 'zurücklegen', () => {
            folge.splice(i, 1);
            pool.push(id);
            markiere = null;
            zeichne();
            kontext.geaendert();
          }, gesperrt)
        )
      );
      folgeBox.appendChild(li);
    });
  }
  zeichne();
  return {
    kind: 'order',
    ui,
    antwort: () => [...folge],
    leer: () => folge.length === 0,
    setze(a) {
      folge = (Array.isArray(a) ? a : []).filter((id) => teile.has(id));
      pool = [...teile.keys()].filter((id) => !folge.includes(id));
      zeichne();
    },
    feedback(r) {
      markiere = r && Number.isInteger(r.ersteFalschePosition) ? r.ersteFalschePosition : null;
      zeichne();
    },
    loesung(lo) {
      const rf = (lo && Array.isArray(lo.reihenfolgen) && lo.reihenfolgen[0]) || [];
      const liste = el('ol', 'puzzle-liste loesung');
      rf.forEach((id, i) => liste.appendChild(h('li', 'puzzle-teil gesetzt richtig', el('span', 'puzzle-pos', i + 1), teilText(teile.get(id) || { md: id }))));
      loesungBox.replaceChildren(el('h3', 'etikett', 'Lösung'), liste);
    },
    sperren(an) {
      gesperrt = an;
      zeichne();
    }
  };
}

/** Bug-Hunt: Zeilen eines sql-/code-Blocks antippen (1-basiert). */
function teilLines(ia, kontext) {
  const gewaehlt = new Set();
  let zeilen = [];
  let gesperrt = false;
  const anzahl = Number(ia.anzahl) || 1;
  const info = el('p', 'teil-hinweis');
  info.setAttribute('aria-live', 'polite');
  function zeichne() {
    zeilen.forEach((e, i) => {
      const an = gewaehlt.has(i + 1);
      e.classList.toggle('gewaehlt', an);
      e.setAttribute('aria-pressed', an ? 'true' : 'false');
      e.disabled = gesperrt;
    });
    const liste = [...gewaehlt].sort((a, b) => a - b).map((z) => 'Zeile ' + z);
    info.textContent = `Tippe ${anzahl === 1 ? 'die gesuchte Zeile' : `${anzahl} Zeilen`} im Code an. Gewählt: ${liste.length ? liste.join(', ') : '–'}`;
  }
  return {
    kind: 'lines',
    block: ia.block,
    klick(nr) {
      if (gesperrt) return;
      if (gewaehlt.has(nr)) gewaehlt.delete(nr);
      else {
        if (anzahl === 1) gewaehlt.clear();
        else if (gewaehlt.size >= anzahl) {
          info.textContent = `Höchstens ${anzahl} Zeilen – tippe zuerst eine gewählte Zeile ab.`;
          return;
        }
        gewaehlt.add(nr);
      }
      zeichne();
      kontext.geaendert();
    },
    registriere(els) {
      zeilen = els;
      zeichne();
    },
    ui: info,
    antwort: () => [...gewaehlt].sort((a, b) => a - b),
    leer: () => gewaehlt.size === 0,
    setze(a) {
      gewaehlt.clear();
      for (const z of Array.isArray(a) ? a : []) gewaehlt.add(z);
      zeichne();
    },
    feedback(r) {
      zeilen.forEach((e, i) => e.classList.toggle('falsch', !!(r && r.ok === false && gewaehlt.has(i + 1))));
    },
    loesung(lo) {
      const s = new Set((lo && lo.zeilen) || []);
      zeilen.forEach((e, i) => {
        e.classList.toggle('loesung', s.has(i + 1));
        e.classList.remove('falsch');
      });
    },
    sperren(an) {
      gesperrt = an;
      zeichne();
    }
  };
}

function teilMatch(ia, kontext) {
  const wahl = {};
  const zeilen = new Map();
  let gesperrt = false;
  const box = el('div', 'match');
  // Elemente bei jedem Anzeigen neu mischen; Kategorien bleiben in Dateireihenfolge
  for (const e of mische(ia.elemente || [])) { // match
    const knoepfe = (ia.kategorien || []).map((k) => {
      const b = el('button', 'segment-knopf');
      b.type = 'button';
      b.setAttribute('aria-pressed', 'false');
      b.appendChild(R.md(k.md, null, 'span'));
      b.addEventListener('click', () => {
        if (gesperrt) return;
        if (wahl[e.id] === k.id) delete wahl[e.id];
        else wahl[e.id] = k.id;
        zeichne();
        kontext.geaendert();
      });
      return b;
    });
    const seg = el('div', 'segment match-segment');
    seg.setAttribute('role', 'group');
    seg.setAttribute('aria-label', 'Zuordnung wählen');
    knoepfe.forEach((b) => seg.appendChild(b));
    const z = h('div', 'match-zeile', h('div', 'match-element', R.md(e.md, null, 'span')), seg);
    zeilen.set(e.id, { z, knoepfe });
    box.appendChild(z);
  }
  function zeichne() {
    for (const e of ia.elemente || []) {
      const { z, knoepfe } = zeilen.get(e.id);
      z.classList.remove('ok', 'falsch');
      (ia.kategorien || []).forEach((k, i) => knoepfe[i].setAttribute('aria-pressed', wahl[e.id] === k.id ? 'true' : 'false'));
    }
  }
  return {
    kind: 'match',
    ui: box,
    antwort: () => ({ ...wahl }),
    leer: () => Object.keys(wahl).length === 0,
    setze(a) {
      for (const k of Object.keys(wahl)) delete wahl[k];
      Object.assign(wahl, a && typeof a === 'object' ? a : {});
      zeichne();
    },
    feedback(r) {
      if (!r || !r.elemente) return;
      for (const [id, ok] of Object.entries(r.elemente)) {
        const z = zeilen.get(id);
        if (!z) continue;
        z.z.classList.toggle('ok', !!ok);
        z.z.classList.toggle('falsch', !ok);
      }
    },
    loesung(lo) {
      this.setze(lo || {});
      for (const { z } of zeilen.values()) z.classList.add('ok');
    },
    sperren(an) {
      gesperrt = an;
      for (const { knoepfe } of zeilen.values()) knoepfe.forEach((b) => (b.disabled = an));
    }
  };
}

/** Zeilen einer dbtabelle antippen (0-basiert). */
function teilZeilen(ia, kontext) {
  const gewaehlt = new Set();
  const mehrfach = ia.mehrfach !== false;
  let zeilen = [];
  let gesperrt = false;
  const info = el('p', 'teil-hinweis');
  info.setAttribute('aria-live', 'polite');
  function zeichne() {
    zeilen.forEach((tr, i) => {
      const an = gewaehlt.has(i);
      tr.classList.toggle('gewaehlt', an);
      const b = tr.querySelector('.zeilen-knopf');
      if (b) {
        b.setAttribute('aria-pressed', an ? 'true' : 'false');
        b.disabled = gesperrt;
      }
    });
    info.textContent = `${mehrfach ? 'Tippe alle passenden Zeilen an.' : 'Tippe die passende Zeile an.'} Gewählt: ${gewaehlt.size}`;
  }
  return {
    kind: 'zeilen',
    block: ia.block,
    klick(i) {
      if (gesperrt) return;
      if (gewaehlt.has(i)) gewaehlt.delete(i);
      else {
        if (!mehrfach) gewaehlt.clear();
        gewaehlt.add(i);
      }
      zeichne();
      kontext.geaendert();
    },
    registriere(els) {
      zeilen = els;
      zeichne();
    },
    ui: info,
    antwort: () => [...gewaehlt].sort((a, b) => a - b),
    leer: () => gewaehlt.size === 0,
    setze(a) {
      gewaehlt.clear();
      for (const z of Array.isArray(a) ? a : []) gewaehlt.add(z);
      zeichne();
    },
    feedback(r) {
      zeilen.forEach((tr) => tr.classList.toggle('falsch', !!(r && r.ok === false && tr.classList.contains('gewaehlt'))));
    },
    loesung(lo) {
      const s = new Set((lo && lo.zeilen) || []);
      zeilen.forEach((tr, i) => {
        tr.classList.toggle('loesung', s.has(i));
        tr.classList.remove('falsch');
      });
    },
    sperren(an) {
      gesperrt = an;
      zeichne();
    }
  };
}

/** Ergebnistabelle vorhersagen: feste Zeilenzahl oder freie Zeilen. */
function teilErgebnis(ia, kontext) {
  const kopf = Array.isArray(ia.kopf) ? ia.kopf : [];
  const frei = ia.freieZeilen === true;
  let zeilen = [];
  let gesperrt = false;
  const tbody = el('tbody');
  const meld = meldung();
  const tabelle = el('table', 'daten ergebnis-eingabe');
  const tr = el('tr');
  tr.appendChild(h('th', 'nr-spalte', el('span', 'nur-sr', 'Zeile')));
  for (const k of kopf) {
    const th = el('th', null, k);
    th.scope = 'col';
    tr.appendChild(th);
  }
  if (frei) tr.appendChild(h('th', 'nr-spalte', el('span', 'nur-sr', 'Entfernen')));
  tabelle.append(h('thead', null, tr), tbody);
  const plus = frei ? knopf('Zeile hinzufügen', 'knopf leise', 'i-plus') : null;
  if (plus) {
    plus.addEventListener('click', () => {
      if (gesperrt) return;
      zeilen.push(kopf.map(() => ''));
      zeichne();
      const letzte = tbody.lastElementChild && tbody.lastElementChild.querySelector('input');
      if (letzte) letzte.focus();
      kontext.geaendert();
    });
  }
  function leereZeilen(n) {
    return Array.from({ length: n }, () => kopf.map(() => ''));
  }
  zeilen = leereZeilen(frei ? 1 : Math.max(0, Number(ia.zeilenAnzahl) || 0));
  function zeichne() {
    tbody.replaceChildren();
    zeilen.forEach((z, zi) => {
      const r = el('tr');
      r.appendChild(el('td', 'nr-spalte', zi + 1));
      z.forEach((wert, si) => {
        const td = el('td');
        const inp = el('input', 'zelle-eingabe');
        inp.type = 'text';
        inp.value = wert;
        inp.autocomplete = 'off';
        inp.spellcheck = false;
        inp.setAttribute('autocapitalize', 'off');
        inp.setAttribute('aria-label', `Zeile ${zi + 1}, ${kopf[si] || 'Spalte ' + (si + 1)}`);
        inp.disabled = gesperrt;
        inp.addEventListener('input', () => {
          zeilen[zi][si] = inp.value;
          meld.textContent = '';
          kontext.geaendert();
        });
        td.appendChild(inp);
        r.appendChild(td);
      });
      if (frei) {
        const td = el('td', 'nr-spalte');
        const weg = el('button', 'knopf-icon klein', '✕');
        weg.type = 'button';
        weg.setAttribute('aria-label', `Zeile ${zi + 1} entfernen`);
        weg.title = 'Zeile entfernen';
        weg.disabled = gesperrt;
        weg.addEventListener('click', () => {
          zeilen.splice(zi, 1);
          zeichne();
          kontext.geaendert();
        });
        td.appendChild(weg);
        r.appendChild(td);
      }
      tbody.appendChild(r);
    });
    if (plus) plus.disabled = gesperrt;
  }
  zeichne();
  const ui = h(
    'div',
    'teil-ergebnis',
    el('p', 'teil-hinweis', frei ? 'Trage die Ergebniszeilen ein – Zeilen fügst du selbst hinzu. NULL schreibst du als NULL.' : `Trage die ${zeilen.length} Ergebniszeilen ein. NULL schreibst du als NULL.`),
    h('div', 'tabelle-rahmen', tabelle),
    plus,
    meld
  );
  return {
    kind: 'ergebnis',
    ui,
    antwort: () => zeilen.map((z) => z.map((w) => String(w).trim())),
    leer: () => zeilen.every((z) => z.every((w) => String(w).trim() === '')),
    setze(a) {
      if (!Array.isArray(a)) return;
      const n = frei ? Math.max(1, a.length) : zeilen.length;
      zeilen = leereZeilen(n).map((z, i) => z.map((_, j) => (Array.isArray(a[i]) && a[i][j] !== undefined && a[i][j] !== null ? String(a[i][j]) : '')));
      zeichne();
    },
    feedback(r) {
      if (!r) return;
      tabelle.classList.toggle('falsch', r.ok === false);
      if (r.zeilenzahl === 'zu_viele') meld.textContent = 'Deine Tabelle hat zu viele Zeilen.';
      else if (r.zeilenzahl === 'zu_wenige') meld.textContent = 'Deine Tabelle hat zu wenige Zeilen.';
      else if (r.nurReihenfolge) meld.textContent = 'Alle Zeilen stimmen, nur die Reihenfolge nicht. Prüf das ORDER BY.';
      else if (r.ok === false) meld.textContent = 'Die Zeilenzahl passt, aber mindestens ein Wert stimmt nicht.';
      else meld.textContent = '';
    },
    loesung(lo) {
      const soll = (lo && Array.isArray(lo.zeilen) ? lo.zeilen : []).map((z) => z.map((w) => (w === null ? 'NULL' : String(w).replace(/^(-?\d+)\.(\d+)$/, '$1,$2'))));
      zeilen = soll.length || frei ? soll : zeilen;
      gesperrt = true;
      zeichne();
      tabelle.classList.remove('falsch');
      tabelle.classList.add('loesung');
      meld.textContent = '';
    },
    sperren(an) {
      gesperrt = an;
      zeichne();
    }
  };
}

/** Freitext mit Selbstkontrolle (E7): Text bleibt auf dem Gerät, gesendet wird nur die Häkchen-Anzahl. */
function teilKernpunkte(ia, kontext, nr) {
  const schluessel = kontext.speicher ? `${kontext.speicher}:kernpunkte:${nr}` : null;
  const id = 'kp-' + Math.random().toString(36).slice(2, 9);
  const text = el('textarea', 'freitext');
  text.id = id;
  text.rows = 5;
  text.value = (schluessel && speicherLesen(schluessel)) || '';
  text.addEventListener('input', () => {
    if (schluessel) speicherSchreiben(schluessel, text.value);
    kontext.geaendert();
  });
  const label = el('label', 'freitext-label', 'Deine Antwort – sie bleibt nur auf diesem Gerät und wird nie gesendet.');
  label.htmlFor = id;
  const liste = el('ul', 'kernpunkte');
  liste.hidden = true;
  const zaehler = el('p', 'teil-hinweis');
  zaehler.setAttribute('aria-live', 'polite');
  const boxen = [];
  function zaehle() {
    const n = boxen.filter((b) => b.checked).length;
    zaehler.textContent = boxen.length ? `${n} von ${boxen.length} Kernpunkten abgehakt.` : '';
    kontext.geaendert();
  }
  return {
    kind: 'kernpunkte',
    anzahl: Number(ia.anzahl) || 0,
    ui: h('div', 'teil-kernpunkte', label, text, liste, zaehler),
    /** Kernpunkte zeigen (nach dem Aufdecken) – Häkchen setzt die Schülerin selbst. */
    zeigeKernpunkte(punkte, haken = null) {
      liste.replaceChildren();
      boxen.length = 0;
      (Array.isArray(punkte) ? punkte : []).forEach((p, i) => {
        const cb = el('input');
        cb.type = 'checkbox';
        cb.id = `${id}-${i}`;
        cb.checked = Number.isInteger(haken) && i < haken;
        cb.addEventListener('change', zaehle);
        const lab = el('label');
        lab.htmlFor = cb.id;
        lab.appendChild(R.md(p, null, 'span'));
        boxen.push(cb);
        liste.appendChild(h('li', null, cb, lab));
      });
      liste.hidden = boxen.length === 0;
      zaehle();
    },
    haken: () => boxen.filter((b) => b.checked).length,
    hatKernpunkte: () => boxen.length > 0,
    antwort: () => boxen.filter((b) => b.checked).length,
    leer: () => text.value.trim() === '' && !boxen.some((b) => b.checked),
    setze() {},
    feedback() {},
    loesung(lo) {
      if (Array.isArray(lo)) this.zeigeKernpunkte(lo);
    },
    sperren(an) {
      for (const b of boxen) b.disabled = an;
    }
  };
}

/** Standard-sql-Teil ohne Konsole (nur Textfeld) – die Seiten geben meist eine eigene Fabrik mit. */
function teilSqlEinfach(ia, kontext) {
  const t = el('textarea', 'sql-einfach');
  t.rows = 6;
  t.spellcheck = false;
  t.setAttribute('aria-label', 'SQL-Abfrage');
  t.addEventListener('input', () => kontext.geaendert());
  return {
    kind: ART_SQL,
    ui: t,
    antwort: () => t.value,
    leer: () => t.value.trim() === '',
    setze: (a) => {
      if (typeof a === 'string') t.value = a;
    },
    feedback() {},
    loesung() {},
    sperren(an) {
      t.disabled = an;
    }
  };
}

/* ================= Aufgabe (alle Teile) ================= */

/**
 * Aufgabe aufbauen.
 * @param {object} a öffentliche Aufgabe { id, inhalt, interaktion }
 * @param {object} opt
 *   onChange()                     – bei jeder Änderung einer Antwort
 *   sqlTeil(ia, kontext, nr)       – Fabrik für sql-Teile ({ kind:'sql', ui, antwort, leer, setze, feedback, loesung, sperren })
 *   teilPruefen(teil, antwort)     – Bug-Hunt: Teil a) einzeln prüfen (Ermittlung); ohne → „festlegen“ (Verhör)
 *   speicher                       – Präfix für geräte-lokale Freitexte (kernpunkte)
 */
export function erzeugeAufgabe(a, opt = {}) {
  const mehrteilig = Array.isArray(a.interaktion);
  const ias = mehrteilig ? a.interaktion : [a.interaktion];
  const kontext = { geaendert: () => opt.onChange && opt.onChange(), speicher: opt.speicher || null };
  const entwurfBasis = opt.speicher || `dd-entwurf:aufgabe:${a.id}`;
  const teile = ias.map((ia, i) => {
    switch (ia && ia.kind) {
      case 'gaps':
        return teilGaps(ia, kontext);
      case 'choice':
        return teilChoice(ia, kontext);
      case 'order':
        return teilOrder(ia, kontext);
      case 'lines':
        return teilLines(ia, kontext);
      case 'match':
        return teilMatch(ia, kontext);
      case 'zeilen':
        return teilZeilen(ia, kontext);
      case 'ergebnis':
        return teilErgebnis(ia, kontext);
      case 'kernpunkte':
        return teilKernpunkte(ia, kontext, i);
      case 'sql':
        return opt.sqlTeil ? opt.sqlTeil(ia, kontext, i) : teilSqlEinfach(ia, kontext);
      case 'zellen':
        return M.teilZellen(ia, kontext, i, a);
      case 'anomalie':
        return M.teilAnomalie(ia, kontext, i, a);
      case 'zerlegen':
        return M.teilZerlegen(ia, kontext, i, a);
      case 'er':
        return MODELL.teilEr(ia, kontext, { entwurf: `${entwurfBasis}:er:${i}` });
      case 'schema':
        return MODELL.teilSchema(ia, kontext, { entwurf: `${entwurfBasis}:schema:${i}` });
      default:
        return { kind: '?', ui: el('p', 'leise', 'Diese Interaktion kann hier noch nicht angezeigt werden.'), antwort: () => null, leer: () => true, setze() {}, feedback() {}, loesung() {}, sperren() {} };
    }
  });
  const ctx = {
    gap(id) {
      const t = teile.find((x) => x.kind === 'gaps' && x.besitzt(id));
      return t ? t.feld(id) : null;
    },
    zeilenWahl(index) {
      const t = teile.find((x) => x.kind === 'lines' && x.block === index);
      return t ? { klick: (nr) => t.klick(nr), registriere: (els) => t.registriere(els) } : null;
    },
    zeilenAuswahl(index) {
      const t = teile.find((x) => x.kind === 'zeilen' && x.block === index);
      return t ? { klick: (i) => t.klick(i), registriere: (els) => t.registriere(els) } : null;
    },
    erAuswahl(index) {
      const t = teile.find((x) => x.kind === 'er' && x.lesen && x.block === index);
      return t ? { klick: (id) => t.klick(id), registriere: (api) => t.registriere(api) } : null;
    }
  };
  const inhaltEl = R.bloecke(a.inhalt, ctx);
  // Teile, die Blöcke der Aufgabe bedienen (zellen: Zellen antippen; anomalie: Rohtabelle im Simulator)
  teile.forEach((t) => typeof t.anbinden === 'function' && t.anbinden(inhaltEl));
  const box = h('div', 'aufgabe-inhalt', inhaltEl);
  const teilEls = [];
  ias.forEach((ia, i) => {
    const t = teile[i];
    const frage = ia && typeof ia.frage === 'string' ? ia.frage : null;
    const zusatz = ia && Array.isArray(ia.inhalt) ? R.bloecke(ia.inhalt, ctx) : null;
    const ohneBox = (t.kind === 'gaps' && !frage && !zusatz) || (t.kind === ART_SQL && !mehrteilig);
    if (ohneBox) {
      teilEls.push(null);
      return;
    }
    const e = el('div', 'teil' + (mehrteilig ? '' : ' einzeln'));
    e.setAttribute('role', 'group');
    e.setAttribute('aria-label', mehrteilig ? `Teil ${String.fromCharCode(97 + i)})` : 'Antwort');
    if (mehrteilig && !(frage && /^\s*[a-z]\)/.test(frage))) e.appendChild(el('p', 'teil-kopf', `Teil ${String.fromCharCode(97 + i)})`));
    if (frage) e.appendChild(R.md(frage, ctx));
    if (zusatz) e.appendChild(zusatz);
    if (t.ui) e.appendChild(t.ui);
    teilEls.push(e);
    box.appendChild(e);
  });

  /* Bug-Hunt gestuft (AUFGABENFORMAT §6.10): spätere Teile erst, wenn Teil a) richtig (Ermittlung) bzw. festgelegt
     (Verhör) ist. Lösungsansicht zeigt alles. */
  const gestuft = mehrteilig && ias.length > 1 && ias[0] && ias[0].kind === 'lines' && !!teilEls[0];
  let stufeOffen = false;
  const spaeter = [];
  let stufeBox = null;
  function freischalten() {
    if (!stufeOffen) return;
    stufeOffen = false;
    spaeter.forEach((e) => e.classList.remove('stufe-versteckt'));
    if (stufeBox) stufeBox.remove();
  }
  async function stufePruefen() {
    if (!stufeOffen) return null;
    const meld = stufeBox.querySelector('.teil-meldung');
    if (teile[0].leer()) {
      meld.textContent = 'Wähle zuerst die gesuchte Zeile.';
      return null;
    }
    if (!opt.teilPruefen) {
      teile[0].sperren(true);
      freischalten();
      kontext.geaendert();
      return null;
    }
    const r = await opt.teilPruefen(0, teile[0].antwort());
    if (!r) return null;
    teile[0].feedback({ ok: !!r.ok });
    teilEls[0].classList.toggle('ok', !!r.ok);
    teilEls[0].classList.toggle('falsch', !r.ok);
    if (r.ok) {
      teile[0].sperren(true);
      freischalten();
    } else {
      meld.textContent = 'Das ist noch nicht die gesuchte Zeile (Fehlversuch).';
    }
    return r;
  }
  if (gestuft) {
    const spaetereLuecken = new Set(ias.slice(1).filter((ia) => ia.kind === 'gaps').flatMap((ia) => Object.keys(ia.felder || {})));
    let ab = -1;
    (a.inhalt || []).forEach((b, i) => {
      if (ab >= 0) return;
      const luecken = [...JSON.stringify(b).matchAll(/\[\[([A-Za-z0-9_-]+)\]\]/g)].map((m) => m[1]);
      const teilKopf = typeof b.md === 'string' && /^\s*\*\*\s*(?:[b-z]\)|Teil\s*[2-9])/.test(b.md);
      if (teilKopf || luecken.some((g) => spaetereLuecken.has(g))) ab = i;
    });
    if (ab >= 0) inhaltEl.querySelectorAll(':scope > [data-block]').forEach((e) => Number(e.dataset.block) >= ab && spaeter.push(e));
    teilEls.slice(1).forEach((e) => e && spaeter.push(e));
    if (spaeter.length) {
      stufeOffen = true;
      spaeter.forEach((e) => e.classList.add('stufe-versteckt'));
      const k = knopf(opt.teilPruefen ? 'Teil a) prüfen' : 'Teil a) festlegen', 'knopf', opt.teilPruefen ? 'i-pruefen' : 'i-vor');
      k.addEventListener('click', () => stufePruefen());
      stufeBox = h(
        'div',
        'stufe-box',
        el('p', 'teil-hinweis', opt.teilPruefen ? 'Finde zuerst die gesuchte Zeile. Teil b) erscheint, sobald Teil a) richtig ist.' : 'Lege zuerst die Zeile fest. Danach erscheint Teil b) – die Zeile kannst du dann nicht mehr ändern.'),
        k,
        meldung()
      );
      teilEls[0].appendChild(stufeBox);
    }
  }

  return {
    el: box,
    teile,
    mehrteilig,
    stufeOffen: () => stufeOffen,
    stufePruefen,
    antwort() {
      const liste = teile.map((t) => t.antwort());
      return mehrteilig ? liste : liste[0];
    },
    leer() {
      return teile.every((t) => t.leer());
    },
    setze(antwort) {
      if (antwort === null || antwort === undefined) return;
      if (mehrteilig) teile.forEach((t, i) => t.setze(Array.isArray(antwort) ? antwort[i] : undefined));
      else teile[0].setze(antwort);
      if (stufeOffen && !opt.teilPruefen && !teile[0].leer()) {
        teile[0].sperren(true);
        freischalten();
      }
    },
    feedback(r) {
      if (!r) return;
      if (!mehrteilig) {
        teile[0].feedback(r);
        return;
      }
      if (!Array.isArray(r.teile)) return;
      r.teile.forEach((x, i) => {
        if (teile[i]) teile[i].feedback(x);
      });
    },
    loesung(loesung) {
      freischalten();
      teile.forEach((t, i) => t.loesung(mehrteilig ? (Array.isArray(loesung) ? loesung[i] : undefined) : loesung));
    },
    sperren(an) {
      if (an) freischalten();
      teile.forEach((t) => t.sperren(an));
    }
  };
}
