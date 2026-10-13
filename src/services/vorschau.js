'use strict';
// Vorschau aller Inhalte für Lehrkräfte und Superadmin (Plan Phase 6 Task 3, Spec §7.11): Akten, Ermittlungen,
// Aufgaben und Verhör-Pools – je Aufgabe mit Musterlösung, Erklärung, allen Tipps und Kernpunkten.
// Lösungsfreiheit: Diese Daten liefern ausschließlich die Lehrkraft-Routen (Rechte prüft src/routes/lehrkraft_auswertung.js);
// die Sicht für Schüler bleibt inhalte.aufgabeOeffentlich ohne Lösungsteil.
//
// Sichtbarkeit: Alle geladenen Akten werden gezeigt (auch eA-Inhalte im gA-Kurs), jeweils mit sichtbar: true|false für
// das Kurs-Niveau und freigeschaltet: true|false (Akten-Schalter des Kurses).

const F = require('../content/format');
const { niveauSichtbar } = require('./stand');

function erzeugeVorschau({ inhalte, stand }) {
  function aufgabeKurz(a, niveau) {
    return {
      id: a.id,
      titel: a.titel,
      stufe: a.stufe,
      punkte: a.punkte,
      kategorie: a.kategorie,
      niveau: a.niveau,
      fallen: Array.isArray(a.fallen) ? [...a.fallen] : [],
      sichtbar: niveauSichtbar(niveau, a.niveau)
    };
  }

  /** Übersicht für GET …/vorschau; null bei unbekanntem Kurs. */
  function uebersicht(kursId) {
    const k = stand.kurs(kursId);
    if (!k) return null;
    const { niveau } = k.einstellungen;
    const akten = inhalte.akten().map((akte) => {
      const boss = akte.boss && akte.boss.pool.length ? akte.boss : null;
      return {
        nr: akte.nr,
        titel: akte.titel,
        farbe: akte.farbe || null,
        freigeschaltet: stand.istFreigeschaltet(k.einstellungen, akte.nr),
        sichtbar: stand.akteSichtbar(akte, niveau),
        ermittlungen: akte.levels.map((l) => {
          const cc = l.coldCase ? inhalte.aufgabe(l.coldCase) : null;
          return {
            id: l.id,
            nr: l.nr,
            titel: l.titel,
            niveau: l.niveau,
            ds: Array.isArray(l.ds) ? [...l.ds] : [],
            sichtbar: niveauSichtbar(niveau, l.niveau),
            maxPunkte: l.maxPunkte,
            aufgaben: l.aufgaben.map((id) => aufgabeKurz(inhalte.aufgabe(id), niveau)),
            coldCase: cc ? aufgabeKurz(cc, niveau) : null
          };
        }),
        verhoer: boss
          ? {
              id: boss.id || `A${akte.nr}-V`,
              titel: boss.titel || `Verhör ${akte.nr}`,
              niveau: boss.niveau || 'alle',
              dauerMin: Number.isFinite(boss.dauerMin) ? boss.dauerMin : null,
              anzahl: Number.isFinite(boss.anzahl) ? boss.anzahl : null,
              mix: boss.mix && typeof boss.mix === 'object' ? { ...boss.mix } : null,
              kontextDb: typeof boss.kontextDb === 'string' ? boss.kontextDb : null,
              pool: boss.pool.map((id) => aufgabeKurz(inhalte.aufgabe(id), niveau))
            }
          : null
      };
    });
    return { kurs: { id: k.id, name: k.name, niveau, aktiv: k.aktiv }, akten };
  }

  /** Lösungsteil wie nach dem Lösen (lernen.js): Musterlösung, Erklärung, Kernpunkte. */
  function loesungsteil(a) {
    const teile = F.teile(a);
    const kern = teile.map((t) => (F.artVon(t.interaktion) === 'kernpunkte' ? [...(t.interaktion.kernpunkte || [])] : null));
    const out = { loesung: a.loesung === undefined ? null : structuredClone(a.loesung), erklaerung: structuredClone(a.erklaerung || []) };
    if (kern.some(Boolean)) out.kernpunkte = Array.isArray(a.interaktion) ? kern : kern[0];
    return out;
  }

  /** Eine Aufgabe für GET …/vorschau/aufgaben/:id; null bei unbekanntem Kurs oder unbekannter Aufgabe. */
  function aufgabe(kursId, id) {
    const k = stand.kurs(kursId);
    const a = k ? inhalte.aufgabe(String(id)) : null;
    if (!a) return null;
    const akte = inhalte.akte(a.akte);
    const l = a.ermittlung ? inhalte.ermittlung(a.ermittlung) : null;
    const niveau = k.einstellungen.niveau;
    return {
      aufgabe: inhalte.aufgabeOeffentlich(a.id),
      art: a.art,
      sichtbar: niveauSichtbar(niveau, a.niveau) && (!l || niveauSichtbar(niveau, l.niveau)),
      ort: {
        akte: akte ? { nr: akte.nr, titel: akte.titel, farbe: akte.farbe || null } : null,
        ermittlung: l ? { id: l.id, nr: l.nr, titel: l.titel } : null
      },
      tipps: Array.isArray(a.tipps) ? [...a.tipps] : [],
      loesung: loesungsteil(a)
    };
  }

  return { uebersicht, aufgabe };
}

module.exports = { erzeugeVorschau };
