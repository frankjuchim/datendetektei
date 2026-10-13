'use strict';
/*
 * Datendetektei – Prüfer für Schreib-Skripte der Kür K1 (Interaktion sql mit schreiben: true, AUFGABENFORMAT §6.6.1;
 * Plan Phase 6 Task 7). Nur serverseitig; aufgerufen über erzeugePruefer(…).pruefeSql (src/sql/pruefer.js).
 *
 * aufgabe = { id?, schreiben: true, start: null | { datenbank } | { skript }, loesung: { sql, pruefung: [Prüfpunkt] } }
 * Prüfpunkt (Inhalt, nie vom Browser):
 *   { text, sql }                       art 'abfrage' (Standard): genau eine Zeile, ein Wert, wahr (≠ 0, ≠ NULL, ≠ '')
 *   { art: 'gleich', text, sql }        Ergebnis der Prüfabfrage = Ergebnis derselben Abfrage auf der Muster-DB (Multimenge)
 *   { art: 'daten', text, min }         jede eigene (nicht vom Start mitgebrachte) Tabelle hat ≥ min Datensätze
 *   { art: 'ergebnis', text }           letztes SELECT des Skripts = letztes SELECT der Musterlösung (Multimenge,
 *                                       Spaltenanzahl und -reihenfolge zählen, Namen nicht)
 *   { art: 'zeilen', text, min }        letztes SELECT liefert ≥ min Zeilen
 *   { art: 'skript', text, muster }     regulärer Ausdruck (ohne Groß/Klein) auf dem Skript ohne Texte und Kommentare
 *
 * pruefeSkript({ skript, aufgabe }) → { ok, diagnose: [{ code, falle: null, art, text, zeile? }], pruefpunkte:
 *   [{ text, ok }] | null, zeilen: null }. Bricht das Skript ab (oder ist es verboten), gibt es eine Diagnose mit
 *   „Anweisung n (Zeile z)“ und keine Prüfpunkte. Die Antwort enthält nur die Prüfpunkt-Texte des Inhalts – keine
 *   Prüfabfragen, keine Musterzeilen.
 * musterLauf(aufgabe) → Promise<Sandbox-Ergebnis der Musterlösung> (gecacht; Inhaltsfehler → Error „Musterlösung …“).
 */

const crypto = require('node:crypto');
const { zerlege } = require('./skript');
const FS = require('./fehlertexte_schreiben');
const diagnose = require('./diagnose');

const MAX_CACHE = 200;
const SANDBOX_ARTEN = ['abfrage', 'gleich', 'daten'];

const artVon = (p) => (p && typeof p.art === 'string' ? p.art : 'abfrage');

function fingerabdruck(aufgabe) {
  const lo = aufgabe.loesung || {};
  return crypto
    .createHash('sha256')
    .update(JSON.stringify([aufgabe.start || null, lo.sql, lo.pruefung || []]))
    .digest('hex')
    .slice(0, 32);
}

/** Prüfpunkte, die die Sandbox auswertet (Index in der Prüfpunkt-Liste bleibt über `index` erhalten). */
function sandboxPruefungen(pruefung) {
  return (Array.isArray(pruefung) ? pruefung : [])
    .map((p, index) => ({ p, index }))
    .filter(({ p }) => SANDBOX_ARTEN.includes(artVon(p)))
    .map(({ p, index }) => ({ index, art: artVon(p), sql: p.sql, min: p.min }));
}

function wahr(r) {
  if (!r || r.fehler || !Array.isArray(r.zeilen) || r.zeilen.length !== 1 || r.zeilen[0].length !== 1) return false;
  const w = r.zeilen[0][0];
  return w !== null && w !== 0 && w !== '' && w !== '0';
}

function gleich(a, b) {
  if (!a || !b || a.fehler || b.fehler || !Array.isArray(a.zeilen) || !Array.isArray(b.zeilen)) return false;
  return diagnose.vergleiche({ ...a, anzahl: a.zeilen.length }, { ...b, anzahl: b.zeilen.length }, {}).gleich;
}

function erzeugeSchreibPruefer({ sandbox }) {
  if (!sandbox || typeof sandbox.fuehreSkriptAus !== 'function') throw new TypeError('sandbox (mit fuehreSkriptAus) fehlt');
  const cache = new Map();

  function lauf(aufgabe, skript) {
    const liste = sandboxPruefungen(aufgabe.loesung && aufgabe.loesung.pruefung);
    return sandbox.fuehreSkriptAus({ start: aufgabe.start || null, skript, pruefungen: liste }).then((e) => {
      if (e && e.ok) {
        const je = new Map(liste.map((x, i) => [x.index, e.pruefungen[i]]));
        return { ...e, jePruefpunkt: je };
      }
      return e;
    });
  }

  function musterLauf(aufgabe) {
    if (!aufgabe || !aufgabe.loesung || typeof aufgabe.loesung.sql !== 'string') return Promise.reject(new TypeError('aufgabe.loesung.sql fehlt'));
    const schluessel = String(aufgabe.id || '') + '|' + fingerabdruck(aufgabe);
    if (cache.has(schluessel)) return cache.get(schluessel);
    const name = aufgabe.id || 'Kür-Aufgabe';
    const versprechen = lauf(aufgabe, aufgabe.loesung.sql).then((e) => {
      if (!e || !e.ok) {
        const ort = e && e.anweisung ? ` (Anweisung ${e.anweisung})` : '';
        throw new Error(`Musterlösung ${name} nicht ausführbar${ort}: ${e ? e.code + ' – ' + e.text : 'keine Antwort'}`);
      }
      if (e.ergebnis && e.ergebnis.abgeschnitten) throw new Error(`Musterlösung ${name}: Ergebnis zu groß (abgeschnitten)`);
      return e;
    });
    versprechen.catch(() => cache.delete(schluessel));
    if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value);
    cache.set(schluessel, versprechen);
    return versprechen;
  }

  /** Einen Prüfpunkt auf dem Schülerlauf auswerten. */
  function bewerte(p, index, s, m, skript) {
    switch (artVon(p)) {
      case 'abfrage':
        return wahr(s.jePruefpunkt.get(index));
      case 'gleich':
        return gleich(s.jePruefpunkt.get(index), m.jePruefpunkt.get(index));
      case 'daten': {
        const r = s.jePruefpunkt.get(index);
        return !!(r && r.ok);
      }
      case 'ergebnis':
        return !!s.ergebnis && gleich(s.ergebnis, m.ergebnis);
      case 'zeilen':
        return !!s.ergebnis && s.ergebnis.anzahl >= (Number.isInteger(p.min) ? p.min : 1);
      case 'skript':
        try {
          return new RegExp(p.muster, 'i').test(zerlege(skript).ohne);
        } catch {
          return false;
        }
      default:
        return false;
    }
  }

  async function pruefeSkript({ skript, aufgabe }) {
    const pruefung = Array.isArray(aufgabe.loesung && aufgabe.loesung.pruefung) ? aufgabe.loesung.pruefung : [];
    const m = await musterLauf(aufgabe); // Inhaltsfehler zuerst (wie pruefeSql)
    const s = await lauf(aufgabe, typeof skript === 'string' ? skript : '');
    if (!s || !s.ok) {
      const f = s || { code: 'absturz' };
      const { code, text } = FS.mitOrt(f);
      const technisch = ['ueberlastet', 'absturz', 'beendet', 'start_fehler'].includes(f.code);
      const d = { code, falle: null, art: technisch ? 'technisch' : 'fehler', text };
      if (Number.isInteger(f.zeile)) d.zeile = f.zeile;
      return { ok: false, diagnose: [d], pruefpunkte: null, zeilen: null };
    }
    const pruefpunkte = pruefung.map((p, i) => ({ text: String(p.text || ''), ok: bewerte(p, i, s, m, skript) }));
    return { ok: pruefpunkte.length > 0 && pruefpunkte.every((p) => p.ok), diagnose: [], pruefpunkte, zeilen: null };
  }

  return { pruefeSkript, musterLauf };
}

module.exports = { erzeugeSchreibPruefer, SANDBOX_ARTEN };
