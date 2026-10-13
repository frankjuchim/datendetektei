'use strict';
// Lehrkraft-Auswertung eines Kurses (Plan Phase 6 Task 3, Spec §7.11, §7.14, DESIGN §5.11): Matrix Schüler ×
// Ermittlung (+ Verhöre), Verhör-Ergebnisse, Aufgabenstatistik, Fallen-Profil P1–P10, häufige Fehlabfragen, CSV.
//
// Regeln:
// - Es zählen nur Schüler-Konten mit Mitgliedschaft „mitglied“ im Kurs; Lehrkräfte und Superadmin zählen nie mit
//   (Phase-3-Regel), auch nicht in Fallen-Profil, Aufgaben- oder Verhör-Statistik.
// - Keine sub in Antworten: Schüler erscheinen mit kursinterner Nummer (1…n, sortiert nach Anzeigename) und
//   Anzeigenamen; gleiche Namen (ohne Groß/Klein) werden mit „(1)“, „(2)“ … unterscheidbar gemacht.
// - Spalten = sichtbare Ermittlungen im Kurs-Niveau (gA blendet eA aus) und je Akte das Verhör.
// - Punkte/Rang wie stand.js (Lab + bester Verhör-Versuch + Training; Rang = Anteil an den freigeschalteten Akten).
// - Fehlabfragen sind anonym gespeichert (Spec §7.14) und werden je Aufgabe nach Häufigkeit geliefert.

const { FALLEN, rangFuer, VERHOER_BESIEGT_ANTEIL } = require('../domain');

const ABGESCHLOSSEN = new Set(['geloest', 'nachgeloest', 'bearbeitet']);
const ANGESEHEN = new Set(['angesehen', 'nachgeloest']);

const prozent = (p, m) => (m ? Math.round((100 * p) / m) : 0);
const besiegt = (p, m) => m > 0 && p / m >= VERHOER_BESIEGT_ANTEIL - 1e-9;

/** Platz nach Punkten (absteigend), gleiche Punkte → gleicher Platz (1, 2, 2, 4). Liste wird nicht verändert. */
function plaetze(liste, punkte) {
  const sortiert = [...liste].sort((a, b) => punkte(b) - punkte(a));
  const platz = new Map();
  sortiert.forEach((x, i) => {
    const vorher = sortiert[i - 1];
    platz.set(x, vorher && punkte(vorher) === punkte(x) ? platz.get(vorher) : i + 1);
  });
  return platz;
}

/* ---------- CSV ---------- */

/**
 * Ein CSV-Feld (Semikolon-getrennt): Zahlen unverändert, Texte mit Formelzeichen am Anfang (= + - @ Tab CR) mit
 * vorangestelltem ' (Schutz vor Formel-Ausführung in Tabellenprogrammen), Anführungszeichen bei ; " Zeilenumbruch.
 */
function csvFeld(wert) {
  if (wert === null || wert === undefined) return '';
  if (typeof wert === 'number') return Number.isFinite(wert) ? String(wert) : '';
  let t = String(wert);
  if (/^[=+\-@\t\r]/.test(t)) t = "'" + t;
  if (/[;"\r\n]/.test(t)) t = '"' + t.replace(/"/g, '""') + '"';
  return t;
}

const csvZeile = (felder) => felder.map(csvFeld).join(';');

/** Dateiname aus dem Kursnamen: Umlaute umschreiben, sonst nur A–Z, a–z, 0–9 und Bindestrich. */
function dateiname(kursName) {
  const ersetzt = String(kursName || '')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/Ä/g, 'Ae')
    .replace(/Ö/g, 'Oe')
    .replace(/Ü/g, 'Ue')
    .replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '');
  return `auswertung-${ersetzt || 'kurs'}.csv`;
}

/* ---------- Dienst ---------- */

function erzeugeAuswertung({ db, inhalte, stand }) {
  /**
   * Schüler des Kurses (nur Konten mit Rolle schueler und Mitgliedschaft mitglied) mit Nummer und unterscheidbarem
   * Anzeigenamen: [{ sub, nr, name }]. sub bleibt intern.
   */
  function schuelerVon(kursId) {
    const zeilen = db
      .prepare(
        "SELECT k.sub, k.name FROM mitgliedschaften m, konten k WHERE m.kurs_id = ? AND m.rolle = 'mitglied' " +
          "AND k.sub = m.sub AND k.rolle = 'schueler'"
      )
      .all(kursId);
    const schluessel = (n) => String(n).trim().toLocaleLowerCase('de');
    zeilen.sort((a, b) => schluessel(a.name).localeCompare(schluessel(b.name), 'de') || (a.sub < b.sub ? -1 : a.sub > b.sub ? 1 : 0));
    const anzahl = new Map();
    for (const z of zeilen) anzahl.set(schluessel(z.name), (anzahl.get(schluessel(z.name)) || 0) + 1);
    const laufend = new Map();
    return zeilen.map((z, i) => {
      const k = schluessel(z.name);
      let name = z.name;
      if (anzahl.get(k) > 1) {
        laufend.set(k, (laufend.get(k) || 0) + 1);
        name = `${z.name} (${laufend.get(k)})`;
      }
      return { sub: z.sub, nr: i + 1, name };
    });
  }

  /** Spalten der Matrix: sichtbare Ermittlungen und Verhöre im Kurs-Niveau. Intern mit Aufgaben-Ids. */
  function spaltenVon(einst) {
    const spalten = [];
    for (const akte of inhalte.akten()) {
      if (!stand.akteSichtbar(akte, einst.niveau)) continue;
      const freigeschaltet = stand.istFreigeschaltet(einst, akte.nr);
      for (const sl of stand.sichtbareLevels(akte, einst.niveau)) {
        if (!sl.aufgaben.length) continue; // Ermittlung ohne Lab-Aufgaben (Akte 7): keine leere Spalte
        spalten.push({
          typ: 'ermittlung',
          id: sl.level.id,
          akte: akte.nr,
          nr: sl.level.nr,
          titel: sl.level.titel,
          niveau: sl.level.niveau,
          freigeschaltet,
          anzahl: sl.aufgaben.length,
          maxPunkte: sl.maxPunkte,
          _aufgaben: sl.aufgaben,
          _coldCase: sl.coldCase
        });
      }
      if (akte.boss && akte.boss.pool.length) {
        spalten.push({ typ: 'verhoer', id: akte.boss.id || `A${akte.nr}-V`, akte: akte.nr, titel: akte.boss.titel || `Verhör ${akte.nr}`, freigeschaltet });
      }
    }
    return spalten;
  }

  const oeffentlicheSpalte = ({ _aufgaben, _coldCase, ...rest }) => rest; // eslint-disable-line no-unused-vars

  /** Beendete Verhör-Versuche des Kurses: Map sub → Map akte → [versuche]. */
  function verhoerVersuche(kursId) {
    const m = new Map();
    const zeilen = db
      .prepare('SELECT sub, akte, aufgaben_json, ergebnisse_json, punkte, max FROM verhoer_versuche WHERE kurs_id = ? AND ende IS NOT NULL ORDER BY id')
      .all(kursId);
    for (const z of zeilen) {
      let ids = [];
      let erg = {};
      try {
        const d = JSON.parse(z.aufgaben_json);
        ids = Array.isArray(d) ? d : Array.isArray(d && d.aufgaben) ? d.aufgaben : [];
      } catch {
        ids = [];
      }
      try {
        erg = JSON.parse(z.ergebnisse_json || '{}') || {};
      } catch {
        erg = {};
      }
      if (!m.has(z.sub)) m.set(z.sub, new Map());
      const je = m.get(z.sub);
      if (!je.has(z.akte)) je.set(z.akte, []);
      je.get(z.akte).push({ punkte: z.punkte, max: z.max, ids, erg });
    }
    return m;
  }

  function bester(versuche) {
    let b = null;
    for (const v of versuche || []) if (!b || v.punkte > b.punkte) b = v;
    return b;
  }

  /** Rohdaten für Auswertung, CSV und Board. Liefert null bei unbekanntem Kurs. */
  function sammle(kursId) {
    const k = stand.kurs(kursId);
    if (!k) return null;
    const einst = k.einstellungen;
    const schueler = schuelerVon(kursId);
    const subs = schueler.map((x) => x.sub);
    // kennzahlen wertet vorher abgelaufene Verhör-Versuche aus (Aufräumer) und liefert Rang-Anteile
    const kz = stand.kennzahlen(kursId, subs);
    const versuche = verhoerVersuche(kursId);
    const spalten = spaltenVon(einst);
    const zeilen = schueler.map((x) => {
      const fm = stand.fortschritt(x.sub, kursId);
      const vm = versuche.get(x.sub) || new Map();
      let lab = 0;
      for (const [id, z] of fm) {
        const a = inhalte.aufgabe(id);
        if (a && a.art === 'lab') lab += z.punkte;
      }
      let verhoer = 0;
      for (const liste of vm.values()) {
        const b = bester(liste);
        if (b) verhoer += b.punkte;
      }
      const training = db.prepare('SELECT COALESCE(SUM(punkte), 0) AS p FROM training WHERE sub = ? AND kurs_id = ?').get(x.sub, kursId).p;
      const zellen = spalten.map((sp) => {
        if (sp.typ === 'verhoer') {
          const liste = vm.get(sp.akte) || [];
          const b = bester(liste);
          if (!b) return null;
          return { versuche: liste.length, punkte: b.punkte, max: b.max, prozent: prozent(b.punkte, b.max), besiegt: besiegt(b.punkte, b.max) };
        }
        const z = { punkte: 0, maxPunkte: sp.maxPunkte, anteil: 0, erledigt: 0, anzahl: sp.anzahl, fehlversuche: 0, tipps: 0, angesehen: 0, begonnen: false };
        for (const id of sp._aufgaben) {
          const f = fm.get(id);
          if (!f) continue;
          z.begonnen = true;
          z.punkte += f.punkte;
          z.fehlversuche += f.fehlversuche;
          z.tipps += f.tipps;
          if (ABGESCHLOSSEN.has(f.status)) z.erledigt++;
          if (ANGESEHEN.has(f.status)) z.angesehen++;
        }
        z.anteil = sp.maxPunkte ? Math.min(1, z.punkte / sp.maxPunkte) : 0;
        return z;
      });
      const anteil = kz.schueler.get(x.sub) ? kz.schueler.get(x.sub).anteil : 0;
      return {
        _sub: x.sub,
        _fm: fm,
        nr: x.nr,
        name: x.name,
        punkte: { gesamt: lab + verhoer + training, lab, verhoer, training },
        anteil,
        rang: rangFuer(anteil).name,
        zellen
      };
    });
    const platz = plaetze(zeilen, (z) => z.punkte.gesamt);
    for (const z of zeilen) z.platz = platz.get(z);
    return { k, einst, spalten, zeilen, kz, versuche, subs: new Set(subs) };
  }

  /* ---------- Teilauswertungen ---------- */

  function aktenUebersicht(d) {
    const welten = new Map(d.kz.welten.map((w) => [w.nr, w.anteil]));
    return inhalte
      .akten()
      .filter((akte) => stand.akteSichtbar(akte, d.einst.niveau))
      .map((akte) => {
        let verhoer = null;
        if (akte.boss && akte.boss.pool.length) {
          let teilnehmer = 0;
          let n = 0;
          for (const sub of d.subs) {
            const b = bester((d.versuche.get(sub) || new Map()).get(akte.nr));
            if (!b) continue;
            teilnehmer++;
            if (besiegt(b.punkte, b.max)) n++;
          }
          verhoer = { teilnehmer, besiegt: n };
        }
        return {
          nr: akte.nr,
          titel: akte.titel,
          farbe: akte.farbe || null,
          freigeschaltet: stand.istFreigeschaltet(d.einst, akte.nr),
          anteil: welten.get(akte.nr) || 0,
          verhoer
        };
      });
  }

  function verhoerStatistik(d) {
    const liste = [];
    for (const akte of inhalte.akten()) {
      if (!stand.akteSichtbar(akte, d.einst.niveau) || !akte.boss || !akte.boss.pool.length) continue;
      const je = new Map(akte.boss.pool.map((id) => [id, { gezogen: 0, richtig: 0 }]));
      let teilnehmer = 0;
      let besiegtAnzahl = 0;
      let versucheAnzahl = 0;
      let summeProzent = 0;
      for (const sub of d.subs) {
        const vs = (d.versuche.get(sub) || new Map()).get(akte.nr) || [];
        if (!vs.length) continue;
        teilnehmer++;
        versucheAnzahl += vs.length;
        const b = bester(vs);
        summeProzent += prozent(b.punkte, b.max);
        if (besiegt(b.punkte, b.max)) besiegtAnzahl++;
        for (const v of vs) {
          for (const id of v.ids) {
            if (!je.has(id)) continue;
            je.get(id).gezogen++;
            if (v.erg[id] && v.erg[id].ok) je.get(id).richtig++;
          }
        }
      }
      liste.push({
        akte: akte.nr,
        id: akte.boss.id || `A${akte.nr}-V`,
        titel: akte.boss.titel || `Verhör ${akte.nr}`,
        teilnehmer,
        besiegt: besiegtAnzahl,
        versuche: versucheAnzahl,
        prozentSchnitt: teilnehmer ? Math.round(summeProzent / teilnehmer) : null,
        aufgaben: akte.boss.pool.map((id) => {
          const a = inhalte.aufgabe(id);
          const s = je.get(id);
          return { id, titel: a ? a.titel : id, stufe: a ? a.stufe : 0, gezogen: s.gezogen, richtig: s.richtig };
        })
      });
    }
    return liste;
  }

  function aufgabenStatistik(d) {
    const n = d.zeilen.length;
    const liste = [];
    for (const sp of d.spalten) {
      if (sp.typ !== 'ermittlung') continue;
      const ids = [...sp._aufgaben, ...(sp._coldCase ? [sp._coldCase] : [])];
      for (const id of ids) {
        const a = inhalte.aufgabe(id);
        if (!a) continue;
        const s = { begonnen: 0, geloest: 0, nachgeloest: 0, angesehen: 0, fehlversuche: 0, tipps: 0, punkte: 0 };
        for (const z of d.zeilen) {
          const f = z._fm.get(id);
          if (!f) continue;
          s.begonnen++;
          if (f.status === 'geloest') s.geloest++;
          if (f.status === 'nachgeloest') s.nachgeloest++;
          if (ANGESEHEN.has(f.status)) s.angesehen++;
          s.fehlversuche += f.fehlversuche;
          s.tipps += f.tipps;
          s.punkte += f.punkte;
        }
        liste.push({
          id,
          titel: a.titel,
          art: a.art,
          akte: a.akte,
          ermittlung: sp.id,
          stufe: a.stufe,
          punkte: a.punkte,
          kategorie: a.kategorie,
          fallen: Array.isArray(a.fallen) ? [...a.fallen] : [],
          begonnen: s.begonnen,
          geloest: s.geloest,
          nachgeloest: s.nachgeloest,
          angesehen: s.angesehen,
          // Lösungsquote: selbst gelöst (ohne „Lösung zeigen“) je Schüler des Kurses
          loesungsquote: n ? s.geloest / n : 0,
          fehlversucheSchnitt: s.begonnen ? s.fehlversuche / s.begonnen : null,
          tippsSchnitt: s.begonnen ? s.tipps / s.begonnen : null,
          tipps: s.tipps,
          punkteSchnitt: s.begonnen ? s.punkte / s.begonnen : null
        });
      }
    }
    return liste;
  }

  function fallenProfil(d) {
    const summe = new Map();
    const wer = new Map();
    for (const z of db.prepare('SELECT sub, falle, anzahl FROM fallen_zaehler WHERE kurs_id = ?').all(d.k.id)) {
      if (!d.subs.has(z.sub) || z.anzahl <= 0) continue;
      summe.set(z.falle, (summe.get(z.falle) || 0) + z.anzahl);
      if (!wer.has(z.falle)) wer.set(z.falle, new Set());
      wer.get(z.falle).add(z.sub);
    }
    // In welchen (sichtbaren) Akten kommt die Falle in Ermittlungs-Aufgaben vor?
    const akten = new Map(FALLEN.map((f) => [f.nr, new Set()]));
    for (const sp of d.spalten) {
      if (sp.typ !== 'ermittlung') continue;
      for (const id of sp._aufgaben) {
        const a = inhalte.aufgabe(id);
        for (const p of (a && Array.isArray(a.fallen) ? a.fallen : [])) if (akten.has(p)) akten.get(p).add(sp.akte);
      }
    }
    return FALLEN.map((f) => {
      const nrs = [...akten.get(f.nr)].sort((x, y) => x - y);
      return {
        nr: f.nr,
        titel: f.titel,
        anzahl: summe.get(f.nr) || 0,
        schueler: wer.has(f.nr) ? wer.get(f.nr).size : 0,
        akten: nrs,
        // nur in gesperrten Akten geübt → „Akte gesperrt“ statt 0 (DESIGN §5.11)
        gesperrt: nrs.length > 0 && !nrs.some((nr) => stand.istFreigeschaltet(d.einst, nr))
      };
    });
  }

  function fehlabfragen(kursId) {
    const je = new Map();
    for (const z of db.prepare('SELECT aufgabe, sql_norm, anzahl FROM fehlabfragen WHERE kurs_id = ? ORDER BY anzahl DESC, sql_norm').all(kursId)) {
      const a = inhalte.aufgabe(z.aufgabe);
      if (!a) continue;
      if (!je.has(a.id)) je.set(a.id, { aufgabe: a.id, titel: a.titel, akte: a.akte, ermittlung: a.ermittlung || null, gesamt: 0, abfragen: [] });
      const e = je.get(a.id);
      e.gesamt += z.anzahl;
      e.abfragen.push({ sql: z.sql_norm, anzahl: z.anzahl });
    }
    return [...je.values()].sort((x, y) => y.gesamt - x.gesamt || (x.aufgabe < y.aufgabe ? -1 : 1));
  }

  /* ---------- öffentlich ---------- */

  /** Auswertung für GET /api/lehrkraft/kurse/:kurs/auswertung (Format siehe Bericht/Routen-Kommentar). */
  function auswertung(kursId) {
    const d = sammle(kursId);
    if (!d) return null;
    const n = d.zeilen.length;
    return {
      kurs: { id: d.k.id, name: d.k.name, aktiv: d.k.aktiv, niveau: d.einst.niveau },
      anzahlSchueler: n,
      anteilSchnitt: n ? d.zeilen.reduce((s, z) => s + z.anteil, 0) / n : 0,
      akten: aktenUebersicht(d),
      spalten: d.spalten.map(oeffentlicheSpalte),
      schueler: d.zeilen.map((z) => ({ nr: z.nr, name: z.name, platz: z.platz, rang: z.rang, anteil: z.anteil, punkte: z.punkte, zellen: z.zellen })),
      verhoere: verhoerStatistik(d),
      aufgaben: aufgabenStatistik(d),
      fallen: fallenProfil(d),
      fehlabfragen: fehlabfragen(kursId)
    };
  }

  /** CSV (UTF-8 mit BOM, Semikolon, CRLF): { dateiname, inhalt } oder null. */
  function csv(kursId) {
    const d = sammle(kursId);
    if (!d) return null;
    const akten = inhalte.akten().filter((a) => stand.akteSichtbar(a, d.einst.niveau));
    const kopf = ['Nr', 'Anzeigename', 'Platz', 'Rang', 'Punkte gesamt', 'Punkte Lab', 'Punkte Verhöre', 'Punkte Training'];
    for (const a of akten) kopf.push(`Akte ${a.nr}`);
    for (const sp of d.spalten) {
      if (sp.typ === 'ermittlung') kopf.push(`${sp.id} ${sp.titel}`);
      else kopf.push(`${sp.id} Punkte`, `${sp.id} besiegt`);
    }
    const zeilen = [csvZeile(kopf)];
    for (const z of d.zeilen) {
      const felder = [z.nr, z.name, z.platz, z.rang, z.punkte.gesamt, z.punkte.lab, z.punkte.verhoer, z.punkte.training];
      for (const a of akten) {
        let p = 0;
        d.spalten.forEach((sp, i) => {
          if (sp.akte === a.nr && sp.typ === 'ermittlung') p += z.zellen[i].punkte;
        });
        felder.push(p);
      }
      d.spalten.forEach((sp, i) => {
        const c = z.zellen[i];
        if (sp.typ === 'ermittlung') felder.push(c.punkte);
        else felder.push(c ? c.punkte : '', c ? (c.besiegt ? 'ja' : 'nein') : '');
      });
      zeilen.push(csvZeile(felder));
    }
    return { dateiname: dateiname(d.k.name), inhalt: '﻿' + zeilen.join('\r\n') + '\r\n' };
  }

  return { auswertung, csv, sammle, schuelerVon };
}

module.exports = { erzeugeAuswertung, csvFeld, dateiname, plaetze };
