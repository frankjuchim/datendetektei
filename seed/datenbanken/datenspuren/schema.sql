-- =====================================================================
-- Datendetektei Weserstedt · Übungsdatenbank „Datenspuren“ (Akte 6, Finale)
-- Pseudonyme Exporte verschiedener Stellen der Stadt + Auszug aus dem Einwohnerverzeichnis.
-- Zwischen den Tabellen gibt es bewusst KEINE Fremdschlüssel: verknüpfen lassen sie sich
-- nur über Quasi-Identifikatoren (Jahrgang, Stadtteil) sowie über Zeit und Ort.
-- Exportzeitraum 2026-08-21 bis 2026-09-20 (Datenstand 2026-09-20 ≈ 20:00).
-- Kurzschreibweise:
--   Einwohner(EinwohnerNr, Vorname, Nachname, Jahrgang, Stadtteil, Strasse)
--   RadExport(KundenToken, Jahrgang, Stadtteil, Tarif, StartStation, Start)   PK: KundenToken, Start
--   FestZahlung(KartenToken, StandNr, Zeitpunkt, Betrag)                     PK: KartenToken, Zeitpunkt
--   VereinExport(MitgliedToken, Geburtsjahr, Abteilung, Stadtteil)           PK: MitgliedToken, Abteilung
--   AppCheckin(Geraet, Ort, Zeitpunkt)                                       PK: Geraet, Zeitpunkt
-- Ergänzung zur Spec (Abschnitt 9): Einwohner.Strasse (Akte-6-Schlussplädoyer rein per SQL lösbar).
-- =====================================================================

PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS AppCheckin;
DROP TABLE IF EXISTS VereinExport;
DROP TABLE IF EXISTS FestZahlung;
DROP TABLE IF EXISTS RadExport;
DROP TABLE IF EXISTS Einwohner;

-- Auszug aus dem Einwohnerverzeichnis der Stadt (Klarnamen, Wohnadresse)
CREATE TABLE Einwohner (
  EinwohnerNr INTEGER PRIMARY KEY,
  Vorname     TEXT    NOT NULL,
  Nachname    TEXT    NOT NULL,
  Jahrgang    INTEGER NOT NULL CHECK (Jahrgang BETWEEN 1930 AND 2020),
  Stadtteil   TEXT    NOT NULL CHECK (Stadtteil IN ('Altstadt', 'Hafenviertel', 'Weserufer', 'Mühlenfeld',
                                                    'Nordheide', 'Lindenhof', 'Deichkamp', 'Bahnhofsviertel')),
  Strasse     TEXT    NOT NULL                     -- Straße und Hausnummer, z. B. 'Kranstraße 7'
);

-- Export von StadtRad: Kundennummer durch Token ersetzt, Startstation als Name (Text)
CREATE TABLE RadExport (
  KundenToken  TEXT    NOT NULL,
  Jahrgang     INTEGER NOT NULL,
  Stadtteil    TEXT    NOT NULL,
  Tarif        TEXT    NOT NULL CHECK (Tarif IN ('Basis', 'Plus', 'Schule')),
  StartStation TEXT    NOT NULL,
  Start        TEXT    NOT NULL CHECK (Start LIKE '____-__-__ __:__'),
  PRIMARY KEY (KundenToken, Start)
);

-- Export des Kartenzahlungsdienstes vom Stadtfest (nur Kartenzahlungen, keine Barzahlungen)
CREATE TABLE FestZahlung (
  KartenToken TEXT    NOT NULL,
  StandNr     INTEGER NOT NULL,                    -- StandNr wie in der DB Stadtfest (4 = Kaffeemobil)
  Zeitpunkt   TEXT    NOT NULL CHECK (Zeitpunkt LIKE '____-__-__ __:__'),
  Betrag      REAL    NOT NULL CHECK (Betrag > 0),
  PRIMARY KEY (KartenToken, Zeitpunkt)
);

-- Export des TuS Weserstedt für den Stadtsportbund (je Abteilungsmitgliedschaft eine Zeile;
-- NULL = Angabe fehlt in der Vereinsverwaltung)
CREATE TABLE VereinExport (
  MitgliedToken TEXT    NOT NULL,
  Geburtsjahr   INTEGER,
  Abteilung     TEXT    NOT NULL,
  Stadtteil     TEXT,
  PRIMARY KEY (MitgliedToken, Abteilung)
);

-- Standort-Check-ins der städtischen WeserApp: automatisch an markierten Orten (z. B. StadtRad-Stationen,
-- Festplatz, Fundbüro, Vereinsheim TuS); ist kein markierter Ort in der Nähe, speichert die App die
-- nächstgelegene Adresse ('Straße Hausnummer').
CREATE TABLE AppCheckin (
  Geraet    TEXT    NOT NULL,                      -- Gerätekennung 'WA-0000'
  Ort       TEXT    NOT NULL,
  Zeitpunkt TEXT    NOT NULL CHECK (Zeitpunkt LIKE '____-__-__ __:__'),
  PRIMARY KEY (Geraet, Zeitpunkt)
);
