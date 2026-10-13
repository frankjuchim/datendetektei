'use strict';
// Kleiner ZIP-Schreiber ohne Fremdpaket (Plan Phase 6 Task 5): Methode „stored“ (keine Kompression – PDF, docx und
// pptx sind ohnehin komprimiert), CRC32, UTF-8-Dateinamen (Bit 11), kein ZIP64 (Größenlimit sorgt für < 4 GiB).
//
//   zipTeile([{ name, daten: Buffer, datum: Date }]) → [Buffer, …] (Teile in Reihenfolge; Buffer.concat = Archiv)
//   lokalerKopf(eintrag), zentralEintrag(eintrag, offset), endsatz(anzahl, groesse, offset) für das Streamen.

const zlib = require('node:zlib');

let TABELLE = null;
/** CRC32 (IEEE 802.3). Nutzt zlib.crc32 (Node ≥ 20.15/22.2), sonst eine eigene Tabelle. */
function crc32(buf) {
  if (typeof zlib.crc32 === 'function') return zlib.crc32(buf) >>> 0;
  if (!TABELLE) {
    TABELLE = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      TABELLE[n] = c >>> 0;
    }
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = TABELLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Datum → MS-DOS-Zeit und -Datum (Ortszeit; Jahre vor 1980 werden auf 1980 gesetzt). */
function dosZeit(datum) {
  const d = datum instanceof Date && !Number.isNaN(datum.getTime()) ? datum : new Date();
  const jahr = Math.max(1980, Math.min(2107, d.getFullYear()));
  return {
    zeit: (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2),
    datum: ((jahr - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()
  };
}

const FLAGS_UTF8 = 0x0800;

/** Eintrag vorbereiten: Name als UTF-8, CRC, Größe, DOS-Zeit. */
function vorbereiten({ name, daten, datum }) {
  const nameBuf = Buffer.from(String(name).replace(/\\/g, '/'), 'utf8');
  if (nameBuf.length > 0xffff) throw new Error('ZIP: Dateiname zu lang.');
  if (daten.length > 0xfffffffe) throw new Error('ZIP: Datei zu groß.');
  return { nameBuf, daten, crc: crc32(daten), groesse: daten.length, dos: dosZeit(datum) };
}

function lokalerKopf(e) {
  const b = Buffer.alloc(30);
  b.writeUInt32LE(0x04034b50, 0);
  b.writeUInt16LE(20, 4); // benötigte Version 2.0
  b.writeUInt16LE(FLAGS_UTF8, 6);
  b.writeUInt16LE(0, 8); // Methode: stored
  b.writeUInt16LE(e.dos.zeit, 10);
  b.writeUInt16LE(e.dos.datum, 12);
  b.writeUInt32LE(e.crc, 14);
  b.writeUInt32LE(e.groesse, 18);
  b.writeUInt32LE(e.groesse, 22);
  b.writeUInt16LE(e.nameBuf.length, 26);
  b.writeUInt16LE(0, 28);
  return Buffer.concat([b, e.nameBuf]);
}

function zentralEintrag(e, offset) {
  const b = Buffer.alloc(46);
  b.writeUInt32LE(0x02014b50, 0);
  b.writeUInt16LE(0x031e, 4); // erstellt mit 3.0, Unix
  b.writeUInt16LE(20, 6);
  b.writeUInt16LE(FLAGS_UTF8, 8);
  b.writeUInt16LE(0, 10);
  b.writeUInt16LE(e.dos.zeit, 12);
  b.writeUInt16LE(e.dos.datum, 14);
  b.writeUInt32LE(e.crc, 16);
  b.writeUInt32LE(e.groesse, 20);
  b.writeUInt32LE(e.groesse, 24);
  b.writeUInt16LE(e.nameBuf.length, 28);
  // Extra, Kommentar, Disk, interne Attribute = 0
  b.writeUInt32LE((0o100644 << 16) >>> 0, 38); // externe Attribute: reguläre Datei rw-r--r--
  b.writeUInt32LE(offset, 42);
  return Buffer.concat([b, e.nameBuf]);
}

function endsatz(anzahl, groesse, offset) {
  if (anzahl > 0xffff || offset > 0xffffffff) throw new Error('ZIP: zu viele oder zu große Einträge.');
  const b = Buffer.alloc(22);
  b.writeUInt32LE(0x06054b50, 0);
  b.writeUInt16LE(anzahl, 8);
  b.writeUInt16LE(anzahl, 10);
  b.writeUInt32LE(groesse, 12);
  b.writeUInt32LE(offset, 16);
  return b;
}

/**
 * Schreiber für das Streamen: schreibe(eintrag) liefert die Teile eines Eintrags (Kopf + Daten), abschluss() das
 * zentrale Verzeichnis und den Endsatz.
 */
function zipSchreiber() {
  let offset = 0;
  const zentral = [];
  return {
    eintrag(roh) {
      const e = vorbereiten(roh);
      const kopf = lokalerKopf(e);
      zentral.push(zentralEintrag(e, offset));
      offset += kopf.length + e.groesse;
      if (offset > 0xffffffff) throw new Error('ZIP: Archiv zu groß.');
      return [kopf, e.daten];
    },
    abschluss() {
      const verzeichnis = Buffer.concat(zentral);
      return [verzeichnis, endsatz(zentral.length, verzeichnis.length, offset)];
    }
  };
}

/** Ganzes Archiv als Teile (für kleine Archive und Tests). */
function zipTeile(eintraege) {
  const z = zipSchreiber();
  const teile = [];
  for (const e of eintraege) teile.push(...z.eintrag(e));
  teile.push(...z.abschluss());
  return teile;
}

module.exports = { crc32, zipTeile, zipSchreiber };
