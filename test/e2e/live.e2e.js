'use strict';
// E2E (Chromium, playwright-core): Live-Modus mit Lehrkraft und drei Schülerinnen/Schülern (Plan Phase 6 Task 6).
// Echte Inhalte (seed/live), echte Sandbox und echter SQL-Prüfer; Zustand per SSE in allen Browsern.
// 1. Duell: Lehrkraft wählt zwei Aufgaben, alle treten bei, Aufgabe 1 wird beantwortet (zwei richtig, eine falsch),
//    nach dem Schließen Ergebnis und Rangliste (auch am Beamer), Ende → alle sehen den Endstand.
// 2. Escape Room: zwei Teams, Station 1 per SQL lösen → Code nur bei Team 1, falscher Code abgelehnt, Code öffnet
//    Station 2 (auch beim Teamkollegen), Station 2 lösen → Station 3.
// Je Zustand: keine CSP-Meldungen, kein horizontales Scrollen. SCREENSHOTS=1 → docs/screenshots/phase6/live_*.png.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');
const { starteTestServer } = require('./testserver');

const CHROMIUM = require('./chromium').chromiumPfad();
const ESCAPE = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'seed', 'live', 'escape.json'), 'utf8'));
const SQL = (id) => ESCAPE.stationen.find((s) => s.id === id).aufgabe.loesung.sql;
const FOTOS = process.env.SCREENSHOTS === '1';
const FOTO_ORDNER = path.join(__dirname, '..', '..', 'docs', 'screenshots', 'phase6');

const KURS = [{ id: 'k:17', name: 'Inf-LK 12', rolle: 'mitglied' }];
const LEHRKRAFT = { sub: 'l:7', rolle: 'lehrkraft', name: 'Frau M.', kurse: [{ id: 'k:17', name: 'Inf-LK 12', rolle: 'lehrkraft' }] };
const SCHUELER = [
  { sub: 's:1042', rolle: 'schueler', name: 'Lena K.', kurse: KURS },
  { sub: 's:1043', rolle: 'schueler', name: 'Mika R.', kurse: KURS },
  { sub: 's:1044', rolle: 'schueler', name: 'Ida W.', kurse: KURS }
];

let browser;
let server;
const meldungen = [];

test.before(async () => {
  browser = await chromium.launch({ executablePath: CHROMIUM });
  server = await starteTestServer({ mitInhalten: true, rateLimits: { lernen: { max: 1000 }, pruefenSql: { max: 1000 } } });
  if (FOTOS) fs.mkdirSync(FOTO_ORDNER, { recursive: true });
});

test.after(async () => {
  if (browser) await browser.close();
  if (server) await server.schliessen();
});

async function seite(nutzer, breite = 1280) {
  const kontext = await browser.newContext({ viewport: { width: breite, height: 900 }, reducedMotion: 'reduce' });
  const cookie = await server.anmelden(nutzer);
  const [name, wert] = cookie.split('=');
  await kontext.addCookies([{ name, value: wert, url: server.url }]);
  const page = await kontext.newPage();
  page.on('console', (m) => meldungen.push(`${nutzer.name}: ${m.text()}`));
  page.on('pageerror', (e) => meldungen.push(`${nutzer.name}: ${e.message}`));
  return page;
}

const csp = () => meldungen.filter((m) => /Content Security Policy|Content-Security-Policy|unsafe-eval|unsafe-inline/i.test(m));

async function pruefeLayout(page, name) {
  for (const breite of [1440, 768, 375]) {
    await page.setViewportSize({ width: breite, height: 900 });
    await page.waitForTimeout(120);
    const ueberlauf = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(ueberlauf <= 0, `${name} @${breite}: horizontales Scrollen (${ueberlauf} px)`);
    const klein = await page.evaluate(() =>
      [...document.querySelectorAll('#inhalt .knopf, #inhalt .option, #inhalt .team-knopf, #inhalt .segment-knopf')]
        .filter((e) => e.offsetParent !== null)
        .map((e) => ({ text: (e.textContent || '').trim().slice(0, 30), h: e.getBoundingClientRect().height }))
        .filter((r) => r.h < 43.5)
    );
    assert.deepEqual(klein, [], `${name} @${breite}: Touch-Ziele unter 44 px`);
    if (FOTOS) await page.screenshot({ path: path.join(FOTO_ORDNER, `live_${name}_${breite}.png`), fullPage: true });
  }
  await page.setViewportSize({ width: 1280, height: 900 });
}

async function waehle(page, text) {
  await page.locator('.option', { hasText: text }).first().click();
}

test('Live-Modus: Duell und Escape Room mit Lehrkraft, Beamer und drei Schülern', async () => {
  const lk = await seite(LEHRKRAFT);
  const [s1, s2, s3] = await Promise.all(SCHUELER.map((s) => seite(s, 1024)));

  /* ---------- Duell ---------- */
  await lk.goto(server.url + '/lehrkraft/live?kurs=k:17');
  await lk.waitForSelector('#k-start');
  await lk.click('#lk-keine');
  await lk.check('#lk-aufgabe-K2-L-01');
  await lk.check('#lk-aufgabe-K2-L-09');
  await pruefeLayout(lk, 'lehrkraft_start');
  await lk.click('#k-start');
  await lk.waitForSelector('#k-naechste');
  const beamerHref = await lk.getAttribute('#lk-beamer', 'href');
  const beamer = await seite(LEHRKRAFT, 1920);
  await beamer.setViewportSize({ width: 1920, height: 1080 });
  await beamer.goto(server.url + beamerHref);
  await beamer.waitForSelector('.beamer-aufgabe');
  assert.equal(await beamer.evaluate(() => document.documentElement.dataset.theme), 'dark');

  for (const s of [s1, s2, s3]) {
    await s.goto(server.url + '/live?kurs=k:17');
    await s.waitForSelector('#k-beitreten');
    await s.click('#k-beitreten');
    await s.waitForSelector('text=Warte auf die erste Aufgabe');
  }
  await lk.waitForSelector('#lk-teilnehmer li:nth-child(3)');
  await lk.click('#k-naechste');
  for (const s of [s1, s2, s3]) await s.waitForSelector('.option');
  await s1.waitForSelector('text=Aufgabe 1 von 2');
  await pruefeLayout(s1, 'duell_aufgabe');
  await waehle(s1, 'WHERE Wert IS NULL');
  await s1.click('#k-antwort');
  await waehle(s2, 'WHERE Wert IS NULL');
  await s2.click('#k-antwort');
  await waehle(s3, "WHERE Wert = 'NULL'");
  await s3.click('#k-antwort');
  for (const s of [s1, s2, s3]) await s.waitForSelector('#live-gespeichert');
  await lk.waitForSelector('text=3 von 3 haben geantwortet');
  await beamer.waitForSelector('text=3 von 3 haben geantwortet');
  assert.ok(!(await beamer.content()).includes('Musterlösung'), 'keine Lösung am Beamer');
  await lk.click('#k-schliessen');
  for (const s of [s1, s2]) await s.waitForSelector('#live-ergebnis >> text=Richtig');
  await s3.waitForSelector('#live-ergebnis >> text=Leider falsch');
  await beamer.waitForSelector('text=2 von 3 richtig');
  const namen = await beamer.$$eval('.live-rang .rang-name', (e) => e.map((x) => x.textContent));
  assert.equal(namen.length, 3);
  assert.equal(namen[2], 'Ida W.');
  await pruefeLayout(s3, 'duell_ergebnis');
  if (FOTOS) await beamer.screenshot({ path: path.join(FOTO_ORDNER, 'live_beamer_duell_1920.png') });
  await lk.click('#k-ende');
  await lk.click('#k-ende-ja');
  await lk.waitForSelector('#lk-ende');
  for (const s of [s1, s2, s3]) await s.waitForSelector('#live-ende');
  await beamer.waitForSelector('#beamer-ende');

  /* ---------- Escape Room ---------- */
  await lk.click('#k-neu');
  await lk.waitForSelector('#lk-modus-escape');
  await lk.click('#lk-modus-escape');
  await lk.fill('#lk-teams', '4');
  await lk.click('#k-start');
  await lk.waitForSelector('#k-los');
  for (const [s, team] of [[s1, 1], [s2, 1], [s3, 2]]) {
    await s.click('text=Nach neuer Runde suchen');
    await s.waitForSelector(`#live-team-${team}`);
    await s.click(`#live-team-${team}`);
    await s.waitForSelector('text=Gleich geht’s los');
  }
  await pruefeLayout(s1, 'escape_warten');
  await lk.click('#k-los');
  for (const s of [s1, s2, s3]) await s.waitForSelector('text=Station 1: Das Fundbuch-Schloss');

  // Station 1 (Team 1): falsche Abfrage → kein Code
  await s1.fill('.lern-konsole textarea', 'SELECT Bezeichnung, Fundort\nFROM Fundsache');
  await s1.click('#k-antwort');
  await s1.waitForSelector('#live-meldung >> text=Das stimmt noch nicht');
  assert.equal(await s1.$('#live-code'), null);
  // richtige Abfrage → Code bei Team 1 (beide Geräte), nicht bei Team 2
  await s1.fill('.lern-konsole textarea', SQL('S1'));
  await s1.click('#k-antwort');
  await s1.waitForSelector('#live-code');
  assert.equal(await s1.textContent('#live-code'), '006');
  await s2.waitForSelector('#live-code');
  assert.ok(!(await s3.content()).includes('live-code"'), 'Team 2 sieht keinen Code');
  await pruefeLayout(s1, 'escape_code');
  // Team 2: falscher Code wird abgelehnt
  await s3.fill('#live-code-eingabe', '123');
  await s3.click('#k-code');
  await s3.waitForSelector('#live-code-meldung >> text=Der Code passt nicht');
  // Team 2: nach 10 falschen Antworten in der Minute greift die Bremse – die Seite zeigt den Text des Servers
  const falschGesendet = await s3.evaluate(async () => {
    const { runde } = await (await fetch('/api/kurse/k%3A17/live')).json();
    const st = [];
    for (let i = 0; i < 10; i++) {
      const a = await fetch(`/api/live/${runde.id}/antwort`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ antwort: 'SELECT Bezeichnung FROM Fundsache' }) });
      st.push(a.status);
    }
    return st;
  });
  assert.deepEqual(falschGesendet, Array(10).fill(200));
  await s3.fill('.lern-konsole textarea', 'SELECT Fundort\nFROM Fundsache');
  await s3.click('#k-antwort');
  await s3.waitForSelector('#live-meldung >> text=Zu viele falsche Antworten');
  assert.equal(await s3.isEnabled('#k-antwort'), true, 'nach der Meldung wieder bedienbar');
  // Team 1 (anderes Gerät) öffnet das Schloss → Station 2 bei beiden
  await s2.fill('#live-code-eingabe', '006');
  await s2.click('#k-code');
  for (const s of [s1, s2]) await s.waitForSelector('text=Station 2: Das Speichenschloss');
  await s3.waitForSelector('text=Station 1: Das Fundbuch-Schloss');
  // Station 2 lösen → Code → Station 3
  await s1.fill('.lern-konsole textarea', SQL('S2'));
  await s1.click('#k-antwort');
  await s1.waitForSelector('#live-code');
  assert.equal(await s1.textContent('#live-code'), '0022');
  await s1.fill('#live-code-eingabe', '0022');
  await s1.click('#k-code');
  await s1.waitForSelector('text=Station 3: Die Geldkassette');
  // Fortschritt am Beamer und in der Steuerung
  await beamer.goto(server.url + (await lk.getAttribute('#lk-beamer', 'href')));
  await beamer.waitForSelector('.fortschritt-zeile >> text=2/6');
  assert.ok(!(await beamer.content()).includes('0022'), 'kein Code am Beamer');
  await lk.waitForSelector('.live-teams >> text=Lena K., Mika R.');
  await pruefeLayout(lk, 'lehrkraft_escape');
  if (FOTOS) await beamer.screenshot({ path: path.join(FOTO_ORDNER, 'live_beamer_escape_1920.png') });
  const ueberlauf = await beamer.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(ueberlauf <= 0, 'Beamer ohne horizontales Scrollen');

  await lk.click('#k-ende');
  await lk.click('#k-ende-ja');
  for (const s of [s1, s2, s3]) await s.waitForSelector('#live-ende');
  assert.deepEqual(csp(), []);
  assert.deepEqual(meldungen.filter((m) => /Uncaught|TypeError|ReferenceError/.test(m)), []);
});
