'use strict';
/*
 * Datendetektei – Namensnormalisierung und Synonyme für den Modellierungs-Kern (Plan Phase 5 Task 1; Spec §7.6.4).
 * Reine Funktionen, keine Abhängigkeiten, nur Server.
 *
 * normalisiere(name) → string
 *   Kleinbuchstaben, ä→ae, ö→oe, ü→ue, ß→ss, alles außer a–z/0–9 entfernt, danach einfache Plural-Reduktion:
 *   höchstens zwei Endungen aus -en/-er/-e/-n/-s werden abgeschnitten, jeweils nur, wenn mindestens 3 Zeichen
 *   bleiben („Personen“ und „Person“ → „perso“, „Mitglieder“ → „mitglied“, „Ermittlern“ → „ermittl“).
 *   Nicht-Text (null, Zahl, Objekt) wird wie String(x) behandelt, null/undefined/Objekte ergeben ''.
 *
 * stamm(name) → string            Vergleichsschlüssel: wie normalisiere, zusätzlich „nummer“ → „nr“, Fugen-s vor
 *   „nr“ entfernt („MitgliedsNr“ = „MitgliedNr“ = „Mitgliedsnummer“) und Umlaut-Plural gefaltet (ae→a, oe→o,
 *   ue→u: „Fälle“ = „Fall“, „Räume“ = „Raum“, „Wände“ = „Wand“).
 *
 * kanonisch(name, synonyme) → string   stamm des Gruppenschlüssels, wenn der Name in einer Synonymgruppe steht,
 *   sonst stamm(name). synonyme = { "Ermittler": ["Detektiv", "Ermittlerin"], … } je Aufgabe (Schlüssel und Werte
 *   bilden eine Gruppe; steht ein Name in mehreren Gruppen, gilt die erste).
 *
 * gleich(a, b, synonyme?) → boolean    kanonisch(a) === kanonisch(b); leere Namen sind nie gleich.
 *
 * kuenstlich(name) → boolean   sieht aus wie ein künstlicher Schlüssel (endet auf Nr/Nummer/ID/Id/Kennung/Code):
 *   Grundlage der Kulanz „ErmittlerID statt ErmittlerNr“ in abgleich.js und schema.js.
 */

const ENDUNGEN = ['en', 'er', 'e', 'n', 's'];

/** Kleinbuchstaben, Umlaute ausgeschrieben, nur a–z und 0–9. */
function saeubere(name) {
  if (name === null || name === undefined || typeof name === 'object' || typeof name === 'function') return '';
  return String(name)
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]/g, '');
}

/** Einfache Plural-Reduktion: bis zu zwei Endungen, Rest mindestens 3 Zeichen. */
function ohnePlural(wort) {
  for (let runde = 0; runde < 2; runde++) {
    const endung = ENDUNGEN.find((e) => wort.endsWith(e) && wort.length - e.length >= 3);
    if (!endung) break;
    wort = wort.slice(0, -endung.length);
  }
  return wort;
}

function normalisiere(name) {
  return ohnePlural(saeubere(name));
}

function stamm(name) {
  let wort = saeubere(name).replace(/nummer$/, 'nr');
  if (/[a-z]snr$/.test(wort)) wort = wort.slice(0, -3) + 'nr';
  return ohnePlural(wort).replace(/ae/g, 'a').replace(/oe/g, 'o').replace(/ue/g, 'u');
}

/** Synonymgruppen als Map stamm → stamm des Gruppenschlüssels (zwischengespeichert je Synonym-Objekt). */
const GRUPPEN = new WeakMap();
function gruppen(synonyme) {
  if (!synonyme || typeof synonyme !== 'object' || Array.isArray(synonyme)) return null;
  if (GRUPPEN.has(synonyme)) return GRUPPEN.get(synonyme);
  const karte = new Map();
  for (const [schluessel, werte] of Object.entries(synonyme)) {
    const ziel = stamm(schluessel);
    if (!ziel) continue;
    if (!karte.has(ziel)) karte.set(ziel, ziel);
    for (const w of Array.isArray(werte) ? werte : []) {
      const s = stamm(w);
      if (s && !karte.has(s)) karte.set(s, ziel);
    }
  }
  GRUPPEN.set(synonyme, karte);
  return karte;
}

function kanonisch(name, synonyme) {
  const s = stamm(name);
  const karte = gruppen(synonyme);
  return (karte && karte.get(s)) || s;
}

function gleich(a, b, synonyme) {
  const x = kanonisch(a, synonyme);
  return x !== '' && x === kanonisch(b, synonyme);
}

function kuenstlich(name) {
  return /(nr|id|kennung|code)$/.test(saeubere(name).replace(/nummer$/, 'nr'));
}

module.exports = { normalisiere, stamm, kanonisch, gleich, kuenstlich };
