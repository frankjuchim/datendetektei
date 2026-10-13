'use strict';
/*
 * Inhalte des Live-Modus (Spec §7.10, DS_PLANUNG K2, STORY §9): Live-Pool `seed/live/pool.json` (K2-L-01…20, Duell)
 * und Escape-Room-Szenario `seed/live/escape.json` (Stationen S1–S6 und gA-Ersatzstation S5g). Jede Aufgabe hat das
 * normale Aufgabenformat (docs/AUFGABENFORMAT.md §4) inkl. Lösung; geprüft wird mit src/content/pruefer.js.
 *
 * Code-Regeln der Stationen (`station.code.teile`, Ziffern werden aneinandergehängt; `stellen` füllt mit Nullen auf):
 *   anzahlZeilen            Zeilenzahl des Ergebnisses der Musterlösung (sql-Teil)
 *   zelle { zeile, spalte } Wert einer Zelle des Ergebnisses der Musterlösung (1-basiert; ganze Zahl ≥ 0)
 *   zuordnung               match-Teil: je Element (Dateireihenfolge) die Nummer der Kategorie (1-basiert)
 *   auswahl                 choice-Teil: Nummer der einzigen richtigen Option (Dateireihenfolge, 1-basiert)
 *   anzahlRichtig           choice-Teil: Anzahl der richtigen Optionen
 *   minimalerSchluessel     choice-Teil: kleinste Attributzahl unter den richtigen Optionen „(A, B)“
 *   attributeRichtig        choice-Teil: Summe der Attributzahlen aller richtigen Optionen „(A, B)“
 *   relationen              schema-Teil: Anzahl der Relationen der Musterlösung
 *   fremdschluessel         schema-Teil: Anzahl der Fremdschlüssel-Attribute der Musterlösung
 *   attribute               schema-Teil: Anzahl aller Attribute der Musterlösung
 * Ein Code hat 3–8 Ziffern (Sicherheitsprüfung F4: zwei Ziffern wären trotz Code-Bremse in ≈ 20 min erratbar).
 * `teil` (1-basiert) wählt bei mehrteiligen Aufgaben den Teil; ohne Angabe gilt der erste passende Teil.
 * Die Codes stehen nie im JSON, sie werden beim Laden aus der Lösung berechnet (SQL: Musterlösung auf der Haupt-DB,
 * im Prozess über better-sqlite3 – nur vertrauenswürdige Seed-Abfragen, nie Schüler-SQL) und verlassen den Server
 * erst, wenn ein Team die Station gelöst hat.
 *
 * ladeLiveInhalte({ verzeichnis?, datenbanken?, log? }) → { pool, escape, fehler } (fehlertolerant)
 * validiereLive({ pool, escape }, { datenbanken, sandbox, sqlPruefer }, { akten }) → { fehler, hinweise, aufgaben }
 */

const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');
const F = require('./format');

const STANDARD_VERZEICHNIS = path.join(__dirname, '..', '..', 'seed', 'live');
const POOL_ID = /^K2-L-(\d{2})$/;
const STATION_ID = /^S([1-6])(g?)$/;
const STATION_AUFGABE_ID = /^K2-S[1-6]g?$/;
const POOL_ARTEN = ['ergebnis', 'choice', 'sql'];
const CODE_QUELLEN = ['anzahlZeilen', 'zelle', 'zuordnung', 'auswahl', 'anzahlRichtig', 'minimalerSchluessel', 'attributeRichtig', 'relationen', 'fremdschluessel', 'attribute'];
const QUELLE_ART = {
  anzahlZeilen: 'sql',
  zelle: 'sql',
  zuordnung: 'match',
  auswahl: 'choice',
  anzahlRichtig: 'choice',
  minimalerSchluessel: 'choice',
  attributeRichtig: 'choice',
  relationen: 'schema',
  fremdschluessel: 'schema',
  attribute: 'schema'
};
const MAX_ZEIT_SEK = 90;
const CODE_MIN = 3;
const CODE_MAX = 8;
/** Soll-Verteilung des Pools je Akte (DS_PLANUNG K2). */
const POOL_SOLL = { 1: 4, 2: 3, 3: 4, 4: 3, 5: 3, 6: 3 };

const istObjekt = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const istText = (x) => typeof x === 'string' && x.trim() !== '';

/* ======================================================================================================== */
/* Code-Ableitung                                                                                           */
/* ======================================================================================================== */

class CodeFehler extends Error {}

/**
 * Ausführer für Musterlösungen aus dem Seed (nur lesend, im Prozess). datenbanken = ladeDatenbanken().
 * → { fuehreAus({ db, sql }) → { ok, spalten, zeilen } | { ok: false, text }, schliessen() }
 */
function direktAusfuehrer(datenbanken) {
  const offen = new Map();
  function verbindung(name) {
    if (!offen.has(name)) {
      const db = new Database(datenbanken.haupt(name));
      db.pragma('query_only = ON');
      offen.set(name, db);
    }
    return offen.get(name);
  }
  return {
    fuehreAus({ db, sql }) {
      try {
        if (!datenbanken || !datenbanken.namen.includes(db)) return { ok: false, text: `unbekannte Datenbank „${db}“` };
        const stmt = verbindung(db).prepare(sql);
        stmt.raw(true);
        const zeilen = stmt.all();
        return { ok: true, spalten: stmt.columns().map((c) => c.name), zeilen };
      } catch (e) {
        return { ok: false, text: e.message };
      }
    },
    schliessen() {
      for (const db of offen.values()) db.close();
      offen.clear();
    }
  };
}

/** Teil einer Aufgabe für eine Code-Quelle: { ia, lo } (1-basiert über teil oder der erste passende). */
function teilFuer(aufgabe, quelle, teil) {
  const ts = F.teile(aufgabe);
  const art = QUELLE_ART[quelle];
  if (teil !== undefined) {
    if (!Number.isInteger(teil) || teil < 1 || teil > ts.length) throw new CodeFehler(`teil ${teil} gibt es nicht.`);
    const t = ts[teil - 1];
    if (F.artVon(t.interaktion) !== art) throw new CodeFehler(`teil ${teil} ist keine ${art}-Interaktion (für „${quelle}“).`);
    return { ia: t.interaktion, lo: t.loesung };
  }
  const t = ts.find((x) => F.artVon(x.interaktion) === art);
  if (!t) throw new CodeFehler(`„${quelle}“ braucht eine ${art}-Interaktion.`);
  return { ia: t.interaktion, lo: t.loesung };
}

/** Attributzahl einer Schlüssel-Option „(A, B)“ bzw. „A“. */
function attributZahl(option) {
  const text = String(option.code || option.md || '')
    .replace(/[`*]/g, '')
    .replace(/^.*?:\s*/, '');
  const m = /\(([^()]*)\)/.exec(text);
  const innen = m ? m[1] : text;
  return innen.split(',').map((s) => s.trim()).filter(Boolean).length;
}

/** Wert eines Code-Teils (ganze Zahl ≥ 0 bzw. Ziffernfolge). */
function teilWert(aufgabe, t, fuehreAus) {
  const { ia, lo } = teilFuer(aufgabe, t.quelle, t.teil);
  switch (t.quelle) {
    case 'anzahlZeilen':
    case 'zelle': {
      if (typeof fuehreAus !== 'function') throw new CodeFehler('keine Datenbank zum Ausführen der Musterlösung.');
      const e = fuehreAus({ db: ia.datenbank, sql: lo.sql });
      if (!e || !e.ok) throw new CodeFehler(`Musterlösung nicht ausführbar (${(e && e.text) || 'Fehler'}).`);
      if (t.quelle === 'anzahlZeilen') return String(e.zeilen.length);
      const z = e.zeilen[(t.zeile || 1) - 1];
      if (!z) throw new CodeFehler(`Zeile ${t.zeile || 1} gibt es im Ergebnis nicht.`);
      const w = z[(t.spalte || 1) - 1];
      if (!Number.isInteger(w) || w < 0) throw new CodeFehler(`Zelle (${t.zeile || 1}, ${t.spalte || 1}) ist keine ganze Zahl ≥ 0.`);
      return String(w);
    }
    case 'zuordnung': {
      const kat = (ia.kategorien || []).map((k) => k.id);
      if (kat.length > 9) throw new CodeFehler('zuordnung: höchstens 9 Kategorien (eine Ziffer je Element).');
      return (ia.elemente || [])
        .map((e) => {
          const i = kat.indexOf(lo[e.id]);
          if (i < 0) throw new CodeFehler(`zuordnung: Element ${e.id} hat keine Kategorie.`);
          return String(i + 1);
        })
        .join('');
    }
    case 'auswahl': {
      const r = (lo && lo.richtig) || [];
      if (r.length !== 1) throw new CodeFehler('auswahl braucht genau eine richtige Option.');
      const i = (ia.optionen || []).findIndex((o) => o.id === r[0]);
      if (i < 0 || i > 8) throw new CodeFehler('auswahl: richtige Option nicht unter den ersten neun.');
      return String(i + 1);
    }
    case 'anzahlRichtig':
      return String(((lo && lo.richtig) || []).length);
    case 'minimalerSchluessel':
    case 'attributeRichtig': {
      const r = new Set((lo && lo.richtig) || []);
      const zahlen = (ia.optionen || []).filter((o) => r.has(o.id)).map(attributZahl);
      if (!zahlen.length || zahlen.some((n) => n < 1)) throw new CodeFehler(`${t.quelle}: keine Attribute in den richtigen Optionen.`);
      return String(t.quelle === 'minimalerSchluessel' ? Math.min(...zahlen) : zahlen.reduce((s, n) => s + n, 0));
    }
    case 'relationen':
    case 'fremdschluessel':
    case 'attribute': {
      const werte = ((lo && lo.muster) || []).map((m) => {
        const rel = Array.isArray(m) ? m : istObjekt(m) && Array.isArray(m.relationen) ? m.relationen : [];
        if (t.quelle === 'relationen') return rel.length;
        if (t.quelle === 'attribute') return rel.reduce((s, r) => s + (r.attribute || []).length, 0);
        return rel.reduce((s, r) => s + (r.attribute || []).filter((a) => a.fk).length, 0);
      });
      if (!werte.length) throw new CodeFehler(`${t.quelle}: Musterlösung fehlt.`);
      if (new Set(werte).size > 1) throw new CodeFehler(`${t.quelle}: Die Musterlösungen ergeben verschiedene Werte (${werte.join(', ')}) – der Code wäre nicht eindeutig.`);
      return String(werte[0]);
    }
    default:
      throw new CodeFehler(`unbekannte Code-Quelle „${t.quelle}“.`);
  }
}

/**
 * Code einer Station aus ihrer Musterlösung.
 * @param {{ code: { teile }, aufgabe }} station
 * @param {(job: { db, sql }) => { ok, zeilen }} fuehreAus
 * @returns {string} Ziffernfolge (wirft CodeFehler)
 */
function berechneCode(station, fuehreAus) {
  const teile = istObjekt(station.code) && Array.isArray(station.code.teile) ? station.code.teile : [];
  if (!teile.length) throw new CodeFehler('code.teile fehlt.');
  let code = '';
  for (const t of teile) {
    if (!istObjekt(t) || !CODE_QUELLEN.includes(t.quelle)) throw new CodeFehler(`unbekannte Code-Quelle ${JSON.stringify(t && t.quelle)}.`);
    let w = teilWert(station.aufgabe, t, fuehreAus);
    if (t.stellen !== undefined) {
      if (!Number.isInteger(t.stellen) || t.stellen < 1 || t.stellen > CODE_MAX) throw new CodeFehler('stellen muss 1–8 sein.');
      if (w.length > t.stellen) throw new CodeFehler(`Wert ${w} hat mehr als ${t.stellen} Stellen.`);
      w = w.padStart(t.stellen, '0');
    }
    code += w;
  }
  if (!/^\d+$/.test(code) || code.length < CODE_MIN || code.length > CODE_MAX) {
    throw new CodeFehler(`Code muss ${CODE_MIN}–${CODE_MAX} Ziffern haben (berechnet: ${code.length}).`);
  }
  return code;
}

/** Eingegebenen Code vergleichbar machen (Leerzeichen, Bindestriche weg). */
function normCode(eingabe) {
  return String(eingabe == null ? '' : eingabe).replace(/[\s\-–.]/g, '');
}

/* ======================================================================================================== */
/* Laden (Laufzeit)                                                                                         */
/* ======================================================================================================== */

function liesJson(datei) {
  let text = fs.readFileSync(datei, 'utf8');
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  return JSON.parse(text);
}

/** Niveau einer Station: alle | eA | gA. */
const stationNiveau = (s) => (['eA', 'gA'].includes(s.niveau) ? s.niveau : 'alle');

/** Stationen in der Reihenfolge für ein Kurs-Niveau (eA: S5, gA: S5g). */
function stationenFuer(escape, niveau) {
  return escape.stationen.filter((s) => s.niveau === 'alle' || s.niveau === niveau).sort((a, b) => a.nr - b.nr);
}

/**
 * Live-Inhalte laden (fehlertolerant: fehlerhafte Aufgaben/Stationen werden ausgelassen, Fehler im Bericht).
 * Mit datenbanken werden die Codes berechnet; ohne bleiben sie null (dann ist der Escape Room nicht startbar).
 */
function ladeLiveInhalte({ verzeichnis = STANDARD_VERZEICHNIS, datenbanken = null, log = () => {} } = {}) {
  const fehler = [];
  const pool = new Map();
  let escape = null;
  try {
    const d = liesJson(path.join(verzeichnis, 'pool.json'));
    for (const a of Array.isArray(d.aufgaben) ? d.aufgaben : []) {
      if (!istObjekt(a) || !POOL_ID.test(String(a.id)) || !Array.isArray(a.inhalt) || a.loesung === undefined) {
        fehler.push(`pool.json: Aufgabe ${istObjekt(a) ? a.id : '?'} ausgelassen.`);
        continue;
      }
      const zeitSek = Number.isInteger(a.zeitSek) ? Math.min(MAX_ZEIT_SEK, Math.max(10, a.zeitSek)) : 60;
      pool.set(a.id, { ...a, zeitSek, niveau: a.niveau === 'eA' ? 'eA' : 'alle' });
    }
  } catch (e) {
    fehler.push(`pool.json: ${e.code === 'ENOENT' ? 'Datei nicht gefunden' : 'nicht lesbar'}.`);
  }
  let ausfuehrer = null;
  try {
    const d = liesJson(path.join(verzeichnis, 'escape.json'));
    ausfuehrer = datenbanken ? direktAusfuehrer(datenbanken) : null;
    const stationen = [];
    for (const s of Array.isArray(d.stationen) ? d.stationen : []) {
      if (!istObjekt(s) || !STATION_ID.test(String(s.id)) || !istObjekt(s.aufgabe) || !Number.isInteger(s.nr)) {
        fehler.push(`escape.json: Station ${istObjekt(s) ? s.id : '?'} ausgelassen.`);
        continue;
      }
      let code = null;
      if (ausfuehrer) {
        try {
          code = berechneCode(s, ausfuehrer.fuehreAus);
        } catch (e) {
          fehler.push(`escape.json: Station ${s.id}: ${e.message}`);
        }
      }
      stationen.push({ ...s, niveau: stationNiveau(s), code });
    }
    escape = {
      titel: istText(d.titel) ? d.titel : 'Escape Room',
      briefing: typeof d.briefing === 'string' ? d.briefing : '',
      abschluss: typeof d.abschluss === 'string' ? d.abschluss : '',
      dauerMin: Number.isInteger(d.dauerMin) ? d.dauerMin : 55,
      tippNachMin: Number.isInteger(d.tippNachMin) ? d.tippNachMin : 10,
      tippStrafeMin: Number.isInteger(d.tippStrafeMin) ? d.tippStrafeMin : 2,
      stationen,
      // startbar, wenn beide Wege vollständig sind und alle Codes bekannt
      startbar: ['eA', 'gA'].every((n) => {
        const st = stationen.filter((s) => s.niveau === 'alle' || s.niveau === n);
        return st.length > 0 && st.every((s) => typeof s.code === 'string');
      })
    };
  } catch (e) {
    fehler.push(`escape.json: ${e.code === 'ENOENT' ? 'Datei nicht gefunden' : 'nicht lesbar'}.`);
  } finally {
    if (ausfuehrer) ausfuehrer.schliessen();
  }
  for (const f of fehler) log(`Live-Inhalte: ${f}`);
  log(`Live-Inhalte: ${pool.size} Pool-Aufgaben, ${escape ? escape.stationen.length : 0} Escape-Stationen.`);
  return { pool, escape, fehler };
}

/* ======================================================================================================== */
/* Validierung (npm run validate)                                                                           */
/* ======================================================================================================== */

const normKopie = (s) => String(s).normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase();
const KOPIE_MIN = 20;

function alleTexte(wert, out = []) {
  if (typeof wert === 'string') out.push(wert);
  else if (Array.isArray(wert)) wert.forEach((w) => alleTexte(w, out));
  else if (istObjekt(wert)) Object.values(wert).forEach((w) => alleTexte(w, out));
  return out;
}

/** Texte, an denen eine Kopie aus den Akten zu erkennen wäre (Titel, Inhalt, Interaktion, Lösung, Erklärung). */
function aufgabenTexte(a) {
  return alleTexte([a.titel, a.inhalt, a.interaktion, a.loesung, a.erklaerung]).filter((t) => t.trim().length >= KOPIE_MIN);
}

/** Öffentliche Sicht einer Live-Aufgabe (ohne Lösung, Tipps, Erklärung) – wie sie der Browser bekommt. */
function oeffentlicheAufgabe(a) {
  const { oeffentlicherBlock, oeffentlicheInteraktion } = require('../services/inhalte');
  return {
    id: a.id,
    titel: a.titel,
    stufe: a.stufe,
    kategorie: a.kategorie,
    fallen: Array.isArray(a.fallen) ? [...a.fallen] : [],
    inhalt: (a.inhalt || []).map(oeffentlicherBlock),
    interaktion: Array.isArray(a.interaktion) ? a.interaktion.map((ia) => oeffentlicheInteraktion(ia, 'live')) : oeffentlicheInteraktion(a.interaktion, 'live')
  };
}

function parse(data, datei, fd) {
  if (typeof data !== 'string') return data;
  try {
    return JSON.parse(data.charCodeAt(0) === 0xfeff ? data.slice(1) : data);
  } catch (e) {
    fd(datei, `Kein gültiges JSON: ${e.message}`);
    return null;
  }
}

/**
 * Live-Pool und Escape-Room prüfen: eigene Struktur, Aufgaben wie Akten-Aufgaben (intern als Test-Akte welt 9 mit
 * den Ermittlungen A9-E1 = Pool und A9-E2 = Stationen, inkl. SQL in der Sandbox), kein Text aus den Akten (Transfer,
 * DS_PLANUNG K2), Codes berechenbar, eindeutig, verschieden und nicht in der öffentlichen Sicht.
 * @param {{ pool?: object|string, escape?: object|string }} dateien Inhalte von pool.json und escape.json
 * @param {{ datenbanken, sandbox, sqlPruefer }} umgebung wie validiereAkten
 * @param {{ akten?: {name, json}[] }} [opt]
 */
async function validiereLive(dateien, umgebung, { akten = [] } = {}) {
  const { validiereAkten } = require('./validator');
  const fehler = [];
  const hinweise = [];
  const fd = (datei, text, id) => fehler.push(id ? { datei, id, text } : { datei, text });
  const hd = (datei, text, id) => hinweise.push(id ? { datei, id, text } : { datei, text });
  const P = 'live/pool.json';
  const E = 'live/escape.json';
  const zuordnung = new Map(); // Live-id → Test-id
  const datei = new Map(); // Test-id → Datei
  const testAufgaben = [];
  const levels = [];

  /* ---------- Pool ---------- */
  const pool = parse(dateien.pool, P, fd);
  if (dateien.pool !== undefined && pool !== null) {
    if (!istObjekt(pool) || pool.version !== 1 || !Array.isArray(pool.aufgaben)) {
      fd(P, 'Die Datei muss { "version": 1, "titel": …, "aufgaben": […] } enthalten.');
    } else {
      if (!istText(pool.titel)) fd(P, 'titel fehlt.');
      const jeAkte = {};
      const ids = new Set();
      pool.aufgaben.forEach((a, i) => {
        const id = istObjekt(a) && typeof a.id === 'string' ? a.id : '';
        const m = POOL_ID.exec(id);
        if (!m) return fd(P, `aufgaben[${i}]: id „${id}“ hat nicht das Format K2-L-<nn>.`);
        if (ids.has(id)) return fd(P, `id „${id}“ kommt doppelt vor.`, id);
        ids.add(id);
        if (!Number.isInteger(a.akte) || a.akte < 1 || a.akte > 6) fd(P, 'akte muss 1–6 sein (die Akte, die die Aufgabe wiederholt).', id);
        else jeAkte[a.akte] = (jeAkte[a.akte] || 0) + 1;
        if (!Number.isInteger(a.zeitSek) || a.zeitSek < 10 || a.zeitSek > MAX_ZEIT_SEK) fd(P, `zeitSek muss eine ganze Zahl 10–${MAX_ZEIT_SEK} sein (kurze Bearbeitungszeit).`, id);
        for (const t of F.teile(a)) if (!POOL_ARTEN.includes(F.artVon(t.interaktion))) fd(P, `Interaktion „${F.artVon(t.interaktion)}“ – im Live-Pool nur ${POOL_ARTEN.join(', ')}.`, id);
        if (a.akte === 5 && a.niveau !== 'eA') fd(P, 'Aufgaben zu Akte 5 sind nur eA: niveau "eA" angeben.', id);
        const tid = `A9-E1-${m[1]}`;
        zuordnung.set(id, tid);
        datei.set(tid, P);
        testAufgaben.push({ ...a, id: tid, akte: undefined, zeitSek: undefined });
      });
      if (ids.size) levels.push({ id: 'A9-E1', titel: 'Live-Pool', aufgaben: pool.aufgaben.filter((a) => zuordnung.has(a && a.id)).map((a) => zuordnung.get(a.id)) });
      for (const [akte, soll] of Object.entries(POOL_SOLL)) {
        if ((jeAkte[akte] || 0) !== soll) hd(P, `Akte ${akte}: ${jeAkte[akte] || 0} Aufgaben (DS_PLANUNG K2: ${soll}).`);
      }
    }
  }

  /* ---------- Escape Room ---------- */
  const escape = parse(dateien.escape, E, fd);
  const stationen = [];
  if (dateien.escape !== undefined && escape !== null) {
    if (!istObjekt(escape) || escape.version !== 1 || !Array.isArray(escape.stationen)) {
      fd(E, 'Die Datei muss { "version": 1, "titel": …, "stationen": […] } enthalten.');
    } else {
      if (!istText(escape.titel)) fd(E, 'titel fehlt.');
      for (const feld of ['briefing', 'abschluss']) {
        if (!istText(escape[feld])) fd(E, `${feld} fehlt.`);
        else F.pruefeMarkdown(escape[feld]).forEach((x) => fd(E, `${feld}: ${x}`));
      }
      const zahl = (feld, min, max) => {
        if (!Number.isInteger(escape[feld]) || escape[feld] < min || escape[feld] > max) fd(E, `${feld} muss eine ganze Zahl ${min}–${max} sein.`);
      };
      zahl('dauerMin', 10, 120);
      zahl('tippNachMin', 0, 60);
      zahl('tippStrafeMin', 0, 10);
      const ids = new Set();
      let n = 0;
      escape.stationen.forEach((s, i) => {
        const sid = istObjekt(s) && typeof s.id === 'string' ? s.id : '';
        const m = STATION_ID.exec(sid);
        if (!m) return fd(E, `stationen[${i}]: id „${sid}“ hat nicht das Format S<1–6> bzw. S5g.`);
        if (ids.has(sid)) return fd(E, `Station ${sid} kommt doppelt vor.`, sid);
        ids.add(sid);
        if (s.nr !== Number(m[1])) fd(E, `nr muss ${m[1]} sein.`, sid);
        if (!istText(s.titel)) fd(E, 'titel fehlt.', sid);
        if (!istText(s.story)) fd(E, 'story fehlt.', sid);
        else F.pruefeMarkdown(s.story).forEach((x) => fd(E, `story: ${x}`, sid));
        if (!['alle', 'eA', 'gA'].includes(s.niveau)) fd(E, 'niveau muss alle, eA oder gA sein.', sid);
        if (m[2] === 'g' && s.niveau !== 'gA') fd(E, 'Die Ersatzstation S5g hat niveau "gA".', sid);
        if (!istObjekt(s.aufgabe)) return fd(E, 'aufgabe fehlt.', sid);
        const a = s.aufgabe;
        if (!STATION_AUFGABE_ID.test(String(a.id)) || a.id !== `K2-${sid}`) fd(E, `aufgabe.id muss „K2-${sid}“ sein.`, sid);
        if (!Array.isArray(a.tipps) || a.tipps.length !== 1) fd(E, 'Der Tipp-Umschlag braucht genau einen Tipp (aufgabe.tipps).', sid);
        if (!istObjekt(s.code) || !Array.isArray(s.code.teile) || !s.code.teile.length) fd(E, 'code.teile (Regel für den Code) fehlt.', sid);
        n++;
        const tid = `A9-E2-${String(n).padStart(2, '0')}`;
        zuordnung.set(String(a.id), tid);
        datei.set(tid, E);
        const niveau = s.niveau === 'eA' ? { niveau: 'eA' } : {};
        testAufgaben.push({ ...a, ...niveau, id: tid });
        stationen.push({ station: s, tid });
      });
      // beide Wege vollständig: Stationen 1–6 in Reihenfolge
      for (const niveau of ['eA', 'gA']) {
        const nrn = escape.stationen.filter((s) => istObjekt(s) && (s.niveau === 'alle' || s.niveau === niveau)).map((s) => s.nr);
        if (nrn.join(',') !== '1,2,3,4,5,6') fd(E, `${niveau}-Weg: Stationen müssen genau 1–6 in Reihenfolge sein (gefunden: ${nrn.join(', ') || 'keine'}).`);
      }
      if (stationen.length) levels.push({ id: 'A9-E2', titel: 'Escape Room', aufgaben: stationen.map((x) => x.tid) });
    }
  }

  /* ---------- Abgleich mit den Akten: Transfer, keine Kopie ---------- */
  const aktenTexte = new Map();
  for (const d of akten) {
    let json = d.json;
    if (typeof json === 'string') {
      try {
        json = JSON.parse(json);
      } catch {
        continue;
      }
    }
    for (const a of istObjekt(json) && Array.isArray(json.aufgaben) ? json.aufgaben : []) {
      if (!istObjekt(a)) continue;
      for (const t of aufgabenTexte(a)) aktenTexte.set(normKopie(t), a.id);
    }
  }
  const zurueck = new Map([...zuordnung].map(([l, t]) => [t, l]));
  for (const a of testAufgaben) {
    const lid = zurueck.get(a.id);
    for (const t of aufgabenTexte(a)) {
      const quelle = aktenTexte.get(normKopie(t));
      if (quelle) fd(datei.get(a.id), `Text stammt aus einer Akte (${quelle}): „${t.slice(0, 60)}…“ – Live-Aufgaben sind Transferaufgaben.`, lid);
    }
  }

  /* ---------- Aufgaben wie Akten-Aufgaben (Test-Akte welt 9) ---------- */
  if (testAufgaben.length) {
    const akte = { version: 2, welt: 9, titel: 'Live-Modus', farbe: '#B08D3C', levels, aufgaben: testAufgaben };
    const r = await validiereAkten([{ name: 'live', json: akte }], umgebung);
    const uebersetze = (x) => {
      let text = x.text;
      for (const [t, l] of zurueck) text = text.split(t).join(l);
      text = text.split('Ermittlung A9-E1').join('Live-Pool').split('Ermittlung A9-E2').join('Escape Room');
      const out = { datei: (x.id && datei.get(x.id)) || 'live', text };
      if (x.id && zurueck.has(x.id)) out.id = zurueck.get(x.id);
      return out;
    };
    for (const x of r.fehler) fehler.push(uebersetze(x));
    for (const x of r.hinweise) if (!/welt 9/.test(x.text)) hinweise.push(uebersetze(x));
  }

  /* ---------- Codes ---------- */
  if (stationen.length && umgebung.datenbanken) {
    const ausfuehrer = direktAusfuehrer(umgebung.datenbanken);
    const codes = new Map();
    try {
      for (const { station: s } of stationen) {
        let code;
        try {
          code = berechneCode(s, ausfuehrer.fuehreAus);
        } catch (e) {
          fd(E, `Code nicht ableitbar: ${e.message}`, s.id);
          continue;
        }
        if (codes.has(code)) fd(E, `Code ${code} ist auch der Code von ${codes.get(code)} – jede Station braucht einen eigenen Code.`, s.id);
        codes.set(code, s.id);
        // Zellen-Codes brauchen ein eindeutiges erstes Ergebnis: sortierung bzw. LIMIT, kein Gleichstand vorn
        for (const t of s.code.teile) {
          if (t.quelle !== 'zelle') continue;
          const { ia, lo } = teilFuer(s.aufgabe, 'zelle', t.teil);
          const e = ausfuehrer.fuehreAus({ db: ia.datenbank, sql: lo.sql });
          if (!e.ok || e.zeilen.length < 2) continue;
          const sort = Array.isArray(ia.sortierung) ? ia.sortierung : [];
          if (!sort.length) {
            fd(E, 'Der Code nutzt eine Zelle eines mehrzeiligen Ergebnisses – die sql-Interaktion braucht dann eine sortierung.', s.id);
            continue;
          }
          const idx = sort.map((x) => (Number.isInteger(x.spalte) ? x.spalte - 1 : e.spalten.findIndex((c) => c.toLowerCase() === String(x.spalte).toLowerCase())));
          const z = (t.zeile || 1) - 1;
          const nachbarn = [e.zeilen[z - 1], e.zeilen[z + 1]].filter(Boolean);
          if (nachbarn.some((nb) => idx.every((i) => i >= 0 && F.normZelle(nb[i]) === F.normZelle(e.zeilen[z][i])))) {
            fd(E, `Gleichstand im Sortierschlüssel an Zeile ${t.zeile || 1} – die Zelle für den Code wäre nicht eindeutig.`, s.id);
          }
        }
        // der Code steht nie in der öffentlichen Sicht (ab 3 Ziffern prüfbar)
        if (code.length >= 3 && JSON.stringify(oeffentlicheAufgabe(s.aufgabe)).includes(code)) {
          fd(E, `Der Code ${code} steht in der öffentlichen Sicht der Aufgabe (Text, Tabelle, Optionen).`, s.id);
        }
        if (code.length >= 3 && [s.titel, s.story].some((x) => String(x).includes(code))) fd(E, `Der Code ${code} steht in titel/story der Station.`, s.id);
      }
    } finally {
      ausfuehrer.schliessen();
    }
  }

  return { fehler, hinweise, aufgaben: testAufgaben.length };
}

module.exports = {
  STANDARD_VERZEICHNIS,
  CODE_QUELLEN,
  MAX_ZEIT_SEK,
  CodeFehler,
  berechneCode,
  normCode,
  direktAusfuehrer,
  ladeLiveInhalte,
  stationenFuer,
  oeffentlicheAufgabe,
  validiereLive
};
