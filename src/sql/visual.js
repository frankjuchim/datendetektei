/*
 * Datendetektei – Rechenschicht der Visualisierungen (Spec §7.6.2, §7.6.3; DESIGN §5.4–5.6; Plan Phase 4 Task 1).
 * Isomorph: CommonJS im Server, im Browser als self.DD_SQL_VISUAL (vorher parser.js und fehlertexte.js laden –
 * im Browser wird nichts per require geladen, die Module werden erst beim Aufruf über self gesucht).
 *
 * Alle Funktionen bekommen eine asynchrone Ausführungsfunktion
 *   fuehreAus(sql) → Promise<{ spalten, zeilen: [[wert, …]], gesamt? } | { fehler, abgebrochen? }>
 * (Browser: Worker aus konsole/ausfuehren.js – zeilen ≤ 300, gesamt exakt; Tests: better-sqlite3). Die internen
 * Teilabfragen sind nie EH-geprüft und erscheinen nie in der Oberfläche; sie nutzen, was SQLite kann (Unterabfragen,
 * Fensterfunktionen). Zeilen werden über eine künstliche Zeilennummer gekennzeichnet: die rowids der FROM-Tabellen,
 * mit „|“ verbunden (id „12|3“).
 *
 *   zeitlupe(sql, fuehreAus, optionen?)       → Promise<{ schritte, hinweis } | { fehler }>
 *   sortierfaecher(sql, fuehreAus, optionen?) → Promise<{ korb, faecher, aggregate, umschalter, … } | { fehler }>
 *   spurenbrett({ tabellen, bedingung }, fuehreAus, optionen?) → Promise<{ tabellen, faeden, passend, … } | { fehler }>
 *   vorschlag(schema, tabellen)               → 'Rad.StationID = Station.StationID' | null
 * optionen.uebersetze(meldung) → deutscher Text (Standard: DD_SQL_FEHLERTEXTE.uebersetze).
 * Datenformate: siehe die Kommentare an den Funktionen.
 */
(function (wurzel, fabrik) {
  if (typeof module === 'object' && module.exports) {
    module.exports = fabrik(
      function () {
        return require('./parser.js');
      },
      function () {
        return require('./fehlertexte.js');
      }
    );
  } else {
    wurzel.DD_SQL_VISUAL = fabrik(
      function () {
        return wurzel.DD_SQL_PARSER;
      },
      function () {
        return wurzel.DD_SQL_FEHLERTEXTE;
      }
    );
  }
})(typeof self !== 'undefined' ? self : this, function (holeParser, holeFehlertexte) {
  'use strict';

  var MAX_ANZEIGE = 50; // Zeilen je Zwischentabelle (DESIGN §5.4)
  var STICHPROBE_AB = 100000; // Kreuzprodukt: ab hier nur Stichprobe + Hinweis
  var MAX_ZEILEN_GRUPPIEREN = 200000; // darüber keine Zeilen-Stichprobe je Gruppe
  var MAX_GRUPPEN_ANZEIGE = 10;
  var MAX_GRUPPEN_LISTE = 300; // Worker liefert höchstens 300 Zeilen
  var MAX_FAECHER = 12;
  var MAX_KARTEN_JE_FACH = 8;
  var MAX_KORB = 20;
  var MAX_FAEDEN = 2000; // Spurenbrett: darüber zusammengefasst
  var MAX_TABELLEN_SPURENBRETT = 3;
  var MAX_ZEILEN_SPURENBRETT = 50;
  var STANDARD_ZEILEN_SPURENBRETT = 5;

  var HINWEIS_ABI = 'Die Zeitlupe zeigt nur Abfragen im Abitur-Umfang.';
  var HINWEIS_ABI_FAECHER = 'Die Sortierfächer zeigen nur Abfragen im Abitur-Umfang.';
  var HINWEIS_OHNE_GRUPPEN = 'Die Sortierfächer zeigen Abfragen mit GROUP BY oder einer Aggregatfunktion.';
  var FEHLER_INTERN = 'Diese Abfrage kann hier nicht Schritt für Schritt gezeigt werden.';
  var KLAUSEL_WORT = { SELECT: 'SELECT', FROM: 'FROM', WHERE: 'WHERE', GROUP: 'GROUP BY', HAVING: 'HAVING', ORDER: 'ORDER BY', LIMIT: 'LIMIT' };

  // ------------------------------------------------------------------------------------------------------------
  // Allgemeine Hilfen

  function SqlFehler(meldung, abgebrochen) {
    this.meldung = meldung;
    this.abgebrochen = !!abgebrochen;
  }
  function NutzerFehler(text) {
    this.text = text;
  }

  function klein(s) {
    return String(s).toLowerCase();
  }
  /** Bezeichner in doppelten Anführungszeichen. */
  function q(name) {
    return '"' + String(name).replace(/"/g, '""') + '"';
  }
  /** Textliteral. */
  function lit(s) {
    return "'" + String(s).replace(/'/g, "''") + "'";
  }
  /** Zahl im deutschen Format mit geschütztem Leerzeichen als Tausendertrenner (5 000). */
  function zahl(n) {
    var teile = String(n).split('.');
    var ganz = teile[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return teile.length > 1 ? ganz + ',' + teile[1] : ganz;
  }
  function wort(n, eins, viele) {
    return n === 1 ? eins : viele;
  }
  function wertText(w) {
    if (w === null || w === undefined) return 'NULL';
    if (typeof w === 'number') return String(w).replace('.', ',');
    return String(w);
  }
  function aufzaehlung(liste, max) {
    max = max || 4;
    var teile = liste.slice(0, max);
    return teile.join(', ') + (liste.length > max ? ', …' : '');
  }

  function erzeugeLauf(fuehreAus) {
    if (typeof fuehreAus !== 'function') throw new TypeError('fuehreAus fehlt.');
    return function (sql) {
      var versprechen;
      try {
        versprechen = Promise.resolve(fuehreAus(sql));
      } catch (e) {
        versprechen = Promise.reject(e);
      }
      return versprechen.then(
        function (e) {
          if (!e || typeof e !== 'object') throw new SqlFehler('');
          if (e.fehler) throw new SqlFehler(e.fehler, e.abgebrochen);
          var zeilen = e.zeilen || [];
          return { spalten: e.spalten || [], zeilen: zeilen, gesamt: typeof e.gesamt === 'number' ? e.gesamt : zeilen.length };
        },
        function (f) {
          if (f instanceof SqlFehler) throw f;
          throw new SqlFehler(f && f.message ? f.message : String(f));
        }
      );
    };
  }

  function uebersetzer(optionen) {
    if (optionen && typeof optionen.uebersetze === 'function') return optionen.uebersetze;
    var ft = null;
    try {
      ft = holeFehlertexte();
    } catch (e) {
      ft = null;
    }
    if (ft && typeof ft.uebersetze === 'function') return ft.uebersetze;
    return function (m) {
      return String(m);
    };
  }

  /** Einheitliche Fehlerbehandlung: Nutzer- und SQL-Fehler → { fehler }, alles andere → interner Fehler. */
  function fange(e, optionen, ersterLauf) {
    if (e instanceof NutzerFehler) return { fehler: e.text };
    if (e instanceof SqlFehler) {
      if (e.abgebrochen) return { fehler: e.meldung };
      if (ersterLauf) return { fehler: uebersetzer(optionen)(e.meldung) };
      return { fehler: FEHLER_INTERN, intern: String(e.meldung) };
    }
    return { fehler: FEHLER_INTERN, intern: String(e && e.stack ? e.stack : e) };
  }

  // ------------------------------------------------------------------------------------------------------------
  // AST-Hilfen

  /** Besucht alle Knoten (Objekte mit typ) unterhalb von k. */
  function besucheAlle(k, fn) {
    if (Array.isArray(k)) {
      for (var i = 0; i < k.length; i++) besucheAlle(k[i], fn);
      return;
    }
    if (!k || typeof k !== 'object') return;
    if (typeof k.typ === 'string') fn(k);
    for (var s in k) {
      if (s === 'start' || s === 'ende' || s === 'operatorPos' || s === 'schluesselPos') continue;
      var w = k[s];
      if (w && typeof w === 'object') besucheAlle(w, fn);
    }
  }

  function enthaeltFremdkoerper(ast) {
    var gefunden = false;
    besucheAlle(ast, function (k) {
      if (k.typ === 'join' || k.typ === 'unterabfrage' || k.typ === 'union' || k.typ === 'nichtSelect' || k.typ === 'cte') gefunden = true;
    });
    return gefunden;
  }

  /** Aggregate auf oberster Ebene (nicht in einem anderen Aggregat). */
  function aggregateIn(k) {
    var liste = [];
    (function laufe(x, drin) {
      if (Array.isArray(x)) return x.forEach(function (y) {
        laufe(y, drin);
      });
      if (!x || typeof x !== 'object') return;
      var istAgg = x.typ === 'aggregat';
      if (istAgg && !drin) liste.push(x);
      for (var s in x) {
        if (s === 'start' || s === 'ende' || s === 'operatorPos') continue;
        if (x[s] && typeof x[s] === 'object') laufe(x[s], drin || istAgg);
      }
    })(k, false);
    return liste;
  }

  /** Klauselbereiche im SQL-Text: { SELECT: { start, ende }, FROM: …, 'GROUP BY': … } (Indizes, ende exklusiv). */
  function klauselBereiche(P, sql) {
    var tokens = P.zerlege(sql).tokens;
    var tiefe = 0;
    var marken = [];
    tokens.forEach(function (t, i) {
      if (t.art === 'operator' && t.wert === '(') tiefe++;
      else if (t.art === 'operator' && t.wert === ')') tiefe--;
      else if (tiefe === 0 && t.art === 'schluessel' && KLAUSEL_WORT[t.wert]) marken.push({ klausel: KLAUSEL_WORT[t.wert], i: i });
    });
    var letzter = tokens.length - 1;
    while (letzter >= 0 && tokens[letzter].art === 'operator' && tokens[letzter].wert === ';') letzter--;
    var b = {};
    marken.forEach(function (m, k) {
      var bis = k + 1 < marken.length ? marken[k + 1].i - 1 : letzter;
      b[m.klausel] = { start: tokens[m.i].start.index, ende: tokens[bis].ende.index };
    });
    return b;
  }

  /** Parst und prüft den Umfang. → { sql, ast, bereiche } | { fehler } | { ausserhalb: true } */
  function analysiere(sql) {
    var P = holeParser();
    sql = String(sql == null ? '' : sql);
    var p = P.parse(sql);
    if (!p.ast) return { fehler: p.fehler[0].text };
    if (p.ast.typ !== 'select' || enthaeltFremdkoerper(p.ast)) return { ausserhalb: true };
    return { sql: sql, ast: p.ast, bereiche: klauselBereiche(P, sql) };
  }

  // ------------------------------------------------------------------------------------------------------------
  // Kontext einer Abfrage: Tabellen, Spalten, Textbausteine der internen Teilabfragen

  /**
   * Klammern ergänzen: Ein Ausdruck, dessen linker Teil geklammert ist („(a OR b) AND c“), beginnt im AST hinter der
   * öffnenden Klammer (der Parser merkt sich nur klammern: true). Fehlende „(“ vorn bzw. „)“ hinten werden ergänzt.
   */
  function ausgleichen(text) {
    var tokens = holeParser().zerlege(text).tokens;
    var tiefe = 0;
    var minimum = 0;
    tokens.forEach(function (t) {
      if (t.art !== 'operator') return;
      if (t.wert === '(') tiefe++;
      else if (t.wert === ')') {
        tiefe--;
        if (tiefe < minimum) minimum = tiefe;
      }
    });
    var vorn = -minimum;
    var hinten = tiefe + vorn;
    return new Array(vorn + 1).join('(') + text + new Array(hinten + 1).join(')');
  }

  function ausschnitt(sql, k) {
    return ausgleichen(sql.slice(k.start.index, k.ende.index));
  }
  /** Text einer Liste von Knoten (GROUP BY, ORDER BY, SELECT-Liste) vom ersten bis zum letzten. */
  function listenText(sql, liste) {
    return ausgleichen(sql.slice(liste[0].start.index, liste[liste.length - 1].ende.index));
  }

  async function baueKontext(a, lauf) {
    var sql = a.sql;
    var ast = a.ast;
    var ctx = { sql: sql, ast: ast, bereiche: a.bereiche, lauf: lauf };
    ctx.bindungen = ast.from.map(function (t) {
      return { name: t.name, alias: t.alias, ref: t.alias || t.name, spalten: [], anzahl: 0 };
    });
    ctx.spalten = []; // [{ b, name, label, typ, pk, fk, ausdruck }]
    if (ctx.bindungen.length) {
      var info = await lauf(
        ctx.bindungen
          .map(function (b, i) {
            return 'SELECT ' + i + ' AS b, cid, name, type, pk, (SELECT COUNT(*) FROM pragma_foreign_key_list(' + lit(b.name) + ') f WHERE f."from" = t.name) AS fk FROM pragma_table_info(' + lit(b.name) + ') t';
          })
          .join('\nUNION ALL\n') + '\nORDER BY b, cid'
      );
      var mehrere = ctx.bindungen.length > 1;
      info.zeilen.forEach(function (z) {
        var b = ctx.bindungen[z[0]];
        var s = {
          b: z[0],
          name: z[2],
          label: mehrere ? b.ref + '.' + z[2] : z[2],
          typ: String(z[3] || '').toUpperCase(),
          pk: z[4] > 0,
          fk: z[5] > 0,
          ausdruck: q(b.ref) + '.' + q(z[2])
        };
        b.spalten.push(s);
        ctx.spalten.push(s);
      });
      var anzahlen = await lauf(
        'SELECT ' +
          ctx.bindungen
            .map(function (b) {
              return '(SELECT COUNT(*) FROM ' + q(b.name) + ')';
            })
            .join(', ')
      );
      ctx.bindungen.forEach(function (b, i) {
        b.anzahl = anzahlen.zeilen[0][i];
      });
    }
    ctx.produkt = ctx.bindungen.reduce(function (p, b) {
      return p * b.anzahl;
    }, 1);

    // Spalten der FROM-Tabellen (klein) und Aliasse der SELECT-Liste
    ctx.spaltenNamen = {};
    ctx.spalten.forEach(function (s) {
      ctx.spaltenNamen[klein(s.name)] = true;
    });
    ctx.aliasse = {};
    ast.spalten.forEach(function (sp) {
      if (sp.alias && sp.ausdruck.typ !== 'stern') ctx.aliasse[klein(sp.alias)] = ausschnitt(sql, sp.ausdruck);
    });

    // Textbausteine
    ctx.fromText = ast.from.length ? listenText(sql, ast.from) : null;
    ctx.whereIntern = ast.where ? aufgeloest(ctx, ast.where, false) : null;
    ctx.basis = (ctx.fromText ? '\nFROM ' + ctx.fromText : '') + (ctx.whereIntern ? '\nWHERE (' + ctx.whereIntern + ')' : '');
    ctx.schluessel = ast.groupBy.map(function (g) {
      return aufgeloest(ctx, g, true);
    });
    ctx.schluesselListe = ctx.schluessel
      .map(function (k) {
        return '(' + k + ')';
      })
      .join(', ');
    ctx.havingIntern = ast.having ? aufgeloest(ctx, ast.having, false) : null;
    ctx.idListe = ctx.bindungen.map(function (b, i) {
      return q(b.ref) + '._rowid_ AS "__i' + i + '"';
    });
    ctx.idOrdnung = ctx.bindungen.map(function (b) {
      return q(b.ref) + '._rowid_';
    });
    ctx.spaltenListe = ctx.spalten.map(function (s, k) {
      return s.ausdruck + ' AS "__c' + k + '"';
    });
    ctx.zeilenAuswahl = ctx.idListe.concat(ctx.spaltenListe).join(', ') || '1';
    ctx.labels = ctx.spalten.map(function (s) {
      return s.label;
    });
    ctx.relevant = relevanteSpalten(ctx);
    ctx.hatAggregat = aggregateIn(ast.spalten).length > 0 || !!ast.having;
    return ctx;
  }

  /**
   * SQL-Text eines Ausdrucks für interne Abfragen: Spaltenaliasse (nur wenn keine Tabellenspalte so heißt, wie SQLite
   * in WHERE/GROUP BY/HAVING auflöst) durch ihren Ausdruck ersetzt; im GROUP BY eine ganze Zahl als Spaltennummer.
   */
  function aufgeloest(ctx, knoten, imGroupBy) {
    var sql = ctx.sql;
    if (imGroupBy && knoten.typ === 'zahl' && /^\d+$/.test(knoten.roh)) {
      var sp = ctx.ast.spalten[Number(knoten.roh) - 1];
      if (sp && sp.ausdruck.typ !== 'stern') return '(' + ausschnitt(sql, sp.ausdruck) + ')';
    }
    var ersetzungen = [];
    besucheAlle(knoten, function (k) {
      if (k.typ === 'name' && !k.tabelle && !ctx.spaltenNamen[klein(k.spalte)] && ctx.aliasse[klein(k.spalte)] !== undefined) {
        ersetzungen.push({ start: k.start.index, ende: k.ende.index, text: '(' + ctx.aliasse[klein(k.spalte)] + ')' });
      }
    });
    var text = sql.slice(knoten.start.index, knoten.ende.index);
    ersetzungen
      .sort(function (x, y) {
        return y.start - x.start;
      })
      .forEach(function (e) {
        var von = e.start - knoten.start.index;
        var bis = e.ende - knoten.start.index;
        text = text.slice(0, von) + e.text + text.slice(bis);
      });
    return ausgleichen(text);
  }

  /** Welche Spalten der FROM-Tabellen nutzt die Abfrage? [bool je Spalte] */
  function relevanteSpalten(ctx) {
    var r = ctx.spalten.map(function () {
      return false;
    });
    function markiere(b, name) {
      ctx.spalten.forEach(function (s, i) {
        if (s.b === b && (name === null || klein(s.name) === klein(name))) r[i] = true;
      });
    }
    function bindungVon(ref) {
      for (var i = 0; i < ctx.bindungen.length; i++) if (klein(ctx.bindungen[i].ref) === klein(ref)) return i;
      return -1;
    }
    var ast = ctx.ast;
    ast.spalten.forEach(function (sp) {
      if (sp.ausdruck.typ === 'stern') {
        if (sp.ausdruck.tabelle) markiere(bindungVon(sp.ausdruck.tabelle), null);
        else ctx.bindungen.forEach(function (b, i) {
          markiere(i, null);
        });
      }
    });
    besucheAlle([ast.spalten, ast.where, ast.groupBy, ast.having, ast.orderBy], function (k) {
      if (k.typ !== 'name') return;
      if (k.tabelle) markiere(bindungVon(k.tabelle), k.spalte);
      else ctx.bindungen.forEach(function (b, i) {
        markiere(i, k.spalte);
      });
    });
    return r;
  }

  /** Zeile einer internen Abfrage (ids zuerst, dann Spalten) → { id, werte } */
  function zeileAus(ctx, z) {
    var n = ctx.bindungen.length;
    return { id: z.slice(0, n).join('|'), werte: z.slice(n, n + ctx.spalten.length) };
  }

  function vergleicheIds(a, b) {
    var x = a.split('|');
    var y = b.split('|');
    for (var i = 0; i < x.length; i++) {
      var d = Number(x[i]) - Number(y[i]);
      if (d) return d;
    }
    return 0;
  }

  function flagWhere(ctx) {
    return 'CASE WHEN (' + ctx.whereIntern + ') THEN 1 ELSE 0 END';
  }

  async function zaehle(ctx, sql) {
    var e = await ctx.lauf('SELECT COUNT(*) FROM (' + sql + '\n)');
    return e.zeilen[0][0];
  }

  // ------------------------------------------------------------------------------------------------------------
  // Bausteine: Zeilen nach WHERE, Gruppen

  async function nachWhereAnzahl(ctx) {
    if (!ctx.ast.where) return ctx.produkt;
    var e = await ctx.lauf('SELECT COUNT(*)' + ctx.basis);
    return e.zeilen[0][0];
  }

  /** Stichprobe für WHERE: behaltene und verworfene Zeilen gemischt, nach Zeilennummer sortiert. */
  async function whereStichprobe(ctx, behalten, verworfen, max, nurVerworfen) {
    var k = nurVerworfen ? 0 : Math.min(behalten, Math.max(Math.ceil(max / 2), max - verworfen));
    var d = Math.min(verworfen, max - k);
    var zeilen = [];
    var von = '\nFROM ' + ctx.fromText;
    if (k > 0) {
      var e1 = await ctx.lauf('SELECT ' + ctx.zeilenAuswahl + von + '\nWHERE (' + ctx.whereIntern + ')\nLIMIT ' + k);
      e1.zeilen.forEach(function (z) {
        var zeile = zeileAus(ctx, z);
        zeile.verworfen = false;
        zeilen.push(zeile);
      });
    }
    if (d > 0) {
      var e2 = await ctx.lauf('SELECT ' + ctx.zeilenAuswahl + von + '\nWHERE NOT (' + flagWhere(ctx) + ')\nLIMIT ' + d);
      e2.zeilen.forEach(function (z) {
        var zeile = zeileAus(ctx, z);
        zeile.verworfen = true;
        zeilen.push(zeile);
      });
    }
    zeilen.sort(function (x, y) {
      return vergleicheIds(x.id, y.id);
    });
    return zeilen;
  }

  /**
   * Gruppenliste (höchstens 300, nach Schlüssel geordnet): [{ nr, schluessel, anzahl, behalten, aggregate, summe }]
   * extras: zusätzliche Aggregat-Ausdrücke (Sortierfächer), summeAusdruck für den Umschalter.
   */
  async function gruppenListe(ctx, extras, summeAusdruck) {
    var teile = ctx.schluessel.map(function (k, i) {
      return '(' + k + ') AS "__k' + i + '"';
    });
    teile.push('COUNT(*) AS "__n"');
    teile.push((ctx.havingIntern ? 'CASE WHEN (' + ctx.havingIntern + ') THEN 1 ELSE 0 END' : '1') + ' AS "__h"');
    teile.push('row_number() OVER (ORDER BY ' + ctx.schluesselListe + ') AS "__nr"');
    (extras || []).forEach(function (x, i) {
      teile.push('(' + x + ') AS "__a' + i + '"');
    });
    if (summeAusdruck) teile.push('SUM(' + summeAusdruck + ') AS "__s"');
    var e = await ctx.lauf(
      'SELECT ' + teile.join(', ') + ctx.basis + '\nGROUP BY ' + ctx.schluesselListe + '\nORDER BY ' + ctx.schluesselListe + '\nLIMIT ' + MAX_GRUPPEN_LISTE
    );
    var n = ctx.schluessel.length;
    return e.zeilen.map(function (z) {
      var x = (extras || []).length;
      return {
        nr: z[n + 2],
        schluessel: z.slice(0, n),
        anzahl: z[n],
        behalten: z[n + 1] === 1,
        aggregate: z.slice(n + 3, n + 3 + x),
        summe: summeAusdruck ? z[n + 3 + x] : undefined
      };
    });
  }

  /** Auswahl der angezeigten Gruppen: mit HAVING gemischt (behalten/verworfen), sonst die ersten. */
  function waehleGruppen(liste, max, mitHaving) {
    var gewaehlt;
    if (!mitHaving) {
      gewaehlt = liste.slice(0, max);
    } else {
      var ja = liste.filter(function (g) {
        return g.behalten;
      });
      var nein = liste.filter(function (g) {
        return !g.behalten;
      });
      var halb = Math.ceil(max / 2);
      var nJa = Math.min(ja.length, Math.max(halb, max - nein.length));
      var nNein = Math.min(nein.length, max - nJa);
      gewaehlt = ja.slice(0, nJa).concat(nein.slice(0, nNein));
      gewaehlt.sort(function (x, y) {
        return x.nr - y.nr;
      });
    }
    return gewaehlt;
  }

  function gruppenObjekt(g, farbe, mitHaving) {
    var o = {
      nr: g.nr,
      schluessel: g.schluessel,
      name: g.schluessel.map(wertText).join(' · '),
      farbe: farbe,
      anzahl: g.anzahl
    };
    if (mitHaving) o.behalten = g.behalten;
    return o;
  }

  /** Zeilen der gewählten Gruppen (je Gruppe höchstens proGruppe), nach Gruppe und Zeilennummer. */
  async function gruppenZeilen(ctx, nummern, proGruppe) {
    if (!nummern.length) return [];
    var innen =
      'SELECT ' +
      ctx.zeilenAuswahl +
      ', dense_rank() OVER (ORDER BY ' +
      ctx.schluesselListe +
      ') AS "__nr", row_number() OVER (PARTITION BY ' +
      ctx.schluesselListe +
      ' ORDER BY ' +
      (ctx.idOrdnung.join(', ') || '1') +
      ') AS "__rn"' +
      ctx.basis;
    var e = await ctx.lauf(
      'SELECT * FROM (' + innen + '\n)\nWHERE "__nr" IN (' + nummern.join(', ') + ') AND "__rn" <= ' + proGruppe + '\nORDER BY "__nr", "__rn"'
    );
    var n = ctx.bindungen.length + ctx.spalten.length;
    return e.zeilen.map(function (z) {
      var zeile = zeileAus(ctx, z);
      zeile.gruppe = z[n];
      return zeile;
    });
  }

  // ------------------------------------------------------------------------------------------------------------
  // Zeitlupe

  /**
   * zeitlupe(sql, fuehreAus, optionen?) → Promise<{ schritte, hinweis: null } | { schritte: [], hinweis } | { fehler }>
   * Schritt: {
   *   klausel: 'FROM'|'WHERE'|'GROUP BY'|'HAVING'|'SELECT'|'ORDER BY'|'LIMIT', nummer (1…, Auswertungsreihenfolge),
   *   text (ein Satz), zaehler: { wert, einheit: 'Zeile(n)'|'Gruppe(n)', vorher|null, rechnung|null ('45 × 13') },
   *   spalten: [Name], zeilen: [{ id, werte, verworfen?, gruppe? }] (≤ 50), gesamt (Zeilen der Zwischentabelle),
   *   markierung: { art, … }, gruppen? [{ nr, schluessel, name, farbe 1–3|null, anzahl, behalten? }],
   *   relevant? [bool je Spalte], hinweis: Text|null, bereich: { start, ende } (Klausel im SQL-Text)
   * }
   */
  async function zeitlupe(sql, fuehreAus, optionen) {
    var a = analysiere(sql);
    if (a.fehler) return { fehler: a.fehler };
    if (a.ausserhalb) return { schritte: [], hinweis: HINWEIS_ABI };
    var lauf = erzeugeLauf(fuehreAus);
    try {
      await lauf(a.sql);
    } catch (e) {
      return fange(e, optionen, true);
    }
    try {
      var schritte = await baueZeitlupe(a, lauf);
      schritte.forEach(function (s, i) {
        s.nummer = i + 1;
      });
      return { schritte: schritte, hinweis: null };
    } catch (e) {
      return fange(e, optionen, false);
    }
  }

  function zaehler(wert, einheitEins, einheitViele, vorher, rechnung) {
    return { wert: wert, einheit: wort(wert, einheitEins, einheitViele), vorher: vorher === undefined ? null : vorher, rechnung: rechnung || null };
  }

  async function baueZeitlupe(a, lauf) {
    var ctx = await baueKontext(a, lauf);
    var ast = ctx.ast;
    var b = ctx.bereiche;
    var schritte = [];
    var nachWhere = ctx.produkt;

    // FROM
    if (ctx.bindungen.length) {
      var ef = await lauf('SELECT ' + ctx.zeilenAuswahl + '\nFROM ' + ctx.fromText + '\nLIMIT ' + MAX_ANZEIGE);
      var rechnung = ctx.bindungen.length > 1
        ? ctx.bindungen
            .map(function (x) {
              return String(x.anzahl);
            })
            .join(' × ')
        : null;
      var pos = 0;
      var tabellen = ctx.bindungen.map(function (x) {
        var t = { name: x.name, alias: x.alias || null, anzahl: x.anzahl, spalten: [pos, pos + x.spalten.length] };
        pos += x.spalten.length;
        return t;
      });
      var textFrom = ctx.bindungen.length === 1
        ? 'FROM holt alle ' + zahl(ctx.produkt) + ' ' + wort(ctx.produkt, 'Zeile', 'Zeilen') + ' der Tabelle ' + ctx.bindungen[0].name + '.'
        : 'FROM bildet das Kreuzprodukt: Jede Zeile wird mit jeder Zeile der anderen ' +
          (ctx.bindungen.length === 2 ? 'Tabelle' : 'Tabellen') +
          ' kombiniert – ' +
          ctx.bindungen
            .map(function (x) {
              return zahl(x.anzahl);
            })
            .join(' × ') +
          ' = ' +
          zahl(ctx.produkt) +
          ' Zeilen.';
      schritte.push({
        klausel: 'FROM',
        text: textFrom,
        zaehler: zaehler(ctx.produkt, 'Zeile', 'Zeilen', null, rechnung),
        spalten: ctx.labels.slice(),
        relevant: ctx.relevant.slice(),
        zeilen: ef.zeilen.map(function (z) {
          return zeileAus(ctx, z);
        }),
        gesamt: ctx.produkt,
        markierung: { art: 'tabellen', tabellen: tabellen },
        hinweis: ctx.produkt > STICHPROBE_AB ? 'Das Kreuzprodukt ist sehr groß – angezeigt wird nur eine Stichprobe, der Zähler ist exakt.' : null,
        bereich: b.FROM
      });
    }

    // WHERE
    if (ast.where) {
      nachWhere = await nachWhereAnzahl(ctx);
      var verworfen = ctx.produkt - nachWhere;
      var zeilenW = await whereStichprobe(ctx, nachWhere, verworfen, MAX_ANZEIGE, false);
      schritte.push({
        klausel: 'WHERE',
        text:
          'WHERE prüft jede Zeile einzeln: ' +
          zahl(nachWhere) +
          ' von ' +
          zahl(ctx.produkt) +
          ' ' +
          wort(ctx.produkt, 'Zeile', 'Zeilen') +
          ' ' +
          wort(nachWhere, 'erfüllt', 'erfüllen') +
          ' die Bedingung, ' +
          zahl(verworfen) +
          ' ' +
          wort(verworfen, 'fällt', 'fallen') +
          ' weg.',
        zaehler: zaehler(nachWhere, 'Zeile', 'Zeilen', ctx.produkt),
        spalten: ctx.labels.slice(),
        relevant: ctx.relevant.slice(),
        zeilen: zeilenW,
        gesamt: ctx.produkt,
        markierung: { art: 'zeilen', behalten: nachWhere, verworfen: verworfen },
        hinweis: ctx.produkt > STICHPROBE_AB ? 'Angezeigt wird eine Stichprobe aus behaltenen und verworfenen Zeilen.' : null,
        bereich: b.WHERE
      });
    }

    // GROUP BY und HAVING
    var gruppenAnzahl = null;
    var nachHaving = null;
    var liste = null;
    var angezeigt = [];
    if (ast.groupBy.length) {
      gruppenAnzahl = await zaehle(ctx, 'SELECT 1' + ctx.basis + '\nGROUP BY ' + ctx.schluesselListe);
      liste = await gruppenListe(ctx);
      var mitHaving = !!ast.having;
      var gewaehlt = waehleGruppen(liste, MAX_GRUPPEN_ANZEIGE, mitHaving);
      angezeigt = gewaehlt.map(function (g, i) {
        return gruppenObjekt(g, i < 3 ? i + 1 : null, mitHaving);
      });
      var zeilenG = [];
      var hinweisG = null;
      if (nachWhere > MAX_ZEILEN_GRUPPIEREN) {
        hinweisG = 'Zu viele Zeilen für die Anzeige – die Zähler sind exakt.';
      } else {
        var proGruppe = Math.max(1, Math.floor(MAX_ANZEIGE / Math.max(1, gewaehlt.length)));
        zeilenG = await gruppenZeilen(
          ctx,
          gewaehlt.map(function (g) {
            return g.nr;
          }),
          proGruppe
        );
      }
      if (!hinweisG && gruppenAnzahl > angezeigt.length) {
        hinweisG = 'Angezeigt ' + wort(angezeigt.length, 'wird', 'werden') + ' ' + zahl(angezeigt.length) + ' von ' + zahl(gruppenAnzahl) + ' Gruppen.';
      }
      var schluesselText = aufzaehlung(
        ast.groupBy.map(function (g) {
          return ausschnitt(ctx.sql, g);
        })
      );
      schritte.push({
        klausel: 'GROUP BY',
        text:
          'GROUP BY sortiert die ' +
          zahl(nachWhere) +
          ' ' +
          wort(nachWhere, 'Zeile', 'Zeilen') +
          ' in ' +
          zahl(gruppenAnzahl) +
          ' ' +
          wort(gruppenAnzahl, 'Gruppe', 'Gruppen') +
          ': Zeilen mit gleichem Wert in ' +
          schluesselText +
          ' landen in derselben Gruppe.',
        zaehler: zaehler(gruppenAnzahl, 'Gruppe', 'Gruppen', nachWhere),
        spalten: ctx.labels.slice(),
        relevant: ctx.relevant.slice(),
        zeilen: zeilenG.map(function (z) {
          return { id: z.id, werte: z.werte, verworfen: false, gruppe: z.gruppe };
        }),
        gesamt: nachWhere,
        markierung: { art: 'gruppen' },
        gruppen: angezeigt.map(function (g) {
          var o = Object.assign({}, g);
          delete o.behalten;
          return o;
        }),
        hinweis: hinweisG,
        bereich: b['GROUP BY']
      });

      if (ast.having) {
        nachHaving = await zaehle(ctx, 'SELECT 1' + ctx.basis + '\nGROUP BY ' + ctx.schluesselListe + '\nHAVING (' + ctx.havingIntern + ')');
        var status = {};
        angezeigt.forEach(function (g) {
          status[g.nr] = g.behalten;
        });
        var wegH = gruppenAnzahl - nachHaving;
        schritte.push({
          klausel: 'HAVING',
          text:
            'HAVING prüft ganze Gruppen: ' +
            zahl(nachHaving) +
            ' von ' +
            zahl(gruppenAnzahl) +
            ' ' +
            wort(gruppenAnzahl, 'Gruppe', 'Gruppen') +
            ' ' +
            wort(nachHaving, 'erfüllt', 'erfüllen') +
            ' die Bedingung, ' +
            zahl(wegH) +
            ' ' +
            wort(wegH, 'fällt', 'fallen') +
            ' komplett weg.',
          zaehler: zaehler(nachHaving, 'Gruppe', 'Gruppen', gruppenAnzahl),
          spalten: ctx.labels.slice(),
          relevant: ctx.relevant.slice(),
          zeilen: zeilenG.map(function (z) {
            return { id: z.id, werte: z.werte, verworfen: !status[z.gruppe], gruppe: z.gruppe };
          }),
          gesamt: nachWhere,
          markierung: { art: 'gruppen', behalten: nachHaving, verworfen: wegH },
          gruppen: angezeigt.map(function (g) {
            return Object.assign({}, g);
          }),
          hinweis: hinweisG,
          bereich: b.HAVING
        });
      }
    }

    // SELECT
    schritte.push(await selectSchritt(ctx, nachWhere, gruppenAnzahl, nachHaving, liste, angezeigt));
    var nachSelect = schritte[schritte.length - 1].zaehler.wert;

    // ORDER BY
    if (ast.orderBy.length) {
      var eo = await lauf(ast.limit ? ctx.ohneLimit : ctx.sql);
      var nach = ast.orderBy.map(function (o) {
        return { ausdruck: ausschnitt(ctx.sql, o.ausdruck), richtung: o.richtung || 'ASC' };
      });
      schritte.push({
        klausel: 'ORDER BY',
        text:
          'ORDER BY sortiert die ' +
          zahl(eo.gesamt) +
          ' ' +
          wort(eo.gesamt, 'Ergebniszeile', 'Ergebniszeilen') +
          ' nach ' +
          nach
            .map(function (n) {
              return n.ausdruck + (n.richtung === 'DESC' ? ' absteigend' : ' aufsteigend');
            })
            .join(', dann nach ') +
          '.',
        zaehler: zaehler(eo.gesamt, 'Zeile', 'Zeilen', nachSelect),
        spalten: eo.spalten.slice(),
        zeilen: eo.zeilen.slice(0, MAX_ANZEIGE).map(function (z, i) {
          return { id: 'e' + (i + 1), werte: z };
        }),
        gesamt: eo.gesamt,
        markierung: { art: 'sortierung', nach: nach },
        hinweis: null,
        bereich: b['ORDER BY']
      });
    }

    // LIMIT
    if (ast.limit) schritte.push(await limitSchritt(ctx, nachSelect));
    return schritte;
  }

  /** Abfrage ohne ORDER BY/LIMIT (bzw. ohne LIMIT) als Text, optional ohne DISTINCT und mit Zusatzspalten. */
  function selectText(ctx, ohneDistinct, zusatz) {
    var ast = ctx.ast;
    var sql = ctx.sql;
    var liste = listenText(sql, ast.spalten);
    var t = 'SELECT ' + (ast.distinct && !ohneDistinct ? 'DISTINCT ' : '') + liste + (zusatz || '');
    if (ctx.fromText) t += '\nFROM ' + ctx.fromText;
    if (ast.where) t += '\nWHERE ' + ausschnitt(sql, ast.where);
    if (ast.groupBy.length) t += '\nGROUP BY ' + listenText(sql, ast.groupBy);
    if (ast.having) t += '\nHAVING ' + ausschnitt(sql, ast.having);
    return t;
  }

  async function selectSchritt(ctx, nachWhere, gruppenAnzahl, nachHaving, liste, angezeigt) {
    var ast = ctx.ast;
    var gruppiert = ast.groupBy.length > 0;
    var vorher = gruppiert ? (ast.having ? nachHaving : gruppenAnzahl) : nachWhere;
    var nurSelect = !ast.orderBy.length && !ast.limit;
    ctx.ohneLimit = selectText(ctx) + (ast.orderBy.length ? '\nORDER BY ' + listenText(ctx.sql, ast.orderBy) : '');
    var markierung = { art: 'spalten', aggregate: gruppiert || ctx.hatAggregat, distinct: !!ast.distinct, doppelt: 0 };
    var zeilen;
    var spalten;
    var wert;
    var gruppen;

    if (ast.distinct) {
      var exakt = await ctx.lauf(nurSelect ? ctx.sql : selectText(ctx));
      var proj = await ctx.lauf(selectText(ctx, true));
      vorher = proj.gesamt;
      wert = exakt.gesamt;
      spalten = exakt.spalten.slice();
      // erste Vorkommen behalten, Wiederholungen streichen (in Projektionsreihenfolge)
      var gesehen = {};
      var markiert = proj.zeilen.map(function (z, i) {
        var s = JSON.stringify(z);
        var doppelt = !!gesehen[s];
        gesehen[s] = true;
        return { i: i, werte: z, verworfen: doppelt };
      });
      var erste = markiert.filter(function (z) {
        return !z.verworfen;
      });
      var doppelte = markiert.filter(function (z) {
        return z.verworfen;
      });
      var auswahl;
      if (erste.length >= Math.min(wert, MAX_ANZEIGE)) {
        var nErste = Math.min(erste.length, MAX_ANZEIGE);
        auswahl = erste.slice(0, nErste).concat(doppelte.slice(0, MAX_ANZEIGE - nErste));
        auswahl.sort(function (x, y) {
          return x.i - y.i;
        });
      } else {
        // Projektion größer als die gelieferte Menge: behaltene Zeilen aus dem DISTINCT-Ergebnis
        auswahl = exakt.zeilen.slice(0, MAX_ANZEIGE).map(function (z) {
          return { werte: z, verworfen: false };
        });
        auswahl = auswahl.concat(doppelte.slice(0, MAX_ANZEIGE - auswahl.length));
      }
      zeilen = auswahl.map(function (z, i) {
        return { id: 'e' + (i + 1), werte: z.werte, verworfen: z.verworfen };
      });
      markierung.doppelt = vorher - wert;
    } else if (gruppiert) {
      var zusatz = ctx.schluessel
        .map(function (k, i) {
          return ',\n(' + k + ') AS "__k' + i + '"';
        })
        .join('');
      var es = await ctx.lauf(selectText(ctx, false, zusatz));
      var n = es.spalten.length - ctx.schluessel.length;
      spalten = es.spalten.slice(0, n);
      wert = es.gesamt;
      var nachSchluessel = {};
      (liste || []).forEach(function (g) {
        nachSchluessel[JSON.stringify(g.schluessel)] = g;
      });
      var farbeVon = {};
      angezeigt.forEach(function (g) {
        farbeVon[g.nr] = g.farbe;
      });
      gruppen = [];
      var drin = {};
      zeilen = es.zeilen.slice(0, MAX_ANZEIGE).map(function (z, i) {
        var g = nachSchluessel[JSON.stringify(z.slice(n))];
        var zeile = { id: 'e' + (i + 1), werte: z.slice(0, n), gruppe: g ? g.nr : null };
        if (g && !drin[g.nr]) {
          drin[g.nr] = true;
          gruppen.push(gruppenObjekt(g, farbeVon[g.nr] || null, false));
        }
        return zeile;
      });
    } else {
      var e = await ctx.lauf(nurSelect ? ctx.sql : selectText(ctx));
      spalten = e.spalten.slice();
      wert = e.gesamt;
      zeilen = e.zeilen.slice(0, MAX_ANZEIGE).map(function (z, i) {
        return { id: 'e' + (i + 1), werte: z };
      });
    }

    var spaltenText = aufzaehlung(spalten);
    var text;
    if (!ctx.bindungen.length) {
      text = 'SELECT berechnet die Ergebniszeile mit ' + spaltenText + '.';
    } else if (gruppiert) {
      text = 'SELECT berechnet für jede der ' + zahl(vorher) + ' ' + wort(vorher, 'Gruppe', 'Gruppen') + ' eine Ergebniszeile mit ' + spaltenText + '.';
    } else if (ctx.hatAggregat) {
      text = 'Ohne GROUP BY bilden alle ' + zahl(nachWhere) + ' ' + wort(nachWhere, 'Zeile', 'Zeilen') + ' eine einzige Gruppe – SELECT berechnet daraus genau eine Ergebniszeile.';
    } else {
      text = 'SELECT wählt aus ' + (nachWhere === 1 ? 'der Zeile' : 'jeder der ' + zahl(nachWhere) + ' Zeilen') + ' die Spalten ' + spaltenText + ' aus.';
    }
    if (ast.distinct) {
      text += ' DISTINCT streicht doppelte Zeilen: ' + zahl(wert) + ' von ' + zahl(vorher) + ' ' + wort(wert, 'bleibt', 'bleiben') + '.';
    }
    var schritt = {
      klausel: 'SELECT',
      text: text,
      zaehler: zaehler(wert, 'Zeile', 'Zeilen', ctx.bindungen.length ? vorher : null),
      spalten: spalten,
      zeilen: zeilen,
      gesamt: ast.distinct ? vorher : wert,
      markierung: markierung,
      hinweis: null,
      bereich: ctx.bereiche.SELECT
    };
    if (gruppen) schritt.gruppen = gruppen;
    return schritt;
  }

  async function limitSchritt(ctx, nachSelect) {
    var ast = ctx.ast;
    var sql = ctx.sql;
    var limitAusdruck = ast.limit;
    var offsetAusdruck = ast.offset;
    // SQLite: „LIMIT a, b“ heißt OFFSET a, LIMIT b
    if (offsetAusdruck && sql.slice(limitAusdruck.ende.index, offsetAusdruck.start.index).indexOf(',') >= 0) {
      var tausch = limitAusdruck;
      limitAusdruck = offsetAusdruck;
      offsetAusdruck = tausch;
    }
    var werte = await ctx.lauf(
      'SELECT (' + ausschnitt(sql, limitAusdruck) + '), (' + (offsetAusdruck ? ausschnitt(sql, offsetAusdruck) : '0') + ')'
    );
    var limit = Number(werte.zeilen[0][0]);
    var offset = Math.max(0, Number(werte.zeilen[0][1]) || 0);
    var quelle = ast.orderBy.length ? ctx.ohneLimit : selectText(ctx);
    var original = await ctx.lauf(sql);
    var behalten = original.gesamt;
    var nachher = Math.max(0, nachSelect - offset - behalten);
    var vorne = [];
    if (offset > 0 && nachSelect > 0) {
      var nVorne = Math.min(offset, 10, nachSelect);
      var ev = await ctx.lauf(quelle + '\nLIMIT ' + nVorne + ' OFFSET ' + Math.max(0, Math.min(offset, nachSelect) - nVorne));
      vorne = ev.zeilen;
    }
    var nHinten = Math.min(nachher, 10);
    var nBehalten = Math.min(behalten, MAX_ANZEIGE - vorne.length - nHinten);
    var hinten = [];
    if (nHinten > 0) {
      var eh = await ctx.lauf(quelle + '\nLIMIT ' + nHinten + ' OFFSET ' + (offset + behalten));
      hinten = eh.zeilen;
    }
    var zeilen = [];
    var i = 0;
    vorne.forEach(function (z) {
      zeilen.push({ id: 'e' + ++i, werte: z, verworfen: true });
    });
    original.zeilen.slice(0, nBehalten).forEach(function (z) {
      zeilen.push({ id: 'e' + ++i, werte: z, verworfen: false });
    });
    hinten.forEach(function (z) {
      zeilen.push({ id: 'e' + ++i, werte: z, verworfen: true });
    });
    var weg = nachSelect - behalten;
    var text =
      'LIMIT ' +
      (limit < 0 ? 'ohne Grenze' : zahl(limit)) +
      (offset ? ' (ab Zeile ' + zahl(offset + 1) + ')' : '') +
      ' behält nur die ersten Zeilen: ' +
      zahl(behalten) +
      ' von ' +
      zahl(nachSelect) +
      ' ' +
      wort(behalten, 'bleibt', 'bleiben') +
      ', ' +
      zahl(weg) +
      ' ' +
      wort(weg, 'fällt', 'fallen') +
      ' weg.';
    if (!ast.orderBy.length) text += ' Ohne ORDER BY ist nicht festgelegt, welche Zeilen das sind.';
    return {
      klausel: 'LIMIT',
      text: text,
      zaehler: zaehler(behalten, 'Zeile', 'Zeilen', nachSelect),
      spalten: original.spalten.slice(),
      zeilen: zeilen,
      gesamt: nachSelect,
      markierung: { art: 'limit', limit: limit, offset: offset },
      hinweis: null,
      bereich: ctx.bereiche.LIMIT
    };
  }

  // ------------------------------------------------------------------------------------------------------------
  // Sortierfächer

  /**
   * sortierfaecher(sql, fuehreAus, optionen?) → Promise<{
   *   spalten: [Name], relevant: [bool], gesamt (Anzahl Fächer),
   *   korb: { anzahl (durch WHERE verworfen), zeilen: [{ id, werte }] (≤ 20) },
   *   faecher: [{ nr, schluessel, name, farbe 1–3|null, anzahl, zeilen: [{ id, werte }] (≤ 8), aggregate: [Wert je
   *              Eintrag in aggregate], havingRaus }] (≤ 12, mit HAVING gemischt aus behaltenen und verworfenen),
   *   aggregate: ['COUNT(*)', 'SUM(…)'] (wie geschrieben, aus SELECT und HAVING),
   *   umschalter: { spalte, werte: [{ count, sum }] je Fach } | null (nur wenn die Abfrage COUNT oder SUM nutzt),
   *   bereiche: { select, from, where, groupBy, having } ({ start, ende } | null), hinweis: Text|null
   * } | { fehler }>
   * Ohne GROUP BY, aber mit Aggregat: ein Fach mit allen Zeilen (schluessel []). Ohne beides: hinweis, faecher [].
   */
  async function sortierfaecher(sql, fuehreAus, optionen) {
    var a = analysiere(sql);
    if (a.fehler) return { fehler: a.fehler };
    var leer = { spalten: [], relevant: [], gesamt: 0, korb: { anzahl: 0, zeilen: [] }, faecher: [], aggregate: [], umschalter: null, bereiche: {} };
    if (a.ausserhalb) return Object.assign(leer, { hinweis: HINWEIS_ABI_FAECHER });
    var lauf = erzeugeLauf(fuehreAus);
    try {
      await lauf(a.sql);
    } catch (e) {
      return fange(e, optionen, true);
    }
    try {
      return await baueSortierfaecher(a, lauf, leer);
    } catch (e) {
      return fange(e, optionen, false);
    }
  }

  async function baueSortierfaecher(a, lauf, leer) {
    var ctx = await baueKontext(a, lauf);
    var ast = ctx.ast;
    var b = ctx.bereiche;
    var bereiche = {
      select: b.SELECT || null,
      from: b.FROM || null,
      where: b.WHERE || null,
      groupBy: b['GROUP BY'] || null,
      having: b.HAVING || null
    };
    if ((!ast.groupBy.length && !ctx.hatAggregat) || !ctx.bindungen.length) {
      return Object.assign(leer, { bereiche: bereiche, hinweis: HINWEIS_OHNE_GRUPPEN });
    }

    // Aggregate wie geschrieben (ohne Doppelte)
    var aggKnoten = aggregateIn(ast.spalten).concat(ast.having ? aggregateIn(ast.having) : []);
    var aggregate = [];
    var gesehen = {};
    aggKnoten.forEach(function (k) {
      var t = ausschnitt(ctx.sql, k);
      var schl = t.replace(/\s+/g, '').toUpperCase();
      if (!gesehen[schl]) {
        gesehen[schl] = true;
        aggregate.push(t);
      }
    });

    // Umschalter COUNT(*) ↔ SUM(Spalte)
    var umschalterSpalte = null;
    var summeAusdruck = null;
    var nutztCountSum = aggKnoten.some(function (k) {
      return k.name === 'COUNT' || k.name === 'SUM';
    });
    if (nutztCountSum) {
      var sum = aggKnoten.filter(function (k) {
        return k.name === 'SUM' && k.argument;
      })[0];
      if (sum) {
        umschalterSpalte = ausschnitt(ctx.sql, sum.argument);
        summeAusdruck = sum.argument.typ === 'name' ? umschalterSpalte : aufgeloest(ctx, sum.argument, false);
      } else {
        var zahlen = ctx.spalten.filter(function (s) {
          return /INT|REAL|NUM|DEC|DOUB|FLOA/.test(s.typ);
        });
        var wahl = zahlen.filter(function (s) {
          return !s.pk && !s.fk;
        })[0] || zahlen[0];
        if (wahl) {
          umschalterSpalte = wahl.label;
          summeAusdruck = wahl.ausdruck;
        }
      }
    }

    var nachWhere = await nachWhereAnzahl(ctx);
    var verworfen = ctx.produkt - nachWhere;
    var korbZeilen = ast.where && verworfen > 0 ? await whereStichprobe(ctx, 0, verworfen, MAX_KORB, true) : [];
    var korb = {
      anzahl: verworfen,
      zeilen: korbZeilen.map(function (z) {
        return { id: z.id, werte: z.werte };
      })
    };

    var faecher;
    var gesamt;
    var extras = aggregate.map(function (t, i) {
      return aufgeloest(ctx, aggKnoten.filter(function (k) {
        return ausschnitt(ctx.sql, k) === t;
      })[0], false);
    });
    var umschalterWerte = null;
    if (ast.groupBy.length) {
      gesamt = await zaehle(ctx, 'SELECT 1' + ctx.basis + '\nGROUP BY ' + ctx.schluesselListe);
      var liste = await gruppenListe(ctx, extras, summeAusdruck);
      var gewaehlt = waehleGruppen(liste, MAX_FAECHER, !!ast.having);
      var zeilen = nachWhere > MAX_ZEILEN_GRUPPIEREN
        ? []
        : await gruppenZeilen(
            ctx,
            gewaehlt.map(function (g) {
              return g.nr;
            }),
            MAX_KARTEN_JE_FACH
          );
      faecher = gewaehlt.map(function (g, i) {
        var o = gruppenObjekt(g, i < 3 ? i + 1 : null, false);
        o.zeilen = zeilen
          .filter(function (z) {
            return z.gruppe === g.nr;
          })
          .map(function (z) {
            return { id: z.id, werte: z.werte };
          });
        o.aggregate = g.aggregate;
        o.havingRaus = !g.behalten;
        return o;
      });
      if (summeAusdruck) {
        umschalterWerte = gewaehlt.map(function (g) {
          return { count: g.anzahl, sum: g.summe };
        });
      }
    } else {
      // ein Fach mit allen Zeilen
      gesamt = 1;
      var teile = extras.map(function (x, i) {
        return '(' + x + ') AS "__a' + i + '"';
      });
      teile.push('COUNT(*) AS "__n"');
      if (summeAusdruck) teile.push('SUM(' + summeAusdruck + ') AS "__s"');
      var ea = await lauf('SELECT ' + teile.join(', ') + ctx.basis);
      var z0 = ea.zeilen[0];
      var karten = await lauf('SELECT ' + ctx.zeilenAuswahl + ctx.basis + '\nLIMIT ' + MAX_KARTEN_JE_FACH);
      faecher = [
        {
          nr: 1,
          schluessel: [],
          name: 'alle Zeilen',
          farbe: 1,
          anzahl: z0[extras.length],
          zeilen: karten.zeilen.map(function (z) {
            return zeileAus(ctx, z);
          }),
          aggregate: z0.slice(0, extras.length),
          havingRaus: false
        }
      ];
      if (summeAusdruck) umschalterWerte = [{ count: z0[extras.length], sum: z0[extras.length + 1] }];
    }

    return {
      spalten: ctx.labels.slice(),
      relevant: ctx.relevant.slice(),
      gesamt: gesamt,
      korb: korb,
      faecher: faecher,
      aggregate: aggregate,
      umschalter: umschalterSpalte && umschalterWerte ? { spalte: umschalterSpalte, werte: umschalterWerte } : null,
      bereiche: bereiche,
      hinweis: gesamt > faecher.length ? 'Angezeigt ' + wort(faecher.length, 'wird', 'werden') + ' ' + zahl(faecher.length) + ' von ' + zahl(gesamt) + ' Fächern.' : null
    };
  }

  // ------------------------------------------------------------------------------------------------------------
  // Spurenbrett

  function istAlias(s) {
    return typeof s === 'string' && /^[A-Za-z_][A-Za-z0-9_]{0,30}$/.test(s);
  }

  function literal(w) {
    if (typeof w === 'number' && isFinite(w)) return String(w);
    if (typeof w === 'string') return lit(w);
    throw new NutzerFehler('Die Auswahl der Zeilen enthält einen ungültigen Wert.');
  }

  /**
   * spurenbrett({ tabellen: [{ name, alias?, zeilen?: [PK-Wert | [PK-Werte]] | limit?: n }], bedingung? }, fuehreAus)
   * → Promise<{
   *   tabellen: [{ name, alias, ref, spalten: [Name], pk: [Spaltenindex], zeilen: [[wert, …]] }] (2–3 Tabellen, je ≤ 50
   *             Zeilen, Standard 5),
   *   faeden: [[i, j(, k)]] alle Kombinationen der Zeilenindizes (leer, wenn zusammengefasst),
   *   passend: [[i, j(, k)]] Kombinationen, die die Bedingung erfüllen (≤ 2000; ohne Bedingung null),
   *   gesamt (n × m (× k)), rechnung ('45 × 13'), bleiben (exakt), text ('45 × 13 = 585 Fäden → 32 bleiben'),
   *   ohneFaden: [{ tabelle, zeile }] Zeilen, an denen kein passender Faden hängt (z. B. NULL-Fremdschlüssel),
   *   zusammengefasst (mehr als 2 000 Fäden), bedingung (geprüfter Text | null), hinweis: Text|null
   * } | { fehler }>
   */
  async function spurenbrett(eingabe, fuehreAus, optionen) {
    var lauf = erzeugeLauf(fuehreAus);
    var ersterLauf = true;
    try {
      eingabe = eingabe || {};
      var wunsch = Array.isArray(eingabe.tabellen) ? eingabe.tabellen : [];
      if (wunsch.length < 2 || wunsch.length > MAX_TABELLEN_SPURENBRETT) {
        throw new NutzerFehler('Wähle zwei oder drei Tabellen für das Spurenbrett.');
      }
      var vorhanden = await lauf("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite\\_%' ESCAPE '\\'");
      var namen = {};
      vorhanden.zeilen.forEach(function (z) {
        namen[klein(z[0])] = z[0];
      });
      var refs = {};
      var tabellen = wunsch.map(function (w) {
        w = typeof w === 'string' ? { name: w } : w || {};
        var echt = namen[klein(w.name)];
        if (!echt) throw new NutzerFehler('Die Tabelle „' + String(w.name).slice(0, 40) + '“ gibt es in dieser Datenbank nicht.');
        if (w.alias != null && !istAlias(w.alias)) throw new NutzerFehler('Der Alias „' + String(w.alias).slice(0, 40) + '“ ist ungültig.');
        var ref = w.alias || echt;
        if (refs[klein(ref)]) throw new NutzerFehler('Die Tabelle ' + echt + ' ist doppelt gewählt – gib ihr einen Alias.');
        refs[klein(ref)] = true;
        return { name: echt, alias: w.alias || null, ref: ref, wunsch: w, spalten: [], pkSpalten: [] };
      });

      var info = await lauf(
        tabellen
          .map(function (t, i) {
            return 'SELECT ' + i + ' AS b, cid, name, pk FROM pragma_table_info(' + lit(t.name) + ')';
          })
          .join('\nUNION ALL\n') + '\nORDER BY b, cid'
      );
      info.zeilen.forEach(function (z) {
        var t = tabellen[z[0]];
        t.spalten.push(z[2]);
        if (z[3] > 0) t.pkSpalten.push({ index: t.spalten.length - 1, reihe: z[3] });
      });
      tabellen.forEach(function (t) {
        t.pkSpalten.sort(function (x, y) {
          return x.reihe - y.reihe;
        });
      });

      // Bedingung prüfen
      var vonText = tabellen
        .map(function (t) {
          return q(t.name) + (t.alias ? ' ' + t.alias : '');
        })
        .join(', ');
      var bedingung = typeof eingabe.bedingung === 'string' && eingabe.bedingung.trim() ? eingabe.bedingung : null;
      var bedingungText = null;
      if (bedingung) bedingungText = pruefeBedingung(bedingung, vonText, tabellen);

      // Zeilen je Tabelle
      for (var ti = 0; ti < tabellen.length; ti++) {
        var t = tabellen[ti];
        var w = t.wunsch;
        var auswahl = t.spalten
          .map(function (s) {
            return q(s);
          })
          .join(', ');
        var abfrage;
        if (Array.isArray(w.zeilen)) {
          if (!w.zeilen.length || w.zeilen.length > MAX_ZEILEN_SPURENBRETT) {
            throw new NutzerFehler('Wähle je Tabelle 1 bis ' + MAX_ZEILEN_SPURENBRETT + ' Zeilen.');
          }
          var pk = t.pkSpalten.length
            ? t.pkSpalten.map(function (p) {
                return q(t.spalten[p.index]);
              })
            : ['_rowid_'];
          var oder = w.zeilen.map(function (wert) {
            var werte = Array.isArray(wert) ? wert : [wert];
            if (werte.length !== pk.length) throw new NutzerFehler('Die Auswahl der Zeilen passt nicht zum Primärschlüssel von ' + t.name + '.');
            return '(' + pk
              .map(function (spalte, k) {
                return spalte + ' = ' + literal(werte[k]);
              })
              .join(' AND ') + ')';
          });
          abfrage = 'SELECT _rowid_, ' + auswahl + ' FROM ' + q(t.name) + ' WHERE ' + oder.join(' OR ') + ' ORDER BY _rowid_ LIMIT ' + MAX_ZEILEN_SPURENBRETT;
        } else {
          var limit = w.limit == null ? STANDARD_ZEILEN_SPURENBRETT : Math.floor(Number(w.limit));
          if (!(limit >= 1 && limit <= MAX_ZEILEN_SPURENBRETT)) throw new NutzerFehler('Wähle je Tabelle 1 bis ' + MAX_ZEILEN_SPURENBRETT + ' Zeilen.');
          abfrage = 'SELECT _rowid_, ' + auswahl + ' FROM ' + q(t.name) + ' ORDER BY _rowid_ LIMIT ' + limit;
        }
        var e = await lauf(abfrage);
        t.rowids = e.zeilen.map(function (z) {
          return z[0];
        });
        t.zeilen = e.zeilen.map(function (z) {
          return z.slice(1);
        });
      }
      ersterLauf = false;

      var anzahlen = tabellen.map(function (t) {
        return t.zeilen.length;
      });
      var gesamt = anzahlen.reduce(function (p, n) {
        return p * n;
      }, 1);
      var rechnung = anzahlen.join(' × ');
      var zusammengefasst = gesamt > MAX_FAEDEN;
      var faeden = [];
      if (!zusammengefasst) {
        (function kombiniere(praefix, k) {
          if (k === tabellen.length) {
            faeden.push(praefix);
            return;
          }
          for (var i = 0; i < anzahlen[k]; i++) kombiniere(praefix.concat([i]), k + 1);
        })([], 0);
      }

      var passend = null;
      var bleiben = gesamt;
      var ohneFaden = [];
      if (bedingungText && gesamt > 0) {
        ersterLauf = true;
        var filter = tabellen
          .map(function (t) {
            return q(t.ref) + '._rowid_ IN (' + t.rowids.join(', ') + ')';
          })
          .join(' AND ');
        var basis = ' FROM ' + vonText + ' WHERE ' + filter + ' AND (' + bedingungText + '\n)';
        var ec = await lauf('SELECT COUNT(*)' + basis);
        bleiben = ec.zeilen[0][0];
        var kombi = tabellen
          .map(function (t) {
            return q(t.ref) + '._rowid_';
          })
          .join(" || ',' || ");
        var eg = await lauf('SELECT group_concat(k, \' \') FROM (SELECT ' + kombi + ' AS k' + basis + ' LIMIT ' + MAX_FAEDEN + ')');
        ersterLauf = false;
        var index = tabellen.map(function (t) {
          var m = {};
          t.rowids.forEach(function (r, i) {
            m[r] = i;
          });
          return m;
        });
        var text = eg.zeilen[0][0];
        passend = text
          ? String(text)
              .split(' ')
              .map(function (teil) {
                return teil.split(',').map(function (r, k) {
                  return index[k][r];
                });
              })
          : [];
        passend.sort(function (x, y) {
          for (var i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] - y[i];
          return 0;
        });
        if (bleiben <= MAX_FAEDEN) {
          tabellen.forEach(function (t, k) {
            var haengt = {};
            passend.forEach(function (p) {
              haengt[p[k]] = true;
            });
            for (var i = 0; i < t.zeilen.length; i++) if (!haengt[i]) ohneFaden.push({ tabelle: k, zeile: i });
          });
        }
      }

      return {
        tabellen: tabellen.map(function (t) {
          return {
            name: t.name,
            alias: t.alias,
            ref: t.ref,
            spalten: t.spalten.slice(),
            pk: t.pkSpalten.map(function (p) {
              return p.index;
            }),
            zeilen: t.zeilen
          };
        }),
        faeden: faeden,
        passend: passend,
        gesamt: gesamt,
        rechnung: rechnung,
        bleiben: bleiben,
        text: rechnung + ' = ' + zahl(gesamt) + ' ' + wort(gesamt, 'Faden', 'Fäden') + (bedingungText ? ' → ' + zahl(bleiben) + ' ' + wort(bleiben, 'bleibt', 'bleiben') : ''),
        ohneFaden: ohneFaden,
        zusammengefasst: zusammengefasst,
        bedingung: bedingungText,
        hinweis: zusammengefasst ? 'Zu viele Fäden zum Zeichnen (' + zahl(gesamt) + ') – gezeigt werden nur die Zähler. Wähle weniger Zeilen.' : null
      };
    } catch (e) {
      return fange(e, optionen, ersterLauf);
    }
  }

  /** Prüft die Bedingung des Spurenbretts und liefert ihren Text (ohne ; und Kommentare am Rand). */
  function pruefeBedingung(bedingung, vonText, tabellen) {
    var P = holeParser();
    var sql = 'SELECT *\nFROM ' + vonText + '\nWHERE ' + bedingung;
    var p = P.parse(sql);
    if (!p.ast) throw new NutzerFehler(p.fehler[0].text);
    var ast = p.ast;
    if (ast.typ !== 'select' || enthaeltFremdkoerper(ast)) throw new NutzerFehler('Die Bedingung darf nur Spalten, Werte und Vergleiche enthalten.');
    if (ast.from.length !== tabellen.length || !ast.where || ast.groupBy.length || ast.having || ast.orderBy.length || ast.limit) {
      throw new NutzerFehler('Schreib nur die Bedingung – ohne GROUP BY, ORDER BY oder LIMIT.');
    }
    if (aggregateIn(ast.where).length) throw new NutzerFehler('Aggregatfunktionen gehören nicht in eine Verbundbedingung.');
    besucheAlle(ast.where, function (k) {
      if (k.typ === 'stern') throw new NutzerFehler('Die Bedingung darf nur Spalten, Werte und Vergleiche enthalten.');
      if (k.typ !== 'name') return;
      if (k.tabelle) {
        var t = tabellen.filter(function (x) {
          return klein(x.ref) === klein(k.tabelle);
        })[0];
        if (!t) throw new NutzerFehler('Die Tabelle „' + k.tabelle + '“ ist auf dem Spurenbrett nicht ausgewählt.');
        if (!t.spalten.some(function (s) {
          return klein(s) === klein(k.spalte);
        })) {
          throw new NutzerFehler('Die Spalte „' + k.spalte + '“ gibt es in der Tabelle ' + t.ref + ' nicht.');
        }
      } else {
        var treffer = tabellen.filter(function (x) {
          return x.spalten.some(function (s) {
            return klein(s) === klein(k.spalte);
          });
        });
        if (!treffer.length) throw new NutzerFehler('Die Spalte „' + k.spalte + '“ gibt es in den gewählten Tabellen nicht.');
        if (treffer.length > 1) throw new NutzerFehler('Die Spalte „' + k.spalte + '“ gibt es in mehreren Tabellen – schreib Tabelle.Spalte.');
      }
    });
    return ausschnitt(sql, ast.where);
  }

  /**
   * vorschlag(schema, tabellen) → Verbundbedingung FK = PK zwischen den gewählten Tabellen oder null.
   * schema: [{ tabelle | name, spalten: [{ name, pk, fk: { tabelle, spalte } | null }] }]; tabellen: ['Rad', …] oder
   * [{ name, alias? }]. Je Tabellenpaar höchstens ein Fremdschlüssel; Teilbedingungen mit AND verbunden.
   */
  function vorschlag(schema, tabellen) {
    if (!Array.isArray(schema) || !Array.isArray(tabellen)) return null;
    var nachName = {};
    schema.forEach(function (t) {
      nachName[klein(t.tabelle || t.name)] = t;
    });
    var bindungen = tabellen.map(function (w) {
      w = typeof w === 'string' ? { name: w } : w || {};
      var t = nachName[klein(w.name)];
      return t ? { t: t, name: t.tabelle || t.name, ref: w.alias || t.tabelle || t.name } : null;
    });
    var teile = [];
    var paare = {};
    bindungen.forEach(function (x, i) {
      if (!x) return;
      (x.t.spalten || []).forEach(function (s) {
        if (!s.fk || !s.fk.tabelle) return;
        bindungen.forEach(function (y, j) {
          if (!y || i === j || klein(y.name) !== klein(s.fk.tabelle)) return;
          var paar = Math.min(i, j) + '-' + Math.max(i, j);
          if (paare[paar]) return;
          var ziel = s.fk.spalte;
          if (!ziel) {
            var pk = (y.t.spalten || []).filter(function (p) {
              return p.pk;
            })[0];
            ziel = pk ? pk.name : null;
          }
          if (!ziel) return;
          paare[paar] = true;
          teile.push(x.ref + '.' + s.name + ' = ' + y.ref + '.' + ziel);
        });
      });
    });
    return teile.length ? teile.join(' AND ') : null;
  }

  return {
    zeitlupe: zeitlupe,
    sortierfaecher: sortierfaecher,
    spurenbrett: spurenbrett,
    vorschlag: vorschlag,
    GRENZEN: {
      anzeige: MAX_ANZEIGE,
      stichprobeAb: STICHPROBE_AB,
      faeden: MAX_FAEDEN,
      gruppen: MAX_GRUPPEN_ANZEIGE,
      faecher: MAX_FAECHER,
      kartenJeFach: MAX_KARTEN_JE_FACH,
      korb: MAX_KORB,
      zeilenSpurenbrett: MAX_ZEILEN_SPURENBRETT,
      standardZeilenSpurenbrett: STANDARD_ZEILEN_SPURENBRETT
    }
  };
});
