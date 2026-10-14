// Rangliste des Kurses (Scoreboard, Vertrag §4, Kurseinstellung scoreboard): gemeinsame Darstellung für die Karte auf
// dem Stadtplan (kompakt, Top 5) und die Seite /rangliste (Top 10) – DESIGN §4.9 Ranglisten-Zeile. Daten aus
// GET /api/kurse/:kurs/rangliste ({ rangliste, eigene }); eigene Zeile hervorgehoben. Ausgaben nur als Textknoten.

const V = new URL(import.meta.url).search;
const [A, R] = await Promise.all([import('../kern/api.js' + V), import('../kern/render.js' + V)]);
const { el, h } = R;

/** Eine Zeile: Platz, Anzeigename (+ „(du)“), Rang, Punkte. */
export function rangZeile(z) {
  const li = el('li', 'rang-zeile' + (z.ich ? ' ich' : '') + (z.platz <= 3 ? ' oben' : ''));
  const name = h('span', 'rang-name', el('strong', null, z.name), z.ich ? el('span', 'rang-du', '(du)') : null, el('span', 'rang-stufe', z.rang));
  li.append(el('span', 'rang-platz zahlen', `${z.platz}.`), name, el('span', 'rang-wert zahlen', A.zahl(z.punkte)));
  li.setAttribute('aria-label', `Platz ${z.platz}: ${z.name}${z.ich ? ' (du)' : ''}, ${z.rang}, ${A.mehrzahl(z.punkte, 'Punkt', 'Punkte')}`);
  if (z.ich) li.setAttribute('aria-current', 'true');
  return li;
}

/**
 * Liste der ersten `max` Plätze (max ≤ 10, mehr liefert die API nicht). Liegt die eigene Zeile dahinter, folgt sie nach
 * einer Lücke „…“. Leere Rangliste → null.
 */
export function rangListe(d, max = 10) {
  if (!d || !Array.isArray(d.rangliste) || !d.rangliste.length) return null;
  const oben = d.rangliste.slice(0, max);
  const eigene = oben.some((z) => z.ich) ? null : d.rangliste.find((z) => z.ich) || d.eigene || null;
  const ol = el('ol', 'rang-liste');
  for (const z of oben) ol.appendChild(rangZeile(z));
  if (eigene) {
    const luecke = el('li', 'rang-luecke', '…');
    luecke.setAttribute('aria-hidden', 'true');
    ol.append(luecke, rangZeile(eigene));
  }
  return ol;
}
