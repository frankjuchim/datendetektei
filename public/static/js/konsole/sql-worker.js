'use strict';
// SQL im Browser (Spec §7.2): klassischer Web Worker mit selbst gehostetem sql.js 1.14.2.
// WebAssembly, wenn verfügbar (Feature-Erkennung mit Test-Instanziierung, CSP 'wasm-unsafe-eval'),
// sonst Fallback sql-asm.js (reines JavaScript). Gesteuert von ausfuehren.js; ein endloses Statement wird dort per
// worker.terminate() beendet – der Worker selbst kennt kein Zeitlimit.
//
// Nachrichten (Hauptthread → Worker):
//   { typ: 'start', dbUrl, puffer }      puffer = ArrayBuffer der DB (nach Neustart) oder null (dann fetch(dbUrl))
//   { typ: 'ausfuehren', id, sql }       führt genau eine Anweisung aus
//   { typ: 'schema', id }                Tabellen mit Spalten, Schlüsseln und Zeilenanzahl
// Antworten: { typ: 'bereit', modus: 'wasm' | 'asm', puffer? } · { typ: 'startfehler', fehler } ·
//   { typ: 'antwort', id, ergebnis }   ergebnis = { spalten, zeilen, gesamt, ms } | { fehler } bzw. Schema-Liste

const MAX_ZEILEN = 300;
const TEXT_MEHRERE = 'Bitte nur eine Abfrage auf einmal.';
const TEXT_LEER = 'Keine Abfrage gefunden.';
const TEXT_LADEFEHLER = 'Die Datenbank konnte nicht geladen werden.';
const TEXT_OHNE_WASM =
  'SQL kann in diesem Browser nicht ausgeführt werden (WebAssembly ist gesperrt).';

const parameter = new URL(self.location.href).searchParams;
const VERSION = parameter.get('v');
const VENDOR = new URL('../../vendor/sqljs/', self.location.href);

let db = null;

/** URL einer Vendor-Datei (gleiche Herkunft, mit ?v= des Workers für den Browser-Cache). */
function vendorUrl(datei) {
  const url = new URL(datei, VENDOR);
  if (VERSION) url.searchParams.set('v', VERSION);
  return url.href;
}

/** true, wenn WebAssembly vorhanden ist und ausgeführt werden darf (CSP, Schulnetz-Richtlinien). */
function wasmVerfuegbar() {
  if (parameter.get('ohneWasm') === '1') {
    // Nur für Tests: Umgebung ohne WebAssembly nachstellen (auch für sql.js selbst).
    try {
      delete self.WebAssembly;
    } catch {
      // nicht löschbar – der Fallback wird trotzdem erzwungen
    }
    return false;
  }
  try {
    if (typeof WebAssembly !== 'object' || WebAssembly === null) return false;
    // Kleinstes gültiges Modul (Magic + Version): scheitert, wenn die CSP WebAssembly verbietet.
    const modul = new WebAssembly.Module(new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]));
    return new WebAssembly.Instance(modul) instanceof WebAssembly.Instance;
  } catch {
    return false;
  }
}

/** Lädt sql.js (WASM oder asm.js) und liefert { SQL, modus }. */
async function ladeSqlJs() {
  if (wasmVerfuegbar()) {
    try {
      importScripts(vendorUrl('sql-wasm.js'));
      const SQL = await self.initSqlJs({ locateFile: (datei) => vendorUrl(datei) });
      return { SQL, modus: 'wasm' };
    } catch {
      // z. B. .wasm im Netz blockiert → asm.js
    }
  }
  importScripts(vendorUrl('sql-asm.js'));
  const SQL = await self.initSqlJs();
  return { SQL, modus: 'asm' };
}

async function starte({ dbUrl, puffer }) {
  const { SQL, modus } = await ladeSqlJs();
  let geladen = puffer;
  let zurueck = null;
  if (!geladen) {
    try {
      const antwort = await fetch(dbUrl, { credentials: 'same-origin' });
      if (!antwort.ok) throw new Error(`HTTP ${antwort.status}`);
      geladen = await antwort.arrayBuffer();
    } catch {
      throw new Error(TEXT_LADEFEHLER);
    }
    zurueck = geladen.slice(0); // Kopie für den Hauptthread (Neustart ohne neuen Download)
  }
  db = new SQL.Database(new Uint8Array(geladen));
  try {
    // Erste Anweisung = Probelauf des SQL-Parsers.
    db.exec('PRAGMA query_only = ON');
  } catch (fehler) {
    // Bekannt (Chromium, sql.js 1.14.2): Der asm.js-Build braucht für den SQLite-Parser einen größeren
    // Aufruf-Stack, als ein Web Worker hat (RangeError: Maximum call stack size exceeded).
    if (modus === 'asm' && fehler instanceof RangeError) throw new Error(TEXT_OHNE_WASM);
    throw fehler;
  }
  return { modus, zurueck };
}

/** Ist im Rest nach der ersten Anweisung noch eine weitere (auch eine fehlerhafte)? Kommentare zählen nicht. */
function weitereAnweisung(rest) {
  if (!rest || rest.trim() === '') return false;
  try {
    const iter = db.iterateStatements(rest);
    const naechste = iter.next();
    if (naechste.done) return false;
    naechste.value.free();
    return true;
  } catch {
    return true;
  }
}

function ausfuehren(sql) {
  const start = performance.now();
  let iter;
  let stmt = null;
  try {
    iter = db.iterateStatements(String(sql));
    const erste = iter.next();
    if (erste.done) return { fehler: TEXT_LEER };
    stmt = erste.value;
    if (weitereAnweisung(iter.getRemainingSQL())) return { fehler: TEXT_MEHRERE };
    const spalten = stmt.getColumnNames();
    const zeilen = [];
    let gesamt = 0;
    while (stmt.step()) {
      if (gesamt < MAX_ZEILEN) zeilen.push(stmt.get());
      gesamt++;
    }
    return { spalten, zeilen, gesamt, ms: Math.round(performance.now() - start) };
  } catch (fehler) {
    return { fehler: (fehler && fehler.message) || String(fehler) };
  } finally {
    if (stmt) stmt.free();
    if (iter) {
      try {
        // gibt den SQL-Text des Iterators frei (der Rest ist leer oder wurde verworfen)
        while (!iter.next().done);
      } catch {
        // Rest nicht übersetzbar – egal, er wurde nicht ausgeführt
      }
    }
  }
}

function abfrage(sql, parameterListe = []) {
  const stmt = db.prepare(sql, parameterListe);
  const zeilen = [];
  try {
    while (stmt.step()) zeilen.push(stmt.getAsObject());
  } finally {
    stmt.free();
  }
  return zeilen;
}

/** [{ name, spalten: [{ name, typ, pk, notNull, fk: { tabelle, spalte } | null }], zeilen }] in Schema-Reihenfolge. */
function schema() {
  const tabellen = abfrage(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite\\_%' ESCAPE '\\' ORDER BY rowid"
  );
  return tabellen.map(({ name }) => {
    const info = abfrage('SELECT name, type, "notnull" AS nn, pk FROM pragma_table_info(?) ORDER BY cid', [name]);
    const fks = abfrage('SELECT "from" AS von, "table" AS tabelle, "to" AS nach FROM pragma_foreign_key_list(?)', [name]);
    const fkVon = new Map();
    for (const f of fks) {
      let ziel = f.nach;
      if (ziel === null) {
        // REFERENCES Tabelle ohne Spalte → Primärschlüssel der Zieltabelle
        const pk = abfrage('SELECT name FROM pragma_table_info(?) WHERE pk = 1', [f.tabelle]);
        ziel = pk.length ? pk[0].name : null;
      }
      fkVon.set(f.von, { tabelle: f.tabelle, spalte: ziel });
    }
    const zeilen = abfrage(`SELECT COUNT(*) AS n FROM "${name.replace(/"/g, '""')}"`)[0].n;
    return {
      name,
      spalten: info.map((s) => ({
        name: s.name,
        typ: s.type,
        pk: s.pk > 0,
        notNull: s.nn === 1,
        fk: fkVon.get(s.name) || null
      })),
      zeilen
    };
  });
}

let startVersprechen = null;

self.onmessage = async (ereignis) => {
  const nachricht = ereignis.data || {};
  if (nachricht.typ === 'start') {
    startVersprechen = starte(nachricht);
    try {
      const { modus, zurueck } = await startVersprechen;
      self.postMessage({ typ: 'bereit', modus, puffer: zurueck }, zurueck ? [zurueck] : []);
    } catch (fehler) {
      self.postMessage({ typ: 'startfehler', fehler: (fehler && fehler.message) || 'Start fehlgeschlagen.' });
    }
    return;
  }
  if (!startVersprechen) return;
  try {
    await startVersprechen;
  } catch {
    self.postMessage({ typ: 'antwort', id: nachricht.id, ergebnis: { fehler: 'Die Datenbank ist nicht geladen.' } });
    return;
  }
  let ergebnis;
  if (nachricht.typ === 'ausfuehren') ergebnis = ausfuehren(nachricht.sql);
  else if (nachricht.typ === 'schema') {
    try {
      ergebnis = schema();
    } catch (fehler) {
      ergebnis = { fehler: (fehler && fehler.message) || String(fehler) };
    }
  } else ergebnis = { fehler: 'Unbekannter Auftrag.' };
  self.postMessage({ typ: 'antwort', id: nachricht.id, ergebnis });
};
