'use strict';
// Deterministischer Zufall für den Bau der Übungsdatenbanken (seed/datenbanken/LIESMICH.md §6).
// PRNG mulberry32, Seed = FNV-1a-32 von "datendetektei:<db>:v1". Kein Zufall der Laufzeit, keine Systemzeit:
// Zeitpunkte werden aus festen Start- und Endwerten berechnet (UTC-Arithmetik ohne Zeitzonen).

const BAU_VERSION = 1;

/** FNV-1a 32 Bit über die UTF-8-Bytes eines Textes (oder über einen Buffer). */
function fnv1a32(eingabe) {
  const bytes = Buffer.isBuffer(eingabe) ? eingabe : Buffer.from(String(eingabe), 'utf8');
  let h = 0x811c9dc5;
  for (const b of bytes) {
    h ^= b;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** mulberry32: liefert eine Funktion, die Zahlen in [0, 1) erzeugt. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function naechste() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Seed-Text einer DB: "datendetektei:<db>:v1". */
function seedText(db, version = BAU_VERSION) {
  return `datendetektei:${db}:v${version}`;
}

// ---------------------------------------------------------------- Zeit (Minuten seit 1970, UTC)

const MUSTER_ZEITPUNKT = /^(\d{4})-(\d{2})-(\d{2})(?: (\d{2}):(\d{2}))?$/;

/** 'JJJJ-MM-TT' oder 'JJJJ-MM-TT hh:mm' → Minuten seit 1970-01-01 00:00 (UTC, ohne Sommerzeit). */
function zuMinuten(text) {
  const m = MUSTER_ZEITPUNKT.exec(text);
  if (!m) throw new Error(`Ungültiger Zeitpunkt: ${text}`);
  const ms = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4] || 0), Number(m[5] || 0));
  return Math.round(ms / 60000);
}

function zweistellig(n) {
  return String(n).padStart(2, '0');
}

/** Minuten seit 1970 → 'JJJJ-MM-TT hh:mm'. */
function alsZeitpunkt(minuten) {
  const d = new Date(minuten * 60000);
  return `${alsDatum(minuten)} ${zweistellig(d.getUTCHours())}:${zweistellig(d.getUTCMinutes())}`;
}

/** Minuten seit 1970 → 'JJJJ-MM-TT'. */
function alsDatum(minuten) {
  const d = new Date(minuten * 60000);
  return `${d.getUTCFullYear()}-${zweistellig(d.getUTCMonth() + 1)}-${zweistellig(d.getUTCDate())}`;
}

/** Zeitpunkt (oder Datum) + n Minuten → 'JJJJ-MM-TT hh:mm'. */
function plusMinuten(text, n) {
  return alsZeitpunkt(zuMinuten(text) + n);
}

/** Datum + n Tage → 'JJJJ-MM-TT'. */
function plusTage(datum, n) {
  return alsDatum(zuMinuten(datum) + n * 1440);
}

/** ISO-Wochentag eines Datums: Mo = 1 … So = 7. */
function wochentag(text) {
  const tag = new Date(zuMinuten(text) * 60000).getUTCDay();
  return tag === 0 ? 7 : tag;
}

// ---------------------------------------------------------------- Zufallsquelle

/**
 * Erzeugt eine Zufallsquelle. `quelle` ist ein Seed-Text (wird per FNV-1a gehasht) oder eine 32-Bit-Zahl.
 * Alle Hilfen ziehen aus derselben Folge – die Aufrufreihenfolge bestimmt das Ergebnis.
 */
function erzeugeZufall(quelle) {
  const text = typeof quelle === 'number' ? `#${quelle >>> 0}` : String(quelle);
  const seed = typeof quelle === 'number' ? quelle >>> 0 : fnv1a32(text);
  const naechste = mulberry32(seed);

  const z = {
    seed,
    seedText: text,
    /** Zahl in [0, 1). */
    zahl: () => naechste(),
    /** Ganze Zahl in [min, max] (beide eingeschlossen). */
    ganz(min, max) {
      if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) throw new Error(`ganz(${min}, ${max}): ungültiger Bereich`);
      return min + Math.floor(naechste() * (max - min + 1));
    },
    /** Ein Element einer nicht leeren Liste. */
    waehle(liste) {
      if (!Array.isArray(liste) || liste.length === 0) throw new Error('waehle: leere Liste');
      return liste[Math.floor(naechste() * liste.length)];
    },
    /** Gewichtete Wahl aus [[wert, gewicht], …]; Gewicht 0 wird nie gewählt. */
    gewichtet(eintraege) {
      const summe = eintraege.reduce((s, [, g]) => s + g, 0);
      if (!(summe > 0)) throw new Error('gewichtet: Summe der Gewichte muss > 0 sein');
      let r = naechste() * summe;
      for (const [wert, gewicht] of eintraege) {
        if (gewicht <= 0) continue;
        if (r < gewicht) return wert;
        r -= gewicht;
      }
      for (let i = eintraege.length - 1; i >= 0; i--) if (eintraege[i][1] > 0) return eintraege[i][0];
      throw new Error('gewichtet: unerreichbar');
    },
    /** true mit Wahrscheinlichkeit p. */
    ja: (p) => naechste() < p,
    /** Neue, gemischte Kopie (Fisher-Yates). */
    mischen(liste) {
      const kopie = [...liste];
      for (let i = kopie.length - 1; i > 0; i--) {
        const j = Math.floor(naechste() * (i + 1));
        [kopie[i], kopie[j]] = [kopie[j], kopie[i]];
      }
      return kopie;
    },
    /** k verschiedene Elemente (Reihenfolge zufällig). */
    stichprobe(liste, k) {
      if (k > liste.length) throw new Error('stichprobe: k größer als die Liste');
      return z.mischen(liste).slice(0, k);
    },
    /** Zufälliger Zeitpunkt 'JJJJ-MM-TT hh:mm' in [von, bis]; `raster` in Minuten (Vielfache ab 00:00). */
    zeitpunkt(von, bis, { raster = 1 } = {}) {
      const a = Math.ceil(zuMinuten(von) / raster);
      const b = Math.floor(zuMinuten(bis) / raster);
      return alsZeitpunkt(z.ganz(a, b) * raster);
    },
    /** Zufälliges Datum 'JJJJ-MM-TT' in [von, bis]. */
    datum(von, bis) {
      const a = Math.floor(zuMinuten(von) / 1440);
      const b = Math.floor(zuMinuten(bis) / 1440);
      return alsDatum(z.ganz(a, b) * 1440);
    },
    /** Unabhängige Teil-Quelle (Seed-Text + '/' + Bezeichnung), z. B. für einen Generator-Abschnitt. */
    teil: (bezeichnung) => erzeugeZufall(`${text}/${bezeichnung}`)
  };
  return z;
}

/**
 * Deterministisches Neuziehen (LIESMICH §6): ruft `versuch(teilQuelle, nr)` mit Teil-Seeds
 * "<bezeichnung>#0", "#1", … auf, bis ein Ergebnis ≠ undefined/false kommt; höchstens `max` Versuche.
 */
function versuche(zufall, bezeichnung, versuch, max = 1000) {
  for (let i = 0; i < max; i++) {
    const ergebnis = versuch(zufall.teil(`${bezeichnung}#${i}`), i);
    if (ergebnis !== undefined && ergebnis !== false) return ergebnis;
  }
  throw new Error(`${bezeichnung}: Vorgabe nach ${max} Versuchen nicht erfüllbar`);
}

module.exports = {
  BAU_VERSION,
  fnv1a32,
  mulberry32,
  seedText,
  erzeugeZufall,
  versuche,
  zuMinuten,
  alsZeitpunkt,
  alsDatum,
  plusMinuten,
  plusTage,
  wochentag
};
