'use strict';
// Material-Downloads nach Rolle (Plan Phase 6 Task 5, Spec §7.11, §7.12, §12.1, §12.4, E13). Format der Whitelists:
// docs/MATERIALIEN.md, Abschnitt „Whitelists“.
//
// Stufen (nur Dateien aus der Whitelist `materialien/<Ordner>/verzeichnis.json`, die es wirklich gibt):
//   schueler  Arbeitsblaetter_PDF (Schülerfassungen)          angemeldet: schueler, lehrkraft, superadmin
//   lehrkraft Loesungen_Portal + Lehrkraft_PDF                 nur lehrkraft, superadmin
//   original  Originale/verzeichnis.json → docx/pptx/md unter materialien/ (Akten-Ordner)   nur superadmin
//   gast      Gast_PDF/verzeichnis.json → einzelne PDFs aus Arbeitsblaetter_PDF/Lehrkraft_PDF (öffentlich);
//             Lösungen, Erwartungshorizonte, Klausuren nur mit "ausdruecklich": true (sonst übersprungen)
//
// Jede Datei hat einen Pfad relativ zu materialien/ („pfad“, z. B. Arbeitsblaetter_PDF/Akte1/DD_A1-AB1_….pdf); er ist
// zugleich der Schlüssel in der URL (/material/<stufe>/<pfad>). Pfade werden beim Laden streng geprüft (Segmente aus
// Buchstaben, Ziffern, „_“, „-“, „.“, Leerzeichen, Klammern; kein „..“, keine versteckten Dateien, nur erlaubte
// Endungen) und beim Ausliefern nochmals gegen die Wurzel (realpath) – die Route reicht nur Whitelist-Schlüssel durch.

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const STANDARD_VERZEICHNIS = path.join(__dirname, '..', '..', 'materialien');
const WHITELIST = 'verzeichnis.json';

const STUFEN = Object.freeze({
  schueler: Object.freeze({ ordner: ['Arbeitsblaetter_PDF'], rollen: ['schueler', 'lehrkraft', 'superadmin'], endungen: ['.pdf'] }),
  lehrkraft: Object.freeze({ ordner: ['Loesungen_Portal', 'Lehrkraft_PDF'], rollen: ['lehrkraft', 'superadmin'], endungen: ['.pdf'] }),
  original: Object.freeze({ ordner: ['Originale'], rollen: ['superadmin'], endungen: ['.docx', '.pptx', '.md'] }),
  gast: Object.freeze({ ordner: ['Gast_PDF'], rollen: null, endungen: ['.pdf'] })
});
/** Reihenfolge der Stufen in Listen. */
const STUFEN_REIHE = Object.freeze(['gast', 'schueler', 'lehrkraft', 'original']);

/** Ordner, aus denen die Gast-Whitelist Dateien freigeben darf (Loesungen_Portal nur „ausdruecklich“). */
const GAST_ORDNER = Object.freeze(['Arbeitsblaetter_PDF', 'Lehrkraft_PDF', 'Loesungen_Portal']);
/** Erzeugte Ordner – Originale dürfen nicht auf sie zeigen. */
const ERZEUGTE_ORDNER = Object.freeze(['Arbeitsblaetter_PDF', 'Loesungen_Portal', 'Gast_PDF', 'Lehrkraft_PDF', 'Originale']);

const NIVEAUS = Object.freeze(['eA', 'gA', 'beide']);
/** „alle“ (Schreibweise im Seed) gilt als „beide“. */
const NIVEAU_ALIAS = Object.freeze({ alle: 'beide' });
/** Arten (docs/MATERIALIEN.md); die Kurzformen der Phase-7-Pipeline (ab, generalprobe, klausur, kuer) gelten mit. */
const ARTEN = Object.freeze([
  'arbeitsblatt', 'loesung', 'praesentation', 'handout', 'warmup', 'handbuch', 'unplugged', 'lehrerhinweise',
  'pruefung', 'erwartungshorizont', 'gesamt', 'video', 'ab', 'generalprobe', 'klausur', 'kuer'
]);
const LOESUNGS_ARTEN = Object.freeze(['loesung', 'pruefung', 'erwartungshorizont', 'klausur']);
const LOESUNGS_NAME = /(?:^|[_\-\s])LSG(?:[_\-.\s]|$)|L(?:oe|ö)sung|Erwartungshorizont|Klausur|(?:^|[_\-\s])EH(?:[_\-.\s]|$)/i;

const SEGMENT = /^[\p{L}\p{N}_][\p{L}\p{N} ._()+,-]{0,150}$/u;
const MAX_PFAD = 400;
const STANDARD_ZIP_LIMIT = 200 * 1024 * 1024;

const TYPEN = Object.freeze({
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.md': 'text/markdown; charset=utf-8'
});

const istObjekt = (w) => w !== null && typeof w === 'object' && !Array.isArray(w);

/**
 * Relativen Pfad prüfen und normalisieren (NFC, „/“ als Trenner). Liefert den Pfad oder null.
 * endungen: erlaubte Endungen (klein).
 */
function normalisierePfad(roh, endungen) {
  if (typeof roh !== 'string') return null;
  const p = roh.normalize('NFC');
  if (!p || p.length > MAX_PFAD) return null;
  const segmente = p.split('/');
  if (segmente.some((s) => !SEGMENT.test(s) || s.endsWith('.') || s.endsWith(' '))) return null;
  const endung = path.extname(p).toLowerCase();
  if (!endungen.includes(endung)) return null;
  return segmente.join('/');
}

/** Akte: 0–7 (0 = übergreifend) oder "kuer"; sonst null. */
function akteVon(w) {
  if (Number.isInteger(w) && w >= 0 && w <= 7) return w;
  if (w === 'kuer') return 'kuer';
  return null;
}

/** ASCII-Dateiname für Content-Disposition (Umlaute ausgeschrieben, Rest „_“). */
function asciiName(name) {
  const ersetzt = String(name)
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/Ä/g, 'Ae').replace(/Ö/g, 'Oe').replace(/Ü/g, 'Ue')
    .replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9._-]/g, '_');
  return ersetzt.replace(/^[._]+/, '') || 'datei';
}

/** Kurze, stabile ID eines Pfads (verrät den Pfad nicht, z. B. für die öffentliche Themenseite). */
const idVon = (pfad) => crypto.createHash('sha256').update(pfad).digest('hex').slice(0, 12);

/** Sieht ein Gast-Eintrag nach Lösung, Erwartungshorizont oder Klausur aus? */
const wieLoesung = (ordner, datei, art, fassung) =>
  ordner === 'Loesungen_Portal' || fassung === 'loesung' || LOESUNGS_ARTEN.includes(art) || LOESUNGS_NAME.test(path.basename(datei));

/** Whitelist-Datei lesen: { dateien } | { fehlt: true } | { fehler: text }. */
function leseWhitelist(datei) {
  let text;
  try {
    text = fs.readFileSync(datei, 'utf8');
  } catch (e) {
    return e.code === 'ENOENT' ? { fehlt: true } : { fehler: `nicht lesbar (${e.code || e.message})` };
  }
  let roh;
  try {
    roh = JSON.parse(text);
  } catch {
    return { fehler: 'kein gültiges JSON' };
  }
  if (!istObjekt(roh) || !Array.isArray(roh.dateien)) return { fehler: 'erwartet { "dateien": [ … ] }' };
  return { dateien: roh.dateien };
}

/**
 * Whitelists einer Material-Wurzel einlesen und prüfen. Liefert je Stufe die gültigen Einträge (ohne Existenzprüfung)
 * sowie Fehler und Hinweise (für den Validator).
 */
function ladeAlle(verzeichnis) {
  const fehler = [];
  const hinweise = [];
  const stufen = { schueler: [], lehrkraft: [], original: [], gast: [] };

  for (const [stufe, def] of Object.entries(STUFEN)) {
    for (const ordner of def.ordner) {
      const rel = `${ordner}/${WHITELIST}`;
      const w = leseWhitelist(path.join(verzeichnis, ordner, WHITELIST));
      if (w.fehlt) continue;
      if (w.fehler) {
        fehler.push({ datei: rel, text: w.fehler });
        continue;
      }
      const gesehen = new Set();
      w.dateien.forEach((e, i) => {
        const wo = `${rel} [${i}]`;
        if (!istObjekt(e)) {
          fehler.push({ datei: wo, text: 'Eintrag ist kein Objekt.' });
          return;
        }
        const anzeige = JSON.stringify(e.datei);
        let quelleOrdner = ordner;
        let endungen = def.endungen;
        if (stufe === 'gast') {
          if (!GAST_ORDNER.includes(e.ordner)) {
            fehler.push({ datei: wo, text: `ordner ${JSON.stringify(e.ordner)} ist für die Gast-Auswahl nicht erlaubt (${anzeige}).` });
            return;
          }
          quelleOrdner = e.ordner;
          endungen = STUFEN.gast.endungen;
        }
        const datei = normalisierePfad(e.datei, endungen);
        if (!datei) {
          fehler.push({ datei: wo, text: `ungültiger Dateipfad oder Endung ${anzeige} (erlaubt: ${endungen.join(', ')}; kein „..“).` });
          return;
        }
        let pfad;
        if (stufe === 'original') {
          if (ERZEUGTE_ORDNER.includes(datei.split('/')[0])) {
            fehler.push({ datei: wo, text: `Originale liegen in den Akten-Ordnern, nicht in ${datei.split('/')[0]} (${anzeige}).` });
            return;
          }
          pfad = datei;
        } else pfad = `${quelleOrdner}/${datei}`;
        const schluessel = stufe === 'gast' ? datei : pfad;
        if (gesehen.has(schluessel)) {
          fehler.push({ datei: wo, text: `doppelt: ${anzeige}.` });
          return;
        }
        gesehen.add(schluessel);

        const akte = akteVon(e.akte);
        if (e.akte !== undefined && e.akte !== null && akte === null) fehler.push({ datei: wo, text: `akte ${JSON.stringify(e.akte)} ungültig (0–7 oder "kuer").` });
        const niveau = e.niveau === undefined || e.niveau === null ? 'beide' : NIVEAU_ALIAS[e.niveau] || e.niveau;
        if (!NIVEAUS.includes(niveau)) fehler.push({ datei: wo, text: `niveau ${JSON.stringify(e.niveau)} ungültig (eA, gA, beide).` });
        const art = e.art === undefined ? null : e.art;
        if (art !== null && !ARTEN.includes(art)) fehler.push({ datei: wo, text: `art ${JSON.stringify(e.art)} unbekannt.` });
        if (e.titel !== undefined && (typeof e.titel !== 'string' || !e.titel.trim())) fehler.push({ datei: wo, text: 'titel muss ein nicht-leerer Text sein.' });

        const eintrag = {
          stufe,
          pfad,
          datei: schluessel,
          id: idVon(pfad),
          titel: typeof e.titel === 'string' && e.titel.trim() ? e.titel.trim() : path.basename(datei),
          akte,
          niveau: NIVEAUS.includes(niveau) ? niveau : 'beide',
          art: ARTEN.includes(art) ? art : null
        };
        if (stufe === 'gast') {
          eintrag.ordner = quelleOrdner;
          eintrag.fassung = e.fassung === 'lehrkraft' || quelleOrdner !== 'Arbeitsblaetter_PDF' ? 'lehrkraft' : 'schueler';
          if (wieLoesung(quelleOrdner, datei, art, e.fassung)) {
            if (e.ausdruecklich !== true) {
              hinweise.push({ datei: wo, text: `Gast-Auswahl: ${pfad} sieht nach Lösung/Erwartungshorizont/Klausur aus und wird ohne "ausdruecklich": true nicht ausgeliefert.` });
              return;
            }
            hinweise.push({ datei: wo, text: `Warnung Gast-Auswahl: ${pfad} (Lösung/Erwartungshorizont/Klausur) ist ausdrücklich öffentlich freigegeben – bitte bestätigen.` });
          }
        }
        stufen[stufe].push(eintrag);
      });
    }
  }
  return { stufen, fehler, hinweise };
}

/** Absoluter Pfad, wenn die Datei existiert, eine reguläre Datei ist und (auch nach Symlinks) unter der Wurzel liegt. */
function vorhanden(wurzelEcht, verzeichnis, pfad) {
  const abs = path.join(verzeichnis, ...pfad.split('/'));
  try {
    const echt = fs.realpathSync(abs);
    if (!echt.startsWith(wurzelEcht + path.sep)) return null;
    const st = fs.statSync(echt);
    return st.isFile() ? { abs: echt, groesse: st.size, datum: st.mtime } : null;
  } catch {
    return null;
  }
}

/**
 * Prüfung für `npm run validate`: Formatfehler sind Fehler, fehlende Dateien und Gast-Lösungen Hinweise.
 * @returns {{ fehler: {datei,text}[], hinweise: {datei,text}[] }}
 */
function pruefeVerzeichnisse(verzeichnis = STANDARD_VERZEICHNIS) {
  const { stufen, fehler, hinweise } = ladeAlle(verzeichnis);
  let wurzelEcht;
  try {
    wurzelEcht = fs.realpathSync(verzeichnis);
  } catch {
    return { fehler, hinweise };
  }
  for (const liste of Object.values(stufen)) {
    for (const e of liste) {
      if (!vorhanden(wurzelEcht, verzeichnis, e.pfad)) hinweise.push({ datei: `materialien/${e.pfad}`, text: `gelistet (${e.stufe}), aber nicht vorhanden: ${e.pfad}` });
    }
  }
  return { fehler: fehler.map((f) => ({ ...f, datei: `materialien/${f.datei}` })), hinweise };
}

/**
 * @param {{ verzeichnis?: string, log?: Function, zipLimitBytes?: number }} opt
 */
function erzeugeMaterial({ verzeichnis = STANDARD_VERZEICHNIS, log = () => {}, zipLimitBytes = STANDARD_ZIP_LIMIT } = {}) {
  let stufen;
  let wurzelEcht = null;

  function neuLaden() {
    const r = ladeAlle(verzeichnis);
    for (const f of r.fehler) log(`Materialien: ${f.datei} übersprungen – ${f.text}`);
    for (const h of r.hinweise) log(`Materialien: ${h.datei} – ${h.text}`);
    stufen = r.stufen;
    try {
      wurzelEcht = fs.realpathSync(verzeichnis);
    } catch {
      wurzelEcht = null;
    }
  }
  neuLaden();

  const finde = (stufe, schluessel) => (stufen[stufe] || []).find((e) => e.datei === schluessel) || null;

  /** Alle gültigen Einträge einer Stufe (ohne Existenzprüfung; für Tests und die Themenseite). */
  const eintraege = (stufe) => (stufen[stufe] || []).map((e) => ({ ...e }));

  /** Datei einer Stufe zum Ausliefern: { root, rel, name, typ, groesse } oder null. */
  function datei(stufe, schluessel) {
    if (!wurzelEcht || typeof schluessel !== 'string') return null;
    const e = finde(stufe, schluessel.normalize('NFC'));
    if (!e) return null;
    const v = vorhanden(wurzelEcht, verzeichnis, e.pfad);
    if (!v) return null;
    return {
      root: wurzelEcht,
      rel: path.relative(wurzelEcht, v.abs).split(path.sep).join('/'),
      name: asciiName(path.basename(e.pfad)),
      typ: TYPEN[path.extname(e.pfad).toLowerCase()],
      groesse: v.groesse
    };
  }

  const url = (stufe, e) =>
    stufe === 'gast'
      ? '/gast/material/' + e.datei.split('/').map(encodeURIComponent).join('/')
      : `/material/${stufe}/` + e.pfad.split('/').map(encodeURIComponent).join('/');

  /** Öffentliche Sicht eines Eintrags (vorhandene Dateien), ohne absolute Pfade. */
  function sicht(stufe, e) {
    const v = wurzelEcht && vorhanden(wurzelEcht, verzeichnis, e.pfad);
    if (!v) return null;
    const out = { id: e.id, datei: e.datei, titel: e.titel, akte: e.akte, niveau: e.niveau, art: e.art, groesse: v.groesse, url: url(stufe, e) };
    if (stufe === 'gast') out.fassung = e.fassung;
    return out;
  }

  /** Liste einer Stufe (nur vorhandene Dateien), optional ohne eA-Material (Niveau gA). */
  function liste(stufe, { niveau = null } = {}) {
    return (stufen[stufe] || [])
      .filter((e) => niveau !== 'gA' || e.niveau !== 'eA')
      .map((e) => sicht(stufe, e))
      .filter(Boolean);
  }

  /** Stufen, die eine Rolle sehen darf (anonym: nur gast). */
  const stufenFuer = (rolle) => STUFEN_REIHE.filter((s) => s === 'gast' || (rolle && STUFEN[s].rollen.includes(rolle)));

  /** Originale einer Akte (vorhandene), für das ZIP; ohne Akte (null) zählt als 0 = übergreifend. */
  const zipGruppe = (e) => (e.akte === null ? 0 : e.akte);
  function zipEintraege(akte) {
    if (!wurzelEcht) return [];
    return stufen.original
      .filter((e) => zipGruppe(e) === akte)
      .map((e) => {
        const v = vorhanden(wurzelEcht, verzeichnis, e.pfad);
        return v ? { name: e.pfad, abs: v.abs, groesse: v.groesse, datum: v.datum } : null;
      })
      .filter(Boolean);
  }

  /** ZIP-Gruppen (Akten mit mindestens einem vorhandenen Original). */
  function zips() {
    const akten = [...new Set(stufen.original.map(zipGruppe))];
    akten.sort((a, b) => (a === 'kuer' ? 99 : a) - (b === 'kuer' ? 99 : b));
    return akten
      .map((akte) => {
        const d = zipEintraege(akte);
        return d.length
          ? { akte, anzahl: d.length, groesse: d.reduce((s, x) => s + x.groesse, 0), url: `/material/original-zip/${akte}`, name: zipName(akte) }
          : null;
      })
      .filter(Boolean);
  }

  return { neuLaden, eintraege, datei, liste, stufenFuer, zipEintraege, zips, zipLimitBytes, verzeichnis };
}

function zipName(akte) {
  if (akte === 0) return 'Datendetektei_Gesamt_Originale.zip';
  if (akte === 'kuer') return 'Datendetektei_Kuer_Originale.zip';
  return `Datendetektei_Akte${akte}_Originale.zip`;
}

module.exports = {
  erzeugeMaterial,
  pruefeVerzeichnisse,
  normalisierePfad,
  asciiName,
  idVon,
  zipName,
  STUFEN,
  STUFEN_REIHE,
  GAST_ORDNER,
  NIVEAUS,
  ARTEN,
  TYPEN,
  STANDARD_VERZEICHNIS
};
