'use strict';
// E2E (Chromium, playwright-core): Bauplan-Tisch und Schema-Werkbank (Plan Phase 5 Task 4, Review Focus 4).
// Beispielakte (test/fixtures/akte_beispiel.json, Akte 9, eA):
//   A9-E2-08 er/lesen mit er-Block (Elemente antippen; erst falsch, dann richtig)
//   A9-E2-07 er/ergaenzen mit mengen-Block – im Zeichenmodus (Verbinden, Panel, Ziehen, Pfeiltasten; erst falsche
//            Kardinalität → Kriterienliste mit ✘ und P9, dann richtig → GELÖST) und als zweite Schülerin im
//            Listenmodus nur per Tastatur
//   A9-E2-06 schema/schluessel (Werkbank: PK antippen, FK mit Zielrelation und rotem Faden; erst falsch, dann richtig)
// Werkzeugseiten /werkzeug/bauplan und /werkzeug/werkbank (frei, Entwurf bleibt nach Neuladen), Breiten 1024 × 768,
// 768 × 1024 und 375 ohne Seiten-Überlauf, reduzierte Bewegung, keine CSP-Meldungen.
// SCREENSHOTS=1: Fotos nach SCREENSHOT_ORDNER (Standard docs/screenshots/phase5).

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');
const { starteTestServer } = require('./testserver');

const CHROMIUM = require('./chromium').chromiumPfad();
const FIXTURE = path.join(__dirname, '..', 'fixtures', 'akte_beispiel.json');
const FOTOS = process.env.SCREENSHOTS === '1';
const FOTO_ORDNER = process.env.SCREENSHOT_ORDNER || path.join(__dirname, '..', '..', 'docs', 'screenshots', 'phase5');
const ZWEITE = { sub: 's:1043', name: 'Mika R.', kurse: [{ id: 'k:17', name: 'Inf-LK 12', rolle: 'mitglied' }] };

let browser;
let server;

test.before(async () => {
  browser = await chromium.launch({ executablePath: CHROMIUM });
  server = await starteTestServer({ mitInhalten: true, aktenDateien: [FIXTURE] });
  const db = server.t.db;
  await server.anmelden({}); // legt den Kurs k:17 an
  const alt = JSON.parse(db.prepare('SELECT einstellungen FROM kurse WHERE kurs_id = ?').get('k:17').einstellungen);
  db.prepare('UPDATE kurse SET einstellungen = ? WHERE kurs_id = ?').run(JSON.stringify({ ...alt, akten: [9], niveau: 'eA' }), 'k:17');
  if (FOTOS) fs.mkdirSync(FOTO_ORDNER, { recursive: true });
});

test.after(async () => {
  if (browser) await browser.close();
  if (server) await server.schliessen();
});

async function neueSeite({ nutzer = null, viewport = { width: 1440, height: 900 } } = {}) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
  if (nutzer) {
    const cookie = await server.anmelden(nutzer);
    const [name, wert] = cookie.split('=');
    await context.addCookies([{ name, value: wert, url: server.url }]);
  }
  const page = await context.newPage();
  const meldungen = [];
  page.on('console', (m) => {
    if (/status of 401/.test(m.text())) return; // /api/ich ohne Anmeldung (Kopfzeile)
    if (m.type() === 'error' || /Content Security Policy|Content-Security-Policy|unsafe-eval|unsafe-inline/i.test(m.text())) meldungen.push(m.text());
  });
  page.on('pageerror', (e) => meldungen.push(`pageerror: ${e.message}`));
  return { context, page, meldungen };
}

async function ohneUeberlauf(page, name) {
  const ueberlauf = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(ueberlauf <= 0, `${name}: horizontales Scrollen der Seite (${ueberlauf} px)`);
}

async function foto(page, name) {
  if (!FOTOS) return;
  await page.screenshot({ path: path.join(FOTO_ORDNER, `${name}.png`), fullPage: true });
}

async function oeffneAufgabe(page, id) {
  await page.goto(`${server.url}/ermittlung/A9-E2?aufgabe=${id}`);
  await page.waitForSelector(`#aufgabe-karte .reiter:text("${id}")`, { timeout: 30000 });
}

async function pruefen(page, erwartet) {
  await page.click('#k-pruefen');
  await page.waitForSelector(erwartet === 'richtig' ? '#feedback-richtig' : '.feedback.falsch', { timeout: 30000 });
}

const transform = (page, sel) => page.locator(sel).getAttribute('transform');

test('Bauplan lesen (A9-E2-08): Elemente antippen, falsch und richtig', { timeout: 120000 }, async () => {
  const { context, page, meldungen } = await neueSeite({ nutzer: {} });
  try {
    await oeffneAufgabe(page, 'A9-E2-08');
    const block = page.locator('#aufgabe-karte .er-block.waehlbar');
    await block.waitFor();
    assert.equal(await block.locator('.chen-entitaet').count(), 2);
    assert.equal(await block.locator('.chen-beziehung').count(), 1);
    assert.equal(await block.locator('.chen-attribut').count(), 4);
    assert.equal(await block.locator('.chen-schluessel').count(), 2, 'Schlüsselattribute unterstrichen');
    assert.equal(await block.locator('.chen-kard').count(), 2, 'Kardinalitäts-Plättchen');
    await block.locator('.chen-svg [data-id="e1"]').click();
    assert.equal(await block.locator('.chen-svg [data-id="e1"]').getAttribute('aria-pressed'), 'true');
    await pruefen(page, 'falsch');
    // Rest per Tastatur in der Zeichnung und per Liste
    await block.locator('.chen-svg [data-id="e2"]').focus();
    await page.keyboard.press('Enter');
    await block.locator('.chen-svg [data-id="b1"]').focus();
    await page.keyboard.press(' ');
    await block.locator('summary').click();
    await block.locator('.er-liste-knopf[data-id="e1.0"]').click();
    await block.locator('.er-liste-knopf[data-id="e2.0"]').click();
    assert.equal(await block.locator('.er-liste-knopf[aria-pressed="true"]').count(), 5);
    assert.match(await page.textContent('.teil-er-lesen'), /Gewählt: 5/);
    await pruefen(page, 'richtig');
    await page.waitForSelector('#aufgabe-karte .chen-el.loesung');
    await ohneUeberlauf(page, 'A9-E2-08');
    await foto(page, 'bauplan_lesen_1440');
    assert.deepEqual(meldungen, []);
  } finally {
    await context.close();
  }
});

test('Bauplan ergänzen (A9-E2-07) im Zeichenmodus: Verbinden, Panel, Ziehen, Pfeiltasten, Kriterienliste, GELÖST', { timeout: 120000 }, async () => {
  const { context, page, meldungen } = await neueSeite({ nutzer: {} });
  try {
    await page.goto(server.url + '/');
    await page.evaluate(() => localStorage.setItem('dd-bauplan-ansicht', 'zeichnen'));
    await oeffneAufgabe(page, 'A9-E2-07');
    await page.waitForSelector('#aufgabe-karte .mengen-block .mengen-linie');
    assert.equal(await page.locator('.mengen-block .mengen-linie').count(), 3);
    const tisch = page.locator('#aufgabe-karte .bauplan');
    await tisch.waitFor();
    const flaeche = tisch.locator('.bp-svg');
    assert.equal(await flaeche.locator('.chen-entitaet').count(), 2, 'Startdiagramm');

    // Ziehen per Pointer: Ermittler (samt Attributen) nach rechts unten
    const vorher = await transform(page, '.bp-svg [data-id="e1"]');
    const vorherAttr = await transform(page, '.bp-svg [data-id="e1.0"]');
    await flaeche.scrollIntoViewIfNeeded();
    const box = await flaeche.locator('[data-id="e1"]').boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 30, box.y + box.height / 2 + 40, { steps: 5 });
    await page.mouse.up();
    assert.notEqual(await transform(page, '.bp-svg [data-id="e1"]'), vorher, 'Entitätstyp gezogen');
    assert.notEqual(await transform(page, '.bp-svg [data-id="e1.0"]'), vorherAttr, 'Attribute ziehen mit');
    // Pfeiltaste verschiebt den fokussierten Entitätstyp
    const vorFall = await transform(page, '.bp-svg [data-id="e2"]');
    await flaeche.locator('[data-id="e2"]').focus();
    await page.keyboard.press('ArrowLeft');
    await page.waitForFunction((v) => document.querySelector('.bp-svg [data-id="e2"]').getAttribute('transform') !== v, vorFall);
    // Vorgegebenes Element lässt sich nicht löschen
    await flaeche.locator('[data-id="e2"]').focus();
    await page.keyboard.press('Delete');
    assert.equal(await flaeche.locator('.chen-entitaet').count(), 2);
    assert.match(await tisch.locator('.bp-status').textContent(), /vorgegeben/);

    // Verbinden: Ermittler → Fall ergibt einen neuen Beziehungstyp
    await tisch.locator('[data-werkzeug="verbinden"]').click();
    assert.equal(await tisch.locator('[data-werkzeug="verbinden"]').getAttribute('aria-pressed'), 'true');
    await flaeche.locator('[data-id="e1"]').click();
    await flaeche.locator('[data-id="e2"]').click();
    await flaeche.locator('.chen-beziehung').waitFor();
    assert.equal(await flaeche.locator('.chen-kante').count(), 2);
    assert.equal(await flaeche.locator('.chen-kard.offen').count(), 2, 'Kardinalitäten noch offen');
    const panel = tisch.locator('.bp-panel');
    await panel.locator('.bp-name-feld').fill('leitet');
    const kards = panel.locator('.bp-ende-kard');
    await kards.nth(0).selectOption('n');
    await kards.nth(1).selectOption('n');
    await pruefen(page, 'falsch');
    const ergebnis = tisch.locator('.bp-ergebnis');
    await ergebnis.waitFor();
    assert.match(await ergebnis.locator('.bp-zaehler').textContent(), /^\d+ von \d+$/);
    assert.ok(await ergebnis.locator('li.falsch').count() >= 1, 'Kriterium ✘');
    assert.equal(await ergebnis.locator('.falle').first().textContent(), 'P9');
    assert.match(await ergebnis.textContent(), /„leitet“/);
    assert.doesNotMatch(await ergebnis.textContent(), /Detektiv/, 'keine Synonyme der Musterlösung');
    assert.equal(await flaeche.locator('.chen-kard-fehler').count(), 2, 'falsche Kardinalitäten rot umkreist');
    assert.match(await page.textContent('.feedback.falsch'), /Kriterien erfüllt/);
    await foto(page, 'bauplan_zeichnen_falsch_1440');

    // richtig: 1 am Ermittler, n am Fall
    await flaeche.locator('.chen-beziehung').click();
    await panel.locator('.bp-ende-kard').nth(0).selectOption('1');
    await pruefen(page, 'richtig');
    await ergebnis.locator('.stempel.geloest').waitFor();
    assert.equal(await ergebnis.locator('li.falsch').count(), 0);
    const [r, g] = (await ergebnis.locator('.bp-zaehler').textContent()).split(' von ');
    assert.equal(r, g);
    await page.waitForSelector('#aufgabe-karte .bp-loesung:not([hidden]) .chen-svg');
    // reduzierte Bewegung: Stempel ohne Animation
    assert.equal(await ergebnis.locator('.stempel').evaluate((e) => getComputedStyle(e).animationName), 'none');
    await ohneUeberlauf(page, 'A9-E2-07 1440');
    await foto(page, 'bauplan_zeichnen_geloest_1440');

    // Entwurf bleibt nach dem Neuladen (localStorage)
    await oeffneAufgabe(page, 'A9-E2-07');
    await page.locator('#aufgabe-karte .bp-svg .chen-beziehung').waitFor();

    for (const [b, h] of [[1024, 768], [768, 1024], [375, 812]]) {
      await page.setViewportSize({ width: b, height: h });
      await page.waitForTimeout(200);
      await ohneUeberlauf(page, `A9-E2-07 @${b}`);
      if (b === 375) assert.equal(await page.locator('.bp-handy-hinweis').isVisible(), true, 'Hinweis auf den Listenmodus');
      await foto(page, `bauplan_zeichnen_${b}`);
    }
    assert.deepEqual(meldungen, []);
  } finally {
    await context.close();
  }
});

test('Bauplan ergänzen (A9-E2-07) im Listenmodus nur per Tastatur (zweite Schülerin)', { timeout: 120000 }, async () => {
  const { context, page, meldungen } = await neueSeite({ nutzer: ZWEITE, viewport: { width: 768, height: 1024 } });
  try {
    await oeffneAufgabe(page, 'A9-E2-07');
    const tisch = page.locator('#aufgabe-karte .bauplan');
    await tisch.waitFor();
    await tisch.locator('[data-ansicht="liste"]').focus();
    await page.keyboard.press('Enter');
    assert.equal(await tisch.locator('[data-ansicht="liste"]').getAttribute('aria-pressed'), 'true');
    assert.equal(await tisch.locator('.bp-svg').isVisible(), false);
    const liste = tisch.locator('.bp-liste');
    assert.equal(await liste.locator('.bp-karte-entitaet').count(), 2);
    assert.equal(await liste.locator('.bp-karte-entitaet .bp-name-feld').first().getAttribute('readonly'), '', 'Startnamen fest');
    // neuer Beziehungstyp: Knopf per Tastatur, Name wird fokussiert
    await liste.locator('[data-aktion="beziehung"]').focus();
    await page.keyboard.press('Enter');
    await page.keyboard.type('leitet');
    const karte = liste.locator('.bp-karte-beziehung');
    assert.equal(await karte.locator('.bp-name-feld').inputValue(), 'leitet');
    for (let i = 0; i < 2; i++) {
      await karte.locator('[data-aktion="ende"]').focus();
      await page.keyboard.press('Enter');
    }
    assert.equal(await karte.locator('.bp-ende').count(), 2);
    // Auswahllisten per Tastatur: Ende 1 = Ermittler (1), Ende 2 = Fall (n)
    const ziel = karte.locator('.bp-ende-ziel');
    const kard = karte.locator('.bp-ende-kard');
    await ziel.nth(0).focus();
    await page.keyboard.press('ArrowDown'); // Ermittler
    await kard.nth(0).focus();
    await page.keyboard.press('ArrowDown'); // 1
    await ziel.nth(1).focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown'); // Fall
    await kard.nth(1).focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown'); // n
    assert.deepEqual([await ziel.nth(0).inputValue(), await kard.nth(0).inputValue(), await ziel.nth(1).inputValue(), await kard.nth(1).inputValue()], ['e1', '1', 'e2', 'n']);
    await page.locator('#k-pruefen').focus();
    await page.keyboard.press('Enter');
    await page.waitForSelector('#feedback-richtig', { timeout: 30000 });
    await tisch.locator('.bp-ergebnis .stempel.geloest').waitFor();
    await ohneUeberlauf(page, 'Listenmodus @768');
    await foto(page, 'bauplan_liste_768');
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(200);
    await ohneUeberlauf(page, 'Listenmodus @375');
    await foto(page, 'bauplan_liste_375');
    assert.deepEqual(meldungen, []);
  } finally {
    await context.close();
  }
});

test('Schema-Werkbank (A9-E2-06): PK antippen, FK mit Zielrelation und rotem Faden, Teilfeedback', { timeout: 120000 }, async () => {
  const { context, page, meldungen } = await neueSeite({ nutzer: {} });
  try {
    await oeffneAufgabe(page, 'A9-E2-06');
    const wb = page.locator('#aufgabe-karte .werkbank');
    await wb.waitFor();
    assert.equal(await wb.locator('.wk-karte').count(), 2);
    const sorte = wb.locator('.wk-karte').nth(0);
    const verkauf = wb.locator('.wk-karte').nth(1);
    await sorte.locator('.wk-attr-name', { hasText: 'SorteNr' }).click();
    assert.equal(await sorte.locator('.wk-attr-name', { hasText: 'SorteNr' }).getAttribute('aria-pressed'), 'true');
    await pruefen(page, 'falsch');
    await page.waitForSelector('#aufgabe-karte .wk-karte.falsch');
    assert.ok(await wb.locator('.wk-karte.ok').count() >= 1, 'Sorte ✔');
    assert.match(await verkauf.locator('.wk-rueckmeldung').textContent(), /Verkauf/);
    assert.ok(await verkauf.locator('.falle').count() >= 1, 'Fallen-Plakette');
    assert.match(await wb.locator('.wk-ergebnis .wk-zaehler').textContent(), /1 von 2/);
    await foto(page, 'werkbank_falsch_1440');
    // richtig: PK VerkaufNr, FK SorteNr → Sorte (per Tastatur)
    await verkauf.locator('.wk-attr-name', { hasText: 'VerkaufNr' }).focus();
    await page.keyboard.press('Enter');
    const zeile = verkauf.locator('.wk-attr', { hasText: 'SorteNr' });
    await zeile.locator('.wk-fk').focus();
    await page.keyboard.press('Enter');
    await verkauf.locator('.wk-ziel').selectOption('Sorte');
    await page.waitForSelector('#aufgabe-karte .wk-faden');
    assert.equal(await wb.locator('.wk-faden').count(), 1, 'roter Faden zur Zielrelation');
    const vorschau = (await wb.locator('.wk-vorschau').textContent()).replace(/\s+/g, ' ');
    assert.match(vorschau, /Verkauf\(VerkaufNr, Kugeln, ↑SorteNr\)/);
    assert.equal(await wb.locator('.wk-vorschau .pk').count(), 2);
    await pruefen(page, 'richtig');
    await wb.locator('.wk-ergebnis .stempel.geloest').waitFor();
    await page.waitForSelector('#aufgabe-karte .wk-loesung:not([hidden])');
    await ohneUeberlauf(page, 'Werkbank 1440');
    await foto(page, 'werkbank_geloest_1440');
    for (const [b, h] of [[1024, 768], [768, 1024], [375, 812]]) {
      await page.setViewportSize({ width: b, height: h });
      await page.waitForTimeout(200);
      await ohneUeberlauf(page, `Werkbank @${b}`);
      await foto(page, `werkbank_${b}`);
    }
    assert.deepEqual(meldungen, []);
  } finally {
    await context.close();
  }
});

test('Werkzeugseiten: frei zeichnen und anlegen ohne Anmeldung, Entwurf bleibt, alle Breiten ohne Überlauf', { timeout: 120000 }, async () => {
  const { context, page, meldungen } = await neueSeite();
  try {
    /* Bauplan-Tisch */
    await page.goto(server.url + '/werkzeug/bauplan');
    await page.waitForSelector('html[data-seite="bereit"]');
    await page.evaluate(() => localStorage.setItem('dd-bauplan-ansicht', 'zeichnen'));
    await page.reload();
    await page.waitForSelector('html[data-seite="bereit"]');
    const tisch = page.locator('.bauplan');
    assert.equal(await tisch.locator('.bp-ergebnis').isVisible(), false, 'ohne Prüfung');
    await tisch.locator('[data-werkzeug="entitaet"]').click();
    await page.keyboard.type('Person');
    await tisch.locator('[data-werkzeug="attribut"]').click();
    await page.keyboard.type('PersonNr');
    await tisch.locator('.bp-panel .bp-schluessel').check();
    // rekursiv: Person mit sich selbst verbinden
    await tisch.locator('[data-werkzeug="verbinden"]').click();
    await tisch.locator('.bp-svg [data-id="e1"]').click();
    await tisch.locator('.bp-svg [data-id="e1"]').click();
    await tisch.locator('.bp-svg .chen-beziehung').waitFor();
    assert.match(await tisch.locator('.bp-panel .bp-karte-kopf .etikett').textContent(), /rekursiv/);
    await tisch.locator('.bp-panel .bp-name-feld').fill('kennt');
    await tisch.locator('.bp-panel .bp-ende-rolle').nth(0).fill('kennt');
    await tisch.locator('.bp-panel .bp-ende-rolle').nth(1).fill('wirdGekannt');
    await tisch.locator('.bp-panel .bp-ende-kard').nth(0).selectOption('n');
    await tisch.locator('.bp-panel .bp-ende-kard').nth(1).selectOption('m');
    await page.waitForFunction(() => document.querySelectorAll('.bp-svg .chen-rolle').length === 2);
    assert.equal(await tisch.locator('.bp-svg .chen-schluessel').count(), 1);
    assert.equal(await tisch.locator('.bp-svg .chen-kante').count(), 2, 'zwei Kanten zu den Raute-Ecken');
    // Zoomen
    const vb = await tisch.locator('.bp-svg').getAttribute('viewBox');
    await tisch.locator('.bp-zoom-knopf').nth(1).click();
    assert.notEqual(await tisch.locator('.bp-svg').getAttribute('viewBox'), vb);
    await foto(page, 'werkzeug_bauplan_1440');
    await page.reload();
    await page.waitForSelector('html[data-seite="bereit"]');
    assert.equal(await page.locator('.bp-svg .chen-beziehung').count(), 1, 'Entwurf bleibt');
    assert.equal(await page.locator('.bp-svg .chen-rolle').count(), 2);
    for (const [b, h] of [[1024, 768], [768, 1024], [375, 812]]) {
      await page.setViewportSize({ width: b, height: h });
      await page.waitForTimeout(150);
      await ohneUeberlauf(page, `/werkzeug/bauplan @${b}`);
      await foto(page, `werkzeug_bauplan_${b}`);
    }
    // Neu beginnen mit Bestätigung in der Seite
    await page.click('#werkzeug-neu');
    await page.click('#werkzeug-neu-ja');
    assert.equal(await page.locator('.bp-svg .chen-el').count(), 0);

    /* Schema-Werkbank */
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(server.url + '/werkzeug/werkbank');
    await page.waitForSelector('html[data-seite="bereit"]');
    const wb = page.locator('.werkbank');
    await wb.locator('[data-aktion="relation"]').click();
    await page.keyboard.type('Ermittler');
    await wb.locator('.wk-attr-feld').first().fill('ErmittlerNr');
    await wb.locator('.wk-pk').first().click();
    await wb.locator('[data-aktion="relation"]').click();
    await page.keyboard.type('Fall');
    const fall = wb.locator('.wk-karte').nth(1);
    await fall.locator('.wk-attr-feld').first().fill('FallNr');
    await fall.locator('.wk-pk').first().click();
    await fall.locator('[data-aktion="attribut"]').click();
    await page.keyboard.type('LeiterNr');
    await fall.locator('.wk-fk').nth(1).click();
    await fall.locator('.wk-ziel').selectOption('Ermittler');
    await page.waitForSelector('.wk-faden');
    const text = (await wb.locator('.wk-vorschau').textContent()).replace(/\s+/g, ' ');
    assert.match(text, /Ermittler\(ErmittlerNr\)/);
    assert.match(text, /Fall\(FallNr, ↑LeiterNr\)/);
    assert.equal(await wb.locator('.wk-ergebnis').isVisible(), false, 'ohne Prüfung');
    await foto(page, 'werkzeug_werkbank_1440');
    await page.reload();
    await page.waitForSelector('html[data-seite="bereit"]');
    assert.equal(await page.locator('.wk-karte').count(), 2, 'Entwurf bleibt');
    for (const [b, h] of [[1024, 768], [768, 1024], [375, 812]]) {
      await page.setViewportSize({ width: b, height: h });
      await page.waitForTimeout(150);
      await ohneUeberlauf(page, `/werkzeug/werkbank @${b}`);
      await foto(page, `werkzeug_werkbank_${b}`);
    }
    assert.deepEqual(meldungen, []);
  } finally {
    await context.close();
  }
});
