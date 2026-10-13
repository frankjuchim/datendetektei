'use strict';
// E2E (Chromium, playwright-core): Interaktionen der Modellierung (Plan Phase 5 Task 3) mit der Beispielakte
// (test/fixtures/akte_beispiel.json, Akte 9, eA): A9-E2-03 zellen, A9-E2-04 anomalie (Simulator), A9-E2-05 zerlegen
// (Puzzle). Je Aufgabe: eine Schülerin löst per Maus (mit falscher Antwort und Rückmeldung zuerst), ein zweiter
// Schüler nur per Tastatur bzw. Auswahlmenü; dazu Entwurf nach dem Neuladen und Handy-Breite 375 ohne Überlauf mit
// Touch-Zielen ≥ 44 px. Keine CSP-Meldungen, keine Seitenfehler.
// SCREENSHOTS=1 mit FOTO_ORDNER=<Ordner>: Fotos der Zustände bei 1440 und 375 (hell).

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');
const { starteTestServer } = require('./testserver');

const CHROMIUM = require('./chromium').chromiumPfad();
const FIXTURE = path.join(__dirname, '..', 'fixtures', 'akte_beispiel.json');
const FOTO_ORDNER = process.env.SCREENSHOTS === '1' && process.env.FOTO_ORDNER ? process.env.FOTO_ORDNER : null;

let browser;
let server;
const meldungen = [];
const seiten = {};

async function neueSeite(nutzer) {
  const cookie = await server.anmelden(nutzer);
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const [name, wert] = cookie.split('=');
  await context.addCookies([{ name, value: wert, url: server.url }]);
  const page = await context.newPage();
  page.on('console', (m) => meldungen.push(m.text()));
  page.on('pageerror', (e) => meldungen.push(`pageerror: ${e.message}`));
  return page;
}

test.before(async () => {
  browser = await chromium.launch({ executablePath: CHROMIUM });
  server = await starteTestServer({ mitInhalten: true, aktenDateien: [FIXTURE] });
  seiten.maus = await neueSeite({}); // legt den Kurs k:17 an
  const db = server.t.db;
  const einst = JSON.parse(db.prepare('SELECT einstellungen FROM kurse WHERE kurs_id = ?').get('k:17').einstellungen);
  db.prepare('UPDATE kurse SET einstellungen = ? WHERE kurs_id = ?').run(JSON.stringify({ ...einst, akten: [9], niveau: 'eA' }), 'k:17');
  seiten.tastatur = await neueSeite({ sub: 's:1043', name: 'Mika R.' });
  seiten.handy = await neueSeite({ sub: 's:1044', name: 'Ida M.' });
  if (FOTO_ORDNER) fs.mkdirSync(FOTO_ORDNER, { recursive: true });
});

test.after(async () => {
  if (browser) await browser.close();
  if (server) await server.schliessen();
});

const fehler = () => meldungen.filter((m) => m.startsWith('pageerror') || /Content Security Policy|unsafe-inline|unsafe-eval/i.test(m));

async function oeffne(page, id) {
  await page.goto(`${server.url}/ermittlung/A9-E2?aufgabe=${id}`);
  await page.waitForSelector(`#aufgabe-karte .reiter:text("${id}")`);
}

async function pruefen(page, erwartet) {
  await page.click('#k-pruefen');
  await page.waitForSelector(erwartet === 'richtig' ? '#feedback-richtig' : '.feedback.falsch', { timeout: 20000 });
}

/** Prüfen per Tastatur (Fokus auf den Knopf, Enter). */
async function pruefenTastatur(page, erwartet) {
  await page.focus('#k-pruefen');
  await page.keyboard.press('Enter');
  await page.waitForSelector(erwartet === 'richtig' ? '#feedback-richtig' : '.feedback.falsch', { timeout: 20000 });
}

const zelle = (page, r, c, wo = '#aufgabe-karte') => page.locator(`${wo} button.zelle-knopf[data-r="${r}"][data-c="${c}"]`);
const gedrueckt = (page, sel) => page.$$eval(sel, (bs) => bs.filter((b) => b.getAttribute('aria-pressed') === 'true').map((b) => [Number(b.dataset.r), Number(b.dataset.c)]));
const fokusZelle = (page) => page.evaluate(() => {
  const b = document.activeElement;
  return b && b.classList.contains('zelle-knopf') ? [Number(b.dataset.r), Number(b.dataset.c)] : null;
});

async function foto(page, name) {
  if (!FOTO_ORDNER) return;
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: path.join(FOTO_ORDNER, `${name}.png`), fullPage: true });
}

/** Handy-Breite: kein horizontales Scrollen der Seite, Touch-Ziele der Interaktion ≥ 44 px. */
async function pruefeHandy(page, name) {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(150);
  const ueberlauf = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(ueberlauf <= 0, `${name}: horizontales Scrollen (${ueberlauf} px)`);
  const klein = await page.evaluate(() =>
    [...document.querySelectorAll('#aufgabe-karte .teil button, #aufgabe-karte .teil select, #aufgabe-karte .zelle-knopf, #aufgabe-karte .knopf')]
      .filter((e) => e.offsetParent !== null && !e.closest('[hidden]'))
      .map((e) => ({ text: (e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 40), h: e.getBoundingClientRect().height, w: e.getBoundingClientRect().width }))
      .filter((r) => r.h < 43.5 || r.w < 43.5)
  );
  assert.deepEqual(klein, [], `${name}: Touch-Ziele unter 44 px`);
  await foto(page, `${name}_375`);
  await page.setViewportSize({ width: 1440, height: 900 });
}

/** Ziehen per Maus (Pointer Events) von einem Element auf ein anderes. */
async function ziehe(page, von, nach) {
  await von.evaluate((e) => e.scrollIntoView({ block: 'center' }));
  const a = await von.boundingBox();
  const b = await nach.boundingBox();
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2 + 10, a.y + a.height / 2 + 10, { steps: 3 });
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
  await page.mouse.up();
}

/* ================= zellen ================= */

test('zellen per Maus: falsche Auswahl → Rückmeldung, dann richtig; Lösung grün', async () => {
  const page = seiten.maus;
  await oeffne(page, 'A9-E2-03');
  assert.equal(await page.locator('#aufgabe-karte .zellen-waehlbar button.zelle-knopf').count(), 20, '4 Zeilen × 5 Spalten');
  await zelle(page, 1, 4).click();
  assert.equal(await zelle(page, 1, 4).getAttribute('aria-pressed'), 'true');
  await foto(page, 'zellen_gewaehlt_1440');
  await pruefen(page, 'falsch');
  assert.match(await page.locator('.feedback.falsch').textContent(), /Fehlversuch 1/);
  await zelle(page, 3, 4).click();
  await pruefen(page, 'richtig');
  assert.equal(await page.locator('#aufgabe-karte td.loesung').count(), 2);
  assert.equal(await zelle(page, 1, 4).isDisabled(), true, 'nach dem Lösen gesperrt');
  assert.deepEqual(fehler(), []);
});

test('zellen per Tastatur: Tab, Pfeiltasten, Leertaste (ein Tab-Stopp für das Raster)', async () => {
  const page = seiten.tastatur;
  await oeffne(page, 'A9-E2-03');
  const tabStopps = await page.$$eval('#aufgabe-karte button.zelle-knopf', (bs) => bs.filter((b) => b.tabIndex === 0).length);
  assert.equal(tabStopps, 1, 'roving tabindex');
  await zelle(page, 0, 0).focus();
  await page.keyboard.press('End');
  assert.deepEqual(await fokusZelle(page), [0, 4]);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowLeft');
  assert.deepEqual(await fokusZelle(page), [3, 3]);
  await page.keyboard.press('Home');
  assert.deepEqual(await fokusZelle(page), [3, 0]);
  assert.deepEqual((await gedrueckt(page, '#aufgabe-karte button.zelle-knopf')).sort(), [[1, 4], [3, 4]]);
  await pruefenTastatur(page, 'richtig');
  assert.deepEqual(fehler(), []);
});

/* ================= anomalie ================= */

test('anomalie per Maus: Zeile vergessen → Widerspruch; falsche Art → Rückmeldung je Teil; dann richtig', async () => {
  const page = seiten.maus;
  await oeffne(page, 'A9-E2-04');
  assert.equal(await page.locator('#aufgabe-karte [data-block="1"]').isHidden(), true, 'Rohtabelle steht als Kopie im Simulator');
  assert.match(await page.locator('.auftragskarte').textContent(), /Hollmann/);
  // nur die Zellen mit dem alten Wert sind änderbar
  assert.equal(await page.locator('.sim-tabelle button.zelle-knopf').count(), 3);
  await zelle(page, 0, 4, '.sim-tabelle').click();
  await zelle(page, 1, 4, '.sim-tabelle').click();
  assert.match(await page.locator('.sim-tabelle tr').nth(1).textContent(), /0421-99/);
  await page.click('.sim-auftrag .knopf:has-text("Auftrag ausgeführt")');
  const befund = await page.locator('.sim-befund').textContent();
  assert.match(befund, /Widerspruch/);
  assert.match(befund, /0421-99 und 0421-11|0421-11 und 0421-99/);
  assert.ok((await page.locator('.sim-tabelle td.widerspruch').count()) >= 3, 'Widerspruch markiert');
  await foto(page, 'anomalie_widerspruch_1440');
  // falsche Art, richtige Zellen
  await page.click('.anomalie-arten button:has-text("Löschanomalie")');
  for (const r of [0, 1, 3]) await zelle(page, r, 4, '.sim-tabelle').click();
  await pruefen(page, 'falsch');
  const rm = await page.locator('.sim-rueckmeldung').textContent();
  assert.match(rm, /Anomalieart stimmt noch nicht/);
  assert.match(rm, /Markierte Zellen stimmen/);
  await foto(page, 'anomalie_rueckmeldung_1440');
  await page.click('.anomalie-arten button:has-text("Änderungsanomalie")');
  assert.equal(await page.locator('.sim-rueckmeldung').isHidden(), true, 'alte Rückmeldung verschwindet bei Änderung');
  await pruefen(page, 'richtig');
  assert.equal(await page.locator('.sim-tabelle td.loesung').count(), 3);
  assert.match(await page.locator('.sim-loesung').textContent(), /Änderungsanomalie/);
  assert.deepEqual(fehler(), []);
});

test('anomalie per Tastatur: alle Zellen ändern, Art wählen, Zellen markieren', async () => {
  const page = seiten.tastatur;
  await oeffne(page, 'A9-E2-04');
  await zelle(page, 0, 4, '.sim-tabelle').focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowDown'); // Zeile 3 (Brede) ist nicht änderbar → übersprungen
  assert.deepEqual(await fokusZelle(page), [3, 4]);
  await page.keyboard.press('Space');
  assert.match(await page.locator('.sim-befund').textContent(), /Kein Widerspruch – aber für diese eine Änderung waren 3 Zellen zu ändern/);
  await page.locator('.sim-auftrag .knopf:has-text("Auftrag ausgeführt")').focus();
  await page.keyboard.press('Enter');
  // Fokus springt auf die erste Anomalieart
  assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Einfügeanomalie');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('.anomalie-arten button:has-text("Änderungsanomalie")').getAttribute('aria-pressed'), 'true');
  await zelle(page, 0, 0, '.sim-tabelle').focus();
  await page.keyboard.press('End');
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Space');
  assert.deepEqual((await gedrueckt(page, '.sim-tabelle button.zelle-knopf')).sort(), [[0, 4], [1, 4], [3, 4]]);
  await pruefenTastatur(page, 'richtig');
  assert.deepEqual(fehler(), []);
});

/* ================= zerlegen ================= */

test('zerlegen per Ziehen: Redundanz → Rückmeldung je Tabelle, dann verschieben und richtig', async () => {
  const page = seiten.maus;
  await oeffne(page, 'A9-E2-05');
  const tab = (i) => page.locator('.zerlegen-tabelle').nth(i);
  const chip = (name) => page.locator(`.spalten-chip:has(.chip-name:text-is("${name}"))`);
  assert.equal(await page.locator('.zerlegen-tabelle').count(), 2);
  for (const a of ['Abteilung', 'Trainer', 'TrainerTelefon', 'Halle']) await ziehe(page, chip(a), tab(0));
  assert.deepEqual(await tab(0).locator('.spalte-name').allTextContents(), ['Abteilung', 'Trainer', 'TrainerTelefon', 'Halle']);
  await tab(0).locator('.schluessel-schalter[aria-label^="Abteilung"]').click();
  assert.match(await page.locator('.zerlegen-vorschau').textContent(), /Tabelle 1\(Abteilung, Trainer, TrainerTelefon, Halle\)/);
  await pruefen(page, 'falsch');
  assert.ok(await tab(0).evaluate((e) => e.classList.contains('falsch')));
  assert.match(await tab(0).locator('.zerlegen-hinweise').textContent(), /TrainerTelefon hängt von Trainer ab/);
  assert.match(await page.locator('.zerlegen-gesamt').textContent(), /Noch nicht redundanzfrei/);
  await foto(page, 'zerlegen_rueckmeldung_1440');
  // TrainerTelefon aus Tabelle 1 nach Tabelle 2 verschieben, Trainer zusätzlich nach Tabelle 2 (Fremdschlüssel)
  await ziehe(page, tab(0).locator('.spalte-name:text-is("TrainerTelefon")'), tab(1));
  await ziehe(page, chip('Trainer'), tab(1));
  assert.deepEqual(await tab(0).locator('.spalte-name').allTextContents(), ['Abteilung', 'Trainer', 'Halle']);
  assert.deepEqual(await tab(1).locator('.spalte-name').allTextContents(), ['Trainer', 'TrainerTelefon']);
  assert.match(await chip('Trainer').textContent(), /2×/);
  await tab(1).locator('.schluessel-schalter[aria-label^="Trainer "]').click();
  const vorschau = await page.locator('.zerlegen-vorschau').textContent();
  assert.match(vorschau, /Tabelle 1\(Abteilung, ↑Trainer, Halle\)/);
  assert.match(vorschau, /Tabelle 2\(Trainer, TrainerTelefon\)/);
  await pruefen(page, 'richtig');
  assert.equal(await page.locator('.zerlegen-tabelle.ok').count(), 2);
  assert.match(await page.locator('.zerlegen-loesung').textContent(), /Abteilung → Trainer, Halle/);
  await foto(page, 'zerlegen_geloest_1440');
  assert.deepEqual(fehler(), []);
});

test('zerlegen per Auswahlmenü und Tastatur; Entwurf bleibt nach dem Neuladen', async () => {
  const page = seiten.tastatur;
  await oeffne(page, 'A9-E2-05');
  const sel = (i) => page.locator('select.zerlegen-hinzu').nth(i);
  for (const a of ['Abteilung', 'Trainer', 'Halle']) await sel(0).selectOption(a);
  // Tabelle 3 anlegen und wieder entfernen (Tastatur)
  await page.locator('.teil-zerlegen .knopf:has-text("Tabelle hinzufügen")').focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('.zerlegen-tabelle').count(), 3);
  await page.locator('.zerlegen-tabelle').nth(2).locator('button[aria-label="Tabelle 3 entfernen"]').focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('.zerlegen-tabelle').count(), 2);
  // Neuladen: Entwurf aus dem localStorage
  await oeffne(page, 'A9-E2-05');
  assert.deepEqual(await page.locator('.zerlegen-tabelle').nth(0).locator('.spalte-name').allTextContents(), ['Abteilung', 'Trainer', 'Halle']);
  await sel(1).selectOption('Trainer');
  // Ziel-Tabelle wählen und einen Spaltenchip per Tastatur hineinlegen
  await page.locator('button.zerlegen-titel:text("Tabelle 1")').focus();
  await page.keyboard.press('Enter');
  await page.locator('button.zerlegen-titel:text("Tabelle 2")').focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('button.zerlegen-titel:text("Tabelle 2")').getAttribute('aria-pressed'), 'true');
  await page.locator('.spalten-chip:has(.chip-name:text-is("TrainerTelefon"))').focus();
  await page.keyboard.press('Enter');
  assert.deepEqual(await page.locator('.zerlegen-tabelle').nth(1).locator('.spalte-name').allTextContents(), ['Trainer', 'TrainerTelefon']);
  await page.locator('.schluessel-schalter[aria-label="Abteilung gehört zum Schlüssel von Tabelle 1"]').focus();
  await page.keyboard.press('Space');
  await page.locator('.schluessel-schalter[aria-label="Trainer gehört zum Schlüssel von Tabelle 2"]').focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('.spalte-name.pk').count(), 2);
  await pruefenTastatur(page, 'richtig');
  assert.deepEqual(fehler(), []);
});

/* ================= Handy ================= */

test('Handy 375: alle drei Interaktionen ohne Seiten-Überlauf, Touch-Ziele ≥ 44 px', async () => {
  const page = seiten.handy;
  await oeffne(page, 'A9-E2-03');
  await zelle(page, 1, 4).click();
  await pruefeHandy(page, 'zellen');

  await oeffne(page, 'A9-E2-04');
  await pruefeHandy(page, 'anomalie_auftrag');
  await zelle(page, 0, 4, '.sim-tabelle').click();
  await page.click('.sim-auftrag .knopf:has-text("Auftrag ausgeführt")');
  await page.click('.anomalie-arten button:has-text("Änderungsanomalie")');
  await zelle(page, 1, 4, '.sim-tabelle').click();
  await pruefeHandy(page, 'anomalie_bestimmen');

  await oeffne(page, 'A9-E2-05');
  await page.locator('select.zerlegen-hinzu').nth(0).selectOption('TrainerTelefon');
  await page.locator('select.zerlegen-hinzu').nth(0).selectOption('Abteilung');
  await page.locator('.schluessel-schalter').first().click();
  await pruefen(page, 'falsch');
  await pruefeHandy(page, 'zerlegen');
  assert.deepEqual(fehler(), []);
});
