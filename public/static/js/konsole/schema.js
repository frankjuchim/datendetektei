// Schema-Browser der Ermittlungskonsole (DESIGN.md §4.10): Tabellen als aufklappbare Einträge mit Zeilenanzahl,
// Primärschlüssel unterstrichen, Fremdschlüssel mit „↑“ und Ziel; Antippen einer Spalte fügt „Tabelle.Spalte“ ein.
// Ausgaben nur als Textknoten.
//
// zeigeSchema(container, schema, { beiSpalte }) – schema wie GET /api/db/:name/schema:
//   [{ tabelle, spalten: [{ name, typ, pk, fk: { tabelle, spalte } | null }], zeilen }]

function el(tag, klasse, text) {
  const e = document.createElement(tag);
  if (klasse) e.className = klasse;
  if (text !== undefined && text !== null) e.textContent = String(text);
  return e;
}

const zahl = (n) => Number(n).toLocaleString('de-DE');

export function zeigeSchema(container, schema, { beiSpalte } = {}) {
  const frag = document.createDocumentFragment();
  const liste = Array.isArray(schema) ? schema : [];
  liste.forEach((t, i) => {
    const details = el('details', 'schema-tabelle');
    details.dataset.tabelle = t.tabelle;
    if (liste.length <= 3 || i === 0) details.open = true;

    const summary = el('summary');
    summary.appendChild(el('span', 'name', t.tabelle));
    const anz = el('span', 'anz', zahl(t.zeilen));
    anz.title = `${zahl(t.zeilen)} ${t.zeilen === 1 ? 'Zeile' : 'Zeilen'}`;
    anz.setAttribute('aria-label', anz.title);
    summary.appendChild(anz);
    details.appendChild(summary);

    const ul = el('ul');
    for (const s of t.spalten || []) {
      const li = el('li');
      const knopf = el('button', 'schema-spalte');
      knopf.type = 'button';
      const einfuegen = `${t.tabelle}.${s.name}`;
      knopf.dataset.einfuegen = einfuegen;
      if (s.fk) knopf.appendChild(el('span', 'fk-pfeil', '↑'));
      knopf.appendChild(el('span', 'spalte' + (s.pk ? ' pk' : ''), s.name));
      if (s.fk) knopf.appendChild(el('span', 'ziel', `→ ${s.fk.tabelle}`));
      const rolle = [s.pk ? 'Primärschlüssel' : '', s.fk ? `Fremdschlüssel auf ${s.fk.tabelle}.${s.fk.spalte}` : '']
        .filter(Boolean)
        .join(', ');
      knopf.setAttribute('aria-label', `${einfuegen} einfügen${rolle ? ' (' + rolle + ')' : ''}`);
      knopf.title = `${einfuegen} einfügen${s.typ ? ' · ' + s.typ : ''}`;
      knopf.addEventListener('click', () => beiSpalte && beiSpalte(einfuegen));
      li.appendChild(knopf);
      ul.appendChild(li);
    }
    details.appendChild(ul);
    frag.appendChild(details);
  });
  container.replaceChildren(frag);
}

export function zeigeSchemaFehler(container, text) {
  container.replaceChildren(el('p', 'schema-laedt', text));
}
