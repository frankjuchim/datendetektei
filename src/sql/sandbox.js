'use strict';
/*
 * Datendetektei – SQL-Sandbox: Pool aus Kindprozessen (Spec §7.4, §18; Plan Phase 2 Task 9).
 *
 * Schüler-SQL läuft nie im Server-Prozess, sondern in einem per child_process.fork gestarteten Prozess
 * (src/sql/sandbox-prozess.js). worker_threads scheiden aus: worker.terminate() beendet eine laufende SQLite-Abfrage
 * nicht (Spike, §18). Ein Kindprozess wird beim Zeitlimit mit SIGKILL beendet und durch einen neuen ersetzt.
 *
 * erzeugeSandbox({ prozesse = 2, zeitlimitMs = 1500, maxZeilen = 5000, maxWartend = 50, datenbanken })
 *   datenbanken = { <name>: { haupt: Buffer, varianten: { <typ>: Buffer } } }  (serialisierte SQLite-DBs)
 *   → { fuehreAus({ db, variante?, sql, modus = 'lesen' }), status(), beende() }
 *
 * fuehreAus → Promise, die nie verworfen wird:
 *   { ok: true, spalten: [name], zeilen: [[wert]], anzahl, abgeschnitten, ms }
 *   { ok: false, code, text, …Zusatz }  code ∈ leer | zu_lang (max) | verboten (wort) | mehrere_anweisungen |
 *     nicht_lesend | sql_fehler (text = Rohmeldung von SQLite) | unbekannte_db | ueberlastet | zeitlimit (ms) |
 *     absturz | beendet
 *   Die deutschen Texte für Schülerinnen und Schüler liefert src/sql/fehlertexte.js.
 *   Bei abgeschnitten = true ist anzahl = maxZeilen (die exakte Gesamtzahl wäre nicht billig: Weiterzählen kann
 *   bei Kreuzprodukten beliebig lange dauern).
 *
 * Kür K1 (Plan Phase 6 Task 7) – Schreibmodus:
 *   fuehreSkriptAus({ start?, skript, pruefungen? }) → Promise (wird nie verworfen):
 *   Je Anfrage eine FRISCHE In-Memory-DB im Kindprozess: leer, eine Kopie einer geladenen Haupt-DB
 *   (start = { datenbank }) oder aus einem Startskript der Aufgabe (start = { skript }, vertrauenswürdiger Inhalt).
 *   Danach das Schüler-Skript (mehrere Anweisungen, src/sql/skript.js) mit PRAGMA foreign_keys = ON und den Grenzen
 *   grenzen = { tabellen: 20 eigene Tabellen, zeilen: 500 je Tabelle (Starttabellen: mindestens ihr Startbestand),
 *   bytes: 1 MB über dem Startbestand (max_page_count) }, Skript ≤ 10 000 Zeichen, ≤ 200 Anweisungen, Ergebnis ≤
 *   maxZeilen, Zeitlimit wie oben für Startskript + Skript + Prüfabfragen zusammen. Die DB wird danach geschlossen –
 *   nichts bleibt erhalten (E7, Spec §7.14); Dateien gibt es nicht (nur :memory: bzw. deserialisierte Buffer).
 *   pruefungen: [{ art: 'abfrage' | 'gleich', sql } | { art: 'daten', min }] – Prüfabfragen des Inhalts (nicht vom
 *   Schüler), nur lesend (query_only) auf der DB nach dem Skript.
 *   → { ok: true, protokoll: [{ nr, zeile, art, aenderungen }], ergebnis: { spalten, zeilen, anzahl, abgeschnitten, nr }
 *       | null (letztes SELECT), tabellen: schemaVonDb, pruefungen: [{ spalten, zeilen } | { fehler } | { ok }], ms }
 *     { ok: false, code, text, anweisung?, zeile?, art?, protokoll?, … }  code zusätzlich zu oben: zu_viele_anweisungen,
 *       zu_viele_tabellen (max), zu_viele_zeilen (tabelle, max), zu_gross (max), start_fehler (Inhaltsfehler);
 *       sql_fehler mit sqliteCode. Deutsche Texte: src/sql/fehlertexte_schreiben.js.
 *
 * Keine Abhängigkeit von src/kern.
 */

const path = require('node:path');
const childProcess = require('node:child_process');
const { vorpruefenSkript } = require('./skript');

const PROZESS_DATEI = path.join(__dirname, 'sandbox-prozess.js');
const MAX_LAENGE = 4000;
const MAX_STARTFEHLER = 3;
const MAX_STARTSKRIPT = 20000;
const MAX_PRUEFUNGEN = 30;
/** Grenzen der Kür-Sandbox (Spec §3.3; Plan Phase 6 Task 7). */
const GRENZEN_SCHREIBEN = Object.freeze({ tabellen: 20, zeilen: 500, bytes: 1024 * 1024 });

// Verbotene Wörter (ganze Wörter, ohne Groß/Klein); PRAGMA auch als Präfix (pragma_table_info(…) usw.).
const VERBOTEN = [
  { wort: 'ATTACH', muster: /\battach\b/i },
  { wort: 'DETACH', muster: /\bdetach\b/i },
  { wort: 'PRAGMA', muster: /\bpragma/i },
  { wort: 'VACUUM', muster: /\bvacuum\b/i },
  { wort: 'LOAD_EXTENSION', muster: /\bload_extension\b/i }
];

/**
 * Ersetzt String-Literale ('…', '' als Hochkomma) und Kommentare (-- …, /* … *\/) durch Leerzeichen; Zeilenumbrüche
 * bleiben erhalten. Bezeichner in "…", `…` und […] bleiben stehen – "load_extension"(…) ist in SQLite ein
 * Funktionsaufruf und muss erkannt werden.
 */
function ohneStringsUndKommentare(sql) {
  let aus = '';
  let i = 0;
  const n = sql.length;
  const leer = (s) => s.replace(/[^\n]/g, ' ');
  while (i < n) {
    const c = sql[i];
    if (c === "'") {
      let j = i + 1;
      while (j < n) {
        if (sql[j] === "'") {
          if (sql[j + 1] === "'") { j += 2; continue; }
          break;
        }
        j++;
      }
      aus += ' ' + leer(sql.slice(i + 1, j)) + (j < n ? ' ' : '');
      i = j + 1;
    } else if (c === '-' && sql[i + 1] === '-') {
      let j = sql.indexOf('\n', i);
      if (j === -1) j = n;
      aus += leer(sql.slice(i, j));
      i = j;
    } else if (c === '/' && sql[i + 1] === '*') {
      let j = sql.indexOf('*/', i + 2);
      j = j === -1 ? n : j + 2;
      aus += leer(sql.slice(i, j));
      i = j;
    } else {
      aus += c;
      i++;
    }
  }
  return aus;
}

/** Schnelle Vorprüfung im Elternprozess (ohne Ausführung). → { ok: true } | { ok: false, code, text, … } */
function vorpruefen(sql) {
  if (typeof sql !== 'string' || sql.trim() === '') return { ok: false, code: 'leer', text: 'Leere Abfrage' };
  if (sql.length > MAX_LAENGE) return { ok: false, code: 'zu_lang', text: 'Abfrage zu lang', max: MAX_LAENGE };
  const rest = ohneStringsUndKommentare(sql);
  if (/^\s*\./m.test(rest)) return { ok: false, code: 'verboten', text: 'Verboten: Punkt-Befehl', wort: '.' };
  for (const { wort, muster } of VERBOTEN) {
    if (muster.test(rest)) return { ok: false, code: 'verboten', text: 'Verboten: ' + wort, wort };
  }
  return { ok: true };
}

/** Nur Buffer weitergeben (keine Pfade, keine fremden Felder). */
function bereinigeDatenbanken(datenbanken) {
  const aus = {};
  for (const [name, eintrag] of Object.entries(datenbanken || {})) {
    if (!eintrag || !Buffer.isBuffer(eintrag.haupt)) throw new TypeError('Datenbank ' + name + ': haupt muss ein Buffer sein');
    const varianten = {};
    for (const [typ, b] of Object.entries(eintrag.varianten || {})) {
      if (!Buffer.isBuffer(b)) throw new TypeError('Datenbank ' + name + ', Variante ' + typ + ': kein Buffer');
      varianten[typ] = b;
    }
    aus[name] = { haupt: eintrag.haupt, varianten };
  }
  return aus;
}

function erzeugeSandbox({ prozesse = 2, zeitlimitMs = 1500, maxZeilen = 5000, maxWartend = 50, datenbanken, grenzen = {} } = {}) {
  const dbs = bereinigeDatenbanken(datenbanken);
  const schreibGrenzen = { ...GRENZEN_SCHREIBEN, ...grenzen };
  const pool = [];
  const warteschlange = [];
  let naechsteId = 1;
  let beendet = false;
  let startfehler = 0;

  function vorhanden(db, variante) {
    if (!Object.prototype.hasOwnProperty.call(dbs, db)) return false;
    if (variante == null || variante === '') return true;
    return Object.prototype.hasOwnProperty.call(dbs[db].varianten, variante);
  }

  function starte() {
    const kind = childProcess.fork(PROZESS_DATEI, [], {
      env: { NODE_ENV: process.env.NODE_ENV || 'production' }, // keine Secrets im Kindprozess
      execArgv: [],
      serialization: 'advanced', // Buffer per IPC
      stdio: ['ignore', 'ignore', 'inherit', 'ipc']
    });
    const p = { kind, bereit: false, auftrag: null, timer: null, tot: false };
    pool.push(p);
    kind.on('message', (m) => {
      if (p.tot || !m || typeof m !== 'object') return;
      if (m.typ === 'bereit') {
        p.bereit = true;
        startfehler = 0;
        verteile();
      } else if (m.typ === 'ergebnis' && p.auftrag && m.id === p.auftrag.id) {
        const auftrag = p.auftrag;
        p.auftrag = null;
        clearTimeout(p.timer);
        auftrag.erledige(m.ergebnis);
        verteile();
      }
    });
    kind.on('exit', () => weg(p, { ok: false, code: 'absturz', text: 'Sandbox-Prozess unerwartet beendet' }));
    kind.on('error', () => {
      try { kind.kill('SIGKILL'); } catch { /* schon beendet */ }
      weg(p, { ok: false, code: 'absturz', text: 'Sandbox-Prozess nicht erreichbar' });
    });
    kind.send({ typ: 'start', datenbanken: dbs, maxZeilen, grenzen: schreibGrenzen });
  }

  /** Prozess aus dem Pool nehmen, laufenden Auftrag beantworten, Ersatz starten. */
  function weg(p, antwort) {
    if (p.tot) return;
    p.tot = true;
    clearTimeout(p.timer);
    const i = pool.indexOf(p);
    if (i !== -1) pool.splice(i, 1);
    if (p.auftrag) {
      const auftrag = p.auftrag;
      p.auftrag = null;
      auftrag.erledige(antwort);
    }
    if (beendet) return;
    if (!p.bereit) startfehler++;
    if (startfehler >= MAX_STARTFEHLER) {
      // Prozesse sterben schon beim Start: nicht endlos neu starten
      if (pool.length === 0) leereWarteschlange({ ok: false, code: 'absturz', text: 'Sandbox nicht verfügbar' });
      return;
    }
    starte();
    verteile();
  }

  function verteile() {
    while (warteschlange.length > 0) {
      const p = pool.find((x) => x.bereit && !x.tot && !x.auftrag);
      if (!p) return;
      const auftrag = warteschlange.shift();
      p.auftrag = auftrag;
      p.timer = setTimeout(() => {
        if (p.auftrag !== auftrag) return;
        p.auftrag = null;
        auftrag.erledige({ ok: false, code: 'zeitlimit', text: 'Zeitlimit überschritten', ms: zeitlimitMs });
        try { p.kind.kill('SIGKILL'); } catch { /* schon beendet */ }
        weg(p, null);
      }, zeitlimitMs);
      p.kind.send(auftrag.nachricht, (fehler) => {
        if (fehler) weg(p, { ok: false, code: 'absturz', text: 'Sandbox-Prozess nicht erreichbar' });
      });
    }
  }

  function leereWarteschlange(antwort) {
    while (warteschlange.length > 0) warteschlange.shift().erledige(antwort);
  }

  function fuehreAus({ db, variante, sql, modus = 'lesen' } = {}) {
    if (beendet) return Promise.resolve({ ok: false, code: 'beendet', text: 'Sandbox beendet' });
    if (modus !== 'lesen') return Promise.resolve({ ok: false, code: 'nicht_lesend', text: 'Nur Lesemodus' });
    const vor = vorpruefen(sql);
    if (!vor.ok) return Promise.resolve(vor);
    if (!vorhanden(db, variante)) return Promise.resolve({ ok: false, code: 'unbekannte_db', text: 'Unbekannte Datenbank' });
    return einreihen({ typ: 'abfrage', db, variante: variante || null, sql });
  }

  /** Auftrag in die Warteschlange (Überlast, kein Prozess → sofortige Antwort). */
  function einreihen(nachricht) {
    if (warteschlange.length >= maxWartend) {
      return Promise.resolve({ ok: false, code: 'ueberlastet', text: 'Sandbox überlastet' });
    }
    if (pool.length === 0) return Promise.resolve({ ok: false, code: 'absturz', text: 'Sandbox nicht verfügbar' });
    return new Promise((erledige) => {
      const id = naechsteId++;
      warteschlange.push({ id, erledige, nachricht: { ...nachricht, id } });
      verteile();
    });
  }

  /** Kür K1: Schreib-Skript in einer frischen In-Memory-DB (siehe Kopf). Start und Prüfungen nur aus dem Inhalt. */
  function fuehreSkriptAus({ start = null, skript, pruefungen = [] } = {}) {
    if (beendet) return Promise.resolve({ ok: false, code: 'beendet', text: 'Sandbox beendet' });
    const vor = vorpruefenSkript(skript);
    if (!vor.ok) return Promise.resolve(vor);
    let s = null;
    if (start && typeof start === 'object') {
      if (typeof start.datenbank === 'string') {
        if (!vorhanden(start.datenbank, null)) return Promise.resolve({ ok: false, code: 'unbekannte_db', text: 'Unbekannte Datenbank' });
        s = { datenbank: start.datenbank };
      } else if (typeof start.skript === 'string') {
        if (start.skript.length > MAX_STARTSKRIPT) return Promise.resolve({ ok: false, code: 'start_fehler', text: 'Startskript zu lang' });
        s = { skript: start.skript };
      }
    }
    const liste = (Array.isArray(pruefungen) ? pruefungen : []).slice(0, MAX_PRUEFUNGEN).map((p) => {
      if (p && p.art === 'daten') return { art: 'daten', min: Number.isInteger(p.min) && p.min > 0 ? p.min : 1 };
      return { art: p && p.art === 'gleich' ? 'gleich' : 'abfrage', sql: p && typeof p.sql === 'string' ? p.sql : '' };
    });
    return einreihen({ typ: 'skript', start: s, anweisungen: vor.anweisungen, pruefungen: liste });
  }

  function status() {
    return {
      prozesse: pool.map((p) => ({ pid: p.kind.pid, bereit: p.bereit, belegt: !!p.auftrag })),
      wartend: warteschlange.length
    };
  }

  function beende() {
    if (beendet) return;
    beendet = true;
    const antwort = { ok: false, code: 'beendet', text: 'Sandbox beendet' };
    leereWarteschlange(antwort);
    for (const p of pool.slice()) {
      try { p.kind.kill('SIGKILL'); } catch { /* schon beendet */ }
      weg(p, antwort);
    }
  }

  for (let i = 0; i < Math.max(1, prozesse); i++) starte();
  return { fuehreAus, fuehreSkriptAus, status, beende };
}

module.exports = { erzeugeSandbox, vorpruefen, ohneStringsUndKommentare, MAX_LAENGE, GRENZEN_SCHREIBEN };
