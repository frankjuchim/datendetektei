'use strict';
// E2E Rangliste als eigene Seite (/rangliste) und Link „Rangliste“ in der Lern-Navigation (Entscheidung Frank, 0.8.2):
// Link auf allen Seiten mit lern-nav zwischen Training und Themen – für Schüler:innen nur bei eingeschalteter Rangliste,
// für Lehrkräfte immer (Vorschau); /rangliste mit Top 10 + eigenem Platz, Meldung bei ausgeschaltetem Schalter,
// Lehrkraft-Vorschau mit Hinweis; Smartphone 390 px ohne waagerechtes Scrollen (die lern-nav scrollt in sich),
// Touch-Ziele ≥ 44 px, hell und dunkel; Link „Rangliste ansehen“ im Lehrkraft-Bereich (Einstellungen).
// SCREENSHOTS=1 → docs/screenshots/phase8/rangliste_*.png.

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');
const { starteTestServer } = require('./testserver');

const CHROMIUM = require('./chromium').chromiumPfad();
const FOTOS = process.env.SCREENSHOTS === '1';
const FOTO_ORDNER = path.join(__dirname, '..', '..', 'docs', 'screenshots', 'phase8');
const LEHRKRAFT = { sub: 'l:7', rolle: 'lehrkraft', name: 'Frau M.', kurse: [{ id: 'k:17', name: 'Inf-LK 12', rolle: 'lehrkraft' }] };
/** Alle Seiten mit lern-nav (public/*.html; test/seiten.test.js prüft die HTML-Dateien). */
const LERN_SEITEN = ['/', '/pinnwand', '/warmup', '/training', '/rangliste', '/akte/1', '/ermittlung/A1-E1', '/verhoer/1', '/live'];

let browser;
let server;

function einstellen(einstellungen) {
  const db = server.t.db;
  const alt = JSON.parse(db.prepare('SELECT einstellungen FROM kurse WHERE kurs_id = ?').get('k:17').einstellungen);
  db.prepare('UPDATE kurse SET einstellungen = ? WHERE kurs_id = ?').run(JSON.stringify({ ...alt, ...einstellungen }), 'k:17');
}

test.before(async () => {
  if (FOTOS) fs.mkdirSync(FOTO_ORDNER, { recursive: true });
  browser = await chromium.launch({ executablePath: CHROMIUM });
  server = await starteTestServer({ mitInhalten: true });
  await server.anmelden({}); // Lena K. (s:1042) in k:17, 0 Punkte – neuer Kurs: Rangliste nach Standard an
  await server.anmelden(LEHRKRAFT);
  const db = server.t.db;
  const konto = db.prepare("INSERT INTO konten (sub, name, rolle, zuletzt) VALUES (?, ?, 'schueler', '2026-10-13T08:00:00Z')");
  const mitglied = db.prepare("INSERT INTO mitgliedschaften (sub, kurs_id, rolle) VALUES (?, 'k:17', 'mitglied')");
  const punkte = db.prepare("INSERT INTO training (sub, kurs_id, tag, anzahl, punkte) VALUES (?, 'k:17', '2026-10-13', 1, ?)");
  const namen = ['Ada B.', 'Ben C.', 'Cleo D.', 'Dario E.', 'Ella F.', 'Finn G.', 'Greta H.', 'Hugo J.', 'Ida L.', 'Jonas N.', 'Kira P.', 'Lio S.'];
  namen.forEach((n, i) => {
    konto.run(`s:${5000 + i}`, n);
    mitglied.run(`s:${5000 + i}`);
    punkte.run(`s:${5000 + i}`, 240 - 15 * i);
  });
  einstellen({ akten: [1, 2] });
});

test.after(async () => {
  if (browser) await browser.close();
  if (server) await server.schliessen();
});

async function kontextFuer(wer = {}, { breite = 1366, hoehe = 900, thema = 'light' } = {}) {
  const cookie = await server.anmelden(wer);
  const kontext = await browser.newContext({ viewport: { width: breite, height: hoehe }, reducedMotion: 'reduce', colorScheme: thema });
  const [name, wert] = cookie.split(/=(.*)/s);
  await kontext.addCookies([{ name, value: wert, url: server.url }]);
  const page = await kontext.newPage();
  const fehler = [];
  page.on('pageerror', (e) => fehler.push(e.message));
  return { kontext, page, fehler };
}

/** Lädt eine Seite und wartet, bis die Kopfzeile /api/ich ausgewertet hat (danach steht der Link-Zustand fest). */
async function oeffne(page, pfad) {
  await page.goto(server.url + pfad);
  await page.waitForSelector('#ich:not([hidden])');
}

const navLink = (page) => page.locator('nav.lern-nav a[href="/rangliste"]');

test('Neuer Kurs: Rangliste nach Standard an – Link auf allen Seiten mit lern-nav, zwischen Training und Themen', { timeout: 120000 }, async () => {
  const { kontext, page, fehler } = await kontextFuer();
  try {
    for (const pfad of LERN_SEITEN) {
      await oeffne(page, pfad);
      const link = navLink(page);
      await link.waitFor({ state: 'visible' });
      const hrefs = await page.$$eval('nav.lern-nav a', (as) => as.map((a) => a.getAttribute('href')));
      const i = hrefs.indexOf('/rangliste');
      assert.deepEqual([hrefs[i - 1], hrefs[i + 1]], ['/training', '/themen'], pfad);
      assert.equal(await link.getAttribute('aria-current'), pfad === '/rangliste' ? 'page' : null, pfad);
    }
    assert.deepEqual(fehler, []);
  } finally {
    await kontext.close();
  }
});

test('/rangliste (Schülerin): Top 10, Lücke und eigener Platz – eigene Zeile hervorgehoben', { timeout: 60000 }, async () => {
  einstellen({ scoreboard: true });
  const { kontext, page, fehler } = await kontextFuer();
  try {
    await oeffne(page, '/rangliste');
    await page.waitForSelector('html[data-seite="bereit"]');
    assert.equal(await page.locator('h1').textContent(), 'Rangliste deines Kurses');
    const liste = page.locator('#kurs-rangliste');
    const zeilen = liste.locator('.rang-zeile');
    assert.equal(await zeilen.count(), 11);
    assert.equal(await liste.locator('.rang-luecke').count(), 1);
    const ich = liste.locator('.rang-zeile.ich');
    assert.equal(await ich.count(), 1);
    assert.match(await ich.textContent(), /Lena K\.\s*\(du\)/);
    assert.equal(await ich.getAttribute('aria-current'), 'true');
    assert.equal(await ich.locator('.rang-platz').textContent(), '13.');
    for (const z of await zeilen.all()) assert.ok((await z.boundingBox()).height >= 44);
    if (FOTOS) await page.screenshot({ path: path.join(FOTO_ORDNER, 'rangliste_seite_hell.png') });
    assert.deepEqual(fehler, []);
  } finally {
    await kontext.close();
  }
});

test('Schalter aus: Schülerin sieht keinen Link und auf /rangliste eine freundliche Meldung (ohne API-Anfrage)', { timeout: 120000 }, async () => {
  einstellen({ scoreboard: false });
  const { kontext, page, fehler } = await kontextFuer();
  const anfragen = [];
  page.on('request', (r) => anfragen.push(r.url()));
  try {
    for (const pfad of LERN_SEITEN) {
      await oeffne(page, pfad);
      assert.equal(await navLink(page).isHidden(), true, pfad);
    }
    await oeffne(page, '/rangliste');
    await page.waitForSelector('html[data-seite="bereit"]');
    assert.match(await page.locator('#seite').textContent(), /Deine Lehrkraft hat die Rangliste für diesen Kurs nicht eingeschaltet\./);
    assert.equal(await page.locator('.rang-zeile').count(), 0);
    assert.ok(!anfragen.some((u) => /\/api\/kurse\/[^/]+\/rangliste/.test(u)), 'keine Anfrage an …/rangliste');
    assert.deepEqual(fehler, []);
  } finally {
    await kontext.close();
    einstellen({ scoreboard: true });
  }
});

test('Lehrkraft: Link immer sichtbar; bei ausgeschaltetem Schalter Vorschau mit Hinweis (gesiezt) und Weg zu den Einstellungen', { timeout: 120000 }, async () => {
  einstellen({ scoreboard: false });
  const { kontext, page, fehler } = await kontextFuer(LEHRKRAFT);
  try {
    for (const pfad of ['/', '/training', '/rangliste']) {
      await oeffne(page, pfad);
      await navLink(page).waitFor({ state: 'visible' });
    }
    await page.waitForSelector('html[data-seite="bereit"]');
    assert.equal(await page.locator('h1').textContent(), 'Rangliste des Kurses');
    const hinweis = page.locator('.rangliste-aus-hinweis');
    assert.match(await hinweis.textContent(), /Ihre Schülerinnen und Schüler sehen sie nicht/);
    assert.equal(await hinweis.locator('a').getAttribute('href'), '/lehrkraft?kurs=k%3A17#einstellungen');
    assert.equal(await page.locator('.rang-zeile').count(), 10);
    assert.equal(await page.locator('.rang-zeile.ich').count(), 0);
    assert.ok(!(await page.locator('#seite').textContent()).includes('Frau M.'));
    // Lehrkraft-Bereich: „Rangliste ansehen“ beim Scoreboard-Schalter
    await page.goto(server.url + '/lehrkraft?kurs=k:17#einstellungen');
    const link = page.locator('#ei-rangliste-link');
    await link.waitFor();
    assert.equal(await link.getAttribute('href'), '/rangliste?kurs=k%3A17');
    assert.ok((await link.boundingBox()).height >= 44);
    assert.deepEqual(fehler, []);
  } finally {
    await kontext.close();
    einstellen({ scoreboard: true });
  }
});

test('Smartphone 390 px (dunkel): /rangliste ohne waagerechtes Scrollen, lern-nav scrollt in sich, Touch ≥ 44 px', { timeout: 60000 }, async () => {
  einstellen({ scoreboard: true });
  const { kontext, page, fehler } = await kontextFuer({}, { breite: 390, hoehe: 844, thema: 'dark' });
  try {
    for (const pfad of ['/', '/rangliste']) {
      await oeffne(page, pfad);
      await page.waitForSelector('html[data-seite="bereit"]');
      const breit = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert.ok(breit <= 0, `${pfad}: waagerecht scrollbar um ${breit} px`);
      const nav = await page.locator('nav.lern-nav').boundingBox();
      assert.ok(nav.x >= 0 && nav.x + nav.width <= 390, `${pfad}: lern-nav passt in die Breite`);
      for (const a of await page.locator('nav.lern-nav a:visible').all()) assert.ok((await a.boundingBox()).height >= 44, pfad);
    }
    const link = navLink(page);
    await link.scrollIntoViewIfNeeded();
    assert.ok(await link.isVisible());
    const ich = page.locator('.rang-zeile.ich');
    await ich.scrollIntoViewIfNeeded();
    const box = await ich.boundingBox();
    assert.ok(box.x >= 0 && box.x + box.width <= 390, 'eigene Zeile passt in die Breite');
    if (FOTOS) await page.screenshot({ path: path.join(FOTO_ORDNER, 'rangliste_390_dunkel.png') });
    assert.deepEqual(fehler, []);
  } finally {
    await kontext.close();
  }
});
