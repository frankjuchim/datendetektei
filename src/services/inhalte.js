'use strict';
// Inhalte: Seed der Akten-Dateien (seed/akten/*.json, Format docs/AUFGABENFORMAT.md) in die Plattform-DB und
// Katalog im Speicher (Muster: Algo Quest src/services/inhalte.js).
//
// Seed: Upsert nach id, Fingerabdruck (SHA-256 des kanonischen JSON) – unveränderte Dateien werden übersprungen;
// fehlende Aufgaben werden deaktiviert (aktiv = 0), nie gelöscht (Lernstand bleibt gültig). Fehlertolerant: eine Datei
// mit Fehler auf Dateiebene wird übersprungen (die zuletzt geladene Fassung bleibt), einzelne fehlerhafte Aufgaben
// werden ausgelassen. Hier laufen nur einfache Struktur-Prüfungen – der vollständige Validator
// (src/content/validator.js, `npm run validate`) läuft in CI.
//
// Sicherheit (Vertrag §9, AUFGABENFORMAT 4.2): aufgabe(id) ist die interne Sicht mit Lösung; an den Browser geht nur
// aufgabeOeffentlich(id) – ohne loesung, erklaerung, tipps, varianten, sortierung, aliasPflicht, Kernpunkte und
// Herkunftsabfragen (dbtabelle.quelle); bei zellen/anomalie/zerlegen/schema/er nur die Felder aus
// modellierung.OEFFENTLICHE_FELDER. Zugriffsrechte (Kurs, Freischaltung, laufendes Verhör) prüfen die Routen.

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const F = require('../content/format');
const M = require('../content/modellierung');
const PL = require('../content/plaedoyer');
const { STANDARD_UMFANG } = require('../kern/manifest');
const { AKTEN } = require('../domain');

/**
 * Reine Zählung über geladene Akten: welten, level (Ermittlungen; Akte 7 „Generalprobe“ ist ein Level ohne
 * Ermittlungen, Spec §10), aufgaben (Lab-Aufgaben der Ermittlungen, ohne Cold Cases), bosse (Akten mit Verhör-Pool).
 */
function umfangVon(akten) {
  return {
    welten: akten.length,
    level: akten.reduce((s, a) => s + (a.levels.length || (a.nr === 7 ? 1 : 0)), 0),
    aufgaben: akten.reduce((s, a) => s + a.levels.reduce((t, l) => t + l.aufgaben.length, 0), 0),
    bosse: akten.filter((a) => a.boss && a.boss.pool.length > 0).length
  };
}

const STANDARD_VERZEICHNIS = path.join(__dirname, '..', '..', 'seed', 'akten');
/** Teil des Fingerabdrucks: ändert sich die Lade-Logik, wird jede Datei einmal neu eingespielt. */
const SEED_VERSION = 'akten-2'; // akten-2: Ermittlungen behalten plaedoyer (Phase 6)
const STUFEN_PUNKTE = Object.freeze({ 1: 10, 2: 20, 3: 30 });
// Kür K1 (Phase 6 Task 7): ids K1-E<k>-<nn> bzw. Ermittlung K1-E<k> (DS_PLANUNG); Datei mit kuer: true, welt 8.
const ID_RE = /^(?:A\d{1,2}-(?:E\d{1,2}-(?:\d{2,3}|CC)|V-\d{2,3})|K\d-E\d{1,2}-(?:\d{2,3}|CC))$/;
const LEVEL_ID_RE = /^(?:A\d{1,2}|K\d)-E\d{1,2}$/;
/** Felder einer Interaktion, die nie an den Browser gehen. */
const GEHEIME_INTERAKTIONSFELDER = ['varianten', 'sortierung', 'aliasPflicht', 'kernpunkte', 'loesung', 'quelleSql', 'erklaerung', 'tipps'];

/* ---------- Hilfen ---------- */

/** Kanonisches JSON: Objektschlüssel sortiert, sonst JSON.stringify. */
function kanonisch(wert) {
  if (Array.isArray(wert)) return '[' + wert.map((w) => (w === undefined ? 'null' : kanonisch(w))).join(',') + ']';
  if (wert && typeof wert === 'object') {
    const teile = Object.keys(wert)
      .filter((k) => wert[k] !== undefined)
      .sort()
      .map((k) => JSON.stringify(k) + ':' + kanonisch(wert[k]));
    return '{' + teile.join(',') + '}';
  }
  return JSON.stringify(wert);
}

function fingerabdruck(wert) {
  return crypto.createHash('sha256').update(SEED_VERSION + '\n' + kanonisch(wert)).digest('hex');
}

/** Objekte und Listen rekursiv einfrieren; bei Maps die Werte (die Map selbst bleibt intern). */
function tiefGefroren(wert) {
  if (wert instanceof Map) {
    for (const v of wert.values()) tiefGefroren(v);
  } else if (wert && typeof wert === 'object' && !Object.isFrozen(wert)) {
    Object.freeze(wert);
    for (const v of Object.values(wert)) tiefGefroren(v);
  }
  return wert;
}

const istObjekt = (w) => w !== null && typeof w === 'object' && !Array.isArray(w);
const istText = (w) => typeof w === 'string' && w.trim().length > 0;
const isoJetzt = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

/** Art einer Aufgabe allein aus der id (für nicht zugeordnete Aufgaben). */
function artAusId(id) {
  if (/-CC$/.test(id)) return 'cc';
  if (/-V-/.test(id)) return 'verhoer';
  return 'lab';
}

/** Nur kernpunkte-Teile → keine Lösung nötig, 0 Punkte. */
function nurKernpunkte(a) {
  return [].concat(a.interaktion).every((ia) => F.artVon(ia) === 'kernpunkte');
}

/** Punkte einer Aufgabe: Angabe oder Standard je Stufe; Cold Case und kernpunkte immer 0. */
function punkteVon(a, art) {
  if (art === 'cc' || nurKernpunkte(a)) return 0;
  if (Number.isInteger(a.punkte) && a.punkte >= 0) return a.punkte;
  return STUFEN_PUNKTE[a.stufe] || 0;
}

/* ---------- Struktur-Prüfungen (einfach; vollständig prüft der Validator) ---------- */

/** Fehler auf Dateiebene (Datei wird übersprungen) – leere Liste = in Ordnung. */
function dateiFehler(d) {
  const f = [];
  if (!istObjekt(d)) return ['Die Datei enthält kein JSON-Objekt.'];
  if (d.version !== 2) f.push('version muss 2 sein.');
  if (!Number.isInteger(d.welt) || d.welt < 1 || d.welt > 99) f.push('welt muss eine Aktennummer (ganze Zahl) sein.');
  if (!istText(d.titel)) f.push('titel fehlt.');
  if (!Array.isArray(d.levels)) f.push('levels muss eine Liste sein.');
  else if (d.levels.some((l) => !istObjekt(l) || typeof l.id !== 'string' || !LEVEL_ID_RE.test(l.id))) {
    f.push('Jede Ermittlung braucht eine id der Form A<n>-E<k>.');
  }
  if (!Array.isArray(d.aufgaben)) f.push('aufgaben muss eine Liste sein.');
  if (d.boss !== undefined && d.boss !== null && !(istObjekt(d.boss) && Array.isArray(d.boss.pool))) {
    f.push('boss muss ein Objekt mit pool (Liste) sein.');
  }
  return f;
}

/** Fehler einer Aufgabe (Aufgabe wird ausgelassen) – leere Liste = in Ordnung. */
function aufgabeFehler(a) {
  const f = [];
  if (!istObjekt(a)) return ['keine Aufgabe (Objekt erwartet).'];
  if (typeof a.id !== 'string' || !ID_RE.test(a.id)) f.push('id fehlt oder hat nicht die Form A<n>-E<k>-<nn>, A<n>-E<k>-CC bzw. A<n>-V-<nn>.');
  if (!istText(a.titel)) f.push('titel fehlt.');
  if (![1, 2, 3].includes(a.stufe)) f.push('stufe muss 1, 2 oder 3 sein.');
  if (!F.KATEGORIEN.includes(a.kategorie)) f.push(`unbekannte kategorie „${a.kategorie}“.`);
  if (a.punkte !== undefined && !(Number.isInteger(a.punkte) && a.punkte >= 0)) f.push('punkte muss eine ganze Zahl ≥ 0 sein.');
  if (a.niveau !== undefined && !F.NIVEAUS.includes(a.niveau)) f.push('niveau muss „alle“ oder „eA“ sein.');
  if (a.fallen !== undefined && !(Array.isArray(a.fallen) && a.fallen.every((x) => F.FALLEN.includes(x)))) {
    f.push('fallen muss eine Liste aus P1 … P10 sein.');
  }
  if (!Array.isArray(a.inhalt)) f.push('inhalt muss eine Liste von Blöcken sein.');
  else if (a.inhalt.some((b) => !istObjekt(b) || !F.BLOCK_TYPEN.includes(b.t))) f.push('inhalt enthält einen unbekannten Block.');
  const teile = Array.isArray(a.interaktion) ? a.interaktion : [a.interaktion];
  if (teile.length === 0 || teile.some((ia) => !istObjekt(ia) || !F.INTERAKTIONEN.includes(ia.kind))) {
    f.push('interaktion fehlt oder ist unbekannt.');
  } else {
    for (const ia of teile) {
      if (ia.inhalt !== undefined && !(Array.isArray(ia.inhalt) && ia.inhalt.every((b) => istObjekt(b) && F.BLOCK_TYPEN.includes(b.t)))) {
        f.push('inhalt eines Teils enthält einen unbekannten Block.');
      }
    }
    if (!nurKernpunkte(a)) {
      if (a.loesung === undefined || a.loesung === null) f.push('loesung fehlt.');
      else if (Array.isArray(a.interaktion) && !(Array.isArray(a.loesung) && a.loesung.length === a.interaktion.length)) {
        f.push('loesung muss bei mehrteiligen Aufgaben eine Liste gleicher Länge sein.');
      }
    }
  }
  if (a.tipps !== undefined && !(Array.isArray(a.tipps) && a.tipps.every((t) => typeof t === 'string'))) f.push('tipps muss eine Liste von Texten sein.');
  if (a.erklaerung !== undefined && !Array.isArray(a.erklaerung)) f.push('erklaerung muss eine Liste von Blöcken sein.');
  // Verhöre zeigen nie Verstehenshilfen (Phase 4; der Validator meldet das ausführlich)
  if (typeof a.id === 'string' && /-V-\d/.test(a.id)) {
    const listen = [a.inhalt, a.erklaerung, ...teile.map((ia) => (istObjekt(ia) ? ia.inhalt : null))];
    if (listen.some((l) => Array.isArray(l) && l.some((b) => istObjekt(b) && F.WERKZEUG_BLOECKE.includes(b.t)))) {
      f.push('Im Verhör gibt es keine Verstehenshilfen (Zeitlupe, Spurenbrett, Sortierfächer).');
    }
  }
  return f;
}

/* ---------- Seed ---------- */

function dateiListe(verzeichnis, dateien) {
  const liste = [];
  let eintraege = [];
  try {
    eintraege = fs.readdirSync(verzeichnis).filter((n) => n.endsWith('.json')).sort();
  } catch {
    eintraege = []; // Verzeichnis fehlt: keine Akten (die App startet trotzdem)
  }
  for (const n of eintraege) liste.push(path.resolve(verzeichnis, n));
  for (const d of dateien || []) {
    const p = path.resolve(d);
    if (!liste.includes(p)) liste.push(p);
  }
  return liste;
}

/** Bereinigte Akten-Daten (ohne Aufgaben) für die Tabelle akten. */
function aktenDaten(d, gut) {
  const levels = d.levels.map((l) => ({
    id: l.id,
    nr: l.nr !== undefined ? String(l.nr) : '',
    titel: istText(l.titel) ? l.titel : l.id,
    ds: Array.isArray(l.ds) ? l.ds.filter(Number.isInteger) : [],
    ab: typeof l.ab === 'string' ? l.ab : '',
    niveau: F.NIVEAUS.includes(l.niveau) ? l.niveau : 'alle',
    briefing: typeof l.briefing === 'string' ? l.briefing : '',
    intro: Array.isArray(l.intro) ? l.intro : [],
    coldCase: typeof l.coldCase === 'string' && gut.has(l.coldCase) ? l.coldCase : null,
    aufgaben: (Array.isArray(l.aufgaben) ? l.aufgaben : []).filter((id) => gut.has(id)),
    // Schlussplädoyer (AUFGABENFORMAT §2.1): Indizien und Auflösung sind Lösungsdaten – nur intern, nie roh an den Browser
    plaedoyer: istObjekt(l.plaedoyer) ? l.plaedoyer : null
  }));
  let boss = null;
  if (istObjekt(d.boss)) {
    boss = { ...d.boss, niveau: F.NIVEAUS.includes(d.boss.niveau) ? d.boss.niveau : 'alle', pool: d.boss.pool.filter((id) => gut.has(id)) };
  }
  return { version: 2, welt: d.welt, titel: d.titel, farbe: typeof d.farbe === 'string' ? d.farbe : null, kuer: d.kuer === true, levels, boss };
}

/**
 * Akten-Dateien einspielen.
 * @param {import('better-sqlite3').Database} db
 * @param {{ verzeichnis?: string, dateien?: string[], log?: (zeile: string) => void, jetzt?: () => string }} [opt]
 * @returns {{ zeit: string, dateien: object[], entfernt: number[] }} Seed-Bericht
 */
function ladeInhalte(db, { verzeichnis = STANDARD_VERZEICHNIS, dateien = [], log = () => {}, jetzt = isoJetzt } = {}) {
  const zeit = jetzt();
  const bericht = { zeit, dateien: [], entfernt: [] };
  const gesehen = new Set(); // Aktennummern dieses Laufs
  const versucht = new Set(); // alle Dateipfade dieses Laufs (auch übersprungene)

  const aktivIds = db.prepare('SELECT id FROM aufgaben WHERE akte = ? AND aktiv = 1');
  const fremd = db.prepare('SELECT akte FROM aufgaben WHERE id = ? AND akte != ? AND aktiv = 1');
  const aktenZeile = db.prepare('SELECT fingerabdruck, aktiv FROM akten WHERE nr = ?');

  for (const datei of dateiListe(verzeichnis, dateien)) {
    versucht.add(datei);
    const r = { datei, welt: null, status: 'geladen', fehler: [], aufgaben: 0, ausgelassen: 0, deaktiviert: 0 };
    bericht.dateien.push(r);
    let d;
    try {
      let text = fs.readFileSync(datei, 'utf8');
      if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
      d = JSON.parse(text);
    } catch (e) {
      r.status = 'uebersprungen';
      r.fehler.push(e.code === 'ENOENT' ? 'Datei nicht gefunden.' : 'Kein gültiges JSON.');
      continue;
    }
    const df = dateiFehler(d);
    if (df.length) {
      r.status = 'uebersprungen';
      r.fehler.push(...df);
      continue;
    }
    r.welt = d.welt;
    if (gesehen.has(d.welt)) {
      r.status = 'uebersprungen';
      r.fehler.push(`Akte ${d.welt} kommt in diesem Lauf schon in einer anderen Datei vor.`);
      continue;
    }
    gesehen.add(d.welt);

    const fp = fingerabdruck(d);
    const vorher = aktenZeile.get(d.welt);
    if (vorher && vorher.aktiv === 1 && vorher.fingerabdruck === fp) {
      r.status = 'unveraendert';
      r.aufgaben = aktivIds.all(d.welt).length;
      db.prepare('UPDATE akten SET datei = ? WHERE nr = ?').run(datei, d.welt);
      continue;
    }

    // Aufgaben prüfen; fehlerhafte und doppelte auslassen
    const gute = [];
    const gut = new Set();
    for (const a of d.aufgaben) {
      const fehler = aufgabeFehler(a);
      const ort = istObjekt(a) && typeof a.id === 'string' ? a.id : '(ohne id)';
      if (!fehler.length && gut.has(a.id)) fehler.push('id kommt in der Datei mehrfach vor.');
      if (!fehler.length) {
        const f = fremd.get(a.id, d.welt);
        if (f) fehler.push(`id ist schon in Akte ${f.akte} vergeben.`);
      }
      if (fehler.length) {
        r.ausgelassen++;
        r.fehler.push(...fehler.map((x) => `${ort}: ${x}`));
        continue;
      }
      gute.push(a);
      gut.add(a.id);
    }

    const akte = aktenDaten(d, gut);
    const ermittlungVon = new Map(); // id → [ermittlung, art]
    for (const l of akte.levels) {
      for (const id of l.aufgaben) if (!ermittlungVon.has(id) && !/-CC$|-V-/.test(id)) ermittlungVon.set(id, [l.id, 'lab']);
    }
    for (const l of akte.levels) if (l.coldCase && !ermittlungVon.has(l.coldCase)) ermittlungVon.set(l.coldCase, [l.id, 'cc']);
    if (akte.boss) for (const id of akte.boss.pool) if (!ermittlungVon.has(id)) ermittlungVon.set(id, [null, 'verhoer']);
    // Verweise auf ausgelassene oder anders zugeordnete Aufgaben aus Ermittlungen und Pool entfernen
    for (const l of akte.levels) {
      l.aufgaben = l.aufgaben.filter((id) => (ermittlungVon.get(id) || [])[0] === l.id && ermittlungVon.get(id)[1] === 'lab');
      if (l.coldCase && (ermittlungVon.get(l.coldCase) || [])[1] !== 'cc') l.coldCase = null;
    }
    if (akte.boss) akte.boss.pool = akte.boss.pool.filter((id) => (ermittlungVon.get(id) || [])[1] === 'verhoer');

    const vorherAktiv = new Set(aktivIds.all(d.welt).map((z) => z.id));
    db.transaction(() => {
      db.prepare(
        `INSERT INTO akten (nr, titel, farbe, json, datei, fingerabdruck, aktiv, geaendert) VALUES (?, ?, ?, ?, ?, ?, 1, ?)
         ON CONFLICT (nr) DO UPDATE SET titel = excluded.titel, farbe = excluded.farbe, json = excluded.json,
           datei = excluded.datei, fingerabdruck = excluded.fingerabdruck, aktiv = 1, geaendert = excluded.geaendert`
      ).run(d.welt, d.titel, akte.farbe, JSON.stringify(akte), datei, fp, zeit);
      db.prepare('UPDATE aufgaben SET aktiv = 0 WHERE akte = ?').run(d.welt);
      const alt = db.prepare('SELECT fingerabdruck, geaendert FROM aufgaben WHERE id = ?');
      const upsert = db.prepare(
        `INSERT INTO aufgaben (id, akte, ermittlung, art, stufe, punkte, json, fingerabdruck, aktiv, geaendert)
         VALUES (@id, @akte, @ermittlung, @art, @stufe, @punkte, @json, @fingerabdruck, @aktiv, @geaendert)
         ON CONFLICT (id) DO UPDATE SET akte = excluded.akte, ermittlung = excluded.ermittlung, art = excluded.art,
           stufe = excluded.stufe, punkte = excluded.punkte, json = excluded.json, fingerabdruck = excluded.fingerabdruck,
           aktiv = excluded.aktiv, geaendert = excluded.geaendert`
      );
      for (const a of gute) {
        const [ermittlung, art] = ermittlungVon.get(a.id) || [null, artAusId(a.id)];
        const afp = fingerabdruck(a);
        const bisher = alt.get(a.id);
        upsert.run({
          id: a.id,
          akte: d.welt,
          ermittlung,
          art,
          stufe: a.stufe,
          punkte: punkteVon(a, art),
          json: JSON.stringify(a),
          fingerabdruck: afp,
          aktiv: ermittlungVon.has(a.id) ? 1 : 0,
          geaendert: bisher && bisher.fingerabdruck === afp ? bisher.geaendert : zeit
        });
        if (ermittlungVon.has(a.id)) r.aufgaben++;
      }
    })();
    const nachher = new Set(aktivIds.all(d.welt).map((z) => z.id));
    r.deaktiviert = [...vorherAktiv].filter((id) => !nachher.has(id)).length;
  }

  // Akten, deren Datei in diesem Lauf nicht mehr vorkommt, samt Aufgaben deaktivieren (nicht löschen).
  for (const z of db.prepare('SELECT nr, datei FROM akten WHERE aktiv = 1 ORDER BY nr').all()) {
    if (gesehen.has(z.nr) || versucht.has(z.datei)) continue;
    db.transaction(() => {
      db.prepare('UPDATE akten SET aktiv = 0 WHERE nr = ?').run(z.nr);
      db.prepare('UPDATE aufgaben SET aktiv = 0 WHERE akte = ?').run(z.nr);
    })();
    bericht.entfernt.push(z.nr);
  }

  for (const r of bericht.dateien) {
    const name = path.basename(r.datei);
    log(
      `Akten-Seed ${name}: ${r.status}` +
        (r.welt !== null ? ` (Akte ${r.welt}, ${r.aufgaben} Aufgaben aktiv` + (r.ausgelassen ? `, ${r.ausgelassen} ausgelassen` : '') + ')' : '')
    );
    for (const f of r.fehler) log(`  ${name}: ${f}`);
  }
  for (const nr of bericht.entfernt) log(`Akten-Seed: Akte ${nr} nicht mehr vorhanden – deaktiviert.`);
  return bericht;
}

/* ---------- Katalog ---------- */

function baueKatalog(db) {
  const aufgaben = new Map();
  const akten = new Map();
  const ermittlungen = new Map();
  const zeilen = db.prepare('SELECT id, akte, ermittlung, art, punkte, json FROM aufgaben WHERE aktiv = 1').all();
  const roh = new Map();
  for (const z of zeilen) {
    try {
      roh.set(z.id, { zeile: z, daten: JSON.parse(z.json) });
    } catch {
      /* beschädigte Zeile überspringen */
    }
  }
  for (const z of db.prepare('SELECT nr, json FROM akten WHERE aktiv = 1 ORDER BY nr').all()) {
    let d;
    try {
      d = JSON.parse(z.json);
    } catch {
      continue;
    }
    const nimm = (id, niveau) => {
      const r = roh.get(id);
      if (!r || r.zeile.akte !== z.nr) return null;
      if (!aufgaben.has(id)) {
        aufgaben.set(id, {
          ...r.daten,
          punkte: r.zeile.punkte,
          akte: z.nr,
          ermittlung: r.zeile.ermittlung,
          art: r.zeile.art,
          niveau: F.NIVEAUS.includes(r.daten.niveau) ? r.daten.niveau : niveau
        });
      }
      return aufgaben.get(id);
    };
    const levels = [];
    for (const l of d.levels || []) {
      const ids = (l.aufgaben || []).filter((id) => {
        const a = nimm(id, l.niveau);
        return a && a.art === 'lab' && a.ermittlung === l.id;
      });
      const cc = l.coldCase ? nimm(l.coldCase, l.niveau) : null;
      const level = {
        ...l,
        akte: z.nr,
        coldCase: cc && cc.art === 'cc' ? cc.id : null,
        aufgaben: ids,
        plaedoyer: PL.bereinige(l.plaedoyer, ids.filter((id) => F.artVon(aufgaben.get(id).interaktion) === 'sql')),
        maxPunkte: ids.reduce((s, id) => s + aufgaben.get(id).punkte, 0)
      };
      levels.push(level);
      ermittlungen.set(level.id, level);
    }
    let boss = null;
    if (d.boss) {
      const pool = d.boss.pool.filter((id) => {
        const a = nimm(id, d.boss.niveau);
        return a && a.art === 'verhoer';
      });
      boss = { ...d.boss, akte: z.nr, pool };
    }
    akten.set(z.nr, {
      nr: z.nr,
      titel: d.titel,
      farbe: d.farbe,
      // Kür (Phase 6 Task 7): ohne Rangwirkung, nicht im Manifest-umfang und nicht in den Verbund-Welten
      kuer: d.kuer === true,
      levels,
      boss,
      maxPunkte: levels.reduce((s, l) => s + l.maxPunkte, 0)
    });
  }
  return tiefGefroren({ aufgaben, akten, ermittlungen });
}

/* ---------- öffentliche Sicht ---------- */

function oeffentlicherBlock(b) {
  const kopie = structuredClone(b);
  if (kopie && kopie.t === 'dbtabelle') delete kopie.quelle;
  return kopie;
}

function oeffentlicheInteraktion(ia, art) {
  const basis = { kind: ia.kind };
  if (ia.kind === 'sql' && ia.schreiben === true) {
    // Kür K1: Schreib-Konsole; Startskript und Prüfpunkte bleiben auf dem Server (nur der Titel des Starts geht mit)
    basis.schreiben = true;
    basis.abimodus = 'aus';
    basis.start = { titel: ia.start && typeof ia.start.titel === 'string' ? ia.start.titel : 'leere Datenbank' };
  } else if (ia.kind === 'sql') {
    basis.datenbank = ia.datenbank;
    basis.abimodus = art === 'verhoer' ? 'streng' : F.ABIMODI.includes(ia.abimodus) ? ia.abimodus : 'hinweis';
  } else if (ia.kind === 'kernpunkte') {
    basis.anzahl = Array.isArray(ia.kernpunkte) ? ia.kernpunkte.length : 0;
  } else if (M.NEUE_INTERAKTIONEN.includes(ia.kind)) {
    // Phase 5: nur die Felder zum Bedienen (Startdiagramm, Spaltenchips, Auftragskarte, Simulation) – Liste in
    // modellierung.OEFFENTLICHE_FELDER; Muster, Synonyme, FA, Zellen und Anomalieart stehen in loesung.
    Object.assign(basis, M.oeffentlich(ia));
  } else {
    for (const [k, v] of Object.entries(ia)) {
      if (k === 'inhalt' || GEHEIME_INTERAKTIONSFELDER.includes(k)) continue;
      basis[k] = structuredClone(v);
    }
  }
  if (typeof ia.frage === 'string') basis.frage = ia.frage;
  if (Array.isArray(ia.inhalt)) basis.inhalt = ia.inhalt.map(oeffentlicherBlock);
  return basis;
}

/* ---------- Fabrik ---------- */

/**
 * Inhalte-Dienst für eine Plattform-DB. Der Katalog wird sofort aus der DB aufgebaut (letzter geladener Stand) und
 * nach jedem laden() erneuert.
 */
function erzeugeInhalte(db, { log = () => {} } = {}) {
  let katalog = baueKatalog(db);
  let bericht = null;
  /** Optionen des letzten laden() – neuLaden() (Superadmin, Phase 6) lädt dieselben Dateien erneut. */
  let letzteOptionen = {};

  function laden(opt = {}) {
    letzteOptionen = { ...opt };
    bericht = tiefGefroren(ladeInhalte(db, { log, ...opt }));
    katalog = baueKatalog(db);
    return bericht;
  }

  function aufgabeOeffentlich(id) {
    const a = katalog.aufgaben.get(String(id));
    if (!a) return null;
    return {
      id: a.id,
      titel: a.titel,
      stufe: a.stufe,
      punkte: a.punkte,
      kategorie: a.kategorie,
      niveau: a.niveau,
      fallen: Array.isArray(a.fallen) ? [...a.fallen] : [],
      inhalt: (a.inhalt || []).map(oeffentlicherBlock),
      interaktion: Array.isArray(a.interaktion)
        ? a.interaktion.map((ia) => oeffentlicheInteraktion(ia, a.art))
        : oeffentlicheInteraktion(a.interaktion, a.art),
      tippsAnzahl: Array.isArray(a.tipps) ? a.tipps.length : 0
    };
  }

  /**
   * Manifest-umfang (Vertrag §7, Spec §10): gezählt werden nur die Akten des Plans (1–7) – Kür, Beispielakte und
   * andere Dateien nicht; welten = Akten des Plans (wie die welten-Liste des Manifests). Ohne Plan-Akten die
   * Spec-Standardwerte (aufgaben 0). Cold Cases und Verhör-Pools sind keine Lab-Aufgaben; der Live-Pool liegt nicht in
   * seed/akten.
   */
  function umfang() {
    const plan = [...katalog.akten.values()].filter((a) => AKTEN.some((p) => p.nr === a.nr));
    if (!plan.length) return { ...STANDARD_UMFANG };
    return { ...umfangVon(plan), welten: AKTEN.length };
  }

  return {
    laden,
    neuLaden: () => laden(letzteOptionen),
    bericht: () => bericht,
    akte: (nr) => katalog.akten.get(Number(nr)) || null,
    akten: () => [...katalog.akten.values()],
    ermittlung: (id) => katalog.ermittlungen.get(String(id)) || null,
    aufgabe: (id) => katalog.aufgaben.get(String(id)) || null,
    aufgabeOeffentlich,
    verhoerPool: (nr) => {
      const a = katalog.akten.get(Number(nr));
      return a && a.boss ? [...a.boss.pool] : [];
    },
    umfang
  };
}

module.exports = {
  ladeInhalte,
  erzeugeInhalte,
  fingerabdruck,
  kanonisch,
  oeffentlicherBlock,
  oeffentlicheInteraktion,
  STANDARD_VERZEICHNIS,
  STUFEN_PUNKTE,
  umfangVon
};
