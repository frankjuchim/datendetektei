// Seite /lehrkraft/live: Kurs wählen (wie die Schülerseiten: ?kurs=, gemerkt, Auswahl bei mehreren Kursen) und die
// Live-Steuerung (steuerung.js) für diesen Kurs zeigen. Nur Lehrkraft/Superadmin (Route). Kopf-Navigation wie /lehrkraft
// (Verwaltung nur Superadmin); „Lehrkraft-Bereich“ führt zum Kurs-Reiter „Live“.

const V = new URL(import.meta.url).search;
const [A, S] = await Promise.all([import('../kern/api.js' + V), import('./steuerung.js' + V)]);

const ziel = document.getElementById('live-steuerung');
const ich = window.DD && window.DD.ich ? await window.DD.ich.catch(() => null) : null;
if (ich && ich.rolle === 'superadmin') for (const a of document.querySelectorAll('#lk-nav [data-nur-admin]')) a.hidden = false;
const kontext = await A.kursKontext(ziel);
const zumKurs = document.getElementById('lk-zum-kurs');
if (kontext && zumKurs) zumKurs.href = `/lehrkraft#/kurs/${encodeURIComponent(kontext.kurs.id)}/live`;
if (kontext) await S.zeigeLiveSteuerung(ziel, { kursId: kontext.kurs.id, kursName: kontext.kurs.name || '' });
