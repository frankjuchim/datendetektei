'use strict';
// Fundbuero (Akte 1): Generator und Abnahme nach seed/datenbanken/fundbuero/LIESMICH.md
// („Datenumfang und Verteilung“, „Abnahme-Prüfungen“). 15 Pflicht-Datensätze + 65 erzeugte = FundNr 1–80.

const { versuche, zuMinuten, plusTage, wochentag } = require('./zufall');
const { gleich, bereich, wert, spalte, zeilen } = require('./abnahme_hilfen');

const START = '2026-04-01';
const ENDE = '2026-09-20';
const GESAMT = 80;

/** Erzeugte Zeilen je Kategorie (Ziel über alle 80: Kleidung 16, Schlüssel 12, Elektronik 12, Taschen 8, Dokumente 6,
 *  Fahrradzubehör 6, Schmuck 7, Spielzeug 5, Sonstiges 5, Wertsachen 3 – abzüglich der Pflicht-Datensätze). */
const KATEGORIE_ANZAHL = [
  ['Kleidung', 15], ['Schlüssel', 11], ['Elektronik', 12], ['Taschen', 8], ['Dokumente', 6],
  ['Fahrradzubehör', 4], ['Schmuck', 4], ['Spielzeug', 3], ['Sonstiges', 2], ['Wertsachen', 0]
];

/** Bezeichnungen je Kategorie (LIESMICH); Armbanduhr wird gesondert vergeben (3–5 erzeugte). */
const BEZEICHNUNGEN = {
  Schlüssel: ['Schlüsselbund', 'Fahrradschlüssel', 'Autoschlüssel', 'Briefkastenschlüssel'],
  Elektronik: ['Smartphone', 'Kopfhörer', 'Powerbank', 'Ladekabel', 'E-Reader'],
  Kleidung: ['Jacke', 'Mütze', 'Schal', 'Handschuh', 'Regenjacke'],
  Taschen: ['Rucksack', 'Sporttasche', 'Geldbörse', 'Turnbeutel'],
  Dokumente: ['Monatskarte', 'Bibliotheksausweis', 'Notizbuch', 'Mappe mit Noten'],
  Fahrradzubehör: ['Helm', 'Fahrradschloss', 'Luftpumpe', 'Fahrradlicht'],
  Schmuck: ['Ring', 'Halskette', 'Ohrringe'],
  Spielzeug: ['Kuscheltier', 'Ball', 'Spielzeugauto'],
  Wertsachen: ['Kamera', 'Fernglas'],
  Sonstiges: ['Regenschirm', 'Sonnenbrille', 'Brillenetui', 'Trinkflasche']
};

/** Wertebereich (ganze Euro) je Kategorie; erzeugte Werte ≤ 150. */
const WERT_BEREICH = {
  Kleidung: [5, 60], Schlüssel: [5, 40], Elektronik: [15, 150], Taschen: [10, 80], Dokumente: [2, 30],
  Fahrradzubehör: [5, 60], Schmuck: [10, 150], Spielzeug: [3, 30], Sonstiges: [3, 40], Wertsachen: [60, 150]
};

const FARBEN = ['schwarz', 'blau', 'rot', 'grün', 'grau', 'weiß', 'braun', 'gelb', 'silber', 'gold', 'bunt'];

/** Fundorte je Stadtteil (jeder Fundort gehört zu genau einem Stadtteil; Pflicht-Fundorte eingeschlossen). */
const FUNDORTE = [
  ['Altstadt', ['Station Marktplatz', 'Station Rathaus', 'Rathaus, Eingang', 'Marktplatz', 'Spielplatz am Rathaus']],
  ['Hafenviertel', ['Station Hafenkante', 'Station Alte Werft', 'Station Fischmarkt', 'Fischmarkt']],
  ['Weserufer', ['Festplatz', 'Weserpromenade', 'Fähranleger']],
  ['Mühlenfeld', ['Freibad Mühlenfeld', 'Vereinsheim TuS', 'Station Stadion', 'Station Klinikum']],
  ['Nordheide', ['Schulzentrum, Pausenhof', 'Station Heidepark', 'Station Schulzentrum']],
  ['Lindenhof', ['Café am Lindenplatz', 'Station Universität', 'Station Mensa']],
  ['Deichkamp', ['Gewerbegebiet am Deich', 'Haltestelle Deichkamp']],
  ['Bahnhofsviertel', ['Bahnhofshalle', 'Station Bahnhof Nord', 'Station Bahnhof Süd',
    'Bus Linie 1', 'Bus Linie 2', 'Bus Linie 3', 'Bus Linie 4', 'Bus Linie 5']]
];
const STADTTEILE = FUNDORTE.map(([s]) => s);
const ORTE_JE_STADTTEIL = new Map(FUNDORTE);

/** NULL-Zeilen unter den 65 erzeugten (Pflicht: Farbe 1, Wert 2, Finder 4, AbgeholtAm 9 NULL). */
const NULL_FARBE = 11;   // → 12/80 = 15 %
const NULL_WERT = 6;     // →  8/80 = 10 %
const NULL_FINDER = 6;   // → 10/80 = 12,5 %
const ABGEHOLT = 38;     // → 44/80 = 55 % gesetzt, 36/80 = 45 % NULL

/** Tagesgewicht: Wochenenden etwas häufiger. */
function tagesgewicht(datum) {
  return wochentag(datum) >= 6 ? 1.6 : 1;
}

function tageZwischen(von, bis) {
  const tage = [];
  for (let d = von; d <= bis; d = plusTage(d, 1)) tage.push(d);
  return tage;
}

/** Ein Versuch: liefert die 65 erzeugten Zeilen oder false, wenn eine Vorgabe verletzt ist. */
function erzeuge(z, pflicht, namen) {
  const pflichtNr = new Map(pflicht.map((p) => [p.FundNr, p]));

  // 1. Funddaten: Lücken zwischen den Pflicht-Nummern, Daten zwischen den Nachbar-Pflichtdaten (FundNr nach Datum).
  const datumJeNr = new Map();
  let unten = { nr: 0, datum: START };
  const grenzen = [...pflicht.map((p) => ({ nr: p.FundNr, datum: p.Funddatum })), { nr: GESAMT + 1, datum: ENDE }];
  for (const oben of grenzen) {
    const nummern = [];
    for (let nr = unten.nr + 1; nr < oben.nr; nr++) nummern.push(nr);
    if (nummern.length > 0) {
      const tage = tageZwischen(unten.datum, oben.datum);
      const gezogen = [];
      // Stadtfest 28./29.08.: in der Lücke über Ende August vier Funde am Festplatz fest einplanen
      const fest = unten.datum <= '2026-08-28' && oben.datum >= '2026-08-30'
        ? ['2026-08-28', '2026-08-29', '2026-08-29', '2026-08-30'] : [];
      gezogen.push(...fest);
      while (gezogen.length < nummern.length) gezogen.push(z.gewichtet(tage.map((t) => [t, tagesgewicht(t)])));
      gezogen.sort();
      nummern.forEach((nr, i) => datumJeNr.set(nr, gezogen[i]));
    }
    unten = oben;
  }
  if (!datumJeNr.has(1)) return false;
  datumJeNr.set(1, START);
  const nummern = [...datumJeNr.keys()].sort((a, b) => a - b);

  // 2. Kategorien (feste Anzahlen, gemischt) und Bezeichnungen
  const kategorien = z.mischen(KATEGORIE_ANZAHL.flatMap(([k, n]) => Array(n).fill(k)));
  const zeilenNeu = nummern.map((nr, i) => ({ FundNr: nr, Kategorie: kategorien[i], Funddatum: datumJeNr.get(nr) }));
  const schmuck = zeilenNeu.filter((r) => r.Kategorie === 'Schmuck');
  const uhren = z.ganz(3, Math.min(5, schmuck.length));
  const uhrZeilen = new Set(z.stichprobe(schmuck, uhren));
  for (const r of zeilenNeu) {
    r.Bezeichnung = uhrZeilen.has(r) ? 'Armbanduhr' : z.waehle(BEZEICHNUNGEN[r.Kategorie]);
  }

  // 3. Fundort/Stadtteil; Festplatz-Funde am Stadtfest-Wochenende
  const festTage = new Set(['2026-08-28', '2026-08-29', '2026-08-30']);
  let festplatz = 0;
  for (const r of zeilenNeu) {
    if (festTage.has(r.Funddatum) && festplatz < 4) {
      festplatz++;
      r.Stadtteil = 'Weserufer';
      r.Fundort = 'Festplatz';
    } else {
      r.Stadtteil = z.waehle(STADTTEILE);
      r.Fundort = z.waehle(ORTE_JE_STADTTEIL.get(r.Stadtteil));
    }
  }
  // mindestens eine erzeugte Armbanduhr im Hafenviertel oder der Altstadt mit Wert ≥ 10
  const uhrMitWert = [...uhrZeilen][0];
  uhrMitWert.Stadtteil = z.waehle(['Hafenviertel', 'Altstadt']);
  uhrMitWert.Fundort = z.waehle(ORTE_JE_STADTTEIL.get(uhrMitWert.Stadtteil));

  // 4. Farbe (NULL ≈ 15 %)
  const ohneFarbe = new Set(z.stichprobe(zeilenNeu, NULL_FARBE));
  for (const r of zeilenNeu) r.Farbe = ohneFarbe.has(r) ? null : z.waehle(FARBEN);

  // 5. Wert: NULL ≈ 10 %, genau 3 × 100 und 2 × 50, sonst Bereich der Kategorie ohne 50/100, alle ≤ 150
  const ohneWert = new Set(z.stichprobe(zeilenNeu.filter((r) => r !== uhrMitWert), NULL_WERT));
  const mitWert = zeilenNeu.filter((r) => !ohneWert.has(r));
  const hundert = new Set(z.stichprobe(mitWert.filter((r) => WERT_BEREICH[r.Kategorie][1] >= 100 && r !== uhrMitWert), 3));
  const fuenfzig = new Set(z.stichprobe(mitWert.filter((r) => !hundert.has(r) && r !== uhrMitWert &&
    WERT_BEREICH[r.Kategorie][0] <= 50 && WERT_BEREICH[r.Kategorie][1] >= 50), 2));
  for (const r of zeilenNeu) {
    if (ohneWert.has(r)) r.Wert = null;
    else if (hundert.has(r)) r.Wert = 100;
    else if (fuenfzig.has(r)) r.Wert = 50;
    else {
      const [min, max] = WERT_BEREICH[r.Kategorie];
      let w;
      do { w = z.ganz(min, max); } while (w === 50 || w === 100);
      r.Wert = w;
    }
  }

  // 6. Finder 'V. Nachname' (NULL ≈ 12 %), nie N. F…, nie „falter“
  const anonym = new Set(z.stichprobe(zeilenNeu, NULL_FINDER));
  for (const r of zeilenNeu) {
    if (anonym.has(r)) { r.Finder = null; continue; }
    let finder;
    do { finder = namen.finder(z.waehle(namen.vornamen), z.waehle(namen.nachnamen)); } while (!namen.finderErlaubt(finder));
    r.Finder = finder;
  }

  // 7. AbgeholtAm: 38 gesetzt, 0–21 Tage nach dem Fund, höchstens Datenstand; die ersten zwei am Fundtag
  const abgeholt = z.stichprobe(zeilenNeu, ABGEHOLT);
  const abgeholtSet = new Set(abgeholt);
  abgeholt.forEach((r, i) => {
    const maxTage = Math.min(21, Math.round((zuMinuten(ENDE) - zuMinuten(r.Funddatum)) / 1440));
    r.AbgeholtAm = plusTage(r.Funddatum, i < 2 ? 0 : z.ganz(0, maxTage));
  });
  for (const r of zeilenNeu) if (!abgeholtSet.has(r)) r.AbgeholtAm = null;

  // Prüfung, die nur durch Neuziehen erfüllbar ist (DS_PLANUNG A1-E2-05): Finderlohn-Top-3 in Schmuck/Elektronik
  // ohne Gleichstand an der Schnittkante (Rang 3 ≠ Rang 4).
  const werte = [...pflicht, ...zeilenNeu]
    .filter((r) => (r.Kategorie === 'Schmuck' || r.Kategorie === 'Elektronik') && r.Wert !== null)
    .map((r) => r.Wert).sort((a, b) => b - a);
  if (werte[2] === werte[3]) return false;
  return zeilenNeu;
}

function generiere(db, zufall, namen) {
  const pflicht = db.prepare('SELECT * FROM Fundsache ORDER BY FundNr').all();
  const neu = versuche(zufall, 'fundsachen', (z) => erzeuge(z, pflicht, namen));
  const einfuegen = db.prepare(`INSERT INTO Fundsache (FundNr, Bezeichnung, Kategorie, Farbe, Fundort, Stadtteil,
    Funddatum, Wert, Finder, AbgeholtAm) VALUES (@FundNr, @Bezeichnung, @Kategorie, @Farbe, @Fundort, @Stadtteil,
    @Funddatum, @Wert, @Finder, @AbgeholtAm)`);
  db.transaction(() => { for (const r of neu) einfuegen.run(r); })();
}

/** NULL-Anteil einer Spalte in Prozent. */
function nullAnteil(db, spalteName) {
  return wert(db, `SELECT 100.0 * SUM(CASE WHEN ${spalteName} IS NULL THEN 1 ELSE 0 END) / COUNT(*) FROM Fundsache`);
}

function abnahme(db) {
  const top5 = zeilen(db, 'SELECT FundNr, Wert FROM Fundsache ORDER BY Wert DESC LIMIT 5');
  const fundorteMitMehrerenStadtteilen = spalte(db,
    'SELECT Fundort FROM Fundsache GROUP BY Fundort HAVING COUNT(DISTINCT Stadtteil) > 1');
  return [
    // Tabelle „Abnahme-Prüfungen“
    gleich('Anzahl, kleinste und größte FundNr (80, 1, 80)',
      zeilen(db, 'SELECT COUNT(*), MIN(FundNr), MAX(FundNr) FROM Fundsache')[0], [80, 1, 80]),
    gleich('Beispiel 5 (Indizienkette 3/3): genau FundNr 36', zeilen(db, `
      SELECT FundNr, Bezeichnung, Wert, AbgeholtAm, Finder
      FROM Fundsache
      WHERE Bezeichnung LIKE '%Messing%'
        AND Funddatum BETWEEN '2026-06-01' AND '2026-07-31'
        AND Wert >= 400`), [[36, 'Messing-Kompass', 450, '2026-09-14', 'N. Falter']]),
    gleich("LIKE '%ompass%': genau 9, 36, 37",
      spalte(db, "SELECT FundNr FROM Fundsache WHERE Bezeichnung LIKE '%ompass%' ORDER BY FundNr"), [9, 36, 37]),
    gleich("LIKE '%essing%': genau 19, 36, 46, 61",
      spalte(db, "SELECT FundNr FROM Fundsache WHERE Bezeichnung LIKE '%essing%' ORDER BY FundNr"), [19, 36, 46, 61]),
    gleich("Finder 'N. F…' oder '…falter…': genau 36",
      spalte(db, "SELECT FundNr FROM Fundsache WHERE Finder LIKE 'N. F%' OR Finder LIKE '%falter%' ORDER BY FundNr"), [36]),
    gleich('Die fünf höchsten Werte: 36, 51, 44, 42, dann ein Wert ≤ 150',
      [top5.slice(0, 4).map((r) => r[0]), top5[4] && top5[4][1] !== null && top5[4][1] <= 150],
      [[36, 51, 44, 42], true]),
    gleich('AbgeholtAm < Funddatum: 0', wert(db, 'SELECT COUNT(*) FROM Fundsache WHERE AbgeholtAm < Funddatum'), 0),
    bereich('NULL-Anteil Farbe (%)', nullAnteil(db, 'Farbe'), 10, 20),
    bereich('NULL-Anteil Wert (%)', nullAnteil(db, 'Wert'), 8, 15),
    bereich('NULL-Anteil Finder (%)', nullAnteil(db, 'Finder'), 8, 15),
    bereich('NULL-Anteil AbgeholtAm (%)', nullAnteil(db, 'AbgeholtAm'), 40, 50),
    bereich('AbgeholtAm = Funddatum: mindestens 2',
      wert(db, 'SELECT COUNT(*) FROM Fundsache WHERE AbgeholtAm = Funddatum'), 2),
    gleich('Wert = 100: genau 3', wert(db, 'SELECT COUNT(*) FROM Fundsache WHERE Wert = 100'), 3),
    bereich("Septemberwoche (BETWEEN '2026-09-14' AND '2026-09-20'): mindestens 3",
      wert(db, "SELECT COUNT(*) FROM Fundsache WHERE Funddatum BETWEEN '2026-09-14' AND '2026-09-20'"), 3),
    gleich('Septemberwoche enthält die Grenzdaten 75 und 80', spalte(db,
      "SELECT FundNr FROM Fundsache WHERE FundNr IN (75, 80) AND Funddatum BETWEEN '2026-09-14' AND '2026-09-20' ORDER BY FundNr"),
    [75, 80]),

    // Erwartete Ergebnisse der Beispielabfragen
    gleich('Beispiel 1: Pflicht 61, 42, 27 unter den offenen Fundsachen im Hafenviertel', spalte(db, `
      SELECT FundNr FROM Fundsache
      WHERE Stadtteil = 'Hafenviertel' AND AbgeholtAm IS NULL AND FundNr IN (27, 42, 61)
      ORDER BY Funddatum DESC`), [61, 42, 27]),
    gleich("Beispiel 2: LIKE '%kompass%' genau 9, 36, 37",
      spalte(db, "SELECT FundNr FROM Fundsache WHERE Bezeichnung LIKE '%kompass%' ORDER BY FundNr"), [9, 36, 37]),
    gleich('Beispiel 4: Messing im Juni/Juli genau 36, 46', spalte(db, `
      SELECT FundNr FROM Fundsache
      WHERE Bezeichnung LIKE '%Messing%' AND Funddatum BETWEEN '2026-06-01' AND '2026-07-31'
      ORDER BY FundNr`), [36, 46]),
    gleich('Beispiel 7: die drei wertvollsten 36 (450), 51 (390), 44 (320)',
      zeilen(db, 'SELECT FundNr, Wert FROM Fundsache ORDER BY Wert DESC LIMIT 3'), [[36, 450], [51, 390], [44, 320]]),
    gleich('Beispiel 8: Finderlohn 75 (1.5) und 80 (0.4)', zeilen(db, `
      SELECT FundNr, Wert * 0.05 FROM Fundsache WHERE FundNr IN (75, 80) ORDER BY FundNr`), [[75, 1.5], [80, 0.4]]),

    // Vorgaben aus „Datenumfang und Verteilung“
    gleich('FundNr aufsteigend nach Funddatum', (() => {
      const d = spalte(db, 'SELECT Funddatum FROM Fundsache ORDER BY FundNr');
      return d.every((x, i) => i === 0 || d[i - 1] <= x);
    })(), true),
    gleich('Funddatum im Zeitraum 2026-04-01 … 2026-09-20', wert(db,
      "SELECT COUNT(*) FROM Fundsache WHERE Funddatum < '2026-04-01' OR Funddatum > '2026-09-20'"), 0),
    gleich('Erzeugte Werte ≤ 150 (nur Pflicht 36, 51, 44, 42 darüber)', spalte(db,
      'SELECT FundNr FROM Fundsache WHERE Wert > 150 ORDER BY FundNr'), [36, 42, 44, 51]),
    gleich('Wert = 50: genau 2', wert(db, 'SELECT COUNT(*) FROM Fundsache WHERE Wert = 50'), 2),
    gleich('Juni–Juli: nur FundNr 36 mit Wert ≥ 400', spalte(db,
      "SELECT FundNr FROM Fundsache WHERE Funddatum BETWEEN '2026-06-01' AND '2026-07-31' AND Wert >= 400"), [36]),
    gleich("„uhr“ nur in Armbanduhr und Kinderuhr", spalte(db,
      "SELECT DISTINCT Bezeichnung FROM Fundsache WHERE Bezeichnung LIKE '%uhr%' ORDER BY Bezeichnung"),
    ['Armbanduhr', 'Kinderuhr']),
    bereich('Erzeugte Armbanduhren (3–5)', wert(db,
      "SELECT COUNT(*) FROM Fundsache WHERE Bezeichnung = 'Armbanduhr' AND FundNr != 27"), 3, 5),
    bereich('Erzeugte Armbanduhr im Hafenviertel/der Altstadt mit Wert ≥ 10', wert(db, `
      SELECT COUNT(*) FROM Fundsache WHERE Bezeichnung = 'Armbanduhr' AND FundNr != 27
        AND Stadtteil IN ('Hafenviertel', 'Altstadt') AND Wert >= 10`), 1),
    gleich('Fundort passt immer zum Stadtteil', fundorteMitMehrerenStadtteilen, []),
    gleich('Abholung höchstens 21 Tage nach dem Fund (außer FundNr 36), höchstens Datenstand', spalte(db, `
      SELECT FundNr FROM Fundsache
      WHERE AbgeholtAm > '2026-09-20' OR julianday(AbgeholtAm) - julianday(Funddatum) > 21
      ORDER BY FundNr`), [36]),
    gleich('Nur FundNr 36 mit mehr als 60 Tagen zwischen Fund und Abholung', spalte(db,
      'SELECT FundNr FROM Fundsache WHERE julianday(AbgeholtAm) - julianday(Funddatum) > 60'), [36]),
    gleich('Finder immer im Format „V. Nachname“', wert(db,
      "SELECT COUNT(*) FROM Fundsache WHERE Finder IS NOT NULL AND Finder NOT GLOB '[A-Z]. [A-ZÄÖÜ]*'"), 0),
    bereich('Festplatz am Stadtfest-Wochenende (28.–30.08.): mindestens 3', wert(db, `
      SELECT COUNT(*) FROM Fundsache WHERE Fundort = 'Festplatz' AND Funddatum BETWEEN '2026-08-28' AND '2026-08-30'`), 3),
    gleich('DS_PLANUNG A1-E2-05: Finderlohn-Top-3 (Schmuck/Elektronik) ohne Gleichstand an Rang 3/4', (() => {
      const w = spalte(db, `SELECT Wert FROM Fundsache WHERE Kategorie IN ('Schmuck', 'Elektronik') AND Wert IS NOT NULL
        ORDER BY Wert DESC LIMIT 4`);
      return w[2] !== w[3];
    })(), true)
  ];
}

module.exports = { generiere, abnahme };
