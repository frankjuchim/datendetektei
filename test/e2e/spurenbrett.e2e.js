'use strict';
// Spurenbrett im Browser (Plan Phase 4 Task 3, DESIGN.md §5.5, §6, §7): StadtRad Rad × Station mit NULL-Fremdschlüssel.
// Zähler vor/nach der Bedingung = src/sql/visual.js auf derselben DB (better-sqlite3), ein Rad ohne Faden, Fäden fallen
// ab (reduziert: nur Ausblenden), Fehlermeldung deutsch, Übergabe per sessionStorage, Eisdiele ohne Anmeldung, keine
// CSP-Meldungen, kein horizontales Scrollen. SCREENSHOTS=1 → docs/screenshots/phase4/spurenbrett_*.png.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');
const { chromium } = require('playwright-core');
const { starteTestServer } = require('./testserver');
const visual = require('../../src/sql/visual');

const CHROMIUM = require('./chromium').chromiumPfad();
const ZIEL = path.join(__dirname, '..', '..', 'docs', 'screenshots', 'phase4');
const FOTOS = process.env.SCREENSHOTS === '1';
const BEDINGUNG = 'Rad.StationID = Station.StationID';

let browser;
let server;
let cookie;

test.before(async () => {
  browser = await chromium.launch({ executablePath: CHROMIUM });
  server = await starteTestServer({ mitDatenbanken: true });
  cookie = await server.anmelden();
  if (FOTOS) fs.mkdirSync(ZIEL, { recursive: true });
});

test.after(async () => {
  if (browser) await browser.close();
  if (server) await server.schliessen();
});

function fuehreAusMit(buffer) {
  const d = new Database(buffer);
  return async (sql) => {
    try {
      const stmt = d.prepare(sql);
      const alle = stmt.raw(true).all();
      return { spalten: stmt.columns().map((c) => c.name), zeilen: alle.slice(0, 300), gesamt: alle.length };
    } catch (e) {
      return { fehler: e.message };
    }
  };
}

async function neueSeite({ viewport = { width: 1280, height: 900 }, thema = 'hell', reduziert = false, angemeldet = true, touch = false } = {}) {
  const context = await browser.newContext({
    viewport,
    hasTouch: touch,
    isMobile: touch,
    deviceScaleFactor: 1,
    colorScheme: thema === 'dunkel' ? 'dark' : 'light',
    reducedMotion: reduziert ? 'reduce' : 'no-preference'
  });
  if (angemeldet) {
    const [name, wert] = cookie.split('=');
    await context.addCookies([{ name, value: wert, url: server.url }]);
  }
  const page = await context.newPage();
  const meldungen = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || /Content Security Policy|CSP/i.test(m.text())) meldungen.push(m.text());
  });
  page.on('pageerror', (e) => meldungen.push(String(e)));
  return { context, page, meldungen };
}

async function warteAufBrett(page) {
  await page.waitForSelector('.sb-karte');
  await page.waitForFunction(() => document.querySelector('#sb-zaehler .sb-rechnung'));
}

async function karten(page, tabelle) {
  return page.$$eval(`.sb-karte[data-tabelle="${tabelle}"]`, (k) => k.map((x) => x.getAttribute('aria-label')));
}

test('StadtRad: Rad × Station, Zähler wie visual.js, NULL-Rad ohne Faden, Fäden fallen ab, Ergebnis + Notiz', async () => {
  const { context, page, meldungen } = await neueSeite();
  try {
    await page.goto(`${server.url}/werkzeug/spurenbrett?db=stadtrad`);
    await warteAufBrett(page);
    assert.deepEqual(await page.$$eval('.sb-stapel-titel', (h) => h.map((x) => x.textContent)), ['Rad', 'Station']);
    assert.equal(await page.inputValue('#sb-bedingung'), BEDINGUNG);
    assert.equal(await page.inputValue('#sb-db'), 'stadtrad');

    // Erwartung aus der Rechenschicht auf derselben DB mit denselben Karten
    const rad = (await karten(page, 0)).map((t) => Number(t.split(' ')[1]));
    const station = (await karten(page, 1)).map((t) => Number(t.split(' ')[1]));
    assert.equal(rad.length, 5);
    assert.equal(station.length, 5);
    const datenbanken = server.t.app.locals.datenbanken || null;
    const buffer = datenbanken ? datenbanken.haupt('stadtrad') : require('../../src/sql/datenbanken').ladeDatenbanken(undefined, { log: () => {} }).haupt('stadtrad');
    const fuehreAus = fuehreAusMit(buffer);
    const tabellen = [{ name: 'Rad', zeilen: rad }, { name: 'Station', zeilen: station }];
    const ohne = await visual.spurenbrett({ tabellen }, fuehreAus);
    const mit = await visual.spurenbrett({ tabellen, bedingung: BEDINGUNG }, fuehreAus);
    assert.ok(!ohne.fehler && !mit.fehler);
    const nullRad = mit.ohneFaden.filter((o) => o.tabelle === 0 && mit.tabellen[0].zeilen[o.zeile][3] === null);
    assert.ok(nullRad.length >= 1, 'Startauswahl enthält ein Rad mit StationID NULL');

    assert.equal(await page.textContent('.sb-rechnung'), ohne.text);
    assert.equal(await page.textContent('.sb-zaehler-zahl'), String(ohne.gesamt));
    assert.equal(await page.$$eval('.sb-faden', (f) => f.length), ohne.gesamt);

    await page.click('#sb-anwenden');
    await page.waitForSelector('.sb-faden.faellt');
    assert.equal(await page.textContent('.sb-rechnung'), mit.text);
    assert.equal(await page.textContent('.sb-zaehler-zahl'), String(mit.bleiben));
    assert.equal(await page.$$eval('.sb-faden.passt', (f) => f.length), mit.bleiben);
    assert.equal(await page.$$eval('.sb-faden.faellt', (f) => f.length), mit.gesamt - mit.bleiben);
    const ohneText = await page.textContent('.sb-ohne');
    for (const o of nullRad) {
      const label = `Rad ${mit.tabellen[0].zeilen[o.zeile][0]}`;
      assert.match(ohneText, new RegExp(`${label}\\b`));
      assert.match(await page.getAttribute(`.sb-karte[data-tabelle="0"][data-zeile="${o.zeile}"]`, 'class'), /ohne-faden/);
    }
    assert.match(ohneText, /an keinem Faden\./);

    // Abfallen: nach unten verschoben und gedreht, am Ende unsichtbar
    await page.waitForTimeout(1300);
    const fall = await page.$eval('.sb-faden.faellt', (g) => ({ t: getComputedStyle(g).transform, o: getComputedStyle(g).opacity }));
    assert.notEqual(fall.t, 'none');
    assert.equal(fall.o, '0');

    // Ergebnis des Verbunds + Notiz
    assert.equal(await page.$$eval('#sb-ergebnis tbody tr', (z) => z.length), Math.min(mit.bleiben, 50));
    assert.match(await page.textContent('#sb-ergebnis .notiz'), /NULL ist nie gleich einem Wert/);
    assert.match(await page.textContent('#sb-ergebnis .sb-sql'), /WHERE Rad\.StationID = Station\.StationID/);

    // Fehlermeldung deutsch, ohne Absturz
    await page.fill('#sb-bedingung', 'Rad.Gibtsnicht = Station.StationID');
    await page.click('#sb-anwenden');
    await page.waitForSelector('#sb-fehler .diagnose');
    assert.match(await page.textContent('#sb-fehler'), /Spalte „Gibtsnicht“ gibt es in der Tabelle Rad nicht/);

    // Zurück: alle Fäden wieder da
    await page.click('#sb-zuruecksetzen');
    assert.equal(await page.$$eval('.sb-faden.faellt', (f) => f.length), 0);
    assert.equal(await page.textContent('.sb-rechnung'), ohne.text);

    if (FOTOS) await fotos(page);
    assert.deepEqual(meldungen, []);
  } finally {
    await context.close();
  }
});

test('Reduzierte Bewegung: Fäden blenden nur aus (keine Verschiebung)', async () => {
  const { context, page, meldungen } = await neueSeite({ reduziert: true });
  try {
    await page.goto(`${server.url}/werkzeug/spurenbrett?db=stadtrad`);
    await warteAufBrett(page);
    await page.click('#sb-anwenden');
    await page.waitForSelector('.sb-faden.faellt');
    await page.waitForTimeout(800);
    const fall = await page.$eval('.sb-faden.faellt', (g) => ({ t: getComputedStyle(g).transform, o: getComputedStyle(g).opacity }));
    assert.equal(fall.t, 'none');
    assert.equal(fall.o, '0');
    assert.deepEqual(meldungen, []);
  } finally {
    await context.close();
  }
});

test('Drei Tabellen als Ketten, Tastatur, Übergabe per sessionStorage', async () => {
  const { context, page, meldungen } = await neueSeite();
  try {
    await page.goto(`${server.url}/datenschutz`);
    await page.evaluate(() =>
      sessionStorage.setItem('dd_spurenbrett', JSON.stringify({ db: 'stadtrad', tabellen: [{ name: 'Ausleihe', limit: 4 }, 'Rad', 'Kunde'], bedingung: 'Ausleihe.RadID = Rad.RadID' }))
    );
    await page.goto(`${server.url}/werkzeug/spurenbrett`);
    await warteAufBrett(page);
    assert.match(page.url(), /\?db=stadtrad$/);
    assert.deepEqual(await page.$$eval('.sb-stapel-titel', (h) => h.map((x) => x.textContent)), ['Ausleihe', 'Rad', 'Kunde']);
    assert.equal(await page.inputValue('#sb-bedingung'), 'Ausleihe.RadID = Rad.RadID');
    assert.equal(await page.textContent('.sb-rechnung'), '4 × 5 × 5 = 100 Fäden');
    assert.equal(await page.$$eval('.sb-faden path', (p) => p.filter((x) => (x.getAttribute('d').match(/M/g) || []).length === 2).length), 100);
    // Weitere Tabelle gesperrt bei drei gewählten
    assert.equal(await page.isDisabled('#sb-t-Station'), true);
    // Tastatur: Strg+Enter im Bedingungsfeld
    await page.focus('#sb-bedingung');
    await page.keyboard.press('Control+Enter');
    await page.waitForSelector('.sb-faden.faellt');
    assert.match(await page.textContent('.sb-rechnung'), /^4 × 5 × 5 = 100 Fäden → \d+ bleiben?$/);
    assert.deepEqual(meldungen, []);
  } finally {
    await context.close();
  }
});

test('Eisdiele ohne Anmeldung; mehr als 2 000 Fäden werden zusammengefasst', async () => {
  const { context, page, meldungen } = await neueSeite({ angemeldet: false });
  try {
    // ohne Anmeldung antwortet /api/ich der Kopfzeile mit 401 – erwartet, kein Fehler der Seite
    await page.goto(`${server.url}/werkzeug/spurenbrett?db=eisdiele`);
    await warteAufBrett(page);
    assert.deepEqual(await page.$$eval('.sb-stapel-titel', (h) => h.map((x) => x.textContent)), ['Verkauf', 'Sorte']);
    await page.fill('#sb-n-Verkauf', '50');
    await page.waitForFunction(() => /^50 ×/.test(document.querySelector('.sb-rechnung').textContent));
    const sorten = await page.$$eval('.sb-karte[data-tabelle="1"]', (k) => k.length);
    assert.equal(await page.$$eval('.sb-faden', (f) => f.length), 50 * sorten);
    assert.deepEqual(meldungen.filter((m) => !/status of 401/.test(m)), []);
  } finally {
    await context.close();
  }
  const zweite = await neueSeite();
  try {
    await zweite.page.goto(`${server.url}/werkzeug/spurenbrett?db=stadtrad`);
    await warteAufBrett(zweite.page);
    await zweite.page.fill('#sb-n-Rad', '50');
    await zweite.page.fill('#sb-n-Station', '50');
    await zweite.page.waitForFunction(() => /^45 × 13 = 585 Fäden/.test(document.querySelector('.sb-rechnung').textContent));
    await zweite.page.check('#sb-t-Ausleihe');
    await zweite.page.waitForSelector('.sb-zettel');
    assert.equal(await zweite.page.$$eval('.sb-faden', (f) => f.length), 0);
    assert.match(await zweite.page.textContent('.sb-zettel'), /Zu viele Fäden/);
    await zweite.page.click('#sb-anwenden');
    await zweite.page.waitForSelector('#sb-ergebnis .sb-ergebnis-karte');
    assert.match(await zweite.page.textContent('.sb-rechnung'), /^45 × 13 × 5 = 2.925 Fäden → \d+ bleib/);
    assert.deepEqual(zweite.meldungen, []);
  } finally {
    await zweite.context.close();
  }
});

const GERAETE = [
  { name: '1920', viewport: { width: 1920, height: 1080 }, touch: false },
  { name: '1024', viewport: { width: 1024, height: 768 }, touch: true },
  { name: '768', viewport: { width: 768, height: 1024 }, touch: true },
  { name: '375', viewport: { width: 375, height: 812 }, touch: true }
];

for (const g of GERAETE) {
  for (const thema of ['hell', 'dunkel']) {
    test(`Sichtprüfung ${g.name} ${thema}: kein Überlauf, Touch-Ziele, Handy mit Liste statt Zeichnung`, async () => {
      const { context, page, meldungen } = await neueSeite({ viewport: g.viewport, thema, touch: g.touch });
      try {
        await page.goto(`${server.url}/werkzeug/spurenbrett?db=stadtrad`);
        await warteAufBrett(page);
        await page.evaluate(() => document.fonts.ready);
        const vorher = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        await page.click('#sb-anwenden');
        await page.waitForSelector('#sb-ergebnis table');
        await page.waitForTimeout(1300);
        const l = await page.evaluate(() => {
          const zuKlein = [];
          for (const e of document.querySelectorAll('#inhalt button, #inhalt select, #inhalt input, #inhalt summary, #inhalt textarea')) {
            const r = e.getBoundingClientRect();
            if (!r.width || !r.height || e.hidden) continue;
            const ziel = e.type === 'checkbox' ? e.closest('label').getBoundingClientRect() : r;
            if (ziel.height < 43.5) zuKlein.push(`${e.tagName}#${e.id} ${Math.round(ziel.width)}×${Math.round(ziel.height)}`);
          }
          return {
            ueberlauf: document.documentElement.scrollWidth - window.innerWidth,
            zuKlein,
            svgSichtbar: getComputedStyle(document.querySelector('.sb-faeden')).display !== 'none',
            listeOffen: document.getElementById('sb-liste').open,
            listeEintraege: document.querySelectorAll('.sb-faden-liste li').length
          };
        });
        assert.ok(vorher <= 0 && l.ueberlauf <= 0, `Überlauf ${vorher}/${l.ueberlauf}`);
        assert.deepEqual(l.zuKlein, []);
        if (g.name === '375') {
          assert.equal(l.svgSichtbar, false);
          assert.equal(l.listeOffen, true);
          assert.ok(l.listeEintraege > 0);
        } else {
          assert.equal(l.svgSichtbar, true);
        }
        if (FOTOS) {
          await page.evaluate(() => (document.querySelector('.kopf').style.position = 'static'));
          await page.screenshot({ path: path.join(ZIEL, `spurenbrett_${g.name}_${thema}.png`), fullPage: true });
        }
        assert.deepEqual(meldungen, []);
      } finally {
        await context.close();
      }
    });
  }
}

async function fotos(page) {
  await page.evaluate(() => (document.querySelector('.kopf').style.position = 'static'));
  await page.fill('#sb-bedingung', BEDINGUNG);
  await page.click('#sb-anwenden');
  await page.waitForSelector('.sb-faden.faellt');
  await page.waitForTimeout(450);
  await page.screenshot({ path: path.join(ZIEL, 'spurenbrett_faellt_1280_hell.png'), fullPage: true });
  await page.waitForTimeout(900);
}
