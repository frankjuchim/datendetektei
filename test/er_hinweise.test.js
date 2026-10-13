'use strict';
// Treffendere Hinweise im Modellierungs-Kern (Nacharbeit Phase 5): n:m-Fremdschlüssel in einer Entitätsrelation,
// Attribut am falschen 1:n-Beziehungstyp, Fremdschlüssel als ER-Attribute (P9). Das Urteil (gelöst/nicht gelöst)
// bleibt unverändert; Texte nennen nur Namen, die der Schüler selbst verwendet hat.

const test = require('node:test');
const assert = require('node:assert/strict');
const { gleicheSchemaAb } = require('../src/er/schema');
const { gleicheAb } = require('../src/er/abgleich');

const R = (name, ...attr) => ({ name, attribute: attr.map((a) => (typeof a === 'string' ? { name: a } : a)) });
const pk = (name, fk) => (fk ? { name, pk: true, fk } : { name, pk: true });
const fk = (name, ziel) => ({ name, fk: ziel });
const codes = (r) => r.hinweise.map((h) => h.code);

// ---------- Schema ----------
const person = R('Person', pk('PersonNr'), 'Vorname');
const fall = R('Fall', pk('FallNr'), 'Titel');
const verdaechtig = R('verdaechtig', pk('PersonNr', 'Person'), pk('FallNr', 'Fall'), 'Grad');
const mitglied = R('Mitglied', pk('MitgliedsNr'), 'Name');
const route = R('Route', pk('RoutenNr'), 'Name');
const kletterA = R('klettert', pk('MitgliedsNr', 'Mitglied'), pk('RoutenNr', 'Route'), pk('Datum'), 'Erfolg');
const kletterB = R('klettert', pk('BegehungNr'), fk('MitgliedsNr', 'Mitglied'), fk('RoutenNr', 'Route'), 'Datum', 'Erfolg');

test('Schema: FK einer n:m-Beziehung in der Entitätsrelation → FK_FALSCHE_SEITE (n:m-Text) und NM_OHNE_TABELLE', () => {
  const schueler = [R('Person', pk('PersonNr'), 'Vorname', fk('FallNr', 'Fall'), 'Grad'), fall];
  const erg = gleicheSchemaAb(schueler, [[person, fall, verdaechtig]]);
  assert.equal(erg.geloest, false);
  const p = erg.relationen.find((r) => r.name === 'Person');
  assert.ok(codes(p).includes('FK_FALSCHE_SEITE'), codes(p).join());
  const h = p.hinweise.find((x) => x.code === 'FK_FALSCHE_SEITE');
  assert.equal(h.falle, 'P9');
  assert.match(h.text, /n:m/);
  assert.match(h.text, /„FallNr“/);
  assert.ok(!/verdaechtig/i.test(JSON.stringify(erg)), 'kein Musterrelationsname');
  assert.ok(erg.hinweise.some((x) => x.code === 'NM_OHNE_TABELLE'));
});

test('Schema: FK der n:m-Beziehung ohne ↑-Markierung wird ebenfalls als falsche Seite erkannt', () => {
  const schueler = [R('Person', pk('PersonNr'), 'Vorname', 'FallNr'), fall];
  const erg = gleicheSchemaAb(schueler, [[person, fall, verdaechtig]]);
  const p = erg.relationen.find((r) => r.name === 'Person');
  assert.ok(codes(p).includes('FK_FALSCHE_SEITE'), codes(p).join());
});

test('Schema: mehrere Muster – der treffendste Hinweis (NM_OHNE_TABELLE) gewinnt, Urteil unverändert', () => {
  const schueler = [R('Mitglied', pk('MitgliedsNr'), 'Name', fk('RoutenNr', 'Route'), 'Datum', 'Erfolg'), route];
  for (const muster of [[[mitglied, route, kletterA], [mitglied, route, kletterB]], [[mitglied, route, kletterB], [mitglied, route, kletterA]]]) {
    const erg = gleicheSchemaAb(schueler, muster);
    assert.equal(erg.geloest, false);
    assert.ok(erg.hinweise.some((x) => x.code === 'NM_OHNE_TABELLE'), erg.hinweise.map((x) => x.code).join());
    const m = erg.relationen.find((r) => r.name === 'Mitglied');
    assert.ok(codes(m).includes('FK_FALSCHE_SEITE'), codes(m).join());
  }
  // richtige Lösungen bleiben gelöst
  assert.equal(gleicheSchemaAb([mitglied, route, kletterA], [[mitglied, route, kletterA], [mitglied, route, kletterB]]).geloest, true);
  assert.equal(gleicheSchemaAb([mitglied, route, kletterB], [[mitglied, route, kletterA], [mitglied, route, kletterB]]).geloest, true);
});

test('Schema: 1:n-FK auf der falschen Seite bleibt FK_FALSCHE_SEITE mit 1:n-Text', () => {
  const muster = [R('Fall', pk('FallNr'), 'Titel'), R('Beweis', pk('BeweisNr'), 'Bezeichnung', fk('FallNr', 'Fall'))];
  const schueler = [R('Fall', pk('FallNr'), 'Titel', fk('BeweisNr', 'Beweis')), R('Beweis', pk('BeweisNr'), 'Bezeichnung')];
  const erg = gleicheSchemaAb(schueler, [muster]);
  const h = erg.relationen.find((r) => r.name === 'Fall').hinweise.find((x) => x.code === 'FK_FALSCHE_SEITE');
  assert.ok(h);
  assert.match(h.text, /1:n/);
});

// ---------- ER ----------
const ent = (id, name, attrs) => ({ id, name, attribute: attrs.map((a) => (a.startsWith('*') ? { name: a.slice(1), schluessel: true } : { name: a })) });
const bez = (id, name, enden, attrs = []) => ({ id, name, enden: enden.map(([entitaet, kard, rolle]) => ({ entitaet, kard, rolle })), attribute: attrs.map((name) => ({ name })) });
const fbo = (attrGehoert = [], attrGefunden = ['Fundzeitpunkt']) => ({
  entitaeten: [ent('f', 'Fall', ['*FallNr', 'Titel']), ent('b', 'Beweisstueck', ['*BeweisNr', 'Bezeichnung']), ent('o', 'Ort', ['*OrtNr', 'Bezeichnung'])],
  beziehungen: [bez('r1', 'gehoertZu', [['f', '1'], ['b', 'n']], attrGehoert), bez('r2', 'gefundenAn', [['b', 'n'], ['o', '1']], attrGefunden)],
});
const alleTeile = (erg) => erg.kriterien.flatMap((k) => k.teile.filter((t) => !t.ok).map((t) => t.text));

test('ER: Attribut am falschen 1:n-Beziehungstyp → „gehört zu einem anderen …“, nicht „beschreibt einen Entitätstyp“', () => {
  for (const aequivalenzen of [[], ['attribut_an_n_seite']]) {
    const erg = gleicheAb(fbo(['Fundzeitpunkt'], []), [fbo()], { aequivalenzen });
    assert.equal(erg.geloest, false);
    const ba = erg.kriterien.find((k) => k.id === 'beziehungsattribute');
    assert.equal(ba.ok, false);
    const texte = alleTeile(erg);
    assert.ok(texte.some((t) => /„Fundzeitpunkt“ an „gehoertZu“.*gehört zu einem anderen/.test(t)), texte.join(' | '));
    assert.ok(!texte.some((t) => /beschreibt einen Entitätstyp/.test(t)), texte.join(' | '));
  }
  // gleichwertige Platzierung bleibt richtig
  const n = fbo([], []);
  n.entitaeten[1].attribute.push({ name: 'Fundzeitpunkt' });
  assert.equal(gleicheAb(n, [fbo()], { aequivalenzen: ['attribut_an_n_seite'] }).geloest, true);
});

test('ER: echtes Entitätsattribut an einer Beziehung behält „beschreibt einen Entitätstyp“', () => {
  const s = fbo([], ['Fundzeitpunkt', 'Titel']);
  s.entitaeten[0].attribute = s.entitaeten[0].attribute.filter((a) => a.name !== 'Titel');
  const texte = alleTeile(gleicheAb(s, [fbo()], {}));
  assert.ok(texte.some((t) => /„Titel“.*beschreibt einen Entitätstyp/.test(t)), texte.join(' | '));
});

test('ER: Fremdschlüssel als Attribute → Kriterium attribute mit falle P9 und passendem Text', () => {
  const muster = {
    entitaeten: [ent('e', 'Ermittler', ['*ErmittlerNr', 'Name']), ent('f', 'Fall', ['*FallNr', 'Titel'])],
    beziehungen: [bez('l', 'leitet', [['e', '1'], ['f', 'n']]), bez('b', 'betreut', [['e', '1', 'Mentor'], ['e', 'n', 'Neuling']])],
  };
  // MentorNr/LeiterNr (Rollen-FKs) und ErmittlerNr in Fall (Schlüssel eines anderen Entitätstyps)
  for (const extra of [{ e: 'MentorNr', f: 'LeiterNr' }, { f: 'ErmittlerNr' }]) {
    const s = JSON.parse(JSON.stringify(muster));
    if (extra.e) s.entitaeten[0].attribute.push({ name: extra.e });
    if (extra.f) s.entitaeten[1].attribute.push({ name: extra.f });
    const erg = gleicheAb(s, [muster]);
    const k = erg.kriterien.find((x) => x.id === 'attribute');
    assert.equal(k.ok, false);
    assert.equal(k.falle, 'P9');
    assert.ok(k.teile.some((t) => !t.ok && /Fremdschlüssel/.test(t.text)), JSON.stringify(k.teile));
  }
  // ein gewöhnliches überzähliges Attribut bleibt ohne Falle
  const s = JSON.parse(JSON.stringify(muster));
  s.entitaeten[1].attribute.push({ name: 'Farbe' });
  const k = gleicheAb(s, [muster]).kriterien.find((x) => x.id === 'attribute');
  assert.equal(k.ok, false);
  assert.equal(k.falle, undefined);
});
