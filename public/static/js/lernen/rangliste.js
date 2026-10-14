// Rangliste des Kurses (/rangliste, Scoreboard nach Vertrag §4, Kurseinstellung scoreboard): Top 10 + eigener Platz aus
// GET /api/kurse/:kurs/rangliste, eigene Zeile hervorgehoben (Darstellung aus rangliste_teile.js, wie die Karte auf dem
// Stadtplan). Schalter aus: Schüler:innen eine freundliche Meldung (die API antwortet ihnen 404), Lehrkräfte und
// Superadmin die Vorschau mit Hinweis, wo man die Rangliste einschaltet. Ausgaben nur als Textknoten.

const V = new URL(import.meta.url).search;
const [A, R, RL] = await Promise.all([import('../kern/api.js' + V), import('../kern/render.js' + V), import('./rangliste_teile.js' + V)]);
const { el, h } = R;

const seite = document.getElementById('seite');

function ausMeldung() {
  return A.leerKarte('Rangliste ausgeschaltet', 'Deine Lehrkraft hat die Rangliste für diesen Kurs nicht eingeschaltet.', [
    A.linkKnopf('Zum Stadtplan', '/', 'knopf primaer')
  ]);
}

function vorschauHinweisAus(kurs) {
  const box = el('div', 'banner rangliste-aus-hinweis');
  box.setAttribute('role', 'note');
  box.append(
    el('strong', null, 'Die Rangliste ist für diesen Kurs ausgeschaltet.'),
    document.createTextNode(' Ihre Schülerinnen und Schüler sehen sie nicht. Einschalten können Sie sie im Lehrkraft-Bereich unter „Einstellungen“ → „Scoreboard“. ')
  );
  const a = el('a', 'banner-link', 'Zu den Einstellungen');
  a.href = `/lehrkraft?kurs=${encodeURIComponent(kurs.id)}#einstellungen`;
  box.appendChild(a);
  return box;
}

async function start() {
  if (!seite) return;
  const kontext = await A.kursKontext(seite);
  if (!kontext) return;
  const { kurs, vorschau } = kontext;
  const wechsel = A.kursWechselLink(kontext);
  // Schüler:innen: Schalter aus (laut /api/ich) → keine Anfrage, nur die Meldung
  if (!vorschau && kurs.scoreboard === false) {
    seite.replaceChildren(...[wechsel, ausMeldung()].filter(Boolean));
    document.documentElement.dataset.seite = 'bereit';
    return;
  }
  let d;
  try {
    d = await A.holen(A.kursApi(kurs.id, '/rangliste'));
  } catch (f) {
    seite.replaceChildren(...[wechsel, !vorschau && f && f.status === 404 ? ausMeldung() : A.fehlerKarte(f)].filter(Boolean));
    document.documentElement.dataset.seite = 'bereit';
    return;
  }
  const kopf = h(
    'div',
    'seiten-kopf',
    el('span', 'etikett', `Scoreboard · ${d.kurs.name}`),
    el('h1', null, vorschau ? 'Rangliste des Kurses' : 'Rangliste deines Kurses'),
    el(
      'p',
      null,
      vorschau
        ? 'Vorschau: Schülerinnen und Schüler sehen die besten 10 und zusätzlich ihren eigenen Platz – mit Anzeigename, Rang und Punkten, nur für Mitglieder dieses Kurses. Gleiche Punkte – gleicher Platz.'
        : 'Die besten 10 deines Kurses und dein eigener Platz. Gleiche Punkte – gleicher Platz. Sichtbar sind nur Anzeigenamen.'
    )
  );
  const karte = el('section', 'karte kurs-rangliste rangliste-seite');
  karte.id = 'kurs-rangliste';
  karte.setAttribute('aria-labelledby', 'rangliste-titel');
  const titel = el('h2', null, `${A.mehrzahl(d.teilnehmende, 'Teilnehmer:in', 'Teilnehmende')} im Kurs`);
  titel.id = 'rangliste-titel';
  karte.append(titel, RL.rangListe(d, 10) || el('p', 'hinweis-klein', 'Noch niemand im Kurs auf der Liste.'));
  seite.replaceChildren(...[A.vorschauHinweis(kontext), vorschau && d.aktiv === false ? vorschauHinweisAus(kurs) : null, wechsel, kopf, karte].filter(Boolean));
  document.documentElement.dataset.seite = 'bereit';
}

start();
