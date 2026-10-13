#!/usr/bin/env node
'use strict';
// Inhalts-Validator (docs/AUFGABENFORMAT.md §8, Plan Phase 3 Task 3).
//   npm run validate                    → prüft seed/akten/*.json, seed/warmup/*.json, den Probefall
//                                         seed/gast/probefall.json (eigene Aufgaben, keine Texte aus seed/akten),
//                                         die Fallebene seed/fallebene.json (Beweisstücke, Steckbrief; AUFGABENFORMAT §11)
//                                         und die Material-Whitelists materialien/*/verzeichnis.json (Format =
//                                         Fehler; fehlende Dateien und Lösungen in der Gast-Auswahl = Hinweis)
//                                         sowie den Live-Modus seed/live/{pool,escape}.json (Transfer, Codes ableitbar)
//   node scripts/validate.js <datei> …  → prüft einzelne Dateien
//   Optionen: --json (maschinenlesbar), --ohne-hinweise (nur Fehler)
// Baut dazu die Übungs- und Verhör-DBs (ladeDatenbanken), eine Sandbox mit zwei Prozessen und den SQL-Prüfer.
// Exit-Code 1 bei Fehlern.

const fs = require('node:fs');
const path = require('node:path');
const { ladeDatenbanken } = require('../src/sql/datenbanken');
const { erzeugeSandbox } = require('../src/sql/sandbox');
const { erzeugePruefer } = require('../src/sql/pruefer');
const { validiereAkten, validiereProbefall, formatiere } = require('../src/content/validator');
const { pruefeFallebene } = require('../src/services/fallebene');
const { pruefeVerzeichnisse } = require('../src/services/material');

const SEED = path.join(__dirname, '..', 'seed');
const PROBEFALL = path.join(SEED, 'gast', 'probefall.json');
const FALLEBENE = path.join(SEED, 'fallebene.json');
const { validiereLive } = require('../src/content/live');

const LIVE = { pool: path.join(SEED, 'live', 'pool.json'), escape: path.join(SEED, 'live', 'escape.json') };

function jsonDateien(ordner) {
  if (!fs.existsSync(ordner)) return [];
  return fs
    .readdirSync(ordner)
    .filter((d) => d.toLowerCase().endsWith('.json'))
    .sort()
    .map((d) => path.join(ordner, d));
}

/** seed/fallebene.json: Format (AUFGABENFORMAT §11); auchNachPlaedoyer verweist auf eine Ermittlung mit Plädoyer. */
function pruefeFallebeneDatei(ergebnis, dateien) {
  const datei = 'fallebene.json';
  let d;
  try {
    d = JSON.parse(fs.readFileSync(FALLEBENE, 'utf8'));
  } catch (e) {
    ergebnis.fehler.push({ datei, text: `Kein gültiges JSON: ${e.message}` });
    return;
  }
  const r = pruefeFallebene(d);
  for (const text of r.fehler) ergebnis.fehler.push({ datei, text });
  for (const text of r.hinweise) ergebnis.hinweise.push({ datei, text });
  if (r.fehler.length) return;
  const mitPlaedoyer = new Set();
  for (const x of dateien) {
    try {
      const akte = JSON.parse(x.json);
      for (const l of Array.isArray(akte.levels) ? akte.levels : []) if (l && l.plaedoyer) mitPlaedoyer.add(l.id);
    } catch {
      /* Fehler meldet schon der Akten-Validator */
    }
  }
  for (const h of d.steckbrief.hinweise) {
    if (h.auchNachPlaedoyer && !mitPlaedoyer.has(h.auchNachPlaedoyer)) {
      ergebnis.hinweise.push({ datei, text: `Hinweis der Akte ${h.akte}: Ermittlung ${h.auchNachPlaedoyer} hat (noch) kein Plädoyer – es gilt nur Regel E10.` });
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const json = args.includes('--json');
  const ohneHinweise = args.includes('--ohne-hinweise');
  const unbekannt = args.filter((a) => a.startsWith('--') && a !== '--json' && a !== '--ohne-hinweise');
  if (unbekannt.length) {
    console.error(`Unbekannte Option(en): ${unbekannt.join(', ')} (erlaubt: --json, --ohne-hinweise)`);
    return 2;
  }
  let pfade = args.filter((a) => !a.startsWith('--'));
  const ohneArgumente = pfade.length === 0;
  if (ohneArgumente) pfade = [...jsonDateien(path.join(SEED, 'akten')), ...jsonDateien(path.join(SEED, 'warmup'))];

  const dateien = [];
  const lesefehler = [];
  for (const p of pfade) {
    try {
      dateien.push({ name: path.basename(p), json: fs.readFileSync(p, 'utf8') });
    } catch (e) {
      lesefehler.push({ datei: path.basename(p), text: `Datei nicht lesbar: ${e.code || e.message}` });
    }
  }

  let ergebnis = { fehler: [], hinweise: [], aufgaben: 0, karten: 0 };
  const mitProbefall = ohneArgumente && fs.existsSync(PROBEFALL);
  const live = {};
  if (ohneArgumente) for (const [k, p] of Object.entries(LIVE)) if (fs.existsSync(p)) live[k] = fs.readFileSync(p, 'utf8');
  const mitLive = Object.keys(live).length > 0;
  if (dateien.length || mitProbefall || mitLive) {
    const datenbanken = ladeDatenbanken(undefined, { log: () => {} });
    const roh = {};
    const schemata = {};
    for (const name of datenbanken.namen) {
      roh[name] = { haupt: datenbanken.haupt(name), varianten: datenbanken.varianten(name) };
      schemata[name] = datenbanken.schema(name);
    }
    const sandbox = erzeugeSandbox({ prozesse: 2, datenbanken: roh });
    try {
      const sqlPruefer = erzeugePruefer({ sandbox, schemata });
      ergebnis = await validiereAkten(dateien, { datenbanken, sandbox, sqlPruefer });
      if (mitProbefall) {
        const akten = dateien.filter((d) => !/^warmup/i.test(d.name));
        const r = await validiereProbefall(fs.readFileSync(PROBEFALL, 'utf8'), { datenbanken, sandbox, sqlPruefer }, { akten, datei: 'gast/probefall.json' });
        ergebnis.fehler.push(...r.fehler);
        ergebnis.hinweise.push(...r.hinweise);
        ergebnis.aufgaben += r.aufgaben;
      }
      if (mitLive) {
        const akten = dateien.filter((d) => !/^warmup/i.test(d.name));
        const r = await validiereLive(live, { datenbanken, sandbox, sqlPruefer }, { akten });
        ergebnis.fehler.push(...r.fehler);
        ergebnis.hinweise.push(...r.hinweise);
        ergebnis.aufgaben += r.aufgaben;
      }
    } finally {
      sandbox.beende();
    }
  }
  ergebnis.fehler.unshift(...lesefehler);
  if (ohneArgumente && fs.existsSync(FALLEBENE)) pruefeFallebeneDatei(ergebnis, dateien);
  if (ohneArgumente) {
    // Material-Whitelists (Phase 6 Task 5, docs/MATERIALIEN.md „Whitelists“)
    const m = pruefeVerzeichnisse();
    ergebnis.fehler.push(...m.fehler);
    ergebnis.hinweise.push(...m.hinweise);
  }
  if (ohneArgumente && !pfade.length) ergebnis.hinweise.push({ datei: 'seed', text: 'keine Akten in seed/akten und keine Warm-up-Karten in seed/warmup gefunden.' });

  if (json) {
    console.log(JSON.stringify(ohneHinweise ? { ...ergebnis, hinweise: [] } : ergebnis, null, 2));
  } else {
    if (ohneArgumente && !pfade.length) console.log('Keine Akten in seed/akten (und keine Warm-up-Karten in seed/warmup) – nichts zu prüfen.');
    console.log(formatiere(ergebnis, { hinweise: !ohneHinweise }));
  }
  return ergebnis.fehler.length ? 1 : 0;
}

main().then(
  (code) => {
    process.exitCode = code;
  },
  (e) => {
    console.error(`Validator abgebrochen: ${e.message}`);
    process.exitCode = 1;
  }
);
