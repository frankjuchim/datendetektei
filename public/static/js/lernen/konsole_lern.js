// Ermittlungskonsole für Aufgaben (DESIGN.md §4.10, §5.3, §5.9): baut die Konsole aus Phase 2 (Editor, Schema-Browser,
// Ergebnis, Ausführer im Web Worker mit Server-Fallback) als Baustein auf. In Ermittlungen mit den Knöpfen
// Ausführen · Prüfen · Zeitlupe · Tipp · Lösung (Diagnosen verlinken in die Verstehenshilfen), im Verhör nur der
// Editor (kein Ausführen, kein Prüfen, keine Werkzeuge – Abimodus streng). Der Entwurf liegt nur im localStorage dieses Geräts.

const V = new URL(import.meta.url).search;
const [R, { erzeugeEditor }, { zeigeSchema, zeigeSchemaFehler }, ergebnis, { erzeugeAusfuehrer }, W] = await Promise.all([
  import('../kern/render.js' + V),
  import('../konsole/editor.js' + V),
  import('../konsole/schema.js' + V),
  import('../konsole/ergebnis.js' + V),
  import('../konsole/ausfuehren.js' + V),
  import('../konsole/werkzeuge.js' + V)
]);
const { el, h, knopf } = R;

const TEXT_SERVER = 'Die Abfrage konnte gerade nicht ausgeführt werden. Versuch es gleich noch einmal.';
const TEXT_ZU_VIELE = 'Du hast in kurzer Zeit sehr viele Abfragen geschickt. Warte einen Moment und versuch es dann noch einmal.';
const WORKER_TEXTE = { 'Bitte nur eine Abfrage auf einmal.': 'MEHRERE_ANWEISUNGEN', 'Keine Abfrage gefunden.': 'LEER' };

let zaehler = 0;

function lies(schluessel) {
  try {
    return window.localStorage.getItem(schluessel);
  } catch {
    return null;
  }
}
function schreib(schluessel, wert) {
  try {
    window.localStorage.setItem(schluessel, wert);
  } catch {
    /* privater Modus */
  }
}

function deutsch(fehler) {
  const f = window.DD_SQL_FEHLERTEXTE;
  const text = String(fehler || '');
  if (WORKER_TEXTE[text]) return f ? f.uebersetze(WORKER_TEXTE[text]) : text;
  if (!f) return text;
  const { code, text: uebersetzt } = f.ordneZu(text);
  if (code === 'ALLGEMEIN' && /[äöüß]|Datenbank|Abfrage/.test(text)) return text;
  return uebersetzt;
}

/** Parser- und Regel-Hinweise für die Randmarken (abimodus hinweis bzw. streng). */
function pruefeLokal(sql, schema, abimodus) {
  const parser = window.DD_SQL_PARSER;
  const regeln = window.DD_SQL_REGELN;
  if (!parser || !regeln || !sql.trim()) return [];
  try {
    const { ast, fehler } = parser.parse(sql);
    if (fehler && fehler.length) return fehler.map((f) => ({ code: f.code, falle: null, art: 'fehler', text: f.text, zeile: f.zeile, spalte: f.spalte }));
    return regeln.pruefeRegeln(ast, { schema: schema || undefined, abimodus: abimodus === 'streng' ? 'hinweis' : abimodus || 'hinweis' });
  } catch {
    return [];
  }
}

/**
 * @param {object} opt
 *   datenbank        Name der öffentlichen Übungs-DB (Ermittlung) oder null (Verhör: kein Schema, kein Ausführen)
 *   dbTitel          Anzeige im Chip („Fundbüro“)
 *   entwurf          localStorage-Schlüssel des Entwurfs (oder null)
 *   abimodus         'hinweis' | 'streng' | 'aus' (Randmarken)
 *   aktionen         { pruefen, tipp, loesung } – Rückrufe (Ermittlung) oder null (Verhör)
 *   beiAenderung(sql)
 *   ruecksprung      Pfad für „Zurück“ aus der Zeitlupe (Standard: die aktuelle Seite ohne Parameter)
 * → { el, wert(), setzeWert(t), fokus(), knoepfe, setzeTippText(t), sperren(an), zeigeHinweis(text) }
 */
export function erzeugeLernKonsole({ datenbank = null, dbTitel = '', entwurf = null, abimodus = 'hinweis', aktionen = null, beiAenderung = null, ruecksprung = null } = {}) {
  const nr = ++zaehler;
  const mitAusfuehren = !!datenbank;
  const textarea = el('textarea');
  textarea.id = `sql-eingabe-${nr}`;
  textarea.rows = 8;
  textarea.wrap = 'off';
  textarea.spellcheck = false;
  textarea.setAttribute('autocapitalize', 'off');
  textarea.setAttribute('autocomplete', 'off');
  textarea.setAttribute('autocorrect', 'off');
  textarea.setAttribute('aria-describedby', `editor-tasten-${nr} editor-hinweise-${nr}`);
  const overlay = el('pre', 'editor-hl');
  overlay.setAttribute('aria-hidden', 'true');
  const zeilen = el('div', 'editor-zeilen');
  const hinweisListe = el('div', 'nur-sr');
  hinweisListe.id = `editor-hinweise-${nr}`;
  hinweisListe.setAttribute('aria-live', 'polite');
  const label = el('label', 'nur-sr', 'SQL-Abfrage');
  label.htmlFor = textarea.id;
  const editorEl = h('div', 'editor', zeilen, h('div', 'editor-flaeche', overlay, label, textarea));

  const titel = el('h2', 'konsole-titel');
  titel.appendChild(el('span', 'led'));
  titel.lastChild.setAttribute('aria-hidden', 'true');
  titel.appendChild(document.createTextNode(mitAusfuehren ? 'Ermittlungskonsole' : 'Antwortfeld'));
  const chip = el('span', 'konsole-db', mitAusfuehren ? `DB: ${dbTitel || datenbank} · Übungs-DB` : 'Abimodus streng · ohne Ausführen');
  const kopf = h('div', 'konsole-kopf', titel, chip);

  const koerper = el('div', 'konsole-koerper' + (mitAusfuehren ? '' : ' ohne-schema'));
  koerper.appendChild(editorEl);
  const schemaListe = el('div');
  if (mitAusfuehren) {
    const sb = el('div', 'schema-browser');
    sb.setAttribute('role', 'region');
    sb.setAttribute('aria-label', 'Schema');
    sb.append(el('h3', 'etikett', 'Schema'), el('p', 'schema-tipp', 'Tippe auf eine Spalte, um sie einzufügen.'), schemaListe);
    schemaListe.appendChild(el('p', 'schema-laedt', 'Schema wird geladen …'));
    koerper.appendChild(sb);
  }
  const tasten = el('p', 'nur-sr', mitAusfuehren ? 'Strg oder Cmd und Enter führt die Abfrage aus. Tab rückt um zwei Leerzeichen ein; Escape und danach Tab verlässt das Eingabefeld.' : 'Tab rückt um zwei Leerzeichen ein; Escape und danach Tab verlässt das Eingabefeld.');
  tasten.id = `editor-tasten-${nr}`;

  const box = el('section', 'konsole lern-konsole');
  box.setAttribute('aria-label', mitAusfuehren ? 'Ermittlungskonsole' : 'Antwortfeld für SQL');
  box.append(kopf, koerper, tasten, hinweisListe);

  const knoepfe = {};
  let ergebnisFlaeche = null;
  let modusAnzeige = null;
  if (mitAusfuehren || aktionen) {
    const leiste = el('div', 'konsole-knoepfe');
    if (mitAusfuehren) {
      knoepfe.ausfuehren = knopf('Ausführen', 'knopf primaer', 'i-play');
      const taste = el('kbd', 'taste', /Mac|iPhone|iPad/.test(navigator.platform || '') ? '⌘ ↵' : 'Strg ↵');
      knoepfe.ausfuehren.appendChild(taste);
      knoepfe.ausfuehren.setAttribute('aria-keyshortcuts', 'Control+Enter Meta+Enter');
      knoepfe.abbrechen = knopf('Abbrechen', 'knopf leise', 'i-stopp');
      knoepfe.abbrechen.hidden = true;
      leiste.append(knoepfe.ausfuehren, knoepfe.abbrechen);
    }
    if (aktionen) {
      knoepfe.pruefen = knopf('Prüfen', 'knopf pruefen', 'i-pruefen');
      leiste.appendChild(knoepfe.pruefen);
      leiste.appendChild(el('span', 'trenner'));
      // Zeitlupe nur mit ausführbarer Übungs-DB (Ermittlung) – das Verhör hat keine DB und damit keinen Knopf.
      if (mitAusfuehren && aktionen) {
        knoepfe.zeitlupe = knopf('Zeitlupe', 'knopf', 'i-zeitlupe');
        leiste.appendChild(knoepfe.zeitlupe);
        knoepfe.zeitlupe.addEventListener('click', () => oeffneZeitlupe());
      }
      knoepfe.tipp = knopf('Tipp', 'knopf', 'i-tipp');
      knoepfe.loesung = knopf('Lösung', 'knopf', 'i-auge');
      leiste.append(knoepfe.tipp, knoepfe.loesung);
      knoepfe.pruefen.addEventListener('click', () => aktionen.pruefen && aktionen.pruefen());
      knoepfe.tipp.addEventListener('click', () => aktionen.tipp && aktionen.tipp());
      knoepfe.loesung.addEventListener('click', () => aktionen.loesung && aktionen.loesung());
    }
    box.appendChild(leiste);
    if (mitAusfuehren) {
      modusAnzeige = el('p', 'konsole-modus', 'Konsole wird vorbereitet …');
      ergebnisFlaeche = el('div', 'ergebnis');
      ergebnisFlaeche.setAttribute('aria-live', 'polite');
      ergebnisFlaeche.appendChild(el('p', 'ergebnis-leer', ergebnis.TEXT_LEER));
      const fuss = h('div', 'konsole-fuss', modusAnzeige);
      box.append(ergebnisFlaeche, fuss);
    }
  }

  let schema = null;
  let laeuft = null;
  const editor = erzeugeEditor({
    textarea,
    overlay,
    zeilen,
    hinweisListe,
    beiAusfuehren: () => (mitAusfuehren ? ausfuehren() : null),
    beiAenderung: (sql) => {
      if (entwurf) schreib(entwurf, sql);
      aktualisiereHinweise();
      if (beiAenderung) beiAenderung(sql);
    }
  });
  function aktualisiereHinweise() {
    const hinweise = abimodus === 'aus' ? [] : pruefeLokal(editor.wert(), schema, abimodus);
    editor.setzeMarken(hinweise);
    return hinweise;
  }
  const gemerkt = entwurf ? lies(entwurf) : null;
  if (gemerkt !== null) editor.setzeWert(gemerkt);
  aktualisiereHinweise();

  let ausfuehrer = null;
  let modus = 'browser';
  let modusBestimmt = Promise.resolve();
  if (mitAusfuehren) {
    fetch(`/api/db/${encodeURIComponent(datenbank)}/schema`, { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Schema'))))
      .then((daten) => {
        schema = daten;
        zeigeSchema(schemaListe, schema, { beiSpalte: (text) => editor.fuegeEin(text) });
        aktualisiereHinweise();
      })
      .catch(() => zeigeSchemaFehler(schemaListe, 'Das Schema konnte nicht geladen werden. Lade die Seite neu.'));

    ausfuehrer = erzeugeAusfuehrer({ dbUrl: `/db/${encodeURIComponent(datenbank)}.sqlite` });
    modusBestimmt = ausfuehrer.bereit.then(
      () => {
        modus = 'browser';
        modusAnzeige.textContent = 'Ausführen läuft im Browser · geprüft wird auf dem Server';
      },
      () => {
        modus = 'server';
        modusAnzeige.textContent = 'Ausführen läuft auf dem Server';
      }
    );
    knoepfe.ausfuehren.addEventListener('click', () => ausfuehren());
    knoepfe.abbrechen.addEventListener('click', () => laeuft && laeuft.abbrechen());
  }

  /** Öffnet die Zeitlupe mit der aktuellen Abfrage (sessionStorage 'dd_zeitlupe', nie über die URL). */
  function oeffneZeitlupe() {
    if (!mitAusfuehren) return;
    if (entwurf) schreib(entwurf, editor.wert()); // Entwurf sofort sichern (Rücksprung)
    W.oeffneWerkzeug('zeitlupe', { db: datenbank, sql: editor.wert(), zurueck: ruecksprung || window.location.pathname });
  }

  /**
   * Links aus einer Diagnose in die Verstehenshilfen – nur mit Übungs-DB (Ermittlung), nie im Verhör. Übergeben wird
   * die Abfrage, zu der die Diagnose gehört (die eigene Abfrage, nie die Musterlösung).
   */
  function werkzeugZusatz(sql) {
    if (!mitAusfuehren) return null;
    const gezeigt = new Set(); // je Werkzeug nur ein Knopf (KEIN_VERBUND und KREUZPRODUKT kommen oft zusammen)
    return (d) =>
      W.linkLeiste(
        W.werkzeugLinks(d, {
          db: datenbank,
          sql,
          schema,
          zurueck: ruecksprung || window.location.pathname,
          vorher: () => entwurf && schreib(entwurf, editor.wert())
        }).filter((l) => !gezeigt.has(l.werkzeug) && gezeigt.add(l.werkzeug))
      );
  }

  async function aufDemServer(sql, signal) {
    let antwort;
    try {
      antwort = await fetch('/api/sql/ausfuehren', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ db: datenbank, sql }),
        signal
      });
    } catch {
      if (signal.aborted) return { fehler: 'Abfrage abgebrochen.', abgebrochen: true };
      return { fehler: TEXT_SERVER, deutsch: true };
    }
    let daten = null;
    try {
      daten = await antwort.json();
    } catch {
      daten = null;
    }
    if (antwort.status === 429) return { fehler: TEXT_ZU_VIELE, deutsch: true };
    if (daten && typeof daten.fehler === 'string') return { fehler: daten.fehler, deutsch: true };
    if (!antwort.ok || !daten || !Array.isArray(daten.spalten)) return { fehler: TEXT_SERVER, deutsch: true };
    return daten;
  }

  async function ausfuehren() {
    if (laeuft || !mitAusfuehren) return;
    const sql = editor.wert();
    const aktuelle = aktualisiereHinweise();
    if (!sql.trim()) {
      ergebnis.zeigeFehler(ergebnisFlaeche, deutsch('Keine Abfrage gefunden.'));
      return;
    }
    const kontrolle = new AbortController();
    laeuft = { abbrechen: () => (modus === 'browser' ? ausfuehrer.abbrechen() : kontrolle.abort()) };
    knoepfe.abbrechen.hidden = false;
    knoepfe.ausfuehren.disabled = true;
    ergebnis.zeigeLaeuft(ergebnisFlaeche);
    let antwort;
    let quelle;
    try {
      await modusBestimmt;
      quelle = modus;
      antwort = modus === 'browser' ? await ausfuehrer.fuehreAus(sql) : await aufDemServer(sql, kontrolle.signal);
    } catch {
      antwort = { fehler: TEXT_SERVER, deutsch: true };
    } finally {
      laeuft = null;
      knoepfe.abbrechen.hidden = true;
      knoepfe.ausfuehren.disabled = false;
    }
    if (antwort && typeof antwort.fehler === 'string') {
      const text = antwort.abgebrochen || antwort.deutsch ? antwort.fehler : deutsch(antwort.fehler);
      ergebnis.zeigeFehler(ergebnisFlaeche, text, { art: antwort.abgebrochen ? 'hinweis' : 'fehler', hinweise: aktuelle, zusatz: werkzeugZusatz(sql) });
      return;
    }
    ergebnis.zeigeErgebnis(ergebnisFlaeche, antwort, { quelle, hinweise: aktuelle, zusatz: werkzeugZusatz(sql) });
  }

  return {
    el: box,
    wert: () => editor.wert(),
    setzeWert(t) {
      editor.setzeWert(t);
      if (entwurf) schreib(entwurf, String(t));
      aktualisiereHinweise();
    },
    fokus: () => editor.fokus(),
    knoepfe,
    /**
     * Diagnose des Server-Prüfers im Ergebnisbereich zeigen (dunkle Diagnose, ohne Lösungsdaten). sql = die geprüfte
     * Abfrage (Standard: der Editor-Inhalt) für die Links in die Verstehenshilfen.
     */
    zeigeDiagnose(diagnose, kopfText, sql = editor.wert()) {
      if (!ergebnisFlaeche) return;
      const zusatz = werkzeugZusatz(sql);
      const frag = document.createDocumentFragment();
      if (kopfText) frag.appendChild(h('div', 'ergebnis-kopf', h('p', null, el('strong', null, kopfText)), el('p', null, 'Geprüft auf dem Server')));
      if (Array.isArray(diagnose) && diagnose.length) {
        const d = el('div', 'diagnose' + (diagnose.every((x) => x.art === 'hinweis') ? ' hinweis' : ''));
        d.setAttribute('role', 'note');
        for (const x of diagnose) {
          const z = el('p', 'diagnose-zeile');
          if (x.falle) z.appendChild(R.falle(x.falle, { hell: false }));
          const t = el('span', 'diagnose-text');
          if (x.zeile) t.appendChild(el('span', 'diagnose-ort', `Zeile ${x.zeile}: `));
          t.appendChild(R.mitCode(x.text));
          z.appendChild(t);
          d.appendChild(z);
          const links = zusatz ? zusatz(x) : null;
          if (links) d.appendChild(links);
        }
        frag.appendChild(d);
      }
      ergebnisFlaeche.replaceChildren(frag);
    },
    sperren(an) {
      textarea.readOnly = !!an;
    }
  };
}
