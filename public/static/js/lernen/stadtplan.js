// Stadtplan v1 (Startseite angemeldet, DESIGN.md §5.1, Spec §7.7): eigene SVG-Illustration im Akten-Stil mit sechs
// Orten für sieben Akten (Detektei = Akte 5 und 7, zweiter Ring), Fortschrittsring je Ort, gesperrte Akten im Nebel,
// Faden der bearbeiteten Akten; daneben Rang, Steckbrief, Akte-Detail, „Deine Fallen“, Abzeichen und die Pinnwand.
// Steckbrief und Beweisstücke kommen aus GET /api/kurse/:kurs/pinnwand (Regel E10, Phase 6); die große Pinnwand
// steht unter /pinnwand.
// Auf dem Handy ist der Plan waagerecht wischbar, darunter steht die Aktenliste. Ausgaben nur als Textknoten.

const V = new URL(import.meta.url).search;
const [A, R, B, T] = await Promise.all([
  import('../kern/api.js' + V),
  import('../kern/render.js' + V),
  import('./pinnwand_bilder.js' + V),
  import('./pinnwand_teile.js' + V)
]);
const { el, h, svg } = R;

const ORTE = [
  { akten: [1], ort: 'Fundbüro', ortLang: 'Fundbüro in der Alten Waage', stadtteil: 'Altstadt', x: 150, y: 135 },
  { akten: [2], ort: 'Hafenkante', ortLang: 'StadtRad-Station Hafenkante', stadtteil: 'Hafenviertel', x: 470, y: 196 },
  { akten: [3], ort: 'Festplatz', ortLang: 'Festplatz auf den Weserwiesen', stadtteil: 'Weserufer', x: 562, y: 372 },
  { akten: [4], ort: 'Vereinsheim TuS', ortLang: 'Vereinsheim des TuS Weserstedt', stadtteil: 'Mühlenfeld', x: 715, y: 285 },
  { akten: [5, 7], ort: 'Detektei', ortLang: 'Detektei Lorenz, Kontorgasse', stadtteil: 'Altstadt', x: 300, y: 112 },
  { akten: [6], ort: 'Rathaus', ortLang: 'Rathaus am Marktplatz', stadtteil: 'Altstadt', x: 175, y: 290 }
];
const ORT_VON = new Map(ORTE.flatMap((o) => o.akten.map((nr) => [nr, o])));
const VIERTEL = [
  ['Altstadt', 60, 232], ['Hafenviertel', 556, 236], ['Mühlenfeld', 680, 350], ['Weserufer', 480, 478],
  ['Nordheide', 40, 470], ['Bahnhofsviertel', 640, 40], ['Lindenhof', 250, 478]
];

const bereich = document.getElementById('stadtplan-bereich');
const seite = document.getElementById('seite');

let stand = null;
let pinnwandDaten = null; // GET …/pinnwand (oder null, wenn nicht verfügbar)
let akten = []; // je Akte 1–7: { nr, titel, sichtbar, frei, anteil, ermittlungen, verhoer, geschlossen, punkte }
let gewaehlt = null;

/* ---------- Daten ---------- */

function akteDaten(nr, plan) {
  const s = stand.akten.find((a) => a.nr === nr);
  const niveau = stand.kurs.niveau;
  const sichtbar = !plan || plan.niveaus.includes(niveau);
  if (!s) return { nr, titel: plan ? plan.titel : `Akte ${nr}`, sichtbar, frei: false, geladen: false, anteil: 0, ermittlungen: [], verhoer: null, geschlossen: false, punkte: 0 };
  const mitAufgaben = s.ermittlungen.filter((e) => e.anzahl > 0); // Akte 7: Ermittlung ohne Lab-Aufgaben
  const geschlossen = mitAufgaben.length > 0 && mitAufgaben.every((e) => e.geloest >= e.anzahl);
  return { ...s, sichtbar, geladen: true, geschlossen };
}

/* ---------- SVG-Plan ---------- */

function bloecke() {
  const g = svg('g');
  let seed = 7;
  const zufall = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  for (let y = 14; y < 500; y += 46) {
    for (let x = 10; x < 800; x += 58) {
      if (zufall() < 0.18) continue;
      const w = 38 + zufall() * 12;
      const hoehe = 26 + zufall() * 10;
      g.appendChild(svg('rect', { x: x.toFixed(0), y: y.toFixed(0), width: w.toFixed(0), height: hoehe.toFixed(0), rx: 3 }, 'block'));
    }
  }
  return g;
}

function strasse(d, breite, rand = true) {
  const g = svg('g');
  if (rand) g.appendChild(svg('path', { d, 'stroke-width': breite + 3 }, 'strasse-rand'));
  g.appendChild(svg('path', { d, 'stroke-width': breite }, 'strasse'));
  return g;
}

function svgText(text, attr, klasse) {
  const t = svg('text', attr, klasse);
  t.textContent = text;
  return t;
}

function ortStatus(ort) {
  const liste = ort.akten.map((nr) => akten[nr - 1]).filter((a) => a && a.sichtbar);
  const frei = liste.filter((a) => a.frei);
  return { liste, frei, gesperrt: frei.length === 0 };
}

function ortMeta(ort, st) {
  const nummern = st.liste.map((a) => a.nr);
  const kennung = nummern.length > 1 ? `AKTE ${nummern.join(' + ')}` : `AKTE ${nummern[0]}`;
  if (st.gesperrt) return { kennung, zustand: 'IM NEBEL' };
  const a = st.frei[0];
  if (a.geschlossen && st.frei.length === st.liste.length) return { kennung, zustand: 'GESCHLOSSEN' };
  return { kennung, zustand: `${Math.round((a.anteil || 0) * 100)} %` };
}

function zeichneOrt(ort, ebeneOrte, ebeneNebel) {
  const st = ortStatus(ort);
  if (!st.liste.length) return;
  const meta = ortMeta(ort, st);
  const fertig = meta.zustand === 'GESCHLOSSEN';
  const g = svg('g', { transform: `translate(${ort.x} ${ort.y})`, tabindex: 0, role: 'button' }, 'ort' + (st.gesperrt ? ' gesperrt' : '') + (fertig ? ' fertig' : ''));
  g.dataset.akte = String(st.liste[0].nr);
  const titel = st.liste.map((a) => `Akte ${a.nr}: ${a.titel}`).join(', ');
  g.setAttribute('aria-label', `${ort.ort} – ${titel} – ${meta.zustand.toLowerCase()}`);
  const R0 = 30;
  const U = 2 * Math.PI * R0;
  g.appendChild(svg('circle', { r: 42 }, 'auswahl'));
  g.appendChild(svg('circle', { r: 24 }, 'teller'));
  if (!st.gesperrt) {
    g.appendChild(svg('circle', { r: R0 }, 'spur'));
    g.appendChild(svg('circle', { r: R0, 'stroke-dasharray': U.toFixed(1), 'stroke-dashoffset': (U * (1 - (st.frei[0].anteil || 0))).toFixed(1), transform: 'rotate(-90)' }, 'wert'));
    const zweite = st.frei[1];
    if (zweite) {
      const R2 = 37;
      const U2 = 2 * Math.PI * R2;
      g.appendChild(svg('circle', { r: R2 }, 'spur zweit'));
      g.appendChild(svg('circle', { r: R2, 'stroke-dasharray': U2.toFixed(1), 'stroke-dashoffset': (U2 * (1 - (zweite.anteil || 0))).toFixed(1), transform: 'rotate(-90)' }, 'wert zweit'));
    }
    g.appendChild(svgText(String(st.frei.length > 1 ? st.frei.map((a) => a.nr).join('+') : st.frei[0].nr), { y: 1 }, 'nr' + (st.frei.length > 1 ? ' klein' : '')));
  } else {
    const schloss = svg('use', { href: '/static/img/icons.svg#i-schloss', x: -11, y: -12, width: 22, height: 22 }, 'schloss');
    g.appendChild(schloss);
  }
  if (fertig) {
    const haken = svg('g', { transform: 'translate(22 -22)' });
    haken.appendChild(svg('circle', { r: 10 }, 'haken'));
    haken.appendChild(svg('path', { d: 'M-4.5 0.5 -1.2 3.8 4.5 -3' }, 'haken-strich'));
    g.appendChild(haken);
  }
  const zeile2 = `${meta.kennung} · ${meta.zustand}`;
  const breite = Math.max(ort.ort.length * 7.6 + 26, zeile2.length * 6.7 + 18);
  const schild = svg('g', { transform: `translate(0 ${R0 + 12})` });
  schild.appendChild(svg('rect', { x: (-breite / 2).toFixed(1), y: 0, width: breite.toFixed(1), height: 38, rx: 3 }, 'schild'));
  schild.appendChild(svgText(ort.ort, { y: 16 }, 'schild-text'));
  schild.appendChild(svgText(zeile2, { y: 30 }, 'schild-meta'));
  g.appendChild(schild);
  const waehle = () => waehleAkte(st.liste[0].nr, true);
  g.addEventListener('click', waehle);
  g.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      waehle();
    }
  });
  ebeneOrte.appendChild(g);
  if (st.gesperrt) {
    for (let i = 0; i < 6; i++) {
      const winkel = i * 1.05;
      const r = 34 + (i % 2) * 10;
      ebeneNebel.appendChild(svg('circle', { cx: (ort.x + Math.cos(winkel) * r).toFixed(0), cy: (ort.y + 12 + Math.sin(winkel) * r * 0.7).toFixed(0), r: 32 + (i % 3) * 9 }, 'nebel-wolke'));
    }
  }
}

function zeichnePlan() {
  const s = svg('svg', { viewBox: '0 0 800 500', role: 'group', 'aria-label': 'Stadtplan Weserstedt mit den Orten der Akten' }, 'plan-svg');
  const defs = svg('defs');
  const filter = svg('filter', { id: 'nebel-filter', x: '-30%', y: '-30%', width: '160%', height: '160%' });
  filter.appendChild(svg('feGaussianBlur', { stdDeviation: 9 }));
  defs.appendChild(filter);
  s.appendChild(defs);
  s.appendChild(svg('rect', { width: 800, height: 500 }, 'plan-grund'));
  s.appendChild(svg('path', { d: 'M470 360c40-30 120-40 170-20s60 70 20 100-150 40-190 10-40-60 0-90z' }, 'gruen'));
  s.appendChild(svg('path', { d: 'M20 40c50-20 110-10 120 25s-30 60-80 55-70-60-40-80z' }, 'gruen'));
  s.appendChild(bloecke());
  for (const [d, b] of [
    ['M0 210 C 150 200, 300 160, 470 170 S 700 220, 800 205', 10],
    ['M300 0 C 310 120, 330 260, 360 500', 10],
    ['M600 0 C 590 140, 620 300, 690 500', 10],
    ['M0 330 C 120 300, 200 260, 300 250', 6],
    ['M470 170 C 480 90, 520 40, 540 0', 6]
  ]) s.appendChild(strasse(d, b));
  const fluss = 'M820 95 C 660 130, 580 250, 430 300 S 150 360, -20 470';
  s.appendChild(svg('path', { d: fluss }, 'wasser-rand'));
  s.appendChild(svg('path', { d: fluss }, 'wasser'));
  s.appendChild(strasse('M338 270 L 352 360', 11));
  s.appendChild(strasse('M604 170 L 618 250', 11));
  s.appendChild(svgText('WESER', { transform: 'translate(180 392) rotate(-21)' }, 'flussname'));
  for (const [name, x, y] of VIERTEL) s.appendChild(svgText(name, { x, y }, 'viertel'));
  // roter Faden: Akten mit Punkten, in Aktenreihenfolge
  const spur = akten.filter((a) => a.sichtbar && a.frei && a.punkte > 0).map((a) => ORT_VON.get(a.nr));
  for (let i = 1; i < spur.length; i++) {
    const p = spur[i - 1];
    const q = spur[i];
    if (p === q) continue;
    const mx = (p.x + q.x) / 2 + (q.y - p.y) * 0.15;
    const my = (p.y + q.y) / 2 - (q.x - p.x) * 0.1;
    s.appendChild(svg('path', { d: `M${p.x} ${p.y} Q ${mx.toFixed(0)} ${my.toFixed(0)}, ${q.x} ${q.y}` }, 'faden'));
  }
  const nebel = svg('g', { filter: 'url(#nebel-filter)' });
  const orte = svg('g');
  for (const ort of ORTE) zeichneOrt(ort, orte, nebel);
  s.appendChild(nebel);
  const falter = svg('g', { transform: 'translate(196 74) rotate(-18) scale(1.1)' }, 'falter');
  falter.appendChild(svg('use', { href: '/static/img/icons.svg#i-falter', width: 24, height: 24 }));
  s.appendChild(falter);
  s.appendChild(orte);
  return s;
}

function legende() {
  const l = el('div', 'plan-legende');
  const eintrag = (klasse, text) => h('span', null, el('i', 'lg-punkt ' + klasse), text);
  l.append(eintrag('fertig', 'Akte geschlossen'), eintrag('', 'Ring = erreichte Punkte'), eintrag('nebel', 'Im Nebel (gesperrt)'));
  const faden = h('span', null, el('i', 'lg-faden'), 'Spur des Phantoms');
  l.appendChild(faden);
  return l;
}

/* ---------- Seitenspalte ---------- */

function rangKarte() {
  const r = stand.rang;
  const karte = el('section', 'karte rang-karte');
  karte.setAttribute('aria-labelledby', 'rang-titel');
  const abzeichen = svg('svg', { viewBox: '0 0 56 56', 'aria-hidden': 'true' }, 'rang-abzeichen');
  abzeichen.appendChild(svg('circle', { cx: 28, cy: 28, r: 25 }, 'rang-aussen'));
  abzeichen.appendChild(svg('circle', { cx: 28, cy: 28, r: 19 }, 'rang-innen'));
  abzeichen.appendChild(svg('use', { href: '/static/img/icons.svg#i-stern', x: 16, y: 15, width: 24, height: 24 }, 'rang-stern'));
  const name = h('div', 'rang-name', el('p', 'etikett', 'Dein Rang'), el('p', 'rang-titel', r.name));
  name.lastChild.id = 'rang-titel';
  const punkte = h('div', 'rang-punkte', el('p', 'status-zahl zahlen', A.zahl(stand.punkte.gesamt)), el('p', 'etikett', 'Punkte'));
  punkte.firstChild.id = 'punkte-gesamt';
  karte.appendChild(h('div', 'status-kopf', abzeichen, name, punkte));
  const leiste = el('div', 'leiste');
  leiste.setAttribute('role', 'img');
  leiste.setAttribute('aria-label', `${Math.round(r.anteil * 100)} Prozent der Punkte der freigeschalteten Akten`);
  const fuell = el('i');
  fuell.style.setProperty('--wert', `${(r.anteil * 100).toFixed(1)}%`);
  leiste.appendChild(fuell);
  karte.appendChild(leiste);
  const skala = el('div', 'rang-skala');
  for (const t of ['0', '10 %', '30 %', '55 %', '80 %']) skala.appendChild(el('span', null, t));
  karte.appendChild(skala);
  if (r.naechster && r.maxPunkte > 0) {
    const noetig = Math.max(0, Math.ceil(r.naechster.ab * r.maxPunkte) - r.punkte);
    const p = el('p', 'hinweis-klein');
    p.append('Noch ', el('strong', 'zahlen', A.mehrzahl(noetig, 'Punkt', 'Punkte')), ' bis ', el('strong', null, r.naechster.name), '.');
    karte.appendChild(p);
  } else if (!r.naechster) {
    karte.appendChild(el('p', 'hinweis-klein', 'Höchster Rang erreicht.'));
  }
  const teile = [];
  if (stand.punkte.verhoer) teile.push(`Verhöre ${stand.punkte.verhoer}`);
  if (stand.punkte.training) teile.push(`Training ${stand.punkte.training}`);
  if (teile.length) karte.appendChild(el('p', 'etikett', `Ermittlungen ${stand.punkte.lab} · ${teile.join(' · ')}`));
  return karte;
}

function steckbrief() {
  if (!pinnwandDaten) return null;
  const karte = T.steckbriefKarte(pinnwandDaten.steckbrief, { kompakt: true });
  const link = A.linkKnopf('Zur Pinnwand', '/pinnwand', 'knopf');
  link.id = 'steckbrief-link';
  karte.appendChild(link);
  return karte;
}

function fallenKarte() {
  const karte = el('section', 'karte fallen-karte');
  karte.setAttribute('aria-labelledby', 'fallen-titel');
  const t = el('h2', null, 'Deine Fallen');
  t.id = 'fallen-titel';
  karte.appendChild(t);
  const liste = stand.fallen.filter((f) => f.anzahl > 0).sort((a, b) => b.anzahl - a.anzahl).slice(0, 5);
  if (!liste.length) {
    karte.appendChild(el('p', 'hinweis-klein', 'Noch in keine Falle getappt. Wo du Fehlversuche hast, siehst du hier, welche Fallen dich erwischen.'));
    return karte;
  }
  const ul = el('ul', 'fallen-liste');
  for (const f of liste) ul.appendChild(h('li', null, R.falle(f.nr), el('span', 'falle-titel', f.titel), el('span', 'falle-anzahl zahlen', `${f.anzahl}×`)));
  karte.appendChild(ul);
  return karte;
}

function abzeichenKarte() {
  const karte = el('section', 'karte abzeichen-karte');
  karte.setAttribute('aria-labelledby', 'abzeichen-titel');
  const erhalten = stand.abzeichen.filter((z) => z.erhalten);
  const t = el('h2', null, 'Abzeichen');
  t.id = 'abzeichen-titel';
  karte.appendChild(h('div', 'karte-kopf', t, el('span', 'etikett', `${erhalten.length} von ${stand.abzeichen.length}`)));
  if (!erhalten.length) {
    karte.appendChild(el('p', 'hinweis-klein', 'Dein erstes Abzeichen „Erste Spur“ bekommst du für die erste gelöste Aufgabe.'));
    return karte;
  }
  const ul = el('ul', 'abzeichen-liste');
  for (const z of erhalten) {
    const li = h('li', null, R.icon('i-stern', 'gefuellt'), el('span', null, z.name + (z.akte ? ` · Akte ${z.akte}` : '')));
    li.title = z.beschreibung;
    ul.appendChild(li);
  }
  karte.appendChild(ul);
  return karte;
}

function pinnwand() {
  if (!pinnwandDaten) return null;
  const bs = pinnwandDaten.beweisstuecke;
  const box = el('section', 'pinnwand-bereich');
  box.setAttribute('aria-labelledby', 'pinnwand-titel');
  const t = el('h2', null, 'Pinnwand der Detektei');
  t.id = 'pinnwand-titel';
  const zahl = el('span', 'etikett', `${bs.filter((b) => b.gewonnen).length} von ${bs.length} Beweisstücken`);
  const link = el('a', 'link-ziel', 'Zur Pinnwand');
  link.href = '/pinnwand';
  link.id = 'pinnwand-link';
  box.appendChild(h('div', 'abschnitt-kopf', t, h('span', 'pinnwand-kopf-rechts', zahl, ' · ', link)));
  const wand = el('ul', 'pinnwand');
  for (const b of bs) {
    const li = el('li', 'polaroid' + (b.gewonnen ? '' : ' leer'));
    if (b.gewonnen) {
      li.appendChild(el('span', 'nadel'));
      li.appendChild(h('span', 'polaroid-bild', B.beweisBild(b.bild, b.titel)));
      li.appendChild(el('span', 'polaroid-text', b.titel));
    } else {
      li.appendChild(el('span', 'polaroid-frage', '?'));
      li.appendChild(el('span', 'polaroid-text', b.akte === 7 ? 'Lizenz' : b.verhoer));
    }
    li.setAttribute('aria-label', b.gewonnen ? `Beweisstück ${b.titel} (${b.verhoer} gewonnen)` : `Beweisstück aus ${b.verhoer} noch offen`);
    wand.appendChild(li);
  }
  box.appendChild(wand);
  return box;
}

/* ---------- Akte-Detail ---------- */

function ermittlungsZeile(e) {
  const li = el('li');
  const link = el('a', 'ermittlung-link');
  link.href = `/ermittlung/${e.id}`;
  link.append(el('span', 'nummer', e.nr), el('span', null, e.titel));
  li.appendChild(link);
  if (e.geloest >= e.anzahl && e.anzahl > 0) li.appendChild(R.stempel('Gelöst', 'geloest', { groesse: 'klein' }));
  else if (e.geloest > 0 || e.punkte > 0) li.appendChild(el('span', 'laeuft zahlen', `${e.geloest}/${e.anzahl}`));
  else li.appendChild(el('span', 'leise mono', 'offen'));
  return li;
}

function akteAbschnitt(a) {
  const ort = ORT_VON.get(a.nr);
  const teil = el('div', 'akte-detail-teil');
  const kopf = el('div', 'akte-detail-kopf');
  kopf.appendChild(R.ring(a.frei ? a.anteil : 0, { geschlossen: a.geschlossen, text: a.frei ? null : '–' }));
  kopf.appendChild(h('div', null, el('h2', null, a.titel), el('p', 'etikett', `Akte ${a.nr} · ${ort.ort} · ${ort.stadtteil}`)));
  teil.appendChild(kopf);
  if (!a.frei) {
    teil.appendChild(el('p', 'hinweis-klein', a.nr === 7 ? 'Die Generalprobe findet im Prüfungszimmer im Obergeschoss statt – sie öffnet am Ende der Einheit.' : 'Diese Akte liegt noch im Nebel. Deine Lehrkraft schaltet sie frei, sobald ihr so weit seid.'));
    return teil;
  }
  const erste = a.ermittlungen[0];
  if (erste && erste.briefing) teil.appendChild(h('blockquote', 'briefing', R.md(erste.briefing)));
  const ul = el('ul', 'ermittlungsliste');
  for (const e of a.ermittlungen) ul.appendChild(ermittlungsZeile(e));
  if (a.verhoer) {
    const li = el('li');
    const link = el('a', 'ermittlung-link');
    link.href = `/verhoer/${a.nr}`;
    link.append(el('span', 'nummer', `V${a.nr}`), el('span', null, a.verhoer.titel));
    li.appendChild(link);
    if (a.verhoer.besiegt) li.appendChild(R.stempel('Besiegt', 'geloest', { groesse: 'klein' }));
    else li.appendChild(el('span', 'leise mono', a.verhoer.frei ? 'bereit' : 'ab 60 %'));
    ul.appendChild(li);
  }
  teil.appendChild(ul);
  const reihe = el('div', 'knopf-reihe');
  const naechste = a.ermittlungen.find((e) => e.geloest < e.anzahl);
  if (naechste) reihe.appendChild(A.linkKnopf(`Weiter ermitteln: ${naechste.nr} ${naechste.titel}`, `/ermittlung/${naechste.id}`, 'knopf primaer'));
  reihe.appendChild(A.linkKnopf('Akte öffnen', `/akte/${a.nr}`, 'knopf'));
  teil.appendChild(reihe);
  return teil;
}

function waehleAkte(nr, vonPlan = false) {
  gewaehlt = nr;
  const ort = ORT_VON.get(nr);
  document.querySelectorAll('.plan-svg .ort').forEach((g) => g.classList.toggle('gewaehlt', ORT_VON.get(Number(g.dataset.akte)) === ort));
  const detail = document.getElementById('akte-detail');
  if (!detail) return;
  const liste = ort.akten.map((n) => akten[n - 1]).filter((a) => a && a.sichtbar);
  detail.querySelector('.reiter').textContent = liste.map((a) => `Akte ${a.nr}`).join(' + ');
  const innen = detail.querySelector('.aktendeckel-innen');
  innen.replaceChildren(...liste.map(akteAbschnitt));
  if (vonPlan && window.matchMedia && window.matchMedia('(max-width: 1023px)').matches) detail.scrollIntoView({ block: 'start', behavior: 'smooth' });
}

/* ---------- Kür (Phase 6 Task 7): eigener Abschnitt unter dem Plan, nur eA, ohne Rangwirkung ---------- */

function kuerKarte() {
  const k = stand.akten.find((a) => a.kuer);
  if (!k) return null; // gA-Kurse sehen die Kür nicht (Spec §3.4)
  const box = el('section', 'aktendeckel kuer-karte');
  box.id = 'kuer-karte';
  box.setAttribute('aria-labelledby', 'kuer-titel');
  box.appendChild(el('span', 'reiter', 'Kür K1'));
  const innen = el('div', 'aktendeckel-innen');
  const t = el('h2', null, k.titel);
  t.id = 'kuer-titel';
  innen.appendChild(h('div', 'kuer-kopf', t, R.stempel('KÜR – nicht im Abitur', 'kuer', { groesse: 'klein' })));
  innen.appendChild(el('p', 'hinweis-klein', 'Detektei-Werkstatt: Tabellen selbst anlegen, Datensätze einfügen, Fremdschlüssel erleben – mit eigener Sandbox. Zählt nicht für deinen Rang.'));
  if (k.frei) {
    const e = k.ermittlungen[0];
    if (e) innen.appendChild(el('p', 'etikett zahlen', `${e.geloest} von ${e.anzahl} erledigt · ${k.punkte} Punkte`));
    const reihe = el('div', 'knopf-reihe');
    if (e) reihe.appendChild(A.linkKnopf(e.geloest === 0 ? 'Kür beginnen' : 'Weiter in der Kür', `/ermittlung/${e.id}`, 'knopf'));
    reihe.appendChild(A.linkKnopf('Kür öffnen', `/akte/${k.nr}`, 'knopf'));
    innen.appendChild(reihe);
  } else {
    innen.appendChild(el('p', 'hinweis-klein', 'Deine Lehrkraft schaltet die Kür frei, wenn Zeit dafür ist.'));
  }
  box.appendChild(innen);
  return box;
}

/* ---------- Aktenliste (Handy) ---------- */

function aktenListe() {
  const ol = el('ol', 'akten-liste plan-liste');
  ol.setAttribute('aria-label', 'Akten als Liste');
  for (const a of akten.filter((x) => x.sichtbar)) {
    const ort = ORT_VON.get(a.nr);
    const li = el('li');
    const deckel = el(a.frei ? 'a' : 'div', 'aktendeckel akte-karte' + (a.frei ? '' : ' gesperrt'));
    if (a.frei) deckel.href = `/akte/${a.nr}`;
    deckel.appendChild(el('span', 'reiter', `Akte ${a.nr}`));
    const innen = el('div', 'aktendeckel-innen');
    const kopf = el('div', 'akte-kopf');
    if (a.frei) kopf.appendChild(R.ring(a.anteil, { groesse: 44, geschlossen: a.geschlossen }));
    else kopf.appendChild(h('span', 'teller', R.icon('i-schloss')));
    kopf.appendChild(h('div', null, el('h3', null, a.titel), el('p', 'etikett', `${ort.ort} · ${ort.stadtteil}`)));
    innen.appendChild(kopf);
    innen.appendChild(el('p', 'akte-status', a.frei ? (a.geschlossen ? 'geschlossen' : `${Math.round(a.anteil * 100)} % der Punkte`) : 'liegt noch im Nebel'));
    deckel.appendChild(innen);
    li.appendChild(deckel);
    ol.appendChild(li);
  }
  return ol;
}

/* ---------- Start ---------- */

async function start() {
  const DD = window.DD || {};
  const ich = DD.ich ? await DD.ich : null;
  if (!ich || !bereich || !seite) return; // ohne Sitzung bleibt die öffentliche Startseite (start.js)
  document.getElementById('start-oeffentlich').hidden = true;
  bereich.hidden = false;
  const lehrkraft = ich.rolle === 'lehrkraft' || ich.rolle === 'superadmin';
  document.getElementById('start-lehrkraft').hidden = !lehrkraft;
  const gruss = document.getElementById('begruessung');
  gruss.textContent = '';
  gruss.append(el('strong', null, A.satzEnde(`Willkommen zurück, ${ich.name}`)), ' Jede Akte ist ein Ort in der Stadt. Tippe einen Ort an, um die Akte zu öffnen. Was im Nebel liegt, schaltet deine Lehrkraft später frei.');

  const kontext = await A.kursKontext(seite);
  if (!kontext) return;
  let plan;
  try {
    [stand, plan, pinnwandDaten] = await Promise.all([
      A.holen(A.kursApi(kontext.kurs.id, '/stand')),
      A.holen('/api/akten'),
      A.holen(A.kursApi(kontext.kurs.id, '/pinnwand')).catch(() => null)
    ]);
  } catch (f) {
    seite.replaceChildren(A.fehlerKarte(f, { text: 'Neu laden', href: '/' }));
    return;
  }
  const planVon = new Map((plan.akten || []).map((a) => [a.nr, a]));
  akten = [1, 2, 3, 4, 5, 6, 7].map((nr) => akteDaten(nr, planVon.get(nr)));

  const karte = el('div', 'karte karte-plan');
  const scroll = el('div', 'plan-scroll');
  scroll.tabIndex = 0;
  scroll.setAttribute('role', 'region');
  scroll.setAttribute('aria-label', 'Stadtplan (waagerecht wischbar)');
  scroll.appendChild(zeichnePlan());
  karte.append(scroll, legende());

  const detail = el('section', 'aktendeckel akte-detail');
  detail.id = 'akte-detail';
  detail.setAttribute('aria-live', 'polite');
  detail.append(el('span', 'reiter rot', 'Akte'), el('div', 'aktendeckel-innen'));

  const planSpalte = h('div', 'plan-spalte', ...[karte, aktenListe(), kuerKarte(), pinnwand(), h('div', 'bilanz-raster', fallenKarte(), abzeichenKarte())].filter(Boolean));
  const seitenspalte = h('div', 'seitenspalte', rangKarte(), detail, steckbrief());
  const wechsel = A.kursWechselLink(kontext);
  seite.replaceChildren(...[A.vorschauHinweis(kontext), wechsel, h('div', 'stadtplan-raster', planSpalte, seitenspalte)].filter(Boolean));

  const start = akten.find((a) => a.sichtbar && a.frei && !a.geschlossen) || akten.find((a) => a.sichtbar && a.frei) || akten[0];
  waehleAkte(start.nr);
  // Handy: Plan zur gewählten Akte wischen
  const o = ORT_VON.get(start.nr);
  if (scroll.scrollWidth > scroll.clientWidth) scroll.scrollLeft = Math.max(0, (o.x / 800) * scroll.scrollWidth - scroll.clientWidth / 2);
  document.documentElement.dataset.seite = 'bereit';
}

start();
