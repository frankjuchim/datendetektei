// Kurs-Reiter „Scoreboard“ (Aufbau wie Algo Quest): Rangliste des Kurses so, wie Schülerinnen und Schüler sie auf
// /rangliste sehen (Top 10, GET /api/kurse/:kurs/rangliste – Lehrkräfte erhalten die Vorschau auch bei ausgeschaltetem
// Schalter), mit Hinweis, ob sie für die Schüler:innen sichtbar ist, und Weg zu den Einstellungen.

const V = new URL(import.meta.url).search;
const [G, RL] = await Promise.all([import('./gemeinsam.js' + V), import('../lernen/rangliste_teile.js' + V)]);
const { A, R } = G;
const { el, h, knopf } = R;

export async function zeige(panel, ctx) {
  const k = ctx.kurs;
  const d = await A.holen(A.kursApi(k.id, '/rangliste'));
  const { karte, kopf } = G.karte('Scoreboard', `${A.mehrzahl(d.teilnehmende || 0, 'Teilnehmer:in', 'Teilnehmende')} · die besten 10 mit Anzeigename, Rang und Punkten. Gleiche Punkte – gleicher Platz.`, { id: 'sb-titel' });
  const neu = knopf('Aktualisieren', 'knopf leise', 'i-uhr');
  neu.id = 'sb-neu';
  neu.addEventListener('click', async () => {
    neu.disabled = true;
    try {
      await zeige(panel, ctx);
    } catch (f) {
      panel.replaceChildren(G.fehlerNotiz(f));
    }
  });
  kopf.appendChild(neu);
  const sichtbar = k.einstellungen.scoreboard === true;
  const hinweis = el('p', sichtbar ? 'lk-unter' : 'banner rangliste-aus-hinweis');
  hinweis.id = 'sb-hinweis';
  hinweis.appendChild(
    document.createTextNode(
      sichtbar
        ? 'Das Scoreboard ist für Ihre Schülerinnen und Schüler sichtbar (Seite „Rangliste“ und Karte auf dem Stadtplan): die besten 10 und zusätzlich ihr eigener Platz. '
        : 'Das Scoreboard ist für Ihre Schülerinnen und Schüler ausgeblendet – Sie sehen hier nur die Vorschau. '
    )
  );
  const einst = el('a', 'link-ziel', sichtbar ? 'Einstellungen' : 'In den Einstellungen einschalten');
  einst.href = `#/kurs/${encodeURIComponent(k.id)}/einstellungen`;
  hinweis.appendChild(einst);
  const liste = el('div', 'sb-liste kurs-rangliste rangliste-seite');
  liste.id = 'sb-liste';
  liste.appendChild(RL.rangListe(d, 10) || el('p', 'hinweis-klein', 'Noch niemand im Kurs auf der Liste.'));
  const seite = A.linkKnopf('Rangliste als Seite öffnen', '/rangliste?kurs=' + encodeURIComponent(k.id), 'link-ziel');
  seite.prepend(R.icon('i-podest'));
  karte.append(hinweis, liste, h('p', 'lk-unter', seite));
  panel.replaceChildren(karte);
}
