// Seite „Materialien“ des Lehrkraft-Bereichs (#/materialien, wie Algo Quest; Spec §7.11, §12.4, E13): Downloads je Akte
// aus den Whitelists (GET /api/material, kursunabhängig – alle Niveaus, eA/gA-Material markiert): Schülerfassungen,
// Lehrkraft-Material (Lösungen, Hinweise, Prüfungen) und – nur Superadmin – Originale (docx/pptx) samt ZIP je Akte.

const V = new URL(import.meta.url).search;
const G = await import('./gemeinsam.js' + V);
const { A, R } = G;
const { el, h } = R;

const STUFEN = [
  ['schueler', 'Schülerfassungen'],
  ['lehrkraft', 'Lehrkraft (Lösungen, Hinweise, Prüfungen)'],
  ['original', 'Originale (docx/pptx, nur Admin)']
];
const NIVEAU = { eA: 'nur eA', gA: 'nur gA', beide: null };

function akteName(akte, akten) {
  if (akte === null || akte === undefined || akte === 0) return 'Gesamt';
  if (akte === 'kuer') return 'Kür';
  const a = akten.find((x) => x.nr === akte);
  return a ? G.akteLang(akte, a.titel) : G.akteKurz(akte);
}

export async function zeige(panel, ctx) {
  const d = await A.holen('/api/material');
  const stufen = d.stufen || {};
  const gruppen = new Map();
  for (const [stufe] of STUFEN) {
    for (const e of stufen[stufe] || []) {
      const schluessel = e.akte === null || e.akte === undefined ? 0 : e.akte;
      if (!gruppen.has(schluessel)) gruppen.set(schluessel, []);
      gruppen.get(schluessel).push({ ...e, stufe });
    }
  }
  const reihenfolge = [...gruppen.keys()].sort((a, b) => (a === 'kuer' ? 99 : a) - (b === 'kuer' ? 99 : b));
  const kopf = h(
    'div',
    'seiten-kopf',
    el('span', 'etikett', 'Lehrkraft-Bereich'),
    el('h1', null, 'Materialien'),
    el('p', null, 'Arbeitsblätter, Lösungen, Präsentationen, Lehrerhinweise und Prüfungen als PDF – sortiert nach Akten. Material nur für ein Niveau ist mit „nur eA“ bzw. „nur gA“ markiert. Die Schülerfassungen finden angemeldete Schülerinnen und Schüler zusätzlich auf der Seite „Themen“.')
  );
  const warnung = el('p', 'banner');
  warnung.append(el('strong', null, 'Bitte nicht an Schülerinnen und Schüler weitergeben: '), document.createTextNode('Das Lehrkraft-Material enthält Lösungen bzw. Prüfungen.'));
  const { karte } = G.karte('Downloads nach Akten', 'PDFs öffnen sich im Browser.', { id: 'ma-titel' });
  if (!reihenfolge.length) {
    karte.appendChild(G.notiz('Noch keine Materialien', 'Auf diesem Server sind noch keine Downloads hinterlegt.'));
  }
  // Erklärvideos (YouTube, Spec §13): nur Link-Knöpfe, nur Videos mit eingetragenem Link.
  const videos = (Array.isArray(d.videos) ? d.videos : []).map((v) => {
    const a = A.videoKnopf(v);
    if (a) a.prepend(R.icon('i-play'));
    return a;
  }).filter(Boolean);
  if (videos.length) {
    const sektion = el('section', 'material-gruppe');
    sektion.id = 'ma-videos';
    sektion.appendChild(el('h3', null, 'Erklärvideos (YouTube)'));
    sektion.appendChild(el('p', 'material-stufe', 'Öffnen sich in einem neuen Tab auf YouTube. Die Folien zu den Videos stehen bei „Gesamt“ unter Lehrkraft.'));
    sektion.appendChild(h('div', 'knopf-reihe video-reihe', ...videos));
    karte.appendChild(sektion);
  }
  const zips = new Map((d.zips || []).map((z) => [z.akte, z]));
  for (const akte of reihenfolge) {
    const sektion = el('section', 'material-gruppe');
    const titel = el('h3', null, akteName(akte, ctx.akten));
    sektion.appendChild(titel);
    for (const [stufe, stufenText] of STUFEN) {
      const eintraege = gruppen.get(akte).filter((e) => e.stufe === stufe);
      if (!eintraege.length) continue;
      sektion.appendChild(el('p', 'material-stufe', stufenText));
      const ul = el('ul', 'material-liste');
      ul.dataset.stufe = stufe;
      for (const e of eintraege) {
        const a = el('a', null, e.titel);
        a.href = e.url;
        if (stufe === 'original') a.setAttribute('download', '');
        else {
          a.target = '_blank';
          a.rel = 'noopener';
        }
        const info = el('span', 'material-info');
        const n = NIVEAU[e.niveau];
        if (n) info.appendChild(el('span', 'niveau ' + (e.niveau === 'eA' ? 'ea' : 'ga'), n));
        info.appendChild(el('span', null, G.groesse(e.groesse)));
        ul.appendChild(h('li', null, a, info));
      }
      sektion.appendChild(ul);
    }
    const zip = zips.get(akte);
    if (zip) {
      const z = A.linkKnopf(`Alle Originale als ZIP (${G.mehrzahl(zip.anzahl, 'Datei', 'Dateien')}, ${G.groesse(zip.groesse)})`, zip.url, 'knopf leise');
      z.setAttribute('download', '');
      sektion.appendChild(h('div', 'knopf-reihe', z));
    }
    karte.appendChild(sektion);
  }
  panel.replaceChildren(kopf, warnung, karte);
}
