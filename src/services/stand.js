'use strict';
// Lernstand je sub × Kurs (Vertrag §3, Spec §7.15): Kurs-Einstellungen, Sichtbarkeit nach Niveau, Punkte, Rang,
// Fortschritt je Akte/Ermittlung, Verhör-Kurzinfo, Abzeichen, „Deine Fallen“, Serie und die Kennzahlen für die
// Verbund-Kursübersicht (Vertrag §6). Regeln: Spec §2.6, §3.4, §7.9, §8; Muster Algo Quest src/services/stand.js.
//
// Punkte: Lab-Punkte (fortschritt der Ermittlungs-Aufgaben) + bester beendeter Verhör-Versuch je Akte + Trainingsplatz.
// Rang: Anteil der Lab-Punkte an den Level-Punkten der FREIGESCHALTETEN Akten, nur sichtbare Aufgaben (Niveau gA blendet
// eA-Ermittlungen und eA-Aufgaben aus). Cold Cases zählen weder für Punkte noch für Rang, Freischaltung oder Abzeichen.
// Kür (Akte mit kuer: true, Phase 6 Task 7): nur eA, Punkte zählen zu den Gesamtpunkten, aber nicht zum Rang, nicht zu
// den Verbund-Welten und nicht zum Abzeichen „Akte geschlossen“.

const {
  AKTEN,
  ABZEICHEN,
  FALLEN,
  rangFuer,
  VERHOER_AUTO_ANTEIL,
  VERHOER_BESIEGT_ANTEIL,
  ZEHNERSERIE,
  OHNE_TIPP_ANZAHL
} = require('../domain');
const { STANDARD_EINSTELLUNGEN, isoZeit } = require('../kern/konten');

const ERLEDIGT = new Set(['geloest', 'nachgeloest']);
const ABGESCHLOSSEN = new Set(['geloest', 'nachgeloest', 'bearbeitet']);
const NIVEAU_GA = 'gA';
const VERHOER_MODI = Object.freeze(['auto', 'offen', 'gesperrt']);

/** Verhör-Modus einer Akte: eigener Modus der Akte (verhoerAkten) oder der Kurs-Modus. */
const verhoerModus = (einst, nr) => (einst.verhoerAkten && einst.verhoerAkten[String(nr)]) || einst.verhoer;

/** Kurs-Einstellungen aus dem JSON der Tabelle kurse, mit Standardwerten und bereinigt. */
function leseEinstellungen(json) {
  let roh = {};
  try {
    roh = JSON.parse(json || '{}') || {};
  } catch {
    roh = {};
  }
  const e = { ...STANDARD_EINSTELLUNGEN, ...roh };
  e.akten = Array.isArray(e.akten) ? e.akten.filter(Number.isInteger) : [...STANDARD_EINSTELLUNGEN.akten];
  e.niveau = e.niveau === NIVEAU_GA ? NIVEAU_GA : 'eA';
  e.verhoer = VERHOER_MODI.includes(e.verhoer) ? e.verhoer : 'auto';
  // Verhör-Modus je Akte (Phase 6): { "<nr>": 'auto'|'offen'|'gesperrt' } überschreibt den Kurs-Modus für diese Akte.
  const ja = e.verhoerAkten && typeof e.verhoerAkten === 'object' && !Array.isArray(e.verhoerAkten) ? e.verhoerAkten : {};
  e.verhoerAkten = Object.fromEntries(Object.entries(ja).filter(([nr, m]) => /^\d{1,2}$/.test(nr) && VERHOER_MODI.includes(m)));
  e.scoreboard = e.scoreboard === true;
  e.beamer = e.beamer === true;
  return e;
}

/** Sichtbar für ein Kurs-Niveau? gA-Kurse sehen nichts, was als eA markiert ist. */
const niveauSichtbar = (kursNiveau, niveau) => kursNiveau !== NIVEAU_GA || niveau !== 'eA';

function erzeugeStand({ db, inhalte, jetzt = Date.now }) {
  const iso = () => isoZeit(jetzt());
  /** Optional (Verhör-Engine): wertet abgelaufene Verhör-Versuche eines Kurses aus, bevor Punkte gezählt werden. */
  let aufraeumen = null;
  const setzeAufraeumer = (f) => {
    aufraeumen = typeof f === 'function' ? f : null;
  };

  /* ---------- Einstellungen und Sichtbarkeit ---------- */

  function kurs(kursId) {
    const z = db.prepare('SELECT kurs_id, name, aktiv, einstellungen FROM kurse WHERE kurs_id = ?').get(kursId);
    if (!z) return null;
    return { id: z.kurs_id, name: z.name, aktiv: z.aktiv === 1, einstellungen: leseEinstellungen(z.einstellungen) };
  }

  const istFreigeschaltet = (einst, nr) => einst.akten.includes(nr);

  /** Ist die Akte im Kurs-Niveau vorhanden? (Akte 5 nur eA; Akten, deren Ermittlungen alle eA sind) */
  function akteSichtbar(akte, niveau) {
    if (akte.kuer && niveau === NIVEAU_GA) return false; // Kür K1 entfällt im gA-Pfad (Spec §3.4, §18)
    const plan = AKTEN.find((a) => a.nr === akte.nr);
    if (plan && !plan.niveaus.includes(niveau)) return false;
    if (akte.levels.length && !akte.levels.some((l) => niveauSichtbar(niveau, l.niveau))) return false;
    return true;
  }

  /** Sichtbare Ermittlungen einer Akte mit sichtbaren Lab-Aufgaben und neu berechneten maxPunkte. */
  function sichtbareLevels(akte, niveau) {
    return akte.levels
      .filter((l) => niveauSichtbar(niveau, l.niveau))
      .map((l) => {
        const aufgaben = l.aufgaben.filter((id) => niveauSichtbar(niveau, inhalte.aufgabe(id).niveau));
        const maxPunkte = aufgaben.reduce((s, id) => s + inhalte.aufgabe(id).punkte, 0);
        const cc = l.coldCase && niveauSichtbar(niveau, inhalte.aufgabe(l.coldCase).niveau) ? l.coldCase : null;
        return { level: l, aufgaben, coldCase: cc, maxPunkte };
      });
  }

  /** Ist eine Lab- oder Cold-Case-Aufgabe im Kurs-Niveau sichtbar (Aufgabe und ihre Ermittlung)? */
  function aufgabeSichtbar(a, niveau) {
    if (!a || (a.art !== 'lab' && a.art !== 'cc')) return false;
    const l = a.ermittlung ? inhalte.ermittlung(a.ermittlung) : null;
    const akte = inhalte.akte(a.akte);
    if (!l || !akte || !akteSichtbar(akte, niveau)) return false;
    return niveauSichtbar(niveau, l.niveau) && niveauSichtbar(niveau, a.niveau);
  }

  /* ---------- Rohdaten ---------- */

  function fortschritt(sub, kursId) {
    return new Map(
      db
        .prepare('SELECT aufgabe, status, fehlversuche, tipps, punkte FROM fortschritt WHERE sub = ? AND kurs_id = ?')
        .all(sub, kursId)
        .map((z) => [z.aufgabe, z])
    );
  }

  /** Bester beendeter Verhör-Versuch je Akte: Map nr → { punkte, max }. */
  function besteVerhoere(sub, kursId) {
    const m = new Map();
    const zeilen = db
      .prepare('SELECT akte, punkte, max FROM verhoer_versuche WHERE sub = ? AND kurs_id = ? AND ende IS NOT NULL ORDER BY id')
      .all(sub, kursId);
    for (const z of zeilen) {
      const alt = m.get(z.akte);
      if (!alt || z.punkte > alt.punkte) m.set(z.akte, { punkte: z.punkte, max: z.max });
    }
    return m;
  }

  function trainingPunkte(sub, kursId) {
    return db.prepare('SELECT COALESCE(SUM(punkte), 0) AS p FROM training WHERE sub = ? AND kurs_id = ?').get(sub, kursId).p;
  }

  /** Kennzahlen eines Lernenden: Punkte, gelöst, Rang-Anteil, Punkte und Anteil je Akte. */
  function kennzahlenVon(sub, kursId, einst, fm = fortschritt(sub, kursId)) {
    const verhoere = besteVerhoere(sub, kursId);
    let lab = 0;
    let geloest = 0;
    for (const [id, z] of fm) {
      const a = inhalte.aufgabe(id);
      if (!a || a.art !== 'lab') continue;
      lab += z.punkte;
      if (ERLEDIGT.has(z.status)) geloest++;
    }
    const akten = new Map();
    let rangIst = 0;
    let rangMax = 0;
    for (const akte of inhalte.akten()) {
      if (!akteSichtbar(akte, einst.niveau)) continue;
      let ist = 0;
      let max = 0;
      for (const sl of sichtbareLevels(akte, einst.niveau)) {
        max += sl.maxPunkte;
        for (const id of sl.aufgaben) ist += fm.has(id) ? fm.get(id).punkte : 0;
      }
      akten.set(akte.nr, { ist, max, anteil: max ? Math.min(1, ist / max) : 0 });
      if (istFreigeschaltet(einst, akte.nr) && !akte.kuer) {
        rangIst += ist;
        rangMax += max;
      }
    }
    const verhoer = [...verhoere.values()].reduce((s, v) => s + v.punkte, 0);
    const training = trainingPunkte(sub, kursId);
    const anteil = rangMax ? Math.min(1, rangIst / rangMax) : 0;
    return { lab, verhoer, training, gesamt: lab + verhoer + training, geloest, anteil, rangIst, rangMax, akten, verhoere };
  }

  /* ---------- Verhör-Kurzinfo (Freischaltung Spec §7.9; die Engine folgt in Task 7) ---------- */

  function verhoerZugang(einst, akte, ist, max) {
    if (!akte.boss || !akte.boss.pool.length) return { frei: false, grund: 'Für diese Akte gibt es kein Verhör.' };
    if (!istFreigeschaltet(einst, akte.nr)) return { frei: false, grund: 'Diese Akte ist noch nicht freigeschaltet.' };
    const modus = verhoerModus(einst, akte.nr);
    if (modus === 'offen') return { frei: true, grund: null };
    if (modus === 'gesperrt') return { frei: false, grund: 'Die Verhöre sind in deinem Kurs noch gesperrt.' };
    // Akte ohne Lab-Aufgaben (Akte 7, Generalprobe – Spec §10): keine Level-Punkte, die Freischaltung der Akte genügt.
    if (!max) return { frei: true, grund: null };
    const noetig = Math.ceil(VERHOER_AUTO_ANTEIL * max);
    if (ist >= noetig) return { frei: true, grund: null };
    return { frei: false, grund: `Sammle mindestens 60 % der Punkte der Ermittlungen dieser Akte (${ist} von ${noetig} nötigen Punkten).` };
  }

  /* ---------- Serie ---------- */

  function serie(sub, kursId) {
    return db.prepare('SELECT serie, bestwert FROM serien WHERE sub = ? AND kurs_id = ?').get(sub, kursId) || { serie: 0, bestwert: 0 };
  }

  /** Serie fortschreiben: ohneFehler → +1 (Bestwert mitziehen), sonst auf 0. */
  function serieFortschreiben(sub, kursId, ohneFehler) {
    db.prepare('INSERT OR IGNORE INTO serien (sub, kurs_id, serie, bestwert) VALUES (?, ?, 0, 0)').run(sub, kursId);
    if (ohneFehler) {
      db.prepare('UPDATE serien SET serie = serie + 1, bestwert = MAX(bestwert, serie + 1) WHERE sub = ? AND kurs_id = ?').run(sub, kursId);
    } else {
      db.prepare('UPDATE serien SET serie = 0 WHERE sub = ? AND kurs_id = ?').run(sub, kursId);
    }
  }

  /* ---------- Abzeichen ---------- */

  /** Abzeichen-Definitionen; mit niveau nur die Akten, die es im Kurs-Niveau gibt (gA: ohne Akte 5, Probelauf 8). */
  function definitionen(niveau = null) {
    const liste = [];
    for (const d of ABZEICHEN) {
      if (!d.jeAkte) {
        liste.push({ id: d.id, name: d.name, beschreibung: d.beschreibung });
        continue;
      }
      for (const akte of inhalte.akten()) {
        if (akte.kuer) continue;
        if (niveau && !akteSichtbar(akte, niveau)) continue;
        // „Akte geschlossen“ nur für Akten mit Lab-Aufgaben (Akte 7 = Generalprobe hat eine Ermittlung ohne Aufgaben)
        if (d.id === 'akte-geschlossen' && !akte.levels.some((l) => l.aufgaben.length)) continue;
        if (d.id === 'beweisstueck' && !(akte.boss && akte.boss.pool.length)) continue;
        liste.push({ id: `${d.id}-${akte.nr}`, name: d.name, beschreibung: d.beschreibung, akte: akte.nr, akteTitel: akte.titel });
      }
    }
    return liste;
  }

  function erfolg(kursId, sub, art) {
    db.prepare('INSERT INTO erfolge (kurs_id, sub, art, zeit) VALUES (?, ?, ?, ?)').run(kursId, sub, art, iso());
  }

  const istSchuelerKonto = (sub) => {
    const k = db.prepare('SELECT rolle FROM konten WHERE sub = ?').get(sub);
    return !!k && k.rolle === 'schueler';
  };

  /** Bedingungen auswerten, neue Abzeichen speichern (Erfolge-Feed nur für Schüler) und zurückgeben. */
  function pruefeAbzeichen(sub, kursId) {
    const k = kurs(kursId);
    if (!k) return [];
    const einst = k.einstellungen;
    const hat = new Set(db.prepare('SELECT abzeichen FROM abzeichen WHERE sub = ? AND kurs_id = ?').all(sub, kursId).map((z) => z.abzeichen));
    const fm = fortschritt(sub, kursId);
    const erfuellt = new Set();

    let ohneTipp = 0;
    let einsGeloest = false;
    for (const [id, z] of fm) {
      const a = inhalte.aufgabe(id);
      if (!a || a.art !== 'lab' || !ERLEDIGT.has(z.status)) continue;
      einsGeloest = true;
      if (z.status === 'geloest' && a.stufe === 3 && z.tipps === 0 && z.fehlversuche === 0) ohneTipp++;
    }
    if (einsGeloest) erfuellt.add('erste-spur');
    if (serie(sub, kursId).bestwert >= ZEHNERSERIE) erfuellt.add('zehnerserie');
    if (ohneTipp >= OHNE_TIPP_ANZAHL) erfuellt.add('ohne-tipp');
    for (const akte of inhalte.akten()) {
      if (!akteSichtbar(akte, einst.niveau)) continue;
      const ids = sichtbareLevels(akte, einst.niveau).flatMap((sl) => sl.aufgaben);
      if (ids.length && ids.every((id) => fm.has(id) && ABGESCHLOSSEN.has(fm.get(id).status))) erfuellt.add(`akte-geschlossen-${akte.nr}`);
    }
    for (const [nr, v] of besteVerhoere(sub, kursId)) {
      if (!v.max) continue;
      const q = v.punkte / v.max;
      if (q >= VERHOER_BESIEGT_ANTEIL - 1e-9) erfuellt.add(`beweisstueck-${nr}`);
      if (q >= 1 - 1e-9) erfuellt.add('makellos');
    }

    const neu = [];
    const schueler = istSchuelerKonto(sub);
    const ins = db.prepare('INSERT OR IGNORE INTO abzeichen (sub, kurs_id, abzeichen, zeit) VALUES (?, ?, ?, ?)');
    db.transaction(() => {
      for (const d of definitionen(einst.niveau)) {
        if (!erfuellt.has(d.id) || hat.has(d.id)) continue;
        ins.run(sub, kursId, d.id, iso());
        if (schueler) erfolg(kursId, sub, `abzeichen:${d.id}`);
        neu.push(d);
      }
    })();
    return neu;
  }

  function abzeichenVon(sub, kursId) {
    const hat = new Map(db.prepare('SELECT abzeichen, zeit FROM abzeichen WHERE sub = ? AND kurs_id = ?').all(sub, kursId).map((z) => [z.abzeichen, z.zeit]));
    const k = kurs(kursId);
    return definitionen(k ? k.einstellungen.niveau : null).map((d) => ({ ...d, erhalten: hat.has(d.id), am: hat.get(d.id) || null }));
  }

  function fallenVon(sub, kursId) {
    const m = new Map(db.prepare('SELECT falle, anzahl FROM fallen_zaehler WHERE sub = ? AND kurs_id = ?').all(sub, kursId).map((z) => [z.falle, z.anzahl]));
    return FALLEN.map((f) => ({ nr: f.nr, titel: f.titel, anzahl: m.get(f.nr) || 0 }));
  }

  /* ---------- Stand für die Oberfläche ---------- */

  function aufgabeKurz(id, fm) {
    const a = inhalte.aufgabe(id);
    const z = fm.get(id);
    return { id, titel: a.titel, stufe: a.stufe, punkte: a.punkte, kategorie: a.kategorie, status: z ? z.status : 'offen', erreicht: z ? z.punkte : 0 };
  }

  function ermittlungKurz(sl, fm) {
    const l = sl.level;
    let punkte = 0;
    let geloest = 0;
    for (const id of sl.aufgaben) {
      const z = fm.get(id);
      if (!z) continue;
      punkte += z.punkte;
      if (ABGESCHLOSSEN.has(z.status)) geloest++;
    }
    const cc = sl.coldCase ? inhalte.aufgabe(sl.coldCase) : null;
    return {
      id: l.id,
      nr: l.nr,
      titel: l.titel,
      niveau: l.niveau,
      ds: l.ds,
      ab: l.ab,
      briefing: l.briefing,
      anzahl: sl.aufgaben.length,
      geloest,
      punkte,
      maxPunkte: sl.maxPunkte,
      anteil: sl.maxPunkte ? Math.min(1, punkte / sl.maxPunkte) : 0,
      aufgaben: sl.aufgaben.map((id) => aufgabeKurz(id, fm)),
      coldCase: cc ? { id: cc.id, titel: cc.titel, status: fm.has(cc.id) ? fm.get(cc.id).status : 'offen' } : null
    };
  }

  /**
   * Stand für GET /api/kurse/:kurs/stand. zugang: { rolle: 'schueler' | 'lehrkraft', nurLesen }.
   * Lehrkraft/Superadmin sehen alle Akten (frei), Schüler nur freigeschaltete (sonst „im Nebel“ ohne Ermittlungen).
   */
  function stand(sub, kursId, zugang = { rolle: 'schueler' }) {
    if (aufraeumen) aufraeumen(kursId);
    const k = kurs(kursId);
    if (!k) return null;
    const einst = k.einstellungen;
    const fm = fortschritt(sub, kursId);
    const kz = kennzahlenVon(sub, kursId, einst, fm);
    const akten = [];
    for (const akte of inhalte.akten()) {
      if (!akteSichtbar(akte, einst.niveau)) continue;
      const freigeschaltet = istFreigeschaltet(einst, akte.nr);
      const frei = freigeschaltet || zugang.rolle !== 'schueler';
      const ak = kz.akten.get(akte.nr);
      const bester = kz.verhoere.get(akte.nr) || null;
      let verhoer = null;
      if (frei && akte.boss && akte.boss.pool.length) {
        const z = verhoerZugang(einst, akte, ak.ist, ak.max);
        verhoer = {
          id: akte.boss.id,
          titel: akte.boss.titel,
          frei: z.frei,
          grund: z.grund,
          bester,
          besiegt: !!(bester && bester.max && bester.punkte / bester.max >= VERHOER_BESIEGT_ANTEIL - 1e-9)
        };
      }
      akten.push({
        nr: akte.nr,
        titel: akte.titel,
        farbe: akte.farbe,
        kuer: !!akte.kuer,
        freigeschaltet,
        frei,
        punkte: ak.ist,
        maxPunkte: ak.max,
        anteil: ak.anteil,
        ermittlungen: frei ? sichtbareLevels(akte, einst.niveau).map((sl) => ermittlungKurz(sl, fm)) : [],
        verhoer
      });
    }
    return {
      kurs: { id: k.id, name: k.name, aktiv: k.aktiv, niveau: einst.niveau, rolle: zugang.rolle, nurLesen: !!zugang.nurLesen, scoreboard: einst.scoreboard === true },
      punkte: { gesamt: kz.gesamt, lab: kz.lab, verhoer: kz.verhoer, training: kz.training },
      geloest: kz.geloest,
      rang: { ...rangFuer(kz.anteil), punkte: kz.rangIst, maxPunkte: kz.rangMax },
      akten,
      abzeichen: abzeichenVon(sub, kursId),
      fallen: fallenVon(sub, kursId)
    };
  }

  /**
   * Letzte Aktivität eines Kontos in diesem Kurs (Vertrag §6 `zuletzt`): späteste Zeit aus Lernstand (Lösen, Aufdecken)
   * und Verhör-Versuchen; ohne Aktivität die letzte Anmeldung. Leere Zeitangaben → null. Alle Zeiten im Format
   * JJJJ-MM-TTThh:mm:ssZ, daher ist der Textvergleich zugleich der Zeitvergleich.
   */
  function zuletztAktiv(sub, kursId) {
    const z = db
      .prepare(
        `SELECT MAX(t) AS t FROM (
           SELECT MAX(zeit) AS t FROM fortschritt WHERE sub = ? AND kurs_id = ?
           UNION ALL SELECT MAX(COALESCE(ende, beginn)) FROM verhoer_versuche WHERE sub = ? AND kurs_id = ?
           UNION ALL SELECT zuletzt FROM konten WHERE sub = ?
         ) WHERE t IS NOT NULL AND t != ''`
      )
      .get(sub, kursId, sub, kursId, sub);
    return z && z.t ? z.t : null;
  }

  /**
   * Kennzahlen für die Verbund-Kursübersicht (Vertrag §6) – nur Zahlen, keine Namen.
   * → { schueler: Map sub → { punkte, geloest, anteil, zuletzt }, welten: [{ nr, titel, anteil }] }
   * welten: Akten des Plans (1–7) und alle geladenen Akten, die es im Kurs-Niveau gibt (gA ohne Akte 5);
   * anteil = Durchschnitt der Schüler-Anteile je Akte.
   */
  function kennzahlen(kursId, subs) {
    if (aufraeumen) aufraeumen(kursId);
    const k = kurs(kursId);
    const einst = k ? k.einstellungen : leseEinstellungen('{}');
    const schueler = new Map();
    const summen = new Map();
    for (const sub of subs) {
      const kz = kennzahlenVon(sub, kursId, einst);
      schueler.set(sub, { punkte: kz.gesamt, geloest: kz.geloest, anteil: kz.anteil, zuletzt: zuletztAktiv(sub, kursId) });
      for (const [nr, a] of kz.akten) summen.set(nr, (summen.get(nr) || 0) + a.anteil);
    }
    const titel = new Map(AKTEN.filter((a) => a.niveaus.includes(einst.niveau)).map((a) => [a.nr, a.titel]));
    for (const a of inhalte.akten()) if (!titel.has(a.nr) && !a.kuer && akteSichtbar(a, einst.niveau)) titel.set(a.nr, a.titel);
    const welten = [...titel.entries()]
      .sort((x, y) => x[0] - y[0])
      .map(([nr, t]) => ({ nr, titel: t, anteil: subs.length ? (summen.get(nr) || 0) / subs.length : 0 }));
    return { schueler, welten };
  }

  return {
    setzeAufraeumer,
    kurs,
    istFreigeschaltet,
    akteSichtbar,
    aufgabeSichtbar,
    sichtbareLevels,
    verhoerZugang,
    serie,
    serieFortschreiben,
    definitionen,
    pruefeAbzeichen,
    abzeichenVon,
    fallenVon,
    erfolg,
    istSchuelerKonto,
    stand,
    kennzahlen,
    zuletztAktiv,
    ermittlungKurz,
    aufgabeKurz,
    fortschritt
  };
}

module.exports = { erzeugeStand, leseEinstellungen, niveauSichtbar, verhoerModus, VERHOER_MODI };
