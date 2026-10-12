// Werkzeug „Spurenbrett“ (/werkzeug/spurenbrett, Plan Phase 4 Task 3; DESIGN.md §4.4, §5.5, §6, §7).
// Zeigt den Verbund als Kreuzprodukt: 2–3 Tabellen als Karteikarten auf Kork, jede Kombination als roter Faden (SVG).
// „Bedingung anwenden“ lässt die unpassenden Fäden abfallen (900 ms; reduzierte Bewegung: nur Ausblenden), passende
// werden 3 px dick; darunter das Ergebnis des Verbunds und eine Ermittler-Notiz zu NULL. Gerechnet wird im Browser auf
// der öffentlichen Übungs-DB (sql.js-Worker aus konsole/ausfuehren.js, Rechenschicht self.DD_SQL_VISUAL).
// Übergabe aus Konsole/Diagnose (optional): sessionStorage „dd_spurenbrett“ = { db, tabellen, bedingung }.
// Ausgaben nur als Textknoten; SVG per createElementNS (render.js → svg()); keine Inline-Styles (nur CSSOM).

const V = new URL(import.meta.url).search;

const DATENBANKEN = Object.freeze({
  fundbuero: 'Fundbüro',
  stadtrad: 'StadtRad',
  stadtfest: 'Stadtfest',
  tus: 'TuS Weserstedt',
  detektei: 'Detektei',
  datenspuren: 'Datenspuren',
  eisdiele: 'Eisdiele'
});
const STANDARD_DB = 'stadtrad';
const UEBERGABE = 'dd_spurenbrett';
const FALL_MS = 900;
const MAX_LISTE = 50;
const MAX_ERGEBNIS = 50;
const MAX_PUNKTE = 400; // Nadelpunkte an den Fadenenden nur bis zu so vielen Fäden
const SCHMAL = '(max-width: 599px)';

const TEXT_SCHEMA = 'Das Schema konnte nicht geladen werden. Lade die Seite neu.';
const TEXT_KEIN_SQL =
  'Das Spurenbrett rechnet im Browser. Dein Browser kann die Datenbank gerade nicht öffnen – lade die Seite neu oder nimm einen aktuellen Browser.';
const TEXT_ZWEI = 'Wähle zwei oder drei Tabellen für das Spurenbrett.';
const TEXT_ZEILEN = 'Wähle je Tabelle 1 bis 50 Zeilen.';
const TEXT_LEER = 'Schreib eine Bedingung, zum Beispiel Tabelle.Spalte = Tabelle.Spalte.';

const $ = (id) => document.getElementById(id);
const zahl = (n) => Number(n).toLocaleString('de-DE');
const q = (name) => '"' + String(name).replace(/"/g, '""') + '"';
const klein = (s) => String(s).toLowerCase();

function liesUebergabe() {
  try {
    const roh = window.sessionStorage.getItem(UEBERGABE);
    if (roh === null) return null;
    window.sessionStorage.removeItem(UEBERGABE);
    const u = JSON.parse(roh);
    return u && typeof u === 'object' ? u : null;
  } catch {
    return null;
  }
}

/** „A“, „A und B“, „A, B und C“, „A, B, C, D und 3 weitere“. */
function aufzaehlung(liste, max = 4) {
  if (liste.length <= 1) return liste.join('');
  if (liste.length > max) return liste.slice(0, max).join(', ') + ' und ' + zahl(liste.length - max) + ' weitere';
  return liste.slice(0, -1).join(', ') + ' und ' + liste[liste.length - 1];
}

/** Spaltennamen, die in der Bedingung vorkommen (ohne Textliterale), klein geschrieben. */
function genannteNamen(bedingung) {
  const ohneText = String(bedingung || '').replace(/'(?:[^']|'')*'/g, ' ');
  return new Set((ohneText.match(/[A-Za-z_][A-Za-z0-9_]*/g) || []).map(klein));
}

async function start() {
  const R = await import('../kern/render.js' + V);
  const { erzeugeAusfuehrer, werkzeugBereit } = await import('../konsole/ausfuehren.js' + V);
  const { el, h, svg, icon, sqlHervorheben } = R;
  const visual = window.DD_SQL_VISUAL;

  const parameter = new URLSearchParams(window.location.search);
  const uebergabe = liesUebergabe();
  let db = parameter.get('db');
  if (!db) {
    db = uebergabe && Object.prototype.hasOwnProperty.call(DATENBANKEN, uebergabe.db) ? uebergabe.db : STANDARD_DB;
    try {
      window.history.replaceState(null, '', '?db=' + encodeURIComponent(db));
    } catch {
      /* ohne History-API bleibt die Adresse */
    }
  }
  if (!Object.prototype.hasOwnProperty.call(DATENBANKEN, db)) return;
  const vorgabe = uebergabe && uebergabe.db === db ? uebergabe : null;

  const brett = $('sb-brett');
  const zaehler = $('sb-zaehler');
  const fehlerFlaeche = $('sb-fehler');
  const ergebnisFlaeche = $('sb-ergebnis');
  const bedingungFeld = $('sb-bedingung');
  const knopfAnwenden = $('sb-anwenden');
  const knopfZurueck = $('sb-zuruecksetzen');
  const liste = $('sb-liste');
  const listeInhalt = $('sb-liste-inhalt');
  const schmal = window.matchMedia(SCHMAL);

  document.title = `Spurenbrett: ${DATENBANKEN[db]} – Datendetektei`;
  $('sb-db-name').textContent = `${DATENBANKEN[db]} · Übungs-DB`;

  // Datenbank-Auswahl: Wechsel lädt die Seite mit ?db= (Anmeldung prüft der Server)
  const dbAuswahl = $('sb-db');
  for (const [name, titel] of Object.entries(DATENBANKEN)) {
    const o = el('option', null, titel);
    o.value = name;
    o.selected = name === db;
    dbAuswahl.appendChild(o);
  }
  dbAuswahl.addEventListener('change', () => {
    window.location.search = '?db=' + encodeURIComponent(dbAuswahl.value);
  });

  function zeigeFehler(text) {
    fehlerFlaeche.replaceChildren();
    if (!text) return;
    const box = el('div', 'diagnose');
    box.appendChild(el('p', 'diagnose-zeile', text));
    fehlerFlaeche.appendChild(box);
  }

  function brettHinweis(text) {
    brett.replaceChildren(el('p', 'sb-laedt', text));
  }

  // ---------- Schema und Ausführer ----------
  let schema;
  try {
    const r = await fetch(`/api/db/${db}/schema`, { credentials: 'same-origin', headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error('Schema');
    schema = await r.json();
    if (!Array.isArray(schema)) throw new Error('Schema');
  } catch {
    brettHinweis(TEXT_SCHEMA);
    $('sb-tabellen-liste').replaceChildren(el('p', 'sb-laedt', TEXT_SCHEMA));
    return;
  }
  if (!visual) {
    brettHinweis(TEXT_KEIN_SQL);
    return;
  }
  const schemaVon = (name) => schema.find((t) => klein(t.tabelle) === klein(name)) || null;

  const ausfuehrer = erzeugeAusfuehrer({ dbUrl: `/db/${db}.sqlite`, ohneWasm: parameter.get('ohneWasm') === '1' });
  const fuehreAus = (sql) => ausfuehrer.fuehreAus(sql);
  const startFehler = await werkzeugBereit(ausfuehrer);
  if (startFehler) {
    // WebAssembly fehlt → einheitlicher Hinweis aller Werkzeuge (kein Server-Rückfall); sonst kam die DB nicht an
    brettHinweis(startFehler.art === 'wasm' ? startFehler.text : TEXT_KEIN_SQL);
    return;
  }

  // ---------- Startauswahl ----------
  async function anzahlNull(tabelle, spalte) {
    const e = await fuehreAus(`SELECT COUNT(*) FROM ${q(tabelle)} WHERE ${q(spalte)} IS NULL`);
    return e && Array.isArray(e.zeilen) && e.zeilen[0] ? Number(e.zeilen[0][0]) : 0;
  }

  /** Fremdschlüssel-Paar mit NULL-Werten bevorzugt, sonst das kleinste Kreuzprodukt. */
  async function startTabellen() {
    const kandidaten = [];
    for (const t of schema) {
      for (const s of t.spalten || []) {
        if (!s.fk || !s.fk.tabelle || klein(s.fk.tabelle) === klein(t.tabelle)) continue;
        const ziel = schemaVon(s.fk.tabelle);
        if (!ziel) continue;
        kandidaten.push({ links: t.tabelle, rechts: ziel.tabelle, spalte: s.name, produkt: (t.zeilen || 0) * (ziel.zeilen || 0) });
      }
    }
    if (!kandidaten.length) return schema.slice(0, 2).map((t) => t.tabelle);
    for (const k of kandidaten) k.mitNull = (await anzahlNull(k.links, k.spalte)) > 0;
    kandidaten.sort((a, b) => Number(b.mitNull) - Number(a.mitNull) || a.produkt - b.produkt);
    return [kandidaten[0].links, kandidaten[0].rechts];
  }

  /**
   * Zeilenwahl einer Tabelle: die ersten n Zeilen; ist keine mit NULL im Fremdschlüssel zu einer anderen gewählten
   * Tabelle dabei, ersetzt die erste solche Zeile die letzte (DESIGN §5.5: der NULL-Fall gehört aufs Brett).
   */
  async function zeilenWahl(name, anzahl, alleNamen) {
    const t = schemaVon(name);
    const pk = (t.spalten || []).filter((s) => s.pk).map((s) => s.name);
    if (!pk.length) return { name: t.tabelle, limit: anzahl };
    const andere = new Set(alleNamen.filter((n) => klein(n) !== klein(name)).map(klein));
    const fks = (t.spalten || []).filter((s) => s.fk && s.fk.tabelle && andere.has(klein(s.fk.tabelle))).map((s) => s.name);
    const nullTest = fks.length ? fks.map((s) => `${q(s)} IS NULL`).join(' OR ') : '0';
    const e = await fuehreAus(`SELECT ${pk.map(q).join(', ')}, (${nullTest}) FROM ${q(t.tabelle)} ORDER BY _rowid_ LIMIT ${anzahl}`);
    if (!e || !Array.isArray(e.zeilen)) return { name: t.tabelle, limit: anzahl };
    const wert = (z) => (pk.length === 1 ? z[0] : z.slice(0, pk.length));
    const zeilen = e.zeilen.map(wert);
    if (fks.length && anzahl >= 2 && zeilen.length === anzahl && !e.zeilen.some((z) => z[pk.length])) {
      const n = await fuehreAus(`SELECT ${pk.map(q).join(', ')} FROM ${q(t.tabelle)} WHERE ${nullTest} ORDER BY _rowid_ LIMIT 1`);
      if (n && Array.isArray(n.zeilen) && n.zeilen.length) zeilen[zeilen.length - 1] = wert(n.zeilen[0]);
    }
    if (!zeilen.length) return { name: t.tabelle, limit: anzahl };
    return { name: t.tabelle, zeilen };
  }

  // ---------- Zustand ----------
  const standardZeilen = visual.GRENZEN.standardZeilenSpurenbrett;
  const maxZeilen = visual.GRENZEN.zeilenSpurenbrett;
  const zustand = {
    auswahl: [], // [{ name, anzahl }] in Reihenfolge der Wahl
    wahl: null, // tabellen-Eingabe für visual.spurenbrett
    daten: null, // Ergebnis ohne Bedingung
    angewendet: null, // Ergebnis mit Bedingung
    lauf: 0,
    genannt: '' // in der Bedingung genannte Namen beim letzten Auslegen
  };

  function anzahlAus(wert) {
    const n = Number(wert);
    return Number.isInteger(n) && n >= 1 && n <= maxZeilen ? n : null;
  }

  let startNamen;
  if (vorgabe && Array.isArray(vorgabe.tabellen)) {
    startNamen = vorgabe.tabellen
      .map((w) => (typeof w === 'string' ? { name: w } : w || {}))
      .filter((w) => typeof w.name === 'string' && schemaVon(w.name))
      .slice(0, 3)
      .map((w) => ({ name: schemaVon(w.name).tabelle, anzahl: anzahlAus(w.limit) || standardZeilen }));
  }
  if (!startNamen || startNamen.length < 2) {
    startNamen = (await startTabellen()).map((name) => ({ name, anzahl: standardZeilen }));
  }
  zustand.auswahl = startNamen;

  // ---------- Tabellenwahl ----------
  const tabellenListe = $('sb-tabellen-liste');
  const steuer = new Map(); // klein(name) → { box, zahl }

  function baueTabellenwahl() {
    tabellenListe.replaceChildren();
    for (const t of schema) {
      const zeile = el('div', 'sb-tabelle');
      const box = el('input', 'sb-check');
      box.type = 'checkbox';
      box.id = 'sb-t-' + t.tabelle;
      const lab = el('label', 'sb-check-label');
      lab.htmlFor = box.id;
      lab.appendChild(box);
      lab.appendChild(el('span', 'sb-tabelle-name', t.tabelle));
      lab.appendChild(el('span', 'sb-tabelle-zeilen', `${zahl(t.zeilen || 0)} Zeilen`));
      const zahlFeld = el('input', 'sb-eingabe sb-zahl');
      zahlFeld.type = 'number';
      zahlFeld.min = '1';
      zahlFeld.max = String(maxZeilen);
      zahlFeld.step = '1';
      zahlFeld.inputMode = 'numeric';
      zahlFeld.id = 'sb-n-' + t.tabelle;
      zahlFeld.setAttribute('aria-label', `Zeilen aus ${t.tabelle}`);
      zahlFeld.value = String(standardZeilen);
      zeile.append(lab, zahlFeld);
      tabellenListe.appendChild(zeile);
      steuer.set(klein(t.tabelle), { box, zahl: zahlFeld });

      box.addEventListener('change', () => {
        if (box.checked) zustand.auswahl.push({ name: t.tabelle, anzahl: anzahlAus(zahlFeld.value) || standardZeilen });
        else zustand.auswahl = zustand.auswahl.filter((a) => klein(a.name) !== klein(t.tabelle));
        aktualisiereTabellenwahl();
        bedingungFeld.value = visual.vorschlag(schema, zustand.auswahl.map((a) => a.name)) || '';
        planeAuslegen(0);
      });
      zahlFeld.addEventListener('input', () => {
        const a = zustand.auswahl.find((x) => klein(x.name) === klein(t.tabelle));
        const n = anzahlAus(zahlFeld.value);
        zahlFeld.setAttribute('aria-invalid', n ? 'false' : 'true');
        if (!a) return;
        if (!n) {
          zeigeFehler(TEXT_ZEILEN);
          return;
        }
        a.anzahl = n;
        planeAuslegen(350);
      });
    }
    aktualisiereTabellenwahl();
  }

  function aktualisiereTabellenwahl() {
    const voll = zustand.auswahl.length >= 3;
    for (const t of schema) {
      const s = steuer.get(klein(t.tabelle));
      const a = zustand.auswahl.find((x) => klein(x.name) === klein(t.tabelle));
      s.box.checked = !!a;
      s.box.disabled = !a && voll;
      s.zahl.disabled = !a;
      if (a) s.zahl.value = String(a.anzahl);
    }
  }

  // ---------- Auslegen ----------
  let uhr = null;
  function planeAuslegen(ms) {
    clearTimeout(uhr);
    uhr = setTimeout(() => legeAus(), ms);
  }

  async function legeAus() {
    const lauf = ++zustand.lauf;
    zustand.angewendet = null;
    zeigeFehler('');
    ergebnisFlaeche.replaceChildren();
    knopfZurueck.hidden = true;
    const namen = zustand.auswahl.map((a) => a.name);
    $('sb-from').textContent = 'FROM ' + (namen.length ? namen.join(', ') : '…');
    if (namen.length < 2 || namen.length > 3) {
      zustand.daten = null;
      knopfAnwenden.disabled = true;
      zaehler.replaceChildren();
      listeInhalt.replaceChildren();
      brettHinweis(TEXT_ZWEI);
      return;
    }
    brett.setAttribute('aria-busy', 'true');
    const wahl = [];
    for (const a of zustand.auswahl) wahl.push(await zeilenWahl(a.name, a.anzahl, namen));
    const daten = await visual.spurenbrett({ tabellen: wahl }, fuehreAus);
    if (lauf !== zustand.lauf) return;
    brett.removeAttribute('aria-busy');
    if (daten.fehler) {
      zustand.daten = null;
      knopfAnwenden.disabled = true;
      brettHinweis(daten.fehler);
      return;
    }
    zustand.wahl = wahl;
    zustand.daten = daten;
    knopfAnwenden.disabled = false;
    await zeichneBrett();
    if (lauf !== zustand.lauf) return;
    zeigeZaehler();
    zeigeListe();
  }

  // ---------- Karteikarten ----------
  function pkWerte(t, z) {
    return t.pk.map((i) => z[i]);
  }
  function etikett(t, i) {
    const z = t.zeilen[i];
    if (!t.pk.length) return `${t.ref}, Zeile ${i + 1}`;
    return `${t.ref} ${pkWerte(t, z)
      .map((w) => (w === null ? 'NULL' : String(w)))
      .join('/')}`;
  }
  function wertKnoten(w) {
    if (w === null || w === undefined) return el('span', 'null', 'NULL');
    if (typeof w === 'number') return document.createTextNode(String(w).replace('.', ','));
    if (typeof w === 'object') return el('span', 'null', 'BLOB');
    return document.createTextNode(String(w));
  }
  function fkSpalten(name) {
    const t = schemaVon(name);
    return new Set(((t && t.spalten) || []).filter((s) => s.fk).map((s) => klein(s.name)));
  }

  /** Spalten auf der Karte: Fremdschlüssel und in der Bedingung genannte Spalten, aufgefüllt auf mindestens drei. */
  function kartenSpalten(t) {
    const fks = fkSpalten(t.name);
    const genannt = genannteNamen(bedingungFeld.value);
    const rest = t.spalten.map((s, i) => i).filter((i) => !t.pk.includes(i));
    const wichtig = new Set(rest.filter((i) => fks.has(klein(t.spalten[i])) || genannt.has(klein(t.spalten[i]))));
    for (const i of rest) {
      if (wichtig.size >= 3) break;
      wichtig.add(i);
    }
    return rest.filter((i) => wichtig.has(i));
  }

  function karte(t, k, i) {
    const z = t.zeilen[i];
    const fks = fkSpalten(t.name);
    const k0 = el('article', 'sb-karte');
    k0.dataset.tabelle = String(k);
    k0.dataset.zeile = String(i);
    k0.setAttribute('aria-label', etikett(t, i));
    k0.appendChild(el('span', 'sb-stift'));
    const kopf = el('div', 'sb-karte-kopf');
    const pkText = el('span', 'sb-pk');
    if (t.pk.length) {
      t.pk.forEach((p, n) => {
        if (n > 0) pkText.appendChild(document.createTextNode(' · '));
        pkText.appendChild(document.createTextNode(t.spalten[p] + ' '));
        pkText.appendChild(h('u', null, wertKnoten(z[p])));
      });
    } else {
      pkText.textContent = `Zeile ${i + 1}`;
    }
    kopf.appendChild(pkText);
    k0.appendChild(kopf);
    const dl = el('dl');
    for (const s of kartenSpalten(t)) {
      const fk = fks.has(klein(t.spalten[s]));
      const dt = el('dt', fk ? 'fk' : null);
      if (fk) dt.appendChild(el('span', 'fk-pfeil', '↑'));
      dt.appendChild(document.createTextNode(t.spalten[s]));
      dl.append(dt, h('dd', null, wertKnoten(z[s])));
    }
    k0.appendChild(dl);
    return k0;
  }

  const genanntSchluessel = (text) => [...genannteNamen(text)].sort().join(' ');

  let fadenSvg = null;
  let karten = []; // [tabelle][zeile] → Element

  function zeichneBrett() {
    const d = zustand.daten;
    const spalten = el('div', 'sb-spalten' + (d.tabellen.length === 3 ? ' drei' : ''));
    karten = d.tabellen.map((t, k) => {
      const stapel = el('div', 'sb-stapel');
      stapel.appendChild(el('h3', 'sb-stapel-titel', t.ref));
      const liste0 = el('div', 'sb-karten');
      const reihe = t.zeilen.map((_, i) => karte(t, k, i));
      liste0.append(...reihe);
      if (!t.zeilen.length) liste0.appendChild(el('p', 'sb-leer', 'Keine Zeilen'));
      stapel.appendChild(liste0);
      spalten.appendChild(stapel);
      return reihe;
    });
    fadenSvg = svg('svg', { 'aria-hidden': 'true', focusable: 'false' }, 'sb-faeden');
    const kinder = [fadenSvg];
    if (d.zusammengefasst) {
      fadenSvg = null;
      kinder.length = 0;
      const notiz = el('div', 'sb-zettel');
      notiz.appendChild(el('strong', null, `${zahl(d.gesamt)} Fäden`));
      notiz.appendChild(el('p', null, d.hinweis || 'Zu viele Fäden zum Zeichnen.'));
      kinder.push(notiz);
    }
    brett.replaceChildren(...kinder, spalten);
    zustand.genannt = genanntSchluessel(bedingungFeld.value);
    return new Promise((fertig) =>
      requestAnimationFrame(() => {
        zeichneFaeden(true);
        requestAnimationFrame(() => fertig());
      })
    );
  }

  function versatz(index, anzahl, hoehe) {
    if (anzahl <= 1) return 0;
    const schritt = Math.min(7, Math.max(1.5, (hoehe - 16) / (anzahl - 1)));
    return (index - (anzahl - 1) / 2) * schritt;
  }

  /** Fäden neu zeichnen (nach Auslegen, Größenänderung, Schriften); still = ohne Übergänge. */
  function zeichneFaeden(still) {
    const d = zustand.daten;
    if (!d || !fadenSvg || !fadenSvg.isConnected) return;
    fadenSvg.replaceChildren();
    if (schmal.matches) return; // Handy: Zähler + Liste statt Zeichnung
    const b = brett.getBoundingClientRect();
    const rects = karten.map((reihe) => reihe.map((k) => k.getBoundingClientRect()));
    const n = d.tabellen.map((t) => t.zeilen.length);
    const punkte = d.faeden.length <= MAX_PUNKTE;
    const rechts = (r, idx, cnt) => [r.right - b.left - 3, r.top - b.top + r.height / 2 + versatz(idx, cnt, r.height)];
    const links = (r, idx, cnt) => [r.left - b.left + 3, r.top - b.top + r.height / 2 + versatz(idx, cnt, r.height)];
    const f = (p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1);
    fadenSvg.classList.add('still');
    const frag = document.createDocumentFragment();
    for (const faden of d.faeden) {
      const g = svg('g', {}, 'sb-faden');
      g.dataset.faden = faden.join('-');
      const enden = [];
      let pfad = '';
      for (let k = 0; k + 1 < faden.length; k++) {
        const a = rechts(rects[k][faden[k]], faden[k + 1], n[k + 1]);
        const z = links(rects[k + 1][faden[k + 1]], faden[k], n[k]);
        pfad += `M${f(a)} L${f(z)} `;
        enden.push(a, z);
      }
      g.appendChild(svg('path', { d: pfad.trim() }));
      if (punkte) for (const p of enden) g.appendChild(svg('circle', { cx: p[0].toFixed(1), cy: p[1].toFixed(1), r: 2.5 }));
      frag.appendChild(g);
    }
    fadenSvg.appendChild(frag);
    setzeFadenZustand(false);
    if (still) {
      // Übergänge erst nach dem ersten Zeichnen wieder einschalten
      fadenSvg.getBoundingClientRect();
      requestAnimationFrame(() => fadenSvg && fadenSvg.classList.remove('still'));
    } else {
      fadenSvg.classList.remove('still');
    }
  }

  /** Klassen passt/faellt nach dem Stand der Bedingung; mitVerzug = kleiner Zufallsversatz beim Abfallen. */
  function setzeFadenZustand(mitVerzug) {
    const e = zustand.angewendet;
    const passend = e ? new Set((e.passend || []).map((p) => p.join('-'))) : null;
    if (fadenSvg) {
      for (const g of fadenSvg.children) {
        const passt = passend ? passend.has(g.dataset.faden) : false;
        if (mitVerzug) g.style.setProperty('--verzug', `${Math.round(Math.random() * 160)}ms`);
        g.classList.toggle('passt', !!passend && passt);
        g.classList.toggle('faellt', !!passend && !passt);
      }
    }
    const ohne = new Set(e ? (e.ohneFaden || []).map((o) => `${o.tabelle}-${o.zeile}`) : []);
    karten.forEach((reihe, k) =>
      reihe.forEach((kk, i) => {
        const weg = ohne.has(`${k}-${i}`);
        kk.classList.toggle('ohne-faden', weg);
        const alt = kk.querySelector('.sb-kein-faden');
        if (weg && !alt) kk.querySelector('.sb-karte-kopf').appendChild(el('span', 'sb-kein-faden', 'kein Faden'));
        if (!weg && alt) alt.remove();
      })
    );
  }

  // ---------- Zähler, Liste, Ergebnis ----------
  function ohneFadenText(e) {
    const d = zustand.daten;
    const namen = (e.ohneFaden || []).map((o) => etikett(d.tabellen[o.tabelle], o.zeile));
    if (!namen.length) return null;
    return `${aufzaehlung(namen)} ${namen.length === 1 ? 'hängt' : 'hängen'} an keinem Faden.`;
  }

  function zeigeZaehler() {
    const d = zustand.daten;
    const e = zustand.angewendet;
    zaehler.replaceChildren();
    if (!d) return;
    const zahlEl = el('strong', 'sb-zaehler-zahl', zahl(e ? e.bleiben : d.gesamt));
    const text = el('div', 'sb-zaehler-text');
    text.appendChild(el('p', 'sb-rechnung', e ? e.text : d.text));
    if (e) {
      const o = ohneFadenText(e);
      text.appendChild(el('p', 'sb-ohne', o || `${zahl(e.bleiben)} von ${zahl(e.gesamt)} Fäden halten.`));
    } else {
      text.appendChild(el('p', 'sb-ohne', 'Ohne Bedingung ist jede Kombination ein Faden: das Kreuzprodukt.'));
    }
    zaehler.append(zahlEl, text);
  }

  function zeigeListe() {
    const d = zustand.daten;
    const e = zustand.angewendet;
    listeInhalt.replaceChildren();
    if (!d) return;
    const eintraege = e ? e.passend || [] : d.faeden;
    const ul = el('ul', 'sb-faden-liste');
    const name = (p) => p.map((idx, k) => etikett(d.tabellen[k], idx)).join(' – ');
    eintraege.slice(0, MAX_LISTE).forEach((p) => ul.appendChild(el('li', e ? 'passt' : null, name(p))));
    let kopf;
    if (e) kopf = `${zahl(e.bleiben)} ${e.bleiben === 1 ? 'Faden hält' : 'Fäden halten'}, ${zahl(e.gesamt - e.bleiben)} ${e.gesamt - e.bleiben === 1 ? 'ist' : 'sind'} abgefallen:`;
    else if (d.zusammengefasst) kopf = d.hinweis;
    else kopf = `Jede Karte hängt an jeder Karte der anderen ${d.tabellen.length === 2 ? 'Tabelle' : 'Tabellen'}: ${d.text}.`;
    listeInhalt.appendChild(el('p', 'sb-liste-kopf', kopf));
    if (eintraege.length) listeInhalt.appendChild(ul);
    const gesamt = e ? e.bleiben : d.zusammengefasst ? 0 : d.gesamt;
    if (gesamt > MAX_LISTE) listeInhalt.appendChild(el('p', 'sb-hinweis', `Gezeigt werden ${zahl(MAX_LISTE)} von ${zahl(gesamt)}.`));
    if (e && !e.bleiben) listeInhalt.appendChild(el('p', 'sb-hinweis', 'Kein Faden hält.'));
    if (schmal.matches) liste.open = true;
  }

  function zeigeErgebnis() {
    const d = zustand.daten;
    const e = zustand.angewendet;
    ergebnisFlaeche.replaceChildren();
    if (!e) return;
    const raster = el('div', 'sb-ergebnis-raster');

    const kasten = el('section', 'karte sb-ergebnis-karte');
    kasten.setAttribute('aria-labelledby', 'sb-ergebnis-titel');
    const kopf = el('div', 'sb-ergebnis-kopf');
    const titel = el('h2', null, 'Ergebnis des Verbunds');
    titel.id = 'sb-ergebnis-titel';
    const anzahl = `${zahl(e.bleiben)} ${e.bleiben === 1 ? 'Zeile' : 'Zeilen'}` + (e.bleiben > MAX_ERGEBNIS ? `, ${zahl(MAX_ERGEBNIS)} angezeigt` : '');
    kopf.append(titel, el('span', 'sb-meta', anzahl));
    kasten.appendChild(kopf);

    const sql = `SELECT *\nFROM ${d.tabellen.map((t) => (t.alias ? `${t.name} ${t.alias}` : t.name)).join(', ')}\nWHERE ${e.bedingung}`;
    const pre = el('pre', 'sb-sql');
    pre.appendChild(sqlHervorheben(sql));
    kasten.appendChild(pre);
    kasten.appendChild(el('p', 'sb-hinweis', 'Nur die Karten auf dem Brett – nicht die ganze Tabelle.'));

    if (!e.bleiben) {
      kasten.appendChild(el('p', 'sb-leer', 'Keine Zeile erfüllt die Bedingung.'));
    } else {
      const huelle = el('div', 'tabelle-rahmen');
      huelle.tabIndex = 0;
      huelle.setAttribute('role', 'region');
      huelle.setAttribute('aria-label', 'Ergebnis des Verbunds');
      const tabelle = el('table', 'daten');
      const tr = el('tr');
      d.tabellen.forEach((t) => {
        const fks = fkSpalten(t.name);
        t.spalten.forEach((s, i) => {
          const th = el('th');
          th.scope = 'col';
          if (fks.has(klein(s))) th.appendChild(el('span', 'fk-pfeil', '↑'));
          th.appendChild(t.pk.includes(i) ? el('span', 'pk', `${t.ref}.${s}`) : document.createTextNode(`${t.ref}.${s}`));
          tr.appendChild(th);
        });
      });
      const tbody = el('tbody');
      (e.passend || []).slice(0, MAX_ERGEBNIS).forEach((p) => {
        const zeile = el('tr');
        p.forEach((idx, k) =>
          d.tabellen[k].zeilen[idx].forEach((w) => {
            const td = el('td', typeof w === 'number' ? 'zahl' : null);
            td.appendChild(wertKnoten(w));
            zeile.appendChild(td);
          })
        );
        tbody.appendChild(zeile);
      });
      tabelle.append(h('thead', null, tr), tbody);
      huelle.appendChild(tabelle);
      kasten.appendChild(huelle);
    }
    raster.appendChild(kasten);
    raster.appendChild(notiz(e));
    ergebnisFlaeche.appendChild(raster);
  }

  /** Ermittler-Notiz: NULL-Fremdschlüssel und Karten ohne Partner beim Namen nennen. */
  function notiz(e) {
    const d = zustand.daten;
    const box = el('aside', 'notiz');
    box.appendChild(icon('i-notiz'));
    box.appendChild(el('div', 'notiz-titel', 'Ermittler-Notiz'));
    const inhalt = el('div', 'notiz-inhalt');
    const genannt = genannteNamen(e.bedingung);
    const mitNull = new Map(); // Spalte → [Etikett]
    const ohnePartner = [];
    for (const o of e.ohneFaden || []) {
      const t = d.tabellen[o.tabelle];
      const z = t.zeilen[o.zeile];
      const s = t.spalten.find((sp, i) => z[i] === null && genannt.has(klein(sp)));
      if (s) {
        const schluessel = `${t.ref}.${s}`;
        if (!mitNull.has(schluessel)) mitNull.set(schluessel, []);
        mitNull.get(schluessel).push(etikett(t, o.zeile));
      } else {
        ohnePartner.push(etikett(t, o.zeile));
      }
    }
    for (const [spalte, namen] of mitNull) {
      const p = el('p');
      p.append(
        `${aufzaehlung(namen)}: ${spalte.split('.')[1]} ist `,
        el('span', 'null', 'NULL'),
        `. NULL ist nie gleich einem Wert – deshalb hält keiner ${namen.length === 1 ? 'seiner' : 'ihrer'} Fäden, und ${
          namen.length === 1 ? 'dieser Datensatz fehlt' : 'diese Datensätze fehlen'
        } im Ergebnis.`
      );
      inhalt.appendChild(p);
    }
    if (ohnePartner.length) {
      inhalt.appendChild(
        el('p', null, `${aufzaehlung(ohnePartner)}: Keine Karte auf dem Brett passt dazu, darum ${ohnePartner.length === 1 ? 'fehlt dieser Datensatz' : 'fehlen diese Datensätze'} im Ergebnis.`)
      );
    }
    if (!mitNull.size && !ohnePartner.length && e.bleiben <= visual.GRENZEN.faeden) {
      inhalt.appendChild(el('p', null, 'Jede Karte hängt an mindestens einem Faden.'));
    }
    inhalt.appendChild(el('p', null, 'Merke: Der Verbund behält nur die Fäden, für die die Bedingung wahr ist. Ein Vergleich mit NULL ist nie wahr – dafür gibt es IS NULL.'));
    box.appendChild(inhalt);
    return box;
  }

  // ---------- Bedingung anwenden ----------
  let fallUhr = null;
  async function wendeAn() {
    if (!zustand.daten || knopfAnwenden.disabled) return;
    const bedingung = bedingungFeld.value.trim();
    if (!bedingung) {
      zeigeFehler(TEXT_LEER);
      bedingungFeld.focus();
      return;
    }
    const lauf = zustand.lauf;
    knopfAnwenden.disabled = true;
    const e = await visual.spurenbrett({ tabellen: zustand.wahl, bedingung }, fuehreAus);
    knopfAnwenden.disabled = false;
    if (lauf !== zustand.lauf) return;
    if (e.fehler) {
      zeigeFehler(e.fehler);
      bedingungFeld.setAttribute('aria-invalid', 'true');
      return;
    }
    bedingungFeld.setAttribute('aria-invalid', 'false');
    zeigeFehler('');
    // Nennt die Bedingung Spalten, die die Karten noch nicht zeigen: Karten neu auslegen, erst dann fallen lassen
    if (genanntSchluessel(bedingung) !== zustand.genannt) {
      zustand.angewendet = null;
      await zeichneBrett();
      if (lauf !== zustand.lauf) return;
    }
    zustand.angewendet = e;
    setzeFadenZustand(true);
    brett.classList.add('angewendet');
    clearTimeout(fallUhr);
    fallUhr = setTimeout(() => brett.classList.add('gefallen'), FALL_MS);
    knopfZurueck.hidden = false;
    zeigeZaehler();
    zeigeListe();
    zeigeErgebnis();
  }

  function setzeZurueck() {
    zustand.angewendet = null;
    clearTimeout(fallUhr);
    brett.classList.remove('angewendet', 'gefallen');
    setzeFadenZustand(false);
    knopfZurueck.hidden = true;
    ergebnisFlaeche.replaceChildren();
    zeigeFehler('');
    zeigeZaehler();
    zeigeListe();
    knopfAnwenden.focus();
  }

  knopfAnwenden.addEventListener('click', wendeAn);
  knopfZurueck.addEventListener('click', setzeZurueck);
  bedingungFeld.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) {
      ev.preventDefault();
      wendeAn();
    }
  });
  bedingungFeld.addEventListener('input', () => bedingungFeld.removeAttribute('aria-invalid'));

  // Größenänderung, Schriften, Handy ↔ breit: Fäden neu zeichnen (ohne Animation)
  let rahmen = 0;
  const neu = () => {
    cancelAnimationFrame(rahmen);
    rahmen = requestAnimationFrame(() => zeichneFaeden(true));
  };
  new ResizeObserver(neu).observe(brett);
  schmal.addEventListener('change', () => {
    if (schmal.matches) liste.open = true;
    neu();
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(neu);

  // ---------- Los ----------
  baueTabellenwahl();
  bedingungFeld.value =
    vorgabe && typeof vorgabe.bedingung === 'string' && vorgabe.bedingung.trim()
      ? vorgabe.bedingung
      : visual.vorschlag(schema, zustand.auswahl.map((a) => a.name)) || '';
  if (schmal.matches) liste.open = true;
  await legeAus();
}

start();
