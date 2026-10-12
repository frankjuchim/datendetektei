// Werkzeug „Sortierfächer“ (/werkzeug/sortierfaecher, Plan Phase 4 Task 4; DESIGN.md §5.6, §2.4, §4.5, §6, §7).
// Zeigt GROUP BY als Karteikarten, die in Fächer fallen: WHERE wirft einzelne Karten vorher in den Korb, die
// Aggregatfunktionen rechnen je Fach, HAVING graut danach ganze Fächer aus; der Umschalter COUNT(*) ↔ SUM(Spalte)
// macht P4 sichtbar. Gerechnet wird nur im Browser auf der öffentlichen Übungs-DB (sql.js-Worker aus
// konsole/ausfuehren.js) mit der Rechenschicht self.DD_SQL_VISUAL (src/sql/visual.js).
//
// Abfrage: Übergabe per sessionStorage „dd_sortierfaecher“ = { db, sql } (aus Konsole/Diagnose, nie in der URL),
// sonst eine eigene, neutrale Beispielabfrage je DB (keine Aufgabe, keine Musterlösung). Ausgaben nur als Textknoten.

const V = new URL(import.meta.url).search;

export const UEBERGABE = 'dd_sortierfaecher';
export const SCHRITT_MS = 1800;
export const SCHRITT_MS_REDUZIERT = 2600;
const MAX_SQL = 5000;
const MAX_KARTEN_SPALTEN = 4;

export const DATENBANKEN = Object.freeze({
  fundbuero: 'Fundbüro',
  stadtrad: 'StadtRad',
  stadtfest: 'Stadtfest',
  tus: 'TuS Weserstedt',
  detektei: 'Detektei',
  datenspuren: 'Datenspuren',
  eisdiele: 'Eisdiele'
});
const STANDARD_DB = 'stadtfest';

// Neutrale Beispiele (keine Lab-, AB-, Verhör- oder Klausuraufgabe): je ein WHERE, GROUP BY, HAVING.
export const BEISPIELE = Object.freeze({
  fundbuero: `SELECT Stadtteil, COUNT(*) AS Funde, SUM(Wert) AS Gesamtwert
FROM Fundsache
WHERE AbgeholtAm IS NULL
GROUP BY Stadtteil
HAVING COUNT(*) >= 5`,
  stadtrad: `SELECT Rad.Typ, COUNT(*) AS Reparaturen, SUM(Reparatur.Kosten) AS Kosten
FROM Rad, Reparatur
WHERE Rad.RadID = Reparatur.RadID
  AND Reparatur.Kosten >= 30
GROUP BY Rad.Typ
HAVING COUNT(*) >= 8`,
  stadtfest: `SELECT Stand.Platz, COUNT(*) AS Produkte
FROM Stand, Produkt
WHERE Stand.StandNr = Produkt.StandNr
  AND Produkt.Preis >= 2
GROUP BY Stand.Platz
HAVING COUNT(*) > 8`,
  tus: `SELECT Beitragsgruppe.Gruppe, COUNT(*) AS Mitglieder, SUM(Beitragsgruppe.Monatsbeitrag) AS Beitraege
FROM Mitglied, Beitragsgruppe
WHERE Mitglied.Beitragsgruppe = Beitragsgruppe.Gruppe
  AND Mitglied.Geburtsjahr >= 1990
GROUP BY Beitragsgruppe.Gruppe
HAVING COUNT(*) >= 5`,
  detektei: `SELECT Status, COUNT(*) AS Faelle
FROM Fall
WHERE Eroeffnet >= '2026-01-01'
GROUP BY Status
HAVING COUNT(*) >= 3`,
  datenspuren: `SELECT StandNr, COUNT(*) AS Zahlungen, SUM(Betrag) AS Summe
FROM FestZahlung
WHERE Betrag >= 5
GROUP BY StandNr
HAVING COUNT(*) >= 20`,
  eisdiele: `SELECT Sorte.Vegan, COUNT(*) AS Verkaeufe, SUM(Verkauf.Kugeln) AS Kugeln
FROM Sorte, Verkauf
WHERE Sorte.SorteNr = Verkauf.SorteNr
  AND Verkauf.Kugeln >= 2
GROUP BY Sorte.Vegan
HAVING COUNT(*) >= 10`
});

const TEXT_LEER = 'Wähle eine Abfrage mit GROUP BY und tippe auf „Einsortieren“.';
const TEXT_LAEUFT = 'Wird einsortiert …';
const TEXT_ZU_LANG = 'Die Abfrage ist zu lang.';
const TEXT_KEINE = 'Schreib zuerst eine Abfrage.';

const KLASSEN = { schluessel: 'sql-kw', text: 'sql-str', zahl: 'sql-num', kommentar: 'sql-komm', aggregat: 'sql-agg', operator: 'sql-op' };

const $ = (id) => document.getElementById(id);

function el(tag, klasse, text) {
  const e = document.createElement(tag);
  if (klasse) e.className = klasse;
  if (text !== undefined && text !== null) e.textContent = String(text);
  return e;
}
function h(tag, klasse, ...kinder) {
  const e = el(tag, klasse);
  for (const k of kinder) if (k !== null && k !== undefined && k !== false) e.append(k);
  return e;
}

const anzahl = (n) => Number(n).toLocaleString('de-DE');
const mehrzahl = (n, eins, viele) => `${anzahl(n)} ${n === 1 ? eins : viele}`;

/** Zellwert als Text (NULL als eigener Knoten, Zahlen deutsch ohne Tausenderpunkt, höchstens 2 Nachkommastellen). */
function wertKnoten(w) {
  if (w === null || w === undefined) return el('span', 'null', 'NULL');
  if (typeof w === 'number') {
    const ganz = Number.isInteger(w);
    return document.createTextNode(w.toLocaleString('de-DE', { useGrouping: false, minimumFractionDigits: ganz ? 0 : 2, maximumFractionDigits: 2 }));
  }
  return document.createTextNode(String(w));
}
function wertText(w) {
  if (w === null || w === undefined) return 'NULL';
  return wertKnoten(w).textContent;
}

function speicherLesen() {
  try {
    const roh = window.sessionStorage.getItem(UEBERGABE);
    if (!roh) return null;
    const o = JSON.parse(roh);
    if (!o || typeof o.sql !== 'string' || !Object.prototype.hasOwnProperty.call(DATENBANKEN, o.db)) return null;
    if (o.sql.length > MAX_SQL) return null;
    return { db: o.db, sql: o.sql };
  } catch {
    return null;
  }
}
function speicherSchreiben(wert) {
  try {
    window.sessionStorage.setItem(UEBERGABE, JSON.stringify(wert));
  } catch {
    /* nicht speicherbar – gilt bis zum Neuladen */
  }
}

const reduziert = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const schmal = () => window.matchMedia('(max-width: 699px)').matches;

// ------------------------------------------------------------------------------------------------------------
// Abfrage mit hervorgehobener Klausel

/** Schreibt die Abfrage mit Syntaxfarben; jede Klausel (bereiche) steckt in einem eigenen Span. → { klausel: span } */
function zeichneAbfrage(pre, sql, bereiche) {
  const parser = window.DD_SQL_PARSER;
  let teile;
  try {
    teile = parser ? parser.hebeHervor(sql) : [{ text: sql }];
  } catch {
    teile = [{ text: sql }];
  }
  const marken = Object.entries(bereiche || {})
    .filter(([, b]) => b && typeof b.start === 'number' && b.ende > b.start)
    .map(([k, b]) => ({ k, start: b.start, ende: b.ende }))
    .sort((a, b) => a.start - b.start);
  const spans = {};
  pre.replaceChildren();
  const klauselBei = (pos) => marken.find((m) => m.start <= pos && pos < m.ende) || null;
  const naechsterStart = (pos) => {
    const m = marken.find((x) => x.start > pos);
    return m ? m.start : Infinity;
  };
  let pos = 0;
  for (const teil of teile) {
    let rest = String(teil.text);
    while (rest.length > 0) {
      const m = klauselBei(pos);
      const grenze = m ? m.ende : naechsterStart(pos);
      const n = Math.min(rest.length, grenze - pos);
      const stueck = rest.slice(0, n);
      let ziel = pre;
      if (m) {
        if (!spans[m.k]) {
          spans[m.k] = el('span', 'sf-klausel');
          spans[m.k].dataset.klausel = m.k;
          pre.append(spans[m.k]);
        }
        ziel = spans[m.k];
      }
      const klasse = KLASSEN[teil.klasse];
      ziel.append(klasse ? el('span', klasse, stueck) : document.createTextNode(stueck));
      pos += n;
      rest = rest.slice(n);
    }
  }
  return spans;
}

// ------------------------------------------------------------------------------------------------------------
// Schritte

/** Schrittfolge aus dem Ergebnis: WHERE-Korb (falls WHERE) → Fächer füllen → Aggregate → HAVING (falls HAVING). */
export function baueSchritte(r) {
  const s = [];
  if (r.bereiche.where) s.push({ art: 'where', titel: 'WHERE-Korb', klausel: 'where' });
  s.push({ art: 'faecher', titel: 'Fächer füllen', klausel: r.bereiche.groupBy ? 'groupBy' : 'from' });
  s.push({ art: 'aggregate', titel: 'Aggregate', klausel: 'select' });
  if (r.bereiche.having) s.push({ art: 'having', titel: 'HAVING', klausel: 'having' });
  return s;
}

function klauselText(sql, bereich, wort) {
  if (!bereich) return '';
  return sql.slice(bereich.start, bereich.ende).replace(new RegExp('^' + wort + '\\s+', 'i'), '').replace(/\s+/g, ' ').trim();
}

/** Spalten, die zum Gruppenschlüssel gehören (stehen schon im Kopf der Karte). */
function schluesselSpalten(r, sql) {
  const text = klauselText(sql, r.bereiche.groupBy, 'GROUP\\s+BY');
  if (!text) return new Set();
  const teile = text.split(',').map((t) => t.trim().toLowerCase());
  const menge = new Set();
  r.spalten.forEach((label, i) => {
    const l = label.toLowerCase();
    const kurz = l.includes('.') ? l.slice(l.indexOf('.') + 1) : l;
    if (teile.some((t) => t === l || t === kurz || t.endsWith('.' + kurz) && !l.includes('.'))) menge.add(i);
  });
  return menge;
}

/** Ist die Spalte (Label „Tabelle.Spalte“ oder „Spalte“) laut Schema nur Schlüssel (PK oder FK)? */
function nurSchluessel(label, schema) {
  if (!Array.isArray(schema)) return false;
  const punkt = label.indexOf('.');
  const ref = punkt >= 0 ? label.slice(0, punkt).toLowerCase() : null;
  const spalte = (punkt >= 0 ? label.slice(punkt + 1) : label).toLowerCase();
  let tabellen = schema.filter((t) => ref && String(t.tabelle).toLowerCase() === ref);
  if (tabellen.length === 0) tabellen = schema;
  const treffer = tabellen.flatMap((t) => (t.spalten || []).filter((c) => String(c.name).toLowerCase() === spalte));
  return treffer.length > 0 && treffer.every((c) => c.pk || c.fk);
}

/**
 * Spalten für die Karteikarten: relevante Spalten ohne Gruppenschlüssel und ohne reine Schlüsselspalten (die stehen
 * nur im Verbund), höchstens 4. Im Korb bleiben die Schlüssel sichtbar – sie erklären, warum eine Karte herausfällt.
 */
function kartenSpalten(r, sql, schema, { mitSchluesseln = false } = {}) {
  const gruppe = schluesselSpalten(r, sql);
  const alle = r.spalten.map((_, i) => i);
  const relevant = alle.filter((i) => r.relevant[i]);
  let liste = relevant.filter((i) => !gruppe.has(i) && (mitSchluesseln || !nurSchluessel(r.spalten[i], schema)));
  if (liste.length === 0) liste = relevant.filter((i) => !gruppe.has(i));
  if (liste.length === 0) liste = relevant;
  if (liste.length === 0) liste = alle;
  return liste.slice(0, MAX_KARTEN_SPALTEN);
}

// ------------------------------------------------------------------------------------------------------------
// Tisch: Korb und Fächer

function farbKlasse(fach) {
  return fach.farbe ? `g${fach.farbe}` : 'ohne-farbe';
}

function karte(zeile, fach, spalten, r, nr) {
  const li = el('li', 'sf-karte');
  li.style.setProperty('--i', String(nr));
  const kopf = h('div', 'sf-karte-kopf', el('span', 'sf-marke', ''), el('span', 'sf-karte-name', fach.name));
  kopf.firstChild.setAttribute('aria-hidden', 'true');
  const werte = el('dl', 'sf-karte-werte');
  for (const i of spalten) {
    werte.append(h('div', 'sf-paar', el('dt', null, r.spalten[i]), h('dd', null, wertKnoten(zeile.werte[i]))));
  }
  li.append(kopf, werte);
  return li;
}

function zeichneKorb(r, spalten) {
  const inhalt = $('sf-korb-inhalt');
  const zaehler = $('sf-korb-zaehler');
  zaehler.textContent = mehrzahl(r.korb.anzahl, 'Zeile', 'Zeilen');
  inhalt.replaceChildren();
  if (!r.bereiche.where) {
    inhalt.append(el('p', 'sf-korb-leer', 'Kein WHERE: Keine Karte fällt in den Korb, alle kommen in die Fächer.'));
    return;
  }
  if (r.korb.anzahl === 0) {
    inhalt.append(el('p', 'sf-korb-leer', 'Jede Karte erfüllt die WHERE-Bedingung – der Korb bleibt leer.'));
    return;
  }
  const liste = el('ul', 'sf-korb-liste');
  for (const z of r.korb.zeilen) {
    const li = el('li', 'sf-korb-karte');
    li.append(el('span', 'sf-weg', '✗'));
    const text = el('span', 'sf-korb-werte');
    spalten.forEach((i, k) => {
      if (k > 0) text.append(document.createTextNode(' · '));
      text.append(el('span', 'sf-korb-spalte', r.spalten[i] + ' '), wertKnoten(z.werte[i]));
    });
    li.append(text);
    liste.append(li);
  }
  inhalt.append(liste);
  const rest = r.korb.anzahl - r.korb.zeilen.length;
  if (rest > 0) inhalt.append(el('p', 'sf-mehr', `+ ${mehrzahl(rest, 'weitere Zeile', 'weitere Zeilen')} im Korb`));
}

function zeichneFaecher(r, sql, spalten) {
  const flaeche = $('sf-faecher');
  flaeche.replaceChildren();
  flaeche.classList.toggle('viele', r.faecher.length > 3);
  r.faecher.forEach((fach, f) => {
    const sektion = el('section', `sf-fach ${farbKlasse(fach)}${fach.havingRaus ? ' raus' : ''}`);
    sektion.setAttribute('aria-label', `Fach ${fach.name}`);
    sektion.dataset.nr = String(f);
    const kopf = h(
      'header',
      'sf-fach-kopf',
      el('span', 'sf-marke', ''),
      h('span', 'sf-fach-titel', el('span', 'etikett', 'Fach'), el('span', 'sf-fach-name', fach.name)),
      el('span', 'sf-fach-anzahl', mehrzahl(fach.anzahl, 'Karte', 'Karten'))
    );
    kopf.firstChild.setAttribute('aria-hidden', 'true');
    sektion.append(kopf);
    sektion.append(el('p', 'sf-fach-leer', 'Noch leer – die Karten warten aufs Einsortieren.'));
    const karten = el('ul', 'sf-karten');
    fach.zeilen.forEach((z, i) => karten.append(karte(z, fach, spalten, r, i)));
    sektion.append(karten);
    const rest = fach.anzahl - fach.zeilen.length;
    if (rest > 0) sektion.append(el('p', 'sf-mehr', `+ ${mehrzahl(rest, 'weitere Karte', 'weitere Karten')}`));
    const agg = el('dl', 'sf-aggregate');
    r.aggregate.forEach((name, i) => {
      agg.append(h('div', 'sf-paar', el('dt', null, name), h('dd', null, wertKnoten(fach.aggregate[i]))));
    });
    sektion.append(agg);
    if (r.umschalter) {
      const v = h(
        'p',
        'sf-vergleich',
        h('span', 'sf-vergleich-links', el('span', 'sf-vergleich-etikett', 'Vergleich'), el('span', 'sf-vergleich-name', '')),
        el('strong', 'sf-vergleich-wert', '')
      );
      sektion.append(v);
    }
    if (r.bereiche.having) {
      sektion.append(
        el('p', 'sf-having', fach.havingRaus ? 'HAVING ✗ – das ganze Fach fällt heraus' : 'HAVING ✓ – das Fach bleibt')
      );
    }
    flaeche.append(sektion);
  });
}

function zeichneLegende(r) {
  const legende = $('sf-legende');
  legende.replaceChildren();
  for (const fach of r.faecher.filter((x) => x.farbe)) {
    const li = h('li', `sf-legende-eintrag ${farbKlasse(fach)}`, el('span', 'sf-marke', ''), el('span', null, fach.name));
    li.firstChild.setAttribute('aria-hidden', 'true');
    legende.append(li);
  }
  if (r.faecher.some((x) => !x.farbe)) legende.append(el('li', 'sf-legende-eintrag ohne-farbe', 'weitere Fächer: nur mit Namen'));
}

// ------------------------------------------------------------------------------------------------------------
// Seite

async function start() {
  const visual = window.DD_SQL_VISUAL;
  const parameter = new URLSearchParams(window.location.search);
  const urlDb = parameter.get('db');
  const uebergabe = speicherLesen();
  const name = urlDb && DATENBANKEN[urlDb] ? urlDb : uebergabe ? uebergabe.db : STANDARD_DB;
  if (!urlDb) {
    try {
      window.history.replaceState(null, '', `${window.location.pathname}?db=${encodeURIComponent(name)}`);
    } catch {
      /* egal */
    }
  }
  const titel = DATENBANKEN[name];
  document.title = `Sortierfächer: ${titel} – Datendetektei`;
  $('sf-db-name').textContent = `${titel} · Übungs-DB`;
  $('sf-konsole-db').textContent = `DB: ${titel} · Übungs-DB`;

  const auswahl = $('sf-db');
  auswahl.value = name;
  auswahl.addEventListener('change', () => {
    window.location.assign(`/werkzeug/sortierfaecher?db=${encodeURIComponent(auswahl.value)}`);
  });

  const eingabe = $('sf-eingabe');
  eingabe.value = uebergabe && uebergabe.db === name ? uebergabe.sql : BEISPIELE[name];
  const knopfEinsortieren = $('sf-einsortieren');
  const meldung = $('sf-meldung');
  const knopfZurueck = $('sf-zurueck');
  const knopfWeiter = $('sf-weiter');
  const knopfAbspielen = $('sf-abspielen');
  const korb = $('sf-korb');
  const tisch = document.querySelector('.sf-tisch');
  const buehne = $('sf-buehne');

  const z = { r: null, sql: '', schritte: [], index: 0, modus: 'count', uhr: null, spans: {} };

  const { erzeugeAusfuehrer, werkzeugBereit } = await import('../konsole/ausfuehren.js' + V);
  // Schema (PK/FK) nur für die Auswahl der Kartenspalten; fehlt es, zeigen die Karten alle relevanten Spalten.
  const schema = await fetch(`/api/db/${name}/schema`, { credentials: 'same-origin', headers: { Accept: 'application/json' } })
    .then((antwort) => (antwort.ok ? antwort.json() : null))
    .catch(() => null);
  const ausfuehrer = erzeugeAusfuehrer({ dbUrl: `/db/${name}.sqlite`, ohneWasm: parameter.get('ohneWasm') === '1' });
  // null = bereit, sonst { art: 'laden' | 'wasm', text } (einheitlicher WebAssembly-Hinweis, kein Server-Rückfall)
  const startFehler = werkzeugBereit(ausfuehrer);

  function zeigeMeldung(text, art) {
    meldung.replaceChildren();
    if (!text) return;
    meldung.append(el('p', `sf-meldung-text ${art || 'fehler'}`, text));
  }

  function anhalten() {
    if (z.uhr) clearInterval(z.uhr);
    z.uhr = null;
    knopfAbspielen.setAttribute('aria-pressed', 'false');
    $('sf-abspielen-text').textContent = 'Abspielen';
    $('sf-abspielen-icon').setAttribute('href', '/static/img/icons.svg#i-play');
  }

  function leer() {
    anhalten();
    z.r = null;
    z.schritte = [];
    buehne.classList.add('leer');
    $('sf-abfrage').replaceChildren(document.createTextNode(eingabe.value));
    $('sf-schritte').replaceChildren();
    $('sf-zahl').textContent = '–';
    $('sf-einheit').textContent = 'Noch nichts einsortiert';
    $('sf-schritt-titel').textContent = 'Sortierfächer';
    $('sf-schritt-text').textContent = TEXT_LEER;
    $('sf-umschalter').hidden = true;
    $('sf-hinweise').replaceChildren();
    $('sf-korb-inhalt').replaceChildren();
    $('sf-korb-zaehler').textContent = '0 Zeilen';
    $('sf-faecher').replaceChildren();
    $('sf-legende').replaceChildren();
    tisch.className = 'sf-tisch';
    knopfZurueck.disabled = true;
    knopfWeiter.disabled = true;
    knopfAbspielen.disabled = true;
  }

  function zeigeVergleich() {
    const r = z.r;
    if (!r || !r.umschalter) return;
    const sum = z.modus === 'sum';
    const nameSum = `SUM(${r.umschalter.spalte})`;
    $('sf-count').setAttribute('aria-pressed', String(!sum));
    $('sf-sum').setAttribute('aria-pressed', String(sum));
    $('sf-umschalter-text').textContent = sum
      ? `${nameSum} addiert die Werte von ${r.umschalter.spalte} aller Karten im Fach (NULL zählt nicht mit).`
      : 'COUNT(*) zählt die Karteikarten im Fach – egal, was darauf steht.';
    document.querySelectorAll('#sf-faecher .sf-fach').forEach((sektion) => {
      const w = r.umschalter.werte[Number(sektion.dataset.nr)];
      const v = sektion.querySelector('.sf-vergleich');
      if (!w || !v) return;
      v.querySelector('.sf-vergleich-name').textContent = sum ? nameSum : 'COUNT(*)';
      v.querySelector('.sf-vergleich-wert').replaceChildren(wertKnoten(sum ? w.sum : w.count));
    });
  }

  function schrittText(s) {
    const r = z.r;
    const alleGezeigt = r.gesamt === r.faecher.length;
    if (s.art === 'where') {
      return {
        zahl: r.korb.anzahl,
        einheit: r.korb.anzahl === 1 ? 'Zeile im Korb' : 'Zeilen im Korb',
        text:
          r.korb.anzahl === 0
            ? 'WHERE prüft jede Karte einzeln, noch bevor sortiert wird. Hier erfüllen alle die Bedingung.'
            : `WHERE prüft jede Karte einzeln, noch bevor sortiert wird. ${mehrzahl(r.korb.anzahl, 'Zeile erfüllt', 'Zeilen erfüllen')} die Bedingung nicht und ${r.korb.anzahl === 1 ? 'fällt' : 'fallen'} in den Korb.`
      };
    }
    if (s.art === 'faecher') {
      const gb = klauselText(z.sql, r.bereiche.groupBy, 'GROUP\\s+BY');
      return {
        zahl: r.gesamt,
        einheit: r.gesamt === 1 ? 'Fach' : 'Fächer',
        text: gb
          ? `GROUP BY sortiert die übrigen Karten nach ${gb}: Karten mit gleichem Wert landen im selben Fach.`
          : 'Ohne GROUP BY landen alle übrigen Karten in einem einzigen Fach.'
      };
    }
    if (s.art === 'aggregate') {
      return {
        zahl: r.gesamt,
        einheit: r.gesamt === 1 ? 'Ergebniszeile' : 'Ergebniszeilen',
        text: `Jetzt rechnen die Aggregatfunktionen je Fach (${r.aggregate.join(', ')}). Aus jedem Fach wird genau eine Ergebniszeile.`
      };
    }
    const bleiben = r.faecher.filter((x) => !x.havingRaus).length;
    const raus = r.faecher.length - bleiben;
    return {
      zahl: bleiben,
      einheit: alleGezeigt
        ? `von ${mehrzahl(r.gesamt, 'Fach bleibt', 'Fächern bleiben')}`
        : `von ${anzahl(r.faecher.length)} gezeigten Fächern ${bleiben === 1 ? 'bleibt' : 'bleiben'}`,
      text: `HAVING prüft ganze Fächer – erst nach dem Gruppieren. ${raus === 0 ? 'Kein Fach fällt heraus.' : `${mehrzahl(raus, 'Fach fällt', 'Fächer fallen')} als Ganzes heraus (grau).`}`
    };
  }

  function zeigeSchritt(i) {
    if (!z.r) return;
    z.index = Math.max(0, Math.min(z.schritte.length - 1, i));
    const s = z.schritte[z.index];
    const arten = z.schritte.slice(0, z.index + 1).map((x) => x.art);
    tisch.className = 'sf-tisch';
    tisch.classList.add(`stufe-${s.art}`);
    if (arten.includes('faecher')) tisch.classList.add('zeige-karten');
    if (arten.includes('aggregate')) tisch.classList.add('zeige-aggregate');
    if (arten.includes('having')) tisch.classList.add('zeige-having');
    $('sf-schritte')
      .querySelectorAll('.sf-schritt')
      .forEach((b, k) => {
        if (k === z.index) b.setAttribute('aria-current', 'step');
        else b.removeAttribute('aria-current');
        b.classList.toggle('erledigt', k < z.index);
      });
    for (const [k, span] of Object.entries(z.spans)) span.classList.toggle('aktiv', k === s.klausel);
    const t = schrittText(s);
    $('sf-zahl').textContent = anzahl(t.zahl);
    $('sf-einheit').textContent = t.einheit;
    $('sf-schritt-titel').textContent = `${z.index + 1} · ${s.titel}`;
    $('sf-schritt-text').textContent = t.text;
    $('sf-umschalter').hidden = !(z.r.umschalter && arten.includes('aggregate'));
    knopfZurueck.disabled = z.index === 0;
    knopfWeiter.disabled = z.index === z.schritte.length - 1;
  }

  function zeigeErgebnis(r, sql) {
    anhalten();
    z.r = r;
    z.sql = sql;
    z.schritte = baueSchritte(r);
    buehne.classList.remove('leer');
    z.spans = zeichneAbfrage($('sf-abfrage'), sql, r.bereiche);
    const liste = $('sf-schritte');
    liste.replaceChildren();
    z.schritte.forEach((s, k) => {
      const b = h('button', 'sf-schritt', el('span', 'sf-schritt-nr', String(k + 1)), el('span', null, s.titel));
      b.type = 'button';
      b.addEventListener('click', () => {
        anhalten();
        zeigeSchritt(k);
      });
      liste.append(h('li', null, b));
    });
    zeichneKorb(r, kartenSpalten(r, sql, schema, { mitSchluesseln: true }));
    zeichneFaecher(r, sql, kartenSpalten(r, sql, schema));
    zeichneLegende(r);
    korb.open = !schmal();
    const hinweise = $('sf-hinweise');
    hinweise.replaceChildren();
    const texte = [];
    if (r.hinweis) texte.push(r.hinweis);
    if (r.faecher.length > 3) texte.push('Ab dem vierten Fach gibt es keine eigene Farbe mehr – der Fachname zeigt, wohin eine Karte gehört.');
    if (r.faecher.some((f) => f.anzahl > f.zeilen.length)) texte.push('Je Fach liegen höchstens 8 Karteikarten sichtbar; die Zähler sind exakt.');
    for (const t of texte) hinweise.append(el('p', 'sf-hinweis', t));
    z.modus = 'count';
    $('sf-sum').textContent = r.umschalter ? `SUM(${r.umschalter.spalte})` : 'SUM(…)';
    knopfAbspielen.disabled = false;
    zeigeVergleich();
    zeigeSchritt(0);
  }

  let laeuft = false;
  async function einsortieren() {
    if (laeuft) return;
    const sql = eingabe.value;
    if (!sql.trim()) {
      leer();
      zeigeMeldung(TEXT_KEINE);
      return;
    }
    if (sql.length > MAX_SQL) {
      leer();
      zeigeMeldung(TEXT_ZU_LANG);
      return;
    }
    speicherSchreiben({ db: name, sql });
    laeuft = true;
    knopfEinsortieren.disabled = true;
    anhalten();
    zeigeMeldung(TEXT_LAEUFT, 'laeuft');
    let r;
    try {
      const f = await startFehler;
      if (f && f.art === 'wasm') r = { fehler: f.text };
      else r = visual ? await visual.sortierfaecher(sql, ausfuehrer.fuehreAus) : { fehler: 'Die Sortierfächer konnten nicht geladen werden. Lade die Seite neu.' };
    } catch {
      r = { fehler: 'Diese Abfrage kann hier nicht einsortiert werden.' };
    }
    laeuft = false;
    knopfEinsortieren.disabled = false;
    if (r.fehler) {
      leer();
      zeigeMeldung(r.fehler);
      return;
    }
    if (!r.faecher || r.faecher.length === 0) {
      leer();
      zeigeMeldung(r.hinweis || 'Diese Abfrage bildet keine Gruppen.', 'hinweis');
      return;
    }
    zeigeMeldung('');
    zeigeErgebnis(r, sql);
  }

  knopfEinsortieren.addEventListener('click', einsortieren);
  $('sf-beispiel').addEventListener('click', () => {
    eingabe.value = BEISPIELE[name];
    einsortieren();
  });
  eingabe.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      einsortieren();
    }
  });
  knopfZurueck.addEventListener('click', () => {
    anhalten();
    zeigeSchritt(z.index - 1);
  });
  knopfWeiter.addEventListener('click', () => {
    anhalten();
    zeigeSchritt(z.index + 1);
  });
  knopfAbspielen.addEventListener('click', () => {
    if (!z.r) return;
    if (z.uhr) {
      anhalten();
      return;
    }
    if (z.index >= z.schritte.length - 1) zeigeSchritt(0);
    knopfAbspielen.setAttribute('aria-pressed', 'true');
    $('sf-abspielen-text').textContent = 'Anhalten';
    $('sf-abspielen-icon').setAttribute('href', '/static/img/icons.svg#i-stopp');
    z.uhr = setInterval(() => {
      if (z.index >= z.schritte.length - 1) {
        anhalten();
        return;
      }
      zeigeSchritt(z.index + 1);
      if (z.index >= z.schritte.length - 1) anhalten();
    }, reduziert() ? SCHRITT_MS_REDUZIERT : SCHRITT_MS);
  });
  $('sf-count').addEventListener('click', () => {
    z.modus = 'count';
    zeigeVergleich();
  });
  $('sf-sum').addEventListener('click', () => {
    z.modus = 'sum';
    zeigeVergleich();
  });
  // Pfeiltasten ← → steuern die Schritte (nicht in Eingabefeldern).
  document.addEventListener('keydown', (e) => {
    if (!z.r || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (e.target && e.target.closest && e.target.closest('textarea, input, select, [contenteditable]')) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      anhalten();
      zeigeSchritt(z.index + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      anhalten();
      zeigeSchritt(z.index - 1);
    }
  });
  window.matchMedia('(max-width: 699px)').addEventListener('change', (e) => {
    korb.open = !e.matches;
  });

  leer();
  await einsortieren();
}

if (typeof document !== 'undefined' && document.getElementById('sf-faecher')) {
  start();
}
