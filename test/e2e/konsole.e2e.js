'use strict';
// E2E (Chromium, playwright-core): Ermittlungskonsole „Freie Ermittlung“ (/konsole/:db, Plan Phase 2 Task 12)
// unter der echten CSP der App mit echten Übungs-DBs und echter Sandbox: Tippen + Strg+Enter → Tabelle, Randmarke
// UNGLEICH_ALT, Schema-Antippen fügt Spalte ein, Entwurf übersteht Neuladen, Endlosabfrage → Abbruch, Abbrechen-
// Knopf, ohne WASM → Server-Fallback, angemeldet /konsole/stadtrad, keine CSP-Meldungen.

const test = require('node:test');
const assert = require('node:assert/strict');
const Database = require('better-sqlite3');
const { chromium } = require('playwright-core');
const { starteTestServer } = require('./testserver');
const { ladeDatenbanken } = require('../../src/sql/datenbanken');

const CHROMIUM = require('./chromium').chromiumPfad();
const ENDLOS = 'WITH RECURSIVE c(i) AS (SELECT 1 UNION ALL SELECT i+1 FROM c) SELECT COUNT(*) FROM c';
const datenbanken = ladeDatenbanken(undefined, { log: () => {} });

let browser;
let server;

test.before(async () => {
  browser = await chromium.launch({ executablePath: CHROMIUM });
  server = await starteTestServer({ mitDatenbanken: true });
});

test.after(async () => {
  if (browser) await browser.close();
  if (server) await server.schliessen();
});

/** Erwartetes Ergebnis direkt aus der Haupt-DB. */
function erwartet(name, sql) {
  const db = new Database(datenbanken.haupt(name));
  try {
    return db.prepare(sql).raw().all();
  } finally {
    db.close();
  }
}

/**
 * Neue Seite mit Lauscher für Konsolenmeldungen der Seite und der Web Worker (CSP-Verletzungen aus Workern meldet
 * Playwright nicht über page.on('console'); deshalb eine eigene DevTools-Sitzung mit Auto-Attach).
 */
async function oeffne(pfad, { cookie = null } = {}) {
  const context = await browser.newContext();
  if (cookie) {
    const [name, wert] = cookie.split('=');
    await context.addCookies([{ name, value: wert, url: server.url }]);
  }
  const page = await context.newPage();
  const meldungen = [];
  page.on('console', (m) => meldungen.push(m.text()));
  page.on('pageerror', (e) => meldungen.push(`pageerror: ${e.message}`));
  const cdp = await context.newCDPSession(page);
  let nr = 0;
  cdp.on('Target.receivedMessageFromTarget', ({ message }) => {
    const n = JSON.parse(message);
    if (n.method === 'Log.entryAdded') meldungen.push(`worker-log: ${n.params.entry.text}`);
    if (n.method === 'Runtime.exceptionThrown') meldungen.push(`worker-fehler: ${n.params.exceptionDetails.text}`);
  });
  cdp.on('Target.attachedToTarget', ({ sessionId, targetInfo }) => {
    if (targetInfo.type !== 'worker') return;
    for (const method of ['Log.enable', 'Runtime.enable']) {
      cdp
        .send('Target.sendMessageToTarget', { sessionId, message: JSON.stringify({ id: ++nr, method, params: {} }) })
        .catch(() => {});
    }
  });
  await cdp.send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false, flatten: false });
  await page.goto(server.url + pfad);
  const csp = () => meldungen.filter((m) => /Content Security Policy|Content-Security-Policy|unsafe-eval/i.test(m));
  return { context, page, meldungen, csp };
}

/** Wartet, bis die Konsole weiß, wo sie ausführt, und das Schema geladen ist. */
async function bereit(page) {
  await page.waitForFunction(() => /läuft (im|auf)/.test(document.getElementById('konsole-modus').textContent), null, {
    timeout: 20000
  });
  await page.waitForSelector('.schema-spalte');
  return page.textContent('#konsole-modus');
}

async function leereEditor(page) {
  await page.click('#sql-eingabe');
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Delete');
}

async function tippe(page, sql) {
  await leereEditor(page);
  await page.keyboard.type(sql);
}

/** Ergebnis-Tabelle als Text-Matrix. */
function tabelle(page) {
  return page.$$eval('#ergebnis tbody tr', (zeilen) => zeilen.map((z) => [...z.cells].map((c) => c.textContent)));
}

test('Eisdiele ohne Anmeldung: tippen → Strg+Enter → Tabelle (WASM im Browser)', async () => {
  const { context, page, csp } = await oeffne('/konsole/eisdiele');
  try {
    assert.equal(await bereit(page), 'läuft im Browser');
    assert.equal(await page.textContent('#db-titel'), 'Eisdiele');
    assert.match(await page.textContent('#konsole-db'), /DB: Eisdiele · Übungs-DB/);
    const sql = "SELECT Name, Preis\nFROM Sorte\nWHERE Vegan = 'ja'\nORDER BY Name";
    await tippe(page, sql);
    // Syntax-Overlay zeigt Schlüsselwörter und Text farbig (Spans im Overlay)
    assert.deepEqual(await page.$$eval('#editor-hl .sql-kw', (s) => s.map((x) => x.textContent)), [
      'SELECT', 'FROM', 'WHERE', 'ORDER', 'BY'
    ]);
    assert.deepEqual(await page.$$eval('#editor-hl .sql-str', (s) => s.map((x) => x.textContent)), ["'ja'"]);
    assert.equal(await page.$$eval('#editor-zeilen .zeile-nr:not(.leer)', (z) => z.length), 4);
    await page.keyboard.press('Control+Enter');
    await page.waitForSelector('#ergebnis table');
    const soll = erwartet('eisdiele', sql);
    const kopf = await page.textContent('.ergebnis-zahlen');
    assert.equal(kopf, `${soll.length} Zeilen · 2 Spalten`);
    assert.match(await page.textContent('.ergebnis-zeit'), /^Ausgeführt im Browser · \d+ ms$/);
    assert.deepEqual(await page.$$eval('#ergebnis thead th', (t) => t.map((x) => x.textContent)), ['Name', 'Preis']);
    const ist = await tabelle(page);
    assert.deepEqual(ist.map((z) => z[0]), soll.map((z) => z[0]));
    assert.deepEqual(ist.map((z) => z[1]), soll.map((z) => String(z[1]).replace('.', ',')));
    // Prüfen/Zeitlupe/Tipp/Lösung gibt es hier nicht
    assert.equal(await page.$$eval('.konsole-knoepfe .knopf:not([hidden])', (k) => k.length), 1);
    assert.deepEqual(csp(), []);
  } finally {
    await context.close();
  }
});

test('Mehr als 300 Zeilen: Kopf „… · angezeigt: 300“; kein Treffer; SQLite-Fehler auf Deutsch', async () => {
  const { context, page, csp } = await oeffne('/konsole/eisdiele');
  try {
    await bereit(page);
    await tippe(page, 'SELECT a.VerkaufNr, b.VerkaufNr\nFROM Verkauf a, Verkauf b');
    await page.click('#k-ausfuehren');
    await page.waitForSelector('#ergebnis table');
    assert.equal(await page.textContent('.ergebnis-zahlen'), '3.249 Zeilen · 2 Spalten · angezeigt: 300');
    assert.equal((await tabelle(page)).length, 300);

    await tippe(page, "SELECT Name\nFROM Sorte\nWHERE Name = 'Gibt es nicht'");
    await page.click('#k-ausfuehren');
    await page.waitForSelector('.kein-treffer');
    assert.equal(await page.textContent('.kein-treffer'), 'Keine Zeile erfüllt alle Bedingungen.');
    assert.equal(await page.textContent('.ergebnis-zahlen'), '0 Zeilen · 1 Spalte');

    await tippe(page, 'SELECT Geschmack\nFROM Sorte');
    await page.click('#k-ausfuehren');
    await page.waitForSelector('#ergebnis .diagnose');
    assert.match(await page.textContent('#ergebnis .diagnose'), /Die Spalte Geschmack gibt es nicht/);
    assert.doesNotMatch(await page.textContent('#ergebnis'), /no such column/);
    assert.deepEqual(csp(), []);
  } finally {
    await context.close();
  }
});

test('<> zeigt die Randmarke UNGLEICH_ALT (mit Text) und den Hinweis im Ergebnis', async () => {
  const { context, page, csp } = await oeffne('/konsole/eisdiele');
  try {
    await bereit(page);
    await tippe(page, "SELECT Name\nFROM Sorte\nWHERE Vegan <> 'ja'");
    const marke = await page.waitForSelector('.randmarke[data-code~="UNGLEICH_ALT"]');
    assert.equal(await marke.getAttribute('id'), 'randmarke-3');
    assert.match(await marke.getAttribute('title'), /!=/);
    assert.match(await page.textContent('#editor-hinweise'), /Zeile 3: .*!=/);
    const beschrieben = await page.getAttribute('#sql-eingabe', 'aria-describedby');
    assert.ok(beschrieben.split(' ').includes('editor-hinweise'));
    await page.keyboard.press('Control+Enter');
    await page.waitForSelector('#ergebnis table');
    assert.match(await page.textContent('#ergebnis .diagnose.hinweis'), /Zeile 3: Im Abitur schreibst du/);
    // Nach der Korrektur verschwindet die Marke
    await tippe(page, "SELECT Name\nFROM Sorte\nWHERE Vegan != 'ja'");
    await page.waitForFunction(() => !document.querySelector('.randmarke'));
    assert.deepEqual(csp(), []);
  } finally {
    await context.close();
  }
});

test('Schema: PK unterstrichen, FK mit ↑ und Ziel; Antippen fügt Tabelle.Spalte am Cursor ein', async () => {
  const { context, page } = await oeffne('/konsole/eisdiele');
  try {
    await bereit(page);
    assert.deepEqual(await page.$$eval('.schema-tabelle summary .name', (s) => s.map((x) => x.textContent)), [
      'Sorte', 'Verkauf'
    ]);
    assert.equal(await page.textContent('.schema-tabelle[data-tabelle="Sorte"] .anz'), '10');
    assert.equal(await page.textContent('.schema-tabelle[data-tabelle="Sorte"] .pk'), 'SorteNr');
    const fk = await page.$('[data-einfuegen="Verkauf.SorteNr"]');
    assert.equal(await fk.$eval('.fk-pfeil', (e) => e.textContent), '↑');
    assert.equal(await fk.$eval('.ziel', (e) => e.textContent), '→ Sorte');

    await tippe(page, 'SELECT \nFROM Sorte');
    // Cursor hinter „SELECT “ setzen, dann Spalte antippen
    await page.$eval('#sql-eingabe', (t) => t.setSelectionRange(7, 7));
    await page.click('[data-einfuegen="Sorte.Name"]');
    assert.equal(await page.inputValue('#sql-eingabe'), 'SELECT Sorte.Name\nFROM Sorte');
    // Tab rückt um zwei Leerzeichen ein
    await page.click('#sql-eingabe');
    await page.keyboard.press('End');
    await page.keyboard.press('Control+End');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Tab');
    await page.keyboard.type('x');
    assert.equal(await page.inputValue('#sql-eingabe'), 'SELECT Sorte.Name\nFROM Sorte\n  x');
  } finally {
    await context.close();
  }
});

test('Entwurf übersteht Neuladen (localStorage je DB)', async () => {
  const { context, page } = await oeffne('/konsole/eisdiele');
  try {
    await bereit(page);
    const sql = 'SELECT COUNT(*)\nFROM Verkauf';
    await tippe(page, sql);
    await page.waitForFunction((s) => localStorage.getItem('dd-entwurf:konsole:eisdiele') === s, sql);
    await page.reload();
    await bereit(page);
    assert.equal(await page.inputValue('#sql-eingabe'), sql);
    assert.equal(await page.$$eval('#editor-hl .sql-agg', (s) => s.map((x) => x.textContent).join()), 'COUNT');
  } finally {
    await context.close();
  }
});

test('Endlosabfrage: Abbrechen-Knopf, automatischer Abbruch nach 3 s, danach wieder ausführbar', async () => {
  const { context, page, csp } = await oeffne('/konsole/eisdiele');
  try {
    await bereit(page);
    await tippe(page, ENDLOS);
    const start = Date.now();
    await page.click('#k-ausfuehren');
    await page.waitForSelector('#k-abbrechen:not([hidden])');
    assert.equal(await page.isDisabled('#k-ausfuehren'), true);
    await page.waitForSelector('#ergebnis .diagnose.hinweis', { timeout: 10000 });
    const dauer = Date.now() - start;
    assert.ok(dauer >= 2800 && dauer < 8000, `Abbruch nach ${dauer} ms`);
    assert.match(await page.textContent('#ergebnis'), /Abgebrochen/);
    assert.equal(await page.isHidden('#k-abbrechen'), true);

    // Abbrechen per Knopf
    await page.click('#k-ausfuehren');
    await page.waitForSelector('#k-abbrechen:not([hidden])');
    const knopfStart = Date.now();
    await page.click('#k-abbrechen');
    await page.waitForSelector('#ergebnis .diagnose.hinweis');
    assert.ok(Date.now() - knopfStart < 2000);
    assert.match(await page.textContent('#ergebnis'), /Abfrage abgebrochen\./);

    await tippe(page, 'SELECT COUNT(*)\nFROM Sorte');
    await page.keyboard.press('Control+Enter');
    await page.waitForSelector('#ergebnis table');
    assert.deepEqual(await tabelle(page), [['10']]);
    assert.deepEqual(csp(), []);
  } finally {
    await context.close();
  }
});

test('?ohneWasm=1: Worker meldet „nicht ausführbar“ → Ausführen auf dem Server', async () => {
  const { context, page, csp } = await oeffne('/konsole/eisdiele?ohneWasm=1');
  const anfragen = [];
  page.on('request', (r) => anfragen.push(`${r.method()} ${new URL(r.url()).pathname}`));
  try {
    assert.equal(await bereit(page), 'läuft auf dem Server');
    const sql = 'SELECT SorteNr, Name\nFROM Sorte\nWHERE Preis > 1.6\nORDER BY SorteNr';
    await tippe(page, sql);
    await page.keyboard.press('Control+Enter');
    await page.waitForSelector('#ergebnis table');
    assert.ok(anfragen.includes('POST /api/sql/ausfuehren'), anfragen.join('\n'));
    assert.match(await page.textContent('.ergebnis-zeit'), /^Ausgeführt auf dem Server/);
    const soll = erwartet('eisdiele', sql);
    assert.deepEqual(await tabelle(page), soll.map((z) => z.map(String)));
    // Fehler kommen auch vom Server auf Deutsch
    await tippe(page, 'PRAGMA table_info(Sorte)');
    await page.keyboard.press('Control+Enter');
    await page.waitForSelector('#ergebnis .diagnose');
    assert.match(await page.textContent('#ergebnis .diagnose'), /PRAGMA ist hier nicht erlaubt/);
    assert.deepEqual(csp(), []);
  } finally {
    await context.close();
  }
});

test('Angemeldet: /konsole/stadtrad mit Schema (FK) und Ergebnis', async () => {
  const cookie = await server.anmelden();
  const { context, page, csp } = await oeffne('/konsole/stadtrad', { cookie });
  try {
    assert.equal(new URL(page.url()).pathname, '/konsole/stadtrad');
    assert.equal(await bereit(page), 'läuft im Browser');
    assert.equal(await page.textContent('#db-titel'), 'StadtRad');
    assert.ok(await page.$('[data-einfuegen="Rad.StationID"] .fk-pfeil'));
    const sql = 'SELECT COUNT(*)\nFROM Rad';
    await tippe(page, sql);
    await page.keyboard.press('Control+Enter');
    await page.waitForSelector('#ergebnis table');
    assert.deepEqual(await tabelle(page), erwartet('stadtrad', sql).map((z) => z.map(String)));
    assert.deepEqual(csp(), []);
  } finally {
    await context.close();
  }
});

test('Ohne Anmeldung führt /konsole/stadtrad zur Anmeldung', async () => {
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    const antwort = await page.request.get(server.url + '/konsole/stadtrad', { maxRedirects: 0 });
    assert.equal(antwort.status(), 302);
    assert.equal(antwort.headers().location, '/sso/start?ziel=%2Fkonsole%2Fstadtrad');
  } finally {
    await context.close();
  }
});
