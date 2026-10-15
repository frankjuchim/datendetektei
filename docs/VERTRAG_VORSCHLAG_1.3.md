# Vorschlag: VERTRAG.md Version 1.3 (für `frankjuchim/labs`)

**Anlass:** Die Datendetektei ist die zweite Plattform mit SSO im Verbund. Sie entsteht als eigenes Produkt (eigene
Codebasis, eigenes Design) statt als Kopie von Algo Quest, erfüllt aber alle MUSS-Regeln §5–§10. Damit das nicht still
vom Vertrag abweicht, schlägt dieses Dokument die folgenden Änderungen vor. Alle Änderungen sind **Nebenversion**
(keine bestehende Plattform wird ungültig).

> **Hinweis (2026-10-12):** Version 1.2 ist im Portal-Repo inzwischen vergeben (Anforderungsniveaus eA/gA). Dieser
> Vorschlag zielt deshalb auf **1.3** und setzt v1.2 voraus.

**Vorgehen:** Frank übernimmt die Texte (ggf. angepasst) in `labs/VERTRAG.md`, erhöht die Version auf 1.3, trägt §14
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

## Änderung 5 – §5 Einstieg aus dem Portal holt immer ein frisches Token

**Problem:** Kursmitgliedschaften kommen nur über das Token auf die Plattform („Name und Mitgliedschaft werden bei jeder
Anmeldung aktualisiert“). Hat ein Schüler noch eine Sitzung (bis 30 Tage), sieht er einen neuen Kurs bzw. den Wechsel in
einen anderen Kurs erst nach Ablauf der Sitzung oder nach „Abmelden“. Löschungen kommen dagegen sofort über die
Verbund-API an.

**Ergänzung in §5 (nach Schritt 1):**
> **Einstieg aus dem Portal:** Das Portal verlinkt jede Plattform über `<basis>/sso/start` (Plattformen mit
> `auth.modus` `portal`/`beides` MÜSSEN diesen Pfad anbieten). Ein Aufruf von `/sso/start` startet den SSO-Ablauf
> **immer neu**, auch wenn bereits eine Sitzung besteht; die bestehende Sitzung wird erst nach erfolgreicher Prüfung
> des neuen Tokens ersetzt (bei Fehler bleibt sie unverändert). Damit gelten neue oder geänderte Kursmitgliedschaften
> spätestens beim nächsten Wechsel aus dem Portal. Optionaler Parameter `ziel` (relativer Pfad auf der Plattform, sonst
> Startseite) wie bisher.

**Ergänzung in §7 (Manifest), optional:** `urls.ssoStart` (SOLL, Standard `<basis>/sso/start`), damit das Portal den
Einstieg nicht raten muss.

**Stand Datendetektei:** `/sso/start` startet bereits immer neu; die Sitzung wird nur bei gültigem Token ersetzt.

**Begründung:** Keine neue Verbund-API nötig, kein zusätzlicher Datenfluss; das Portal muss nur seine Plattform-Links
auf `/sso/start` umstellen. (Eine spätere Push-Benachrichtigung „Mitgliedschaft geändert“ über §6 bliebe möglich.)

## Änderung 6 – INTEGRATION.md: rollenneutraler Text für `fehler=keine_berechtigung`

**Problem:** Die Anschlussanleitung empfiehlt „Kein Zugang – deine Lehrkraft hat diese Plattform für deinen Kurs nicht
freigeschaltet“. Bei `keine_berechtigung` kennt die Plattform die Rolle nicht (es gibt kein Token) – der Text spricht
deshalb auch Lehrkräfte ohne Freischaltung als Schüler an.

**Neu (docs/INTEGRATION.md, Abschnitt Fehlerseite; im Vertrag §5 nur Verweis):**
> `fehler=keine_berechtigung` → Seite „**Kein Zugang.** Diese Plattform ist für dieses Konto noch nicht freigeschaltet.
> Schülerinnen und Schüler: Die Lehrkraft muss die Plattform im Portal für den Kurs freischalten. Lehrkräfte: Die
> Freischaltung der Plattform erteilt die Administration im Portal; danach die Plattform beim Kurs ankreuzen.“ –
> mit Link zurück zum Portal, ohne Sitzung.

## §14 – neuer Eintrag

| Version | Datum | Änderung |
|---|---|---|
| 1.3 | `<Datum der Annahme>` | §13.2 eigene Codebasis zulässig (Kern in eigenem Ordner); §7 Liste bekannter Fähigkeiten (u. a. `sql-konsole`, `live`) und `urls.ssoStart`; §6 Klarstellung unbekannter Kurs bei `kurs-aendern`; §9 Sandbox-Regel für ausgeführten Schüler-Code; §5 Einstieg aus dem Portal über `/sso/start` holt immer ein frisches Token (Kursmitgliedschaften sofort aktuell); INTEGRATION.md rollenneutraler Text für `keine_berechtigung` |

---

## Klärungsbedarf (keine Vertragsänderung nötig, aber zu entscheiden)

| Punkt | Datendetektei verhält sich so | Vorschlag für später |
|---|---|---|
| Inhaberin vs. Mitlehrkraft im Token nicht unterscheidbar | alle Lehrkräfte eines Kurses dürfen die Kurs-Einstellungen der Plattform ändern | ggf. `kurse[].rolle: "inhaberin"` in v1.3 |
| Bedeutung „Kurs gesperrt“ (`aktiv:false`) | Schüler kein Zugriff, Lehrkraft nur lesend, Board aus | als Empfehlung in §6 aufnehmen |
| Beamer-Board ohne Kurscode (Modus `portal`) | eigener, erneuerbarer Board-Schlüssel je Kurs-ID | Muster für alle Plattformen in §9 empfehlen |
| Wiederholungsdauer der Aufträge | – | Vertrag nennt „etwa 6 Tage“, der Portal-Code erreicht etwa 3,9 Tage → Text oder Code angleichen |
