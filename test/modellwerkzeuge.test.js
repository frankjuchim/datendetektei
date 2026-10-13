'use strict';
// Werkzeugseiten Bauplan-Tisch und Schema-Werkbank (Plan Phase 5 Task 4, DESIGN.md §5.7/§5.8, §10): öffentlich (ohne
// Prüfung, ohne Lösungsdaten), CSP wie alle Seiten, nur über ihre Route erreichbar; Module als ES-Module mit
// Versions-Import, nur Textknoten (kein innerHTML), keine Inline-Styles; Verlinkung auf /themen; Einbindung als
// Interaktionen er/schema und Blöcke er/mengen in den Lernseiten.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const request = require('supertest');
const { testApp } = require('./helpers');

const PUBLIC = path.join(__dirname, '..', 'public');
const JS = path.join(PUBLIC, 'static', 'js');
const lies = (...teile) => fs.readFileSync(path.join(...teile), 'utf8');

const SEITEN = [
  { pfad: '/werkzeug/bauplan', modul: 'bauplan/seite.js', css: ['bauplan.css'], titel: /<h1>Bauplan-Tisch<\/h1>/ },
  { pfad: '/werkzeug/werkbank', modul: 'werkbank/seite.js', css: ['bauplan.css', 'werkbank.css'], titel: /<h1>Schema-Werkbank<\/h1>/ }
];

for (const s of SEITEN) {
  test(`${s.pfad} ohne Anmeldung: 200, CSP, Modul und Styles`, async () => {
    const { app } = testApp();
    const res = await request(app).get(s.pfad);
    assert.equal(res.status, 200);
    assert.match(res.headers['content-type'], /text\/html/);
    const csp = res.headers['content-security-policy'];
    assert.ok(csp, 'CSP fehlt');
    assert.match(csp, /default-src 'self'/);
    assert.match(csp, /style-src 'self'(;|$)/);
    assert.doesNotMatch(csp, /unsafe-inline/);
    assert.equal(res.headers['x-robots-tag'], 'noindex');
    assert.match(res.text, s.titel);
    assert.match(res.text, new RegExp(`<script type="module" src="/static/js/${s.modul.replace('/', '\\/')}\\?v=`));
    for (const css of s.css) assert.match(res.text, new RegExp(`/static/css/${css}\\?v=`));
    assert.match(res.text, /Hier wird nichts geprüft/);
    // keine Lösungsdaten (die Seiten haben keine Aufgaben)
    assert.doesNotMatch(res.text, /loesung|muster|synonyme/i);
  });

  test(`${s.pfad}: auch angemeldet 200; Nebenpfade und Dateiname → 404`, async () => {
    const t = testApp();
    const { meldeAn } = require('./helpers');
    const cookie = await meldeAn(t, {});
    const res = await request(t.app).get(s.pfad).set('Cookie', cookie);
    assert.equal(res.status, 200);
    for (const p of [s.pfad + '/', s.pfad + '/x', '/' + path.basename(s.pfad) + '.html', s.pfad.toUpperCase()]) {
      const r = await request(t.app).get(p);
      assert.equal(r.status, 404, p);
    }
  });
}

test('Werkzeug-Module: ES-Module mit Versions-Import, nur Textknoten, keine Inline-Styles', () => {
  const dateien = ['bauplan/chen.js', 'bauplan/block.js', 'bauplan/tisch.js', 'bauplan/interaktion.js', 'bauplan/seite.js', 'werkbank/werkbank.js', 'werkbank/seite.js'];
  for (const d of dateien) {
    const js = lies(JS, d);
    if (d !== 'bauplan/chen.js') assert.match(js, /new URL\(import\.meta\.url\)\.search/, d);
    assert.doesNotMatch(js, /^import .* from /m, `${d}: statischer Import ohne Version`);
    assert.doesNotMatch(js, /innerHTML|outerHTML|insertAdjacentHTML|document\.write/, d);
    assert.doesNotMatch(js, /setAttribute\(\s*['"]style['"]|\.style\.(?!setProperty)|cssText/, `${d}: Inline-Style`);
  }
  const chen = lies(JS, 'bauplan/chen.js');
  assert.doesNotMatch(chen, /import\(/, 'chen.js ist ohne Abhängigkeiten (render.js lädt es)');
  assert.doesNotMatch(lies(JS, 'bauplan/block.js'), /import\([^)]*render\.js/, 'block.js darf render.js nicht laden (Kreis)');
});

test('Bauplan-Tisch: Werkzeugleiste, Listenmodus, Tastatur, Grenzen, Entwurf im localStorage', () => {
  const js = lies(JS, 'bauplan/tisch.js');
  for (const text of ["knopf('Entitätstyp'", "knopf('Beziehungstyp'", "knopf('Attribut'", "knopf('Verbinden'", "knopf('Zeichnen'", "knopf('Liste'"]) assert.ok(js.includes(text), text);
  for (const taste of ["'Enter'", 'ArrowLeft', "'Delete'", "'Escape'"]) assert.ok(js.includes(taste), taste);
  assert.match(js, /pointerdown/);
  assert.match(js, /setPointerCapture/);
  assert.match(js, /localStorage/);
  assert.match(js, /elemente: 30, attribute: 30, name: 40/);
  assert.match(js, /`\$\{richtig\} von \$\{gesamt\}`/);
  assert.match(js, /R\.stempel\('Gelöst'/);
  assert.match(js, /R\.falle\(/);
});

test('Schema-Werkbank: PK/FK-Schalter, Zielauswahl, roter Faden, Vorschau, Teilfeedback', () => {
  const js = lies(JS, 'werkbank/werkbank.js');
  assert.match(js, /'↑FK'/);
  assert.match(js, /'– Zielrelation –'/);
  assert.match(js, /wk-faden/);
  assert.match(js, /R\.relation\(/);
  assert.match(js, /R\.falle\(/);
  assert.match(js, /relationen: 30, attribute: 30, name: 40/);
});

test('Lernseiten binden Blöcke er/mengen und Interaktionen er/schema ein (Styles in Ermittlung, Verhör, Training)', () => {
  const render = lies(JS, 'kern', 'render.js');
  assert.match(render, /case 'er':/);
  assert.match(render, /case 'mengen':/);
  assert.match(render, /import\('\.\.\/bauplan\/block\.js' \+ V\)/);
  const ia = lies(JS, 'kern', 'interaktionen.js');
  assert.match(ia, /case 'er':/);
  assert.match(ia, /case 'schema':/);
  assert.match(ia, /erAuswahl\(index\)/);
  for (const seite of ['ermittlung.html', 'verhoer.html', 'training.html']) {
    const html = lies(PUBLIC, seite);
    assert.match(html, /\/static\/css\/bauplan\.css\?v=/, seite);
    assert.match(html, /\/static\/css\/werkbank\.css\?v=/, seite);
  }
});

test('/themen verlinkt Bauplan-Tisch und Schema-Werkbank', async () => {
  const { app } = testApp();
  const res = await request(app).get('/themen');
  assert.match(res.text, /href="\/werkzeug\/bauplan"/);
  assert.match(res.text, /href="\/werkzeug\/werkbank"/);
});

test('Icons für den Bauplan-Tisch liegen im Sprite', () => {
  const sprite = lies(PUBLIC, 'static', 'img', 'icons.svg');
  for (const id of ['i-stift', 'i-liste', 'i-verbinden', 'i-bauplan']) assert.match(sprite, new RegExp(`id="${id}"`), id);
});
