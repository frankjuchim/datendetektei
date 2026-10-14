// Kurs-Reiter „Beitritt“ (Aufbau wie Algo Quest bei Portal-Kursen): Beitritt läuft über das Portal InfoLabs (Kurscode des
// Portals), darunter das Beamer-Board des Kurses (einschalten, Link kopieren/öffnen/erneuern, Vorschau – board.js).

const V = new URL(import.meta.url).search;
const [G, B] = await Promise.all([import('./gemeinsam.js' + V), import('./board.js' + V)]);
const { A, R } = G;
const { el, h } = R;

export async function zeige(panel, ctx) {
  const { karte } = G.karte('Beitritt über das Portal', null, { id: 'bt-portal' });
  karte.appendChild(
    el(
      'p',
      null,
      'Dieser Kurs wird im Portal InfoLabs verwaltet: Ihre Schülerinnen und Schüler treten dort mit dem Kurscode des Portals bei und kommen über „Weiter zur Datendetektei“ hierher – ein eigener Kurscode der Datendetektei ist nicht nötig. Namen und persönliche Codes ändern Sie ebenfalls im Portal.'
    )
  );
  if (ctx.portal) {
    const a = A.linkKnopf('Zum Portal', ctx.portal + '/', 'knopf');
    a.prepend(R.icon('i-haus'));
    karte.appendChild(h('div', 'knopf-reihe', a));
  }
  const board = el('div', 'lk-panel-teil');
  board.id = 'bt-board';
  panel.replaceChildren(karte, board);
  await B.zeige(board, ctx);
}
