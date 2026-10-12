// Editor der Ermittlungskonsole (DESIGN.md §4.10): Textarea mit Syntax-Overlay (hebeHervor aus parser.js),
// Zeilennummern, Randmarken für Parser-/Regel-Hinweise, Strg/Cmd+Enter = Ausführen, Tab = zwei Leerzeichen
// (Escape und danach Tab verlässt das Feld). Ausgaben nur als Textknoten.
//
// erzeugeEditor({ textarea, overlay, zeilen, hinweisListe, beiAusfuehren, beiAenderung }) → {
//   wert(), setzeWert(text), fuegeEin(text), setzeMarken(diagnosen), fokus()
// }
// diagnosen = [{ code, falle, art: 'fehler' | 'hinweis', text, zeile, spalte }] (pruefeRegeln bzw. Parser-Fehler)

const KLASSEN = {
  schluessel: 'sql-kw',
  text: 'sql-str',
  zahl: 'sql-num',
  kommentar: 'sql-komm',
  aggregat: 'sql-agg',
  operator: 'sql-op'
};
const MIN_ZEILEN = 8;
const EINRUECKUNG = '  ';

function el(tag, klasse, text) {
  const e = document.createElement(tag);
  if (klasse) e.className = klasse;
  if (text !== undefined && text !== null) e.textContent = String(text);
  return e;
}

/** Syntax-Teile als Textknoten/Spans in das Overlay schreiben. */
function zeichneHervorhebung(overlay, sql) {
  const parser = window.DD_SQL_PARSER;
  const frag = document.createDocumentFragment();
  let teile;
  try {
    teile = parser ? parser.hebeHervor(sql) : [{ text: sql, klasse: 'leer' }];
  } catch {
    teile = [{ text: sql, klasse: 'leer' }];
  }
  for (const t of teile) {
    const klasse = KLASSEN[t.klasse];
    frag.appendChild(klasse ? el('span', klasse, t.text) : document.createTextNode(t.text));
  }
  // Abschluss, damit eine leere letzte Zeile die gleiche Höhe hat wie in der Textarea
  frag.appendChild(document.createTextNode('\n '));
  overlay.replaceChildren(frag);
}

export function erzeugeEditor({ textarea, overlay, zeilen, hinweisListe, beiAusfuehren, beiAenderung }) {
  let marken = [];
  let escGedrueckt = false;
  let uhr = null;

  function anzahlZeilen() {
    return textarea.value.split('\n').length;
  }

  function zeichneZeilen() {
    const n = anzahlZeilen();
    const frag = document.createDocumentFragment();
    const jeZeile = new Map();
    for (const m of marken) {
      const z = Math.min(Math.max(1, m.zeile || 1), n);
      if (!jeZeile.has(z)) jeZeile.set(z, []);
      jeZeile.get(z).push(m);
    }
    for (let i = 1; i <= Math.max(n, MIN_ZEILEN); i++) {
      const zeile = el('div', 'zeile-nr' + (i > n ? ' leer' : ''));
      const liste = jeZeile.get(i);
      if (liste) {
        const fehler = liste.some((m) => m.art === 'fehler');
        const marke = el('span', 'randmarke' + (fehler ? ' fehler' : ' hinweis'));
        marke.dataset.code = liste.map((m) => m.code).join(' ');
        marke.id = 'randmarke-' + i;
        const text = liste.map((m) => (m.falle ? `${m.falle}: ` : '') + m.text).join('\n');
        marke.title = text;
        marke.setAttribute('role', 'img');
        marke.setAttribute('aria-label', `Zeile ${i}: ${text}`);
        zeile.appendChild(marke);
      }
      zeile.appendChild(el('span', 'zahl', i > n ? '' : i));
      frag.appendChild(zeile);
    }
    zeilen.replaceChildren(frag);
  }

  function zeichneHinweise() {
    const frag = document.createDocumentFragment();
    if (marken.length > 0) {
      const ul = el('ul');
      for (const m of marken) ul.appendChild(el('li', null, `Zeile ${m.zeile}: ${m.falle ? m.falle + ', ' : ''}${m.text}`));
      frag.appendChild(ul);
    }
    hinweisListe.replaceChildren(frag);
  }

  function aktualisiere() {
    const n = anzahlZeilen();
    textarea.rows = Math.max(MIN_ZEILEN, n + 1);
    zeichneHervorhebung(overlay, textarea.value);
    overlay.scrollLeft = textarea.scrollLeft;
    zeichneZeilen();
  }

  function geaendert() {
    aktualisiere();
    clearTimeout(uhr);
    uhr = setTimeout(() => beiAenderung && beiAenderung(textarea.value), 250);
  }

  /** Text an der Cursorposition einfügen (mit Rückgängig, wenn das Feld den Fokus hat). */
  function fuegeEin(text) {
    const imFokus = document.activeElement === textarea;
    let erledigt = false;
    if (imFokus && typeof document.execCommand === 'function') {
      try {
        erledigt = document.execCommand('insertText', false, text);
      } catch {
        erledigt = false;
      }
    }
    if (!erledigt) {
      const anfang = textarea.selectionStart;
      const ende = textarea.selectionEnd;
      textarea.setRangeText(text, anfang, ende, 'end');
      geaendert();
    }
  }

  textarea.addEventListener('input', geaendert);
  textarea.addEventListener('scroll', () => {
    overlay.scrollLeft = textarea.scrollLeft;
    overlay.scrollTop = textarea.scrollTop;
  });
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      escGedrueckt = false;
      if (beiAusfuehren) beiAusfuehren();
      return;
    }
    if (e.key === 'Escape') {
      escGedrueckt = true;
      return;
    }
    if (e.key === 'Tab' && !e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey) {
      if (escGedrueckt) {
        escGedrueckt = false;
        return; // Fokus verlässt den Editor
      }
      e.preventDefault();
      fuegeEin(EINRUECKUNG);
      return;
    }
    if (e.key !== 'Shift') escGedrueckt = false;
  });

  aktualisiere();

  return {
    wert: () => textarea.value,
    setzeWert(text) {
      textarea.value = String(text);
      aktualisiere();
    },
    fuegeEin,
    setzeMarken(diagnosen) {
      marken = Array.isArray(diagnosen) ? diagnosen : [];
      zeichneZeilen();
      zeichneHinweise();
    },
    fokus: () => textarea.focus()
  };
}
