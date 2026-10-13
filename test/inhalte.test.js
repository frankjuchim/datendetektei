'use strict';
// Seed-Mechanik (Plan Phase 3 Task 4): Upsert nach id, Fingerabdruck, Deaktivieren, Fehlertoleranz,
// Zugriffsfunktionen und öffentliche Sicht ohne Lösungsdaten (Vertrag §9, AUFGABENFORMAT 4.2).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const request = require('supertest');
const { oeffneDb } = require('../src/db');
const { ladeInhalte, erzeugeInhalte, umfangVon } = require('../src/services/inhalte');
const { erzeugeApp } = require('../src/app');
const { STANDARD_UMFANG } = require('../src/kern/manifest');
const { testKonfig } = require('./helpers');

const FIXTURE = path.join(__dirname, 'fixtures', 'akte_beispiel.json');
const beispiel = () => JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));

/** Temporäres Verzeichnis als seed/akten; aufraeumen() am Ende. */
function ordner(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dd-akten-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}
const schreibe = (dir, name, daten) => {
  const p = path.join(dir, name);
  fs.writeFileSync(p, typeof daten === 'string' ? daten : JSON.stringify(daten, null, 2));
  return p;
};
const zahl = (db, sql, ...p) => db.prepare(sql).get(...p).n;

function geladen(t) {
  const dir = ordner(t);
  schreibe(dir, 'akte9.json', beispiel());
  const db = oeffneDb(':memory:');
  const inhalte = erzeugeInhalte(db);
  const bericht = inhalte.laden({ verzeichnis: dir });
  return { dir, db, inhalte, bericht };
}

test('Beispielakte wird geladen: Bericht, Tabellen, Zugriffsfunktionen', (t) => {
  const { db, inhalte, bericht } = geladen(t);
  assert.equal(bericht.dateien.length, 1);
  const d = bericht.dateien[0];
  assert.equal(d.status, 'geladen');
  assert.equal(d.welt, 9);
  assert.deepEqual(d.fehler, []);
  assert.equal(d.ausgelassen, 0);
  assert.equal(d.aufgaben, beispiel().aufgaben.length);
  assert.deepEqual(inhalte.bericht(), bericht, 'Seed-Bericht im Speicher');

  assert.equal(zahl(db, 'SELECT COUNT(*) AS n FROM akten WHERE nr = 9 AND aktiv = 1'), 1);
  assert.equal(zahl(db, 'SELECT COUNT(*) AS n FROM aufgaben WHERE aktiv = 1'), 26);
  assert.equal(zahl(db, "SELECT COUNT(*) AS n FROM aufgaben WHERE art = 'lab'"), 20);
  assert.equal(zahl(db, "SELECT COUNT(*) AS n FROM aufgaben WHERE art = 'cc'"), 2);
  assert.equal(zahl(db, "SELECT COUNT(*) AS n FROM aufgaben WHERE art = 'verhoer'"), 4);
  assert.match(db.prepare("SELECT fingerabdruck FROM aufgaben WHERE id = 'A9-E1-02'").get().fingerabdruck, /^[0-9a-f]{64}$/);

  const akte = inhalte.akte(9);
  assert.equal(akte.titel, 'Probeakte (nur Tests)');
  assert.deepEqual(akte.levels.map((l) => l.id), ['A9-E1', 'A9-E2']);
  assert.equal(akte.boss.id, 'A9-V');
  assert.equal(inhalte.akte(1), null);

  const e1 = inhalte.ermittlung('A9-E1');
  assert.equal(e1.akte, 9);
  assert.equal(e1.aufgaben.length, 12);
  assert.equal(e1.coldCase, 'A9-E1-CC');
  assert.equal(e1.maxPunkte, 10 + 20 + 20 + 10 + 20 + 20 + 10 + 10 + 20 + 30 + 0 + 20);
  assert.equal(inhalte.ermittlung('A9-E2').niveau, 'eA');
  assert.equal(inhalte.ermittlung('A9-E9'), null);

  const a = inhalte.aufgabe('A9-E1-02');
  assert.equal(a.art, 'lab');
  assert.equal(a.ermittlung, 'A9-E1');
  assert.equal(a.akte, 9);
  assert.equal(a.punkte, 20);
  assert.ok(a.loesung.sql, 'interne Sicht mit Lösung');
  const cc = inhalte.aufgabe('A9-E1-CC');
  assert.equal(cc.art, 'cc');
  assert.equal(cc.punkte, 0);
  assert.equal(cc.ermittlung, 'A9-E1');
  assert.equal(inhalte.aufgabe('A9-V-03').art, 'verhoer');
  assert.equal(inhalte.aufgabe('A9-V-03').ermittlung, null);
  assert.equal(inhalte.aufgabe('A9-E2-01').niveau, 'eA', 'Niveau der Ermittlung');
  assert.equal(inhalte.aufgabe('A9-E2-02').niveau, 'alle', 'eigene Angabe der Aufgabe geht vor');
  assert.equal(inhalte.aufgabe('gibt-es-nicht'), null);

  assert.deepEqual(inhalte.verhoerPool(9), ['A9-V-01', 'A9-V-02', 'A9-V-03', 'A9-V-04']);
  assert.deepEqual(inhalte.verhoerPool(3), []);
  assert.deepEqual(umfangVon(inhalte.akten()), { welten: 1, level: 2, aufgaben: 20, bosse: 1 });
});

test('ladeInhalte(db, { dateien }) als Funktion; erzeugeInhalte liest den letzten Stand aus der DB', (t) => {
  const leer = ordner(t);
  const db = oeffneDb(':memory:');
  const bericht = ladeInhalte(db, { verzeichnis: leer, dateien: [FIXTURE] });
  assert.equal(bericht.dateien[0].status, 'geladen');
  const inhalte = erzeugeInhalte(db); // z. B. nach Neustart, bevor geladen wird
  assert.equal(inhalte.aufgabe('A9-E1-01').titel.length > 0, true);
  assert.deepEqual(umfangVon(inhalte.akten()), { welten: 1, level: 2, aufgaben: 20, bosse: 1 });
});

test('Fingerabdruck: unveränderte Datei wird übersprungen (auch bei anderer Schlüsselreihenfolge)', (t) => {
  const { dir, db, inhalte } = geladen(t);
  const vorher = db.prepare('SELECT id, geaendert FROM aufgaben ORDER BY id').all();
  assert.equal(inhalte.laden({ verzeichnis: dir }).dateien[0].status, 'unveraendert');
  // gleiche Daten, andere Schlüsselreihenfolge und Formatierung
  const d = beispiel();
  const umgestellt = {};
  for (const k of Object.keys(d).reverse()) umgestellt[k] = d[k];
  schreibe(dir, 'akte9.json', JSON.stringify(umgestellt));
  const b = inhalte.laden({ verzeichnis: dir });
  assert.equal(b.dateien[0].status, 'unveraendert');
  assert.equal(b.dateien[0].aufgaben, 26);
  assert.deepEqual(db.prepare('SELECT id, geaendert FROM aufgaben ORDER BY id').all(), vorher);
});

test('Upsert nach id: geänderte Aufgabe wird aktualisiert, Lernstand bleibt', (t) => {
  const { dir, db, inhalte } = geladen(t);
  db.prepare("INSERT INTO konten (sub, name, rolle, zuletzt) VALUES ('s:1042', 'Lena K.', 'schueler', '')").run();
  db.prepare("INSERT INTO kurse (kurs_id, name) VALUES ('k:17', 'Inf-LK 12')").run();
  db.prepare("INSERT INTO fortschritt (sub, kurs_id, aufgabe, status, punkte, zeit) VALUES ('s:1042', 'k:17', 'A9-E1-01', 'geloest', 10, '')").run();
  const fpVorher = db.prepare("SELECT fingerabdruck FROM aufgaben WHERE id = 'A9-E1-01'").get().fingerabdruck;
  const fp2Vorher = db.prepare("SELECT fingerabdruck FROM aufgaben WHERE id = 'A9-E1-02'").get().fingerabdruck;

  const d = beispiel();
  d.aufgaben.find((a) => a.id === 'A9-E1-01').titel = 'Neuer Titel';
  schreibe(dir, 'akte9.json', d);
  const b = inhalte.laden({ verzeichnis: dir });
  assert.equal(b.dateien[0].status, 'geladen');
  assert.equal(inhalte.aufgabe('A9-E1-01').titel, 'Neuer Titel');
  assert.notEqual(db.prepare("SELECT fingerabdruck FROM aufgaben WHERE id = 'A9-E1-01'").get().fingerabdruck, fpVorher);
  assert.equal(db.prepare("SELECT fingerabdruck FROM aufgaben WHERE id = 'A9-E1-02'").get().fingerabdruck, fp2Vorher);
  assert.equal(zahl(db, 'SELECT COUNT(*) AS n FROM aufgaben'), 26, 'keine Dubletten');
  assert.equal(zahl(db, 'SELECT COUNT(*) AS n FROM fortschritt'), 1, 'Lernstand bleibt');
});

test('fehlende Aufgaben werden deaktiviert, nicht gelöscht – und bei Rückkehr wieder aktiv', (t) => {
  const { dir, db, inhalte } = geladen(t);
  const d = beispiel();
  d.aufgaben = d.aufgaben.filter((a) => a.id !== 'A9-E1-12' && a.id !== 'A9-V-04');
  d.levels[0].aufgaben = d.levels[0].aufgaben.filter((id) => id !== 'A9-E1-12');
  d.boss.pool = d.boss.pool.filter((id) => id !== 'A9-V-04');
  d.boss.anzahl = 3;
  schreibe(dir, 'akte9.json', d);
  const b = inhalte.laden({ verzeichnis: dir });
  assert.equal(b.dateien[0].deaktiviert, 2);
  assert.equal(zahl(db, "SELECT COUNT(*) AS n FROM aufgaben WHERE id IN ('A9-E1-12', 'A9-V-04') AND aktiv = 0"), 2);
  assert.equal(inhalte.aufgabe('A9-E1-12'), null);
  assert.equal(inhalte.aufgabeOeffentlich('A9-E1-12'), null);
  assert.ok(!inhalte.ermittlung('A9-E1').aufgaben.includes('A9-E1-12'));
  assert.deepEqual(inhalte.verhoerPool(9), ['A9-V-01', 'A9-V-02', 'A9-V-03']);
  assert.equal(umfangVon(inhalte.akten()).aufgaben, 19);

  schreibe(dir, 'akte9.json', beispiel());
  inhalte.laden({ verzeichnis: dir });
  assert.equal(zahl(db, 'SELECT COUNT(*) AS n FROM aufgaben WHERE aktiv = 1'), 26);
  assert.ok(inhalte.aufgabe('A9-E1-12'));
});

test('Aufgabe, die nur in aufgaben steht (keiner Ermittlung, keinem Pool zugeordnet), ist nicht aktiv', (t) => {
  const { dir, inhalte } = geladen(t);
  const d = beispiel();
  d.levels[1].aufgaben = ['A9-E2-01'];
  schreibe(dir, 'akte9.json', d);
  inhalte.laden({ verzeichnis: dir });
  assert.equal(inhalte.aufgabe('A9-E2-02'), null);
});

test('kaputte Datei (kein JSON) wird übersprungen; zuletzt geladene Fassung bleibt', (t) => {
  const { dir, db, inhalte } = geladen(t);
  schreibe(dir, 'akte9.json', '{ "version": 2, kaputt');
  const b = inhalte.laden({ verzeichnis: dir });
  assert.equal(b.dateien[0].status, 'uebersprungen');
  assert.ok(b.dateien[0].fehler.length > 0);
  assert.equal(zahl(db, 'SELECT COUNT(*) AS n FROM aufgaben WHERE aktiv = 1'), 26);
  assert.ok(inhalte.akte(9));
  assert.deepEqual(umfangVon(inhalte.akten()), { welten: 1, level: 2, aufgaben: 20, bosse: 1 });
});

test('Datei mit Fehler auf Dateiebene wird übersprungen (levels fehlt, falsche version, welt ungültig)', (t) => {
  const { dir, db, inhalte } = geladen(t);
  for (const kaputt of [
    (d) => delete d.levels,
    (d) => (d.version = 1),
    (d) => (d.welt = 'neun'),
    (d) => (d.aufgaben = {}),
    (d) => (d.titel = '')
  ]) {
    const d = beispiel();
    d.titel = 'Geändert';
    kaputt(d);
    schreibe(dir, 'akte9.json', d);
    const b = inhalte.laden({ verzeichnis: dir });
    assert.equal(b.dateien[0].status, 'uebersprungen', kaputt.toString());
    assert.equal(inhalte.akte(9).titel, 'Probeakte (nur Tests)');
    assert.equal(zahl(db, 'SELECT COUNT(*) AS n FROM aufgaben WHERE aktiv = 1'), 26);
  }
  // Wurzel ist kein Objekt
  schreibe(dir, 'akte9.json', '[1, 2]');
  assert.equal(inhalte.laden({ verzeichnis: dir }).dateien[0].status, 'uebersprungen');
});

test('einzelne fehlerhafte Aufgaben werden ausgelassen (inkl. Verweisen), der Rest wird geladen', (t) => {
  const dir = ordner(t);
  const d = beispiel();
  d.aufgaben.find((a) => a.id === 'A9-E1-01').stufe = 7;
  d.aufgaben.find((a) => a.id === 'A9-E1-04').interaktion = { kind: 'zauberei' };
  d.aufgaben.find((a) => a.id === 'A9-V-02').kategorie = 'Astrologie';
  delete d.aufgaben.find((a) => a.id === 'A9-E1-07').loesung;
  d.aufgaben.find((a) => a.id === 'A9-E1-08').inhalt.push({ t: 'video' });
  d.aufgaben.push({ titel: 'ohne id' });
  schreibe(dir, 'akte9.json', d);
  const db = oeffneDb(':memory:');
  const inhalte = erzeugeInhalte(db);
  const b = inhalte.laden({ verzeichnis: dir });
  const r = b.dateien[0];
  assert.equal(r.status, 'geladen');
  assert.equal(r.ausgelassen, 6);
  assert.ok(r.fehler.some((f) => f.includes('A9-E1-01')), r.fehler.join(' | '));
  for (const id of ['A9-E1-01', 'A9-E1-04', 'A9-V-02', 'A9-E1-07', 'A9-E1-08']) assert.equal(inhalte.aufgabe(id), null, id);
  assert.ok(!inhalte.ermittlung('A9-E1').aufgaben.includes('A9-E1-01'));
  assert.ok(!inhalte.verhoerPool(9).includes('A9-V-02'));
  assert.ok(inhalte.aufgabe('A9-E1-02'));
  assert.equal(umfangVon(inhalte.akten()).aufgaben, 20 - 4);
});

test('id, die schon in einer anderen Akte vergeben ist, wird ausgelassen', (t) => {
  const { dir, inhalte } = geladen(t);
  const d = beispiel();
  d.welt = 8;
  d.titel = 'Zweite Probeakte';
  d.levels = [{ id: 'A8-E1', titel: 'Kopie', aufgaben: ['A9-E1-01'] }];
  d.boss = undefined;
  d.aufgaben = d.aufgaben.filter((a) => a.id === 'A9-E1-01');
  schreibe(dir, 'akte8.json', d);
  const b = inhalte.laden({ verzeichnis: dir });
  const r8 = b.dateien.find((x) => x.datei.endsWith('akte8.json'));
  assert.equal(r8.ausgelassen, 1);
  assert.equal(inhalte.aufgabe('A9-E1-01').akte, 9);
});

test('zwei Dateien mit derselben Aktennummer: die zweite wird übersprungen', (t) => {
  const { dir, inhalte } = geladen(t);
  const d = beispiel();
  d.titel = 'Doppelgänger';
  schreibe(dir, 'akte9b.json', d);
  const b = inhalte.laden({ verzeichnis: dir });
  assert.deepEqual(b.dateien.map((x) => x.status), ['unveraendert', 'uebersprungen']);
  assert.equal(inhalte.akte(9).titel, 'Probeakte (nur Tests)');
});

test('Akte, deren Datei nicht mehr geladen wird, wird mit ihren Aufgaben deaktiviert', (t) => {
  const { dir, db, inhalte } = geladen(t);
  fs.rmSync(path.join(dir, 'akte9.json'));
  const b = inhalte.laden({ verzeichnis: dir });
  assert.deepEqual(b.dateien, []);
  assert.deepEqual(b.entfernt, [9]);
  assert.equal(inhalte.akte(9), null);
  assert.equal(zahl(db, 'SELECT COUNT(*) AS n FROM aufgaben WHERE aktiv = 1'), 0);
  assert.equal(zahl(db, 'SELECT COUNT(*) AS n FROM aufgaben'), 26, 'nicht gelöscht');
  assert.deepEqual(inhalte.umfang(), { ...STANDARD_UMFANG });
});

test('fehlendes Verzeichnis: leerer Bericht, kein Absturz; log wird aufgerufen', (t) => {
  const zeilen = [];
  const db = oeffneDb(':memory:');
  const inhalte = erzeugeInhalte(db, { log: (z) => zeilen.push(z) });
  const b = inhalte.laden({ verzeichnis: path.join(os.tmpdir(), 'gibt-es-nicht-' + process.pid), dateien: [FIXTURE] });
  assert.equal(b.dateien.length, 1);
  assert.ok(zeilen.length > 0);
  assert.ok(zeilen.every((z) => typeof z === 'string'));
});

/* ---------- öffentliche Sicht ---------- */

const VERBOTENE_SCHLUESSEL = ['loesung', 'erklaerung', 'tipps', 'quelleSql', 'varianten', 'sortierung', 'aliasPflicht', 'kernpunkte', 'quelle'];

function schluesselIn(wert, out = new Set()) {
  if (Array.isArray(wert)) wert.forEach((w) => schluesselIn(w, out));
  else if (wert && typeof wert === 'object') {
    for (const [k, v] of Object.entries(wert)) {
      out.add(k);
      schluesselIn(v, out);
    }
  }
  return out;
}

/** Lösungswerte, die nie in der öffentlichen Sicht stehen dürfen (Texte ab 6 Zeichen). */
function geheimeTexte(a) {
  const out = [];
  const sammle = (w) => {
    if (typeof w === 'string' && w.trim().length >= 6) out.push(w);
    else if (Array.isArray(w)) w.forEach(sammle);
    else if (w && typeof w === 'object') Object.values(w).forEach(sammle);
  };
  sammle(a.loesung);
  for (const b of a.erklaerung || []) sammle([b.md, b.sql, b.code]); // Texte der Erklärung, nicht Blocktypen
  sammle(a.tipps);
  for (const ia of [].concat(a.interaktion)) {
    if (ia && ia.kind === 'kernpunkte') sammle(ia.kernpunkte);
    if (ia && ia.varianten) sammle(ia.varianten.filter((v) => v.length >= 6));
  }
  for (const b of a.inhalt || []) if (b.quelle) sammle(b.quelle.sql);
  return out;
}

test('aufgabeOeffentlich: keine Lösungsdaten (Suche nach Schlüsseln und Lösungswerten im JSON)', (t) => {
  const { inhalte } = geladen(t);
  for (const roh of beispiel().aufgaben) {
    const o = inhalte.aufgabeOeffentlich(roh.id);
    assert.ok(o, roh.id);
    const json = JSON.stringify(o);
    const schluessel = schluesselIn(o);
    for (const k of VERBOTENE_SCHLUESSEL) assert.ok(!schluessel.has(k), `${roh.id}: Schlüssel ${k}`);
    // Modellierung (Phase 5): Lösungen nennen auch sichtbare Namen (Spaltenchips, Startdiagramm) – die zählen nicht
    const modell = [].concat(roh.interaktion).some((ia) => ['zellen', 'anomalie', 'zerlegen', 'schema', 'er'].includes(ia.kind));
    const sichtbar = modell ? JSON.stringify([roh.inhalt, roh.interaktion]) : '';
    for (const geheim of geheimeTexte(roh).filter((g) => !modell || !sichtbar.includes(g))) assert.ok(!json.includes(JSON.stringify(geheim).slice(1, -1)), `${roh.id}: ${geheim}`);
    assert.equal(o.tippsAnzahl, Array.isArray(roh.tipps) ? roh.tipps.length : 0);
  }
});

test('aufgabeOeffentlich: sql nur kind, datenbank, wirksamer abimodus; kernpunkte nur Anzahl; Rest bleibt', (t) => {
  const { inhalte } = geladen(t);
  const sql = inhalte.aufgabeOeffentlich('A9-E1-02');
  assert.deepEqual(Object.keys(sql.interaktion).sort(), ['abimodus', 'datenbank', 'kind']);
  assert.equal(sql.interaktion.abimodus, inhalte.aufgabe('A9-E1-02').interaktion.abimodus || 'hinweis');
  const verhoer = inhalte.aufgabeOeffentlich('A9-V-03');
  assert.equal(verhoer.interaktion.abimodus, 'streng', 'im Verhör immer streng');
  const kp = inhalte.aufgabeOeffentlich('A9-E1-11');
  assert.deepEqual(kp.interaktion, { kind: 'kernpunkte', anzahl: inhalte.aufgabe('A9-E1-11').interaktion.kernpunkte.length });
  const mehr = inhalte.aufgabeOeffentlich('A9-E1-10');
  assert.ok(Array.isArray(mehr.interaktion));
  assert.equal(mehr.interaktion.length, 2);
  const gaps = inhalte.aufgabeOeffentlich('A9-E1-07');
  assert.deepEqual(gaps.interaktion, inhalte.aufgabe('A9-E1-07').interaktion);
  for (const k of ['id', 'titel', 'stufe', 'punkte', 'kategorie', 'niveau', 'fallen', 'inhalt', 'interaktion', 'tippsAnzahl']) {
    assert.ok(k in gaps, k);
  }
  // Datentabelle bleibt sichtbar, nur ihre Herkunftsabfrage nicht
  const zeilen = inhalte.aufgabeOeffentlich('A9-E1-05');
  const tab = zeilen.inhalt.find((b) => b.t === 'dbtabelle');
  assert.ok(tab.zeilen.length > 0);
  assert.equal(tab.quelle, undefined);
});

test('aufgabeOeffentlich: Blöcke der Verstehenshilfen nur mit ihrer eigenen Abfrage, nie mit Lösungsdaten', (t) => {
  const { inhalte } = geladen(t);
  // spurenbrett im Inhalt: unverändert sichtbar (Tabellen, Zeilen, Bedingung des Blocks) – ohne Musterlösung
  const mitBrett = inhalte.aufgabeOeffentlich('A9-E2-01');
  const roh = beispiel().aufgaben.find((a) => a.id === 'A9-E2-01');
  assert.deepEqual(mitBrett.inhalt.find((b) => b.t === 'spurenbrett'), roh.inhalt.find((b) => b.t === 'spurenbrett'));
  assert.ok(!JSON.stringify(mitBrett).includes('SUM(v.Kugeln)'), 'Musterlösung nicht im Inhalt');
  // sortierfaecher in der Erklärung: erst nach dem Lösen, also nicht in der öffentlichen Aufgabe
  const mitFaechern = inhalte.aufgabeOeffentlich('A9-E2-02');
  assert.equal(mitFaechern.erklaerung, undefined);
  assert.ok(!JSON.stringify(mitFaechern).includes('sortierfaecher'));
  assert.ok(!JSON.stringify(mitFaechern).includes('Hoechstpreis'));
});

test('aufgabeOeffentlich: zellen, anomalie, zerlegen, schema, er liefern keine Lösungsdaten (Muster, Synonyme, FA, Zellen, Art)', (t) => {
  const { inhalte } = geladen(t);
  const ids = { zellen: 'A9-E2-03', anomalie: 'A9-E2-04', zerlegen: 'A9-E2-05', schema: 'A9-E2-06', er: 'A9-E2-07', lesen: 'A9-E2-08' };
  const erwarteteFelder = {
    zellen: ['block', 'kind', 'mehrfach'],
    anomalie: ['auftrag', 'block', 'kind', 'operation', 'simulation'],
    zerlegen: ['attribute', 'kind', 'tabellenMax'],
    schema: ['kind', 'modus', 'start'],
    er: ['kind', 'modus', 'start'],
    lesen: ['block', 'kind', 'modus']
  };
  for (const [art, id] of Object.entries(ids)) {
    const roh = inhalte.aufgabe(id);
    const o = inhalte.aufgabeOeffentlich(id);
    assert.deepEqual(Object.keys(o.interaktion).sort(), erwarteteFelder[art], id);
    const schluessel = schluesselIn(o.interaktion);
    for (const k of VERBOTENE_SCHLUESSEL) assert.ok(!schluesselIn(o).has(k), `${id}: Schlüssel ${k}`);
    for (const k of ['muster', 'fa', 'synonyme', 'aequivalenzen', 'kriterien', 'elemente', 'zuordnung', 'art']) {
      assert.ok(!schluessel.has(k), `${id}: Schlüssel ${k}`);
    }
    // Lösungswerte, die nicht ohnehin sichtbar sind (Startdiagramm, Spaltenchips, Tabelle), stehen nicht in der Sicht
    const sichtbar = JSON.stringify([roh.inhalt, roh.interaktion]);
    const json = JSON.stringify(o);
    for (const geheim of geheimeTexte(roh).filter((g) => !sichtbar.includes(g))) assert.ok(!json.includes(geheim), `${id}: ${geheim}`);
    assert.ok(!json.includes(JSON.stringify(roh.loesung)), id);
  }
  // Startdiagramm (mit Layout) und Simulationsangaben gehen an den Client – sie werden zum Bedienen gebraucht
  assert.deepEqual(inhalte.aufgabeOeffentlich('A9-E2-07').interaktion.start, inhalte.aufgabe('A9-E2-07').interaktion.start);
  assert.deepEqual(inhalte.aufgabeOeffentlich('A9-E2-04').interaktion.simulation, inhalte.aufgabe('A9-E2-04').interaktion.simulation);
  // Musternamen, die nicht im Startdiagramm stehen, fehlen in der Sicht (z. B. der Beziehungstyp leitet)
  assert.ok(!JSON.stringify(inhalte.aufgabeOeffentlich('A9-E2-07')).includes('"leitet"'));
  // Felder, die nicht zur Sicht gehören, werden nicht ausgeliefert (auch wenn sie versehentlich in interaktion stehen)
  const { oeffentlicheInteraktion } = require('../src/services/inhalte');
  const ia = oeffentlicheInteraktion({ kind: 'zerlegen', attribute: ['A', 'B'], fa: [{ links: ['A'], rechts: ['B'] }], muster: [] }, 'lab');
  assert.deepEqual(ia, { kind: 'zerlegen', attribute: ['A', 'B'] });
});

test('Zugriffsfunktionen liefern unveränderliche Objekte (Katalog nicht von außen manipulierbar)', (t) => {
  const { inhalte } = geladen(t);
  const a = inhalte.aufgabe('A9-E1-02');
  assert.throws(() => {
    'use strict';
    a.loesung.sql = 'SELECT 1';
  });
  const o = inhalte.aufgabeOeffentlich('A9-E1-02');
  o.titel = 'egal';
  assert.notEqual(inhalte.aufgabeOeffentlich('A9-E1-02').titel, 'egal');
});

/* ---------- Manifest ---------- */

test('Manifest: Beispielakte (welt 9) zählt nicht; ohne Akten des Plans Spec-Standardwerte mit aufgaben 0', async (t) => {
  const { db, inhalte } = geladen(t);
  const app = erzeugeApp(testKonfig(), db, { inhalte });
  const res = await request(app).get('/api/plattform');
  assert.deepEqual(res.body.umfang, { welten: 7, level: 13, aufgaben: 0, bosse: 7 });
  assert.deepEqual(umfangVon(inhalte.akten()), { welten: 1, level: 2, aufgaben: 20, bosse: 1 });

  const leerDb = oeffneDb(':memory:');
  const leer = erzeugeInhalte(leerDb);
  leer.laden({ verzeichnis: ordner(t) });
  const res2 = await request(erzeugeApp(testKonfig(), leerDb, { inhalte: leer })).get('/api/plattform');
  assert.deepEqual(res2.body.umfang, { welten: 7, level: 13, aufgaben: 0, bosse: 7 });
  const res3 = await request(erzeugeApp(testKonfig(), oeffneDb(':memory:'))).get('/api/plattform');
  assert.deepEqual(res3.body.umfang, { welten: 7, level: 13, aufgaben: 0, bosse: 7 });
});

test('umfang: level zählt Akte 7 (Generalprobe ohne Ermittlungen) mit, Cold Cases zählen nicht', (t) => {
  const dir = ordner(t);
  schreibe(dir, 'akte9.json', beispiel());
  const g = {
    version: 2,
    welt: 7,
    titel: 'Generalprobe',
    levels: [],
    boss: { ...beispiel().boss, id: 'A7-V', pool: ['A7-V-01', 'A7-V-02', 'A7-V-03'], anzahl: 3 },
    aufgaben: beispiel()
      .aufgaben.filter((a) => /^A9-V-0[123]$/.test(a.id))
      .map((a) => ({ ...a, id: a.id.replace('A9', 'A7') }))
  };
  schreibe(dir, 'akte7.json', g);
  const db = oeffneDb(':memory:');
  const inhalte = erzeugeInhalte(db);
  inhalte.laden({ verzeichnis: dir });
  assert.deepEqual(umfangVon(inhalte.akten()), { welten: 2, level: 3, aufgaben: 20, bosse: 2 });
  // Manifest: nur Akten des Plans (Akte 7), welten = 7 wie die welten-Liste
  assert.deepEqual(inhalte.umfang(), { welten: 7, level: 1, aufgaben: 0, bosse: 1 });
});
