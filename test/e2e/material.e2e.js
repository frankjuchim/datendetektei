'use strict';
// E2E (Chromium, playwright-core): Materialliste der Themenseite (Plan Phase 6 Task 5, E13) mit den Fixture-
// Materialien (test/fixtures/materialien). Anonym: Gast-Auswahl mit Link, übrige Titel „nach Anmeldung“ ohne Link.
// Angemeldet (Schülerin): Schülerfassungen verlinkt, Lehrkraft-Material nicht; Link liefert die PDF. Keine CSP-Meldungen.

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright-core');
const { starteTestServer } = require('./testserver');

const CHROMIUM = require('./chromium').chromiumPfad();
const FIX = path.join(__dirname, '..', 'fixtures', 'materialien');

let browser;
let server;

test.before(async () => {
  browser = await chromium.launch({ executablePath: CHROMIUM });
  server = await starteTestServer({ materialVerzeichnis: FIX });
});

test.after(async () => {
  if (browser) await browser.close();
  if (server) await server.schliessen();
});

async function themen(cookie) {
  const context = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  if (cookie) {
    const [name, wert] = cookie.split(/=(.*)/s);
    await context.addCookies([{ name, value: wert, url: server.url }]);
  }
  const page = await context.newPage();
  const csp = [];
  page.on('console', (m) => {
    if (/Content Security Policy|Refused to/i.test(m.text())) csp.push(m.text());
  });
  await page.goto(server.url + '/themen');
  await page.waitForFunction(() => document.documentElement.dataset.themen === 'bereit', null, { timeout: 20000 });
  const zeilen = () =>
    page.$$eval('.material-themen li', (lis) =>
      lis.map((li) => ({ titel: li.firstChild.textContent, zugang: li.querySelector('.zugang').textContent, href: (li.querySelector('a') || {}).href || null }))
    );
  return { context, page, csp, zeilen };
}

test('Themenseite anonym: Gast-Auswahl verlinkt, Rest „nach Anmeldung“', async () => {
  const t = await themen(null);
  try {
    const z = await t.zeilen();
    const ab1 = z.find((x) => x.titel.startsWith('AB 1.1 Der erste Auftrag'));
    assert.match(ab1.href, /\/gast\/material\/Akte1\/DD_A1-AB1_Der_erste_Auftrag\.pdf$/);
    const ab5 = z.find((x) => x.titel.startsWith('AB 5.1'));
    assert.equal(ab5.href, null);
    assert.equal(ab5.zugang, 'nach Anmeldung');
    assert.match(ab5.titel, /eA$/);
    const r = await t.page.request.get(ab1.href);
    assert.equal(r.status(), 200);
    assert.deepEqual(t.csp, []);
  } finally {
    await t.context.close();
  }
});

test('Themenseite angemeldet (Schülerin): Schülerfassungen verlinkt, Lösung nicht', async () => {
  const cookie = await server.anmelden({});
  const t = await themen(cookie);
  try {
    await t.page.waitForSelector('.material-themen li a[href*="/material/schueler/"]', { timeout: 10000 });
    const z = await t.zeilen();
    const ab5 = z.find((x) => x.titel.startsWith('AB 5.1'));
    assert.match(ab5.href, /\/material\/schueler\/Arbeitsblaetter_PDF\/Akte5\/DD_A5-AB1_Bauplaene_lesen\.pdf$/);
    const lsg = z.find((x) => x.zugang === 'nach Anmeldung (Lehrkraft)');
    assert.ok(lsg, 'Lösung gelistet');
    assert.equal(lsg.href, null);
    const r = await t.page.request.get(ab5.href);
    assert.equal(r.status(), 200);
    assert.equal((await r.body()).toString(), '%PDF-1.4 AB 5.1 nur eA\n');
    assert.deepEqual(t.csp, []);
  } finally {
    await t.context.close();
  }
});
