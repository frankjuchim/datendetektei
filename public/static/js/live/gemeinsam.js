// Gemeinsame Bausteine des Live-Modus (Schüler, Steuerung, Beamer): SSE-Verbindung mit Statusanzeige, Countdown nach
// der Serverzeit, Rangliste und Team-Fortschritt. Ausgaben nur als Textknoten.

const V = new URL(import.meta.url).search;
const R = await import('../kern/render.js' + V);
const { el, h } = R;

/** Basis-Pfad der Runden-API. */
export const rundeApi = (id, rest = '') => `/api/live/${encodeURIComponent(id)}${rest}`;

/**
 * SSE-Abo einer Runde. Rückrufe: zustand(z), ende(daten), verbindung(ok:boolean).
 * EventSource verbindet sich nach Abbrüchen selbst neu (retry vom Server); nach „ende“ wird geschlossen.
 * → { schliessen() }
 */
export function verbinde(id, { sicht = null, zustand, ende, verbindung = () => {} }) {
  const url = rundeApi(id, '/ereignisse') + (sicht ? `?sicht=${encodeURIComponent(sicht)}` : '');
  let es = new EventSource(url, { withCredentials: true });
  let zu = false;
  es.addEventListener('zustand', (ev) => {
    verbindung(true);
    try {
      zustand(JSON.parse(ev.data));
    } catch {
      /* unlesbares Ereignis überspringen */
    }
  });
  es.addEventListener('ende', (ev) => {
    zu = true;
    es.close();
    let daten = null;
    try {
      daten = JSON.parse(ev.data);
    } catch {
      daten = null;
    }
    ende(daten);
  });
  es.addEventListener('error', () => {
    if (zu) return;
    // CLOSED: der Server hat abgelehnt (z. B. Runde gelöscht) – nicht endlos neu verbinden
    if (es.readyState === EventSource.CLOSED) {
      zu = true;
      ende(null);
      return;
    }
    verbindung(false);
  });
  return {
    schliessen() {
      zu = true;
      if (es) es.close();
      es = null;
    }
  };
}

/** mm:ss (bzw. h:mm:ss) aus Millisekunden, nie negativ. */
export function zeitText(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h2 = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sek = String(s % 60).padStart(2, '0');
  return h2 ? `${h2}:${String(m).padStart(2, '0')}:${sek}` : `${m}:${sek}`;
}

/**
 * Countdown-Anzeige: mm:ss nach der Serverzeit (rot ab knappMs) (der Client zeigt nur an). Ansage für Screenreader nur bei
 * 5 und 1 Minute. → { el, setze(endeIso, serverZeitIso, startIso?), stopp() }
 */
export function countdown({ etikett = 'Verbleibende Zeit', gross = false, knappMs = 60000 } = {}) {
  const box = el('div', 'live-countdown' + (gross ? ' gross' : ''));
  box.setAttribute('role', 'timer');
  box.setAttribute('aria-label', etikett);
  const zeit = el('span', 'timer-zeit zahlen', '–:––');
  const ansage = el('span', 'nur-sr');
  ansage.setAttribute('aria-live', 'polite');
  box.append(zeit, ansage);
  let uhr = null;
  let ende = null;
  let offset = 0;
  let angesagt = new Set();
  function zeichne() {
    if (ende === null) {
      zeit.textContent = '–:––';
      box.classList.remove('knapp');
      return;
    }
    const rest = ende - (Date.now() + offset);
    zeit.textContent = zeitText(rest);
    box.classList.toggle('knapp', rest <= knappMs);
    for (const grenze of [5, 1]) {
      if (rest <= grenze * 60000 && rest > (grenze * 60000 - 2000) && !angesagt.has(grenze)) {
        angesagt.add(grenze);
        ansage.textContent = grenze === 1 ? 'Noch eine Minute.' : `Noch ${grenze} Minuten.`;
      }
    }
  }
  return {
    el: box,
    setze(endeIso, serverZeitIso) {
      const neu = endeIso ? Date.parse(endeIso) : null;
      if (neu !== ende) angesagt = new Set();
      ende = neu;
      if (serverZeitIso) offset = Date.parse(serverZeitIso) - Date.now();
      zeichne();
      if (!uhr) uhr = setInterval(zeichne, 250);
    },
    stopp() {
      clearInterval(uhr);
      uhr = null;
    }
  };
}

/** Rangliste (Platz · Anzeigename · Punkte); eigene Zeile markiert. */
export function rangliste(liste, { titel = 'Rangliste', leer = 'Noch niemand dabei.' } = {}) {
  const box = el('section', 'live-rang');
  box.setAttribute('aria-label', titel);
  box.appendChild(el('h2', 'etikett', titel));
  if (!Array.isArray(liste) || !liste.length) {
    box.appendChild(el('p', 'hinweis-klein', leer));
    return box;
  }
  const ol = el('ol', 'live-rang-liste');
  for (const x of liste) {
    const li = el('li', 'rang-zeile' + (x.ich ? ' ich' : '') + (x.platz <= 3 ? ' oben' : ''));
    li.append(el('span', 'rang-platz zahlen', String(x.platz)), h('span', 'rang-name', x.name, x.ich ? el('span', 'leise', ' (du)') : null), el('span', 'rang-wert zahlen', String(x.punkte)));
    ol.appendChild(li);
  }
  box.appendChild(ol);
  return box;
}

/** Fortschritt je Team als Schloss-Reihe (●/○), „Tresor offen“ bei fertig. */
export function fortschritt(liste, anzahl, { titel = 'Fortschritt der Teams', mitNamen = false } = {}) {
  const box = el('section', 'live-fortschritt');
  box.setAttribute('aria-label', titel);
  box.appendChild(el('h2', 'etikett', titel));
  if (!Array.isArray(liste) || !liste.length) {
    box.appendChild(el('p', 'hinweis-klein', 'Noch kein Team dabei.'));
    return box;
  }
  const ul = el('ul', 'fortschritt-liste');
  for (const t of liste) {
    const li = el('li', 'fortschritt-zeile' + (t.fertig ? ' fertig' : '') + (t.ich ? ' ich' : ''));
    const nr = t.team;
    const kopf = h('span', 'fortschritt-team', `Team ${nr}`);
    if (t.ich) kopf.appendChild(el('span', 'leise', ' (ihr)'));
    if (mitNamen && Array.isArray(t.mitglieder)) kopf.appendChild(el('span', 'fortschritt-namen', t.mitglieder.join(', ')));
    const schloesser = el('span', 'schloesser');
    schloesser.setAttribute('role', 'img');
    schloesser.setAttribute('aria-label', t.fertig ? 'Tresor offen' : `${t.geloest} von ${anzahl} Schlössern offen`);
    for (let i = 0; i < anzahl; i++) schloesser.appendChild(el('span', 'schloss-punkt' + (i < t.geloest ? ' offen' : '')));
    const status = el('span', 'fortschritt-status zahlen', t.fertig ? 'Tresor offen' : `${t.geloest}/${anzahl}`);
    li.append(kopf, schloesser, status);
    ul.appendChild(li);
  }
  box.appendChild(ul);
  return box;
}

/** Hinweisleiste „Verbindung unterbrochen“ (wird bei Wiederverbindung ausgeblendet). */
export function verbindungsHinweis() {
  const p = el('p', 'banner live-verbindung', 'Verbindung unterbrochen – wird neu aufgebaut …');
  p.hidden = true;
  p.setAttribute('role', 'status');
  return { el: p, setze: (ok) => (p.hidden = ok) };
}
