'use strict';
// Startseite ohne Sitzung: Anmelde-Knöpfe und die Aktenliste aus /api/akten („im Nebel“). Mit Sitzung übernimmt
// lernen/stadtplan.js (Stadtplan, Rang, Steckbrief). Ausgaben nur als Textknoten.
(function () {
  const DD = window.DD;
  if (!DD) return;
  const $ = (id) => document.getElementById(id);

  fetch('/api/akten', { headers: { Accept: 'application/json' } })
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null)
    .then((daten) => {
      const liste = $('akten-liste');
      if (!liste || !daten || !Array.isArray(daten.akten)) return;
      liste.textContent = '';
      for (const akte of daten.akten) liste.appendChild(akteKarte(akte));
      liste.hidden = false;
    });

  function akteKarte(akte) {
    const li = DD.el('li');
    const deckel = DD.el('article', 'aktendeckel akte-karte');
    deckel.appendChild(DD.el('span', 'reiter', 'Akte ' + akte.nr));
    const innen = DD.el('div', 'aktendeckel-innen');

    const kopf = DD.el('div', 'akte-kopf');
    const teller = DD.el('span', 'teller');
    teller.appendChild(DD.icon('i-schloss'));
    kopf.appendChild(teller);
    kopf.appendChild(DD.el('h3', null, akte.titel));
    innen.appendChild(kopf);

    const status = DD.el('div', 'akte-status');
    status.appendChild(DD.el('span', null, 'liegt noch im Nebel'));
    const niveaus = DD.el('span', 'niveaus');
    for (const n of akte.niveaus || []) {
      const p = DD.el('span', 'niveau ' + String(n).toLowerCase(), n);
      p.title = n === 'eA' ? 'erhöhtes Anforderungsniveau' : 'grundlegendes Anforderungsniveau';
      niveaus.appendChild(p);
    }
    status.appendChild(niveaus);
    innen.appendChild(status);

    deckel.appendChild(innen);
    li.appendChild(deckel);
    return li;
  }
})();
