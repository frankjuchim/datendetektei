'use strict';
// E2E-Regressionstests aus dem Probelauf Phase 8, Bereich 2c (Akten 6–7, Pinnwand/Steckbrief, Kür, Trainingsplatz,
// Urkunden). Echte Akten (seed/akten), echte Sandbox und echter Prüfer. Jeder Test hält einen Befund fest.
// SCREENSHOTS=1: Fotos nach docs/screenshots/phase8/akten67_*.png.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const request = require('supertest');
const { chromium } = require('playwright-core');
const { starteTestServer } = require('./testserver');
const { musterantwort } = require('../../src/content/pruefer');

const CHROMIUM = require('./chromium').chromiumPfad();
const FOTOS = process.env.SCREENSHOTS === '1';
const FOTO_ORDNER = path.join(__dirname, '..', '..', 'docs', 'screenshots', 'phase8');

let browser;
let server;
let lena;
const meldungen = [];

const inhalte = () => server.t.app.locals.inhalte;
const post = (cookie, pfad, body) =>
  request(server.t.app).post(pfad).set('Cookie', cookie).set('Origin', server.url).send(body === undefined ? {} : body);

function setzeKurs(kurs, werte) {
  const db = server.t.db;
  const alt = JSON.parse(db.prepare('SELECT einstellungen FROM kurse WHERE kurs_id = ?').get(kurs).einstellungen);
  db.prepare('UPDATE kurse SET einstellungen = ? WHERE kurs_id = ?').run(JSON.stringify({ ...alt, ...werte }), kurs);
}

test.before(async () => {
  browser = await chromium.launch({ executablePath: CHROMIUM });
  server = await starteTestServer({ mitInhalten: true, rateLimits: { lernen: { max: 5000 }, pruefenSql: { max: 5000 } } });
  lena = await server.anmelden({});
  setzeKurs('k:17', { akten: [1, 2, 3, 4, 5, 6, 7, 8], niveau: 'eA' });
  if (FOTOS) fs.mkdirSync(FOTO_ORDNER, { recursive: true });
});

test.after(async () => {
  if (browser) await browser.close();
  if (server) await server.schliessen();
});

async function neueSeite(cookie, viewport = { width: 1366, height: 768 }) {
  const kontext = await browser.newContext({ viewport, reducedMotion: 'reduce', colorScheme: 'light' });
  const [name, wert] = cookie.split(/=(.*)/s);
  await kontext.addCookies([{ name, value: wert, url: server.url }]);
  const page = await kontext.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error' || /Content Security Policy|Refused to/i.test(m.text())) meldungen.push(m.text());
  });
  page.on('pageerror', (e) => meldungen.push('pageerror: ' + e.message));
  return { kontext, page };
}

async function foto(page, name) {
  if (!FOTOS) return;
  await page.screenshot({ path: path.join(FOTO_ORDNER, `akten67_${name}.png`) });
}

test('Zuordnung (match) mit fünf Kategorien: Beschreibungen bleiben lesbar (A6-E1-01, Laptop und Tablet)', { timeout: 60000 }, async () => {
  const { kontext, page } = await neueSeite(lena);
  try {
    await page.goto(`${server.url}/ermittlung/A6-E1?aufgabe=A6-E1-01`);
    await page.waitForSelector('#aufgabe-karte .match-zeile');
    for (const [b, h] of [[1920, 1080], [1366, 768], [1024, 768], [768, 1024], [390, 844]]) {
      await page.setViewportSize({ width: b, height: h });
      await page.waitForTimeout(100);
      const r = await page.evaluate(() =>
        [...document.querySelectorAll('.match-zeile')].map((z) => {
          const e = z.querySelector('.match-element').getBoundingClientRect();
          return { breite: e.width, hoehe: e.height, zeile: z.getBoundingClientRect().width };
        })
      );
      for (const z of r) {
        assert.ok(z.breite >= Math.min(240, z.zeile * 0.5), `@${b}: Beschreibung nur ${Math.round(z.breite)} px breit`);
        assert.ok(z.hoehe < 300, `@${b}: Beschreibung ${Math.round(z.hoehe)} px hoch`);
      }
      const ueberlauf = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      assert.ok(ueberlauf <= 0, `@${b}: horizontales Scrollen`);
      if (b === 1366) await foto(page, 'match_A6-E1-01_1366');
    }
    assert.deepEqual(meldungen, []);
  } finally {
    await kontext.close();
  }
});

test('Pinnwand: Stempel „Fall abgeschlossen“ verdeckt die Steckbrief-Zeile nicht; Spur-Links sind Touch-Ziele', { timeout: 120000 }, async () => {
  const mika = await server.anmelden({ sub: 's:1043', name: 'Mika R.' });
  const db = server.t.db;
  for (const akte of [1, 2, 3, 4, 5, 6, 7]) {
    db.prepare(
      "INSERT INTO verhoer_versuche (sub, kurs_id, akte, aufgaben_json, beginn, ende, punkte, max) VALUES ('s:1043', 'k:17', ?, '[]', '2026-10-01T10:00:00Z', '2026-10-01T10:15:00Z', 8, 10)"
    ).run(akte);
  }
  const { kontext, page } = await neueSeite(mika);
  try {
    await page.goto(server.url + '/pinnwand');
    await page.waitForSelector('.pw-steckbrief > .stempel');
    for (const [b, h] of [[1920, 1080], [1366, 768], [768, 1024], [390, 844]]) {
      await page.setViewportSize({ width: b, height: h });
      await page.waitForTimeout(100);
      const r = await page.evaluate(() => {
        const s = document.querySelector('.pw-steckbrief > .stempel').getBoundingClientRect();
        const u = document.querySelector('.pw-steckbrief .steckbrief-unter').getBoundingClientRect();
        const titel = [...document.querySelectorAll('.pw-indiz-titel')].map((a) => a.getBoundingClientRect().height);
        return { ueberlappt: s.top < u.bottom - 1 && s.bottom > u.top + 1, titel };
      });
      assert.equal(r.ueberlappt, false, `@${b}: Stempel überdeckt „Das Phantom · n von m Hinweisen“`);
      for (const hoehe of r.titel) assert.ok(hoehe >= 43.5, `@${b}: Spur-Link nur ${hoehe} px hoch`);
      if (b === 1366) await foto(page, 'pinnwand_steckbrief_1366');
    }
    assert.deepEqual(meldungen, []);
  } finally {
    await kontext.close();
  }
});

test('Trainingsplatz T6 auf dem Handy: Vorschläge A–D vollständig sichtbar (kein verstecktes Querscrollen)', { timeout: 60000 }, async () => {
  const { kontext, page } = await neueSeite(lena, { width: 390, height: 844 });
  try {
    await page.goto(server.url + '/training');
    await page.waitForSelector('.typ-wahl [data-typ="T6"]');
    await page.click('.typ-wahl [data-typ="T6"]');
    await page.waitForSelector('.aufgabe-karte .schema-block, #inhalt .schema-block');
    const versteckt = await page.evaluate(() =>
      [...document.querySelectorAll('#inhalt .schema-block')].filter((e) => e.scrollWidth > e.clientWidth + 1).length
    );
    assert.equal(versteckt, 0, 'Relationenschema nur per Querscrollen lesbar');
    await page.locator('#inhalt .schema-block').first().scrollIntoViewIfNeeded();
    await foto(page, 'training_T6_390');
    assert.deepEqual(meldungen, []);
  } finally {
    await kontext.close();
  }
});

test('Urkunden: lange Namen (30 Zeichen) passen auf die A4-Seite, Stempel überdeckt keinen Text', { timeout: 90000 }, async () => {
  const KURS = { id: 'k:19', name: 'Inf-LK 12 Weserstedt-Gymnasium' };
  const lk = await server.anmelden({ sub: 'l:9', rolle: 'lehrkraft', name: 'Frau Dr. Annegret Müller-Lüdenscheidt', kurse: [{ ...KURS, rolle: 'lehrkraft' }] });
  for (const [i, name] of ['Lena K.', 'Maximiliane-Josephine Wolkenst', 'Bartholomäus Zacharias Wendela'].entries()) {
    await server.anmelden({ sub: `s:19${i}`, name, kurse: [{ ...KURS, rolle: 'mitglied' }] });
  }
  const { kontext, page } = await neueSeite(lk);
  try {
    await page.goto(server.url + '/lehrkraft/urkunden?kurs=k:19');
    await page.waitForSelector('.urkunde');
    await page.emulateMedia({ media: 'print' });
    const befunde = await page.evaluate(() => {
      const schnitt = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
      return [...document.querySelectorAll('.urkunde')].flatMap((u) => {
        const name = u.querySelector('.urkunde-name').textContent;
        const rahmen = u.querySelector('.urkunde-rahmen').getBoundingClientRect();
        const innen = rahmen.bottom - 0.024 * u.getBoundingClientRect().width; // innere Linie (outline-offset 2,4cqw)
        const fuss = u.querySelector('.urkunde-fuss').getBoundingClientRect();
        const stempel = u.querySelector('.urkunde-stempel').getBoundingClientRect();
        const f = [];
        if (fuss.bottom > innen) f.push(`${name}: Fußzeile reicht über die Rahmenlinie (${Math.round(fuss.bottom - innen)} px)`);
        for (const sel of ['.urkunde-zitat', '.urkunde-fakten', '.unterschrift .name', '.unterschrift .rolle']) {
          for (const e of u.querySelectorAll(sel)) if (schnitt(stempel, e.getBoundingClientRect())) f.push(`${name}: Stempel überdeckt ${sel}`);
        }
        return f;
      });
    });
    assert.deepEqual(befunde, []);
    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
    const seiten = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
    assert.equal(seiten, 3, 'eine A4-Seite je Schüler:in');
    if (FOTOS) {
      await page.locator('.urkunde', { hasText: 'Maximiliane' }).screenshot({ path: path.join(FOTO_ORDNER, 'akten67_urkunde_langer_name.png') });
    }
    assert.deepEqual(meldungen, []);
  } finally {
    await kontext.close();
  }
});

test('Kür-Schreibkonsole: abgelaufene Sitzung und Netzfehler mit verständlicher Meldung', { timeout: 60000 }, async () => {
  const { kontext, page } = await neueSeite(lena);
  try {
    await page.goto(`${server.url}/ermittlung/K1-E1?aufgabe=K1-E1-01`);
    await page.waitForSelector('.schreib-konsole textarea');
    await page.fill('.schreib-konsole textarea', 'SELECT 1;');
    const ausfuehren = async () => {
      await page.click('.schreib-konsole [id^="k-skript-ausfuehren"]');
      await page.waitForFunction(() => document.querySelector('.schreib-konsole .ergebnis-fehler'));
      return page.textContent('.schreib-konsole .ergebnis-fehler');
    };
    await page.route('**/skript', (r) => r.abort());
    assert.match(await ausfuehren(), /nicht ausgeführt werden/);
    await page.unroute('**/skript');
    await kontext.clearCookies();
    assert.match(await ausfuehren(), /nicht mehr angemeldet\. Melde dich über das Portal neu an/);
  } finally {
    await kontext.close();
    meldungen.length = 0; // erwartete Netz- und 401-Meldungen der Konsole
  }
});
