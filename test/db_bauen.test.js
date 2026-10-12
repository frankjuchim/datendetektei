'use strict';
// Tests für den Bau der Übungsdatenbanken (scripts/db_bauen.js und scripts/db/*).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Database = require('better-sqlite3');

const zufallModul = require('../scripts/db/zufall');
const { fnv1a32, mulberry32, seedText, erzeugeZufall, versuche, zuMinuten, alsZeitpunkt, plusMinuten } = zufallModul;
const { ladeNamen } = require('../scripts/db/namen');
const { formatiereWert, schreibeBasis, pruefeBasisText, primaerschluessel, DATEN_MARKE } = require('../scripts/db/sql_schreiben');
const bau = require('../scripts/db_bauen');

const SEED = path.join(__dirname, '..', 'seed', 'datenbanken');

function tempVerzeichnis() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'db-bauen-'));
}

/** Legt eine kleine Probe-DB als Quellordner an (Schema, Übernahme, Pflicht, LIESMICH). */
function probeQuellen({ liesmich } = {}) {
  const quellen = tempVerzeichnis();
  const ordner = path.join(quellen, 'probe');
  fs.mkdirSync(ordner);
  fs.writeFileSync(path.join(ordner, 'schema.sql'), [
    'PRAGMA foreign_keys = ON;',
    'CREATE TABLE Ort (OrtNr INTEGER PRIMARY KEY, Name TEXT NOT NULL);',
    'CREATE TABLE Eintrag (',
    '  EintragNr INTEGER PRIMARY KEY,',
    '  OrtNr INTEGER NOT NULL,',
    '  Quelle TEXT NOT NULL,',
    '  FOREIGN KEY (OrtNr) REFERENCES Ort(OrtNr)',
    ');',
    ''
  ].join('\n'));
  fs.writeFileSync(path.join(ordner, 'uebernahme.sql'),
    "INSERT INTO Ort VALUES (1, 'Altstadt');\nINSERT INTO Eintrag VALUES (1, 1, 'uebernahme');\n");
  fs.writeFileSync(path.join(ordner, 'pflicht.sql'), "INSERT INTO Eintrag VALUES (5, 1, 'pflicht');\n");
  fs.writeFileSync(path.join(ordner, 'LIESMICH.md'), liesmich || [
    '# Probe', '', '```sql', 'SELECT Name', 'FROM Ort', '```', '',
    '```sql', '-- Fehlabfrage (P2): gibt es nicht', 'SELECT Gibtsnicht FROM Ort', '```', ''
  ].join('\n'));
  return quellen;
}

function stilleAusgabe() {
  const zeilen = [];
  return { zeilen, log: (t) => zeilen.push(String(t)) };
}

// ---------------------------------------------------------------- zufall.js

test('FNV-1a-32: Referenzwerte', () => {
  assert.equal(fnv1a32(''), 0x811c9dc5);
  assert.equal(fnv1a32('a'), 0xe40c292c);
  assert.equal(fnv1a32('foobar'), 0xbf9cf968);
  // UTF-8-Bytes, nicht UTF-16-Einheiten
  assert.equal(fnv1a32('ü'), fnv1a32(Buffer.from([0xc3, 0xbc])));
  assert.notEqual(fnv1a32('ü'), fnv1a32(Buffer.from([0xfc])));
});

test('Seed-Text und Seed je DB', () => {
  assert.equal(seedText('tus'), 'datendetektei:tus:v1');
  assert.equal(erzeugeZufall(seedText('tus')).seed, fnv1a32('datendetektei:tus:v1'));
});

test('mulberry32: gleicher Seed → gleiche Folge, Werte in [0, 1)', () => {
  const a = mulberry32(12345);
  const b = mulberry32(12345);
  const c = mulberry32(12346);
  const fa = Array.from({ length: 20 }, () => a());
  const fb = Array.from({ length: 20 }, () => b());
  const fc = Array.from({ length: 20 }, () => c());
  assert.deepEqual(fa, fb);
  assert.notDeepEqual(fa, fc);
  for (const x of fa) assert.ok(x >= 0 && x < 1);
});

test('Zufall: ganz, waehle, gewichtet, mischen, ja', () => {
  const z = erzeugeZufall('test:hilfen');
  const zahlen = Array.from({ length: 500 }, () => z.ganz(3, 5));
  assert.deepEqual([...new Set(zahlen)].sort(), [3, 4, 5]);
  const liste = ['a', 'b', 'c'];
  for (let i = 0; i < 50; i++) assert.ok(liste.includes(z.waehle(liste)));
  for (let i = 0; i < 200; i++) assert.notEqual(z.gewichtet([['nie', 0], ['oft', 3], ['selten', 1]]), 'nie');
  const gemischt = z.mischen([1, 2, 3, 4, 5, 6]);
  assert.deepEqual([...gemischt].sort(), [1, 2, 3, 4, 5, 6]);
  assert.equal(z.ja(0), false);
  assert.equal(z.ja(1), true);
  const s = z.stichprobe([1, 2, 3, 4, 5, 6, 7, 8], 4);
  assert.equal(new Set(s).size, 4);
  assert.throws(() => z.waehle([]));
});

test('Zufall: zeitpunkt() formatiert JJJJ-MM-TT hh:mm im Bereich, datum() JJJJ-MM-TT', () => {
  const z = erzeugeZufall('test:zeit');
  for (let i = 0; i < 300; i++) {
    const t = z.zeitpunkt('2026-08-21 00:00', '2026-09-20 20:00');
    assert.match(t, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
    assert.ok(t >= '2026-08-21 00:00' && t <= '2026-09-20 20:00', t);
    const r = z.zeitpunkt('2026-08-29 22:00', '2026-08-29 23:00', { raster: 5 });
    assert.equal(Number(r.slice(-2)) % 5, 0);
    const d = z.datum('2026-04-01', '2026-09-20');
    assert.match(d, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(d >= '2026-04-01' && d <= '2026-09-20');
  }
  assert.equal(alsZeitpunkt(zuMinuten('2026-02-28 23:59') + 1), '2026-03-01 00:00');
  assert.equal(plusMinuten('2026-09-08 01:05', 43), '2026-09-08 01:48');
  assert.equal(zufallModul.wochentag('2026-08-29'), 6); // Samstag (ISO: Mo = 1 … So = 7)
});

test('Zufall: teil() ist deterministisch und unabhängig, versuche() bricht nach max ab', () => {
  const a = erzeugeZufall('test:teil').teil('kasse');
  const b = erzeugeZufall('test:teil').teil('kasse');
  assert.equal(a.zahl(), b.zahl());
  assert.notEqual(erzeugeZufall('test:teil').teil('x').seed, erzeugeZufall('test:teil').teil('y').seed);
  const z = erzeugeZufall('test:versuche');
  const erg = versuche(z, 'gerade', (t) => { const n = t.ganz(1, 100); return n % 2 === 0 ? n : undefined; });
  assert.equal(erg, versuche(erzeugeZufall('test:versuche'), 'gerade', (t) => { const n = t.ganz(1, 100); return n % 2 === 0 ? n : undefined; }));
  assert.throws(() => versuche(z, 'nie', () => undefined, 10), /10 Versuche/);
});

test('Im Bau kein Math.random und kein Date.now', () => {
  const dateien = ['db_bauen.js', 'db/zufall.js', 'db/namen.js', 'db/sql_schreiben.js', 'db/tus.js', 'db/eisdiele.js',
    'db/abnahme_hilfen.js'];
  for (const d of dateien) {
    const text = fs.readFileSync(path.join(__dirname, '..', 'scripts', d), 'utf8');
    assert.doesNotMatch(text, /Math\.random|Date\.now|new Date\(\)/, d);
  }
});

// ---------------------------------------------------------------- namen.js

test('Namen: Sperrliste greift – reservierter Nachname wird nie gezogen', () => {
  const namen = ladeNamen({
    vornamen: ['Anke', 'Arne', 'Bente', 'Birte', 'Carla', 'Dana', 'Eike', 'Finn'],
    nachnamen: ['Falter', 'Abeling', 'Lorenz', 'Backhaus'],
    reservierteNachnamen: ['Falter', 'Lorenz'],
    reservierteKombinationen: [{ jahrgang: 1988, stadtteil: 'Hafenviertel' }],
    gesperrteKombinationen: [{ vorname: 'Anke', nachname: 'Abeling' }],
    reservierteAdressen: ['Kranstraße 7'],
    strassen: { Hafenviertel: ['Kranstraße'] }
  });
  const personen = namen.erzeugePersonen(erzeugeZufall('test:namen'), { belegt: ['Arne Backhaus'] });
  const gezogen = Array.from({ length: 14 }, () => personen.naechste());
  for (const p of gezogen) {
    assert.ok(!['Falter', 'Lorenz'].includes(p.nachname), p.nachname);
    assert.notEqual(`${p.vorname} ${p.nachname}`, 'Anke Abeling');
    assert.notEqual(`${p.vorname} ${p.nachname}`, 'Arne Backhaus');
  }
  assert.equal(new Set(gezogen.map((p) => `${p.vorname} ${p.nachname}`)).size, 14);
  assert.throws(() => personen.naechste(), /keine freie Namenskombination/);
  assert.equal(namen.istReservierterNachname('falter'), true);
  assert.equal(namen.kombinationErlaubt(1988, 'Hafenviertel'), false);
  assert.equal(namen.kombinationErlaubt(1988, 'Altstadt'), true);
  assert.equal(namen.kombinationErlaubt(1989, 'Hafenviertel'), true);
});

test('Namen: echte namen.json ohne reservierte Nachnamen in der Ziehliste', () => {
  const namen = ladeNamen();
  assert.ok(namen.vornamen.length > 50);
  for (const n of namen.nachnamen) assert.equal(namen.istReservierterNachname(n), false, n);
  assert.ok(namen.reservierteNachnamen.includes('Falter'));
});

test('Namen: Finder-Regel und Adressen (reserviert nie, höchstens 3 je Adresse)', () => {
  const namen = ladeNamen();
  assert.equal(namen.finder('Okke', 'Habben'), 'O. Habben');
  assert.equal(namen.finderErlaubt('N. Fehrmann'), false);
  assert.equal(namen.finderErlaubt('A. Falterberg'), false);
  assert.equal(namen.finderErlaubt('O. Habben'), true);
  const adressen = namen.erzeugeAdressen(erzeugeZufall('test:adressen'));
  const zaehler = new Map();
  for (let i = 0; i < 400; i++) {
    const a = adressen.naechste('Hafenviertel');
    assert.match(a, /^\S.* ([1-9]|[1-3][0-9]|40)$/);
    assert.ok(!namen.reservierteAdressen.includes(a), a);
    zaehler.set(a, (zaehler.get(a) || 0) + 1);
  }
  for (const [a, n] of zaehler) assert.ok(n <= 3, a);
  assert.throws(() => adressen.naechste('Gibtsnicht'), /Stadtteil/);
});

// ---------------------------------------------------------------- sql_schreiben.js

test('formatiereWert: NULL, Ganzzahl, REAL stabil, Text mit Apostroph, BLOB', () => {
  assert.equal(formatiereWert(null), 'NULL');
  assert.equal(formatiereWert(3n), '3');
  assert.equal(formatiereWert(-12n), '-12');
  assert.equal(formatiereWert(14), '14.0');
  assert.equal(formatiereWert(8.5), '8.5');
  assert.equal(formatiereWert(312.5), '312.5');
  assert.equal(formatiereWert(0.1 + 0.2), '0.30000000000000004');
  assert.equal(formatiereWert(1e-7), '1e-7');
  assert.equal(formatiereWert("Kran'straße"), "'Kran''straße'");
  assert.equal(formatiereWert(''), "''");
  assert.equal(formatiereWert(Buffer.from([0, 255])), "X'00ff'");
});

function probeDb() {
  const db = new Database(':memory:');
  db.exec(`CREATE TABLE B (Gruppe TEXT PRIMARY KEY, Betrag REAL);
    CREATE TABLE A (Nr INTEGER PRIMARY KEY, Name TEXT, Wert REAL);
    CREATE TABLE Roh (Text TEXT, Zahl INTEGER);
    CREATE TABLE Paar (X INTEGER, Y INTEGER, PRIMARY KEY (Y, X));`);
  db.exec(`INSERT INTO A VALUES (3, 'drei', 1.5); INSERT INTO A VALUES (1, 'eins''s', NULL); INSERT INTO A VALUES (2, 'zwei', 14);
    INSERT INTO B VALUES ('Zeta', 1); INSERT INTO B VALUES ('Alpha', 2.25);
    INSERT INTO Roh VALUES ('z', 1); INSERT INTO Roh VALUES ('a', 2);
    INSERT INTO Paar VALUES (1, 2); INSERT INTO Paar VALUES (2, 1); INSERT INTO Paar VALUES (1, 1);`);
  return db;
}

test('schreibeBasis: Schema-Reihenfolge, nach PK sortiert, ohne PK in Einfügereihenfolge, byteidentisch', () => {
  const db = probeDb();
  const schema = '-- Probe-Schema\nCREATE TABLE …;\n';
  const text1 = schreibeBasis('probe', db, { schema });
  const text2 = schreibeBasis('probe', probeDb(), { schema });
  assert.equal(text1, text2);
  assert.ok(text1.includes(schema), 'Schema unverändert übernommen');
  const daten = text1.slice(text1.indexOf(DATEN_MARKE));
  const inserts = daten.split('\n').filter((z) => z.startsWith('INSERT'));
  assert.deepEqual(inserts, [
    "INSERT INTO B VALUES ('Alpha', 2.25);",
    "INSERT INTO B VALUES ('Zeta', 1.0);",
    "INSERT INTO A VALUES (1, 'eins''s', NULL);",
    "INSERT INTO A VALUES (2, 'zwei', 14.0);",
    "INSERT INTO A VALUES (3, 'drei', 1.5);",
    "INSERT INTO Roh VALUES ('z', 1);",
    "INSERT INTO Roh VALUES ('a', 2);",
    'INSERT INTO Paar VALUES (1, 1);',
    'INSERT INTO Paar VALUES (2, 1);',
    'INSERT INTO Paar VALUES (1, 2);'
  ]);
  assert.match(text1, /^-- Datenbank: probe$/m);
  assert.match(text1, /^-- Seed: datendetektei:probe:v1 \(FNV-1a 0x[0-9a-f]{8}\)$/m);
  assert.match(text1, /^-- Version: 1$/m);
  assert.deepEqual(pruefeBasisText(text1).ok, true);
  assert.equal(pruefeBasisText(text1.replace("'Zeta'", "'Zeto'")).ok, false);
  assert.ok(text1.endsWith('\n'));
});

// ---------------------------------------------------------------- db_bauen.js

test('extrahiereSqlBloecke: sql-Blöcke mit Fehlabfrage-Markierung', () => {
  const bloecke = bau.extrahiereSqlBloecke('x\n```sql\nSELECT 1\n```\n```json\n{}\n```\n```sql\n\n-- Fehlabfrage (P1): x\nSELECT\n```\n');
  assert.deepEqual(bloecke.map((b) => [b.sql.trim(), b.fehlabfrage]), [['SELECT 1', false], ['-- Fehlabfrage (P1): x\nSELECT', true]]);
  assert.equal(bloecke[0].zeile, 2);
});

test('Bau-Reihenfolge schema → uebernahme → pflicht → generator → abnahme', () => {
  const quellen = probeQuellen();
  const protokoll = [];
  const modul = {
    generiere(db, zufall, namen, kontext) {
      protokoll.push('generator');
      const quellenBisher = db.prepare('SELECT Quelle FROM Eintrag ORDER BY EintragNr').pluck().all();
      assert.deepEqual(quellenBisher, ['uebernahme', 'pflicht']);
      assert.equal(zufall.seed, fnv1a32('datendetektei:probe:v1'));
      assert.equal(typeof namen.erzeugePersonen, 'function');
      assert.equal(typeof kontext.datenbank, 'function');
      db.prepare("INSERT INTO Eintrag VALUES (2, 1, 'generator')").run();
    },
    abnahme(db) {
      protokoll.push('abnahme');
      const n = db.prepare("SELECT COUNT(*) FROM Eintrag WHERE Quelle = 'generator'").pluck().get();
      return [{ name: 'Generator-Zeile', ok: n === 1, ist: n, soll: 1 }];
    }
  };
  const { db, bericht } = bau.baueDb('probe', { quellen, modul });
  assert.deepEqual(bericht.schritte, ['schema', 'uebernahme', 'pflicht', 'generator', 'abnahme']);
  assert.deepEqual(protokoll, ['generator', 'abnahme']);
  assert.equal(bericht.status, 'fertig');
  assert.equal(bericht.ok, true);
  assert.equal(bericht.beispiele.length, 2);
  assert.equal(bericht.beispiele.filter((b) => b.ok).length, 1, 'Fehlabfrage darf scheitern');
  assert.equal(db.prepare('SELECT COUNT(*) FROM Eintrag').pluck().get(), 3);
});

test('Abbruch ohne Schreiben bei Verstoß gegen foreign_key_check', () => {
  const quellen = probeQuellen();
  const modul = {
    generiere(db) {
      db.pragma('foreign_keys = OFF');
      db.prepare("INSERT INTO Eintrag VALUES (7, 99, 'verwaist')").run();
    },
    abnahme: () => []
  };
  const { bericht } = bau.baueDb('probe', { quellen, modul });
  assert.equal(bericht.ok, false);
  assert.equal(bericht.status, 'fehlgeschlagen');
  assert.ok(bericht.meldungen.some((m) => /foreign_key_check/.test(m)), bericht.meldungen.join('; '));
  const aus = stilleAusgabe();
  const code = bau.lauf({ quellen, reihenfolge: ['probe'], module: { probe: modul }, log: aus.log });
  assert.equal(code, 1);
  assert.equal(fs.existsSync(path.join(quellen, 'probe', 'basis.sql')), false);
});

test('Abbruch bei fehlgeschlagener Abnahme-Prüfung oder fehlerhafter Beispielabfrage', () => {
  const quellen = probeQuellen();
  const falsch = { generiere() {}, abnahme: () => [{ name: 'immer falsch', ok: false, ist: 1, soll: 2 }] };
  assert.equal(bau.baueDb('probe', { quellen, modul: falsch }).bericht.status, 'fehlgeschlagen');
  const quellen2 = probeQuellen({ liesmich: '```sql\nSELECT Gibtsnicht FROM Ort\n```\n' });
  const { bericht } = bau.baueDb('probe', { quellen: quellen2, modul: { generiere() {}, abnahme: () => [] } });
  assert.equal(bericht.status, 'fehlgeschlagen');
  assert.ok(bericht.meldungen.some((m) => /Beispielabfrage/.test(m)));
});

test('Generator fehlt: Schema/Pflicht werden gebaut, aber kein basis.sql geschrieben', () => {
  const quellen = probeQuellen();
  const { bericht } = bau.baueDb('probe', { quellen, modul: null });
  assert.equal(bericht.status, 'generator-fehlt');
  assert.deepEqual(bericht.schritte, ['schema', 'uebernahme', 'pflicht']);
  const aus = stilleAusgabe();
  const code = bau.lauf({ quellen, reihenfolge: ['probe'], module: {}, log: aus.log });
  assert.equal(code, 0);
  assert.ok(aus.zeilen.some((z) => /probe.*Generator fehlt/.test(z)), aus.zeilen.join('\n'));
  assert.equal(fs.existsSync(path.join(quellen, 'probe', 'basis.sql')), false);
});

test('lauf schreibt basis.sql; --pruefen erkennt Gleichheit und Abweichung (Exit 1, Diff-Zusammenfassung)', () => {
  const quellen = probeQuellen();
  const modul = { generiere(db) { db.prepare("INSERT INTO Eintrag VALUES (2, 1, 'generator')").run(); }, abnahme: () => [] };
  const optionen = { quellen, reihenfolge: ['probe'], module: { probe: modul } };
  assert.equal(bau.lauf({ ...optionen, log: stilleAusgabe().log }), 0);
  const datei = path.join(quellen, 'probe', 'basis.sql');
  const text = fs.readFileSync(datei, 'utf8');
  assert.equal(bau.lauf({ ...optionen, pruefen: true, log: stilleAusgabe().log }), 0);
  fs.writeFileSync(datei, text.replace("'generator'", "'Generator'"));
  const aus = stilleAusgabe();
  assert.equal(bau.lauf({ ...optionen, pruefen: true, log: aus.log }), 1);
  const ausgabe = aus.zeilen.join('\n');
  assert.match(ausgabe, /probe/);
  assert.match(ausgabe, /Zeile \d+/);
  assert.match(ausgabe, /'Generator'/);
  fs.rmSync(datei);
  assert.equal(bau.lauf({ ...optionen, pruefen: true, log: stilleAusgabe().log }), 1);
});

test('Bau-Reihenfolge der sieben DBs und Kontext auf schon gebaute DBs', () => {
  assert.deepEqual(bau.REIHENFOLGE, ['fundbuero', 'stadtrad', 'stadtfest', 'tus', 'detektei', 'datenspuren', 'eisdiele']);
  const quellen = probeQuellen();
  fs.cpSync(path.join(quellen, 'probe'), path.join(quellen, 'zweite'), { recursive: true });
  let gesehen = null;
  const module = {
    probe: { generiere() {}, abnahme: () => [] },
    zweite: {
      generiere(db, zufall, namen, kontext) {
        gesehen = kontext.datenbank('probe').prepare('SELECT COUNT(*) FROM Eintrag').pluck().get();
        assert.throws(() => kontext.datenbank('dritte'), /noch nicht gebaut/);
      },
      abnahme: () => []
    }
  };
  const ergebnisse = bau.baueAlle({ quellen, reihenfolge: ['probe', 'zweite'], module });
  assert.deepEqual(ergebnisse.map((e) => e.bericht.status), ['fertig', 'fertig']);
  assert.equal(gesehen, 2);
});

// ---------------------------------------------------------------- TuS und Eisdiele

for (const name of ['tus', 'eisdiele']) {
  test(`${name}: Bau ohne Generator, alle Abnahme-Prüfungen und Beispielabfragen grün`, () => {
    const { db, bericht } = bau.baueDb(name);
    assert.equal(bericht.status, 'fertig', bericht.meldungen.join('; '));
    assert.deepEqual(bericht.schritte, ['schema', 'pflicht', 'kuratiert', 'abnahme']);
    assert.ok(bericht.abnahme.length >= 6);
    for (const p of bericht.abnahme) assert.ok(p.ok, `${p.name}: ist ${JSON.stringify(p.ist)}, soll ${JSON.stringify(p.soll)}`);
    const liesmich = fs.readFileSync(path.join(SEED, name, 'LIESMICH.md'), 'utf8');
    const anzahl = bau.extrahiereSqlBloecke(liesmich).filter((b) => !b.fehlabfrage).length;
    assert.equal(bericht.beispiele.filter((b) => !b.fehlabfrage && b.ok).length, anzahl);
    assert.ok(anzahl >= 6);
    db.close();
  });

  test(`${name}: eingechecktes basis.sql ist byteidentisch reproduzierbar und Prüfsumme stimmt`, () => {
    const { db } = bau.baueDb(name);
    const neu = bau.basisText(name, db);
    const eingecheckt = fs.readFileSync(path.join(SEED, name, 'basis.sql'), 'utf8');
    assert.equal(neu, eingecheckt);
    assert.equal(pruefeBasisText(eingecheckt).ok, true);
    assert.ok(eingecheckt.includes(fs.readFileSync(path.join(SEED, name, 'schema.sql'), 'utf8').trimEnd()));
  });

  test(`${name}: Rundlauf – basis.sql in leerer DB ergibt dieselben Daten`, () => {
    const { db } = bau.baueDb(name);
    const text = fs.readFileSync(path.join(SEED, name, 'basis.sql'), 'utf8');
    const neu = new Database(':memory:');
    neu.exec(text);
    assert.deepEqual(neu.pragma('foreign_key_check'), []);
    const tabellen = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY rowid").pluck().all();
    assert.deepEqual(neu.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY rowid").pluck().all(), tabellen);
    for (const t of tabellen) {
      // mit PK: nach PK; ohne PK (Rohliste): Reihenfolge des Exports (rowid) muss erhalten bleiben
      const pk = primaerschluessel(db, t);
      const ordnung = pk.length ? pk.map((s) => `"${s}"`).join(', ') : 'rowid';
      const lies = (d) => d.prepare(`SELECT * FROM "${t}" ORDER BY ${ordnung}`).safeIntegers(true).raw().all();
      const typen = (d) => d.prepare(`SELECT * FROM "${t}"`).columns().map((c) => c.type);
      assert.deepEqual(lies(neu), lies(db), t);
      assert.deepEqual(typen(neu), typen(db), t);
    }
    // safeIntegers: INTEGER kommt als BigInt, REAL als number → Speicherklassen sind mitverglichen
    assert.equal(bau.basisText(name, neu), text);
  });
}

test('tus: Abnahme erkennt Manipulationen', () => {
  const tus = require('../scripts/db/tus');
  const { db } = bau.baueDb('tus');
  db.prepare("UPDATE MitgliederlisteRoh SET Monatsbeitrag = 14.00 WHERE Mitglied = 'Nils Detmers'").run();
  db.prepare("INSERT INTO Mitglied VALUES (99, 'Tamara', 'Leversen', 1988, 'Erwachsene', '2026-01-01')").run();
  const fehl = tus.abnahme(db).filter((p) => !p.ok).map((p) => p.name);
  assert.ok(fehl.length >= 3, fehl.join('; '));
});

test('eisdiele: Abnahme erkennt Gleichstand und verkaufte Pistazie', () => {
  const eisdiele = require('../scripts/db/eisdiele');
  const { db } = bau.baueDb('eisdiele');
  db.prepare("INSERT INTO Verkauf VALUES (58, 9, '2026-07-12', 1)").run();
  db.prepare("INSERT INTO Verkauf VALUES (59, 1, '2026-07-12', 1)").run();
  db.prepare("INSERT INTO Verkauf VALUES (60, 1, '2026-07-12', 1)").run();
  const fehl = eisdiele.abnahme(db).filter((p) => !p.ok).map((p) => p.name);
  assert.ok(fehl.some((n) => /Stracciatella/.test(n)), fehl.join('; '));
  assert.ok(fehl.some((n) => /Pistazie/.test(n)), fehl.join('; '));
  assert.ok(fehl.some((n) => /Zeilen Verkauf/.test(n)), fehl.join('; '));
});

test('lauf --pruefen über alle DBs: TuS/Eisdiele identisch, übrige melden „Generator fehlt“', () => {
  const aus = stilleAusgabe();
  const code = bau.lauf({ pruefen: true, log: aus.log });
  const text = aus.zeilen.join('\n');
  assert.equal(code, 0, text);
  assert.match(text, /tus: .*identisch/);
  assert.match(text, /eisdiele: .*identisch/);
  for (const n of ['fundbuero', 'stadtrad', 'stadtfest', 'detektei', 'datenspuren']) {
    assert.match(text, new RegExp(`${n}: Generator fehlt`));
  }
});

test('npm-Scripts db und db:pruefen', () => {
  const pkg = require('../package.json');
  assert.equal(pkg.scripts.db, 'node scripts/db_bauen.js');
  assert.equal(pkg.scripts['db:pruefen'], 'node scripts/db_bauen.js --pruefen');
});
