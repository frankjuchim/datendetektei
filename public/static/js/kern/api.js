// Gemeinsame Helfer der Schülerseiten (Plan Phase 3 Task 9): fetch mit JSON und deutschen Fehlertexten, Kurswahl
// (?kurs=, gemerkt im localStorage, Auswahl bei mehreren Kursen), localStorage mit try/catch.
// Ausgaben nur als Textknoten. Die Anmeldung (window.DD.ich) stellt kern/kopfzeile.js bereit.

const TEXTE = {
  0: 'Keine Verbindung zum Server. Prüf dein Netz und versuch es noch einmal.',
  401: 'Du bist nicht mehr angemeldet. Melde dich über das Portal neu an.',
  429: 'Zu viele Anfragen in kurzer Zeit. Warte einen Moment und versuch es dann noch einmal.',
  500: 'Da ist etwas schiefgegangen. Versuch es gleich noch einmal.',
  503: 'Die Prüfung ist gerade nicht verfügbar. Versuch es gleich noch einmal.'
};
// Lehrkraft-Seiten (<html data-anrede="sie">): Lehrkräfte werden gesiezt.
const TEXTE_SIE = {
  0: 'Keine Verbindung zum Server. Bitte prüfen Sie das Netz und versuchen Sie es erneut.',
  401: 'Sie sind nicht mehr angemeldet. Bitte melden Sie sich über das Portal neu an.',
  429: 'Zu viele Anfragen in kurzer Zeit. Bitte warten Sie einen Moment und versuchen Sie es dann erneut.',
  500: 'Da ist etwas schiefgegangen. Bitte versuchen Sie es gleich noch einmal.',
  503: 'Der Dienst ist gerade nicht verfügbar. Bitte versuchen Sie es gleich noch einmal.'
};

/** Standardtext zu einem HTTP-Status (0 = keine Verbindung) in der Anrede der Seite. */
export function standardText(status) {
  const sie = typeof document !== 'undefined' && document.documentElement.dataset.anrede === 'sie';
  const t = sie ? TEXTE_SIE : TEXTE;
  return t[status] || t[500];
}

/** Fehler einer API-Anfrage: status (0 = keine Verbindung), deutscher Text, zusätzliche Daten der Antwort. */
export class ApiFehler extends Error {
  constructor(status, text, daten = {}) {
    super(text);
    this.name = 'ApiFehler';
    this.status = status;
    this.daten = daten;
  }
}

async function anfrage(pfad, optionen) {
  let antwort;
  try {
    antwort = await fetch(pfad, { credentials: 'same-origin', ...optionen });
  } catch {
    throw new ApiFehler(0, standardText(0));
  }
  let daten = null;
  try {
    daten = await antwort.json();
  } catch {
    daten = null;
  }
  if (!antwort.ok) {
    const text = antwort.status === 401 || antwort.status === 429 ? standardText(antwort.status)
      : daten && typeof daten.error === 'string' ? daten.error
        : standardText(antwort.status);
    throw new ApiFehler(antwort.status, text, daten || {});
  }
  return daten;
}

/** GET → JSON. */
export function holen(pfad) {
  return anfrage(pfad, { headers: { Accept: 'application/json' } });
}

/** POST mit JSON-Körper → JSON. */
export function senden(pfad, body = {}) {
  return anfrage(pfad, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body)
  });
}

/** Pfad der Lern-API eines Kurses: /api/kurse/<kurs kodiert><rest>. */
export const kursApi = (kurs, rest = '') => `/api/kurse/${encodeURIComponent(kurs)}${rest}`;

/* ---------- localStorage (privater Modus: still ohne Speicher) ---------- */

export function lies(schluessel) {
  try {
    return window.localStorage.getItem(schluessel);
  } catch {
    return null;
  }
}
export function schreib(schluessel, wert) {
  try {
    if (wert === null || wert === undefined) window.localStorage.removeItem(schluessel);
    else window.localStorage.setItem(schluessel, String(wert));
  } catch {
    /* nicht speicherbar – gilt bis zum Neuladen */
  }
}
export function liesJson(schluessel) {
  const roh = lies(schluessel);
  if (roh === null) return null;
  try {
    return JSON.parse(roh);
  } catch {
    return null;
  }
}
export const schreibJson = (schluessel, wert) => schreib(schluessel, wert === null ? null : JSON.stringify(wert));

/* ---------- Texte ---------- */

/** Satzende ohne doppelten Punkt („Lena K.“ + „.“ → „Lena K.“). */
export const satzEnde = (text) => (/[.!?…]$/.test(String(text).trim()) ? String(text).trim() : String(text).trim() + '.');

export const zahl = (n) => Number(n).toLocaleString('de-DE');
export const mehrzahl = (n, eins, viele) => `${zahl(n)} ${n === 1 ? eins : viele}`;

/* ---------- Kurswahl ---------- */

const KURS_SCHLUESSEL = 'dd-kurs';
const KURS_RE = /^k:\d{1,12}$/;

function el(tag, klasse, text) {
  const e = document.createElement(tag);
  if (klasse) e.className = klasse;
  if (text !== undefined && text !== null) e.textContent = String(text);
  return e;
}

/** Link auf die aktuelle Seite mit gesetztem Kurs (andere Parameter bleiben). */
export function mitKurs(kursId, pfad = window.location.pathname + window.location.search) {
  const url = new URL(pfad, window.location.origin);
  url.searchParams.set('kurs', kursId);
  url.searchParams.delete('kurswahl');
  return url.pathname + url.search;
}

function zeigeKursImKopf(kurs, anzahl) {
  const kopf = document.getElementById('kopf-kurs');
  if (!kopf) return;
  kopf.textContent = 'Kurs ';
  kopf.appendChild(el('strong', null, kurs.name || kurs.id));
  if (anzahl > 1) kopf.appendChild(document.createTextNode(` · ${anzahl} Kurse`));
}

/** Leerzustand-Karte (Aktendeckel mit Notiz). */
export function leerKarte(titel, text, aktionen = []) {
  const karte = el('section', 'aktendeckel leer-karte');
  karte.appendChild(el('span', 'reiter', 'Hinweis'));
  const innen = el('div', 'aktendeckel-innen');
  innen.appendChild(el('h1', null, titel));
  if (text) innen.appendChild(el('p', 'hinweis-klein', text));
  if (aktionen.length) {
    const reihe = el('div', 'knopf-reihe');
    for (const a of aktionen) reihe.appendChild(a);
    innen.appendChild(reihe);
  }
  karte.appendChild(innen);
  return karte;
}

export function linkKnopf(text, href, klasse = 'knopf') {
  const a = el('a', klasse, text);
  a.href = href;
  return a;
}

/**
 * Link-Knopf zu einem Erklärvideo auf YouTube (Spec §13: Link, kein Embed). Nur Links, die der Server geprüft hat
 * (https://www.youtube.com/watch?v=…); öffnet in neuem Tab ohne Referrer und ohne Zugriff auf dieses Fenster.
 */
export function videoKnopf(v, klasse = 'knopf video-knopf') {
  if (!v || typeof v.url !== 'string' || !/^https:\/\/www\.youtube\.com\/watch\?v=[A-Za-z0-9_-]{11}(?:&t=\d+)?$/.test(v.url)) return null;
  const a = el('a', klasse, `Video ${v.nr}: ${v.titel} (YouTube)`);
  a.href = v.url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.setAttribute('aria-label', `Erklärvideo ${v.nr} „${v.titel}“ auf YouTube (neuer Tab)`);
  a.dataset.video = String(v.nr);
  return a;
}

/**
 * Kurs der Seite bestimmen. Reihenfolge: ?kurs= (wenn das Konto im Kurs ist, Superadmin immer), gemerkter Kurs,
 * einziger Kurs. Bei mehreren Kursen ohne Wahl (oder ?kurswahl=1) zeigt container die Auswahl; ohne Kurs einen
 * Leerzustand. → { ich, kurs: { id, name, rolle, aktiv }, kurse, vorschau } oder null (dann ist container gefüllt).
 */
export async function kursKontext(container) {
  const DD = window.DD || {};
  const ich = DD.ich ? await DD.ich : null;
  if (!ich) {
    container.replaceChildren(
      leerKarte('Bitte anmelden', 'Melde dich über das Portal InfoLabs an, um zu ermitteln.', [
        linkKnopf('Anmelden über InfoLabs', '/sso/start?ziel=' + encodeURIComponent(window.location.pathname), 'knopf primaer')
      ])
    );
    return null;
  }
  const kurse = Array.isArray(ich.kurse) ? ich.kurse : [];
  const vorschau = ich.rolle === 'lehrkraft' || ich.rolle === 'superadmin';
  const parameter = new URLSearchParams(window.location.search);
  const gewuenscht = parameter.get('kurs');
  const kurswahl = parameter.get('kurswahl') === '1';
  let kurs = null;
  if (gewuenscht && KURS_RE.test(gewuenscht)) {
    kurs = kurse.find((k) => k.id === gewuenscht) || (ich.rolle === 'superadmin' ? { id: gewuenscht, name: gewuenscht, rolle: 'lehrkraft', aktiv: true } : null);
  }
  if (!kurs && !kurswahl) {
    const gemerkt = lies(KURS_SCHLUESSEL);
    kurs = kurse.find((k) => k.id === gemerkt) || (kurse.length === 1 ? kurse[0] : null);
  }
  if (kurs) {
    schreib(KURS_SCHLUESSEL, kurs.id);
    zeigeKursImKopf(kurs, kurse.length);
    return { ich, kurs, kurse, vorschau };
  }
  if (!kurse.length) {
    const text = vorschau
      ? 'Ihrem Konto ist noch kein Kurs zugeordnet. Legen Sie im Portal einen Kurs an – danach sehen Sie hier die Schüleransicht als Vorschau.'
      : 'Du bist noch in keinem Kurs. Tritt im Portal InfoLabs mit dem Kurscode deiner Lehrkraft einem Kurs bei.';
    const aktionen = [];
    const portal = typeof ich.portalUrl === 'string' && /^https?:\/\//.test(ich.portalUrl) ? ich.portalUrl.replace(/\/+$/, '') + '/' : null;
    if (portal) aktionen.push(linkKnopf('Zum Portal', portal, 'knopf primaer'));
    container.replaceChildren(leerKarte('Noch kein Kurs', text, aktionen));
    return null;
  }
  // Auswahl bei mehreren Kursen
  const liste = el('ul', 'kurs-wahl');
  for (const k of kurse) {
    const li = el('li');
    const a = linkKnopf('', mitKurs(k.id), 'kurs-wahl-knopf');
    a.appendChild(el('span', 'kurs-name', k.name || k.id));
    a.appendChild(el('span', 'etikett', k.rolle === 'lehrkraft' ? 'Lehrkraft' : k.aktiv === false ? 'gesperrt' : 'Kurs'));
    li.appendChild(a);
    liste.appendChild(li);
  }
  const karte = leerKarte('Welcher Kurs?', vorschau ? 'Wählen Sie den Kurs, dessen Schüleransicht Sie sehen möchten.' : 'Du bist in mehreren Kursen. Wähle, in welchem du ermittelst – das Gerät merkt sich deine Wahl.');
  karte.querySelector('.aktendeckel-innen').appendChild(liste);
  container.replaceChildren(karte);
  return null;
}

/** Hinweis „Vorschau als Lehrkraft“ (Lehrkraft/Superadmin auf den Schülerseiten). */
export function vorschauHinweis(kontext) {
  if (!kontext || !kontext.vorschau) return null;
  const box = el('p', 'banner vorschau-banner');
  box.appendChild(document.createTextNode('Vorschau als Lehrkraft – Ihre Antworten zählen nicht in der Kursübersicht.'));
  if (kontext.kurse && kontext.kurse.length > 1) {
    const a = el('a', 'banner-link', 'Kurs wechseln');
    a.href = window.location.pathname + '?kurswahl=1';
    box.appendChild(a);
  }
  return box;
}

/** Link „Kurs wechseln“ für Schüler mit mehreren Kursen (oder null). */
export function kursWechselLink(kontext) {
  if (!kontext || !kontext.kurse || kontext.kurse.length < 2) return null;
  const a = el('a', 'link-ziel kurs-wechsel', 'Kurs wechseln');
  a.href = window.location.pathname + '?kurswahl=1';
  return a;
}

/** Fehlerkarte für eine gescheiterte Anfrage (403 Kurs gesperrt, 404 …). */
export function fehlerKarte(fehler, zurueck = { text: 'Zum Stadtplan', href: '/' }) {
  const text = fehler instanceof ApiFehler ? fehler.message : standardText(500);
  const titel = fehler && fehler.status === 404 ? 'Nicht gefunden' : fehler && fehler.status === 403 ? 'Kein Zugriff' : 'Das hat nicht geklappt';
  return leerKarte(titel, text, [linkKnopf(zurueck.text, zurueck.href, 'knopf')]);
}

/* ---------- Toast (DESIGN §4.15) ---------- */

let toastUhr = null;
export function toast(text) {
  let box = document.getElementById('toast');
  if (!box) {
    box = el('div', 'toast');
    box.id = 'toast';
    box.setAttribute('role', 'status');
    box.setAttribute('aria-live', 'polite');
    document.body.appendChild(box);
  }
  box.textContent = text;
  box.classList.add('sichtbar');
  clearTimeout(toastUhr);
  toastUhr = setTimeout(() => box.classList.remove('sichtbar'), 3200);
}
