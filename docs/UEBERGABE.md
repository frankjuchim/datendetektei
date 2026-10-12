# Übergabe an Claude Code

Dieses Repo enthält den vollständigen Planungsstand (Phase 0). Ab hier arbeitet Claude Code im Repo weiter.

## 1. Was Frank vorher erledigt

1. **GitHub-Repo anlegen:** `frankjuchim/datendetektei` (privat), ohne README/Lizenz-Vorlage.
2. **Initialer Push** des entpackten Ordners:
   ```bash
   cd datendetektei
   git init -b main
   git add .
   git commit -m "Planung Datendetektei (Phase 0): Spec, Pläne, Story, Feinplanung, Datenbanken, Design"
   git remote add origin git@github.com:frankjuchim/datendetektei.git
   git push -u origin main
   ```
3. **CapRover noch nicht verbinden.** Die App wird erst in Phase 1, Task 10 angelegt; Deploy läuft dann nur über die
   GitHub Action nach grüner Prüfung (kein CapRover-Webhook).
4. **Claude-Code-Session** auf dem Repo starten (Cloud oder lokal) und den Startprompt unten einfügen.

## 2. Startprompt für Claude Code

```
Wir bauen die „Datendetektei Weserstedt“, eine Lernplattform des Verbunds InfoLabs für die Unterrichtseinheit
Datenbanken (Informatik-LK Niedersachsen). Die Planung ist abgeschlossen und liegt im Repo.

Lies in dieser Reihenfolge:
1. CLAUDE.md (Arbeitsregeln, Konventionen, Quellen der Wahrheit)
2. docs/superpowers/specs/2026-10-12-datendetektei-design.md (Spezifikation, maßgeblich)
3. docs/superpowers/plans/2026-10-12-roadmap.md (Phasen 1–8)
4. docs/superpowers/plans/2026-10-12-phase1-geruest-kern.md (Plan Phase 1)
5. Vertrag des Verbunds: https://github.com/frankjuchim/labs/blob/main/VERTRAG.md (v1.1) und docs/INTEGRATION.md
   (labs ist öffentlich: git clone --depth 1 https://github.com/frankjuchim/labs in den Scratchpad).

Dann setze Phase 1 nach dem Plan um: Branch phase1/geruest-kern, superpowers:subagent-driven-development, TDD,
kleine Commits auf Deutsch. src/kern/jwt.js und scripts/vertrag_pruefen.js byte-identisch aus labs kopieren.
Abweichungen von Spec oder Vertrag nie still: melden und in Spec §18 bzw. als Vorschlag für VERTRAG.md festhalten.
Nichts nach main ohne meine Freigabe. Wenn Phase 1 abgenommen ist, schreibe mit superpowers:writing-plans den Plan
für Phase 2 und lege ihn mir vor.
```

## 3. Was Frank während Phase 1 beisteuert (Claude Code fragt danach)

| Wann | Was |
|---|---|
| Task 10 | CapRover-App `datendetektei` anlegen: Persistent Directory `/app/data`, HTTPS, Domain `datendetektei.frankjuchim.de`, Umgebungsvariablen laut README („Betrieb“), App-Token erzeugen. GitHub-Secrets `CAPROVER_URL`, `CAPROVER_APP_TOKEN` setzen. |
| Task 11 | Im Portal (Superadmin): Plattform eintragen, Rücksprung `https://datendetektei.frankjuchim.de/sso/ende` bestätigen, Testkurs anlegen, Plattform für den Kurs freischalten, Testschüler + Testlehrkraft. |
| beliebig | `docs/VERTRAG_VORSCHLAG_1.3.md` prüfen und in `frankjuchim/labs` übernehmen (kann eine Claude-Code-Session im labs-Repo erledigen). |

## 4. Offene Punkte (blockieren Phase 1 nicht)

- EH-Original-PDF prüfen: Farbe der Überschriften §7/§8 (Hilfsmittel?), Formen/Unterstreichungen im ER-Beispiel.
- Fachbezogene Hinweise für die Abiturjahrgänge 2027/2028 (Schwerpunkte) beschaffen → ins Projekt legen.
- Lizenz der Materialien festlegen (Vorschlag CC BY-NC-SA 4.0).
- Angaben der Schule für `/datenschutz`.
- Designfragen mit Default in `CLAUDE.md` („Offene Entscheidungen“).

## 5. Was im Repo liegt

| Pfad | Inhalt |
|---|---|
| `CLAUDE.md`, `README.md` | Arbeitsregeln, Überblick, Betrieb |
| `docs/superpowers/specs/` | Spezifikation (E1–E11) |
| `docs/superpowers/plans/` | Roadmap, Plan Phase 1 |
| `docs/DS_PLANUNG.md` | Feinplanung aller DS mit Blueprints für 108 Lab-, 86 Verhör-, 60 Warm-up-Aufgaben, Generalprobe, Klausuren |
| `docs/KOMPETENZMATRIX.md` | DB-K01…K48 × Aufgaben, Fallen- und Abi-Abdeckung |
| `docs/STORY.md` | Story-Bibel (Phantom, Briefings, Schlussplädoyer, Debatte, Escape Room) |
| `docs/DESIGN.md`, `docs/prototyp/` | Design-System, klickbarer Prototyp, Screenshots |
| `docs/VERTRAG_VORSCHLAG_1.3.md` | Änderungsvorschlag für den Verbund-Vertrag |
| `seed/datenbanken/` | 7 Datenbanken (Schema, Pflicht-Datensätze, Varianten, Generator-Vorgaben) + Verhör-/Klausur-Kontexte; alle Schemata und Beispielabfragen maschinell geprüft |
