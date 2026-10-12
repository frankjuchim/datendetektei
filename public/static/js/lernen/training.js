// Trainingsplatz T1–T3 (/training, Spec §7.8): Zufallsaufgaben (Ergebnis vorhersagen, Gruppen auszählen, Zeilen
// zählen). Es ist immer genau EINE Aufgabe offen und sichtbar; 1 Punkt je richtig gelöster Aufgabe, höchstens 30 am Tag.
// Die Aufgabe wird nicht gespeichert – der Server erzeugt sie aus dem signierten Seed neu und prüft dort.

const V = new URL(import.meta.url).search;
const [A, R, I] = await Promise.all([import('../kern/api.js' + V), import('../kern/render.js' + V), import('../kern/interaktionen.js' + V)]);
const { el, h, knopf } = R;

const seite = document.getElementById('seite');
const TYP_SCHLUESSEL = 'dd-training-typ';

let kurs = null;
let info = null;
let typ = 'T1';
let offen = null; // { typ, seed, signatur, aufgabe }
let aufgabe = null;
let platz = null;
let tagesBox = null;

function zeichneTag(heute, max) {
  tagesBox.replaceChildren(
    el('p', 'etikett', 'Heute'),
    el('p', 'status-zahl zahlen', `${heute.punkte} / ${max}`),
    el('p', 'hinweis-klein', `${A.mehrzahl(heute.aufgaben, 'Aufgabe', 'Aufgaben')} erledigt · Trainingspunkte gesamt: ${info.punkteGesamt}`)
  );
  if (heute.punkte >= max) tagesBox.appendChild(el('p', 'hinweis-klein', 'Tagesgrenze erreicht – du kannst weiter üben, Punkte gibt es morgen wieder.'));
}

function waehler() {
  const seg = el('div', 'segment typ-wahl');
  seg.setAttribute('role', 'group');
  seg.setAttribute('aria-label', 'Aufgabenart');
  for (const g of info.generatoren) {
    const b = el('button', 'segment-knopf');
    b.type = 'button';
    b.dataset.typ = g.typ;
    b.setAttribute('aria-pressed', g.typ === typ ? 'true' : 'false');
    b.append(el('strong', null, g.typ), document.createTextNode(` ${g.titel}`));
    b.title = g.beschreibung;
    b.addEventListener('click', () => {
      if (g.typ === typ) return;
      typ = g.typ;
      A.schreib(TYP_SCHLUESSEL, typ);
      seg.querySelectorAll('.segment-knopf').forEach((x) => x.setAttribute('aria-pressed', x.dataset.typ === typ ? 'true' : 'false'));
      neu();
    });
    seg.appendChild(b);
  }
  return seg;
}

async function neu() {
  platz.setAttribute('aria-busy', 'true');
  try {
    offen = await A.senden(A.kursApi(kurs.id, '/training/neu'), { typ });
  } catch (f) {
    platz.replaceChildren(A.fehlerKarte(f, { text: 'Zum Stadtplan', href: '/' }));
    platz.removeAttribute('aria-busy');
    return;
  }
  platz.removeAttribute('aria-busy');
  zeichneTag(offen.heute, offen.maxProTag);
  zeigeAufgabe();
}

function zeigeAufgabe() {
  const a = offen.aufgabe;
  const g = info.generatoren.find((x) => x.typ === offen.typ) || {};
  aufgabe = I.erzeugeAufgabe(a, { onChange: () => (meldung.textContent = '') });
  const karte = el('article', 'aktendeckel aufgabe-karte training-karte');
  karte.appendChild(el('span', 'reiter', `${offen.typ} · ${g.titel || a.titel}`));
  const innen = el('div', 'aktendeckel-innen');
  const titel = el('h2', 'aufgabe-titel', a.titel);
  titel.tabIndex = -1;
  innen.append(h('div', 'aufgabe-meta', el('span', 'etikett', a.kategorie), el('span', 'punkte zahlen', '1 Punkt')), titel, aufgabe.el);
  const meldung = el('p', 'meldung');
  meldung.setAttribute('role', 'status');
  const reihe = el('div', 'knopf-reihe aufgabe-knoepfe');
  const pruefen = knopf('Prüfen', 'knopf gruen', 'i-pruefen');
  pruefen.id = 'k-pruefen';
  const loesung = knopf('Lösung', 'knopf leise', 'i-auge');
  loesung.id = 'k-loesung';
  reihe.append(pruefen, loesung);
  const rueck = el('div', 'feedback-platz');
  rueck.setAttribute('aria-live', 'polite');
  innen.append(reihe, meldung, rueck);
  karte.appendChild(innen);
  platz.replaceChildren(karte);

  pruefen.addEventListener('click', async () => {
    meldung.textContent = '';
    if (aufgabe.leer()) {
      meldung.textContent = 'Bitte gib zuerst eine Antwort ein.';
      return;
    }
    try {
      const r = await A.senden(A.kursApi(kurs.id, '/training/pruefen'), { typ: offen.typ, seed: offen.seed, signatur: offen.signatur, antwort: aufgabe.antwort() });
      aufgabe.feedback(r.rueckmeldung);
      zeichneTag(r.heute, r.maxProTag);
      if (r.ok) {
        info.punkteGesamt += r.punkteErhalten;
        zeichneTag(r.heute, r.maxProTag);
        fertig(rueck, r, true, [pruefen, loesung]);
      } else {
        const f = el('section', 'feedback falsch');
        f.append(el('h3', 'feedback-titel', 'Noch nicht'), el('p', null, falschText(r.rueckmeldung)));
        rueck.replaceChildren(f);
      }
    } catch (f) {
      meldung.textContent = f.message;
    }
  });
  loesung.addEventListener('click', () => {
    const leiste = el('div', 'bestaetigung');
    leiste.setAttribute('role', 'alertdialog');
    leiste.setAttribute('aria-label', 'Lösung zeigen?');
    const ja = knopf('Lösung zeigen', 'knopf primaer', 'i-auge');
    const nein = knopf('Abbrechen', 'knopf leise');
    nein.addEventListener('click', () => leiste.remove());
    ja.addEventListener('click', async () => {
      leiste.remove();
      try {
        const r = await A.senden(A.kursApi(kurs.id, '/training/loesung'), { typ: offen.typ, seed: offen.seed, signatur: offen.signatur });
        zeichneTag(r.heute, r.maxProTag);
        fertig(rueck, r, false, [pruefen, loesung]);
      } catch (f) {
        meldung.textContent = f.message;
      }
    });
    leiste.append(el('p', null, 'Lösung zeigen? Diese Aufgabe bringt dann keinen Punkt.'), h('div', 'knopf-reihe', ja, nein));
    meldung.after(leiste);
    ja.focus();
  });
}

function falschText(rm) {
  if (rm && rm.felder) {
    const w = Object.values(rm.felder);
    return `${w.filter(Boolean).length} von ${w.length} Lücken stimmen. Falsche Antworten kosten hier nichts.`;
  }
  if (rm && rm.zeilenzahl === 'zu_viele') return 'Deine Tabelle hat zu viele Zeilen.';
  if (rm && rm.zeilenzahl === 'zu_wenige') return 'Deine Tabelle hat zu wenige Zeilen.';
  if (rm && rm.nurReihenfolge) return 'Alle Zeilen stimmen, nur die Reihenfolge nicht.';
  return 'Mindestens ein Wert stimmt noch nicht. Falsche Antworten kosten hier nichts.';
}

function fertig(rueck, r, richtig, knoepfe) {
  aufgabe.loesung(r.loesung);
  aufgabe.sperren(true);
  knoepfe.forEach((k) => (k.disabled = true));
  const f = el('section', 'feedback ' + (richtig ? 'richtig' : 'hinweis'));
  const kopf = el('div', 'feedback-kopf');
  const text = el('div', 'feedback-inhalt');
  text.appendChild(el('h3', 'feedback-titel', richtig ? 'Sauber ermittelt' : 'Lösung'));
  text.appendChild(el('p', 'zahlen', richtig ? (r.punkteErhalten ? '+1 Punkt' : r.gewertet ? 'Schon gewertet – kein weiterer Punkt.' : 'Tagesgrenze erreicht – heute kein Punkt mehr.') : 'Diese Aufgabe ist damit erledigt (ohne Punkt).'));
  kopf.appendChild(text);
  if (richtig) kopf.appendChild(R.stempel('Gelöst', 'geloest', { groesse: 'gross', auftritt: true }));
  f.appendChild(kopf);
  if (Array.isArray(r.erklaerung)) f.appendChild(R.bloecke(r.erklaerung));
  const weiter = knopf('Nächste Aufgabe', 'knopf gruen', 'i-vor');
  weiter.id = 'k-weiter';
  weiter.addEventListener('click', async () => {
    await neu();
    const t = platz.querySelector('.aufgabe-titel');
    if (t) t.focus();
  });
  f.appendChild(h('div', 'knopf-reihe', weiter));
  rueck.replaceChildren(f);
}

async function start() {
  if (!seite) return;
  const kontext = await A.kursKontext(seite);
  if (!kontext) return;
  kurs = kontext.kurs;
  try {
    info = await A.holen(A.kursApi(kurs.id, '/training'));
  } catch (f) {
    seite.replaceChildren(A.fehlerKarte(f));
    return;
  }
  const gemerkt = A.lies(TYP_SCHLUESSEL);
  if (gemerkt && info.generatoren.some((g) => g.typ === gemerkt)) typ = gemerkt;
  const kopf = h('div', 'seiten-kopf', el('span', 'etikett', 'Trainingsplatz · Zufallsaufgaben'), el('h1', null, 'Trainingsplatz'), el('p', null, 'Immer eine Aufgabe nach der anderen: Ergebnis vorhersagen, Gruppen auszählen, Zeilen zählen. Jede richtige Aufgabe bringt einen Punkt, höchstens 30 am Tag.'));
  platz = el('div', 'training-platz');
  tagesBox = el('div', 'karte tages-karte');
  seite.replaceChildren(...[A.vorschauHinweis(kontext), kopf, waehler(), h('div', 'training-raster', platz, h('aside', 'training-seite', tagesBox))].filter(Boolean));
  zeichneTag(info.heute, info.maxProTag);
  await neu();
  document.documentElement.dataset.seite = 'bereit';
}

start();
