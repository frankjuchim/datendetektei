'use strict';
// Zerlegung über funktionale Abhängigkeiten (Plan Phase 5 Task 1, Review Focus 2; Spec §7.6.6): Hülle,
// Schlüsselkandidaten, Projektion, Verlustfreiheit per Chase (auch ≥ 3 Tabellen), Redundanzfreiheit über projizierte
// FAs, falscher/nicht minimaler Schlüssel, Feedback-Sätze mit den Spalten der Schülerzerlegung.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { huelle, schluesselKandidaten, projiziere, verlustfrei, pruefeZerlegung, bcnfZerlegung } = require('../src/er/zerlegung');
const { TUS } = require('./hilfen_er');

const menge = (liste) => [...liste].sort();
const T = (schluessel, weitere = []) => ({ attribute: [...schluessel, ...weitere], schluessel });

/** Musterzerlegung TuS (LIESMICH „Funktionale Abhängigkeiten“). */
function tusMuster() {
  return {
    tabellen: [
      T(['MitgliedNr'], ['Vorname', 'Nachname', 'Geburtsjahr', 'Beitragsgruppe', 'Eintritt']),
      T(['Beitragsgruppe'], ['Monatsbeitrag']),
      T(['Abteilung'], ['Trainer', 'Halle']),
      T(['Trainer'], ['TrainerTelefon']),
      T(['Halle'], ['HallenAdresse']),
      T(['MitgliedNr', 'Abteilung'], ['Seit']),
    ],
  };
}

/** Musikschule (VERHOER_KONTEXTE V4), Lücken ergänzt: LehrkraftNr künstlich, Name getrennt, Etage aus Raum. */
const MUSIKSCHULE = {
  attribute: ['SchuelerNr', 'Vorname', 'Nachname', 'Geburtsjahr', 'Tarif', 'Monatsgebuehr', 'Instrument',
    'LehrkraftNr', 'LehrkraftName', 'Telefon', 'Raum', 'Etage'],
  fa: [
    { links: ['SchuelerNr'], rechts: ['Vorname', 'Nachname', 'Geburtsjahr', 'Tarif'] },
    { links: ['Tarif'], rechts: ['Monatsgebuehr'] },
    { links: ['LehrkraftNr'], rechts: ['LehrkraftName', 'Telefon', 'Raum'] },
    { links: ['Raum'], rechts: ['Etage'] },
  ],
  schluessel: ['SchuelerNr', 'Instrument', 'LehrkraftNr'],
};
function musikschuleMuster() {
  return {
    tabellen: [
      T(['SchuelerNr'], ['Vorname', 'Nachname', 'Geburtsjahr', 'Tarif']),
      T(['Tarif'], ['Monatsgebuehr']),
      T(['LehrkraftNr'], ['LehrkraftName', 'Telefon', 'Raum']),
      T(['Raum'], ['Etage']),
      T(['SchuelerNr', 'Instrument', 'LehrkraftNr']),
    ],
  };
}

const A4_E2_06 = { attribute: ['Abteilung', 'Trainer', 'TrainerTelefon', 'Halle', 'HallenAdresse'], fa: TUS.fa };

test('huelle', () => {
  assert.deepEqual(menge(huelle(['Abteilung'], TUS.fa)), menge(['Abteilung', 'Trainer', 'Halle', 'TrainerTelefon', 'HallenAdresse']));
  assert.deepEqual(menge(huelle(['MitgliedNr', 'Abteilung'], TUS.fa)), menge(TUS.attribute));
  assert.deepEqual(menge(huelle(['Seit'], TUS.fa)), ['Seit']);
  assert.deepEqual(huelle([], TUS.fa), []);
  assert.deepEqual(menge(huelle(['MitgliedNr'], TUS.fa)),
    menge(['MitgliedNr', 'Vorname', 'Nachname', 'Geburtsjahr', 'Beitragsgruppe', 'Eintritt', 'Monatsbeitrag']));
});

test('schluesselKandidaten', () => {
  assert.deepEqual(schluesselKandidaten(TUS.attribute, TUS.fa), [['MitgliedNr', 'Abteilung']]);
  assert.deepEqual(schluesselKandidaten(['Abteilung', 'Trainer', 'TrainerTelefon'], TUS.fa), [['Abteilung']]);
  assert.deepEqual(schluesselKandidaten(MUSIKSCHULE.attribute, MUSIKSCHULE.fa), [['SchuelerNr', 'Instrument', 'LehrkraftNr']]);
  const fa = [{ links: ['A'], rechts: ['B', 'C'] }, { links: ['B'], rechts: ['A'] }];
  assert.deepEqual(schluesselKandidaten(['A', 'B', 'C'], fa), [['A'], ['B']]);
  const fa2 = [{ links: ['A', 'B'], rechts: ['C'] }, { links: ['C'], rechts: ['A'] }];
  assert.deepEqual(schluesselKandidaten(['A', 'B', 'C'], fa2), [['A', 'B'], ['B', 'C']]);
  assert.deepEqual(schluesselKandidaten(['X', 'Y'], []), [['X', 'Y']]);
});

test('projiziere: FAs über die Hülle, auch über nicht enthaltene Spalten', () => {
  const p = projiziere(TUS.fa, ['Abteilung', 'Trainer', 'TrainerTelefon']);
  const von = (links) => p.find((f) => menge(f.links).join() === menge(links).join());
  assert.deepEqual(menge(von(['Abteilung']).rechts), ['Trainer', 'TrainerTelefon']);
  assert.deepEqual(von(['Trainer']).rechts, ['TrainerTelefon']);
  assert.equal(von(['TrainerTelefon']), undefined);
  assert.equal(von(['Abteilung', 'Trainer']), undefined, 'nur minimale linke Seiten');
  const q = projiziere(TUS.fa, ['MitgliedNr', 'Monatsbeitrag']);
  assert.deepEqual(q, [{ links: ['MitgliedNr'], rechts: ['Monatsbeitrag'] }]);
});

test('verlustfrei per Chase: TuS-Musterzerlegung, ohne Mitgliedschaft, Teilzerlegung', () => {
  const tabellen = tusMuster().tabellen.map((t) => t.attribute);
  assert.equal(verlustfrei(tabellen, TUS.attribute, TUS.fa), true);
  assert.equal(verlustfrei(tabellen.slice(0, 5), TUS.attribute, TUS.fa), false);
  // Mitgliedschaft ohne Seit: Seit fehlt → nicht verlustfrei
  assert.equal(verlustfrei([...tabellen.slice(0, 5), ['MitgliedNr', 'Abteilung']], TUS.attribute, TUS.fa), false);
  assert.equal(verlustfrei([['Abteilung', 'Trainer', 'Halle'], ['Trainer', 'TrainerTelefon'], ['Halle', 'HallenAdresse']], A4_E2_06.attribute, TUS.fa), true);
  assert.equal(verlustfrei([['Abteilung', 'Trainer'], ['Trainer', 'TrainerTelefon'], ['Halle', 'HallenAdresse']], A4_E2_06.attribute, TUS.fa), false);
  // gemeinsame Spalte, die nichts bestimmt → verlustbehaftet
  assert.equal(verlustfrei([['Abteilung', 'Halle'], ['Trainer', 'Halle', 'TrainerTelefon', 'HallenAdresse']], A4_E2_06.attribute, TUS.fa), false);
  // Tabellen als Objekte
  assert.equal(verlustfrei(tusMuster().tabellen, TUS.attribute, TUS.fa), true);
});

test('verlustfrei per Chase mit fünf Tabellen (Lehrbuchbeispiel) und drei Tabellen', () => {
  const fa = [
    { links: ['A'], rechts: ['C'] }, { links: ['B'], rechts: ['C'] }, { links: ['C'], rechts: ['D'] },
    { links: ['D', 'E'], rechts: ['C'] }, { links: ['C', 'E'], rechts: ['A'] },
  ];
  const r = ['A', 'B', 'C', 'D', 'E'];
  assert.equal(verlustfrei([['A', 'D'], ['A', 'B'], ['B', 'E'], ['C', 'D', 'E'], ['A', 'E']], r, fa), true);
  // ohne (A, E): von Hand gechast, keine Zeile nur aus a-Symbolen
  assert.equal(verlustfrei([['A', 'D'], ['A', 'B'], ['B', 'E'], ['C', 'D', 'E']], r, fa), false);
  // drei Tabellen, keine zwei davon allein verlustfrei verbindbar, zusammen schon
  const fa2 = [{ links: ['A'], rechts: ['B'] }, { links: ['C'], rechts: ['D'] }];
  assert.equal(verlustfrei([['A', 'B'], ['C', 'D'], ['A', 'C']], ['A', 'B', 'C', 'D'], fa2), true);
  assert.equal(verlustfrei([['A', 'B'], ['C', 'D']], ['A', 'B', 'C', 'D'], fa2), false);
  assert.equal(verlustfrei([['A', 'B'], ['A', 'C', 'D']], ['A', 'B', 'C', 'D'], fa2), true);
});

test('pruefeZerlegung: TuS-Musterzerlegung ist gelöst', () => {
  const erg = pruefeZerlegung(tusMuster(), TUS);
  assert.equal(erg.geloest, true, JSON.stringify(erg, null, 1));
  assert.equal(erg.verlustfrei, true);
  assert.equal(erg.redundanzfrei, true);
  assert.equal(erg.vollstaendig, true);
  assert.equal(erg.tabellen.length, 6);
  assert.ok(erg.tabellen.every((t) => t.ok && t.hinweise.length === 0));
  assert.deepEqual(erg.hinweise, []);
});

test('pruefeZerlegung: Trainer und Halle als Text in Abteilung → nicht redundanzfrei', () => {
  const z = tusMuster();
  z.tabellen.splice(2, 3, T(['Abteilung'], ['Trainer', 'TrainerTelefon', 'Halle', 'HallenAdresse']));
  const erg = pruefeZerlegung(z, TUS);
  assert.equal(erg.geloest, false);
  assert.equal(erg.verlustfrei, true);
  assert.equal(erg.redundanzfrei, false);
  const t = erg.tabellen[2];
  assert.equal(t.ok, false);
  const texte = t.hinweise.filter((h) => h.code === 'REDUNDANZ').map((h) => h.text);
  assert.deepEqual(texte.sort(), [
    'HallenAdresse hängt von Halle ab, nicht vom Schlüssel (Abteilung) – Redundanz bleibt.',
    'TrainerTelefon hängt von Trainer ab, nicht vom Schlüssel (Abteilung) – Redundanz bleibt.',
  ]);
});

test('pruefeZerlegung: fehlende Mitgliedschaft → nicht verlustfrei und Spalte fehlt', () => {
  const z = tusMuster();
  z.tabellen.pop();
  const erg = pruefeZerlegung(z, TUS);
  assert.equal(erg.geloest, false);
  assert.equal(erg.verlustfrei, false);
  assert.equal(erg.vollstaendig, false);
  assert.equal(erg.redundanzfrei, true);
  assert.ok(erg.hinweise.some((h) => h.code === 'SPALTE_FEHLT' && /Seit/.test(h.text)));
  const verlust = erg.hinweise.find((h) => h.code === 'NICHT_VERLUSTFREI');
  assert.match(verlust.text, /^Die Tabellen lassen sich nicht verlustfrei verbinden/);
  // Mitgliedschaft ohne Seit, Seit in Mitglied: Schlüssel von Mitglied bestimmt Seit nicht
  const z2 = tusMuster();
  z2.tabellen[0].attribute.push('Seit');
  z2.tabellen[5] = T(['MitgliedNr', 'Abteilung']);
  const erg2 = pruefeZerlegung(z2, TUS);
  assert.equal(erg2.geloest, false);
  assert.ok(erg2.tabellen[0].hinweise.some((h) => h.code === 'SCHLUESSEL_NICHT_EINDEUTIG'));
});

test('pruefeZerlegung: Schlüssel fehlt, nicht eindeutig, nicht minimal; Teilabhängigkeit', () => {
  const z = tusMuster();
  z.tabellen[0].schluessel = ['MitgliedNr', 'Vorname'];
  z.tabellen[1].schluessel = [];
  z.tabellen[2].schluessel = ['Trainer'];
  const erg = pruefeZerlegung(z, TUS);
  assert.equal(erg.geloest, false);
  assert.equal(erg.verlustfrei, true);
  const nichtMinimal = erg.tabellen[0].hinweise.find((h) => h.code === 'SCHLUESSEL_NICHT_MINIMAL');
  assert.match(nichtMinimal.text, /nicht minimal/);
  assert.match(nichtMinimal.text, /MitgliedNr/);
  assert.ok(erg.tabellen[1].hinweise.some((h) => h.code === 'SCHLUESSEL_FEHLT'));
  assert.ok(erg.tabellen[2].hinweise.some((h) => h.code === 'SCHLUESSEL_NICHT_EINDEUTIG'));
  // Teilabhängigkeit vom Schlüssel
  const z2 = tusMuster();
  z2.tabellen[5].attribute.push('Vorname');
  const erg2 = pruefeZerlegung(z2, TUS);
  assert.equal(erg2.redundanzfrei, false);
  assert.deepEqual(erg2.tabellen[5].hinweise.map((h) => h.text),
    ['Vorname hängt von MitgliedNr ab, nicht vom ganzen Schlüssel (MitgliedNr, Abteilung) – Redundanz bleibt.']);
  // ohne gültigen Schülerschlüssel nennt der Satz keinen Schlüssel
  const z3 = tusMuster();
  z3.tabellen.splice(2, 3, { attribute: ['Abteilung', 'Trainer', 'TrainerTelefon', 'Halle', 'HallenAdresse'], schluessel: [] });
  const erg3 = pruefeZerlegung(z3, TUS);
  assert.ok(erg3.tabellen[2].hinweise.some((h) => h.text === 'TrainerTelefon hängt von Trainer ab, nicht vom Schlüssel der Tabelle – Redundanz bleibt.'));
});

test('pruefeZerlegung: Teilzerlegung A4-E2-06 (Abteilung, Trainer, TrainerTelefon, Halle, HallenAdresse)', () => {
  const muster = { tabellen: [T(['Abteilung'], ['Trainer', 'Halle']), T(['Trainer'], ['TrainerTelefon']), T(['Halle'], ['HallenAdresse'])] };
  assert.equal(pruefeZerlegung(muster, A4_E2_06).geloest, true);
  const eine = pruefeZerlegung({ tabellen: [T(['Abteilung'], ['Trainer', 'TrainerTelefon', 'Halle', 'HallenAdresse'])] }, A4_E2_06);
  assert.equal(eine.geloest, false);
  assert.equal(eine.verlustfrei, true);
  assert.equal(eine.tabellen[0].hinweise.filter((h) => h.code === 'REDUNDANZ').length, 2);
  const halb = pruefeZerlegung({ tabellen: [T(['Abteilung'], ['Trainer', 'Halle', 'HallenAdresse']), T(['Trainer'], ['TrainerTelefon'])] }, A4_E2_06);
  assert.equal(halb.geloest, false);
  assert.deepEqual(halb.tabellen[0].hinweise.map((h) => h.text),
    ['HallenAdresse hängt von Halle ab, nicht vom Schlüssel (Abteilung) – Redundanz bleibt.']);
  assert.equal(halb.tabellen[1].ok, true);
  // Halle ohne Verbindung zur Abteilung → nicht verlustfrei, Hinweis nennt die Tabellen
  const getrennt = pruefeZerlegung({ tabellen: [T(['Abteilung'], ['Trainer']), T(['Trainer'], ['TrainerTelefon']), T(['Halle'], ['HallenAdresse'])] }, A4_E2_06);
  assert.equal(getrennt.verlustfrei, false);
  const h = getrennt.hinweise.find((x) => x.code === 'NICHT_VERLUSTFREI');
  assert.match(h.text, /Tabelle 3/);
});

test('pruefeZerlegung: Musikschule (V4)', () => {
  assert.equal(pruefeZerlegung(musikschuleMuster(), MUSIKSCHULE).geloest, true);
  const ohneBelegt = musikschuleMuster();
  ohneBelegt.tabellen.pop();
  const erg = pruefeZerlegung(ohneBelegt, MUSIKSCHULE);
  assert.equal(erg.verlustfrei, false);
  assert.ok(erg.hinweise.some((h) => h.code === 'SPALTE_FEHLT' && /Instrument/.test(h.text)));
  const etage = musikschuleMuster();
  etage.tabellen.splice(2, 2, T(['LehrkraftNr'], ['LehrkraftName', 'Telefon', 'Raum', 'Etage']));
  const erg2 = pruefeZerlegung(etage, MUSIKSCHULE);
  assert.equal(erg2.redundanzfrei, false);
  assert.equal(erg2.verlustfrei, true);
  assert.deepEqual(erg2.tabellen[2].hinweise.map((h) => h.text),
    ['Etage hängt von Raum ab, nicht vom Schlüssel (LehrkraftNr) – Redundanz bleibt.']);
  // Instrument bei der Lehrkraft (Instrument ↛ Lehrkraft und umgekehrt) → Schlüssel nicht eindeutig
  const instrument = musikschuleMuster();
  instrument.tabellen[2] = T(['LehrkraftNr'], ['LehrkraftName', 'Telefon', 'Raum', 'Instrument']);
  const erg3 = pruefeZerlegung(instrument, MUSIKSCHULE);
  assert.ok(erg3.tabellen[2].hinweise.some((h) => h.code === 'SCHLUESSEL_NICHT_EINDEUTIG'));
});

test('pruefeZerlegung: unbekannte Spalte, doppelte Daten, leere Tabelle, Unsinn', () => {
  const z = tusMuster();
  z.tabellen[1].attribute.push('Lieblingsfarbe');
  const erg = pruefeZerlegung(z, TUS);
  assert.equal(erg.geloest, false);
  assert.ok(erg.tabellen[1].hinweise.some((h) => h.code === 'SPALTE_UNBEKANNT'));
  // Teilmenge einer anderen Tabelle mit Nichtschlüssel-Spalte: doppelte Daten
  const z2 = tusMuster();
  z2.tabellen.push(T(['Abteilung'], ['Trainer']));
  const erg2 = pruefeZerlegung(z2, TUS);
  assert.equal(erg2.redundanzfrei, false);
  assert.ok(erg2.tabellen[6].hinweise.some((h) => h.code === 'TABELLE_DOPPELT'));
  // reine Schlüsseltabelle als Teilmenge ist erlaubt
  const z3 = musikschuleMuster();
  z3.tabellen.push(T(['Instrument']));
  assert.equal(pruefeZerlegung(z3, MUSIKSCHULE).geloest, true);
  // leere Tabellen werden ignoriert
  const z4 = tusMuster();
  z4.tabellen.push({ attribute: [], schluessel: [] });
  assert.equal(pruefeZerlegung(z4, TUS).geloest, true);
  for (const unsinn of [null, 5, 'x', {}, { tabellen: 'x' }, { tabellen: [null, 7, { attribute: 'x' }, { attribute: [3, null], schluessel: 'y' }] }]) {
    const e = pruefeZerlegung(unsinn, TUS);
    assert.equal(e.geloest, false);
    assert.ok(Array.isArray(e.tabellen));
  }
  assert.equal(pruefeZerlegung(tusMuster(), null).geloest, false);
});

test('pruefeZerlegung: Texte nennen nur Spalten der Aufgabe', () => {
  const z = tusMuster();
  z.tabellen.splice(2, 3, T(['Trainer'], ['Abteilung', 'TrainerTelefon', 'Halle', 'HallenAdresse']));
  z.tabellen[0].schluessel = ['MitgliedNr', 'Nachname'];
  const erg = pruefeZerlegung(z, TUS);
  const erlaubt = new Set(TUS.attribute);
  for (const h of [...erg.hinweise, ...erg.tabellen.flatMap((t) => t.hinweise)]) {
    for (const wort of h.text.match(/[A-Z][A-Za-z]*[a-z][A-Z][A-Za-z]*/g) || []) {
      assert.ok(erlaubt.has(wort), `„${h.text}“ nennt „${wort}“`);
    }
  }
});

/* ---------- BCNF-Zerlegung (Musterantwort von `zerlegen` ohne Musterzerlegung, Phase 5 Task 2) ---------- */

test('bcnfZerlegung: TuS, Musikschule, Teilzerlegung A4-E2-06 und Lehrbuchfall sind gelöst', () => {
  for (const [name, aufgabe] of [['TuS', TUS], ['Musikschule', MUSIKSCHULE], ['A4-E2-06', A4_E2_06]]) {
    const tabellen = bcnfZerlegung(aufgabe.attribute, aufgabe.fa);
    const erg = pruefeZerlegung({ tabellen }, aufgabe);
    assert.equal(erg.geloest, true, `${name}: ${JSON.stringify(erg)}`);
    for (const t of tabellen) for (const a of t.attribute) assert.ok(aufgabe.attribute.includes(a), name);
  }
  // Schlüssel der Musikschule-Verbindungstabelle ist dreiteilig
  const ms = bcnfZerlegung(MUSIKSCHULE.attribute, MUSIKSCHULE.fa);
  assert.ok(ms.some((t) => menge(t.schluessel).join() === menge(['SchuelerNr', 'Instrument', 'LehrkraftNr']).join()));
  // ohne FAs: eine Tabelle, Schlüssel = alle Spalten
  assert.deepEqual(bcnfZerlegung(['A', 'B'], []), [{ attribute: ['A', 'B'], schluessel: ['A', 'B'] }]);
  assert.deepEqual(bcnfZerlegung([], TUS.fa), []);
  // schon in BCNF: unverändert
  assert.deepEqual(bcnfZerlegung(['Trainer', 'TrainerTelefon'], TUS.fa), [{ attribute: ['Trainer', 'TrainerTelefon'], schluessel: ['Trainer'] }]);
});

test('Musikschule: FA-JSON aus seed/datenbanken/verhoer/musikschule/LIESMICH.md und dortige Musterzerlegung sind gelöst', () => {
  const text = fs.readFileSync(path.join(__dirname, '..', 'seed', 'datenbanken', 'verhoer', 'musikschule', 'LIESMICH.md'), 'utf8');
  const block = /Maschinenlesbar für `zerlegen`[\s\S]*?```json\n([\s\S]*?)```/.exec(text);
  assert.ok(block, 'FA-JSON in der LIESMICH gefunden');
  const loesung = JSON.parse(block[1]);
  assert.deepEqual(schluesselKandidaten(loesung.attribute, loesung.fa), [loesung.schluessel]);
  // Musterzerlegung laut LIESMICH (Schueler, Tarif, Lehrkraft, Raum, belegt)
  const muster = {
    tabellen: [
      T(['SchuelerNr'], ['Vorname', 'Nachname', 'Geburtsjahr', 'Tarif']),
      T(['Tarif'], ['Monatsgebuehr']),
      T(['LehrkraftNr'], ['Lehrkraft', 'LehrkraftTelefon', 'Raum']),
      T(['Raum'], ['Etage']),
      T(['SchuelerNr', 'Instrument', 'LehrkraftNr'])
    ]
  };
  const erg = pruefeZerlegung(muster, loesung);
  assert.equal(erg.geloest, true, JSON.stringify(erg));
  // typische Zwischenlösung LehrkraftRaum: F4 verletzt, Hinweis nennt Raum und Etage
  const zwischen = structuredClone(muster);
  zwischen.tabellen.splice(2, 2, T(['LehrkraftNr'], ['Lehrkraft', 'LehrkraftTelefon', 'Raum', 'Etage']));
  const z = pruefeZerlegung(zwischen, loesung);
  assert.equal(z.geloest, false);
  assert.equal(z.redundanzfrei, false);
  assert.ok(z.tabellen[2].hinweise.some((h) => h.code === 'REDUNDANZ' && /Etage/.test(h.text) && /Raum/.test(h.text)));
  assert.equal(pruefeZerlegung({ tabellen: bcnfZerlegung(loesung.attribute, loesung.fa) }, loesung).geloest, true);
});
