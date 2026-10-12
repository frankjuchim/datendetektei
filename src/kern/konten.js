'use strict';
// Konten, Kurse und Mitgliedschaften – ausschließlich aus dem SSO-Token (Vertrag §5) bzw. der Verbund-API (§6).
// Erwartet eine bereits geprüfte Nutzlast (Signatur, sub/rolle, Kurs-IDs prüft die SSO-Schicht).

const { AKTEN } = require('../domain');

const STANDARD_EINSTELLUNGEN = Object.freeze({
  akten: Object.freeze([1]),
  niveau: 'eA',
  verhoer: 'auto',
  scoreboard: false,
  beamer: false
});

/**
 * Tabellen mit Daten je Konto bzw. je Kurs, in Löschreihenfolge (abhängige zuerst; die Stammzeile zuletzt).
 * Spätere Phasen hängen hier ihre Lernstand-Tabellen an, damit Löschungen (Vertrag §6) vollständig bleiben.
 */
const KONTO_TABELLEN = ['mitgliedschaften', 'konten'];
const KURS_TABELLEN = ['mitgliedschaften', 'kurse'];

/** ISO-Zeitstempel ohne Millisekunden, z. B. 2026-10-11T10:00:00Z (Format Vertrag §6). */
function isoZeit(ms) {
  return new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function upsertAusToken(db, nutzlast, jetzt = Date.now) {
  const { sub, rolle, name } = nutzlast;
  const kurse = Array.isArray(nutzlast.kurse) ? nutzlast.kurse : [];
  const zuletzt = isoZeit(jetzt());
  db.transaction(() => {
    db.prepare(
      'INSERT INTO konten (sub, name, rolle, zuletzt) VALUES (?, ?, ?, ?) ' +
        'ON CONFLICT (sub) DO UPDATE SET name = excluded.name, rolle = excluded.rolle, zuletzt = excluded.zuletzt'
    ).run(sub, name, rolle, zuletzt);

    const kursUpsert = db.prepare(
      'INSERT INTO kurse (kurs_id, name, einstellungen) VALUES (?, ?, ?) ' +
        'ON CONFLICT (kurs_id) DO UPDATE SET name = excluded.name'
    );
    const mitgliedUpsert = db.prepare(
      'INSERT INTO mitgliedschaften (sub, kurs_id, rolle) VALUES (?, ?, ?) ' +
        'ON CONFLICT (sub, kurs_id) DO UPDATE SET rolle = excluded.rolle'
    );
    const einstellungen = JSON.stringify(STANDARD_EINSTELLUNGEN);
    for (const k of kurse) {
      kursUpsert.run(k.id, k.name, einstellungen);
      mitgliedUpsert.run(sub, k.id, k.rolle);
    }

    // Mitgliedschaften exakt auf die Token-Liste setzen (Lernstand bleibt bis zur Löschung, Vertrag §5).
    const ids = kurse.map((k) => k.id);
    db.prepare(
      'DELETE FROM mitgliedschaften WHERE sub = ? AND kurs_id NOT IN (SELECT value FROM json_each(?))'
    ).run(sub, JSON.stringify(ids));
  })();
  return { sub, rolle, name };
}

function loeschen(db, tabellen, spalte, wert) {
  return db.transaction(() => {
    let n = 0;
    for (const t of tabellen) n += db.prepare(`DELETE FROM ${t} WHERE ${spalte} = ?`).run(wert).changes;
    return n;
  })();
}

/** Alle Daten eines Kontos löschen; Anzahl gelöschter Zeilen (idempotent: zweiter Aufruf 0). */
function loescheKonto(db, sub) {
  return loeschen(db, KONTO_TABELLEN, 'sub', sub);
}

/** Alle Daten eines Kurses löschen (Konten bleiben); Anzahl gelöschter Zeilen. */
function loescheKurs(db, kursId) {
  return loeschen(db, KURS_TABELLEN, 'kurs_id', kursId);
}

/** Kursänderung aus dem Portal: unbekannter Kurs wird angelegt; aktiv false sperrt, true entsperrt. */
function aendereKurs(db, kursId, { name, aktiv } = {}) {
  db.transaction(() => {
    db.prepare('INSERT INTO kurse (kurs_id, name, einstellungen) VALUES (?, ?, ?) ON CONFLICT (kurs_id) DO NOTHING').run(
      kursId,
      typeof name === 'string' ? name : '',
      JSON.stringify(STANDARD_EINSTELLUNGEN)
    );
    if (typeof name === 'string') db.prepare('UPDATE kurse SET name = ? WHERE kurs_id = ?').run(name, kursId);
    if (typeof aktiv === 'boolean') db.prepare('UPDATE kurse SET aktiv = ? WHERE kurs_id = ?').run(aktiv ? 1 : 0, kursId);
  })();
}

/** Kennzahlen für das Portal (Vertrag §6) – nur sub und Zahlen, keine Namen. Phase 1: alle Werte 0. */
function kursUebersicht(db, kursId, jetzt = Date.now) {
  const kurs = db.prepare('SELECT kurs_id FROM kurse WHERE kurs_id = ?').get(kursId);
  if (!kurs) return null;
  const schueler = db
    .prepare(
      "SELECT k.sub, k.zuletzt FROM mitgliedschaften m, konten k WHERE m.sub = k.sub AND m.kurs_id = ? AND m.rolle = 'mitglied' ORDER BY k.sub"
    )
    .all(kursId)
    .map((z) => ({ sub: z.sub, punkte: 0, geloest: 0, anteil: 0, zuletzt: z.zuletzt }));
  return {
    kurs: kursId,
    stand: isoZeit(jetzt()),
    schueler,
    welten: AKTEN.map((a) => ({ nr: a.nr, titel: a.titel, anteil: 0 }))
  };
}

module.exports = {
  STANDARD_EINSTELLUNGEN,
  KONTO_TABELLEN,
  KURS_TABELLEN,
  isoZeit,
  upsertAusToken,
  loescheKonto,
  loescheKurs,
  aendereKurs,
  kursUebersicht
};
