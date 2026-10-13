'use strict';
// E2E (Chromium, playwright-core): Lehrkraft-Bereich, Beamer-Board und Urkunden (Plan Phase 6 Task 4).
// Testkurs k:17 mit Lehrkraft und drei Schülerinnen/Schülern mit Lernstand (echte Inhalte + Beispielakte 9, echter
// SQL-Prüfer, Fixture-Materialien):
// 1. Auswertung: Matrix (Werte, Tastatur, Detail), Fallen-Profil, Aufgabenstatistik sortierbar, Fehlabfragen, CSV.
// 2. Vorschau: Aufgabe mit Lösung, Erklärung, Tipps und Niveau-Hinweis.
// 3. Board: einschalten, Link, Beamer 1920 × 1080 ohne Scrollen, dunkel, aktualisiert sich (20 s, Uhr vorgespult),
//    neuer Link → altes Board „nicht erreichbar“.
// 4. Urkunden: Druckseite, je Schüler:in eine A4-Seite (PDF mit 3 Seiten), Auswahl ab Rang.
// 5. Materialien (Fixture-Whitelist) und Einstellungen (Akte freischalten, Verhör je Akte, speichern).
// 6. Superadmin: System-Reiter (Seed-Bericht, Inhalte neu laden mit Bestätigung, Sicherung), Originale.
// Je Zustand: keine CSP-Meldungen, keine Skriptfehler, kein horizontales Scrollen (1440, 1024, 768, 375).
// SCREENSHOTS=1 → SCREENSHOT_ORDNER (Standard docs/screenshots/phase6), hell und dunkel.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const request = require('supertest');
const { chromium } = require('playwright-core');
const { starteTestServer } = require('./testserver');
const { musterantwort } = require('../../src/content/pruefer');

const CHROMIUM = require('./chromium').chromiumPfad();
const FIXTURE = path.join(__dirname, '..', 'fixtures', 'akte_beispiel.json');
const MATERIAL = path.join(__dirname, '..', 'fixtures', 'materialien');
const FOTOS = process.env.SCREENSHOTS === '1';
const FOTO_ORDNER = process.env.SCREENSHOT_ORDNER || path.join(__dirname, '..', '..', 'docs', 'screenshots', 'phase6');

const KURS = [{ id: 'k:17', name: 'Inf-LK 12', rolle: 'mitglied' }];
const LEHRKRAFT = { sub: 'l:7', rolle: 'lehrkraft', name: 'Frau M.', kurse: [{ id: 'k:17', name: 'Inf-LK 12', rolle: 'lehrkraft' }] };
const ADMIN = { sub: 'a:1', rolle: 'superadmin', name: 'Admin', kurse: [] };
const SCHUELER = [
  { sub: 's:1042', rolle: 'schueler', name: 'Lena K.', kurse: KURS },
  { sub: 's:1043', rolle: 'schueler', name: 'Mika R.', kurse: KURS },
  { sub: 's:1044', rolle: 'schueler', name: 'Ida W.', kurse: KURS }
];
const FALSCH_SQL = 'select Bezeichnung   from Fundsache';
const K17 = '/api/kurse/' + encodeURIComponent('k:17');

let browser;
let server;
let cookies;
const meldungen = [];

/** POST als Schüler:in über die echte App (gleiche Origin-Prüfung wie im Browser). */
const post = (cookie, pfad, body) =>
  request(server.t.app).post(pfad).set('Cookie', cookie).set('Origin', server.url).send(body === undefined ? {} : body);
const loese = (cookie, id) => post(cookie, `${K17}/aufgaben/${id}/pruefen`, { antwort: musterantwort(server.t.app.locals.inhalte.aufgabe(id)) });

test.before(async () => {
  browser = await chromium.launch({ executablePath: CHROMIUM });
  server = await starteTestServer({
    mitInhalten: true,
    aktenDateien: [FIXTURE],
    materialVerzeichnis: MATERIAL,
    rateLimits: { lernen: { max: 1000 }, pruefenSql: { max: 1000 }, board: { max: 1000 } }
  });
  if (FOTOS) fs.mkdirSync(FOTO_ORDNER, { recursive: true });
  // Konten anlegen (Anmeldung legt Kurs und Mitgliedschaften an)
  cookies = {
    lehrkraft: await server.anmelden(LEHRKRAFT),
    schueler: await Promise.all(SCHUELER.map((s) => server.anmelden(s)))
  };
  const db = server.t.db;
  db.prepare("UPDATE kurse SET einstellungen = ? WHERE kurs_id = 'k:17'").run(JSON.stringify({ akten: [1, 9], niveau: 'eA', verhoer: 'auto' }));
  const [lena, mika, ida] = cookies.schueler;
  for (const id of ['A9-E1-01', 'A9-E1-02', 'A9-E1-04', 'A9-E1-07', 'A9-E1-09']) assert.equal((await loese(lena, id)).body.geloest, true, id);
  for (const id of ['A9-E1-01', 'A9-E1-04']) assert.equal((await loese(mika, id)).body.geloest, true, id);
  for (const c of [mika, ida, ida]) assert.equal((await post(c, `${K17}/aufgaben/A9-E1-03/pruefen`, { antwort: FALSCH_SQL })).status, 200);
  assert.equal((await post(ida, `${K17}/aufgaben/A9-E1-01/tipp`)).status, 200);
  // Verhör 9: Lena besiegt (40 von 60)
  const ids = JSON.stringify({ aufgaben: ['A9-V-01', 'A9-V-02', 'A9-V-03'], frist: '2026-10-13T08:20:00Z' });
  db.prepare(
    "INSERT INTO verhoer_versuche (sub, kurs_id, akte, aufgaben_json, ergebnisse_json, beginn, ende, punkte, max) VALUES (?, 'k:17', 9, ?, ?, '2026-10-13T08:00:00Z', '2026-10-13T08:10:00Z', ?, 60)"
  ).run('s:1042', ids, JSON.stringify({ 'A9-V-01': { ok: true, punkte: 10 }, 'A9-V-03': { ok: true, punkte: 30 } }), 40);
});

test.after(async () => {
  if (browser) await browser.close();
  if (server) await server.schliessen();
});

async function seite(cookie, { breite = 1440, hoehe = 900, dunkel = false, extra = {} } = {}) {
  const kontext = await browser.newContext({
    viewport: { width: breite, height: hoehe },
    reducedMotion: 'reduce',
    colorScheme: dunkel ? 'dark' : 'light',
    acceptDownloads: true,
    ...extra
  });
  if (cookie) {
    const [name, wert] = cookie.split(/=(.*)/s);
    await kontext.addCookies([{ name, value: wert, url: server.url }]);
  }
  const page = await kontext.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error' || /Content Security Policy|Refused to/i.test(m.text())) meldungen.push(m.text());
  });
  page.on('pageerror', (e) => meldungen.push(e.message));
  page.on('response', (r) => {
    if (r.status() >= 400 && r.status() !== 404) meldungen.push(`HTTP ${r.status()} ${new URL(r.url()).pathname}`);
  });
  return { kontext, page };
}

// Erwartet: 404 (ungültiges Board) und 401 von /api/ich auf der anonymen 404-Seite (Kopfzeile fragt die Anmeldung ab).
const fehlerMeldungen = () =>
  meldungen.filter((m) => !/Failed to load resource: the server responded with a status of 40[14]/.test(m) && m !== 'HTTP 401 /api/ich');

async function ohneUeberlauf(page, name) {
  const ueberlauf = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(ueberlauf <= 0, `${name}: horizontales Scrollen (${ueberlauf} px)`);
}

async function foto(page, name) {
  if (FOTOS) await page.screenshot({ path: path.join(FOTO_ORDNER, `lehrkraft_${name}.png`), fullPage: true });
}

async function reiter(page, name) {
  await page.click('#reiter-' + name);
  await page.waitForSelector(`#panel-${name}:not([hidden]) > :not(.lk-laedt)`);
}

test('Auswertung: Matrix mit Werten und Tastatur, Fallen-Profil, Aufgabenstatistik, Fehlabfragen, CSV', async () => {
  const { kontext, page } = await seite(cookies.lehrkraft);
  try {
    await page.goto(server.url + '/lehrkraft');
    await page.waitForSelector('#reiter-uebersicht[aria-selected="true"]');
    await page.waitForSelector('#panel-uebersicht .lk-akten');
    assert.equal(await page.$eval('#lk-kurs', (s) => s.value), 'k:17');
    assert.equal(await page.isHidden('#reiter-system'), true, 'System nur für Superadmin');
    assert.match(await page.textContent('#lk-kennzahlen'), /3\s*Schüler:innen/);

    await reiter(page, 'auswertung');
    assert.match(page.url(), /#auswertung$/);
    await page.waitForSelector('table.matrix tbody tr:nth-child(3)');
    const namen = await page.$$eval('table.matrix tbody th', (ths) => ths.map((t) => t.firstChild.textContent));
    assert.deepEqual(namen, ['Ida W.', 'Lena K.', 'Mika R.']);
    // nur freigeschaltete Akten (1 und 9): Spalten E 1.1 … V9
    const koepfe = await page.$$eval('table.matrix thead tr:nth-child(2) th', (ths) => ths.map((t) => t.textContent));
    assert.ok(koepfe.includes('V9') && koepfe.includes('E 1.1') && !koepfe.includes('E 2.1'), koepfe.join(' '));
    // Lena: Verhör 9 besiegt (67 %, ✓)
    const lenaV9 = await page.$eval('table.matrix tbody tr:nth-child(2) td:last-child', (td) => ({ text: td.textContent, label: td.getAttribute('aria-label'), klasse: td.className }));
    assert.match(lenaV9.text, /^67✓$/);
    assert.match(lenaV9.label, /besiegt/);
    // Tastatur: erste Zelle fokussieren, Pfeiltasten, Detail aktualisiert sich
    await page.focus('table.matrix tbody td[tabindex="0"]');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('End');
    assert.match(await page.textContent('#au-detail'), /Lena K\. · Probeverhör/);
    await page.keyboard.press('ArrowLeft');
    assert.match(await page.textContent('#au-detail'), /Lena K\. · Ermittlung 9\.\d/);
    // gesperrte Akten einblenden
    await page.click('label[for="au-nur-frei"]');
    const alle = await page.$$eval('table.matrix thead tr:nth-child(2) th', (ths) => ths.map((t) => t.textContent));
    assert.ok(alle.includes('E 2.1'));

    // Fallen-Profil: Text + Zahl je Falle (P10 Reihenfolge fest)
    const fallen = await page.$$eval('#au-fallen li', (lis) => lis.map((li) => li.getAttribute('aria-label')));
    assert.equal(fallen.length, 10);
    assert.match(fallen[0], /^P1 /);
    assert.match(fallen[9], /^P10 /);
    // Aufgabenstatistik sortieren
    await page.click('#au-aufgaben button[data-spalte="quote"]');
    assert.equal(await page.getAttribute('#au-aufgaben th:has(button[data-spalte="quote"])', 'aria-sort'), 'descending');
    // Fehlabfragen: SQL als Text, aufklappbar
    await page.click('#au-fehlabfragen summary');
    assert.equal((await page.textContent('#au-fehlabfragen pre')).trim(), 'SELECT Bezeichnung FROM Fundsache', 'SQL als Text (normalisiert gespeichert)');
    assert.match(await page.textContent('#au-fehlabfragen .anzahl'), /× 3/);
    await foto(page, 'auswertung_1440_hell');

    // CSV-Download
    const [download] = await Promise.all([page.waitForEvent('download'), page.click('#au-csv')]);
    const datei = await download.path();
    const csv = fs.readFileSync(datei, 'utf8');
    assert.ok(csv.startsWith('﻿'), 'UTF-8 mit BOM');
    assert.match(csv, /Lena K\./);
    assert.doesNotMatch(csv, /s:104/, 'keine sub');
    assert.match(download.suggestedFilename(), /^auswertung-.*\.csv$/);

    for (const [b, h] of [[1440, 900], [1024, 768], [768, 1024], [375, 812]]) {
      await page.setViewportSize({ width: b, height: h });
      await page.waitForTimeout(100);
      await ohneUeberlauf(page, `Auswertung @${b}`);
      await foto(page, `auswertung_${b}_hell`);
    }
    assert.deepEqual(fehlerMeldungen(), []);
  } finally {
    await kontext.close();
  }
});

test('Vorschau: Baum, Aufgabe mit Lösung, Erklärung, Tipps und Niveau-Hinweis', async () => {
  const { kontext, page } = await seite(cookies.lehrkraft);
  try {
    await page.goto(server.url + '/lehrkraft?kurs=k:17#vorschau');
    await page.waitForSelector('#vo-baum details');
    // Akte 9 und die Ermittlung aufklappen (Tastatur: Summary mit Enter)
    for (const sel of ['#vo-baum > details:has(button[data-aufgabe="A9-E1-01"])', '#vo-baum details details:has(button[data-aufgabe="A9-E1-01"])']) {
      if (!(await page.$eval(sel, (d) => d.open))) {
        await page.focus(sel + ' > summary');
        await page.keyboard.press('Enter');
      }
    }
    await page.click('#vo-baum button[data-aufgabe="A9-E1-01"]');
    await page.waitForSelector('#vo-loesung');
    assert.equal(await page.textContent('#vo-titel'), 'Was ist markiert?');
    assert.equal(await page.textContent('#vo-niveau'), 'sichtbar für eA und gA');
    assert.match(await page.textContent('#vo-loesung'), /Attributwert/);
    assert.match(await page.textContent('#vo-tipps'), /einzelne Zelle/);
    assert.equal(await page.$$eval('#vo-ansicht .option', (o) => o.length), 4, 'Aufgabe gerendert');
    await page.click('#vo-eintragen');
    assert.equal(await page.isDisabled('#vo-eintragen'), true);
    // SQL-Aufgabe: Musterlösung als hervorgehobener Code
    await page.click('#vo-baum button[data-aufgabe="A9-E1-02"]');
    await page.waitForSelector('#vo-loesung .etikett');
    assert.match(await page.textContent('#vo-loesung'), /Musterlösung[\s\S]*SELECT/);
    // Verhör-Pool
    await page.click('#vo-baum details details:has(button[data-aufgabe="A9-V-01"]) > summary');
    await page.click('#vo-baum button[data-aufgabe="A9-V-01"]');
    await page.waitForFunction(() => /A9-V-01/.test(document.querySelector('#vo-ansicht .etikett')?.textContent || ''));
    assert.match(await page.textContent('#vo-ansicht .etikett'), /Verhör-Pool/);
    await foto(page, 'vorschau_1440_hell');
    for (const [b, h] of [[1024, 768], [768, 1024], [375, 812]]) {
      await page.setViewportSize({ width: b, height: h });
      await page.waitForTimeout(100);
      await ohneUeberlauf(page, `Vorschau @${b}`);
      await foto(page, `vorschau_${b}_hell`);
    }
    assert.deepEqual(fehlerMeldungen(), []);
  } finally {
    await kontext.close();
  }
});

test('Board: einschalten, Link, Beamer 1920 × 1080 ohne Scrollen, Aktualisierung, neuer Link macht alten ungültig', async () => {
  const { kontext, page } = await seite(cookies.lehrkraft, { extra: { permissions: ['clipboard-read', 'clipboard-write'] } });
  try {
    await page.goto(server.url + '/lehrkraft?kurs=k:17#board');
    await page.waitForSelector('#bo-umschalten');
    await page.click('#bo-umschalten');
    await page.waitForSelector('#panel-board .board-link-feld');
    const url = await page.inputValue('#panel-board .board-link-feld');
    assert.match(url, /\/board\/[A-Za-z0-9_-]{32}$/);
    await page.click('#panel-board .board-kopieren');
    await page.waitForSelector('#panel-board .rueckmeldung:has-text("Board-Link kopiert.")');
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), url);
    await page.waitForSelector('#bo-vorschau .board-mini li');
    await foto(page, 'board_reiter_1440_hell');

    // Beamer
    const beamer = await seite(null, { breite: 1920, hoehe: 1080 });
    try {
      await beamer.page.clock.install();
      await beamer.page.goto(url);
      await beamer.page.waitForFunction(() => document.documentElement.dataset.board === 'bereit');
      assert.equal(await beamer.page.evaluate(() => document.documentElement.dataset.theme), 'dark');
      assert.equal(await beamer.page.textContent('#board-kurs'), 'Inf-LK 12');
      const zeilen = await beamer.page.$$eval('#board-rangliste li', (lis) => lis.map((li) => li.textContent));
      assert.equal(zeilen.length, 3);
      assert.match(zeilen[0], /^1Lena K\./);
      const masse = await beamer.page.evaluate(() => ({
        h: document.documentElement.scrollHeight,
        w: document.documentElement.scrollWidth,
        zeile: document.querySelector('#board-rangliste li').getBoundingClientRect().height,
        schrift: parseFloat(getComputedStyle(document.documentElement).fontSize)
      }));
      assert.ok(masse.h <= 1080 && masse.w <= 1920, `Board scrollt: ${masse.w} × ${masse.h}`);
      assert.ok(Math.abs(masse.schrift - 28) < 0.5, `Grundschrift ${masse.schrift}`);
      assert.ok(Math.abs(masse.zeile - 56) < 1, `Zeilenhöhe ${masse.zeile}`);
      assert.equal(await beamer.page.$$eval('button, input, select, a', (e) => e.length), 0, 'keine Bedienelemente');
      const vorher = await beamer.page.$$eval('#board-erfolge li', (lis) => lis.length);
      await foto(beamer.page, 'board_1920_vorher');
      // neuer Erfolg → nach 20 s sichtbar
      assert.equal((await loese(cookies.schueler[2], 'A9-E1-12')).body.geloest, true);
      const zeitVorher = await beamer.page.evaluate(() => document.documentElement.dataset.boardZeit);
      await beamer.page.clock.runFor(20500);
      await beamer.page.waitForFunction((z) => document.documentElement.dataset.boardZeit !== z, zeitVorher);
      await beamer.page.waitForFunction((n) => document.querySelectorAll('#board-erfolge li').length > n || /Ida W\./.test(document.querySelector('#board-erfolge li')?.textContent || ''), vorher);
      assert.match(await beamer.page.textContent('#board-erfolge li'), /Ida W\./);
      await foto(beamer.page, 'board_1920');
      for (const [b, h] of [[1280, 720], [1024, 768]]) {
        await beamer.page.setViewportSize({ width: b, height: h });
        await beamer.page.waitForTimeout(100);
        const m = await beamer.page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.scrollHeight]);
        assert.ok(m[0] <= b && m[1] <= h, `Board @${b}: ${m}`);
      }
      await beamer.page.setViewportSize({ width: 375, height: 812 });
      await beamer.page.waitForTimeout(100);
      await ohneUeberlauf(beamer.page, 'Board @375');
      await foto(beamer.page, 'board_375');
      await beamer.page.setViewportSize({ width: 1920, height: 1080 });

      // Neuer Link (Bestätigung) → altes Board meldet „nicht erreichbar“
      await page.click('#panel-board .board-neu');
      await page.click('#board-neu-ja');
      await page.waitForFunction((alt) => {
        const f = document.querySelector('#panel-board .board-link-feld');
        return f && f.value !== alt;
      }, url);
      await beamer.page.clock.runFor(20500);
      await beamer.page.waitForFunction(() => document.documentElement.dataset.board === 'fehlt');
      assert.match(await beamer.page.textContent('#board-hinweis'), /nicht erreichbar/);
      const alt = await beamer.page.goto(url);
      assert.equal(alt.status(), 404);
    } finally {
      await beamer.kontext.close();
    }
    assert.deepEqual(fehlerMeldungen(), []);
  } finally {
    await kontext.close();
  }
});

test('Urkunden: Druckseite mit je einer A4-Seite pro Schüler:in, Auswahl ab Rang, nur Anzeigenamen', async () => {
  const { kontext, page } = await seite(cookies.lehrkraft);
  try {
    await page.goto(server.url + '/lehrkraft?kurs=k:17#urkunden');
    await page.waitForSelector('#ur-oeffnen');
    assert.match(await page.textContent('#ur-anzahl'), /3 Urkunden/);
    const href = await page.getAttribute('#ur-oeffnen', 'href');
    assert.match(href, /^\/lehrkraft\/urkunden\?kurs=k%3A17&datum=\d{4}-\d{2}-\d{2}$/);
    await page.goto(server.url + href);
    await page.waitForFunction(() => document.documentElement.dataset.urkunden === 'bereit');
    const urkunden = await page.$$eval('.urkunde', (u) => u.map((x) => x.textContent));
    assert.equal(urkunden.length, 3);
    assert.match(urkunden[1], /Detektei-Lizenz[\s\S]*Lena K\.[\s\S]*Inf-LK 12[\s\S]*Erreichter Rang: [\s\S]*Beweisstücke: 1 von 7/);
    assert.match(urkunden[1], /und in Datenbanken zu überführen/, 'eA-Zusatz');
    assert.match(urkunden[1], /Frau M\./);
    for (const u of urkunden) assert.doesNotMatch(u, /s:10\d\d/);
    await foto(page, 'urkunden_1440');
    // Druck: Kopf und Steuerung ausgeblendet, A4-Seiten, PDF mit drei Seiten
    await page.emulateMedia({ media: 'print' });
    assert.equal(await page.isHidden('.kopf'), true);
    assert.equal(await page.isHidden('#ur-steuerung'), true);
    const groesse = await page.$eval('.urkunde', (u) => [u.getBoundingClientRect().width, u.getBoundingClientRect().height]);
    assert.ok(Math.abs(groesse[0] - 793.7) < 2 && Math.abs(groesse[1] - 1122.5) < 2, `A4: ${groesse}`);
    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
    const seiten = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
    assert.equal(seiten, 3);
    await page.emulateMedia({ media: 'screen' });
    // Auswahl „ab Rang Meisterdetektiv:in“ → niemand
    await page.selectOption('#ur-ab', 'Meisterdetektiv:in');
    assert.equal(await page.$$eval('.urkunde', (u) => u.length), 0);
    assert.match(await page.textContent('#ur-status'), /Keine/);
    assert.equal(await page.isDisabled('#ur-drucken'), true);
    await page.selectOption('#ur-ab', '');
    for (const [b, h] of [[768, 1024], [375, 812]]) {
      await page.setViewportSize({ width: b, height: h });
      await page.waitForTimeout(100);
      await ohneUeberlauf(page, `Urkunden @${b}`);
      await foto(page, `urkunden_${b}`);
    }
    assert.deepEqual(fehlerMeldungen(), []);
  } finally {
    await kontext.close();
  }
});

test('Materialien und Einstellungen: Downloads nach Rolle, Akte freischalten, Verhör je Akte, Board-Link', async () => {
  const { kontext, page } = await seite(cookies.lehrkraft);
  try {
    await page.goto(server.url + '/lehrkraft?kurs=k:17#materialien');
    await page.waitForSelector('#panel-materialien .material-liste');
    const stufen = await page.$$eval('#panel-materialien .material-liste', (u) => u.map((x) => x.dataset.stufe));
    assert.ok(stufen.includes('schueler') && stufen.includes('lehrkraft'));
    assert.ok(!stufen.includes('original'), 'Originale nur Superadmin');
    const lsg = await page.getAttribute('#panel-materialien a:has-text("Lösung")', 'href');
    const r = await page.request.get(server.url + lsg);
    assert.equal(r.status(), 200);
    await foto(page, 'materialien_1440_hell');

    await reiter(page, 'einstellungen');
    await page.waitForSelector('#ei-speichern');
    await foto(page, 'einstellungen_1440_hell');
    await page.click('label[for="ei-akte-2"]');
    await page.click('#ei-verhoer-offen');
    await page.click('#panel-einstellungen details > summary');
    await page.selectOption('#ei-verhoer-akte-2', 'gesperrt');
    await page.click('label[for="ei-scoreboard"]');
    await page.click('#ei-speichern');
    await page.waitForSelector('#ei-rueckmeldung.ok');
    const e = await page.evaluate(() => fetch('/api/lehrkraft/kurse').then((x) => x.json()));
    const k = e.kurse.find((x) => x.id === 'k:17');
    assert.ok(k.einstellungen.akten.includes(2));
    assert.equal(k.einstellungen.verhoer, 'offen');
    assert.deepEqual(k.einstellungen.verhoerAkten, { 2: 'gesperrt' });
    assert.equal(k.einstellungen.scoreboard, true);
    // gA blendet Akte 5 aus
    await page.click('#ei-niveau-gA');
    assert.equal(await page.isDisabled('#ei-akte-5'), true);
    await page.click('#ei-niveau-eA');
    // Board-Link mit Bestätigung neu erzeugen – Abbrechen ändert nichts
    const vorher = await page.inputValue('#panel-einstellungen .board-link-feld');
    await page.click('#panel-einstellungen .board-neu');
    await page.click('#panel-einstellungen .bestaetigung button:has-text("Abbrechen")');
    assert.equal(await page.inputValue('#panel-einstellungen .board-link-feld'), vorher);
    await page.click('#panel-einstellungen .board-neu');
    await page.click('#board-neu-ja');
    await page.waitForFunction((v) => document.querySelector('#panel-einstellungen .board-link-feld').value !== v, vorher);
    // Tastatur in der Reiterleiste
    await page.focus('#reiter-einstellungen');
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.getAttribute('#reiter-auswertung', 'aria-selected'), 'true');
    await page.keyboard.press('Home');
    assert.equal(await page.getAttribute('#reiter-uebersicht', 'aria-selected'), 'true');

    // Layout aller Reiter, hell und dunkel
    for (const dunkel of [false, true]) {
      const s = await seite(cookies.lehrkraft, { dunkel });
      try {
        for (const r of ['uebersicht', 'einstellungen', 'live', 'board', 'urkunden', 'materialien']) {
          await s.page.goto(server.url + '/lehrkraft?kurs=k:17#' + r);
          await s.page.waitForSelector(`#panel-${r}:not([hidden]) > :not(.lk-laedt)`);
          if (r === 'live') await s.page.waitForSelector('#panel-live .live-steuerung > :not(.laedt)');
          for (const [b, h] of [[1440, 900], [1024, 768], [768, 1024], [375, 812]]) {
            await s.page.setViewportSize({ width: b, height: h });
            await s.page.waitForTimeout(80);
            await ohneUeberlauf(s.page, `${r} @${b}${dunkel ? ' dunkel' : ''}`);
            const klein = await s.page.evaluate(() =>
              [...document.querySelectorAll('main .knopf, main .lk-reiter-knopf, main .segment-knopf, main .vorschau-eintrag')]
                .filter((x) => x.offsetParent !== null)
                .map((x) => ({ t: x.textContent.trim().slice(0, 30), h: x.getBoundingClientRect().height }))
                .filter((x) => x.h < 43.5)
            );
            assert.deepEqual(klein, [], `${r} @${b}: Touch-Ziele unter 44 px`);
            if (FOTOS && (b !== 1024 || r === 'uebersicht' || r === 'einstellungen')) {
              await s.page.screenshot({ path: path.join(FOTO_ORDNER, `lehrkraft_${r}_${b}_${dunkel ? 'dunkel' : 'hell'}.png`), fullPage: true });
            }
          }
        }
        await s.page.setViewportSize({ width: 1440, height: 900 });
        await s.page.goto(server.url + '/lehrkraft?kurs=k:17#auswertung');
        await s.page.waitForSelector('table.matrix');
        if (FOTOS) await s.page.screenshot({ path: path.join(FOTO_ORDNER, `lehrkraft_auswertung_1440_${dunkel ? 'dunkel' : 'hell'}.png`), fullPage: true });
      } finally {
        await s.kontext.close();
      }
    }
    assert.deepEqual(fehlerMeldungen(), []);
  } finally {
    await kontext.close();
  }
});

test('Superadmin: System-Reiter (Seed-Bericht, Inhalte neu laden, Sicherung) und Originale', async () => {
  const cookie = await server.anmelden(ADMIN);
  const { kontext, page } = await seite(cookie);
  try {
    await page.goto(server.url + '/lehrkraft?kurs=k:17');
    await page.waitForSelector('#reiter-system:not([hidden])');
    await reiter(page, 'system');
    await page.waitForSelector('#sy-bericht table');
    assert.match(await page.textContent('#sy-bericht'), /akte_beispiel\.json/);
    await page.click('#sy-neu-laden');
    await page.click('#sy-neu-ja');
    await page.waitForSelector('#panel-system .rueckmeldung.ok');
    const sicherung = await page.getAttribute('#sy-sicherung-link', 'href');
    const r = await page.request.get(server.url + sicherung);
    assert.equal(r.status(), 200);
    assert.equal((await r.body()).subarray(0, 15).toString(), 'SQLite format 3');
    assert.ok((await page.$$('#sy-originale a[href^="/material/original-zip/"]')).length >= 1);
    await foto(page, 'system_1440_hell');
    await reiter(page, 'materialien');
    const stufen = await page.$$eval('#panel-materialien .material-liste', (u) => u.map((x) => x.dataset.stufe));
    assert.ok(stufen.includes('original'));
    for (const [b, h] of [[768, 1024], [375, 812]]) {
      await page.setViewportSize({ width: b, height: h });
      await page.goto(server.url + '/lehrkraft?kurs=k:17#system');
      await page.waitForSelector('#sy-bericht table');
      await ohneUeberlauf(page, `System @${b}`);
      await foto(page, `system_${b}_hell`);
    }
    assert.deepEqual(fehlerMeldungen(), []);
  } finally {
    await kontext.close();
  }
});
