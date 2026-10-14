'use strict';
// Startpunkt: Konfiguration laden (Abbruch mit lesbarer Meldung), App erzeugen, Port öffnen.

const path = require('node:path');
const { ladeKonfig } = require('./kern/konfig');
const { oeffneDb } = require('./db');
const { erzeugeApp } = require('./app');
const { ladeDatenbanken } = require('./sql/datenbanken');
const { erzeugeSandbox } = require('./sql/sandbox');
const { erzeugeInhalte } = require('./services/inhalte');
const { erzeugePruefer } = require('./sql/pruefer');
const { ladeWarmupKarten } = require('./services/warmup');
const { ladeLiveInhalte } = require('./content/live');

let konfig;
try {
  konfig = ladeKonfig();
} catch (err) {
  console.error(`Start abgebrochen. ${err.message}`);
  process.exit(1);
}

let db;
try {
  db = oeffneDb(path.join(konfig.dataDir, 'plattform.sqlite'));
} catch (err) {
  console.error(`Start abgebrochen. Datenbank nicht nutzbar: ${err.message}`);
  process.exit(1);
}

// Übungs-Datenbanken einmal laden (basis.sql + Varianten, Prüfsumme im Kopf); Startzeit steht im Log.
let datenbanken;
try {
  datenbanken = ladeDatenbanken();
} catch (err) {
  console.error(`Start abgebrochen. Übungs-Datenbanken nicht nutzbar: ${err.message}`);
  process.exit(1);
}

// Sandbox (Kindprozesse) für Schüler-SQL auf dem Server: Haupt-DBs und Varianten als Buffer (Spec §7.4, §18).
// Anzahl der Prozesse aus SANDBOX_PROZESSE (Standard min(4, max(2, Kerne − 1)), Sicherheitsprüfung Phase 8 F3).
const sandbox = erzeugeSandbox({
  prozesse: konfig.sandboxProzesse,
  datenbanken: Object.fromEntries(
    datenbanken.namen.map((name) => [name, { haupt: datenbanken.haupt(name), varianten: datenbanken.varianten(name) }])
  )
});
// SQL-Prüfer für die Interaktion sql (Spec §7.4): Sandbox + Schemata (für Diagnosen wie KREUZPRODUKT).
const pruefer = erzeugePruefer({
  sandbox,
  schemata: Object.fromEntries(datenbanken.namen.map((name) => [name, datenbanken.schema(name)]))
});

// Akten aus seed/akten/*.json einspielen (Upsert, fehlertolerant; der Seed-Bericht steht im Log und im Speicher).
// AKTEN_DATEIEN (kommasepariert): zusätzliche Akten-Dateien für Tests/Entwicklung, z. B. test/fixtures/akte_beispiel.json.
const AKTEN_DATEIEN = (process.env.AKTEN_DATEIEN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
  .map((f) => path.resolve(f));
const inhalte = erzeugeInhalte(db, { log: (zeile) => console.log(zeile) });
try {
  inhalte.laden({ dateien: AKTEN_DATEIEN });
} catch (err) {
  console.error(`Akten konnten nicht geladen werden (letzter Stand bleibt): ${err.message}`);
}

// Warm-up-Karten aus seed/warmup/*.json (bei Fehlern startet die Plattform ohne Warm-up-Trainer).
let warmupKarten = null;
try {
  warmupKarten = ladeWarmupKarten();
} catch (err) {
  console.error(`Warm-up-Karten konnten nicht geladen werden: ${err.message}`);
}

// Live-Modus (Duell, Escape Room) aus seed/live; Codes der Stationen werden hier aus den Lösungen berechnet.
let liveInhalte = null;
try {
  liveInhalte = ladeLiveInhalte({ datenbanken, log: (zeile) => console.log(zeile) });
} catch (err) {
  console.error(`Live-Inhalte konnten nicht geladen werden: ${err.message}`);
}

const app = erzeugeApp(konfig, db, { datenbanken, sandbox, inhalte, pruefer, warmupKarten, liveInhalte });
const server = app.listen(konfig.port, () => {
  console.log(`Datendetektei läuft auf Port ${konfig.port}`);
});

function beenden() {
  sandbox.beende();
  server.close(() => {
    db.close();
    process.exit(0);
  });
}
process.on('SIGTERM', beenden);
process.on('SIGINT', beenden);
