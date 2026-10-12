'use strict';
// E2E (Chromium, playwright-core): Akte 1 als Schülerin (Plan Phase 3 Task 9). Echte Akten, echte Sandbox und echter
// SQL-Prüfer; Anmeldung über ein Test-Token, Kurs mit Standard-Einstellungen (Akte 1 frei). Die Schülerin löst A1-E1
// vollständig über die Oberfläche (inkl. Fehlversuch, Tipp und einer SQL-Diagnose), sieht Punkte und Rang, beginnt
// Verhör 1, beantwortet zwei Aufgaben, gibt ab und sieht das Ergebnis; danach Warm-up und Trainingsplatz.
// Geprüft wird je Zustand: keine CSP-Meldungen, kein horizontales Scrollen, Touch-Ziele ≥ 44 px.
// SCREENSHOTS=1: Fotos bei 1440/1024/768/375, hell und dunkel, nach docs/screenshots/phase3/.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');
const { starteTestServer } = require('./testserver');

const CHROMIUM = require('./chromium').chromiumPfad();
const AKTE1 = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'seed', 'akten', 'akte1.json'), 'utf8'));
const loesung = (id) => AKTE1.aufgaben.find((a) => a.id === id).loesung;
const FOTOS = process.env.SCREENSHOTS === '1';
const FOTO_ORDNER = path.join(__dirname, '..', '..', 'docs', 'screenshots', 'phase3');
const BREITEN = [1440, 1024, 768, 375];

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

/** Prüft den aktuellen Zustand bei der aktuellen Breite: kein Seitenüberlauf, Touch-Ziele ≥ 44 px. */
async function pruefeLayout(name) {
  const ueberlauf = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(ueberlauf <= 0, `${name}: horizontales Scrollen (${ueberlauf} px)`);
  const klein = await page.evaluate(() =>
    [...document.querySelectorAll('#inhalt .knopf, #inhalt .kachel, #inhalt .option, #inhalt .segment-knopf, #inhalt .zeilen-knopf, #inhalt .lern-nav a')]
      .filter((e) => e.offsetParent !== null && !e.closest('[hidden], .stufe-versteckt'))
      .map((e) => ({ text: (e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 30), h: e.getBoundingClientRect().height, w: e.getBoundingClientRect().width }))
      .filter((r) => r.h < 43.5 || r.w < 43.5)
  );
  assert.deepEqual(klein, [], `${name}: Touch-Ziele unter 44 px`);
}

/** Zustand fotografieren (nur mit SCREENSHOTS=1) und bei allen Breiten das Layout prüfen. */
async function foto(name) {
  const breiten = FOTOS ? BREITEN : [1440, 375];
  for (const breite of breiten) {
    await page.setViewportSize({ width: breite, height: 900 });
    await page.waitForTimeout(150);
    await pruefeLayout(`${name} @${breite}`);
    if (!FOTOS) continue;
    for (const thema of ['light', 'dark']) {
      await page.emulateMedia({ colorScheme: thema, reducedMotion: 'reduce' });
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(100);
      await page.screenshot({ path: path.join(FOTO_ORDNER, `${name}_${breite}_${thema}.png`), fullPage: true });
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
}

async function pruefenUndWarten(erwartet = 'richtig') {
  await page.click('#k-pruefen');
  await page.waitForSelector(erwartet === 'richtig' ? '#feedback-richtig' : '.feedback.falsch', { timeout: 30000 });
}

async function weiter() {
  await page.click('#k-weiter');
  await page.waitForFunction(() => !document.querySelector('#feedback-richtig'));
}

async function waehleOption(teil, text) {
  const teilEl = teil === null ? page.locator('#aufgabe-karte') : page.locator('#aufgabe-karte .teil').nth(teil);
  await teilEl.locator('.option', { hasText: text }).first().click();
}

async function sqlEingeben(sql) {
  await page.fill('.lern-konsole textarea', sql);
}

test('Akte 1: Ermittlung 1.1 vollständig, Punkte und Rang, Verhör 1, Warm-up, Training', { timeout: 300000 }, async () => {
  const cookie = await server.anmelden({});
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const [name, wert] = cookie.split('=');
  await context.addCookies([{ name, value: wert, url: server.url }]);
  page = await context.newPage();
  page.on('console', (m) => meldungen.push(m.text()));
  page.on('pageerror', (e) => meldungen.push(`pageerror: ${e.message}`));

  /* ---------- Stadtplan ---------- */
  await page.goto(server.url + '/');
  await page.waitForSelector('html[data-seite="bereit"]');
  assert.equal(await page.locator('#stadtplan-bereich').isVisible(), true);
  assert.equal(await page.locator('.plan-svg .ort').count(), 6);
  assert.equal(await page.locator('.plan-svg .ort.gesperrt').count(), 5, 'nur Akte 1 frei');
  assert.match(await page.locator('#begruessung').textContent(), /Willkommen zurück, Lena K\. Jede/);
  assert.doesNotMatch(await page.locator('#begruessung').textContent(), /\.\./);
  await foto('stadtplan');

  /* ---------- Akte 1 ---------- */
  await page.goto(server.url + '/akte/1');
  await page.waitForSelector('html[data-seite="bereit"]');
  assert.equal(await page.locator('.ermittlung-karte').count(), 2);
  await foto('akte');

  /* ---------- Ermittlung 1.1 ---------- */
  await page.goto(server.url + '/ermittlung/A1-E1');
  await page.waitForSelector('#aufgabe-karte .reiter:text("A1-E1-01")');

  // 01: vier Teile choice
  for (const [i, text] of [[0, /^Tabelle$/], [1, /^Datensatz$/], [2, /^Attribut$/], [3, /^Attributwert$/]]) {
    await waehleOption(i, text);
  }
  await pruefenUndWarten();
  await weiter();

  // 02: Fehlversuch, Tipp, dann richtig
  await page.waitForSelector('#aufgabe-karte .reiter:text("A1-E1-02")');
  await waehleOption(null, 'im Ausschnitt jede Bezeichnung nur einmal');
  await pruefenUndWarten('falsch');
  assert.match(await page.locator('.feedback.falsch').textContent(), /Fehlversuch 1, die Aufgabe bringt jetzt noch 15 von 20 Punkten/);
  await page.click('#k-tipp');
  await page.waitForSelector('.feedback.tipp');
  assert.match(await page.locator('.feedback.tipp').textContent(), /Tipp 1 von 1/);
  await waehleOption(null, 'jede Nummer nur einmal vergibt');
  await pruefenUndWarten();
  assert.match(await page.locator('#feedback-richtig').textContent(), /\+11 Punkte · 1 Fehlversuch · 1 Tipp/);
  await weiter();

  // 03: sql – erst falsch (Diagnose), dann richtig
  await page.waitForSelector('#aufgabe-karte .reiter:text("A1-E1-03")');
  await page.waitForFunction(() => /läuft/.test(document.querySelector('.konsole-modus').textContent), null, { timeout: 20000 });
  await sqlEingeben('SELECT Bezeichnung, Kategorie\nFROM Fundsache');
  await page.click('.lern-konsole .knopf.primaer');
  await page.waitForSelector('.ergebnis .ergebnis-tabelle');
  await pruefenUndWarten('falsch');
  assert.ok((await page.locator('.feedback.falsch .diagnose-liste li').count()) >= 1, 'Diagnose fehlt');
  await foto('ermittlung_sql_falsch');
  await sqlEingeben(loesung('A1-E1-03').sql);
  await pruefenUndWarten();
  await page.waitForSelector('#loesung-karte');
  await foto('ermittlung_sql_geloest');
  await weiter();

  // 04: order
  await page.waitForSelector('#aufgabe-karte .reiter:text("A1-E1-04")');
  const teile = Object.fromEntries(AKTE1.aufgaben.find((a) => a.id === 'A1-E1-04').interaktion.teile.map((t) => [t.id, t.code]));
  for (const id of loesung('A1-E1-04').reihenfolgen[0]) {
    await page.locator('button.puzzle-teil', { has: page.locator('code', { hasText: new RegExp(`^${teile[id].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }) }).click();
  }
  await pruefenUndWarten();
  await weiter();

  // 05: zeilen
  await page.waitForSelector('#aufgabe-karte .reiter:text("A1-E1-05")');
  await foto('ermittlung_zeilen');
  for (const i of loesung('A1-E1-05').zeilen) await page.locator('.zeilen-knopf').nth(i).click();
  await pruefenUndWarten();
  await weiter();

  // 06: sql
  await page.waitForSelector('#aufgabe-karte .reiter:text("A1-E1-06")');
  await sqlEingeben(loesung('A1-E1-06').sql);
  await pruefenUndWarten();
  await weiter();

  // 07: ergebnis
  await page.waitForSelector('#aufgabe-karte .reiter:text("A1-E1-07")');
  const zellen = page.locator('.zelle-eingabe');
  const werte = loesung('A1-E1-07').zeilen.flat().map(String);
  for (let i = 0; i < werte.length; i++) await zellen.nth(i).fill(werte[i]);
  await foto('ermittlung_ergebnis');
  await pruefenUndWarten();
  await weiter();

  // 08: sql
  await page.waitForSelector('#aufgabe-karte .reiter:text("A1-E1-08")');
  await sqlEingeben(loesung('A1-E1-08').sql);
  await pruefenUndWarten();
  await page.waitForFunction(() => /8 von 8 erledigt/.test(document.getElementById('ermittlung-stand').textContent));
  assert.equal(await page.locator('#aufgaben-kacheln .kachel.erledigt').count(), 8);

  /* ---------- Stand: Punkte und Rang ---------- */
  await page.goto(server.url + '/');
  await page.waitForSelector('html[data-seite="bereit"]');
  const punkte = Number(await page.locator('#punkte-gesamt').textContent());
  assert.ok(punkte >= 130, `Punkte: ${punkte}`);
  assert.equal(await page.locator('#rang-titel').textContent(), 'Ermittler:in');

  /* ---------- Verhör 1 (Lehrkraft öffnet die Verhöre des Kurses) ---------- */
  const db = server.t.db;
  const einst = JSON.parse(db.prepare('SELECT einstellungen FROM kurse WHERE kurs_id = ?').get('k:17').einstellungen);
  db.prepare('UPDATE kurse SET einstellungen = ? WHERE kurs_id = ?').run(JSON.stringify({ ...einst, verhoer: 'offen' }), 'k:17');
  await page.goto(server.url + '/verhoer/1');
  await page.waitForSelector('#k-verhoer-start');
  await page.click('#k-verhoer-start');
  await page.waitForSelector('html[data-seite="verhoer"]');
  assert.match(await page.locator('#timer-zeit').textContent(), /^(19|20):\d\d$/);
  for (let i = 0; i < 2; i++) {
    const karte = page.locator('#verhoer-aufgabe');
    if (await karte.locator('.lern-konsole textarea').count()) await karte.locator('.lern-konsole textarea').first().fill('SELECT *\nFROM Buch');
    else if (await karte.locator('.option').count()) await karte.locator('.option').first().click();
    else if (await karte.locator('input.luecke').count()) for (const f of await karte.locator('input.luecke').all()) await f.fill('1');
    else if (await karte.locator('.zeilen-knopf').count()) await karte.locator('.zeilen-knopf').first().click();
    else if (await karte.locator('.code-zeile').count()) await karte.locator('button.code-zeile').first().click();
    else if (await karte.locator('button.puzzle-teil').count()) await karte.locator('button.puzzle-teil').first().click();
    else if (await karte.locator('.zelle-eingabe').count()) await karte.locator('.zelle-eingabe').first().fill('1');
    else if (await karte.locator('.match .segment-knopf').count()) await karte.locator('.match .segment-knopf').first().click();
    await page.click('#k-speichern');
    await page.waitForSelector('#toast.sichtbar');
    assert.match(await page.locator('#toast').textContent(), /Antwort gespeichert\./);
    await page.waitForFunction((n) => document.querySelectorAll('#verhoer-kacheln .kachel.beantwortet').length === n, i + 1);
    if (i === 0) await page.click('#k-naechste');
  }
  await foto('verhoer_laeuft');
  await page.click('#k-abgeben');
  await page.click('#k-abgeben-ja');
  await page.waitForSelector('html[data-seite="ergebnis"]');
  assert.equal(await page.locator('.ergebnis-liste li').count(), 6);
  assert.match(await page.locator('.ergebnis-kopfzeile').textContent(), /von \d+ Punkten/);
  await foto('verhoer_ergebnis');

  /* ---------- Warm-up ---------- */
  await page.goto(server.url + '/warmup');
  await page.waitForSelector('html[data-seite="bereit"]');
  await page.click('#k-aufdecken');
  await page.waitForSelector('.einschaetzung');
  await foto('warmup');
  await page.locator('.einschaetzung button[data-ergebnis="gewusst"]').click();
  await page.waitForSelector('#toast.sichtbar');

  /* ---------- Trainingsplatz: genau eine offene Aufgabe ---------- */
  await page.goto(server.url + '/training');
  await page.waitForSelector('html[data-seite="bereit"]');
  assert.equal(await page.locator('.training-karte').count(), 1);
  await foto('training');

  assert.deepEqual(csp(), [], 'CSP-Meldungen');
  assert.deepEqual(meldungen.filter((m) => m.startsWith('pageerror')), [], 'Skriptfehler');
  await context.close();
});
