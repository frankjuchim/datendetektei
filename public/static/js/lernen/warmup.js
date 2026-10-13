// Warm-up-Trainer (/warmup, Spec §7.8): Karteikarten nach Leitner (fünf Fächer), Filter nach Akte und Kategorie,
// Lösung aufdecken, selbst einschätzen (gewusst · teilweise · nicht gewusst). Ohne Punkte.

const V = new URL(import.meta.url).search;
const [A, R] = await Promise.all([import('../kern/api.js' + V), import('../kern/render.js' + V)]);
const { el, h, knopf } = R;

const seite = document.getElementById('seite');
const FILTER_SCHLUESSEL = 'dd-warmup-filter';

let kurs = null;
let kontext = null;
let filter = { akte: '', kategorie: '' };
let karteBox = null;
let statistikBox = null;
let aktuelle = null;

function filterAusUrl() {
  const p = new URLSearchParams(window.location.search);
  const gemerkt = A.liesJson(FILTER_SCHLUESSEL) || {};
  filter = { akte: p.get('akte') || gemerkt.akte || '', kategorie: p.get('kategorie') || gemerkt.kategorie || '' };
}

function query() {
  const q = new URLSearchParams();
  if (filter.akte) q.set('akte', filter.akte);
  if (filter.kategorie) q.set('kategorie', filter.kategorie);
  const s = q.toString();
  return s ? '?' + s : '';
}

function body() {
  const b = {};
  if (filter.akte) b.akte = Number(filter.akte);
  if (filter.kategorie) b.kategorie = filter.kategorie;
  return b;
}

function auswahl(label, id, optionen, wert, beiWechsel) {
  const sel = el('select', 'auswahl');
  sel.id = id;
  for (const [w, t] of optionen) {
    const o = el('option', null, t);
    o.value = w;
    sel.appendChild(o);
  }
  sel.value = wert;
  sel.addEventListener('change', () => beiWechsel(sel.value));
  const lab = el('label', 'auswahl-label', label);
  lab.htmlFor = id;
  return h('div', 'auswahl-feld', lab, sel);
}

function zeichneStatistik(u) {
  const st = u.statistik;
  const box = el('div', 'faecher');
  box.setAttribute('aria-label', 'Karten je Fach');
  const max = Math.max(1, st.neu, ...Object.values(st.faecher));
  const spalte = (titel, n, hinweis) => {
    const s = el('div', 'fach');
    const balken = el('span', 'fach-balken');
    balken.style.setProperty('--wert', `${Math.round((n / max) * 100)}%`);
    s.append(el('span', 'fach-zahl zahlen', n), h('span', 'fach-saeule', balken), el('span', 'fach-name', titel));
    if (hinweis) s.title = hinweis;
    return s;
  };
  box.appendChild(spalte('neu', st.neu, 'noch nie gezogen'));
  for (const f of [1, 2, 3, 4, 5]) box.appendChild(spalte(`F${f}`, st.faecher[f], `Wiederholung nach ${u.intervalle[f]} ${u.intervalle[f] === 1 ? 'Tag' : 'Tagen'}`));
  statistikBox.replaceChildren(
    el('p', 'zahlen statistik-zeile', `${A.mehrzahl(st.gesamt, 'Karte', 'Karten')} · ${st.faellig} heute fällig`),
    box,
    el('p', 'hinweis-klein', 'neu = noch nie gezogen · F1–F5 = Fächer; je höher das Fach, desto seltener kommt die Karte.')
  );
}

async function ladeUebersicht() {
  let u;
  try {
    u = await A.holen(A.kursApi(kurs.id, '/warmup' + query()));
  } catch (f) {
    seite.replaceChildren(A.fehlerKarte(f));
    return null;
  }
  return u;
}

function leer(text) {
  karteBox.replaceChildren(h('div', 'karteikarte leer', el('p', null, text)));
}

async function ziehen(ausser = null) {
  karteBox.setAttribute('aria-busy', 'true');
  let r;
  try {
    r = await A.senden(A.kursApi(kurs.id, '/warmup/ziehen'), { ...body(), ...(ausser ? { ausser } : {}) });
  } catch (f) {
    karteBox.removeAttribute('aria-busy');
    leer(f.message);
    return;
  }
  karteBox.removeAttribute('aria-busy');
  if (!r.karte) {
    aktuelle = null;
    if (r.grund === 'keine_karten') leer('Für diese Auswahl gibt es noch keine Karten. Weitere kommen, sobald deine Lehrkraft neue Akten freischaltet.');
    else leer(`Für heute ist alles wiederholt. Die nächste Karte ist ab ${new Date(r.naechsteFaelligkeit).toLocaleDateString('de-DE')} fällig.`);
    return;
  }
  aktuelle = r;
  zeigeKarte(r);
}

function zeigeKarte(r) {
  const k = r.karte;
  const karte = el('article', 'karteikarte');
  karte.setAttribute('aria-labelledby', 'karte-titel');
  const kopf = el('div', 'karteikarte-kopf');
  const t = el('h2', null, k.titel);
  t.id = 'karte-titel';
  t.tabIndex = -1;
  kopf.append(el('span', 'etikett', `${k.id} · Akte ${k.akte} · ${k.kategorie}`), t, el('span', 'etikett', `${r.neu ? 'neu' : 'Fach ' + r.fach} · ca. ${k.minuten} min`));
  karte.appendChild(kopf);
  const inhalt = el('div', 'karteikarte-inhalt');
  inhalt.appendChild(R.md(k.aufgabe));
  if (k.sql) inhalt.appendChild(R.block({ t: 'sql', sql: k.sql }, null, 0));
  if (k.datenbank) {
    const a = el('a', 'link-ziel', `In der Freien Ermittlung ausprobieren (${R.DATENBANK_TITEL[k.datenbank] || k.datenbank})`);
    a.href = `/konsole/${encodeURIComponent(k.datenbank)}`;
    inhalt.appendChild(a);
  }
  karte.appendChild(inhalt);
  const loesung = el('div', 'karteikarte-loesung');
  loesung.setAttribute('aria-live', 'polite');
  const reihe = el('div', 'knopf-reihe');
  const auf = knopf('Lösung aufdecken', 'knopf gruen', 'i-auge');
  auf.id = 'k-aufdecken';
  const anders = knopf('Andere Karte', 'knopf leise');
  anders.addEventListener('click', () => ziehen(k.id));
  auf.addEventListener('click', async () => {
    if (auf.disabled) return; // Doppelklick: Lösung nur einmal
    auf.disabled = true;
    try {
      const l = await A.senden(A.kursApi(kurs.id, `/warmup/karten/${encodeURIComponent(k.id)}/aufdecken`));
      zeigeLoesung(loesung, l, k);
      reihe.remove();
    } catch (f) {
      auf.disabled = false;
      A.toast(f.message);
    }
  });
  reihe.append(auf, anders);
  karte.append(reihe, loesung);
  karteBox.replaceChildren(karte);
}

function zeigeLoesung(box, l, k) {
  box.appendChild(el('p', 'etikett', 'Lösung'));
  box.appendChild(R.md(l.loesung));
  if (l.loesungSql) box.appendChild(R.block({ t: 'sql', sql: l.loesungSql }, null, 0));
  if (Array.isArray(l.falle) && l.falle.length) {
    const f = el('p', 'fallen-zeile');
    f.appendChild(el('span', 'etikett', 'Fallen'));
    for (const nr of l.falle) f.appendChild(R.falle(nr));
    box.appendChild(f);
  }
  const frage = el('p', 'einschaetzung-frage', 'Wie gut wusstest du es?');
  const reihe = el('div', 'knopf-reihe einschaetzung');
  reihe.setAttribute('role', 'group');
  reihe.setAttribute('aria-label', 'Selbsteinschätzung');
  let sendet = false;
  for (const [wert, text, klasse] of [['gewusst', 'Gewusst', 'knopf gruen'], ['teilweise', 'Teilweise', 'knopf'], ['nicht', 'Nicht gewusst', 'knopf']]) {
    const b = knopf(text, klasse);
    b.dataset.ergebnis = wert;
    b.addEventListener('click', async () => {
      // Doppelklick: nur eine Bewertung (sonst rückt die Karte zwei Fächer weiter)
      if (sendet) return;
      sendet = true;
      for (const x of reihe.querySelectorAll('button')) x.disabled = true;
      try {
        const r = await A.senden(A.kursApi(kurs.id, `/warmup/karten/${encodeURIComponent(k.id)}/bewerten`), { ergebnis: wert });
        A.toast(r.fach > r.vorher ? `Karte rückt in Fach ${r.fach}.` : r.fach === 1 ? 'Karte zurück in Fach 1 – sie kommt bald wieder.' : `Karte bleibt in Fach ${r.fach}.`);
        await aktualisiere();
        await ziehen(k.id);
        const t = document.getElementById('karte-titel');
        if (t) t.focus();
      } catch (f) {
        sendet = false;
        for (const x of reihe.querySelectorAll('button')) x.disabled = false;
        A.toast(f.message);
      }
    });
    reihe.appendChild(b);
  }
  box.append(frage, reihe);
}

async function aktualisiere() {
  const u = await ladeUebersicht();
  if (u) zeichneStatistik(u);
  return u;
}

async function start() {
  if (!seite) return;
  kontext = await A.kursKontext(seite);
  if (!kontext) return;
  kurs = kontext.kurs;
  filterAusUrl();
  let u = await ladeUebersicht();
  if (!u) return;
  if (filter.akte && !u.akten.some((a) => String(a.nr) === String(filter.akte))) filter.akte = '';
  if (filter.kategorie && !u.kategorien.some((k) => k.kategorie === filter.kategorie)) filter.kategorie = '';
  const kopf = h('div', 'seiten-kopf', el('span', 'etikett', 'Warm-up · fünf Minuten zum Einstieg'), el('h1', null, 'Warm-up-Trainer'), el('p', null, 'Karteikarten aus den Akten, die du schon kennst. Was du weißt, wandert ein Fach weiter und kommt seltener; was du nicht weißt, kommt bald wieder. Punkte gibt es hier keine.'));
  const filterLeiste = el('div', 'filter-leiste');
  const neuLaden = async () => {
    A.schreibJson(FILTER_SCHLUESSEL, filter);
    await aktualisiere();
    await ziehen();
  };
  filterLeiste.append(
    auswahl('Akte', 'filter-akte', [['', 'alle Akten'], ...u.akten.map((a) => [String(a.nr), `Akte ${a.nr}: ${a.titel} (${a.faellig} fällig)`])], filter.akte, (w) => {
      filter.akte = w;
      neuLaden();
    }),
    auswahl('Kategorie', 'filter-kategorie', [['', 'alle Kategorien'], ...u.kategorien.map((k) => [k.kategorie, `${k.kategorie} (${k.anzahl})`])], filter.kategorie, (w) => {
      filter.kategorie = w;
      neuLaden();
    })
  );
  statistikBox = el('div', 'karte statistik-karte');
  karteBox = el('div', 'karten-platz');
  const raster = h('div', 'warmup-raster', h('div', 'warmup-haupt', filterLeiste, karteBox), h('aside', 'warmup-seite', statistikBox));
  seite.replaceChildren(...[A.vorschauHinweis(kontext), kopf, raster].filter(Boolean));
  if (!u.akten.length) {
    leer('Noch keine Warm-up-Karten: Sie kommen, sobald deine Lehrkraft die erste Akte freischaltet.');
    zeichneStatistik(u);
    return;
  }
  zeichneStatistik(u);
  await ziehen();
  document.documentElement.dataset.seite = 'bereit';
}

start();
