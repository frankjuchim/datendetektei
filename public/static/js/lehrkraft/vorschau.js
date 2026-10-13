// Reiter „Vorschau“ (Spec §7.11): alle Akten, Ermittlungen, Cold Cases und Verhör-Pools als Baum; eine Aufgabe wird wie
// bei den Schülern gerendert (ohne Prüfen), darunter Lösung, Erklärung, Kernpunkte und alle Tipps. Hinweis, für welches
// Niveau die Aufgabe sichtbar ist. Daten: GET /api/lehrkraft/kurse/:kurs/vorschau[/aufgaben/:id] (nur Lehrkraft).

const V = new URL(import.meta.url).search;
const [G, I] = await Promise.all([import('./gemeinsam.js' + V), import('../kern/interaktionen.js' + V)]);
const { A, R } = G;
const { el, h, knopf } = R;

const NIVEAU_TEXT = { alle: 'sichtbar für eA und gA', eA: 'nur eA (bei gA ausgeblendet)', gA: 'nur gA' };
const ART_TEXT = { lab: 'Ermittlung', cc: 'Cold Case', verhoer: 'Verhör-Pool' };

export async function zeige(panel, ctx) {
  const d = await A.holen(G.lkApi(ctx.kurs.id, '/vorschau'));
  const raster = el('div', 'vorschau-raster');
  const baum = el('nav', 'vorschau-baum');
  baum.setAttribute('aria-label', 'Aufgaben aller Akten');
  baum.id = 'vo-baum';
  const ansicht = el('div', 'vorschau-ansicht');
  ansicht.id = 'vo-ansicht';
  ansicht.tabIndex = -1;
  ansicht.appendChild(
    G.notiz('Aufgaben samt Lösungen', 'Wählen Sie links eine Aufgabe. Sie sehen sie wie Ihre Schülerinnen und Schüler (ohne Prüfen), darunter Lösung, Erklärung und alle Tipps. Diese Ansicht gibt es nur für Lehrkräfte.')
  );
  let aktuell = null;

  const eintrag = (a, art) => {
    const b = el('button', 'vorschau-eintrag' + (a.sichtbar ? '' : ' ausgeblendet'));
    b.type = 'button';
    b.dataset.aufgabe = a.id;
    b.append(el('span', 'id', a.id), el('span', null, a.titel), R.sterne(a.stufe));
    b.setAttribute('aria-label', `${a.id} ${a.titel}, Stufe ${a.stufe}${a.sichtbar ? '' : ', im Kurs-Niveau ausgeblendet'}${art === 'cc' ? ', Cold Case' : ''}`);
    b.addEventListener('click', () => {
      if (aktuell) aktuell.removeAttribute('aria-current');
      aktuell = b;
      b.setAttribute('aria-current', 'true');
      oeffne(ctx, a.id, ansicht);
    });
    return h('li', null, b);
  };

  for (const akte of d.akten) {
    const det = G.akteFarbe(el('details'), akte.farbe);
    if (akte.freigeschaltet && akte.sichtbar) det.open = d.akten.filter((x) => x.freigeschaltet).length <= 2;
    const sum = el('summary', null, G.akteLang(akte.nr, akte.titel));
    if (!akte.freigeschaltet) sum.appendChild(el('span', 'etikett', 'gesperrt'));
    if (!akte.sichtbar) sum.appendChild(el('span', 'etikett', 'bei gA ausgeblendet'));
    det.appendChild(sum);
    for (const e of akte.ermittlungen) {
      const ed = el('details');
      ed.appendChild(el('summary', null, `Ermittlung ${e.nr} · ${e.titel}`));
      const ul = el('ul');
      for (const a of e.aufgaben) ul.appendChild(eintrag(a, 'lab'));
      if (e.coldCase) ul.appendChild(eintrag(e.coldCase, 'cc'));
      if (!e.aufgaben.length && !e.coldCase) ul.appendChild(el('li', 'hinweis-klein', 'Keine Lab-Aufgaben – geprüft wird im Verhör.'));
      ed.appendChild(ul);
      det.appendChild(ed);
    }
    if (akte.verhoer) {
      const vd = el('details');
      vd.appendChild(el('summary', null, `${akte.verhoer.titel} · Pool (${akte.verhoer.pool.length})`));
      const ul = el('ul');
      for (const a of akte.verhoer.pool) ul.appendChild(eintrag(a, 'verhoer'));
      vd.appendChild(ul);
      det.appendChild(vd);
    }
    baum.appendChild(det);
  }
  if (!d.akten.length) baum.appendChild(el('p', 'hinweis-klein', 'Es sind keine Inhalte geladen.'));
  raster.append(baum, ansicht);
  panel.replaceChildren(raster);
}

async function oeffne(ctx, id, ansicht) {
  ansicht.replaceChildren(el('p', 'lk-laedt', 'Aufgabe wird geladen …'));
  let d;
  try {
    d = await A.holen(G.lkApi(ctx.kurs.id, '/vorschau/aufgaben/' + encodeURIComponent(id)));
  } catch (f) {
    ansicht.replaceChildren(G.fehlerNotiz(f));
    return;
  }
  const a = d.aufgabe;
  const kopf = el('div', 'lk-karte-kopf');
  const titel = el('h2', null, a.titel);
  titel.id = 'vo-titel';
  kopf.appendChild(h('div', null, el('span', 'etikett', `${a.id} · ${ART_TEXT[d.art] || d.art} · ${G.akteKurz(d.ort.akte.nr)}${d.ort.ermittlung ? ' · Ermittlung ' + d.ort.ermittlung.nr : ''}`), titel));
  const meta = el('p', 'vorschau-meta');
  meta.append(R.sterne(a.stufe), el('span', null, `${a.punkte} Punkte`));
  if (a.kategorie) meta.appendChild(el('span', null, a.kategorie));
  for (const nr of a.fallen || []) meta.appendChild(R.falle(nr));
  const niveau = el('span', 'niveau ' + (a.niveau === 'eA' ? 'ea' : a.niveau === 'gA' ? 'ga' : ''), NIVEAU_TEXT[a.niveau] || a.niveau);
  niveau.id = 'vo-niveau';
  meta.appendChild(niveau);
  const hinweis = d.sichtbar ? null : el('p', 'banner', 'Im Niveau dieses Kurses ausgeblendet – Ihre Schülerinnen und Schüler sehen diese Aufgabe nicht.');

  let aufgabe;
  try {
    aufgabe = I.erzeugeAufgabe(a, { speicher: `dd-vorschau:${a.id}` });
  } catch {
    aufgabe = { el: el('p', 'hinweis-klein', 'Diese Aufgabe lässt sich hier nicht darstellen.'), loesung() {}, sperren() {} };
  }
  const aufgabeBox = h('section', 'lk-karte', aufgabe.el);
  aufgabeBox.setAttribute('aria-label', 'Aufgabe wie in der Schüleransicht');

  // Lösung, Erklärung, Kernpunkte
  const lo = d.loesung || {};
  const box = el('section', 'vorschau-loesung');
  box.id = 'vo-loesung';
  box.setAttribute('aria-labelledby', 'vo-loesung-titel');
  const lt = el('h3', null, 'Lösung und Erklärung');
  lt.id = 'vo-loesung-titel';
  box.appendChild(lt);
  const eintragen = knopf('Lösung in die Aufgabe eintragen', 'knopf', 'i-auge');
  eintragen.id = 'vo-eintragen';
  eintragen.addEventListener('click', () => {
    try {
      aufgabe.loesung(lo.loesung);
      aufgabe.sperren(true);
      eintragen.disabled = true;
    } catch {
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
    const listen = Array.isArray(lo.kernpunkte[0]) || lo.kernpunkte.some((x) => Array.isArray(x)) ? lo.kernpunkte : [lo.kernpunkte];
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
  tipps.appendChild(el('h3', null, d.tipps.length ? `Tipps (${d.tipps.length})` : 'Keine Tipps'));
  if (d.tipps.length) {
    const ol = el('ol');
    for (const t of d.tipps) ol.appendChild(h('li', null, R.md(t, null, 'span')));
    tipps.appendChild(ol);
  }

  ansicht.replaceChildren(...[kopf, meta, hinweis, aufgabeBox, box, tipps].filter(Boolean));
  ansicht.focus({ preventScroll: true });
  if (window.matchMedia('(max-width: 1023px)').matches) ansicht.scrollIntoView({ block: 'start' });
}
