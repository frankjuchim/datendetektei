'use strict';
// Fachliche Stammdaten der Plattform (ohne Lerninhalte): die sieben Akten (im Manifest „welten“), Ränge, Fallen,
// Abzeichen und die Punkteformel (Vertrag v1.2 §9, Spec §2.6, §5, §8).
// niveaus: für welche Anforderungsniveaus die Akte gedacht ist (Vertrag v1.2 §9; Akte 5 nur eA, Spec §3.4).

const AKTEN = Object.freeze(
  [
    { nr: 1, titel: 'Das Fundbüro', niveaus: ['eA', 'gA'] },
    { nr: 2, titel: 'Spur der Räder', niveaus: ['eA', 'gA'] },
    { nr: 3, titel: 'Die Stadtfest-Kasse', niveaus: ['eA', 'gA'] },
    { nr: 4, titel: 'Chaos im Vereinsarchiv', niveaus: ['eA', 'gA'] },
    { nr: 5, titel: 'Der Bauplan', niveaus: ['eA'] },
    { nr: 6, titel: 'Datenspuren', niveaus: ['eA', 'gA'] },
    { nr: 7, titel: 'Generalprobe', niveaus: ['eA', 'gA'] }
  ].map((a) => Object.freeze({ ...a, niveaus: Object.freeze(a.niveaus) }))
);

/** Ränge (Spec §8): Schwellen nach Vertrag 0/10/30/55/80 % der Level-Punkte der freigeschalteten Akten. */
const RAENGE = Object.freeze(
  [
    { name: 'Neuling', ab: 0 },
    { name: 'Spürnase', ab: 0.1 },
    { name: 'Ermittler:in', ab: 0.3 },
    { name: 'Kommissar:in', ab: 0.55 },
    { name: 'Meisterdetektiv:in', ab: 0.8 }
  ].map((r) => Object.freeze(r))
);

/** Rang zu einem Anteil 0…1, mit dem nächsten Rang (oder null). */
function rangFuer(anteil) {
  const a = Number.isFinite(anteil) ? Math.max(0, Math.min(1, anteil)) : 0;
  let index = 0;
  for (let i = 0; i < RAENGE.length; i++) if (a >= RAENGE[i].ab - 1e-9) index = i;
  const naechster = RAENGE[index + 1] || null;
  return { name: RAENGE[index].name, index, anteil: a, naechster: naechster ? { name: naechster.name, ab: naechster.ab } : null };
}

/** Fallen P1–P10 mit Kurztitel (Spec §5). */
const FALLEN = Object.freeze(
  [
    ['P1', 'WHERE ↔ HAVING'],
    ['P2', 'Verbund fehlt oder vervielfacht'],
    ['P3', 'GROUP-BY-Regel'],
    ['P4', 'COUNT ↔ SUM'],
    ['P5', 'NULL und Literale'],
    ['P6', 'Bedingungslogik'],
    ['P7', 'Mehrdeutig oder falsch benannt'],
    ['P8', 'Schlüssel falsch beurteilt'],
    ['P9', 'ER oder Überführung fehlerhaft'],
    ['P10', 'Operator verfehlt']
  ].map(([nr, titel]) => Object.freeze({ nr, titel }))
);

/**
 * Abzeichen dieser Phase (Spec §8, nur automatisch). jeAkte: je Akte ein eigenes Abzeichen mit id „<id>-<nr>“.
 * Weitere (Fallensucher, Architekt:in, Trainingsprofi, Warm-up-Meister, Datenschützer:in) folgen mit ihren Phasen.
 */
const ABZEICHEN = Object.freeze(
  [
    { id: 'erste-spur', name: 'Erste Spur', beschreibung: 'Die erste Aufgabe gelöst.' },
    { id: 'zehnerserie', name: 'Zehnerserie', beschreibung: '10 Aufgaben in Folge ohne Fehlversuch gelöst.' },
    { id: 'akte-geschlossen', name: 'Akte geschlossen', beschreibung: 'Alle Aufgaben der Ermittlungen dieser Akte erledigt.', jeAkte: true },
    { id: 'beweisstueck', name: 'Beweisstück', beschreibung: 'Das Verhör dieser Akte mit mindestens 50 % bestanden.', jeAkte: true },
    { id: 'makellos', name: 'Makellos', beschreibung: 'Ein Verhör mit 100 % bestanden.' },
    { id: 'ohne-tipp', name: 'Ohne Tipp', beschreibung: '20 Aufgaben der Stufe ★★★ ohne Tipp und ohne Fehlversuch gelöst.' }
  ].map((a) => Object.freeze(a))
);

/** Schwellen (Spec §7.9, §8). */
const VERHOER_AUTO_ANTEIL = 0.6;
const VERHOER_BESIEGT_ANTEIL = 0.5;
const ZEHNERSERIE = 10;
const OHNE_TIPP_ANZAHL = 20;

/** Punkteformel (Vertrag §9): beim ersten Lösen round(p × max(0.25, 1 − 0.25·F − 0.2·T)). */
function punkteFuer(punkte, fehlversuche, tipps) {
  const faktor = Math.max(0.25, 1 - 0.25 * fehlversuche - 0.2 * tipps);
  return Math.round(punkte * faktor);
}

module.exports = {
  AKTEN,
  RAENGE,
  rangFuer,
  FALLEN,
  ABZEICHEN,
  VERHOER_AUTO_ANTEIL,
  VERHOER_BESIEGT_ANTEIL,
  ZEHNERSERIE,
  OHNE_TIPP_ANZAHL,
  punkteFuer
};
