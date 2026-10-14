// Seite „Aufgaben“ des Lehrkraft-Bereichs (Aufbau wie Algo Quest, Spec §7.11; bis 0.8.3 Reiter „Vorschau“):
//   #/aufgaben                  Akten-Karten
//   #/aufgaben/akte/<nr>        Akte mit Ermittlungen (Aufgaben + Cold Case) und Verhör-Pool als Tabellen
//   #/aufgaben/aufgabe/<id>     Aufgabe wie bei den Schülern (ohne Prüfen), darunter Lösung, Erklärung, Kernpunkte, Tipps
// Kursunabhängig (alle Akten, Niveau an jedem Eintrag): GET /api/lehrkraft/vorschau[/aufgaben/:id] (nur Lehrkraft mit
// eigenem Kurs und Superadmin). Ausgaben nur als Textknoten.

const V = new URL(import.meta.url).search;
const [G, I] = await Promise.all([import('./gemeinsam.js' + V), import('../kern/interaktionen.js' + V)]);
const { A, R } = G;
const { el, h, knopf } = R;

const NIVEAU_TEXT = { alle: 'sichtbar für eA und gA', eA: 'nur eA (bei gA ausgeblendet)', gA: 'nur gA' };
const ART_TEXT = { lab: 'Ermittlung', cc: 'Cold Case', verhoer: 'Verhör-Pool' };

function daten(ctx) {
  if (!ctx.cache.has('vorschau')) {
    const p = A.holen('/api/lehrkraft/vorschau');
    p.catch(() => ctx.cache.delete('vorschau'));
    ctx.cache.set('vorschau', p);
  }
  return ctx.cache.get('vorschau');
}

const aufgabeRoute = (id) => '#/aufgaben/aufgabe/' + encodeURIComponent(id);
const akteRoute = (nr) => '#/aufgaben/akte/' + encodeURIComponent(nr);

function niveauEtikett(niveau) {
  if (niveau !== 'eA' && niveau !== 'gA') return null;
  return el('span', 'niveau ' + (niveau === 'eA' ? 'ea' : 'ga'), niveau === 'eA' ? 'nur eA' : 'nur gA');
}

/** Niveau einer Akte: nur eA, wenn alle Ermittlungen eA sind (z. B. Akte 5, Kür). */
function akteNiveau(akte) {
  const n = akte.ermittlungen.map((e) => e.niveau);
  return n.length && n.every((x) => x === 'eA') ? 'eA' : null;
}

function anzahlAufgaben(akte) {
  return akte.ermittlungen.reduce((s, e) => s + e.aufgaben.length + (e.coldCase ? 1 : 0), 0);
}

function krumen(...teile) {
  const nav = el('nav', 'lk-krumen');
  nav.id = 'vo-krumen';
  nav.setAttribute('aria-label', 'Brotkrumen');
  teile.forEach(([text, href], i) => {
    if (i) {
      const t = el('span', 'lk-krumen-trenner', '›');
      t.setAttribute('aria-hidden', 'true');
      nav.appendChild(t);
    }
    if (href) {
      const a = el('a', null, text);
      a.href = href;
      nav.appendChild(a);
    } else {
      const s = el('span', null, text);
      if (i === teile.length - 1) s.setAttribute('aria-current', 'page');
      nav.appendChild(s);
    }
  });
  return nav;
}

/* ---------------------------------------------------------------- Übersicht: Akten-Karten */

function uebersicht(container, d) {
  const kopf = h(
    'div',
    'seiten-kopf',
    el('span', 'etikett', 'Lehrkraft-Bereich'),
    el('h1', null, 'Aufgaben der Akten'),
    el('p', null, 'Alle Aufgaben mit Lösung, Erklärung und Tipps – zum Nachschlagen passend zu den Arbeitsblättern (nur für Lehrkräfte sichtbar). Welche Akten Ihre Schülerinnen und Schüler sehen, legen Sie je Kurs unter „Einstellungen“ fest.')
  );
  const liste = el('div', 'lk-akten-karten');
  for (const akte of d.akten) {
    const a = G.akteFarbe(el('a', 'lk-akten-karte'), akte.farbe);
    a.href = akteRoute(akte.nr);
    const meta = [`${G.mehrzahl(akte.ermittlungen.length, 'Ermittlung', 'Ermittlungen')}`, `${G.mehrzahl(anzahlAufgaben(akte), 'Aufgabe', 'Aufgaben')}`];
    if (akte.verhoer) meta.push(`Verhör-Pool ${akte.verhoer.pool.length}`);
    const kopfZeile = h('span', 'lk-akten-karte-kopf', el('span', 'etikett', G.akteKurz(akte.nr)), niveauEtikett(akteNiveau(akte)));
    a.append(kopfZeile, el('strong', 'lk-akten-karte-titel', G.akteKurz(akte.nr) === 'Kür' ? String(akte.titel || '').replace(/^Kür:\s*/, '') : akte.titel), el('span', 'lk-akten-karte-meta', meta.join(' · ')));
    liste.appendChild(a);
  }
  container.replaceChildren(kopf, d.akten.length ? liste : G.notiz('Keine Inhalte', 'Es sind keine Akten geladen.'));
}

/* ---------------------------------------------------------------- Akte: Tabellen */

function aufgabenTabelle(eintraege, caption) {
  const rahmen = el('div', 'tabelle-rahmen lk-tabelle vo-rahmen');
  const t = el('table', 'daten vo-tabelle');
  t.appendChild(el('caption', 'nur-sr', caption));
  const kopf = el('tr');
  for (const [text, klasse] of [['Aufgabe'], ['Stufe'], ['Punkte', 'zahl'], ['Kategorie'], ['Niveau'], ['Fallen']]) {
    const th = el('th', klasse || null, text);
    th.scope = 'col';
    kopf.appendChild(th);
  }
  t.appendChild(h('thead', null, kopf));
  const tbody = el('tbody');
  for (const { a, art } of eintraege) {
    const link = el('a', 'lk-tabelle-link', a.titel);
    link.href = aufgabeRoute(a.id);
    const th = h('th', null, link, el('span', 'klein', art === 'cc' ? `${a.id} · Cold Case` : a.id));
    th.scope = 'row';
    const fallen = el('td');
    for (const nr of a.fallen || []) fallen.appendChild(R.falle(nr));
    tbody.appendChild(h('tr', null, th, h('td', null, R.sterne(a.stufe)), el('td', 'zahl', G.zahl(a.punkte)), el('td', null, a.kategorie || '–'), h('td', null, niveauEtikett(a.niveau) || el('span', 'klein', 'eA und gA')), fallen));
  }
  t.appendChild(tbody);
  rahmen.appendChild(t);
  return rahmen;
}

/** Gruppen einer Akte in Anzeige-Reihenfolge (auch für vorherige/nächste Aufgabe). */
function gruppen(akte) {
  const liste = akte.ermittlungen.map((e) => ({
    art: 'ermittlung',
    titel: `Ermittlung ${e.nr} · ${e.titel}`,
    kurz: `Ermittlung ${e.nr}`,
    quelle: e,
    eintraege: [...e.aufgaben.map((a) => ({ a, art: 'lab' })), ...(e.coldCase ? [{ a: e.coldCase, art: 'cc' }] : [])]
  }));
  if (akte.verhoer) {
    liste.push({ art: 'verhoer', titel: akte.verhoer.titel, kurz: 'Verhör-Pool', quelle: akte.verhoer, eintraege: akte.verhoer.pool.map((a) => ({ a, art: 'verhoer' })) });
  }
  return liste;
}

function akteSeite(container, d, nr) {
  const akte = d.akten.find((x) => String(x.nr) === String(nr));
  if (!akte) {
    container.replaceChildren(krumen(['Aufgaben', '#/aufgaben'], ['Akte nicht gefunden']), G.notiz('Akte nicht gefunden', 'Diese Akte ist nicht geladen.'));
    return;
  }
  const teile = [
    krumen(['Aufgaben', '#/aufgaben'], [G.akteKurz(akte.nr)]),
    h('div', 'seiten-kopf', el('h1', null, G.akteLang(akte.nr, akte.titel)), el('p', null, [G.mehrzahl(akte.ermittlungen.length, 'Ermittlung', 'Ermittlungen'), G.mehrzahl(anzahlAufgaben(akte), 'Aufgabe', 'Aufgaben'), akte.verhoer ? `Verhör-Pool ${akte.verhoer.pool.length}` : null].filter(Boolean).join(' · ')))
  ];
  for (const g of gruppen(akte)) {
    const q = g.quelle;
    const unter =
      g.art === 'verhoer'
        ? [q.anzahl ? `${q.anzahl} von ${q.pool.length} Aufgaben werden gezogen` : `${q.pool.length} Aufgaben`, q.dauerMin ? `${q.dauerMin} Minuten` : null].filter(Boolean).join(' · ')
        : [q.ds && q.ds.length ? `DS ${q.ds.join(', ')}` : null, G.mehrzahl(q.aufgaben.length, 'Aufgabe', 'Aufgaben'), q.coldCase ? '+ Cold Case' : null, `${G.zahl(q.maxPunkte)} Punkte`].filter(Boolean).join(' · ');
    const { karte, kopf } = G.karte(g.titel, unter, { klasse: 'lk-akte-rand' });
    G.akteFarbe(karte, akte.farbe);
    const n = niveauEtikett(q.niveau);
    if (n) kopf.appendChild(n);
    if (g.eintraege.length) karte.appendChild(aufgabenTabelle(g.eintraege, g.titel));
    else karte.appendChild(el('p', 'hinweis-klein', 'Keine Lab-Aufgaben – geprüft wird im Verhör.'));
    teile.push(karte);
  }
  container.replaceChildren(...teile);
}

/* ---------------------------------------------------------------- Aufgabe */

function finde(d, id) {
  for (const akte of d.akten) {
    for (const g of gruppen(akte)) {
      const i = g.eintraege.findIndex((x) => x.a.id === id);
      if (i >= 0) return { akte, g, i };
    }
  }
  return null;
}

async function aufgabeSeite(container, d, id, aktuell) {
  const ort = finde(d, id);
  const ansicht = el('div', 'vorschau-ansicht');
  ansicht.id = 'vo-ansicht';
  ansicht.tabIndex = -1;
  ansicht.appendChild(el('p', 'lk-laedt', 'Aufgabe wird geladen …'));
  const kopfKrumen = ort
    ? krumen(['Aufgaben', '#/aufgaben'], [G.akteKurz(ort.akte.nr), akteRoute(ort.akte.nr)], [ort.g.kurz], [`${ort.i + 1} von ${ort.g.eintraege.length}`])
    : krumen(['Aufgaben', '#/aufgaben'], [id]);
  const nav = el('div', 'knopf-reihe vo-navigation');
  if (ort) {
    const vorher = ort.g.eintraege[ort.i - 1];
    const nachher = ort.g.eintraege[ort.i + 1];
    if (vorher) {
      const a = A.linkKnopf('vorherige Aufgabe', aufgabeRoute(vorher.a.id), 'knopf');
      a.id = 'vo-vorher';
      a.prepend(R.icon('i-zurueck'));
      nav.appendChild(a);
    }
    const zurueck = A.linkKnopf(`Übersicht ${G.akteKurz(ort.akte.nr)}`, akteRoute(ort.akte.nr), 'knopf leise');
    nav.appendChild(zurueck);
    if (nachher) {
      const a = A.linkKnopf('nächste Aufgabe', aufgabeRoute(nachher.a.id), 'knopf');
      a.id = 'vo-nachher';
      a.appendChild(R.icon('i-vor'));
      nav.appendChild(a);
    }
    G.akteFarbe(container, ort.akte.farbe);
  }
  container.replaceChildren(kopfKrumen, ansicht, nav);
  let r;
  try {
    r = await A.holen('/api/lehrkraft/vorschau/aufgaben/' + encodeURIComponent(id));
  } catch (f) {
    if (aktuell()) ansicht.replaceChildren(G.fehlerNotiz(f));
    return;
  }
  if (!aktuell()) return;
  zeigeAufgabe(ansicht, r);
  window.scrollTo(0, 0);
}

function zeigeAufgabe(ansicht, d) {
  const a = d.aufgabe;
  const kopf = el('div', 'lk-karte-kopf');
  const titel = el('h1', 'vo-titel', a.titel);
  titel.id = 'vo-titel';
  kopf.appendChild(h('div', null, el('span', 'etikett', `${a.id} · ${ART_TEXT[d.art] || d.art} · ${G.akteKurz(d.ort.akte.nr)}${d.ort.ermittlung ? ' · Ermittlung ' + d.ort.ermittlung.nr : ''}`), titel));
  const meta = el('p', 'vorschau-meta');
  meta.append(R.sterne(a.stufe), el('span', null, `${a.punkte} Punkte`));
  if (a.kategorie) meta.appendChild(el('span', null, a.kategorie));
  for (const nr of a.fallen || []) meta.appendChild(R.falle(nr));
  const niveau = el('span', 'niveau ' + (a.niveau === 'eA' ? 'ea' : a.niveau === 'gA' ? 'ga' : ''), NIVEAU_TEXT[a.niveau] || a.niveau);
  niveau.id = 'vo-niveau';
  meta.appendChild(niveau);

  let aufgabe;
  try {
    aufgabe = I.erzeugeAufgabe(a, { speicher: `dd-vorschau:${a.id}` });
  } catch {
    aufgabe = { el: el('p', 'hinweis-klein', 'Diese Aufgabe lässt sich hier nicht darstellen.'), loesung() {}, sperren() {} };
  }
  const aufgabeBox = h('section', 'lk-karte', aufgabe.el);
  aufgabeBox.setAttribute('aria-label', 'Aufgabe wie in der Schüleransicht');
  const hinweis = el('p', 'hinweis-klein', 'Vorschau wie in der Schüleransicht – ohne Prüfen; Schülerstände werden nicht verändert.');

  // Lösung, Erklärung, Kernpunkte
  const lo = d.loesung || {};
  const box = el('section', 'vorschau-loesung');
  box.id = 'vo-loesung';
  box.setAttribute('aria-labelledby', 'vo-loesung-titel');
  const lt = el('h2', null, 'Lösung und Erklärung');
  lt.id = 'vo-loesung-titel';
  box.appendChild(lt);
  const eintragen = knopf('Lösung in die Aufgabe eintragen', 'knopf', 'i-auge');
  eintragen.id = 'vo-eintragen';
  eintragen.addEventListener('click', () => {
    try {
      aufgabe.loesung(lo.loesung);
      aufgabe.sperren(true);
    } catch {
      /* Interaktion ohne Lösungsanzeige */
    } finally {
      eintragen.disabled = true;
    }
  });
  box.appendChild(h('div', 'knopf-reihe', eintragen));
  const sqlTeile = (Array.isArray(lo.loesung) ? lo.loesung : [lo.loesung]).filter((x) => x && typeof x.sql === 'string');
  for (const s of sqlTeile) {
    box.appendChild(el('p', 'etikett', 'Musterlösung'));
    box.appendChild(R.block({ t: 'sql', sql: s.sql }, null, 0));
  }
  if (lo.kernpunkte) {
    const listen = lo.kernpunkte.some((x) => Array.isArray(x)) ? lo.kernpunkte : [lo.kernpunkte];
    listen.forEach((liste, i) => {
      if (!Array.isArray(liste)) return;
      box.appendChild(el('p', 'etikett', listen.length > 1 ? `Kernpunkte Teil ${String.fromCharCode(97 + i)})` : 'Kernpunkte'));
      const ul = el('ul');
      for (const p of liste) ul.appendChild(h('li', null, R.md(p, null, 'span')));
      box.appendChild(ul);
    });
  }
  if (Array.isArray(lo.erklaerung) && lo.erklaerung.length) box.appendChild(R.bloecke(lo.erklaerung));
  else if (!sqlTeile.length && !lo.kernpunkte) box.appendChild(el('p', 'hinweis-klein', 'Zu dieser Aufgabe gibt es keine eigene Erklärung – die Lösung zeigt „Lösung in die Aufgabe eintragen“.'));

  const tipps = el('section', 'vorschau-tipps');
  tipps.id = 'vo-tipps';
  tipps.appendChild(el('h2', null, d.tipps.length ? `Tipps (${d.tipps.length})` : 'Keine Tipps'));
  if (d.tipps.length) {
    const ol = el('ol');
    for (const t of d.tipps) ol.appendChild(h('li', null, R.md(t, null, 'span')));
    tipps.appendChild(ol);
  }
  ansicht.replaceChildren(kopf, meta, hinweis, aufgabeBox, box, tipps);
}

/* ---------------------------------------------------------------- Einstieg */

export async function zeige(container, ctx, { art = null, arg = null, aktuell = () => true } = {}) {
  const d = await daten(ctx);
  if (!aktuell()) return;
  if (art === 'akte') akteSeite(container, d, arg);
  else if (art === 'aufgabe' && arg) await aufgabeSeite(container, d, arg, aktuell);
  else uebersicht(container, d);
}
