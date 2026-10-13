'use strict';
// res.sendFile ohne `root` verweigert Dateien, wenn ein Ordner im absoluten Pfad mit „.“ beginnt (z. B. ein
// Arbeitsverzeichnis unter .claude/). Deshalb immer mit { root } aufrufen.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

function dateien(ordner) {
  return fs.readdirSync(ordner, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? dateien(path.join(ordner, e.name)) : e.name.endsWith('.js') ? [path.join(ordner, e.name)] : []
  );
}

test('sendFile wird überall mit root aufgerufen', () => {
  for (const datei of dateien(path.join(__dirname, '..', 'src'))) {
    const text = fs.readFileSync(datei, 'utf8');
    for (const m of text.matchAll(/sendFile\(([^)]*)\)/g)) {
      assert.match(m[1], /root/, `${path.relative(process.cwd(), datei)}: sendFile(${m[1]}) ohne root`);
    }
  }
});
