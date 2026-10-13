'use strict';
// Live-Modus (Plan Phase 6 Task 6, Spec §7.10, §7.14; DS_PLANUNG K2, STORY §9): Duell und Escape Room.
//
// Regeln:
// - Runden leben NUR im Arbeitsspeicher (Map). Nichts davon kommt in die Plattform-DB; es gibt keine Lab-Punkte.
//   Nach dem Ende bleibt je Kurs nur eine kleine Statistik im RAM (Modus, Teilnehmerzahl, Datum).
// - Lehrkraft (bzw. Superadmin) des Kurses startet, steuert und beendet; Schüler des Kurses treten bei (Team-Nummer
//   wählbar, im Escape Room Pflicht). Zugang je Anfrage über lernen.zugang (Mitgliedschaft, gesperrter Kurs).
// - Duell: Die Lehrkraft schaltet Aufgaben aus dem Live-Pool nacheinander frei; jede Person antwortet einmal je
//   Aufgabe bis Zeitende + 2 s. Punkte = richtig ? 100 + Zeitbonus (0–100, linear nach Restzeit) : 0. Gespeichert wird
//   nur { ok, punkte } (nie die Antwort); das Ergebnis erscheint, wenn die Aufgabe geschlossen ist. Rangliste nur mit
//   Anzeigenamen.
// - Escape Room: Stationen nach Kurs-Niveau (eA: S5, gA: S5g). Je Team die aktuelle Station; richtige Antwort →
//   der Server liefert den Code (aus der Lösung berechnet, src/content/live.js) – nur an dieses Team (Antwort und
//   eigene Sicht). Code-Eingabe öffnet die nächste Station (falscher Code abgelehnt; höchstens 5 Fehlversuche je
//   Team und Minute und zusätzlich je Konto, damit ein Team-Wechsel die Bremse nicht umgeht). Tipp-Umschlag nach
//   Freigabe durch die Lehrkraft oder nach tippNachMin an der Station, kostet tippStrafeMin Minuten (einmal je Station). Countdown dauerMin; danach keine Antworten/Codes mehr (verlängerbar).
// - Ende (Lehrkraft, Verbund-Löschung des Kurses, 4 h Höchstdauer): Ergebnis (Rangliste) berechnen, alle Antworten
//   und Teamstände verwerfen, Ereignis „ende“ an alle Verbindungen, Verbindungen schließen; die Runde wird nach
//   FRIST_MS gelöscht (bis dahin zeigt sie nur das Ergebnis).
// - SSE: je Verbindung eine Sicht – „schueler“ (eigener Stand, Code nur fürs eigene Team), „steuerung“ (Lehrkraft:
//   Teilnehmer, Codes, Lösung der Duell-Aufgabe) und „beamer“ (Lehrkraft am Beamer: Rangliste, Fortschritt, nie
//   Codes oder Lösungen). Jede Änderung schickt jeder Verbindung ihren neuen Zustand (gebündelt), Herzschlag alle 20 s.

const crypto = require('node:crypto');
const F = require('../content/format');
const { pruefeAntwort, AntwortFehler } = require('../content/pruefer');
const { oeffentlicheAufgabe, stationenFuer, normCode } = require('../content/live');
const { HttpFehler } = require('./lernen');

const MIN = 60 * 1000;
const KULANZ_MS = 2000;
const FRIST_MS = 2 * MIN;
const HOECHSTDAUER_MS = 4 * 60 * MIN;
const HERZSCHLAG_MS = 20 * 1000;
const TICK_MS = 1000;
const GRENZEN = Object.freeze({
  runden: 30,
  teilnehmer: 80,
  verbindungenJeRunde: 250,
  verbindungenJeKonto: 3,
  codeFehlversucheJeMinute: 5,
  statistikJeKurs: 10
});
const MODI = ['duell', 'escape'];
const RUNDE_ID = /^[A-Za-z0-9_-]{12}$/;

const istObjekt = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);

/** Ganze Zahl aus einer Option (fehlt → standard), außerhalb der Grenzen → 400. */
function zahlOption(wert, standard, min, max, name) {
  if (wert === undefined || wert === null) return standard;
  if (!Number.isInteger(wert) || wert < min || wert > max) throw new HttpFehler(400, `${name} muss eine ganze Zahl von ${min} bis ${max} sein.`);
  return wert;
}

/** Kurzform einer Musterlösung für die Lehrkraft (Duell). */
function loesungKurz(a) {
  return F.teile(a)
    .map(({ interaktion: ia, loesung: lo }) => {
      switch (F.artVon(ia)) {
        case 'sql':
          return lo.sql;
        case 'choice':
          return (ia.optionen || []).filter((o) => (lo.richtig || []).includes(o.id)).map((o) => o.code || o.md).join(' · ');
        case 'ergebnis':
          return (lo.zeilen || []).map((z) => z.map((x) => (x === null ? 'NULL' : String(x))).join(' | ')).join('\n');
        default:
          return '';
      }
    })
    .filter(Boolean)
    .join('\n');
}

/** Rückmeldung an das Team bei falscher Antwort: nur SQL-Diagnosen (keine Lösungsdaten), sonst nichts. */
function kurzeRueckmeldung(aufgabe, r) {
  if (Array.isArray(aufgabe.interaktion)) return {};
  if (F.artVon(aufgabe.interaktion) !== 'sql' || !r.rueckmeldung) return {};
  return { diagnose: r.rueckmeldung.diagnose || [], zeilen: r.rueckmeldung.zeilen || 0 };
}

/** Plätze mit Gleichstand (1, 2, 2, 4). */
function plaetze(liste, wert) {
  let platz = 0;
  let vorher = null;
  return liste.map((x, i) => {
    const w = wert(x);
    if (vorher === null || w !== vorher) platz = i + 1;
    vorher = w;
    return { ...x, platz };
  });
}

/**
 * @param {{ lernen, inhalte: { pool: Map, escape }, pruefer?, jetzt?: () => number, zufallsId?: () => string, timer?: boolean }} opt
 *   inhalte = ladeLiveInhalte(); lernen liefert zugang(); pruefer = SQL-Prüfer (pruefeSql) für sql-Aufgaben.
 */
function erzeugeLive({ lernen, inhalte, pruefer = null, jetzt = Date.now, zufallsId = null, timer = true }) {
  const runden = new Map();
  const statistik = new Map(); // kursId → [{ modus, teilnehmer, datum }]
  const sqlPruefer = pruefer ? (aufgabe, sql) => pruefer.pruefeSql({ sql, aufgabe }) : null;
  const neueId = zufallsId || (() => crypto.randomBytes(9).toString('base64url'));
  const iso = (t) => (t === null || t === undefined ? null : new Date(t).toISOString());
  let verbindungsNr = 0;

  /* ---------- Zugang ---------- */

  function rundeZu(rundeId) {
    const r = RUNDE_ID.test(String(rundeId)) ? runden.get(String(rundeId)) : null;
    if (!r) throw new HttpFehler(404, 'Diese Live-Runde gibt es nicht (mehr).');
    return r;
  }

  /** Zugang zur Runde: { r, z } – z.rolle 'schueler' | 'lehrkraft'. */
  function zugang(sitzung, rundeId, { schreiben = false } = {}) {
    const r = rundeZu(rundeId);
    const z = lernen.zugang(sitzung, r.kurs.id, { schreiben });
    return { r, z };
  }

  function nurLehrkraft(z) {
    if (z.rolle !== 'lehrkraft') throw new HttpFehler(403, 'Nur die Lehrkraft des Kurses steuert die Live-Runde.');
  }
  function nurSchueler(z) {
    if (z.rolle !== 'schueler') throw new HttpFehler(403, 'Nur Schülerinnen und Schüler des Kurses spielen mit.');
  }

  /* ---------- Zeit und Status ---------- */

  /** Status nach der Uhr nachführen (Duell-Frage schließen, Countdown); true, wenn sich etwas geändert hat. */
  function aktualisiere(r, t = jetzt()) {
    if (r.status === 'beendet') return false;
    let geaendert = false;
    if (r.modus === 'duell' && r.duell.frage && r.duell.frage.offen && t > r.duell.frage.ende + KULANZ_MS) {
      r.duell.frage.offen = false;
      geaendert = true;
    }
    if (r.modus === 'escape' && r.escape.ende !== null) {
      const soll = t > r.escape.ende ? 'abgelaufen' : 'laeuft';
      if (r.status !== soll) {
        r.status = soll;
        geaendert = true;
      }
    }
    return geaendert;
  }

  /* ---------- Duell ---------- */

  function duellPunkte(r) {
    const p = new Map();
    for (const sub of r.teilnehmer.keys()) p.set(sub, 0);
    for (const a of r.antworten.values()) if (p.has(a.sub)) p.set(a.sub, p.get(a.sub) + a.punkte);
    return p;
  }

  /** Rangliste (alle Teilnehmer, nur Anzeigenamen). */
  function duellRangliste(r) {
    const p = duellPunkte(r);
    const liste = [...r.teilnehmer.entries()]
      .map(([sub, tn]) => ({ sub, name: tn.name, team: tn.team, punkte: p.get(sub) || 0 }))
      .sort((a, b) => b.punkte - a.punkte || a.name.localeCompare(b.name, 'de'));
    return plaetze(liste, (x) => x.punkte);
  }

  function duellSicht(r, sicht, sub) {
    const d = r.duell;
    const f = d.frage;
    const a = f ? inhalte.pool.get(f.id) : null;
    const antworten = f ? [...r.antworten.values()].filter((x) => x.aufgabe === f.id) : [];
    const frage = f
      ? {
          nr: d.index + 1,
          von: d.liste.length,
          zeitSek: a.zeitSek,
          beginn: iso(f.beginn),
          ende: iso(f.ende),
          offen: f.offen
        }
      : null;
    const rang = duellRangliste(r);
    const ohneSub = (x) => ({ platz: x.platz, name: x.name, punkte: x.punkte, ...(x.team ? { team: x.team } : {}) });
    const out = { nr: d.index + 1, anzahl: d.liste.length, aufgabe: a ? { ...oeffentlicheAufgabe(a), zeitSek: a.zeitSek } : null, frage };
    if (sicht === 'schueler') {
      if (frage) {
        const eigene = r.antworten.get(`${f.id}|${sub}`);
        frage.beantwortet = !!eigene;
        frage.ergebnis = f.offen ? null : eigene ? { ok: eigene.ok, punkte: eigene.punkte } : { ok: false, punkte: 0, ohneAntwort: true };
      }
      const ich = rang.find((x) => x.sub === sub);
      out.punkte = ich ? ich.punkte : 0;
      out.platz = ich ? ich.platz : null;
      out.rangliste = rang.slice(0, 10).map((x) => ({ ...ohneSub(x), ...(x.sub === sub ? { ich: true } : {}) }));
      return out;
    }
    if (frage) {
      frage.antworten = antworten.length;
      frage.richtig = f.offen ? null : antworten.filter((x) => x.ok).length;
    }
    out.rangliste = (sicht === 'beamer' ? rang.slice(0, 10) : rang).map(ohneSub);
    if (sicht === 'steuerung') {
      out.liste = d.liste.map((id) => {
        const p = inhalte.pool.get(id);
        return { id, titel: p.titel, akte: p.akte, art: F.artVon(Array.isArray(p.interaktion) ? p.interaktion[0] : p.interaktion), zeitSek: p.zeitSek };
      });
      out.loesungKurz = a ? loesungKurz(a) : null;
      out.weitere = d.index + 1 < d.liste.length;
    }
    return out;
  }

  /* ---------- Escape Room ---------- */

  function neuesTeam(r, nr) {
    const t = jetzt();
    return { nr, station: 0, geloest: false, strafeMs: 0, tipps: new Set(), stationSeit: r.escape.start !== null ? t : null, fertigT: null, fortschrittT: t, falscheCodes: [] };
  }

  function teamZeit(r, team, t = jetzt()) {
    if (r.escape.start === null) return 0;
    return (team.fertigT !== null ? team.fertigT : Math.min(t, r.escape.ende)) - r.escape.start + team.strafeMs;
  }

  function mitglieder(r, nr) {
    return [...r.teilnehmer.values()].filter((tn) => tn.team === nr).map((tn) => tn.name).sort((a, b) => a.localeCompare(b, 'de'));
  }

  /** Teams mit Mitgliedern, sortiert nach Fortschritt (fertig nach Zeit, sonst Stationen, dann früherer Fortschritt). */
  function teamRangliste(r) {
    const liste = [...r.escape.teams.values()]
      .filter((tm) => mitglieder(r, tm.nr).length > 0)
      .map((tm) => ({ tm, zeit: teamZeit(r, tm), letzter: tm.fortschrittT - (r.escape.start || 0) + tm.strafeMs }))
      .sort((a, b) => {
        if (!!a.tm.fertigT !== !!b.tm.fertigT) return a.tm.fertigT ? -1 : 1;
        if (a.tm.fertigT) return a.zeit - b.zeit;
        return b.tm.station - a.tm.station || a.letzter - b.letzter || a.tm.nr - b.tm.nr;
      });
    return plaetze(liste, (x) => `${!!x.tm.fertigT}|${x.tm.fertigT ? x.zeit : x.tm.station}|${x.tm.fertigT ? '' : x.letzter}`);
  }

  function tippVerfuegbar(r, team, t = jetzt()) {
    if (r.status !== 'laeuft' || team.fertigT !== null || team.stationSeit === null) return false;
    return r.escape.tippsFrei || t - team.stationSeit >= r.optionen.tippNachMin * MIN;
  }

  function escapeSicht(r, sicht, sub) {
    const e = r.escape;
    const out = {
      titel: inhalte.escape.titel,
      briefing: inhalte.escape.briefing,
      start: iso(e.start),
      ende: iso(e.ende),
      stationenAnzahl: e.stationen.length,
      tippsFrei: e.tippsFrei,
      tippStrafeMin: r.optionen.tippStrafeMin,
      fortschritt: [...e.teams.values()]
        .filter((tm) => mitglieder(r, tm.nr).length > 0)
        .sort((a, b) => a.nr - b.nr)
        .map((tm) => ({ team: tm.nr, geloest: tm.station, fertig: tm.fertigT !== null, mitglieder: mitglieder(r, tm.nr).length }))
    };
    if (sicht === 'schueler') {
      const tn = r.teilnehmer.get(sub);
      const tm = tn && tn.team ? e.teams.get(tn.team) : null;
      if (!tm) {
        out.team = null;
        return out;
      }
      const aktiv = ['laeuft', 'abgelaufen'].includes(r.status) && tm.fertigT === null;
      const st = aktiv ? e.stationen[tm.station] : null;
      out.team = {
        nr: tm.nr,
        mitglieder: mitglieder(r, tm.nr),
        station: st ? { nr: st.nr, titel: st.titel, story: st.story, aufgabe: oeffentlicheAufgabe(st.aufgabe) } : null,
        geloest: tm.geloest,
        strafeMin: Math.round(tm.strafeMs / MIN),
        tipp: st && tm.tipps.has(tm.station) ? st.aufgabe.tipps[0] : null,
        tippVerfuegbar: tippVerfuegbar(r, tm),
        fertig: tm.fertigT !== null
      };
      // Der Code nur für das Team, das die Station gelöst hat – und nur solange sie offen ist.
      if (st && tm.geloest) out.team.code = st.code;
      if (tm.fertigT !== null) out.team.abschluss = inhalte.escape.abschluss;
      return out;
    }
    const rang = teamRangliste(r);
    out.rangliste = rang.map((x) => ({
      platz: x.platz,
      team: x.tm.nr,
      mitglieder: mitglieder(r, x.tm.nr),
      geloest: x.tm.station,
      fertig: x.tm.fertigT !== null,
      zeitMin: Math.round(teamZeit(r, x.tm) / MIN)
    }));
    out.stationen = e.stationen.map((s) => ({ nr: s.nr, id: s.id, titel: s.titel, ...(sicht === 'steuerung' ? { code: s.code } : {}) }));
    if (sicht === 'steuerung') {
      out.teams = [...e.teams.values()]
        .sort((a, b) => a.nr - b.nr)
        .map((tm) => ({
          nr: tm.nr,
          mitglieder: mitglieder(r, tm.nr),
          station: tm.fertigT !== null ? null : e.stationen[tm.station].nr,
          geloest: tm.geloest,
          strafeMin: Math.round(tm.strafeMs / MIN),
          fertig: tm.fertigT !== null
        }));
    }
    return out;
  }

  /* ---------- Sichten ---------- */

  function sichtVon(z, roh) {
    if (z.rolle === 'schueler') return 'schueler';
    return roh === 'beamer' ? 'beamer' : 'steuerung';
  }

  function zustand(r, sicht, sub) {
    const tn = r.teilnehmer.get(sub);
    const basis = {
      id: r.id,
      modus: r.modus,
      sicht,
      status: r.status,
      kurs: { id: r.kurs.id, name: r.kurs.name },
      titel: r.modus === 'escape' ? inhalte.escape.titel : 'Live-Duell',
      teams: r.optionen.teams,
      serverZeit: iso(jetzt())
    };
    if (r.status === 'beendet') return { ...basis, ergebnis: r.ergebnis };
    if (sicht === 'schueler') basis.ich = { dabei: !!tn, team: tn ? tn.team : null };
    if (sicht === 'steuerung') {
      basis.teilnehmer = [...r.teilnehmer.values()].map((x) => ({ name: x.name, team: x.team })).sort((a, b) => a.name.localeCompare(b.name, 'de'));
      basis.optionen = { ...r.optionen, niveau: r.niveau };
    } else basis.teilnehmerZahl = r.teilnehmer.size;
    if (r.modus === 'duell') basis.duell = duellSicht(r, sicht, sub);
    else basis.escape = escapeSicht(r, sicht, sub);
    return basis;
  }

  /* ---------- Verbindungen (SSE) ---------- */

  function schreibe(v, ereignis, daten) {
    try {
      v.schreibe(`event: ${ereignis}\ndata: ${JSON.stringify(daten)}\n\n`);
    } catch {
      /* Verbindung bereits weg – wird beim close entfernt */
    }
  }

  function sendeAllen(r) {
    if (r.sendenGeplant) return;
    r.sendenGeplant = true;
    setImmediate(() => {
      r.sendenGeplant = false;
      if (!runden.has(r.id) || r.status === 'beendet') return;
      for (const v of r.verbindungen) schreibe(v, 'zustand', zustand(r, v.sicht, v.sub));
    });
  }

  function schliesseVerbindung(r, v) {
    r.verbindungen.delete(v);
    try {
      v.schliesse();
    } catch {
      /* schon zu */
    }
  }

  /* ---------- Ende und Aufräumen ---------- */

  function beende(r) {
    if (r.status === 'beendet') return;
    aktualisiere(r);
    r.ergebnis =
      r.modus === 'duell'
        ? { rangliste: duellRangliste(r).map((x) => ({ platz: x.platz, name: x.name, punkte: x.punkte })) }
        : { teams: teamRangliste(r).map((x) => ({ platz: x.platz, team: x.tm.nr, mitglieder: mitglieder(r, x.tm.nr), geloest: x.tm.station, fertig: x.tm.fertigT !== null, zeitMin: Math.round(teamZeit(r, x.tm) / MIN) })), stationenAnzahl: r.escape.stationen.length, abschluss: inhalte.escape.abschluss };
    // Statistik: nur die Teilnehmerzahl bleibt (RAM)
    const s = statistik.get(r.kurs.id) || [];
    s.unshift({ modus: r.modus, teilnehmer: r.teilnehmer.size, datum: iso(jetzt()).slice(0, 10) });
    statistik.set(r.kurs.id, s.slice(0, GRENZEN.statistikJeKurs));
    // Alles verwerfen: Antworten, Teamstände, Zuordnung der Teilnehmer
    r.ehemalige = new Set(r.teilnehmer.keys());
    r.antworten.clear();
    r.falscheCodesKonto.clear();
    if (r.escape) r.escape.teams.clear();
    r.teilnehmer.clear();
    r.status = 'beendet';
    r.loeschenAb = jetzt() + FRIST_MS;
    const ende = { id: r.id, modus: r.modus, status: 'beendet', ergebnis: r.ergebnis };
    for (const v of [...r.verbindungen]) {
      schreibe(v, 'ende', ende);
      schliesseVerbindung(r, v);
    }
  }

  function loesche(r) {
    beende(r);
    runden.delete(r.id);
  }

  /** Uhr-Takt: Fristen, Countdown, Höchstdauer, Löschen nach der Frist. */
  function tick() {
    const t = jetzt();
    for (const r of [...runden.values()]) {
      if (r.status === 'beendet') {
        if (t >= r.loeschenAb) runden.delete(r.id);
        continue;
      }
      if (t - r.erstellt > HOECHSTDAUER_MS) {
        beende(r);
        continue;
      }
      if (aktualisiere(r, t)) sendeAllen(r);
    }
  }

  function herzschlag() {
    for (const r of runden.values()) {
      for (const v of r.verbindungen) {
        try {
          v.schreibe(': herzschlag\n\n');
        } catch {
          /* wird beim close entfernt */
        }
      }
    }
  }

  let uhren = [];
  if (timer) {
    uhren = [setInterval(tick, TICK_MS), setInterval(herzschlag, HERZSCHLAG_MS)];
    for (const u of uhren) if (typeof u.unref === 'function') u.unref();
  }

  /* ================= Öffentliche Funktionen ================= */

  function aktiveRunde(kursId) {
    for (const r of runden.values()) if (r.kurs.id === kursId && r.status !== 'beendet') return r;
    return null;
  }

  /** GET /api/kurse/:kurs/live – aktuelle Runde des Kurses (Lehrkraft zusätzlich: Statistik). */
  function kursRunde(sitzung, kursId) {
    const z = lernen.zugang(sitzung, kursId);
    const r = aktiveRunde(kursId);
    if (r) aktualisiere(r);
    const out = { runde: r ? { id: r.id, modus: r.modus, status: r.status, titel: r.modus === 'escape' ? inhalte.escape.titel : 'Live-Duell' } : null };
    if (z.rolle === 'lehrkraft') out.statistik = statistik.get(kursId) || [];
    return out;
  }

  /** GET /api/kurse/:kurs/live/inhalte – Auswahl für die Lehrkraft (ohne Lösungen und Codes). */
  function auswahl(sitzung, kursId) {
    const z = lernen.zugang(sitzung, kursId);
    nurLehrkraft(z);
    const niveau = z.einst.niveau === 'gA' ? 'gA' : 'eA';
    const pool = [...inhalte.pool.values()]
      .filter((a) => niveau === 'eA' || a.niveau !== 'eA')
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((a) => ({ id: a.id, titel: a.titel, akte: a.akte, art: F.artVon(Array.isArray(a.interaktion) ? a.interaktion[0] : a.interaktion), zeitSek: a.zeitSek, niveau: a.niveau }));
    const e = inhalte.escape;
    return {
      niveau,
      pool,
      escape: e
        ? { titel: e.titel, startbar: e.startbar, dauerMin: e.dauerMin, tippNachMin: e.tippNachMin, tippStrafeMin: e.tippStrafeMin, stationen: stationenFuer(e, niveau).map((s) => ({ id: s.id, nr: s.nr, titel: s.titel })) }
        : null
    };
  }

  /** POST /api/kurse/:kurs/live – neue Runde. */
  function starten(sitzung, kursId, body) {
    const z = lernen.zugang(sitzung, kursId, { schreiben: true });
    nurLehrkraft(z);
    const b = istObjekt(body) ? body : {};
    if (!MODI.includes(b.modus)) throw new HttpFehler(400, 'Modus muss „duell“ oder „escape“ sein.');
    for (const r of [...runden.values()]) if (r.status === 'beendet' && jetzt() >= r.loeschenAb) runden.delete(r.id);
    if (aktiveRunde(kursId)) throw new HttpFehler(409, 'In diesem Kurs läuft schon eine Live-Runde. Beenden Sie sie zuerst.');
    if ([...runden.values()].filter((r) => r.status !== 'beendet').length >= GRENZEN.runden) {
      throw new HttpFehler(503, 'Gerade laufen zu viele Live-Runden. Bitte später noch einmal versuchen.');
    }
    // Niveau immer aus den Kurs-Einstellungen (nie aus der Anfrage): ein gA-Kurs bekommt nie eA-Inhalte (Review PR #6).
    const niveau = z.einst.niveau === 'gA' ? 'gA' : 'eA';
    const t = jetzt();
    const r = {
      id: neueId(),
      kurs: { id: z.kurs.id, name: z.kurs.name },
      modus: b.modus,
      status: 'wartet',
      niveau,
      erstellt: t,
      optionen: {},
      teilnehmer: new Map(),
      verbindungen: new Set(),
      antworten: new Map(),
      falscheCodesKonto: new Map(), // sub → Zeitpunkte falscher Codes (nur RAM, nur während der Runde)
      duell: null,
      escape: null,
      ergebnis: null,
      ehemalige: new Set(),
      loeschenAb: null,
      sendenGeplant: false
    };
    if (b.modus === 'duell') {
      const erlaubt = [...inhalte.pool.values()].filter((a) => niveau === 'eA' || a.niveau !== 'eA');
      let liste;
      if (b.aufgaben === undefined) liste = erlaubt.map((a) => a.id).sort();
      else {
        if (!Array.isArray(b.aufgaben) || !b.aufgaben.length || b.aufgaben.length > 40) throw new HttpFehler(400, 'aufgaben muss eine Liste von Aufgaben aus dem Live-Pool sein.');
        liste = [...new Set(b.aufgaben.map(String))];
        if (liste.some((id) => !erlaubt.some((a) => a.id === id))) throw new HttpFehler(400, 'Unbekannte Aufgabe oder nicht für das Niveau des Kurses.');
      }
      if (!liste.length) throw new HttpFehler(400, 'Im Live-Pool gibt es keine passenden Aufgaben.');
      r.optionen = { teams: zahlOption(b.teams, 0, 0, 12, 'teams'), zeitSek: zahlOption(b.zeitSek, null, 10, 90, 'zeitSek') };
      r.duell = { liste, index: -1, frage: null };
    } else {
      const e = inhalte.escape;
      if (!e || !e.startbar) throw new HttpFehler(503, 'Der Escape Room ist gerade nicht verfügbar.');
      r.optionen = {
        teams: zahlOption(b.teams, 6, 2, 12, 'teams'),
        dauerMin: zahlOption(b.dauerMin, e.dauerMin, 10, 90, 'dauerMin'),
        tippNachMin: zahlOption(b.tippNachMin, e.tippNachMin, 0, 30, 'tippNachMin'),
        tippStrafeMin: e.tippStrafeMin
      };
      r.escape = { stationen: stationenFuer(e, niveau), start: null, ende: null, tippsFrei: false, teams: new Map() };
    }
    runden.set(r.id, r);
    return zustand(r, 'steuerung', z.sub);
  }

  /** GET /api/live/:runde */
  function holeZustand(sitzung, rundeId, sichtRoh) {
    const { r, z } = zugang(sitzung, rundeId);
    if (aktualisiere(r)) sendeAllen(r);
    return zustand(r, sichtVon(z, sichtRoh), z.sub);
  }

  /** POST /api/live/:runde/beitreten { team } */
  function beitreten(sitzung, rundeId, body) {
    const { r, z } = zugang(sitzung, rundeId, { schreiben: true });
    nurSchueler(z);
    if (r.status === 'beendet') throw new HttpFehler(409, 'Diese Live-Runde ist beendet.');
    const b = istObjekt(body) ? body : {};
    let team = b.team === undefined || b.team === null || b.team === 0 ? null : b.team;
    if (team !== null && (!Number.isInteger(team) || team < 1 || team > r.optionen.teams)) {
      throw new HttpFehler(400, r.optionen.teams ? `Wähle ein Team von 1 bis ${r.optionen.teams}.` : 'In dieser Runde gibt es keine Teams.');
    }
    if (r.modus === 'escape' && team === null) throw new HttpFehler(400, 'Im Escape Room spielst du in einem Team – wähle eine Team-Nummer.');
    if (!r.teilnehmer.has(z.sub) && r.teilnehmer.size >= GRENZEN.teilnehmer) throw new HttpFehler(409, 'Diese Live-Runde ist voll.');
    const name = String(sitzung.name || 'Ermittler:in').slice(0, 60);
    const alt = r.teilnehmer.get(z.sub);
    r.teilnehmer.set(z.sub, { name, team, beigetreten: alt ? alt.beigetreten : jetzt() });
    if (r.modus === 'escape' && !r.escape.teams.has(team)) r.escape.teams.set(team, neuesTeam(r, team));
    sendeAllen(r);
    return zustand(r, 'schueler', z.sub);
  }

  function teilnehmer(r, z) {
    nurSchueler(z);
    const tn = r.teilnehmer.get(z.sub);
    if (!tn) throw new HttpFehler(409, 'Tritt der Live-Runde zuerst bei.');
    return tn;
  }

  async function pruefe(aufgabe, antwort) {
    if (F.teile(aufgabe).some((t) => F.artVon(t.interaktion) === 'sql') && !sqlPruefer) {
      throw new HttpFehler(503, 'Die SQL-Prüfung ist gerade nicht verfügbar.');
    }
    try {
      return await pruefeAntwort(aufgabe, antwort, { sqlPruefer });
    } catch (e) {
      if (e instanceof AntwortFehler) throw new HttpFehler(400, e.message);
      throw e;
    }
  }

  /** Team des Teilnehmers im laufenden Escape Room. */
  function escapeTeam(r, z) {
    const tn = teilnehmer(r, z);
    if (r.status === 'wartet') throw new HttpFehler(409, 'Der Escape Room hat noch nicht begonnen.');
    if (r.status === 'abgelaufen') throw new HttpFehler(409, 'Die Zeit ist abgelaufen.');
    if (r.status !== 'laeuft') throw new HttpFehler(409, 'Diese Live-Runde ist beendet.');
    const tm = r.escape.teams.get(tn.team);
    if (tm.fertigT !== null) throw new HttpFehler(409, 'Euer Team hat den Tresor schon geöffnet.');
    return tm;
  }

  /** POST /api/live/:runde/antwort – Duell { aufgabe, antwort } bzw. Escape { antwort }. */
  async function antworten(sitzung, rundeId, body) {
    const { r, z } = zugang(sitzung, rundeId, { schreiben: true });
    const eingang = jetzt();
    aktualisiere(r, eingang);
    const b = istObjekt(body) ? body : {};
    if (r.modus === 'duell') {
      teilnehmer(r, z);
      const f = r.duell.frage;
      if (r.status === 'beendet') throw new HttpFehler(409, 'Diese Live-Runde ist beendet.');
      if (!f || !f.offen || String(b.aufgabe || '') !== f.id) throw new HttpFehler(409, 'Diese Aufgabe ist gerade nicht offen.');
      const schluessel = `${f.id}|${z.sub}`;
      if (r.antworten.has(schluessel)) throw new HttpFehler(409, 'Du hast diese Aufgabe schon beantwortet.');
      const erg = await pruefe(inhalte.pool.get(f.id), b.antwort);
      if (erg.leer) throw new HttpFehler(400, 'Die Antwort ist leer.');
      // nach der Prüfung erneut prüfen (Ende, Doppelklick während der SQL-Prüfung)
      if (r.status === 'beendet' || r.duell.frage !== f || r.antworten.has(schluessel)) throw new HttpFehler(409, 'Diese Aufgabe ist gerade nicht offen.');
      if (eingang > f.ende + KULANZ_MS) throw new HttpFehler(409, 'Die Zeit für diese Aufgabe ist abgelaufen.');
      const rest = Math.max(0, f.ende - eingang);
      const punkte = erg.ok ? 100 + Math.round((100 * rest) / (f.ende - f.beginn)) : 0;
      r.antworten.set(schluessel, { sub: z.sub, aufgabe: f.id, ok: !!erg.ok, punkte });
      sendeAllen(r);
      return { gespeichert: true };
    }
    const tm = escapeTeam(r, z);
    const st = r.escape.stationen[tm.station];
    if (tm.geloest) return { ok: true, code: st.code };
    const nr = tm.station;
    const erg = await pruefe(st.aufgabe, b.antwort);
    if (r.status !== 'laeuft' || tm.station !== nr) throw new HttpFehler(409, 'Die Station hat sich inzwischen geändert.');
    if (!erg.ok) return { ok: false, rueckmeldung: kurzeRueckmeldung(st.aufgabe, erg) };
    tm.geloest = true;
    tm.fortschrittT = jetzt();
    sendeAllen(r);
    return { ok: true, code: st.code };
  }

  /** POST /api/live/:runde/code { code } – öffnet die nächste Station. */
  function codeEingeben(sitzung, rundeId, body) {
    const { r, z } = zugang(sitzung, rundeId, { schreiben: true });
    aktualisiere(r);
    const tm = escapeTeam(r, z);
    const code = normCode(istObjekt(body) ? body.code : '');
    if (!/^\d{1,12}$/.test(code)) throw new HttpFehler(400, 'Der Code besteht nur aus Ziffern.');
    const t = jetzt();
    // Bremse je Team und je Konto: sonst ließe sich durch Wechsel in leere Teams weiterraten (Sicherheits-Review Phase 8).
    tm.falscheCodes = tm.falscheCodes.filter((x) => t - x < MIN);
    const eigene = (r.falscheCodesKonto.get(z.sub) || []).filter((x) => t - x < MIN);
    r.falscheCodesKonto.set(z.sub, eigene);
    const gebremst = [tm.falscheCodes, eigene].filter((l) => l.length >= GRENZEN.codeFehlversucheJeMinute);
    if (gebremst.length) {
      const f = new HttpFehler(429, 'Das Schloss klemmt nach so vielen falschen Codes – wartet eine Minute.');
      f.retryAfter = Math.max(1, Math.ceil((Math.max(...gebremst.map((l) => l[l.length - GRENZEN.codeFehlversucheJeMinute])) + MIN - t) / 1000));
      throw f;
    }
    const st = r.escape.stationen[tm.station];
    if (code !== st.code) {
      tm.falscheCodes.push(t);
      eigene.push(t);
      return { ok: false, text: 'Der Code passt nicht.' };
    }
    tm.station += 1;
    tm.geloest = false;
    tm.falscheCodes = [];
    tm.fortschrittT = t;
    tm.stationSeit = t;
    const fertig = tm.station >= r.escape.stationen.length;
    if (fertig) tm.fertigT = t;
    sendeAllen(r);
    return { ok: true, fertig };
  }

  /** POST /api/live/:runde/tipp – Tipp-Umschlag der aktuellen Station (Zeitstrafe einmal je Station). */
  function tipp(sitzung, rundeId) {
    const { r, z } = zugang(sitzung, rundeId, { schreiben: true });
    aktualisiere(r);
    const tm = escapeTeam(r, z);
    const st = r.escape.stationen[tm.station];
    if (!tm.tipps.has(tm.station)) {
      if (!tippVerfuegbar(r, tm)) throw new HttpFehler(403, 'Den Tipp-Umschlag gibt eure Lehrkraft frei.');
      tm.tipps.add(tm.station);
      tm.strafeMs += r.optionen.tippStrafeMin * MIN;
      sendeAllen(r);
    }
    return { tipp: st.aufgabe.tipps[0], strafeMin: Math.round(tm.strafeMs / MIN) };
  }

  /** POST /api/live/:runde/steuerung { aktion, … } – nur Lehrkraft. */
  function steuern(sitzung, rundeId, body) {
    const { r, z } = zugang(sitzung, rundeId, { schreiben: true });
    nurLehrkraft(z);
    aktualisiere(r);
    const b = istObjekt(body) ? body : {};
    const aktion = String(b.aktion || '');
    if (aktion === 'ende') {
      beende(r);
      return zustand(r, 'steuerung', z.sub);
    }
    if (r.status === 'beendet') throw new HttpFehler(409, 'Diese Live-Runde ist beendet.');
    const t = jetzt();
    if (r.modus === 'duell') {
      const d = r.duell;
      if (aktion === 'naechste') {
        if (d.index + 1 >= d.liste.length) throw new HttpFehler(409, 'Es gibt keine weitere Aufgabe.');
        if (d.frage) d.frage.offen = false;
        d.index += 1;
        const a = inhalte.pool.get(d.liste[d.index]);
        const zeit = (r.optionen.zeitSek || a.zeitSek) * 1000;
        d.frage = { id: a.id, beginn: t, ende: t + zeit, offen: true };
        r.status = 'laeuft';
      } else if (aktion === 'schliessen') {
        if (!d.frage || !d.frage.offen) throw new HttpFehler(409, 'Es ist keine Aufgabe offen.');
        d.frage.offen = false;
        d.frage.ende = Math.min(d.frage.ende, t);
      } else throw new HttpFehler(400, 'Unbekannte Aktion.');
    } else {
      const e = r.escape;
      if (aktion === 'los') {
        if (r.status !== 'wartet') throw new HttpFehler(409, 'Der Escape Room läuft bereits.');
        e.start = t;
        e.ende = t + r.optionen.dauerMin * MIN;
        for (const tm of e.teams.values()) {
          tm.stationSeit = t;
          tm.fortschrittT = t;
        }
        r.status = 'laeuft';
      } else if (aktion === 'tippsFrei') {
        e.tippsFrei = b.an !== false;
      } else if (aktion === 'verlaengern') {
        if (e.ende === null) throw new HttpFehler(409, 'Der Escape Room hat noch nicht begonnen.');
        const min = zahlOption(b.min, 5, 1, 30, 'min');
        e.ende = Math.max(e.ende, t) + min * MIN;
        aktualisiere(r, t);
      } else throw new HttpFehler(400, 'Unbekannte Aktion.');
    }
    sendeAllen(r);
    return zustand(r, 'steuerung', z.sub);
  }

  /**
   * SSE-Abo (GET /api/live/:runde/ereignisse). kanal = { schreibe(text), schliesse() }.
   * → { sicht, ende() } (ende beim close der Anfrage aufrufen). Wirft HttpFehler vor dem Öffnen des Streams.
   */
  function abonnieren(sitzung, rundeId, sichtRoh, kanal) {
    const { r, z } = zugang(sitzung, rundeId);
    const sicht = sichtVon(z, sichtRoh);
    const v = { nr: ++verbindungsNr, sub: z.sub, sicht, schreibe: kanal.schreibe, schliesse: kanal.schliesse };
    if (r.status === 'beendet') {
      return {
        sicht,
        start() {
          schreibe(v, 'ende', { id: r.id, modus: r.modus, status: 'beendet', ergebnis: r.ergebnis });
          kanal.schliesse();
        },
        ende() {}
      };
    }
    if (r.verbindungen.size >= GRENZEN.verbindungenJeRunde) throw new HttpFehler(503, 'Zu viele Verbindungen zu dieser Live-Runde.');
    return {
      sicht,
      start() {
        const eigene = [...r.verbindungen].filter((x) => x.sub === z.sub).sort((a, b) => a.nr - b.nr);
        while (eigene.length >= GRENZEN.verbindungenJeKonto) schliesseVerbindung(r, eigene.shift());
        r.verbindungen.add(v);
        kanal.schreibe('retry: 5000\n\n');
        aktualisiere(r);
        schreibe(v, 'zustand', zustand(r, sicht, z.sub));
      },
      ende() {
        r.verbindungen.delete(v);
      }
    };
  }

  /** Verbund-Löschauftrag: Konto aus allen Runden entfernen bzw. Runden des Kurses beenden und löschen. */
  function verbundLoeschung(auftrag) {
    if (!istObjekt(auftrag)) return;
    for (const r of [...runden.values()]) {
      if (auftrag.kurs && r.kurs.id === auftrag.kurs) {
        loesche(r);
        continue;
      }
      if (auftrag.sub) {
        r.teilnehmer.delete(auftrag.sub);
        r.falscheCodesKonto.delete(auftrag.sub);
        for (const [k, a] of r.antworten) if (a.sub === auftrag.sub) r.antworten.delete(k);
        for (const v of [...r.verbindungen]) if (v.sub === auftrag.sub) schliesseVerbindung(r, v);
        // Beendete Runde mit dieser Person: Ergebnis (Namen) sofort löschen statt erst nach der Frist
        if (r.status === 'beendet' && r.ehemalige.has(auftrag.sub)) runden.delete(r.id);
        else sendeAllen(r);
      }
    }
    // Kurs gelöscht: auch die Statistik der Runden (RAM) vergessen – beende() hat sie eben noch fortgeschrieben
    if (auftrag.kurs) statistik.delete(auftrag.kurs);
  }

  return {
    kursRunde,
    auswahl,
    starten,
    zustand: holeZustand,
    beitreten,
    antworten,
    code: codeEingeben,
    tipp,
    steuern,
    abonnieren,
    verbundLoeschung,
    tick,
    herzschlag,
    stoppe() {
      for (const u of uhren) clearInterval(u);
      uhren = [];
    },
    /** Für Tests: interne Runde (oder null). */
    intern: (id) => runden.get(String(id)) || null,
    /** Anzahl offener SSE-Verbindungen einer Runde. */
    verbindungen: (id) => {
      const r = runden.get(String(id));
      return r ? r.verbindungen.size : 0;
    },
    istRundeId: (id) => RUNDE_ID.test(String(id))
  };
}

module.exports = { erzeugeLive, GRENZEN, FRIST_MS, KULANZ_MS, HERZSCHLAG_MS, RUNDE_ID };
