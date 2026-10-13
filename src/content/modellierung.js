'use strict';
/*
 * Aufgabenformat Phase 5 (Plan Phase 5 Task 2; docs/AUFGABENFORMAT.md §5.7, §6.11): Blöcke `er` und `mengen`,
 * Interaktionen `zellen`, `anomalie`, `zerlegen`, `schema`, `er` – Antworten bereinigen, leer erkennen, prüfen,
 * Musterantwort, Validator-Regeln und öffentliche Felder. Die Fachlogik steckt im Modellierungs-Kern src/er
 * (gleicheAb, pruefeLesen, pruefeGraphForm, gleicheSchemaAb, pruefeSchemaForm, pruefeZerlegung, bcnfZerlegung …);
 * pruefer.js, validator.js und services/inhalte.js binden dieses Modul additiv an. Nur Server.
 *
 * Element-Ids eines ER-Graphen (Block `er`, Startdiagramm, Lesen-Modus): Entitätstypen und Beziehungstypen tragen ihre
 * `id`; ein Attribut hat die Id `<id des Elements>.<Index>` (Index 0-basiert in dessen `attribute`), z. B. `e1.0`.
 * Ids von Entitäts- und Beziehungstypen in Blöcken und Startdiagrammen: 1–40 Zeichen aus A–Z, a–z, 0–9, `_`, `-`.
 *
 * Datenschutz: Was der Browser zum Bedienen braucht, steht in `interaktion` (OEFFENTLICHE_FELDER, alles andere wird
 * nicht ausgeliefert); Musterlösungen, Synonyme, FAs, Zellen und Anomalieart stehen in `loesung`. Rückmeldungen nennen
 * nur Kriterien, Zähler und Namen bzw. Spalten, die der Schüler selbst verwendet hat oder die in der Aufgabe sichtbar sind.
 */

const F = require('./format');
const ER = require('../er');

const NEUE_INTERAKTIONEN = ['zellen', 'anomalie', 'zerlegen', 'schema', 'er'];
const NEUE_BLOECKE = ['er', 'mengen'];
const ANOMALIE_ARTEN = ['einfuegung', 'aenderung', 'loeschung', 'keine'];
const ANOMALIE_OPERATIONEN = ['aendern', 'loeschen', 'einfuegen'];
const ER_MODI = ['lesen', 'ergaenzen', 'entwickeln'];
const SCHEMA_MODI = ['schluessel', 'frei'];
/** Felder je Interaktion, die an den Browser gehen (zusätzlich kind, frage, inhalt). */
const OEFFENTLICHE_FELDER = {
  zellen: ['block', 'mehrfach', 'reihenfolge'],
  anomalie: ['block', 'auftrag', 'operation', 'simulation'],
  zerlegen: ['attribute', 'tabellenMax'],
  schema: ['modus', 'start'],
  er: ['modus', 'block', 'start', 'kategorien']
};
const MAX_ELEMENTE = 30;
const MAX_NAME = 40;
const MAX_ZELLEN = 300;
const MAX_KOORDINATE = 5000;
const ID_RE = /^[A-Za-z0-9_-]{1,40}$/;
const OPERATION_ZU_ART = { aendern: 'aenderung', loeschen: 'loeschung', einfuegen: 'einfuegung' };

const istObjekt = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const istText = (x) => typeof x === 'string' && x.trim() !== '';
const istZelle = (x) => x === null || typeof x === 'string' || (typeof x === 'number' && Number.isFinite(x));

/** AntwortFehler aus pruefer.js (spät geladen: pruefer.js bindet dieses Modul selbst ein). */
function antwortFehler(text) {
  const { AntwortFehler } = require('./pruefer');
  return new AntwortFehler(text);
}

function auspacken(antwort, schluessel) {
  if (istObjekt(antwort) && schluessel in antwort) return antwort[schluessel];
  return antwort;
}

/* ======================================================================================================== */
/* ER-Graph: Element-Ids, Layout, Teilgraph, Vergleichsform                                                 */
/* ======================================================================================================== */

/** Alle Element-Ids eines (wohlgeformten) Graphen: Entitätstypen, Beziehungstypen, Attribute `<id>.<i>`. */
function erElementIds(graph) {
  const ids = { entitaeten: [], beziehungen: [], attribute: [] };
  if (!istObjekt(graph)) return ids;
  const attr = (el) => (Array.isArray(el.attribute) ? el.attribute : []).forEach((_, i) => ids.attribute.push(`${el.id}.${i}`));
  for (const e of Array.isArray(graph.entitaeten) ? graph.entitaeten : []) {
    if (!istObjekt(e)) continue;
    ids.entitaeten.push(String(e.id));
    attr(e);
  }
  for (const b of Array.isArray(graph.beziehungen) ? graph.beziehungen : []) {
    if (!istObjekt(b)) continue;
    ids.beziehungen.push(String(b.id));
    attr(b);
  }
  return ids;
}
function alleIds(graph) {
  const ids = erElementIds(graph);
  return [...ids.entitaeten, ...ids.beziehungen, ...ids.attribute];
}

/** Ids der Entitäts- und Beziehungstypen haben das Block-Format (kein Punkt: der trennt Attribut-Ids). */
function pruefeIdFormat(graph, wo) {
  const fehler = [];
  for (const liste of [graph.entitaeten, graph.beziehungen]) {
    for (const el of Array.isArray(liste) ? liste : []) {
      if (istObjekt(el) && !(typeof el.id === 'string' && ID_RE.test(el.id))) {
        fehler.push(`${wo}: id ${JSON.stringify(el && el.id)} – erlaubt sind 1–40 Zeichen aus A–Z, a–z, 0–9, _ und -.`);
      }
    }
  }
  return fehler;
}

/** layout = { <Element-Id>: { x, y } } für jedes Element (Entitätstypen, Beziehungstypen, Attribute). */
function pruefeLayout(graph, layout, wo) {
  if (!istObjekt(layout)) return [`${wo}: layout (Objekt { <id>: { x, y } }) fehlt.`];
  const fehler = [];
  const ids = alleIds(graph);
  for (const id of ids) {
    const p = layout[id];
    if (!istObjekt(p) || !Number.isFinite(p.x) || !Number.isFinite(p.y)) fehler.push(`${wo}: layout für „${id}“ fehlt ({ x, y }).`);
    else if (p.x < 0 || p.y < 0 || p.x > MAX_KOORDINATE || p.y > MAX_KOORDINATE) fehler.push(`${wo}: layout „${id}“ liegt außerhalb 0–${MAX_KOORDINATE}.`);
  }
  const bekannt = new Set(ids);
  for (const id of Object.keys(layout)) if (!bekannt.has(id)) fehler.push(`${wo}: layout nennt das unbekannte Element „${id}“.`);
  return fehler;
}

/** Block `er`: { t, graph, layout, markiert? } */
function pruefeErBlock(b) {
  const fehler = [];
  const gf = ER.pruefeGraphForm(b.graph);
  if (gf.length) return gf.map((x) => `graph: ${x}`);
  fehler.push(...pruefeIdFormat(b.graph, 'graph'));
  if (fehler.length) return fehler;
  fehler.push(...pruefeLayout(b.graph, b.layout, 'layout'));
  if (b.markiert !== undefined) {
    const bekannt = new Set(alleIds(b.graph));
    if (!Array.isArray(b.markiert)) fehler.push('markiert muss eine Liste von Element-Ids sein.');
    else {
      for (const id of b.markiert) if (!bekannt.has(id)) fehler.push(`markiert: unbekanntes Element „${id}“.`);
      if (new Set(b.markiert).size !== b.markiert.length) fehler.push('markiert enthält ein Element mehrfach.');
    }
  }
  for (const k of Object.keys(b)) if (!['t', 'graph', 'layout', 'markiert'].includes(k)) fehler.push(`unbekanntes Feld „${k}“ (erlaubt: graph, layout, markiert).`);
  return fehler;
}

/** Block `mengen`: { t, links: { name, elemente }, rechts: { … }, linien: [[i, j]] } */
function pruefeMengenBlock(b) {
  const fehler = [];
  const seite = (s, wo) => {
    if (!istObjekt(s)) return fehler.push(`${wo} ({ name, elemente }) fehlt.`);
    if (!istText(s.name) || s.name.length > MAX_NAME) fehler.push(`${wo}.name fehlt oder ist länger als ${MAX_NAME} Zeichen.`);
    if (!Array.isArray(s.elemente) || !s.elemente.length || s.elemente.length > MAX_ELEMENTE) {
      return fehler.push(`${wo}.elemente muss eine Liste mit 1–${MAX_ELEMENTE} Einträgen sein.`);
    }
    if (!s.elemente.every((e) => (istText(e) && e.length <= MAX_NAME) || (typeof e === 'number' && Number.isFinite(e)))) {
      fehler.push(`${wo}.elemente: nur Texte (≤ ${MAX_NAME} Zeichen) oder Zahlen.`);
    }
    return null;
  };
  seite(b.links, 'links');
  seite(b.rechts, 'rechts');
  if (!Array.isArray(b.linien)) fehler.push('linien muss eine Liste von Paaren [i, j] sein.');
  else if (!fehler.length) {
    const nl = b.links.elemente.length;
    const nr = b.rechts.elemente.length;
    const gesehen = new Set();
    b.linien.forEach((l, k) => {
      if (!Array.isArray(l) || l.length !== 2 || !Number.isInteger(l[0]) || !Number.isInteger(l[1]) || l[0] < 0 || l[0] >= nl || l[1] < 0 || l[1] >= nr) {
        fehler.push(`linien[${k}]: [i, j] mit 0 ≤ i < ${nl} (links) und 0 ≤ j < ${nr} (rechts).`);
        return;
      }
      const s = l.join(',');
      if (gesehen.has(s)) fehler.push(`linien[${k}]: Linie doppelt.`);
      gesehen.add(s);
    });
  }
  return fehler;
}

/** Kardinalität strukturell: 'eins' | 'viele' | null. */
function kardStruktur(k) {
  if (k === 1 || k === '1') return 'eins';
  if (typeof k === 'string' && /^[nmp]$/i.test(k.trim())) return 'viele';
  return null;
}

/**
 * Ist `start` Teilgraph von `ziel`? Zuordnung über Namen (Synonyme, Groß/Klein, Plural): jeder Entitätstyp des Starts
 * mit seinen Attributen, jeder Beziehungstyp über die verbundenen Entitätstypen (Name entscheidet bei mehreren) mit
 * seinen Attributen. streng (Validator): Beziehungsnamen, Schlüssel-Markierung und gesetzte Kardinalitäten müssen
 * passen. → { ok, fehlt } (fehlt = Zahl nicht gefundener Elemente bzw. Attribute)
 */
function teilgraph(start, ziel, { synonyme, streng = false } = {}) {
  const gl = (a, b) => ER.gleich(a, b, synonyme);
  const zEnt = (ziel && Array.isArray(ziel.entitaeten) ? ziel.entitaeten : []).filter(istObjekt);
  const zBez = (ziel && Array.isArray(ziel.beziehungen) ? ziel.beziehungen : []).filter(istObjekt);
  let fehlt = 0;
  const attrDa = (sAttr, zAttr) => {
    for (const a of Array.isArray(sAttr) ? sAttr : []) {
      if (!istObjekt(a)) continue;
      const t = (Array.isArray(zAttr) ? zAttr : []).find((x) => istObjekt(x) && gl(x.name, a.name) && (!streng || (x.schluessel === true) === (a.schluessel === true)));
      if (!t) fehlt++;
    }
  };
  const karte = new Map(); // Start-Id → Ziel-Id
  const vergeben = new Set();
  for (const e of (start && Array.isArray(start.entitaeten) ? start.entitaeten : []).filter(istObjekt)) {
    const t = zEnt.find((x) => !vergeben.has(x.id) && gl(x.name, e.name));
    if (!t) { fehlt++; continue; }
    vergeben.add(t.id);
    karte.set(String(e.id), t.id);
    attrDa(e.attribute, t.attribute);
  }
  const genutzt = new Set();
  for (const b of (start && Array.isArray(start.beziehungen) ? start.beziehungen : []).filter(istObjekt)) {
    const enden = (Array.isArray(b.enden) ? b.enden : []).filter(istObjekt);
    const ziele = enden.map((e) => karte.get(String(e.entitaet)));
    if (!enden.length || ziele.some((z) => z === undefined)) { fehlt++; continue; }
    const schluessel = [...ziele].map(String).sort().join('|');
    const kandidaten = zBez.filter((x) => !genutzt.has(x) && Array.isArray(x.enden) &&
      x.enden.filter(istObjekt).map((e) => String(e.entitaet)).sort().join('|') === schluessel);
    const mitName = kandidaten.filter((x) => istText(b.name) && gl(x.name, b.name));
    let t = mitName[0] || (streng && istText(b.name) ? null : kandidaten[0]);
    if (t && streng && !kardPasst(enden, ziele, t)) t = mitName.concat(kandidaten).find((x) => kardPasst(enden, ziele, x)) || null;
    if (!t) { fehlt++; continue; }
    genutzt.add(t);
    attrDa(b.attribute, t.attribute);
  }
  return { ok: fehlt === 0, fehlt };
}

/** Gesetzte Kardinalitäten der Start-Enden passen zu einer Zuordnung der Ziel-Enden (Permutationen bei Rekursion). */
function kardPasst(enden, ziele, t) {
  const zEnden = t.enden.filter(istObjekt);
  const perm = (rest, i) => {
    if (i === enden.length) return true;
    for (let k = 0; k < rest.length; k++) {
      const z = rest[k];
      if (String(z.entitaet) !== String(ziele[i])) continue;
      const soll = kardStruktur(enden[i].kard);
      if (soll && soll !== kardStruktur(z.kard)) continue;
      if (perm(rest.filter((_, j) => j !== k), i + 1)) return true;
    }
    return false;
  };
  return zEnden.length === enden.length && perm(zEnden, 0);
}

/** Vergleichsform eines Graphen ohne Ids und Layout (für „unverändert = leer“). */
function graphForm(graph) {
  const g = istObjekt(graph) ? graph : {};
  const ent = (Array.isArray(g.entitaeten) ? g.entitaeten : []).filter(istObjekt);
  const namen = new Map(ent.map((e) => [String(e.id), String(e.name || '').trim()]));
  const attr = (liste) => (Array.isArray(liste) ? liste : []).filter(istObjekt).map((a) => `${String(a.name || '').trim()}${a.schluessel ? '*' : ''}`).sort();
  const e = ent.map((x) => JSON.stringify([namen.get(String(x.id)), attr(x.attribute)])).sort();
  const b = (Array.isArray(g.beziehungen) ? g.beziehungen : []).filter(istObjekt).map((x) =>
    JSON.stringify([
      String(x.name || '').trim(),
      (Array.isArray(x.enden) ? x.enden : []).filter(istObjekt).map((en) => `${namen.get(String(en.entitaet)) || '?'}:${en.kard || ''}:${en.rolle || ''}`).sort(),
      attr(x.attribute)
    ])
  ).sort();
  return JSON.stringify([e, b]);
}

/* ======================================================================================================== */
/* Antworten bereinigen                                                                                     */
/* ======================================================================================================== */

function name(v, wo) {
  if (v === undefined || v === null) return '';
  if (typeof v !== 'string') throw antwortFehler(`${wo}: Name muss Text sein.`);
  const t = v.trim();
  if (t.length > MAX_NAME) throw antwortFehler(`${wo}: Name ist länger als ${MAX_NAME} Zeichen.`);
  return t;
}

function liste(v, wo, max = MAX_ELEMENTE) {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) throw antwortFehler(`${wo} muss eine Liste sein.`);
  if (v.length > max) throw antwortFehler(`Höchstens ${max} ${wo}.`);
  return v;
}

function ganzzahl(v) {
  const n = typeof v === 'string' && /^-?\d+$/.test(v.trim()) ? Number(v) : v;
  if (!Number.isInteger(n)) throw antwortFehler('Zellen werden als [Zeile, Spalte] (ganze Zahlen) angegeben.');
  return n;
}

/** dbtabelle-Block einer zellen-/anomalie-Interaktion (Inhaltsfehler → normaler Error). */
function zielTabelle(aufgabe, ia) {
  const b = Array.isArray(aufgabe.inhalt) ? aufgabe.inhalt[ia.block] : undefined;
  if (!b || b.t !== 'dbtabelle' || !Array.isArray(b.zeilen) || !Array.isArray(b.kopf)) {
    throw new Error(`Aufgabe ${aufgabe.id}: ${ia.kind}.block zeigt auf keinen dbtabelle-Block.`);
  }
  return b;
}

/** Zellen [[zeile, spalte], …] → kanonische Liste ohne Doppelte (Reihenfolge der ersten Nennung). */
function zellenListe(roh, zeilen, spalten) {
  const out = [];
  const gesehen = new Set();
  for (const z of liste(roh, 'Zellen', MAX_ZELLEN)) {
    let p = z;
    if (istObjekt(z)) p = [z.zeile, z.spalte];
    if (!Array.isArray(p) || p.length !== 2) throw antwortFehler('Zellen werden als [Zeile, Spalte] angegeben.');
    const [r, s] = p.map(ganzzahl);
    if (r < 0 || r >= zeilen || s < 0 || s >= spalten) throw antwortFehler('Diese Zelle gibt es nicht.');
    const k = `${r},${s}`;
    if (gesehen.has(k)) continue;
    gesehen.add(k);
    out.push([r, s]);
  }
  return out;
}

/** Graph-Antwort in sichere Form (Grenzen: ≤ 30 Elemente je Art, ≤ 30 Attribute, Namen ≤ 40 Zeichen). */
function bereinigeGraph(roh) {
  let g = auspacken(roh, 'graph');
  if (g === undefined || g === null) g = {};
  if (!istObjekt(g)) throw antwortFehler('Das ER-Diagramm muss ein Objekt { entitaeten, beziehungen } sein.');
  const id = (v, wo) => {
    if (typeof v === 'number' && Number.isFinite(v)) return String(v);
    if (typeof v !== 'string' || v.length > MAX_NAME) throw antwortFehler(`${wo}: ungültige id.`);
    return v;
  };
  const attribute = (l, wo) => liste(l, `Attribute je Element`).map((a) => {
    if (!istObjekt(a)) throw antwortFehler(`${wo}: Attribut muss ein Objekt sein.`);
    return { name: name(a.name, wo), schluessel: a.schluessel === true };
  });
  const entitaeten = liste(g.entitaeten, 'Entitätstypen').map((e, i) => {
    if (!istObjekt(e)) throw antwortFehler('Entitätstyp muss ein Objekt sein.');
    const wo = `Entitätstyp ${i + 1}`;
    return { id: id(e.id, wo), name: name(e.name, wo), attribute: attribute(e.attribute, wo) };
  });
  const beziehungen = liste(g.beziehungen, 'Beziehungstypen').map((b, i) => {
    if (!istObjekt(b)) throw antwortFehler('Beziehungstyp muss ein Objekt sein.');
    const wo = `Beziehungstyp ${i + 1}`;
    const enden = liste(b.enden, 'Enden je Beziehungstyp', 3).map((e) => {
      if (!istObjekt(e)) throw antwortFehler(`${wo}: Ende muss ein Objekt sein.`);
      const kard = e.kard === undefined || e.kard === null ? '' : String(e.kard).trim();
      if (kard.length > 2) throw antwortFehler(`${wo}: Kardinalität muss 1, n, m oder p sein.`);
      const ende = { entitaet: id(e.entitaet, wo), kard };
      const rolle = name(e.rolle, wo);
      if (rolle) ende.rolle = rolle;
      return ende;
    });
    return { id: id(b.id, wo), name: name(b.name, wo), enden, attribute: attribute(b.attribute, wo) };
  });
  return { entitaeten, beziehungen };
}

/** Relationen-Antwort (Schema-Werkbank) in sichere Form; ganz leere Karten entfallen; Formfehler → AntwortFehler. */
function bereinigeRelationen(roh) {
  const l = liste(auspacken(roh, 'relationen'), 'Relationen');
  const out = [];
  for (const r of l) {
    if (!istObjekt(r)) throw antwortFehler('Relation muss ein Objekt sein.');
    const n = name(r.name, 'Relation');
    const attr = liste(r.attribute, 'Attribute je Relation').map((a) => {
      if (!istObjekt(a)) throw antwortFehler(`${n || 'Relation'}: Attribut muss ein Objekt sein.`);
      const at = { name: name(a.name, n || 'Relation') };
      if (a.pk === true) at.pk = true;
      if (typeof a.fk === 'string' && a.fk.trim()) at.fk = name(a.fk, `${n}.${at.name}`);
      else if (a.fk === true) at.fk = true;
      return at;
    });
    if (!n && !attr.length) continue;
    out.push({ name: n, attribute: attr });
  }
  if (out.length) {
    const fehler = ER.pruefeSchemaForm(out);
    if (fehler.length) throw antwortFehler(fehler[0]);
  }
  return out;
}

const relationenForm = (relationen) =>
  JSON.stringify(
    (Array.isArray(relationen) ? relationen : [])
      .filter(istObjekt)
      .map((r) => [String(r.name || '').trim().toLowerCase(), (Array.isArray(r.attribute) ? r.attribute : []).filter(istObjekt)
        .map((a) => `${String(a.name || '').trim().toLowerCase()}|${a.pk === true ? 1 : 0}|${a.fk === true ? '*' : typeof a.fk === 'string' ? a.fk.trim().toLowerCase() : ''}`).sort()])
      .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
  );

/** Relationen- und Attributnamen ohne Schlüssel (Modus „schluessel“: fest wie der Start). */
const geruest = (relationen) =>
  JSON.stringify(
    (Array.isArray(relationen) ? relationen : []).filter(istObjekt)
      .map((r) => [String(r.name || '').trim().toLowerCase(), (Array.isArray(r.attribute) ? r.attribute : []).filter(istObjekt).map((a) => String(a.name || '').trim().toLowerCase()).sort()])
      .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
  );

function startRelationen(ia) {
  return Array.isArray(ia.start) ? ia.start : istObjekt(ia.start) && Array.isArray(ia.start.relationen) ? ia.start.relationen : null;
}

/** Element-Ids des Diagramms im Lesen-Modus. */
function leseBlock(aufgabe, ia) {
  const b = Array.isArray(aufgabe.inhalt) ? aufgabe.inhalt[ia.block] : undefined;
  if (!b || b.t !== 'er' || !istObjekt(b.graph)) throw new Error(`Aufgabe ${aufgabe.id}: er.block zeigt auf keinen er-Block.`);
  return b;
}

/** Antwort eines Teils der neuen Interaktionen in die kanonische Form bringen (wirft AntwortFehler). */
function bereinige(ia, antwort, aufgabe) {
  switch (F.artVon(ia)) {
    case 'zellen': {
      const b = zielTabelle(aufgabe, ia);
      return zellenListe(auspacken(antwort, 'zellen'), b.zeilen.length, b.kopf.length);
    }
    case 'anomalie': {
      const b = zielTabelle(aufgabe, ia);
      const a = istObjekt(antwort) ? antwort : {};
      const art = a.art === undefined || a.art === null ? '' : a.art;
      if (art !== '' && !ANOMALIE_ARTEN.includes(art)) throw antwortFehler(`Anomalieart muss ${ANOMALIE_ARTEN.join(', ')} sein.`);
      const zeilen = b.zeilen.length + (ia.operation === 'einfuegen' ? 1 : 0); // einfuegen: die neue Zeile hat den Index zeilen.length
      return { art, zellen: zellenListe(a.zellen, zeilen, b.kopf.length) };
    }
    case 'zerlegen': {
      const erlaubt = new Set(Array.isArray(ia.attribute) ? ia.attribute : []);
      const max = Number.isInteger(ia.tabellenMax) ? ia.tabellenMax : MAX_ELEMENTE;
      const spalten = (l, wo) => {
        const out = [];
        for (const s of liste(l, wo)) {
          if (typeof s !== 'string' || s.length > MAX_NAME) throw antwortFehler('Spalten werden mit ihrem Namen angegeben.');
          if (!erlaubt.has(s)) throw antwortFehler('Diese Spalte gibt es in der Aufgabe nicht.');
          if (!out.includes(s)) out.push(s);
        }
        return out;
      };
      const tabellen = liste(auspacken(antwort, 'tabellen'), 'Tabellen', max).map((t) => {
        if (!istObjekt(t)) throw antwortFehler('Tabelle muss ein Objekt { attribute, schluessel } sein.');
        const attribute = spalten(t.attribute, 'Spalten je Tabelle');
        const schluessel = spalten(t.schluessel, 'Schlüsselspalten');
        if (schluessel.some((s) => !attribute.includes(s))) throw antwortFehler('Schlüsselspalten müssen in ihrer Tabelle stehen.');
        return { attribute, schluessel };
      });
      return { tabellen };
    }
    case 'schema': {
      const relationen = bereinigeRelationen(antwort);
      const start = startRelationen(ia);
      if (ia.modus === 'schluessel' && relationen.length && start && geruest(relationen) !== geruest(start)) {
        throw antwortFehler('Hier bleiben Relationen und Attribute wie vorgegeben – setze nur Primär- und Fremdschlüssel.');
      }
      return { relationen };
    }
    case 'er': {
      if (ia.modus !== 'lesen') return bereinigeGraph(antwort);
      const ids = new Set(alleIds(leseBlock(aufgabe, ia).graph));
      if (Array.isArray(ia.kategorien)) {
        const kats = new Set(ia.kategorien.filter(istObjekt).map((k) => k.id));
        const roh = auspacken(antwort, 'zuordnung');
        if (roh !== undefined && roh !== null && !istObjekt(roh)) throw antwortFehler('Zuordnung muss ein Objekt { Element: Kategorie } sein.');
        const zuordnung = {};
        const eintraege = Object.entries(roh || {});
        if (eintraege.length > MAX_ZELLEN) throw antwortFehler('Zu viele Zuordnungen.');
        for (const [id, kat] of eintraege) {
          if (kat === undefined || kat === null || kat === '') continue;
          if (!ids.has(id)) throw antwortFehler('Dieses Element gibt es im Diagramm nicht.');
          if (!kats.has(kat)) throw antwortFehler('Diese Kategorie gibt es nicht.');
          zuordnung[id] = kat;
        }
        return { zuordnung };
      }
      const elemente = [];
      for (const id of liste(auspacken(antwort, 'elemente'), 'Elemente', MAX_ZELLEN)) {
        if (typeof id !== 'string' || !ids.has(id)) throw antwortFehler('Dieses Element gibt es im Diagramm nicht.');
        if (!elemente.includes(id)) elemente.push(id);
      }
      return { elemente };
    }
    default:
      throw antwortFehler('Unbekannte Interaktion.');
  }
}

/** Ist die (bereinigte) Antwort leer (kein Fehlversuch)? */
function istLeer(ia, a, lo) {
  switch (F.artVon(ia)) {
    case 'zellen':
      return a.length === 0 && !(lo && Array.isArray(lo.zellen) && lo.zellen.length === 0);
    case 'anomalie':
      return a.art === '' && a.zellen.length === 0;
    case 'zerlegen':
      return !a.tabellen.some((t) => t.attribute.length);
    case 'schema': {
      if (!a.relationen.length) return true;
      const start = startRelationen(ia);
      return !!start && relationenForm(a.relationen) === relationenForm(start);
    }
    case 'er': {
      if (ia.modus === 'lesen') return a.zuordnung ? Object.keys(a.zuordnung).length === 0 : a.elemente.length === 0;
      if (!a.entitaeten.length && !a.beziehungen.length) return true;
      return ia.modus === 'ergaenzen' && istObjekt(ia.start) && graphForm(a) === graphForm(ia.start.graph);
    }
    default:
      return false;
  }
}

/* ======================================================================================================== */
/* Prüfen                                                                                                   */
/* ======================================================================================================== */

const zellSchluessel = (z) => `${z[0]},${z[1]}`;
function zellenGleich(a, b, reihenfolge) {
  const x = a.map(zellSchluessel);
  const y = (Array.isArray(b) ? b : []).map(zellSchluessel);
  if (reihenfolge) return x.length === y.length && x.every((v, i) => v === y[i]);
  const sx = new Set(x);
  const sy = new Set(y);
  return sx.size === sy.size && [...sx].every((v) => sy.has(v));
}

const START_FEHLT = {
  code: 'START_FEHLT',
  text: 'Ein Element des vorgegebenen Diagramms fehlt oder wurde umbenannt – lass es stehen und ergänze nur.',
  falle: 'P9'
};

/** Einen Teil prüfen (Antwort bereinigt). → { ok, rueckmeldung } */
function pruefeTeil(ia, lo, a) {
  const l = istObjekt(lo) ? lo : {};
  switch (F.artVon(ia)) {
    case 'zellen': {
      if (ia.mehrfach === false && a.length > 1) return { ok: false, rueckmeldung: {} };
      return { ok: zellenGleich(a, l.zellen, ia.reihenfolge === true), rueckmeldung: {} };
    }
    case 'anomalie': {
      const artOk = a.art !== '' && a.art === l.art;
      const zellenOk = zellenGleich(a.zellen, l.zellen, false);
      return { ok: artOk && zellenOk, rueckmeldung: { art: artOk ? 'ok' : 'falsch', zellen: zellenOk ? 'ok' : 'falsch' } };
    }
    case 'zerlegen': {
      const r = ER.pruefeZerlegung(a, { attribute: ia.attribute, fa: l.fa });
      return {
        ok: r.geloest,
        rueckmeldung: { vollstaendig: r.vollstaendig, verlustfrei: r.verlustfrei, redundanzfrei: r.redundanzfrei, tabellen: r.tabellen, hinweise: r.hinweise }
      };
    }
    case 'schema': {
      const r = ER.gleicheSchemaAb(a.relationen, Array.isArray(l.muster) ? l.muster : [], { synonyme: l.synonyme });
      return { ok: r.geloest, rueckmeldung: { relationen: r.relationen, fehlend: r.fehlend, ueberzaehlig: r.ueberzaehlig, hinweise: r.hinweise } };
    }
    case 'er': {
      if (ia.modus === 'lesen') return { ok: ER.pruefeLesen(a, l).geloest, rueckmeldung: {} };
      const r = ER.gleicheAb(a, Array.isArray(l.muster) ? l.muster : [], { synonyme: l.synonyme, aequivalenzen: l.aequivalenzen, kriterien: l.kriterien });
      const hinweise = [];
      if (ia.modus === 'ergaenzen' && istObjekt(ia.start) && !teilgraph(ia.start.graph, a, { synonyme: l.synonyme }).ok) hinweise.push({ ...START_FEHLT });
      return { ok: r.geloest && !hinweise.length, rueckmeldung: { kriterien: r.kriterien, richtig: r.richtig, gesamt: r.gesamt, hinweise } };
    }
    default:
      throw antwortFehler('Unbekannte Interaktion.');
  }
}

/** Musterantwort eines Teils (für Validator und Tests). */
function musterantwortTeil(ia, lo) {
  const l = istObjekt(lo) ? lo : {};
  switch (F.artVon(ia)) {
    case 'zellen':
      return Array.isArray(l.zellen) ? l.zellen : [];
    case 'anomalie':
      return { art: l.art, zellen: Array.isArray(l.zellen) ? l.zellen : [] };
    case 'zerlegen':
      if (Array.isArray(l.muster) && l.muster.length) return l.muster[0];
      return { tabellen: ER.bcnfZerlegung(ia.attribute, l.fa) };
    case 'schema': {
      const m = Array.isArray(l.muster) ? l.muster[0] : undefined;
      return { relationen: Array.isArray(m) ? m : istObjekt(m) && Array.isArray(m.relationen) ? m.relationen : [] };
    }
    case 'er':
      if (ia.modus === 'lesen') return Array.isArray(l.elemente) ? { elemente: l.elemente } : { zuordnung: l.zuordnung || {} };
      return Array.isArray(l.muster) ? l.muster[0] : {};
    default:
      return null;
  }
}

/** Öffentliche Sicht einer neuen Interaktion: nur die Felder aus OEFFENTLICHE_FELDER (Rest bleibt auf dem Server). */
function oeffentlich(ia) {
  const out = { kind: ia.kind };
  for (const k of OEFFENTLICHE_FELDER[ia.kind] || []) if (ia[k] !== undefined) out[k] = structuredClone(ia[k]);
  return out;
}

/* ======================================================================================================== */
/* Validator-Regeln                                                                                         */
/* ======================================================================================================== */

const UMLAUT = /[äöüÄÖÜß]/;

/** Chen-Konventionen (EH §7) für Mustergraphen. → fehler[] */
function chenFehler(g, wo) {
  const fehler = [];
  for (const e of g.entitaeten) {
    if (!/^[A-Z][A-Za-z0-9]*$/.test(e.name)) fehler.push(`${wo}: Entitätstyp „${e.name}“ – Name im Singular, beginnt mit Großbuchstaben, ohne Umlaute, Leer- und Sonderzeichen.`);
    const attr = Array.isArray(e.attribute) ? e.attribute : [];
    if (!attr.some((a) => a.schluessel === true)) fehler.push(`${wo}: Entitätstyp „${e.name}“ braucht ein Schlüsselattribut.`);
  }
  for (const b of g.beziehungen) {
    if (!/^[a-z][A-Za-z0-9]*$/.test(b.name)) fehler.push(`${wo}: Beziehungstyp „${b.name}“ – Verb in lowerCamelCase ohne Umlaute.`);
    if (b.enden.length === 2 && b.enden.some((e) => String(e.kard) === 'p')) fehler.push(`${wo}: Beziehungstyp „${b.name}“ – p nur bei ternären Beziehungen (sonst 1, n, m).`);
    for (const e of b.enden) if (e.rolle && UMLAUT.test(e.rolle)) fehler.push(`${wo}: Rolle „${e.rolle}“ ohne Umlaute.`);
  }
  for (const el of [...g.entitaeten, ...g.beziehungen]) {
    for (const a of Array.isArray(el.attribute) ? el.attribute : []) {
      if (UMLAUT.test(a.name) || /\s/.test(a.name.trim())) fehler.push(`${wo}: Attribut „${a.name}“ ohne Umlaute und Leerzeichen.`);
    }
  }
  return fehler;
}

function pruefeSynonyme(s, lort, fa) {
  if (s === undefined) return;
  if (!istObjekt(s) || !Object.values(s).every((v) => Array.isArray(v) && v.every(istText))) fa(`${lort}.synonyme muss ein Objekt { "Name": ["Synonym", …] } sein.`);
}

function pruefeZellenLoesung(zellen, zeilen, spalten, lort, fa) {
  if (!Array.isArray(zellen)) return fa(`${lort}: zellen (Liste [Zeile, Spalte], 0-basiert) fehlt.`);
  const gesehen = new Set();
  zellen.forEach((z, i) => {
    if (!Array.isArray(z) || z.length !== 2 || !z.every(Number.isInteger) || z[0] < 0 || z[0] >= zeilen || z[1] < 0 || z[1] >= spalten) {
      return fa(`${lort}: zellen[${i}] liegt nicht in der Tabelle (Zeile 0–${zeilen - 1}, Spalte 0–${spalten - 1}).`);
    }
    if (gesehen.has(zellSchluessel(z))) fa(`${lort}: zellen enthält [${z}] mehrfach.`);
    gesehen.add(zellSchluessel(z));
    return null;
  });
  return null;
}

/**
 * Validator-Regeln der neuen Interaktionen (Struktur, Lösung gegen Blöcke, Muster gegen den Modellierungs-Kern).
 * k = { fa, ha } (Fehler/Hinweis melden). Die Musterantwort prüft validator.js danach wie bei allen Interaktionen.
 */
function pruefeInteraktion(ia, lo, aufgabe, ort, lort, k) {
  const { fa, ha } = k;
  const art = F.artVon(ia);
  const erlaubt = new Set(['kind', 'frage', 'inhalt', ...OEFFENTLICHE_FELDER[art]]);
  for (const key of Object.keys(ia)) {
    if (!erlaubt.has(key)) fa(`${ort}: unbekanntes Feld „${key}“ (erlaubt: ${[...erlaubt].join(', ')}; Lösungsdaten gehören in loesung).`);
  }
  const blockAn = (i) => (Array.isArray(aufgabe.inhalt) && Number.isInteger(i) ? aufgabe.inhalt[i] : undefined);
  const dbtabelle = () => {
    const b = blockAn(ia.block);
    if (!b || b.t !== 'dbtabelle' || !Array.isArray(b.zeilen) || !Array.isArray(b.kopf)) {
      fa(`${ort}: block muss der Index eines dbtabelle-Blocks in inhalt sein (gefunden: ${ia.block}).`);
      return null;
    }
    return b;
  };
  switch (art) {
    case 'zellen': {
      const b = dbtabelle();
      for (const f of ['mehrfach', 'reihenfolge']) if (ia[f] !== undefined && typeof ia[f] !== 'boolean') fa(`${ort}: ${f} muss true oder false sein.`);
      if (!b) return;
      pruefeZellenLoesung(lo.zellen, b.zeilen.length, b.kopf.length, lort, fa);
      if (ia.mehrfach === false && Array.isArray(lo.zellen) && lo.zellen.length !== 1) fa(`${lort}: mehrfach: false braucht genau eine Zelle.`);
      for (const key of Object.keys(lo)) if (key !== 'zellen') ha(`${lort}: unbekanntes Feld „${key}“.`);
      return;
    }
    case 'anomalie': {
      const b = dbtabelle();
      if (!istText(ia.auftrag)) fa(`${ort}: auftrag (Text der Auftragskarte) fehlt.`);
      else F.pruefeMarkdown(ia.auftrag).forEach((x) => fa(`${ort}.auftrag: ${x}`));
      if (!ANOMALIE_OPERATIONEN.includes(ia.operation)) fa(`${ort}: operation muss ${ANOMALIE_OPERATIONEN.join(' | ')} sein.`);
      if (!ANOMALIE_ARTEN.includes(lo.art)) fa(`${lort}: art muss ${ANOMALIE_ARTEN.join(' | ')} sein.`);
      if (!b) return;
      const s = ia.simulation;
      if (!istObjekt(s)) fa(`${ort}: simulation fehlt.`);
      else if (ia.operation === 'aendern') {
        if (!Number.isInteger(s.spalte) || s.spalte < 0 || s.spalte >= b.kopf.length) fa(`${ort}: simulation.spalte muss eine Spalte der Tabelle sein (0-basiert).`);
        else if (!istZelle(s.alt) || !istZelle(s.neu) || F.normZelle(s.alt) === F.normZelle(s.neu)) fa(`${ort}: simulation braucht alt und neu (verschiedene Werte).`);
        else if (!b.zeilen.some((z) => F.normZelle(z[s.spalte]) === F.normZelle(s.alt))) fa(`${ort}: simulation.alt kommt in der Spalte ${b.kopf[s.spalte].name} nicht vor.`);
      } else if (ia.operation === 'loeschen') {
        if (!Array.isArray(s.zeilen) || !s.zeilen.length || !s.zeilen.every((z) => Number.isInteger(z) && z >= 0 && z < b.zeilen.length) || new Set(s.zeilen).size !== s.zeilen.length) {
          fa(`${ort}: simulation.zeilen muss eine Liste verschiedener Zeilenindizes der Tabelle sein (0-basiert).`);
        }
      } else if (ia.operation === 'einfuegen') {
        if (!Array.isArray(s.werte) || s.werte.length !== b.kopf.length || !s.werte.every(istZelle)) fa(`${ort}: simulation.werte braucht ${b.kopf.length} Zellen (Wert oder null).`);
      }
      pruefeZellenLoesung(lo.zellen, b.zeilen.length + (ia.operation === 'einfuegen' ? 1 : 0), b.kopf.length, lort, fa);
      if (OPERATION_ZU_ART[ia.operation] && ANOMALIE_ARTEN.includes(lo.art) && lo.art !== 'keine' && lo.art !== OPERATION_ZU_ART[ia.operation]) {
        ha(`${lort}: art „${lo.art}“ passt nicht zur operation „${ia.operation}“ – Absicht?`);
      }
      return;
    }
    case 'zerlegen': {
      const attr = ia.attribute;
      if (!Array.isArray(attr) || attr.length < 2 || attr.length > MAX_ELEMENTE || !attr.every((a) => istText(a) && a.length <= MAX_NAME)) {
        return fa(`${ort}: attribute muss eine Liste von 2–${MAX_ELEMENTE} Spaltennamen (≤ ${MAX_NAME} Zeichen) sein.`);
      }
      if (new Set(attr).size !== attr.length) fa(`${ort}: attribute enthält eine Spalte mehrfach.`);
      if (ia.tabellenMax !== undefined && (!Number.isInteger(ia.tabellenMax) || ia.tabellenMax < 1 || ia.tabellenMax > MAX_ELEMENTE)) fa(`${ort}: tabellenMax muss eine ganze Zahl 1–${MAX_ELEMENTE} sein.`);
      if (!Array.isArray(lo.fa)) return fa(`${lort}: fa (Liste { links, rechts }) fehlt.`);
      let faOk = true;
      lo.fa.forEach((f, i) => {
        if (!istObjekt(f) || !Array.isArray(f.links) || !f.links.length || !Array.isArray(f.rechts) || !f.rechts.length) {
          faOk = false;
          return fa(`${lort}: fa[${i}] braucht links und rechts (nicht-leere Listen).`);
        }
        for (const s of [...f.links, ...f.rechts]) {
          if (!attr.includes(s)) {
            faOk = false;
            fa(`${lort}: fa[${i}] nennt „${s}“ – das ist keine Spalte aus attribute.`);
          }
        }
        return null;
      });
      if (!faOk) return;
      if (lo.schluessel !== undefined) {
        const kand = ER.schluesselKandidaten(attr, lo.fa).map((x) => [...x].sort().join('|'));
        if (!Array.isArray(lo.schluessel) || !kand.includes([...lo.schluessel].sort().join('|'))) {
          fa(`${lort}: schluessel ist kein Schlüsselkandidat der Rohtabelle (laut fa: ${ER.schluesselKandidaten(attr, lo.fa).map((x) => `(${x.join(', ')})`).join(' oder ')}).`);
        }
      }
      const max = Number.isInteger(ia.tabellenMax) ? ia.tabellenMax : MAX_ELEMENTE;
      const zerlegungOk = (z, wo) => {
        const tabellen = istObjekt(z) && Array.isArray(z.tabellen) ? z.tabellen : null;
        if (!tabellen) return fa(`${wo} muss { tabellen: [{ attribute, schluessel }] } sein.`);
        if (tabellen.length > max) fa(`${wo}: ${tabellen.length} Tabellen, tabellenMax ist ${max}.`);
        const r = ER.pruefeZerlegung(z, { attribute: attr, fa: lo.fa });
        if (!r.geloest) {
          const texte = [...r.hinweise, ...r.tabellen.flatMap((t) => t.hinweise)].map((h) => h.code).join(', ');
          fa(`${wo} ist nach den fa nicht gelöst (${texte || 'unvollständig'}).`);
        }
        return null;
      };
      if (lo.muster !== undefined) {
        if (!Array.isArray(lo.muster) || !lo.muster.length) fa(`${lort}.muster muss eine nicht-leere Liste von Zerlegungen sein.`);
        else lo.muster.forEach((m, i) => zerlegungOk(m, `${lort}.muster[${i}]`));
      } else {
        zerlegungOk({ tabellen: ER.bcnfZerlegung(attr, lo.fa) }, `${lort}: Die berechnete Zerlegung (keine loesung.muster)`);
      }
      return;
    }
    case 'schema': {
      if (!SCHEMA_MODI.includes(ia.modus)) fa(`${ort}: modus muss ${SCHEMA_MODI.join(' | ')} sein.`);
      const start = startRelationen(ia);
      if (ia.start !== undefined) {
        if (!start) fa(`${ort}: start muss eine Liste von Relationen sein (Format wie Block schema).`);
        else ER.pruefeSchemaForm(start).forEach((x) => fa(`${ort}.start: ${x}`));
      } else if (ia.modus === 'schluessel') fa(`${ort}: Modus schluessel braucht start (Relationen und Attribute, die fest bleiben).`);
      pruefeSynonyme(lo.synonyme, lort, fa);
      if (!Array.isArray(lo.muster) || !lo.muster.length) return fa(`${lort}: muster (Liste zulässiger Relationenschemata) fehlt.`);
      lo.muster.forEach((m, i) => {
        const wo = `${lort}.muster[${i}]`;
        const rel = Array.isArray(m) ? m : istObjekt(m) && Array.isArray(m.relationen) ? m.relationen : null;
        if (!rel) return fa(`${wo}: Liste von Relationen erwartet.`);
        const form = ER.pruefeSchemaForm(rel);
        if (form.length) return form.forEach((x) => fa(`${wo}: ${x}`));
        for (const r of rel) {
          if (UMLAUT.test(r.name) || r.attribute.some((a) => UMLAUT.test(a.name))) fa(`${wo}: Relation „${r.name}“ – Namen ohne Umlaute.`);
          if (!r.attribute.some((a) => a.pk === true)) fa(`${wo}: Relation „${r.name}“ hat keinen Primärschlüssel.`);
        }
        const selbst = ER.gleicheSchemaAb(rel, [rel], { synonyme: lo.synonyme });
        if (!selbst.geloest) fa(`${wo}: Das Musterschema wird vom Schema-Abgleich nicht als gelöst erkannt.`);
        if (ia.modus === 'schluessel' && start && geruest(rel) !== geruest(start)) fa(`${wo}: Im Modus schluessel muss das Muster dieselben Relationen und Attribute wie start haben.`);
        return null;
      });
      return;
    }
    case 'er': {
      if (!ER_MODI.includes(ia.modus)) return fa(`${ort}: modus muss ${ER_MODI.join(' | ')} sein.`);
      if (ia.modus === 'lesen') return pruefeLesenModus(ia, lo, blockAn, ort, lort, fa);
      if (ia.block !== undefined || ia.kategorien !== undefined) fa(`${ort}: block und kategorien gibt es nur im Modus lesen.`);
      let startOk = false;
      if (ia.modus === 'ergaenzen') {
        if (!istObjekt(ia.start)) fa(`${ort}: Modus ergaenzen braucht start { graph, layout }.`);
        else {
          const gf = ER.pruefeGraphForm(ia.start.graph);
          if (gf.length) gf.forEach((x) => fa(`${ort}.start.graph: ${x}`));
          else {
            const weitere = [...pruefeIdFormat(ia.start.graph, `${ort}.start.graph`), ...pruefeLayout(ia.start.graph, ia.start.layout, `${ort}.start.layout`)];
            weitere.forEach((x) => fa(x));
            startOk = !weitere.length;
          }
          for (const key of Object.keys(ia.start)) if (!['graph', 'layout'].includes(key)) fa(`${ort}.start: unbekanntes Feld „${key}“.`);
        }
      } else if (ia.start !== undefined) fa(`${ort}: Modus entwickeln beginnt leer – start gibt es nur bei ergaenzen.`);
      pruefeSynonyme(lo.synonyme, lort, fa);
      if (lo.aequivalenzen !== undefined && (!Array.isArray(lo.aequivalenzen) || !lo.aequivalenzen.every((x) => ER.AEQUIVALENZEN.includes(x)))) {
        fa(`${lort}.aequivalenzen: Liste aus ${ER.AEQUIVALENZEN.join(', ')}.`);
      }
      if (lo.kriterien !== undefined && (!Array.isArray(lo.kriterien) || !lo.kriterien.length || !lo.kriterien.every((x) => ER.KRITERIEN.includes(x)))) {
        fa(`${lort}.kriterien: nicht-leere Liste aus ${ER.KRITERIEN.join(', ')}.`);
      }
      if (!Array.isArray(lo.muster) || !lo.muster.length) return fa(`${lort}: muster (Liste zulässiger ER-Graphen) fehlt.`);
      const opt = { synonyme: lo.synonyme, aequivalenzen: lo.aequivalenzen, kriterien: lo.kriterien };
      lo.muster.forEach((m, i) => {
        const wo = `${lort}.muster[${i}]`;
        const gf = ER.pruefeGraphForm(m, { vollstaendig: true });
        if (gf.length) return gf.forEach((x) => fa(`${wo}: ${x}`));
        chenFehler(m, wo).forEach((x) => fa(x));
        const selbst = ER.gleicheAb(m, [m], opt);
        if (!selbst.geloest) fa(`${wo}: Der Mustergraph wird vom Graph-Abgleich nicht als gelöst erkannt.`);
        if (startOk && !teilgraph(ia.start.graph, m, { synonyme: lo.synonyme, streng: true }).ok) fa(`${wo}: Das Startdiagramm ist kein Teil dieses Musters (Namen, Attribute, Schlüssel, Kardinalitäten).`);
        return null;
      });
      return;
    }
    default:
      return;
  }
}

function pruefeLesenModus(ia, lo, blockAn, ort, lort, fa) {
  const b = blockAn(ia.block);
  if (!b || b.t !== 'er' || !istObjekt(b.graph)) return fa(`${ort}: Modus lesen braucht block (Index eines er-Blocks in inhalt; gefunden: ${ia.block}).`);
  if (ia.start !== undefined) fa(`${ort}: start gibt es nur im Modus ergaenzen.`);
  const ids = new Set(alleIds(b.graph));
  let kats = null;
  if (ia.kategorien !== undefined) {
    if (!Array.isArray(ia.kategorien) || ia.kategorien.length < 2) fa(`${ort}: kategorien braucht mind. 2 Einträge { id, md }.`);
    else {
      kats = ia.kategorien.map((x) => (istObjekt(x) ? x.id : undefined));
      if (kats.some((x) => !istText(x)) || new Set(kats).size !== kats.length) fa(`${ort}: kategorien brauchen eindeutige ids.`);
      ia.kategorien.forEach((x, i) => {
        if (!istObjekt(x) || !istText(x.md)) fa(`${ort}.kategorien[${i}]: md fehlt.`);
        else F.pruefeMarkdown(x.md).forEach((t) => fa(`${ort}.kategorien[${i}]: ${t}`));
      });
    }
  }
  if (Array.isArray(ia.kategorien)) {
    if (!istObjekt(lo.zuordnung) || !Object.keys(lo.zuordnung).length) return fa(`${lort}: zuordnung { Element-Id: Kategorie } fehlt (Modus lesen mit kategorien).`);
    for (const [id, kat] of Object.entries(lo.zuordnung)) {
      if (!ids.has(id)) fa(`${lort}.zuordnung: unbekanntes Element „${id}“ (Ids: Entitätstypen, Beziehungstypen, Attribute <id>.<i>).`);
      if (kats && !kats.includes(kat)) fa(`${lort}.zuordnung: unbekannte Kategorie „${kat}“.`);
    }
    if (lo.elemente !== undefined) fa(`${lort}: mit kategorien gilt zuordnung, nicht elemente.`);
  } else {
    if (!Array.isArray(lo.elemente) || !lo.elemente.length) return fa(`${lort}: elemente (Liste der richtigen Element-Ids) fehlt.`);
    for (const id of lo.elemente) if (!ids.has(id)) fa(`${lort}.elemente: unbekanntes Element „${id}“ (Ids: Entitätstypen, Beziehungstypen, Attribute <id>.<i>).`);
    if (new Set(lo.elemente).size !== lo.elemente.length) fa(`${lort}.elemente enthält ein Element mehrfach.`);
    if (lo.zuordnung !== undefined) fa(`${lort}: zuordnung nur zusammen mit kategorien.`);
  }
  return null;
}

module.exports = {
  NEUE_INTERAKTIONEN,
  NEUE_BLOECKE,
  ANOMALIE_ARTEN,
  ANOMALIE_OPERATIONEN,
  ER_MODI,
  SCHEMA_MODI,
  OEFFENTLICHE_FELDER,
  erElementIds,
  alleIds,
  pruefeErBlock,
  pruefeMengenBlock,
  teilgraph,
  bereinige,
  istLeer,
  pruefeTeil,
  musterantwortTeil,
  oeffentlich,
  pruefeInteraktion
};
