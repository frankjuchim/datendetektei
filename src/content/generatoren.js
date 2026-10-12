'use strict';
// Generatoren des Trainingsplatzes (Spec §7.8, Plan Phase 3 Task 8; Muster Algo Quest src/content/generators.js).
// Deterministisch aus einem 32-Bit-Seed: gleicher Seed → gleiche Aufgabe. Die Aufgabe wird nie gespeichert; der Server
// erzeugt sie zum Prüfen aus dem (signierten) Seed neu (src/services/training.js).
//
//   T1  Ergebnis vorhersagen: WHERE / ORDER BY / LIMIT auf einer kleinen Zufallstabelle   (Interaktion ergebnis)
//   T2  GROUP-BY-Ergebnis mit COUNT/SUM vorhersagen, optional WHERE und HAVING            (Interaktion ergebnis)
//   T3  Zeilenzahl von Kreuzprodukt und Verbund (auch mit Zusatzbedingung, NULL im FK)  (Interaktion gaps, zahl)
//
// Ausgabe im Aufgabenformat (docs/AUFGABENFORMAT.md): { id, typ, seed, titel, kategorie, kompetenz, falle, inhalt,
// interaktion, loesung, erklaerung } – prüfbar mit src/content/pruefer.js. Das Ergebnis wird mit better-sqlite3 in
// einer :memory:-DB berechnet (nie von Hand). SQL im Abi-Stil (EH §8): Schlüsselwörter groß, je Klausel eine Zeile,
// Verbund nur implizit, `!=`, Text in '…', kein Alias in HAVING. Namen frei erfunden (seed/datenbanken/namen.json,
// ohne reservierte Story-Namen, nur ASCII – damit ORDER BY wie im Alphabet sortiert).

const Database = require('better-sqlite3');
const { erzeugeZufall } = require('./zufall');
const namenDatei = require('../../seed/datenbanken/namen.json');

/** Vornamen von Story-Figuren (Spoiler-Schutz) – nie in Trainingstabellen. */
const RESERVIERTE_VORNAMEN = ['Merle', 'Nora', 'Tamara', 'Ole', 'Selin'];
const reserviert = (w) => RESERVIERTE_VORNAMEN.includes(w) || namenDatei.reservierteNachnamen.some((n) => w.includes(n));
const VORNAMEN = namenDatei.vornamen.filter((v) => /^[A-Za-z]+$/.test(v) && !reserviert(v));
const STADTTEILE = Object.keys(namenDatei.strassen).filter((s) => !reserviert(s));
const BEZEICHNUNGEN = [
  'Notizbuch', 'Taschenlampe', 'Regenschirm', 'Fahrkarte', 'Handschuh', 'Feuerzeug', 'Brille', 'Armbanduhr',
  'Kamera', 'Rucksack', 'Ausweis', 'Postkarte', 'Kugelschreiber', 'Thermoskanne', 'Zollstock', 'Halstuch'
];
const TEAMS = ['Kranich', 'Reiher', 'Kormoran', 'Austernfischer', 'Seeschwalbe', 'Brachvogel'];

const GENERATOREN = Object.freeze([
  Object.freeze({ typ: 'T1', titel: 'Ergebnis vorhersagen', beschreibung: 'Welche Zeilen liefert eine Abfrage mit WHERE, ORDER BY und LIMIT?' }),
  Object.freeze({ typ: 'T2', titel: 'Gruppen auszählen', beschreibung: 'Sage das Ergebnis einer Abfrage mit GROUP BY, COUNT/SUM und HAVING voraus.' }),
  Object.freeze({ typ: 'T3', titel: 'Zeilen zählen', beschreibung: 'Wie viele Zeilen liefern Kreuzprodukt und Verbund zweier Tabellen?' })
]);

const txt = (md) => ({ t: 'text', md });
const sqlBlock = (sql) => ({ t: 'sql', sql, nummern: false });
const literal = (w) => (typeof w === 'number' ? String(w) : `'${w}'`);

/* ---------- SQLite ---------- */

/**
 * Tabellen in einer :memory:-DB anlegen und Abfragen ausführen.
 * tabellen: [{ name, spalten: [{ name, zahl?, pk?, fk? }], zeilen }]; abfragen: [sql] → [{ spalten, zeilen }].
 */
function fuehreAus(tabellen, abfragen) {
  const db = new Database(':memory:');
  try {
    for (const t of tabellen) {
      db.exec(`CREATE TABLE ${t.name} (${t.spalten.map((s) => `${s.name} ${s.zahl ? 'INTEGER' : 'TEXT'}`).join(', ')})`);
      const ins = db.prepare(`INSERT INTO ${t.name} VALUES (${t.spalten.map(() => '?').join(', ')})`);
      for (const z of t.zeilen) ins.run(...z);
    }
    return abfragen.map((sql) => {
      const st = db.prepare(sql);
      return { spalten: st.columns().map((c) => c.name), zeilen: st.raw().all() };
    });
  } finally {
    db.close();
  }
}

/** dbtabelle-Block aus einer Tabellenbeschreibung. */
function dbtabelle(t) {
  return {
    t: 'dbtabelle',
    tabelle: t.name,
    kopf: t.spalten.map((s) => ({ name: s.name, ...(s.pk ? { pk: true } : {}), ...(s.fk ? { fk: s.fk } : {}) })),
    zeilen: t.zeilen.map((z) => [...z])
  };
}

/** Bis zu 200 Kandidaten aus derselben Zufallsfolge ziehen, bis einer die Vorgaben erfüllt (deterministisch). */
function versuche(z, versuch) {
  for (let i = 0; i < 200; i++) {
    const e = versuch(z);
    if (e) return e;
  }
  throw new Error('Generator: keine passende Aufgabe gefunden.');
}

const zahlwort = (n, eins, mehr) => `${n} ${n === 1 ? eins : mehr}`;

/* ---------- T1: Ergebnis vorhersagen ---------- */

const T1_THEMEN = [
  {
    tabelle: 'Zeuge',
    id: 'ZeugeID',
    name: 'Vorname',
    kat: 'Stadtteil',
    zahl: 'Jahrgang',
    namen: () => VORNAMEN,
    kategorien: () => STADTTEILE,
    zahlen: (z, n) => z.verschiedene(n, 1950, 2008)
  },
  {
    tabelle: 'Beweis',
    id: 'BeweisNr',
    name: 'Bezeichnung',
    kat: 'Fundort',
    zahl: 'Wert',
    namen: () => BEZEICHNUNGEN,
    kategorien: () => STADTTEILE,
    zahlen: (z, n) => z.verschiedene(n, 1, 60).map((w) => w * 5)
  }
];

function t1Kandidat(z) {
  const th = z.waehle(T1_THEMEN);
  const n = z.ganz(6, 8);
  const start = z.waehle([1, 1, 11, 101]);
  const namen = z.stichprobe(th.namen(), n);
  const kats = z.stichprobe(th.kategorien(), 3);
  const zahlen = th.zahlen(z, n);
  const zeilen = namen.map((nm, i) => [start + i, nm, z.waehle(kats), zahlen[i]]);
  const tab = {
    name: th.tabelle,
    spalten: [{ name: th.id, zahl: true, pk: true }, { name: th.name }, { name: th.kat }, { name: th.zahl, zahl: true }],
    zeilen
  };

  const wertAus = () => z.waehle(zahlen);
  const k1 = z.waehle(kats);
  const k2 = z.waehle(kats.filter((k) => k !== k1));
  const op = () => z.waehle(['>', '>=', '<', '<=']);
  const art = z.waehle(['vergleich', 'gleich', 'ungleich', 'und', 'oder', 'oderVergleich', 'like', 'between']);
  let where;
  switch (art) {
    case 'vergleich':
      where = `${th.zahl} ${op()} ${wertAus()}`;
      break;
    case 'gleich':
      where = `${th.kat} = '${k1}'`;
      break;
    case 'ungleich':
      where = `${th.kat} != '${k1}'`;
      break;
    case 'und':
      where = `${th.kat} = '${k1}' AND ${th.zahl} ${op()} ${wertAus()}`;
      break;
    case 'oder':
      where = `${th.kat} = '${k1}' OR ${th.kat} = '${k2}'`;
      break;
    case 'oderVergleich':
      where = `${th.kat} = '${k1}' OR ${th.zahl} ${op()} ${wertAus()}`;
      break;
    case 'like':
      where = `${th.name} LIKE '${z.waehle(namen)[0]}%'`;
      break;
    default: {
      const [a, b] = z.stichprobe(zahlen, 2).sort((x, y) => x - y);
      where = `${th.zahl} BETWEEN ${a} AND ${b}`;
    }
  }
  const auswahl = z.waehle([[th.name], [th.name, th.zahl], [th.name, th.kat], [th.kat, th.name], [th.id, th.name]]);
  const sortiert = z.ja(0.6);
  const sortSpalte = z.waehle([th.zahl, th.zahl, th.name]);
  const richtung = z.waehle(['', ' DESC', ' ASC']);
  const ordnung = sortiert ? `${sortSpalte}${richtung}` : null;

  const basis = `FROM ${tab.name}\nWHERE ${where}`;
  const [gefiltert] = fuehreAus([tab], [`SELECT *\n${basis}`]);
  const m = gefiltert.zeilen.length;
  if (m < 1 || m > 6) return null;
  const limit = sortiert && m >= 3 && z.ja(0.5) ? z.ganz(1, Math.min(3, m - 1)) : null;
  const sql = [`SELECT ${auswahl.join(', ')}`, `FROM ${tab.name}`, `WHERE ${where}`]
    .concat(ordnung ? [`ORDER BY ${ordnung}`] : [])
    .concat(limit ? [`LIMIT ${limit}`] : [])
    .join('\n');
  const [erg] = fuehreAus([tab], [sql]);
  if (erg.zeilen.length < 1 || erg.zeilen.length > 5) return null;

  const erkl = [`Die Bedingung \`${where}\` trifft auf ${zahlwort(m, 'Zeile', 'Zeilen')} von ${n} zu.`];
  if (ordnung) erkl.push(`\`ORDER BY ${ordnung}\` sortiert ${richtung === ' DESC' ? 'absteigend' : 'aufsteigend'} nach ${sortSpalte}.`);
  if (limit) erkl.push(`\`LIMIT ${limit}\` behält nur die ersten ${limit} Zeilen der sortierten Liste.`);
  else if (!ordnung) erkl.push('Ohne ORDER BY ist die Reihenfolge nicht festgelegt – sie zählt hier nicht.');
  erkl.push(auswahl.length === 1 ? `Ausgegeben wird nur die Spalte ${auswahl[0]}.` : `Ausgegeben werden nur die Spalten ${auswahl.join(', ')}.`);

  return {
    titel: 'Ergebnis vorhersagen',
    kategorie: 'SQL eine Tabelle',
    kompetenz: ['DB-K29', 'DB-K17', 'DB-K21', 'DB-K22'],
    falle: ['P6'],
    inhalt: [
      txt(`Die Tabelle ${tab.name} enthält ${n} Datensätze.`),
      dbtabelle(tab),
      sqlBlock(sql),
      txt(ordnung ? 'Trage das Ergebnis der Abfrage **in der richtigen Reihenfolge** ein.' : 'Trage das Ergebnis der Abfrage ein (Reihenfolge egal).')
    ],
    interaktion: { kind: 'ergebnis', kopf: erg.spalten, freieZeilen: true, reihenfolge: !!ordnung },
    loesung: { zeilen: erg.zeilen },
    erklaerung: [txt(erkl.join(' '))]
  };
}

/* ---------- T2: GROUP-BY-Ergebnis ---------- */

function t2Kandidat(z) {
  const n = z.ganz(7, 10);
  const ermittler = z.stichprobe(VORNAMEN, 3);
  const stadtteile = z.stichprobe(STADTTEILE, 3);
  const zeilen = Array.from({ length: n }, (_, i) => [i + 1, z.waehle(ermittler), z.waehle(stadtteile), z.ganz(1, 8)]);
  const tab = {
    name: 'Einsatz',
    spalten: [{ name: 'EinsatzNr', zahl: true, pk: true }, { name: 'Ermittler' }, { name: 'Stadtteil' }, { name: 'Stunden', zahl: true }],
    zeilen
  };
  const gruppe = z.waehle(['Ermittler', 'Stadtteil']);
  const andere = gruppe === 'Ermittler' ? 'Stadtteil' : 'Ermittler';
  const summe = z.ja(0.5);
  const agg = summe ? 'SUM(Stunden) AS Summe' : 'COUNT(*) AS Anzahl';
  let where = null;
  if (z.ja(0.4)) {
    where = z.ja(0.5) ? `Stunden >= ${z.ganz(2, 6)}` : `${andere} != '${z.waehle(andere === 'Ermittler' ? ermittler : stadtteile)}'`;
  }
  let having = null;
  if (z.ja(0.45)) having = z.ja(0.5) ? `COUNT(*) >= ${z.ganz(2, 3)}` : `SUM(Stunden) > ${z.ganz(5, 14)}`;
  const ordnung = z.ja(0.5) ? gruppe : null;

  const sql = [`SELECT ${gruppe}, ${agg}`, 'FROM Einsatz']
    .concat(where ? [`WHERE ${where}`] : [])
    .concat([`GROUP BY ${gruppe}`])
    .concat(having ? [`HAVING ${having}`] : [])
    .concat(ordnung ? [`ORDER BY ${ordnung}`] : [])
    .join('\n');
  const vorher = [`SELECT *\nFROM Einsatz${where ? `\nWHERE ${where}` : ''}`, `SELECT ${gruppe}\nFROM Einsatz${where ? `\nWHERE ${where}` : ''}\nGROUP BY ${gruppe}`];
  const [erg, nachWhere, gruppen] = fuehreAus([tab], [sql, ...vorher]);
  if (erg.zeilen.length < 1 || erg.zeilen.length > 4) return null;
  if (having && erg.zeilen.length === gruppen.zeilen.length) return null; // HAVING soll etwas bewirken

  const erkl = [];
  if (where) erkl.push(`WHERE wirkt **vor** dem Gruppieren: Von ${n} Zeilen bleiben ${nachWhere.zeilen.length}.`);
  erkl.push(`GROUP BY ${gruppe} bildet ${zahlwort(gruppen.zeilen.length, 'Gruppe', 'Gruppen')}; je Gruppe ${summe ? 'werden die Stunden addiert (SUM)' : 'werden die Zeilen gezählt (COUNT)'}.`);
  if (having) erkl.push(`HAVING wirkt **nach** dem Gruppieren und behält ${zahlwort(erg.zeilen.length, 'Gruppe', 'Gruppen')}.`);
  if (!ordnung) erkl.push('Ohne ORDER BY zählt die Reihenfolge nicht.');

  return {
    titel: 'Gruppen auszählen',
    kategorie: 'SQL Aggregation',
    kompetenz: ['DB-K29', 'DB-K25', 'DB-K26', 'DB-K27'],
    falle: ['P1', 'P4'],
    inhalt: [
      txt(`Die Tabelle Einsatz hält fest, wer wie viele Stunden in welchem Stadtteil ermittelt hat (${n} Datensätze).`),
      dbtabelle(tab),
      sqlBlock(sql),
      txt(ordnung ? 'Trage das Ergebnis **in der richtigen Reihenfolge** ein.' : 'Trage das Ergebnis ein (Reihenfolge egal).')
    ],
    interaktion: { kind: 'ergebnis', kopf: erg.spalten, freieZeilen: true, reihenfolge: !!ordnung },
    loesung: { zeilen: erg.zeilen },
    erklaerung: [txt(erkl.join(' '))]
  };
}

/* ---------- T3: Kreuzprodukt und Verbund ---------- */

const T3_THEMEN = [
  {
    eltern: { name: 'Team', id: 'TeamID', text: 'Name', werte: () => TEAMS },
    kind: { name: 'Ermittler', id: 'ErmittlerID', text: 'Vorname', werte: () => VORNAMEN }
  },
  {
    eltern: { name: 'Revier', id: 'RevierID', text: 'Stadtteil', werte: () => STADTTEILE },
    kind: { name: 'Zeuge', id: 'ZeugeID', text: 'Vorname', werte: () => VORNAMEN }
  }
];

function t3Kandidat(z) {
  const th = z.waehle(T3_THEMEN);
  const e = th.eltern;
  const k = th.kind;
  const m = z.ganz(2, 4);
  const n = z.ganz(3, 6);
  const elternIds = Array.from({ length: m }, (_, i) => i + 1);
  const elternTexte = z.stichprobe(e.werte(), m);
  const mitNull = z.ja(0.3);
  const kindZeilen = z.stichprobe(k.werte(), n).map((t, i) => [i + 1, t, mitNull && i === n - 1 ? null : z.waehle(elternIds)]);
  const eltern = {
    name: e.name,
    spalten: [{ name: e.id, zahl: true, pk: true }, { name: e.text }],
    zeilen: elternIds.map((id, i) => [id, elternTexte[i]])
  };
  const kind = {
    name: k.name,
    spalten: [{ name: k.id, zahl: true, pk: true }, { name: k.text }, { name: e.id, zahl: true, fk: e.name }],
    zeilen: kindZeilen.map((r) => [...r])
  };
  const [a, b] = z.ja(0.5) ? [kind, eltern] : [eltern, kind];
  const kreuz = `SELECT *\nFROM ${a.name}, ${b.name}`;
  let bedingung = `${k.name}.${e.id} = ${e.name}.${e.id}`;
  let zusatz = null;
  if (z.ja(0.4)) {
    zusatz = `${e.name}.${e.text} = '${z.waehle(elternTexte)}'`;
    bedingung += ` AND ${zusatz}`;
  }
  const verbund = `${kreuz}\nWHERE ${bedingung}`;
  const [x, y] = fuehreAus([eltern, kind], [kreuz, verbund]).map((r) => r.zeilen.length);

  const erkl = [`Kreuzprodukt: jede der ${n} Zeilen von ${k.name} mit jeder der ${m} Zeilen von ${e.name} – ${n} · ${m} = ${x} Zeilen.`];
  erkl.push(`Die Verbundbedingung behält nur die Paare, bei denen der Fremdschlüssel ${k.name}.${e.id} auf den Primärschlüssel ${e.name}.${e.id} zeigt.`);
  if (mitNull) erkl.push('Ein NULL im Fremdschlüssel findet keinen Partner – diese Zeile fällt weg.');
  if (zusatz) erkl.push(`Die Zusatzbedingung \`${zusatz}\` filtert weiter.`);
  erkl.push(`Ergebnis: ${zahlwort(y, 'Zeile', 'Zeilen')}.`);

  return {
    titel: 'Zeilen zählen',
    kategorie: 'SQL Verbund',
    kompetenz: ['DB-K29', 'DB-K23'],
    falle: ['P2'],
    inhalt: [
      txt(`Gegeben sind die Tabellen ${a.name} und ${b.name}.`),
      dbtabelle(a),
      dbtabelle(b),
      txt('Abfrage 1:'),
      sqlBlock(kreuz),
      txt('Abfrage 2:'),
      sqlBlock(verbund),
      txt('Abfrage 1 liefert [[g1]] Zeilen, Abfrage 2 liefert [[g2]] Zeilen.')
    ],
    interaktion: { kind: 'gaps', felder: { g1: { typ: 'zahl', breite: 4 }, g2: { typ: 'zahl', breite: 4 } } },
    loesung: { g1: [String(x)], g2: [String(y)] },
    erklaerung: [txt(erkl.join(' '))]
  };
}

/* ---------- Schnittstelle ---------- */

const KANDIDATEN = { T1: t1Kandidat, T2: t2Kandidat, T3: t3Kandidat };

const istTyp = (typ) => Object.prototype.hasOwnProperty.call(KANDIDATEN, typ);

/** Aufgabe eines Typs aus dem Seed (0 … 2^32−1) erzeugen – vollständige, interne Sicht mit Lösung. */
function erzeuge(typ, seed) {
  if (!istTyp(typ)) throw new Error(`Unbekannter Aufgabentyp: ${typ}`);
  const s = Number(seed) >>> 0;
  const a = versuche(erzeugeZufall(s), KANDIDATEN[typ]);
  return { id: `${typ}-${s}`, typ, seed: s, punkte: 1, ...a };
}

/** Öffentliche Sicht (an den Browser): ohne Lösung, Erklärung, Fallen. */
function oeffentlich(a) {
  return {
    typ: a.typ,
    titel: a.titel,
    kategorie: a.kategorie,
    kompetenz: [...a.kompetenz],
    inhalt: structuredClone(a.inhalt),
    interaktion: structuredClone(a.interaktion)
  };
}

module.exports = { GENERATOREN, erzeuge, oeffentlich, istTyp };
