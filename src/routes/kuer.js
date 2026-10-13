'use strict';
// Kür K1 – Ausführen in der Schreib-Konsole (Plan Phase 6 Task 7, Spec §3.3, §7.4, §7.14).
//
//   POST /api/kurse/:kurs/aufgaben/:id/skript   { skript }
//
// Nur angemeldet (Schüler, Lehrkraft, Superadmin); Zugang, Niveau (gA: keine Kür) und Freischaltung wie
// GET /api/kurse/:kurs/aufgaben/:id (src/services/lernen.js schreibStart). Die Aufgabe muss eine Schreib-Aufgabe sein
// (sql mit schreiben: true) – Startdatenbank bzw. Startskript kommen ausschließlich aus dem Inhalt, nie aus der Anfrage.
// Ausgeführt wird in der Sandbox (Kindprozess, frische In-Memory-DB je Anfrage, Grenzen siehe src/sql/sandbox.js);
// gespeichert wird nichts – das Skript bleibt im localStorage des Geräts (E7). Ein leeres Skript liefert nur das Schema
// der Startdatenbank (für den Schema-Browser).
// Rate-Limit 30/min je Konto (konfig.rateLimits.kuerSkript), vor der Prüfung der Anfrage. CSRF: pruefeHerkunft (app.js).
//
// Antwort 200: { ok: true, protokoll: [{ nr, zeile, art, aenderungen }], ergebnis: { spalten, zeilen (≤ 300), gesamt,
//   abgeschnitten } | null, tabellen: [{ tabelle, spalten, zeilen }], ms }
//   oder { ok: false, fehler (deutsch, mit „Anweisung n (Zeile z)“), code, anweisung?, zeile?, protokoll }.
//   400 ungültig · 401 nicht angemeldet · 403/404 kein Zugang · 429 Rate-Limit · 503 Sandbox überlastet/nicht verfügbar.

const express = require('express');
const { nurAngemeldet } = require('../kern/sitzung');
const { rateLimit } = require('../kern/sicherheit');
const { istKursId } = require('../kern/verbund');
const { MAX_SKRIPT } = require('../sql/skript');
const FS = require('../sql/fehlertexte_schreiben');

const MAX_ANZEIGE = 300;
const NUR_SCHEMA = 'SELECT 1 WHERE 0;';
const TECHNISCH = new Set(['ueberlastet', 'absturz', 'beendet']);

function kuerRouten({ lernen, sandbox, konfig }) {
  const router = express.Router();
  const angemeldet = nurAngemeldet(['schueler', 'lehrkraft', 'superadmin']);
  const limits = konfig.rateLimits || {};
  const begrenzer = rateLimit({
    fensterMs: 60000,
    max: 30,
    ...limits.kuerSkript,
    jetzt: konfig.jetzt || Date.now,
    schluessel: (req) => 'kuer:' + req.sitzung.sub
  });

  router.post('/api/kurse/:kurs/aufgaben/:id/skript', angemeldet, begrenzer, async (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    try {
      if (!istKursId(req.params.kurs)) return res.status(400).json({ error: 'Ungültige Kurs-ID.' });
      const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
      const { skript } = body;
      if (typeof skript !== 'string' || skript.length > MAX_SKRIPT || Object.keys(body).some((k) => k !== 'skript')) {
        return res.status(400).json({ error: 'Ungültige Anfrage.' });
      }
      const { start } = lernen.schreibStart(req.sitzung, req.params.kurs, req.params.id);
      const nurSchema = skript.trim() === '';
      const e = await sandbox.fuehreSkriptAus({ start, skript: nurSchema ? NUR_SCHEMA : skript });
      if (!e || !e.ok) {
        const f = e || { code: 'absturz' };
        const { code, text } = FS.mitOrt(f);
        if (TECHNISCH.has(f.code)) return res.status(503).json({ ok: false, fehler: text, code });
        const antwort = { ok: false, fehler: text, code, protokoll: Array.isArray(f.protokoll) ? f.protokoll : [] };
        if (Number.isInteger(f.anweisung)) antwort.anweisung = f.anweisung;
        if (Number.isInteger(f.zeile)) antwort.zeile = f.zeile;
        return res.json(antwort);
      }
      const erg = e.ergebnis;
      res.json({
        ok: true,
        protokoll: nurSchema ? [] : e.protokoll,
        ergebnis: nurSchema || !erg
          ? null
          : { spalten: erg.spalten, zeilen: erg.zeilen.slice(0, MAX_ANZEIGE), gesamt: erg.anzahl, abgeschnitten: !!erg.abgeschnitten },
        tabellen: e.tabellen,
        ms: e.ms
      });
    } catch (fehler) {
      next(fehler);
    }
  });

  // Fachliche Fehler (HttpFehler aus lernen) mit ihrem Text; alles andere an den allgemeinen Fehler-Handler.
  // eslint-disable-next-line no-unused-vars
  router.use((err, req, res, next) => {
    if (err && err.name === 'HttpFehler' && err.status >= 400 && err.status < 600) return res.status(err.status).json({ error: err.message });
    next(err);
  });

  return router;
}

module.exports = { kuerRouten };
