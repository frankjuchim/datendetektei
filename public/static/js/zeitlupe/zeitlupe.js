// Zeitlupe (/werkzeug/zeitlupe, Plan Phase 4 Task 2; DESIGN.md §5.4, §2.4, §6, §7, §9): spielt eine Abfrage in der
// logischen Auswertungsreihenfolge ab – FROM, WHERE, GROUP BY, HAVING, SELECT, ORDER BY, LIMIT. Links die Abfrage in
// Schreibreihenfolge mit Auswertungsnummer am Rand, rechts Zähler, Erklärung und Zwischentabelle (verworfene Zeilen
// grau und durchgestrichen, Gruppen mit Farbe + Name + Legende).
//
// Die Rechenschicht ist src/sql/visual.js (self.DD_SQL_VISUAL): Sie stellt interne Teilabfragen an den sql.js-Worker
// der Konsole (öffentliche Übungs-DB, nie Varianten, nie Verhör-DBs). Die Abfrage kommt nie über die URL, sondern aus
// sessionStorage 'dd_zeitlupe' = { db, sql, zurueck? } (gesetzt von der Konsole bzw. Ermittlung); ohne Übergabe steht
// eine eigene, neutrale Beispielabfrage der gewählten DB im Editor (keine Aufgabenlösung).
// Bedienung: Reiter, Zurück/Weiter, Pfeiltasten ← →, Abspielen (1,8 s je Schritt; prefers-reduced-motion: 2,6 s,
// ohne Übergänge). Ausgaben nur als Textknoten.

const V = new URL(import.meta.url).search;
const [R, { erzeugeEditor }, { erzeugeAusfuehrer, werkzeugBereit }] = await Promise.all([
  import('../kern/render.js' + V),
  import('../konsole/editor.js' + V),
  import('../konsole/ausfuehren.js' + V)
]);
const { el, h } = R;

const SCHLUESSEL = 'dd_zeitlupe';
const MAX_SQL = 10000;
const TAKT_MS = 1800;
const TAKT_REDUZIERT_MS = 2600;
const MAX_SPALTEN_KOMPAKT = 5;
const OHNE_ANMELDUNG = 'eisdiele';
const STANDARD_DB = 'stadtfest';

/** Klauseln der Reiter in Auswertungsreihenfolge (DESIGN §5.4). */
const KLAUSELN = ['FROM', 'WHERE', 'GROUP BY', 'HAVING', 'SELECT', 'ORDER BY', 'LIMIT'];

/**
 * Eigene Beispielabfragen je Übungs-DB – neutral, keine Lab-, Verhör- oder Gastaufgabe. Jede zeigt WHERE vor und
 * HAVING nach dem Gruppieren (höchstens drei Gruppen, eine fällt durch HAVING weg).
 */
const BEISPIELE = Object.freeze({
  fundbuero:
    "SELECT Kategorie, COUNT(*) AS Funde\nFROM Fundsache\nWHERE Kategorie = 'Schlüssel' OR Kategorie = 'Taschen' OR Kategorie = 'Schmuck'\nGROUP BY Kategorie\nHAVING COUNT(*) >= 8\nORDER BY Funde DESC",
  stadtrad: 'SELECT Typ, COUNT(*) AS Raeder\nFROM Rad\nWHERE Baujahr >= 2020\nGROUP BY Typ\nHAVING COUNT(*) >= 10\nORDER BY Raeder DESC',
  stadtfest:
    "SELECT Stand.Platz, COUNT(*) AS Bons\nFROM Stand, Bon\nWHERE Stand.StandNr = Bon.StandNr\n  AND Bon.Zahlart = 'bar'\nGROUP BY Stand.Platz\nHAVING COUNT(*) >= 100\nORDER BY Bons DESC\nLIMIT 1",
  tus: 'SELECT Beitragsgruppe, COUNT(*) AS Mitglieder\nFROM Mitglied\nWHERE Geburtsjahr >= 2000\nGROUP BY Beitragsgruppe\nHAVING COUNT(*) >= 5\nORDER BY Mitglieder DESC',
  detektei: 'SELECT Status, COUNT(*) AS Faelle\nFROM Fall\nGROUP BY Status\nHAVING COUNT(*) >= 3\nORDER BY Faelle DESC',
  datenspuren: 'SELECT Tarif, COUNT(*) AS Fahrten\nFROM RadExport\nWHERE Jahrgang >= 1990\nGROUP BY Tarif\nHAVING COUNT(*) >= 100\nORDER BY Fahrten DESC',
  eisdiele: 'SELECT Vegan, COUNT(*) AS Sorten, MAX(Preis) AS Hoechstpreis\nFROM Sorte\nWHERE Preis >= 1.5\nGROUP BY Vegan\nHAVING COUNT(*) >= 3\nORDER BY Sorten DESC'
});

const TEXT_LAEUFT = 'Die Zeitlupe wird vorbereitet …';
const TEXT_LEER = 'Schreib zuerst eine Abfrage.';
const TEXT_LADEFEHLER = 'Die Datenbank konnte nicht geladen werden. Lade die Seite neu.';
const TEXT_ANMELDEN = 'Für diese Datenbank musst du angemeldet sein. Melde dich über das Portal an.';
const TEXT_FEHLT = 'Die Zeitlupe konnte nicht geladen werden. Lade die Seite neu.';
const WORKER_TEXTE = { 'Bitte nur eine Abfrage auf einmal.': 'MEHRERE_ANWEISUNGEN', 'Keine Abfrage gefunden.': 'LEER' };

const $ = (id) => document.getElementById(id);
const zahl = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const wort = (n, eins, viele) => (n === 1 ? eins : viele);

/* ---------- Übergabe (sessionStorage) und Rücksprung ---------- */

function leseUebergabe() {
  try {
    const roh = window.sessionStorage.getItem(SCHLUESSEL);
    if (!roh) return null;
    const o = JSON.parse(roh);
    if (!o || typeof o !== 'object' || typeof o.db !== 'string' || typeof o.sql !== 'string' || o.sql.length > MAX_SQL) return null;
    return {
      db: o.db,
      sql: o.sql,
      zurueck: typeof o.zurueck === 'string' ? o.zurueck : null,
      eingabe: o.eingabe === true,
      start: KLAUSELN.includes(o.start) ? o.start : null
    };
  } catch {
    return null;
  }
}

function schreibeUebergabe(o) {
  try {
    window.sessionStorage.setItem(SCHLUESSEL, JSON.stringify(o));
  } catch {
    /* privater Modus – gilt bis zum Neuladen */
  }
}

/** Rücksprung nur auf eigene Seiten mit bekanntem Muster (kein offener Redirect). → { href, text } | null */
function sichererRuecksprung(pfad) {
  if (typeof pfad !== 'string' || pfad.length > 200) return null;
  if (/^\/konsole\/[a-z]+$/.test(pfad)) return { href: pfad, text: 'Zurück zur Konsole' };
  // Ermittlung, optional mit der bearbeiteten Aufgabe (?aufgabe=A3-E1-03 bzw. …-CC)
  if (/^\/ermittlung\/(A[1-9]\d?-E[1-9]\d?)(?:\?aufgabe=\1-(?:\d{2}|CC))?$/.test(pfad)) return { href: pfad, text: 'Zurück zur Ermittlung' };
  return null;
}

/* ---------- Hilfen ---------- */

function deutsch(fehler) {
  const f = window.DD_SQL_FEHLERTEXTE;
  const text = String(fehler || '');
  if (WORKER_TEXTE[text]) return f ? f.uebersetze(WORKER_TEXTE[text]) : text;
  if (!f) return text;
  const { code, text: uebersetzt } = f.ordneZu(text);
  if (code === 'ALLGEMEIN' && /[äöüß]|Datenbank|Abfrage/.test(text)) return text;
  return uebersetzt;
}

/** Parser- und Regel-Hinweise (Abimodus „hinweis“) für die Randmarken im Editor. */
function pruefe(sql) {
  const parser = window.DD_SQL_PARSER;
  const regeln = window.DD_SQL_REGELN;
  if (!parser || !regeln || !sql.trim()) return [];
  try {
    const { ast, fehler } = parser.parse(sql);
    if (fehler && fehler.length) return fehler.map((f) => ({ code: f.code, falle: null, art: 'fehler', text: f.text, zeile: f.zeile, spalte: f.spalte }));
    return regeln.pruefeRegeln(ast, { abimodus: 'hinweis' });
  } catch {
    return [];
  }
}

function reduziert() {
  return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}

function zelle(wert) {
  const td = el('td');
  if (wert === null || wert === undefined) {
    td.appendChild(el('span', 'null', 'NULL'));
  } else if (typeof wert === 'number') {
    td.className = 'zahl';
    td.textContent = String(wert).replace('.', ',');
  } else if (typeof wert === 'object') {
    td.appendChild(el('span', 'null', 'BLOB'));
  } else {
    td.textContent = String(wert);
  }
  return td;
}

function gruppenKlasse(g) {
  return g && g.farbe ? ' g' + g.farbe : ' g-ohne';
}

/* ---------- Seite ---------- */

async function start() {
  const visual = window.DD_SQL_VISUAL;
  const meldungEl = $('zl-meldung');
  function meldung(text, art = 'hinweis') {
    meldungEl.replaceChildren();
    meldungEl.className = 'zl-meldung' + (text ? ' ' + art : '');
    if (text) meldungEl.appendChild(R.mitCode(text));
  }
  if (!visual) {
    meldung(TEXT_FEHLT, 'fehler');
    return;
  }

  const titel = R.DATENBANK_TITEL;
  const parameter = new URLSearchParams(window.location.search);
  const urlDb = parameter.get('db');
  const uebergabe = leseUebergabe();
  const gueltig = (n) => typeof n === 'string' && Object.prototype.hasOwnProperty.call(BEISPIELE, n);
  const db = gueltig(urlDb) ? urlDb : uebergabe && gueltig(uebergabe.db) ? uebergabe.db : STANDARD_DB;
  const passend = uebergabe && uebergabe.db === db;
  const zurueckRoh = passend ? uebergabe.zurueck : null;
  const rueck = sichererRuecksprung(zurueckRoh);
  if (!urlDb) window.history.replaceState(null, '', `/werkzeug/zeitlupe?db=${encodeURIComponent(db)}`);

  document.title = `Zeitlupe: ${titel[db]} – Datendetektei`;
  $('zl-eingabe-db').textContent = `DB: ${titel[db]} · Übungs-DB`;
  if (rueck) {
    const a = $('zl-rueck');
    a.href = rueck.href;
    $('zl-rueck-text').textContent = rueck.text;
    a.hidden = false;
  }

  // Datenbank-Auswahl: ohne Anmeldung nur die Eisdiele
  const auswahl = $('zl-db');
  const ich = window.DD && window.DD.ich ? await window.DD.ich : null;
  for (const name of Object.keys(BEISPIELE)) {
    if (!ich && name !== OHNE_ANMELDUNG) continue;
    const o = el('option', null, titel[name]);
    o.value = name;
    if (name === db) o.selected = true;
    auswahl.appendChild(o);
  }
  auswahl.addEventListener('change', () => {
    const neu = auswahl.value;
    if (!gueltig(neu) || neu === db) return;
    schreibeUebergabe({ db: neu, sql: BEISPIELE[neu], zurueck: null, eingabe: true });
    window.location.assign(`/werkzeug/zeitlupe?db=${encodeURIComponent(neu)}`);
  });

  const editor = erzeugeEditor({
    textarea: $('sql-eingabe'),
    overlay: $('editor-hl'),
    zeilen: $('editor-zeilen'),
    hinweisListe: $('editor-hinweise'),
    beiAusfuehren: () => starte(),
    beiAenderung: () => editor.setzeMarken(pruefe(editor.wert()))
  });
  editor.setzeWert(passend ? uebergabe.sql : BEISPIELE[db]);
  editor.setzeMarken(pruefe(editor.wert()));
  // Ohne Übergabe (oder nach DB-Wechsel) ist der Editor offen, mit Übergabe zugeklappt – die Abfrage steht links.
  $('zl-eingabe').open = !passend || uebergabe.eingabe;

  $('zl-beispiel').addEventListener('click', () => {
    editor.setzeWert(BEISPIELE[db]);
    editor.setzeMarken(pruefe(editor.wert()));
    editor.fokus();
  });

  const ausfuehrer = erzeugeAusfuehrer({ dbUrl: `/db/${encodeURIComponent(db)}.sqlite`, ohneWasm: parameter.get('ohneWasm') === '1' });
  const modus = $('zl-modus');
  modus.textContent = 'Datenbank wird geladen …';
  // null = bereit, sonst { art: 'laden' | 'wasm', text } (einheitlicher WebAssembly-Hinweis, kein Server-Rückfall)
  const startFehler = werkzeugBereit(ausfuehrer).then((f) => {
    modus.textContent = f ? '' : 'rechnet im Browser';
    return f;
  });

  /* ---------- Zustand und Darstellung ---------- */

  const ansicht = $('zl-ansicht');
  const knopfStarten = $('zl-starten');
  const knopfZurueck = $('zl-zurueck');
  const knopfVor = $('zl-vor');
  const knopfAbspielen = $('zl-abspielen');
  let schritte = [];
  let sqlText = '';
  let index = 0;
  let timer = null;
  let laeuft = false;
  let alleSpalten = false;
  let vorher = null; // { klausel, weg: Set(id) } des zuletzt gezeigten Schritts

  async function starte() {
    if (laeuft) return;
    stoppe();
    const sql = editor.wert();
    editor.setzeMarken(pruefe(sql));
    if (!sql.trim()) {
      meldung(TEXT_LEER, 'fehler');
      return;
    }
    schreibeUebergabe({ db, sql, zurueck: zurueckRoh });
    laeuft = true;
    knopfStarten.disabled = true;
    meldung(TEXT_LAEUFT, 'laeuft');
    let ergebnis;
    try {
      const f = await startFehler;
      if (f && f.art === 'wasm') {
        ergebnis = { fehler: f.text };
      } else if (f) {
        ergebnis = { fehler: ich || db === OHNE_ANMELDUNG ? TEXT_LADEFEHLER : TEXT_ANMELDEN };
      } else {
        ergebnis = await visual.zeitlupe(sql, ausfuehrer.fuehreAus, { uebersetze: deutsch });
      }
    } catch {
      ergebnis = { fehler: 'Diese Abfrage kann hier nicht Schritt für Schritt gezeigt werden.' };
    } finally {
      laeuft = false;
      knopfStarten.disabled = false;
    }
    if (ergebnis.fehler) {
      meldung(ergebnis.fehler, 'fehler');
      ansicht.hidden = true;
      return;
    }
    if (!ergebnis.schritte || !ergebnis.schritte.length) {
      meldung(ergebnis.hinweis || 'Diese Abfrage kann hier nicht Schritt für Schritt gezeigt werden.', 'hinweis');
      ansicht.hidden = true;
      return;
    }
    meldung('');
    schritte = ergebnis.schritte;
    sqlText = sql;
    vorher = null;
    baueReiter();
    baueSql();
    ansicht.hidden = false;
    zeige(0, false);
    document.documentElement.dataset.zeitlupe = 'bereit';
  }

  function baueReiter() {
    const liste = $('zl-schritte');
    liste.replaceChildren();
    for (const klausel of KLAUSELN) {
      const i = schritte.findIndex((s) => s.klausel === klausel);
      const b = el('button', 'zl-reiter');
      b.type = 'button';
      b.appendChild(document.createTextNode(klausel));
      if (i < 0) {
        b.disabled = true;
        b.appendChild(el('small', null, 'entfällt'));
        b.setAttribute('aria-label', `${klausel}: kommt in dieser Abfrage nicht vor`);
      } else {
        b.dataset.schritt = String(i);
        b.appendChild(el('small', null, `Schritt ${schritte[i].nummer}`));
        b.addEventListener('click', () => {
          stoppe();
          zeige(i, i > index);
        });
      }
      liste.appendChild(h('li', null, b));
    }
  }

  function baueSql() {
    const box = $('zl-sql');
    box.replaceChildren();
    const zeilen = schritte
      .map((s, i) => ({ s, i }))
      .filter((x) => x.s.bereich)
      .sort((a, b) => a.s.bereich.start - b.s.bereich.start);
    for (const { s, i } of zeilen) {
      const text = sqlText.slice(s.bereich.start, s.bereich.ende).replace(/[ \t]+$/gm, '');
      const zeile = el('div', 'zl-zeile');
      zeile.dataset.schritt = String(i);
      const lauf = el('span', 'lauf', s.nummer);
      lauf.title = `Auswertungsschritt ${s.nummer}`;
      lauf.setAttribute('aria-label', `Schritt ${s.nummer}:`);
      const code = el('code');
      code.appendChild(R.sqlHervorheben(text));
      zeile.append(lauf, code);
      box.appendChild(zeile);
    }
  }

  function klauselText(s) {
    if (!s.bereich) return s.klausel;
    return sqlText.slice(s.bereich.start, s.bereich.ende).replace(/\s+/g, ' ').trim();
  }

  function zeigeZaehler(s) {
    const z = $('zl-zaehler');
    z.replaceChildren(el('span', 'zl-zahl', zahl(s.zaehler.wert)), el('small', null, s.zaehler.einheit));
    if (s.zaehler.rechnung) z.appendChild(el('span', 'zl-rechnung', s.zaehler.rechnung.replace(/\d+/g, (n) => zahl(n))));
    else if (s.zaehler.vorher !== null && s.zaehler.vorher !== undefined && s.zaehler.vorher !== s.zaehler.wert) {
      z.appendChild(el('span', 'zl-rechnung', `vorher ${zahl(s.zaehler.vorher)}`));
    }
  }

  function zeigeLegende(s) {
    const legende = $('zl-legende');
    legende.replaceChildren();
    const gruppen = Array.isArray(s.gruppen) ? s.gruppen : [];
    legende.hidden = gruppen.length === 0;
    for (const g of gruppen) {
      const li = el('li', 'legende-eintrag' + gruppenKlasse(g) + (g.behalten === false ? ' weg' : ''));
      const marke = el('i', 'farbmarke');
      marke.setAttribute('aria-hidden', 'true');
      li.append(marke, el('span', 'name', g.name), el('span', 'anzahl', `${zahl(g.anzahl)} ${wort(g.anzahl, 'Zeile', 'Zeilen')}`));
      if (g.behalten === false) li.appendChild(el('span', 'legende-status', 'fällt weg'));
      legende.appendChild(li);
    }
  }

  function zeigeHinweis(s) {
    const teile = [];
    if (s.gesamt > s.zeilen.length) teile.push(`${zahl(s.gesamt)} ${wort(s.gesamt, 'Zeile', 'Zeilen')}, ${zahl(s.zeilen.length)} angezeigt`);
    if (s.hinweis) teile.push(s.hinweis);
    const p = $('zl-hinweis');
    p.textContent = teile.join(' · ');
    p.hidden = teile.length === 0;
  }

  /** Welche Spalten gezeigt werden: bei breiten Zwischentabellen zuerst nur die relevanten. */
  function sichtbareSpalten(s) {
    const alle = s.spalten.map((_, i) => i);
    if (alleSpalten || !Array.isArray(s.relevant) || s.spalten.length <= MAX_SPALTEN_KOMPAKT) return { liste: alle, gekuerzt: false };
    const relevant = alle.filter((i) => s.relevant[i]);
    if (relevant.length === 0 || relevant.length === alle.length) return { liste: alle, gekuerzt: false };
    return { liste: relevant, gekuerzt: true };
  }

  function zeigeTabelle(s, vorwaerts) {
    const tabelle = $('zl-tabelle');
    const gruppen = new Map((s.gruppen || []).map((g) => [g.nr, g]));
    const mitGruppenSpalte = s.klausel === 'GROUP BY' || s.klausel === 'HAVING';
    const { liste, gekuerzt } = sichtbareSpalten(s);
    const wegVorher = vorher && vorher.klausel !== s.klausel ? vorher.weg : new Set();

    const kopf = el('tr');
    if (mitGruppenSpalte) kopf.appendChild(el('th', 'gruppe-kopf', 'Gruppe'));
    let tabelleVorher = null;
    for (const i of liste) {
      const name = String(s.spalten[i]);
      const th = el('th', null, name);
      th.scope = 'col';
      const tab = name.includes('.') ? name.split('.')[0] : null;
      if (tabelleVorher !== null && tab !== tabelleVorher) th.classList.add('tabellen-grenze');
      tabelleVorher = tab;
      kopf.appendChild(th);
    }
    const koerper = el('tbody');
    let gruppeVorher = null;
    for (const z of s.zeilen) {
      const g = z.gruppe !== undefined && z.gruppe !== null ? gruppen.get(z.gruppe) : null;
      let klasse = '';
      if (z.verworfen) klasse += ' weg';
      if (z.verworfen && vorwaerts && !wegVorher.has(z.id)) klasse += ' frisch';
      if (g) klasse += gruppenKlasse(g);
      if (g && gruppeVorher !== null && z.gruppe !== gruppeVorher) klasse += ' gruppenstart';
      if (vorwaerts && !z.verworfen && (s.klausel === 'SELECT' || s.klausel === 'ORDER BY')) klasse += ' neu';
      gruppeVorher = g ? z.gruppe : null;
      const tr = el('tr', klasse.trim() || null);
      if (mitGruppenSpalte) {
        const td = el('td', 'gruppe-zelle');
        if (z.verworfen) td.appendChild(el('span', 'nur-sr', 'verworfen: '));
        td.appendChild(document.createTextNode(g ? g.name : '–'));
        tr.appendChild(td);
      }
      liste.forEach((i, k) => {
        const td = zelle(z.werte[i]);
        if (k === 0 && !mitGruppenSpalte) {
          if (g) td.classList.add('gruppe-zelle');
          if (z.verworfen) td.insertBefore(el('span', 'nur-sr', 'verworfen: '), td.firstChild);
        }
        const th = kopf.children[k + (mitGruppenSpalte ? 1 : 0)];
        if (th && th.classList.contains('tabellen-grenze')) td.classList.add('tabellen-grenze');
        tr.appendChild(td);
      });
      koerper.appendChild(tr);
    }
    const thead = el('thead');
    thead.appendChild(kopf);
    const caption = el('caption', 'nur-sr', `Zwischentabelle nach ${s.klausel}`);
    tabelle.replaceChildren(caption, thead, koerper);
    if (s.zeilen.length === 0) {
      const leer = el('tr');
      const td = el('td', 'leer', 'Keine Zeile übrig.');
      td.colSpan = liste.length + (mitGruppenSpalte ? 1 : 0);
      leer.appendChild(td);
      koerper.appendChild(leer);
    }

    const umschalter = $('zl-spalten');
    if (gekuerzt || alleSpalten) {
      const anzahl = s.spalten.length;
      umschalter.hidden = !(gekuerzt || (alleSpalten && Array.isArray(s.relevant) && anzahl > MAX_SPALTEN_KOMPAKT));
      umschalter.textContent = alleSpalten ? 'Nur die wichtigen Spalten zeigen' : `Alle ${anzahl} Spalten zeigen`;
      umschalter.setAttribute('aria-pressed', alleSpalten ? 'true' : 'false');
    } else {
      umschalter.hidden = true;
    }
    vorher = { klausel: s.klausel, weg: new Set(s.zeilen.filter((z) => z.verworfen).map((z) => z.id)) };
  }

  function zeige(i, vorwaerts) {
    if (!schritte.length) return;
    index = Math.max(0, Math.min(schritte.length - 1, i));
    const s = schritte[index];
    for (const b of $('zl-schritte').querySelectorAll('button[data-schritt]')) {
      const n = Number(b.dataset.schritt);
      b.classList.toggle('erledigt', n < index);
      if (n === index) b.setAttribute('aria-current', 'step');
      else b.removeAttribute('aria-current');
    }
    for (const d of $('zl-sql').querySelectorAll('.zl-zeile')) {
      const n = Number(d.dataset.schritt);
      d.classList.toggle('aktiv', n === index);
      d.classList.toggle('spaeter', n > index);
      if (n === index) d.setAttribute('aria-current', 'step');
      else d.removeAttribute('aria-current');
    }
    $('zl-karte').dataset.klausel = s.klausel;
    zeigeZaehler(s);
    $('zl-titel').textContent = klauselText(s);
    $('zl-text').textContent = s.text;
    zeigeLegende(s);
    zeigeHinweis(s);
    zeigeTabelle(s, !!vorwaerts);
    knopfZurueck.disabled = index === 0;
    knopfVor.disabled = index === schritte.length - 1;
    $('zl-karte').dataset.schritt = String(index);
  }

  /* ---------- Abspielen ---------- */

  function setzeAbspielen(an) {
    knopfAbspielen.setAttribute('aria-pressed', an ? 'true' : 'false');
    $('zl-abspielen-text').textContent = an ? 'Anhalten' : 'Abspielen';
    $('zl-abspielen-icon').setAttribute('href', '/static/img/icons.svg#' + (an ? 'i-pause' : 'i-play'));
  }

  function stoppe() {
    if (timer) clearInterval(timer);
    timer = null;
    setzeAbspielen(false);
  }

  function abspielen() {
    if (timer) {
      stoppe();
      return;
    }
    if (!schritte.length) return;
    setzeAbspielen(true);
    const weiter = () => {
      if (index >= schritte.length - 1) {
        stoppe();
        return;
      }
      zeige(index + 1, true);
      if (index >= schritte.length - 1) stoppe();
    };
    if (index >= schritte.length - 1) zeige(0, false);
    else zeige(index + 1, true);
    if (index >= schritte.length - 1) {
      stoppe();
      return;
    }
    timer = setInterval(weiter, reduziert() ? TAKT_REDUZIERT_MS : TAKT_MS);
  }

  /* ---------- Ereignisse ---------- */

  knopfStarten.addEventListener('click', () => starte());
  knopfZurueck.addEventListener('click', () => {
    stoppe();
    zeige(index - 1, false);
  });
  knopfVor.addEventListener('click', () => {
    stoppe();
    zeige(index + 1, true);
  });
  knopfAbspielen.addEventListener('click', () => abspielen());
  $('zl-spalten').addEventListener('click', () => {
    alleSpalten = !alleSpalten;
    vorher = null;
    zeige(index, false);
  });
  document.addEventListener('keydown', (e) => {
    if (ansicht.hidden || !schritte.length) return;
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    const ziel = e.target;
    if (ziel && ziel.closest && ziel.closest('textarea, input, select, [contenteditable="true"]')) return;
    e.preventDefault();
    stoppe();
    if (e.key === 'ArrowLeft') zeige(index - 1, false);
    else zeige(index + 1, true);
  });

  await starte();
  // Block „zeitlupe“ mit start: gleich bei dieser Klausel beginnen (sonst Schritt 1)
  if (passend && uebergabe.start) {
    const i = schritte.findIndex((s) => s.klausel === uebergabe.start);
    if (i > 0) zeige(i, false);
  }
}

start();
