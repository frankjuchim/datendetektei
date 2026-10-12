'use strict';
// Kurs-Einstellungen für Lehrkräfte (Plan Phase 3 Task 6, DESIGN §5.11 – nur die Einstellungen; die Auswertung folgt
// in Phase 6).
//
//   GET /api/lehrkraft/kurse                          Kurse mit Einstellungen und Kennzahlen (ohne Namen)
//   PUT /api/lehrkraft/kurse/:kurs/einstellungen      { akten?: [1..7], niveau?: 'eA'|'gA', verhoer?: 'auto'|'offen'|'gesperrt' }
//
// Rechte: Lehrkraft nur für Kurse, in denen sie laut Mitgliedschaft (aus dem Token) Lehrkraft ist; Superadmin für alle
// Kurse. Gesperrter Kurs (aktiv = 0): nur lesend (PUT → 403). Fremder und unbekannter Kurs: gleiche Antwort (403).
// CSRF: pruefeHerkunft (src/app.js) greift für PUT; nur JSON. Weitere Einstellungen (scoreboard, beamer) bleiben.

const express = require('express');
const { nurAngemeldet } = require('../kern/sitzung');
const { istKursId } = require('../kern/verbund');
const { AKTEN } = require('../domain');
const { leseEinstellungen } = require('../services/stand');

const FELDER = new Set(['akten', 'niveau', 'verhoer']);
const NIVEAUS = ['eA', 'gA'];
const VERHOER_MODI = ['auto', 'offen', 'gesperrt'];
const AKTEN_NR = new Set(AKTEN.map((a) => a.nr));

class Fehler extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** Nur die drei Einstellungen dieser Seite (Akten sortiert). */
const sichtbar = (e) => ({ akten: [...e.akten].sort((a, b) => a - b), niveau: e.niveau, verhoer: e.verhoer });

/** Änderung prüfen → bereinigte Teil-Einstellungen; Fehler als Fehler(400). */
function pruefeAenderung(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Fehler(400, 'Ungültige Einstellungen.');
  const schluessel = Object.keys(body);
  if (!schluessel.length) throw new Fehler(400, 'Keine Einstellung angegeben.');
  if (schluessel.some((k) => !FELDER.has(k))) throw new Fehler(400, 'Unbekannte Einstellung.');
  const neu = {};
  if ('akten' in body) {
    const a = body.akten;
    if (!Array.isArray(a) || a.length > 50 || !a.every((n) => Number.isInteger(n) && AKTEN_NR.has(n))) {
      throw new Fehler(400, 'Akten: nur die Nummern 1 bis 7.');
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
  return neu;
}

/** Akten, die es im Niveau nicht gibt (Akte 5 nur eA). */
function aktenOhneNiveau(akten, niveau) {
  return akten.filter((nr) => {
    const plan = AKTEN.find((a) => a.nr === nr);
    return plan && !plan.niveaus.includes(niveau);
  });
}

function lehrkraftRouten({ db, stand = null }) {
  const router = express.Router();
  const angemeldet = nurAngemeldet(['lehrkraft', 'superadmin']);

  const kursZeile = (kursId) => db.prepare('SELECT kurs_id, name, aktiv, einstellungen FROM kurse WHERE kurs_id = ?').get(kursId);

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
    return {
      id: z.kurs_id,
      name: z.name,
      aktiv,
      nurLesen: !aktiv,
      einstellungen: sichtbar(leseEinstellungen(z.einstellungen)),
      kennzahlen: kennzahlen(z.kurs_id)
    };
  }

  const aktenAuswahl = AKTEN.map((a) => ({ nr: a.nr, titel: a.titel, niveaus: [...a.niveaus] }));

  router.get('/api/lehrkraft/kurse', angemeldet, (req, res) => {
    const zeilen =
      req.sitzung.rolle === 'superadmin'
        ? db.prepare('SELECT kurs_id, name, aktiv, einstellungen FROM kurse ORDER BY kurs_id').all()
        : db
            .prepare(
              'SELECT k.kurs_id, k.name, k.aktiv, k.einstellungen FROM mitgliedschaften m, kurse k ' +
                "WHERE m.kurs_id = k.kurs_id AND m.sub = ? AND m.rolle = 'lehrkraft' ORDER BY k.kurs_id"
            )
            .all(req.sitzung.sub);
    res.set('Cache-Control', 'no-store');
    res.json({ akten: aktenAuswahl, kurse: zeilen.map(kursSicht) });
  });

  router.put('/api/lehrkraft/kurse/:kurs/einstellungen', angemeldet, (req, res) => {
    const kursId = req.params.kurs;
    if (!istKursId(kursId)) throw new Fehler(400, 'Ungültige Kurs-ID.');
    const z = kursZeile(kursId);
    if (!z || !darf(req.sitzung, kursId)) throw new Fehler(403, 'Kein Zugriff auf diesen Kurs.');
    if (z.aktiv !== 1) throw new Fehler(403, 'Dieser Kurs ist gesperrt – nur Ansehen ist möglich.');
    const aenderung = pruefeAenderung(req.body);

    let roh = {};
    try {
      roh = JSON.parse(z.einstellungen || '{}') || {};
    } catch {
      roh = {};
    }
    const alt = leseEinstellungen(z.einstellungen);
    const neu = { ...roh, ...sichtbar(alt), ...aenderung };
    if (aktenOhneNiveau(neu.akten, neu.niveau).length) {
      throw new Fehler(400, 'Akte 5 gibt es nur auf erhöhtem Niveau (eA). Schalten Sie sie vor dem Wechsel zu gA ab.');
    }
    db.prepare('UPDATE kurse SET einstellungen = ? WHERE kurs_id = ?').run(JSON.stringify(neu), kursId);
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
