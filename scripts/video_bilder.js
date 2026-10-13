#!/usr/bin/env node
'use strict';
// Bilder der Erklärvideos aus der Plattform (Spec §13): Zeitlupe, Spurenbrett, Sortierfächer, Bauplan-Tisch,
// Schema-Werkbank, Konsole und weitere Seiten – gerendert mit der echten App im Test-Server der E2E-Tests
// (test/e2e/testserver.js, Chromium aus /opt/pw-browsers bzw. CHROMIUM_PFAD) und nur mit EIGENEN Beispieldaten
// (Eisdiele-Gast-DB, freie Werkzeugseiten, Video-Entwürfe) – nie mit Lab-, AB-, Verhör- oder Klausuraufgaben.
//
// Aufruf: node scripts/video_bilder.js <Video-Ordner …>   (ohne Angabe: alle materialien/Videos/*/video.json)
//         Aufgerufen von python3 werkzeuge/video_folien.py --bilder.
// Je Bild in video.json „bilder“: { "<name>": { werkzeug, … } } → <Ordner>/bilder/<name>.png
//   werkzeug  zeitlupe | spurenbrett | sortierfaecher | bauplan | werkbank | konsole | seite
//   db, sql             Abfrage (zeitlupe, sortierfaecher, konsole); Übergabe wie aus der Konsole (sessionStorage)
//   tabellen, bedingung Spurenbrett (dd_spurenbrett); anwenden: true klickt „Bedingung anwenden“
//   graph, layout       Bauplan-Tisch (Entwurf im localStorage), relationen: Schema-Werkbank
//   pfad, anmelden      seite: Pfad der App; anmelden: true = Schülerin „Mika R.“ mit Kurs (Test-SSO)
//   aktionen            [{ klick | fuellen: [sel, text] | taste | warte | pause: ms }] nach dem Laden
//   ausschnitt          CSS-Selektor des fotografierten Elements (Standard je Werkzeug, sonst ganze Seite)
//   breite, hoehe       Fenster (Standard 1280 × 760), thema: hell | dunkel (Standard hell), skala (Standard 2)

const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');
const { starteTestServer } = require('../test/e2e/testserver');
const { chromiumPfad } = require('../test/e2e/chromium');

const WURZEL = path.join(__dirname, '..');
const VIDEOS = path.join(WURZEL, 'materialien', 'Videos');

/** Standard je Werkzeug: Pfad, Bereitschaft, Ausschnitt. */
const WERKZEUGE = {
  zeitlupe: {
    pfad: (b) => `/werkzeug/zeitlupe?db=${b.db}`,
    bereit: () => document.documentElement.dataset.zeitlupe === 'bereit',
    ausschnitt: '#zl-ansicht'
  },
  spurenbrett: {
    pfad: (b) => `/werkzeug/spurenbrett?db=${b.db}`,
    bereit: () => !!document.querySelector('#sb-zaehler .sb-rechnung'),
    ausschnitt: '#inhalt'
  },
  sortierfaecher: {
    pfad: (b) => `/werkzeug/sortierfaecher?db=${b.db}`,
    bereit: () => !!document.querySelector('#sf-faecher .sf-fach'),
    ausschnitt: '#inhalt'
  },
  bauplan: {
    pfad: () => '/werkzeug/bauplan',
    bereit: () => document.documentElement.dataset.seite === 'bereit' && !!document.querySelector('.bp-svg'),
    ausschnitt: '.bp-svg'
  },
  werkbank: {
    pfad: () => '/werkzeug/werkbank',
    bereit: () => document.documentElement.dataset.seite === 'bereit',
    ausschnitt: '.werkbank'
  },
  konsole: {
    pfad: (b) => `/konsole/${b.db}`,
    bereit: () => document.documentElement.dataset.konsole === 'bereit',
    ausschnitt: '#inhalt'
  },
  seite: {
    pfad: (b) => b.pfad,
    bereit: () => document.documentElement.dataset.seite !== undefined || document.readyState === 'complete',
    ausschnitt: null
  }
};

function videoOrdner(args) {
  if (args.length) return args.map((a) => path.resolve(a));
  return fs.readdirSync(VIDEOS).map((d) => path.join(VIDEOS, d)).filter((d) => fs.existsSync(path.join(d, 'video.json'))).sort();
}

async function foto(browser, server, cookie, name, b, ziel) {
  const w = WERKZEUGE[b.werkzeug];
  if (!w) throw new Error(`${name}: unbekanntes Werkzeug „${b.werkzeug}“`);
  const context = await browser.newContext({
    viewport: { width: b.breite || 1280, height: b.hoehe || 760 },
    deviceScaleFactor: b.skala || 2,
    colorScheme: b.thema === 'dunkel' ? 'dark' : 'light',
    reducedMotion: 'reduce'
  });
  try {
    if (b.anmelden) {
      const [n, wert] = cookie.split('=');
      await context.addCookies([{ name: n, value: wert, url: server.url }]);
    }
    // Übergaben vor dem ersten Skript der Seite (wie aus der Konsole bzw. ein gespeicherter Entwurf)
    const vorab = {};
    if (b.werkzeug === 'zeitlupe') vorab.session = { dd_zeitlupe: { db: b.db, sql: b.sql } };
    if (b.werkzeug === 'sortierfaecher') vorab.session = { dd_sortierfaecher: { db: b.db, sql: b.sql } };
    if (b.werkzeug === 'spurenbrett') vorab.session = { dd_spurenbrett: { db: b.db, tabellen: b.tabellen, bedingung: b.bedingung || '' } };
    if (b.werkzeug === 'bauplan') vorab.lokal = { 'dd-werkzeug:bauplan': { graph: b.graph, layout: b.layout || {} }, 'dd-bauplan-ansicht': 'zeichnen' };
    if (b.werkzeug === 'werkbank') vorab.lokal = { 'dd-werkzeug:werkbank': { relationen: b.relationen } };
    if (b.thema) vorab.lokal = { ...(vorab.lokal || {}), 'dd-thema': b.thema === 'dunkel' ? 'dark' : 'light' };
    await context.addInitScript((v) => {
      try {
        for (const [k, x] of Object.entries(v.session || {})) if (!sessionStorage.getItem(k)) sessionStorage.setItem(k, JSON.stringify(x));
        for (const [k, x] of Object.entries(v.lokal || {})) {
          if (localStorage.getItem(k) === null) localStorage.setItem(k, typeof x === 'string' ? x : JSON.stringify(x));
        }
      } catch {
        /* about:blank */
      }
    }, vorab);
    const page = await context.newPage();
    const fehler = [];
    page.on('pageerror', (e) => fehler.push(e.message));
    page.on('console', (m) => {
      if (/Content Security Policy|Content-Security-Policy/i.test(m.text())) fehler.push(m.text());
    });
    await page.goto(server.url + w.pfad(b));
    await page.waitForFunction(w.bereit, null, { timeout: 30000 });
    if (b.werkzeug === 'konsole' && b.sql) {
      await page.fill('#sql-eingabe', b.sql);
      await page.click('#k-ausfuehren');
      await page.waitForSelector('#ergebnis table, #ergebnis .diagnose, .kein-treffer', { timeout: 20000 });
    }
    if (b.werkzeug === 'spurenbrett' && b.anwenden) {
      await page.click('#sb-anwenden');
      await page.waitForTimeout(400);
    }
    if (b.werkzeug === 'zeitlupe' && b.schritt) {
      await page.click(`#zl-schritte button[data-schritt="${b.schritt}"]`);
      await page.waitForTimeout(200);
    }
    for (const a of b.aktionen || []) {
      if (a.klick) await page.click(a.klick);
      else if (a.fuellen) await page.fill(a.fuellen[0], a.fuellen[1]);
      else if (a.taste) await page.keyboard.press(a.taste);
      else if (a.warte) await page.waitForSelector(a.warte, { timeout: 20000 });
      else if (a.pause) await page.waitForTimeout(a.pause);
      else if (a.ausblenden) await page.evaluate((s) => document.querySelectorAll(s).forEach((e) => { e.style.visibility = 'hidden'; }), a.ausblenden);
    }
    await page.waitForTimeout(300);
    await page.evaluate(() => document.activeElement && document.activeElement.blur && document.activeElement.blur());
    const datei = path.join(ziel, `${name}.png`);
    const ausschnitt = b.ausschnitt === undefined ? w.ausschnitt : b.ausschnitt;
    if (ausschnitt) await page.locator(ausschnitt).first().screenshot({ path: datei });
    else await page.screenshot({ path: datei, fullPage: false });
    if (fehler.length) throw new Error(`${name}: Fehler auf der Seite: ${fehler.join(' | ')}`);
    return datei;
  } finally {
    await context.close();
  }
}

async function main() {
  const ordner = videoOrdner(process.argv.slice(2));
  const auftraege = [];
  for (const o of ordner) {
    const spec = JSON.parse(fs.readFileSync(path.join(o, 'video.json'), 'utf8'));
    for (const [name, b] of Object.entries(spec.bilder || {})) auftraege.push({ o, name, b });
  }
  if (!auftraege.length) {
    console.log('Keine Bilder zu erzeugen.');
    return;
  }
  const browser = await chromium.launch({ executablePath: chromiumPfad() });
  const server = await starteTestServer({ mitInhalten: true });
  try {
    const cookie = await server.anmelden({ sub: 's:7001', name: 'Mika R.' });
    for (const o of ordner) {
      const ziel = path.join(o, 'bilder');
      fs.mkdirSync(ziel, { recursive: true });
      const namen = new Set(auftraege.filter((a) => a.o === o).map((a) => `${a.name}.png`));
      for (const d of fs.readdirSync(ziel)) if (d.endsWith('.png') && !namen.has(d)) fs.unlinkSync(path.join(ziel, d));
    }
    for (const { o, name, b } of auftraege) {
      await foto(browser, server, cookie, name, b, path.join(o, 'bilder'));
      console.log(`✔ ${path.basename(o)}/bilder/${name}.png`);
    }
  } finally {
    await browser.close();
    await server.schliessen();
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exitCode = 1;
});
