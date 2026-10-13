// Reiter „Board“ (Spec §7.12, DESIGN §5.12): Beamer-Board ein-/ausschalten, Link anzeigen, kopieren, öffnen und neu
// erzeugen (mit Bestätigung – der alte Link wird ungültig), dazu eine helle Vorschau dessen, was der Beamer zeigt
// (gleiche Daten wie /api/board/:schluessel). boardLink() nutzt auch der Reiter „Einstellungen“.

const V = new URL(import.meta.url).search;
const G = await import('./gemeinsam.js' + V);
const { A, R } = G;
const { el, h, knopf } = R;

/**
 * Board-Link mit „Kopieren“, „Öffnen“ und „Neu erzeugen“. nachAenderung() wird nach einem neuen Schlüssel aufgerufen
 * (der Kurs in ctx ist dann schon aktualisiert).
 */
export function boardLink(ctx, { nachAenderung = null } = {}) {
  const k = ctx.kurs;
  const box = el('div', 'lk-feld');
  const schluessel = k.board && k.board.schluessel;
  if (!schluessel) {
    box.appendChild(el('p', 'hinweis-klein', 'Noch kein Board-Link: Schalten Sie das Beamer-Board ein und speichern Sie – dann entsteht ein eigener Link für diesen Kurs.'));
    return box;
  }
  const url = G.boardUrl(schluessel);
  const label = el('label', null, 'Board-Link');
  const feld = el('input');
  feld.type = 'text';
  feld.readOnly = true;
  feld.value = url;
  feld.id = 'board-link-' + Math.random().toString(36).slice(2, 8);
  feld.classList.add('board-link-feld');
  label.htmlFor = feld.id;
  feld.addEventListener('focus', () => feld.select());
  const kopieren = knopf('Board-Link kopieren', 'knopf', 'i-liste');
  kopieren.classList.add('board-kopieren');
  const oeffnen = A.linkKnopf('Board öffnen', url, 'knopf board-oeffnen');
  oeffnen.target = '_blank';
  oeffnen.rel = 'noopener noreferrer';
  const neu = knopf('Neuen Link erzeugen', 'knopf leise', 'i-plus');
  neu.classList.add('board-neu');
  neu.disabled = !!k.nurLesen;
  const rueck = G.rueckmeldung();
  const bestaetigung = el('div');
  box.append(label, h('div', 'board-link', feld, kopieren, oeffnen), h('div', 'knopf-reihe', neu), bestaetigung, rueck);
  if (!(k.board && k.board.aktiv)) {
    box.appendChild(el('p', 'hinweis-klein', 'Das Board ist ausgeschaltet – der Link zeigt erst etwas, wenn Sie es einschalten.'));
  }

  kopieren.addEventListener('click', async () => {
    const ok = await G.kopieren(url, feld);
    rueck.className = 'rueckmeldung' + (ok ? ' ok' : '');
    rueck.textContent = ok ? 'Board-Link kopiert.' : 'Kopieren nicht erlaubt – der Link ist markiert, kopieren Sie ihn mit Strg+C.';
    if (ok) A.toast('Board-Link kopiert.');
  });
  neu.addEventListener('click', async () => {
    const ja = await G.bestaetigen(
      bestaetigung,
      'Neuen Board-Link erzeugen? Der bisherige Link funktioniert danach nicht mehr – ein offenes Board am Beamer müssen Sie neu öffnen.',
      'Ja, neuen Link erzeugen',
      { id: 'board-neu-ja' }
    );
    if (!ja) {
      neu.focus();
      return;
    }
    try {
      const r = await A.senden(G.lkApi(k.id, '/board-schluessel'), {});
      ctx.kursAktualisiert(r.kurs);
      A.toast('Neuer Board-Link erzeugt.');
      if (nachAenderung) nachAenderung();
    } catch (f) {
      rueck.className = 'rueckmeldung fehler';
      rueck.textContent = f.message;
    }
  });
  return box;
}

const ART = { geloest: 'Gelöst', verhoer: 'Besiegt', abzeichen: 'Abzeichen' };

function erfolgText(e) {
  if (e.art === 'geloest') return `${e.name} · ${e.titel} (${e.aufgabe})`;
  if (e.art === 'verhoer') return `${e.name} · ${e.titel}`;
  return `${e.name} · ${e.abzeichen}${e.akte ? ` (Akte ${e.akte})` : ''}`;
}

export async function zeige(panel, ctx) {
  const k = ctx.kurs;
  const teile = [];
  const { karte: steuerung } = G.karte('Beamer-Board', 'Rangliste (Top 15), Akten-Fortschritt und letzte Erfolge – immer dunkel, aktualisiert sich alle 20 Sekunden. Nur Anzeigenamen und Punkte.', { id: 'bo-titel' });
  const status = el('p', 'lk-zeile');
  status.appendChild(el('span', 'status ' + (k.board && k.board.aktiv ? 'aktiv' : 'inaktiv'), k.board && k.board.aktiv ? 'eingeschaltet' : 'ausgeschaltet'));
  steuerung.appendChild(status);

  if (!k.nurLesen) {
    const an = !(k.board && k.board.aktiv);
    const umschalten = knopf(an ? 'Beamer-Board einschalten' : 'Beamer-Board ausschalten', an ? 'knopf primaer' : 'knopf', an ? 'i-play' : 'i-stopp');
    umschalten.id = 'bo-umschalten';
    const rueck = G.rueckmeldung();
    umschalten.addEventListener('click', async () => {
      umschalten.disabled = true;
      try {
        const r = await G.ersetzen(G.lkApi(k.id, '/einstellungen'), { beamer: an });
        ctx.kursAktualisiert(r.kurs);
        await zeige(panel, ctx);
        A.toast(an ? 'Beamer-Board eingeschaltet.' : 'Beamer-Board ausgeschaltet.');
      } catch (f) {
        rueck.className = 'rueckmeldung fehler';
        rueck.textContent = f.message;
        umschalten.disabled = false;
      }
    });
    steuerung.appendChild(h('div', 'knopf-reihe', umschalten, rueck));
  }
  const linkPlatz = el('div');
  const zeichneLink = () => {
    linkPlatz.replaceChildren(boardLink(ctx, { nachAenderung: () => zeige(panel, ctx) }));
  };
  zeichneLink();
  steuerung.appendChild(linkPlatz);
  steuerung.appendChild(el('p', 'hinweis-klein', 'Tipp: Öffnen Sie den Link am Beamer-Rechner im Vollbild (F11). Wer den Link kennt, sieht das Board ohne Anmeldung – erzeugen Sie bei Bedarf einen neuen.'));
  teile.push(steuerung);

  // Vorschau der Board-Daten (hell)
  if (k.board && k.board.aktiv && k.board.schluessel) {
    const { karte: vorschau } = G.karte('So sieht das Board gerade aus', null, { id: 'bo-vorschau' });
    try {
      const d = await A.holen('/api/board/' + encodeURIComponent(k.board.schluessel));
      const raster = el('div', 'lk-raster');
      const rangliste = el('ol', 'board-mini');
      rangliste.setAttribute('aria-label', 'Rangliste');
      for (const z of d.rangliste) {
        rangliste.appendChild(
          h('li', null, el('span', 'platz' + (z.platz <= 3 ? ' top' : ''), String(z.platz)), h('span', null, z.name, el('span', 'rang', z.rang)), el('span', 'punkte', G.zahl(z.punkte)))
        );
      }
      if (!d.rangliste.length) rangliste.appendChild(el('li', null, 'Noch keine Punkte im Kurs.'));
      const erfolge = el('ul', 'board-mini erfolge');
      erfolge.setAttribute('aria-label', 'Letzte Erfolge');
      for (const e of d.erfolge) erfolge.appendChild(h('li', null, el('span', 'stempel klein ' + (e.art === 'geloest' ? 'geloest' : 'abi'), ART[e.art] || e.art), el('span', null, erfolgText(e)), el('span')));
      if (!d.erfolge.length) erfolge.appendChild(el('li', null, 'Noch keine Erfolge.'));
      raster.append(h('div', null, el('h3', null, 'Rangliste (Top 15)'), rangliste), h('div', null, el('h3', null, 'Letzte Erfolge'), erfolge));
      vorschau.appendChild(raster);
    } catch (f) {
      vorschau.appendChild(G.fehlerNotiz(f));
    }
    teile.push(vorschau);
  }
  panel.replaceChildren(...teile);
}
