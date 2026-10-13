'use strict';
// Fallebene (Plan Phase 6 Task 2, Spec §7.7, E10, STORY.md §4, §6, §7, DESIGN.md §5.10): Pinnwand der Detektei mit
// den Beweisstücken (Polaroids) der gewonnenen Verhöre, Steckbrief des Phantoms und Indizienkette des Schlussplädoyers.
//
// Daten: seed/fallebene.json (Format docs/AUFGABENFORMAT.md §11) – Beweisstücke je Akte und Steckbrief-Hinweise je
// Akte. Das Plädoyer selbst steht in der Ermittlung (levels[].plaedoyer, §2.1).
//
// Freischaltung (Lösungsfreiheit, Vertrag §9):
// - Beweisstück einer Akte: Titel, Bild, Text und Notiz erst, wenn das Verhör der Akte gewonnen ist (bester beendeter
//   Versuch ≥ 50 %); vorher nur „Verhör n“.
// - Steckbrief-Hinweis einer Akte (Regel E10): sobald das Verhör der Akte gewonnen ist ODER die Lehrkraft eine spätere
//   Akte des Plans (1–7) freischaltet; optional zusätzlich nach dem abgeschlossenen Plädoyer der Ermittlung
//   `auchNachPlaedoyer` (Akte 6: der Name steht ohnehin in der Auflösung). Felder ohne sichtbaren Hinweis kommen ohne
//   Einträge („unbekannt“).
// - Indiz und Auflösung: wie in der Lern-API erst nach dem Lösen (src/content/plaedoyer.js).

const fs = require('node:fs');
const path = require('node:path');
const F = require('../content/format');
const PL = require('../content/plaedoyer');
const { AKTEN, VERHOER_BESIEGT_ANTEIL } = require('../domain');

const STANDARD_DATEI = path.join(__dirname, '..', '..', 'seed', 'fallebene.json');
/** Illustrationen der Polaroids (public/static/js/lernen/pinnwand_bilder.js). */
const BILDER = Object.freeze(['fundbuch', 'schloss', 'bon', 'ausweis', 'netz', 'steckbrief', 'lizenz']);
const FELD_ID = /^[a-z][a-z0-9_]{0,29}$/;
const LEVEL_ID = /^A\d{1,2}-E\d{1,2}$/;
const PLAN = new Set(AKTEN.map((a) => a.nr));

const istObjekt = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const istText = (x) => typeof x === 'string' && x.trim().length > 0;
const istAkte = (n) => Number.isInteger(n) && n >= 1 && n <= 99;

/* ---------- Prüfung des Seeds ---------- */

/**
 * Format von seed/fallebene.json prüfen (AUFGABENFORMAT §11).
 * @returns {{ fehler: string[], hinweise: string[] }}
 */
function pruefeFallebene(d) {
  const fehler = [];
  const hinweise = [];
  const f = (t) => fehler.push(t);
  const unbekannt = (o, erlaubt, ort) => {
    for (const k of Object.keys(o)) if (!erlaubt.includes(k)) f(`${ort}: unbekanntes Feld „${k}“.`);
  };
  const text = (wert, ort, pflicht = true) => {
    if (wert === undefined && !pflicht) return;
    if (!istText(wert)) return f(`${ort} muss ein nicht leerer Text sein.`);
    for (const t of F.pruefeMarkdown(wert)) f(`${ort}: ${t}`);
    if (F.luecken([{ t: 'text', md: wert }]).length) f(`${ort}: Lücken [[…]] sind hier nicht erlaubt.`);
  };
  if (!istObjekt(d)) return { fehler: ['Die Datei muss ein JSON-Objekt { "version": 1, "beweisstuecke": […], "steckbrief": {…} } enthalten.'], hinweise };
  unbekannt(d, ['version', 'beweisstuecke', 'steckbrief'], 'Datei');
  if (d.version !== 1) f(`version muss 1 sein (gefunden: ${JSON.stringify(d.version)}).`);

  if (!Array.isArray(d.beweisstuecke)) f('beweisstuecke muss eine Liste sein.');
  else {
    const akten = new Set();
    d.beweisstuecke.forEach((b, i) => {
      const ort = `beweisstuecke[${i}]`;
      if (!istObjekt(b)) return f(`${ort} ist kein Objekt.`);
      unbekannt(b, ['akte', 'titel', 'bild', 'text', 'notiz'], ort);
      if (!istAkte(b.akte)) f(`${ort}: akte muss eine Aktennummer sein.`);
      else if (akten.has(b.akte)) f(`${ort}: Akte ${b.akte} kommt doppelt vor.`);
      akten.add(b.akte);
      if (!istText(b.titel)) f(`${ort}: titel fehlt.`);
      if (!BILDER.includes(b.bild)) f(`${ort}: bild muss eines von ${BILDER.join(', ')} sein.`);
      text(b.text, `${ort}.text`);
      text(b.notiz, `${ort}.notiz`, false);
    });
  }

  const s = d.steckbrief;
  if (!istObjekt(s)) f('steckbrief muss ein Objekt { felder, hinweise } sein.');
  else {
    unbekannt(s, ['felder', 'hinweise'], 'steckbrief');
    const felder = new Set();
    if (!Array.isArray(s.felder) || !s.felder.length) f('steckbrief.felder fehlt oder ist leer.');
    else {
      s.felder.forEach((x, i) => {
        const ort = `steckbrief.felder[${i}]`;
        if (!istObjekt(x)) return f(`${ort} ist kein Objekt.`);
        unbekannt(x, ['id', 'titel'], ort);
        if (typeof x.id !== 'string' || !FELD_ID.test(x.id)) f(`${ort}: id muss aus Kleinbuchstaben bestehen (z. B. "jahrgang").`);
        else if (felder.has(x.id)) f(`${ort}: id „${x.id}“ kommt doppelt vor.`);
        felder.add(x.id);
        if (!istText(x.titel)) f(`${ort}: titel fehlt.`);
      });
    }
    if (!Array.isArray(s.hinweise)) f('steckbrief.hinweise muss eine Liste sein.');
    else {
      const akten = new Set();
      s.hinweise.forEach((x, i) => {
        const ort = `steckbrief.hinweise[${i}]`;
        if (!istObjekt(x)) return f(`${ort} ist kein Objekt.`);
        unbekannt(x, ['akte', 'eintraege', 'stempel', 'auchNachPlaedoyer'], ort);
        if (!istAkte(x.akte)) f(`${ort}: akte muss eine Aktennummer sein.`);
        else if (akten.has(x.akte)) f(`${ort}: Akte ${x.akte} kommt doppelt vor.`);
        akten.add(x.akte);
        if (x.stempel !== undefined && !istText(x.stempel)) f(`${ort}: stempel muss Text sein.`);
        if (x.auchNachPlaedoyer !== undefined && !(typeof x.auchNachPlaedoyer === 'string' && LEVEL_ID.test(x.auchNachPlaedoyer))) {
          f(`${ort}: auchNachPlaedoyer muss eine Ermittlungs-id A<n>-E<k> sein.`);
        }
        if (!Array.isArray(x.eintraege)) return f(`${ort}: eintraege muss eine Liste sein.`);
        if (!x.eintraege.length && x.stempel === undefined) hinweise.push(`${ort}: Hinweis ohne Einträge und ohne Stempel.`);
        x.eintraege.forEach((e, k) => {
          const o = `${ort}.eintraege[${k}]`;
          if (!istObjekt(e)) return f(`${o} ist kein Objekt.`);
          unbekannt(e, ['feld', 'text', 'ersetzt'], o);
          if (!felder.has(e.feld)) f(`${o}: unbekanntes Feld „${e.feld}“ (nicht in steckbrief.felder).`);
          text(e.text, `${o}.text`);
          if (e.ersetzt !== undefined && typeof e.ersetzt !== 'boolean') f(`${o}: ersetzt muss true oder false sein.`);
        });
      });
    }
  }
  return { fehler, hinweise };
}

/** seed/fallebene.json lesen und prüfen; bei Fehlern null (die Pinnwand bleibt dann leer) und Protokoll. */
function ladeFallebene(datei = STANDARD_DATEI, { log = () => {} } = {}) {
  let d;
  try {
    let t = fs.readFileSync(datei, 'utf8');
    if (t.charCodeAt(0) === 0xfeff) t = t.slice(1);
    d = JSON.parse(t);
  } catch (e) {
    log(`Fallebene ${path.basename(datei)}: ${e.code === 'ENOENT' ? 'Datei nicht gefunden' : 'kein gültiges JSON'} – Pinnwand ohne Beweisstücke.`);
    return null;
  }
  const r = pruefeFallebene(d);
  if (r.fehler.length) {
    log(`Fallebene ${path.basename(datei)}: ${r.fehler.length} Fehler – Pinnwand ohne Beweisstücke.`);
    for (const t of r.fehler) log(`  ${t}`);
    return null;
  }
  return d;
}

/* ---------- Dienst ---------- */

/**
 * @param {{ db, inhalte, stand, lernen, daten: object|null, aufraeumen?: (kursId) => void }} opt
 *   daten = geprüfter Inhalt von seed/fallebene.json (null → leere Pinnwand, Plädoyer trotzdem).
 */
function erzeugeFallebene({ db, inhalte, stand, lernen, daten, aufraeumen = null }) {
  const beweise = daten && Array.isArray(daten.beweisstuecke) ? [...daten.beweisstuecke].sort((a, b) => a.akte - b.akte) : [];
  const felder = daten && daten.steckbrief ? daten.steckbrief.felder : [];
  const hinweise = daten && daten.steckbrief ? [...daten.steckbrief.hinweise].sort((a, b) => a.akte - b.akte) : [];

  /** Akten mit gewonnenem Verhör (bester beendeter Versuch ≥ 50 %). */
  function gewonnen(sub, kursId) {
    const set = new Set();
    for (const z of db.prepare('SELECT akte, punkte, max FROM verhoer_versuche WHERE sub = ? AND kurs_id = ? AND ende IS NOT NULL').all(sub, kursId)) {
      if (z.max > 0 && z.punkte / z.max >= VERHOER_BESIEGT_ANTEIL - 1e-9) set.add(z.akte);
    }
    return set;
  }

  /** Ist eine Akte im Kurs-Niveau vorhanden? Plan-Akten nach domain.AKTEN, sonst nach dem geladenen Seed. */
  function akteImNiveau(nr, niveau) {
    const plan = AKTEN.find((a) => a.nr === nr);
    const geladen = inhalte.akte(nr);
    if (geladen) return stand.akteSichtbar(geladen, niveau);
    return !!plan && plan.niveaus.includes(niveau);
  }

  /** Bereinigtes Plädoyer einer Ermittlung als Kette für dieses Konto (oder null). */
  function ketteVon(level, z, fm) {
    if (!level || !level.plaedoyer) return null;
    return PL.kette(level.plaedoyer, {
      status: (id) => (fm.has(id) ? fm.get(id).status : 'offen'),
      titel: (id) => (inhalte.aufgabe(id) || {}).titel || id,
      sichtbar: (id) => stand.aufgabeSichtbar(inhalte.aufgabe(id), z.einst.niveau)
    });
  }

  /** Erstes sichtbares Plädoyer (Aktenreihenfolge). */
  function plaedoyer(z, fm) {
    for (const akte of inhalte.akten()) {
      if (!stand.akteSichtbar(akte, z.einst.niveau)) continue;
      for (const sl of stand.sichtbareLevels(akte, z.einst.niveau)) {
        if (!sl.level.plaedoyer) continue;
        if (z.rolle === 'schueler' && !stand.istFreigeschaltet(z.einst, akte.nr)) return { frei: false, akte: { nr: akte.nr } };
        const k = ketteVon(sl.level, z, fm);
        if (!k || !k.anzahl) continue;
        return {
          frei: true,
          akte: { nr: akte.nr, titel: akte.titel, farbe: akte.farbe },
          ermittlung: { id: sl.level.id, nr: sl.level.nr, titel: sl.level.titel },
          ...k
        };
      }
    }
    return null;
  }

  function pinnwand(sitzung, kursId) {
    const z = lernen.zugang(sitzung, kursId);
    if (aufraeumen) aufraeumen(z.kurs.id);
    const einst = z.einst;
    const sieg = gewonnen(z.sub, z.kurs.id);
    const fm = stand.fortschritt(z.sub, z.kurs.id);

    const hinweisSichtbar = (h) => {
      if (sieg.has(h.akte)) return true;
      if (einst.akten.some((m) => PLAN.has(m) && m > h.akte)) return true;
      if (h.auchNachPlaedoyer) {
        const k = ketteVon(inhalte.ermittlung(h.auchNachPlaedoyer), z, fm);
        if (k && k.abgeschlossen) return true;
      }
      return false;
    };
    const sichtbar = hinweise.filter(hinweisSichtbar);

    // Steckbrief: Einträge der sichtbaren Hinweise in Aktenreihenfolge; „ersetzt“ verdrängt frühere Einträge.
    const eintraege = new Map(felder.map((x) => [x.id, []]));
    let stempel = null;
    for (const h of sichtbar) {
      for (const e of h.eintraege) {
        const liste = eintraege.get(e.feld);
        if (!liste) continue;
        if (e.ersetzt) liste.length = 0;
        liste.push({ akte: h.akte, text: e.text });
      }
      if (h.stempel) stempel = h.stempel;
    }

    const beweisstuecke = beweise
      .filter((b) => akteImNiveau(b.akte, einst.niveau))
      .map((b) => {
        const out = { akte: b.akte, verhoer: `Verhör ${b.akte}`, gewonnen: sieg.has(b.akte) };
        if (!out.gewonnen) return out;
        Object.assign(out, { titel: b.titel, bild: b.bild, text: b.text });
        if (b.notiz) out.notiz = b.notiz;
        const h = hinweise.find((x) => x.akte === b.akte);
        out.erkenntnis = h ? h.eintraege.map((e) => e.text) : [];
        return out;
      });

    return {
      kurs: { id: z.kurs.id, name: z.kurs.name, niveau: einst.niveau, rolle: z.rolle, nurLesen: z.nurLesen },
      beweisstuecke,
      steckbrief: {
        felder: felder.map((x) => ({ id: x.id, titel: x.titel, eintraege: eintraege.get(x.id) })),
        hinweise: sichtbar.filter((h) => h.eintraege.length).length,
        gesamt: hinweise.filter((h) => h.eintraege.length).length,
        stempel
      },
      plaedoyer: plaedoyer(z, fm)
    };
  }

  return { pinnwand };
}

module.exports = { pruefeFallebene, ladeFallebene, erzeugeFallebene, BILDER, STANDARD_DATEI };
