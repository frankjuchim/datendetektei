'use strict';
// Gemerkte Hell/Dunkel-Wahl vor dem ersten Zeichnen anwenden (synchron im <head>, kein Inline-Skript).
// Ohne gemerkte Wahl folgt die Seite prefers-color-scheme (tokens.css). Der Umschalter steht in kopfzeile.js.
(function () {
  try {
    var wahl = window.localStorage.getItem('dd-thema');
    if (wahl === 'light' || wahl === 'dark') document.documentElement.setAttribute('data-theme', wahl);
  } catch (e) {
    /* localStorage gesperrt (privater Modus): Systemeinstellung gilt */
  }
})();
