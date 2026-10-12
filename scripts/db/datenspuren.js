'use strict';
// Datenspuren (Akte 6, Finale): Generator und Abnahme nach seed/datenbanken/datenspuren/LIESMICH.md
// („Datenumfang und Verteilung“, „Abnahme-Prüfungen“, Schlussplädoyer in sechs Stufen, Spec E11) und
// seed/datenbanken/LIESMICH.md §6 „DB-übergreifende Ableitungen“.
//
// Ableitungen über kontext.datenbank() (Bau-Reihenfolge stadtrad → stadtfest → tus → detektei → datenspuren):
//   RadExport   = alle Ausleihen aus StadtRad (Token je KundenID; 77 → R-7F3A, 64 → R-21C4)
//   FestZahlung = alle Bons mit Zahlart 'Karte' aus Stadtfest (Token je zahlender Person, Betrag = Bonsumme)
//   Einwohner   = Personen aus StadtRad, Stadtfest, TuS, Detektei (außer „Nora Falter“) mit gleichem Jahrgang und
//                 Stadtteil (fehlt er in der Quelle, wird er gezogen; TuS: Stadtteil aus VereinExport) + Auffüllen
//   AppCheckin  = Geräte von ≈ 30 % der StadtRad-Kundschaft (Check-in bei jeder Ausleihe) + markierte Orte +
//                 nächtliche Adress-Check-ins von ≈ 15 Geräten, die (ungespeichert) einem Einwohner gehören
// VereinExport steht vollständig in pflicht.sql; die Abnahme prüft die 1:1-Ableitung aus TuS (aus der TuS-LIESMICH
// hierher delegiert), ebenso die Zeile „Datenspuren.Einwohner …“ der Detektei-LIESMICH.

const { versuche, zuMinuten, alsZeitpunkt, alsDatum, wochentag } = require('./zufall');
const { gleich, bereich, wert, spalte, zeilen } = require('./abnahme_hilfen');

const ERSTER_TAG = '2026-08-21';
const LETZTER_TAG = '2026-09-20';
const DATENSTAND = '2026-09-20 20:00';
const EINWOHNER_VON = 1001;
const EINWOHNER_ZIEL = 250;
const STADTTEILE = ['Altstadt', 'Hafenviertel', 'Weserufer', 'Mühlenfeld', 'Nordheide', 'Lindenhof', 'Deichkamp', 'Bahnhofsviertel'];
/** Zielanteile (LIESMICH: sechs große Stadtteile je 14–18 %, Weserufer ≈ 6 %, Deichkamp ≈ 2 %). */
const ZIELANTEIL = {
  Hafenviertel: 0.153, Altstadt: 0.153, Lindenhof: 0.153, 'Mühlenfeld': 0.153, Nordheide: 0.153, Bahnhofsviertel: 0.155,
  Weserufer: 0.06, Deichkamp: 0.02
};
/** Pflicht-Einwohner, die nie einem zusätzlichen Gerät gehören (Kandidaten und Nachbar, Story). */
const STORY_EINWOHNER = [1042, 1107, 1163, 1218];
const PFLICHT_GERAETE = ['WA-3917', 'WA-5530', 'WA-1288', 'WA-6120', 'WA-2046', 'WA-4410'];
/** Kartentoken der Pflicht-Bons (datenspuren/pflicht.sql, Kommentare „Bon …“). */
const PFLICHT_KARTEN = new Map([[439, 'K-4A91'], [441, 'K-0C37'], [444, 'K-7E52'], [447, 'K-2B18'], [450, 'K-9D64'],
  [503, 'K-5F03'], [506, 'K-3A7C'], [508, 'K-8B25'], [511, 'K-6C49']]);
const PFLICHT_KUNDEN = new Map([[77, 'R-7F3A'], [64, 'R-21C4']]);
const TATORTE = ['Hafenkante', 'Festplatz', 'Fundbüro', 'Vereinsheim TuS'];
const APP_ZEILEN = [180, 230];

// ---------------------------------------------------------------- Hilfen

/** Token-Erzeuger '<präfix>-XXXX' (hexadezimal, groß), eindeutig; nie mit '90' beginnend (Varianten ab 9001). */
function tokenQuelle(z, praefix, belegt = []) {
  const vergeben = new Set(belegt);
  return () => {
    for (;;) {
      const t = `${praefix}-${z.ganz(0, 0xffff).toString(16).toUpperCase().padStart(4, '0')}`;
      if (t.slice(praefix.length + 1).startsWith('90') || vergeben.has(t)) continue;
      vergeben.add(t);
      return t;
    }
  };
}

/** Geräte 'WA-0000' (1000–8999, Varianten ab 9001), eindeutig. */
function geraeteQuelle(z, belegt) {
  const vergeben = new Set(belegt);
  return () => {
    for (;;) {
      const g = `WA-${z.ganz(1000, 8999)}`;
      if (vergeben.has(g)) continue;
      vergeben.add(g);
      return g;
    }
  };
}

const TAGE = [];
for (let m = zuMinuten(ERSTER_TAG); m <= zuMinuten(LETZTER_TAG); m += 1440) TAGE.push(alsDatum(m));
const WERKTAGE = TAGE.filter((t) => wochentag(t) <= 5);

/** Zeitpunkt an `tag` zwischen `von` und `bis` (Stunden, bis ausschließlich), Raster 1 min. */
function zeitAm(z, tag, von, bis) {
  return alsZeitpunkt(zuMinuten(tag) + z.ganz(von * 60, bis * 60 - 1));
}

// ---------------------------------------------------------------- Quellen lesen

/** Personen aus den Quell-DBs (ohne „Nora Falter“) in fester Reihenfolge. */
function quellPersonen(kontext, db) {
  const rad = kontext.datenbank('stadtrad');
  const fest = kontext.datenbank('stadtfest');
  const tus = kontext.datenbank('tus');
  const detektei = kontext.datenbank('detektei');
  const personen = [];
  for (const k of rad.prepare('SELECT * FROM Kunde WHERE KundenID != 77 ORDER BY KundenID').all()) {
    personen.push({ quelle: `Kunde ${k.KundenID}`, kundenId: k.KundenID, vorname: k.Vorname, nachname: k.Nachname,
      jahrgang: k.Jahrgang, stadtteil: k.Stadtteil });
  }
  // TuS: Stadtteil aus VereinExport (Zuordnung Mitgliedschaft ↔ Exportzeile in fester Reihenfolge)
  const stadtteilJeMitglied = tusStadtteile(tus, db);
  for (const m of tus.prepare('SELECT * FROM Mitglied ORDER BY MitgliedNr').all()) {
    if (m.Vorname === 'Nora' && m.Nachname === 'Falter') continue;
    personen.push({ quelle: `Mitglied ${m.MitgliedNr}`, vorname: m.Vorname, nachname: m.Nachname, jahrgang: m.Geburtsjahr,
      stadtteil: stadtteilJeMitglied.get(m.MitgliedNr) ?? null });
  }
  for (const p of detektei.prepare('SELECT * FROM Person WHERE PersonNr != 13 ORDER BY PersonNr').all()) {
    personen.push({ quelle: `Person ${p.PersonNr}`, vorname: p.Vorname, nachname: p.Nachname, jahrgang: p.Jahrgang,
      stadtteil: p.Stadtteil });
  }
  for (const h of fest.prepare('SELECT * FROM Helfer WHERE HelferNr != 23 ORDER BY HelferNr').all()) {
    personen.push({ quelle: `Helfer ${h.HelferNr}`, vorname: h.Vorname, nachname: h.Nachname, jahrgang: h.Jahrgang, stadtteil: null });
  }
  return personen;
}

/** Mitgliedschaften der TuS (nach MitgliedNr, Einfügereihenfolge) ↔ VereinExport-Zeilen (Einfügereihenfolge). */
function tusZuordnung(tus, db) {
  const ms = tus.prepare(`SELECT Mitglied.MitgliedNr, Mitglied.Vorname, Mitglied.Nachname, Mitglied.Geburtsjahr,
      Abteilung.Name AS Abteilung
    FROM Mitglied, Mitgliedschaft, Abteilung
    WHERE Mitglied.MitgliedNr = Mitgliedschaft.MitgliedNr AND Mitgliedschaft.AbteilungNr = Abteilung.AbteilungNr
    ORDER BY Mitglied.MitgliedNr, Mitgliedschaft.rowid`).all();
  const ve = db.prepare('SELECT MitgliedToken, Geburtsjahr, Abteilung, Stadtteil FROM VereinExport ORDER BY rowid').all();
  return { ms, ve };
}

function tusStadtteile(tus, db) {
  const { ms, ve } = tusZuordnung(tus, db);
  const map = new Map();
  ms.forEach((m, i) => { if (ve[i]) map.set(m.MitgliedNr, ve[i].Stadtteil); });
  return map;
}

// ---------------------------------------------------------------- Einwohner

function erzeugeEinwohner(z, db, namen, kontext) {
  const pflicht = db.prepare('SELECT * FROM Einwohner ORDER BY EinwohnerNr').all();
  const schluessel = (v, n, j) => `${v}|${n}|${j}`;
  const nachSchluessel = new Map(pflicht.map((e) => [schluessel(e.Vorname, e.Nachname, e.Jahrgang),
    { nr: e.EinwohnerNr, vorname: e.Vorname, nachname: e.Nachname, jahrgang: e.Jahrgang, stadtteil: e.Stadtteil, pflicht: true,
      quellen: [] }]));
  const neu = [];
  const offen = []; // Personen ohne Stadtteil (werden nach der Verteilung gezogen)
  for (const p of quellPersonen(kontext, db)) {
    let jahrgang = p.jahrgang;
    if (jahrgang === null) {
      // Detektei: Jahrgang fehlt → ziehen (1940–2008 wie dort), reservierte Kombination meiden
      do jahrgang = z.ganz(1940, 2008); while (p.stadtteil !== null && !namen.kombinationErlaubt(jahrgang, p.stadtteil));
    }
    const k = schluessel(p.vorname, p.nachname, jahrgang);
    let e = nachSchluessel.get(k);
    if (!e) {
      e = { nr: null, vorname: p.vorname, nachname: p.nachname, jahrgang, stadtteil: null, pflicht: false, quellen: [] };
      nachSchluessel.set(k, e);
      neu.push(e);
    }
    e.quellen.push(p.quelle);
    if (p.kundenId !== undefined) e.kundenId = p.kundenId;
    if (p.stadtteil !== null) {
      if (e.stadtteil !== null && e.stadtteil !== p.stadtteil) {
        throw new Error(`Einwohner ${p.vorname} ${p.nachname} (${jahrgang}): Stadtteil ${e.stadtteil} ≠ ${p.stadtteil} (${e.quellen.join(', ')})`);
      }
      e.stadtteil = p.stadtteil;
    }
  }
  for (const e of neu) if (e.stadtteil === null) offen.push(e);

  const gesamt = pflicht.length + neu.length;
  if (gesamt > EINWOHNER_ZIEL) {
    throw new Error(`Einwohner: Quellen ergeben ${gesamt} Personen, mehr als ${EINWOHNER_ZIEL} (LIESMICH „Datenumfang“)`);
  }
  // Auffüllen bis 250 aus namen.json (neue Namenskombinationen)
  const ziehung = namen.erzeugePersonen(z, { belegt: [...nachSchluessel.values()].map((e) => `${e.vorname} ${e.nachname}`) });
  for (let i = gesamt; i < EINWOHNER_ZIEL; i++) {
    const { vorname, nachname } = ziehung.naechste();
    const e = { nr: null, vorname, nachname, jahrgang: z.ganz(1930, 2020), stadtteil: null, pflicht: false, quellen: [] };
    neu.push(e);
    offen.push(e);
  }

  // Stadtteile ziehen (Personen in zufälliger Reihenfolge): jeweils der Stadtteil mit dem größten Fehlbestand gegenüber
  // der Zielverteilung, bei Gleichstand zufällig. Die Quellen geben die übrigen Stadtteile vor.
  const anzahl = new Map(STADTTEILE.map((s) => [s, 0]));
  for (const e of [...pflicht.map((p) => ({ stadtteil: p.Stadtteil })), ...neu]) {
    if (e.stadtteil !== null) anzahl.set(e.stadtteil, anzahl.get(e.stadtteil) + 1);
  }
  for (const e of z.mischen(offen)) {
    const erlaubt = STADTTEILE.filter((s) => namen.kombinationErlaubt(e.jahrgang, s));
    const fehl = (s) => Math.round((ZIELANTEIL[s] * EINWOHNER_ZIEL - anzahl.get(s)) * 1000);
    const max = Math.max(...erlaubt.map(fehl));
    e.stadtteil = z.waehle(erlaubt.filter((s) => fehl(s) === max));
    anzahl.set(e.stadtteil, anzahl.get(e.stadtteil) + 1);
  }

  // Adressen und Nummern (gemischt, damit die EinwohnerNr nichts über die Quelle verrät)
  const adressen = namen.erzeugeAdressen(z, { belegt: pflicht.map((p) => p.Strasse) });
  const belegteNr = new Set(pflicht.map((p) => p.EinwohnerNr));
  const freieNr = [];
  for (let nr = EINWOHNER_VON; freieNr.length < neu.length; nr++) if (!belegteNr.has(nr)) freieNr.push(nr);
  const gemischt = z.mischen(neu);
  gemischt.forEach((e, i) => {
    e.nr = freieNr[i];
    e.strasse = adressen.naechste(e.stadtteil);
  });
  return { neu: gemischt, alle: [...pflicht.map((p) => ({ nr: p.EinwohnerNr, strasse: p.Strasse, pflicht: true })), ...gemischt] };
}

// ---------------------------------------------------------------- RadExport

function erzeugeRadExport(z, db, kontext) {
  const rad = kontext.datenbank('stadtrad');
  const ausleihen = rad.prepare(`SELECT Ausleihe.AusleihID, Ausleihe.KundenID, Kunde.Jahrgang, Kunde.Stadtteil, Kunde.Tarif,
      Station.Name AS StartStation, Ausleihe.Start
    FROM Ausleihe, Kunde, Station
    WHERE Ausleihe.KundenID = Kunde.KundenID AND Ausleihe.StartStation = Station.StationID
    ORDER BY Ausleihe.AusleihID`).all();
  const naechstesToken = tokenQuelle(z, 'R', [...PFLICHT_KUNDEN.values()]);
  const tokenJeKunde = new Map(PFLICHT_KUNDEN);
  for (const k of rad.prepare('SELECT KundenID FROM Kunde ORDER BY KundenID').pluck().all()) {
    if (!tokenJeKunde.has(k)) tokenJeKunde.set(k, naechstesToken());
  }
  const zeilenListe = ausleihen.map((a) => ({ ...a, KundenToken: tokenJeKunde.get(a.KundenID) }));
  return { zeilen: zeilenListe, tokenJeKunde };
}

// ---------------------------------------------------------------- FestZahlung

function erzeugeFestZahlung(z, kontext) {
  const fest = kontext.datenbank('stadtfest');
  const bons = fest.prepare(`SELECT Bon.BonNr, Bon.StandNr, Bon.Zeitpunkt, ROUND(SUM(Position.Menge * Produkt.Preis), 2) AS Betrag
    FROM Bon, Position, Produkt
    WHERE Bon.BonNr = Position.BonNr AND Position.ProduktNr = Produkt.ProduktNr AND Bon.Zahlart = 'Karte'
    GROUP BY Bon.BonNr ORDER BY Bon.BonNr`).all();
  const ohneSumme = bons.filter((b) => !(b.Betrag > 0));
  if (ohneSumme.length) throw new Error(`FestZahlung: Kartenbons ohne Betrag: ${ohneSumme.map((b) => b.BonNr).join(', ')}`);
  const naechstesToken = tokenQuelle(z, 'K', [...PFLICHT_KARTEN.values()]);
  const pool = z.mischen(bons.filter((b) => !PFLICHT_KARTEN.has(b.BonNr)));
  const liste = [];
  const abstandOk = (gruppe, b) => gruppe.every((g) => Math.abs(zuMinuten(g.Zeitpunkt) - zuMinuten(b.Zeitpunkt)) >= 20);
  while (pool.length) {
    const erster = pool.shift();
    const gruppe = [erster];
    if (z.ja(0.2)) {
      const ziel = z.ganz(2, 3);
      for (let i = 0; i < pool.length && gruppe.length < ziel; i++) {
        if (abstandOk(gruppe, pool[i])) gruppe.push(...pool.splice(i--, 1));
      }
    }
    const token = naechstesToken();
    for (const b of gruppe) liste.push({ KartenToken: token, StandNr: b.StandNr, Zeitpunkt: b.Zeitpunkt, Betrag: b.Betrag });
  }
  return liste;
}

// ---------------------------------------------------------------- AppCheckin

function erzeugeAppCheckins(z, radExport, einwohner, db) {
  const naechstesGeraet = geraeteQuelle(z, PFLICHT_GERAETE);
  const liste = [];
  const zeitenJeGeraet = new Map();
  const orteJeGeraet = new Map();
  const fuege = (geraet, ort, zeitpunkt) => {
    if (!zeitenJeGeraet.has(geraet)) {
      zeitenJeGeraet.set(geraet, new Set());
      orteJeGeraet.set(geraet, new Set());
    }
    if (zeitenJeGeraet.get(geraet).has(zeitpunkt)) return false;
    zeitenJeGeraet.get(geraet).add(zeitpunkt);
    orteJeGeraet.get(geraet).add(ort);
    liste.push({ Geraet: geraet, Ort: ort, Zeitpunkt: zeitpunkt });
    return true;
  };

  // 1. ≈ 30 % der Kundschaft (ohne 77; 64 = Pflichtgerät WA-1288): 23 weitere Geräte, Check-in bei jeder Ausleihe.
  //    Vielfahrende (Kunden der SQL-Werkstatt, KundenID 1–25) machen je ≈ 13 Fahrten – damit AppCheckin im Rahmen
  //    bleibt, stammen 3–4 der Geräte aus dieser Gruppe, die übrigen aus den Kunden 26–80.
  const fahrtenJeKunde = new Map();
  for (const a of radExport.zeilen) {
    if (!fahrtenJeKunde.has(a.KundenID)) fahrtenJeKunde.set(a.KundenID, []);
    fahrtenJeKunde.get(a.KundenID).push(a);
  }
  const kunden = [...radExport.tokenJeKunde.keys()].filter((k) => !PFLICHT_KUNDEN.has(k) && fahrtenJeKunde.has(k));
  const vielfahrer = kunden.filter((k) => k <= 25);
  const uebrige = kunden.filter((k) => k > 25);
  const anzahlViel = z.ganz(3, 4);
  const radKunden = [...z.stichprobe(vielfahrer, anzahlViel), ...z.stichprobe(uebrige, 23 - anzahlViel)];
  const geraetJeKunde = new Map();
  for (const k of radKunden) {
    const g = naechstesGeraet();
    geraetJeKunde.set(k, g);
    for (const a of fahrtenJeKunde.get(k)) fuege(g, a.StartStation, a.Start);
  }

  // 2. ≈ 15 Geräte mit nächtlichen Adress-Check-ins (00:00–05:59) an der Strasse „ihres“ Einwohners
  //    (Zuordnung nicht gespeichert); 5–7 davon sind Rad-Geräte (Kundin/Kunde = Einwohner), die übrigen neu.
  const einwohnerJeKunde = new Map(einwohner.neu.filter((e) => e.kundenId !== undefined).map((e) => [e.kundenId, e]));
  const nachtGeraete = [];
  const radMitEinwohner = radKunden.filter((k) => einwohnerJeKunde.has(k));
  for (const k of z.stichprobe(radMitEinwohner, z.ganz(5, 7))) nachtGeraete.push([geraetJeKunde.get(k), einwohnerJeKunde.get(k)]);
  const vergeben = new Set(nachtGeraete.map(([, e]) => e.nr));
  const kandidaten = einwohner.neu.filter((e) => !vergeben.has(e.nr) && !STORY_EINWOHNER.includes(e.nr) &&
    e.strasse !== 'Kranstraße 7');
  const anzahlNacht = z.ganz(14, 16);
  for (const e of z.stichprobe(kandidaten, anzahlNacht - nachtGeraete.length)) nachtGeraete.push([naechstesGeraet(), e]);
  for (const [g, e] of nachtGeraete) {
    const n = z.ganz(1, 3);
    for (const tag of z.stichprobe(TAGE, n)) fuege(g, e.strasse, zeitAm(z, tag, 0, 6));
  }

  // 3. ≈ 60 Check-ins an markierten Orten, verteilt auf Rad-, Nacht- und weitere Geräte
  const weitere = Array.from({ length: z.ganz(14, 18) }, () => naechstesGeraet());
  const pool = [...radKunden.map((k) => geraetJeKunde.get(k)), ...nachtGeraete.map(([g]) => g), ...weitere];
  const markiert = [
    ['Festplatz', 30, () => (z.ja(0.4) ? zeitAm(z, '2026-08-28', 16, 24) : zeitAm(z, '2026-08-29', 14, 24))],
    ['Vereinsheim TuS', 20, () => zeitAm(z, z.waehle(TAGE), 17, 22)],
    ['Fundbüro', 20, () => zeitAm(z, z.waehle(WERKTAGE), 9, 16)],
    ['Rathaus', 15, () => zeitAm(z, z.waehle(WERKTAGE), 8, 17)],
    ['Bahnhofshalle', 15, () => zeitAm(z, z.waehle(TAGE), 6, 22)]
  ];
  const anzahlMarkiert = z.ganz(55, 62);
  // jedes weitere Gerät mindestens einmal
  const geraeteFolge = [...weitere, ...Array.from({ length: anzahlMarkiert - weitere.length }, () => z.waehle(pool))];
  for (const g of geraeteFolge) {
    for (let versuch = 0; versuch < 50; versuch++) {
      const [ort, , zeit] = z.gewichtet(markiert.map((m) => [m, m[1]]));
      const zeitpunkt = zeit();
      if (zeitpunkt > DATENSTAND) continue;
      if (ort === 'Fundbüro' && zeitpunkt >= '2026-09-14 10:00' && zeitpunkt <= '2026-09-14 10:59') continue;
      const orte = new Set(orteJeGeraet.get(g) || []);
      orte.add(ort);
      if (TATORTE.every((t) => orte.has(t))) continue;
      if (fuege(g, ort, zeitpunkt)) break;
    }
  }
  const gesamt = liste.length + db.prepare('SELECT COUNT(*) FROM AppCheckin').pluck().get();
  if (gesamt < APP_ZEILEN[0] + 5 || gesamt > APP_ZEILEN[1] - 5) return false;
  return liste;
}

// ---------------------------------------------------------------- generiere

const kontexte = new WeakMap();

function generiere(db, zufall, namen, kontext) {
  if (!kontext || typeof kontext.datenbank !== 'function') throw new Error('Datenspuren braucht kontext.datenbank()');
  kontexte.set(db, kontext);

  const einwohner = erzeugeEinwohner(zufall.teil('einwohner'), db, namen, kontext);
  const radExport = erzeugeRadExport(zufall.teil('radexport'), db, kontext);
  const festZahlung = erzeugeFestZahlung(zufall.teil('festzahlung'), kontext);
  const app = versuche(zufall, 'appcheckin', (z) => erzeugeAppCheckins(z, radExport, einwohner, db));

  const insEinwohner = db.prepare('INSERT INTO Einwohner VALUES (?, ?, ?, ?, ?, ?)');
  const insRad = db.prepare('INSERT INTO RadExport VALUES (?, ?, ?, ?, ?, ?)');
  const insFest = db.prepare('INSERT INTO FestZahlung VALUES (?, ?, ?, ?)');
  const insApp = db.prepare('INSERT INTO AppCheckin VALUES (?, ?, ?)');
  const vorhandenRad = new Set(db.prepare('SELECT KundenToken || \'|\' || Start FROM RadExport').pluck().all());
  const vorhandenFest = new Set(db.prepare('SELECT KartenToken || \'|\' || Zeitpunkt FROM FestZahlung').pluck().all());
  db.transaction(() => {
    for (const e of einwohner.neu) insEinwohner.run(e.nr, e.vorname, e.nachname, e.jahrgang, e.stadtteil, e.strasse);
    for (const a of radExport.zeilen) {
      if (vorhandenRad.has(`${a.KundenToken}|${a.Start}`)) continue; // Pflicht (R-7F3A, R-21C4)
      insRad.run(a.KundenToken, a.Jahrgang, a.Stadtteil, a.Tarif, a.StartStation, a.Start);
    }
    for (const f of festZahlung) {
      if (vorhandenFest.has(`${f.KartenToken}|${f.Zeitpunkt}`)) continue;
      insFest.run(f.KartenToken, f.StandNr, f.Zeitpunkt, f.Betrag);
    }
    for (const c of app) insApp.run(c.Geraet, c.Ort, c.Zeitpunkt);
  })();
}

// ---------------------------------------------------------------- Abnahme

// Musterabfragen des Schlussplädoyers (datenspuren/LIESMICH.md; EH-§8-Stil)
const STUFE1 = `
SELECT KundenToken, Jahrgang, Stadtteil, Tarif, COUNT(*) AS Fahrten
FROM RadExport
WHERE StartStation = 'Hafenkante'
  AND (Start BETWEEN '2026-09-08 00:00' AND '2026-09-08 04:00'
    OR Start BETWEEN '2026-09-09 00:00' AND '2026-09-09 04:00'
    OR Start BETWEEN '2026-09-10 00:00' AND '2026-09-10 04:00'
    OR Start BETWEEN '2026-09-11 00:00' AND '2026-09-11 04:00'
    OR Start BETWEEN '2026-09-12 00:00' AND '2026-09-12 04:00')
GROUP BY KundenToken, Jahrgang, Stadtteil, Tarif`;
const STUFE2 = `
SELECT DISTINCT KundenToken
FROM RadExport
WHERE Jahrgang = 1988
  AND Stadtteil = 'Hafenviertel'
  AND Tarif = 'Plus'`;
const STUFE2_OHNE_TARIF = `
SELECT DISTINCT KundenToken
FROM RadExport
WHERE Jahrgang = 1988
  AND Stadtteil = 'Hafenviertel'
ORDER BY KundenToken`;
const STUFE3 = `
SELECT AppCheckin.Geraet, COUNT(*) AS Treffer
FROM RadExport, AppCheckin
WHERE RadExport.StartStation = AppCheckin.Ort
  AND RadExport.Start = AppCheckin.Zeitpunkt
  AND RadExport.KundenToken = 'R-7F3A'
GROUP BY AppCheckin.Geraet
ORDER BY Treffer DESC`;
const STUFE4A = `
SELECT Ort, Zeitpunkt
FROM AppCheckin
WHERE Geraet = 'WA-3917'
ORDER BY Zeitpunkt`;
const stufe4b = (von, bis) => `
SELECT COUNT(*) AS Kartenzahlungen
FROM FestZahlung
WHERE StandNr = 4
  AND Zeitpunkt BETWEEN '2026-08-29 ${von}' AND '2026-08-29 ${bis}'`;
const STUFE5 = `
SELECT MitgliedToken, Geburtsjahr, Abteilung, Stadtteil
FROM VereinExport
WHERE Geburtsjahr = 1988
  AND Stadtteil = 'Hafenviertel'
  AND Abteilung = 'Tischtennis'`;
const STUFE6A = `
SELECT EinwohnerNr, Vorname, Nachname, Strasse
FROM Einwohner
WHERE Jahrgang = 1988
  AND Stadtteil = 'Hafenviertel'
ORDER BY Nachname`;
const STUFE6B = `
SELECT DISTINCT Einwohner.EinwohnerNr, Einwohner.Vorname, Einwohner.Nachname, Einwohner.Strasse
FROM AppCheckin, Einwohner
WHERE AppCheckin.Ort = Einwohner.Strasse
  AND AppCheckin.Geraet = 'WA-3917'
  AND Einwohner.Jahrgang = 1988
  AND Einwohner.Stadtteil = 'Hafenviertel'`;
const MEISTERSTUECK = `
SELECT DISTINCT e.Vorname, e.Nachname, e.Strasse
FROM RadExport r, AppCheckin a1, AppCheckin a2, Einwohner e
WHERE r.StartStation = a1.Ort
  AND r.Start = a1.Zeitpunkt
  AND a1.Geraet = a2.Geraet
  AND a2.Ort = e.Strasse
  AND r.KundenToken = 'R-7F3A'
  AND e.Jahrgang = r.Jahrgang
  AND e.Stadtteil = r.Stadtteil`;

/** Konsistenz RadExport ↔ StadtRad: Abweichungen (leer = in Ordnung). */
function abweichungenRadExport(db, rad) {
  const ausleihen = rad.prepare(`SELECT Ausleihe.KundenID, Kunde.Jahrgang, Kunde.Stadtteil, Kunde.Tarif,
      Station.Name AS StartStation, Ausleihe.Start
    FROM Ausleihe, Kunde, Station
    WHERE Ausleihe.KundenID = Kunde.KundenID AND Ausleihe.StartStation = Station.StationID`).all();
  const exp = db.prepare('SELECT * FROM RadExport').all();
  const fehler = [];
  if (exp.length !== ausleihen.length) fehler.push(`Zeilen ${exp.length} ≠ ${ausleihen.length}`);
  // Token je Kunde über die eindeutigen Startzeitpunkte (Kunde, Start) bestimmen
  const nachStart = new Map();
  for (const e of exp) {
    const k = `${e.Start}|${e.StartStation}|${e.Jahrgang}|${e.Stadtteil}|${e.Tarif}`;
    if (!nachStart.has(k)) nachStart.set(k, []);
    nachStart.get(k).push(e.KundenToken);
  }
  const tokenJeKunde = new Map();
  const kundeJeToken = new Map();
  for (const a of ausleihen) {
    const tokens = nachStart.get(`${a.Start}|${a.StartStation}|${a.Jahrgang}|${a.Stadtteil}|${a.Tarif}`) || [];
    const bekannt = tokenJeKunde.get(a.KundenID);
    const token = bekannt && tokens.includes(bekannt) ? bekannt : tokens.find((t) => !kundeJeToken.has(t) || kundeJeToken.get(t) === a.KundenID);
    if (!token) {
      fehler.push(`Ausleihe Kunde ${a.KundenID} ${a.Start} fehlt`);
      continue;
    }
    if (bekannt && bekannt !== token) fehler.push(`Kunde ${a.KundenID}: zwei Tokens`);
    tokenJeKunde.set(a.KundenID, token);
    if (kundeJeToken.has(token) && kundeJeToken.get(token) !== a.KundenID) fehler.push(`Token ${token}: zwei Kunden`);
    kundeJeToken.set(token, a.KundenID);
    tokens.splice(tokens.indexOf(token), 1);
  }
  for (const [k, t] of PFLICHT_KUNDEN) if (tokenJeKunde.get(k) !== t) fehler.push(`Kunde ${k} hat nicht ${t}`);
  return fehler;
}

function abweichungenFestZahlung(db, fest) {
  const bons = fest.prepare(`SELECT Bon.StandNr || '|' || Bon.Zeitpunkt || '|' || printf('%.2f', SUM(Position.Menge * Produkt.Preis))
    FROM Bon, Position, Produkt
    WHERE Bon.BonNr = Position.BonNr AND Position.ProduktNr = Produkt.ProduktNr AND Bon.Zahlart = 'Karte'
    GROUP BY Bon.BonNr`).pluck().all().sort();
  const zahl = db.prepare("SELECT StandNr || '|' || Zeitpunkt || '|' || printf('%.2f', Betrag) FROM FestZahlung").pluck().all().sort();
  const fehler = [];
  if (bons.length !== zahl.length) fehler.push(`Zeilen ${zahl.length} ≠ Kartenbons ${bons.length}`);
  const rest = [...zahl];
  for (const b of bons) {
    const i = rest.indexOf(b);
    if (i < 0) fehler.push(`Kartenbon ${b} fehlt`);
    else rest.splice(i, 1);
  }
  for (const r of rest) fehler.push(`Zahlung ${r} ohne Kartenbon`);
  return fehler;
}

/** Personen der Quellen ohne passenden Einwohner (gleicher Name, Jahrgang/Stadtteil sofern bekannt). */
function fehlendeEinwohner(db, personen) {
  const stmt = db.prepare(`SELECT COUNT(*) FROM Einwohner WHERE Vorname = ? AND Nachname = ?
    AND (? IS NULL OR Jahrgang = ?) AND (? IS NULL OR Stadtteil = ?)`).pluck();
  return personen.filter((p) => stmt.get(p.vorname, p.nachname, p.jahrgang, p.jahrgang, p.stadtteil, p.stadtteil) !== 1)
    .map((p) => p.quelle);
}

/** VereinExport ↔ TuS (Mitglied + Mitgliedschaft ohne passive Mitglieder): Abweichungen. */
function abweichungenVereinExport(db, tus) {
  const { ms, ve } = tusZuordnung(tus, db);
  const fehler = [];
  if (ms.length !== ve.length) fehler.push(`Zeilen ${ve.length} ≠ Mitgliedschaften ${ms.length}`);
  const tokenJeMitglied = new Map();
  const mitgliedJeToken = new Map();
  ms.forEach((m, i) => {
    const v = ve[i];
    if (!v) return;
    if (v.Geburtsjahr !== m.Geburtsjahr || v.Abteilung !== m.Abteilung) fehler.push(`${v.MitgliedToken}: passt nicht zu Mitglied ${m.MitgliedNr}`);
    if (tokenJeMitglied.has(m.MitgliedNr) && tokenJeMitglied.get(m.MitgliedNr) !== v.MitgliedToken) fehler.push(`Mitglied ${m.MitgliedNr}: zwei Tokens`);
    if (mitgliedJeToken.has(v.MitgliedToken) && mitgliedJeToken.get(v.MitgliedToken) !== m.MitgliedNr) fehler.push(`${v.MitgliedToken}: zwei Mitglieder`);
    tokenJeMitglied.set(m.MitgliedNr, v.MitgliedToken);
    mitgliedJeToken.set(v.MitgliedToken, m.MitgliedNr);
  });
  const passiv = tus.prepare("SELECT MitgliedNr FROM Mitglied WHERE Beitragsgruppe = 'Passiv'").pluck().all();
  if (passiv.some((nr) => tokenJeMitglied.has(nr))) fehler.push('passives Mitglied im Export');
  if (tokenJeMitglied.size + passiv.length !== tus.prepare('SELECT COUNT(*) FROM Mitglied').pluck().get()) fehler.push('Mitglied fehlt im Export');
  const fest = [['V-2571', 'Merle Falkenrath'], ['V-4417', 'Ole Brakhage'], ['V-9952', 'Nora Falter']];
  for (const [token, name] of fest) {
    const nr = mitgliedJeToken.get(token);
    const n = tus.prepare("SELECT Vorname || ' ' || Nachname FROM Mitglied WHERE MitgliedNr = ?").pluck().get(nr);
    if (n !== name) fehler.push(`${token} ≠ ${name}`);
  }
  return fehler;
}

function abnahme(db, kontext = kontexte.get(db)) {
  const ohneQuellen = (name) => ({ name, ok: false, ist: 'Quell-DBs fehlen (kontext.datenbank)', soll: 'Abgleich mit den Quell-DBs' });
  const quelle = (n) => (kontext && typeof kontext.datenbank === 'function' ? kontext.datenbank(n) : null);
  const rad = quelle('stadtrad');
  const fest = quelle('stadtfest');
  const tus = quelle('tus');
  const detektei = quelle('detektei');
  const personen = rad && fest && tus && detektei ? quellPersonen(kontext, db) : null;

  const stufe3 = zeilen(db, STUFE3);
  const pruefungen = [
    // Zeilen
    gleich('Zeilen Einwohner (EinwohnerNr 1001–1250)', zeilen(db, 'SELECT COUNT(*), MIN(EinwohnerNr), MAX(EinwohnerNr) FROM Einwohner'),
      [[250, 1001, 1250]]),
    rad ? gleich('Zeilen RadExport = StadtRad-Ausleihen (469)', wert(db, 'SELECT COUNT(*) FROM RadExport'),
      wert(rad, 'SELECT COUNT(*) FROM Ausleihe')) : ohneQuellen('Zeilen RadExport = StadtRad-Ausleihen (469)'),
    gleich('Zeilen RadExport 469', wert(db, 'SELECT COUNT(*) FROM RadExport'), 469),
    gleich('Zeilen VereinExport', wert(db, 'SELECT COUNT(*) FROM VereinExport'), 63),
    fest ? gleich('Zeilen FestZahlung = Kartenbons Stadtfest', wert(db, 'SELECT COUNT(*) FROM FestZahlung'),
      wert(fest, "SELECT COUNT(*) FROM Bon WHERE Zahlart = 'Karte'")) : ohneQuellen('Zeilen FestZahlung = Kartenbons Stadtfest'),
    bereich('Zeilen AppCheckin', wert(db, 'SELECT COUNT(*) FROM AppCheckin'), APP_ZEILEN[0], APP_ZEILEN[1]),
    // Schlussplädoyer
    gleich('Stufe 1: genau eine Zeile R-7F3A, 5 Fahrten', zeilen(db, STUFE1), [['R-7F3A', 1988, 'Hafenviertel', 'Plus', 5]]),
    gleich('Stufe 2: genau R-7F3A', spalte(db, STUFE2), ['R-7F3A']),
    gleich('Stufe 2 ohne Tarif: genau R-21C4, R-7F3A', spalte(db, STUFE2_OHNE_TARIF), ['R-21C4', 'R-7F3A']),
    gleich('Stufe 3: erste Zeile WA-3917 mit 5', stufe3[0], ['WA-3917', 5]),
    gleich('Stufe 3: alle übrigen Geräte ≤ 2', stufe3.slice(1).filter(([, n]) => n > 2), []),
    gleich('Stufe 4a: 19 Check-ins von WA-3917', zeilen(db, STUFE4A).length, 19),
    gleich('Stufe 4b: 0 Kartenzahlungen am Kaffeemobil 22:00–22:59', wert(db, stufe4b('22:00', '22:59')), 0),
    bereich('Stufe 4b: Kartenzahlungen 21:00–21:59', wert(db, stufe4b('21:00', '21:59')), 3),
    bereich('Stufe 4b: Kartenzahlungen 23:00–23:59', wert(db, stufe4b('23:00', '23:59')), 3),
    gleich('Stufe 5: genau V-2571', spalte(db, STUFE5), ['V-2571']),
    gleich('Stufe 6a: genau 1163, 1042, 1107 (nach Nachname)', spalte(db, STUFE6A), [1163, 1042, 1107]),
    gleich('Stufe 6b: genau Merle Falkenrath', zeilen(db, STUFE6B), [[1042, 'Merle', 'Falkenrath', 'Kranstraße 7']]),
    gleich('Meisterstück: genau Merle Falkenrath', zeilen(db, MEISTERSTUECK), [['Merle', 'Falkenrath', 'Kranstraße 7']]),
    gleich('Stufe 6b ohne Jahrgang: 1042 und Nachbar 1218',
      spalte(db, `${STUFE6B.replace(/\n\s*AND Einwohner\.Jahrgang = 1988/, '')} ORDER BY 1`), [1042, 1218]),
    gleich('Stufe 6b ohne Gerät: 1042 und Tamara Leversen 1107',
      spalte(db, `${STUFE6B.replace(/\n\s*AND AppCheckin\.Geraet = 'WA-3917'/, '')} ORDER BY 1`), [1042, 1107]),
    // Einzelabfragen
    gleich("Kein Einwohner mit Nachname 'Falter'", wert(db, "SELECT COUNT(*) FROM Einwohner WHERE Nachname = 'Falter'"), 0),
    gleich('Kranstraße 7: Einwohner genau 1042, 1218',
      spalte(db, "SELECT EinwohnerNr FROM Einwohner WHERE Strasse = 'Kranstraße 7' ORDER BY EinwohnerNr"), [1042, 1218]),
    gleich('Kranstraße 7: Geräte genau WA-3917, WA-6120',
      spalte(db, "SELECT DISTINCT Geraet FROM AppCheckin WHERE Ort = 'Kranstraße 7' ORDER BY Geraet"), ['WA-3917', 'WA-6120']),
    // Konsistenz mit den Quellen
    rad ? gleich('Konsistenz RadExport ↔ StadtRad-Ausleihen (Token ↔ KundenID, Start, Stationsname)', abweichungenRadExport(db, rad), [])
      : ohneQuellen('Konsistenz RadExport ↔ StadtRad-Ausleihen'),
    fest ? gleich('Konsistenz FestZahlung ↔ Kartenbons Stadtfest (Stand, Zeitpunkt, Bonsumme)', abweichungenFestZahlung(db, fest), [])
      : ohneQuellen('Konsistenz FestZahlung ↔ Kartenbons Stadtfest'),
    personen ? gleich('Konsistenz Einwohner: Personen aus StadtRad, Stadtfest, TuS, Detektei mit gleichem Jahrgang/Stadtteil',
      fehlendeEinwohner(db, personen.filter((p) => !p.quelle.startsWith('Person'))), [])
      : ohneQuellen('Konsistenz Einwohner'),
    tus ? gleich('TuS-Abnahme „VereinExport“: 1:1 aus Mitglied + Mitgliedschaft ohne passive Mitglieder, Tokens fest',
      abweichungenVereinExport(db, tus), []) : ohneQuellen('TuS-Abnahme „VereinExport“'),
    detektei ? gleich('Detektei-Abnahme „Datenspuren.Einwohner“: alle Personen außer Nora Falter, gleicher Jahrgang/Stadtteil (sofern nicht NULL)',
      fehlendeEinwohner(db, personen.filter((p) => p.quelle.startsWith('Person'))), [])
      : ohneQuellen('Detektei-Abnahme „Datenspuren.Einwohner“'),
    // Generator-Vorgaben
    gleich('Einwohner: Jahrgang 1988 + Hafenviertel genau 1042, 1107, 1163', spalte(db,
      "SELECT EinwohnerNr FROM Einwohner WHERE Jahrgang = 1988 AND Stadtteil = 'Hafenviertel' ORDER BY EinwohnerNr"), [1042, 1107, 1163]),
    gleich('Einwohner: Nachname Falkenrath nur 1042', spalte(db, "SELECT EinwohnerNr FROM Einwohner WHERE Nachname = 'Falkenrath'"), [1042]),
    ...['Hafenviertel', 'Altstadt', 'Lindenhof', 'Mühlenfeld', 'Nordheide', 'Bahnhofsviertel'].map((s) =>
      bereich(`Einwohner: Stadtteil ${s} 14–18 %`, wert(db, 'SELECT COUNT(*) FROM Einwohner WHERE Stadtteil = ?', s), 35, 45)),
    gleich('Einwohner: höchstens 3 je Adresse', wert(db,
      'SELECT COUNT(*) FROM (SELECT Strasse FROM Einwohner GROUP BY Strasse HAVING COUNT(*) > 3)'), 0),
    gleich('Einwohner: reservierte Adressen nur Pflicht', zeilen(db, `SELECT Strasse, EinwohnerNr FROM Einwohner
      WHERE Strasse IN ('Kranstraße 7', 'Speicherstraße 14', 'Lotsengang 2') ORDER BY EinwohnerNr`),
    [['Kranstraße 7', 1042], ['Speicherstraße 14', 1107], ['Lotsengang 2', 1163], ['Kranstraße 7', 1218]]),
    gleich('AppCheckin: Hafenkante 00:00–05:59 nur WA-3917, WA-5530', spalte(db, `SELECT DISTINCT Geraet FROM AppCheckin
      WHERE Ort = 'Hafenkante' AND substr(Zeitpunkt, 12, 2) BETWEEN '00' AND '05' ORDER BY Geraet`), ['WA-3917', 'WA-5530']),
    gleich('AppCheckin: Fundbüro 2026-09-14 10:00–10:59 nur WA-3917', spalte(db, `SELECT DISTINCT Geraet FROM AppCheckin
      WHERE Ort = 'Fundbüro' AND Zeitpunkt BETWEEN '2026-09-14 10:00' AND '2026-09-14 10:59'`), ['WA-3917']),
    gleich('AppCheckin: nur WA-3917 an allen vier Tatorten', spalte(db, `SELECT Geraet FROM AppCheckin
      WHERE Ort IN ('Hafenkante', 'Festplatz', 'Fundbüro', 'Vereinsheim TuS') GROUP BY Geraet HAVING COUNT(DISTINCT Ort) = 4`), ['WA-3917']),
    gleich('Exportzeitraum 2026-08-21 … 2026-09-20 20:00 (RadExport, FestZahlung, AppCheckin)', wert(db, `SELECT
      (SELECT COUNT(*) FROM RadExport WHERE Start < '2026-08-21 00:00' OR Start > '${DATENSTAND}')
      + (SELECT COUNT(*) FROM FestZahlung WHERE Zeitpunkt < '2026-08-21 00:00' OR Zeitpunkt > '${DATENSTAND}')
      + (SELECT COUNT(*) FROM AppCheckin WHERE Zeitpunkt < '2026-08-21 00:00' OR Zeitpunkt > '${DATENSTAND}')`), 0),
    gleich('Token-Formate (R-/K-/V-XXXX hexadezimal, WA-0000)', wert(db, `SELECT
      (SELECT COUNT(*) FROM RadExport WHERE KundenToken NOT GLOB 'R-[0-9A-F][0-9A-F][0-9A-F][0-9A-F]')
      + (SELECT COUNT(*) FROM FestZahlung WHERE KartenToken NOT GLOB 'K-[0-9A-F][0-9A-F][0-9A-F][0-9A-F]')
      + (SELECT COUNT(*) FROM VereinExport WHERE MitgliedToken NOT GLOB 'V-[0-9A-F][0-9A-F][0-9A-F][0-9A-F]')
      + (SELECT COUNT(*) FROM AppCheckin WHERE Geraet NOT GLOB 'WA-[0-9][0-9][0-9][0-9]')`), 0)
  ];
  return pruefungen;
}

module.exports = { generiere, abnahme };
