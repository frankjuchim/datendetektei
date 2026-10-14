// Kurs-Reiter „Schüler“ (Aufbau wie Algo Quest): Liste der Schülerinnen und Schüler mit Platz, Anzeigename, Rang,
// Punkten, Anteil und „zuletzt aktiv“ (aus der Auswertung, ohne sub) sowie der Akten-Fortschritt des Kurses (bis 0.8.3
// Reiter „Übersicht“). Namen und persönliche Codes werden im Portal verwaltet. Ausgaben nur als Textknoten.

const V = new URL(import.meta.url).search;
const G = await import('./gemeinsam.js' + V);
const { A, R } = G;
const { el, h } = R;

function datumZeit(iso) {
  if (!iso) return '–';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '–' : d.toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
}

function schuelerTabelle(d) {
  const rahmen = el('div', 'tabelle-rahmen lk-tabelle');
  const t = el('table', 'daten');
  t.id = 'sl-tabelle';
  t.appendChild(el('caption', 'nur-sr', 'Schülerinnen und Schüler des Kurses'));
  const kopf = el('tr');
  for (const [text, klasse] of [['Platz', 'zahl'], ['Name'], ['Rang'], ['Punkte', 'zahl'], ['Anteil', 'zahl'], ['zuletzt aktiv']]) {
    const th = el('th', klasse || null, text);
    th.scope = 'col';
    kopf.appendChild(th);
  }
  t.appendChild(h('thead', null, kopf));
  const tbody = el('tbody');
  const zeilen = [...d.schueler].sort((a, b) => a.platz - b.platz || a.name.localeCompare(b.name, 'de'));
  for (const s of zeilen) {
    const name = el('th', null, s.name);
    name.scope = 'row';
    tbody.appendChild(
      h(
        'tr',
        null,
        el('td', 'zahl', `${s.platz}.`),
        name,
        el('td', null, s.rang),
        el('td', 'zahl', G.zahl(s.punkte.gesamt)),
        el('td', 'zahl', G.prozent(s.anteil)),
        el('td', null, datumZeit(s.zuletzt))
      )
    );
  }
  t.appendChild(tbody);
  rahmen.appendChild(t);
  return rahmen;
}

function aktenFortschritt(d) {
  const { karte } = G.karte('Akten-Fortschritt des Kurses', 'Ø Anteil der erreichbaren Punkte je Akte (nur Schülerinnen und Schüler).', { id: 'ue-akten' });
  const liste = el('ul', 'lk-akten');
  for (const a of d.akten) {
    const li = G.akteFarbe(el('li', 'lk-akte' + (a.freigeschaltet ? '' : ' gesperrt')), a.farbe);
    li.appendChild(a.freigeschaltet ? R.ring(a.anteil, { groesse: 48, label: `${G.akteKurz(a.nr)}: ${G.prozent(a.anteil)}` }) : R.icon('i-schloss'));
    const titel = G.akteKurz(a.nr) === 'Kür' ? String(a.titel || '').replace(/^Kür:\s*/, '') : a.titel;
    const text = h('span', 'lk-akte-text', el('strong', null, G.akteKurz(a.nr)), el('span', null, titel));
    if (!a.freigeschaltet) text.appendChild(el('span', null, 'gesperrt'));
    else if (a.verhoer) text.appendChild(el('span', null, `Verhör: ${a.verhoer.besiegt} von ${d.anzahlSchueler} besiegt`));
    li.appendChild(text);
    liste.appendChild(li);
  }
  karte.appendChild(liste);
  return karte;
}

export async function zeige(panel, ctx) {
  const k = ctx.kurs;
  const d = await ctx.auswertung();
  const teile = [];
  if (!k.aktiv) teile.push(G.notiz('Kurs gesperrt – nur lesend', 'Der Kurs ist im Portal gesperrt. Einstellungen lassen sich erst wieder ändern, wenn er dort entsperrt ist.'));

  const { karte } = G.karte('Schülerinnen und Schüler', `${G.mehrzahl(d.anzahlSchueler, 'Schüler:in', 'Schüler:innen')} · sortiert nach Punkten (gleiche Punkte – gleicher Platz).`, { id: 'sl-titel' });
  if (d.schueler.length) karte.appendChild(schuelerTabelle(d));
  else karte.appendChild(G.notiz('Noch niemand im Kurs', 'Schülerinnen und Schüler erscheinen hier, sobald sie über das Portal beigetreten sind und die Datendetektei geöffnet haben (Reiter „Beitritt“).'));
  const hinweis = el('p', 'lk-unter');
  hinweis.appendChild(document.createTextNode('Anzeigenamen und persönliche Codes ändern Sie im Portal InfoLabs; hier stehen nur Anzeigenamen. Die Schülerseiten können Sie als Vorschau öffnen – Ihre Antworten zählen dort nicht mit. '));
  hinweis.appendChild(A.linkKnopf('Schüleransicht (Vorschau)', '/?kurs=' + encodeURIComponent(k.id), 'link-ziel'));
  karte.appendChild(hinweis);
  teile.push(karte);
  teile.push(aktenFortschritt(d));
  panel.replaceChildren(...teile);
}
