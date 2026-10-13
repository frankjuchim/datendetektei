// Seite /lehrkraft (Plan Phase 6 Task 4, DESIGN §5.11, Spec §7.11): Kursauswahl oben, Reiter Übersicht ·
// Einstellungen · Auswertung · Vorschau · Live · Board · Urkunden · Materialien (Superadmin zusätzlich System).
// Reiter nach WAI-ARIA (←/→, Pos1/Ende), gemerkt in der Adresse (#auswertung) und ?kurs=. Inhalte je Reiter werden erst
// beim Öffnen geladen (eigene Module) und beim Kurswechsel neu aufgebaut. Ausgaben nur als Textknoten.

const V = new URL(import.meta.url).search;
const G = await import('./gemeinsam.js' + V);
const { A, R } = G;
const { el } = R;

const $ = (id) => document.getElementById(id);
const REITER = ['uebersicht', 'einstellungen', 'auswertung', 'vorschau', 'live', 'board', 'urkunden', 'materialien', 'system'];
const MODULE = {
  uebersicht: 'uebersicht.js',
  einstellungen: 'einstellungen.js',
  auswertung: 'auswertung.js',
  vorschau: 'vorschau.js',
  live: 'live.js',
  board: 'board.js',
  urkunden: 'urkunden.js',
  materialien: 'material.js',
  system: 'system.js'
};
const KURS_SCHLUESSEL = 'dd-kurs';
const KURS_RE = /^k:\d{1,12}$/;

const DD = window.DD || {};
const ich = DD.ich ? await DD.ich : null;
if (ich && ich.name) $('lk-name').textContent = ich.name;
const istAdmin = !!ich && ich.rolle === 'superadmin';
if (istAdmin) {
  $('reiter-system').hidden = false;
  $('lk-etikett').textContent = 'Lehrkraft-Bereich · Admin';
}

let daten;
try {
  daten = await A.holen('/api/lehrkraft/kurse');
} catch (f) {
  $('lk-status').textContent = f.message || 'Die Kurse konnten nicht geladen werden. Bitte laden Sie die Seite neu.';
  daten = null;
}

/** Zustand der Seite; die Reiter-Module bekommen ihn als ctx. */
const ctx = {
  ich,
  istAdmin,
  akten: daten && Array.isArray(daten.akten) ? daten.akten : [],
  kurse: daten && Array.isArray(daten.kurse) ? daten.kurse : [],
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
  /** Kurs nach einer Änderung (PUT/POST) übernehmen; Kopf und betroffene Reiter neu zeichnen. */
  kursAktualisiert(k, { ausser = null } = {}) {
    const i = ctx.kurse.findIndex((x) => x.id === k.id);
    if (i >= 0) ctx.kurse[i] = k;
    ctx.kurs = k;
    ctx.cache.delete('auswertung:' + k.id);
    zeichneKopf();
    for (const r of REITER) if (r !== ausser) gezeigt.delete(r);
  },
  oeffne: (reiter) => waehle(reiter, { fokus: true })
};

const gezeigt = new Map(); // Reiter → Kurs-ID, für die der Inhalt aufgebaut ist
const module = new Map();
let aktiv = null;

if (daten) {
  if (!ctx.kurse.length) {
    $('lk-status').textContent = istAdmin
      ? 'Es gibt noch keine Kurse. Kurse entstehen, sobald sich eine Lehrkraft oder ein Schüler aus einem Kurs des Portals anmeldet.'
      : 'Ihnen ist noch kein Kurs zugeordnet. Kurse legen Sie im Portal an und schalten dort die Datendetektei frei.';
    if (istAdmin) {
      // Superadmin ohne Kurse: nur der System-Reiter
      for (const r of REITER) $('reiter-' + r).hidden = r !== 'system';
      $('lk-reiter-huelle').hidden = false;
      waehle('system');
    }
  } else {
    start();
  }
}

function start() {
  const auswahl = $('lk-kurs');
  for (const k of ctx.kurse) {
    const o = el('option', null, (k.name || k.id) + (k.aktiv ? '' : ' (gesperrt)'));
    o.value = k.id;
    auswahl.appendChild(o);
  }
  const parameter = new URLSearchParams(window.location.search).get('kurs');
  const gemerkt = A.lies(KURS_SCHLUESSEL);
  const passend = (id) => ctx.kurse.find((k) => k.id === id);
  ctx.kurs = (parameter && KURS_RE.test(parameter) && passend(parameter)) || (gemerkt && passend(gemerkt)) || ctx.kurse[0];
  auswahl.value = ctx.kurs.id;
  $('lk-kurswahl').hidden = false;
  $('lk-status').hidden = true;
  $('lk-reiter-huelle').hidden = false;
  auswahl.addEventListener('change', () => {
    const k = passend(auswahl.value);
    if (k) setzeKurs(k);
  });
  for (const r of REITER) {
    const knopf = $('reiter-' + r);
    knopf.addEventListener('click', () => waehle(r));
    knopf.addEventListener('keydown', tastatur);
  }
  window.addEventListener('hashchange', () => {
    const r = ausAdresse();
    if (r && r !== aktiv) waehle(r);
  });
  setzeKurs(ctx.kurs, { erst: true });
  waehle(ausAdresse() || 'uebersicht');
}

function ausAdresse() {
  const r = window.location.hash.replace(/^#/, '');
  return REITER.includes(r) && !$('reiter-' + r).hidden ? r : null;
}

function setzeKurs(k, { erst = false } = {}) {
  const vorher = ctx.kurs && ctx.kurs.id;
  ctx.kurs = k;
  A.schreib(KURS_SCHLUESSEL, k.id);
  const url = new URL(window.location.href);
  url.searchParams.set('kurs', k.id);
  window.history.replaceState(null, '', url.pathname + url.search + url.hash);
  zeichneKopf();
  if (!erst && vorher !== k.id) {
    // Live-Steuerung des alten Kurses schließen; alle Reiter neu aufbauen
    const live = module.get('live');
    if (live && typeof live.schliessen === 'function') live.schliessen();
    gezeigt.clear();
    if (aktiv) zeige(aktiv);
  }
}

function zeichneKopf() {
  const k = ctx.kurs;
  const kopf = $('kopf-kurs');
  if (kopf) {
    kopf.textContent = 'Kurs ';
    kopf.appendChild(el('strong', null, k.name || k.id));
    kopf.appendChild(document.createTextNode(` · ${k.einstellungen.niveau}`));
  }
  const kz = $('lk-kennzahlen');
  // Die Kür (welt 8) zählt nicht als Akte (Manifest-umfang: Akten 1–7)
  const kuerNr = new Set(ctx.akten.filter((a) => a.kuer).map((a) => a.nr));
  const akten = k.einstellungen.akten.filter((nr) => !kuerNr.has(nr)).length;
  const kuer = k.einstellungen.akten.some((nr) => kuerNr.has(nr));
  const z = k.kennzahlen || { schueler: 0, anteil: 0 };
  kz.replaceChildren(
    G.kennzahl(G.zahl(z.schueler), z.schueler === 1 ? 'Schüler:in' : 'Schüler:innen'),
    G.kennzahl(G.prozent(z.anteil), 'Ø der freigeschalteten Punkte'),
    G.kennzahl(k.einstellungen.niveau, k.einstellungen.niveau === 'eA' ? 'erhöhtes Niveau' : 'grundlegendes Niveau'),
    G.kennzahl(G.zahl(akten), (akten === 1 ? 'Akte frei' : 'Akten frei') + (kuer ? ' + Kür' : ''))
  );
  if (!k.aktiv) kz.appendChild(el('span', 'status inaktiv', 'Kurs gesperrt – nur lesend'));
  kz.hidden = false;
}

function tastatur(e) {
  const sichtbar = REITER.filter((r) => !$('reiter-' + r).hidden);
  const i = sichtbar.indexOf(aktiv);
  let ziel = null;
  if (e.key === 'ArrowRight') ziel = sichtbar[(i + 1) % sichtbar.length];
  else if (e.key === 'ArrowLeft') ziel = sichtbar[(i - 1 + sichtbar.length) % sichtbar.length];
  else if (e.key === 'Home') ziel = sichtbar[0];
  else if (e.key === 'End') ziel = sichtbar[sichtbar.length - 1];
  if (!ziel) return;
  e.preventDefault();
  waehle(ziel, { fokusReiter: true });
}

function waehle(reiter, { fokus = false, fokusReiter = false } = {}) {
  aktiv = reiter;
  for (const r of REITER) {
    const k = $('reiter-' + r);
    const an = r === reiter;
    k.setAttribute('aria-selected', an ? 'true' : 'false');
    k.tabIndex = an ? 0 : -1;
    $('panel-' + r).hidden = !an;
  }
  if (window.location.hash !== '#' + reiter) window.history.replaceState(null, '', window.location.pathname + window.location.search + '#' + reiter);
  const knopf = $('reiter-' + reiter);
  if (fokusReiter) knopf.focus();
  if (knopf.scrollIntoView && fokusReiter) knopf.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  zeige(reiter).then(() => {
    if (fokus) $('panel-' + reiter).focus();
  });
}

async function zeige(reiter) {
  const panel = $('panel-' + reiter);
  const kursId = ctx.kurs ? ctx.kurs.id : null;
  if (gezeigt.get(reiter) === kursId && panel.childElementCount) return;
  gezeigt.set(reiter, kursId);
  panel.replaceChildren(el('p', 'lk-laedt', 'Wird geladen …'));
  try {
    let m = module.get(reiter);
    if (!m) {
      m = await import('./' + MODULE[reiter] + V);
      module.set(reiter, m);
    }
    await m.zeige(panel, ctx);
  } catch (f) {
    gezeigt.delete(reiter);
    panel.replaceChildren(G.fehlerNotiz(f));
  }
  document.documentElement.dataset.lehrkraft = 'bereit';
}
