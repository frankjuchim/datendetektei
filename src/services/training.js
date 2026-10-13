'use strict';
// Trainingsplatz (Spec §7.8, Plan Phase 3 Task 8 + Phase 5 Task 5; Muster Algo Quest src/services/training.js): Zufallsaufgaben T1–T7
// aus src/content/generatoren.js, 1 Punkt je richtig gelöster Aufgabe, max. 30 Punkte je Tag (deutsche Zeit).
//
// Die Aufgabe wird NICHT gespeichert. Der Server leitet den Seed aus (sub, Kurs, Typ, Tag, Nummer) per HMAC ab und
// signiert ihn; der Client bekommt { typ, seed, signatur, aufgabe } und schickt { typ, seed, signatur, antwort }
// zurück. Der Server prüft die Signatur, erzeugt die Aufgabe neu und prüft die Antwort (src/content/pruefer.js).
//   - signatur = "<tag>.<nr>.<HMAC-SHA256 (SESSION_SECRET) über sub|kurs|typ|seed|tag|nr>" – niemand kann Seeds wählen
//     oder die Aufgabe eines anderen Kontos/Kurses einreichen (→ 400).
//   - nr = training.anzahl des Tages (Zahl der heute gewerteten Aufgaben). Bis zur Wertung liefert „neu“ dieselbe
//     Aufgabe (kein Neuwürfeln). Gewertet wird, wenn die Aufgabe richtig gelöst oder ihre Lösung aufgedeckt wird:
//     anzahl + 1, Punkte nur beim richtigen Lösen und solange heute < 30. Danach ist der Seed verbraucht – erneutes
//     Einreichen wird geprüft, bringt aber keine Punkte (gewertet: true). Aufgaben von gestern ebenso.
//   - Falsche Antworten kosten nichts und lassen die Aufgabe offen.

const crypto = require('node:crypto');
const G = require('../content/generatoren');
const { pruefeAntwort, AntwortFehler } = require('../content/pruefer');
const { HttpFehler } = require('./lernen');
const { niveauSichtbar } = require('./stand');

const MAX_PUNKTE_TAG = 30;
const SIGNATUR_RE = /^(\d{4}-\d{2}-\d{2})\.(\d{1,6})\.([0-9a-f]{64})$/;

/** Kalendertag in Deutschland (für das Tageslimit), JJJJ-MM-TT. */
function tagBerlin(t) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(t));
}

/**
 * @param {{ db, lernen: { zugang }, geheimnis: string, jetzt?: () => number }} opt
 *   geheimnis = konfig.sessionSecret (HMAC-Schlüssel für Seeds und Signaturen).
 */
function erzeugeTraining({ db, lernen, geheimnis, jetzt = Date.now }) {
  if (!geheimnis) throw new Error('Trainingsplatz: geheimnis fehlt.');
  const hmac = (text) => crypto.createHmac('sha256', geheimnis).update(text).digest();

  const seedFuer = (sub, kurs, typ, tag, nr) => hmac(['training-seed', sub, kurs, typ, tag, nr].join('|')).readUInt32BE(0);
  const mac = (sub, kurs, typ, seed, tag, nr) => hmac(['training', sub, kurs, typ, seed, tag, nr].join('|')).toString('hex');

  function zeile(sub, kurs, tag) {
    return db.prepare('SELECT anzahl, punkte FROM training WHERE sub = ? AND kurs_id = ? AND tag = ?').get(sub, kurs, tag) || { anzahl: 0, punkte: 0 };
  }

  const heute = (z, tag = tagBerlin(jetzt())) => {
    const r = zeile(z.sub, z.kurs.id, tag);
    return { punkte: r.punkte, aufgaben: r.anzahl };
  };

  /** Generatoren, die im Kurs-Niveau sichtbar sind (gA-Kurse: ohne die eA-Typen T4/T6, Spec §3.4). */
  const generatorenFuer = (z) => G.GENERATOREN.filter((g) => niveauSichtbar(z.einst.niveau, g.niveau));

  function typVon(z, body) {
    const typ = body && typeof body.typ === 'string' ? body.typ : '';
    if (!G.istTyp(typ) || !generatorenFuer(z).some((g) => g.typ === typ)) throw new HttpFehler(400, 'Unbekannter Aufgabentyp.');
    return typ;
  }

  /** Signatur und Seed prüfen → { typ, seed, tag, nr }; jede Abweichung → 400 (ohne Details). */
  function pruefeSignatur(z, body) {
    const b = body && typeof body === 'object' ? body : {};
    const typ = typVon(z, b);
    const seed = b.seed;
    const m = typeof b.signatur === 'string' ? SIGNATUR_RE.exec(b.signatur) : null;
    const ungueltig = new HttpFehler(400, 'Ungültige Trainingsaufgabe.');
    if (!m || !Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw ungueltig;
    const [, tag, nrText, sig] = m;
    const nr = Number(nrText);
    const soll = Buffer.from(mac(z.sub, z.kurs.id, typ, seed, tag, nr), 'hex');
    if (!crypto.timingSafeEqual(soll, Buffer.from(sig, 'hex'))) throw ungueltig;
    if (seedFuer(z.sub, z.kurs.id, typ, tag, nr) !== seed) throw ungueltig;
    return { typ, seed, tag, nr };
  }

  /** Ist die Aufgabe (tag, nr) die heute offene? */
  const offen = (z, s) => s.tag === tagBerlin(jetzt()) && s.nr === zeile(z.sub, z.kurs.id, s.tag).anzahl;

  /** Aufgabe werten: anzahl + 1, ggf. 1 Punkt (bis 30/Tag). Liefert die vergebenen Punkte. */
  function werten(z, s, mitPunkt) {
    return db.transaction(() => {
      const r = zeile(z.sub, z.kurs.id, s.tag);
      if (s.nr !== r.anzahl) return 0; // inzwischen gewertet (parallele Anfrage)
      const p = mitPunkt && r.punkte < MAX_PUNKTE_TAG ? 1 : 0;
      db.prepare(
        `INSERT INTO training (sub, kurs_id, tag, anzahl, punkte) VALUES (?, ?, ?, 1, ?)
         ON CONFLICT (sub, kurs_id, tag) DO UPDATE SET anzahl = anzahl + 1, punkte = punkte + excluded.punkte`
      ).run(z.sub, z.kurs.id, s.tag, p);
      return p;
    })();
  }

  /* ---------- Öffentliche Funktionen ---------- */

  /** Übersicht: Generatoren, heutige Punkte/Aufgaben, Tagesgrenze, Trainingspunkte gesamt. */
  function info(sitzung, kursId) {
    const z = lernen.zugang(sitzung, kursId);
    const gesamt = db.prepare('SELECT COALESCE(SUM(punkte), 0) AS p FROM training WHERE sub = ? AND kurs_id = ?').get(z.sub, z.kurs.id).p;
    return {
      generatoren: generatorenFuer(z).map((g) => ({ ...g })),
      heute: heute(z),
      maxProTag: MAX_PUNKTE_TAG,
      punkteGesamt: gesamt
    };
  }

  /** Aktuelle Aufgabe eines Typs: { typ, seed, signatur, aufgabe (öffentlich), heute, maxProTag }. */
  function neu(sitzung, kursId, body) {
    const z = lernen.zugang(sitzung, kursId, { schreiben: true });
    const typ = typVon(z, body);
    const tag = tagBerlin(jetzt());
    const nr = zeile(z.sub, z.kurs.id, tag).anzahl;
    const seed = seedFuer(z.sub, z.kurs.id, typ, tag, nr);
    return {
      typ,
      seed,
      signatur: `${tag}.${nr}.${mac(z.sub, z.kurs.id, typ, seed, tag, nr)}`,
      aufgabe: G.oeffentlich(G.erzeuge(typ, seed)),
      heute: heute(z, tag),
      maxProTag: MAX_PUNKTE_TAG
    };
  }

  /**
   * Antwort prüfen: { ok, rueckmeldung, punkteErhalten, gewertet, heute, maxProTag } und – nur wenn richtig –
   * loesung und erklaerung. Leere Antwort → 400 (kein Versuch).
   */
  async function pruefen(sitzung, kursId, body) {
    const z = lernen.zugang(sitzung, kursId, { schreiben: true });
    const s = pruefeSignatur(z, body);
    const a = G.erzeuge(s.typ, s.seed);
    let erg;
    try {
      erg = await pruefeAntwort(a, body.antwort);
    } catch (e) {
      if (e instanceof AntwortFehler) throw new HttpFehler(400, e.message);
      throw e;
    }
    if (erg.leer) throw new HttpFehler(400, 'Bitte gib zuerst eine Antwort ein.');
    const warOffen = offen(z, s);
    const punkte = erg.ok && warOffen ? werten(z, s, true) : 0;
    const out = { ok: erg.ok, rueckmeldung: erg.rueckmeldung, punkteErhalten: punkte, gewertet: !warOffen, heute: heute(z), maxProTag: MAX_PUNKTE_TAG };
    if (erg.ok) Object.assign(out, { loesung: structuredClone(a.loesung), erklaerung: structuredClone(a.erklaerung) });
    return out;
  }

  /** Lösung aufdecken: die Aufgabe ist damit gewertet (0 Punkte). → { loesung, erklaerung, heute, maxProTag } */
  function loesung(sitzung, kursId, body) {
    const z = lernen.zugang(sitzung, kursId, { schreiben: true });
    const s = pruefeSignatur(z, body);
    const a = G.erzeuge(s.typ, s.seed);
    if (offen(z, s)) werten(z, s, false);
    return { loesung: structuredClone(a.loesung), erklaerung: structuredClone(a.erklaerung), heute: heute(z), maxProTag: MAX_PUNKTE_TAG };
  }

  return { info, neu, pruefen, loesung };
}

module.exports = { erzeugeTraining, tagBerlin, MAX_PUNKTE_TAG };
