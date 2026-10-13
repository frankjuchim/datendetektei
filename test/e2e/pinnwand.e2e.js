'use strict';
// E2E (Chromium, playwright-core): Fallebene (Plan Phase 6 Task 2, DESIGN §5.10). Echte Akten + Beispielakte (welt 9,
// Plädoyer A9-E1 mit zwei Spuren), echter Seed seed/fallebene.json, Sandbox und SQL-Prüfer.
//  - Pinnwand: Verhör 1 gewonnen → Polaroid „Fundbuch-Seite“ mit Illustration; antippen zeigt Story-Text und markiert
//    die Steckbrief-Felder; übrige Felder „unbekannt“; Indizienkette offen.
//  - Ermittlung A9-E1: „Spur 1 von 2“, nach dem Lösen das Indiz als Karteikarte; Spur 2 per „Lösung zeigen“ → Auflösung
//    und Überleitung zur Erörterung.
//  - Pinnwand danach: zwei Indizien mit rotem Faden, Auflösung; Stadtplan verlinkt die Pinnwand.
//  - Handy (375), iPad (768/1024), Beamer (1920): kein horizontales Scrollen; Touch-Ziele ≥ 44 px; reduzierte Bewegung
//    ohne Faden-Animation; keine CSP-Meldungen.
// SCREENSHOTS=1: Fotos nach SCREENSHOT_ORDNER (Standard docs/screenshots/phase6).

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');
const { starteTestServer } = require('./testserver');

const CHROMIUM = require('./chromium').chromiumPfad();
const FIXTURE = path.join(__dirname, '..', 'fixtures', 'akte_beispiel.json');
const FOTOS = process.env.SCREENSHOTS === '1';
const FOTO_ORDNER = process.env.SCREENSHOT_ORDNER || path.join(__dirname, '..', '..', 'docs', 'screenshots', 'phase6');
const BEISPIEL = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
const LOESUNG = (id) => BEISPIEL.aufgaben.find((a) => a.id === id).loesung.sql;

let browser;
let server;
let cookie;

test.before(async () => {
  browser = await chromium.launch({ executablePath: CHROMIUM });
  server = await starteTestServer({ mitInhalten: true, aktenDateien: [FIXTURE] });
  cookie = await server.anmelden({});
  const db = server.t.db;
  const alt = JSON.parse(db.prepare('SELECT einstellungen FROM kurse WHERE kurs_id = ?').get('k:17').einstellungen);
  db.prepare('UPDATE kurse SET einstellungen = ? WHERE kurs_id = ?').run(JSON.stringify({ ...alt, akten: [1, 2, 9], niveau: 'eA' }), 'k:17');
  // Verhör 1 gewonnen (6 von 10 Punkten)
  db.prepare(
    "INSERT INTO verhoer_versuche (sub, kurs_id, akte, aufgaben_json, beginn, ende, punkte, max) VALUES ('s:1042', 'k:17', 1, '[]', '2026-10-01T10:00:00Z', '2026-10-01T10:15:00Z', 6, 10)"
  ).run();
  if (FOTOS) fs.mkdirSync(FOTO_ORDNER, { recursive: true });
});

test.after(async () => {
  if (browser) await browser.close();
  if (server) await server.schliessen();
});

async function neueSeite(viewport = { width: 1440, height: 900 }) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
  const [name, wert] = cookie.split('=');
  await context.addCookies([{ name, value: wert, url: server.url }]);
  const page = await context.newPage();
  const meldungen = [];
  page.on('console', (m) => {
    if (/Content Security Policy|Content-Security-Policy|unsafe-eval|unsafe-inline/i.test(m.text())) meldungen.push(m.text());
  });
  page.on('pageerror', (e) => meldungen.push(`pageerror: ${e.message}`));
  return { context, page, meldungen };
}

async function pruefeLayout(page, name) {
  const ueberlauf = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(ueberlauf <= 0, `${name}: horizontales Scrollen (${ueberlauf} px)`);
  const klein = await page.evaluate(() =>
    [...document.querySelectorAll('#inhalt .knopf, #inhalt .pw-polaroid[data-akte], #inhalt .lern-nav a')]
      .filter((e) => e.offsetParent !== null)
      .map((e) => ({ text: (e.textContent || '').trim().slice(0, 30), h: e.getBoundingClientRect().height, w: e.getBoundingClientRect().width }))
      .filter((r) => r.h < 43.5 || r.w < 43.5)
  );
  assert.deepEqual(klein, [], `${name}: Touch-Ziele unter 44 px`);
}

/** Layout bei Handy, iPad hoch/quer, Laptop und Beamer prüfen (mit SCREENSHOTS=1 auch fotografieren). */
async function alleBreiten(page, name) {
  for (const breite of [375, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width: breite, height: breite === 1920 ? 1080 : 900 });
    await page.waitForTimeout(120);
    await pruefeLayout(page, `${name} @${breite}`);
    if (FOTOS && [375, 1024, 1440, 1920].includes(breite)) {
      for (const thema of ['light', 'dark']) {
        await page.emulateMedia({ colorScheme: thema, reducedMotion: 'reduce' });
        await page.waitForTimeout(80);
        await page.screenshot({ path: path.join(FOTO_ORDNER, `${name}_${breite}_${thema}.png`), fullPage: true });
      }
      await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 });
}

async function bereit(page, url) {
  await page.goto(server.url + url);
  await page.waitForFunction(() => document.documentElement.dataset.seite === 'bereit', null, { timeout: 30000 });
}

test('Fallebene: Pinnwand, Plädoyer in der Ermittlung, Auflösung, Stadtplan-Verlinkung', { timeout: 240000 }, async () => {
  const { context, page, meldungen } = await neueSeite();
  try {
    /* ---------- Pinnwand vor dem Plädoyer ---------- */
    await bereit(page, '/pinnwand');
    assert.equal(await page.locator('.pw-polaroids > li').count(), 7);
    assert.equal(await page.locator('.pw-polaroid[data-akte]').count(), 1, 'nur Verhör 1 gewonnen');
    assert.equal(await page.locator('.pw-polaroid.leer').count(), 6);
    assert.equal(await page.locator('.pw-polaroid[data-akte="1"] .pw-bild svg').count(), 1, 'Illustration');
    assert.match(await page.textContent('.pw-polaroid[data-akte="1"]'), /Fundbuch-Seite/);
    // Steckbrief: Hinweis der Akte 1 (Verhör gewonnen, Akte 2 frei), Rest unbekannt
    assert.match(await page.textContent('.pw-steckbrief'), /Nachtfalter/);
    assert.doesNotMatch(await page.textContent('.pw-steckbrief'), /Nora Falter|Merle/);
    assert.ok((await page.locator('.pw-steckbrief dd[aria-label="noch unbekannt"]').count()) >= 4);
    // Polaroid antippen → Detail + verbundene Felder
    await page.click('.pw-polaroid[data-akte="1"]');
    await page.waitForSelector('#pw-detail .pw-detail-karte');
    assert.match(await page.textContent('#pw-detail'), /Messing-Kompass/);
    assert.match(await page.textContent('#pw-detail'), /Wer war am Schalter\?/);
    assert.equal(await page.getAttribute('.pw-polaroid[data-akte="1"]', 'aria-pressed'), 'true');
    assert.ok((await page.locator('.pw-feld.verbunden').count()) >= 1);
    // Indizienkette des Plädoyers (Beispielakte): zwei offene Spuren, keine Indizien, keine Auflösung
    assert.equal(await page.locator('.pw-indiz').count(), 2);
    assert.equal(await page.locator('.pw-indiz.bekannt').count(), 0);
    assert.equal(await page.locator('.pw-aufloesung').count(), 0);
    assert.doesNotMatch(await page.textContent('#inhalt'), /Indiz 1:|Probe-Auflösung/);
    await alleBreiten(page, 'pinnwand_start');

    /* ---------- Ermittlung: Spur 1 lösen ---------- */
    await page.goto(`${server.url}/ermittlung/A9-E1?aufgabe=A9-E1-02`);
    await page.waitForSelector('#aufgabe-karte .reiter:text("A9-E1-02")', { timeout: 30000 });
    assert.match(await page.textContent('.aufgabe-meta'), /Probe-Plädoyer · Spur 1 von 2/);
    assert.match(await page.textContent('#plaedoyer-stand'), /0 von 2 Indizien/);
    assert.equal(await page.locator('#plaedoyer-karte').count(), 0);
    await page.waitForSelector('.lern-konsole textarea');
    await page.fill('.lern-konsole textarea', LOESUNG('A9-E1-02'));
    await page.click('#k-pruefen');
    await page.waitForSelector('#feedback-richtig', { timeout: 30000 });
    await page.waitForSelector('#plaedoyer-karte .pw-indiz-karte');
    assert.match(await page.textContent('#plaedoyer-karte'), /Indiz 1 von 2/);
    assert.match(await page.textContent('#plaedoyer-karte'), /Nur wenige Wertsachen/);
    assert.equal(await page.locator('.pw-aufloesung').count(), 0);
    await page.waitForFunction(() => /1 von 2 Indizien/.test(document.getElementById('plaedoyer-stand').textContent));
    await alleBreiten(page, 'ermittlung_indiz');

    /* ---------- Spur 2 per „Lösung zeigen“ → Auflösung ---------- */
    await page.goto(`${server.url}/ermittlung/A9-E1?aufgabe=A9-E1-03`);
    await page.waitForSelector('#aufgabe-karte .reiter:text("A9-E1-03")', { timeout: 30000 });
    await page.click('#k-loesung');
    await page.click('#k-loesung-ja');
    await page.waitForSelector('#plaedoyer-karte .pw-aufloesung', { timeout: 30000 });
    assert.match(await page.textContent('#plaedoyer-karte'), /Probe-Auflösung/);
    assert.match(await page.textContent('#plaedoyer-karte .pw-ueberleitung'), /Durfte die Detektei das\?/);
    assert.match(await page.textContent('#plaedoyer-karte .pw-aufloesung'), /Enttarnt/i);
    await alleBreiten(page, 'ermittlung_aufloesung');
    // neu geladen: Indiz und Auflösung bleiben sichtbar
    await page.reload();
    await page.waitForSelector('#plaedoyer-karte .pw-aufloesung', { timeout: 30000 });

    /* ---------- Pinnwand nach dem Plädoyer ---------- */
    await bereit(page, '/pinnwand');
    assert.equal(await page.locator('.pw-indiz.bekannt').count(), 2);
    await page.waitForFunction(() => document.querySelectorAll('.pw-kette .pw-faden').length === 1);
    assert.match(await page.textContent('.pw-aufloesung'), /Probe-Auflösung/);
    // reduzierte Bewegung: Faden ohne Animation
    assert.equal(await page.$eval('.pw-kette .pw-faden', (p) => getComputedStyle(p).animationName), 'none');
    await alleBreiten(page, 'pinnwand_aufgeloest');

    /* ---------- Stadtplan: kleine Pinnwand + Steckbrief verlinken /pinnwand ---------- */
    await bereit(page, '/');
    await page.waitForSelector('#pinnwand-link');
    assert.equal(await page.getAttribute('#pinnwand-link', 'href'), '/pinnwand');
    assert.equal(await page.getAttribute('#steckbrief-link', 'href'), '/pinnwand');
    assert.equal(await page.locator('.pinnwand .polaroid:not(.leer) .polaroid-bild svg').count(), 1);
    assert.match(await page.textContent('.seitenspalte .pw-steckbrief'), /Nachtfalter/);
    await alleBreiten(page, 'stadtplan_pinnwand');
    await page.click('#pinnwand-link');
    await page.waitForURL(/\/pinnwand$/);
    assert.deepEqual(meldungen, []);
  } finally {
    await context.close();
  }
});

test('Pinnwand ohne Bewegungswunsch: Fäden spannen sich (Animation), Inhalte sofort sichtbar', { timeout: 60000 }, async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
  const [name, wert] = cookie.split('=');
  await context.addCookies([{ name, value: wert, url: server.url }]);
  const page = await context.newPage();
  try {
    await bereit(page, '/pinnwand');
    await page.waitForSelector('.pw-kette .pw-faden');
    assert.equal(await page.$eval('.pw-kette .pw-faden', (p) => getComputedStyle(p).animationName), 'pw-faden-spannen');
    assert.equal(await page.isVisible('.pw-steckbrief'), true);
  } finally {
    await context.close();
  }
});
