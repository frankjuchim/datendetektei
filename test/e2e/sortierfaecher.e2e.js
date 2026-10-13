'use strict';
// E2E (Chromium, playwright-core): Werkzeug „Sortierfächer“ (/werkzeug/sortierfaecher, Plan Phase 4 Task 4,
// DESIGN.md §5.6) unter der echten CSP mit echten Übungs-DBs. Stadtfest-Abfrage mit WHERE + GROUP BY + HAVING:
// Korb-Anzahl, Fachzahl und HAVING-graue Fächer stimmen mit src/sql/visual.js (Node, better-sqlite3) überein;
// Umschalter COUNT(*) ↔ SUM(Spalte); Pfeiltasten; Übergabe per sessionStorage; reduzierte Bewegung; kein
// horizontales Scrollen; keine CSP-Meldungen. Mit SCREENSHOTS=1 Fotos nach docs/screenshots/phase4/.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');
const { chromium } = require('playwright-core');
const { starteTestServer } = require('./testserver');
const { ladeDatenbanken } = require('../../src/sql/datenbanken');
const visual = require('../../src/sql/visual');

const CHROMIUM = require('./chromium').chromiumPfad();
const ZIEL = path.join(__dirname, '..', '..', 'docs', 'screenshots', 'phase4');
const FOTOS = process.env.SCREENSHOTS === '1';
const datenbanken = ladeDatenbanken(undefined, { log: () => {} });

const SQL_STADTFEST = `SELECT Stand.Platz, COUNT(*) AS Produkte
FROM Stand, Produkt
WHERE Stand.StandNr = Produkt.StandNr
  AND Produkt.Preis >= 2
GROUP BY Stand.Platz
HAVING COUNT(*) > 8`;

let browser;
let server;
let cookie;

test.before(async () => {
  browser = await chromium.launch({ executablePath: CHROMIUM });
  server = await starteTestServer({ mitDatenbanken: true });
  cookie = await server.anmelden();
  if (FOTOS) fs.mkdirSync(ZIEL, { recursive: true });
});

test.after(async () => {
  if (browser) await browser.close();
  if (server) await server.schliessen();
});

/** Erwartung aus der Rechenschicht im Server (better-sqlite3 auf derselben Haupt-DB). */
async function erwartet(name, sql) {
  const db = new Database(datenbanken.haupt(name));
  try {
    return await visual.sortierfaecher(sql, async (s) => {
      try {
        const st = db.prepare(s);
        const alle = st.raw(true).all();
        return { spalten: st.columns().map((c) => c.name), zeilen: alle.slice(0, 300), gesamt: alle.length };
      } catch (e) {
        return { fehler: e.message };
      }
    });
  } finally {
    db.close();
  }
}

const mehrzahl = (n, eins, viele) => `${Number(n).toLocaleString('de-DE')} ${n === 1 ? eins : viele}`;

async function oeffne(pfad, { angemeldet = true, viewport = { width: 1366, height: 900 }, thema = 'hell', reduziert = false, uebergabe = null } = {}) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    colorScheme: thema === 'dunkel' ? 'dark' : 'light',
    reducedMotion: reduziert ? 'reduce' : 'no-preference'
  });
  if (angemeldet) {
    const [name, wert] = cookie.split('=');
    await context.addCookies([{ name, value: wert, url: server.url }]);
  }
  if (uebergabe) {
    await context.addInitScript((u) => {
      if (!window.sessionStorage.getItem('dd_sortierfaecher')) window.sessionStorage.setItem('dd_sortierfaecher', u);
    }, JSON.stringify(uebergabe));
  }
  const page = await context.newPage();
  const meldungen = [];
  page.on('console', (m) => meldungen.push(m.text()));
  page.on('pageerror', (e) => meldungen.push(`pageerror: ${e.message}`));
  await page.goto(server.url + pfad);
  await page.waitForSelector('#sf-faecher .sf-fach', { timeout: 20000 });
  const csp = () => meldungen.filter((m) => /Content Security Policy|Content-Security-Policy|unsafe-eval|pageerror/i.test(m));
  return { context, page, csp, meldungen };
}

async function zuSchritt(page, art) {
  const titel = { where: 'WHERE-Korb', faecher: 'Fächer füllen', aggregate: 'Aggregate', having: 'HAVING' }[art];
  await page.click(`#sf-schritte .sf-schritt:has-text("${titel}")`);
}

test('Stadtfest: Korb, Fächer und HAVING-graue Fächer wie visual.js; Pfeiltasten; keine CSP-Meldungen', async () => {
  const soll = await erwartet('stadtfest', SQL_STADTFEST);
  assert.equal(soll.fehler, undefined);
  assert.ok(soll.korb.anzahl > 0 && soll.faecher.some((f) => f.havingRaus) && soll.faecher.some((f) => !f.havingRaus));
  const { context, page, csp } = await oeffne('/werkzeug/sortierfaecher?db=stadtfest');
  try {
    assert.equal(await page.inputValue('#sf-eingabe'), SQL_STADTFEST, 'Beispielabfrage der DB');
    assert.equal(await page.textContent('#sf-korb-zaehler'), mehrzahl(soll.korb.anzahl, 'Zeile', 'Zeilen'));
    assert.equal(await page.textContent('#sf-zahl'), soll.korb.anzahl.toLocaleString('de-DE'));
    assert.equal(await page.$$eval('#sf-korb .sf-korb-karte', (k) => k.length), soll.korb.zeilen.length);
    assert.deepEqual(await page.$$eval('#sf-schritte .sf-schritt', (b) => b.map((x) => x.textContent)), [
      '1WHERE-Korb', '2Fächer füllen', '3Aggregate', '4HAVING'
    ]);
    // Schritt 1: WHERE-Klausel hervorgehoben, Fächer noch leer
    assert.equal(await page.textContent('.sf-klausel.aktiv'), 'WHERE Stand.StandNr = Produkt.StandNr\n  AND Produkt.Preis >= 2');
    assert.equal(await page.$$eval('.sf-karte', (k) => k.filter((x) => x.offsetParent).length), 0);
    // Pfeiltaste → Fächer füllen
    await page.focus('#sf-weiter');
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.getAttribute('#sf-schritte li:nth-child(2) .sf-schritt', 'aria-current'), 'step');
    assert.equal(await page.textContent('.sf-klausel.aktiv'), 'GROUP BY Stand.Platz');
    assert.equal(await page.$$eval('#sf-faecher .sf-fach', (f) => f.length), soll.faecher.length);
    assert.equal(await page.textContent('#sf-zahl'), String(soll.gesamt));
    assert.deepEqual(await page.$$eval('.sf-fach-name', (n) => n.map((x) => x.textContent)), soll.faecher.map((f) => f.name));
    const karten = await page.$$eval('#sf-faecher .sf-fach', (f) => f.map((x) => x.querySelectorAll('.sf-karte').length));
    assert.deepEqual(karten, soll.faecher.map((f) => f.zeilen.length));
    // Gruppenfarbe + Name im Kartenkopf
    const kopf = await page.$eval('.sf-fach.g1 .sf-karte-kopf', (k) => ({ text: k.textContent, rand: getComputedStyle(k).borderTopColor }));
    assert.equal(kopf.text, soll.faecher[0].name);
    assert.notEqual(kopf.rand, 'rgba(0, 0, 0, 0)');
    // HAVING: graue Fächer = havingRaus
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.textContent('.sf-klausel.aktiv'), 'HAVING COUNT(*) > 8');
    // Übergang (220 ms) abwarten
    await page.waitForFunction(() => [...document.querySelectorAll('.sf-fach.raus')].every((x) => getComputedStyle(x).opacity === '0.5'));
    const grau = await page.$$eval('#sf-faecher .sf-fach', (f) =>
      f.map((x) => x.classList.contains('raus') && Number(getComputedStyle(x).opacity) < 1)
    );
    assert.deepEqual(grau, soll.faecher.map((f) => f.havingRaus));
    assert.equal(await page.textContent('#sf-zahl'), String(soll.faecher.filter((f) => !f.havingRaus).length));
    assert.ok(await page.isDisabled('#sf-weiter'));
    await page.keyboard.press('ArrowLeft');
    assert.equal(await page.getAttribute('#sf-schritte li:nth-child(3) .sf-schritt', 'aria-current'), 'step');
    assert.deepEqual(csp(), []);
  } finally {
    await context.close();
  }
});

test('Umschalter COUNT(*) ↔ SUM(Produkt.Preis) zeigt unterschiedliche Werte je Fach (P4)', async () => {
  const soll = await erwartet('stadtfest', SQL_STADTFEST);
  const { context, page, csp } = await oeffne('/werkzeug/sortierfaecher?db=stadtfest');
  try {
    assert.ok(await page.isHidden('#sf-umschalter'), 'erst ab dem Schritt Aggregate');
    await zuSchritt(page, 'aggregate');
    assert.ok(await page.isVisible('#sf-umschalter'));
    assert.equal(await page.textContent('#sf-sum'), 'SUM(Produkt.Preis)');
    const lies = () => page.$$eval('.sf-vergleich', (v) => v.map((x) => [x.querySelector('.sf-vergleich-name').textContent, x.querySelector('.sf-vergleich-wert').textContent]));
    const count = await lies();
    assert.deepEqual(count, soll.umschalter.werte.map((w) => ['COUNT(*)', String(w.count)]));
    await page.click('#sf-sum');
    assert.equal(await page.getAttribute('#sf-sum', 'aria-pressed'), 'true');
    const sum = await lies();
    const fmt = (n) => n.toLocaleString('de-DE', { useGrouping: false, minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });
    assert.deepEqual(sum, soll.umschalter.werte.map((w) => ['SUM(Produkt.Preis)', fmt(w.sum)]));
    assert.ok(sum.every((s, i) => s[1] !== count[i][1]), 'COUNT und SUM unterscheiden sich');
    assert.match(await page.textContent('#sf-umschalter-text'), /addiert/);
    // Aggregatzeile je Fach
    assert.deepEqual(await page.$$eval('.sf-aggregate dd', (d) => d.map((x) => x.textContent)), soll.faecher.map((f) => String(f.aggregate[0])));
    assert.deepEqual(csp(), []);
  } finally {
    await context.close();
  }
});

test('Übergabe per sessionStorage (Eisdiele ohne Anmeldung), Fehler auf Deutsch, Abfrage ohne Gruppen → Hinweis', async () => {
  const sql = 'SELECT Sorte.Name, COUNT(*) AS Verkaeufe\nFROM Sorte, Verkauf\nWHERE Sorte.SorteNr = Verkauf.SorteNr\nGROUP BY Sorte.SorteNr, Sorte.Name';
  const soll = await erwartet('eisdiele', sql);
  const { context, page, csp } = await oeffne('/werkzeug/sortierfaecher?db=eisdiele', { angemeldet: false, uebergabe: { db: 'eisdiele', sql } });
  try {
    assert.equal(await page.inputValue('#sf-eingabe'), sql);
    assert.equal(await page.$$eval('#sf-faecher .sf-fach', (f) => f.length), soll.faecher.length);
    assert.ok(soll.faecher.length > 3);
    assert.equal(await page.$$eval('.sf-fach.ohne-farbe', (f) => f.length), soll.faecher.length - 3);
    assert.match(await page.textContent('#sf-hinweise'), /vierten Fach/);
    assert.match(await page.textContent('#sf-legende'), /nur mit Namen/);
    // kein HAVING-Schritt
    assert.equal(await page.$$eval('#sf-schritte .sf-schritt', (b) => b.length), 3);
    await page.fill('#sf-eingabe', 'SELECT Farbe, COUNT(*) FROM Sorte GROUP BY Farbe');
    await page.click('#sf-einsortieren');
    await page.waitForSelector('.sf-meldung-text.fehler');
    assert.match(await page.textContent('#sf-meldung'), /Farbe/);
    assert.ok(await page.isHidden('.sf-tisch'));
    await page.fill('#sf-eingabe', 'SELECT Name FROM Sorte');
    await page.keyboard.press('Control+Enter');
    await page.waitForSelector('.sf-meldung-text.hinweis');
    assert.match(await page.textContent('#sf-meldung'), /GROUP BY/);
    assert.deepEqual(csp(), []);
  } finally {
    await context.close();
  }
});

test('Abspielen mit reduzierter Bewegung: ohne Kartenanimation, läuft bis HAVING', async () => {
  const { context, page } = await oeffne('/werkzeug/sortierfaecher?db=stadtfest', { reduziert: true });
  try {
    await page.click('#sf-abspielen');
    assert.equal(await page.getAttribute('#sf-abspielen', 'aria-pressed'), 'true');
    await page.waitForFunction(() => document.querySelector('#sf-schritte li:nth-child(2) .sf-schritt').getAttribute('aria-current') === 'step', null, { timeout: 5000 });
    const animation = await page.$eval('.sf-karte', (k) => getComputedStyle(k).animationName);
    assert.equal(animation, 'none');
    await page.waitForFunction(() => document.getElementById('sf-abspielen').getAttribute('aria-pressed') === 'false', null, { timeout: 12000 });
    assert.equal(await page.getAttribute('#sf-schritte li:nth-child(4) .sf-schritt', 'aria-current'), 'step');
  } finally {
    await context.close();
  }
});

const GROESSEN = [
  { name: '1920', viewport: { width: 1920, height: 1080 } },
  { name: '1024', viewport: { width: 1024, height: 768 } },
  { name: '768', viewport: { width: 768, height: 1024 } },
  { name: '375', viewport: { width: 375, height: 812 } }
];

for (const g of GROESSEN) {
  for (const thema of ['hell', 'dunkel']) {
    test(`Layout ${g.name} ${thema}: kein horizontales Scrollen, Touch-Ziele ≥ 44 px, Korb auf dem Handy eingeklappt`, async () => {
      const { context, page, csp } = await oeffne('/werkzeug/sortierfaecher?db=stadtfest', { viewport: g.viewport, thema, reduziert: true });
      try {
        await zuSchritt(page, 'having');
        const befund = await page.evaluate(() => {
          const zuKlein = [];
          for (const e of document.querySelectorAll('button, select, summary, a[href]')) {
            const r = e.getBoundingClientRect();
            if (!r.width || e.closest('.nur-sr') || e.classList.contains('springen')) continue;
            if (e.closest('.fuss') && e.tagName === 'A') continue;
            if (r.height < 43.5 || (e.tagName !== 'A' && r.width < 43.5)) zuKlein.push(`${e.id || e.className} ${Math.round(r.width)}×${Math.round(r.height)}`);
          }
          const faecher = [...document.querySelectorAll('.sf-fach')].map((f) => f.getBoundingClientRect());
          return {
            ueberlauf: document.documentElement.scrollWidth - window.innerWidth,
            zuKlein,
            korbOffen: document.getElementById('sf-korb').open,
            untereinander: faecher.every((r, i) => i === 0 || r.top >= faecher[i - 1].bottom - 1)
          };
        });
        assert.ok(befund.ueberlauf <= 0, `Überlauf ${befund.ueberlauf}px`);
        assert.deepEqual(befund.zuKlein, []);
        if (g.name === '375') {
          assert.equal(befund.korbOffen, false);
          assert.ok(befund.untereinander, 'Fächer untereinander');
          assert.match(await page.textContent('#sf-korb-zaehler'), /\d+ Zeilen/);
        } else {
          assert.equal(befund.korbOffen, true);
        }
        assert.deepEqual(csp(), []);
        if (FOTOS) {
          const oben = () => page.evaluate(() => window.scrollTo(0, 0));
          await oben();
          await page.screenshot({ path: path.join(ZIEL, `sortierfaecher_having_${g.name}_${thema}.png`), fullPage: true });
          await zuSchritt(page, 'aggregate');
          await page.click('#sf-sum');
          await oben();
          await page.screenshot({ path: path.join(ZIEL, `sortierfaecher_summe_${g.name}_${thema}.png`), fullPage: true });
          await zuSchritt(page, 'where');
          await oben();
          await page.screenshot({ path: path.join(ZIEL, `sortierfaecher_where_${g.name}_${thema}.png`) });
        }
      } finally {
        await context.close();
      }
    });
  }
}
