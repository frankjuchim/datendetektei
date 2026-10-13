// SQL im Browser (Spec §7.2): Ausführer für die Ermittlungskonsole (ES-Modul, Hauptthread).
// Startet sql-worker.js, schickt Abfragen hinein und beendet ihn nach 3 s (bzw. auf Knopfdruck) mit terminate();
// danach startet ein neuer Worker mit der zwischengespeicherten DB (kein zweiter Download).
//
// erzeugeAusfuehrer({ dbUrl, ohneWasm?, abbruchMs? }) → {
//   fuehreAus(sql) → Promise<{ spalten, zeilen, gesamt, ms } | { fehler, abgebrochen? }>   (zeilen ≤ 300, gesamt exakt)
//   abbrechen()    → bricht die laufende Abfrage ab (true, wenn etwas lief)
//   schema()       → Promise<[{ name, spalten: [{ name, typ, pk, notNull, fk }], zeilen }] | { fehler }>
//   bereit         → Promise<{ modus: 'wasm' | 'asm' }> des aktuellen Workers
// }
// Prüfungen laufen nie hier, sondern nur auf dem Server; der Worker dient dem freien Ausprobieren.

export const ABBRUCH_MS = 3000;
export const TEXT_ZEITLIMIT = 'Abgebrochen: Die Abfrage lief länger als 3 Sekunden. Läuft sie vielleicht endlos?';
export const TEXT_ABGEBROCHEN = 'Abfrage abgebrochen.';
const TEXT_LADEFEHLER = 'Die Datenbank konnte nicht geladen werden.';
const TEXT_ABSTURZ = 'Die Abfrage konnte nicht ausgeführt werden.';

/**
 * Einheitlicher Hinweis der drei Verstehenshilfen (Zeitlupe, Spurenbrett, Sortierfächer), wenn SQL im Browser nicht
 * startet. Die Werkzeuge stellen sehr viele interne Abfragen und rechnen deshalb nur im Browser – einen Rückfall auf
 * den Server gibt es (anders als in der Konsole) bewusst nicht.
 */
export const TEXT_WERKZEUG_OHNE_WASM =
  'Dieses Werkzeug braucht WebAssembly im Browser. Dein Browser erlaubt es hier nicht (zum Beispiel wegen einer Einstellung im Schulnetz). Nimm einen aktuellen Browser oder ein anderes Gerät – die Ermittlungskonsole funktioniert auch ohne.';

/**
 * Wartet auf den Start eines Ausführers für ein Werkzeug. → null (bereit) | { art: 'laden' | 'wasm', text }
 * 'laden': die Datenbank kam nicht an (z. B. nicht angemeldet); 'wasm': sql.js startet in diesem Browser nicht.
 */
export async function werkzeugBereit(ausfuehrer) {
  try {
    await ausfuehrer.bereit;
    return null;
  } catch (fehler) {
    const text = (fehler && fehler.message) || '';
    if (text === TEXT_LADEFEHLER) return { art: 'laden', text };
    return { art: 'wasm', text: TEXT_WERKZEUG_OHNE_WASM };
  }
}

export function erzeugeAusfuehrer({ dbUrl, ohneWasm = false, abbruchMs = ABBRUCH_MS } = {}) {
  if (!dbUrl) throw new Error('dbUrl fehlt.');
  const workerUrl = new URL('./sql-worker.js', import.meta.url);
  const version = new URL(import.meta.url).searchParams.get('v');
  if (version) workerUrl.searchParams.set('v', version);
  if (ohneWasm) workerUrl.searchParams.set('ohneWasm', '1');
  const dbAdresse = new URL(dbUrl, location.href).href;

  let puffer = null; // DB als ArrayBuffer, nach dem ersten Laden zwischengespeichert
  let worker = null;
  let bereit = null;
  let naechsteId = 1;
  const offen = new Map(); // id → Erledigen-Funktion
  let kette = Promise.resolve(); // Aufträge nacheinander (das Zeitlimit gilt je Abfrage)

  function erledigeAlle(ergebnis) {
    const liste = [...offen.values()];
    offen.clear();
    for (const erledige of liste) erledige(ergebnis);
  }

  function starte() {
    const w = new Worker(workerUrl);
    worker = w;
    bereit = new Promise((resolve, reject) => {
      w.onmessage = (ereignis) => {
        const n = ereignis.data || {};
        if (n.typ === 'bereit') {
          if (n.puffer) puffer = n.puffer;
          resolve({ modus: n.modus });
        } else if (n.typ === 'startfehler') {
          reject(new Error(n.fehler || TEXT_LADEFEHLER));
        } else if (n.typ === 'antwort') {
          const erledige = offen.get(n.id);
          if (erledige) {
            offen.delete(n.id);
            erledige(n.ergebnis);
          }
        }
      };
      w.onerror = (ereignis) => {
        if (ereignis && ereignis.preventDefault) ereignis.preventDefault();
        reject(new Error(TEXT_LADEFEHLER));
        // Absturz während einer Abfrage: offene Aufträge beenden, frischen Worker starten.
        if (worker === w && offen.size > 0) neustart({ fehler: TEXT_ABSTURZ });
      };
    });
    bereit.catch(() => {}); // Fehler werden bei fuehreAus/schema gemeldet
    const kopie = puffer ? puffer.slice(0) : null;
    w.postMessage({ typ: 'start', dbUrl: dbAdresse, puffer: kopie }, kopie ? [kopie] : []);
  }

  function neustart(ergebnis) {
    if (worker) worker.terminate();
    erledigeAlle(ergebnis);
    starte();
  }

  function auftrag(nachricht, mitZeitlimit) {
    const lauf = kette.then(() =>
      bereit.then(
        () =>
          new Promise((resolve) => {
            const id = naechsteId++;
            let uhr = null;
            offen.set(id, (ergebnis) => {
              clearTimeout(uhr);
              resolve(ergebnis);
            });
            worker.postMessage({ ...nachricht, id });
            if (mitZeitlimit) {
              uhr = setTimeout(() => {
                if (offen.has(id)) neustart({ fehler: TEXT_ZEITLIMIT, abgebrochen: true });
              }, abbruchMs);
            }
          }),
        (fehler) => ({ fehler: (fehler && fehler.message) || TEXT_LADEFEHLER })
      )
    );
    kette = lauf.catch(() => {});
    return lauf;
  }

  starte();

  return {
    fuehreAus: (sql) => auftrag({ typ: 'ausfuehren', sql: String(sql) }, true),
    schema: () => auftrag({ typ: 'schema' }, true),
    abbrechen() {
      if (offen.size === 0) return false;
      neustart({ fehler: TEXT_ABGEBROCHEN, abgebrochen: true });
      return true;
    },
    get bereit() {
      return bereit;
    }
  };
}
