'use strict';
/*
 * Datendetektei – Zerlegung über funktionale Abhängigkeiten (Plan Phase 5 Task 1; Spec §7.6.6 Zerlegungs-Puzzle).
 * Reine Funktionen, keine Abhängigkeiten, nur Server. Spaltennamen werden exakt verglichen (es sind die Spaltenchips
 * der Aufgabe, keine Freitexte).
 *
 * FA-Format: fa = [{ links: ['Abteilung'], rechts: ['Trainer', 'Halle'] }, …] (wie seed/datenbanken/tus/LIESMICH.md)
 *
 * huelle(attribute, fa) → string[]
 *   Attributhülle X⁺ (Reihenfolge ohne Bedeutung: erst X, dann in Ableitungsreihenfolge).
 * schluesselKandidaten(attribute, fa) → string[][]
 *   alle minimalen Attributmengen X ⊆ attribute mit X⁺ ⊇ attribute (FAs dürfen über Spalten außerhalb von
 *   attribute laufen); sortiert nach Größe, innerhalb in der Reihenfolge von attribute.
 * projiziere(fa, attribute) → [{ links, rechts }]
 *   Projektion der FAs auf attribute über die Hülle: je linker Seite X ⊂ attribute die Spalten aus X⁺ ∩ attribute,
 *   die nicht schon aus einer echten Teilmenge von X folgen (nur minimale linke Seiten, keine trivialen FAs).
 *   Bis 16 Spalten vollständig, darüber nur linke Seiten bis 3 Spalten.
 * verlustfrei(tabellen, alleAttribute, fa) → boolean
 *   Chase-Test (Tableau): tabellen = [[spalte, …], …] oder [{ attribute }, …]. Verlustfrei, wenn nach dem Chase eine
 *   Zeile nur aus a-Symbolen besteht. Spalten, die in keiner Tabelle vorkommen, machen die Zerlegung verlustbehaftet.
 *   Spalten, die nur in den FAs vorkommen, laufen als verdeckte Spalten mit (transitive FAs über sie bleiben gültig).
 * pruefeZerlegung(antwort, loesung) → { geloest, vollstaendig, verlustfrei, redundanzfrei,
 *                                      tabellen: [{ ok, hinweise: [{ code, text }] }], hinweise: [{ code, text }] }
 *   antwort = { tabellen: [{ attribute: [spalte], schluessel: [spalte] }] }  (Schülerzerlegung)
 *   loesung = { attribute: [spalte], fa, schluessel? }                       (schluessel = Schlüssel der Rohtabelle,
 *                                                                              hier nicht benötigt)
 *   Je Tabelle (Index wie in antwort, leere Tabellen werden ignoriert, ok: true):
 *     SPALTE_UNBEKANNT          Spalte gehört nicht zur Aufgabe (Name wird nicht wiederholt)
 *     SCHLUESSEL_FEHLT          kein Schlüssel markiert
 *     SCHLUESSEL_NICHT_EINDEUTIG markierter Schlüssel bestimmt nicht alle Spalten der Tabelle
 *     SCHLUESSEL_NICHT_MINIMAL  eine echte Teilmenge reicht schon (Text nennt sie)
 *     REDUNDANZ                 projizierte FA X → A, X kein Superschlüssel der Tabelle, z. B.
 *                               „TrainerTelefon hängt von Trainer ab, nicht vom Schlüssel (Abteilung) – Redundanz bleibt.“
 *     TABELLE_DOPPELT           Spalten stehen vollständig in einer anderen Tabelle und die Tabelle hat
 *                               Nichtschlüssel-Spalten (reine Schlüsseltabellen sind erlaubt)
 *   Gesamt: SPALTE_FEHLT (je Spalte, die in keiner Tabelle vorkommt), NICHT_VERLUSTFREI („Die Tabellen lassen sich
 *   nicht verlustfrei verbinden …“, nennt Tabellengruppen nach Nummer).
 *   geloest = mindestens eine Tabelle, vollständig, verlustfrei, alle Tabellen ok.
 *   redundanzfrei = keine REDUNDANZ- und keine TABELLE_DOPPELT-Hinweise.
 *   Texte nennen nur Spaltennamen der Aufgabe (sie sind für Schüler sichtbar).
 */

const MAX_VOLL = 16;

function istText(x) {
  return typeof x === 'string' && x.length > 0;
}
function eindeutig(liste) {
  return [...new Set(liste)];
}

/** FAs in sichere Form bringen: [{ links:[…], rechts:[…] }] mit Textspalten. */
function bereinigeFa(fa) {
  if (!Array.isArray(fa)) return [];
  const aus = [];
  for (const f of fa) {
    if (!f || typeof f !== 'object' || !Array.isArray(f.links) || !Array.isArray(f.rechts)) continue;
    const links = eindeutig(f.links.filter(istText));
    const rechts = eindeutig(f.rechts.filter(istText));
    if (rechts.length) aus.push({ links, rechts });
  }
  return aus;
}

function huelleMenge(attr, fa) {
  const menge = new Set(attr);
  let geaendert = true;
  while (geaendert) {
    geaendert = false;
    for (const f of fa) {
      if (f.links.every((a) => menge.has(a)) && f.rechts.some((a) => !menge.has(a))) {
        for (const a of f.rechts) menge.add(a);
        geaendert = true;
      }
    }
  }
  return menge;
}

function huelle(attribute, fa) {
  return [...huelleMenge(Array.isArray(attribute) ? attribute.filter(istText) : [], bereinigeFa(fa))];
}

const umfasst = (menge, liste) => liste.every((a) => menge.has(a));

function kandidaten(attr, fa) {
  if (!attr.length) return [];
  const rechts = new Set(fa.flatMap((f) => f.rechts));
  const kern = attr.filter((a) => !rechts.has(a));
  const rest = attr.filter((a) => rechts.has(a));
  if (umfasst(huelleMenge(kern, fa), attr)) return [kern];
  const gefunden = [];
  const ordnung = (x) => attr.filter((a) => x.includes(a));
  if (rest.length > 20) {
    // Notfall: einen Schlüssel durch Weglassen bestimmen
    let k = attr.slice();
    for (const a of attr) {
      const ohne = k.filter((x) => x !== a);
      if (umfasst(huelleMenge(ohne, fa), attr)) k = ohne;
    }
    return [k];
  }
  // Teilmengen von rest nach Größe
  const n = rest.length;
  const masken = [];
  for (let m = 1; m < 1 << n; m++) masken.push(m);
  masken.sort((a, b) => bits(a) - bits(b) || a - b);
  const gefundeneMasken = [];
  for (const m of masken) {
    if (gefundeneMasken.some((g) => (g & m) === g)) continue;
    const x = kern.concat(rest.filter((_, i) => m & (1 << i)));
    if (umfasst(huelleMenge(x, fa), attr)) {
      gefundeneMasken.push(m);
      gefunden.push(ordnung(x));
    }
  }
  return gefunden;
}

function bits(m) {
  let z = 0;
  while (m) { z += m & 1; m >>>= 1; }
  return z;
}

function schluesselKandidaten(attribute, fa) {
  const attr = eindeutig(Array.isArray(attribute) ? attribute.filter(istText) : []);
  return kandidaten(attr, bereinigeFa(fa)).sort((a, b) => a.length - b.length);
}

function projiziereIntern(fa, attr) {
  const n = attr.length;
  const aus = [];
  if (!n) return aus;
  const maske = (menge) => attr.reduce((m, a, i) => (menge.has(a) ? m | (1 << i) : m), 0);
  const liste = (m) => attr.filter((_, i) => m & (1 << i));
  const voll = n <= MAX_VOLL;
  const alle = (1 << Math.min(n, 30)) - 1;
  const hm = new Map();
  const huelleVon = (m) => {
    if (!hm.has(m)) hm.set(m, maske(huelleMenge(liste(m), fa)));
    return hm.get(m);
  };
  const masken = [];
  if (voll) {
    for (let m = 1; m < alle; m++) masken.push(m);
  } else {
    // nur kleine linke Seiten
    for (let i = 0; i < n; i++) {
      masken.push(1 << i);
      for (let j = i + 1; j < n; j++) {
        masken.push((1 << i) | (1 << j));
        for (let k = j + 1; k < n; k++) masken.push((1 << i) | (1 << j) | (1 << k));
      }
    }
  }
  masken.sort((a, b) => bits(a) - bits(b) || a - b);
  for (const m of masken) {
    let rechts = huelleVon(m) & ~m;
    for (let i = 0; i < n && rechts; i++) {
      if (m & (1 << i)) rechts &= ~huelleVon(m & ~(1 << i));
    }
    if (rechts) aus.push({ links: liste(m), rechts: liste(rechts) });
  }
  return aus;
}

function projiziere(fa, attribute) {
  const attr = eindeutig(Array.isArray(attribute) ? attribute.filter(istText) : []);
  return projiziereIntern(bereinigeFa(fa), attr);
}

function tabellenListe(tabellen) {
  if (!Array.isArray(tabellen)) return [];
  return tabellen.map((t) => {
    const liste = Array.isArray(t) ? t : t && Array.isArray(t.attribute) ? t.attribute : [];
    return eindeutig(liste.filter(istText));
  });
}

function chase(tabellen, universum, fa) {
  if (!tabellen.length || !universum.length) return false;
  const verdeckt = eindeutig(fa.flatMap((f) => f.links.concat(f.rechts))).filter((a) => !universum.includes(a));
  const spalten = universum.concat(verdeckt);
  const index = new Map(spalten.map((a, i) => [a, i]));
  let naechstes = 1;
  // 0 = a-Symbol; sonst eindeutige b-Symbole
  const zeilen = tabellen.map((t) => spalten.map((a) => (t.includes(a) ? 0 : naechstes++)));
  const einfach = [];
  for (const f of fa) {
    if (!f.links.every((a) => index.has(a))) continue;
    for (const r of f.rechts) if (index.has(r)) einfach.push({ links: f.links.map((a) => index.get(a)), rechts: index.get(r) });
  }
  let geaendert = true;
  while (geaendert) {
    geaendert = false;
    for (const f of einfach) {
      const gruppen = new Map();
      for (const z of zeilen) {
        const s = f.links.map((i) => z[i]).join(',');
        if (!gruppen.has(s)) gruppen.set(s, []);
        gruppen.get(s).push(z);
      }
      for (const gruppe of gruppen.values()) {
        if (gruppe.length < 2) continue;
        const werte = eindeutig(gruppe.map((z) => z[f.rechts]));
        if (werte.length < 2) continue;
        const ziel = Math.min(...werte);
        const alt = new Set(werte.filter((w) => w !== ziel));
        for (const z of zeilen) if (alt.has(z[f.rechts])) z[f.rechts] = ziel;
        geaendert = true;
      }
    }
  }
  const n = universum.length;
  return zeilen.some((z) => z.slice(0, n).every((w) => w === 0));
}

function verlustfrei(tabellen, alleAttribute, fa) {
  const universum = eindeutig(Array.isArray(alleAttribute) ? alleAttribute.filter(istText) : []);
  return chase(tabellenListe(tabellen), universum, bereinigeFa(fa));
}

/* ---------------- Rückmeldungen ---------------- */

function aufzaehlung(liste) {
  if (liste.length <= 1) return liste.join('');
  return liste.slice(0, -1).join(', ') + ' und ' + liste[liste.length - 1];
}
const klammer = (liste) => '(' + liste.join(', ') + ')';

const TEXTE = {
  SPALTE_UNBEKANNT: () => 'Die Tabelle enthält eine Spalte, die es in der Aufgabe nicht gibt.',
  SCHLUESSEL_FEHLT: () => 'Markiere den Schlüssel der Tabelle.',
  SCHLUESSEL_NICHT_EINDEUTIG: (s, fehlt) =>
    `Der Schlüssel ${klammer(s)} bestimmt ${aufzaehlung(fehlt)} nicht – er ist nicht eindeutig.`,
  SCHLUESSEL_NICHT_MINIMAL: (s, reicht) => `Schlüssel nicht minimal: ${klammer(reicht)} reicht schon aus, ${klammer(s)} enthält mehr als nötig.`,
  REDUNDANZ: (rechts, links, schluessel, teil) => {
    const verb = rechts.length > 1 ? 'hängen' : 'hängt';
    const wovon = schluessel
      ? teil ? `nicht vom ganzen Schlüssel ${klammer(schluessel)}` : `nicht vom Schlüssel ${klammer(schluessel)}`
      : 'nicht vom Schlüssel der Tabelle';
    return `${aufzaehlung(rechts)} ${verb} von ${aufzaehlung(links)} ab, ${wovon} – Redundanz bleibt.`;
  },
  TABELLE_DOPPELT: (nr) => `Diese Spalten stehen alle schon in Tabelle ${nr} – die Daten wären doppelt gespeichert.`,
  SPALTE_FEHLT: (a) => `Die Spalte ${a} kommt in keiner Tabelle vor.`,
  NICHT_VERLUSTFREI: (gruppen) =>
    'Die Tabellen lassen sich nicht verlustfrei verbinden' +
    (gruppen
      ? `: Zwischen ${aufzaehlung(gruppen)} fehlt eine Verbindung über gemeinsame Spalten, die eine Seite eindeutig bestimmen.`
      : ' – es fehlen Spalten, oder beim Verbinden entstehen Zeilen, die es vorher nicht gab.'),
};

function gruppenText(nummern) {
  return nummern.length === 1 ? `Tabelle ${nummern[0]}` : `(Tabellen ${nummern.join(', ')})`;
}

/** Tabellen gierig zu verlustfrei verbundenen Gruppen zusammenfassen (für den Hinweistext). */
function verbundeneGruppen(tabellen, fa) {
  let gruppen = tabellen.map((t) => ({ nummern: [t.nr], spalten: new Set(t.spalten) }));
  let geaendert = true;
  while (geaendert && gruppen.length > 1) {
    geaendert = false;
    aussen: for (let i = 0; i < gruppen.length; i++) {
      for (let j = i + 1; j < gruppen.length; j++) {
        const gemeinsam = [...gruppen[i].spalten].filter((a) => gruppen[j].spalten.has(a));
        if (!gemeinsam.length) continue;
        const h = huelleMenge(gemeinsam, fa);
        if (umfasst(h, [...gruppen[i].spalten]) || umfasst(h, [...gruppen[j].spalten])) {
          gruppen[i] = { nummern: gruppen[i].nummern.concat(gruppen[j].nummern).sort((a, b) => a - b), spalten: new Set([...gruppen[i].spalten, ...gruppen[j].spalten]) };
          gruppen.splice(j, 1);
          geaendert = true;
          break aussen;
        }
      }
    }
  }
  return gruppen.map((g) => g.nummern);
}

function pruefeZerlegung(antwort, loesung) {
  const leer = { geloest: false, vollstaendig: false, verlustfrei: false, redundanzfrei: false, tabellen: [], hinweise: [] };
  if (!loesung || typeof loesung !== 'object' || !Array.isArray(loesung.attribute)) return leer;
  const attr = eindeutig(loesung.attribute.filter(istText));
  const fa = bereinigeFa(loesung.fa);
  const bekannt = new Set(attr);
  const roh = antwort && typeof antwort === 'object' && Array.isArray(antwort.tabellen) ? antwort.tabellen : [];

  const tabellen = roh.map((t, i) => {
    const o = t && typeof t === 'object' && !Array.isArray(t) ? t : {};
    const alle = eindeutig((Array.isArray(o.attribute) ? o.attribute : []).filter(istText));
    const spalten = alle.filter((a) => bekannt.has(a));
    const schluessel = eindeutig((Array.isArray(o.schluessel) ? o.schluessel : []).filter((a) => spalten.includes(a)));
    return { nr: i + 1, spalten: attr.filter((a) => spalten.includes(a)), schluessel: attr.filter((a) => schluessel.includes(a)), unbekannt: alle.length > spalten.length, hinweise: [] };
  });
  const genutzt = tabellen.filter((t) => t.spalten.length);
  const hinweis = (liste, code, text) => liste.push({ code, text });

  for (const t of tabellen) {
    if (t.unbekannt) hinweis(t.hinweise, 'SPALTE_UNBEKANNT', TEXTE.SPALTE_UNBEKANNT());
    if (!t.spalten.length) continue;
    const istSuper = (x) => umfasst(huelleMenge(x, fa), t.spalten);
    let schluesselOk = false;
    if (!t.schluessel.length) {
      hinweis(t.hinweise, 'SCHLUESSEL_FEHLT', TEXTE.SCHLUESSEL_FEHLT());
    } else if (!istSuper(t.schluessel)) {
      const h = huelleMenge(t.schluessel, fa);
      hinweis(t.hinweise, 'SCHLUESSEL_NICHT_EINDEUTIG', TEXTE.SCHLUESSEL_NICHT_EINDEUTIG(t.schluessel, t.spalten.filter((a) => !h.has(a))));
    } else {
      const kleiner = kandidaten(t.spalten, fa).find((k) => k.length < t.schluessel.length && k.every((a) => t.schluessel.includes(a)));
      if (kleiner) hinweis(t.hinweise, 'SCHLUESSEL_NICHT_MINIMAL', TEXTE.SCHLUESSEL_NICHT_MINIMAL(t.schluessel, kleiner));
      else schluesselOk = true;
    }
    for (const f of projiziereIntern(fa, t.spalten)) {
      if (istSuper(f.links)) continue;
      const teil = schluesselOk && f.links.every((a) => t.schluessel.includes(a));
      hinweis(t.hinweise, 'REDUNDANZ', TEXTE.REDUNDANZ(f.rechts, f.links, schluesselOk ? t.schluessel : null, teil));
    }
  }

  // Tabellen, deren Spalten vollständig in einer anderen stehen (mit Nichtschlüssel-Spalten)
  for (const t of genutzt) {
    const k = kandidaten(t.spalten, fa);
    const reineSchluesseltabelle = k.length === 1 && k[0].length === t.spalten.length;
    if (reineSchluesseltabelle) continue;
    const andere = genutzt.find((u) => u !== t && t.spalten.every((a) => u.spalten.includes(a)) &&
      (u.spalten.length > t.spalten.length || u.nr < t.nr));
    if (andere) hinweis(t.hinweise, 'TABELLE_DOPPELT', TEXTE.TABELLE_DOPPELT(andere.nr));
  }

  const hinweise = [];
  const vorhanden = new Set(genutzt.flatMap((t) => t.spalten));
  const fehlend = attr.filter((a) => !vorhanden.has(a));
  for (const a of fehlend) hinweis(hinweise, 'SPALTE_FEHLT', TEXTE.SPALTE_FEHLT(a));
  const istVerlustfrei = genutzt.length > 0 && chase(genutzt.map((t) => t.spalten), attr, fa);
  if (!istVerlustfrei && genutzt.length) {
    const gruppen = verbundeneGruppen(genutzt, fa);
    hinweis(hinweise, 'NICHT_VERLUSTFREI', TEXTE.NICHT_VERLUSTFREI(gruppen.length > 1 ? gruppen.map(gruppenText) : null));
  }

  const redundanzfrei = genutzt.length > 0 && !tabellen.some((t) => t.hinweise.some((h) => h.code === 'REDUNDANZ' || h.code === 'TABELLE_DOPPELT'));
  const aus = tabellen.map((t) => ({ ok: t.hinweise.length === 0, hinweise: t.hinweise }));
  return {
    geloest: genutzt.length > 0 && fehlend.length === 0 && istVerlustfrei && aus.every((t) => t.ok),
    vollstaendig: genutzt.length > 0 && fehlend.length === 0,
    verlustfrei: istVerlustfrei,
    redundanzfrei,
    tabellen: aus,
    hinweise,
  };
}

module.exports = { huelle, schluesselKandidaten, projiziere, verlustfrei, pruefeZerlegung };
