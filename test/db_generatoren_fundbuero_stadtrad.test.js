'use strict';
// Tests der Generatoren Fundbuero und StadtRad (Plan Phase 2, Task 2):
// Abnahme-Prüfungen der LIESMICH-Dateien, Pflicht-/Übernahme-Datensätze unverändert, Story-Fakten, Determinismus.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

const bau = require('../scripts/db_bauen');
const { pruefeBasisText, primaerschluessel } = require('../scripts/db/sql_schreiben');

const SEED = path.join(__dirname, '..', 'seed', 'datenbanken');

/** Gebaute DBs einmal je Testdatei (Bau ist deterministisch). */
const gebaut = new Map();
function baue(name) {
  if (!gebaut.has(name)) gebaut.set(name, bau.baueDb(name));
  return gebaut.get(name);
}

/** DB nur aus schema.sql (+ uebernahme.sql) + pflicht.sql – die Referenz für „unverändert“. */
function referenz(name) {
  const db = new Database(':memory:');
  for (const datei of ['schema.sql', 'uebernahme.sql', 'pflicht.sql']) {
    const pfad = path.join(SEED, name, datei);
    if (fs.existsSync(pfad)) db.exec(fs.readFileSync(pfad, 'utf8'));
  }
  return db;
}

function abnahmeNamen(bericht) {
  return bericht.abnahme.map((p) => p.name);
}

function pruefungOk(bericht, muster) {
  const treffer = bericht.abnahme.filter((p) => muster.test(p.name));
  assert.ok(treffer.length > 0, `keine Abnahme-Prüfung zu ${muster}: ${abnahmeNamen(bericht).join(' | ')}`);
  for (const p of treffer) assert.ok(p.ok, `${p.name}: ist ${JSON.stringify(p.ist)}, soll ${JSON.stringify(p.soll)}`);
}

for (const name of ['fundbuero', 'stadtrad']) {
  test(`${name}: Bau mit Generator, alle Abnahme-Prüfungen und Beispielabfragen grün`, () => {
    const { bericht } = baue(name);
    assert.equal(bericht.status, 'fertig', bericht.meldungen.join('; '));
    assert.ok(bericht.schritte.includes('generator'));
    for (const p of bericht.abnahme) assert.ok(p.ok, `${p.name}: ist ${JSON.stringify(p.ist)}, soll ${JSON.stringify(p.soll)}`);
    const liesmich = fs.readFileSync(path.join(SEED, name, 'LIESMICH.md'), 'utf8');
    const anzahl = bau.extrahiereSqlBloecke(liesmich).filter((b) => !b.fehlabfrage).length;
    assert.ok(anzahl >= 8);
    assert.equal(bericht.beispiele.filter((b) => !b.fehlabfrage && b.ok).length, anzahl);
  });

  test(`${name}: Pflicht- und Übernahme-Datensätze unverändert`, () => {
    const { db } = baue(name);
    const ref = referenz(name);
    const tabellen = ref.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY rowid").pluck().all();
    for (const t of tabellen) {
      const pk = primaerschluessel(ref, t);
      const zeilenRef = ref.prepare(`SELECT * FROM "${t}"`).raw().all();
      const pkIndex = ref.prepare(`SELECT * FROM "${t}"`).columns().findIndex((c) => c.name === pk[0]);
      for (const zeile of zeilenRef) {
        const ist = db.prepare(`SELECT * FROM "${t}" WHERE "${pk[0]}" = ?`).raw().get(zeile[pkIndex]);
        assert.deepEqual(ist, zeile, `${t} ${pk[0]} = ${zeile[pkIndex]}`);
      }
    }
    ref.close();
  });

  test(`${name}: eingechecktes basis.sql ist byteidentisch reproduzierbar, Prüfsumme stimmt, Rundlauf`, () => {
    const { db } = baue(name);
    const neu = bau.basisText(name, db);
    const datei = path.join(SEED, name, 'basis.sql');
    assert.ok(fs.existsSync(datei), 'basis.sql fehlt');
    const eingecheckt = fs.readFileSync(datei, 'utf8');
    assert.equal(neu, eingecheckt);
    assert.equal(pruefeBasisText(eingecheckt).ok, true);
    // Zweiter, unabhängiger Bau → identisch
    const zweiter = bau.baueDb(name);
    assert.equal(bau.basisText(name, zweiter.db), eingecheckt);
    zweiter.db.close();
    const rund = new Database(':memory:');
    rund.exec(eingecheckt);
    assert.deepEqual(rund.pragma('foreign_key_check'), []);
    assert.equal(bau.basisText(name, rund), eingecheckt);
    rund.close();
  });
}

// ---------------------------------------------------------------- Fundbuero

test('fundbuero: Abnahme enthält alle Zeilen der LIESMICH-Tabelle', () => {
  const { bericht } = baue('fundbuero');
  for (const muster of [
    /Anzahl, kleinste und größte FundNr/, /Beispiel 5/, /LIKE '%ompass%'/, /LIKE '%essing%'/, /N\. F.*falter/i,
    /fünf höchsten Werte/, /AbgeholtAm < Funddatum/, /NULL-Anteil Farbe/, /NULL-Anteil Wert/, /NULL-Anteil Finder/,
    /NULL-Anteil AbgeholtAm/, /AbgeholtAm = Funddatum/, /Wert = 100/, /Septemberwoche/
  ]) pruefungOk(bericht, muster);
});

test('fundbuero: Story-Fakten (Messing-Kompass FundNr 36) und Generator-Vorgaben', () => {
  const { db } = baue('fundbuero');
  assert.deepEqual(db.prepare('SELECT * FROM Fundsache WHERE FundNr = 36').raw().get(),
    [36, 'Messing-Kompass', 'Wertsachen', 'gold', 'Weserpromenade', 'Weserufer', '2026-06-18', 450, 'N. Falter', '2026-09-14']);
  // FundNr 1–80 aufsteigend nach Funddatum (gleiche Tage erlaubt)
  const daten = db.prepare('SELECT Funddatum FROM Fundsache ORDER BY FundNr').pluck().all();
  assert.deepEqual(daten, [...daten].sort());
  assert.ok(daten[0] >= '2026-04-01' && daten[79] <= '2026-09-20');
  // erzeugte Werte ≤ 150, genau 3 × 100 und 2 × 50
  assert.equal(db.prepare('SELECT COUNT(*) FROM Fundsache WHERE Wert > 150 AND FundNr NOT IN (36, 42, 44, 51)').pluck().get(), 0);
  assert.equal(db.prepare('SELECT COUNT(*) FROM Fundsache WHERE Wert = 50').pluck().get(), 2);
  // „uhr“ nur in Armbanduhr (3–5 erzeugte) und der Pflicht-Kinderuhr
  const uhren = db.prepare("SELECT Bezeichnung FROM Fundsache WHERE Bezeichnung LIKE '%uhr%' AND FundNr != 49").pluck().all();
  assert.ok(uhren.every((b) => b === 'Armbanduhr'));
  assert.ok(uhren.length - 1 >= 3 && uhren.length - 1 <= 5);
  // Fundort passt immer zum Stadtteil (jeder Fundort genau ein Stadtteil)
  assert.equal(db.prepare('SELECT COUNT(*) FROM (SELECT Fundort FROM Fundsache GROUP BY Fundort HAVING COUNT(DISTINCT Stadtteil) > 1)').pluck().get(), 0);
  // nur FundNr 36 mit mehr als 60 Tagen bis zur Abholung
  assert.deepEqual(db.prepare("SELECT FundNr FROM Fundsache WHERE julianday(AbgeholtAm) - julianday(Funddatum) > 60").pluck().all(), [36]);
});

test('fundbuero: Abnahme erkennt Manipulationen', () => {
  const fundbuero = require('../scripts/db/fundbuero');
  const db = new Database(':memory:');
  db.exec(fs.readFileSync(path.join(SEED, 'fundbuero', 'basis.sql'), 'utf8'));
  db.prepare("UPDATE Fundsache SET Bezeichnung = 'Kompass' WHERE FundNr = 1").run();
  db.prepare("UPDATE Fundsache SET Finder = 'N. Fehrmann' WHERE FundNr = 2").run();
  db.prepare('UPDATE Fundsache SET Wert = 460 WHERE FundNr = 3').run();
  const fehl = fundbuero.abnahme(db).filter((p) => !p.ok).map((p) => p.name);
  assert.ok(fehl.some((n) => /ompass/.test(n)), fehl.join('; '));
  assert.ok(fehl.some((n) => /falter/i.test(n)), fehl.join('; '));
  assert.ok(fehl.some((n) => /fünf höchsten/.test(n)), fehl.join('; '));
  db.close();
});

// ---------------------------------------------------------------- StadtRad

test('stadtrad: Abnahme enthält alle Zeilen der LIESMICH-Tabelle', () => {
  const { bericht } = baue('stadtrad');
  for (const muster of [
    /Zeilen Station/, /Zeilen Rad/, /Zeilen Kunde/, /Zeilen Ausleihe/, /Zeilen Reparatur/, /Starts 00:00–05:59/,
    /MIN\(Start\)/, /Ende IS NULL/, /Kunden 64 und 77/, /Jahrgang 1988 \+ Hafenviertel/, /Gleichnamige/,
    /Räder 41–45/, /Falkenrath/, /Stadtfest-Samstag/, /Beispiel 7/, /Preisformel/, /ohne Ausleihe/
  ]) pruefungOk(bericht, muster);
});

test('stadtrad: Story-Fakten (Nachtfahrten 303–307, Kunde 77, Räder 41–45) und Generator-Vorgaben', () => {
  const { db } = baue('stadtrad');
  assert.deepEqual(db.prepare('SELECT * FROM Kunde WHERE KundenID = 77').raw().get(), [77, 'Nora', 'Falter', 1988, 'Plus', 'Hafenviertel']);
  assert.deepEqual(db.prepare(`SELECT AusleihID, RadID, KundenID, StartStation, ZielStation, Start, Ende, DauerMin, Preis
    FROM Ausleihe WHERE KundenID = 77 ORDER BY AusleihID`).raw().all(), [
    [303, 41, 77, 13, null, '2026-09-08 01:14', null, null, null],
    [304, 42, 77, 13, null, '2026-09-09 01:32', null, null, null],
    [305, 43, 77, 13, null, '2026-09-10 01:05', null, null, null],
    [306, 44, 77, 13, null, '2026-09-11 01:48', null, null, null],
    [307, 45, 77, 13, null, '2026-09-12 01:21', null, null, null]
  ]);
  assert.deepEqual(db.prepare("SELECT RadID FROM Rad WHERE Status = 'vermisst' ORDER BY RadID").pluck().all(), [41, 42, 43, 44, 45]);
  // IDs lückenlos: Kunde 1–80, Ausleihe 1–469, Reparatur 1–36
  for (const [t, s, n] of [['Kunde', 'KundenID', 80], ['Ausleihe', 'AusleihID', 469], ['Reparatur', 'ReparaturID', 36]]) {
    assert.deepEqual(db.prepare(`SELECT COUNT(*), MIN(${s}), MAX(${s}) FROM ${t}`).raw().get(), [n, 1, n], t);
  }
  // reguläre Fahrten 311–460 chronologisch, laufende 461–469 am 20.09. 15:00–19:00 ab der früheren Station
  const regulaer = db.prepare('SELECT Start FROM Ausleihe WHERE AusleihID BETWEEN 311 AND 460 ORDER BY AusleihID').pluck().all();
  assert.deepEqual(regulaer, [...regulaer].sort());
  const laufend = db.prepare(`SELECT RadID, StartStation, Start FROM Ausleihe WHERE AusleihID BETWEEN 461 AND 469
    ORDER BY RadID`).raw().all();
  const frueher = { 1: 4, 5: 1, 9: 9, 18: 8, 20: 11, 23: 11, 29: 3, 32: 6, 35: 9 };
  assert.deepEqual(laufend.map((l) => [l[0], l[1]]), Object.entries(frueher).map(([r, s]) => [Number(r), s]));
  for (const l of laufend) assert.ok(l[2] >= '2026-09-20 15:00' && l[2] <= '2026-09-20 19:00', l[2]);
  // Kunden ohne Ausleihe: genau die zwei Neuanmeldungen 79, 80
  assert.deepEqual(db.prepare(`SELECT KundenID FROM Kunde WHERE KundenID NOT IN (SELECT KundenID FROM Ausleihe)
    ORDER BY KundenID`).pluck().all(), [79, 80]);
});

test('stadtrad: Abnahme erkennt Manipulationen', () => {
  const stadtrad = require('../scripts/db/stadtrad');
  const db = new Database(':memory:');
  db.exec(fs.readFileSync(path.join(SEED, 'stadtrad', 'basis.sql'), 'utf8'));
  db.prepare("UPDATE Ausleihe SET Start = substr(Start, 1, 11) || '03:10' WHERE AusleihID = 320").run();
  db.prepare("UPDATE Kunde SET Jahrgang = 1988, Stadtteil = 'Hafenviertel' WHERE KundenID = 30").run();
  db.prepare('UPDATE Ausleihe SET Preis = Preis + 1 WHERE AusleihID = 330').run();
  const fehl = stadtrad.abnahme(db).filter((p) => !p.ok).map((p) => p.name);
  assert.ok(fehl.some((n) => /00:00–05:59/.test(n)), fehl.join('; '));
  assert.ok(fehl.some((n) => /1988/.test(n)), fehl.join('; '));
  assert.ok(fehl.some((n) => /Preisformel/.test(n)), fehl.join('; '));
  db.close();
});

test('lauf --pruefen: Fundbuero und StadtRad identisch', () => {
  const zeilen = [];
  for (const nur of ['fundbuero', 'stadtrad']) {
    const code = bau.lauf({ pruefen: true, nur, log: (t) => zeilen.push(String(t)) });
    assert.equal(code, 0, zeilen.join('\n'));
  }
  assert.match(zeilen.join('\n'), /fundbuero: identisch/);
  assert.match(zeilen.join('\n'), /stadtrad: identisch/);
});
