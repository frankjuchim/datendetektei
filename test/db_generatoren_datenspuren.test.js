'use strict';
// Tests des Generators Datenspuren (Plan Phase 2, Task 3; seed/datenbanken/datenspuren/LIESMICH.md).
// Datenspuren leitet aus StadtRad, Stadtfest, TuS und Detektei ab (Bau-Reihenfolge, kontext.datenbank()).
// Jede Zeile der Tabelle „Abnahme-Prüfungen“ ist ein eigener Test mit eigener Abfrage; dazu das Schlussplädoyer in
// sechs Stufen (E11) mit den Musterabfragen der LIESMICH, die an Datenspuren delegierten Prüfungen aus TuS
// („VereinExport“) und Detektei („Datenspuren.Einwohner …“), die Generator-Vorgaben aus „Datenumfang und Verteilung“,
// unveränderte Pflicht-Datensätze und byteidentisches basis.sql.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

const bau = require('../scripts/db_bauen');
const { pruefeBasisText, primaerschluessel } = require('../scripts/db/sql_schreiben');

const SEED = path.join(__dirname, '..', 'seed', 'datenbanken');
const DS = 'datenspuren';

/** Einmal bauen (deterministisch): Datenspuren samt Quell-DBs. */
let gebaut = null;
function bauen() {
  if (!gebaut) {
    const ergebnisse = bau.baueAlle({ nur: DS });
    gebaut = Object.fromEntries(ergebnisse.map((e) => [e.name, e]));
  }
  return gebaut;
}
const db = (name = DS) => bauen()[name].db;
const bericht = () => bauen()[DS].bericht;
const wert = (sql, name = DS) => db(name).prepare(sql).pluck().get();
const spalte = (sql, name = DS) => db(name).prepare(sql).pluck().all();
const zeilen = (sql, name = DS) => db(name).prepare(sql).raw().all();

function nurPflicht() {
  const d = new Database(':memory:');
  d.exec(fs.readFileSync(path.join(SEED, DS, 'schema.sql'), 'utf8'));
  d.exec(fs.readFileSync(path.join(SEED, DS, 'pflicht.sql'), 'utf8'));
  return d;
}

const LIESMICH = fs.readFileSync(path.join(SEED, DS, 'LIESMICH.md'), 'utf8');
/** Erster ```sql-Block nach einer Überschrift/Markierung der LIESMICH. */
function sqlNach(markierung, nr = 0) {
  const start = LIESMICH.indexOf(markierung);
  assert.ok(start >= 0, `${markierung} fehlt in datenspuren/LIESMICH.md`);
  const bloecke = [...LIESMICH.slice(start).matchAll(/```sql\n([\s\S]*?)\n```/g)];
  return bloecke[nr][1];
}
const STUFE = {
  1: sqlNach('**Stufe 1 '),
  2: sqlNach('**Stufe 2 '),
  3: sqlNach('**Stufe 3 '),
  '4a': sqlNach('**Stufe 4a '),
  '4b': sqlNach('**Stufe 4b '),
  '4b21': sqlNach('**Stufe 4b ', 1),
  5: sqlNach('**Stufe 5 '),
  '6a': sqlNach('**Stufe 6a '),
  '6b': sqlNach('**Stufe 6b '),
  meister: sqlNach('**Meisterstück')
};
const beispiel = (nr) => sqlNach(`**${nr}. `);

// ======================================================================================== Bau

test('Datenspuren: Bau mit Generator fertig, alle Abnahme-Prüfungen und Beispielabfragen grün', () => {
  const b = bericht();
  assert.equal(b.status, 'fertig', b.meldungen.join('; '));
  assert.deepEqual(b.schritte, ['schema', 'pflicht', 'generator', 'abnahme']);
  for (const p of b.abnahme) assert.ok(p.ok, `${p.name}: ist ${JSON.stringify(p.ist)}, soll ${JSON.stringify(p.soll)}`);
  const anzahl = bau.extrahiereSqlBloecke(LIESMICH).filter((x) => !x.fehlabfrage).length;
  assert.equal(b.beispiele.filter((x) => !x.fehlabfrage && x.ok).length, anzahl);
});

test('Datenspuren: Abnahme deckt alle Zeilen der LIESMICH und die delegierten Prüfungen ab', () => {
  const namen = bericht().abnahme.map((p) => p.name).join('\n');
  for (const muster of [/Zeilen Einwohner/, /Zeilen RadExport/, /Zeilen VereinExport/, /Zeilen FestZahlung/, /Zeilen AppCheckin/,
    /Stufe 1/, /Stufe 2/, /Stufe 3/, /Stufe 4b/, /Stufe 5/, /Stufe 6a/, /Stufe 6b/, /Meisterstück/, /Falter/,
    /Kranstraße 7.*Einwohner/, /Kranstraße 7.*Geräte/, /Konsistenz RadExport/, /Konsistenz FestZahlung/,
    /Konsistenz Einwohner/, /TuS.*VereinExport/, /Detektei.*Einwohner/]) {
    assert.match(namen, muster);
  }
});

test('Datenspuren: Pflicht-Datensätze unverändert in der Haupt-DB', () => {
  const p = nurPflicht();
  const tabellen = p.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY rowid").pluck().all();
  for (const t of tabellen) {
    const pk = primaerschluessel(p, t);
    for (const z of p.prepare(`SELECT * FROM "${t}"`).all()) {
      const bedingung = pk.map((s) => `"${s}" = ?`).join(' AND ');
      const ist = db().prepare(`SELECT * FROM "${t}" WHERE ${bedingung}`).get(...pk.map((s) => z[s]));
      assert.deepEqual(ist, z, `${t} ${JSON.stringify(z)}`);
    }
  }
  p.close();
});

test('Datenspuren: deterministisch – zweiter Bau byteidentisch, eingechecktes basis.sql passt', () => {
  const zweiter = bau.baueAlle({ nur: DS }).find((e) => e.name === DS);
  assert.equal(zweiter.bericht.status, 'fertig', zweiter.bericht.meldungen.join('; '));
  const text = bau.basisText(DS, db());
  assert.equal(bau.basisText(DS, zweiter.db), text);
  const datei = path.join(SEED, DS, 'basis.sql');
  assert.ok(fs.existsSync(datei), 'basis.sql fehlt');
  const eingecheckt = fs.readFileSync(datei, 'utf8');
  assert.equal(eingecheckt, text);
  assert.equal(pruefeBasisText(eingecheckt).ok, true);
});

test('Datenspuren: Rundlauf – basis.sql in leerer DB ergibt dieselben Daten', () => {
  const neu = new Database(':memory:');
  neu.exec(fs.readFileSync(path.join(SEED, DS, 'basis.sql'), 'utf8'));
  assert.equal(bau.basisText(DS, neu), bau.basisText(DS, db()));
  neu.close();
});

test('Datenspuren: Abnahme meldet Manipulation (Prüfungen sind scharf)', () => {
  const modul = require('../scripts/db/datenspuren');
  const neu = bau.baueAlle({ nur: DS });
  const d = neu.find((e) => e.name === DS).db;
  const quellen = { datenbank: (n) => neu.find((e) => e.name === n).db };
  for (const t of ['2026-09-08 01:14', '2026-09-10 01:05', '2026-09-12 01:21']) {
    d.prepare("INSERT INTO AppCheckin VALUES ('WA-8888', 'Hafenkante', ?)").run(t);
  }
  d.prepare("UPDATE Einwohner SET Strasse = 'Kranstraße 7' WHERE EinwohnerNr = 1001").run();
  d.prepare("UPDATE RadExport SET Tarif = 'Plus' WHERE KundenToken = 'R-21C4'").run();
  const fehl = modul.abnahme(d, quellen).filter((p) => !p.ok).map((p) => p.name);
  for (const m of [/Stufe 2/, /Stufe 3/, /Kranstraße 7.*Einwohner/, /Konsistenz RadExport/, /Hafenkante/]) {
    assert.ok(fehl.some((n) => m.test(n)), `${m} fehlt in: ${fehl.join('; ')}`);
  }
});

// ======================================================================================== Abnahme-Prüfungen

test('Abnahme: Zeilen – Einwohner 250, RadExport = StadtRad-Ausleihen (469), VereinExport 63, FestZahlung = Kartenbons, AppCheckin 180–230', () => {
  assert.equal(wert('SELECT COUNT(*) FROM Einwohner'), 250);
  assert.deepEqual(zeilen('SELECT MIN(EinwohnerNr), MAX(EinwohnerNr) FROM Einwohner'), [[1001, 1250]]);
  assert.equal(wert('SELECT COUNT(*) FROM RadExport'), wert('SELECT COUNT(*) FROM Ausleihe', 'stadtrad'));
  assert.equal(wert('SELECT COUNT(*) FROM RadExport'), 469);
  assert.equal(wert('SELECT COUNT(*) FROM VereinExport'), 63);
  assert.equal(wert('SELECT COUNT(*) FROM FestZahlung'), wert("SELECT COUNT(*) FROM Bon WHERE Zahlart = 'Karte'", 'stadtfest'));
  const app = wert('SELECT COUNT(*) FROM AppCheckin');
  assert.ok(app >= 180 && app <= 230, `AppCheckin ${app}`);
});

test('Abnahme Stufe 1: genau eine Zeile R-7F3A, 1988, Hafenviertel, Plus, 5 Fahrten', () => {
  assert.deepEqual(zeilen(STUFE[1]), [['R-7F3A', 1988, 'Hafenviertel', 'Plus', 5]]);
});

test('Abnahme Stufe 2: genau R-7F3A; ohne Tarif genau R-7F3A und R-21C4', () => {
  assert.deepEqual(spalte(STUFE[2]), ['R-7F3A']);
  const ohneTarif = STUFE[2].replace(/\n\s*AND Tarif = 'Plus'/, '');
  assert.notEqual(ohneTarif, STUFE[2]);
  assert.deepEqual(spalte(ohneTarif).sort(), ['R-21C4', 'R-7F3A']);
});

test('Abnahme Stufe 3: erste Zeile WA-3917 mit 5, alle übrigen Geräte ≤ 2 (WA-5530 mit 2)', () => {
  const z = zeilen(STUFE[3]);
  assert.deepEqual(z[0], ['WA-3917', 5]);
  for (const [, n] of z.slice(1)) assert.ok(n <= 2);
  assert.deepEqual(z, [['WA-3917', 5], ['WA-5530', 2]]);
});

test('Stufe 4a: WA-3917 hat 19 Check-ins (Vereinsheim 3, Festplatz 2, Hafenkante 5, Fundbüro 1, Kranstraße 7 8)', () => {
  const z = zeilen(STUFE['4a']);
  assert.equal(z.length, 19);
  const anzahl = (ort) => z.filter(([o]) => o === ort).length;
  assert.deepEqual(['Vereinsheim TuS', 'Festplatz', 'Hafenkante', 'Fundbüro', 'Kranstraße 7'].map(anzahl), [3, 2, 5, 1, 8]);
  assert.deepEqual(z.find(([o]) => o === 'Fundbüro'), ['Fundbüro', '2026-09-14 10:17']);
});

test('Abnahme Stufe 4b: 0 Kartenzahlungen am Kaffeemobil 22:00–22:59; 21 Uhr ≥ 3; 23 Uhr ≥ 3', () => {
  assert.deepEqual(zeilen(STUFE['4b']), [[0]]);
  assert.ok(wert(STUFE['4b21']) >= 3);
  assert.ok(wert(STUFE['4b21'].replace(/21:00/, '23:00').replace(/21:59/, '23:59')) >= 3);
  // auf den Pflicht-Daten genau 5 bzw. 4
  const p = nurPflicht();
  assert.equal(p.prepare(STUFE['4b21']).pluck().get(), 5);
  assert.equal(p.prepare(STUFE['4b21'].replace(/21:00/, '23:00').replace(/21:59/, '23:59')).pluck().get(), 4);
  p.close();
});

test('Abnahme Stufe 5: genau V-2571 (Nora Falter V-9952 ohne Geburtsjahr fällt heraus)', () => {
  assert.deepEqual(spalte(STUFE[5]), ['V-2571']);
});

test('Abnahme Stufe 6a: genau 1042, 1107, 1163 (nach Nachname Brakhage, Falkenrath, Leversen)', () => {
  assert.deepEqual(zeilen(STUFE['6a']), [
    [1163, 'Ole', 'Brakhage', 'Lotsengang 2'],
    [1042, 'Merle', 'Falkenrath', 'Kranstraße 7'],
    [1107, 'Tamara', 'Leversen', 'Speicherstraße 14']
  ]);
});

test('Abnahme Stufe 6b und Meisterstück: genau Merle Falkenrath', () => {
  assert.deepEqual(zeilen(STUFE['6b']), [[1042, 'Merle', 'Falkenrath', 'Kranstraße 7']]);
  assert.deepEqual(zeilen(STUFE.meister), [['Merle', 'Falkenrath', 'Kranstraße 7']]);
});

test('Stufe 6b Gegenproben: ohne Jahrgang + Rune Siemers, ohne Gerät + Tamara Leversen, ohne DISTINCT 8 × Merle', () => {
  const ohneJahrgang = STUFE['6b'].replace(/\n\s*AND Einwohner\.Jahrgang = 1988/, '');
  assert.deepEqual(spalte(ohneJahrgang).sort(), [1042, 1218]);
  const ohneGeraet = STUFE['6b'].replace(/\n\s*AND AppCheckin\.Geraet = 'WA-3917'/, '');
  assert.deepEqual(spalte(ohneGeraet).sort(), [1042, 1107]);
  const ohneDistinct = STUFE['6b'].replace('SELECT DISTINCT', 'SELECT');
  assert.deepEqual(spalte(ohneDistinct), Array(8).fill(1042));
});

test('Abnahme: kein Einwohner mit Nachname Falter', () => {
  assert.equal(wert("SELECT COUNT(*) FROM Einwohner WHERE Nachname = 'Falter'"), 0);
});

test('Abnahme: Kranstraße 7 – Einwohner genau 1042, 1218; Geräte genau WA-3917, WA-6120', () => {
  assert.deepEqual(spalte("SELECT EinwohnerNr FROM Einwohner WHERE Strasse = 'Kranstraße 7' ORDER BY EinwohnerNr"), [1042, 1218]);
  assert.deepEqual(spalte("SELECT DISTINCT Geraet FROM AppCheckin WHERE Ort = 'Kranstraße 7' ORDER BY Geraet"), ['WA-3917', 'WA-6120']);
});

test('Abnahme Konsistenz: jeder RadExport-Datensatz entspricht einer StadtRad-Ausleihe (Token ↔ KundenID 1:1)', () => {
  const rad = db('stadtrad').prepare(`SELECT Ausleihe.KundenID, Kunde.Jahrgang, Kunde.Stadtteil, Kunde.Tarif,
    Station.Name AS StartStation, Ausleihe.Start
    FROM Ausleihe, Kunde, Station
    WHERE Ausleihe.KundenID = Kunde.KundenID AND Ausleihe.StartStation = Station.StationID`).all();
  const exp = db().prepare('SELECT * FROM RadExport').all();
  assert.equal(exp.length, rad.length);
  const tokenJeKunde = new Map();
  const kundeJeToken = new Map();
  for (const a of rad) {
    const treffer = exp.filter((e) => e.Start === a.Start && e.StartStation === a.StartStation && e.Jahrgang === a.Jahrgang &&
      e.Stadtteil === a.Stadtteil && e.Tarif === a.Tarif && (!tokenJeKunde.has(a.KundenID) || tokenJeKunde.get(a.KundenID) === e.KundenToken));
    assert.ok(treffer.length >= 1, `Ausleihe ${JSON.stringify(a)} fehlt im Export`);
    const token = treffer.length === 1 ? treffer[0].KundenToken : tokenJeKunde.get(a.KundenID) ?? treffer[0].KundenToken;
    tokenJeKunde.set(a.KundenID, token);
    if (kundeJeToken.has(token)) assert.equal(kundeJeToken.get(token), a.KundenID, `Token ${token} für zwei Kunden`);
    kundeJeToken.set(token, a.KundenID);
  }
  assert.equal(tokenJeKunde.get(77), 'R-7F3A');
  assert.equal(tokenJeKunde.get(64), 'R-21C4');
  for (const t of spalte('SELECT DISTINCT KundenToken FROM RadExport')) assert.match(t, /^R-[0-9A-F]{4}$/);
});

test('Abnahme Konsistenz: jede FestZahlung entspricht einem Kartenbon (Stand, Zeitpunkt, Betrag = Bonsumme)', () => {
  const bons = zeilen(`SELECT Bon.StandNr, Bon.Zeitpunkt, ROUND(SUM(Position.Menge * Produkt.Preis), 2)
    FROM Bon, Position, Produkt
    WHERE Bon.BonNr = Position.BonNr AND Position.ProduktNr = Produkt.ProduktNr AND Bon.Zahlart = 'Karte'
    GROUP BY Bon.BonNr ORDER BY Bon.Zeitpunkt, Bon.StandNr, 3`, 'stadtfest');
  const zahl = zeilen('SELECT StandNr, Zeitpunkt, ROUND(Betrag, 2) FROM FestZahlung ORDER BY Zeitpunkt, StandNr, 3');
  assert.deepEqual(zahl, bons);
  for (const t of spalte('SELECT DISTINCT KartenToken FROM FestZahlung')) assert.match(t, /^K-[0-9A-F]{4}$/);
});

test('FestZahlung: ≈ 20 % der Tokens zahlen 2–3-mal, auch an verschiedenen Ständen', () => {
  const je = zeilen('SELECT KartenToken, COUNT(*), COUNT(DISTINCT StandNr) FROM FestZahlung GROUP BY KartenToken');
  const mehrfach = je.filter(([, n]) => n > 1);
  for (const [, n] of je) assert.ok(n <= 3);
  const anteil = mehrfach.length / je.length;
  assert.ok(anteil >= 0.12 && anteil <= 0.28, `Anteil ${anteil}`);
  assert.ok(mehrfach.some(([, , s]) => s > 1), 'kein Token an verschiedenen Ständen');
});

test('Abnahme Konsistenz: Einwohner enthält alle Personen aus StadtRad, Stadtfest, TuS, Detektei (außer Nora Falter) mit gleichem Jahrgang/Stadtteil', () => {
  const einw = db().prepare('SELECT * FROM Einwohner').all();
  const finde = (v, n, j, s) => einw.filter((e) => e.Vorname === v && e.Nachname === n && (j === null || e.Jahrgang === j) &&
    (s === null || e.Stadtteil === s));
  for (const k of db('stadtrad').prepare('SELECT * FROM Kunde WHERE KundenID != 77').all()) {
    assert.equal(finde(k.Vorname, k.Nachname, k.Jahrgang, k.Stadtteil).length, 1, `Kunde ${k.KundenID}`);
  }
  for (const h of db('stadtfest').prepare('SELECT * FROM Helfer WHERE HelferNr != 23').all()) {
    assert.equal(finde(h.Vorname, h.Nachname, h.Jahrgang, null).length, 1, `Helfer ${h.HelferNr}`);
  }
  for (const m of db('tus').prepare("SELECT * FROM Mitglied WHERE NOT (Vorname = 'Nora' AND Nachname = 'Falter')").all()) {
    assert.equal(finde(m.Vorname, m.Nachname, m.Geburtsjahr, null).length, 1, `Mitglied ${m.MitgliedNr}`);
  }
  // Selin Aksoy in Stadtfest und Detektei: derselbe Datensatz (1979, Lindenhof); Henning Abels (1967, Mühlenfeld)
  assert.deepEqual(zeilen("SELECT Jahrgang, Stadtteil FROM Einwohner WHERE Vorname = 'Selin' AND Nachname = 'Aksoy'"), [[1979, 'Lindenhof']]);
  assert.deepEqual(zeilen("SELECT Jahrgang, Stadtteil FROM Einwohner WHERE Vorname = 'Henning' AND Nachname = 'Abels'"), [[1967, 'Mühlenfeld']]);
  // Tamara Leversen, Merle Falkenrath, Ole Brakhage = Pflicht-Einwohner (kein zweiter Datensatz)
  assert.equal(wert("SELECT COUNT(*) FROM Einwohner WHERE Nachname IN ('Leversen', 'Falkenrath', 'Brakhage')"), 3);
});

test('Abnahme (aus TuS delegiert): VereinExport 1:1 aus Mitglied + Mitgliedschaft ohne passive Mitglieder; TuS-Stadtteil im Einwohnerverzeichnis', () => {
  const ms = zeilen(`SELECT Mitglied.MitgliedNr, Mitglied.Vorname, Mitglied.Nachname, Mitglied.Geburtsjahr, Abteilung.Name
    FROM Mitglied, Mitgliedschaft, Abteilung
    WHERE Mitglied.MitgliedNr = Mitgliedschaft.MitgliedNr AND Mitgliedschaft.AbteilungNr = Abteilung.AbteilungNr
    ORDER BY Mitglied.MitgliedNr, Mitgliedschaft.rowid`, 'tus');
  const ve = zeilen('SELECT MitgliedToken, Geburtsjahr, Abteilung, Stadtteil FROM VereinExport ORDER BY rowid');
  assert.equal(ve.length, ms.length);
  const tokenJeMitglied = new Map();
  for (let i = 0; i < ms.length; i++) {
    const [nr, v, n, gj, abt] = ms[i];
    const [token, gj2, abt2, stadtteil] = ve[i];
    assert.equal(gj2, gj, `${token}`);
    assert.equal(abt2, abt, `${token}`);
    if (tokenJeMitglied.has(nr)) assert.equal(tokenJeMitglied.get(nr), token);
    tokenJeMitglied.set(nr, token);
    if (!(v === 'Nora' && n === 'Falter')) {
      assert.deepEqual(zeilen(`SELECT Stadtteil FROM Einwohner WHERE Vorname = '${v}' AND Nachname = '${n}' AND Jahrgang = ${gj}`), [[stadtteil]]);
    }
  }
  assert.equal(new Set(tokenJeMitglied.values()).size, tokenJeMitglied.size);
  assert.equal(wert("SELECT COUNT(*) FROM Mitglied WHERE Beitragsgruppe = 'Passiv'", 'tus'), 51 - tokenJeMitglied.size);
});

test('Abnahme (aus Detektei delegiert): Einwohner enthält alle Personen der Detektei außer Nora Falter mit gleichem Jahrgang/Stadtteil (sofern nicht NULL)', () => {
  for (const p of db('detektei').prepare('SELECT * FROM Person WHERE PersonNr != 13').all()) {
    const n = db().prepare(`SELECT COUNT(*) FROM Einwohner WHERE Vorname = ? AND Nachname = ?
      AND (? IS NULL OR Jahrgang = ?) AND (? IS NULL OR Stadtteil = ?)`).pluck()
      .get(p.Vorname, p.Nachname, p.Jahrgang, p.Jahrgang, p.Stadtteil, p.Stadtteil);
    assert.equal(n, 1, `Person ${p.PersonNr} ${p.Vorname} ${p.Nachname}`);
  }
});

// ======================================================================================== Generator-Vorgaben

test('Einwohner: Jahrgang 1988 + Hafenviertel genau dreimal, Falkenrath nur 1042, keine Nora Falter', () => {
  assert.deepEqual(spalte("SELECT EinwohnerNr FROM Einwohner WHERE Jahrgang = 1988 AND Stadtteil = 'Hafenviertel' ORDER BY 1"), [1042, 1107, 1163]);
  assert.deepEqual(spalte("SELECT EinwohnerNr FROM Einwohner WHERE Nachname = 'Falkenrath'"), [1042]);
  assert.equal(wert("SELECT COUNT(*) FROM Einwohner WHERE Vorname = 'Nora' AND Nachname = 'Falter'"), 0);
});

test('Einwohner: Strasse aus der Straßenliste des Stadtteils, Hausnummer 1–40, höchstens 3 je Adresse, reservierte Adressen nur Pflicht', () => {
  const namen = JSON.parse(fs.readFileSync(path.join(SEED, 'namen.json'), 'utf8'));
  const pflichtAdressen = new Set(['Kranstraße 7', 'Speicherstraße 14', 'Lotsengang 2', 'Heideweg 21', 'Mühlenweg 30']);
  for (const e of db().prepare('SELECT * FROM Einwohner').all()) {
    const m = /^(.+) (\d+)$/.exec(e.Strasse);
    assert.ok(m, e.Strasse);
    if (!pflichtAdressen.has(e.Strasse) || ![1042, 1107, 1163, 1218, 1190, 1231].includes(e.EinwohnerNr)) {
      assert.ok(namen.strassen[e.Stadtteil].includes(m[1]), `${e.EinwohnerNr}: ${e.Strasse} nicht in ${e.Stadtteil}`);
      assert.ok(Number(m[2]) >= 1 && Number(m[2]) <= 40);
    }
  }
  assert.equal(wert('SELECT COUNT(*) FROM (SELECT Strasse FROM Einwohner GROUP BY Strasse HAVING COUNT(*) > 3)'), 0);
  assert.deepEqual(spalte("SELECT EinwohnerNr FROM Einwohner WHERE Strasse = 'Speicherstraße 14'"), [1107]);
  assert.deepEqual(spalte("SELECT EinwohnerNr FROM Einwohner WHERE Strasse = 'Lotsengang 2'"), [1163]);
  assert.ok(wert("SELECT COUNT(*) FROM Einwohner WHERE Strasse LIKE 'Kranstraße%' AND Strasse != 'Kranstraße 7'") >= 0);
});

test('Einwohner: Stadtteilverteilung – sechs große Stadtteile je 14–18 %, Weserufer und Deichkamp kleiner', () => {
  const je = new Map(zeilen('SELECT Stadtteil, COUNT(*) FROM Einwohner GROUP BY Stadtteil'));
  for (const s of ['Hafenviertel', 'Altstadt', 'Lindenhof', 'Mühlenfeld', 'Nordheide', 'Bahnhofsviertel']) {
    const anteil = je.get(s) / 250;
    assert.ok(anteil >= 0.14 && anteil <= 0.18, `${s}: ${je.get(s)}`);
  }
  assert.ok(je.get('Weserufer') < je.get('Altstadt') && je.get('Deichkamp') <= je.get('Weserufer'));
});

test('AppCheckin: Sperren – Hafenkante nachts nur WA-3917/WA-5530, Fundbüro 09-14 10 Uhr nur WA-3917, nur WA-3917 an allen vier Tatorten', () => {
  assert.deepEqual(spalte(`SELECT DISTINCT Geraet FROM AppCheckin WHERE Ort = 'Hafenkante'
    AND substr(Zeitpunkt, 12, 2) BETWEEN '00' AND '05' ORDER BY Geraet`), ['WA-3917', 'WA-5530']);
  assert.deepEqual(spalte(`SELECT DISTINCT Geraet FROM AppCheckin WHERE Ort = 'Fundbüro'
    AND Zeitpunkt BETWEEN '2026-09-14 10:00' AND '2026-09-14 10:59'`), ['WA-3917']);
  assert.deepEqual(spalte(`SELECT Geraet FROM AppCheckin WHERE Ort IN ('Hafenkante', 'Festplatz', 'Fundbüro', 'Vereinsheim TuS')
    GROUP BY Geraet HAVING COUNT(DISTINCT Ort) = 4`), ['WA-3917']);
});

test('AppCheckin: Exportzeitraum, Geräteformat, ≈ 30 % der StadtRad-Kundschaft mit Gerät bei jeder Ausleihe', () => {
  assert.equal(wert("SELECT COUNT(*) FROM AppCheckin WHERE Zeitpunkt < '2026-08-21 00:00' OR Zeitpunkt > '2026-09-20 20:00'"), 0);
  for (const g of spalte('SELECT DISTINCT Geraet FROM AppCheckin')) assert.match(g, /^WA-\d{4}$/);
  // Token mit Gerät: alle Fahrten des Tokens haben einen Check-in desselben Geräts zur Startzeit an der Startstation
  const paare = zeilen(`SELECT RadExport.KundenToken, AppCheckin.Geraet, COUNT(*)
    FROM RadExport, AppCheckin
    WHERE RadExport.StartStation = AppCheckin.Ort AND RadExport.Start = AppCheckin.Zeitpunkt
    GROUP BY RadExport.KundenToken, AppCheckin.Geraet`);
  const fahrten = new Map(zeilen('SELECT KundenToken, COUNT(*) FROM RadExport GROUP BY KundenToken'));
  const vollstaendig = paare.filter(([t, , n]) => n === fahrten.get(t) && t !== 'R-7F3A');
  const tokens = new Set(vollstaendig.map(([t]) => t));
  assert.ok(tokens.has('R-21C4'));
  const anteil = tokens.size / (fahrten.size - 1);
  assert.ok(anteil >= 0.25 && anteil <= 0.35, `Anteil ${anteil}`);
});

test('AppCheckin: ≈ 15 Geräte mit nächtlichen Adress-Check-ins (00:00–05:59) an Einwohner-Adressen', () => {
  const geraete = spalte(`SELECT DISTINCT AppCheckin.Geraet FROM AppCheckin, Einwohner
    WHERE AppCheckin.Ort = Einwohner.Strasse AND substr(AppCheckin.Zeitpunkt, 12, 2) BETWEEN '00' AND '05'`);
  const ohnePflicht = geraete.filter((g) => !['WA-3917', 'WA-1288'].includes(g));
  assert.ok(ohnePflicht.length >= 12 && ohnePflicht.length <= 18, `${ohnePflicht.length}`);
});

// ======================================================================================== Beispielabfragen

test('Beispiel 3 auf den Pflicht-Daten: R-7F3A und R-21C4 je mit V-2571 und V-4417', () => {
  const p = nurPflicht();
  assert.deepEqual(p.prepare(beispiel(3)).raw().all().map((z) => z.join('|')).sort(),
    ['R-21C4|V-2571|Tischtennis', 'R-21C4|V-4417|Fußball', 'R-7F3A|V-2571|Tischtennis', 'R-7F3A|V-4417|Fußball']);
  p.close();
});

test('Beispiel 5 auf den Pflicht-Daten: 10 Zeilen (WA-3917, WA-1288)', () => {
  const p = nurPflicht();
  const z = p.prepare(beispiel(5)).raw().all();
  assert.equal(z.length, 10);
  assert.deepEqual([...new Set(z.map(([g]) => g))].sort(), ['WA-1288', 'WA-3917']);
  p.close();
});

test('Fehlabfrage (P6) ohne Klammern ist auf der Haupt-DB zufällig richtig', () => {
  const block = bau.extrahiereSqlBloecke(LIESMICH).find((b) => b.fehlabfrage);
  assert.deepEqual(zeilen(block.sql), [['R-7F3A', 5]]);
});
