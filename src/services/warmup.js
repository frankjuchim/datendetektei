'use strict';
// Warm-up-Trainer (Spec §7.8, AUFGABENFORMAT §9, Plan Phase 3 Task 8; Muster Algo Quest src/services/kata.js):
// Karten aus seed/warmup/*.json, Leitner mit 5 Fächern (Intervalle 0/1/3/7/14 Tage), Selbsteinschätzung
// gewusst (Fach + 1, höchstens 5) / teilweise (Fach bleibt) / nicht (Fach 1). Ohne Punkte.
//
// - Schüler sehen nur Karten der im Kurs freigeschalteten Akten (und nur Akten ihres Niveaus); Lehrkraft und
//   Superadmin alle. Filter nach Akte und Kategorie.
// - Die Karte geht ohne Lösung an den Browser (ohne loesung, loesungSql, falle); die Lösung erst über „aufdecken“.
// - Ziehen ist deterministisch: unter den fälligen Karten die mit dem kleinsten Fach, dann der frühesten Fälligkeit,
//   dann nach id; „ausser“ überspringt die gerade gezeigte Karte, wenn eine andere fällig ist.
// - Leitner-Stand je sub × Kurs (Tabelle leitner); neue Karten gelten als Fach 1, sofort fällig.

const fs = require('node:fs');
const path = require('node:path');
const { KATEGORIEN } = require('../content/format');
const { AKTEN } = require('../domain');
const { niveauSichtbar } = require('./stand');
const { HttpFehler } = require('./lernen');

const STANDARD_VERZEICHNIS = path.join(__dirname, '..', '..', 'seed', 'warmup');
const INTERVALLE_TAGE = Object.freeze({ 1: 0, 2: 1, 3: 3, 4: 7, 5: 14 });
const ERGEBNISSE = ['gewusst', 'teilweise', 'nicht'];
const TAG_MS = 86400000;
const NIE = '1970-01-01T00:00:00.000Z';

const istText = (v) => typeof v === 'string' && v.trim() !== '';

/** Karten einer Datei { version: 1, karten: [...] } prüfen (nur Struktur; den Rest prüft der Validator in CI). */
function kartenAus(data, datei) {
  if (!data || typeof data !== 'object' || data.version !== 1 || !Array.isArray(data.karten)) {
    throw new Error(`${datei}: { "version": 1, "karten": [ … ] } erwartet.`);
  }
  return data.karten.map((k, i) => {
    const wo = `${datei}: Karte ${i + 1}${k && typeof k.id === 'string' ? ` (${k.id})` : ''}`;
    if (!k || typeof k !== 'object') throw new Error(`${wo} ist kein Objekt.`);
    if (!/^W-A\d-\d{2}$/.test(String(k.id))) throw new Error(`${wo}: id muss W-A<n>-<nn> sein.`);
    if (!Number.isInteger(k.akte) || k.akte < 1 || k.akte > 99) throw new Error(`${wo}: akte fehlt.`);
    if (!KATEGORIEN.includes(k.kategorie)) throw new Error(`${wo}: unbekannte Kategorie.`);
    for (const f of ['titel', 'aufgabe', 'loesung']) if (!istText(k[f])) throw new Error(`${wo}: ${f} fehlt.`);
    return Object.freeze({
      id: k.id,
      akte: k.akte,
      kategorie: k.kategorie,
      titel: k.titel,
      aufgabe: k.aufgabe,
      sql: istText(k.sql) ? k.sql : null,
      datenbank: istText(k.datenbank) ? k.datenbank : null,
      loesung: k.loesung,
      loesungSql: istText(k.loesungSql) ? k.loesungSql : null,
      minuten: Number.isInteger(k.minuten) ? k.minuten : 2,
      kompetenz: Object.freeze(Array.isArray(k.kompetenz) ? [...k.kompetenz] : []),
      falle: Object.freeze(Array.isArray(k.falle) ? [...k.falle] : [])
    });
  });
}

/**
 * Karten laden: alle *.json im Verzeichnis (Standard seed/warmup) und die zusätzlich genannten Dateien.
 * Doppelte ids → Fehler. Ergebnis sortiert nach Akte und id.
 */
function ladeWarmupKarten({ verzeichnis = STANDARD_VERZEICHNIS, dateien = [] } = {}) {
  const pfade = [];
  if (fs.existsSync(verzeichnis)) {
    for (const f of fs.readdirSync(verzeichnis).sort()) if (f.endsWith('.json')) pfade.push(path.join(verzeichnis, f));
  }
  pfade.push(...dateien);
  const karten = new Map();
  for (const p of pfade) {
    const name = path.basename(p);
    for (const k of kartenAus(JSON.parse(fs.readFileSync(p, 'utf8')), name)) {
      if (karten.has(k.id)) throw new Error(`${name}: Karte ${k.id} kommt doppelt vor.`);
      karten.set(k.id, k);
    }
  }
  return [...karten.values()].sort((a, b) => a.akte - b.akte || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** Karte ohne Lösung (für den Browser). */
const oeffentlich = (k) => ({
  id: k.id,
  akte: k.akte,
  kategorie: k.kategorie,
  titel: k.titel,
  aufgabe: k.aufgabe,
  sql: k.sql,
  datenbank: k.datenbank,
  minuten: k.minuten,
  kompetenz: [...k.kompetenz]
});

/**
 * @param {{ db, lernen: { zugang }, stand: { istFreigeschaltet }, karten: object[], inhalte?, jetzt?: () => number }} opt
 */
function erzeugeWarmup({ db, lernen, stand, karten, inhalte = null, jetzt = Date.now }) {
  const nachId = new Map(karten.map((k) => [k.id, k]));
  const iso = (ms) => new Date(ms).toISOString();

  /** Darf diese Akte im Kurs gezeigt werden (Niveau für alle, Freischaltung für Schüler)? */
  function akteErlaubt(z, nr) {
    const plan = AKTEN.find((a) => a.nr === nr);
    if (plan && !plan.niveaus.includes(z.einst.niveau)) return false;
    const akte = inhalte ? inhalte.akte(nr) : null;
    if (akte && akte.levels.length && !akte.levels.some((l) => niveauSichtbar(z.einst.niveau, l.niveau))) return false;
    return z.rolle !== 'schueler' || stand.istFreigeschaltet(z.einst, nr);
  }

  function filterAus(quelle) {
    const q = quelle && typeof quelle === 'object' ? quelle : {};
    const f = {};
    if (q.akte !== undefined && q.akte !== null && q.akte !== '') {
      const nr = typeof q.akte === 'number' ? q.akte : /^\d{1,2}$/.test(String(q.akte)) ? Number(q.akte) : NaN;
      if (!Number.isInteger(nr) || nr < 1 || nr > 99) throw new HttpFehler(400, 'Ungültige Akte.');
      f.akte = nr;
    }
    if (q.kategorie !== undefined && q.kategorie !== null && q.kategorie !== '') {
      if (!KATEGORIEN.includes(q.kategorie)) throw new HttpFehler(400, 'Unbekannte Kategorie.');
      f.kategorie = q.kategorie;
    }
    return f;
  }

  /** Erlaubte Karten mit Leitner-Stand: [{ karte, fach, faellig, neu }]. */
  function kandidaten(z, f = {}) {
    const stand_ = new Map(
      db
        .prepare('SELECT karte, fach, faellig FROM leitner WHERE sub = ? AND kurs_id = ?')
        .all(z.sub, z.kurs.id)
        .map((r) => [r.karte, r])
    );
    return karten
      .filter((k) => akteErlaubt(z, k.akte))
      .filter((k) => (f.akte === undefined || k.akte === f.akte) && (f.kategorie === undefined || k.kategorie === f.kategorie))
      .map((k) => {
        const r = stand_.get(k.id);
        return { karte: k, fach: r ? r.fach : 1, faellig: r ? r.faellig : NIE, neu: !r };
      });
  }

  function karteFuer(z, id) {
    const k = nachId.get(String(id));
    if (!k || !akteErlaubt(z, k.akte)) throw new HttpFehler(404, 'Karte nicht gefunden.');
    return k;
  }

  function akteTitel(nr) {
    const a = inhalte ? inhalte.akte(nr) : null;
    if (a) return a.titel;
    const plan = AKTEN.find((x) => x.nr === nr);
    return plan ? plan.titel : `Akte ${nr}`;
  }

  /* ---------- Öffentliche Funktionen ---------- */

  /** Übersicht: Akten (Anzahl, fällig), Kategorien, Statistik (gesamt, neu, fällig, Fächer) – Filter wirkt auf die Statistik. */
  function uebersicht(sitzung, kursId, query) {
    const z = lernen.zugang(sitzung, kursId);
    const f = filterAus(query);
    const jetztIso = iso(jetzt());
    const alle = kandidaten(z);
    const akten = new Map();
    const kategorien = new Map();
    for (const c of alle) {
      const a = akten.get(c.karte.akte) || { nr: c.karte.akte, titel: akteTitel(c.karte.akte), anzahl: 0, faellig: 0 };
      a.anzahl++;
      if (c.faellig <= jetztIso) a.faellig++;
      akten.set(a.nr, a);
      kategorien.set(c.karte.kategorie, (kategorien.get(c.karte.kategorie) || 0) + 1);
    }
    const gefiltert = kandidaten(z, f);
    const faecher = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let neu = 0;
    let faellig = 0;
    for (const c of gefiltert) {
      if (c.neu) neu++;
      else faecher[c.fach]++;
      if (c.faellig <= jetztIso) faellig++;
    }
    return {
      akten: [...akten.values()].sort((a, b) => a.nr - b.nr),
      kategorien: KATEGORIEN.filter((k) => kategorien.has(k)).map((k) => ({ kategorie: k, anzahl: kategorien.get(k) })),
      statistik: { gesamt: gefiltert.length, neu, faellig, faecher },
      intervalle: { ...INTERVALLE_TAGE }
    };
  }

  /**
   * Nächste fällige Karte → { karte (ohne Lösung) | null, fach, neu, faellig, gesamt, grund?, naechsteFaelligkeit? }.
   * grund: 'keine_karten' (Filter leer) oder 'nichts_faellig'.
   */
  function ziehen(sitzung, kursId, body) {
    const z = lernen.zugang(sitzung, kursId);
    const b = body && typeof body === 'object' ? body : {};
    const f = filterAus(b);
    const ausser = typeof b.ausser === 'string' ? b.ausser : null;
    const jetztIso = iso(jetzt());
    const alle = kandidaten(z, f);
    if (!alle.length) return { karte: null, grund: 'keine_karten', faellig: 0, gesamt: 0 };
    let faellig = alle.filter((c) => c.faellig <= jetztIso);
    if (!faellig.length) {
      const naechste = alle.map((c) => c.faellig).sort()[0];
      return { karte: null, grund: 'nichts_faellig', naechsteFaelligkeit: naechste, faellig: 0, gesamt: alle.length };
    }
    const anzahl = faellig.length;
    if (ausser && faellig.length > 1) faellig = faellig.filter((c) => c.karte.id !== ausser);
    faellig.sort((a, b) => a.fach - b.fach || (a.faellig < b.faellig ? -1 : a.faellig > b.faellig ? 1 : 0) || (a.karte.id < b.karte.id ? -1 : 1));
    const c = faellig[0];
    return { karte: oeffentlich(c.karte), fach: c.fach, neu: c.neu, faellig: anzahl, gesamt: alle.length };
  }

  /** Lösung aufdecken → { id, loesung, loesungSql, datenbank, falle }. Ändert den Leitner-Stand nicht. */
  function aufdecken(sitzung, kursId, id) {
    const z = lernen.zugang(sitzung, kursId);
    const k = karteFuer(z, id);
    return { id: k.id, loesung: k.loesung, loesungSql: k.loesungSql, datenbank: k.datenbank, falle: [...k.falle] };
  }

  /** Selbsteinschätzung → { id, vorher, fach, faelligAb }. */
  function bewerten(sitzung, kursId, id, body) {
    const z = lernen.zugang(sitzung, kursId, { schreiben: true });
    const k = karteFuer(z, id);
    const ergebnis = body && typeof body === 'object' ? body.ergebnis : undefined;
    if (!ERGEBNISSE.includes(ergebnis)) throw new HttpFehler(400, 'Ungültige Selbsteinschätzung.');
    const alt = db.prepare('SELECT fach FROM leitner WHERE sub = ? AND kurs_id = ? AND karte = ?').get(z.sub, z.kurs.id, k.id);
    const vorher = alt ? alt.fach : 1;
    const fach = ergebnis === 'gewusst' ? Math.min(5, vorher + 1) : ergebnis === 'nicht' ? 1 : vorher;
    const faelligAb = iso(jetzt() + INTERVALLE_TAGE[fach] * TAG_MS);
    db.prepare(
      `INSERT INTO leitner (sub, kurs_id, karte, fach, faellig) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (sub, kurs_id, karte) DO UPDATE SET fach = excluded.fach, faellig = excluded.faellig`
    ).run(z.sub, z.kurs.id, k.id, fach, faelligAb);
    return { id: k.id, vorher, fach, faelligAb };
  }

  return { uebersicht, ziehen, aufdecken, bewerten };
}

module.exports = { ladeWarmupKarten, kartenAus, erzeugeWarmup, INTERVALLE_TAGE, ERGEBNISSE };
