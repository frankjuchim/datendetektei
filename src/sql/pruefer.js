'use strict';
/*
 * Datendetektei – SQL-Prüfer für die Interaktion `sql` (Spec §7.4; Plan Phase 2 Task 10). Nur serverseitig.
 *
 * erzeugePruefer({ sandbox, schemata }) → { pruefeSql, musterErgebnisse }
 *   sandbox  = erzeugeSandbox(…) aus src/sql/sandbox.js (nur fuehreAus wird benutzt)
 *   schemata = { <db>: schemaAus(hauptBuffer) } (src/sql/schema.js; mit Zeilenzahlen für KREUZPRODUKT)
 *
 * pruefeSql({ sql, aufgabe }) → Promise<{ ok, diagnose: [{ code, falle, art, text, zeile?, spalte? }], zeilen }>
 *   aufgabe = { id, datenbank, loesung: { sql }, varianten: [typ], sortierung?: [{ spalte, richtung }],
 *               aliasPflicht?, abimodus: 'streng' | 'hinweis' | 'aus' }
 *   1. Parsen (Parsefehler → nicht ok, keine Ausführung) und Regeln im Abimodus der Aufgabe. Regel-Fehler im
 *      Abimodus `streng` und NICHT_SELECT → nicht ok, keine Ausführung. In `hinweis`/`aus` läuft die Abfrage trotzdem
 *      (damit die Ergebnis-Diagnosen helfen), ok ist bei einem Regel-Fehler (z. B. GB_REGEL, NULL_VERGLEICH) aber nie wahr.
 *   2. Schüler- und Musterabfrage auf Haupt-DB + allen aufgabe.varianten ausführen; das Musterergebnis je Variante
 *      wird einmal berechnet und gecacht (Schlüssel: Aufgaben-id + SHA-256 von Datenbank und Muster-SQL).
 *   3. Vergleich je Variante (src/sql/diagnose.js): Spaltenanzahl, Spaltennamen nur bei aliasPflicht, Zeilen als
 *      Multimenge, Reihenfolge nur bei sortierung. Die Spaltenreihenfolge zählt immer.
 *   4. ok ⇔ kein Regel-Fehler und alle Varianten stimmen. Sonst Diagnosen aus der Haupt-DB; stimmt die Haupt-DB,
 *      aber eine Variante nicht: NUR_ZUFAELLIG (nennt nur den Variantentyp allgemein).
 *   5. zeilen = Zeilenzahl des Schülerergebnisses auf der Haupt-DB (null, wenn es kein Ergebnis gibt).
 *   Diagnosen: zuerst Ergebnis-/Ausführungsdiagnosen, dann die Regel-Diagnosen (mit zeile/spalte). Art
 *   `technisch` (Überlastung, Absturz) ist kein Fehler der Schülerin/des Schülers.
 *   Die Antwort enthält nie Lösungsdaten (keine Musterzeilen, -werte, -spaltennamen, keine erwarteten Anzahlen).
 *
 * musterErgebnisse(aufgabe) → Promise<{ haupt, varianten: { <typ>: ergebnis } }> (nur serverseitig, z. B. Validator).
 *   Eine fehlerhafte Musterlösung (SQL-Fehler, abgeschnitten, unbekannte Variante) ist ein Inhaltsfehler: Ablehnung
 *   mit Error („Musterlösung …“).
 *
 * Kür K1 (Phase 6 Task 7): Aufgaben mit schreiben: true (Schreib-Skripte) prüft src/sql/schreibpruefer.js – pruefeSql
 * und musterErgebnisse leiten dorthin weiter (Rückmeldung zusätzlich mit pruefpunkte, siehe dort).
 *
 * Keine Abhängigkeit von src/kern.
 */

const crypto = require('node:crypto');
const parser = require('./parser');
const regeln = require('./regeln');
const diagnose = require('./diagnose');
const { MAX_LAENGE } = require('./sandbox');
const { erzeugeSchreibPruefer } = require('./schreibpruefer');

const MAX_CACHE = 1000;

function fingerabdruck(aufgabe) {
  return crypto
    .createHash('sha256')
    .update(String(aufgabe.datenbank) + '\0' + String(aufgabe.loesung && aufgabe.loesung.sql))
    .digest('hex')
    .slice(0, 32);
}

function pruefeAufgabe(aufgabe) {
  if (!aufgabe || typeof aufgabe !== 'object') throw new TypeError('aufgabe fehlt');
  if (typeof aufgabe.datenbank !== 'string') throw new TypeError('aufgabe.datenbank fehlt');
  if (!aufgabe.loesung || typeof aufgabe.loesung.sql !== 'string') throw new TypeError('aufgabe.loesung.sql fehlt');
}

/** Tabellen im FROM der Hauptabfrage (nur einfache Tabellen; sonst null). */
function fromTabellen(ast) {
  if (!ast || ast.typ !== 'select' || !Array.isArray(ast.from)) return null;
  if (!ast.from.every((q) => q && q.typ === 'tabelle')) return null;
  return ast.from.map((q) => q.name);
}

function erzeugePruefer({ sandbox, schemata = {} } = {}) {
  if (!sandbox || typeof sandbox.fuehreAus !== 'function') throw new TypeError('sandbox fehlt');
  const cache = new Map();
  const schreib = typeof sandbox.fuehreSkriptAus === 'function' ? erzeugeSchreibPruefer({ sandbox }) : null;
  const istSchreiben = (aufgabe) => !!(aufgabe && aufgabe.schreiben === true);
  function schreibPruefer() {
    if (!schreib) throw new Error('Die Sandbox hat keinen Schreibmodus.');
    return schreib;
  }

  function musterFuer(aufgabe, variante) {
    const schluessel = String(aufgabe.id || '') + '|' + fingerabdruck(aufgabe) + '|' + (variante || '');
    if (cache.has(schluessel)) return cache.get(schluessel);
    const name = (aufgabe.id || aufgabe.datenbank) + ' (' + (variante || 'Haupt-DB') + ')';
    const versprechen = sandbox
      .fuehreAus({ db: aufgabe.datenbank, variante: variante || null, sql: aufgabe.loesung.sql })
      .then((e) => {
        if (!e || !e.ok) throw new Error('Musterlösung ' + name + ' nicht ausführbar: ' + (e ? e.code + ' – ' + e.text : 'keine Antwort'));
        if (e.abgeschnitten) throw new Error('Musterlösung ' + name + ': Ergebnis zu groß (abgeschnitten)');
        return e;
      });
    versprechen.catch(() => cache.delete(schluessel));
    if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value);
    cache.set(schluessel, versprechen);
    return versprechen;
  }

  async function musterErgebnisse(aufgabe) {
    if (istSchreiben(aufgabe)) return schreibPruefer().musterLauf(aufgabe);
    pruefeAufgabe(aufgabe);
    const typen = aufgabe.varianten || [];
    const [haupt, ...rest] = await Promise.all([musterFuer(aufgabe, null), ...typen.map((t) => musterFuer(aufgabe, t))]);
    const varianten = {};
    typen.forEach((t, i) => {
      varianten[t] = rest[i];
    });
    return { haupt, varianten };
  }

  async function pruefeSql({ sql, aufgabe } = {}) {
    if (istSchreiben(aufgabe)) return schreibPruefer().pruefeSkript({ skript: sql, aufgabe });
    pruefeAufgabe(aufgabe);
    const abimodus = aufgabe.abimodus || 'hinweis';
    const schema = schemata[aufgabe.datenbank] || null;
    const typen = aufgabe.varianten || [];
    const optionen = { aliasPflicht: !!aufgabe.aliasPflicht, sortierung: aufgabe.sortierung || null };

    // 1. Parsen + Regeln
    if (typeof sql !== 'string') sql = '';
    if (sql.length > MAX_LAENGE) {
      return { ok: false, diagnose: [diagnose.ausSandboxFehler({ code: 'zu_lang', max: MAX_LAENGE })], zeilen: null };
    }
    const geparst = parser.parse(sql);
    if (!geparst.ast) {
      const liste = geparst.fehler.map((f) => ({ code: f.code, falle: null, art: 'fehler', text: f.text, zeile: f.zeile, spalte: f.spalte }));
      return { ok: false, diagnose: liste, zeilen: null };
    }
    const regelDiagnosen = regeln.pruefeRegeln(geparst.ast, { schema: schema || undefined, abimodus });
    const regelFehler = regelDiagnosen.filter((d) => d.art === 'fehler');
    if ((abimodus === 'streng' && regelFehler.length > 0) || regelFehler.some((d) => d.code === 'NICHT_SELECT')) {
      return { ok: false, diagnose: regelDiagnosen, zeilen: null };
    }

    // 2. Ausführen (Muster zuerst: ein Inhaltsfehler soll nicht als Schülerfehler erscheinen)
    const muster = await musterErgebnisse(aufgabe);
    const schueler = await Promise.all(
      [null, ...typen].map((variante) => sandbox.fuehreAus({ db: aufgabe.datenbank, variante, sql }))
    );
    const [sHaupt, ...sVarianten] = schueler;

    const ergebnisDiagnosen = [];
    const fuegeHinzu = (d) => {
      if (!ergebnisDiagnosen.some((x) => x.code === d.code) && !regelDiagnosen.some((x) => x.code === d.code)) ergebnisDiagnosen.push(d);
    };
    const antwort = (stimmt, zeilen) => {
      const liste = ergebnisDiagnosen.concat(regelDiagnosen);
      return { ok: stimmt && !liste.some((d) => d.art !== 'hinweis'), diagnose: liste, zeilen };
    };

    if (!sHaupt.ok) {
      fuegeHinzu(diagnose.ausSandboxFehler(sHaupt)); // MEHRDEUTIG o. Ä. nicht doppelt, wenn eine Regel es schon meldet
      return antwort(false, null);
    }
    const zeilen = sHaupt.anzahl;

    // 3./4. Vergleich auf der Haupt-DB
    const vHaupt = diagnose.vergleiche(sHaupt, muster.haupt, optionen);
    if (!vHaupt.gleich) {
      diagnose.diagnosenAusVergleich(vHaupt, sHaupt, muster.haupt).forEach(fuegeHinzu);
      const tabellen = fromTabellen(geparst.ast);
      if (vHaupt.zuViele && schema && tabellen && tabellen.length >= 2) {
        let produkt = 1;
        for (const t of tabellen) {
          const eintrag = schema.find((x) => x.tabelle.toLowerCase() === String(t).toLowerCase());
          produkt = eintrag ? produkt * eintrag.zeilen : NaN;
        }
        if (produkt === sHaupt.anzahl || (sHaupt.abgeschnitten && produkt >= sHaupt.anzahl)) fuegeHinzu(diagnose.kreuzprodukt());
      }
      return antwort(false, zeilen);
    }

    // Varianten: Haupt-DB stimmt – stimmt es auch auf den Prüf-Datenbanken?
    const daneben = [];
    typen.forEach((typ, i) => {
      const s = sVarianten[i];
      if (!s.ok) {
        const d = diagnose.ausSandboxFehler(s);
        if (d.art === 'technisch') fuegeHinzu(d);
        else daneben.push(typ);
        return;
      }
      if (!diagnose.vergleiche(s, muster.varianten[typ], optionen).gleich) daneben.push(typ);
    });
    if (daneben.length > 0) fuegeHinzu(diagnose.nurZufaellig(daneben));
    return antwort(daneben.length === 0, zeilen);
  }

  return { pruefeSql, musterErgebnisse };
}

module.exports = { erzeugePruefer };
