'use strict';
// Deterministischer Zufall für die Trainingsplatz-Generatoren (Spec §7.8). PRNG mulberry32 wie scripts/db/zufall.js –
// eigene kleine Kopie, weil src/ nicht von scripts/ abhängen darf. Gleicher Seed → gleiche Folge → gleiche Aufgabe.

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

/** Zufallsquelle aus einem 32-Bit-Seed: zahl, ganz, waehle, ja, mischen, stichprobe. */
function erzeugeZufall(seed) {
  const naechste = mulberry32(seed);
  const z = {
    /** Zahl in [0, 1). */
    zahl: () => naechste(),
    /** Ganze Zahl in [min, max] (beide eingeschlossen). */
    ganz: (min, max) => min + Math.floor(naechste() * (max - min + 1)),
    /** Ein Element einer nicht leeren Liste. */
    waehle(liste) {
      if (!liste.length) throw new Error('waehle: leere Liste');
      return liste[Math.floor(naechste() * liste.length)];
    },
    /** true mit Wahrscheinlichkeit p. */
    ja: (p = 0.5) => naechste() < p,
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
    /** k verschiedene ganze Zahlen aus [min, max]. */
    verschiedene(k, min, max) {
      const s = new Set();
      while (s.size < k) s.add(z.ganz(min, max));
      return [...s];
    }
  };
  return z;
}

module.exports = { mulberry32, erzeugeZufall };
