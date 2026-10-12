// Testseite (nur E2E): stellt einen Ausführer als window.ausfuehrer bereit.
// Query: db=<name> (Test-DB unter /test/db/<name>.sqlite), ohneWasm=1 erzwingt den asm.js-Fallback.
import { erzeugeAusfuehrer } from '/static/js/konsole/ausfuehren.js';

const parameter = new URLSearchParams(location.search);
const name = parameter.get('db') || 'fundbuero';
const ausfuehrer = erzeugeAusfuehrer({
  // fremd=1: DB von fremder Herkunft (muss an connect-src 'self' scheitern)
  dbUrl: parameter.get('fremd') === '1' ? `https://fremd.example/${name}.sqlite` : `/test/db/${name}.sqlite`,
  ohneWasm: parameter.get('ohneWasm') === '1'
});
window.ausfuehrer = ausfuehrer;
window.cspVerletzungen = [];
document.addEventListener('securitypolicyviolation', (e) => {
  window.cspVerletzungen.push(`${e.violatedDirective} ${e.blockedURI}`);
});
ausfuehrer.bereit.then(
  (info) => {
    document.getElementById('status').textContent = `bereit (${info.modus})`;
  },
  (fehler) => {
    document.getElementById('status').textContent = `Fehler: ${fehler && fehler.message}`;
  }
);
