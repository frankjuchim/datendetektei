'use strict';
// E2E-Regressionstests zum Probelauf Phase 8, Bereich 2d (Lehrkraft-Bereich, Live-Modus, Beamer, Fehlerseiten).
// Je Befund ein Test: Fehlerfälle (Netz weg, Sitzung abgelaufen, Doppelklick, SSE-Abbruch mit 502) und Ansprache
// (Lehrkräfte gesiezt). SCREENSHOTS=1 → docs/screenshots/phase8/2d_*.png.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');
const { starteTestServer } = require('./testserver');

const CHROMIUM = require('./chromium').chromiumPfad();
const FOTOS = process.env.SCREENSHOTS === '1';
const FOTO_ORDNER = path.join(__dirname, '..', '..', 'docs', 'screenshots', 'phase8');

const LEHRKRAFT = { sub: 'l:7', rolle: 'lehrkraft', name: 'Frau M.', kurse: [{ id: 'k:17', name: 'Inf-LK 12', rolle: 'lehrkraft' }] };

let browser;
let server;
const meldungen = [];

test.before(async () => {
  browser = await chromium.launch({ executablePath: CHROMIUM });
  server = await starteTestServer({ mitInhalten: true, rateLimits: { lernen: { max: 1000 }, pruefenSql: { max: 1000 } } });
  if (FOTOS) fs.mkdirSync(FOTO_ORDNER, { recursive: true });
});

test.after(async () => {
  if (browser) await browser.close();
  if (server) await server.schliessen();
});

async function seite(nutzer, { breite = 1366, hoehe = 768 } = {}) {
  const kontext = await browser.newContext({ viewport: { width: breite, height: hoehe }, reducedMotion: 'reduce', colorScheme: 'light' });
  if (nutzer) {
    const [name, wert] = (await server.anmelden(nutzer)).split(/=(.*)/s);
    await kontext.addCookies([{ name, value: wert, url: server.url }]);
  }
  const page = await kontext.newPage();
  page.on('pageerror', (e) => meldungen.push('pageerror: ' + e.message));
  return { kontext, page };
}

const foto = async (page, name) => {
  if (FOTOS) await page.screenshot({ path: path.join(FOTO_ORDNER, `2d_${name}.png`) });
};

test('Auswertung „Neu laden“: Netzfehler und abgelaufene Sitzung zeigen eine Meldung (gesiezt), kein Skriptfehler', async () => {
  const vorher = meldungen.length;
  const { kontext, page } = await seite(LEHRKRAFT, { breite: 768, hoehe: 1024 });
  try {
    await page.goto(server.url + '/lehrkraft?kurs=k:17#auswertung');
    await page.waitForSelector('table.matrix');
    await kontext.setOffline(true);
    await page.click('#au-neu');
    await page.waitForSelector('#panel-auswertung .notiz', { timeout: 5000 });
    const offline = await page.textContent('#panel-auswertung');
    assert.match(offline, /Keine Verbindung zum Server/);
    assert.match(offline, /prüfen Sie/);
    await foto(page, 'auswertung_offline_768');
    await kontext.setOffline(false);
    await kontext.clearCookies();
    await page.click('#au-neu');
    await page.waitForFunction(() => /nicht mehr angemeldet/.test(document.getElementById('panel-auswertung').textContent));
    const text = await page.textContent('#panel-auswertung');
    assert.match(text, /Sie sind nicht mehr angemeldet/);
    assert.doesNotMatch(text, /\b(Du|du|dich|dein)\b/);
    await page.evaluate(() => window.scrollTo(0, 0));
    await foto(page, 'auswertung_sitzung_abgelaufen_768');
    assert.deepEqual(meldungen.slice(vorher), []);
  } finally {
    await kontext.close();
  }
});

test('Einstellungen speichern ohne Sitzung: verständliche Meldung (gesiezt) statt „Nicht angemeldet.“', async () => {
  const { kontext, page } = await seite(LEHRKRAFT);
  try {
    await page.goto(server.url + '/lehrkraft?kurs=k:17#einstellungen');
    await page.waitForSelector('#ei-speichern');
    await kontext.clearCookies();
    await page.click('label[for="ei-akte-2"]');
    await page.click('#ei-speichern');
    await page.waitForFunction(() => document.getElementById('ei-rueckmeldung').textContent.trim() !== '');
    assert.match(await page.textContent('#ei-rueckmeldung'), /Sie sind nicht mehr angemeldet.*Portal/);
  } finally {
    await kontext.close();
  }
});

test('Live-Duell: Doppelklick auf „Erste Aufgabe freischalten“ überspringt keine Aufgabe', async () => {
  const lk = await seite(LEHRKRAFT);
  try {
    await lk.page.goto(server.url + '/lehrkraft/live?kurs=k:17');
    await lk.page.waitForSelector('#k-start');
    await lk.page.click('#lk-keine');
    for (const id of ['K2-L-01', 'K2-L-04', 'K2-L-09']) await lk.page.check('#lk-aufgabe-' + id);
    await lk.page.click('#k-start');
    await lk.page.waitForSelector('#k-naechste');
    await lk.page.dblclick('#k-naechste');
    await lk.page.waitForSelector('text=Aufgabe 1 von 3');
    await lk.page.waitForTimeout(500);
    assert.match(await lk.page.textContent('.live-steuer h3'), /^Aufgabe 1 von 3/);
    // zweimal hintereinander (nach dem Neuzeichnen): erst Aufgabe 2, dann 3
    await lk.page.click('#k-naechste');
    await lk.page.waitForSelector('text=Aufgabe 2 von 3');
    await lk.page.click('#k-ende');
    await lk.page.click('#k-ende-ja');
    await lk.page.waitForSelector('#lk-ende');
  } finally {
    await lk.kontext.close();
  }
});

test('Beamer: SSE-Antwort 502 (Proxy) beendet die Ansicht nicht – sie verbindet neu und zeigt den Stand', { timeout: 60000 }, async () => {
  const lk = await seite(LEHRKRAFT);
  const beamer = await seite(LEHRKRAFT, { breite: 1920, hoehe: 1080 });
  try {
    await lk.page.goto(server.url + '/lehrkraft/live?kurs=k:17');
    await lk.page.waitForSelector('#k-start');
    await lk.page.click('#lk-keine');
    await lk.page.check('#lk-aufgabe-K2-L-01');
    await lk.page.click('#k-start');
    await lk.page.waitForSelector('#k-naechste');
    let abgelehnt = 0;
    await beamer.page.route('**/ereignisse*', (route) => {
      if (abgelehnt++ === 0) return route.fulfill({ status: 502, contentType: 'text/html', body: 'Bad Gateway' });
      return route.continue();
    });
    await beamer.page.goto(server.url + (await lk.page.getAttribute('#lk-beamer', 'href')));
    await beamer.page.waitForSelector('.beamer-aufgabe', { timeout: 20000 });
    assert.equal(await beamer.page.$('#beamer-ende'), null, 'nicht als beendet anzeigen');
    await lk.page.click('#k-naechste');
    await beamer.page.waitForSelector('text=0 von 0 haben geantwortet', { timeout: 20000 });
    assert.ok(abgelehnt >= 2, 'neu verbunden');
    await foto(beamer.page, 'beamer_nach_502_1920');
    await lk.page.click('#k-ende');
    await lk.page.click('#k-ende-ja');
    await beamer.page.waitForSelector('#beamer-ende', { timeout: 20000 });
  } finally {
    await lk.kontext.close();
    await beamer.kontext.close();
  }
});
