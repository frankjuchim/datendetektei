'use strict';
// Schlussplädoyer einer Ermittlung (Spec §7.7, STORY.md §7, DS_PLANUNG DS 12; Format docs/AUFGABENFORMAT.md §2.1).
// Rein, ohne Abhängigkeiten außer format.js: Strukturprüfung für den Validator und die öffentliche Indizienkette.
//
//   "plaedoyer": { "titel": "Schlussplädoyer", "schritte": ["A6-E1-09", …], "indizien": { "A6-E1-09": "…", … },
//                  "aufloesung": "…", "ueberleitung": "…" }
//
// Sicherheit (Vertrag §9, Spec §7.14): Indiz und Auflösung sind Lösungsdaten. Ein Indiz verlässt den Server erst,
// wenn sein Schritt erledigt ist (gelöst, nachgelöst oder Lösung angesehen); Auflösung und Überleitung erst, wenn
// alle Schritte erledigt sind.

const F = require('./format');

const FELDER = ['titel', 'schritte', 'indizien', 'aufloesung', 'ueberleitung'];
/** Status, nach denen das Indiz eines Schritts sichtbar ist (die Musterlösung ist dann ohnehin aufgedeckt). */
const ERLEDIGT = new Set(['geloest', 'nachgeloest', 'angesehen']);
const STANDARD_TITEL = 'Schlussplädoyer';

const istObjekt = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const istText = (x) => typeof x === 'string' && x.trim().length > 0;

/**
 * Struktur des Plädoyers einer Ermittlung prüfen.
 * @param {object} p        level.plaedoyer
 * @param {object} level    die Ermittlung (aufgaben = Reihenfolge)
 * @param {Map<string, object>} aufgaben  alle Aufgaben der Datei
 * @returns {string[]} deutsche Fehlertexte (leer = in Ordnung)
 */
function pruefePlaedoyer(p, level, aufgaben) {
  const f = [];
  if (!istObjekt(p)) return ['plaedoyer muss ein Objekt { schritte, indizien, aufloesung } sein.'];
  for (const k of Object.keys(p)) if (!FELDER.includes(k)) f.push(`plaedoyer: unbekanntes Feld „${k}“.`);
  if (p.titel !== undefined && !istText(p.titel)) f.push('plaedoyer.titel muss Text sein.');
  const liste = Array.isArray(level && level.aufgaben) ? level.aufgaben : [];
  const schritte = Array.isArray(p.schritte) ? p.schritte : null;
  if (!schritte || !schritte.length) f.push('plaedoyer.schritte (Liste der Aufgaben-ids) fehlt oder ist leer.');
  const gesehen = new Set();
  let letzte = -1;
  for (const id of schritte || []) {
    if (typeof id !== 'string') {
      f.push('plaedoyer.schritte enthält einen Eintrag, der keine Aufgaben-id ist.');
      continue;
    }
    if (gesehen.has(id)) f.push(`plaedoyer.schritte: „${id}“ kommt doppelt vor.`);
    gesehen.add(id);
    const i = liste.indexOf(id);
    if (i < 0) {
      f.push(`plaedoyer.schritte: „${id}“ steht nicht in den Aufgaben dieser Ermittlung.`);
      continue;
    }
    if (i < letzte) f.push(`plaedoyer.schritte: „${id}“ steht in aufgaben vor dem vorherigen Schritt (Reihenfolge wie in aufgaben).`);
    letzte = Math.max(letzte, i);
    const a = aufgaben instanceof Map ? aufgaben.get(id) : null;
    if (a && (Array.isArray(a.interaktion) || !istObjekt(a.interaktion) || a.interaktion.kind !== 'sql')) {
      f.push(`plaedoyer.schritte: „${id}“ muss eine (einteilige) sql-Aufgabe sein.`);
    }
  }
  if (!istObjekt(p.indizien)) f.push('plaedoyer.indizien muss ein Objekt { "<Aufgaben-id>": "Indiz" } sein.');
  else {
    for (const id of gesehen) if (!istText(p.indizien[id])) f.push(`plaedoyer.indizien: zum Schritt „${id}“ fehlt das Indiz.`);
    for (const [id, text] of Object.entries(p.indizien)) {
      if (!gesehen.has(id)) f.push(`plaedoyer.indizien: „${id}“ ist kein Schritt des Plädoyers.`);
      else if (istText(text)) f.push(...textFehler(text, `plaedoyer.indizien.${id}`));
    }
  }
  if (!istText(p.aufloesung)) f.push('plaedoyer.aufloesung (Text nach dem letzten Schritt) fehlt.');
  else f.push(...textFehler(p.aufloesung, 'plaedoyer.aufloesung'));
  if (p.ueberleitung !== undefined) {
    if (!istText(p.ueberleitung)) f.push('plaedoyer.ueberleitung muss Text sein.');
    else f.push(...textFehler(p.ueberleitung, 'plaedoyer.ueberleitung'));
  }
  return f;
}

function textFehler(md, ort) {
  const f = F.pruefeMarkdown(md).map((t) => `${ort}: ${t}`);
  if (F.luecken([{ t: 'text', md }]).length) f.push(`${ort}: Lücken [[…]] sind hier nicht erlaubt.`);
  return f;
}

/** Plädoyer für den Katalog bereinigen: nur Schritte, die (noch) in der Ermittlung stehen; ohne Schritte → null. */
function bereinige(p, ids) {
  if (!istObjekt(p) || !Array.isArray(p.schritte)) return null;
  const erlaubt = new Set(ids);
  const schritte = p.schritte.filter((id) => typeof id === 'string' && erlaubt.has(id));
  if (!schritte.length) return null;
  const indizien = {};
  for (const id of schritte) indizien[id] = istObjekt(p.indizien) && typeof p.indizien[id] === 'string' ? p.indizien[id] : '';
  return {
    titel: istText(p.titel) ? p.titel : STANDARD_TITEL,
    schritte,
    indizien,
    aufloesung: typeof p.aufloesung === 'string' ? p.aufloesung : '',
    ueberleitung: typeof p.ueberleitung === 'string' ? p.ueberleitung : null
  };
}

/**
 * Öffentliche Indizienkette.
 * @param {object} p  bereinigtes Plädoyer (bereinige)
 * @param {{ status: (id: string) => string, titel: (id: string) => string, sichtbar?: (id: string) => boolean }} q
 */
function kette(p, { status, titel, sichtbar = () => true }) {
  const ids = p.schritte.filter(sichtbar);
  const schritte = ids.map((id, i) => {
    const st = status(id) || 'offen';
    const s = { nr: i + 1, id, titel: titel(id), status: st };
    if (ERLEDIGT.has(st)) s.indiz = p.indizien[id];
    return s;
  });
  const erledigt = schritte.filter((s) => ERLEDIGT.has(s.status)).length;
  const abgeschlossen = schritte.length > 0 && erledigt === schritte.length;
  const out = { titel: p.titel, anzahl: schritte.length, erledigt, abgeschlossen, schritte };
  if (abgeschlossen) {
    out.aufloesung = p.aufloesung;
    if (p.ueberleitung) out.ueberleitung = p.ueberleitung;
  }
  return out;
}

/** Plädoyer-Angaben zu einer einzelnen Aufgabe (Ermittlungsseite) oder null, wenn sie kein Schritt ist. */
function schritt(p, id, q) {
  if (!p || !p.schritte.includes(id)) return null;
  const k = kette(p, q);
  const s = k.schritte.find((x) => x.id === id);
  if (!s) return null;
  const out = { titel: k.titel, nr: s.nr, anzahl: k.anzahl, erledigt: k.erledigt, abgeschlossen: k.abgeschlossen };
  if (s.indiz !== undefined) out.indiz = s.indiz;
  if (k.abgeschlossen) {
    out.aufloesung = k.aufloesung;
    if (k.ueberleitung) out.ueberleitung = k.ueberleitung;
  }
  return out;
}

module.exports = { pruefePlaedoyer, bereinige, kette, schritt, ERLEDIGT, STANDARD_TITEL };
