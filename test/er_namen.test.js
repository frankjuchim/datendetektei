'use strict';
// Namensnormalisierung und Synonyme für den Modellierungs-Kern (Plan Phase 5 Task 1, src/er/namen.js).

const test = require('node:test');
const assert = require('node:assert/strict');
const { normalisiere, stamm, gleich, kanonisch } = require('../src/er/namen');

test('normalisiere: Groß/Klein, Umlaute, ß, Leer- und Sonderzeichen', () => {
  assert.equal(normalisiere('Ermittler'), 'ermittl');
  assert.equal(normalisiere('ERMITTLER'), 'ermittl');
  assert.equal(normalisiere('Beweisstück'), 'beweisstueck');
  assert.equal(normalisiere('Straße'), normalisiere('strasse'));
  assert.equal(normalisiere('  sagt aus '), 'sagtau');
  assert.equal(normalisiere('Mitglieds-Nr.'), 'mitgliedsnr');
  assert.equal(normalisiere(''), '');
  assert.equal(normalisiere(null), '');
  assert.equal(normalisiere(42), '42');
});

test('normalisiere: einfache Plural-Reduktion nur bis mindestens 3 Zeichen', () => {
  assert.equal(normalisiere('Personen'), normalisiere('Person'));
  assert.equal(normalisiere('Mitglieder'), normalisiere('Mitglied'));
  assert.equal(normalisiere('Kurse'), normalisiere('Kurs'));
  assert.equal(normalisiere('Hallen'), normalisiere('Halle'));
  assert.equal(normalisiere('Routen'), normalisiere('Route'));
  assert.equal(normalisiere('Ermittlern'), normalisiere('Ermittler'));
  assert.equal(normalisiere('Orte'), 'ort');
  assert.equal(normalisiere('Ort'), 'ort');
  assert.equal(normalisiere('Bus'), 'bus');
  assert.equal(normalisiere('Ase'), 'ase');
});

test('stamm: Umlaut-Plural (Fall/Fälle, Raum/Räume, Wand/Wände) und Nummer/Nr', () => {
  assert.equal(stamm('Fälle'), stamm('Fall'));
  assert.equal(stamm('Räume'), stamm('Raum'));
  assert.equal(stamm('Wände'), stamm('Wand'));
  assert.equal(stamm('Mitgliedsnummer'), stamm('MitgliedsNr'));
  assert.equal(stamm('MitgliedsNr'), stamm('MitgliedNr'));
  assert.notEqual(stamm('Fall'), stamm('Person'));
});

test('gleich: ohne und mit Synonymliste je Aufgabe', () => {
  assert.equal(gleich('Ermittler', 'ermittler'), true);
  assert.equal(gleich('Ermittler', 'Detektiv'), false);
  const synonyme = { Ermittler: ['Detektiv', 'Ermittlerin'], Beweisstueck: ['Beweis'] };
  assert.equal(gleich('Ermittler', 'Detektiv', synonyme), true);
  assert.equal(gleich('Detektive', 'Ermittlerinnen', synonyme), false); // „-innen“ ist keine einfache Pluralendung
  assert.equal(gleich('Detektive', 'Ermittlerin', synonyme), true);
  assert.equal(gleich('Beweise', 'Beweisstücke', synonyme), true);
  assert.equal(gleich('Detektiv', 'Beweis', synonyme), false);
  assert.equal(gleich('', '', synonyme), false, 'leere Namen sind nie gleich');
  assert.equal(gleich('Fall', 'Fall', null), true);
  assert.equal(gleich('Fall', 'Fall', { kaputt: 'kein Array' }), true);
});

test('kanonisch: Synonyme werden auf den Gruppenschlüssel abgebildet', () => {
  const synonyme = { Ermittler: ['Detektiv'] };
  assert.equal(kanonisch('Detektive', synonyme), kanonisch('Ermittler', synonyme));
  assert.equal(kanonisch('Fall', synonyme), stamm('Fall'));
});

test('kuenstlich: Namen künstlicher Schlüssel', () => {
  const { kuenstlich } = require('../src/er/namen');
  for (const n of ['ErmittlerNr', 'FallID', 'Kundennummer', 'AusweisKennung', 'Nr']) assert.equal(kuenstlich(n), true, n);
  for (const n of ['Name', 'Titel', 'Zeitpunkt', '', null]) assert.equal(kuenstlich(n), false, String(n));
});

test('src/er/index.js exportiert alle Funktionen des Modellierungs-Kerns', () => {
  const er = require('../src/er');
  for (const f of ['normalisiere', 'stamm', 'kanonisch', 'gleich', 'kuenstlich', 'gleicheAb', 'pruefeLesen', 'pruefeGraphForm',
    'gleicheSchemaAb', 'pruefeSchemaForm', 'huelle', 'schluesselKandidaten', 'projiziere', 'verlustfrei', 'pruefeZerlegung', 'ordneZu']) {
    assert.equal(typeof er[f], 'function', f);
  }
  assert.ok(Array.isArray(er.KRITERIEN) && Array.isArray(er.AEQUIVALENZEN) && er.HINWEISE);
  // keine Abhängigkeit von src/sql
  const fs = require('node:fs');
  const path = require('node:path');
  const dir = path.join(__dirname, '..', 'src', 'er');
  for (const datei of fs.readdirSync(dir)) {
    const text = fs.readFileSync(path.join(dir, datei), 'utf8');
    for (const [, ziel] of text.matchAll(/require\('([^']+)'\)/g)) assert.match(ziel, /^\.\//, `${datei} lädt ${ziel}`);
  }
});
