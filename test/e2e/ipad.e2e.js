'use strict';
// iPad-Tauglichkeit aller Ansichten (Schülerinnen und Schüler arbeiten meist am iPad; Entscheidung Frank, Spec §18,
// 2026-10-20). Emuliert iPad mini hoch (768 × 1024) und iPad Air quer (1180 × 820) mit Touch und Retina in Chromium
// (Safari/WebKit ist in der Testumgebung nicht verfügbar). Je Ansicht:
//  - kein horizontales Scrollen, kein Element ragt rechts aus dem Bild (außer in Scroll-Containern),
//  - Eingabefelder mit mindestens 16 px Schrift (Safari zoomt sonst beim Antippen in die Seite),
//  - Tippziele mindestens 44 × 44 px (Apple HIG; Links im Fließtext ausgenommen, WCAG 2.5.8),
//  - keine JavaScript-Fehler.
const test = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');
const { starteTestServer } = require('./testserver');

const CHROMIUM = require('./chromium').chromiumPfad();
const UA = 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const GERAETE = [[768, 1024], [1180, 820]];
const K = encodeURIComponent('k:17');
// je Interaktionsart eine Aufgabe (sql, choice, order, zeilen, ergebnis, gaps, lines, match, kernpunkte, zellen, anomalie,
// zerlegen, schema, er, Kür-Skript)
const AUFGABEN = ['A1-E1-01', 'A1-E1-03', 'A1-E1-04', 'A1-E1-05', 'A1-E1-07', 'A1-E2-01', 'A1-E2-03', 'A2-E1-02', 'A3-E1-06',
  'A3-E2-06', 'A4-E1-01', 'A4-E1-03', 'A4-E1-06', 'A4-E2-06', 'A4-E2-07', 'A5-E1-02', 'A5-E2-CC', 'A5-E3-CC', 'A6-E1-CC', 'K1-E1-01'];
const SCHUELER = ['/', '/akte/1', '/akte/5', '/akte/8', ...AUFGABEN.map((a) => `/ermittlung/${a.slice(0, 5)}?aufgabe=${a}`),
  '/verhoer/1', '/verhoer/5', '/warmup', '/training', '/pinnwand', '/rangliste', '/live', '/konsole/eisdiele',
  '/werkzeug/zeitlupe?db=eisdiele', '/werkzeug/spurenbrett?db=eisdiele', '/werkzeug/sortierfaecher?db=eisdiele',
  '/werkzeug/bauplan', '/werkzeug/werkbank', '/themen', '/datenschutz'];
const LEHRKRAFT = ['/lehrkraft#/', `/lehrkraft#/kurs/${K}/schueler`, `/lehrkraft#/kurs/${K}/beitritt`, `/lehrkraft#/kurs/${K}/auswertung`,
  `/lehrkraft#/kurs/${K}/scoreboard`, `/lehrkraft#/kurs/${K}/einstellungen`, `/lehrkraft#/kurs/${K}/live`, '/lehrkraft#/aufgaben',
  '/lehrkraft#/aufgaben/A3-E2-01', '/lehrkraft#/materialien', '/lehrkraft/live', `/lehrkraft/urkunden?kurs=${K}`];

/** Läuft im Browser: Befunde der aktuellen Ansicht. */
function pruefen() {
  const vw = window.innerWidth;
  const sel = (el) => {
    let s = el.tagName.toLowerCase();
    if (el.id) s += '#' + el.id;
    else if (el.classList.length) s += '.' + [...el.classList].slice(0, 2).join('.');
    const t = (el.getAttribute('aria-label') || el.textContent || el.value || '').trim().replace(/\s+/g, ' ').slice(0, 30);
    return t ? `${s} „${t}“` : s;
  };
  const sichtbar = (el) => {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    const st = getComputedStyle(el);
    return st.visibility !== 'hidden' && st.display !== 'none' && st.opacity !== '0';
  };
  const imScroller = (el) => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      if (/(auto|scroll|hidden|clip)/.test(getComputedStyle(p).overflowX)) return true;
    }
    return false;
  };
  const befunde = [];
  if (document.documentElement.scrollWidth > vw + 1) befunde.push(`horizontales Scrollen (${document.documentElement.scrollWidth} > ${vw})`);
  for (const el of document.querySelectorAll('body *')) {
    if (!sichtbar(el)) continue;
    if (el.getBoundingClientRect().right > vw + 1 && !imScroller(el)) befunde.push('ragt heraus: ' + sel(el));
  }
  for (const el of document.querySelectorAll('a[href],button,input,select,textarea,[role=button],[role=tab],[role=option],[tabindex]:not([tabindex="-1"]),summary')) {
    if (!sichtbar(el) || el.type === 'hidden' || el.disabled) continue;
    const st = getComputedStyle(el);
    if (el.tagName === 'A' && st.display === 'inline' && el.closest('p,li,td,dd,figcaption,small,.hinweis-klein')) continue;
    let r = el.getBoundingClientRect();
    const label = el.closest('label');
    if (label && /checkbox|radio/.test(el.type)) r = label.getBoundingClientRect();
    if (r.width < 44 || r.height < 44) befunde.push(`Tippziel ${Math.round(r.width)}×${Math.round(r.height)}: ${sel(el)}`);
  }
  for (const el of document.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=range]),textarea,select,[contenteditable=""],[contenteditable=true]')) {
    if (!sichtbar(el)) continue;
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs < 16) befunde.push(`Schrift ${fs} px (iOS zoomt): ${sel(el)}`);
  }
  return [...new Set(befunde)];
}

let browser;
let server;
let schueler;
let lehrkraft;

test.before(async () => {
  browser = await chromium.launch({ executablePath: CHROMIUM });
  server = await starteTestServer({ mitInhalten: true, rateLimits: { lernen: { max: 50000 }, pruefenSql: { max: 50000 } } });
  await server.anmelden({});
  const db = server.t.db;
  const einst = JSON.parse(db.prepare('SELECT einstellungen FROM kurse WHERE kurs_id = ?').get('k:17').einstellungen);
  db.prepare('UPDATE kurse SET einstellungen = ? WHERE kurs_id = ?')
    .run(JSON.stringify({ ...einst, akten: [1, 2, 3, 4, 5, 6, 7, 8], verhoer: 'offen', scoreboard: true, niveau: 'eA' }), 'k:17');
  schueler = await server.anmelden({ sub: 's:5001', name: 'Mika R.' });
  lehrkraft = await server.anmelden({ sub: 'l:7', rolle: 'lehrkraft', name: 'Frau Beispiel', kurse: [{ id: 'k:17', name: 'Inf-LK 12', rolle: 'lehrkraft' }] });
});

test.after(async () => {
  if (browser) await browser.close();
  if (server) await server.schliessen();
});

async function rundgang(rolle, cookie, pfade) {
  const befunde = [];
  for (const [w, h] of GERAETE) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: UA, reducedMotion: 'reduce' });
    if (cookie) {
      const [n, v] = cookie.split(/=(.*)/s);
      await ctx.addCookies([{ name: n, value: v, url: server.url }]);
    }
    const page = await ctx.newPage();
    const js = [];
    page.on('pageerror', (e) => js.push(e.message));
    try {
      for (const pfad of pfade) {
        await page.goto(server.url + pfad, { waitUntil: 'networkidle' });
        await page.waitForTimeout(250);
        for (const b of await page.evaluate(pruefen)) befunde.push(`${w}×${h} ${pfad}: ${b}`);
        for (const m of js.splice(0)) befunde.push(`${w}×${h} ${pfad}: JS-Fehler ${m}`);
      }
    } finally {
      await ctx.close();
    }
  }
  return befunde;
}

test('iPad: Ansichten der Schülerinnen und Schüler (Stadtplan, Akten, jede Interaktionsart, Verhör, Warm-up, Training, Werkzeuge)', { timeout: 300000 }, async () => {
  assert.deepEqual(await rundgang('schueler', schueler, SCHUELER), []);
});

test('iPad: Gastmodus', { timeout: 60000 }, async () => {
  assert.deepEqual(await rundgang('gast', null, ['/gast', '/themen']), []);
});

test('iPad: Lehrkraft-Bereich (Kurse, alle Reiter, Aufgaben, Materialien, Live, Urkunden)', { timeout: 300000 }, async () => {
  assert.deepEqual(await rundgang('lehrkraft', lehrkraft, LEHRKRAFT), []);
});

test('iPad: Touch-Geräte melden pointer: coarse (Grundlage der Touch-Regeln im CSS)', { timeout: 30000 }, async () => {
  const ctx = await browser.newContext({ viewport: { width: 768, height: 1024 }, isMobile: true, hasTouch: true, userAgent: UA });
  try {
    const page = await ctx.newPage();
    await page.goto(server.url + '/gast');
    assert.equal(await page.evaluate(() => matchMedia('(pointer: coarse)').matches), true);
  } finally {
    await ctx.close();
  }
});

test('iPad: ER-Diagramm zum Antippen – höchstens auf 3/4 verkleinert, Tippen knapp neben einem Attribut wählt es aus', { timeout: 60000 }, async () => {
  const ctx = await browser.newContext({ viewport: { width: 768, height: 1024 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: UA });
  const [n, v] = schueler.split(/=(.*)/s);
  await ctx.addCookies([{ name: n, value: v, url: server.url }]);
  try {
    const page = await ctx.newPage();
    await page.goto(`${server.url}/ermittlung/A5-E1?aufgabe=A5-E1-02`, { waitUntil: 'networkidle' });
    const g = page.locator('g.chen-attribut[role=button]').first();
    await g.scrollIntoViewIfNeeded();
    const m = await g.evaluate((el) => {
      const svg = el.ownerSVGElement;
      const form = el.querySelector('.chen-form').getBoundingClientRect();
      return { skala: svg.getBoundingClientRect().width / svg.viewBox.baseVal.width, x: form.left + form.width / 2, y: form.top - 4, h: el.getBoundingClientRect().height };
    });
    assert.ok(m.skala >= 0.74, `Skala ${m.skala}`);
    assert.ok(m.h >= 44, `Tippbereich ${m.h} px`);
    await page.touchscreen.tap(m.x, m.y); // 4 px über der Ellipse: nur der unsichtbare Tippbereich
    const gewaehlt = await page.$$eval('g.chen-el[aria-pressed=true]', (l) => l.map((e) => e.getAttribute('aria-label')));
    assert.equal(await g.getAttribute('aria-pressed'), 'true', JSON.stringify(gewaehlt));
    assert.equal(await page.locator('#aufgabe-karte .er-wisch-hinweis').isVisible(), true, 'Hinweis „seitlich wischen“');
  } finally {
    await ctx.close();
  }
});

test('iPad: Hinweise des Live-Parsers stehen sichtbar unter dem Editor, Tastenkürzel-Anzeige ausgeblendet', { timeout: 60000 }, async () => {
  const ctx = await browser.newContext({ viewport: { width: 768, height: 1024 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: UA });
  const [n, v] = schueler.split(/=(.*)/s);
  await ctx.addCookies([{ name: n, value: v, url: server.url }]);
  try {
    const page = await ctx.newPage();
    await page.goto(`${server.url}/ermittlung/A1-E1?aufgabe=A1-E1-03`, { waitUntil: 'networkidle' });
    const ta = page.locator('textarea[id^=sql-eingabe]').first();
    await ta.fill('SELECT Bezeichnung\nFROM Fundsache\nWHERE Wert > 3 GROUP Bezeichnung');
    const hinweis = page.locator('.editor-hinweise li').first();
    await hinweis.waitFor();
    assert.equal(await hinweis.isVisible(), true);
    assert.match(await hinweis.textContent(), /^Zeile 3: /);
    assert.equal(await page.locator('kbd.taste').first().isVisible(), false);
  } finally {
    await ctx.close();
  }
});

test('iPad: Trainingsplatz zeigt die Beschreibung der gewählten Aufgabenart sichtbar (kein Tooltip nötig)', { timeout: 60000 }, async () => {
  const ctx = await browser.newContext({ viewport: { width: 768, height: 1024 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: UA });
  const [n, v] = schueler.split(/=(.*)/s);
  await ctx.addCookies([{ name: n, value: v, url: server.url }]);
  try {
    const page = await ctx.newPage();
    await page.goto(`${server.url}/training`, { waitUntil: 'networkidle' });
    const b = page.locator('.typ-beschreibung');
    await b.waitFor();
    const vorher = await b.textContent();
    assert.ok(vorher.length > 10, vorher);
    await page.locator('.typ-wahl .segment-knopf[data-typ="T3"]').tap();
    await page.waitForFunction((alt) => document.querySelector('.typ-beschreibung').textContent !== alt, vorher);
    assert.equal(await page.locator('.typ-wahl .segment-knopf[data-typ="T3"]').getAttribute('title'), await b.textContent());
  } finally {
    await ctx.close();
  }
});
