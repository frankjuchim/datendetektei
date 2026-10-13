'use strict';
// Video-Datenbank „Schachturnier“ (seed/datenbanken/video/schachturnier, Erklärvideos 1, 2, 7; Spec §13): kuratiert,
// basis.sql aktuell und Abnahme grün, Beispielabfragen EH-konform, zur Laufzeit nie geladen und nie öffentlich.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const bau = require('../scripts/db_bauen');
const D = require('../src/sql/datenbanken');
const { parse } = require('../src/sql/parser');
const { pruefeRegeln } = require('../src/sql/regeln');

const NAME = 'video/schachturnier';
const ORDNER = path.join(__dirname, '..', 'seed', 'datenbanken', NAME);

test('Video-DB: Bau, Abnahme und Beispielabfragen grün', () => {
  const { db, bericht } = bau.baueDb(NAME);
  try {
    assert.equal(bericht.status, 'fertig', bericht.meldungen.join('; '));
    assert.ok(bericht.abnahme.length >= 12);
    for (const p of bericht.abnahme) assert.ok(p.ok, `${p.name}: ist ${JSON.stringify(p.ist)}, soll ${JSON.stringify(p.soll)}`);
    assert.ok(bericht.beispiele.filter((b) => b.ok && !b.fehlabfrage).length >= 8);
  } finally {
    db.close();
  }
});

test('Video-DB: eingecheckte basis.sql entspricht dem Neubau (npm run db:video:pruefen)', () => {
  const log = [];
  const code = bau.lauf({ reihenfolge: [NAME], pruefen: true, log: (z) => log.push(z) });
  assert.equal(code, 0, log.join('\n'));
  assert.ok(D.pruefeBasisText(fs.readFileSync(path.join(ORDNER, 'basis.sql'), 'utf8')).ok);
});

test('Video-DB: Beispielabfragen der LIESMICH nach EH §8 (streng)', () => {
  const md = fs.readFileSync(path.join(ORDNER, 'LIESMICH.md'), 'utf8');
  for (const b of bau.extrahiereSqlBloecke(md).filter((x) => !x.fehlabfrage)) {
    const { ast, fehler } = parse(b.sql);
    assert.deepEqual(fehler, [], b.sql);
    const d = pruefeRegeln(ast, { abimodus: 'streng' });
    assert.deepEqual(d.filter((x) => x.art === 'fehler'), [], b.sql);
  }
});

test('Video-DB: zur Laufzeit nicht geladen, nie öffentlich, nicht im normalen DB-Bau', () => {
  assert.ok(!D.ALLE_DATENBANKEN.includes(NAME));
  assert.ok(!D.OEFFENTLICHE_DATENBANKEN.includes(NAME));
  assert.ok(!bau.ALLE_DBS.includes(NAME));
});
