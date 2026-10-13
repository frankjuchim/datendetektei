'use strict';
// E2E-Regressionstests des Probelaufs Phase 8, Bereich 2a (Ermittlungen, Konsole, Warm-up, Verhöre der Akten 1–3).
// Jeder Test hält einen Befund fest, der im Probelauf aufgefallen ist:
//  1. Doppelklick auf „Tipp“ verbrauchte zwei Tipps (und damit Punkte).
//  2. Fehlermeldungen beim Prüfen (Sitzung abgelaufen, Server-Fehler) verschwanden wieder, wenn „Prüfen“ kurz nach dem
//     Tippen kam (verzögerte Änderungsmeldung des Editors leerte die Meldung).
//  3. „Zurück zur Ermittlung“ aus der Zeitlupe führte zur ersten offenen statt zur bearbeiteten Aufgabe.
//  4. Warm-up: Doppelklick auf „Lösung aufdecken“ zeigte die Lösung doppelt, Doppelklick auf „Gewusst“ schob die Karte
//     zwei Fächer weiter.
//  5. Verhöre (Abitur-Stil, gesiezt): Bedienhinweise der Interaktionen duzten („Trage die 1 Ergebniszeilen ein“).
//  6. Rückmeldung „1 von 4 Zuordnungen stimmen“ (Singular: „stimmt“).

const test = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');
const { starteTestServer } = require('./testserver');

const CHROMIUM = require('./chromium').chromiumPfad();
const K17 = '/api/kurse/' + encodeURIComponent('k:17');

let browser;
let server;

test.before(async () => {
  browser = await chromium.launch({ executablePath: CHROMIUM });
  server = await starteTestServer({ mitInhalten: true, rateLimits: { lernen: { max: 5000 }, pruefenSql: { max: 5000 } } });
  // Akten 1–3 frei, Verhöre offen (wie nach der Freischaltung durch die Lehrkraft)
  await server.anmelden({});
  const db = server.t.db;
  const einst = JSON.parse(db.prepare('SELECT einstellungen FROM kurse WHERE kurs_id = ?').get('k:17').einstellungen);
  db.prepare('UPDATE kurse SET einstellungen = ? WHERE kurs_id = ?').run(JSON.stringify({ ...einst, akten: [1, 2, 3], verhoer: 'offen' }), 'k:17');
});

test.after(async () => {
  if (browser) await browser.close();
  if (server) await server.schliessen();
});

let naechsteNr = 3100;
/** Neue Schülerin (eigenes Konto, frischer Lernstand) in k:17. */
async function seite({ breite = 1366, hoehe = 768 } = {}) {
  const sub = `s:${naechsteNr++}`;
  const cookie = await server.anmelden({ sub, name: 'Mika R.' });
  const kontext = await browser.newContext({ viewport: { width: breite, height: hoehe }, reducedMotion: 'reduce' });
  const [name, wert] = cookie.split(/=(.*)/s);
  await kontext.addCookies([{ name, value: wert, url: server.url }]);
  const page = await kontext.newPage();
  const fehler = [];
  page.on('pageerror', (e) => fehler.push(e.message));
  return { kontext, page, fehler };
}

async function oeffneAufgabe(page, id) {
  await page.goto(`${server.url}/ermittlung/${id.slice(0, 5)}?aufgabe=${id}`);
  await page.waitForSelector(`#aufgabe-karte .reiter:text("${id}")`);
}

async function konsoleBereit(page) {
  await page.waitForFunction(() => [...document.querySelectorAll('.konsole-modus')].every((m) => /läuft/.test(m.textContent)), null, { timeout: 20000 });
}

const zustand = (page, id) => page.evaluate(async ([k, a]) => (await (await fetch(`${k}/aufgaben/${a}`)).json()).zustand, [K17, id]);

test('Doppelklick auf „Tipp“ verbraucht nur einen Tipp', { timeout: 60000 }, async () => {
  const { kontext, page, fehler } = await seite();
  try {
    await oeffneAufgabe(page, 'A1-E1-06');
    await page.dblclick('#k-tipp');
    await page.waitForSelector('.feedback.tipp');
    await page.waitForTimeout(600);
    const z = await zustand(page, 'A1-E1-06');
    assert.equal(z.tippsAnzahl, 2);
    assert.equal(z.tippsGenutzt, 1, 'Doppelklick hat zwei Tipps verbraucht');
    assert.equal(await page.locator('.feedback.tipp').count(), 1);
    assert.deepEqual(fehler, []);
  } finally {
    await kontext.close();
  }
});

test('Fehlermeldung beim Prüfen bleibt stehen, auch direkt nach dem Tippen', { timeout: 60000 }, async () => {
  const { kontext, page } = await seite();
  try {
    await oeffneAufgabe(page, 'A1-E1-08');
    await konsoleBereit(page);
    const meldung = page.locator('#rueckmeldung .meldung');
    // Sitzung abgelaufen (401) – Prüfen sofort nach der letzten Eingabe
    await page.route('**/pruefen', (r) => r.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"Nicht angemeldet."}' }));
    await page.fill('.lern-konsole textarea', 'SELECT *\nFROM Fundsache');
    await page.click('#k-pruefen');
    await page.waitForTimeout(700);
    assert.match(await meldung.textContent(), /Du bist nicht mehr angemeldet\. Melde dich über das Portal neu an\./);
    await page.unroute('**/pruefen');
    // Server-Fehler (500 mit JSON) – ebenso
    await page.route('**/pruefen', (r) => r.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"Interner Fehler."}' }));
    await page.fill('.lern-konsole textarea', 'SELECT *\nFROM Fundsache\nWHERE Wert > 1');
    await page.click('#k-pruefen');
    await page.waitForTimeout(700);
    assert.match(await meldung.textContent(), /Interner Fehler\./);
    assert.equal(await page.locator('#k-pruefen').isEnabled(), true, 'Prüfen bleibt nach dem Fehler bedienbar');
    // Neue Eingabe danach leert die Meldung wie bisher
    await page.fill('.lern-konsole textarea', 'SELECT *\nFROM Fundsache\nWHERE Wert > 2');
    await page.waitForFunction(() => document.querySelector('#rueckmeldung .meldung').textContent === '', null, { timeout: 3000 });
  } finally {
    await kontext.close();
  }
});

test('Zeitlupe führt zur bearbeiteten Aufgabe zurück', { timeout: 60000 }, async () => {
  const { kontext, page } = await seite({ breite: 390, hoehe: 844 });
  try {
    await oeffneAufgabe(page, 'A3-E1-03');
    await konsoleBereit(page);
    await page.fill('.lern-konsole textarea', 'SELECT COUNT(*)\nFROM Position');
    await page.click('.lern-konsole .knopf:has-text("Zeitlupe")');
    await page.waitForURL(/\/werkzeug\/zeitlupe\?db=stadtfest$/);
    await page.waitForSelector('#zl-rueck:not([hidden])');
    assert.equal(await page.locator('#zl-rueck').getAttribute('href'), '/ermittlung/A3-E1?aufgabe=A3-E1-03');
    await page.click('#zl-rueck');
    await page.waitForSelector('#aufgabe-karte .reiter:text("A3-E1-03")');
    await konsoleBereit(page);
    assert.equal(await page.locator('.lern-konsole textarea').inputValue(), 'SELECT COUNT(*)\nFROM Position', 'Entwurf bleibt');
  } finally {
    await kontext.close();
  }
});

test('Zeitlupe nimmt nur sichere Rücksprünge an', { timeout: 60000 }, async () => {
  const { kontext, page } = await seite();
  try {
    for (const [zurueck, erwartet] of [
      ['/ermittlung/A2-E1?aufgabe=A2-E1-CC', '/ermittlung/A2-E1?aufgabe=A2-E1-CC'],
      ['/ermittlung/A2-E1', '/ermittlung/A2-E1'],
      ['/ermittlung/A2-E1?aufgabe=A2-E1-06&x=1', null],
      ['//evil.example/ermittlung/A2-E1', null],
      ['/ermittlung/A2-E1?aufgabe=javascript:1', null]
    ]) {
      await page.goto(server.url + '/themen');
      await page.evaluate((z) => sessionStorage.setItem('dd_zeitlupe', JSON.stringify({ db: 'stadtrad', sql: 'SELECT *\nFROM Rad', zurueck: z })), zurueck);
      await page.goto(server.url + '/werkzeug/zeitlupe?db=stadtrad');
      await page.waitForSelector('#zl-eingabe-db:not(:empty)');
      await page.waitForTimeout(200);
      const sichtbar = await page.locator('#zl-rueck').isVisible();
      if (erwartet === null) assert.equal(sichtbar, false, `Rücksprung ${zurueck} darf nicht erscheinen`);
      else assert.equal(await page.locator('#zl-rueck').getAttribute('href'), erwartet);
    }
  } finally {
    await kontext.close();
  }
});

test('Warm-up: Doppelklick auf „Lösung aufdecken“ und „Gewusst“ zählt einfach', { timeout: 60000 }, async () => {
  const { kontext, page, fehler } = await seite();
  try {
    await page.goto(server.url + '/warmup');
    await page.waitForSelector('#k-aufdecken');
    await page.dblclick('#k-aufdecken');
    await page.waitForSelector('.einschaetzung');
    await page.waitForTimeout(600);
    assert.equal(await page.locator('.karteikarte-loesung .einschaetzung').count(), 1, 'Lösung doppelt');
    await page.locator('.einschaetzung button[data-ergebnis="gewusst"]').dblclick();
    await page.waitForSelector('#toast.sichtbar');
    await page.waitForTimeout(800);
    const st = await page.evaluate(async (k) => (await (await fetch(`${k}/warmup`)).json()).statistik, K17);
    assert.deepEqual(st.faecher, { 1: 0, 2: 1, 3: 0, 4: 0, 5: 0 }, 'Karte ist mehr als ein Fach weitergerückt');
    assert.match(await page.locator('#toast').textContent(), /Karte rückt in Fach 2\./);
    assert.deepEqual(fehler, []);
  } finally {
    await kontext.close();
  }
});

test('Verhör: Bedienhinweise der Interaktionen im Abitur-Stil (gesiezt), Ermittlung weiter geduzt', { timeout: 90000 }, async () => {
  const { kontext, page, fehler } = await seite();
  try {
    // Öffentliche Fassungen von Lab-Aufgaben aller Arten mit Bedienhinweis (ergebnis, order, zeilen, lines, gestuft)
    const oeffentlich = {};
    for (const id of ['A1-E1-07', 'A1-E1-04', 'A1-E1-05', 'A1-E2-03', 'A3-E1-06']) {
      await page.goto(server.url + '/themen');
      oeffentlich[id] = await page.evaluate(async ([k, a]) => (await (await fetch(`${k}/aufgaben/${a}`)).json()).aufgabe, [K17, id]);
    }
    const einzeilig = structuredClone(oeffentlich['A1-E1-07']);
    einzeilig.interaktion.zeilenAnzahl = 1;
    const ersatz = [einzeilig, oeffentlich['A1-E1-04'], oeffentlich['A1-E1-05'], oeffentlich['A1-E2-03'], oeffentlich['A3-E1-06']];
    // Der Verhör-Start liefert diese Aufgaben (nur Anzeige; gespeichert wird hier nichts)
    await page.route('**/verhoere/2/start', async (route) => {
      const antwort = await route.fetch();
      const v = await antwort.json();
      ersatz.forEach((a, i) => {
        v.aufgaben[i] = { ...v.aufgaben[i], titel: a.titel, inhalt: a.inhalt, interaktion: a.interaktion };
      });
      await route.fulfill({ response: antwort, json: v });
    });
    await page.goto(server.url + '/verhoer/2');
    await page.click('#k-verhoer-start');
    await page.waitForSelector('html[data-seite="verhoer"]');
    const texte = [];
    for (let i = 0; i < ersatz.length; i++) {
      await page.locator('#verhoer-kacheln .kachel').nth(i).click();
      await page.waitForFunction((n) => document.querySelector('#verhoer-zaehler').textContent.includes(`Aufgabe ${n} von`), i + 1);
      const hinweise = (await page.locator('#verhoer-aufgabe .teil-hinweis').allTextContents()).join(' ');
      texte.push(hinweise);
      assert.doesNotMatch(hinweise, /\b(Tippe|Trage|Lege|du|dir|dich|dein\w*)\b/, `Aufgabe ${i + 1} duzt: ${hinweise}`);
    }
    assert.match(texte[0], /Tragen Sie die Ergebniszeile ein\. NULL schreiben Sie als NULL\./);
    assert.match(texte[1], /Tippen Sie die Bausteine in der richtigen Reihenfolge an\./);
    assert.match(texte[2], /Tippen Sie (alle passenden Zeilen|die passende Zeile) an\./);
    assert.match(texte[3], /Tippen Sie (die gesuchte Zeile|\d Zeilen) im Code an\./);
    assert.match(texte[4], /Legen Sie zuerst die Zeile fest\. Danach erscheint Teil b\) – die Zeile können Sie dann nicht mehr ändern\./);

    // Ermittlung: weiter geduzt, Einzahl korrekt
    await page.route('**/aufgaben/A1-E1-07', async (route) => {
      const antwort = await route.fetch();
      const j = await antwort.json();
      j.aufgabe.interaktion.zeilenAnzahl = 1;
      await route.fulfill({ response: antwort, json: j });
    });
    await oeffneAufgabe(page, 'A1-E1-07');
    assert.match(await page.locator('#aufgabe-karte .teil-hinweis').first().textContent(), /^Trage die Ergebniszeile ein\. NULL schreibst du als NULL\.$/);
    await page.unroute('**/aufgaben/A1-E1-07');
    await oeffneAufgabe(page, 'A1-E1-07');
    assert.match(await page.locator('#aufgabe-karte .teil-hinweis').first().textContent(), /^Trage die \d+ Ergebniszeilen ein\. NULL schreibst du als NULL\.$/);
    assert.deepEqual(fehler, []);
  } finally {
    await kontext.close();
  }
});

test('Rückmeldung „1 von n … stimmt“ in der Einzahl', { timeout: 60000 }, async () => {
  const { kontext, page } = await seite();
  try {
    await oeffneAufgabe(page, 'A2-E1-02');
    await page.route('**/aufgaben/A2-E1-02/pruefen', async (route) => {
      const antwort = await route.fetch();
      const j = await antwort.json();
      const ids = Object.keys(j.rueckmeldung.elemente);
      j.rueckmeldung.elemente = Object.fromEntries(ids.map((id, i) => [id, i === 0]));
      await route.fulfill({ response: antwort, json: j });
    });
    await page.locator('#aufgabe-karte .match .segment-knopf').first().click();
    await page.click('#k-pruefen');
    await page.waitForSelector('.feedback.falsch');
    assert.match(await page.locator('.feedback.falsch').textContent(), /(^|\D)1 von \d+ Zuordnungen stimmt\./);
  } finally {
    await kontext.close();
  }
});

test('Smartphone: Rückmeldung und Fehlermeldung nach „Prüfen“ sind im Bild', { timeout: 60000 }, async () => {
  const { kontext, page } = await seite({ breite: 390, hoehe: 844 });
  const imBild = (sel) =>
    page.evaluate((s) => {
      const r = document.querySelector(s).getBoundingClientRect();
      return r.height > 0 && r.top < window.innerHeight && r.bottom > 0;
    }, sel);
  try {
    await oeffneAufgabe(page, 'A1-E1-08');
    await konsoleBereit(page);
    await page.fill('.lern-konsole textarea', 'SELECT *\nFROM Fundsache');
    await page.locator('#k-pruefen').scrollIntoViewIfNeeded();
    await page.click('#k-pruefen');
    await page.waitForSelector('.feedback.falsch');
    await page.waitForTimeout(800);
    assert.equal(await imBild('.feedback.falsch'), true, '„Noch nicht“ liegt außerhalb des Bildschirms');
    await page.route('**/pruefen', (r) => r.fulfill({ status: 401, contentType: 'application/json', body: '{}' }));
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.locator('#k-pruefen').scrollIntoViewIfNeeded();
    await page.click('#k-pruefen');
    await page.waitForTimeout(800);
    assert.match(await page.locator('#rueckmeldung .meldung').textContent(), /nicht mehr angemeldet/);
    assert.equal(await imBild('#rueckmeldung .meldung'), true, 'Fehlermeldung liegt außerhalb des Bildschirms');
  } finally {
    await kontext.close();
  }
});

test('Stadtplan: Lehrkraft wird gesiezt, Schüler:in geduzt; Schema-Spalten ≥ 44 px', { timeout: 60000 }, async () => {
  const cookie = await server.anmelden({ sub: 'l:7', rolle: 'lehrkraft', name: 'Frau M.', kurse: [{ id: 'k:17', name: 'Inf-LK 12', rolle: 'lehrkraft' }] });
  const kontext = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const [name, wert] = cookie.split(/=(.*)/s);
  await kontext.addCookies([{ name, value: wert, url: server.url }]);
  const page = await kontext.newPage();
  try {
    await page.goto(server.url + '/');
    await page.waitForSelector('html[data-seite="bereit"]');
    const gruss = await page.locator('#begruessung').textContent();
    assert.match(gruss, /Willkommen zurück, Frau M\./);
    assert.doesNotMatch(gruss, /\b(Tippe|deine|du|dich)\b/, gruss);
    assert.match(gruss, /Tippen Sie einen Ort an/);
    // Schema-Browser der Freien Ermittlung: jede Spalte ist ein eigenes Touch-Ziel ≥ 44 px
    await page.goto(server.url + '/konsole/fundbuero');
    await page.waitForSelector('.schema-spalte');
    const hoehen = await page.$$eval('.schema-spalte', (l) => l.filter((e) => e.offsetParent).map((e) => e.getBoundingClientRect().height));
    assert.ok(hoehen.length > 0 && hoehen.every((h) => h >= 44), `Schema-Spalten: ${hoehen.join(', ')}`);
  } finally {
    await kontext.close();
  }
  const s = await seite();
  try {
    await s.page.goto(server.url + '/');
    await s.page.waitForSelector('html[data-seite="bereit"]');
    assert.match(await s.page.locator('#begruessung').textContent(), /Tippe einen Ort an.*deine Lehrkraft/);
  } finally {
    await s.kontext.close();
  }
});
