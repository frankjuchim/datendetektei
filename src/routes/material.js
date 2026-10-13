'use strict';
// Material-Downloads nach Rolle (Plan Phase 6 Task 5, Spec §12.4, E13; Service: src/services/material.js).
//
//   GET /api/material[?kurs=k:<id>]       Liste je Rolle: { rolle, niveau, stufen: { gast, schueler?, lehrkraft?,
//                                         original? }, zips? } – anonym nur die Gast-Auswahl. Schüler: eA-Material
//                                         ausgeblendet, wenn der Kurs (bzw. ohne ?kurs alle eigenen Kurse) gA ist.
//   GET /material/schueler/<pfad>         Schülerfassungen (angemeldet: schueler, lehrkraft, superadmin)
//   GET /material/lehrkraft/<pfad>        Lösungen und Lehrkraft-PDFs (lehrkraft, superadmin)
//   GET /material/original/<pfad>         docx/pptx/md (nur superadmin)
//   GET /material/original-zip/<akte>     alle vorhandenen Originale einer Akte (0–7, kuer) als ZIP (nur superadmin)
//
// Dateien: anonym, falsche Rolle, nicht gelistet, nicht vorhanden oder ungültiger Pfad → 404 (gleiche Antwort, die
// Existenz einer Datei wird nicht verraten). Content-Disposition mit ASCII-Dateinamen, nosniff; Lehrkraft und
// Originale „private, no-store“, Schülerfassungen „private, no-cache“.

const express = require('express');
const fs = require('node:fs');
const { leseSitzung } = require('../kern/sitzung');
const { leseEinstellungen } = require('../services/stand');
const { STUFEN, zipName } = require('../services/material');
const { zipSchreiber } = require('../services/zip');

const SEGMENT = /^[\p{L}\p{N}_][\p{L}\p{N} ._()+,-]{0,150}$/u;
const KURS_ID = /^k:\d{1,12}$/;
const AKTE_ZIP = /^(?:[0-7]|kuer)$/;
const CACHE = Object.freeze({ gast: 'no-cache', schueler: 'private, no-cache', lehrkraft: 'private, no-store', original: 'private, no-store' });

/** Wildcard-Parameter (Express 5: Array dekodierter Segmente) → Schlüssel oder null (Segment ungültig). */
function schluesselAus(param) {
  const teile = Array.isArray(param) ? param : [param];
  if (!teile.length || teile.some((s) => typeof s !== 'string' || !SEGMENT.test(s.normalize('NFC')) || s.endsWith('.'))) return null;
  return teile.map((s) => s.normalize('NFC')).join('/');
}

/** Datei ausliefern ({ root, rel, name, typ } aus dem Service; sendFile immer mit root). */
function sendeMaterial(res, next, ziel, cache) {
  res.set('Cache-Control', cache);
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Content-Disposition', `${ziel.typ === 'application/pdf' ? 'inline' : 'attachment'}; filename="${ziel.name}"`);
  if (ziel.typ) res.type(ziel.typ);
  res.sendFile(ziel.rel, { root: ziel.root, dotfiles: 'deny', cacheControl: false }, (err) => {
    if (err && !res.headersSent) next();
  });
}

function materialRouten({ material }) {
  const router = express.Router({ caseSensitive: true, strict: true });

  const sitzung = (req) => leseSitzung(req, req.app.locals.konfig, req.app.locals.db);

  /** Niveau-Filter: { niveau } oder { status, error }. */
  function niveauFuer(req, s) {
    const db = req.app.locals.db;
    const kurs = req.query.kurs;
    if (kurs !== undefined) {
      if (typeof kurs !== 'string' || !KURS_ID.test(kurs)) return { status: 400, error: 'Ungültige Kurs-ID.' };
      const z =
        s.rolle === 'superadmin'
          ? db.prepare('SELECT einstellungen FROM kurse WHERE kurs_id = ?').get(kurs)
          : db.prepare('SELECT k.einstellungen FROM mitgliedschaften m JOIN kurse k ON k.kurs_id = m.kurs_id WHERE m.sub = ? AND m.kurs_id = ?').get(s.sub, kurs);
      if (!z) return { status: 403, error: 'Keine Berechtigung.' };
      return { niveau: leseEinstellungen(z.einstellungen).niveau };
    }
    if (s.rolle !== 'schueler') return { niveau: null };
    const kurse = db
      .prepare('SELECT k.einstellungen FROM mitgliedschaften m JOIN kurse k ON k.kurs_id = m.kurs_id WHERE m.sub = ?')
      .all(s.sub)
      .map((z) => leseEinstellungen(z.einstellungen).niveau);
    return { niveau: kurse.length && kurse.every((n) => n === 'gA') ? 'gA' : kurse.length ? 'eA' : null };
  }

  router.get('/api/material', (req, res) => {
    res.set('Cache-Control', 'private, no-store');
    const s = sitzung(req);
    if (!s) return res.json({ rolle: null, niveau: null, stufen: { gast: material.liste('gast') } });
    const n = niveauFuer(req, s);
    if (n.status) return res.status(n.status).json({ error: n.error });
    const stufen = {};
    for (const stufe of material.stufenFuer(s.rolle)) stufen[stufe] = material.liste(stufe, { niveau: stufe === 'gast' ? null : n.niveau });
    const antwort = { rolle: s.rolle, niveau: n.niveau, stufen };
    if (s.rolle === 'superadmin') antwort.zips = material.zips();
    return res.json(antwort);
  });

  router.get('/material/original-zip/:akte', async (req, res, next) => {
    const s = sitzung(req);
    if (!s || s.rolle !== 'superadmin' || !AKTE_ZIP.test(req.params.akte)) return next();
    const akte = req.params.akte === 'kuer' ? 'kuer' : Number(req.params.akte);
    const dateien = material.zipEintraege(akte);
    if (!dateien.length) return next();
    res.set('Cache-Control', 'private, no-store');
    res.set('X-Content-Type-Options', 'nosniff');
    if (dateien.reduce((sum, d) => sum + d.groesse, 0) > material.zipLimitBytes) {
      return res.status(413).type('text/plain; charset=utf-8').send('Das Archiv wäre zu groß. Bitte die Dateien einzeln herunterladen.');
    }
    res.type('application/zip');
    res.set('Content-Disposition', `attachment; filename="${zipName(akte)}"`);

    const schreibe = (buf) =>
      new Promise((ok) => {
        if (res.write(buf)) return ok();
        const weiter = () => {
          res.off('drain', weiter);
          res.off('close', weiter);
          ok();
        };
        res.once('drain', weiter);
        res.once('close', weiter);
      });
    const zip = zipSchreiber();
    try {
      for (const d of dateien) {
        const daten = await fs.promises.readFile(d.abs);
        for (const teil of zip.eintrag({ name: d.name, daten, datum: d.datum })) {
          await schreibe(teil);
          if (res.destroyed) return undefined;
        }
      }
      for (const teil of zip.abschluss()) await schreibe(teil);
      res.end();
    } catch (e) {
      console.error('ZIP der Originale abgebrochen:', e && e.message);
      res.destroy();
    }
    return undefined;
  });

  router.get('/material/:stufe/*pfad', (req, res, next) => {
    const stufe = req.params.stufe;
    if (!Object.hasOwn(STUFEN, stufe) || stufe === 'gast') return next();
    const s = sitzung(req);
    if (!s || !STUFEN[stufe].rollen.includes(s.rolle)) return next();
    const schluessel = schluesselAus(req.params.pfad);
    const ziel = schluessel && material.datei(stufe, schluessel);
    if (!ziel) return next();
    return sendeMaterial(res, next, ziel, CACHE[stufe]);
  });

  return router;
}

module.exports = { materialRouten, sendeMaterial, schluesselAus, CACHE };
