'use strict';
// E2E (Chromium, playwright-core): Kleinigkeiten aus Phase 3 (Plan Phase 5 Task 9).
// 1. Briefing: jedes Schema genau einmal (datenbank-Kachel, kein zusätzlicher schema-Block mit denselben Relationen).
// 2. Cold Case mit kernpunkte-Teil (A3-E1-CC): lösen, Kernpunkte abhaken, Selbstkontrolle speichern; nach dem
//    Neuladen sind die Häkchen wieder da, der Freitext bleibt nur auf dem Gerät.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');
const { starteTestServer } = require('./testserver');

const CHROMIUM = require('./chromium').chromiumPfad();
const AKTE3 = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'seed', 'akten', 'akte3.json'), 'utf8'));

let browser;
let server;
let context;
let page;
const meldungen = [];

test.before(async () => {
  browser = await chromium.launch({ executablePath: CHROMIUM });
  server = await starteTestServer({ mitInhalten: true });
  const cookie = await server.anmelden({});
  const db = server.t.db;
  const einst = JSON.parse(db.prepare('SELECT einstellungen FROM kurse WHERE kurs_id = ?').get('k:17').einstellungen);
  db.prepare('UPDATE kurse SET einstellungen = ? WHERE kurs_id = ?').run(JSON.stringify({ ...einst, akten: [1, 2, 3] }), 'k:17');
  context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const [name, wert] = cookie.split('=');
  await context.addCookies([{ name, value: wert, url: server.url }]);
  page = await context.newPage();
  page.on('console', (m) => meldungen.push(m.text()));
  page.on('pageerror', (e) => meldungen.push(`pageerror: ${e.message}`));
});

test.after(async () => {
  if (context) await context.close();
  if (browser) await browser.close();
  if (server) await server.schliessen();
});

/** Relationennamen im Briefing (nachdem die Kachel ihr Schema geladen hat). */
async function briefingRelationen(ermittlung, anzahlTabellen) {
  await page.goto(`${server.url}/ermittlung/${ermittlung}`);
  await page.waitForSelector('html[data-seite="bereit"]');
  await page.waitForFunction((n) => document.querySelectorAll('.briefing-innen .db-kachel-tabellen .relation').length === n, anzahlTabellen);
  return page.locator('.briefing-innen .relation-name').allTextContents();
}

test('Briefing: jedes Schema genau einmal', async () => {
  const a1 = await briefingRelationen('A1-E1', 1);
  assert.deepEqual(a1, ['Fundsache']);
  const a2 = await briefingRelationen('A2-E1', 5);
  assert.deepEqual([...a2].sort(), ['Ausleihe', 'Kunde', 'Rad', 'Reparatur', 'Station']);
  assert.equal(await page.locator('.briefing-innen .schema-block').count(), 0);
});

test('Cold Case mit kernpunkte-Teil: lösen, abhaken, Selbstkontrolle speichern, nach dem Neuladen wieder da', async () => {
  const cc = AKTE3.aufgaben.find((a) => a.id === 'A3-E1-CC');
  const url = `${server.url}/ermittlung/A3-E1?aufgabe=A3-E1-CC`;
  await page.goto(url);
  await page.waitForSelector('#aufgabe-karte .reiter:text("A3-E1-CC")');
  const felder = Object.keys(cc.interaktion[0].felder);
  const luecken = page.locator('#aufgabe-karte input.luecke');
  assert.equal(await luecken.count(), felder.length);
  for (let i = 0; i < felder.length; i++) await luecken.nth(i).fill(String(cc.loesung[0][felder[i]][0]));
  const freitext = 'Zwei Abfragen verglichen: alle Stände und Stände mit Bons.';
  await page.fill('#aufgabe-karte textarea.freitext', freitext);
  assert.equal(await page.locator('#aufgabe-karte .kernpunkte input[type="checkbox"]').count(), 0, 'Kernpunkte erst nach dem Lösen');

  await page.click('#k-pruefen');
  await page.waitForSelector('#feedback-richtig');
  const boxen = page.locator('#aufgabe-karte .kernpunkte input[type="checkbox"]');
  await page.waitForFunction((n) => document.querySelectorAll('#aufgabe-karte .kernpunkte input[type="checkbox"]').length === n, cc.interaktion[1].kernpunkte.length);
  assert.equal(await page.locator('#k-kernpunkte').isVisible(), true, 'Knopf „Selbstkontrolle speichern“');
  await boxen.nth(0).check();
  await boxen.nth(1).check();
  await page.click('#k-kernpunkte');
  await page.waitForSelector('.feedback.richtig:has-text("Selbstkontrolle gespeichert")');
  const zeile = server.t.db.prepare("SELECT haken FROM kernpunkte WHERE aufgabe = 'A3-E1-CC'").get();
  assert.equal(zeile && zeile.haken, 2);
  assert.equal(server.t.db.prepare("SELECT status FROM fortschritt WHERE aufgabe = 'A3-E1-CC'").get().status, 'geloest');

  await page.goto(url);
  await page.waitForSelector('#aufgabe-karte .reiter:text("A3-E1-CC")');
  await page.waitForFunction(() => document.querySelectorAll('#aufgabe-karte .kernpunkte input[type="checkbox"]').length > 0);
  assert.equal(await page.locator('#aufgabe-karte .kernpunkte input[type="checkbox"]:checked').count(), 2);
  assert.equal(await page.inputValue('#aufgabe-karte textarea.freitext'), freitext);

  assert.deepEqual(meldungen.filter((m) => m.startsWith('pageerror') || /Content Security Policy/i.test(m)), []);
});
