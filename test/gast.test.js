'use strict';
// Gastmodus (Plan Phase 3 Task 10, Spec §7.12, E13, §12.4): Probefall Eisdiele (seed/gast/probefall.json) mit
// Prüfung auf dem Server ohne Speichern, Lösungen nur auf Wunsch bzw. nach dem Lösen, Lehrkraft-Demo (nur lesend),
// Gast-PDF-Whitelist und Validierung des Probefalls (keine echten Aufgaben, jede SQL-Lösung geprüft).

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const request = require('supertest');
const { testApp } = require('./helpers');
const { ladeDatenbanken } = require('../src/sql/datenbanken');
const { erzeugeSandbox } = require('../src/sql/sandbox');
const { erzeugePruefer } = require('../src/sql/pruefer');
const { validiereProbefall } = require('../src/content/validator');
const { erzeugeInhalte } = require('../src/services/inhalte');
const { FALLEN } = require('../src/domain');

const WURZEL = path.join(__dirname, '..');
const PROBEFALL_DATEI = path.join(WURZEL, 'seed', 'gast', 'probefall.json');
const AKTEN_DIR = path.join(WURZEL, 'seed', 'akten');
const probefall = () => JSON.parse(fs.readFileSync(PROBEFALL_DATEI, 'utf8'));
const aktenDateien = () =>
  fs
    .readdirSync(AKTEN_DIR)
    .filter((d) => d.endsWith('.json'))
    .map((d) => ({ name: d, json: fs.readFileSync(path.join(AKTEN_DIR, d), 'utf8') }));

// Echte Sandbox und echter Prüfer, aber nur mit der Eisdiele (schnell).
const datenbanken = ladeDatenbanken(undefined, { namen: ['eisdiele'], log: () => {} });
const sandbox = erzeugeSandbox({
  prozesse: 1,
  datenbanken: { eisdiele: { haupt: datenbanken.haupt('eisdiele'), varianten: datenbanken.varianten('eisdiele') } }
});
const pruefer = erzeugePruefer({ sandbox, schemata: { eisdiele: datenbanken.schema('eisdiele') } });
const umgebung = { datenbanken, sandbox, sqlPruefer: pruefer };
test.after(() => sandbox.beende());

function app(ueberschreiben = {}, optionen = {}) {
  return testApp(ueberschreiben, (db) => ({ datenbanken, sandbox, pruefer, ...(typeof optionen === 'function' ? optionen(db) : optionen) }));
}
const post = (t, pfad, body) => request(t.app).post(pfad).set('Origin', t.konfig.plattformUrl).send(body);

/** Alle Texte (Strings) eines JSON-Werts. */
function texte(wert, out = []) {
  if (typeof wert === 'string') out.push(wert);
  else if (Array.isArray(wert)) wert.forEach((w) => texte(w, out));
  else if (wert && typeof wert === 'object') Object.values(wert).forEach((w) => texte(w, out));
  return out;
}
/** Geheime Texte des Probefalls: Lösungen, Erklärungen, Tipps (ohne Zellwerte, die auch in Tabellen stehen). */
function geheimTexte() {
  const out = [];
  for (const a of probefall().aufgaben) {
    const sichtbar = new Set(texte(a.inhalt)); // z. B. die zu analysierende Abfrage in G-02
    if (a.loesung.sql) out.push(a.loesung.sql);
    if (a.loesung.quelleSql && !sichtbar.has(a.loesung.quelleSql)) out.push(a.loesung.quelleSql);
    for (const t of texte(a.erklaerung)) out.push(t);
    for (const t of a.tipps || []) out.push(t);
  }
  return out.filter((t) => t.length >= 12); // Blocktypen wie „text“ sind kein Geheimnis
}

/* ---------- Seed und Validator ---------- */

test('Probefall: 6 eigene Aufgaben auf der Eisdiele, Mix aus sql (2–3), zeilen, ergebnis, choice', () => {
  const p = probefall();
  assert.equal(p.version, 1);
  assert.equal(p.datenbank, 'eisdiele');
  assert.match(p.titel, /Eisdiele/);
  assert.equal(p.aufgaben.length, 6);
  const arten = p.aufgaben.map((a) => a.interaktion.kind);
  const sql = arten.filter((k) => k === 'sql').length;
  assert.ok(sql >= 2 && sql <= 3, `sql-Aufgaben: ${sql}`);
  for (const k of ['zeilen', 'ergebnis', 'choice']) assert.ok(arten.includes(k), `${k} fehlt`);
  for (const a of p.aufgaben) {
    assert.match(a.id, /^G-\d{2}$/);
    assert.ok(Array.isArray(a.tipps) && a.tipps.length >= 1, `${a.id}: Tipps`);
    assert.ok(Array.isArray(a.erklaerung) && a.erklaerung.length >= 1, `${a.id}: Erklärung`);
  }
});

test('Validator: der Probefall aus dem Seed ist fehlerfrei (jede SQL-Lösung geprüft, keine echten Aufgaben)', async () => {
  const r = await validiereProbefall(probefall(), umgebung, { akten: aktenDateien() });
  assert.deepEqual(r.fehler, []);
  assert.equal(r.aufgaben, 6);
});

test('Validator: lehnt Probefall mit Text oder id aus seed/akten ab', async () => {
  const akte = JSON.parse(aktenDateien()[0].json);
  const echt = akte.aufgaben.find((a) => a.inhalt.some((b) => b.t === 'text' && b.md.length > 40));
  const p = probefall();
  p.aufgaben[0].inhalt = [{ t: 'text', md: echt.inhalt.find((b) => b.t === 'text').md }];
  let r = await validiereProbefall(p, umgebung, { akten: aktenDateien() });
  assert.ok(r.fehler.some((f) => /aus einer Akte|seed\/akten/.test(f.text)), JSON.stringify(r.fehler));

  const q = probefall();
  q.aufgaben[1].id = echt.id;
  r = await validiereProbefall(q, umgebung, { akten: aktenDateien() });
  assert.ok(r.fehler.length > 0);
});

test('Validator: lehnt falsche SQL-Lösung, fremde Datenbank und falsche Anzahl ab', async () => {
  const p = probefall();
  p.aufgaben[0].loesung.sql = "SELECT Name\nFROM Sorte\nWHERE Vegan = ja";
  let r = await validiereProbefall(p, umgebung, { akten: [] });
  assert.ok(r.fehler.some((f) => f.id === 'G-01'), JSON.stringify(r.fehler));

  const q = probefall();
  q.aufgaben[0].interaktion.datenbank = 'fundbuero';
  r = await validiereProbefall(q, umgebung, { akten: [] });
  assert.ok(r.fehler.some((f) => /eisdiele/i.test(f.text)), JSON.stringify(r.fehler));

  const z = probefall();
  z.aufgaben.pop();
  r = await validiereProbefall(z, umgebung, { akten: [] });
  assert.ok(r.fehler.some((f) => /6/.test(f.text)), JSON.stringify(r.fehler));

  const e = probefall();
  e.aufgaben[1].loesung.zeilen[0] = ['Vanille', 1.5];
  r = await validiereProbefall(e, umgebung, { akten: [] });
  assert.ok(r.fehler.some((f) => f.id === 'G-02'), JSON.stringify(r.fehler));
});

/* ---------- Öffentliche Sicht ---------- */

test('GET /api/gast/probefall: öffentliche Sicht ohne Lösungsdaten', async () => {
  const t = app();
  const res = await request(t.app).get('/api/gast/probefall');
  assert.equal(res.status, 200);
  const p = res.body;
  assert.equal(p.titel, 'Probefall Eisdiele Weserstedt');
  assert.equal(p.datenbank, 'eisdiele');
  assert.ok(p.briefing.includes('Pia Wendland'));
  assert.equal(p.aufgaben.length, 6);
  const json = JSON.stringify(p);
  for (const schluessel of ['"loesung"', '"erklaerung"', '"tipps"', '"quelle"', '"quelleSql"', '"varianten"']) {
    assert.ok(!json.includes(schluessel), `${schluessel} in der öffentlichen Sicht`);
  }
  for (const geheim of geheimTexte()) assert.ok(!json.includes(JSON.stringify(geheim).slice(1, -1)), `verrät: ${geheim}`);
  const g1 = p.aufgaben.find((a) => a.id === 'G-01');
  assert.deepEqual(g1.interaktion, { kind: 'sql', datenbank: 'eisdiele', abimodus: 'hinweis' });
  assert.equal(g1.tippsAnzahl, 1);
  assert.equal(p.aufgaben.find((a) => a.id === 'G-04').tippsAnzahl, 2);
  assert.match(res.headers['cache-control'], /no-store|no-cache|max-age/);
});

/* ---------- Prüfen ---------- */

test('Prüfen sql: falsch → Rückmeldung ohne Lösung; richtig → gelöst mit Lösung und Erklärung', async () => {
  const t = app();
  const falsch = await post(t, '/api/gast/aufgaben/G-04/pruefen', {
    antwort: "SELECT Sorte.Name, Verkauf.Kugeln\nFROM Sorte, Verkauf\nWHERE Verkauf.Datum = '2026-07-12'"
  });
  assert.equal(falsch.status, 200);
  assert.equal(falsch.body.ok, false);
  assert.equal(falsch.body.geloest, false);
  assert.ok(Array.isArray(falsch.body.rueckmeldung.diagnose) && falsch.body.rueckmeldung.diagnose.length > 0);
  assert.equal(falsch.body.rueckmeldung.zeilen, 80);
  assert.equal(falsch.body.loesung, undefined);
  for (const geheim of geheimTexte()) assert.ok(!JSON.stringify(falsch.body).includes(JSON.stringify(geheim).slice(1, -1)));

  const richtig = await post(t, '/api/gast/aufgaben/G-04/pruefen', {
    antwort: "SELECT s.Name, v.Kugeln FROM Sorte s, Verkauf v WHERE s.SorteNr = v.SorteNr AND v.Datum = '2026-07-12'"
  });
  assert.equal(richtig.status, 200);
  assert.equal(richtig.body.ok, true);
  assert.equal(richtig.body.geloest, true);
  assert.match(richtig.body.loesung.loesung.sql, /Sorte\.SorteNr = Verkauf\.SorteNr/);
  assert.ok(richtig.body.loesung.erklaerung.length > 0);
});

test('Prüfen sql mit HAVING-Aufgabe und Abimodus-Hinweis (WHERE mit Aggregat)', async () => {
  const t = app();
  const r = await post(t, '/api/gast/aufgaben/G-06/pruefen', {
    antwort:
      'SELECT Sorte.SorteNr, Sorte.Name, SUM(Verkauf.Kugeln * Sorte.Preis)\nFROM Sorte, Verkauf\nWHERE Sorte.SorteNr = Verkauf.SorteNr\nGROUP BY Sorte.SorteNr, Sorte.Name\nHAVING SUM(Verkauf.Kugeln * Sorte.Preis) > 50'
  });
  assert.equal(r.body.ok, true);
});

test('Prüfen choice, zeilen, ergebnis: falsch und richtig', async () => {
  const t = app();
  const faelle = [
    ['G-05', ['a'], ['b']],
    ['G-03', [1], [1, 9]],
    ['G-02', [['Pistazie', '2'], ['Sanddorn-Mango', '1,8'], ['Karamell', '1,8']], [['Pistazie', '2,00'], ['Karamell', '1,80'], ['Sanddorn-Mango', '1.8']]]
  ];
  for (const [id, falsch, richtig] of faelle) {
    const f = await post(t, `/api/gast/aufgaben/${id}/pruefen`, { antwort: falsch });
    assert.equal(f.status, 200, id);
    assert.equal(f.body.ok, false, id);
    assert.equal(f.body.loesung, undefined, id);
    const r = await post(t, `/api/gast/aufgaben/${id}/pruefen`, { antwort: richtig });
    assert.equal(r.body.ok, true, id);
    assert.ok(r.body.loesung, id);
  }
});

test('Prüfen: leere Antwort 400, unbekannte Aufgabe 404, falsche Form 400, ohne Origin 403', async () => {
  const t = app();
  assert.equal((await post(t, '/api/gast/aufgaben/G-01/pruefen', { antwort: '   ' })).status, 400);
  assert.equal((await post(t, '/api/gast/aufgaben/G-99/pruefen', { antwort: 'SELECT 1' })).status, 404);
  assert.equal((await post(t, '/api/gast/aufgaben/A1-E1-01/pruefen', { antwort: ['a'] })).status, 404);
  assert.equal((await post(t, '/api/gast/aufgaben/G-05/pruefen', { antwort: 'x'.repeat(10) })).status, 400);
  const ohne = await request(t.app).post('/api/gast/aufgaben/G-01/pruefen').send({ antwort: 'SELECT 1' });
  assert.equal(ohne.status, 403);
});

test('Prüfen speichert nichts (keine Zeile in der Plattform-DB)', async () => {
  const t = app();
  const zaehle = () =>
    t.db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .reduce((s, { name }) => s + t.db.prepare(`SELECT COUNT(*) AS n FROM "${name}"`).get().n, 0);
  const vorher = zaehle();
  await post(t, '/api/gast/aufgaben/G-01/pruefen', { antwort: 'SELECT Name FROM Sorte' });
  await post(t, '/api/gast/aufgaben/G-01/pruefen', { antwort: "SELECT Name, Preis FROM Sorte WHERE Vegan = 'ja'" });
  await post(t, '/api/gast/aufgaben/G-05/tipp', { nr: 1 });
  await post(t, '/api/gast/aufgaben/G-05/loesung', {});
  assert.equal(zaehle(), vorher);
});

test('Prüfen ohne SQL-Prüfer: sql-Aufgabe 503, andere Aufgaben gehen', async () => {
  const t = testApp();
  assert.equal((await post(t, '/api/gast/aufgaben/G-01/pruefen', { antwort: 'SELECT Name FROM Sorte' })).status, 503);
  assert.equal((await post(t, '/api/gast/aufgaben/G-05/pruefen', { antwort: ['b'] })).body.ok, true);
});

test('Rate-Limit Prüfen je IP (konfigurierbar, Standard 30/min)', async () => {
  const t = app({ rateLimits: { gastPruefen: { max: 2 } } });
  for (let i = 0; i < 2; i++) assert.equal((await post(t, '/api/gast/aufgaben/G-05/pruefen', { antwort: ['a'] })).status, 200);
  const zuViel = await post(t, '/api/gast/aufgaben/G-05/pruefen', { antwort: ['a'] });
  assert.equal(zuViel.status, 429);
  assert.ok(zuViel.headers['retry-after']);
});

/* ---------- Tipp und Lösung ---------- */

test('Tipp nr: liefert genau diesen Tipp; außerhalb des Bereichs 400', async () => {
  const t = app();
  const p = probefall();
  const g4 = p.aufgaben.find((a) => a.id === 'G-04');
  const r1 = await post(t, '/api/gast/aufgaben/G-04/tipp', { nr: 1 });
  assert.equal(r1.status, 200);
  assert.deepEqual(r1.body, { nr: 1, tipp: g4.tipps[0], anzahl: 2 });
  const r2 = await post(t, '/api/gast/aufgaben/G-04/tipp', { nr: 2 });
  assert.equal(r2.body.tipp, g4.tipps[1]);
  assert.equal((await post(t, '/api/gast/aufgaben/G-04/tipp', { nr: 3 })).status, 400);
  assert.equal((await post(t, '/api/gast/aufgaben/G-04/tipp', { nr: 'x' })).status, 400);
});

test('Lösung zeigen: Musterlösung und Erklärung nur auf ausdrücklichen Wunsch', async () => {
  const t = app();
  const r = await post(t, '/api/gast/aufgaben/G-06/loesung', {});
  assert.equal(r.status, 200);
  assert.match(r.body.loesung.sql, /HAVING SUM/);
  assert.ok(r.body.erklaerung.length > 0);
  assert.equal((await request(t.app).get('/api/gast/aufgaben/G-06/loesung')).status, 404);
});

/* ---------- Lehrkraft-Demo ---------- */

test('GET /api/gast/lehrkraft: erfundener Demo-Kurs, nur lesend, ohne Kennungen', async () => {
  const t = app({}, (db) => {
    const inhalte = erzeugeInhalte(db);
    inhalte.laden();
    return { inhalte };
  });
  const r = await request(t.app).get('/api/gast/lehrkraft');
  assert.equal(r.status, 200);
  const d = r.body;
  assert.equal(d.kurs.name, 'Demo-Kurs Inf 12');
  assert.match(d.hinweis, /erfunden/i);
  assert.ok(d.schueler.length >= 6);
  for (const s of d.schueler) {
    assert.match(s.name, /^[A-ZÄÖÜ][a-zäöüß]+ [A-Z]\.$/);
    assert.ok(Number.isInteger(s.punkte) && s.punkte >= 0);
    assert.equal(typeof s.rang, 'string');
  }
  assert.ok(d.ermittlungen.length >= 2, 'Ermittlungen der Akten 1–3');
  assert.deepEqual(d.fallen.map((f) => f.nr), FALLEN.map((f) => f.nr));
  assert.equal(d.probefall.length, 6);
  const json = JSON.stringify(d);
  assert.ok(!/"sub"|s:\d|k:\d/.test(json), 'keine Kennungen');
  // deterministisch
  assert.deepEqual((await request(t.app).get('/api/gast/lehrkraft')).body, d);
  // nur lesend
  assert.equal((await post(t, '/api/gast/lehrkraft', {})).status, 404);
});

test('Lehrkraft-Demo ohne Inhalte: Kurs und Probefall-Statistik, keine Ermittlungen', async () => {
  const t = app();
  const d = (await request(t.app).get('/api/gast/lehrkraft')).body;
  assert.equal(d.kurs.name, 'Demo-Kurs Inf 12');
  assert.deepEqual(d.ermittlungen, []);
  assert.equal(d.probefall.length, 6);
});

/* ---------- Gast-PDF-Whitelist (E13, Spec §12.4) ---------- */

test('Gast-PDF-Whitelist im Repo: materialien/Gast_PDF/verzeichnis.json ist leer', () => {
  const v = JSON.parse(fs.readFileSync(path.join(WURZEL, 'materialien', 'Gast_PDF', 'verzeichnis.json'), 'utf8'));
  assert.deepEqual(v, { dateien: [] });
});

test('GET /gast/material/:datei ohne Whitelist-Eintrag → 404; Liste leer', async () => {
  const t = app();
  for (const datei of ['DD_A1-AB1_Fundbuch.pdf', 'verzeichnis.json', '..%2Fpackage.json']) {
    const r = await request(t.app).get('/gast/material/' + datei);
    assert.equal(r.status, 404, datei);
  }
  assert.deepEqual((await request(t.app).get('/api/gast/material')).body, { dateien: [] });
});

function materialOrdner(eintraege, dateien) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dd-gast-'));
  for (const o of ['Gast_PDF', 'Arbeitsblaetter_PDF', 'Lehrkraft_PDF', 'Loesungen_Portal']) fs.mkdirSync(path.join(dir, o));
  fs.writeFileSync(path.join(dir, 'Gast_PDF', 'verzeichnis.json'), JSON.stringify({ dateien: eintraege }));
  for (const [rel, inhalt] of Object.entries(dateien)) fs.writeFileSync(path.join(dir, rel), inhalt);
  return dir;
}

test('Gast-PDF: nur gelistete Dateien aus erlaubten Ordnern werden ausgeliefert', async (tt) => {
  const dir = materialOrdner(
    [
      { datei: 'DD_A1-AB1_Fundbuch.pdf', ordner: 'Arbeitsblaetter_PDF', titel: 'Arbeitsblatt 1.1 (Demo)', fassung: 'schueler' },
      { datei: 'DD_A1_Lehrerhinweise.pdf', ordner: 'Lehrkraft_PDF', titel: 'Lehrerhinweise Akte 1 (Demo)', fassung: 'lehrkraft' },
      { datei: 'DD_A1-AB1_LSG.pdf', ordner: 'Loesungen_Portal', titel: 'Lösung', fassung: 'lehrkraft' },
      { datei: '../geheim.pdf', ordner: 'Arbeitsblaetter_PDF', titel: 'böse', fassung: 'schueler' },
      { datei: 'fehlt.pdf', ordner: 'Arbeitsblaetter_PDF', titel: 'fehlt', fassung: 'schueler' }
    ],
    {
      'Arbeitsblaetter_PDF/DD_A1-AB1_Fundbuch.pdf': '%PDF-1.4 Demo',
      'Arbeitsblaetter_PDF/DD_A1-AB2_Nicht_gelistet.pdf': '%PDF-1.4 nein',
      'Lehrkraft_PDF/DD_A1_Lehrerhinweise.pdf': '%PDF-1.4 Lehrkraft',
      'Loesungen_Portal/DD_A1-AB1_LSG.pdf': '%PDF-1.4 Lösung'
    }
  );
  tt.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const t = app({}, { gastOptionen: { materialVerzeichnis: dir } });

  const ab = await request(t.app).get('/gast/material/DD_A1-AB1_Fundbuch.pdf');
  assert.equal(ab.status, 200);
  assert.match(ab.headers['content-type'], /application\/pdf/);
  assert.equal(ab.body.toString(), '%PDF-1.4 Demo');
  assert.equal((await request(t.app).get('/gast/material/DD_A1_Lehrerhinweise.pdf')).status, 200);
  for (const datei of ['DD_A1-AB2_Nicht_gelistet.pdf', 'DD_A1-AB1_LSG.pdf', 'geheim.pdf', 'fehlt.pdf', 'verzeichnis.json']) {
    assert.equal((await request(t.app).get('/gast/material/' + datei)).status, 404, datei);
  }
  const liste = (await request(t.app).get('/api/gast/material')).body;
  assert.deepEqual(
    liste.dateien.map((d) => d.datei),
    ['DD_A1-AB1_Fundbuch.pdf', 'DD_A1_Lehrerhinweise.pdf']
  );
  assert.equal(liste.dateien[0].url, '/gast/material/DD_A1-AB1_Fundbuch.pdf');
  assert.equal(liste.dateien[1].fassung, 'lehrkraft');
});

/* ---------- Seite ---------- */

test('/gast: Probefall-Seite mit Konsole, Hinweis „Nichts wird gespeichert“, Lehrkraft-Demo, gast.js', async () => {
  const t = app();
  const r = await request(t.app).get('/gast');
  assert.equal(r.status, 200);
  assert.match(r.text, /Nichts wird gespeichert/i);
  assert.match(r.text, /Lehrkraft-Ansicht \(Demo\)/);
  assert.match(r.text, /\/static\/js\/gast\.js\?v=/);
  assert.match(r.text, /id="sql-eingabe"/);
  assert.match(r.text, /href="\/sso\/start"/);
  assert.match(r.text, /href="\/themen"/);
  assert.ok(!/Probefall Eisdiele folgt/.test(r.text));
});
