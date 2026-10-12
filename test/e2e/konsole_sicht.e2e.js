'use strict';
// Sichtprüfung der Ermittlungskonsole (Plan Phase 2 Task 12, DESIGN.md §6/§7): iPad quer/hoch (Touch), Chromebook,
// Handy; je hell und dunkel. Geprüft wird: kein horizontales Scrollen der Seite, Touch-Ziele ≥ 44 px (Schema-Spalten
// ≥ 36 px sichtbar + 44 px Trefferfläche), Konsole in beiden Themes dunkel, Schema unter dem Editor bei schmaler
// Konsole. Mit SCREENSHOTS=1 werden die Bildschirmfotos nach docs/screenshots/phase2/ geschrieben (Abnahme).

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');
const { starteTestServer } = require('./testserver');

const CHROMIUM = process.env.CHROMIUM_PFAD || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const ZIEL = path.join(__dirname, '..', '..', 'docs', 'screenshots', 'phase2');
const FOTOS = process.env.SCREENSHOTS === '1';

const GERAETE = [
  { name: 'ipad_quer', viewport: { width: 1024, height: 768 }, touch: true },
  { name: 'ipad_hoch', viewport: { width: 768, height: 1024 }, touch: true },
  { name: 'chromebook', viewport: { width: 1366, height: 768 }, touch: false },
  { name: 'handy', viewport: { width: 375, height: 812 }, touch: true }
];
const SQL = "SELECT Name, Preis, Vegan\nFROM Sorte\nWHERE Vegan <> 'nein'\nORDER BY Preis DESC";

let browser;
let server;

test.before(async () => {
  browser = await chromium.launch({ executablePath: CHROMIUM });
  server = await starteTestServer({ mitDatenbanken: true });
  if (FOTOS) fs.mkdirSync(ZIEL, { recursive: true });
});

test.after(async () => {
  if (browser) await browser.close();
  if (server) await server.schliessen();
});

async function neueSeite(geraet, thema) {
  const context = await browser.newContext({
    viewport: geraet.viewport,
    hasTouch: geraet.touch,
    isMobile: geraet.touch,
    deviceScaleFactor: 1,
    colorScheme: thema === 'dunkel' ? 'dark' : 'light'
  });
  return { context, page: await context.newPage() };
}

/** Prüfungen im Browser: Überlauf, Touch-Ziele, Konsole dunkel, Lage des Schemas. */
function pruefeLayout(page) {
  return page.evaluate(() => {
    const sichtbar = (e) => {
      const r = e.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden';
    };
    const zuKlein = [];
    for (const e of document.querySelectorAll('button, a[href], summary, textarea')) {
      if (!sichtbar(e) || e.closest('.nur-sr') || e.classList.contains('springen')) continue;
      const r = e.getBoundingClientRect();
      const schemaSpalte = e.classList.contains('schema-spalte');
      const minH = schemaSpalte ? 36 : 44;
      // Fließtext-Links (Etikett „Freie Ermittlung“) sind keine eigenständigen Ziele
      if (e.classList.contains('etikett-link')) continue;
      if (r.height < minH - 0.5 || (!schemaSpalte && e.tagName !== 'A' && r.width < 44 - 0.5)) {
        zuKlein.push(`${e.tagName.toLowerCase()}#${e.id || ''}.${e.className} ${Math.round(r.width)}×${Math.round(r.height)}`);
      }
    }
    const hell = (farbe) => {
      const m = farbe.match(/\d+(\.\d+)?/g).map(Number);
      return (0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]) / 255;
    };
    const editor = document.querySelector('.editor').getBoundingClientRect();
    const schema = document.querySelector('.schema-browser').getBoundingClientRect();
    return {
      ueberlauf: document.documentElement.scrollWidth - window.innerWidth,
      zuKlein,
      konsoleHelligkeit: hell(getComputedStyle(document.querySelector('.konsole')).backgroundColor),
      schemaUnten: schema.top >= editor.bottom - 1,
      konsoleBreite: document.querySelector('.konsole').getBoundingClientRect().width
    };
  });
}

for (const geraet of GERAETE) {
  for (const thema of ['hell', 'dunkel']) {
    test(`Sichtprüfung ${geraet.name} ${geraet.viewport.width}×${geraet.viewport.height} ${thema}`, async () => {
      const { context, page } = await neueSeite(geraet, thema);
      try {
        await page.goto(`${server.url}/konsole/eisdiele`);
        await page.waitForFunction(() => /läuft (im|auf)/.test(document.getElementById('konsole-modus').textContent));
        await page.waitForSelector('.schema-spalte');
        await page.$eval('#sql-eingabe', (t, sql) => {
          t.value = sql;
          t.dispatchEvent(new Event('input', { bubbles: true }));
        }, SQL);
        await page.waitForSelector('.randmarke');
        await page.click('#k-ausfuehren');
        await page.waitForSelector('#ergebnis table');
        await page.evaluate(() => document.fonts.ready);

        const l = await pruefeLayout(page);
        assert.ok(l.ueberlauf <= 0, `horizontaler Überlauf ${l.ueberlauf} px`);
        assert.deepEqual(l.zuKlein, [], 'Touch-Ziele zu klein');
        assert.ok(l.konsoleHelligkeit < 0.15, `Konsole nicht dunkel (${l.konsoleHelligkeit})`);
        // Container-Query: unter 640 px Konsolenbreite liegt das Schema unter dem Editor
        assert.equal(l.schemaUnten, l.konsoleBreite <= 640, `Schema-Lage bei ${l.konsoleBreite} px`);

        if (FOTOS) {
          await page.screenshot({ path: path.join(ZIEL, `konsole_${geraet.name}_${thema}.png`), fullPage: true });
        }
      } finally {
        await context.close();
      }
    });
  }
}

test('Sichtprüfung Freie Ermittlung auf /themen und angemeldeter Startseite', async () => {
  const cookie = await server.anmelden();
  for (const geraet of [GERAETE[2], GERAETE[3]]) {
    const { context, page } = await neueSeite(geraet, 'hell');
    try {
      const [name, wert] = cookie.split('=');
      await context.addCookies([{ name, value: wert, url: server.url }]);
      await page.goto(`${server.url}/themen#freie-ermittlung`);
      const ueberlauf = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      assert.ok(ueberlauf <= 0, `/themen: Überlauf ${ueberlauf} px`);
      // Kopfzeile für Ausschnitt-Fotos nicht kleben lassen (sonst überdeckt sie den Ausschnitt; CSSOM, kein Inline-Stil)
      const kopfLoesen = () => page.evaluate(() => (document.querySelector('.kopf').style.position = 'static'));
      if (FOTOS) {
        await kopfLoesen();
        const abschnitt = await page.$('#freie-ermittlung');
        await abschnitt.screenshot({ path: path.join(ZIEL, `themen_freie_ermittlung_${geraet.name}.png`) });
      }
      await page.goto(`${server.url}/`);
      await page.waitForSelector('#start-angemeldet:not([hidden])');
      const hoehen = await page.$$eval('#start-angemeldet .db-liste a', (a) => a.map((x) => x.getBoundingClientRect().height));
      assert.equal(hoehen.length, 7);
      assert.ok(hoehen.every((h) => h >= 44), hoehen.join());
      if (FOTOS) {
        await kopfLoesen();
        const karte = await page.$('.start-hero');
        await karte.screenshot({ path: path.join(ZIEL, `start_angemeldet_${geraet.name}.png`) });
      }
    } finally {
      await context.close();
    }
  }
});
