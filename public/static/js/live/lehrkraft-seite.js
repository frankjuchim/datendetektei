// Seite /lehrkraft/live: Kurs wählen (wie die Schülerseiten: ?kurs=, gemerkt, Auswahl bei mehreren Kursen) und die
// Live-Steuerung (steuerung.js) für diesen Kurs zeigen. Nur Lehrkraft/Superadmin (Route).

const V = new URL(import.meta.url).search;
const [A, S] = await Promise.all([import('../kern/api.js' + V), import('./steuerung.js' + V)]);

const ziel = document.getElementById('live-steuerung');
const kontext = await A.kursKontext(ziel);
if (kontext) await S.zeigeLiveSteuerung(ziel, { kursId: kontext.kurs.id, kursName: kontext.kurs.name || '' });
