'use strict';
// Generatoren des Trainingsplatzes (Spec §7.8, Plan Phase 3 Task 8; Muster Algo Quest src/content/generators.js).
// Deterministisch aus einem 32-Bit-Seed: gleicher Seed → gleiche Aufgabe. Die Aufgabe wird nie gespeichert; der Server
// erzeugt sie zum Prüfen aus dem (signierten) Seed neu (src/services/training.js).
//
//   T1  Ergebnis vorhersagen: WHERE / ORDER BY / LIMIT auf einer kleinen Zufallstabelle   (Interaktion ergebnis)
//   T2  GROUP-BY-Ergebnis mit COUNT/SUM vorhersagen, optional WHERE und HAVING            (Interaktion ergebnis)
//   T3  Zeilenzahl von Kreuzprodukt und Verbund (auch mit Zusatzbedingung, NULL im FK)  (Interaktion gaps, zahl)
//   T4  Kardinalität aus Beispieldaten (FK-Spalte bzw. Beziehungstabelle) mit Leserichtung (Interaktion choice, nur eA)
//   T5  Schlüsselkandidat: richtig + Ausschnitt-Falle, NULL, nicht minimal, nicht eindeutig   (Interaktion choice)
//   T6  Mini-ER (1:n / n:m, ggf. Beziehungsattribut) → Kurzschreibweise, 4 Vorschläge     (Interaktion choice, nur eA)
//   T7  Anomalieart zu einem Vorgang in Rohliste bzw. anomaliefreier Tabelle            (Interaktion choice)
//
// T4–T7 sind Phase 5 (Plan Task 5): eigene Fantasiekontexte (Hafen, Chor, Sternwarte …), nie aus Lab/AB/Verhör.
// choice-Optionen bekommen ihre Ids erst nach dem Mischen (a, b, c …) – die Id verrät nichts. `niveau: 'eA'` an einem
// Generator blendet ihn in gA-Kursen aus (Spec §3.4: Akte 5 nur eA).
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
  Object.freeze({ typ: 'T1', titel: 'Ergebnis vorhersagen', beschreibung: 'Welche Zeilen liefert eine Abfrage mit WHERE, ORDER BY und LIMIT?', niveau: 'alle' }),
  Object.freeze({ typ: 'T2', titel: 'Gruppen auszählen', beschreibung: 'Sage das Ergebnis einer Abfrage mit GROUP BY, COUNT/SUM und HAVING voraus.', niveau: 'alle' }),
  Object.freeze({ typ: 'T3', titel: 'Zeilen zählen', beschreibung: 'Wie viele Zeilen liefern Kreuzprodukt und Verbund zweier Tabellen?', niveau: 'alle' }),
  Object.freeze({ typ: 'T4', titel: 'Kardinalität aus Daten', beschreibung: 'Welche Kardinalität (1:1, 1:n, n:m) stützen die Beispieldaten?', niveau: 'eA' }),
  Object.freeze({ typ: 'T5', titel: 'Schlüssel finden', beschreibung: 'Welche Spalte(n) eignen sich als Primärschlüssel – Vorsicht, Ausschnitt-Falle!', niveau: 'alle' }),
  Object.freeze({ typ: 'T6', titel: 'Bauplan überführen', beschreibung: 'Welches Relationenschema setzt ein kleines ER-Modell richtig um?', niveau: 'eA' }),
  Object.freeze({ typ: 'T7', titel: 'Anomalie erkennen', beschreibung: 'Welche Anomalie löst ein Vorgang in einer Tabelle aus?', niveau: 'alle' })
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

/* ---------- Gemeinsames für T4–T7 (Modellierung) ---------- */

const hinweis = (md) => ({ t: 'hinweis', md });
const gross = (w) => w.charAt(0).toUpperCase() + w.slice(1);
const OPTION_IDS = ['a', 'b', 'c', 'd', 'e', 'f'];

/**
 * choice-Interaktion mit genau einer richtigen Option. optionen: [{ md, richtig? }]. Die Reihenfolge wird aus dem Seed
 * gemischt und erst danach werden neutrale Ids a, b, c … vergeben – die Id verrät nichts über die Lösung.
 */
function auswahl(z, frage, optionen) {
  const gemischt = z.mischen(optionen).map((o, i) => ({ ...o, id: OPTION_IDS[i] }));
  return {
    interaktion: { kind: 'choice', mehrfach: false, frage, optionen: gemischt.map((o) => ({ id: o.id, md: o.md })) },
    loesung: { richtig: gemischt.filter((o) => o.richtig).map((o) => o.id) }
  };
}

/** Werte einer Spalte (Index) einer Zeilenliste. */
const spalte = (zeilen, i) => zeilen.map((r) => r[i]);
/** Häufigkeiten. */
function zaehle(werte) {
  const m = new Map();
  for (const w of werte) m.set(w, (m.get(w) || 0) + 1);
  return m;
}
/** Aufzählung „A, B und C“. */
function aufzaehlung(liste) {
  const l = liste.map(String);
  return l.length <= 1 ? l.join('') : `${l.slice(0, -1).join(', ')} und ${l[l.length - 1]}`;
}

const BOOTE = ['Seestern', 'Wellenreiter', 'Albatros', 'Kompass', 'Brise', 'Nordlicht', 'Ankerherz', 'Gischt', 'Leuchtfeuer', 'Seeigel', 'Kielwasser', 'Sturmvogel'];
const HIMMELSOBJEKTE = ['Mond', 'Saturn', 'Jupiter', 'Orionnebel', 'Andromeda', 'Plejaden', 'Mars', 'Venus'];
const LEUCHTTUERME = ['Weserkante', 'Sandhaken', 'Moewenriff', 'Nordbake', 'Deichspitze', 'Ostermarsch', 'Priel', 'Schlickbank'];
const VEREINSRAEUME = ['Bootshalle', 'Umkleide Nord', 'Umkleide Sued', 'Werkstatt'];

/* ---------- T4: Kardinalität aus Beispieldaten ---------- */

// a = Entitätstyp mit der „1“ (bei 1:n die 1-Seite), b = Entitätstyp mit dem Fremdschlüssel (1:n, 1:1). Bei n:m stehen
// beide Schlüssel in der Beziehungstabelle `bez`. wort/plural/ein nur für den Fließtext.
const T4_THEMEN = [
  {
    kard: '1:n', bez: 'liegtAn', intro: 'Die Hafenmeisterei führt eine Liste ihrer Boote.',
    a: { name: 'Steg', wort: 'Steg', plural: 'Stege', ein: 'ein', key: 'StegNr' },
    b: { name: 'Boot', wort: 'Boot', plural: 'Boote', ein: 'ein', key: 'BootNr', text: 'Name', werte: () => BOOTE },
    hinweis: 'Jedes Boot hat genau einen festen Liegeplatz an einem Steg.',
    begruendung: 'Jedes Boot hat genau einen festen Liegeplatz an einem Steg, an einem Steg liegen mehrere Boote.'
  },
  {
    kard: '1:n', bez: 'betreut', intro: 'Der Imkerverein führt eine Liste seiner Bienenstöcke.',
    a: { name: 'Imker', wort: 'Imker', plural: 'Imker', ein: 'ein', key: 'ImkerNr' },
    b: { name: 'Bienenstock', wort: 'Bienenstock', plural: 'Bienenstöcke', ein: 'ein', key: 'StockNr', text: 'Standort', werte: () => STADTTEILE },
    hinweis: 'Jeder Bienenstock wird von genau einem Imker betreut.',
    begruendung: 'Jeder Bienenstock wird von genau einem Imker betreut, ein Imker kann mehrere Bienenstöcke betreuen.'
  },
  {
    kard: '1:n', bez: 'erfolgtMit', intro: 'Die Volkssternwarte notiert jede Beobachtung.',
    a: { name: 'Teleskop', wort: 'Teleskop', plural: 'Teleskope', ein: 'ein', key: 'TeleskopNr' },
    b: { name: 'Beobachtung', wort: 'Beobachtung', plural: 'Beobachtungen', ein: 'eine', einem: 'einer', key: 'BeobachtungNr', text: 'Objekt', werte: () => HIMMELSOBJEKTE },
    hinweis: 'Jede Beobachtung wird mit genau einem Teleskop gemacht.',
    begruendung: 'Jede Beobachtung wird mit genau einem Teleskop gemacht, mit einem Teleskop werden viele Beobachtungen gemacht.'
  },
  {
    kard: '1:1', bez: 'betreut', intro: 'Die Küstenwache führt eine Liste der Leuchttürme.',
    a: { name: 'Waerter', wort: 'Wärter', plural: 'Wärter', ein: 'ein', key: 'WaerterNr' },
    b: { name: 'Leuchtturm', wort: 'Leuchtturm', plural: 'Leuchttürme', ein: 'ein', key: 'TurmNr', text: 'Name', werte: () => LEUCHTTUERME },
    hinweis: 'Jeder Wärter ist für höchstens einen Leuchtturm zuständig.',
    begruendung: 'Jeder Leuchtturm hat genau einen Wärter, und jeder Wärter ist für höchstens einen Leuchtturm zuständig.'
  },
  {
    kard: '1:1', bez: 'nutzt', intro: 'Der Ruderverein vergibt Schließfächer an seine Mitglieder.',
    a: { name: 'Mitglied', wort: 'Mitglied', plural: 'Mitglieder', ein: 'ein', key: 'MitgliedNr' },
    b: { name: 'Schliessfach', wort: 'Schließfach', plural: 'Schließfächer', ein: 'ein', key: 'FachNr', text: 'Raum', werte: () => VEREINSRAEUME },
    hinweis: 'Jedes Mitglied bekommt höchstens ein Schließfach.',
    begruendung: 'Jedes Schließfach ist genau einem Mitglied zugeteilt, und jedes Mitglied bekommt höchstens ein Schließfach.'
  },
  {
    kard: '1:1', bez: 'traegt', intro: 'Die Wattführer-Gilde verwaltet ihre Funkgeräte.',
    a: { name: 'Wattfuehrer', wort: 'Wattführer', plural: 'Wattführer', ein: 'ein', key: 'FuehrerNr' },
    b: { name: 'Funkgeraet', wort: 'Funkgerät', plural: 'Funkgeräte', ein: 'ein', key: 'GeraetNr', text: 'Kanal', zahl: true, werte: () => [3, 5, 7, 9, 11, 14, 16, 21] },
    hinweis: 'Jeder Wattführer trägt immer nur sein eigenes Funkgerät.',
    begruendung: 'Jedes Funkgerät ist genau einem Wattführer fest zugeteilt, und jeder Wattführer trägt nur sein eigenes Funkgerät.'
  },
  {
    kard: 'n:m', bez: 'singtIn', intro: 'Der Chor hält fest, wer bei welchem Konzert gesungen hat.',
    a: { name: 'Saenger', wort: 'Sänger', plural: 'Sänger', ein: 'ein', key: 'SaengerNr' },
    b: { name: 'Konzert', wort: 'Konzert', plural: 'Konzerte', ein: 'ein', key: 'KonzertNr' },
    hinweis: 'Bei einem Konzert singen mehrere Sängerinnen und Sänger.',
    begruendung: 'Bei einem Konzert singen mehrere Sänger, und ein Sänger singt bei mehreren Konzerten.'
  },
  {
    kard: 'n:m', bez: 'nimmtTeil', intro: 'Der Schachclub hält fest, wer an welchem Turnier teilgenommen hat.',
    a: { name: 'Spieler', wort: 'Spieler', plural: 'Spieler', ein: 'ein', key: 'SpielerNr' },
    b: { name: 'Turnier', wort: 'Turnier', plural: 'Turniere', ein: 'ein', key: 'TurnierNr' },
    hinweis: 'Ein Spieler kann an mehreren Turnieren teilnehmen.',
    begruendung: 'Ein Spieler kann an mehreren Turnieren teilnehmen, und an einem Turnier nehmen mehrere Spieler teil.'
  },
  {
    kard: 'n:m', bez: 'steuertAn', intro: 'Die Fährgesellschaft hält fest, welche Fähre welchen Anleger anfährt.',
    a: { name: 'Faehre', wort: 'Fähre', plural: 'Fähren', ein: 'eine', einem: 'einer', key: 'FaehreNr' },
    b: { name: 'Anleger', wort: 'Anleger', plural: 'Anleger', ein: 'ein', key: 'AnlegerNr' },
    hinweis: 'Eine Fähre fährt auf ihrer Route mehrere Anleger an.',
    begruendung: 'Eine Fähre fährt mehrere Anleger an, und ein Anleger wird von mehreren Fähren angefahren.'
  }
];

const KARD_OPTIONEN = ['1 : 1', '1 : n', 'n : 1', 'n : m'];
/** Dativ des unbestimmten Artikels („zu einem Steg“, „zu einer Fähre“). */
const einem = (e) => e.einem || 'einem';

function t4Kandidat(z) {
  const th = z.waehle(T4_THEMEN);
  const { a, b } = th;
  const vorwaerts = z.ja(0.5); // Leserichtung a – b oder b – a
  const [x, y] = vorwaerts ? [a, b] : [b, a];
  let tab;
  const erkl = [];
  if (th.kard === 'n:m') {
    const ma = z.ganz(3, 4);
    const mb = z.ganz(3, 4);
    const paare = [];
    for (let i = 1; i <= ma; i++) for (let j = 1; j <= mb; j++) paare.push([i, j]);
    const zeilen = z.stichprobe(paare, z.ganz(5, 7)).sort((p, q) => p[0] - q[0] || p[1] - q[1]);
    const proA = new Map();
    const proB = new Map();
    for (const [i, j] of zeilen) {
      proA.set(i, [...(proA.get(i) || []), j]);
      proB.set(j, [...(proB.get(j) || []), i]);
    }
    const va = [...proA].find(([, l]) => l.length >= 2);
    const vb = [...proB].find(([, l]) => l.length >= 2);
    if (!va || !vb) return null;
    tab = { name: th.bez, spalten: [{ name: a.key, zahl: true, pk: true, fk: a.name }, { name: b.key, zahl: true, pk: true, fk: b.name }], zeilen };
    erkl.push(
      `In ${th.bez} kommt ${a.key} ${va[0]} mit mehreren Werten von ${b.key} vor (${aufzaehlung(va[1])}) – zu ${einem(a)} ${a.wort} gibt es mehrere ${b.plural}.`,
      `Umgekehrt kommt ${b.key} ${vb[0]} mit mehreren Werten von ${a.key} vor (${aufzaehlung(vb[1])}) – zu ${einem(b)} ${b.wort} gibt es mehrere ${a.plural}.`,
      'Auf beiden Seiten „mehrere“: **n : m** – deshalb steht die Beziehung in einer eigenen Tabelle mit zwei Fremdschlüsseln.'
    );
  } else {
    const n = z.ganz(5, 7);
    const werte = b.werte();
    const texte = werte.length >= n ? z.stichprobe(werte, n) : Array.from({ length: n }, () => z.waehle(werte));
    const start = z.waehle([1, 1, 10, 100]);
    let fks;
    if (th.kard === '1:1') fks = z.verschiedene(n, 1, 12);
    else {
      const eltern = z.ganz(2, 3);
      fks = Array.from({ length: n }, () => z.ganz(1, eltern));
    }
    const zeilen = texte.map((t, i) => [start + i, t, fks[i]]);
    const haeufig = [...zaehle(fks)].filter(([, k]) => k >= 2);
    if (th.kard === '1:n' && !haeufig.length) return null;
    tab = { name: b.name, spalten: [{ name: b.key, zahl: true, pk: true }, { name: b.text, zahl: !!b.zahl }, { name: a.key, zahl: true, fk: a.name }], zeilen };
    erkl.push(`Jede Zeile von ${b.name} hat genau einen Wert in ${a.key} – ${b.ein} ${b.wort} gehört zu genau ${einem(a)} ${a.wort}.`);
    if (th.kard === '1:n') {
      const [w] = haeufig[0];
      const mit = zeilen.filter((r) => r[2] === w).map((r) => r[1]);
      erkl.push(`Der Wert ${w} kommt in ${a.key} mehrfach vor (${aufzaehlung(mit)}) – ${a.ein} ${a.wort} hat mehrere ${b.plural}. Also **1 : n** von ${a.wort} zu ${b.wort}.`);
    } else {
      erkl.push(`Kein Wert von ${a.key} kommt doppelt vor – die Daten passen zu **1 : 1**. Dass das so bleiben muss, zeigen die Daten aber nicht: Das sagt erst der Sachzusammenhang.`);
    }
  }
  const richtig = th.kard === 'n:m' ? 'n : m' : th.kard === '1:1' ? '1 : 1' : vorwaerts ? '1 : n' : 'n : 1';
  erkl.push(`In der Leserichtung ${x.wort} – ${y.wort} heißt das: **${richtig}**.`);
  erkl.push(`Beachte: Beispieldaten können eine Kardinalität nur **stützen** (oder widerlegen) – begründen musst du sie mit dem Sachzusammenhang: ${th.begruendung}`);

  const { interaktion, loesung } = auswahl(
    z,
    `Welche Kardinalität hat der Beziehungstyp *${th.bez}* zwischen **${x.name}** und **${y.name}** (Leserichtung ${x.name} – ${y.name})?`,
    KARD_OPTIONEN.map((k) => ({ md: k, richtig: k === richtig }))
  );
  return {
    titel: 'Kardinalität aus Daten',
    kategorie: 'ER-Modell',
    kompetenz: ['DB-K34'],
    falle: ['P9'],
    inhalt: [
      txt(`${th.intro} Ausschnitt aus der Tabelle ${tab.name}${th.kard === 'n:m' ? ` (Beziehungstabelle zwischen ${a.name} und ${b.name})` : ''}:`),
      dbtabelle(tab),
      hinweis(`**Aus dem Gespräch:** ${th.hinweis}`)
    ],
    interaktion,
    loesung,
    erklaerung: [txt(erkl.join(' '))]
  };
}

/* ---------- T5: Schlüsselkandidat finden ---------- */

const datum = (tag) => `2026-${tag < 100 ? '05' : '06'}-${String(tag % 100).padStart(2, '0')}`;
const telefon = (z) => `0000-${z.ganz(100, 999)}${z.ganz(10, 99)}`; // erfundene Vorwahl, nie echte Nummern

// Je Thema: spalten (Namen), zeilen(z) erzeugt den Ausschnitt; richtig/falle/nullSpalte/nichtMinimal/nichtEindeutig sind
// Spaltenlisten. Die Eigenschaften werden nach dem Erzeugen geprüft (sonst neuer Versuch).
const T5_THEMEN = [
  {
    tabelle: 'Ausleihe',
    intro: 'Der Kanuverleih am Weserufer notiert jede Ausleihe. Die AusleiheNr vergibt die Kasse fortlaufend.',
    spalten: ['AusleiheNr', 'Vorname', 'Telefon', 'Kanu', 'Datum'],
    zahl: ['AusleiheNr'],
    zeilen(z, n) {
      const start = z.waehle([1, 41, 120, 305]);
      const vornamen = z.stichprobe(VORNAMEN, n);
      const kanus = z.stichprobe(['Otter', 'Biber', 'Reiher', 'Hecht'], 3);
      const tage = z.stichprobe([3, 4, 10, 11, 17], 2).map(datum);
      return vornamen.map((v, i) => [start + i, v, telefon(z), z.waehle(kanus), z.waehle(tage)]);
    },
    richtig: ['AusleiheNr'],
    falle: ['Vorname'],
    falleText: 'Zwei Kundinnen können denselben Vornamen haben, und wer wiederkommt, leiht ein zweites Mal aus.',
    nullSpalte: ['Telefon'],
    nichtMinimal: ['AusleiheNr', 'Datum'],
    nichtEindeutig: ['Kanu', 'Datum'],
    richtigText: 'Die AusleiheNr wird fortlaufend vergeben: eindeutig für alle möglichen Ausleihen, nie leer, minimal – ein künstlicher Schlüssel.'
  },
  {
    tabelle: 'Anmeldung',
    intro: 'Die Volkssternwarte sammelt Anmeldungen für ihre Beobachtungsabende. Jede Anmeldung bekommt eine fortlaufende AnmeldungNr.',
    spalten: ['AnmeldungNr', 'Vorname', 'Email', 'Abend', 'Teleskop'],
    zahl: ['AnmeldungNr'],
    zeilen(z, n) {
      const start = z.waehle([1, 17, 230]);
      const vornamen = z.stichprobe(VORNAMEN, n);
      const abende = z.stichprobe([5, 12, 19, 26, 102], 2).map(datum);
      const teleskope = z.stichprobe(['Refraktor', 'Spiegel', 'Dobson'], 2);
      return vornamen.map((v, i) => [start + i, v, `${v.toLowerCase()}${z.ganz(1, 99)}@post.example`, z.waehle(abende), z.waehle(teleskope)]);
    },
    richtig: ['AnmeldungNr'],
    falle: ['Vorname'],
    falleText: 'Zwei Gäste können denselben Vornamen haben, und dieselbe Person kann sich für mehrere Abende anmelden.',
    nullSpalte: ['Email'],
    nichtMinimal: ['AnmeldungNr', 'Vorname'],
    nichtEindeutig: ['Abend', 'Teleskop'],
    richtigText: 'Die AnmeldungNr wird fortlaufend vergeben: eindeutig für alle möglichen Anmeldungen, nie leer, minimal – ein künstlicher Schlüssel.'
  },
  {
    tabelle: 'Belegung',
    intro: 'Der Sportboothafen vergibt Gastliegeplätze. Ein Liegeplatz wird an einem Tag höchstens einmal vergeben.',
    spalten: ['PlatzNr', 'Datum', 'Boot', 'Skipper', 'Funkrufname'],
    zahl: ['PlatzNr'],
    zeilen(z, n) {
      const plaetze = z.stichprobe([1, 2, 3, 4, 5, 6, 7, 8], 3);
      const tage = z.stichprobe([1, 2, 8, 9, 15, 16], 3).map(datum);
      const paare = [];
      for (const p of plaetze) for (const t of tage) paare.push([p, t]);
      const boote = z.stichprobe(BOOTE, n);
      const skipper = z.stichprobe(VORNAMEN, n);
      return z.stichprobe(paare, n).map(([p, t], i) => [p, t, boote[i], skipper[i], `DK${z.ganz(1000, 9999)}`]);
    },
    richtig: ['PlatzNr', 'Datum'],
    falle: ['Boot'],
    falleText: 'Dasselbe Boot kann an mehreren Tagen kommen – im Ausschnitt ist es nur zufällig eindeutig.',
    nullSpalte: ['Funkrufname'],
    nichtMinimal: ['PlatzNr', 'Datum', 'Skipper'],
    nichtEindeutig: ['PlatzNr'],
    richtigText: 'Ein Liegeplatz wird an einem Tag höchstens einmal vergeben: Erst die Kombination aus PlatzNr und Datum ist für alle möglichen Belegungen eindeutig, nie leer und minimal – ein zusammengesetzter Schlüssel.'
  }
];

/** Sind die Werte der Spaltenkombination im Ausschnitt eindeutig und ohne NULL? */
function eindeutig(zeilen, idx) {
  const s = new Set();
  for (const r of zeilen) {
    const w = idx.map((i) => r[i]);
    if (w.some((x) => x === null)) return false;
    s.add(JSON.stringify(w));
  }
  return s.size === zeilen.length;
}

function t5Kandidat(z) {
  const th = z.waehle(T5_THEMEN);
  const n = z.ganz(5, 6);
  const zeilen = th.zeilen(z, n);
  const ix = (liste) => liste.map((s) => th.spalten.indexOf(s));
  // genau eine Zeile bekommt NULL in der NULL-Spalte
  const nullIdx = ix(th.nullSpalte)[0];
  zeilen[z.ganz(0, n - 1)][nullIdx] = null;
  const nullWerte = spalte(zeilen, nullIdx).filter((w) => w !== null);
  if (new Set(nullWerte).size !== nullWerte.length) return null;
  if (!eindeutig(zeilen, ix(th.richtig)) || !eindeutig(zeilen, ix(th.falle)) || !eindeutig(zeilen, ix(th.nichtMinimal))) return null;
  if (eindeutig(zeilen, ix(th.nichtEindeutig))) return null;
  // Gegenprobe: keine Teilmenge der richtigen Kombination ist schon eindeutig (sonst wäre sie nicht minimal)
  if (th.richtig.length > 1 && th.richtig.some((s) => eindeutig(zeilen, ix([s])))) return null;

  const tab = { name: th.tabelle, spalten: th.spalten.map((s) => ({ name: s, zahl: th.zahl.includes(s) })), zeilen };
  const md = (liste) => (liste.length === 1 ? `\`${liste[0]}\`` : `\`${liste.join('\` + \`')}\` (zusammen)`);
  const doppelt = (() => {
    const i = ix(th.nichtEindeutig);
    const gesehen = new Map();
    for (const r of zeilen) {
      const k = JSON.stringify(i.map((j) => r[j]));
      if (gesehen.has(k)) return i.map((j) => r[j]).join(' / ');
      gesehen.set(k, true);
    }
    return '';
  })();
  const optionen = [
    { md: md(th.richtig), richtig: true },
    { md: md(th.falle) },
    { md: md(th.nullSpalte) },
    { md: md(th.nichtMinimal) },
    { md: md(th.nichtEindeutig) }
  ];
  const { interaktion, loesung } = auswahl(z, 'Welche Spalte bzw. Spaltenkombination eignet sich als **Primärschlüssel**?', optionen);
  const erkl = [
    `**Richtig: ${md(th.richtig)}.** ${th.richtigText}\n`,
    `- ${md(th.falle)}: im Ausschnitt eindeutig, fachlich aber nicht (**Ausschnitt-Falle**). ${th.falleText} Ein Ausschnitt kann Eindeutigkeit nur widerlegen, nie beweisen.`,
    `- ${md(th.nullSpalte)}: in einer Zeile NULL – ein Schlüssel darf **nie leer** sein.`,
    `- ${md(th.nichtMinimal)}: zwar eindeutig, aber **nicht minimal** – ${th.nichtMinimal.filter((s) => !th.richtig.includes(s)).join(', ')} kann man weglassen.`,
    `- ${md(th.nichtEindeutig)}: schon im Ausschnitt **nicht eindeutig** (${doppelt} kommt doppelt vor).`
  ];
  return {
    titel: 'Schlüsselkandidat finden',
    kategorie: 'Schlüssel',
    kompetenz: ['DB-K02'],
    falle: ['P8'],
    inhalt: [txt(th.intro), txt(`Ausschnitt aus der Tabelle ${tab.name}:`), dbtabelle(tab)],
    interaktion,
    loesung,
    erklaerung: [txt(erkl.join('\n'))]
  };
}

/* ---------- T6: Mini-ER → Kurzschreibweise ---------- */

/** Graph und Layout des Mini-ER für den Block `er` (Spec §7.6.4; Format seit Phase 5 Task 2 im Validator bekannt). */
const MIT_ER_BLOCK = true;

const T6_THEMEN = [
  {
    kard: '1:n', bez: 'liegtAn', rel: 'Seit', intro: 'Die Hafenmeisterei plant eine Datenbank für ihre Liegeplätze.',
    a: { name: 'Steg', key: 'StegNr', attr: 'Laenge' }, b: { name: 'Boot', key: 'BootNr', attr: 'Name' }
  },
  {
    kard: '1:n', bez: 'betreut', rel: 'Seit', intro: 'Der Imkerverein plant eine Datenbank für seine Bienenstöcke.',
    a: { name: 'Imker', key: 'ImkerNr', attr: 'Name' }, b: { name: 'Bienenstock', key: 'StockNr', attr: 'Standort' }
  },
  {
    kard: '1:n', bez: 'pachtet', rel: 'Pachtbeginn', intro: 'Der Kleingartenverein plant eine Datenbank für seine Parzellen.',
    a: { name: 'Paechter', key: 'PaechterNr', attr: 'Name' }, b: { name: 'Parzelle', key: 'ParzelleNr', attr: 'Groesse' }
  },
  {
    kard: 'n:m', bez: 'singtIn', rel: 'Stimme', intro: 'Der Chor plant eine Datenbank für seine Konzerte.',
    a: { name: 'Saenger', key: 'SaengerNr', attr: 'Name' }, b: { name: 'Konzert', key: 'KonzertNr', attr: 'Datum' }
  },
  {
    kard: 'n:m', bez: 'nimmtTeil', rel: 'Platzierung', intro: 'Der Schachclub plant eine Datenbank für seine Turniere.',
    a: { name: 'Spieler', key: 'SpielerNr', attr: 'Name' }, b: { name: 'Turnier', key: 'TurnierNr', attr: 'Ort' }
  },
  {
    kard: 'n:m', bez: 'steuertAn', rel: 'Abfahrt', intro: 'Die Fährgesellschaft plant eine Datenbank für ihre Fahrpläne.',
    a: { name: 'Faehre', key: 'FaehreNr', attr: 'Name' }, b: { name: 'Anleger', key: 'AnlegerNr', attr: 'Ort' }
  }
];

const pk = (name, fk) => ({ name, pk: true, ...(fk ? { fk } : {}) });
const fk = (name, ziel) => ({ name, fk: ziel });
const at = (name) => ({ name });
const relation = (name, attribute) => ({ name, attribute });

/** Chen-artige Textskizze (wie Tafelbild DS 9). */
function chenSkizze(links, rechts, bez, kl, kr, rel) {
  const anfang = `[${links.name}] ——${kl}—— `;
  const raute = `<${bez}>`;
  const zeilen = [`${anfang}${raute} ——${kr}—— [${rechts.name}]`];
  if (rel) {
    const mitte = ' '.repeat(anfang.length + Math.floor(raute.length / 2));
    zeilen.push(`${mitte}|`, `${' '.repeat(Math.max(0, mitte.length - Math.floor((rel.length + 2) / 2)))}(${rel})`);
  }
  zeilen.push('', `${links.name}: ${links.key} (Schlüsselattribut), ${links.attr}`, `${rechts.name}: ${rechts.key} (Schlüsselattribut), ${rechts.attr}`);
  return zeilen.join('\n');
}

function erBlock(links, rechts, bez, kl, kr, rel) {
  const ent = (id, e) => ({ id, name: e.name, attribute: [{ name: e.key, schluessel: true }, { name: e.attr, schluessel: false }] });
  return {
    t: 'er',
    graph: {
      entitaeten: [ent('e1', links), ent('e2', rechts)],
      beziehungen: [{ id: 'b1', name: bez, enden: [{ entitaet: 'e1', kard: kl }, { entitaet: 'e2', kard: kr }], attribute: rel ? [{ name: rel, schluessel: false }] : [] }]
    },
    // Layout für jedes Element, Attribute als <id>.<Index> (AUFGABENFORMAT §5.7): über dem Entitätstyp, unter der Raute
    layout: {
      e1: { x: 100, y: 120 }, 'e1.0': { x: 50, y: 40 }, 'e1.1': { x: 150, y: 40 },
      b1: { x: 320, y: 120 }, ...(rel ? { 'b1.0': { x: 320, y: 200 } } : {}),
      e2: { x: 540, y: 120 }, 'e2.0': { x: 490, y: 40 }, 'e2.1': { x: 590, y: 40 }
    }
  };
}

function t6Kandidat(z) {
  const th = z.waehle(T6_THEMEN);
  const { a, b } = th;
  const rel = z.ja(th.kard === 'n:m' ? 0.6 : 0.5) ? th.rel : null;
  const A = (...extra) => relation(a.name, [pk(a.key), at(a.attr), ...extra]);
  const B = (...extra) => relation(b.name, [pk(b.key), at(b.attr), ...extra]);
  const relAt = rel ? [at(rel)] : [];
  const vorschlaege = [];
  if (th.kard === '1:n') {
    vorschlaege.push({ richtig: true, schema: [A(), B(fk(a.key, a.name), ...relAt)] });
    vorschlaege.push({ fehler: `Der Fremdschlüssel steht auf der falschen Seite: In ${a.name} kann ${b.key} nur **einen** Wert aufnehmen, ein ${a.name} hat aber mehrere ${b.name}-Datensätze.`, schema: [A(fk(b.key, b.name), ...relAt), B()] });
    if (rel) vorschlaege.push({ fehler: `Das Beziehungsattribut ${rel} steht am falschen Ort: Bei 1:n gehört es zusammen mit dem Fremdschlüssel auf die n-Seite (${b.name}).`, schema: [A(at(rel)), B(fk(a.key, a.name))] });
    else vorschlaege.push({ fehler: `Der Fremdschlüssel fehlt ganz – welcher ${b.name}-Datensatz zu welchem ${a.name} gehört, ginge verloren.`, schema: [A(), B()] });
    vorschlaege.push({ fehler: `Falscher Primärschlüssel: ${a.key} ist in ${b.name} nicht eindeutig (ein ${a.name} hat mehrere ${b.name}-Datensätze); Schlüssel ist ${b.key}.`, schema: [A(), relation(b.name, [at(b.key), at(b.attr), pk(a.key, a.name), ...relAt])] });
  } else {
    vorschlaege.push({ richtig: true, schema: [A(), B(), relation(th.bez, [pk(a.key, a.name), pk(b.key, b.name), ...relAt])] });
    vorschlaege.push({ fehler: `n:m ohne eigene Tabelle: In ${b.name} kann ${a.key} nur **einen** Wert aufnehmen, ein ${b.name} gehört aber zu mehreren ${a.name}-Datensätzen.`, schema: [A(), B(fk(a.key, a.name), ...relAt)] });
    if (rel) vorschlaege.push({ fehler: `Das Beziehungsattribut ${rel} steht am falschen Ort: Es gehört zum **Paar** aus ${a.name} und ${b.name}, also in die Tabelle ${th.bez}.`, schema: [A(at(rel)), B(), relation(th.bez, [pk(a.key, a.name), pk(b.key, b.name)])] });
    else vorschlaege.push({ fehler: `Gegenseitige Fremdschlüssel lösen n:m nicht auf: Jede Spalte nimmt nur **einen** Wert auf, auf beiden Seiten gibt es aber mehrere Partner.`, schema: [A(fk(b.key, b.name)), B(fk(a.key, a.name))] });
    vorschlaege.push({ fehler: `Der Schlüssel von ${th.bez} ist nicht zusammengesetzt: ${a.key} allein kommt dort mehrfach vor – erst das Paar (${a.key}, ${b.key}) ist eindeutig.`, schema: [A(), B(), relation(th.bez, [pk(a.key, a.name), fk(b.key, b.name), ...relAt])] });
  }
  const reihenfolge = z.mischen(vorschlaege).map((v, i) => ({ ...v, buchstabe: 'ABCD'[i] }));
  const [kl, kr] = th.kard === '1:n' ? ['1', 'n'] : ['n', 'm'];
  // Zeichnung auch mal gespiegelt (b links): die Kardinalitäten wandern mit ihren Entitätstypen
  const vertauscht = z.ja(0.5);
  const [links, rechts, kLinks, kRechts] = !vertauscht ? [a, b, kl, kr] : th.kard === '1:n' ? [b, a, 'n', '1'] : [b, a, 'n', 'm'];
  const skizze = chenSkizze(links, rechts, th.bez, kLinks, kRechts, rel);
  const er = erBlock(links, rechts, th.bez, kLinks, kRechts, rel);

  const inhalt = [txt(`${th.intro} Der Bauplan (Chen-Notation):`), { t: 'code', code: skizze, nummern: false }];
  if (MIT_ER_BLOCK) inhalt.push(er);
  inhalt.push(txt('Vier Vorschläge für das Relationenschema:'));
  for (const v of reihenfolge) inhalt.push(txt(`**Vorschlag ${v.buchstabe}**`), { t: 'schema', relationen: v.schema });
  const { interaktion, loesung } = auswahl(
    z,
    'Welcher Vorschlag überführt den Bauplan richtig in die Kurzschreibweise?',
    [...reihenfolge].sort((p, q) => p.buchstabe.localeCompare(q.buchstabe)).map((v) => ({ md: `Vorschlag ${v.buchstabe}`, richtig: !!v.richtig }))
  );
  const richtigV = reihenfolge.find((v) => v.richtig);
  const regel =
    th.kard === '1:n'
      ? `Bei **1:n** bekommt die n-Seite (${b.name}) den Primärschlüssel der 1-Seite als Fremdschlüssel ↑${a.key}${rel ? `; das Beziehungsattribut ${rel} wandert mit dorthin` : ''}.`
      : `Bei **n:m** braucht die Beziehung eine eigene Tabelle ${th.bez} mit den Fremdschlüsseln ↑${a.key} und ↑${b.key}; zusammen bilden sie den Primärschlüssel${rel ? `, das Beziehungsattribut ${rel} gehört dazu` : ''}.`;
  const erkl = [`**Richtig ist Vorschlag ${richtigV.buchstabe}.** ${regel}\n`];
  for (const v of reihenfolge.filter((x) => !x.richtig)) erkl.push(`- Vorschlag ${v.buchstabe}: ${v.fehler}`);
  return {
    titel: 'Vom Bauplan zum Schema',
    kategorie: 'Überführung',
    kompetenz: ['DB-K41', 'DB-K42', 'DB-K04'],
    falle: ['P9'],
    inhalt,
    interaktion,
    loesung,
    erklaerung: [txt(erkl.join('\n')), { t: 'schema', relationen: richtigV.schema }],
    er
  };
}

/* ---------- T7: Anomalieart zu einem Szenario ---------- */

const ANOMALIEN = { einfuegung: 'Einfügeanomalie', aenderung: 'Änderungsanomalie', loeschung: 'Löschanomalie', keine: 'keine Anomalie' };

// gruppe: Spalte, von der die Spalten in abh abhängen (Rohliste: mehrere Sachverhalte in einer Tabelle).
const T7_THEMEN = [
  {
    roh: 'Kursliste', intro: 'Die Segelschule führt ihre Anmeldungen in einer einzigen Liste.',
    person: 'Teilnehmer', gruppe: 'Kurs', gruppeWort: 'Kurs', gruppen: ['Jollen', 'Katamaran', 'Optimist', 'Kielboot', 'Windsurfen', 'Kitesurfen'],
    abh: [{ name: 'Kursleitung', wort: 'Kursleitung', werte: () => VORNAMEN }, { name: 'Treffpunkt', werte: () => ['Steg 1', 'Steg 2', 'Slipanlage', 'Bootshaus', 'Strandkorb 7'] }]
  },
  {
    roh: 'Stimmliste', intro: 'Der Chor führt seine Mitglieder in einer einzigen Liste.',
    person: 'Saenger', gruppe: 'Stimmgruppe', gruppeWort: 'Stimmgruppe', gruppen: ['Sopran', 'Alt', 'Tenor', 'Bass', 'Mezzo', 'Bariton'],
    abh: [{ name: 'Stimmfuehrung', wort: 'Stimmführung', werte: () => VORNAMEN }, { name: 'Probenraum', werte: () => ['Aula', 'Raum 12', 'Musiksaal', 'Kapelle', 'Foyer'] }]
  },
  {
    roh: 'Gaesteliste', intro: 'Die Volkssternwarte führt ihre Führungen und Gäste in einer einzigen Liste.',
    person: 'Gast', gruppe: 'Fuehrung', gruppeWort: 'Führung', gruppen: ['Mondabend', 'Planetenabend', 'Sonnentag', 'Kinderabend', 'Sternschnuppen', 'Wintersterne'],
    abh: [{ name: 'Leitung', wort: 'Leitung', werte: () => VORNAMEN }, { name: 'Treffpunkt', werte: () => ['Kuppel', 'Dachterrasse', 'Vortragsraum', 'Foyer', 'Parkplatz'] }]
  }
];

function t7Kandidat(z) {
  const th = z.waehle(T7_THEMEN);
  const art = z.waehle(['einfuegung', 'aenderung', 'loeschung', 'keine']);
  const gruppen = z.stichprobe(th.gruppen, 4);
  const [neueGruppe, ...benutzt] = gruppen;
  const personen = z.stichprobe(VORNAMEN, 12);
  const leitung = z.stichprobe(personen.slice(7), 4); // eigene Namen für die abhängige Personen-Spalte
  const orte = z.stichprobe(th.abh[1].werte(), 4);
  const info = new Map(benutzt.map((g, i) => [g, [leitung[i], orte[i]]]));
  const [abh1, abh2] = th.abh;
  const erkl = [];
  let tab;
  let szenario;

  if (art === 'keine') {
    // anomaliefreie Tabelle: jede Gruppe genau einmal, alle Attribute hängen nur vom Schlüssel ab
    const key = `${th.gruppe}Nr`;
    const zeilen = benutzt.map((g, i) => [i + 1, g, ...info.get(g)]);
    tab = { name: th.gruppe, spalten: [{ name: key, zahl: true, pk: true }, { name: 'Name' }, { name: abh1.name }, { name: abh2.name }], zeilen };
    const g = z.waehle(benutzt);
    const vorgang = z.waehle(['aendern', 'loeschen', 'einfuegen']);
    if (vorgang === 'aendern') {
      const neu = orte[3];
      szenario = `${th.gruppeWort} „${g}“: Der ${abh2.name} ändert sich von „${info.get(g)[1]}“ zu „${neu}“.`;
      erkl.push(`Der ${abh2.name} von „${g}“ steht nur in **einer** Zeile – eine Änderung an einer Stelle, kein Widerspruch möglich.`);
    } else if (vorgang === 'loeschen') {
      szenario = `${th.gruppeWort} „${g}“ wird gestrichen; die Zeile wird gelöscht.`;
      erkl.push(`Mit der Zeile verschwinden nur die Angaben zu „${g}“ selbst – keine andere Information geht verloren.`);
    } else {
      szenario = `${th.gruppeWort} „${neueGruppe}“ mit ${abh1.wort} ${leitung[3]} soll neu eingetragen werden.`;
      erkl.push(`„${neueGruppe}“ bekommt einfach eine neue Zeile mit eigener ${key} – es muss nichts leer bleiben oder erfunden werden.`);
    }
    erkl.push(`Die Tabelle ${th.gruppe} ist anomaliefrei: Jede Information steht genau einmal, und jedes Attribut hängt nur vom Schlüssel ${key} ab. **Keine Anomalie möglich.**`);
  } else {
    const n = z.ganz(5, 7);
    // Verteilung: die erste benutzte Gruppe genau einmal, die anderen mindestens zweimal
    const [einmal, ...mehrmals] = benutzt;
    const gr = [einmal, ...mehrmals, ...mehrmals, ...Array.from({ length: n - 1 - 2 * mehrmals.length }, () => z.waehle(mehrmals))];
    if (gr.length !== n) return null;
    const folge = z.mischen(gr);
    const zeilen = folge.map((g, i) => [personen[i], g, ...info.get(g)]);
    tab = { name: th.roh, spalten: [{ name: th.person }, { name: th.gruppe }, { name: abh1.name }, { name: abh2.name }], zeilen };
    if (art === 'aenderung') {
      const g = z.waehle(mehrmals);
      const betroffen = zeilen.filter((r) => r[1] === g).map((r) => r[0]);
      const neu = leitung[3];
      szenario = `Bei ${th.gruppeWort} „${g}“ übernimmt ab sofort ${neu} die ${abh1.wort}.`;
      erkl.push(
        `Die ${abh1.wort} von „${g}“ steht in ${betroffen.length} Zeilen (bei ${aufzaehlung(betroffen)}) – **Redundanz**.`,
        `Alle diese Zeilen müssen geändert werden; wird eine vergessen, widerspricht sich die Liste: **Änderungsanomalie**.`
      );
    } else if (art === 'loeschung') {
      const p = zeilen.find((r) => r[1] === einmal)[0];
      szenario = `${p} meldet sich ab; die Zeile von ${p} wird gelöscht.`;
      erkl.push(
        `${p} ist der einzige Eintrag bei ${th.gruppeWort} „${einmal}“. Mit der Zeile gehen auch ${abh1.wort} (${info.get(einmal)[0]}) und ${abh2.name} (${info.get(einmal)[1]}) von „${einmal}“ verloren: **Löschanomalie**.`
      );
    } else {
      szenario = `${th.gruppeWort} „${neueGruppe}“ mit ${abh1.wort} ${leitung[3]} soll in die Liste – angemeldet hat sich aber noch niemand.`;
      erkl.push(
        `Jede Zeile der Liste beschreibt eine Person. „${neueGruppe}“ ließe sich nur mit leerer Spalte ${th.person} eintragen (oder gar nicht): **Einfügeanomalie**.`
      );
    }
    erkl.push(`Ursache: In ${th.roh} stehen mehrere Sachverhalte (${th.person}, ${th.gruppe} mit ${abh1.name} und ${abh2.name}) in **einer** Tabelle.`);
  }
  const { interaktion, loesung } = auswahl(
    z,
    `**Vorgang:** ${szenario}\n\nWelche Anomalie tritt dabei auf?`,
    Object.entries(ANOMALIEN).map(([k, v]) => ({ md: v, richtig: k === art }))
  );
  return {
    titel: 'Welche Anomalie?',
    kategorie: 'Anomalien',
    kompetenz: ['DB-K08', 'DB-K09'],
    falle: ['P10'],
    inhalt: [txt(art === 'keine' ? `${th.intro.replace('in einer einzigen Liste', 'in mehreren Tabellen')} Ausschnitt aus der Tabelle ${tab.name}:` : `${th.intro} Ausschnitt:`), dbtabelle(tab)],
    interaktion,
    loesung,
    erklaerung: [txt(erkl.join(' '))]
  };
}

/* ---------- Schnittstelle ---------- */

const KANDIDATEN = { T1: t1Kandidat, T2: t2Kandidat, T3: t3Kandidat, T4: t4Kandidat, T5: t5Kandidat, T6: t6Kandidat, T7: t7Kandidat };

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
