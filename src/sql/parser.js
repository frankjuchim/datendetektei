/*
 * Datendetektei – Tokenizer und Parser für SQL nach EH 2025 §8 (Spec §2.3, §7.3).
 * Isomorph: CommonJS im Server, im Browser als self.DD_SQL_PARSER. Keine Abhängigkeiten.
 *
 * Sprachumfang (rekursiver Abstieg):
 *   SELECT [DISTINCT] * | ausdruck [[AS] alias], …  [FROM quelle, …]  [WHERE bedingung]
 *   [GROUP BY ausdruck, … [HAVING bedingung]]  [ORDER BY ausdruck [ASC|DESC], …]  [LIMIT anzahl [OFFSET n]]
 * Fremdkörper werden als eigene Knoten geparst, damit die Regeln (regeln.js) gezielt warnen können:
 *   join (JOIN … ON/USING, LEFT/CROSS/NATURAL JOIN), unterabfrage (IN/EXISTS/skalar/FROM/WITH), union
 *   (UNION [ALL]/INTERSECT/EXCEPT), nichtSelect (INSERT, UPDATE, DELETE, CREATE, DROP, ALTER, PRAGMA, ATTACH, …).
 *
 * Positionen: { zeile, spalte, index } – Zeile/Spalte 1-basiert, index 0-basiert (UTF-16 wie JS-Strings);
 * „ende“ zeigt hinter das letzte Zeichen (exklusiv).
 */
(function (wurzel, fabrik) {
  if (typeof module === 'object' && module.exports) module.exports = fabrik();
  else wurzel.DD_SQL_PARSER = fabrik();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Schlüsselwörter (Groß-/Kleinschreibung egal). Bewusst ohne Wörter, die als Spalten-/Tabellennamen in unseren
  // Datenbanken vorkommen (z. B. Position, Start, Ende, Status).
  var SCHLUESSELWOERTER = [
    'SELECT', 'DISTINCT', 'ALL', 'FROM', 'WHERE', 'GROUP', 'BY', 'HAVING', 'ORDER', 'ASC', 'DESC', 'LIMIT', 'OFFSET',
    'AS', 'AND', 'OR', 'NOT', 'IS', 'NULL', 'IN', 'BETWEEN', 'LIKE', 'ESCAPE', 'EXISTS',
    'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'OUTER', 'CROSS', 'NATURAL', 'ON', 'USING',
    'UNION', 'INTERSECT', 'EXCEPT', 'WITH', 'RECURSIVE',
    'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE', 'DROP', 'ALTER',
    'ATTACH', 'DETACH', 'PRAGMA', 'VACUUM', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'CAST'
  ];
  var IST_SCHLUESSEL = {};
  SCHLUESSELWOERTER.forEach(function (w) { IST_SCHLUESSEL[w] = true; });

  // Anweisungen, die kein SELECT sind (Knoten nichtSelect). Auch Wörter, die keine Schlüsselwörter sind.
  var NICHT_SELECT = {
    INSERT: 1, UPDATE: 1, DELETE: 1, CREATE: 1, DROP: 1, ALTER: 1, REPLACE: 1, ATTACH: 1, DETACH: 1, PRAGMA: 1,
    VACUUM: 1, REINDEX: 1, ANALYZE: 1, BEGIN: 1, COMMIT: 1, END: 1, ROLLBACK: 1, SAVEPOINT: 1, RELEASE: 1,
    EXPLAIN: 1, UPSERT: 1
  };

  // Aggregatfunktionen nach EH §8 (+ SQLite-Aggregate, damit die GROUP-BY-Regel sie richtig behandelt).
  var EH_AGGREGATE = { AVG: 1, COUNT: 1, MAX: 1, MIN: 1, SUM: 1 };
  var AGGREGATE = { AVG: 1, COUNT: 1, MAX: 1, MIN: 1, SUM: 1, TOTAL: 1, GROUP_CONCAT: 1 };

  // Klauseln eines SELECT in ihrer Reihenfolge (für KLAUSEL_REIHENFOLGE).
  var KLAUSELN = ['FROM', 'WHERE', 'GROUP', 'HAVING', 'ORDER', 'LIMIT'];
  var KLAUSEL_NAME = { FROM: 'FROM', WHERE: 'WHERE', GROUP: 'GROUP BY', HAVING: 'HAVING', ORDER: 'ORDER BY', LIMIT: 'LIMIT' };

  var VERGLEICHE = { '=': 1, '==': 1, '!=': 1, '<>': 1, '<': 1, '<=': 1, '>': 1, '>=': 1 };

  // ------------------------------------------------------------------------------------------------------------
  // Tokenizer

  function istBuchstabe(z) {
    return /[A-Za-z_À-ɏͰ-ϿЀ-ӿ]/.test(z);
  }
  function istZiffer(z) {
    return z >= '0' && z <= '9';
  }

  /**
   * Zerlegt den Text in Tokens. Mit { alle: true } auch Leerraum und Kommentare (für die Hervorhebung).
   * Token: { art: schluessel|name|zahl|text|operator|kommentar|leer|unbekannt, wert, roh, start, ende, zitiert? }
   */
  function zerlegeIntern(sql, alle) {
    var tokens = [];
    var fehler = [];
    var i = 0;
    var zeile = 1;
    var spalte = 1;
    var n = sql.length;

    function pos() {
      return { zeile: zeile, spalte: spalte, index: i };
    }
    function weiter(anzahl) {
      for (var k = 0; k < anzahl && i < n; k++) {
        var z = sql[i];
        if (z === '\r') {
          if (sql[i + 1] === '\n') {
            i++;
          }
          zeile++;
          spalte = 1;
        } else if (z === '\n') {
          zeile++;
          spalte = 1;
        } else {
          spalte++;
        }
        i++;
      }
    }
    function token(art, wert, start, extra) {
      var t = { art: art, wert: wert, roh: sql.slice(start.index, i), start: start, ende: pos() };
      if (extra) for (var s in extra) t[s] = extra[s];
      if (alle || (art !== 'leer' && art !== 'kommentar')) tokens.push(t);
      return t;
    }
    function fehlerBei(code, text, p) {
      fehler.push({ code: code, text: text, zeile: p.zeile, spalte: p.spalte });
    }

    while (i < n) {
      var start = pos();
      var z = sql[i];
      var z2 = sql.slice(i, i + 2);

      if (/\s/.test(z)) {
        while (i < n && /\s/.test(sql[i])) weiter(1);
        token('leer', null, start);
      } else if (z2 === '--') {
        while (i < n && sql[i] !== '\n' && sql[i] !== '\r') weiter(1);
        token('kommentar', null, start);
      } else if (z2 === '/*') {
        var endeKommentar = sql.indexOf('*/', i + 2);
        if (endeKommentar < 0) {
          weiter(n - i);
          fehlerBei('KOMMENTAR_OFFEN', 'Der Kommentar /* wird nicht mit */ geschlossen.', start);
        } else {
          weiter(endeKommentar + 2 - i);
        }
        token('kommentar', null, start);
      } else if (z === "'") {
        // Text in Hochkommata, '' steht für ein Hochkomma.
        weiter(1);
        var wert = '';
        var geschlossen = false;
        while (i < n) {
          if (sql[i] === "'") {
            if (sql[i + 1] === "'") {
              wert += "'";
              weiter(2);
              continue;
            }
            weiter(1);
            geschlossen = true;
            break;
          }
          wert += sql[i];
          weiter(1);
        }
        if (!geschlossen) {
          fehlerBei('TEXT_OFFEN', "Der Text ab hier wird nicht mit einem Hochkomma ' geschlossen.", start);
        }
        token('text', wert, start, geschlossen ? null : { offen: true });
      } else if (z === '"' || z === '`' || z === '[') {
        // Name in Anführungszeichen (SQLite), z. B. Alias "Name der Station".
        var schluss = z === '[' ? ']' : z;
        weiter(1);
        var name = '';
        var zu = false;
        while (i < n) {
          if (sql[i] === schluss) {
            if (schluss !== ']' && sql[i + 1] === schluss) {
              name += schluss;
              weiter(2);
              continue;
            }
            weiter(1);
            zu = true;
            break;
          }
          name += sql[i];
          weiter(1);
        }
        if (!zu) fehlerBei('NAME_OFFEN', 'Der Name ab hier wird nicht mit ' + schluss + ' geschlossen.', start);
        token('name', name, start, { zitiert: true });
      } else if (istZiffer(z) || (z === '.' && istZiffer(sql[i + 1] || ''))) {
        while (i < n && istZiffer(sql[i])) weiter(1);
        if (sql[i] === '.') {
          weiter(1);
          while (i < n && istZiffer(sql[i])) weiter(1);
        }
        if ((sql[i] === 'e' || sql[i] === 'E') && (istZiffer(sql[i + 1] || '') || ((sql[i + 1] === '+' || sql[i + 1] === '-') && istZiffer(sql[i + 2] || '')))) {
          weiter(2);
          while (i < n && istZiffer(sql[i])) weiter(1);
        }
        token('zahl', sql.slice(start.index, i), start);
      } else if (istBuchstabe(z)) {
        while (i < n && (istBuchstabe(sql[i]) || istZiffer(sql[i]) || sql[i] === '$')) weiter(1);
        var wort = sql.slice(start.index, i);
        var gross = wort.toUpperCase();
        if (IST_SCHLUESSEL[gross]) token('schluessel', gross, start);
        else token('name', wort, start);
      } else if (z2 === '!=' || z2 === '<>' || z2 === '<=' || z2 === '>=' || z2 === '==' || z2 === '||') {
        weiter(2);
        token('operator', z2, start);
      } else if ('=<>+-*/%(),.;'.indexOf(z) >= 0) {
        weiter(1);
        token('operator', z, start);
      } else {
        weiter(1);
        var zeichen = sql.slice(start.index, i);
        var text;
        if ('‘’‚´`'.indexOf(zeichen) >= 0 || zeichen === '’') {
          text = 'Das Zeichen ' + zeichen + " ist ein typografisches Hochkomma. Schreib Text mit dem geraden Hochkomma ' (Taste neben Ä).";
        } else if ('„“”«»'.indexOf(zeichen) >= 0) {
          text = 'Das Zeichen ' + zeichen + " ist ein Anführungszeichen. Schreib Text in gerade Hochkommata: '…'.";
        } else if (zeichen === '!') {
          text = 'Ein einzelnes ! gibt es in SQL nicht. Meinst du != (ungleich)?';
        } else {
          text = 'Das Zeichen ' + zeichen + ' gehört nicht zu SQL.';
        }
        fehlerBei('UNBEKANNTES_ZEICHEN', text, start);
        token('unbekannt', zeichen, start);
      }
    }
    return { tokens: tokens, fehler: fehler };
  }

  /** zerlege(sql) → { tokens, fehler } (ohne Leerraum und Kommentare). */
  function zerlege(sql) {
    return zerlegeIntern(String(sql == null ? '' : sql), false);
  }

  /**
   * Syntax-Hervorhebung für das Overlay der Konsole: lückenlose Folge [{ text, klasse }], deren Texte aneinander-
   * gehängt genau die Eingabe ergeben. Klassen: schluessel, aggregat, text, zahl, kommentar, name, operator, leer.
   */
  function hebeHervor(sql) {
    sql = String(sql == null ? '' : sql);
    var tokens = zerlegeIntern(sql, true).tokens;
    var teile = [];
    for (var k = 0; k < tokens.length; k++) {
      var t = tokens[k];
      var klasse;
      if (t.art === 'name') {
        var gross = t.wert.toUpperCase();
        if (!t.zitiert && EH_AGGREGATE[gross]) klasse = 'aggregat';
        else if (!t.zitiert && k === erstesBedeutendes(tokens) && NICHT_SELECT[gross]) klasse = 'schluessel';
        else klasse = 'name';
      } else if (t.art === 'unbekannt') {
        klasse = 'operator';
      } else {
        klasse = t.art;
      }
      teile.push({ text: t.roh, klasse: klasse });
    }
    return teile;
  }

  function erstesBedeutendes(tokens) {
    for (var k = 0; k < tokens.length; k++) {
      if (tokens[k].art !== 'leer' && tokens[k].art !== 'kommentar') return k;
    }
    return -1;
  }

  // ------------------------------------------------------------------------------------------------------------
  // Parser

  function ParseFehler(code, text, p) {
    this.code = code;
    this.text = text;
    this.zeile = p.zeile;
    this.spalte = p.spalte;
  }

  function beschreibe(t) {
    if (!t) return 'das Ende der Abfrage';
    if (t.art === 'text') return "den Text '" + kuerze(t.wert) + "'";
    if (t.art === 'zahl') return 'die Zahl ' + t.wert;
    return '„' + kuerze(t.roh) + '“';
  }
  function kuerze(s) {
    s = String(s);
    return s.length > 30 ? s.slice(0, 30) + '…' : s;
  }

  /** parse(sql) → { ast, fehler: [{ code, text, zeile, spalte }] }; bei Fehlern ist ast null. */
  function parse(sql) {
    sql = String(sql == null ? '' : sql);
    var zerlegt = zerlegeIntern(sql, false);
    if (zerlegt.fehler.length) return { ast: null, fehler: zerlegt.fehler };
    var tokens = zerlegt.tokens;
    if (!tokens.length) {
      return { ast: null, fehler: [{ code: 'LEER', text: 'Die Abfrage ist leer. Schreib eine Abfrage, die mit SELECT beginnt.', zeile: 1, spalte: 1 }] };
    }
    var p = 0;
    var endePos = tokens[tokens.length - 1].ende;

    // --- Hilfen
    function akt() {
      return tokens[p];
    }
    function vor(k) {
      return tokens[p + (k || 0)];
    }
    function istSchluessel(w, t) {
      t = t === undefined ? tokens[p] : t;
      return !!t && t.art === 'schluessel' && t.wert === w;
    }
    function istOp(o, t) {
      t = t === undefined ? tokens[p] : t;
      return !!t && t.art === 'operator' && t.wert === o;
    }
    function nimm() {
      return tokens[p++];
    }
    function startVon(t) {
      return t ? t.start : endePos;
    }
    function letztesEnde() {
      return tokens[p - 1] ? tokens[p - 1].ende : endePos;
    }
    function fehler(erwartet, t) {
      t = t === undefined ? akt() : t;
      if (!t) {
        throw new ParseFehler('UNERWARTETES_ENDE', 'Die Abfrage hört zu früh auf – es fehlt noch ' + erwartet + '.', endePos);
      }
      throw new ParseFehler('SYNTAX', 'Unerwartet: ' + beschreibe(t) + ' – erwartet ' + erwartet + '.', t.start);
    }
    function erwarteSchluessel(w, erwartet) {
      if (!istSchluessel(w)) fehler(erwartet || w);
      return nimm();
    }
    function erwarteOp(o, erwartet) {
      if (!istOp(o)) fehler(erwartet || o);
      return nimm();
    }
    function knoten(typ, start, felder) {
      var k = { typ: typ };
      for (var s in felder) k[s] = felder[s];
      k.start = start;
      k.ende = letztesEnde();
      return k;
    }
    function istName(t) {
      t = t === undefined ? tokens[p] : t;
      return !!t && t.art === 'name';
    }
    function schliesseKlammer(offen, was) {
      if (istOp(')')) return nimm();
      var t = akt();
      var text = 'Hier fehlt die schließende Klammer ) zur Klammer in Zeile ' + offen.start.zeile + ', Spalte ' + offen.start.spalte + (was ? ' (' + was + ')' : '') + '.';
      if (!t) throw new ParseFehler('KLAMMER_FEHLT', text, endePos);
      if (t.art === 'schluessel' || t.art === 'operator' && t.wert === ';') throw new ParseFehler('KLAMMER_FEHLT', text, t.start);
      fehler(')');
    }

    // --- Anweisung
    function anweisung() {
      var t = akt();
      var wort = t.art === 'schluessel' || t.art === 'name' ? String(t.wert).toUpperCase() : '';
      if (wort === 'SELECT') return abfrage();
      if (wort === 'WITH') return mitAbfrage();
      if (NICHT_SELECT[wort] && !t.zitiert) {
        var start = t.start;
        nimm();
        while (akt() && !istOp(';')) nimm();
        return knoten('nichtSelect', start, { anweisung: wort });
      }
      throw new ParseFehler('SYNTAX', 'Eine Abfrage beginnt mit SELECT. Gefunden: ' + beschreibe(t) + '.', t.start);
    }

    function mitAbfrage() {
      var start = akt().start;
      nimm(); // WITH
      var rekursiv = false;
      if (istSchluessel('RECURSIVE')) {
        nimm();
        rekursiv = true;
      }
      var ctes = [];
      do {
        if (ctes.length) nimm(); // Komma
        var cteStart = startVon(akt());
        if (!istName()) fehler('einen Namen');
        var name = nimm().wert;
        var spalten = [];
        if (istOp('(')) {
          var offen = nimm();
          do {
            if (spalten.length) nimm();
            if (!istName()) fehler('einen Spaltennamen');
            spalten.push(nimm().wert);
          } while (istOp(','));
          schliesseKlammer(offen);
        }
        erwarteSchluessel('AS');
        var auf = erwarteOp('(');
        var innen = abfrage();
        schliesseKlammer(auf);
        ctes.push(knoten('cte', cteStart, { name: name, spalten: spalten, abfrage: innen }));
      } while (istOp(','));
      if (!istSchluessel('SELECT')) fehler('SELECT');
      var haupt = abfrage();
      return knoten('unterabfrage', start, { art: 'with', rekursiv: rekursiv, ctes: ctes, abfrage: haupt, alias: null });
    }

    // abfrage := select ((UNION [ALL] | INTERSECT | EXCEPT) select)*
    function abfrage() {
      var start = akt().start;
      var erstes = select();
      if (!(istSchluessel('UNION') || istSchluessel('INTERSECT') || istSchluessel('EXCEPT'))) return erstes;
      var teile = [erstes];
      var operatoren = [];
      while (istSchluessel('UNION') || istSchluessel('INTERSECT') || istSchluessel('EXCEPT')) {
        var op = nimm().wert;
        if (op === 'UNION' && istSchluessel('ALL')) {
          nimm();
          op = 'UNION ALL';
        }
        operatoren.push(op);
        if (!istSchluessel('SELECT')) fehler('SELECT');
        teile.push(select());
      }
      return knoten('union', start, { teile: teile, operatoren: operatoren });
    }

    function select() {
      var start = erwarteSchluessel('SELECT').start;
      var distinct = false;
      if (istSchluessel('DISTINCT')) {
        nimm();
        distinct = true;
      } else if (istSchluessel('ALL')) {
        nimm();
      }
      var spalten = [spalte()];
      while (istOp(',')) {
        nimm();
        spalten.push(spalte());
      }
      var from = [];
      var where = null;
      var groupBy = [];
      var having = null;
      var orderBy = [];
      var limit = null;
      var offset = null;
      var gesehen = -1; // Index der letzten Klausel in KLAUSELN

      for (;;) {
        var t = akt();
        if (!t || t.art !== 'schluessel') break;
        var stelle = KLAUSELN.indexOf(t.wert);
        if (stelle < 0) break;
        if (stelle <= gesehen) {
          throw new ParseFehler(
            'KLAUSEL_REIHENFOLGE',
            KLAUSEL_NAME[t.wert] + ' steht hier an der falschen Stelle oder doppelt. Reihenfolge: SELECT … FROM … WHERE … GROUP BY … HAVING … ORDER BY … LIMIT.',
            t.start
          );
        }
        if (t.wert === 'HAVING' && gesehen < KLAUSELN.indexOf('GROUP')) {
          throw new ParseFehler('HAVING_OHNE_GROUP_BY', 'HAVING steht nur nach GROUP BY. Eine Bedingung für einzelne Zeilen gehört ins WHERE.', t.start);
        }
        gesehen = stelle;
        nimm();
        if (t.wert === 'FROM') {
          from.push(quelle());
          while (istOp(',')) {
            nimm();
            from.push(quelle());
          }
        } else if (t.wert === 'WHERE') {
          where = ausdruck();
        } else if (t.wert === 'GROUP') {
          erwarteSchluessel('BY', 'BY (GROUP BY)');
          groupBy.push(ausdruck());
          while (istOp(',')) {
            nimm();
            groupBy.push(ausdruck());
          }
        } else if (t.wert === 'HAVING') {
          having = ausdruck();
        } else if (t.wert === 'ORDER') {
          erwarteSchluessel('BY', 'BY (ORDER BY)');
          orderBy.push(sortierung());
          while (istOp(',')) {
            nimm();
            orderBy.push(sortierung());
          }
        } else if (t.wert === 'LIMIT') {
          limit = ausdruck();
          if (istSchluessel('OFFSET') || istOp(',')) {
            nimm();
            offset = ausdruck();
          }
        }
      }
      return knoten('select', start, {
        distinct: distinct,
        spalten: spalten,
        from: from,
        where: where,
        groupBy: groupBy,
        having: having,
        orderBy: orderBy,
        limit: limit,
        offset: offset
      });
    }

    function spalte() {
      var start = startVon(akt());
      var ausdr;
      if (istOp('*')) {
        nimm();
        ausdr = knoten('stern', start, { tabelle: null });
      } else if (istName() && istOp('.', vor(1)) && istOp('*', vor(2))) {
        var tab = nimm().wert;
        nimm();
        nimm();
        ausdr = knoten('stern', start, { tabelle: tab });
      } else {
        if (!akt() || (akt().art === 'schluessel' && !beginntAusdruck(akt()))) fehler('eine Spalte, * oder einen Ausdruck');
        ausdr = ausdruck();
      }
      var alias = null;
      var aliasMitAs = false;
      if (istSchluessel('AS')) {
        nimm();
        if (!istName() && !(akt() && akt().art === 'text')) fehler('einen Spaltenalias nach AS');
        alias = nimm().wert;
        aliasMitAs = true;
      } else if (istName() && ausdr.typ !== 'stern') {
        var aliasToken = nimm();
        alias = aliasToken.wert;
        // Ein zweiter Name direkt dahinter: fehlendes Komma oder Tippfehler im Schlüsselwort (FORM statt FROM).
        if (istName()) {
          throw new ParseFehler(
            'SYNTAX',
            'Unerwartet: ' + beschreibe(akt()) + '. Fehlt ein Komma, oder ist „' + kuerze(aliasToken.roh) + '“ ein Tippfehler (z. B. FROM)?',
            akt().start
          );
        }
      }
      return knoten('spalte', start, { ausdruck: ausdr, alias: alias, aliasMitAs: aliasMitAs });
    }

    function sortierung() {
      var start = startVon(akt());
      var ausdr = ausdruck();
      var richtung = null;
      if (istSchluessel('ASC') || istSchluessel('DESC')) richtung = nimm().wert;
      return knoten('sortierung', start, { ausdruck: ausdr, richtung: richtung });
    }

    // quelle := einfacheQuelle (joinTeil)*
    function quelle() {
      var links = einfacheQuelle();
      for (;;) {
        var start = links.start;
        var art = null;
        var natural = false;
        var merke = p;
        if (istSchluessel('NATURAL')) {
          nimm();
          natural = true;
        }
        if (istSchluessel('JOIN')) {
          art = 'INNER';
        } else if (istSchluessel('INNER') || istSchluessel('CROSS')) {
          art = nimm().wert;
        } else if (istSchluessel('LEFT') || istSchluessel('RIGHT') || istSchluessel('FULL')) {
          art = nimm().wert;
          if (istSchluessel('OUTER')) nimm();
        }
        if (art === null) {
          p = merke;
          if (natural) fehler('JOIN');
          return links;
        }
        erwarteSchluessel('JOIN');
        var rechts = einfacheQuelle();
        var on = null;
        var using = null;
        if (istSchluessel('ON')) {
          nimm();
          on = ausdruck();
        } else if (istSchluessel('USING')) {
          nimm();
          var offen = erwarteOp('(');
          using = [];
          do {
            if (using.length) nimm();
            if (!istName()) fehler('einen Spaltennamen');
            using.push(nimm().wert);
          } while (istOp(','));
          schliesseKlammer(offen);
        }
        links = knoten('join', start, { art: art, natural: natural, links: links, rechts: rechts, on: on, using: using });
      }
    }

    function einfacheQuelle() {
      var start = startVon(akt());
      var ergebnis;
      if (istOp('(')) {
        var offen = nimm();
        if (!istSchluessel('SELECT')) fehler('SELECT (Unterabfrage)');
        var innen = abfrage();
        schliesseKlammer(offen, 'Unterabfrage');
        ergebnis = knoten('unterabfrage', start, { art: 'from', abfrage: innen, alias: null, aliasMitAs: false });
      } else {
        if (!istName()) fehler('einen Tabellennamen');
        var name = nimm().wert;
        ergebnis = knoten('tabelle', start, { name: name, alias: null, aliasMitAs: false });
      }
      if (istSchluessel('AS')) {
        nimm();
        if (!istName()) fehler('einen Tabellenalias nach AS');
        ergebnis.alias = nimm().wert;
        ergebnis.aliasMitAs = true;
        ergebnis.ende = letztesEnde();
      } else if (istName()) {
        ergebnis.alias = nimm().wert;
        ergebnis.ende = letztesEnde();
      }
      return ergebnis;
    }

    // --- Ausdrücke
    function beginntAusdruck(t) {
      if (!t) return false;
      if (t.art === 'name' || t.art === 'zahl' || t.art === 'text') return true;
      if (t.art === 'operator') return t.wert === '(' || t.wert === '-' || t.wert === '+';
      if (t.art === 'schluessel') return t.wert === 'NULL' || t.wert === 'NOT' || t.wert === 'EXISTS';
      return false;
    }

    function ausdruck() {
      return oder();
    }

    function oder() {
      var links = und();
      while (istSchluessel('OR')) {
        nimm();
        var rechts = und();
        links = knoten('logisch', links.start, { operator: 'OR', links: links, rechts: rechts, klammern: false });
      }
      return links;
    }

    function und() {
      var links = nicht();
      while (istSchluessel('AND')) {
        nimm();
        var rechts = nicht();
        links = knoten('logisch', links.start, { operator: 'AND', links: links, rechts: rechts, klammern: false });
      }
      return links;
    }

    function nicht() {
      if (istSchluessel('NOT')) {
        var start = nimm().start;
        var innen = nicht();
        return knoten('nicht', start, { ausdruck: innen, klammern: false });
      }
      return vergleich();
    }

    function vergleich() {
      var links = summe();
      var start = links.start;
      var t = akt();
      if (!t) return links;
      if (t.art === 'operator' && VERGLEICHE[t.wert]) {
        var op = nimm().wert;
        var rechts = summe();
        return knoten('vergleich', start, { operator: op, links: links, rechts: rechts, klammern: false });
      }
      if (istSchluessel('IS')) {
        nimm();
        var istNicht = false;
        if (istSchluessel('NOT')) {
          nimm();
          istNicht = true;
        }
        erwarteSchluessel('NULL', istNicht ? 'NULL (IS NOT NULL)' : 'NULL (IS NULL)');
        return knoten('istNull', start, { nicht: istNicht, ausdruck: links, klammern: false });
      }
      var verneint = false;
      if (istSchluessel('NOT') && (istSchluessel('IN', vor(1)) || istSchluessel('BETWEEN', vor(1)) || istSchluessel('LIKE', vor(1)))) {
        nimm();
        verneint = true;
      }
      if (istSchluessel('IN')) {
        nimm();
        var offen = erwarteOp('(', '( nach IN');
        if (istSchluessel('SELECT')) {
          var uStart = akt().start;
          var innen = abfrage();
          var u = knoten('unterabfrage', uStart, { art: 'in', abfrage: innen, alias: null });
          schliesseKlammer(offen, 'Unterabfrage');
          return knoten('in', start, { nicht: verneint, ausdruck: links, liste: null, abfrage: u, klammern: false });
        }
        if (istOp(')')) fehler('mindestens einen Wert in der Liste');
        var liste = [ausdruck()];
        while (istOp(',')) {
          nimm();
          liste.push(ausdruck());
        }
        schliesseKlammer(offen, 'Liste nach IN');
        return knoten('in', start, { nicht: verneint, ausdruck: links, liste: liste, abfrage: null, klammern: false });
      }
      if (istSchluessel('BETWEEN')) {
        nimm();
        var von = summe();
        erwarteSchluessel('AND', 'AND (BETWEEN … AND …)');
        var bis = summe();
        return knoten('between', start, { nicht: verneint, ausdruck: links, von: von, bis: bis, klammern: false });
      }
      if (istSchluessel('LIKE')) {
        nimm();
        var muster = summe();
        var escape = null;
        if (istSchluessel('ESCAPE')) {
          nimm();
          escape = summe();
        }
        return knoten('like', start, { nicht: verneint, ausdruck: links, muster: muster, escape: escape, klammern: false });
      }
      if (verneint) fehler('IN, BETWEEN oder LIKE nach NOT');
      return links;
    }

    function summe() {
      var links = produkt();
      while (istOp('+') || istOp('-') || istOp('||')) {
        var op = nimm().wert;
        var rechts = produkt();
        links = knoten('rechnung', links.start, { operator: op, links: links, rechts: rechts, klammern: false });
      }
      return links;
    }

    function produkt() {
      var links = unaer();
      while (istOp('*') || istOp('/') || istOp('%')) {
        var op = nimm().wert;
        var rechts = unaer();
        links = knoten('rechnung', links.start, { operator: op, links: links, rechts: rechts, klammern: false });
      }
      return links;
    }

    function unaer() {
      if (istOp('-') || istOp('+')) {
        var t = nimm();
        var innen = unaer();
        return knoten('vorzeichen', t.start, { operator: t.wert, ausdruck: innen, klammern: false });
      }
      return primaer();
    }

    function primaer() {
      var t = akt();
      if (!t) fehler('einen Wert, eine Spalte oder einen Ausdruck');
      var start = t.start;
      if (t.art === 'zahl') {
        nimm();
        return knoten('zahl', start, { wert: Number(t.wert), roh: t.wert, klammern: false });
      }
      if (t.art === 'text') {
        nimm();
        return knoten('text', start, { wert: t.wert, klammern: false });
      }
      if (istSchluessel('NULL')) {
        nimm();
        return knoten('null', start, { klammern: false });
      }
      if (istSchluessel('EXISTS')) {
        nimm();
        var offenE = erwarteOp('(', '( nach EXISTS');
        if (!istSchluessel('SELECT')) fehler('SELECT (Unterabfrage)');
        var innenE = abfrage();
        schliesseKlammer(offenE, 'Unterabfrage');
        return knoten('unterabfrage', start, { art: 'exists', abfrage: innenE, alias: null, klammern: false });
      }
      if (istOp('(')) {
        var offen = nimm();
        if (istSchluessel('SELECT')) {
          var innenS = abfrage();
          schliesseKlammer(offen, 'Unterabfrage');
          return knoten('unterabfrage', start, { art: 'skalar', abfrage: innenS, alias: null, klammern: false });
        }
        var innen = ausdruck();
        schliesseKlammer(offen);
        innen.klammern = true;
        return innen;
      }
      if (t.art === 'name') {
        nimm();
        if (istOp('(') && !t.zitiert) return funktion(t);
        if (istOp('.')) {
          nimm();
          if (!istName()) fehler('einen Spaltennamen nach „' + kuerze(t.roh) + '.“');
          var sp = nimm();
          return knoten('name', start, { tabelle: t.wert, spalte: sp.wert, klammern: false });
        }
        return knoten('name', start, { tabelle: null, spalte: t.wert, klammern: false });
      }
      fehler('einen Wert, eine Spalte oder einen Ausdruck');
    }

    function funktion(t) {
      var start = t.start;
      var name = t.wert.toUpperCase();
      var offen = nimm(); // (
      if (AGGREGATE[name]) {
        var distinct = false;
        var argument;
        if (istSchluessel('DISTINCT')) {
          nimm();
          distinct = true;
        }
        if (istOp('*') && !distinct) {
          var s = nimm();
          argument = knoten('stern', s.start, { tabelle: null });
        } else {
          if (!beginntAusdruck(akt())) fehler('eine Spalte' + (name === 'COUNT' ? ' oder *' : '') + ' in ' + name + '( … )');
          argument = ausdruck();
        }
        var weitere = [];
        while (istOp(',')) {
          nimm();
          weitere.push(ausdruck());
        }
        schliesseKlammer(offen, name);
        return knoten('aggregat', start, { name: name, distinct: distinct, argument: argument, weitere: weitere, klammern: false });
      }
      var argumente = [];
      if (!istOp(')')) {
        argumente.push(ausdruck());
        while (istOp(',')) {
          nimm();
          argumente.push(ausdruck());
        }
      }
      schliesseKlammer(offen, name);
      return knoten('funktion', start, { name: name, argumente: argumente, klammern: false });
    }

    // --- Ablauf
    try {
      var ast = anweisung();
      if (istOp(';')) {
        nimm();
        if (akt()) {
          throw new ParseFehler(
            'MEHRERE_ANWEISUNGEN',
            'Hier beginnt eine zweite Anweisung. Erlaubt ist nur eine Anweisung – lass alles nach dem ; weg.',
            akt().start
          );
        }
      }
      if (akt()) {
        var rest = akt();
        if (rest.art === 'operator' && rest.wert === ')') {
          throw new ParseFehler('SYNTAX', 'Zu dieser schließenden Klammer ) gibt es keine öffnende.', rest.start);
        }
        fehler('das Ende der Abfrage', rest);
      }
      return { ast: ast, fehler: [] };
    } catch (e) {
      if (e instanceof ParseFehler) {
        return { ast: null, fehler: [{ code: e.code, text: e.text, zeile: e.zeile, spalte: e.spalte }] };
      }
      throw e;
    }
  }

  return {
    zerlege: zerlege,
    parse: parse,
    hebeHervor: hebeHervor,
    SCHLUESSELWOERTER: SCHLUESSELWOERTER.slice(),
    AGGREGATE: Object.keys(EH_AGGREGATE)
  };
});
