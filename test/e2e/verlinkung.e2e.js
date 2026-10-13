'use strict';
// E2E (Chromium, playwright-core): Verlinkung der Verstehenshilfen (Plan Phase 4 Task 5). Echte Akten, Sandbox und
// SQL-Prüfer; Schülerin mit freigeschalteten Akten 2 und 3.
//  - Diagnose KREUZPRODUKT in Ermittlung 2.1 → „Im Spurenbrett ansehen“ öffnet das Spurenbrett mit den Tabellen der
//    Abfrage (Bedingung = Vorschlag aus den Fremdschlüsseln), dazu „In der Zeitlupe ansehen“.
//  - Freie Ermittlung: GB_REGEL → Sortierfächer mit der eigenen Abfrage, WHERE_MIT_AGG → Zeitlupe.
//  - Blöcke: A2-E1-03 (Spurenbrett, 6 × 4 = 24 Fäden; die zeilen-Interaktion löst die Aufgabe, danach Brett mit
//    Bedingung in der Erklärung), Intro A3-E2 (Zeitlupe), A3-E1-04 (Sortierfächer erst in der Erklärung).
//  - Ohne WebAssembly zeigen alle drei Werkzeuge denselben Hinweis.
// Je Seite: keine CSP-Meldungen, kein horizontales Scrollen.

const test = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');
const { starteTestServer } = require('./testserver');

const CHROMIUM = require('./chromium').chromiumPfad();
const OHNE_WASM = /Dieses Werkzeug braucht WebAssembly im Browser/;

let browser;
let server;
let cookie;

test.before(async () => {
  browser = await chromium.launch({ executablePath: CHROMIUM });
  server = await starteTestServer({ mitInhalten: true });
  cookie = await server.anmelden({});
  // Kurs der Testschülerin: Akten 1–3 frei
  const db = server.t.db;
  const zeile = db.prepare('SELECT einstellungen FROM kurse WHERE kurs_id = ?').get('k:17');
  const alt = JSON.parse(zeile.einstellungen);
  db.prepare('UPDATE kurse SET einstellungen = ? WHERE kurs_id = ?').run(JSON.stringify({ ...alt, akten: [1, 2, 3] }), 'k:17');
});

test.after(async () => {
  if (browser) await browser.close();
  if (server) await server.schliessen();
});

async function neueSeite({ angemeldet = true, viewport = { width: 1280, height: 900 } } = {}) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
  if (angemeldet) {
    const [name, wert] = cookie.split('=');
    await context.addCookies([{ name, value: wert, url: server.url }]);
  }
  const page = await context.newPage();
  const meldungen = [];
  page.on('console', (m) => {
    if (/Content Security Policy|Content-Security-Policy|unsafe-eval|unsafe-inline/i.test(m.text())) meldungen.push(m.text());
  });
  page.on('pageerror', (e) => meldungen.push(`pageerror: ${e.message}`));
  return { context, page, meldungen };
}

async function ohneUeberlauf(page, name) {
  const ueberlauf = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(ueberlauf <= 0, `${name}: horizontales Scrollen (${ueberlauf} px)`);
}

async function oeffneAufgabe(page, ermittlung, id) {
  await page.goto(`${server.url}/ermittlung/${ermittlung}?aufgabe=${id}`);
  await page.waitForSelector(`#aufgabe-karte .reiter[aria-current="step"]:text("${id}")`, { timeout: 30000 }).catch(async () => {
    await page.waitForSelector(`#aufgabe-karte .reiter:text("${id}")`, { timeout: 30000 });
  });
}

test('Diagnose KREUZPRODUKT öffnet das Spurenbrett mit den Tabellen der Abfrage (und die Zeitlupe)', { timeout: 120000 }, async () => {
  const { context, page, meldungen } = await neueSeite();
  try {
    await oeffneAufgabe(page, 'A2-E1', 'A2-E1-06');
    await page.waitForSelector('.lern-konsole textarea');
    const sql = 'SELECT Rad.RadID, Rad.Typ, Station.Name\nFROM Rad, Station';
    await page.fill('.lern-konsole textarea', sql);
    await page.click('#k-pruefen');
    await page.waitForSelector('.lern-konsole .diagnose', { timeout: 30000 });
    assert.match(await page.textContent('.lern-konsole .diagnose'), /Produkt der Tabellengrößen/);
    // je Werkzeug genau ein Knopf, obwohl KEIN_VERBUND und KREUZPRODUKT gemeldet werden
    assert.equal(await page.locator('.lern-konsole .diagnose-werkzeug[data-werkzeug="spurenbrett"]').count(), 1);
    assert.equal(await page.locator('.lern-konsole .diagnose-werkzeug[data-werkzeug="zeitlupe"]').count(), 1);
    assert.equal(await page.locator('.lern-konsole .diagnose-werkzeug[data-werkzeug="sortierfaecher"]').count(), 0);
    await ohneUeberlauf(page, 'Ermittlung mit Diagnose-Links');

    await page.click('.lern-konsole .diagnose-werkzeug[data-werkzeug="spurenbrett"]');
    await page.waitForURL(/\/werkzeug\/spurenbrett\?db=stadtrad$/);
    await page.waitForSelector('.sb-karte', { timeout: 30000 });
    assert.deepEqual(await page.$$eval('.sb-stapel-titel', (h) => h.map((x) => x.textContent)), ['Rad', 'Station']);
    assert.equal(await page.isChecked('#sb-t-Rad'), true);
    assert.equal(await page.isChecked('#sb-t-Station'), true);
    assert.equal(await page.inputValue('#sb-bedingung'), 'Rad.StationID = Station.StationID');

    // zurück zur Ermittlung: die eigene Abfrage steht noch im Editor, Zeitlupe-Link übergibt sie
    await page.goBack();
    await page.waitForSelector('.lern-konsole textarea');
    assert.equal(await page.inputValue('.lern-konsole textarea'), sql);
    await page.click('#k-pruefen');
    await page.waitForSelector('.lern-konsole .diagnose-werkzeug[data-werkzeug="zeitlupe"]', { timeout: 30000 });
    await page.click('.lern-konsole .diagnose-werkzeug[data-werkzeug="zeitlupe"]');
    await page.waitForURL(/\/werkzeug\/zeitlupe\?db=stadtrad$/);
    await page.waitForFunction(() => document.documentElement.dataset.zeitlupe === 'bereit', null, { timeout: 30000 });
    assert.equal(await page.inputValue('#sql-eingabe'), sql);
    assert.equal(await page.isVisible('#zl-rueck'), true, 'Rücksprung zur Ermittlung');
    assert.deepEqual(meldungen, []);
  } finally {
    await context.close();
  }
});

test('Freie Ermittlung: GB_REGEL → Sortierfächer, WHERE_MIT_AGG → Zeitlupe (mit der eigenen Abfrage)', { timeout: 120000 }, async () => {
  const { context, page, meldungen } = await neueSeite();
  try {
    await page.goto(`${server.url}/konsole/stadtrad`);
    await page.waitForFunction(() => document.documentElement.dataset.konsole === 'bereit');
    const gb = 'SELECT Typ, Baujahr, COUNT(*) AS Anzahl\nFROM Rad\nGROUP BY Typ';
    await page.fill('#sql-eingabe', gb);
    await page.click('#k-ausfuehren');
    await page.waitForSelector('#ergebnis .diagnose-werkzeug[data-werkzeug="sortierfaecher"]', { timeout: 30000 });
    await page.click('#ergebnis .diagnose-werkzeug[data-werkzeug="sortierfaecher"]');
    await page.waitForURL(/\/werkzeug\/sortierfaecher\?db=stadtrad$/);
    await page.waitForSelector('#sf-faecher li', { timeout: 30000 });
    assert.equal(await page.inputValue('#sf-eingabe'), gb);

    await page.goto(`${server.url}/konsole/stadtrad`);
    await page.waitForFunction(() => document.documentElement.dataset.konsole === 'bereit');
    await page.fill('#sql-eingabe', 'SELECT Typ, COUNT(*) AS Anzahl\nFROM Rad\nWHERE COUNT(*) > 3\nGROUP BY Typ');
    await page.click('#k-ausfuehren');
    await page.waitForSelector('#ergebnis .diagnose-werkzeug[data-werkzeug="zeitlupe"]', { timeout: 30000 });
    assert.equal(await page.locator('#ergebnis .diagnose-werkzeug[data-werkzeug="spurenbrett"]').count(), 0);
    assert.deepEqual(meldungen, []);
  } finally {
    await context.close();
  }
});

test('Block spurenbrett in A2-E1-03: 6 × 4 = 24 Fäden, zeilen-Interaktion, Erklärung mit Bedingung', { timeout: 120000 }, async () => {
  const { context, page, meldungen } = await neueSeite();
  try {
    await oeffneAufgabe(page, 'A2-E1', 'A2-E1-03');
    await page.waitForSelector('.wb-spurenbrett .wb-zaehler-zeile:not([hidden])', { timeout: 30000 });
    assert.equal(await page.textContent('.wb-spurenbrett .wb-zaehler-zeile'), '6 × 4 = 24 Fäden');
    assert.equal(await page.locator('.wb-spurenbrett .wb-karte').count(), 10);
    await page.waitForFunction(() => document.querySelectorAll('.wb-spurenbrett .wb-faden').length === 24);
    for (const breite of [1280, 768, 375]) {
      await page.setViewportSize({ width: breite, height: 900 });
      await page.waitForTimeout(150);
      await ohneUeberlauf(page, `A2-E1-03 @${breite}`);
    }
    await page.setViewportSize({ width: 1280, height: 900 });
    // Zeilen des Kreuzprodukts antippen, die die Verbundbedingung erfüllen (0-basiert 1, 4, 12, 19, 21)
    const knoepfe = page.locator('#aufgabe-karte .dbtabelle .zeilen-knopf');
    assert.equal(await knoepfe.count(), 24);
    for (const i of [1, 4, 12, 19, 21]) await knoepfe.nth(i).click();
    await page.click('#k-pruefen');
    await page.waitForSelector('#feedback-richtig', { timeout: 30000 });
    await page.waitForSelector('#loesung-karte .wb-spurenbrett .wb-zaehler-zeile:not([hidden])', { timeout: 30000 });
    assert.equal(await page.textContent('#loesung-karte .wb-spurenbrett .wb-zaehler-zeile'), '6 × 4 = 24 Fäden → 5 bleiben');
    // Fäden zeichnet erst der nächste Animationsframe bzw. ResizeObserver – darauf warten (CI ist langsamer).
    await page.waitForFunction(() => document.querySelectorAll('#loesung-karte .wb-faden.passt').length === 5, null, { timeout: 30000 });
    assert.match(await page.textContent('#loesung-karte .wb-spurenbrett .wb-hinweis'), /Rad 10/);
    assert.deepEqual(meldungen, []);
  } finally {
    await context.close();
  }
});

test('Block zeitlupe im Intro von A3-E2, Block sortierfaecher erst in der Erklärung von A3-E1-04', { timeout: 120000 }, async () => {
  const { context, page, meldungen } = await neueSeite();
  try {
    await page.goto(`${server.url}/ermittlung/A3-E2`);
    await page.waitForSelector('.wb-zeitlupe .wb-schritt', { timeout: 30000 });
    const klauseln = await page.$$eval('.wb-zeitlupe .wb-klausel', (k) => k.map((x) => x.textContent));
    assert.deepEqual(klauseln, ['FROM', 'WHERE', 'GROUP BY', 'HAVING', 'SELECT', 'ORDER BY']);
    await ohneUeberlauf(page, 'Intro A3-E2');

    await oeffneAufgabe(page, 'A3-E1', 'A3-E1-04');
    assert.equal(await page.locator('.wb-sortierfaecher').count(), 0, 'vor dem Lösen keine Sortierfächer');
    await page.click('#k-loesung');
    await page.click('#k-loesung-ja');
    await page.waitForSelector('#loesung-karte .wb-sortierfaecher .wb-fach', { timeout: 30000 });
    assert.equal(await page.locator('#loesung-karte .wb-fach').count(), 5);
    assert.match(await page.textContent('#loesung-karte .wb-korb'), /vor dem Gruppieren/);
    await page.click('#loesung-karte .wb-sortierfaecher [data-werkzeug="sortierfaecher"]');
    await page.waitForURL(/\/werkzeug\/sortierfaecher\?db=stadtfest$/);
    assert.match(await page.inputValue('#sf-eingabe'), /WHERE BonNr BETWEEN 444 AND 451/);
    assert.deepEqual(meldungen, []);
  } finally {
    await context.close();
  }
});

test('Ohne WebAssembly: Zeitlupe, Spurenbrett und Sortierfächer zeigen denselben Hinweis (kein Server-Rückfall)', { timeout: 120000 }, async () => {
  for (const [werkzeug, ort] of [
    ['zeitlupe', '#zl-meldung'],
    ['spurenbrett', '#sb-brett'],
    ['sortierfaecher', '#sf-meldung']
  ]) {
    const { context, page } = await neueSeite({ angemeldet: false });
    try {
      // ohne WASM bleibt nur sql-asm.js – hier gesperrt wie in einem Browser, in dem auch das nicht läuft
      await page.route(/sql-asm\.js/, (route) => route.abort());
      const sqlAnfragen = [];
      page.on('request', (r) => {
        if (/\/api\/sql\//.test(r.url())) sqlAnfragen.push(r.url());
      });
      await page.goto(`${server.url}/werkzeug/${werkzeug}?db=eisdiele&ohneWasm=1`);
      await page.waitForFunction(
        ([sel, muster]) => new RegExp(muster).test((document.querySelector(sel) || {}).textContent || ''),
        [ort, OHNE_WASM.source],
        { timeout: 30000 }
      );
      assert.deepEqual(sqlAnfragen, [], `${werkzeug}: keine Ausführung auf dem Server`);
    } finally {
      await context.close();
    }
  }
});
