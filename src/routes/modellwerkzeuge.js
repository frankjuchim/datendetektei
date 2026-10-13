'use strict';
// Werkzeugseiten der Modellierung (Plan Phase 5 Task 4, DESIGN.md §5.7, §5.8): GET /werkzeug/bauplan (Bauplan-Tisch,
// ER-Editor in Chen-Notation) und GET /werkzeug/werkbank (Schema-Werkbank). Öffentlich wie die Eisdiele-Werkzeuge:
// Die Seiten brauchen keine Datenbank, prüfen nichts und enthalten keine Aufgaben – der Entwurf bleibt im
// localStorage des Geräts. Nur genau diese Pfade (groß/klein und Schrägstrich am Ende zählen).

const express = require('express');
const { PUBLIC_DIR } = require('./seiten');

const SEITEN = {
  '/werkzeug/bauplan': 'bauplan.html',
  '/werkzeug/werkbank': 'werkbank.html'
};

function modellWerkzeugRouten() {
  const router = express.Router({ caseSensitive: true, strict: true });
  for (const [pfad, datei] of Object.entries(SEITEN)) {
    router.get(pfad, (req, res) => {
      res.set('Cache-Control', 'no-cache');
      res.sendFile(datei, { root: PUBLIC_DIR });
    });
  }
  return router;
}

module.exports = { modellWerkzeugRouten };
