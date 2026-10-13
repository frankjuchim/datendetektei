'use strict';
// Öffentliche Auslieferung der Übungs-Datenbanken (Spec §7.2, Plan Phase 2 Task 5):
//   GET /db/:name.sqlite        Haupt-DB als SQLite-Datei (für sql.js im Browser)
//   GET /api/db/:name/schema    Schema [{ tabelle, spalten: [{ name, typ, pk, fk }], zeilen }]
//   POST /api/sql/ausfuehren    (sqlAusfuehrenRoute, unten) Fallback der Konsole ohne WebAssembly
// Nur Namen aus OEFFENTLICHE_DATENBANKEN, die auch geladen sind; Varianten und Verhör-DBs nie. Kein Dateizugriff
// je Anfrage: ausgeliefert werden die beim Start geladenen Buffer.

const crypto = require('node:crypto');
const express = require('express');
const { OEFFENTLICHE_DATENBANKEN } = require('../sql/datenbanken');
const { MAX_LAENGE } = require('../sql/sandbox');
const fehlertexte = require('../sql/fehlertexte');
const { leseSitzung } = require('../kern/sitzung');
const { rateLimit } = require('../kern/sicherheit');

const CACHE = 'public, max-age=3600';

function sqlRouten(datenbanken) {
  // Je öffentlicher, geladener DB einmal: Buffer, ETag (SHA-256), Schema als JSON.
  const eintraege = new Map();
  for (const name of OEFFENTLICHE_DATENBANKEN) {
    if (!datenbanken.namen.includes(name)) continue;
    const buffer = datenbanken.haupt(name);
    eintraege.set(name, {
      buffer,
      etag: `"${crypto.createHash('sha256').update(buffer).digest('hex')}"`,
      schema: JSON.stringify(datenbanken.schema(name))
    });
  }

  function sende(req, res, etag, typ, inhalt) {
    res.set('Content-Type', typ);
    res.set('Cache-Control', CACHE);
    res.set('ETag', etag);
    if (req.fresh) {
      res.status(304).end();
      return;
    }
    res.send(inhalt);
  }

  const router = express.Router({ caseSensitive: true, strict: true });

  router.get('/db/:datei', (req, res, next) => {
    const m = /^([a-z]+)\.sqlite$/.exec(req.params.datei);
    const e = m ? eintraege.get(m[1]) : undefined;
    if (!e) {
      next();
      return;
    }
    sende(req, res, e.etag, 'application/vnd.sqlite3', e.buffer);
  });

  router.get('/api/db/:name/schema', (req, res, next) => {
    const e = eintraege.get(req.params.name);
    if (!e) {
      next();
      return;
    }
    sende(req, res, `${e.etag.slice(0, -1)}-schema"`, 'application/json; charset=utf-8', e.schema);
  });

  return router;
}

// ---------------------------------------------------------------------------------------------------------------
// POST /api/sql/ausfuehren { db, sql } – Fallback der Ermittlungskonsole ohne WebAssembly (Spec §18, Plan Phase 2
// Task 12). Führt genau eine lesende Anweisung in der Sandbox (Kindprozesse) auf der HAUPT-DB aus – nie auf einer
// Variante, egal was die Anfrage enthält. Eisdiele ohne Anmeldung, die übrigen öffentlichen Akten-DBs nur
// angemeldet. Rate-Limit 30/min je Konto bzw. je IP ohne Anmeldung (vor der Prüfung der Anfrage, damit auch
// ungültige Anfragen zählen). Origin-Prüfung und JSON-Pflicht übernimmt pruefeHerkunft in app.js.
//
// Antwort 200: { spalten, zeilen (≤ 300), gesamt, abgeschnitten, ms } – abgeschnitten = true, wenn die Sandbox
//   nach 5 000 Zeilen aufgehört hat (gesamt ist dann eine Untergrenze) – oder { fehler, code } (deutscher Text aus
//   fehlertexte.js, nie die Rohmeldung). 400 ungültig · 401 nicht angemeldet · 404 unbekannte DB · 429 Rate-Limit ·
//   503 Sandbox überlastet/nicht verfügbar.

const MAX_ANZEIGE = 300;
const OHNE_ANMELDUNG = new Set(['eisdiele']);
const TEXT_NICHT_VERFUEGBAR = 'Die Abfrage konnte gerade nicht ausgeführt werden. Versuch es gleich noch einmal.';

// Codes der Sandbox → interne Codes von fehlertexte.js
const SANDBOX_CODES = {
  leer: 'LEER',
  zu_lang: 'ZU_LANG',
  verboten: 'VERBOTEN',
  mehrere_anweisungen: 'MEHRERE_ANWEISUNGEN',
  nicht_lesend: 'NICHT_LESEND',
  zeitlimit: 'ZEITLIMIT',
  ueberlastet: 'UEBERLASTET'
};

/** Sandbox-Fehler → { status, body } mit deutschem Text. */
function fehlerAntwort(e) {
  if (e.code === 'sql_fehler') {
    const { code, text } = fehlertexte.ordneZu(e.text);
    return { status: 200, body: { fehler: text, code } };
  }
  const intern = SANDBOX_CODES[e.code];
  if (intern) {
    const zusatz = { ms: e.ms, max: e.max, wort: e.wort, code: intern };
    if (intern === 'VERBOTEN' && e.wort === '.') zusatz.wort = 'Ein Punkt-Befehl (z. B. .tables)';
    const { code, text } = fehlertexte.ordneZu(zusatz);
    return { status: intern === 'UEBERLASTET' ? 503 : 200, body: { fehler: text, code } };
  }
  return { status: 503, body: { fehler: TEXT_NICHT_VERFUEGBAR, code: 'NICHT_VERFUEGBAR' } };
}

function sqlAusfuehrenRoute({ sandbox, konfig }) {
  const router = express.Router({ caseSensitive: true, strict: true });
  const limit = (konfig.rateLimits && konfig.rateLimits.sqlAusfuehren) || {};
  const begrenzer = rateLimit({
    fensterMs: 60000,
    max: 30,
    ...limit,
    jetzt: konfig.jetzt || Date.now,
    schluessel: (req) => (req.sitzung ? 'konto:' + req.sitzung.sub : 'ip:' + req.ip)
  });

  router.post(
    '/api/sql/ausfuehren',
    (req, res, next) => {
      res.set('Cache-Control', 'no-store');
      req.sitzung = leseSitzung(req, req.app.locals.konfig, req.app.locals.db);
      next();
    },
    begrenzer,
    async (req, res, next) => {
      try {
        const body = req.body && typeof req.body === 'object' ? req.body : {};
        const { db, sql } = body;
        if (typeof db !== 'string' || typeof sql !== 'string' || sql.length > MAX_LAENGE) {
          res.status(400).json({ error: 'Ungültige Anfrage.' });
          return;
        }
        if (!OEFFENTLICHE_DATENBANKEN.includes(db)) {
          res.status(404).json({ error: 'Nicht gefunden.' });
          return;
        }
        if (!req.sitzung && !OHNE_ANMELDUNG.has(db)) {
          res.status(401).json({ error: 'Nicht angemeldet.' });
          return;
        }
        // Bewusst nur db und sql: keine Variante, kein Modus aus der Anfrage.
        const e = await sandbox.fuehreAus({ db, sql });
        if (!e || !e.ok) {
          const antwort = fehlerAntwort(e || {});
          res.status(antwort.status).json(antwort.body);
          return;
        }
        res.json({
          spalten: e.spalten,
          zeilen: e.zeilen.slice(0, MAX_ANZEIGE),
          gesamt: e.anzahl,
          abgeschnitten: !!e.abgeschnitten,
          ms: e.ms
        });
      } catch (fehler) {
        next(fehler);
      }
    }
  );
  return router;
}

module.exports = { sqlRouten, sqlAusfuehrenRoute };
