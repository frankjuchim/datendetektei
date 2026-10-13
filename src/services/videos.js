'use strict';
// Erklärvideos als Link-Knöpfe (Spec §13: „Einbindung als Link-Knopf (kein Embed) an Ermittlung, Themenseite,
// Materialien“; Plan Phase 7 Task 11). Quelle: seed/videos.json (Format docs/MATERIALIEN.md §10):
//
//   { "version": 1, "videos": [ { "nr": 1, "titel": "…", "akte": 1, "ds": [1, 2], "niveau": "beide",
//                                  "ordner": "01_SQL-Grundlagen", "url": null } ] }
//
// url ist null, bis Frank das Video hochgeladen hat; erlaubt sind nur YouTube-Links
//   https://www.youtube.com/watch?v=<ID>  (optional &t=<Sekunden>)   oder   https://youtu.be/<ID>  (optional ?si=…/?t=…)
// mit 11-stelliger Video-ID. Ausgegeben wird immer die Normalform https://www.youtube.com/watch?v=<ID>[&t=<n>] (ohne
// Tracking-Parameter). Videos ohne url erscheinen nirgends. Die Seiten zeigen sie nur als <a href> mit
// target="_blank" und rel="noopener noreferrer" – kein iframe, keine Änderung der CSP.

const fs = require('node:fs');
const path = require('node:path');

const STANDARD_DATEI = path.join(__dirname, '..', '..', 'seed', 'videos.json');
const NIVEAUS = Object.freeze(['eA', 'gA', 'beide']);
const FELDER = Object.freeze(['nr', 'titel', 'akte', 'ds', 'niveau', 'ordner', 'url']);
const MAX_DS = 13;

const YOUTUBE = /^https:\/\/www\.youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})(?:&t=(\d{1,5})s?)?$/;
const YOUTU_BE = /^https:\/\/youtu\.be\/([A-Za-z0-9_-]{11})(?:\?(?:si=[A-Za-z0-9_-]{1,64}|t=(\d{1,5})s?)(?:&(?:si=[A-Za-z0-9_-]{1,64}|t=(\d{1,5})s?))?)?$/;

/** YouTube-Link prüfen → Normalform oder null (nicht erlaubt). */
function youtubeUrl(roh) {
  if (typeof roh !== 'string' || roh.length > 200) return null;
  let m = YOUTUBE.exec(roh);
  if (m) return `https://www.youtube.com/watch?v=${m[1]}${m[2] ? `&t=${Number(m[2])}` : ''}`;
  m = YOUTU_BE.exec(roh);
  if (m) {
    const t = m[2] || m[3];
    return `https://www.youtube.com/watch?v=${m[1]}${t ? `&t=${Number(t)}` : ''}`;
  }
  return null;
}

/**
 * Inhalt von seed/videos.json prüfen. → { fehler: string[], hinweise: string[] }
 * @param {object} d geparstes JSON
 * @param {{ videoOrdner?: string }} opt videoOrdner = materialien/Videos (dann muss „ordner“ dort existieren)
 */
function pruefeVideos(d, { videoOrdner = null } = {}) {
  const fehler = [];
  const hinweise = [];
  if (d === null || typeof d !== 'object' || Array.isArray(d)) return { fehler: ['erwartet { "version": 1, "videos": [ … ] }'], hinweise };
  if (d.version !== 1) fehler.push('version muss 1 sein.');
  for (const k of Object.keys(d)) if (!['version', 'videos', '_hinweis'].includes(k)) fehler.push(`unbekanntes Feld „${k}“.`);
  if (!Array.isArray(d.videos)) {
    fehler.push('videos muss eine Liste sein.');
    return { fehler, hinweise };
  }
  const nummern = new Set();
  const urls = new Set();
  d.videos.forEach((v, i) => {
    const ort = `videos[${i}]`;
    if (v === null || typeof v !== 'object' || Array.isArray(v)) {
      fehler.push(`${ort}: kein Objekt.`);
      return;
    }
    for (const k of Object.keys(v)) if (!FELDER.includes(k)) fehler.push(`${ort}: unbekanntes Feld „${k}“.`);
    if (!Number.isInteger(v.nr) || v.nr < 0 || v.nr > 99) fehler.push(`${ort}: nr muss eine ganze Zahl 0–99 sein.`);
    else if (nummern.has(v.nr)) fehler.push(`${ort}: nr ${v.nr} doppelt.`);
    else nummern.add(v.nr);
    if (typeof v.titel !== 'string' || !v.titel.trim() || v.titel.length > 120) fehler.push(`${ort}: titel muss ein Text mit 1–120 Zeichen sein.`);
    if (!Number.isInteger(v.akte) || v.akte < 0 || v.akte > 7) fehler.push(`${ort}: akte muss 0–7 sein (0 = Start/übergreifend).`);
    if (!Array.isArray(v.ds) || !v.ds.length || v.ds.some((x) => !Number.isInteger(x) || x < 1 || x > MAX_DS)) fehler.push(`${ort}: ds muss eine nicht-leere Liste von Doppelstunden 1–${MAX_DS} sein.`);
    if (v.niveau !== undefined && !NIVEAUS.includes(v.niveau)) fehler.push(`${ort}: niveau muss eA, gA oder beide sein.`);
    if (v.ordner !== undefined) {
      if (typeof v.ordner !== 'string' || !/^[A-Za-z0-9_-]{1,80}$/.test(v.ordner)) fehler.push(`${ort}: ordner ungültig.`);
      else if (videoOrdner && !fs.existsSync(path.join(videoOrdner, v.ordner, 'video.json'))) hinweise.push(`${ort}: materialien/Videos/${v.ordner}/video.json fehlt.`);
    }
    if (v.url !== null && v.url !== undefined) {
      const u = youtubeUrl(v.url);
      if (!u) fehler.push(`${ort}: url ${JSON.stringify(String(v.url).slice(0, 80))} ist kein erlaubter YouTube-Link (nur https://www.youtube.com/watch?v=<ID> oder https://youtu.be/<ID>).`);
      else if (urls.has(u)) fehler.push(`${ort}: url doppelt.`);
      else urls.add(u);
    }
  });
  if (d.videos.length && !urls.size) hinweise.push('noch keine Video-Links eingetragen (url: null) – es erscheinen keine Video-Knöpfe.');
  return { fehler, hinweise };
}

/** seed/videos.json laden; bei Fehlern leere Liste (Log). → geprüfter Inhalt oder null */
function ladeVideos(datei = STANDARD_DATEI, { log = () => {} } = {}) {
  let d;
  try {
    let t = fs.readFileSync(datei, 'utf8');
    if (t.charCodeAt(0) === 0xfeff) t = t.slice(1);
    d = JSON.parse(t);
  } catch (e) {
    log(`Videos ${path.basename(datei)}: ${e.code === 'ENOENT' ? 'Datei nicht gefunden' : 'kein gültiges JSON'} – keine Video-Knöpfe.`);
    return null;
  }
  const r = pruefeVideos(d);
  if (r.fehler.length) {
    log(`Videos ${path.basename(datei)}: ${r.fehler.length} Fehler – keine Video-Knöpfe.`);
    for (const t of r.fehler) log(`  ${t}`);
    return null;
  }
  return d;
}

/**
 * Dienst über geprüfte Daten (null → keine Videos). Öffentlich sind nur Videos mit url: { nr, titel, akte, ds, niveau, url }.
 */
function erzeugeVideos(daten) {
  const liste = (daten && Array.isArray(daten.videos) ? daten.videos : [])
    .map((v) => ({ v, url: youtubeUrl(v.url) }))
    .filter((x) => x.url)
    .map(({ v, url }) => Object.freeze({ nr: v.nr, titel: v.titel, akte: v.akte, ds: Object.freeze([...v.ds]), niveau: v.niveau || 'beide', url }))
    .sort((a, b) => a.nr - b.nr);

  const kopie = (v) => ({ ...v, ds: [...v.ds] });
  const passtNiveau = (v, niveau) => niveau !== 'gA' || v.niveau !== 'eA';

  return {
    /** Alle Videos mit Link (optional ohne eA-Videos für gA). */
    alle: ({ niveau = null } = {}) => liste.filter((v) => passtNiveau(v, niveau)).map(kopie),
    /** Videos zu Doppelstunden (Überschneidung der DS-Listen), z. B. einer Ermittlung oder Akte. */
    fuerDs: (ds, { niveau = null } = {}) => {
      const menge = new Set(Array.isArray(ds) ? ds : []);
      return liste.filter((v) => passtNiveau(v, niveau) && v.ds.some((x) => menge.has(x))).map(kopie);
    }
  };
}

module.exports = { youtubeUrl, pruefeVideos, ladeVideos, erzeugeVideos, STANDARD_DATEI };
