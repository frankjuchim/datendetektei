'use strict';
// E2E (Chromium, playwright-core): Video-Link-Knöpfe (Spec §13, Plan Phase 7 Task 11) mit Test-Links – Themenseite
// (anonym, je Akte nach DS), Ermittlung A1-E1 (Schülerin, im Briefing) und Lehrkraft-Reiter Materialien. Jeder Knopf
// ist ein <a href> auf https://www.youtube.com/watch?v=… mit target _blank und rel „noopener noreferrer“; keine iframes,
// keine CSP-Meldungen, kein horizontales Scrollen bei 375 px, Touch-Ziel ≥ 44 px. Video ohne url erscheint nicht.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');
const { starteTestServer } = require('./testserver');

const CHROMIUM = require('./chromium').chromiumPfad();
const LINK0 = 'https://www.youtube.com/watch?v=abcDEF1234Q';
const LINK1 = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
const VIDEOS = {
  version: 1,
  videos: [
    { nr: 0, titel: 'So ermittelst du in der Datendetektei', akte: 0, ds: [1], niveau: 'beide', url: 'https://youtu.be/abcDEF1234Q?si=xyz' },
    { nr: 1, titel: 'SQL-Grundlagen: SELECT, WHERE und die Bedingungsfallen', akte: 1, ds: [1, 2], niveau: 'beide', url: LINK1 },
    { nr: 2, titel: 'Verbund ohne JOIN', akte: 2, ds: [3, 4], niveau: 'beide', url: null }
  ]
};
const LEHRKRAFT = { sub: 'l:7', rolle: 'lehrkraft', name: 'Frau M.', kurse: [{ id: 'k:17', name: 'Inf-LK 12', rolle: 'lehrkraft' }] };

const FOTOS = process.env.SCREENSHOTS === '1';
const FOTO_ORDNER = path.join(__dirname, '..', '..', 'docs', 'screenshots', 'phase7');
async function foto(page, name, selektor) {
  if (!FOTOS) return;
  fs.mkdirSync(FOTO_ORDNER, { recursive: true });
  await page.locator(selektor).screenshot({ path: path.join(FOTO_ORDNER, `videos_${name}.png`) });
}

let browser;
let server;

test.before(async () => {
  browser = await chromium.launch({ executablePath: CHROMIUM });
  server = await starteTestServer({ mitInhalten: true, videos: VIDEOS });
});

test.after(async () => {
  if (browser) await browser.close();
  if (server) await server.schliessen();
});

async function seite(cookie, breite = 1200) {
  const context = await browser.newContext({ viewport: { width: breite, height: 900 } });
  if (cookie) {
    const [name, wert] = cookie.split(/=(.*)/s);
    await context.addCookies([{ name, value: wert, url: server.url }]);
  }
  const page = await context.newPage();
  const meldungen = [];
  page.on('console', (m) => {
    if (/Content Security Policy|Refused to/i.test(m.text())) meldungen.push(m.text());
  });
  page.on('pageerror', (e) => meldungen.push(e.message));
  return { context, page, meldungen };
}

/** Alle Video-Knöpfe unter selektor: href, target, rel, Text, Höhe; dazu Anzahl iframes. */
const knoepfe = (page, selektor) =>
  page.$$eval(`${selektor} a.video-knopf`, (as) =>
    as.map((a) => ({ href: a.href, target: a.target, rel: a.rel, text: a.textContent.trim(), h: a.getBoundingClientRect().height, tag: a.tagName }))
  );

function pruefeKnoepfe(liste, erwartet) {
  assert.deepEqual(liste.map((k) => k.href), erwartet);
  for (const k of liste) {
    assert.equal(k.tag, 'A');
    assert.equal(k.target, '_blank');
    assert.equal(k.rel, 'noopener noreferrer');
    assert.match(k.text, /^Video \d: .+ \(YouTube\)$/);
    assert.ok(k.h >= 43.5, `Touch-Ziel ${k.h}px`);
  }
}

test('Themenseite (anonym): Video-Knöpfe je Akte, nur mit Link, kein Embed', async () => {
  for (const breite of [1200, 375]) {
    const t = await seite(null, breite);
    try {
      await t.page.goto(server.url + '/themen');
      await t.page.waitForFunction(() => document.documentElement.dataset.themen === 'bereit', null, { timeout: 20000 });
      pruefeKnoepfe(await knoepfe(t.page, '#akte-1'), [LINK0, LINK1]);
      assert.deepEqual(await knoepfe(t.page, '#akte-2'), [], 'Video 2 ohne url');
      await foto(t.page, `themen_${breite}`, '#akte-1');
      assert.equal(await t.page.locator('iframe, embed, object').count(), 0);
      const ueberlauf = await t.page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      assert.ok(ueberlauf <= 0, `horizontales Scrollen bei ${breite}px (${ueberlauf})`);
      assert.deepEqual(t.meldungen, []);
    } finally {
      await t.context.close();
    }
  }
});

test('Ermittlung A1-E1 (Schülerin): Video-Knöpfe im Briefing', async () => {
  const cookie = await server.anmelden({});
  const t = await seite(cookie, 375);
  try {
    await t.page.goto(server.url + '/ermittlung/A1-E1');
    await t.page.waitForSelector('#ermittlung-videos a.video-knopf', { state: 'attached', timeout: 20000 });
    const box = t.page.locator('details.briefing-box');
    if (!(await box.evaluate((d) => d.open))) await box.locator('summary').click();
    pruefeKnoepfe(await knoepfe(t.page, '#ermittlung-videos'), [LINK0, LINK1]);
    await foto(t.page, 'ermittlung_375', 'details.briefing-box');
    const ueberlauf = await t.page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(ueberlauf <= 0, `horizontales Scrollen (${ueberlauf})`);
    assert.equal(await t.page.locator('iframe').count(), 0);
    assert.deepEqual(t.meldungen, []);
  } finally {
    await t.context.close();
  }
});

test('Lehrkraft-Reiter Materialien: Abschnitt Erklärvideos mit Link-Knöpfen', async () => {
  const cookie = await server.anmelden(LEHRKRAFT);
  const t = await seite(cookie);
  try {
    await t.page.goto(server.url + '/lehrkraft?kurs=k:17#materialien');
    await t.page.waitForSelector('#ma-videos a.video-knopf', { timeout: 20000 });
    pruefeKnoepfe(await knoepfe(t.page, '#ma-videos'), [LINK0, LINK1]);
    await foto(t.page, 'lehrkraft_materialien', '#ma-videos');
    assert.deepEqual(t.meldungen, []);
  } finally {
    await t.context.close();
  }
});
