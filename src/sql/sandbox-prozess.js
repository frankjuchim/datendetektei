'use strict';
/*
 * Datendetektei – Kindprozess der SQL-Sandbox (Spec §7.4, §18). Gestartet von src/sql/sandbox.js per
 * child_process.fork, ohne Umgebungsvariablen außer NODE_ENV und ohne Dateipfade: Die Datenbanken kommen
 * nur als Buffer über IPC. Der Elternprozess beendet diesen Prozess bei Zeitüberschreitung mit SIGKILL.
 *
 * Nachrichten vom Elternprozess:
 *   { typ: 'start', datenbanken: { <name>: { haupt: Buffer, varianten: { <typ>: Buffer } } }, maxZeilen }
 *   { typ: 'abfrage', id, db, variante, sql }
 * Antworten:
 *   { typ: 'bereit' }
 *   { typ: 'ergebnis', id, ergebnis: { ok: true, spalten, zeilen, anzahl, abgeschnitten, ms } | { ok: false, code, text } }
 *
 * Je Abfrage eine frische In-Memory-Kopie (new Database(buffer)); Messung: < 0,2 ms je Kopie bei den
 * vorhandenen DBs. So kann auch ein unerwarteter Schreibweg nie in die nächste Abfrage durchschlagen.
 *
 * Kür K1 (Schreibmodus): { typ: 'skript', id, start: null | { datenbank } | { skript }, anweisungen: [{ sql, zeile }],
 * pruefungen } – frische DB (':memory:' bzw. Kopie des Buffers), foreign_keys an, max_page_count, Anweisungen einzeln
 * mit Grenzprüfung nach jeder schreibenden Anweisung, danach Prüfabfragen mit query_only. Die DB wird immer
 * geschlossen; es entstehen keine Dateien (ATTACH/VACUUM/PRAGMA/TEMP weist schon der Elternprozess ab).
 */

const Database = require('better-sqlite3');
const { schemaVonDb, bezeichner } = require('./schema');

let datenbanken = Object.create(null);
let maxZeilen = 5000;
let grenzen = { tabellen: 20, zeilen: 500, bytes: 1024 * 1024 };
const MAX_PRUEF_ZEILEN = 1000;
// Speicher (Review PR #6): SQLite darf im Kindprozess höchstens 64 MB Heap belegen (gilt prozessweit, auch für
// zeroblob/randomblob und Zeichenketten aus rekursiven CTEs); ein Ergebnis höchstens 4 MB (grob geschätzt).
const HEAP_LIMIT_BYTES = 64 * 1024 * 1024;
const MAX_ERGEBNIS_BYTES = 4 * 1024 * 1024;
const ZU_GROSS_TEXT = 'Ergebnis zu groß';
{
  const d = new Database(':memory:');
  d.pragma(`hard_heap_limit = ${HEAP_LIMIT_BYTES}`);
  d.close();
}

/** Grobe Größe einer Ergebniszeile in Bytes (Text als UTF-16, Blobs, Zahlen 8). */
function zeilenBytes(zeile) {
  let n = 16;
  for (const w of zeile) {
    if (typeof w === 'string') n += w.length * 2;
    else if (w && typeof w.length === 'number') n += w.length;
    else n += 8;
  }
  return n;
}

/** SQLite-Fehler, die auf zu viel Speicher hinweisen (hard_heap_limit, SQLITE_MAX_LENGTH). */
function istSpeicherFehler(e) {
  return !!e && (e.code === 'SQLITE_NOMEM' || e.code === 'SQLITE_TOOBIG' || /out of memory|string or blob too big/i.test(String(e.message || '')));
}

/** Über IPC (serialization: 'advanced') kommen Buffer ggf. als Uint8Array an; better-sqlite3 braucht Buffer. */
function alsBuffer(b) {
  if (!b) return null;
  if (Buffer.isBuffer(b)) return b;
  if (b instanceof Uint8Array) return Buffer.from(b.buffer, b.byteOffset, b.byteLength);
  return null;
}

function buffer(db, variante) {
  const eintrag = datenbanken[db];
  if (!eintrag) return null;
  if (!variante) return eintrag.haupt || null;
  return eintrag.varianten[variante] || null;
}

function fehler(code, text) {
  return { ok: false, code, text: String(text || '') };
}

function fuehreAus({ db: name, variante, sql }) {
  const buf = buffer(name, variante);
  if (!buf) return fehler('unbekannte_db', 'Unbekannte Datenbank');
  const start = process.hrtime.bigint();
  const db = new Database(buf);
  try {
    db.pragma('query_only = ON');
    let stmt;
    try {
      stmt = db.prepare(sql);
    } catch (e) {
      if (e instanceof RangeError && /more than one statement/i.test(e.message)) return fehler('mehrere_anweisungen', e.message);
      if (e instanceof RangeError && /no statements/i.test(e.message)) return fehler('leer', e.message);
      return fehler('sql_fehler', e.message);
    }
    // nur lesende Abfragen, die Zeilen liefern (BEGIN/SAVEPOINT sind „readonly“, aber keine Abfragen)
    if (stmt.readonly !== true || stmt.reader !== true) return fehler('nicht_lesend', 'Anweisung ist nicht lesend');
    stmt.raw(true);
    const spalten = stmt.columns().map((s) => s.name);
    const zeilen = [];
    let abgeschnitten = false;
    let bytes = 0;
    for (const zeile of stmt.iterate()) {
      if (zeilen.length >= maxZeilen) {
        abgeschnitten = true;
        break; // beendet den Iterator (stmt wird zurückgesetzt)
      }
      bytes += zeilenBytes(zeile);
      if (bytes > MAX_ERGEBNIS_BYTES) return fehler('ergebnis_zu_gross', ZU_GROSS_TEXT);
      zeilen.push(zeile);
    }
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    return { ok: true, spalten, zeilen, anzahl: zeilen.length, abgeschnitten, ms: Math.round(ms * 10) / 10 };
  } catch (e) {
    if (istSpeicherFehler(e)) return fehler('ergebnis_zu_gross', ZU_GROSS_TEXT);
    return fehler('sql_fehler', e && e.message);
  } finally {
    db.close();
  }
}

/* ---------- Kür K1: Schreibmodus ---------- */

/** Eigene Tabellen der DB mit Zeilenzahl: Map name → zeilen. */
function tabellenZaehlen(db) {
  const m = new Map();
  for (const name of db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").pluck().all()) {
    m.set(name, db.prepare('SELECT COUNT(*) FROM ' + bezeichner(name)).pluck().get());
  }
  return m;
}

/** Grenzen nach einer schreibenden Anweisung → null oder Fehlerobjekt. */
function grenzVerletzung(db, startTabellen) {
  const jetzt = tabellenZaehlen(db);
  const eigene = [...jetzt.keys()].filter((t) => !startTabellen.has(t));
  if (eigene.length > grenzen.tabellen) return { code: 'zu_viele_tabellen', text: 'Zu viele Tabellen', max: grenzen.tabellen };
  for (const [name, n] of jetzt) {
    const erlaubt = Math.max(grenzen.zeilen, startTabellen.get(name) || 0);
    if (n > erlaubt) return { code: 'zu_viele_zeilen', text: 'Zu viele Zeilen', tabelle: name, max: grenzen.zeilen };
  }
  return null;
}

function leseZeilen(stmt, max) {
  stmt.raw(true);
  const spalten = stmt.columns().map((x) => x.name);
  const zeilen = [];
  let abgeschnitten = false;
  let bytes = 0;
  for (const zeile of stmt.iterate()) {
    if (zeilen.length >= max) {
      abgeschnitten = true;
      break;
    }
    bytes += zeilenBytes(zeile);
    if (bytes > MAX_ERGEBNIS_BYTES) {
      const e = new Error(ZU_GROSS_TEXT);
      e.code = 'SQLITE_TOOBIG';
      throw e;
    }
    zeilen.push(zeile);
  }
  return { spalten, zeilen, anzahl: zeilen.length, abgeschnitten };
}

function fuehreSkriptAus({ start, anweisungen, pruefungen }) {
  const anfang = process.hrtime.bigint();
  let db;
  if (start && start.datenbank) {
    const buf = buffer(start.datenbank, null);
    if (!buf) return fehler('unbekannte_db', 'Unbekannte Datenbank');
    db = new Database(buf);
  } else {
    db = new Database(':memory:');
  }
  try {
    db.pragma('foreign_keys = ON');
    db.pragma('temp_store = MEMORY');
    db.pragma('trusted_schema = OFF');
    if (start && typeof start.skript === 'string') {
      try {
        db.exec(start.skript);
      } catch (e) {
        return fehler('start_fehler', e && e.message);
      }
    }
    const startTabellen = tabellenZaehlen(db);
    const seiten = db.pragma('page_count', { simple: true });
    const groesse = db.pragma('page_size', { simple: true });
    db.pragma(`max_page_count = ${seiten + Math.max(1, Math.floor(grenzen.bytes / groesse))}`);

    const protokoll = [];
    let ergebnis = null;
    const liste = Array.isArray(anweisungen) ? anweisungen : [];
    for (let i = 0; i < liste.length; i++) {
      const a = liste[i] || {};
      const nr = i + 1;
      const ort = { anweisung: nr, zeile: a.zeile, art: artKurz(a.sql), protokoll };
      let stmt;
      try {
        stmt = db.prepare(String(a.sql));
      } catch (e) {
        if (e instanceof RangeError && /more than one statement/i.test(e.message)) return { ...fehler('mehrere_anweisungen', e.message), ...ort };
        return { ...fehler('sql_fehler', e.message), sqliteCode: e.code || null, ...ort };
      }
      try {
        if (stmt.reader) {
          ergebnis = { ...leseZeilen(stmt, maxZeilen), nr };
          protokoll.push({ nr, zeile: a.zeile, art: ort.art, aenderungen: null });
        } else {
          const info = stmt.run();
          protokoll.push({ nr, zeile: a.zeile, art: ort.art, aenderungen: info.changes });
          const v = grenzVerletzung(db, startTabellen);
          if (v) return { ok: false, ...v, ...ort, protokoll: protokoll.slice(0, -1) };
        }
      } catch (e) {
        if (istSpeicherFehler(e)) return { ...fehler('ergebnis_zu_gross', ZU_GROSS_TEXT), ...ort };
        if (e && e.code === 'SQLITE_FULL') return { ok: false, code: 'zu_gross', text: 'Datenbank zu groß', max: grenzen.bytes, ...ort };
        return { ...fehler('sql_fehler', e && e.message), sqliteCode: (e && e.code) || null, ...ort };
      }
    }
    const tabellen = schemaVonDb(db);
    // Prüfabfragen: nur lesend auf der DB nach dem Skript
    db.pragma('query_only = ON');
    const eigene = tabellen.map((t) => t.tabelle).filter((t) => !startTabellen.has(t));
    const ergebnisse = (Array.isArray(pruefungen) ? pruefungen : []).map((p) => {
      if (p.art === 'daten') {
        const min = p.min || 1;
        return { ok: eigene.length > 0 && eigene.every((t) => tabellen.find((x) => x.tabelle === t).zeilen >= min) };
      }
      try {
        const stmt = db.prepare(String(p.sql));
        if (!stmt.reader) return { fehler: 'keine Abfrage' };
        const r = leseZeilen(stmt, MAX_PRUEF_ZEILEN);
        return { spalten: r.spalten, zeilen: r.zeilen, anzahl: r.anzahl };
      } catch (e) {
        return { fehler: String((e && e.message) || 'Fehler') };
      }
    });
    const ms = Number(process.hrtime.bigint() - anfang) / 1e6;
    return { ok: true, protokoll, ergebnis, tabellen, pruefungen: ergebnisse, ms: Math.round(ms * 10) / 10 };
  } catch (e) {
    if (istSpeicherFehler(e)) return fehler('ergebnis_zu_gross', ZU_GROSS_TEXT);
    if (e && e.code === 'SQLITE_FULL') return { ok: false, code: 'zu_gross', text: 'Datenbank zu groß', max: grenzen.bytes };
    return fehler('sql_fehler', e && e.message);
  } finally {
    db.close();
  }
}

/** Art einer Anweisung (erstes Wort bzw. CREATE/DROP/ALTER + Objekt) ohne führende Kommentare. */
function artKurz(sql) {
  const t = String(sql || '')
    .replace(/^(\s*(--[^\n]*\n?|\/\*[\s\S]*?\*\/))*/, '')
    .trim();
  const w = t.split(/[\s(]+/).filter(Boolean).map((x) => x.toUpperCase());
  if (!w.length) return '';
  if ((w[0] === 'CREATE' || w[0] === 'DROP' || w[0] === 'ALTER') && w[1]) return w[1] === 'UNIQUE' && w[2] ? `${w[0]} UNIQUE ${w[2]}` : `${w[0]} ${w[1]}`;
  if (w[0] === 'REPLACE') return 'INSERT';
  return w[0].replace(/[^A-Z_]/g, '') || w[0];
}

process.on('message', (nachricht) => {
  if (!nachricht || typeof nachricht !== 'object') return;
  if (nachricht.typ === 'start') {
    datenbanken = Object.create(null);
    for (const [name, eintrag] of Object.entries(nachricht.datenbanken || {})) {
      const varianten = Object.create(null);
      for (const [typ, b] of Object.entries((eintrag && eintrag.varianten) || {})) varianten[typ] = alsBuffer(b);
      datenbanken[name] = { haupt: alsBuffer(eintrag && eintrag.haupt), varianten };
    }
    if (Number.isInteger(nachricht.maxZeilen) && nachricht.maxZeilen > 0) maxZeilen = nachricht.maxZeilen;
    if (nachricht.grenzen && typeof nachricht.grenzen === 'object') grenzen = { ...grenzen, ...nachricht.grenzen };
    process.send({ typ: 'bereit' });
  } else if (nachricht.typ === 'abfrage') {
    let ergebnis;
    try {
      ergebnis = fuehreAus(nachricht);
    } catch (e) {
      ergebnis = fehler('sql_fehler', e && e.message);
    }
    process.send({ typ: 'ergebnis', id: nachricht.id, ergebnis });
  } else if (nachricht.typ === 'skript') {
    let ergebnis;
    try {
      ergebnis = fuehreSkriptAus(nachricht);
    } catch (e) {
      ergebnis = fehler('sql_fehler', e && e.message);
    }
    process.send({ typ: 'ergebnis', id: nachricht.id, ergebnis });
  }
});

// Elternprozess weg → sofort beenden (keine verwaisten Prozesse)
process.on('disconnect', () => process.exit(0));
