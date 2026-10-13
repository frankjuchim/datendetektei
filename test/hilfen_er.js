'use strict';
// Test-Helfer für den Modellierungs-Kern (src/er): kompakte Schreibweise für ER-Graphen und Relationenschemata
// sowie die Referenzlösungen Detektei (seed/datenbanken/detektei/LIESMICH.md) und Kletterhalle (VERHOER_KONTEXTE V5).

/** '_Nr Name' → [{ name:'Nr', schluessel:true }, { name:'Name', schluessel:false }] */
function attribute(text) {
  if (!text) return [];
  return text.trim().split(/\s+/).map((a) => (a.startsWith('_') ? { name: a.slice(1), schluessel: true } : { name: a, schluessel: false }));
}

/**
 * graph(praefix, entitaeten, beziehungen)
 *   entitaeten  = [[name, 'attribute'], …]           (Id = praefix + name)
 *   beziehungen = [[name, 'Ent:kard[:rolle] …', 'attribute'?], …]
 */
function graph(praefix, entitaeten, beziehungen = []) {
  const id = (n) => praefix + n;
  return {
    entitaeten: entitaeten.map(([name, attr]) => ({ id: id(name), name, attribute: attribute(attr) })),
    beziehungen: beziehungen.map(([name, enden, attr], i) => ({
      id: praefix + 'B' + i,
      name,
      enden: enden.trim().split(/\s+/).map((e) => {
        const [ent, kard, rolle] = e.split(':');
        return rolle ? { entitaet: id(ent), kard, rolle } : { entitaet: id(ent), kard };
      }),
      attribute: attribute(attr),
    })),
  };
}

const DETEKTEI_ENTITAETEN = [
  ['Ermittler', '_ErmittlerNr Name Dienstgrad'],
  ['Fall', '_FallNr Titel Eroeffnet Status'],
  ['Person', '_PersonNr Vorname Nachname Jahrgang Stadtteil'],
  ['Ort', '_OrtNr Bezeichnung Stadtteil'],
  ['Beweisstueck', '_BeweisNr Bezeichnung'],
];
const DETEKTEI_BEZIEHUNGEN = [
  ['betreut', 'Ermittler:1:Mentor Ermittler:n:Betreuter'],
  ['leitet', 'Ermittler:1 Fall:n'],
  ['kennt', 'Person:n Person:m', 'Seit'],
  ['verdaechtig', 'Person:n Fall:m', 'Grad'],
  ['sagtAus', 'Person:m Fall:n Ort:p', 'Zeitpunkt Inhalt'],
  ['gehoertZu', 'Fall:1 Beweisstueck:n'],
  ['gefundenAn', 'Ort:1 Beweisstueck:n'],
];
/** ER-Referenzlösung der Detektei (frische Kopie je Aufruf). */
function detektei(praefix = 'm_') {
  return graph(praefix, DETEKTEI_ENTITAETEN, DETEKTEI_BEZIEHUNGEN);
}

const KLETTERHALLE_ENTITAETEN = [
  ['Mitglied', '_MitgliedsNr Name Jahrgang'],
  ['Wand', '_WandNr Bereich'],
  ['Route', '_RoutenNr Name Schwierigkeit'],
  ['Routenbauer', '_BauerNr Name'],
  ['Kurs', '_KursNr Titel Termin'],
  ['Wettkampf', '_WettkampfNr Titel Datum'],
];
const KLETTERHALLE_BEZIEHUNGEN = [
  ['hat', 'Wand:1 Route:n'],
  ['schraubt', 'Routenbauer:1 Route:n'],
  ['begeht', 'Mitglied:n Route:m', 'Datum Erfolg'],
  ['sichert', 'Mitglied:n:Sichernder Mitglied:m:Kletternder'],
  ['leitet', 'Mitglied:1 Kurs:n'],
  ['besucht', 'Mitglied:n Kurs:m'],
  ['wertet', 'Mitglied:m Route:n Wettkampf:p', 'Punkte'],
];
/** Muster-ER der Kletterhalle (V5). */
function kletterhalle(praefix = 'm_') {
  return graph(praefix, KLETTERHALLE_ENTITAETEN, KLETTERHALLE_BEZIEHUNGEN);
}

/** Alle Namen eines Graphen (Entitätstypen, Beziehungstypen, Attribute, Rollen). */
function namenImGraph(g) {
  const namen = [];
  for (const e of g.entitaeten || []) {
    namen.push(e.name);
    for (const a of e.attribute || []) namen.push(a.name);
  }
  for (const b of g.beziehungen || []) {
    namen.push(b.name);
    for (const a of b.attribute || []) namen.push(a.name);
    for (const e of b.enden || []) if (e.rolle) namen.push(e.rolle);
  }
  return namen.filter(Boolean);
}

/** Alle Texte eines Abgleich-Ergebnisses (Kriterien und Teile). */
function texteVon(ergebnis) {
  const texte = [];
  for (const k of ergebnis.kriterien || []) {
    texte.push(k.text);
    for (const t of k.teile || []) texte.push(t.text);
  }
  return texte;
}

/**
 * relationen('Ermittler(_ErmittlerNr, Name, ^MentorNr>Ermittler); kennt(_^PersonNr>Person, _^BekannterNr>Person, Seit)')
 * '_' = Primärschlüssel, '^' = Fremdschlüssel, '>Ziel' = Zielrelation (ohne Ziel: fk: true).
 */
function relationen(text) {
  return text
    .split(';')
    .map((r) => r.trim())
    .filter(Boolean)
    .map((r) => {
      const m = /^(\w+)\s*\((.*)\)$/.exec(r);
      if (!m) throw new Error('Relation unlesbar: ' + r);
      const attribute = m[2]
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean)
        .map((a) => {
          let pk = false;
          let fk = null;
          if (a.startsWith('_')) { pk = true; a = a.slice(1); }
          if (a.startsWith('^')) {
            a = a.slice(1);
            const [n, ziel] = a.split('>');
            a = n;
            fk = ziel || true;
          }
          const attr = { name: a };
          if (pk) attr.pk = true;
          if (fk) attr.fk = fk;
          return attr;
        });
      return { name: m[1], attribute };
    });
}

const DETEKTEI_SCHEMA_TEXT =
  'Ermittler(_ErmittlerNr, Name, Dienstgrad, ^MentorNr>Ermittler);' +
  'Fall(_FallNr, Titel, Eroeffnet, Status, ^LeiterNr>Ermittler);' +
  'Person(_PersonNr, Vorname, Nachname, Jahrgang, Stadtteil);' +
  'kennt(_^PersonNr>Person, _^BekannterNr>Person, Seit);' +
  'verdaechtig(_^PersonNr>Person, _^FallNr>Fall, Grad);' +
  'Ort(_OrtNr, Bezeichnung, Stadtteil);' +
  'Aussage(_^PersonNr>Person, _^FallNr>Fall, _^OrtNr>Ort, _Zeitpunkt, Inhalt);' +
  'Beweisstueck(_BeweisNr, Bezeichnung, ^FallNr>Fall, ^OrtNr>Ort)';

const KLETTERHALLE_SCHEMA_TEXT =
  'Mitglied(_MitgliedsNr, Name, Jahrgang);' +
  'Wand(_WandNr, Bereich);' +
  'Routenbauer(_BauerNr, Name);' +
  'Route(_RoutenNr, Name, Schwierigkeit, ^WandNr>Wand, ^BauerNr>Routenbauer);' +
  'begeht(_^MitgliedsNr>Mitglied, _^RoutenNr>Route, _Datum, Erfolg);' +
  'sichert(_^SichererNr>Mitglied, _^KlettererNr>Mitglied);' +
  'Kurs(_KursNr, Titel, Termin, ^LeiterNr>Mitglied);' +
  'besucht(_^MitgliedsNr>Mitglied, _^KursNr>Kurs);' +
  'Wettkampf(_WettkampfNr, Titel, Datum);' +
  'Wertung(_^MitgliedsNr>Mitglied, _^RoutenNr>Route, _^WettkampfNr>Wettkampf, Punkte)';

/** TuS-FA-Liste (seed/datenbanken/tus/LIESMICH.md, maschinenlesbar). */
const TUS = {
  attribute: ['MitgliedNr', 'Vorname', 'Nachname', 'Geburtsjahr', 'Beitragsgruppe', 'Monatsbeitrag', 'Eintritt',
    'Abteilung', 'Seit', 'Trainer', 'TrainerTelefon', 'Halle', 'HallenAdresse'],
  fa: [
    { links: ['MitgliedNr'], rechts: ['Vorname', 'Nachname', 'Geburtsjahr', 'Beitragsgruppe', 'Eintritt'] },
    { links: ['Beitragsgruppe'], rechts: ['Monatsbeitrag'] },
    { links: ['Abteilung'], rechts: ['Trainer', 'Halle'] },
    { links: ['Trainer'], rechts: ['TrainerTelefon'] },
    { links: ['Halle'], rechts: ['HallenAdresse'] },
    { links: ['MitgliedNr', 'Abteilung'], rechts: ['Seit'] },
  ],
  schluessel: ['MitgliedNr', 'Abteilung'],
};

module.exports = {
  attribute, graph, detektei, kletterhalle, namenImGraph, texteVon, relationen,
  DETEKTEI_ENTITAETEN, DETEKTEI_BEZIEHUNGEN, KLETTERHALLE_ENTITAETEN, KLETTERHALLE_BEZIEHUNGEN,
  DETEKTEI_SCHEMA_TEXT, KLETTERHALLE_SCHEMA_TEXT, TUS,
};
