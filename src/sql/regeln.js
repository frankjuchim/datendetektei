/*
 * Datendetektei – Regelprüfungen für SQL nach EH 2025 §8 und den Fallen P1–P7 (Spec §5, §7.3; DESIGN §9).
 * Isomorph: CommonJS im Server, im Browser als self.DD_SQL_REGELN. Bekommt den AST aus parser.js
 * (kein require – im Browser werden beide Dateien nacheinander geladen).
 *
 * pruefeRegeln(ast, { schema?, abimodus: 'streng' | 'hinweis' | 'aus' })
 *   → [{ code, falle, art: 'fehler' | 'hinweis', text, zeile, spalte }] (nach Position sortiert)
 * schema = [{ tabelle, spalten: [{ name, pk, fk }] }] (wie src/sql/datenbanken.js) – nötig für MEHRDEUTIG und
 * zum Auflösen von Spalten ohne Tabellenpräfix.
 *
 * Abimodus betrifft nur Fremdkörper (JOIN_ON, UNTERABFRAGE, UNION, UNGLEICH_ALT, NICHT_SELECT):
 *   streng → Fehler, hinweis → Hinweis (NICHT_SELECT bleibt Fehler), aus → still.
 * Die Fallen-Regeln gelten in jedem Modus. AND_OR_MISCH ist immer nur ein Hinweis.
 * Die GROUP-BY-Regel ist strikt (EH §8, Abi-Stil 2026): funktionale Abhängigkeit vom gruppierten Schlüssel
 * reicht nicht – jede nicht aggregierte SELECT-Spalte muss im GROUP BY stehen (auch über ihren Alias).
 * Texte: geduzt, kurz, ohne Lösung.
 */
(function (wurzel, fabrik) {
  if (typeof module === 'object' && module.exports) module.exports = fabrik();
  else wurzel.DD_SQL_REGELN = fabrik();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var CODES = [
    'GB_REGEL', 'HAVING_OHNE_AGG', 'WHERE_MIT_AGG', 'ALIAS_IN_HAVING', 'MEHRDEUTIG', 'KEIN_VERBUND',
    'NULL_VERGLEICH', 'AND_OR_MISCH', 'JOIN_ON', 'UNTERABFRAGE', 'UNION', 'UNGLEICH_ALT', 'NICHT_SELECT'
  ];
  var FALLE = {
    GB_REGEL: 'P3', HAVING_OHNE_AGG: 'P1', WHERE_MIT_AGG: 'P1', ALIAS_IN_HAVING: 'P3', MEHRDEUTIG: 'P7',
    KEIN_VERBUND: 'P2', NULL_VERGLEICH: 'P5', AND_OR_MISCH: 'P6'
  };
  var ABIMODI = { streng: true, hinweis: true, aus: true };

  function klein(s) {
    return String(s).toLowerCase();
  }

  // ------------------------------------------------------------------------------------------------------------
  // AST-Hilfen

  /** Kind-Ausdrücke eines Ausdrucks (ohne in Unterabfragen abzusteigen). */
  function kinder(k) {
    if (!k) return [];
    switch (k.typ) {
      case 'rechnung':
      case 'vergleich':
      case 'logisch':
        return [k.links, k.rechts];
      case 'nicht':
      case 'vorzeichen':
      case 'istNull':
        return [k.ausdruck];
      case 'in':
        return [k.ausdruck].concat(k.liste || []);
      case 'between':
        return [k.ausdruck, k.von, k.bis];
      case 'like':
        return [k.ausdruck, k.muster].concat(k.escape ? [k.escape] : []);
      case 'aggregat':
        return [k.argument].concat(k.weitere || []);
      case 'funktion':
        return k.argumente || [];
      default:
        return [];
    }
  }

  /** Besucht einen Ausdruck und alle Teilausdrücke (nicht in Unterabfragen). */
  function besuche(k, fn, imAggregat) {
    if (!k) return;
    fn(k, !!imAggregat);
    var drin = imAggregat || k.typ === 'aggregat';
    kinder(k).forEach(function (kind) {
      besuche(kind, fn, drin);
    });
  }

  function sammleNamen(k, ohneAggregate) {
    var namen = [];
    besuche(k, function (x, imAggregat) {
      if (x.typ === 'name' && !(ohneAggregate && imAggregat)) namen.push(x);
    });
    return namen;
  }

  function sammleAggregate(k) {
    var aggregate = [];
    besuche(k, function (x, imAggregat) {
      if (x.typ === 'aggregat' && !imAggregat) aggregate.push(x);
    });
    return aggregate;
  }

  function enthaeltAggregat(k) {
    return sammleAggregate(k).length > 0;
  }

  /** Teilbedingungen einer AND-Kette (auch durch Klammern hindurch). */
  function konjunkte(k) {
    if (!k) return [];
    if (k.typ === 'logisch' && k.operator === 'AND') return konjunkte(k.links).concat(konjunkte(k.rechts));
    return [k];
  }

  /** SQL-Text eines Ausdrucks für Meldungen und Vergleiche (Schlüsselwörter groß, Namen wie geschrieben). */
  function formatiere(k) {
    if (!k) return '';
    var s;
    switch (k.typ) {
      case 'stern':
        s = (k.tabelle ? k.tabelle + '.' : '') + '*';
        break;
      case 'name':
        s = (k.tabelle ? k.tabelle + '.' : '') + k.spalte;
        break;
      case 'zahl':
        s = k.roh;
        break;
      case 'text':
        s = "'" + k.wert.replace(/'/g, "''") + "'";
        break;
      case 'null':
        s = 'NULL';
        break;
      case 'aggregat':
        s = k.name + '(' + (k.distinct ? 'DISTINCT ' : '') + [k.argument].concat(k.weitere || []).map(formatiere).join(', ') + ')';
        break;
      case 'funktion':
        s = k.name + '(' + k.argumente.map(formatiere).join(', ') + ')';
        break;
      case 'rechnung':
      case 'vergleich':
      case 'logisch':
        s = formatiere(k.links) + ' ' + k.operator + ' ' + formatiere(k.rechts);
        break;
      case 'vorzeichen':
        s = k.operator + formatiere(k.ausdruck);
        break;
      case 'nicht':
        s = 'NOT ' + formatiere(k.ausdruck);
        break;
      case 'istNull':
        s = formatiere(k.ausdruck) + ' IS ' + (k.nicht ? 'NOT ' : '') + 'NULL';
        break;
      case 'in':
        s = formatiere(k.ausdruck) + (k.nicht ? ' NOT' : '') + ' IN (' + (k.liste ? k.liste.map(formatiere).join(', ') : '…') + ')';
        break;
      case 'between':
        s = formatiere(k.ausdruck) + (k.nicht ? ' NOT' : '') + ' BETWEEN ' + formatiere(k.von) + ' AND ' + formatiere(k.bis);
        break;
      case 'like':
        s = formatiere(k.ausdruck) + (k.nicht ? ' NOT' : '') + ' LIKE ' + formatiere(k.muster);
        break;
      case 'unterabfrage':
        return '(…)';
      default:
        s = '…';
    }
    return k.klammern ? '(' + s + ')' : s;
  }

  // ------------------------------------------------------------------------------------------------------------
  // Diagnosen

  function diagnose(code, art, text, pos) {
    return { code: code, falle: FALLE[code] || null, art: art, text: text, zeile: pos.zeile, spalte: pos.spalte };
  }

  function baueSchema(schema) {
    if (!Array.isArray(schema)) return null;
    var tabellen = {};
    schema.forEach(function (t) {
      var spalten = {};
      (t.spalten || []).forEach(function (s) {
        spalten[klein(s.name)] = s.name;
      });
      tabellen[klein(t.tabelle)] = { name: t.tabelle, spalten: spalten };
    });
    return tabellen;
  }

  /** Haupt-SELECTs, auf die die Fallen-Regeln angewandt werden (Teile einer UNION, Haupt-Abfrage eines WITH). */
  function hauptSelects(ast) {
    if (!ast) return [];
    if (ast.typ === 'select') return [ast];
    if (ast.typ === 'union') return ast.teile.slice();
    if (ast.typ === 'unterabfrage' && ast.art === 'with') return hauptSelects(ast.abfrage);
    return [];
  }

  // --- Fremdkörper (Abimodus)
  function pruefeFremdkoerper(ast, abimodus, ergebnis) {
    if (abimodus === 'aus') return;
    var art = abimodus === 'streng' ? 'fehler' : 'hinweis';
    (function laufe(k, inUnterabfrage) {
      if (Array.isArray(k)) {
        k.forEach(function (x) {
          laufe(x, inUnterabfrage);
        });
        return;
      }
      if (!k || typeof k !== 'object' || !k.typ) return;
      var drin = inUnterabfrage;
      if (k.typ === 'join') {
        ergebnis.push(diagnose('JOIN_ON', art, 'JOIN … ON kommt im Abitur nicht vor. Schreib den Verbund mit FROM … WHERE.', k.schluesselPos || k.start));
      } else if (k.typ === 'unterabfrage') {
        if (!inUnterabfrage) ergebnis.push(diagnose('UNTERABFRAGE', art, 'Verschachtelte Abfragen kommen im Abitur nicht vor.', k.start));
        drin = true;
      } else if (k.typ === 'union') {
        ergebnis.push(diagnose('UNION', art, 'UNION, INTERSECT und EXCEPT kommen im Abitur nicht vor.', (k.operatorPositionen && k.operatorPositionen[0]) || k.start));
      } else if (k.typ === 'nichtSelect') {
        ergebnis.push(
          diagnose('NICHT_SELECT', 'fehler', k.anweisung + ' ist keine Abfrage. Hier sind nur Abfragen mit SELECT erlaubt – Daten werden nicht verändert.', k.start)
        );
      } else if (k.typ === 'vergleich' && k.operator === '<>') {
        ergebnis.push(diagnose('UNGLEICH_ALT', art, 'Im Abitur schreibst du „ungleich“ als `!=`.', k.operatorPos || k.start));
      }
      for (var feld in k) {
        if (feld === 'start' || feld === 'ende') continue;
        var wert = k[feld];
        if (wert && typeof wert === 'object') laufe(wert, drin);
      }
    })(ast, false);
  }

  // --- Fallen-Regeln je SELECT
  function pruefeSelect(sel, schema, ergebnis) {
    var bindungen = [];
    var verbundBedingungen = [];
    var kanten = [];

    function sammleQuelle(q) {
      if (q.typ === 'tabelle') {
        var eintrag = schema ? schema[klein(q.name)] : null;
        bindungen.push({ name: q.alias || q.name, tabelle: q.name, knoten: q, spalten: eintrag ? eintrag.spalten : null });
      } else if (q.typ === 'unterabfrage') {
        bindungen.push({ name: q.alias || '(Unterabfrage)', tabelle: null, knoten: q, spalten: null });
      } else if (q.typ === 'join') {
        sammleQuelle(q.links);
        var linkerLetzter = bindungen.length - 1;
        sammleQuelle(q.rechts);
        if (q.on) verbundBedingungen = verbundBedingungen.concat(konjunkte(q.on));
        if (q.using || q.natural) kanten.push([linkerLetzter, bindungen.length - 1]);
      }
    }
    sel.from.forEach(sammleQuelle);

    var aliase = {};
    sel.spalten.forEach(function (sp, i) {
      if (sp.alias != null && aliase[klein(sp.alias)] === undefined) aliase[klein(sp.alias)] = i;
    });

    function aufloesen(n) {
      var spalte = klein(n.spalte);
      if (n.tabelle) {
        for (var i = 0; i < bindungen.length; i++) {
          if (klein(bindungen[i].name) === klein(n.tabelle)) return { bindung: bindungen[i] };
        }
        return {};
      }
      if (bindungen.length === 1) return { bindung: bindungen[0] };
      if (!schema) return {};
      var treffer = bindungen.filter(function (b) {
        return b.spalten && Object.prototype.hasOwnProperty.call(b.spalten, spalte);
      });
      var unklar = bindungen.filter(function (b) {
        return !b.spalten;
      });
      if (treffer.length >= 2) return { mehrdeutig: treffer };
      if (treffer.length === 1 && unklar.length === 0) return { bindung: treffer[0] };
      return {};
    }

    function istSpalteIrgendwo(spalte) {
      return !!schema && bindungen.some(function (b) {
        return b.spalten && Object.prototype.hasOwnProperty.call(b.spalten, klein(spalte));
      });
    }

    /** Index der SELECT-Spalte, wenn der Name ein Spaltenalias ist (und keine echte Spalte), sonst -1. */
    function aliasIndex(n) {
      if (n.typ !== 'name' || n.tabelle) return -1;
      var i = aliase[klein(n.spalte)];
      if (i === undefined) return -1;
      var a = sel.spalten[i].ausdruck;
      if (a.typ === 'name' && klein(a.spalte) === klein(n.spalte)) return -1;
      if (istSpalteIrgendwo(n.spalte)) return -1;
      return i;
    }

    function gleicheSpalte(a, b) {
      if (klein(a.spalte) !== klein(b.spalte)) return false;
      var ra = aufloesen(a);
      var rb = aufloesen(b);
      if (ra.bindung && rb.bindung) return ra.bindung === rb.bindung;
      return true;
    }

    // MEHRDEUTIG (P7)
    if (schema) {
      var gemeldet = {};
      var pruefeMehrdeutig = function (ausdruck, aliasErlaubt) {
        sammleNamen(ausdruck, false).forEach(function (n) {
          if (n.tabelle) return;
          if (aliasErlaubt && aliase[klein(n.spalte)] !== undefined) return;
          var r = aufloesen(n);
          if (!r.mehrdeutig || gemeldet[klein(n.spalte)]) return;
          gemeldet[klein(n.spalte)] = true;
          var namen = r.mehrdeutig.map(function (b) {
            return b.name;
          });
          ergebnis.push(
            diagnose(
              'MEHRDEUTIG',
              'fehler',
              'Die Spalte ' + n.spalte + ' gibt es in mehreren Tabellen (' + namen.join(', ') + '). Schreib das Tabellenpräfix davor, z. B. `' +
                namen[0] + '.' + n.spalte + '` (P7).',
              n.start
            )
          );
        });
      };
      sel.spalten.forEach(function (sp) {
        pruefeMehrdeutig(sp.ausdruck, false);
      });
      pruefeMehrdeutig(sel.where, false);
      verbundBedingungen.forEach(function (b) {
        pruefeMehrdeutig(b, false);
      });
      sel.groupBy.forEach(function (g) {
        pruefeMehrdeutig(g, true);
      });
      pruefeMehrdeutig(sel.having, true);
      sel.orderBy.forEach(function (o) {
        pruefeMehrdeutig(o.ausdruck, true);
      });
    }

    // KEIN_VERBUND (P2): Graph der Verbundbedingungen über die FROM-Tabellen
    if (bindungen.length >= 2) {
      var eltern = bindungen.map(function (_, i) {
        return i;
      });
      var wurzelVon = function (i) {
        while (eltern[i] !== i) i = eltern[i] = eltern[eltern[i]];
        return i;
      };
      var verbinde = function (a, b) {
        eltern[wurzelVon(a)] = wurzelVon(b);
      };
      var unsicher = false;
      konjunkte(sel.where).concat(verbundBedingungen).forEach(function (b) {
        if (b.typ !== 'vergleich' && b.typ !== 'between') return;
        var namen = sammleNamen(b, false);
        if (namen.length < 2) return;
        var beteiligte = [];
        namen.forEach(function (n) {
          var r = aufloesen(n);
          if (!r.bindung) unsicher = true;
          else if (beteiligte.indexOf(r.bindung) < 0) beteiligte.push(r.bindung);
        });
        for (var i = 1; i < beteiligte.length; i++) verbinde(bindungen.indexOf(beteiligte[0]), bindungen.indexOf(beteiligte[i]));
      });
      kanten.forEach(function (k) {
        if (k[0] >= 0) verbinde(k[0], k[1]);
      });
      var gruppen = {};
      bindungen.forEach(function (_, i) {
        var w = wurzelVon(i);
        (gruppen[w] = gruppen[w] || []).push(i);
      });
      var liste = Object.keys(gruppen).map(function (w) {
        return gruppen[w];
      });
      if (liste.length > 1 && !unsicher) {
        liste.sort(function (a, b) {
          return b.length - a.length || a[0] - b[0];
        });
        liste
          .slice(1)
          .sort(function (a, b) {
            return a[0] - b[0];
          })
          .forEach(function (gruppe) {
            var namen = gruppe.map(function (i) {
              return bindungen[i].name;
            });
            var text =
              namen.length === 1
                ? namen[0] + ' ist mit keiner anderen Tabelle verbunden.'
                : namen.slice(0, -1).join(', ') + ' und ' + namen[namen.length - 1] + ' sind mit den übrigen Tabellen nicht verbunden.';
            text += ' Ohne Verbundbedingung im WHERE entsteht ein Kreuzprodukt (P2).';
            ergebnis.push(diagnose('KEIN_VERBUND', 'fehler', text, bindungen[gruppe[0]].knoten.start));
          });
      }
    }

    // GB_REGEL (P3)
    var mitAggregat = sel.spalten.some(function (sp) {
      return enthaeltAggregat(sp.ausdruck);
    });
    var gruppiert = sel.groupBy.length > 0 || mitAggregat || (sel.having && enthaeltAggregat(sel.having));
    if (gruppiert) {
      var gruppenNamen = [];
      var gruppenAusdruecke = {};
      var gruppierteSpalten = {};
      sel.groupBy.forEach(function (g) {
        var i = aliasIndex(g);
        if (i >= 0) gruppierteSpalten[i] = true;
        else if (g.typ === 'name') gruppenNamen.push(g);
        else gruppenAusdruecke[klein(formatiere(Object.assign({}, g, { klammern: false })))] = true;
      });
      sel.spalten.forEach(function (sp, i) {
        if (gruppierteSpalten[i]) return;
        var a = sp.ausdruck;
        if (a.typ === 'stern') {
          ergebnis.push(
            diagnose('GB_REGEL', 'fehler', '`' + formatiere(a) + '` geht nicht zusammen mit GROUP BY oder Aggregatfunktionen – zähl die Spalten einzeln auf (P3).', a.start)
          );
          return;
        }
        if (gruppenAusdruecke[klein(formatiere(Object.assign({}, a, { klammern: false })))]) return;
        sammleNamen(a, true).forEach(function (n) {
          var passt = gruppenNamen.some(function (g) {
            return gleicheSpalte(g, n);
          });
          if (!passt) {
            ergebnis.push(diagnose('GB_REGEL', 'fehler', '`' + formatiere(n) + '` steht im SELECT, ist aber weder aggregiert noch in GROUP BY (P3).', n.start));
          }
        });
      });
    }

    // WHERE_MIT_AGG (P1)
    if (sel.where) {
      sammleAggregate(sel.where).forEach(function (g) {
        ergebnis.push(
          diagnose('WHERE_MIT_AGG', 'fehler', '`' + formatiere(g) + '` im WHERE geht nicht: WHERE filtert vor dem Gruppieren. Nimm HAVING (P1).', g.start)
        );
      });
      sammleNamen(sel.where, false).forEach(function (n) {
        var i = aliasIndex(n);
        if (i >= 0 && enthaeltAggregat(sel.spalten[i].ausdruck)) {
          ergebnis.push(
            diagnose(
              'WHERE_MIT_AGG',
              'fehler',
              '`' + n.spalte + '` steht für eine Aggregatfunktion – die geht im WHERE nicht: WHERE filtert vor dem Gruppieren. Nimm HAVING (P1).',
              n.start
            )
          );
        }
      });
    }

    // ALIAS_IN_HAVING (P3), HAVING_OHNE_AGG (P1) – je Teilbedingung
    konjunkte(sel.having).forEach(function (b) {
      var aliasNamen = sammleNamen(b, false).filter(function (n) {
        return aliasIndex(n) >= 0;
      });
      aliasNamen.forEach(function (n) {
        ergebnis.push(
          diagnose(
            'ALIAS_IN_HAVING',
            'fehler',
            '`' + n.spalte + '` ist ein Spaltenalias. Im Abitur steht im HAVING kein Alias – schreib den Ausdruck aus dem SELECT noch einmal aus (P3).',
            n.start
          )
        );
      });
      var hatAggregat =
        enthaeltAggregat(b) ||
        aliasNamen.some(function (n) {
          return enthaeltAggregat(sel.spalten[aliasIndex(n)].ausdruck);
        });
      if (!hatAggregat) {
        ergebnis.push(
          diagnose('HAVING_OHNE_AGG', 'fehler', '`HAVING ' + formatiere(b) + '` prüft einzelne Zeilen – das gehört ins WHERE (P1).', b.start)
        );
      }
    });

    // NULL_VERGLEICH (P5) und AND_OR_MISCH (P6) in allen Ausdrücken
    var ausdruecke = sel.spalten
      .map(function (sp) {
        return sp.ausdruck;
      })
      .concat([sel.where, sel.having], verbundBedingungen, sel.orderBy.map(function (o) {
        return o.ausdruck;
      }));
    ausdruecke.forEach(function (a) {
      besuche(a, function (k) {
        if (k.typ === 'vergleich' && (k.operator === '=' || k.operator === '==' || k.operator === '!=' || k.operator === '<>') && (k.links.typ === 'null' || k.rechts.typ === 'null')) {
          var gleich = k.operator === '=' || k.operator === '==';
          ergebnis.push(
            diagnose(
              'NULL_VERGLEICH',
              'fehler',
              '`' + formatiere(Object.assign({}, k, { klammern: false })) + '` ist nie wahr: Mit NULL vergleichst du nur über `' + (gleich ? 'IS NULL' : 'IS NOT NULL') + '` (P5).',
              k.start
            )
          );
        }
      });
      pruefeAndOr(a, ergebnis);
    });
  }

  function oderGlieder(k) {
    if (k.typ === 'logisch' && k.operator === 'OR' && !k.klammern) return oderGlieder(k.links).concat(oderGlieder(k.rechts));
    return [k];
  }

  function pruefeAndOr(k, ergebnis) {
    if (!k) return;
    if (k.typ === 'logisch' && k.operator === 'OR') {
      var glieder = oderGlieder(Object.assign({}, k, { klammern: false }));
      var gemischt = glieder.some(function (g) {
        return g.typ === 'logisch' && g.operator === 'AND' && !g.klammern;
      });
      if (gemischt) {
        ergebnis.push(diagnose('AND_OR_MISCH', 'hinweis', 'AND bindet stärker als OR. Setz Klammern, damit klar ist, was zusammengehört (P6).', k.start));
      }
      glieder.forEach(function (g) {
        // geklammerte OR-Ketten einzeln prüfen, sonst in die Teilausdrücke absteigen
        if (g.typ === 'logisch' && g.operator === 'OR') pruefeAndOr(g, ergebnis);
        else {
          kinder(g).forEach(function (kind) {
            pruefeAndOr(kind, ergebnis);
          });
        }
      });
      return;
    }
    kinder(k).forEach(function (kind) {
      pruefeAndOr(kind, ergebnis);
    });
  }

  /** Hauptfunktion. */
  function pruefeRegeln(ast, optionen) {
    optionen = optionen || {};
    var abimodus = optionen.abimodus === undefined ? 'hinweis' : optionen.abimodus;
    if (!ABIMODI[abimodus]) throw new TypeError('Unbekannter abimodus: ' + abimodus + " (erlaubt: 'streng', 'hinweis', 'aus')");
    if (!ast) return [];
    var schema = baueSchema(optionen.schema);
    var ergebnis = [];
    pruefeFremdkoerper(ast, abimodus, ergebnis);
    hauptSelects(ast).forEach(function (sel) {
      pruefeSelect(sel, schema, ergebnis);
    });
    return ergebnis
      .map(function (d, i) {
        return { d: d, i: i };
      })
      .sort(function (a, b) {
        return a.d.zeile - b.d.zeile || a.d.spalte - b.d.spalte || a.i - b.i;
      })
      .map(function (x) {
        return x.d;
      });
  }

  return { pruefeRegeln: pruefeRegeln, CODES: CODES.slice(), FALLE: FALLE, formatiere: formatiere };
});
