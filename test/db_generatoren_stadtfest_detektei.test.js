'use strict';
// Tests der Generatoren Stadtfest und Detektei (Plan Phase 2, Task 3; seed/datenbanken/{stadtfest,detektei}/LIESMICH.md).
// Jede Zeile der Tabelle „Abnahme-Prüfungen“ ist hier ein eigener Test mit eigener Abfrage; dazu die erwarteten
// Ergebnisse der Beispielabfragen, die Generator-Vorgaben aus „Datenumfang und Verteilung“, unveränderte
// Pflicht-Datensätze und byteidentisches basis.sql.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

const bau = require('../scripts/db_bauen');
const { pruefeBasisText, primaerschluessel } = require('../scripts/db/sql_schreiben');

const SEED = path.join(__dirname, '..', 'seed', 'datenbanken');

/** Einmal bauen je DB (der Bau ist deterministisch). */
const gebaut = {};
function db(name) {
  if (!gebaut[name]) {
    const { db: d, bericht } = bau.baueDb(name);
    gebaut[name] = { db: d, bericht };
  }
  return gebaut[name].db;
}
function bericht(name) {
  db(name);
  return gebaut[name].bericht;
}
const wert = (name, sql) => db(name).prepare(sql).pluck().get();
const spalte = (name, sql) => db(name).prepare(sql).pluck().all();
const zeilen = (name, sql) => db(name).prepare(sql).raw().all();

/** DB nur aus schema.sql + pflicht.sql (ohne Generator). */
function nurPflicht(name) {
  const d = new Database(':memory:');
  d.exec(fs.readFileSync(path.join(SEED, name, 'schema.sql'), 'utf8'));
  d.exec(fs.readFileSync(path.join(SEED, name, 'pflicht.sql'), 'utf8'));
  return d;
}

/** Beispielabfrage Nr. `nr` (Überschrift „**<nr>. …“) aus der LIESMICH. */
function beispiel(name, nr) {
  const text = fs.readFileSync(path.join(SEED, name, 'LIESMICH.md'), 'utf8');
  const start = text.indexOf(`**${nr}. `);
  assert.ok(start >= 0, `Beispiel ${nr} fehlt in ${name}/LIESMICH.md`);
  const block = /```sql\n([\s\S]*?)\n```/.exec(text.slice(start));
  return block[1];
}

// ======================================================================================== gemeinsam

for (const name of ['stadtfest', 'detektei']) {
  test(`${name}: Bau mit Generator fertig, alle Abnahme-Prüfungen und Beispielabfragen grün`, () => {
    const b = bericht(name);
    assert.equal(b.status, 'fertig', b.meldungen.join('; '));
    assert.deepEqual(b.schritte, ['schema', 'pflicht', 'generator', 'abnahme']);
    for (const p of b.abnahme) assert.ok(p.ok, `${p.name}: ist ${JSON.stringify(p.ist)}, soll ${JSON.stringify(p.soll)}`);
    const liesmich = fs.readFileSync(path.join(SEED, name, 'LIESMICH.md'), 'utf8');
    const anzahl = bau.extrahiereSqlBloecke(liesmich).filter((x) => !x.fehlabfrage).length;
    assert.equal(b.beispiele.filter((x) => !x.fehlabfrage && x.ok).length, anzahl);
  });

  test(`${name}: Pflicht-Datensätze unverändert in der Haupt-DB`, () => {
    const p = nurPflicht(name);
    const tabellen = p.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY rowid").pluck().all();
    for (const t of tabellen) {
      const pk = primaerschluessel(p, t);
      const pflichtZeilen = p.prepare(`SELECT * FROM "${t}"`).all();
      for (const z of pflichtZeilen) {
        const bedingung = pk.map((s) => `"${s}" = ?`).join(' AND ');
        const ist = db(name).prepare(`SELECT * FROM "${t}" WHERE ${bedingung}`).get(...pk.map((s) => z[s]));
        assert.deepEqual(ist, z, `${t} ${JSON.stringify(z)}`);
      }
    }
    p.close();
  });

  test(`${name}: deterministisch – zweiter Bau byteidentisch, eingechecktes basis.sql passt`, () => {
    const { db: zweiter, bericht: b2 } = bau.baueDb(name);
    assert.equal(b2.status, 'fertig', b2.meldungen.join('; '));
    const text = bau.basisText(name, db(name));
    assert.equal(bau.basisText(name, zweiter), text);
    const datei = path.join(SEED, name, 'basis.sql');
    assert.ok(fs.existsSync(datei), 'basis.sql fehlt');
    const eingecheckt = fs.readFileSync(datei, 'utf8');
    assert.equal(eingecheckt, text);
    assert.equal(pruefeBasisText(eingecheckt).ok, true);
    zweiter.close();
  });

  test(`${name}: Rundlauf – basis.sql in leerer DB ergibt dieselben Daten, FK-Prüfung leer`, () => {
    const neu = new Database(':memory:');
    neu.exec(fs.readFileSync(path.join(SEED, name, 'basis.sql'), 'utf8'));
    assert.deepEqual(neu.pragma('foreign_key_check'), []);
    assert.equal(bau.basisText(name, neu), bau.basisText(name, db(name)));
    neu.close();
  });

  test(`${name}: Abnahme meldet Manipulation (Prüfungen sind scharf)`, () => {
    const modul = require(`../scripts/db/${name}`);
    const { db: d } = bau.baueDb(name);
    if (name === 'stadtfest') {
      d.prepare('UPDATE Position SET Menge = 1 WHERE BonNr = 486').run();
      d.prepare("UPDATE Bon SET Zeitpunkt = '2026-08-28 17:00' WHERE BonNr = 1").run();
    } else {
      d.prepare("INSERT INTO verdaechtig VALUES (1, 1, 'gering')").run();
      d.prepare('UPDATE Ermittler SET MentorNr = 5 WHERE ErmittlerNr = 1').run();
    }
    const fehl = modul.abnahme(d).filter((p) => !p.ok).map((p) => p.name);
    assert.ok(fehl.length >= 2, fehl.join('; '));
    d.close();
  });
}

// ======================================================================================== Stadtfest

const SF = 'stadtfest';

test('Stadtfest Abnahme: Zeilen gesamt 1 400–1 650; Helfer 60; Stand 8; Produkt 26', () => {
  const tabellen = ['Stand', 'Helfer', 'Schicht', 'Produkt', 'Bon', 'Position'];
  const gesamt = tabellen.reduce((s, t) => s + wert(SF, `SELECT COUNT(*) FROM ${t}`), 0);
  assert.ok(gesamt >= 1400 && gesamt <= 1650, `gesamt ${gesamt}`);
  assert.equal(wert(SF, 'SELECT COUNT(*) FROM Helfer'), 60);
  assert.equal(wert(SF, 'SELECT MIN(HelferNr) FROM Helfer'), 1);
  assert.equal(wert(SF, 'SELECT MAX(HelferNr) FROM Helfer'), 60);
  assert.equal(wert(SF, 'SELECT COUNT(*) FROM Stand'), 8);
  assert.equal(wert(SF, 'SELECT COUNT(*) FROM Produkt'), 26);
});

test('Stadtfest Abnahme: Beispiel 5 (Fehlbetrag) = 312.5', () => {
  assert.equal(Math.round(wert(SF, beispiel(SF, 5)) * 100) / 100, 312.5);
});

test('Stadtfest Abnahme: Beispiel 3 = genau HelferNr 23 mit 110', () => {
  assert.deepEqual(zeilen(SF, beispiel(SF, 3)), [[23, 'Nora', 'Falter', 110]]);
});

test('Stadtfest Abnahme: verdächtige Stunde 52 Bons, nur Helferin 23, nur bar', () => {
  assert.deepEqual(zeilen(SF, `SELECT COUNT(*), MIN(HelferNr), MAX(HelferNr), MIN(Zahlart), MAX(Zahlart) FROM Bon
    WHERE StandNr = 4 AND Zeitpunkt >= '2026-08-29 22:00' AND Zeitpunkt < '2026-08-29 23:00'`), [[52, 23, 23, 'bar', 'bar']]);
});

test('Stadtfest Abnahme: Kaffeemobil hat Bons vor 22 Uhr und nach 23 Uhr am Samstag (je ≥ 8)', () => {
  assert.ok(wert(SF, "SELECT COUNT(*) FROM Bon WHERE StandNr = 4 AND Zeitpunkt LIKE '2026-08-29%' AND Zeitpunkt < '2026-08-29 22:00'") >= 8);
  assert.ok(wert(SF, "SELECT COUNT(*) FROM Bon WHERE StandNr = 4 AND Zeitpunkt >= '2026-08-29 23:00' AND Zeitpunkt < '2026-08-30 00:00'") >= 8);
});

test('Stadtfest Abnahme: Kinderpunsch nie verkauft, Info-Zelt ohne Bon', () => {
  assert.equal(wert(SF, 'SELECT COUNT(*) FROM Position WHERE ProduktNr = 26'), 0);
  assert.equal(wert(SF, 'SELECT COUNT(*) FROM Bon WHERE StandNr = 8'), 0);
});

test('Stadtfest Abnahme: Positionen mit Menge 0 außerhalb Helfer 23 ≤ 2 je Helfer, insgesamt ≤ 6', () => {
  const je = zeilen(SF, `SELECT Bon.HelferNr, COUNT(*) FROM Bon, Position
    WHERE Bon.BonNr = Position.BonNr AND Position.Menge = 0 AND Bon.HelferNr != 23 GROUP BY Bon.HelferNr`);
  for (const [, n] of je) assert.ok(n <= 2);
  const summe = je.reduce((s, [, n]) => s + n, 0);
  assert.ok(summe <= 6, `insgesamt ${summe}`);
});

test('Stadtfest Abnahme: keine Bons auf voller Stunde', () => {
  assert.equal(wert(SF, "SELECT COUNT(*) FROM Bon WHERE Zeitpunkt LIKE '%:00'"), 0);
});

test('Stadtfest Abnahme: genau ein gleichnamiges Helferpaar', () => {
  const paare = zeilen(SF, 'SELECT Vorname, Nachname, COUNT(*) FROM Helfer GROUP BY Vorname, Nachname HAVING COUNT(*) > 1');
  assert.equal(paare.length, 1);
  assert.equal(paare[0][2], 2);
});

test('Stadtfest Abnahme: Jahrgang 1988 nur Helferin 23', () => {
  assert.equal(wert(SF, 'SELECT COUNT(*) FROM Helfer WHERE Jahrgang = 1988'), 1);
  assert.deepEqual(spalte(SF, 'SELECT HelferNr FROM Helfer WHERE Jahrgang = 1988'), [23]);
});

test('Stadtfest Abnahme: Beispiel 1 hat 7 Zeilen mit paarweise verschiedenen Umsätzen', () => {
  const z = zeilen(SF, beispiel(SF, 1));
  assert.equal(z.length, 7);
  const umsaetze = z.map((r) => Math.round(r[2] * 100));
  assert.equal(new Set(umsaetze).size, 7);
  assert.ok(!z.some((r) => r[0] === 8), 'Info-Zelt darf nicht erscheinen');
});

test('Stadtfest Abnahme: jeder Bon liegt in einer Kassenschicht seines Kassierers am selben Stand', () => {
  assert.equal(wert(SF, `SELECT COUNT(*) FROM Bon WHERE NOT EXISTS (
    SELECT 1 FROM Schicht WHERE Schicht.HelferNr = Bon.HelferNr AND Schicht.StandNr = Bon.StandNr
      AND Bon.Zeitpunkt >= Schicht.Beginn AND Bon.Zeitpunkt < Schicht.Ende)`), 0);
});

test('Stadtfest Beispiele: 2a = 52, 2b = 125 Positionen / 20 Artikel, 4 = bar 52 (21 Uhr 7/5, 23 Uhr 6/4)', () => {
  assert.deepEqual(zeilen(SF, beispiel(SF, '2a')), [[52]]);
  assert.deepEqual(zeilen(SF, beispiel(SF, '2b')), [[125, 20]]);
  const b4 = beispiel(SF, 4);
  assert.deepEqual(zeilen(SF, `${b4} ORDER BY Zahlart`), [['bar', 52]]);
  assert.deepEqual(zeilen(SF, `${b4.replace('22:%', '21:%')} ORDER BY Zahlart`), [['Karte', 5], ['bar', 7]]);
  assert.deepEqual(zeilen(SF, `${b4.replace('22:%', '23:%')} ORDER BY Zahlart`), [['Karte', 4], ['bar', 6]]);
});

test('Stadtfest Beispiele: 6 endet mit Selin Aksoy 21–22, Nora Falter 22–23, Selin Aksoy 23–24', () => {
  const z = zeilen(SF, beispiel(SF, 6)).filter((r) => r[3] >= '2026-08-29 21:00');
  assert.deepEqual(z, [
    ['Selin', 'Aksoy', null, '2026-08-29 21:00', '2026-08-29 22:00'],
    ['Nora', 'Falter', 'TuS Weserstedt', '2026-08-29 22:00', '2026-08-29 23:00'],
    ['Selin', 'Aksoy', null, '2026-08-29 23:00', '2026-08-30 00:00']
  ]);
});

test('Stadtfest Beispiele: 7 liefert 3 Zeilen; Top 3 paarweise verschieden und verschieden vom vierten', () => {
  assert.equal(zeilen(SF, beispiel(SF, 7)).length, 3);
  const alle = spalte(SF, 'SELECT SUM(Menge) AS s FROM Position GROUP BY ProduktNr ORDER BY s DESC');
  assert.equal(new Set(alle.slice(0, 4)).size, 4);
});

test('Stadtfest Vorgaben: Helfer (Jahrgang, Vereine, NULL ≈ 20 %, Paar, 2 ohne Schicht, 23 nur Pflicht-Schicht)', () => {
  assert.equal(wert(SF, 'SELECT COUNT(*) FROM Helfer WHERE Jahrgang < 1950 OR Jahrgang > 2008'), 0);
  const vereine = spalte(SF, 'SELECT DISTINCT Verein FROM Helfer WHERE Verein IS NOT NULL ORDER BY Verein');
  assert.deepEqual(vereine, ['Freiwillige Feuerwehr Weserstedt', 'Förderverein Schulzentrum', 'Shantychor Weserstedt', 'TuS Weserstedt']);
  const ohne = wert(SF, 'SELECT COUNT(*) FROM Helfer WHERE Verein IS NULL');
  assert.ok(ohne >= 8 && ohne <= 16, `Verein NULL: ${ohne}`);
  const paar = zeilen(SF, `SELECT h1.HelferNr, h2.HelferNr, h1.Jahrgang, h2.Jahrgang FROM Helfer h1, Helfer h2
    WHERE h1.Vorname = h2.Vorname AND h1.Nachname = h2.Nachname AND h1.HelferNr < h2.HelferNr`);
  assert.equal(paar.length, 1);
  assert.notEqual(paar[0][2], paar[0][3]);
  for (const nr of paar[0].slice(0, 2)) {
    assert.ok(wert(SF, `SELECT COUNT(*) FROM Bon WHERE HelferNr = ${nr}`) > 0, `Paar ${nr} ohne Kassenschicht`);
  }
  assert.equal(wert(SF, 'SELECT COUNT(*) FROM Helfer WHERE HelferNr NOT IN (SELECT HelferNr FROM Schicht)'), 2);
  assert.deepEqual(zeilen(SF, 'SELECT StandNr, Beginn, Ende FROM Schicht WHERE HelferNr = 23'),
    [[4, '2026-08-29 22:00', '2026-08-29 23:00']]);
  const reserviert = require('../seed/datenbanken/namen.json').reservierteNachnamen;
  const generiert = spalte(SF, 'SELECT Nachname FROM Helfer WHERE HelferNr NOT IN (7, 23)');
  for (const n of generiert) assert.ok(!reserviert.includes(n), n);
});

test('Stadtfest Vorgaben: Kassenschichten (Kaffeemobil stündlich, übrige 2-h-Blöcke) und Info-Zelt', () => {
  // je Kassenschicht kassiert genau eine Person: jede Stunde der Öffnungszeit an den Verkaufsständen hat Bons genau
  // eines Kassierers
  const doppelt = wert(SF, `SELECT COUNT(*) FROM (SELECT StandNr, substr(Zeitpunkt, 1, 13) AS Stunde
    FROM Bon GROUP BY StandNr, Stunde HAVING COUNT(DISTINCT HelferNr) > 1)`);
  assert.equal(doppelt, 0);
  for (const stand of [1, 2, 3, 4, 5, 6, 7]) {
    const stunden = wert(SF, `SELECT COUNT(DISTINCT substr(Zeitpunkt, 1, 13)) FROM Bon WHERE StandNr = ${stand}`);
    assert.equal(stunden, 18, `Stand ${stand}: Stunden mit Bons`);
  }
  assert.ok(wert(SF, 'SELECT COUNT(*) FROM Schicht WHERE StandNr = 8') >= 4);
  assert.ok(wert(SF, "SELECT COUNT(*) FROM Bon WHERE Zeitpunkt < '2026-08-28 16:00' OR Zeitpunkt >= '2026-08-30 00:00' OR (Zeitpunkt >= '2026-08-29 00:00' AND Zeitpunkt < '2026-08-29 14:00')") === 0);
  const anzahl = wert(SF, 'SELECT COUNT(*) FROM Schicht');
  assert.ok(anzahl >= 95 && anzahl <= 140, `Schicht ${anzahl}`);
  // Kaffeemobil Sa 21:00–23:59 nur Pflicht-Bons
  assert.equal(wert(SF, "SELECT COUNT(*) FROM Bon WHERE StandNr = 4 AND Zeitpunkt >= '2026-08-29 21:00' AND Zeitpunkt < '2026-08-30 00:00'"), 74);
});

test('Stadtfest Vorgaben: Bons je Stunde, Positionen 1–3 aus dem eigenen Stand, Mengen', () => {
  const jeStunde = zeilen(SF, `SELECT StandNr, substr(Zeitpunkt, 1, 13) AS Stunde, COUNT(*) FROM Bon
    WHERE NOT (StandNr = 4 AND Zeitpunkt >= '2026-08-29 21:00' AND Zeitpunkt < '2026-08-30 00:00')
    GROUP BY StandNr, Stunde`);
  for (const [stand, stunde, n] of jeStunde) {
    const h = Number(stunde.slice(11, 13));
    const samstag = stunde.startsWith('2026-08-29');
    const [min, max] = stand === 4 ? (samstag && h >= 18 ? [8, 12] : [4, 8]) : stand === 5 ? [4, 8] : stand === 1 ? [3, 7] : [1, 4];
    assert.ok(n >= min && n <= max, `Stand ${stand} ${stunde}: ${n}`);
  }
  assert.equal(wert(SF, `SELECT COUNT(*) FROM Position, Bon, Produkt WHERE Position.BonNr = Bon.BonNr
    AND Position.ProduktNr = Produkt.ProduktNr AND Produkt.StandNr != Bon.StandNr`), 0);
  assert.equal(wert(SF, 'SELECT COUNT(*) FROM Bon WHERE BonNr NOT IN (SELECT BonNr FROM Position)'), 0);
  // Pflicht-Bons in Noras Stunde dürfen mehr Positionen haben (110 Positionen der Menge 0 auf 52 Bons)
  assert.equal(wert(SF, 'SELECT MAX(n) FROM (SELECT COUNT(*) AS n FROM Position WHERE BonNr NOT BETWEEN 439 AND 512 GROUP BY BonNr)'), 3);
  assert.equal(wert(SF, 'SELECT COUNT(*) FROM Position WHERE Menge > 3 AND ProduktNr != 24'), 0);
  assert.equal(wert(SF, 'SELECT COUNT(*) FROM Position WHERE Menge > 10'), 0);
  // Menge 0 außerhalb der Pflicht: höchstens eine je Stand und Tag, nie am Kaffeemobil
  assert.equal(wert(SF, `SELECT COUNT(*) FROM Position, Bon WHERE Position.BonNr = Bon.BonNr AND Position.Menge = 0
    AND Bon.StandNr = 4 AND Bon.HelferNr != 23`), 0);
  assert.equal(wert(SF, `SELECT COUNT(*) FROM (SELECT Bon.StandNr, substr(Bon.Zeitpunkt, 1, 10) AS Tag FROM Position, Bon
    WHERE Position.BonNr = Bon.BonNr AND Position.Menge = 0 AND Bon.HelferNr != 23
    GROUP BY Bon.StandNr, Tag HAVING COUNT(*) > 1)`), 0);
  const bons = wert(SF, 'SELECT COUNT(*) FROM Bon');
  const positionen = wert(SF, 'SELECT COUNT(*) FROM Position');
  assert.ok(bons >= 470 && bons <= 600, `Bon ${bons}`);
  assert.ok(positionen >= 760 && positionen <= 940, `Position ${positionen}`);
});

test('Stadtfest Vorgaben: Kartenanteil je Stand plausibel (Kaffeemobil ≈ 45 %, Bierwagen ≈ 35 %, sonst ≈ 40 %)', () => {
  const anteile = zeilen(SF, `SELECT StandNr, AVG(Zahlart = 'Karte') FROM Bon
    WHERE NOT (StandNr = 4 AND Zeitpunkt >= '2026-08-29 21:00' AND Zeitpunkt < '2026-08-30 00:00') GROUP BY StandNr`);
  for (const [stand, a] of anteile) assert.ok(a > 0.2 && a < 0.65, `Stand ${stand}: ${a}`);
});

// ======================================================================================== Detektei

const DT = 'detektei';

test('Detektei Abnahme: Zeilen (Ermittler 12, Fall 12, Person 60, Ort 15; kennt 70–90, verdaechtig 25–35, Aussage 50–70, Beweisstueck 20–30)', () => {
  assert.equal(wert(DT, 'SELECT COUNT(*) FROM Ermittler'), 12);
  assert.equal(wert(DT, 'SELECT COUNT(*) FROM Fall'), 12);
  assert.equal(wert(DT, 'SELECT COUNT(*) FROM Person'), 60);
  assert.equal(wert(DT, 'SELECT MAX(PersonNr) FROM Person'), 60);
  assert.equal(wert(DT, 'SELECT COUNT(*) FROM Ort'), 15);
  const bereiche = { kennt: [70, 90], verdaechtig: [25, 35], Aussage: [50, 70], Beweisstueck: [20, 30] };
  for (const [t, [min, max]] of Object.entries(bereiche)) {
    const n = wert(DT, `SELECT COUNT(*) FROM ${t}`);
    assert.ok(n >= min && n <= max, `${t}: ${n}`);
  }
});

test('Detektei Abnahme: Beispiel 2 = genau Person 13', () => {
  assert.deepEqual(zeilen(DT, beispiel(DT, 2)), [[13, 'Nora', 'Falter']]);
});

test('Detektei Abnahme: Beispiel 5 = genau 13 (4) und 42 (2)', () => {
  assert.deepEqual(zeilen(DT, beispiel(DT, 5)), [[13, 'Nora', 'Falter', 4], [42, 'Lasse', 'Engelken', 2]]);
});

test('Detektei Abnahme: keine Falkenrath, kein Vorname Merle', () => {
  assert.equal(wert(DT, "SELECT COUNT(*) FROM Person WHERE Nachname = 'Falkenrath' OR Vorname = 'Merle'"), 0);
});

test('Detektei Abnahme: Jahrgang 1988 + Hafenviertel genau Person 13', () => {
  assert.deepEqual(spalte(DT, "SELECT PersonNr FROM Person WHERE Jahrgang = 1988 AND Stadtteil = 'Hafenviertel'"), [13]);
});

test('Detektei Abnahme: 8 Verdachtseinträge in den Fällen 1–4', () => {
  assert.equal(wert(DT, 'SELECT COUNT(*) FROM verdaechtig WHERE FallNr IN (1, 2, 3, 4)'), 8);
});

test('Detektei Abnahme: 2 Ermittler ohne Mentor', () => {
  assert.equal(wert(DT, 'SELECT COUNT(*) FROM Ermittler WHERE MentorNr IS NULL'), 2);
});

test('Detektei Abnahme: genau 3 Bekanntschaften mit Seit = 2020', () => {
  assert.equal(wert(DT, 'SELECT COUNT(*) FROM kennt WHERE Seit = 2020'), 3);
});

test('Detektei Abnahme: keine Self-Join-Kreise (niemand ist indirekt sein eigener Mentor)', () => {
  const mentor = new Map(zeilen(DT, 'SELECT ErmittlerNr, MentorNr FROM Ermittler'));
  for (const start of mentor.keys()) {
    const gesehen = new Set([start]);
    let m = mentor.get(start);
    while (m !== null) {
      assert.ok(!gesehen.has(m), `Kreis bei ${start}`);
      gesehen.add(m);
      m = mentor.get(m);
    }
  }
});

test('Detektei Beispiele: 1 (10 Zeilen), 3 (5 Bekannte seit 2026), 4/6/7 auf den Pflicht-Daten, 8', () => {
  const b1 = zeilen(DT, beispiel(DT, 1));
  assert.equal(b1.length, 10);
  assert.ok(!b1.some((r) => r[0] === 'Edda Lorenz' || r[0] === 'Ulf Witte'));
  assert.deepEqual(zeilen(DT, beispiel(DT, 3)).map((r) => [r[1], r[3]]),
    [['Aksoy', 2026], ['Bargmann', 2026], ['Hollwedel', 2026], ['Lüttjohann', 2026], ['Ohlendiek', 2026]]);
  const p = nurPflicht(DT);
  assert.equal(p.prepare(beispiel(DT, 4)).all().length, 9);
  assert.equal(p.prepare(beispiel(DT, 6)).all().length, 9);
  assert.deepEqual(p.prepare(beispiel(DT, 7)).raw().all().map((r) => [r[1], r[2]]),
    [['Maren Kolthoff', 2], ['Edda Lorenz', 1], ['Helge Saathoff', 1]]);
  p.close();
  // In der Haupt-DB bleiben die Pflicht-Ergebnisse erhalten (Zeilen zu Pflicht-Personen bzw. zu den Fällen 1–4)
  assert.equal(wert(DT, `SELECT COUNT(*) FROM kennt WHERE Seit >= 2020
    AND PersonNr IN (5, 8, 13, 17, 21, 22, 27, 30, 34, 41, 42, 43)`), 9);
  assert.equal(wert(DT, 'SELECT COUNT(*) FROM Aussage WHERE FallNr IN (1, 2, 3, 4)'), 9);
  assert.deepEqual(zeilen(DT, beispiel(DT, 8)).sort(), [['Altstadt', 1], ['Hafenviertel', 1], ['Mühlenfeld', 1], ['Weserufer', 1]]);
});

test('Detektei Vorgaben: Fälle 5–12 (Titel, Datum aufsteigend, Status, Leitung)', () => {
  const faelle = zeilen(DT, 'SELECT FallNr, Titel, Eroeffnet, Status, LeiterNr FROM Fall WHERE FallNr >= 5 ORDER BY FallNr');
  assert.deepEqual(faelle.map((f) => f[1]).sort(), ['Der doppelte Bauantrag', 'Der stille Teilhaber', 'Die Wasseruhr der Mühle',
    'Die verschwundene Gästeliste', 'Die vertauschten Koffer', 'Ein Konto zu viel', 'Falsche Rechnungen im Hafenamt',
    'Das Rätsel im Stadtarchiv'].sort());
  for (let i = 0; i < faelle.length; i++) {
    assert.ok(faelle[i][2] >= '2025-11-01' && faelle[i][2] <= '2026-08-31', faelle[i][2]);
    if (i > 0) assert.ok(faelle[i][2] > faelle[i - 1][2], 'Eroeffnet aufsteigend');
  }
  assert.equal(faelle.filter((f) => f[3] === 'abgeschlossen').length, 6);
  assert.equal(faelle.filter((f) => f[3] === 'ruht').length, 2);
  assert.equal(wert(DT, `SELECT COUNT(*) FROM Fall, Ermittler WHERE Fall.LeiterNr = Ermittler.ErmittlerNr
    AND Ermittler.Dienstgrad NOT IN ('Leitung', 'Senior', 'Junior')`), 0);
  assert.equal(wert(DT, 'SELECT COUNT(*) FROM Fall WHERE LeiterNr IN (2, 9, 10, 11)'), 0);
});

test('Detektei Vorgaben: Personen (Namen, NULL ≈ 5 %, keine Gleichnamigen, keine reservierten Nachnamen)', () => {
  assert.equal(wert(DT, 'SELECT COUNT(*) FROM (SELECT 1 FROM Person GROUP BY Vorname, Nachname HAVING COUNT(*) > 1)'), 0);
  const ohneJahrgang = wert(DT, 'SELECT COUNT(*) FROM Person WHERE Jahrgang IS NULL');
  const ohneStadtteil = wert(DT, 'SELECT COUNT(*) FROM Person WHERE Stadtteil IS NULL');
  assert.ok(ohneJahrgang >= 1 && ohneJahrgang <= 5, `Jahrgang NULL ${ohneJahrgang}`);
  assert.ok(ohneStadtteil >= 1 && ohneStadtteil <= 5, `Stadtteil NULL ${ohneStadtteil}`);
  assert.equal(wert(DT, 'SELECT COUNT(*) FROM Person WHERE Jahrgang < 1940 OR Jahrgang > 2008'), 0);
  const pflicht = [5, 8, 13, 17, 21, 22, 27, 30, 34, 41, 42, 43];
  const reserviert = require('../seed/datenbanken/namen.json').reservierteNachnamen;
  const generiert = spalte(DT, `SELECT Nachname FROM Person WHERE PersonNr NOT IN (${pflicht.join(', ')})`);
  assert.equal(generiert.length, 48);
  for (const n of generiert) assert.ok(!reserviert.includes(n), n);
});

test('Detektei Vorgaben: kennt (0–3 je Person, nie sich selbst, Nora-Netz nur Pflicht, niemand sonst an allen Tatorten)', () => {
  const pflicht = [5, 8, 13, 17, 21, 22, 27, 30, 34, 41, 42, 43];
  assert.equal(wert(DT, `SELECT COUNT(*) FROM kennt WHERE PersonNr IN (${pflicht.join(', ')})`), 16);
  assert.equal(wert(DT, 'SELECT COUNT(*) FROM kennt WHERE BekannterNr = 13'), 2);
  assert.ok(wert(DT, 'SELECT MAX(n) FROM (SELECT COUNT(*) AS n FROM kennt GROUP BY PersonNr)') <= 5);
  assert.ok(wert(DT, `SELECT MAX(n) FROM (SELECT COUNT(*) AS n FROM kennt
    WHERE PersonNr NOT IN (${pflicht.join(', ')}) GROUP BY PersonNr)`) <= 3);
  const tatorte = wert(DT, `SELECT COUNT(*) FROM (SELECT PersonNr FROM kennt WHERE BekannterNr IN (5, 8, 22, 27)
    GROUP BY PersonNr HAVING COUNT(*) = 4)`);
  assert.equal(tatorte, 1);
  const ohneSeit = wert(DT, 'SELECT COUNT(*) FROM kennt WHERE Seit IS NULL');
  assert.ok(ohneSeit >= 3 && ohneSeit <= 13, `Seit NULL ${ohneSeit}`);
  const gegenseitig = wert(DT, 'SELECT COUNT(*) FROM kennt k1, kennt k2 WHERE k1.PersonNr = k2.BekannterNr AND k1.BekannterNr = k2.PersonNr');
  assert.ok(gegenseitig >= 10, `gegenseitige Zeilen ${gegenseitig}`);
});

test('Detektei Vorgaben: verdaechtig (nur Fälle 5–12, 1–4 je Fall, erzeugte Personen höchstens einmal)', () => {
  const jeFall = zeilen(DT, 'SELECT FallNr, COUNT(*) FROM verdaechtig WHERE FallNr >= 5 GROUP BY FallNr');
  assert.equal(jeFall.length, 8);
  for (const [f, n] of jeFall) assert.ok(n >= 1 && n <= 4, `Fall ${f}: ${n}`);
  assert.equal(wert(DT, 'SELECT COUNT(*) FROM verdaechtig WHERE FallNr IN (1, 2, 3, 4) AND PersonNr NOT IN (13, 41, 42, 43)'), 0);
  assert.equal(wert(DT, 'SELECT COUNT(*) FROM verdaechtig WHERE FallNr >= 5 AND PersonNr IN (5, 8, 13, 17, 21, 22, 27, 30, 34, 41, 42, 43)'), 0);
  assert.equal(wert(DT, 'SELECT COUNT(*) FROM (SELECT PersonNr FROM verdaechtig WHERE FallNr >= 5 GROUP BY PersonNr HAVING COUNT(*) > 1)'), 0);
});

test('Detektei Vorgaben: Orte 8–15, Aussagen (3–8 je Fall, genau 3 Fälle mit Doppelaussage, Zeit), Beweisstücke', () => {
  assert.deepEqual(zeilen(DT, 'SELECT OrtNr, Bezeichnung, Stadtteil FROM Ort WHERE OrtNr >= 8 ORDER BY OrtNr'), [
    [8, 'Bahnhofshalle', 'Bahnhofsviertel'], [9, 'Stadtarchiv', 'Altstadt'], [10, 'Hafenamt', 'Hafenviertel'],
    [11, 'Schulzentrum', 'Nordheide'], [12, 'Café am Lindenplatz', 'Lindenhof'], [13, 'Lagerhalle 3', 'Deichkamp'],
    [14, 'Weserpromenade', 'Weserufer'], [15, 'Alte Mühle', 'Mühlenfeld']]);
  const jeFall = zeilen(DT, 'SELECT FallNr, COUNT(*) FROM Aussage WHERE FallNr >= 5 GROUP BY FallNr');
  assert.equal(jeFall.length, 8);
  for (const [f, n] of jeFall) assert.ok(n >= 3 && n <= 8, `Fall ${f}: ${n}`);
  assert.equal(wert(DT, `SELECT COUNT(DISTINCT FallNr) FROM (SELECT PersonNr, FallNr, OrtNr FROM Aussage WHERE FallNr >= 5
    GROUP BY PersonNr, FallNr, OrtNr HAVING COUNT(*) > 1)`), 3);
  assert.equal(wert(DT, `SELECT COUNT(*) FROM (SELECT PersonNr, FallNr, OrtNr FROM Aussage WHERE FallNr >= 5
    GROUP BY PersonNr, FallNr, OrtNr HAVING COUNT(*) > 1)`), 3);
  assert.equal(wert(DT, `SELECT COUNT(*) FROM Aussage, Fall WHERE Aussage.FallNr = Fall.FallNr AND Fall.FallNr >= 5
    AND (substr(Aussage.Zeitpunkt, 1, 10) <= Fall.Eroeffnet OR substr(Aussage.Zeitpunkt, 12, 2) < '09'
      OR substr(Aussage.Zeitpunkt, 12, 2) > '19' OR Aussage.Zeitpunkt > '2026-09-20 23:59')`), 0);
  const beweise = zeilen(DT, 'SELECT FallNr, COUNT(*) FROM Beweisstueck WHERE FallNr >= 5 GROUP BY FallNr');
  assert.equal(beweise.length, 8);
  for (const [f, n] of beweise) assert.ok(n >= 1 && n <= 4, `Fall ${f}: ${n}`);
  const bezeichnungen = spalte(DT, 'SELECT DISTINCT Bezeichnung FROM Beweisstueck WHERE BeweisNr > 5');
  const liste = ['Quittung', 'Schlüsselkopie', 'Fotokopie', 'USB-Stick', 'Notizzettel', 'Gästebuch', 'Lieferschein', 'Briefumschlag'];
  for (const b of bezeichnungen) assert.ok(liste.includes(b), b);
  assert.ok(wert(DT, 'SELECT COUNT(*) FROM Beweisstueck WHERE BeweisNr > 5 AND OrtNr IS NULL') >= 1);
  assert.equal(wert(DT, 'SELECT COUNT(*) FROM Beweisstueck WHERE FallNr IN (1, 2, 3, 4)'), 5);
});
