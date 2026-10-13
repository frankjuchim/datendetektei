// Teile der Interaktionen `er` (Bauplan-Tisch, Lesen-Modus) und `schema` (Schema-Werkbank) für kern/interaktionen.js
// (AUFGABENFORMAT §6.11). Geprüft wird nur auf dem Server; hier entstehen Antworten, Prüfergebnis-Anzeige und
// Lösungsansicht. Schnittstelle je Teil wie in interaktionen.js: { kind, ui, antwort, leer, setze, feedback, loesung,
// sperren } – im Lesen-Modus zusätzlich { block, lesen: true, klick(id), registriere(api) } für den er-Block.

const V = new URL(import.meta.url).search;
const [R, T, W] = await Promise.all([import('../kern/render.js' + V), import('./tisch.js' + V), import('../werkbank/werkbank.js' + V)]);
const { el, h } = R;

const istObjekt = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const nurText = (md) => String(md ?? '').replace(/\*\*|[*`]/g, '').trim();

const ART = { entitaet: 'Entitätstyp', beziehung: 'Beziehungstyp', attribut: 'Attribut' };

/** Lesen-Modus: Elemente des er-Blocks antippen (Menge) bzw. Kategorien zuordnen. */
function teilErLesen(ia, kontext) {
  const kategorien = Array.isArray(ia.kategorien) && ia.kategorien.length >= 2 ? ia.kategorien.filter(istObjekt) : null;
  const katText = new Map((kategorien || []).map((k) => [k.id, nurText(k.md) || k.id]));
  const gewaehlt = new Set();
  const zuordnung = new Map();
  let api = null;
  let aktiv = null;
  let gesperrt = false;
  let loesungKlassen = new Map();
  let loesungEtiketten = null;

  const info = el('p', 'teil-hinweis');
  info.setAttribute('aria-live', 'polite');
  const wahlBox = el('div', 'er-zuordnung');
  wahlBox.hidden = true;

  function elementInfo(id) {
    const e = api ? api.elemente().find((x) => x.id === id) : null;
    if (!e) return { name: id, art: '' };
    const name = String(e.el.name || '').trim() || 'ohne Namen';
    return { name, art: e.art === 'attribut' && e.el.schluessel ? 'Schlüsselattribut' : ART[e.art] };
  }

  function zeichne() {
    if (api) {
      const klassen = new Map(loesungKlassen);
      if (aktiv) klassen.set(aktiv, [klassen.get(aktiv), 'aktiv'].filter(Boolean).join(' '));
      const etiketten = loesungEtiketten || new Map([...zuordnung].map(([id, k]) => [id, katText.get(k) || k]));
      api.zeichne({ gedrueckt: kategorien ? null : gewaehlt, klassen, etiketten: kategorien ? etiketten : new Map() });
      api.sperren(gesperrt);
    }
    if (kategorien) {
      info.textContent = `Tippe ein Element an und ordne es einer Kategorie zu. Zugeordnet: ${zuordnung.size}`;
      zeichneWahl();
    } else {
      info.textContent = `Tippe alle passenden Elemente im Diagramm an. Gewählt: ${gewaehlt.size}`;
    }
  }

  function zeichneWahl() {
    wahlBox.replaceChildren();
    if (!aktiv || gesperrt) {
      wahlBox.hidden = true;
      return;
    }
    wahlBox.hidden = false;
    const { name, art } = elementInfo(aktiv);
    wahlBox.appendChild(el('p', 'er-zuordnung-titel', `${art} „${name}“ zuordnen:`));
    const seg = el('div', 'segment');
    seg.setAttribute('role', 'group');
    seg.setAttribute('aria-label', `Kategorie für ${name}`);
    for (const k of kategorien) {
      const b = el('button', 'segment-knopf', katText.get(k.id));
      b.type = 'button';
      b.dataset.kategorie = k.id;
      b.setAttribute('aria-pressed', zuordnung.get(aktiv) === k.id ? 'true' : 'false');
      b.addEventListener('click', () => {
        if (gesperrt) return;
        if (zuordnung.get(aktiv) === k.id) zuordnung.delete(aktiv);
        else zuordnung.set(aktiv, k.id);
        zeichne();
        kontext.geaendert();
        const neu = wahlBox.querySelector(`[data-kategorie="${CSS.escape(k.id)}"]`);
        if (neu) neu.focus();
      });
      seg.appendChild(b);
    }
    const weg = el('button', 'segment-knopf', 'keine');
    weg.type = 'button';
    weg.setAttribute('aria-pressed', zuordnung.has(aktiv) ? 'false' : 'true');
    weg.addEventListener('click', () => {
      zuordnung.delete(aktiv);
      zeichne();
      kontext.geaendert();
    });
    seg.appendChild(weg);
    wahlBox.appendChild(seg);
  }

  return {
    kind: 'er',
    lesen: true,
    block: ia.block,
    ui: h('div', 'teil-er-lesen', info, wahlBox),
    klick(id) {
      if (gesperrt) return;
      if (kategorien) {
        aktiv = aktiv === id ? null : id;
        zeichne();
        const erster = wahlBox.querySelector('.segment-knopf');
        if (erster && aktiv) erster.focus({ preventScroll: false });
        return;
      }
      if (gewaehlt.has(id)) gewaehlt.delete(id);
      else gewaehlt.add(id);
      zeichne();
      kontext.geaendert();
    },
    registriere(a) {
      api = a;
      zeichne();
    },
    antwort: () => (kategorien ? { zuordnung: Object.fromEntries(zuordnung) } : { elemente: [...gewaehlt] }),
    leer: () => (kategorien ? zuordnung.size === 0 : gewaehlt.size === 0),
    setze(a) {
      if (kategorien) {
        const z = istObjekt(a) && istObjekt(a.zuordnung) ? a.zuordnung : istObjekt(a) ? a : {};
        zuordnung.clear();
        for (const [id, k] of Object.entries(z)) if (katText.has(k)) zuordnung.set(id, k);
      } else {
        const l = Array.isArray(a) ? a : istObjekt(a) && Array.isArray(a.elemente) ? a.elemente : [];
        gewaehlt.clear();
        for (const id of l) gewaehlt.add(String(id));
      }
      zeichne();
    },
    feedback() {},
    loesung(lo) {
      const l = istObjekt(lo) ? lo : {};
      loesungKlassen = new Map();
      if (Array.isArray(l.elemente)) {
        const richtig = new Set(l.elemente);
        for (const id of richtig) loesungKlassen.set(id, 'loesung');
        for (const id of gewaehlt) if (!richtig.has(id)) loesungKlassen.set(id, 'falsch');
      } else if (istObjekt(l.zuordnung)) {
        loesungEtiketten = new Map(Object.entries(l.zuordnung).map(([id, k]) => [id, katText.get(k) || k]));
        for (const id of Object.keys(l.zuordnung)) loesungKlassen.set(id, zuordnung.get(id) === l.zuordnung[id] ? 'loesung' : 'falsch loesung');
      }
      aktiv = null;
      zeichne();
    },
    sperren(an) {
      gesperrt = !!an;
      if (gesperrt) aktiv = null;
      zeichne();
    }
  };
}

/** Ergänzen/Entwickeln: Bauplan-Tisch. */
function teilErTisch(ia, kontext, entwurf) {
  const tisch = T.erzeugeTisch({ modus: ia.modus === 'ergaenzen' ? 'ergaenzen' : 'entwickeln', start: ia.start, entwurf, beiAenderung: () => kontext.geaendert() });
  return {
    kind: 'er',
    tisch,
    ui: tisch.el,
    antwort: () => tisch.antwort(),
    leer: () => tisch.leer(),
    setze: (a) => tisch.setze(a),
    feedback(r) {
      if (r) tisch.zeigeErgebnis(r);
    },
    loesung: (lo) => tisch.zeigeLoesung(lo),
    sperren: (an) => tisch.sperren(an)
  };
}

/** Interaktion `er`. opt.entwurf: localStorage-Schlüssel für den Bauplan-Entwurf. */
export function teilEr(ia, kontext, opt = {}) {
  if (ia && ia.modus === 'lesen') return teilErLesen(ia, kontext);
  return teilErTisch(ia || {}, kontext, opt.entwurf || null);
}

/** Interaktion `schema`: Schema-Werkbank. */
export function teilSchema(ia, kontext, opt = {}) {
  const wb = W.erzeugeWerkbank({ modus: ia && ia.modus, start: ia && ia.start, entwurf: opt.entwurf || null, beiAenderung: () => kontext.geaendert() });
  return {
    kind: 'schema',
    werkbank: wb,
    ui: wb.el,
    antwort: () => wb.antwort(),
    leer: () => wb.leer(),
    setze: (a) => wb.setze(a),
    feedback(r) {
      if (r) wb.zeigeErgebnis(r);
    },
    loesung: (lo) => wb.zeigeLoesung(lo),
    sperren: (an) => wb.sperren(an)
  };
}
