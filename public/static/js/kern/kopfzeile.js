'use strict';
// Kopfzeile aller Seiten (DESIGN.md §5): Anzeigename und Abmelden aus /api/ich, Link „⌂ Portal“ auf die
// Portal-Adresse (angemeldet aus /api/ich, sonst aus dem Manifest /api/plattform → auth.portal), Hell/Dunkel-Umschalter.
// Stellt window.DD bereit (ich, plattform, el, icon) für die Seitenskripte, die danach geladen werden.
// Ausgaben nur als Textknoten (textContent/createElement).
(function () {
  const DD = (window.DD = window.DD || {});
  const SPRITE = '/static/img/icons.svg#';
  const ROLLEN = { schueler: 'Schülerkonto', lehrkraft: 'Lehrkraft', superadmin: 'Admin' };

  function holeJson(url) {
    return fetch(url, { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
  }

  /** Element mit Klasse und Text (Text immer als Textknoten). */
  DD.el = function el(tag, klasse, text) {
    const e = document.createElement(tag);
    if (klasse) e.className = klasse;
    if (text !== undefined && text !== null) e.textContent = String(text);
    return e;
  };

  /** SVG-Icon aus dem Sprite. */
  DD.icon = function icon(name, klasse) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'icon' + (klasse ? ' ' + klasse : ''));
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS(ns, 'use');
    use.setAttribute('href', SPRITE + name);
    svg.appendChild(use);
    return svg;
  };

  DD.ich = holeJson('/api/ich');
  DD.plattform = holeJson('/api/plattform');

  const $ = (id) => document.getElementById(id);

  /* ---------- Hell/Dunkel ---------- */
  const wurzel = document.documentElement;
  const dunkelAbfrage = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function aktuellesThema() {
    const t = wurzel.getAttribute('data-theme');
    if (t === 'light' || t === 'dark') return t;
    return dunkelAbfrage && dunkelAbfrage.matches ? 'dark' : 'light';
  }
  function zeigeThema() {
    const knopf = $('thema-knopf');
    if (!knopf) return;
    const dunkel = aktuellesThema() === 'dark';
    const text = dunkel ? 'Helles Design einschalten' : 'Dunkles Design einschalten';
    knopf.setAttribute('aria-label', text);
    knopf.title = text;
    const use = knopf.querySelector('use');
    if (use) use.setAttribute('href', SPRITE + (dunkel ? 'i-sonne' : 'i-mond'));
  }
  function themaUmschalten() {
    const neu = aktuellesThema() === 'dark' ? 'light' : 'dark';
    wurzel.setAttribute('data-theme', neu);
    try {
      window.localStorage.setItem('dd-thema', neu);
    } catch (e) {
      /* nicht merkbar – gilt bis zum Neuladen */
    }
    zeigeThema();
  }

  /* ---------- Portal-Links ---------- */
  function sicherePortalUrl(u) {
    if (typeof u !== 'string') return null;
    try {
      const url = new URL(u);
      return url.protocol === 'https:' || url.protocol === 'http:' ? url.origin + url.pathname.replace(/\/+$/, '') : null;
    } catch (e) {
      return null;
    }
  }
  function setzePortal(portalUrl) {
    const basis = sicherePortalUrl(portalUrl);
    if (!basis) return;
    const link = $('portal-link');
    if (link) {
      link.href = basis + '/';
      link.hidden = false;
    }
    document.querySelectorAll('a[data-portal-pfad]').forEach((a) => {
      const pfad = a.getAttribute('data-portal-pfad') || '/';
      a.href = basis + (pfad.startsWith('/') ? pfad : '/' + pfad);
      a.hidden = false;
    });
    document.querySelectorAll('[data-ohne-portal]').forEach((e) => {
      e.hidden = true;
    });
  }

  /* ---------- Ich ---------- */
  function initialen(name) {
    const teile = String(name).trim().split(/\s+/).filter(Boolean);
    const zeichen = teile.slice(0, 2).map((t) => t.charAt(0).toUpperCase());
    return zeichen.join('') || '?';
  }
  function zeigeIch(ich) {
    const anmelden = $('kopf-anmelden');
    const block = $('ich');
    if (!ich) {
      if (anmelden) {
        const pfad = window.location.pathname;
        if (pfad !== '/' && !pfad.startsWith('/sso/')) anmelden.href = '/sso/start?ziel=' + encodeURIComponent(pfad);
        anmelden.hidden = false;
      }
      return;
    }
    if (block) {
      $('ich-name').textContent = ich.name;
      $('ich-initialen').textContent = initialen(ich.name);
      $('ich-rolle').textContent = ROLLEN[ich.rolle] || '';
      const knopf = block.querySelector('summary');
      if (knopf) knopf.setAttribute('aria-label', 'Konto von ' + ich.name);
      const lk = $('ich-lehrkraft');
      if (lk) lk.hidden = !(ich.rolle === 'lehrkraft' || ich.rolle === 'superadmin');
      block.hidden = false;
    }
    const kurs = $('kopf-kurs');
    const kurse = Array.isArray(ich.kurse) ? ich.kurse : [];
    if (kurs && kurse.length === 1) {
      kurs.textContent = 'Kurs ';
      kurs.appendChild(DD.el('strong', null, kurse[0].name));
    } else if (kurs && kurse.length > 1) {
      kurs.textContent = kurse.length + ' Kurse';
    }
  }

  function start() {
    const knopf = $('thema-knopf');
    if (knopf) knopf.addEventListener('click', themaUmschalten);
    if (dunkelAbfrage && dunkelAbfrage.addEventListener) dunkelAbfrage.addEventListener('change', zeigeThema);
    zeigeThema();

    // Ich-Menü schließen: Escape oder Klick daneben
    const ich = $('ich');
    if (ich) {
      document.addEventListener('click', (e) => {
        if (ich.open && !ich.contains(e.target)) ich.open = false;
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && ich.open) {
          ich.open = false;
          const s = ich.querySelector('summary');
          if (s) s.focus();
        }
      });
    }

    // aktuelle Seite in der Fußzeile markieren
    document.querySelectorAll('.fuss nav a[href^="/"]:not([data-portal-pfad]), .lern-nav a[href^="/"]').forEach((a) => {
      if (a.getAttribute('href') === window.location.pathname) a.setAttribute('aria-current', 'page');
    });

    DD.ich.then((daten) => {
      zeigeIch(daten);
      if (daten && daten.portalUrl) setzePortal(daten.portalUrl);
      else DD.plattform.then((m) => setzePortal(m && m.auth && m.auth.portal));
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
