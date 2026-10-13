'use strict';
// E2E (Chromium, playwright-core): Regressionstests aus dem Probelauf Phase 8, Bereich 2b (Akten 4–5, Anomalie,
// Zerlegung, Schema-Werkbank, Bauplan-Tisch, Verhöre V4–V5, Werkzeugseiten).
//   Bauplan-Tisch per Finger (iPad, hasTouch): ein Element lässt sich über die ganze Strecke ziehen (kein
//   pointercancel durch das Scrollen der Seite); Wischen auf dem leeren Papier scrollt weiter die Seite.

const test = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');
const { starteTestServer } = require('./testserver');

const CHROMIUM = require('./chromium').chromiumPfad();

let browser;
let server;

test.before(async () => {
  browser = await chromium.launch({ executablePath: CHROMIUM });
  server = await starteTestServer({ mitInhalten: true });
});

test.after(async () => {
  if (browser) await browser.close();
  if (server) await server.schliessen();
});

async function neueSeite(optionen = {}) {
  const context = await browser.newContext({ viewport: { width: 768, height: 1024 }, reducedMotion: 'reduce', ...optionen });
  const page = await context.newPage();
  const meldungen = [];
  page.on('console', (m) => {
    if (/status of 401/.test(m.text())) return; // Kopfzeile ohne Anmeldung
    if (m.type() === 'error') meldungen.push(m.text());
  });
  page.on('pageerror', (e) => meldungen.push(`pageerror: ${e.message}`));
  return { context, page, meldungen };
}

/** Finger-Wischgeste über CDP (echte Touch-Ereignisse → Pointer Events mit pointerType „touch“). */
async function fingerZiehe(page, cdp, von, nach, schritte = 12) {
  const punkt = (x, y) => [{ x, y, id: 1, radiusX: 2, radiusY: 2, force: 1 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: punkt(von.x, von.y) });
  for (let i = 1; i <= schritte; i++) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: punkt(von.x + ((nach.x - von.x) * i) / schritte, von.y + ((nach.y - von.y) * i) / schritte)
    });
    await page.waitForTimeout(16);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(150);
}

const mitte = async (loc) => {
  const b = await loc.boundingBox();
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
};

test('Bauplan-Tisch per Finger (iPad hoch): Element über die ganze Strecke ziehen, Papier scrollt die Seite', { timeout: 120000 }, async () => {
  const { context, page, meldungen } = await neueSeite({ hasTouch: true, isMobile: true });
  try {
    const cdp = await context.newCDPSession(page);
    await page.goto(server.url + '/werkzeug/bauplan');
    await page.waitForSelector('html[data-seite="bereit"]');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector('html[data-seite="bereit"]');
    const tisch = page.locator('.bauplan');
    await tisch.locator('[data-werkzeug="entitaet"]').tap();
    await page.keyboard.type('Kletterer');
    const e1 = tisch.locator('.bp-svg .chen-entitaet[data-id="e1"]');
    await page.waitForTimeout(250); // die Zeichenfläche wird nach der Eingabe im nächsten Frame neu gezeichnet
    await e1.evaluate((e) => e.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(100);
    const scrollVorher = await page.evaluate(() => window.scrollY);
    const vorher = await mitte(e1);
    await fingerZiehe(page, cdp, vorher, { x: vorher.x + 90, y: vorher.y + 60 });
    const nachher = await mitte(e1);
    assert.equal(await page.evaluate(() => window.scrollY), scrollVorher, 'Ziehen eines Elements scrollt die Seite nicht');
    assert.ok(Math.abs(nachher.x - vorher.x - 90) <= 6, `waagerecht um 90 px gezogen (ist ${Math.round(nachher.x - vorher.x)})`);
    assert.ok(Math.abs(nachher.y - vorher.y - 60) <= 6, `senkrecht um 60 px gezogen (ist ${Math.round(nachher.y - vorher.y)})`);
    // die neue Lage steht im Entwurf
    const entwurf = await page.evaluate(() => JSON.parse(localStorage.getItem('dd-werkzeug:bauplan')));
    assert.equal(entwurf.graph.entitaeten[0].name, 'Kletterer');
    // Antippen wählt weiter aus
    await tisch.locator('[data-werkzeug="attribut"]').tap();
    await page.keyboard.type('KlettererNr');
    assert.equal(await tisch.locator('.bp-svg .chen-attribut').count(), 1);
    // Wischen auf dem leeren Papier scrollt die Seite
    const flaeche = await tisch.locator('.bp-flaeche').boundingBox();
    const s0 = await page.evaluate(() => window.scrollY);
    await fingerZiehe(page, cdp, { x: flaeche.x + 12, y: flaeche.y + flaeche.height - 20 }, { x: flaeche.x + 12, y: flaeche.y + 30 });
    assert.ok((await page.evaluate(() => window.scrollY)) > s0, 'Papier wischen scrollt');
    assert.deepEqual(meldungen, []);
  } finally {
    await context.close();
  }
});

/** Seite mit angemeldeter Lena (eA-Kurs k:17, Akten 1–5). */
async function lenaSeite(optionen = {}) {
  const cookie = await server.anmelden({});
  const db = server.t.db;
  const alt = JSON.parse(db.prepare('SELECT einstellungen FROM kurse WHERE kurs_id = ?').get('k:17').einstellungen);
  db.prepare('UPDATE kurse SET einstellungen = ? WHERE kurs_id = ?').run(JSON.stringify({ ...alt, akten: [1, 2, 3, 4, 5], niveau: 'eA', verhoer: 'offen' }), 'k:17');
  const s = await neueSeite(optionen);
  const [name, wert] = cookie.split(/=(.*)/s);
  await s.context.addCookies([{ name, value: wert, url: server.url }]);
  return s;
}

async function oeffneAufgabe(page, id) {
  await page.goto(`${server.url}/ermittlung/${id.slice(0, 5)}?aufgabe=${id}`);
  await page.waitForSelector(`#aufgabe-karte .reiter:text("${id}")`, { timeout: 30000 });
}

test('Anomalie-Simulator A4-E1-04: der Befund nach dem Löschen nennt nicht die technische Zeilennummer', { timeout: 120000 }, async () => {
  const { context, page, meldungen } = await lenaSeite();
  try {
    await oeffneAufgabe(page, 'A4-E1-04');
    await page.locator('#aufgabe-karte .sim-tabelle button:has-text("Zeile löschen")').click();
    await page.click('#aufgabe-karte .sim-auftrag .knopf:has-text("Auftrag ausgeführt")');
    const befund = await page.locator('.sim-befund').textContent();
    assert.match(befund, /Abteilungen: Judo/);
    assert.match(befund, /TrainerTelefon: 0000-16180/);
    assert.doesNotMatch(befund, /Zeile: 12/, 'die Zeilennummer ist keine verlorene Information');
    // die Zelle der Spalte „Zeile“ ist nicht als Verlust markiert
    assert.equal(await page.locator('.sim-tabelle tr.geloescht td.verlust').count(), 4, 'Mitglied, Abteilung, Trainer, Telefon');
    assert.deepEqual(meldungen, []);
  } finally {
    await context.close();
  }
});

test('Handy (390 px): Vorschau und Musterlösung in Kurzschreibweise brechen um statt abgeschnitten zu scrollen', { timeout: 120000 }, async () => {
  const { context, page, meldungen } = await lenaSeite({ viewport: { width: 390, height: 844 } });
  try {
    for (const id of ['A4-E2-06', 'A5-E3-04']) {
      await oeffneAufgabe(page, id);
      await page.click('#k-loesung');
      await page.click('#k-loesung-ja');
      await page.waitForSelector('#aufgabe-karte .zerlegen-loesung .schema-block, #aufgabe-karte .wk-loesung .schema-block');
      const abgeschnitten = await page.evaluate(() =>
        [...document.querySelectorAll('#aufgabe-karte .zerlegen-loesung .schema-block, #aufgabe-karte .wk-loesung .schema-block, #aufgabe-karte .wk-vorschau .schema-block')]
          .filter((b) => b.scrollWidth > b.clientWidth + 1)
          .map((b) => b.textContent.slice(0, 40)));
      assert.deepEqual(abgeschnitten, [], `${id}: Schema-Blöcke ohne seitliches Scrollen`);
    }
    assert.deepEqual(meldungen, []);
  } finally {
    await context.close();
  }
});

test('Lösung angesehen (Bauplan-Tisch A5-E2-07): kein Versprechen „weiter üben“, wenn Prüfen gesperrt ist', { timeout: 120000 }, async () => {
  const { context, page, meldungen } = await lenaSeite({ viewport: { width: 1366, height: 768 } });
  try {
    await oeffneAufgabe(page, 'A5-E2-07');
    await page.click('#k-loesung');
    await page.click('#k-loesung-ja');
    await page.waitForSelector('#loesung-karte');
    assert.equal(await page.locator('#k-pruefen').isDisabled(), true, 'Prüfen ist nach dem Aufdecken gesperrt');
    const text = await page.locator('#loesung-karte').textContent();
    assert.match(text, /keine Punkte mehr/);
    assert.doesNotMatch(text, /weiter üben/);
    assert.deepEqual(meldungen, []);
  } finally {
    await context.close();
  }
});

test('Verhöre 4 und 5 siezen auch die Bedienhinweise der Modellierungs-Widgets; das Lab duzt', { timeout: 300000 }, async () => {
  const DU = /\b(du|Du|dein|deine|dir|dich|Tippe|Ziehe|Markiere|Lege|Zeichne|Ergänze|Wähle|Gib|Setze|Verbinde|Führe|Lösche)\b/;
  const gesehen = new Set();
  for (let n = 0; n < 4; n++) {
    const cookie = await server.anmelden({ sub: `s:${4100 + n}`, name: `Test ${n}`, kurse: [{ id: 'k:17', name: 'Inf-LK 12', rolle: 'mitglied' }] });
    const db = server.t.db;
    const alt = JSON.parse(db.prepare('SELECT einstellungen FROM kurse WHERE kurs_id = ?').get('k:17').einstellungen);
    db.prepare('UPDATE kurse SET einstellungen = ? WHERE kurs_id = ?').run(JSON.stringify({ ...alt, akten: [1, 2, 3, 4, 5], niveau: 'eA', verhoer: 'offen' }), 'k:17');
    const { context, page, meldungen } = await neueSeite({ viewport: { width: 1024, height: 768 } });
    const [name, wert] = cookie.split(/=(.*)/s);
    await context.addCookies([{ name, value: wert, url: server.url }]);
    try {
      for (const akte of [4, 5]) {
        await page.goto(`${server.url}/verhoer/${akte}`);
        await page.click('#k-verhoer-start');
        await page.waitForSelector('html[data-seite="verhoer"]');
        const kacheln = page.locator('#verhoer-kacheln .kachel');
        const anzahl = await kacheln.count();
        for (let i = 0; i < anzahl; i++) {
          await kacheln.nth(i).click();
          await page.waitForTimeout(250);
          const karte = page.locator('#verhoer-aufgabe');
          const art = (await karte.locator('.bauplan').count()) ? 'er'
            : (await karte.locator('.werkbank').count()) ? 'schema'
              : (await karte.locator('.teil-zerlegen').count()) ? 'zerlegen'
                : (await karte.locator('.sim-tabelle').count()) ? 'anomalie' : null;
          if (!art) continue;
          gesehen.add(art);
          if (art === 'er') {
            // Statusmeldung nach einer Aktion
            await karte.locator('[data-werkzeug="verbinden"]').click();
          }
          const text = (await karte.textContent()).replace(/\s+/g, ' ');
          const fund = DU.exec(text);
          assert.equal(fund, null, `V${akte} (${art}): du-Form „${fund && text.slice(Math.max(0, fund.index - 40), fund.index + 40)}“`);
        }
      }
      assert.deepEqual(meldungen, []);
    } finally {
      await context.close();
    }
  }
  assert.ok(gesehen.has('er') && gesehen.has('schema'), `Verhör 5 mit er und schema (${[...gesehen]})`);
  // Lab: geduzt
  const { context, page } = await lenaSeite();
  try {
    await oeffneAufgabe(page, 'A5-E2-07');
    assert.match(await page.locator('#aufgabe-karte .bp-kopf-text').textContent(), /Zeichne den Bauplan/);
  } finally {
    await context.close();
  }
});
