'use strict';
// Manifest GET /api/plattform nach Vertrag v1.3 §7 (Spec §7.13 in der Fassung von Spec §18).
// Enthält nur Stammdaten der Plattform – nie Konten- oder Kursdaten.

const { version: VERSION } = require('../../package.json');
const { AKTEN } = require('../domain');

const STANDARD_UMFANG = Object.freeze({ welten: 7, level: 13, aufgaben: 0, bosse: 7 });

function baueManifest(konfig, umfang = STANDARD_UMFANG) {
  return {
    vertrag: '1.3',
    id: konfig.plattformId,
    name: 'Datendetektei',
    titel: 'Datendetektei Weserstedt – Ermitteln mit Datenbanken',
    themenfeld: 'Daten und Datenbanken',
    kurs: 'Informatik eA und gA, Niedersachsen, Abitur ab 2027',
    niveaus: ['eA', 'gA'],
    beschreibung: 'SQL, Schlüssel und Anomalien, ER-Modell und Datenschutz – als Ermittlungsfälle mit Live-SQL.',
    farbe: '#B3261E',
    version: VERSION,
    basis: konfig.plattformUrl,
    icon: '/static/favicon.svg',
    urls: {
      start: '/',
      gast: '/gast',
      themen: '/themen',
      lehrkraft: '/lehrkraft',
      datenschutz: '/datenschutz',
      healthz: '/healthz',
      ssoStart: '/sso/start',
      ssoEnde: '/sso/ende',
      niveaus: '/themen#niveaus'
    },
    auth: { modus: 'portal', portal: konfig.portalUrl, sso: true },
    umfang: { welten: umfang.welten, level: umfang.level, aufgaben: umfang.aufgaben, bosse: umfang.bosse },
    welten: AKTEN.map((a) => ({ nr: a.nr, titel: a.titel })),
    // nur Namen aus Vertrag §7 (v1.3): Verhör = boss, Trainingsplatz = training, Auswertung P1–P10 = fallen-profil
    faehigkeiten: ['gast', 'themen', 'lehrkraft-materialien', 'boss', 'training', 'warmup', 'scoreboard', 'beamer', 'urkunden',
      'fallen-profil', 'sql-konsole', 'live']
  };
}

/**
 * Route-Handler: CORS * (Portal und Übersichten lesen das Manifest), 5 Minuten cachebar.
 * umfang: Funktion, die den aktuellen Umfang aus dem Seed liefert (Inhalte-Dienst); ohne sie die Standardwerte.
 */
function manifestRoute(konfig, umfang = () => STANDARD_UMFANG) {
  return function plattform(req, res) {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.set('Cache-Control', 'public, max-age=300');
    res.json(baueManifest(konfig, umfang()));
  };
}

module.exports = { baueManifest, manifestRoute, STANDARD_UMFANG };
