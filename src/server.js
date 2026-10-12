'use strict';
// Startpunkt: Konfiguration laden, App erzeugen, Port öffnen.
// Platzhalter bis Task 2/3: Konfiguration und Datenbank folgen dort.

const { erzeugeApp } = require('./app');

const konfig = { port: Number(process.env.PORT) || 3000, trustProxy: 0 };
const app = erzeugeApp(konfig, null);
app.listen(konfig.port, () => {
  console.log(`Datendetektei läuft auf Port ${konfig.port}`);
});
