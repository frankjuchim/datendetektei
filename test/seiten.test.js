'use strict';
// Seitenhülle und Design-Grundlagen (Plan Task 9, DESIGN.md §2, §10): öffentliche Seiten, /lehrkraft-Rechte,
// CSP-Regeln für HTML/JS/CSS, lokale Fonts, ?v=-Gleichstand, /api/akten.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const request = require('supertest');
const { testApp, ssoToken } = require('./helpers');
const { AKTEN } = require('../src/domain');
const { version: VERSION } = require('../package.json');

const WURZEL = path.join(__dirname, '..');
const PUBLIC = path.join(WURZEL, 'public');
const STATIC = path.join(PUBLIC, 'static');

const htmlDateien = () => fs.readdirSync(PUBLIC).filter((d) => d.endsWith('.html'));
function dateienRekursiv(ordner, endung) {
  if (!fs.existsSync(ordner)) return [];
  return fs.readdirSync(ordner, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(ordner, e.name);
    if (e.isDirectory()) return dateienRekursiv(p, endung);
    return p.endsWith(endung) ? [p] : [];
  });
}

/** Anmeldung über /sso/start → /sso/ende; liefert das Sitzungs-Cookie „dd_s=…“. */
async function anmelden(t, ueberschreiben = {}) {
  const start = await request(t.app).get('/sso/start');
  const state = new URL(start.headers.location).searchParams.get('state');
  const stateCookie = start.headers['set-cookie'].find((c) => c.startsWith('dd_sso_state=')).split(';')[0];
  const token = ssoToken(t.schluessel, t.konfig, ueberschreiben);
  const ende = await request(t.app)
    .get('/sso/ende?' + new URLSearchParams({ token, state, ziel: '/' }).toString())
    .set('Cookie', stateCookie);
  assert.equal(ende.status, 302);
  return ende.headers['set-cookie'].find((c) => c.startsWith('dd_s=')).split(';')[0];
}

const LEHRKRAFT = { sub: 'l:7', rolle: 'lehrkraft', name: 'Frau Beispiel', kurse: [{ id: 'k:17', name: 'Inf-LK 12', rolle: 'lehrkraft' }] };
const ADMIN = { sub: 'a:1', rolle: 'superadmin', name: 'Admin', kurse: [] };

/* ---------- Seiten und Rechte ---------- */

for (const pfad of ['/', '/gast', '/themen', '/datenschutz']) {
  test(`${pfad} liefert 200 text/html ohne Anmeldung`, async () => {
    const { app } = testApp();
    const res = await request(app).get(pfad);
    assert.equal(res.status, 200);
    assert.match(res.headers['content-type'], /text\/html/);
    assert.match(res.text, /<html lang="de">/);
    assert.match(res.text, /<meta name="viewport" content="width=device-width, initial-scale=1">/);
    assert.match(res.text, /<link rel="icon" href="\/static\/favicon\.svg" type="image\/svg\+xml">/);
    assert.match(res.text, /\/static\/js\/kern\/kopfzeile\.js\?v=/);
    assert.match(res.text, /\/static\/css\/tokens\.css\?v=/);
  });
}

test('Startseite: Anmelden über InfoLabs und Gastmodus', async () => {
  const { app } = testApp();
  const res = await request(app).get('/');
  assert.match(res.text, /href="\/sso\/start"[^>]*>[^<]*Anmelden über InfoLabs/);
  assert.match(res.text, /href="\/gast"/);
  assert.match(res.text, /Die Akten öffnen bald/);
});

test('Gast zeigt den Probefall Eisdiele (Inhalte per gast.js aus /api/gast/probefall)', async () => {
  const { app } = testApp();
  const res = await request(app).get('/gast');
  assert.match(res.text, /Probefall „Eisdiele Weserstedt“/);
  assert.match(res.text, /\/static\/js\/gast\.js\?v=/);
});

test('Themen: Seite aus dem Seed (themen.js), Niveau-Übersicht #niveaus über /api/themen (Akte 5 nur eA)', async () => {
  const { app } = testApp();
  const res = await request(app).get('/themen');
  assert.match(res.text, /id="niveaus"/);
  assert.match(res.text, /Was ist für welches Niveau\?/);
  assert.match(res.text, /\/static\/js\/themen\.js\?v=/);
  const api = await request(app).get('/api/themen');
  for (const a of AKTEN) {
    assert.ok(api.body.akten.some((x) => x.nr === a.nr && x.titel === a.titel), `Akte ${a.nr} „${a.titel}“ fehlt`);
    const zeile = api.body.niveaus.find((n) => n.akte === a.nr);
    assert.ok(zeile, `Niveau-Zeile für Akte ${a.nr} fehlt`);
    assert.equal(zeile.eA, a.niveaus.includes('eA'));
    assert.equal(zeile.gA, a.niveaus.includes('gA'));
  }
  const ds = api.body.niveaus.map((n) => n.ds).join(' ');
  assert.match(ds, /DS 9/);
  assert.match(ds, /DS 13/);
});

test('Datenschutz verweist auf das Portal und enthält Platzhalter der Schule', async () => {
  const { app } = testApp();
  const res = await request(app).get('/datenschutz');
  assert.match(res.text, /\[Angaben der Schule\]/);
  assert.match(res.text, /data-portal-pfad="\/datenschutz"/);
  assert.match(res.text, /Freitexte/);
});

test('/lehrkraft ohne Sitzung leitet auf /sso/start?ziel=%2Flehrkraft (302)', async () => {
  const { app } = testApp();
  const res = await request(app).get('/lehrkraft');
  assert.equal(res.status, 302);
  assert.equal(res.headers.location, '/sso/start?ziel=%2Flehrkraft');
});

test('/lehrkraft als Schüler liefert die 403-Seite', async () => {
  const t = testApp();
  const cookie = await anmelden(t);
  const res = await request(t.app).get('/lehrkraft').set('Cookie', cookie);
  assert.equal(res.status, 403);
  assert.match(res.headers['content-type'], /text\/html/);
  assert.match(res.text, /Kein Zugriff/);
  assert.match(res.text, /\/static\/css\/basis\.css/);
});

test('/lehrkraft als Lehrkraft und als Superadmin liefert die Seite', async () => {
  for (const nutzer of [LEHRKRAFT, ADMIN]) {
    const t = testApp();
    const cookie = await anmelden(t, nutzer);
    const res = await request(t.app).get('/lehrkraft').set('Cookie', cookie);
    assert.equal(res.status, 200, nutzer.rolle);
    assert.match(res.text, /Auswertung folgt in Phase 6/);
    assert.match(res.text, /\/static\/js\/lehrkraft\.js\?v=/);
  }
});

test('HTML-Dateien sind nicht direkt unter ihrem Dateinamen erreichbar', async () => {
  const { app } = testApp();
  for (const datei of ['lehrkraft.html', 'index.html', '403.html']) {
    const res = await request(app).get('/' + datei);
    assert.equal(res.status, 404, datei);
  }
});

test('Pfade aus dem Manifest liefern < 400, Favicon 200', async () => {
  const { app } = testApp();
  for (const pfad of ['/', '/gast', '/themen', '/lehrkraft', '/datenschutz', '/healthz']) {
    const res = await request(app).get(pfad);
    assert.ok(res.status < 400, `${pfad} → ${res.status}`);
  }
  const icon = await request(app).get('/static/favicon.svg');
  assert.equal(icon.status, 200);
  assert.match(icon.headers['content-type'], /image\/svg\+xml/);
});

test('Fehlerseiten 404, 403 und SSO-Fehler im gleichen Design', () => {
  for (const datei of ['404.html', '403.html', 'sso-fehler.html']) {
    const html = fs.readFileSync(path.join(PUBLIC, datei), 'utf8');
    assert.match(html, /\/static\/css\/basis\.css\?v=/, datei);
    assert.match(html, /\/static\/js\/kern\/kopfzeile\.js\?v=/, datei);
    assert.match(html, /<html lang="de">/, datei);
  }
});

/* ---------- Ermittlungskonsole „Freie Ermittlung“ (Phase 2 Task 12) ---------- */

const KONSOLEN_DBS = ['fundbuero', 'stadtrad', 'stadtfest', 'tus', 'detektei', 'datenspuren', 'eisdiele'];

test('/konsole/eisdiele ohne Anmeldung: 200 mit Konsole, Modulen und SQL-Skripten', async () => {
  const { app } = testApp();
  const res = await request(app).get('/konsole/eisdiele');
  assert.equal(res.status, 200);
  assert.match(res.headers['content-type'], /text\/html/);
  assert.match(res.text, /<script type="module" src="\/static\/js\/konsole\/konsole\.js\?v=/);
  assert.match(res.text, /\/static\/css\/konsole\.css\?v=/);
  for (const datei of ['parser', 'regeln', 'fehlertexte']) {
    assert.match(res.text, new RegExp(`<script src="/static/js/sql/${datei}\\.js\\?v=[^"]+" defer></script>`), datei);
  }
  assert.match(res.text, /id="sql-eingabe"/);
  assert.match(res.text, /id="schema-browser"/);
  assert.match(res.text, /id="ergebnis"[^>]*aria-live="polite"/);
  assert.match(res.text, /Noch nichts ausgeführt\. Schreib deine Abfrage und tippe auf „Ausführen“\./);
});

test('Konsole: Prüfen, Zeitlupe, Tipp und Lösung gibt es hier noch nicht', async () => {
  const { app } = testApp();
  const res = await request(app).get('/konsole/eisdiele');
  assert.match(res.text, /id="k-ausfuehren"/);
  assert.match(res.text, /id="k-abbrechen"[^>]*hidden/);
  const knoepfe = [...res.text.matchAll(/<button\b[\s\S]*?<\/button>/g)].map((m) => m[0].replace(/<[^>]+>/g, ''));
  for (const wort of ['Prüfen', 'Zeitlupe', 'Tipp', 'Lösung']) {
    assert.ok(!knoepfe.some((k) => k.includes(wort)), wort);
  }
  assert.doesNotMatch(res.text, /k-pruefen|k-tipp|k-loesung|k-zeitlupe/);
});

for (const name of KONSOLEN_DBS.filter((n) => n !== 'eisdiele')) {
  test(`/konsole/${name} ohne Anmeldung: 302 auf /sso/start?ziel=…`, async () => {
    const { app } = testApp();
    const res = await request(app).get('/konsole/' + name);
    assert.equal(res.status, 302);
    assert.equal(res.headers.location, '/sso/start?ziel=' + encodeURIComponent('/konsole/' + name));
  });
}

test('/konsole/<db> angemeldet: alle sieben DBs für Schüler, Lehrkraft und Admin', async () => {
  for (const nutzer of [{}, LEHRKRAFT, ADMIN]) {
    const t = testApp();
    const cookie = await anmelden(t, nutzer);
    for (const name of KONSOLEN_DBS) {
      const res = await request(t.app).get('/konsole/' + name).set('Cookie', cookie);
      assert.equal(res.status, 200, `${nutzer.rolle || 'schueler'} ${name}`);
      assert.match(res.text, /id="sql-eingabe"/);
    }
  }
});

test('/konsole mit unbekannter DB: 404 (auch angemeldet)', async () => {
  const t = testApp();
  const cookie = await anmelden(t);
  for (const pfad of ['/konsole/gibtsnicht', '/konsole/Eisdiele', '/konsole/verhoer', '/konsole/', '/konsole',
    '/konsole/eisdiele/x', '/konsole.html']) {
    const res = await request(t.app).get(pfad).set('Cookie', cookie);
    assert.equal(res.status, 404, pfad);
  }
});

test('Freie Ermittlung: /themen verlinkt alle sieben Konsolen, die Eisdiele ohne Anmeldung', async () => {
  const { app } = testApp();
  const res = await request(app).get('/themen');
  assert.match(res.text, /id="freie-ermittlung"/);
  assert.match(res.text, /Freie Ermittlung/);
  for (const name of KONSOLEN_DBS) assert.match(res.text, new RegExp(`href="/konsole/${name}"`), name);
  assert.match(res.text, /href="\/konsole\/eisdiele"[\s\S]*?ohne Anmeldung/);
});

test('Freie Ermittlung: Startseite verlinkt die Konsolen im angemeldeten Bereich', async () => {
  const { app } = testApp();
  const res = await request(app).get('/');
  const i = res.text.indexOf('id="start-angemeldet"');
  assert.ok(i > 0);
  const angemeldet = res.text.slice(i, res.text.indexOf('</section>', i));
  assert.match(angemeldet, /Freie Ermittlung/);
  for (const name of KONSOLEN_DBS) assert.match(angemeldet, new RegExp(`href="/konsole/${name}"`), name);
});

test('Konsolen-Module sind ES-Module ohne Inline-Styles', () => {
  for (const datei of ['editor', 'schema', 'ergebnis', 'konsole']) {
    const js = fs.readFileSync(path.join(STATIC, 'js', 'konsole', datei + '.js'), 'utf8');
    assert.match(js, /^export /m, datei);
    assert.doesNotMatch(js, /setAttribute\(\s*['"]style['"]/, datei);
  }
});

/* ---------- Schülerseiten (Phase 3 Task 9) ---------- */

const SCHUELER_SEITEN = [
  { pfad: '/akte/1', skript: 'akte' },
  { pfad: '/akte/7', skript: 'akte' },
  { pfad: '/ermittlung/A1-E1', skript: 'ermittlung' },
  { pfad: '/ermittlung/A12-E3', skript: 'ermittlung' },
  { pfad: '/verhoer/1', skript: 'verhoer' },
  { pfad: '/warmup', skript: 'warmup' },
  { pfad: '/training', skript: 'training' }
];

for (const { pfad } of SCHUELER_SEITEN) {
  test(`${pfad} ohne Sitzung: 302 auf /sso/start?ziel=…`, async () => {
    const { app } = testApp();
    const res = await request(app).get(pfad);
    assert.equal(res.status, 302);
    assert.equal(res.headers.location, '/sso/start?ziel=' + encodeURIComponent(pfad));
  });
}

test('Schülerseiten: 200 für Schüler, Lehrkraft und Admin, mit Seitenmodul und gemeinsamen Bausteinen', async () => {
  for (const nutzer of [{}, LEHRKRAFT, ADMIN]) {
    const t = testApp();
    const cookie = await anmelden(t, nutzer);
    for (const { pfad, skript } of SCHUELER_SEITEN) {
      const res = await request(t.app).get(pfad).set('Cookie', cookie);
      assert.equal(res.status, 200, `${nutzer.rolle || 'schueler'} ${pfad}`);
      assert.match(res.headers['content-type'], /text\/html/);
      assert.equal(res.headers['cache-control'], 'no-cache');
      assert.match(res.text, new RegExp(`<script type="module" src="/static/js/lernen/${skript}\\.js\\?v=`), pfad);
      assert.match(res.text, /\/static\/css\/lernen\.css\?v=/, pfad);
      assert.match(res.text, /\/static\/js\/kern\/kopfzeile\.js\?v=/, pfad);
      assert.match(res.text, /id="seite"/, pfad);
    }
  }
});

test('Schülerseiten mit ungültigem Parameter: 404 (auch angemeldet)', async () => {
  const t = testApp();
  const cookie = await anmelden(t);
  for (const pfad of ['/akte/0', '/akte/8', '/akte/x', '/akte/01', '/akte/1/2', '/ermittlung/A1', '/ermittlung/a1-e1',
    '/ermittlung/A1-E1-01', '/verhoer/0', '/verhoer/abc', '/akte.html', '/ermittlung.html', '/warmup.html']) {
    const res = await request(t.app).get(pfad).set('Cookie', cookie);
    assert.equal(res.status, 404, pfad);
  }
});

test('Startseite: Stadtplan-Bereich für Angemeldete, Lernmodul und SQL-Hervorhebung', async () => {
  const { app } = testApp();
  const res = await request(app).get('/');
  assert.match(res.text, /id="stadtplan-bereich"[^>]*hidden/);
  assert.match(res.text, /<script type="module" src="\/static\/js\/lernen\/stadtplan\.js\?v=/);
  assert.match(res.text, /\/static\/css\/lernen\.css\?v=/);
});

test('Ermittlung und Verhör laden Parser, Regeln, Fehlertexte und die Konsolen-Styles', async () => {
  const t = testApp();
  const cookie = await anmelden(t);
  for (const pfad of ['/ermittlung/A1-E1', '/verhoer/1', '/warmup', '/training']) {
    const res = await request(t.app).get(pfad).set('Cookie', cookie);
    for (const datei of ['parser', 'regeln', 'fehlertexte']) {
      assert.match(res.text, new RegExp(`<script src="/static/js/sql/${datei}\\.js\\?v=[^"]+" defer></script>`), `${pfad} ${datei}`);
    }
    assert.match(res.text, /\/static\/css\/konsole\.css\?v=/, pfad);
  }
});

test('Lern-Module: ES-Module, nur Textknoten, Mischen von choice/order/match', () => {
  const ordner = path.join(STATIC, 'js', 'lernen');
  // Module laden ihre Bausteine mit derselben ?v=-Version wie die Seite (import(… + V), V aus import.meta.url)
  for (const datei of ['stadtplan', 'akte', 'ermittlung', 'verhoer', 'warmup', 'training', 'konsole_lern']) {
    const js = fs.readFileSync(path.join(ordner, datei + '.js'), 'utf8');
    assert.match(js, /new URL\(import\.meta\.url\)\.search/, datei);
    assert.match(js, /import\('\.\.\/kern\/render\.js' \+ V\)/, datei);
    assert.doesNotMatch(js, /^import .* from /m, `${datei}: statischer Import ohne Version`);
  }
  for (const datei of ['api', 'render', 'interaktionen']) {
    const js = fs.readFileSync(path.join(STATIC, 'js', 'kern', datei + '.js'), 'utf8');
    assert.match(js, /^export /m, datei);
    assert.doesNotMatch(js, /setAttribute\(\s*['"]style['"]/, datei);
  }
  const ia = fs.readFileSync(path.join(STATIC, 'js', 'kern', 'interaktionen.js'), 'utf8');
  for (const art of ['choice', 'order', 'match']) assert.match(ia, new RegExp(`mische\\([^)]*\\)[^\\n]*// ${art}`), art);
});

/* ---------- API ---------- */

test('GET /api/akten ist öffentlich und liefert die Akten', async () => {
  const { app } = testApp();
  const res = await request(app).get('/api/akten');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { akten: AKTEN.map((a) => ({ nr: a.nr, titel: a.titel, niveaus: [...a.niveaus] })) });
});

/* ---------- Statische Regeln (CSP, Textknoten, Tokens) ---------- */

test('HTML-Seiten enthalten kein Inline-Skript, kein style-Attribut, keine Handler, keine externen Quellen', () => {
  const dateien = htmlDateien();
  assert.ok(dateien.length >= 8, 'zu wenige Seiten');
  for (const datei of dateien) {
    const html = fs.readFileSync(path.join(PUBLIC, datei), 'utf8');
    for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
      assert.match(m[1], /\bsrc="\/static\//, `${datei}: Skript ohne lokales src`);
      assert.equal(m[2].trim(), '', `${datei}: Inline-Skript`);
    }
    assert.doesNotMatch(html, /<style\b/i, `${datei}: <style>`);
    assert.doesNotMatch(html, /\sstyle\s*=/i, `${datei}: style-Attribut`);
    assert.doesNotMatch(html, /\son[a-z]+\s*=/i, `${datei}: on…-Handler`);
    assert.doesNotMatch(html, /javascript:/i, `${datei}: javascript:-URL`);
    assert.doesNotMatch(html, /(src|href)="(https?:)?\/\/[^"]*\.(js|css|woff2?)/i, `${datei}: externe Ressource`);
    assert.doesNotMatch(html, /fonts\.googleapis|fonts\.gstatic/i, `${datei}: Google Fonts`);
  }
});

test('Browser-Skripte schreiben nie HTML aus Zeichenketten (kein innerHTML)', () => {
  const dateien = dateienRekursiv(path.join(STATIC, 'js'), '.js');
  assert.ok(dateien.length >= 4);
  for (const datei of dateien) {
    const js = fs.readFileSync(datei, 'utf8');
    assert.doesNotMatch(js, /innerHTML|outerHTML|insertAdjacentHTML|document\.write|\beval\(|new Function/, datei);
  }
});

test('?v= in allen HTML-Seiten gleich der package.json-Version', () => {
  assert.equal(VERSION, '0.3.0');
  let anzahl = 0;
  for (const datei of htmlDateien()) {
    const html = fs.readFileSync(path.join(PUBLIC, datei), 'utf8');
    for (const m of html.matchAll(/\/static\/[^"?]+\.(?:js|css)(\?v=([^"]*))?"/g)) {
      assert.ok(m[1], `${datei}: ${m[0]} ohne ?v=`);
      assert.equal(m[2], VERSION, `${datei}: ${m[0]}`);
      anzahl++;
    }
  }
  assert.ok(anzahl > 20);
});

test('keine Farbliterale außerhalb von tokens.css', () => {
  const dateien = dateienRekursiv(path.join(STATIC, 'css'), '.css').filter((d) => path.basename(d) !== 'tokens.css');
  assert.ok(dateien.some((d) => d.endsWith('basis.css')));
  for (const datei of dateien) {
    const css = fs.readFileSync(datei, 'utf8');
    assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}\b/, datei);
    assert.doesNotMatch(css, /rgba?\(/, datei);
    assert.doesNotMatch(css, /hsla?\(/, datei);
  }
});

test('tokens.css: alle Tokens aus DESIGN.md, Dunkelmodus doppelt und gleich, color-scheme', () => {
  const css = fs.readFileSync(path.join(STATIC, 'css', 'tokens.css'), 'utf8');
  const pflicht = [
    'tinte', 'papier', 'karte', 'siegelrot', 'messing', 'gruen', 'blau', 'konsole', 'konsole-text',
    'tinte-2', 'tinte-3', 'flaeche', 'flaeche-2', 'rand', 'rand-stark', 'siegelrot-text', 'messing-text',
    'messing-grafik', 'auf-akzent', 'rot-flaeche', 'gruen-flaeche', 'blau-flaeche', 'messing-flaeche', 'kork',
    'kork-punkt', 'wasser', 'wasser-rand', 'gruenanlage', 'strasse', 'block', 'nebel', 'fokus', 'schatten-farbe',
    'schatten-farbe-stark', 'konsole-flaeche', 'konsole-rand', 'konsole-leise', 'sql-schluessel', 'sql-text',
    'sql-zahl', 'sql-kommentar', 'sql-aggregat', 'gruppe-1', 'gruppe-2', 'gruppe-3', 'heat-1', 'heat-2', 'heat-3',
    'heat-4', 'heat-5', 'heat-text-hell', 'heat-text-dunkel', 'a-1', 'a-2', 'a-3', 'a-4', 'a-5', 'a-6', 'a-7', 'a-8',
    'radius-klein', 'radius', 'radius-gross', 'schatten-1', 'schatten-2', 'schrift-text', 'schrift-titel',
    'schrift-mono', 't-xs', 't-s', 't-m', 't-l', 't-xl', 't-xxl', 'dauer', 'kurve'
  ];
  for (const name of pflicht) assert.match(css, new RegExp(`--${name}:`), `--${name} fehlt`);

  const block = (start) => {
    const i = css.indexOf(start);
    assert.ok(i >= 0, `${start} fehlt`);
    const auf = css.indexOf('{', i);
    const zu = css.indexOf('}', auf);
    return css.slice(auf + 1, zu);
  };
  const deklarationen = (text) =>
    text
      .split(';')
      .map((s) => s.replace(/\/\*[\s\S]*?\*\//g, '').trim().replace(/\s+/g, ' '))
      .filter(Boolean)
      .sort();
  const medien = block(':root:not([data-theme="light"])');
  const attribut = block(':root[data-theme="dark"]');
  assert.match(css, /@media \(prefers-color-scheme: dark\)\s*\{\s*:root:not\(\[data-theme="light"\]\)/);
  assert.deepEqual(deklarationen(medien), deklarationen(attribut));
  assert.ok(deklarationen(attribut).includes('color-scheme: dark'));
  assert.match(block(':root {'), /color-scheme: light/);
});

test('Fonts werden lokal ausgeliefert (woff2, fonts.css, OFL.txt)', async () => {
  const { app } = testApp();
  const res = await request(app).get('/static/fonts/barlow-latin-400-normal.woff2');
  assert.equal(res.status, 200);
  assert.equal(res.headers['content-type'], 'font/woff2');
  const fontsCss = fs.readFileSync(path.join(STATIC, 'fonts', 'fonts.css'), 'utf8');
  const urls = [...fontsCss.matchAll(/url\(\.\/([^)]+)\)/g)].map((m) => m[1]);
  assert.equal(urls.length, 22, '11 Schnitte × latin/latin-ext');
  for (const u of urls) assert.ok(fs.existsSync(path.join(STATIC, 'fonts', u)), u);
  assert.match(fontsCss, /font-display: swap/);
  assert.match(fontsCss, /unicode-range:/);
  assert.match(fs.readFileSync(path.join(STATIC, 'fonts', 'OFL.txt'), 'utf8'), /SIL OPEN FONT LICENSE Version 1\.1/);
});

/* ---------- Spurenbrett (Phase 4 Task 3) ---------- */

test('/werkzeug/spurenbrett?db=eisdiele ohne Anmeldung: 200 mit Modul, Styles und Rechenschicht', async () => {
  const { app } = testApp();
  const res = await request(app).get('/werkzeug/spurenbrett?db=eisdiele');
  assert.equal(res.status, 200);
  assert.match(res.headers['content-type'], /text\/html/);
  assert.equal(res.headers['cache-control'], 'no-cache');
  assert.match(res.text, /<script type="module" src="\/static\/js\/spurenbrett\/spurenbrett\.js\?v=/);
  assert.match(res.text, /\/static\/css\/spurenbrett\.css\?v=/);
  for (const datei of ['parser', 'fehlertexte', 'visual']) {
    assert.match(res.text, new RegExp(`<script src="/static/js/sql/${datei}\\.js\\?v=[^"]+" defer></script>`), datei);
  }
  // Rechenschicht nach Parser und Fehlertexten
  assert.ok(res.text.indexOf('/sql/visual.js') > res.text.indexOf('/sql/fehlertexte.js'));
  for (const id of ['sb-db', 'sb-tabellen', 'sb-bedingung', 'sb-anwenden', 'sb-zaehler', 'sb-brett', 'sb-ergebnis']) {
    assert.match(res.text, new RegExp(`id="${id}"`), id);
  }
  assert.match(res.text, /id="sb-zaehler"[^>]*aria-live="polite"/);
});

test('/werkzeug/spurenbrett ohne Anmeldung (ohne oder mit anderer DB): 302 auf /sso/start?ziel=…', async () => {
  const { app } = testApp();
  for (const pfad of ['/werkzeug/spurenbrett', '/werkzeug/spurenbrett?db=stadtrad', '/werkzeug/spurenbrett?db=tus']) {
    const res = await request(app).get(pfad);
    assert.equal(res.status, 302, pfad);
    assert.equal(res.headers.location, '/sso/start?ziel=' + encodeURIComponent(pfad), pfad);
  }
});

test('/werkzeug/spurenbrett angemeldet: Schüler, Lehrkraft und Admin, alle öffentlichen DBs', async () => {
  for (const nutzer of [{}, LEHRKRAFT, ADMIN]) {
    const t = testApp();
    const cookie = await anmelden(t, nutzer);
    for (const pfad of ['/werkzeug/spurenbrett', ...KONSOLEN_DBS.map((n) => '/werkzeug/spurenbrett?db=' + n)]) {
      const res = await request(t.app).get(pfad).set('Cookie', cookie);
      assert.equal(res.status, 200, `${nutzer.rolle || 'schueler'} ${pfad}`);
      assert.match(res.text, /id="sb-brett"/);
    }
  }
});

test('/werkzeug/spurenbrett mit unbekannter, nicht öffentlicher oder doppelter DB: 404 (auch angemeldet)', async () => {
  const t = testApp();
  const cookie = await anmelden(t);
  for (const pfad of ['/werkzeug/spurenbrett?db=gibtsnicht', '/werkzeug/spurenbrett?db=verhoer%2Fbibliothek',
    '/werkzeug/spurenbrett?db=Eisdiele', '/werkzeug/spurenbrett?db=eisdiele&db=stadtrad', '/werkzeug/spurenbrett/',
    '/werkzeug/spurenbrett/x', '/spurenbrett.html']) {
    for (const mitCookie of [false, true]) {
      const anfrage = request(t.app).get(pfad);
      const res = mitCookie ? await anfrage.set('Cookie', cookie) : await anfrage;
      assert.equal(res.status, 404, `${pfad} ${mitCookie ? 'angemeldet' : 'ohne Anmeldung'}`);
    }
  }
});

test('Spurenbrett-Modul: ES-Modul, nur Textknoten, SVG per createElementNS, Bausteine mit Version', () => {
  const js = fs.readFileSync(path.join(STATIC, 'js', 'spurenbrett', 'spurenbrett.js'), 'utf8');
  assert.match(js, /new URL\(import\.meta\.url\)\.search/);
  assert.doesNotMatch(js, /^import .* from /m);
  assert.doesNotMatch(js, /innerHTML|outerHTML|insertAdjacentHTML|document\.write/);
  assert.doesNotMatch(js, /setAttribute\(\s*['"]style['"]/);
  assert.match(js, /createElementNS|svg\(/);
  assert.match(js, /dd_spurenbrett/);
});
