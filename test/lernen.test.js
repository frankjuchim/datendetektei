'use strict';
// Lernen, Punkte, Ränge, Abzeichen, Fallen, Fehlabfragen (Plan Phase 3 Task 5, Review Focus 2 und 4).
// Schnelle Tests mit SQL-Prüfer-Stub; ein Integrationstest mit echter Sandbox am Ende.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const request = require('supertest');

const { punkteFuer, rangFuer, RAENGE, FALLEN, ABZEICHEN } = require('../src/domain');
const { musterantwort } = require('../src/content/pruefer');
const { normalisiereSql } = require('../src/services/lernen');
const { verbundToken } = require('./helpers');
const H = require('./hilfen_lernen');

const { K17 } = H;
const zahl = (db, sql, ...p) => db.prepare(sql).get(...p).n;
const A = (id) => `${K17}/aufgaben/${id}`;

async function start(opt = {}) {
  const u = H.umgebung(opt);
  const s = await H.client(u, opt.wer || H.SCHUELERIN);
  H.einstellen(u.db, 'k:17', { akten: [9], niveau: 'eA', ...(opt.einstellungen || {}) });
  return { u, s };
}

/* ---------------------------------------------------------------- Domäne */

test('Punkteformel: Tabelle der Fälle (Vertrag §9)', () => {
  const faelle = [
    [10, 0, 0, 10],
    [20, 1, 0, 15],
    [20, 0, 1, 16],
    [20, 2, 1, 6], // 1 − 0,5 − 0,2 = 0,3
    [20, 4, 0, 5], // Untergrenze 0,25
    [30, 3, 3, 8], // Untergrenze
    [10, 1, 1, 6], // 5,5 → 6
    [30, 1, 1, 17] // 16,5 → 17
  ];
  for (const [p, f, t, soll] of faelle) assert.equal(punkteFuer(p, f, t), soll, `${p}/${f}/${t}`);
});

test('Ränge: Namen und Schwellen 0/10/30/55/80 %', () => {
  assert.deepEqual(
    RAENGE.map((r) => [r.name, r.ab]),
    [
      ['Neuling', 0],
      ['Spürnase', 0.1],
      ['Ermittler:in', 0.3],
      ['Kommissar:in', 0.55],
      ['Meisterdetektiv:in', 0.8]
    ]
  );
  assert.equal(rangFuer(0).name, 'Neuling');
  assert.equal(rangFuer(0.0999).name, 'Neuling');
  assert.equal(rangFuer(0.1).name, 'Spürnase');
  assert.equal(rangFuer(0.3).name, 'Ermittler:in');
  assert.equal(rangFuer(0.55).name, 'Kommissar:in');
  assert.equal(rangFuer(0.8).name, 'Meisterdetektiv:in');
  assert.equal(rangFuer(1).naechster, null);
  assert.deepEqual(rangFuer(0.2).naechster, { name: 'Ermittler:in', ab: 0.3 });
});

test('Fallen P1–P10 mit Kurztitel, Abzeichen dieser Phase', () => {
  assert.deepEqual(FALLEN.map((f) => f.nr), ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10']);
  assert.equal(FALLEN[0].titel, 'WHERE ↔ HAVING');
  assert.deepEqual(ABZEICHEN.map((a) => a.id), ['erste-spur', 'zehnerserie', 'akte-geschlossen', 'beweisstueck', 'makellos', 'ohne-tipp']);
});

test('normalisiereSql: Leerraum, Schlüsselwörter groß, Literale unverändert, max. 500 Zeichen', () => {
  assert.equal(
    normalisiereSql("select  bezeichnung,\n wert from Fundsache\twhere kategorie = 'wertsachen  and'  order by wert desc;"),
    "SELECT bezeichnung, wert FROM Fundsache WHERE kategorie = 'wertsachen  and' ORDER BY wert DESC;"
  );
  assert.equal(normalisiereSql('   '), '');
  assert.equal(normalisiereSql('SELECT ' + 'x, '.repeat(400) + 'y FROM t').length, 500);
});

/* ---------------------------------------------------------------- Punkte und Status */

test('Fehlversuch und Tipp: Punkte nach Formel, Zustand und Stand stimmen', async () => {
  const { s } = await start();
  let r = await s.post(A('A9-E1-01') + '/pruefen', { antwort: ['a'] });
  assert.equal(r.status, 200);
  assert.equal(r.body.ok, false);
  assert.equal(r.body.zustand.fehlversuche, 1);
  assert.equal(r.body.zustand.status, 'offen');
  assert.equal(r.body.zustand.moeglich, 8); // 10 × 0,75 = 7,5 → 8

  r = await s.post(A('A9-E1-01') + '/tipp');
  assert.equal(r.status, 200);
  assert.equal(r.body.zustand.tippsGenutzt, 1);
  assert.deepEqual(r.body.zustand.tipps, ['Markiert ist eine einzelne Zelle, nicht eine ganze Zeile oder Spalte.']);
  // weiterer Tipp gibt es nicht – Zähler bleibt
  r = await s.post(A('A9-E1-01') + '/tipp');
  assert.equal(r.body.zustand.tippsGenutzt, 1);

  r = await s.post(A('A9-E1-01') + '/pruefen', { antwort: ['d'] });
  assert.equal(r.body.ok, true);
  assert.equal(r.body.geloest, true);
  assert.equal(r.body.punkteErhalten, 6); // 10 × (1 − 0,25 − 0,2) = 5,5 → 6
  assert.equal(r.body.zustand.status, 'geloest');
  assert.equal(r.body.zustand.punkte, 6);
  assert.deepEqual(r.body.loesung.loesung, { richtig: ['d'] });
  assert.ok(Array.isArray(r.body.loesung.erklaerung));

  // erneutes Lösen bringt nichts, ein Fehlversuch danach zählt nicht
  r = await s.post(A('A9-E1-01') + '/pruefen', { antwort: ['d'] });
  assert.equal(r.body.geloest, false);
  assert.equal(r.body.punkteErhalten, 0);
  r = await s.post(A('A9-E1-01') + '/pruefen', { antwort: ['b'] });
  assert.equal(r.body.zustand.fehlversuche, 1);

  const st = await s.get(K17 + '/stand');
  assert.equal(st.status, 200);
  assert.equal(st.body.punkte.gesamt, 6);
  assert.equal(st.body.geloest, 1);
  const e1 = st.body.akten.find((a) => a.nr === 9).ermittlungen.find((e) => e.id === 'A9-E1');
  const auf = e1.aufgaben.find((a) => a.id === 'A9-E1-01');
  assert.deepEqual([auf.status, auf.erreicht], ['geloest', 6]);
});

test('leere Antwort ist kein Fehlversuch (400)', async () => {
  const { u, s } = await start();
  for (const [id, antwort] of [
    ['A9-E1-01', []],
    ['A9-E1-02', '   '],
    ['A9-E1-07', { g1: '', g2: ' ' }]
  ]) {
    const r = await s.post(A(id) + '/pruefen', { antwort });
    assert.equal(r.status, 400, id);
    assert.match(r.body.error, /Antwort/);
  }
  assert.equal(zahl(u.db, 'SELECT COALESCE(SUM(fehlversuche), 0) AS n FROM fortschritt'), 0);
  assert.equal(u.pruefer.aufrufe.length, 0, 'leeres SQL geht nicht an den Prüfer');
});

test('ungültige Antwortform → 400 ohne Fehlversuch', async () => {
  const { u, s } = await start();
  const r = await s.post(A('A9-E1-01') + '/pruefen', { antwort: 'kein Array' });
  assert.equal(r.status, 400);
  assert.equal(zahl(u.db, 'SELECT COUNT(*) AS n FROM fortschritt WHERE fehlversuche > 0'), 0);
});

test('Lösung zeigen: 0 Punkte, Status angesehen, Lösung im Ergebnis; späteres Lösen = nachgelöst', async () => {
  const { s } = await start();
  let r = await s.post(A('A9-E1-02') + '/loesung-zeigen');
  assert.equal(r.status, 200);
  assert.equal(r.body.zustand.status, 'angesehen');
  assert.equal(r.body.zustand.punkte, 0);
  assert.match(r.body.loesung.loesung.sql, /WHERE Kategorie = 'Wertsachen'/);
  assert.deepEqual(r.body.zustand.tipps.length, 2, 'nach dem Aufdecken alle Tipps');

  r = await s.get(A('A9-E1-02'));
  assert.equal(r.body.zustand.status, 'angesehen');
  assert.ok(r.body.loesung, 'Musterlösung beim erneuten Abruf');

  r = await s.post(A('A9-E1-02') + '/pruefen', { antwort: "SELECT Bezeichnung, Wert FROM Fundsache WHERE Kategorie = 'Wertsachen' AND Wert >= 100 ORDER BY Wert DESC" });
  assert.equal(r.body.ok, true);
  assert.equal(r.body.zustand.status, 'nachgeloest');
  assert.equal(r.body.punkteErhalten, 0);
  const st = await s.get(K17 + '/stand');
  assert.equal(st.body.punkte.gesamt, 0);
});

test('Tipps, dann Fehlversuche: Formel mit beidem (sql, 20 Punkte)', async () => {
  const { s } = await start();
  await s.post(A('A9-E1-02') + '/tipp');
  await s.post(A('A9-E1-02') + '/tipp');
  await s.post(A('A9-E1-02') + '/pruefen', { antwort: 'SELECT Bezeichnung FROM Fundsache' });
  const r = await s.post(A('A9-E1-02') + '/pruefen', {
    antwort: "SELECT Bezeichnung, Wert\nFROM Fundsache\nWHERE Kategorie = 'Wertsachen'\n  AND Wert >= 100\nORDER BY Wert DESC"
  });
  assert.equal(r.body.punkteErhalten, 7); // 20 × (1 − 0,25 − 0,4) = 7
});

test('Fehlversuche je Falle („Deine Fallen“) und Fehlabfrage normalisiert ohne sub', async () => {
  const { u, s } = await start();
  const r = await s.post(A('A9-E1-02') + '/pruefen', { antwort: "select  Bezeichnung\n from Fundsache where kategorie = 'Wertsachen'" });
  assert.equal(r.body.ok, false);
  assert.deepEqual(r.body.rueckmeldung.diagnose.map((d) => d.code), ['ZEILEN_FEHLEN']);
  assert.equal(r.body.rueckmeldung.zeilen, 2);
  const z = u.db.prepare('SELECT * FROM fehlabfragen').all();
  assert.equal(z.length, 1);
  assert.equal(z[0].sql_norm, "SELECT Bezeichnung FROM Fundsache WHERE kategorie = 'Wertsachen'");
  assert.equal(z[0].kurs_id, 'k:17');
  assert.equal(z[0].aufgabe, 'A9-E1-02');
  assert.ok(!('sub' in z[0]));
  // gleiche Abfrage anders geschrieben → Zähler
  await s.post(A('A9-E1-02') + '/pruefen', { antwort: "SELECT Bezeichnung FROM Fundsache   WHERE kategorie = 'Wertsachen'" });
  assert.equal(u.db.prepare('SELECT anzahl FROM fehlabfragen').get().anzahl, 2);

  const st = await s.get(K17 + '/stand');
  const p6 = st.body.fallen.find((f) => f.nr === 'P6');
  assert.equal(p6.anzahl, 2);
  assert.equal(p6.titel, 'Bedingungslogik');
  assert.equal(st.body.fallen.length, 10);
  // Mehrere Fallen je Aufgabe zählen einzeln (A9-E1-07: P5, P6)
  await s.post(A('A9-E1-07') + '/pruefen', { antwort: { g1: 'x' } });
  const f = Object.fromEntries(u.db.prepare('SELECT falle, anzahl FROM fallen_zaehler').all().map((x) => [x.falle, x.anzahl]));
  assert.deepEqual(f, { P5: 1, P6: 3 });
});

test('Fehlabfragen: max. 20 je Kurs × Aufgabe, die seltenste (älteste) wird verdrängt', async () => {
  const { u, s } = await start({ konfig: { rateLimits: { pruefenSql: { max: 1000 } } } });
  const falsch = (i) => s.post(A('A9-E1-02') + '/pruefen', { antwort: `SELECT Bezeichnung FROM Fundsache WHERE FundNr = ${i}` });
  await falsch(0);
  await falsch(0); // anzahl 2
  for (let i = 1; i <= 20; i++) await falsch(i);
  const zeilen = u.db.prepare('SELECT sql_norm, anzahl FROM fehlabfragen ORDER BY sql_norm').all();
  assert.equal(zeilen.length, 20);
  const texte = zeilen.map((z) => z.sql_norm);
  assert.ok(texte.includes('SELECT Bezeichnung FROM Fundsache WHERE FundNr = 0'), 'häufige bleibt');
  assert.ok(!texte.includes('SELECT Bezeichnung FROM Fundsache WHERE FundNr = 1'), 'älteste seltene verdrängt');
  assert.ok(texte.includes('SELECT Bezeichnung FROM Fundsache WHERE FundNr = 20'), 'neue drin');
  // Lange Abfragen werden auf 500 Zeichen gekürzt
  await s.post(A('A9-E1-03') + '/pruefen', { antwort: 'SELECT ' + 'Wert, '.repeat(200) + 'Wert FROM Fundsache' });
  assert.equal(u.db.prepare("SELECT length(sql_norm) AS n FROM fehlabfragen WHERE aufgabe = 'A9-E1-03'").get().n, 500);
});

test('Lehrkraft übt: Lernstand gespeichert, aber keine Fehlabfragen und nicht in der Kursübersicht', async () => {
  const { u, s } = await start({ wer: H.LEHRKRAFT });
  const r = await s.post(A('A9-E1-02') + '/pruefen', { antwort: 'SELECT Wert FROM Fundsache' });
  assert.equal(r.status, 200);
  assert.equal(zahl(u.db, 'SELECT COUNT(*) AS n FROM fehlabfragen'), 0);
  assert.equal(zahl(u.db, "SELECT COUNT(*) AS n FROM fortschritt WHERE sub = 'l:7'"), 1);
});

test('Rate-Limit für sql-Prüfungen je Konto (Standard 30/min, hier 2)', async () => {
  const { s } = await start({ konfig: { rateLimits: { pruefenSql: { max: 2 } } } });
  for (let i = 0; i < 2; i++) assert.equal((await s.post(A('A9-E1-02') + '/pruefen', { antwort: 'SELECT 1' })).status, 200);
  const r = await s.post(A('A9-E1-02') + '/pruefen', { antwort: 'SELECT 1' });
  assert.equal(r.status, 429);
  assert.ok(r.headers['retry-after']);
  // andere Interaktionen sind davon nicht betroffen
  assert.equal((await s.post(A('A9-E1-01') + '/pruefen', { antwort: ['a'] })).status, 200);
});

test('Schrittprüfung (order) und Bug-Hunt Teil a): falscher Schritt = Fehlversuch', async () => {
  const { s } = await start();
  let r = await s.post(A('A9-E1-04') + '/pruefen', { antwort: ['b'], teilweise: true });
  assert.equal(r.status, 200);
  assert.equal(r.body.ok, false);
  assert.equal(r.body.zustand.fehlversuche, 1);
  r = await s.post(A('A9-E1-04') + '/pruefen', { antwort: ['a', 'b'], teilweise: true });
  assert.equal(r.body.ok, true);
  assert.equal(r.body.geloest, false);
  r = await s.post(A('A9-E1-04') + '/pruefen', { antwort: ['a', 'b', 'c', 'd'], teilweise: true });
  assert.equal(r.body.geloest, true);
  assert.equal(r.body.punkteErhalten, 8);
  // Bug-Hunt: Teil a) einzeln
  r = await s.post(A('A9-E1-10') + '/pruefen', { antwort: [3], teilweise: true, teil: 0 });
  assert.equal(r.body.ok, true);
  assert.equal(r.body.geloest, false);
  assert.equal(r.body.zustand.status, 'offen');
});

test('Cold Case: prüfbar, 0 Punkte, nicht im Rang und nicht in den Level-Punkten', async () => {
  const { s } = await start();
  const vorher = (await s.get(K17 + '/stand')).body;
  let r = await s.get(A('A9-E1-CC'));
  assert.equal(r.status, 200);
  assert.equal(r.body.coldCase, true);
  r = await s.post(A('A9-E1-CC') + '/pruefen', { antwort: "SELECT FundNr, Bezeichnung, Finder FROM Fundsache WHERE Finder LIKE '%alter%'" });
  assert.equal(r.body.ok, true);
  assert.equal(r.body.zustand.status, 'geloest');
  assert.equal(r.body.punkteErhalten, 0);
  const st = (await s.get(K17 + '/stand')).body;
  assert.equal(st.punkte.gesamt, 0);
  assert.equal(st.rang.punkte, 0);
  assert.equal(st.rang.maxPunkte, vorher.rang.maxPunkte);
  assert.equal(st.geloest, 0, 'Cold Cases zählen nicht als gelöste Aufgaben');
  const e1 = st.akten.find((a) => a.nr === 9).ermittlungen.find((e) => e.id === 'A9-E1');
  assert.deepEqual(e1.coldCase, { id: 'A9-E1-CC', titel: 'Cold Case: Der Schatten-Finder', status: 'geloest' });
  assert.equal(e1.maxPunkte, 190);
});

test('kernpunkte: nur die Anzahl der Häkchen, Status bearbeitet, 0 Punkte; Kernpunkte erst nach dem Aufdecken', async () => {
  const { u, s } = await start();
  let r = await s.get(A('A9-E1-11'));
  assert.ok(!JSON.stringify(r.body).includes('noch nicht abgeholte'), 'Kernpunkte nicht vor dem Aufdecken');
  assert.equal(r.body.aufgabe.interaktion.anzahl, 3);

  r = await s.post(A('A9-E1-11') + '/loesung-zeigen');
  assert.equal(r.status, 200);
  assert.equal(r.body.loesung.kernpunkte.length, 3);
  assert.equal(r.body.zustand.status, 'offen', 'Aufdecken der Kernpunkte ist kein „Lösung zeigen“');

  assert.equal((await s.post(A('A9-E1-11') + '/kernpunkte', { haken: 'Mein Freitext' })).status, 400);
  assert.equal((await s.post(A('A9-E1-11') + '/kernpunkte', { haken: 4 })).status, 400);
  assert.equal((await s.post(A('A9-E1-11') + '/kernpunkte', { haken: 2, text: 'Freitext' })).status, 400);
  r = await s.post(A('A9-E1-11') + '/kernpunkte', { haken: 2 });
  assert.equal(r.status, 200);
  assert.equal(r.body.zustand.status, 'bearbeitet');
  assert.equal(r.body.zustand.haken, 2);
  assert.equal(r.body.zustand.punkte, 0);
  assert.equal(u.db.prepare('SELECT haken FROM kernpunkte').get().haken, 2);
  // kernpunkte-Endpunkt nur für kernpunkte-Aufgaben
  assert.equal((await s.post(A('A9-E1-01') + '/kernpunkte', { haken: 1 })).status, 400);
});

test('kernpunkte in mehrteiligen Aufgaben (Cold Case A3-E1-CC): gelöst über die übrigen Teile, Häkchen werden gespeichert', async () => {
  const { u, s } = await start({ dateien: [path.join(__dirname, '..', 'seed', 'akten', 'akte3.json')], einstellungen: { akten: [3] } });
  const id = 'A3-E1-CC';
  const a = u.inhalte.aufgabe(id);
  const luecken = Object.fromEntries(Object.entries(a.loesung[0]).map(([k, v]) => [k, v[0]]));
  const kern = a.interaktion[1].kernpunkte;
  let r = await s.get(A(id));
  assert.ok(!JSON.stringify(r.body).includes(kern[0].slice(0, 20)), 'Kernpunkte nicht vor dem Lösen');
  // vor dem Lösen: keine Selbstkontrolle, leere Antwort ist kein Fehlversuch
  assert.equal((await s.post(A(id) + '/kernpunkte', { haken: 1 })).status, 400);
  assert.equal((await s.post(A(id) + '/pruefen', { antwort: [{ g1: '', g2: '', g3: '' }, 0] })).status, 400);
  assert.equal((await s.get(A(id))).body.zustand.fehlversuche, 0);
  assert.equal((await s.post(A(id) + '/pruefen', { antwort: [luecken, 'Freitext'] })).status, 400, 'nie Freitext');
  // übrige Teile richtig → gelöst, Kernpunkte je Teil
  r = await s.post(A(id) + '/pruefen', { antwort: [luecken, 0] });
  assert.equal(r.status, 200);
  assert.equal(r.body.ok, true);
  assert.equal(r.body.zustand.status, 'geloest');
  assert.equal(r.body.zustand.haken, null);
  assert.deepEqual(r.body.loesung.kernpunkte, [null, kern]);
  // Selbstkontrolle: nur die Anzahl (Zahl oder Liste je kernpunkte-Teil)
  assert.equal((await s.post(A(id) + '/kernpunkte', { haken: 'Mein Freitext' })).status, 400);
  assert.equal((await s.post(A(id) + '/kernpunkte', { haken: kern.length + 1 })).status, 400);
  assert.equal((await s.post(A(id) + '/kernpunkte', { haken: 1, text: 'Freitext' })).status, 400);
  assert.equal((await s.post(A(id) + '/kernpunkte', { haken: [1, 1] })).status, 400, 'eine Zahl je kernpunkte-Teil');
  r = await s.post(A(id) + '/kernpunkte', { haken: 2 });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.zustand.status, 'geloest', 'Status bleibt gelöst');
  assert.equal(r.body.zustand.haken, 2);
  assert.deepEqual(r.body.rueckmeldung, { bearbeitet: true, haken: 2 });
  assert.deepEqual(r.body.loesung.kernpunkte, [null, kern]);
  r = await s.post(A(id) + '/kernpunkte', { haken: [3] });
  assert.equal(r.status, 200);
  assert.equal(r.body.zustand.haken, 3);
  assert.equal(u.db.prepare('SELECT haken FROM kernpunkte WHERE aufgabe = ?').get(id).haken, 3);
  r = await s.get(A(id));
  assert.equal(r.body.zustand.haken, 3);
  assert.deepEqual(r.body.loesung.kernpunkte, [null, kern]);
  const cc = (await s.get(K17 + '/stand')).body.akten.find((x) => x.nr === 3).ermittlungen.find((e) => e.id === 'A3-E1').coldCase;
  assert.equal(cc.status, 'geloest');
  // nach „Lösung zeigen“ (andere Schülerin) darf die Selbstkontrolle ebenfalls gespeichert werden
  const s2 = await H.client(u, H.SCHUELER2);
  assert.equal((await s2.post(A(id) + '/kernpunkte', { haken: 1 })).status, 400);
  r = await s2.post(A(id) + '/loesung-zeigen');
  assert.equal(r.body.zustand.status, 'angesehen');
  r = await s2.post(A(id) + '/kernpunkte', { haken: 1 });
  assert.equal(r.status, 200);
  assert.equal(r.body.zustand.status, 'angesehen');
  assert.equal(r.body.zustand.haken, 1);
});

/* ---------------------------------------------------------------- Ränge */

test('Rang: Anteil der Level-Punkte der freigeschalteten Akten nach Niveau (eA 230, gA 190)', async () => {
  const { u, s } = await start();
  // 23 Punkte: eA 23/230 = 10 % → Spürnase
  u.db.prepare("INSERT INTO fortschritt (sub, kurs_id, aufgabe, status, punkte, zeit) VALUES ('s:1042', 'k:17', 'A9-E1-02', 'geloest', 20, 'x')").run();
  u.db.prepare("INSERT INTO fortschritt (sub, kurs_id, aufgabe, status, punkte, zeit) VALUES ('s:1042', 'k:17', 'A9-E2-02', 'geloest', 3, 'x')").run();
  let st = (await s.get(K17 + '/stand')).body;
  assert.equal(st.rang.maxPunkte, 230);
  assert.equal(st.rang.punkte, 23);
  assert.equal(st.rang.name, 'Spürnase');
  // gA: eA-Ermittlung ausgeblendet → 20/190 → Spürnase; Punkte der eA-Aufgabe zählen nicht
  H.einstellen(u.db, 'k:17', { niveau: 'gA' });
  st = (await s.get(K17 + '/stand')).body;
  assert.equal(st.rang.maxPunkte, 190);
  assert.equal(st.rang.punkte, 20);
  assert.ok(!st.akten.find((a) => a.nr === 9).ermittlungen.some((e) => e.id === 'A9-E2'));
  // nicht freigeschaltete Akte zählt nicht
  H.einstellen(u.db, 'k:17', { akten: [1] });
  st = (await s.get(K17 + '/stand')).body;
  assert.equal(st.rang.maxPunkte, 0);
  assert.equal(st.rang.name, 'Neuling');
  // 80 %: 152/190
  H.einstellen(u.db, 'k:17', { akten: [9] });
  u.db.prepare("UPDATE fortschritt SET punkte = 152 WHERE aufgabe = 'A9-E1-02'").run();
  st = (await s.get(K17 + '/stand')).body;
  assert.equal(st.rang.name, 'Meisterdetektiv:in');
});

/* ---------------------------------------------------------------- Abzeichen */

async function loeseAlle(s, inhalte, ids) {
  const out = [];
  for (const id of ids) {
    const a = inhalte.aufgabe(id);
    const istKern = !Array.isArray(a.interaktion) && a.interaktion.kind === 'kernpunkte';
    const r = istKern
      ? await s.post(A(id) + '/kernpunkte', { haken: 1 })
      : await s.post(A(id) + '/pruefen', { antwort: musterantwort(a) });
    assert.equal(r.status, 200, id + ' ' + JSON.stringify(r.body));
    if (!istKern) assert.equal(r.body.ok, true, id);
    out.push(r.body);
  }
  return out;
}

test('Abzeichen: Erste Spur, Zehnerserie, Akte geschlossen; Erfolge-Feed', async () => {
  const { u, s } = await start();
  const ids = [...u.inhalte.ermittlung('A9-E1').aufgaben, ...u.inhalte.ermittlung('A9-E2').aufgaben];
  const ergebnisse = await loeseAlle(s, u.inhalte, ids);
  assert.deepEqual(ergebnisse[0].neueAbzeichen.map((a) => a.id), ['erste-spur']);
  const alle = ergebnisse.flatMap((e) => (e.neueAbzeichen || []).map((a) => a.id));
  assert.ok(alle.includes('zehnerserie'));
  assert.ok(alle.includes('akte-geschlossen-9'));
  const st = (await s.get(K17 + '/stand')).body;
  const erhalten = st.abzeichen.filter((a) => a.erhalten).map((a) => a.id);
  assert.deepEqual(erhalten.sort(), ['akte-geschlossen-9', 'erste-spur', 'zehnerserie']);
  assert.equal(st.punkte.gesamt, 230);
  assert.equal(st.rang.name, 'Meisterdetektiv:in');
  const feed = u.db.prepare("SELECT art FROM erfolge WHERE sub = 's:1042'").all().map((z) => z.art);
  assert.ok(feed.includes('geloest:A9-E1-01'));
  assert.ok(feed.includes('abzeichen:zehnerserie'));
});

test('Zehnerserie: ein Fehlversuch unterbricht die Serie', async () => {
  const { u, s } = await start();
  const ids = [...u.inhalte.ermittlung('A9-E1').aufgaben.filter((id) => id !== 'A9-E1-11'), ...u.inhalte.ermittlung('A9-E2').aufgaben];
  assert.equal(ids.length, 13);
  await loeseAlle(s, u.inhalte, ids.slice(0, 6)); // 6 ohne Fehlversuch
  const r = await s.post(A(ids[6]) + '/pruefen', { antwort: { g1: 'falsch' } });
  assert.equal(r.status, 200);
  assert.equal(r.body.zustand.fehlversuche, 1);
  await loeseAlle(s, u.inhalte, ids.slice(6)); // Aufgabe 7 mit Fehlversuch, dann 6 ohne
  assert.equal(u.app.locals.stand.serie('s:1042', 'k:17').bestwert, 6);
  const erhalten = u.db.prepare('SELECT abzeichen FROM abzeichen').all().map((z) => z.abzeichen);
  assert.ok(!erhalten.includes('zehnerserie'), erhalten.join(','));
  assert.ok(erhalten.includes('erste-spur'));
});

test('Akte geschlossen im gA-Kurs: eA-Ermittlung zählt nicht', async () => {
  const { u, s } = await start({ einstellungen: { niveau: 'gA' } });
  await loeseAlle(s, u.inhalte, u.inhalte.ermittlung('A9-E1').aufgaben);
  const erhalten = u.db.prepare('SELECT abzeichen FROM abzeichen').all().map((z) => z.abzeichen);
  assert.ok(erhalten.includes('akte-geschlossen-9'));
});

test('Abzeichen Beweisstück und Makellos aus Verhör-Versuchen', async () => {
  const { u } = await start();
  const stand = u.app.locals.stand;
  u.db.prepare("INSERT INTO verhoer_versuche (sub, kurs_id, akte, aufgaben_json, beginn, ende, punkte, max) VALUES ('s:1042', 'k:17', 9, '[]', 'x', 'y', 30, 60)").run();
  assert.deepEqual(stand.pruefeAbzeichen('s:1042', 'k:17').map((a) => a.id), ['beweisstueck-9']);
  u.db.prepare("INSERT INTO verhoer_versuche (sub, kurs_id, akte, aufgaben_json, beginn, ende, punkte, max) VALUES ('s:1042', 'k:17', 9, '[]', 'x', NULL, 60, 60)").run();
  assert.deepEqual(stand.pruefeAbzeichen('s:1042', 'k:17'), [], 'laufender Versuch zählt nicht');
  u.db.prepare("INSERT INTO verhoer_versuche (sub, kurs_id, akte, aufgaben_json, beginn, ende, punkte, max) VALUES ('s:1042', 'k:17', 9, '[]', 'x', 'y', 60, 60)").run();
  assert.deepEqual(stand.pruefeAbzeichen('s:1042', 'k:17').map((a) => a.id), ['makellos']);
  // bester Versuch zählt in den Punkten
  const st = stand.stand('s:1042', 'k:17', { rolle: 'schueler' });
  assert.equal(st.punkte.verhoer, 60);
  assert.equal(st.akten.find((a) => a.nr === 9).verhoer.besiegt, true);
});

test('Abzeichen Ohne Tipp: 20 Aufgaben ★★★ ohne Tipp und ohne Fehlversuch', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dd-ohnetipp-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const aufgaben = [];
  for (let i = 1; i <= 21; i++) {
    aufgaben.push({
      id: `A8-E1-${String(i).padStart(2, '0')}`,
      titel: `Schwer ${i}`,
      stufe: 3,
      kategorie: 'Schlüssel',
      inhalt: [{ t: 'text', md: 'Welche Option?' }],
      interaktion: { kind: 'choice', optionen: [{ id: 'a', md: 'A' }, { id: 'b', md: 'B' }] },
      loesung: { richtig: ['a'] },
      tipps: ['Nimm A.']
    });
  }
  const datei = path.join(dir, 'akte8.json');
  fs.writeFileSync(datei, JSON.stringify({ version: 2, welt: 8, titel: 'Testakte', levels: [{ id: 'A8-E1', titel: 'Schwer', aufgaben: aufgaben.map((a) => a.id) }], aufgaben }));
  const { u, s } = await start({ dateien: [datei], einstellungen: { akten: [8] } });
  await s.post(A('A8-E1-01') + '/tipp');
  const ids = aufgaben.map((a) => a.id);
  const ergebnisse = await loeseAlle(s, u.inhalte, ids.slice(0, 20));
  assert.ok(!ergebnisse.some((e) => e.neueAbzeichen.some((a) => a.id === 'ohne-tipp')), '19 ohne Tipp reichen nicht');
  const [letzte] = await loeseAlle(s, u.inhalte, [ids[20]]);
  assert.ok(letzte.neueAbzeichen.some((a) => a.id === 'ohne-tipp'));
});

/* ---------------------------------------------------------------- Review Focus 4: Verbund-Kursübersicht */

test('Verbund-Kursübersicht: echte Werte (punkte, geloest, anteil, welten[].anteil), ohne Namen, Lehrkraft nicht dabei', async () => {
  const { u, s } = await start();
  const s2 = await H.client(u, H.SCHUELER2);
  const l = await H.client(u, H.LEHRKRAFT);
  H.einstellen(u.db, 'k:17', { akten: [9], niveau: 'eA' });
  await s.post(A('A9-E1-01') + '/pruefen', { antwort: ['d'] }); // 10
  await s.post(A('A9-E1-02') + '/pruefen', { antwort: musterantwort(u.inhalte.aufgabe('A9-E1-02')) }); // 20
  await s.post(A('A9-E1-CC') + '/pruefen', { antwort: musterantwort(u.inhalte.aufgabe('A9-E1-CC')) }); // Cold Case
  await s2.post(A('A9-E1-04') + '/loesung-zeigen');
  await l.post(A('A9-E1-01') + '/pruefen', { antwort: ['d'] });

  const token = verbundToken(u.schluessel, u.konfig, 'kurs-uebersicht');
  const r = await request(u.app).get('/api/verbund/kurse/k%3A17/uebersicht').set('Authorization', 'Bearer ' + token);
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.schueler.map((x) => x.sub), ['s:1042', 's:1043']);
  const lena = r.body.schueler[0];
  assert.equal(lena.punkte, 30);
  assert.equal(lena.geloest, 2);
  assert.ok(Math.abs(lena.anteil - 30 / 230) < 1e-9);
  assert.deepEqual([r.body.schueler[1].punkte, r.body.schueler[1].geloest, r.body.schueler[1].anteil], [0, 0, 0]);
  const w9 = r.body.welten.find((w) => w.nr === 9);
  assert.ok(Math.abs(w9.anteil - (30 / 230 + 0) / 2) < 1e-9, 'Durchschnitt der Schüler');
  assert.ok(r.body.welten.some((w) => w.nr === 1 && w.anteil === 0), 'alle Akten des Plans');
  const json = JSON.stringify(r.body);
  for (const name of ['Lena', 'Mika', 'Frau M.']) assert.ok(!json.includes(name), name);
});

/* ---------------------------------------------------------------- Integration mit echter Sandbox */

test('Integration: echter SQL-Prüfer (Sandbox) – Fehlversuch mit Diagnose, dann gelöst', async (t) => {
  const { ladeAlle } = require('../scripts/db_bauen');
  const { erzeugeSandbox } = require('../src/sql/sandbox');
  const { schemaAus } = require('../src/sql/schema');
  const { erzeugePruefer } = require('../src/sql/pruefer');
  const datenbanken = ladeAlle(undefined, { namen: ['fundbuero'] });
  const sandbox = erzeugeSandbox({ prozesse: 1, datenbanken });
  t.after(() => sandbox.beende());
  const pruefer = erzeugePruefer({ sandbox, schemata: { fundbuero: schemaAus(datenbanken.fundbuero.haupt) } });
  const { s } = await start({ pruefer });
  let r = await s.post(A('A9-E1-02') + '/pruefen', { antwort: "SELECT Bezeichnung, Wert\nFROM Fundsache\nWHERE Kategorie = 'Schmuck' AND Wert > 100\nORDER BY Wert DESC" });
  assert.equal(r.status, 200);
  assert.equal(r.body.ok, false);
  assert.ok(r.body.rueckmeldung.diagnose.length > 0);
  assert.ok(!JSON.stringify(r.body).includes('>= 100'), 'keine Musterlösung in der Rückmeldung');
  r = await s.post(A('A9-E1-02') + '/pruefen', { antwort: "SELECT Bezeichnung, Wert\nFROM Fundsache\nWHERE Kategorie = 'Wertsachen'\n  AND Wert >= 100\nORDER BY Wert DESC" });
  assert.equal(r.body.ok, true);
  assert.equal(r.body.punkteErhalten, 15);
});
