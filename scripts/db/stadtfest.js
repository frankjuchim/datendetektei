'use strict';
// Stadtfest (Akten 3 und 6): Generator und Abnahme nach seed/datenbanken/stadtfest/LIESMICH.md
// („Datenumfang und Verteilung“, „Abnahme-Prüfungen“). Pflicht: Stände, Produkte, Helfer 7 und 23 und der ganze
// Samstagabend am Kaffeemobil (21:00–23:59). Der Generator ergänzt Helfer 1–60, Kassen- und Zusatzschichten, Bons
// und Positionen für Fr 2026-08-28 16–24 Uhr und Sa 2026-08-29 14–24 Uhr. Verletzt ein Durchlauf eine Vorgabe
// (z. B. Umsatz-Gleichstand), zieht er deterministisch neu (versuche()).

const { versuche, plusMinuten } = require('./zufall');
const { gleich, bereich, wert, spalte, zeilen } = require('./abnahme_hilfen');

const TAGE = [
  { datum: '2026-08-28', von: 16, bis: 24 },
  { datum: '2026-08-29', von: 14, bis: 24 }
];
const KAFFEEMOBIL = 4;
const INFOZELT = 8;
const VERKAUFSSTAENDE = [1, 2, 3, 4, 5, 6, 7];
const PFLICHT_HELFER = [7, 23];
const PFLICHT_BONS = { von: 439, bis: 512 };
const VEREINE = [
  ['TuS Weserstedt', 25],
  ['Freiwillige Feuerwehr Weserstedt', 20],
  ['Förderverein Schulzentrum', 20],
  ['Shantychor Weserstedt', 15],
  [null, 20]
];
const KARTENANTEIL = { 4: 0.45, 5: 0.35 };
const PRODUKT_OHNE_VERKAUF = 26;
const LOS = 24;
const ZEILEN_GESAMT = [1400, 1650];

/** 'JJJJ-MM-TT' + Stunde (0–24) → 'JJJJ-MM-TT hh:mm' (24 Uhr = 00:00 des Folgetags). */
function zeit(datum, stunde, minute = 0) {
  return plusMinuten(`${datum} 00:00`, stunde * 60 + minute);
}

/** Pflicht-Stunden am Kaffeemobil (Sa 21–24 Uhr, keine weiteren Bons, Kassenschichten aus pflicht.sql). */
function istPflichtStundeKaffeemobil(stand, datum, stunde) {
  return stand === KAFFEEMOBIL && datum === '2026-08-29' && stunde >= 21;
}

/** Bons je Stunde (LIESMICH): Kaffeemobil 4–8 (Sa ab 18 Uhr 8–12), Bierwagen 4–8, Grillhütte 3–7, übrige 1–4. */
function bonsJeStunde(stand, datum, stunde) {
  if (stand === KAFFEEMOBIL) return datum === '2026-08-29' && stunde >= 18 ? [8, 12] : [4, 8];
  if (stand === 5) return [4, 8];
  if (stand === 1) return [3, 7];
  return [1, 4];
}

/** Schichtplan ohne Personen: Kassenschichten, Zusatzschichten (je Person 1–3), Info-Zelt. → Einheiten. */
function planeSchichten(z) {
  const einheiten = [];
  for (const tag of TAGE) {
    // Kassenschichten: Kaffeemobil stündlich, übrige Verkaufsstände in 2-Stunden-Blöcken
    for (const stand of VERKAUFSSTAENDE) {
      const laenge = stand === KAFFEEMOBIL ? 1 : 2;
      for (let h = tag.von; h < tag.bis; h += laenge) {
        if (istPflichtStundeKaffeemobil(stand, tag.datum, h)) continue;
        einheiten.push({ art: 'kasse', stand, schichten: [{ datum: tag.datum, von: h, bis: h + laenge }] });
      }
    }
    // Zusatzschichten (Ausgabe, Grill, Spülen): je Stand und Tag 1–2 Personen mit 1–3 Schichten à 2–4 Stunden.
    // Am Kaffeemobil Sa nur bis 20 Uhr (der Samstagabend ist Pflicht).
    for (const stand of VERKAUFSSTAENDE) {
      const ende = stand === KAFFEEMOBIL && tag.datum === '2026-08-29' ? 20 : tag.bis;
      const personen = z.ganz(1, 2);
      for (let p = 0; p < personen; p++) {
        const anzahl = z.ganz(1, 3);
        const schichten = [];
        let frueh = tag.von;
        for (let s = 0; s < anzahl; s++) {
          const laenge = z.ganz(2, 4);
          const spaetester = ende - laenge;
          if (spaetester < frueh) break;
          const von = z.ganz(frueh, spaetester);
          schichten.push({ datum: tag.datum, von, bis: von + laenge });
          frueh = von + laenge + 1;
        }
        einheiten.push({ art: 'zusatz', stand, schichten });
      }
    }
    // Info-Zelt: 2 Personen je 4-Stunden-Schicht, ohne Kasse
    const bloecke = tag.datum === '2026-08-28' ? [16, 20] : [14, 17, 20];
    for (const von of bloecke) {
      for (let p = 0; p < 2; p++) {
        einheiten.push({ art: 'info', stand: INFOZELT, schichten: [{ datum: tag.datum, von, bis: von + 4 }] });
      }
    }
  }
  return einheiten;
}

function intervalle(einheit) {
  return einheit.schichten.map((s) => [zeit(s.datum, s.von), zeit(s.datum, s.bis)]);
}

function ueberschneidet(a, b) {
  return a.some(([av, ab]) => b.some(([bv, bb]) => av < bb && bv < ab));
}

/**
 * Verteilt die Einheiten auf die Helfer: zuerst je eine Kassenschicht für das gleichnamige Paar, dann jeder
 * eingeplante Helfer mindestens eine Einheit, danach die übrigen Einheiten zufällig (keine Überschneidung, ≤ 4).
 */
function verteile(z, einheiten, helfer, paar) {
  const belegung = new Map(helfer.map((h) => [h, []]));
  const anzahl = new Map(helfer.map((h) => [h, 0]));
  const offen = new Set(einheiten.map((_, i) => i));
  const passt = (h, i) => !ueberschneidet(belegung.get(h), intervalle(einheiten[i]));
  const vergib = (h, i) => {
    einheiten[i].helfer = h;
    belegung.get(h).push(...intervalle(einheiten[i]));
    anzahl.set(h, anzahl.get(h) + 1);
    offen.delete(i);
  };
  for (const h of paar) {
    const kandidaten = [...offen].filter((i) => einheiten[i].art === 'kasse' && passt(h, i));
    vergib(h, z.waehle(kandidaten));
  }
  for (const h of z.mischen(helfer)) {
    if (anzahl.get(h) > 0) continue;
    const kandidaten = [...offen].filter((i) => passt(h, i));
    if (kandidaten.length === 0) return false;
    vergib(h, z.waehle(kandidaten));
  }
  for (const i of [...offen].sort((a, b) => a - b)) {
    const kandidaten = helfer.filter((h) => anzahl.get(h) < 4 && passt(h, i));
    if (kandidaten.length === 0) return false;
    vergib(z.waehle(kandidaten), i);
  }
  return true;
}

function erzeugeHelfer(z, namen) {
  const ziehung = namen.erzeugePersonen(z, { belegt: ['Selin Aksoy', 'Nora Falter'], ohneVornamen: ['Merle'] });
  const helfer = [];
  for (let nr = 1; nr <= 60; nr++) {
    if (PFLICHT_HELFER.includes(nr)) continue;
    const { vorname, nachname } = ziehung.naechste();
    let jahrgang;
    do jahrgang = z.ganz(1950, 2008); while (jahrgang === 1988);
    helfer.push({ nr, vorname, nachname, jahrgang, verein: z.gewichtet(VEREINE) });
  }
  // genau ein gleichnamiges Paar (verschiedene HelferNr und Jahrgänge)
  const [a, b] = z.stichprobe(helfer, 2).sort((x, y) => x.nr - y.nr);
  b.vorname = a.vorname;
  b.nachname = a.nachname;
  while (b.jahrgang === a.jahrgang || b.jahrgang === 1988) b.jahrgang = z.ganz(1950, 2008);
  return { helfer, paar: [a.nr, b.nr] };
}

function erzeugeBons(z, einheiten, produkte) {
  const bons = [];
  for (const e of einheiten) {
    if (e.art !== 'kasse') continue;
    const s = e.schichten[0];
    for (let h = s.von; h < s.bis; h++) {
      const [min, max] = bonsJeStunde(e.stand, s.datum, h);
      const minuten = z.stichprobe(Array.from({ length: 59 }, (_, i) => i + 1), z.ganz(min, max)).sort((x, y) => x - y);
      for (const m of minuten) {
        const auswahl = produkte.get(e.stand);
        const anzahl = Math.min(z.gewichtet([[1, 60], [2, 30], [3, 10]]), auswahl.length);
        const positionen = z.stichprobe(auswahl, anzahl).sort((x, y) => x - y)
          .map((p) => ({ produkt: p, menge: p === LOS ? z.ganz(1, 10) : z.ganz(1, 3) }));
        bons.push({ stand: e.stand, helfer: e.helfer, zeitpunkt: zeit(s.datum, h, m), zahlart: 'bar', positionen });
      }
    }
  }
  // Zahlart: Kartenanteil je Stand genau nach Vorgabe (gerundet), welche Bons, entscheidet der Zufall
  for (const stand of VERKAUFSSTAENDE) {
    const eigene = bons.filter((b) => b.stand === stand);
    const karte = Math.round(eigene.length * (KARTENANTEIL[stand] ?? 0.4));
    for (const b of z.stichprobe(eigene, karte)) b.zahlart = 'Karte';
  }
  // BonNr lückenlos in chronologischer Reihenfolge, Pflicht-Nummern 439–512 übersprungen
  bons.sort((x, y) => (x.zeitpunkt < y.zeitpunkt ? -1 : x.zeitpunkt > y.zeitpunkt ? 1 : x.stand - y.stand));
  let nr = 1;
  for (const b of bons) {
    while (nr >= PFLICHT_BONS.von && nr <= PFLICHT_BONS.bis) nr++;
    b.nr = nr++;
  }
  return bons;
}

/** Positionen mit Menge 0 außerhalb der Pflicht: 3–6, höchstens eine je Stand und Tag, ≤ 2 je Helfer, nie Kaffeemobil. */
function setzeNullpositionen(z, bons) {
  const ziel = z.ganz(3, 6);
  const standTag = new Set();
  const jeHelfer = new Map();
  let gesetzt = 0;
  for (const b of z.mischen(bons)) {
    if (gesetzt >= ziel) break;
    if (b.stand === KAFFEEMOBIL) continue;
    const schluessel = `${b.stand}|${b.zeitpunkt.slice(0, 10)}`;
    if (standTag.has(schluessel) || (jeHelfer.get(b.helfer) || 0) >= 2) continue;
    z.waehle(b.positionen).menge = 0;
    standTag.add(schluessel);
    jeHelfer.set(b.helfer, (jeHelfer.get(b.helfer) || 0) + 1);
    gesetzt++;
  }
}

function einfuegen(db, helfer, einheiten, bons) {
  const insHelfer = db.prepare('INSERT INTO Helfer VALUES (?, ?, ?, ?, ?)');
  const insSchicht = db.prepare('INSERT INTO Schicht VALUES (?, ?, ?, ?)');
  const insBon = db.prepare('INSERT INTO Bon VALUES (?, ?, ?, ?, ?)');
  const insPosition = db.prepare('INSERT INTO Position VALUES (?, ?, ?)');
  for (const h of helfer) insHelfer.run(h.nr, h.vorname, h.nachname, h.jahrgang, h.verein);
  for (const e of einheiten) {
    for (const s of e.schichten) insSchicht.run(e.helfer, e.stand, zeit(s.datum, s.von), zeit(s.datum, s.bis));
  }
  for (const b of bons) {
    insBon.run(b.nr, b.stand, b.helfer, b.zeitpunkt, b.zahlart);
    for (const p of b.positionen) insPosition.run(b.nr, p.produkt, p.menge);
  }
}

/** Vorgaben, die erst nach dem Einfügen prüfbar sind (sonst neu ziehen). */
function vorgabenErfuellt(db) {
  const gesamt = ['Stand', 'Helfer', 'Schicht', 'Produkt', 'Bon', 'Position']
    .reduce((s, t) => s + wert(db, `SELECT COUNT(*) FROM ${t}`), 0);
  if (gesamt < ZEILEN_GESAMT[0] || gesamt > ZEILEN_GESAMT[1]) return false;
  const bons = wert(db, 'SELECT COUNT(*) FROM Bon');
  const positionen = wert(db, 'SELECT COUNT(*) FROM Position');
  const schichten = wert(db, 'SELECT COUNT(*) FROM Schicht');
  const ohneVerein = wert(db, 'SELECT COUNT(*) FROM Helfer WHERE Verein IS NULL');
  if (bons < 470 || bons > 600 || positionen < 760 || positionen > 940) return false;
  if (schichten < 95 || schichten > 140 || ohneVerein < 8 || ohneVerein > 16) return false;
  const umsaetze = umsatzJeStand(db).map((u) => Math.round(u[2] * 100));
  if (new Set(umsaetze).size !== umsaetze.length) return false;
  const stueck = spalte(db, 'SELECT SUM(Menge) AS s FROM Position GROUP BY ProduktNr ORDER BY s DESC');
  if (new Set(stueck.slice(0, 4)).size !== 4) return false;
  const vereine = spalte(db, 'SELECT DISTINCT Verein FROM Helfer WHERE Verein IS NOT NULL');
  if (vereine.length !== 4) return false;
  const anteile = spalte(db, `SELECT AVG(Zahlart = 'Karte') FROM Bon
    WHERE NOT (StandNr = 4 AND Zeitpunkt >= '2026-08-29 21:00' AND Zeitpunkt < '2026-08-30 00:00') GROUP BY StandNr`);
  return anteile.every((a) => a > 0.3 && a < 0.5);
}

function generiere(db, zufall, namen) {
  const produkte = new Map();
  for (const [nr, stand] of db.prepare('SELECT ProduktNr, StandNr FROM Produkt ORDER BY ProduktNr').raw().all()) {
    if (nr === PRODUKT_OHNE_VERKAUF) continue;
    if (!produkte.has(stand)) produkte.set(stand, []);
    produkte.get(stand).push(nr);
  }
  versuche(zufall, 'stadtfest', (z) => {
    const { helfer, paar } = erzeugeHelfer(z.teil('helfer'), namen);
    const zs = z.teil('schichten');
    const einheiten = planeSchichten(zs);
    // genau 2 Helfer ohne Schicht (kurzfristig abgesagt); nie ein Teil des gleichnamigen Paars
    const ohneSchicht = zs.stichprobe(helfer.filter((h) => !paar.includes(h.nr)), 2).map((h) => h.nr);
    const eingeplant = helfer.map((h) => h.nr).filter((nr) => !ohneSchicht.includes(nr));
    if (!verteile(zs, einheiten, eingeplant, paar)) return false;
    const zb = z.teil('bons');
    const bons = erzeugeBons(zb, einheiten, produkte);
    setzeNullpositionen(zb, bons);
    db.exec('SAVEPOINT stadtfest');
    einfuegen(db, helfer, einheiten, bons);
    if (!vorgabenErfuellt(db)) {
      db.exec('ROLLBACK TO stadtfest');
      db.exec('RELEASE stadtfest');
      return false;
    }
    db.exec('RELEASE stadtfest');
    return true;
  });
}

// ---------------------------------------------------------------- Abnahme

function umsatzJeStand(db) {
  return zeilen(db, `
    SELECT Stand.StandNr, Stand.Name, SUM(Position.Menge * Produkt.Preis) AS Umsatz
    FROM Stand, Bon, Position, Produkt
    WHERE Stand.StandNr = Bon.StandNr
      AND Bon.BonNr = Position.BonNr
      AND Position.ProduktNr = Produkt.ProduktNr
    GROUP BY Stand.StandNr, Stand.Name
    ORDER BY Umsatz DESC`);
}

function abnahme(db) {
  const gesamt = ['Stand', 'Helfer', 'Schicht', 'Produkt', 'Bon', 'Position']
    .reduce((s, t) => s + wert(db, `SELECT COUNT(*) FROM ${t}`), 0);
  const fehlbetrag = wert(db, `
    SELECT SUM(Produkt.Preis) AS Fehlbetrag
    FROM Bon, Position, Produkt
    WHERE Bon.BonNr = Position.BonNr
      AND Position.ProduktNr = Produkt.ProduktNr
      AND Bon.StandNr = 4
      AND Position.Menge = 0
      AND Bon.Zeitpunkt BETWEEN '2026-08-29 22:00' AND '2026-08-29 22:59'`);
  const nullJeHelfer = zeilen(db, `
    SELECT Bon.HelferNr, COUNT(*) FROM Bon, Position
    WHERE Bon.BonNr = Position.BonNr AND Position.Menge = 0 AND Bon.HelferNr != 23
    GROUP BY Bon.HelferNr`);
  const umsatz = umsatzJeStand(db);
  const umsatzCent = umsatz.map((u) => Math.round(u[2] * 100));
  const beispiel4 = (muster) => zeilen(db, `SELECT Zahlart, COUNT(*) FROM Bon
    WHERE StandNr = 4 AND Zeitpunkt LIKE ? GROUP BY Zahlart ORDER BY Zahlart`, muster);
  const stueck = spalte(db, 'SELECT SUM(Menge) AS s FROM Position GROUP BY ProduktNr ORDER BY s DESC');
  return [
    bereich('Zeilen gesamt', gesamt, ZEILEN_GESAMT[0], ZEILEN_GESAMT[1]),
    gleich('Zeilen Helfer', wert(db, 'SELECT COUNT(*) FROM Helfer'), 60),
    gleich('HelferNr 1–60 lückenlos', [wert(db, 'SELECT MIN(HelferNr) FROM Helfer'), wert(db, 'SELECT MAX(HelferNr) FROM Helfer')], [1, 60]),
    gleich('Zeilen Stand', wert(db, 'SELECT COUNT(*) FROM Stand'), 8),
    gleich('Zeilen Produkt', wert(db, 'SELECT COUNT(*) FROM Produkt'), 26),
    gleich('Beispiel 5: Fehlbetrag', Math.round(fehlbetrag * 100) / 100, 312.5),
    gleich('Beispiel 3: genau Helferin 23 mit 110 Nullpositionen', zeilen(db, `
      SELECT Helfer.HelferNr, Helfer.Vorname, Helfer.Nachname, COUNT(*) AS Nullpositionen
      FROM Helfer, Bon, Position
      WHERE Helfer.HelferNr = Bon.HelferNr
        AND Bon.BonNr = Position.BonNr
        AND Position.Menge = 0
      GROUP BY Helfer.HelferNr, Helfer.Vorname, Helfer.Nachname
      HAVING COUNT(*) >= 3`), [[23, 'Nora', 'Falter', 110]]),
    gleich('Verdächtige Stunde: 52 Bons, nur Helferin 23, nur bar', zeilen(db, `
      SELECT COUNT(*), MIN(HelferNr), MAX(HelferNr), MIN(Zahlart), MAX(Zahlart) FROM Bon
      WHERE StandNr = 4 AND Zeitpunkt >= '2026-08-29 22:00' AND Zeitpunkt < '2026-08-29 23:00'`), [[52, 23, 23, 'bar', 'bar']]),
    bereich('Kaffeemobil Sa vor 22 Uhr: Bons', wert(db, `SELECT COUNT(*) FROM Bon WHERE StandNr = 4
      AND Zeitpunkt >= '2026-08-29 00:00' AND Zeitpunkt < '2026-08-29 22:00'`), 8),
    bereich('Kaffeemobil Sa nach 23 Uhr: Bons', wert(db, `SELECT COUNT(*) FROM Bon WHERE StandNr = 4
      AND Zeitpunkt >= '2026-08-29 23:00' AND Zeitpunkt < '2026-08-30 00:00'`), 8),
    gleich('Kinderpunsch (Produkt 26) nie verkauft', wert(db, 'SELECT COUNT(*) FROM Position WHERE ProduktNr = 26'), 0),
    gleich('Info-Zelt (Stand 8) ohne Bon', wert(db, 'SELECT COUNT(*) FROM Bon WHERE StandNr = 8'), 0),
    gleich('Menge 0 außerhalb Helfer 23: ≤ 2 je Helfer', nullJeHelfer.filter(([, n]) => n > 2), []),
    bereich('Menge 0 außerhalb Helfer 23: insgesamt', nullJeHelfer.reduce((s, [, n]) => s + n, 0), 0, 6),
    gleich('Menge 0 außerhalb der Pflicht: höchstens eine je Stand und Tag, nie am Kaffeemobil', wert(db, `
      SELECT COUNT(*) FROM (SELECT Bon.StandNr, substr(Bon.Zeitpunkt, 1, 10) AS Tag FROM Bon, Position
        WHERE Bon.BonNr = Position.BonNr AND Position.Menge = 0 AND Bon.HelferNr != 23
        GROUP BY Bon.StandNr, Tag HAVING COUNT(*) > 1 OR Bon.StandNr = 4)`), 0),
    gleich('Bons auf voller Stunde', wert(db, "SELECT COUNT(*) FROM Bon WHERE Zeitpunkt LIKE '%:00'"), 0),
    gleich('Gleichnamige Helfer: genau 1 Paar', zeilen(db, `SELECT COUNT(*) FROM Helfer
      GROUP BY Vorname, Nachname HAVING COUNT(*) > 1`), [[2]]),
    gleich('Jahrgang 1988: nur Helferin 23', spalte(db, 'SELECT HelferNr FROM Helfer WHERE Jahrgang = 1988'), [23]),
    gleich('Beispiel 1: 7 Zeilen', umsatz.length, 7),
    gleich('Beispiel 1: Umsätze paarweise verschieden', new Set(umsatzCent).size, umsatzCent.length),
    gleich('Jeder Bon in einer Kassenschicht seines Kassierers am selben Stand', wert(db, `
      SELECT COUNT(*) FROM Bon WHERE NOT EXISTS (
        SELECT 1 FROM Schicht WHERE Schicht.HelferNr = Bon.HelferNr AND Schicht.StandNr = Bon.StandNr
          AND Bon.Zeitpunkt >= Schicht.Beginn AND Bon.Zeitpunkt < Schicht.Ende)`), 0),
    // erwartete Ergebnisse der Beispielabfragen (LIESMICH)
    gleich('Beispiel 2a: 52 Bons', wert(db, `SELECT COUNT(*) FROM Bon WHERE StandNr = 4
      AND Zeitpunkt BETWEEN '2026-08-29 22:00' AND '2026-08-29 22:59'`), 52),
    gleich('Beispiel 2b: 125 Positionen, 20 Artikel', zeilen(db, `
      SELECT COUNT(*), SUM(Position.Menge) FROM Bon, Position
      WHERE Bon.BonNr = Position.BonNr AND Bon.StandNr = 4
        AND Bon.Zeitpunkt BETWEEN '2026-08-29 22:00' AND '2026-08-29 22:59'`), [[125, 20]]),
    gleich('Beispiel 4: bar 52 (22 Uhr)', beispiel4('2026-08-29 22:%'), [['bar', 52]]),
    gleich('Beispiel 4: Karte 5, bar 7 (21 Uhr)', beispiel4('2026-08-29 21:%'), [['Karte', 5], ['bar', 7]]),
    gleich('Beispiel 4: Karte 4, bar 6 (23 Uhr)', beispiel4('2026-08-29 23:%'), [['Karte', 4], ['bar', 6]]),
    gleich('Beispiel 6: ab 21 Uhr Selin Aksoy, Nora Falter, Selin Aksoy', zeilen(db, `
      SELECT Helfer.Vorname, Helfer.Nachname, Schicht.Beginn FROM Helfer, Schicht
      WHERE Helfer.HelferNr = Schicht.HelferNr AND Schicht.StandNr = 4 AND Schicht.Beginn >= '2026-08-29 21:00'
      ORDER BY Schicht.Beginn`), [['Selin', 'Aksoy', '2026-08-29 21:00'], ['Nora', 'Falter', '2026-08-29 22:00'],
      ['Selin', 'Aksoy', '2026-08-29 23:00']]),
    gleich('Beispiel 7: Stückzahlen der Top 3 paarweise verschieden und ≠ Platz 4', new Set(stueck.slice(0, 4)).size, 4),
    // weitere Generator-Vorgaben
    gleich('Helfer ohne Schicht', wert(db, 'SELECT COUNT(*) FROM Helfer WHERE HelferNr NOT IN (SELECT HelferNr FROM Schicht)'), 2),
    gleich('Helferin 23 nur mit der Pflicht-Schicht', wert(db, 'SELECT COUNT(*) FROM Schicht WHERE HelferNr = 23'), 1),
    gleich('Gleichnamiges Paar: verschiedene Jahrgänge, beide mit Bons', wert(db, `
      SELECT COUNT(*) FROM Helfer h1, Helfer h2
      WHERE h1.Vorname = h2.Vorname AND h1.Nachname = h2.Nachname AND h1.HelferNr < h2.HelferNr
        AND h1.Jahrgang != h2.Jahrgang
        AND h1.HelferNr IN (SELECT HelferNr FROM Bon) AND h2.HelferNr IN (SELECT HelferNr FROM Bon)`), 1),
    gleich('Kaffeemobil Sa 21:00–23:59: nur die 74 Pflicht-Bons', wert(db, `SELECT COUNT(*) FROM Bon WHERE StandNr = 4
      AND Zeitpunkt >= '2026-08-29 21:00' AND Zeitpunkt < '2026-08-30 00:00'`), 74),
    gleich('Je Stand und Stunde genau ein Kassierer', wert(db, `
      SELECT COUNT(*) FROM (SELECT StandNr, substr(Zeitpunkt, 1, 13) AS Stunde FROM Bon
        GROUP BY StandNr, Stunde HAVING COUNT(DISTINCT HelferNr) > 1)`), 0),
    gleich('Positionen nur mit Produkten des eigenen Standes', wert(db, `
      SELECT COUNT(*) FROM Position, Bon, Produkt WHERE Position.BonNr = Bon.BonNr
        AND Position.ProduktNr = Produkt.ProduktNr AND Produkt.StandNr != Bon.StandNr`), 0)
  ];
}

module.exports = { generiere, abnahme };
