'use strict';
// E2E Scoreboard (Vertrag §4, Kurseinstellung scoreboard): Karte „Rangliste deines Kurses“ auf dem Stadtplan.
// Schalter aus → keine Karte, keine Anfrage; Schalter an → kompakt Top 5 + eigener Platz mit Lücke, eigene Zeile
// hervorgehoben, Link „Ganze Rangliste“ (/rangliste, test/e2e/probelauf8_rangliste.e2e.js);
// Smartphone 390 px ohne waagerechtes Scrollen; Lehrkraft sieht die Vorschau (gesiezt, ohne eigene Zeile).
// SCREENSHOTS=1 → docs/screenshots/phase8/scoreboard_*.png.

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
  await server.anmelden({}); // Lena K. (s:1042) in k:17, 0 Punkte
  await server.anmelden(LEHRKRAFT);
  const db = server.t.db;
  const konto = db.prepare("INSERT INTO konten (sub, name, rolle, zuletzt) VALUES (?, ?, 'schueler', '2026-10-13T08:00:00Z')");
  const mitglied = db.prepare("INSERT INTO mitgliedschaften (sub, kurs_id, rolle) VALUES (?, 'k:17', 'mitglied')");
  const punkte = db.prepare("INSERT INTO training (sub, kurs_id, tag, anzahl, punkte) VALUES (?, 'k:17', '2026-10-13', 1, ?)");
  const namen = ['Ada B.', 'Ben C.', 'Cleo D.', 'Dario E.', 'Ella F.', 'Finn G.', 'Greta H.', 'Hugo J.', 'Ida L.', 'Jonas N.', 'Kira P.', 'Lio S.', 'Maja W.'];
  namen.forEach((n, i) => {
    konto.run(`s:${4000 + i}`, n);
    mitglied.run(`s:${4000 + i}`);
    punkte.run(`s:${4000 + i}`, 260 - 15 * i + (i === 2 ? 15 : 0)); // Ben C. und Cleo D. gleichauf
  });
  einstellen({ akten: [1, 2], scoreboard: false });
});

test.after(async () => {
  if (browser) await browser.close();
  if (server) await server.schliessen();
});

async function seite(wer = {}, { breite = 1366, hoehe = 900, thema = 'light' } = {}) {
  const cookie = await server.anmelden(wer);
  const kontext = await browser.newContext({ viewport: { width: breite, height: hoehe }, reducedMotion: 'reduce', colorScheme: thema });
  const [name, wert] = cookie.split(/=(.*)/s);
  await kontext.addCookies([{ name, value: wert, url: server.url }]);
  const page = await kontext.newPage();
  const fehler = [];
  const anfragen = [];
  page.on('pageerror', (e) => fehler.push(e.message));
  page.on('request', (r) => anfragen.push(r.url()));
  await page.goto(server.url + '/');
  await page.waitForSelector('html[data-seite="bereit"]');
  return { kontext, page, fehler, anfragen };
}

test('Schalter aus: keine Rangliste und keine Anfrage danach', { timeout: 60000 }, async () => {
  einstellen({ scoreboard: false });
  const { kontext, page, fehler, anfragen } = await seite();
  try {
    assert.equal(await page.locator('#kurs-rangliste').count(), 0);
    assert.ok(!anfragen.some((u) => /\/api\/kurse\/[^/]+\/rangliste/.test(u)), 'keine Anfrage an …/rangliste');
    assert.deepEqual(fehler, []);
  } finally {
    await kontext.close();
  }
});

test('Schalter an: Top 5, Lücke und eigener Platz – eigene Zeile hervorgehoben, Link zur ganzen Rangliste', { timeout: 60000 }, async () => {
  einstellen({ scoreboard: true });
  const { kontext, page, fehler } = await seite();
  try {
    const karte = page.locator('#kurs-rangliste');
    await karte.waitFor();
    assert.equal(await karte.locator('h2').textContent(), 'Rangliste deines Kurses');
    const zeilen = karte.locator('.rang-zeile');
    assert.equal(await zeilen.count(), 6);
    assert.equal(await karte.locator('.rang-luecke').count(), 1);
    const platz = await zeilen.locator('.rang-platz').allTextContents();
    assert.deepEqual(platz.slice(0, 4), ['1.', '2.', '2.', '4.'], 'Gleichstand → gleicher Platz');
    const ich = karte.locator('.rang-zeile.ich');
    assert.equal(await ich.count(), 1);
    assert.match(await ich.textContent(), /Lena K\.\s*\(du\)/);
    assert.equal(await ich.getAttribute('aria-current'), 'true');
    assert.equal(await ich.locator('.rang-platz').textContent(), '14.');
    const link = karte.locator('a.kurs-rangliste-link');
    assert.equal(await link.getAttribute('href'), '/rangliste');
    assert.match(await link.textContent(), /Ganze Rangliste/);
    assert.ok((await link.boundingBox()).height >= 44);
    const rahmen = await ich.evaluate((e) => getComputedStyle(e).outlineWidth);
    assert.equal(rahmen, '2px');
    const hoehe = await ich.evaluate((e) => e.getBoundingClientRect().height);
    assert.ok(hoehe >= 44, `Zeilenhöhe ${hoehe}`);
    if (FOTOS) await karte.screenshot({ path: path.join(FOTO_ORDNER, 'scoreboard_stadtplan_hell.png') });
    assert.deepEqual(fehler, []);
  } finally {
    await kontext.close();
  }
});

test('Smartphone 390 px (dunkel): Karte sichtbar, kein waagerechtes Scrollen', { timeout: 60000 }, async () => {
  einstellen({ scoreboard: true });
  const { kontext, page, fehler } = await seite({}, { breite: 390, hoehe: 844, thema: 'dark' });
  try {
    const karte = page.locator('#kurs-rangliste');
    await karte.scrollIntoViewIfNeeded();
    assert.ok(await karte.isVisible());
    const breit = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(breit <= 0, `waagerecht scrollbar um ${breit} px`);
    const karteBox = await karte.boundingBox();
    assert.ok(karteBox.x >= 0 && karteBox.x + karteBox.width <= 390, 'Karte passt in die Breite');
    if (FOTOS) await karte.screenshot({ path: path.join(FOTO_ORDNER, 'scoreboard_390_dunkel.png') });
    assert.deepEqual(fehler, []);
  } finally {
    await kontext.close();
  }
});

test('Lehrkraft: Vorschau der Rangliste (gesiezt, ohne eigene Zeile)', { timeout: 60000 }, async () => {
  einstellen({ scoreboard: true });
  const { kontext, page, fehler } = await seite(LEHRKRAFT);
  try {
    const karte = page.locator('#kurs-rangliste');
    await karte.waitFor();
    assert.equal(await karte.locator('h2').textContent(), 'Rangliste des Kurses');
    assert.equal(await karte.locator('.rang-zeile.ich').count(), 0);
    assert.equal(await karte.locator('.rang-zeile').count(), 5);
    assert.match(await karte.textContent(), /Vorschau: Schülerinnen und Schüler sehen/);
    assert.ok(!(await karte.textContent()).includes('Frau M.'));
    assert.deepEqual(fehler, []);
  } finally {
    await kontext.close();
  }
});
