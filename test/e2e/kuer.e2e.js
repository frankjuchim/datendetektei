'use strict';
// E2E (Chromium, playwright-core): Kür K1 in der Schreib-Konsole (Plan Phase 6 Task 7). Echte Akten (seed/akten/kuer.json),
// echte Sandbox, echter Prüfer. Die Schülerin sieht die Kür auf dem Stadtplan, legt in K1-E1-01 die Tabelle Ermittler an
// (erst falsch, dann richtig) und erlebt in K1-E1-03 die Fremdschlüssel-Verletzung (deutsche Meldung, Randmarke),
// korrigiert das Skript und löst die Aufgabe. Je Zustand: keine CSP-Meldungen, kein horizontales Scrollen, Touch-Ziele.
// SCREENSHOTS=1: Fotos nach docs/screenshots/phase6/ (kuer_*).

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');
const { starteTestServer } = require('./testserver');

const CHROMIUM = require('./chromium').chromiumPfad();
const FOTOS = process.env.SCREENSHOTS === '1';
const FOTO_ORDNER = path.join(__dirname, '..', '..', 'docs', 'screenshots', 'phase6');

let browser;
let server;
let page;
const meldungen = [];

test.before(async () => {
  browser = await chromium.launch({ executablePath: CHROMIUM });
  server = await starteTestServer({ mitInhalten: true });
  if (FOTOS) fs.mkdirSync(FOTO_ORDNER, { recursive: true });
});

test.after(async () => {
  if (browser) await browser.close();
  if (server) await server.schliessen();
});

const csp = () => meldungen.filter((m) => /Content Security Policy|Content-Security-Policy|unsafe-eval|unsafe-inline/i.test(m));

async function pruefeLayout(name) {
  const ueberlauf = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(ueberlauf <= 0, `${name}: horizontales Scrollen (${ueberlauf} px)`);
  const klein = await page.evaluate(() =>
    [...document.querySelectorAll('#inhalt .knopf, #inhalt .kachel, #inhalt .option')]
      .filter((e) => e.offsetParent !== null && !e.closest('[hidden]'))
      .map((e) => ({ text: (e.textContent || '').trim().slice(0, 30), h: e.getBoundingClientRect().height, w: e.getBoundingClientRect().width }))
      .filter((r) => r.h < 43.5 || r.w < 43.5)
  );
  assert.deepEqual(klein, [], `${name}: Touch-Ziele unter 44 px`);
}

async function foto(name) {
  for (const breite of [1440, 375]) {
    await page.setViewportSize({ width: breite, height: 900 });
    await page.waitForTimeout(150);
    await pruefeLayout(`${name} @${breite}`);
    if (FOTOS) {
      for (const thema of ['light', 'dark']) {
        await page.emulateMedia({ colorScheme: thema, reducedMotion: 'reduce' });
        await page.waitForTimeout(100);
        await page.screenshot({ path: path.join(FOTO_ORDNER, `kuer_${name}_${breite}_${thema}.png`), fullPage: true });
      }
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
}

const ERMITTLER = 'CREATE TABLE Ermittler (\n  ErmittlerNr INTEGER PRIMARY KEY,\n  Name TEXT NOT NULL,\n  Dienstgrad TEXT\n);';
const FALL = 'CREATE TABLE Fall (\n  FallNr INTEGER PRIMARY KEY,\n  Titel TEXT,\n  LeiterNr INTEGER NOT NULL,\n  FOREIGN KEY (LeiterNr) REFERENCES Ermittler(ErmittlerNr)\n);';

async function skriptEingeben(text) {
  await page.fill('.schreib-konsole textarea', text);
}

async function ausfuehren() {
  await page.click('.schreib-konsole [id^="k-skript-ausfuehren"]');
  await page.waitForFunction(() => {
    const f = document.querySelector('.schreib-konsole .ergebnis');
    return f && f.getAttribute('aria-busy') !== 'true' && !f.querySelector('.laeuft');
  });
}

test('Kür K1: Stadtplan-Abschnitt, K1-E1-01 und K1-E1-03 in der Schreib-Konsole', { timeout: 240000 }, async () => {
  const cookie = await server.anmelden({});
  const db = server.t.db;
  const kurs = db.prepare('SELECT kurs_id, einstellungen FROM kurse').get();
  const einst = JSON.parse(kurs.einstellungen);
  db.prepare('UPDATE kurse SET einstellungen = ? WHERE kurs_id = ?').run(JSON.stringify({ ...einst, akten: [1, 8], niveau: 'eA' }), kurs.kurs_id);

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const [name, wert] = cookie.split('=');
  await context.addCookies([{ name, value: wert, url: server.url }]);
  page = await context.newPage();
  page.on('console', (m) => meldungen.push(m.text()));
  page.on('pageerror', (e) => meldungen.push(`pageerror: ${e.message}`));

  /* ---------- Stadtplan: Kür als eigener Abschnitt ---------- */
  await page.goto(server.url + '/');
  await page.waitForSelector('html[data-seite="bereit"]');
  assert.equal(await page.locator('.plan-svg .ort').count(), 6, 'die Kür ist kein Ort auf dem Plan');
  const karte = page.locator('#kuer-karte');
  assert.equal(await karte.isVisible(), true);
  assert.match(await karte.textContent(), /KÜR – nicht im Abitur/);
  assert.match(await karte.textContent(), /Zählt nicht für deinen Rang/);
  await foto('stadtplan');

  /* ---------- Akte-Seite der Kür ---------- */
  await page.goto(server.url + '/akte/8');
  await page.waitForSelector('html[data-seite="bereit"]');
  assert.match(await page.locator('.akte-kopf-karte').textContent(), /KÜR – nicht im Abitur/);
  assert.equal(await page.locator('.ermittlung-karte').count(), 1);
  assert.match(await page.locator('.akte-kopf-karte .reiter').textContent(), /Kür K1/);
  await foto('akte');

  /* ---------- K1-E1-01: Die erste Tabelle ---------- */
  await page.goto(server.url + '/ermittlung/K1-E1?aufgabe=K1-E1-01');
  await page.waitForSelector('#aufgabe-karte .reiter:text("K1-E1-01")');
  await page.waitForSelector('.schreib-konsole .kuer-band');
  assert.match(await page.locator('.schreib-konsole .kuer-band').textContent(), /KÜR – nicht im Abitur.*FROM … WHERE/s);
  assert.match(await page.locator('.schreib-konsole .konsole-db').textContent(), /leere Datenbank/);
  await page.waitForSelector('.schreib-konsole .schema-browser :text("Noch keine Tabelle")');

  // erst ohne Primärschlüssel: ausführen klappt, Prüfen zeigt den offenen Prüfpunkt
  await skriptEingeben('CREATE TABLE Ermittler (ErmittlerNr INTEGER, Name TEXT, Dienstgrad TEXT);\nSELECT * FROM Ermittler;');
  await ausfuehren();
  assert.match(await page.locator('.schreib-konsole .skript-protokoll').textContent(), /CREATE TABLE.*Tabelle angelegt/s);
  await page.waitForSelector('.schreib-konsole .schema-tabelle[data-tabelle="Ermittler"]');
  await page.click('#k-pruefen');
  await page.waitForSelector('.feedback.falsch');
  await page.waitForSelector('.schreib-konsole .pruefpunkte li.offen');
  assert.match(await page.locator('.schreib-konsole .ergebnis').textContent(), /3 von 4 Prüfpunkten erfüllt/);
  assert.match(await page.locator('.feedback.falsch').textContent(), /Prüfpunkten erfüllt/);
  await foto('k1e101_falsch');

  // richtig
  await skriptEingeben(ERMITTLER);
  await page.click('#k-pruefen');
  await page.waitForSelector('#feedback-richtig', { timeout: 30000 });
  assert.match(await page.locator('#feedback-richtig').textContent(), /\+\d+ Punkte/);
  // das Skript liegt nur im localStorage dieses Geräts
  await page.waitForFunction((soll) => window.localStorage.getItem('dd-entwurf:aufgabe:K1-E1-01:0') === soll, ERMITTLER);

  /* ---------- K1-E1-03: Der verbotene Verweis ---------- */
  await page.goto(server.url + '/ermittlung/K1-E1?aufgabe=K1-E1-03');
  await page.waitForSelector('#aufgabe-karte .reiter:text("K1-E1-03")');
  await page.waitForSelector('.schreib-konsole .schema-tabelle[data-tabelle="Ermittler"]');
  assert.match(await page.locator('.schreib-konsole .konsole-db').textContent(), /Detektei-light/);

  await skriptEingeben(`${FALL}\nINSERT INTO Fall VALUES (10, 'Das Phantom', 7);`);
  await ausfuehren();
  const fehler = await page.locator('.schreib-konsole .ergebnis .diagnose').textContent();
  assert.match(fehler, /Anweisung 2 \(Zeile 7\): Fremdschlüssel verletzt/);
  assert.match(fehler, /referentielle Integrität/);
  assert.doesNotMatch(fehler, /constraint failed/i);
  await page.waitForTimeout(400); // nach der verzögerten Änderungsmeldung des Editors bleibt die Marke stehen
  assert.equal(await page.locator('.schreib-konsole .randmarke').count(), 1, 'Randmarke an der Fehlerzeile');
  await foto('k1e103_fk');

  await skriptEingeben(`${FALL}\nINSERT INTO Fall VALUES (10, 'Das Phantom', 1);\nSELECT * FROM Fall;`);
  await ausfuehren();
  assert.match(await page.locator('.schreib-konsole .ergebnis').textContent(), /Das Phantom/);
  await page.waitForSelector('.schreib-konsole .schema-tabelle[data-tabelle="Fall"]');
  await page.locator('#aufgabe-karte .teil').nth(1).locator('.option', { hasText: 'Einen Ermittler mit der Nummer 7 gibt es nicht' }).click();
  await page.click('#k-pruefen');
  await page.waitForSelector('#feedback-richtig', { timeout: 30000 });
  await foto('k1e103_geloest');

  assert.deepEqual(csp(), []);
  assert.deepEqual(meldungen.filter((m) => /pageerror/.test(m)), []);
  await context.close();
});
