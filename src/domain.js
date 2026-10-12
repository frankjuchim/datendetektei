'use strict';
// Fachliche Stammdaten der Plattform (ohne Lerninhalte): die sieben Akten (im Manifest „welten“).
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

module.exports = { AKTEN };
