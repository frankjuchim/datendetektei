'use strict';
// Lehrkraft-Auswertung, CSV, Vorschau, Einstellungen (vollständig), Board-Schlüssel, Beamer-Board-API und
// Superadmin-Funktionen (Plan Phase 6 Task 3, Review Focus 1). Rechte je Rolle stehen zusätzlich in rechte.test.js.
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const H = require('./hilfen_lernen');
const { verbundToken } = require('./helpers');
const { musterantwort } = require('../src/content/pruefer');
const { oeffneDb } = require('../src/db');

const KURS = (kurs) => `/api/lehrkraft/kurse/${encodeURIComponent(kurs)}`;
const AUSW = (kurs) => KURS(kurs) + '/auswertung';
const CSV = (kurs) => KURS(kurs) + '/auswertung.csv';
const VORSCHAU = (kurs) => KURS(kurs) + '/vorschau';
const EINST = (kurs) => KURS(kurs) + '/einstellungen';
const BOARD_NEU = (kurs) => KURS(kurs) + '/board-schluessel';
const BOARD = (s) => '/api/board/' + s;
const LEHRKRAFT18 = { sub: 'l:8', rolle: 'lehrkraft', name: 'Herr P.', kurse: [{ id: 'k:18', name: 'Inf-GK 12', rolle: 'lehrkraft' }] };
const DOPPELT = { sub: 's:1044', rolle: 'schueler', name: 'lena k.', kurse: [{ id: 'k:17', name: 'Inf-LK 12', rolle: 'mitglied' }] };
const FALSCH_SQL = 'select Bezeichnung   from Fundsache';

async function start(opt = {}) {
  const u = H.umgebung(opt);
  const s = await H.client(u, H.SCHUELERIN);
  const s2 = await H.client(u, H.SCHUELER2);
  const s3 = await H.client(u, DOPPELT);
  const fremd = await H.client(u, H.FREMD);
  const l = await H.client(u, H.LEHRKRAFT);
  const l18 = await H.client(u, LEHRKRAFT18);
  const admin = await H.client(u, H.SUPERADMIN);
  H.einstellen(u.db, 'k:17', { akten: [9], niveau: 'eA' });
  H.einstellen(u.db, 'k:18', { akten: [9], niveau: 'eA' });
  const put = (c, kurs, body) => request(u.app).put(EINST(kurs)).set('Cookie', c.cookie).set('Origin', u.konfig.plattformUrl).send(body);
  return { u, s, s2, s3, fremd, l, l18, admin, put };
}

const loese = (u, c, id) => c.post(`${H.K17}/aufgaben/${id}/pruefen`, { antwort: musterantwort(u.inhalte.aufgabe(id)) });

/** Kurs mit Lernstand: Lena löst E1-02 (nach einem Fehlversuch an E1-03), Mika nutzt Tipp und Lösung, Lehrkraft übt mit. */
async function mitLernstand(opt) {
  const t = await start(opt);
  const { u, s, s2, l } = t;
  assert.equal((await s.post(`${H.K17}/aufgaben/A9-E1-03/pruefen`, { antwort: FALSCH_SQL })).status, 200);
  assert.equal((await s.post(`${H.K17}/aufgaben/A9-E1-03/pruefen`, { antwort: FALSCH_SQL })).status, 200);
  assert.equal((await loese(u, s, 'A9-E1-02')).body.geloest, true);
  assert.equal((await s2.post(`${H.K17}/aufgaben/A9-E1-02/tipp`)).status, 200);
  assert.equal((await s2.post(`${H.K17}/aufgaben/A9-E1-02/loesung-zeigen`)).status, 200);
  // Lehrkraft: Fehlversuch und Lösung – zählen nicht mit
  assert.equal((await l.post(`${H.K17}/aufgaben/A9-E1-03/pruefen`, { antwort: 'SELECT Wert FROM Fundsache' })).status, 200);
  assert.equal((await loese(u, l, 'A9-E1-04')).body.geloest, true);
  // Verhör: Lena zwei beendete Versuche (bester 4/6 → besiegt), Lehrkraft einer
  const v = u.db.prepare(
    "INSERT INTO verhoer_versuche (sub, kurs_id, akte, aufgaben_json, ergebnisse_json, beginn, ende, punkte, max) VALUES (?, 'k:17', 9, ?, ?, '2026-10-13T08:00:00Z', ?, ?, 60)"
  );
  const ids = JSON.stringify({ aufgaben: ['A9-V-01', 'A9-V-02', 'A9-V-03'], frist: '2026-10-13T08:20:00Z' });
  v.run('s:1042', ids, JSON.stringify({ 'A9-V-01': { ok: true, punkte: 10 } }), '2026-10-13T08:10:00Z', 10);
  v.run('s:1042', ids, JSON.stringify({ 'A9-V-01': { ok: true, punkte: 10 }, 'A9-V-03': { ok: true, punkte: 20 } }), '2026-10-13T09:10:00Z', 40);
  v.run('l:7', ids, '{}', '2026-10-13T09:10:00Z', 60);
  return t;
}

/* ---------------------------------------------------------------- Auswertung */

test('Auswertung: Matrix Schüler × Ermittlung mit Verhör, nur Schüler, keine sub', async () => {
  const { l } = await mitLernstand();
  const r = await l.get(AUSW('k:17'));
  assert.equal(r.status, 200);
  assert.equal(r.headers['cache-control'], 'no-store');
  const a = r.body;
  assert.equal(a.kurs.id, 'k:17');
  assert.equal(a.kurs.name, 'Inf-LK 12');
  assert.equal(a.kurs.niveau, 'eA');
  assert.deepEqual(
    a.spalten.map((x) => [x.typ, x.id]),
    [
      ['ermittlung', 'A9-E1'],
      ['ermittlung', 'A9-E2'],
      ['verhoer', 'A9-V']
    ]
  );
  // drei Schüler, Lehrkraft fehlt; gleiche Namen unterscheidbar
  assert.equal(a.schueler.length, 3);
  const namen = a.schueler.map((x) => x.name);
  assert.equal(new Set(namen).size, 3);
  assert.ok(namen.includes('Mika R.'));
  assert.ok(namen.some((n) => /^Lena K\. \(\d\)$/i.test(n)) && namen.some((n) => /^lena k\. \(\d\)$/.test(n)), namen.join(','));
  assert.deepEqual(a.schueler.map((x) => x.nr).sort(), [1, 2, 3]);
  const text = JSON.stringify(a);
  for (const sub of ['s:1042', 's:1043', 's:1044', 'l:7']) assert.ok(!text.includes(sub), sub);
  assert.ok(!text.includes('Frau M.'));

  const lena = a.schueler.find((x) => x.name.startsWith('Lena'));
  const p02 = lena.zellen[0];
  assert.ok(p02.punkte > 0 && p02.punkte <= 20);
  assert.equal(p02.erledigt, 1);
  assert.equal(p02.fehlversuche, 2);
  assert.equal(p02.begonnen, true);
  assert.equal(lena.zellen[1].begonnen, false);
  const v = lena.zellen[2];
  assert.deepEqual({ punkte: v.punkte, max: v.max, prozent: v.prozent, besiegt: v.besiegt, versuche: v.versuche }, { punkte: 40, max: 60, prozent: 67, besiegt: true, versuche: 2 });
  assert.equal(lena.punkte.verhoer, 40);
  assert.equal(lena.punkte.gesamt, lena.punkte.lab + lena.punkte.verhoer + lena.punkte.training);
  assert.equal(lena.platz, 1);
  assert.equal(typeof lena.rang, 'string');
  const mika = a.schueler.find((x) => x.name === 'Mika R.');
  assert.equal(mika.zellen[0].angesehen, 1);
  assert.equal(mika.zellen[0].tipps, 1);
  assert.equal(mika.zellen[2], null);
  assert.equal(mika.punkte.gesamt, 0);
});

test('Auswertung: Verhör-Ergebnisse, Akten-Fortschritt, Aufgabenstatistik', async () => {
  const { l } = await mitLernstand();
  const a = (await l.get(AUSW('k:17'))).body;
  assert.equal(a.anzahlSchueler, 3);
  const akte = a.akten.find((x) => x.nr === 9);
  assert.equal(akte.freigeschaltet, true);
  assert.ok(akte.anteil > 0 && akte.anteil < 1);
  assert.deepEqual(a.verhoere.map((x) => x.akte), [9]);
  const v = a.verhoere[0];
  assert.equal(v.teilnehmer, 1);
  assert.equal(v.besiegt, 1);
  assert.equal(v.versuche, 2);
  assert.equal(v.titel, 'Probeverhör Schulkiosk');
  const v1 = v.aufgaben.find((x) => x.id === 'A9-V-01');
  assert.deepEqual({ gezogen: v1.gezogen, richtig: v1.richtig }, { gezogen: 2, richtig: 2 });

  const st = new Map(a.aufgaben.map((x) => [x.id, x]));
  const s02 = st.get('A9-E1-02');
  assert.equal(s02.begonnen, 2);
  assert.equal(s02.geloest, 1);
  assert.equal(s02.angesehen, 1);
  assert.ok(Math.abs(s02.loesungsquote - 1 / 3) < 1e-9);
  assert.equal(s02.tipps, 1);
  const s03 = st.get('A9-E1-03');
  assert.equal(s03.begonnen, 1);
  assert.equal(s03.geloest, 0);
  assert.equal(s03.fehlversucheSchnitt, 2); // Lehrkraft zählt nicht mit
  const s04 = st.get('A9-E1-04');
  assert.equal(s04.begonnen, 0, 'Lösung der Lehrkraft zählt nicht');
  assert.equal(s04.fehlversucheSchnitt, null);
  assert.ok(st.has('A9-E2-01'));
  assert.ok(!st.has('A9-V-01'), 'Verhör-Aufgaben stehen bei den Verhören');
});

test('Auswertung: Fallen-Profil P1–P10 (nur Schüler) und häufige Fehlabfragen (anonym)', async () => {
  const { u, l } = await mitLernstand();
  const a = (await l.get(AUSW('k:17'))).body;
  assert.deepEqual(a.fallen.map((f) => f.nr), ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10']);
  const p7 = a.fallen.find((f) => f.nr === 'P7');
  assert.equal(p7.anzahl, 2, 'Fehlversuch der Lehrkraft zählt nicht');
  assert.equal(p7.schueler, 1);
  assert.equal(p7.gesperrt, false);
  assert.equal(typeof p7.titel, 'string');
  assert.ok(u.db.prepare("SELECT anzahl FROM fallen_zaehler WHERE sub = 'l:7' AND falle = 'P7'").get().anzahl >= 1);

  assert.equal(a.fehlabfragen.length, 1);
  const f = a.fehlabfragen[0];
  assert.equal(f.aufgabe, 'A9-E1-03');
  assert.equal(f.titel, 'Finderlohn');
  assert.equal(f.gesamt, 2);
  assert.deepEqual(f.abfragen, [{ sql: 'SELECT Bezeichnung FROM Fundsache', anzahl: 2 }]);
  assert.ok(!JSON.stringify(f).includes('Wert FROM'), 'keine Fehlabfragen der Lehrkraft');
});

test('Fallen-Profil: Fallen nur in gesperrten Akten → gesperrt', async () => {
  const { u, l } = await start();
  H.einstellen(u.db, 'k:17', { akten: [] });
  const a = (await l.get(AUSW('k:17'))).body;
  assert.equal(a.fallen.find((f) => f.nr === 'P7').gesperrt, true);
  assert.equal(a.fallen.find((f) => f.nr === 'P1').gesperrt, false, 'keine Aufgabe mit P1 → nicht gesperrt');
  assert.deepEqual(a.fallen.find((f) => f.nr === 'P1').akten, []);
});

test('Auswertung: gA blendet eA-Ermittlungen aus; leerer Kurs liefert leere Matrix', async () => {
  const { u, l, admin } = await start();
  H.einstellen(u.db, 'k:17', { niveau: 'gA' });
  const a = (await l.get(AUSW('k:17'))).body;
  assert.deepEqual(a.spalten.map((x) => x.id), ['A9-E1', 'A9-V']);
  const b = (await admin.get(AUSW('k:18'))).body;
  assert.equal(b.schueler.length, 1);
  u.db.prepare("DELETE FROM mitgliedschaften WHERE kurs_id = 'k:18' AND rolle = 'mitglied'").run();
  const c = (await admin.get(AUSW('k:18'))).body;
  assert.deepEqual(c.schueler, []);
  assert.equal(c.anzahlSchueler, 0);
});

test('Auswertung: gesperrter Kurs bleibt lesbar', async () => {
  const { u, l } = await mitLernstand();
  u.db.prepare("UPDATE kurse SET aktiv = 0 WHERE kurs_id = 'k:17'").run();
  const r = await l.get(AUSW('k:17'));
  assert.equal(r.status, 200);
  assert.equal(r.body.kurs.aktiv, false);
});

/* ---------------------------------------------------------------- CSV */

test('CSV: UTF-8 mit BOM, Semikolon, Kopfzeile, keine sub, Dateiname ohne Sonderzeichen', async () => {
  const { u, l } = await mitLernstand();
  u.db.prepare("UPDATE kurse SET name = 'Inf-LK 12 (Weser/Süd) \"A\"' WHERE kurs_id = 'k:17'").run();
  const r = await l.get(CSV('k:17')).buffer(true).parse((res, cb) => {
    const teile = [];
    res.on('data', (d) => teile.push(d));
    res.on('end', () => cb(null, Buffer.concat(teile)));
  });
  assert.equal(r.status, 200);
  assert.match(r.headers['content-type'], /^text\/csv; charset=utf-8/);
  assert.equal(r.headers['cache-control'], 'no-store');
  assert.equal(r.headers['content-disposition'], 'attachment; filename="auswertung-Inf-LK-12-Weser-Sued-A.csv"');
  const buf = r.body;
  assert.deepEqual([...buf.subarray(0, 3)], [0xef, 0xbb, 0xbf]);
  const text = buf.subarray(3).toString('utf8');
  const zeilen = text.split('\r\n').filter(Boolean);
  assert.equal(zeilen.length, 4);
  const kopf = zeilen[0].split(';');
  assert.deepEqual(kopf.slice(0, 7), ['Nr', 'Anzeigename', 'Platz', 'Rang', 'Punkte gesamt', 'Punkte Lab', 'Punkte Verhöre']);
  assert.ok(kopf.includes('Akte 9'));
  assert.ok(kopf.some((k) => k.startsWith('A9-E1')));
  assert.ok(kopf.includes('A9-V Punkte') && kopf.includes('A9-V besiegt'));
  for (const sub of ['s:1042', 's:1043', 'l:7']) assert.ok(!text.includes(sub));
  const lena = zeilen.find((z) => z.includes('Lena K.'));
  const felder = lena.split(';');
  assert.equal(felder[kopf.indexOf('A9-V Punkte')], '40');
  assert.equal(felder[kopf.indexOf('A9-V besiegt')], 'ja');
});

test('CSV: korrektes Quoting und Schutz vor Formeln', async () => {
  const { csvFeld } = require('../src/services/auswertung');
  assert.equal(csvFeld('Lena K.'), 'Lena K.');
  assert.equal(csvFeld('a;b'), '"a;b"');
  assert.equal(csvFeld('Sa "Ra"'), '"Sa ""Ra"""');
  assert.equal(csvFeld('x\ny'), '"x\ny"');
  assert.equal(csvFeld('=SUMME(A1)'), "'=SUMME(A1)");
  assert.equal(csvFeld('+1'), "'+1");
  assert.equal(csvFeld('@a;b'), '"\'@a;b"');
  assert.equal(csvFeld(12), '12');
  assert.equal(csvFeld(-3), '-3');
  assert.equal(csvFeld(null), '');
});

/* ---------------------------------------------------------------- Vorschau */

test('Vorschau: alle Akten, Ermittlungen, Aufgaben und Verhör-Pool – auch eA im gA-Kurs (markiert)', async () => {
  const { u, l } = await start();
  H.einstellen(u.db, 'k:17', { niveau: 'gA', akten: [] });
  const r = await l.get(VORSCHAU('k:17'));
  assert.equal(r.status, 200);
  assert.equal(r.headers['cache-control'], 'no-store');
  const v = r.body;
  assert.equal(v.kurs.niveau, 'gA');
  const akte = v.akten.find((a) => a.nr === 9);
  assert.equal(akte.freigeschaltet, false);
  assert.equal(akte.sichtbar, true);
  assert.deepEqual(akte.ermittlungen.map((e) => [e.id, e.sichtbar]), [
    ['A9-E1', true],
    ['A9-E2', false]
  ]);
  const e1 = akte.ermittlungen[0];
  assert.equal(e1.aufgaben.length, 12);
  assert.equal(e1.coldCase.id, 'A9-E1-CC');
  assert.deepEqual(Object.keys(e1.aufgaben[0]).sort(), ['fallen', 'id', 'kategorie', 'niveau', 'punkte', 'sichtbar', 'stufe', 'titel']);
  assert.equal(akte.verhoer.id, 'A9-V');
  assert.equal(akte.verhoer.dauerMin, 20);
  assert.equal(akte.verhoer.anzahl, 3);
  assert.deepEqual(akte.verhoer.pool.map((a) => a.id), ['A9-V-01', 'A9-V-02', 'A9-V-03', 'A9-V-04']);
});

test('Vorschau einer Aufgabe: mit Lösung, Erklärung, allen Tipps; auch Verhör- und Cold-Case-Aufgaben', async () => {
  const { u, l, admin } = await start();
  const r = await l.get(VORSCHAU('k:17') + '/aufgaben/A9-E1-02');
  assert.equal(r.status, 200);
  const a = u.inhalte.aufgabe('A9-E1-02');
  assert.equal(r.body.aufgabe.id, 'A9-E1-02');
  assert.equal(r.body.art, 'lab');
  assert.deepEqual(r.body.loesung.loesung, a.loesung);
  assert.deepEqual(r.body.loesung.erklaerung, a.erklaerung || []);
  assert.deepEqual(r.body.tipps, a.tipps);
  assert.equal(r.body.ort.akte.nr, 9);
  assert.equal(r.body.ort.ermittlung.id, 'A9-E1');
  const v = await admin.get(VORSCHAU('k:17') + '/aufgaben/A9-V-03');
  assert.equal(v.status, 200);
  assert.equal(v.body.art, 'verhoer');
  assert.equal(v.body.ort.ermittlung, null);
  assert.deepEqual(v.body.loesung.loesung, u.inhalte.aufgabe('A9-V-03').loesung);
  const kp = await l.get(VORSCHAU('k:17') + '/aufgaben/A9-E1-11');
  assert.ok(Array.isArray(kp.body.loesung.kernpunkte));
  assert.equal((await l.get(VORSCHAU('k:17') + '/aufgaben/A9-E1-99')).status, 404);
  assert.equal((await l.get(VORSCHAU('k:17') + '/aufgaben/' + encodeURIComponent('../x'))).status, 404);
});

test('Vorschau ohne Kurs (Lehrkraft-Bereich „Aufgaben“): alle Akten mit Niveau, eine Aufgabe mit Lösung und Tipps', async () => {
  const { u, l } = await start();
  H.einstellen(u.db, 'k:17', { niveau: 'gA', akten: [] });
  const r = await l.get('/api/lehrkraft/vorschau');
  assert.equal(r.status, 200);
  assert.equal(r.headers['cache-control'], 'no-store');
  assert.equal(r.body.kurs, null, 'kursunabhängig');
  const akte = r.body.akten.find((a) => a.nr === 9);
  assert.ok(akte, 'Beispielakte 9 geladen');
  assert.equal(akte.freigeschaltet, true, 'ohne Kurs nichts gesperrt');
  assert.equal(akte.sichtbar, true, 'ohne Kurs nichts ausgeblendet');
  assert.deepEqual(akte.ermittlungen.map((e) => [e.id, e.niveau, e.sichtbar]), [
    ['A9-E1', 'alle', true],
    ['A9-E2', 'eA', true]
  ]);
  assert.equal(akte.ermittlungen[0].aufgaben.length, 12);
  assert.equal(akte.verhoer.pool.length, 4);
  const a = await l.get('/api/lehrkraft/vorschau/aufgaben/A9-E1-02');
  assert.equal(a.status, 200);
  assert.equal(a.headers['cache-control'], 'no-store');
  assert.equal(a.body.sichtbar, true);
  assert.deepEqual(a.body.loesung.loesung, u.inhalte.aufgabe('A9-E1-02').loesung);
  assert.deepEqual(a.body.tipps, u.inhalte.aufgabe('A9-E1-02').tipps);
  assert.equal(a.body.ort.ermittlung.id, 'A9-E1');
  assert.equal((await l.get('/api/lehrkraft/vorschau/aufgaben/A9-E1-99')).status, 404);
  assert.equal((await l.get('/api/lehrkraft/vorschau/aufgaben/' + encodeURIComponent('../x'))).status, 404);
});

test('Auswertung: „zuletzt aktiv“ je Schüler:in (sekundengenau, ohne sub)', async () => {
  const { u, l } = await mitLernstand();
  const a = (await l.get(AUSW('k:17'))).body;
  const erwartet = ['s:1042', 's:1043', 's:1044'].map((sub) => u.app.locals.stand.zuletztAktiv(sub, 'k:17')).sort();
  assert.deepEqual(a.schueler.map((x) => x.zuletzt).sort(), erwartet);
  for (const x of a.schueler) assert.match(x.zuletzt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  assert.ok(!JSON.stringify(a.schueler).includes('s:104'));
});

test('Vorschau: Schüler kommen nie an Lösungen (403), auch nicht im eigenen Kurs', async () => {
  const { u, s } = await start();
  for (const p of [VORSCHAU('k:17'), VORSCHAU('k:17') + '/aufgaben/A9-E1-02']) {
    const r = await s.get(p);
    assert.equal(r.status, 403, p);
    assert.ok(!JSON.stringify(r.body).includes(u.inhalte.aufgabe('A9-E1-02').loesung.sql));
  }
});

/* ---------------------------------------------------------------- Einstellungen vollständig */

test('Einstellungen: Scoreboard, Beamer-Board und Verhör je Akte', async () => {
  const { u, l, put } = await start();
  const r = await put(l, 'k:17', { scoreboard: true, verhoerAkten: { 1: 'offen', 2: 'gesperrt' } });
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.kurs.einstellungen, {
    akten: [9],
    niveau: 'eA',
    verhoer: 'auto',
    verhoerAkten: { 1: 'offen', 2: 'gesperrt' },
    scoreboard: true,
    beamer: false
  });
  assert.deepEqual(r.body.kurs.board, { aktiv: false, schluessel: null });
  // null entfernt den eigenen Modus einer Akte wieder
  const r2 = await put(l, 'k:17', { verhoerAkten: { 2: null, 3: 'auto' } });
  assert.deepEqual(r2.body.kurs.einstellungen.verhoerAkten, { 1: 'offen', 3: 'auto' });
  const e = JSON.parse(u.db.prepare("SELECT einstellungen FROM kurse WHERE kurs_id = 'k:17'").get().einstellungen);
  assert.equal(e.scoreboard, true);
  // Board einschalten erzeugt einen Schlüssel, falls noch keiner da ist
  const r3 = await put(l, 'k:17', { beamer: true });
  assert.equal(r3.body.kurs.board.aktiv, true);
  assert.match(r3.body.kurs.board.schluessel, /^[A-Za-z0-9_-]{32}$/);
  const r4 = await put(l, 'k:17', { beamer: false });
  assert.equal(r4.body.kurs.board.aktiv, false);
  assert.equal(r4.body.kurs.board.schluessel, r3.body.kurs.board.schluessel, 'Ausschalten behält den Schlüssel');
});

test('Einstellungen: Validierung der neuen Felder', async () => {
  const { l, put } = await start();
  for (const body of [
    { scoreboard: 'ja' },
    { beamer: 1 },
    { verhoerAkten: [] },
    { verhoerAkten: { 8: 'offen' } },
    { verhoerAkten: { 1: 'immer' } },
    { verhoerAkten: { x: 'offen' } },
    { verhoerAkten: 'offen' }
  ]) {
    const r = await put(l, 'k:17', body);
    assert.equal(r.status, 400, JSON.stringify(body));
    assert.equal(typeof r.body.error, 'string');
  }
});

test('Verhör je Akte wirkt auf den Stand der Schüler', async () => {
  const { u, s } = await start();
  H.einstellen(u.db, 'k:17', { verhoer: 'gesperrt', verhoerAkten: { 9: 'offen' } });
  assert.equal((await s.get(H.K17 + '/stand')).body.akten.find((a) => a.nr === 9).verhoer.frei, true);
  H.einstellen(u.db, 'k:17', { verhoer: 'offen', verhoerAkten: { 9: 'gesperrt' } });
  const v = (await s.get(H.K17 + '/stand')).body.akten.find((a) => a.nr === 9).verhoer;
  assert.equal(v.frei, false);
  assert.match(v.grund, /gesperrt/);
});

test('Board-Schlüssel: neu erzeugen (≥ 128 Bit, URL-sicher), alter Schlüssel ungültig', async () => {
  const { u, l, s, admin, put } = await start();
  await put(l, 'k:17', { beamer: true });
  const post = (c) => request(u.app).post(BOARD_NEU('k:17')).set('Cookie', c.cookie).set('Origin', u.konfig.plattformUrl).send({});
  const r1 = await post(l);
  assert.equal(r1.status, 200);
  const k1 = r1.body.kurs.board.schluessel;
  assert.match(k1, /^[A-Za-z0-9_-]{32}$/);
  assert.equal((await request(u.app).get(BOARD(k1))).status, 200);
  const r2 = await post(admin);
  const k2 = r2.body.kurs.board.schluessel;
  assert.notEqual(k1, k2);
  assert.equal((await request(u.app).get(BOARD(k1))).status, 404);
  assert.equal((await request(u.app).get(BOARD(k2))).status, 200);
  assert.equal((await post(s)).status, 403);
  // ohne Origin (CSRF) 403
  assert.equal((await request(u.app).post(BOARD_NEU('k:17')).set('Cookie', l.cookie).send({})).status, 403);
  // gesperrter Kurs: nur lesend
  u.db.prepare("UPDATE kurse SET aktiv = 0 WHERE kurs_id = 'k:17'").run();
  assert.equal((await post(l)).status, 403);
});

/* ---------------------------------------------------------------- Board */

test('Board: Top 15, Akten-Fortschritt, letzte Erfolge – nur Anzeigenamen, keine sub', async () => {
  const t = await mitLernstand();
  const { u, l, put } = t;
  const schluessel = (await put(l, 'k:17', { beamer: true })).body.kurs.board.schluessel;
  u.db.prepare("INSERT INTO erfolge (kurs_id, sub, art, zeit) VALUES ('k:17', 's:1042', 'verhoer:9', '2026-10-13T09:10:00Z')").run();
  u.db.prepare("INSERT INTO erfolge (kurs_id, sub, art, zeit) VALUES ('k:17', 'l:7', 'geloest:A9-E1-04', '2026-10-13T09:11:00Z')").run();
  const r = await request(u.app).get(BOARD(schluessel));
  assert.equal(r.status, 200);
  assert.equal(r.headers['cache-control'], 'no-store');
  const b = r.body;
  assert.equal(b.kurs.name, 'Inf-LK 12');
  assert.equal(typeof b.zeit, 'string');
  assert.equal(b.rangliste.length, 3);
  assert.equal(b.rangliste[0].platz, 1);
  assert.ok(b.rangliste[0].name.startsWith('Lena K.'));
  assert.equal(b.rangliste[0].punkte, (await l.get(AUSW('k:17'))).body.schueler.find((x) => x.platz === 1).punkte.gesamt);
  assert.deepEqual(Object.keys(b.rangliste[0]).sort(), ['name', 'platz', 'punkte', 'rang']);
  assert.equal(b.rangliste[1].platz, 2);
  assert.equal(b.rangliste[2].platz, 2, 'gleiche Punkte → gleicher Platz');
  const akte = b.akten.find((a) => a.nr === 9);
  assert.equal(akte.freigeschaltet, true);
  assert.ok(akte.anteil > 0);
  assert.deepEqual(b.erfolge[0], { art: 'verhoer', name: b.rangliste[0].name, zeit: '2026-10-13T09:10:00Z', akte: 9, titel: 'Probeverhör Schulkiosk' });
  const geloest = b.erfolge.find((e) => e.art === 'geloest');
  assert.equal(geloest.aufgabe, 'A9-E1-02');
  assert.equal(geloest.stufe, 2);
  const text = JSON.stringify(b);
  for (const sub of ['s:1042', 's:1043', 's:1044', 'l:7', 'k:17']) assert.ok(!text.includes(sub), sub);
  assert.ok(!text.includes('Frau M.') && !text.includes('A9-E1-04'), 'Erfolge der Lehrkraft fehlen');
});

test('Board: höchstens 15 Einträge', async () => {
  const { u, l, put } = await start();
  const schluessel = (await put(l, 'k:17', { beamer: true })).body.kurs.board.schluessel;
  const konto = u.db.prepare("INSERT INTO konten (sub, name, rolle, zuletzt) VALUES (?, ?, 'schueler', '2026-10-13T08:00:00Z')");
  const mitglied = u.db.prepare("INSERT INTO mitgliedschaften (sub, kurs_id, rolle) VALUES (?, 'k:17', 'mitglied')");
  for (let i = 0; i < 20; i++) {
    konto.run(`s:${3000 + i}`, `Kim ${i}.`);
    mitglied.run(`s:${3000 + i}`);
  }
  const b = (await request(u.app).get(BOARD(schluessel))).body;
  assert.equal(b.rangliste.length, 15);
});

test('Board: ungültiger, unbekannter oder deaktivierter Schlüssel → 404; gesperrter Kurs → 404', async () => {
  const { u, l, put } = await start();
  const schluessel = (await put(l, 'k:17', { beamer: true })).body.kurs.board.schluessel;
  for (const k of ['x', 'a'.repeat(32), encodeURIComponent('../../etc'), 'A'.repeat(200)]) {
    const r = await request(u.app).get(BOARD(k));
    assert.equal(r.status, 404, k);
    assert.equal(r.body.error, 'Nicht gefunden.');
  }
  await put(l, 'k:17', { beamer: false });
  assert.equal((await request(u.app).get(BOARD(schluessel))).status, 404);
  await put(l, 'k:17', { beamer: true });
  assert.equal((await request(u.app).get(BOARD(schluessel))).status, 200);
  u.db.prepare("UPDATE kurse SET aktiv = 0 WHERE kurs_id = 'k:17'").run();
  assert.equal((await request(u.app).get(BOARD(schluessel))).status, 404);
});

test('Board: Rate-Limit je IP', async () => {
  const { u, l, put } = await start({ konfig: { rateLimits: { board: { max: 3 } } } });
  const schluessel = (await put(l, 'k:17', { beamer: true })).body.kurs.board.schluessel;
  for (let i = 0; i < 3; i++) assert.equal((await request(u.app).get(BOARD(schluessel))).status, 200);
  assert.equal((await request(u.app).get(BOARD(schluessel))).status, 429);
});

test('Verbund-Löschung des Kurses: Board-Schlüssel und Auswertungsdaten sind weg', async () => {
  const t = await mitLernstand();
  const { u, l, put } = t;
  const schluessel = (await put(l, 'k:17', { beamer: true })).body.kurs.board.schluessel;
  const token = verbundToken(u.schluessel, u.konfig, 'loeschen');
  const r = await request(u.app).post('/api/verbund/loeschen').set('Authorization', 'Bearer ' + token).send({ kurs: 'k:17' });
  assert.equal(r.status, 200);
  assert.equal((await request(u.app).get(BOARD(schluessel))).status, 404);
  for (const tab of ['fortschritt', 'fallen_zaehler', 'fehlabfragen', 'erfolge', 'verhoer_versuche', 'kurse']) {
    assert.equal(u.db.prepare(`SELECT COUNT(*) AS n FROM ${tab} WHERE kurs_id = 'k:17'`).get().n, 0, tab);
  }
});

/* ---------------------------------------------------------------- Superadmin */

test('Superadmin: Seed-Bericht ohne absolute Pfade', async () => {
  const { admin } = await start();
  const r = await admin.get('/api/admin/seed-bericht');
  assert.equal(r.status, 200);
  assert.equal(r.headers['cache-control'], 'no-store');
  const d = r.body.bericht.dateien.find((x) => x.welt === 9);
  assert.equal(d.datei, 'akte_beispiel.json');
  assert.equal(d.status, 'geladen');
  assert.ok(d.aufgaben > 0);
  assert.ok(Array.isArray(r.body.bericht.entfernt));
  assert.equal(typeof r.body.bericht.zeit, 'string');
  assert.ok(!JSON.stringify(r.body).includes('/home/') && !JSON.stringify(r.body).includes(__dirname));
  assert.deepEqual(r.body.umfang, { welten: 7, level: 13, aufgaben: 0, bosse: 7 }, 'Beispielakte zählt nicht zum Manifest-umfang');
  const akte = r.body.akten.find((a) => a.nr === 9);
  assert.equal(akte.ermittlungen, 2);
  assert.equal(akte.verhoerPool, 4);
  assert.equal(akte.aufgaben, 20);
});

test('Superadmin: Inhalte neu laden (gleiche Dateien wie beim Start)', async () => {
  const { u, admin } = await start();
  const r = await admin.post('/api/admin/inhalte-neu-laden', {});
  assert.equal(r.status, 200);
  const d = r.body.bericht.dateien.find((x) => x.welt === 9);
  assert.equal(d.status, 'unveraendert');
  assert.ok(u.inhalte.aufgabe('A9-E1-02'));
  // ohne Origin (CSRF) 403
  assert.equal((await request(u.app).post('/api/admin/inhalte-neu-laden').set('Cookie', admin.cookie).send({})).status, 403);
});

test('Superadmin: Sicherung als Download einer gültigen SQLite-Datei; temporäre Datei wird gelöscht', async () => {
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const { admin } = await mitLernstand();
  const vorher = fs.readdirSync(os.tmpdir()).filter((n) => n.startsWith('dd-sicherung-'));
  const r = await admin.get('/api/admin/sicherung').buffer(true).parse((res, cb) => {
    const teile = [];
    res.on('data', (d) => teile.push(d));
    res.on('end', () => cb(null, Buffer.concat(teile)));
  });
  assert.equal(r.status, 200);
  assert.equal(r.headers['content-type'], 'application/octet-stream');
  assert.equal(r.headers['cache-control'], 'no-store');
  assert.match(r.headers['content-disposition'], /^attachment; filename="datendetektei-sicherung-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z\.sqlite"$/);
  assert.equal(r.body.subarray(0, 15).toString('latin1'), 'SQLite format 3');
  const nachher = fs.readdirSync(os.tmpdir()).filter((n) => n.startsWith('dd-sicherung-'));
  assert.deepEqual(nachher, vorher, 'keine temporären Dateien bleiben liegen');
  // Inhalt prüfen: die Sicherung lässt sich öffnen und enthält den Lernstand
  const ziel = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'dd-test-')), 'kopie.sqlite');
  fs.writeFileSync(ziel, r.body);
  const db = oeffneDb(ziel);
  assert.ok(db.prepare('SELECT COUNT(*) AS n FROM fortschritt').get().n > 0);
  db.close();
  fs.rmSync(path.dirname(ziel), { recursive: true, force: true });
});

test('Sicherheits-Review Phase 8: anonyme Anfragen an /api/admin/sicherung verbrauchen das Limit des Superadmins nicht', async () => {
  const { u, admin, s } = await start();
  for (let i = 0; i < 8; i++) assert.equal((await request(u.app).get('/api/admin/sicherung')).status, 401);
  for (let i = 0; i < 3; i++) assert.equal((await s.get('/api/admin/sicherung')).status, 403);
  const r = await admin.get('/api/admin/sicherung').buffer(true).parse((res, cb) => {
    res.on('data', () => {});
    res.on('end', () => cb(null, null));
  });
  assert.equal(r.status, 200, 'Superadmin bekommt die Sicherung trotz fremder Anfragen');
});
