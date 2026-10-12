'use strict';
// Startpunkt: Konfiguration laden (Abbruch mit lesbarer Meldung), App erzeugen, Port öffnen.
// Datenbank folgt in Task 3.

const { ladeKonfig } = require('./kern/konfig');
const { erzeugeApp } = require('./app');

let konfig;
try {
  konfig = ladeKonfig();
} catch (err) {
  console.error(`Start abgebrochen. ${err.message}`);
  process.exit(1);
}

const app = erzeugeApp(konfig, null);
app.listen(konfig.port, () => {
  console.log(`Datendetektei läuft auf Port ${konfig.port}`);
});
