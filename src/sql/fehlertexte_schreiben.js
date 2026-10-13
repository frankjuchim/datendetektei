'use strict';
/*
 * Datendetektei – deutsche Texte für die Kür-Sandbox (Schreibmodus, Plan Phase 6 Task 7). Ergänzt src/sql/fehlertexte.js
 * um Meldungen, die es nur beim Schreiben gibt (Fremdschlüssel, Primärschlüssel, NOT NULL, CHECK, Tabelle existiert …)
 * und um die Grenzen der Sandbox. Alles andere (Syntax, unbekannte Tabelle/Spalte, Zeitlimit …) übersetzt
 * fehlertexte.js. Texte geduzt, mit Ursache und Weg; aus der Rohmeldung höchstens Tabellen- und Spaltennamen.
 *
 * ordneZu(fehler) → { code, text }
 *   fehler = Antwort der Sandbox { code, text, sqliteCode?, max?, tabelle?, wort? } (ok: false)
 * mitOrt(fehler) → Text mit „Anweisung n (Zeile z): …“ davor, wenn bekannt.
 */

const allgemein = require('./fehlertexte');
const { MAX_SKRIPT, MAX_ANWEISUNGEN } = require('./skript');

function name(s) {
  s = String(s == null ? '' : s).replace(/[\u0000-\u001F\u007F]/g, '').trim();
  return s.length > 40 ? s.slice(0, 40) + '…' : s;
}

/** „Tabelle.Spalte“ → { tabelle, spalte } */
function teile(ts) {
  const t = name(ts);
  const i = t.indexOf('.');
  return i > 0 ? { tabelle: t.slice(0, i), spalte: t.slice(i + 1) } : { tabelle: '', spalte: t };
}

const MB = (bytes) => (bytes && bytes >= 1024 * 1024 ? `${Math.round((bytes / (1024 * 1024)) * 10) / 10} MB`.replace('.', ',') : `${Math.round((bytes || 0) / 1024)} KB`);

const ROH = [
  [/^FOREIGN KEY constraint failed$/, 'FREMDSCHLUESSEL', () =>
    'Fremdschlüssel verletzt: Ein Fremdschlüsselwert verweist auf einen Datensatz, den es in der referenzierten Tabelle nicht gibt – ' +
    'oder ein Datensatz, auf den noch verwiesen wird, soll gelöscht werden. Die Datenbank schützt so die referentielle Integrität. ' +
    'Prüf, ob der Wert in der anderen Tabelle als Primärschlüssel vorkommt (oder lass ihn NULL).'],
  [/^UNIQUE constraint failed: (.+)$/, null, (t, f) => {
    const liste = t[1].split(',').map((x) => teile(x.trim()));
    const spalten = liste.map((x) => x.spalte).join(', ');
    const tabelle = liste[0].tabelle;
    if (f.sqliteCode === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
      return { code: 'PRIMAERSCHLUESSEL', text: `Doppelter Primärschlüssel: In ${tabelle} gibt es schon einen Datensatz mit diesem Wert in ${spalten}. Ein Primärschlüsselwert darf nur einmal vorkommen.` };
    }
    return { code: 'EINDEUTIG', text: `Doppelter Wert: In ${tabelle} muss ${spalten} eindeutig sein (UNIQUE), dieser Wert kommt aber schon vor.` };
  }],
  [/^NOT NULL constraint failed: (.+)$/, 'NOT_NULL', (t) => {
    const { tabelle, spalte } = teile(t[1]);
    return `In ${tabelle} darf ${spalte} nicht leer sein (NOT NULL). Gib dort einen Wert an.`;
  }],
  [/^CHECK constraint failed/, 'CHECK', () => 'Eine CHECK-Bedingung der Tabelle ist nicht erfüllt. Prüf die Werte, die du einfügen willst.'],
  [/^table (.+) already exists$/, 'TABELLE_DA', (t) => `Die Tabelle ${name(t[1])} gibt es schon. Leg sie nur einmal an – oder lösch sie vorher mit DROP TABLE.`],
  [/^table (.+) has (\d+) columns but (\d+) values were supplied$/, 'WERTEANZAHL', (t) =>
    `Die Tabelle ${name(t[1])} hat ${t[2]} Spalten, du gibst aber ${t[3]} Werte an. Gib zu jeder Spalte einen Wert an – oder nenne die Spalten: INSERT INTO ${name(t[1])} (…) VALUES (…).`],
  [/^(\d+) values for (\d+) columns$/, 'WERTEANZAHL', (t) => `Du nennst ${t[2]} Spalten, gibst aber ${t[1]} Werte an. Spalten und Werte müssen zusammenpassen.`],
  [/^table (.+) has no column named (.+)$/, 'SPALTE_FEHLT', (t) => `Die Tabelle ${name(t[1])} hat keine Spalte ${name(t[2])}. Prüf die Schreibweise im CREATE TABLE.`],
  [/^foreign key mismatch/, 'FREMDSCHLUESSEL_ZIEL', () =>
    'Der Fremdschlüssel verweist auf Spalten, die in der Zieltabelle kein Primärschlüssel (bzw. nicht UNIQUE) sind. Verweise auf den Primärschlüssel der anderen Tabelle.'],
  [/^no such table: main\.(.+)$/, 'KEINE_TABELLE', (t) => `Die Tabelle ${name(t[1])} gibt es (noch) nicht. Leg sie vorher mit CREATE TABLE an.`],
  [/^object name reserved for internal use/, 'NAME_RESERVIERT', () => 'Namen, die mit sqlite_ beginnen, sind für die Datenbank selbst reserviert. Wähle einen anderen Namen.'],
  [/^(cannot start a transaction|cannot commit|cannot rollback)/, 'TRANSAKTION', () => 'BEGIN, COMMIT und ROLLBACK passen hier nicht zusammen. Lass sie in der Kür einfach weg.']
];

const INTERN = {
  zu_viele_tabellen: (f) => ({ code: 'ZU_VIELE_TABELLEN', text: `Deine Datenbank hat zu viele Tabellen – in der Kür-Sandbox sind höchstens ${f.max || 20} Tabellen erlaubt.` }),
  zu_viele_zeilen: (f) => ({ code: 'ZU_VIELE_ZEILEN', text: `Die Tabelle ${name(f.tabelle)} hat zu viele Datensätze – in der Kür-Sandbox sind höchstens ${f.max || 500} je Tabelle erlaubt.` }),
  zu_gross: (f) => ({ code: 'ZU_GROSS', text: `Deine Datenbank ist zu groß geworden – in der Kür-Sandbox sind höchstens ${MB(f.max)} erlaubt.` }),
  zu_viele_anweisungen: (f) => ({ code: 'ZU_VIELE_ANWEISUNGEN', text: `Dein Skript hat zu viele Anweisungen (höchstens ${f.max || MAX_ANWEISUNGEN}).` }),
  zu_lang: (f) => ({ code: 'ZU_LANG', text: `Dein Skript ist zu lang (höchstens ${String(f.max || MAX_SKRIPT).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} Zeichen).` }),
  leer: () => ({ code: 'LEER', text: 'Dein Skript ist leer. Schreib zum Beispiel ein CREATE TABLE.' }),
  verboten: (f) => ({
    code: 'VERBOTEN',
    text: `${f.wort === '.' ? 'Ein Punkt-Befehl (z. B. .tables)' : name(f.wort)} ist in der Kür-Sandbox nicht erlaubt. Erlaubt sind CREATE TABLE, INSERT, UPDATE, DELETE, DROP TABLE, ALTER TABLE und SELECT.`
  }),
  mehrere_anweisungen: () => ({ code: 'MEHRERE_ANWEISUNGEN', text: 'Trenne die Anweisungen jeweils mit einem Semikolon ;.' }),
  start_fehler: () => ({ code: 'START', text: 'Die Startdatenbank dieser Aufgabe ließ sich nicht anlegen – an deinem Skript liegt es nicht. Sag deiner Lehrkraft Bescheid.' })
};

function ordneZu(f) {
  const fehler = f && typeof f === 'object' ? f : { code: 'sql_fehler', text: String(f || '') };
  if (INTERN[fehler.code]) return INTERN[fehler.code](fehler);
  if (fehler.code === 'sql_fehler') {
    const roh = String(fehler.text || '');
    for (const [muster, code, bau] of ROH) {
      const t = muster.exec(roh);
      if (!t) continue;
      const r = bau(t, fehler);
      return typeof r === 'string' ? { code, text: r } : r;
    }
    return allgemein.ordneZu(roh);
  }
  const codes = { zeitlimit: 'ZEITLIMIT', ueberlastet: 'UEBERLASTET', absturz: 'ABSTURZ', beendet: 'BEENDET' };
  const c = codes[fehler.code];
  if (c === 'ZEITLIMIT') {
    return { code: c, text: `Dein Skript hat zu lange gerechnet (mehr als ${String((fehler.ms || 1500) / 1000).replace('.', ',')} s) und wurde abgebrochen. Läuft eine rekursive Abfrage endlos?` };
  }
  if (c) return allgemein.ordneZu({ code: c, ms: fehler.ms });
  return allgemein.ordneZu({ code: 'ABSTURZ' });
}

/** Text mit Ort davor („Anweisung 4 (Zeile 13): …“). */
function mitOrt(f) {
  const { code, text } = ordneZu(f);
  if (f && Number.isInteger(f.anweisung)) {
    const ort = `Anweisung ${f.anweisung}${Number.isInteger(f.zeile) ? ` (Zeile ${f.zeile})` : ''}`;
    return { code, text: `${ort}: ${text}` };
  }
  return { code, text };
}

module.exports = { ordneZu, mitOrt };
