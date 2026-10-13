'use strict';
// E2E (Chromium, playwright-core): Gastmodus /gast (Plan Phase 3 Task 10) unter der echten CSP mit echter Eisdiele,
// Sandbox und SQL-Prüfer: sql-Aufgabe falsch → Rückmeldung, richtig → gelöst; Auswahl- und Zeilen-Aufgabe; Tipp;
// Lösung zeigen; Lehrkraft-Demo; Themenseite aus dem Seed. Keine CSP-Meldungen, kein horizontales Scrollen.
// SCREENSHOTS=1 legt Fotos unter docs/screenshots/phase3/ ab.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright-core');
const { testApp } = require('../helpers');
const { ladeDatenbanken } = require('../../src/sql/datenbanken');
const { erzeugeSandbox } = require('../../src/sql/sandbox');
const { erzeugePruefer } = require('../../src/sql/pruefer');
const { erzeugeInhalte } = require('../../src/services/inhalte');

const CHROMIUM = require('./chromium').chromiumPfad();
const SCREENSHOTS = process.env.SCREENSHOTS === '1';
const ZIEL = path.join(__dirname, '..', '..', 'docs', 'screenshots', 'phase3');

let browser;
let server;
let sandbox;
let url;

test.before(async () => {
  browser = await chromium.launch({ executablePath: CHROMIUM });
  const datenbanken = ladeDatenbanken(undefined, { log: () => {} });
  sandbox = erzeugeSandbox({
    prozesse: 1,
    datenbanken: Object.fromEntries(datenbanken.namen.map((n) => [n, { haupt: datenbanken.haupt(n), varianten: datenbanken.varianten(n) }]))
  });
  const pruefer = erzeugePruefer({
    sandbox,
    schemata: Object.fromEntries(datenbanken.namen.map((n) => [n, datenbanken.schema(n)]))
  });
  let weiter = (req, res) => {
    res.statusCode = 503;
    res.end();
  };
  server = http.createServer((req, res) => weiter(req, res));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  url = `http://127.0.0.1:${server.address().port}`;
  const t = testApp({ plattformUrl: url }, (db) => {
    const inhalte = erzeugeInhalte(db);
    inhalte.laden();
    return { datenbanken, sandbox, pruefer, inhalte };
  });
  weiter = t.app;
});

test.after(async () => {
  if (browser) await browser.close();
  if (sandbox) sandbox.beende();
  if (server) {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});

async function oeffne(pfad, { breite = 1280, hoehe = 900, dunkel = false } = {}) {
  const context = await browser.newContext({ viewport: { width: breite, height: hoehe }, colorScheme: dunkel ? 'dark' : 'light' });
  const page = await context.newPage();
  const meldungen = [];
  page.on('console', (m) => meldungen.push(m.text()));
  page.on('pageerror', (e) => meldungen.push(`pageerror: ${e.message}`));
  await page.goto(url + pfad);
  const csp = () => meldungen.filter((m) => /Content Security Policy|Content-Security-Policy|unsafe-eval|pageerror/i.test(m));
  return { context, page, meldungen, csp };
}

async function tippe(page, sql) {
  await page.click('#sql-eingabe');
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Delete');
  await page.keyboard.type(sql);
}

const ueberlauf = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test('Probefall: sql-Aufgabe falsch → Rückmeldung, richtig → gelöst; keine CSP-Meldungen', async () => {
  const { context, page, csp } = await oeffne('/gast#G-04');
  try {
    await page.waitForFunction(() => document.documentElement.dataset.gast === 'bereit', null, { timeout: 20000 });
    assert.equal(await page.textContent('#aufgabe-titel'), 'Kassensturz am Sonntag');
    assert.equal(await page.isVisible('#konsole'), true);
    assert.match(await page.textContent('.banner'), /Nichts wird gespeichert/);
    assert.equal(await page.$$eval('#gast-aufgaben .aufgabe-kachel', (k) => k.length), 6);

    // falsch: Verbundbedingung fehlt
    await tippe(page, "SELECT Sorte.Name, Verkauf.Kugeln\nFROM Sorte, Verkauf\nWHERE Verkauf.Datum = '2026-07-12'");
    await page.click('#k-ausfuehren');
    await page.waitForSelector('#ergebnis table');
    await page.click('#k-pruefen');
    await page.waitForSelector('#rueckmeldung .rueckmeldung-box.falsch');
    const rm = await page.textContent('#rueckmeldung');
    assert.match(rm, /Noch nicht/);
    assert.match(rm, /80 Zeilen/);
    assert.equal(await page.isVisible('#loesung'), false);

    // Tipp
    await page.click('#k-tipp');
    await page.waitForSelector('#tipps .tipp');
    assert.match(await page.textContent('#tipps'), /Fremdschlüssel/);

    // richtig
    await tippe(page, "SELECT Sorte.Name, Verkauf.Kugeln\nFROM Sorte, Verkauf\nWHERE Sorte.SorteNr = Verkauf.SorteNr\n  AND Verkauf.Datum = '2026-07-12'");
    await page.click('#k-pruefen');
    await page.waitForSelector('#rueckmeldung .rueckmeldung-box.richtig');
    assert.match(await page.textContent('#rueckmeldung'), /Sauber ermittelt/);
    await page.waitForSelector('#loesung:not([hidden])');
    assert.match(await page.textContent('#loesung'), /8 Verkäufe/);
    assert.match(await page.textContent('#aufgabe-stempel'), /Gelöst/);
    assert.match(await page.textContent('.aufgabe-kachel[data-id="G-04"]'), /Gelöst/);
    assert.deepEqual(csp(), []);
  } finally {
    await context.close();
  }
});

test('Probefall: Auswahl und Zeilen antippen, Lösung zeigen, Lehrkraft-Demo', async () => {
  const { context, page, csp } = await oeffne('/gast');
  try {
    await page.waitForFunction(() => document.documentElement.dataset.gast === 'bereit', null, { timeout: 20000 });
    // G-05 Auswahl
    await page.click('.aufgabe-kachel[data-id="G-05"]');
    await page.waitForSelector('.auswahl-option[data-id="a"]');
    assert.equal(await page.isVisible('#konsole'), false);
    await page.click('.auswahl-option[data-id="a"]');
    await page.click('#k-pruefen');
    await page.waitForSelector('#rueckmeldung .falsch');
    await page.click('.auswahl-option[data-id="b"]');
    await page.click('#k-pruefen');
    await page.waitForSelector('#rueckmeldung .richtig');
    assert.match(await page.textContent('#loesung'), /Beide haben recht/);

    // G-03 Zeilen antippen (Schokolade, Schoko-Minze)
    await page.click('.aufgabe-kachel[data-id="G-03"]');
    await page.waitForSelector('input[name="zeilen-wahl"]');
    const boxen = await page.$$('input[name="zeilen-wahl"]');
    assert.equal(boxen.length, 10);
    await boxen[1].check();
    await boxen[9].check();
    await page.click('#k-pruefen');
    await page.waitForSelector('#rueckmeldung .richtig');

    // G-06 Lösung zeigen
    await page.click('.aufgabe-kachel[data-id="G-06"]');
    await page.waitForSelector('#konsole:not([hidden])');
    await page.click('#k-loesung');
    await page.waitForSelector('#loesung:not([hidden])');
    assert.match(await page.textContent('#loesung'), /HAVING/);
    assert.match(await page.textContent('#aufgabe-stempel'), /Angesehen/);

    // Lehrkraft-Demo
    await page.waitForSelector('#lehrkraft-inhalt .demo-kurs');
    assert.match(await page.textContent('#lehrkraft-inhalt'), /Demo-Kurs Inf 12/);
    assert.match(await page.textContent('#lehrkraft-inhalt'), /Lena K\./);
    assert.deepEqual(csp(), []);
  } finally {
    await context.close();
  }
});

test('Gast und Themen: Handy ohne horizontales Scrollen; Themenseite aus dem Seed', async () => {
  for (const [breite, name] of [[375, 'handy'], [768, 'tablet'], [1440, 'desktop']]) {
    for (const dunkel of [false, true]) {
      const g = await oeffne('/gast', { breite, hoehe: 900, dunkel });
      try {
        await g.page.waitForFunction(() => document.documentElement.dataset.gast === 'bereit', null, { timeout: 20000 });
        await g.page.waitForSelector('#lehrkraft-inhalt .demo-kurs');
        assert.ok((await ueberlauf(g.page)) <= 0, `/gast ${breite}: Überlauf`);
        if (SCREENSHOTS) {
          fs.mkdirSync(ZIEL, { recursive: true });
          await g.page.screenshot({ path: path.join(ZIEL, `gast_${name}_${dunkel ? 'dunkel' : 'hell'}.png`), fullPage: true });
        }
        assert.deepEqual(g.csp(), []);
      } finally {
        await g.context.close();
      }
      const t = await oeffne('/themen', { breite, hoehe: 900, dunkel });
      try {
        await t.page.waitForFunction(() => document.documentElement.dataset.themen === 'bereit', null, { timeout: 20000 });
        assert.equal(await t.page.$$eval('.akte-thema', (a) => a.length), 8);
        assert.equal(await t.page.getAttribute('#akte-1', 'data-status'), 'offen');
        assert.equal(await t.page.getAttribute('#akte-4', 'data-status'), 'offen');
        assert.equal(await t.page.getAttribute('#akte-6', 'data-status'), 'folgt');
        assert.equal(await t.page.$$eval('#niveaus-zeilen tr', (z) => z.length), 9);
        assert.ok((await t.page.$$eval('#akte-1 .chip', (c) => c.length)) > 3, 'Kompetenzen Akte 1');
        assert.ok((await ueberlauf(t.page)) <= 0, `/themen ${breite}: Überlauf`);
        if (SCREENSHOTS) await t.page.screenshot({ path: path.join(ZIEL, `themen_${name}_${dunkel ? 'dunkel' : 'hell'}.png`), fullPage: true });
        assert.deepEqual(t.csp(), []);
      } finally {
        await t.context.close();
      }
    }
  }
});
