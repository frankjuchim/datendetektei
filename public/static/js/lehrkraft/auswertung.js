// Reiter „Auswertung“ (DESIGN §5.11, Spec §7.11): Matrix Schüler × Ermittlung/Verhör (Heatmap mit Werten, klebender
// Kopf und Namensspalte, Pfeiltasten), Verhör-Ergebnisse, Aufgabenstatistik (sortierbar), Fallen-Profil P1–P10
// (Balken mit Text und Zahl, als Tabelle aufklappbar), häufige Fehlabfragen (anonym, SQL als Textknoten), CSV-Export.

const V = new URL(import.meta.url).search;
const G = await import('./gemeinsam.js' + V);
const { R } = G;
const { el, h, knopf } = R;

const STATUS_TEXT = (z) => (z.erledigt === z.anzahl && z.anzahl ? 'alle gelöst' : `${z.erledigt} von ${z.anzahl} gelöst`);

export async function zeige(panel, ctx, { neu = false } = {}) {
  const d = await ctx.auswertung({ neu });
  const teile = [];

  /* ---------- Kopf: Kennzahlen, CSV, neu laden ---------- */
  const verhoerFrei = d.verhoere.filter((v) => d.akten.some((a) => a.nr === v.akte && a.freigeschaltet));
  const kopf = el('div', 'lk-karte-kopf');
  const kz = el('p', 'lk-kennzahlen');
  for (const v of verhoerFrei.slice(0, 4)) kz.append(G.kennzahl(`${v.besiegt}/${d.anzahlSchueler}`, `Verhör ${v.akte} besiegt`));
  const csv = G.A.linkKnopf('Als CSV herunterladen', G.lkApi(ctx.kurs.id, '/auswertung.csv'), 'knopf');
  csv.id = 'au-csv';
  csv.setAttribute('download', '');
  csv.prepend(R.icon('i-liste'));
  const neuLaden = knopf('Neu laden', 'knopf leise', 'i-uhr');
  neuLaden.id = 'au-neu';
  neuLaden.addEventListener('click', async () => {
    // Fehler (Netz weg, Sitzung abgelaufen) als Notiz über der bisherigen Auswertung, statt still zu scheitern
    neuLaden.disabled = true;
    try {
      await zeige(panel, ctx, { neu: true });
    } catch (f) {
      neuLaden.disabled = false;
      const alt = panel.querySelector(':scope > .notiz.au-fehler');
      if (alt) alt.remove();
      const n = G.fehlerNotiz(f, 'Neu laden hat nicht geklappt');
      n.classList.add('au-fehler');
      n.setAttribute('role', 'alert');
      panel.prepend(n);
    }
  });
  kopf.append(kz, h('div', 'knopf-reihe', neuLaden, csv));
  teile.push(kopf);

  if (!d.anzahlSchueler) {
    teile.push(G.notiz('Noch keine Schülerinnen und Schüler', 'Sobald sich Schülerinnen und Schüler Ihres Kurses über das Portal anmelden, erscheint hier ihr Lernstand.'));
  }
  teile.push(matrix(d, ctx));
  teile.push(fallenProfil(d));
  teile.push(verhoere(d));
  teile.push(aufgabenStatistik(d));
  teile.push(fehlabfragen(d));
  panel.replaceChildren(...teile);
}

/* ================= Matrix ================= */

function matrix(d, ctx) {
  const { karte } = G.karte('Lernstand je Ermittlung', 'Anteil der erreichbaren Punkte. Verhöre in Rot beschriftet, ✓ = besiegt. Zelle antippen oder mit den Pfeiltasten ansteuern: Details darunter.', { id: 'au-matrix' });
  const nurFrei = el('input', 'schalter');
  nurFrei.type = 'checkbox';
  nurFrei.id = 'au-nur-frei';
  nurFrei.checked = true;
  const nurFreiLabel = el('label', 'schalter-zeile');
  nurFreiLabel.htmlFor = 'au-nur-frei';
  nurFreiLabel.append(el('span', 'schalter-name', 'Nur freigeschaltete Akten'), nurFrei);

  const legende = el('div', 'heat-legende');
  legende.setAttribute('aria-label', 'Farbskala');
  const skala = el('span', 'skala');
  skala.setAttribute('aria-hidden', 'true');
  for (let i = 1; i <= 5; i++) skala.appendChild(el('i', 'h' + i));
  const leer = el('span', 'leer-muster');
  leer.setAttribute('aria-hidden', 'true');
  legende.append(leer, document.createTextNode('nicht begonnen'), skala, document.createTextNode('0 → 100 %'));
  karte.appendChild(h('div', 'lk-zeile', legende, nurFreiLabel));

  const huelle = el('div', 'matrix-huelle');
  huelle.tabIndex = -1;
  const detail = el('div', 'matrix-detail');
  detail.id = 'au-detail';
  detail.setAttribute('aria-live', 'polite');
  detail.textContent = 'Wählen Sie eine Zelle, um Punkte, Fehlversuche und Tipps zu sehen.';
  karte.append(huelle, detail);

  function zeichne() {
    const freiAkten = new Set(d.akten.filter((a) => a.freigeschaltet).map((a) => a.nr));
    const spalten = d.spalten.map((s, i) => ({ ...s, i })).filter((s) => !nurFrei.checked || freiAkten.has(s.akte));
    huelle.replaceChildren(tabelle(d, spalten, detail));
  }
  nurFrei.addEventListener('change', zeichne);
  zeichne();
  return karte;
}

function zellText(s, z) {
  if (s.typ === 'verhoer') {
    if (!z || !z.versuche) return { klasse: 'leer', wert: '–', text: 'nicht angetreten' };
    return {
      klasse: G.heatKlasse(z.prozent, true),
      wert: String(z.prozent),
      besiegt: z.besiegt,
      text: `${z.prozent} % (${z.punkte} von ${z.max} Punkten), ${G.mehrzahl(z.versuche, 'Versuch', 'Versuche')}${z.besiegt ? ', besiegt' : ', nicht besiegt'}`
    };
  }
  if (!z) return { klasse: 'aus', wert: '–', text: 'keine Daten' };
  const p = Math.round((z.anteil || 0) * 100);
  return {
    klasse: G.heatKlasse(p, z.begonnen),
    wert: z.begonnen ? String(p) : '–',
    text: z.begonnen
      ? `${p} % (${z.punkte} von ${z.maxPunkte} Punkten), ${STATUS_TEXT(z)}, ${G.mehrzahl(z.fehlversuche, 'Fehlversuch', 'Fehlversuche')}, ${G.mehrzahl(z.tipps, 'Tipp', 'Tipps')}${z.angesehen ? `, ${z.angesehen} Lösung${z.angesehen === 1 ? '' : 'en'} angesehen` : ''}`
      : 'nicht begonnen'
  };
}

function spaltenName(s) {
  return s.typ === 'verhoer' ? `V${s.akte}` : `E ${s.nr}`;
}

function tabelle(d, spalten, detail) {
  const t = el('table', 'matrix');
  t.setAttribute('role', 'grid');
  t.setAttribute('aria-readonly', 'true');
  t.setAttribute('aria-labelledby', 'au-matrix-titel');
  const thead = el('thead');
  const r1 = el('tr');
  const ecke = el('th', 'ecke', 'Schüler:in');
  ecke.rowSpan = 2;
  ecke.scope = 'col';
  r1.appendChild(ecke);
  const gruppen = [];
  for (const s of spalten) {
    const g = gruppen[gruppen.length - 1];
    if (g && g.akte === s.akte) g.n++;
    else gruppen.push({ akte: s.akte, n: 1 });
  }
  for (const g of gruppen) {
    const a = d.akten.find((x) => x.nr === g.akte);
    const th = G.akteFarbe(el('th', 'matrix-akte' + (a && !a.freigeschaltet ? ' gesperrt' : ''), G.akteKurz(g.akte)), a && a.farbe);
    th.colSpan = g.n;
    th.scope = 'colgroup';
    if (a) th.title = a.titel + (a.freigeschaltet ? '' : ' (gesperrt)');
    r1.appendChild(th);
  }
  const r2 = el('tr');
  for (const s of spalten) {
    const th = el('th', (s.typ === 'verhoer' ? 'ist-verhoer' : '') + (s.freigeschaltet ? '' : ' gesperrt'), spaltenName(s));
    th.scope = 'col';
    th.title = s.titel;
    r2.appendChild(th);
  }
  thead.append(r1, r2);
  t.appendChild(thead);
  const tbody = el('tbody');
  const zellen = [];
  d.schueler.forEach((sch, zi) => {
    const tr = el('tr');
    const th = el('th', null, sch.name);
    th.scope = 'row';
    th.appendChild(el('span', 'lk-punkte', `${G.zahl(sch.punkte.gesamt)} P. · ${sch.rang}`));
    tr.appendChild(th);
    const reihe = [];
    spalten.forEach((s, si) => {
      const z = sch.zellen[s.i];
      const info = zellText(s, z);
      const td = el('td', info.klasse, info.wert);
      if (info.besiegt) {
        const b = el('span', 'besiegt', '✓');
        b.setAttribute('aria-hidden', 'true');
        td.appendChild(b);
      }
      const label = `${sch.name}, ${s.typ === 'verhoer' ? s.titel : `Ermittlung ${s.nr} ${s.titel}`}: ${info.text}`;
      td.setAttribute('aria-label', label);
      td.title = label;
      td.tabIndex = zi === 0 && si === 0 ? 0 : -1;
      td.dataset.zeile = String(zi);
      td.dataset.spalte = String(si);
      const waehlen = () => {
        for (const x of tbody.querySelectorAll('td[aria-selected="true"]')) x.removeAttribute('aria-selected');
        td.setAttribute('aria-selected', 'true');
        zeigeDetail(detail, sch, s, z, info);
      };
      td.addEventListener('click', () => {
        fokus(td);
        waehlen();
      });
      td.addEventListener('focus', waehlen);
      reihe.push(td);
      tr.appendChild(td);
    });
    zellen.push(reihe);
    tbody.appendChild(tr);
  });
  function fokus(td) {
    for (const reihe of zellen) for (const x of reihe) x.tabIndex = -1;
    td.tabIndex = 0;
    td.focus();
  }
  tbody.addEventListener('keydown', (e) => {
    const td = e.target.closest('td');
    if (!td) return;
    let zi = Number(td.dataset.zeile);
    let si = Number(td.dataset.spalte);
    if (e.key === 'ArrowRight') si++;
    else if (e.key === 'ArrowLeft') si--;
    else if (e.key === 'ArrowDown') zi++;
    else if (e.key === 'ArrowUp') zi--;
    else if (e.key === 'Home') si = 0;
    else if (e.key === 'End') si = spalten.length - 1;
    else return;
    e.preventDefault();
    zi = Math.max(0, Math.min(zellen.length - 1, zi));
    si = Math.max(0, Math.min(spalten.length - 1, si));
    if (zellen[zi] && zellen[zi][si]) fokus(zellen[zi][si]);
  });
  t.appendChild(tbody);
  if (!d.schueler.length) {
    const tr = el('tr');
    const td = el('td', 'aus', 'Noch keine Schülerinnen und Schüler im Kurs.');
    td.colSpan = spalten.length + 1;
    tr.appendChild(td);
    tbody.appendChild(tr);
  }
  return t;
}

function zeigeDetail(detail, sch, s, z, info) {
  const titel = s.typ === 'verhoer' ? s.titel : `Ermittlung ${s.nr} · ${s.titel}`;
  const teile = [el('strong', null, `${sch.name} · ${titel}`)];
  const ul = el('ul');
  if (s.typ === 'verhoer') {
    if (!z || !z.versuche) ul.appendChild(el('li', null, 'Noch nicht angetreten.'));
    else {
      ul.appendChild(el('li', null, `Bester Versuch: ${z.prozent} % (${z.punkte} von ${z.max} Punkten) – ${z.besiegt ? 'besiegt' : 'nicht besiegt'}`));
      ul.appendChild(el('li', null, G.mehrzahl(z.versuche, 'Versuch', 'Versuche')));
    }
  } else if (!z) ul.appendChild(el('li', null, 'Keine Daten.'));
  else {
    ul.appendChild(el('li', null, `${Math.round((z.anteil || 0) * 100)} % · ${z.punkte} von ${z.maxPunkte} Punkten`));
    ul.appendChild(el('li', null, STATUS_TEXT(z) + (z.begonnen ? '' : ' – noch nicht begonnen')));
    ul.appendChild(el('li', null, `${G.mehrzahl(z.fehlversuche, 'Fehlversuch', 'Fehlversuche')} · ${G.mehrzahl(z.tipps, 'Tipp', 'Tipps')} · ${G.mehrzahl(z.angesehen, 'Lösung', 'Lösungen')} angesehen`));
  }
  teile.push(ul);
  detail.replaceChildren(...teile);
  detail.dataset.text = info.text;
}

/* ================= Fallen-Profil ================= */

function schritte(max) {
  if (max <= 5) return 1;
  const roh = max / 4;
  const p = 10 ** Math.floor(Math.log10(roh));
  for (const f of [1, 2, 5, 10]) if (roh <= f * p) return f * p;
  return 10 * p;
}

function fallenProfil(d) {
  const { karte } = G.karte('Fallen-Profil des Kurses', 'Fehlversuche, denen eine Falle zugeordnet wurde (nur Schülerinnen und Schüler).', { id: 'au-fallen-karte' });
  const max = Math.max(0, ...d.fallen.map((f) => f.anzahl));
  const schritt = schritte(Math.max(max, 1));
  const achsenMax = Math.max(schritt, Math.ceil(Math.max(max, 1) / schritt) * schritt);
  const liste = el('ul', 'fallen-diagramm');
  liste.id = 'au-fallen';
  for (const f of d.fallen) {
    const li = el('li', 'fallen-zeile');
    const text = f.gesperrt && !f.anzahl ? 'Akte gesperrt' : `${G.zahl(f.anzahl)} ${f.anzahl === 1 ? 'Fehlversuch' : 'Fehlversuche'}${f.schueler ? ` · ${G.mehrzahl(f.schueler, 'Schüler:in', 'Schüler:innen')}` : ''}`;
    li.setAttribute('aria-label', `${f.nr} ${f.titel}: ${text}`);
    li.dataset.falle = f.nr;
    const label = h('span', 'fallen-label', el('span', 'nr', f.nr), el('span', 'titel', f.titel));
    label.title = f.titel;
    label.setAttribute('aria-hidden', 'true');
    const spur = el('span', 'fallen-spur');
    spur.setAttribute('aria-hidden', 'true');
    if (f.gesperrt && !f.anzahl) {
      spur.appendChild(el('span', 'fallen-wert gesperrt', 'Akte gesperrt'));
    } else {
      const balken = el('span', 'fallen-balken');
      balken.style.setProperty('--wert', String(achsenMax ? f.anzahl / achsenMax : 0));
      spur.append(balken, el('span', 'fallen-wert', G.zahl(f.anzahl)));
    }
    li.append(label, spur);
    liste.appendChild(li);
  }
  karte.appendChild(liste);
  const achse = el('div', 'fallen-achse');
  achse.setAttribute('aria-hidden', 'true');
  const ticks = el('div', 'ticks');
  for (let w = 0; w <= achsenMax; w += schritt) {
    const s = el('span', null, G.zahl(w));
    s.style.setProperty('--pos', String(w / achsenMax));
    ticks.appendChild(s);
  }
  achse.append(el('span'), ticks);
  karte.appendChild(achse);

  const details = el('details');
  details.appendChild(el('summary', 'link-ziel', 'Als Tabelle anzeigen'));
  details.appendChild(
    tabelleDaten(
      'Fallen-Profil',
      [{ text: 'Falle' }, { text: 'Kurztitel' }, { text: 'Fehlversuche', zahl: true }, { text: 'Schüler:innen', zahl: true }, { text: 'Akten' }],
      d.fallen.map((f) => [f.nr, f.titel, f.gesperrt && !f.anzahl ? 'Akte gesperrt' : f.anzahl, f.schueler, f.akten.length ? f.akten.join(', ') : '–'])
    )
  );
  karte.appendChild(details);
  return karte;
}

/* ================= Tabellen-Helfer ================= */

function tabelleDaten(caption, kopf, zeilen) {
  const rahmen = el('div', 'tabelle-rahmen lk-tabelle');
  const t = el('table', 'daten');
  t.appendChild(el('caption', 'nur-sr', caption));
  const tr = el('tr');
  for (const k of kopf) {
    const th = el('th', k.zahl ? 'zahl' : null, k.text);
    th.scope = 'col';
    tr.appendChild(th);
  }
  t.appendChild(h('thead', null, tr));
  const tbody = el('tbody');
  for (const z of zeilen) {
    const r = el('tr');
    z.forEach((w, i) => {
      const td = el(i === 0 ? 'th' : 'td', kopf[i] && kopf[i].zahl ? 'zahl' : null);
      if (i === 0) td.scope = 'row';
      if (w instanceof Node) td.appendChild(w);
      else td.textContent = w === null || w === undefined ? '–' : typeof w === 'number' ? G.zahl(w) : String(w);
      r.appendChild(td);
    });
    tbody.appendChild(r);
  }
  t.appendChild(tbody);
  rahmen.appendChild(t);
  return rahmen;
}

/* ================= Verhöre ================= */

function verhoere(d) {
  const { karte } = G.karte('Verhör-Ergebnisse', 'Bester Versuch je Schüler:in; besiegt ab 50 %. Darunter: wie oft jede Aufgabe des Pools gezogen und richtig gelöst wurde.', { id: 'au-verhoere' });
  const zeilen = d.verhoere.map((v) => {
    const a = d.akten.find((x) => x.nr === v.akte);
    const name = h('span', null, v.titel, a && !a.freigeschaltet ? el('span', 'klein', 'Akte gesperrt') : null);
    return [name, v.teilnehmer, v.besiegt, v.versuche, v.prozentSchnitt === null ? null : `${v.prozentSchnitt} %`];
  });
  karte.appendChild(
    tabelleDaten('Verhöre', [{ text: 'Verhör' }, { text: 'Teilnehmer', zahl: true }, { text: 'Besiegt', zahl: true }, { text: 'Versuche', zahl: true }, { text: 'Ø bester Versuch', zahl: true }], zeilen)
  );
  for (const v of d.verhoere.filter((x) => x.versuche > 0)) {
    const det = el('details');
    det.appendChild(el('summary', 'link-ziel', `${v.titel}: Aufgaben des Pools`));
    det.appendChild(
      tabelleDaten(
        v.titel,
        [{ text: 'Aufgabe' }, { text: 'Stufe', zahl: true }, { text: 'Gezogen', zahl: true }, { text: 'Richtig', zahl: true }],
        v.aufgaben.map((x) => [`${x.id} ${x.titel}`, x.stufe, x.gezogen, x.richtig])
      )
    );
    karte.appendChild(det);
  }
  return karte;
}

/* ================= Aufgabenstatistik (sortierbar) ================= */

const SPALTEN = [
  { id: 'aufgabe', text: 'Aufgabe', wert: (a) => a.id, sortTyp: 'text' },
  { id: 'stufe', text: 'Stufe', wert: (a) => a.stufe, zahl: true },
  { id: 'begonnen', text: 'Begonnen', wert: (a) => a.begonnen, zahl: true },
  { id: 'geloest', text: 'Gelöst', wert: (a) => a.geloest + a.nachgeloest, zahl: true },
  { id: 'quote', text: 'Lösungsquote', wert: (a) => a.loesungsquote, zahl: true },
  { id: 'fehl', text: 'Ø Fehlversuche', wert: (a) => a.fehlversucheSchnitt, zahl: true },
  { id: 'tipps', text: 'Ø Tipps', wert: (a) => a.tippsSchnitt, zahl: true },
  { id: 'angesehen', text: 'Lösung angesehen', wert: (a) => a.angesehen, zahl: true }
];

function aufgabenStatistik(d) {
  const { karte } = G.karte('Aufgabenstatistik', 'Lösungsquote = gelöst ÷ begonnen. Spaltenköpfe antippen zum Sortieren.', { id: 'au-aufgaben-karte' });
  const auswahl = el('select', 'lk-auswahl');
  auswahl.id = 'au-aufgaben-akte';
  const frei = d.akten.filter((a) => a.freigeschaltet).map((a) => a.nr);
  for (const [w, t] of [['frei', 'freigeschaltete Akten'], ['alle', 'alle Akten'], ...d.akten.map((a) => [String(a.nr), G.akteLang(a.nr, a.titel)])]) {
    const o = el('option', null, t);
    o.value = w;
    auswahl.appendChild(o);
  }
  const label = el('label', null, 'Zeigen: ');
  label.htmlFor = auswahl.id;
  karte.appendChild(h('div', 'lk-feld', label, auswahl));
  const platz = el('div');
  karte.appendChild(platz);
  let sortierung = { spalte: null, ab: false };

  function zeichne() {
    const w = auswahl.value;
    let liste = d.aufgaben.filter((a) => (w === 'alle' ? true : w === 'frei' ? frei.includes(a.akte) : a.akte === Number(w)));
    if (sortierung.spalte) {
      const s = SPALTEN.find((x) => x.id === sortierung.spalte);
      liste = [...liste].sort((x, y) => {
        const a = s.wert(x);
        const b = s.wert(y);
        if (a === null || a === undefined) return 1;
        if (b === null || b === undefined) return -1;
        const c = s.sortTyp === 'text' ? String(a).localeCompare(String(b), 'de', { numeric: true }) : a - b;
        return sortierung.ab ? -c : c;
      });
    }
    const rahmen = el('div', 'tabelle-rahmen lk-tabelle');
    const t = el('table', 'daten');
    t.id = 'au-aufgaben';
    t.appendChild(el('caption', 'nur-sr', 'Aufgabenstatistik'));
    const tr = el('tr');
    for (const s of SPALTEN) {
      const th = el('th', s.zahl ? 'zahl' : null);
      th.scope = 'col';
      th.setAttribute('aria-sort', sortierung.spalte === s.id ? (sortierung.ab ? 'descending' : 'ascending') : 'none');
      const b = el('button', 'sortier-knopf', s.text);
      b.type = 'button';
      b.dataset.spalte = s.id;
      b.addEventListener('click', () => {
        sortierung = sortierung.spalte === s.id ? { spalte: s.id, ab: !sortierung.ab } : { spalte: s.id, ab: s.zahl };
        zeichne();
        const neu = platz.querySelector(`button[data-spalte="${s.id}"]`);
        if (neu) neu.focus();
      });
      th.appendChild(b);
      tr.appendChild(th);
      if (s.id === 'aufgabe') {
        const ort = el('th', null, 'Ort · Fallen');
        ort.scope = 'col';
        tr.appendChild(ort);
      }
    }
    t.appendChild(h('thead', null, tr));
    const tbody = el('tbody');
    for (const a of liste) {
      const r = el('tr');
      const erste = el('th', null);
      erste.scope = 'row';
      erste.append(document.createTextNode(a.titel), el('span', 'klein', a.id + (a.art === 'cc' ? ' · Cold Case' : '')));
      r.appendChild(erste);
      const ort = el('td');
      ort.appendChild(el('span', 'klein', `${G.akteKurz(a.akte)}${a.ermittlung ? ' · ' + a.ermittlung : ''}`));
      const f = el('span');
      for (const nr of a.fallen || []) f.appendChild(R.falle(nr));
      ort.appendChild(f);
      r.appendChild(ort);
      const zelle = (text) => r.appendChild(el('td', 'zahl', text));
      r.appendChild(h('td', 'zahl', R.sterne(a.stufe)));
      zelle(G.zahl(a.begonnen));
      zelle(G.zahl(a.geloest + a.nachgeloest));
      const q = el('td', 'zahl');
      if (a.begonnen) {
        const m = el('meter');
        m.min = 0;
        m.max = 1;
        m.value = a.loesungsquote || 0;
        m.setAttribute('aria-hidden', 'true');
        q.appendChild(h('span', 'quote', m, G.prozent(a.loesungsquote)));
      } else q.textContent = '–';
      r.appendChild(q);
      zelle(G.dezimal(a.fehlversucheSchnitt));
      zelle(G.dezimal(a.tippsSchnitt));
      zelle(G.zahl(a.angesehen));
      tbody.appendChild(r);
    }
    if (!liste.length) {
      const r = el('tr');
      const td = el('td', null, 'Keine Aufgaben in dieser Auswahl.');
      td.colSpan = SPALTEN.length + 1;
      r.appendChild(td);
      tbody.appendChild(r);
    }
    t.appendChild(tbody);
    rahmen.appendChild(t);
    platz.replaceChildren(rahmen);
  }
  auswahl.addEventListener('change', zeichne);
  zeichne();
  return karte;
}

/* ================= Häufige Fehlabfragen ================= */

function fehlabfragen(d) {
  const { karte } = G.karte('Häufige Fehlabfragen', 'Anonym gespeichert (ohne Namen), je Aufgabe nach Häufigkeit. Gut für die Besprechung im Plenum.', { id: 'au-fehl' });
  const box = el('div', 'fehlabfragen');
  box.id = 'au-fehlabfragen';
  for (const f of d.fehlabfragen) {
    const det = el('details');
    const sum = el('summary');
    sum.append(document.createTextNode(`${f.aufgabe} · ${f.titel}`), el('span', 'leise', `${G.mehrzahl(f.gesamt, 'Fehlabfrage', 'Fehlabfragen')} · ${G.akteKurz(f.akte)}${f.ermittlung ? ' · ' + f.ermittlung : ''}`));
    det.appendChild(sum);
    const ol = el('ol');
    for (const q of f.abfragen) {
      const pre = el('pre');
      pre.appendChild(el('code', null, q.sql));
      ol.appendChild(h('li', null, pre, el('span', 'anzahl', `× ${G.zahl(q.anzahl)}`)));
    }
    det.appendChild(ol);
    box.appendChild(det);
  }
  if (!d.fehlabfragen.length) box.appendChild(el('p', 'hinweis-klein', 'Noch keine Fehlabfragen gespeichert.'));
  karte.appendChild(box);
  return karte;
}
