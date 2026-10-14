// Verwaltung (nur Superadmin, Spec §7.11; bis 0.8.3 Reiter „System“): Reiter „Inhalte“ – Seed-Bericht (Dateien, Status,
// Fehler, Umfang je Akte), Inhalte neu laden (mit Bestätigung), Originale als ZIP je Akte; Reiter „Sicherung“ – Kopie der
// Plattform-DB herunterladen.

const V = new URL(import.meta.url).search;
const G = await import('./gemeinsam.js' + V);
const { A, R } = G;
const { el, h, knopf } = R;

function datum(iso) {
  if (!iso) return '–';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? String(iso) : d.toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
}

function tabelle(caption, kopf, zeilen) {
  const rahmen = el('div', 'tabelle-rahmen lk-tabelle');
  const t = el('table', 'daten');
  t.appendChild(el('caption', 'nur-sr', caption));
  const tr = el('tr');
  for (const k of kopf) {
    const th = el('th', null, k);
    th.scope = 'col';
    tr.appendChild(th);
  }
  t.appendChild(h('thead', null, tr));
  const tbody = el('tbody');
  for (const z of zeilen) {
    const r = el('tr');
    z.forEach((w, i) => {
      const td = el(i === 0 ? 'th' : 'td');
      if (i === 0) td.scope = 'row';
      if (w instanceof Node) td.appendChild(w);
      else td.textContent = w === null || w === undefined ? '–' : String(w);
      r.appendChild(td);
    });
    tbody.appendChild(r);
  }
  t.appendChild(tbody);
  rahmen.appendChild(t);
  return rahmen;
}

function berichtTeile(b) {
  const teile = [];
  teile.push(el('p', 'lk-unter', `Zuletzt geladen: ${datum(b.bericht.zeit)}` + (b.umfang ? ` · ${b.umfang.aufgaben} Aufgaben, ${b.umfang.level} Ermittlungen, ${b.umfang.bosse} Verhöre` : '')));
  teile.push(
    tabelle(
      'Dateien',
      ['Datei', 'Akte', 'Status', 'Aufgaben', 'Ausgelassen', 'Fehler'],
      b.bericht.dateien.map((d) => [
        d.datei,
        d.welt,
        el('span', 'system-status ' + (d.status === 'geladen' ? 'ok' : 'fehler'), d.status),
        d.aufgaben,
        d.ausgelassen + d.deaktiviert,
        d.fehler.length ? h('ul', null, ...d.fehler.slice(0, 20).map((f) => el('li', null, f))) : '–'
      ])
    )
  );
  if (b.bericht.entfernt.length) teile.push(el('p', 'hinweis-klein', 'Entfernt: ' + b.bericht.entfernt.join(', ')));
  teile.push(
    tabelle(
      'Akten',
      ['Akte', 'Ermittlungen', 'Aufgaben', 'Cold Cases', 'Verhör-Pool'],
      b.akten.map((a) => [G.akteLang(a.nr, a.titel), a.ermittlungen, a.aufgaben, a.coldCases, a.verhoerPool])
    )
  );
  return teile;
}

export async function inhalte(panel, ctx) {
  const [bericht, material] = await Promise.all([A.holen('/api/admin/seed-bericht'), A.holen('/api/material').catch(() => ({}))]);
  const teile = [];

  const { karte: seed } = G.karte('Inhalte (Seed-Bericht)', 'Welche Akten-Dateien geladen sind, mit Fehlern und Umfang.', { id: 'sy-seed' });
  const berichtBox = el('div', 'lk-feld');
  berichtBox.id = 'sy-bericht';
  berichtBox.append(...berichtTeile(bericht));
  seed.appendChild(berichtBox);
  const neu = knopf('Inhalte neu laden', 'knopf', 'i-uhr');
  neu.id = 'sy-neu-laden';
  const bestaetigung = el('div');
  const rueck = G.rueckmeldung();
  neu.addEventListener('click', async () => {
    const ja = await G.bestaetigen(
      bestaetigung,
      'Akten neu aus seed/akten einspielen? Laufende Sitzungen bleiben erhalten; geänderte Aufgaben gelten sofort.',
      'Ja, neu laden',
      { id: 'sy-neu-ja' }
    );
    if (!ja) return;
    neu.disabled = true;
    rueck.className = 'rueckmeldung';
    rueck.textContent = 'Wird neu geladen …';
    try {
      const b = await A.senden('/api/admin/inhalte-neu-laden', {});
      berichtBox.replaceChildren(...berichtTeile(b));
      rueck.className = 'rueckmeldung ok';
      rueck.textContent = 'Inhalte neu geladen.';
      ctx.cache.clear();
    } catch (f) {
      rueck.className = 'rueckmeldung fehler';
      rueck.textContent = f.message;
    } finally {
      neu.disabled = false;
    }
  });
  seed.append(h('div', 'knopf-reihe', neu), bestaetigung, rueck);
  teile.push(seed);

  const zips = Array.isArray(material.zips) ? material.zips : [];
  const { karte: originale } = G.karte('Originale (docx/pptx)', 'Alle Originale einer Akte als ZIP. Einzelne Dateien stehen unter „Materialien“.', { id: 'sy-originale' });
  if (!zips.length) originale.appendChild(el('p', 'hinweis-klein', 'Keine Originale hinterlegt.'));
  const ul = el('ul', 'material-liste');
  for (const z of zips) {
    const a = el('a', null, z.akte === 0 ? 'Gesamt' : z.akte === 'kuer' ? 'Kür' : `Akte ${z.akte}`);
    a.href = z.url;
    a.setAttribute('download', '');
    ul.appendChild(h('li', null, a, el('span', 'material-info', `${G.mehrzahl(z.anzahl, 'Datei', 'Dateien')} · ${G.groesse(z.groesse)}`)));
  }
  if (zips.length) originale.appendChild(ul);
  teile.push(originale);

  panel.replaceChildren(...teile);
}

export async function sicherung(panel) {
  const { karte } = G.karte('Sicherung', 'Kopie der Plattform-Datenbank (Konten, Kurse, Lernstand) als SQLite-Datei. Vertraulich behandeln.', { id: 'sy-sicherung' });
  const dl = A.linkKnopf('Sicherung herunterladen', '/api/admin/sicherung', 'knopf');
  dl.id = 'sy-sicherung-link';
  dl.setAttribute('download', '');
  karte.appendChild(h('div', 'knopf-reihe', dl));
  panel.replaceChildren(karte);
}
