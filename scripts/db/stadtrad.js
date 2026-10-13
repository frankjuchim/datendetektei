'use strict';
// StadtRad (Akten 2 und 6): Generator und Abnahme nach seed/datenbanken/stadtrad/LIESMICH.md
// („Datenumfang und Verteilung“, „Abnahme-Prüfungen“). Bestand nach Übernahme (SQL-Werkstatt) + Pflicht:
// Station 13, Rad 45, Kunde 28, Ausleihe 310, Reparatur 24. Der Generator ergänzt Kunden 26–80 (ohne 52/64/77),
// 150 reguläre Fahrten (311–460), 9 laufende Ausleihen (461–469) und 12 Reparaturen (25–36).

const fs = require('node:fs');
const path = require('node:path');
const { versuche, zuMinuten, alsZeitpunkt, alsDatum, plusTage } = require('./zufall');
const { gleich, bereich, wert, spalte, zeilen, zeilenzahlen } = require('./abnahme_hilfen');

const ERSTER_TAG = '2026-08-21';
const LETZTER_TAG = '2026-09-20';
const STADTTEILE = ['Altstadt', 'Hafenviertel', 'Weserufer', 'Mühlenfeld', 'Nordheide', 'Lindenhof', 'Deichkamp',
  'Bahnhofsviertel'];

const KUNDEN_VON = 26;
const KUNDEN_BIS = 80;
const NEUANMELDUNGEN = [79, 80];          // ohne jede Ausleihe (Neuanmeldungen vom 19./20.09.)
const STORY_KUNDEN = [64, 77];            // nur Pflicht-Fahrten
const REGULAER_VON = 311;
const REGULAER_ANZAHL = 150;
const LAUFEND_VON = 461;
const VERMISST = [41, 42, 43, 44, 45];
const WERKSTATT_RAEDER = [10, 15, 16, 25, 39];
const HAFENKANTE = 13;
/** Räder mit Status 'ausgeliehen' → frühere Station (Kommentar in uebernahme.sql). */
const FRUEHERE_STATION = [[1, 4], [5, 1], [9, 9], [18, 8], [20, 11], [23, 11], [29, 3], [32, 6], [35, 9]];
const REPARATUR_VON = 25;
const REPARATUR_GRUENDE = ['Schaltung', 'Inspektion', 'Licht defekt', 'Sattel ersetzt', 'Platter Reifen',
  'Bremse defekt', 'Rahmen verbogen'];

/** Preis nach Werkstatt-Formel (Tarif ohne Einfluss), auf Cent gerundet. */
const PREIS = { Citybike: [1.0, 0.08], 'E-Bike': [1.5, 0.12], Lastenrad: [2.0, 0.12] };
function preis(typ, dauer) {
  const [grund, proMinute] = PREIS[typ];
  return Math.round((grund + proMinute * dauer) * 100) / 100;
}

/** Stunden-Gewichte für Starts regulärer Fahrten (06:00–23:30). */
const STUNDEN = [[6, 1], [7, 3], [8, 4], [9, 3], [10, 2], [11, 2], [12, 3], [13, 3], [14, 3], [15, 3], [16, 4], [17, 5],
  [18, 4], [19, 3], [20, 2], [21, 2], [22, 1], [23, 0.5]];

// ---------------------------------------------------------------- Hilfen

function tage() {
  const liste = [];
  for (let d = ERSTER_TAG; d <= LETZTER_TAG; d = plusTage(d, 1)) liste.push(d);
  return liste;
}

/** Rechtsschiefe Dauer 5–90 min, Median ≈ 18 (Log-Normal über Box-Muller). */
function dauer(z) {
  const u1 = Math.max(z.zahl(), 1e-12);
  const u2 = z.zahl();
  const normal = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return Math.min(90, Math.max(5, Math.round(18 * Math.exp(0.6 * normal))));
}

/** Belegungszeiten (Minuten) je Schlüssel; Ende null = offen. */
function belegung() {
  const map = new Map();
  return {
    frei(schluessel, von, bis) {
      return (map.get(schluessel) || []).every(([a, b]) => bis < a || von > (b === null ? Infinity : b));
    },
    belege(schluessel, von, bis) {
      if (!map.has(schluessel)) map.set(schluessel, []);
      map.get(schluessel).push([von, bis]);
    }
  };
}

/** Namen (Vorname, Nachname) aus den pflicht.sql der anderen DBs – werden in StadtRad nie zusätzlich erzeugt. */
function namenAusAnderenDbs(quellen, namen) {
  const belegt = [];
  if (!quellen || !fs.existsSync(quellen)) return belegt;
  const vornamen = new Set(namen.vornamen);
  for (const ordner of fs.readdirSync(quellen).sort()) {
    if (ordner === 'stadtrad') continue;
    const datei = path.join(quellen, ordner, 'pflicht.sql');
    if (!fs.existsSync(datei)) continue;
    const text = fs.readFileSync(datei, 'utf8');
    for (const m of text.matchAll(/'([A-ZÄÖÜ][a-zäöüß]+)',\s*'([A-ZÄÖÜ][A-Za-zäöüß-]+)'/g)) {
      if (vornamen.has(m[1])) belegt.push(`${m[1]} ${m[2]}`);
    }
    for (const m of text.matchAll(/'([A-ZÄÖÜ][a-zäöüß]+) ([A-ZÄÖÜ][A-Za-zäöüß-]+)'/g)) {
      if (vornamen.has(m[1])) belegt.push(`${m[1]} ${m[2]}`);
    }
  }
  return belegt;
}

// ---------------------------------------------------------------- Kunden

function erzeugeKunden(z, db, namen, quellen) {
  const vorhanden = db.prepare('SELECT KundenID, Vorname, Nachname FROM Kunde').all();
  const belegteIds = new Set(vorhanden.map((k) => k.KundenID));
  const ids = [];
  for (let id = KUNDEN_VON; id <= KUNDEN_BIS; id++) if (!belegteIds.has(id)) ids.push(id);
  const personen = namen.erzeugePersonen(z, {
    belegt: [...vorhanden.map((k) => ({ vorname: k.Vorname, nachname: k.Nachname })), ...namenAusAnderenDbs(quellen, namen)]
  });
  // Stadtteile gleichverteilt: jede der acht 6- oder 7-mal (52 = 8 × 6 + 4)
  const stadtteile = z.mischen([...STADTTEILE.flatMap((s) => Array(Math.floor(ids.length / 8)).fill(s)),
    ...z.stichprobe(STADTTEILE, ids.length % 8)]);
  return ids.map((id, i) => {
    const stadtteil = stadtteile[i];
    let jahrgang;
    do {
      jahrgang = z.ja(0.7) ? z.ganz(1975, 2005) : z.waehle([z.ganz(1950, 1974), z.ganz(2006, 2012)]);
    } while (!namen.kombinationErlaubt(jahrgang, stadtteil));
    const tarif = jahrgang >= 2007 ? 'Schule' : z.gewichtet([['Basis', 60], ['Plus', 40]]);
    const { vorname, nachname } = personen.naechste();
    return { KundenID: id, Vorname: vorname, Nachname: nachname, Jahrgang: jahrgang, Tarif: tarif, Stadtteil: stadtteil };
  });
}

// ---------------------------------------------------------------- Ausleihen

function erzeugeAusleihen(z, db, kunden) {
  const raeder = db.prepare('SELECT RadID, Typ FROM Rad ORDER BY RadID').all();
  const typ = new Map(raeder.map((r) => [r.RadID, r.Typ]));
  const stationen = db.prepare('SELECT StationID, Stellplaetze FROM Station ORDER BY StationID').all();
  const bestand = db.prepare('SELECT RadID, KundenID, Start, Ende FROM Ausleihe ORDER BY AusleihID').all();
  const radBelegt = belegung();
  const kundeBelegt = belegung();
  for (const a of bestand) {
    const von = zuMinuten(a.Start);
    const bis = a.Ende === null ? null : zuMinuten(a.Ende);
    radBelegt.belege(a.RadID, von, bis);
    kundeBelegt.belege(a.KundenID, von, bis);
  }

  // Laufende Ausleihen (9): Start 2026-09-20 15:00–19:00, nach der letzten Fahrt des Rades
  // (die erzeugten Kunden sind zu diesem Zeitpunkt schon eingefügt)
  const alleKunden = db.prepare('SELECT KundenID FROM Kunde ORDER BY KundenID').pluck().all()
    .filter((id) => !STORY_KUNDEN.includes(id) && !NEUANMELDUNGEN.includes(id));
  const laufendKunden = z.stichprobe(alleKunden, FRUEHERE_STATION.length);
  const laufend = FRUEHERE_STATION.map(([radId, station], i) => {
    const letztesEnde = Math.max(zuMinuten('2026-09-20 15:00'),
      ...bestand.filter((a) => a.RadID === radId && a.Ende !== null).map((a) => zuMinuten(a.Ende) + 1));
    const start = alsZeitpunkt(z.ganz(letztesEnde, zuMinuten('2026-09-20 19:00')));
    return { RadID: radId, KundenID: laufendKunden[i], StartStation: station, ZielStation: null, Start: start,
      Ende: null, DauerMin: null, Preis: null };
  });
  for (const l of laufend) {
    radBelegt.belege(l.RadID, zuMinuten(l.Start), null);
    kundeBelegt.belege(l.KundenID, zuMinuten(l.Start), null);
  }

  // Reguläre Fahrten (150): 3–7 je Tag
  const tagListe = tage();
  const jeTag = tagListe.map(() => 3);
  for (let rest = REGULAER_ANZAHL - 3 * tagListe.length; rest > 0;) {
    const i = z.ganz(0, tagListe.length - 1);
    if (jeTag[i] < 7) { jeTag[i]++; rest--; }
  }
  const starts = [];
  tagListe.forEach((tag, i) => {
    for (let k = 0; k < jeTag[i]; k++) {
      const letzter = tag === LETZTER_TAG;
      let minuten;
      do {
        const stunde = z.gewichtet(STUNDEN.filter(([h]) => !letzter || h < 15));
        const minute = stunde === 23 ? z.ganz(0, 30) : z.ganz(0, 59);
        minuten = zuMinuten(tag) + stunde * 60 + minute;
      } while (starts.includes(minuten));
      starts.push(minuten);
    }
  });
  starts.sort((a, b) => a - b);

  // Kunden: jede/r aus 26–80 (außer 64/77 und Neuanmeldungen) mindestens einmal, Rest überwiegend 26–80
  const pflichtFahrer = kunden.map((k) => k.KundenID).concat([52])
    .filter((id) => !NEUANMELDUNGEN.includes(id)).sort((a, b) => a - b);
  const neueKunden = pflichtFahrer;
  const alteKunden = db.prepare('SELECT KundenID FROM Kunde WHERE KundenID < ? ORDER BY KundenID').pluck().all(KUNDEN_VON);
  const kundenFolge = [...pflichtFahrer];
  while (kundenFolge.length < REGULAER_ANZAHL) {
    kundenFolge.push(z.ja(0.7) ? z.waehle(neueKunden) : z.waehle(alteKunden));
  }
  const kundenGemischt = z.mischen(kundenFolge);

  // Hafenkante als Start oder Ziel in 10–15 Fahrten (tagsüber 07:00–20:59); sonst nie
  const tagsueber = starts.map((m, i) => [m, i]).filter(([m]) => {
    const t = m % 1440;
    return t >= 7 * 60 && t < 21 * 60;
  }).map(([, i]) => i);
  const hafenFahrten = new Set(z.stichprobe(tagsueber, z.ganz(10, 15)));
  // Rundfahrten (Ziel = Start) in ≈ 5 % der Fahrten
  const rundfahrten = new Set(z.stichprobe(starts.map((_, i) => i).filter((i) => !hafenFahrten.has(i)), 7));
  const andereStationen = stationen.filter((s) => s.StationID !== HAFENKANTE).map((s) => [s.StationID, s.Stellplaetze]);

  const fahrten = [];
  for (let i = 0; i < starts.length; i++) {
    const startMin = starts[i];
    const tag = alsDatum(startMin);
    let kunde = kundenGemischt[i];
    let start;
    let ziel;
    if (hafenFahrten.has(i)) {
      const andere = z.gewichtet(andereStationen);
      [start, ziel] = z.ja(0.5) ? [HAFENKANTE, andere] : [andere, HAFENKANTE];
    } else {
      start = z.gewichtet(andereStationen);
      if (rundfahrten.has(i)) ziel = start;
      else do { ziel = z.gewichtet(andereStationen); } while (ziel === start);
    }
    const d = dauer(z);
    const endeMin = startMin + d;
    // Rad: nie 41–45, Werkstatt-Räder nach dem 15.09. nicht mehr, keine Überschneidung
    const moegliche = raeder.map((r) => r.RadID).filter((id) => !VERMISST.includes(id) &&
      !(WERKSTATT_RAEDER.includes(id) && tag > '2026-09-15') && radBelegt.frei(id, startMin, endeMin));
    if (moegliche.length === 0) return false;
    const rad = z.waehle(moegliche);
    // Kunde ohne Überschneidung; sonst eine andere Person aus derselben Gruppe
    for (let versuch = 0; !kundeBelegt.frei(kunde, startMin, endeMin); versuch++) {
      if (versuch > 50) return false;
      kunde = z.ja(0.7) ? z.waehle(neueKunden) : z.waehle(alteKunden);
    }
    radBelegt.belege(rad, startMin, endeMin);
    kundeBelegt.belege(kunde, startMin, endeMin);
    fahrten.push({ RadID: rad, KundenID: kunde, StartStation: start, ZielStation: ziel, Start: alsZeitpunkt(startMin),
      Ende: alsZeitpunkt(endeMin), DauerMin: d, Preis: preis(typ.get(rad), d) });
  }
  // Ersetzte Kunden können Pflichtfahrer verdrängt haben → jede/r muss mindestens eine Fahrt haben
  const gefahren = new Set(fahrten.map((f) => f.KundenID));
  if (!pflichtFahrer.every((id) => gefahren.has(id))) return false;

  fahrten.forEach((f, i) => { f.AusleihID = REGULAER_VON + i; });
  laufend.sort((a, b) => (a.Start < b.Start ? -1 : a.Start > b.Start ? 1 : a.RadID - b.RadID));
  laufend.forEach((l, i) => { l.AusleihID = LAUFEND_VON + i; });
  return [...fahrten, ...laufend];
}

// ---------------------------------------------------------------- Reparaturen

function erzeugeReparaturen(z, db, ausleihen) {
  const raeder = db.prepare('SELECT RadID, Typ FROM Rad WHERE RadID <= 40 ORDER BY RadID').all();
  const typ = new Map(raeder.map((r) => [r.RadID, r.Typ]));
  const alle = [...db.prepare('SELECT RadID, Start FROM Ausleihe').all(), ...ausleihen];
  const letzteFahrt = (radId) => alle.filter((a) => a.RadID === radId).map((a) => a.Start.slice(0, 10))
    .reduce((m, d) => (d > m ? d : m), '0000-00-00');
  const grund = (radId) => z.waehle(typ.get(radId) === 'E-Bike' ? [...REPARATUR_GRUENDE, 'Akku getauscht'] : REPARATUR_GRUENDE);
  const kosten = () => z.ganz(1000, 15000) / 100;
  const liste = [];
  // Werkstatt-Räder: Datum 16.–20.09., nicht vor ihrer letzten Fahrt
  for (const radId of WERKSTATT_RAEDER) {
    const ab = [letzteFahrt(radId), '2026-09-16'].sort()[1];
    liste.push({ RadID: radId, Datum: z.datum(ab, LETZTER_TAG), Grund: grund(radId), Kosten: kosten() });
  }
  const uebrige = raeder.map((r) => r.RadID).filter((id) => !WERKSTATT_RAEDER.includes(id));
  for (let i = 0; i < 7; i++) {
    const radId = z.waehle(uebrige);
    liste.push({ RadID: radId, Datum: z.datum(ERSTER_TAG, LETZTER_TAG), Grund: grund(radId), Kosten: kosten() });
  }
  liste.sort((a, b) => (a.Datum < b.Datum ? -1 : a.Datum > b.Datum ? 1 : a.RadID - b.RadID));
  liste.forEach((r, i) => { r.ReparaturID = REPARATUR_VON + i; });
  return liste;
}

// ---------------------------------------------------------------- Bau

/** Starts je Startstation absteigend (Beispiel 7). */
function startsJeStation(db) {
  return zeilen(db, `
    SELECT Station.StationID, COUNT(*) AS Starts
    FROM Ausleihe, Station
    WHERE Ausleihe.StartStation = Station.StationID
    GROUP BY Station.StationID
    ORDER BY Starts DESC, Station.StationID`);
}

/** Dauer der Fahrten auf Rang 5 und 6 (DS_PLANUNG A2-E2-08: kein Gleichstand an Platz 5). */
function rang5und6Dauer(db) {
  return spalte(db, 'SELECT DauerMin FROM Ausleihe WHERE Ende IS NOT NULL ORDER BY DauerMin DESC LIMIT 6').slice(4);
}

function generiere(db, zufall, namen, kontext = {}) {
  const kunden = erzeugeKunden(zufall.teil('kunden'), db, namen, kontext.quellen);
  const einKunde = db.prepare('INSERT INTO Kunde VALUES (@KundenID, @Vorname, @Nachname, @Jahrgang, @Tarif, @Stadtteil)');
  db.transaction(() => { for (const k of kunden) einKunde.run(k); })();

  const einAusleihe = db.prepare(`INSERT INTO Ausleihe VALUES (@AusleihID, @RadID, @KundenID, @StartStation,
    @ZielStation, @Start, @Ende, @DauerMin, @Preis)`);
  versuche(zufall, 'ausleihen', (z) => {
    const ausleihen = erzeugeAusleihen(z, db, kunden);
    if (!ausleihen) return false;
    db.exec('SAVEPOINT ausleihen');
    for (const a of ausleihen) einAusleihe.run(a);
    // Vorgaben, die nur auf der fertigen Tabelle prüfbar sind → sonst verwerfen und neu ziehen
    const rangfolge = startsJeStation(db);
    const [d5, d6] = rang5und6Dauer(db);
    if (rangfolge[2][1] === rangfolge[3][1] || d5 === d6) {
      db.exec('ROLLBACK TO ausleihen; RELEASE ausleihen');
      return false;
    }
    db.exec('RELEASE ausleihen');
    return true;
  });

  const ausleihen = db.prepare('SELECT RadID, Start FROM Ausleihe WHERE AusleihID >= ?').all(REGULAER_VON);
  const reparaturen = erzeugeReparaturen(zufall.teil('reparaturen'), db, ausleihen);
  const einReparatur = db.prepare('INSERT INTO Reparatur VALUES (@ReparaturID, @RadID, @Datum, @Grund, @Kosten)');
  db.transaction(() => { for (const r of reparaturen) einReparatur.run(r); })();
}

// ---------------------------------------------------------------- Abnahme

function abnahme(db) {
  const rangfolge = startsJeStation(db);
  const preisAbweichungen = wert(db, `
    SELECT COUNT(*) FROM Ausleihe, Rad
    WHERE Ausleihe.RadID = Rad.RadID AND Ausleihe.Ende IS NOT NULL
      AND ABS(Ausleihe.Preis - ROUND(CASE Rad.Typ WHEN 'Citybike' THEN 1.00 + 0.08 * Ausleihe.DauerMin
                                              WHEN 'E-Bike' THEN 1.50 + 0.12 * Ausleihe.DauerMin
                                              ELSE 2.00 + 0.12 * Ausleihe.DauerMin END, 2)) > 0.005`);
  const [d5, d6] = rang5und6Dauer(db);
  const laufend = zeilen(db, `SELECT RadID, StartStation FROM Ausleihe
    WHERE AusleihID BETWEEN 461 AND 469 AND Ende IS NULL AND ZielStation IS NULL AND DauerMin IS NULL AND Preis IS NULL
      AND Start BETWEEN '2026-09-20 15:00' AND '2026-09-20 19:00' AND KundenID NOT IN (64, 77)
    ORDER BY RadID`);
  return [
    // Tabelle „Abnahme-Prüfungen“
    ...zeilenzahlen(db, { Station: 13, Rad: 45, Kunde: 80, Ausleihe: 469, Reparatur: 36 }),
    gleich('Starts 00:00–05:59: genau 303–307', spalte(db, `
      SELECT AusleihID FROM Ausleihe
      WHERE Start LIKE '% 00:%' OR Start LIKE '% 01:%' OR Start LIKE '% 02:%' OR Start LIKE '% 03:%'
         OR Start LIKE '% 04:%' OR Start LIKE '% 05:%'
      ORDER BY AusleihID`), [303, 304, 305, 306, 307]),
    gleich("MIN(Start) ≥ '2026-08-21 00:00', MAX(Start) ≤ '2026-09-20 20:00'", (() => {
      const [min, max] = zeilen(db, 'SELECT MIN(Start), MAX(Start) FROM Ausleihe')[0];
      return min >= '2026-08-21 00:00' && max <= '2026-09-20 20:00';
    })(), true),
    gleich('Ende IS NULL: 14', wert(db, 'SELECT COUNT(*) FROM Ausleihe WHERE Ende IS NULL'), 14),
    gleich('Ausleihen der Kunden 64 und 77: 64 → 3, 77 → 5', zeilen(db, `
      SELECT KundenID, COUNT(*) FROM Ausleihe WHERE KundenID IN (64, 77) GROUP BY KundenID ORDER BY KundenID`),
    [[64, 3], [77, 5]]),
    gleich('Jahrgang 1988 + Hafenviertel: genau 64, 77', spalte(db,
      "SELECT KundenID FROM Kunde WHERE Jahrgang = 1988 AND Stadtteil = 'Hafenviertel' ORDER BY KundenID"), [64, 77]),
    gleich('Gleichnamige Kunden: genau Lena Cordes', zeilen(db,
      'SELECT Vorname, Nachname FROM Kunde GROUP BY Vorname, Nachname HAVING COUNT(*) > 1'), [['Lena', 'Cordes']]),
    gleich('Ausleihen der Räder 41–45: 5', wert(db, 'SELECT COUNT(*) FROM Ausleihe WHERE RadID BETWEEN 41 AND 45'), 5),
    gleich("Kein Kunde 'Falkenrath'", wert(db, "SELECT COUNT(*) FROM Kunde WHERE Nachname = 'Falkenrath'"), 0),
    bereich('Ausleihen am Stadtfest-Samstag 2026-08-29: mindestens 5',
      wert(db, "SELECT COUNT(*) FROM Ausleihe WHERE Start LIKE '2026-08-29%'"), 5),
    gleich('Beispiel 7 mit LIMIT 4: Rang 3 und Rang 4 verschieden', rangfolge[2][1] !== rangfolge[3][1], true),
    gleich('Preisformel je Radtyp für alle beendeten Ausleihen (auf Cent)', preisAbweichungen, 0),
    gleich('Kunden ohne Ausleihe: genau 2', wert(db,
      'SELECT COUNT(*) FROM Kunde WHERE KundenID NOT IN (SELECT KundenID FROM Ausleihe)'), 2),

    // Erwartete Ergebnisse der Beispielabfragen
    gleich('Beispiel 1: nie beendete Ausleihen = 5 Nachtfahrten + 9 laufende', spalte(db, `
      SELECT Ausleihe.AusleihID
      FROM Ausleihe, Kunde, Station
      WHERE Ausleihe.KundenID = Kunde.KundenID AND Ausleihe.StartStation = Station.StationID AND Ausleihe.Ende IS NULL
      ORDER BY Ausleihe.AusleihID`), [303, 304, 305, 306, 307, 461, 462, 463, 464, 465, 466, 467, 468, 469]),
    gleich('Beispiel 2: Fahrten von Kundin 64', zeilen(db, `
      SELECT s1.Name, s2.Name
      FROM Ausleihe a, Station s1, Station s2
      WHERE a.StartStation = s1.StationID AND a.ZielStation = s2.StationID AND a.KundenID = 64
      ORDER BY a.Start`), [['Alte Werft', 'Marktplatz'], ['Fischmarkt', 'Hafenkante'], ['Hafenkante', 'Bahnhof Nord']]),
    gleich('Beispiel 3: 19 Räder ohne Station (5 Werkstatt, 9 ausgeliehen, 5 vermisst)', zeilen(db, `
      SELECT Status, COUNT(*) FROM Rad WHERE StationID IS NULL GROUP BY Status ORDER BY Status`),
    [['Werkstatt', 5], ['ausgeliehen', 9], ['vermisst', 5]]),
    gleich('Beispiel 5: Nachtfahrten 01:00–03:59 genau 303–307 (Lastenräder 41–45 ab Hafenkante)', zeilen(db, `
      SELECT Ausleihe.AusleihID, Ausleihe.RadID, Rad.Typ, Station.Name
      FROM Ausleihe, Rad, Station
      WHERE Ausleihe.RadID = Rad.RadID AND Ausleihe.StartStation = Station.StationID
        AND (Ausleihe.Start LIKE '% 01:%' OR Ausleihe.Start LIKE '% 02:%' OR Ausleihe.Start LIKE '% 03:%')
      ORDER BY Ausleihe.Start`), [303, 304, 305, 306, 307].map((id, i) => [id, 41 + i, 'Lastenrad', 'Hafenkante'])),

    // Vorgaben aus „Datenumfang und Verteilung“
    gleich('Kunde 77 Nora Falter (1988, Plus, Hafenviertel)', zeilen(db,
      'SELECT Vorname, Nachname, Jahrgang, Tarif, Stadtteil FROM Kunde WHERE KundenID = 77'),
    [['Nora', 'Falter', 1988, 'Plus', 'Hafenviertel']]),
    gleich('Nachtfahrten 303–307: Kunde 77, Räder 41–45, Hafenkante, 2026-09-08 … 09-12, offen', zeilen(db, `
      SELECT AusleihID, RadID, KundenID, StartStation, Start FROM Ausleihe
      WHERE AusleihID BETWEEN 303 AND 307 AND ZielStation IS NULL AND Ende IS NULL AND DauerMin IS NULL AND Preis IS NULL
      ORDER BY AusleihID`), [
      [303, 41, 77, 13, '2026-09-08 01:14'], [304, 42, 77, 13, '2026-09-09 01:32'], [305, 43, 77, 13, '2026-09-10 01:05'],
      [306, 44, 77, 13, '2026-09-11 01:48'], [307, 45, 77, 13, '2026-09-12 01:21']]),
    gleich('Kunden 26–80: Jahrgang 1950–2012', wert(db,
      'SELECT COUNT(*) FROM Kunde WHERE KundenID >= 26 AND KundenID NOT IN (52, 64, 77) AND (Jahrgang < 1950 OR Jahrgang > 2012)'), 0),
    gleich("Kunden 26–80: Tarif 'Schule' genau für Jahrgang ≥ 2007", wert(db, `
      SELECT COUNT(*) FROM Kunde WHERE KundenID >= 26 AND ((Jahrgang >= 2007) != (Tarif = 'Schule'))`), 0),
    bereich('Erzeugte Kunden je Stadtteil (6–7, alle acht Stadtteile)', (() => {
      const n = zeilen(db, `SELECT Stadtteil, COUNT(*) FROM Kunde WHERE KundenID >= 26 AND KundenID NOT IN (52, 64, 77)
        GROUP BY Stadtteil`);
      return n.length === 8 && n.every(([, c]) => c >= 6 && c <= 7) ? 1 : 0;
    })(), 1, 1),
    gleich('Kunden ohne Ausleihe: die Neuanmeldungen 79, 80', spalte(db,
      'SELECT KundenID FROM Kunde WHERE KundenID NOT IN (SELECT KundenID FROM Ausleihe) ORDER BY KundenID'), [79, 80]),
    gleich('Reguläre Fahrten 311–460 chronologisch, 3–7 je Tag', (() => {
      const s = spalte(db, 'SELECT Start FROM Ausleihe WHERE AusleihID BETWEEN 311 AND 460 ORDER BY AusleihID');
      const jeTag = zeilen(db, `SELECT substr(Start, 1, 10), COUNT(*) FROM Ausleihe WHERE AusleihID BETWEEN 311 AND 460
        GROUP BY substr(Start, 1, 10)`);
      return s.length === 150 && s.every((x, i) => i === 0 || s[i - 1] <= x) && jeTag.length === 31 &&
        jeTag.every(([, c]) => c >= 3 && c <= 7);
    })(), true),
    gleich('Reguläre Fahrten: Start 06:00–23:30, am 20.09. vor 15:00', wert(db, `
      SELECT COUNT(*) FROM Ausleihe WHERE AusleihID BETWEEN 311 AND 460
        AND (substr(Start, 12) < '06:00' OR substr(Start, 12) > '23:30'
             OR (Start LIKE '2026-09-20%' AND substr(Start, 12) >= '15:00'))`), 0),
    gleich('Reguläre Fahrten: DauerMin 5–90, Ende = Start + DauerMin', wert(db, `
      SELECT COUNT(*) FROM Ausleihe WHERE AusleihID BETWEEN 311 AND 460
        AND (DauerMin < 5 OR DauerMin > 90 OR Ende != strftime('%Y-%m-%d %H:%M', Start, '+' || DauerMin || ' minutes'))`), 0),
    bereich('Reguläre Fahrten: Median DauerMin ≈ 18', spalte(db,
      'SELECT DauerMin FROM Ausleihe WHERE AusleihID BETWEEN 311 AND 460 ORDER BY DauerMin')[74], 14, 22),
    bereich('Reguläre Fahrten: ZielStation ≠ StartStation (%)', wert(db, `
      SELECT 100.0 * SUM(CASE WHEN ZielStation != StartStation THEN 1 ELSE 0 END) / COUNT(*)
      FROM Ausleihe WHERE AusleihID BETWEEN 311 AND 460`), 93, 97),
    bereich('Reguläre Fahrten mit Hafenkante als Start oder Ziel (tagsüber)', wert(db, `
      SELECT COUNT(*) FROM Ausleihe WHERE AusleihID BETWEEN 311 AND 460 AND (StartStation = 13 OR ZielStation = 13)
        AND substr(Start, 12) BETWEEN '07:00' AND '20:59'`), 10, 15),
    gleich('Reguläre Fahrten mit Hafenkante nur tagsüber', wert(db, `
      SELECT COUNT(*) FROM Ausleihe WHERE AusleihID BETWEEN 311 AND 460 AND (StartStation = 13 OR ZielStation = 13)
        AND substr(Start, 12) NOT BETWEEN '07:00' AND '20:59'`), 0),
    gleich('Reguläre Fahrten: nie Rad 41–45, Werkstatt-Räder nicht nach dem 15.09.', wert(db, `
      SELECT COUNT(*) FROM Ausleihe WHERE AusleihID BETWEEN 311 AND 460
        AND (RadID BETWEEN 41 AND 45 OR (RadID IN (10, 15, 16, 25, 39) AND Start >= '2026-09-16'))`), 0),
    gleich('Reguläre Fahrten: jede/r aus 26–80 (außer 64, 77, 79, 80) mindestens einmal', wert(db, `
      SELECT COUNT(*) FROM Kunde WHERE KundenID >= 26 AND KundenID NOT IN (64, 77, 79, 80)
        AND KundenID NOT IN (SELECT KundenID FROM Ausleihe WHERE AusleihID BETWEEN 311 AND 460)`), 0),
    bereich('Reguläre Fahrten überwiegend von Kunden 26–80 (%)', wert(db, `
      SELECT 100.0 * SUM(CASE WHEN KundenID >= 26 THEN 1 ELSE 0 END) / COUNT(*)
      FROM Ausleihe WHERE AusleihID BETWEEN 311 AND 460`), 60, 100),
    gleich('Laufende Ausleihen 461–469: je Rad die frühere Station, 20.09. 15:00–19:00', laufend,
      FRUEHERE_STATION.map(([r, s]) => [r, s])),
    gleich('Keine Überschneidung zweier Fahrten desselben Rades (Generator-Fahrten)', wert(db, `
      SELECT COUNT(*) FROM Ausleihe a, Ausleihe b
      WHERE a.RadID = b.RadID AND a.AusleihID < b.AusleihID AND b.AusleihID > 310
        AND a.Start <= COALESCE(b.Ende, '9999') AND b.Start <= COALESCE(a.Ende, '9999')`), 0),
    gleich('Keine Überschneidung zweier Ausleihen derselben Person (Generator-Fahrten)', wert(db, `
      SELECT COUNT(*) FROM Ausleihe a, Ausleihe b
      WHERE a.KundenID = b.KundenID AND a.AusleihID < b.AusleihID AND b.AusleihID > 310
        AND a.Start <= COALESCE(b.Ende, '9999') AND b.Start <= COALESCE(a.Ende, '9999')`), 0),
    gleich('Reparaturen 25–36: Werkstatt-Räder 10, 15, 16, 25, 39 je einmal am 16.–20.09.', spalte(db, `
      SELECT RadID FROM Reparatur WHERE ReparaturID >= 25 AND RadID IN (10, 15, 16, 25, 39)
        AND Datum BETWEEN '2026-09-16' AND '2026-09-20' ORDER BY RadID`), [10, 15, 16, 25, 39]),
    gleich('Reparaturen 25–36: Datum im Zeitraum, Kosten 10–150 €, Rad 1–40, Akku nur bei E-Bikes', wert(db, `
      SELECT COUNT(*) FROM Reparatur, Rad WHERE Reparatur.RadID = Rad.RadID AND ReparaturID >= 25
        AND (Datum NOT BETWEEN '2026-08-21' AND '2026-09-20' OR Kosten < 10 OR Kosten > 150 OR Rad.RadID > 40
             OR (Grund = 'Akku getauscht' AND Rad.Typ != 'E-Bike'))`), 0),
    gleich('DS_PLANUNG A2-E2-08: kein Gleichstand an Platz 5 der längsten Fahrten', d5 !== d6, true)
  ];
}

module.exports = { generiere, abnahme, preis };
