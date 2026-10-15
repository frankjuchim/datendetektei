'use strict';
// Single Sign-on (Vertrag §5, INTEGRATION §3/§5) – Testfälle aus INTEGRATION §5 und Review Focus 1, 2, 3, 4.
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { testApp, ssoToken, neuesSchluesselpaar } = require('./helpers');
const { pruefeZiel, pruefeSsoNutzlast } = require('../src/kern/sso');

const jetztSek = () => Math.floor(Date.now() / 1000);

function setCookie(res, name) {
  return (res.headers['set-cookie'] || []).find((c) => c.startsWith(name + '='));
}
function cookiePaar(res, name) {
  const c = setCookie(res, name);
  return c ? c.split(';')[0] : '';
}

/** /sso/start aufrufen; liefert state (aus der Portal-URL) und das state-Cookie. */
async function starte(app, ziel) {
  const pfad = ziel === undefined ? '/sso/start' : '/sso/start?ziel=' + encodeURIComponent(ziel);
  const res = await request(app).get(pfad);
  assert.equal(res.status, 302);
  const state = new URL(res.headers.location).searchParams.get('state');
  return { res, state, cookie: cookiePaar(res, 'dd_sso_state') };
}

/** /sso/ende mit Query (Objekt) und optionalem Cookie aufrufen. */
function ende(app, query, cookie) {
  const r = request(app).get('/sso/ende?' + new URLSearchParams(query).toString());
  return cookie ? r.set('Cookie', cookie) : r;
}

/** Vollständiger Login; liefert Antwort von /sso/ende. */
async function login(t, ueberschreiben = {}, ziel = '/') {
  const s = await starte(t.app, ziel);
  const token = ssoToken(t.schluessel, t.konfig, ueberschreiben);
  return ende(t.app, { token, state: s.state, ziel }, s.cookie);
}

function anzahl(db, tabelle) {
  return db.prepare(`SELECT COUNT(*) AS n FROM ${tabelle}`).get().n;
}

/** Abgelehnt: Status, HTML-Fehlerseite, keine Sitzung, kein Konto. */
function assertAbgelehnt(res, db, status = 401, code = 'ungueltig') {
  assert.equal(res.status, status);
  assert.match(res.headers['content-type'], /text\/html/);
  assert.match(res.text, new RegExp(`data-fehler="${code}"`));
  assert.equal(setCookie(res, 'dd_s'), undefined, 'keine Sitzung');
  assert.equal(anzahl(db, 'konten'), 0, 'kein Konto angelegt');
}

/* ---------- /sso/start ---------- */

test('start setzt state-Cookie und leitet zum Portal', async () => {
  const t = testApp();
  const { res, state } = await starte(t.app, '/themen?akte=2');
  assert.ok(
    res.headers.location.startsWith(
      'https://labs.example/sso/autorisieren?plattform=datendetektei&ruecksprung=https%3A%2F%2Fdatendetektei.example%2Fsso%2Fende&state='
    ),
    res.headers.location
  );
  assert.match(state, /^[A-Za-z0-9_-]{22}$/);
  const url = new URL(res.headers.location);
  assert.deepEqual([...url.searchParams.keys()], ['plattform', 'ruecksprung', 'state', 'ziel']);
  assert.equal(url.searchParams.get('ziel'), '/themen?akte=2');
  const c = setCookie(res, 'dd_sso_state');
  assert.match(c, /Max-Age=600/);
  assert.match(c, /HttpOnly/);
  assert.match(c, /SameSite=Lax/);
  // zwei Starts → verschiedene states
  assert.notEqual((await starte(t.app, '/')).state, state);
});

test('start ohne ziel übergibt ziel=/', async () => {
  const t = testApp();
  const { res } = await starte(t.app);
  assert.equal(new URL(res.headers.location).searchParams.get('ziel'), '/');
});

test('state-Cookie ist im Betrieb Secure', async () => {
  const t = testApp({ erlaubeHttp: false });
  const { res } = await starte(t.app, '/');
  assert.match(setCookie(res, 'dd_sso_state'), /; Secure/);
});

/* ---------- INTEGRATION §5: gültiger Fall ---------- */

test('gültiges Token mit richtigem state', async () => {
  const t = testApp();
  const res = await login(t, {}, '/themen?akte=2');
  assert.equal(res.status, 302);
  assert.equal(res.headers.location, '/themen?akte=2');
  assert.ok(setCookie(res, 'dd_s'), 'Sitzung gesetzt');
  assert.match(setCookie(res, 'dd_s'), /Max-Age=2592000/);
  assert.deepEqual(t.db.prepare('SELECT sub, name, rolle FROM konten').all(), [{ sub: 's:1042', name: 'Lena K.', rolle: 'schueler' }]);
  assert.deepEqual(t.db.prepare('SELECT kurs_id, name, aktiv FROM kurse').all(), [{ kurs_id: 'k:17', name: 'Inf-LK 12', aktiv: 1 }]);
  assert.deepEqual(t.db.prepare('SELECT sub, kurs_id, rolle FROM mitgliedschaften').all(), [{ sub: 's:1042', kurs_id: 'k:17', rolle: 'mitglied' }]);
  // Sitzung trägt: /api/ich
  const ich = await request(t.app).get('/api/ich').set('Cookie', cookiePaar(res, 'dd_s'));
  assert.equal(ich.status, 200);
  assert.deepEqual(ich.body, {
    sub: 's:1042',
    rolle: 'schueler',
    name: 'Lena K.',
    kurse: [{ id: 'k:17', name: 'Inf-LK 12', rolle: 'mitglied', aktiv: true, scoreboard: true }],
    portalUrl: 'https://labs.example'
  });
});

test('Lehrkraft und Superadmin erhalten 8-Stunden-Sitzung', async () => {
  const t = testApp();
  const l = await login(t, { sub: 'l:7', rolle: 'lehrkraft', name: 'Frau Beispiel', kurse: [{ id: 'k:17', name: 'Inf-LK 12', rolle: 'lehrkraft' }] });
  assert.equal(l.status, 302);
  assert.match(setCookie(l, 'dd_s'), /Max-Age=28800/);
  const a = await login(t, { sub: 'a:1', rolle: 'superadmin', name: 'Admin', kurse: [] });
  assert.equal(a.status, 302);
  assert.match(setCookie(a, 'dd_s'), /Max-Age=28800/);
});

/* ---------- INTEGRATION §5: Ablehnungen (je 401, keine Sitzung) ---------- */

test('falsche Signatur', async () => {
  const t = testApp();
  const fremd = neuesSchluesselpaar();
  const s = await starte(t.app, '/');
  const res = await ende(t.app, { token: ssoToken(fremd, t.konfig), state: s.state, ziel: '/' }, s.cookie);
  assertAbgelehnt(res, t.db);
});

test('falsches aud', async () => {
  const t = testApp();
  assertAbgelehnt(await login(t, { aud: 'algoquest' }), t.db);
});

test('falsches iss', async () => {
  const t = testApp();
  assertAbgelehnt(await login(t, { iss: 'https://falsches-portal.example' }), t.db);
});

test('abgelaufen', async () => {
  const t = testApp();
  const j = jetztSek();
  assertAbgelehnt(await login(t, { iat: j - 200, exp: j - 100 }), t.db);
});

test('abgelaufen nach der Uhr aus konfig.jetzt', async () => {
  const t = testApp({ jetzt: () => Date.now() + 10 * 60 * 1000 });
  assertAbgelehnt(await login(t), t.db);
});

test('exp − iat > 120', async () => {
  const t = testApp();
  const j = jetztSek();
  assertAbgelehnt(await login(t, { iat: j, exp: j + 121 }), t.db);
});

test('wiederverwendetes jti', async () => {
  const t = testApp();
  const token = ssoToken(t.schluessel, t.konfig);
  const s1 = await starte(t.app, '/');
  assert.equal((await ende(t.app, { token, state: s1.state, ziel: '/' }, s1.cookie)).status, 302);
  t.db.prepare('DELETE FROM konten').run();
  const s2 = await starte(t.app, '/');
  assertAbgelehnt(await ende(t.app, { token, state: s2.state, ziel: '/' }, s2.cookie), t.db);
});

test('state fehlt', async () => {
  const t = testApp();
  const s = await starte(t.app, '/');
  const token = ssoToken(t.schluessel, t.konfig);
  // ohne Cookie
  assertAbgelehnt(await ende(t.app, { token, state: s.state, ziel: '/' }), t.db);
  // ohne state-Parameter
  const s2 = await starte(t.app, '/');
  assertAbgelehnt(await ende(t.app, { token: ssoToken(t.schluessel, t.konfig), ziel: '/' }, s2.cookie), t.db);
});

test('state ungleich Cookie', async () => {
  const t = testApp();
  const s = await starte(t.app, '/');
  assertAbgelehnt(await ende(t.app, { token: ssoToken(t.schluessel, t.konfig), state: 'A'.repeat(22), ziel: '/' }, s.cookie), t.db);
  // manipuliertes state-Cookie (Signatur passt nicht)
  const s2 = await starte(t.app, '/');
  const boese = `dd_sso_state=${'B'.repeat(22)}.${s2.cookie.split('.').pop()}`;
  assertAbgelehnt(await ende(t.app, { token: ssoToken(t.schluessel, t.konfig), state: 'B'.repeat(22), ziel: '/' }, boese), t.db);
});

test('Token fehlt oder ist kaputt', async () => {
  const t = testApp();
  const s = await starte(t.app, '/');
  assertAbgelehnt(await ende(t.app, { state: s.state, ziel: '/' }, s.cookie), t.db);
  const s2 = await starte(t.app, '/');
  assertAbgelehnt(await ende(t.app, { token: 'a.b.c', state: s2.state, ziel: '/' }, s2.cookie), t.db);
});

/* ---------- Review Focus 2: Inhalt ---------- */

test('sub passt nicht zur rolle', async () => {
  const t = testApp();
  assertAbgelehnt(await login(t, { sub: 's:5', rolle: 'lehrkraft', kurse: [{ id: 'k:17', name: 'Inf-LK 12', rolle: 'lehrkraft' }] }), t.db);
  assertAbgelehnt(await login(t, { sub: 'l:5', rolle: 'schueler' }), t.db);
  assertAbgelehnt(await login(t, { sub: 'l:5', rolle: 'superadmin', kurse: [] }), t.db);
  assertAbgelehnt(await login(t, { sub: 'a:1', rolle: 'lehrkraft', kurse: [] }), t.db);
});

test('Kurs-ID ohne k:-Format', async () => {
  const t = testApp();
  for (const id of ['17', 'k:', 'k:17a', 'kurs:17', ' k:17', 'k:-1']) {
    assertAbgelehnt(await login(t, { kurse: [{ id, name: 'Inf-LK 12', rolle: 'mitglied' }] }), t.db);
  }
  assert.equal(anzahl(t.db, 'kurse'), 0);
});

test('weitere Inhaltsfehler: sub-Format, name, kurse, Kursrolle', async () => {
  const t = testApp();
  const faelle = [
    { sub: 's:12x' },
    { sub: 'x:1' },
    { rolle: 'gast' },
    { name: '' },
    { name: 'x'.repeat(201) },
    { name: 42 },
    { kurse: 'k:17' },
    { kurse: undefined },
    { kurse: [null] },
    { kurse: [{ id: 'k:17', name: 17, rolle: 'mitglied' }] },
    { kurse: [{ id: 'k:17', name: 'Inf-LK 12', rolle: 'lehrkraft' }] }, // Schüler nur mitglied
    { kurse: [{ id: 'k:17', name: 'Inf-LK 12', rolle: 'chef' }] }
  ];
  for (const f of faelle) assertAbgelehnt(await login(t, f), t.db);
  // Lehrkraft nur mit rolle lehrkraft in Kursen
  assertAbgelehnt(await login(t, { sub: 'l:7', rolle: 'lehrkraft', kurse: [{ id: 'k:17', name: 'Inf-LK 12', rolle: 'mitglied' }] }), t.db);
});

test('pruefeSsoNutzlast: gültige Nutzlasten ergeben null, ungültige einen Grund', () => {
  const basis = { sub: 's:1042', rolle: 'schueler', name: 'Lena K.', kurse: [{ id: 'k:17', name: 'Inf-LK 12', rolle: 'mitglied' }] };
  assert.equal(pruefeSsoNutzlast(basis), null);
  // Das Portal erlaubt Lehrkraft-Namen bis 80 Zeichen – sie dürfen nicht ausgesperrt werden.
  assert.equal(pruefeSsoNutzlast({ ...basis, sub: 'l:2', rolle: 'lehrkraft', name: 'x'.repeat(80), kurse: [] }), null);
  assert.equal(pruefeSsoNutzlast({ ...basis, sub: 'a:1', rolle: 'superadmin', kurse: [] }), null);
  assert.equal(pruefeSsoNutzlast({ ...basis, sub: 'l:2', rolle: 'lehrkraft', kurse: [{ id: 'k:3', name: 'GK', rolle: 'lehrkraft' }] }), null);
  assert.equal(typeof pruefeSsoNutzlast({ ...basis, sub: 's:5', rolle: 'lehrkraft' }), 'string');
  assert.equal(typeof pruefeSsoNutzlast({ ...basis, kurse: [{ id: '17', name: 'x', rolle: 'mitglied' }] }), 'string');
});

/* ---------- Review Focus 3 ---------- */

test('erneuter Login ohne einen Kurs entfernt nur die Mitgliedschaft', async () => {
  const t = testApp();
  const zwei = [
    { id: 'k:17', name: 'Inf-LK 12', rolle: 'mitglied' },
    { id: 'k:18', name: 'Inf-GK 12', rolle: 'mitglied' }
  ];
  assert.equal((await login(t, { kurse: zwei })).status, 302);
  assert.equal((await login(t, { kurse: [zwei[0]], name: 'Lena K. neu' })).status, 302);
  assert.deepEqual(t.db.prepare('SELECT kurs_id FROM mitgliedschaften WHERE sub = ?').all('s:1042'), [{ kurs_id: 'k:17' }]);
  assert.deepEqual(t.db.prepare('SELECT sub, name FROM konten').all(), [{ sub: 's:1042', name: 'Lena K. neu' }]);
  assert.equal(anzahl(t.db, 'kurse'), 2, 'Kurs k:18 bleibt (Lernstand bis zur Löschung)');
});

/* ---------- Portal-Fehler ---------- */

test('fehler=keine_berechtigung', async () => {
  const t = testApp();
  const s = await starte(t.app, '/');
  const res = await ende(t.app, { fehler: 'keine_berechtigung', state: s.state }, s.cookie);
  assertAbgelehnt(res, t.db, 403, 'keine_berechtigung');
  // Vertrag v1.3 / INTEGRATION §3.2: rollenneutraler Text (ohne Token kennt die Plattform die Rolle nicht)
  const text = res.text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  assert.ok(text.includes('Kein Zugang. Diese Plattform ist für dieses Konto noch nicht freigeschaltet. ' +
    'Schülerinnen und Schüler: Die Lehrkraft muss die Plattform im Portal für den Kurs freischalten. ' +
    'Lehrkräfte: Die Freischaltung der Plattform erteilt die Administration im Portal; danach die Plattform ' +
    'beim Kurs ankreuzen.'), 'rollenneutraler Text');
  assert.doesNotMatch(res.text, /deine Lehrkraft/);
  assert.match(res.text, /href="https:\/\/labs\.example"/);
  // ohne JavaScript sichtbar: der passende Abschnitt kommt nicht versteckt vom Server
  assert.match(res.text, /data-fall="keine_berechtigung">/);
});

test('fehler=abgebrochen', async () => {
  const t = testApp();
  const s = await starte(t.app, '/');
  const res = await ende(t.app, { fehler: 'abgebrochen', state: s.state }, s.cookie);
  assertAbgelehnt(res, t.db, 200, 'abgebrochen');
  assert.match(res.text, /href="\/"/);
  assert.match(res.text, /href="\/gast"/);
});

test('unbekannter fehler-Code wird als ungültig behandelt, nichts davon erscheint in der Seite', async () => {
  const t = testApp();
  const s = await starte(t.app, '/');
  const res = await ende(t.app, { fehler: '<script>x</script>', state: s.state }, s.cookie);
  assertAbgelehnt(res, t.db);
  assert.doesNotMatch(res.text, /<script>x/);
});

test('fehler ohne gültigen state wird abgelehnt (state zuerst)', async () => {
  const t = testApp();
  const res = await ende(t.app, { fehler: 'keine_berechtigung', state: 'A'.repeat(22) });
  assertAbgelehnt(res, t.db, 401, 'ungueltig');
});

test('Fehlerseite verrät weder Token noch Prüfgrund und lädt kein Inline-Skript', async () => {
  const t = testApp();
  const s = await starte(t.app, '/');
  const token = ssoToken(t.schluessel, t.konfig, { aud: 'algoquest' });
  const res = await ende(t.app, { token, state: s.state, ziel: '/' }, s.cookie);
  assert.equal(res.status, 401);
  assert.ok(!res.text.includes(token));
  assert.ok(!res.text.includes(token.split('.')[2]));
  assert.doesNotMatch(res.text, /\baud\b|signatur|algoquest/i);
  assert.doesNotMatch(res.text, /<script(?![^>]*\ssrc=)[^>]*>/i, 'kein Inline-Skript');
  assert.doesNotMatch(res.text, /\sstyle=/i);
  assert.match(res.text, /<script src="\/static\/js\/sso-fehler\.js\?v=/);
});

test('sso-fehler.js setzt Texte nur über Textknoten', () => {
  const js = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'public', 'static', 'js', 'sso-fehler.js'), 'utf8');
  assert.doesNotMatch(js, /innerHTML|outerHTML|insertAdjacentHTML|document\.write/);
});

/* ---------- Review Focus 1: ziel ---------- */

test('ziel=//boese.example, /\\boese, https://boese.example → Weiterleitung auf /', async () => {
  const t = testApp();
  const boese = ['//boese.example', '/\\boese', 'https://boese.example', '%2F%2Fboese', '/%2F%2Fboese', '/%5Cboese', 'javascript:alert(1)', '/a\nb', ''];
  for (const ziel of boese) {
    // /sso/start gibt ziel=/ ans Portal
    const s = await starte(t.app, ziel);
    assert.equal(new URL(s.res.headers.location).searchParams.get('ziel'), '/', JSON.stringify(ziel));
    // /sso/ende leitet nur relativ auf /
    const res = await ende(t.app, { token: ssoToken(t.schluessel, t.konfig), state: s.state, ziel }, s.cookie);
    assert.equal(res.status, 302, JSON.stringify(ziel));
    assert.equal(res.headers.location, '/', JSON.stringify(ziel));
  }
});

test('pruefeZiel: nur relative Pfade mit genau einem /', () => {
  assert.equal(pruefeZiel('/themen?akte=2'), '/themen?akte=2');
  assert.equal(pruefeZiel('/akte/3/ermittlung/2'), '/akte/3/ermittlung/2');
  for (const z of [
    '//boese.example',
    '/\\boese',
    '\\\\boese',
    'https://boese.example',
    '%2F%2Fboese',
    '/%2F%2Fboese',
    '/%252F%252Fboese',
    '/%5Cboese',
    '/a\tb',
    '/a\u0000b',
    '/a\u007fb',
    '/%0d%0aSet-Cookie:x',
    '/%E0%A4%A',
    'boese',
    '',
    undefined,
    ['/a', '/b'],
    '/' + 'x'.repeat(3000)
  ]) {
    assert.equal(pruefeZiel(z), '/', JSON.stringify(z));
  }
});

/* ---------- Header und Cookies ---------- */

test('/sso/ende antwortet mit Referrer-Policy no-referrer und Cache-Control no-store', async () => {
  const t = testApp();
  const ok = await login(t);
  const fehler = await ende(t.app, { token: 'x', state: 'y' });
  for (const res of [ok, fehler]) {
    assert.equal(res.headers['referrer-policy'], 'no-referrer');
    assert.equal(res.headers['cache-control'], 'no-store');
  }
});

test('state-Cookie wird in /sso/ende immer gelöscht', async () => {
  const t = testApp();
  const s1 = await starte(t.app, '/');
  const ok = await ende(t.app, { token: ssoToken(t.schluessel, t.konfig), state: s1.state, ziel: '/' }, s1.cookie);
  const s2 = await starte(t.app, '/');
  const falsch = await ende(t.app, { token: 'x', state: s2.state }, s2.cookie);
  const s3 = await starte(t.app, '/');
  const abgebrochen = await ende(t.app, { fehler: 'abgebrochen', state: s3.state }, s3.cookie);
  const ohne = await ende(t.app, {});
  for (const res of [ok, falsch, abgebrochen, ohne]) {
    const c = setCookie(res, 'dd_sso_state');
    assert.ok(c, 'Set-Cookie für dd_sso_state');
    assert.match(c, /^dd_sso_state=;/);
    assert.match(c, /Max-Age=0/);
  }
});

/* ---------- Review Focus 4 ---------- */

test('paralleler zweiter Login scheitert mit HTML-Seite und Link „Erneut anmelden“', async () => {
  const t = testApp();
  // Tab 1 und Tab 2 starten parallel; der Browser behält nur das zuletzt gesetzte state-Cookie.
  const tab1 = await starte(t.app, '/themen');
  const tab2 = await starte(t.app, '/gast');
  const cookie = tab2.cookie;
  const erst = await ende(t.app, { token: ssoToken(t.schluessel, t.konfig), state: tab2.state, ziel: '/gast' }, cookie);
  assert.equal(erst.status, 302);
  // Das state-Cookie ist jetzt gelöscht (Browser sendet keins mehr) – Tab 1 kommt zurück:
  const zweit = await ende(t.app, { token: ssoToken(t.schluessel, t.konfig), state: tab1.state, ziel: '/themen' });
  assert.equal(zweit.status, 401);
  assert.match(zweit.headers['content-type'], /text\/html/);
  assert.match(zweit.text, /<a[^>]*href="\/sso\/start"[^>]*>Erneut anmelden<\/a>/);
  assert.match(zweit.text, /data-fehler="ungueltig"/);
  assert.equal(setCookie(zweit, 'dd_s'), undefined);
  // auch mit noch vorhandenem (fremdem) Cookie scheitert Tab 1 am state
  const dritt = await ende(t.app, { token: ssoToken(t.schluessel, t.konfig), state: tab1.state, ziel: '/themen' }, cookie);
  assert.equal(dritt.status, 401);
  assert.match(dritt.text, /Erneut anmelden/);
});

/* ---------- Abmelden und /api/ich ---------- */

test('abmelden beendet nur die Plattform-Sitzung', async () => {
  const t = testApp();
  const res = await request(t.app).get('/abmelden');
  assert.equal(res.status, 302);
  assert.equal(res.headers.location, '/');
  assert.match(setCookie(res, 'dd_s'), /^dd_s=;.*Max-Age=0/);
});

test('abmelden/ueberall leitet zum Portal mit ruecksprung', async () => {
  const t = testApp();
  const res = await request(t.app).get('/abmelden/ueberall');
  assert.equal(res.status, 302);
  assert.equal(res.headers.location, 'https://labs.example/sso/abmelden?ruecksprung=https%3A%2F%2Fdatendetektei.example%2F');
  assert.match(setCookie(res, 'dd_s'), /^dd_s=;.*Max-Age=0/);
});

test('/api/ich ohne Sitzung → 401', async () => {
  const t = testApp();
  const res = await request(t.app).get('/api/ich');
  assert.equal(res.status, 401);
  assert.deepEqual(res.body, { error: 'Nicht angemeldet.' });
});

test('/api/ich nach Abmelden bzw. mit Sitzung zeigt gesperrten Kurs als aktiv false', async () => {
  const t = testApp();
  const res = await login(t);
  t.db.prepare("UPDATE kurse SET aktiv = 0 WHERE kurs_id = 'k:17'").run();
  const ich = await request(t.app).get('/api/ich').set('Cookie', cookiePaar(res, 'dd_s'));
  assert.deepEqual(ich.body.kurse, [{ id: 'k:17', name: 'Inf-LK 12', rolle: 'mitglied', aktiv: false, scoreboard: true }]);
});

/* ---------- Vertrag v1.3 §5: Einstieg aus dem Portal holt immer ein frisches Token ---------- */

test('v1.3: /sso/start mit bestehender Sitzung → 302 zum Portal (nicht direkt auf ziel)', async () => {
  const t = testApp();
  const sitzung = cookiePaar(await login(t), 'dd_s');
  const res = await request(t.app).get('/sso/start?ziel=%2Fthemen').set('Cookie', sitzung);
  assert.equal(res.status, 302);
  assert.ok(res.headers.location.startsWith('https://labs.example/sso/autorisieren?'), res.headers.location);
  assert.ok(setCookie(res, 'dd_sso_state'), 'neuer state');
  assert.equal(setCookie(res, 'dd_s'), undefined, 'Sitzung bleibt unangetastet');
});

test('v1.3: bestehende Sitzung, danach Rücksprung mit ungültigem Token → 401, alte Sitzung gilt weiter', async () => {
  const t = testApp();
  const sitzung = cookiePaar(await login(t), 'dd_s');
  const s = await starte(t.app, '/');
  const fremd = neuesSchluesselpaar();
  const token = ssoToken(fremd, t.konfig);
  const res = await ende(t.app, { token, state: s.state, ziel: '/' }, s.cookie + '; ' + sitzung);
  assert.equal(res.status, 401);
  assert.equal(setCookie(res, 'dd_s'), undefined, 'Sitzung weder ersetzt noch gelöscht');
  const ich = await request(t.app).get('/api/ich').set('Cookie', sitzung);
  assert.equal(ich.status, 200);
  assert.equal(ich.body.sub, 's:1042');
});

test('v1.3: bestehende Sitzung bleibt auch bei falschem state, Wiederverwendung und fehler=keine_berechtigung', async () => {
  const t = testApp();
  const s0 = await starte(t.app, '/');
  const token = ssoToken(t.schluessel, t.konfig);
  const ok = await ende(t.app, { token, state: s0.state, ziel: '/' }, s0.cookie);
  const sitzung = cookiePaar(ok, 'dd_s');
  const s1 = await starte(t.app, '/');
  const faelle = [
    ende(t.app, { token: ssoToken(t.schluessel, t.konfig), state: 'B'.repeat(22), ziel: '/' }, s1.cookie + '; ' + sitzung),
    ende(t.app, { token, state: s1.state, ziel: '/' }, s1.cookie + '; ' + sitzung),
    ende(t.app, { fehler: 'keine_berechtigung', state: s1.state }, s1.cookie + '; ' + sitzung)
  ];
  for (const res of await Promise.all(faelle)) {
    assert.ok(res.status >= 400, String(res.status));
    assert.equal(setCookie(res, 'dd_s'), undefined, 'Sitzung unverändert');
  }
  assert.equal((await request(t.app).get('/api/ich').set('Cookie', sitzung)).status, 200);
});

test('v1.3: Schüler tritt im Portal einem zweiten Kurs bei, erneut /sso/start → Plattform kennt beide Kurse', async () => {
  const t = testApp();
  const erster = { id: 'k:17', name: 'Inf-LK 12', rolle: 'mitglied' };
  const zweiter = { id: 'k:18', name: 'Inf-GK 12', rolle: 'mitglied' };
  const alt = cookiePaar(await login(t, { kurse: [erster] }), 'dd_s');
  // erneuter Einstieg aus dem Portal mit noch gültiger Sitzung
  const s = await starte(t.app, '/');
  const token = ssoToken(t.schluessel, t.konfig, { kurse: [erster, zweiter] });
  const res = await ende(t.app, { token, state: s.state, ziel: '/' }, s.cookie + '; ' + alt);
  assert.equal(res.status, 302);
  const neu = cookiePaar(res, 'dd_s');
  assert.ok(neu, 'Sitzung ersetzt');
  const ich = await request(t.app).get('/api/ich').set('Cookie', neu);
  assert.deepEqual(ich.body.kurse.map((k) => k.id), ['k:17', 'k:18']);
  assert.deepEqual(t.db.prepare('SELECT kurs_id FROM mitgliedschaften WHERE sub = ? ORDER BY kurs_id').all('s:1042').map((r) => r.kurs_id), ['k:17', 'k:18']);
});
