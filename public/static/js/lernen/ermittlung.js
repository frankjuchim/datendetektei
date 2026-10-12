// Ermittlung (/ermittlung/:id, DESIGN.md §5.3, Spec §7.7): Briefing und Intro, Aufgabenliste mit Status, Aufgabenkarte
// mit Konsole (sql) bzw. Interaktionskarte, Tipps, „Lösung zeigen“ mit Bestätigung in der Seite, Feedback-Karte mit
// Diagnose und Fallen-Plakette, Weiter-Navigation, Cold Case. Geprüft wird nur auf dem Server; Lösung und Erklärung
// kommen erst nach dem Lösen bzw. Aufdecken.

const V = new URL(import.meta.url).search;
const [A, R, I, K] = await Promise.all([
  import('../kern/api.js' + V),
  import('../kern/render.js' + V),
  import('../kern/interaktionen.js' + V),
  import('./konsole_lern.js' + V)
]);
const { el, h, knopf } = R;

const seite = document.getElementById('seite');
const ermittlungId = (/^\/ermittlung\/(A\d{1,2}-E\d{1,2})$/.exec(window.location.pathname) || [])[1];
const ERLEDIGT = new Set(['geloest', 'nachgeloest', 'bearbeitet']);
const STATUS_TEXT = { offen: 'offen', geloest: 'gelöst', nachgeloest: 'nachgelöst', angesehen: 'Lösung angesehen', bearbeitet: 'bearbeitet' };

let kontext = null;
let kurs = null;
let daten = null; // Antwort von GET …/ermittlungen/:id
let aktuell = null; // { id, antwort (GET …/aufgaben/:id), aufgabe (erzeugeAufgabe), konsole, … }

const nrVon = (id) => (id.endsWith('-CC') ? 'CC' : id.slice(-2));

/* ---------- Kopf, Aufgabenliste, Briefing ---------- */

function kachel(a, istCc) {
  const link = el('a', 'kachel' + (istCc ? ' cc' : ''), istCc ? 'CC' : nrVon(a.id));
  link.href = `/ermittlung/${ermittlungId}?aufgabe=${encodeURIComponent(a.id)}`;
  link.dataset.aufgabe = a.id;
  link.dataset.status = a.status;
  if (ERLEDIGT.has(a.status)) link.classList.add('erledigt');
  if (a.status === 'angesehen') link.classList.add('angesehen');
  link.setAttribute('aria-label', `${istCc ? 'Cold Case' : 'Aufgabe ' + Number(nrVon(a.id))}: ${a.titel} – ${STATUS_TEXT[a.status] || a.status}`);
  link.title = a.titel;
  link.addEventListener('click', (e) => {
    e.preventDefault();
    oeffneAufgabe(a.id, true);
  });
  return h('li', null, link);
}

function zeichneKacheln() {
  const liste = document.getElementById('aufgaben-kacheln');
  if (!liste) return;
  liste.replaceChildren();
  const e = daten.ermittlung;
  for (const a of e.aufgaben) liste.appendChild(kachel(a, false));
  if (e.coldCase) liste.appendChild(kachel(e.coldCase, true));
  markiereAktuelle();
}

function markiereAktuelle() {
  document.querySelectorAll('#aufgaben-kacheln .kachel').forEach((k) => {
    if (aktuell && k.dataset.aufgabe === aktuell.id) k.setAttribute('aria-current', 'step');
    else k.removeAttribute('aria-current');
  });
}

function zeichneKopf() {
  const e = daten.ermittlung;
  const kopf = el('header', 'ermittlung-kopf');
  const pfad = el('p', 'etikett pfad');
  const akteLink = el('a', 'etikett-link', `Akte ${daten.akte.nr} · ${daten.akte.titel}`);
  akteLink.href = `/akte/${daten.akte.nr}`;
  pfad.append(akteLink, document.createTextNode(` › Ermittlung ${e.nr || ''}`));
  const titel = h('div', 'seiten-kopf', pfad, el('h1', null, e.titel));
  const stand = el('p', 'ermittlung-stand zahlen', `${e.geloest} von ${e.anzahl} erledigt · ${e.punkte} von ${e.maxPunkte} Punkten`);
  stand.id = 'ermittlung-stand';
  titel.appendChild(stand);
  const liste = el('ol', 'kacheln');
  liste.id = 'aufgaben-kacheln';
  liste.setAttribute('aria-label', 'Aufgaben dieser Ermittlung');
  kopf.append(titel, liste);
  return kopf;
}

function zeichneBriefing() {
  const e = daten.ermittlung;
  const box = el('details', 'briefing-box');
  box.open = e.geloest === 0;
  const summary = el('summary');
  summary.append(R.icon('i-notiz'), document.createTextNode('Briefing und Ermittler-Notizen'));
  box.appendChild(summary);
  const innen = el('div', 'briefing-innen');
  if (e.briefing) {
    const zitat = el('blockquote', 'briefing');
    zitat.appendChild(R.md(e.briefing));
    zitat.appendChild(el('cite', null, '– Edda Lorenz'));
    innen.appendChild(zitat);
  }
  if (Array.isArray(e.intro) && e.intro.length) innen.appendChild(R.bloecke(e.intro));
  const fuss = el('p', 'hinweis-klein');
  if (e.ab) fuss.appendChild(document.createTextNode(`Arbeitsblatt: ${e.ab}`));
  if (Array.isArray(e.ds) && e.ds.length) fuss.appendChild(document.createTextNode(`${e.ab ? ' · ' : ''}Doppelstunde ${e.ds.join(', ')}`));
  if (fuss.childNodes.length) innen.appendChild(fuss);
  box.appendChild(innen);
  return box;
}

/* ---------- Aufgabe ---------- */

function aufgabenRaster(mitKonsole) {
  const raster = el('div', 'ermittlung-raster' + (mitKonsole ? ' mit-konsole' : ' ohne-konsole'));
  raster.id = 'aufgabe-raster';
  return raster;
}

function punkteText(z, a) {
  if (aktuell.antwort.coldCase) return 'Cold Case · ohne Punkte';
  if (z.status === 'offen') {
    if (z.moeglich < a.punkte) return `${a.punkte} Punkte · jetzt noch ${z.moeglich}`;
    return `${a.punkte} Punkte`;
  }
  return `${z.punkte} von ${a.punkte} Punkten`;
}

function statusStempel(status, auftritt = false) {
  if (status === 'geloest' || status === 'nachgeloest') return R.stempel('Gelöst', 'geloest', { auftritt });
  if (status === 'angesehen') return R.stempel('Angesehen', 'angesehen', { auftritt });
  if (status === 'bearbeitet') return R.stempel('Bearbeitet', 'geloest', { auftritt });
  return null;
}

function zeichneMeta() {
  const a = aktuell.antwort.aufgabe;
  const z = aktuell.antwort.zustand;
  const meta = aktuell.meta;
  meta.replaceChildren(R.sterne(a.stufe), el('span', 'punkte zahlen', punkteText(z, a)));
  if (aktuell.antwort.coldCase) meta.appendChild(R.stempel('Cold Case', 'kuer', { groesse: 'klein' }));
  const st = statusStempel(z.status, aktuell.frischGeloest);
  if (st) meta.appendChild(st);
}

function istNurKernpunkte(a) {
  return !Array.isArray(a.interaktion) && a.interaktion && a.interaktion.kind === 'kernpunkte';
}

function sqlTeilFabrik(antwort) {
  return (ia, kontextTeil, nr) => {
    const konsole = K.erzeugeLernKonsole({
      datenbank: ia.datenbank,
      dbTitel: R.DATENBANK_TITEL[ia.datenbank] || ia.datenbank,
      entwurf: `dd-entwurf:aufgabe:${antwort.aufgabe.id}:${nr}`,
      abimodus: ia.abimodus || 'hinweis',
      aktionen: { pruefen: () => pruefen(), tipp: () => tipp(), loesung: () => loesungFragen() },
      beiAenderung: () => kontextTeil.geaendert()
    });
    const hinweis = el('p', 'teil-hinweis', 'Schreib deine Abfrage in die Ermittlungskonsole.');
    return {
      kind: 'sql',
      konsole,
      ui: hinweis,
      antwort: () => konsole.wert(),
      leer: () => konsole.wert().trim() === '',
      setze: (s) => typeof s === 'string' && konsole.setzeWert(s),
      feedback(r) {
        if (r && Array.isArray(r.diagnose)) konsole.zeigeDiagnose(r.diagnose, Number.isInteger(r.zeilen) ? A.mehrzahl(r.zeilen, 'Zeile', 'Zeilen') : null);
      },
      loesung() {},
      sperren() {}
    };
  };
}

async function oeffneAufgabe(id, verlauf = false) {
  if (verlauf) {
    const url = new URL(window.location.href);
    url.searchParams.set('aufgabe', id);
    window.history.pushState({ aufgabe: id }, '', url.pathname + url.search);
  }
  const ziel = document.getElementById('aufgabe-bereich');
  ziel.setAttribute('aria-busy', 'true');
  let antwort;
  try {
    antwort = await A.holen(A.kursApi(kurs.id, `/aufgaben/${encodeURIComponent(id)}`));
  } catch (f) {
    ziel.replaceChildren(A.fehlerKarte(f, { text: 'Zur Ermittlung', href: `/ermittlung/${ermittlungId}` }));
    ziel.removeAttribute('aria-busy');
    return;
  }
  baueAufgabe(antwort);
  ziel.removeAttribute('aria-busy');
}

function baueAufgabe(antwort) {
  const a = antwort.aufgabe;
  aktuell = { id: a.id, antwort, frischGeloest: false };
  markiereAktuelle();
  document.title = `${a.titel} – Ermittlung ${daten.ermittlung.nr || ''} – Datendetektei`;

  const aufgabe = I.erzeugeAufgabe(a, {
    sqlTeil: sqlTeilFabrik(antwort),
    teilPruefen: (teil, teilAntwort) => teilPruefen(teil, teilAntwort),
    speicher: `dd-freitext:${kurs.id}:${a.id}`,
    onChange: () => leereMeldung()
  });
  aktuell.aufgabe = aufgabe;
  const sqlTeil = aufgabe.teile.find((t) => t.kind === 'sql');
  aktuell.konsole = sqlTeil ? sqlTeil.konsole : null;
  const nurKern = istNurKernpunkte(a);

  // Aufgabenkarte (Aktendeckel mit Reiter = Aufgaben-ID)
  const karte = el('article', 'aktendeckel aufgabe-karte');
  karte.id = 'aufgabe-karte';
  karte.appendChild(el('span', 'reiter', a.id));
  const innen = el('div', 'aktendeckel-innen');
  aktuell.meta = el('div', 'aufgabe-meta');
  innen.appendChild(aktuell.meta);
  const titel = el('h2', 'aufgabe-titel', a.titel);
  titel.id = 'aufgabe-titel';
  titel.tabIndex = -1;
  innen.appendChild(titel);
  innen.appendChild(aufgabe.el);
  karte.appendChild(innen);

  // Knopfleiste für Aufgaben ohne Konsole
  const leiste = el('div', 'knopf-reihe aufgabe-knoepfe');
  if (!aktuell.konsole) {
    if (nurKern) {
      const auf = knopf('Kernpunkte aufdecken', 'knopf gruen', 'i-auge');
      auf.id = 'k-aufdecken';
      auf.addEventListener('click', () => kernpunkteAufdecken());
      const speichern = knopf('Selbstkontrolle speichern', 'knopf gruen', 'i-pruefen');
      speichern.id = 'k-kernpunkte';
      speichern.hidden = true;
      speichern.addEventListener('click', () => kernpunkteSpeichern());
      leiste.append(auf, speichern);
      aktuell.knoepfe = { aufdecken: auf, kernpunkte: speichern };
    } else {
      const p = knopf('Prüfen', 'knopf gruen', 'i-pruefen');
      p.id = 'k-pruefen';
      p.addEventListener('click', () => pruefen());
      const t = knopf('Tipp', 'knopf', 'i-tipp');
      t.id = 'k-tipp';
      t.addEventListener('click', () => tipp());
      const l = knopf('Lösung', 'knopf leise', 'i-auge');
      l.id = 'k-loesung';
      l.addEventListener('click', () => loesungFragen());
      leiste.append(p, t, l);
      aktuell.knoepfe = { pruefen: p, tipp: t, loesung: l };
    }
    innen.appendChild(leiste);
  } else {
    const kn = aktuell.konsole.knoepfe;
    kn.pruefen.id = 'k-pruefen';
    kn.tipp.id = 'k-tipp';
    kn.loesung.id = 'k-loesung';
    aktuell.knoepfe = kn;
  }

  const rueck = el('div', 'rueckmeldung-bereich');
  rueck.id = 'rueckmeldung';
  aktuell.tippsBox = el('div', 'tipps');
  aktuell.meldung = el('p', 'meldung');
  aktuell.meldung.setAttribute('role', 'status');
  aktuell.bestaetigung = el('div', 'bestaetigung-platz');
  aktuell.feedback = el('div', 'feedback-platz');
  aktuell.feedback.setAttribute('aria-live', 'polite');
  rueck.append(aktuell.meldung, aktuell.bestaetigung, aktuell.tippsBox, aktuell.feedback);

  const raster = aufgabenRaster(!!aktuell.konsole);
  raster.appendChild(karte);
  if (aktuell.konsole) {
    const arbeit = el('div', 'arbeit');
    arbeit.appendChild(aktuell.konsole.el);
    raster.appendChild(arbeit);
  }
  raster.appendChild(rueck);
  document.getElementById('aufgabe-bereich').replaceChildren(raster);

  zeichneMeta();
  zeichneTipps();
  aktualisiereKnoepfe();
  const lo = antwort.loesung;
  if (lo) zeigeLoesung(lo, { neu: false });
  if (nurKern && antwort.zustand.haken !== null && antwort.zustand.haken !== undefined) aktuell.knoepfe.aufdecken.textContent = 'Kernpunkte erneut aufdecken';
}

function aktualisiereKnoepfe() {
  const z = aktuell.antwort.zustand;
  const kn = aktuell.knoepfe || {};
  if (kn.tipp) {
    kn.tipp.disabled = z.status !== 'offen' || z.tippsGenutzt >= z.tippsAnzahl;
    kn.tipp.title = z.tippsAnzahl === 0 ? 'Zu dieser Aufgabe gibt es keine Tipps.' : `${z.tippsGenutzt} von ${z.tippsAnzahl} Tipps genutzt`;
  }
  if (kn.loesung) kn.loesung.disabled = z.status !== 'offen';
  if (kn.pruefen && !aktuell.konsole) kn.pruefen.disabled = z.status !== 'offen';
}

function zeichneTipps() {
  const z = aktuell.antwort.zustand;
  const a = aktuell.antwort.aufgabe;
  aktuell.tippsBox.replaceChildren();
  (z.tipps || []).forEach((t, i) => {
    const box = el('div', 'feedback hinweis tipp');
    box.appendChild(R.icon('i-tipp'));
    const inhalt = el('div', 'feedback-inhalt');
    inhalt.appendChild(el('p', 'feedback-titel', `Tipp ${i + 1} von ${z.tippsAnzahl}`));
    inhalt.appendChild(R.md(t));
    if (z.status === 'offen' && i === z.tipps.length - 1 && !aktuell.antwort.coldCase) {
      inhalt.appendChild(el('p', 'feedback-zusatz zahlen', `Die Aufgabe bringt jetzt höchstens ${z.moeglich} von ${a.punkte} Punkten.`));
    }
    box.appendChild(inhalt);
    aktuell.tippsBox.appendChild(box);
  });
}

function leereMeldung() {
  if (aktuell && aktuell.meldung) aktuell.meldung.textContent = '';
}

function zeigeMeldung(text) {
  aktuell.meldung.textContent = text;
}

/** Stand der Ermittlung (Kacheln, Zähler) nach einer Wertung neu laden. */
async function aktualisiereErmittlung() {
  try {
    daten = await A.holen(A.kursApi(kurs.id, `/ermittlungen/${ermittlungId}`));
  } catch {
    return;
  }
  zeichneKacheln();
  const e = daten.ermittlung;
  const stand = document.getElementById('ermittlung-stand');
  if (stand) stand.textContent = `${e.geloest} von ${e.anzahl} erledigt · ${e.punkte} von ${e.maxPunkte} Punkten`;
}

function setzeBeschaeftigt(an) {
  const kn = aktuell.knoepfe || {};
  for (const k of [kn.pruefen, kn.aufdecken, kn.kernpunkte]) if (k) k.setAttribute('aria-busy', an ? 'true' : 'false');
  if (kn.pruefen) kn.pruefen.disabled = an || (!aktuell.konsole && aktuell.antwort.zustand.status !== 'offen');
}

/* ---------- Aktionen ---------- */

async function teilPruefen(teil, teilAntwort) {
  try {
    const r = await A.senden(A.kursApi(kurs.id, `/aufgaben/${encodeURIComponent(aktuell.id)}/pruefen`), { antwort: teilAntwort, teilweise: true, teil });
    aktuell.antwort.zustand = r.zustand;
    zeichneMeta();
    zeichneTipps();
    if (!r.ok) aktualisiereErmittlung();
    return r;
  } catch (f) {
    zeigeMeldung(f.message);
    return null;
  }
}

async function pruefen() {
  if (!aktuell) return;
  leereMeldung();
  const aufgabe = aktuell.aufgabe;
  if (aufgabe.stufeOffen()) {
    zeigeMeldung('Prüfe zuerst Teil a) – danach erscheint der Rest der Aufgabe.');
    return;
  }
  if (aufgabe.leer()) {
    zeigeMeldung('Bitte gib zuerst eine Antwort ein.');
    return;
  }
  setzeBeschaeftigt(true);
  let r;
  try {
    r = await A.senden(A.kursApi(kurs.id, `/aufgaben/${encodeURIComponent(aktuell.id)}/pruefen`), { antwort: aufgabe.antwort() });
  } catch (f) {
    setzeBeschaeftigt(false);
    zeigeMeldung(f.message);
    return;
  }
  setzeBeschaeftigt(false);
  aktuell.antwort.zustand = r.zustand;
  aufgabe.feedback(r.rueckmeldung);
  if (r.ok) {
    aktuell.frischGeloest = r.geloest;
    zeichneMeta();
    zeichneTipps();
    aktualisiereKnoepfe();
    zeigeRichtig(r);
    if (r.loesung) zeigeLoesung(r.loesung, { neu: true });
  } else {
    zeichneMeta();
    zeichneTipps();
    zeigeFalsch(r);
  }
  aktualisiereErmittlung();
}

function teilErgebnisText(r) {
  const rm = r.rueckmeldung || {};
  const teile = Array.isArray(rm.teile) ? rm.teile : [rm];
  const saetze = [];
  for (const t of teile) {
    if (!t) continue;
    if (t.felder) {
      const werte = Object.values(t.felder);
      saetze.push(`${werte.filter(Boolean).length} von ${werte.length} Lücken stimmen.`);
    }
    if (t.elemente) {
      const werte = Object.values(t.elemente);
      saetze.push(`${werte.filter(Boolean).length} von ${werte.length} Zuordnungen stimmen.`);
    }
    if (Number.isInteger(t.ersteFalschePosition)) saetze.push(`Ab Baustein ${t.ersteFalschePosition + 1} stimmt die Reihenfolge nicht.`);
    if (t.zeilenzahl === 'zu_viele') saetze.push('Deine Ergebnistabelle hat zu viele Zeilen.');
    if (t.zeilenzahl === 'zu_wenige') saetze.push('Deine Ergebnistabelle hat zu wenige Zeilen.');
    if (t.nurReihenfolge) saetze.push('Alle Zeilen stimmen, nur die Reihenfolge nicht. Prüf das ORDER BY.');
    if (Number.isInteger(t.zeilen) && Array.isArray(t.diagnose)) saetze.push(`Deine Abfrage liefert ${A.mehrzahl(t.zeilen, 'Zeile', 'Zeilen')}.`);
  }
  return saetze;
}

function diagnoseVon(r) {
  const rm = r.rueckmeldung || {};
  const teile = Array.isArray(rm.teile) ? rm.teile : [rm];
  return teile.flatMap((t) => (t && Array.isArray(t.diagnose) ? t.diagnose : []));
}

function zeigeFalsch(r) {
  const z = r.zustand;
  const a = aktuell.antwort.aufgabe;
  const karte = el('section', 'feedback falsch');
  karte.setAttribute('aria-labelledby', 'feedback-titel');
  const titel = el('h3', 'feedback-titel', 'Noch nicht');
  titel.id = 'feedback-titel';
  karte.appendChild(titel);
  const saetze = teilErgebnisText(r);
  if (!saetze.length) saetze.push('Deine Antwort stimmt noch nicht.');
  if (!aktuell.antwort.coldCase && z.status === 'offen') {
    saetze.push(`Fehlversuch ${z.fehlversuche}, die Aufgabe bringt jetzt noch ${z.moeglich} von ${a.punkte} Punkten.`);
  }
  karte.appendChild(el('p', null, saetze.join(' ')));
  const diag = diagnoseVon(r);
  if (diag.length) karte.appendChild(R.diagnoseListe(diag));
  aktuell.feedback.replaceChildren(karte);
}

function zeigeRichtig(r) {
  const z = r.zustand;
  const karte = el('section', 'feedback richtig');
  karte.id = 'feedback-richtig';
  const kopf = el('div', 'feedback-kopf');
  const text = el('div', 'feedback-inhalt');
  text.appendChild(el('h3', 'feedback-titel', 'Sauber ermittelt'));
  let zeile;
  if (aktuell.antwort.coldCase) zeile = 'Cold Case gelöst – ohne Punkte, aber mit Ruhm.';
  else if (r.geloest && r.punkteErhalten > 0) {
    const teile = [`+${r.punkteErhalten} Punkte`];
    if (z.fehlversuche) teile.push(A.mehrzahl(z.fehlversuche, 'Fehlversuch', 'Fehlversuche'));
    if (z.tippsGenutzt) teile.push(A.mehrzahl(z.tippsGenutzt, 'Tipp', 'Tipps'));
    zeile = teile.join(' · ');
  } else if (z.status === 'nachgeloest') zeile = 'Nachgelöst – Punkte gibt es nach „Lösung zeigen“ keine mehr.';
  else zeile = 'Richtig – diese Aufgabe hattest du schon gelöst.';
  text.appendChild(el('p', 'zahlen', zeile));
  kopf.append(text, R.stempel('Gelöst', 'geloest', { groesse: 'gross', auftritt: true }));
  karte.appendChild(kopf);
  if (Array.isArray(r.neueAbzeichen) && r.neueAbzeichen.length) {
    karte.appendChild(el('p', 'abzeichen-neu', `Neues Abzeichen: ${r.neueAbzeichen.map((x) => x.name).join(', ')}`));
  }
  karte.appendChild(weiterKnoepfe());
  aktuell.feedback.replaceChildren(karte);
}

/** Knöpfe „Nächste Aufgabe“ bzw. „Nächste Ermittlung“/„Zur Akte“ und Cold Case. */
function weiterKnoepfe() {
  const reihe = el('div', 'knopf-reihe weiter');
  const ort = aktuell.antwort.ort;
  const istCc = aktuell.antwort.coldCase;
  if (!istCc && ort.nachher) {
    const b = knopf('Nächste Aufgabe', 'knopf gruen', 'i-vor');
    b.id = 'k-weiter';
    b.addEventListener('click', () => oeffneAufgabe(ort.nachher, true));
    reihe.appendChild(b);
  } else {
    const offen = daten.ermittlung.aufgaben.find((x) => !ERLEDIGT.has(x.status) && x.id !== aktuell.id);
    if (offen) {
      const b = knopf('Zur nächsten offenen Aufgabe', 'knopf gruen', 'i-vor');
      b.id = 'k-weiter';
      b.addEventListener('click', () => oeffneAufgabe(offen.id, true));
      reihe.appendChild(b);
    } else if (daten.nachher) {
      const l = A.linkKnopf(`Weiter: ${daten.nachher.titel}`, `/ermittlung/${daten.nachher.id}`, 'knopf gruen');
      l.id = 'k-weiter';
      reihe.appendChild(l);
    }
    reihe.appendChild(A.linkKnopf(`Zur Akte ${daten.akte.nr}`, `/akte/${daten.akte.nr}`, 'knopf'));
    if (daten.ermittlung.coldCase && !istCc) {
      const cc = knopf('Cold Case ansehen', 'knopf leise');
      cc.addEventListener('click', () => oeffneAufgabe(daten.ermittlung.coldCase.id, true));
      reihe.appendChild(cc);
    }
  }
  return reihe;
}

async function tipp() {
  if (!aktuell) return;
  leereMeldung();
  try {
    const r = await A.senden(A.kursApi(kurs.id, `/aufgaben/${encodeURIComponent(aktuell.id)}/tipp`));
    aktuell.antwort.zustand = r.zustand;
    zeichneMeta();
    zeichneTipps();
    aktualisiereKnoepfe();
    const letzter = aktuell.tippsBox.lastElementChild;
    if (letzter) letzter.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  } catch (f) {
    zeigeMeldung(f.message);
  }
}

/** „Lösung zeigen?“ – Bestätigung in der Seite (DESIGN §4.11), nie per confirm(). */
function loesungFragen() {
  if (!aktuell || aktuell.antwort.zustand.status !== 'offen') return;
  const leiste = el('div', 'bestaetigung');
  leiste.setAttribute('role', 'alertdialog');
  leiste.setAttribute('aria-label', 'Lösung zeigen?');
  const text = aktuell.antwort.coldCase ? 'Lösung zeigen?' : 'Lösung zeigen? Die Aufgabe bringt dann keine Punkte mehr.';
  const ja = knopf('Lösung zeigen', 'knopf primaer', 'i-auge');
  ja.id = 'k-loesung-ja';
  const nein = knopf('Abbrechen', 'knopf leise');
  ja.addEventListener('click', async () => {
    aktuell.bestaetigung.replaceChildren();
    try {
      const r = await A.senden(A.kursApi(kurs.id, `/aufgaben/${encodeURIComponent(aktuell.id)}/loesung-zeigen`));
      aktuell.antwort.zustand = r.zustand;
      zeichneMeta();
      zeichneTipps();
      aktualisiereKnoepfe();
      zeigeLoesung(r.loesung, { neu: true });
      aktualisiereErmittlung();
    } catch (f) {
      zeigeMeldung(f.message);
    }
  });
  nein.addEventListener('click', () => {
    aktuell.bestaetigung.replaceChildren();
    if (aktuell.knoepfe.loesung) aktuell.knoepfe.loesung.focus();
  });
  leiste.append(el('p', null, text), h('div', 'knopf-reihe', ja, nein));
  aktuell.bestaetigung.replaceChildren(leiste);
  ja.focus();
}

/** Lösung, Erklärung und ggf. Kernpunkte anzeigen (nach Lösen oder Aufdecken). */
function zeigeLoesung(lo, { neu }) {
  const a = aktuell.antwort.aufgabe;
  const z = aktuell.antwort.zustand;
  const aufgabe = aktuell.aufgabe;
  if (!aktuell.konsole && !istNurKernpunkte(a)) {
    aufgabe.loesung(lo.loesung);
    aufgabe.sperren(true);
  }
  // Kernpunkte (mehrteilig: Liste je Teil, sonst eine Liste)
  if (lo.kernpunkte) {
    const kp = aufgabe.teile.filter((t) => t.kind === 'kernpunkte');
    if (Array.isArray(a.interaktion)) aufgabe.teile.forEach((t, i) => t.kind === 'kernpunkte' && Array.isArray(lo.kernpunkte[i]) && t.zeigeKernpunkte(lo.kernpunkte[i]));
    else if (kp[0]) kp[0].zeigeKernpunkte(lo.kernpunkte, z.haken);
  }
  const box = el('section', 'loesung-karte');
  box.id = 'loesung-karte';
  const kopf = el('div', 'feedback-kopf');
  const t = el('div', 'feedback-inhalt');
  t.appendChild(el('h3', 'feedback-titel', istNurKernpunkte(a) ? 'Kernpunkte' : 'Lösung und Erklärung'));
  if (z.status === 'angesehen') t.appendChild(el('p', 'leise', 'Du hast dir die Lösung angesehen – die Aufgabe bringt keine Punkte mehr, du kannst sie aber weiter üben.'));
  kopf.appendChild(t);
  if (z.status === 'angesehen' && neu) kopf.appendChild(R.stempel('Angesehen', 'angesehen', { groesse: 'gross', auftritt: true }));
  box.appendChild(kopf);
  const sqlTeile = (Array.isArray(lo.loesung) ? lo.loesung : [lo.loesung]).filter((x) => x && typeof x.sql === 'string');
  const norm = (t) => String(t).replace(/\s+/g, ' ').trim();
  const inErklaerung = new Set((Array.isArray(lo.erklaerung) ? lo.erklaerung : []).filter((b) => b && b.t === 'sql').map((b) => norm(b.sql)));
  for (const s of sqlTeile.filter((x) => !inErklaerung.has(norm(x.sql)))) {
    box.appendChild(el('p', 'etikett', 'Musterlösung'));
    box.appendChild(R.block({ t: 'sql', sql: s.sql }, null, 0));
  }
  if (istNurKernpunkte(a)) box.appendChild(el('p', 'hinweis-klein', 'Hake ab, welche Kernpunkte deine Antwort enthält, und speichere deine Selbstkontrolle. Gesendet wird nur die Anzahl der Häkchen.'));
  if (Array.isArray(lo.erklaerung) && lo.erklaerung.length) box.appendChild(R.bloecke(lo.erklaerung));
  if (Array.isArray(a.fallen) && a.fallen.length) {
    const f = el('p', 'fallen-zeile');
    f.appendChild(el('span', 'etikett', 'Fallen dieser Aufgabe'));
    for (const nr of a.fallen) f.appendChild(R.falle(nr));
    box.appendChild(f);
  }
  const alt = document.getElementById('loesung-karte');
  if (alt) alt.remove();
  aktuell.feedback.after(box);
  if (!aktuell.feedback.querySelector('.feedback.richtig') && z.status !== 'offen' && !istNurKernpunkte(a)) {
    // bereits erledigt (Seite neu geladen) oder angesehen: Weiter-Navigation unter der Lösung
    box.appendChild(weiterKnoepfe());
  }
  if (istNurKernpunkte(a)) {
    aktuell.knoepfe.aufdecken.hidden = true;
    aktuell.knoepfe.kernpunkte.hidden = false;
  }
  if (neu) box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

async function kernpunkteAufdecken() {
  try {
    const r = await A.senden(A.kursApi(kurs.id, `/aufgaben/${encodeURIComponent(aktuell.id)}/loesung-zeigen`));
    aktuell.antwort.zustand = r.zustand;
    zeigeLoesung(r.loesung, { neu: true });
  } catch (f) {
    zeigeMeldung(f.message);
  }
}

async function kernpunkteSpeichern() {
  const teil = aktuell.aufgabe.teile.find((t) => t.kind === 'kernpunkte');
  if (!teil) return;
  try {
    const r = await A.senden(A.kursApi(kurs.id, `/aufgaben/${encodeURIComponent(aktuell.id)}/kernpunkte`), { haken: teil.haken() });
    aktuell.antwort.zustand = r.zustand;
    aktuell.frischGeloest = true;
    zeichneMeta();
    const karte = el('section', 'feedback richtig');
    karte.appendChild(el('h3', 'feedback-titel', 'Selbstkontrolle gespeichert'));
    karte.appendChild(el('p', null, `${A.mehrzahl(r.rueckmeldung.haken, 'Kernpunkt', 'Kernpunkte')} abgehakt. Gespeichert ist nur diese Zahl – dein Text bleibt auf diesem Gerät.`));
    karte.appendChild(weiterKnoepfe());
    aktuell.feedback.replaceChildren(karte);
    aktualisiereErmittlung();
  } catch (f) {
    zeigeMeldung(f.message);
  }
}

/* ---------- Start ---------- */

function startAufgabe() {
  const gewuenscht = new URLSearchParams(window.location.search).get('aufgabe');
  const e = daten.ermittlung;
  const alle = [...e.aufgaben, ...(e.coldCase ? [e.coldCase] : [])];
  if (gewuenscht && alle.some((x) => x.id === gewuenscht)) return gewuenscht;
  const offen = e.aufgaben.find((x) => !ERLEDIGT.has(x.status) && x.status !== 'angesehen');
  return (offen || e.aufgaben[0] || e.coldCase || {}).id || null;
}

async function start() {
  if (!seite || !ermittlungId) return;
  kontext = await A.kursKontext(seite);
  if (!kontext) return;
  kurs = kontext.kurs;
  try {
    daten = await A.holen(A.kursApi(kurs.id, `/ermittlungen/${ermittlungId}`));
  } catch (f) {
    seite.replaceChildren(A.fehlerKarte(f));
    return;
  }
  const bereich = el('div', 'aufgabe-bereich');
  bereich.id = 'aufgabe-bereich';
  const teile = [A.vorschauHinweis(kontext), zeichneKopf(), zeichneBriefing(), bereich];
  const nav = el('nav', 'ermittlung-nav');
  nav.setAttribute('aria-label', 'Ermittlungen');
  if (daten.vorher) nav.appendChild(A.linkKnopf(`‹ ${daten.vorher.titel}`, `/ermittlung/${daten.vorher.id}`, 'knopf leise'));
  nav.appendChild(A.linkKnopf(`Akte ${daten.akte.nr}: ${daten.akte.titel}`, `/akte/${daten.akte.nr}`, 'knopf leise'));
  if (daten.nachher) nav.appendChild(A.linkKnopf(`${daten.nachher.titel} ›`, `/ermittlung/${daten.nachher.id}`, 'knopf leise'));
  teile.push(nav);
  seite.replaceChildren(...teile.filter(Boolean));
  zeichneKacheln();
  const id = startAufgabe();
  if (id) await oeffneAufgabe(id, false);
  else bereich.appendChild(A.leerKarte('Keine Aufgaben', 'Diese Ermittlung hat noch keine Aufgaben.'));
  document.documentElement.dataset.seite = 'bereit';
}

window.addEventListener('popstate', () => {
  if (!daten) return;
  const id = startAufgabe();
  if (id) oeffneAufgabe(id, false);
});

start();
