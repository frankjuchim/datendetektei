'use strict';
// App-Fabrik: erzeugeApp(konfig, db[, { datenbanken, sandbox, inhalte }]) liefert eine Express-App ohne Port (testbar
// mit supertest). datenbanken = ladeDatenbanken() aus src/sql/datenbanken.js (optional; ohne sie gibt es /db/ und
// /api/db/ nicht). sandbox = erzeugeSandbox() aus src/sql/sandbox.js (optional; ohne sie gibt es POST /api/sql/ausfuehren
// nicht). inhalte = erzeugeInhalte(db) aus src/services/inhalte.js (optional; ohne sie meldet das Manifest den Standard-umfang
// und es gibt keine Lern-API). pruefer = erzeugePruefer({ sandbox, schemata }) aus src/sql/pruefer.js (optional; ohne ihn
// sind sql-Aufgaben nicht prüfbar). warmupKarten = ladeWarmupKarten() aus src/services/warmup.js (optional; ohne sie
// gibt es keinen Warm-up-Trainer). gastOptionen gehen an erzeugeGast (src/services/gast.js, z. B. materialVerzeichnis).
// Die Dienste stand und lernen liegen in app.locals (Tests).

const path = require('node:path');
const express = require('express');
const { sicherheitsHeader, pruefeHerkunft, rateLimit } = require('./kern/sicherheit');
const { ssoRouten } = require('./routes/sso');
const { verbundRouten } = require('./routes/verbund');
const { manifestRoute } = require('./kern/manifest');
const { seitenRouten } = require('./routes/seiten');
const { sortierfaecherRouten } = require('./routes/sortierfaecher');
const { spurenbrettRouten } = require('./routes/spurenbrett');
const { modellWerkzeugRouten } = require('./routes/modellwerkzeuge');
const { sqlSkriptRouten } = require('./routes/sql_skripte');
const { sqlRouten, sqlAusfuehrenRoute } = require('./routes/sql');
const { schuelerRouten } = require('./routes/schueler');
const { lehrkraftRouten } = require('./routes/lehrkraft');
const { gastRouten } = require('./routes/gast');
const { themenRouten } = require('./routes/themen');
const { erzeugeGast } = require('./services/gast');
const { erzeugeThemen } = require('./services/themen');
const { erzeugeStand } = require('./services/stand');
const { erzeugeLernen } = require('./services/lernen');
const { erzeugeVerhoer } = require('./services/verhoer');
const { verhoerRouten } = require('./routes/verhoer');
const { warmupRouten } = require('./routes/warmup');
const { trainingRouten } = require('./routes/training');
const { erzeugeWarmup } = require('./services/warmup');
const { erzeugeTraining } = require('./services/training');
const { erzeugeFallebene, ladeFallebene } = require('./services/fallebene');
const { fallebeneRouten } = require('./routes/fallebene');
const { version: VERSION } = require('../package.json');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');

function erzeugeApp(
  konfig,
  db,
  { datenbanken = null, sandbox = null, inhalte = null, pruefer = null, warmupKarten = null, gastOptionen = {}, fallebene: fallebeneDaten } = {}
) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', konfig.trustProxy || 0);
  app.locals.konfig = konfig;
  app.locals.db = db;
  app.locals.datenbanken = datenbanken;
  app.locals.inhalte = inhalte;
  const uhr = konfig.jetzt || Date.now;
  const stand = inhalte ? erzeugeStand({ db, inhalte, jetzt: uhr }) : null;
  const lernen = inhalte ? erzeugeLernen({ db, inhalte, stand, pruefer, jetzt: uhr }) : null;
  app.locals.stand = stand;
  app.locals.lernen = lernen;
  const verhoer = lernen ? erzeugeVerhoer({ db, inhalte, stand, lernen, pruefer, jetzt: uhr }) : null;
  if (verhoer) stand.setzeAufraeumer(verhoer.raeumeKursAuf);
  app.locals.verhoer = verhoer;
  // Warm-up-Trainer (nur mit Karten) und Trainingsplatz T1–T3 (Plan Phase 3 Task 8).
  const warmup = lernen && warmupKarten ? erzeugeWarmup({ db, lernen, stand, inhalte, karten: warmupKarten, jetzt: uhr }) : null;
  const training = lernen ? erzeugeTraining({ db, lernen, geheimnis: konfig.sessionSecret, jetzt: uhr }) : null;
  // Fallebene (Plan Phase 6 Task 2): Pinnwand, Steckbrief, Plädoyer; Daten aus seed/fallebene.json (Option fallebene).
  const fallebene = lernen
    ? erzeugeFallebene({
        db,
        inhalte,
        stand,
        lernen,
        daten: fallebeneDaten !== undefined ? fallebeneDaten : ladeFallebene(undefined, { log: (z) => console.log(z) }),
        aufraeumen: verhoer ? verhoer.raeumeKursAuf : null
      })
    : null;

  app.use(sicherheitsHeader());
  // Rate-Limits (Spec §7.13/§7.14): /sso/* je IP, Verbund-API gesamt; per konfig.rateLimits überschreibbar.
  const limits = konfig.rateLimits || {};
  const jetzt = konfig.jetzt || Date.now;
  app.use('/sso', rateLimit({ fensterMs: 60000, max: 30, ...limits.sso, schluessel: (req) => req.ip, jetzt }));
  app.use('/api/verbund', rateLimit({ fensterMs: 60000, max: 120, ...limits.verbund, jetzt }));

  // Verbund-API vor dem allgemeinen JSON-Parser: JSON wird erst nach der Token-Prüfung gelesen.
  app.use(verbundRouten(konfig, db, { kennzahlen: stand ? stand.kennzahlen : null }));

  app.use(pruefeHerkunft(konfig));
  app.use(express.json({ limit: '100kb' }));

  app.get('/healthz', (req, res) => {
    res.json({ status: 'ok', version: VERSION });
  });

  app.get('/api/plattform', manifestRoute(konfig, inhalte ? inhalte.umfang : undefined));
  app.use(ssoRouten(konfig, db));
  app.use(seitenRouten());
  app.use(sortierfaecherRouten());
  app.use(spurenbrettRouten());
  app.use(modellWerkzeugRouten());
  // Lern-API (Stand, Aufgaben, Prüfen, Tipp, Lösung zeigen, Kernpunkte) – nur mit geladenen Inhalten.
  if (lernen) app.use(schuelerRouten({ lernen, konfig }));
  // Kurs-Einstellungen für Lehrkräfte (Akten, Niveau, Verhör); Kennzahlen nur mit geladenen Inhalten.
  app.use(lehrkraftRouten({ db, stand }));
  // Verhöre (Status, Start, Versuch, Antwort, Abgabe).
  if (verhoer) app.use(verhoerRouten({ verhoer, konfig }));
  if (warmup) app.use(warmupRouten({ warmup, konfig }));
  if (training) app.use(trainingRouten({ training, konfig }));
  if (fallebene) app.use(fallebeneRouten({ fallebene }));
  // Gastmodus (Probefall Eisdiele, Lehrkraft-Demo, Gast-PDFs) und Themenübersicht aus dem Seed – ohne Anmeldung.
  app.use(gastRouten({ gast: erzeugeGast({ inhalte, log: (z) => console.log(z), ...gastOptionen }), pruefer, konfig }));
  app.use(themenRouten({ themen: erzeugeThemen({ inhalte }) }));

  // Isomorphe SQL-Module (Parser, Regeln, Fehlertexte) aus src/sql – vor dem statischen Verzeichnis.
  app.use(sqlSkriptRouten());

  // Übungs-Datenbanken: nur die öffentliche Haupt-DB und ihr Schema (Spec §7.2).
  if (datenbanken) app.use(sqlRouten(datenbanken));
  // Fallback der Konsole ohne WebAssembly: Ausführen in der Sandbox, nur Haupt-DB (Spec §18).
  if (sandbox) app.use(sqlAusfuehrenRoute({ sandbox, konfig }));

  // Nur public/static/ wird als Verzeichnis ausgeliefert; HTML-Seiten nur über die Routen oben.
  app.use('/static', express.static(path.join(PUBLIC_DIR, 'static'), { maxAge: '1h', index: false }));

  // 404: API als JSON, sonst die statische Fehlerseite.
  app.use((req, res) => {
    if (req.path.startsWith('/api/')) {
      res.status(404).json({ error: 'Nicht gefunden.' });
      return;
    }
    res.status(404).sendFile('404.html', { root: PUBLIC_DIR });
  });

  // Fehler: nie Details ausgeben.
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    const status = err.status && err.status >= 400 && err.status < 500 ? err.status : 500;
    if (status === 500) console.error('Interner Fehler:', err && err.message);
    if (req.path.startsWith('/api/')) {
      res.status(status).json({ error: status === 500 ? 'Interner Fehler.' : 'Ungültige Anfrage.' });
      return;
    }
    res.status(status).type('text/plain; charset=utf-8').send(status === 500 ? 'Interner Fehler.' : 'Ungültige Anfrage.');
  });

  return app;
}

module.exports = { erzeugeApp, VERSION };
