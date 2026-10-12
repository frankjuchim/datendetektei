'use strict';
/*
 * Datendetektei – Ergebnisvergleich und Diagnosen des SQL-Prüfers (Spec §7.4 Schritt 3–4, §5; Plan Phase 2 Task 10).
 *
 * Vergleich (vergleiche): Spaltenanzahl; Spaltennamen nur bei aliasPflicht (normalisiert); Zeilen als Multimenge
 * (Zahlen auf 1e-6, Ganzzahl 5 == Kommazahl 5.0, Text getrimmt, NULL eigener Wert, Text '5' ≠ Zahl 5);
 * Reihenfolge nur bei sortierung: Die Folge der Sortierschlüssel (Spalten aus `sortierung`) muss mit der des
 * Musterergebnisses übereinstimmen – innerhalb gleicher Schlüssel (Gleichstand) ist die Reihenfolge beliebig.
 * Die Spaltenreihenfolge zählt (wie im Abitur: „… mit Nummer, Bezeichnung und Datum“); eine nur vertauschte
 * Reihenfolge wird als SPALTENREIHENFOLGE erkannt.
 *
 * Diagnosen: { code, falle, art: 'fehler' | 'hinweis' | 'technisch', text } – geduzt, ohne Lösungsdaten (keine
 * Musterzeilen, keine Musterwerte, keine Musterspaltennamen, keine erwartete Zeilen- oder Spaltenzahl).
 * Keine Abhängigkeit von src/kern.
 */

const fehlertexte = require('./fehlertexte');

// ---------------------------------------------------------------------------------------------------- Zellen

/** Vergleichsschlüssel einer Zelle. */
function zellSchluessel(w) {
  if (w === null || w === undefined) return 'N';
  if (typeof w === 'number') {
    if (!Number.isFinite(w)) return 'Z' + String(w);
    const r = Math.round(w * 1e6) / 1e6;
    return 'Z' + String(r === 0 ? 0 : r);
  }
  if (typeof w === 'bigint') return 'Z' + w.toString();
  if (typeof w === 'string') return 'T' + w.trim();
  if (w instanceof Uint8Array) return 'B' + Buffer.from(w).toString('hex');
  return 'T' + String(w).trim();
}

function zeilenSchluessel(zeile) {
  return JSON.stringify(zeile.map(zellSchluessel));
}

/** Spaltenname für aliasPflicht: Groß/Klein, Leerzeichen, Umlaute (ä→ae, ö→oe, ü→ue, ß→ss) egal. */
function normalisiereSpaltenname(name) {
  return String(name == null ? '' : name)
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/\s+/g, '');
}

function zaehle(schluessel) {
  const m = new Map();
  for (const k of schluessel) m.set(k, (m.get(k) || 0) + 1);
  return m;
}

function gleicheMultimenge(a, b) {
  if (a.length !== b.length) return false;
  const m = zaehle(a);
  for (const k of b) {
    const n = m.get(k);
    if (!n) return false;
    m.set(k, n - 1);
  }
  return true;
}

/** Spaltenindizes (0-basiert) der Sortierstufen; spalte = Name/Alias der Musterspalte oder Nummer (1-basiert). */
function sortierIndizes(sortierung, musterSpalten) {
  return sortierung.map((stufe) => {
    const s = stufe && stufe.spalte;
    if (Number.isInteger(s) && s >= 1 && s <= musterSpalten.length) return s - 1;
    if (typeof s === 'string') {
      const i = musterSpalten.findIndex((m) => normalisiereSpaltenname(m) === normalisiereSpaltenname(s));
      if (i !== -1) return i;
    }
    throw new Error('sortierung: Spalte ' + JSON.stringify(s) + ' gibt es im Musterergebnis nicht');
  });
}

/** Sucht eine Spaltenvertauschung (nicht die Identität), unter der beide Ergebnisse als Multimenge gleich sind. */
function findeVertauschung(s, m) {
  const n = m.spalten.length;
  if (n < 2 || n > 12 || s.zeilen.length !== m.zeilen.length) return null;
  const signatur = (zeilen, j) => zeilen.map((z) => zellSchluessel(z[j])).sort().join('\u0001');
  const sSig = [];
  const mSig = [];
  for (let j = 0; j < n; j++) {
    sSig.push(signatur(s.zeilen, j));
    mSig.push(signatur(m.zeilen, j));
  }
  const mSchluessel = m.zeilen.map(zeilenSchluessel);
  const belegt = new Array(n).fill(false);
  const zuordnung = new Array(n); // Musterspalte j ← Schülerspalte zuordnung[j]
  let versuche = 0;
  function suche(j) {
    if (versuche++ > 5000) return false;
    if (j === n) {
      if (zuordnung.every((i, k) => i === k)) return false;
      const umgestellt = s.zeilen.map((z) => zeilenSchluessel(zuordnung.map((i) => z[i])));
      return gleicheMultimenge(umgestellt, mSchluessel);
    }
    for (let i = 0; i < n; i++) {
      if (belegt[i] || sSig[i] !== mSig[j]) continue;
      belegt[i] = true;
      zuordnung[j] = i;
      if (suche(j + 1)) return true;
      belegt[i] = false;
    }
    return false;
  }
  return suche(0) ? zuordnung.slice() : null;
}

/**
 * Vergleicht ein Schülerergebnis mit dem Musterergebnis (beide { spalten, zeilen, anzahl, abgeschnitten }).
 * → { gleich, spaltenanzahl, falscheNamen: [Spaltennummer], multimenge, reihenfolge, nurReihenfolge,
 *     spaltenreihenfolge, zuViele, zuWenige, nurNullFehlt }
 */
function vergleiche(s, m, { aliasPflicht = false, sortierung = null } = {}) {
  const sAnzahl = s.zeilen.length;
  const mAnzahl = m.zeilen.length;
  const e = {
    gleich: false,
    spaltenanzahl: s.spalten.length === m.spalten.length,
    falscheNamen: [],
    multimenge: false,
    reihenfolge: true,
    nurReihenfolge: false,
    spaltenreihenfolge: false,
    zuViele: !!s.abgeschnitten || sAnzahl > mAnzahl,
    zuWenige: !s.abgeschnitten && sAnzahl < mAnzahl,
    nurNullFehlt: false
  };
  if (!e.spaltenanzahl) return e;
  if (aliasPflicht) {
    s.spalten.forEach((name, i) => {
      if (normalisiereSpaltenname(name) !== normalisiereSpaltenname(m.spalten[i])) e.falscheNamen.push(i + 1);
    });
  }
  const sSchluessel = s.zeilen.map(zeilenSchluessel);
  const mSchluessel = m.zeilen.map(zeilenSchluessel);
  e.multimenge = !s.abgeschnitten && gleicheMultimenge(sSchluessel, mSchluessel);
  if (e.multimenge && Array.isArray(sortierung) && sortierung.length > 0) {
    const idx = sortierIndizes(sortierung, m.spalten);
    const folge = (zeilen) => zeilen.map((z) => JSON.stringify(idx.map((i) => zellSchluessel(z[i]))));
    const a = folge(s.zeilen);
    const b = folge(m.zeilen);
    e.reihenfolge = a.every((k, i) => k === b[i]);
  }
  if (!e.multimenge && !s.abgeschnitten && sAnzahl === mAnzahl) e.spaltenreihenfolge = !!findeVertauschung(s, m);
  if (e.zuWenige) {
    // fehlen genau Zeilen mit NULL? (Schülerergebnis ⊂ Muster, Rest hat in jeder Zeile mindestens eine NULL)
    const rest = zaehle(mSchluessel);
    let teilmenge = true;
    for (const k of sSchluessel) {
      const n = rest.get(k);
      if (!n) {
        teilmenge = false;
        break;
      }
      rest.set(k, n - 1);
    }
    if (teilmenge) {
      const fehlend = m.zeilen.filter((z) => {
        const k = zeilenSchluessel(z);
        const n = rest.get(k);
        if (!n) return false;
        rest.set(k, n - 1);
        return true;
      });
      e.nurNullFehlt = fehlend.length > 0 && fehlend.every((z) => z.some((w) => w === null || w === undefined));
    }
  }
  e.nurReihenfolge = e.multimenge && !e.reihenfolge;
  e.gleich = e.multimenge && e.reihenfolge && e.falscheNamen.length === 0;
  return e;
}

// ---------------------------------------------------------------------------------------------------- Diagnosen

const VARIANTEN = {
  null: { falle: 'P5', was: 'NULL-Werten', denk: 'IS NULL und an Zeilen, die im Verbund wegfallen (P5)' },
  gleichnamig: { falle: 'P3', was: 'Gleichnamigen', denk: 'Gruppieren nach dem Schlüssel statt nach dem Namen (P3)' },
  grenze: { falle: 'P6', was: 'Werten genau auf der Grenze', denk: '>= statt > und an Zeitpunkte mit Uhrzeit (P6)' },
  gleichstand: { falle: null, was: 'Gleichständen', denk: 'Gleichstände, die LIMIT abschneidet' },
  leer: { falle: null, was: 'leeren Gruppen', denk: 'Gruppen ohne passende Zeilen' }
};

const TEXTE = {
  ZU_VIELE_ZEILEN: { falle: null, text: 'Deine Abfrage liefert zu viele Zeilen. Fehlt eine Bedingung, oder brauchst du DISTINCT?' },
  ZU_WENIGE_ZEILEN: { falle: null, text: 'Deine Abfrage liefert zu wenige Zeilen. Ist eine Bedingung zu streng, oder fallen Zeilen im Verbund weg?' },
  KREUZPRODUKT: {
    falle: 'P2',
    text: 'Die Zeilenzahl ist das Produkt der Tabellengrößen: Jede Zeile wird mit jeder kombiniert. Fehlt eine Verbundbedingung im WHERE (P2)?'
  },
  NULL_ZEILEN_FEHLEN: {
    falle: 'P5',
    text: 'Es fehlen genau Zeilen, in denen ein Wert NULL ist. Ein Vergleich mit NULL ist nie wahr, und im Verbund fallen Zeilen mit NULL im Fremdschlüssel weg – denk an IS NULL (P5).'
  },
  NUR_REIHENFOLGE: { falle: null, text: 'Die Zeilen stimmen, nur die Reihenfolge nicht. Prüf ORDER BY: Spalten, Stufen und ASC/DESC.' },
  SPALTENREIHENFOLGE: { falle: null, text: 'Die Spalten stimmen, aber nicht in der verlangten Reihenfolge. Ordne sie im SELECT so an, wie die Aufgabe sie nennt.' },
  ANDERE_WERTE: {
    falle: null,
    text: 'Die Zeilenzahl stimmt, aber nicht alle Werte. Prüf Bedingungen und Rechnungen, COUNT ↔ SUM (P4) – und ob dein Verbund Zeilen vervielfacht (P2).'
  }
};

function diagnose(code, zusatz) {
  const t = TEXTE[code];
  return Object.assign({ code, falle: t.falle, art: 'fehler', text: t.text }, zusatz || {});
}

function spaltenanzahl(s, m) {
  const mehr = s.spalten.length > m.spalten.length;
  return {
    code: 'SPALTENANZAHL',
    falle: null,
    art: 'fehler',
    text: 'Deine Abfrage liefert ' + (mehr ? 'zu viele' : 'zu wenige') + ' Spalten. Lies noch einmal, welche Angaben die Aufgabe verlangt.'
  };
}

function spaltenname(nummern) {
  const liste = nummern.join(', ');
  return {
    code: 'SPALTENNAME',
    falle: 'P7',
    art: 'fehler',
    text: (nummern.length === 1 ? 'Spalte ' + liste + ' heißt' : 'Die Spalten ' + liste + ' heißen') +
      ' nicht so, wie die Aufgabe es verlangt. Benenne sie mit AS um.'
  };
}

/** Diagnosen aus dem Vergleich auf der Haupt-DB (ohne KREUZPRODUKT; das ergänzt der Prüfer). */
function diagnosenAusVergleich(v, s, m) {
  if (!v.spaltenanzahl) {
    const aus = [spaltenanzahl(s, m)];
    if (v.zuViele) aus.push(diagnose('ZU_VIELE_ZEILEN'));
    if (v.zuWenige) aus.push(diagnose('ZU_WENIGE_ZEILEN'));
    return aus;
  }
  const aus = [];
  if (v.falscheNamen.length > 0) aus.push(spaltenname(v.falscheNamen));
  if (!v.multimenge) {
    if (v.spaltenreihenfolge) aus.push(diagnose('SPALTENREIHENFOLGE'));
    else if (v.zuViele) aus.push(diagnose('ZU_VIELE_ZEILEN'));
    else if (v.zuWenige) {
      aus.push(diagnose('ZU_WENIGE_ZEILEN'));
      if (v.nurNullFehlt) aus.push(diagnose('NULL_ZEILEN_FEHLEN'));
    } else aus.push(diagnose('ANDERE_WERTE'));
  } else if (!v.reihenfolge) aus.push(diagnose('NUR_REIHENFOLGE'));
  return aus;
}

function kreuzprodukt() {
  return diagnose('KREUZPRODUKT');
}

/** „passt nur zufällig“: nennt nur die Variantentypen in allgemeiner Form. */
function nurZufaellig(typen) {
  const bekannt = typen.filter((t) => VARIANTEN[t]);
  const was = bekannt.map((t) => VARIANTEN[t].was);
  const denk = bekannt.map((t) => VARIANTEN[t].denk);
  const liste = (xs) => (xs.length <= 1 ? xs.join('') : xs.slice(0, -1).join(', ') + ' und ' + xs[xs.length - 1]);
  let text = 'Auf der Übungs-DB stimmt dein Ergebnis – aber es passt nur zufällig';
  if (was.length > 0) text += ': Auf einer Prüf-Datenbank mit ' + liste(was) + ' stimmt es nicht. Denk an ' + liste(denk) + '.';
  else text += '. Denk an Gleichnamige, NULL und Grenzwerte.';
  return { code: 'NUR_ZUFAELLIG', falle: bekannt.length > 0 ? VARIANTEN[bekannt[0]].falle : null, art: 'fehler', text };
}

// Sandbox-Codes (klein) → interne Codes von fehlertexte.js; technisch = kein Fehler der Schülerin/des Schülers
const SANDBOX = {
  zeitlimit: { code: 'ZEITLIMIT', art: 'fehler' },
  verboten: { code: 'VERBOTEN', art: 'fehler' },
  zu_lang: { code: 'ZU_LANG', art: 'fehler' },
  mehrere_anweisungen: { code: 'MEHRERE_ANWEISUNGEN', art: 'fehler' },
  leer: { code: 'LEER', art: 'fehler' },
  nicht_lesend: { code: 'NICHT_LESEND', art: 'fehler' },
  ueberlastet: { code: 'UEBERLASTET', art: 'technisch' },
  absturz: { code: 'ABSTURZ', art: 'technisch' },
  beendet: { code: 'BEENDET', art: 'technisch' },
  unbekannte_db: { code: 'ABSTURZ', art: 'technisch' }
};
const FALLE_SQLITE = { MEHRDEUTIG: 'P7', AGGREGAT_FALSCH: 'P1', HAVING_OHNE_GROUP_BY: 'P1' };

/** Fehlerantwort der Sandbox → Diagnose mit deutschem Text (nie die Rohmeldung). */
function ausSandboxFehler(fehler) {
  if (fehler.code === 'sql_fehler') {
    const z = fehlertexte.ordneZu(fehler.text);
    return { code: z.code, falle: FALLE_SQLITE[z.code] || null, art: 'fehler', text: z.text };
  }
  const eintrag = SANDBOX[fehler.code] || { code: 'ABSTURZ', art: 'technisch' };
  const meldung = { code: eintrag.code };
  if (fehler.ms) meldung.ms = fehler.ms;
  if (fehler.max) meldung.max = fehler.max;
  if (fehler.wort) meldung.wort = fehler.wort;
  return { code: eintrag.code, falle: null, art: eintrag.art, text: fehlertexte.ordneZu(meldung).text };
}

module.exports = {
  zellSchluessel,
  zeilenSchluessel,
  normalisiereSpaltenname,
  sortierIndizes,
  vergleiche,
  diagnosenAusVergleich,
  kreuzprodukt,
  nurZufaellig,
  ausSandboxFehler,
  VARIANTEN
};
