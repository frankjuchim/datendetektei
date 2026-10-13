'use strict';
/*
 * Datendetektei – Schreib-Skripte der Kür K1 (Spec §3.3, §7.4; Plan Phase 6 Task 7): reine Hilfen ohne Abhängigkeiten,
 * genutzt vom Elternprozess (Vorprüfung, src/sql/sandbox.js), vom Kindprozess (Aufteilen in Anweisungen,
 * src/sql/sandbox-prozess.js), vom Schreib-Prüfer und vom Validator.
 *
 * Ein Skript besteht aus mehreren Anweisungen, getrennt durch ';' (CREATE TABLE, INSERT, UPDATE, DELETE, DROP TABLE,
 * ALTER TABLE, CREATE INDEX, SELECT). Verboten (ganze Wörter, außerhalb von Texten und Kommentaren):
 *   ATTACH, DETACH, VACUUM, LOAD_EXTENSION – Zugriff auf Dateien bzw. Erweiterungen (wie im Lesemodus);
 *   PRAGMA (auch pragma_…-Funktionen) – die Sandbox setzt foreign_keys, max_page_count usw. selbst; ein Schüler-PRAGMA
 *     könnte die Grenzen (max_page_count) oder die referentielle Integrität (foreign_keys) abschalten;
 *   TEMP/TEMPORARY – temporäre Tabellen liegen außerhalb der Hauptdatenbank und damit außerhalb von max_page_count;
 *   TRIGGER – ein Trigger kann je Anweisung beliebig viele weitere Schreibvorgänge auslösen (Rekursion) und braucht
 *     BEGIN … END mit inneren ';' (das Aufteilen in Anweisungen bliebe nicht eindeutig); in K1 nicht vorgesehen;
 *   VIEW – eine Sicht mit dem Namen einer erwarteten Tabelle könnte die Prüfabfragen täuschen; in K1 nicht vorgesehen;
 *   VIRTUAL – virtuelle Tabellen (FTS, R-Tree …) haben eigene Speicherwege; in K1 nicht vorgesehen.
 * Punkt-Befehle (.tables) gibt es nur in der Kommandozeile.
 */

const MAX_SKRIPT = 10000;
const MAX_ANWEISUNGEN = 200;

const VERBOTEN_SCHREIBEN = [
  { wort: 'ATTACH', muster: /\battach\b/i },
  { wort: 'DETACH', muster: /\bdetach\b/i },
  { wort: 'PRAGMA', muster: /\bpragma/i },
  { wort: 'VACUUM', muster: /\bvacuum\b/i },
  { wort: 'LOAD_EXTENSION', muster: /\bload_extension\b/i },
  { wort: 'TEMP', muster: /\btemp(orary)?\b/i },
  { wort: 'TRIGGER', muster: /\btrigger\b/i },
  { wort: 'VIEW', muster: /\bview\b/i },
  { wort: 'VIRTUAL', muster: /\bvirtual\b/i }
];

/**
 * Teilt ein Skript in Anweisungen: ';' außerhalb von '…', "…", `…`, […] und Kommentaren trennt. Leere Teile (nur
 * Leerraum/Kommentare) fallen weg. → [{ sql, zeile }] (zeile = 1-basierte Zeile des ersten Zeichens der Anweisung)
 * Zusätzlich `ohne`: der Text ohne Texte und Kommentare (für Wortprüfungen; Zeilenumbrüche bleiben).
 */
function zerlege(skript) {
  const s = String(skript);
  const n = s.length;
  const teile = [];
  let ohne = '';
  let start = 0;
  let i = 0;
  const leer = (t) => t.replace(/[^\n]/g, ' ');
  const schliesse = (ende) => {
    const roh = s.slice(start, ende);
    const bereinigt = ohneKommentare(roh);
    if (bereinigt.trim() !== '') {
      const versatz = roh.search(/\S/);
      const vor = s.slice(0, start + Math.max(0, versatz));
      teile.push({ sql: roh.trim(), zeile: vor.split('\n').length });
    }
  };
  while (i < n) {
    const c = s[i];
    if (c === "'" || c === '"' || c === '`' || c === '[') {
      const zu = c === '[' ? ']' : c;
      let j = i + 1;
      while (j < n) {
        if (s[j] === zu) {
          if (zu !== ']' && s[j + 1] === zu) {
            j += 2;
            continue;
          }
          break;
        }
        j++;
      }
      // Bezeichner ("…", `…`, […]) bleiben für die Wortprüfung stehen, Texte ('…') nicht
      ohne += c === "'" ? ' ' + leer(s.slice(i + 1, j)) + (j < n ? ' ' : '') : s.slice(i, Math.min(n, j + 1));
      i = j + 1;
    } else if (c === '-' && s[i + 1] === '-') {
      let j = s.indexOf('\n', i);
      if (j === -1) j = n;
      ohne += leer(s.slice(i, j));
      i = j;
    } else if (c === '/' && s[i + 1] === '*') {
      let j = s.indexOf('*/', i + 2);
      j = j === -1 ? n : j + 2;
      ohne += leer(s.slice(i, j));
      i = j;
    } else if (c === ';') {
      schliesse(i);
      ohne += ';';
      start = i + 1;
      i++;
    } else {
      ohne += c;
      i++;
    }
  }
  schliesse(n);
  return { anweisungen: teile, ohne };
}

/** Text ohne Kommentare (Texte bleiben) – nur um leere Teile zu erkennen. */
function ohneKommentare(t) {
  let aus = '';
  let i = 0;
  while (i < t.length) {
    const c = t[i];
    if (c === "'" || c === '"' || c === '`' || c === '[') {
      const zu = c === '[' ? ']' : c;
      let j = i + 1;
      while (j < t.length && t[j] !== zu) j++;
      aus += t.slice(i, j + 1);
      i = j + 1;
    } else if (c === '-' && t[i + 1] === '-') {
      const j = t.indexOf('\n', i);
      i = j === -1 ? t.length : j;
    } else if (c === '/' && t[i + 1] === '*') {
      const j = t.indexOf('*/', i + 2);
      i = j === -1 ? t.length : j + 2;
    } else {
      aus += c;
      i++;
    }
  }
  return aus;
}

/** Vorprüfung eines Schreib-Skripts (ohne Ausführung). → { ok: true, anweisungen } | { ok: false, code, text, … } */
function vorpruefenSkript(skript) {
  if (typeof skript !== 'string' || skript.trim() === '') return { ok: false, code: 'leer', text: 'Leeres Skript' };
  if (skript.length > MAX_SKRIPT) return { ok: false, code: 'zu_lang', text: 'Skript zu lang', max: MAX_SKRIPT };
  const { anweisungen, ohne } = zerlege(skript);
  if (anweisungen.length === 0) return { ok: false, code: 'leer', text: 'Leeres Skript' };
  if (/^\s*\./m.test(ohne)) return { ok: false, code: 'verboten', text: 'Verboten: Punkt-Befehl', wort: '.' };
  for (const { wort, muster } of VERBOTEN_SCHREIBEN) {
    if (muster.test(ohne)) return { ok: false, code: 'verboten', text: 'Verboten: ' + wort, wort };
  }
  if (anweisungen.length > MAX_ANWEISUNGEN) {
    return { ok: false, code: 'zu_viele_anweisungen', text: 'Zu viele Anweisungen', max: MAX_ANWEISUNGEN };
  }
  return { ok: true, anweisungen };
}

/** Art einer Anweisung für das Protokoll: „CREATE TABLE“, „INSERT“, „SELECT“ … (Großbuchstaben, höchstens zwei Wörter). */
function artVon(sql) {
  const woerter = ohneKommentare(String(sql)).trim().split(/[\s(]+/).filter(Boolean).map((w) => w.toUpperCase());
  const [a, b] = woerter;
  if (!a) return '';
  if ((a === 'CREATE' || a === 'DROP' || a === 'ALTER') && b) {
    if (b === 'UNIQUE' && woerter[2]) return `${a} UNIQUE ${woerter[2]}`;
    return `${a} ${b}`;
  }
  if (a === 'INSERT' || a === 'REPLACE') return 'INSERT';
  return a.replace(/[^A-Z_]/g, '') || a;
}

module.exports = { MAX_SKRIPT, MAX_ANWEISUNGEN, VERBOTEN_SCHREIBEN, zerlege, vorpruefenSkript, artVon };
