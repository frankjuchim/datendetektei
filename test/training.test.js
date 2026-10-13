'use strict';
// Trainingsplatz T1–T3 (Plan Phase 3 Task 8, Spec §7.8): Generatoren deterministisch aus dem Seed, Ergebnis aus SQLite,
// Abi-Stil; Aufgabe wird nicht gespeichert – der Server erzeugt sie aus dem signierten Seed neu und prüft.
// 1 Punkt je richtiger Aufgabe, je Seed nur einmal, max. 30 Punkte/Tag.
const test = require('node:test');
const assert = require('node:assert/strict');
const Database = require('better-sqlite3');
const request = require('supertest');

const Z = require('../src/content/zufall');
const G = require('../src/content/generatoren');
const { pruefeAntwort, musterantwort } = require('../src/content/pruefer');
const parser = require('../src/sql/parser');
const regeln = require('../src/sql/regeln');
const { erzeugeTraining, MAX_PUNKTE_TAG, tagBerlin } = require('../src/services/training');
const namen = require('../seed/datenbanken/namen.json');
const H = require('./hilfen_lernen');

const { K17, K18 } = H;
const T = K17 + '/training';
const SEEDS = Array.from({ length: 150 }, (_, i) => (i * 2654435761 + 17) >>> 0);

/* ---------------------------------------------------------------- Zufall */

test('zufall: mulberry32 identisch mit scripts/db/zufall.js, deterministisch', () => {
  const ref = require('../scripts/db/zufall');
  const a = Z.mulberry32(12345);
  const b = ref.mulberry32(12345);
  for (let i = 0; i < 50; i++) assert.equal(a(), b());
  const z1 = Z.erzeugeZufall(99);
  const z2 = Z.erzeugeZufall(99);
  for (let i = 0; i < 50; i++) assert.equal(z1.ganz(1, 1000), z2.ganz(1, 1000));
  assert.deepEqual(Z.erzeugeZufall(7).stichprobe([1, 2, 3, 4, 5], 3), Z.erzeugeZufall(7).stichprobe([1, 2, 3, 4, 5], 3));
});

/* ---------------------------------------------------------------- Generatoren */

/** Tabellen aus den dbtabelle-Blöcken in eine frische SQLite-DB schreiben (unabhängig vom Generator). */
function dbAusInhalt(inhalt) {
  const db = new Database(':memory:');
  for (const b of inhalt.filter((x) => x.t === 'dbtabelle')) {
    const spalten = b.kopf.map((k, i) => {
      const zahl = b.zeilen.some((z) => typeof z[i] === 'number');
      return `"${k.name}" ${zahl ? 'INTEGER' : 'TEXT'}`;
    });
    db.exec(`CREATE TABLE "${b.tabelle}" (${spalten.join(', ')})`);
    const ins = db.prepare(`INSERT INTO "${b.tabelle}" VALUES (${b.kopf.map(() => '?').join(', ')})`);
    for (const z of b.zeilen) ins.run(...z);
  }
  return db;
}

const sqlBloecke = (inhalt) => inhalt.filter((b) => b.t === 'sql').map((b) => b.sql);

test('Generatoren: Liste T1–T8 mit Titel und Beschreibung', () => {
  assert.deepEqual(
    G.GENERATOREN.map((g) => g.typ),
    ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8']
  );
  for (const g of G.GENERATOREN) assert.ok(g.titel && g.beschreibung);
  assert.throws(() => G.erzeuge('T9', 1), /Unbekannt/);
});

test('Generatoren: deterministisch aus dem Seed, verschiedene Seeds → verschiedene Aufgaben', () => {
  for (const g of G.GENERATOREN) {
    const texte = new Set();
    for (const seed of SEEDS.slice(0, 40)) {
      const a = G.erzeuge(g.typ, seed);
      assert.deepEqual(G.erzeuge(g.typ, seed), a, `${g.typ}/${seed}`);
      texte.add(JSON.stringify(G.oeffentlich(a)));
    }
    assert.ok(texte.size >= 35, `${g.typ}: ${texte.size} verschiedene Aufgaben`);
  }
});

test('Generatoren: Ergebnis stimmt mit SQLite, Musterantwort richtig, SQL im Abi-Stil (streng regelfrei)', async () => {
  for (const g of G.GENERATOREN.filter((x) => ['T1', 'T2', 'T3'].includes(x.typ))) {
    for (const seed of SEEDS) {
      const a = G.erzeuge(g.typ, seed);
      const wo = `${g.typ}/${seed}`;
      const db = dbAusInhalt(a.inhalt);
      const sqls = sqlBloecke(a.inhalt);
      assert.ok(sqls.length >= 1, wo);
      for (const sql of sqls) {
        const p = parser.parse(sql);
        assert.deepEqual(p.fehler, [], `${wo}: ${sql}`);
        // Das Kreuzprodukt in T3 ist Gegenstand der Aufgabe (P2) – nur dort ist KEIN_VERBUND erwartet.
        const kreuz = g.typ === 'T3' && !/\nWHERE /.test(sql);
        const diag = regeln
          .pruefeRegeln(p.ast, { abimodus: 'streng' })
          .filter((d) => d.art === 'fehler' && !(kreuz && d.code === 'KEIN_VERBUND'));
        assert.deepEqual(diag, [], `${wo}: ${sql}`);
        assert.ok(/^SELECT .*\nFROM /.test(sql), `${wo}: je Klausel eine Zeile`);
        assert.ok(!/\bJOIN\b|\(SELECT|<>/i.test(sql), `${wo}: kein JOIN, keine Unterabfrage, kein <>`);
      }
      if (g.typ === 'T3') {
        assert.equal(a.interaktion.kind, 'gaps');
        const ist = sqls.map((s) => db.prepare(s).all().length);
        assert.deepEqual(
          Object.keys(a.loesung).map((k) => Number(a.loesung[k][0])),
          ist,
          wo
        );
        for (const f of Object.values(a.interaktion.felder)) assert.equal(f.typ, 'zahl');
      } else {
        assert.equal(a.interaktion.kind, 'ergebnis');
        assert.equal(a.interaktion.freieZeilen, true);
        const zeilen = db.prepare(sqls[0]).raw().all();
        assert.deepEqual(a.loesung.zeilen, zeilen, wo);
        assert.ok(zeilen.length >= 1 && zeilen.length <= 6, `${wo}: ${zeilen.length} Zeilen`);
        assert.deepEqual(
          a.interaktion.kopf,
          db
            .prepare(sqls[0])
            .columns()
            .map((c) => c.name),
          wo
        );
        assert.equal(a.interaktion.reihenfolge, /\nORDER BY /.test(sqls[0]), `${wo}: Reihenfolge nur mit ORDER BY`);
        if (/\nLIMIT /.test(sqls[0])) assert.ok(/\nORDER BY /.test(sqls[0]), `${wo}: LIMIT nur mit ORDER BY`);
      }
      db.close();
      const r = await pruefeAntwort(a, musterantwort(a));
      assert.equal(r.ok, true, wo);
    }
  }
});

test('Generatoren: Vielfalt (ORDER BY, LIMIT, AND/OR, COUNT, SUM, HAVING, WHERE vor GROUP BY, Zusatzbedingung im Verbund)', () => {
  const sql = (typ) => SEEDS.map((s) => sqlBloecke(G.erzeuge(typ, s).inhalt).join('\n'));
  const t1 = sql('T1');
  const t2 = sql('T2');
  const t3 = sql('T3');
  for (const muster of [/\nORDER BY .* DESC/, /\nORDER BY /, /\nLIMIT /, / AND /, / OR /, /\nWHERE .*'/]) {
    assert.ok(t1.some((s) => muster.test(s)), `T1: ${muster}`);
  }
  for (const muster of [/COUNT\(\*\) AS /, /SUM\(/, /\nHAVING /, /\nWHERE /, /\nORDER BY /]) {
    assert.ok(t2.some((s) => muster.test(s)), `T2: ${muster}`);
  }
  assert.ok(t3.some((s) => /\nWHERE .* AND /.test(s)), 'T3: Verbund mit Zusatzbedingung');
  assert.ok(t3.every((s) => /SELECT \*\nFROM \w+, \w+/.test(s)), 'T3: Kreuzprodukt');
});

test('Generatoren: erfundene Namen ohne reservierte Story-Namen', () => {
  const verboten = ['Merle', 'Nora', 'Tamara', ...namen.reservierteNachnamen];
  for (const g of G.GENERATOREN) {
    for (const seed of SEEDS) {
      const json = JSON.stringify(G.erzeuge(g.typ, seed).inhalt);
      for (const v of verboten) assert.ok(!json.includes(v), `${g.typ}/${seed}: ${v}`);
    }
  }
});

test('Generatoren: öffentliche Sicht ohne loesung/erklaerung', () => {
  for (const g of G.GENERATOREN) {
    const o = G.oeffentlich(G.erzeuge(g.typ, 42));
    assert.deepEqual(Object.keys(o).sort(), ['inhalt', 'interaktion', 'kategorie', 'kompetenz', 'titel', 'typ']);
    const json = JSON.stringify(o);
    assert.ok(!json.includes('loesung') && !json.includes('erklaerung'));
  }
});

/* ---------------------------------------------------------------- API */

async function start(wer = H.SCHUELERIN) {
  const u = H.umgebung();
  const s = await H.client(u, wer);
  H.einstellen(u.db, 'k:17', { akten: [9], niveau: 'eA' });
  return { u, s };
}

async function richtig(s, typ = 'T1') {
  const n = await s.post(T + '/neu', { typ });
  assert.equal(n.status, 200);
  const a = G.erzeuge(n.body.typ, n.body.seed);
  const r = await s.post(T + '/pruefen', { typ: n.body.typ, seed: n.body.seed, signatur: n.body.signatur, antwort: musterantwort(a) });
  return { n, r, a };
}

test('GET training: Generatoren, heute, maxProTag', async () => {
  const { s } = await start();
  const r = await s.get(T);
  assert.equal(r.status, 200);
  assert.deepEqual(
    r.body.generatoren.map((g) => g.typ),
    ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8']
  );
  assert.deepEqual(r.body.heute, { punkte: 0, aufgaben: 0 });
  assert.equal(r.body.maxProTag, 30);
  assert.equal(MAX_PUNKTE_TAG, 30);
});

test('neu: { typ, seed, signatur, aufgabe } – öffentlich, ohne Lösung; gleiche Aufgabe bis zur Wertung', async () => {
  const { s } = await start();
  const n = await s.post(T + '/neu', { typ: 'T2' });
  assert.equal(n.status, 200);
  assert.equal(n.body.typ, 'T2');
  assert.ok(Number.isInteger(n.body.seed) && n.body.seed >= 0);
  assert.equal(typeof n.body.signatur, 'string');
  assert.deepEqual(n.body.aufgabe, G.oeffentlich(G.erzeuge('T2', n.body.seed)));
  assert.ok(!JSON.stringify(n.body).includes('loesung'));
  const n2 = await s.post(T + '/neu', { typ: 'T2' });
  assert.equal(n2.body.seed, n.body.seed, 'kein Neuwürfeln: dieselbe Aufgabe, bis sie gewertet ist');
  assert.equal((await s.post(T + '/neu', { typ: 'T9' })).status, 400);
  assert.equal((await s.post(T + '/neu', {})).status, 400);
});

test('pruefen: richtig → 1 Punkt + Lösung; je Seed nur einmal; falsch → 0 Punkte, erneut versuchbar', async () => {
  const { s } = await start();
  // falsch zuerst
  const n = await s.post(T + '/neu', { typ: 'T3' });
  const a = G.erzeuge('T3', n.body.seed);
  const falsch = Object.fromEntries(Object.keys(a.interaktion.felder).map((k) => [k, '-1']));
  const f = await s.post(T + '/pruefen', { ...n.body, aufgabe: undefined, antwort: falsch });
  assert.equal(f.status, 200);
  assert.equal(f.body.ok, false);
  assert.equal(f.body.punkteErhalten, 0);
  assert.ok(!('loesung' in f.body), 'falsch: keine Lösung');
  assert.ok(f.body.rueckmeldung.felder);
  // dann richtig
  const r = await s.post(T + '/pruefen', { typ: 'T3', seed: n.body.seed, signatur: n.body.signatur, antwort: musterantwort(a) });
  assert.equal(r.body.ok, true);
  assert.equal(r.body.punkteErhalten, 1);
  assert.deepEqual(r.body.heute, { punkte: 1, aufgaben: 1 });
  assert.deepEqual(r.body.loesung, a.loesung);
  assert.ok(Array.isArray(r.body.erklaerung));
  // derselbe Seed noch einmal: richtig, aber keine Punkte
  const r2 = await s.post(T + '/pruefen', { typ: 'T3', seed: n.body.seed, signatur: n.body.signatur, antwort: musterantwort(a) });
  assert.equal(r2.status, 200);
  assert.equal(r2.body.ok, true);
  assert.equal(r2.body.punkteErhalten, 0);
  assert.equal(r2.body.gewertet, true);
  // danach eine neue Aufgabe
  const n2 = await s.post(T + '/neu', { typ: 'T3' });
  assert.notEqual(n2.body.seed, n.body.seed);
  const st = (await s.get(K17 + '/stand')).body;
  assert.equal(st.punkte.training, 1);
  assert.equal(st.punkte.gesamt, 1);
});

test('pruefen: leere Antwort → 400 (kein Versuch)', async () => {
  const { s } = await start();
  const n = await s.post(T + '/neu', { typ: 'T1' });
  const r = await s.post(T + '/pruefen', { typ: 'T1', seed: n.body.seed, signatur: n.body.signatur, antwort: [] });
  assert.equal(r.status, 400);
});

test('Signatur-Manipulation → 400 (Seed, Typ, Signatur, fremdes Konto, fremder Kurs)', async () => {
  const { u, s } = await start();
  const n = await s.post(T + '/neu', { typ: 'T1' });
  const { seed, signatur } = n.body;
  const antwort = musterantwort(G.erzeuge('T1', seed));
  const faelle = [
    { typ: 'T1', seed: (seed + 1) >>> 0, signatur, antwort },
    { typ: 'T2', seed, signatur, antwort },
    { typ: 'T1', seed, signatur: signatur.slice(0, -2) + (signatur.endsWith('00') ? '11' : '00'), antwort },
    { typ: 'T1', seed, signatur: 'quatsch', antwort },
    { typ: 'T1', seed, antwort },
    { typ: 'T1', seed: 'abc', signatur, antwort },
    { typ: 'T1', seed: -1, signatur, antwort }
  ];
  for (const body of faelle) {
    const r = await s.post(T + '/pruefen', body);
    assert.equal(r.status, 400, JSON.stringify(body).slice(0, 80));
  }
  for (const body of faelle) assert.equal((await s.post(T + '/loesung', body)).status, 400);
  const mika = await H.client(u, H.SCHUELER2);
  assert.equal((await mika.post(T + '/pruefen', { typ: 'T1', seed, signatur, antwort })).status, 400, 'fremdes Konto');
  // gültig bleibt gültig
  const ok = await s.post(T + '/pruefen', { typ: 'T1', seed, signatur, antwort });
  assert.equal(ok.body.punkteErhalten, 1);
  assert.equal(u.db.prepare('SELECT punkte FROM training').get().punkte, 1);
});

test('loesung: deckt auf, danach keine Punkte für diese Aufgabe', async () => {
  const { s } = await start();
  const n = await s.post(T + '/neu', { typ: 'T2' });
  const a = G.erzeuge('T2', n.body.seed);
  const l = await s.post(T + '/loesung', { typ: 'T2', seed: n.body.seed, signatur: n.body.signatur });
  assert.equal(l.status, 200);
  assert.deepEqual(l.body.loesung, a.loesung);
  const r = await s.post(T + '/pruefen', { typ: 'T2', seed: n.body.seed, signatur: n.body.signatur, antwort: musterantwort(a) });
  assert.equal(r.body.ok, true);
  assert.equal(r.body.punkteErhalten, 0);
});

test('Tagesgrenze: max. 30 Punkte je Tag (injizierte Uhr), am nächsten Tag wieder Punkte', async () => {
  const { u } = await start();
  let t = Date.parse('2026-10-12T10:00:00Z');
  const tr = erzeugeTraining({ db: u.db, lernen: u.app.locals.lernen, geheimnis: u.konfig.sessionSecret, jetzt: () => t });
  const sitz = { sub: H.SCHUELERIN.sub, rolle: 'schueler' };
  const loese = async (typ) => {
    const n = tr.neu(sitz, 'k:17', { typ });
    return tr.pruefen(sitz, 'k:17', { typ, seed: n.seed, signatur: n.signatur, antwort: musterantwort(G.erzeuge(typ, n.seed)) });
  };
  let summe = 0;
  for (let i = 0; i < 32; i++) summe += (await loese(['T1', 'T2', 'T3'][i % 3])).punkteErhalten;
  assert.equal(summe, 30);
  const z = u.db.prepare('SELECT tag, anzahl, punkte FROM training').all();
  assert.deepEqual(z, [{ tag: '2026-10-12', anzahl: 32, punkte: 30 }]);
  assert.equal(tr.info(sitz, 'k:17').heute.punkte, 30);
  // Tageswechsel nach deutscher Zeit (22:30 UTC = 00:30 MESZ)
  t = Date.parse('2026-10-12T22:30:00Z');
  assert.equal(tagBerlin(t), '2026-10-13');
  assert.equal((await loese('T1')).punkteErhalten, 1);
  assert.equal(tr.info(sitz, 'k:17').heute.punkte, 1);
});

test('Aufgabe von gestern: richtig, aber keine Punkte mehr', async () => {
  const { u } = await start();
  let t = Date.parse('2026-10-12T10:00:00Z');
  const tr = erzeugeTraining({ db: u.db, lernen: u.app.locals.lernen, geheimnis: u.konfig.sessionSecret, jetzt: () => t });
  const sitz = { sub: H.SCHUELERIN.sub, rolle: 'schueler' };
  const n = tr.neu(sitz, 'k:17', { typ: 'T1' });
  t += 86400000;
  const r = await tr.pruefen(sitz, 'k:17', { typ: 'T1', seed: n.seed, signatur: n.signatur, antwort: musterantwort(G.erzeuge('T1', n.seed)) });
  assert.equal(r.ok, true);
  assert.equal(r.punkteErhalten, 0);
});

test('Rechte: ohne Sitzung 401, fremder Kurs 403, gesperrter Kurs, CSRF 403', async () => {
  const { u, s } = await start();
  assert.equal((await request(u.app).get(T)).status, 401);
  assert.equal((await request(u.app).post(T + '/neu').set('Origin', u.konfig.plattformUrl).send({ typ: 'T1' })).status, 401);
  assert.equal((await s.get(K18 + '/training')).status, 403);
  assert.equal((await s.post(K18 + '/training/neu', { typ: 'T1' })).status, 403);
  assert.equal((await request(u.app).post(T + '/neu').set('Cookie', s.cookie).send({ typ: 'T1' })).status, 403, 'CSRF');
  assert.equal((await s.get('/api/kurse/quatsch/training')).status, 400);

  const l = await H.client(u, H.LEHRKRAFT);
  assert.equal((await l.get(T)).status, 200);
  assert.equal((await l.post(T + '/neu', { typ: 'T1' })).status, 200);
  u.db.prepare("UPDATE kurse SET aktiv = 0 WHERE kurs_id = 'k:17'").run();
  assert.equal((await s.get(T)).status, 403);
  assert.equal((await s.post(T + '/neu', { typ: 'T1' })).status, 403);
  assert.equal((await l.get(T)).status, 200);
  assert.equal((await l.post(T + '/neu', { typ: 'T1' })).status, 403);
});

test('Schüler eines anderen Kurses: richtig gelöst im eigenen Kurs zählt nicht im fremden', async () => {
  const { u, s } = await start();
  const { r } = await richtig(s, 'T2');
  assert.equal(r.body.punkteErhalten, 1);
  const fremd = await H.client(u, H.FREMD);
  H.einstellen(u.db, 'k:18', { akten: [9] });
  const st = (await fremd.get(K18 + '/stand')).body;
  assert.equal(st.punkte.training, 0);
});
