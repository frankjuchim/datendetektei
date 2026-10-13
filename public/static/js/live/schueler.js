// Live-Modus für Schülerinnen und Schüler (/live, Spec §7.10): Runde des Kurses finden, beitreten (Team wählen),
// Duell-Aufgaben beantworten bzw. im Escape Room Station für Station lösen, Code eingeben, Tipp-Umschlag öffnen.
// Zustand per SSE (gemeinsam.js); die Aufgabe wird nur neu aufgebaut, wenn sich Aufgabe/Station ändert – Eingaben
// bleiben bei Aktualisierungen erhalten. Geprüft wird nur auf dem Server; Codes kommen nur nach dem Lösen.

const V = new URL(import.meta.url).search;
const [A, R, I, K, G] = await Promise.all([
  import('../kern/api.js' + V),
  import('../kern/render.js' + V),
  import('../kern/interaktionen.js' + V),
  import('../lernen/konsole_lern.js' + V),
  import('./gemeinsam.js' + V)
]);
const { el, h, knopf } = R;

const seite = document.getElementById('seite');
let kontext = null;
let abo = null;
let warteUhr = null;
let lauf = null; // { id, z, kopf, haupt, seite, uhr, schluessel, refs }

/* ---------- Einstieg ---------- */

async function start() {
  kontext = await A.kursKontext(seite);
  if (!kontext) return;
  if (kontext.vorschau) {
    seite.replaceChildren(
      A.leerKarte('Live-Runden steuern Sie im Lehrkraft-Bereich', 'Hier spielen Ihre Schülerinnen und Schüler mit. Starten und steuern Sie Duell und Escape Room in der Live-Steuerung.', [
        A.linkKnopf('Zur Live-Steuerung', '/lehrkraft/live?kurs=' + encodeURIComponent(kontext.kurs.id), 'knopf primaer')
      ])
    );
    return;
  }
  await suche();
}

/** Aktuelle Runde des Kurses suchen; ohne Runde alle 8 s erneut. */
async function suche() {
  clearTimeout(warteUhr);
  let daten;
  try {
    daten = await A.holen(A.kursApi(kontext.kurs.id, '/live'));
  } catch (e) {
    seite.replaceChildren(A.fehlerKarte(e));
    return;
  }
  if (!daten.runde) {
    const k = knopf('Nachsehen', 'knopf', 'i-uhr');
    k.addEventListener('click', () => suche());
    seite.replaceChildren(A.leerKarte('Gerade läuft keine Live-Runde', 'Sobald deine Lehrkraft ein Duell oder den Escape Room startet, erscheint die Runde hier von selbst.', [k]));
    warteUhr = setTimeout(suche, 8000);
    return;
  }
  let z;
  try {
    z = await A.holen(G.rundeApi(daten.runde.id));
  } catch (e) {
    seite.replaceChildren(A.fehlerKarte(e));
    return;
  }
  if (z.status === 'beendet') return zeigeEnde(z);
  if (!z.ich || !z.ich.dabei) return zeigeBeitritt(z);
  starteLive(z);
}

/* ---------- Beitritt ---------- */

function zeigeBeitritt(z) {
  const karte = el('section', 'aktendeckel live-beitritt');
  karte.appendChild(el('span', 'reiter', z.modus === 'escape' ? 'Escape Room' : 'Live-Duell'));
  const innen = el('div', 'aktendeckel-innen');
  innen.appendChild(el('h1', null, z.modus === 'escape' ? z.escape.titel : 'Live-Duell'));
  if (z.modus === 'escape' && z.escape.briefing) {
    const zitat = el('blockquote', 'briefing');
    zitat.appendChild(R.md(z.escape.briefing));
    zitat.appendChild(el('cite', null, '– Edda Lorenz'));
    innen.appendChild(zitat);
  } else {
    innen.appendChild(el('p', null, 'Gleiche Aufgabe für alle: Wer richtig und schnell antwortet, bekommt die meisten Punkte. Punkte fürs Lab gibt es hier nicht – nur Ruhm.'));
  }
  const meldung = el('p', 'meldung');
  meldung.setAttribute('role', 'status');
  async function beitreten(team) {
    meldung.textContent = '';
    try {
      const neu = await A.senden(G.rundeApi(z.id, '/beitreten'), team === null ? {} : { team });
      starteLive(neu);
    } catch (e) {
      meldung.textContent = e.message;
    }
  }
  if (z.teams > 0) {
    innen.appendChild(el('h2', 'etikett', z.modus === 'escape' ? 'Wähle dein Team' : 'Team (optional)'));
    const wahl = el('div', 'team-wahl');
    for (let n = 1; n <= z.teams; n++) {
      const b = knopf(`Team ${n}`, 'knopf team-knopf');
      b.id = `live-team-${n}`;
      b.addEventListener('click', () => beitreten(n));
      wahl.appendChild(b);
    }
    innen.appendChild(wahl);
  }
  if (z.modus === 'duell') {
    const b = knopf('Mitmachen', 'knopf primaer gross', 'i-vor');
    b.id = 'k-beitreten';
    b.addEventListener('click', () => beitreten(null));
    innen.appendChild(h('div', 'knopf-reihe', b));
  }
  innen.appendChild(meldung);
  karte.appendChild(innen);
  seite.replaceChildren(karte);
}

/* ---------- Laufende Runde ---------- */

function starteLive(z) {
  if (abo) abo.schliessen();
  const kopf = el('header', 'verhoer-band live-band');
  const kopfText = h('div', null, el('p', 'verhoer-etikett'), el('h1', 'verhoer-titel'));
  const uhr = G.countdown({ knappMs: z.modus === 'duell' ? 10000 : 5 * 60000 });
  kopf.append(kopfText, uhr.el);
  const verbindung = G.verbindungsHinweis();
  const haupt = el('div', 'live-haupt');
  const spalte = el('aside', 'live-seitenspalte');
  spalte.setAttribute('aria-label', 'Stand');
  const raster = h('div', 'live-raster', haupt, spalte);
  seite.replaceChildren(h('section', 'live-karte', kopf, verbindung.el, raster));
  lauf = { id: z.id, z, kopf, kopfText, haupt, spalte, uhr, schluessel: null, refs: {} };
  abo = G.verbinde(z.id, {
    zustand: (neu) => zeichne(neu),
    ende: (daten) => {
      if (daten) zeigeEnde(daten);
      else suche();
    },
    verbindung: (ok) => verbindung.setze(ok)
  });
  zeichne(z);
}

function zeichne(z) {
  if (!lauf || z.id !== lauf.id) return;
  if (z.status === 'beendet') return zeigeEnde(z);
  lauf.z = z;
  if (z.modus === 'duell') zeichneDuell(z);
  else zeichneEscape(z);
}

async function aktualisiere() {
  try {
    zeichne(await A.holen(G.rundeApi(lauf.id)));
  } catch {
    /* SSE liefert den Stand ohnehin */
  }
}

/** Aufgabe mit den vorhandenen Interaktionen; sql-Teile mit Ermittlungskonsole (Ausführen auf der Übungs-DB). */
function aufgabeAufbauen(a, entwurf) {
  return I.erzeugeAufgabe(a, {
    speicher: `dd-freitext:live:${a.id}`,
    sqlTeil: (ia, kontextTeil, nr) => {
      const konsole = K.erzeugeLernKonsole({
        datenbank: ia.datenbank,
        dbTitel: R.DATENBANK_TITEL[ia.datenbank] || ia.datenbank,
        entwurf: `${entwurf}:${nr}`,
        abimodus: ia.abimodus || 'hinweis',
        beiAenderung: () => kontextTeil.geaendert()
      });
      return {
        kind: 'sql',
        konsole,
        ui: konsole.el,
        antwort: () => konsole.wert(),
        leer: () => konsole.wert().trim() === '',
        setze: (s) => typeof s === 'string' && konsole.setzeWert(s),
        feedback(r) {
          if (r && Array.isArray(r.diagnose)) konsole.zeigeDiagnose(r.diagnose, Number.isInteger(r.zeilen) ? A.mehrzahl(r.zeilen, 'Zeile', 'Zeilen') : null);
        },
        loesung() {},
        sperren() {}
      };
    }
  });
}

function aufgabeKarte(a, reiter, aufgabe) {
  const karte = el('article', 'aktendeckel aufgabe-karte');
  karte.appendChild(el('span', 'reiter', reiter));
  const innen = el('div', 'aktendeckel-innen');
  innen.appendChild(el('h2', 'aufgabe-titel', a.titel));
  innen.appendChild(aufgabe.el);
  // einteilige sql-Aufgabe: die Konsole steht nicht im Teil-Rahmen, sondern unter der Aufgabe
  if (!aufgabe.mehrteilig) for (const t of aufgabe.teile) if (t.kind === 'sql' && t.konsole) innen.appendChild(t.konsole.el);
  karte.appendChild(innen);
  return { karte, innen };
}

/* ---------- Duell ---------- */

function zeichneDuell(z) {
  const d = z.duell;
  const f = d.frage;
  lauf.kopfText.firstChild.textContent = `Live-Duell · ${z.kurs.name || ''}`.trim();
  lauf.kopfText.lastChild.textContent = f ? `Aufgabe ${f.nr} von ${f.von}` : 'Gleich geht’s los';
  lauf.uhr.setze(f && f.offen ? f.ende : null, z.serverZeit);

  const schluessel = f ? `d:${f.nr}:${f.offen}:${f.beantwortet}` : 'd:warten';
  if (schluessel !== lauf.schluessel) {
    lauf.schluessel = schluessel;
    lauf.haupt.replaceChildren(duellHaupt(z));
  }
  const punkte = h('div', 'live-punkte', el('span', 'etikett', 'Deine Punkte'), el('span', 'live-punkte-zahl zahlen', String(d.punkte)), d.platz ? el('span', 'leise', `Platz ${d.platz}`) : null);
  lauf.spalte.replaceChildren(punkte, G.rangliste(d.rangliste));
}

function duellHaupt(z) {
  const f = z.duell.frage;
  if (!f) return A.leerKarte('Warte auf die erste Aufgabe', 'Deine Lehrkraft schaltet die Aufgaben nacheinander frei. Bleib auf dieser Seite.');
  if (!f.offen) {
    const e = f.ergebnis;
    const box = el('section', 'karte live-ergebnis');
    if (e && e.ok) box.append(R.stempel(`Richtig · +${e.punkte}`, 'geloest'), el('p', null, 'Stark! Warte auf die nächste Aufgabe.'));
    else box.append(R.stempel(e && e.ohneAntwort ? 'Keine Antwort' : 'Leider falsch', 'angesehen'), el('p', null, 'Weiter geht’s mit der nächsten Aufgabe.'));
    box.id = 'live-ergebnis';
    return box;
  }
  if (f.beantwortet) {
    const box = el('section', 'karte live-ergebnis');
    box.id = 'live-gespeichert';
    box.append(R.stempel('Antwort abgegeben', ''), el('p', null, 'Gleich kommt die Auflösung, sobald die Zeit um ist.'));
    return box;
  }
  const a = z.duell.aufgabe;
  const aufgabe = aufgabeAufbauen(a, `dd-entwurf:live:${a.id}`);
  const { karte, innen } = aufgabeKarte(a, `Aufgabe ${f.nr}`, aufgabe);
  const meldung = el('p', 'meldung');
  meldung.setAttribute('role', 'status');
  const k = knopf('Antwort senden', 'knopf primaer', 'i-vor');
  k.id = 'k-antwort';
  k.addEventListener('click', async () => {
    if (aufgabe.leer()) {
      meldung.textContent = 'Gib zuerst eine Antwort.';
      return;
    }
    k.disabled = true;
    meldung.textContent = 'Wird gesendet …';
    try {
      await A.senden(G.rundeApi(lauf.id, '/antwort'), { aufgabe: a.id, antwort: aufgabe.antwort() });
      await aktualisiere();
    } catch (e) {
      meldung.textContent = e.message;
      k.disabled = false;
    }
  });
  innen.appendChild(h('div', 'knopf-reihe', k));
  innen.appendChild(meldung);
  return karte;
}

/* ---------- Escape Room ---------- */

function zeichneEscape(z) {
  const e = z.escape;
  const t = e.team;
  lauf.kopfText.firstChild.textContent = `Escape Room · Team ${t ? t.nr : '–'}`;
  lauf.kopfText.lastChild.textContent = t && t.fertig ? 'Tresor offen' : t && t.station ? `Station ${t.station.nr} von ${e.stationenAnzahl}` : e.titel;
  lauf.uhr.setze(['laeuft', 'abgelaufen'].includes(z.status) ? e.ende : null, z.serverZeit);

  const schluessel = `e:${z.status}:${t && t.station ? t.station.nr : '-'}:${t ? t.geloest : '-'}:${t ? t.fertig : '-'}`;
  if (schluessel !== lauf.schluessel) {
    lauf.schluessel = schluessel;
    lauf.refs = {};
    lauf.haupt.replaceChildren(escapeHaupt(z));
  }
  // Tipp-Umschlag und Strafe ohne Neuaufbau aktualisieren
  if (lauf.refs.tipp) lauf.refs.tipp(t);
  const liste = e.fortschritt.map((x) => ({ ...x, ich: t && x.team === t.nr }));
  const zusatz = t ? h('div', 'live-punkte', el('span', 'etikett', 'Euer Team'), el('span', 'hinweis-klein', (t.mitglieder || []).join(', ')), t.strafeMin ? el('span', 'leise', `Zeitstrafe: ${t.strafeMin} Minuten`) : null) : null;
  lauf.spalte.replaceChildren(...[zusatz, G.fortschritt(liste, e.stationenAnzahl)].filter(Boolean));
}

function escapeHaupt(z) {
  const e = z.escape;
  const t = e.team;
  if (z.status === 'wartet') {
    const box = A.leerKarte('Gleich geht’s los', 'Deine Lehrkraft startet den Escape Room. Stationen, Countdown und Schlösser erscheinen dann hier.');
    if (e.briefing) box.querySelector('.aktendeckel-innen').appendChild(h('blockquote', 'briefing', R.md(e.briefing)));
    return box;
  }
  if (t && t.fertig) {
    const box = el('section', 'karte live-ergebnis live-tresor');
    box.id = 'live-tresor';
    box.append(R.stempel('Tresor offen', 'geloest', { groesse: 'gross' }), R.md(t.abschluss || ''));
    return box;
  }
  if (z.status === 'abgelaufen') return A.leerKarte('Die Zeit ist um', 'Der Countdown ist abgelaufen. Wartet auf eure Lehrkraft.');
  if (!t || !t.station) return A.leerKarte('Kein Team', 'Tritt der Runde mit einer Team-Nummer bei.');

  const st = t.station;
  const box = el('div', 'live-station');
  const kopf = el('section', 'notiz live-story');
  kopf.append(R.icon('i-schloss'), el('p', 'notiz-titel', `Station ${st.nr}: ${st.titel}`), R.md(st.story));
  box.appendChild(kopf);

  if (t.geloest) {
    const code = el('section', 'karte live-code-karte');
    code.append(el('p', 'etikett', 'Geschafft! Euer Code für das Schloss'), el('p', 'live-code zahlen', t.code));
    code.lastChild.id = 'live-code';
    code.appendChild(el('p', 'hinweis-klein', 'Gebt ihn unten ein – dann öffnet sich die nächste Station.'));
    box.appendChild(code);
  } else {
    const aufgabe = aufgabeAufbauen(st.aufgabe, `dd-entwurf:live:${st.aufgabe.id}`);
    const { karte, innen } = aufgabeKarte(st.aufgabe, `Station ${st.nr}`, aufgabe);
    const meldung = el('div', 'meldung');
    meldung.setAttribute('role', 'status');
    meldung.id = 'live-meldung';
    const k = knopf('Lösung prüfen', 'knopf gruen', 'i-pruefen');
    k.id = 'k-antwort';
    k.addEventListener('click', async () => {
      if (aufgabe.leer()) {
        meldung.replaceChildren(document.createTextNode('Gebt zuerst eine Antwort ein.'));
        return;
      }
      k.disabled = true;
      meldung.replaceChildren(document.createTextNode('Wird geprüft …'));
      try {
        const r = await A.senden(G.rundeApi(lauf.id, '/antwort'), { antwort: aufgabe.antwort() });
        if (r.ok) {
          await aktualisiere();
          return;
        }
        meldung.replaceChildren(el('p', null, 'Das stimmt noch nicht – das Schloss bleibt zu.'));
        if (r.rueckmeldung && Array.isArray(r.rueckmeldung.diagnose) && r.rueckmeldung.diagnose.length) meldung.appendChild(R.diagnoseListe(r.rueckmeldung.diagnose));
      } catch (err) {
        meldung.replaceChildren(document.createTextNode(err.message));
      }
      k.disabled = false;
    });
    innen.appendChild(h('div', 'knopf-reihe', k));
    innen.appendChild(meldung);
    box.appendChild(karte);
  }
  box.appendChild(schloss(st));
  box.appendChild(tippUmschlag());
  return box;
}

/** Zahlenschloss: Code eingeben öffnet die nächste Station. */
function schloss(st) {
  const sec = el('section', 'karte live-schloss');
  sec.setAttribute('aria-labelledby', 'schloss-titel');
  const titel = el('h2', 'etikett', `Schloss ${st.nr}`);
  titel.id = 'schloss-titel';
  const eingabe = el('input', 'schloss-eingabe zahlen');
  eingabe.id = 'live-code-eingabe';
  eingabe.type = 'text';
  eingabe.inputMode = 'numeric';
  eingabe.autocomplete = 'off';
  eingabe.maxLength = 12;
  eingabe.setAttribute('aria-label', 'Code eingeben');
  const k = knopf('Schloss öffnen', 'knopf primaer', 'i-schloss');
  k.id = 'k-code';
  const meldung = el('p', 'meldung');
  meldung.setAttribute('role', 'status');
  meldung.id = 'live-code-meldung';
  async function oeffnen() {
    if (!eingabe.value.trim()) {
      meldung.textContent = 'Gebt zuerst den Code ein.';
      return;
    }
    k.disabled = true;
    try {
      const r = await A.senden(G.rundeApi(lauf.id, '/code'), { code: eingabe.value });
      if (r.ok) {
        A.toast(r.fertig ? 'Der Tresor ist offen!' : 'Klick – das Schloss ist offen.');
        await aktualisiere();
        return;
      }
      meldung.textContent = 'Der Code passt nicht.';
      eingabe.select();
    } catch (err) {
      meldung.textContent = err.message;
    }
    k.disabled = false;
  }
  k.addEventListener('click', oeffnen);
  eingabe.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') oeffnen();
  });
  sec.append(titel, h('div', 'schloss-zeile', eingabe, k), meldung);
  return sec;
}

/** Tipp-Umschlag: Bestätigung in der Seite (Zeitstrafe), danach der Tipp. Wird ohne Neuaufbau aktualisiert. */
function tippUmschlag() {
  const sec = el('section', 'live-tipp');
  const k = knopf('Tipp-Umschlag öffnen', 'knopf', 'i-tipp');
  k.id = 'k-tipp';
  const hinweis = el('p', 'hinweis-klein');
  const text = el('div', 'notiz live-tipp-text');
  text.hidden = true;
  const leiste = el('div', 'bestaetigung');
  leiste.hidden = true;
  const ja = knopf('Ja, öffnen', 'knopf primaer');
  ja.id = 'k-tipp-ja';
  const nein = knopf('Abbrechen', 'knopf leise');
  leiste.append(el('p', null, `Der Tipp kostet euer Team ${(lauf.z.escape && lauf.z.escape.tippStrafeMin) || 2} Minuten Zeitstrafe.`), ja, nein);
  k.addEventListener('click', () => {
    leiste.hidden = false;
    k.hidden = true;
  });
  nein.addEventListener('click', () => {
    leiste.hidden = true;
    k.hidden = false;
  });
  ja.addEventListener('click', async () => {
    ja.disabled = true;
    try {
      const r = await A.senden(G.rundeApi(lauf.id, '/tipp'), {});
      text.replaceChildren(R.icon('i-tipp'), el('p', 'notiz-titel', 'Tipp-Umschlag'), R.md(r.tipp));
      text.hidden = false;
      leiste.hidden = true;
      await aktualisiere();
    } catch (err) {
      hinweis.textContent = err.message;
      leiste.hidden = true;
      k.hidden = false;
    }
    ja.disabled = false;
  });
  sec.append(k, leiste, hinweis, text);
  lauf.refs.tipp = (t) => {
    if (!t) return;
    if (t.tipp) {
      if (text.hidden) {
        text.replaceChildren(R.icon('i-tipp'), el('p', 'notiz-titel', 'Tipp-Umschlag'), R.md(t.tipp));
        text.hidden = false;
      }
      k.hidden = true;
      leiste.hidden = true;
      hinweis.textContent = '';
      return;
    }
    k.disabled = !t.tippVerfuegbar;
    if (!leiste.hidden) return;
    hinweis.textContent = t.tippVerfuegbar ? '' : 'Den Tipp-Umschlag gibt eure Lehrkraft frei.';
  };
  return sec;
}

/* ---------- Ende ---------- */

function zeigeEnde(z) {
  if (abo) abo.schliessen();
  abo = null;
  if (lauf) lauf.uhr.stopp();
  lauf = null;
  const karte = el('section', 'aktendeckel live-ende');
  karte.id = 'live-ende';
  karte.appendChild(el('span', 'reiter', 'Ende'));
  const innen = el('div', 'aktendeckel-innen');
  innen.appendChild(el('h1', null, 'Die Live-Runde ist beendet'));
  const erg = z && z.ergebnis;
  if (erg && Array.isArray(erg.rangliste)) innen.appendChild(G.rangliste(erg.rangliste, { titel: 'Endstand' }));
  if (erg && Array.isArray(erg.teams)) {
    innen.appendChild(G.fortschritt(erg.teams, erg.stationenAnzahl || 6, { titel: 'Endstand der Teams', mitNamen: true }));
    if (erg.abschluss) innen.appendChild(h('blockquote', 'briefing', R.md(erg.abschluss)));
  }
  innen.appendChild(el('p', 'hinweis-klein', 'Alle Antworten wurden gelöscht – Punkte fürs Lab gibt es aus dem Live-Modus nicht.'));
  const k = knopf('Nach neuer Runde suchen', 'knopf');
  k.addEventListener('click', () => suche());
  innen.appendChild(h('div', 'knopf-reihe', k, A.linkKnopf('Zum Stadtplan', '/', 'knopf leise')));
  karte.appendChild(innen);
  seite.replaceChildren(karte);
}

start();
