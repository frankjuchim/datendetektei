'use strict';
// E2E (Chromium, playwright-core): sql.js im Web Worker unter der echten CSP der App (Spec §7.2).
// Abfrage, 300-Zeilen-Grenze, nur eine Anweisung, Abbruch nach 3 s mit Neustart, Schema, asm.js-Fallback
// (erzwungen und durch CSP ohne 'wasm-unsafe-eval'), keine CSP-Verletzungen.

const test = require('node:test');
const assert = require('node:assert/strict');
const Database = require('better-sqlite3');
const { chromium } = require('playwright-core');
const { starteTestServer, baueTestDb } = require('./testserver');

const CHROMIUM = process.env.CHROMIUM_PFAD || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const ENDLOS = 'WITH RECURSIVE c(i) AS (SELECT 1 UNION ALL SELECT i+1 FROM c) SELECT COUNT(*) FROM c';

let browser;
let server;
let strengerServer;

test.before(async () => {
  browser = await chromium.launch({ executablePath: CHROMIUM });
  server = await starteTestServer();
  strengerServer = await starteTestServer({ strengeCsp: true });
});

test.after(async () => {
  if (browser) await browser.close();
  if (server) await server.schliessen();
  if (strengerServer) await strengerServer.schliessen();
});

/**
 * Playwright meldet Konsolenausgaben und CSP-Verletzungen aus Web Workern nicht über page.on('console').
 * Deshalb hängt sich eine eigene DevTools-Sitzung der Seite automatisch an jeden neuen Worker (nicht „flach“,
 * Nachrichten über Target.receivedMessageFromTarget) und liest dessen Log (CSP-Meldungen) und Konsole mit.
 * Log.enable liefert auch Einträge von vor dem Anhängen nach.
 */
async function lauscheWorkern(context, page, meldungen) {
  const cdp = await context.newCDPSession(page);
  let nr = 0;
  const sende = (sessionId, method, params = {}) =>
    cdp
      .send('Target.sendMessageToTarget', { sessionId, message: JSON.stringify({ id: ++nr, method, params }) })
      .catch(() => {});
  cdp.on('Target.receivedMessageFromTarget', ({ message }) => {
    const n = JSON.parse(message);
    if (n.method === 'Log.entryAdded') meldungen.push(`worker-log: ${n.params.entry.text}`);
    if (n.method === 'Runtime.consoleAPICalled') {
      meldungen.push(`worker-konsole: ${n.params.args.map((a) => a.value ?? a.description).join(' ')}`);
    }
    if (n.method === 'Runtime.exceptionThrown') meldungen.push(`worker-fehler: ${n.params.exceptionDetails.text}`);
  });
  cdp.on('Target.attachedToTarget', async ({ sessionId, targetInfo }) => {
    if (targetInfo.type !== 'worker') return;
    await sende(sessionId, 'Log.enable');
    await sende(sessionId, 'Runtime.enable');
  });
  await cdp.send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false, flatten: false });
  return cdp;
}

/** Öffnet die Worker-Testseite; sammelt Konsolenmeldungen von Seite und Worker (CSP-Meldungen). */
async function oeffne({ basis = server.url, query = 'db=fundbuero', ohneWebAssembly = false } = {}) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const meldungen = [];
  const anfragen = [];
  context.on('request', (r) => anfragen.push(r.url())); // auch Anfragen aus dem Worker
  page.on('console', (m) => meldungen.push(m.text()));
  page.on('pageerror', (e) => meldungen.push(`pageerror: ${e.message}`));
  const cdp = await lauscheWorkern(context, page, meldungen);
  context.on('close', () => cdp.detach().catch(() => {}));
  if (ohneWebAssembly) {
    await page.addInitScript(() => {
      delete self.WebAssembly;
    });
  }
  await page.goto(`${basis}/test/seiten/worker.html?${query}`);
  const info = await page.evaluate(() => window.ausfuehrer.bereit.then((i) => i, (f) => ({ fehler: f.message })));
  const cspMeldungen = () =>
    meldungen.filter((m) => /Content Security Policy|Content-Security-Policy|unsafe-eval|wasm-unsafe-eval/i.test(m));
  return { context, page, info, meldungen, anfragen, cspMeldungen };
}

const fuehreAus = (page, sql) => page.evaluate((s) => window.ausfuehrer.fuehreAus(s), sql);

test('WASM: Abfrage auf Fundbuero liefert die erwarteten Zeilen', async () => {
  const { context, page, info, cspMeldungen } = await oeffne();
  try {
    assert.equal(info.modus, 'wasm');
    const sql = 'SELECT FundNr, Bezeichnung, Wert FROM Fundsache WHERE Wert >= 100 ORDER BY FundNr';
    const erwartet = new Database(baueTestDb('fundbuero')).prepare(sql).raw().all();
    assert.ok(erwartet.length >= 1);
    const r = await fuehreAus(page, sql);
    assert.equal(r.fehler, undefined, r.fehler);
    assert.deepEqual(r.spalten, ['FundNr', 'Bezeichnung', 'Wert']);
    assert.deepEqual(r.zeilen, erwartet);
    assert.equal(r.gesamt, erwartet.length);
    assert.equal(typeof r.ms, 'number');
    assert.ok(r.zeilen.some((z) => z[1] === 'Messing-Kompass'));

    const leer = await fuehreAus(page, "SELECT * FROM Fundsache WHERE Bezeichnung = 'gibt es nicht'");
    assert.equal(leer.gesamt, 0);
    assert.deepEqual(leer.zeilen, []);
    assert.equal(leer.spalten.length, 10);

    assert.deepEqual(cspMeldungen(), []);
    assert.deepEqual(await page.evaluate(() => window.cspVerletzungen), []);
  } finally {
    await context.close();
  }
});

test('Ergebnis: höchstens 300 Zeilen, gesamt exakt', async () => {
  const { context, page } = await oeffne();
  try {
    const r = await fuehreAus(page, 'WITH RECURSIVE c(i) AS (SELECT 1 UNION ALL SELECT i+1 FROM c WHERE i < 1234) SELECT i FROM c');
    assert.equal(r.zeilen.length, 300);
    assert.equal(r.gesamt, 1234);
    assert.deepEqual(r.zeilen[299], [300]);
  } finally {
    await context.close();
  }
});

test('Nur eine Anweisung; Fehler kommen als { fehler }; Daten sind nur lesbar', async () => {
  const { context, page } = await oeffne();
  try {
    const zwei = await fuehreAus(page, 'SELECT 1; SELECT 2');
    assert.deepEqual(zwei, { fehler: 'Bitte nur eine Abfrage auf einmal.' });
    const mitSemikolon = await fuehreAus(page, 'SELECT 1;  -- Kommentar\n');
    assert.equal(mitSemikolon.gesamt, 1);
    const leer = await fuehreAus(page, '   -- nur ein Kommentar');
    assert.equal(typeof leer.fehler, 'string');
    const falsch = await fuehreAus(page, 'SELECT * FROM GibtEsNicht');
    assert.equal(typeof falsch.fehler, 'string');
    assert.match(falsch.fehler, /GibtEsNicht/);
    const schreiben = await fuehreAus(page, 'DELETE FROM Fundsache');
    assert.equal(typeof schreiben.fehler, 'string');
    const danach = await fuehreAus(page, 'SELECT COUNT(*) FROM Fundsache');
    assert.ok(danach.zeilen[0][0] > 0, 'Daten unverändert');
  } finally {
    await context.close();
  }
});

test('Endlosabfrage: Abbruch nach ~3 s, danach wieder ausführbar', async () => {
  const { context, page, cspMeldungen } = await oeffne();
  try {
    const start = Date.now();
    const r = await fuehreAus(page, ENDLOS);
    const dauer = Date.now() - start;
    assert.equal(r.abgebrochen, true);
    assert.equal(typeof r.fehler, 'string');
    assert.ok(dauer >= 2900 && dauer < 6000, `Dauer ${dauer} ms`);
    const danach = await fuehreAus(page, 'SELECT COUNT(*) FROM Fundsache');
    assert.equal(danach.fehler, undefined, danach.fehler);
    assert.ok(danach.zeilen[0][0] > 0);
    assert.equal((await page.evaluate(() => window.ausfuehrer.bereit)).modus, 'wasm');
    assert.deepEqual(cspMeldungen(), []);
  } finally {
    await context.close();
  }
});

test('abbrechen() beendet eine laufende Abfrage sofort', async () => {
  const { context, page } = await oeffne();
  try {
    const dauer = await page.evaluate(async (sql) => {
      const start = performance.now();
      const p = window.ausfuehrer.fuehreAus(sql);
      setTimeout(() => window.ausfuehrer.abbrechen(), 300);
      const r = await p;
      return { r, ms: performance.now() - start };
    }, ENDLOS);
    assert.equal(dauer.r.abgebrochen, true);
    assert.ok(dauer.ms < 2000, `Dauer ${dauer.ms} ms`);
    const danach = await fuehreAus(page, 'SELECT 42');
    assert.deepEqual(danach.zeilen, [[42]]);
  } finally {
    await context.close();
  }
});

test('schema(): Tabellen mit Spalten, Primär- und Fremdschlüsseln, Zeilenanzahl', async () => {
  const { context, page } = await oeffne({ query: 'db=eisdiele' });
  try {
    const schema = await page.evaluate(() => window.ausfuehrer.schema());
    const nachName = Object.fromEntries(schema.map((t) => [t.name, t]));
    assert.deepEqual(Object.keys(nachName).sort(), ['Sorte', 'Verkauf']);
    const ref = new Database(baueTestDb('eisdiele'));
    for (const t of schema) {
      assert.equal(t.zeilen, ref.prepare(`SELECT COUNT(*) AS n FROM "${t.name}"`).get().n, t.name);
      const info = ref.pragma(`table_info("${t.name}")`);
      assert.deepEqual(t.spalten.map((s) => s.name), info.map((s) => s.name));
    }
    const sorteNr = nachName.Sorte.spalten.find((s) => s.name === 'SorteNr');
    assert.equal(sorteNr.pk, true);
    const fk = nachName.Verkauf.spalten.find((s) => s.name === 'SorteNr');
    assert.deepEqual(fk.fk, { tabelle: 'Sorte', spalte: 'SorteNr' });
    assert.equal(nachName.Sorte.spalten.find((s) => s.name !== 'SorteNr').pk, false);
  } finally {
    await context.close();
  }
});

// asm.js-Fallback (Spec §7.2). Befund mit sql.js 1.14.2 in Chromium: sql-asm.js braucht kein eval und läuft unter
// unserer CSP ohne WebAssembly – aber nur im Hauptthread. Im Web Worker (halb so großer Aufruf-Stack) bricht der
// SQLite-Parser des asm.js-Builds mit „Maximum call stack size exceeded“ ab. Der Worker erkennt das beim Start und
// meldet es verständlich, statt bei jeder Abfrage zu scheitern. Andere Engines (Safari/Firefox) können sich
// anders verhalten; dann startet der Fallback normal (modus 'asm').

const TEXT_OHNE_WASM = /WebAssembly ist gesperrt/;

async function pruefeFallback(page, info) {
  if (info.modus === 'asm') {
    const r = await fuehreAus(page, 'SELECT Bezeichnung FROM Fundsache WHERE FundNr = 36');
    assert.deepEqual(r.zeilen, [['Messing-Kompass']]);
    return;
  }
  assert.match(info.fehler, TEXT_OHNE_WASM);
  const r = await fuehreAus(page, 'SELECT 1');
  assert.match(r.fehler, TEXT_OHNE_WASM);
}

test('sql-asm.js läuft unter der CSP der App ohne WebAssembly (Hauptthread, kein eval)', async () => {
  const context = await browser.newContext();
  const page = await context.newPage();
  const meldungen = [];
  page.on('console', (m) => meldungen.push(m.text()));
  page.on('pageerror', (e) => meldungen.push(`pageerror: ${e.message}`));
  await page.addInitScript(() => {
    delete self.WebAssembly;
  });
  try {
    await page.goto(`${server.url}/test/seiten/asm.html`);
    const r = await page.evaluate(() => window.asmErgebnis);
    assert.equal(r.fehler, undefined, r.fehler);
    assert.equal(r.webAssembly, 'undefined');
    assert.deepEqual(r.werte, [
      [1, 'eins'],
      [2, 'zwei']
    ]);
    assert.deepEqual(await page.evaluate(() => window.cspVerletzungen), []);
    assert.deepEqual(meldungen.filter((m) => /Content Security Policy|unsafe-eval/i.test(m)), []);
  } finally {
    await context.close();
  }
});

test('Ohne WebAssembly (erzwungen): Worker nutzt sql-asm.js oder meldet verständlich, dass SQL nicht geht', async () => {
  const { context, page, info, cspMeldungen } = await oeffne({ query: 'db=fundbuero&ohneWasm=1', ohneWebAssembly: true });
  try {
    assert.equal(await page.evaluate(() => typeof WebAssembly), 'undefined');
    await pruefeFallback(page, info);
    assert.deepEqual(cspMeldungen(), []);
  } finally {
    await context.close();
  }
});

test('Feature-Erkennung: CSP ohne wasm-unsafe-eval → kein WASM-Versuch mit sql-wasm.js, Fallback-Pfad', async () => {
  const { context, page, info, anfragen } = await oeffne({ basis: strengerServer.url });
  try {
    await pruefeFallback(page, info);
    assert.ok(anfragen.some((u) => u.includes('/static/vendor/sqljs/sql-asm.js')), anfragen.join('\n'));
    assert.ok(!anfragen.some((u) => /sql-wasm\.(js|wasm)/.test(u)), 'sql-wasm.* darf nicht geladen werden');
  } finally {
    await context.close();
  }
});

test('CSP-Wächter sieht Verletzungen im Worker (connect-src: fremde DB-Adresse wird blockiert)', async () => {
  const { context, info, cspMeldungen } = await oeffne({ query: 'db=fundbuero&fremd=1' });
  try {
    assert.match(info.fehler, /Datenbank konnte nicht geladen werden/);
    assert.ok(cspMeldungen().some((m) => /connect-src/.test(m)), 'CSP-Meldung aus dem Worker erwartet');
  } finally {
    await context.close();
  }
});

test('WASM-Modus lädt sql-wasm.wasm (nicht sql-asm.js) und die DB nach einem Abbruch nicht erneut', async () => {
  const { context, page, info, anfragen } = await oeffne();
  try {
    assert.equal(info.modus, 'wasm');
    assert.ok(anfragen.some((u) => u.includes('/static/vendor/sqljs/sql-wasm.wasm')));
    assert.ok(!anfragen.some((u) => u.includes('sql-asm.js')));
    await page.evaluate(() => {
      window.ausfuehrer.fuehreAus('WITH RECURSIVE c(i) AS (SELECT 1 UNION ALL SELECT i+1 FROM c) SELECT COUNT(*) FROM c');
      return new Promise((r) => setTimeout(() => r(window.ausfuehrer.abbrechen()), 200));
    });
    const r = await fuehreAus(page, 'SELECT COUNT(*) FROM Fundsache');
    assert.ok(r.zeilen[0][0] > 0);
    assert.equal(anfragen.filter((u) => u.includes('/test/db/fundbuero.sqlite')).length, 1, 'DB nur einmal geladen');
  } finally {
    await context.close();
  }
});
