'use strict';
// Verhör-Engine (Plan Phase 3 Task 7, Spec §7.9, AUFGABENFORMAT §3; Muster Algo Quest src/services/boss.js).
//
// Regeln:
// - Freischaltung über stand.verhoerZugang (auto ab 60 % der Level-Punkte der Akte / offen / gesperrt). Lehrkräfte und
//   Superadmin dürfen jederzeit testen (ohne Freischaltung und ohne 12-h-Pause); ihre Versuche zählen nicht für die
//   Kursübersicht (die zählt nur Schüler-subs) und erzeugen keinen Erfolge-Feed.
// - Ziehung nach mix je Stufe unter Beachtung von maxJeKind (Art = Interaktion des ersten Teils), gA-Kurse nur Aufgaben
//   für alle; fehlt eine Stufe, wird aus dem Rest aufgefüllt. Reihenfolge Stufe 1 → 3. Die Ziehung wird je Versuch in
//   aufgaben_json gespeichert ({ aufgaben, frist }) und bleibt damit stabil.
// - Timer serverseitig: frist = beginn + dauerMin; Antworten bis frist + 30 s Kulanz. Danach (oder bei Abgabe) endet
//   der Versuch; ein abgelaufener Versuch wird beim nächsten Zugriff ausgewertet (ende = frist + Kulanz).
// - Antworten werden sofort serverseitig geprüft (Abimodus streng), gespeichert wird NUR { ok, punkte } je Aufgabe in
//   ergebnisse_json – nie die Antwort selbst (E7: Freitext/SQL nie dauerhaft). Der Client erfährt nichts über die
//   Wertung ({ gespeichert: true }). Erneute Antwort überschreibt, leere Antwort entfernt die Wertung.
// - Ergebnis nach Ende: Punkte, max, Prozent, besiegt (≥ 50 %), je Aufgabe richtig/falsch – ohne Musterlösungen.
//   Bester Versuch zählt (stand.js), neuer Versuch frühestens 12 h nach dem Ende des letzten (409 mit Zeitpunkt).
// - Verhör-Aufgaben gibt es nur in der Antwort auf start/versuch eines laufenden Versuchs (lernen.js liefert 404).

const crypto = require('node:crypto');
const F = require('../content/format');
const { pruefeAntwort, AntwortFehler } = require('../content/pruefer');
const { HttpFehler } = require('./lernen');
const { niveauSichtbar } = require('./stand');
const { VERHOER_BESIEGT_ANTEIL } = require('../domain');

const KULANZ_MS = 30 * 1000;
const SPERRE_MS = 12 * 3600 * 1000;
const ZIEHUNG_VERSUCHE = 200;

/** Kleiner deterministischer Zufallsgenerator (Seed → Folge in [0, 1)). */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const artVonAufgabe = (a) => F.artVon(Array.isArray(a.interaktion) ? a.interaktion[0] : a.interaktion);

function mische(liste, zufall) {
  const a = [...liste];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(zufall() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Aufgaben eines Verhörs ziehen (rein, testbar).
 * @param {{ anzahl, mix, maxJeKind?, pool }} boss
 * @param {(id: string) => object|null} aufgabe Katalog-Zugriff
 * @param {{ niveau?: 'eA'|'gA', zufall?: () => number }} [opt]
 * @returns {string[]} ids, sortiert nach Stufe (innerhalb der Stufe zufällig)
 */
function ziehe(boss, aufgabe, { niveau = 'eA', zufall = Math.random } = {}) {
  const pool = (boss.pool || []).map((id) => aufgabe(id)).filter((a) => a && niveauSichtbar(niveau, a.niveau));
  const anzahl = Math.min(Number(boss.anzahl) || 0, pool.length);
  const grenzen = boss.maxJeKind && typeof boss.maxJeKind === 'object' ? boss.maxJeKind : {};
  const mix = boss.mix && typeof boss.mix === 'object' ? boss.mix : {};

  /** Ein Zufallsdurchgang; streng = maxJeKind beim Auffüllen einhalten. */
  function durchgang(streng) {
    const gewaehlt = [];
    const je = new Map();
    const passt = (a) => {
      const k = artVonAufgabe(a);
      return !Number.isInteger(grenzen[k]) || (je.get(k) || 0) < grenzen[k];
    };
    const nimm = (a) => {
      gewaehlt.push(a);
      je.set(artVonAufgabe(a), (je.get(artVonAufgabe(a)) || 0) + 1);
    };
    let mixErfuellt = true;
    for (const st of ['1', '2', '3']) {
      const soll = Math.max(0, Number(mix[st]) || 0);
      let n = 0;
      for (const a of mische(pool.filter((x) => String(x.stufe) === st), zufall)) {
        if (n >= soll || gewaehlt.length >= anzahl) break;
        if (!passt(a)) continue;
        nimm(a);
        n++;
      }
      if (n < soll) mixErfuellt = false;
    }
    for (const a of mische(pool.filter((x) => !gewaehlt.includes(x)), zufall)) {
      if (gewaehlt.length >= anzahl) break;
      if (streng && !passt(a)) continue;
      nimm(a);
    }
    return { gewaehlt, ok: mixErfuellt && gewaehlt.length === anzahl };
  }

  // Zufällige Durchgänge, bis Mix und maxJeKind erfüllt sind (der Validator garantiert die Erfüllbarkeit);
  // sonst bestes Ergebnis mit maxJeKind, notfalls ohne.
  let bestes = null;
  for (let i = 0; i < ZIEHUNG_VERSUCHE; i++) {
    const d = durchgang(true);
    if (d.ok) {
      bestes = d;
      break;
    }
    if (!bestes || d.gewaehlt.length > bestes.gewaehlt.length) bestes = d;
  }
  if (bestes.gewaehlt.length < anzahl) bestes = durchgang(false);
  return bestes.gewaehlt
    .map((a, i) => ({ a, i }))
    .sort((x, y) => x.a.stufe - y.a.stufe || x.i - y.i)
    .map((x) => x.a.id);
}

/**
 * @param {{ db, inhalte, stand, lernen, pruefer?, jetzt?: () => number, zufall?: () => (() => number) }} opt
 *   lernen liefert die Zugangsprüfung (zugang); zufall erzeugt je Ziehung einen Zufallsgenerator (Standard: Seed aus crypto).
 */
function erzeugeVerhoer({ db, inhalte, stand, lernen, pruefer = null, jetzt = Date.now, zufall = null }) {
  const iso = (t) => new Date(t).toISOString();
  const sqlPruefer = pruefer ? (aufgabe, sql) => pruefer.pruefeSql({ sql, aufgabe }) : null;
  const neuerZufall = zufall || (() => mulberry32(crypto.randomInt(0, 2 ** 32)));

  /* ---------- Hilfen ---------- */

  function akteNr(roh) {
    const s = String(roh);
    if (!/^\d{1,2}$/.test(s)) throw new HttpFehler(400, 'Ungültige Akte.');
    return Number(s);
  }

  /** Zugang + Akte mit Verhör (sichtbar im Niveau, für Schüler freigeschaltet). */
  function kontext(sitzung, kursId, akteRoh, { schreiben = false } = {}) {
    const nr = akteNr(akteRoh);
    const z = lernen.zugang(sitzung, kursId, { schreiben });
    const akte = inhalte.akte(nr);
    if (!akte || !akte.boss || !akte.boss.pool.length || !stand.akteSichtbar(akte, z.einst.niveau)) {
      throw new HttpFehler(404, 'Für diese Akte gibt es kein Verhör.');
    }
    if (z.rolle === 'schueler' && !stand.istFreigeschaltet(z.einst, nr)) {
      throw new HttpFehler(403, 'Diese Akte ist in deinem Kurs noch nicht freigeschaltet.');
    }
    return { z, akte, boss: akte.boss };
  }

  /** Freischaltung: Lehrkräfte immer; Schüler nach stand.verhoerZugang mit den Lab-Punkten der Akte. */
  function freischaltung(z, akte) {
    if (z.rolle !== 'schueler') return { frei: true, grund: null };
    const fm = stand.fortschritt(z.sub, z.kurs.id);
    let ist = 0;
    let max = 0;
    for (const sl of stand.sichtbareLevels(akte, z.einst.niveau)) {
      max += sl.maxPunkte;
      for (const id of sl.aufgaben) ist += fm.has(id) ? fm.get(id).punkte : 0;
    }
    return stand.verhoerZugang(z.einst, akte, ist, max);
  }

  function lies(r) {
    let daten = {};
    try {
      daten = JSON.parse(r.aufgaben_json);
    } catch {
      daten = {};
    }
    const ids = Array.isArray(daten) ? daten : Array.isArray(daten.aufgaben) ? daten.aufgaben : [];
    let erg = {};
    try {
      erg = JSON.parse(r.ergebnisse_json || '{}') || {};
    } catch {
      erg = {};
    }
    const frist = daten && typeof daten.frist === 'string' ? Date.parse(daten.frist) : Date.parse(r.beginn);
    return { ...r, ids, erg, frist };
  }

  const versuche = (z, nr) =>
    db.prepare('SELECT * FROM verhoer_versuche WHERE sub = ? AND kurs_id = ? AND akte = ? ORDER BY id').all(z.sub, z.kurs.id, nr).map(lies);
  const abgelaufen = (v, t = jetzt()) => t > v.frist + KULANZ_MS;
  const prozent = (p, m) => (m ? Math.round((100 * p) / m) : 0);
  const besiegt = (p, m) => m > 0 && p / m >= VERHOER_BESIEGT_ANTEIL - 1e-9;

  /** Versuch beenden und auswerten (Punkte = Summe der gespeicherten Wertungen); → neue Abzeichen. */
  function auswerten(z, v, endeT) {
    const punkte = v.ids.reduce((s, id) => s + (v.erg[id] && v.erg[id].ok ? v.erg[id].punkte : 0), 0);
    const vorher = db
      .prepare('SELECT punkte, max FROM verhoer_versuche WHERE sub = ? AND kurs_id = ? AND akte = ? AND ende IS NOT NULL')
      .all(z.sub, z.kurs.id, v.akte)
      .some((x) => besiegt(x.punkte, x.max));
    const geaendert = db
      .prepare('UPDATE verhoer_versuche SET ende = ?, punkte = ? WHERE id = ? AND ende IS NULL')
      .run(iso(endeT), punkte, v.id).changes;
    if (!geaendert) return [];
    if (besiegt(punkte, v.max) && !vorher && stand.istSchuelerKonto(z.sub)) stand.erfolg(z.kurs.id, z.sub, `verhoer:${v.akte}`);
    return stand.pruefeAbzeichen(z.sub, z.kurs.id);
  }

  /** Abgelaufene, nicht beendete Versuche einer Person in einem Kurs auswerten. */
  function raeumeAuf(z, nr) {
    let neu = [];
    for (const v of versuche(z, nr)) {
      if (v.ende === null && abgelaufen(v)) neu = neu.concat(auswerten(z, v, v.frist + KULANZ_MS));
    }
    return neu;
  }

  /**
   * Alle abgelaufenen Versuche eines Kurses auswerten (vor Stand und Kursübersicht, damit kein Versuch „hängt“).
   * Zugangsfrei, da nur bereits gespeicherte Wertungen zusammengezählt werden.
   */
  function raeumeKursAuf(kursId) {
    const offen = db.prepare('SELECT * FROM verhoer_versuche WHERE kurs_id = ? AND ende IS NULL').all(kursId).map(lies);
    for (const v of offen) {
      if (!abgelaufen(v)) continue;
      const k = stand.kurs(v.kurs_id);
      if (!k) continue;
      auswerten({ sub: v.sub, kurs: k }, v, v.frist + KULANZ_MS);
    }
  }

  function aufgabeImVersuch(id, mitAntwortStatus, v) {
    const o = inhalte.aufgabeOeffentlich(id);
    if (!o) return { id, titel: '(entfernt)', stufe: 0, punkte: 0, inhalt: [], interaktion: null, beantwortet: false };
    delete o.tippsAnzahl;
    if (mitAntwortStatus) o.beantwortet = !!v.erg[id];
    return o;
  }

  function ergebnis(v) {
    return {
      id: v.id,
      laeuft: false,
      beginn: v.beginn,
      ende: v.ende,
      punkte: v.punkte,
      max: v.max,
      prozent: prozent(v.punkte, v.max),
      besiegt: besiegt(v.punkte, v.max),
      aufgaben: v.ids.map((id) => {
        const a = inhalte.aufgabe(id);
        const e = v.erg[id];
        const ok = !!(e && e.ok);
        return { id, titel: a ? a.titel : '(entfernt)', stufe: a ? a.stufe : 0, punkte: a ? a.punkte : 0, richtig: ok, erreicht: ok ? e.punkte : 0 };
      })
    };
  }

  function laufendeSicht(v, akte) {
    return {
      id: v.id,
      laeuft: true,
      akte: { nr: akte.nr, titel: akte.titel, farbe: akte.farbe },
      titel: akte.boss.titel,
      beginn: v.beginn,
      ende: iso(v.frist),
      kulanzSek: KULANZ_MS / 1000,
      serverZeit: iso(jetzt()),
      max: v.max,
      aufgaben: v.ids.map((id) => aufgabeImVersuch(id, true, v))
    };
  }

  function laufender(z, nr) {
    const v = versuche(z, nr).filter((x) => x.ende === null);
    return v.length ? v[v.length - 1] : null;
  }

  /* ---------- Öffentliche Funktionen ---------- */

  /** GET /api/kurse/:kurs/verhoere/:akte */
  function status(sitzung, kursId, akteRoh) {
    const { z, akte, boss } = kontext(sitzung, kursId, akteRoh);
    raeumeAuf(z, akte.nr);
    const alle = versuche(z, akte.nr);
    const fertig = alle.filter((v) => v.ende !== null);
    const bester = fertig.reduce((b, v) => (!b || v.punkte > b.punkte ? v : b), null);
    const lauf = alle.find((v) => v.ende === null) || null;
    const fr = freischaltung(z, akte);
    let naechster = null;
    if (z.rolle === 'schueler' && fertig.length) {
      const ab = Math.max(...fertig.map((v) => Date.parse(v.ende))) + SPERRE_MS;
      if (ab > jetzt()) naechster = iso(ab);
    }
    return {
      akte: { nr: akte.nr, titel: akte.titel, farbe: akte.farbe },
      verhoer: { id: boss.id, titel: boss.titel, rahmensatz: boss.rahmensatz || '', dauerMin: boss.dauerMin, anzahl: boss.anzahl },
      frei: fr.frei,
      grund: fr.grund,
      versuche: fertig.length,
      bester: bester ? { punkte: bester.punkte, max: bester.max, prozent: prozent(bester.punkte, bester.max), besiegt: besiegt(bester.punkte, bester.max) } : null,
      besiegt: !!(bester && besiegt(bester.punkte, bester.max)),
      laufend: lauf ? { id: lauf.id, beginn: lauf.beginn, ende: iso(lauf.frist) } : null,
      naechsterVersuchAb: naechster,
      serverZeit: iso(jetzt())
    };
  }

  /** POST …/start: laufenden Versuch fortsetzen oder neuen beginnen. */
  function starten(sitzung, kursId, akteRoh) {
    const { z, akte, boss } = kontext(sitzung, kursId, akteRoh, { schreiben: true });
    const st = status(sitzung, kursId, akteRoh);
    const lauf = laufender(z, akte.nr);
    if (lauf) return laufendeSicht(lauf, akte);
    if (!st.frei) throw new HttpFehler(403, st.grund || 'Dieses Verhör ist noch gesperrt.');
    if (st.naechsterVersuchAb) {
      const zeit = new Date(st.naechsterVersuchAb).toLocaleString('de-DE', { timeZone: 'Europe/Berlin', dateStyle: 'short', timeStyle: 'short' });
      const f = new HttpFehler(409, `Ein neuer Versuch ist erst nach 12 Stunden Pause möglich (ab ${zeit} Uhr).`);
      f.daten = { naechsterVersuchAb: st.naechsterVersuchAb };
      throw f;
    }
    const ids = ziehe(boss, (id) => inhalte.aufgabe(id), { niveau: z.einst.niveau, zufall: neuerZufall() });
    if (!ids.length) throw new HttpFehler(404, 'Für dieses Verhör gibt es keine Aufgaben.');
    const max = ids.reduce((s, id) => s + inhalte.aufgabe(id).punkte, 0);
    const t = jetzt();
    const frist = t + (Number(boss.dauerMin) || 20) * 60000;
    const info = db
      .prepare("INSERT INTO verhoer_versuche (sub, kurs_id, akte, aufgaben_json, ergebnisse_json, beginn, max) VALUES (?, ?, ?, ?, '{}', ?, ?)")
      .run(z.sub, z.kurs.id, akte.nr, JSON.stringify({ aufgaben: ids, frist: iso(frist) }), iso(t), max);
    const v = lies(db.prepare('SELECT * FROM verhoer_versuche WHERE id = ?').get(Number(info.lastInsertRowid)));
    return laufendeSicht(v, akte);
  }

  /** GET …/versuch: laufender Versuch (Aufgaben + beantwortet) oder Ergebnis des letzten beendeten. */
  function versuch(sitzung, kursId, akteRoh) {
    const { z, akte } = kontext(sitzung, kursId, akteRoh);
    const neueAbzeichen = raeumeAuf(z, akte.nr);
    const alle = versuche(z, akte.nr);
    if (!alle.length) throw new HttpFehler(404, 'Es gibt noch keinen Versuch.');
    const v = alle[alle.length - 1];
    if (v.ende === null) return laufendeSicht(v, akte);
    return { ...ergebnis(v), neueAbzeichen };
  }

  /** POST …/antwort { aufgabe, antwort }: sofort prüfen (streng), nur { ok, punkte } speichern, keine Rückmeldung. */
  async function antworten(sitzung, kursId, akteRoh, body) {
    const { z, akte } = kontext(sitzung, kursId, akteRoh, { schreiben: true });
    const eingang = jetzt();
    const b = body && typeof body === 'object' ? body : {};
    const v = laufender(z, akte.nr);
    if (!v) throw new HttpFehler(409, 'Es läuft kein Verhör.');
    if (abgelaufen(v, eingang)) {
      auswerten(z, v, v.frist + KULANZ_MS);
      throw new HttpFehler(409, 'Die Zeit ist abgelaufen – das Verhör wurde ausgewertet.');
    }
    const id = String(b.aufgabe || '');
    if (!v.ids.includes(id)) throw new HttpFehler(400, 'Diese Aufgabe gehört nicht zu diesem Verhör.');
    const a = inhalte.aufgabe(id);
    if (!a) throw new HttpFehler(400, 'Diese Aufgabe gibt es nicht mehr.');
    if (F.teile(a).some((t) => F.artVon(t.interaktion) === 'sql') && !sqlPruefer) {
      throw new HttpFehler(503, 'Die SQL-Prüfung ist gerade nicht verfügbar.');
    }
    let erg;
    try {
      erg = await pruefeAntwort(a, b.antwort, { sqlPruefer, abimodus: 'streng' });
    } catch (e) {
      if (e instanceof AntwortFehler) throw new HttpFehler(400, e.message);
      throw e;
    }
    // Wertung in einer Transaktion schreiben, nur solange der Versuch noch läuft (Eingangszeit zählt).
    const gespeichert = db.transaction(() => {
      const r = db.prepare('SELECT ergebnisse_json, ende FROM verhoer_versuche WHERE id = ?').get(v.id);
      if (!r || r.ende !== null) return false;
      let alle = {};
      try {
        alle = JSON.parse(r.ergebnisse_json || '{}') || {};
      } catch {
        alle = {};
      }
      if (erg.leer) delete alle[id];
      else alle[id] = { ok: !!erg.ok, punkte: erg.ok ? a.punkte : 0 };
      db.prepare('UPDATE verhoer_versuche SET ergebnisse_json = ? WHERE id = ?').run(JSON.stringify(alle), v.id);
      return true;
    })();
    if (!gespeichert) throw new HttpFehler(409, 'Dieses Verhör ist bereits beendet.');
    return { gespeichert: true };
  }

  /** POST …/abgeben: laufenden Versuch beenden → Ergebnis. */
  function abgeben(sitzung, kursId, akteRoh) {
    const { z, akte } = kontext(sitzung, kursId, akteRoh, { schreiben: true });
    const v = laufender(z, akte.nr);
    if (!v) throw new HttpFehler(409, 'Es läuft kein Verhör.');
    const neueAbzeichen = auswerten(z, v, abgelaufen(v) ? v.frist + KULANZ_MS : jetzt());
    const fertig = lies(db.prepare('SELECT * FROM verhoer_versuche WHERE id = ?').get(v.id));
    return { ...ergebnis(fertig), neueAbzeichen };
  }

  /** Für das Rate-Limit: ist die Aufgabe (falls vorhanden) eine sql-Aufgabe? */
  function istSqlAufgabe(id) {
    const a = inhalte.aufgabe(String(id || ''));
    return !!a && F.teile(a).some((t) => F.artVon(t.interaktion) === 'sql');
  }

  return { status, starten, versuch, antworten, abgeben, raeumeKursAuf, istSqlAufgabe };
}

module.exports = { erzeugeVerhoer, ziehe, mulberry32, KULANZ_MS, SPERRE_MS };
