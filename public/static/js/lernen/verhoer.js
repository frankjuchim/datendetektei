// Verhör (/verhoer/:akte, DESIGN.md §5.9, Spec §7.9): Startkarte mit Rahmensatz, laufender Versuch mit Timer nach der
// Endzeit des Servers (der Client zeigt nur an), keine Rückmeldung zum Inhalt, Antwortentwürfe im localStorage,
// Abgabe mit Bestätigung in der Seite, Ergebnis mit Stempel. Kein Ausführen und kein Prüfen (Abimodus streng).

const V = new URL(import.meta.url).search;
const [A, R, I, K] = await Promise.all([
  import('../kern/api.js' + V),
  import('../kern/render.js' + V),
  import('../kern/interaktionen.js' + V),
  import('./konsole_lern.js' + V)
]);
const { el, h, knopf } = R;

const seite = document.getElementById('seite');
const akteNr = Number((/^\/verhoer\/([1-7])$/.exec(window.location.pathname) || [])[1]);
const BEWEISE = ['Fundbuch-Seite', 'Schloss-Code', 'Kassenbon', 'Vereinsausweis', 'Ermittlungsnetz', 'Steckbrief', 'Detektei-Lizenz'];

let kontext = null;
let kurs = null;
let status = null;
let lauf = null; // { v, offset, index, aufgaben: Map id → { aufgabe, el, geaendert }, uhr, angesagt }

const basis = () => A.kursApi(kurs.id, `/verhoere/${akteNr}`);

function zeitText(iso) {
  return new Date(iso).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
}

/* ---------- Kopfband ---------- */

function kopfband(zeile1, titel, mitTimer = false) {
  const band = el('header', 'verhoer-band');
  const links = h('div', null, el('p', 'verhoer-etikett', zeile1), el('h1', 'verhoer-titel', titel));
  band.appendChild(links);
  if (mitTimer) {
    const timer = el('div', 'verhoer-timer');
    timer.setAttribute('role', 'timer');
    timer.setAttribute('aria-label', 'Verbleibende Zeit');
    const ring = R.ring(1, { text: '', groesse: 48 });
    ring.classList.add('timer-ring');
    const zeit = el('span', 'timer-zeit zahlen', '--:--');
    zeit.id = 'timer-zeit';
    timer.append(ring, zeit);
    band.appendChild(timer);
  }
  return band;
}

/* ---------- Startkarte ---------- */

function zeigeStart(meldung = null) {
  const s = status;
  const karte = el('section', 'verhoer-karte-gross');
  karte.appendChild(kopfband(`Verhör ${s.akte.nr} · Akte ${s.akte.nr} · ${s.akte.titel}`, s.verhoer.titel));
  const innen = el('div', 'verhoer-innen start');
  if (s.verhoer.rahmensatz) {
    const zitat = el('blockquote', 'briefing');
    zitat.appendChild(R.md(s.verhoer.rahmensatz));
    zitat.appendChild(el('cite', null, '– Edda Lorenz'));
    innen.appendChild(zitat);
  }
  const fakten = el('dl', 'verhoer-fakten');
  fakten.append(el('dt', null, 'Zeit'), el('dd', 'zahlen', `${s.verhoer.dauerMin} Minuten`));
  fakten.append(el('dt', null, 'Aufgaben'), el('dd', 'zahlen', `${s.verhoer.anzahl}, zufällig aus dem Aktenschrank gezogen`));
  fakten.append(el('dt', null, 'Versuche'), el('dd', 'zahlen', s.versuche ? `${s.versuche} beendet` : 'noch keiner'));
  innen.appendChild(fakten);
  innen.appendChild(h('div', 'notiz', R.icon('i-notiz'), el('p', 'notiz-titel', 'So läuft das Verhör'), el('p', null, 'Während des Verhörs gibt es kein Feedback. Der beste Versuch zählt, ein neuer ist nach 12 Stunden möglich. Die Aufgaben sind im Abitur-Stil gestellt – Ausführen und Prüfen gibt es hier nicht.')));
  if (s.bester) {
    const zeile = el('div', 'bester-versuch');
    zeile.appendChild(el('p', 'zahlen', `Bester Versuch: ${s.bester.punkte} von ${s.bester.max} Punkten (${s.bester.prozent} %)`));
    if (s.bester.besiegt) zeile.appendChild(R.stempel(`Besiegt · ${s.bester.prozent} %`, 'geloest'));
    innen.appendChild(zeile);
  }
  if (meldung) innen.appendChild(el('p', 'meldung fehler', meldung));
  const reihe = el('div', 'knopf-reihe');
  if (s.laufend) {
    const b = knopf('Verhör fortsetzen', 'knopf primaer gross', 'i-verhoer');
    b.id = 'k-verhoer-start';
    b.addEventListener('click', () => starten());
    reihe.appendChild(b);
    innen.appendChild(el('p', 'hinweis-klein', `Dein Verhör läuft noch bis ${zeitText(s.laufend.ende)} Uhr.`));
  } else if (!s.frei) {
    innen.appendChild(el('p', 'hinweis-klein', s.grund || 'Dieses Verhör ist noch gesperrt.'));
  } else if (s.naechsterVersuchAb) {
    innen.appendChild(el('p', 'hinweis-klein', `Ein neuer Versuch ist ab ${zeitText(s.naechsterVersuchAb)} Uhr möglich.`));
  } else {
    const b = knopf(s.versuche ? 'Neuen Versuch beginnen' : 'Verhör beginnen', 'knopf primaer gross', 'i-verhoer');
    b.id = 'k-verhoer-start';
    b.addEventListener('click', () => starten());
    reihe.appendChild(b);
  }
  if (s.versuche) {
    const e = knopf('Letztes Ergebnis ansehen', 'knopf');
    e.addEventListener('click', () => letztesErgebnis());
    reihe.appendChild(e);
  }
  reihe.appendChild(A.linkKnopf(`Zur Akte ${s.akte.nr}`, `/akte/${s.akte.nr}`, 'knopf leise'));
  innen.appendChild(reihe);
  karte.appendChild(innen);
  seite.replaceChildren(...[A.vorschauHinweis(kontext), karte].filter(Boolean));
}

async function starten() {
  try {
    const v = await A.senden(basis() + '/start');
    zeigeLauf(v);
  } catch (f) {
    zeigeStart(f.message);
  }
}

async function letztesErgebnis() {
  try {
    zeigeErgebnis(await A.holen(basis() + '/versuch'));
  } catch (f) {
    zeigeStart(f.message);
  }
}

/* ---------- Laufender Versuch ---------- */

const entwurfSchluessel = (id) => `dd-verhoer:${kurs.id}:${lauf.v.id}:${id}`;

function restMs() {
  return Date.parse(lauf.v.ende) - (Date.now() + lauf.offset);
}

function tick() {
  if (!lauf) return;
  const rest = Math.max(0, restMs());
  const sek = Math.ceil(rest / 1000);
  const text = `${String(Math.floor(sek / 60)).padStart(2, '0')}:${String(sek % 60).padStart(2, '0')}`;
  const zeit = document.getElementById('timer-zeit');
  if (zeit) {
    zeit.textContent = text;
    zeit.closest('.verhoer-timer').classList.toggle('knapp', rest < 5 * 60000);
  }
  const ring = document.querySelector('.timer-ring .wert');
  if (ring) {
    const gesamt = Date.parse(lauf.v.ende) - Date.parse(lauf.v.beginn);
    const u = Number(ring.getAttribute('stroke-dasharray'));
    ring.setAttribute('stroke-dashoffset', (u * (1 - Math.max(0, Math.min(1, rest / gesamt)))).toFixed(1));
  }
  const ansage = document.getElementById('timer-ansage');
  for (const [grenze, satz] of [[5, 'Noch 5 Minuten.'], [1, 'Noch 1 Minute.']]) {
    if (rest <= grenze * 60000 && rest > 0 && !lauf.angesagt.has(grenze)) {
      lauf.angesagt.add(grenze);
      if (ansage) ansage.textContent = satz;
    }
  }
  if (rest <= 0 && !lauf.zeitAus) {
    lauf.zeitAus = true;
    if (ansage) ansage.textContent = 'Die Zeit ist abgelaufen.';
    abgeben(true);
  }
}

function aufgabeObjekt(index) {
  const o = lauf.v.aufgaben[index];
  if (lauf.aufgaben.has(o.id)) return lauf.aufgaben.get(o.id);
  const eintrag = { geaendert: false };
  const aufgabe = I.erzeugeAufgabe(o, {
    sqlTeil: (ia, k, nr) => {
      const konsole = K.erzeugeLernKonsole({ entwurf: `${entwurfSchluessel(o.id)}:sql:${nr}`, abimodus: 'aus', beiAenderung: () => k.geaendert() });
      return {
        kind: 'sql',
        konsole,
        ui: konsole.el,
        antwort: () => konsole.wert(),
        leer: () => konsole.wert().trim() === '',
        setze: (s) => typeof s === 'string' && konsole.setzeWert(s),
        feedback() {},
        loesung() {},
        sperren: (an) => konsole.sperren(an)
      };
    },
    speicher: entwurfSchluessel(o.id),
    sie: true, // Verhör im Abitur-Stil: auch die Bedienhinweise siezen
    onChange: () => {
      eintrag.geaendert = true;
      A.schreibJson(entwurfSchluessel(o.id), eintrag.aufgabe.antwort());
    }
  });
  eintrag.aufgabe = aufgabe;
  // einteiliges sql: die Konsole steht unter dem Aufgabentext
  if (!aufgabe.mehrteilig && aufgabe.teile[0].kind === 'sql') aufgabe.el.appendChild(aufgabe.teile[0].konsole.el);
  const gespeichert = A.liesJson(entwurfSchluessel(o.id));
  if (gespeichert !== null && aufgabe.teile.every((t) => t.kind !== 'sql')) aufgabe.setze(gespeichert);
  else if (gespeichert !== null && aufgabe.mehrteilig) aufgabe.setze(gespeichert);
  lauf.aufgaben.set(o.id, eintrag);
  return eintrag;
}

function zeichneKacheln() {
  const liste = document.getElementById('verhoer-kacheln');
  if (!liste) return;
  liste.replaceChildren();
  lauf.v.aufgaben.forEach((o, i) => {
    const b = el('button', 'kachel' + (o.beantwortet ? ' beantwortet' : ''), i + 1);
    b.type = 'button';
    b.setAttribute('aria-label', `Aufgabe ${i + 1}${o.beantwortet ? ', Antwort gespeichert' : ''}`);
    if (i === lauf.index) b.setAttribute('aria-current', 'step');
    b.addEventListener('click', () => wechsle(i));
    liste.appendChild(h('li', null, b));
  });
}

function zeigeAufgabe() {
  const o = lauf.v.aufgaben[lauf.index];
  const eintrag = aufgabeObjekt(lauf.index);
  const ziel = document.getElementById('verhoer-aufgabe');
  const kopf = h('div', 'aufgabe-meta', R.sterne(o.stufe), el('span', 'punkte zahlen', `${o.punkte} Punkte`));
  const titel = el('h2', 'aufgabe-titel', `Aufgabe ${lauf.index + 1}: ${o.titel}`);
  titel.tabIndex = -1;
  const reihe = el('div', 'knopf-reihe');
  const speichern = knopf('Antwort speichern', 'knopf', 'i-pruefen');
  speichern.id = 'k-speichern';
  speichern.addEventListener('click', () => speichereAktuelle(true));
  reihe.appendChild(speichern);
  if (lauf.index < lauf.v.aufgaben.length - 1) {
    const weiter = knopf('Nächste Aufgabe', 'knopf', 'i-vor');
    weiter.id = 'k-naechste';
    weiter.addEventListener('click', () => wechsle(lauf.index + 1));
    reihe.appendChild(weiter);
  }
  ziel.replaceChildren(kopf, titel, eintrag.aufgabe.el, reihe);
  document.getElementById('verhoer-zaehler').textContent = `Verhör ${akteNr} · Akte ${akteNr} · Aufgabe ${lauf.index + 1} von ${lauf.v.aufgaben.length}`;
  zeichneKacheln();
}

async function speichereAktuelle(mitToast) {
  const o = lauf.v.aufgaben[lauf.index];
  const eintrag = lauf.aufgaben.get(o.id);
  if (!eintrag) return true;
  if (!mitToast && !eintrag.geaendert) return true;
  try {
    await A.senden(basis() + '/antwort', { aufgabe: o.id, antwort: eintrag.aufgabe.antwort() });
    eintrag.geaendert = false;
    o.beantwortet = !eintrag.aufgabe.leer();
    zeichneKacheln();
    if (mitToast) A.toast(o.beantwortet ? 'Antwort gespeichert.' : 'Antwort entfernt.');
    return true;
  } catch (f) {
    if (f.status === 409) {
      await abgeben(true);
      return false;
    }
    A.toast(f.message);
    return false;
  }
}

async function wechsle(i) {
  if (i === lauf.index) return;
  await speichereAktuelle(false);
  if (!lauf) return;
  lauf.index = i;
  zeigeAufgabe();
  const t = document.querySelector('#verhoer-aufgabe .aufgabe-titel');
  if (t) t.focus();
}

function abgabeFragen() {
  const platz = document.getElementById('abgabe-platz');
  const offen = lauf.v.aufgaben.filter((o) => !o.beantwortet).length;
  const leiste = el('div', 'bestaetigung');
  leiste.setAttribute('role', 'alertdialog');
  leiste.setAttribute('aria-label', 'Verhör abgeben?');
  const ja = knopf('Ja, abgeben', 'knopf primaer');
  ja.id = 'k-abgeben-ja';
  const nein = knopf('Weiter bearbeiten', 'knopf leise');
  ja.addEventListener('click', () => abgeben(false));
  nein.addEventListener('click', () => platz.replaceChildren());
  leiste.append(el('p', null, offen ? `Verhör abgeben? ${A.mehrzahl(offen, 'Aufgabe ist', 'Aufgaben sind')} noch ohne gespeicherte Antwort.` : 'Verhör abgeben? Danach kannst du nichts mehr ändern.'), h('div', 'knopf-reihe', ja, nein));
  platz.replaceChildren(leiste);
  ja.focus();
}

async function abgeben(zeitAus) {
  if (!lauf || lauf.gibtAb) return;
  lauf.gibtAb = true;
  if (!zeitAus) await speichereAktuelle(false);
  else {
    try {
      await speichereAktuelle(false);
    } catch {
      /* abgelaufen – zählt nicht mehr */
    }
  }
  let ergebnis;
  try {
    ergebnis = await A.senden(basis() + '/abgeben');
  } catch (f) {
    if (f.status === 409) {
      try {
        ergebnis = await A.holen(basis() + '/versuch');
      } catch (f2) {
        A.toast(f2.message);
        lauf.gibtAb = false;
        return;
      }
    } else {
      A.toast(f.message);
      lauf.gibtAb = false;
      return;
    }
  }
  const v = lauf.v;
  clearInterval(lauf.uhr);
  for (const o of v.aufgaben) A.schreib(`dd-verhoer:${kurs.id}:${v.id}:${o.id}`, null);
  lauf = null;
  zeigeErgebnis(ergebnis);
}

function zeigeLauf(v) {
  if (!v || !v.laeuft) {
    zeigeErgebnis(v);
    return;
  }
  lauf = { v, offset: Date.parse(v.serverZeit) - Date.now(), index: 0, aufgaben: new Map(), angesagt: new Set(), uhr: null };
  const karte = el('section', 'verhoer-karte-gross aktiv');
  const band = kopfband('', v.titel, true);
  band.querySelector('.verhoer-etikett').id = 'verhoer-zaehler';
  karte.appendChild(band);
  const raster = el('div', 'verhoer-raster');
  const links = el('div', 'verhoer-aufgabe');
  links.id = 'verhoer-aufgabe';
  const rechts = el('aside', 'verhoer-seite');
  const kacheln = el('ol', 'kacheln');
  kacheln.id = 'verhoer-kacheln';
  kacheln.setAttribute('aria-label', 'Aufgaben des Verhörs');
  const abgeben = knopf('Verhör abgeben', 'knopf primaer');
  abgeben.id = 'k-abgeben';
  abgeben.addEventListener('click', () => abgabeFragen());
  const ansage = el('p', 'nur-sr');
  ansage.id = 'timer-ansage';
  ansage.setAttribute('aria-live', 'assertive');
  const platz = el('div');
  platz.id = 'abgabe-platz';
  rechts.append(R.stempel('Im Verhör', 'abi', { groesse: 'gross' }), el('p', 'etikett', 'Aufgaben'), kacheln, el('p', 'hinweis-klein', 'Während des Verhörs gibt es kein Feedback. Gespeichert wird nur, ob du eine Antwort abgegeben hast – nicht, ob sie stimmt.'), abgeben, platz, ansage);
  raster.append(links, rechts);
  karte.appendChild(raster);
  seite.replaceChildren(...[A.vorschauHinweis(kontext), karte].filter(Boolean));
  zeigeAufgabe();
  tick();
  lauf.uhr = setInterval(tick, 1000);
  document.documentElement.dataset.seite = 'verhoer';
}

/* ---------- Ergebnis ---------- */

function zeigeErgebnis(e) {
  const karte = el('section', 'verhoer-karte-gross ergebnis-ansicht');
  karte.appendChild(kopfband(`Verhör ${akteNr} · Ergebnis`, status.verhoer.titel));
  const innen = el('div', 'verhoer-innen');
  const kopf = el('div', 'ergebnis-kopfzeile');
  const text = el('div');
  text.appendChild(el('h2', null, e.besiegt ? 'Das Verhör ist gewonnen.' : 'Diesmal reicht es noch nicht.'));
  text.appendChild(el('p', 'zahlen', `${e.punkte} von ${e.max} Punkten · ${e.prozent} %`));
  text.appendChild(el('p', 'hinweis-klein', e.besiegt ? 'Das Beweisstück hängt jetzt an der Pinnwand der Detektei.' : 'Ab 50 % ist das Verhör gewonnen. In 12 Stunden kannst du es noch einmal versuchen – der beste Versuch zählt.'));
  kopf.appendChild(text);
  kopf.appendChild(R.stempel(e.besiegt ? `Besiegt · ${e.prozent} %` : 'Nicht besiegt', e.besiegt ? 'geloest' : 'abi', { groesse: 'gross', auftritt: true }));
  innen.appendChild(kopf);
  const ul = el('ul', 'ergebnis-liste');
  e.aufgaben.forEach((a, i) => {
    const li = el('li', a.richtig ? 'richtig' : 'falsch');
    li.append(el('span', 'ergebnis-zeichen', a.richtig ? '✔' : '✘'), el('span', null, `Aufgabe ${i + 1}: ${a.titel}`), el('span', 'zahlen', `${a.erreicht} / ${a.punkte}`));
    li.setAttribute('aria-label', `Aufgabe ${i + 1}: ${a.titel} – ${a.richtig ? 'richtig' : 'nicht richtig'}, ${a.erreicht} von ${a.punkte} Punkten`);
    ul.appendChild(li);
  });
  innen.appendChild(ul);
  if (Array.isArray(e.neueAbzeichen) && e.neueAbzeichen.length) innen.appendChild(el('p', 'abzeichen-neu', `${e.neueAbzeichen.length > 1 ? 'Neue Abzeichen' : 'Neues Abzeichen'}: ${e.neueAbzeichen.map((x) => (x.akte ? `${x.name} (Akte ${x.akte})` : x.name)).join(', ')}`));
  if (e.besiegt) {
    const p = el('div', 'polaroid einzeln');
    p.append(el('span', 'nadel'), h('span', 'polaroid-bild', R.icon('i-notiz')), el('span', 'polaroid-text', BEWEISE[akteNr - 1] || 'Beweisstück'));
    innen.appendChild(p);
  }
  const reihe = el('div', 'knopf-reihe');
  reihe.append(A.linkKnopf(`Zur Akte ${akteNr}`, `/akte/${akteNr}`, 'knopf primaer'), A.linkKnopf('Zum Stadtplan', '/', 'knopf'));
  innen.appendChild(reihe);
  karte.appendChild(innen);
  seite.replaceChildren(...[A.vorschauHinweis(kontext), karte].filter(Boolean));
  document.documentElement.dataset.seite = 'ergebnis';
}

/* ---------- Start ---------- */

async function start() {
  if (!seite || !akteNr) return;
  kontext = await A.kursKontext(seite);
  if (!kontext) return;
  kurs = kontext.kurs;
  try {
    status = await A.holen(basis());
  } catch (f) {
    seite.replaceChildren(A.fehlerKarte(f, { text: 'Zum Stadtplan', href: '/' }));
    return;
  }
  document.title = `${status.verhoer.titel} – Datendetektei`;
  zeigeStart();
  document.documentElement.dataset.seite = 'bereit';
}

start();
