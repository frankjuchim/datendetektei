'use strict';
/*
 * Datendetektei – optimale Zuordnung (ungarische Methode) für den Modellierungs-Kern. Reine Funktion.
 *
 * ordneZu(gewichte) → zuordnung
 *   gewichte  = n × m-Matrix (Zahlen ≥ 0; Zeilen = Musterelemente, Spalten = Schülerelemente)
 *   zuordnung = Array der Länge n: Spaltenindex oder -1. Maximiert die Summe der Gewichte; Paare mit Gewicht 0
 *               gelten als nicht zugeordnet (-1).
 */

function ordneZu(gewichte) {
  const n = gewichte.length;
  const m = n ? Math.max(0, ...gewichte.map((z) => z.length)) : 0;
  const ergebnis = new Array(n).fill(-1);
  if (!n || !m) return ergebnis;
  const N = Math.max(n, m);
  let max = 0;
  for (const z of gewichte) for (const w of z) if (w > max) max = w;
  // Kostenmatrix (1-basiert, quadratisch): Kosten = max − Gewicht
  const kosten = (i, j) => max - ((i <= n && j <= m && gewichte[i - 1][j - 1]) || 0);
  const u = new Array(N + 1).fill(0);
  const v = new Array(N + 1).fill(0);
  const p = new Array(N + 1).fill(0);
  const weg = new Array(N + 1).fill(0);
  for (let i = 1; i <= N; i++) {
    p[0] = i;
    let j0 = 0;
    const minv = new Array(N + 1).fill(Infinity);
    const benutzt = new Array(N + 1).fill(false);
    do {
      benutzt[j0] = true;
      const i0 = p[j0];
      let delta = Infinity;
      let j1 = 0;
      for (let j = 1; j <= N; j++) {
        if (benutzt[j]) continue;
        const k = kosten(i0, j) - u[i0] - v[j];
        if (k < minv[j]) { minv[j] = k; weg[j] = j0; }
        if (minv[j] < delta) { delta = minv[j]; j1 = j; }
      }
      for (let j = 0; j <= N; j++) {
        if (benutzt[j]) { u[p[j]] += delta; v[j] -= delta; } else minv[j] -= delta;
      }
      j0 = j1;
    } while (p[j0] !== 0);
    do {
      const j1 = weg[j0];
      p[j0] = p[j1];
      j0 = j1;
    } while (j0);
  }
  for (let j = 1; j <= N; j++) {
    const i = p[j];
    if (i >= 1 && i <= n && j <= m && gewichte[i - 1][j - 1] > 0) ergebnis[i - 1] = j - 1;
  }
  return ergebnis;
}

module.exports = { ordneZu };
