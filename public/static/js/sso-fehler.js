'use strict';
// SSO-Fehlerseite: zeigt den Abschnitt zum festen Fehlercode, den der Server in data-fehler einsetzt
// (ungueltig | keine_berechtigung | abgebrochen). Keine Texte aus der Adresse, kein HTML aus Zeichenketten.
(function () {
  var main = document.getElementById('sso-fehler');
  if (!main) return;
  var code = main.getAttribute('data-fehler');
  var abschnitte = main.querySelectorAll('section[data-fall]');
  var gefunden = false;
  for (var i = 0; i < abschnitte.length; i++) {
    if (abschnitte[i].getAttribute('data-fall') === code) {
      abschnitte[i].hidden = false;
      gefunden = true;
    }
  }
  if (!gefunden && abschnitte.length) abschnitte[0].hidden = false;
})();
