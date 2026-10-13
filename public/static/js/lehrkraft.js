'use strict';
// Lehrkraft-Bereich (Plan Phase 3 Task 6, DESIGN §5.11 – nur die Einstellungen): je Kurs eine Karte mit Niveau eA/gA,
// Akten-Schaltern 1–7 und Verhör-Modus; Speichern per PUT /api/lehrkraft/kurse/:kurs/einstellungen.
// Gesperrter Kurs: nur lesend. Ausgaben nur als Textknoten.
(function () {
  const DD = window.DD;
  if (!DD) return;
  const $ = (id) => document.getElementById(id);

  const VERHOER = [
    { wert: 'auto', text: 'automatisch ab 60 %' },
    { wert: 'offen', text: 'offen' },
    { wert: 'gesperrt', text: 'gesperrt' }
  ];
  const NIVEAUS = [
    { wert: 'eA', text: 'eA' },
    { wert: 'gA', text: 'gA' }
  ];

  DD.ich.then((ich) => {
    if (ich) $('lk-name').textContent = ich.name;
  });

  fetch('/api/lehrkraft/kurse', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Laden fehlgeschlagen'))))
    .then(zeigeKurse)
    .catch(() => {
      $('kurse-laden').hidden = true;
      $('kurse-fehler').hidden = false;
    });

  function zeigeKurse(daten) {
    const kurse = Array.isArray(daten.kurse) ? daten.kurse : [];
    const akten = Array.isArray(daten.akten) ? daten.akten : [];
    const ziel = $('kurs-karten');
    ziel.textContent = '';
    for (const k of kurse) ziel.appendChild(kursKarte(k, akten));
    $('kurse-laden').hidden = true;
    $('kurse-leer').hidden = kurse.length > 0;
    ziel.hidden = kurse.length === 0;
  }

  const prozent = (x) => Math.round((Number(x) || 0) * 100) + ' %';

  /** Segment-Umschalter (aria-pressed); liefert { element, wert(), setze(w), beiAenderung(f) }. */
  function segment(optionen, wert, beschriftung, gesperrt) {
    const gruppe = DD.el('div', 'segment');
    gruppe.setAttribute('role', 'group');
    gruppe.setAttribute('aria-label', beschriftung);
    let aktuell = wert;
    const hoerer = [];
    const knoepfe = optionen.map((o) => {
      const b = DD.el('button', 'segment-knopf', o.text);
      b.type = 'button';
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
    const fs = DD.el('fieldset', 'einstellung');
    fs.appendChild(DD.el('legend', 'einstellung-titel', titel));
    if (hilfe) fs.appendChild(DD.el('p', 'hinweis-klein', hilfe));
    fs.appendChild(inhalt);
    return fs;
  }

  function kursKarte(k, akten) {
    const nurLesen = !!k.nurLesen;
    const e = k.einstellungen || { akten: [], niveau: 'eA', verhoer: 'auto' };
    const karte = DD.el('section', 'aktendeckel kurs-karte');
    const kopfId = 'kurs-' + String(k.id).replace(/[^a-z0-9]/gi, '-');
    karte.setAttribute('aria-labelledby', kopfId);
    karte.appendChild(DD.el('span', 'reiter', 'Kurs'));
    const innen = DD.el('div', 'aktendeckel-innen');
    karte.appendChild(innen);

    const kopf = DD.el('div', 'kurs-kopf');
    const h = DD.el('h3', null, k.name || k.id);
    h.id = kopfId;
    kopf.appendChild(h);
    kopf.appendChild(DD.el('span', 'status ' + (k.aktiv ? 'aktiv' : 'inaktiv'), k.aktiv ? 'aktiv' : 'gesperrt'));
    innen.appendChild(kopf);
    const kz = k.kennzahlen || { schueler: 0, anteil: 0 };
    innen.appendChild(DD.el('p', 'kurs-kennzahlen', kz.schueler + (kz.schueler === 1 ? ' Schüler:in' : ' Schüler:innen') + ' · ' + prozent(kz.anteil) + ' Ø Fortschritt'));

    if (nurLesen) {
      const n = DD.el('div', 'notiz');
      n.appendChild(DD.icon('i-notiz'));
      n.appendChild(DD.el('p', 'notiz-titel', 'Kurs gesperrt – nur lesend'));
      n.appendChild(DD.el('p', null, 'Der Kurs ist im Portal gesperrt. Die Einstellungen lassen sich erst wieder ändern, wenn er dort entsperrt ist.'));
      innen.appendChild(n);
    }

    // Niveau
    const niveau = segment(NIVEAUS, e.niveau, 'Niveau', nurLesen);
    innen.appendChild(feld('Niveau', niveau.element, 'gA blendet alle eA-Inhalte aus, auch Akte 5.'));

    // Akten
    const liste = DD.el('ul', 'akten-schalter');
    const schalter = [];
    for (const a of akten) {
      const nurEa = Array.isArray(a.niveaus) && a.niveaus.indexOf('gA') < 0;
      const li = DD.el('li');
      const label = DD.el('label', 'schalter-zeile');
      const text = DD.el('span', 'schalter-text');
      text.appendChild(DD.el('span', 'schalter-name', a.kuer ? a.titel + ' (nicht im Abitur)' : 'Akte ' + a.nr + ' · ' + a.titel));
      if (nurEa) text.appendChild(DD.el('span', 'niveau ea', 'eA'));
      const hinweis = nurEa ? DD.el('span', 'schalter-hinweis', 'bei gA ausgeblendet') : null;
      if (hinweis) text.appendChild(hinweis);
      label.appendChild(text);
      const cb = DD.el('input', 'schalter');
      cb.type = 'checkbox';
      cb.checked = (e.akten || []).indexOf(a.nr) >= 0;
      label.appendChild(cb);
      li.appendChild(label);
      liste.appendChild(li);
      schalter.push({ nr: a.nr, nurEa, cb, li, hinweis });
    }
    innen.appendChild(feld('Akten freischalten', liste, 'Schülerinnen und Schüler sehen nur freigeschaltete Akten.'));

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

    // Verhöre
    const verhoer = segment(VERHOER, e.verhoer, 'Verhöre', nurLesen);
    innen.appendChild(feld('Verhöre', verhoer.element, 'Automatisch: frei, sobald 60 % der Punkte der Ermittlungen einer Akte erreicht sind.'));

    // Speichern
    const reihe = DD.el('div', 'knopf-reihe');
    const knopf = DD.el('button', 'knopf primaer', 'Einstellungen speichern');
    knopf.type = 'button';
    const rueck = DD.el('p', 'rueckmeldung');
    rueck.setAttribute('aria-live', 'polite');
    reihe.appendChild(knopf);
    reihe.appendChild(rueck);
    if (nurLesen) knopf.hidden = true;
    innen.appendChild(reihe);

    knopf.addEventListener('click', () => {
      const ga = niveau.wert() === 'gA';
      const body = {
        akten: schalter.filter((s) => s.cb.checked && !(ga && s.nurEa)).map((s) => s.nr),
        niveau: niveau.wert(),
        verhoer: verhoer.wert()
      };
      knopf.disabled = true;
      rueck.className = 'rueckmeldung';
      rueck.textContent = 'Wird gespeichert …';
      fetch('/api/lehrkraft/kurse/' + encodeURIComponent(k.id) + '/einstellungen', {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body)
      })
        .then((r) => r.json().then((j) => ({ ok: r.ok, j }), () => ({ ok: false, j: {} })))
        .then(({ ok, j }) => {
          if (!ok) {
            const f = new Error(j && typeof j.error === 'string' ? j.error : 'Speichern fehlgeschlagen.');
            f.eigen = true;
            throw f;
          }
          rueck.className = 'rueckmeldung ok';
          rueck.textContent = 'Gespeichert.';
        })
        .catch((err) => {
          rueck.className = 'rueckmeldung fehler';
          rueck.textContent = err && err.eigen ? err.message : 'Speichern fehlgeschlagen – bitte erneut versuchen.';
        })
        .then(() => {
          knopf.disabled = false;
        });
    });

    if (nurLesen) karte.classList.add('nur-lesen');
    return karte;
  }
})();
