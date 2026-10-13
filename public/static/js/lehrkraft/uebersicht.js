// Reiter „Übersicht“: Kennzahlen des Kurses, Akten-Fortschritt (Ringe), Verhöre (besiegt/Teilnehmer), Stand der
// Einstellungen (Niveau, Verhöre, Board) und Sprünge in die übrigen Reiter.

const V = new URL(import.meta.url).search;
const G = await import('./gemeinsam.js' + V);
const { R } = G;
const { el, h, knopf } = R;

const VERHOER_TEXT = { auto: 'automatisch ab 60 %', offen: 'offen', gesperrt: 'gesperrt' };

export async function zeige(panel, ctx) {
  const k = ctx.kurs;
  const d = await ctx.auswertung();
  const teile = [];

  // Akten-Fortschritt
  const { karte: akten } = G.karte('Akten-Fortschritt des Kurses', 'Ø Anteil der erreichbaren Punkte je Akte (nur Schülerinnen und Schüler).', { id: 'ue-akten' });
  const liste = el('ul', 'lk-akten');
  for (const a of d.akten) {
    const li = G.akteFarbe(el('li', 'lk-akte' + (a.freigeschaltet ? '' : ' gesperrt')), a.farbe);
    li.appendChild(
      a.freigeschaltet
        ? R.ring(a.anteil, { groesse: 48, label: `${G.akteKurz(a.nr)}: ${G.prozent(a.anteil)}` })
        : R.icon('i-schloss')
    );
    const text = h('span', 'lk-akte-text', el('strong', null, G.akteKurz(a.nr)), el('span', null, G.akteKurz(a.nr) === 'Kür' ? String(a.titel || '').replace(/^Kür:\s*/, '') : a.titel));
    if (!a.freigeschaltet) text.appendChild(el('span', null, 'gesperrt'));
    else if (a.verhoer) text.appendChild(el('span', null, `Verhör: ${a.verhoer.besiegt} von ${d.anzahlSchueler} besiegt`));
    li.appendChild(text);
    liste.appendChild(li);
  }
  akten.appendChild(liste);
  teile.push(akten);

  // Stand und Sprünge
  const raster = el('div', 'lk-raster');
  const { karte: stand } = G.karte('Stand der Einstellungen', null, { id: 'ue-stand' });
  const e = k.einstellungen;
  const dl = el('dl', 'lk-liste');
  const zeile = (dt, dd) => [el('dt', 'etikett', dt), el('dd', null, dd)];
  dl.append(
    ...zeile('Niveau', e.niveau === 'eA' ? 'eA (erhöhtes Niveau)' : 'gA (grundlegendes Niveau)'),
    ...zeile('Freigeschaltet', e.akten.length ? e.akten.map(G.akteKurz).join(', ') : 'noch keine Akte'),
    ...zeile('Verhöre', VERHOER_TEXT[e.verhoer] + (Object.keys(e.verhoerAkten || {}).length ? ' (mit Ausnahmen je Akte)' : '')),
    ...zeile('Beamer-Board', k.board && k.board.aktiv ? 'eingeschaltet' : 'aus'),
    ...zeile('Scoreboard', e.scoreboard ? 'an' : 'aus')
  );
  stand.appendChild(dl);
  const aendern = knopf('Einstellungen ändern', 'knopf', 'i-stift');
  aendern.addEventListener('click', () => ctx.oeffne('einstellungen'));
  stand.appendChild(h('div', 'knopf-reihe', aendern));
  raster.appendChild(stand);

  const { karte: weiter } = G.karte('Weiter', null, { id: 'ue-weiter' });
  const reihe = el('div', 'knopf-reihe');
  for (const [text, ziel, icon] of [
    ['Auswertung', 'auswertung', 'i-lehrkraft'],
    ['Aufgaben ansehen', 'vorschau', 'i-auge'],
    ['Live-Runde', 'live', 'i-play'],
    ['Beamer-Board', 'board', 'i-karte'],
    ['Urkunden', 'urkunden', 'i-stern'],
    ['Materialien', 'materialien', 'i-liste']
  ]) {
    const b = knopf(text, 'knopf', icon);
    b.addEventListener('click', () => ctx.oeffne(ziel));
    reihe.appendChild(b);
  }
  weiter.appendChild(reihe);
  const vorschau = G.A.linkKnopf('Schüleransicht (Vorschau)', '/?kurs=' + encodeURIComponent(k.id), 'link-ziel');
  weiter.appendChild(h('p', 'lk-unter', 'Die Schülerseiten können Sie als Vorschau öffnen – Ihre Antworten zählen dort nicht mit. ', vorschau));
  raster.appendChild(weiter);
  teile.push(raster);

  if (!k.aktiv) teile.unshift(G.notiz('Kurs gesperrt – nur lesend', 'Der Kurs ist im Portal gesperrt. Einstellungen lassen sich erst wieder ändern, wenn er dort entsperrt ist.'));
  panel.replaceChildren(...teile);
}
