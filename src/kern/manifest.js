'use strict';
// Manifest GET /api/plattform nach Vertrag v1.2 §7 (Spec §7.13 in der Fassung von Spec §18).
// Enthält nur Stammdaten der Plattform – nie Konten- oder Kursdaten.

const { version: VERSION } = require('../../package.json');
const { AKTEN } = require('../domain');

const STANDARD_UMFANG = Object.freeze({ welten: 7, level: 13, aufgaben: 0, bosse: 7 });

function baueManifest(konfig, umfang = STANDARD_UMFANG) {
  return {
    vertrag: '1.2',
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
    faehigkeiten: ['gast', 'themen', 'lehrkraft-materialien', 'sql-konsole', 'live']
  };
}

/** Route-Handler: CORS * (Portal und Übersichten lesen das Manifest), 5 Minuten cachebar. */
function manifestRoute(konfig) {
  const manifest = baueManifest(konfig);
  return function plattform(req, res) {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.set('Cache-Control', 'public, max-age=300');
    res.json(manifest);
  };
}

module.exports = { baueManifest, manifestRoute, STANDARD_UMFANG };
