/*
 * Datendetektei – deutsche Fehlertexte für Meldungen von SQLite (better-sqlite3 im Server, sql.js im Browser)
 * und für die internen Codes der Sandbox (Spec §7.3, §7.4; DESIGN §9).
 * Isomorph: CommonJS im Server, im Browser als self.DD_SQL_FEHLERTEXTE. Keine Abhängigkeiten.
 *
 * übersetze(meldung) → text            (Alias: uebersetze)
 * ordneZu(meldung)   → { code, text }
 * meldung: Text der Rohmeldung, ein Error-Objekt (message) oder { code, … } mit einem internen Code:
 *   ZEITLIMIT { ms }, ZEILENLIMIT { max }, VERBOTEN { wort }, ZU_LANG { max }, UEBERLASTET, NICHT_LESEND,
 *   MEHRERE_ANWEISUNGEN, LEER, ERGEBNIS_ZU_GROSS, ABSTURZ, BEENDET.
 * Texte: geduzt, Ursache und Weg, ohne Lösung; aus der Rohmeldung wird höchstens der betroffene Name übernommen.
 */
(function (wurzel, fabrik) {
  if (typeof module === 'object' && module.exports) module.exports = fabrik();
  else wurzel.DD_SQL_FEHLERTEXTE = fabrik();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var ALLGEMEIN = 'Die Datenbank meldet einen Fehler in deiner Abfrage. Prüf Schreibweise, Kommas und Klammern.';

  /** Name aus der Rohmeldung: ohne Steuerzeichen, höchstens 40 Zeichen. */
  function name(s) {
    s = String(s == null ? '' : s).replace(/[\u0000-\u001F\u007F]/g, '').trim();
    return s.length > 40 ? s.slice(0, 40) + '…' : s;
  }

  function zahl(n) {
    // deutsches Format: 1,5 · 5 000
    var teile = String(n).split('.');
    var ganz = teile[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return teile.length > 1 ? ganz + ',' + teile[1] : ganz;
  }

  // Interne Codes (Sandbox, Konsole)
  var INTERN = {
    ZEITLIMIT: function (m) {
      var sek = (m && m.ms ? m.ms : 1500) / 1000;
      return 'Deine Abfrage hat zu lange gerechnet (mehr als ' + zahl(sek) + ' s) und wurde abgebrochen. Fehlt eine Verbundbedingung (P2)?';
    },
    ZEILENLIMIT: function (m) {
      var max = m && m.max ? m.max : 5000;
      return 'Deine Abfrage liefert mehr als ' + zahl(max) + ' Zeilen – angezeigt werden nur die ersten. Fehlt eine Verbundbedingung (P2)?';
    },
    VERBOTEN: function (m) {
      var wort = m && m.wort ? name(m.wort) : 'Diese Anweisung';
      return wort + ' ist hier nicht erlaubt. Erlaubt sind nur Abfragen mit SELECT.';
    },
    ZU_LANG: function (m) {
      var max = m && m.max ? m.max : 4000;
      return 'Die Abfrage ist zu lang (höchstens ' + zahl(max) + ' Zeichen).';
    },
    UEBERLASTET: function () {
      return 'Gerade prüfen sehr viele gleichzeitig. Versuch es in ein paar Sekunden noch einmal.';
    },
    NICHT_LESEND: function () {
      return 'Die Datenbank kann hier nur gelesen werden. Erlaubt sind nur Abfragen mit SELECT.';
    },
    MEHRERE_ANWEISUNGEN: function () {
      return 'Erlaubt ist nur eine Anweisung – lass alles nach dem ersten ; weg.';
    },
    LEER: function () {
      return 'Die Abfrage ist leer. Schreib eine Abfrage, die mit SELECT beginnt.';
    },
    ERGEBNIS_ZU_GROSS: function () {
      return 'Das Ergebnis deiner Abfrage ist zu groß (riesige Werte oder sehr lange Texte) und wurde abgebrochen.';
    },
    ABSTURZ: function () {
      return 'Beim Prüfen ist technisch etwas schiefgegangen – an deiner Abfrage liegt es nicht unbedingt. Versuch es gleich noch einmal.';
    },
    BEENDET: function () {
      return 'Die Prüfung ist gerade nicht verfügbar. Versuch es in ein paar Minuten noch einmal.';
    }
  };

  // SQLite-Meldungen: [Muster, Code, Text(treffer)]
  var MUSTER = [
    [/^no such column: (.+)$/, 'KEINE_SPALTE', function (t) {
      var n = name(t[1]);
      if (n.indexOf('.') >= 0) {
        var tabelle = n.slice(0, n.indexOf('.'));
        return 'Die Spalte ' + n + ' gibt es nicht – Tippfehler, oder steht ' + tabelle + ' nicht im FROM?';
      }
      return 'Die Spalte ' + n + ' gibt es nicht – Tippfehler oder fehlendes Tabellenpräfix? Ist ' + n +
        " ein Wert, gehört er in Hochkommata: '" + n + "' (P5).";
    }],
    [/^no such table: (.+)$/, 'KEINE_TABELLE', function (t) {
      return 'Die Tabelle ' + name(t[1]) + ' gibt es nicht. Prüf die Schreibweise im Schema – Tabellen heißen im Singular.';
    }],
    [/^ambiguous column name: (.+)$/, 'MEHRDEUTIG', function (t) {
      var n = name(t[1]);
      return 'Die Spalte ' + n + ' gibt es in mehreren Tabellen. Schreib das Tabellenpräfix davor, z. B. `Tabelle.' + n + '` (P7).';
    }],
    [/^near "([\s\S]*)": syntax error$/, 'SYNTAX', function (t) {
      return 'Bei „' + name(t[1]) + '“ stimmt die Schreibweise nicht. Fehlt ein Komma oder ein Schlüsselwort, oder ist eins falsch geschrieben?';
    }],
    [/^misuse of aggregate(?: function)?:? ?(\w+)\(\)$/, 'AGGREGAT_FALSCH', function (t) {
      return name(t[1]).toUpperCase() + '() steht an einer Stelle, an der keine Aggregatfunktion erlaubt ist. WHERE filtert einzelne Zeilen – Bedingungen mit Aggregaten gehören ins HAVING (P1).';
    }],
    [/^wrong number of arguments to function (\w+)\(\)$/, 'ARGUMENTE', function (t) {
      return name(t[1]).toUpperCase() + '() hat die falsche Anzahl an Argumenten. Aggregatfunktionen bekommen genau eine Spalte oder einen Ausdruck (COUNT auch *).';
    }],
    [/^incomplete input$/, 'UNVOLLSTAENDIG', function () {
      return 'Die Abfrage hört zu früh auf. Fehlt am Ende noch etwas, z. B. eine Bedingung oder eine schließende Klammer?';
    }],
    [/^unrecognized token: "([\s\S]*)"$/, null, function (t) {
      var zeichen = t[1];
      if (zeichen.charAt(0) === "'") {
        return { code: 'TEXT_OFFEN', text: "Ein Text wird nicht geschlossen. Setz am Ende des Textes das Hochkomma '." };
      }
      if (zeichen.charAt(0) === '"') {
        return { code: 'UNBEKANNTES_ZEICHEN', text: "Text gehört in einfache Hochkommata '…' – und jedes \" braucht ein schließendes Gegenstück." };
      }
      return { code: 'UNBEKANNTES_ZEICHEN', text: 'Das Zeichen ' + name(zeichen) + ' kennt SQL nicht. Meinst du vielleicht != oder ein Hochkomma \'?' };
    }],
    [/attempt to write a readonly database/, 'SCHREIBGESCHUETZT', function () {
      return INTERN.NICHT_LESEND();
    }],
    [/^no such function: (.+)$/, 'KEINE_FUNKTION', function (t) {
      return 'Die Funktion ' + name(t[1]) + ' gibt es nicht. Im Abitur nutzt du die Aggregatfunktionen AVG, COUNT, MAX, MIN und SUM.';
    }],
    [/^\d+\w* (ORDER|GROUP) BY term out of range/, 'NUMMER_ZU_GROSS', function (t) {
      return 'Die Nummer im ' + t[1] + ' BY ist größer als die Zahl der Spalten im SELECT.';
    }],
    [/contains more than one statement/, 'MEHRERE_ANWEISUNGEN', function () {
      return INTERN.MEHRERE_ANWEISUNGEN();
    }],
    [/contains no statements/, 'LEER', function () {
      return INTERN.LEER();
    }],
    [/do not have the same number of result columns/, 'UNION_SPALTEN', function () {
      return 'Die Teile vor und nach UNION liefern unterschiedlich viele Spalten.';
    }],
    [/aggregate functions are not allowed in the GROUP BY clause/, 'AGGREGAT_IM_GROUP_BY', function () {
      return 'Im GROUP BY stehen Spalten, nach denen gruppiert wird – keine Aggregatfunktionen.';
    }],
    [/^sub-select returns \d+ columns - expected 1$/, 'UNTERABFRAGE_SPALTEN', function () {
      return 'Die Unterabfrage liefert mehrere Spalten, hier ist genau eine erwartet.';
    }],
    [/HAVING clause on a non-aggregate query|GROUP BY clause is required before HAVING/, 'HAVING_OHNE_GROUP_BY', function () {
      return 'HAVING steht nur nach GROUP BY. Eine Bedingung für einzelne Zeilen gehört ins WHERE (P1).';
    }],
    [/does not return data/, 'NICHT_SELECT', function () {
      return 'Das ist keine Abfrage – es kommen keine Daten zurück. Schreib eine Abfrage mit SELECT.';
    }],
    [/parameter/i, 'PARAMETER', function () {
      return 'Zeichen wie ?, :name oder @name sind hier nicht erlaubt. Schreib Werte direkt in die Abfrage, Text in Hochkommata.';
    }],
    [/^datatype mismatch$/, 'DATENTYP', function () {
      return 'Hier passt der Datentyp nicht – nach LIMIT steht zum Beispiel eine ganze Zahl.';
    }],
    [/^row value misused$/, 'ZEILENWERT', function () {
      return 'Mehrere Werte in Klammern gehen nur hinter IN (…).';
    }],
    [/^interrupted$/, 'ZEITLIMIT', function () {
      return INTERN.ZEITLIMIT();
    }]
  ];

  function ordneZu(meldung) {
    if (meldung && typeof meldung === 'object' && typeof meldung.code === 'string' && INTERN[meldung.code]) {
      return { code: meldung.code, text: INTERN[meldung.code](meldung) };
    }
    if (typeof meldung === 'string' && INTERN[meldung]) {
      return { code: meldung, text: INTERN[meldung]({}) };
    }
    var text = '';
    if (typeof meldung === 'string') text = meldung;
    else if (meldung && typeof meldung === 'object' && typeof meldung.message === 'string') text = meldung.message;
    text = text.trim().replace(/^(?:Error|SqliteError|RangeError|TypeError):\s*/, '');
    for (var i = 0; i < MUSTER.length; i++) {
      var t = MUSTER[i][0].exec(text);
      if (!t) continue;
      var ergebnis = MUSTER[i][2](t);
      if (typeof ergebnis === 'object') return ergebnis;
      return { code: MUSTER[i][1], text: ergebnis };
    }
    return { code: 'ALLGEMEIN', text: ALLGEMEIN };
  }

  function übersetze(meldung) {
    return ordneZu(meldung).text;
  }

  return {
    übersetze: übersetze,
    uebersetze: übersetze,
    ordneZu: ordneZu,
    INTERNE_CODES: Object.keys(INTERN)
  };
});
