'use strict';
// Zugriff auf seed/datenbanken/namen.json inkl. Sperrlisten (LIESMICH §6 „Namen“).
// Reservierte Nachnamen (Story-Figuren), gesperrte Kombinationen, die reservierte Kombination
// Jahrgang 1988 + Hafenviertel und reservierte Adressen werden nie zusätzlich erzeugt.

const path = require('node:path');
const fs = require('node:fs');

const NAMEN_DATEI = path.join(__dirname, '..', '..', 'seed', 'datenbanken', 'namen.json');

function klein(text) {
  return String(text).toLocaleLowerCase('de');
}

function schluessel(vorname, nachname) {
  return `${vorname} ${nachname}`;
}

/** Normalisiert 'Vorname Nachname' bzw. { vorname, nachname } zu 'Vorname Nachname'. */
function alsName(eintrag) {
  return typeof eintrag === 'string' ? eintrag : schluessel(eintrag.vorname, eintrag.nachname);
}

/**
 * Lädt die Namensbausteine. `daten` (optional) ersetzt namen.json, z. B. in Tests.
 * Liefert ein Objekt mit den Listen und Hilfen zum Ziehen von Personen und Adressen.
 */
function ladeNamen(daten) {
  const quelle = daten || JSON.parse(fs.readFileSync(NAMEN_DATEI, 'utf8'));
  const reserviert = new Set((quelle.reservierteNachnamen || []).map(klein));
  const gesperrt = new Set((quelle.gesperrteKombinationen || []).map((k) => klein(alsName(k))));
  const reservierteAdressen = [...(quelle.reservierteAdressen || [])];
  const reservierteKombinationen = [...(quelle.reservierteKombinationen || [])];
  const strassen = quelle.strassen || {};

  const istReservierterNachname = (nachname) => reserviert.has(klein(nachname));
  const istGesperrt = (vorname, nachname) => gesperrt.has(klein(schluessel(vorname, nachname)));

  const namen = {
    vornamen: [...quelle.vornamen],
    /** Ziehliste der Nachnamen – reservierte Nachnamen sind herausgefiltert. */
    nachnamen: quelle.nachnamen.filter((n) => !istReservierterNachname(n)),
    reservierteNachnamen: [...(quelle.reservierteNachnamen || [])],
    reservierteAdressen,
    reservierteKombinationen,
    strassen,
    istReservierterNachname,
    istGesperrt,

    /** false für reservierte Kombinationen (Jahrgang 1988 + Hafenviertel). */
    kombinationErlaubt(jahrgang, stadtteil) {
      return !reservierteKombinationen.some((k) => k.jahrgang === jahrgang && k.stadtteil === stadtteil);
    },

    /** Finder-Schreibweise im Fundbuero: 'V. Nachname'. */
    finder: (vorname, nachname) => `${vorname[0]}. ${nachname}`,

    /** Finder-Regel: Initial N mit Nachname auf F gesperrt, ebenso alles mit „falter“. */
    finderErlaubt(text) {
      if (/falter/i.test(text)) return false;
      const m = /^(\S)\. (\S)/.exec(text);
      return !(m && m[1] === 'N' && m[2] === 'F');
    },

    /**
     * Zieht Personen mit in der DB neuer Kombination aus Vor- und Nachname.
     * `belegt`: schon vorhandene Namen ('Vorname Nachname' oder { vorname, nachname }), z. B. aus pflicht.sql.
     * `ohneVornamen`: Vornamen, die nicht vorkommen dürfen (z. B. 'Merle' in Detektei).
     */
    erzeugePersonen(zufall, { belegt = [], ohneVornamen = [] } = {}) {
      const vergeben = new Set(belegt.map((b) => klein(alsName(b))));
      const verboteneVornamen = new Set(ohneVornamen.map(klein));
      const vornamen = namen.vornamen.filter((v) => !verboteneVornamen.has(klein(v)));
      const frei = (v, n) => !vergeben.has(klein(schluessel(v, n))) && !istGesperrt(v, n);
      return {
        naechste() {
          for (let i = 0; i < 200; i++) {
            const v = zufall.waehle(vornamen);
            const n = zufall.waehle(namen.nachnamen);
            if (frei(v, n)) {
              vergeben.add(klein(schluessel(v, n)));
              return { vorname: v, nachname: n };
            }
          }
          // Fallback deterministisch: erste freie Kombination in fester Reihenfolge ab einer Zufallsposition
          const start = zufall.ganz(0, vornamen.length * namen.nachnamen.length - 1);
          const gesamt = vornamen.length * namen.nachnamen.length;
          for (let k = 0; k < gesamt; k++) {
            const idx = (start + k) % gesamt;
            const v = vornamen[Math.floor(idx / namen.nachnamen.length)];
            const n = namen.nachnamen[idx % namen.nachnamen.length];
            if (frei(v, n)) {
              vergeben.add(klein(schluessel(v, n)));
              return { vorname: v, nachname: n };
            }
          }
          throw new Error('erzeugePersonen: keine freie Namenskombination mehr');
        },
        /** Merkt einen Namen als vergeben (z. B. nach eigenem Einfügen). */
        merke(vorname, nachname) {
          vergeben.add(klein(schluessel(vorname, nachname)));
        },
        istVergeben: (vorname, nachname) => vergeben.has(klein(schluessel(vorname, nachname)))
      };
    },

    /**
     * Zieht Adressen '<Straße> <Hausnummer 1–40>' je Stadtteil; höchstens `maxJeAdresse` Vorkommen je Adresse,
     * reservierte Adressen nie. `belegt`: schon vorhandene Adressen (zählen mit).
     */
    erzeugeAdressen(zufall, { maxJeAdresse = 3, belegt = [] } = {}) {
      const zaehler = new Map();
      for (const a of belegt) zaehler.set(a, (zaehler.get(a) || 0) + 1);
      const gesperrteAdressen = new Set(reservierteAdressen);
      return {
        naechste(stadtteil) {
          const liste = strassen[stadtteil];
          if (!liste || liste.length === 0) throw new Error(`erzeugeAdressen: unbekannter Stadtteil ${stadtteil}`);
          for (let i = 0; i < 1000; i++) {
            const adresse = `${zufall.waehle(liste)} ${zufall.ganz(1, 40)}`;
            if (gesperrteAdressen.has(adresse)) continue;
            if ((zaehler.get(adresse) || 0) >= maxJeAdresse) continue;
            zaehler.set(adresse, (zaehler.get(adresse) || 0) + 1);
            return adresse;
          }
          throw new Error(`erzeugeAdressen: keine freie Adresse im Stadtteil ${stadtteil}`);
        }
      };
    }
  };
  return namen;
}

module.exports = { ladeNamen, NAMEN_DATEI };
