'use strict';
// Verhör-Kontexte V1–V3 (seed/datenbanken/verhoer/<kontext>/, VERHOER_KONTEXTE.md, Plan Phase 3 Task 11):
// kuratierte DBs ohne Generator, Pflicht-Randfälle je Blueprint (DS_PLANUNG „Verhör-Blueprint: Verhör 1/2/3“),
// Beispielabfragen EH-konform (Abimodus streng), Randfall-Varianten mit entlarvter Fehlabfrage.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const bau = require('../scripts/db_bauen');
const { parse } = require('../src/sql/parser');
const { pruefeRegeln } = require('../src/sql/regeln');
const { ladeSchema } = require('./hilfen_schema');
const namenJson = require('../seed/datenbanken/namen.json');

const SEED = path.join(__dirname, '..', 'seed', 'datenbanken');
const KONTEXTE = ['verhoer/bibliothek', 'verhoer/buergerbus', 'verhoer/kiosk'];

/** Erwartete Varianten je Kontext (LIESMICH „Randfall-Varianten“; „entfällt“ = keine Datei). */
const VARIANTEN = {
  'verhoer/bibliothek': ['gleichnamig'],
  'verhoer/buergerbus': ['null', 'gleichnamig'],
  'verhoer/kiosk': ['null', 'gleichnamig']
};

const hauptCache = new Map();
function haupt(name) {
  if (!hauptCache.has(name)) hauptCache.set(name, bau.ladeHaupt(name));
  return hauptCache.get(name);
}
const alle = (db, sql, ...p) => db.prepare(sql).raw().all(...p);
const wert = (db, sql, ...p) => db.prepare(sql).pluck().get(...p);
const spalte = (db, sql, ...p) => db.prepare(sql).pluck().all(...p);
/** Ergebnis als sortierte Multimenge (Vergleich wie der Prüfer, ohne Reihenfolge). */
const menge = (db, sql) => alle(db, sql).map((z) => JSON.stringify(z.map((w) => (typeof w === 'number' ? Math.round(w * 1e6) / 1e6 : w)))).sort();

// ---------------------------------------------------------------- Bau-Mechanik

test('Verhör-DBs: Namen, kuratiert, eigene Module, Reihenfolge der Übungs-DBs unverändert', () => {
  assert.deepEqual(bau.VERHOER_DBS, KONTEXTE);
  assert.deepEqual(bau.REIHENFOLGE, ['fundbuero', 'stadtrad', 'stadtfest', 'tus', 'detektei', 'datenspuren', 'eisdiele']);
  assert.deepEqual(bau.ALLE_DBS, [...bau.REIHENFOLGE, ...KONTEXTE]);
  for (const name of KONTEXTE) {
    assert.ok(bau.KURATIERT.includes(name), name);
    assert.equal(bau.modulName(name), name.replace('/', '_'));
    const modul = bau.ladeModul(name);
    assert.ok(modul && typeof modul.abnahme === 'function', name);
    assert.equal(modul.generiere, undefined, `${name}: kuratiert, kein Generator`);
  }
});

for (const name of KONTEXTE) {
  test(`${name}: Bau ohne Generator, Abnahme-Prüfungen und Beispielabfragen grün`, () => {
    const { db, bericht } = bau.baueDb(name);
    assert.equal(bericht.status, 'fertig', bericht.meldungen.join('; '));
    assert.deepEqual(bericht.schritte, ['schema', 'pflicht', 'kuratiert', 'abnahme']);
    assert.ok(bericht.abnahme.length >= 10, `${bericht.abnahme.length} Abnahme-Prüfungen`);
    for (const p of bericht.abnahme) assert.ok(p.ok, `${p.name}: ist ${JSON.stringify(p.ist)}, soll ${JSON.stringify(p.soll)}`);
    const liesmich = fs.readFileSync(path.join(SEED, name, 'LIESMICH.md'), 'utf8');
    const anzahl = bau.extrahiereSqlBloecke(liesmich).filter((b) => !b.fehlabfrage).length;
    assert.ok(anzahl >= 8, `${anzahl} Beispielabfragen`);
    assert.equal(bericht.beispiele.filter((b) => !b.fehlabfrage && b.ok).length, anzahl);
    db.close();
  });

  test(`${name}: basis.sql byteidentisch reproduzierbar, Varianten bauen`, () => {
    const { db } = bau.baueDb(name);
    const eingecheckt = fs.readFileSync(path.join(SEED, name, 'basis.sql'), 'utf8');
    assert.equal(bau.basisText(name, db), eingecheckt);
    assert.match(eingecheckt, /kuratiert, kein Generator/);
    assert.deepEqual(bau.varianten(name), VARIANTEN[name]);
    for (const typ of VARIANTEN[name]) bau.baueVariante(name, typ).close();
    db.close();
  });

  test(`${name}: Beispielabfragen der LIESMICH im Abimodus streng ohne Fehler`, () => {
    const schema = ladeSchema(name);
    const liesmich = fs.readFileSync(path.join(SEED, name, 'LIESMICH.md'), 'utf8');
    for (const b of bau.extrahiereSqlBloecke(liesmich)) {
      const { ast, fehler } = parse(b.sql);
      assert.deepEqual(fehler, [], `Parserfehler (Zeile ${b.zeile}): ${b.sql}`);
      const d = pruefeRegeln(ast, { abimodus: 'streng', schema });
      if (b.fehlabfrage) {
        // Fehlabfragen in der LIESMICH sind nur solche, die die Regeln erkennen (die übrigen stehen in den Tests)
        const falle = (/\((P\d+)\)/.exec(b.sql.split('\n')[0]) || [])[1];
        assert.ok(d.length >= 1, `Fehlabfrage ohne Diagnose (Zeile ${b.zeile})`);
        if (falle) assert.ok(d.some((x) => x.falle === falle), `Falle ${falle} nicht erkannt (Zeile ${b.zeile})`);
      } else {
        assert.deepEqual(d.filter((x) => x.art === 'fehler'), [], `Zeile ${b.zeile}: ${b.sql}`);
      }
    }
  });

  test(`${name}: Namen frei erfunden (namen.json), keine reservierten Nachnamen`, () => {
    const db = haupt(name);
    const tabellen = spalte(db, "SELECT name FROM sqlite_master WHERE type = 'table'");
    const vor = new Set(namenJson.vornamen);
    const nach = new Set(namenJson.nachnamen);
    let geprueft = 0;
    for (const t of tabellen) {
      const spalten = db.prepare(`PRAGMA table_info("${t}")`).all().map((s) => s.name);
      for (const s of spalten.filter((x) => ['Vorname', 'Nachname', 'Autor'].includes(x))) {
        for (const w of spalte(db, `SELECT DISTINCT "${s}" FROM "${t}" WHERE "${s}" IS NOT NULL`)) {
          geprueft++;
          assert.ok((s === 'Vorname' ? vor : nach).has(w), `${t}.${s} = ${w} nicht in namen.json`);
          assert.ok(!namenJson.reservierteNachnamen.includes(w), `${t}.${s} = ${w} ist reserviert`);
        }
      }
    }
    assert.ok(geprueft > 0);
  });
}

test('ladeAlle() liefert die Verhör-DBs mit (Name verhoer/<kontext>), Varianten als Buffer', () => {
  const daten = bau.ladeAlle(SEED, { namen: KONTEXTE });
  assert.deepEqual(Object.keys(daten), KONTEXTE);
  for (const name of KONTEXTE) {
    assert.ok(Buffer.isBuffer(daten[name].haupt));
    assert.deepEqual(Object.keys(daten[name].varianten), VARIANTEN[name]);
  }
  // Standard: alle Übungs- und Verhör-DBs
  const quellen = fs.mkdtempSync(path.join(os.tmpdir(), 'verhoer-'));
  assert.throws(() => bau.ladeAlle(quellen), /fundbuero: basis\.sql fehlt/);
});

test('lauf --db verhoer/kiosk --pruefen: identisch, Varianten ok', () => {
  const zeilen = [];
  assert.equal(bau.lauf({ nur: 'verhoer/kiosk', pruefen: true, log: (t) => zeilen.push(t) }), 0, zeilen.join('\n'));
  const text = zeilen.join('\n');
  assert.match(text, /verhoer\/kiosk: identisch/);
  for (const typ of VARIANTEN['verhoer/kiosk']) assert.match(text, new RegExp(`verhoer/kiosk/${typ}: ok`));
});

// ---------------------------------------------------------------- V1 Stadtbibliothek

test('V1: Pflicht-Randfälle NULL, Ausschnitt-Falle, LIKE, Grenzjahre, Magazin, Top 5', () => {
  const db = haupt('verhoer/bibliothek');
  const n = wert(db, 'SELECT COUNT(*) FROM Medium');
  assert.ok(n >= 55 && n <= 65, `${n} Medien`);
  const anteil = wert(db, 'SELECT COUNT(*) FROM Medium WHERE AusgeliehenBis IS NULL') / n;
  assert.ok(anteil >= 0.35 && anteil <= 0.45, `Anteil verfügbar ${anteil}`);
  assert.equal(wert(db, 'SELECT COUNT(*) FROM Medium WHERE Preis IS NULL'), 4);
  // Ausschnitt-Falle: genau drei Titel doppelt (zwei Exemplare)
  assert.deepEqual(alle(db, 'SELECT COUNT(*) FROM Medium GROUP BY Titel HAVING COUNT(*) > 1'), [[2], [2], [2]]);
  // LIKE (A1-V-06)
  assert.equal(wert(db, "SELECT COUNT(*) FROM Medium WHERE Titel LIKE 'Der %'"), 5);
  const richtig = "SELECT MedienNr FROM Medium WHERE Titel LIKE 'Der %' AND Autor LIKE '_____'";
  assert.ok(spalte(db, richtig).length >= 2);
  for (const falsch of [
    "SELECT MedienNr FROM Medium WHERE Titel LIKE 'Der%' AND Autor LIKE '_____'",
    "SELECT MedienNr FROM Medium WHERE Titel LIKE '%der %' AND Autor LIKE '_____'",
    "SELECT MedienNr FROM Medium WHERE Titel LIKE 'Der %' AND Autor LIKE '_____%'",
    "SELECT MedienNr FROM Medium WHERE Titel LIKE 'Der %' AND Autor LIKE '____'"
  ]) assert.notDeepEqual(menge(db, falsch), menge(db, richtig), falsch);
  assert.equal(wert(db, "SELECT COUNT(*) FROM Medium WHERE Titel = 'Derbyfieber' AND Autor LIKE '_____'"), 1);
  assert.equal(wert(db, "SELECT COUNT(*) FROM Medium WHERE Titel LIKE 'Die Insel der %' AND Autor LIKE '_____'"), 1);
  assert.equal(wert(db, "SELECT COUNT(*) FROM Medium WHERE Titel LIKE 'Der %' AND Autor = 'Rabe'"), 1);
  // Grenzjahre (A1-V-07, A1-V-10)
  for (const [genre, jahr] of [['Roman', 2000], ['Roman', 1999], ['Sachbuch', 2010], ['Sachbuch', 2011]]) {
    assert.ok(wert(db, 'SELECT COUNT(*) FROM Medium WHERE Genre = ? AND Erscheinungsjahr = ?', genre, jahr) >= 1, `${genre} ${jahr}`);
  }
  for (const jahr of [2015, 2016]) {
    assert.ok(wert(db, "SELECT COUNT(*) FROM Medium WHERE Medienart = 'Hörbuch' AND Erscheinungsjahr = ?", jahr) >= 1);
  }
  const jahre = "SELECT MedienNr FROM Medium WHERE Genre IN ('Roman', 'Sachbuch') AND Erscheinungsjahr BETWEEN 2000 AND 2010";
  const ohneKlammern = "SELECT MedienNr FROM Medium WHERE Genre = 'Roman' OR Genre = 'Sachbuch' AND Erscheinungsjahr BETWEEN 2000 AND 2010";
  assert.notDeepEqual(menge(db, ohneKlammern), menge(db, jahre));
  // Bedingungslogik (A1-V-05)
  const mit = "SELECT MedienNr FROM Medium WHERE (Genre = 'Krimi' OR Genre = 'Thriller') AND Preis > 15";
  const ohne = "SELECT MedienNr FROM Medium WHERE Genre = 'Krimi' OR Genre = 'Thriller' AND Preis > 15";
  assert.notDeepEqual(menge(db, mit), menge(db, ohne));
  assert.ok(wert(db, "SELECT COUNT(*) FROM Medium WHERE Genre = 'Thriller' AND Preis <= 15") >= 1);
  assert.ok(wert(db, "SELECT COUNT(*) FROM Medium WHERE Genre = 'Krimi' AND Preis <= 15") >= 1);
  // Magazin (A1-V-09)
  assert.deepEqual(alle(db, "SELECT COUNT(*), COUNT(Preis) FROM Medium WHERE Standort = 'Magazin'"), [[6, 5]]);
  // Top 5 (A1-V-11): kein Gleichstand an der Schnittkante, teurerer Thriller ausgeliehen
  const preise = spalte(db, `SELECT Preis FROM Medium
    WHERE (Genre = 'Krimi' OR Genre = 'Thriller') AND AusgeliehenBis IS NULL AND Preis IS NOT NULL ORDER BY Preis DESC`);
  assert.ok(preise[4] > preise[5], `Platz 5 ${preise[4]} vs. Platz 6 ${preise[5]}`);
  assert.ok(wert(db, "SELECT MAX(Preis) FROM Medium WHERE Genre = 'Thriller' AND AusgeliehenBis IS NOT NULL") > preise[0]);
  const top = "SELECT MedienNr FROM Medium WHERE (Genre = 'Krimi' OR Genre = 'Thriller') AND AusgeliehenBis IS NULL ORDER BY Preis DESC LIMIT 5";
  const topOhneKlammern = "SELECT MedienNr FROM Medium WHERE Genre = 'Krimi' OR Genre = 'Thriller' AND AusgeliehenBis IS NULL ORDER BY Preis DESC LIMIT 5";
  assert.notDeepEqual(menge(db, topOhneKlammern), menge(db, top));
});

test('V1 Variante gleichnamig entlarvt DISTINCT bei der Titelsuche (A1-V-06)', () => {
  const richtig = "SELECT Titel, Autor FROM Medium WHERE Titel LIKE 'Der %' AND Autor LIKE '_____'";
  const falsch = "SELECT DISTINCT Titel, Autor FROM Medium WHERE Titel LIKE 'Der %' AND Autor LIKE '_____'";
  assert.deepEqual(menge(haupt('verhoer/bibliothek'), falsch), menge(haupt('verhoer/bibliothek'), richtig));
  const v = bau.baueVariante('verhoer/bibliothek', 'gleichnamig');
  assert.notDeepEqual(menge(v, falsch), menge(v, richtig));
  v.close();
});

// ---------------------------------------------------------------- V2 Bürgerbus

test('V2: Pflicht-Randfälle zwei FKs, NULL, Gleichnamige, FahrerNr 4, Sitzplätze, Kreuzprodukt, Ortsteile, Top 5', () => {
  const db = haupt('verhoer/buergerbus');
  assert.deepEqual(alle(db, `SELECT (SELECT COUNT(*) FROM Haltestelle), (SELECT COUNT(*) FROM Fahrer),
    (SELECT COUNT(*) FROM Bus)`), [[12, 8, 4]]);
  const fahrten = wert(db, 'SELECT COUNT(*) FROM Fahrt');
  assert.ok(fahrten >= 65 && fahrten <= 75, `${fahrten} Fahrten`);
  assert.equal(wert(db, 'SELECT COUNT(*) FROM Fahrer, Bus'), 32);
  assert.deepEqual(spalte(db, 'SELECT Sitzplaetze FROM Bus ORDER BY Sitzplaetze'), [8, 8, 9, 12]);
  // zwei FKs auf dieselbe Tabelle
  assert.equal(wert(db, 'SELECT COUNT(*) FROM Fahrt WHERE StartHalt = ZielHalt'), 0);
  assert.equal(wert(db, 'SELECT COUNT(DISTINCT Name) FROM Haltestelle'), 12);
  // NULL: 7 Fahrten ohne Zählung, verschiedene Fahrer; Fahrgastzahl 0 ist etwas anderes
  assert.deepEqual(alle(db, 'SELECT COUNT(*), COUNT(DISTINCT FahrerNr) FROM Fahrt WHERE Fahrgaeste IS NULL'), [[7, 7]]);
  assert.ok(wert(db, 'SELECT COUNT(*) FROM Fahrt WHERE Fahrgaeste = 0') >= 1);
  // Fahrgäste passen in den Bus
  assert.equal(wert(db, 'SELECT COUNT(*) FROM Fahrt, Bus WHERE Fahrt.Kennzeichen = Bus.Kennzeichen AND Fahrt.Fahrgaeste > Bus.Sitzplaetze'), 0);
  // Gleichnamige (A2-V-08)
  assert.deepEqual(spalte(db, "SELECT FahrerNr FROM Fahrer WHERE Vorname = 'Hauke' AND Nachname = 'Rohlfs' ORDER BY FahrerNr"), [2, 7]);
  const gross = `SELECT DISTINCT Fahrer.FahrerNr FROM Fahrer, Fahrt, Bus
    WHERE Fahrer.FahrerNr = Fahrt.FahrerNr AND Fahrt.Kennzeichen = Bus.Kennzeichen AND Bus.Sitzplaetze > 8`;
  const grossNr = spalte(db, gross);
  assert.ok(grossNr.includes(2) && grossNr.includes(7));
  assert.ok(grossNr.length < 8, 'mindestens ein Fahrer fuhr nur Busse mit 8 Sitzplätzen');
  const namen = `SELECT DISTINCT Fahrer.Vorname, Fahrer.Nachname FROM Fahrer, Fahrt, Bus
    WHERE Fahrer.FahrerNr = Fahrt.FahrerNr AND Fahrt.Kennzeichen = Bus.Kennzeichen AND Bus.Sitzplaetze > 8`;
  assert.equal(alle(db, namen).length, grossNr.length - 1);
  const mitAcht = namen.replace('> 8', '>= 8');
  assert.notDeepEqual(menge(db, mitAcht), menge(db, namen));
  // FahrerNr 4 (A2-V-06): genau 6 und mehr als 6
  assert.ok(wert(db, 'SELECT COUNT(*) FROM Fahrt WHERE FahrerNr = 4 AND Fahrgaeste = 6') >= 1);
  assert.ok(wert(db, 'SELECT COUNT(*) FROM Fahrt WHERE FahrerNr = 4 AND Fahrgaeste > 6') >= 2);
  // Ortsteilwechsel (A2-V-12)
  const wechsel = (bedingung) => wert(db, `SELECT COUNT(*) FROM Fahrt, Haltestelle s1, Haltestelle s2
    WHERE Fahrt.StartHalt = s1.HaltID AND Fahrt.ZielHalt = s2.HaltID AND ${bedingung}`);
  assert.ok(wechsel("s1.Ortsteil = 'Nordheide' AND s2.Ortsteil = 'Nordheide'") >= 1);
  assert.ok(wechsel("s1.Ortsteil = 'Nordheide' AND s2.Ortsteil != 'Nordheide'") >= 2);
  assert.ok(wechsel("s1.Ortsteil != 'Nordheide' AND s2.Ortsteil = 'Nordheide'") >= 2);
  // Top 5 (A2-V-11)
  const zahlen = spalte(db, 'SELECT Fahrgaeste FROM Fahrt WHERE Fahrgaeste IS NOT NULL ORDER BY Fahrgaeste DESC');
  assert.ok(zahlen[4] > zahlen[5], `Platz 5 ${zahlen[4]} vs. Platz 6 ${zahlen[5]}`);
  // Zeitraum September/Oktober 2026
  assert.deepEqual(alle(db, 'SELECT MIN(Datum) >= \'2026-09-01\', MAX(Datum) <= \'2026-10-31\' FROM Fahrt'), [[1, 1]]);
});

test('V2 Variante null entlarvt eine Zählung über Fahrgaeste (A2-V-10), gleichnamig den Namensfilter (A2-V-06)', () => {
  const richtigN = `SELECT Fahrt.FahrtNr, Fahrt.Datum, Fahrer.Nachname FROM Fahrt, Fahrer
    WHERE Fahrt.FahrerNr = Fahrer.FahrerNr AND Fahrt.Fahrgaeste IS NULL`;
  const falschN = `SELECT Fahrt.FahrtNr, Fahrt.Datum, Fahrer.Nachname FROM Fahrt, Fahrer, Bus
    WHERE Fahrt.FahrerNr = Fahrer.FahrerNr AND Fahrt.Kennzeichen = Bus.Kennzeichen AND Fahrt.Fahrgaeste IS NULL`;
  const h = haupt('verhoer/buergerbus');
  assert.deepEqual(menge(h, falschN), menge(h, richtigN));
  const vn = bau.baueVariante('verhoer/buergerbus', 'null');
  assert.notDeepEqual(menge(vn, falschN), menge(vn, richtigN));
  vn.close();

  const vier = wert(h, 'SELECT Nachname FROM Fahrer WHERE FahrerNr = 4');
  const richtig = `SELECT Fahrt.FahrtNr FROM Fahrt, Fahrer
    WHERE Fahrt.FahrerNr = Fahrer.FahrerNr AND Fahrer.FahrerNr = 4 AND Fahrt.Fahrgaeste > 6`;
  const falsch = `SELECT Fahrt.FahrtNr FROM Fahrt, Fahrer
    WHERE Fahrt.FahrerNr = Fahrer.FahrerNr AND Fahrer.Nachname = '${vier}' AND Fahrt.Fahrgaeste > 6`;
  assert.deepEqual(menge(h, falsch), menge(h, richtig));
  const v = bau.baueVariante('verhoer/buergerbus', 'gleichnamig');
  assert.notDeepEqual(menge(v, falsch), menge(v, richtig));
  v.close();
});

// ---------------------------------------------------------------- V3 Schulkiosk

const UMSATZ_HELFER = `SELECT Helfer.HelferNr, SUM(Posten.Anzahl * Produkt.Preis)
  FROM Helfer, Schicht, Verkauf, Posten, Produkt
  WHERE Helfer.HelferNr = Schicht.HelferNr AND Schicht.SchichtNr = Verkauf.SchichtNr
    AND Verkauf.VerkaufNr = Posten.VerkaufNr AND Posten.ProduktNr = Produkt.ProduktNr
  GROUP BY Helfer.HelferNr`;

test('V3: Pflicht-Randfälle COUNT/SUM, Gleichnamige, Gleichstand, Produkt ohne Verkauf, HAVING-Grenzen, Top 3', () => {
  const db = haupt('verhoer/kiosk');
  assert.deepEqual(alle(db, 'SELECT (SELECT COUNT(*) FROM Produkt), (SELECT COUNT(*) FROM Helfer)'), [[14, 10]]);
  const verkaeufe = wert(db, 'SELECT COUNT(*) FROM Verkauf');
  const posten = wert(db, 'SELECT COUNT(*) FROM Posten');
  assert.ok(verkaeufe >= 110 && verkaeufe <= 130, `${verkaeufe} Verkäufe`);
  assert.ok(posten >= 185 && posten <= 215, `${posten} Posten`);
  // jeder Verkauf hat mindestens einen Posten; Zeitpunkt passt zum Datum der Schicht
  assert.equal(wert(db, 'SELECT COUNT(*) FROM Verkauf WHERE VerkaufNr NOT IN (SELECT VerkaufNr FROM Posten)'), 0);
  assert.equal(wert(db, `SELECT COUNT(*) FROM Verkauf, Schicht WHERE Verkauf.SchichtNr = Schicht.SchichtNr
    AND substr(Verkauf.Zeitpunkt, 1, 10) != Schicht.Datum`), 0);
  // COUNT ↔ SUM (Brötchen)
  const broetchen = alle(db, `SELECT COUNT(*), SUM(Posten.Anzahl), MAX(Posten.Anzahl) FROM Posten, Produkt
    WHERE Posten.ProduktNr = Produkt.ProduktNr AND Produkt.Kategorie = 'Brötchen'`)[0];
  assert.ok(broetchen[1] > broetchen[0] && broetchen[2] === 4, JSON.stringify(broetchen));
  // Gleichnamige
  assert.deepEqual(alle(db, "SELECT HelferNr, Klasse FROM Helfer WHERE Vorname = 'Jule' AND Nachname = 'Kahrs' ORDER BY HelferNr"),
    [[1, '8b'], [2, '10a']]);
  // Gleichstand der Kategorien
  assert.deepEqual(alle(db, "SELECT Kategorie, COUNT(*) FROM Produkt WHERE Kategorie IN ('Brötchen', 'Getränk') GROUP BY Kategorie"),
    [['Brötchen', 4], ['Getränk', 4]]);
  // Produkt ohne Verkauf
  assert.deepEqual(spalte(db, `SELECT Bezeichnung FROM Produkt WHERE ProduktNr NOT IN (SELECT ProduktNr FROM Posten)`),
    ['Apfelschorle 0,5 l']);
  // Grenze HAVING
  assert.equal(wert(db, "SELECT AVG(Preis) FROM Produkt WHERE Kategorie = 'Snack'"), 1.5);
  const umsatz = alle(db, UMSATZ_HELFER);
  assert.equal(umsatz.filter((u) => u[1] === 50).length, 1, JSON.stringify(umsatz));
  assert.ok(umsatz.filter((u) => u[1] > 50).length >= 2, JSON.stringify(umsatz));
  const jule = umsatz.filter((u) => u[0] === 1 || u[0] === 2).map((u) => u[1]);
  assert.ok(jule.every((u) => u < 50) && jule[0] + jule[1] > 50, `Jule Kahrs: ${jule}`);
  // Top 3 Produkte nach Umsatz: paarweise verschieden und verschieden vom vierten
  const top = spalte(db, `SELECT SUM(Posten.Anzahl * Produkt.Preis) AS Umsatz FROM Posten, Produkt
    WHERE Posten.ProduktNr = Produkt.ProduktNr GROUP BY Produkt.ProduktNr ORDER BY Umsatz DESC`);
  assert.ok(top[0] > top[1] && top[1] > top[2] && top[2] > top[3], JSON.stringify(top.slice(0, 4)));
  // alle Geldbeträge exakt (Vielfache von 0,25 €) – keine Rundungsgrenzfälle bei HAVING > 50 bzw. > 1.50
  assert.equal(wert(db, 'SELECT COUNT(*) FROM Produkt WHERE Preis * 4 != CAST(Preis * 4 AS INTEGER)'), 0);
});

test('V3 Vervielfachung (A3-V-10): ohne Posten.VerkaufNr = Verkauf.VerkaufNr plausibel, aber zu hoch', () => {
  const db = haupt('verhoer/kiosk');
  const bedingung = `Posten.ProduktNr = Produkt.ProduktNr AND Produkt.Bezeichnung = 'Obstbecher'
    AND Verkauf.Zahlart = 'Karte' AND Verkauf.Zeitpunkt >= '2026-09-25 11:00'`;
  const falsch = wert(db, `SELECT SUM(Posten.Anzahl * Produkt.Preis) FROM Verkauf, Posten, Produkt WHERE ${bedingung}`);
  const richtig = wert(db, `SELECT SUM(Posten.Anzahl * Produkt.Preis) FROM Verkauf, Posten, Produkt
    WHERE Posten.VerkaufNr = Verkauf.VerkaufNr AND ${bedingung}`);
  assert.ok(richtig > 0 && falsch > richtig, `${falsch} vs. ${richtig}`);
  assert.ok(falsch <= 20, `zu hohe Summe ${falsch} soll nicht absurd wirken`);
});

test('V3 Varianten: null entlarvt COUNT(Preis) (A3-V-05), gleichnamig das Gruppieren nach Bezeichnung (A3-V-06)', () => {
  const h = haupt('verhoer/kiosk');
  const richtigN = 'SELECT Kategorie, COUNT(*) FROM Produkt GROUP BY Kategorie';
  const falschN = 'SELECT Kategorie, COUNT(Preis) FROM Produkt GROUP BY Kategorie';
  assert.deepEqual(menge(h, falschN), menge(h, richtigN));
  const vn = bau.baueVariante('verhoer/kiosk', 'null');
  assert.notDeepEqual(menge(vn, falschN), menge(vn, richtigN));
  // AVG ignoriert NULL: Teure Kategorien (A3-V-07) bleiben gleich
  const teuer = 'SELECT Kategorie FROM Produkt GROUP BY Kategorie HAVING AVG(Preis) > 1.50';
  assert.deepEqual(menge(vn, teuer), menge(h, teuer));
  vn.close();

  const richtig = `SELECT Produkt.ProduktNr, Produkt.Bezeichnung, SUM(Posten.Anzahl) FROM Produkt, Posten
    WHERE Produkt.ProduktNr = Posten.ProduktNr GROUP BY Produkt.ProduktNr, Produkt.Bezeichnung`;
  const falsch = `SELECT MIN(Produkt.ProduktNr), Produkt.Bezeichnung, SUM(Posten.Anzahl) FROM Produkt, Posten
    WHERE Produkt.ProduktNr = Posten.ProduktNr GROUP BY Produkt.Bezeichnung`;
  assert.deepEqual(menge(h, falsch), menge(h, richtig));
  const v = bau.baueVariante('verhoer/kiosk', 'gleichnamig');
  assert.notDeepEqual(menge(v, falsch), menge(v, richtig));
  // Top 3 nach Umsatz und Helfer-Umsätze bleiben unverändert (Variante stört A3-V-08/-11 nicht)
  const top3 = `SELECT Produkt.ProduktNr FROM Posten, Produkt WHERE Posten.ProduktNr = Produkt.ProduktNr
    GROUP BY Produkt.ProduktNr ORDER BY SUM(Posten.Anzahl * Produkt.Preis) DESC LIMIT 3`;
  assert.deepEqual(spalte(v, top3), spalte(h, top3));
  v.close();
});
