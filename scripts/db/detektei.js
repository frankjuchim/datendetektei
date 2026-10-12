'use strict';
// Detektei (Akten 5 und 6): Generator und Abnahme nach seed/datenbanken/detektei/LIESMICH.md
// („Datenumfang und Verteilung“, „Abnahme-Prüfungen“). Pflicht: Ermittler 1–12 (vollständig), Fälle 1–4, Orte 1–7,
// zwölf Personen, Noras Netz in `kennt`, Verdachtsfälle, Aussagen und Beweisstücke der Phantom-Fälle.
// Der Generator ergänzt die älteren Fälle 5–12 (ohne Bezug zum Phantom), Orte 8–15, Personen bis PersonNr 60 und
// deren Bekanntschaften, Verdachtsfälle, Aussagen und Beweisstücke. Keine DB-übergreifende Ableitung nötig.

const { versuche, plusTage, plusMinuten, zuMinuten } = require('./zufall');
const { gleich, bereich, wert, spalte, zeilen } = require('./abnahme_hilfen');

const PFLICHT_PERSONEN = [5, 8, 13, 17, 21, 22, 27, 30, 34, 41, 42, 43];
/** Menschen an den vier Phantom-Tatorten (Fundbüro, StadtRad, Kaffeemobil, TuS-Kasse). */
const TATORT_PERSONEN = [5, 8, 22, 27];
const STADTTEILE = ['Altstadt', 'Hafenviertel', 'Weserufer', 'Mühlenfeld', 'Nordheide', 'Lindenhof', 'Deichkamp', 'Bahnhofsviertel'];
const FALLTITEL = ['Die vertauschten Koffer', 'Das Rätsel im Stadtarchiv', 'Falsche Rechnungen im Hafenamt',
  'Der doppelte Bauantrag', 'Die verschwundene Gästeliste', 'Ein Konto zu viel', 'Die Wasseruhr der Mühle',
  'Der stille Teilhaber'];
const ORTE = [
  [8, 'Bahnhofshalle', 'Bahnhofsviertel'], [9, 'Stadtarchiv', 'Altstadt'], [10, 'Hafenamt', 'Hafenviertel'],
  [11, 'Schulzentrum', 'Nordheide'], [12, 'Café am Lindenplatz', 'Lindenhof'], [13, 'Lagerhalle 3', 'Deichkamp'],
  [14, 'Weserpromenade', 'Weserufer'], [15, 'Alte Mühle', 'Mühlenfeld']
];
/** Orte der älteren Fälle: nicht die vier Phantom-Tatorte 1–4. */
const ORTE_ALTFAELLE = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
/** Ermittler, die einen Fall leiten dürfen (Leitung, Senior, Junior); 2, 9, 10, 11 leiten keinen. */
const LEITUNG_MOEGLICH = [1, 3, 4, 5, 6, 7, 8, 12];
const BEWEISSTUECKE = ['Quittung', 'Schlüsselkopie', 'Fotokopie', 'USB-Stick', 'Notizzettel', 'Gästebuch', 'Lieferschein', 'Briefumschlag'];
const AUSSAGE_ANFANG = ['Ich war an dem Tag bis zum Nachmittag im Büro.', 'Mir ist nichts Ungewöhnliches aufgefallen.',
  'Ich habe die Unterlagen nur kurz gesehen.', 'An dem Abend war ich nicht in der Stadt.',
  'Ich kenne die Abläufe dort seit Jahren.', 'Ich habe nur meine übliche Runde gemacht.',
  'Die Tür war wie immer abgeschlossen.', 'Ich bin erst später dazugekommen.'];
const AUSSAGE_ENDE = ['Mehr kann ich dazu nicht sagen.', 'Fragen Sie am besten die Kollegin.',
  'Das steht auch im Protokoll.', 'Ich habe es sofort gemeldet.', 'Es war viel Betrieb.',
  'Ich erinnere mich nicht an die Uhrzeit.', 'Das Licht war schon aus.', 'Ich habe niemanden gesehen.'];
const LETZTER_AUSSAGETAG = '2026-09-20';
const ZEILEN = { kennt: [70, 90], verdaechtig: [25, 35], Aussage: [50, 70], Beweisstueck: [20, 30] };

function erzeugePersonen(z, namen, db) {
  const belegt = [
    ...db.prepare('SELECT Vorname, Nachname FROM Person').raw().all().map(([v, n]) => `${v} ${n}`),
    ...db.prepare('SELECT Name FROM Ermittler').pluck().all()
  ];
  const ziehung = namen.erzeugePersonen(z, { belegt, ohneVornamen: ['Merle'] });
  // Nachnamen der Pflicht-Personen und des Ermittlerteams nicht wiederverwenden (keine scheinbaren Verwandten,
  // eindeutige Suche nach Nachnamen in den Aufgaben)
  const vergebeneNachnamen = new Set(belegt.map((n) => n.split(' ').slice(1).join(' ')));
  const naechster = () => {
    for (;;) {
      const p = ziehung.naechste();
      if (!vergebeneNachnamen.has(p.nachname)) return p;
    }
  };
  const nummern = [];
  for (let nr = 1; nr <= 60; nr++) if (!PFLICHT_PERSONEN.includes(nr)) nummern.push(nr);
  const ohneJahrgang = new Set(z.stichprobe(nummern, 3));
  const ohneStadtteil = new Set(z.stichprobe(nummern, 2));
  return nummern.map((nr) => {
    const { vorname, nachname } = naechster();
    let jahrgang = ohneJahrgang.has(nr) ? null : z.ganz(1940, 2008);
    const stadtteil = ohneStadtteil.has(nr) ? null : z.waehle(STADTTEILE);
    while (jahrgang !== null && !namen.kombinationErlaubt(jahrgang, stadtteil)) jahrgang = z.ganz(1940, 2008);
    return { nr, vorname, nachname, jahrgang, stadtteil };
  });
}

function erzeugeFaelle(z) {
  // Eroeffnet 2025-11-01 … 2026-08-31, streng aufsteigend mit der FallNr
  const tage = new Set();
  while (tage.size < 8) tage.add(z.ganz(0, 303));
  const daten = [...tage].sort((a, b) => a - b).map((t) => plusTage('2025-11-01', t));
  const titel = z.mischen(FALLTITEL);
  const ruht = new Set(z.stichprobe([5, 6, 7, 8, 9, 10, 11, 12], 2));
  return daten.map((eroeffnet, i) => ({
    nr: 5 + i, titel: titel[i], eroeffnet, status: ruht.has(5 + i) ? 'ruht' : 'abgeschlossen', leiter: z.waehle(LEITUNG_MOEGLICH)
  }));
}

/** Seit-Jahr einer Bekanntschaft: frühestens mit 6 Jahren beider Personen, 1990–2026, nie 2020 (Grenze). */
function seitJahr(z, a, b) {
  if (z.ja(0.1)) return null;
  const unten = Math.max(1990, (a.jahrgang ?? 1940) + 6, (b.jahrgang ?? 1940) + 6);
  let seit;
  do seit = z.ganz(unten, 2026); while (seit === 2020 && unten < 2026);
  return seit;
}

/**
 * kennt: jede erzeugte Person kennt 0–3 andere (nie sich selbst, nie Nora), ≈ 30 % der Paare auch umgekehrt
 * (nur zwischen erzeugten Personen, damit Pflicht-Personen keine zusätzlichen Bekanntschaften „angeben“);
 * genau 3 Paare mit Seit = 2020.
 */
function erzeugeKennt(z, personen, alle) {
  const nachNr = new Map(alle.map((p) => [p.nr, p]));
  const erzeugt = new Set(personen.map((p) => p.nr));
  const ziele = alle.map((p) => p.nr).filter((nr) => nr !== 13);
  const zeilenListe = [];
  const vorhanden = new Set();
  const ausgehend = new Map(personen.map((p) => [p.nr, 0]));
  const fuege = (von, an, seit) => {
    zeilenListe.push({ von, an, seit });
    vorhanden.add(`${von}|${an}`);
    ausgehend.set(von, ausgehend.get(von) + 1);
  };
  for (const p of personen) {
    const anzahl = z.gewichtet([[0, 30], [1, 40], [2, 20], [3, 10]]);
    const kandidaten = ziele.filter((nr) => nr !== p.nr && !vorhanden.has(`${p.nr}|${nr}`));
    const tatorte = kandidaten.filter((nr) => TATORT_PERSONEN.includes(nr));
    // höchstens ein Mensch von den Phantom-Tatorten je erzeugter Person
    const auswahl = [];
    for (const nr of z.mischen(kandidaten)) {
      if (auswahl.length >= anzahl - ausgehend.get(p.nr)) break;
      if (TATORT_PERSONEN.includes(nr) && auswahl.some((a) => tatorte.includes(a))) continue;
      auswahl.push(nr);
    }
    for (const nr of auswahl) fuege(p.nr, nr, seitJahr(z, p, nachNr.get(nr)));
  }
  for (const k of [...zeilenListe]) {
    if (!erzeugt.has(k.an) || vorhanden.has(`${k.an}|${k.von}`) || ausgehend.get(k.an) >= 3) continue;
    if (z.ja(0.3)) fuege(k.an, k.von, k.seit);
  }
  // genau 3 Zeilen mit Seit = 2020: einseitige Bekanntschaften, bei denen 2020 möglich ist
  const einseitig = zeilenListe.filter((k) => !vorhanden.has(`${k.an}|${k.von}`) && k.seit !== null &&
    Math.max(nachNr.get(k.von).jahrgang ?? 1940, nachNr.get(k.an).jahrgang ?? 1940) + 6 <= 2020);
  if (einseitig.length < 3) return null;
  for (const k of z.stichprobe(einseitig, 3)) k.seit = 2020;
  return zeilenListe;
}

function erzeugeVerdacht(z, faelle, personen) {
  const frei = z.mischen(personen.map((p) => p.nr));
  const liste = [];
  for (const f of faelle) {
    const anzahl = z.ganz(1, 4);
    for (let i = 0; i < anzahl; i++) {
      liste.push({ person: frei.pop(), fall: f.nr, grad: z.gewichtet([['gering', 50], ['mittel', 30], ['hoch', 20]]) });
    }
  }
  return liste;
}

function erzeugeAussagen(z, faelle, personen, verdacht) {
  const doppelt = new Set(z.stichprobe(faelle.map((f) => f.nr), 3));
  const liste = [];
  for (const f of faelle) {
    const anzahl = z.ganz(3, 8);
    const verdaechtige = verdacht.filter((v) => v.fall === f.nr).map((v) => v.person);
    const andere = z.stichprobe(personen.map((p) => p.nr).filter((nr) => !verdaechtige.includes(nr)), 8);
    const zeugen = [...verdaechtige, ...andere];
    const paare = new Set();
    const zeitpunkte = new Set();
    // Aussagen 1–40 Tage nach Eroeffnet, spätestens am 2026-09-20 (vor dem ersten Phantom-Fall)
    const maxTage = Math.min(40, Math.round((zuMinuten(LETZTER_AUSSAGETAG) - zuMinuten(f.eroeffnet)) / 1440));
    const zeitpunkt = () => {
      for (;;) {
        const t = plusMinuten(`${plusTage(f.eroeffnet, z.ganz(1, maxTage))} 09:00`, z.ganz(0, 10 * 60 - 1));
        if (!zeitpunkte.has(t)) {
          zeitpunkte.add(t);
          return t;
        }
      }
    };
    const inhalt = () => `${z.waehle(AUSSAGE_ANFANG)} ${z.waehle(AUSSAGE_ENDE)}`;
    const einzel = doppelt.has(f.nr) ? anzahl - 1 : anzahl;
    for (let i = 0; i < einzel; i++) {
      let person;
      let ort;
      do {
        person = z.waehle(zeugen);
        ort = z.waehle(ORTE_ALTFAELLE);
      } while (paare.has(`${person}|${ort}`));
      paare.add(`${person}|${ort}`);
      liste.push({ person, fall: f.nr, ort, zeitpunkt: zeitpunkt(), inhalt: inhalt() });
    }
    if (doppelt.has(f.nr)) {
      // dieselbe Person sagt im selben Fall am selben Ort ein zweites Mal aus
      const erste = z.waehle(liste.filter((a) => a.fall === f.nr));
      liste.push({ person: erste.person, fall: f.nr, ort: erste.ort, zeitpunkt: zeitpunkt(), inhalt: inhalt() });
    }
  }
  return liste;
}

function erzeugeBeweise(z, faelle) {
  const liste = [];
  let nr = 6;
  for (const f of faelle) {
    const anzahl = z.ganz(1, 4);
    for (const bezeichnung of z.stichprobe(BEWEISSTUECKE, anzahl)) {
      liste.push({ nr: nr++, bezeichnung, fall: f.nr, ort: z.ja(0.1) ? null : z.waehle(ORTE_ALTFAELLE) });
    }
  }
  return liste;
}

function generiere(db, zufall, namen) {
  const insOrt = db.prepare('INSERT INTO Ort VALUES (?, ?, ?)');
  for (const o of ORTE) insOrt.run(...o);
  const pflichtPersonen = db.prepare('SELECT PersonNr AS nr, Jahrgang AS jahrgang FROM Person').all();
  versuche(zufall, 'detektei', (z) => {
    const personen = erzeugePersonen(z.teil('personen'), namen, db);
    const alle = [...pflichtPersonen, ...personen].sort((a, b) => a.nr - b.nr);
    const faelle = erzeugeFaelle(z.teil('faelle'));
    const kennt = erzeugeKennt(z.teil('kennt'), personen, alle);
    if (!kennt) return false;
    const verdacht = erzeugeVerdacht(z.teil('verdacht'), faelle, personen);
    const aussagen = erzeugeAussagen(z.teil('aussagen'), faelle, personen, verdacht);
    const beweise = erzeugeBeweise(z.teil('beweise'), faelle);
    const gesamt = {
      kennt: 16 + kennt.length, verdaechtig: 8 + verdacht.length, Aussage: 9 + aussagen.length, Beweisstueck: 5 + beweise.length
    };
    if (Object.entries(ZEILEN).some(([t, [min, max]]) => gesamt[t] < min || gesamt[t] > max)) return false;
    if (!beweise.some((b) => b.ort === null)) return false;
    const ohneSeit = kennt.filter((k) => k.seit === null).length;
    if (ohneSeit < 3 || ohneSeit > 11) return false;

    const ins = (sql) => db.prepare(sql);
    const insFall = ins('INSERT INTO Fall VALUES (?, ?, ?, ?, ?)');
    const insPerson = ins('INSERT INTO Person VALUES (?, ?, ?, ?, ?)');
    const insKennt = ins('INSERT INTO kennt VALUES (?, ?, ?)');
    const insVerdacht = ins('INSERT INTO verdaechtig VALUES (?, ?, ?)');
    const insAussage = ins('INSERT INTO Aussage VALUES (?, ?, ?, ?, ?)');
    const insBeweis = ins('INSERT INTO Beweisstueck VALUES (?, ?, ?, ?)');
    for (const f of faelle) insFall.run(f.nr, f.titel, f.eroeffnet, f.status, f.leiter);
    for (const p of personen) insPerson.run(p.nr, p.vorname, p.nachname, p.jahrgang, p.stadtteil);
    for (const k of kennt) insKennt.run(k.von, k.an, k.seit);
    for (const v of verdacht) insVerdacht.run(v.person, v.fall, v.grad);
    for (const a of aussagen) insAussage.run(a.person, a.fall, a.ort, a.zeitpunkt, a.inhalt);
    for (const b of beweise) insBeweis.run(b.nr, b.bezeichnung, b.fall, b.ort);
    return true;
  });
}

// ---------------------------------------------------------------- Abnahme

/** Ermittler, die (indirekt) ihr eigener Mentor sind. */
function mentorKreise(db) {
  const mentor = new Map(zeilen(db, 'SELECT ErmittlerNr, MentorNr FROM Ermittler'));
  const kreise = [];
  for (const start of mentor.keys()) {
    const gesehen = new Set([start]);
    let m = mentor.get(start);
    while (m !== null && m !== undefined) {
      if (gesehen.has(m)) {
        kreise.push(start);
        break;
      }
      gesehen.add(m);
      m = mentor.get(m);
    }
  }
  return kreise;
}

function abnahme(db) {
  const pflicht = PFLICHT_PERSONEN.join(', ');
  return [
    gleich('Zeilen Ermittler', wert(db, 'SELECT COUNT(*) FROM Ermittler'), 12),
    gleich('Zeilen Fall', wert(db, 'SELECT COUNT(*) FROM Fall'), 12),
    gleich('Zeilen Person (PersonNr 1–60 lückenlos)', zeilen(db, 'SELECT COUNT(*), MIN(PersonNr), MAX(PersonNr) FROM Person'), [[60, 1, 60]]),
    gleich('Zeilen Ort', wert(db, 'SELECT COUNT(*) FROM Ort'), 15),
    ...Object.entries(ZEILEN).map(([t, [min, max]]) => bereich(`Zeilen ${t}`, wert(db, `SELECT COUNT(*) FROM ${t}`), min, max)),
    gleich('Beispiel 2: in allen vier Fällen verdächtig = genau Person 13', zeilen(db, `
      SELECT Person.PersonNr
      FROM Person, verdaechtig
      WHERE Person.PersonNr = verdaechtig.PersonNr
        AND verdaechtig.FallNr IN (1, 2, 3, 4)
      GROUP BY Person.PersonNr, Person.Vorname, Person.Nachname
      HAVING COUNT(*) = 4`), [[13]]),
    gleich('Beispiel 5: mehrfach verdächtig = genau 13 (4) und 42 (2)', zeilen(db, `
      SELECT Person.PersonNr, COUNT(*) AS Faelle
      FROM Person, verdaechtig
      WHERE Person.PersonNr = verdaechtig.PersonNr
      GROUP BY Person.PersonNr, Person.Vorname, Person.Nachname
      HAVING COUNT(*) > 1
      ORDER BY Faelle DESC`), [[13, 4], [42, 2]]),
    gleich('Keine Falkenrath, kein Vorname Merle', wert(db, "SELECT COUNT(*) FROM Person WHERE Nachname = 'Falkenrath' OR Vorname = 'Merle'"), 0),
    gleich('Jahrgang 1988 + Hafenviertel = genau Person 13',
      spalte(db, "SELECT PersonNr FROM Person WHERE Jahrgang = 1988 AND Stadtteil = 'Hafenviertel'"), [13]),
    gleich('Verdachtseinträge in den Fällen 1–4', wert(db, 'SELECT COUNT(*) FROM verdaechtig WHERE FallNr IN (1, 2, 3, 4)'), 8),
    gleich('Ermittler ohne Mentor', wert(db, 'SELECT COUNT(*) FROM Ermittler WHERE MentorNr IS NULL'), 2),
    gleich('Bekanntschaften mit Seit = 2020', wert(db, 'SELECT COUNT(*) FROM kennt WHERE Seit = 2020'), 3),
    gleich('Self-Join-Kreise: niemand ist (indirekt) sein eigener Mentor', mentorKreise(db), []),
    // Die Zeile „Datenspuren.Einwohner enthält alle Personen dieser DB …“ prüft die Abnahme von Datenspuren.
    // erwartete Ergebnisse der Beispielabfragen (LIESMICH; „auf den Pflicht-Daten“ = Zeilen zu Pflicht-Personen/Fällen 1–4)
    gleich('Beispiel 1: 10 Zeilen (Edda Lorenz und Ulf Witte fehlen)',
      wert(db, 'SELECT COUNT(*) FROM Ermittler e, Ermittler m WHERE e.MentorNr = m.ErmittlerNr'), 10),
    gleich('Beispiel 3: Nora kennt Aksoy, Bargmann, Hollwedel, Lüttjohann, Ohlendiek (seit 2026)', zeilen(db, `
      SELECT b.Nachname, k.Seit FROM Person p, kennt k, Person b
      WHERE p.PersonNr = k.PersonNr AND k.BekannterNr = b.PersonNr AND p.PersonNr = 13
      ORDER BY b.Nachname`), [['Aksoy', 2026], ['Bargmann', 2026], ['Hollwedel', 2026], ['Lüttjohann', 2026], ['Ohlendiek', 2026]]),
    gleich('Beispiel 4: 9 Bekanntschaften seit 2020 unter den Pflicht-Personen', wert(db, `
      SELECT COUNT(*) FROM kennt WHERE Seit >= 2020 AND PersonNr IN (${pflicht})`), 9),
    gleich('Beispiel 6: 9 Aussagen zu den Fällen 1–4', wert(db, 'SELECT COUNT(*) FROM Aussage WHERE FallNr IN (1, 2, 3, 4)'), 9),
    gleich('Beispiel 7: Fälle 1–4 je Leitung (Kolthoff 2, Lorenz 1, Saathoff 1)', zeilen(db, `
      SELECT Ermittler.Name, COUNT(*) AS Faelle FROM Ermittler, Fall
      WHERE Ermittler.ErmittlerNr = Fall.LeiterNr AND Fall.FallNr IN (1, 2, 3, 4)
      GROUP BY Ermittler.ErmittlerNr, Ermittler.Name ORDER BY Faelle DESC, Ermittler.Name`),
    [['Maren Kolthoff', 2], ['Edda Lorenz', 1], ['Helge Saathoff', 1]]),
    // weitere Generator-Vorgaben
    gleich('Fälle 5–12: Titel aus der festen Liste', spalte(db, 'SELECT Titel FROM Fall WHERE FallNr >= 5 ORDER BY Titel'),
      [...FALLTITEL].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))),
    gleich('Fälle 5–12: Eroeffnet 2025-11-01 … 2026-08-31, aufsteigend', wert(db, `
      SELECT COUNT(*) FROM Fall f1, Fall f2 WHERE f1.FallNr >= 5 AND f2.FallNr = f1.FallNr + 1
        AND f2.Eroeffnet <= f1.Eroeffnet`) +
      wert(db, "SELECT COUNT(*) FROM Fall WHERE FallNr >= 5 AND (Eroeffnet < '2025-11-01' OR Eroeffnet > '2026-08-31')"), 0),
    gleich('Fälle 5–12: Status 6 abgeschlossen, 2 ruht', zeilen(db,
      'SELECT Status, COUNT(*) FROM Fall WHERE FallNr >= 5 GROUP BY Status ORDER BY Status'), [['abgeschlossen', 6], ['ruht', 2]]),
    gleich('Leitung nur Leitung/Senior/Junior; Ermittler 2, 9, 10, 11 leiten keinen Fall', wert(db, `
      SELECT COUNT(*) FROM Fall, Ermittler WHERE Fall.LeiterNr = Ermittler.ErmittlerNr
        AND (Ermittler.Dienstgrad NOT IN ('Leitung', 'Senior', 'Junior') OR Ermittler.ErmittlerNr IN (2, 9, 10, 11))`), 0),
    gleich('Keine gleichnamigen Personen', wert(db,
      'SELECT COUNT(*) FROM (SELECT 1 FROM Person GROUP BY Vorname, Nachname HAVING COUNT(*) > 1)'), 0),
    bereich('Personen ohne Jahrgang (≈ 5 %)', wert(db, 'SELECT COUNT(*) FROM Person WHERE Jahrgang IS NULL'), 1, 5),
    bereich('Personen ohne Stadtteil (≈ 5 %)', wert(db, 'SELECT COUNT(*) FROM Person WHERE Stadtteil IS NULL'), 1, 5),
    gleich('Nur Person 13 kennt Menschen an allen vier Phantom-Tatorten', spalte(db, `
      SELECT PersonNr FROM kennt WHERE BekannterNr IN (${TATORT_PERSONEN.join(', ')})
      GROUP BY PersonNr HAVING COUNT(*) = 4`), [13]),
    gleich('Erzeugte Personen kennen höchstens 3 andere', wert(db, `
      SELECT COUNT(*) FROM (SELECT PersonNr FROM kennt WHERE PersonNr NOT IN (${pflicht})
        GROUP BY PersonNr HAVING COUNT(*) > 3)`), 0),
    gleich('Erzeugte Personen nie in den Fällen 1–4 und höchstens in einem Fall verdächtig', wert(db, `
      SELECT COUNT(*) FROM verdaechtig WHERE FallNr IN (1, 2, 3, 4) AND PersonNr NOT IN (${pflicht})`) +
      wert(db, `SELECT COUNT(*) FROM (SELECT PersonNr FROM verdaechtig WHERE PersonNr NOT IN (${pflicht})
        GROUP BY PersonNr HAVING COUNT(*) > 1)`), 0),
    gleich('Fälle 5–12 mit 1–4 Verdächtigen, 3–8 Aussagen, 1–4 Beweisstücken', wert(db, `
      SELECT COUNT(*) FROM Fall WHERE FallNr >= 5 AND (
        (SELECT COUNT(*) FROM verdaechtig WHERE verdaechtig.FallNr = Fall.FallNr) NOT BETWEEN 1 AND 4
        OR (SELECT COUNT(*) FROM Aussage WHERE Aussage.FallNr = Fall.FallNr) NOT BETWEEN 3 AND 8
        OR (SELECT COUNT(*) FROM Beweisstueck WHERE Beweisstueck.FallNr = Fall.FallNr) NOT BETWEEN 1 AND 4)`), 0),
    gleich('Genau 3 Fälle (5–12) mit zweiter Aussage derselben Person am selben Ort', wert(db, `
      SELECT COUNT(DISTINCT FallNr) FROM (SELECT FallNr FROM Aussage WHERE FallNr >= 5
        GROUP BY PersonNr, FallNr, OrtNr HAVING COUNT(*) > 1)`), 3),
    gleich('Aussagen (Fälle 5–12) nach Eroeffnet, 09:00–19:59, spätestens 2026-09-20', wert(db, `
      SELECT COUNT(*) FROM Aussage, Fall WHERE Aussage.FallNr = Fall.FallNr AND Fall.FallNr >= 5
        AND (substr(Aussage.Zeitpunkt, 1, 10) <= Fall.Eroeffnet OR substr(Aussage.Zeitpunkt, 12, 5) < '09:00'
          OR substr(Aussage.Zeitpunkt, 12, 5) > '19:59' OR Aussage.Zeitpunkt > '${LETZTER_AUSSAGETAG} 23:59')`), 0),
    bereich('Beweisstücke ohne Fundort (≈ 10 %)', wert(db, 'SELECT COUNT(*) FROM Beweisstueck WHERE OrtNr IS NULL'), 2, 5)
  ];
}

module.exports = { generiere, abnahme };
