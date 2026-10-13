'use strict';
// E2E (Chromium, playwright-core): Zeitlupe (Plan Phase 4 Task 2, DESIGN §5.4/§6/§7). Testserver mit echten
// Übungs-DBs; die Schülerin öffnet die Zeitlupe aus der Konsole (Übergabe über sessionStorage), schaltet eine
// GROUP BY/HAVING-Abfrage auf stadtfest per Tastatur durch und vergleicht jeden Zähler mit src/sql/visual.js
// (better-sqlite3 auf derselben basis.sql). Dazu: verworfene Gruppe sichtbar, reduzierte Bewegung (2,6 s, ohne
// Übergänge), Rücksprung, Eisdiele ohne Anmeldung, kein Seitenüberlauf, keine CSP-Meldungen.
// SCREENSHOTS=1: Fotos bei 1920×1080, 1024×768, 768×1024, 375×812, hell und dunkel, nach docs/screenshots/phase4/.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');
const { chromium } = require('playwright-core');
const { starteTestServer } = require('./testserver');
const visual = require('../../src/sql/visual');

const CHROMIUM = require('./chromium').chromiumPfad();
const FOTOS = process.env.SCREENSHOTS === '1';
const FOTO_ORDNER = path.join(__dirname, '..', '..', 'docs', 'screenshots', 'phase4');
const GROESSEN = [
  { name: 'beamer', width: 1920, height: 1080 },
  { name: 'ipad_quer', width: 1024, height: 768 },
  { name: 'ipad_hoch', width: 768, height: 1024 },
  { name: 'handy', width: 375, height: 812 }
];

const SQL = [
  'SELECT Stand.Platz, COUNT(*) AS Bons',
  'FROM Stand, Bon',
  'WHERE Stand.StandNr = Bon.StandNr',
  "  AND Bon.Zahlart = 'bar'",
  'GROUP BY Stand.Platz',
  'HAVING COUNT(*) >= 100',
  'ORDER BY Bons DESC',
  'LIMIT 1'
].join('\n');

let browser;
let server;
let erwartet;
const meldungen = [];

/** Erwartete Schritte aus visual.js mit better-sqlite3 auf basis.sql (dieselben Daten wie /db/stadtfest.sqlite). */
async function erwarteteSchritte(name, sql) {
  const db = new Database(':memory:');
  db.exec(fs.readFileSync(path.join(__dirname, '..', '..', 'seed', 'datenbanken', name, 'basis.sql'), 'utf8'));
  const fuehreAus = async (s) => {
    try {
      const stmt = db.prepare(s);
      const spalten = stmt.columns().map((c) => c.name);
      const alle = stmt.raw(true).all();
      return { spalten, zeilen: alle.slice(0, 300), gesamt: alle.length };
    } catch (e) {
      return { fehler: e.message };
    }
  };
  const r = await visual.zeitlupe(sql, fuehreAus);
  db.close();
  return r.schritte;
}

const nurZiffern = (t) => String(t).replace(/\D/g, '');
const csp = () => meldungen.filter((m) => /Content Security Policy|Content-Security-Policy|unsafe-eval|unsafe-inline/i.test(m));

test.before(async () => {
  browser = await chromium.launch({ executablePath: CHROMIUM });
  server = await starteTestServer({ mitDatenbanken: true });
  erwartet = await erwarteteSchritte('stadtfest', SQL);
  if (FOTOS) fs.mkdirSync(FOTO_ORDNER, { recursive: true });
});

test.after(async () => {
  if (browser) await browser.close();
  if (server) await server.schliessen();
});

async function neueSeite({ angemeldet = true, reduziert = false } = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: reduziert ? 'reduce' : 'no-preference' });
  if (angemeldet) {
    const cookie = await server.anmelden({});
    const [name, wert] = cookie.split('=');
    await context.addCookies([{ name, value: wert, url: server.url }]);
  }
  const page = await context.newPage();
  page.on('console', (m) => meldungen.push(m.text()));
  page.on('pageerror', (e) => meldungen.push('Seitenfehler: ' + e.message));
  return { context, page };
}

async function zustand(page) {
  return page.evaluate(() => ({
    zahl: document.querySelector('#zl-zaehler .zl-zahl')?.textContent || '',
    einheit: document.querySelector('#zl-zaehler small')?.textContent || '',
    reiter: document.querySelector('#zl-schritte [aria-current="step"]')?.firstChild?.textContent || '',
    sqlAktiv: document.querySelector('#zl-sql .zl-zeile.aktiv code')?.textContent || '',
    spaeter: document.querySelectorAll('#zl-sql .zl-zeile.spaeter').length,
    weg: document.querySelectorAll('#zl-tabelle tbody tr.weg').length,
    zeilen: document.querySelectorAll('#zl-tabelle tbody tr').length,
    hinweis: document.getElementById('zl-hinweis').hidden ? '' : document.getElementById('zl-hinweis').textContent,
    legende: [...document.querySelectorAll('#zl-legende li')].map((li) => ({ text: li.textContent, weg: li.classList.contains('weg') }))
  }));
}

async function pruefeLayout(page, name) {
  const ergebnis = await page.evaluate(() => ({
    ueberlauf: document.documentElement.scrollWidth - window.innerWidth,
    klein: [...document.querySelectorAll('#inhalt .knopf, #inhalt .zl-reiter, #inhalt summary, #inhalt select')]
      .filter((e) => e.offsetParent !== null && !e.closest('[hidden]'))
      .map((e) => ({ text: (e.textContent || '').trim().slice(0, 30), h: e.getBoundingClientRect().height, w: e.getBoundingClientRect().width }))
      .filter((r) => r.h < 43.5 || r.w < 43.5)
  }));
  assert.ok(ergebnis.ueberlauf <= 0, `${name}: horizontales Scrollen (${ergebnis.ueberlauf} px)`);
  assert.deepEqual(ergebnis.klein, [], `${name}: Touch-Ziele unter 44 px`);
}

test('Konsole → Zeitlupe: Übergabe, Tastatur, Zähler wie visual.js, verworfene Gruppe, Rücksprung', async () => {
  assert.deepEqual(erwartet.map((s) => s.klausel), ['FROM', 'WHERE', 'GROUP BY', 'HAVING', 'SELECT', 'ORDER BY', 'LIMIT']);
  const { context, page } = await neueSeite();
  await page.goto(server.url + '/konsole/stadtfest');
  await page.waitForFunction(() => document.documentElement.dataset.konsole === 'bereit');
  await page.fill('#sql-eingabe', SQL);
  await page.click('#k-zeitlupe');
  await page.waitForURL('**/werkzeug/zeitlupe?db=stadtfest');
  assert.ok(!page.url().includes('SELECT'), 'Abfrage nie in der URL');
  await page.waitForFunction(() => document.documentElement.dataset.zeitlupe === 'bereit', null, { timeout: 30000 });

  // Übergabe: Editor zugeklappt, Rücksprung sichtbar, Abfrage links in Schreibreihenfolge
  assert.equal(await page.$eval('#zl-eingabe', (d) => d.open), false);
  assert.equal(await page.$eval('#zl-rueck', (a) => !a.hidden && a.getAttribute('href')), '/konsole/stadtfest');
  assert.equal(await page.$eval('#zl-rueck', (a) => a.textContent.trim()), 'Zurück zur Konsole');
  const links = await page.$$eval('#zl-sql .zl-zeile', (z) => z.map((d) => d.querySelector('.lauf').textContent + ' ' + d.querySelector('code').textContent.split(/\s/)[0]));
  assert.deepEqual(links, ['5 SELECT', '1 FROM', '2 WHERE', '3 GROUP', '4 HAVING', '6 ORDER', '7 LIMIT']);
  assert.equal(await page.$$eval('#zl-schritte button:not([disabled])', (b) => b.length), 7);

  // Durchschalten per Tastatur (→), jeder Zähler = visual.js
  await page.locator('#zl-vor').focus();
  await page.evaluate(() => document.activeElement.blur());
  for (let i = 0; i < erwartet.length; i++) {
    if (i > 0) await page.keyboard.press('ArrowRight');
    const z = await zustand(page);
    const s = erwartet[i];
    assert.equal(nurZiffern(z.zahl), String(s.zaehler.wert), `${s.klausel}: Zähler`);
    assert.equal(z.einheit, s.zaehler.einheit, `${s.klausel}: Einheit`);
    assert.equal(z.reiter, s.klausel, `${s.klausel}: Reiter aria-current`);
    assert.ok(z.sqlAktiv.startsWith(s.klausel.split(' ')[0]), `${s.klausel}: aktive Klausel links (${z.sqlAktiv})`);
    assert.equal(z.zeilen, Math.max(1, s.zeilen.length), `${s.klausel}: Zeilen der Zwischentabelle`);
    assert.equal(z.weg, s.zeilen.filter((r) => r.verworfen).length, `${s.klausel}: verworfene Zeilen`);
    if (s.klausel === 'FROM') assert.match(z.hinweis.replace(/\s/g, ' '), /4.432 Zeilen, 50 angezeigt/);
    if (s.klausel === 'WHERE') assert.ok(z.weg > 0, 'WHERE graut Zeilen');
    if (s.klausel === 'HAVING') {
      // HAVING streicht ganze Gruppen: alle Zeilen der Gruppe Bühne verworfen, Legende nennt sie
      const weg = z.legende.filter((l) => l.weg);
      assert.equal(weg.length, 1);
      assert.match(weg[0].text, /Bühne.*fällt weg/);
      const wegGruppen = await page.$$eval('#zl-tabelle tbody tr.weg td.gruppe-zelle', (t) => [...new Set(t.map((x) => x.textContent.replace('verworfen: ', '')))]);
      assert.deepEqual(wegGruppen, ['Bühne']);
      assert.equal(await page.$eval('#zl-titel', (e) => e.textContent), 'HAVING COUNT(*) >= 100');
      assert.match(await page.$eval('.zl-merksatz', (e) => e.textContent), /WHERE filtert Zeilen vor dem Gruppieren, HAVING filtert Gruppen danach/);
    }
  }
  assert.equal(await page.$eval('#zl-vor', (b) => b.disabled), true);
  await page.keyboard.press('ArrowLeft');
  assert.equal((await zustand(page)).reiter, 'ORDER BY');
  // Reiter direkt wählen
  await page.click('#zl-schritte button[data-schritt="3"]');
  assert.equal((await zustand(page)).reiter, 'HAVING');
  await pruefeLayout(page, 'HAVING @1440');

  // Rücksprung: zurück in die Konsole, Entwurf noch da
  await page.click('#zl-rueck');
  await page.waitForURL('**/konsole/stadtfest');
  await page.waitForFunction(() => document.documentElement.dataset.konsole === 'bereit');
  assert.equal(await page.inputValue('#sql-eingabe'), SQL);
  await context.close();
  assert.deepEqual(csp(), []);
});

test('Abspielen mit reduzierter Bewegung: 2,6 s je Schritt, keine Übergänge; Bildschirmfotos', async () => {
  const { context, page } = await neueSeite({ reduziert: true });
  await page.goto(server.url + '/konsole/stadtfest');
  await page.evaluate((sql) => sessionStorage.setItem('dd_zeitlupe', JSON.stringify({ db: 'stadtfest', sql, zurueck: '/konsole/stadtfest' })), SQL);
  await page.goto(server.url + '/werkzeug/zeitlupe?db=stadtfest');
  await page.waitForFunction(() => document.documentElement.dataset.zeitlupe === 'bereit', null, { timeout: 30000 });
  const dauer = await page.$eval('#zl-sql .zl-zeile', (e) => getComputedStyle(e).transitionDuration);
  assert.ok(dauer.split(',').every((d) => parseFloat(d) < 0.02), `Übergang ${dauer}`);

  await page.click('#zl-abspielen');
  assert.equal(await page.$eval('#zl-abspielen', (b) => b.getAttribute('aria-pressed')), 'true');
  assert.equal((await zustand(page)).reiter, 'WHERE');
  await page.waitForTimeout(2000);
  assert.equal((await zustand(page)).reiter, 'WHERE', 'nach 2 s noch derselbe Schritt (reduziert 2,6 s)');
  await page.waitForTimeout(900);
  assert.equal((await zustand(page)).reiter, 'GROUP BY');
  await page.keyboard.press('ArrowRight'); // Tastatur hält an
  assert.equal(await page.$eval('#zl-abspielen', (b) => b.getAttribute('aria-pressed')), 'false');
  assert.equal((await zustand(page)).reiter, 'HAVING');

  for (const g of GROESSEN) {
    await page.setViewportSize({ width: g.width, height: g.height });
    await page.waitForTimeout(150);
    await pruefeLayout(page, `HAVING @${g.width}`);
    if (g.width < 700) {
      // Handy: 4 + 3 Reiter
      const reihen = await page.$$eval('#zl-schritte li', (l) => [...new Set(l.map((x) => Math.round(x.getBoundingClientRect().top)))].length);
      assert.equal(reihen, 2);
    }
    if (!FOTOS) continue;
    for (const thema of ['light', 'dark']) {
      await page.emulateMedia({ colorScheme: thema, reducedMotion: 'reduce' });
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(100);
      await page.screenshot({ path: path.join(FOTO_ORDNER, `zeitlupe_having_${g.width}x${g.height}_${thema === 'light' ? 'hell' : 'dunkel'}.png`), fullPage: true });
    }
  }
  await context.close();
  assert.deepEqual(csp(), []);
});

test('Eisdiele ohne Anmeldung: Beispielabfrage im offenen Editor, nur Eisdiele wählbar, eigene Abfrage, Fehler', async () => {
  const { context, page } = await neueSeite({ angemeldet: false });
  await page.goto(server.url + '/werkzeug/zeitlupe?db=eisdiele');
  await page.waitForFunction(() => document.documentElement.dataset.zeitlupe === 'bereit', null, { timeout: 30000 });
  assert.equal(await page.$eval('#zl-eingabe', (d) => d.open), true);
  assert.deepEqual(await page.$$eval('#zl-db option', (o) => o.map((x) => x.value)), ['eisdiele']);
  assert.match(await page.inputValue('#sql-eingabe'), /^SELECT Vegan/);
  assert.equal(await page.$eval('#zl-rueck', (a) => a.hidden), true);
  const erwartetEis = await erwarteteSchritte('eisdiele', await page.inputValue('#sql-eingabe'));
  assert.equal(await page.$$eval('#zl-schritte button:not([disabled])', (b) => b.length), erwartetEis.length);
  assert.equal(await page.$eval('#zl-schritte button[disabled]', (b) => b.textContent), 'LIMITentfällt');

  // eigene Abfrage ohne WHERE/GROUP BY
  await page.fill('#sql-eingabe', 'SELECT Name, Preis\nFROM Sorte\nORDER BY Preis DESC');
  await page.click('#zl-starten');
  await page.waitForFunction(() => document.querySelectorAll('#zl-schritte button:not([disabled])').length === 3);
  assert.equal(nurZiffern((await zustand(page)).zahl), '10');
  // Fehler und Abfrage außerhalb des Abitur-Umfangs
  await page.fill('#sql-eingabe', 'SELECT Nme FROM Sorte');
  await page.click('#zl-starten');
  await page.waitForFunction(() => document.getElementById('zl-meldung').classList.contains('fehler'));
  assert.equal(await page.$eval('#zl-ansicht', (e) => e.hidden), true);
  await page.fill('#sql-eingabe', 'SELECT * FROM Sorte JOIN Verkauf ON Sorte.SorteNr = Verkauf.SorteNr');
  await page.click('#zl-starten');
  await page.waitForFunction(() => /Abitur-Umfang/.test(document.getElementById('zl-meldung').textContent));
  await pruefeLayout(page, 'Eisdiele @1440');
  await page.setViewportSize({ width: 375, height: 812 });
  await pruefeLayout(page, 'Eisdiele @375');
  await context.close();
  assert.deepEqual(csp(), []);
});
