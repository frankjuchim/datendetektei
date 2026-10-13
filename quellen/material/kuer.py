#!/usr/bin/env python3
"""Erstellungshilfe: Material der Kür (materialien/Kuer/) im Akten-Design – KÜR, NICHT IM ABITUR.

Erzeugt (Spec §3.3 Kür, §7.10, §11.4; DS_PLANUNG K1/K2; STORY §5.14, §5.15, §9):
  Kuer/K1_Eigene_Datenbank/DD_K1_Eigene_Datenbank.docx (+ _LSG) – Arbeitsblatt mit Projektkarte: CREATE TABLE,
      PRIMARY KEY, FOREIGN KEY, INSERT, referentielle Integrität, Ausblick JOIN … ON / LEFT JOIN (passend zu K1-E1-01…06,
      aber mit eigenem Kontext „Asservatenkammer/Zeugen“ – die Lab-Aufgaben nutzen Ermittler/Fall/Person)
  Kuer/K2_Escape_Room/DD_K2_Escape_Room_Stationen.docx – Stationsumschläge S1–S6 + S5g + Bonus (Schülerfassung,
      ohne Codes und Lösungen)
  Kuer/K2_Escape_Room/DD_K2_Escape_Room_Lehrkraft.docx – Ablauf, Vorbereitung, Live-Modus, Codes, Lösungen,
      Tipp-Umschläge, Live-Pool
Die Stationen kommen aus seed/live/escape.json, die Codes rechnet der Server-Code (src/content/live.js) beim Lauf aus.
SQL der Kür wird mit `kuer` geprüft (Ordner Kuer/); CREATE/INSERT laufen je Datei in einer eigenen leeren DB („leer“).

Die erzeugten docx sind danach maßgeblich (Spec §12); dieses Skript ist nur die Erstellungshilfe.
Aufruf: python3 quellen/material/kuer.py
"""
import json
import sqlite3
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "werkzeuge"))

from docx.shared import Pt  # noqa: E402

import akten_design as A  # noqa: E402
from akten_design import (  # noqa: E402
    AktenDokument, Auftrag, ER, Ergebnis, Liste, Loesung, Notiz, Schema, SQL, Tabelle, abfrage_ergebnis)

MAT = REPO / "materialien"
K1 = MAT / "Kuer" / "K1_Eigene_Datenbank"
K2 = MAT / "Kuer" / "K2_Escape_Room"
ESCAPE = json.loads((REPO / "seed" / "live" / "escape.json").read_text(encoding="utf-8"))
POOL = json.loads((REPO / "seed" / "live" / "pool.json").read_text(encoding="utf-8"))
STATION = {s["id"]: s for s in ESCAPE["stationen"]}


def ergebnis(sql, db, max_zeilen=None):
    kopf, zeilen = abfrage_ergebnis(sql, db)
    if max_zeilen and len(zeilen) > max_zeilen:
        return Ergebnis(kopf, zeilen[:max_zeilen], abgeschnitten=True)
    return Ergebnis(kopf, zeilen)


def leer_ergebnis(skript, abfrage):
    """Ergebnis einer Abfrage auf einer eigenen In-Memory-DB nach dem Skript (für Kür-Beispiele)."""
    c = sqlite3.connect(":memory:")
    c.execute("PRAGMA foreign_keys = ON")
    c.executescript(skript)
    cur = c.execute(abfrage)
    kopf = [x[0] for x in cur.description]
    return Ergebnis(kopf, [[A.zelle_text(v) for v in z] for z in cur.fetchall()])


# ================================================================== K1 – Eigene Datenbank bauen
REGAL_SKRIPT = """CREATE TABLE Regal (
  RegalNr INTEGER PRIMARY KEY,
  Raum    TEXT NOT NULL
);
CREATE TABLE Kiste (
  KisteNr INTEGER PRIMARY KEY,
  Inhalt  TEXT,
  RegalNr INTEGER,
  FOREIGN KEY (RegalNr) REFERENCES Regal(RegalNr)
);"""
REGAL_DATEN = """INSERT INTO Regal VALUES (1, 'Keller');
INSERT INTO Regal VALUES (2, 'Dachboden');
INSERT INTO Regal VALUES (3, 'Archivraum');
INSERT INTO Kiste VALUES (100, 'Fundbuch 2025', 1);
INSERT INTO Kiste VALUES (101, 'Kassenbons Stadtfest', 1);
INSERT INTO Kiste VALUES (102, 'Vereinsakten TuS', 2);"""
REGAL_ABI = "SELECT k.KisteNr, k.Inhalt, r.Raum\nFROM Kiste k, Regal r\nWHERE k.RegalNr = r.RegalNr\nORDER BY k.KisteNr;"
REGAL_JOIN = "SELECT k.KisteNr, k.Inhalt, r.Raum\nFROM Kiste k JOIN Regal r ON k.RegalNr = r.RegalNr\nORDER BY k.KisteNr;"
REGAL_LEFT = ("SELECT r.RegalNr, r.Raum\nFROM Regal r LEFT JOIN Kiste k ON r.RegalNr = k.RegalNr\n"
              "WHERE k.KisteNr IS NULL;")

ZEUGE_SQL = "CREATE TABLE Zeuge (\n  ZeugeNr INTEGER PRIMARY KEY,\n  Name    TEXT NOT NULL,\n  Telefon TEXT\n);"
ZEUGE_DATEN = [(1, "Mika R.", "0000-4711"), (2, "Lena K.", "0000-0815"), (3, "Noa T.", None)]
ZEUGE_INSERT = "\n".join(f"INSERT INTO Zeuge VALUES ({n}, '{name}', {repr(t) if t else 'NULL'});"
                         for n, name, t in ZEUGE_DATEN).replace('"', "'")
VERNEHMUNG_SQL = ("CREATE TABLE Vernehmung (\n  VernehmungNr INTEGER PRIMARY KEY,\n  ZeugeNr      INTEGER,\n"
                  "  Datum        TEXT,\n  FOREIGN KEY (ZeugeNr) REFERENCES Zeuge(ZeugeNr)\n);")
VERNEHMUNGEN = [  # (Buchstabe, Werte, angenommen?, Begründung)
    ("a", "(1, 1, '2026-10-01')", True, "angenommen – Zeuge 1 gibt es, VernehmungNr 1 ist neu."),
    ("b", "(2, 4, '2026-10-02')", False, "abgewiesen – einen Zeugen 4 gibt es nicht; der Fremdschlüssel würde ins Leere "
                                       "zeigen (referentielle Integrität)."),
    ("c", "(1, 2, '2026-10-03')", False, "abgewiesen – VernehmungNr 1 ist schon vergeben (Primärschlüssel doppelt)."),
    ("d", "(3, NULL, '2026-10-04')", True, "angenommen – ein Fremdschlüssel darf NULL sein (Zeuge noch unbekannt), "
                                          "solange die Spalte nicht NOT NULL ist."),
    ("e", "(4, 3, '2026-10-05')", True, "angenommen – Zeuge 3 gibt es."),
]
VERN_ABI = ("SELECT z.Name, v.Datum\nFROM Vernehmung v, Zeuge z\nWHERE v.ZeugeNr = z.ZeugeNr\nORDER BY v.Datum;")
VERN_JOIN = ("SELECT z.Name, v.Datum\nFROM Vernehmung v JOIN Zeuge z ON v.ZeugeNr = z.ZeugeNr\nORDER BY v.Datum;")
VERN_LEFT = ("SELECT z.ZeugeNr, z.Name\nFROM Zeuge z LEFT JOIN Vernehmung v\n  ON z.ZeugeNr = v.ZeugeNr\n"
             "WHERE v.VernehmungNr IS NULL;")
K1_SKRIPT = (ZEUGE_SQL + "\n" + ZEUGE_INSERT + "\n" + VERNEHMUNG_SQL + "\n" +
             "\n".join(f"INSERT INTO Vernehmung VALUES {w};" for _, w, ok, _ in VERNEHMUNGEN if ok))
ABI_JOIN = ("SELECT b.BeweisNr, b.Bezeichnung, o.Bezeichnung AS Fundort\nFROM Beweisstueck b JOIN Ort o ON b.OrtNr = o.OrtNr\n"
            "WHERE o.Stadtteil = 'Hafenviertel'\nORDER BY b.BeweisNr;")
ABI_IMPLIZIT = ("SELECT b.BeweisNr, b.Bezeichnung, o.Bezeichnung AS Fundort\nFROM Beweisstueck b, Ort o\n"
                "WHERE b.OrtNr = o.OrtNr\n  AND o.Stadtteil = 'Hafenviertel'\nORDER BY b.BeweisNr;")

BAND_SKRIPT = """CREATE TABLE Musiker (
  MusikerNr INTEGER PRIMARY KEY,
  Name      TEXT NOT NULL,
  Instrument TEXT
);
CREATE TABLE Band (
  BandNr INTEGER PRIMARY KEY,
  Name   TEXT NOT NULL,
  Probenraum TEXT
);
CREATE TABLE spieltIn (
  MusikerNr INTEGER,
  BandNr    INTEGER,
  Seit      INTEGER,
  PRIMARY KEY (MusikerNr, BandNr),
  FOREIGN KEY (MusikerNr) REFERENCES Musiker(MusikerNr),
  FOREIGN KEY (BandNr) REFERENCES Band(BandNr)
);
INSERT INTO Musiker VALUES (1, 'Mika R.', 'Gitarre');
INSERT INTO Musiker VALUES (2, 'Lena K.', 'Schlagzeug');
INSERT INTO Musiker VALUES (3, 'Noa T.', 'Bass');
INSERT INTO Band VALUES (1, 'Deichgrafen', 'Musikraum A');
INSERT INTO Band VALUES (2, 'Weserwellen', 'Aula');
INSERT INTO spieltIn VALUES (1, 1, 2025);
INSERT INTO spieltIn VALUES (2, 1, 2025);
INSERT INTO spieltIn VALUES (2, 2, 2026);
INSERT INTO spieltIn VALUES (3, 2, 2026);"""
BAND_ABFRAGEN = [
    "SELECT Name, Instrument\nFROM Musiker\nWHERE Instrument != 'Gitarre'\nORDER BY Name;",
    "SELECT b.Name, s.Seit\nFROM Band b, spieltIn s\nWHERE b.BandNr = s.BandNr\n  AND s.MusikerNr = 2;",
    ("SELECT b.BandNr, b.Name, COUNT(*) AS Mitglieder\nFROM Band b, spieltIn s, Musiker m\n"
     "WHERE b.BandNr = s.BandNr\n  AND s.MusikerNr = m.MusikerNr\nGROUP BY b.BandNr, b.Name\nORDER BY Mitglieder DESC, b.Name;"),
]


def k1(fassung):
    # Ohne kompetenzen=…: Die Kür-Arbeitsblätter stehen nicht in der Kompetenzmatrix (K06/K13/K48 sind Kür; die
    # Transfer-Bezüge K03/K04/K23/K41 werden über die Lab-Aufgaben K1-E1-* geführt).
    d = AktenDokument("kuer", "K", "Eigene Datenbank bauen", fassung=fassung, ermittlung="K1", material="AB K1",
                      datenbank="leer", kuer=True,
                      untertitel="Projektkarte K1 · CREATE TABLE, INSERT, Fremdschlüssel – und ein Ausblick")
    d.kopfband()
    d.fall_einstieg("Juri ist begeistert: „Ich will die Fall-Datenbank selbst bauen, nicht nur benutzen!“ Heute legst du "
                    "Tabellen selbst an, füllst sie und erlebst, wie die Datenbank falsche Verweise abweist. Alles auf "
                    "diesem Blatt ist **Kür – nicht im Abitur**.")
    d.notiz("KÜR – nicht im Abitur",
            "Im Abitur schreibst du **keine** CREATE- oder INSERT-Anweisungen, und den Verbund schreibst du "
            "ausschließlich mit `FROM … WHERE`. Die Schreibweisen mit JOIN auf diesem Blatt sind nur ein Ausblick "
            "(nicht im Abitur).")
    d.beweisstueck(1, "Vom Schema zur Tabelle – die Asservatenkammer",
                   "Die Detektei lagert Beweiskisten in Regalen. Aus jeder Relation wird mit `CREATE TABLE` eine Tabelle, "
                   "aus jedem Attribut eine Spalte mit **Datentyp** (`INTEGER` = ganze Zahl, `TEXT` = Text). "
                   "`PRIMARY KEY` kennzeichnet den Primärschlüssel, `FOREIGN KEY (…) REFERENCES …` einen Fremdschlüssel, "
                   "`NOT NULL` verbietet leere Werte.",
                   Schema("Regal(<u>RegalNr</u>, Raum)"), Schema("Kiste(<u>KisteNr</u>, Inhalt, ↑RegalNr)"),
                   SQL(REGAL_SKRIPT),
                   "Mit `INSERT INTO … VALUES (…)` fügst du Datensätze ein – die Werte in der Reihenfolge der Spalten, "
                   "Texte in Hochkommata:",
                   SQL(REGAL_DATEN))
    d.beweisstueck(2, "Referentielle Integrität – die Datenbank passt auf",
                   "Jeder Fremdschlüsselwert muss auf einen **existierenden** Primärschlüsselwert verweisen (oder NULL "
                   "sein). Diese Kiste soll in Regal 7 – das es nicht gibt:",
                   SQL("INSERT INTO Kiste VALUES (103, 'Stadtplan', 7);", pruefung="fehlerhaft"),
                   "Die Datenbank meldet `FOREIGN KEY constraint failed` und speichert nichts. (In SQLite muss die "
                   "Prüfung mit `PRAGMA foreign_keys = ON` eingeschaltet sein – in der Sandbox ist sie es.)")
    d.beweisstueck(3, "Ausblick: andere Schreibweisen für den Verbund (nicht im Abitur)",
                   "**Abitur-Stil** – so schreibst du den Verbund in jeder Prüfung:",
                   SQL(REGAL_ABI), leer_ergebnis(REGAL_SKRIPT + REGAL_DATEN, REGAL_ABI),
                   "**Kür-Schreibweise mit JOIN … ON** – die Verbundbedingung steht hinter `ON`, das Ergebnis ist gleich:",
                   SQL(REGAL_JOIN),
                   "**LEFT JOIN** behält alle Zeilen der linken Tabelle; fehlt der Partner, stehen rechts NULL-Werte. "
                   "So findest du Regale **ohne** Kiste – das kann der Abitur-Verbund nicht:",
                   SQL(REGAL_LEFT), leer_ergebnis(REGAL_SKRIPT + REGAL_DATEN, REGAL_LEFT))

    vern_tab = Tabelle(["", "Anweisung", "angenommen? Warum?"],
                       [[b, f"INSERT INTO Vernehmung VALUES {w};", ""] for b, w, _, _ in VERNEHMUNGEN],
                       breiten=[0.6, 6.2, 5.4], groesse=8.5)
    d.ermittlungsauftraege([
        Auftrag(1, 1, "PAPIER", "Die Detektei will ihre Zeuginnen und Zeugen speichern. Notiere die "
                "`CREATE TABLE`-Anweisung zu diesem Schema – ZeugeNr ist eine ganze Zahl, Name darf nie leer sein.", inhalt=[Schema("Zeuge(<u>ZeugeNr</u>, Name, Telefon)")], linien=4,
                loesung=Loesung(SQL(ZEUGE_SQL), "NOT NULL bei Name ist der Zusatz aus dem Auftrag; Telefon darf leer "
                                "bleiben.",
                                fehler=[("P9", "PRIMARY KEY fehlt oder steht bei Name – dann wären doppelte Nummern "
                                               "erlaubt."), ("P5", "Texte als Datentyp vergessen; Komma nach der letzten "
                                                                  "Spalte (Syntaxfehler).")])),
        Auftrag(2, 1, "PAPIER", "Trage die drei Zeugen mit `INSERT INTO` ein. Noa T. hat kein Telefon.",
                inhalt=[Tabelle(["ZeugeNr", "Name", "Telefon"], [[str(n), name, t or "NULL"] for n, name, t in ZEUGE_DATEN],
                                breiten=[2.0, 3.0, 3.0], groesse=8.5)], linien=4,
                loesung=Loesung(SQL(ZEUGE_INSERT), fehler=[("P5", "Name ohne Hochkommata oder `'NULL'` als Text statt "
                                                                  "NULL.")])),
        Auftrag(3, 2, "PAPIER", "Die Tabelle Vernehmung verweist auf Zeuge. Entscheide für jede Anweisung "
                "(nacheinander ausgeführt), ob die Datenbank sie annimmt oder abweist, und begründe.", inhalt=[SQL(VERNEHMUNG_SQL, pruefung="ja"), vern_tab],
                loesung=Loesung(
                    *[f"**{b})** {grund}" for b, _, _, grund in VERNEHMUNGEN],
                    "Ausgeführt (die abgewiesenen Anweisungen fehlen):",
                    SQL("\n".join(f"INSERT INTO Vernehmung VALUES {w};" for _, w, ok, _ in VERNEHMUNGEN if ok)),
                    "Diese beiden weist die Datenbank ab (Fremdschlüssel ins Leere bzw. doppelter Primärschlüssel):",
                    SQL("INSERT INTO Vernehmung VALUES (2, 4, '2026-10-02');", pruefung="fehlerhaft"),
                    SQL("INSERT INTO Vernehmung VALUES (1, 2, '2026-10-03');", pruefung="fehlerhaft"),
                    fehler=[("P8", "„NULL ist verboten“ – das gilt nur für Primärschlüssel, nicht für Fremdschlüssel "
                                   "ohne NOT NULL.")])),
        Auftrag(4, 2, "PAPIER", "Ausblick (nicht im Abitur): Schreibe diese Abfrage im Abitur-Stil mit `JOIN … ON` um "
                "und gib das Ergebnis nach Auftrag 3 an.",
                inhalt=[SQL(VERN_ABI, db="keine")], linien=4,
                loesung=Loesung(SQL(VERN_JOIN), leer_ergebnis(K1_SKRIPT, VERN_JOIN),
                                "Vernehmung 3 (ZeugeNr NULL) hat keinen Partner und fällt in beiden Schreibweisen heraus.",
                                fehler=[("P2", "Die Verbundbedingung bleibt zusätzlich im WHERE stehen – schadet nicht, "
                                               "ist aber doppelt.")])),
        Auftrag(5, 3, "PAPIER", "Ausblick (nicht im Abitur): Juri will wissen, welche Zeugen **noch nie** vernommen "
                "wurden. Notiere eine Abfrage mit `LEFT JOIN` und erkläre, warum der Verbund im Abitur-Stil diese "
                "Frage nicht beantworten kann.", linien=5,
                loesung=Loesung(SQL(VERN_LEFT), leer_ergebnis(K1_SKRIPT, VERN_LEFT),
                                "Der Verbund mit `FROM … WHERE` liefert nur Paare **mit** Partner; Zeugen ohne "
                                "Vernehmung tauchen gar nicht auf. Der LEFT JOIN behält sie mit NULL im rechten Teil.",
                                fehler=[("P5", "`WHERE v.VernehmungNr = NULL` statt `IS NULL` – liefert nichts.")])),
        Auftrag(6, 3, "LAB", "Teamprojekt: Plant eine eigene kleine Datenbank (Projektkarte auf der nächsten Seite) "
                "und setzt sie in der Sandbox um.",
                loesung=Loesung("Kriterien siehe Projektkarte; Beispiel einer vollständigen Umsetzung unten auf der "
                                "Projektkarte.")),
    ])
    d.abi_ecke("Die folgende Abfrage auf der Fall-Datenbank der Detektei nutzt eine Schreibweise, die im Abitur nicht "
               "vorkommt. **Entwerfen** Sie eine gleichwertige Abfrage im Stil der Ergänzenden Hinweise (Verbund über "
               "FROM und WHERE). [2\u00a0BE]", be=2, operator="entwerfen", afb="II",
               inhalt=[SQL(ABI_JOIN, db="detektei")], linien=6,
               loesung=Loesung(SQL(ABI_IMPLIZIT, db="detektei"), ergebnis(ABI_IMPLIZIT, "detektei"),
                               "1 BE: beide Tabellen in FROM mit Verbundbedingung im WHERE; 1 BE: Stadtteil-Bedingung "
                               "mit AND, Sortierung übernommen.",
                               fehler=[("P2", "Verbundbedingung vergessen – Kreuzprodukt aller Beweisstücke mit allen "
                                              "Orten im Hafenviertel.")]))
    d.spur_im_lab("K1 „Eigene Datenbank bauen“", "K1-E1-01 … K1-E1-06 (Kür, ohne Rangwirkung)",
                  werkzeug="Sandbox-Konsole im Schreibmodus",
                  text="Jede Ausführung startet mit einer frischen Datenbank – kaputtmachen ist ausdrücklich erlaubt. "
                       "Im Lab arbeitest du mit Ermittlern, Fällen und Personen.")
    d.cold_case("Das Regal muss weg", "Was passiert, wenn du Regal 1 löschen willst, in dem noch Kisten stehen "
                "(`DELETE FROM Regal WHERE RegalNr = 1;`)? Probiere es in der Sandbox aus und finde heraus, was "
                "`ON DELETE CASCADE` hinter `REFERENCES Regal(RegalNr)` ändern würde.",
                loesung=Loesung("Die Datenbank weist das Löschen ab (FOREIGN KEY constraint failed), weil Kisten 100 und "
                                "101 sonst ins Leere verweisen. Mit `ON DELETE CASCADE` würden die Kisten automatisch "
                                "mitgelöscht – bequem, aber gefährlich (Beweise weg!)."))

    # ---------------------------------------------------------- Projektkarte
    d.seitenumbruch()
    d.ueberschrift("Projektkarte K1 · Unsere Datenbank", 1)
    d.absatz("Team: _________________________   Thema: _____________________________________________")
    d.absatz("*Ideen:* Schul-AG, Bandprobe, Tierheim, Sportturnier, Schulbibliothek, Fahrradwerkstatt …")
    d.tabelle(["Kernkriterium (wird im Lab geprüft)", "erfüllt"], [
        ["mindestens **3 Tabellen**, jede mit Primärschlüssel", ""],
        ["mindestens **eine n:m-Beziehung**: Beziehungstabelle mit zusammengesetztem Primärschlüssel aus zwei "
         "Fremdschlüsseln", ""],
        ["jede Tabelle mit **mindestens zwei Datensätzen**", ""],
        ["**drei Abfragen im Abitur-Stil** (Verbund mit FROM … WHERE, GROUP-BY-Regel)", ""],
    ], breiten=[14.6, 2.4])
    if fassung == "schueler":
        d.ueberschrift("1 · Schema in Kurzschreibweise (Primärschlüssel unterstrichen, ↑ vor Fremdschlüsseln)", 3)
        d.inhalt(A.Linien(4))
        d.ueberschrift("2 · Das hat die Datenbank abgewiesen – Fehlermeldung und Erklärung", 3)
        d.inhalt(A.Linien(2))
        d.ueberschrift("3 · Drei Abfragen im Abitur-Stil", 3)
        d.inhalt("**Abfrage 1** – eine Tabelle, Bedingung im WHERE:", A.Linien(3),
                 "**Abfrage 2** – Verbund über zwei Tabellen mit FROM … WHERE:", A.Linien(4),
                 "**Abfrage 3** – über die n:m-Beziehung (drei Tabellen), gruppiert oder sortiert:", A.Linien(5))
    d.inhalt(Loesung(
        "**Beispiel „Schulband“** (eine von vielen richtigen Lösungen):",
        Schema("Musiker(<u>MusikerNr</u>, Name, Instrument)"), Schema("Band(<u>BandNr</u>, Name, Probenraum)"),
        Schema("spieltIn(<u>↑MusikerNr, ↑BandNr</u>, Seit)"),
        SQL(BAND_SKRIPT)))
    d.inhalt(Loesung(
        "**Drei Abfragen im Abitur-Stil** zum Beispiel „Schulband“:",
        *[x for q in BAND_ABFRAGEN for x in (SQL(q), leer_ergebnis(BAND_SKRIPT, q))],
        fehler=[("P9", "Beziehungstabelle ohne zusammengesetzten Primärschlüssel – dann darf dasselbe Paar doppelt "
                       "vorkommen."), ("P3", "Abfrage 3 gruppiert nur nach dem Namen der Band (GROUP-BY-Regel, "
                                             "Gleichnamige).")]))
    name = "DD_K1_Eigene_Datenbank" + ("_LSG" if fassung == "loesung" else "")
    return d.speichern(K1 / f"{name}.docx")


# ================================================================== K2 – Escape Room
def codes():
    """Codes der Stationen wie der Server sie berechnet (src/content/live.js, Akten-DBs)."""
    js = ("const R=process.argv[1];const {ladeDatenbanken}=require(R+'/src/sql/datenbanken.js');"
          "const L=require(R+'/src/content/live.js');const d=require(R+'/seed/live/escape.json');"
          "const a=L.direktAusfuehrer(ladeDatenbanken(undefined,{log:()=>{}}));const o={};"
          "for(const s of d.stationen)o[s.id]=L.berechneCode(s,a.fuehreAus.bind(a));console.log(JSON.stringify(o));")
    r = subprocess.run(["node", "-e", js, str(REPO)], capture_output=True, text=True, check=True, cwd=REPO)
    return json.loads(r.stdout)


def _md(t):
    return t.replace("\\n", " ")


def station_kopf(d, s, *, bonus=False):
    tab, z = d._kasten(d.doc, d.breite, rand=A.SIEGELROT, staerke=1.5, flaeche=A.PAPIER)
    niveau = {"alle": "gA und eA", "eA": "nur eA", "gA": "gA-Ersatz für Station 5"}.get(s.get("niveau"), "Zusatz")
    d._kastenkopf(z, "ESCAPE ROOM WESERSTEDT · " + ("BONUS-SCHLOSS" if bonus else f"STATION {s['id'][1:]} · UMSCHLAG"),
                  rechts=niveau, farbe=A.SIEGELROT, breite=d.breite)
    p = z.add_paragraph(style="DD Tabellentext")
    d._lauf_stil(p.add_run(s["titel"]), schrift=A.SCHRIFT_KOPF, groesse=22)
    p = z.add_paragraph(style="DD Tabellentext")
    d._text(p, "*" + s["story"] + "*", groesse=11)
    d._nach_kasten(d.doc)


def station_inhalt(d, s):
    """Material und Aufgabe einer Station (ohne Lösung und Code) – aus seed/live/escape.json."""
    a = s["aufgabe"]
    texte = [b["md"] for b in a["inhalt"] if b["t"] == "text"]
    hinweise = [b["md"] for b in a["inhalt"] if b["t"] == "hinweis"]
    sid = s["id"]
    material = []
    if sid == "S1":
        c = sqlite3.connect(":memory:")
        c.executescript((REPO / "seed" / "datenbanken" / "fundbuero" / "basis.sql").read_text(encoding="utf-8"))
        zeilen = c.execute("SELECT FundNr, Bezeichnung, Fundort, Finder, AbgeholtAm FROM Fundsache "
                           "WHERE FundNr IN (3, 8, 15, 22, 47) ORDER BY FundNr").fetchall()
        material = [Schema("Fundsache(<u>FundNr</u>, Bezeichnung, Kategorie, Farbe, Fundort, Stadtteil, Funddatum, Wert, "
                           "Finder, AbgeholtAm)"),
                    "Ausschnitt (fünf von vielen Zeilen):",
                    Tabelle(["FundNr", "Bezeichnung", "Fundort", "Finder", "AbgeholtAm"],
                            [[A.zelle_text(v) for v in z] for z in zeilen], pk=("FundNr",), groesse=8.5)]
    elif sid == "S2":
        material = [Schema("Station(<u>StationID</u>, Name, Stadtteil, Stellplaetze)"),
                    Schema("Rad(<u>RadID</u>, Typ, Baujahr, ↑StationID, Status)"),
                    Schema("Reparatur(<u>ReparaturID</u>, ↑RadID, Datum, Grund, Kosten)"),
                    "Ein Rad in der Werkstatt hat keine Station (StationID ist NULL)."]
    elif sid == "S3":
        material = [Schema("Stand(<u>StandNr</u>, Name, Art, Platz)"),
                    Schema("Schicht(<u>↑HelferNr, ↑StandNr, Beginn</u>, Ende)"),
                    Schema("Helfer(<u>HelferNr</u>, Vorname, Nachname, Jahrgang, Verein)"),
                    "Beginn und Ende sind Zeitpunkte im Format 'JJJJ-MM-TT hh:mm', z. B. '2026-08-29 14:00'."]
    elif sid == "S4":
        c = sqlite3.connect(":memory:")
        c.executescript((REPO / "seed" / "datenbanken" / "tus" / "basis.sql").read_text(encoding="utf-8"))
        zeilen = c.execute("SELECT rowid, Mitglied, Geburtsjahr, Abteilungen, Beitragsgruppe, Monatsbeitrag, Eintritt "
                           "FROM MitgliederlisteRoh WHERE rowid IN (1, 2, 9, 19, 34) ORDER BY rowid").fetchall()
        aufgabe = a["interaktion"]
        material = ["Ausschnitt der Rohliste (fünf von 62 Zeilen):",
                    Tabelle(["Zeile", "Mitglied", "Geburtsjahr", "Abteilungen", "Beitragsgruppe", "Monatsbeitrag",
                             "Eintritt"],
                            [[str(z[0]), z[1], str(z[2]), A.zelle_text(z[3]), z[4], f"{z[5]:.2f}".replace(".", ","),
                              z[6]] for z in zeilen], groesse=8,
                            breiten=[1.3, 2.8, 2.2, 2.5, 2.8, 2.6, 2.0]),
                    "**" + aufgabe[0]["frage"] + "**",
                    Tabelle(["Auftragskarte", "Anomalie-Nr."],
                            [[_md(e["md"]), ""] for e in aufgabe[0]["elemente"]], breiten=[13.0, 3.6], groesse=9),
                    "Anomaliearten: " + " · ".join(k["md"] for k in aufgabe[0]["kategorien"]),
                    "**" + aufgabe[1]["frage"] + "**",
                    Liste([o["md"] for o in aufgabe[1]["optionen"]])]
    elif sid == "S5":
        er = next(b for b in a["inhalt"] if b["t"] == "er")
        start = a["interaktion"]["start"]
        material = [ER(er["graph"], er["layout"], breite_cm=16),
                    "Schon angelegt:",
                    *[Schema(f"{r['name']}(" + ", ".join(f"<u>{x['name']}</u>" if x.get("pk") else x["name"]
                                                         for x in r["attribute"]) + ")") for r in start]]
    elif sid == "S5g":
        tb = next(b for b in a["inhalt"] if b["t"] == "dbtabelle")
        material = [Tabelle([k["name"] for k in tb["kopf"]], [[A.zelle_text(v) for v in z] for z in tb["zeilen"]],
                            groesse=9),
                    "**" + a["interaktion"]["frage"] + "**",
                    Liste([o["code"] for o in a["interaktion"]["optionen"]])]
    elif sid == "S6":
        ia = a["interaktion"]
        material = [Tabelle(["Fall aus Weserstedt", "Grundsatz-Nr."], [[_md(e["md"]), ""] for e in ia["elemente"]],
                            breiten=[13.6, 3.0], groesse=9),
                    "Grundsätze: " + " · ".join(k["md"] for k in ia["kategorien"])]
    d.beweisstueck(1, "Euer Auftrag", *texte)
    if material:
        d.beweisstueck(2, "Material im Umschlag", *material)
    d.notiz("So entsteht der Code", *hinweise,
            "Löst die Aufgabe auf der Seite „Live“ – stimmt eure Lösung, zeigt sie euch den Code. Gebt ihn ein, dann "
            "öffnet sich die nächste Station.")


BONUS = ("SELECT COUNT(*) AS Bekanntschaften\nFROM kennt k, Person p1, Person p2\nWHERE k.PersonNr = p1.PersonNr\n"
         "  AND k.BekannterNr = p2.PersonNr\n  AND p1.Stadtteil = p2.Stadtteil;")
BONUS_LISTE = ("SELECT p1.Nachname, p2.Nachname AS Bekannter, p1.Stadtteil\nFROM kennt k, Person p1, Person p2\n"
               "WHERE k.PersonNr = p1.PersonNr\n  AND k.BekannterNr = p2.PersonNr\n  AND p1.Stadtteil = p2.Stadtteil\n"
               "ORDER BY p1.Nachname;")
BONUS_STATION = {"id": "B", "titel": "Das Zusatzschloss", "niveau": None,
                 "story": "Am Tresor hängt noch ein kleines Vorhängeschloss mit zwei Rädchen. Juri grinst: „Das ist nur für "
                          "die Schnellsten – wer kennt wen in der eigenen Nachbarschaft?“"}


def k2_stationen():
    d = AktenDokument("kuer", "K", "Escape Room Weserstedt", fassung="schueler", material="K2 Stationen",
                      datenbank="keine", kuer=True, untertitel="Kür K2 · Stationsumschläge zum Ausschneiden und "
                      "Eintüten – Wiederholung aller Akten vor der Generalprobe")
    d.kopfband(name_datum=False)
    d.fall_einstieg(ESCAPE["briefing"])
    d.ueberschrift("So funktioniert der Escape Room", 2)
    d.inhalt(Liste([
        "Ihr arbeitet in **Teams zu 3–4**. Jede und jeder öffnet die Seite **„Live“** und tritt der Runde mit derselben "
        "Team-Nummer bei.",
        "Die Stationen kommen **in fester Reihenfolge**: Erst wenn ihr den Code einer Station eingebt, öffnet sich die "
        "nächste. Wer falsch abfragt, bekommt keinen Code.",
        "Zu jeder Station gibt es einen **Umschlag** mit Material (Tabellenausschnitte, Schemata, ER-Diagramm). Die "
        "Antwort gebt ihr auf dem Gerät ein.",
        f"Der Countdown läuft **{ESCAPE['dauerMin']} Minuten**. Hängt ihr fest, gibt eure Lehrkraft nach "
        f"{ESCAPE['tippNachMin']} Minuten an der Station den **Tipp-Umschlag** frei – er kostet "
        f"{ESCAPE['tippStrafeMin']} Minuten Zeitstrafe.",
        "**Die Tastatur wechselt je Station** – jede und jeder tippt einmal.",
        "Punkte fürs Lab gibt es heute nicht, nur Ruhm: Der Beamer zeigt, welches Team wie weit ist. Nach der Runde "
        "werden alle Antworten gelöscht.",
    ]))
    d.ueberschrift("Laufzettel eures Teams", 2)
    d.tabelle(["Station", "Schloss", "Code", "Uhrzeit", "Tipp genutzt?"],
              [[s["id"], s["titel"], "", "", ""] for s in ESCAPE["stationen"]] + [["Bonus", "Das Zusatzschloss", "", "", ""]],
              breiten=[1.8, 5.6, 3.4, 2.8, 3.4], groesse=9.5)
    d.absatz("Station 5 gibt es in zwei Fassungen: **S5 Die Planrolle** (eA-Kurse) oder **S5g Der Schlüsselkasten** "
             "(gA-Kurse) – ihr bekommt nur eine davon.")
    for s in ESCAPE["stationen"]:
        d.seitenumbruch()
        station_kopf(d, s)
        station_inhalt(d, s)
        d.ueberschrift("Notizen", 3)
        d.inhalt(A.Linien(4 if s["id"] in ("S4", "S5", "S6") else 6))
    d.seitenumbruch()
    station_kopf(d, BONUS_STATION, bonus=True)
    d.beweisstueck(1, "Euer Auftrag",
                   "Nur wenn euer Team alle sechs Stationen geschafft hat: Ermittelt mit **einer** Abfrage auf der "
                   "Fall-Datenbank der Detektei, wie viele Bekanntschaften es gibt, bei denen beide Personen im "
                   "**selben Stadtteil** wohnen. Die Tabelle Person kommt dabei **zweimal** vor (Tabellenalias!).")
    d.beweisstueck(2, "Material im Umschlag",
                   Schema("Person(<u>PersonNr</u>, Vorname, Nachname, Jahrgang, Stadtteil)"),
                   Schema("kennt(<u>↑PersonNr, ↑BekannterNr</u>, Seit)"),
                   "kennt ist gerichtet: PersonNr gibt an, BekannterNr zu kennen. Stadtteil kann NULL sein (unbekannt).")
    d.notiz("So entsteht der Code", "Der Code ist die gesuchte Anzahl, zweistellig mit führender Null. Zeigt eure "
            "Abfrage und den Code eurer Lehrkraft – sie prüft am Platz. Ausprobieren könnt ihr in der Freien Ermittlung "
            "(Konsole, Datenbank Detektei).")
    d.inhalt(A.Linien(6))
    return d.speichern(K2 / "DD_K2_Escape_Room_Stationen.docx")


def k2_lehrkraft():
    c = codes()
    d = AktenDokument("kuer", "K", "Escape Room Weserstedt – Lehrkraft", fassung="loesung", material="K2 Lehrkraft",
                      datenbank="keine", kuer=True, untertitel="Kür K2 · Ablauf, Live-Modus, Codes, Lösungen und "
                      "Tipp-Umschläge (vor DS 13)")
    d.kopfband()
    d.ueberschrift("1 · Überblick", 1)
    d.tabelle(["Aspekt", "Beschreibung"], [
        ["Ziele", "Die Schülerinnen und Schüler **wiederholen** alle Akten unter Zeitdruck im Team, **wenden** SQL-, "
                  "Schlüssel-, Anomalie- und ER-Wissen in neuen Aufgaben **an** und **reflektieren** ihre häufigsten "
                  "Fallen vor der Generalprobe."],
        ["Kompetenzen", "Auswahl: K02, K08, K09, K18, K22, K24, K26, K27, K28, K34, K41 (Wiederholung) · Fallen P1–P10"],
        ["Niveau", "gA und eA – Station 5 nur eA (Die Planrolle), gA-Kurse bekommen automatisch S5g (Der "
                   "Schlüsselkasten); maßgeblich ist das Niveau des Kurses in den Kurs-Einstellungen."],
        ["Datenbanken", "Fundbüro, StadtRad, Stadtfest, TuS (Rohliste), Tanzschule (nur Papier, S5), Schließfächer "
                        "(nur Papier, S5g); Bonus: Fall-Datenbank der Detektei"],
        ["Punkte", "Keine Lab-Punkte. Ergebnisse werden nach Rundenende verworfen; nur die Teilnehmerzahl bleibt."],
    ], breiten=[3.0, 14.0])
    d.ueberschrift("2 · Ablauf (90 Minuten)", 1)
    d.tabelle(["Phase", "Zeit", "Inhalt / Ablauf", "Sozialform", "Material"], [
        ["Warm-up", "0–10'", "Warm-up-Karten W-A6-01…04 (Datenschutz, Wiederholung DS 12).", "EA", "Warm-up-Karten A6"],
        ["Briefing", "10–15'", "Juri hat die Zahlenschlösser am Tresor mit den Detektei-Lizenzen neu eingestellt und die "
         "Codes „besonders sicher“ in den Datenbanken versteckt – sechs Stationen, sechs Codes. Regeln, Teams (3–4), "
         "Beamer-Rangliste.", "Plenum", "Beamer (Live-Board)"],
        ["Escape Room", "15–70'", f"Teams lösen S1–S6 in fester Reihenfolge; Countdown {ESCAPE['dauerMin']}'. Je "
         "Station ein Umschlag mit Material. Tipp-Umschlag nach " f"{ESCAPE['tippNachMin']}' (Strafe "
         f"{ESCAPE['tippStrafeMin']}'). Schnelle Teams: Bonus-Schloss.", "Teams", "Stationsumschläge, iPads"],
        ["Duell-Runde", "70–80'", "Optional: Live-Duell mit Aufgaben aus dem Live-Pool (gleiche Aufgabe für alle, "
         "Punkte für Richtigkeit + Zeit).", "EA", "Live-Pool (Abschnitt 8)"],
        ["Auswertung", "80–90'", "Rangliste, häufigste Fehler je Station (anonym), Fallen-Ausblick auf die "
         "Generalprobe: Welche P-Nummer hat euch heute aufgehalten?", "Plenum", "Werkzeugkarte 8"],
    ], breiten=[2.2, 1.5, 8.2, 2.3, 2.8], groesse=8.5)

    d.ueberschrift("3 · Vorbereitung", 1)
    d.inhalt(Liste([
        "**Live-Modus im Schul-WLAN testen** (spätestens am Vortag): Testrunde starten, mit einem zweiten Gerät über "
        "die Seite „Live“ beitreten, eine Aufgabe freischalten. Kommen keine Ereignisse an, puffert ein Proxy die "
        "Server-Sent Events – dann die IT fragen oder auf ein anderes Netz ausweichen.",
        "Kurs-Niveau prüfen (eA/gA) – davon hängt ab, ob S5 oder S5g gespielt wird.",
        "**Stationsumschläge packen:** je Team ein Satz (Kopiervorlage „Stationsumschläge“, eine Seite je Station; "
        "S5 oder S5g passend zum Kurs) plus Laufzettel. Umschläge außen mit Stationsnummer beschriften.",
        "Optional mit **Zahlenschlössern**: Umschlag der Station n + 1 mit dem Code der Station n verschließen "
        "(Codes in Abschnitt 5; die Live-Steuerung zeigt sie ebenfalls nur Ihnen).",
        "**Tipp-Umschläge** (Abschnitt 7) ausschneiden – je Station einer, bei Ihnen am Pult.",
        "Beamer-Board testen; Rolle „Tastatur wechselt je Station“ ansagen; Countdown sichtbar.",
    ]))

    d.ueberschrift("4 · Live-Modus Schritt für Schritt", 1)
    d.inhalt(Liste([
        "Lehrkraft-Bereich → Reiter **Live** → Steuerung (am besten „Steuerung auf eigener Seite öffnen“).",
        f"Modus **Escape Room** wählen, Dauer {ESCAPE['dauerMin']} Minuten und „Tipp-Umschlag nach "
        f"{ESCAPE['tippNachMin']} Minuten“ prüfen, **Runde starten**.",
        "**Beamer-Ansicht öffnen** und am Beamer zeigen („Sechs Schlösser bis zum Tresor“).",
        "Schülerinnen und Schüler öffnen die Seite **„Live“** (/live), wählen ihre **Team-Nummer** und tippen auf "
        "„Mitmachen“. Die Steuerung zeigt Personen und Teams.",
        "Briefing vorlesen, dann **„Los – Countdown starten“**.",
        "Während der Runde: Die Steuerung zeigt je Team die aktuelle Station und die **Codes (nur für Sie)**. "
        "Tipp-Umschläge öffnen sich automatisch nach der eingestellten Zeit an der Station; mit "
        "**„Tipp-Umschläge freigeben“** geben Sie sie vorher frei, mit „sperren“ wieder zu.",
        "Ein Team löst die Aufgabe → das Gerät zeigt den Code → Team gibt den Code ein → nächste Station. Nach S6: "
        "**Tresor offen**.",
        "Ende: **„Runde beenden“** → Bestätigen („Ja, beenden und alles verwerfen“). Der Endstand bleibt sichtbar, "
        "alle Antworten werden gelöscht.",
        "Optional danach: neue Runde im Modus **Live-Duell** mit Aufgaben aus dem Live-Pool; Aufgaben nacheinander "
        "freischalten („Erste Aufgabe freischalten“ / „Nächste Aufgabe“).",
    ], nummeriert=True))

    d.ueberschrift("5 · Codes auf einen Blick", 1)
    d.tabelle(["Station", "Schloss", "Code", "So entsteht der Code"], [
        [s["id"], s["titel"], f"`{c[s['id']]}`", " ".join(b["md"] for b in s["aufgabe"]["inhalt"] if b["t"] == "hinweis")
         .replace("**Schloss:** ", "")] for s in ESCAPE["stationen"]] +
        [["Bonus", "Das Zusatzschloss", f"`{int(abfrage_ergebnis(BONUS, 'detektei')[1][0][0]):02d}`",
          "Anzahl der Bekanntschaften im selben Stadtteil, zweistellig (nur Papier, Prüfung am Platz)"]],
        breiten=[1.6, 3.8, 1.8, 9.8], groesse=8.5)
    d.absatz("Die Codes rechnet der Server aus den Musterlösungen und den Datenbanken aus; ändern sich die Daten, ändern "
             "sich die Codes – maßgeblich ist die Anzeige in der Live-Steuerung.")

    d.ueberschrift("6 · Lösungen je Station", 1)
    loesung_stationen(d, c)

    d.seitenumbruch()
    d.ueberschrift("7 · Tipp-Umschläge (ausschneiden)", 1)
    d.absatz("Je Station ein Tipp. Im Live-Modus öffnet das Team den Tipp auf dem Gerät (Zeitstrafe "
             f"{ESCAPE['tippStrafeMin']} Minuten); diese Karten sind für den Papier-Einsatz bzw. als Backup.")
    tipps = [[f"TIPP · {s['id']} · {s['titel']}", s["aufgabe"]["tipps"][0]] for s in ESCAPE["stationen"]]
    tipps.append(["TIPP · Bonus · Das Zusatzschloss", "Person zweimal in FROM: p1 für PersonNr, p2 für BekannterNr – "
                  "zwei Verbundbedingungen über kennt, dann die Stadtteile vergleichen."])
    for kopf, text in tipps:
        tab, z = d._kasten(d.doc, d.breite, rand=A.RAND_STARK, staerke=0.75, art="dashed", nicht_teilen=True)
        d._kastenkopf(z, kopf, farbe=A.MESSING_TEXT)
        d._text(z.add_paragraph(style="DD Tabellentext"), text, groesse=11)
        d._nach_kasten(d.doc)

    d.ueberschrift("8 · Live-Pool für die Duell-Runde (20 Aufgaben, je ≤ 90 s)", 1)
    d.absatz("Transferaufgaben je Akte (nicht identisch mit Lab, Verhör oder Prüfung). Musterlösungen zeigt die "
             "Live-Steuerung nur Ihnen; eA-Aufgaben (Akte 5) nur in eA-Kursen.")
    art = {"sql": "SQL", "choice": "Auswahl", "ergebnis": "Ergebnis"}
    d.tabelle(["ID", "Akte", "Titel", "Art"], [
        [a["id"], str(a.get("akte", "")), a["titel"],
         art.get(a["interaktion"].get("kind") if isinstance(a["interaktion"], dict) else "", "mehrteilig")]
        for a in POOL["aufgaben"]], breiten=[2.4, 1.4, 9.0, 3.0], groesse=8.5)
    d.notiz("Auswertung", "Häufigste Fallen je Station: S1 P5 (NULL, LIKE), S2 P2/P7 (Verbund, Präfix), S3 P1/P3 "
            "(WHERE vs. HAVING, GROUP-BY-Regel), S4 P8 (Schlüssel aus dem Ausschnitt), S5 P9 (n:m ohne eigene "
            "Relation), S6 Grundsätze verwechselt. Überleitung: „Diese Fallen prüft die Generalprobe.“")
    return d.speichern(K2 / "DD_K2_Escape_Room_Lehrkraft.docx")


def loesung_stationen(d, c):
    s = STATION
    # S1
    a = s["S1"]["aufgabe"]
    sql1 = a["loesung"]["sql"] + ";"
    d.ueberschrift(f"S1 · {s['S1']['titel']} – Code {c['S1']}", 3)
    d.inhalt(SQL(sql1, db="fundbuero"), ergebnis(sql1, "fundbuero"),
             Loesung(f"6 Zeilen → Code **{c['S1']}**. Kompetenzen K17, K18, K19, K29.",
                     fehler=[("P5", "`AbgeholtAm = NULL` statt `IS NULL` → 0 Zeilen, Code 000."),
                             ("P6", "`LIKE 'schlüssel%'` findet nur Bezeichnungen, die so beginnen.")]))
    # S2
    sql2 = s["S2"]["aufgabe"]["loesung"]["sql"] + ";"
    d.ueberschrift(f"S2 · {s['S2']['titel']} – Code {c['S2']}", 3)
    d.inhalt(SQL(sql2, db="stadtrad"), ergebnis(sql2, "stadtrad"),
             Loesung(f"RadID {int(c['S2'])} → Code **{c['S2']}**. Kompetenzen K23, K22, K16.",
                     fehler=[("P2", "Verbund Rad–Station vergessen → Reparaturen aller Räder, falsche RadID."),
                             ("P7", "`StationID` ohne Präfix ist mehrdeutig (Rad und Station).")]))
    # S3
    sql3 = s["S3"]["aufgabe"]["loesung"]["sql"] + ";"
    kopf, zeilen = abfrage_ergebnis(sql3, "stadtfest")
    d.ueberschrift(f"S3 · {s['S3']['titel']} – Code {c['S3']}", 3)
    d.inhalt(SQL(sql3, db="stadtfest"), Ergebnis(kopf, zeilen),
             Loesung(f"{len(zeilen)} Stände, stärkster Stand Nr. {zeilen[0][0]} → Code **{c['S3']}**. "
                     "Kompetenzen K26, K27, K22.",
                     fehler=[("P1", "`COUNT(*) >= 7` im WHERE (Syntaxfehler) oder Tagesbedingung im HAVING."),
                             ("P3", "Nur nach Name gruppiert bzw. Name nicht in GROUP BY.")]))
    # S4
    ia = s["S4"]["aufgabe"]["interaktion"]
    kat = {k["id"]: k["md"] for k in ia[0]["kategorien"]}
    lo = s["S4"]["aufgabe"]["loesung"]
    d.ueberschrift(f"S4 · {s['S4']['titel']} – Code {c['S4']}", 3)
    d.inhalt(Loesung(
        *[f"{_md(e['md'])} → **{kat[lo[0][e['id']]]}**" for e in ia[0]["elemente"]],
        "b) Richtig: **" + next(o["md"] for o in ia[1]["optionen"] if o["id"] in lo[1]["richtig"]) + "** – " +
        s["S4"]["aufgabe"]["erklaerung"][0]["md"].split("–")[-1].strip(),
        f"Code **{c['S4']}** (Zuordnung 2-3-1, Schlüssel 3). Kompetenzen K08, K02.",
        fehler=[("P8", "Schlüssel 2 (Vorname, Nachname), weil er im Ausschnitt „fast“ eindeutig ist – Lukas Behrens "
                       "kommt zweimal vor."), ("P10", "Löschanomalie mit Änderungsanomalie verwechselt.")]))
    # S5
    d.ueberschrift(f"S5 · {s['S5']['titel']} (eA) – Code {c['S5']}", 3)
    d.inhalt(Loesung(Schema("Tanzlehrer(<u>LehrerNr</u>, Name, Telefon)"),
                     Schema("Tanzkurs(<u>KursNr</u>, Titel, Wochentag, ↑LehrerNr)"),
                     Schema("Teilnehmer(<u>TeilnehmerNr</u>, Vorname, Nachname)"),
                     Schema("belegt(<u>↑KursNr, ↑TeilnehmerNr</u>, Seit)"),
                     f"4 Relationen, 3 Fremdschlüssel → Code **{c['S5']}**. Kompetenzen K41, K34.",
                     fehler=[("P9", "Fremdschlüssel KursNr in Tanzlehrer (falsche Seite) oder belegt ohne eigene "
                                    "Relation (n:m) → 3 Relationen, Code 3…")]))
    # S5g
    ia = s["S5g"]["aufgabe"]["interaktion"]
    d.ueberschrift(f"S5g · {s['S5g']['titel']} (gA) – Code {c['S5g']}", 3)
    d.inhalt(Loesung("Richtig: " + ", ".join(o["code"] for o in ia["optionen"] if o["id"] in
                                             s["S5g"]["aufgabe"]["loesung"]["richtig"]) + ". " +
                     s["S5g"]["aufgabe"]["erklaerung"][0]["md"],
                     f"2 taugliche Schlüssel, der kleinste hat 1 Attribut → Code **{c['S5g']}**. Kompetenz K02.",
                     fehler=[("P8", "(Code) gewählt, weil der Ausschnitt keine Wiederholung zeigt (Ausschnitt-Falle).")]))
    # S6
    ia = s["S6"]["aufgabe"]["interaktion"]
    kat = {k["id"]: k["md"] for k in ia["kategorien"]}
    lo = s["S6"]["aufgabe"]["loesung"]
    d.ueberschrift(f"S6 · {s['S6']['titel']} – Code {c['S6']}", 3)
    d.inhalt(Loesung(*[f"{_md(e['md'])} → **{kat[lo[e['id']]]}**" for e in ia["elemente"]],
                     f"Code **{c['S6']}** – der Tresor ist offen. Kompetenzen K44, K45.",
                     fehler=[("P10", "Zweckbindung und Rechtsgrundlage verwechselt: Bei „Nachtanalyse“ wurden die "
                                     "Daten rechtmäßig erhoben, aber für einen neuen Zweck genutzt.")]))
    # Bonus
    kopf, zeilen = abfrage_ergebnis(BONUS, "detektei")
    d.ueberschrift(f"Bonus · Das Zusatzschloss – Code {int(zeilen[0][0]):02d}", 3)
    d.inhalt(SQL(BONUS, db="detektei"), Ergebnis(kopf, zeilen),
             Loesung(f"Code **{int(zeilen[0][0]):02d}**. Zur Kontrolle die Liste der Bekanntschaften:",
                     SQL(BONUS_LISTE, db="detektei"), ergebnis(BONUS_LISTE, "detektei"),
                     fehler=[("P7", "Person nur einmal in FROM – dann vergleicht die Abfrage eine Person mit sich "
                                    "selbst."), ("P5", "Personen ohne Stadtteil (NULL) zählen nicht: NULL = NULL ist "
                                                       "nie wahr.")]))


def main():
    for f in ("schueler", "loesung"):
        print(f"✔ {k1(f).relative_to(REPO)}")
    print(f"✔ {k2_stationen().relative_to(REPO)}")
    print(f"✔ {k2_lehrkraft().relative_to(REPO)}")


if __name__ == "__main__":
    main()
