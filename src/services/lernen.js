'use strict';
// Lernen in den Ermittlungen (Plan Phase 3 Task 5; Muster Algo Quest src/services/lernen.js): Zugang (Mitgliedschaft,
// Kurs aktiv, Akte freigeschaltet, Niveau), Aufgabe abrufen, prüfen, Tipp, „Lösung zeigen“, Kernpunkte.
//
// Regeln (Vertrag §9, AUFGABENFORMAT 4.1–4.3, Spec §7.14):
// - Punkte nur beim ERSTEN Lösen: round(p × max(0.25, 1 − 0.25·F − 0.2·T)); „Lösung zeigen“ → 0 Punkte, Status
//   „angesehen“, späteres Lösen „nachgeloest“. Leere Antwort = kein Fehlversuch (400). Fehlversuche nur solange offen.
// - Fehlversuche werden je Falle der Aufgabe gezählt (fallen_zaehler); bei sql die falsche Abfrage normalisiert ohne
//   sub in fehlabfragen (max. 20 je Kurs × Aufgabe, die seltenste verdrängt, max. 500 Zeichen) – nur von Schülern.
// - Lösung, Erklärung, nicht abgerufene Tipps und Kernpunkte verlassen den Server erst nach Lösen/Aufdecken.
// - Cold Cases: prüfbar, 0 Punkte, zählen nicht für Rang, Freischaltung, Serie, Abzeichen.
// - Verhör-Aufgaben sind hier nie erreichbar (404; nur über die Verhör-Engine).

const F = require('../content/format');
const { pruefeAntwort, AntwortFehler } = require('../content/pruefer');
const { punkteFuer } = require('../domain');

class HttpFehler extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'HttpFehler';
    this.status = status;
  }
}

const MAX_FEHLABFRAGEN = 20;
const MAX_FEHLABFRAGE_LAENGE = 500;

/** SQL-Schlüsselwörter, die bei der Normalisierung großgeschrieben werden. */
const SCHLUESSELWOERTER = new Set(
  (
    'SELECT FROM WHERE AND OR NOT GROUP BY HAVING ORDER ASC DESC LIMIT OFFSET AS DISTINCT IN BETWEEN LIKE IS NULL ' +
    'JOIN ON INNER LEFT RIGHT OUTER CROSS NATURAL USING UNION ALL ANY EXISTS COUNT SUM AVG MIN MAX CASE WHEN THEN ' +
    'ELSE END INSERT INTO VALUES UPDATE SET DELETE CREATE TABLE DROP ALTER TRUE FALSE'
  ).split(' ')
);

/**
 * Fehlabfrage normalisieren: Leerraum zusammenfassen, Schlüsselwörter groß, Literale ('…', "…") unverändert,
 * getrimmt, höchstens 500 Zeichen.
 */
function normalisiereSql(sql) {
  const teile = String(sql).split(/('(?:[^']|'')*'?|"(?:[^"]|"")*"?)/);
  const out = teile
    .map((t, i) => {
      if (i % 2 === 1) return t; // Literal
      return t.replace(/\s+/g, ' ').replace(/[A-Za-z_]+/g, (w) => (SCHLUESSELWOERTER.has(w.toUpperCase()) ? w.toUpperCase() : w));
    })
    .join('')
    .trim();
  return Array.from(out).slice(0, MAX_FEHLABFRAGE_LAENGE).join('');
}

const teileVon = (a) => F.teile(a);
const nurKernpunkte = (a) => teileVon(a).every((t) => F.artVon(t.interaktion) === 'kernpunkte');
const hatSql = (a) => teileVon(a).some((t) => F.artVon(t.interaktion) === 'sql');

/** dbtabelle-Herkunftsabfragen aus Blöcken entfernen (Intro der Ermittlung). */
function oeffentlicheBloecke(bloecke) {
  return (Array.isArray(bloecke) ? bloecke : []).map((b) => {
    const kopie = structuredClone(b);
    if (kopie && kopie.t === 'dbtabelle') delete kopie.quelle;
    return kopie;
  });
}

/**
 * @param {{ db, inhalte, stand, pruefer?: { pruefeSql }, jetzt?: () => number }} opt
 *   pruefer = erzeugePruefer(…) aus src/sql/pruefer.js (ohne ihn sind sql-Aufgaben nicht prüfbar → 503).
 */
function erzeugeLernen({ db, inhalte, stand, pruefer = null, jetzt = Date.now }) {
  const iso = () => new Date(jetzt()).toISOString();
  const sqlPruefer = pruefer ? (aufgabe, sql) => pruefer.pruefeSql({ sql, aufgabe }) : null;

  /* ---------- Zugang ---------- */

  /**
   * Zugang einer Sitzung zu einem Kurs. Schüler: Mitglied (rolle mitglied), Kurs aktiv. Lehrkraft: Lehrkraft des
   * Kurses; Superadmin: jeder bestehende Kurs. Gesperrter Kurs: Lehrkraft/Superadmin nur lesend.
   * Fremder und unbekannter Kurs: gleiche Antwort (403), damit sich Kurs-IDs nicht erraten lassen.
   */
  function zugang(sitzung, kursId, { schreiben = false } = {}) {
    const k = stand.kurs(kursId);
    const m = k ? db.prepare('SELECT rolle FROM mitgliedschaften WHERE sub = ? AND kurs_id = ?').get(sitzung.sub, kursId) : null;
    let rolle = null;
    if (sitzung.rolle === 'schueler' && m && m.rolle === 'mitglied') rolle = 'schueler';
    else if (sitzung.rolle === 'lehrkraft' && m && m.rolle === 'lehrkraft') rolle = 'lehrkraft';
    else if (sitzung.rolle === 'superadmin' && k) rolle = 'lehrkraft';
    if (!rolle) throw new HttpFehler(403, 'Kein Zugriff auf diesen Kurs.');
    if (!k.aktiv) {
      if (rolle === 'schueler') throw new HttpFehler(403, 'Dieser Kurs ist gesperrt.');
      if (schreiben) throw new HttpFehler(403, 'Dieser Kurs ist gesperrt – nur Ansehen ist möglich.');
    }
    return { sub: sitzung.sub, kurs: k, einst: k.einstellungen, rolle, nurLesen: !k.aktiv };
  }

  /** Lab-/Cold-Case-Aufgabe, die im Kurs sichtbar und (für Schüler) freigeschaltet ist. */
  function aufgabeFuer(z, id) {
    const a = inhalte.aufgabe(String(id));
    if (!a || !stand.aufgabeSichtbar(a, z.einst.niveau)) throw new HttpFehler(404, 'Aufgabe nicht gefunden.');
    if (z.rolle === 'schueler' && !stand.istFreigeschaltet(z.einst, a.akte)) {
      throw new HttpFehler(403, 'Diese Akte ist in deinem Kurs noch nicht freigeschaltet.');
    }
    return a;
  }

  function ermittlungFuer(z, id) {
    const l = inhalte.ermittlung(String(id));
    const akte = l ? inhalte.akte(l.akte) : null;
    if (!l || !akte || !stand.akteSichtbar(akte, z.einst.niveau)) throw new HttpFehler(404, 'Ermittlung nicht gefunden.');
    const sl = stand.sichtbareLevels(akte, z.einst.niveau).find((x) => x.level.id === l.id);
    if (!sl) throw new HttpFehler(404, 'Ermittlung nicht gefunden.');
    if (z.rolle === 'schueler' && !stand.istFreigeschaltet(z.einst, akte.nr)) {
      throw new HttpFehler(403, 'Diese Akte ist in deinem Kurs noch nicht freigeschaltet.');
    }
    return { akte, sl };
  }

  /* ---------- Fortschritt ---------- */

  function zeile(z, id) {
    return db.prepare('SELECT * FROM fortschritt WHERE sub = ? AND kurs_id = ? AND aufgabe = ?').get(z.sub, z.kurs.id, id);
  }

  function sichereZeile(z, id) {
    db.prepare("INSERT OR IGNORE INTO fortschritt (sub, kurs_id, aufgabe, status, zeit) VALUES (?, ?, ?, 'offen', ?)").run(z.sub, z.kurs.id, id, iso());
    return zeile(z, id);
  }

  function setze(z, id, felder) {
    const namen = Object.keys(felder);
    db.prepare(`UPDATE fortschritt SET ${namen.map((n) => `${n} = @${n}`).join(', ')}, zeit = @zeit WHERE sub = @sub AND kurs_id = @kurs AND aufgabe = @id`).run({
      ...felder,
      zeit: iso(),
      sub: z.sub,
      kurs: z.kurs.id,
      id
    });
  }

  function zustand(z, a, r = zeile(z, a.id)) {
    const status = r ? r.status : 'offen';
    const alle = Array.isArray(a.tipps) ? a.tipps : [];
    const genutzt = r ? Math.min(r.tipps, alle.length) : 0;
    const out = {
      status,
      fehlversuche: r ? r.fehlversuche : 0,
      tippsGenutzt: genutzt,
      tippsAnzahl: alle.length,
      tipps: alle.slice(0, status === 'offen' ? genutzt : alle.length),
      punkte: r ? r.punkte : 0,
      moeglich: status === 'offen' ? punkteFuer(a.punkte, r ? r.fehlversuche : 0, genutzt) : 0
    };
    if (teileVon(a).some((t) => F.artVon(t.interaktion) === 'kernpunkte')) {
      const k = db.prepare('SELECT haken FROM kernpunkte WHERE sub = ? AND kurs_id = ? AND aufgabe = ?').get(z.sub, z.kurs.id, a.id);
      out.haken = k ? k.haken : null;
    }
    return out;
  }

  /** Lösungsteil (nur nach Lösen/Aufdecken): Musterlösung, Erklärung, Kernpunkte. */
  function loesungsteil(a) {
    const kern = teileVon(a).map((t) => (F.artVon(t.interaktion) === 'kernpunkte' ? [...(t.interaktion.kernpunkte || [])] : null));
    const out = { loesung: a.loesung === undefined ? null : structuredClone(a.loesung), erklaerung: structuredClone(a.erklaerung || []) };
    if (kern.some(Boolean)) out.kernpunkte = Array.isArray(a.interaktion) ? kern : kern[0];
    return out;
  }

  function ort(a) {
    const l = inhalte.ermittlung(a.ermittlung);
    const akte = inhalte.akte(a.akte);
    const liste = l.aufgaben;
    const i = liste.indexOf(a.id);
    return {
      akte: { nr: akte.nr, titel: akte.titel, farbe: akte.farbe },
      ermittlung: { id: l.id, nr: l.nr, titel: l.titel },
      index: i,
      anzahl: liste.length,
      vorher: i > 0 ? liste[i - 1] : null,
      nachher: i >= 0 && i < liste.length - 1 ? liste[i + 1] : null
    };
  }

  /* ---------- Öffentliche Funktionen ---------- */

  function standFuer(sitzung, kursId) {
    const z = zugang(sitzung, kursId);
    return stand.stand(z.sub, z.kurs.id, { rolle: z.rolle, nurLesen: z.nurLesen });
  }

  function ermittlung(sitzung, kursId, id) {
    const z = zugang(sitzung, kursId);
    const { akte, sl } = ermittlungFuer(z, id);
    const fm = stand.fortschritt(z.sub, z.kurs.id);
    const kurz = stand.ermittlungKurz(sl, fm);
    const levels = stand.sichtbareLevels(akte, z.einst.niveau);
    const i = levels.findIndex((x) => x.level.id === sl.level.id);
    return {
      akte: { nr: akte.nr, titel: akte.titel, farbe: akte.farbe },
      ermittlung: { ...kurz, intro: oeffentlicheBloecke(sl.level.intro) },
      vorher: i > 0 ? { id: levels[i - 1].level.id, titel: levels[i - 1].level.titel } : null,
      nachher: i >= 0 && i < levels.length - 1 ? { id: levels[i + 1].level.id, titel: levels[i + 1].level.titel } : null
    };
  }

  function aufgabe(sitzung, kursId, id) {
    const z = zugang(sitzung, kursId);
    const a = aufgabeFuer(z, id);
    const zs = zustand(z, a);
    const out = { aufgabe: inhalte.aufgabeOeffentlich(a.id), coldCase: a.art === 'cc', zustand: zs, ort: ort(a) };
    if (zs.status !== 'offen') out.loesung = loesungsteil(a);
    return out;
  }

  function fehlabfrageSpeichern(z, a, sql) {
    const norm = normalisiereSql(sql);
    if (!norm) return;
    const jetztIso = iso();
    const vorhanden = db.prepare('SELECT 1 FROM fehlabfragen WHERE kurs_id = ? AND aufgabe = ? AND sql_norm = ?').get(z.kurs.id, a.id, norm);
    if (vorhanden) {
      db.prepare('UPDATE fehlabfragen SET anzahl = anzahl + 1, zuletzt = ? WHERE kurs_id = ? AND aufgabe = ? AND sql_norm = ?').run(jetztIso, z.kurs.id, a.id, norm);
      return;
    }
    const n = db.prepare('SELECT COUNT(*) AS n FROM fehlabfragen WHERE kurs_id = ? AND aufgabe = ?').get(z.kurs.id, a.id).n;
    if (n >= MAX_FEHLABFRAGEN) {
      // seltenste verdrängen; bei Gleichstand die am längsten nicht mehr gesehene
      db.prepare(
        `DELETE FROM fehlabfragen WHERE rowid = (SELECT rowid FROM fehlabfragen WHERE kurs_id = ? AND aufgabe = ?
           ORDER BY anzahl, zuletzt, rowid LIMIT 1)`
      ).run(z.kurs.id, a.id);
    }
    db.prepare('INSERT INTO fehlabfragen (kurs_id, aufgabe, sql_norm, anzahl, zuletzt) VALUES (?, ?, ?, 1, ?)').run(z.kurs.id, a.id, norm, jetztIso);
  }

  function fehlerVerbuchen(z, a, antworten, teilweise) {
    db.prepare('UPDATE fortschritt SET fehlversuche = fehlversuche + 1, zeit = ? WHERE sub = ? AND kurs_id = ? AND aufgabe = ?').run(iso(), z.sub, z.kurs.id, a.id);
    const up = db.prepare(
      'INSERT INTO fallen_zaehler (sub, kurs_id, falle, anzahl) VALUES (?, ?, ?, 1) ON CONFLICT (sub, kurs_id, falle) DO UPDATE SET anzahl = anzahl + 1'
    );
    for (const p of new Set(Array.isArray(a.fallen) ? a.fallen : [])) up.run(z.sub, z.kurs.id, p);
    if (a.art === 'lab') stand.serieFortschreiben(z.sub, z.kurs.id, false);
    if (!teilweise && z.rolle === 'schueler') {
      teileVon(a).forEach((t, i) => {
        if (F.artVon(t.interaktion) === 'sql' && typeof antworten[i] === 'string') fehlabfrageSpeichern(z, a, antworten[i]);
      });
    }
  }

  /** Kernpunkte-Aufgabe: nur die Häkchen-Anzahl (E7), Status bearbeitet, 0 Punkte. */
  async function kernpunkte(sitzung, kursId, id, body) {
    const z = zugang(sitzung, kursId, { schreiben: true });
    const a = aufgabeFuer(z, id);
    if (!nurKernpunkte(a) || Array.isArray(a.interaktion)) throw new HttpFehler(400, 'Diese Aufgabe hat keine Kernpunkte.');
    const b = body && typeof body === 'object' ? body : {};
    if (Object.keys(b).some((k) => k !== 'haken')) throw new HttpFehler(400, 'Nur die Anzahl der Häkchen wird gesendet.');
    let erg;
    try {
      erg = await pruefeAntwort(a, { haken: b.haken });
    } catch (e) {
      if (e instanceof AntwortFehler) throw new HttpFehler(400, e.message);
      throw e;
    }
    const haken = erg.antworten[0];
    let neueAbzeichen = [];
    db.transaction(() => {
      const r = sichereZeile(z, a.id);
      db.prepare(
        'INSERT INTO kernpunkte (sub, kurs_id, aufgabe, haken) VALUES (?, ?, ?, ?) ON CONFLICT (sub, kurs_id, aufgabe) DO UPDATE SET haken = excluded.haken'
      ).run(z.sub, z.kurs.id, a.id, haken);
      if (r.status === 'offen') setze(z, a.id, { status: 'bearbeitet', punkte: 0 });
    })();
    neueAbzeichen = stand.pruefeAbzeichen(z.sub, z.kurs.id);
    return { ok: true, rueckmeldung: erg.rueckmeldung, zustand: zustand(z, a), neueAbzeichen, loesung: loesungsteil(a) };
  }

  /** Antwort prüfen. Body: { antwort, teilweise?, teil? }. */
  async function pruefen(sitzung, kursId, id, body) {
    const z = zugang(sitzung, kursId, { schreiben: true });
    const a = aufgabeFuer(z, id);
    const b = body && typeof body === 'object' ? body : {};
    if (nurKernpunkte(a) && !Array.isArray(a.interaktion)) return kernpunkte(sitzung, kursId, id, { haken: b.antwort });
    if (hatSql(a) && !sqlPruefer) throw new HttpFehler(503, 'Die SQL-Prüfung ist gerade nicht verfügbar.');
    const teilweise = b.teilweise === true;
    let erg;
    try {
      erg = await pruefeAntwort(a, b.antwort, { sqlPruefer, teilweise, teil: b.teil });
    } catch (e) {
      if (e instanceof AntwortFehler) throw new HttpFehler(400, e.message);
      throw e;
    }
    const leerTeil = teilweise && Array.isArray(erg.antworten[0]) && erg.antworten[0].length === 0;
    if ((!teilweise && erg.leer) || leerTeil) throw new HttpFehler(400, 'Bitte gib zuerst eine Antwort ein.');

    const fertig = erg.ok && (!teilweise || (erg.rueckmeldung && erg.rueckmeldung.vollstaendig === true));
    const neu = { geloest: false, punkte: 0 };
    db.transaction(() => {
      const r = sichereZeile(z, a.id);
      if (r.status === 'offen') {
        if (!erg.ok) fehlerVerbuchen(z, a, erg.antworten, teilweise);
        else if (fertig) {
          const p = punkteFuer(a.punkte, r.fehlversuche, Math.min(r.tipps, (a.tipps || []).length));
          setze(z, a.id, { status: 'geloest', punkte: p });
          if (a.art === 'lab') stand.serieFortschreiben(z.sub, z.kurs.id, r.fehlversuche === 0);
          if (z.rolle === 'schueler') stand.erfolg(z.kurs.id, z.sub, `geloest:${a.id}`);
          neu.geloest = true;
          neu.punkte = p;
        }
      } else if (r.status === 'angesehen' && fertig) {
        setze(z, a.id, { status: 'nachgeloest' });
        neu.geloest = true;
      }
    })();
    const neueAbzeichen = neu.geloest ? stand.pruefeAbzeichen(z.sub, z.kurs.id) : [];
    const zs = zustand(z, a);
    const out = { ok: erg.ok, rueckmeldung: erg.rueckmeldung, zustand: zs, geloest: neu.geloest, punkteErhalten: neu.punkte, neueAbzeichen };
    if (teilweise) Object.assign(out, { teilweise: true, teil: erg.teil });
    if (zs.status !== 'offen' && fertig) out.loesung = loesungsteil(a);
    return out;
  }

  function tipp(sitzung, kursId, id) {
    const z = zugang(sitzung, kursId, { schreiben: true });
    const a = aufgabeFuer(z, id);
    const anzahl = (a.tipps || []).length;
    if (!anzahl) throw new HttpFehler(400, 'Zu dieser Aufgabe gibt es keine Tipps.');
    db.transaction(() => {
      const r = sichereZeile(z, a.id);
      if (r.status === 'offen' && r.tipps < anzahl) setze(z, a.id, { tipps: r.tipps + 1 });
    })();
    return { zustand: zustand(z, a) };
  }

  /** „Lösung zeigen“: 0 Punkte, Status angesehen. Reine Kernpunkte-Aufgabe: Kernpunkte aufdecken, Status bleibt. */
  function loesungZeigen(sitzung, kursId, id) {
    const z = zugang(sitzung, kursId, { schreiben: true });
    const a = aufgabeFuer(z, id);
    if (!nurKernpunkte(a)) {
      db.transaction(() => {
        const r = sichereZeile(z, a.id);
        if (r.status === 'offen') {
          setze(z, a.id, { status: 'angesehen', punkte: 0 });
          if (a.art === 'lab') stand.serieFortschreiben(z.sub, z.kurs.id, false);
        }
      })();
    }
    return { zustand: zustand(z, a), loesung: loesungsteil(a) };
  }

  /** Für das Rate-Limit: hat die Aufgabe (falls vorhanden) einen sql-Teil? */
  function istSqlAufgabe(id) {
    const a = inhalte.aufgabe(String(id));
    return !!a && hatSql(a);
  }

  return { zugang, stand: standFuer, ermittlung, aufgabe, pruefen, tipp, loesungZeigen, kernpunkte, istSqlAufgabe };
}

module.exports = { erzeugeLernen, normalisiereSql, HttpFehler, MAX_FEHLABFRAGEN };
