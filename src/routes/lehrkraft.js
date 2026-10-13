'use strict';
// Kurs-Einstellungen für Lehrkräfte (Plan Phase 3 Task 6, DESIGN §5.11 – nur die Einstellungen; die Auswertung folgt
// in Phase 6).
//
//   GET /api/lehrkraft/kurse                          Kurse mit Einstellungen und Kennzahlen (ohne Namen)
//   PUT /api/lehrkraft/kurse/:kurs/einstellungen      { akten?: [1..7, 8 = Kür], niveau?: 'eA'|'gA', verhoer?: 'auto'|'offen'|'gesperrt',
//                                                       verhoerAkten?: { "<1..7>": 'auto'|'offen'|'gesperrt'|null },
//                                                       scoreboard?: boolean, beamer?: boolean }
//   POST /api/lehrkraft/kurse/:kurs/board-schluessel  neuen Board-Schlüssel erzeugen (alter wird ungültig)
//
// verhoerAkten: eigener Verhör-Modus je Akte (überschreibt verhoer; null entfernt ihn, Teil-Änderung wird gemischt).
// beamer: Beamer-Board an/aus; beim ersten Einschalten wird ein Board-Schlüssel erzeugt (Phase 6 Task 3).
//
// Rechte: Lehrkraft nur für Kurse, in denen sie laut Mitgliedschaft (aus dem Token) Lehrkraft ist; Superadmin für alle
// Kurse. Gesperrter Kurs (aktiv = 0): nur lesend (PUT → 403). Fremder und unbekannter Kurs: gleiche Antwort (403).
// CSRF: pruefeHerkunft (src/app.js) greift für PUT/POST; nur JSON.

const express = require('express');
const { nurAngemeldet } = require('../kern/sitzung');
const { istKursId } = require('../kern/verbund');
const { AKTEN, KUER } = require('../domain');
const { leseEinstellungen } = require('../services/stand');
const { neuerBoardSchluessel } = require('../services/board');

const FELDER = new Set(['akten', 'niveau', 'verhoer', 'verhoerAkten', 'scoreboard', 'beamer']);
const NIVEAUS = ['eA', 'gA'];
const VERHOER_MODI = ['auto', 'offen', 'gesperrt'];
const AKTEN_NR = new Set(AKTEN.map((a) => a.nr));
/** Freischaltbar: die sieben Akten und die Kür K1 (Welt 8, nur eA; Plan Phase 6 Task 7). Verhöre gibt es nur zu 1–7. */
const FREISCHALTBAR = new Set([...AKTEN_NR, KUER.nr]);
const PLAN = [...AKTEN, KUER];

class Fehler extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** Die Einstellungen dieser Seite (Akten sortiert, verhoerAkten nach Aktennummer). */
const sichtbar = (e) => ({
  akten: [...e.akten].sort((a, b) => a - b),
  niveau: e.niveau,
  verhoer: e.verhoer,
  verhoerAkten: Object.fromEntries(Object.entries(e.verhoerAkten || {}).sort((a, b) => Number(a[0]) - Number(b[0]))),
  scoreboard: e.scoreboard === true,
  beamer: e.beamer === true
});
const istObjekt = (w) => w !== null && typeof w === 'object' && !Array.isArray(w);

/** Änderung prüfen → bereinigte Teil-Einstellungen; Fehler als Fehler(400). */
function pruefeAenderung(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Fehler(400, 'Ungültige Einstellungen.');
  const schluessel = Object.keys(body);
  if (!schluessel.length) throw new Fehler(400, 'Keine Einstellung angegeben.');
  if (schluessel.some((k) => !FELDER.has(k))) throw new Fehler(400, 'Unbekannte Einstellung.');
  const neu = {};
  if ('akten' in body) {
    const a = body.akten;
    if (!Array.isArray(a) || a.length > 50 || !a.every((n) => Number.isInteger(n) && FREISCHALTBAR.has(n))) {
      throw new Fehler(400, 'Akten: nur die Nummern 1 bis 7 und 8 (Kür).');
    }
    neu.akten = [...new Set(a)].sort((x, y) => x - y);
  }
  if ('niveau' in body) {
    if (!NIVEAUS.includes(body.niveau)) throw new Fehler(400, 'Niveau: nur eA oder gA.');
    neu.niveau = body.niveau;
  }
  if ('verhoer' in body) {
    if (!VERHOER_MODI.includes(body.verhoer)) throw new Fehler(400, 'Verhöre: nur automatisch, offen oder gesperrt.');
    neu.verhoer = body.verhoer;
  }
  if ('verhoerAkten' in body) {
    const v = body.verhoerAkten;
    const eintraege = istObjekt(v) ? Object.entries(v) : null;
    const gueltig =
      eintraege &&
      eintraege.length <= AKTEN_NR.size &&
      eintraege.every(([nr, m]) => /^\d{1,2}$/.test(nr) && AKTEN_NR.has(Number(nr)) && (m === null || VERHOER_MODI.includes(m)));
    if (!gueltig) throw new Fehler(400, 'Verhöre je Akte: Aktennummer 1 bis 7 mit automatisch, offen, gesperrt oder null.');
    neu.verhoerAkten = Object.fromEntries(eintraege);
  }
  for (const k of ['scoreboard', 'beamer']) {
    if (k in body && typeof body[k] !== 'boolean') throw new Fehler(400, k === 'scoreboard' ? 'Scoreboard: nur an oder aus.' : 'Beamer-Board: nur an oder aus.');
    if (k in body) neu[k] = body[k];
  }
  return neu;
}

/** Akten, die es im Niveau nicht gibt (Akte 5 nur eA). */
function aktenOhneNiveau(akten, niveau) {
  return akten.filter((nr) => {
    const plan = PLAN.find((a) => a.nr === nr);
    return plan && !plan.niveaus.includes(niveau);
  });
}

function lehrkraftRouten({ db, stand = null }) {
  const router = express.Router();
  const angemeldet = nurAngemeldet(['lehrkraft', 'superadmin']);

  const kursZeile = (kursId) =>
    db.prepare('SELECT kurs_id, name, aktiv, einstellungen, board_schluessel FROM kurse WHERE kurs_id = ?').get(kursId);

  /** Darf die Sitzung den Kurs verwalten? Lehrkraft laut Mitgliedschaft oder Superadmin. */
  function darf(sitzung, kursId) {
    if (sitzung.rolle === 'superadmin') return true;
    const m = db.prepare('SELECT rolle FROM mitgliedschaften WHERE sub = ? AND kurs_id = ?').get(sitzung.sub, kursId);
    return !!m && m.rolle === 'lehrkraft';
  }

  /** Kennzahlen ohne Namen: Anzahl Schüler (Rolle mitglied) und Durchschnitt der Rang-Anteile. */
  function kennzahlen(kursId) {
    const subs = db
      .prepare("SELECT sub FROM mitgliedschaften WHERE kurs_id = ? AND rolle = 'mitglied' ORDER BY sub")
      .all(kursId)
      .map((z) => z.sub);
    if (!subs.length || !stand) return { schueler: subs.length, anteil: 0 };
    const kz = stand.kennzahlen(kursId, subs);
    const summe = [...kz.schueler.values()].reduce((s, w) => s + w.anteil, 0);
    return { schueler: subs.length, anteil: summe / subs.length };
  }

  function kursSicht(z) {
    const aktiv = z.aktiv === 1;
    const einstellungen = sichtbar(leseEinstellungen(z.einstellungen));
    const schluessel = z.board_schluessel || null;
    return {
      id: z.kurs_id,
      name: z.name,
      aktiv,
      nurLesen: !aktiv,
      einstellungen,
      // Board-Link nur für Lehrkraft/Superadmin des Kurses (diese Route); aktiv = über /board/<schluessel> erreichbar
      board: { aktiv: aktiv && einstellungen.beamer && !!schluessel, schluessel },
      kennzahlen: kennzahlen(z.kurs_id)
    };
  }

  /** Kurs zum Schreiben: gültige ID, Recht, aktiv – sonst Fehler. */
  function schreibbarerKurs(sitzung, kursId) {
    if (!istKursId(kursId)) throw new Fehler(400, 'Ungültige Kurs-ID.');
    const z = kursZeile(kursId);
    if (!z || !darf(sitzung, kursId)) throw new Fehler(403, 'Kein Zugriff auf diesen Kurs.');
    if (z.aktiv !== 1) throw new Fehler(403, 'Dieser Kurs ist gesperrt – nur Ansehen ist möglich.');
    return z;
  }

  const aktenAuswahl = [
    ...AKTEN.map((a) => ({ nr: a.nr, titel: a.titel, niveaus: [...a.niveaus] })),
    { nr: KUER.nr, titel: KUER.titel, niveaus: [...KUER.niveaus], kuer: true }
  ];

  router.get('/api/lehrkraft/kurse', angemeldet, (req, res) => {
    const zeilen =
      req.sitzung.rolle === 'superadmin'
        ? db.prepare('SELECT kurs_id, name, aktiv, einstellungen, board_schluessel FROM kurse ORDER BY kurs_id').all()
        : db
            .prepare(
              'SELECT k.kurs_id, k.name, k.aktiv, k.einstellungen, k.board_schluessel FROM mitgliedschaften m, kurse k ' +
                "WHERE m.kurs_id = k.kurs_id AND m.sub = ? AND m.rolle = 'lehrkraft' ORDER BY k.kurs_id"
            )
            .all(req.sitzung.sub);
    res.set('Cache-Control', 'no-store');
    res.json({ akten: aktenAuswahl, kurse: zeilen.map(kursSicht) });
  });

  router.put('/api/lehrkraft/kurse/:kurs/einstellungen', angemeldet, (req, res) => {
    const kursId = req.params.kurs;
    const z = schreibbarerKurs(req.sitzung, kursId);
    const aenderung = pruefeAenderung(req.body);

    let roh = {};
    try {
      roh = JSON.parse(z.einstellungen || '{}') || {};
    } catch {
      roh = {};
    }
    const alt = leseEinstellungen(z.einstellungen);
    const bisher = sichtbar(alt);
    const neu = { ...roh, ...bisher, ...aenderung };
    if (aenderung.verhoerAkten) {
      const gemischt = { ...bisher.verhoerAkten, ...aenderung.verhoerAkten };
      neu.verhoerAkten = Object.fromEntries(Object.entries(gemischt).filter(([, m]) => m !== null));
    }
    const ohne = aktenOhneNiveau(neu.akten, neu.niveau);
    if (ohne.length) {
      const was = ohne.includes(5) ? 'Akte 5' : 'Die Kür K1';
      throw new Fehler(400, `${was} gibt es nur auf erhöhtem Niveau (eA). Schalten Sie sie vor dem Wechsel zu gA ab.`);
    }
    db.transaction(() => {
      db.prepare('UPDATE kurse SET einstellungen = ? WHERE kurs_id = ?').run(JSON.stringify(neu), kursId);
      if (neu.beamer && !z.board_schluessel) {
        db.prepare('UPDATE kurse SET board_schluessel = ? WHERE kurs_id = ?').run(neuerBoardSchluessel(), kursId);
      }
    })();
    res.set('Cache-Control', 'no-store');
    res.json({ kurs: kursSicht(kursZeile(kursId)) });
  });

  router.post('/api/lehrkraft/kurse/:kurs/board-schluessel', angemeldet, (req, res) => {
    const kursId = req.params.kurs;
    schreibbarerKurs(req.sitzung, kursId);
    db.prepare('UPDATE kurse SET board_schluessel = ? WHERE kurs_id = ?').run(neuerBoardSchluessel(), kursId);
    res.set('Cache-Control', 'no-store');
    res.json({ kurs: kursSicht(kursZeile(kursId)) });
  });

  // Fachliche Fehler mit ihrem deutschen Text; alles andere an den allgemeinen Fehler-Handler.
  // eslint-disable-next-line no-unused-vars
  router.use((err, req, res, next) => {
    if (err instanceof Fehler) return res.status(err.status).json({ error: err.message });
    next(err);
  });

  return router;
}

module.exports = { lehrkraftRouten };
