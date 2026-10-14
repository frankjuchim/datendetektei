'use strict';
// E2E-Probelauf der Abnahme Phase 6 (Plan Task 11, Review Focus 5): ein Testkurs k:17 mit Lehrkraft und drei
// Schülerinnen/Schülern, nur echte Inhalte (seed/akten, seed/live, seed/fallebene.json), echte Sandbox und echter
// SQL-Prüfer, echte Materialien. Die Schritte bauen aufeinander auf (gleicher Server, gleiche DB):
//  1. Lehrkraft schaltet in den Einstellungen die Akten 2–7 und die Kür frei.
//  2. Schüler:innen lösen Aufgaben (API wie der Browser); Mika löst im Browser Spur 1 des Schlussplädoyers (Indiz).
//  3. Lena spielt Verhör 6 im Browser (Start, Antworten, Abgabe) und gewinnt; ihre Pinnwand zeigt Polaroid 6, die
//     vollständige Indizienkette, die Auflösung und den Steckbrief mit Name/Motiv; Akte 7 mit Verhör 7 ist offen.
//  4. Lehrkraft: Auswertung (Matrix, Fallen-Profil), CSV ohne sub, Vorschau mit Lösung, Board (1920 × 1080 mit
//     Rangliste), Urkunden (PDF mit 3 Seiten), alle Reiter.
//  5. Live-Duell mit allen drei Schüler:innen und Beamer, Ende.
//  6. Ida bearbeitet K1-E1-01 in der Schreib-Konsole der Kür.
// Je Zustand: keine CSP-Meldungen, keine Skriptfehler, kein horizontales Scrollen (1440, 1024, 375).
// SCREENSHOTS=1 → docs/screenshots/phase6/probelauf_*.png (hell und dunkel; Board 1920 dunkel).

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const request = require('supertest');
const { chromium } = require('playwright-core');
const { starteTestServer } = require('./testserver');
const { musterantwort } = require('../../src/content/pruefer');

const CHROMIUM = require('./chromium').chromiumPfad();
const FOTOS = process.env.SCREENSHOTS === '1';
const FOTO_ORDNER = process.env.SCREENSHOT_ORDNER || path.join(__dirname, '..', '..', 'docs', 'screenshots', 'phase6');
const BREITEN = [[1440, 900], [1024, 768], [375, 812]];

const KURS = [{ id: 'k:17', name: 'Inf-LK 12', rolle: 'mitglied' }];
const LEHRKRAFT = { sub: 'l:7', rolle: 'lehrkraft', name: 'Frau M.', kurse: [{ id: 'k:17', name: 'Inf-LK 12', rolle: 'lehrkraft' }] };
const LENA = { sub: 's:1042', rolle: 'schueler', name: 'Lena K.', kurse: KURS };
const MIKA = { sub: 's:1043', rolle: 'schueler', name: 'Mika R.', kurse: KURS };
const IDA = { sub: 's:1044', rolle: 'schueler', name: 'Ida W.', kurse: KURS };
const K17 = '/api/kurse/' + encodeURIComponent('k:17');
const ERMITTLER = 'CREATE TABLE Ermittler (\n  ErmittlerNr INTEGER PRIMARY KEY,\n  Name TEXT NOT NULL,\n  Dienstgrad TEXT\n);';

let browser;
let server;
const cookies = {};
const meldungen = [];

const inhalte = () => server.t.app.locals.inhalte;
const post = (cookie, pfad, body) =>
  request(server.t.app).post(pfad).set('Cookie', cookie).set('Origin', server.url).send(body === undefined ? {} : body);
const loese = (cookie, id) => post(cookie, `${K17}/aufgaben/${id}/pruefen`, { antwort: musterantwort(inhalte().aufgabe(id)) });
const aufgabenDer = (nr) => inhalte().akten().find((a) => a.nr === nr).levels.flatMap((l) => l.aufgaben || []);

test.before(async () => {
  browser = await chromium.launch({ executablePath: CHROMIUM });
  server = await starteTestServer({
    mitInhalten: true,
    rateLimits: { lernen: { max: 5000 }, pruefenSql: { max: 5000 }, board: { max: 1000 } }
  });
  if (FOTOS) fs.mkdirSync(FOTO_ORDNER, { recursive: true });
  // Anmeldung über das Portal legt Kurs (Standard: nur Akte 1) und Mitgliedschaften an
  for (const [k, n] of [['lehrkraft', LEHRKRAFT], ['lena', LENA], ['mika', MIKA], ['ida', IDA]]) cookies[k] = await server.anmelden(n);
});

test.after(async () => {
  if (browser) await browser.close();
  if (server) await server.schliessen();
});

async function seite(cookie, { breite = 1440, hoehe = 900, extra = {} } = {}) {
  const kontext = await browser.newContext({ viewport: { width: breite, height: hoehe }, reducedMotion: 'reduce', colorScheme: 'light', acceptDownloads: true, ...extra });
  if (cookie) {
    const [name, wert] = cookie.split(/=(.*)/s);
    await kontext.addCookies([{ name, value: wert, url: server.url }]);
  }
  const page = await kontext.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error' || /Content Security Policy|Refused to/i.test(m.text())) meldungen.push(m.text());
  });
  page.on('pageerror', (e) => meldungen.push('pageerror: ' + e.message));
  return { kontext, page };
}

// Erwartet: 404 bei absichtlich ungültigen Adressen; sonst keine Fehler.
const fehler = () => meldungen.filter((m) => !/Failed to load resource: the server responded with a status of 404/.test(m));

async function ohneUeberlauf(page, name) {
  const ueberlauf = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(ueberlauf <= 0, `${name}: horizontales Scrollen (${ueberlauf} px)`);
}

/** Layout in allen Breiten prüfen; mit SCREENSHOTS=1 hell und dunkel fotografieren. */
async function fotos(page, name, { breiten = BREITEN, warte = null } = {}) {
  for (const [b, h] of breiten) {
    await page.setViewportSize({ width: b, height: h });
    await page.waitForTimeout(120);
    if (warte) await warte(page);
    await ohneUeberlauf(page, `${name} @${b}`);
    if (!FOTOS) continue;
    await page.evaluate(() => window.scrollTo(0, 0)); // sonst steht die feste Kopfzeile mitten im Ganzseitenfoto
    for (const thema of ['light', 'dark']) {
      await page.emulateMedia({ colorScheme: thema, reducedMotion: 'reduce' });
      await page.waitForTimeout(80);
      await page.screenshot({ path: path.join(FOTO_ORDNER, `probelauf_${name}_${b}_${thema === 'light' ? 'hell' : 'dunkel'}.png`), fullPage: true });
    }
    await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
}

async function bereit(page, url) {
  await page.goto(server.url + url);
  await page.waitForFunction(() => /bereit|verhoer|ergebnis/.test(document.documentElement.dataset.seite || ''), null, { timeout: 30000 });
}

test('1. Lehrkraft schaltet Akten 2–7 und die Kür frei', { timeout: 60000 }, async () => {
  const { kontext, page } = await seite(cookies.lehrkraft);
  try {
    await page.goto(server.url + '/lehrkraft#/kurs/k%3A17/einstellungen');
    await page.waitForSelector('#ei-speichern');
    for (const nr of [2, 3, 4, 5, 6, 7, 8]) {
      assert.equal(await page.isChecked(`#ei-akte-${nr}`), false, `Akte ${nr} zunächst gesperrt`);
      await page.click(`label[for="ei-akte-${nr}"]`);
    }
    await page.click('#ei-speichern');
    await page.waitForSelector('#ei-rueckmeldung.ok');
    const k = (await page.evaluate(() => fetch('/api/lehrkraft/kurse').then((x) => x.json()))).kurse.find((x) => x.id === 'k:17');
    assert.deepEqual([...k.einstellungen.akten].sort(), [1, 2, 3, 4, 5, 6, 7, 8]);
    assert.equal(k.einstellungen.verhoer, 'auto');
    assert.deepEqual(fehler(), []);
  } finally {
    await kontext.close();
  }
});

test('2. Schüler:innen lösen Aufgaben; Mika löst Spur 1 des Schlussplädoyers im Browser', { timeout: 180000 }, async () => {
  // Lena: Akten 1–6 vollständig (Akte 6 inkl. Schlussplädoyer); frühere Verhöre 1–5 gewonnen
  for (const nr of [1, 2, 3, 4, 5, 6]) {
    for (const id of aufgabenDer(nr)) {
      const r = await loese(cookies.lena, id);
      assert.equal(r.status, 200, id);
      assert.ok(r.body.geloest || r.body.zustand.status === 'bearbeitet', id);
    }
  }
  const db = server.t.db;
  for (const akte of [1, 2, 3, 4, 5]) {
    db.prepare(
      "INSERT INTO verhoer_versuche (sub, kurs_id, akte, aufgaben_json, beginn, ende, punkte, max) VALUES ('s:1042', 'k:17', ?, '[]', ?, ?, 8, 10)"
    ).run(akte, `2026-10-0${akte}T10:00:00Z`, `2026-10-0${akte}T10:15:00Z`);
  }
  // Mika: Akte 1 teilweise, Ida: wenig und mit Fehlabfragen (Fallen-Profil)
  for (const id of aufgabenDer(1).slice(0, 8)) assert.equal((await loese(cookies.mika, id)).status, 200);
  for (const id of aufgabenDer(1).slice(0, 3)) assert.equal((await loese(cookies.ida, id)).status, 200);
  for (const c of [cookies.ida, cookies.ida, cookies.mika]) {
    assert.equal((await post(c, `${K17}/aufgaben/A2-E1-06/pruefen`, { antwort: 'SELECT *\nFROM Rad\nWHERE Typ = Lastenrad' })).status, 200);
  }

  // Mika im Browser: Schlussplädoyer, Spur 1
  const { kontext, page } = await seite(cookies.mika);
  try {
    await page.goto(`${server.url}/ermittlung/A6-E1?aufgabe=A6-E1-09`);
    await page.waitForSelector('#aufgabe-karte .reiter:text("A6-E1-09")', { timeout: 30000 });
    assert.match(await page.textContent('.aufgabe-meta'), /Spur 1 von 6/);
    assert.match(await page.textContent('#plaedoyer-stand'), /0 von 6 Indizien/);
    await page.waitForSelector('.lern-konsole textarea');
    await page.fill('.lern-konsole textarea', inhalte().aufgabe('A6-E1-09').loesung.sql);
    await page.click('#k-pruefen');
    await page.waitForSelector('#feedback-richtig', { timeout: 30000 });
    await page.waitForSelector('#plaedoyer-karte .pw-indiz-karte');
    assert.match(await page.textContent('#plaedoyer-karte'), /Indiz 1 von 6/);
    assert.match(await page.textContent('#plaedoyer-karte'), /R-7F3A/);
    assert.equal(await page.locator('#plaedoyer-karte .pw-aufloesung').count(), 0, 'Auflösung erst nach allen Spuren');
    await page.waitForFunction(() => /1 von 6 Indizien/.test(document.getElementById('plaedoyer-stand').textContent));
    await fotos(page, 'plaedoyer');
    // Mikas Pinnwand: ein Indiz, keine Auflösung, kein Polaroid. Der Steckbrief ist dagegen schon vollständig (Regel E10:
    // die Lehrkraft hat mit Akte 7 eine spätere Akte freigeschaltet) – offene Frage an Frank (Spec §18, Phase 6).
    await bereit(page, '/pinnwand');
    assert.equal(await page.locator('.pw-indiz.bekannt').count(), 1);
    assert.equal(await page.locator('.pw-aufloesung').count(), 0);
    assert.equal(await page.locator('.pw-polaroid[data-akte]').count(), 0);
    assert.match(await page.textContent('.pw-steckbrief'), /6 von 6 Hinweisen/);
    assert.deepEqual(fehler(), []);
  } finally {
    await kontext.close();
  }
});

test('3. Lena spielt Verhör 6, Pinnwand und Steckbrief zeigen die Freischaltung, Akte 7 ist offen', { timeout: 240000 }, async () => {
  const { kontext, page } = await seite(cookies.lena);
  try {
    await page.goto(server.url + '/verhoer/6');
    await page.waitForSelector('#k-verhoer-start');
    await page.click('#k-verhoer-start');
    await page.waitForSelector('html[data-seite="verhoer"]');
    assert.match(await page.locator('#timer-zeit').textContent(), /^1[45]:\d\d$/);
    // erste Aufgabe im Browser (SQL in der Konsole, sonst über dieselbe API), übrige wie der Browser über die API
    const versuch = (await request(server.t.app).get(`${K17}/verhoere/6/versuch`).set('Cookie', cookies.lena)).body;
    const ids = versuch.aufgaben.map((a) => a.id);
    assert.equal(ids.length, 5);
    const karte = page.locator('#verhoer-aufgabe');
    const erste = inhalte().aufgabe(ids[0]);
    if ((await karte.locator('.lern-konsole textarea').count()) && erste.interaktion.kind === 'sql') {
      await karte.locator('.lern-konsole textarea').first().fill(erste.loesung.sql);
      await page.click('#k-speichern');
      await page.waitForSelector('#toast.sichtbar');
    } else {
      assert.equal((await post(cookies.lena, `${K17}/verhoere/6/antwort`, { aufgabe: ids[0], antwort: musterantwort(erste) })).status, 200);
    }
    for (const id of ids.slice(1)) {
      assert.equal((await post(cookies.lena, `${K17}/verhoere/6/antwort`, { aufgabe: id, antwort: musterantwort(inhalte().aufgabe(id)) })).status, 200);
    }
    await page.reload();
    await page.waitForSelector('#k-verhoer-start:has-text("Verhör fortsetzen")');
    await page.click('#k-verhoer-start');
    await page.waitForSelector('html[data-seite="verhoer"]');
    await page.waitForFunction(() => document.querySelectorAll('#verhoer-kacheln .kachel.beantwortet').length === 5);
    await fotos(page, 'verhoer6');
    await page.click('#k-abgeben');
    await page.click('#k-abgeben-ja');
    await page.waitForSelector('html[data-seite="ergebnis"]');
    assert.match(await page.locator('.ergebnis-kopfzeile').textContent(), /90 von 90 Punkten/);
    assert.match(await page.locator('.abzeichen-neu').textContent(), /^Neue Abzeichen: .*Beweisstück \(Akte 6\)/);
    await fotos(page, 'verhoer6_ergebnis');

    // Pinnwand: Polaroids 1–6, Indizienkette vollständig, Auflösung, Steckbrief mit Name/Motiv
    await bereit(page, '/pinnwand');
    assert.equal(await page.locator('.pw-polaroid[data-akte]').count(), 6);
    assert.match(await page.textContent('.pw-polaroid[data-akte="6"]'), /Steckbrief/);
    assert.equal(await page.locator('.pw-indiz.bekannt').count(), 6);
    assert.match(await page.textContent('.pw-aufloesung'), /Merle Falkenrath/);
    const steckbrief = await page.textContent('.pw-steckbrief');
    assert.match(steckbrief, /Merle Falkenrath/);
    assert.match(steckbrief, /Hafenviertel \(bestätigt\)/);
    assert.match(steckbrief, /Enttarnt/);
    await page.click('.pw-polaroid[data-akte="6"]');
    await page.waitForSelector('#pw-detail .pw-detail-karte');
    assert.match(await page.textContent('#pw-detail'), /Und was sagt das über uns\?/);
    await fotos(page, 'pinnwand');

    // Stadtplan und Akte 7 (Generalprobe): Verhör 7 offen (auto, Akte 7 freigeschaltet)
    await bereit(page, '/');
    assert.match(await page.textContent('.seitenspalte .pw-steckbrief'), /Merle Falkenrath/);
    await bereit(page, '/akte/7');
    assert.match(await page.textContent('.akte-kopf-karte'), /Generalprobe/);
    const v7 = (await request(server.t.app).get(`${K17}/verhoere/7`).set('Cookie', cookies.lena)).body;
    assert.equal(v7.frei, true, JSON.stringify(v7));
    await fotos(page, 'akte7');
    assert.deepEqual(fehler(), []);
  } finally {
    await kontext.close();
  }
});

test('4. Lehrkraft: Auswertung, CSV, Aufgaben, Board, Urkunden und alle Reiter', { timeout: 300000 }, async () => {
  const { kontext, page } = await seite(cookies.lehrkraft);
  try {
    /* ---------- Auswertung ---------- */
    await page.goto(server.url + '/lehrkraft#/kurs/k%3A17/auswertung');
    await page.waitForSelector('table.matrix tbody tr:nth-child(3)');
    assert.match(await page.textContent('#lk-kennzahlen'), /3\s*Schüler:innen[\s\S]*7\s*Akten frei \+ Kür/);
    const namen = await page.$$eval('table.matrix tbody th', (ths) => ths.map((t) => t.firstChild.textContent));
    assert.deepEqual(namen, ['Ida W.', 'Lena K.', 'Mika R.']);
    const koepfe = await page.$$eval('table.matrix thead tr:nth-child(2) th', (ths) => ths.map((t) => t.textContent));
    for (const k of ['E 1.1', 'E 6.1', 'V6', 'V7']) assert.ok(koepfe.includes(k), `${k} fehlt: ${koepfe.join(' ')}`);
    const lenaV6 = await page.$eval('table.matrix tbody tr:nth-child(2)', (tr) => {
      const i = [...tr.closest('table').querySelectorAll('thead tr:nth-child(2) th')].findIndex((th) => th.textContent === 'V6');
      return tr.querySelectorAll('td')[i].getAttribute('aria-label');
    });
    assert.match(lenaV6, /besiegt/);
    const fallen = await page.$$eval('#au-fallen li', (lis) => lis.map((li) => li.getAttribute('aria-label')));
    assert.equal(fallen.length, 10);
    assert.match(fallen[0], /^P1 /);
    await page.click('#au-fehlabfragen summary');
    assert.match(await page.textContent('#au-fehlabfragen'), /Lastenrad/);
    const [download] = await Promise.all([page.waitForEvent('download'), page.click('#au-csv')]);
    const csv = fs.readFileSync(await download.path(), 'utf8');
    assert.ok(csv.startsWith('﻿'), 'UTF-8 mit BOM');
    for (const n of ['Lena K.', 'Mika R.', 'Ida W.']) assert.ok(csv.includes(n), n);
    assert.doesNotMatch(csv, /s:10\d\d|l:7/, 'keine sub in der CSV');
    await fotos(page, 'lehrkraft_auswertung', { warte: (p) => p.waitForSelector('table.matrix') });

    /* ---------- Aufgaben mit Lösung ---------- */
    await page.goto(server.url + '/lehrkraft#/aufgaben');
    await page.waitForSelector('.lk-akten-karte');
    await page.click('.lk-akten-karte[href="#/aufgaben/akte/6"]');
    await page.click('a[href="#/aufgaben/aufgabe/A6-E1-09"]');
    await page.waitForSelector('#vo-loesung .etikett');
    assert.match(await page.textContent('#vo-titel'), /Fünf Nächte an der Hafenkante/);
    assert.match(await page.textContent('#vo-loesung'), /Musterlösung[\s\S]*SELECT KundenToken/);
    await fotos(page, 'lehrkraft_aufgaben');

    /* ---------- Board ---------- */
    await page.goto(server.url + '/lehrkraft#/kurs/k%3A17/beitritt');
    await page.waitForSelector('#bo-umschalten');
    await page.click('#bo-umschalten');
    await page.waitForSelector('#panel-beitritt .board-link-feld');
    const boardUrl = await page.inputValue('#panel-beitritt .board-link-feld');
    assert.match(boardUrl, /\/board\/[A-Za-z0-9_-]{32}$/);
    await page.waitForSelector('#bo-vorschau .board-mini li');
    const beamer = await seite(null, { breite: 1920, hoehe: 1080 });
    try {
      await beamer.page.goto(boardUrl);
      await beamer.page.waitForFunction(() => document.documentElement.dataset.board === 'bereit');
      assert.equal(await beamer.page.evaluate(() => document.documentElement.dataset.theme), 'dark');
      const zeilen = await beamer.page.$$eval('#board-rangliste li', (lis) => lis.map((li) => li.textContent));
      assert.equal(zeilen.length, 3);
      assert.match(zeilen[0], /^1Lena K\./);
      const m = await beamer.page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.scrollHeight]);
      assert.ok(m[0] <= 1920 && m[1] <= 1080, `Board scrollt: ${m}`);
      assert.doesNotMatch(await beamer.page.content(), /s:10\d\d/, 'keine sub am Board');
      if (FOTOS) await beamer.page.screenshot({ path: path.join(FOTO_ORDNER, 'probelauf_board_1920_dunkel.png') });
    } finally {
      await beamer.kontext.close();
    }

    /* ---------- Urkunden ---------- */
    await page.goto(server.url + '/lehrkraft#/kurs/k%3A17/schueler');
    await page.waitForSelector('#sl-tabelle');
    assert.equal(await page.$$eval('#sl-tabelle tbody tr', (z) => z.length), 3);
    await page.goto(server.url + (await page.getAttribute('#lk-urkunden', 'href')));
    await page.waitForFunction(() => document.documentElement.dataset.urkunden === 'bereit');
    const urkunden = await page.$$eval('.urkunde', (u) => u.map((x) => x.textContent));
    assert.equal(urkunden.length, 3);
    const lena = urkunden.find((u) => u.includes('Lena K.'));
    assert.match(lena, /Beweisstücke: 6 von 7/);
    for (const u of urkunden) assert.doesNotMatch(u, /s:10\d\d/);
    await fotos(page, 'urkunde', { breiten: [[1440, 900], [375, 812]] });
    await page.emulateMedia({ media: 'print' });
    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
    assert.equal((pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length, 3, 'eine A4-Seite je Schüler:in');
    await page.emulateMedia({ media: 'screen' });

    /* ---------- alle Reiter ---------- */
    for (const r of ['schueler', 'beitritt', 'scoreboard', 'einstellungen', 'live']) {
      await page.goto(server.url + '/lehrkraft#/kurs/k%3A17/' + r);
      await page.waitForSelector(`#panel-${r}:not([hidden]) > :not(.lk-laedt)`);
      if (r === 'live') await page.waitForSelector('#panel-live .live-steuerung > :not(.laedt)');
      await fotos(page, 'lehrkraft_' + r);
    }
    await page.goto(server.url + '/lehrkraft#/materialien');
    await page.waitForSelector('#seite-materialien .material-gruppe, #seite-materialien .notiz');
    await fotos(page, 'lehrkraft_materialien');
    assert.deepEqual(fehler(), []);
  } finally {
    await kontext.close();
  }
});

test('5. Live-Duell mit allen drei Schüler:innen und Beamer', { timeout: 180000 }, async () => {
  const lk = await seite(cookies.lehrkraft, { breite: 1280 });
  const sus = await Promise.all([cookies.lena, cookies.mika, cookies.ida].map((c) => seite(c, { breite: 1024 })));
  const [s1, s2, s3] = sus.map((x) => x.page);
  let beamer;
  try {
    await lk.page.goto(server.url + '/lehrkraft/live?kurs=k:17');
    await lk.page.waitForSelector('#k-start');
    await lk.page.click('#lk-keine');
    await lk.page.check('#lk-aufgabe-K2-L-01');
    await lk.page.check('#lk-aufgabe-K2-L-09');
    await lk.page.click('#k-start');
    await lk.page.waitForSelector('#k-naechste');
    beamer = await seite(cookies.lehrkraft, { breite: 1920, hoehe: 1080 });
    await beamer.page.goto(server.url + (await lk.page.getAttribute('#lk-beamer', 'href')));
    await beamer.page.waitForSelector('.beamer-aufgabe');
    for (const s of [s1, s2, s3]) {
      await s.goto(server.url + '/live?kurs=k:17');
      await s.waitForSelector('#k-beitreten');
      await s.click('#k-beitreten');
      await s.waitForSelector('text=Warte auf die erste Aufgabe');
    }
    await lk.page.waitForSelector('#lk-teilnehmer li:nth-child(3)');
    await lk.page.click('#k-naechste');
    for (const s of [s1, s2, s3]) await s.waitForSelector('.option');
    await fotos(s2, 'live_schueler_aufgabe', { warte: (p) => p.waitForSelector('.option') });
    for (const [s, text] of [[s1, 'WHERE Wert IS NULL'], [s2, 'WHERE Wert IS NULL'], [s3, "WHERE Wert = 'NULL'"]]) {
      await s.locator('.option', { hasText: text }).first().click();
      await s.click('#k-antwort');
      await s.waitForSelector('#live-gespeichert');
    }
    await lk.page.waitForSelector('text=3 von 3 haben geantwortet');
    await lk.page.click('#k-schliessen');
    for (const s of [s1, s2]) await s.waitForSelector('#live-ergebnis >> text=Richtig');
    await s3.waitForSelector('#live-ergebnis >> text=Leider falsch');
    await beamer.page.waitForSelector('text=2 von 3 richtig');
    const rang = await beamer.page.$$eval('.live-rang .rang-name', (e) => e.map((x) => x.textContent));
    assert.equal(rang.length, 3);
    assert.equal(rang[2], 'Ida W.');
    await fotos(s3, 'live_schueler_ergebnis', { warte: (p) => p.waitForSelector('#live-ergebnis') });
    if (FOTOS) await beamer.page.screenshot({ path: path.join(FOTO_ORDNER, 'probelauf_live_beamer_1920_dunkel.png') });
    await fotos(lk.page, 'live_lehrkraft');
    await lk.page.click('#k-ende');
    await lk.page.click('#k-ende-ja');
    await lk.page.waitForSelector('#lk-ende');
    for (const s of [s1, s2, s3]) await s.waitForSelector('#live-ende');
    await beamer.page.waitForSelector('#beamer-ende');
    // nichts davon in der Plattform-DB
    const tabellen = server.t.db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((x) => x.name);
    assert.ok(!tabellen.some((n) => /live/i.test(n)));
    assert.deepEqual(fehler(), []);
  } finally {
    for (const x of [lk, beamer, ...sus]) if (x) await x.kontext.close();
  }
});

test('6. Ida bearbeitet K1-E1-01 in der Schreib-Konsole der Kür', { timeout: 120000 }, async () => {
  const { kontext, page } = await seite(cookies.ida);
  try {
    await bereit(page, '/');
    assert.match(await page.locator('#kuer-karte').textContent(), /KÜR – nicht im Abitur/);
    await page.goto(server.url + '/ermittlung/K1-E1?aufgabe=K1-E1-01');
    await page.waitForSelector('#aufgabe-karte .reiter:text("K1-E1-01")', { timeout: 30000 });
    await page.waitForSelector('.schreib-konsole .kuer-band');
    await page.fill('.schreib-konsole textarea', ERMITTLER + '\nINSERT INTO Ermittler VALUES (1, \'Edda Lorenz\', \'Chefin\');\nSELECT * FROM Ermittler;');
    await page.click('.schreib-konsole [id^="k-skript-ausfuehren"]');
    await page.waitForFunction(() => {
      const f = document.querySelector('.schreib-konsole .ergebnis');
      return f && f.getAttribute('aria-busy') !== 'true' && !f.querySelector('.laeuft') && /Edda Lorenz/.test(f.textContent);
    });
    await page.waitForSelector('.schreib-konsole .schema-tabelle[data-tabelle="Ermittler"]');
    await fotos(page, 'kuer_konsole');
    await page.fill('.schreib-konsole textarea', ERMITTLER);
    await page.click('#k-pruefen');
    await page.waitForSelector('#feedback-richtig', { timeout: 30000 });
    // Kür-Punkte zählen, die Schreib-Sandbox speichert nichts in der Plattform-DB
    const n = server.t.db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'Ermittler'").all().length;
    assert.equal(n, 0);
    assert.deepEqual(fehler(), []);
  } finally {
    await kontext.close();
  }
});
