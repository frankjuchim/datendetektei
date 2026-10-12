'use strict';
// Randfall-Varianten der Übungsdatenbanken (seed/datenbanken/LIESMICH.md §5, Plan Phase 2 Task 4).
// Je Variante: Delta auf einer Kopie der Haupt-DB (basis.sql) baut fehlerfrei, neue Schlüssel liegen im reservierten
// Bereich, und die in der DB-LIESMICH beschriebene Wirkung tritt ein – die dort genannte Fehlabfrage liefert auf der
// Variante ein anderes Ergebnis als die korrekte Abfrage.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Database = require('better-sqlite3');

const bau = require('../scripts/db_bauen');

const SEED = path.join(__dirname, '..', 'seed', 'datenbanken');

/** Erwartete Varianten je DB (LIESMICH-Tabellen „Randfall-Varianten“; „entfällt“ = keine Datei). */
const ERWARTET = {
  fundbuero: ['null', 'gleichnamig', 'grenze', 'gleichstand'],
  stadtrad: ['null', 'gleichnamig', 'grenze', 'gleichstand', 'leer'],
  stadtfest: ['null', 'gleichnamig', 'grenze', 'gleichstand', 'leer'],
  tus: ['null', 'gleichnamig', 'grenze', 'leer'],
  detektei: ['null', 'gleichnamig', 'grenze', 'gleichstand', 'leer'],
  datenspuren: ['null', 'gleichnamig', 'grenze', 'gleichstand', 'leer'],
  eisdiele: []
};

/** Untergrenze neuer Schlüssel je Tabelle (LIESMICH §5: ab 9001, bei zweistelligen IDs ab 901). */
const RESERVIERT = {
  fundbuero: { Fundsache: 9001 },
  stadtrad: { Station: 901, Rad: 901, Kunde: 901, Ausleihe: 9001, Reparatur: 9001 },
  stadtfest: { Stand: 901, Helfer: 901, Produkt: 9001, Bon: 9001 },
  tus: { Mitglied: 901, Halle: 901, Abteilung: 901, Trainer: 901 },
  detektei: { Ermittler: 901, Fall: 9001, Person: 9001, Ort: 9001, Beweisstueck: 9001 }
};

const hauptCache = new Map();
function haupt(name) {
  if (!hauptCache.has(name)) hauptCache.set(name, bau.ladeHaupt(name));
  return hauptCache.get(name);
}
const variantenCache = new Map();
function variante(name, typ) {
  const k = `${name}/${typ}`;
  if (!variantenCache.has(k)) variantenCache.set(k, bau.baueVariante(name, typ));
  return variantenCache.get(k);
}
const alle = (db, sql, ...p) => db.prepare(sql).all(...p);
const wert = (db, sql, ...p) => db.prepare(sql).pluck().get(...p);
const spalte = (db, sql, ...p) => db.prepare(sql).pluck().all(...p);

// ---------------------------------------------------------------- Mechanismus

test('varianten(): Typen je DB in fester Reihenfolge; DB ohne varianten/-Ordner hat keine', () => {
  assert.deepEqual(bau.VARIANTEN_TYPEN, ['null', 'gleichnamig', 'grenze', 'gleichstand', 'leer']);
  for (const [name, typen] of Object.entries(ERWARTET)) assert.deepEqual(bau.varianten(name), typen, name);
  assert.deepEqual(bau.varianten('probe', { quellen: fs.mkdtempSync(path.join(os.tmpdir(), 'var-')) }), []);
});

test('varianten(): unbekannter Dateiname im varianten/-Ordner ist ein Fehler', () => {
  const quellen = fs.mkdtempSync(path.join(os.tmpdir(), 'var-'));
  fs.mkdirSync(path.join(quellen, 'probe', 'varianten'), { recursive: true });
  fs.writeFileSync(path.join(quellen, 'probe', 'varianten', 'gleichname.sql'), '');
  assert.throws(() => bau.varianten('probe', { quellen }), /gleichname/);
});

function probeMitBasis() {
  const quellen = fs.mkdtempSync(path.join(os.tmpdir(), 'var-'));
  const ordner = path.join(quellen, 'probe');
  fs.mkdirSync(path.join(ordner, 'varianten'), { recursive: true });
  fs.writeFileSync(path.join(ordner, 'basis.sql'), [
    'PRAGMA foreign_keys = ON;',
    'CREATE TABLE Ort (OrtNr INTEGER PRIMARY KEY, Name TEXT NOT NULL);',
    'CREATE TABLE Eintrag (EintragNr INTEGER PRIMARY KEY, OrtNr INTEGER, FOREIGN KEY (OrtNr) REFERENCES Ort(OrtNr));',
    "INSERT INTO Ort VALUES (1, 'Altstadt');",
    'INSERT INTO Eintrag VALUES (1, 1);',
    ''
  ].join('\n'));
  return { quellen, ordner };
}

test('baueVariante(): Delta auf Kopie der Haupt-DB, Haupt-DB bleibt unverändert', () => {
  const { quellen, ordner } = probeMitBasis();
  fs.writeFileSync(path.join(ordner, 'varianten', 'leer.sql'), "INSERT INTO Ort VALUES (901, 'Deichkamp');\n");
  const hauptDb = bau.ladeHaupt('probe', { quellen });
  const v = bau.baueVariante('probe', 'leer', { quellen, haupt: hauptDb.serialize() });
  assert.equal(wert(v, 'SELECT COUNT(*) FROM Ort'), 2);
  assert.equal(wert(hauptDb, 'SELECT COUNT(*) FROM Ort'), 1);
  const ohneBuffer = bau.baueVariante('probe', 'leer', { quellen });
  assert.equal(wert(ohneBuffer, 'SELECT COUNT(*) FROM Ort'), 2);
});

test('baueVariante(): FK-Verstoß im Delta bricht ab (PRAGMA foreign_keys = ON)', () => {
  const { quellen, ordner } = probeMitBasis();
  fs.writeFileSync(path.join(ordner, 'varianten', 'null.sql'), 'INSERT INTO Eintrag VALUES (9001, 77);\n');
  assert.throws(() => bau.baueVariante('probe', 'null', { quellen }), /probe\/null/);
});

test('baueVariante(): Verstoß, den erst foreign_key_check findet, bricht ab', () => {
  const { quellen, ordner } = probeMitBasis();
  // Delta schaltet die Prüfung ab – die Abschlussprüfung muss den Verstoß trotzdem finden
  fs.writeFileSync(path.join(ordner, 'varianten', 'null.sql'),
    'PRAGMA foreign_keys = OFF;\nINSERT INTO Eintrag VALUES (9001, 77);\n');
  assert.throws(() => bau.baueVariante('probe', 'null', { quellen }), /foreign_key_check/);
});

test('baueVariante(): unbekannte Variante und fehlende basis.sql sind Fehler', () => {
  const { quellen } = probeMitBasis();
  assert.throws(() => bau.baueVariante('probe', 'gleichstand', { quellen }), /gleichstand/);
  assert.throws(() => bau.ladeHaupt('gibtsnicht', { quellen }), /basis\.sql/);
});

test('ladeAlle(): serialisierte Haupt-DB und Varianten je DB', () => {
  const namen = Object.keys(ERWARTET);
  const daten = bau.ladeAlle(SEED, { namen });
  assert.deepEqual(Object.keys(daten), namen);
  for (const name of namen) {
    assert.ok(Buffer.isBuffer(daten[name].haupt), name);
    assert.deepEqual(Object.keys(daten[name].varianten), ERWARTET[name], name);
    const h = new Database(daten[name].haupt);
    assert.equal(h.pragma('integrity_check', { simple: true }), 'ok');
    for (const typ of ERWARTET[name]) {
      const v = new Database(daten[name].varianten[typ]);
      assert.equal(v.pragma('integrity_check', { simple: true }), 'ok');
      v.close();
    }
    h.close();
  }
  const fundbuero = new Database(daten.fundbuero.varianten.gleichstand);
  assert.equal(wert(fundbuero, 'SELECT Wert FROM Fundsache WHERE FundNr = 9031'), 320);
  assert.throws(() => bau.ladeAlle(fs.mkdtempSync(path.join(os.tmpdir(), 'var-')), { namen: ['fundbuero'] }), /basis\.sql/);
});

test('lauf --pruefen baut und prüft auch alle Varianten (Exit 1 bei kaputtem Delta)', () => {
  const quellen = fs.mkdtempSync(path.join(os.tmpdir(), 'var-'));
  fs.cpSync(path.join(SEED, 'fundbuero'), path.join(quellen, 'fundbuero'), { recursive: true });
  const zeilen = [];
  const optionen = { quellen, reihenfolge: ['fundbuero'], pruefen: true, log: (t) => zeilen.push(t) };
  assert.equal(bau.lauf(optionen), 0, zeilen.join('\n'));
  const text = zeilen.join('\n');
  for (const typ of ERWARTET.fundbuero) assert.match(text, new RegExp(`fundbuero/${typ}: ok`));
  fs.writeFileSync(path.join(quellen, 'fundbuero', 'varianten', 'grenze.sql'),
    "INSERT INTO Fundsache (FundNr, Bezeichnung) VALUES (9021, 'kaputt');\n");
  zeilen.length = 0;
  assert.equal(bau.lauf(optionen), 1);
  assert.match(zeilen.join('\n'), /fundbuero\/grenze: FEHLER/);
});

// ---------------------------------------------------------------- alle echten Varianten

for (const [name, typen] of Object.entries(ERWARTET)) {
  if (!RESERVIERT[name]) continue; // Datenspuren: Text-Tokens, eigener Test unten
  for (const typ of typen) {
    test(`${name}/${typ}: baut fehlerfrei, neue Schlüssel im reservierten Bereich, Haupt-Daten unverändert`, () => {
      const h = haupt(name);
      const v = variante(name, typ);
      assert.deepEqual(v.pragma('foreign_key_check'), []);
      assert.equal(v.pragma('integrity_check', { simple: true }), 'ok');
      let neu = 0;
      for (const [tabelle, min] of Object.entries(RESERVIERT[name])) {
        const pk = v.pragma(`table_info("${tabelle}")`).find((s) => s.pk === 1).name;
        const alt = new Set(spalte(h, `SELECT "${pk}" FROM "${tabelle}"`));
        for (const id of spalte(v, `SELECT "${pk}" FROM "${tabelle}"`)) {
          if (alt.has(id)) continue;
          neu++;
          assert.ok(id >= min, `${tabelle}.${pk} = ${id} liegt nicht im reservierten Bereich ab ${min}`);
        }
        // Haupt-Datensätze bleiben, wie sie sind (Deltas fügen nur hinzu)
        const vorher = alle(h, `SELECT * FROM "${tabelle}" ORDER BY "${pk}"`);
        const nachher = alle(v, `SELECT * FROM "${tabelle}" ORDER BY "${pk}"`).filter((z) => alt.has(z[pk]));
        assert.deepEqual(nachher, vorher, `${tabelle}: Haupt-Datensätze verändert`);
      }
      if (!(name === 'tus' && typ === 'null')) assert.ok(neu > 0, 'Delta fügt keinen Datensatz mit Schlüssel hinzu');
    });
  }
}

test('eisdiele: keine Varianten (Gastmodus prüft nicht)', () => {
  assert.equal(fs.existsSync(path.join(SEED, 'eisdiele', 'varianten')), false);
});

// ---------------------------------------------------------------- Fundbuero

test('fundbuero/null: 9001 ohne Farbe/Wert/Finder (offen), 9002 Wert NULL abgeholt; = NULL und != entlarvt', () => {
  const v = variante('fundbuero', 'null');
  const h = haupt('fundbuero');
  assert.deepEqual(alle(v, 'SELECT Bezeichnung, Farbe, Wert, Finder, AbgeholtAm FROM Fundsache WHERE FundNr = 9001'),
    [{ Bezeichnung: 'Handschuh', Farbe: null, Wert: null, Finder: null, AbgeholtAm: null }]);
  const r = alle(v, 'SELECT Bezeichnung, Wert, AbgeholtAm FROM Fundsache WHERE FundNr = 9002')[0];
  assert.equal(r.Bezeichnung, 'Rucksack');
  assert.equal(r.Wert, null);
  assert.notEqual(r.AbgeholtAm, null);
  assert.equal(wert(v, 'SELECT COUNT(*) FROM Fundsache WHERE Wert IS NULL'),
    wert(h, 'SELECT COUNT(*) FROM Fundsache WHERE Wert IS NULL') + 2);
  assert.equal(wert(v, 'SELECT COUNT(*) FROM Fundsache WHERE Wert = NULL'), 0);
  const richtig = spalte(v, "SELECT FundNr FROM Fundsache WHERE Farbe != 'schwarz' OR Farbe IS NULL");
  const falsch = spalte(v, "SELECT FundNr FROM Fundsache WHERE Farbe != 'schwarz'");
  assert.ok(richtig.includes(9001) && !falsch.includes(9001));
});

test('fundbuero/gleichnamig: zweiter Messing-Kompass macht Bezeichnung mehrdeutig', () => {
  const v = variante('fundbuero', 'gleichnamig');
  assert.deepEqual(alle(v, 'SELECT * FROM Fundsache WHERE FundNr = 9011'), [{
    FundNr: 9011, Bezeichnung: 'Messing-Kompass', Kategorie: 'Sonstiges', Farbe: 'gold', Fundort: 'Marktplatz',
    Stadtteil: 'Altstadt', Funddatum: '2026-07-02', Wert: 15, Finder: 'T. Habben', AbgeholtAm: '2026-07-04'
  }]);
  const falsch = spalte(v, "SELECT FundNr FROM Fundsache WHERE Bezeichnung = 'Messing-Kompass'");
  assert.deepEqual(falsch, [36, 9011]);
  assert.deepEqual(spalte(v, "SELECT FundNr FROM Fundsache WHERE Finder = 'N. Falter'"), [36]);
  assert.deepEqual(spalte(v, "SELECT FundNr FROM Fundsache WHERE Bezeichnung LIKE '%Messing%' AND Wert >= 400"), [36]);
  assert.deepEqual(spalte(haupt('fundbuero'), "SELECT FundNr FROM Fundsache WHERE Bezeichnung = 'Messing-Kompass'"), [36]);
});

test('fundbuero/grenze: Grenzdaten und Grenzwerte trennen > von >= und BETWEEN-Grenzen', () => {
  const v = variante('fundbuero', 'grenze');
  const ids = (sql) => spalte(v, sql).filter((id) => id >= 9001);
  assert.deepEqual(alle(v, 'SELECT FundNr, Funddatum, Wert FROM Fundsache WHERE FundNr >= 9001 ORDER BY FundNr')
    .map((z) => [z.FundNr, z.Funddatum, z.Wert]),
  [[9021, '2026-06-01', 100], [9022, '2026-07-31', 100], [9023, '2026-05-31', 99.5], [9024, '2026-09-20', 20]]);
  assert.equal(wert(v, 'SELECT COUNT(*) FROM Fundsache WHERE FundNr = 9022 AND AbgeholtAm = Funddatum'), 1);
  assert.deepEqual(ids("SELECT FundNr FROM Fundsache WHERE Funddatum BETWEEN '2026-06-01' AND '2026-07-31'"), [9021, 9022]);
  assert.deepEqual(ids("SELECT FundNr FROM Fundsache WHERE Funddatum > '2026-06-01' AND Funddatum < '2026-07-31'"), []);
  assert.deepEqual(ids('SELECT FundNr FROM Fundsache WHERE Wert >= 100'), [9021, 9022]);
  assert.deepEqual(ids('SELECT FundNr FROM Fundsache WHERE Wert > 100'), []);
  assert.deepEqual(ids("SELECT FundNr FROM Fundsache WHERE Funddatum BETWEEN '2026-09-14' AND '2026-09-20'"), [9024]);
  assert.deepEqual(ids("SELECT FundNr FROM Fundsache WHERE Funddatum BETWEEN '2026-09-14' AND '2026-09-19'"), []);
});

test('fundbuero/gleichstand: Rang 3 doppelt besetzt – LIMIT 3 verliert eine Zeile', () => {
  const v = variante('fundbuero', 'gleichstand');
  const werte = spalte(v, 'SELECT Wert FROM Fundsache WHERE Wert IS NOT NULL ORDER BY Wert DESC');
  const dritter = [...new Set(werte)][2];
  assert.equal(dritter, 320);
  const richtig = spalte(v, 'SELECT FundNr FROM Fundsache WHERE Wert >= 320 ORDER BY FundNr');
  assert.deepEqual(richtig, [36, 44, 51, 9031]);
  assert.equal(spalte(v, 'SELECT FundNr FROM Fundsache ORDER BY Wert DESC LIMIT 3').length, 3);
  assert.equal(wert(v, "SELECT Bezeichnung FROM Fundsache WHERE FundNr = 9031"), 'Silberkette');
});

// ---------------------------------------------------------------- StadtRad

test('stadtrad/null: Ausleihe 9001 ohne Zielstation, Rad 901 frei ohne Station', () => {
  const v = variante('stadtrad', 'null');
  const a = alle(v, 'SELECT * FROM Ausleihe WHERE AusleihID = 9001')[0];
  assert.equal(a.KundenID, 9);
  assert.equal(a.RadID, 2);
  assert.equal(a.ZielStation, null);
  assert.notEqual(a.Ende, null);
  assert.deepEqual(alle(v, 'SELECT Typ, StationID, Status FROM Rad WHERE RadID = 901'),
    [{ Typ: 'Citybike', StationID: null, Status: 'frei' }]);
  const richtig = wert(v, 'SELECT COUNT(*) FROM Ausleihe WHERE KundenID = 9 AND Ende IS NOT NULL');
  const falsch = wert(v, `SELECT COUNT(*) FROM Ausleihe, Station
    WHERE Ausleihe.ZielStation = Station.StationID AND Ausleihe.KundenID = 9 AND Ausleihe.Ende IS NOT NULL`);
  assert.equal(richtig, falsch + 1);
  assert.equal(wert(v, 'SELECT COUNT(*) FROM Ausleihe WHERE ZielStation = NULL'), 0);
  assert.ok(spalte(v, 'SELECT AusleihID FROM Ausleihe WHERE ZielStation IS NULL').includes(9001));
  const freiGesamt = wert(v, "SELECT COUNT(*) FROM Rad WHERE Status = 'frei'");
  const freiJeStation = spalte(v, `SELECT COUNT(*) FROM Station, Rad
    WHERE Station.StationID = Rad.StationID AND Rad.Status = 'frei' GROUP BY Station.StationID`);
  assert.equal(freiJeStation.reduce((s, n) => s + n, 0), freiGesamt - 1);
});

test('stadtrad/gleichnamig: zweite Hanna Immig mit 6 Fahrten – Gruppieren nach Namen verschmilzt', () => {
  const v = variante('stadtrad', 'gleichnamig');
  assert.deepEqual(alle(v, 'SELECT * FROM Kunde WHERE KundenID = 901'),
    [{ KundenID: 901, Vorname: 'Hanna', Nachname: 'Immig', Jahrgang: 1990, Tarif: 'Basis', Stadtteil: 'Bahnhofsviertel' }]);
  assert.deepEqual(spalte(v, 'SELECT AusleihID FROM Ausleihe WHERE KundenID = 901 ORDER BY AusleihID'),
    [9011, 9012, 9013, 9014, 9015, 9016]);
  const neun = wert(v, 'SELECT COUNT(*) FROM Ausleihe WHERE KundenID = 9');
  const falsch = alle(v, `SELECT Kunde.Vorname, Kunde.Nachname, COUNT(*) AS Fahrten FROM Kunde, Ausleihe
    WHERE Kunde.KundenID = Ausleihe.KundenID GROUP BY Kunde.Vorname, Kunde.Nachname`)
    .filter((z) => z.Nachname === 'Immig');
  assert.deepEqual(falsch.map((z) => z.Fahrten), [neun + 6]);
  const richtig = alle(v, `SELECT Kunde.KundenID, COUNT(*) AS Fahrten FROM Kunde, Ausleihe
    WHERE Kunde.KundenID = Ausleihe.KundenID AND Kunde.Nachname = 'Immig' GROUP BY Kunde.KundenID ORDER BY Kunde.KundenID`);
  assert.deepEqual(richtig, [{ KundenID: 9, Fahrten: neun }, { KundenID: 901, Fahrten: 6 }]);
  // Fahrten folgen der Preisformel und Ende = Start + DauerMin
  for (const z of alle(v, `SELECT Ausleihe.*, Rad.Typ FROM Ausleihe, Rad
    WHERE Ausleihe.RadID = Rad.RadID AND Ausleihe.AusleihID >= 9011`)) pruefeFahrt(z);
});

const PREIS = { Citybike: [1.0, 0.08], 'E-Bike': [1.5, 0.12], Lastenrad: [2.0, 0.12] };
function pruefeFahrt(z) {
  const [grund, minute] = PREIS[z.Typ];
  assert.equal(z.Preis, Math.round((grund + minute * z.DauerMin) * 100) / 100, `Preis ${z.AusleihID}`);
  const start = new Date(`${z.Start.replace(' ', 'T')}:00Z`);
  const ende = new Date(start.getTime() + z.DauerMin * 60000).toISOString().slice(0, 16).replace('T', ' ');
  assert.equal(z.Ende, ende, `Ende ${z.AusleihID}`);
}

test('stadtrad/grenze: Mitternacht, Monatswechsel, DauerMin 60, Preis 5,00', () => {
  const v = variante('stadtrad', 'grenze');
  const ids = (sql) => spalte(v, sql).filter((id) => id >= 9001);
  for (const z of alle(v, `SELECT Ausleihe.*, Rad.Typ FROM Ausleihe, Rad
    WHERE Ausleihe.RadID = Rad.RadID AND Ausleihe.AusleihID >= 9001`)) pruefeFahrt(z);
  assert.equal(wert(v, 'SELECT Start FROM Ausleihe WHERE AusleihID = 9021'), '2026-09-20 00:00');
  assert.deepEqual(ids("SELECT AusleihID FROM Ausleihe WHERE Start >= '2026-09-01' AND Start < '2026-09-21'"), [9021, 9023, 9024]);
  assert.deepEqual(ids("SELECT AusleihID FROM Ausleihe WHERE Start BETWEEN '2026-09-01' AND '2026-09-20'"), [9023, 9024]);
  assert.deepEqual(alle(v, 'SELECT Start, Ende FROM Ausleihe WHERE AusleihID = 9022'),
    [{ Start: '2026-08-31 23:55', Ende: '2026-09-01 00:10' }]);
  assert.deepEqual(ids("SELECT AusleihID FROM Ausleihe WHERE Ende >= '2026-09-01' AND Ende < '2026-10-01'"), [9021, 9022, 9023, 9024]);
  assert.deepEqual(ids("SELECT AusleihID FROM Ausleihe WHERE Start >= '2026-09-01' AND Ende IS NOT NULL"), [9021, 9023, 9024]);
  assert.deepEqual(ids('SELECT AusleihID FROM Ausleihe WHERE DauerMin >= 60'), [9023]);
  assert.deepEqual(ids('SELECT AusleihID FROM Ausleihe WHERE DauerMin > 60'), []);
  assert.deepEqual(ids('SELECT AusleihID FROM Ausleihe WHERE Preis >= 5'), [9023, 9024]);
  assert.equal(wert(v, 'SELECT Preis FROM Ausleihe WHERE AusleihID = 9024'), 5);
  assert.deepEqual(ids('SELECT AusleihID FROM Ausleihe WHERE Preis > 5'), [9023]);
});

const STARTS_JE_STATION = `SELECT Station.StationID, COUNT(*) AS Starts FROM Station, Ausleihe
  WHERE Station.StationID = Ausleihe.StartStation GROUP BY Station.StationID ORDER BY Starts DESC, Station.StationID`;

test('stadtrad/gleichstand: Rang 3 und 4 der Startstationen gleichauf – LIMIT 3 verliert eine', () => {
  const v = variante('stadtrad', 'gleichstand');
  const h = haupt('stadtrad');
  const vorher = alle(h, STARTS_JE_STATION);
  assert.ok(vorher[2].Starts > vorher[3].Starts, 'Haupt-DB: Rang 3 und 4 verschieden');
  const nachher = alle(v, STARTS_JE_STATION);
  assert.equal(nachher[2].Starts, nachher[3].Starts);
  assert.ok(nachher[3].Starts > nachher[4].Starts);
  assert.equal(nachher[1].Starts > nachher[2].Starts, true);
  const dritter = [...new Set(nachher.map((z) => z.Starts))][2];
  assert.equal(nachher.filter((z) => z.Starts >= dritter).length, 4);
  assert.equal(alle(v, `${STARTS_JE_STATION} LIMIT 3`).length, 3);
  // die zusätzlichen Fahrten starten an der Station, die in der Haupt-DB Rang 4 hat
  assert.deepEqual(spalte(v, 'SELECT DISTINCT StartStation FROM Ausleihe WHERE AusleihID >= 9031'), [vorher[3].StationID]);
  for (const z of alle(v, `SELECT Ausleihe.*, Rad.Typ FROM Ausleihe, Rad
    WHERE Ausleihe.RadID = Rad.RadID AND Ausleihe.AusleihID >= 9031`)) pruefeFahrt(z);
});

test('stadtrad/leer: Station 901 Deichtor ohne Räder und Ausleihen, Kunde 902 ohne Ausleihe', () => {
  const v = variante('stadtrad', 'leer');
  assert.deepEqual(alle(v, 'SELECT * FROM Station WHERE StationID = 901'),
    [{ StationID: 901, Name: 'Deichtor', Stadtteil: 'Deichkamp', Stellplaetze: 10 }]);
  assert.equal(wert(v, 'SELECT COUNT(*) FROM Rad WHERE StationID = 901'), 0);
  assert.equal(wert(v, 'SELECT COUNT(*) FROM Ausleihe WHERE StartStation = 901 OR ZielStation = 901'), 0);
  assert.equal(wert(v, 'SELECT COUNT(*) FROM Kunde WHERE KundenID = 902'), 1);
  assert.equal(wert(v, 'SELECT COUNT(*) FROM Ausleihe WHERE KundenID = 902'), 0);
  const falsch = spalte(v, "SELECT DISTINCT Station.Name FROM Station, Rad");
  const richtig = spalte(v, 'SELECT DISTINCT Station.Name FROM Station, Rad WHERE Station.StationID = Rad.StationID');
  assert.ok(falsch.includes('Deichtor') && !richtig.includes('Deichtor'));
});

// ---------------------------------------------------------------- Stadtfest

const UMSATZ_JE_STAND = `SELECT Stand.StandNr, Stand.Name, SUM(Position.Menge * Produkt.Preis) AS Umsatz
  FROM Stand, Bon, Position, Produkt
  WHERE Stand.StandNr = Bon.StandNr AND Bon.BonNr = Position.BonNr AND Position.ProduktNr = Produkt.ProduktNr
  GROUP BY Stand.StandNr, Stand.Name ORDER BY Umsatz DESC, Stand.StandNr`;
const UMSATZ_JE_KASSIERER = `SELECT Helfer.HelferNr, Helfer.Vorname, Helfer.Nachname,
  SUM(Position.Menge * Produkt.Preis) AS Umsatz FROM Helfer, Bon, Position, Produkt
  WHERE Helfer.HelferNr = Bon.HelferNr AND Bon.BonNr = Position.BonNr AND Position.ProduktNr = Produkt.ProduktNr
  GROUP BY Helfer.HelferNr, Helfer.Vorname, Helfer.Nachname ORDER BY Umsatz DESC, Helfer.HelferNr`;

/** Jeder Bon liegt in einer Kassenschicht seines Kassierers am selben Stand (wie Abnahme der Haupt-DB). */
function bonsInSchicht(db) {
  return wert(db, `SELECT COUNT(*) FROM Bon WHERE NOT EXISTS (SELECT 1 FROM Schicht
    WHERE Schicht.HelferNr = Bon.HelferNr AND Schicht.StandNr = Bon.StandNr
      AND Bon.Zeitpunkt >= Schicht.Beginn AND Bon.Zeitpunkt < Schicht.Ende)`);
}

test('stadtfest: alle Varianten – jeder Bon in einer Schicht seines Kassierers, Positionen nur eigene Produkte', () => {
  for (const typ of ERWARTET.stadtfest) {
    const v = variante('stadtfest', typ);
    assert.equal(bonsInSchicht(v), 0, typ);
    assert.equal(wert(v, `SELECT COUNT(*) FROM Bon, Position, Produkt WHERE Bon.BonNr = Position.BonNr
      AND Position.ProduktNr = Produkt.ProduktNr AND Produkt.StandNr != Bon.StandNr`), 0, typ);
  }
});

test('stadtfest/null: Helfer 901/902 ohne Verein mit Bons an der Saftbar – != verliert sie', () => {
  const v = variante('stadtfest', 'null');
  assert.deepEqual(spalte(v, 'SELECT HelferNr FROM Helfer WHERE HelferNr >= 901 AND Verein IS NULL'), [901, 902]);
  assert.deepEqual(spalte(v, 'SELECT DISTINCT StandNr FROM Bon WHERE HelferNr IN (901, 902)'), [3]);
  assert.deepEqual(spalte(v, 'SELECT DISTINCT HelferNr FROM Bon WHERE HelferNr >= 901 ORDER BY HelferNr'), [901, 902]);
  const falsch = spalte(v, `SELECT Bon.BonNr FROM Helfer, Bon WHERE Helfer.HelferNr = Bon.HelferNr
    AND Helfer.Verein != 'TuS Weserstedt'`);
  const richtig = spalte(v, `SELECT Bon.BonNr FROM Helfer, Bon WHERE Helfer.HelferNr = Bon.HelferNr
    AND (Helfer.Verein != 'TuS Weserstedt' OR Helfer.Verein IS NULL)`);
  const neu = spalte(v, 'SELECT BonNr FROM Bon WHERE HelferNr IN (901, 902)');
  assert.ok(neu.every((b) => richtig.includes(b) && !falsch.includes(b)));
  assert.ok(wert(v, 'SELECT COUNT(Verein) FROM Helfer') < wert(v, 'SELECT COUNT(*) FROM Helfer'));
});

test('stadtfest/gleichnamig: Helfer 903 heißt wie der umsatzstärkste Kassierer – Gruppieren nach Namen verschmilzt', () => {
  const v = variante('stadtfest', 'gleichnamig');
  const spitze = alle(haupt('stadtfest'), UMSATZ_JE_KASSIERER)[0];
  const neu = alle(v, 'SELECT * FROM Helfer WHERE HelferNr = 903')[0];
  assert.equal(neu.Vorname, spitze.Vorname);
  assert.equal(neu.Nachname, spitze.Nachname);
  assert.deepEqual(spalte(v, 'SELECT DISTINCT StandNr FROM Bon WHERE HelferNr = 903'), [5]);
  const richtig = alle(v, UMSATZ_JE_KASSIERER).filter((z) => z.Nachname === spitze.Nachname && z.Vorname === spitze.Vorname);
  assert.equal(richtig.length, 2);
  const falsch = alle(v, `SELECT Helfer.Vorname, Helfer.Nachname, SUM(Position.Menge * Produkt.Preis) AS Umsatz
    FROM Helfer, Bon, Position, Produkt
    WHERE Helfer.HelferNr = Bon.HelferNr AND Bon.BonNr = Position.BonNr AND Position.ProduktNr = Produkt.ProduktNr
    GROUP BY Helfer.Vorname, Helfer.Nachname`).filter((z) => z.Nachname === spitze.Nachname && z.Vorname === spitze.Vorname);
  assert.equal(falsch.length, 1);
  assert.equal(falsch[0].Umsatz, richtig[0].Umsatz + richtig[1].Umsatz);
});

const FEHLBETRAG = (bis) => `SELECT SUM(Produkt.Preis) AS Fehlbetrag FROM Bon, Position, Produkt
  WHERE Bon.BonNr = Position.BonNr AND Position.ProduktNr = Produkt.ProduktNr AND Bon.StandNr = 4
    AND Position.Menge = 0 AND Bon.Zeitpunkt BETWEEN '2026-08-29 22:00' AND '${bis}'`;

test('stadtfest/grenze: Bon um 23:00 macht BETWEEN … 23:00 falsch (315,00 statt 312,50 €)', () => {
  const v = variante('stadtfest', 'grenze');
  const h = haupt('stadtfest');
  assert.equal(wert(h, FEHLBETRAG('2026-08-29 23:00')), 312.5);
  assert.equal(wert(v, FEHLBETRAG('2026-08-29 22:59')), 312.5);
  assert.equal(wert(v, FEHLBETRAG('2026-08-29 23:00')), 315);
  assert.deepEqual(alle(v, 'SELECT BonNr, StandNr, HelferNr, Zeitpunkt, Zahlart FROM Bon WHERE BonNr >= 9001 ORDER BY BonNr'), [
    { BonNr: 9021, StandNr: 4, HelferNr: 7, Zeitpunkt: '2026-08-29 23:00', Zahlart: 'bar' },
    { BonNr: 9022, StandNr: 5, HelferNr: 1, Zeitpunkt: '2026-08-28 18:00', Zahlart: 'bar' }
  ]);
  assert.deepEqual(alle(v, 'SELECT ProduktNr, Menge FROM Position WHERE BonNr = 9021'), [{ ProduktNr: 11, Menge: 0 }]);
  assert.equal(wert(v, "SELECT COUNT(*) FROM Bon WHERE Zeitpunkt LIKE '%:00'"), 2);
  // Schicht [Beginn, Ende): Bon 9022 gehört zur Schicht ab 18:00, nicht zu der bis 18:00
  assert.equal(wert(v, `SELECT COUNT(*) FROM Bon WHERE StandNr = 5
    AND Zeitpunkt >= '2026-08-28 16:00' AND Zeitpunkt < '2026-08-28 18:00' AND BonNr = 9022`), 0);
  assert.equal(wert(v, `SELECT COUNT(*) FROM Bon WHERE StandNr = 5
    AND Zeitpunkt BETWEEN '2026-08-28 16:00' AND '2026-08-28 18:00' AND BonNr = 9022`), 1);
});

test('stadtfest/gleichstand: Rang 2 und 3 nach Umsatz gleich – LIMIT 2 verliert einen Stand', () => {
  const v = variante('stadtfest', 'gleichstand');
  const h = haupt('stadtfest');
  const vorher = alle(h, UMSATZ_JE_STAND);
  assert.ok(vorher[1].Umsatz > vorher[2].Umsatz);
  const nachher = alle(v, UMSATZ_JE_STAND);
  assert.ok(nachher[0].Umsatz > nachher[1].Umsatz, 'Rang 1 bleibt allein');
  assert.equal(nachher[1].Umsatz, nachher[2].Umsatz);
  assert.ok(nachher[2].Umsatz > nachher[3].Umsatz);
  const zweiter = [...new Set(nachher.map((z) => z.Umsatz))][1];
  assert.equal(nachher.filter((z) => z.Umsatz >= zweiter).length, 3);
  assert.equal(alle(v, `${UMSATZ_JE_STAND} LIMIT 2`).length, 2);
  // nur der bisherige Rang-3-Stand bekommt Bons dazu
  assert.deepEqual(spalte(v, 'SELECT DISTINCT StandNr FROM Bon WHERE BonNr >= 9001'), [vorher[2].StandNr]);
  assert.equal(wert(v, "SELECT COUNT(*) FROM Bon WHERE BonNr >= 9001 AND Zeitpunkt LIKE '%:00'"), 0);
});

test('stadtfest/leer: Stand 901 Bastelzelt mit Produkt, ohne Bon; Helfer 904 mit Schicht, ohne Bon', () => {
  const v = variante('stadtfest', 'leer');
  assert.deepEqual(alle(v, 'SELECT * FROM Stand WHERE StandNr = 901'),
    [{ StandNr: 901, Name: 'Bastelzelt', Art: 'Spiel', Platz: 'Festwiese' }]);
  assert.deepEqual(alle(v, 'SELECT ProduktNr, Bezeichnung, StandNr FROM Produkt WHERE ProduktNr = 9001'),
    [{ ProduktNr: 9001, Bezeichnung: 'Bastelset', StandNr: 901 }]);
  assert.equal(wert(v, 'SELECT COUNT(*) FROM Bon WHERE StandNr = 901 OR HelferNr = 904'), 0);
  assert.ok(wert(v, 'SELECT COUNT(*) FROM Schicht WHERE HelferNr = 904') >= 1);
  const falsch = spalte(v, 'SELECT DISTINCT Stand.Name FROM Stand, Produkt WHERE Stand.StandNr = Produkt.StandNr');
  const richtig = alle(v, UMSATZ_JE_STAND).map((z) => z.Name);
  assert.ok(falsch.includes('Bastelzelt') && !richtig.includes('Bastelzelt'));
});

// ---------------------------------------------------------------- TuS

test('tus/null: zwei Rohzeilen ohne Beitragsgruppe und Beitrag – = NULL findet nichts, NULL-Gruppe entsteht', () => {
  const v = variante('tus', 'null');
  const h = haupt('tus');
  assert.equal(wert(h, 'SELECT COUNT(*) FROM MitgliederlisteRoh WHERE Monatsbeitrag IS NULL'), 0);
  assert.equal(wert(v, 'SELECT COUNT(*) FROM MitgliederlisteRoh WHERE Monatsbeitrag IS NULL AND Beitragsgruppe IS NULL'), 2);
  assert.equal(wert(v, 'SELECT COUNT(*) FROM MitgliederlisteRoh WHERE Monatsbeitrag = NULL'), 0);
  assert.equal(wert(v, 'SELECT COUNT(*) FROM MitgliederlisteRoh'), wert(h, 'SELECT COUNT(*) FROM MitgliederlisteRoh') + 2);
  const gruppen = alle(v, 'SELECT Beitragsgruppe, COUNT(*) AS n FROM MitgliederlisteRoh GROUP BY Beitragsgruppe');
  assert.ok(gruppen.some((g) => g.Beitragsgruppe === null && g.n === 2));
  // Story-Abfrage bleibt bei 4 Zeilen (NULL-Zeilen fallen bei = und != heraus)
  assert.equal(wert(v, "SELECT COUNT(*) FROM MitgliederlisteRoh WHERE Beitragsgruppe = 'Erwachsene' AND Monatsbeitrag != 14.00"), 4);
});

test('tus/gleichnamig: Mitglied 901 Svea Harms (2010, Jugend) in Tischtennis wie Mitglied 18', () => {
  const v = variante('tus', 'gleichnamig');
  assert.deepEqual(alle(v, 'SELECT Vorname, Nachname, Geburtsjahr, Beitragsgruppe FROM Mitglied WHERE MitgliedNr = 901'),
    [{ Vorname: 'Svea', Nachname: 'Harms', Geburtsjahr: 2010, Beitragsgruppe: 'Jugend' }]);
  assert.equal(wert(v, 'SELECT AbteilungNr FROM Mitgliedschaft WHERE MitgliedNr = 901'), 2);
  const falsch = alle(v, `SELECT Mitglied.Vorname, Mitglied.Nachname, COUNT(*) AS Abteilungen FROM Mitglied, Mitgliedschaft
    WHERE Mitglied.MitgliedNr = Mitgliedschaft.MitgliedNr GROUP BY Mitglied.Vorname, Mitglied.Nachname`)
    .filter((z) => z.Nachname === 'Harms');
  const richtig = alle(v, `SELECT Mitglied.MitgliedNr, COUNT(*) AS Abteilungen FROM Mitglied, Mitgliedschaft
    WHERE Mitglied.MitgliedNr = Mitgliedschaft.MitgliedNr AND Mitglied.Nachname = 'Harms' GROUP BY Mitglied.MitgliedNr`);
  assert.deepEqual(falsch.map((z) => z.Abteilungen), [2]);
  assert.deepEqual(richtig.map((z) => z.Abteilungen), [1, 1]);
  assert.equal(wert(v, "SELECT COUNT(*) FROM MitgliederlisteRoh WHERE Mitglied = 'Svea Harms'"), 2);
});

test('tus/grenze: Eintritt genau 2026-01-01, Mitgliedschaft seit genau 2020-01-01', () => {
  const v = variante('tus', 'grenze');
  assert.equal(wert(v, 'SELECT Eintritt FROM Mitglied WHERE MitgliedNr = 902'), '2026-01-01');
  const neu = (sql) => spalte(v, sql).filter((id) => id >= 901);
  assert.deepEqual(neu("SELECT MitgliedNr FROM Mitglied WHERE Eintritt >= '2026-01-01'"), [902]);
  assert.deepEqual(neu("SELECT MitgliedNr FROM Mitglied WHERE Eintritt > '2026-01-01'"), []);
  assert.deepEqual(neu("SELECT MitgliedNr FROM Mitgliedschaft WHERE Seit = '2020-01-01'"), [903]);
  assert.deepEqual(neu("SELECT MitgliedNr FROM Mitgliedschaft WHERE Seit <= '2020-01-01'"), [903]);
  assert.deepEqual(neu("SELECT MitgliedNr FROM Mitgliedschaft WHERE Seit < '2020-01-01'"), []);
  assert.deepEqual(neu("SELECT MitgliedNr FROM Mitgliedschaft WHERE Seit < '2021-01-01'"), [903]);
});

test('tus/leer: Halle 901 Bootshaus ohne Abteilung', () => {
  const v = variante('tus', 'leer');
  assert.equal(wert(v, 'SELECT Name FROM Halle WHERE HalleNr = 901'), 'Bootshaus');
  assert.equal(wert(v, 'SELECT COUNT(*) FROM Abteilung WHERE HalleNr = 901'), 0);
  const jeHalle = spalte(v, `SELECT Halle.Name FROM Halle, Abteilung, Mitgliedschaft
    WHERE Halle.HalleNr = Abteilung.HalleNr AND Abteilung.AbteilungNr = Mitgliedschaft.AbteilungNr GROUP BY Halle.HalleNr`);
  assert.ok(!jeHalle.includes('Bootshaus'));
  assert.ok(spalte(v, 'SELECT Name FROM Halle').includes('Bootshaus'));
});

// ---------------------------------------------------------------- Detektei

test('detektei/null: Ermittler 901 ohne Mentor, Person 9001 ohne Jahrgang/Stadtteil, Beweisstück 9002 ohne Ort', () => {
  const v = variante('detektei', 'null');
  assert.deepEqual(alle(v, 'SELECT Dienstgrad, MentorNr FROM Ermittler WHERE ErmittlerNr = 901'),
    [{ Dienstgrad: 'Junior', MentorNr: null }]);
  assert.equal(wert(v, 'SELECT COUNT(*) FROM Ermittler WHERE MentorNr = NULL'), 0);
  assert.deepEqual(spalte(v, 'SELECT ErmittlerNr FROM Ermittler WHERE MentorNr IS NULL ORDER BY ErmittlerNr'), [1, 12, 901]);
  assert.deepEqual(alle(v, 'SELECT Jahrgang, Stadtteil FROM Person WHERE PersonNr = 9001'), [{ Jahrgang: null, Stadtteil: null }]);
  assert.deepEqual(spalte(v, 'SELECT FallNr FROM verdaechtig WHERE PersonNr = 9001'), [5]);
  assert.deepEqual(alle(v, 'SELECT FallNr, OrtNr FROM Beweisstueck WHERE BeweisNr = 9002'), [{ FallNr: 1, OrtNr: null }]);
  const richtig = spalte(v, 'SELECT BeweisNr FROM Beweisstueck WHERE FallNr = 1 ORDER BY BeweisNr');
  const falsch = spalte(v, `SELECT Beweisstueck.BeweisNr FROM Beweisstueck, Ort
    WHERE Beweisstueck.OrtNr = Ort.OrtNr AND Beweisstueck.FallNr = 1 ORDER BY Beweisstueck.BeweisNr`);
  assert.ok(richtig.includes(9002) && !falsch.includes(9002));
});

const IN_ALLEN_VIER = (gruppe) => `SELECT ${gruppe}, COUNT(*) AS Faelle FROM Person, verdaechtig
  WHERE Person.PersonNr = verdaechtig.PersonNr AND verdaechtig.FallNr IN (1, 2, 3, 4)
  GROUP BY ${gruppe} HAVING COUNT(*) = 4`;

test('detektei/gleichnamig: zweite Nora Falter – Gruppieren nach Namen liefert leeres Ergebnis', () => {
  const v = variante('detektei', 'gleichnamig');
  assert.deepEqual(alle(v, 'SELECT * FROM Person WHERE PersonNr = 9011'),
    [{ PersonNr: 9011, Vorname: 'Nora', Nachname: 'Falter', Jahrgang: 1959, Stadtteil: 'Nordheide' }]);
  assert.deepEqual(spalte(v, 'SELECT FallNr FROM verdaechtig WHERE PersonNr = 9011'), [2]);
  assert.deepEqual(alle(v, IN_ALLEN_VIER('Person.Vorname, Person.Nachname')), []);
  assert.deepEqual(alle(haupt('detektei'), IN_ALLEN_VIER('Person.Vorname, Person.Nachname')).length, 1);
  assert.deepEqual(alle(v, IN_ALLEN_VIER('Person.PersonNr, Person.Vorname, Person.Nachname')).map((z) => z.PersonNr), [13]);
  // „Wen kennt Nora Falter?“ über den Namen statt über PersonNr 13: die zweite Nora Falter kennt Person 46
  const ueberName = spalte(v, `SELECT kennt.BekannterNr FROM Person, kennt
    WHERE Person.PersonNr = kennt.PersonNr AND Person.Vorname = 'Nora' AND Person.Nachname = 'Falter'`);
  const ueberSchluessel = spalte(v, 'SELECT BekannterNr FROM kennt WHERE PersonNr = 13');
  assert.deepEqual(spalte(v, 'SELECT BekannterNr FROM kennt WHERE PersonNr = 9011'), [46]);
  assert.ok(!ueberSchluessel.includes(46));
  assert.equal(ueberName.length, ueberSchluessel.length + 1);
});

test('detektei/grenze: kennt 42 → 5 seit 2020, Fall 9021 eröffnet genau 2026-01-01', () => {
  const v = variante('detektei', 'grenze');
  assert.equal(wert(v, 'SELECT Seit FROM kennt WHERE PersonNr = 42 AND BekannterNr = 5'), 2020);
  assert.equal(wert(haupt('detektei'), 'SELECT COUNT(*) FROM kennt WHERE PersonNr = 42 AND BekannterNr = 5'), 0);
  assert.equal(wert(v, 'SELECT COUNT(*) FROM kennt WHERE PersonNr = 42 AND Seit >= 2020'), 1);
  assert.equal(wert(v, 'SELECT COUNT(*) FROM kennt WHERE PersonNr = 42 AND Seit > 2020'), 0);
  assert.equal(wert(v, 'SELECT Eroeffnet FROM Fall WHERE FallNr = 9021'), '2026-01-01');
  assert.ok(spalte(v, "SELECT FallNr FROM Fall WHERE Eroeffnet >= '2026-01-01'").includes(9021));
  assert.ok(!spalte(v, "SELECT FallNr FROM Fall WHERE Eroeffnet > '2026-01-01'").includes(9021));
});

const VERDACHT_JE_PERSON = `SELECT Person.PersonNr, COUNT(*) AS Faelle FROM Person, verdaechtig
  WHERE Person.PersonNr = verdaechtig.PersonNr GROUP BY Person.PersonNr ORDER BY Faelle DESC, Person.PersonNr`;

test('detektei/gleichstand: Person 9031 gleichauf mit Lasse Engelken auf Rang 2 – LIMIT 2 verliert eine', () => {
  const v = variante('detektei', 'gleichstand');
  assert.deepEqual(spalte(v, 'SELECT FallNr FROM verdaechtig WHERE PersonNr = 9031 ORDER BY FallNr'), [5, 6]);
  const rang = alle(v, VERDACHT_JE_PERSON);
  assert.deepEqual(rang.slice(0, 4).map((z) => [z.PersonNr, z.Faelle]), [[13, 4], [42, 2], [9031, 2], [rang[3].PersonNr, 1]]);
  assert.equal(rang.filter((z) => z.Faelle >= 2).length, 3);
  assert.equal(alle(v, `${VERDACHT_JE_PERSON} LIMIT 2`).length, 2);
});

test('detektei/leer: Fall 9041 ohne alles, Ermittler 902 ohne Fall, Ort 9042 ohne Aussage', () => {
  const v = variante('detektei', 'leer');
  for (const t of ['verdaechtig', 'Aussage', 'Beweisstueck']) {
    assert.equal(wert(v, `SELECT COUNT(*) FROM ${t} WHERE FallNr = 9041`), 0, t);
  }
  assert.equal(wert(v, 'SELECT COUNT(*) FROM Fall WHERE FallNr = 9041'), 1);
  assert.equal(wert(v, 'SELECT COUNT(*) FROM Fall WHERE LeiterNr = 902'), 0);
  assert.equal(wert(v, 'SELECT COUNT(*) FROM Ermittler WHERE ErmittlerNr = 902'), 1);
  assert.equal(wert(v, 'SELECT COUNT(*) FROM Aussage WHERE OrtNr = 9042'), 0);
  assert.equal(wert(v, 'SELECT COUNT(*) FROM Beweisstueck WHERE OrtNr = 9042'), 0);
  const jeLeitung = spalte(v, `SELECT Ermittler.ErmittlerNr FROM Ermittler, Fall
    WHERE Ermittler.ErmittlerNr = Fall.LeiterNr GROUP BY Ermittler.ErmittlerNr`);
  assert.ok(!jeLeitung.includes(902));
  const jeOrt = spalte(v, 'SELECT Ort.OrtNr FROM Ort, Aussage WHERE Ort.OrtNr = Aussage.OrtNr GROUP BY Ort.OrtNr');
  assert.ok(!jeOrt.includes(9042));
});

// ---------------------------------------------------------------- Datenspuren
// Exporte ohne künstliche Ganzzahl-Schlüssel: neue Einwohner ab 9001, neue Tokens/Geräte mit Ziffernteil ab 9001
// (z. B. 'K-9021', 'WA-9041'), die es in der Haupt-DB noch nicht gibt.

const DS_TABELLEN = [
  { tabelle: 'Einwohner', schluessel: ['EinwohnerNr'], token: null },
  { tabelle: 'RadExport', schluessel: ['KundenToken', 'Start'], token: 'KundenToken' },
  { tabelle: 'FestZahlung', schluessel: ['KartenToken', 'Zeitpunkt'], token: 'KartenToken' },
  { tabelle: 'VereinExport', schluessel: ['MitgliedToken', 'Abteilung'], token: 'MitgliedToken' },
  { tabelle: 'AppCheckin', schluessel: ['Geraet', 'Zeitpunkt'], token: 'Geraet' }
];

for (const typ of ERWARTET.datenspuren) {
  test(`datenspuren/${typ}: baut fehlerfrei, neue Schlüssel/Tokens im reservierten Bereich, Haupt-Daten unverändert`, () => {
    const h = haupt('datenspuren');
    const v = variante('datenspuren', typ);
    assert.equal(v.pragma('integrity_check', { simple: true }), 'ok');
    let neu = 0;
    for (const { tabelle, schluessel, token } of DS_TABELLEN) {
      const ordnung = schluessel.map((s) => `"${s}"`).join(', ');
      const k = (z) => JSON.stringify(schluessel.map((s) => z[s]));
      const vorher = alle(h, `SELECT * FROM ${tabelle} ORDER BY ${ordnung}`);
      const nachher = alle(v, `SELECT * FROM ${tabelle} ORDER BY ${ordnung}`);
      const alt = new Map(vorher.map((z) => [k(z), z]));
      const altTokens = token ? new Set(vorher.map((z) => z[token])) : null;
      for (const z of nachher) {
        if (alt.has(k(z))) {
          assert.deepEqual(z, alt.get(k(z)), `${tabelle}: Haupt-Datensatz verändert`);
          continue;
        }
        neu++;
        if (token) {
          assert.ok(!altTokens.has(z[token]), `${tabelle}: Token ${z[token]} gibt es schon in der Haupt-DB`);
          assert.match(z[token], /^[A-Z]+-9[0-9A-F]{3}$/);
          assert.ok(Number.parseInt(z[token].split('-')[1], 16) >= 0x9001, `${tabelle}: ${z[token]} unter 9001`);
        } else {
          assert.ok(z.EinwohnerNr >= 9001, `Einwohner ${z.EinwohnerNr} liegt nicht im reservierten Bereich`);
        }
      }
      // gelöscht wird nur in „leer“ (Einwohner im Stadtteil Deichkamp)
      const geblieben = new Set(nachher.map(k));
      const weg = vorher.filter((z) => !geblieben.has(k(z)));
      if (typ === 'leer' && tabelle === 'Einwohner') {
        assert.ok(weg.length > 0 && weg.every((z) => z.Stadtteil === 'Deichkamp'));
      } else {
        assert.deepEqual(weg, [], `${tabelle}: Haupt-Datensätze gelöscht`);
      }
    }
    assert.ok(neu > 0, 'Delta fügt keinen Datensatz hinzu');
  });
}

test('datenspuren/null: V-9001 ohne Geburtsjahr in Tischtennis – != 1988 und = NULL verlieren ihn', () => {
  const v = variante('datenspuren', 'null');
  assert.deepEqual(alle(v, "SELECT * FROM VereinExport WHERE MitgliedToken = 'V-9001'"),
    [{ MitgliedToken: 'V-9001', Geburtsjahr: null, Abteilung: 'Tischtennis', Stadtteil: 'Hafenviertel' }]);
  const falsch = spalte(v, `SELECT MitgliedToken FROM VereinExport
    WHERE Abteilung = 'Tischtennis' AND Geburtsjahr != 1988`);
  const richtig = spalte(v, `SELECT MitgliedToken FROM VereinExport
    WHERE Abteilung = 'Tischtennis' AND (Geburtsjahr != 1988 OR Geburtsjahr IS NULL)`);
  assert.ok(richtig.includes('V-9001') && !falsch.includes('V-9001'));
  assert.equal(richtig.length, falsch.length + 2); // V-9952 (Nora Falter) und V-9001
  assert.equal(wert(v, 'SELECT COUNT(*) FROM VereinExport WHERE Geburtsjahr = NULL'), 0);
  assert.deepEqual(spalte(v, 'SELECT MitgliedToken FROM VereinExport WHERE Geburtsjahr IS NULL ORDER BY 1'),
    ['V-9001', 'V-9952']);
  // Stufe 5 bleibt eindeutig
  assert.deepEqual(spalte(v, `SELECT MitgliedToken FROM VereinExport
    WHERE Geburtsjahr = 1988 AND Stadtteil = 'Hafenviertel' AND Abteilung = 'Tischtennis'`), ['V-2571']);
});

test('datenspuren/gleichnamig: zweiter Ole Brakhage (2001, Nordheide) – Suche nach Namen ist mehrdeutig', () => {
  const v = variante('datenspuren', 'gleichnamig');
  assert.deepEqual(alle(v, 'SELECT * FROM Einwohner WHERE EinwohnerNr = 9011'), [{
    EinwohnerNr: 9011, Vorname: 'Ole', Nachname: 'Brakhage', Jahrgang: 2001, Stadtteil: 'Nordheide', Strasse: 'Heideweg 4'
  }]);
  const ueberName = "SELECT Strasse FROM Einwohner WHERE Vorname = 'Ole' AND Nachname = 'Brakhage' ORDER BY Strasse";
  assert.deepEqual(spalte(haupt('datenspuren'), ueberName), ['Lotsengang 2']);
  assert.deepEqual(spalte(v, ueberName), ['Heideweg 4', 'Lotsengang 2']);
  // Abgleich mit dem Vereinseintrag V-4417 (1988, Hafenviertel, Fußball) über Jahrgang + Stadtteil bleibt richtig
  const ueberMerkmale = `SELECT Einwohner.EinwohnerNr FROM VereinExport, Einwohner
    WHERE VereinExport.Geburtsjahr = Einwohner.Jahrgang AND VereinExport.Stadtteil = Einwohner.Stadtteil
      AND VereinExport.MitgliedToken = 'V-4417' ORDER BY Einwohner.EinwohnerNr`;
  assert.deepEqual(spalte(v, ueberMerkmale), [1042, 1107, 1163]);
});

const STUFE1_MIT_KLAMMERN = `SELECT KundenToken, COUNT(*) AS Fahrten FROM RadExport
  WHERE StartStation = 'Hafenkante'
    AND (Start BETWEEN '2026-09-08 00:00' AND '2026-09-08 04:00'
      OR Start BETWEEN '2026-09-09 00:00' AND '2026-09-09 04:00'
      OR Start BETWEEN '2026-09-10 00:00' AND '2026-09-10 04:00'
      OR Start BETWEEN '2026-09-11 00:00' AND '2026-09-11 04:00'
      OR Start BETWEEN '2026-09-12 00:00' AND '2026-09-12 04:00')
  GROUP BY KundenToken ORDER BY KundenToken`;
const STUFE1_OHNE_KLAMMERN = `SELECT KundenToken, COUNT(*) AS Fahrten FROM RadExport
  WHERE StartStation = 'Hafenkante'
    AND Start BETWEEN '2026-09-08 00:00' AND '2026-09-08 04:00'
     OR Start BETWEEN '2026-09-09 00:00' AND '2026-09-09 04:00'
     OR Start BETWEEN '2026-09-10 00:00' AND '2026-09-10 04:00'
     OR Start BETWEEN '2026-09-11 00:00' AND '2026-09-11 04:00'
     OR Start BETWEEN '2026-09-12 00:00' AND '2026-09-12 04:00'
  GROUP BY KundenToken ORDER BY KundenToken`;

test('datenspuren/grenze: Kartenzahlung genau 23:00 und Nachtfahrt ab Marktplatz entlarven BETWEEN und fehlende Klammern', () => {
  const h = haupt('datenspuren');
  const v = variante('datenspuren', 'grenze');
  assert.deepEqual(alle(v, "SELECT StandNr, Zeitpunkt FROM FestZahlung WHERE KartenToken = 'K-9021'"),
    [{ StandNr: 4, Zeitpunkt: '2026-08-29 23:00' }]);
  assert.deepEqual(alle(v, "SELECT * FROM RadExport WHERE KundenToken = 'R-9022'"), [{
    KundenToken: 'R-9022', Jahrgang: 1979, Stadtteil: 'Altstadt', Tarif: 'Basis', StartStation: 'Marktplatz',
    Start: '2026-09-10 03:40'
  }]);
  const stunde = (bis) => `SELECT COUNT(*) FROM FestZahlung
    WHERE StandNr = 4 AND Zeitpunkt BETWEEN '2026-08-29 22:00' AND '2026-08-29 ${bis}'`;
  assert.equal(wert(h, stunde('23:00')), 0);
  assert.equal(wert(v, stunde('23:00')), 1);
  assert.equal(wert(v, stunde('22:59')), 0);
  // Stufe 1: auf der Haupt-DB liefert die Fehlabfrage zufällig dasselbe, auf der Variante eine Zeile mehr
  assert.deepEqual(alle(h, STUFE1_OHNE_KLAMMERN), alle(h, STUFE1_MIT_KLAMMERN));
  assert.deepEqual(alle(v, STUFE1_MIT_KLAMMERN), [{ KundenToken: 'R-7F3A', Fahrten: 5 }]);
  assert.deepEqual(alle(v, STUFE1_OHNE_KLAMMERN),
    [{ KundenToken: 'R-7F3A', Fahrten: 5 }, { KundenToken: 'R-9022', Fahrten: 1 }]);
});

const GRUPPEN = `SELECT Jahrgang, Stadtteil, COUNT(*) AS Anzahl FROM Einwohner
  GROUP BY Jahrgang, Stadtteil ORDER BY Anzahl DESC, Jahrgang`;

test('datenspuren/gleichstand: zwei größte (Jahrgang, Stadtteil)-Gruppen gleich groß – LIMIT 1 verliert eine', () => {
  const h = haupt('datenspuren');
  const v = variante('datenspuren', 'gleichstand');
  const groesste = (db) => {
    const g = alle(db, GRUPPEN);
    return g.filter((z) => z.Anzahl === g[0].Anzahl).map((z) => [z.Jahrgang, z.Stadtteil, z.Anzahl]);
  };
  assert.deepEqual(groesste(h), [[1991, 'Bahnhofsviertel', 4]]);
  assert.deepEqual(groesste(v), [[1983, 'Nordheide', 4], [1991, 'Bahnhofsviertel', 4]]);
  assert.equal(alle(v, `${GRUPPEN} LIMIT 1`).length, 1);
  // Reservierung bleibt: 1988 + Hafenviertel genau dreimal
  assert.equal(wert(v, "SELECT COUNT(*) FROM Einwohner WHERE Jahrgang = 1988 AND Stadtteil = 'Hafenviertel'"), 3);
});

test('datenspuren/leer: Deichkamp ohne Einwohner, WA-9041 nur an Adressen ohne Einwohner', () => {
  const h = haupt('datenspuren');
  const v = variante('datenspuren', 'leer');
  const jeStadtteil = 'SELECT Stadtteil FROM Einwohner GROUP BY Stadtteil ORDER BY Stadtteil';
  assert.ok(spalte(h, jeStadtteil).includes('Deichkamp'));
  assert.ok(!spalte(v, jeStadtteil).includes('Deichkamp'));
  assert.equal(spalte(v, jeStadtteil).length, 7);
  const orte = spalte(v, "SELECT Ort FROM AppCheckin WHERE Geraet = 'WA-9041'");
  assert.ok(orte.length >= 2);
  const zeiten = spalte(v, "SELECT Zeitpunkt FROM AppCheckin WHERE Geraet = 'WA-9041'");
  assert.ok(zeiten.every((t) => t.slice(11) < '06:00'), 'nächtliche Adress-Check-ins');
  const verbund = `SELECT COUNT(*) FROM AppCheckin, Einwohner
    WHERE AppCheckin.Ort = Einwohner.Strasse AND AppCheckin.Geraet = 'WA-9041'`;
  assert.equal(wert(v, verbund), 0);
  // in der Haupt-DB wohnte an diesen Adressen jemand (Deichkamp)
  for (const ort of new Set(orte)) {
    assert.equal(wert(v, 'SELECT COUNT(*) FROM Einwohner WHERE Strasse = ?', ort), 0, ort);
    assert.equal(wert(h, 'SELECT Stadtteil FROM Einwohner WHERE Strasse = ?', ort), 'Deichkamp', ort);
  }
});
