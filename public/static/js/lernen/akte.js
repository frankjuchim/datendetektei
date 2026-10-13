// Akte-Übersicht (/akte/:nr, DESIGN.md §5.2): Kopf mit Ring, Ort und Briefing, je Ermittlung eine Karte mit Stand,
// Stempel und Aufgabenkacheln (offen, gelöst, angesehen), Verhör der Akte und Werkzeuge (Freie Ermittlung, Warm-up;
// in Akte 5 zusätzlich Bauplan-Tisch und Schema-Werkbank).

const V = new URL(import.meta.url).search;
const [A, R] = await Promise.all([import('../kern/api.js' + V), import('../kern/render.js' + V)]);
const { el, h } = R;

const ORT = {
  1: ['Fundbüro', 'Altstadt', 'fundbuero'],
  2: ['StadtRad-Station Hafenkante', 'Hafenviertel', 'stadtrad'],
  3: ['Festplatz', 'Weserufer', 'stadtfest'],
  4: ['Vereinsheim TuS', 'Mühlenfeld', 'tus'],
  5: ['Detektei', 'Altstadt', 'detektei'],
  6: ['Rathaus', 'Altstadt', 'datenspuren'],
  7: ['Detektei, Prüfungszimmer', 'Altstadt', null],
  8: ['Detektei, Werkstatt (Kür)', 'Altstadt', 'detektei'] // Kür K1 (Phase 6 Task 7): nicht im Abitur, ohne Rangwirkung
};
const ERLEDIGT = new Set(['geloest', 'nachgeloest', 'bearbeitet']);
const STATUS = { offen: 'offen', geloest: 'gelöst', nachgeloest: 'nachgelöst', angesehen: 'Lösung angesehen', bearbeitet: 'bearbeitet' };

const seite = document.getElementById('seite');
const nr = Number((/^\/akte\/([1-8])$/.exec(window.location.pathname) || [])[1]);
const KUER_NR = 8;
const aktenName = (n) => (n === KUER_NR ? 'Kür K1' : `Akte ${n}`);

function kachel(a, ermittlung, cc = false) {
  const link = el('a', 'kachel' + (cc ? ' cc' : ''), cc ? 'CC' : a.id.slice(-2));
  link.href = `/ermittlung/${ermittlung}?aufgabe=${encodeURIComponent(a.id)}`;
  if (ERLEDIGT.has(a.status)) link.classList.add('erledigt');
  if (a.status === 'angesehen') link.classList.add('angesehen');
  link.setAttribute('aria-label', `${cc ? 'Cold Case' : 'Aufgabe ' + Number(a.id.slice(-2))}: ${a.titel} – ${STATUS[a.status] || a.status}`);
  link.title = a.titel;
  return h('li', null, link);
}

function ermittlungKarte(e) {
  const karte = el('article', 'aktendeckel ermittlung-karte');
  karte.appendChild(el('span', 'reiter', `Ermittlung ${e.nr}`));
  const innen = el('div', 'aktendeckel-innen');
  const kopf = el('div', 'ermittlung-karte-kopf');
  const titel = el('h2');
  const link = el('a', 'titel-link', e.titel);
  link.href = `/ermittlung/${e.id}`;
  titel.appendChild(link);
  kopf.appendChild(titel);
  if (e.anzahl > 0 && e.geloest >= e.anzahl) kopf.appendChild(R.stempel('Gelöst', 'geloest'));
  innen.appendChild(kopf);
  // Ermittlung ohne Lab-Aufgaben (Akte 7, Generalprobe): nur Briefing und Ermittler-Notiz, geprüft wird im Verhör
  const ohneAufgaben = e.anzahl === 0 && !e.coldCase;
  const info = ohneAufgaben ? ['ohne Lab-Aufgaben – die Generalprobe ist das Verhör'] : [`${e.geloest} von ${e.anzahl} erledigt`, `${e.punkte} von ${e.maxPunkte} Punkten`];
  if (Array.isArray(e.ds) && e.ds.length) info.push(`DS ${e.ds.join(', ')}`);
  if (e.niveau === 'eA') info.push('nur eA');
  innen.appendChild(el('p', 'etikett zahlen', info.join(' · ')));
  if (e.briefing) innen.appendChild(h('blockquote', 'briefing', R.md(e.briefing)));
  const liste = el('ol', 'kacheln');
  liste.setAttribute('aria-label', `Aufgaben der Ermittlung ${e.nr}`);
  for (const a of e.aufgaben) liste.appendChild(kachel(a, e.id));
  if (e.coldCase) liste.appendChild(kachel(e.coldCase, e.id, true));
  innen.appendChild(liste);
  const reihe = el('div', 'knopf-reihe');
  if (ohneAufgaben) reihe.appendChild(A.linkKnopf('Ermittler-Notiz lesen', `/ermittlung/${e.id}`, 'knopf'));
  else reihe.appendChild(A.linkKnopf(e.geloest === 0 ? 'Ermittlung beginnen' : e.geloest >= e.anzahl ? 'Ermittlung ansehen' : 'Weiter ermitteln', `/ermittlung/${e.id}`, e.geloest >= e.anzahl ? 'knopf' : 'knopf primaer'));
  innen.appendChild(reihe);
  karte.appendChild(innen);
  return karte;
}

function verhoerKarte(akte) {
  const v = akte.verhoer;
  const karte = el('section', 'karte verhoer-karte');
  karte.setAttribute('aria-labelledby', 'verhoer-titel');
  const kopf = el('div', 'karte-kopf');
  const t = el('h2');
  t.id = 'verhoer-titel';
  t.append(R.icon('i-verhoer'), document.createTextNode(v.titel));
  kopf.appendChild(t);
  if (v.besiegt) kopf.appendChild(R.stempel(`Besiegt · ${Math.round((v.bester.punkte / v.bester.max) * 100)} %`, 'geloest'));
  karte.appendChild(kopf);
  const text = v.frei ? 'Das Verhör ist bereit: mit Zeitlimit und ohne Rückmeldung. Der beste Versuch zählt, ein neuer ist nach 12 Stunden möglich.' : v.grund;
  karte.appendChild(el('p', 'hinweis-klein', text));
  if (v.bester) karte.appendChild(el('p', 'etikett zahlen', `Bester Versuch: ${v.bester.punkte} von ${v.bester.max} Punkten`));
  const reihe = el('div', 'knopf-reihe');
  reihe.appendChild(A.linkKnopf(v.frei ? 'Zum Verhör' : 'Verhör ansehen', `/verhoer/${akte.nr}`, v.frei && !v.besiegt ? 'knopf primaer' : 'knopf'));
  karte.appendChild(reihe);
  return karte;
}

function werkzeuge(akte) {
  const karte = el('section', 'karte werkzeug-karte');
  karte.appendChild(el('h2', null, 'Werkzeuge'));
  const reihe = el('div', 'knopf-reihe');
  const db = ORT[akte.nr][2];
  if (db) {
    const a = A.linkKnopf('Freie Ermittlung', `/konsole/${db}`, 'knopf');
    a.prepend(R.icon('i-konsole'));
    reihe.appendChild(a);
  }
  if (!akte.kuer) {
    const w = A.linkKnopf(`Warm-up Akte ${akte.nr}`, `/warmup?akte=${akte.nr}`, 'knopf');
    w.prepend(R.icon('i-karte'));
    reihe.appendChild(w);
  }
  const t = A.linkKnopf('Trainingsplatz', '/training', 'knopf');
  t.prepend(R.icon('i-hantel'));
  reihe.appendChild(t);
  if (akte.nr === 5) {
    // Modellierungs-Werkzeuge (Phase 5): frei zeichnen und Relationen anlegen, ohne Prüfung
    const b = A.linkKnopf('Bauplan-Tisch', '/werkzeug/bauplan', 'knopf');
    b.prepend(R.icon('i-bauplan'));
    const wb = A.linkKnopf('Schema-Werkbank', '/werkzeug/werkbank', 'knopf');
    wb.prepend(R.icon('i-karte'));
    reihe.append(b, wb);
  }
  karte.appendChild(reihe);
  return karte;
}

async function start() {
  if (!seite || !nr) return;
  const kontext = await A.kursKontext(seite);
  if (!kontext) return;
  let stand;
  let plan;
  try {
    [stand, plan] = await Promise.all([A.holen(A.kursApi(kontext.kurs.id, '/stand')), A.holen('/api/akten')]);
  } catch (f) {
    seite.replaceChildren(A.fehlerKarte(f));
    return;
  }
  const akte = stand.akten.find((a) => a.nr === nr);
  const info = (plan.akten || []).find((a) => a.nr === nr);
  const [ort, stadtteil] = ORT[nr];
  document.title = `${aktenName(nr)}: ${(akte || info || {}).titel || ''} – Datendetektei`;
  if (!akte || !akte.frei) {
    const nichtImNiveau = info && !info.niveaus.includes(stand.kurs.niveau);
    seite.replaceChildren(
      ...[
        A.vorschauHinweis(kontext),
        A.leerKarte(
          `${aktenName(nr)}${(info || {}).titel ? ': ' + info.titel : ''}`,
          nr === KUER_NR
            ? 'Die Kür ist nicht im Abitur und nur für das erhöhte Anforderungsniveau vorgesehen. Deine Lehrkraft schaltet sie frei, wenn Zeit dafür ist.'
            : nichtImNiveau ? 'Diese Akte gehört nicht zu eurem Kursniveau.' : 'Diese Akte liegt noch im Nebel. Deine Lehrkraft schaltet sie frei, sobald ihr so weit seid.',
          [A.linkKnopf('Zum Stadtplan', '/', 'knopf')]
        )
      ].filter(Boolean)
    );
    return;
  }
  const mitAufgaben = akte.ermittlungen.filter((e) => e.anzahl > 0);
  const geschlossen = mitAufgaben.length > 0 && mitAufgaben.every((e) => e.geloest >= e.anzahl);
  const kopf = el('section', 'aktendeckel akte-kopf-karte');
  kopf.appendChild(el('span', 'reiter rot', aktenName(nr)));
  const innen = el('div', 'aktendeckel-innen');
  const zeile = el('div', 'akte-detail-kopf');
  zeile.appendChild(R.ring(akte.anteil, { geschlossen, label: `${Math.round(akte.anteil * 100)} Prozent der Punkte` }));
  const titel = h('div', 'seiten-kopf', el('p', 'etikett', `${ort} · ${stadtteil}`), el('h1', null, akte.titel), el('p', 'zahlen', akte.maxPunkte ? `${akte.punkte} von ${akte.maxPunkte} Punkten` : 'ohne Lab-Punkte – es zählt das Verhör'));
  zeile.appendChild(titel);
  if (akte.kuer) zeile.appendChild(R.stempel('KÜR – nicht im Abitur', 'kuer'));
  else if (geschlossen) zeile.appendChild(R.stempel('Akte geschlossen', 'geloest'));
  innen.appendChild(zeile);
  if (!akte.freigeschaltet) innen.appendChild(el('p', 'banner', 'Diese Akte ist im Kurs noch nicht freigeschaltet – Sie sehen sie als Lehrkraft.'));
  kopf.appendChild(innen);

  const raster = el('div', 'ermittlungen-raster');
  for (const e of akte.ermittlungen) raster.appendChild(ermittlungKarte(e));
  const unten = el('div', 'akte-unten');
  if (akte.verhoer) unten.appendChild(verhoerKarte(akte));
  unten.appendChild(werkzeuge(akte));
  seite.replaceChildren(...[A.vorschauHinweis(kontext), kopf, raster, unten].filter(Boolean));
  document.documentElement.dataset.seite = 'bereit';
}

start();
