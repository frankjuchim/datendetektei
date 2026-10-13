'use strict';
// Prüfer je Interaktion (docs/AUFGABENFORMAT.md §6). Prüfung NUR serverseitig.
// Basis-Interaktionen nach dem Muster von Algo Quest src/content/checker.js; neu: sql (delegiert an einen
// injizierten SQL-Prüfer, Phase 2 src/sql/pruefer.js), zeilen, ergebnis, kernpunkte; Phase 5: zellen, anomalie,
// zerlegen, schema, er (src/content/modellierung.js auf dem Modellierungs-Kern src/er).
// Rückmeldungen enthalten nie Lösungsdaten (Vertrag §9).

const F = require('./format');
const M = require('./modellierung');

class AntwortFehler extends Error {
  constructor(message) {
    super(message);
    this.name = 'AntwortFehler';
    this.status = 400;
  }
}

const MAX_LISTE = 300;
const MAX_TEXT = 500;
const MAX_SQL = 4000;
/** Kür K1: Schreib-Skripte (sql mit schreiben: true) dürfen länger sein (src/sql/skript.js MAX_SKRIPT). */
const MAX_SKRIPT = 10000;
const istSchreiben = (ia) => !!(ia && ia.kind === 'sql' && ia.schreiben === true);

/* ---------- Antworten vereinheitlichen (Objekt-Hüllen wie in der Lösung erlaubt) ---------- */

function istObjekt(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function auspacken(antwort, schluessel) {
  if (istObjekt(antwort) && schluessel in antwort) return antwort[schluessel];
  return antwort;
}

function liste(v, name) {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) throw new AntwortFehler(`Antwort (${name}) muss eine Liste sein.`);
  if (v.length > MAX_LISTE) throw new AntwortFehler(`Antwort (${name}) ist zu lang.`);
  return v;
}

function text(v, max = MAX_TEXT) {
  if (v === undefined || v === null) return '';
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (typeof v !== 'string') throw new AntwortFehler('Antwort muss Text sein.');
  if (v.length > max) throw new AntwortFehler('Antwort ist zu lang.');
  return v;
}

function ganzzahl(v) {
  const n = typeof v === 'string' && /^-?\d+$/.test(v.trim()) ? Number(v) : v;
  if (!Number.isInteger(n)) throw new AntwortFehler('Antwort muss ganze Zahlen enthalten.');
  return n;
}

function zelle(v) {
  if (v === undefined || v === null) return null;
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) throw new AntwortFehler('Ungültige Zahl in der Tabelle.');
    return v;
  }
  if (typeof v !== 'string') throw new AntwortFehler('Zellen müssen Text oder Zahlen sein.');
  if (v.length > MAX_TEXT) throw new AntwortFehler('Zelle ist zu lang.');
  return v;
}

function zellLeer(v) {
  return v === null || (typeof v === 'string' && v.trim() === '');
}

/** dbtabelle-Block einer zeilen-Interaktion (Inhaltsfehler → normaler Error, kein AntwortFehler). */
function zielTabelle(aufgabe, ia) {
  const b = Array.isArray(aufgabe.inhalt) ? aufgabe.inhalt[ia.block] : undefined;
  if (!b || b.t !== 'dbtabelle' || !Array.isArray(b.zeilen)) {
    throw new Error(`Aufgabe ${aufgabe.id}: zeilen.block zeigt auf keinen dbtabelle-Block.`);
  }
  return b;
}

/** Antwort eines Teils in die kanonische Form bringen (wirft AntwortFehler bei unbrauchbarer Form). */
function bereinige(ia, antwort, aufgabe) {
  switch (F.artVon(ia)) {
    case 'gaps': {
      const a = istObjekt(antwort) ? antwort : {};
      const out = {};
      for (const id of Object.keys(ia.felder || {})) out[id] = text(a[id]);
      return out;
    }
    case 'choice':
      return [...new Set(liste(auspacken(antwort, 'gewaehlt'), 'Auswahl').map((x) => text(x)))];
    case 'order':
      return liste(auspacken(antwort, 'reihenfolge'), 'Reihenfolge').map((x) => text(x));
    case 'lines':
      return [...new Set(liste(auspacken(antwort, 'zeilen'), 'Zeilen').map(ganzzahl))];
    case 'match': {
      const a = istObjekt(antwort) ? antwort : {};
      const out = {};
      for (const e of ia.elemente || []) {
        if (a[e.id] !== undefined && a[e.id] !== null && a[e.id] !== '') out[e.id] = text(a[e.id]);
      }
      return out;
    }
    case 'sql':
      return text(auspacken(antwort, 'sql'), istSchreiben(ia) ? MAX_SKRIPT : MAX_SQL);
    case 'zeilen': {
      const anzahl = zielTabelle(aufgabe, ia).zeilen.length;
      const idx = [...new Set(liste(auspacken(antwort, 'zeilen'), 'Zeilen').map(ganzzahl))];
      for (const i of idx) if (i < 0 || i >= anzahl) throw new AntwortFehler('Diese Zeile gibt es nicht.');
      return idx;
    }
    case 'ergebnis': {
      const breite = (ia.kopf || []).length;
      const roh = liste(auspacken(antwort, 'zeilen'), 'Zeilen');
      const zeilen = roh.map((z) => {
        if (!Array.isArray(z) || z.length !== breite) throw new AntwortFehler(`Jede Zeile braucht ${breite} Zellen.`);
        return z.map(zelle);
      });
      if (ia.freieZeilen) return zeilen.filter((z) => !z.every(zellLeer));
      const soll = Number.isInteger(ia.zeilenAnzahl) ? ia.zeilenAnzahl : zeilen.length;
      if (zeilen.length > soll) throw new AntwortFehler('Zu viele Zeilen.');
      while (zeilen.length < soll) zeilen.push(new Array(breite).fill(null));
      return zeilen;
    }
    case 'kernpunkte': {
      if (istObjekt(antwort) && Object.keys(antwort).some((k) => k !== 'haken')) {
        throw new AntwortFehler('Nur die Anzahl der Häkchen wird gesendet.');
      }
      const n = antwort === undefined || antwort === null ? 0 : auspacken(antwort, 'haken');
      const max = (ia.kernpunkte || []).length;
      if (!Number.isInteger(n) || n < 0 || n > max) throw new AntwortFehler('Ungültige Anzahl an Häkchen.');
      return n;
    }
    default:
      if (M.NEUE_INTERAKTIONEN.includes(F.artVon(ia))) return M.bereinige(ia, antwort, aufgabe);
      throw new AntwortFehler('Unbekannte Interaktion.');
  }
}

/** Ist die (bereinigte) Antwort leer, sodass kein Fehlversuch gezählt werden sollte? */
function istLeer(ia, a, lo) {
  switch (F.artVon(ia)) {
    case 'gaps':
      return Object.values(a).every((v) => String(v).trim() === '');
    case 'match':
      return Object.keys(a).length === 0;
    case 'choice':
    case 'order':
    case 'lines':
      return a.length === 0;
    case 'zeilen':
      return a.length === 0 && !(lo && Array.isArray(lo.zeilen) && lo.zeilen.length === 0);
    case 'sql':
      return a.trim() === '';
    case 'ergebnis':
      return a.every((z) => z.every(zellLeer));
    default:
      if (M.NEUE_INTERAKTIONEN.includes(F.artVon(ia))) return M.istLeer(ia, a, lo);
      return false;
  }
}

/* ---------- Einzelprüfer ---------- */

function feldRichtig(feld, eingabe, akzeptiert) {
  const werte = Array.isArray(akzeptiert) ? akzeptiert : [akzeptiert];
  const typ = (feld && feld.typ) || 'text';
  if (String(eingabe).trim() === '') return false;
  for (const acc of werte) {
    if (acc === undefined || acc === null) continue;
    if (typ === 'zahl') {
      const a = F.alsZahl(eingabe);
      const b = F.alsZahl(acc);
      if (Number.isFinite(a) && Number.isFinite(b)) {
        if (Math.abs(a - b) <= 1e-9) return true;
        continue;
      }
      if (F.normText(eingabe, 'code') === F.normText(acc, 'code')) return true;
    } else if (typ === 'auswahl') {
      if (String(eingabe) === String(acc)) return true;
    } else if (F.normText(eingabe, feld.norm || 'code') === F.normText(acc, feld.norm || 'code')) {
      return true;
    }
  }
  return false;
}

function mengeGleich(a, b) {
  const sa = new Set(a.map(String));
  const sb = new Set(b.map(String));
  if (sa.size !== sb.size) return false;
  for (const x of sa) if (!sb.has(x)) return false;
  return true;
}

function multimengeGleich(a, b) {
  if (a.length !== b.length) return false;
  const x = [...a].sort();
  const y = [...b].sort();
  return x.every((v, i) => v === y[i]);
}

/** Längstes gemeinsames Präfix mit einer der Lösungsfolgen. */
function folgenPruefung(antwort, loesungen, teilweise) {
  let best = 0;
  let voll = false;
  for (const l of loesungen) {
    let k = 0;
    while (k < antwort.length && k < l.length && String(antwort[k]) === String(l[k])) k++;
    if (k > best) best = k;
    if (k === antwort.length && k === l.length) voll = true;
  }
  if (teilweise) {
    const ok = best === antwort.length;
    return { ok, rueckmeldung: { ersteFalschePosition: ok ? null : best, vollstaendig: ok && voll } };
  }
  return { ok: voll, rueckmeldung: { ersteFalschePosition: voll ? null : best } };
}

function pruefeGaps(ia, lo, a) {
  const felder = {};
  let ok = true;
  for (const [id, feld] of Object.entries(ia.felder || {})) {
    const r = feldRichtig(feld, a[id] ?? '', lo ? lo[id] : undefined);
    felder[id] = r;
    if (!r) ok = false;
  }
  return { ok, rueckmeldung: { felder } };
}

function pruefeMatch(ia, lo, a) {
  const elemente = {};
  let ok = true;
  for (const e of ia.elemente || []) {
    const r = a[e.id] !== undefined && !!lo && lo[e.id] !== undefined && String(lo[e.id]) === String(a[e.id]);
    elemente[e.id] = r;
    if (!r) ok = false;
  }
  return { ok, rueckmeldung: { elemente } };
}

function pruefeZeilen(ia, lo, a) {
  const soll = (lo && Array.isArray(lo.zeilen) ? lo.zeilen : []).map(Number);
  if (ia.mehrfach === false && a.length > 1) return { ok: false, rueckmeldung: {} };
  return { ok: mengeGleich(a, soll), rueckmeldung: {} };
}

function pruefeErgebnis(ia, lo, a) {
  const soll = (lo && Array.isArray(lo.zeilen) ? lo.zeilen : []).map((z) => JSON.stringify(z.map(F.normZelle)));
  const ist = a.map((z) => JSON.stringify(z.map(F.normZelle)));
  const mengeOk = multimengeGleich(ist, soll);
  const listeOk = mengeOk && ist.every((z, i) => z === soll[i]);
  const ok = ia.reihenfolge === true ? listeOk : mengeOk;
  const zeilenzahl = ist.length === soll.length ? 'passt' : ist.length > soll.length ? 'zu_viele' : 'zu_wenige';
  return { ok, rueckmeldung: { zeilenzahl, nurReihenfolge: ia.reihenfolge === true && mengeOk && !listeOk } };
}

/** Aufgabe in der Form, die der SQL-Prüfer aus Phase 2 erwartet (Kür K1: Schreib-Aufgabe, src/sql/schreibpruefer.js). */
function sqlAufgabe(ia, lo, abimodus) {
  if (istSchreiben(ia)) {
    return {
      schreiben: true,
      start: ia.start && typeof ia.start === 'object' ? { datenbank: ia.start.datenbank, skript: ia.start.skript } : null,
      abimodus: 'aus',
      loesung: { sql: lo && lo.sql, pruefung: lo && Array.isArray(lo.pruefung) ? lo.pruefung : [] }
    };
  }
  return {
    datenbank: ia.datenbank,
    varianten: Array.isArray(ia.varianten) ? ia.varianten : [],
    sortierung: Array.isArray(ia.sortierung) ? ia.sortierung : [],
    aliasPflicht: ia.aliasPflicht === true,
    abimodus: abimodus || ia.abimodus || 'hinweis',
    loesung: { sql: lo && lo.sql }
  };
}

async function pruefeSql(ia, lo, a, opt) {
  if (a.trim() === '') return { ok: false, rueckmeldung: { diagnose: [], zeilen: 0 } };
  if (typeof opt.sqlPruefer !== 'function') throw new Error('Kein SQL-Prüfer konfiguriert.');
  const r = await opt.sqlPruefer(sqlAufgabe(ia, lo, opt.abimodus), a);
  if (istSchreiben(ia)) {
    // Kür K1: Rückmeldung je Prüfpunkt (nur die Texte des Inhalts), Diagnose bei Abbruch des Skripts
    const diagnose = (r && Array.isArray(r.diagnose) ? r.diagnose : []).map((d) => ({ code: d.code, falle: null, text: d.text, ...(Number.isInteger(d.zeile) ? { zeile: d.zeile } : {}) }));
    const pruefpunkte = r && Array.isArray(r.pruefpunkte) ? r.pruefpunkte.map((p) => ({ text: String(p.text), ok: p.ok === true })) : null;
    return { ok: !!(r && r.ok === true), rueckmeldung: { diagnose, pruefpunkte } };
  }
  const diagnose = (r && Array.isArray(r.diagnose) ? r.diagnose : []).map((d) => ({
    code: d.code,
    falle: d.falle ?? null,
    text: d.text
  }));
  return { ok: !!(r && r.ok === true), rueckmeldung: { diagnose, zeilen: r && Number.isInteger(r.zeilen) ? r.zeilen : 0 } };
}

/**
 * Einen Teil prüfen (Antwort bereits bereinigt).
 * @returns {Promise<{ok:boolean, rueckmeldung:object}>}
 */
async function pruefeTeil(ia, lo, a, opt = {}) {
  const teilweise = !!opt.teilweise;
  switch (F.artVon(ia)) {
    case 'gaps':
      return pruefeGaps(ia, lo, a);
    case 'choice':
      return { ok: mengeGleich(a, (lo && lo.richtig) || []), rueckmeldung: {} };
    case 'order': {
      const loesungen = (lo && Array.isArray(lo.reihenfolgen) ? lo.reihenfolgen : []).filter(Array.isArray);
      return folgenPruefung(a, loesungen, teilweise);
    }
    case 'lines':
      return { ok: mengeGleich(a, (lo && lo.zeilen) || []), rueckmeldung: {} };
    case 'match':
      return pruefeMatch(ia, lo, a);
    case 'zeilen':
      return pruefeZeilen(ia, lo, a);
    case 'ergebnis':
      return pruefeErgebnis(ia, lo, a);
    case 'kernpunkte':
      return { ok: true, rueckmeldung: { bearbeitet: true, haken: a } };
    case 'sql':
      return pruefeSql(ia, lo, a, opt);
    default:
      if (M.NEUE_INTERAKTIONEN.includes(F.artVon(ia))) return M.pruefeTeil(ia, lo, a);
      throw new AntwortFehler('Unbekannte Interaktion.');
  }
}

/**
 * Ganze Aufgabe prüfen.
 * @param {object} aufgabe vollständige Aufgabe (mit loesung)
 * @param {*} antwort Einzelantwort oder (mehrteilig) Liste von Antworten
 * @param {{sqlPruefer?: Function, abimodus?: string, teilweise?: boolean, teil?: number}} [opt]
 *   sqlPruefer(aufgabe, sql) → Promise<{ ok, diagnose, zeilen }>; abimodus überschreibt den der Aufgabe (Verhör).
 * @returns {Promise<{ok:boolean, leer:boolean, rueckmeldung:object, antworten:any[]}>}
 */
async function pruefeAntwort(aufgabe, antwort, opt = {}) {
  const ts = F.teile(aufgabe);
  const mehrteilig = Array.isArray(aufgabe.interaktion);
  for (const t of ts) if (!F.INTERAKTIONEN.includes(F.artVon(t.interaktion))) throw new AntwortFehler('Unbekannte Interaktion.');

  if (opt.teilweise) {
    const t = mehrteilig ? Number(opt.teil ?? 0) : 0;
    if (!Number.isInteger(t) || t < 0 || t >= ts.length) throw new AntwortFehler('Ungültiger Teil.');
    const ia = ts[t].interaktion;
    // Bug-Hunt gestuft: Teil a) (Zeilenwahl) darf einzeln geprüft werden, bevor die späteren Teile erscheinen.
    const bugHuntTeilA = mehrteilig && t === 0 && ts.length > 1 && F.artVon(ia) === 'lines';
    if (!bugHuntTeilA && !F.schrittErlaubt(ia)) {
      throw new AntwortFehler('Schrittprüfung ist für diese Interaktion nicht vorgesehen.');
    }
    const a = bereinige(ia, antwort, aufgabe);
    const r = await pruefeTeil(ia, ts[t].loesung, a, { ...opt, teilweise: !bugHuntTeilA });
    const rueckmeldung = bugHuntTeilA ? {} : r.rueckmeldung;
    return { ok: r.ok, leer: false, teilweise: true, teil: t, rueckmeldung, antworten: [a] };
  }

  let roh;
  if (mehrteilig) {
    if (!Array.isArray(antwort)) throw new AntwortFehler('Mehrteilige Aufgabe: Antwort muss eine Liste (je Teil) sein.');
    if (antwort.length > ts.length) throw new AntwortFehler('Zu viele Teilantworten.');
    roh = ts.map((_, i) => antwort[i]);
  } else {
    roh = [antwort];
  }
  const antworten = ts.map((t, i) => bereinige(t.interaktion, roh[i], aufgabe));
  // kernpunkte-Teile tragen keine prüfbare Antwort (nur Häkchen nach dem Aufdecken, E7): leer ist eine Antwort, wenn alle
  // übrigen Teile leer sind; eine reine kernpunkte-Aufgabe ist nie leer.
  const bewertet = ts.map((t, i) => [t, i]).filter(([t]) => F.artVon(t.interaktion) !== 'kernpunkte');
  const leer = bewertet.length > 0 && bewertet.every(([t, i]) => istLeer(t.interaktion, antworten[i], t.loesung));
  const ergebnisse = [];
  for (let i = 0; i < ts.length; i++) {
    ergebnisse.push(await pruefeTeil(ts[i].interaktion, ts[i].loesung, antworten[i], { ...opt, teilweise: false }));
  }
  const ok = ergebnisse.every((r) => r.ok);
  const rueckmeldung = mehrteilig ? { teile: ergebnisse.map((r) => r.rueckmeldung) } : ergebnisse[0].rueckmeldung;
  return { ok, leer, rueckmeldung, antworten };
}

/** „Musterantwort“ eines Teils aus der Lösung (für Validator und Tests). */
function musterantwortTeil(ia, lo) {
  switch (F.artVon(ia)) {
    case 'gaps': {
      const out = {};
      for (const id of Object.keys(ia.felder || {})) {
        const v = lo ? lo[id] : undefined;
        out[id] = Array.isArray(v) ? String(v[0]) : v === undefined || v === null ? '' : String(v);
      }
      return out;
    }
    case 'choice':
      return (lo && lo.richtig) || [];
    case 'order':
      return (lo && lo.reihenfolgen && lo.reihenfolgen[0]) || [];
    case 'lines':
    case 'zeilen':
    case 'ergebnis':
      return (lo && lo.zeilen) || [];
    case 'match':
      return lo || {};
    case 'sql':
      return (lo && lo.sql) || '';
    case 'kernpunkte':
      return (ia.kernpunkte || []).length;
    default:
      if (M.NEUE_INTERAKTIONEN.includes(F.artVon(ia))) return M.musterantwortTeil(ia, lo);
      return null;
  }
}

/** Musterantwort der ganzen Aufgabe (mehrteilig: Liste je Teil). */
function musterantwort(aufgabe) {
  const m = F.teile(aufgabe).map((t) => musterantwortTeil(t.interaktion, t.loesung));
  return Array.isArray(aufgabe.interaktion) ? m : m[0];
}

/** Kurzform einer Antwort für Statistiken (max. 300 Zeichen). */
function antwortKurz(antworten) {
  try {
    const s = JSON.stringify(antworten.length === 1 ? antworten[0] : antworten);
    return s.length > 300 ? s.slice(0, 299) + '…' : s;
  } catch {
    return '';
  }
}

module.exports = {
  AntwortFehler,
  MAX_SQL,
  MAX_SKRIPT,
  bereinige,
  istLeer,
  feldRichtig,
  pruefeTeil,
  pruefeAntwort,
  sqlAufgabe,
  musterantwort,
  musterantwortTeil,
  antwortKurz
};
