// Lehrkraft-Steuerung des Live-Modus (Spec §7.10, DS_PLANUNG K2) als eigenständiger Baustein:
//   const { zeigeLiveSteuerung } = await import('/static/js/live/steuerung.js?v=…');
//   const s = await zeigeLiveSteuerung(container, { kursId: 'k:17', kursName: 'Inf-LK 12' });  // s.schliessen()
// Die Seite /lehrkraft/live (lehrkraft-seite.js) nutzt ihn; der Reiter „Live“ in /lehrkraft (Plan Phase 6 Task 4)
// kann ihn genauso einbinden. Start (Duell: Aufgabenauswahl, Teams, Zeit; Escape Room: Dauer, Teams, Tipp-Zeit),
// laufende Runde per SSE (Sicht „steuerung“: Teilnehmer, Lösung der Duell-Aufgabe, Codes der Stationen), Link zur
// Beamer-Ansicht, Beenden mit Bestätigung in der Seite. Ausgaben nur als Textknoten.

const V = new URL(import.meta.url).search;
const [A, R, G] = await Promise.all([import('../kern/api.js' + V), import('../kern/render.js' + V), import('./gemeinsam.js' + V)]);
const { el, h, knopf } = R;

const ART = { choice: 'Auswahl', sql: 'SQL', ergebnis: 'Ergebnis' };

function feld(label, eingabe, hinweis) {
  const id = eingabe.id;
  const l = el('label', 'live-feld-label', label);
  l.htmlFor = id;
  return h('div', 'live-feld', l, eingabe, hinweis ? el('span', 'hinweis-klein', hinweis) : null);
}

function zahlFeld(id, wert, min, max) {
  const e = el('input', 'live-zahl zahlen');
  e.id = id;
  e.type = 'number';
  e.min = String(min);
  e.max = String(max);
  e.value = String(wert);
  e.inputMode = 'numeric';
  return e;
}

function auswahlFeld(id, optionen, wert) {
  const s = el('select', 'live-auswahl');
  s.id = id;
  for (const [w, text] of optionen) {
    const o = el('option', null, text);
    o.value = String(w);
    if (String(w) === String(wert)) o.selected = true;
    s.appendChild(o);
  }
  return s;
}

/**
 * Steuerung in container zeigen. → { schliessen() }
 * @param {HTMLElement} container
 * @param {{ kursId: string, kursName?: string }} opt
 */
export async function zeigeLiveSteuerung(container, { kursId, kursName = '' }) {
  let abo = null;
  let uhr = null;
  let endeOffen = false; // Bestätigungsleiste „Beenden“ bleibt bei Aktualisierungen offen

  function aufraeumen() {
    if (abo) abo.schliessen();
    abo = null;
    if (uhr) uhr.stopp();
    uhr = null;
  }

  async function laden() {
    aufraeumen();
    container.replaceChildren(el('p', 'laedt', 'Live-Runde wird geladen …'));
    try {
      const k = await A.holen(A.kursApi(kursId, '/live'));
      if (k.runde) {
        const z = await A.holen(G.rundeApi(k.runde.id));
        zeigeRunde(z);
      } else {
        const inhalte = await A.holen(A.kursApi(kursId, '/live/inhalte'));
        zeigeStart(inhalte, k.statistik || []);
      }
    } catch (e) {
      container.replaceChildren(A.fehlerKarte(e, { text: 'Zum Lehrkraft-Bereich', href: '/lehrkraft' }));
    }
  }

  /* ---------- Start ---------- */

  function zeigeStart(inhalte, statistik) {
    let modus = 'duell';
    const karte = el('section', 'karte abschnitt live-start');
    karte.appendChild(el('h2', null, `Neue Live-Runde${kursName ? ` · ${kursName}` : ''}`));
    const segment = el('div', 'segment');
    segment.setAttribute('role', 'group');
    segment.setAttribute('aria-label', 'Modus');
    const kDuell = knopf('Duell', 'segment-knopf');
    kDuell.id = 'lk-modus-duell';
    const kEscape = knopf('Escape Room', 'segment-knopf');
    kEscape.id = 'lk-modus-escape';
    segment.append(kDuell, kEscape);
    karte.appendChild(segment);

    // Duell
    const duell = el('div', 'live-start-teil');
    duell.appendChild(el('p', 'hinweis-klein', 'Gleiche Aufgabe für alle, Punkte für Richtigkeit und Zeit. Wählen Sie die Aufgaben aus dem Live-Pool (Transferaufgaben je Akte).'));
    const liste = el('div', 'live-aufgaben');
    const nachAkte = new Map();
    for (const a of inhalte.pool) {
      if (!nachAkte.has(a.akte)) nachAkte.set(a.akte, []);
      nachAkte.get(a.akte).push(a);
    }
    for (const [akte, aufgaben] of nachAkte) {
      const gruppe = el('fieldset', 'live-akte');
      gruppe.appendChild(el('legend', 'etikett', `Akte ${akte}`));
      for (const a of aufgaben) {
        const box = el('input');
        box.type = 'checkbox';
        box.value = a.id;
        box.checked = true;
        box.id = `lk-aufgabe-${a.id}`;
        box.className = 'lk-aufgabe';
        const l = el('label', 'live-aufgabe');
        l.htmlFor = box.id;
        l.append(box, el('span', 'mono', a.id), el('span', null, a.titel), el('span', 'leise', `${ART[a.art] || a.art} · ${a.zeitSek} s`));
        gruppe.appendChild(l);
      }
      liste.appendChild(gruppe);
    }
    const alle = knopf('Alle', 'knopf leise');
    alle.id = 'lk-alle';
    const keine = knopf('Keine', 'knopf leise');
    keine.id = 'lk-keine';
    alle.addEventListener('click', () => liste.querySelectorAll('input').forEach((x) => (x.checked = true)));
    keine.addEventListener('click', () => liste.querySelectorAll('input').forEach((x) => (x.checked = false)));
    const dTeams = auswahlFeld('lk-duell-teams', [[0, 'ohne Teams'], ...[2, 3, 4, 5, 6, 8].map((n) => [n, `${n} Teams`])], 0);
    const dZeit = auswahlFeld('lk-duell-zeit', [['', 'wie in der Aufgabe'], [30, '30 s'], [45, '45 s'], [60, '60 s'], [90, '90 s']], '');
    duell.append(h('div', 'knopf-reihe', alle, keine), liste, h('div', 'live-felder', feld('Teams', dTeams), feld('Zeit je Aufgabe', dZeit)));

    // Escape Room
    const escape = el('div', 'live-start-teil');
    const e = inhalte.escape;
    if (!e || !e.startbar) {
      escape.appendChild(el('p', 'meldung fehler', 'Der Escape Room ist gerade nicht verfügbar.'));
    } else {
      escape.appendChild(el('p', 'hinweis-klein', `Teams lösen ${e.stationen.length} Stationen in fester Reihenfolge (Niveau ${inhalte.niveau}); jede richtige Lösung liefert einen Code für das nächste Schloss.`));
      const ol = el('ol', 'live-stationen');
      for (const s of e.stationen) ol.appendChild(el('li', null, `${s.titel}`));
      escape.append(
        ol,
        h(
          'div',
          'live-felder',
          feld('Dauer (Minuten)', zahlFeld('lk-dauer', e.dauerMin, 10, 90)),
          feld('Teams', zahlFeld('lk-teams', 6, 2, 12)),
          feld('Tipp-Umschlag nach (Minuten)', zahlFeld('lk-tipp-nach', e.tippNachMin, 0, 30), `Zeitstrafe ${e.tippStrafeMin} Minuten`)
        )
      );
    }

    const meldung = el('p', 'meldung');
    meldung.setAttribute('role', 'status');
    const start = knopf('Runde starten', 'knopf primaer gross', 'i-vor');
    start.id = 'k-start';
    function setzeModus(m) {
      modus = m;
      kDuell.setAttribute('aria-pressed', String(m === 'duell'));
      kEscape.setAttribute('aria-pressed', String(m === 'escape'));
      duell.hidden = m !== 'duell';
      escape.hidden = m !== 'escape';
      start.disabled = m === 'escape' && !(e && e.startbar);
    }
    kDuell.addEventListener('click', () => setzeModus('duell'));
    kEscape.addEventListener('click', () => setzeModus('escape'));
    setzeModus('duell');

    start.addEventListener('click', async () => {
      meldung.textContent = '';
      let body;
      if (modus === 'duell') {
        const aufgaben = [...liste.querySelectorAll('input:checked')].map((x) => x.value);
        if (!aufgaben.length) {
          meldung.textContent = 'Wählen Sie mindestens eine Aufgabe.';
          return;
        }
        body = { modus, aufgaben, teams: Number(dTeams.value) };
        if (dZeit.value) body.zeitSek = Number(dZeit.value);
      } else {
        const zahl = (id) => Number(container.querySelector('#' + id).value);
        body = { modus, dauerMin: zahl('lk-dauer'), teams: zahl('lk-teams'), tippNachMin: zahl('lk-tipp-nach') };
      }
      start.disabled = true;
      try {
        zeigeRunde(await A.senden(A.kursApi(kursId, '/live'), body));
      } catch (err) {
        meldung.textContent = err.message;
        start.disabled = false;
      }
    });
    karte.append(duell, escape, h('div', 'knopf-reihe', start), meldung);

    const teile = [karte];
    if (statistik.length) {
      const st = el('section', 'karte abschnitt');
      st.appendChild(el('h2', 'etikett', 'Letzte Runden (nur Teilnehmerzahl)'));
      const ul = el('ul', 'live-statistik');
      for (const s of statistik) ul.appendChild(el('li', null, `${s.datum} · ${s.modus === 'escape' ? 'Escape Room' : 'Duell'} · ${A.mehrzahl(s.teilnehmer, 'Person', 'Personen')}`));
      st.appendChild(ul);
      teile.push(st);
    }
    container.replaceChildren(...teile);
  }

  /* ---------- Laufende Runde ---------- */

  function zeigeRunde(z) {
    aufraeumen();
    const kopf = el('header', 'verhoer-band live-band');
    const titel = h('div', null, el('p', 'verhoer-etikett'), el('h2', 'verhoer-titel'));
    uhr = G.countdown({ knappMs: z.modus === 'duell' ? 10000 : 5 * 60000 });
    kopf.append(titel, uhr.el);
    const verbindung = G.verbindungsHinweis();
    const inhalt = el('div', 'live-steuer-inhalt');
    container.replaceChildren(h('section', 'live-karte', kopf, verbindung.el, inhalt));
    const zeichne = (neu) => {
      if (neu.status === 'beendet') return zeigeEnde(neu);
      titel.firstChild.textContent = `${neu.modus === 'escape' ? 'Escape Room' : 'Live-Duell'} · ${neu.kurs.name || ''} · ${STATUS[neu.status] || neu.status}`;
      titel.lastChild.textContent = neu.modus === 'escape' ? neu.titel : neu.duell.frage ? `Aufgabe ${neu.duell.frage.nr} von ${neu.duell.frage.von}` : 'Bereit';
      if (neu.modus === 'duell') uhr.setze(neu.duell.frage && neu.duell.frage.offen ? neu.duell.frage.ende : null, neu.serverZeit);
      else uhr.setze(neu.escape.ende, neu.serverZeit);
      inhalt.replaceChildren(...rundeInhalt(neu));
    };
    abo = G.verbinde(z.id, { zustand: zeichne, ende: (d) => (d ? zeigeEnde(d) : laden()), verbindung: (ok) => verbindung.setze(ok) });
    zeichne(z);
  }

  const STATUS = { wartet: 'wartet auf den Start', laeuft: 'läuft', abgelaufen: 'Zeit abgelaufen', beendet: 'beendet' };

  async function aktion(z, body, meldung) {
    try {
      await A.senden(G.rundeApi(z.id, '/steuerung'), body);
    } catch (err) {
      if (meldung) meldung.textContent = err.message;
    }
  }

  function rundeInhalt(z) {
    const meldung = el('p', 'meldung');
    meldung.setAttribute('role', 'status');
    const links = el('div', 'knopf-reihe');
    const beamer = A.linkKnopf('Beamer-Ansicht öffnen', `/live/${encodeURIComponent(z.id)}/beamer`, 'knopf');
    beamer.id = 'lk-beamer';
    beamer.target = '_blank';
    beamer.rel = 'noopener';
    links.append(beamer, el('span', 'hinweis-klein', 'Schülerinnen und Schüler: Seite „Live“ (/live) öffnen und beitreten.'));

    const teilnehmer = el('section', 'karte abschnitt');
    teilnehmer.appendChild(el('h3', 'etikett', `Dabei: ${A.mehrzahl(z.teilnehmer.length, 'Person', 'Personen')}`));
    const ul = el('ul', 'live-teilnehmer');
    ul.id = 'lk-teilnehmer';
    for (const t of z.teilnehmer) ul.appendChild(el('li', null, t.team ? `${t.name} · Team ${t.team}` : t.name));
    teilnehmer.appendChild(ul);

    const steuer = el('section', 'karte abschnitt live-steuer');
    const reihe = el('div', 'knopf-reihe');
    if (z.modus === 'duell') {
      const d = z.duell;
      const f = d.frage;
      if (f) {
        steuer.appendChild(el('h3', null, `Aufgabe ${f.nr} von ${f.von}: ${d.aufgabe.titel}`));
        steuer.appendChild(el('p', 'zahlen', f.offen ? `${f.antworten} von ${z.teilnehmer.length} haben geantwortet` : `${f.richtig} von ${f.antworten} Antworten richtig`));
        if (d.loesungKurz) steuer.append(el('p', 'etikett', 'Musterlösung (nur für Sie)'), el('pre', 'code-block mono live-loesung', d.loesungKurz));
      } else steuer.appendChild(el('p', null, `${d.anzahl} Aufgaben ausgewählt. Schalten Sie die erste frei, sobald alle beigetreten sind.`));
      if (d.weitere) {
        const k = knopf(f ? 'Nächste Aufgabe' : 'Erste Aufgabe freischalten', 'knopf primaer', 'i-vor');
        k.id = 'k-naechste';
        k.addEventListener('click', () => aktion(z, { aktion: 'naechste' }, meldung));
        reihe.appendChild(k);
      }
      if (f && f.offen) {
        const k = knopf('Aufgabe schließen', 'knopf', 'i-stopp');
        k.id = 'k-schliessen';
        k.addEventListener('click', () => aktion(z, { aktion: 'schliessen' }, meldung));
        reihe.appendChild(k);
      }
    } else {
      const e = z.escape;
      if (z.status === 'wartet') {
        const k = knopf('Los – Countdown starten', 'knopf primaer', 'i-play');
        k.id = 'k-los';
        k.addEventListener('click', () => aktion(z, { aktion: 'los' }, meldung));
        reihe.appendChild(k);
      } else {
        const tipps = knopf(e.tippsFrei ? 'Tipp-Umschläge sperren' : 'Tipp-Umschläge freigeben', 'knopf', 'i-tipp');
        tipps.id = 'k-tipps';
        tipps.setAttribute('aria-pressed', String(e.tippsFrei));
        tipps.addEventListener('click', () => aktion(z, { aktion: 'tippsFrei', an: !e.tippsFrei }, meldung));
        const mehr = knopf('+5 Minuten', 'knopf', 'i-uhr');
        mehr.id = 'k-verlaengern';
        mehr.addEventListener('click', () => aktion(z, { aktion: 'verlaengern', min: 5 }, meldung));
        reihe.append(tipps, mehr);
      }
      const codes = el('table', 'daten live-codes');
      const kopfZeile = el('tr');
      for (const t of ['Station', 'Schloss', 'Code']) kopfZeile.appendChild(el('th', null, t));
      codes.appendChild(h('thead', null, kopfZeile));
      const tb = el('tbody');
      for (const s of e.stationen) tb.appendChild(h('tr', null, el('td', 'zahlen', String(s.nr)), el('td', null, s.titel), el('td', 'mono', s.code)));
      codes.appendChild(tb);
      steuer.append(el('p', 'etikett', 'Codes (nur für Sie – z. B. für Zahlenschlösser an den Umschlägen)'), h('div', 'tabelle-rahmen', codes));
      const teams = el('table', 'daten live-teams');
      const tk = el('tr');
      for (const t of ['Team', 'Mitglieder', 'Station', 'Stand', 'Strafe']) tk.appendChild(el('th', null, t));
      teams.appendChild(h('thead', null, tk));
      const tbt = el('tbody');
      for (const t of e.teams) {
        tbt.appendChild(
          h(
            'tr',
            null,
            el('td', 'zahlen', String(t.nr)),
            el('td', null, t.mitglieder.join(', ') || '–'),
            el('td', 'zahlen', t.fertig ? 'Tresor offen' : String(t.station)),
            el('td', null, t.fertig ? 'fertig' : t.geloest ? 'gelöst, Code noch nicht eingegeben' : 'in Arbeit'),
            el('td', 'zahlen', t.strafeMin ? `${t.strafeMin} min` : '–')
          )
        );
      }
      teams.appendChild(tbt);
      steuer.append(el('p', 'etikett', 'Teams'), h('div', 'tabelle-rahmen', teams));
    }
    // Beenden mit Bestätigung in der Seite
    const ende = knopf('Runde beenden', 'knopf leise', 'i-stopp');
    ende.id = 'k-ende';
    const leiste = el('div', 'bestaetigung');
    leiste.hidden = !endeOffen;
    ende.hidden = endeOffen;
    const ja = knopf('Ja, beenden und alles verwerfen', 'knopf primaer');
    ja.id = 'k-ende-ja';
    const nein = knopf('Abbrechen', 'knopf leise');
    leiste.append(el('p', null, 'Die Runde endet für alle; alle Antworten werden gelöscht.'), ja, nein);
    ende.addEventListener('click', () => {
      endeOffen = true;
      leiste.hidden = false;
      ende.hidden = true;
    });
    nein.addEventListener('click', () => {
      endeOffen = false;
      leiste.hidden = true;
      ende.hidden = false;
    });
    ja.addEventListener('click', () => {
      endeOffen = false;
      aktion(z, { aktion: 'ende' }, meldung);
    });
    reihe.appendChild(ende);
    steuer.prepend(reihe);
    steuer.append(leiste, meldung);

    const rang =
      z.modus === 'duell'
        ? G.rangliste(z.duell.rangliste)
        : G.fortschritt(z.escape.rangliste.map((x) => ({ team: x.team, geloest: x.geloest, fertig: x.fertig, mitglieder: x.mitglieder })), z.escape.stationen.length, { titel: 'Rangliste der Teams', mitNamen: true });
    return [links, h('div', 'live-raster', h('div', 'live-haupt', steuer), h('aside', 'live-seitenspalte', teilnehmer, rang))];
  }

  function zeigeEnde(z) {
    aufraeumen();
    const karte = el('section', 'karte abschnitt live-ende');
    karte.id = 'lk-ende';
    karte.appendChild(el('h2', null, 'Live-Runde beendet'));
    const erg = z.ergebnis || {};
    if (Array.isArray(erg.rangliste)) karte.appendChild(G.rangliste(erg.rangliste, { titel: 'Endstand' }));
    if (Array.isArray(erg.teams)) karte.appendChild(G.fortschritt(erg.teams, erg.stationenAnzahl || 6, { titel: 'Endstand der Teams', mitNamen: true }));
    karte.appendChild(el('p', 'hinweis-klein', 'Alle Antworten wurden verworfen; nur die Teilnehmerzahl bleibt in der Statistik.'));
    const neu = knopf('Neue Runde', 'knopf primaer', 'i-plus');
    neu.id = 'k-neu';
    neu.addEventListener('click', () => laden());
    karte.appendChild(h('div', 'knopf-reihe', neu));
    container.replaceChildren(karte);
  }

  await laden();
  return { schliessen: aufraeumen };
}
