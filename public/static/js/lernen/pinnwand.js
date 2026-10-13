// Pinnwand / Steckbrief (/pinnwand, DESIGN.md §5.10, Spec §7.7): Korkwand mit den Beweisstücken (Polaroids) der
// gewonnenen Verhöre, rote Fäden zwischen den Beweisstücken und zwischen den Indizien des Schlussplädoyers, daneben der
// Steckbrief des Phantoms mit „unbekannt“-Feldern (Regel E10). Polaroid antippen → Karte mit Story-Text und der
// Erkenntnis für den Steckbrief; die zugehörigen Felder im Steckbrief werden markiert. Nach dem Plädoyer: Auflösung
// und Überleitung zur Erörterung. Alle Daten kommen aus GET /api/kurse/:kurs/pinnwand; Ausgaben nur als Textknoten.

const V = new URL(import.meta.url).search;
const [A, R, B, T] = await Promise.all([
  import('../kern/api.js' + V),
  import('../kern/render.js' + V),
  import('./pinnwand_bilder.js' + V),
  import('./pinnwand_teile.js' + V)
]);
const { el, h, svg } = R;

const seite = document.getElementById('seite');
let daten = null;
let gewaehlt = null;

/* ---------- Fäden (SVG über der Korkwand, nach jedem Layout neu) ---------- */

/** Zeichnet Fäden zwischen den Elementen (Reihenfolge) in die SVG-Ebene des Bretts. */
function zeichneFaeden(brett, ebene, elemente) {
  ebene.replaceChildren();
  const box = brett.getBoundingClientRect();
  ebene.setAttribute('viewBox', `0 0 ${Math.max(1, box.width).toFixed(0)} ${Math.max(1, box.height).toFixed(0)}`);
  const punkte = elemente.map((e) => {
    const r = e.getBoundingClientRect();
    return [r.left - box.left + r.width / 2, r.top - box.top + 4];
  });
  for (let i = 1; i < punkte.length; i++) {
    const [x1, y1] = punkte[i - 1];
    const [x2, y2] = punkte[i];
    const mx = (x1 + x2) / 2;
    const my = Math.max(y1, y2) + 18; // Faden hängt leicht durch
    ebene.appendChild(svg('path', { d: `M${x1.toFixed(1)} ${y1.toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}` }, 'pw-faden'));
  }
  for (const [x, y] of punkte) ebene.appendChild(svg('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: 3 }, 'pw-faden-punkt'));
}

function fadenBrett(brett, ebene, auswahl) {
  const neu = () => zeichneFaeden(brett, ebene, [...brett.querySelectorAll(auswahl)]);
  if (typeof ResizeObserver === 'function') new ResizeObserver(neu).observe(brett);
  window.addEventListener('resize', neu);
  requestAnimationFrame(neu);
}

/* ---------- Beweisstücke ---------- */

function polaroid(b) {
  if (!b.gewonnen) {
    const li = el('li', 'pw-polaroid leer');
    li.append(el('span', 'polaroid-frage', '?'), el('span', 'pw-unterschrift', b.akte === 7 ? 'Lizenz' : b.verhoer));
    li.setAttribute('aria-label', `Beweisstück aus ${b.verhoer}, noch offen`);
    return li;
  }
  const li = el('li', 'pw-polaroid-platz');
  const knopf = el('button', 'pw-polaroid');
  knopf.type = 'button';
  knopf.dataset.akte = String(b.akte);
  knopf.setAttribute('aria-pressed', 'false');
  knopf.setAttribute('aria-controls', 'pw-detail');
  knopf.setAttribute('aria-label', `Beweisstück ${b.titel} (${b.verhoer} gewonnen) – Details zeigen`);
  knopf.append(el('span', 'nadel'), h('span', 'pw-bild', B.beweisBild(b.bild, b.titel)), el('span', 'pw-unterschrift', b.titel));
  knopf.addEventListener('click', () => waehle(gewaehlt === b.akte ? null : b.akte));
  li.appendChild(knopf);
  return li;
}

function detailKarte(b) {
  const karte = el('section', 'karte pw-detail-karte');
  karte.appendChild(el('p', 'etikett', `Beweisstück · ${b.verhoer} gewonnen`));
  karte.appendChild(el('h3', null, b.titel));
  karte.appendChild(R.md(b.text));
  if (b.notiz) karte.appendChild(h('p', 'pw-notiz', el('span', 'etikett', 'Eddas Notiz'), el('span', 'pw-handschrift', b.notiz)));
  if (b.erkenntnis && b.erkenntnis.length) {
    karte.appendChild(el('p', 'etikett', 'Für den Steckbrief'));
    const ul = el('ul', 'pw-erkenntnis');
    for (const t of b.erkenntnis) ul.appendChild(h('li', null, R.md(t, null, 'span')));
    karte.appendChild(ul);
  }
  return karte;
}

function waehle(akte) {
  gewaehlt = akte;
  document.querySelectorAll('.pw-polaroid[data-akte]').forEach((k) => k.setAttribute('aria-pressed', String(Number(k.dataset.akte) === akte)));
  document.querySelectorAll('.pw-feld').forEach((f) => {
    const akten = (f.dataset.akten || '').split(',').filter(Boolean).map(Number);
    f.classList.toggle('verbunden', akte !== null && akten.includes(akte));
  });
  const detail = document.getElementById('pw-detail');
  const b = daten.beweisstuecke.find((x) => x.akte === akte && x.gewonnen);
  detail.replaceChildren(...(b ? [detailKarte(b)] : []));
}

function beweisBereich() {
  const bs = daten.beweisstuecke;
  const anzahl = bs.filter((b) => b.gewonnen).length;
  const box = el('section', 'pw-bereich');
  box.setAttribute('aria-labelledby', 'pw-beweise-titel');
  const t = el('h2', null, 'Beweisstücke');
  t.id = 'pw-beweise-titel';
  box.appendChild(h('div', 'abschnitt-kopf', t, el('span', 'etikett', `${anzahl} von ${bs.length} Beweisstücken`)));
  const brett = el('div', 'pw-brett');
  const ebene = svg('svg', { 'aria-hidden': 'true', focusable: 'false' }, 'pw-faeden');
  const ul = el('ul', 'pw-polaroids');
  ul.setAttribute('aria-label', 'Beweisstücke an der Pinnwand');
  for (const b of bs) ul.appendChild(polaroid(b));
  brett.append(ebene, ul);
  box.appendChild(brett);
  if (!anzahl) box.appendChild(el('p', 'hinweis-klein', 'Jedes gewonnene Verhör bringt ein Beweisstück an die Pinnwand. Ab 50 % ist ein Verhör gewonnen.'));
  else box.appendChild(el('p', 'hinweis-klein', 'Tippe ein Beweisstück an: Du siehst, was es verrät – und welche Felder im Steckbrief es gefüllt hat.'));
  const detail = el('div', 'pw-detail');
  detail.id = 'pw-detail';
  detail.setAttribute('aria-live', 'polite');
  box.appendChild(detail);
  if (anzahl > 1) fadenBrett(brett, ebene, '.pw-polaroid[data-akte]');
  return box;
}

/* ---------- Indizienkette des Schlussplädoyers ---------- */

function indizKarte(s, ermittlung) {
  const li = el('li', 'pw-indiz' + (s.indiz ? ' bekannt' : ''));
  li.dataset.schritt = String(s.nr);
  li.appendChild(el('span', 'pw-stift'));
  li.appendChild(el('p', 'pw-indiz-kopf', `Spur ${s.nr}`));
  const link = el('a', 'pw-indiz-titel', s.titel);
  link.href = `/ermittlung/${ermittlung.id}?aufgabe=${encodeURIComponent(s.id)}`;
  li.appendChild(link);
  if (s.indiz) li.appendChild(R.md(s.indiz));
  else li.appendChild(el('p', 'pw-indiz-offen', 'Noch offen – löse die Abfrage in der Ermittlung.'));
  return li;
}

function plaedoyerBereich(p) {
  const box = el('section', 'pw-bereich');
  box.setAttribute('aria-labelledby', 'pw-kette-titel');
  const t = el('h2', null, p.titel || 'Schlussplädoyer');
  t.id = 'pw-kette-titel';
  if (!p.frei) {
    box.appendChild(h('div', 'abschnitt-kopf', t));
    box.appendChild(el('p', 'hinweis-klein', `Das Schlussplädoyer liegt in Akte ${p.akte.nr}. Sobald deine Lehrkraft die Akte freischaltet, heftest du hier die Indizien an.`));
    return box;
  }
  box.appendChild(h('div', 'abschnitt-kopf', t, el('span', 'etikett', `${p.erledigt} von ${p.anzahl} Indizien`)));
  const brett = el('div', 'pw-brett pw-kette');
  const ebene = svg('svg', { 'aria-hidden': 'true', focusable: 'false' }, 'pw-faeden');
  const ol = el('ol', 'pw-indizien');
  ol.setAttribute('aria-label', 'Indizienkette');
  for (const s of p.schritte) ol.appendChild(indizKarte(s, p.ermittlung));
  brett.append(ebene, ol);
  box.appendChild(brett);
  if (p.erledigt > 1) fadenBrett(brett, ebene, '.pw-indiz.bekannt');
  const reihe = el('div', 'knopf-reihe');
  const offen = p.schritte.find((s) => !s.indiz);
  if (offen) reihe.appendChild(A.linkKnopf(`Weiter ermitteln: Spur ${offen.nr}`, `/ermittlung/${p.ermittlung.id}?aufgabe=${encodeURIComponent(offen.id)}`, 'knopf primaer'));
  reihe.appendChild(A.linkKnopf(`Ermittlung ${p.ermittlung.nr || ''} öffnen`.replace('  ', ' '), `/ermittlung/${p.ermittlung.id}`, 'knopf'));
  box.appendChild(reihe);
  if (p.abgeschlossen && p.aufloesung) box.appendChild(T.aufloesungKarte(p));
  return box;
}

/* ---------- Start ---------- */

async function start() {
  if (!seite) return;
  const kontext = await A.kursKontext(seite);
  if (!kontext) return;
  try {
    daten = await A.holen(A.kursApi(kontext.kurs.id, '/pinnwand'));
  } catch (f) {
    seite.replaceChildren(A.fehlerKarte(f));
    return;
  }
  const kopf = h('header', 'seiten-kopf', el('p', 'etikett', 'Fallebene · Detektei Lorenz'), el('h1', null, 'Pinnwand der Detektei'));
  kopf.appendChild(el('p', 'einleitung', 'Hier hängt alles, was ihr über das Phantom wisst: die Beweisstücke aus den Verhören, die Indizien des Schlussplädoyers und der Steckbrief.'));
  const links = h('div', 'pw-spalte', beweisBereich());
  if (daten.plaedoyer) links.appendChild(plaedoyerBereich(daten.plaedoyer));
  const raster = h('div', 'pw-raster', links, h('div', 'pw-seite', T.steckbriefKarte(daten.steckbrief)));
  seite.replaceChildren(...[A.vorschauHinweis(kontext), A.kursWechselLink(kontext), kopf, raster].filter(Boolean));
  document.documentElement.dataset.seite = 'bereit';
}

start();
