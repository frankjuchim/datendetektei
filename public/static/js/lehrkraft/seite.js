// Seite /lehrkraft – Aufbau wie der Lehrkraft-Bereich von Algo Quest (Wiedererkennung im Verbund InfoLabs, DESIGN §5.11):
// Kopf-Navigation Kurse · Aufgaben · Materialien · Themen · Verwaltung (nur Superadmin) und Hash-Routen
//   #/                              Meine Kurse (Superadmin: Alle Kurse) als Tabelle
//   #/kurs/<kurs-id>/<reiter>       Kursseite: Schüler · Beitritt · Auswertung · Scoreboard · Einstellungen · Live
//   #/aufgaben[/akte/<nr>|/aufgabe/<id>]   Aufgaben aller Akten mit Lösungen (kursunabhängig)
//   #/materialien                   Materialien (Downloads nach Rolle)
//   #/verwaltung/<reiter>           Superadmin: Inhalte, Sicherung
// Alte Adressen (?kurs=k:17#auswertung, #vorschau, #system …) werden einmalig auf die neuen Routen umgeleitet. Reiter
// nach WAI-ARIA (←/→, Pos1/Ende), Zurück-Knopf über hashchange. Inhalte je Reiter werden erst beim Öffnen geladen
// (eigene Module). Ausgaben nur als Textknoten.

const V = new URL(import.meta.url).search;
const G = await import('./gemeinsam.js' + V);
const { A, R } = G;
const { el, h } = R;

const $ = (id) => document.getElementById(id);
const KURS_SCHLUESSEL = 'dd-kurs';
const KURS_RE = /^k:\d{1,12}$/;

/** Reiter der Kursseite: gemeinsame Reiter in der Reihenfolge von Algo Quest, „Live“ (nur Datendetektei) am Ende. */
const KURS_REITER = [
  ['schueler', 'Schüler', 'i-person', 'schueler.js'],
  ['beitritt', 'Beitritt', 'i-karte', 'beitritt.js'],
  ['auswertung', 'Auswertung', 'i-lehrkraft', 'auswertung.js'],
  ['scoreboard', 'Scoreboard', 'i-podest', 'scoreboard.js'],
  ['einstellungen', 'Einstellungen', 'i-stift', 'einstellungen.js'],
  ['live', 'Live', 'i-play', 'live.js']
];
const VERWALTUNG_REITER = [
  ['inhalte', 'Inhalte', 'i-liste'],
  ['sicherung', 'Sicherung', 'i-schloss']
];
/** Alte Reiter-Namen (#reiter bis 0.8.3) → neue Route. */
const ALT_KURS = { uebersicht: 'schueler', urkunden: 'schueler', board: 'beitritt', einstellungen: 'einstellungen', auswertung: 'auswertung', live: 'live' };
const ALT_SEITE = { vorschau: '#/aufgaben', materialien: '#/materialien', system: '#/verwaltung/inhalte' };

export const kursRoute = (kursId, reiter = 'schueler') => `#/kurs/${encodeURIComponent(kursId)}/${reiter}`;

const DD = window.DD || {};
const ich = DD.ich ? await DD.ich.catch(() => null) : null;
const istAdmin = !!ich && ich.rolle === 'superadmin';
if (istAdmin) $('lk-nav').querySelector('[data-bereich="verwaltung"]').hidden = false;
let portal = ich && ich.portalUrl ? ich.portalUrl : null;
if (!portal && DD.plattform) {
  try {
    const m = await DD.plattform;
    portal = m && m.auth && m.auth.portal ? m.auth.portal : null;
  } catch {
    portal = null;
  }
}

/** Zustand der Seite; die Module bekommen ihn als ctx. */
const ctx = {
  ich,
  istAdmin,
  portal: typeof portal === 'string' && /^https?:\/\//.test(portal) ? portal.replace(/\/+$/, '') : null,
  akten: [],
  kurse: [],
  kurs: null,
  cache: new Map(),
  /** Auswertung des aktuellen Kurses (einmal je Kurs geladen; neu: true lädt neu). */
  auswertung({ neu = false } = {}) {
    const schluessel = 'auswertung:' + ctx.kurs.id;
    if (neu || !ctx.cache.has(schluessel)) {
      const p = A.holen(G.lkApi(ctx.kurs.id, '/auswertung'));
      p.catch(() => ctx.cache.delete(schluessel));
      ctx.cache.set(schluessel, p);
    }
    return ctx.cache.get(schluessel);
  },
  /** Kurs nach einer Änderung (PUT/POST) übernehmen; Kopf neu zeichnen, übrige Reiter beim nächsten Öffnen neu aufbauen. */
  kursAktualisiert(k, { ausser = null } = {}) {
    const i = ctx.kurse.findIndex((x) => x.id === k.id);
    if (i >= 0) ctx.kurse[i] = k;
    ctx.kurs = k;
    ctx.cache.delete('auswertung:' + k.id);
    if (ansicht && ansicht.art === 'kurs' && ansicht.kursId === k.id) {
      zeichneKursKopf(ansicht);
      ansicht.reiter.vergiss(ausser);
    }
  },
  /** Reiter des aktuellen Kurses öffnen (Adresse ändert sich, Zurück-Knopf funktioniert). */
  oeffne: (reiter) => {
    window.location.hash = kursRoute(ctx.kurs.id, reiter);
  }
};

let kurseFehler = null;
async function ladeKurse() {
  try {
    const d = await A.holen('/api/lehrkraft/kurse');
    ctx.akten = Array.isArray(d.akten) ? d.akten : [];
    ctx.kurse = Array.isArray(d.kurse) ? d.kurse : [];
    kurseFehler = null;
  } catch (f) {
    kurseFehler = f;
  }
}

const module = new Map();
async function modul(datei) {
  if (!module.has(datei)) module.set(datei, await import('./' + datei + V));
  return module.get(datei);
}

/* ---------------------------------------------------------------- Rahmen */

let ansicht = null; // { art, kursId?, reiter? }
let lauf = 0;

function setzeNav(bereich) {
  for (const a of $('lk-nav').querySelectorAll('a[data-bereich]')) {
    if (a.dataset.bereich === bereich) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
}

function setzeKopfKurs(k) {
  const kopf = $('kopf-kurs');
  if (!kopf) return;
  kopf.replaceChildren();
  if (!k) return;
  kopf.append(document.createTextNode('Kurs '), el('strong', null, k.name || k.id), document.createTextNode(` · ${k.einstellungen.niveau}`));
}

/** Neue Ansicht in #lk-ansicht (alte Live-Steuerung schließen). */
function neueAnsicht(art, teile, { titel, bereich, extra = {} }) {
  schliesseLive();
  ansicht = { art, ...extra };
  $('lk-ansicht').replaceChildren(...teile.filter(Boolean));
  setzeNav(bereich);
  document.title = `${titel} – Lehrkraft-Bereich – Datendetektei`;
  if (art !== 'kurs') setzeKopfKurs(null);
  return ansicht;
}

function schliesseLive() {
  const live = module.get('live.js');
  if (live && typeof live.schliessen === 'function') live.schliessen();
}

const laedt = (text = 'Wird geladen …') => el('p', 'lk-laedt', text);

function seitenKopf(etikett, titel, text) {
  const kopf = h('div', 'seiten-kopf', el('span', 'etikett', etikett), el('h1', null, titel));
  if (text) kopf.appendChild(el('p', null, text));
  return kopf;
}

function portalLink(text = 'Zum Portal InfoLabs', klasse = 'knopf') {
  if (!ctx.portal) return null;
  const a = A.linkKnopf(text, ctx.portal + '/', klasse);
  a.prepend(R.icon('i-haus'));
  return a;
}

/* ---------------------------------------------------------------- Reiter (Kursseite, Verwaltung) */

/**
 * Reiterleiste mit Panels (#reiter-<key>, #panel-<key>). Klick und Pfeiltasten zeigen den Reiter sofort und setzen die
 * Adresse (ziel(key)); route() erkennt dann, dass er schon offen ist. lade(key, panel) baut den Inhalt beim ersten Öffnen.
 */
function reiterAnsicht({ id, label, liste, ziel, lade }) {
  const leiste = el('div', 'lk-reiter');
  leiste.id = id;
  leiste.setAttribute('role', 'tablist');
  leiste.setAttribute('aria-label', label);
  const panels = [];
  const knoepfe = new Map();
  const gezeigt = new Set();
  let aktiv = null;
  for (const [key, text, icon] of liste) {
    const b = el('button', 'lk-reiter-knopf');
    b.type = 'button';
    b.id = 'reiter-' + key;
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-controls', 'panel-' + key);
    b.setAttribute('aria-selected', 'false');
    b.tabIndex = -1;
    b.append(R.icon(icon), document.createTextNode(text));
    b.addEventListener('click', () => waehle(key));
    b.addEventListener('keydown', tastatur);
    knoepfe.set(key, b);
    leiste.appendChild(b);
    const p = el('section', 'lk-panel');
    p.id = 'panel-' + key;
    p.setAttribute('role', 'tabpanel');
    p.setAttribute('aria-labelledby', b.id);
    p.tabIndex = 0;
    p.hidden = true;
    panels.push(p);
  }
  const keys = liste.map((x) => x[0]);

  function tastatur(e) {
    const i = keys.indexOf(aktiv);
    let z = null;
    if (e.key === 'ArrowRight') z = keys[(i + 1) % keys.length];
    else if (e.key === 'ArrowLeft') z = keys[(i - 1 + keys.length) % keys.length];
    else if (e.key === 'Home') z = keys[0];
    else if (e.key === 'End') z = keys[keys.length - 1];
    if (!z) return;
    e.preventDefault();
    waehle(z, { fokusReiter: true });
  }

  function waehle(key, opt = {}) {
    zeige(key, opt);
    const neu = ziel(key);
    if (window.location.hash !== neu) window.location.hash = neu;
  }

  async function zeige(key, { fokusReiter = false } = {}) {
    if (!knoepfe.has(key)) key = keys[0];
    aktiv = key;
    for (const k of keys) {
      const an = k === key;
      knoepfe.get(k).setAttribute('aria-selected', an ? 'true' : 'false');
      knoepfe.get(k).tabIndex = an ? 0 : -1;
      $('panel-' + k).hidden = !an;
    }
    const knopf = knoepfe.get(key);
    if (fokusReiter) {
      knopf.focus();
      if (knopf.scrollIntoView) knopf.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
    const panel = $('panel-' + key);
    if (gezeigt.has(key) && panel.childElementCount) return;
    gezeigt.add(key);
    panel.replaceChildren(laedt());
    try {
      await lade(key, panel);
    } catch (f) {
      gezeigt.delete(key);
      panel.replaceChildren(G.fehlerNotiz(f));
    }
  }

  return {
    teile: [h('div', 'lk-reiter-huelle', leiste), ...panels],
    zeige,
    aktiv: () => aktiv,
    /** Inhalte beim nächsten Öffnen neu aufbauen (außer dem genannten Reiter). */
    vergiss(ausser = null) {
      for (const k of keys) if (k !== ausser) gezeigt.delete(k);
    }
  };
}

/* ---------------------------------------------------------------- Kurse */

function datumZeit(iso) {
  if (!iso) return '–';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '–' : d.toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
}

function niveauEtikett(niveau) {
  return el('span', 'niveau ' + (niveau === 'eA' ? 'ea' : 'ga'), niveau);
}

async function zeigeKursliste(nr) {
  await ladeKurse();
  if (nr !== lauf) return;
  const titel = istAdmin ? 'Alle Kurse' : 'Meine Kurse';
  const name = ich && ich.name ? ich.name : null;
  const kopf = seitenKopf(
    istAdmin ? 'Lehrkraft-Bereich · Admin' : 'Lehrkraft-Bereich',
    titel,
    `${name ? `Guten Tag, ${name}${/[.!?]$/.test(name) ? '' : '.'} ` : ''}Öffnen Sie einen Kurs, um Schülerinnen und Schüler, Beitritt und Beamer-Board, Auswertung, Scoreboard, Einstellungen und Live-Runden zu sehen. Aufgaben samt Lösungen und Materialien finden Sie oben in der Navigation.`
  );
  const teile = [kopf];
  if (kurseFehler) {
    teile.push(G.fehlerNotiz(kurseFehler, 'Die Kurse konnten nicht geladen werden'));
  } else if (!ctx.kurse.length) {
    teile.push(
      G.notiz(
        'Noch keine Kurse',
        istAdmin
          ? 'Es gibt noch keine Kurse. Kurse entstehen, sobald sich eine Lehrkraft oder ein Schüler aus einem Kurs des Portals anmeldet.'
          : 'Ihnen ist noch kein Kurs zugeordnet. Kurse legen Sie im Portal an und schalten dort die Datendetektei frei.'
      )
    );
  } else {
    const rahmen = el('div', 'tabelle-rahmen lk-kursliste');
    const t = el('table', 'daten');
    t.id = 'kl-tabelle';
    t.appendChild(el('caption', 'nur-sr', titel));
    const kopfZeile = el('tr');
    for (const [text, klasse] of [['Kurs'], ['Niveau'], ['Schüler:innen', 'zahl'], ['Fortschritt Ø', 'zahl'], ['zuletzt aktiv'], ['Aktion', 'nur-sr-text']]) {
      const th = el('th', klasse || null);
      th.scope = 'col';
      if (klasse === 'nur-sr-text') th.appendChild(el('span', 'nur-sr', text));
      else th.textContent = text;
      kopfZeile.appendChild(th);
    }
    t.appendChild(h('thead', null, kopfZeile));
    const tbody = el('tbody');
    for (const k of ctx.kurse) {
      const z = k.kennzahlen || { schueler: 0, anteil: 0, zuletzt: null };
      const link = el('a', 'lk-tabelle-link', k.name || k.id);
      link.href = kursRoute(k.id);
      const name = el('th', null);
      name.scope = 'row';
      name.appendChild(link);
      if (!k.aktiv) name.appendChild(el('span', 'status inaktiv', ' gesperrt'));
      const oeffnen = A.linkKnopf('Öffnen', kursRoute(k.id), 'knopf');
      oeffnen.setAttribute('aria-label', `Kurs ${k.name || k.id} öffnen`);
      tbody.appendChild(
        h(
          'tr',
          null,
          name,
          h('td', null, niveauEtikett(k.einstellungen.niveau)),
          el('td', 'zahl', G.zahl(z.schueler)),
          el('td', 'zahl', z.schueler ? G.prozent(z.anteil) : '–'),
          el('td', null, datumZeit(z.zuletzt)),
          h('td', null, oeffnen)
        )
      );
    }
    t.appendChild(tbody);
    rahmen.appendChild(t);
    teile.push(rahmen);
  }
  const hinweis = el('p', 'lk-unter');
  hinweis.appendChild(
    document.createTextNode(
      'Kurse legen Sie im Portal InfoLabs an und schalten dort die Datendetektei frei; Schülerinnen und Schüler treten dort mit dem Kurscode bei. Nach der nächsten Anmeldung über das Portal erscheinen neue Kurse hier. '
    )
  );
  const p = portalLink('Zum Portal', 'link-ziel');
  if (p) hinweis.appendChild(p);
  teile.push(hinweis);
  neueAnsicht('kurse', teile, { titel, bereich: 'kurse' });
}

function zeichneKursKopf(a) {
  const k = ctx.kurs;
  a.titel.replaceChildren(document.createTextNode(k.name || k.id), document.createTextNode(' '), niveauEtikett(k.einstellungen.niveau));
  if (!k.aktiv) a.titel.appendChild(el('span', 'status inaktiv', 'gesperrt'));
  a.krumenName.textContent = k.name || k.id;
  setzeKopfKurs(k);
  // Kennzahlen (die Kür, Welt 8, zählt nicht als Akte)
  const kuerNr = new Set(ctx.akten.filter((x) => x.kuer).map((x) => x.nr));
  const akten = k.einstellungen.akten.filter((nr) => !kuerNr.has(nr)).length;
  const kuer = k.einstellungen.akten.some((nr) => kuerNr.has(nr));
  const z = k.kennzahlen || { schueler: 0, anteil: 0 };
  a.kennzahlen.replaceChildren(
    G.kennzahl(G.zahl(z.schueler), z.schueler === 1 ? 'Schüler:in' : 'Schüler:innen'),
    G.kennzahl(G.prozent(z.anteil), 'Ø der freigeschalteten Punkte'),
    G.kennzahl(k.einstellungen.niveau, k.einstellungen.niveau === 'eA' ? 'erhöhtes Niveau' : 'grundlegendes Niveau'),
    G.kennzahl(G.zahl(akten), (akten === 1 ? 'Akte frei' : 'Akten frei') + (kuer ? ' + Kür' : ''))
  );
  if (!k.aktiv) a.kennzahlen.appendChild(el('span', 'status inaktiv', 'Kurs gesperrt – nur lesend'));
}

async function zeigeKurs(nr, kursId, reiter) {
  if (ansicht && ansicht.art === 'kurs' && ansicht.kursId === kursId && ctx.kurs) {
    // gleicher Kurs: nur den Reiter wechseln
    if (ansicht.reiter.aktiv() !== reiter) await ansicht.reiter.zeige(reiter);
    return;
  }
  if (!ctx.kurse.length && !kurseFehler) await ladeKurse();
  if (nr !== lauf) return;
  const k = KURS_RE.test(kursId || '') ? ctx.kurse.find((x) => x.id === kursId) : null;
  const krumen = el('nav', 'lk-krumen');
  krumen.id = 'lk-krumen';
  krumen.setAttribute('aria-label', 'Brotkrumen');
  const zurKursliste = el('a', null, 'Kurse');
  zurKursliste.href = '#/';
  const trenner = el('span', 'lk-krumen-trenner', '›');
  trenner.setAttribute('aria-hidden', 'true');
  const krumenName = el('span', null, k ? k.name || k.id : 'Kurs');
  krumenName.setAttribute('aria-current', 'page');
  krumen.append(zurKursliste, trenner, krumenName);
  if (!k) {
    const text = kurseFehler
      ? kurseFehler.message || 'Die Kurse konnten nicht geladen werden.'
      : 'Diesen Kurs gibt es nicht oder Sie haben keinen Zugriff darauf. Wählen Sie einen Kurs aus der Liste.';
    neueAnsicht('fehler', [krumen, G.notiz('Kurs nicht gefunden', text), h('div', 'knopf-reihe', A.linkKnopf('Zu den Kursen', '#/', 'knopf primaer'))], {
      titel: 'Kurs nicht gefunden',
      bereich: 'kurse'
    });
    return;
  }
  ctx.kurs = k;
  A.schreib(KURS_SCHLUESSEL, k.id);
  const titel = el('h1', 'lk-kurs-titel');
  titel.id = 'lk-titel';
  const urkunden = A.linkKnopf('Urkunden', '/lehrkraft/urkunden?kurs=' + encodeURIComponent(k.id), 'knopf');
  urkunden.id = 'lk-urkunden';
  urkunden.prepend(R.icon('i-stern'));
  const live = A.linkKnopf('Live-Runde', kursRoute(k.id, 'live'), 'knopf');
  live.id = 'lk-live-knopf';
  live.prepend(R.icon('i-play'));
  const kennzahlen = el('p', 'lk-kennzahlen');
  kennzahlen.id = 'lk-kennzahlen';
  const reiterTeil = reiterAnsicht({
    id: 'lk-reiter',
    label: 'Bereiche des Kurses',
    liste: KURS_REITER,
    ziel: (key) => kursRoute(k.id, key),
    lade: async (key, panel) => {
      const m = await modul(KURS_REITER.find((x) => x[0] === key)[3]);
      await m.zeige(panel, ctx);
    }
  });
  const a = neueAnsicht(
    'kurs',
    [krumen, h('div', 'lk-kurs-kopf', titel, h('div', 'knopf-reihe', urkunden, live)), kennzahlen, ...reiterTeil.teile],
    { titel: k.name || k.id, bereich: 'kurse', extra: { kursId: k.id, reiter: reiterTeil } }
  );
  Object.assign(a, { titel, krumenName, kennzahlen });
  zeichneKursKopf(a);
  await reiterTeil.zeige(reiter);
}

/* ---------------------------------------------------------------- Aufgaben, Materialien, Verwaltung */

async function zeigeAufgaben(nr, art, arg) {
  const container = el('div', 'lk-seiten-inhalt');
  container.id = 'seite-aufgaben';
  container.appendChild(laedt());
  neueAnsicht('aufgaben', [container], { titel: 'Aufgaben', bereich: 'aufgaben' });
  try {
    const m = await modul('vorschau.js');
    if (nr !== lauf) return;
    await m.zeige(container, ctx, { art, arg, aktuell: () => nr === lauf });
  } catch (f) {
    if (nr === lauf) container.replaceChildren(G.fehlerNotiz(f));
  }
}

async function zeigeMaterialien(nr) {
  const container = el('div', 'lk-seiten-inhalt');
  container.id = 'seite-materialien';
  container.appendChild(laedt());
  neueAnsicht('materialien', [container], { titel: 'Materialien', bereich: 'materialien' });
  try {
    if (!ctx.akten.length && !kurseFehler) await ladeKurse();
    const m = await modul('material.js');
    if (nr !== lauf) return;
    await m.zeige(container, ctx);
  } catch (f) {
    if (nr === lauf) container.replaceChildren(G.fehlerNotiz(f));
  }
}

async function zeigeVerwaltung(nr, reiter) {
  if (ansicht && ansicht.art === 'verwaltung') {
    if (ansicht.reiter.aktiv() !== reiter) await ansicht.reiter.zeige(reiter);
    return;
  }
  const reiterTeil = reiterAnsicht({
    id: 'vw-reiter',
    label: 'Bereiche der Verwaltung',
    liste: VERWALTUNG_REITER,
    ziel: (key) => '#/verwaltung/' + key,
    lade: async (key, panel) => {
      const m = await modul('system.js');
      await m[key](panel, ctx);
    }
  });
  neueAnsicht(
    'verwaltung',
    [
      seitenKopf('Lehrkraft-Bereich · Admin', 'Verwaltung', 'Nur für den Admin: geladene Inhalte prüfen und neu laden, Sicherung der Plattform-Datenbank. Konten und Kurse verwalten Sie im Portal InfoLabs.'),
      ...reiterTeil.teile
    ],
    { titel: 'Verwaltung', bereich: 'verwaltung', extra: { reiter: reiterTeil } }
  );
  await reiterTeil.zeige(reiter);
}

/* ---------------------------------------------------------------- Router */

/** Alte Adressen (bis 0.8.3) einmalig auf die neuen Routen umleiten (ohne neuen Verlaufseintrag). */
function umleitenAlt() {
  const url = new URL(window.location.href);
  const parameter = url.searchParams.get('kurs');
  const alt = url.hash.replace(/^#/, '');
  if (!parameter && (!alt || alt.startsWith('/'))) return;
  let neu = alt.startsWith('/') ? '#' + alt : '#/';
  if (!alt.startsWith('/')) {
    const passend = (id) => (id && KURS_RE.test(id) && ctx.kurse.some((k) => k.id === id) ? id : null);
    const kursId = passend(parameter) || passend(A.lies(KURS_SCHLUESSEL)) || (ctx.kurse[0] && ctx.kurse[0].id) || null;
    if (ALT_SEITE[alt]) neu = ALT_SEITE[alt];
    else if ((ALT_KURS[alt] || (!alt && parameter)) && kursId) neu = kursRoute(kursId, ALT_KURS[alt] || 'schueler');
  }
  window.history.replaceState(null, '', url.pathname + neu);
}

async function route() {
  const nr = ++lauf;
  document.documentElement.dataset.lehrkraft = 'laedt';
  // alte Reiter-Adresse auch beim Hash-Wechsel ohne Neuladen (Lesezeichen, Link aus einer alten Seite)
  if (window.location.hash.length > 1 && !window.location.hash.startsWith('#/')) umleitenAlt();
  const [name, a, b] = window.location.hash.replace(/^#\/?/, '').split('/');
  const dekodiert = (x) => {
    try {
      return decodeURIComponent(x || '');
    } catch {
      return '';
    }
  };
  try {
    if (name === 'kurs') await zeigeKurs(nr, dekodiert(a), KURS_REITER.some((x) => x[0] === b) ? b : 'schueler');
    else if (name === 'aufgaben') await zeigeAufgaben(nr, a || null, a ? dekodiert(b) : null);
    else if (name === 'materialien') await zeigeMaterialien(nr);
    else if (name === 'verwaltung') {
      if (!istAdmin) {
        window.history.replaceState(null, '', window.location.pathname + '#/');
        await zeigeKursliste(nr);
      } else if (!VERWALTUNG_REITER.some((x) => x[0] === a)) {
        window.history.replaceState(null, '', window.location.pathname + '#/verwaltung/inhalte');
        await zeigeVerwaltung(nr, 'inhalte');
      } else await zeigeVerwaltung(nr, a);
    } else await zeigeKursliste(nr);
  } catch (f) {
    if (nr === lauf) neueAnsicht('fehler', [G.fehlerNotiz(f)], { titel: 'Fehler', bereich: null });
  }
  if (nr === lauf) {
    $('lk-status').hidden = true;
    document.documentElement.dataset.lehrkraft = 'bereit';
  }
}

await ladeKurse();
umleitenAlt();
window.addEventListener('hashchange', route);
route();
