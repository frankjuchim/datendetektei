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
  `,
  // 2: Lernkern (Spec §7.15, Plan Phase 3 Task 4). Inhalte aus dem Seed (akten, aufgaben) und Lernstand je sub × Kurs.
  // Lernstand verweist auf konten und kurse (nicht auf mitgliedschaften): er bleibt beim Austritt aus dem Kurs erhalten
  // und verschwindet erst mit der Löschung von Konto oder Kurs (Vertrag §5/§6). fehlabfragen ohne sub (Spec §7.14).
  `
  CREATE TABLE akten (
    nr INTEGER PRIMARY KEY,
    titel TEXT NOT NULL,
    farbe TEXT,
    json TEXT NOT NULL,
    datei TEXT NOT NULL,
    fingerabdruck TEXT NOT NULL,
    aktiv INTEGER NOT NULL DEFAULT 1,
    geaendert TEXT NOT NULL
  );
  CREATE TABLE aufgaben (
    id TEXT PRIMARY KEY,
    akte INTEGER NOT NULL,
    ermittlung TEXT,
    art TEXT NOT NULL CHECK (art IN ('lab', 'cc', 'verhoer')),
    stufe INTEGER NOT NULL,
    punkte INTEGER NOT NULL,
    json TEXT NOT NULL,
    fingerabdruck TEXT NOT NULL,
    aktiv INTEGER NOT NULL DEFAULT 1,
    geaendert TEXT NOT NULL DEFAULT ''
  );
  CREATE INDEX aufgaben_akte ON aufgaben (akte, aktiv);

  CREATE TABLE fortschritt (
    sub TEXT NOT NULL REFERENCES konten (sub) ON DELETE CASCADE,
    kurs_id TEXT NOT NULL REFERENCES kurse (kurs_id) ON DELETE CASCADE,
    aufgabe TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'offen' CHECK (status IN ('offen', 'geloest', 'angesehen', 'nachgeloest', 'bearbeitet')),
    fehlversuche INTEGER NOT NULL DEFAULT 0,
    tipps INTEGER NOT NULL DEFAULT 0,
    punkte INTEGER NOT NULL DEFAULT 0,
    zeit TEXT NOT NULL,
    PRIMARY KEY (sub, kurs_id, aufgabe)
  );
  CREATE INDEX fortschritt_kurs ON fortschritt (kurs_id, aufgabe);

  CREATE TABLE fallen_zaehler (
    sub TEXT NOT NULL REFERENCES konten (sub) ON DELETE CASCADE,
    kurs_id TEXT NOT NULL REFERENCES kurse (kurs_id) ON DELETE CASCADE,
    falle TEXT NOT NULL,
    anzahl INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (sub, kurs_id, falle)
  );
  CREATE INDEX fallen_zaehler_kurs ON fallen_zaehler (kurs_id);

  CREATE TABLE fehlabfragen (
    kurs_id TEXT NOT NULL REFERENCES kurse (kurs_id) ON DELETE CASCADE,
    aufgabe TEXT NOT NULL,
    sql_norm TEXT NOT NULL CHECK (length(sql_norm) <= 500),
    anzahl INTEGER NOT NULL DEFAULT 1,
    zuletzt TEXT NOT NULL DEFAULT '',
    PRIMARY KEY (kurs_id, aufgabe, sql_norm)
  );

  CREATE TABLE abzeichen (
    sub TEXT NOT NULL REFERENCES konten (sub) ON DELETE CASCADE,
    kurs_id TEXT NOT NULL REFERENCES kurse (kurs_id) ON DELETE CASCADE,
    abzeichen TEXT NOT NULL,
    zeit TEXT NOT NULL,
    PRIMARY KEY (sub, kurs_id, abzeichen)
  );
  CREATE INDEX abzeichen_kurs ON abzeichen (kurs_id);

  CREATE TABLE erfolge (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kurs_id TEXT NOT NULL REFERENCES kurse (kurs_id) ON DELETE CASCADE,
    sub TEXT NOT NULL REFERENCES konten (sub) ON DELETE CASCADE,
    art TEXT NOT NULL,
    zeit TEXT NOT NULL
  );
  CREATE INDEX erfolge_kurs ON erfolge (kurs_id, id);
  CREATE INDEX erfolge_sub ON erfolge (sub);

  CREATE TABLE verhoer_versuche (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sub TEXT NOT NULL REFERENCES konten (sub) ON DELETE CASCADE,
    kurs_id TEXT NOT NULL REFERENCES kurse (kurs_id) ON DELETE CASCADE,
    akte INTEGER NOT NULL,
    aufgaben_json TEXT NOT NULL,
    ergebnisse_json TEXT NOT NULL DEFAULT '{}',
    beginn TEXT NOT NULL,
    ende TEXT,
    punkte INTEGER NOT NULL DEFAULT 0,
    max INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX verhoer_versuche_sub ON verhoer_versuche (sub, kurs_id, akte);
  CREATE INDEX verhoer_versuche_kurs ON verhoer_versuche (kurs_id);

  CREATE TABLE leitner (
    sub TEXT NOT NULL REFERENCES konten (sub) ON DELETE CASCADE,
    kurs_id TEXT NOT NULL REFERENCES kurse (kurs_id) ON DELETE CASCADE,
    karte TEXT NOT NULL,
    fach INTEGER NOT NULL DEFAULT 1,
    faellig TEXT NOT NULL,
    PRIMARY KEY (sub, kurs_id, karte)
  );
  CREATE INDEX leitner_kurs ON leitner (kurs_id);

  CREATE TABLE training (
    sub TEXT NOT NULL REFERENCES konten (sub) ON DELETE CASCADE,
    kurs_id TEXT NOT NULL REFERENCES kurse (kurs_id) ON DELETE CASCADE,
    tag TEXT NOT NULL,
    anzahl INTEGER NOT NULL DEFAULT 0,
    punkte INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (sub, kurs_id, tag)
  );
  CREATE INDEX training_kurs ON training (kurs_id);

  CREATE TABLE kernpunkte (
    sub TEXT NOT NULL REFERENCES konten (sub) ON DELETE CASCADE,
    kurs_id TEXT NOT NULL REFERENCES kurse (kurs_id) ON DELETE CASCADE,
    aufgabe TEXT NOT NULL,
    haken INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (sub, kurs_id, aufgabe)
  );
  CREATE INDEX kernpunkte_kurs ON kernpunkte (kurs_id);
  `,
  // 3: Serie ohne Fehlversuch je sub × Kurs (Abzeichen „Zehnerserie“, Spec §8; Plan Phase 3 Task 5).
  `
  CREATE TABLE serien (
    sub TEXT NOT NULL REFERENCES konten (sub) ON DELETE CASCADE,
    kurs_id TEXT NOT NULL REFERENCES kurse (kurs_id) ON DELETE CASCADE,
    serie INTEGER NOT NULL DEFAULT 0,
    bestwert INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (sub, kurs_id)
  );
  CREATE INDEX serien_kurs ON serien (kurs_id);
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
