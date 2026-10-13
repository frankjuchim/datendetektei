// Gemeinsame Bausteine des Lehrkraft-Bereichs (Plan Phase 6 Task 4): API-Pfade, PUT mit JSON, Zahlen- und
// Prozentformat, Karten, Bestätigungsleiste, Kopieren in die Zwischenablage, Heatmap-Stufen. Nur Textknoten.

const V = new URL(import.meta.url).search;
const [A, R] = await Promise.all([import('../kern/api.js' + V), import('../kern/render.js' + V)]);
const { el, h, knopf } = R;

export { A, R };

/** /api/lehrkraft/kurse/<kurs kodiert><rest> */
export const lkApi = (kurs, rest = '') => `/api/lehrkraft/kurse/${encodeURIComponent(kurs)}${rest}`;

/** PUT mit JSON-Körper → JSON (Fehler als ApiFehler mit deutschem Text). */
export async function ersetzen(pfad, body) {
  let antwort;
  try {
    antwort = await fetch(pfad, {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body)
    });
  } catch {
    throw new A.ApiFehler(0, 'Keine Verbindung zum Server. Bitte prüfen Sie das Netz und versuchen Sie es erneut.');
  }
  let daten = null;
  try {
    daten = await antwort.json();
  } catch {
    daten = null;
  }
  if (!antwort.ok) {
    const text = daten && typeof daten.error === 'string' ? daten.error : 'Speichern fehlgeschlagen – bitte erneut versuchen.';
    throw new A.ApiFehler(antwort.status, text, daten || {});
  }
  return daten;
}

export const prozent = (anteil) => `${Math.round((Number(anteil) || 0) * 100)} %`;
export const zahl = (n) => Number(n || 0).toLocaleString('de-DE');
export const dezimal = (n, stellen = 1) =>
  n === null || n === undefined ? '–' : Number(n).toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: stellen });
export const mehrzahl = (n, eins, viele) => `${zahl(n)} ${n === 1 ? eins : viele}`;

/** Heatmap-Stufe (DESIGN §2.4): 5 Stufen à 20 %; nicht begonnen = gestrichelte leere Zelle. */
export function heatKlasse(prozentWert, begonnen) {
  if (!begonnen) return 'leer';
  return 'h' + Math.min(5, 1 + Math.floor(Math.max(0, prozentWert) / 20.0001));
}

/** Karte mit Überschrift (h2) und optionalem Untertitel. → { karte, kopf } */
export function karte(titel, unter = null, { id = null, klasse = '' } = {}) {
  const k = el('section', 'lk-karte' + (klasse ? ' ' + klasse : ''));
  const kopf = el('div', 'lk-karte-kopf');
  const h2 = el('h2', null, titel);
  if (id) {
    k.id = id;
    h2.id = id + '-titel';
    k.setAttribute('aria-labelledby', h2.id);
  }
  const titelBox = h('div', null, h2, unter ? el('p', null, unter) : null);
  kopf.appendChild(titelBox);
  k.appendChild(kopf);
  return { karte: k, kopf };
}

/** Kennzahl „<strong>14</strong> Schüler:innen“. */
export function kennzahl(wert, text) {
  return h('span', null, el('strong', null, wert), text);
}

/** Notiz-Kasten (DESIGN §4.6). */
export function notiz(titel, text) {
  const n = el('div', 'notiz');
  n.appendChild(R.icon('i-notiz'));
  n.appendChild(el('p', 'notiz-titel', titel));
  n.appendChild(el('p', null, text));
  return n;
}

/** Rückmeldungszeile (aria-live). */
export function rueckmeldung() {
  const p = el('p', 'rueckmeldung');
  p.setAttribute('aria-live', 'polite');
  return p;
}

/**
 * Bestätigungsleiste im Platzhalter ziel: Text + „Ja“/„Abbrechen“. → Promise<boolean>
 * (Kein window.confirm: die Leiste bleibt in der Seite, ist per Tastatur bedienbar und testbar.)
 */
export function bestaetigen(ziel, text, jaText, { id = null } = {}) {
  return new Promise((fertig) => {
    const ja = knopf(jaText, 'knopf primaer');
    if (id) ja.id = id;
    const nein = knopf('Abbrechen', 'knopf');
    const leiste = h('div', 'bestaetigung', el('p', null, text), h('div', 'knopf-reihe', ja, nein));
    leiste.setAttribute('role', 'alertdialog');
    leiste.setAttribute('aria-label', text);
    const ende = (wert) => {
      leiste.remove();
      fertig(wert);
    };
    ja.addEventListener('click', () => ende(true));
    nein.addEventListener('click', () => ende(false));
    leiste.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') ende(false);
    });
    ziel.replaceChildren(leiste);
    ja.focus();
  });
}

/** Text in die Zwischenablage; ohne Clipboard-API wird das Eingabefeld markiert. → Promise<boolean> */
export async function kopieren(text, feld = null) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* nicht erlaubt: unten markieren */
  }
  if (feld) {
    feld.focus();
    feld.select();
  }
  return false;
}

/** Board-Adresse zu einem Schlüssel (absolut, für Beamer und Zwischenablage). */
export const boardUrl = (schluessel) => `${window.location.origin}/board/${encodeURIComponent(schluessel)}`;

/** Fehlertext einer Anfrage als Notiz. */
export function fehlerNotiz(f, titel = 'Das hat nicht geklappt') {
  return notiz(titel, f && f.message ? f.message : 'Bitte laden Sie die Seite neu.');
}

/** Akten-Farbe (Manifest/Seed, #RRGGBB) als CSS-Variable --akte-farbe (CSSOM, CSP-fest). */
export function akteFarbe(e, farbe) {
  if (typeof farbe === 'string' && /^#[0-9a-fA-F]{6}$/.test(farbe)) e.style.setProperty('--akte-farbe', farbe);
  return e;
}

/** Größe einer Datei lesbar (KB/MB). */
export function groesse(bytes) {
  const b = Number(bytes) || 0;
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${dezimal(b / 1024, 0)} KB`;
  return `${dezimal(b / (1024 * 1024), 1)} MB`;
}

/** Kür K1 ist Welt 8 (domain.js KUER, „nicht im Abitur“) – in der Oberfläche „Kür“ statt „Akte 8“. */
export const KUER_NR = 8;
export const akteKurz = (nr) => (Number(nr) === KUER_NR ? 'Kür' : `Akte ${nr}`);
export const akteLang = (nr, titel) => (Number(nr) === KUER_NR ? `${titel || 'Kür'} (nicht im Abitur)` : `Akte ${nr} · ${titel}`);
