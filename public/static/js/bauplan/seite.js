// Werkzeugseite „Bauplan-Tisch“ (/werkzeug/bauplan, Plan Phase 5 Task 4; DESIGN.md §5.7): frei zeichnen, ohne
// Prüfung. Der Entwurf (Graph + Layout) bleibt im localStorage dieses Geräts („dd-werkzeug:bauplan“).

const V = new URL(import.meta.url).search;
const T = await import('./tisch.js' + V);
const ENTWURF = 'dd-werkzeug:bauplan';

const $ = (id) => document.getElementById(id);
const bereich = $('bauplan-bereich');
const tisch = T.erzeugeTisch({ modus: 'frei', entwurf: ENTWURF, titel: 'Bauplan-Tisch' });
bereich.replaceChildren(tisch.el);

const bestaetigung = $('werkzeug-bestaetigung');
$('werkzeug-neu').addEventListener('click', () => {
  bestaetigung.hidden = false;
  $('werkzeug-neu-nein').focus();
});
$('werkzeug-neu-nein').addEventListener('click', () => {
  bestaetigung.hidden = true;
  $('werkzeug-neu').focus();
});
$('werkzeug-neu-ja').addEventListener('click', () => {
  bestaetigung.hidden = true;
  tisch.leeren();
  bereich.focus();
});

document.documentElement.dataset.seite = 'bereit';
