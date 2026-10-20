'use strict';
// Datenschutzseite vollständig (Plan Phase 8 Task 5, Vertrag §10): Jede Tabelle der Plattform-DB ist einer Passage
// der Seite zugeordnet, Cookie-Namen der Seite = Cookie-Namen im Code, Gerätespeicher-Schlüssel des Frontends sind
// auf der Seite genannt. Kommt eine Tabelle, ein Cookie oder ein Speicherschlüssel dazu, wird dieser Test rot – dann
// die Seite ergänzen und die Zuordnung hier nachtragen.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const request = require('supertest');
const { testApp } = require('./helpers');
const { oeffneDb } = require('../src/db');
const { SITZUNG_DAUER_SEK } = require('../src/kern/sitzung');
const { STATE_DAUER_SEK } = require('../src/kern/sso');

const WURZEL = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(WURZEL, 'public', 'datenschutz.html'), 'utf8');

/**
 * Tabelle → Passage (id eines <li> bzw. Abschnitts der Seite) und ein Stichwort, das dort stehen muss.
 * SQLite-interne Tabellen (sqlite_sequence für AUTOINCREMENT) sind keine eigene Datenkategorie.
 */
const ZUORDNUNG = {
  meta: { passage: 'ds-inhalte', stichwort: /technische Verwaltungsangaben/ },
  akten: { passage: 'ds-inhalte', stichwort: /Akten/ },
  aufgaben: { passage: 'ds-inhalte', stichwort: /Aufgaben/ },
  konten: { passage: 'ds-konto', stichwort: /Anzeigename/ },
  kurse: { passage: 'ds-kurs', stichwort: /Beamer-Board/ },
  mitgliedschaften: { passage: 'ds-kurs', stichwort: /Mitglied/ },
  fortschritt: { passage: 'ds-lernstand', stichwort: /Fehlversuche/ },
  fallen_zaehler: { passage: 'ds-lernstand', stichwort: /Falle \(P1–P10\)/ },
  kernpunkte: { passage: 'ds-lernstand', stichwort: /Kernpunkte/ },
  serien: { passage: 'ds-lernstand', stichwort: /Serie/ },
  verhoer_versuche: { passage: 'ds-verhoer', stichwort: /Verhör/ },
  leitner: { passage: 'ds-warmup', stichwort: /Warm-up/ },
  training: { passage: 'ds-warmup', stichwort: /Trainingsplatz/ },
  abzeichen: { passage: 'ds-erfolge', stichwort: /Abzeichen/ },
  erfolge: { passage: 'ds-erfolge', stichwort: /Erfolge/ },
  fehlabfragen: { passage: 'ds-fehlabfragen', stichwort: /Fehlabfragen/ }
};

/** Inhalt des Elements mit der id (bis zum schließenden Tag desselben Namens, ohne Verschachtelung gleicher Tags). */
function passage(id) {
  const m = new RegExp(`<(li|section|p|div)\\b[^>]*\\bid="${id}"[^>]*>([\\s\\S]*?)</\\1>`).exec(HTML);
  return m ? m[2] : null;
}

function dateienRekursiv(ordner, endung) {
  return fs.readdirSync(ordner, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(ordner, e.name);
    if (e.isDirectory()) return e.name === 'vendor' ? [] : dateienRekursiv(p, endung);
    return p.endsWith(endung) ? [p] : [];
  });
}

test('jede Tabelle der Plattform-DB (nach allen Migrationen) ist auf der Datenschutzseite zugeordnet', () => {
  const db = oeffneDb(':memory:');
  const tabellen = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite\\_%' ESCAPE '\\' ORDER BY name")
    .all()
    .map((z) => z.name);
  db.close();
  assert.ok(tabellen.length >= 16, 'Tabellen gefunden');
  for (const t of tabellen) {
    const z = ZUORDNUNG[t];
    assert.ok(z, `Tabelle „${t}“ ist keiner Passage der Datenschutzseite zugeordnet (Seite ergänzen, ZUORDNUNG nachtragen)`);
    const text = passage(z.passage);
    assert.ok(text, `Passage #${z.passage} fehlt auf der Datenschutzseite (Tabelle ${t})`);
    assert.match(text, z.stichwort, `Passage #${z.passage} nennt die Tabelle ${t} nicht (${z.stichwort})`);
  }
  // keine veralteten Einträge in der Zuordnung
  for (const t of Object.keys(ZUORDNUNG)) assert.ok(tabellen.includes(t), `ZUORDNUNG enthält die unbekannte Tabelle ${t}`);
});

test('Cookie-Namen der Seite = Cookie-Namen im Code, Dauern stimmen', () => {
  const imCode = new Set();
  for (const datei of dateienRekursiv(path.join(WURZEL, 'src'), '.js')) {
    const text = fs.readFileSync(datei, 'utf8');
    for (const m of text.matchAll(/const \w+_COOKIE = '([^']+)'/g)) imCode.add(m[1]);
  }
  assert.ok(imCode.size >= 2);
  const aufSeite = new Set([...HTML.matchAll(/<code data-cookie>([^<]+)<\/code>/g)].map((m) => m[1]));
  assert.deepEqual([...aufSeite].sort(), [...imCode].sort());

  const cookies = passage('ds-cookies');
  assert.ok(cookies, 'Passage #ds-cookies');
  assert.equal(SITZUNG_DAUER_SEK.schueler, 30 * 24 * 3600);
  assert.match(cookies, /30 Tage/);
  assert.equal(SITZUNG_DAUER_SEK.lehrkraft, 8 * 3600);
  assert.equal(SITZUNG_DAUER_SEK.superadmin, 8 * 3600);
  assert.match(cookies, /8 Stunden/);
  assert.equal(STATE_DAUER_SEK, 600);
  assert.match(cookies, /10 Minuten/);
});

test('Gerätespeicher: jeder Schlüssel des Frontends ist auf der Seite genannt', () => {
  // Schlüssel (localStorage/sessionStorage) beginnen mit „dd-“ oder „dd_“; Vorlagen-Strings bis zum ersten ${…}.
  const imCode = new Set();
  for (const datei of dateienRekursiv(path.join(WURZEL, 'public', 'static', 'js'), '.js')) {
    const text = fs.readFileSync(datei, 'utf8');
    for (const m of text.matchAll(/['"`](dd[-_][A-Za-z0-9_:.-]*)/g)) imCode.add(m[1]);
  }
  assert.ok(imCode.has('dd-thema') && imCode.has('dd_zeitlupe'), 'Scan findet die Schlüssel');
  // Seite: <code data-speicher="local|session">name</code>; endet der Name auf „…“, gilt er als Präfix.
  const aufSeite = [...HTML.matchAll(/<code data-speicher="(?:local|session)">([^<]+)<\/code>/g)].map((m) => m[1]);
  const gedeckt = (k) => aufSeite.some((s) => (s.endsWith('…') ? k.startsWith(s.slice(0, -1)) || s.slice(0, -1).startsWith(k) : s === k));
  for (const k of imCode) assert.ok(gedeckt(k), `Gerätespeicher-Schlüssel „${k}“ fehlt auf der Datenschutzseite`);
  // umgekehrt: nichts auf der Seite, was es im Code nicht gibt
  for (const s of aufSeite) {
    const praefix = s.endsWith('…') ? s.slice(0, -1) : null;
    assert.ok(praefix ? [...imCode].some((k) => k.startsWith(praefix) || praefix.startsWith(k)) : imCode.has(s), `„${s}“ steht auf der Seite, kommt im Code aber nicht vor`);
  }
});

test('Datenschutzseite: Verantwortlicher, Hoster, Rechtsgrundlage, Live, Board, Kür, Sicherung, Logs, Empfänger, Lizenz', async () => {
  const { app } = testApp();
  const res = await request(app).get('/datenschutz');
  assert.equal(res.status, 200);
  const t = res.text;
  // Angaben von Frank (Spec §18, 2026-10-14/20): kein Entwurf, keine Platzhalter mehr; Kontakt mit E-Mail-Adresse
  assert.doesNotMatch(t, /Entwurf/);
  const platzhalter = [...t.matchAll(/<span class="platzhalter">\[([^\]]+)\]<\/span>/g)].map((m) => m[1]);
  assert.deepEqual(platzhalter, [], 'keine Platzhalter');
  assert.doesNotMatch(t, /class="platzhalter"/);
  assert.match(passage('ds-verantwortlich'), /Bad Zwischenahn/);
  assert.match(passage('ds-verantwortlich'), /<a href="mailto:info@frankjuchim\.de">info@frankjuchim\.de<\/a>/);
  for (const id of ['ds-verantwortlich', 'ds-hoster', 'ds-rechtsgrundlage', 'ds-rechte']) assert.ok(passage(id), `Passage #${id}`);
  assert.match(passage('ds-verantwortlich'), /Frank Juchim/);
  assert.match(passage('ds-verantwortlich'), /§ 38 BDSG/);
  assert.match(passage('ds-hoster'), /IONOS SE/);
  assert.match(passage('ds-hoster'), /Art\. 28 DSGVO/);
  assert.match(passage('ds-rechtsgrundlage'), /Art\. 6 Abs\. 1 lit\. e DSGVO/);
  assert.match(passage('ds-rechtsgrundlage'), /§ 25 Abs\. 2 Nr\. 2 TDDDG/);
  assert.match(passage('ds-rechte'), /Landesbeauftragte für den Datenschutz Niedersachsen/);
  assert.match(passage('ds-sicherung'), /30 Tage/);
  assert.match(passage('ds-logs'), /7 Tage/);
  for (const id of ['ds-live', 'ds-board', 'ds-kuer', 'ds-sicherung', 'ds-logs', 'ds-empfaenger', 'ds-loeschung', 'ds-extern', 'lizenz']) {
    assert.ok(passage(id), `Passage #${id}`);
  }
  assert.match(passage('ds-live'), /Arbeitsspeicher/);
  assert.match(passage('ds-board'), /Anzeigenamen/);
  assert.match(passage('ds-kuer'), /nichts gespeichert/);
  assert.match(passage('ds-empfaenger'), /Kennzahlen/);
  assert.match(passage('ds-extern'), /YouTube/);
  assert.match(passage('lizenz'), /CC BY-NC-SA 4\.0/);
});
