'use strict';
// Schema-Abgleich (Plan Phase 5 Task 1; Spec §7.6.5, Überführungsregeln R1–R6 aus DS 11): Relationen über Namen
// bzw. Attributmenge zuordnen, PK/FK/Attribute je Relation, Hinweiscodes mit Falle, FK-Namen nach Rolle, mehrere
// Musterschemata, keine Musternamen in Rückmeldungen, robust; Formprüfung.

const test = require('node:test');
const assert = require('node:assert/strict');
const { gleicheSchemaAb, pruefeSchemaForm, HINWEISE } = require('../src/er/schema');
const { stamm } = require('../src/er/namen');
const { relationen, DETEKTEI_SCHEMA_TEXT, KLETTERHALLE_SCHEMA_TEXT } = require('./hilfen_er');

const detektei = () => relationen(DETEKTEI_SCHEMA_TEXT);
const kletterhalle = () => relationen(KLETTERHALLE_SCHEMA_TEXT);
/** Detektei-Schema mit ersetzten Relationen (Name → neuer Text oder null zum Entfernen). */
function detekteiMit(ersatz) {
  const liste = [];
  for (const r of DETEKTEI_SCHEMA_TEXT.split(';')) {
    const name = r.split('(')[0];
    if (!(name in ersatz)) liste.push(r);
    else if (ersatz[name]) liste.push(ersatz[name]);
  }
  for (const [name, text] of Object.entries(ersatz)) if (text && !DETEKTEI_SCHEMA_TEXT.includes(name + '(')) liste.push(text);
  return relationen(liste.join(';'));
}
const relation = (erg, name) => erg.relationen.find((r) => r.name === name);
const codes = (r) => r.hinweise.map((h) => h.code);

test('HINWEISE: alle Codes mit deutschem Text und Falle', () => {
  for (const code of ['PK_FALSCH', 'PK_ZUSAMMENGESETZT_FEHLT', 'FK_FEHLT', 'FK_ZIEL', 'FK_FALSCHE_SEITE', 'ATTRIBUT_FEHLT',
    'ATTRIBUT_ZUVIEL', 'NM_OHNE_TABELLE', 'RELATION_UEBERZAEHLIG', 'RELATION_FEHLT']) {
    assert.ok(HINWEISE[code], code);
    assert.match(HINWEISE[code].falle, /^P(7|8|9)$/);
  }
  assert.equal(HINWEISE.FK_ZIEL.falle, 'P7');
  assert.equal(HINWEISE.FK_FEHLT.falle, 'P9');
});

test('Detektei- und Kletterhalle-Musterschema gegen sich selbst: gelöst', () => {
  for (const muster of [detektei(), kletterhalle()]) {
    const erg = gleicheSchemaAb(JSON.parse(JSON.stringify(muster)), [muster]);
    assert.equal(erg.geloest, true, JSON.stringify(erg, null, 1));
    assert.equal(erg.fehlend, 0);
    assert.equal(erg.ueberzaehlig, 0);
    assert.ok(erg.relationen.every((r) => r.ok && r.hinweise.length === 0));
  }
});

test('Format wie Block schema: { relationen } und Muster als { relationen } werden akzeptiert', () => {
  const erg = gleicheSchemaAb({ relationen: detektei() }, [{ relationen: detektei() }]);
  assert.equal(erg.geloest, true);
  assert.equal(gleicheSchemaAb(detektei(), detektei()).geloest, true, 'ein einzelnes Musterschema geht auch');
});

test('Groß/Klein, Plural und Reihenfolge sind egal', () => {
  const s = detektei().reverse().map((r) => ({
    name: r.name === 'Fall' ? 'Faelle' : r.name.toLowerCase(),
    attribute: r.attribute.slice().reverse().map((a) => ({ ...a, name: a.name.toUpperCase(), fk: typeof a.fk === 'string' ? a.fk.toLowerCase() : a.fk })),
  }));
  const erg = gleicheSchemaAb(s, [detektei()]);
  assert.equal(erg.geloest, true, JSON.stringify(erg, null, 1));
});

test('FK-Namen nach Rolle: über Synonyme oder eindeutig über die Zielrelation', () => {
  const s1 = detekteiMit({ kennt: 'kennt(_^PersonNr>Person, _^BekannteNr>Person, Seit)' });
  assert.equal(gleicheSchemaAb(s1, [detektei()], { synonyme: { BekannterNr: ['BekannteNr'] } }).geloest, true);
  const s2 = detekteiMit({ kennt: 'kennt(_^PersonNr>Person, _^Person2Nr>Person, Seit)' });
  assert.equal(gleicheSchemaAb(s2, [detektei()]).geloest, true);
  const s3 = detekteiMit({ Fall: 'Fall(_FallNr, Titel, Eroeffnet, Status, ^ErmittlerNr>Ermittler)' });
  assert.equal(gleicheSchemaAb(s3, [detektei()]).geloest, true);
  const s4 = relationen(KLETTERHALLE_SCHEMA_TEXT.replace('sichert(_^SichererNr>Mitglied, _^KlettererNr>Mitglied)',
    'sichert(_^MitgliedsNr>Mitglied, _^GesichertNr>Mitglied)'));
  assert.equal(gleicheSchemaAb(s4, [kletterhalle()]).geloest, true);
});

test('FK_FEHLT (P9): Fremdschlüssel nicht markiert bzw. ganz vergessen', () => {
  const erg = gleicheSchemaAb(detekteiMit({ Fall: 'Fall(_FallNr, Titel, Eroeffnet, Status, LeiterNr)' }), [detektei()]);
  assert.equal(erg.geloest, false);
  const r = relation(erg, 'Fall');
  assert.equal(r.ok, false);
  assert.deepEqual(codes(r), ['FK_FEHLT']);
  assert.equal(r.hinweise[0].falle, 'P9');
  assert.match(r.hinweise[0].text, /LeiterNr/);
  const erg2 = gleicheSchemaAb(detekteiMit({ Beweisstueck: 'Beweisstueck(_BeweisNr, Bezeichnung, ^FallNr>Fall)' }), [detektei()]);
  assert.deepEqual(codes(relation(erg2, 'Beweisstueck')), ['FK_FEHLT']);
});

test('FK_ZIEL (P7): Fremdschlüssel verweist auf die falsche Relation', () => {
  const erg = gleicheSchemaAb(detekteiMit({ Fall: 'Fall(_FallNr, Titel, Eroeffnet, Status, ^LeiterNr>Person)' }), [detektei()]);
  const r = relation(erg, 'Fall');
  assert.deepEqual(codes(r), ['FK_ZIEL']);
  assert.equal(r.hinweise[0].falle, 'P7');
  // fk: true (ohne Ziel) gilt als „irgendein Ziel“
  const erg2 = gleicheSchemaAb(detekteiMit({ Fall: 'Fall(_FallNr, Titel, Eroeffnet, Status, ^LeiterNr)' }), [detektei()]);
  assert.equal(erg2.geloest, true);
});

test('FK_FALSCHE_SEITE (P9): FK von leitet auf der 1-Seite', () => {
  const s = detekteiMit({
    Ermittler: 'Ermittler(_ErmittlerNr, Name, Dienstgrad, ^MentorNr>Ermittler, ^FallNr>Fall)',
    Fall: 'Fall(_FallNr, Titel, Eroeffnet, Status)',
  });
  const erg = gleicheSchemaAb(s, [detektei()]);
  assert.equal(erg.geloest, false);
  assert.deepEqual(codes(relation(erg, 'Ermittler')), ['FK_FALSCHE_SEITE']);
  assert.match(relation(erg, 'Ermittler').hinweise[0].text, /n-Seite/);
  assert.deepEqual(codes(relation(erg, 'Fall')), ['FK_FEHLT']);
});

test('PK_ZUSAMMENGESETZT_FEHLT und PK_FALSCH', () => {
  const erg = gleicheSchemaAb(detekteiMit({ verdaechtig: 'verdaechtig(_^PersonNr>Person, ^FallNr>Fall, Grad)' }), [detektei()]);
  assert.deepEqual(codes(relation(erg, 'verdaechtig')), ['PK_ZUSAMMENGESETZT_FEHLT']);
  const erg2 = gleicheSchemaAb(detekteiMit({ Person: 'Person(PersonNr, Vorname, _Nachname, Jahrgang, Stadtteil)' }), [detektei()]);
  assert.deepEqual(codes(relation(erg2, 'Person')), ['PK_FALSCH']);
  // Aussage ohne Zeitpunkt im Schlüssel (P8-Falle der Detektei) → PK falsch
  const erg3 = gleicheSchemaAb(detekteiMit({ Aussage: 'Aussage(_^PersonNr>Person, _^FallNr>Fall, _^OrtNr>Ort, Zeitpunkt, Inhalt)' }), [detektei()]);
  assert.deepEqual(codes(relation(erg3, 'Aussage')), ['PK_FALSCH']);
});

test('ATTRIBUT_FEHLT und ATTRIBUT_ZUVIEL', () => {
  const erg = gleicheSchemaAb(detekteiMit({ Person: 'Person(_PersonNr, Vorname, Nachname, Jahrgang)' }), [detektei()]);
  assert.deepEqual(codes(relation(erg, 'Person')), ['ATTRIBUT_FEHLT']);
  assert.match(relation(erg, 'Person').hinweise[0].text, /1 Attribut/);
  const erg2 = gleicheSchemaAb(detekteiMit({ Person: 'Person(_PersonNr, Vorname, Nachname, Jahrgang, Stadtteil, Schuhgroesse)' }), [detektei()]);
  assert.deepEqual(codes(relation(erg2, 'Person')), ['ATTRIBUT_ZUVIEL']);
  assert.match(relation(erg2, 'Person').hinweise[0].text, /Schuhgroesse/);
});

test('NM_OHNE_TABELLE: n:m-Beziehung ohne eigene Relation (FK in Person)', () => {
  const s = detekteiMit({ verdaechtig: null, Person: 'Person(_PersonNr, Vorname, Nachname, Jahrgang, Stadtteil, ^FallNr>Fall, Grad)' });
  const erg = gleicheSchemaAb(s, [detektei()]);
  assert.equal(erg.geloest, false);
  assert.equal(erg.fehlend, 1);
  assert.ok(erg.hinweise.some((h) => h.code === 'NM_OHNE_TABELLE' && h.falle === 'P9'));
  assert.ok(codes(relation(erg, 'Person')).includes('ATTRIBUT_ZUVIEL'));
});

test('Relation anders benannt: Zuordnung über die Attributmenge; Synonyme für Relationennamen', () => {
  const s = detekteiMit({ verdaechtig: null, Tatverdacht: 'Tatverdacht(_^PersonNr>Person, _^FallNr>Fall, Grad)' });
  const erg = gleicheSchemaAb(s, [detektei()]);
  assert.equal(erg.geloest, true, JSON.stringify(erg, null, 1));
  const s2 = detekteiMit({ Beweisstueck: null, Indiz: 'Indiz(_IndizNr, Bezeichnung, ^FallNr>Fall, ^OrtNr>Ort)' });
  assert.equal(gleicheSchemaAb(s2, [detektei()], { synonyme: { Beweisstueck: ['Indiz'] } }).geloest, true);
});

test('mehrere Musterschemata: AussageNr als Alternative zum Zeitpunkt im Schlüssel', () => {
  const alternative = relationen(DETEKTEI_SCHEMA_TEXT.replace(
    'Aussage(_^PersonNr>Person, _^FallNr>Fall, _^OrtNr>Ort, _Zeitpunkt, Inhalt)',
    'Aussage(_AussageNr, ^PersonNr>Person, ^FallNr>Fall, ^OrtNr>Ort, Zeitpunkt, Inhalt)'));
  const s = JSON.parse(JSON.stringify(alternative));
  assert.equal(gleicheSchemaAb(s, [detektei()]).geloest, false);
  assert.equal(gleicheSchemaAb(s, [detektei(), alternative]).geloest, true);
  assert.equal(gleicheSchemaAb(detektei(), [detektei(), alternative]).geloest, true);
});

test('überzählige und fehlende Relationen werden gezählt', () => {
  const s = detekteiMit({ Ort: null, Notiz: 'Notiz(_NotizNr, Text)' });
  const erg = gleicheSchemaAb(s, [detektei()]);
  assert.equal(erg.fehlend, 1);
  assert.equal(erg.ueberzaehlig, 1);
  assert.deepEqual(codes(relation(erg, 'Notiz')), ['RELATION_UEBERZAEHLIG']);
  assert.ok(erg.hinweise.some((h) => h.code === 'RELATION_FEHLT'));
});

test('Kletterhalle: typische Überführungsfehler', () => {
  // Datum nicht im Schlüssel von begeht
  const s1 = relationen(KLETTERHALLE_SCHEMA_TEXT.replace('begeht(_^MitgliedsNr>Mitglied, _^RoutenNr>Route, _Datum, Erfolg)',
    'begeht(_^MitgliedsNr>Mitglied, _^RoutenNr>Route, Datum, Erfolg)'));
  assert.deepEqual(codes(relation(gleicheSchemaAb(s1, [kletterhalle()]), 'begeht')), ['PK_FALSCH']);
  // WandNr in Wand statt in Route
  const s2 = relationen(KLETTERHALLE_SCHEMA_TEXT
    .replace('Wand(_WandNr, Bereich)', 'Wand(_WandNr, Bereich, ^RoutenNr>Route)')
    .replace('Route(_RoutenNr, Name, Schwierigkeit, ^WandNr>Wand, ^BauerNr>Routenbauer)', 'Route(_RoutenNr, Name, Schwierigkeit, ^BauerNr>Routenbauer)'));
  const erg2 = gleicheSchemaAb(s2, [kletterhalle()]);
  assert.deepEqual(codes(relation(erg2, 'Wand')), ['FK_FALSCHE_SEITE']);
  // ternäre Wertung nur mit zwei Fremdschlüsseln
  const s3 = relationen(KLETTERHALLE_SCHEMA_TEXT.replace('Wertung(_^MitgliedsNr>Mitglied, _^RoutenNr>Route, _^WettkampfNr>Wettkampf, Punkte)',
    'Wertung(_^MitgliedsNr>Mitglied, _^RoutenNr>Route, Punkte)'));
  const erg3 = gleicheSchemaAb(s3, [kletterhalle()]);
  assert.equal(relation(erg3, 'Wertung').ok, false);
  assert.ok(codes(relation(erg3, 'Wertung')).includes('FK_FEHLT'));
});

test('Rückmeldungen nennen keine Namen aus dem Musterschema, die der Schüler nicht verwendet', () => {
  const s = relationen('Mitglied(_MitgliedsNr, Jahrgang, ^KursNr>Kurs); Kurs(_KursNr, Ort); Halle(_HallenNr)');
  const muster = kletterhalle();
  const erg = gleicheSchemaAb(s, [muster]);
  const eigene = new Set(s.flatMap((r) => [r.name, ...r.attribute.map((a) => a.name)]).map(stamm));
  const fremde = [...new Set(muster.flatMap((r) => [r.name, ...r.attribute.map((a) => a.name)]))].filter((n) => !eigene.has(stamm(n)));
  const texte = [...erg.hinweise.map((h) => h.text), ...erg.relationen.flatMap((r) => r.hinweise.map((h) => h.text))];
  assert.ok(texte.length > 0);
  for (const t of texte) {
    for (const n of fremde) {
      assert.ok(!new RegExp('(^|[^A-Za-zÄÖÜäöüß])' + n + '($|[^A-Za-zÄÖÜäöüß])', 'i').test(t), `„${t}“ nennt „${n}“`);
    }
  }
});

test('robust gegen Unsinn: wirft nie', () => {
  for (const s of [null, undefined, 3, 'x', {}, [], [null, 3, { name: 'Fall' }], [{ name: 'Fall', attribute: 'x' }],
    { relationen: [{ name: 'Fall', attribute: [null, { name: 5, pk: 'ja' }, { name: 'FallNr', fk: 7 }] }] }]) {
    const erg = gleicheSchemaAb(s, [detektei()]);
    assert.equal(erg.geloest, false);
    assert.ok(Array.isArray(erg.relationen));
  }
  assert.equal(gleicheSchemaAb(detektei(), []).geloest, false);
  assert.equal(gleicheSchemaAb(detektei(), null).geloest, false);
});

test('pruefeSchemaForm: Grenzen und Struktur', () => {
  assert.deepEqual(pruefeSchemaForm(detektei()), []);
  assert.deepEqual(pruefeSchemaForm({ relationen: kletterhalle() }), []);
  assert.ok(pruefeSchemaForm(null).length > 0);
  assert.ok(pruefeSchemaForm(Array.from({ length: 31 }, (_, i) => ({ name: 'R' + i, attribute: [{ name: 'A', pk: true }] })))
    .some((f) => /30/.test(f)));
  const lang = detektei();
  lang[0].name = 'R'.repeat(41);
  assert.ok(pruefeSchemaForm(lang).some((f) => /40/.test(f)));
  const doppelt = detektei();
  doppelt[1].name = 'ermittler';
  assert.ok(pruefeSchemaForm(doppelt).some((f) => /doppelt/.test(f)));
  const attrDoppelt = detektei();
  attrDoppelt[0].attribute.push({ name: 'Name' });
  assert.ok(pruefeSchemaForm(attrDoppelt).some((f) => /doppelt/.test(f)));
  const ziel = detektei();
  ziel[1].attribute[4].fk = 'Gibtsnicht';
  assert.ok(pruefeSchemaForm(ziel).some((f) => /Gibtsnicht/.test(f)));
  const leer = detektei();
  leer[0].attribute = [];
  assert.ok(pruefeSchemaForm(leer).length > 0);
  const pk = detektei();
  pk[0].attribute[0].pk = 'ja';
  assert.ok(pruefeSchemaForm(pk).length > 0);
});
