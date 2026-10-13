'use strict';
// Pfad zu Chromium für die E2E-Tests: CHROMIUM_PFAD, sonst die vorinstallierte Fassung der Cloud-Umgebung
// (/opt/pw-browsers, kein „playwright install“), sonst die von playwright-core installierte (CI).
const fs = require('node:fs');
const { chromium } = require('playwright-core');

const VORINSTALLIERT = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

function chromiumPfad() {
  if (process.env.CHROMIUM_PFAD) return process.env.CHROMIUM_PFAD;
  if (fs.existsSync(VORINSTALLIERT)) return VORINSTALLIERT;
  return chromium.executablePath();
}

module.exports = { chromiumPfad };
