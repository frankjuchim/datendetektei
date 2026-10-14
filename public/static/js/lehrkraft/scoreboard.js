// Kurs-Reiter „Scoreboard“ (Aufbau wie Algo Quest): Rangliste des Kurses so, wie Schülerinnen und Schüler sie auf
// /rangliste sehen (Top 10, GET /api/kurse/:kurs/rangliste – Lehrkräfte erhalten die Vorschau auch bei ausgeschaltetem
// Schalter), mit Hinweis, ob sie für die Schüler:innen sichtbar ist, und Weg zu den Einstellungen.

const V = new URL(import.meta.url).search;
const [G, RL] = await Promise.all([import('./gemeinsam.js' + V), import('../lernen/rangliste_teile.js' + V)]);
const { A, R } = G;
const { el, h } = R;

const TAKT_MS = 20000; // wie Algo Quest: alle 20 Sekunden neu laden
let generation = 0;

const uhrzeit = () => new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

function standText(fehler) {
  return `Aktualisiert sich alle 20 Sekunden selbst (zuletzt ${uhrzeit()})` + (fehler ? ' – letzte Aktualisierung fehlgeschlagen, neuer Versuch folgt.' : '.');
}

export async function zeige(panel, ctx) {
  const k = ctx.kurs;
  const meine = ++generation;
  const d = await A.holen(A.kursApi(k.id, '/rangliste'));
  const { karte } = G.karte('Scoreboard', `${A.mehrzahl(d.teilnehmende || 0, 'Teilnehmer:in', 'Teilnehmende')} · die besten 10 mit Anzeigename, Rang und Punkten. Gleiche Punkte – gleicher Platz.`, { id: 'sb-titel' });
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
  const fuelle = (daten) => liste.replaceChildren(RL.rangListe(daten, 10) || el('p', 'hinweis-klein', 'Noch niemand im Kurs auf der Liste.'));
  fuelle(d);
  const stand = el('p', 'hinweis-klein', standText(false));
  stand.id = 'sb-stand';
  stand.setAttribute('aria-live', 'polite');
  const seite = A.linkKnopf('Rangliste als Seite öffnen', '/rangliste?kurs=' + encodeURIComponent(k.id), 'link-ziel');
  seite.prepend(R.icon('i-podest'));
  karte.append(hinweis, liste, stand, h('p', 'lk-unter', seite));
  panel.replaceChildren(karte);

  // Selbst aktualisieren, solange genau diese Ansicht sichtbar ist (Reiterwechsel, anderer Kurs oder neue Ansicht beenden es)
  const aktiv = () => meine === generation && liste.isConnected && !panel.hidden;
  const takt = () =>
    setTimeout(async () => {
      if (!aktiv()) return;
      let fehler = false;
      try {
        const neu = await A.holen(A.kursApi(k.id, '/rangliste'));
        if (!aktiv()) return;
        fuelle(neu);
      } catch {
        fehler = true; // alte Liste bleibt stehen
      }
      if (!aktiv()) return;
      stand.textContent = standText(fehler);
      takt();
    }, TAKT_MS);
  takt();
}
