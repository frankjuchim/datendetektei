// Werkzeugseite „Schema-Werkbank“ (/werkzeug/werkbank, Plan Phase 5 Task 4; DESIGN.md §5.8): Relationen frei
// anlegen, ohne Prüfung. Der Entwurf bleibt im localStorage dieses Geräts („dd-werkzeug:werkbank“).

const V = new URL(import.meta.url).search;
const W = await import('./werkbank.js' + V);
const ENTWURF = 'dd-werkzeug:werkbank';

const $ = (id) => document.getElementById(id);
const bereich = $('werkbank-bereich');
const werkbank = W.erzeugeWerkbank({ modus: 'frei', entwurf: ENTWURF, pruefbar: false });
bereich.replaceChildren(werkbank.el);

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
  werkbank.leeren();
  bereich.focus();
});

document.documentElement.dataset.seite = 'bereit';
