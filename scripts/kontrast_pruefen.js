#!/usr/bin/env node
'use strict';
// Kontrastprüfung nach WCAG 2.1 (DESIGN.md §3): liest die Farb-Tokens aus public/static/css/tokens.css (hell von
// :root, dunkel = hell überschrieben von :root[data-theme="dark"]), prüft jede Paarung aus scripts/kontrast_paare.json
// (Soll 4.5 für Text, 3 für Grafik/Bedienelement-Ränder) und gibt eine ✔/✘-Liste aus. Exit 1 bei einem Verstoß.
// Aufruf: npm run kontrast   ·   als Modul: const { kontrastVerhaeltnis } = require('./scripts/kontrast_pruefen');

const fs = require('node:fs');
const path = require('node:path');

const TOKENS_DATEI = path.join(__dirname, '..', 'public', 'static', 'css', 'tokens.css');
const PAARE = Object.freeze(require('./kontrast_paare.json').paare.map((p) => Object.freeze({ ...p })));

/** '#RGB' oder '#RRGGBB' → [r, g, b] (0–255); sonst Fehler. */
function hexZuRgb(hex) {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex).trim());
  if (!m) throw new Error(`Keine Hex-Farbe: ${hex}`);
  const h = m[1].length === 3 ? [...m[1]].map((z) => z + z).join('') : m[1];
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

/** Relative Leuchtdichte nach WCAG 2.1. */
function leuchtdichte(hex) {
  const [r, g, b] = hexZuRgb(hex).map((k) => {
    const c = k / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Kontrastverhältnis (1 … 21), unabhängig von der Reihenfolge. */
function kontrastVerhaeltnis(hexA, hexB) {
  const la = leuchtdichte(hexA);
  const lb = leuchtdichte(hexB);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Inhalt des ersten Regelblocks nach dem Selektor (ohne verschachtelte Blöcke). */
function block(css, selektor) {
  const i = css.indexOf(selektor);
  if (i < 0) throw new Error(`tokens.css: Block „${selektor}“ fehlt.`);
  const auf = css.indexOf('{', i);
  return css.slice(auf + 1, css.indexOf('}', auf));
}

/** Hex-Farb-Tokens eines Blocks als { name: '#RRGGBB' } (Name ohne „--“). */
function farbTokens(text) {
  const ergebnis = {};
  for (const m of text.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/--([a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,6})\s*;/g)) {
    ergebnis[m[1]] = m[2].toUpperCase();
  }
  return ergebnis;
}

/** Tokens hell und dunkel aus tokens.css. */
function leseTokens(datei = TOKENS_DATEI) {
  const css = fs.readFileSync(datei, 'utf8');
  const hell = farbTokens(block(css, ':root {'));
  const dunkel = { ...hell, ...farbTokens(block(css, ':root[data-theme="dark"]')) };
  return { hell, dunkel };
}

/** Alle Paarungen prüfen → [{ modus, name, vorder, hinter, soll, verhaeltnis, ok }]. */
function pruefePaare(tokens, paare = PAARE) {
  return paare.map((p) => {
    const satz = tokens[p.modus];
    if (!satz) throw new Error(`Unbekannter Modus: ${p.modus}`);
    const v = satz[p.vorder];
    const h = satz[p.hinter];
    if (!v || !h) return { ...p, verhaeltnis: 0, ok: false, fehlt: !v ? p.vorder : p.hinter };
    const verhaeltnis = Math.round(kontrastVerhaeltnis(v, h) * 100) / 100;
    return { ...p, verhaeltnis, ok: verhaeltnis >= p.soll };
  });
}

function main() {
  const ergebnisse = pruefePaare(leseTokens());
  for (const e of ergebnisse) {
    const zeichen = e.ok ? '✔' : '✘';
    const wert = e.fehlt ? `Token --${e.fehlt} fehlt` : `${e.verhaeltnis.toFixed(2)} : 1 (Soll ${e.soll})`;
    console.log(`${zeichen} ${e.modus.padEnd(6)} ${e.vorder} auf ${e.hinter} – ${e.name}: ${wert}`);
  }
  const verstoesse = ergebnisse.filter((e) => !e.ok).length;
  console.log(
    verstoesse
      ? `✘ ${verstoesse} von ${ergebnisse.length} Paarungen verfehlen WCAG 2.1 AA.`
      : `Alle ${ergebnisse.length} Paarungen erfüllen WCAG 2.1 AA.`
  );
  process.exit(verstoesse ? 1 : 0);
}

if (require.main === module) main();
module.exports = { kontrastVerhaeltnis, leuchtdichte, leseTokens, pruefePaare, PAARE };
