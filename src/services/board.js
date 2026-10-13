'use strict';
// Beamer-Board eines Kurses (Plan Phase 6 Task 3, Spec §7.12, DESIGN §5.12): öffentlich über einen geheimen
// Board-Schlüssel, nur wenn im Kurs eingeschaltet (Einstellung beamer) und der Kurs aktiv ist.
// Inhalt: Top 15 (Anzeigename, Punkte, Rang, Platz), Akten-Fortschritt des Kurses, letzte Erfolge (Tabelle erfolge).
// Keine sub, keine Kurs-ID; nur Schüler (Lehrkräfte und Superadmin erscheinen nie).

const crypto = require('node:crypto');
const { ABZEICHEN } = require('../domain');

const TOP = 15;
const ERFOLGE = 12;
/** 24 Byte = 192 Bit, base64url → 32 Zeichen. */
const SCHLUESSEL_BYTES = 24;
const SCHLUESSEL_MUSTER = /^[A-Za-z0-9_-]{32}$/;

/** Neuer Board-Schlüssel: kryptografisch zufällig, URL-sicher. */
const neuerBoardSchluessel = () => crypto.randomBytes(SCHLUESSEL_BYTES).toString('base64url');
const istBoardSchluessel = (s) => typeof s === 'string' && SCHLUESSEL_MUSTER.test(s);

function erzeugeBoard({ db, inhalte, stand, auswertung, jetzt = Date.now }) {
  /** Kurs zum Schlüssel, nur wenn das Board aktiv ist; sonst null. */
  function kursFuer(schluessel) {
    if (!istBoardSchluessel(schluessel)) return null;
    const z = db.prepare('SELECT kurs_id FROM kurse WHERE board_schluessel = ?').get(schluessel);
    if (!z) return null;
    const k = stand.kurs(z.kurs_id);
    if (!k || !k.aktiv || k.einstellungen.beamer !== true) return null;
    return k;
  }

  function erfolgSicht(e, name) {
    const [art, wert] = String(e.art).split(/:(.*)/s);
    const basis = { art, name, zeit: e.zeit };
    if (art === 'geloest') {
      const a = inhalte.aufgabe(wert);
      if (!a) return null;
      return { ...basis, aufgabe: a.id, titel: a.titel, stufe: a.stufe };
    }
    if (art === 'verhoer') {
      const akte = inhalte.akte(Number(wert));
      return { ...basis, akte: Number(wert), titel: akte && akte.boss ? akte.boss.titel : `Verhör ${wert}` };
    }
    if (art === 'abzeichen') {
      const m = /^(.*?)(?:-(\d+))?$/.exec(wert);
      const d = ABZEICHEN.find((x) => x.id === wert) || ABZEICHEN.find((x) => x.jeAkte && x.id === m[1]);
      if (!d) return null;
      return { ...basis, abzeichen: d.name, ...(d.jeAkte && m[2] ? { akte: Number(m[2]) } : {}) };
    }
    return null;
  }

  /** Board-Daten oder null (→ 404). */
  function daten(schluessel) {
    const k = kursFuer(schluessel);
    if (!k) return null;
    const d = auswertung.sammle(k.id);
    const namen = new Map(d.zeilen.map((z) => [z._sub, z.name]));
    const rangliste = [...d.zeilen]
      .sort((a, b) => a.platz - b.platz || a.nr - b.nr)
      .slice(0, TOP)
      .map((z) => ({ platz: z.platz, name: z.name, rang: z.rang, punkte: z.punkte.gesamt }));
    const welten = new Map(d.kz.welten.map((w) => [w.nr, w.anteil]));
    const akten = inhalte
      .akten()
      .filter((a) => stand.akteSichtbar(a, d.einst.niveau))
      .map((a) => ({ nr: a.nr, titel: a.titel, farbe: a.farbe || null, freigeschaltet: stand.istFreigeschaltet(d.einst, a.nr), anteil: welten.get(a.nr) || 0 }));
    const erfolge = [];
    const zeilen = db.prepare('SELECT sub, art, zeit FROM erfolge WHERE kurs_id = ? ORDER BY id DESC LIMIT 200').all(k.id);
    for (const e of zeilen) {
      if (erfolge.length >= ERFOLGE) break;
      if (!namen.has(e.sub)) continue; // nur aktuelle Schüler des Kurses
      const s = erfolgSicht(e, namen.get(e.sub));
      if (s) erfolge.push(s);
    }
    return { kurs: { name: k.name }, zeit: new Date(jetzt()).toISOString().replace(/\.\d{3}Z$/, 'Z'), rangliste, akten, erfolge };
  }

  return { daten, kursFuer };
}

module.exports = { erzeugeBoard, neuerBoardSchluessel, istBoardSchluessel, SCHLUESSEL_MUSTER };
