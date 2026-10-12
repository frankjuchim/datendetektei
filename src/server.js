'use strict';
// Startpunkt: Konfiguration laden (Abbruch mit lesbarer Meldung), App erzeugen, Port öffnen.

const path = require('node:path');
const { ladeKonfig } = require('./kern/konfig');
const { oeffneDb } = require('./db');
const { erzeugeApp } = require('./app');
const { ladeDatenbanken } = require('./sql/datenbanken');

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

const app = erzeugeApp(konfig, db, { datenbanken });
const server = app.listen(konfig.port, () => {
  console.log(`Datendetektei läuft auf Port ${konfig.port}`);
});

function beenden() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}
process.on('SIGTERM', beenden);
process.on('SIGINT', beenden);
