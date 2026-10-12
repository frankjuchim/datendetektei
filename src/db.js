'use strict';
// Plattform-Datenbank (SQLite, better-sqlite3). Migrationen NUR ANHÄNGEN – nie bestehende ändern oder umsortieren.
// Die Schema-Version steht in meta.schema_version (= Anzahl angewendeter Migrationen).

const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

const MIGRATIONEN = [
  // 1: Konten, Kurse, Mitgliedschaften (Spec §7.15) – Konten/Kurse entstehen nur per Upsert aus dem SSO-Token.
  `
  CREATE TABLE konten (
    sub TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    rolle TEXT NOT NULL CHECK (rolle IN ('schueler', 'lehrkraft', 'superadmin')),
    zuletzt TEXT NOT NULL
  );
  CREATE TABLE kurse (
    kurs_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    aktiv INTEGER NOT NULL DEFAULT 1,
    einstellungen TEXT NOT NULL DEFAULT '{}',
    board_schluessel TEXT
  );
  CREATE TABLE mitgliedschaften (
    sub TEXT REFERENCES konten (sub) ON DELETE CASCADE,
    kurs_id TEXT REFERENCES kurse (kurs_id) ON DELETE CASCADE,
    rolle TEXT NOT NULL CHECK (rolle IN ('mitglied', 'lehrkraft')),
    PRIMARY KEY (sub, kurs_id)
  );
  CREATE INDEX mitgliedschaften_kurs ON mitgliedschaften (kurs_id);
  `
];

/** Datenbank öffnen (Datei oder ':memory:') und ausstehende Migrationen anwenden. */
function oeffneDb(pfad = ':memory:') {
  if (pfad !== ':memory:') fs.mkdirSync(path.dirname(path.resolve(pfad)), { recursive: true });
  const db = new Database(pfad);
  if (pfad !== ':memory:') db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec('CREATE TABLE IF NOT EXISTS meta (schluessel TEXT PRIMARY KEY, wert TEXT)');
  migriere(db);
  return db;
}

function migriere(db) {
  const zeile = db.prepare("SELECT wert FROM meta WHERE schluessel = 'schema_version'").get();
  const stand = zeile ? Number(zeile.wert) : 0;
  if (stand > MIGRATIONEN.length) {
    throw new Error(`Datenbank-Schema (${stand}) ist neuer als diese Programmversion (${MIGRATIONEN.length}).`);
  }
  const setzeVersion = db.prepare(
    "INSERT INTO meta (schluessel, wert) VALUES ('schema_version', ?) " +
      'ON CONFLICT (schluessel) DO UPDATE SET wert = excluded.wert'
  );
  for (let i = stand; i < MIGRATIONEN.length; i++) {
    db.transaction(() => {
      db.exec(MIGRATIONEN[i]);
      setzeVersion.run(String(i + 1));
    })();
  }
}

module.exports = { oeffneDb, MIGRATIONEN };
