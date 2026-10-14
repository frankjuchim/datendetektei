'use strict';
// Sicherheits-Header (Vertrag §9, Spec §7.2/§7.14): strikte CSP ohne Inline-Ausnahmen,
// zusätzlich 'wasm-unsafe-eval' und worker-src 'self' für die SQL-Engine im Browser (sql.js).

const helmet = require('helmet');

const CSP_DIREKTIVEN = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'", "'wasm-unsafe-eval'"],
  workerSrc: ["'self'"],
  connectSrc: ["'self'"],
  imgSrc: ["'self'", 'data:'],
  styleSrc: ["'self'"],
  fontSrc: ["'self'"],
  frameAncestors: ["'none'"],
  baseUri: ["'none'"],
  formAction: ["'self'"],
  objectSrc: ["'none'"]
};

/** Middleware: helmet mit exakter CSP plus X-Robots-Tag: noindex. */
function sicherheitsHeader() {
  const hm = helmet({
    contentSecurityPolicy: { useDefaults: false, directives: CSP_DIREKTIVEN },
    xPoweredBy: false
  });
  return function sicherheit(req, res, next) {
    res.setHeader('X-Robots-Tag', 'noindex');
    hm(req, res, next);
  };
}

const SICHERE_METHODEN = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF-Schutz (Spec §7.14): Nicht-GET-Anfragen außerhalb der Verbund-API müssen von der eigenen Origin kommen
 * (Origin-Kopf, ersatzweise Referer), sonst 403. Anfragen mit Body müssen JSON sein, sonst 415.
 * Die Verbund-API ist ausgenommen (kein Browser beteiligt, eigene Token-Prüfung).
 */
function pruefeHerkunft(konfig) {
  const eigeneOrigin = new URL(konfig.plattformUrl).origin;
  const originVon = (wert) => {
    try {
      return new URL(wert).origin;
    } catch {
      return null;
    }
  };
  return function herkunft(req, res, next) {
    if (SICHERE_METHODEN.has(req.method) || req.path.startsWith('/api/verbund/')) return next();
    const origin = req.get('origin');
    const referer = req.get('referer');
    const quelle = origin !== undefined ? originVon(origin) : referer !== undefined ? originVon(referer) : null;
    if (quelle !== eigeneOrigin) return res.status(403).json({ error: 'Anfrage nicht erlaubt.' });
    const mitBody = Number(req.get('content-length') || 0) > 0 || req.get('transfer-encoding') !== undefined;
    if (mitBody && !req.is('application/json')) return res.status(415).json({ error: 'Nur JSON erlaubt.' });
    next();
  };
}

/**
 * Rate-Limit im Arbeitsspeicher (festes Fenster je Schlüssel; IPs nur im RAM, Spec §7.14).
 * Über dem Limit: 429 mit Retry-After (Sekunden); /api/* als JSON, sonst als Text.
 */
function rateLimit({ fensterMs, max, schluessel = () => 'alle', jetzt = Date.now }) {
  const zaehler = new Map();
  // Abgelaufene Einträge (z. B. IPs) nach dem Zeitfenster vergessen – bei Zugriffen höchstens einmal je Fenster und
  // zusätzlich per Timer (unref), damit sie auch ohne weitere Anfragen nicht im RAM bleiben (Sicherheits-Review Phase 8).
  let naechsteBereinigung = 0;
  const bereinige = (t) => {
    for (const [k, z] of zaehler) if (z.ende <= t) zaehler.delete(k);
    naechsteBereinigung = t + fensterMs;
  };
  const timer = setInterval(() => bereinige(jetzt()), Math.max(1000, fensterMs));
  if (typeof timer.unref === 'function') timer.unref();
  function begrenzer(req, res, next) {
    const t = jetzt();
    if (t >= naechsteBereinigung || zaehler.size > 10000) bereinige(t);
    const k = String(schluessel(req));
    let z = zaehler.get(k);
    if (!z || z.ende <= t) {
      z = { anzahl: 0, ende: t + fensterMs };
      zaehler.set(k, z);
    }
    z.anzahl += 1;
    if (z.anzahl <= max) return next();
    res.set('Retry-After', String(Math.max(1, Math.ceil((z.ende - t) / 1000))));
    if ((req.baseUrl + req.path).startsWith('/api/')) return res.status(429).json({ error: 'Zu viele Anfragen.' });
    return res.status(429).type('text/plain; charset=utf-8').send('Zu viele Anfragen – bitte kurz warten.');
  }
  /** Anzahl gespeicherter Schlüssel (für Tests). */
  begrenzer.anzahlSchluessel = () => zaehler.size;
  return begrenzer;
}

const TEXT_LAEUFT_NOCH = 'Deine vorige Abfrage läuft noch. Warte kurz und versuch es dann noch einmal.';
const TEXT_LAEUFT_NOCH_IP = 'Gerade läuft schon eine Abfrage von diesem Anschluss. Versuch es gleich noch einmal.';

/** Schlüssel der Sandbox-Sperre: angemeldet je Konto (sub), sonst je IP (nur im RAM). */
const kontoOderIp = (req) => (req.sitzung && req.sitzung.sub ? 'konto:' + req.sitzung.sub : 'ip:' + req.ip);

/**
 * Höchstens ein laufender (oder wartender) Auftrag je Schlüssel (Sicherheitsprüfung Phase 8, F3): Ein Konto kann die
 * SQL-Sandbox so mit absichtlich langsamen Abfragen höchstens einen Kindprozess lang belegen. Ein zweiter Auftrag
 * desselben Schlüssels bekommt sofort 429 { error, code: 'LAEUFT_NOCH' } – kein Warten: das hielte Verbindungen offen
 * und verlagerte die Warteschlange nur in den Server; der Doppelklick-Schutz der Seiten sendet ohnehin nicht doppelt.
 * Eine Instanz gilt routenübergreifend (app.js reicht sie an alle Sandbox-Routen); ein Prüfauftrag auf Haupt-DB und
 * Varianten nacheinander ist EIN Auftrag (eine Anfrage).
 * Freigabe, sobald die Route antwortet (res.end – auch nach Fehler oder Zeitlimit, weil dann der Fehler-Handler
 * antwortet). Bricht der Client die Verbindung ab, bleibt die Sperre bis zum Ende des Auftrags (sonst ließe sie sich
 * durch Abbrechen umgehen); Sicherung: spätestens nach haltMs. Zustand nur im RAM.
 * Ohne Anmeldung (Schlüssel `ip:`) sind bis zu maxJeIp Aufträge gleichzeitig erlaubt: Eine Klasse im Gastmodus teilt
 * sich hinter einer Schul-NAT eine IP-Adresse und soll sich nicht gegenseitig sperren.
 */
function auftragsSperre({ haltMs = 120000, maxJeIp = 4 } = {}) {
  const belegt = new Map(); // Schlüssel → Anzahl laufender Aufträge
  function middleware({ schluessel = kontoOderIp, text } = {}) {
    return function einAuftrag(req, res, next) {
      const k = String(schluessel(req));
      const grenze = k.startsWith('ip:') ? maxJeIp : 1;
      if ((belegt.get(k) || 0) >= grenze) {
        res.set('Retry-After', '1');
        const t = text || (k.startsWith('ip:') ? TEXT_LAEUFT_NOCH_IP : TEXT_LAEUFT_NOCH);
        return res.status(429).json({ error: t, code: 'LAEUFT_NOCH' });
      }
      belegt.set(k, (belegt.get(k) || 0) + 1);
      let frei = false;
      const sicherung = setTimeout(() => freigeben(), haltMs);
      if (typeof sicherung.unref === 'function') sicherung.unref();
      function freigeben() {
        if (frei) return;
        frei = true;
        clearTimeout(sicherung);
        const rest = (belegt.get(k) || 1) - 1;
        if (rest > 0) belegt.set(k, rest);
        else belegt.delete(k);
      }
      const ende = res.end;
      res.end = function (...args) {
        freigeben();
        return ende.apply(this, args);
      };
      res.once('finish', freigeben);
      return next();
    };
  }
  /** Nur wenn bedingung(req) gilt: erst die übrigen Middlewares (z. B. Rate-Limit), dann die Sperre. */
  function wenn(bedingung, ...davor) {
    const sperre = middleware();
    const kette = [...davor, sperre];
    return function bedingt(req, res, next) {
      if (!bedingung(req)) return next();
      let i = 0;
      const weiter = (fehler) => {
        if (fehler) return next(fehler);
        const mw = kette[i++];
        return mw ? mw(req, res, weiter) : next();
      };
      return weiter();
    };
  }
  return { middleware, wenn, anzahl: () => belegt.size };
}

module.exports = { sicherheitsHeader, pruefeHerkunft, rateLimit, auftragsSperre, CSP_DIREKTIVEN };
