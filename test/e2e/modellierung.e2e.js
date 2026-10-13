'use strict';
// E2E (Chromium, playwright-core): Abnahme Phase 5 (Plan Task 10) mit den ECHTEN Akten 4 und 5 (seed/akten).
//   Stadtplan: Akten 4 und 5 freigeschaltet, mit Aktenfarbe im Stand.
//   A4-E1-03 Anomalie-Simulator (Auftrag ausführen, Falle „Jens Meyer, Sven Albers“, dann lösen)
//   A4-E2-06 Zerlegungs-Puzzle (erst falsch mit Hinweis je Tabelle, dann richtig)
//   A5-E2-07 Bauplan-Tisch im Zeichenmodus (Lena) und im Listenmodus nur per Tastatur (Mika)
//   A5-E3-04 Schema-Werkbank (erst falsch mit Rückmeldung, dann richtig)
//   Verhör 5: starten, je eine gezogene er- und schema-Aufgabe beantworten – ohne Rückmeldung
//   gA-Kurs: Akte 5 weder auf dem Stadtplan noch auf der Akte-Seite noch in der API; A4-E2-06…08 und der Cold Case
//   A4-E2-CC fehlen.
// Je Zustand: kein horizontales Scrollen der Seite bei 1024 × 768, 768 × 1024, 375 × 812 und 1920 × 1080; keine
// CSP-Meldungen und keine Skriptfehler.
// SCREENSHOTS=1: Fotos nach docs/screenshots/phase5/ (iPad quer/hoch und Handy hell, Beamer 1920 hell und dunkel).

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');
const { starteTestServer } = require('./testserver');

const CHROMIUM = require('./chromium').chromiumPfad();
const FOTOS = process.env.SCREENSHOTS === '1';
const FOTO_ORDNER = process.env.SCREENSHOT_ORDNER || path.join(__dirname, '..', '..', 'docs', 'screenshots', 'phase5');
const AKTE4 = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'seed', 'akten', 'akte4.json'), 'utf8'));
const AKTE5 = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'seed', 'akten', 'akte5.json'), 'utf8'));
const loesung = (akte, id) => akte.aufgaben.find((a) => a.id === id).loesung;

const LENA = {}; // Standard-Testnutzerin (s:1042, Kurs k:17)
const MIKA = { sub: 's:1043', name: 'Mika R.', kurse: [{ id: 'k:17', name: 'Inf-LK 12', rolle: 'mitglied' }] };
const IDA = { sub: 's:1050', name: 'Ida M.', kurse: [{ id: 'k:18', name: 'Inf-GK 12', rolle: 'mitglied' }] };

/** Breiten der Abnahme: [Breite, Höhe, Themen fürs Foto]. */
const GROESSEN = [
  [1024, 768, ['light']],
  [768, 1024, ['light']],
  [375, 812, ['light']],
  [1920, 1080, ['light', 'dark']]
];

let browser;
let server;

function setzeKurs(kursId, aenderung) {
  const db = server.t.db;
  const alt = JSON.parse(db.prepare('SELECT einstellungen FROM kurse WHERE kurs_id = ?').get(kursId).einstellungen);
  db.prepare('UPDATE kurse SET einstellungen = ? WHERE kurs_id = ?').run(JSON.stringify({ ...alt, ...aenderung }), kursId);
}

test.before(async () => {
  browser = await chromium.launch({ executablePath: CHROMIUM });
  server = await starteTestServer({ mitInhalten: true });
  await server.anmelden(LENA); // legt k:17 an
  setzeKurs('k:17', { akten: [1, 2, 3, 4, 5], niveau: 'eA', verhoer: 'offen' });
  await server.anmelden(IDA); // legt k:18 an
  setzeKurs('k:18', { akten: [1, 2, 3, 4, 5], niveau: 'gA', verhoer: 'offen' });
  if (FOTOS) fs.mkdirSync(FOTO_ORDNER, { recursive: true });
});

test.after(async () => {
  if (browser) await browser.close();
  if (server) await server.schliessen();
});

async function neueSeite(nutzer, viewport = { width: 1440, height: 900 }) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
  if (nutzer) {
    const cookie = await server.anmelden(nutzer);
    const [name, wert] = cookie.split('=');
    await context.addCookies([{ name, value: wert, url: server.url }]);
  }
  const page = await context.newPage();
  const meldungen = [];
  page.on('console', (m) => {
    if (/status of 40[134]/.test(m.text())) return; // erwartete API-Antworten (gA-Prüfung, Kopfzeile ohne Anmeldung)
    if (m.type() === 'error' || /Content Security Policy|Content-Security-Policy|unsafe-eval|unsafe-inline/i.test(m.text())) meldungen.push(m.text());
  });
  page.on('pageerror', (e) => meldungen.push(`pageerror: ${e.message}`));
  return { context, page, meldungen };
}

async function ohneUeberlauf(page, name) {
  const ueberlauf = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(ueberlauf <= 0, `${name}: horizontales Scrollen der Seite (${ueberlauf} px)`);
}

/** Alle Abnahme-Größen: Layout prüfen, bei SCREENSHOTS=1 fotografieren; danach zurück auf die Ausgangsgröße. */
async function foto(page, motiv) {
  const vorher = page.viewportSize();
  for (const [b, h, themen] of GROESSEN) {
    await page.setViewportSize({ width: b, height: h });
    await page.waitForTimeout(200);
    await ohneUeberlauf(page, `${motiv} @${b}`);
    if (!FOTOS) continue;
    for (const thema of themen) {
      await page.emulateMedia({ colorScheme: thema, reducedMotion: 'reduce' });
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(120);
      const name = `${motiv}_${b}x${h}${thema === 'dark' ? '_dunkel' : ''}.png`;
      await page.screenshot({ path: path.join(FOTO_ORDNER, name), fullPage: true });
    }
  }
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  await page.setViewportSize(vorher);
}

async function oeffneAufgabe(page, ermittlung, id) {
  await page.goto(`${server.url}/ermittlung/${ermittlung}?aufgabe=${id}`);
  await page.waitForSelector(`#aufgabe-karte .reiter:text("${id}")`, { timeout: 30000 });
}

async function pruefen(page, erwartet) {
  await page.click('#k-pruefen');
  await page.waitForSelector(erwartet === 'richtig' ? '#feedback-richtig' : '.feedback.falsch', { timeout: 30000 });
}

async function pruefenTastatur(page, erwartet) {
  await page.focus('#k-pruefen');
  await page.keyboard.press('Enter');
  await page.waitForSelector(erwartet === 'richtig' ? '#feedback-richtig' : '.feedback.falsch', { timeout: 30000 });
}

const apiJson = (page, pfad) =>
  page.evaluate(async (p) => {
    const r = await fetch(p, { headers: { Accept: 'application/json' } });
    return { status: r.status, json: r.headers.get('content-type')?.includes('json') ? await r.json() : null };
  }, pfad);

/** Ziehen per Maus (Pointer Events). */
async function ziehe(page, von, nach) {
  await von.evaluate((e) => e.scrollIntoView({ block: 'center' }));
  const a = await von.boundingBox();
  const b = await nach.boundingBox();
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2 + 10, a.y + a.height / 2 + 10, { steps: 3 });
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
  await page.mouse.up();
}

/* ================= Stadtplan ================= */

test('Stadtplan (eA): Akten 4 und 5 freigeschaltet und mit Aktenfarbe', { timeout: 120000 }, async () => {
  const { context, page, meldungen } = await neueSeite(LENA);
  try {
    await page.goto(server.url + '/');
    await page.waitForSelector('html[data-seite="bereit"]');
    const vier = page.locator('.plan-svg .ort[data-akte="4"]');
    assert.equal(await vier.count(), 1);
    assert.equal(await vier.evaluate((e) => e.classList.contains('gesperrt')), false, 'Akte 4 frei');
    assert.match(await vier.getAttribute('aria-label'), /Vereinsheim TuS – Akte 4: Chaos im Vereinsarchiv/);
    const detektei = page.locator('.plan-svg .ort[data-akte="5"]');
    assert.equal(await detektei.count(), 1);
    assert.equal(await detektei.evaluate((e) => e.classList.contains('gesperrt')), false, 'Akte 5 frei');
    assert.match(await detektei.getAttribute('aria-label'), /Akte 5: Der Bauplan/);
    const stand = await apiJson(page, '/api/kurse/k%3A17/stand');
    assert.equal(stand.status, 200);
    const farbe = Object.fromEntries(stand.json.akten.map((a) => [a.nr, a.farbe]));
    assert.equal(farbe[4], AKTE4.farbe);
    assert.equal(farbe[5], AKTE5.farbe);
    assert.equal(farbe[4], '#5E4A8C');
    assert.equal(farbe[5], '#17585C');
    const a5 = stand.json.akten.find((a) => a.nr === 5);
    assert.deepEqual(a5.ermittlungen.map((e) => e.id), ['A5-E1', 'A5-E2', 'A5-E3']);
    // Akte 5 auf der Akte-Seite
    await detektei.click();
    await foto(page, 'stadtplan');
    await page.goto(server.url + '/akte/5');
    await page.waitForSelector('html[data-seite="bereit"]');
    assert.equal(await page.locator('.ermittlung-karte').count(), 3);
    // Werkzeuge der Akte 5: Bauplan-Tisch und Schema-Werkbank
    assert.equal(await page.locator('.werkzeug-karte a[href^="/werkzeug/bauplan"]').count(), 1);
    assert.equal(await page.locator('.werkzeug-karte a[href^="/werkzeug/werkbank"]').count(), 1);
    await foto(page, 'akte5');
    assert.deepEqual(meldungen, []);
  } finally {
    await context.close();
  }
});

/* ================= Akte 4 ================= */

test('Anomalie-Simulator A4-E1-03: Auftrag ausführen, Falle in Zeile 4, dann lösen', { timeout: 120000 }, async () => {
  const { context, page, meldungen } = await neueSeite(LENA);
  try {
    await oeffneAufgabe(page, 'A4-E1', 'A4-E1-03');
    assert.match(await page.locator('.auftragskarte').textContent(), /Jens Meyer-Kahl/);
    const zelle = (r, c) => page.locator(`.sim-tabelle button.zelle-knopf[data-r="${r}"][data-c="${c}"]`);
    // nur die Zellen mit genau „Jens Meyer“ sind änderbar (Zeile 4 „Jens Meyer, Sven Albers“ nicht)
    assert.equal(await page.locator('.sim-tabelle button.zelle-knopf').count(), 5);
    assert.equal(await zelle(3, 3).count(), 0);
    for (const r of [0, 1, 4, 8, 9]) await zelle(r, 3).click();
    assert.equal(await page.locator('.sim-tabelle td.geaendert').count(), 5);
    await page.click('.sim-auftrag .knopf:has-text("Auftrag ausgeführt")');
    await page.waitForSelector('.sim-befund');
    assert.ok((await page.locator('.sim-befund').textContent()).trim().length > 0, 'Befund');
    await page.click('.anomalie-arten button:has-text("Änderungsanomalie")');
    // erst nur die geänderten Zellen markieren – Zeile 4 vergessen
    for (const r of [0, 1, 4, 8, 9]) await zelle(r, 3).click();
    await pruefen(page, 'falsch');
    assert.match(await page.locator('.sim-rueckmeldung').textContent(), /Anomalieart stimmt/);
    await foto(page, 'a4_anomalie');
    await zelle(3, 3).click();
    await pruefen(page, 'richtig');
    assert.equal(await page.locator('.sim-tabelle td.loesung').count(), loesung(AKTE4, 'A4-E1-03').zellen.length);
    assert.match(await page.locator('.sim-loesung').textContent(), /Änderungsanomalie/);
    assert.deepEqual(meldungen, []);
  } finally {
    await context.close();
  }
});

test('Zerlegungs-Puzzle A4-E2-06: erst Redundanz mit Hinweis, dann verlustfrei und redundanzfrei', { timeout: 120000 }, async () => {
  const { context, page, meldungen } = await neueSeite(LENA);
  try {
    await oeffneAufgabe(page, 'A4-E2', 'A4-E2-06');
    const tab = (i) => page.locator('.zerlegen-tabelle').nth(i);
    const sel = (i) => page.locator('select.zerlegen-hinzu').nth(i);
    assert.equal(await page.locator('.zerlegen-tabelle').count(), 2);
    for (const a of ['Abteilung', 'Trainer', 'TrainerTelefon', 'Halle']) await sel(0).selectOption(a);
    for (const a of ['Halle', 'HallenAdresse']) await sel(1).selectOption(a);
    await page.locator('.schluessel-schalter[aria-label="Abteilung gehört zum Schlüssel von Tabelle 1"]').click();
    await page.locator('.schluessel-schalter[aria-label="Halle gehört zum Schlüssel von Tabelle 2"]').click();
    const vorschau = await page.locator('.zerlegen-vorschau').textContent();
    assert.match(vorschau, /Tabelle 1\(Abteilung, Trainer, TrainerTelefon, ↑Halle\)/);
    await pruefen(page, 'falsch');
    assert.ok(await tab(0).evaluate((e) => e.classList.contains('falsch')));
    assert.match(await tab(0).locator('.zerlegen-hinweise').textContent(), /TrainerTelefon hängt von Trainer ab/);
    assert.match(await page.locator('.zerlegen-gesamt').textContent(), /Noch nicht redundanzfrei/);
    await foto(page, 'a4_zerlegen');
    // dritte Tabelle: Trainer und TrainerTelefon
    await page.click('.teil-zerlegen .knopf:has-text("Tabelle hinzufügen")');
    assert.equal(await page.locator('.zerlegen-tabelle').count(), 3);
    await ziehe(page, tab(0).locator('.spalte-name:text-is("TrainerTelefon")'), tab(2));
    await sel(2).selectOption('Trainer');
    await page.locator('.schluessel-schalter[aria-label="Trainer gehört zum Schlüssel von Tabelle 3"]').click();
    assert.deepEqual(await tab(0).locator('.spalte-name').allTextContents(), ['Abteilung', 'Trainer', 'Halle']);
    assert.match(await page.locator('.zerlegen-vorschau').textContent(), /Tabelle 3\(Trainer, TrainerTelefon\)/);
    await pruefen(page, 'richtig');
    assert.equal(await page.locator('.zerlegen-tabelle.ok').count(), 3);
    assert.deepEqual(meldungen, []);
  } finally {
    await context.close();
  }
});

/* ================= Akte 5: Bauplan-Tisch ================= */

test('Bauplan-Tisch A5-E2-07 im Zeichenmodus: Werkzeugleiste, Verbinden, Panel – Kriterien, dann GELÖST', { timeout: 180000 }, async () => {
  const { context, page, meldungen } = await neueSeite(LENA);
  try {
    await page.goto(server.url + '/');
    await page.evaluate(() => localStorage.setItem('dd-bauplan-ansicht', 'zeichnen'));
    await oeffneAufgabe(page, 'A5-E2', 'A5-E2-07');
    const tisch = page.locator('#aufgabe-karte .bauplan');
    await tisch.waitFor();
    const flaeche = tisch.locator('.bp-svg');
    const panel = tisch.locator('.bp-panel');
    assert.equal(await flaeche.locator('.chen-el').count(), 0, 'entwickeln: leere Zeichenfläche');

    async function entitaet(name, attribute) {
      await tisch.locator('[data-werkzeug="entitaet"]').click();
      await page.keyboard.type(name);
      for (const [i, [a, schluessel]] of attribute.entries()) {
        await tisch.locator('[data-werkzeug="attribut"]').click();
        await page.keyboard.type(a);
        if (schluessel) await panel.locator('.bp-schluessel').nth(i).check();
      }
    }
    async function verbinde(von, nach, name, kards, { rollen = null, attribut = null } = {}) {
      const vorher = await flaeche.locator('.chen-beziehung').count();
      const k = tisch.locator('[data-werkzeug="verbinden"]');
      if ((await k.getAttribute('aria-pressed')) !== 'true') await k.click();
      await flaeche.locator(`.chen-entitaet[data-id="${von}"]`).click();
      await flaeche.locator(`.chen-entitaet[data-id="${nach}"]`).click();
      await page.waitForFunction((n) => document.querySelectorAll('#aufgabe-karte .bp-svg .chen-beziehung').length === n, vorher + 1);
      await panel.locator('.bp-name-feld').fill(name);
      for (const [i, kard] of kards.entries()) await panel.locator('.bp-ende-kard').nth(i).selectOption(kard);
      if (rollen) for (const [i, r] of rollen.entries()) await panel.locator('.bp-ende-rolle').nth(i).fill(r);
      if (attribut) {
        await tisch.locator('[data-werkzeug="attribut"]').click();
        await page.keyboard.type(attribut);
      }
    }

    await entitaet('Ermittler', [['ErmittlerNr', true], ['Name'], ['Dienstgrad']]);
    await entitaet('Lehrgang', [['LehrgangNr', true], ['Thema'], ['Beginn']]);
    await verbinde('e1', 'e2', 'besucht', ['n', 'm'], { attribut: 'Note' });
    await verbinde('e1', 'e2', 'leitet', ['1', 'n']);
    // erst prüfen, obwohl Raum und die Mentor-Beziehung noch fehlen → Kriterienliste mit ✘
    await pruefen(page, 'falsch');
    const ergebnis = tisch.locator('.bp-ergebnis');
    await ergebnis.waitFor();
    assert.ok((await ergebnis.locator('li.falsch').count()) >= 1, 'Kriterium ✘');
    assert.match(await ergebnis.locator('.bp-zaehler').textContent(), /^\d+ von \d+$/);
    const text = await ergebnis.textContent();
    for (const muster of ['findetStattIn', 'Mentor', 'Neuling', 'Saal']) assert.doesNotMatch(text, new RegExp(muster), `keine Musterdaten: ${muster}`);

    await entitaet('Raum', [['RaumNr', true], ['Bezeichnung']]);
    await verbinde('e1', 'e1', 'betreut', ['1', 'n'], { rollen: ['Mentor', 'Neuling'] });
    await verbinde('e2', 'e3', 'findetStattIn', ['n', '1']);
    assert.equal(await flaeche.locator('.chen-entitaet').count(), 3);
    assert.equal(await flaeche.locator('.chen-beziehung').count(), 4);
    assert.equal(await flaeche.locator('.chen-rolle').count(), 2);
    await pruefen(page, 'richtig');
    await ergebnis.locator('.stempel.geloest').waitFor();
    assert.equal(await ergebnis.locator('li.falsch').count(), 0);
    await page.waitForSelector('#aufgabe-karte .bp-loesung:not([hidden]) .chen-svg');
    await foto(page, 'a5_bauplan_zeichnen');
    assert.deepEqual(meldungen, []);
  } finally {
    await context.close();
  }
});

test('Bauplan-Tisch A5-E2-07 im Listenmodus nur per Tastatur (Mika, iPad hoch)', { timeout: 180000 }, async () => {
  const { context, page, meldungen } = await neueSeite(MIKA, { width: 768, height: 1024 });
  try {
    await oeffneAufgabe(page, 'A5-E2', 'A5-E2-07');
    const tisch = page.locator('#aufgabe-karte .bauplan');
    await tisch.waitFor();
    await tisch.locator('[data-ansicht="liste"]').focus();
    await page.keyboard.press('Enter');
    assert.equal(await tisch.locator('[data-ansicht="liste"]').getAttribute('aria-pressed'), 'true');
    const liste = tisch.locator('.bp-liste');
    const enter = async (loc) => {
      await loc.focus();
      await page.keyboard.press('Enter');
    };
    /** Auswahlliste per Tastatur: Home, dann n-mal Pfeil nach unten. */
    const waehle = async (loc, index) => {
      await loc.focus();
      await page.keyboard.press('Home');
      for (let i = 0; i < index; i++) await page.keyboard.press('ArrowDown');
    };
    const KARD = { 1: 1, n: 2, m: 3 };

    async function entitaet(nr, name, attribute) {
      await enter(liste.locator('[data-aktion="entitaet"]'));
      await page.keyboard.type(name);
      const karte = liste.locator('.bp-karte-entitaet').nth(nr);
      for (const [i, [a, schluessel]] of attribute.entries()) {
        await enter(karte.locator('[data-aktion="attribut"]'));
        await page.keyboard.type(a);
        if (schluessel) {
          await karte.locator('.bp-schluessel').nth(i).focus();
          await page.keyboard.press('Space');
        }
      }
    }
    async function beziehung(nr, name, enden, attribut = null) {
      await enter(liste.locator('[data-aktion="beziehung"]'));
      await page.keyboard.type(name);
      const karte = liste.locator('.bp-karte-beziehung').nth(nr);
      for (let i = 0; i < enden.length; i++) await enter(karte.locator('[data-aktion="ende"]'));
      for (const [i, [ziel, kard, rolle]] of enden.entries()) {
        await waehle(karte.locator('.bp-ende-ziel').nth(i), ziel);
        await waehle(karte.locator('.bp-ende-kard').nth(i), KARD[kard]);
        if (rolle) {
          await karte.locator('.bp-ende-rolle').nth(i).focus();
          await page.keyboard.type(rolle);
        }
      }
      if (attribut) {
        await enter(karte.locator('[data-aktion="attribut"]'));
        await page.keyboard.type(attribut);
      }
    }

    await entitaet(0, 'Ermittler', [['ErmittlerNr', true], ['Name'], ['Dienstgrad']]);
    await entitaet(1, 'Lehrgang', [['LehrgangNr', true], ['Thema'], ['Beginn']]);
    await entitaet(2, 'Raum', [['RaumNr', true], ['Bezeichnung']]);
    await beziehung(0, 'besucht', [[1, 'n'], [2, 'm']], 'Note');
    await beziehung(1, 'leitet', [[1, '1'], [2, 'n']]);
    await beziehung(2, 'betreut', [[1, '1', 'Mentor'], [1, 'n', 'Neuling']]);
    await beziehung(3, 'findetStattIn', [[2, 'n'], [3, '1']]);
    assert.equal(await liste.locator('.bp-karte-entitaet').count(), 3);
    assert.equal(await liste.locator('.bp-karte-beziehung').count(), 4);
    assert.match(await liste.locator('.bp-karte-beziehung').nth(2).locator('.bp-karte-kopf').textContent(), /rekursiv/);
    await pruefenTastatur(page, 'richtig');
    await tisch.locator('.bp-ergebnis .stempel.geloest').waitFor();
    await foto(page, 'a5_bauplan_liste');
    assert.deepEqual(meldungen, []);
  } finally {
    await context.close();
  }
});

/* ================= Akte 5: Schema-Werkbank ================= */

test('Schema-Werkbank A5-E3-04: n:m und rekursiv überführen – erst Rückmeldung je Relation, dann richtig', { timeout: 180000 }, async () => {
  const { context, page, meldungen } = await neueSeite(LENA);
  try {
    await oeffneAufgabe(page, 'A5-E3', 'A5-E3-04');
    await page.locator('#aufgabe-karte .er-block .chen-svg').waitFor();
    const wb = page.locator('#aufgabe-karte .werkbank');
    await wb.waitFor();
    assert.equal(await wb.locator('.wk-karte').count(), 2, 'Person und Fall liegen schon da');
    const karte = (i) => wb.locator('.wk-karte').nth(i);

    async function relation(name, attribute) {
      await wb.locator('[data-aktion="relation"]').click();
      await page.keyboard.type(name);
      const k = karte((await wb.locator('.wk-karte').count()) - 1);
      for (const [i, [a, pk, fk]] of attribute.entries()) {
        if (i > 0) await k.locator('[data-aktion="attribut"]').click();
        await k.locator('.wk-attr-feld').nth(i).fill(a);
        if (pk) await k.locator('.wk-pk').nth(i).click();
        if (fk) {
          await k.locator('.wk-fk').nth(i).click();
          await k.locator(`select.wk-ziel[data-attribut="${i}"]`).selectOption(fk);
        }
      }
      return k;
    }

    // verdaechtig ohne Fremdschlüssel → Rückmeldung
    const verd = await relation('verdaechtig', [['PersonNr', true], ['FallNr', true], ['Grad']]);
    await pruefen(page, 'falsch');
    await page.waitForSelector('#aufgabe-karte .wk-karte.falsch');
    assert.ok((await wb.locator('.wk-karte.ok').count()) >= 2, 'Person und Fall ✔');
    assert.match(await verd.locator('.wk-rueckmeldung').textContent(), /verdaechtig/);
    assert.doesNotMatch(await wb.textContent(), /BekannterNr/, 'keine Musterdaten in der Rückmeldung');
    // Fremdschlüssel nachtragen (Tastatur) und kennt anlegen
    await verd.locator('.wk-fk').nth(0).focus();
    await page.keyboard.press('Enter');
    await verd.locator('select.wk-ziel[data-attribut="0"]').selectOption('Person');
    await verd.locator('.wk-fk').nth(1).focus();
    await page.keyboard.press('Enter');
    await verd.locator('select.wk-ziel[data-attribut="1"]').selectOption('Fall');
    await relation('kennt', [['PersonNr', true, 'Person'], ['BekannterNr', true, 'Person'], ['Seit']]);
    await page.waitForFunction(() => document.querySelectorAll('#aufgabe-karte .wk-faden').length >= 4);
    const vorschau = (await wb.locator('.wk-vorschau').textContent()).replace(/\s+/g, ' ');
    assert.match(vorschau, /verdaechtig\(↑PersonNr, ↑FallNr, Grad\)/);
    assert.match(vorschau, /kennt\(↑PersonNr, ↑BekannterNr, Seit\)/);
    await pruefen(page, 'richtig');
    await wb.locator('.wk-ergebnis .stempel.geloest').waitFor();
    await page.waitForSelector('#aufgabe-karte .wk-loesung:not([hidden])');
    await foto(page, 'a5_werkbank');
    assert.deepEqual(meldungen, []);
  } finally {
    await context.close();
  }
});

/* ================= Verhör 5 ================= */

test('Verhör 5: starten, er- und schema-Aufgaben beantworten – keine Rückmeldung', { timeout: 180000 }, async () => {
  const { context, page, meldungen } = await neueSeite(LENA);
  try {
    await page.goto(server.url + '/verhoer/5');
    await page.waitForSelector('#k-verhoer-start');
    await page.click('#k-verhoer-start');
    await page.waitForSelector('html[data-seite="verhoer"]');
    const kacheln = page.locator('#verhoer-kacheln .kachel');
    const anzahl = await kacheln.count();
    assert.equal(anzahl, AKTE5.boss.anzahl);
    const karte = page.locator('#verhoer-aufgabe');
    const zeige = async (i) => {
      await kacheln.nth(i).click();
      await page.waitForFunction((n) => /Aufgabe (\d+) von/.exec(document.getElementById('verhoer-zaehler').textContent)?.[1] === String(n), i + 1);
      await page.waitForTimeout(200);
    };
    // je Art (er, schema) die erste gezogene Aufgabe beantworten
    const arten = new Map();
    for (let i = 0; i < anzahl; i++) {
      await zeige(i);
      if (!arten.has('er') && (await karte.locator('.bauplan').count())) arten.set('er', i);
      else if (!arten.has('schema') && (await karte.locator('.werkbank').count())) arten.set('schema', i);
    }
    assert.ok(arten.size >= 1, 'Verhör 5 enthält eine er- oder schema-Aufgabe (Stufe 3 besteht nur daraus)');
    let beantwortet = 0;
    for (const [art, i] of arten) {
      await zeige(i);
      // Antwort gespeichert – die Server-Antwort enthält keine Rückmeldung
      const antwort = page.waitForResponse((r) => r.url().includes('/verhoere/5/antwort') && r.request().method() === 'POST');
      if (art === 'er') {
        const tisch = karte.locator('.bauplan');
        await tisch.locator('[data-ansicht="liste"]').click();
        await tisch.locator('.bp-liste [data-aktion="entitaet"]').click();
        await page.keyboard.type('Wettkampf');
      } else {
        const wb = karte.locator('.werkbank');
        await wb.locator('[data-aktion="relation"]').click();
        await page.keyboard.type('Wettkampf');
        await wb.locator('.wk-karte').last().locator('.wk-attr-feld').first().fill('WettkampfNr');
      }
      await page.click('#k-speichern');
      const r = await antwort;
      const body = await r.json();
      assert.equal(r.status(), 200, `${art}: ${JSON.stringify(body)}`);
      assert.doesNotMatch(JSON.stringify(body), /kriterien|rueckmeldung|loesung|muster|geloest/i);
      await page.waitForSelector('#toast.sichtbar');
      assert.match(await page.locator('#toast').textContent(), /Antwort gespeichert\./);
      assert.equal(await karte.locator('.bp-ergebnis:visible, .wk-ergebnis:visible, .feedback, .stempel, .bp-loesung:visible, .wk-loesung:visible').count(), 0, 'keine Rückmeldung im Verhör');
      beantwortet++;
      await page.waitForFunction((n) => document.querySelectorAll('#verhoer-kacheln .kachel.beantwortet').length === n, beantwortet);
    }
    assert.deepEqual(meldungen, []);
  } finally {
    await context.close();
  }
});

/* ================= gA-Kurs ================= */

test('gA-Kurs: Akte 5 fehlt (Stadtplan, Akte-Seite, API), A4-E2-06…08 und A4-E2-CC fehlen', { timeout: 120000 }, async () => {
  const { context, page, meldungen } = await neueSeite(IDA);
  try {
    await page.goto(server.url + '/');
    await page.waitForSelector('html[data-seite="bereit"]');
    assert.equal(await page.locator('.plan-svg .ort[data-akte="4"]').count(), 1, 'Akte 4 da');
    const labels = await page.locator('.plan-svg .ort').evaluateAll((os) => os.map((o) => o.getAttribute('aria-label')));
    assert.ok(labels.every((l) => !/Akte 5|Bauplan/.test(l)), `Stadtplan ohne Akte 5: ${labels.join(' | ')}`);
    assert.doesNotMatch(await page.locator('#seite').textContent(), /Der Bauplan/);
    // Akte-Seite
    await page.goto(server.url + '/akte/5');
    await page.waitForFunction(() => /Kursniveau/.test(document.getElementById('seite').textContent));
    assert.equal(await page.locator('.ermittlung-karte').count(), 0);
    // API
    const stand = await apiJson(page, '/api/kurse/k%3A18/stand');
    assert.equal(stand.status, 200);
    assert.equal(stand.json.kurs.niveau, 'gA');
    assert.ok(!stand.json.akten.some((a) => a.nr === 5), 'Stand ohne Akte 5');
    for (const pfad of ['/ermittlungen/A5-E1', '/ermittlungen/A5-E3', '/aufgaben/A5-E2-07', '/aufgaben/A5-E3-04', '/aufgaben/A4-E2-06', '/aufgaben/A4-E2-07', '/aufgaben/A4-E2-08', '/aufgaben/A4-E2-CC']) {
      const r = await apiJson(page, '/api/kurse/k%3A18' + pfad);
      assert.equal(r.status, 404, pfad);
    }
    const a4 = stand.json.akten.find((a) => a.nr === 4);
    const e2 = a4.ermittlungen.find((e) => e.id === 'A4-E2');
    assert.equal(e2.anzahl, 5, 'A4-E2 im gA-Kurs: fünf Aufgaben');
    const erm = await apiJson(page, '/api/kurse/k%3A18/ermittlungen/A4-E2');
    assert.equal(erm.status, 200);
    const ids = JSON.stringify(erm.json);
    for (const id of ['A4-E2-06', 'A4-E2-07', 'A4-E2-08', 'A4-E2-CC']) assert.ok(!ids.includes(id), `${id} fehlt`);
    // Ermittlungsseite: fünf Kacheln
    await page.goto(server.url + '/ermittlung/A4-E2');
    await page.waitForSelector('#aufgabe-karte .reiter:text("A4-E2-01")');
    assert.equal(await page.locator('#aufgaben-kacheln .kachel').count(), 5);
    assert.doesNotMatch(await page.locator('#aufgaben-kacheln').textContent(), /A4-E2-0[678]|Cold Case/);
    // Verhör 5 gibt es im gA-Kurs nicht
    const v = await apiJson(page, '/api/kurse/k%3A18/verhoere/5');
    assert.equal(v.status, 404);
    assert.deepEqual(meldungen, []);
  } finally {
    await context.close();
  }
});

/* ================= Werkzeugseiten ================= */

test('Werkzeugseiten Bauplan-Tisch und Schema-Werkbank mit Entwurf: alle Größen ohne Überlauf', { timeout: 120000 }, async () => {
  const { context, page, meldungen } = await neueSeite(LENA);
  try {
    const intro = AKTE5.levels[0].intro.find((b) => b.t === 'er');
    await page.goto(server.url + '/');
    await page.evaluate((e) => {
      localStorage.setItem('dd-bauplan-ansicht', 'zeichnen');
      localStorage.setItem('dd-werkzeug:bauplan', JSON.stringify(e));
      localStorage.setItem(
        'dd-werkzeug:werkbank',
        JSON.stringify({
          relationen: [
            { name: 'Ermittler', attribute: [{ name: 'ErmittlerNr', pk: true, fk: '' }, { name: 'Name', pk: false, fk: '' }, { name: 'Dienstgrad', pk: false, fk: '' }] },
            { name: 'Fall', attribute: [{ name: 'FallNr', pk: true, fk: '' }, { name: 'Titel', pk: false, fk: '' }, { name: 'LeiterNr', pk: false, fk: 'Ermittler' }] }
          ]
        })
      );
    }, { graph: intro.graph, layout: intro.layout });
    await page.goto(server.url + '/werkzeug/bauplan');
    await page.waitForSelector('html[data-seite="bereit"]');
    assert.equal(await page.locator('.bp-svg .chen-entitaet').count(), 2);
    await foto(page, 'werkzeug_bauplan');
    await page.goto(server.url + '/werkzeug/werkbank');
    await page.waitForSelector('html[data-seite="bereit"]');
    assert.equal(await page.locator('.wk-karte').count(), 2);
    await page.waitForSelector('.wk-faden');
    await foto(page, 'werkzeug_werkbank');
    assert.deepEqual(meldungen, []);
  } finally {
    await context.close();
  }
});
