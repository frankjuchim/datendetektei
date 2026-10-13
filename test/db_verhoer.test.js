'use strict';
// Verhör-Kontexte V1–V5 (seed/datenbanken/verhoer/<kontext>/, VERHOER_KONTEXTE.md, Plan Phase 3 Task 11 und
// Phase 5 Task 6): kuratierte DBs ohne Generator, Pflicht-Randfälle je Blueprint (DS_PLANUNG „Verhör-Blueprint:
// Verhör 1 … 5“), Beispielabfragen EH-konform (Abimodus streng), Randfall-Varianten mit entlarvter Fehlabfrage
// (V4/V5 ohne Varianten: keine SQL-Aufgaben im Verhör).
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
const KONTEXTE = ['verhoer/bibliothek', 'verhoer/buergerbus', 'verhoer/kiosk', 'verhoer/musikschule', 'verhoer/kletterhalle'];

/** Erwartete Varianten je Kontext (LIESMICH „Randfall-Varianten“; „entfällt“ = keine Datei). */
const VARIANTEN = {
  'verhoer/bibliothek': ['gleichnamig'],
  'verhoer/buergerbus': ['null', 'gleichnamig'],
  'verhoer/kiosk': ['null', 'gleichnamig'],
  'verhoer/musikschule': [],
  'verhoer/kletterhalle': []
};

/** Spalten mit vollem Namen „Vorname Nachname“ (bei Rohlisten ggf. als Kommaliste) je Kontext. */
const NAMENSSPALTEN = {
  'verhoer/musikschule': ['UnterrichtRoh.Schueler', 'UnterrichtRoh.Lehrkraft', 'LehrkraftRaum.Name'],
  'verhoer/kletterhalle': ['Mitglied.Name', 'Routenbauer.Name']
};
/** Nachnamen, die VERHOER_KONTEXTE.md ausdrücklich vorgibt, obwohl sie nicht in namen.json stehen. */
const VORGEGEBENE_NACHNAMEN = { 'verhoer/musikschule': ['Albers'] };

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
    for (const angabe of NAMENSSPALTEN[name] || []) {
      const [t, s] = angabe.split('.');
      for (const liste of spalte(db, `SELECT DISTINCT "${s}" FROM "${t}" WHERE "${s}" IS NOT NULL`)) {
        for (const voll of liste.split(', ')) {
          const teile = voll.split(' ');
          geprueft++;
          assert.equal(teile.length, 2, `${angabe} = ${voll}`);
          assert.ok(vor.has(teile[0]), `${angabe}: Vorname ${teile[0]} nicht in namen.json`);
          assert.ok(nach.has(teile[1]) || (VORGEGEBENE_NACHNAMEN[name] || []).includes(teile[1]),
            `${angabe}: Nachname ${teile[1]} nicht in namen.json`);
          assert.ok(!namenJson.reservierteNachnamen.includes(teile[1]), `${angabe} = ${voll} ist reserviert`);
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

// ---------------------------------------------------------------- V4 Musikschule (Rohliste, Phase 5 Task 6)

/** Rohzeilen in Listenreihenfolge (rowid = „Zeile“ der LIESMICH). */
const rohzeilen = (db) => db.prepare('SELECT rowid AS Zeile, * FROM UnterrichtRoh ORDER BY rowid').all();

test('V4: Rohliste ohne Schlüssel, Umfang und Wertebereiche nach VERHOER_KONTEXTE', () => {
  const db = haupt('verhoer/musikschule');
  const spalten = db.prepare('PRAGMA table_info(UnterrichtRoh)').all();
  assert.deepEqual(spalten.map((s) => s.name),
    ['Schueler', 'Geburtsjahr', 'Instrumente', 'Lehrkraft', 'LehrkraftTelefon', 'Raum', 'Tarif', 'Monatsgebuehr']);
  assert.ok(spalten.every((s) => s.pk === 0), 'Rohliste ohne Primärschlüssel');
  assert.deepEqual(db.prepare('PRAGMA table_info(LehrkraftRaum)').all().map((s) => [s.name, s.pk]),
    [['LehrkraftNr', 1], ['Name', 0], ['Telefon', 0], ['Raum', 0], ['Etage', 0]]);
  assert.deepEqual(db.prepare('PRAGMA table_info(Raum)').all().map((s) => [s.name, s.pk]), [['Raum', 1], ['Etage', 0]]);
  const n = wert(db, 'SELECT COUNT(*) FROM UnterrichtRoh');
  assert.ok(n >= 28 && n <= 32, `${n} Rohzeilen`);
  // 6 Lehrkräfte, 7 Instrumente, 5 Räume auf 3 Etagen, 4 Tarife (atomare Zeilen)
  assert.equal(wert(db, 'SELECT COUNT(*) FROM LehrkraftRaum'), 6);
  const atomar = rohzeilen(db).filter((z) => !z.Instrumente.includes(','));
  assert.equal(new Set(atomar.map((z) => z.Lehrkraft)).size, 6);
  assert.deepEqual([...new Set(rohzeilen(db).flatMap((z) => z.Instrumente.split(', ')))].sort(),
    ['Cello', 'Geige', 'Gesang', 'Gitarre', 'Klavier', 'Querflöte', 'Schlagzeug']);
  assert.deepEqual(alle(db, 'SELECT COUNT(*), COUNT(DISTINCT Etage) FROM Raum'), [[5, 3]]);
  assert.deepEqual(spalte(db, 'SELECT DISTINCT Tarif FROM UnterrichtRoh ORDER BY Tarif'), ['Erwachsen', 'Geschwister', 'Jugend', 'Kind']);
  // keine NULL-Werte in der Rohliste (Anomalien sollen nicht mit NULL-Fragen vermischt werden)
  for (const s of spalten) assert.equal(wert(db, `SELECT COUNT(*) FROM UnterrichtRoh WHERE "${s.name}" IS NULL`), 0, s.name);
});

test('V4: Lehrkraft- und Raumdaten in Rohliste, LehrkraftRaum und Raum widerspruchsfrei', () => {
  const db = haupt('verhoer/musikschule');
  const lehrkraft = new Map(alle(db, 'SELECT Name, Telefon, Raum, Etage FROM LehrkraftRaum').map((z) => [z[0], z]));
  const etage = new Map(alle(db, 'SELECT Raum, Etage FROM Raum'));
  for (const [, [, , raum, e]] of lehrkraft) assert.equal(etage.get(raum), e, raum);
  for (const z of rohzeilen(db)) {
    const namen = z.Lehrkraft.split(', ');
    const telefone = z.LehrkraftTelefon.split(', ');
    const raeume = z.Raum.split(', ');
    const instrumente = z.Instrumente.split(', ');
    assert.ok(namen.length === instrumente.length && telefone.length === instrumente.length && raeume.length === instrumente.length,
      `Zeile ${z.Zeile}: Listen gleich lang`);
    namen.forEach((name, i) => {
      assert.ok(lehrkraft.has(name), `Zeile ${z.Zeile}: ${name}`);
      assert.equal(telefone[i], lehrkraft.get(name)[1], `Zeile ${z.Zeile}: Telefon`);
      assert.equal(raeume[i], lehrkraft.get(name)[2], `Zeile ${z.Zeile}: Raum`);
    });
  }
  // FA Lehrkraft → Telefon, Raum gilt; Raum ↛ Lehrkraft, Instrument ↛ Lehrkraft, Lehrkraft ↛ Instrument
  assert.deepEqual(alle(db, 'SELECT Raum, COUNT(*) FROM LehrkraftRaum GROUP BY Raum HAVING COUNT(*) > 1'), [['Bandraum', 2]]);
  assert.deepEqual(spalte(db, "SELECT DISTINCT Lehrkraft FROM UnterrichtRoh WHERE Instrumente = 'Klavier' ORDER BY Lehrkraft"),
    ['Jana Albers', 'Okke Tebbe']);
  assert.ok(wert(db, "SELECT COUNT(DISTINCT Instrumente) FROM UnterrichtRoh WHERE Lehrkraft = 'Jana Albers'") >= 2);
});

test('V4: Pflicht-Randfälle Redundanz, Änderungs-, Einfüge-, Löschanomalie, nicht-atomar, Ausschnitt-Falle, Mehrfachvorkommen', () => {
  const db = haupt('verhoer/musikschule');
  const zeilen = rohzeilen(db);
  // Redundanz: Telefon von Jana Albers in genau 6 Zeilen (eine davon nicht-atomar), überall gleich
  const albers = zeilen.filter((z) => z.Lehrkraft.split(', ').includes('Jana Albers'));
  assert.equal(albers.length, 6);
  assert.equal(new Set(albers.map((z) => z.LehrkraftTelefon.split(', ')[z.Lehrkraft.split(', ').indexOf('Jana Albers')])).size, 1);
  assert.equal(albers.filter((z) => z.Instrumente.includes(',')).length, 1);
  // Monatsgebühr in jeder Zeile; je Tarif einheitlich bis auf genau eine Jugend-Zeile mit 38,00 statt 36,00
  assert.deepEqual(alle(db, 'SELECT Tarif, Monatsgebuehr, COUNT(*) FROM UnterrichtRoh GROUP BY Tarif, Monatsgebuehr ORDER BY Tarif, Monatsgebuehr'),
    [['Erwachsen', 45, 7], ['Geschwister', 28, 3], ['Jugend', 36, 13], ['Jugend', 38, 1], ['Kind', 32, 6]]);
  // Einfügeanomalie: Harfe kommt nirgends vor
  assert.equal(wert(db, "SELECT COUNT(*) FROM UnterrichtRoh WHERE Instrumente LIKE '%Harfe%'"), 0);
  // Löschanomalie: einzige Cello-Zeile = einzige Zeile der Cello-Lehrkraft und ihres Telefons und Raums
  const cello = zeilen.filter((z) => z.Instrumente.includes('Cello'));
  assert.equal(cello.length, 1);
  assert.equal(cello[0].Instrumente, 'Cello');
  for (const s of ['Lehrkraft', 'LehrkraftTelefon', 'Raum']) {
    assert.equal(zeilen.filter((z) => z[s].includes(cello[0][s])).length, 1, s);
  }
  // nicht-atomar: genau 3 Zeilen, Lehrkraft und Telefon ebenfalls als Liste
  const liste = zeilen.filter((z) => z.Instrumente.includes(','));
  assert.equal(liste.length, 3);
  for (const z of liste) assert.ok(z.Lehrkraft.includes(',') && z.LehrkraftTelefon.includes(',') && z.Raum.includes(','));
  // Ausschnitt-Falle: im Ausschnitt (Zeile 1–12) alle Namen verschieden, insgesamt zwei „Mira Lindemann“
  const ausschnitt = zeilen.slice(0, 12).map((z) => z.Schueler);
  assert.equal(new Set(ausschnitt).size, 12);
  assert.ok(ausschnitt.includes('Mira Lindemann'));
  assert.deepEqual(spalte(db, "SELECT Geburtsjahr FROM UnterrichtRoh WHERE Schueler = 'Mira Lindemann' ORDER BY rowid"), [2011, 2007]);
  // Mehrfachvorkommen: (Schueler, Instrumente) genau einmal doppelt – Lotta Renken, Klavier bei zwei Lehrkräften
  assert.deepEqual(alle(db, `SELECT Schueler, Instrumente, COUNT(*), COUNT(DISTINCT Lehrkraft) FROM UnterrichtRoh
    GROUP BY Schueler, Instrumente HAVING COUNT(*) > 1`), [['Lotta Renken', 'Klavier', 2, 2]]);
  // (Schueler, Geburtsjahr, Instrumente, Lehrkraft) ist in den Daten eindeutig
  assert.equal(wert(db, 'SELECT COUNT(*) FROM (SELECT 1 FROM UnterrichtRoh GROUP BY Schueler, Geburtsjahr, Instrumente, Lehrkraft)'), zeilen.length);
  // Geschwister-Tarif nur bei gleichem Nachnamen (Geburtsjahr ↛ Tarif)
  const geschwister = spalte(db, "SELECT DISTINCT Schueler FROM UnterrichtRoh WHERE Tarif = 'Geschwister'");
  assert.equal(new Set(geschwister.map((s) => s.split(' ')[1])).size, 1);
});

test('V4: Tabellenzeilen der LIESMICH („welche Zeile zeigt welchen Randfall“) stimmen', () => {
  const db = haupt('verhoer/musikschule');
  const z = rohzeilen(db);
  const zeile = (nr) => z[nr - 1];
  assert.equal(zeile(8).Instrumente, 'Cello');
  assert.deepEqual([zeile(10).Instrumente, zeile(16).Instrumente, zeile(22).Instrumente],
    ['Klavier, Gesang', 'Gitarre, Schlagzeug', 'Geige, Querflöte']);
  assert.deepEqual([zeile(17).Schueler, zeile(17).Tarif, zeile(17).Monatsgebuehr], ['Levke Bohlken', 'Jugend', 38]);
  assert.deepEqual([zeile(4).Schueler, zeile(20).Schueler], ['Mira Lindemann', 'Mira Lindemann']);
  assert.deepEqual([zeile(1).Schueler, zeile(1).Lehrkraft, zeile(14).Schueler, zeile(14).Lehrkraft],
    ['Lotta Renken', 'Jana Albers', 'Lotta Renken', 'Okke Tebbe']);
  assert.deepEqual(z.filter((r) => r.Lehrkraft.includes('Jana Albers')).map((r) => r.Zeile), [1, 3, 10, 15, 18, 23]);
});

test('V4: FA-Liste der LIESMICH (zerlegen, A4-V-11) – Schlüssel, Musterzerlegung, keine FA Instrument → Lehrkraft', () => {
  const liesmich = fs.readFileSync(path.join(SEED, 'verhoer/musikschule', 'LIESMICH.md'), 'utf8');
  const json = /```json\n([\s\S]*?)\n```/.exec(liesmich);
  assert.ok(json, 'JSON-Block fehlt');
  const fa = JSON.parse(json[1]);
  const attribute = new Set(fa.attribute);
  for (const f of fa.fa) for (const a of [...f.links, ...f.rechts]) assert.ok(attribute.has(a), a);
  // Hülle des Schlüssels = alle Attribute
  const huelle = (start) => {
    const h = new Set(start);
    let neu = true;
    while (neu) {
      neu = false;
      for (const f of fa.fa) {
        if (f.links.every((a) => h.has(a)) && f.rechts.some((a) => !h.has(a))) { f.rechts.forEach((a) => h.add(a)); neu = true; }
      }
    }
    return h;
  };
  assert.equal(huelle(fa.schluessel).size, attribute.size);
  for (const a of fa.schluessel) assert.ok(huelle(fa.schluessel.filter((b) => b !== a)).size < attribute.size, `${a} nötig`);
  assert.deepEqual([...fa.schluessel].sort(), ['Instrument', 'LehrkraftNr', 'SchuelerNr']);
  assert.ok(!huelle(['Instrument']).has('LehrkraftNr'));
  assert.ok(!huelle(['LehrkraftNr']).has('Instrument'));
  // in den Daten: Instrument bestimmt die Lehrkraft nicht (Klavier)
  const db = haupt('verhoer/musikschule');
  assert.ok(wert(db, "SELECT COUNT(DISTINCT Lehrkraft) FROM UnterrichtRoh WHERE Instrumente = 'Klavier'") > 1);
});

// ---------------------------------------------------------------- V5 Kletterhalle (Mini-DB, Phase 5 Task 6)

test('V5: Mini-DB Wand 4, Route 12 (je genau eine Wand), klettert ≈ 25 nach Musterschema', () => {
  const db = haupt('verhoer/kletterhalle');
  assert.deepEqual(spalte(db, "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY rowid"),
    ['Mitglied', 'Wand', 'Routenbauer', 'Route', 'klettert']);
  assert.deepEqual(db.prepare('PRAGMA table_info(Route)').all().map((s) => [s.name, s.pk, s.notnull]),
    [['RoutenNr', 1, 0], ['Name', 0, 1], ['Schwierigkeit', 0, 1], ['WandNr', 0, 1], ['BauerNr', 0, 1]]);
  assert.deepEqual(db.prepare('PRAGMA table_info(klettert)').all().map((s) => [s.name, s.pk]),
    [['MitgliedsNr', 1], ['RoutenNr', 2], ['Datum', 3], ['Erfolg', 0]]);
  assert.deepEqual(db.prepare('PRAGMA foreign_key_list(Route)').all().map((f) => [f.from, f.table, f.to]).sort(),
    [['BauerNr', 'Routenbauer', 'BauerNr'], ['WandNr', 'Wand', 'WandNr']]);
  assert.deepEqual(db.prepare('PRAGMA foreign_key_list(klettert)').all().map((f) => [f.from, f.table, f.to]).sort(),
    [['MitgliedsNr', 'Mitglied', 'MitgliedsNr'], ['RoutenNr', 'Route', 'RoutenNr']]);
  assert.deepEqual(alle(db, `SELECT (SELECT COUNT(*) FROM Wand), (SELECT COUNT(*) FROM Route),
    (SELECT COUNT(*) FROM Mitglied), (SELECT COUNT(*) FROM Routenbauer)`), [[4, 12, 8, 3]]);
  const n = wert(db, 'SELECT COUNT(*) FROM klettert');
  assert.ok(n >= 22 && n <= 28, `${n} Begehungen`);
});

test('V5: Kardinalität aus Daten – Wand 1:n Route, klettert n:m, dasselbe Paar an zwei Tagen', () => {
  const db = haupt('verhoer/kletterhalle');
  // jede Wand hat mehrere Routen, jede Route genau eine Wand (Spalte NOT NULL, FK)
  assert.deepEqual(spalte(db, 'SELECT COUNT(*) FROM Route GROUP BY WandNr ORDER BY WandNr'), [4, 3, 3, 2]);
  // Mitglieder mit mehreren Routen UND Routen mit mehreren Mitgliedern
  const routenJeMitglied = spalte(db, 'SELECT COUNT(DISTINCT RoutenNr) FROM klettert GROUP BY MitgliedsNr');
  const mitgliederJeRoute = spalte(db, 'SELECT COUNT(DISTINCT MitgliedsNr) FROM klettert GROUP BY RoutenNr');
  assert.ok(routenJeMitglied.filter((x) => x > 1).length >= 5, JSON.stringify(routenJeMitglied));
  assert.ok(mitgliederJeRoute.filter((x) => x > 1).length >= 5, JSON.stringify(mitgliederJeRoute));
  // dasselbe Paar genau einmal an zwei Tagen (erst ohne, dann mit Durchstieg) → Datum gehört in den Schlüssel
  assert.deepEqual(alle(db, `SELECT MitgliedsNr, RoutenNr, COUNT(*), COUNT(DISTINCT Datum) FROM klettert
    GROUP BY MitgliedsNr, RoutenNr HAVING COUNT(*) > 1`), [[1, 3, 2, 2]]);
  assert.deepEqual(spalte(db, 'SELECT Erfolg FROM klettert WHERE MitgliedsNr = 1 AND RoutenNr = 3 ORDER BY Datum'), ['nein', 'ja']);
  // jede Route mindestens einmal begangen, jedes Mitglied mindestens zweimal
  assert.equal(wert(db, 'SELECT COUNT(DISTINCT RoutenNr) FROM klettert'), 12);
  assert.ok(Math.min(...routenJeMitglied) >= 2);
  // Herbst 2026, Erfolg ja/nein
  assert.deepEqual(alle(db, "SELECT MIN(Datum) >= '2026-09-01', MAX(Datum) <= '2026-11-30' FROM klettert"), [[1, 1]]);
  assert.deepEqual(spalte(db, 'SELECT DISTINCT Erfolg FROM klettert ORDER BY Erfolg'), ['ja', 'nein']);
  // Ausschnitt für A5-V-04 (LIESMICH): zeigt beide Richtungen
  const ausschnitt = alle(db, `SELECT MitgliedsNr, RoutenNr FROM klettert
    WHERE (MitgliedsNr = 1 AND RoutenNr IN (1, 3)) OR (MitgliedsNr IN (2, 3) AND RoutenNr = 1) OR (MitgliedsNr = 2 AND RoutenNr = 2)`);
  assert.ok(ausschnitt.length >= 5);
});

test('V5: LIESMICH und VERHOER_KONTEXTE an DS_PLANUNG angeglichen (klettert, Trainer, bildetAus, assistiertIn, Wertung)', () => {
  const liesmich = fs.readFileSync(path.join(SEED, 'verhoer/kletterhalle', 'LIESMICH.md'), 'utf8');
  const kontexte = fs.readFileSync(path.join(SEED, 'VERHOER_KONTEXTE.md'), 'utf8');
  const v5 = kontexte.slice(kontexte.indexOf('## V5 '), kontexte.indexOf('## V6 '));
  for (const text of [liesmich, v5]) {
    for (const teil of ['angeglichen an DS_PLANUNG', '*klettert*', '*bildetAus*', '*assistiertIn*', '*besucht*', '*leitet*',
      '*wertet*', 'Trainer (1) – Kurs (n)', 'Trainer(<u>TrainerNr</u>, Name, ↑AusbilderNr)',
      'klettert(<u>↑MitgliedsNr</u>, <u>↑RoutenNr</u>, <u>Datum</u>, Erfolg)',
      'Route(<u>RoutenNr</u>, Name, Schwierigkeit, ↑WandNr, ↑BauerNr)',
      'Wertung(<u>↑MitgliedsNr</u>, <u>↑RoutenNr</u>, <u>↑WettkampfNr</u>, Punkte)',
      'assistiertIn(<u>↑MitgliedsNr</u>, <u>↑KursNr</u>)']) {
      assert.ok(text.includes(teil), teil);
    }
    assert.doesNotMatch(text, /\bbegeht\(|sichert\(/);
  }
  assert.ok(liesmich.includes('A5-V-03') && liesmich.includes('A5-V-04'));
});
