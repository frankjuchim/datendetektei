// Interaktionen der Modellierung (docs/AUFGABENFORMAT.md §6.11, Spec §7.6.6): zellen (Zellen einer dbtabelle
// antippen), anomalie (Anomalie-Simulator auf einer Kopie der Tabelle) und zerlegen (Zerlegungs-Puzzle). Eingebunden
// über erzeugeAufgabe in interaktionen.js; jeder Teil hat die übliche Schnittstelle { kind, ui, antwort, leer, setze,
// feedback, loesung, sperren } und optional anbinden(inhaltEl) (wird nach dem Rendern der Blöcke aufgerufen).
// Geprüft wird nur auf dem Server. Was der Simulator als Widerspruch bzw. Informationsverlust zeigt, rechnet er
// ausschließlich aus den sichtbaren Daten der Tabelle – die Lösung kennt der Browser vor dem Lösen nicht.
// Entwürfe (Auswahl, Simulationsstand, Zerlegung) liegen im localStorage des Geräts (kontext.speicher).
// Nur Textknoten, keine Inline-Styles: Positionen beim Ziehen über CSS-Custom-Properties (style.setProperty).

const V = new URL(import.meta.url).search;
const R = await import('./render.js' + V);
const { el, h, knopf } = R;

/* ================= Hilfen ================= */

function liesEntwurf(schluessel) {
  if (!schluessel) return null;
  try {
    const s = window.localStorage.getItem(schluessel);
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}
function schreibEntwurf(schluessel, wert) {
  if (!schluessel) return;
  try {
    window.localStorage.setItem(schluessel, JSON.stringify(wert));
  } catch {
    /* privater Modus oder voll */
  }
}
const entwurfSchluessel = (kontext, art, nr) => (kontext && kontext.speicher ? `${kontext.speicher}:${art}:${nr}` : null);

const zellText = (w) => (w === null || w === undefined ? 'NULL' : String(w));
const zk = (r, c) => `${r},${c}`;
const gleicherWert = (a, b) => (a === null || a === undefined ? b === null || b === undefined : b !== null && b !== undefined && String(a) === String(b));

function meldung(klasse = 'teil-meldung') {
  const p = el('p', klasse);
  p.setAttribute('aria-live', 'polite');
  return p;
}

/** Zellen als Liste [[zeile, spalte], …] aus einer Antwort ([[r,c]] oder { zellen }; Zelle auch { zeile, spalte }). */
function zellenAus(a) {
  const roh = Array.isArray(a) ? a : a && Array.isArray(a.zellen) ? a.zellen : [];
  const out = [];
  for (const z of roh) {
    const p = Array.isArray(z) ? z : z && typeof z === 'object' ? [z.zeile, z.spalte] : null;
    if (p && Number.isInteger(p[0]) && Number.isInteger(p[1]) && !out.some((x) => x[0] === p[0] && x[1] === p[1])) out.push([p[0], p[1]]);
  }
  return out;
}

/** Zellinhalt wie im dbtabelle-Block: NULL grau, Zahlen mit Komma. */
function zellInhalt(wert) {
  if (wert === null || wert === undefined) return el('span', 'null', 'NULL');
  if (typeof wert === 'number') return document.createTextNode(String(wert).replace('.', ','));
  return document.createTextNode(String(wert));
}

/** Spaltenkopf wie im dbtabelle-Block (PK unterstrichen, ↑FK). */
function spaltenKopf(k) {
  const th = el('th');
  th.scope = 'col';
  if (k.fk) th.appendChild(el('span', 'fk-pfeil', '↑'));
  th.appendChild(el('span', k.pk ? 'pk' : null, k.name));
  if (k.pk) th.appendChild(el('span', 'nur-sr', ' (Primärschlüssel)'));
  return th;
}

/**
 * Tastatur für Zellen-Raster: nur eine Zelle ist per Tab erreichbar (roving tabindex), Pfeiltasten, Pos1 und Ende
 * bewegen den Fokus, Leertaste/Enter lösen den Knopf aus (echte <button>). Fehlende Zellen werden übersprungen.
 */
function rasterTastatur(tabelle) {
  const knoepfe = () => [...tabelle.querySelectorAll('button.zelle-knopf')];
  const pos = (b) => [Number(b.dataset.r), Number(b.dataset.c)];
  let aktiv = null;
  function tabStopp() {
    const alle = knoepfe().filter((b) => !b.disabled);
    if (!alle.length) return;
    const ziel = (aktiv && alle.find((b) => zk(...pos(b)) === aktiv)) || alle[0];
    for (const b of knoepfe()) b.tabIndex = b === ziel ? 0 : -1;
  }
  tabelle.addEventListener('focusin', (e) => {
    const b = e.target.closest && e.target.closest('button.zelle-knopf');
    if (!b) return;
    aktiv = zk(...pos(b));
    tabStopp();
  });
  tabelle.addEventListener('keydown', (e) => {
    const b = e.target.closest && e.target.closest('button.zelle-knopf');
    if (!b) return;
    const [r, c] = pos(b);
    const alle = knoepfe().filter((x) => !x.disabled);
    const zeile = (rr) => alle.filter((x) => pos(x)[0] === rr).sort((x, y) => pos(x)[1] - pos(y)[1]);
    const zeilen = [...new Set(alle.map((x) => pos(x)[0]))].sort((x, y) => x - y);
    let ziel = null;
    switch (e.key) {
      case 'ArrowRight':
        ziel = zeile(r).find((x) => pos(x)[1] > c);
        break;
      case 'ArrowLeft':
        ziel = zeile(r).reverse().find((x) => pos(x)[1] < c);
        break;
      case 'ArrowDown':
      case 'ArrowUp': {
        const folge = e.key === 'ArrowDown' ? zeilen.filter((x) => x > r) : zeilen.filter((x) => x < r).reverse();
        for (const rr of folge) {
          const z = zeile(rr);
          if (!z.length) continue;
          ziel = z.reduce((best, x) => (Math.abs(pos(x)[1] - c) < Math.abs(pos(best)[1] - c) ? x : best));
          break;
        }
        break;
      }
      case 'Home':
        ziel = zeile(r)[0];
        break;
      case 'End':
        ziel = zeile(r).at(-1);
        break;
      default:
        return;
    }
    e.preventDefault();
    if (ziel) ziel.focus();
  });
  return { tabStopp };
}

/** Zellknopf (Inhalt wird von außen gefüllt). */
function zellKnopf(r, c) {
  const b = el('button', 'zelle-knopf');
  b.type = 'button';
  b.dataset.r = String(r);
  b.dataset.c = String(c);
  b.setAttribute('aria-pressed', 'false');
  return b;
}

/* ================= zellen ================= */

/** Zellen einer dbtabelle antippen (0-basiert); mehrfach:false → genau eine, reihenfolge:true → Nummern. */
export function teilZellen(ia, kontext, nr, aufgabe) {
  const mehrfach = ia.mehrfach !== false;
  const folge = ia.reihenfolge === true;
  const block = aufgabe && Array.isArray(aufgabe.inhalt) ? aufgabe.inhalt[ia.block] : null;
  const kopf = block && Array.isArray(block.kopf) ? block.kopf : [];
  const daten = block && Array.isArray(block.zeilen) ? block.zeilen : [];
  const schluessel = entwurfSchluessel(kontext, 'zellen', nr);
  const gueltig = (z) => z[0] >= 0 && z[0] < daten.length && z[1] >= 0 && z[1] < kopf.length;
  let gewaehlt = zellenAus(liesEntwurf(schluessel)).filter(gueltig);
  if (!mehrfach) gewaehlt = gewaehlt.slice(0, 1);
  const knoepfe = new Map();
  let gesperrt = false;
  let loesungZellen = null;
  const info = el('p', 'teil-hinweis');
  info.setAttribute('aria-live', 'polite');
  const fehlt = el('p', 'leise');
  fehlt.hidden = true;

  function zeichne() {
    for (const [k, b] of knoepfe) {
      const i = gewaehlt.findIndex((z) => zk(...z) === k);
      b.setAttribute('aria-pressed', i >= 0 ? 'true' : 'false');
      b.disabled = gesperrt;
      const td = b.parentElement;
      td.classList.toggle('gewaehlt', i >= 0);
      td.classList.toggle('loesung', !!loesungZellen && loesungZellen.has(k));
      td.classList.toggle('falsch', !!loesungZellen && i >= 0 && !loesungZellen.has(k));
      const nrEl = b.querySelector('.zelle-nr');
      if (nrEl) nrEl.textContent = folge && i >= 0 ? String(i + 1) : '';
    }
    const n = gewaehlt.length;
    const auftrag = mehrfach ? (folge ? 'Tippe die Zellen in der richtigen Reihenfolge an.' : 'Tippe alle passenden Zellen an.') : 'Tippe die passende Zelle an.';
    info.textContent = `${auftrag} Gewählt: ${n === 0 ? 'keine' : n === 1 ? 'eine Zelle' : n + ' Zellen'}.`;
  }
  function klick(r, c) {
    if (gesperrt) return;
    const k = zk(r, c);
    const i = gewaehlt.findIndex((z) => zk(...z) === k);
    if (i >= 0) gewaehlt.splice(i, 1);
    else {
      if (!mehrfach) gewaehlt = [];
      gewaehlt.push([r, c]);
    }
    zeichne();
    schreibEntwurf(schluessel, gewaehlt);
    kontext.geaendert();
  }
  return {
    kind: 'zellen',
    ui: h('div', 'teil-zellen', info, fehlt),
    /** Die Zellen des dbtabelle-Blocks werden zu Knöpfen (Inhalt und Markierungen des Blocks bleiben). */
    anbinden(inhaltEl) {
      const blockEl = inhaltEl.querySelector(`:scope > [data-block="${ia.block}"]`);
      const tabelle = blockEl && blockEl.querySelector('table');
      if (!tabelle || !tabelle.tBodies[0]) {
        fehlt.textContent = 'Die Tabelle zu dieser Aufgabe fehlt.';
        fehlt.hidden = false;
        return;
      }
      blockEl.classList.add('zellen-waehlbar');
      [...tabelle.tBodies[0].rows].forEach((tr, r) => {
        [...tr.cells].filter((td) => !td.classList.contains('wahl-spalte')).forEach((td, c) => {
          const b = zellKnopf(r, c);
          const inhalt = el('span', 'zelle-inhalt');
          while (td.firstChild) inhalt.appendChild(td.firstChild);
          b.append(inhalt, el('span', 'zelle-nr'));
          b.setAttribute('aria-label', `${(kopf[c] && kopf[c].name) || 'Spalte ' + (c + 1)}, Zeile ${r + 1}: ${zellText(daten[r] && daten[r][c])}`);
          b.addEventListener('click', (e) => {
            e.stopPropagation();
            klick(r, c);
          });
          td.classList.add('zelle-wahl');
          td.appendChild(b);
          knoepfe.set(zk(r, c), b);
        });
      });
      rasterTastatur(tabelle).tabStopp();
      zeichne();
    },
    antwort: () => gewaehlt.map((z) => [z[0], z[1]]),
    leer: () => gewaehlt.length === 0,
    setze(a) {
      gewaehlt = zellenAus(a).filter(gueltig);
      if (!mehrfach) gewaehlt = gewaehlt.slice(0, 1);
      zeichne();
    },
    feedback() {
      /* Rückmeldung {} – die Seite zeigt „Noch nicht“; Zellen bleiben ohne Hinweis (gegen Probieren). */
    },
    loesung(lo) {
      const soll = zellenAus(lo);
      loesungZellen = new Set(soll.map((z) => zk(...z)));
      if (folge) gewaehlt = soll;
      zeichne();
    },
    sperren(an) {
      gesperrt = an;
      zeichne();
    }
  };
}

/* ================= anomalie ================= */

const ARTEN = [
  { id: 'einfuegung', text: 'Einfügeanomalie' },
  { id: 'aenderung', text: 'Änderungsanomalie' },
  { id: 'loeschung', text: 'Löschanomalie' },
  { id: 'keine', text: 'Keine Anomalie' }
];

/**
 * Befund nach dem Ändern: Spalten c, für die vorher „gleicher Wert in c ⇒ gleicher Wert in der geänderten Spalte“
 * galt (und c Werte wiederholt), deren Gruppen jetzt verschiedene Werte haben → Widerspruch. Nur sichtbare Daten.
 */
export function befundAendern(kopf, original, kopie, spalte) {
  const geaendert = original.map((z, r) => r).filter((r) => !gleicherWert(original[r][spalte], kopie[r][spalte]));
  const saetze = [];
  const zellen = new Set();
  const name = (c) => (kopf[c] && kopf[c].name) || `Spalte ${c + 1}`;
  if (!geaendert.length) return { saetze: ['Du hast noch keine Zelle geändert.'], zellen, geaendert: 0 };
  const gesehen = new Set();
  for (let c = 0; c < kopf.length; c++) {
    if (c === spalte) continue;
    const vorher = new Map();
    let gilt = true;
    let wiederholt = false;
    original.forEach((z) => {
      if (z[c] === null || z[c] === undefined) return;
      const k = zellText(z[c]);
      if (vorher.has(k)) {
        wiederholt = true;
        if (!gleicherWert(vorher.get(k), z[spalte])) gilt = false;
      } else vorher.set(k, z[spalte]);
    });
    if (!gilt || !wiederholt) continue;
    const gruppen = new Map();
    kopie.forEach((z, r) => {
      if (z[c] === null || z[c] === undefined) return;
      const k = zellText(z[c]);
      if (!gruppen.has(k)) gruppen.set(k, []);
      gruppen.get(k).push(r);
    });
    for (const [wert, rows] of gruppen) {
      const werte = [...new Set(rows.map((r) => zellText(kopie[r][spalte])))];
      if (werte.length < 2) continue;
      rows.forEach((r) => zellen.add(zk(r, spalte)));
      const sig = rows.join(',');
      if (gesehen.has(sig)) continue;
      gesehen.add(sig);
      saetze.push(`Widerspruch: Gleiche ${name(c)} (${wert}), aber in ${name(spalte)} stehen jetzt verschiedene Werte: ${werte.join(' und ')}.`);
    }
  }
  if (!zellen.size) {
    saetze.push(
      geaendert.length > 1
        ? `Kein Widerspruch – aber für diese eine Änderung musstest du ${geaendert.length} Zellen ändern.`
        : 'Eine Zelle geändert, kein Widerspruch in der Tabelle.'
    );
  }
  return { saetze, zellen, geaendert: geaendert.length };
}

/** Befund nach dem Löschen: Werte gelöschter Zeilen, die in keiner verbliebenen Zeile mehr stehen. */
export function befundLoeschen(kopf, original, geloescht) {
  const zellen = new Set();
  const saetze = [];
  if (!geloescht.size) return { saetze: ['Du hast noch keine Zeile gelöscht.'], zellen };
  const rest = original.filter((z, r) => !geloescht.has(r));
  const verloren = [];
  for (let c = 0; c < kopf.length; c++) {
    if (kopf[c] && kopf[c].name === 'Zeile') continue; // technische Zeilennummer der Ausschnitte – keine Information
    const gemeldet = new Set();
    for (const r of [...geloescht].sort((x, y) => x - y)) {
      const v = original[r] ? original[r][c] : null;
      if (v === null || v === undefined) continue;
      if (rest.some((z) => gleicherWert(z[c], v))) continue;
      zellen.add(zk(r, c));
      if (!gemeldet.has(zellText(v))) {
        gemeldet.add(zellText(v));
        verloren.push(`${kopf[c].name}: ${zellText(v)}`);
      }
    }
  }
  if (verloren.length) saetze.push(`Nach dem Löschen steht nirgends mehr: ${verloren.join(' · ')}.`);
  else saetze.push('Kein Wert ging verloren – jeder steht noch in einer anderen Zeile.');
  return { saetze, zellen };
}

/** Befund nach dem Einfügen: leere Zellen der neuen Zeile, Primärschlüssel besonders. */
export function befundEinfuegen(kopf, werte, index) {
  const zellen = new Set();
  const saetze = [];
  const leer = kopf.map((k, c) => c).filter((c) => werte[c] === null || werte[c] === undefined);
  const pkLeer = leer.filter((c) => kopf[c].pk);
  const sonst = leer.filter((c) => !kopf[c].pk);
  leer.forEach((c) => zellen.add(zk(index, c)));
  if (pkLeer.length) {
    saetze.push(`Die neue Zeile hat keinen Wert für den Primärschlüssel ${pkLeer.map((c) => kopf[c].name).join(', ')} – so eine Zeile darf es nicht geben.`);
  }
  if (sonst.length) saetze.push(`Leer bleiben müssten: ${sonst.map((c) => kopf[c].name).join(', ')}.`);
  if (!leer.length) saetze.push('Alle Werte der neuen Zeile sind bekannt.');
  return { saetze, zellen };
}

/** Anomalie-Simulator: Auftrag auf einer Kopie ausführen, Befund ansehen, Anomalieart wählen, Zellen markieren. */
export function teilAnomalie(ia, kontext, nr, aufgabe) {
  const block = aufgabe && Array.isArray(aufgabe.inhalt) ? aufgabe.inhalt[ia.block] : null;
  const kopf = block && Array.isArray(block.kopf) ? block.kopf : [];
  const original = block && Array.isArray(block.zeilen) ? block.zeilen.map((z) => [...z]) : [];
  const op = ['aendern', 'loeschen', 'einfuegen'].includes(ia.operation) ? ia.operation : 'aendern';
  const sim = ia.simulation && typeof ia.simulation === 'object' ? ia.simulation : {};
  const spalte = Number.isInteger(sim.spalte) ? sim.spalte : -1;
  const loeschbar = new Set(Array.isArray(sim.zeilen) ? sim.zeilen.filter(Number.isInteger) : []);
  const neueWerte = kopf.map((k, c) => (Array.isArray(sim.werte) && sim.werte[c] !== undefined ? sim.werte[c] : null));
  const neuIndex = original.length;
  const schluessel = entwurfSchluessel(kontext, 'anomalie', nr);

  // Zustand der Simulation
  let geaendert = new Set(); // Zeilen, deren Zelle in `spalte` auf `neu` geändert wurde
  let geloescht = new Set();
  let eingefuegt = false;
  let phase = 'auftrag'; // auftrag | bestimmen
  let art = '';
  let markiert = []; // [[r,c]] in Antippreihenfolge
  let gesperrt = false;
  let loesungAnzeige = null; // { art, zellen:Set }
  let rueck = null; // { art, zellen } ok/falsch

  const zeilenAnzahl = () => original.length + (eingefuegt ? 1 : 0);
  const gueltig = (z) => z[0] >= 0 && z[0] < zeilenAnzahl() && z[1] >= 0 && z[1] < kopf.length;
  const istAenderbar = (r) => spalte >= 0 && original[r] && gleicherWert(original[r][spalte], sim.alt);

  function kopie() {
    return original.map((z, r) => z.map((w, c) => (c === spalte && geaendert.has(r) ? sim.neu : w)));
  }
  function ausgefuehrt() {
    if (op === 'aendern') return geaendert.size > 0;
    if (op === 'loeschen') return geloescht.size > 0;
    return eingefuegt;
  }
  function befund() {
    if (op === 'aendern') return befundAendern(kopf, original, kopie(), spalte);
    if (op === 'loeschen') return befundLoeschen(kopf, original, geloescht);
    return eingefuegt ? befundEinfuegen(kopf, neueWerte, neuIndex) : { saetze: ['Du hast die neue Zeile noch nicht angelegt.'], zellen: new Set() };
  }

  function laden() {
    const e = liesEntwurf(schluessel);
    if (!e || typeof e !== 'object') return;
    if (op === 'aendern' && Array.isArray(e.geaendert)) geaendert = new Set(e.geaendert.filter((r) => Number.isInteger(r) && istAenderbar(r)));
    if (op === 'loeschen' && Array.isArray(e.geloescht)) geloescht = new Set(e.geloescht.filter((r) => loeschbar.has(r)));
    if (op === 'einfuegen') eingefuegt = e.eingefuegt === true;
    if (e.phase === 'bestimmen' && ausgefuehrt()) phase = 'bestimmen';
    if (ARTEN.some((a) => a.id === e.art)) art = e.art;
    markiert = zellenAus(e.zellen).filter(gueltig);
  }
  function speichern() {
    schreibEntwurf(schluessel, { geaendert: [...geaendert], geloescht: [...geloescht], eingefuegt, phase, art, zellen: markiert });
  }
  function geaendertMeldung() {
    const alt = rueck;
    rueck = null;
    speichern();
    if (alt) zeichne(); // veraltete Rückmeldung ausblenden
    kontext.geaendert();
  }
  laden();

  /* ---------- Oberfläche ---------- */
  const karte = el('div', 'auftragskarte');
  karte.append(el('p', 'etikett', 'Auftragskarte'), R.md(ia.auftrag || '', null));
  const anleitung = el('p', 'teil-hinweis');
  const name = (c) => (kopf[c] && kopf[c].name) || `Spalte ${c + 1}`;
  if (op === 'aendern') {
    anleitung.textContent = `Führe den Auftrag so aus, wie die Tabelle es erlaubt: Tippe in der Spalte ${name(spalte)} jede Zelle an, die du von ${zellText(sim.alt)} auf ${zellText(sim.neu)} ändern willst. Du entscheidest, welche.`;
  } else if (op === 'loeschen') {
    anleitung.textContent = 'Führe den Auftrag so aus, wie die Tabelle es erlaubt: Lösche die betroffene Zeile mit dem Knopf „Zeile löschen“.';
  } else {
    anleitung.textContent = 'Führe den Auftrag so aus, wie die Tabelle es erlaubt: Lege die neue Zeile an. Bekannt sind nur einige Werte.';
  }
  karte.appendChild(anleitung);

  const tabelle = el('table', 'daten sim-tabelle');
  const cap = el('caption', null, `Kopie: ${(block && block.tabelle) || 'Tabelle'}`);
  const kopfZeile = el('tr');
  kopf.forEach((k) => kopfZeile.appendChild(spaltenKopf(k)));
  const aktionKopf = el('th', 'aktion-spalte');
  aktionKopf.scope = 'col';
  aktionKopf.appendChild(el('span', 'nur-sr', 'Aktion'));
  if (op === 'loeschen') kopfZeile.appendChild(aktionKopf);
  const tbody = el('tbody');
  tabelle.append(cap, h('thead', null, kopfZeile), tbody);
  const rahmen = h('div', 'tabelle-rahmen dbtabelle sim-rahmen', tabelle);
  const raster = rasterTastatur(tabelle);

  const befundBox = el('div', 'sim-befund');
  befundBox.setAttribute('aria-live', 'polite');
  const anlegen = knopf('Zeile anlegen', 'knopf', 'i-plus');
  anlegen.addEventListener('click', () => {
    if (gesperrt || eingefuegt) return;
    eingefuegt = true;
    zeichne();
    geaendertMeldung();
  });
  const fertig = knopf('Auftrag ausgeführt – Anomalie bestimmen', 'knopf', 'i-vor');
  const hinweisAuftrag = meldung();
  fertig.addEventListener('click', () => {
    if (gesperrt) return;
    if (!ausgefuehrt()) {
      hinweisAuftrag.textContent = 'Führe zuerst den Auftrag in der Tabelle aus.';
      return;
    }
    phase = 'bestimmen';
    zeichne();
    geaendertMeldung();
    const erste = artBox.querySelector('button');
    if (erste) erste.focus();
  });
  const zurueck = knopf('Zurück zum Auftrag', 'knopf leise', 'i-zurueck');
  zurueck.addEventListener('click', () => {
    if (gesperrt) return;
    phase = 'auftrag';
    zeichne();
    geaendertMeldung();
  });
  const neuKnoepfe = [];
  function neuKnopf() {
    const b = knopf('Neu beginnen', 'knopf leise');
    b.addEventListener('click', () => {
      if (gesperrt) return;
      geaendert = new Set();
      geloescht = new Set();
      eingefuegt = false;
      phase = 'auftrag';
      art = '';
      markiert = [];
      hinweisAuftrag.textContent = '';
      zeichne();
      geaendertMeldung();
      const erste = tabelle.querySelector('button:not([disabled])');
      if (erste) erste.focus();
    });
    neuKnoepfe.push(b);
    return b;
  }
  const auftragBox = h('div', 'sim-auftrag', h('div', 'knopf-reihe', op === 'einfuegen' ? anlegen : null, fertig, neuKnopf()), hinweisAuftrag);

  // Anomalieart
  const artBox = el('div', 'segment anomalie-arten');
  artBox.setAttribute('role', 'group');
  artBox.setAttribute('aria-label', 'Anomalieart');
  const artKnoepfe = new Map();
  for (const a of ARTEN) {
    const b = el('button', 'segment-knopf', a.text);
    b.type = 'button';
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => {
      if (gesperrt) return;
      art = art === a.id ? '' : a.id;
      zeichne();
      geaendertMeldung();
    });
    artKnoepfe.set(a.id, b);
    artBox.appendChild(b);
  }
  const markInfo = el('p', 'teil-hinweis');
  markInfo.setAttribute('aria-live', 'polite');
  const bestimmen = h(
    'div',
    'sim-bestimmen',
    el('p', 'etikett', 'Welche Anomalie ist das?'),
    artBox,
    el('p', 'teil-hinweis', 'Markiere dann in der Tabelle die betroffenen Zellen (antippen; Tastatur: Pfeiltasten und Leertaste).'),
    markInfo,
    h('div', 'knopf-reihe', zurueck, neuKnopf())
  );
  const rueckBox = el('ul', 'sim-rueckmeldung');
  rueckBox.setAttribute('aria-live', 'polite');
  const loesungBox = el('div', 'sim-loesung');

  const ui = h('div', 'teil-anomalie', karte, rahmen, befundBox, auftragBox, bestimmen, rueckBox, loesungBox);

  function markierKlick(r, c) {
    if (gesperrt || phase !== 'bestimmen') return;
    const k = zk(r, c);
    const i = markiert.findIndex((z) => zk(...z) === k);
    if (i >= 0) markiert.splice(i, 1);
    else markiert.push([r, c]);
    zeichne();
    geaendertMeldung();
  }
  function aenderKlick(r) {
    if (gesperrt || phase !== 'auftrag' || !istAenderbar(r)) return;
    if (geaendert.has(r)) geaendert.delete(r);
    else geaendert.add(r);
    hinweisAuftrag.textContent = '';
    zeichne();
    geaendertMeldung();
  }

  function zeichne() {
    const fokus = document.activeElement && tabelle.contains(document.activeElement) ? document.activeElement : null;
    const fokusZelle = fokus && fokus.classList.contains('zelle-knopf') ? zk(fokus.dataset.r, fokus.dataset.c) : null;
    const fokusLoeschen = fokus && fokus.dataset.loeschen !== undefined ? fokus.dataset.loeschen : null;
    const daten = kopie();
    const bef = ausgefuehrt() ? befund() : null;
    const markSet = new Set(markiert.map((z) => zk(...z)));
    tbody.replaceChildren();
    const zeilen = daten.map((z, r) => ({ z, r }));
    if (eingefuegt) zeilen.push({ z: neueWerte, r: neuIndex, neu: true });
    for (const { z, r, neu: istNeu } of zeilen) {
      const tr = el('tr');
      const weg = geloescht.has(r);
      if (weg) tr.classList.add('geloescht');
      if (istNeu) tr.classList.add('neu');
      z.forEach((wert, c) => {
        const td = el('td', typeof wert === 'number' ? 'zahl' : null);
        const k = zk(r, c);
        const istGeaendert = c === spalte && geaendert.has(r);
        if (istGeaendert) td.classList.add('geaendert');
        if (bef && bef.zellen.has(k)) td.classList.add(op === 'aendern' ? 'widerspruch' : op === 'loeschen' ? 'verlust' : 'leer-feld');
        if (loesungAnzeige) {
          td.classList.toggle('loesung', loesungAnzeige.zellen.has(k));
          td.classList.toggle('falsch', markSet.has(k) && !loesungAnzeige.zellen.has(k));
        }
        const inhalt = el('span', 'zelle-inhalt');
        inhalt.appendChild(zellInhalt(wert));
        if (istGeaendert) inhalt.appendChild(el('span', 'zelle-vorher', `vorher ${zellText(sim.alt)}`));
        const zustand = [];
        if (istGeaendert) zustand.push('geändert');
        if (weg) zustand.push('Zeile gelöscht');
        if (istNeu) zustand.push('neue Zeile');
        if (bef && bef.zellen.has(k)) zustand.push(op === 'aendern' ? 'Widerspruch' : op === 'loeschen' ? 'nirgends mehr gespeichert' : 'leer');
        const label = `${name(c)}, Zeile ${r + 1}: ${zellText(wert)}${zustand.length ? ' (' + zustand.join(', ') + ')' : ''}`;
        let aktiv = false;
        let aktion = null;
        if (phase === 'bestimmen') {
          aktiv = true;
          aktion = () => markierKlick(r, c);
        } else if (op === 'aendern' && c === spalte && istAenderbar(r)) {
          aktiv = true;
          aktion = () => aenderKlick(r);
        }
        if (aktiv) {
          const b = zellKnopf(r, c);
          b.classList.add(phase === 'bestimmen' ? 'markieren' : 'aendern');
          b.appendChild(inhalt);
          if (phase === 'bestimmen') {
            b.setAttribute('aria-pressed', markSet.has(k) ? 'true' : 'false');
            b.setAttribute('aria-label', `Markieren: ${label}`);
          } else {
            b.setAttribute('aria-pressed', istGeaendert ? 'true' : 'false');
            b.setAttribute('aria-label', `Auf ${zellText(sim.neu)} ändern: ${label}`);
          }
          b.disabled = gesperrt;
          b.addEventListener('click', aktion);
          td.classList.add('zelle-wahl');
          if (phase === 'bestimmen' && markSet.has(k)) td.classList.add('gewaehlt');
          td.appendChild(b);
        } else {
          td.appendChild(inhalt);
          if (zustand.length) td.appendChild(el('span', 'nur-sr', ` (${zustand.join(', ')})`));
        }
        tr.appendChild(td);
      });
      if (op === 'loeschen') {
        const td = el('td', 'aktion-spalte');
        if (phase === 'auftrag' && loeschbar.has(r) && !istNeu) {
          const b = el('button', 'knopf leise klein-knopf', weg ? 'Wiederherstellen' : 'Zeile löschen');
          b.type = 'button';
          b.dataset.loeschen = String(r);
          b.setAttribute('aria-label', `${weg ? 'Wiederherstellen' : 'Löschen'}: Zeile ${r + 1}`);
          b.disabled = gesperrt;
          b.addEventListener('click', () => {
            if (gesperrt) return;
            if (geloescht.has(r)) geloescht.delete(r);
            else geloescht.add(r);
            hinweisAuftrag.textContent = '';
            zeichne();
            geaendertMeldung();
          });
          td.appendChild(b);
        } else if (weg) td.appendChild(el('span', 'sim-etikett', 'gelöscht'));
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    raster.tabStopp();
    if (fokusZelle) {
      const [fr, fc] = fokusZelle.split(',');
      const b = tabelle.querySelector(`button.zelle-knopf[data-r="${fr}"][data-c="${fc}"]`);
      if (b) b.focus();
    } else if (fokusLoeschen !== null) {
      const b = tabelle.querySelector(`button[data-loeschen="${fokusLoeschen}"]`);
      if (b) b.focus();
    }

    // Befund (nur aus den sichtbaren Daten)
    befundBox.replaceChildren();
    if (bef) {
      befundBox.appendChild(el('p', 'etikett', 'Das zeigt die Tabelle jetzt'));
      for (const s of bef.saetze) befundBox.appendChild(el('p', null, s));
    }
    befundBox.hidden = !bef;
    anlegen.hidden = op !== 'einfuegen' || eingefuegt;
    anlegen.disabled = gesperrt;
    fertig.disabled = gesperrt;
    neuKnoepfe.forEach((b) => (b.hidden = gesperrt));
    zurueck.disabled = gesperrt;
    auftragBox.hidden = phase !== 'auftrag' || gesperrt;
    bestimmen.hidden = phase !== 'bestimmen';
    for (const [id, b] of artKnoepfe) {
      b.setAttribute('aria-pressed', art === id ? 'true' : 'false');
      b.disabled = gesperrt;
      b.classList.toggle('loesung', !!loesungAnzeige && loesungAnzeige.art === id);
      b.classList.toggle('falsch', !!loesungAnzeige && art === id && loesungAnzeige.art !== id);
    }
    zurueck.hidden = gesperrt;
    const n = markiert.length;
    markInfo.textContent = `Markiert: ${n === 0 ? 'keine Zelle' : n === 1 ? 'eine Zelle' : n + ' Zellen'}.`;
    rueckBox.replaceChildren();
    if (rueck) {
      const zeile = (ok, text) => {
        const li = el('li', ok ? 'ok' : 'falsch');
        li.append(el('span', 'kriterium-marke', ok ? '✔' : '✘'), el('span', null, text));
        return li;
      };
      if (rueck.art) rueckBox.appendChild(zeile(rueck.art === 'ok', rueck.art === 'ok' ? 'Anomalieart stimmt.' : 'Anomalieart stimmt noch nicht.'));
      if (rueck.zellen) rueckBox.appendChild(zeile(rueck.zellen === 'ok', rueck.zellen === 'ok' ? 'Markierte Zellen stimmen.' : 'Die markierten Zellen stimmen noch nicht.'));
    }
    rueckBox.hidden = !rueck;
  }
  zeichne();

  return {
    kind: 'anomalie',
    ui,
    /** Die Rohtabelle steht im Simulator (als Kopie) – der Block selbst wäre doppelt. */
    anbinden(inhaltEl) {
      const blockEl = inhaltEl.querySelector(`:scope > [data-block="${ia.block}"]`);
      if (blockEl && block) blockEl.hidden = true;
    },
    antwort: () => ({ art, zellen: markiert.map((z) => [z[0], z[1]]) }),
    leer: () => art === '' && markiert.length === 0,
    setze(a) {
      if (!a || typeof a !== 'object') return;
      const zellen = zellenAus(a);
      if (op === 'einfuegen' && zellen.some((z) => z[0] === neuIndex)) eingefuegt = true;
      art = ARTEN.some((x) => x.id === a.art) ? a.art : '';
      markiert = zellen.filter(gueltig);
      if ((art || markiert.length) && phase !== 'bestimmen') {
        if (op === 'einfuegen') eingefuegt = true;
        phase = 'bestimmen';
      }
      speichern();
      zeichne();
    },
    feedback(r) {
      rueck = r && (r.art || r.zellen) ? { art: r.art, zellen: r.zellen } : null;
      zeichne();
    },
    loesung(lo) {
      if (!lo || typeof lo !== 'object') return;
      const soll = zellenAus(lo);
      if (op === 'einfuegen' && soll.some((z) => z[0] === neuIndex)) eingefuegt = true;
      phase = 'bestimmen';
      rueck = null;
      loesungAnzeige = { art: lo.art, zellen: new Set(soll.map((z) => zk(...z))) };
      const t = ARTEN.find((x) => x.id === lo.art);
      loesungBox.replaceChildren(el('p', 'etikett', 'Lösung'), el('p', null, `${t ? t.text : '–'}; die betroffenen Zellen sind grün hinterlegt.`));
      zeichne();
    },
    sperren(an) {
      gesperrt = an;
      zeichne();
    }
  };
}

/* ================= zerlegen ================= */

/** Live-Vorschau-Relationen: PK = Schlüssel; ↑ für Spalten, die zusammen den Schlüssel einer anderen Tabelle bilden. */
export function vorschauRelationen(tabellen) {
  return tabellen
    .map((t, i) => ({ t, i }))
    .filter(({ t }) => t.attribute.length)
    .map(({ t, i }) => {
      const fk = new Set();
      tabellen.forEach((u, j) => {
        if (j === i || !u.schluessel.length) return;
        if (u.schluessel.every((s) => t.attribute.includes(s)) && !(u.schluessel.length === t.schluessel.length && u.schluessel.every((s) => t.schluessel.includes(s)))) {
          u.schluessel.forEach((s) => fk.add(s));
        }
      });
      return { name: `Tabelle ${i + 1}`, attribute: t.attribute.map((a) => ({ name: a, pk: t.schluessel.includes(a), fk: fk.has(a) })) };
    });
}

/** Zerlegungs-Puzzle: Spaltenchips auf Tabellen verteilen (Ziehen oder Auswahlmenü), Schlüssel setzen. */
export function teilZerlegen(ia, kontext, nr) {
  const attribute = Array.isArray(ia.attribute) ? ia.attribute.filter((a) => typeof a === 'string') : [];
  const max = Number.isInteger(ia.tabellenMax) && ia.tabellenMax > 0 ? ia.tabellenMax : 30;
  const schluessel = entwurfSchluessel(kontext, 'zerlegen', nr);
  let tabellen = [];
  let ziel = 0; // Tabelle, in die ein angetippter Chip wandert
  let gesperrt = false;
  let rueck = null;
  let loesungDa = false;

  function bereinige(roh) {
    const liste = Array.isArray(roh) ? roh : roh && Array.isArray(roh.tabellen) ? roh.tabellen : null;
    if (!liste) return null;
    const out = liste.slice(0, max).map((t) => {
      const attr = (t && Array.isArray(t.attribute) ? t.attribute : []).filter((a, i, l) => attribute.includes(a) && l.indexOf(a) === i);
      const pk = (t && Array.isArray(t.schluessel) ? t.schluessel : []).filter((a, i, l) => attr.includes(a) && l.indexOf(a) === i);
      return { attribute: attr, schluessel: pk };
    });
    return out.length ? out : null;
  }
  tabellen = bereinige(liesEntwurf(schluessel)) || Array.from({ length: Math.min(2, max) }, () => ({ attribute: [], schluessel: [] }));
  ziel = Math.min(ziel, tabellen.length - 1);

  const geaendert = () => {
    rueck = null;
    schreibEntwurf(schluessel, { tabellen });
    zeichne();
    kontext.geaendert();
  };
  function hinzu(i, spalte) {
    const t = tabellen[i];
    if (gesperrt || !t || t.attribute.includes(spalte)) return false;
    t.attribute.push(spalte);
    // Reihenfolge wie in der Rohtabelle
    t.attribute.sort((a, b) => attribute.indexOf(a) - attribute.indexOf(b));
    return true;
  }
  function entferne(i, spalte) {
    const t = tabellen[i];
    if (gesperrt || !t) return;
    t.attribute = t.attribute.filter((a) => a !== spalte);
    t.schluessel = t.schluessel.filter((a) => a !== spalte);
  }

  /* ---------- Oberfläche ---------- */
  const pool = el('ul', 'spalten-pool');
  pool.setAttribute('aria-label', 'Spalten der Rohtabelle');
  const poolHinweis = el('p', 'teil-hinweis', 'Ziehe eine Spalte auf eine Tabelle – oder tippe sie an, dann landet sie in der gewählten Tabelle. Eine Spalte darf in mehreren Tabellen stehen (Fremdschlüssel).');
  const tabBox = el('div', 'zerlegen-tabellen');
  const plus = knopf('Tabelle hinzufügen', 'knopf', 'i-plus');
  plus.addEventListener('click', () => {
    if (gesperrt || tabellen.length >= max) return;
    tabellen.push({ attribute: [], schluessel: [] });
    ziel = tabellen.length - 1;
    geaendert();
    const sel = tabBox.querySelectorAll('select.zerlegen-hinzu')[ziel];
    if (sel) sel.focus();
  });
  const maxInfo = el('p', 'teil-hinweis');
  const vorschau = el('div', 'schema-block zerlegen-vorschau');
  vorschau.setAttribute('role', 'group');
  vorschau.setAttribute('aria-label', 'Vorschau in Kurzschreibweise');
  const gesamt = el('div', 'zerlegen-gesamt');
  gesamt.setAttribute('aria-live', 'polite');
  const loesungBox = el('div', 'zerlegen-loesung');
  const ui = h(
    'div',
    'teil-zerlegen',
    el('p', 'etikett', 'Spalten der Rohtabelle'),
    poolHinweis,
    pool,
    tabBox,
    h('div', 'knopf-reihe', plus, maxInfo),
    el('p', 'etikett', 'Vorschau (Kurzschreibweise, Schlüssel unterstrichen)'),
    vorschau,
    gesamt,
    loesungBox
  );

  /* ---------- Ziehen (Pointer Events) ---------- */
  let unterdrueckeKlick = false;
  function zielUnter(x, y) {
    const e = document.elementFromPoint(x, y);
    if (!e) return null;
    const karte = e.closest('.zerlegen-tabelle');
    if (karte && tabBox.contains(karte)) return { tabelle: Number(karte.dataset.nr) };
    if (e.closest('.spalten-pool') === pool) return { pool: true };
    return null;
  }
  function markiereZiel(z) {
    tabBox.querySelectorAll('.zerlegen-tabelle').forEach((k) => k.classList.toggle('ziel-hover', !!z && z.tabelle === Number(k.dataset.nr)));
    pool.classList.toggle('ziel-hover', !!z && !!z.pool);
  }
  function ziehbar(knopfEl, spalte, herkunft) {
    knopfEl.addEventListener('pointerdown', (e) => {
      if (gesperrt || (e.pointerType === 'mouse' && e.button !== 0)) return;
      const start = { x: e.clientX, y: e.clientY };
      let geist = null;
      const id = e.pointerId;
      try {
        knopfEl.setPointerCapture(id);
      } catch {
        /* nicht unterstützt */
      }
      const bewege = (ev) => {
        if (ev.pointerId !== id) return;
        if (!geist && Math.hypot(ev.clientX - start.x, ev.clientY - start.y) > 6) {
          geist = el('div', 'zieh-geist', spalte);
          geist.setAttribute('aria-hidden', 'true');
          document.body.appendChild(geist);
          document.body.classList.add('zieht');
        }
        if (!geist) return;
        ev.preventDefault();
        geist.style.setProperty('--x', ev.clientX + 'px');
        geist.style.setProperty('--y', ev.clientY + 'px');
        markiereZiel(zielUnter(ev.clientX, ev.clientY));
      };
      const ende = (ev) => {
        if (ev.pointerId !== id) return;
        knopfEl.removeEventListener('pointermove', bewege);
        knopfEl.removeEventListener('pointerup', ende);
        knopfEl.removeEventListener('pointercancel', ende);
        if (!geist) return;
        geist.remove();
        document.body.classList.remove('zieht');
        markiereZiel(null);
        unterdrueckeKlick = true;
        setTimeout(() => (unterdrueckeKlick = false), 0);
        if (ev.type === 'pointercancel') return;
        const z = zielUnter(ev.clientX, ev.clientY);
        if (z && Number.isInteger(z.tabelle)) {
          if (herkunft !== null && herkunft !== z.tabelle) entferne(herkunft, spalte);
          hinzu(z.tabelle, spalte);
          ziel = z.tabelle;
          geaendert();
        } else if (z && z.pool && herkunft !== null) {
          entferne(herkunft, spalte);
          geaendert();
        }
      };
      knopfEl.addEventListener('pointermove', bewege);
      knopfEl.addEventListener('pointerup', ende);
      knopfEl.addEventListener('pointercancel', ende);
    });
  }

  function hinweisListe(hinweise) {
    const ul = el('ul', 'zerlegen-hinweise');
    for (const x of hinweise) ul.appendChild(el('li', null, x.text || x.code || ''));
    return ul;
  }

  function zeichne() {
    const fokus = document.activeElement && ui.contains(document.activeElement) ? document.activeElement.dataset.fokus : null;
    // Chips
    pool.replaceChildren();
    for (const a of attribute) {
      const anzahl = tabellen.filter((t) => t.attribute.includes(a)).length;
      const b = el('button', 'spalten-chip' + (anzahl ? '' : ' offen'));
      b.type = 'button';
      b.dataset.fokus = `chip:${a}`;
      b.append(el('span', 'chip-name', a), el('span', 'chip-zahl', anzahl ? `${anzahl}×` : 'offen'));
      b.setAttribute('aria-label', `${a} in Tabelle ${ziel + 1} legen (${anzahl ? `steht in ${anzahl === 1 ? 'einer Tabelle' : anzahl + ' Tabellen'}` : 'noch nicht verteilt'})`);
      b.disabled = gesperrt;
      b.addEventListener('click', () => {
        if (unterdrueckeKlick || gesperrt) return;
        if (hinzu(ziel, a)) geaendert();
      });
      ziehbar(b, a, null);
      pool.appendChild(h('li', null, b));
    }
    // Tabellen
    tabBox.replaceChildren();
    tabellen.forEach((t, i) => {
      const karte = el('section', 'zerlegen-tabelle' + (i === ziel ? ' ziel' : ''));
      karte.dataset.nr = String(i);
      karte.setAttribute('aria-label', `Tabelle ${i + 1}`);
      const rm = rueck && Array.isArray(rueck.tabellen) ? rueck.tabellen[i] : null;
      if (rm && t.attribute.length) karte.classList.add(rm.ok ? 'ok' : 'falsch');
      const titel = el('button', 'zerlegen-titel', `Tabelle ${i + 1}`);
      titel.type = 'button';
      titel.dataset.fokus = `titel:${i}`;
      titel.setAttribute('aria-pressed', i === ziel ? 'true' : 'false');
      titel.setAttribute('aria-label', `Tabelle ${i + 1} als Ziel für angetippte Spalten wählen`);
      titel.disabled = gesperrt;
      titel.addEventListener('click', () => {
        ziel = i;
        zeichne();
      });
      const weg = el('button', 'knopf-icon klein', '✕');
      weg.type = 'button';
      weg.dataset.fokus = `weg:${i}`;
      weg.setAttribute('aria-label', `Tabelle ${i + 1} entfernen`);
      weg.title = 'Tabelle entfernen';
      weg.disabled = gesperrt || tabellen.length <= 1;
      weg.addEventListener('click', () => {
        if (gesperrt || tabellen.length <= 1) return;
        tabellen.splice(i, 1);
        ziel = Math.min(ziel, tabellen.length - 1);
        geaendert();
      });
      const kopfZeile = h('div', 'zerlegen-kopf', titel);
      if (rm && t.attribute.length) kopfZeile.appendChild(el('span', 'kriterium-marke', rm.ok ? '✔' : '✘'));
      kopfZeile.appendChild(weg);
      karte.appendChild(kopfZeile);

      const liste = el('ul', 'zerlegen-spalten');
      if (!t.attribute.length) liste.appendChild(el('li', 'teil-hinweis leer-zeile', 'Noch leer – Spalten hierher ziehen oder unten wählen.'));
      for (const a of t.attribute) {
        const pk = t.schluessel.includes(a);
        const li = el('li', 'zerlegen-spalte' + (pk ? ' schluessel' : ''));
        const schalter = el('button', 'schluessel-schalter', 'Schlüssel');
        schalter.type = 'button';
        schalter.dataset.fokus = `pk:${i}:${a}`;
        schalter.setAttribute('aria-pressed', pk ? 'true' : 'false');
        schalter.setAttribute('aria-label', `${a} gehört zum Schlüssel von Tabelle ${i + 1}`);
        schalter.disabled = gesperrt;
        schalter.addEventListener('click', () => {
          if (gesperrt) return;
          t.schluessel = pk ? t.schluessel.filter((x) => x !== a) : [...t.schluessel, a].sort((x, y) => attribute.indexOf(x) - attribute.indexOf(y));
          geaendert();
        });
        const nameEl = el('span', 'spalte-name' + (pk ? ' pk' : ''), a);
        ziehbar(nameEl, a, i);
        nameEl.title = 'Ziehen, um die Spalte in eine andere Tabelle zu verschieben';
        const raus = el('button', 'knopf-icon klein', '✕');
        raus.type = 'button';
        raus.dataset.fokus = `raus:${i}:${a}`;
        raus.setAttribute('aria-label', `${a} aus Tabelle ${i + 1} entfernen`);
        raus.title = 'Spalte entfernen';
        raus.disabled = gesperrt;
        raus.addEventListener('click', () => {
          entferne(i, a);
          geaendert();
        });
        li.append(schalter, nameEl, raus);
        liste.appendChild(li);
      }
      karte.appendChild(liste);

      const frei = attribute.filter((a) => !t.attribute.includes(a));
      const sel = el('select', 'zerlegen-hinzu');
      sel.dataset.fokus = `sel:${i}`;
      sel.setAttribute('aria-label', `Spalte zu Tabelle ${i + 1} hinzufügen`);
      const leer = el('option', null, frei.length ? 'Spalte hinzufügen …' : 'Alle Spalten stehen hier');
      leer.value = '';
      sel.appendChild(leer);
      for (const a of frei) {
        const o = el('option', null, a);
        o.value = a;
        sel.appendChild(o);
      }
      sel.disabled = gesperrt || !frei.length;
      sel.addEventListener('change', () => {
        if (!sel.value) return;
        hinzu(i, sel.value);
        ziel = i;
        geaendert();
        const neu = tabBox.querySelector(`select[data-fokus="sel:${i}"]`);
        if (neu) neu.focus();
      });
      karte.appendChild(sel);
      if (rm && t.attribute.length && Array.isArray(rm.hinweise) && rm.hinweise.length) karte.appendChild(hinweisListe(rm.hinweise));
      tabBox.appendChild(karte);
    });
    plus.disabled = gesperrt || tabellen.length >= max;
    plus.hidden = gesperrt;
    maxInfo.textContent = tabellen.length >= max ? `Höchstens ${max} Tabellen.` : '';

    // Vorschau
    vorschau.replaceChildren();
    const rel = vorschauRelationen(tabellen);
    if (!rel.length) vorschau.appendChild(el('p', 'teil-hinweis', 'Noch keine Spalte verteilt.'));
    for (const r of rel) vorschau.appendChild(R.relation(r));

    // Gesamt-Rückmeldung
    gesamt.replaceChildren();
    if (rueck) {
      const ul = el('ul', 'kriterien-liste');
      const zeile = (ok, text) => {
        const li = el('li', ok ? 'ok' : 'falsch');
        li.append(el('span', 'kriterium-marke', ok ? '✔' : '✘'), el('span', null, text));
        ul.appendChild(li);
      };
      zeile(!!rueck.vollstaendig, rueck.vollstaendig ? 'Alle Spalten sind verteilt.' : 'Noch nicht alle Spalten sind verteilt.');
      zeile(!!rueck.verlustfrei, rueck.verlustfrei ? 'Verlustfrei: Der Verbund ergibt wieder die Rohtabelle.' : 'Nicht verlustfrei: Der Verbund ergibt nicht wieder die Rohtabelle.');
      zeile(!!rueck.redundanzfrei, rueck.redundanzfrei ? 'Redundanzfrei.' : 'Noch nicht redundanzfrei.');
      gesamt.appendChild(ul);
      if (Array.isArray(rueck.hinweise) && rueck.hinweise.length) gesamt.appendChild(hinweisListe(rueck.hinweise));
    }
    gesamt.hidden = !rueck;
    poolHinweis.hidden = gesperrt;

    if (fokus) {
      const b = ui.querySelector(`[data-fokus="${CSS.escape(fokus)}"]`);
      if (b && !b.disabled) b.focus();
    }
  }
  zeichne();

  return {
    kind: 'zerlegen',
    ui,
    antwort: () => ({ tabellen: tabellen.map((t) => ({ attribute: [...t.attribute], schluessel: [...t.schluessel] })) }),
    leer: () => !tabellen.some((t) => t.attribute.length),
    setze(a) {
      const t = bereinige(a);
      if (!t) return;
      tabellen = t;
      ziel = Math.min(ziel, tabellen.length - 1);
      schreibEntwurf(schluessel, { tabellen });
      zeichne();
    },
    feedback(r) {
      rueck = r && typeof r === 'object' && ('verlustfrei' in r || Array.isArray(r.tabellen)) ? r : null;
      zeichne();
    },
    loesung(lo) {
      if (!lo || typeof lo !== 'object' || loesungDa) return;
      loesungDa = true;
      const teile = [el('p', 'etikett', 'Lösung')];
      const muster = Array.isArray(lo.muster) && lo.muster[0] && Array.isArray(lo.muster[0].tabellen) ? lo.muster[0].tabellen : null;
      if (muster) {
        const box = el('div', 'schema-block');
        vorschauRelationen(muster.map((t) => ({ attribute: [...(t.attribute || [])], schluessel: [...(t.schluessel || [])] }))).forEach((r) => box.appendChild(R.relation(r)));
        teile.push(el('p', 'teil-hinweis', 'Eine mögliche Zerlegung (jede verlust- und redundanzfreie Zerlegung zählt):'), box);
      }
      if (Array.isArray(lo.fa) && lo.fa.length) {
        const ul = el('ul', 'zerlegen-fa');
        for (const f of lo.fa) ul.appendChild(el('li', null, `${(f.links || []).join(', ')} → ${(f.rechts || []).join(', ')}`));
        teile.push(el('p', 'teil-hinweis', 'Funktionale Abhängigkeiten:'), ul);
      }
      loesungBox.replaceChildren(...teile);
    },
    sperren(an) {
      gesperrt = an;
      zeichne();
    }
  };
}
