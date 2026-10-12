'use strict';
/*
 * Inhalts-Validator für Akten (seed/akten/akte<n>.json) und Warm-up-Karten (seed/warmup/warmup_a<n>.json)
 * – docs/AUFGABENFORMAT.md §8 und „Warm-up-Karten“, Plan Phase 3 Task 3. Muster: Algo Quest src/content/validator.js,
 * auf unser Format übertragen und um die SQL-Prüfungen erweitert.
 *
 * validiereAkten(dateien, { datenbanken, sandbox, sqlPruefer })
 *   dateien     = [{ name, json }]  (json: geparstes Objekt oder JSON-Text)
 *   datenbanken = ladeDatenbanken() aus src/sql/datenbanken.js (namen, varianten(name), schema(name))
 *   sandbox     = erzeugeSandbox(…) (fuehreAus) – für quelleSql, dbtabelle.quelle, LIMIT-Probe, Warm-up
 *   sqlPruefer  = erzeugePruefer(…) (pruefeSql, musterErgebnisse)
 *   → Promise<{ fehler: [{ datei, id?, text }], hinweise: [{ datei, id?, text }], aufgaben, karten }>
 *
 * Zuerst die synchronen Strukturprüfungen je Datei, dann dateiübergreifend (welt/akte, ids), zuletzt die
 * SQL-Prüfungen (Sandbox) für alle Aufgaben, deren Struktur fehlerfrei ist.
 */

const F = require('./format');
const P = require('./pruefer');
const parser = require('../sql/parser');
const regeln = require('../sql/regeln');
const { OEFFENTLICHE_DATENBANKEN } = require('../sql/datenbanken');

const LEVEL_ID = /^A(\d)-E(\d)$/;
const AUFGABE_ID = /^A(\d)-(E\d-(\d{2}|CC)|V-\d{2})$/;
const BOSS_ID = /^A(\d)-V$/;
const KARTE_ID = /^W-A(\d)-(\d{2})$/;
const KOMPETENZ = /^(DB-)?K(\d{2})$/;
const FARBE = /^#[0-9A-Fa-f]{6}$/;
const STUFEN_PUNKTE = { 1: 10, 2: 20, 3: 30 };
const PARALLEL = 4;

function istObjekt(x) {
  return x !== null && typeof x === 'object' && !Array.isArray(x);
}
function istText(x) {
  return typeof x === 'string' && x.trim() !== '';
}
function istSkalar(x) {
  return typeof x === 'string' || typeof x === 'number' || typeof x === 'boolean';
}
function istZelle(x) {
  return x === null || typeof x === 'string' || (typeof x === 'number' && Number.isFinite(x));
}
function istVerhoerDb(name) {
  return typeof name === 'string' && name.startsWith('verhoer/');
}

/* ======================================================================================================== */
/* Verhör-Mix: erfüllbar? (maximaler Fluss Stufe → Art → Senke, Kapazität je Art = maxJeKind)                */
/* ======================================================================================================== */

/**
 * @param {{stufe:number, art:string}[]} pool
 * @param {{1?:number,2?:number,3?:number}} mix
 * @param {Object<string,number>} [maxJeKind]
 * @returns {boolean} ob sich je Stufe mix[s] Aufgaben ziehen lassen, ohne eine Obergrenze zu überschreiten
 */
function mixErfuellbar(pool, mix, maxJeKind = {}) {
  const stufen = ['1', '2', '3'];
  const arten = [...new Set(pool.map((x) => x.art))];
  // Knoten: 0 Quelle, 1–3 Stufen, 4… Arten, letzte Senke
  const n = 4 + arten.length + 1;
  const senke = n - 1;
  const kap = Array.from({ length: n }, () => new Array(n).fill(0));
  let bedarf = 0;
  stufen.forEach((s, i) => {
    const m = Number(mix[s]) || 0;
    kap[0][1 + i] = m;
    bedarf += m;
  });
  for (const x of pool) {
    const si = stufen.indexOf(String(x.stufe));
    if (si < 0) continue;
    kap[1 + si][4 + arten.indexOf(x.art)] += 1;
  }
  arten.forEach((a, j) => {
    const grenze = maxJeKind && Number.isInteger(maxJeKind[a]) ? maxJeKind[a] : Infinity;
    kap[4 + j][senke] = grenze;
  });
  let fluss = 0;
  for (;;) {
    const vor = new Array(n).fill(-1);
    vor[0] = 0;
    const schlange = [0];
    while (schlange.length && vor[senke] < 0) {
      const u = schlange.shift();
      for (let v = 0; v < n; v++) {
        if (vor[v] < 0 && kap[u][v] > 0) {
          vor[v] = u;
          schlange.push(v);
        }
      }
    }
    if (vor[senke] < 0) break;
    let d = Infinity;
    for (let v = senke; v !== 0; v = vor[v]) d = Math.min(d, kap[vor[v]][v]);
    for (let v = senke; v !== 0; v = vor[v]) {
      kap[vor[v]][v] -= d;
      kap[v][vor[v]] += d;
    }
    fluss += d;
  }
  return fluss === bedarf;
}

/* ======================================================================================================== */
/* Akte: Struktur                                                                                           */
/* ======================================================================================================== */

/**
 * Prüft eine Akten-Datei strukturell. Liefert die Aufgaben-Kontexte für die SQL-Prüfungen.
 * @returns {{ welt, ids: string[], aufgaben: number, sqlJobs: Function[] }}
 */
function pruefeAkteStruktur(data, datei, kontext) {
  const { f, h, dbs } = kontext;
  const ergebnis = { welt: null, ids: [], aufgaben: 0, sqlJobs: [] };
  const fd = (text) => f({ datei, text });
  if (!istObjekt(data)) {
    fd('Die Datei muss ein JSON-Objekt { "version": 2, "welt": …, "levels": […], "aufgaben": […] } enthalten.');
    return ergebnis;
  }
  if (data.version !== 2) fd(`version muss 2 sein (gefunden: ${JSON.stringify(data.version)}).`);
  const welt = data.welt;
  if (!Number.isInteger(welt) || !((welt >= 1 && welt <= 7) || welt === 9)) fd('welt muss die Aktennummer 1–7 sein (9 nur für die Test-Beispielakte).');
  else ergebnis.welt = welt;
  if (welt === 9) h({ datei, text: 'welt 9 ist die Test-Beispielakte – nicht in seed/akten ablegen.' });
  if (!istText(data.titel)) fd('titel (Name der Akte) fehlt.');
  if (data.farbe !== undefined && !FARBE.test(String(data.farbe))) fd('farbe muss im Format #RRGGBB angegeben werden.');
  if (data.farbe === undefined) h({ datei, text: 'farbe fehlt – es wird die Standardfarbe der Akte verwendet.' });
  if (!Array.isArray(data.levels)) fd('levels muss eine Liste sein.');
  if (!Array.isArray(data.aufgaben)) fd('aufgaben muss eine Liste sein.');
  if (!Array.isArray(data.levels) || !Array.isArray(data.aufgaben)) return ergebnis;

  const eA = welt === 5; // Akte 5 komplett eA (Spec §3)

  /* ---------- Aufgaben einsammeln ---------- */
  const aufgaben = new Map();
  data.aufgaben.forEach((a, i) => {
    if (!istObjekt(a)) return fd(`aufgaben[${i}] ist kein Objekt.`);
    if (typeof a.id !== 'string' || !a.id) return fd(`aufgaben[${i}]: id fehlt.`);
    if (aufgaben.has(a.id)) return f({ datei, id: a.id, text: `id „${a.id}“ kommt doppelt vor.` });
    aufgaben.set(a.id, a);
    ergebnis.ids.push(a.id);
  });
  ergebnis.aufgaben = aufgaben.size;

  /* ---------- Ermittlungen ---------- */
  const rolle = new Map(); // aufgabeId → { art: 'lab'|'cc'|'verhoer', level?, niveau }
  const levelIds = new Set();
  data.levels.forEach((l, i) => {
    const o = `levels[${i}]`;
    if (!istObjekt(l)) return fd(`${o} ist kein Objekt.`);
    const lid = typeof l.id === 'string' ? l.id : '';
    const fl = (text) => fd(`Ermittlung ${lid || o}: ${text}`);
    const m = LEVEL_ID.exec(lid);
    if (!m) fl(`id „${lid}“ hat nicht das Format A<n>-E<k> (z. B. A1-E2).`);
    else if (Number(m[1]) !== welt) fl(`id „${lid}“ passt nicht zu welt ${welt}.`);
    if (levelIds.has(lid)) fl(`id „${lid}“ kommt doppelt vor.`);
    levelIds.add(lid);
    if (!istText(l.titel)) fl('titel fehlt.');
    if (l.nr !== undefined && typeof l.nr !== 'string') fl('nr muss Text sein (z. B. "1.1").');
    if (l.ds !== undefined && (!Array.isArray(l.ds) || !l.ds.every(Number.isInteger))) fl('ds muss eine Liste ganzer Zahlen sein.');
    if (l.ab !== undefined && typeof l.ab !== 'string') fl('ab muss Text sein.');
    if (l.niveau !== undefined && !F.NIVEAUS.includes(l.niveau)) fl(`niveau muss ${F.NIVEAUS.join(' | ')} sein.`);
    const niveau = l.niveau || 'alle';
    if (eA && niveau !== 'eA') fl('Akte 5 ist komplett eA: niveau "eA" angeben.');
    if (l.briefing !== undefined) {
      if (typeof l.briefing !== 'string') fl('briefing muss Text sein.');
      else {
        for (const t of F.pruefeMarkdown(l.briefing)) fl(`briefing: ${t}`);
        if (F.luecken([{ t: 'text', md: l.briefing }]).length) fl('briefing: Lücken [[…]] sind hier nicht erlaubt.');
        const saetze = (l.briefing.match(/[.!?…](?=\s|$)/g) || []).length;
        if (saetze > 3) h({ datei, text: `Ermittlung ${lid}: briefing hat ${saetze} Sätze (höchstens drei, Spec §3.1).` });
      }
    }
    if (l.intro !== undefined) {
      pruefeBloecke(l.intro, { ort: `Ermittlung ${lid} › intro`, fe: fl, lueckenVerboten: true, verhoer: false, dbs, sqlJobs: ergebnis.sqlJobs, datei, f, h });
    }
    if (!Array.isArray(l.aufgaben) || !l.aufgaben.length) fl('aufgaben (Liste der Aufgaben-ids) fehlt oder ist leer.');
    for (const aid of Array.isArray(l.aufgaben) ? l.aufgaben : []) {
      if (!aufgaben.has(aid)) {
        fl(`verweist auf unbekannte Aufgabe „${aid}“.`);
        continue;
      }
      if (/-V-/.test(aid)) fl(`Verhör-Aufgabe „${aid}“ darf nicht in einer Ermittlung stehen.`);
      if (/-CC$/.test(aid)) fl(`Cold Case „${aid}“ darf nicht in aufgaben stehen (nur über coldCase).`);
      if (rolle.has(aid)) fl(`Aufgabe „${aid}“ wird mehrfach verwendet.`);
      else if (lid && !aid.startsWith(lid + '-')) fl(`Aufgabe „${aid}“ gehört dem Namen nach nicht zu ${lid}.`);
      rolle.set(aid, { art: 'lab', level: lid, niveau });
    }
    if (l.coldCase !== undefined) {
      const cc = l.coldCase;
      if (typeof cc !== 'string' || cc !== `${lid}-CC`) fl(`coldCase muss die id „${lid}-CC“ haben (gefunden: ${JSON.stringify(cc)}).`);
      else if (!aufgaben.has(cc)) fl(`coldCase verweist auf unbekannte Aufgabe „${cc}“.`);
      else if (rolle.has(cc)) fl(`coldCase „${cc}“ wird mehrfach verwendet.`);
      else rolle.set(cc, { art: 'cc', level: lid, niveau });
    }
  });

  /* ---------- Verhör ---------- */
  let kontextDb = null;
  if (data.boss !== undefined && data.boss !== null) {
    const b = data.boss;
    const fb = (text) => fd(`Verhör: ${text}`);
    if (!istObjekt(b)) fb('boss muss ein Objekt sein.');
    else {
      const m = BOSS_ID.exec(String(b.id));
      if (!m) fb(`id „${b.id}“ hat nicht das Format A<n>-V.`);
      else if (Number(m[1]) !== welt) fb(`id „${b.id}“ passt nicht zu welt ${welt}.`);
      if (!istText(b.titel)) fb('titel fehlt.');
      if (!istText(b.rahmensatz)) fb('rahmensatz fehlt.');
      else for (const t of F.pruefeMarkdown(b.rahmensatz)) fb(`rahmensatz: ${t}`);
      if (b.abimodus !== 'streng') fb('abimodus muss "streng" sein (Spec §7.9).');
      if (!istVerhoerDb(b.kontextDb)) fb(`kontextDb muss eine Verhör-DB „verhoer/<kontext>“ sein (gefunden: ${JSON.stringify(b.kontextDb)}).`);
      else if (!dbs.namen.includes(b.kontextDb)) fb(`kontextDb „${b.kontextDb}“ ist keine bekannte Datenbank.`);
      else kontextDb = b.kontextDb;
      if (!Number.isInteger(b.dauerMin) || b.dauerMin < 1 || b.dauerMin > 120) fb('dauerMin muss eine ganze Zahl 1–120 sein.');
      if (!Number.isInteger(b.anzahl) || b.anzahl < 1) fb('anzahl muss eine ganze Zahl ≥ 1 sein.');
      else if (b.anzahl < 6 || b.anzahl > 8) h({ datei, text: `Verhör: anzahl ${b.anzahl} liegt außerhalb von 6–8.` });
      if (b.niveau !== undefined && !F.NIVEAUS.includes(b.niveau)) fb(`niveau muss ${F.NIVEAUS.join(' | ')} sein.`);
      const bossNiveau = b.niveau || 'alle';
      if (eA && bossNiveau !== 'eA') fb('Akte 5 ist komplett eA: niveau "eA" angeben.');
      if (!Array.isArray(b.pool) || !b.pool.length) fb('pool (Liste der Verhör-Aufgaben) fehlt oder ist leer.');
      else if (b.pool.length < 12 || b.pool.length > 15) h({ datei, text: `Verhör: pool hat ${b.pool.length} Aufgaben (vorgesehen 12–15).` });
      for (const aid of Array.isArray(b.pool) ? b.pool : []) {
        if (!aufgaben.has(aid)) {
          fb(`pool verweist auf unbekannte Aufgabe „${aid}“.`);
          continue;
        }
        if (!/^A\d-V-\d{2}$/.test(aid)) fb(`Pool-Aufgabe „${aid}“ muss die id-Form A<n>-V-<nn> haben.`);
        if (rolle.has(aid)) fb(`Aufgabe „${aid}“ steht im Pool und in ${rolle.get(aid).level || 'einer Ermittlung'} – Verhör-Aufgaben sind eigene Aufgaben.`);
        else rolle.set(aid, { art: 'verhoer', niveau: bossNiveau });
      }
      if (b.maxJeKind !== undefined) {
        if (!istObjekt(b.maxJeKind)) fb('maxJeKind muss ein Objekt { "<kind>": n } sein.');
        else {
          for (const [k, n] of Object.entries(b.maxJeKind)) {
            if (!F.INTERAKTIONEN.includes(k)) fb(`maxJeKind: unbekannte Interaktion „${k}“.`);
            if (!Number.isInteger(n) || n < 0) fb(`maxJeKind.${k} muss eine ganze Zahl ≥ 0 sein.`);
          }
        }
      }
      if (!istObjekt(b.mix)) fb('mix muss ein Objekt { "1": a, "2": b, "3": c } sein.');
      else {
        let summe = 0;
        let mixOk = true;
        for (const [s, n] of Object.entries(b.mix)) {
          if (!['1', '2', '3'].includes(s) || !Number.isInteger(n) || n < 0) {
            fb(`mix: ungültiger Eintrag „${s}: ${n}“.`);
            mixOk = false;
            continue;
          }
          summe += n;
        }
        if (Number.isInteger(b.anzahl) && summe !== b.anzahl) fb(`Summe von mix (${summe}) muss anzahl (${b.anzahl}) ergeben.`);
        const pool = (Array.isArray(b.pool) ? b.pool : [])
          .filter((aid) => aufgaben.has(aid))
          .map((aid) => {
            const a = aufgaben.get(aid);
            return { stufe: a.stufe, art: F.artVon(Array.isArray(a.interaktion) ? a.interaktion[0] : a.interaktion), niveau: a.niveau || bossNiveau };
          });
        const maxJeKind = istObjekt(b.maxJeKind) ? b.maxJeKind : {};
        if (mixOk && !mixErfuellbar(pool, b.mix, maxJeKind)) {
          fb(`Mix nicht erfüllbar: ${JSON.stringify(b.mix)}${b.maxJeKind ? ` mit maxJeKind ${JSON.stringify(b.maxJeKind)}` : ''} lässt sich aus dem Pool nicht ziehen.`);
        } else if (mixOk && bossNiveau !== 'eA' && !mixErfuellbar(pool.filter((x) => x.niveau !== 'eA'), b.mix, maxJeKind)) {
          h({ datei, text: 'Verhör: Für gA-Kurse (nur Aufgaben mit niveau „alle“) ist der Mix nicht erfüllbar – es wird aufgefüllt.' });
        }
      }
    }
  }

  /* ---------- Aufgaben im Einzelnen ---------- */
  for (const [id, a] of aufgaben) {
    const r = rolle.get(id) || { art: /-V-/.test(id) ? 'verhoer' : /-CC$/.test(id) ? 'cc' : 'lab', niveau: 'alle', unbenutzt: true };
    if (r.unbenutzt) h({ datei, id, text: `Aufgabe „${id}“ wird in keiner Ermittlung, keinem coldCase und keinem Verhör-Pool verwendet.` });
    pruefeAufgabe(a, id, { welt, eA, rolle: r, kontextDb, datei, f, h, dbs, sqlJobs: ergebnis.sqlJobs });
  }
  return ergebnis;
}

/* ======================================================================================================== */
/* Aufgabe                                                                                                  */
/* ======================================================================================================== */

function pruefeAufgabe(a, id, k) {
  const { welt, rolle, datei, f, h } = k;
  let fehlerZahl = 0;
  const fa = (text) => {
    fehlerZahl++;
    f({ datei, id, text });
  };
  const ha = (text) => h({ datei, id, text });
  const verhoer = rolle.art === 'verhoer';

  const m = AUFGABE_ID.exec(id);
  if (!m) fa(`id „${id}“ hat nicht das Format A<n>-E<k>-<nn>, A<n>-E<k>-CC bzw. A<n>-V-<nn>.`);
  else if (Number(m[1]) !== welt) fa(`id „${id}“ passt nicht zu welt ${welt}.`);
  if (!istText(a.titel)) fa('titel fehlt.');
  if (![1, 2, 3].includes(a.stufe)) fa('stufe muss 1, 2 oder 3 sein.');
  if (!F.KATEGORIEN.includes(a.kategorie)) fa(`unbekannte kategorie „${a.kategorie}“ (erlaubt: ${F.KATEGORIEN.join(' | ')}).`);
  if (a.niveau !== undefined && !F.NIVEAUS.includes(a.niveau)) fa(`niveau muss ${F.NIVEAUS.join(' | ')} sein.`);
  if (k.eA && a.niveau !== undefined && a.niveau !== 'eA') fa('Akte 5 ist komplett eA: niveau "alle" ist hier nicht erlaubt.');
  if (a.fallen !== undefined) {
    if (!Array.isArray(a.fallen)) fa('fallen muss eine Liste sein (z. B. ["P1"]).');
    else for (const p of a.fallen) if (!F.FALLEN.includes(p)) fa(`unbekannte Falle „${p}“ (erlaubt: P1–P10).`);
  }

  const einteilig = !Array.isArray(a.interaktion);
  const kernpunkteAllein = einteilig && F.artVon(a.interaktion) === 'kernpunkte';
  if (a.punkte !== undefined && (!Number.isInteger(a.punkte) || a.punkte < 0 || a.punkte > 200)) fa('punkte muss eine ganze Zahl 0–200 sein.');
  else if (rolle.art === 'cc') {
    if (a.punkte !== undefined && a.punkte !== 0) fa('Cold Case: punkte muss 0 sein (oder fehlen).');
  } else if (kernpunkteAllein) {
    if (a.punkte !== undefined && a.punkte !== 0) fa('kernpunkte-Aufgaben bringen keine Punkte: punkte muss 0 sein.');
  } else if (a.punkte === 0) {
    fa('punkte 0 nur bei Cold Cases und kernpunkte-Aufgaben.');
  } else if (Number.isInteger(a.punkte) && STUFEN_PUNKTE[a.stufe] && a.punkte !== STUFEN_PUNKTE[a.stufe]) {
    ha(`punkte ${a.punkte} weicht vom Standard der Stufe ${a.stufe} (${STUFEN_PUNKTE[a.stufe]}) ab.`);
  }

  const blockKontext = { fe: fa, verhoer, kontextDb: k.kontextDb, dbs: k.dbs, sqlJobs: k.sqlJobs, datei, id, f, h };
  if (!Array.isArray(a.inhalt) || !a.inhalt.length) fa('inhalt (Liste von Blöcken) fehlt oder ist leer.');
  else pruefeBloecke(a.inhalt, { ...blockKontext, ort: 'inhalt' });
  if (a.tipps !== undefined) {
    if (!Array.isArray(a.tipps) || !a.tipps.every(istText)) fa('tipps muss eine Liste von Texten sein.');
    else a.tipps.forEach((t, i) => F.pruefeMarkdown(t).forEach((x) => fa(`tipps[${i}]: ${x}`)));
  }
  if (a.erklaerung === undefined || (Array.isArray(a.erklaerung) && !a.erklaerung.length)) ha('erklaerung fehlt (jede Aufgabe sollte erklären, warum).');
  else pruefeBloecke(a.erklaerung, { ...blockKontext, ort: 'erklaerung', lueckenVerboten: true, ohneQuelle: false });

  /* ---------- Interaktion(en) ---------- */
  const ia = a.interaktion;
  if (Array.isArray(ia)) {
    if (!ia.length) return fa('interaktion darf keine leere Liste sein.');
    if (!Array.isArray(a.loesung) || a.loesung.length !== ia.length) {
      return fa('Bei mehrteiligen Aufgaben (interaktion = Liste) muss loesung eine Liste gleicher Länge sein.');
    }
  } else if (!istObjekt(ia)) {
    return fa('interaktion fehlt.');
  } else if (Array.isArray(a.loesung)) {
    return fa('loesung ist eine Liste, interaktion aber keine – bei einteiligen Aufgaben ist loesung ein Objekt.');
  }
  const teile = F.teile(a);
  const felderBesitzer = new Map();
  teile.forEach((t, i) => {
    const ort = teile.length > 1 ? `interaktion[${i}]` : 'interaktion';
    pruefeInteraktion(t.interaktion, t.loesung, a, ort, { ...k, fa, ha, verhoer });
    const it = t.interaktion;
    if (F.artVon(it) === 'gaps' && istObjekt(it.felder)) {
      for (const fid of Object.keys(it.felder)) {
        if (felderBesitzer.has(fid)) fa(`${ort}: Feld „${fid}“ ist in mehreren Teilen definiert.`);
        felderBesitzer.set(fid, i);
      }
    }
    if (istObjekt(it) && it.frage !== undefined) {
      if (typeof it.frage !== 'string') fa(`${ort}: frage muss Text sein.`);
      else F.pruefeMarkdown(it.frage).forEach((x) => fa(`${ort}.frage: ${x}`));
    }
    if (istObjekt(it) && it.inhalt !== undefined) pruefeBloecke(it.inhalt, { ...blockKontext, ort: `${ort}.inhalt` });
  });

  /* ---------- Lücken ↔ Felder ---------- */
  const gezaehlt = new Map();
  for (const v of F.alleLuecken(a)) gezaehlt.set(v.id, (gezaehlt.get(v.id) || 0) + 1);
  for (const [gid, n] of gezaehlt) {
    if (!felderBesitzer.has(gid)) fa(`Lücke [[${gid}]] hat kein Feld in einer gaps-Interaktion.`);
    if (n > 1) fa(`Lücke [[${gid}]] kommt ${n}-mal vor (jede Lücke genau einmal).`);
  }
  for (const fid of felderBesitzer.keys()) if (!gezaehlt.has(fid)) fa(`Feld „${fid}“ hat keine Lücke [[${fid}]] im Inhalt.`);

  /* ---------- Musterantwort (asynchron, nach der Struktur) ---------- */
  if (fehlerZahl === 0) {
    k.sqlJobs.push(async (umgebung) => {
      const opt = { sqlPruefer: (aufg, sql) => umgebung.sqlPruefer.pruefeSql({ sql, aufgabe: aufg }) };
      if (verhoer) opt.abimodus = 'streng';
      try {
        const r = await P.pruefeAntwort(a, P.musterantwort(a), opt);
        if (!r.ok) {
          const diag = r.rueckmeldung && Array.isArray(r.rueckmeldung.diagnose) ? r.rueckmeldung.diagnose : [];
          const teilDiag = r.rueckmeldung && Array.isArray(r.rueckmeldung.teile) ? r.rueckmeldung.teile.flatMap((x) => (x && x.diagnose) || []) : [];
          const zusatz = [...diag, ...teilDiag].map((d) => d.code).join(', ');
          fa(`Die Musterantwort wird vom Prüfer nicht als richtig erkannt${zusatz ? ` (${zusatz})` : ''} – bitte loesung prüfen.`);
        }
      } catch (e) {
        fa(`Lösung nicht prüfbar: ${e.message}`);
      }
    });
  }
}

/* ---------- Interaktion ---------- */

function pruefeInteraktion(ia, lo, aufgabe, ort, k) {
  const { fa, ha, verhoer } = k;
  const lort = ort.replace('interaktion', 'loesung');
  if (!istObjekt(ia)) return fa(`${ort}: Interaktion ist kein Objekt.`);
  const art = F.artVon(ia);
  if (F.INTERAKTIONEN_PHASE5.includes(art)) return fa(`${ort}: Interaktion „${art}“ folgt in Phase 5 und ist noch nicht verfügbar.`);
  if (!F.INTERAKTIONEN.includes(art)) return fa(`${ort}: unbekannte kind „${ia.kind}“ (erlaubt: ${F.INTERAKTIONEN.join(', ')}).`);
  if (art === 'kernpunkte') {
    if (verhoer) fa(`${ort}: kernpunkte kommt im Verhör nicht vor.`);
    if (!Array.isArray(ia.kernpunkte) || !ia.kernpunkte.length || !ia.kernpunkte.every(istText)) {
      return fa(`${ort}: kernpunkte (Liste von Texten) fehlt.`);
    }
    ia.kernpunkte.forEach((t, i) => F.pruefeMarkdown(t).forEach((x) => fa(`${ort}.kernpunkte[${i}]: ${x}`)));
    if (lo !== undefined && lo !== null) fa(`${lort}: kernpunkte hat keine loesung (die Kernpunkte sind die Lösung).`);
    return;
  }
  if (!istObjekt(lo)) return fa(`${lort}: Lösung dieses Teils muss ein Objekt sein.`);
  const blockAn = (i) => (Array.isArray(aufgabe.inhalt) && Number.isInteger(i) ? aufgabe.inhalt[i] : undefined);

  switch (art) {
    case 'gaps': {
      if (!istObjekt(ia.felder) || !Object.keys(ia.felder).length) return fa(`${ort}: felder fehlt oder ist leer.`);
      for (const [fid, feld] of Object.entries(ia.felder)) {
        const o = `${ort}.felder.${fid}`;
        if (!/^[A-Za-z0-9_-]{1,40}$/.test(fid)) fa(`${o}: Feld-id darf nur A–Z, a–z, 0–9, _ und - enthalten.`);
        if (!istObjekt(feld)) {
          fa(`${o}: Feld muss ein Objekt sein ({ "typ": "text" }).`);
          continue;
        }
        const typ = feld.typ || 'text';
        if (!['text', 'zahl', 'auswahl'].includes(typ)) fa(`${o}: typ „${feld.typ}“ unbekannt (text | zahl | auswahl).`);
        if (feld.norm !== undefined && !['code', 'text', 'exakt'].includes(feld.norm)) fa(`${o}: norm „${feld.norm}“ unbekannt (code | text | exakt).`);
        if (feld.breite !== undefined && (!Number.isInteger(feld.breite) || feld.breite < 1 || feld.breite > 80)) fa(`${o}: breite muss eine ganze Zahl 1–80 sein.`);
        if (typ === 'auswahl' && (!Array.isArray(feld.optionen) || feld.optionen.length < 2 || !feld.optionen.every(istSkalar))) {
          fa(`${o}: auswahl braucht optionen (Liste mit mind. 2 Texten).`);
        }
        let acc = lo[fid];
        if (acc === undefined) {
          fa(`${lort}.${fid}: Lösung für Feld „${fid}“ fehlt.`);
          continue;
        }
        if (!Array.isArray(acc)) {
          ha(`${lort}.${fid}: Lösung sollte eine Liste akzeptierter Antworten sein (["…"]).`);
          acc = [acc];
        }
        if (!acc.length || !acc.every(istSkalar)) fa(`${lort}.${fid}: Liste akzeptierter Antworten ist leer oder enthält keine Texte/Zahlen.`);
        if (typ === 'zahl' && acc.some((x) => !Number.isFinite(F.alsZahl(x)))) ha(`${lort}.${fid}: Feld vom typ zahl hat eine nicht-numerische Lösung (Vergleich dann als Text).`);
        if (typ === 'auswahl' && Array.isArray(feld.optionen) && acc.some((x) => !feld.optionen.map(String).includes(String(x)))) {
          fa(`${lort}.${fid}: Lösung eines auswahl-Feldes muss eine der optionen sein.`);
        }
      }
      for (const key of Object.keys(lo)) if (!(key in ia.felder)) ha(`${lort}: Lösung enthält unbekanntes Feld „${key}“.`);
      break;
    }
    case 'choice': {
      if (!Array.isArray(ia.optionen) || ia.optionen.length < 2) return fa(`${ort}: optionen braucht mind. 2 Einträge { id, md | code }.`);
      const ids = ia.optionen.map((o) => (istObjekt(o) ? o.id : undefined));
      if (ids.some((x) => !istText(x))) fa(`${ort}: Jede Option braucht eine id.`);
      if (new Set(ids).size !== ids.length) fa(`${ort}: Options-ids müssen eindeutig sein.`);
      ia.optionen.forEach((o, i) => {
        if (!istObjekt(o)) return;
        if (!istText(o.md) && !istText(o.code)) fa(`${ort}.optionen[${i}]: Jede Option braucht md oder code.`);
        if (typeof o.md === 'string') F.pruefeMarkdown(o.md).forEach((x) => fa(`${ort}.optionen[${i}]: ${x}`));
      });
      if (ia.mehrfach !== undefined && typeof ia.mehrfach !== 'boolean') fa(`${ort}: mehrfach muss true oder false sein.`);
      if (!Array.isArray(lo.richtig) || !lo.richtig.length) return fa(`${lort}: richtig (Liste der richtigen Options-ids) fehlt.`);
      for (const r of lo.richtig) if (!ids.includes(r)) fa(`${lort}: richtig enthält unbekannte Option „${r}“.`);
      if (!ia.mehrfach && lo.richtig.length !== 1) fa(`${lort}: Einfachauswahl (mehrfach: false) braucht genau eine richtige Option.`);
      break;
    }
    case 'order': {
      if (!Array.isArray(ia.teile) || ia.teile.length < 2) return fa(`${ort}: teile braucht mind. 2 Einträge { id, code | md }.`);
      const ids = ia.teile.map((t) => (istObjekt(t) ? t.id : undefined));
      if (ids.some((x) => !istText(x))) fa(`${ort}: Jedes Teil braucht eine id.`);
      if (new Set(ids).size !== ids.length) fa(`${ort}: Teil-ids müssen eindeutig sein.`);
      if (ia.teile.some((t) => istObjekt(t) && typeof t.code !== 'string' && typeof t.md !== 'string')) fa(`${ort}: Jedes Teil braucht code oder md.`);
      if (!Array.isArray(lo.reihenfolgen) || !lo.reihenfolgen.length) return fa(`${lort}: reihenfolgen (Liste von id-Listen) fehlt.`);
      lo.reihenfolgen.forEach((r, i) => {
        if (!Array.isArray(r) || !r.length) return fa(`${lort}: reihenfolgen[${i}] muss eine nicht-leere Liste sein.`);
        for (const x of r) if (!ids.includes(x)) fa(`${lort}: reihenfolgen[${i}] enthält unbekannte id „${x}“.`);
        if (new Set(r).size !== r.length) fa(`${lort}: reihenfolgen[${i}] enthält eine id mehrfach.`);
      });
      break;
    }
    case 'lines': {
      const b = blockAn(ia.block);
      if (!b || (b.t !== 'sql' && b.t !== 'code')) return fa(`${ort}: block muss der Index eines sql- oder code-Blocks in inhalt sein (gefunden: ${ia.block}).`);
      const text = b.t === 'sql' ? b.sql : b.code;
      const n = String(text).split('\n').length;
      if (!Number.isInteger(ia.anzahl) || ia.anzahl < 1) fa(`${ort}: anzahl muss eine ganze Zahl ≥ 1 sein.`);
      if (!Array.isArray(lo.zeilen) || !lo.zeilen.length) return fa(`${lort}: zeilen (1-basierte Zeilennummern) fehlt.`);
      for (const z of lo.zeilen) if (!Number.isInteger(z) || z < 1 || z > n) fa(`${lort}: Zeile ${z} liegt nicht im Block (1–${n}).`);
      if (new Set(lo.zeilen).size !== lo.zeilen.length) fa(`${lort}: zeilen enthält eine Zeile mehrfach.`);
      if (Number.isInteger(ia.anzahl) && lo.zeilen.length !== ia.anzahl) fa(`${lort}: zeilen hat ${lo.zeilen.length} Einträge, anzahl ist ${ia.anzahl}.`);
      break;
    }
    case 'match': {
      if (!Array.isArray(ia.elemente) || !ia.elemente.length) return fa(`${ort}: elemente fehlt.`);
      if (!Array.isArray(ia.kategorien) || ia.kategorien.length < 2) return fa(`${ort}: kategorien braucht mind. 2 Einträge.`);
      const eids = ia.elemente.map((e) => (istObjekt(e) ? e.id : undefined));
      const kids = ia.kategorien.map((e) => (istObjekt(e) ? e.id : undefined));
      if (eids.some((x) => !istText(x)) || new Set(eids).size !== eids.length) fa(`${ort}: elemente brauchen eindeutige ids.`);
      if (kids.some((x) => !istText(x)) || new Set(kids).size !== kids.length) fa(`${ort}: kategorien brauchen eindeutige ids.`);
      for (const liste of [ia.elemente, ia.kategorien]) {
        for (const e of liste) if (istObjekt(e) && typeof e.md === 'string') F.pruefeMarkdown(e.md).forEach((x) => fa(`${ort} (${e.id}): ${x}`));
      }
      for (const e of eids) {
        if (lo[e] === undefined) fa(`${lort}: Zuordnung für Element „${e}“ fehlt.`);
        else if (!kids.includes(lo[e])) fa(`${lort}: Element „${e}“ ist der unbekannten Kategorie „${lo[e]}“ zugeordnet.`);
      }
      for (const key of Object.keys(lo)) if (!eids.includes(key)) fa(`${lort}: Lösung enthält unbekanntes Element „${key}“.`);
      break;
    }
    case 'zeilen': {
      const b = blockAn(ia.block);
      if (!b || b.t !== 'dbtabelle' || !Array.isArray(b.zeilen)) return fa(`${ort}: block muss der Index eines dbtabelle-Blocks in inhalt sein (gefunden: ${ia.block}).`);
      if (ia.mehrfach !== undefined && typeof ia.mehrfach !== 'boolean') fa(`${ort}: mehrfach muss true oder false sein.`);
      if (!Array.isArray(lo.zeilen)) return fa(`${lort}: zeilen (0-basierte Zeilenindizes) fehlt.`);
      const n = b.zeilen.length;
      for (const z of lo.zeilen) if (!Number.isInteger(z) || z < 0 || z >= n) fa(`${lort}: Zeilenindex ${z} liegt nicht in der Tabelle (0–${n - 1}).`);
      if (new Set(lo.zeilen).size !== lo.zeilen.length) fa(`${lort}: zeilen enthält einen Index mehrfach.`);
      if (ia.mehrfach === false && lo.zeilen.length !== 1) fa(`${lort}: mehrfach: false braucht genau eine Zeile.`);
      if (lo.quelleSql !== undefined) {
        const db = (b.quelle && b.quelle.datenbank) || lo.datenbank;
        if (!istText(lo.quelleSql)) fa(`${lort}: quelleSql muss Text sein.`);
        else if (!pruefeDbErlaubt(db, `${lort}.quelleSql`, k)) {
          /* Fehler schon gemeldet */
        } else {
          const kopfLaenge = Array.isArray(b.kopf) ? b.kopf.length : 0;
          const soll = lo.zeilen.filter((z) => Number.isInteger(z) && z >= 0 && z < n).map((z) => b.zeilen[z]);
          k.sqlJobs.push(async (u) => {
            const e = await u.sandbox.fuehreAus({ db, sql: lo.quelleSql });
            if (!e.ok) return fa(`${lort}: quelleSql nicht ausführbar (${e.code}: ${e.text || ''}).`);
            if (e.spalten.length !== kopfLaenge) return fa(`${lort}: quelleSql liefert ${e.spalten.length} Spalten, die dbtabelle hat ${kopfLaenge}.`);
            if (!multimengeGleich(e.zeilen, soll)) fa(`${lort}: quelleSql liefert ${e.anzahl} Zeile(n), die nicht mit den Zeilen ${JSON.stringify(lo.zeilen)} der dbtabelle übereinstimmen.`);
          });
        }
      }
      break;
    }
    case 'ergebnis': {
      if (!Array.isArray(ia.kopf) || !ia.kopf.length || !ia.kopf.every(istText)) return fa(`${ort}: kopf (Liste der Spaltenüberschriften) fehlt.`);
      const hatAnzahl = ia.zeilenAnzahl !== undefined;
      if (hatAnzahl && (!Number.isInteger(ia.zeilenAnzahl) || ia.zeilenAnzahl < 1 || ia.zeilenAnzahl > 50)) fa(`${ort}: zeilenAnzahl muss eine ganze Zahl 1–50 sein.`);
      if (ia.freieZeilen !== undefined && typeof ia.freieZeilen !== 'boolean') fa(`${ort}: freieZeilen muss true oder false sein.`);
      if (hatAnzahl === (ia.freieZeilen === true)) fa(`${ort}: genau eines von zeilenAnzahl und freieZeilen: true angeben.`);
      if (ia.reihenfolge !== undefined && typeof ia.reihenfolge !== 'boolean') fa(`${ort}: reihenfolge muss true oder false sein.`);
      if (!Array.isArray(lo.zeilen)) return fa(`${lort}: zeilen (erwartetes Ergebnis) fehlt.`);
      lo.zeilen.forEach((z, i) => {
        if (!Array.isArray(z) || z.length !== ia.kopf.length || !z.every(istZelle)) fa(`${lort}: zeilen[${i}] muss ${ia.kopf.length} Zellen (Zahl, Text oder null) haben.`);
      });
      if (hatAnzahl && Number.isInteger(ia.zeilenAnzahl) && lo.zeilen.length !== ia.zeilenAnzahl) {
        fa(`${lort}: zeilen hat ${lo.zeilen.length} Zeilen, zeilenAnzahl ist ${ia.zeilenAnzahl}.`);
      }
      if (lo.quelleSql !== undefined) {
        if (!istText(lo.quelleSql)) fa(`${lort}: quelleSql muss Text sein.`);
        else if (lo.datenbank === undefined) fa(`${lort}: Zu quelleSql gehört loesung.datenbank.`);
        else if (pruefeDbErlaubt(lo.datenbank, `${lort}.datenbank`, k)) {
          const liste = ia.reihenfolge === true;
          k.sqlJobs.push(async (u) => {
            const e = await u.sandbox.fuehreAus({ db: lo.datenbank, sql: lo.quelleSql });
            if (!e.ok) return fa(`${lort}: quelleSql nicht ausführbar (${e.code}: ${e.text || ''}).`);
            if (e.spalten.length !== ia.kopf.length) return fa(`${lort}: quelleSql liefert ${e.spalten.length} Spalten, kopf hat ${ia.kopf.length}.`);
            const gleich = liste ? listeGleich(e.zeilen, lo.zeilen) : multimengeGleich(e.zeilen, lo.zeilen);
            if (!gleich) {
              const nurReihenfolge = liste && multimengeGleich(e.zeilen, lo.zeilen);
              fa(`${lort}: Das Ergebnis von quelleSql (${e.anzahl} Zeile(n)) stimmt nicht mit loesung.zeilen überein${nurReihenfolge ? ' (Reihenfolge)' : ''}.`);
            }
          });
        }
      }
      break;
    }
    case 'sql':
      pruefeSqlInteraktion(ia, lo, ort, lort, k);
      break;
    default:
      break;
  }
}

/** Darf diese Aufgabe die DB benutzen? Lab: öffentliche Akten-DBs; Verhör: nur die kontextDb. Meldet Fehler. */
function pruefeDbErlaubt(db, ort, k) {
  const { fa, verhoer, kontextDb, dbs } = k;
  if (!istText(db)) {
    fa(`${ort}: datenbank fehlt.`);
    return false;
  }
  if (!dbs.namen.includes(db)) {
    fa(`${ort}: unbekannte Datenbank „${db}“.`);
    return false;
  }
  if (verhoer) {
    if (db !== kontextDb) {
      fa(`${ort}: Verhör-Aufgaben nutzen nur die kontextDb des Verhörs (${kontextDb || 'fehlt'}), nicht „${db}“.`);
      return false;
    }
  } else if (!OEFFENTLICHE_DATENBANKEN.includes(db)) {
    fa(`${ort}: Ermittlungen nutzen nur öffentliche Akten-DBs (${OEFFENTLICHE_DATENBANKEN.join(', ')}), nicht „${db}“.`);
    return false;
  }
  return true;
}

/* ---------- sql ---------- */

function pruefeSqlInteraktion(ia, lo, ort, lort, k) {
  const { fa, ha, dbs } = k;
  const dbOk = pruefeDbErlaubt(ia.datenbank, `${ort}.datenbank`, k);
  const varianten = ia.varianten === undefined ? [] : ia.varianten;
  let variantenOk = true;
  if (!Array.isArray(varianten)) {
    fa(`${ort}: varianten muss eine Liste sein.`);
    variantenOk = false;
  } else {
    if (new Set(varianten).size !== varianten.length) fa(`${ort}: varianten enthält eine Variante mehrfach.`);
    for (const v of varianten) {
      if (!F.VARIANTEN.includes(v)) {
        fa(`${ort}: unbekannte Variante „${v}“ (erlaubt: ${F.VARIANTEN.join(', ')}).`);
        variantenOk = false;
      } else if (dbOk && !(v in dbs.varianten(ia.datenbank))) {
        fa(`${ort}: Variante „${v}“ gibt es für die Datenbank „${ia.datenbank}“ nicht.`);
        variantenOk = false;
      }
    }
  }
  if (ia.sortierung !== undefined) {
    if (!Array.isArray(ia.sortierung) || !ia.sortierung.length) fa(`${ort}: sortierung muss eine nicht-leere Liste { spalte, richtung } sein.`);
    else {
      ia.sortierung.forEach((s, i) => {
        if (!istObjekt(s) || !(istText(s.spalte) || (Number.isInteger(s.spalte) && s.spalte >= 1))) fa(`${ort}: sortierung[${i}].spalte fehlt.`);
        if (istObjekt(s) && !['ASC', 'DESC'].includes(s.richtung)) fa(`${ort}: sortierung[${i}].richtung muss ASC oder DESC sein.`);
      });
    }
  }
  if (ia.aliasPflicht !== undefined && typeof ia.aliasPflicht !== 'boolean') fa(`${ort}: aliasPflicht muss true oder false sein.`);
  if (ia.abimodus !== undefined && !F.ABIMODI.includes(ia.abimodus)) fa(`${ort}: abimodus muss ${F.ABIMODI.join(' | ')} sein.`);
  if (k.verhoer && ia.abimodus !== undefined && ia.abimodus !== 'streng') ha(`${ort}: Im Verhör gilt immer abimodus „streng“ (${ia.abimodus} wird überschrieben).`);
  if (!istText(lo.sql)) return fa(`${lort}: sql (Musterlösung) fehlt.`);
  if (lo.sql.length > 4000) fa(`${lort}: Musterlösung ist länger als 4 000 Zeichen.`);

  // EH §8 im Abimodus streng
  const ast = pruefeEh(lo.sql, `${lort}.sql`, fa, dbOk ? dbs.schema(ia.datenbank) : undefined);
  if (!dbOk || !variantenOk || !ast) return;

  const aufgabe = {
    datenbank: ia.datenbank,
    varianten,
    sortierung: Array.isArray(ia.sortierung) ? ia.sortierung : [],
    aliasPflicht: ia.aliasPflicht === true,
    abimodus: 'streng',
    loesung: { sql: lo.sql }
  };
  k.sqlJobs.push(async (u) => {
    let muster;
    try {
      muster = await u.sqlPruefer.musterErgebnisse(aufgabe);
    } catch (e) {
      return fa(`${lort}: ${e.message}`);
    }
    // sortierung nennt Spalten des Ergebnisses
    for (const s of aufgabe.sortierung) {
      if (!istObjekt(s)) continue;
      const spalten = muster.haupt.spalten.map((x) => normName(x));
      const gefunden = Number.isInteger(s.spalte) ? s.spalte <= spalten.length : spalten.includes(normName(s.spalte));
      if (!gefunden) fa(`${ort}: sortierung nennt die Spalte „${s.spalte}“, die das Ergebnis der Musterlösung nicht hat (${muster.haupt.spalten.join(', ')}).`);
    }
    if (muster.haupt.anzahl === 0) ha(`${lort}: Die Musterlösung liefert auf der Haupt-DB keine Zeile.`);
    // LIMIT: eindeutig auf Haupt-DB und jeder Variante (Spec §6.2: kein Gleichstand an der Schnittkante)
    if (ast.limit) {
      const meldungen = await pruefeLimit(ast, lo.sql, ia.datenbank, varianten, u.sandbox);
      for (const m of meldungen) (m.hinweis ? ha : fa)(`${lort}: ${m.text}`);
    }
  });
}

/** Parsen + Regeln im Abimodus streng. Meldet Fehler, liefert den AST (oder null). */
function pruefeEh(sql, ort, fa, schema) {
  const g = parser.parse(sql);
  if (!g.ast) {
    for (const x of g.fehler) fa(`${ort}: nicht parsebar (${x.code}, Zeile ${x.zeile}): ${x.text}`);
    return null;
  }
  const diag = regeln.pruefeRegeln(g.ast, { schema, abimodus: 'streng' }).filter((d) => d.art === 'fehler');
  for (const d of diag) fa(`${ort}: verstößt gegen EH §8 (${d.code}): ${d.text}`);
  return diag.length ? null : g.ast;
}

/**
 * LIMIT-Probe: führt die Musterlösung mit LIMIT n+1 und den ORDER-BY-Schlüsseln als Zusatzspalten aus. Haben die
 * Zeilen n und n+1 dieselben Schlüssel, aber verschiedene Werte, hängt das Ergebnis vom Zufall ab (Gleichstand an der
 * Schnittkante). → [{ text, hinweis? }] (leer = eindeutig)
 */
async function pruefeLimit(ast, sql, db, varianten, sandbox) {
  if (!ast.orderBy || !ast.orderBy.length) return [{ text: 'LIMIT ohne ORDER BY liefert ein zufälliges Ergebnis – ORDER BY ergänzen.' }];
  if (!ast.limit || ast.limit.typ !== 'zahl' || (ast.offset && ast.offset.typ !== 'zahl')) return [];
  const n = ast.limit.wert;
  const letzteSpalte = ast.spalten[ast.spalten.length - 1];
  if (!letzteSpalte || !letzteSpalte.ende || ast.spalten.some((s) => s.typ !== 'spalte')) return []; // SELECT * u. Ä.
  const breite = ast.spalten.length;
  // Schlüssel je ORDER-BY-Eintrag: Spaltennummer, Alias einer Ergebnisspalte oder angehängter Ausdruck.
  const aliase = ast.spalten.map((s) => (s.alias ? normName(s.alias) : null));
  let zusatz = '';
  let angehaengt = 0;
  const indizes = ast.orderBy.map((o) => {
    const x = o.ausdruck;
    if (x.typ === 'zahl' && Number.isInteger(x.wert) && x.wert >= 1 && x.wert <= breite) return x.wert - 1;
    if (x.typ === 'name' && !x.tabelle && aliase.includes(normName(x.spalte))) return aliase.indexOf(normName(x.spalte));
    zusatz += `, ${sql.slice(x.start.index, x.ende.index)} AS __schluessel${angehaengt}`;
    return breite + angehaengt++;
  });
  const probe =
    sql.slice(0, letzteSpalte.ende.index) +
    zusatz +
    sql.slice(letzteSpalte.ende.index, ast.limit.start.index) +
    String(n + 1) +
    sql.slice(ast.limit.ende.index);
  const meldungen = [];
  for (const variante of [null, ...varianten]) {
    const e = await sandbox.fuehreAus({ db, variante, sql: probe });
    const wo = variante ? `Variante „${variante}“` : 'Haupt-DB';
    if (!e.ok) {
      meldungen.push({ hinweis: true, text: `LIMIT-Probe auf ${wo} nicht ausführbar (${e.code}) – Eindeutigkeit an der LIMIT-Grenze nicht geprüft.` });
      continue;
    }
    if (e.zeilen.length <= n) continue;
    const a = e.zeilen[n - 1];
    const b = e.zeilen[n];
    const schluesselGleich = indizes.every((i) => F.normZelle(a[i]) === F.normZelle(b[i]));
    const werteGleich = a.slice(0, breite).every((v, i) => F.normZelle(v) === F.normZelle(b[i]));
    if (schluesselGleich && !werteGleich) {
      meldungen.push({ text: `Musterlösung auf ${wo} nicht eindeutig: Gleichstand an der LIMIT-Grenze (Zeile ${n} und ${n + 1} haben denselben Sortierschlüssel).` });
    }
  }
  return meldungen;
}

function normName(s) {
  return String(s).normalize('NFC').trim().toLowerCase().replace(/\s+/g, ' ');
}

function zeilenSchluessel(z) {
  return JSON.stringify((Array.isArray(z) ? z : []).map((v) => F.normZelle(v)));
}
function multimengeGleich(a, b) {
  if (a.length !== b.length) return false;
  const x = a.map(zeilenSchluessel).sort();
  const y = b.map(zeilenSchluessel).sort();
  return x.every((v, i) => v === y[i]);
}
function listeGleich(a, b) {
  return a.length === b.length && a.every((z, i) => zeilenSchluessel(z) === zeilenSchluessel(b[i]));
}

/* ---------- Blöcke ---------- */

function pruefeBloecke(bloecke, k) {
  const { fe, ort } = k;
  if (!Array.isArray(bloecke)) return fe(`${ort} muss eine Liste von Blöcken sein.`);
  bloecke.forEach((b, i) => {
    const o = `${ort}[${i}]`;
    if (!istObjekt(b)) return fe(`${o}: Block ist kein Objekt.`);
    if (F.BLOCK_TYPEN_PHASE5.includes(b.t)) return fe(`${o}: Block „${b.t}“ folgt in Phase 5 und ist noch nicht verfügbar.`);
    if (!F.BLOCK_TYPEN.includes(b.t)) return fe(`${o}: unbekannter Blocktyp t: „${b.t}“ (erlaubt: ${F.BLOCK_TYPEN.join(', ')}).`);
    const fb = (m) => fe(`${o} (${b.t}): ${m}`);
    switch (b.t) {
      case 'text':
      case 'hinweis':
        if (typeof b.md !== 'string') fb('md (Text) fehlt.');
        else F.pruefeMarkdown(b.md).forEach(fb);
        break;
      case 'code':
      case 'sql': {
        const text = b.t === 'sql' ? b.sql : b.code;
        if (typeof text !== 'string') return fb(`${b.t} fehlt.`);
        const n = text.split('\n').length;
        if (b.nummern !== undefined && typeof b.nummern !== 'boolean') fb('nummern muss true oder false sein.');
        if (b.markiere !== undefined) {
          if (!Array.isArray(b.markiere)) fb('markiere muss eine Liste von Zeilennummern sein.');
          else for (const z of b.markiere) if (!Number.isInteger(z) || z < 1 || z > n) fb(`markiere: Zeile ${z} liegt nicht im Block (1–${n}).`);
        }
        break;
      }
      case 'tabelle':
        if (!Array.isArray(b.kopf) || !b.kopf.every(istSkalar)) fb('kopf (Liste der Spaltenköpfe) fehlt.');
        if (!Array.isArray(b.zeilen) || !b.zeilen.every((z) => Array.isArray(z) && z.every((c) => istSkalar(c) || c === null))) {
          fb('zeilen muss eine Liste von Zeilen (Listen von Texten) sein.');
        } else if (Array.isArray(b.kopf) && b.zeilen.some((z) => z.length !== b.kopf.length)) fb('Jede Zeile braucht so viele Zellen wie der Kopf.');
        break;
      case 'dbtabelle':
        pruefeDbTabelle(b, fb, k);
        break;
      case 'schema':
        if (!Array.isArray(b.relationen) || !b.relationen.length) return fb('relationen (Liste) fehlt.');
        b.relationen.forEach((r, j) => {
          if (!istObjekt(r) || !istText(r.name)) return fb(`relationen[${j}]: name fehlt.`);
          if (!Array.isArray(r.attribute) || !r.attribute.length) return fb(`relationen[${j}]: attribute (Liste) fehlt.`);
          r.attribute.forEach((at, x) => {
            if (!istObjekt(at) || !istText(at.name)) return fb(`relationen[${j}].attribute[${x}]: name fehlt.`);
            if (at.pk !== undefined && typeof at.pk !== 'boolean') fb(`${r.name}.${at.name}: pk muss true oder false sein.`);
            if (at.fk !== undefined && at.fk !== true && !istText(at.fk)) fb(`${r.name}.${at.name}: fk muss der Name der Zielrelation oder true sein.`);
          });
        });
        break;
      case 'datenbank':
        if (k.verhoer) fb('Im Verhör gibt es keinen datenbank-Block (Verhör-DBs sind nie öffentlich).');
        else if (!F.UEBUNGS_DBS.includes(b.name)) fb(`name muss eine öffentliche Übungs-DB sein (${F.UEBUNGS_DBS.join(', ')}).`);
        break;
      default:
        break;
    }
    if (k.lueckenVerboten && F.luecken([b]).length) fb('Lücken [[…]] sind hier nicht erlaubt.');
  });
}

function pruefeDbTabelle(b, fb, k) {
  if (!istText(b.tabelle)) fb('tabelle (Name) fehlt.');
  if (!Array.isArray(b.kopf) || !b.kopf.length) return fb('kopf (Liste der Spalten) fehlt.');
  b.kopf.forEach((s, i) => {
    if (!istObjekt(s) || !istText(s.name)) return fb(`kopf[${i}]: name fehlt.`);
    if (s.pk !== undefined && typeof s.pk !== 'boolean') fb(`kopf[${i}]: pk muss true oder false sein.`);
    if (s.fk !== undefined && s.fk !== true && !istText(s.fk)) fb(`kopf[${i}]: fk muss der Name der Zielrelation oder true sein.`);
  });
  if (!Array.isArray(b.zeilen)) return fb('zeilen (Liste von Zeilen) fehlt.');
  b.zeilen.forEach((z, i) => {
    if (!Array.isArray(z) || z.length !== b.kopf.length || !z.every(istZelle)) fb(`zeilen[${i}] braucht ${b.kopf.length} Zellen (Zahl, Text oder null).`);
  });
  if (b.markiert !== undefined) {
    if (!Array.isArray(b.markiert)) fb('markiert muss eine Liste { zeile, spalte?, marke?, farbe? } sein.');
    else
      b.markiert.forEach((m, i) => {
        if (!istObjekt(m) || !Number.isInteger(m.zeile) || m.zeile < 0 || m.zeile >= b.zeilen.length) return fb(`markiert[${i}]: zeile liegt nicht in der Tabelle (0-basiert).`);
        if (m.spalte !== undefined && (!Number.isInteger(m.spalte) || m.spalte < 0 || m.spalte >= b.kopf.length)) fb(`markiert[${i}]: spalte liegt nicht in der Tabelle (0-basiert).`);
        if (m.marke !== undefined && (typeof m.marke !== 'string' || m.marke.length > 3)) fb(`markiert[${i}]: marke höchstens 3 Zeichen.`);
        if (m.farbe !== undefined && !F.MARKIER_FARBEN.includes(m.farbe)) fb(`markiert[${i}]: farbe muss ${F.MARKIER_FARBEN.join(' | ')} sein.`);
      });
  }
  if (b.quelle !== undefined) {
    const q = b.quelle;
    if (!istObjekt(q) || !istText(q.sql)) return fb('quelle braucht { datenbank, sql }.');
    if (F.luecken([b]).length) return fb('quelle ist für Blöcke mit Lücken nicht erlaubt.');
    if (!pruefeDbErlaubt(q.datenbank, 'quelle', { fa: fb, verhoer: !!k.verhoer, kontextDb: k.kontextDb, dbs: k.dbs })) return;
    const zeilen = b.zeilen;
    const breite = b.kopf.length;
    k.sqlJobs.push(async (u) => {
      const e = await u.sandbox.fuehreAus({ db: q.datenbank, sql: q.sql });
      if (!e.ok) return fb(`quelle.sql nicht ausführbar (${e.code}: ${e.text || ''}).`);
      if (e.spalten.length !== breite) return fb(`quelle.sql liefert ${e.spalten.length} Spalten, kopf hat ${breite}.`);
      if (!listeGleich(e.zeilen, zeilen)) {
        const i = e.zeilen.findIndex((z, j) => zeilenSchluessel(z) !== zeilenSchluessel(zeilen[j]));
        fb(`Die Zeilen stimmen nicht mit quelle überein (${e.anzahl} Zeile(n) in der DB, ${zeilen.length} im Block; erste Abweichung in zeilen[${i < 0 ? e.zeilen.length : i}]).`);
      }
    });
  }
}

/* ======================================================================================================== */
/* Warm-up-Karten                                                                                           */
/* ======================================================================================================== */

function pruefeWarmup(data, datei, kontext) {
  const { f, h, dbs } = kontext;
  const ergebnis = { ids: [], karten: 0, sqlJobs: [], akte: null };
  const fd = (text) => f({ datei, text });
  if (!istObjekt(data) || data.version !== 1 || !Array.isArray(data.karten)) {
    fd('Warm-up-Datei: { "version": 1, "karten": [ … ] } erwartet.');
    return ergebnis;
  }
  const dateiAkte = /warmup_a(\d)\.json$/i.exec(datei);
  if (dateiAkte) ergebnis.akte = Number(dateiAkte[1]);
  const ids = new Set();
  data.karten.forEach((c, i) => {
    if (!istObjekt(c)) return fd(`karten[${i}] ist kein Objekt.`);
    const id = typeof c.id === 'string' ? c.id : `karten[${i}]`;
    const fk = (text) => f({ datei, id, text });
    const m = KARTE_ID.exec(c.id);
    if (!m) fk(`id „${c.id}“ hat nicht das Format W-A<n>-<nn>.`);
    if (ids.has(id)) fk(`id „${id}“ kommt doppelt vor.`);
    ids.add(id);
    ergebnis.ids.push(id);
    ergebnis.karten++;
    if (!Number.isInteger(c.akte) || !((c.akte >= 1 && c.akte <= 7) || c.akte === 9)) fk('akte muss die Aktennummer 1–7 sein.');
    else {
      if (m && Number(m[1]) !== c.akte) fk(`akte ${c.akte} passt nicht zur id „${c.id}“.`);
      if (ergebnis.akte !== null && ergebnis.akte !== c.akte) fk(`akte ${c.akte} passt nicht zur Datei ${datei}.`);
    }
    if (!F.KATEGORIEN.includes(c.kategorie)) fk(`unbekannte kategorie „${c.kategorie}“ (erlaubt: ${F.KATEGORIEN.join(' | ')}).`);
    for (const feld of ['titel', 'aufgabe', 'loesung']) {
      if (!istText(c[feld])) fk(`${feld} fehlt.`);
      else if (feld !== 'titel') F.pruefeMarkdown(c[feld]).forEach((x) => fk(`${feld}: ${x}`));
    }
    if (!Number.isInteger(c.minuten) || c.minuten < 1 || c.minuten > 15) fk('minuten muss eine ganze Zahl 1–15 sein.');
    const kompetenzen = Array.isArray(c.kompetenz) ? c.kompetenz : [c.kompetenz];
    if (!kompetenzen.length || !kompetenzen.every((x) => typeof x === 'string' && KOMPETENZ.test(x) && Number(KOMPETENZ.exec(x)[2]) >= 1 && Number(KOMPETENZ.exec(x)[2]) <= 48)) {
      fk('kompetenz muss eine Liste von Kompetenz-IDs DB-K01 … DB-K48 sein.');
    }
    if (c.falle !== undefined && c.falle !== null) {
      const fallen = Array.isArray(c.falle) ? c.falle : [c.falle];
      if (!fallen.every((p) => F.FALLEN.includes(p))) fk('falle muss eine Liste aus P1 … P10 sein (leer erlaubt).');
    }
    if (c.sql !== undefined && typeof c.sql !== 'string') fk('sql muss Text sein.');
    if (c.loesungSql !== undefined && !istText(c.loesungSql)) fk('loesungSql muss Text sein.');
    if (c.sql !== undefined || c.loesungSql !== undefined) {
      if (!istText(c.datenbank)) fk('datenbank fehlt (Pflicht, wenn sql oder loesungSql angegeben ist).');
      else if (!dbs.namen.includes(c.datenbank)) fk(`unbekannte datenbank „${c.datenbank}“.`);
      else if (!OEFFENTLICHE_DATENBANKEN.includes(c.datenbank)) fk(`datenbank muss eine öffentliche Akten-DB sein (${OEFFENTLICHE_DATENBANKEN.join(', ')}).`);
      else if (istText(c.loesungSql)) {
        const ast = pruefeEh(c.loesungSql, 'loesungSql', fk, dbs.schema(c.datenbank));
        if (ast) {
          ergebnis.sqlJobs.push(async (u) => {
            const e = await u.sandbox.fuehreAus({ db: c.datenbank, sql: c.loesungSql });
            if (!e.ok) fk(`loesungSql nicht ausführbar auf ${c.datenbank} (${e.code}: ${e.text || ''}).`);
            else if (e.abgeschnitten) fk('loesungSql: Ergebnis zu groß (abgeschnitten).');
            else if (ast.limit) {
              for (const x of await pruefeLimit(ast, c.loesungSql, c.datenbank, [], u.sandbox)) {
                if (x.hinweis) h({ datei, id, text: `loesungSql: ${x.text}` });
                else fk(`loesungSql: ${x.text}`);
              }
            }
          });
        }
      }
    } else if (c.datenbank !== undefined) h({ datei, id, text: 'datenbank ohne sql/loesungSql wird nicht verwendet.' });
  });
  return ergebnis;
}

/* ======================================================================================================== */
/* Einstieg                                                                                                 */
/* ======================================================================================================== */

async function parallel(jobs, umgebung, n = PARALLEL) {
  let i = 0;
  async function arbeiter() {
    while (i < jobs.length) {
      const job = jobs[i++];
      await job(umgebung);
    }
  }
  await Promise.all(Array.from({ length: Math.min(n, jobs.length) }, arbeiter));
}

function istWarmup(name, data) {
  return /warmup/i.test(String(name)) || (istObjekt(data) && Array.isArray(data.karten) && !Array.isArray(data.aufgaben));
}

/**
 * Akten- und Warm-up-Dateien prüfen.
 * @param {{name: string, json: object|string}[]} dateien
 * @param {{datenbanken: object, sandbox: object, sqlPruefer: object}} umgebung
 */
async function validiereAkten(dateien, umgebung = {}) {
  const { datenbanken, sandbox, sqlPruefer } = umgebung;
  if (!datenbanken || !sandbox || !sqlPruefer) throw new TypeError('validiereAkten braucht { datenbanken, sandbox, sqlPruefer }.');
  const fehler = [];
  const hinweise = [];
  const f = (x) => fehler.push(x);
  const h = (x) => hinweise.push(x);
  const dbs = { namen: [...datenbanken.namen], varianten: datenbanken.varianten, schema: datenbanken.schema };
  const kontext = { f, h, dbs };

  let aufgaben = 0;
  let karten = 0;
  const jobs = [];
  const welten = new Map();
  const ids = new Map();
  const kartenIds = new Map();
  for (const d of dateien) {
    const name = d.name || 'unbenannt.json';
    let data = d.json;
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data.charCodeAt(0) === 0xfeff ? data.slice(1) : data);
      } catch (e) {
        f({ datei: name, text: `Kein gültiges JSON: ${e.message}` });
        continue;
      }
    }
    if (istWarmup(name, data)) {
      const r = pruefeWarmup(data, name, kontext);
      karten += r.karten;
      jobs.push(...r.sqlJobs);
      for (const id of r.ids) {
        if (kartenIds.has(id) && kartenIds.get(id) !== name) f({ datei: name, id, text: `id „${id}“ ist auch in ${kartenIds.get(id)} vergeben.` });
        kartenIds.set(id, name);
      }
      continue;
    }
    const r = pruefeAkteStruktur(data, name, kontext);
    aufgaben += r.aufgaben;
    jobs.push(...r.sqlJobs);
    if (r.welt !== null) {
      if (welten.has(r.welt)) f({ datei: name, text: `welt ${r.welt} ist auch in ${welten.get(r.welt)} definiert.` });
      else welten.set(r.welt, name);
    }
    for (const id of r.ids) {
      if (ids.has(id) && ids.get(id) !== name) f({ datei: name, id, text: `id „${id}“ ist auch in ${ids.get(id)} vergeben.` });
      else ids.set(id, name);
    }
  }

  await parallel(jobs, { sandbox, sqlPruefer });
  return { fehler, hinweise, aufgaben, karten };
}

/* ---------- Probefall des Gastmodus (seed/gast/probefall.json, AUFGABENFORMAT „Gastmodus“) ---------- */

const PROBEFALL_ID = /^G-(\d{2})$/;
const PROBEFALL_ANZAHL = 6;
const PROBEFALL_DB = 'eisdiele';
/** Mindestlänge, ab der ein Text als „Aufgabentext“ zählt (kürzere Werte wie Spaltennamen kommen legitim vor). */
const KOPIE_MIN = 20;

const normKopie = (s) => String(s).normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase();

/** Alle Texte (Strings) eines JSON-Werts. */
function alleTexte(wert, out = []) {
  if (typeof wert === 'string') out.push(wert);
  else if (Array.isArray(wert)) wert.forEach((w) => alleTexte(w, out));
  else if (istObjekt(wert)) Object.values(wert).forEach((w) => alleTexte(w, out));
  return out;
}

/** Texte einer Aufgabe, die eine Kopie verraten würden (Titel, Inhalt, Interaktion, Lösung, Tipps, Erklärung). */
function aufgabenTexte(a) {
  return alleTexte([a.titel, a.inhalt, a.interaktion, a.loesung, a.tipps, a.erklaerung]).filter((t) => t.trim().length >= KOPIE_MIN);
}

/** Alle Datenbank-Verweise einer Aufgabe (sql.datenbank, loesung.datenbank, quelle.datenbank, Block datenbank). */
function dbVerweise(a) {
  const out = [];
  const bloecke = (liste) => {
    for (const b of Array.isArray(liste) ? liste : []) {
      if (!istObjekt(b)) continue;
      if (b.t === 'datenbank') out.push(b.name);
      if (b.t === 'dbtabelle' && istObjekt(b.quelle)) out.push(b.quelle.datenbank);
    }
  };
  bloecke(a.inhalt);
  for (const t of F.teile(a)) {
    if (!istObjekt(t.interaktion)) continue;
    if (t.interaktion.kind === 'sql') out.push(t.interaktion.datenbank);
    bloecke(t.interaktion.inhalt);
    if (istObjekt(t.loesung) && t.loesung.datenbank !== undefined) out.push(t.loesung.datenbank);
  }
  return out;
}

/**
 * Probefall des Gastmodus prüfen: eigenes kleines Format (version 1, genau 6 Aufgaben `G-<nn>`, nur die Eisdiele),
 * die Aufgaben selbst wie Akten-Aufgaben (der Probefall wird dazu intern als Test-Akte welt 9 mit einer Ermittlung
 * geprüft – inkl. SQL-Lösungen in der Sandbox, Abimodus streng, Musterantworten) und gegen die Akten: keine id und
 * kein Text aus seed/akten (Spec §6.4: nie echte Aufgaben).
 * @param {object|string} data Inhalt von seed/gast/probefall.json
 * @param {{datenbanken, sandbox, sqlPruefer}} umgebung wie validiereAkten
 * @param {{akten?: {name, json}[], datei?: string}} [opt] akten = Akten-Dateien zum Abgleich
 * @returns {Promise<{fehler, hinweise, aufgaben}>}
 */
async function validiereProbefall(data, umgebung, { akten = [], datei = 'probefall.json' } = {}) {
  const fehler = [];
  const hinweise = [];
  const fd = (text, id) => fehler.push(id ? { datei, id, text } : { datei, text });
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch (e) {
      fd(`Kein gültiges JSON: ${e.message}`);
      return { fehler, hinweise, aufgaben: 0 };
    }
  }
  if (!istObjekt(data)) {
    fd('Die Datei muss ein JSON-Objekt { "version": 1, "titel": …, "datenbank": "eisdiele", "aufgaben": […] } enthalten.');
    return { fehler, hinweise, aufgaben: 0 };
  }
  if (data.version !== 1) fd(`version muss 1 sein (gefunden: ${JSON.stringify(data.version)}).`);
  if (!istText(data.titel)) fd('titel fehlt.');
  if (data.datenbank !== PROBEFALL_DB) fd(`datenbank muss „${PROBEFALL_DB}“ sein (der Probefall nutzt nur die Eisdiele).`);
  if (!Array.isArray(data.aufgaben)) {
    fd('aufgaben muss eine Liste sein.');
    return { fehler, hinweise, aufgaben: 0 };
  }
  if (data.aufgaben.length !== PROBEFALL_ANZAHL) fd(`Der Probefall hat genau ${PROBEFALL_ANZAHL} Aufgaben (gefunden: ${data.aufgaben.length}).`);

  // ids und Datenbanken
  const zuordnung = new Map(); // G-nn → A9-E1-nn
  data.aufgaben.forEach((a, i) => {
    const id = istObjekt(a) && typeof a.id === 'string' ? a.id : '';
    const m = PROBEFALL_ID.exec(id);
    if (!m) return fd(`aufgaben[${i}]: id „${id}“ hat nicht das Format G-<nn> (z. B. G-01).`);
    if (zuordnung.has(id)) return fd(`id „${id}“ kommt doppelt vor.`, id);
    zuordnung.set(id, `A9-E1-${m[1]}`);
    for (const db of dbVerweise(a)) {
      if (db !== PROBEFALL_DB) fd(`verwendet die Datenbank „${db}“ – im Probefall ist nur „${PROBEFALL_DB}“ erlaubt.`, id);
    }
  });

  // Abgleich mit den Akten: keine id, kein Text (Spec §6.4)
  const aktenIds = new Set();
  const aktenTexte = new Map(); // normalisierter Text → id
  for (const d of akten) {
    let json = d.json;
    if (typeof json === 'string') {
      try {
        json = JSON.parse(json);
      } catch {
        continue;
      }
    }
    for (const a of istObjekt(json) && Array.isArray(json.aufgaben) ? json.aufgaben : []) {
      if (!istObjekt(a)) continue;
      aktenIds.add(a.id);
      for (const t of aufgabenTexte(a)) aktenTexte.set(normKopie(t), a.id);
    }
  }
  const eigeneTexte = [data.briefing, ...alleTexte(data.intro)].filter((t) => typeof t === 'string' && t.trim().length >= KOPIE_MIN);
  for (const t of eigeneTexte) {
    const quelle = aktenTexte.get(normKopie(t));
    if (quelle) fd(`Text stammt aus einer Akte (seed/akten, ${quelle}): „${t.slice(0, 60)}…“ – der Probefall nutzt nur eigene Texte.`);
  }
  for (const a of data.aufgaben) {
    if (!istObjekt(a)) continue;
    if (aktenIds.has(a.id)) fd(`id „${a.id}“ ist eine Aufgabe aus seed/akten.`, a.id);
    for (const t of aufgabenTexte(a)) {
      const quelle = aktenTexte.get(normKopie(t));
      if (quelle) fd(`Text stammt aus einer Akte (seed/akten, ${quelle}): „${t.slice(0, 60)}…“ – nie echte Aufgaben im Gastmodus.`, a.id);
    }
  }

  // Aufgaben wie Akten-Aufgaben prüfen: als Test-Akte welt 9 mit einer Ermittlung.
  const gueltig = data.aufgaben.filter((a) => istObjekt(a) && zuordnung.has(a.id));
  const zurueck = new Map([...zuordnung].map(([g, a]) => [a, g]));
  const akte = {
    version: 2,
    welt: 9,
    titel: istText(data.titel) ? data.titel : 'Probefall',
    farbe: '#B08D3C',
    levels: [
      {
        id: 'A9-E1',
        titel: istText(data.titel) ? data.titel : 'Probefall',
        ...(data.briefing !== undefined ? { briefing: data.briefing } : {}),
        ...(data.intro !== undefined ? { intro: data.intro } : {}),
        aufgaben: gueltig.map((a) => zuordnung.get(a.id))
      }
    ],
    aufgaben: gueltig.map((a) => ({ ...a, id: zuordnung.get(a.id) }))
  };
  if (gueltig.length) {
    const r = await validiereAkten([{ name: datei, json: akte }], umgebung);
    const uebersetze = (x) => {
      let text = x.text;
      for (const [a, g] of zurueck) text = text.split(a).join(g);
      text = text.split('Ermittlung A9-E1').join('Probefall');
      const out = { datei, text };
      if (x.id) out.id = zurueck.get(x.id) || (x.id === 'A9-E1' ? undefined : x.id);
      if (out.id === undefined) delete out.id;
      return out;
    };
    for (const x of r.fehler) fehler.push(uebersetze(x));
    for (const x of r.hinweise) if (!/welt 9/.test(x.text)) hinweise.push(uebersetze(x));
  }
  return { fehler, hinweise, aufgaben: data.aufgaben.length };
}

/** Ergebnis als lesbarer Text (CLI). */
function formatiere(ergebnis, { hinweise = true } = {}) {
  const zeilen = [];
  const ort = (x) => `${x.datei}${x.id ? ` › ${x.id}` : ''}`;
  for (const x of ergebnis.fehler) zeilen.push(`Fehler:  ${ort(x)}: ${x.text}`);
  if (hinweise) for (const x of ergebnis.hinweise) zeilen.push(`Hinweis: ${ort(x)}: ${x.text}`);
  zeilen.push('');
  zeilen.push(
    `${ergebnis.aufgaben} Aufgaben, ${ergebnis.karten} Warm-up-Karten geprüft: ` +
      (ergebnis.fehler.length ? `${ergebnis.fehler.length} Fehler` : 'alles in Ordnung, 0 Fehler') +
      `, ${ergebnis.hinweise.length} Hinweis(e).`
  );
  return zeilen.join('\n');
}

module.exports = { validiereAkten, validiereProbefall, mixErfuellbar, formatiere };
