'use strict';
// ER-Graph-Abgleich (Plan Phase 5 Task 1, Review Focus 1; Spec §7.6.4): Synonyme, Singular/Plural, mehrere
// Musterlösungen, Äquivalenzen, rekursive und ternäre Beziehungen, vertauschte Kardinalitäten, Schlüssel,
// Beziehungsattribute (P9), keine Musternamen in Rückmeldungen, robust gegen Unsinn; Formprüfung; Lesen-Modus.

const test = require('node:test');
const assert = require('node:assert/strict');
const { gleicheAb, pruefeLesen, pruefeGraphForm, KRITERIEN } = require('../src/er/abgleich');
const { stamm } = require('../src/er/namen');
const {
  graph, detektei, kletterhalle, namenImGraph, texteVon,
  DETEKTEI_ENTITAETEN, DETEKTEI_BEZIEHUNGEN, KLETTERHALLE_ENTITAETEN, KLETTERHALLE_BEZIEHUNGEN,
} = require('./hilfen_er');

const BEIDE = { aequivalenzen: ['nm_aufgeloest', 'attribut_an_n_seite'] };
const kriterium = (erg, id) => erg.kriterien.find((k) => k.id === id);
const okVon = (erg) => Object.fromEntries(erg.kriterien.map((k) => [k.id, k.ok]));
const kopie = (x) => JSON.parse(JSON.stringify(x));
/** Detektei-Schülergraph aus geänderten Listen (Präfix s_, andere Ids als im Muster). */
function detekteiMit(entAendern = (x) => x, bezAendern = (x) => x) {
  return graph('s_', entAendern(kopie(DETEKTEI_ENTITAETEN)), bezAendern(kopie(DETEKTEI_BEZIEHUNGEN)));
}
function ersetzeBez(liste, name, neu) {
  return liste.map((b) => (b[0] === name ? neu : b)).filter(Boolean);
}

/** Keine Namen aus der Musterlösung in den Texten, die der Schüler nicht selbst verwendet hat. */
function pruefeKeineMusternamen(erg, schueler, muster) {
  const eigene = new Set(namenImGraph(schueler).map(stamm));
  const fremde = [...new Set(namenImGraph(muster))].filter((n) => !eigene.has(stamm(n)));
  for (const text of texteVon(erg)) {
    for (const n of fremde) {
      const re = new RegExp('(^|[^A-Za-zÄÖÜäöüß])' + n + '($|[^A-Za-zÄÖÜäöüß])', 'i');
      assert.ok(!re.test(text), `Text „${text}“ nennt den Musternamen „${n}“`);
    }
  }
}

test('KRITERIEN: Standardkriterien in fester Reihenfolge', () => {
  assert.deepEqual(KRITERIEN, ['entitaeten', 'schluessel', 'attribute', 'beziehungen', 'kardinalitaeten', 'beziehungsattribute']);
});

test('Detektei-Referenzlösung gegen sich selbst: gelöst, 6 von 6', () => {
  const erg = gleicheAb(detektei('s_'), [detektei()]);
  assert.equal(erg.geloest, true, JSON.stringify(erg.kriterien, null, 1));
  assert.equal(erg.richtig, 6);
  assert.equal(erg.gesamt, 6);
  for (const k of erg.kriterien) {
    assert.equal(typeof k.text, 'string');
    assert.equal(k.ok, true);
    assert.equal(k.falle, undefined);
  }
});

test('Kletterhalle-Musterlösung gegen sich selbst: gelöst (rekursiv n:m mit Rollen, zwei Beziehungen, ternär)', () => {
  const erg = gleicheAb(kletterhalle('s_'), kletterhalle());
  assert.equal(erg.geloest, true, JSON.stringify(erg.kriterien, null, 1));
});

test('Groß/Klein, Umlaute und Singular/Plural der Schülernamen', () => {
  const s = detekteiMit((e) => {
    e[0][0] = 'ERMITTLER';
    e[1][0] = 'Fälle';
    e[2][0] = 'Personen';
    e[3][0] = 'orte';
    e[4][0] = 'Beweisstücke';
    e[4][1] = '_BeweisNr bezeichnung';
    return e;
  }, (b) => b.map((x) => {
    x[1] = x[1].replace(/Ermittler:/g, 'ERMITTLER:').replace(/Fall:/g, 'Fälle:').replace(/Person:/g, 'Personen:')
      .replace(/Ort:/g, 'orte:').replace(/Beweisstueck:/g, 'Beweisstücke:');
    return x;
  }));
  const erg = gleicheAb(s, [detektei()]);
  assert.equal(erg.geloest, true, JSON.stringify(erg.kriterien, null, 1));
});

test('Synonymliste je Aufgabe: Detektiv statt Ermittler (auch ohne passende Attribute)', () => {
  const muster = graph('m_', [['Ermittler', ''], ['Fall', '']], [['leitet', 'Ermittler:1 Fall:n']]);
  const schueler = graph('s_', [['Detektive', ''], ['Akte', '']], [['fuehrt', 'Detektive:1 Akte:n']]);
  const ohne = gleicheAb(schueler, [muster], { kriterien: ['entitaeten', 'beziehungen', 'kardinalitaeten'] });
  assert.equal(ohne.geloest, false);
  assert.equal(kriterium(ohne, 'entitaeten').ok, false);
  const mit = gleicheAb(schueler, [muster], {
    synonyme: { Ermittler: ['Detektiv'], Fall: ['Akte'] },
    kriterien: ['entitaeten', 'beziehungen', 'kardinalitaeten'],
  });
  assert.equal(mit.geloest, true, JSON.stringify(mit.kriterien, null, 1));
  assert.equal(mit.gesamt, 3);
});

test('Entitätstyp anders benannt, aber Attribute passen: Zuordnung über Attribut-Überdeckung', () => {
  const s = detekteiMit((e) => {
    e[0] = ['Detektiv', '_DetektivNr Name Dienstgrad'];
    return e;
  }, (b) => b.map((x) => { x[1] = x[1].replace(/Ermittler:/g, 'Detektiv:'); return x; }));
  const erg = gleicheAb(s, [detektei()]);
  assert.equal(erg.geloest, true, JSON.stringify(erg.kriterien, null, 1));
});

test('mehrere Musterlösungen: die beste zählt', () => {
  // Muster A: Ort als Attribut am Beweisstück; Muster B: Ort als Entitätstyp
  const a = graph('a_', [['Fall', '_FallNr Titel'], ['Beweisstueck', '_BeweisNr Bezeichnung Fundort']],
    [['gehoertZu', 'Fall:1 Beweisstueck:n']]);
  const b = graph('b_', [['Fall', '_FallNr Titel'], ['Beweisstueck', '_BeweisNr Bezeichnung'], ['Ort', '_OrtNr Bezeichnung']],
    [['gehoertZu', 'Fall:1 Beweisstueck:n'], ['gefundenAn', 'Ort:1 Beweisstueck:n']]);
  const schuelerA = graph('s_', [['Fall', '_FallNr Titel'], ['Beweisstueck', '_BeweisNr Bezeichnung Fundort']],
    [['gehoertZu', 'Fall:1 Beweisstueck:n']]);
  const schuelerB = graph('s_', [['Fall', '_FallNr Titel'], ['Beweisstueck', '_BeweisNr Bezeichnung'], ['Ort', '_OrtNr Bezeichnung']],
    [['gehoertZu', 'Fall:1 Beweisstueck:n'], ['gefundenAn', 'Ort:1 Beweisstueck:n']]);
  assert.equal(gleicheAb(schuelerA, [a, b]).geloest, true);
  assert.equal(gleicheAb(schuelerB, [a, b]).geloest, true);
  assert.equal(gleicheAb(schuelerB, [a]).geloest, false);
  // Einzelnes Muster ohne Array geht auch
  assert.equal(gleicheAb(schuelerA, a).geloest, true);
});

test('Äquivalenz nm_aufgeloest: n:m ↔ Zwischenentität mit zwei 1:n, Beziehungsattribut wandert mit', () => {
  const s = detekteiMit((e) => [...e, ['Verdacht', 'Grad']], (b) => [
    ...ersetzeBez(b, 'verdaechtig', null),
    ['betrifft', 'Person:1 Verdacht:n'],
    ['bezieht', 'Fall:1 Verdacht:n'],
  ]);
  const ohne = gleicheAb(s, [detektei()]);
  assert.equal(ohne.geloest, false);
  const mit = gleicheAb(s, [detektei()], BEIDE);
  assert.equal(mit.geloest, true, JSON.stringify(mit.kriterien, null, 1));
  // Zwischenentität mit eigenem Schlüsselattribut ist ebenfalls zulässig
  const s2 = detekteiMit((e) => [...e, ['Verdacht', '_VerdachtNr Grad']], (b) => [
    ...ersetzeBez(b, 'verdaechtig', null),
    ['betrifft', 'Person:1 Verdacht:n'],
    ['bezieht', 'Fall:1 Verdacht:n'],
  ]);
  assert.equal(gleicheAb(s2, [detektei()], BEIDE).geloest, true);
  // falsche Richtung der aufgelösten 1:n wird erkannt
  const s3 = detekteiMit((e) => [...e, ['Verdacht', 'Grad']], (b) => [
    ...ersetzeBez(b, 'verdaechtig', null),
    ['betrifft', 'Person:n Verdacht:1'],
    ['bezieht', 'Fall:1 Verdacht:n'],
  ]);
  const erg3 = gleicheAb(s3, [detektei()], BEIDE);
  assert.equal(erg3.geloest, false);
  assert.equal(kriterium(erg3, 'kardinalitaeten').ok, false);
});

test('Äquivalenz nm_aufgeloest auch für ternäre und rekursive Beziehungen', () => {
  const s = detekteiMit((e) => [...e, ['Aussage', 'Zeitpunkt Inhalt'], ['Bekanntschaft', 'Seit']], (b) => [
    ...ersetzeBez(ersetzeBez(b, 'sagtAus', null), 'kennt', null),
    ['macht', 'Person:1 Aussage:n'],
    ['zu', 'Fall:1 Aussage:n'],
    ['an', 'Ort:1 Aussage:n'],
    ['kennt', 'Person:1 Bekanntschaft:n'],
    ['wirdGekannt', 'Person:1 Bekanntschaft:n'],
  ]);
  const erg = gleicheAb(s, [detektei()], BEIDE);
  assert.equal(erg.geloest, true, JSON.stringify(erg.kriterien, null, 1));
});

test('Äquivalenz attribut_an_n_seite: Attribut einer 1:n-Beziehung am Entitätstyp der n-Seite', () => {
  const muster = graph('m_', [['Ermittler', '_ErmittlerNr Name'], ['Fall', '_FallNr Titel']],
    [['leitet', 'Ermittler:1 Fall:n', 'LeitungSeit']]);
  const anFall = graph('s_', [['Ermittler', '_ErmittlerNr Name'], ['Fall', '_FallNr Titel LeitungSeit']],
    [['leitet', 'Ermittler:1 Fall:n']]);
  const anErmittler = graph('s_', [['Ermittler', '_ErmittlerNr Name LeitungSeit'], ['Fall', '_FallNr Titel']],
    [['leitet', 'Ermittler:1 Fall:n']]);
  assert.equal(gleicheAb(anFall, [muster]).geloest, false);
  assert.equal(gleicheAb(anFall, [muster], BEIDE).geloest, true);
  const erg = gleicheAb(anErmittler, [muster], BEIDE);
  assert.equal(erg.geloest, false, '1-Seite ist nicht gleichwertig');
  assert.equal(kriterium(erg, 'beziehungsattribute').ok, false);
  assert.equal(kriterium(erg, 'beziehungsattribute').falle, 'P9');
});

test('rekursive 1:n-Beziehung: Richtung über Rollen, ohne Rollen beide Zuordnungen', () => {
  const mitRollen = (r1, r2) => detekteiMit(undefined, (b) => ersetzeBez(b, 'betreut', ['betreut', `Ermittler:${r1} Ermittler:${r2}`]));
  // ohne Rollen: 1 und n in beliebiger Reihenfolge richtig
  assert.equal(gleicheAb(mitRollen('n', '1'), [detektei()]).geloest, true);
  assert.equal(gleicheAb(mitRollen('1', 'n'), [detektei()]).geloest, true);
  // ohne Rollen, aber n:m → falsch
  const nm = gleicheAb(mitRollen('n', 'm'), [detektei()]);
  assert.equal(nm.geloest, false);
  assert.equal(kriterium(nm, 'kardinalitaeten').ok, false);
  // passende Rollen, richtige Richtung (Reihenfolge der Enden egal)
  assert.equal(gleicheAb(mitRollen('n:Betreuter', '1:Mentor'), [detektei()]).geloest, true);
  // passende Rollen, vertauschte Richtung → erkannt
  const vertauscht = gleicheAb(mitRollen('n:Mentor', '1:Betreuter'), [detektei()]);
  assert.equal(vertauscht.geloest, false);
  const k = kriterium(vertauscht, 'kardinalitaeten');
  assert.equal(k.ok, false);
  assert.equal(k.falle, 'P9');
  assert.ok(k.teile.some((t) => !t.ok && /vertauscht/.test(t.text) && /betreut/.test(t.text)), JSON.stringify(k.teile));
  // eigene Rollennamen (nicht im Muster) → wie ohne Rollen
  assert.equal(gleicheAb(mitRollen('1:Pate', 'n:Schuetzling'), [detektei()]).geloest, true);
  // Rollen per Synonym
  const syn = gleicheAb(mitRollen('n:Mentee', '1:Mentor'), [detektei()], { synonyme: { Betreuter: ['Mentee'] } });
  assert.equal(syn.geloest, true);
});

test('rekursive n:m-Beziehung mit und ohne Rollen', () => {
  const k = (enden) => kletterhalle('s_') && graph('s_', KLETTERHALLE_ENTITAETEN,
    ersetzeBez(kopie(KLETTERHALLE_BEZIEHUNGEN), 'sichert', ['sichert', enden]));
  assert.equal(gleicheAb(k('Mitglied:m Mitglied:n'), kletterhalle()).geloest, true);
  assert.equal(gleicheAb(k('Mitglied:n:Kletternder Mitglied:m:Sichernder'), kletterhalle()).geloest, true);
  const einsZuN = gleicheAb(k('Mitglied:1:Sichernder Mitglied:n:Kletternder'), kletterhalle());
  assert.equal(einsZuN.geloest, false);
  assert.equal(kriterium(einsZuN, 'kardinalitaeten').ok, false);
  // nur ein Ende → Beziehung fehlt (keine rekursive Beziehung)
  const halb = gleicheAb(k('Mitglied:n'), kletterhalle());
  assert.equal(kriterium(halb, 'beziehungen').ok, false);
});

test('ternäre Beziehung m:n:p: n/m/p gleichwertig, eine 1 ist falsch, binär statt ternär fehlt', () => {
  const mit = (enden, attr = 'Zeitpunkt Inhalt') => detekteiMit(undefined, (b) => ersetzeBez(b, 'sagtAus', ['sagtAus', enden, attr]));
  assert.equal(gleicheAb(mit('Ort:m Person:n Fall:m'), [detektei()]).geloest, true);
  const eins = gleicheAb(mit('Person:m Fall:1 Ort:p'), [detektei()]);
  assert.equal(eins.geloest, false);
  assert.equal(kriterium(eins, 'kardinalitaeten').ok, false);
  const binaer = gleicheAb(mit('Person:n Fall:m'), [detektei()]);
  assert.equal(kriterium(binaer, 'beziehungen').ok, false);
});

test('zwei Beziehungen zwischen denselben Entitätstypen (leitet/besucht Mitglied–Kurs)', () => {
  const ohne = (liste) => graph('s_', KLETTERHALLE_ENTITAETEN, liste);
  const basis = () => kopie(KLETTERHALLE_BEZIEHUNGEN);
  // eigene Namen, richtige Kardinalitäten → Zuordnung über Kardinalitäten
  const umbenannt = ersetzeBez(ersetzeBez(basis(), 'leitet', ['fuehrtDurch', 'Mitglied:1 Kurs:n']), 'besucht', ['nimmtTeil', 'Kurs:n Mitglied:m']);
  assert.equal(gleicheAb(ohne(umbenannt), kletterhalle()).geloest, true);
  // Musternamen, aber Kardinalitäten vertauscht → Zuordnung über Namen, Kardinalität falsch
  const getauscht = ersetzeBez(ersetzeBez(basis(), 'leitet', ['leitet', 'Mitglied:n Kurs:m']), 'besucht', ['besucht', 'Mitglied:1 Kurs:n']);
  const erg = gleicheAb(ohne(getauscht), kletterhalle());
  assert.equal(kriterium(erg, 'beziehungen').ok, true);
  assert.equal(kriterium(erg, 'kardinalitaeten').ok, false);
  // nur eine der beiden Beziehungen → Beziehung fehlt
  const eine = ersetzeBez(basis(), 'besucht', null);
  const erg2 = gleicheAb(ohne(eine), kletterhalle());
  assert.equal(kriterium(erg2, 'beziehungen').ok, false);
  assert.equal(kriterium(erg2, 'kardinalitaeten').ok, false);
});

test('vertauschte Kardinalitätsrichtung bei 1:n wird erkannt (P9), Text nennt nur Schülernamen', () => {
  const s = detekteiMit(undefined, (b) => ersetzeBez(b, 'leitet', ['leitet', 'Ermittler:n Fall:1']));
  const erg = gleicheAb(s, [detektei()]);
  assert.equal(erg.geloest, false);
  assert.deepEqual(okVon(erg), {
    entitaeten: true, schluessel: true, attribute: true, beziehungen: true, kardinalitaeten: false, beziehungsattribute: true,
  });
  assert.equal(erg.richtig, 5);
  const k = kriterium(erg, 'kardinalitaeten');
  assert.equal(k.falle, 'P9');
  const teil = k.teile.find((t) => !t.ok);
  assert.match(teil.text, /vertauscht/);
  assert.match(teil.text, /Ermittler/);
  assert.match(teil.text, /Fall/);
});

test('Kardinalitäten strukturell: n, m, p gleichwertig; ungültig oder fehlend ist falsch', () => {
  const mit = (enden) => detekteiMit(undefined, (b) => ersetzeBez(b, 'verdaechtig', ['verdaechtig', enden, 'Grad']));
  assert.equal(gleicheAb(mit('Person:m Fall:n'), [detektei()]).geloest, true);
  assert.equal(gleicheAb(mit('Person:p Fall:M'), [detektei()]).geloest, true);
  assert.equal(gleicheAb(mit('Person:1 Fall:1'), [detektei()]).geloest, false);
  assert.equal(gleicheAb(mit('Person:x Fall:n'), [detektei()]).geloest, false);
  const ohneKard = detekteiMit();
  delete ohneKard.beziehungen[1].enden[0].kard;
  const erg = gleicheAb(ohneKard, [detektei()]);
  assert.equal(kriterium(erg, 'kardinalitaeten').ok, false);
});

test('Schlüsselattribut fehlt bzw. falsch gewählt (P8)', () => {
  const fehlt = detekteiMit((e) => { e[1][1] = 'FallNr Titel Eroeffnet Status'; return e; });
  const erg = gleicheAb(fehlt, [detektei()]);
  assert.equal(kriterium(erg, 'schluessel').ok, false);
  assert.equal(kriterium(erg, 'schluessel').falle, 'P8');
  assert.equal(kriterium(erg, 'attribute').ok, true);
  assert.ok(kriterium(erg, 'schluessel').teile.some((t) => !t.ok && /Fall/.test(t.text)));
  const falsch = detekteiMit((e) => { e[1][1] = 'FallNr _Titel Eroeffnet Status'; return e; });
  assert.equal(kriterium(gleicheAb(falsch, [detektei()]), 'schluessel').ok, false);
  // künstlicher Schlüssel mit anderem Namen ist in Ordnung
  const id = detekteiMit((e) => { e[1][1] = '_FallID Titel Eroeffnet Status'; return e; });
  assert.equal(gleicheAb(id, [detektei()]).geloest, true);
});

test('Attribute: fehlend und überzählig werden erkannt', () => {
  const fehlt = detekteiMit((e) => { e[2][1] = '_PersonNr Vorname Nachname Jahrgang'; return e; });
  const erg = gleicheAb(fehlt, [detektei()]);
  assert.equal(kriterium(erg, 'attribute').ok, false);
  assert.ok(kriterium(erg, 'attribute').teile.some((t) => !t.ok && /Person/.test(t.text) && /1 Attribut fehlt/.test(t.text)));
  const zuviel = detekteiMit((e) => { e[2][1] += ' Schuhgroesse'; return e; });
  const erg2 = gleicheAb(zuviel, [detektei()]);
  assert.equal(kriterium(erg2, 'attribute').ok, false);
  assert.ok(kriterium(erg2, 'attribute').teile.some((t) => /Schuhgroesse/.test(t.text)));
});

test('Beziehungsattribut an falscher Stelle (P9): Grad an Person statt an verdaechtig', () => {
  const s = detekteiMit((e) => { e[2][1] += ' Grad'; return e; },
    (b) => ersetzeBez(b, 'verdaechtig', ['verdaechtig', 'Person:n Fall:m']));
  const erg = gleicheAb(s, [detektei()], BEIDE);
  assert.equal(erg.geloest, false);
  const k = kriterium(erg, 'beziehungsattribute');
  assert.equal(k.ok, false);
  assert.equal(k.falle, 'P9');
  assert.ok(k.teile.some((t) => !t.ok && /Grad/.test(t.text) && /Person/.test(t.text)), JSON.stringify(k.teile));
  assert.equal(kriterium(erg, 'attribute').ok, true, 'nicht doppelt als überzähliges Attribut werten');
  // Entitätsattribut an einem Beziehungstyp
  const s2 = detekteiMit((e) => { e[1][1] = '_FallNr Eroeffnet Status'; return e; },
    (b) => ersetzeBez(b, 'leitet', ['leitet', 'Ermittler:1 Fall:n', 'Titel']));
  const erg2 = gleicheAb(s2, [detektei()]);
  assert.equal(kriterium(erg2, 'beziehungsattribute').ok, false);
});

test('Kletterhalle: typische Schülerfehler', () => {
  const basis = () => kopie(KLETTERHALLE_BEZIEHUNGEN);
  const ents = () => kopie(KLETTERHALLE_ENTITAETEN);
  // Datum und Erfolg an Route statt an begeht (P9)
  const e1 = ents();
  e1[2][1] += ' Datum Erfolg';
  const erg1 = gleicheAb(graph('s_', e1, ersetzeBez(basis(), 'begeht', ['begeht', 'Mitglied:n Route:m'])), kletterhalle(), BEIDE);
  assert.equal(kriterium(erg1, 'beziehungsattribute').ok, false);
  assert.equal(kriterium(erg1, 'beziehungsattribute').falle, 'P9');
  // sichert als 1:n
  const erg2 = gleicheAb(graph('s_', ents(), ersetzeBez(basis(), 'sichert', ['sichert', 'Mitglied:1 Mitglied:n'])), kletterhalle());
  assert.equal(kriterium(erg2, 'kardinalitaeten').ok, false);
  // wertet nur binär (Wettkampf fehlt an der Beziehung)
  const erg3 = gleicheAb(graph('s_', ents(), ersetzeBez(basis(), 'wertet', ['wertet', 'Mitglied:n Route:m', 'Punkte'])), kletterhalle());
  assert.equal(kriterium(erg3, 'beziehungen').ok, false);
  // Routenbauer fehlt ganz (und damit schraubt)
  const ohneBauer = ents().filter((e) => e[0] !== 'Routenbauer');
  const erg4 = gleicheAb(graph('s_', ohneBauer, ersetzeBez(basis(), 'schraubt', null)), kletterhalle());
  assert.equal(kriterium(erg4, 'entitaeten').ok, false);
  assert.match(kriterium(erg4, 'entitaeten').text, /5 von 6/);
  assert.equal(kriterium(erg4, 'beziehungen').ok, false);
  assert.match(kriterium(erg4, 'beziehungen').text, /6 von 7/);
  // begeht als Zwischenentität Begehung (Äquivalenz)
  const e5 = [...ents(), ['Begehung', 'Datum Erfolg']];
  const b5 = [...ersetzeBez(basis(), 'begeht', null), ['macht', 'Mitglied:1 Begehung:n'], ['von', 'Route:1 Begehung:n']];
  assert.equal(gleicheAb(graph('s_', e5, b5), kletterhalle(), BEIDE).geloest, true);
  // überzähliger Entitätstyp
  const e6 = [...ents(), ['Getraenk', '_GetraenkNr Sorte']];
  const erg6 = gleicheAb(graph('s_', e6, basis()), kletterhalle());
  assert.equal(kriterium(erg6, 'entitaeten').ok, false);
  assert.ok(kriterium(erg6, 'entitaeten').teile.some((t) => /Getraenk/.test(t.text)));
});

test('Rückmeldungen nennen keine Namen aus der Musterlösung, die der Schüler nicht verwendet', () => {
  const schuelerK = graph('s_', [['Mitglied', '_MitgliedsNr Jahrgang'], ['Kurs', '_KursNr'], ['Halle', 'Ort']],
    [['besucht', 'Mitglied:n Kurs:m'], ['', 'Mitglied:1 Kurs:1']]);
  const ergK = gleicheAb(schuelerK, kletterhalle(), BEIDE);
  assert.equal(ergK.geloest, false);
  pruefeKeineMusternamen(ergK, schuelerK, kletterhalle());
  const schuelerD = graph('s_', [['Detektiv', '_DNr Name'], ['Akte', '_AktenNr'], ['Person', 'Vorname _Grad']],
    [['bearbeitet', 'Detektiv:n Akte:1'], ['kennt', 'Person:1 Person:n']]);
  const ergD = gleicheAb(schuelerD, [detektei()], BEIDE);
  pruefeKeineMusternamen(ergD, schuelerD, detektei());
  // auch bei leerer Abgabe
  const leer = { entitaeten: [], beziehungen: [] };
  const ergL = gleicheAb(leer, [detektei()]);
  pruefeKeineMusternamen(ergL, leer, detektei());
  assert.match(kriterium(ergL, 'entitaeten').text, /0 von 5/);
});

test('robust gegen Unsinn: wirft nie, wertet falsch', () => {
  const muster = [detektei()];
  const unsinn = [
    null, undefined, 42, 'text', [], {}, { entitaeten: 'x' }, { entitaeten: [null, 3, { name: 'Fall' }] },
    { entitaeten: [{ id: 'a', name: 'Fall', attribute: 'kaputt' }], beziehungen: [{ id: 'b', enden: [{ entitaet: 'zz', kard: 'n' }, null] }] },
    { entitaeten: [{ id: 'a', name: { x: 1 } }], beziehungen: [{ enden: 'x' }, null, { id: 'c', enden: [{ entitaet: 'a' }, { entitaet: 'a', kard: 'n' }], attribute: [null, { name: 7 }] }] },
  ];
  for (const s of unsinn) {
    const erg = gleicheAb(s, muster);
    assert.equal(erg.geloest, false);
    assert.equal(erg.gesamt, 6);
    assert.ok(Array.isArray(erg.kriterien));
  }
  // Kanten auf nicht existierende Entitätstypen zählen nicht als gefunden
  const s = detekteiMit();
  s.beziehungen[1].enden[1].entitaet = 'gibtsnicht';
  const erg = gleicheAb(s, muster);
  assert.equal(kriterium(erg, 'beziehungen').ok, false);
  // doppelte Ids: zweiter Eintrag wird ignoriert
  const d = detekteiMit();
  d.entitaeten.push({ id: d.entitaeten[0].id, name: 'Doppelt', attribute: [] });
  assert.doesNotThrow(() => gleicheAb(d, muster));
  // Muster unbrauchbar → nicht gelöst, keine Ausnahme
  assert.equal(gleicheAb(detektei('s_'), []).geloest, false);
  assert.equal(gleicheAb(detektei('s_'), null).geloest, false);
});

test('Option kriterien: nur ausgewählte Kriterien zählen', () => {
  const s = detekteiMit(undefined, (b) => ersetzeBez(b, 'leitet', ['leitet', 'Ermittler:n Fall:1']));
  const erg = gleicheAb(s, [detektei()], { kriterien: ['beziehungsattribute', 'entitaeten'] });
  assert.deepEqual(erg.kriterien.map((k) => k.id), ['entitaeten', 'beziehungsattribute']);
  assert.equal(erg.gesamt, 2);
  assert.equal(erg.geloest, true);
  // ohne Beziehungsattribute im Muster und beim Schüler entfällt das Kriterium
  const m = graph('m_', [['Ermittler', '_ErmittlerNr'], ['Fall', '_FallNr']], [['leitet', 'Ermittler:1 Fall:n']]);
  const e2 = gleicheAb(graph('s_', [['Ermittler', '_ErmittlerNr'], ['Fall', '_FallNr']], [['leitet', 'Ermittler:1 Fall:n']]), [m]);
  assert.equal(e2.gesamt, 5);
  assert.equal(e2.geloest, true);
});

test('pruefeGraphForm: Grenzen und Struktur', () => {
  assert.deepEqual(pruefeGraphForm(detektei()), []);
  assert.deepEqual(pruefeGraphForm(kletterhalle()), []);
  assert.ok(pruefeGraphForm(null).length > 0);
  assert.ok(pruefeGraphForm({ entitaeten: 'x', beziehungen: [] }).length > 0);
  const viele = { entitaeten: Array.from({ length: 31 }, (_, i) => ({ id: 'e' + i, name: 'E' + i, attribute: [] })), beziehungen: [] };
  assert.ok(pruefeGraphForm(viele).some((f) => /30/.test(f)));
  const langerName = detektei();
  langerName.entitaeten[0].name = 'X'.repeat(41);
  assert.ok(pruefeGraphForm(langerName).some((f) => /40/.test(f)));
  const leererName = detektei();
  leererName.entitaeten[0].attribute[1].name = '  ';
  assert.ok(pruefeGraphForm(leererName).length > 0);
  const kard = detektei();
  kard.beziehungen[0].enden[0].kard = 'x';
  assert.ok(pruefeGraphForm(kard).some((f) => /Kardinalität/.test(f)));
  const einEnde = detektei();
  einEnde.beziehungen[0].enden = [einEnde.beziehungen[0].enden[0]];
  assert.ok(pruefeGraphForm(einEnde).some((f) => /zwei/.test(f)));
  const haengt = detektei();
  haengt.beziehungen[0].enden[0].entitaet = 'gibtsnicht';
  assert.ok(pruefeGraphForm(haengt).length > 0);
  const doppelt = detektei();
  doppelt.beziehungen[0].id = doppelt.entitaeten[0].id;
  assert.ok(pruefeGraphForm(doppelt).some((f) => /doppelt/.test(f)));
  const vieleAttr = detektei();
  vieleAttr.entitaeten[0].attribute = Array.from({ length: 31 }, (_, i) => ({ name: 'A' + i }));
  assert.ok(pruefeGraphForm(vieleAttr).length > 0);
});

test('pruefeLesen: Menge der Element-Ids', () => {
  const loesung = { elemente: ['e1', 'e2', 'b1'] };
  assert.deepEqual(pruefeLesen({ elemente: ['b1', 'e2', 'e1'] }, loesung), { geloest: true, richtig: 3, gesamt: 3, zuviel: 0 });
  assert.deepEqual(pruefeLesen({ elemente: ['e1', 'x9'] }, loesung), { geloest: false, richtig: 1, gesamt: 3, zuviel: 1 });
  assert.deepEqual(pruefeLesen({ elemente: ['e1', 'e1', 'e2', 'b1'] }, loesung), { geloest: true, richtig: 3, gesamt: 3, zuviel: 0 });
  assert.equal(pruefeLesen(null, loesung).geloest, false);
  assert.equal(pruefeLesen({ elemente: 'e1' }, loesung).geloest, false);
});

test('pruefeLesen: Zuordnung Id → Kategorie', () => {
  const loesung = { zuordnung: { e1: 'Entitätstyp', b1: 'Beziehungstyp', a1: 'Schlüsselattribut' } };
  assert.deepEqual(pruefeLesen({ zuordnung: { e1: 'Entitätstyp', b1: 'Beziehungstyp', a1: 'Schlüsselattribut' } }, loesung),
    { geloest: true, richtig: 3, gesamt: 3, zuviel: 0 });
  assert.deepEqual(pruefeLesen({ zuordnung: { e1: 'Entitätstyp', b1: 'Attribut', x: 'Attribut' } }, loesung),
    { geloest: false, richtig: 1, gesamt: 3, zuviel: 1 });
  assert.equal(pruefeLesen({ zuordnung: null }, loesung).geloest, false);
  assert.equal(pruefeLesen({ zuordnung: { e1: 'Entitätstyp' } }, { kaputt: true }).geloest, false);
});

test('Äquivalenzen ändern die gezählten Mengen nicht: Zählung nach der ursprünglichen Musterlösung', () => {
  const schueler = graph('s_', [['Mitglied', '_MitgliedsNr Jahrgang'], ['Kurs', '_KursNr']], [['besucht', 'Mitglied:n Kurs:m']]);
  const erg = gleicheAb(schueler, kletterhalle(), BEIDE);
  assert.match(kriterium(erg, 'entitaeten').text, /2 von 6/);
  assert.match(kriterium(erg, 'beziehungen').text, /1 von 7/);
  // aufgelöste Begehung, Datum aber am Entitätstyp Route: Zwischenentität zählt nicht als Entitätstyp
  const e = kopie(KLETTERHALLE_ENTITAETEN);
  e[2][1] += ' Datum';
  e.push(['Begehung', '_BegehungNr Erfolg']);
  const b = kopie(KLETTERHALLE_BEZIEHUNGEN).filter((x) => x[0] !== 'begeht');
  b.push(['macht', 'Mitglied:1 Begehung:n'], ['an', 'Route:1 Begehung:n']);
  const erg2 = gleicheAb(graph('s_', e, b), kletterhalle(), BEIDE);
  assert.deepEqual(okVon(erg2), {
    entitaeten: true, schluessel: true, attribute: true, beziehungen: true, kardinalitaeten: true, beziehungsattribute: false,
  });
  assert.match(kriterium(erg2, 'entitaeten').text, /Alle 6/);
  assert.match(kriterium(erg2, 'beziehungsattribute').text, /2 von 3/);
});

test('Laufzeit: Kletterhalle mit allen Äquivalenzen deutlich unter einer Sekunde', () => {
  const start = Date.now();
  for (let i = 0; i < 5; i++) gleicheAb(kletterhalle('s_'), [kletterhalle(), detektei()], BEIDE);
  assert.ok(Date.now() - start < 2500, `${Date.now() - start} ms für 5 Abgleiche`);
});

test('ordneZu: ungarische Methode maximiert die Summe, 0 heißt nicht zugeordnet', () => {
  const { ordneZu } = require('../src/er/zuordnung');
  assert.deepEqual(ordneZu([[5, 9], [10, 1]]), [1, 0]);
  assert.deepEqual(ordneZu([[3, 2, 0], [3, 0, 0]]), [1, 0]);
  assert.deepEqual(ordneZu([[0, 0], [0, 7]]), [-1, 1]);
  assert.deepEqual(ordneZu([[1], [2], [3]]), [-1, -1, 0]);
  assert.deepEqual(ordneZu([]), []);
  assert.deepEqual(ordneZu([[]]), [-1]);
  // Gegenprobe gegen Brute Force auf Zufallsmatrizen
  let saat = 7;
  const zufall = () => (saat = (saat * 1103515245 + 12345) % 2147483648) % 10;
  const perms = (n) => (n <= 1 ? [[0]] : perms(n - 1).flatMap((p) => Array.from({ length: n }, (_, i) => [...p.slice(0, i), n - 1, ...p.slice(i)])));
  for (let fall = 0; fall < 30; fall++) {
    const n = 1 + (fall % 5);
    const w = Array.from({ length: n }, () => Array.from({ length: n }, zufall));
    const best = Math.max(...perms(n).map((p) => p.reduce((s, j, i) => s + w[i][j], 0)));
    const z = ordneZu(w);
    assert.equal(z.reduce((s, j, i) => s + (j >= 0 ? w[i][j] : 0), 0), best);
  }
});

test('Probelauf 8: Kriterientexte bei genau einem Entitäts-/Beziehungstyp in der Einzahl', () => {
  // Muster wie A5-E2-03: Person mit rekursivem Beziehungstyp kennt (n:m)
  const muster = graph('m_', [['Person', '_PersonNr Name']], [['kennt', 'Person:n Person:m']]);
  const richtig = gleicheAb(graph('s_', [['Person', '_PersonNr Name']], [['kennt', 'Person:n Person:m']]), muster);
  assert.equal(kriterium(richtig, 'entitaeten').text, 'Der Entitätstyp ist gefunden.');
  assert.equal(kriterium(richtig, 'beziehungen').text, 'Der Beziehungstyp ist gefunden.');
  const falsch = gleicheAb(graph('s_', [['Person', 'PersonNr Name']], [['kennt', 'Person:1 Person:1']]), muster);
  assert.equal(kriterium(falsch, 'schluessel').text, '0 von 1 Entitätstyp mit richtigem Schlüsselattribut.');
  assert.equal(kriterium(falsch, 'kardinalitaeten').text, '0 von 1 Beziehungstyp mit richtigen Kardinalitäten.');
  const ohne = gleicheAb(graph('s_', [['Person', '_PersonNr Name']]), muster);
  assert.equal(kriterium(ohne, 'beziehungen').text, '0 von 1 Beziehungstyp gefunden.');
  for (const t of texteVon(falsch).concat(texteVon(ohne))) assert.doesNotMatch(t, /\b(Alle )?1 (Entitätstypen|Beziehungstypen)\b/, t);
});
