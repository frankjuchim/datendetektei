'use strict';
// Live-Modus (Plan Phase 6 Task 6, Spec §7.10/§7.14, Review Focus 1 und 2): Runden nur im RAM, Rechte je Rolle,
// Duell (Richtigkeit + Zeitbonus, Rangliste), Escape Room (Code serverseitig aus der Lösung, nur an das lösende Team,
// Code-Eingabe öffnet die nächste Station, falscher Code abgelehnt, Tipp-Umschlag mit Zeitstrafe, gA-Ersatzstation),
// SSE (Kopfzeilen, Herzschlag, Aufräumen), Ende verwirft alles, Verbund-Löschung. Uhr über konfig.jetzt; SQL über Stub.
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const request = require('supertest');
const { ladeDatenbanken } = require('../src/sql/datenbanken');
const { ladeLiveInhalte } = require('../src/content/live');
const { verbundToken } = require('./helpers');
const H = require('./hilfen_lernen');

const { K17, K18 } = H;
const LIVE = ladeLiveInhalte({ datenbanken: ladeDatenbanken(undefined, { log: () => {} }) });
const CODES = Object.fromEntries(LIVE.escape.stationen.map((s) => [s.id, s.code]));
const SQL = (id) => LIVE.escape.stationen.find((s) => s.id === id).aufgabe.loesung.sql;
const MIN = 60 * 1000;

const SCHUELER3 = { sub: 's:1044', rolle: 'schueler', name: 'Ida W.', kurse: [{ id: 'k:17', name: 'Inf-LK 12', rolle: 'mitglied' }] };
const LEHRKRAFT_FREMD = { sub: 'l:8', rolle: 'lehrkraft', name: 'Herr T.', kurse: [{ id: 'k:18', name: 'Inf-GK 12', rolle: 'lehrkraft' }] };

async function start(opt = {}) {
  const uhr = { t: Date.now() };
  const u = H.umgebung({ optionen: { liveInhalte: LIVE }, konfig: { jetzt: () => uhr.t, ...(opt.konfig || {}) } });
  const l = await H.client(u, H.LEHRKRAFT);
  const s1 = await H.client(u, H.SCHUELERIN);
  const s2 = await H.client(u, H.SCHUELER2);
  const s3 = await H.client(u, SCHUELER3);
  H.einstellen(u.db, 'k:17', { niveau: opt.niveau || 'eA' });
  return { u, uhr, l, s1, s2, s3, live: u.app.locals.live };
}

async function runde(e, body) {
  const r = await e.l.post(`${K17}/live`, body);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  return r.body;
}
const R = (id, rest = '') => `/api/live/${id}${rest}`;

/* ---------- Rechte ---------- */

test('Live-Runde starten: anonym 401, Schüler 403, fremde Lehrkraft 403, eigene Lehrkraft und Superadmin 200', async () => {
  const e = await start();
  const anonym = await request(e.u.app).post(`${K17}/live`).set('Origin', e.u.konfig.plattformUrl).send({ modus: 'duell' });
  assert.equal(anonym.status, 401);
  assert.equal((await e.s1.post(`${K17}/live`, { modus: 'duell' })).status, 403);
  const fremd = await H.client(e.u, LEHRKRAFT_FREMD);
  assert.equal((await fremd.post(`${K17}/live`, { modus: 'duell' })).status, 403);
  assert.equal((await fremd.get(`${K17}/live/inhalte`)).status, 403);
  assert.equal((await e.s1.get(`${K17}/live/inhalte`)).status, 403);
  const r = await e.l.post(`${K17}/live`, { modus: 'duell' });
  assert.equal(r.status, 200);
  assert.equal(r.body.modus, 'duell');
  assert.match(r.body.id, /^[A-Za-z0-9_-]{12}$/);
  // eine laufende Runde je Kurs
  assert.equal((await e.l.post(`${K17}/live`, { modus: 'escape' })).status, 409);
  const admin = await H.client(e.u, H.SUPERADMIN);
  assert.equal((await admin.post(`${K18}/live`, { modus: 'duell' })).status, 200);
});

test('Ungültige Starts: Modus, unbekannte Aufgabe, Optionen außerhalb der Grenzen → 400', async () => {
  const e = await start();
  for (const body of [{ modus: 'quiz' }, {}, { modus: 'duell', aufgaben: ['A1-E1-01'] }, { modus: 'duell', aufgaben: 'K2-L-01' },
    { modus: 'escape', dauerMin: 500 }, { modus: 'escape', teams: 40 }, { modus: 'duell', zeitSek: 5 }]) {
    assert.equal((await e.l.post(`${K17}/live`, body)).status, 400, JSON.stringify(body));
  }
});

test('Inhalte für die Lehrkraft: Pool und Stationen ohne Lösungen; gA-Kurs ohne Akte-5-Aufgaben', async () => {
  const e = await start({ niveau: 'gA' });
  const r = await e.l.get(`${K17}/live/inhalte`);
  assert.equal(r.status, 200);
  assert.equal(r.body.pool.length, 17);
  assert.ok(r.body.pool.every((a) => a.akte !== 5 && a.id && a.titel && a.zeitSek <= 90 && !('loesung' in a)));
  assert.deepEqual(r.body.escape.stationen.map((s) => s.id), ['S1', 'S2', 'S3', 'S4', 'S5g', 'S6']);
  assert.ok(!JSON.stringify(r.body).includes('"loesung"'));
});

test('Zutritt: fremder Kurs kein Zutritt (Zustand, Beitritt, SSE), Lehrkräfte treten nicht bei, ungültige Runde 404', async () => {
  const e = await start();
  const r = await runde(e, { modus: 'duell' });
  const fremd = await H.client(e.u, H.FREMD);
  assert.equal((await fremd.get(R(r.id))).status, 403);
  assert.equal((await fremd.post(R(r.id, '/beitreten'), {})).status, 403);
  assert.equal((await fremd.get(R(r.id, '/ereignisse'))).status, 403);
  const fremdeLehrkraft = await H.client(e.u, LEHRKRAFT_FREMD);
  assert.equal((await fremdeLehrkraft.post(R(r.id, '/steuerung'), { aktion: 'ende' })).status, 403);
  assert.equal((await e.l.post(R(r.id, '/beitreten'), {})).status, 403);
  assert.equal((await e.s1.post(R(r.id, '/steuerung'), { aktion: 'ende' })).status, 403);
  assert.equal((await e.s1.get(R('AAAAAAAAAAAA'))).status, 404);
  assert.equal((await e.s1.get('/api/live/kurz')).status, 404);
  assert.equal((await request(e.u.app).get(R(r.id))).status, 401);
  // Kurs-Abfrage: aktuelle Runde für Mitglieder, nicht für Fremde
  const k = await e.s1.get(`${K17}/live`);
  assert.equal(k.status, 200);
  assert.equal(k.body.runde.id, r.id);
  assert.equal((await fremd.get(`${K17}/live`)).status, 403);
});

/* ---------- Duell ---------- */

test('Duell: Aufgabe freischalten, alle antworten, Punkte = Richtigkeit + Zeitbonus, Rangliste mit Anzeigenamen', async () => {
  const e = await start();
  const r = await runde(e, { modus: 'duell', aufgaben: ['K2-L-01', 'K2-L-04'] });
  assert.equal(r.duell.liste.length, 2);
  for (const s of [e.s1, e.s2, e.s3]) assert.equal((await s.post(R(r.id, '/beitreten'), {})).status, 200);
  // vor dem Freischalten keine Aufgabe
  let z = (await e.s1.get(R(r.id))).body;
  assert.equal(z.status, 'wartet');
  assert.equal(z.duell.aufgabe, null);
  assert.equal((await e.s1.post(R(r.id, '/antwort'), { aufgabe: 'K2-L-01', antwort: ['b'] })).status, 409);

  assert.equal((await e.l.post(R(r.id, '/steuerung'), { aktion: 'naechste' })).status, 200);
  z = (await e.s1.get(R(r.id))).body;
  assert.equal(z.status, 'laeuft');
  assert.equal(z.duell.aufgabe.id, 'K2-L-01');
  assert.ok(!JSON.stringify(z).includes('"loesung"') && !JSON.stringify(z).includes('"richtig"'));
  assert.equal(z.duell.frage.offen, true);

  e.uhr.t += 9000; // nach 9 von 45 s
  const a1 = await e.s1.post(R(r.id, '/antwort'), { aufgabe: 'K2-L-01', antwort: ['b'] });
  assert.equal(a1.status, 200);
  assert.deepEqual(a1.body, { gespeichert: true });
  assert.equal((await e.s1.post(R(r.id, '/antwort'), { aufgabe: 'K2-L-01', antwort: ['b'] })).status, 409, 'nur eine Antwort');
  e.uhr.t += 9000; // nach 18 s
  assert.equal((await e.s2.post(R(r.id, '/antwort'), { aufgabe: 'K2-L-01', antwort: ['b'] })).status, 200);
  assert.equal((await e.s3.post(R(r.id, '/antwort'), { aufgabe: 'K2-L-01', antwort: ['a'] })).status, 200);
  assert.equal((await e.s3.post(R(r.id, '/antwort'), { aufgabe: 'K2-L-04', antwort: ['a'] })).status, 409, 'nur die offene Aufgabe');
  // Lehrkraft sieht den Stand der Antworten (ohne Antworttexte) und die Lösung
  const st = (await e.l.get(R(r.id))).body;
  assert.equal(st.duell.frage.antworten, 3);
  assert.ok(st.duell.loesungKurz);
  // Ergebnis erst nach dem Schließen
  assert.equal((await e.s1.get(R(r.id))).body.duell.frage.ergebnis, null);
  assert.equal((await e.l.post(R(r.id, '/steuerung'), { aktion: 'schliessen' })).status, 200);
  const z1 = (await e.s1.get(R(r.id))).body.duell;
  const z2 = (await e.s2.get(R(r.id))).body.duell;
  const z3 = (await e.s3.get(R(r.id))).body.duell;
  assert.equal(z1.frage.ergebnis.ok, true);
  assert.equal(z1.frage.ergebnis.punkte, 100 + Math.round((100 * 36) / 45));
  assert.equal(z2.frage.ergebnis.punkte, 100 + Math.round((100 * 27) / 45));
  assert.deepEqual(z3.frage.ergebnis, { ok: false, punkte: 0 });
  assert.deepEqual(z1.rangliste.map((x) => [x.platz, x.name]), [[1, 'Lena K.'], [2, 'Mika R.'], [3, 'Ida W.']]);
  assert.ok(z1.rangliste.every((x) => !('sub' in x)));
  assert.equal(z1.platz, 1);
  // nach Ablauf der Zeit: keine Antwort mehr (2. Aufgabe, 40 s + 2 s Kulanz)
  assert.equal((await e.l.post(R(r.id, '/steuerung'), { aktion: 'naechste' })).status, 200);
  e.uhr.t += 43000;
  assert.equal((await e.s2.post(R(r.id, '/antwort'), { aufgabe: 'K2-L-04', antwort: ['a'] })).status, 409);
  e.live.tick();
  assert.equal((await e.s2.get(R(r.id))).body.duell.frage.offen, false, 'Ticker schließt die Frage');
  assert.equal((await e.l.post(R(r.id, '/steuerung'), { aktion: 'naechste' })).status, 409, 'keine weitere Aufgabe');
  // Live bringt keine Lab-Punkte
  assert.equal(e.u.db.prepare('SELECT COUNT(*) AS n FROM fortschritt').get().n, 0);
});

test('Duell: Antworten werden geprüft, Formfehler 400, Antwort zu groß 413, ohne Beitritt 409', async () => {
  const e = await start();
  const r = await runde(e, { modus: 'duell', aufgaben: ['K2-L-03'] });
  await e.l.post(R(r.id, '/steuerung'), { aktion: 'naechste' });
  assert.equal((await e.s1.post(R(r.id, '/antwort'), { aufgabe: 'K2-L-03', antwort: 'SELECT 1' })).status, 409, 'ohne Beitritt');
  await e.s1.post(R(r.id, '/beitreten'), {});
  assert.equal((await e.s1.post(R(r.id, '/antwort'), { aufgabe: 'K2-L-03', antwort: ['SELECT'] })).status, 400);
  assert.equal((await e.s1.post(R(r.id, '/antwort'), { aufgabe: 'K2-L-03', antwort: 'x'.repeat(30000) })).status, 413);
  const sql = LIVE.pool.get('K2-L-03').loesung.sql;
  assert.equal((await e.s1.post(R(r.id, '/antwort'), { aufgabe: 'K2-L-03', antwort: sql })).status, 200);
  await e.l.post(R(r.id, '/steuerung'), { aktion: 'schliessen' });
  assert.equal((await e.s1.get(R(r.id))).body.duell.frage.ergebnis.ok, true);
});

/* ---------- Escape Room ---------- */

/** Liefert alle JSON-Texte, die ein Konto bei einer Folge von Anfragen sieht. */
const texte = [];
const merke = (res) => {
  texte.push(JSON.stringify(res.body));
  return res;
};

test('Escape: Code nur nach richtiger Lösung und nur an das Team, Code-Eingabe öffnet die nächste Station', async () => {
  const e = await start();
  const r = await runde(e, { modus: 'escape', teams: 4 });
  assert.deepEqual(r.escape.stationen.map((s) => s.id), ['S1', 'S2', 'S3', 'S4', 'S5', 'S6']);
  assert.deepEqual(r.escape.stationen.map((s) => s.code), ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'].map((id) => CODES[id]), 'Lehrkraft sieht die Codes');
  assert.equal((await e.s1.post(R(r.id, '/beitreten'), { team: 9 })).status, 400);
  for (const [s, team] of [[e.s1, 1], [e.s3, 1], [e.s2, 2]]) assert.equal((await s.post(R(r.id, '/beitreten'), { team })).status, 200);
  texte.length = 0;
  // vor „los“: keine Station
  let z = merke(await e.s1.get(R(r.id))).body;
  assert.equal(z.status, 'wartet');
  assert.equal(z.escape.team.station, null);
  assert.equal((await e.s1.post(R(r.id, '/antwort'), { antwort: SQL('S1') })).status, 409);
  assert.equal((await e.l.post(R(r.id, '/steuerung'), { aktion: 'los' })).status, 200);

  z = merke(await e.s1.get(R(r.id))).body;
  assert.equal(z.escape.team.station.nr, 1);
  assert.equal(z.escape.team.station.aufgabe.id, 'K2-S1');
  assert.equal(z.escape.team.geloest, false);
  assert.ok(!('code' in z.escape.team));
  // falsche Antwort: kein Code
  const f = merke(await e.s1.post(R(r.id, '/antwort'), { antwort: 'SELECT Bezeichnung FROM Fundsache' }));
  assert.equal(f.status, 200);
  assert.equal(f.body.ok, false);
  assert.ok(!('code' in f.body));
  // Team 2 sieht vor dem eigenen Lösen nie einen Code
  const blick = merke(await e.s2.get(R(r.id)));
  for (const t of texte) for (const c of Object.values(CODES)) if (c.length >= 3) assert.ok(!t.includes(c), `Code ${c} im Client vor dem Lösen`);
  assert.ok(!JSON.stringify(blick.body).includes('"code"'));
  // richtige Antwort: Code an Team 1
  const ok = await e.s1.post(R(r.id, '/antwort'), { antwort: SQL('S1') });
  assert.deepEqual(ok.body, { ok: true, code: CODES.S1 });
  assert.equal((await e.s3.get(R(r.id))).body.escape.team.code, CODES.S1, 'auch das zweite Teammitglied');
  const t2 = JSON.stringify((await e.s2.get(R(r.id))).body);
  assert.ok(!t2.includes(CODES.S1) && !t2.includes('"code"'), 'Team 2 bekommt den Code nicht');
  const beamer = JSON.stringify((await e.l.get(R(r.id) + '?sicht=beamer')).body);
  for (const c of Object.values(CODES)) if (c.length >= 3) assert.ok(!beamer.includes(c), 'kein Code auf dem Beamer');
  // falscher Code wird abgelehnt
  const falsch = await e.s1.post(R(r.id, '/code'), { code: '999' });
  assert.equal(falsch.status, 200);
  assert.equal(falsch.body.ok, false);
  assert.equal((await e.s1.get(R(r.id))).body.escape.team.station.nr, 1);
  // Code von Team 1 öffnet Station 2 – mit Leerzeichen eingegeben
  const richtig = await e.s1.post(R(r.id, '/code'), { code: ` ${CODES.S1.split('').join(' ')} ` });
  assert.equal(richtig.body.ok, true);
  z = (await e.s3.get(R(r.id))).body;
  assert.equal(z.escape.team.station.nr, 2);
  assert.equal(z.escape.team.geloest, false);
  assert.ok(!('code' in z.escape.team));
  assert.ok(!JSON.stringify(z).includes(CODES.S2));
  // Fortschritt je Team für alle sichtbar, ohne Codes
  assert.deepEqual(z.escape.fortschritt.map((x) => [x.team, x.geloest]), [[1, 1], [2, 0]]);
  // Code-Eingabe ohne Lösen ist erlaubt (das Schloss kennt nur den Code), aber Raten wird gebremst
  for (let i = 0; i < 5; i++) assert.equal((await e.s2.post(R(r.id, '/code'), { code: String(100 + i) })).body.ok, false);
  assert.equal((await e.s2.post(R(r.id, '/code'), { code: CODES.S1 })).status, 429);
  e.uhr.t += 61000;
  assert.equal((await e.s2.post(R(r.id, '/code'), { code: CODES.S1 })).body.ok, true);
  assert.equal((await e.s2.post(R(r.id, '/code'), { code: 'abc' })).status, 400);
});

test('Escape: alle Stationen bis zum Tresor, Rangliste der Teams, gA-Kurs mit Ersatzstation S5g', async () => {
  const e = await start({ niveau: 'gA' });
  const r = await runde(e, { modus: 'escape' });
  assert.deepEqual(r.escape.stationen.map((s) => s.id), ['S1', 'S2', 'S3', 'S4', 'S5g', 'S6']);
  await e.s1.post(R(r.id, '/beitreten'), { team: 3 });
  await e.l.post(R(r.id, '/steuerung'), { aktion: 'los' });
  for (const s of r.escape.stationen) {
    const res = await e.s1.post(R(r.id, '/code'), { code: CODES[s.id] });
    assert.equal(res.body.ok, true, s.id);
  }
  const z = (await e.s1.get(R(r.id))).body;
  assert.equal(z.escape.team.fertig, true);
  assert.ok(z.escape.team.abschluss);
  assert.equal(z.escape.fortschritt[0].fertig, true);
  assert.equal((await e.s1.post(R(r.id, '/antwort'), { antwort: 'x' })).status, 409);
});

test('Escape: Tipp-Umschlag erst nach Freigabe bzw. tippNachMin, Zeitstrafe 2 Minuten einmal je Station', async () => {
  const e = await start();
  const r = await runde(e, { modus: 'escape', tippNachMin: 10 });
  await e.s1.post(R(r.id, '/beitreten'), { team: 1 });
  await e.l.post(R(r.id, '/steuerung'), { aktion: 'los' });
  assert.equal((await e.s1.get(R(r.id))).body.escape.team.tippVerfuegbar, false);
  assert.equal((await e.s1.post(R(r.id, '/tipp'), {})).status, 403);
  e.uhr.t += 10 * MIN;
  assert.equal((await e.s1.get(R(r.id))).body.escape.team.tippVerfuegbar, true);
  const t = await e.s1.post(R(r.id, '/tipp'), {});
  assert.equal(t.status, 200);
  assert.equal(t.body.tipp, LIVE.escape.stationen[0].aufgabe.tipps[0]);
  await e.s1.post(R(r.id, '/tipp'), {});
  const z = (await e.s1.get(R(r.id))).body.escape.team;
  assert.equal(z.strafeMin, 2);
  assert.equal(z.tipp, t.body.tipp);
  // Station 2: Freigabe durch die Lehrkraft für alle
  await e.s1.post(R(r.id, '/code'), { code: CODES.S1 });
  assert.equal((await e.s1.post(R(r.id, '/tipp'), {})).status, 403);
  await e.l.post(R(r.id, '/steuerung'), { aktion: 'tippsFrei', an: true });
  assert.equal((await e.s1.post(R(r.id, '/tipp'), {})).status, 200);
  assert.equal((await e.s1.get(R(r.id))).body.escape.team.strafeMin, 4);
});

test('Escape: Countdown – nach Ablauf keine Antworten und Codes, Lehrkraft kann verlängern', async () => {
  const e = await start();
  const r = await runde(e, { modus: 'escape', dauerMin: 10 });
  await e.s1.post(R(r.id, '/beitreten'), { team: 1 });
  await e.l.post(R(r.id, '/steuerung'), { aktion: 'los' });
  const ende = Date.parse((await e.s1.get(R(r.id))).body.escape.ende);
  assert.equal(ende, e.uhr.t + 10 * MIN);
  e.uhr.t += 11 * MIN;
  e.live.tick();
  assert.equal((await e.s1.get(R(r.id))).body.status, 'abgelaufen');
  assert.equal((await e.s1.post(R(r.id, '/code'), { code: CODES.S1 })).status, 409);
  assert.equal((await e.l.post(R(r.id, '/steuerung'), { aktion: 'verlaengern', min: 5 })).status, 200);
  assert.equal((await e.s1.get(R(r.id))).body.status, 'laeuft');
  assert.equal((await e.s1.post(R(r.id, '/code'), { code: CODES.S1 })).body.ok, true);
});

/* ---------- Ende ---------- */

test('Ende verwirft alle Antworten, zeigt das Ergebnis kurz und löscht die Runde nach der Frist', async () => {
  const e = await start();
  const r = await runde(e, { modus: 'duell', aufgaben: ['K2-L-01'] });
  await e.s1.post(R(r.id, '/beitreten'), {});
  await e.l.post(R(r.id, '/steuerung'), { aktion: 'naechste' });
  await e.s1.post(R(r.id, '/antwort'), { aufgabe: 'K2-L-01', antwort: ['b'] });
  assert.equal(e.live.intern(r.id).antworten.size, 1);
  const ende = await e.l.post(R(r.id, '/steuerung'), { aktion: 'ende' });
  assert.equal(ende.status, 200);
  const intern = e.live.intern(r.id);
  assert.equal(intern.antworten.size, 0, 'Antworten verworfen');
  assert.equal(intern.status, 'beendet');
  const z = (await e.s1.get(R(r.id))).body;
  assert.equal(z.status, 'beendet');
  assert.deepEqual(z.ergebnis.rangliste.map((x) => x.name), ['Lena K.']);
  assert.equal((await e.s1.post(R(r.id, '/antwort'), { aufgabe: 'K2-L-01', antwort: ['b'] })).status, 409);
  // neue Runde im Kurs möglich, Statistik behält nur die Teilnehmerzahl
  const k = (await e.l.get(`${K17}/live`)).body;
  assert.equal(k.runde, null);
  assert.deepEqual(k.statistik.map((x) => [x.modus, x.teilnehmer]), [['duell', 1]]);
  e.uhr.t += 3 * MIN;
  e.live.tick();
  assert.equal((await e.s1.get(R(r.id))).status, 404);
  assert.equal(e.live.intern(r.id), null);
  // Nichts davon liegt in der Plattform-DB
  const tabellen = e.u.db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((x) => x.name);
  assert.ok(!tabellen.some((n) => /live/i.test(n)));
});

test('Verbund-Löschauftrag: Konto verlässt alle Runden, Kurs beendet und löscht seine Runde', async () => {
  const e = await start();
  const r = await runde(e, { modus: 'escape' });
  await e.s1.post(R(r.id, '/beitreten'), { team: 1 });
  await e.s2.post(R(r.id, '/beitreten'), { team: 1 });
  const post = (body) =>
    request(e.u.app)
      .post('/api/verbund/loeschen')
      .set('Authorization', 'Bearer ' + verbundToken(e.u.schluessel, e.u.konfig, 'loeschen'))
      .send(body);
  assert.equal((await post({ sub: 's:1042' })).status, 200);
  const z = (await e.l.get(R(r.id))).body;
  assert.deepEqual(z.teilnehmer.map((x) => x.name), ['Mika R.']);
  assert.equal((await post({ kurs: 'k:17' })).status, 200);
  assert.equal(e.live.intern(r.id), null);
});

/* ---------- SSE ---------- */

/** Öffnet /ereignisse über echtes HTTP; sammelt Ereignisse. */
function abonniere(basis, pfad, cookie) {
  return new Promise((resolve, reject) => {
    const ereignisse = [];
    const req = http.get(basis + pfad, { headers: { Cookie: cookie, Accept: 'text/event-stream' } }, (res) => {
      let puffer = '';
      const wartende = [];
      const abo = {
        res,
        ereignisse,
        req,
        geschlossen: false,
        warte(name, n = 1) {
          return new Promise((ok, nein) => {
            const pruefe = () => ereignisse.filter((x) => x.name === name).length >= n;
            if (pruefe()) return ok(ereignisse.filter((x) => x.name === name)[n - 1]);
            const t = setTimeout(() => nein(new Error(`kein Ereignis ${name} (${n})`)), 3000);
            wartende.push(() => {
              if (!pruefe()) return false;
              clearTimeout(t);
              ok(ereignisse.filter((x) => x.name === name)[n - 1]);
              return true;
            });
          });
        },
        zu: new Promise((ok) => res.on('end', () => {
          abo.geschlossen = true;
          ok();
        }))
      };
      res.setEncoding('utf8');
      res.on('data', (d) => {
        puffer += d;
        let i;
        while ((i = puffer.indexOf('\n\n')) >= 0) {
          const block = puffer.slice(0, i);
          puffer = puffer.slice(i + 2);
          const name = (/^event: (.*)$/m.exec(block) || [])[1] || (block.startsWith(':') ? 'kommentar' : 'message');
          const daten = (/^data: (.*)$/m.exec(block) || [])[1];
          ereignisse.push({ name, daten: daten ? JSON.parse(daten) : null, roh: block });
          for (let k = wartende.length - 1; k >= 0; k--) if (wartende[k]()) wartende.splice(k, 1);
        }
      });
      resolve(abo);
    });
    req.on('error', reject);
  });
}

test('SSE: Kopfzeilen, erster Zustand, Aktualisierung, Herzschlag, getrennte Sichten, Ende schließt und räumt auf', async () => {
  const e = await start();
  const server = e.u.app.listen(0, '127.0.0.1');
  await new Promise((ok) => server.once('listening', ok));
  const basis = `http://127.0.0.1:${server.address().port}`;
  try {
    const r = await runde(e, { modus: 'escape' });
    await e.s1.post(R(r.id, '/beitreten'), { team: 1 });
    await e.s2.post(R(r.id, '/beitreten'), { team: 2 });
    const a1 = await abonniere(basis, R(r.id, '/ereignisse'), e.s1.cookie);
    const a2 = await abonniere(basis, R(r.id, '/ereignisse'), e.s2.cookie);
    const lk = await abonniere(basis, R(r.id, '/ereignisse'), e.l.cookie);
    const bm = await abonniere(basis, R(r.id, '/ereignisse?sicht=beamer'), e.l.cookie);
    assert.equal(a1.res.statusCode, 200);
    assert.match(a1.res.headers['content-type'], /^text\/event-stream/);
    assert.equal(a1.res.headers['cache-control'], 'no-store');
    assert.equal(a1.res.headers['x-accel-buffering'], 'no');
    const erst = await a1.warte('zustand');
    assert.equal(erst.daten.ich.team, 1);
    assert.equal((await lk.warte('zustand')).daten.sicht, 'steuerung');
    assert.equal((await bm.warte('zustand')).daten.sicht, 'beamer');
    assert.equal(e.live.verbindungen(r.id), 4);

    await e.l.post(R(r.id, '/steuerung'), { aktion: 'los' });
    assert.equal((await a1.warte('zustand', 2)).daten.escape.team.station.nr, 1);
    await e.s1.post(R(r.id, '/antwort'), { antwort: SQL('S1') });
    const mitCode = await a1.warte('zustand', 3);
    assert.equal(mitCode.daten.escape.team.code, CODES.S1);
    await a2.warte('zustand', 3);
    for (const x of [...a2.ereignisse, ...bm.ereignisse]) assert.ok(!x.roh.includes(CODES.S1), 'Code nur an Team 1');

    // Herzschlag (alle 20 s; hier direkt ausgelöst)
    e.live.herzschlag();
    await a1.warte('kommentar');

    // Client trennt → Verbindung wird entfernt
    a2.req.destroy();
    await new Promise((ok) => setTimeout(ok, 100));
    assert.equal(e.live.verbindungen(r.id), 3);

    // Ende: Ereignis „ende“, Verbindungen geschlossen
    await e.l.post(R(r.id, '/steuerung'), { aktion: 'ende' });
    const ende = await a1.warte('ende');
    assert.equal(ende.daten.status, 'beendet');
    await Promise.all([a1.zu, lk.zu, bm.zu]);
    assert.equal(e.live.verbindungen(r.id), 0);
    // Abo einer beendeten Runde: nur „ende“, dann zu
    const spaet = await abonniere(basis, R(r.id, '/ereignisse'), e.s1.cookie);
    await spaet.warte('ende');
    await spaet.zu;
  } finally {
    server.closeAllConnections();
    await new Promise((ok) => server.close(ok));
  }
});

/* ---------- Seiten ---------- */

test('Seiten: /live (alle Rollen, sonst Anmeldung), /lehrkraft/live und /live/:runde/beamer nur Lehrkraft', async () => {
  const e = await start();
  const anonym = await request(e.u.app).get('/live');
  assert.equal(anonym.status, 302);
  for (const c of [e.s1, e.l]) {
    const s = await c.get('/live');
    assert.equal(s.status, 200);
    assert.match(s.text, /\/static\/js\/live\/schueler\.js\?v=/);
    assert.match(s.text, /\/static\/css\/live\.css\?v=/);
  }
  assert.equal((await e.s1.get('/lehrkraft/live')).status, 403);
  const st = await e.l.get('/lehrkraft/live');
  assert.equal(st.status, 200);
  assert.match(st.text, /\/static\/js\/live\/lehrkraft-seite\.js\?v=/);
  assert.equal((await e.s1.get('/live/AAAAAAAAAAAA/beamer')).status, 403);
  const b = await e.l.get('/live/AAAAAAAAAAAA/beamer');
  assert.equal(b.status, 200);
  assert.match(b.text, /<html lang="de" data-theme="dark"/);
  assert.match(b.text, /\/static\/js\/live\/beamer\.js\?v=/);
  assert.equal((await e.l.get('/live/zu-kurz/beamer')).status, 404);
});

test('Niveau der Runde folgt immer dem Kurs: gA-Kurs mit niveau eA im Body → S5g, keine Akte-5-Aufgaben', async () => {
  const e = await start({ niveau: 'gA' });
  const r = await runde(e, { modus: 'escape', niveau: 'eA' });
  assert.equal(r.optionen.niveau, 'gA');
  const st = await e.l.get(R(r.id));
  assert.ok(!JSON.stringify(st.body).includes('"S5"'), 'keine eA-Station S5');
  await e.l.post(R(r.id, '/steuerung'), { aktion: 'ende' });
  const duell = await e.l.post(`${K17}/live`, { modus: 'duell', niveau: 'eA', aufgaben: ['K2-L-15'] });
  assert.equal(duell.status, 400, 'Akte-5-Aufgabe im gA-Kurs nicht startbar');
});

test('Sicherheits-Review Phase 8: Team-Wechsel umgeht die Code-Bremse nicht (5 falsche Codes je Konto und Minute)', async () => {
  const e = await start();
  const r = await runde(e, { modus: 'escape', teams: 6 });
  assert.equal((await e.s1.post(R(r.id, '/beitreten'), { team: 1 })).status, 200);
  assert.equal((await e.s2.post(R(r.id, '/beitreten'), { team: 1 })).status, 200);
  await e.l.post(R(r.id, '/steuerung'), { aktion: 'los' });
  for (let i = 0; i < 5; i++) assert.equal((await e.s1.post(R(r.id, '/code'), { code: String(10 + i) })).body.ok, false);
  assert.equal((await e.s1.post(R(r.id, '/code'), { code: '20' })).status, 429);
  // In ein leeres Team wechseln und weiterraten: weiterhin gebremst
  assert.equal((await e.s1.post(R(r.id, '/beitreten'), { team: 2 })).status, 200);
  const nachWechsel = await e.s1.post(R(r.id, '/code'), { code: CODES.S1 });
  assert.equal(nachWechsel.status, 429, 'Bremse gilt auch nach dem Team-Wechsel');
  assert.ok(nachWechsel.headers['retry-after']);
  // Ein anderes Mitglied des ersten Teams bleibt durch die Team-Bremse gebremst (bisheriges Verhalten)
  assert.equal((await e.s2.post(R(r.id, '/code'), { code: CODES.S1 })).status, 429);
  e.uhr.t += 61000;
  assert.equal((await e.s1.post(R(r.id, '/code'), { code: CODES.S1 })).body.ok, true);
});

test('Probelauf 8: Doppelklick auf „Nächste Aufgabe“ überspringt keine Aufgabe (nach = gesehene Nummer, sonst 409)', async () => {
  const e = await start();
  const r = await runde(e, { modus: 'duell', aufgaben: ['K2-L-01', 'K2-L-04', 'K2-L-09'] });
  // Doppelklick auf „Erste Aufgabe freischalten“: beide Anfragen tragen nach = 0
  assert.equal((await e.l.post(R(r.id, '/steuerung'), { aktion: 'naechste', nach: 0 })).status, 200);
  const doppelt = await e.l.post(R(r.id, '/steuerung'), { aktion: 'naechste', nach: 0 });
  assert.equal(doppelt.status, 409);
  assert.match(doppelt.body.error, /schon/);
  let z = (await e.l.get(R(r.id))).body;
  assert.equal(z.duell.frage.nr, 1);
  assert.equal(z.duell.frage.offen, true, 'Aufgabe 1 bleibt offen');
  // regulär weiter mit der gesehenen Nummer
  assert.equal((await e.l.post(R(r.id, '/steuerung'), { aktion: 'naechste', nach: 1 })).status, 200);
  assert.equal((await e.l.post(R(r.id, '/steuerung'), { aktion: 'naechste', nach: 1 })).status, 409);
  z = (await e.l.get(R(r.id))).body;
  assert.equal(z.duell.frage.nr, 2);
  for (const nach of ['x', -1, 1.5]) assert.equal((await e.l.post(R(r.id, '/steuerung'), { aktion: 'naechste', nach })).status, 400, String(nach));
});

test('Probelauf 8 (Entscheidung): Bremse für falsche Escape-Antworten – 10 je Team und Minute, zusätzlich je Konto', async () => {
  const e = await start();
  const r = await runde(e, { modus: 'escape', teams: 6 });
  assert.equal((await e.s1.post(R(r.id, '/beitreten'), { team: 1 })).status, 200);
  assert.equal((await e.s2.post(R(r.id, '/beitreten'), { team: 1 })).status, 200);
  assert.equal((await e.s3.post(R(r.id, '/beitreten'), { team: 3 })).status, 200);
  await e.l.post(R(r.id, '/steuerung'), { aktion: 'los' });
  const FALSCH = { antwort: 'SELECT Bezeichnung FROM Fundsache' };
  // 10 falsche Antworten des Teams (verteilt auf zwei Konten) werden normal geprüft
  for (let i = 0; i < 10; i++) {
    const a = await (i % 2 ? e.s2 : e.s1).post(R(r.id, '/antwort'), FALSCH);
    assert.equal(a.status, 200, `Antwort ${i + 1}`);
    assert.equal(a.body.ok, false);
  }
  // die 11. ist gebremst – auch eine richtige (sonst ließe sich trotz Bremse weiterprobieren)
  const gebremst = await e.s1.post(R(r.id, '/antwort'), FALSCH);
  assert.equal(gebremst.status, 429);
  assert.match(gebremst.body.error, /falsche Antworten/);
  assert.equal(gebremst.body.bremse, true, 'die Seite zeigt den Text des Servers');
  assert.ok(Number(gebremst.headers['retry-after']) >= 1 && Number(gebremst.headers['retry-after']) <= 60);
  const richtigGebremst = await e.s2.post(R(r.id, '/antwort'), { antwort: SQL('S1') });
  assert.equal(richtigGebremst.status, 429);
  assert.ok(!('code' in richtigGebremst.body));
  // keine Wertung: Station, Lösestand, Zeitstrafe unverändert
  let team = (await e.s1.get(R(r.id))).body.escape.team;
  assert.equal(team.station.nr, 1);
  assert.equal(team.geloest, false);
  assert.ok(!('code' in team));
  // andere Teams sind nicht betroffen
  const anderes = await e.s3.post(R(r.id, '/antwort'), FALSCH);
  assert.equal(anderes.status, 200);
  // Team-Wechsel umgeht die Bremse nicht: s1 (5 eigene Falschantworten) wechselt in ein leeres Team …
  assert.equal((await e.s1.post(R(r.id, '/beitreten'), { team: 2 })).status, 200);
  for (let i = 0; i < 5; i++) assert.equal((await e.s1.post(R(r.id, '/antwort'), FALSCH)).status, 200);
  // … und ist nach insgesamt 10 eigenen Falschantworten auch dort gebremst
  const nachWechsel = await e.s1.post(R(r.id, '/antwort'), FALSCH);
  assert.equal(nachWechsel.status, 429, 'Bremse je Konto gilt auch nach dem Team-Wechsel');
  assert.ok(nachWechsel.headers['retry-after']);
  // nach gut einer Minute wieder frei
  e.uhr.t += 61000;
  const ok = await e.s2.post(R(r.id, '/antwort'), { antwort: SQL('S1') });
  assert.equal(ok.status, 200);
  assert.deepEqual(ok.body, { ok: true, code: CODES.S1 });
  assert.equal((await e.s1.post(R(r.id, '/antwort'), FALSCH)).status, 200);
  team = (await e.s2.get(R(r.id))).body.escape.team;
  assert.equal(team.code, CODES.S1);
});

test('Probelauf 8 (Entscheidung): richtige Escape-Antworten zählen nicht zur Bremse; Ende verwirft die Zähler', async () => {
  const e = await start();
  const r = await runde(e, { modus: 'escape', teams: 6 });
  assert.equal((await e.s1.post(R(r.id, '/beitreten'), { team: 1 })).status, 200);
  await e.l.post(R(r.id, '/steuerung'), { aktion: 'los' });
  const FALSCH = { antwort: 'SELECT Bezeichnung FROM Fundsache' };
  for (let i = 0; i < 9; i++) assert.equal((await e.s1.post(R(r.id, '/antwort'), FALSCH)).status, 200);
  // richtige Antwort und erneutes Abholen des Codes zählen nicht
  assert.equal((await e.s1.post(R(r.id, '/antwort'), { antwort: SQL('S1') })).body.ok, true);
  assert.equal((await e.s1.post(R(r.id, '/antwort'), { antwort: SQL('S1') })).body.ok, true);
  assert.equal((await e.s1.post(R(r.id, '/code'), { code: CODES.S1 })).body.ok, true);
  // Station 2: die 10. Falschantwort geht noch, die 11. nicht (Fenster gilt stationsübergreifend)
  assert.equal((await e.s1.post(R(r.id, '/antwort'), FALSCH)).status, 200);
  assert.equal((await e.s1.post(R(r.id, '/antwort'), FALSCH)).status, 429);
  // Zähler nur im RAM der Runde: beim Ende verworfen
  await e.l.post(R(r.id, '/steuerung'), { aktion: 'ende' });
  assert.equal(e.live.intern(r.id).falscheAntwortenKonto.size, 0);
});
