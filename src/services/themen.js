'use strict';
// Themenseite aus dem Seed (Spec §7.12, Plan Phase 3 Task 10): GET /api/themen.
// Je Akte: Titel, Fach, Niveaus, DS, Ermittlungen (DS, Titel, Niveau, Anzahl Aufgaben, Kompetenzen und Fallen
// zusammengefasst, Aufgabenarten), Verhör-Titel, Materialliste (Titel, Akte, Niveau, „nach Anmeldung“; Gast-Auswahl
// mit Link; aus den Whitelists der Materialien, sonst die geplanten Titel; E13).
// Akten ohne geladene Inhalte erscheinen mit status „folgt“ und den geplanten Ermittlungen (Spec §3.3).
// NIE: Aufgabentexte, Aufgabentitel, Lösungen, Tipps, Erklärungen, Briefings, Verhör-Pools.

const { AKTEN, FALLEN } = require('../domain');
const F = require('../content/format');

/** Plan der Akten (Spec §3.3; bisher statisch in public/themen.html). */
const PLAN = Object.freeze({
  1: {
    fach: 'SQL in einer Tabelle',
    ermittlungen: [
      { nr: '1.1', titel: 'Der erste Auftrag', ds: [1], beschreibung: 'Tabelle, Datensatz, Attribut, Primärschlüssel; SELECT, FROM, WHERE, Vergleichsoperatoren, AND/OR/NOT, ORDER BY.' },
      { nr: '1.2', titel: 'Das verschwundene Fundstück', ds: [2], beschreibung: 'DISTINCT, LIKE, BETWEEN, IN, IS NULL, Berechnungen, AS, LIMIT; Literale für Text und Datum.' }
    ]
  },
  2: {
    fach: 'Verbund über mehrere Tabellen',
    ermittlungen: [
      { nr: '2.1', titel: 'Der rote Faden', ds: [3], beschreibung: 'Fremdschlüssel, Kurzschreibweise, Verbund mit FROM … WHERE, Kreuzprodukt erkennen, Tabellenpräfix.' },
      { nr: '2.2', titel: 'Nachtfahrten', ds: [4], beschreibung: 'Verbund über drei und mehr Tabellen, Tabellenaliase, zwei Fremdschlüssel auf dieselbe Tabelle, IS NULL.' }
    ]
  },
  3: {
    fach: 'Aggregation und Gruppierung',
    ermittlungen: [
      { nr: '3.1', titel: 'Kassensturz', ds: [5], beschreibung: 'Aggregatfunktionen, COUNT oder SUM, GROUP BY und die GROUP-BY-Regel.' },
      { nr: '3.2', titel: 'Die Statistik lügt nicht', ds: [6], beschreibung: 'HAVING oder WHERE, Top-n mit ORDER BY und LIMIT, Vervielfachung im Verbund, Abfragen analysieren.' }
    ]
  },
  4: {
    fach: 'Redundanz, Anomalien, Schlüssel',
    ermittlungen: [
      { nr: '4.1', titel: 'Die Excel-Liste', ds: [7], beschreibung: 'Redundanz, Einfüge-, Änderungs- und Löschanomalie am konkreten Datensatz, nicht-atomare Werte.' },
      { nr: '4.2', titel: 'Ordnung ins Archiv', ds: [8], beschreibung: 'Schlüssel beurteilen, verlustfrei und redundanzfrei zerlegen; Kür: Normalformen.' }
    ]
  },
  5: {
    fach: 'ER-Modell und Überführung',
    ermittlungen: [
      { nr: '5.1', titel: 'Baupläne lesen', ds: [9], beschreibung: 'Chen-Notation, Kardinalitäten 1:1, 1:n und n:m, Beziehungsattribute.' },
      { nr: '5.2', titel: 'Der Architekturwettbewerb', ds: [10], beschreibung: 'ER-Modelle entwickeln, rekursive und ternäre Beziehungstypen, Modellierungen beurteilen.' },
      { nr: '5.3', titel: 'Vom Plan zur Datenbank', ds: [11], beschreibung: 'Überführung ins relationale Modell und Begründung der Umsetzung.' }
    ]
  },
  6: {
    fach: 'Datenschutz und automatisierte Datenanalyse',
    ermittlungen: [
      { nr: '6.1', titel: 'Das Phantom', ds: [12], beschreibung: 'Pseudonyme Datenbestände verknüpfen, Quasi-Identifikatoren, Grundsätze der DSGVO, Datenschutz und Datensicherheit.' }
    ]
  },
  7: {
    fach: 'Probeklausur im Abitur-Format',
    ermittlungen: [
      { nr: '7', titel: 'Die Ermittlerprüfung', ds: [13], beschreibung: 'Probeklausur (eA 30 BE, gA 25 BE), Korrektur nach Kernpunkten, Fallen-Check P1–P10.' }
    ]
  }
});

/** Verhöre laut Plan (Titel kommen aus dem Seed, sobald die Akte Inhalte hat). */
const VERHOER_PLAN = Object.freeze({ 1: 'Verhör 1', 2: 'Verhör 2', 3: 'Verhör 3', 4: 'Verhör 4', 5: 'Verhör 5', 6: 'Verhör 6', 7: 'Verhör 7' });

/** Kür (Spec §3.3). */
const KUER = Object.freeze([
  { id: 'K1', titel: 'Eigene Datenbank bauen', wann: 'nach DS 11', beschreibung: 'CREATE TABLE, INSERT, referentielle Integrität, Ausblick auf JOIN … ON – nicht im Abitur.', eA: true, gA: false },
  { id: 'K2', titel: 'Escape Room Weserstedt', wann: 'vor DS 13', beschreibung: 'Live-Modus im Kurs: Teams lösen Stationen zu allen Akten.', eA: true, gA: true }
]);

/** Kurztitel der Kompetenzen DB-K01 … DB-K48 (Spec §4, verdichtet). */
const KOMPETENZEN = Object.freeze({
  'DB-K01': 'Tabelle, Datensatz, Attribut erläutern',
  'DB-K02': 'Primärschlüssel erläutern und beurteilen',
  'DB-K03': 'Fremdschlüssel als Verweis nutzen',
  'DB-K04': 'Kurzschreibweise lesen und notieren',
  'DB-K05': 'Kennzeichnungen im Schema erläutern',
  'DB-K06': 'Referentielle Integrität erläutern',
  'DB-K07': 'Redundanzen identifizieren',
  'DB-K08': 'Anomalien an konkreten Daten erläutern',
  'DB-K09': 'Schema auf Anomalien untersuchen',
  'DB-K10': 'Redundanz und Anomalie verbinden',
  'DB-K11': 'Verlustfrei und redundanzfrei zerlegen',
  'DB-K12': 'Redundanzfreiheit begründen',
  'DB-K13': 'Abhängigkeiten und Normalformen',
  'DB-K14': 'Nicht-atomare Werte erkennen',
  'DB-K15': 'SELECT, FROM, WHERE, DISTINCT',
  'DB-K16': 'Aliase und qualifizierte Namen',
  'DB-K17': 'Vergleiche, AND/OR/NOT, Klammern',
  'DB-K18': 'BETWEEN, IN, IS NULL',
  'DB-K19': 'LIKE mit _ und %',
  'DB-K20': 'Berechnungen in Spalten und Bedingungen',
  'DB-K21': 'ORDER BY, auch mehrstufig',
  'DB-K22': 'LIMIT (Top-n)',
  'DB-K23': 'Verbund über zwei Tabellen',
  'DB-K24': 'Verbund über drei und mehr Tabellen',
  'DB-K25': 'Aggregatfunktionen',
  'DB-K26': 'GROUP BY und GROUP-BY-Regel',
  'DB-K27': 'HAVING und WHERE unterscheiden',
  'DB-K28': 'Abfrage im Sachzusammenhang analysieren',
  'DB-K29': 'Ergebnis einer Abfrage angeben',
  'DB-K30': 'Vorgehen in Worten beschreiben',
  'DB-K31': 'Korrektheit einer Abfrage beurteilen',
  'DB-K32': 'Literale korrekt notieren',
  'DB-K33': 'ER-Diagramm interpretieren',
  'DB-K34': 'Kardinalitäten bestimmen und begründen',
  'DB-K35': 'ER-Modell entwickeln',
  'DB-K36': 'Attribute an Beziehungstypen',
  'DB-K37': 'Rekursive Beziehungen modellieren',
  'DB-K38': 'Mehrfache und ternäre Beziehungen',
  'DB-K39': 'ER-Modell ergänzen',
  'DB-K40': 'Modellierung beurteilen',
  'DB-K41': 'ER-Modell überführen',
  'DB-K42': 'Umsetzungsregeln begründen',
  'DB-K43': 'ER-Diagramm rekonstruieren',
  'DB-K44': 'Informationelle Selbstbestimmung, DSGVO',
  'DB-K45': 'Datenschutz-Prinzipien anwenden',
  'DB-K46': 'Chancen und Risiken der Datenanalyse',
  'DB-K47': 'Fachsprache konsequent nutzen',
  'DB-K48': 'Datenbank im Team planen'
});

/** „K15“ oder „DB-K15“ → „DB-K15“ (sonst null). */
function kompetenzId(x) {
  const m = /^(?:DB-)?K(\d{2})$/.exec(String(x));
  return m ? `DB-K${m[1]}` : null;
}

const nachNr = (a, b) => Number(a.slice(1)) - Number(b.slice(1));
const dsText = (ds) => (ds.length ? 'DS ' + ds.join(', ') : '');

/** Materialien je Akte: nur Titel (E13: Download nach Anmeldung bzw. Gast-Auswahl). */
function materialien(nr, ermittlungen) {
  const liste = ermittlungen.map((e) => ({
    art: 'Arbeitsblatt',
    titel: nr === 7 ? 'Generalprobe eA/gA (Aufgaben, Freigabe durch die Lehrkraft)' : e.ab || `AB ${e.nr} ${e.titel}`,
    zugang: 'nach Anmeldung'
  }));
  liste.push({ art: 'Präsentations-Handout', titel: `Präsentation Akte ${nr} (Handout)`, zugang: 'nach Anmeldung' });
  if (nr !== 7) liste.push({ art: 'Warm-up-Karten', titel: `Warm-up-Karten Akte ${nr} (ohne Lösungsteil)`, zugang: 'nach Anmeldung' });
  return liste;
}

/** Anzeigenamen der Material-Arten (Whitelist-Feld art, docs/MATERIALIEN.md). */
const ART_TITEL = Object.freeze({
  arbeitsblatt: 'Arbeitsblatt',
  loesung: 'Lösung',
  praesentation: 'Präsentation',
  handout: 'Präsentations-Handout',
  warmup: 'Warm-up-Karten',
  handbuch: 'Ermittler-Handbuch',
  unplugged: 'Unplugged-Vorlage',
  lehrerhinweise: 'Lehrerhinweise',
  pruefung: 'Prüfung',
  erwartungshorizont: 'Erwartungshorizont',
  gesamt: 'Gesamtmaterial',
  video: 'Video-Folien',
  ab: 'Arbeitsblatt',
  generalprobe: 'Generalprobe',
  klausur: 'Klausur',
  kuer: 'Kür'
});

/**
 * Materialliste aus den Whitelists (Phase 6 Task 5, E13): Schüler- und Lehrkraft-Material nur mit Titel, Akte,
 * Niveau, Art und Zugang („nach Anmeldung“ bzw. „nach Anmeldung (Lehrkraft)“); was in der Gast-Auswahl steht, mit
 * öffentlichem Link. Keine Dateipfade, keine Originale. id = idVon(pfad) wie in GET /api/material (der Browser
 * verlinkt damit für Angemeldete). Liefert Map akte → Einträge.
 */
function materialAusWhitelist(material) {
  const nachAkte = new Map();
  if (!material) return nachAkte;
  const gast = new Map(material.liste('gast').map((e) => [e.id, e]));
  const gesehen = new Set();
  const dazu = (e, zugang, url) => {
    if (gesehen.has(e.id)) return;
    gesehen.add(e.id);
    const akte = e.akte === null || e.akte === undefined ? 0 : e.akte;
    const m = { id: e.id, art: ART_TITEL[e.art] || 'Material', titel: e.titel, akte, niveau: e.niveau, zugang };
    if (url) m.url = url;
    if (!nachAkte.has(akte)) nachAkte.set(akte, []);
    nachAkte.get(akte).push(m);
  };
  for (const [stufe, zugang] of [['schueler', 'nach Anmeldung'], ['lehrkraft', 'nach Anmeldung (Lehrkraft)']]) {
    for (const e of material.liste(stufe)) {
      const g = gast.get(e.id);
      if (g) dazu(e, 'Gast-Auswahl', g.url);
      else dazu(e, zugang);
    }
  }
  for (const g of gast.values()) dazu(g, 'Gast-Auswahl', g.url);
  return nachAkte;
}

/**
 * @param {{ inhalte?: object, material?: object }} opt inhalte = erzeugeInhalte(db) (optional; ohne sie erscheinen
 *   alle Akten „folgt“); material = erzeugeMaterial() (optional; ohne Whitelist-Einträge einer Akte bleiben die
 *   geplanten Titel „nach Anmeldung“)
 */
function erzeugeThemen({ inhalte = null, material = null } = {}) {
  function ermittlungAusSeed(akte, l) {
    const kompetenzen = new Set();
    const fallen = new Set();
    const arten = {};
    for (const id of l.aufgaben) {
      const a = inhalte.aufgabe(id);
      if (!a) continue;
      for (const k of Array.isArray(a.kompetenzen) ? a.kompetenzen : []) {
        const kid = kompetenzId(k);
        if (kid) kompetenzen.add(kid);
      }
      for (const p of Array.isArray(a.fallen) ? a.fallen : []) if (F.FALLEN.includes(p)) fallen.add(p);
      const art = F.artVon([].concat(a.interaktion)[0]);
      arten[art] = (arten[art] || 0) + 1;
    }
    const kListe = [...kompetenzen].sort();
    return {
      id: l.id,
      nr: l.nr || null,
      titel: l.titel,
      ds: Array.isArray(l.ds) ? [...l.ds] : [],
      niveau: l.niveau || 'alle',
      ab: typeof l.ab === 'string' ? l.ab : null,
      aufgaben: l.aufgaben.length,
      coldCase: !!l.coldCase,
      kompetenzen: kListe.map((id) => ({ id, titel: KOMPETENZEN[id] || id })),
      fallen: [...fallen].sort(nachNr),
      arten
    };
  }

  function themen() {
    const ausWhitelist = materialAusWhitelist(material);
    const geladen = new Map((inhalte ? inhalte.akten() : []).map((a) => [a.nr, a]));
    const akten = AKTEN.map((stamm) => {
      const plan = PLAN[stamm.nr] || { fach: '', ermittlungen: [] };
      const seed = geladen.get(stamm.nr);
      const offen = !!(seed && seed.levels.length);
      const ermittlungen = offen
        ? seed.levels.map((l) => ermittlungAusSeed(seed, l))
        : plan.ermittlungen.map((e) => ({ id: null, nr: e.nr, titel: e.titel, ds: [...e.ds], niveau: stamm.nr === 5 ? 'eA' : 'alle', ab: null, aufgaben: 0, coldCase: false, kompetenzen: [], fallen: [], arten: {} }));
      // Inhalt der DS (Plan) zu jeder Ermittlung, gleiche Nummer
      for (const e of ermittlungen) {
        const p = plan.ermittlungen.find((x) => x.nr === e.nr);
        e.beschreibung = p ? p.beschreibung : null;
      }
      const ds = [...new Set(ermittlungen.flatMap((e) => e.ds))];
      const verhoer = offen && seed.boss
        ? { titel: seed.boss.titel, dauerMin: seed.boss.dauerMin || null, anzahl: seed.boss.anzahl || null }
        : { titel: VERHOER_PLAN[stamm.nr], dauerMin: null, anzahl: null };
      return {
        nr: stamm.nr,
        titel: stamm.titel,
        farbe: offen ? seed.farbe || null : null,
        fach: plan.fach,
        niveaus: [...stamm.niveaus],
        status: offen ? 'offen' : 'folgt',
        ds,
        ermittlungen,
        verhoer,
        materialien: ausWhitelist.get(stamm.nr) || materialien(stamm.nr, ermittlungen)
      };
    });
    const niveaus = [
      ...akten.map((a) => ({ akte: a.nr, titel: a.titel, fach: a.fach, ds: dsText(a.ds), eA: a.niveaus.includes('eA'), gA: a.niveaus.includes('gA') })),
      ...KUER.map((k) => ({ kuer: k.id, titel: k.titel, fach: k.beschreibung, ds: k.wann, eA: k.eA, gA: k.gA }))
    ];
    return {
      akten,
      // Material ohne Akte bzw. akteübergreifend (akte 0) und Kür (aus den Whitelists)
      materialUebergreifend: [...(ausWhitelist.get(0) || []), ...(ausWhitelist.get('kuer') || [])],
      kuer: KUER.map((k) => ({ ...k })),
      fallen: FALLEN.map((f) => ({ nr: f.nr, titel: f.titel })),
      niveaus
    };
  }

  return { themen };
}

module.exports = { erzeugeThemen, KOMPETENZEN, PLAN };
