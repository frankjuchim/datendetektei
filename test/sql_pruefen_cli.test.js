'use strict';
// SQL-Prüfung für Materialien (Spec §12.3, Plan Phase 7 Task 1): scripts/sql_pruefen_cli.js prüft SQL aus docx/pptx
// auf Syntax, EH-§8-Regeln (Abimodus streng, Kür: aus), Ausführbarkeit (Haupt-DB + Varianten) und vergleicht
// Ergebnistabellen. Eingabe/Ausgabe JSON; die Python-Werkzeuge rufen das CLI auf.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const cli = require('../scripts/sql_pruefen_cli');

const CLI = path.join(__dirname, '..', 'scripts', 'sql_pruefen_cli.js');
const lauf = (eintraege, args = []) => {
  const r = spawnSync(process.execPath, [CLI, ...args], { input: JSON.stringify(eintraege), encoding: 'utf8' });
  return { code: r.status, aus: r.stdout ? JSON.parse(r.stdout) : null, fehler: r.stderr };
};

test('findeDatenbank: Name, Umlaute, Verhör-Kontexte, keine', () => {
  assert.equal(cli.findeDatenbank('fundbuero'), 'fundbuero');
  assert.equal(cli.findeDatenbank('Fundbüro'), 'fundbuero');
  assert.equal(cli.findeDatenbank('StadtRad'), 'stadtrad');
  assert.equal(cli.findeDatenbank('kiosk'), 'verhoer/kiosk');
  assert.equal(cli.findeDatenbank('verhoer/kiosk'), 'verhoer/kiosk');
  assert.equal(cli.findeDatenbank('keine'), null);
  assert.throws(() => cli.findeDatenbank('gibtsnicht'), /unbekannt/);
});

test('zellenGleich: Zahlen mit Komma, Rundung auf angezeigte Stellen, NULL, Text', () => {
  assert.ok(cli.zellenGleich('15,6', 15.6));
  assert.ok(cli.zellenGleich('89,42', 89.41666666666667));
  assert.ok(!cli.zellenGleich('89,41', 89.41666666666667));
  assert.ok(cli.zellenGleich('32 €', 32));
  assert.ok(cli.zellenGleich('1.250', 1250));
  assert.ok(cli.zellenGleich('NULL', null));
  assert.ok(!cli.zellenGleich('', null));
  assert.ok(cli.zellenGleich('Regenjacke', 'Regenjacke'));
  assert.ok(!cli.zellenGleich('regenjacke', 'Regenjacke'));
  assert.ok(cli.zellenGleich('2026-04-14', '2026-04-14'));
});

test('richtige Abfrage mit passender Ergebnistabelle: ok', () => {
  const { code, aus } = lauf([
    {
      id: 'a',
      sql: 'SELECT FundNr, Bezeichnung\nFROM Fundsache\nWHERE FundNr <= 3\nORDER BY FundNr;',
      datenbank: 'fundbuero',
      erwartet: { kopf: ['FundNr', 'Bezeichnung'], zeilen: [['1', 'E-Reader'], ['2', 'Regenjacke'], ['3', 'Monatskarte']] }
    }
  ]);
  assert.equal(code, 0);
  assert.equal(aus[0].ok, true, JSON.stringify(aus[0]));
  assert.deepEqual(aus[0].befunde, []);
  assert.equal(aus[0].anzahl, 3);
});

test('Ergebnisabweichung, falsche Spalte, abgeschnittene Tabelle', () => {
  const { code, aus } = lauf([
    { id: 'falsch', sql: 'SELECT FundNr, Bezeichnung FROM Fundsache WHERE FundNr <= 2 ORDER BY FundNr', datenbank: 'fundbuero',
      erwartet: { kopf: ['FundNr', 'Bezeichnung'], zeilen: [['1', 'E-Reader'], ['2', 'Regenschirm']] } },
    { id: 'spalte', sql: 'SELECT FundNr, Bezeichnung AS Ding FROM Fundsache WHERE FundNr = 1', datenbank: 'fundbuero',
      erwartet: { kopf: ['FundNr', 'Bezeichnung'], zeilen: [['1', 'E-Reader']] } },
    { id: 'kurz', sql: 'SELECT FundNr FROM Fundsache ORDER BY FundNr', datenbank: 'fundbuero',
      erwartet: { kopf: ['FundNr'], zeilen: [['1'], ['2']], abgeschnitten: true } },
    { id: 'menge', sql: 'SELECT FundNr FROM Fundsache WHERE FundNr <= 2', datenbank: 'fundbuero',
      erwartet: { kopf: ['FundNr'], zeilen: [['2'], ['1']] } }
  ]);
  assert.equal(code, 1);
  const nach = Object.fromEntries(aus.map((a) => [a.id, a]));
  assert.equal(nach.falsch.ok, false);
  assert.match(nach.falsch.befunde[0].text, /Zeile 2/);
  assert.equal(nach.spalte.ok, false);
  assert.match(nach.spalte.befunde[0].text, /Spalte 2/);
  assert.equal(nach.kurz.ok, true, JSON.stringify(nach.kurz));
  assert.equal(nach.menge.ok, true, 'ohne ORDER BY zählt die Reihenfolge nicht');
});

test('EH-Verstöße (streng), Kür ohne Fremdkörper-Regeln, Syntaxfehler, Ausführungsfehler', () => {
  const { aus } = lauf([
    { id: 'join', sql: 'SELECT f.FundNr FROM Fundsache f JOIN Fundsache g ON f.FundNr = g.FundNr', datenbank: 'fundbuero' },
    { id: 'kuer', sql: 'SELECT f.FundNr FROM Fundsache f JOIN Fundsache g ON f.FundNr = g.FundNr', datenbank: 'fundbuero', kuer: true },
    { id: 'gb', sql: 'SELECT Kategorie, Farbe, COUNT(*) FROM Fundsache GROUP BY Kategorie', datenbank: 'fundbuero' },
    { id: 'syntax', sql: 'SELECT FROM Fundsache', datenbank: 'fundbuero' },
    { id: 'spalte', sql: 'SELECT Gibtsnicht FROM Fundsache', datenbank: 'fundbuero' },
    { id: 'hinweis', sql: "SELECT FundNr FROM Fundsache WHERE Kategorie = 'Schmuck' OR Kategorie = 'Taschen' AND Wert > 50", datenbank: 'fundbuero' }
  ]);
  const nach = Object.fromEntries(aus.map((a) => [a.id, a]));
  assert.equal(nach.join.ok, false);
  assert.equal(nach.join.befunde[0].art, 'eh');
  assert.equal(nach.kuer.ok, true, JSON.stringify(nach.kuer));
  assert.equal(nach.gb.ok, false);
  assert.match(nach.gb.befunde.map((b) => b.code).join(), /GB_REGEL/);
  assert.equal(nach.syntax.ok, false);
  assert.equal(nach.syntax.befunde[0].art, 'syntax');
  assert.equal(nach.spalte.ok, false);
  assert.equal(nach.spalte.befunde[0].art, 'ausfuehrung');
  assert.equal(nach.hinweis.ok, true, 'AND/OR-Mischung ist nur ein Hinweis');
  assert.equal(nach.hinweis.befunde[0].art, 'hinweis');
});

test('absichtlich fehlerhaft: ok nur mit Befund; keine DB: nur Parser und Regeln', () => {
  const { aus } = lauf([
    { id: 'f1', sql: 'SELECT Kategorie, Farbe, COUNT(*) FROM Fundsache GROUP BY Kategorie', datenbank: 'fundbuero', pruefung: 'fehlerhaft' },
    { id: 'f2', sql: 'SELECT FundNr FROM Fundsache', datenbank: 'fundbuero', pruefung: 'fehlerhaft' },
    { id: 'k1', sql: 'SELECT Name FROM Phantasie WHERE Jahrgang > 3', datenbank: 'keine' },
    { id: 'k2', sql: 'SELECT Name FROM Phantasie WHERE Jahrgang <> 3', datenbank: 'keine' }
  ]);
  const nach = Object.fromEntries(aus.map((a) => [a.id, a]));
  assert.equal(nach.f1.ok, true);
  assert.equal(nach.f2.ok, false);
  assert.equal(nach.f2.befunde[0].art, 'erwartung');
  assert.equal(nach.k1.ok, true, JSON.stringify(nach.k1));
  assert.equal(nach.k2.ok, false);
});

test('Varianten: Ausführung auf allen Randfall-Varianten; Verhör-DB', () => {
  const { aus } = lauf([
    { id: 'v', sql: 'SELECT Titel FROM Medium ORDER BY Titel LIMIT 1', datenbank: 'verhoer/bibliothek' }
  ]);
  assert.ok(aus[0].ok || aus[0].befunde.every((b) => b.art !== 'datenbank'), JSON.stringify(aus[0]));
});

test('Kür mit eigener leerer Datenbank: CREATE/INSERT/SELECT in einer Sitzung', () => {
  const { aus } = lauf([
    { id: 'c', sql: 'CREATE TABLE Team (TeamNr INTEGER PRIMARY KEY, Name TEXT)', datenbank: 'leer', kuer: true, sitzung: 's' },
    { id: 'i', sql: "INSERT INTO Team VALUES (1, 'Nachtfalter')", datenbank: 'leer', kuer: true, sitzung: 's' },
    { id: 's', sql: 'SELECT Name FROM Team', datenbank: 'leer', kuer: true, sitzung: 's', erwartet: { kopf: ['Name'], zeilen: [['Nachtfalter']] } },
    { id: 'n', sql: 'DELETE FROM Fundsache', datenbank: 'fundbuero' }
  ]);
  const nach = Object.fromEntries(aus.map((a) => [a.id, a]));
  assert.equal(nach.c.ok, true, JSON.stringify(nach.c));
  assert.equal(nach.s.ok, true, JSON.stringify(nach.s));
  assert.equal(nach.n.ok, false, 'außerhalb der Kür nur SELECT');
});

test('--ausfuehren liefert Spalten und Rohwerte (für Ergebnistabellen in Lösungen)', () => {
  const { code, aus } = lauf([{ id: '1', sql: 'SELECT FundNr, AbgeholtAm FROM Fundsache WHERE FundNr <= 2 ORDER BY FundNr', datenbank: 'fundbuero' }], ['--ausfuehren']);
  assert.equal(code, 0);
  assert.deepEqual(aus[0].spalten, ['FundNr', 'AbgeholtAm']);
  assert.deepEqual(aus[0].zeilen, [[1, null], [2, '2026-04-14']]);
});
