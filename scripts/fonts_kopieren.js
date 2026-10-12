#!/usr/bin/env node
'use strict';
// Kopiert die selbst gehosteten Schriften (DESIGN.md §2.7) aus den @fontsource-Paketen (devDependencies) nach
// public/static/fonts/, schreibt fonts.css (@font-face mit font-display: swap und unicode-range wie fontsource)
// und OFL.txt (SIL Open Font License 1.1 mit den Copyright-Zeilen aller drei Familien).
// Aufruf: npm run fonts – das Ergebnis wird committet; im Betrieb werden die Pakete nicht gebraucht.

const fs = require('node:fs');
const path = require('node:path');

const WURZEL = path.join(__dirname, '..');
const ZIEL = path.join(WURZEL, 'public', 'static', 'fonts');
const TEILMENGEN = ['latin', 'latin-ext'];

const FAMILIEN = [
  {
    paket: '@fontsource/barlow',
    kennung: 'barlow',
    familie: 'Barlow',
    schnitte: [
      [400, 'normal'],
      [400, 'italic'],
      [500, 'normal'],
      [600, 'normal'],
      [700, 'normal']
    ]
  },
  {
    paket: '@fontsource/barlow-condensed',
    kennung: 'barlow-condensed',
    familie: 'Barlow Condensed',
    schnitte: [
      [500, 'normal'],
      [600, 'normal'],
      [700, 'normal']
    ]
  },
  {
    paket: '@fontsource/ibm-plex-mono',
    kennung: 'ibm-plex-mono',
    familie: 'IBM Plex Mono',
    schnitte: [
      [400, 'normal'],
      [500, 'normal'],
      [600, 'normal']
    ]
  }
];

function paketOrdner(paket) {
  return path.dirname(require.resolve(`${paket}/package.json`, { paths: [WURZEL] }));
}

function main() {
  fs.mkdirSync(ZIEL, { recursive: true });
  const css = [
    '/* Selbst gehostete Schriften (DESIGN.md §2.7), erzeugt von scripts/fonts_kopieren.js – nicht von Hand ändern.',
    '   Quelle: @fontsource-Pakete; Lizenz: SIL Open Font License 1.1 (OFL.txt). */',
    ''
  ];
  const copyright = [];
  let lizenzText = null;
  let anzahl = 0;

  for (const f of FAMILIEN) {
    const ordner = paketOrdner(f.paket);
    const unicode = JSON.parse(fs.readFileSync(path.join(ordner, 'unicode.json'), 'utf8'));
    const version = JSON.parse(fs.readFileSync(path.join(ordner, 'package.json'), 'utf8')).version;
    for (const [gewicht, stil] of f.schnitte) {
      // latin-ext zuerst, wie in den fontsource-CSS-Dateien (der Browser lädt nur die benötigte Teilmenge).
      for (const teil of [...TEILMENGEN].reverse()) {
        const datei = `${f.kennung}-${teil}-${gewicht}-${stil}.woff2`;
        fs.copyFileSync(path.join(ordner, 'files', datei), path.join(ZIEL, datei));
        anzahl++;
        css.push(
          `/* ${f.kennung}-${teil}-${gewicht}-${stil} */`,
          '@font-face {',
          `  font-family: '${f.familie}';`,
          `  font-style: ${stil};`,
          '  font-display: swap;',
          `  font-weight: ${gewicht};`,
          `  src: url(./${datei}) format('woff2');`,
          `  unicode-range: ${unicode[teil]};`,
          '}',
          ''
        );
      }
    }
    const lizenz = fs.readFileSync(path.join(ordner, 'LICENSE'), 'utf8');
    const ersteZeile = lizenz.split('\n')[0];
    copyright.push(`${f.familie} (${f.paket} ${version}): ${ersteZeile.split(/ \S+\.ttf:/)[0].trim()}`);
    const i = lizenz.indexOf('This Font Software is licensed');
    if (lizenzText === null && i >= 0) lizenzText = lizenz.slice(i);
  }
  if (!lizenzText) throw new Error('Lizenztext (OFL) nicht gefunden.');

  fs.writeFileSync(path.join(ZIEL, 'fonts.css'), css.join('\n'));
  fs.writeFileSync(
    path.join(ZIEL, 'OFL.txt'),
    ['Schriften der Datendetektei (public/static/fonts/*.woff2):', '', ...copyright, '', lizenzText.trim(), ''].join('\n')
  );
  console.log(`${anzahl} Schriftdateien, fonts.css und OFL.txt nach ${path.relative(WURZEL, ZIEL)} geschrieben.`);
}

main();
