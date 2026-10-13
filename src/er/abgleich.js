'use strict';
/*
 * Datendetektei – ER-Graph-Abgleich für den Bauplan-Tisch (Plan Phase 5 Task 1; Spec §7.6.4; EH §7, Chen).
 * Reine Funktionen, keine Abhängigkeiten außer src/er, nur Server (Prüfung ist immer serverseitig).
 *
 * Graph-Format (Layout getrennt):
 *   { entitaeten: [{ id, name, attribute: [{ name, schluessel? }] }],
 *     beziehungen: [{ id, name, enden: [{ entitaet: <id>, kard: '1'|'n'|'m'|'p', rolle? }], attribute: [{ name }] }] }
 *
 * gleicheAb(schueler, muster, optionen?) → { geloest, kriterien, richtig, gesamt }
 *   muster    = Liste zulässiger Muster-Graphen (ein einzelner Graph geht auch); die beste Musterlösung zählt
 *               (meiste erfüllte Kriterien, dann wenigste falsche Teilkriterien, dann die ursprüngliche Form vor
 *               einer Äquivalenz-Umformung).
 *   optionen  = { synonyme?: { Name: [Synonym, …] }   für Entitätstypen, Beziehungstypen, Attribute und Rollen
 *                 aequivalenzen?: ['nm_aufgeloest', 'attribut_an_n_seite']
 *                 kriterien?: Teilmenge von KRITERIEN (Standard: alle) }
 *   kriterien = [{ id, text, ok, falle?, teile: [{ text, ok }] }] in der Reihenfolge von KRITERIEN;
 *               falle (P8/P9) nur bei ok = false; teile = Teilkriterien je Element.
 *   richtig/gesamt = Anzahl erfüllter/geprüfter Kriterien; geloest = gesamt > 0 und alle erfüllt.
 *   Das Kriterium `beziehungsattribute` entfällt, wenn weder ein Muster noch der Schüler Beziehungsattribute hat.
 *
 *   Kriterien:
 *     entitaeten          alle Entitätstypen gefunden, keine überzähligen
 *     schluessel          je Entitätstyp genau die Schlüsselattribute des Musters (künstlicher Schlüssel darf anders
 *                         heißen: FallID = FallNr); Zwischenentitäten (nm_aufgeloest) beliebig
 *     attribute           je Entitätstyp genau die Attribute des Musters (fehlende Entitätstypen zählen als falsch)
 *     beziehungen         alle Beziehungstypen gefunden (über die verbundenen Entitätstypen; Name frei), keine überzähligen
 *     kardinalitaeten     alle Beziehungstypen gefunden und je Ende strukturell richtig (1 vs. viele; n/m/p gleich),
 *                         Richtung zählt; rekursiv: Rollen legen die Zuordnung fest, sonst beste Zuordnung
 *     beziehungsattribute alle Attribute von Beziehungstypen dort (P9: am Entitätstyp statt an der Beziehung und umgekehrt)
 *
 *   Ablauf: Entitätstypen zuordnen (Name mit Synonymen/Plural, sonst Attribut-Überdeckung ≥ 2 und ≥ die Hälfte,
 *   ungarische Methode; danach strukturell über bereits zugeordnete Nachbarn, z. B. Zwischenentitäten) →
 *   Beziehungen über das Multiset der verbundenen Entitätstypen (mehrere zwischen denselben Typen: Name, Attribute,
 *   Kardinalitäten entscheiden) → Enden und Kardinalitäten → Attribute.
 *
 *   Äquivalenzen (werden auf die Muster angewandt, alle Kombinationen):
 *     nm_aufgeloest       Beziehung, deren Enden alle „viele“ sind (n:m, rekursiv n:m, ternär m:n:p) ↔
 *                         Zwischenentität (Name frei, Schlüssel beliebig) mit je einer 1:n-Beziehung zu jedem
 *                         beteiligten Entitätstyp (1 beim Entitätstyp, n bei der Zwischenentität); die
 *                         Beziehungsattribute werden zu Attributen der Zwischenentität.
 *     attribut_an_n_seite Attribute einer binären 1:n-Beziehung ↔ Attribute des Entitätstyps auf der n-Seite.
 *   Gezählt wird immer nach der ursprünglichen Musterlösung: Eine Zwischenentität zählt nicht als Entitätstyp,
 *   eine aufgelöste Beziehung als ein Beziehungstyp (gefunden, wenn Zwischenentität und alle ihre 1:n-Beziehungen
 *   gefunden sind), die Attribute der Zwischenentität zählen unter `beziehungsattribute`.
 *
 *   Datenschutz der Lösung: Texte nennen nur Namen, die der Schüler selbst verwendet hat (Entitätstypen,
 *   Beziehungstypen, Attribute), nie Namen aus der Musterlösung; Fehlendes wird nur gezählt bzw. über die
 *   Schülernamen der Nachbarn beschrieben („Zwischen „Ermittler“ und „Fall“ fehlt ein Beziehungstyp.“).
 *   Robust: Unsinn (fehlende Ids, Kanten auf nicht vorhandene Entitätstypen, falsche Typen) wird falsch gewertet,
 *   nie geworfen.
 *
 * pruefeGraphForm(graph, { vollstaendig? }) → fehler[] (deutsche Texte; leer = in Ordnung)
 *   ≤ 30 Entitätstypen, ≤ 30 Beziehungstypen, ≤ 30 Attribute je Element, Namen 1–40 Zeichen (Beziehungsname darf
 *   fehlen, außer vollstaendig), Ids eindeutig über alle Elemente, 2–3 Enden je Beziehung auf vorhandene
 *   Entitätstypen, Kardinalität ∈ 1/n/m/p (fehlt nur erlaubt, wenn nicht vollstaendig), Rolle ≤ 40 Zeichen.
 *   Für Musterlösungen (Validator) mit { vollstaendig: true } aufrufen.
 *
 * pruefeLesen(antwort, loesung) → { geloest, richtig, gesamt, zuviel }
 *   loesung = { elemente: [id] }          antwort = { elemente: [id] }   (Menge; richtig = getroffene Ids)
 *   loesung = { zuordnung: { id: kat } }  antwort = { zuordnung: { id: kat } }
 *   zuviel = ausgewählte bzw. zugeordnete Ids, die nicht zur Lösung gehören.
 *
 * KRITERIEN, AEQUIVALENZEN – Konstanten.
 */

const { kanonisch, kuenstlich } = require('./namen');
const { ordneZu } = require('./zuordnung');

const KRITERIEN = ['entitaeten', 'schluessel', 'attribute', 'beziehungen', 'kardinalitaeten', 'beziehungsattribute'];
const AEQUIVALENZEN = ['nm_aufgeloest', 'attribut_an_n_seite'];
const MAX_ELEMENTE = 30;
const MAX_NAME = 40;
const MAX_ENDEN = 3;
const MAX_VARIANTEN_EINZELN = 8;

const istObjekt = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const textVon = (x) => (typeof x === 'string' ? x.trim() : '');
const idVon = (x) => (typeof x === 'string' && x.trim() ? x.trim() : typeof x === 'number' && Number.isFinite(x) ? String(x) : null);
const q = (s) => `„${s || '(ohne Namen)'}“`;

/** '1' → 'eins', n/m/p → 'viele', sonst null. */
function kardVon(k) {
  if (k === 1 || k === '1') return 'eins';
  if (typeof k === 'string' && /^[nmp]$/i.test(k.trim())) return 'viele';
  return null;
}

function attributeVon(liste) {
  if (!Array.isArray(liste)) return [];
  const aus = [];
  for (const a of liste) {
    if (!istObjekt(a)) continue;
    const name = textVon(a.name);
    if (name) aus.push({ name, schluessel: a.schluessel === true });
  }
  return aus;
}

/** Graph in sichere Form bringen (Schüler und Muster gleich). */
function bereinige(graph) {
  const g = istObjekt(graph) ? graph : {};
  const entitaeten = [];
  const ids = new Set();
  (Array.isArray(g.entitaeten) ? g.entitaeten : []).forEach((e, i) => {
    if (!istObjekt(e)) return;
    let id = idVon(e.id);
    if (id && ids.has(id)) return; // doppelte Id: zweiter Eintrag zählt nicht
    if (!id) id = `#e${i}`;
    ids.add(id);
    entitaeten.push({ id, name: textVon(e.name), attribute: attributeVon(e.attribute) });
  });
  const beziehungen = [];
  (Array.isArray(g.beziehungen) ? g.beziehungen : []).forEach((b, i) => {
    if (!istObjekt(b)) return;
    const enden = [];
    for (const e of Array.isArray(b.enden) ? b.enden : []) {
      if (!istObjekt(e)) continue;
      const ent = idVon(e.entitaet);
      enden.push({ entitaet: ent && ids.has(ent) && !ent.startsWith('#') ? ent : null, kard: kardVon(e.kard), rolle: textVon(e.rolle) });
    }
    beziehungen.push({ id: idVon(b.id) || `#b${i}`, name: textVon(b.name), enden, attribute: attributeVon(b.attribute) });
  });
  return { entitaeten, beziehungen };
}

/* ---------------- Äquivalenzen ---------------- */

function kopie(g) {
  return {
    entitaeten: g.entitaeten.map((e) => ({ ...e, attribute: e.attribute.map((a) => ({ ...a })) })),
    beziehungen: g.beziehungen.map((b) => ({ ...b, enden: b.enden.map((e) => ({ ...e })), attribute: b.attribute.map((a) => ({ ...a })) })),
  };
}

function varianten(muster, aequivalenzen) {
  const nm = aequivalenzen.includes('nm_aufgeloest')
    ? muster.beziehungen.filter((b) => b.enden.length >= 2 && b.enden.every((e) => e.kard === 'viele' && e.entitaet))
    : [];
  const ns = aequivalenzen.includes('attribut_an_n_seite')
    ? muster.beziehungen.filter((b) => b.enden.length === 2 && b.attribute.length && b.enden.some((e) => e.kard === 'eins') &&
      b.enden.some((e) => e.kard === 'viele' && e.entitaet))
    : [];
  const kandidaten = nm.map((b) => ({ art: 'nm', b })).concat(ns.map((b) => ({ art: 'ns', b })));
  let teilmengen;
  if (kandidaten.length <= MAX_VARIANTEN_EINZELN) {
    teilmengen = [];
    for (let m = 0; m < 1 << kandidaten.length; m++) teilmengen.push(kandidaten.filter((_, i) => m & (1 << i)));
  } else {
    teilmengen = [[], kandidaten.filter((k) => k.art === 'nm'), kandidaten.filter((k) => k.art === 'ns'), kandidaten];
  }
  return teilmengen.map((auswahl) => wende(muster, auswahl));
}

function wende(muster, auswahl) {
  const g = kopie(muster);
  for (const { art, b: original } of auswahl) {
    const b = g.beziehungen.find((x) => x.id === original.id);
    if (art === 'ns') {
      const nSeite = g.entitaeten.find((e) => e.id === b.enden.find((x) => x.kard === 'viele').entitaet);
      nSeite.attribute.push(...b.attribute.map((a) => ({ name: a.name, schluessel: false })));
      b.attribute = [];
    } else {
      const zid = `~z:${b.id}`;
      g.entitaeten.push({
        id: zid, name: '', alias: b.name, zwischen: true, herkunft: b.id, herkunftEnden: b.enden.map((e) => e.entitaet),
        attribute: b.attribute.map((a) => ({ name: a.name, schluessel: false })),
      });
      b.enden.forEach((e, k) => {
        g.beziehungen.push({
          id: `~b:${b.id}:${k}`,
          herkunft: b.id,
          name: '',
          enden: [{ entitaet: e.entitaet, kard: 'eins', rolle: e.rolle }, { entitaet: zid, kard: 'viele', rolle: '' }],
          attribute: [],
        });
      });
      g.beziehungen = g.beziehungen.filter((x) => x !== b);
    }
  }
  return g;
}

/* ---------------- Zuordnung ---------------- */

function zaehle(liste) {
  const m = new Map();
  for (const x of liste) m.set(x, (m.get(x) || 0) + 1);
  return m;
}

function permutationen(liste) {
  if (liste.length <= 1) return [liste.slice()];
  if (liste.length > 6) return [liste.slice()];
  const aus = [];
  liste.forEach((x, i) => {
    for (const rest of permutationen(liste.filter((_, j) => j !== i))) aus.push([x, ...rest]);
  });
  return aus;
}

/** Attribute paaren: paar[iMuster] = iSchueler oder -1; künstlicher Einzelschlüssel darf anders heißen. */
function paareAttribute(mAttr, sAttr, syn) {
  const paar = new Array(mAttr.length).fill(-1);
  const frei = new Set(sAttr.map((_, j) => j));
  mAttr.forEach((a, i) => {
    const k = kanonisch(a.name, syn);
    for (const j of frei) {
      if (kanonisch(sAttr[j].name, syn) === k) { paar[i] = j; frei.delete(j); break; }
    }
  });
  const km = mAttr.filter((a) => a.schluessel);
  const ks = sAttr.filter((a) => a.schluessel);
  if (km.length === 1 && ks.length === 1) {
    const i = mAttr.indexOf(km[0]);
    const j = sAttr.indexOf(ks[0]);
    if (paar[i] === -1 && frei.has(j) && kuenstlich(km[0].name) && kuenstlich(ks[0].name)) { paar[i] = j; frei.delete(j); }
  }
  return { paar, frei };
}

function ordneEntitaetenZu(s, m, syn) {
  const zuordnung = new Map(); // Muster-Id → Schüler-Id
  const nameS = s.entitaeten.map((e) => kanonisch(e.name, syn));
  const gewichte = m.entitaeten.map((me) => {
    const nm = kanonisch(me.zwischen ? me.alias : me.name, syn);
    return s.entitaeten.map((se, j) => {
      const nameGleich = nm !== '' && nm === nameS[j];
      if (me.zwischen) return nameGleich ? 1000 : 0;
      const { paar } = paareAttribute(me.attribute, se.attribute, syn);
      let perName = 0;
      let schluesselPaar = 0;
      me.attribute.forEach((a, i) => {
        if (paar[i] < 0) return;
        if (kanonisch(a.name, syn) === kanonisch(se.attribute[paar[i]].name, syn)) perName++;
        else schluesselPaar = 1;
      });
      const ueberdeckt = perName >= 2 && perName * 2 >= me.attribute.length;
      if (!nameGleich && !ueberdeckt) return 0;
      return (nameGleich ? 1000 : 0) + 10 * perName + 5 * schluesselPaar;
    });
  });
  ordneZu(gewichte).forEach((j, i) => { if (j >= 0) zuordnung.set(m.entitaeten[i].id, s.entitaeten[j].id); });

  // strukturell: über bereits zugeordnete Nachbarn
  const schluesselS = new Map();
  for (const b of s.beziehungen) {
    if (b.enden.length < 2 || b.enden.some((e) => !e.entitaet)) continue;
    const k = b.enden.map((e) => e.entitaet).sort().join('|');
    schluesselS.set(k, (schluesselS.get(k) || 0) + 1);
  }
  for (let runde = 0; runde < 4; runde++) {
    const offenM = m.entitaeten.filter((e) => !zuordnung.has(e.id));
    const vergeben = new Set(zuordnung.values());
    const offenS = s.entitaeten.filter((e) => !vergeben.has(e.id));
    if (!offenM.length || !offenS.length) break;
    const gew = offenM.map((me) => {
      const eigene = m.beziehungen.filter((b) => b.enden.some((e) => e.entitaet === me.id));
      return offenS.map((se) => {
        const keys = [];
        for (const b of eigene) {
          const ziel = b.enden.map((e) => (e.entitaet === me.id ? se.id : zuordnung.get(e.entitaet)));
          if (ziel.some((x) => !x)) continue;
          keys.push(ziel.sort().join('|'));
        }
        let treffer = 0;
        for (const [k, n] of zaehle(keys)) treffer += Math.min(n, schluesselS.get(k) || 0);
        const genug = me.zwischen ? treffer >= 2 && treffer === eigene.length : treffer >= 1 && treffer === eigene.length;
        return genug ? treffer : 0;
      });
    });
    let neu = false;
    ordneZu(gew).forEach((j, i) => {
      if (j >= 0) { zuordnung.set(offenM[i].id, offenS[j].id); neu = true; }
    });
    if (!neu) break;
  }
  return zuordnung;
}

/** Beste Zuordnung der Enden (je Entitätstyp-Gruppe permutieren; Rollen binden). */
function vergleicheEnden(mb, sb, ezu, syn) {
  const gruppen = new Map();
  mb.enden.forEach((e) => {
    const sid = ezu.get(e.entitaet);
    if (!gruppen.has(sid)) gruppen.set(sid, { m: [], s: [] });
    gruppen.get(sid).m.push(e);
  });
  sb.enden.forEach((e) => { if (gruppen.has(e.entitaet)) gruppen.get(e.entitaet).s.push(e); });
  let treffer = 0;
  for (const { m, s } of gruppen.values()) {
    let besterGebunden = -1;
    let besterFrei = -1;
    for (const perm of permutationen(s)) {
      let t = 0;
      let gebunden = true;
      m.forEach((me, i) => {
        const se = perm[i];
        if (!se) return;
        if (se.kard && se.kard === me.kard) t++;
        if (me.rolle) {
          const km = kanonisch(me.rolle, syn);
          const passend = s.find((x) => x.rolle && kanonisch(x.rolle, syn) === km);
          if (passend && passend !== se) gebunden = false;
        }
      });
      if (gebunden) besterGebunden = Math.max(besterGebunden, t);
      besterFrei = Math.max(besterFrei, t);
    }
    treffer += besterGebunden >= 0 ? besterGebunden : besterFrei;
  }
  const ok = treffer === mb.enden.length;
  const kardS = sb.enden.map((e) => e.kard);
  const fehlt = kardS.some((k) => !k);
  const gleicheMenge = !fehlt && [...kardS].sort().join() === mb.enden.map((e) => e.kard).sort().join();
  return { treffer, ok, fehlt, vertauscht: !ok && gleicheMenge };
}

function ordneBeziehungenZu(s, m, ezu, syn) {
  const zuordnung = new Map(); // Muster-Bez-Id → Schüler-Bez
  const schluesselM = (b) => {
    const ids = b.enden.map((e) => ezu.get(e.entitaet));
    return b.enden.length >= 2 && ids.every(Boolean) ? ids.sort().join('|') : null;
  };
  const schluesselSchueler = (b) => (b.enden.length >= 2 && b.enden.every((e) => e.entitaet) ? b.enden.map((e) => e.entitaet).sort().join('|') : null);
  const gruppenM = new Map();
  for (const b of m.beziehungen) {
    const k = schluesselM(b);
    if (!k) continue;
    if (!gruppenM.has(k)) gruppenM.set(k, []);
    gruppenM.get(k).push(b);
  }
  const gruppenS = new Map();
  for (const b of s.beziehungen) {
    const k = schluesselSchueler(b);
    if (!k) continue;
    if (!gruppenS.has(k)) gruppenS.set(k, []);
    gruppenS.get(k).push(b);
  }
  for (const [k, ms] of gruppenM) {
    const ss = gruppenS.get(k) || [];
    if (!ss.length) continue;
    const gew = ms.map((mb) => ss.map((sb) => {
      const kn = kanonisch(mb.name, syn);
      let w = 1;
      if (kn && kn === kanonisch(sb.name, syn)) w += 100;
      const { paar } = paareAttribute(mb.attribute, sb.attribute, syn);
      w += 10 * paar.filter((x) => x >= 0).length;
      w += 2 * vergleicheEnden(mb, sb, ezu, syn).treffer;
      return w;
    }));
    ordneZu(gew).forEach((j, i) => { if (j >= 0) zuordnung.set(ms[i].id, ss[j]); });
  }
  return zuordnung;
}

/* ---------------- Bewertung eines Musters ---------------- */

function bewerte(s, m, syn, auswahl) {
  const ezu = ordneEntitaetenZu(s, m, syn);
  const bzu = ordneBeziehungenZu(s, m, ezu, syn);
  const sEnt = new Map(s.entitaeten.map((e) => [e.id, e]));
  const vergebenE = new Set(ezu.values());
  const vergebenB = new Set([...bzu.values()].map((b) => b.id));
  const nameVon = (id) => q(sEnt.get(id) && sEnt.get(id).name);

  /** „leitet“ (zwischen „Ermittler“ und „Fall“) bzw. Beziehungstyp zwischen … – nur Schülernamen. */
  function bezeichnung(sb) {
    const namen = [...new Set(sb.enden.filter((e) => e.entitaet).map((e) => nameVon(e.entitaet)))];
    const wo = namen.length === 1 ? `an ${namen[0]}` : `zwischen ${aufzaehlung(namen)}`;
    return sb.name ? `${q(sb.name)} (${wo})` : `Beziehungstyp ${wo}`;
  }

  // Einheiten = Beziehungen des ursprünglichen Musters (aufgelöste n:m: Zwischenentität + ihre 1:n-Beziehungen)
  const einheiten = new Map();
  for (const mb of m.beziehungen) {
    const id = mb.herkunft || mb.id;
    if (!einheiten.has(id)) einheiten.set(id, { rels: [], zwischen: null, enden: mb.herkunft ? null : mb.enden.map((e) => e.entitaet) });
    einheiten.get(id).rels.push(mb);
  }
  for (const me of m.entitaeten) {
    if (!me.zwischen) continue;
    const u = einheiten.get(me.herkunft) || { rels: [] };
    u.zwischen = me;
    u.enden = me.herkunftEnden;
    einheiten.set(me.herkunft, u);
  }
  const gefunden = (u) => u.rels.every((mb) => bzu.has(mb.id)) && (!u.zwischen || ezu.has(u.zwischen.id));

  // Attribute je zugeordnetem Entitätstyp
  const entPaare = m.entitaeten.filter((me) => ezu.has(me.id)).map((me) => {
    const se = sEnt.get(ezu.get(me.id));
    const { paar, frei } = paareAttribute(me.attribute, se.attribute, syn);
    const fehlend = me.attribute.filter((_, i) => paar[i] < 0).map((a) => kanonisch(a.name, syn));
    let zuviel = [...frei].map((j) => se.attribute[j]);
    if (me.zwischen) zuviel = zuviel.filter((a) => !a.schluessel);
    return { me, se, paar, fehlend, zuviel, name: q(se.name) };
  });
  const normalePaare = entPaare.filter((p) => !p.me.zwischen);
  // Attribute je zugeordneter Beziehung
  const bezPaare = m.beziehungen.filter((mb) => bzu.has(mb.id)).map((mb) => {
    const sb = bzu.get(mb.id);
    const { paar, frei } = paareAttribute(mb.attribute, sb.attribute, syn);
    return {
      mb, sb,
      name: bezeichnung(sb),
      soll: mb.attribute.length,
      fehlend: mb.attribute.filter((_, i) => paar[i] < 0).map((a) => kanonisch(a.name, syn)),
      zuviel: [...frei].map((j) => sb.attribute[j]),
      enden: vergleicheEnden(mb, sb, ezu, syn),
    };
  });
  // Träger von Beziehungsattributen: Beziehungen und Zwischenentitäten
  const traeger = bezPaare.concat(entPaare.filter((p) => p.me.zwischen).map((p) => ({ ...p, soll: p.me.attribute.length })));

  // Fehlplatzierungen (P9)
  const bezAttrNamen = new Set(m.beziehungen.flatMap((b) => b.attribute.map((a) => kanonisch(a.name, syn)))
    .concat(m.entitaeten.filter((e) => e.zwischen).flatMap((e) => e.attribute.map((a) => kanonisch(a.name, syn)))));
  const entAttrNamen = new Set(m.entitaeten.filter((e) => !e.zwischen).flatMap((e) => e.attribute.map((a) => kanonisch(a.name, syn))));
  const fehlplatziert = [];
  let verschoben = 0; // Beziehungsattribute, die der Schüler an einen Entitätstyp gehängt hat
  const entfernen = (liste, k) => { const i = liste.indexOf(k); if (i >= 0) liste.splice(i, 1); return i >= 0; };
  for (const p of normalePaare) {
    p.zuviel = p.zuviel.filter((a) => {
      const k = kanonisch(a.name, syn);
      if (!bezAttrNamen.has(k) || entAttrNamen.has(k) && p.me.attribute.some((x) => kanonisch(x.name, syn) === k)) return true;
      fehlplatziert.push(`${q(a.name)} an ${p.name} beschreibt die Beziehung, nicht den Entitätstyp – es gehört an den Beziehungstyp.`);
      for (const t of traeger) if (entfernen(t.fehlend, k)) { verschoben++; break; }
      return false;
    });
  }
  for (const t of traeger) {
    t.zuviel = t.zuviel.filter((a) => {
      const k = kanonisch(a.name, syn);
      if (!entAttrNamen.has(k) || bezAttrNamen.has(k)) return true;
      fehlplatziert.push(`${q(a.name)} an ${t.name} beschreibt einen Entitätstyp, nicht die Beziehung.`);
      for (const p of normalePaare) if (entfernen(p.fehlend, k)) break;
      return false;
    });
  }
  // Attribute an überzähligen Schüler-Entitätstypen, die zu Beziehungen gehören
  for (const se of s.entitaeten) {
    if (vergebenE.has(se.id)) continue;
    for (const a of se.attribute) {
      if (bezAttrNamen.has(kanonisch(a.name, syn)) && !entAttrNamen.has(kanonisch(a.name, syn))) {
        fehlplatziert.push(`${q(a.name)} an ${q(se.name)} beschreibt eine Beziehung, nicht einen Entitätstyp.`);
      }
    }
  }

  const kriterien = [];
  const fuege = (id, ok, text, teile, falle) => {
    if (!auswahl.includes(id)) return;
    const k = { id, text, ok, teile };
    if (!ok && falle) k.falle = falle;
    kriterien.push(k);
  };
  const anzahl = (n, eins, mehr) => (n === 1 ? `1 ${eins}` : `${n} ${mehr}`);

  // entitaeten
  {
    const normale = m.entitaeten.filter((e) => !e.zwischen);
    const gesamt = normale.length;
    const treffer = normalePaare.length;
    const extra = s.entitaeten.filter((e) => !vergebenE.has(e.id));
    const teile = entPaare.map((p) => ({ text: `Entitätstyp ${p.name} passt.`, ok: true }))
      .concat(extra.map((e) => ({ text: `${q(e.name)} passt zu keinem geforderten Entitätstyp.`, ok: false })));
    const ok = treffer === gesamt && !extra.length;
    const text = ok ? `Alle ${gesamt} Entitätstypen gefunden.`
      : `${treffer} von ${gesamt} Entitätstypen gefunden${extra.length ? `, ${extra.length} überzählig` : ''}.`;
    fuege('entitaeten', ok, text, teile, 'P9');
  }
  // schluessel
  {
    const gesamt = m.entitaeten.filter((e) => !e.zwischen).length;
    const teile = [];
    let richtig = 0;
    for (const p of normalePaare) {
      const sollM = new Set(p.me.attribute.map((a, i) => (a.schluessel ? i : -1)).filter((i) => i >= 0));
      const istS = p.se.attribute.map((a, j) => (a.schluessel ? j : -1)).filter((j) => j >= 0);
      const istM = istS.map((j) => p.paar.indexOf(j));
      const ok = istM.length === sollM.size && istM.every((i) => i >= 0 && sollM.has(i));
      if (ok) richtig++;
      teile.push({
        ok,
        text: ok ? `${p.name}: Schlüsselattribut richtig.`
          : istS.length ? `${p.name}: Schlüsselattribut passt nicht.` : `${p.name}: kein Schlüsselattribut markiert.`,
      });
    }
    const ok = richtig === gesamt;
    fuege('schluessel', ok, ok ? 'Alle Schlüsselattribute richtig markiert.' : `${richtig} von ${gesamt} Entitätstypen mit richtigem Schlüsselattribut.`, teile, 'P8');
  }
  // attribute
  {
    const teile = [];
    let richtig = 0;
    for (const p of normalePaare) {
      const ok = !p.fehlend.length && !p.zuviel.length;
      if (ok) { richtig++; teile.push({ ok, text: `${p.name}: Attribute vollständig.` }); continue; }
      if (p.fehlend.length) teile.push({ ok: false, text: `${p.name}: ${anzahl(p.fehlend.length, 'Attribut fehlt', 'Attribute fehlen')}.` });
      for (const a of p.zuviel) teile.push({ ok: false, text: `${p.name}: Attribut ${q(a.name)} gehört nicht dazu.` });
    }
    const gesamt = m.entitaeten.filter((e) => !e.zwischen).length;
    const ok = richtig === gesamt;
    fuege('attribute', ok, ok ? 'Alle Attribute der Entitätstypen vollständig.' : `${richtig} von ${gesamt} Entitätstypen mit passenden Attributen.`, teile);
  }
  // beziehungen
  {
    const gesamt = einheiten.size;
    const liste = [...einheiten.values()];
    const treffer = liste.filter(gefunden).length;
    const extra = s.beziehungen.filter((b) => !vergebenB.has(b.id));
    const teile = bezPaare.map((bp) => ({ ok: true, text: `${bp.name} passt.` }));
    for (const u of liste) {
      if (gefunden(u)) continue;
      const ids = (u.enden || []).map((id) => ezu.get(id));
      if (!ids.length || ids.some((x) => !x)) continue;
      const namen = [...new Set(ids)].map(nameVon);
      teile.push({ ok: false, text: namen.length === 1 ? `An ${namen[0]} fehlt ein rekursiver Beziehungstyp.` : `Zwischen ${aufzaehlung(namen)} fehlt ein Beziehungstyp.` });
    }
    for (const b of extra) {
      const verbunden = b.enden.length >= 2 && b.enden.every((e) => e.entitaet);
      teile.push({
        ok: false,
        text: verbunden ? `${bezeichnung(b)} passt zu keiner Anforderung.`
          : `Beziehungstyp ${q(b.name)} ist nicht mit mindestens zwei Entitätstypen verbunden.`,
      });
    }
    const ok = treffer === gesamt && !extra.length;
    const text = ok ? `Alle ${gesamt} Beziehungstypen gefunden.`
      : `${treffer} von ${gesamt} Beziehungstypen gefunden${extra.length ? `, ${extra.length} überzählig` : ''}.`;
    fuege('beziehungen', ok, text, teile, 'P9');
  }
  // kardinalitaeten
  {
    const teile = [];
    for (const bp of bezPaare) {
      const e = bp.enden;
      teile.push({
        ok: e.ok,
        text: e.ok ? `${bp.name}: Kardinalitäten richtig.`
          : e.fehlt ? `${bp.name}: Kardinalität fehlt.`
            : e.vertauscht ? `${bp.name}: Kardinalitäten vertauscht – lies die Beziehung in beide Richtungen.`
              : `${bp.name}: Kardinalität falsch.`,
      });
    }
    const liste = [...einheiten.values()];
    const richtig = liste.filter((u) => gefunden(u) && u.rels.every((mb) => bezPaare.find((bp) => bp.mb === mb).enden.ok)).length;
    const ok = richtig === liste.length;
    fuege('kardinalitaeten', ok, ok ? 'Alle Kardinalitäten richtig.' : `${richtig} von ${liste.length} Beziehungstypen mit richtigen Kardinalitäten.`, teile, 'P9');
  }
  // beziehungsattribute
  {
    const teile = fehlplatziert.map((text) => ({ ok: false, text }));
    const gesamt = m.beziehungen.reduce((n, b) => n + b.attribute.length, 0) +
      m.entitaeten.filter((e) => e.zwischen).reduce((n, e) => n + e.attribute.length, 0);
    let richtig = -verschoben;
    for (const t of traeger) {
      richtig += t.soll - t.fehlend.length;
      if (t.fehlend.length) teile.push({ ok: false, text: `${t.name}: ${anzahl(t.fehlend.length, 'Attribut fehlt', 'Attribute fehlen')}.` });
      for (const a of t.zuviel) teile.push({ ok: false, text: `${t.name}: Attribut ${q(a.name)} gehört nicht dazu.` });
      if (t.soll && !t.fehlend.length && !t.zuviel.length) teile.push({ ok: true, text: `${t.name}: Attribute richtig.` });
    }
    for (const b of s.beziehungen) {
      if (vergebenB.has(b.id)) continue;
      for (const a of b.attribute) {
        if (!entAttrNamen.has(kanonisch(a.name, syn))) teile.push({ ok: false, text: `Attribut ${q(a.name)} hängt an einem überzähligen Beziehungstyp.` });
      }
    }
    const ok = richtig === gesamt && !teile.some((t) => !t.ok);
    const text = ok ? 'Alle Beziehungsattribute richtig platziert.'
      : gesamt ? `${richtig} von ${gesamt} Beziehungsattributen richtig platziert.` : 'Beziehungsattribute nicht richtig platziert.';
    fuege('beziehungsattribute', ok, text, teile, 'P9');
  }

  const richtig = kriterien.filter((k) => k.ok).length;
  return { geloest: kriterien.length > 0 && richtig === kriterien.length, kriterien, richtig, gesamt: kriterien.length };
}

function aufzaehlung(liste) {
  if (liste.length <= 1) return liste.join('');
  return liste.slice(0, -1).join(', ') + ' und ' + liste[liste.length - 1];
}

function gleicheAb(schueler, muster, optionen = {}) {
  const opt = istObjekt(optionen) ? optionen : {};
  const syn = istObjekt(opt.synonyme) ? opt.synonyme : undefined;
  const aequivalenzen = Array.isArray(opt.aequivalenzen) ? opt.aequivalenzen.filter((a) => AEQUIVALENZEN.includes(a)) : [];
  const gewuenscht = Array.isArray(opt.kriterien) ? KRITERIEN.filter((k) => opt.kriterien.includes(k)) : KRITERIEN.slice();
  const listeRoh = Array.isArray(muster) ? muster : istObjekt(muster) ? [muster] : [];
  const liste = listeRoh.filter(istObjekt).map(bereinige).filter((g) => g.entitaeten.length);
  const s = bereinige(schueler);
  if (!liste.length) return { geloest: false, kriterien: [], richtig: 0, gesamt: 0 };

  const mitBezAttr = liste.some((g) => g.beziehungen.some((b) => b.attribute.length)) || s.beziehungen.some((b) => b.attribute.length);
  const auswahl = gewuenscht.filter((k) => k !== 'beziehungsattribute' || mitBezAttr);
  let bestes = null;
  let bestWert = null;
  for (const m of liste) {
    for (const v of varianten(m, aequivalenzen)) {
      const erg = bewerte(s, v, syn, auswahl);
      const falsch = erg.kriterien.reduce((n, k) => n + k.teile.filter((t) => !t.ok).length, 0);
      const wert = [erg.richtig, -falsch];
      if (!bestWert || wert[0] > bestWert[0] || (wert[0] === bestWert[0] && wert[1] > bestWert[1])) {
        bestes = erg;
        bestWert = wert;
      }
    }
  }
  return bestes;
}

/* ---------------- Formprüfung ---------------- */

function pruefeNameFeld(fehler, wo, name, pflicht) {
  if (name === undefined || name === null || name === '') {
    if (pflicht) fehler.push(`${wo}: Name fehlt.`);
    return;
  }
  if (typeof name !== 'string') { fehler.push(`${wo}: Name muss Text sein.`); return; }
  if (!name.trim()) { if (pflicht) fehler.push(`${wo}: Name fehlt.`); return; }
  if (name.trim().length > MAX_NAME) fehler.push(`${wo}: Name länger als ${MAX_NAME} Zeichen.`);
}

function pruefeAttributListe(fehler, wo, liste) {
  if (liste === undefined) return;
  if (!Array.isArray(liste)) { fehler.push(`${wo}: attribute muss eine Liste sein.`); return; }
  if (liste.length > MAX_ELEMENTE) fehler.push(`${wo}: höchstens ${MAX_ELEMENTE} Attribute.`);
  liste.forEach((a, i) => {
    const wa = `${wo}, Attribut ${i + 1}`;
    if (!istObjekt(a)) { fehler.push(`${wa}: kein Objekt.`); return; }
    pruefeNameFeld(fehler, wa, a.name, true);
    if (a.schluessel !== undefined && typeof a.schluessel !== 'boolean') fehler.push(`${wa}: schluessel muss true oder false sein.`);
  });
}

function pruefeGraphForm(graph, optionen = {}) {
  const vollstaendig = istObjekt(optionen) && optionen.vollstaendig === true;
  if (!istObjekt(graph)) return ['ER-Diagramm: kein Objekt.'];
  const fehler = [];
  if (!Array.isArray(graph.entitaeten)) fehler.push('ER-Diagramm: Liste entitaeten fehlt.');
  if (!Array.isArray(graph.beziehungen)) fehler.push('ER-Diagramm: Liste beziehungen fehlt.');
  if (fehler.length) return fehler;
  if (graph.entitaeten.length > MAX_ELEMENTE) fehler.push(`ER-Diagramm: höchstens ${MAX_ELEMENTE} Entitätstypen.`);
  if (graph.beziehungen.length > MAX_ELEMENTE) fehler.push(`ER-Diagramm: höchstens ${MAX_ELEMENTE} Beziehungstypen.`);
  const ids = new Set();
  const entIds = new Set();
  const pruefeId = (wo, id) => {
    const i = idVon(id);
    if (!i) { fehler.push(`${wo}: id fehlt.`); return null; }
    if (ids.has(i)) fehler.push(`${wo}: id „${i}“ doppelt.`);
    ids.add(i);
    return i;
  };
  graph.entitaeten.forEach((e, k) => {
    const wo = `Entitätstyp ${k + 1}`;
    if (!istObjekt(e)) { fehler.push(`${wo}: kein Objekt.`); return; }
    const id = pruefeId(wo, e.id);
    if (id) entIds.add(id);
    pruefeNameFeld(fehler, wo, e.name, true);
    pruefeAttributListe(fehler, wo, e.attribute);
  });
  graph.beziehungen.forEach((b, k) => {
    const wo = `Beziehungstyp ${k + 1}`;
    if (!istObjekt(b)) { fehler.push(`${wo}: kein Objekt.`); return; }
    pruefeId(wo, b.id);
    pruefeNameFeld(fehler, wo, b.name, vollstaendig);
    pruefeAttributListe(fehler, wo, b.attribute);
    if (!Array.isArray(b.enden) || b.enden.length < 2) { fehler.push(`${wo}: braucht mindestens zwei Enden.`); return; }
    if (b.enden.length > MAX_ENDEN) fehler.push(`${wo}: höchstens ${MAX_ENDEN} Enden (binär, rekursiv oder ternär).`);
    b.enden.forEach((e, i) => {
      const we = `${wo}, Ende ${i + 1}`;
      if (!istObjekt(e)) { fehler.push(`${we}: kein Objekt.`); return; }
      const ziel = idVon(e.entitaet);
      if (!ziel || !entIds.has(ziel)) fehler.push(`${we}: verweist auf keinen vorhandenen Entitätstyp.`);
      const leer = e.kard === undefined || e.kard === null || e.kard === '';
      if (leer ? vollstaendig : !kardVon(e.kard)) fehler.push(`${we}: Kardinalität muss 1, n, m oder p sein.`);
      if (e.rolle !== undefined && e.rolle !== null && e.rolle !== '') {
        if (typeof e.rolle !== 'string') fehler.push(`${we}: Rolle muss Text sein.`);
        else if (e.rolle.trim().length > MAX_NAME) fehler.push(`${we}: Rolle länger als ${MAX_NAME} Zeichen.`);
      }
    });
  });
  return fehler;
}

/* ---------------- Lesen-Modus ---------------- */

function pruefeLesen(antwort, loesung) {
  const a = istObjekt(antwort) ? antwort : {};
  if (istObjekt(loesung) && Array.isArray(loesung.elemente)) {
    const soll = new Set(loesung.elemente.map(idVon).filter(Boolean));
    const gesamt = soll.size;
    if (!Array.isArray(a.elemente)) return { geloest: false, richtig: 0, gesamt, zuviel: 0 };
    const ist = new Set(a.elemente.map(idVon).filter(Boolean));
    let richtig = 0;
    let zuviel = 0;
    for (const id of ist) if (soll.has(id)) richtig++; else zuviel++;
    return { geloest: gesamt > 0 && richtig === gesamt && zuviel === 0, richtig, gesamt, zuviel };
  }
  if (istObjekt(loesung) && istObjekt(loesung.zuordnung)) {
    const soll = loesung.zuordnung;
    const gesamt = Object.keys(soll).length;
    if (!istObjekt(a.zuordnung)) return { geloest: false, richtig: 0, gesamt, zuviel: 0 };
    let richtig = 0;
    let zuviel = 0;
    for (const [id, kat] of Object.entries(a.zuordnung)) {
      if (!Object.prototype.hasOwnProperty.call(soll, id)) { if (textVon(kat)) zuviel++; continue; }
      if (textVon(kat) && textVon(kat) === textVon(soll[id])) richtig++;
    }
    return { geloest: gesamt > 0 && richtig === gesamt && zuviel === 0, richtig, gesamt, zuviel };
  }
  return { geloest: false, richtig: 0, gesamt: 0, zuviel: 0 };
}

module.exports = { gleicheAb, pruefeLesen, pruefeGraphForm, KRITERIEN, AEQUIVALENZEN };
