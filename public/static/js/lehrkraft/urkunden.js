// Reiter „Urkunden“ (STORY §10.1 „Detektei-Lizenz“, §10.2 Ränge): Auswahl (alle oder ab einem Rang), Datum, Vorschau
// der Liste und Link auf die Druckseite /lehrkraft/urkunden?kurs=…&ab=…&datum=… (je Schüler:in eine A4-Seite).

const V = new URL(import.meta.url).search;
const G = await import('./gemeinsam.js' + V);
const { A, R } = G;
const { el, h } = R;

export const RAENGE = ['Neuling', 'Spürnase', 'Ermittler:in', 'Kommissar:in', 'Meisterdetektiv:in'];

/** Heutiges Datum als JJJJ-MM-TT (Ortszeit). */
export function heute() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function zeige(panel, ctx) {
  const d = await ctx.auswertung();
  const { karte } = G.karte('Urkunden „Detektei-Lizenz“', 'Je Schülerin bzw. Schüler eine A4-Seite mit Anzeigename, erreichtem Rang, Zahl der Beweisstücke (besiegte Verhöre), Kurs und Datum. Gedruckt wird über die Druckfunktion des Browsers.', { id: 'ur-titel' });

  const ab = el('select', 'lk-auswahl');
  ab.id = 'ur-ab';
  const alle = el('option', null, 'alle Schülerinnen und Schüler');
  alle.value = '';
  ab.appendChild(alle);
  for (const r of RAENGE.slice(1)) {
    const o = el('option', null, `ab Rang ${r}`);
    o.value = r;
    ab.appendChild(o);
  }
  const abLabel = el('label', null, 'Auswahl');
  abLabel.htmlFor = ab.id;
  const datum = el('input');
  datum.type = 'date';
  datum.id = 'ur-datum';
  datum.value = heute();
  const datumLabel = el('label', null, 'Datum auf der Urkunde');
  datumLabel.htmlFor = datum.id;
  const felder = h('div', 'lk-zeile', h('div', 'lk-feld', abLabel, ab), h('div', 'lk-feld', datumLabel, datum));
  karte.appendChild(felder);

  const anzahl = el('p', 'lk-unter');
  anzahl.id = 'ur-anzahl';
  anzahl.setAttribute('aria-live', 'polite');
  const link = A.linkKnopf('Druckseite öffnen', '#', 'knopf primaer');
  link.id = 'ur-oeffnen';
  link.prepend(R.icon('i-stern'));
  karte.append(anzahl, h('div', 'knopf-reihe', link));

  function aktualisiere() {
    const min = ab.value ? RAENGE.indexOf(ab.value) : 0;
    const n = d.schueler.filter((s) => RAENGE.indexOf(s.rang) >= min).length;
    anzahl.textContent = n ? `${G.mehrzahl(n, 'Urkunde', 'Urkunden')} (${G.mehrzahl(n, 'Seite', 'Seiten')} A4).` : 'Keine Schülerin und kein Schüler erfüllt diese Auswahl.';
    const p = new URLSearchParams({ kurs: ctx.kurs.id });
    if (ab.value) p.set('ab', ab.value);
    if (/^\d{4}-\d{2}-\d{2}$/.test(datum.value)) p.set('datum', datum.value);
    link.href = '/lehrkraft/urkunden?' + p.toString();
    link.toggleAttribute('aria-disabled', !n);
  }
  ab.addEventListener('change', aktualisiere);
  datum.addEventListener('change', aktualisiere);
  aktualisiere();
  karte.appendChild(el('p', 'hinweis-klein', 'Auf der Urkunde stehen nur Anzeigenamen – keine Codes, keine Kennungen. Die Lizenz ist frei erfunden und als solche gekennzeichnet.'));
  panel.replaceChildren(karte);
}
