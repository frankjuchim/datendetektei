'use strict';
// Gastmodus (Spec §7.12, E13, §12.4; Plan Phase 3 Task 10; Muster: Algo Quest src/services/gast.js).
//  - Probefall „Eisdiele Weserstedt“: eigene Demo-Aufgaben aus seed/gast/probefall.json (nie Aufgaben aus seed/akten;
//    das prüft der Validator), Prüfung auf dem Server, NICHTS wird gespeichert – auch keine Fehlversuche oder Tipps.
//    Lösung und Erklärung gibt es nach dem Lösen oder auf ausdrücklichen Wunsch („Lösung zeigen“); im Gastmodus ist
//    das in Ordnung, weil es reine Demo-Aufgaben sind. Tipps einzeln nach Nummer (der Browser zählt selbst).
//  - Lehrkraft-Demo: erfundener Kurs „Demo-Kurs Inf 12“ mit Fantasienamen und erfundenen Kennzahlen, nur lesend,
//    deterministisch (gleiche Werte bei jedem Aufruf).
//  - Gast-PDF-Whitelist materialien/Gast_PDF/verzeichnis.json: nur dort gelistete Schüler-/Lehrkraft-PDFs sind
//    öffentlich (Standard: leer, bis Frank auswählt). Lösungen, Erwartungshorizonte und Klausuren nur mit
//    "ausdruecklich": true. Laden und Prüfen der Whitelist: src/services/material.js (Stufe „gast“).

const fs = require('node:fs');
const path = require('node:path');
const F = require('../content/format');
const { pruefeAntwort, AntwortFehler } = require('../content/pruefer');
const { oeffentlicherBlock, oeffentlicheInteraktion } = require('./inhalte');
const { HttpFehler } = require('./lernen');
const { FALLEN, rangFuer } = require('../domain');
const { erzeugeMaterial, GAST_ORDNER, STANDARD_VERZEICHNIS } = require('./material');

const WURZEL = path.join(__dirname, '..', '..');
const STANDARD_DATEI = path.join(WURZEL, 'seed', 'gast', 'probefall.json');
const PROBEFALL_ID = /^G-\d{2}$/;
const STUFEN_PUNKTE = { 1: 10, 2: 20, 3: 30 };


/** Fantasienamen der Lehrkraft-Demo (keine Klarnamen). */
const DEMO_NAMEN = Object.freeze(['Lena K.', 'Mika R.', 'Noa T.', 'Jule P.', 'Ben S.', 'Ida M.', 'Tom W.', 'Emma F.']);

const istObjekt = (w) => w !== null && typeof w === 'object' && !Array.isArray(w);

/** Kleiner deterministischer Zufall (LCG). */
function zufall(saat) {
  let s = saat >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

/** Probefall laden; einfache Struktur-Prüfung (vollständig prüft validiereProbefall in `npm run validate`). */
function ladeProbefall(datei, log) {
  try {
    const d = JSON.parse(fs.readFileSync(datei, 'utf8'));
    if (!istObjekt(d) || !Array.isArray(d.aufgaben)) throw new Error('aufgaben fehlt');
    const aufgaben = new Map();
    for (const a of d.aufgaben) {
      if (!istObjekt(a) || !PROBEFALL_ID.test(a.id) || aufgaben.has(a.id)) throw new Error(`ungültige id ${a && a.id}`);
      const teile = [].concat(a.interaktion);
      if (!teile.length || teile.some((ia) => !istObjekt(ia) || !F.INTERAKTIONEN.includes(ia.kind) || ia.kind === 'kernpunkte')) {
        throw new Error(`${a.id}: Interaktion unbekannt`);
      }
      if (a.loesung === undefined || a.loesung === null) throw new Error(`${a.id}: loesung fehlt`);
      aufgaben.set(a.id, Object.freeze({ ...a, tipps: Array.isArray(a.tipps) ? a.tipps : [], fallen: Array.isArray(a.fallen) ? a.fallen : [] }));
    }
    return { titel: d.titel, datenbank: d.datenbank, briefing: d.briefing || '', intro: Array.isArray(d.intro) ? d.intro : [], aufgaben };
  } catch (e) {
    log(`Gastmodus: Probefall nicht ladbar (${e.message}).`);
    return null;
  }
}

/**
 * @param {{ datei?, material?, materialVerzeichnis?, inhalte?, log? }} opt
 *   inhalte = erzeugeInhalte(db) (optional; nur für die Ermittlungen der Lehrkraft-Demo)
 *   material = erzeugeMaterial() aus src/services/material.js (Stufe „gast“); sonst eine eigene Instanz für
 *   materialVerzeichnis
 */
function erzeugeGast({ datei = STANDARD_DATEI, material = null, materialVerzeichnis = STANDARD_VERZEICHNIS, inhalte = null, log = () => {} } = {}) {
  const fall = ladeProbefall(datei, log);
  const mat = material || erzeugeMaterial({ verzeichnis: materialVerzeichnis, log });

  function demoAufgabe(id) {
    const a = fall && fall.aufgaben.get(String(id));
    if (!a) throw new HttpFehler(404, 'Diese Demo-Aufgabe gibt es nicht.');
    return a;
  }

  function aufgabeOeffentlich(a) {
    return {
      id: a.id,
      titel: a.titel,
      stufe: a.stufe,
      punkte: STUFEN_PUNKTE[a.stufe] || 0,
      kategorie: a.kategorie,
      fallen: [...a.fallen],
      inhalt: (a.inhalt || []).map(oeffentlicherBlock),
      interaktion: Array.isArray(a.interaktion)
        ? a.interaktion.map((ia) => oeffentlicheInteraktion(ia, 'lab'))
        : oeffentlicheInteraktion(a.interaktion, 'lab'),
      tippsAnzahl: a.tipps.length
    };
  }

  const loesungsteil = (a) => ({ loesung: structuredClone(a.loesung), erklaerung: structuredClone(a.erklaerung || []) });
  const hatSql = (a) => F.teile(a).some((t) => F.artVon(t.interaktion) === 'sql');

  /* ---------- Probefall ---------- */

  function probefall() {
    if (!fall) throw new HttpFehler(503, 'Der Probefall ist gerade nicht verfügbar.');
    return {
      titel: fall.titel,
      datenbank: fall.datenbank,
      briefing: fall.briefing,
      intro: fall.intro.map(oeffentlicherBlock),
      aufgaben: [...fall.aufgaben.values()].map(aufgabeOeffentlich)
    };
  }

  /** Antwort prüfen (nichts wird gespeichert). Body: { antwort, teilweise?, teil? }. */
  async function pruefen(id, body, { pruefer = null } = {}) {
    const a = demoAufgabe(id);
    const b = istObjekt(body) ? body : {};
    if (hatSql(a) && !pruefer) throw new HttpFehler(503, 'Die SQL-Prüfung ist gerade nicht verfügbar.');
    const sqlPruefer = pruefer ? (aufgabe, sql) => pruefer.pruefeSql({ sql, aufgabe }) : null;
    const teilweise = b.teilweise === true;
    let erg;
    try {
      erg = await pruefeAntwort(a, b.antwort, { sqlPruefer, teilweise, teil: b.teil });
    } catch (e) {
      if (e instanceof AntwortFehler) throw new HttpFehler(400, e.message);
      throw e;
    }
    if (!teilweise && erg.leer) throw new HttpFehler(400, 'Bitte gib zuerst eine Antwort ein.');
    const fertig = erg.ok && (!teilweise || (erg.rueckmeldung && erg.rueckmeldung.vollstaendig === true));
    const out = { ok: erg.ok, rueckmeldung: erg.rueckmeldung, geloest: fertig };
    if (teilweise) Object.assign(out, { teilweise: true, teil: erg.teil });
    if (fertig) out.loesung = loesungsteil(a);
    return out;
  }

  /** Tipp Nummer nr (1-basiert). Body: { nr }. */
  function tipp(id, body) {
    const a = demoAufgabe(id);
    const nr = istObjekt(body) ? body.nr : undefined;
    if (!a.tipps.length) throw new HttpFehler(400, 'Zu dieser Aufgabe gibt es keine Tipps.');
    if (!Number.isInteger(nr) || nr < 1 || nr > a.tipps.length) throw new HttpFehler(400, 'Diesen Tipp gibt es nicht.');
    return { nr, tipp: a.tipps[nr - 1], anzahl: a.tipps.length };
  }

  /** „Lösung zeigen“ – nur auf ausdrücklichen Wunsch (POST). */
  function loesung(id) {
    return loesungsteil(demoAufgabe(id));
  }

  /* ---------- Lehrkraft-Demo (erfundener Kurs, nur lesend) ---------- */

  function lehrkraft() {
    const rnd = zufall(2027);
    const akten = inhalte ? inhalte.akten().filter((a) => a.nr <= 3) : [];
    const levels = akten.flatMap((a) => a.levels.map((l) => ({ akte: a.nr, id: l.id, nr: l.nr || l.id, titel: l.titel, maxPunkte: l.maxPunkte || 0 })));
    const maxGesamt = levels.reduce((s, l) => s + l.maxPunkte, 0);
    const anteile = DEMO_NAMEN.map((_, i) => levels.map((_l, k) => Math.max(0, Math.min(1, 1.05 - i * 0.09 - k * 0.12 - rnd() * 0.2))));

    const schueler = DEMO_NAMEN.map((name, i) => {
      const punkte = levels.reduce((s, l, k) => s + Math.round(anteile[i][k] * l.maxPunkte), 0);
      const geloest = levels.reduce((s, l, k) => s + Math.round(anteile[i][k] * 8), 0);
      return {
        name,
        punkte,
        geloest,
        rang: rangFuer(maxGesamt ? punkte / maxGesamt : 0).name,
        verhoere: akten.filter((a, k) => a.boss && rnd() < 0.9 - i * 0.1 - k * 0.15).length,
        zuletztAktiv: ((n) => (n === 1 ? 'gestern' : `vor ${n} Tagen`))(1 + i + Math.floor(rnd() * 3))
      };
    });
    const ermittlungen = levels.map((l, k) => ({
      akte: l.akte,
      id: l.id,
      nr: l.nr,
      titel: l.titel,
      maxPunkte: l.maxPunkte,
      durchschnitt: Math.round(anteile.reduce((s, a) => s + a[k], 0) / DEMO_NAMEN.length * 100) / 100
    }));
    const fallen = FALLEN.map((f, i) => ({
      nr: f.nr,
      titel: f.titel,
      fehlversuche: Math.round(([9, 7, 5, 12, 6, 8, 4, 0, 0, 2][i] || 0) * (0.8 + rnd() * 0.4))
    }));
    const probefallStat = fall
      ? [...fall.aufgaben.values()].map((a, i) => {
          const quote = [0.88, 0.75, 0.81, 0.63, 0.5, 0.38][i] ?? 0.7;
          return { id: a.id, titel: a.titel, stufe: a.stufe, quote, fehlversucheSchnitt: Math.round((1 - quote) * 30) / 10 };
        })
      : [];
    return {
      hinweis: 'Erfundener Demo-Kurs: Alle Namen und Zahlen sind ausgedacht. Hier kann nichts geändert werden.',
      kurs: { name: 'Demo-Kurs Inf 12', niveau: 'eA', schueler: DEMO_NAMEN.length, freigeschaltet: akten.map((a) => a.nr) },
      ermittlungen,
      schueler: schueler.sort((x, y) => y.punkte - x.punkte || x.name.localeCompare(y.name, 'de')),
      fallen,
      probefall: probefallStat
    };
  }

  /* ---------- Gast-PDFs (E13) ---------- */

  /** Gast-PDF-Whitelist (nur vorhandene Dateien): Titel, Fassung, Link. */
  function materialListe() {
    return { dateien: mat.liste('gast') };
  }

  /** Datei der Gast-Auswahl zum Ausliefern ({ root, rel, name, typ }) oder null (nicht gelistet, nicht vorhanden). */
  function materialPfad(datei) {
    return mat.datei('gast', String(datei));
  }

  return {
    probefall,
    pruefen,
    tipp,
    loesung,
    lehrkraft,
    materialListe,
    materialPfad,
    istSqlAufgabe: (id) => {
      const a = fall && fall.aufgaben.get(String(id));
      return !!a && hatSql(a);
    }
  };
}

module.exports = { erzeugeGast, GAST_ORDNER, DEMO_NAMEN, STANDARD_DATEI };
