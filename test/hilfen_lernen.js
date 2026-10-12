'use strict';
// Gemeinsame Helfer für test/lernen.test.js und test/rechte.test.js (Plan Phase 3 Task 5).
// App mit der Beispielakte (welt 9) und einem schnellen SQL-Prüfer-Stub (Vergleich mit der Musterlösung nach
// Whitespace-Normalisierung). Ein Integrationstest mit echter Sandbox steht in test/lernen.test.js.

const fs = require('node:fs');
const path = require('node:path');
const request = require('supertest');
const { erzeugeInhalte } = require('../src/services/inhalte');
const { testApp, meldeAn } = require('./helpers');

const FIXTURE = path.join(__dirname, 'fixtures', 'akte_beispiel.json');
/** Verzeichnis ohne Akten: nur die ausdrücklich genannten Dateien werden geladen. */
const KEINE_AKTEN = path.join(__dirname, 'fixtures', 'gibt-es-nicht');
const beispiel = () => JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));

const norm = (s) => String(s).replace(/\s+/g, ' ').trim().toLowerCase();

/** SQL-Prüfer-Stub mit der Schnittstelle von src/sql/pruefer.js (pruefeSql({ sql, aufgabe })). */
function stubPruefer() {
  const aufrufe = [];
  return {
    aufrufe,
    async pruefeSql({ sql, aufgabe }) {
      aufrufe.push({ sql, aufgabe });
      if (norm(sql) === norm(aufgabe.loesung.sql)) return { ok: true, diagnose: [], zeilen: 4 };
      return { ok: false, diagnose: [{ code: 'ZEILEN_FEHLEN', falle: 'P6', art: 'ergebnis', text: 'Es fehlen Zeilen.' }], zeilen: 2 };
    }
  };
}

/**
 * Testumgebung: App + Beispielakte. opt.dateien: weitere Akten-Dateien; opt.konfig: Konfig-Überschreibungen;
 * opt.pruefer: SQL-Prüfer (Standard: Stub); opt.optionen: weitere App-Optionen (z. B. warmupKarten).
 */
function umgebung(opt = {}) {
  const pruefer = opt.pruefer || stubPruefer();
  let inhalte;
  const t = testApp(opt.konfig || {}, (db) => {
    inhalte = erzeugeInhalte(db);
    inhalte.laden({ verzeichnis: KEINE_AKTEN, dateien: [FIXTURE, ...(opt.dateien || [])] });
    return { inhalte, pruefer, ...(opt.optionen || {}) };
  });
  return { ...t, inhalte, pruefer };
}

/** Kurs-Einstellungen setzen (Standard für Tests: Akte 9 freigeschaltet, eA). */
function einstellen(db, kursId, einstellungen) {
  const alt = JSON.parse(db.prepare('SELECT einstellungen FROM kurse WHERE kurs_id = ?').get(kursId).einstellungen);
  db.prepare('UPDATE kurse SET einstellungen = ? WHERE kurs_id = ?').run(JSON.stringify({ ...alt, ...einstellungen }), kursId);
}

const SCHUELERIN = { sub: 's:1042', rolle: 'schueler', name: 'Lena K.', kurse: [{ id: 'k:17', name: 'Inf-LK 12', rolle: 'mitglied' }] };
const SCHUELER2 = { sub: 's:1043', rolle: 'schueler', name: 'Mika R.', kurse: [{ id: 'k:17', name: 'Inf-LK 12', rolle: 'mitglied' }] };
const FREMD = { sub: 's:2001', rolle: 'schueler', name: 'Noa T.', kurse: [{ id: 'k:18', name: 'Inf-GK 12', rolle: 'mitglied' }] };
const LEHRKRAFT = { sub: 'l:7', rolle: 'lehrkraft', name: 'Frau M.', kurse: [{ id: 'k:17', name: 'Inf-LK 12', rolle: 'lehrkraft' }] };
const SUPERADMIN = { sub: 'a:1', rolle: 'superadmin', name: 'Admin', kurse: [] };

/** Anmelden und kleiner Client: get(pfad), post(pfad, body) mit Cookie und eigener Origin. */
async function client(u, wer) {
  const cookie = await meldeAn(u, wer);
  return {
    cookie,
    get: (p) => request(u.app).get(p).set('Cookie', cookie),
    post: (p, body) =>
      request(u.app)
        .post(p)
        .set('Cookie', cookie)
        .set('Origin', u.konfig.plattformUrl)
        .send(body === undefined ? {} : body)
  };
}

const K17 = '/api/kurse/' + encodeURIComponent('k:17');
const K18 = '/api/kurse/' + encodeURIComponent('k:18');

module.exports = {
  FIXTURE,
  KEINE_AKTEN,
  beispiel,
  stubPruefer,
  umgebung,
  einstellen,
  client,
  SCHUELERIN,
  SCHUELER2,
  FREMD,
  LEHRKRAFT,
  SUPERADMIN,
  K17,
  K18
};
