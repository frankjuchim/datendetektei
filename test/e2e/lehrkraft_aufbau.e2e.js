'use strict';
// E2E Aufbau des Lehrkraft-Bereichs wie Algo Quest (Auftrag Frank, Phase 8): Kopf-Navigation Kurse · Aufgaben ·
// Materialien · Themen · Verwaltung (nur Superadmin), Startseite „Meine Kurse“/„Alle Kurse“ als Tabelle, Kursseite
// #/kurs/<id>/<reiter> mit Brotkrumen, Urkunden-Knopf und Reitern Schüler · Beitritt · Auswertung · Scoreboard ·
// Einstellungen · Live, Aufgaben (Akten-Karten → Akte → Aufgabe), Materialien, Verwaltung (Inhalte, Sicherung).
// Hash-Routing: Deep-Links, Zurück-Knopf des Browsers, alte Adressen (?kurs=…#reiter) werden umgeleitet.
// Je Zustand: keine CSP-Meldungen, keine Skriptfehler; 390 px ohne waagerechtes Scrollen, Touch-Ziele ≥ 44 px.
// SCREENSHOTS=1 → docs/screenshots/phase8/lehrkraft_aufbau_*.png.

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { chromium } = require('playwright-core');
const { starteTestServer } = require('./testserver');
const { musterantwort } = require('../../src/content/pruefer');

const CHROMIUM = require('./chromium').chromiumPfad();
const FIXTURE = path.join(__dirname, '..', 'fixtures', 'akte_beispiel.json');
const MATERIAL = path.join(__dirname, '..', 'fixtures', 'materialien');
const FOTOS = process.env.SCREENSHOTS === '1';
const FOTO_ORDNER = path.join(__dirname, '..', '..', 'docs', 'screenshots', 'phase8');

const LEHRKRAFT = {
  sub: 'l:7',
  rolle: 'lehrkraft',
  name: 'Frau M.',
  kurse: [
    { id: 'k:17', name: 'Inf-LK 12', rolle: 'lehrkraft' },
    { id: 'k:18', name: 'Inf-GK 12', rolle: 'lehrkraft' }
  ]
};
const ADMIN = { sub: 'a:1', rolle: 'superadmin', name: 'Admin', kurse: [] };
const KURS = [{ id: 'k:17', name: 'Inf-LK 12', rolle: 'mitglied' }];
const SCHUELER = [
  { sub: 's:1042', rolle: 'schueler', name: 'Lena K.', kurse: KURS },
  { sub: 's:1043', rolle: 'schueler', name: 'Mika R.', kurse: KURS }
];
const K17 = encodeURIComponent('k:17');

let browser;
let server;
const cookies = {};

test.before(async () => {
  if (FOTOS) fs.mkdirSync(FOTO_ORDNER, { recursive: true });
  browser = await chromium.launch({ executablePath: CHROMIUM });
  server = await starteTestServer({ mitInhalten: true, aktenDateien: [FIXTURE], materialVerzeichnis: MATERIAL, rateLimits: { lernen: { max: 1000 }, pruefenSql: { max: 1000 } } });
  cookies.lehrkraft = await server.anmelden(LEHRKRAFT);
  cookies.admin = await server.anmelden(ADMIN);
  const [lena] = await Promise.all(SCHUELER.map((s) => server.anmelden(s)));
  const db = server.t.db;
  db.prepare("UPDATE kurse SET einstellungen = ? WHERE kurs_id = 'k:17'").run(JSON.stringify({ akten: [1, 9], niveau: 'eA', verhoer: 'auto', scoreboard: true }));
  db.prepare("UPDATE kurse SET einstellungen = ? WHERE kurs_id = 'k:18'").run(JSON.stringify({ akten: [1], niveau: 'gA', verhoer: 'auto', scoreboard: false }));
  for (const id of ['A9-E1-01', 'A9-E1-02']) {
    const r = await request(server.t.app)
      .post(`/api/kurse/${K17}/aufgaben/${id}/pruefen`)
      .set('Cookie', lena)
      .set('Origin', server.url)
      .send({ antwort: musterantwort(server.t.app.locals.inhalte.aufgabe(id)) });
    assert.equal(r.body.geloest, true, id);
  }
});

test.after(async () => {
  if (browser) await browser.close();
  if (server) await server.schliessen();
});

async function seite(cookie, { breite = 1280, hoehe = 900, thema = 'light' } = {}) {
  const kontext = await browser.newContext({ viewport: { width: breite, height: hoehe }, colorScheme: thema, reducedMotion: 'reduce' });
  const [name, wert] = cookie.split(/=(.*)/s);
  await kontext.addCookies([{ name, value: wert, url: server.url }]);
  const page = await kontext.newPage();
  const fehler = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || /Content Security Policy|Refused to/i.test(m.text())) fehler.push(m.text());
  });
  page.on('pageerror', (e) => fehler.push('pageerror: ' + e.message));
  return { kontext, page, fehler };
}

// bereit = die Ansicht gehört zur aktuellen Adresse (data-route) und ist fertig geladen – sonst wäre nach einem Klick
// der alte Zustand „bereit“ schon erfüllt, bevor hashchange überhaupt feuert (auf langsamen Rechnern sichtbar).
const bereit = (page) =>
  page.waitForFunction(() => {
    const d = document.documentElement.dataset;
    return d.lehrkraft === 'bereit' && d.route === window.location.hash && !document.querySelector('main .lk-laedt');
  });
const hash = (page) => new URL(page.url()).hash;
const navTexte = (page) => page.$$eval('#lk-nav a', (as) => as.filter((a) => !a.hidden).map((a) => a.textContent.trim()));
const reiterTexte = (page, sel = '#lk-reiter') => page.$$eval(`${sel} [role="tab"]`, (ts) => ts.filter((t) => !t.hidden).map((t) => t.textContent.trim()));

async function ohneUeberlauf(page, name) {
  const ueberlauf = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(ueberlauf <= 0, `${name}: waagerechtes Scrollen (${ueberlauf} px)`);
}

async function touchZiele(page, name) {
  const klein = await page.evaluate(() =>
    [...document.querySelectorAll('#lk-nav a, main .knopf, main [role="tab"], main .lk-tabelle-link')]
      .filter((x) => x.offsetParent !== null)
      .map((x) => ({ t: x.textContent.trim().slice(0, 30), h: Math.round(x.getBoundingClientRect().height) }))
      .filter((x) => x.h < 44)
  );
  assert.deepEqual(klein, [], `${name}: Touch-Ziele unter 44 px`);
}

async function foto(page, name) {
  if (FOTOS) await page.screenshot({ path: path.join(FOTO_ORDNER, `lehrkraft_aufbau_${name}.png`) });
}

test('Kopf-Navigation wie Algo Quest: Kurse · Aufgaben · Materialien · Themen, Verwaltung nur für den Superadmin', async () => {
  const { kontext, page, fehler } = await seite(cookies.lehrkraft);
  try {
    await page.goto(server.url + '/lehrkraft');
    await bereit(page);
    assert.deepEqual(await navTexte(page), ['Kurse', 'Aufgaben', 'Materialien', 'Themen']);
    assert.equal(await page.getAttribute('#lk-nav a[data-bereich="kurse"]', 'aria-current'), 'page');
    assert.equal(await page.getAttribute('#lk-nav a[data-bereich="themen"]', 'href'), '/themen');
    await page.click('#lk-nav a[data-bereich="aufgaben"]');
    await bereit(page);
    assert.equal(hash(page), '#/aufgaben');
    assert.equal(await page.getAttribute('#lk-nav a[data-bereich="aufgaben"]', 'aria-current'), 'page');
    assert.equal(await page.$('#lk-nav a[data-bereich="kurse"][aria-current]'), null);
    // Verwaltung per Adresse: ohne Superadmin zurück zu den Kursen
    await page.goto(server.url + '/lehrkraft#/verwaltung/inhalte');
    await bereit(page);
    assert.equal(hash(page), '#/');
    assert.equal(await page.textContent('h1'), 'Meine Kurse');
    assert.deepEqual(fehler, []);
  } finally {
    await kontext.close();
  }
  const admin = await seite(cookies.admin);
  try {
    await admin.page.goto(server.url + '/lehrkraft');
    await bereit(admin.page);
    assert.deepEqual(await navTexte(admin.page), ['Kurse', 'Aufgaben', 'Materialien', 'Themen', 'Verwaltung']);
    assert.equal(await admin.page.textContent('h1'), 'Alle Kurse');
    assert.deepEqual(admin.fehler, []);
  } finally {
    await admin.kontext.close();
  }
});

test('Kursliste → Kurs öffnen → alle Reiter laden ohne Fehler; Tastatur in der Reiterleiste; Urkunden-Knopf', { timeout: 60000 }, async () => {
  const { kontext, page, fehler } = await seite(cookies.lehrkraft);
  try {
    await page.goto(server.url + '/lehrkraft');
    await bereit(page);
    assert.equal(await page.textContent('h1'), 'Meine Kurse');
    const kopf = await page.$$eval('#kl-tabelle thead th', (ths) => ths.map((t) => t.textContent.trim()));
    assert.deepEqual(kopf.slice(0, 5), ['Kurs', 'Niveau', 'Schüler:innen', 'Fortschritt Ø', 'zuletzt aktiv']);
    const zeilen = await page.$$eval('#kl-tabelle tbody tr', (trs) => trs.map((tr) => tr.textContent));
    assert.equal(zeilen.length, 2);
    assert.match(zeilen[0], /Inf-LK 12[\s\S]*eA[\s\S]*2/);
    assert.match(zeilen[1], /Inf-GK 12[\s\S]*gA[\s\S]*0/);
    assert.match(await page.textContent('main'), /im Portal InfoLabs/);
    await foto(page, 'kursliste');

    await page.click('#kl-tabelle tbody tr:first-child a.knopf');
    await bereit(page);
    assert.equal(hash(page), `#/kurs/${K17}/schueler`);
    assert.equal((await page.textContent('#lk-krumen')).replace(/\s+/g, ''), 'Kurse›Inf-LK12');
    assert.match(await page.textContent('#lk-titel'), /^Inf-LK 12/);
    assert.equal(await page.getAttribute('#lk-urkunden', 'href'), `/lehrkraft/urkunden?kurs=${K17}`);
    assert.match(await page.textContent('#lk-kennzahlen'), /2\s*Schüler:innen/);
    assert.deepEqual(await reiterTexte(page), ['Schüler', 'Beitritt', 'Auswertung', 'Scoreboard', 'Einstellungen', 'Live']);
    // Schüler: Rangfolge nach Punkten, ohne sub
    const namen = await page.$$eval('#sl-tabelle tbody tr', (trs) => trs.map((tr) => tr.querySelector('th').textContent));
    assert.deepEqual(namen, ['Lena K.', 'Mika R.']);
    assert.doesNotMatch(await page.textContent('#panel-schueler'), /s:10\d\d/);

    for (const [r, warte] of [
      ['beitritt', '#bo-umschalten'],
      ['auswertung', 'table.matrix'],
      ['scoreboard', '#sb-liste .rang-zeile'],
      ['einstellungen', '#ei-speichern'],
      ['live', '#panel-live .live-steuerung > :not(.laedt)'],
      ['schueler', '#sl-tabelle']
    ]) {
      await page.click('#reiter-' + r);
      await page.waitForSelector(warte);
      assert.equal(hash(page), `#/kurs/${K17}/${r}`);
      assert.equal(await page.getAttribute('#reiter-' + r, 'aria-selected'), 'true');
      assert.equal(await page.isHidden('#panel-' + r), false);
    }
    // Beitritt: Portal-Hinweis; Scoreboard: Hinweis zur Sichtbarkeit
    await page.click('#reiter-beitritt');
    assert.match(await page.textContent('#bt-portal'), /Kurscode/);
    await page.click('#reiter-scoreboard');
    assert.match(await page.textContent('#panel-scoreboard'), /für Ihre Schülerinnen und Schüler sichtbar/);
    // Tastatur: Pfeiltasten wechseln den Reiter
    await page.focus('#reiter-scoreboard');
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.getAttribute('#reiter-einstellungen', 'aria-selected'), 'true');
    await page.keyboard.press('Home');
    assert.equal(await page.getAttribute('#reiter-schueler', 'aria-selected'), 'true');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'reiter-schueler');
    // Live-Knopf im Kopf öffnet den Live-Reiter
    await page.click('#lk-live-knopf');
    await page.waitForSelector('#panel-live .live-steuerung > :not(.laedt)');
    assert.equal(hash(page), `#/kurs/${K17}/live`);
    assert.deepEqual(fehler, []);
  } finally {
    await kontext.close();
  }
});

test('Deep-Link, Zurück-Knopf und alte Adressen (?kurs=…#reiter) führen auf die neuen Routen', { timeout: 60000 }, async () => {
  const { kontext, page, fehler } = await seite(cookies.lehrkraft);
  try {
    await page.goto(server.url + `/lehrkraft#/kurs/${K17}/auswertung`);
    await page.waitForSelector('table.matrix');
    assert.equal(await page.getAttribute('#reiter-auswertung', 'aria-selected'), 'true');
    await foto(page, 'kurs_auswertung');

    // Zurück-Knopf: Kursliste → Kurs (Schüler) → Einstellungen → zurück → zurück
    await page.goto(server.url + '/lehrkraft#/');
    await bereit(page);
    await page.click(`#kl-tabelle a[href="#/kurs/${K17}/schueler"]:not(.knopf)`);
    await page.waitForSelector('#sl-tabelle');
    await page.click('#reiter-einstellungen');
    await page.waitForSelector('#ei-speichern');
    await page.goBack();
    await page.waitForSelector('#reiter-schueler[aria-selected="true"]');
    await page.waitForSelector('#sl-tabelle');
    assert.equal(hash(page), `#/kurs/${K17}/schueler`);
    await page.goBack();
    await page.waitForSelector('#kl-tabelle');
    assert.equal(await page.textContent('h1'), 'Meine Kurse');
    await page.goForward();
    await page.waitForSelector('#sl-tabelle');

    // alte Formen
    for (const [alt, neu, warte] of [
      ['/lehrkraft?kurs=k:17#einstellungen', `#/kurs/${K17}/einstellungen`, '#ei-speichern'],
      ['/lehrkraft?kurs=k:17#board', `#/kurs/${K17}/beitritt`, '#bo-umschalten'],
      ['/lehrkraft?kurs=k:17#uebersicht', `#/kurs/${K17}/schueler`, '#sl-tabelle'],
      ['/lehrkraft?kurs=k:17', `#/kurs/${K17}/schueler`, '#sl-tabelle'],
      ['/lehrkraft#vorschau', '#/aufgaben', '.lk-akten-karte'],
      ['/lehrkraft?kurs=k:17#materialien', '#/materialien', '#seite-materialien .material-liste']
    ]) {
      await page.goto(server.url + alt);
      await page.waitForSelector(warte);
      const u = new URL(page.url());
      assert.equal(u.pathname + u.search + u.hash, '/lehrkraft' + neu, alt);
    }
    // unbekannter Kurs: Hinweis mit Weg zurück zur Kursliste
    await page.goto(server.url + '/lehrkraft#/kurs/' + encodeURIComponent('k:999') + '/schueler');
    await page.waitForSelector('main .notiz');
    assert.match(await page.textContent('main'), /nicht gefunden|keinen Zugriff/);
    assert.deepEqual(fehler, []);
  } finally {
    await kontext.close();
  }
});

test('Aufgaben (Akten-Karten → Akte → Aufgabe mit Lösung und Tipps), Materialien und Verwaltung', { timeout: 60000 }, async () => {
  const { kontext, page, fehler } = await seite(cookies.lehrkraft);
  try {
    await page.goto(server.url + '/lehrkraft#/aufgaben');
    await page.waitForSelector('.lk-akten-karte');
    assert.equal(await page.textContent('h1'), 'Aufgaben der Akten');
    await foto(page, 'aufgaben');
    await page.click('.lk-akten-karte[href="#/aufgaben/akte/9"]');
    await page.waitForSelector('.vo-tabelle');
    assert.equal(hash(page), '#/aufgaben/akte/9');
    assert.match(await page.textContent('#vo-krumen'), /Aufgaben/);
    assert.match(await page.textContent('main'), /Verhör/);
    await page.click('a[href="#/aufgaben/aufgabe/A9-E1-01"]');
    await page.waitForSelector('#vo-loesung');
    assert.equal(await page.textContent('#vo-titel'), 'Was ist markiert?');
    assert.equal(await page.textContent('#vo-niveau'), 'sichtbar für eA und gA');
    assert.match(await page.textContent('#vo-loesung'), /Attributwert/);
    assert.match(await page.textContent('#vo-tipps'), /einzelne Zelle/);
    assert.equal(await page.$$eval('#vo-ansicht .option', (o) => o.length), 4, 'Aufgabe gerendert');
    await page.click('#vo-eintragen');
    assert.equal(await page.isDisabled('#vo-eintragen'), true);
    await page.click('#vo-nachher');
    await page.waitForFunction(() => /A9-E1-02/.test(document.querySelector('#vo-ansicht .etikett')?.textContent || ''));
    assert.match(await page.textContent('#vo-loesung'), /Musterlösung[\s\S]*SELECT/);
    await page.goBack();
    await page.waitForFunction(() => /A9-E1-01/.test(document.querySelector('#vo-ansicht .etikett')?.textContent || ''));

    await page.click('#lk-nav a[data-bereich="materialien"]');
    await page.waitForSelector('#seite-materialien .material-liste');
    const stufen = await page.$$eval('#seite-materialien .material-liste', (u) => u.map((x) => x.dataset.stufe));
    assert.ok(stufen.includes('schueler') && stufen.includes('lehrkraft') && !stufen.includes('original'));
    assert.deepEqual(fehler, []);
  } finally {
    await kontext.close();
  }
  const admin = await seite(cookies.admin);
  try {
    await admin.page.goto(server.url + '/lehrkraft#/verwaltung');
    await admin.page.waitForSelector('#sy-bericht table');
    assert.equal(hash(admin.page), '#/verwaltung/inhalte');
    assert.equal(await admin.page.textContent('h1'), 'Verwaltung');
    assert.deepEqual(await reiterTexte(admin.page, '#vw-reiter'), ['Inhalte', 'Sicherung']);
    await admin.page.click('#reiter-sicherung');
    await admin.page.waitForSelector('#sy-sicherung-link');
    assert.equal(hash(admin.page), '#/verwaltung/sicherung');
    await admin.page.click('#lk-nav a[data-bereich="materialien"]');
    await admin.page.waitForSelector('#seite-materialien .material-liste[data-stufe="original"]');
    assert.deepEqual(admin.fehler, []);
  } finally {
    await admin.kontext.close();
  }
});

test('Smartphone 390 px hell und dunkel: kein waagerechtes Scrollen, Kopf-Navigation scrollt in sich, Touch ≥ 44 px', { timeout: 120000 }, async () => {
  for (const thema of ['light', 'dark']) {
    const { kontext, page, fehler } = await seite(cookies.admin, { breite: 390, hoehe: 844, thema });
    try {
      for (const [route, warte] of [
        ['#/', '#kl-tabelle'],
        [`#/kurs/${K17}/schueler`, '#sl-tabelle'],
        [`#/kurs/${K17}/beitritt`, '#bo-umschalten'],
        [`#/kurs/${K17}/auswertung`, 'table.matrix'],
        [`#/kurs/${K17}/scoreboard`, '#sb-liste'],
        [`#/kurs/${K17}/einstellungen`, '#ei-speichern'],
        ['#/aufgaben', '.lk-akten-karte'],
        ['#/aufgaben/akte/9', '.vo-tabelle'],
        ['#/aufgaben/aufgabe/A9-E1-02', '#vo-loesung'],
        ['#/materialien', '#seite-materialien .material-liste'],
        ['#/verwaltung/inhalte', '#sy-bericht table']
      ]) {
        await page.goto(server.url + '/lehrkraft' + route);
        await page.waitForSelector(warte);
        await page.waitForTimeout(50);
        await ohneUeberlauf(page, `${route} (${thema})`);
        await touchZiele(page, `${route} (${thema})`);
        if (thema === 'light' && route === `#/kurs/${K17}/schueler`) await foto(page, '390');
      }
      const nav = await page.$eval('#lk-nav', (n) => ({ scroll: n.scrollWidth, breite: n.clientWidth, overflow: getComputedStyle(n).overflowX }));
      assert.ok(nav.overflow === 'auto' || nav.scroll <= nav.breite, `Kopf-Navigation: ${JSON.stringify(nav)}`);
      assert.deepEqual(fehler, []);
    } finally {
      await kontext.close();
    }
  }
});

test('Scoreboard aktualisiert sich alle 20 Sekunden selbst (wie Algo Quest) und hört beim Reiterwechsel auf', async () => {
  const { kontext, page, fehler } = await seite(cookies.lehrkraft);
  try {
    await page.clock.install();
    let abrufe = 0;
    page.on('request', (r) => {
      if (/\/api\/kurse\/[^/]+\/rangliste$/.test(new URL(r.url()).pathname)) abrufe++;
    });
    await page.goto(server.url + `/lehrkraft#/kurs/${K17}/scoreboard`);
    await bereit(page);
    await page.waitForSelector('#sb-liste .rang-zeile');
    assert.match(await page.textContent('#sb-stand'), /alle 20 Sekunden/);
    const vorher = abrufe;
    await page.clock.runFor(20000);
    for (const bis = Date.now() + 5000; abrufe <= vorher && Date.now() < bis; ) await new Promise((ok) => setTimeout(ok, 20));
    assert.ok(abrufe > vorher, 'nach 20 s neu geladen');
    await page.waitForSelector('#sb-liste .rang-zeile');
    // anderer Reiter: keine weiteren Abrufe
    await page.click('#reiter-einstellungen');
    await bereit(page);
    const danach = abrufe;
    await page.clock.runFor(60000);
    await new Promise((ok) => setTimeout(ok, 300));
    assert.equal(abrufe, danach, 'kein Abruf mehr außerhalb des Reiters');
    assert.deepEqual(fehler, []);
  } finally {
    await kontext.close();
  }
});
