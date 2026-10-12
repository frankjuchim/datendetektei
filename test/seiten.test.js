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

test('Gast zeigt den Platzhalter „Probefall Eisdiele folgt“', async () => {
  const { app } = testApp();
  const res = await request(app).get('/gast');
  assert.match(res.text, /Probefall Eisdiele folgt/);
});

test('Themen: alle Akten, Niveau-Übersicht (Akte 5 nur eA)', async () => {
  const { app } = testApp();
  const res = await request(app).get('/themen');
  for (const a of AKTEN) assert.ok(res.text.includes(a.titel), `Akte ${a.nr} „${a.titel}“ fehlt`);
  assert.match(res.text, /id="niveaus"/);
  assert.match(res.text, /Was ist für welches Niveau\?/);
  // Tabelle: je Akte eine Zeile mit data-akte und data-niveaus wie in AKTEN
  for (const a of AKTEN) {
    const m = res.text.match(new RegExp(`<tr data-akte="${a.nr}" data-niveaus="([^"]*)"`));
    assert.ok(m, `Niveau-Zeile für Akte ${a.nr} fehlt`);
    assert.equal(m[1], a.niveaus.join(' '));
  }
  assert.match(res.text, /DS 9/);
  assert.match(res.text, /DS 13/);
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
  assert.equal(VERSION, '0.2.0');
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
