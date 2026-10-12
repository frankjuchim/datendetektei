'use strict';
// Hilfsfunktionen rund um das Aufgabenformat (docs/AUFGABENFORMAT.md): Listen der Blöcke und Interaktionen, Lücken
// [[id]] finden, Mini-Markdown prüfen, Eingaben normalisieren. Rein, ohne Abhängigkeiten (Muster: Algo Quest
// src/content/format.js, auf unsere Blöcke und Interaktionen übertragen).

const LUECKE_RE = /\[\[([A-Za-z0-9_-]{1,40})\]\]/g;

const BLOCK_TYPEN = ['text', 'hinweis', 'code', 'tabelle', 'dbtabelle', 'schema', 'sql', 'datenbank'];
/** Blöcke, die erst in Phase 5 gebaut werden (Validator lehnt sie bis dahin ab). */
const BLOCK_TYPEN_PHASE5 = ['er', 'mengen'];

const INTERAKTIONEN = ['gaps', 'choice', 'order', 'lines', 'match', 'sql', 'zeilen', 'ergebnis', 'kernpunkte'];
/** Interaktionen, die erst in Phase 5 gebaut werden. */
const INTERAKTIONEN_PHASE5 = ['zellen', 'anomalie', 'zerlegen', 'schema', 'er'];
/** Interaktionen, für die eine Schrittprüfung (teilweise: true) erlaubt ist. */
const SCHRITT_ARTEN = ['order'];

const KATEGORIEN = [
  'Relationales Modell', 'Schlüssel', 'Anomalien', 'SQL eine Tabelle', 'SQL Verbund', 'SQL Aggregation',
  'Abfrage analysieren', 'ER-Modell', 'Überführung', 'Datenschutz'
];
const FALLEN = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10'];
const VARIANTEN = ['null', 'gleichnamig', 'grenze', 'gleichstand', 'leer'];
const ABIMODI = ['streng', 'hinweis', 'aus'];
const NIVEAUS = ['alle', 'eA'];
const MARKIER_FARBEN = ['gold', 'rot', 'gruen', 'blau', 'grau'];
/** Öffentliche Übungs-DBs (Block `datenbank`). */
const UEBUNGS_DBS = ['fundbuero', 'stadtrad', 'stadtfest', 'tus', 'detektei', 'datenspuren', 'eisdiele'];

function artVon(ia) {
  if (!ia || typeof ia !== 'object') return '';
  return typeof ia.kind === 'string' ? ia.kind : '';
}

function schrittErlaubt(ia) {
  return SCHRITT_ARTEN.includes(artVon(ia));
}

/** Interaktion(en) einer Aufgabe immer als Liste (mehrteilige Aufgaben = Array). */
function teile(aufgabe) {
  const ia = aufgabe.interaktion;
  const lo = aufgabe.loesung;
  if (Array.isArray(ia)) return ia.map((x, i) => ({ interaktion: x, loesung: Array.isArray(lo) ? lo[i] : undefined }));
  return [{ interaktion: ia, loesung: lo }];
}

/** Alle Texte eines Blocks, in denen Lücken [[id]] stehen dürfen. */
function blockTexte(b) {
  const out = [];
  if (!b || typeof b !== 'object') return out;
  const push = (v) => {
    if (typeof v === 'string') out.push(v);
    else if (typeof v === 'number') out.push(String(v));
  };
  const zeilen = (z) => (Array.isArray(z) ? z : []).forEach((r) => (Array.isArray(r) ? r.forEach(push) : null));
  switch (b.t) {
    case 'text':
    case 'hinweis':
      push(b.md);
      break;
    case 'code':
      push(b.code);
      break;
    case 'sql':
      push(b.sql);
      break;
    case 'tabelle':
      (Array.isArray(b.kopf) ? b.kopf : []).forEach(push);
      zeilen(b.zeilen);
      break;
    case 'dbtabelle':
      zeilen(b.zeilen);
      break;
    case 'schema':
      for (const r of Array.isArray(b.relationen) ? b.relationen : []) {
        if (!r || typeof r !== 'object') continue;
        push(r.name);
        for (const at of Array.isArray(r.attribute) ? r.attribute : []) if (at && typeof at === 'object') push(at.name);
      }
      break;
    default:
      break;
  }
  return out;
}

/** Lücken-IDs in einer Blockliste (mit Blockindex). */
function luecken(bloecke) {
  const res = [];
  (Array.isArray(bloecke) ? bloecke : []).forEach((b, i) => {
    for (const s of blockTexte(b)) for (const m of s.matchAll(LUECKE_RE)) res.push({ id: m[1], block: i });
  });
  return res;
}

/** Alle Lücken einer Aufgabe: im Inhalt und in optionalen Teil-Inhalten/-Fragen. */
function alleLuecken(aufgabe) {
  const res = luecken(aufgabe.inhalt).map((x) => ({ ...x, ort: 'inhalt' }));
  const ias = Array.isArray(aufgabe.interaktion) ? aufgabe.interaktion : [aufgabe.interaktion];
  ias.forEach((ia, t) => {
    if (!ia || typeof ia !== 'object') return;
    if (Array.isArray(ia.inhalt)) for (const x of luecken(ia.inhalt)) res.push({ ...x, ort: `teil${t}` });
    if (typeof ia.frage === 'string') {
      for (const m of ia.frage.matchAll(LUECKE_RE)) res.push({ id: m[1], block: -1, ort: `teil${t}` });
    }
  });
  return res;
}

/* ---------- Mini-Markdown ---------- */

/**
 * Prüft einen Mini-Markdown-Text (docs/AUFGABENFORMAT.md §5): ausgeglichene `…`, **…** und *…*, keine HTML-Tags.
 * Liefert eine Liste deutscher Fehlertexte (leer = in Ordnung).
 */
function pruefeMarkdown(md) {
  const fehler = [];
  if (typeof md !== 'string') return ['Text fehlt.'];
  const backticks = (md.match(/`/g) || []).length;
  if (backticks % 2 !== 0) fehler.push('Ungerade Zahl von ` (Code nicht geschlossen).');
  const ohneCode = backticks % 2 === 0 ? md.replace(/`[^`]*`/g, '') : md;
  if (/<\/?[A-Za-z][A-Za-z0-9]*(\s[^<>]*)?\/?>/.test(ohneCode)) fehler.push('HTML-Tags werden nicht dargestellt.');
  const ohneListen = ohneCode.replace(/^[ \t]*[-*][ \t]+/gm, '');
  const fett = (ohneListen.match(/\*\*/g) || []).length;
  if (fett % 2 !== 0) fehler.push('Ungerade Zahl von ** (fett nicht geschlossen).');
  const einzeln = (ohneListen.replace(/\*\*/g, '').match(/\*/g) || []).length;
  if (einzeln % 2 !== 0) fehler.push('Ungerade Zahl von * (kursiv nicht geschlossen).');
  return fehler;
}

/* ---------- Normalisierung von Texteingaben ---------- */

/** Typografische Zeichen vereinheitlichen (iPad-Tastatur setzt „smarte“ Anführungszeichen usw.; wie Algo Quest). */
function vereinheitliche(s) {
  return String(s)
    .normalize('NFC')
    .replace(/[“”„‟«»″]/g, '"')
    .replace(/[‘’‚‛′´`]/g, "'")
    .replace(/[−–—]/g, '-')
    .replace(/ /g, ' ')
    .replace(/<-/g, '←')
    .replace(/≤/g, '<=')
    .replace(/≥/g, '>=')
    .replace(/≠/g, '!=');
}

function normText(s, norm) {
  const v = String(s);
  switch (norm) {
    case 'exakt':
      return v.trim();
    case 'text':
      return vereinheitliche(v).trim().replace(/\s+/g, ' ').toLowerCase();
    case 'code':
    default:
      return vereinheitliche(v).replace(/\s+/g, '');
  }
}

/** Zahl aus Eingabe (Komma = Punkt), sonst NaN. */
function alsZahl(s) {
  if (typeof s === 'number') return s;
  const t = vereinheitliche(String(s)).trim().replace(/\s+/g, '').replace(',', '.');
  if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(t)) return NaN;
  return Number(t);
}

/**
 * Zelle einer Ergebnistabelle vergleichbar machen (wie der SQL-Prüfer, Spec §7.4): leer/„NULL“ = NULL, Zahlen auf
 * 1e-6 gerundet, Text NFC-normalisiert, getrimmt, Leerraum zusammengefasst, äußere Hochkommata entfernt.
 * Liefert einen Schlüssel-String.
 */
function normZelle(v) {
  if (v === null || v === undefined) return '∅';
  if (typeof v === 'number') return Number.isFinite(v) ? `z:${rundeZahl(v)}` : `t:${String(v)}`;
  let s = String(v).normalize('NFC').trim().replace(/\s+/g, ' ');
  if (s === '' || s.toUpperCase() === 'NULL') return '∅';
  const z = alsZahl(s);
  if (Number.isFinite(z)) return `z:${rundeZahl(z)}`;
  const m = /^(['"‘’‚“”„])(.*)(['"‘’“”])$/.exec(s);
  if (m && s.length >= 2) s = m[2].trim();
  return `t:${s}`;
}

function rundeZahl(x) {
  const r = Math.round(x * 1e6) / 1e6;
  return Object.is(r, -0) ? 0 : r;
}

module.exports = {
  LUECKE_RE,
  BLOCK_TYPEN,
  BLOCK_TYPEN_PHASE5,
  INTERAKTIONEN,
  INTERAKTIONEN_PHASE5,
  SCHRITT_ARTEN,
  KATEGORIEN,
  FALLEN,
  VARIANTEN,
  ABIMODI,
  NIVEAUS,
  MARKIER_FARBEN,
  UEBUNGS_DBS,
  artVon,
  schrittErlaubt,
  teile,
  blockTexte,
  luecken,
  alleLuecken,
  pruefeMarkdown,
  vereinheitliche,
  normText,
  alsZahl,
  normZelle
};
