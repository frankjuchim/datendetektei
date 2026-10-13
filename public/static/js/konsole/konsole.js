// Ermittlungskonsole „Freie Ermittlung“ (/konsole/:db, Plan Phase 2 Task 12; DESIGN.md §4.10, §5.3, §9).
// Verdrahtet Editor, Schema-Browser, Ergebnis und den Ausführer (sql.js im Web Worker). Kann der Browser SQL nicht
// ausführen (WebAssembly gesperrt, Fallback scheitert), läuft die Abfrage über POST /api/sql/ausfuehren in der
// Sandbox des Servers (Spec §18). Nichts wird bewertet; der Entwurf liegt nur im localStorage dieses Geräts.
// Parser, Regeln und Fehlertexte kommen als klassische Skripte (window.DD_SQL_PARSER/…_REGELN/…_FEHLERTEXTE).

export const DATENBANKEN = Object.freeze({
  fundbuero: { titel: 'Fundbüro', akte: 'Akte 1' },
  stadtrad: { titel: 'StadtRad', akte: 'Akten 2 und 6' },
  stadtfest: { titel: 'Stadtfest', akte: 'Akten 3 und 6' },
  tus: { titel: 'TuS Weserstedt', akte: 'Akte 4' },
  detektei: { titel: 'Detektei', akte: 'Akten 5 und 6' },
  datenspuren: { titel: 'Datenspuren', akte: 'Akte 6' },
  eisdiele: { titel: 'Eisdiele', akte: 'Probefall' }
});

const TEXT_ABGEBROCHEN = 'Abfrage abgebrochen.';
const TEXT_SERVER = 'Die Abfrage konnte gerade nicht ausgeführt werden. Versuch es gleich noch einmal.';
const TEXT_ANMELDEN = 'Für diese Datenbank musst du angemeldet sein. Melde dich über das Portal an.';
const TEXT_ZU_VIELE = 'Du hast in kurzer Zeit sehr viele Abfragen geschickt. Warte einen Moment und versuch es dann noch einmal.';
const TEXT_SCHEMA = 'Das Schema konnte nicht geladen werden. Lade die Seite neu.';
// Texte des Workers/Ausführers, die schon deutsch und verständlich sind
const WORKER_TEXTE = {
  'Bitte nur eine Abfrage auf einmal.': 'MEHRERE_ANWEISUNGEN',
  'Keine Abfrage gefunden.': 'LEER'
};

const version = new URL(import.meta.url).searchParams.get('v') || '';
const mitVersion = (pfad) => (version ? `${pfad}?v=${encodeURIComponent(version)}` : pfad);

const $ = (id) => document.getElementById(id);

function speicherLesen(schluessel) {
  try {
    return window.localStorage.getItem(schluessel);
  } catch {
    return null;
  }
}
function speicherSchreiben(schluessel, wert) {
  try {
    window.localStorage.setItem(schluessel, wert);
  } catch {
    /* nicht speicherbar (privater Modus) – der Entwurf gilt bis zum Neuladen */
  }
}

/** SQLite-/Worker-Meldung → deutscher Text (fehlertexte.js). */
function deutsch(fehler) {
  const f = window.DD_SQL_FEHLERTEXTE;
  const text = String(fehler || '');
  if (WORKER_TEXTE[text]) return f ? f.uebersetze(WORKER_TEXTE[text]) : text;
  if (!f) return text;
  const { code, text: uebersetzt } = f.ordneZu(text);
  // Bereits deutsche Meldungen (Ladefehler, Zeitlimit des Ausführers) unverändert lassen
  if (code === 'ALLGEMEIN' && /[äöüß]|Datenbank|Abfrage/.test(text)) return text;
  return uebersetzt;
}

/** Parser- und Regel-Hinweise (Abimodus „hinweis“) für die Randmarken. */
function pruefe(sql, schema) {
  const parser = window.DD_SQL_PARSER;
  const regeln = window.DD_SQL_REGELN;
  if (!parser || !regeln || !sql.trim()) return [];
  try {
    const { ast, fehler } = parser.parse(sql);
    if (fehler && fehler.length > 0) {
      return fehler.map((f) => ({ code: f.code, falle: null, art: 'fehler', text: f.text, zeile: f.zeile, spalte: f.spalte }));
    }
    return regeln.pruefeRegeln(ast, { schema: schema || undefined, abimodus: 'hinweis' });
  } catch {
    return [];
  }
}

async function start() {
  const treffer = /^\/konsole\/([a-z]+)$/.exec(window.location.pathname);
  const name = treffer && Object.prototype.hasOwnProperty.call(DATENBANKEN, treffer[1]) ? treffer[1] : null;
  if (!name) return;
  const info = DATENBANKEN[name];
  const parameter = new URLSearchParams(window.location.search);
  const ohneWasm = parameter.get('ohneWasm') === '1';

  const [{ erzeugeEditor }, { zeigeSchema, zeigeSchemaFehler }, ergebnis, { erzeugeAusfuehrer }, W] = await Promise.all([
    import(mitVersion('./editor.js')),
    import(mitVersion('./schema.js')),
    import(mitVersion('./ergebnis.js')),
    import(mitVersion('./ausfuehren.js')),
    import(mitVersion('./werkzeuge.js'))
  ]);

  document.title = `Freie Ermittlung: ${info.titel} – Datendetektei`;
  $('db-titel').textContent = info.titel;
  $('db-akte').textContent = `${info.akte} · Übungs-DB`;
  $('konsole-db').textContent = `DB: ${info.titel} · Übungs-DB`;
  if (/Mac|iPhone|iPad/.test(navigator.platform || '')) $('taste').textContent = '⌘ ↵';

  const ergebnisFlaeche = $('ergebnis');
  const knopfAusfuehren = $('k-ausfuehren');
  const knopfAbbrechen = $('k-abbrechen');
  const modusAnzeige = $('konsole-modus');
  const entwurfSchluessel = `dd-entwurf:konsole:${name}`;

  let schema = null;
  let laeuft = null; // { abbrechen() } während einer Ausführung
  let hinweise = [];

  const editor = erzeugeEditor({
    textarea: $('sql-eingabe'),
    overlay: $('editor-hl'),
    zeilen: $('editor-zeilen'),
    hinweisListe: $('editor-hinweise'),
    beiAusfuehren: () => ausfuehren(),
    beiAenderung: (sql) => {
      speicherSchreiben(entwurfSchluessel, sql);
      aktualisiereHinweise();
    }
  });

  function aktualisiereHinweise() {
    hinweise = pruefe(editor.wert(), schema);
    editor.setzeMarken(hinweise);
    return hinweise;
  }

  const entwurf = speicherLesen(entwurfSchluessel);
  if (entwurf !== null) editor.setzeWert(entwurf);
  aktualisiereHinweise();

  // Schema vom Server (gleiches Format wie für die Regeln)
  fetch(`/api/db/${name}/schema`, { credentials: 'same-origin', headers: { Accept: 'application/json' } })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Schema'))))
    .then((daten) => {
      schema = daten;
      zeigeSchema($('schema-liste'), schema, {
        beiSpalte: (text) => {
          editor.fuegeEin(text);
        }
      });
      if (entwurf === null && editor.wert() === '' && schema.length > 0) {
        editor.setzeWert(`SELECT *\nFROM ${schema[0].tabelle}`);
      }
      aktualisiereHinweise();
    })
    .catch(() => zeigeSchemaFehler($('schema-liste'), TEXT_SCHEMA));

  // Ausführer im Browser; scheitert der Start, übernimmt der Server.
  const ausfuehrer = erzeugeAusfuehrer({ dbUrl: `/db/${name}.sqlite`, ohneWasm });
  let modus = 'browser';
  modusAnzeige.textContent = 'Konsole wird vorbereitet …';
  const modusBestimmt = ausfuehrer.bereit.then(
    () => {
      modus = 'browser';
      modusAnzeige.textContent = 'läuft im Browser';
    },
    () => {
      modus = 'server';
      modusAnzeige.textContent = 'läuft auf dem Server';
    }
  );

  async function aufDemServer(sql, signal) {
    let antwort;
    try {
      antwort = await fetch('/api/sql/ausfuehren', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ db: name, sql }),
        signal
      });
    } catch {
      if (signal.aborted) return { fehler: TEXT_ABGEBROCHEN, abgebrochen: true };
      return { fehler: TEXT_SERVER, deutsch: true };
    }
    let daten = null;
    try {
      daten = await antwort.json();
    } catch {
      daten = null;
    }
    if (antwort.status === 401) return { fehler: TEXT_ANMELDEN, deutsch: true };
    if (antwort.status === 429) return { fehler: TEXT_ZU_VIELE, deutsch: true };
    if (daten && typeof daten.fehler === 'string') return { fehler: daten.fehler, deutsch: true };
    if (!antwort.ok || !daten || !Array.isArray(daten.spalten)) return { fehler: TEXT_SERVER, deutsch: true };
    return daten;
  }

  function setzeLaeuft(an) {
    knopfAbbrechen.hidden = !an;
    knopfAusfuehren.disabled = an;
    if (!an && document.activeElement === knopfAbbrechen) $('sql-eingabe').focus();
  }

  /** Links aus einer Diagnose in Spurenbrett, Zeitlupe bzw. Sortierfächer – mit der Abfrage, die gerade lief. */
  function werkzeugZusatz(sql) {
    const gezeigt = new Set(); // je Werkzeug nur ein Knopf (KEIN_VERBUND und KREUZPRODUKT kommen oft zusammen)
    return (d) =>
      W.linkLeiste(
        W.werkzeugLinks(d, {
          db: name,
          sql,
          schema,
          zurueck: window.location.pathname,
          vorher: () => speicherSchreiben(entwurfSchluessel, editor.wert())
        }).filter((l) => !gezeigt.has(l.werkzeug) && gezeigt.add(l.werkzeug))
      );
  }

  async function ausfuehren() {
    if (laeuft) return;
    const sql = editor.wert();
    const aktuelle = aktualisiereHinweise();
    if (!sql.trim()) {
      ergebnis.zeigeFehler(ergebnisFlaeche, deutsch('Keine Abfrage gefunden.'));
      return;
    }
    const kontrolle = new AbortController();
    laeuft = {
      abbrechen: () => {
        if (modus === 'browser') ausfuehrer.abbrechen();
        else kontrolle.abort();
      }
    };
    setzeLaeuft(true);
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
      setzeLaeuft(false);
    }
    if (antwort && typeof antwort.fehler === 'string') {
      const text = antwort.abgebrochen || antwort.deutsch ? antwort.fehler : deutsch(antwort.fehler);
      ergebnis.zeigeFehler(ergebnisFlaeche, text, { art: antwort.abgebrochen ? 'hinweis' : 'fehler', hinweise: aktuelle, zusatz: werkzeugZusatz(sql) });
      return;
    }
    ergebnis.zeigeErgebnis(ergebnisFlaeche, antwort, { quelle, hinweise: aktuelle, zusatz: werkzeugZusatz(sql) });
  }

  knopfAusfuehren.addEventListener('click', () => ausfuehren());
  knopfAbbrechen.addEventListener('click', () => {
    if (laeuft) laeuft.abbrechen();
  });
  // Zeitlupe (Phase 4): Abfrage über sessionStorage übergeben (nie über die URL), gleiche Registerkarte.
  $('k-zeitlupe').addEventListener('click', () => {
    speicherSchreiben(entwurfSchluessel, editor.wert()); // Entwurf sofort sichern (Rücksprung)
    W.oeffneWerkzeug('zeitlupe', { db: name, sql: editor.wert(), zurueck: window.location.pathname });
  });
  document.documentElement.dataset.konsole = 'bereit';
}

start();
