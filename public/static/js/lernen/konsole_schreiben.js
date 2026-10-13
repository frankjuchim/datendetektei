// Kür-Sandbox (Schreib-Konsole, Plan Phase 6 Task 7; Spec §3.3): Editor wie die Ermittlungskonsole, aber für Skripte
// mit mehreren Anweisungen (CREATE TABLE, INSERT, SELECT …). Ausführen läuft immer auf dem Server
// (POST …/aufgaben/:id/skript) in einer frischen In-Memory-Datenbank je Ausführen – leer oder mit dem Startschema
// der Aufgabe; nichts wird gespeichert. Das Skript liegt nur im localStorage dieses Geräts. Hinweisband
// „KÜR – nicht im Abitur“; keine Randmarken des Abitur-Parsers (Abimodus aus), aber der Hinweis auf FROM … WHERE.
// Ausgaben nur als Textknoten.

const V = new URL(import.meta.url).search;
const [A, R, { erzeugeEditor }, { zeigeSchema }, ergebnis] = await Promise.all([
  import('../kern/api.js' + V),
  import('../kern/render.js' + V),
  import('../konsole/editor.js' + V),
  import('../konsole/schema.js' + V),
  import('../konsole/ergebnis.js' + V)
]);
const { el, h, knopf } = R;

const TEXT_LEER = 'Noch nichts ausgeführt. Schreib dein Skript – Anweisungen mit ; trennen – und tippe auf „Ausführen“.';
const TEXT_SERVER = 'Das Skript konnte gerade nicht ausgeführt werden. Versuch es gleich noch einmal.';
const ART_TEXT = {
  'CREATE TABLE': 'Tabelle angelegt',
  'DROP TABLE': 'Tabelle gelöscht',
  'ALTER TABLE': 'Tabelle geändert',
  'CREATE INDEX': 'Index angelegt',
  SELECT: 'Abfrage',
  WITH: 'Abfrage'
};

let zaehler = 0;

function protokollText(p) {
  if (p.art === 'INSERT') return A.mehrzahl(p.aenderungen || 0, 'Datensatz eingefügt', 'Datensätze eingefügt');
  if (p.art === 'UPDATE') return A.mehrzahl(p.aenderungen || 0, 'Datensatz geändert', 'Datensätze geändert');
  if (p.art === 'DELETE') return A.mehrzahl(p.aenderungen || 0, 'Datensatz gelöscht', 'Datensätze gelöscht');
  return ART_TEXT[p.art] || 'ausgeführt';
}

function protokollListe(protokoll, fehlerNr = null) {
  const ol = el('ol', 'skript-protokoll');
  ol.setAttribute('aria-label', 'Protokoll der Anweisungen');
  for (const p of protokoll) {
    const li = el('li', 'ok');
    li.append(el('span', 'protokoll-nr mono', String(p.nr)), el('span', 'protokoll-art mono', p.art || '–'), el('span', 'protokoll-text', protokollText(p)));
    li.appendChild(el('span', 'protokoll-zeile mono', `Zeile ${p.zeile}`));
    ol.appendChild(li);
  }
  if (fehlerNr) {
    const li = el('li', 'fehler');
    li.append(el('span', 'protokoll-nr mono', String(fehlerNr)), el('span', 'protokoll-text', 'abgebrochen – siehe Meldung'));
    ol.appendChild(li);
  }
  return ol;
}

/**
 * @param {object} opt
 *   kursId, aufgabeId   für POST /api/kurse/:kurs/aufgaben/:id/skript
 *   startTitel          Anzeige („leere Datenbank“, „Detektei-light …“)
 *   entwurf             localStorage-Schlüssel des Skripts (oder null)
 *   aktionen            { pruefen, tipp, loesung }
 *   beiAenderung(skript)
 * → { el, wert(), setzeWert(t), fokus(), knoepfe, zeigeDiagnose(diagnose, kopf), zeigePruefung(rueckmeldung), sperren(an) }
 */
export function erzeugeSchreibKonsole({ kursId, aufgabeId, startTitel = 'leere Datenbank', entwurf = null, aktionen = null, beiAenderung = null } = {}) {
  const nr = ++zaehler;
  const textarea = el('textarea');
  textarea.id = `skript-eingabe-${nr}`;
  textarea.rows = 12;
  textarea.wrap = 'off';
  textarea.spellcheck = false;
  textarea.setAttribute('autocapitalize', 'off');
  textarea.setAttribute('autocomplete', 'off');
  textarea.setAttribute('autocorrect', 'off');
  textarea.setAttribute('aria-describedby', `skript-tasten-${nr} skript-band-${nr}`);
  const overlay = el('pre', 'editor-hl');
  overlay.setAttribute('aria-hidden', 'true');
  const zeilen = el('div', 'editor-zeilen');
  const hinweisListe = el('div', 'nur-sr');
  hinweisListe.setAttribute('aria-live', 'polite');
  const label = el('label', 'nur-sr', 'SQL-Skript (Kür)');
  label.htmlFor = textarea.id;
  const editorEl = h('div', 'editor', zeilen, h('div', 'editor-flaeche', overlay, label, textarea));

  const titel = el('h2', 'konsole-titel');
  titel.appendChild(el('span', 'led'));
  titel.lastChild.setAttribute('aria-hidden', 'true');
  titel.appendChild(document.createTextNode('Kür-Sandbox'));
  const chip = el('span', 'konsole-db', `Start: ${startTitel} · frisch bei jedem Ausführen`);
  const kopf = h('div', 'konsole-kopf', titel, chip);

  const band = el('div', 'kuer-band');
  band.id = `skript-band-${nr}`;
  band.setAttribute('role', 'note');
  band.append(
    R.stempel('KÜR – nicht im Abitur', 'kuer', { groesse: 'klein' }),
    el('span', 'kuer-band-text', 'Schreibmodus: CREATE TABLE, INSERT, UPDATE, DELETE, SELECT – Anweisungen mit ; trennen. Im Abitur schreibst du den Verbund mit FROM … WHERE.')
  );

  const schemaListe = el('div');
  schemaListe.appendChild(el('p', 'schema-laedt', 'Startschema wird geladen …'));
  const sb = el('div', 'schema-browser');
  sb.setAttribute('role', 'region');
  sb.setAttribute('aria-label', 'Schema der Sandbox');
  const schemaTipp = el('p', 'schema-tipp', 'Startschema der Aufgabe.');
  sb.append(el('h3', 'etikett', 'Schema'), schemaTipp, schemaListe);
  const koerper = h('div', 'konsole-koerper', editorEl, sb);

  const tasten = el('p', 'nur-sr', 'Strg oder Cmd und Enter führt das Skript aus. Tab rückt um zwei Leerzeichen ein; Escape und danach Tab verlässt das Eingabefeld.');
  tasten.id = `skript-tasten-${nr}`;

  const box = el('section', 'konsole lern-konsole schreib-konsole');
  box.setAttribute('aria-label', 'Kür-Sandbox (Schreibmodus)');
  box.append(kopf, band, koerper, tasten, hinweisListe);

  const knoepfe = {};
  const leiste = el('div', 'konsole-knoepfe');
  knoepfe.ausfuehren = knopf('Ausführen', 'knopf primaer', 'i-play');
  const taste = el('kbd', 'taste', /Mac|iPhone|iPad/.test(navigator.platform || '') ? '⌘ ↵' : 'Strg ↵');
  knoepfe.ausfuehren.appendChild(taste);
  knoepfe.ausfuehren.setAttribute('aria-keyshortcuts', 'Control+Enter Meta+Enter');
  knoepfe.ausfuehren.id = `k-skript-ausfuehren-${nr}`;
  knoepfe.abbrechen = knopf('Abbrechen', 'knopf leise', 'i-stopp');
  knoepfe.abbrechen.hidden = true;
  leiste.append(knoepfe.ausfuehren, knoepfe.abbrechen);
  if (aktionen) {
    knoepfe.pruefen = knopf('Prüfen', 'knopf pruefen', 'i-pruefen');
    knoepfe.tipp = knopf('Tipp', 'knopf', 'i-tipp');
    knoepfe.loesung = knopf('Lösung', 'knopf', 'i-auge');
    leiste.append(knoepfe.pruefen, el('span', 'trenner'), knoepfe.tipp, knoepfe.loesung);
    knoepfe.pruefen.addEventListener('click', () => aktionen.pruefen && aktionen.pruefen());
    knoepfe.tipp.addEventListener('click', () => aktionen.tipp && aktionen.tipp());
    knoepfe.loesung.addEventListener('click', () => aktionen.loesung && aktionen.loesung());
  }
  box.appendChild(leiste);
  const flaeche = el('div', 'ergebnis');
  flaeche.setAttribute('aria-live', 'polite');
  flaeche.appendChild(el('p', 'ergebnis-leer', TEXT_LEER));
  const modus = el('p', 'konsole-modus', 'Ausführen läuft auf dem Server in deiner eigenen Sandbox · nichts wird gespeichert');
  box.append(flaeche, h('div', 'konsole-fuss', modus));

  let gelaufen = null; // Skript des letzten Ausführens/Prüfens: Randmarken bleiben, bis sich der Text ändert
  const editor = erzeugeEditor({
    textarea,
    overlay,
    zeilen,
    hinweisListe,
    beiAusfuehren: () => ausfuehren(),
    beiAenderung: (skript) => {
      if (entwurf) A.schreib(entwurf, skript);
      if (skript !== gelaufen) editor.setzeMarken([]);
      if (beiAenderung) beiAenderung(skript);
    }
  });
  const gemerkt = entwurf ? A.lies(entwurf) : null;
  if (gemerkt !== null) editor.setzeWert(gemerkt);

  const pfad = A.kursApi(kursId, `/aufgaben/${encodeURIComponent(aufgabeId)}/skript`);
  let laeuft = null;

  function zeigeTabellen(tabellen) {
    if (!Array.isArray(tabellen) || !tabellen.length) {
      schemaListe.replaceChildren(el('p', 'schema-laedt', 'Noch keine Tabelle – leg eine mit CREATE TABLE an.'));
      return;
    }
    zeigeSchema(schemaListe, tabellen, { beiSpalte: (text) => editor.fuegeEin(text) });
  }

  async function senden(skript, signal) {
    let antwort;
    try {
      antwort = await fetch(pfad, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ skript }),
        signal
      });
    } catch {
      if (signal && signal.aborted) return { ok: false, fehler: 'Ausführen abgebrochen.', abgebrochen: true };
      return { ok: false, fehler: TEXT_SERVER };
    }
    let daten = null;
    try {
      daten = await antwort.json();
    } catch {
      daten = null;
    }
    if (antwort.status === 401) return { ok: false, fehler: 'Du bist nicht mehr angemeldet. Melde dich über das Portal neu an.' };
    if (antwort.status === 429) return { ok: false, fehler: 'Du hast in kurzer Zeit sehr oft ausgeführt. Warte einen Moment und versuch es dann noch einmal.' };
    if (daten && typeof daten.fehler === 'string') return daten;
    if (!antwort.ok || !daten) return { ok: false, fehler: (daten && daten.error) || TEXT_SERVER };
    return daten;
  }

  // Startschema laden (leeres Skript → nur das Schema der Startdatenbank)
  senden('').then((d) => (d && d.ok ? zeigeTabellen(d.tabellen) : schemaListe.replaceChildren(el('p', 'schema-laedt', 'Das Startschema konnte nicht geladen werden.'))));

  async function ausfuehren() {
    if (laeuft) return;
    const skript = editor.wert();
    if (!skript.trim()) {
      ergebnis.zeigeFehler(flaeche, 'Dein Skript ist leer. Schreib zum Beispiel ein CREATE TABLE.');
      return;
    }
    if (entwurf) A.schreib(entwurf, skript);
    gelaufen = skript;
    const kontrolle = new AbortController();
    laeuft = kontrolle;
    knoepfe.abbrechen.hidden = false;
    knoepfe.ausfuehren.disabled = true;
    ergebnis.zeigeLaeuft(flaeche);
    let d;
    try {
      d = await senden(skript, kontrolle.signal);
    } finally {
      laeuft = null;
      knoepfe.abbrechen.hidden = true;
      knoepfe.ausfuehren.disabled = false;
    }
    if (!d.ok) {
      const frag = document.createDocumentFragment();
      const fehlerBox = el('div', 'ergebnis-fehler');
      ergebnis.zeigeFehler(fehlerBox, d.fehler, { art: d.abgebrochen ? 'hinweis' : 'fehler' });
      frag.appendChild(fehlerBox);
      if (Array.isArray(d.protokoll) && (d.protokoll.length || d.anweisung)) frag.appendChild(protokollListe(d.protokoll, d.anweisung || null));
      flaeche.replaceChildren(frag);
      flaeche.removeAttribute('aria-busy');
      editor.setzeMarken(Number.isInteger(d.zeile) ? [{ code: d.code, art: 'fehler', text: d.fehler, zeile: d.zeile }] : []);
      return;
    }
    editor.setzeMarken([]);
    zeigeTabellen(d.tabellen);
    schemaTipp.textContent = 'Stand nach dem letzten Ausführen.';
    const frag = document.createDocumentFragment();
    frag.appendChild(protokollListe(d.protokoll || []));
    const erg = el('div', 'skript-ergebnis');
    if (d.ergebnis) ergebnis.zeigeErgebnis(erg, { ...d.ergebnis, ms: d.ms }, { quelle: 'server' });
    else erg.appendChild(el('p', 'ergebnis-leer', 'Kein SELECT im Skript – das Schema rechts zeigt, was jetzt in der Datenbank steht.'));
    frag.appendChild(erg);
    flaeche.replaceChildren(frag);
    flaeche.removeAttribute('aria-busy');
  }

  knoepfe.ausfuehren.addEventListener('click', () => ausfuehren());
  knoepfe.abbrechen.addEventListener('click', () => laeuft && laeuft.abort());

  function pruefKopf(text) {
    return h('div', 'ergebnis-kopf', h('p', null, el('strong', null, text)), el('p', null, 'Geprüft auf dem Server'));
  }

  return {
    el: box,
    wert: () => editor.wert(),
    setzeWert(t) {
      editor.setzeWert(t);
      if (entwurf) A.schreib(entwurf, String(t));
    },
    fokus: () => editor.fokus(),
    knoepfe,
    zeigeDiagnose(diagnose, kopfText) {
      const frag = document.createDocumentFragment();
      if (kopfText) frag.appendChild(pruefKopf(kopfText));
      if (Array.isArray(diagnose) && diagnose.length) frag.appendChild(R.diagnoseListe(diagnose));
      flaeche.replaceChildren(frag);
    },
    /** Rückmeldung des Prüfers: Prüfpunkte (✓/✗) oder – bei Abbruch des Skripts – die Diagnose. */
    zeigePruefung(r) {
      const frag = document.createDocumentFragment();
      const pp = r && Array.isArray(r.pruefpunkte) ? r.pruefpunkte : null;
      if (pp) {
        const erfuellt = pp.filter((p) => p.ok).length;
        frag.appendChild(pruefKopf(`${erfuellt} von ${pp.length} Prüfpunkten erfüllt`));
        const ul = el('ul', 'pruefpunkte');
        ul.setAttribute('aria-label', 'Prüfpunkte');
        for (const p of pp) {
          const li = el('li', p.ok ? 'ok' : 'offen');
          li.append(el('span', 'pruefpunkt-zeichen', p.ok ? '✓' : '✗'), el('span', 'nur-sr', p.ok ? 'erfüllt: ' : 'noch nicht erfüllt: '), R.mitCode(p.text));
          ul.appendChild(li);
        }
        frag.appendChild(ul);
      } else frag.appendChild(pruefKopf('Dein Skript bricht ab'));
      if (r && Array.isArray(r.diagnose) && r.diagnose.length) {
        frag.appendChild(R.diagnoseListe(r.diagnose));
        const z = r.diagnose.find((d) => Number.isInteger(d.zeile));
        gelaufen = editor.wert();
        editor.setzeMarken(z ? [{ code: z.code, art: 'fehler', text: z.text, zeile: z.zeile }] : []);
      }
      flaeche.replaceChildren(frag);
    },
    sperren(an) {
      textarea.readOnly = !!an;
    }
  };
}
