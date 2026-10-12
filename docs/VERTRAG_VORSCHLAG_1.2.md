# Vorschlag: VERTRAG.md Version 1.2 (für `frankjuchim/labs`)

**Anlass:** Die Datendetektei ist die zweite Plattform mit SSO im Verbund. Sie entsteht als eigenes Produkt (eigene
Codebasis, eigenes Design) statt als Kopie von Algo Quest, erfüllt aber alle MUSS-Regeln §5–§10. Damit das nicht still
vom Vertrag abweicht, schlägt dieses Dokument die folgenden Änderungen vor. Alle Änderungen sind **Nebenversion**
(keine bestehende Plattform wird ungültig).

**Vorgehen:** Frank übernimmt die Texte (ggf. angepasst) in `labs/VERTRAG.md`, erhöht die Version auf 1.2, trägt §14
ein und passt bei Bedarf `scripts/vertrag_pruefen.js` an (hier nicht nötig: keine neuen Pflichtfelder).

---

## Änderung 1 – §13.2 eigene Codebasis zulässig

**Bisher:**
> 2. **Neue Plattformen** starten als Kopie von Algo Quest (AlgoQuest-README Teil G), setzen sofort Manifest und SSO
>    nach `docs/INTEGRATION.md` um und verweisen in README und CLAUDE.md auf diesen Vertrag.

**Neu:**
> 2. **Neue Plattformen** starten als Kopie von Algo Quest (AlgoQuest-README Teil G) **oder mit eigener Codebasis**,
>    wenn sie §5–§10 vollständig erfüllen, das Aufgabenformat nach §9 kompatibel erweitern und den gemeinsamen Kern
>    (§13.3) in einem eigenen Ordner (z. B. `src/kern/`) ohne Abhängigkeit von themenspezifischem Code führen. In beiden
>    Fällen setzen sie sofort Manifest und SSO nach `docs/INTEGRATION.md` um und verweisen in README und CLAUDE.md auf
>    diesen Vertrag.

**Begründung:** Unterschiedliche Themen brauchen unterschiedliche Werkzeuge (SQL-Sandbox, ER-Editor); ein eigener,
klar abgegrenzter Kern erleichtert die spätere Auslagerung nach `lab-kern` eher, als dass er sie erschwert.

## Änderung 2 – §7 Liste bekannter Fähigkeiten

**Ergänzung nach dem Absatz zu `urls.ssoEnde`:**
> **Bekannte Fähigkeiten** (`faehigkeiten`, Auswahl; weitere als Nebenversion erlaubt): `gast` (Pflicht), `themen`,
> `lehrkraft-materialien`, `boss`, `training`, `warmup`, `scoreboard`, `beamer`, `urkunden`, `fallen-profil`,
> `sql-konsole` (die Plattform führt SQL-Abfragen von Schülerinnen und Schülern in einer Sandbox aus),
> `live` (Live-Runden im Kurs über Server-Sent Events, ohne Auswirkung auf Lab-Punkte).

## Änderung 3 – §6 Klarstellung „unbekannter Kurs“ bei `kurs-aendern`

**Ergänzung in der Tabelle, Zeile `POST /api/verbund/kurse/:kursId`:**
> … ist der Kurs der Plattform unbekannt, legt sie ihn mit Standard-Einstellungen an und antwortet `200` (nicht `404`),
> damit der Auftrag nicht in Wiederholungen läuft.

**Begründung:** Das Portal schickt Kursänderungen auch für Kurse, die die Plattform noch nie gesehen hat (Einschalten,
Umbenennen). Die Testplattform verhält sich bereits so.

## Änderung 4 (optional) – §9 Sandbox für Schüler-Code

**Ergänzung unter „Sicherheit“:**
> Plattformen, die Code oder Abfragen von Schülerinnen und Schülern ausführen, tun das isoliert von der
> Plattform-Datenbank (eigener Prozess/Worker, flüchtige oder schreibgeschützte Übungsdaten, Zeit- und Größenlimits)
> und senden keine Lösungsdaten in Prüfantworten zurück.

## §14 – neuer Eintrag

| Version | Datum | Änderung |
|---|---|---|
| 1.2 | `<Datum der Annahme>` | §13.2 eigene Codebasis zulässig (Kern in eigenem Ordner); §7 Liste bekannter Fähigkeiten (u. a. `sql-konsole`, `live`); §6 Klarstellung unbekannter Kurs bei `kurs-aendern`; §9 Sandbox-Regel für ausgeführten Schüler-Code |

---

## Klärungsbedarf (keine Vertragsänderung nötig, aber zu entscheiden)

| Punkt | Datendetektei verhält sich so | Vorschlag für später |
|---|---|---|
| Inhaberin vs. Mitlehrkraft im Token nicht unterscheidbar | alle Lehrkräfte eines Kurses dürfen die Kurs-Einstellungen der Plattform ändern | ggf. `kurse[].rolle: "inhaberin"` in v1.3 |
| Bedeutung „Kurs gesperrt“ (`aktiv:false`) | Schüler kein Zugriff, Lehrkraft nur lesend, Board aus | als Empfehlung in §6 aufnehmen |
| Beamer-Board ohne Kurscode (Modus `portal`) | eigener, erneuerbarer Board-Schlüssel je Kurs-ID | Muster für alle Plattformen in §9 empfehlen |
| Wiederholungsdauer der Aufträge | – | Vertrag nennt „etwa 6 Tage“, der Portal-Code erreicht etwa 3,9 Tage → Text oder Code angleichen |
