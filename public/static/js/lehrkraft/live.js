// Reiter „Live“ (Spec §7.10): bindet den Baustein live/steuerung.js für den gewählten Kurs ein (Duell, Escape Room,
// laufende Runde, Link zur Beamer-Ansicht). Beim Kurswechsel schließt seite.js die Steuerung über schliessen().

const V = new URL(import.meta.url).search;
const [G, S] = await Promise.all([import('./gemeinsam.js' + V), import('../live/steuerung.js' + V)]);
const { A, R } = G;
const { el, h } = R;

let steuerung = null;

export function schliessen() {
  if (steuerung) steuerung.schliessen();
  steuerung = null;
}

export async function zeige(panel, ctx) {
  schliessen();
  const hinweis = el('p', 'lk-unter');
  hinweis.append(
    document.createTextNode('Duell oder Escape Room für den ganzen Kurs. Die Beamer-Ansicht öffnen Sie nach dem Start über „Beamer-Ansicht“. '),
    A.linkKnopf('Steuerung auf eigener Seite öffnen', '/lehrkraft/live?kurs=' + encodeURIComponent(ctx.kurs.id), 'link-ziel')
  );
  const ziel = el('div', 'live-steuerung');
  ziel.id = 'live-steuerung';
  panel.replaceChildren(h('div', 'lk-feld', hinweis), ziel);
  steuerung = await S.zeigeLiveSteuerung(ziel, { kursId: ctx.kurs.id, kursName: ctx.kurs.name || '' });
}
