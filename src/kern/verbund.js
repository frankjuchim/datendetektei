'use strict';
// Verbund-API nach Vertrag §6 / INTEGRATION §4: Bearer-Token vom Portal (sub „portal“, zweck exakt, ≤ 60 s,
// jti einmalig in eigenem Speicher). Jeder Fehler → 401 { error: 'Token ungültig.' } ohne Details.

const { pruefe } = require('./jwt');

const VERBUND_MAX_DAUER_SEK = 60;
const SUB_MUSTER = /^[asl]:\d+$/;
const KURS_MUSTER = /^k:\d+$/;

/** Middleware: prüft das Verbund-Token für genau einen zweck; hängt req.verbund (Nutzlast) an. */
function verbundAuth(konfig, jtiSpeicher, zweck) {
  return function verbund(req, res, next) {
    const m = /^Bearer ([A-Za-z0-9_\-.]+)$/.exec(req.get('authorization') || '');
    const jetztSek = Math.floor(konfig.jetzt() / 1000);
    const p = m
      ? pruefe(m[1], konfig.portalPublicKey, {
          iss: konfig.portalUrl,
          aud: konfig.plattformId,
          maxDauerSek: VERBUND_MAX_DAUER_SEK,
          jetztSek
        })
      : { ok: false };
    const gueltig =
      p.ok &&
      p.nutzlast.sub === 'portal' &&
      p.nutzlast.zweck === zweck &&
      jtiSpeicher.merke(p.nutzlast.jti, p.nutzlast.exp, jetztSek);
    if (!gueltig) return res.status(401).json({ error: 'Token ungültig.' });
    req.verbund = p.nutzlast;
    next();
  };
}

const istObjekt = (b) => b !== null && typeof b === 'object' && !Array.isArray(b);

/** Body von /loeschen: genau eines von sub oder kurs. Liefert { sub } | { kurs } | null. */
function pruefeLoeschAuftrag(body) {
  if (!istObjekt(body)) return null;
  const hatSub = body.sub !== undefined;
  const hatKurs = body.kurs !== undefined;
  if (hatSub === hatKurs) return null;
  if (hatSub) return typeof body.sub === 'string' && SUB_MUSTER.test(body.sub) ? { sub: body.sub } : null;
  return typeof body.kurs === 'string' && KURS_MUSTER.test(body.kurs) ? { kurs: body.kurs } : null;
}

/** Body von /kurse/:kursId: name (String 1–100) und aktiv (boolean) optional. Liefert die Änderung oder null. */
function pruefeKursAenderung(body) {
  if (!istObjekt(body)) return null;
  const aenderung = {};
  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || body.name.length < 1 || body.name.length > 100) return null;
    aenderung.name = body.name;
  }
  if (body.aktiv !== undefined) {
    if (typeof body.aktiv !== 'boolean') return null;
    aenderung.aktiv = body.aktiv;
  }
  return aenderung;
}

const istKursId = (id) => typeof id === 'string' && KURS_MUSTER.test(id);

module.exports = { VERBUND_MAX_DAUER_SEK, verbundAuth, pruefeLoeschAuftrag, pruefeKursAenderung, istKursId };
