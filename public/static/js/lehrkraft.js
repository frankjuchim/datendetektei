'use strict';
// Lehrkraft-Bereich (Phase 1): Begrüßung und Kursliste aus /api/ich. Ausgaben nur als Textknoten.
(function () {
  const DD = window.DD;
  if (!DD) return;
  const $ = (id) => document.getElementById(id);

  DD.ich.then((ich) => {
    if (!ich) return;
    $('lk-name').textContent = ich.name;
    const kurse = Array.isArray(ich.kurse) ? ich.kurse : [];
    const liste = $('kurs-liste');
    liste.textContent = '';
    for (const k of kurse) {
      const li = DD.el('li');
      li.appendChild(DD.el('span', 'kurs-name', k.name));
      li.appendChild(DD.el('span', 'status ' + (k.aktiv ? 'aktiv' : 'inaktiv'), k.aktiv ? 'aktiv' : 'nicht aktiv'));
      liste.appendChild(li);
    }
    $('kurse-leer').hidden = kurse.length > 0;
    liste.hidden = kurse.length === 0;
    $('kurse-laden').hidden = true;
  });
})();
