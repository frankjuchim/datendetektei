// Druckseite /lehrkraft/urkunden?kurs=…[&ab=<Rang>][&datum=JJJJ-MM-TT] (STORY §10.1 „Detektei-Lizenz“, §10.2 Ränge):
// je Schüler:in eine A4-Seite mit Anzeigename, Rang, Beweisstücken (besiegte Verhöre), Kurs, Datum und Lizenznummer
// (Kursnummer-Jahr-laufende Nummer im Kurs – keine sub, keine Codes). Daten aus der Auswertung-API; Rechte prüft die
// Route (Lehrkraft des Kurses bzw. Superadmin). Druck über @media print (urkunde.css). Ausgaben nur als Textknoten.

const V = new URL(import.meta.url).search;
const [A, R] = await Promise.all([import('../kern/api.js' + V), import('../kern/render.js' + V)]);
const { el, h, svg } = R;

const $ = (id) => document.getElementById(id);
const RAENGE = ['Neuling', 'Spürnase', 'Ermittler:in', 'Kommissar:in', 'Meisterdetektiv:in'];
const RANG_SATZ = {
  Neuling: 'Du hast deinen Ausweis und weißt, wo der Tee steht – die erste Spur wartet.',
  Spürnase: 'Du findest Datensätze, die andere übersehen, und weißt, dass NULL nicht null ist.',
  'Ermittler:in': 'Du verbindest Tabellen, ohne die halbe Stadt zu verdächtigen.',
  'Kommissar:in': 'Du gruppierst, begründest und erkennst eine Anomalie auf den ersten Blick.',
  'Meisterdetektiv:in': 'Edda fragt inzwischen dich, bevor sie eine Abfrage abschickt.'
};

const parameter = new URLSearchParams(window.location.search);
const kursId = parameter.get('kurs');
const status = $('ur-status');

function heute() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function datumText(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return '';
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });
}

function siegel() {
  const s = svg('svg', { viewBox: '0 0 120 120', 'aria-hidden': 'true' }, 'urkunde-siegel');
  s.appendChild(svg('circle', { cx: 60, cy: 60, r: 56 }, 'siegel-aussen'));
  s.appendChild(svg('circle', { cx: 60, cy: 60, r: 46 }, 'siegel-innen'));
  s.appendChild(svg('circle', { cx: 55, cy: 55, r: 17 }, 'siegel-lupe'));
  s.appendChild(svg('path', { d: 'm67.5 67.5 17 17' }, 'siegel-griff'));
  return s;
}

function urkunde(s, { kurs, niveau, datum, lehrkraft, beweisMax, jahr, kursNr }) {
  const beweis = s.beweis;
  const nummer = `${kursNr}-${jahr}-${String(s.nr).padStart(2, '0')}`;
  const seite = el('article', 'urkunde');
  seite.setAttribute('aria-label', `Detektei-Lizenz für ${s.name}`);
  const rahmen = el('div', 'urkunde-rahmen');
  rahmen.append(
    siegel(),
    el('p', 'urkunde-marke', 'Datendetektei Weserstedt'),
    el('h2', 'urkunde-titel', 'Detektei-Lizenz'),
    el('p', 'urkunde-nr', `Nr. ${nummer}`),
    el('p', 'urkunde-text', 'Hiermit wird bestätigt, dass'),
    el('p', 'urkunde-name', s.name),
    h('p', 'urkunde-text', 'im Kurs ', el('strong', null, kurs), ' die Ermittlerprüfung der Datendetektei Weserstedt abgelegt hat.'),
    el(
      'p',
      'urkunde-text urkunde-befaehigung',
      'Die Inhaberin bzw. der Inhaber dieser Lizenz ist befähigt, Datenbestände mit SQL zu befragen, Tabellen über Schlüssel zu ' +
        'verbinden, Anomalien aufzuspüren, Baupläne nach den Regeln der Kunst zu entwerfen' +
        (niveau === 'eA' ? ' und in Datenbanken zu überführen' : '') +
        ' – und dabei die Rechte der Menschen hinter den Daten zu achten.'
    ),
    h(
      'p',
      'urkunde-fakten',
      h('span', null, 'Erreichter Rang: ', el('strong', 'urkunde-rang', s.rang)),
      el('span', null, `Beweisstücke: ${beweis} von ${beweisMax}`),
      el('span', null, `Weserstedt, ${datumText(datum)}`)
    ),
    el('p', 'urkunde-zitat', `„${RANG_SATZ[s.rang] || ''}“`),
    h(
      'div',
      'urkunde-unterschriften',
      h('div', 'unterschrift', el('span', 'linie'), el('span', 'name', 'Edda Lorenz'), el('span', 'rolle', 'Kommissarin a. D., Leiterin der Datendetektei')),
      h('div', 'unterschrift', el('span', 'linie'), el('span', 'name', lehrkraft || ' '), el('span', 'rolle', 'Lehrkraft'))
    ),
    el('span', 'stempel urkunde-stempel', 'Lizenziert'),
    el('p', 'urkunde-fuss', 'Diese Lizenz ist frei erfunden und berechtigt nicht zu Ermittlungen außerhalb des Unterrichts.')
  );
  seite.appendChild(rahmen);
  return seite;
}

async function start() {
  let ich;
  let d;
  let akten;
  try {
    [ich, d, akten] = await Promise.all([
      A.holen('/api/ich').catch(() => null),
      A.holen(`/api/lehrkraft/kurse/${encodeURIComponent(kursId)}/auswertung`),
      A.holen('/api/akten').catch(() => ({ akten: [] }))
    ]);
  } catch (f) {
    status.textContent = f.message;
    return;
  }
  const kopf = $('kopf-kurs');
  kopf.textContent = 'Kurs ';
  kopf.appendChild(el('strong', null, d.kurs.name));

  const auswahl = $('ur-ab');
  const alle = el('option', null, 'alle Schülerinnen und Schüler');
  alle.value = '';
  auswahl.appendChild(alle);
  for (const r of RAENGE.slice(1)) {
    const o = el('option', null, `ab Rang ${r}`);
    o.value = r;
    auswahl.appendChild(o);
  }
  const ab = parameter.get('ab');
  auswahl.value = RAENGE.includes(ab) ? ab : '';
  const datum = $('ur-datum');
  const d0 = parameter.get('datum');
  datum.value = /^\d{4}-\d{2}-\d{2}$/.test(d0 || '') ? d0 : heute();
  const lehrkraft = $('ur-lehrkraft');
  lehrkraft.value = ich && ich.rolle === 'lehrkraft' && ich.name ? ich.name : '';

  // Beweisstücke: besiegte Verhöre; Höchstzahl = Akten des Kurs-Niveaus (eA 7, gA 6)
  const niveau = d.kurs.niveau;
  const beweisMax = (akten.akten || []).filter((a) => Array.isArray(a.niveaus) && a.niveaus.includes(niveau)).length || 7;
  const verhoerSpalten = d.spalten.map((s, i) => (s.typ === 'verhoer' ? i : -1)).filter((i) => i >= 0);
  const schueler = d.schueler.map((s) => ({
    nr: s.nr,
    name: s.name,
    rang: s.rang,
    beweis: verhoerSpalten.filter((i) => s.zellen[i] && s.zellen[i].besiegt).length
  }));
  const kursNr = String(d.kurs.id).replace(/^k:/, '');

  function zeichne() {
    const min = auswahl.value ? RAENGE.indexOf(auswahl.value) : 0;
    const liste = schueler.filter((s) => RAENGE.indexOf(s.rang) >= min);
    const jahr = (datum.value || heute()).slice(0, 4);
    const ziel = $('ur-urkunden');
    ziel.replaceChildren(
      ...liste.map((s) =>
        urkunde(s, { kurs: d.kurs.name, niveau, datum: datum.value || heute(), lehrkraft: lehrkraft.value.trim(), beweisMax, jahr, kursNr })
      )
    );
    status.textContent = liste.length
      ? `${liste.length} ${liste.length === 1 ? 'Urkunde' : 'Urkunden'} bereit.`
      : 'Keine Schülerin und kein Schüler erfüllt diese Auswahl.';
    $('ur-drucken').disabled = !liste.length;
    const url = new URL(window.location.href);
    if (auswahl.value) url.searchParams.set('ab', auswahl.value);
    else url.searchParams.delete('ab');
    if (datum.value) url.searchParams.set('datum', datum.value);
    window.history.replaceState(null, '', url.pathname + url.search);
  }
  auswahl.addEventListener('change', zeichne);
  datum.addEventListener('change', zeichne);
  lehrkraft.addEventListener('input', zeichne);
  $('ur-form').addEventListener('submit', (e) => e.preventDefault());
  $('ur-drucken').addEventListener('click', () => window.print());
  zeichne();
  document.documentElement.dataset.urkunden = 'bereit';
}

start();
