'use strict';
// Aufgabenstellungen verwenden nur Operatoren der KM-Liste (INF_2024Abi_Operatoren, Stand 1. Februar 2024;
// werkzeuge/operatoren.json; Entscheidung Frank, Spec §18, 2026-10-14). Geprüft werden die Inhalte der Plattform
// (seed/akten, seed/warmup, seed/live, seed/gast, seed/fallebene.json); das Material prüft
// werkzeuge/materialien_pruefen.py mit derselben Liste. Bedienhinweise (tippen, wählen, markieren, eintragen,
// ausführen, testen) sind keine Operatoren und bleiben erlaubt; Tipps, Lösungen und Erklärungen werden nicht geprüft.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const WURZEL = path.join(__dirname, '..');
const LISTE = JSON.parse(fs.readFileSync(path.join(WURZEL, 'werkzeuge', 'operatoren.json'), 'utf8'));

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// beide Schreibweisen (Satzanfang/Satzinneres) ohne Flag i – sonst träfe der Ausschluss „ Sie“ auch „ sie“
const gross = (s) => s[0].toUpperCase() + s.slice(1);
const alt = (xs) => [...xs].flatMap((x) => [x, gross(x)]).sort((a, b) => b.length - a.length).map(esc).join('|');
const VOR = String.raw`(?:^|(?<=[.!?:;)\]\n])\s*|,\s+|\b(?:und|oder|dann)\s+|^\s*[a-z]\)\s*|^\s*\d+\.\s*|[–▸•]\s*)`;
const DU = new RegExp(VOR + String.raw`\*{0,2}(${alt(LISTE.nicht.du)})\b\*{0,2}(?! ich\b| wir\b| Sie\b)`, 'gmu');
const SIE = new RegExp(VOR + String.raw`\*{0,2}(${alt(LISTE.nicht.sie)})\*{0,2} Sie\b`, 'gmu');

function nichtOperatoren(text) {
  const t = String(text).replace(/`[^`]*`/g, '');
  return [...t.matchAll(DU), ...t.matchAll(SIE)].map((m) => m[1]);
}

// Felder, die keine Aufgabenstellung sind
const OHNE = new Set(['tipps', 'loesung', 'erklaerung', 'erklaerungen', 'rueckmeldung', 'hinweise', 'plaedoyer', 'aufloesung',
  'feedback', 'muster', 'diagnosen', 'rahmensatz', 'intro', 'id', 'sql', 'code', 'varianten']);

function* texte(wert, ort) {
  if (typeof wert === 'string') yield [ort, wert];
  else if (Array.isArray(wert)) for (const [i, v] of wert.entries()) yield* texte(v, `${ort}[${i}]`);
  else if (wert && typeof wert === 'object') {
    for (const [k, v] of Object.entries(wert)) if (!OHNE.has(k)) yield* texte(v, `${ort}.${k}`);
  }
}

function dateien() {
  const aus = [path.join(WURZEL, 'seed', 'fallebene.json')];
  for (const ordner of ['akten', 'warmup', 'live', 'gast']) {
    const dir = path.join(WURZEL, 'seed', ordner);
    for (const f of fs.readdirSync(dir)) if (f.endsWith('.json')) aus.push(path.join(dir, f));
  }
  return aus;
}

test('Operatoren-Liste: 24 Operatoren der KM-Liste, keine Überschneidung mit den Nicht-Operatoren', () => {
  assert.equal(LISTE.operatoren.length, 24);
  const sie = new Set(LISTE.operatoren.map((o) => o.sie));
  for (const o of ['analysieren', 'beurteilen', 'entwerfen', 'erläutern', 'erstellen', 'angeben', 'zeichnen', 'verändern']) assert.ok(sie.has(o), o);
  for (const n of LISTE.nicht.sie) assert.ok(!sie.has(n), n);
});

test('nichtOperatoren erkennt Notiere/Überführen Sie/… und lässt Operatoren und Bedienhinweise stehen', () => {
  assert.deepEqual(nichtOperatoren('Notiere eine Abfrage.'), ['Notiere']);
  assert.deepEqual(nichtOperatoren('**Überführen** Sie das Modell.'), ['Überführen']);
  assert.deepEqual(nichtOperatoren('**Ordnen Sie** jedem Auszug den Grundsatz **zu**.'), ['Ordnen']);
  assert.deepEqual(nichtOperatoren('Entwirf die Abfrage, prüfe sie in der Konsole.'), ['prüfe']);
  assert.deepEqual(nichtOperatoren('a) Erkläre, warum.'), ['Erkläre']);
  assert.deepEqual(nichtOperatoren('**Entwirf** eine Abfrage und **gib** das Ergebnis **an**. Tippe alle Zellen an.'), []);
  assert.deepEqual(nichtOperatoren('**Erstellen Sie** das Relationenschema. Wählen Sie alle zutreffenden Aussagen.'), []);
  assert.deepEqual(nichtOperatoren('Bevor ich dich lasse, prüfe ich, ob du sauber abfragst.'), []);
});

test('Aufgabenstellungen der Plattform verwenden nur Operatoren der KM-Liste', () => {
  const funde = [];
  for (const f of dateien()) {
    const d = JSON.parse(fs.readFileSync(f, 'utf8'));
    for (const [ort, t] of texte(d, path.relative(WURZEL, f))) {
      for (const verb of nichtOperatoren(t)) funde.push(`${ort}: „${verb}“ – ${t.slice(0, 90)}`);
    }
  }
  assert.deepEqual(funde, []);
});

test('fett gesetzte Operatoren im Abitur-Stil (**… Sie**) stammen aus der KM-Liste', () => {
  const erlaubt = new Set(LISTE.operatoren.map((o) => o.sie.replace(/^(an|dar|ab)(.+)$/, '$2')));
  for (const o of LISTE.operatoren) erlaubt.add(o.sie);
  erlaubt.add('geben'); erlaubt.add('stellen'); erlaubt.add('wenden'); erlaubt.add('schätzen');
  for (const ui of ['führen', 'wählen', 'markieren', 'gehen']) erlaubt.add(ui); // Bedienhinweise bzw. „Gehen Sie dabei auf … ein“
  const fremd = [];
  for (const f of dateien()) {
    const roh = fs.readFileSync(f, 'utf8');
    for (const m of roh.matchAll(/\*\*([A-ZÄÖÜ][a-zäöüß]+)(?:\*\* Sie| Sie\*\*)/g)) {
      if (!erlaubt.has(m[1].toLowerCase())) fremd.push(`${path.relative(WURZEL, f)}: ${m[0]}`);
    }
  }
  assert.deepEqual(fremd, []);
});
