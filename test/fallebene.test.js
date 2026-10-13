'use strict';
// Fallebene (Plan Phase 6 Task 2, Spec §7.7, E10, STORY §4.8/§6/§7): Schlussplädoyer (Format, Validator, Indizien erst
// nach dem Lösen), Steckbrief-Regel E10, Beweisstücke der gewonnenen Verhöre, Pinnwand-API (Rechte, Lösungsfreiheit)
// und die Seite /pinnwand.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const request = require('supertest');
const H = require('./hilfen_lernen');
const { testApp, meldeAn } = require('./helpers');
const P = require('../src/content/plaedoyer');
const FE = require('../src/services/fallebene');

const { K17, K18 } = H;
const PW = K17 + '/pinnwand';
const A = (id) => `${K17}/aufgaben/${id}`;
const SEED = path.join(__dirname, '..', 'seed', 'fallebene.json');
const seed = () => JSON.parse(fs.readFileSync(SEED, 'utf8'));

const beispiel = H.beispiel();
const A9E1 = beispiel.levels.find((l) => l.id === 'A9-E1');
const PL = A9E1.plaedoyer;
const LOESUNG = (id) => beispiel.aufgaben.find((a) => a.id === id).loesung.sql;
const aufgabenMap = () => new Map(beispiel.aufgaben.map((a) => [a.id, a]));

/** Testdaten der Fallebene mit Akte 9 (Beispielakte hat ein Verhör) und Akten 1, 2, 5, 6. */
function testDaten() {
  return {
    version: 1,
    beweisstuecke: [
      { akte: 1, titel: 'Fundbuch-Seite', bild: 'fundbuch', text: 'Geheimer Polaroid-Text eins.' },
      { akte: 5, titel: 'Ermittlungsnetz', bild: 'netz', text: 'Geheimer Polaroid-Text fünf.' },
      { akte: 9, titel: 'Probe-Beweis', bild: 'bon', text: 'Geheimer Polaroid-Text neun.', notiz: 'Geheime Notiz neun.' }
    ],
    steckbrief: {
      felder: [
        { id: 'signatur', titel: 'Signatur' },
        { id: 'jahrgang', titel: 'Jahrgang' },
        { id: 'name', titel: 'Name' }
      ],
      hinweise: [
        { akte: 1, eintraege: [{ feld: 'signatur', text: 'Hinweis-Signatur-Eins' }] },
        { akte: 2, eintraege: [{ feld: 'jahrgang', text: 'Hinweis-Jahrgang-Zwei' }] },
        { akte: 5, eintraege: [{ feld: 'signatur', text: 'Hinweis-Signatur-Fuenf' }] },
        { akte: 9, auchNachPlaedoyer: 'A9-E1', stempel: 'Enttarnt', eintraege: [{ feld: 'jahrgang', text: 'Hinweis-Jahrgang-Neun', ersetzt: true }, { feld: 'name', text: 'Hinweis-Name-Neun' }] }
      ]
    }
  };
}

async function start({ daten = testDaten(), einst = { akten: [9], niveau: 'eA' } } = {}) {
  const u = H.umgebung({ optionen: { fallebene: daten } });
  const s = await H.client(u, H.SCHUELERIN);
  const l = await H.client(u, H.LEHRKRAFT);
  const admin = await H.client(u, H.SUPERADMIN);
  const fremd = await H.client(u, H.FREMD);
  H.einstellen(u.db, 'k:17', einst);
  H.einstellen(u.db, 'k:18', einst);
  return { u, s, l, admin, fremd };
}

function verhoerGewinnen(db, sub, akte, punkte = 6, max = 10) {
  db.prepare(
    "INSERT INTO verhoer_versuche (sub, kurs_id, akte, aufgaben_json, beginn, ende, punkte, max) VALUES (?, 'k:17', ?, '[]', '2026-10-01T10:00:00Z', '2026-10-01T10:10:00Z', ?, ?)"
  ).run(sub, akte, punkte, max);
}

const enthaelt = (body, text) => JSON.stringify(body).includes(text);

/* ---------- Format und Validator ---------- */

test('pruefePlaedoyer: Plädoyer der Beispielakte ist gültig', () => {
  assert.deepEqual(P.pruefePlaedoyer(PL, A9E1, aufgabenMap()), []);
});

test('pruefePlaedoyer: Schritte existieren, sind sql, stehen in der Reihenfolge der Ermittlung; Indizien passen', () => {
  const pruefe = (p) => P.pruefePlaedoyer(p, A9E1, aufgabenMap());
  const mit = (aenderung) => ({ ...structuredClone(PL), ...aenderung });
  const hat = (fehler, muster) => assert.ok(fehler.some((t) => muster.test(t)), `${muster} fehlt: ${JSON.stringify(fehler)}`);
  hat(pruefe(mit({ schritte: ['A9-E1-02', 'A9-E2-01'], indizien: { 'A9-E1-02': 'x', 'A9-E2-01': 'y' } })), /nicht in den Aufgaben dieser Ermittlung/);
  hat(pruefe(mit({ schritte: ['A9-E1-01'], indizien: { 'A9-E1-01': 'x' } })), /sql-Aufgabe/);
  hat(pruefe(mit({ schritte: ['A9-E1-03', 'A9-E1-02'] })), /Reihenfolge/);
  hat(pruefe(mit({ schritte: ['A9-E1-02', 'A9-E1-02'] })), /doppelt/);
  hat(pruefe(mit({ schritte: [] })), /schritte .*fehlt/);
  hat(pruefe(mit({ indizien: { 'A9-E1-02': 'nur eins' } })), /fehlt das Indiz/);
  hat(pruefe(mit({ indizien: { ...PL.indizien, 'A9-E1-04': 'zu viel' } })), /kein Schritt/);
  hat(pruefe(mit({ aufloesung: '' })), /aufloesung/);
  hat(pruefe(mit({ aufloesung: 'Text mit <b>HTML</b>' })), /HTML/);
  hat(pruefe(mit({ ueberleitung: 'Lücke [[x]]' })), /Lücken/);
  hat(pruefe(mit({ geheim: 1 })), /unbekanntes Feld/);
  hat(P.pruefePlaedoyer('x', A9E1, aufgabenMap()), /Objekt/);
});

test('Validator: kaputtes Plädoyer in einer Akte ist ein Fehler (validiereAkten)', async () => {
  const { ladeDatenbanken } = require('../src/sql/datenbanken');
  const { erzeugeSandbox } = require('../src/sql/sandbox');
  const { erzeugePruefer } = require('../src/sql/pruefer');
  const { validiereAkten } = require('../src/content/validator');
  const datenbanken = ladeDatenbanken(undefined, { log: () => {} });
  const roh = {};
  const schemata = {};
  for (const n of datenbanken.namen) {
    roh[n] = { haupt: datenbanken.haupt(n), varianten: datenbanken.varianten(n) };
    schemata[n] = datenbanken.schema(n);
  }
  const sandbox = erzeugeSandbox({ prozesse: 2, datenbanken: roh });
  try {
    const umgebung = { datenbanken, sandbox, sqlPruefer: erzeugePruefer({ sandbox, schemata }) };
    const gut = await validiereAkten([{ name: 'akte_beispiel.json', json: H.beispiel() }], umgebung);
    assert.deepEqual(gut.fehler.filter((f) => /plaedoyer/.test(f.text)), []);
    const json = H.beispiel();
    json.levels[0].plaedoyer.schritte = ['A9-E1-01'];
    const r = await validiereAkten([{ name: 'akte_beispiel.json', json }], umgebung);
    assert.ok(r.fehler.some((f) => /Ermittlung A9-E1: plaedoyer/.test(f.text)), JSON.stringify(r.fehler));
  } finally {
    sandbox.beende();
  }
});

test('Seed seed/fallebene.json ist gültig: sieben Beweisstücke, Hinweise für Akten 1–7 nach STORY §4.8', () => {
  const r = FE.pruefeFallebene(seed());
  assert.deepEqual(r.fehler, []);
  const d = seed();
  assert.deepEqual(d.beweisstuecke.map((b) => b.akte), [1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(d.beweisstuecke.map((b) => b.titel), ['Fundbuch-Seite', 'Schloss-Code', 'Kassenbon', 'Vereinsausweis', 'Ermittlungsnetz', 'Steckbrief', 'Detektei-Lizenz']);
  assert.deepEqual(d.steckbrief.hinweise.map((x) => x.akte), [1, 2, 3, 4, 5, 6, 7]);
  const name = d.steckbrief.hinweise.find((x) => x.akte === 6).eintraege.find((e) => e.feld === 'name');
  assert.match(name.text, /Merle Falkenrath/);
  assert.equal(d.steckbrief.hinweise.find((x) => x.akte === 7).stempel, 'Fall abgeschlossen');
});

test('pruefeFallebene: Fehler für Format, unbekanntes Bild/Feld, doppelte Akte, Markdown', () => {
  const hat = (d, muster) => {
    const f = FE.pruefeFallebene(d).fehler;
    assert.ok(f.some((t) => muster.test(t)), `${muster} fehlt: ${JSON.stringify(f)}`);
  };
  const d = () => testDaten();
  hat('x', /Objekt/);
  hat({ ...d(), version: 2 }, /version/);
  let x = d();
  x.beweisstuecke[0].bild = 'foto';
  hat(x, /bild/);
  x = d();
  x.beweisstuecke[1].akte = 1;
  hat(x, /doppelt/);
  x = d();
  x.beweisstuecke[0].text = '<i>x</i>';
  hat(x, /HTML/);
  x = d();
  x.steckbrief.hinweise[0].eintraege[0].feld = 'schuhgroesse';
  hat(x, /unbekanntes Feld/);
  x = d();
  x.steckbrief.felder.push({ id: 'signatur', titel: 'nochmal' });
  hat(x, /doppelt/);
  x = d();
  x.steckbrief.hinweise[3].auchNachPlaedoyer = 'A9';
  hat(x, /auchNachPlaedoyer/);
  x = d();
  x.beweisstuecke[0].akte = 0;
  hat(x, /akte/);
  x = d();
  x.beweisstuecke[0].geheim = true;
  hat(x, /unbekanntes Feld/);
});

test('ladeFallebene: Standarddatei laden; fehlende oder ungültige Datei → null mit Protokoll', () => {
  assert.equal(FE.ladeFallebene().version, 1);
  const zeilen = [];
  assert.equal(FE.ladeFallebene(path.join(__dirname, 'fixtures', 'gibt-es-nicht.json'), { log: (z) => zeilen.push(z) }), null);
  assert.ok(zeilen.length > 0);
});

/* ---------- Katalog und Lern-API ---------- */

test('Katalog: Ermittlung behält das Plädoyer (Schritte bereinigt)', () => {
  const u = H.umgebung();
  const l = u.inhalte.ermittlung('A9-E1');
  assert.deepEqual(l.plaedoyer.schritte, ['A9-E1-02', 'A9-E1-03']);
  assert.equal(l.plaedoyer.titel, 'Probe-Plädoyer');
  assert.equal(u.inhalte.ermittlung('A9-E2').plaedoyer, null);
});

test('Lern-API: Indiz erst nach dem Lösen des Schritts, Auflösung erst nach dem letzten Schritt', async () => {
  const { s } = await start();
  // vorher: weder Indiz noch Auflösung in Ermittlung und Aufgabe
  const e0 = (await s.get(K17 + '/ermittlungen/A9-E1')).body;
  assert.equal(e0.ermittlung.plaedoyer.titel, 'Probe-Plädoyer');
  assert.deepEqual(e0.ermittlung.plaedoyer.schritte.map((x) => [x.nr, x.id, x.status]), [[1, 'A9-E1-02', 'offen'], [2, 'A9-E1-03', 'offen']]);
  const a0 = (await s.get(A('A9-E1-02'))).body;
  assert.deepEqual(a0.plaedoyer, { titel: 'Probe-Plädoyer', nr: 1, anzahl: 2, erledigt: 0, abgeschlossen: false });
  for (const b of [e0, a0]) {
    for (const t of [...Object.values(PL.indizien), PL.aufloesung, PL.ueberleitung]) assert.equal(enthaelt(b, t), false, t);
  }
  // keine Plädoyer-Angaben an anderen Aufgaben
  assert.equal((await s.get(A('A9-E1-01'))).body.plaedoyer, undefined);

  // Schritt 1 lösen → Indiz 1 in der Prüf-Antwort, Auflösung noch nicht
  const r1 = (await s.post(A('A9-E1-02') + '/pruefen', { antwort: LOESUNG('A9-E1-02') })).body;
  assert.equal(r1.geloest, true);
  assert.equal(r1.plaedoyer.indiz, PL.indizien['A9-E1-02']);
  assert.equal(r1.plaedoyer.aufloesung, undefined);
  assert.equal(enthaelt(r1, PL.indizien['A9-E1-03']), false);
  const e1 = (await s.get(K17 + '/ermittlungen/A9-E1')).body.ermittlung.plaedoyer;
  assert.equal(e1.schritte[0].indiz, PL.indizien['A9-E1-02']);
  assert.equal(e1.schritte[1].indiz, undefined);
  assert.equal(e1.aufloesung, undefined);

  // falscher Versuch an Schritt 2: nichts
  const f = (await s.post(A('A9-E1-03') + '/pruefen', { antwort: 'SELECT 1' })).body;
  assert.equal(f.ok, false);
  assert.equal(enthaelt(f, PL.indizien['A9-E1-03']), false);

  // Schritt 2 per „Lösung zeigen“ → Indiz 2, Auflösung und Überleitung
  const r2 = (await s.post(A('A9-E1-03') + '/loesung-zeigen')).body;
  assert.equal(r2.plaedoyer.indiz, PL.indizien['A9-E1-03']);
  assert.equal(r2.plaedoyer.aufloesung, PL.aufloesung);
  assert.equal(r2.plaedoyer.ueberleitung, PL.ueberleitung);
  const e2 = (await s.get(K17 + '/ermittlungen/A9-E1')).body.ermittlung.plaedoyer;
  assert.equal(e2.abgeschlossen, true);
  assert.equal(e2.aufloesung, PL.aufloesung);
  const a2 = (await s.get(A('A9-E1-02'))).body.plaedoyer;
  assert.equal(a2.aufloesung, PL.aufloesung);
});

test('Lern-API: Ermittlung ohne Plädoyer liefert plaedoyer null', async () => {
  const { s } = await start();
  assert.equal((await s.get(K17 + '/ermittlungen/A9-E2')).body.ermittlung.plaedoyer, null);
});

/* ---------- Pinnwand-API: Rechte ---------- */

test('Pinnwand-API Rechte: anonym 401, ungültige Kurs-ID 400, fremder/unbekannter Kurs 403, eigener Kurs 200', async () => {
  const { u, s, l, admin, fremd } = await start();
  assert.equal((await request(u.app).get(PW)).status, 401);
  assert.equal((await s.get('/api/kurse/17/pinnwand')).status, 400);
  assert.equal((await s.get(K18 + '/pinnwand')).status, 403);
  assert.equal((await fremd.get(PW)).status, 403);
  assert.equal((await s.get('/api/kurse/' + encodeURIComponent('k:999') + '/pinnwand')).status, 403);
  assert.equal((await l.get(K18 + '/pinnwand')).status, 403, 'Lehrkraft fremder Kurs');
  for (const c of [s, l, admin]) {
    const r = await c.get(PW);
    assert.equal(r.status, 200);
    assert.equal(r.headers['cache-control'], 'no-store');
    assert.equal(r.body.kurs.id, 'k:17');
  }
  assert.equal((await fremd.get(K18 + '/pinnwand')).status, 200);
  // gesperrter Kurs: Schüler 403, Lehrkraft lesend
  u.db.prepare("UPDATE kurse SET aktiv = 0 WHERE kurs_id = 'k:17'").run();
  assert.equal((await s.get(PW)).status, 403);
  assert.equal((await l.get(PW)).status, 200);
  // nur GET
  const post = await request(u.app).post(PW).set('Cookie', s.cookie).set('Origin', u.konfig.plattformUrl).send({});
  assert.equal(post.status, 404);
});

test('Pinnwand-API ohne Inhalte: Route fehlt (404)', async () => {
  const t = testApp();
  const cookie = await meldeAn(t, H.SCHUELERIN);
  assert.equal((await request(t.app).get(PW).set('Cookie', cookie)).status, 404);
});

/* ---------- Pinnwand-API: Beweisstücke, Steckbrief E10, Plädoyer ---------- */

test('Pinnwand: ohne Fortschritt nur leere Polaroids und „unbekannt“ – keine Story-Texte (Lösungsfreiheit)', async () => {
  const { s } = await start();
  const b = (await s.get(PW)).body;
  assert.deepEqual(b.beweisstuecke, [
    { akte: 1, verhoer: 'Verhör 1', gewonnen: false },
    { akte: 5, verhoer: 'Verhör 5', gewonnen: false },
    { akte: 9, verhoer: 'Verhör 9', gewonnen: false }
  ]);
  assert.deepEqual(b.steckbrief.felder.map((f) => [f.id, f.titel, f.eintraege]), [['signatur', 'Signatur', []], ['jahrgang', 'Jahrgang', []], ['name', 'Name', []]]);
  assert.equal(b.steckbrief.hinweise, 0);
  assert.equal(b.steckbrief.gesamt, 4);
  assert.equal(b.steckbrief.stempel, null);
  assert.equal(b.plaedoyer.frei, true);
  assert.equal(b.plaedoyer.erledigt, 0);
  const texte = ['Geheim', 'Hinweis-', 'Fundbuch-Seite', 'Ermittlungsnetz', 'Probe-Beweis', ...Object.values(PL.indizien), PL.aufloesung, PL.ueberleitung];
  for (const t of texte) assert.equal(enthaelt(b, t), false, t);
});

test('Pinnwand E10: Hinweis einer Akte nach gewonnenem Verhör (≥ 50 %) oder wenn eine spätere Akte freigeschaltet ist', async () => {
  const { u, s } = await start({ einst: { akten: [1, 9], niveau: 'eA' } });
  // verlorenes Verhör (< 50 %) zählt nicht
  verhoerGewinnen(u.db, 's:1042', 9, 4, 10);
  let b = (await s.get(PW)).body;
  assert.equal(b.beweisstuecke.find((x) => x.akte === 9).gewonnen, false);
  assert.equal(b.steckbrief.hinweise, 0, 'Akte 9 ist keine Akte des Plans – ihre Freischaltung deckt nichts auf');
  // gewonnen → Polaroid mit Text, Notiz und Erkenntnis; Hinweis 9 sichtbar (ersetzt nichts Sichtbares), Stempel
  verhoerGewinnen(u.db, 's:1042', 9, 5, 10);
  b = (await s.get(PW)).body;
  const p9 = b.beweisstuecke.find((x) => x.akte === 9);
  assert.deepEqual(p9, {
    akte: 9,
    verhoer: 'Verhör 9',
    gewonnen: true,
    titel: 'Probe-Beweis',
    bild: 'bon',
    text: 'Geheimer Polaroid-Text neun.',
    notiz: 'Geheime Notiz neun.',
    erkenntnis: ['Hinweis-Jahrgang-Neun', 'Hinweis-Name-Neun']
  });
  assert.equal(b.steckbrief.hinweise, 1);
  assert.equal(b.steckbrief.stempel, 'Enttarnt');
  assert.deepEqual(b.steckbrief.felder.find((f) => f.id === 'name').eintraege, [{ akte: 9, text: 'Hinweis-Name-Neun' }]);
  assert.equal(enthaelt(b, 'Hinweis-Signatur-Eins'), false);
  // nächste Akte (2) freigeschaltet → Hinweis 1 sichtbar; Hinweis 2 noch nicht; „ersetzt“ verdrängt ältere Einträge
  H.einstellen(u.db, 'k:17', { akten: [1, 2, 9] });
  b = (await s.get(PW)).body;
  assert.deepEqual(b.steckbrief.felder.find((f) => f.id === 'signatur').eintraege, [{ akte: 1, text: 'Hinweis-Signatur-Eins' }]);
  assert.equal(enthaelt(b, 'Hinweis-Jahrgang-Zwei'), false);
  H.einstellen(u.db, 'k:17', { akten: [1, 2, 3, 9] });
  b = (await s.get(PW)).body;
  assert.deepEqual(b.steckbrief.felder.find((f) => f.id === 'jahrgang').eintraege, [{ akte: 9, text: 'Hinweis-Jahrgang-Neun' }], 'Akte 9 ersetzt Akte 2');
  // Polaroid 1 bleibt leer (Verhör 1 nicht gewonnen), auch wenn der Hinweis sichtbar ist
  assert.equal(b.beweisstuecke.find((x) => x.akte === 1).gewonnen, false);
  // Mitschüler sieht nichts davon (Verhöre je Konto)
  const s2 = await H.client(u, H.SCHUELER2);
  const b2 = (await s2.get(PW)).body;
  assert.equal(b2.beweisstuecke.find((x) => x.akte === 9).gewonnen, false);
});

test('Pinnwand: Hinweis mit auchNachPlaedoyer erscheint nach dem abgeschlossenen Plädoyer; Indizienkette und Auflösung', async () => {
  const { s } = await start();
  await s.post(A('A9-E1-02') + '/pruefen', { antwort: LOESUNG('A9-E1-02') });
  let b = (await s.get(PW)).body;
  assert.equal(b.plaedoyer.ermittlung.id, 'A9-E1');
  assert.equal(b.plaedoyer.akte.nr, 9);
  assert.deepEqual(b.plaedoyer.schritte.map((x) => x.indiz), [PL.indizien['A9-E1-02'], undefined]);
  assert.equal(b.plaedoyer.aufloesung, undefined);
  assert.equal(enthaelt(b, 'Hinweis-Name-Neun'), false);
  await s.post(A('A9-E1-03') + '/pruefen', { antwort: LOESUNG('A9-E1-03') });
  b = (await s.get(PW)).body;
  assert.equal(b.plaedoyer.abgeschlossen, true);
  assert.equal(b.plaedoyer.aufloesung, PL.aufloesung);
  assert.equal(b.plaedoyer.ueberleitung, PL.ueberleitung);
  assert.deepEqual(b.steckbrief.felder.find((f) => f.id === 'name').eintraege, [{ akte: 9, text: 'Hinweis-Name-Neun' }]);
  assert.equal(b.steckbrief.stempel, 'Enttarnt');
  // das Polaroid gibt es trotzdem erst nach dem Verhör
  assert.equal(b.beweisstuecke.find((x) => x.akte === 9).gewonnen, false);
});

test('Pinnwand: Plädoyer einer nicht freigeschalteten Akte zeigt dem Schüler nur „gesperrt“; Lehrkraft sieht die Kette', async () => {
  const { s, l } = await start({ einst: { akten: [1], niveau: 'eA' } });
  const b = (await s.get(PW)).body;
  assert.deepEqual(b.plaedoyer, { frei: false, akte: { nr: 9 } });
  const lb = (await l.get(PW)).body;
  assert.equal(lb.plaedoyer.frei, true);
  assert.equal(lb.plaedoyer.schritte.length, 2);
});

test('Pinnwand gA: kein Polaroid für Akte 5 (nur eA); Hinweis 5 erscheint, sobald Akte 6 freigeschaltet ist', async () => {
  const { u, s } = await start({ einst: { akten: [1, 9], niveau: 'gA' } });
  let b = (await s.get(PW)).body;
  assert.deepEqual(b.beweisstuecke.map((x) => x.akte), [1, 9]);
  assert.equal(enthaelt(b, 'Hinweis-Signatur-Fuenf'), false);
  H.einstellen(u.db, 'k:17', { akten: [1, 6, 9] });
  b = (await s.get(PW)).body;
  assert.ok(enthaelt(b, 'Hinweis-Signatur-Fuenf'));
});

test('Pinnwand mit dem echten Seed: Steckbrief-Felder aus STORY §4.8, alle sieben Polaroids im eA-Kurs', async () => {
  const u = H.umgebung();
  const s = await H.client(u, H.SCHUELERIN);
  H.einstellen(u.db, 'k:17', { akten: [1, 2], niveau: 'eA' });
  const b = (await s.get(PW)).body;
  assert.deepEqual(b.beweisstuecke.map((x) => x.akte), [1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(b.steckbrief.felder.map((f) => f.id), ['signatur', 'tarnname', 'jahrgang', 'wohnort', 'gewohnheiten', 'netzwerk', 'name']);
  assert.equal(b.steckbrief.hinweise, 1, 'Akte 2 freigeschaltet → Hinweis der Akte 1');
  assert.deepEqual(b.steckbrief.felder.find((f) => f.id === 'signatur').eintraege, [{ akte: 1, text: 'Nachtfalter, Initialen „N. F.“' }]);
  assert.equal(enthaelt(b, 'Merle'), false);
  assert.equal(enthaelt(b, 'Nora Falter'), false);
});

/* ---------- Seite /pinnwand ---------- */

test('/pinnwand: ohne Sitzung 302 zur Anmeldung, angemeldet 200 mit Seitenmodul (alle Rollen)', async () => {
  const t = testApp();
  const res = await request(t.app).get('/pinnwand');
  assert.equal(res.status, 302);
  assert.equal(res.headers.location, '/sso/start?ziel=' + encodeURIComponent('/pinnwand'));
  for (const nutzer of [H.SCHUELERIN, H.LEHRKRAFT, H.SUPERADMIN]) {
    const t2 = testApp();
    const cookie = await meldeAn(t2, nutzer);
    const r = await request(t2.app).get('/pinnwand').set('Cookie', cookie);
    assert.equal(r.status, 200);
    assert.equal(r.headers['cache-control'], 'no-cache');
    assert.match(r.text, /<script type="module" src="\/static\/js\/lernen\/pinnwand\.js\?v=/);
    assert.match(r.text, /\/static\/css\/pinnwand\.css\?v=/);
    assert.match(r.text, /id="seite"/);
  }
  const cookie = await meldeAn(t, H.SCHUELERIN);
  for (const p of ['/pinnwand.html', '/pinnwand/1']) assert.equal((await request(t.app).get(p).set('Cookie', cookie)).status, 404, p);
});

test('Stadtplan und Ermittlung verlinken die Pinnwand; Skripte nur mit Textknoten', () => {
  const js = (d) => fs.readFileSync(path.join(__dirname, '..', 'public', 'static', 'js', 'lernen', d), 'utf8');
  assert.match(js('stadtplan.js'), /\/pinnwand/);
  assert.match(js('stadtplan.js'), /\/pinnwand'\)/, 'Stadtplan holt die Pinnwand-API');
  assert.match(js('ermittlung.js'), /plaedoyer/);
  assert.match(js('ermittlung.js'), /\/pinnwand/);
  for (const d of ['pinnwand.js', 'stadtplan.js', 'ermittlung.js']) assert.doesNotMatch(js(d), /innerHTML|outerHTML|insertAdjacentHTML|document\.write/, d);
  const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'pinnwand.html'), 'utf8');
  assert.match(html, /href="\/pinnwand" aria-current="page"/);
});
