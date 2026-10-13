'use strict';
/*
 * Datendetektei – Modellierungs-Kern (Plan Phase 5 Task 1): Sammelexport der reinen Funktionen aus src/er.
 * Schnittstellen siehe die Dateiköpfe von namen.js, abgleich.js, schema.js, zerlegung.js, zuordnung.js.
 * Keine Abhängigkeit von src/sql; nur Server (Lösungsdaten verlassen den Server nie).
 */

module.exports = {
  ...require('./namen'),
  ...require('./abgleich'),
  ...require('./schema'),
  ...require('./zerlegung'),
  ...require('./zuordnung'),
};
