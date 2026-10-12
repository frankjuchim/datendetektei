// Verstehenshilfen aus Diagnosen öffnen (Plan Phase 4 Task 5, Spec §7.3): Zu einer Diagnose der Konsole (Regel des
// Parsers im Browser oder Ergebnis-Diagnose des Server-Prüfers) liefert werkzeugLinks() die passenden Werkzeuge –
//   KREUZPRODUKT, KEIN_VERBUND (P2)                 → Spurenbrett (Tabellen aus dem FROM, Bedingung = Vorschlag aus
//                                                     den Fremdschlüsseln) und Zeitlupe
//   WHERE_MIT_AGG, HAVING_OHNE_AGG, ALIAS_IN_HAVING → Zeitlupe
//   GB_REGEL, ANDERE_WERTE (nur mit GROUP BY bzw.
//   Aggregatfunktion)                               → Sortierfächer
// Übergeben wird immer die aktuelle Abfrage der Schülerin bzw. des Schülers (nie eine Musterlösung) über
// sessionStorage (dd_zeitlupe, dd_spurenbrett, dd_sortierfaecher), nie über die URL. Nur für öffentliche Übungs-DBs
// (Ermittlung, Freie Ermittlung) – im Verhör gibt es keine Konsole mit Datenbank und damit keine Links.

const SPURENBRETT = new Set(['KREUZPRODUKT', 'KEIN_VERBUND']);
const ZEITLUPE = new Set(['KREUZPRODUKT', 'KEIN_VERBUND', 'WHERE_MIT_AGG', 'HAVING_OHNE_AGG', 'ALIAS_IN_HAVING']);
const SORTIERFAECHER = new Set(['GB_REGEL', 'ANDERE_WERTE']);
const MAX_SQL = 10000;

export const TEXT_SPURENBRETT = 'Im Spurenbrett ansehen';
export const TEXT_ZEITLUPE = 'In der Zeitlupe ansehen';
export const TEXT_SORTIERFAECHER = 'In den Sortierfächern ansehen';

function schreibe(schluessel, wert) {
  try {
    window.sessionStorage.setItem(schluessel, JSON.stringify(wert));
  } catch {
    /* privater Modus – das Werkzeug startet dann mit seinem Beispiel */
  }
}

/** Besucht alle AST-Knoten (Objekte mit typ). */
function besuche(k, fn) {
  if (Array.isArray(k)) return k.forEach((x) => besuche(x, fn));
  if (!k || typeof k !== 'object') return;
  if (typeof k.typ === 'string') fn(k);
  for (const [s, w] of Object.entries(k)) {
    if (s === 'start' || s === 'ende' || s === 'operatorPos' || s === 'schluesselPos') continue;
    if (w && typeof w === 'object') besuche(w, fn);
  }
}

/** Kurz-Analyse der Abfrage: { tabellen: [Name], gruppiert: bool } oder null (nicht parsbar). */
export function analysiere(sql) {
  const parser = window.DD_SQL_PARSER;
  if (!parser || typeof sql !== 'string' || !sql.trim()) return null;
  try {
    const { ast } = parser.parse(sql);
    if (!ast || ast.typ !== 'select') return null;
    const tabellen = (ast.from || []).filter((t) => t && typeof t.name === 'string').map((t) => t.name);
    let aggregat = false;
    besuche([ast.spalten, ast.having], (k) => {
      if (k.typ === 'aggregat') aggregat = true;
    });
    return { tabellen, gruppiert: (ast.groupBy || []).length > 0 || aggregat };
  } catch {
    return null;
  }
}

/** Tabellen fürs Spurenbrett: verschieden (ohne Groß/Klein), höchstens drei. */
function brettTabellen(namen) {
  const gesehen = new Set();
  const aus = [];
  for (const n of namen) {
    const k = n.toLowerCase();
    if (gesehen.has(k)) continue;
    gesehen.add(k);
    aus.push(n);
  }
  return aus.slice(0, 3);
}

/** Übergabe schreiben und das Werkzeug in diesem Tab öffnen. */
export function oeffneWerkzeug(werkzeug, uebergabe) {
  const db = uebergabe.db;
  if (werkzeug === 'zeitlupe') schreibe('dd_zeitlupe', { db, sql: uebergabe.sql, zurueck: uebergabe.zurueck || null, ...(uebergabe.start ? { start: uebergabe.start } : {}) });
  else if (werkzeug === 'spurenbrett') schreibe('dd_spurenbrett', { db, tabellen: uebergabe.tabellen, bedingung: uebergabe.bedingung || '' });
  else if (werkzeug === 'sortierfaecher') schreibe('dd_sortierfaecher', { db, sql: uebergabe.sql });
  else return;
  window.location.assign(`/werkzeug/${werkzeug}?db=${encodeURIComponent(db)}`);
}

/**
 * Werkzeuge zu einer Diagnose.
 * @param {{ code?: string }} diagnose
 * @param {{ db: string, sql: string, schema?: Array, zurueck?: string, vorher?: Function }} kontext
 *   vorher() läuft vor dem Öffnen (z. B. Entwurf sichern).
 * @returns {Array<{ werkzeug, text, oeffne() }>}
 */
export function werkzeugLinks(diagnose, { db, sql, schema = null, zurueck = null, vorher = null } = {}) {
  const code = diagnose && typeof diagnose.code === 'string' ? diagnose.code : '';
  if (!db || typeof sql !== 'string' || !sql.trim() || sql.length > MAX_SQL) return [];
  if (!SPURENBRETT.has(code) && !ZEITLUPE.has(code) && !SORTIERFAECHER.has(code)) return [];
  const info = analysiere(sql);
  const links = [];
  const mit = (werkzeug, text, uebergabe) =>
    links.push({
      werkzeug,
      text,
      oeffne: () => {
        if (typeof vorher === 'function') vorher();
        oeffneWerkzeug(werkzeug, { db, ...uebergabe });
      }
    });
  if (SPURENBRETT.has(code) && info && info.tabellen.length >= 2) {
    const tabellen = brettTabellen(info.tabellen);
    if (tabellen.length >= 2) {
      const visual = window.DD_SQL_VISUAL;
      let bedingung = '';
      try {
        bedingung = (visual && Array.isArray(schema) && visual.vorschlag(schema, tabellen)) || '';
      } catch {
        bedingung = '';
      }
      mit('spurenbrett', TEXT_SPURENBRETT, { tabellen, bedingung });
    }
  }
  if (ZEITLUPE.has(code)) mit('zeitlupe', TEXT_ZEITLUPE, { sql, zurueck });
  if (SORTIERFAECHER.has(code) && info && info.gruppiert) mit('sortierfaecher', TEXT_SORTIERFAECHER, { sql });
  return links;
}

/** Links als Knopfzeile unter einer Diagnose (Textknoten, Knöpfe ≥ 44 px über .knopf). */
export function linkLeiste(links) {
  if (!links || !links.length) return null;
  const leiste = document.createElement('div');
  leiste.className = 'diagnose-werkzeuge';
  for (const l of links) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'knopf diagnose-werkzeug';
    b.dataset.werkzeug = l.werkzeug;
    b.textContent = l.text;
    b.addEventListener('click', () => l.oeffne());
    leiste.appendChild(b);
  }
  return leiste;
}
