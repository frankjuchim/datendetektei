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
 */

const Database = require('better-sqlite3');

let datenbanken = Object.create(null);
let maxZeilen = 5000;

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
    for (const zeile of stmt.iterate()) {
      if (zeilen.length >= maxZeilen) {
        abgeschnitten = true;
        break; // beendet den Iterator (stmt wird zurückgesetzt)
      }
      zeilen.push(zeile);
    }
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    return { ok: true, spalten, zeilen, anzahl: zeilen.length, abgeschnitten, ms: Math.round(ms * 10) / 10 };
  } catch (e) {
    return fehler('sql_fehler', e && e.message);
  } finally {
    db.close();
  }
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
    process.send({ typ: 'bereit' });
  } else if (nachricht.typ === 'abfrage') {
    let ergebnis;
    try {
      ergebnis = fuehreAus(nachricht);
    } catch (e) {
      ergebnis = fehler('sql_fehler', e && e.message);
    }
    process.send({ typ: 'ergebnis', id: nachricht.id, ergebnis });
  }
});

// Elternprozess weg → sofort beenden (keine verwaisten Prozesse)
process.on('disconnect', () => process.exit(0));
