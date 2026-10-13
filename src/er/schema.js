'use strict';
/*
 * Datendetektei – Schema-Abgleich für die Schema-Werkbank (Plan Phase 5 Task 1; Spec §7.6.5; Überführungsregeln
 * R1–R6, DS_PLANUNG DS 11). Reine Funktionen, keine Abhängigkeiten außer src/er, nur Server.
 *
 * Schema-Format wie Block `schema` (docs/AUFGABENFORMAT.md §5.3):
 *   relationen = [{ name, attribute: [{ name, pk?: true, fk?: '<Zielrelation>' | true }] }]
 *   Überall wird auch { relationen } angenommen.
 *
 * gleicheSchemaAb(schueler, muster, { synonyme? }) →
 *   { geloest, relationen: [{ name, ok, hinweise: [{ code, text, falle }] }], fehlend, ueberzaehlig,
 *     hinweise: [{ code, text, falle }] }
 *   schueler = relationen bzw. { relationen }
 *   muster   = Liste zulässiger Musterschemata [relationen | { relationen }, …]; ein einzelnes Schema geht auch.
 *   Die beste Musterlösung zählt (gelöst vor meisten richtigen Relationen vor wenigsten Hinweisen; Diagnosen
 *   NM_OHNE_TABELLE/FK_FALSCHE_SEITE zählen nicht als Abzug und entscheiden Gleichstände).
 *   relationen: je Schülerrelation (Reihenfolge und Namen wie abgegeben); fehlend/ueberzaehlig: Anzahl Relationen.
 *   Zuordnung der Relationen: Name (mit Synonymen, Groß/Klein, Plural) bzw. Attributmenge (Jaccard ≥ 0,5),
 *   optimal per ungarischer Methode. Je zugeordneter Relation werden die Attribute gepaart: Name (Synonyme) →
 *   Fremdschlüssel mit derselben Zielrelation (FK-Namen nach Rolle frei: LeiterNr = ErmittlerNr, BekannterNr =
 *   Person2Nr) → einzelner künstlicher Primärschlüssel (FallID = FallNr). fk: true heißt „Ziel egal“.
 *   Hinweiscodes (Texte nennen nur Namen, die der Schüler selbst verwendet hat):
 *     PK_FALSCH (P8), PK_ZUSAMMENGESETZT_FEHLT (P9), FK_FEHLT (P9), FK_ZIEL (P7), FK_FALSCHE_SEITE (P9; auch für einen
 *     Fremdschlüssel einer n:m-Beziehung in einer Entitätsrelation, dann mit n:m-Text und zusätzlich NM_OHNE_TABELLE),
 *     FK_ZUVIEL (P9), ATTRIBUT_FEHLT (P9), ATTRIBUT_ZUVIEL (P9), RELATION_UEBERZAEHLIG (P9);
 *     gesamt: RELATION_FEHLT (P9), NM_OHNE_TABELLE (P9, eine fehlende Relation hat einen Primärschlüssel aus ≥ 2
 *     Fremdschlüsseln, d. h. eine n:m- oder ternäre Beziehung blieb ohne eigene Relation).
 *   geloest = mindestens eine Relation, alle ok, nichts fehlt, nichts überzählig.
 *
 * pruefeSchemaForm(schema) → fehler[] (deutsche Texte; leer = in Ordnung)
 *   ≤ 30 Relationen, je 1–30 Attribute, Namen 1–40 Zeichen, Relationen- und Attributnamen je Relation nicht doppelt
 *   (ohne Groß/Klein), pk boolean, fk true oder Name einer vorhandenen Relation.
 *
 * HINWEISE = { CODE: { falle, text(…) } }
 */

const { kanonisch, kuenstlich } = require('./namen');
const { ordneZu } = require('./zuordnung');

const MAX_RELATIONEN = 30;
const MAX_ATTRIBUTE = 30;
const MAX_NAME = 40;

const q = (s) => `„${s}“`;

const HINWEISE = {
  PK_FALSCH: { falle: 'P8', text: (r) => `Der Primärschlüssel von ${q(r)} passt nicht: Er muss jeden Datensatz eindeutig bestimmen und minimal sein.` },
  PK_ZUSAMMENGESETZT_FEHLT: { falle: 'P9', text: (r) => `${q(r)} braucht einen zusammengesetzten Primärschlüssel – ein einzelnes Attribut bestimmt die Datensätze hier nicht eindeutig.` },
  FK_FEHLT: {
    falle: 'P9',
    text: (r, a) => (a
      ? `${q(a)} in ${q(r)} verweist auf eine andere Relation – markiere es als Fremdschlüssel (↑) mit Zielrelation.`
      : `In ${q(r)} fehlt ein Fremdschlüssel.`),
  },
  FK_ZIEL: { falle: 'P7', text: (r, a) => `Der Fremdschlüssel ${q(a)} in ${q(r)} verweist auf die falsche Relation.` },
  FK_FALSCHE_SEITE: {
    falle: 'P9',
    text: (r, a, nm) => (nm
      ? `Der Fremdschlüssel ${q(a)} gehört nicht in ${q(r)}: Die Beziehung ist n:m – auf keiner Seite passt ein einzelner Wert, sie braucht eine eigene Relation.`
      : `Der Fremdschlüssel ${q(a)} in ${q(r)} steht auf der falschen Seite: Bei einer 1:n-Beziehung gehört er in die Relation der n-Seite.`),
  },
  FK_ZUVIEL: { falle: 'P9', text: (r, a) => `${q(a)} in ${q(r)} ist hier kein Fremdschlüssel.` },
  ATTRIBUT_FEHLT: { falle: 'P9', text: (r, n) => (n === 1 ? `In ${q(r)} fehlt 1 Attribut.` : `In ${q(r)} fehlen ${n} Attribute.`) },
  ATTRIBUT_ZUVIEL: { falle: 'P9', text: (r, a) => `${q(a)} gehört nicht in ${q(r)}.` },
  RELATION_UEBERZAEHLIG: { falle: 'P9', text: (r) => `${q(r)} passt zu keiner geforderten Relation.` },
  RELATION_FEHLT: { falle: 'P9', text: (n) => (n === 1 ? '1 Relation fehlt.' : `${n} Relationen fehlen.`) },
  NM_OHNE_TABELLE: {
    falle: 'P9',
    text: () => 'Eine n:m-Beziehung (oder eine ternäre Beziehung) braucht eine eigene Relation mit zusammengesetztem Primärschlüssel – sie fehlt.',
  },
};

/** Hinweise, die einen Fehler fachlich benennen statt einen weiteren zu zählen (Tie-Break in gleicheSchemaAb). */
const TREFFEND = new Set(['NM_OHNE_TABELLE', 'FK_FALSCHE_SEITE']);

function hinweis(code, ...args) {
  return { code, text: HINWEISE[code].text(...args), falle: HINWEISE[code].falle };
}

const istObjekt = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const textVon = (x) => (typeof x === 'string' ? x.trim() : '');

/** Schema in sichere Form: [{ name, attribute:[{ name, pk, fk }] }]. */
function bereinige(schema) {
  const liste = Array.isArray(schema) ? schema : istObjekt(schema) && Array.isArray(schema.relationen) ? schema.relationen : [];
  const aus = [];
  for (const r of liste) {
    if (!istObjekt(r)) continue;
    const attribute = [];
    for (const a of Array.isArray(r.attribute) ? r.attribute : []) {
      if (!istObjekt(a) || !textVon(a.name)) continue;
      const fk = typeof a.fk === 'string' && a.fk.trim() ? a.fk.trim() : a.fk === true ? true : null;
      attribute.push({ name: textVon(a.name), pk: a.pk === true, fk });
    }
    aus.push({ name: textVon(r.name), attribute });
  }
  return aus;
}

function musterListe(muster) {
  if (Array.isArray(muster)) {
    if (!muster.length) return [];
    const einzeln = muster.every((r) => istObjekt(r) && !Array.isArray(r.relationen) && 'attribute' in r);
    return einzeln ? [bereinige(muster)] : muster.map(bereinige).filter((s) => s.length);
  }
  if (istObjekt(muster) && Array.isArray(muster.relationen)) return [bereinige(muster)];
  return [];
}

/** Index der Relation zu einem Zielnamen (kanonisch) oder -1. */
function relationZu(schema, ziel, synonyme) {
  if (typeof ziel !== 'string') return -1;
  const k = kanonisch(ziel, synonyme);
  return schema.findIndex((r) => kanonisch(r.name, synonyme) === k);
}

function jaccard(a, b) {
  if (!a.size && !b.size) return 0;
  let schnitt = 0;
  for (const x of a) if (b.has(x)) schnitt++;
  return schnitt / (a.size + b.size - schnitt);
}

/** Relationen zuordnen: ergebnis[iMuster] = iSchueler oder -1. */
function ordneRelationenZu(schueler, muster, synonyme) {
  const attrMenge = (r) => new Set(r.attribute.map((a) => kanonisch(a.name, synonyme)));
  const sm = schueler.map(attrMenge);
  const gewichte = muster.map((m) => {
    const mm = attrMenge(m);
    const km = kanonisch(m.name, synonyme);
    return schueler.map((s, j) => {
      const j2 = jaccard(mm, sm[j]);
      const name = km && kanonisch(s.name, synonyme) === km;
      if (name) return 1000 + Math.round(j2 * 100);
      return j2 >= 0.5 ? Math.round(j2 * 100) : 0;
    });
  });
  return ordneZu(gewichte);
}

/** Attribute einer zugeordneten Relation paaren: paar[iMusterAttr] = iSchuelerAttr oder -1. */
function paareAttribute(m, s, zielM, zielS, synonyme) {
  const paar = new Array(m.attribute.length).fill(-1);
  const frei = new Set(s.attribute.map((_, j) => j));
  // 1. Name
  m.attribute.forEach((a, i) => {
    const k = kanonisch(a.name, synonyme);
    for (const j of frei) {
      if (kanonisch(s.attribute[j].name, synonyme) === k) { paar[i] = j; frei.delete(j); break; }
    }
  });
  // 2. Fremdschlüssel mit derselben Zielrelation (Name nach Rolle frei)
  m.attribute.forEach((a, i) => {
    if (paar[i] !== -1 || zielM[i] < 0) return;
    for (const j of frei) {
      if (zielS[j] === zielM[i]) { paar[i] = j; frei.delete(j); break; }
    }
  });
  // 3. einzelner künstlicher Primärschlüssel
  const pkM = m.attribute.filter((a) => a.pk);
  const pkS = s.attribute.filter((a) => a.pk);
  if (pkM.length === 1 && pkS.length === 1) {
    const i = m.attribute.indexOf(pkM[0]);
    const j = s.attribute.indexOf(pkS[0]);
    if (paar[i] === -1 && frei.has(j) && kuenstlich(pkM[0].name) && kuenstlich(pkS[0].name)) { paar[i] = j; frei.delete(j); }
  }
  return { paar, frei };
}

function bewerte(schueler, muster, synonyme) {
  const zuordnung = ordneRelationenZu(schueler, muster, synonyme);
  const zuMuster = new Array(schueler.length).fill(-1);
  zuordnung.forEach((j, i) => { if (j >= 0) zuMuster[j] = i; });

  // Zielrelationen als Musterindex
  const zieleM = muster.map((r) => r.attribute.map((a) => (typeof a.fk === 'string' ? relationZu(muster, a.fk, synonyme) : a.fk === true ? -2 : -1)));
  const zieleS = schueler.map((r) => r.attribute.map((a) => {
    if (typeof a.fk !== 'string') return a.fk === true ? -2 : -1;
    const js = relationZu(schueler, a.fk, synonyme);
    if (js >= 0) return zuMuster[js] >= 0 ? zuMuster[js] : -3;
    return relationZu(muster, a.fk, synonyme) >= 0 ? relationZu(muster, a.fk, synonyme) : -3;
  }));

  const paarung = muster.map((m, i) => {
    const j = zuordnung[i];
    return j >= 0 ? paareAttribute(m, schueler[j], zieleM[i], zieleS[j], synonyme) : null;
  });
  /** fehlt in der zu Muster i gehörenden Schülerrelation ein FK auf Musterrelation x? */
  const fehltFkAuf = (i, x) => {
    const p = paarung[i];
    if (!p) return false;
    return muster[i].attribute.some((a, k) => zieleM[i][k] === x && p.paar[k] === -1);
  };

  /**
   * Gehört ein überzähliges Schülerattribut von Relation i (Muster) zu einer fehlenden Beziehungsrelation (n:m, ternär)?
   * Ja, wenn eine nicht zugeordnete Musterrelation einen FK auf i hat und einen weiteren FK, der zum Attribut passt
   * (gleiche Zielrelation ≠ i bzw. bei unmarkiertem Attribut gleicher Name).
   */
  const nmFremd = (i, b, ziel) => muster.some((r, x) => {
    if (zuordnung[x] >= 0) return false;
    const fks = r.attribute.map((a, k) => ({ name: a.name, ziel: zieleM[x][k] })).filter((f) => f.ziel >= 0);
    const k = fks.findIndex((f) => f.ziel === i);
    if (k < 0) return false;
    const andere = fks.filter((_, n) => n !== k);
    return ziel >= 0 ? andere.some((f) => f.ziel === ziel) : andere.some((f) => kanonisch(f.name, synonyme) === kanonisch(b.name, synonyme));
  });
  let nmFalscheSeite = false;

  const relationen = schueler.map((s, j) => {
    const i = zuMuster[j];
    if (i < 0) return { name: s.name, ok: false, hinweise: [hinweis('RELATION_UEBERZAEHLIG', s.name)] };
    const m = muster[i];
    const { paar, frei } = paarung[i];
    const h = [];
    // Primärschlüssel
    const pkM = new Set(m.attribute.map((a, k) => (a.pk ? k : -1)).filter((k) => k >= 0));
    const pkS = s.attribute.map((a, k) => (a.pk ? k : -1)).filter((k) => k >= 0);
    const pkSalsM = pkS.map((k) => paar.indexOf(k));
    const pkGleich = pkSalsM.length === pkM.size && pkSalsM.every((k) => k >= 0 && pkM.has(k));
    if (!pkGleich) h.push(pkM.size >= 2 && pkS.length <= 1 ? hinweis('PK_ZUSAMMENGESETZT_FEHLT', s.name) : hinweis('PK_FALSCH', s.name));
    // gepaarte Attribute: Fremdschlüssel
    m.attribute.forEach((a, k) => {
      const js = paar[k];
      if (js < 0) return;
      const b = s.attribute[js];
      if (a.fk && !b.fk) h.push(hinweis('FK_FEHLT', s.name, b.name));
      else if (!a.fk && b.fk) h.push(hinweis('FK_ZUVIEL', s.name, b.name));
      else if (a.fk && b.fk && zieleM[i][k] >= 0 && zieleS[j][js] !== -2 && zieleS[j][js] !== zieleM[i][k]) h.push(hinweis('FK_ZIEL', s.name, b.name));
    });
    // fehlende Musterattribute
    let fehlend = 0;
    m.attribute.forEach((a, k) => {
      if (paar[k] !== -1) return;
      if (a.fk) h.push(hinweis('FK_FEHLT', s.name));
      else fehlend++;
    });
    if (fehlend) h.push(hinweis('ATTRIBUT_FEHLT', s.name, fehlend));
    // überzählige Schülerattribute
    for (const js of frei) {
      const b = s.attribute[js];
      const ziel = zieleS[j][js];
      if (b.fk && ziel >= 0 && ziel !== i && fehltFkAuf(ziel, i)) h.push(hinweis('FK_FALSCHE_SEITE', s.name, b.name));
      else if (((b.fk && ziel >= 0) || (!b.fk && !b.pk)) && nmFremd(i, b, b.fk ? ziel : -1)) {
        nmFalscheSeite = true;
        h.push(hinweis('FK_FALSCHE_SEITE', s.name, b.name, true));
      }
      else h.push(hinweis('ATTRIBUT_ZUVIEL', s.name, b.name));
    }
    return { name: s.name, ok: h.length === 0, hinweise: h };
  });

  const fehlendeMuster = muster.filter((_, i) => zuordnung[i] < 0);
  const hinweise = [];
  if (fehlendeMuster.length) hinweise.push(hinweis('RELATION_FEHLT', fehlendeMuster.length));
  if (nmFalscheSeite || fehlendeMuster.some((r) => r.attribute.filter((a) => a.pk && a.fk).length >= 2)) hinweise.push(hinweis('NM_OHNE_TABELLE'));
  const ueberzaehlig = relationen.filter((_, j) => zuMuster[j] < 0).length;
  return {
    geloest: schueler.length > 0 && fehlendeMuster.length === 0 && relationen.every((r) => r.ok),
    relationen,
    fehlend: fehlendeMuster.length,
    ueberzaehlig,
    hinweise,
  };
}

function gleicheSchemaAb(schueler, muster, optionen = {}) {
  const synonyme = istObjekt(optionen) ? optionen.synonyme : undefined;
  const s = bereinige(schueler);
  const liste = musterListe(muster);
  let bestes = null;
  let bestWert = -Infinity;
  for (const m of liste) {
    const erg = bewerte(s, m, synonyme);
    // Diagnose-Hinweise (TREFFEND) sind keine zusätzlichen Fehler: Sie zählen nicht als Abzug und geben bei sonst
    // gleichem Stand den Ausschlag – so erscheint der fachlich treffendste Hinweis, das Urteil bleibt gleich.
    const alle = erg.relationen.flatMap((r) => r.hinweise).concat(erg.hinweise);
    const anzahl = alle.filter((h) => !TREFFEND.has(h.code)).length;
    const treffend = alle.filter((h) => TREFFEND.has(h.code)).length;
    const wert = (erg.geloest ? 1e6 : 0) + erg.relationen.filter((r) => r.ok).length * 1000 - (erg.fehlend + erg.ueberzaehlig) * 1000 - anzahl + treffend / 100;
    if (wert > bestWert) { bestWert = wert; bestes = erg; }
  }
  if (!bestes) {
    return {
      geloest: false,
      relationen: s.map((r) => ({ name: r.name, ok: false, hinweise: [] })),
      fehlend: 0,
      ueberzaehlig: 0,
      hinweise: [],
    };
  }
  return bestes;
}

function pruefeName(fehler, wo, name) {
  if (typeof name !== 'string' || !name.trim()) fehler.push(`${wo}: Name fehlt.`);
  else if (name.trim().length > MAX_NAME) fehler.push(`${wo}: Name länger als ${MAX_NAME} Zeichen.`);
}

function pruefeSchemaForm(schema) {
  const fehler = [];
  const liste = Array.isArray(schema) ? schema : istObjekt(schema) && Array.isArray(schema.relationen) ? schema.relationen : null;
  if (!liste) return ['Schema: Liste der Relationen fehlt.'];
  if (!liste.length) fehler.push('Schema: mindestens eine Relation nötig.');
  if (liste.length > MAX_RELATIONEN) fehler.push(`Schema: höchstens ${MAX_RELATIONEN} Relationen.`);
  const namen = new Set();
  liste.forEach((r, i) => {
    const wo = `Relation ${i + 1}`;
    if (!istObjekt(r)) { fehler.push(`${wo}: kein Objekt.`); return; }
    pruefeName(fehler, wo, r.name);
    if (typeof r.name === 'string' && r.name.trim()) {
      const k = r.name.trim().toLowerCase();
      if (namen.has(k)) fehler.push(`${wo}: Relationenname „${r.name.trim()}“ doppelt.`);
      namen.add(k);
    }
    if (!Array.isArray(r.attribute) || !r.attribute.length) { fehler.push(`${wo}: mindestens ein Attribut nötig.`); return; }
    if (r.attribute.length > MAX_ATTRIBUTE) fehler.push(`${wo}: höchstens ${MAX_ATTRIBUTE} Attribute.`);
    const attrNamen = new Set();
    r.attribute.forEach((a, k) => {
      const wa = `${wo}, Attribut ${k + 1}`;
      if (!istObjekt(a)) { fehler.push(`${wa}: kein Objekt.`); return; }
      pruefeName(fehler, wa, a.name);
      if (typeof a.name === 'string' && a.name.trim()) {
        const n = a.name.trim().toLowerCase();
        if (attrNamen.has(n)) fehler.push(`${wa}: Attributname „${a.name.trim()}“ doppelt.`);
        attrNamen.add(n);
      }
      if (a.pk !== undefined && typeof a.pk !== 'boolean') fehler.push(`${wa}: pk muss true oder false sein.`);
      if (a.fk !== undefined && a.fk !== null && a.fk !== true && a.fk !== false && typeof a.fk !== 'string') fehler.push(`${wa}: fk muss der Name einer Relation oder true sein.`);
    });
  });
  // Zielrelationen vorhanden?
  for (const r of liste) {
    if (!istObjekt(r) || !Array.isArray(r.attribute)) continue;
    for (const a of r.attribute) {
      if (istObjekt(a) && typeof a.fk === 'string' && !namen.has(a.fk.trim().toLowerCase())) {
        fehler.push(`Fremdschlüssel ${typeof a.name === 'string' ? a.name : '?'}: Zielrelation „${a.fk}“ gibt es nicht.`);
      }
    }
  }
  return fehler;
}

module.exports = { gleicheSchemaAb, pruefeSchemaForm, HINWEISE };
