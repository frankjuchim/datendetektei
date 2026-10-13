// Beamer-Ansicht des Live-Modus (/live/:runde/beamer, DESIGN §5.12: immer dunkel, große Schrift, keine Bedienelemente):
// Duell – aktuelle Aufgabe, Countdown, Zahl der Antworten, Rangliste (Top 10, nur Anzeigenamen); Escape Room –
// Countdown und Fortschritt je Team. Nie Codes oder Lösungen (Sicht „beamer“ des Servers). Zustand per SSE.

const V = new URL(import.meta.url).search;
const [R, G] = await Promise.all([import('../kern/render.js' + V), import('./gemeinsam.js' + V)]);
const { el, h } = R;

const seite = document.getElementById('inhalt');
const rundeId = decodeURIComponent((/^\/live\/([^/]+)\/beamer$/.exec(window.location.pathname) || [])[1] || '');

const kopf = el('header', 'beamer-kopf');
const marke = el('p', 'beamer-marke', 'Datendetektei · Live');
const titel = el('h1', 'beamer-titel', '');
const uhr = G.countdown({ gross: true, knappMs: 10000 });
kopf.append(h('div', null, marke, titel), uhr.el);
const verbindung = G.verbindungsHinweis();
const haupt = el('div', 'beamer-raster');
seite.replaceChildren(kopf, verbindung.el, haupt);
let aufgabeSchluessel = null;
let aufgabeEl = null;

function aufgabeAnsicht(a, f) {
  const box = el('section', 'beamer-aufgabe');
  box.appendChild(el('p', 'etikett', `Aufgabe ${f.nr} von ${f.von} · ${a.zeitSek} s`));
  box.appendChild(el('h2', null, a.titel));
  box.appendChild(R.bloecke(a.inhalt));
  const ia = Array.isArray(a.interaktion) ? a.interaktion[0] : a.interaktion;
  if (ia && ia.kind === 'choice' && Array.isArray(ia.optionen)) {
    const ul = el('ul', 'beamer-optionen');
    for (const o of ia.optionen) ul.appendChild(o.code ? h('li', null, el('code', null, o.code)) : h('li', null, R.md(o.md, null, 'span')));
    box.appendChild(ul);
  } else if (ia && ia.kind === 'sql') {
    box.appendChild(el('p', 'hinweis-klein', 'Schreibt eure Abfrage auf eurem Gerät.'));
  } else if (ia && ia.kind === 'ergebnis') {
    box.appendChild(el('p', 'hinweis-klein', `Ergebnistabelle mit den Spalten ${(ia.kopf || []).join(', ')} auf eurem Gerät ausfüllen.`));
  }
  return box;
}

function zeichne(z) {
  if (z.status === 'beendet') return zeigeEnde(z);
  if (z.modus === 'duell') {
    const d = z.duell;
    const f = d.frage;
    marke.textContent = `Datendetektei · Live-Duell · ${z.kurs.name || ''}`;
    titel.textContent = f ? d.aufgabe.titel : 'Gleich geht’s los';
    uhr.setze(f && f.offen ? f.ende : null, z.serverZeit);
    const schluessel = f ? `${f.nr}` : '-';
    if (schluessel !== aufgabeSchluessel) {
      aufgabeSchluessel = schluessel;
      aufgabeEl = f ? aufgabeAnsicht(d.aufgabe, f) : h('section', 'beamer-aufgabe', el('h2', null, 'Tretet bei: Seite „Live“ öffnen'), el('p', null, `${z.teilnehmerZahl} dabei`));
    }
    const stand = f
      ? el('p', 'beamer-stand zahlen', f.offen ? `${f.antworten} von ${z.teilnehmerZahl} haben geantwortet` : `${f.richtig} von ${f.antworten} richtig`)
      : el('p', 'beamer-stand zahlen', `${z.teilnehmerZahl} dabei`);
    stand.setAttribute('aria-live', 'polite');
    haupt.replaceChildren(h('div', 'beamer-haupt', aufgabeEl, stand), h('aside', 'beamer-spalte', G.rangliste(d.rangliste, { titel: 'Rangliste (Top 10)' })));
  } else {
    const e = z.escape;
    marke.textContent = `Datendetektei · ${e.titel} · ${z.kurs.name || ''}`;
    titel.textContent = z.status === 'wartet' ? 'Gleich geht’s los' : z.status === 'abgelaufen' ? 'Die Zeit ist um' : 'Sechs Schlösser bis zum Tresor';
    uhr.setze(e.ende, z.serverZeit);
    const stationen = el('ol', 'beamer-stationen');
    for (const s of e.stationen) stationen.appendChild(el('li', null, s.titel));
    const liste = e.rangliste.map((x) => ({ team: x.team, geloest: x.geloest, fertig: x.fertig, mitglieder: x.mitglieder }));
    haupt.replaceChildren(
      h('div', 'beamer-haupt', G.fortschritt(liste, e.stationenAnzahl, { titel: 'Fortschritt der Teams', mitNamen: true })),
      h('aside', 'beamer-spalte', h('section', null, el('h2', 'etikett', 'Stationen'), stationen))
    );
  }
}

function zeigeEnde(z) {
  uhr.stopp();
  titel.textContent = 'Endstand';
  const erg = (z && z.ergebnis) || {};
  const teile = [];
  if (Array.isArray(erg.rangliste)) teile.push(G.rangliste(erg.rangliste.slice(0, 15), { titel: 'Endstand' }));
  if (Array.isArray(erg.teams)) teile.push(G.fortschritt(erg.teams, erg.stationenAnzahl || 6, { titel: 'Endstand der Teams', mitNamen: true }));
  if (erg.abschluss) teile.push(h('blockquote', 'briefing', R.md(erg.abschluss)));
  if (!teile.length) teile.push(el('p', null, 'Die Live-Runde ist beendet.'));
  haupt.replaceChildren(h('div', 'beamer-haupt beamer-ende', ...teile));
  haupt.id = 'beamer-ende';
}

if (!rundeId) {
  haupt.replaceChildren(el('p', null, 'Diese Live-Runde gibt es nicht.'));
} else {
  verbinden();
}

function verbinden() {
  G.verbinde(rundeId, {
    sicht: 'beamer',
    zustand: zeichne,
    ende: (d) => (d ? zeigeEnde(d) : nachAbbruch()),
    verbindung: (ok) => verbindung.setze(ok)
  });
}

/**
 * Der Ereignisstrom wurde abgelehnt (z. B. 502 vom Proxy während eines Neustarts): erst nachfragen, ob es die Runde
 * noch gibt – nur bei 404 ist sie wirklich vorbei; sonst den Stand zeigen und neu verbinden.
 */
async function nachAbbruch() {
  verbindung.setze(false);
  let antwort = null;
  try {
    antwort = await fetch(`/api/live/${encodeURIComponent(rundeId)}?sicht=beamer`, { headers: { Accept: 'application/json' }, cache: 'no-store' });
  } catch {
    antwort = null;
  }
  if (antwort && antwort.status === 404) return zeigeEnde(null);
  if (antwort && (antwort.status === 401 || antwort.status === 403)) {
    uhr.stopp();
    haupt.replaceChildren(el('p', null, 'Sie sind nicht mehr angemeldet. Bitte öffnen Sie die Beamer-Ansicht nach der Anmeldung erneut aus der Live-Steuerung.'));
    return;
  }
  if (antwort && antwort.ok) {
    let z = null;
    try {
      z = await antwort.json();
    } catch {
      z = null;
    }
    if (z && z.status === 'beendet') return zeigeEnde(z);
    if (z) zeichne(z);
    setTimeout(verbinden, 2000);
    return;
  }
  setTimeout(nachAbbruch, 5000);
}
