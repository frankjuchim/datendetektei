// Reiter „Einstellungen“ (DESIGN §5.11, Spec §7.11): Niveau eA/gA (gA blendet Akte 5 aus), Akten freischalten,
// Verhöre automatisch ab 60 % / offen / gesperrt (Kurs und je Akte), Scoreboard, Beamer-Board an/aus, Board-Link
// kopieren und neu erzeugen (mit Bestätigung). Speichern per PUT /api/lehrkraft/kurse/:kurs/einstellungen.
// Gesperrter Kurs: alles nur lesend.

const V = new URL(import.meta.url).search;
const [G, B] = await Promise.all([import('./gemeinsam.js' + V), import('./board.js' + V)]);
const { R } = G;
const { el, h, knopf } = R;

const VERHOER = [
  { wert: 'auto', text: 'automatisch ab 60 %' },
  { wert: 'offen', text: 'offen' },
  { wert: 'gesperrt', text: 'gesperrt' }
];
const NIVEAUS = [
  { wert: 'eA', text: 'eA (LK)' },
  { wert: 'gA', text: 'gA (GK)' }
];

/** Segment-Umschalter (aria-pressed). → { element, wert(), setze(w), beiAenderung(f) } */
function segment(optionen, wert, beschriftung, gesperrt, idPraefix) {
  const gruppe = el('div', 'segment');
  gruppe.setAttribute('role', 'group');
  gruppe.setAttribute('aria-label', beschriftung);
  let aktuell = wert;
  const hoerer = [];
  const knoepfe = optionen.map((o) => {
    const b = el('button', 'segment-knopf', o.text);
    b.type = 'button';
    b.id = `${idPraefix}-${o.wert}`;
    b.disabled = !!gesperrt;
    b.addEventListener('click', () => {
      setze(o.wert);
      hoerer.forEach((f) => f(o.wert));
    });
    gruppe.appendChild(b);
    return { b, wert: o.wert };
  });
  function setze(w) {
    aktuell = w;
    for (const k of knoepfe) k.b.setAttribute('aria-pressed', k.wert === w ? 'true' : 'false');
  }
  setze(wert);
  return { element: gruppe, wert: () => aktuell, setze, beiAenderung: (f) => hoerer.push(f) };
}

function feld(titel, inhalt, hilfe) {
  const fs = el('fieldset', 'einstellung');
  fs.appendChild(el('legend', 'einstellung-titel', titel));
  if (hilfe) fs.appendChild(el('p', 'hinweis-klein', hilfe));
  fs.appendChild(inhalt);
  return fs;
}

function schalterZeile(id, name, hinweis, an, gesperrt) {
  const label = el('label', 'schalter-zeile');
  label.htmlFor = id;
  const text = el('span', 'schalter-text');
  text.appendChild(el('span', 'schalter-name', name));
  if (hinweis) text.appendChild(el('span', 'schalter-hinweis', hinweis));
  label.appendChild(text);
  const cb = el('input', 'schalter');
  cb.type = 'checkbox';
  cb.id = id;
  cb.checked = !!an;
  cb.disabled = !!gesperrt;
  label.appendChild(cb);
  return { label, cb, text };
}

export async function zeige(panel, ctx) {
  const k = ctx.kurs;
  const nurLesen = !!k.nurLesen;
  const e = k.einstellungen;
  const teile = [];
  if (nurLesen) teile.push(G.notiz('Kurs gesperrt – nur lesend', 'Der Kurs ist im Portal gesperrt. Die Einstellungen lassen sich erst wieder ändern, wenn er dort entsperrt ist.'));

  const raster = el('div', 'lk-einstellungen');

  /* ---------- Spalte 1: Niveau und Akten ---------- */
  const { karte: k1 } = G.karte('Niveau und Akten', 'Schülerinnen und Schüler sehen nur freigeschaltete Akten.', { id: 'ei-akten' });
  const niveau = segment(NIVEAUS, e.niveau, 'Niveau', nurLesen, 'ei-niveau');
  k1.appendChild(feld('Niveau', niveau.element, 'gA blendet alle eA-Inhalte aus, auch Akte 5 (Der Bauplan).'));

  const liste = el('ul', 'akten-schalter');
  const schalter = [];
  for (const a of ctx.akten) {
    const nurEa = Array.isArray(a.niveaus) && a.niveaus.indexOf('gA') < 0;
    const z = schalterZeile(`ei-akte-${a.nr}`, G.akteLang(a.nr, a.titel), null, e.akten.indexOf(a.nr) >= 0, nurLesen);
    if (nurEa) z.text.appendChild(el('span', 'niveau ea', 'eA'));
    const hinweis = nurEa ? el('span', 'schalter-hinweis', 'bei gA ausgeblendet') : null;
    if (hinweis) z.text.appendChild(hinweis);
    const li = el('li');
    li.appendChild(z.label);
    liste.appendChild(li);
    schalter.push({ nr: a.nr, nurEa, cb: z.cb, li, hinweis });
  }
  k1.appendChild(feld('Akten freischalten', liste));
  function niveauAnwenden() {
    const ga = niveau.wert() === 'gA';
    for (const s of schalter) {
      const aus = s.nurEa && ga;
      s.cb.disabled = nurLesen || aus;
      s.li.classList.toggle('ausgegraut', aus);
      if (s.hinweis) s.hinweis.hidden = !aus;
    }
  }
  niveau.beiAenderung(niveauAnwenden);
  niveauAnwenden();
  raster.appendChild(k1);

  /* ---------- Spalte 2: Verhöre, Scoreboard, Board ---------- */
  const spalte = el('div', 'lk-panel');
  const { karte: k2 } = G.karte('Verhöre', 'Automatisch: frei, sobald 60 % der Punkte der Ermittlungen einer Akte erreicht sind.', { id: 'ei-verhoere' });
  const verhoer = segment(VERHOER, e.verhoer, 'Verhöre im Kurs', nurLesen, 'ei-verhoer');
  k2.appendChild(feld('Für den ganzen Kurs', verhoer.element));
  const jeAkte = el('ul', 'verhoer-akten');
  const auswahlJeAkte = [];
  for (const a of ctx.akten.filter((x) => !x.kuer)) {
    const id = `ei-verhoer-akte-${a.nr}`;
    const label = el('label', null, `Verhör ${a.nr} · ${a.titel}`);
    label.htmlFor = id;
    const s = el('select', 'lk-auswahl');
    s.id = id;
    s.disabled = nurLesen;
    for (const [w, t] of [['', 'wie im Kurs'], ...VERHOER.map((v) => [v.wert, v.text])]) {
      const o = el('option', null, t);
      o.value = w;
      s.appendChild(o);
    }
    s.value = (e.verhoerAkten && e.verhoerAkten[String(a.nr)]) || '';
    jeAkte.appendChild(h('li', null, label, h('span', 'lk-feld', s)));
    auswahlJeAkte.push({ nr: a.nr, s });
  }
  const details = el('details');
  details.appendChild(el('summary', 'link-ziel', 'Ausnahmen je Akte'));
  details.appendChild(jeAkte);
  if (Object.keys(e.verhoerAkten || {}).length) details.open = true;
  k2.appendChild(details);
  spalte.appendChild(k2);

  const { karte: k3 } = G.karte('Rangliste und Beamer-Board', null, { id: 'ei-board' });
  const score = schalterZeile('ei-scoreboard', 'Scoreboard', 'Kurs-Rangliste mit Anzeigenamen für die Schülerinnen und Schüler (die Schüleransicht dazu folgt)', e.scoreboard, nurLesen);
  const beamer = schalterZeile('ei-beamer', 'Beamer-Board', 'eigener, geheimer Link je Kurs – ohne Anmeldung am Beamer', e.beamer, nurLesen);
  const schalterListe = h('ul', 'akten-schalter', h('li', null, score.label), h('li', null, beamer.label));
  k3.appendChild(schalterListe);
  const linkPlatz = el('div');
  k3.appendChild(linkPlatz);
  const zeichneLink = () => linkPlatz.replaceChildren(B.boardLink(ctx, { nachAenderung: zeichneLink }));
  zeichneLink();
  spalte.appendChild(k3);
  raster.appendChild(spalte);
  teile.push(raster);

  /* ---------- Speichern ---------- */
  const speichern = knopf('Einstellungen speichern', 'knopf primaer', 'i-pruefen');
  speichern.id = 'ei-speichern';
  const rueck = G.rueckmeldung();
  rueck.id = 'ei-rueckmeldung';
  const leiste = h('div', 'speicher-leiste', speichern, rueck);
  if (nurLesen) leiste.hidden = true;
  teile.push(leiste);

  speichern.addEventListener('click', async () => {
    const ga = niveau.wert() === 'gA';
    const verhoerAkten = {};
    for (const { nr, s } of auswahlJeAkte) verhoerAkten[String(nr)] = s.value || null;
    const body = {
      akten: schalter.filter((s) => s.cb.checked && !(ga && s.nurEa)).map((s) => s.nr),
      niveau: niveau.wert(),
      verhoer: verhoer.wert(),
      verhoerAkten,
      scoreboard: score.cb.checked,
      beamer: beamer.cb.checked
    };
    speichern.disabled = true;
    rueck.className = 'rueckmeldung';
    rueck.textContent = 'Wird gespeichert …';
    try {
      const r = await G.ersetzen(G.lkApi(ctx.kurs.id, '/einstellungen'), body);
      ctx.kursAktualisiert(r.kurs, { ausser: 'einstellungen' });
      zeichneLink();
      rueck.className = 'rueckmeldung ok';
      rueck.textContent = 'Gespeichert.';
    } catch (f) {
      rueck.className = 'rueckmeldung fehler';
      rueck.textContent = f.message;
    } finally {
      speichern.disabled = false;
    }
  });

  panel.replaceChildren(...teile);
}
