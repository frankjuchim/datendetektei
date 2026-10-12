# Datendetektei Weserstedt – Kompetenzmatrix

| | |
|---|---|
| **Bezug** | Spec Abschnitt 4 (DB-K01…K48), 5 (P1–P10), 7.5 (Interaktionen), 10 (Zielgrößen), 2.4 (Abi-Befunde) |
| **Quelle der Zuordnungen** | `docs/DS_PLANUNG.md` (Lab-, Verhör-, Warm-up-, Prüfungs-Blueprints); beide Dateien wurden aus demselben Datenmodell erzeugt und per Skript gegengeprüft |
| **Stand** | 2026-10-12 · Phase 0 |

**Erfolgskriterium 1 der Spec:** Jede abiturverbindliche Kompetenz (alle außer Kür K06, K13, K48) ist mindestens einer DS, einer Lab-Aufgabe und einer Prüfungsaufgabe (Verhör, Generalprobe oder Klausur) zugeordnet → Abschnitt 2.

## 1 Kompetenzmatrix DB-K01 … DB-K48

| ID | Kompetenz | Niveau | Einführung DS | Übung (DS) | Lab-Aufgaben-IDs | AB/Abi-Ecke | Warm-up-IDs | Verhör-IDs | Generalprobe-Teil | Klausur-Teil | Video |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **K01** | Aufbau relationaler DB mit Tabelle, Datensatz, Attribut erläutern | gA/eA | 1 | – | A1-E1-01 | AB 1.1/1 | W-A1-01 | A1-V-01 | – | – | 0, 1 |
| **K02** | Primärschlüssel erläutern; Eignung (auch zusammengesetzt, künstlich) begründen/beurteilen | gA/eA | 1, 8 | – | A1-E1-02, A4-E2-01, A4-E2-02, A4-E2-04 | AB 1.1/2, AB 4.2/1, AB 4.2/Abi-Ecke | W-A1-04, W-A4-05, W-A4-06, W-A7-07 | A1-V-02, A4-V-05, A4-V-10, A4-V-11, A7-V-01 | GP-eA-a, GP-gA-a | KL-A-b, NK-A-b | 1, 4 |
| **K03** | Fremdschlüssel erläutern und als Verweis nutzen (auch mit abweichendem Namen) | gA/eA | 3 | 4, 8, K1 | A2-E1-01, A2-E1-03, A2-E1-04, A2-E2-01, A4-E2-07, K1-E1-03 | AB 2.1/3, AB 2.1/Abi-Ecke, AB 5.3/4 | W-A2-04, W-A4-07 | A2-V-01 | GP-eA-a, GP-gA-a | KL-A-a, NK-A-a | 2 |
| **K04** | Kurzschreibweise lesen/notieren (PK unterstrichen, ↑FK) | gA/eA | 3 | 8, 11, K1 | A2-E1-02, A2-E1-04, A4-E2-07, A5-E3-02, K1-E1-01 | AB 2.1/1, AB 2.1/Abi-Ecke, AB 4.2/4, AB 5.3/1 | W-A2-01 | A2-V-02 | GP-eA-d | KL-A-a, KL-B-d, NK-A-a, NK-B-d | 2, 6 |
| **K05** | Kennzeichnungen im Schema erläutern | gA/eA | 3 | – | A2-E1-01, A2-E1-02 | AB 2.1/1, AB 2.1/Abi-Ecke | W-A2-01 | A2-V-02 | GP-eA-a, GP-gA-a | KL-A-a, NK-A-a | 2 |
| **K06** | Referentielle Integrität erläutern | Kür | K1 | – | K1-E1-03 | – | – | – | – | – | – |
| **K07** | Redundanzen identifizieren und beschreiben | gA/eA | 7 | 8 | A4-E1-01, A4-E2-03, A4-E1-CC | AB 4.1/1, AB 4.1/5 | W-A4-01 | A4-V-01, A7-V-11 | GP-eA-b | KL-A-c, KL-BgA-a, NK-A-c | 4 |
| **K08** | Einfüge-, Änderungs-, Löschanomalie nennen und an konkreten Daten erläutern | gA/eA | 7 | – | A4-E1-02, A4-E1-03, A4-E1-04, A4-E1-05, A4-E1-07 | AB 4.1/2, AB 4.1/3, AB 4.1/4, AB 4.1/Abi-Ecke, AB 4.2/Abi-Ecke, AB 5.3/5 | W-A4-02, W-A4-03 | A4-V-02, A4-V-03, A4-V-06, A7-V-02 | GP-eA-b, GP-gA-b | KL-A-c, KL-BgA-b, NK-A-c | 4 |
| **K09** | Gegebenes Schema auf Anomalien untersuchen (auch „keine Anomalie möglich“) | gA/eA | 8 | – | A4-E2-03, A4-E2-05 | AB 4.2/2, AB 4.2/3, AB 4.2/Abi-Ecke | W-A4-08 | A4-V-08, A4-V-09, A7-V-11 | GP-eA-b, GP-gA-b | KL-A-c, NK-A-c | 4 |
| **K10** | Zusammenhang Redundanz ↔ Anomalie erläutern | gA/eA | 7 | – | A4-E1-07 | AB 4.1/5, AB 4.1/Abi-Ecke | W-A4-03 | A4-V-07 | GP-eA-b, GP-gA-b | KL-A-c, NK-A-c | 4 |
| **K11** | Tabelle verlustfrei in ein redundanzfreies Schema zerlegen | eA | 8 | – | A4-E2-06, A4-E2-07, A4-E2-08, A4-E2-CC | AB 4.2/4, AB 4.2/5 | W-A4-07 | A4-V-11 | – | – | 4 |
| **K12** | Redundanzfreiheit eines Schemas begründen | eA | 8 | – | A4-E2-08 | – | – | A4-V-12 | – | – | 4 |
| **K13** | Funktionale/volle/transitive Abhängigkeit; 1.–3. NF als Prüfwerkzeug | Kür | 8 | – | A4-E2-CC | AB 4.2/Cold Case | – | – | – | – | 4 (Hinweis) |
| **K14** | Nicht-atomare Werte erkennen und Folgen für Auswertungen erläutern | gA/eA | 7 | – | A4-E1-06, A4-E1-08 | AB 4.1/Cold Case | W-A4-04 | A4-V-04 | – | KL-BgA-a | 4 |
| **K15** | SELECT … FROM … WHERE, `*`, DISTINCT | gA/eA | 1 | 2, 12 | A1-E1-03, A1-E1-04, A1-E2-02, A1-E2-06, A6-E1-10, A6-E1-12, A6-E1-13, A1-E1-CC | AB 1.1/4, AB 1.1/Abi-Ecke, AB 1.1/Cold Case, AB 1.2/4 | W-A1-03 | A1-V-03, A1-V-10, A7-V-03 | – | KL-A-d | 1 |
| **K16** | Spaltenalias AS, Tabellenalias, qualifizierte Namen | gA/eA | 2, 3 | 4, 11 | A1-E2-05, A2-E1-06, A2-E2-02, A2-E2-05, A2-E2-08, A5-E3-08, A5-E3-CC | AB 2.1/3, AB 2.1/5, AB 2.2/4, AB 2.2/Abi-Ecke | W-A2-03, W-A2-04, W-A2-06, W-A5-12, W-A7-06 | A1-V-09, A2-V-07 | – | KL-A-e, NK-A-e | 1, 2 |
| **K17** | Vergleiche, AND/OR/NOT, Klammersetzung | gA/eA | 1 | 2, 3, 12 | A1-E1-05, A1-E1-06, A1-E1-08, A1-E2-07, A1-E2-08, A2-E1-07, A6-E1-10, A6-E1-13, A6-E1-14, A2-E2-CC | AB 1.1/3, AB 1.1/5, AB 1.1/Abi-Ecke, AB 2.1/Cold Case, AB 2.2/Abi-Ecke | W-A1-02, W-A7-06 | A1-V-03, A1-V-05, A1-V-11, A2-V-06, A2-V-12, A7-V-03 | GP-eA-e, GP-gA-c | – | 1 |
| **K18** | BETWEEN, IN (Werteliste), IS NULL | gA/eA | 2, 4 | 3, 6, 12 | A1-E2-02, A1-E2-03, A1-E2-04, A1-E2-05, A1-E2-07, A1-E2-08, A2-E1-08, A2-E2-06, A2-E2-07, A3-E2-04, A6-E1-09, A2-E1-CC | AB 1.2/2, AB 1.2/3, AB 1.2/Abi-Ecke, AB 2.2/5, AB 2.2/Cold Case | W-A1-06, W-A1-07, W-A1-08, W-A2-07, W-A7-05 | A1-V-04, A1-V-07, A1-V-11, A1-V-12, A2-V-10, A7-V-07 | GP-eA-f, GP-eA-g | KL-A-d, NK-A-d | 1, 2 |
| **K19** | LIKE mit `_` und `%` | gA/eA | 2 | 4 | A1-E2-01, A1-E2-06, A1-E2-07, A2-E2-02, A1-E2-CC, A4-E1-CC | AB 1.2/1 | W-A1-05 | A1-V-06 | – | NK-A-g | 1 |
| **K20** | Berechnungen in Spalten und Bedingungen | gA/eA | 2 | 5 | A1-E2-05, A3-E1-07 | AB 1.2/Cold Case | – | A1-V-09 | – | – | 1 |
| **K21** | ORDER BY ASC/DESC, mehrstufig, auch über Alias/Aggregat | gA/eA | 1 | 5, 6, 12 | A1-E1-04, A1-E1-07, A1-E1-08, A3-E1-08, A3-E2-05, A6-E1-09, A6-E1-12, A1-E1-CC, A3-E2-CC | AB 1.1/4, AB 1.1/5, AB 1.2/Abi-Ecke | W-A1-03, W-A1-08 | A1-V-08, A1-V-10, A3-V-08 | GP-eA-e, GP-gA-c | KL-A-d, KL-A-f | 1 |
| **K22** | LIMIT (Top-n, „die meisten“) | gA/eA | 2, 6 | 4 | A1-E2-05, A2-E2-08, A3-E2-05, A3-E2-CC | – | W-A1-08, W-A3-08 | A1-V-11, A2-V-11, A3-V-08, A7-V-13 | GP-eA-g | KL-A-g, NK-A-f | 1, 3 |
| **K23** | Verbund über 2 Tabellen (implizit, FK = PK) | gA/eA | 3 | 4, 5, 12, K1 | A2-E1-03, A2-E1-05, A2-E1-06, A2-E1-07, A2-E1-08, A2-E2-02, A3-E1-03, A3-E1-05, A6-E1-06, A6-E1-11, K1-E1-04, K1-E1-05, A2-E1-CC, A3-E1-CC | AB 2.1/2, AB 2.1/4, AB 2.1/5, AB 2.1/Cold Case, AB 5.3/4 | W-A2-02, W-A2-03, W-A2-07 | A2-V-03, A2-V-04, A2-V-05, A2-V-06, A2-V-10, A3-V-06, A7-V-04 | GP-eA-e, GP-gA-c | KL-A-f, NK-A-d | 2 |
| **K24** | Verbund über ≥ 3 Tabellen; zwei FKs auf dieselbe Tabelle (Tabellenalias) | gA/eA | 4 | 5, 6, 11, 12 | A2-E2-01, A2-E2-03, A2-E2-04, A2-E2-05, A2-E2-07, A2-E2-08, A3-E1-07, A3-E2-07, A5-E3-08, A6-E1-14, A2-E2-CC, A5-E3-CC | AB 2.2/1, AB 2.2/2, AB 2.2/3, AB 2.2/4, AB 2.2/5, AB 2.2/Abi-Ecke, AB 3.1/Abi-Ecke, AB 3.2/5, AB 5.3/Cold Case, AB 6.1/3 | W-A2-05, W-A2-06, W-A2-08, W-A5-12, W-A7-02 | A2-V-07, A2-V-08, A2-V-09, A2-V-11, A2-V-12, A3-V-11, A7-V-07, A7-V-09, A7-V-13 | GP-eA-f, GP-gA-d | KL-A-e, NK-A-e, NK-A-g | 2 |
| **K25** | Aggregatfunktionen AVG, COUNT, MAX, MIN, SUM (auch ohne GROUP BY) | gA/eA | 5 | 6, 12 | A3-E1-01, A3-E1-02, A3-E1-03, A3-E1-07, A3-E1-08, A3-E2-07, A6-E1-03 | AB 3.1/1, AB 3.1/3, AB 3.1/Abi-Ecke, AB 3.1/Cold Case, AB 3.2/Cold Case | W-A3-01, W-A7-04 | A3-V-01, A3-V-02, A7-V-08 | GP-eA-f | KL-A-f | 3 |
| **K26** | GROUP BY unter Einhaltung der GROUP-BY-Regel | gA/eA | 5 | 6, 9, 12 | A3-E1-04, A3-E1-05, A3-E1-06, A3-E1-07, A3-E1-08, A3-E2-03, A3-E2-04, A3-E2-05, A5-E1-08, A6-E1-03, A6-E1-11, A3-E1-CC, A6-E1-CC | AB 3.1/2, AB 3.1/3, AB 3.1/4, AB 3.1/5, AB 3.1/Abi-Ecke, AB 3.2/3, AB 6.1/3 | W-A3-02, W-A3-03, W-A3-04, W-A7-03 | A3-V-04, A3-V-05, A3-V-06, A3-V-11, A6-V-05, A7-V-05, A7-V-08 | GP-eA-f, GP-gA-d | KL-A-f, NK-A-f | 3 |
| **K27** | HAVING; WHERE und HAVING unterscheiden | gA/eA | 6 | 9, 12 | A3-E2-01, A3-E2-02, A3-E2-03, A3-E2-04, A5-E1-08, A6-E1-04 | AB 3.2/1, AB 3.2/3 | W-A3-05, W-A3-06, W-A6-06, W-A7-01 | A3-V-03, A3-V-07, A6-V-05, A7-V-06, A7-V-09 | GP-eA-f, GP-gA-d | KL-A-f, NK-A-f | 3 |
| **K28** | Gegebene Abfrage analysieren, Information im Sachzusammenhang beschreiben | gA/eA | 6 | – | A3-E2-06, A3-E2-08 | AB 3.2/2, AB 3.2/Abi-Ecke | W-A3-07, W-A7-09 | A3-V-09, A7-V-10 | GP-eA-g, GP-gA-e | KL-A-g, NK-A-g | 3, 7 |
| **K29** | Ergebnis einer Abfrage / Anzahl Datensätze konkret angeben | gA/eA | 1–6 | – | A1-E1-05, A1-E1-07, A2-E1-05, A2-E2-06, A3-E1-04, A3-E2-06, A1-E2-CC | AB 1.1/3, AB 1.2/3, AB 2.1/2, AB 3.1/2 | W-A1-02, W-A2-02, W-A3-03 | A1-V-05, A1-V-08, A2-V-04, A3-V-04, A7-V-05 | – | – | 1, 2, 3 |
| **K30** | Vorgehen zur Beantwortung einer Frage in Worten beschreiben | gA/eA | 6 | – | A3-E2-08 | AB 1.2/5, AB 2.2/1, AB 2.2/Cold Case, AB 3.1/Cold Case, AB 3.2/4 | W-A2-05 | A3-V-12 | – | KL-A-h, NK-A-h | 3, 7 |
| **K31** | Korrektheit einer Abfrage beurteilen / Fehler finden | eA | 6 | – | A3-E2-07 | AB 3.2/5, AB 3.2/Cold Case | W-A7-02 | A3-V-10 | – | – | 3, 7 |
| **K32** | Literale korrekt notieren (Text `'…'`, Datum `'JJJJ-MM-TT'`, Zahl) | gA/eA | 2 | 12 | A1-E2-03, A1-E2-04, A1-E2-07, A1-E2-08, A6-E1-09, A6-E1-12 | AB 1.2/2, AB 1.2/Abi-Ecke | W-A1-07, W-A7-05 | A1-V-07, A1-V-12, A7-V-04 | GP-eA-e | KL-A-d | 1 |
| **K33** | Gegebenes ER-Diagramm im Sachzusammenhang interpretieren | eA | 9 | – | A5-E1-01, A5-E1-02, A5-E1-05 | AB 5.1/1, AB 5.1/3, AB 5.1/Abi-Ecke | W-A5-01, W-A5-05 | A5-V-01, A5-V-02 | – | – | 5 |
| **K34** | Kardinalitäten 1:1, 1:n, n:m bestimmen und begründen (auch aus Daten/Mengendiagrammen) | eA | 9 | – | A5-E1-03, A5-E1-04, A5-E1-05, A5-E1-07, A5-E1-08, A5-E1-CC | AB 5.1/2, AB 5.1/4, AB 5.1/5, AB 5.1/Abi-Ecke, AB 5.1/Cold Case | W-A5-02, W-A5-03 | A5-V-03, A5-V-04, A7-V-12 | – | KL-B-b, NK-B-b | 5 |
| **K35** | ER-Modell aus Anforderungstext entwickeln (Schlüssel und Kardinalitäten vollständig) | eA | 10 | – | A5-E2-07, A5-E2-08 | AB 5.2/1, AB 5.2/2, AB 5.2/5 | W-A5-07 | A5-V-13 | GP-eA-c | KL-B-a, NK-B-a | 5 |
| **K36** | Attribute an Beziehungstypen modellieren | eA | 9 | 10 | A5-E1-06, A5-E1-07, A5-E2-03, A5-E2-05 | AB 5.1/5, AB 5.2/Abi-Ecke | W-A5-04 | A5-V-07, A7-V-14 | GP-eA-c | KL-B-a, NK-B-a | 5 |
| **K37** | Rekursive Beziehungen modellieren | eA | 10 | – | A5-E2-01, A5-E2-03, A5-E2-07, A5-E2-CC | AB 5.2/2, AB 5.2/3, AB 5.2/Abi-Ecke, AB 5.2/Cold Case | W-A5-05 | A5-V-08 | GP-eA-c | KL-B-a, NK-B-a | 5 |
| **K38** | Mehrere Beziehungen zwischen denselben Entitätstypen; ternär m:n:p lesen/ergänzen | eA | 10 | – | A5-E2-02, A5-E2-05, A5-E2-07 | AB 5.2/2, AB 5.2/Cold Case | W-A5-06, W-A5-11 | A5-V-09, A5-V-15 | – | KL-B-a, NK-B-a | 5 |
| **K39** | Gegebenes ER-Modell ergänzen/erweitern | eA | 10 | – | A5-E2-04 | AB 5.2/3, AB 5.2/Abi-Ecke | – | A5-V-09, A7-V-14 | GP-eA-c | – | 5 |
| **K40** | Modellierung beurteilen (Alternativen, Vollständigkeit, Grenzen der Notation) | eA | 10 | – | A5-E2-06, A5-E2-08, A5-E1-CC, A5-E2-CC | AB 5.1/Cold Case, AB 5.2/4 | W-A5-08 | A5-V-10 | – | KL-B-c, NK-B-c | 5 |
| **K41** | ER-Modell in Relationenschema überführen (alle Regeln) | eA | 11 | K1 | A5-E3-01, A5-E3-02, A5-E3-03, A5-E3-04, A5-E3-07, K1-E1-06 | AB 5.3/1, AB 5.3/2, AB 5.3/Abi-Ecke | W-A5-09, W-A5-10, W-A7-08 | A5-V-05, A5-V-06, A5-V-11, A5-V-15, A7-V-15 | GP-eA-d | KL-B-d, NK-B-d | 6 |
| **K42** | Umsetzungsregeln begründen (n:m eigene Tabelle, 1:n nicht) | eA | 11 | – | A5-E3-05, A5-E3-07 | AB 5.3/2, AB 5.3/5, AB 5.3/Abi-Ecke | W-A5-09 | A5-V-12 | GP-eA-d | KL-B-e, NK-B-e | 6 |
| **K43** | Aus Relationenschema das ER-Diagramm rekonstruieren | eA | 11 | – | A5-E3-06 | AB 5.3/3 | W-A5-11 | A5-V-14 | – | KL-B-f, NK-B-f | 6 |
| **K44** | Rechtliche Rahmenbedingungen: informationelle Selbstbestimmung, DSGVO-Grundsätze | gA/eA | 12 | – | A6-E1-01, A6-E1-07, A6-E1-08 | AB 6.1/1, AB 6.1/4, AB 6.1/Abi-Ecke | W-A6-01 | A6-V-01, A6-V-03 | GP-gA-f | KL-B-g, KL-BgA-c, NK-B-g | – |
| **K45** | Prinzipien auf Fälle anwenden; Nutzungen (z. B. Werbung) und deren Voraussetzungen beurteilen | gA/eA | 12 | – | A6-E1-07 | AB 6.1/4, AB 6.1/5, AB 6.1/Abi-Ecke | W-A6-05 | A6-V-04, A6-V-07 | GP-gA-f | KL-B-g, KL-BgA-c, NK-B-g | – |
| **K46** | Chancen/Risiken automatisierter Datenanalyse; Profilbildung, Quasi-Identifikatoren; Datenschutz vs. Datensicherheit, technische Maßnahmen | gA/eA | 12 | – | A6-E1-02, A6-E1-03, A6-E1-04, A6-E1-05, A6-E1-06, A6-E1-08, A6-E1-14, A6-E1-CC | AB 6.1/2, AB 6.1/5, AB 6.1/Cold Case | W-A6-02, W-A6-03, W-A6-04, W-A6-06 | A6-V-02, A6-V-05, A6-V-06, A6-V-08 | GP-gA-f | KL-B-g, KL-BgA-c, KL-BgA-d, NK-B-g | – |
| **K47** | Fachsprache der EH konsequent nutzen (Entitätstyp, Beziehungstyp, Kardinalität, PK/FK) | gA/eA | alle | 1, 9 | A1-E1-01, A5-E1-01 | AB 5.1/1 | W-A1-01, W-A5-01, W-A7-10 | A1-V-01, A5-V-01 | – | KL-B-a, NK-B-a | 5, 6, 7 |
| **K48** | Datenbank im Team planen, umsetzen, dokumentieren | Kür | K1 | – | K1-E1-01, K1-E1-02, K1-E1-06 | – | – | – | – | – | – |

Lesehilfe: AB-Angaben als `AB x.y/Nr.` (Ermittlungsauftrag), `/Abi-Ecke` oder `/Cold Case`. Lab-IDs mit `-CC` sind Cold Cases ohne Punkte. Generalprobe: `GP-eA-*`, `GP-gA-*`; Klausur: `KL-A-*`/`KL-B-*` (eA), `KL-BgA-*` (gA-Teil B), Nachschreibklausur `NK-A-*`/`NK-B-*`.

## 2 Prüfungsabdeckung

Prüfungsaufgabe = Verhör-Aufgabe, Generalprobe-Teil oder Klausur-/Nachschreibklausur-Teil.

- **Kompetenzen ohne Prüfungsaufgabe:** K06, K13, K48

- davon nicht Kür (muss leer sein): **leer ✔**

- Kompetenzen ohne Lab-Aufgabe: **keine ✔**

- Jede Kompetenz hat eine Einführungs-DS (Spalte 4); K06/K48 werden nur in Kür K1, K13 nur in DS 8 als Kür-Zusatz (AB-Cold-Case, Lab-Cold-Case `A4-E2-CC`) behandelt.

## 3 Fallen-Abdeckung P1–P10

| Falle | Kurztitel | # Lab | Lab-Aufgaben | Verhör | Warm-up | Prüfung (Erwartungshorizont) | # trainierend (Lab+Verhör+Warm-up) |
|---|---|---|---|---|---|---|---|
| **P1** | WHERE ↔ HAVING | 6 | A3-E2-01, A3-E2-02, A3-E2-03, A3-E2-04, A5-E1-08, A6-E1-04 | A3-V-03, A3-V-07, A6-V-05, A7-V-06, A7-V-09 | W-A3-05, W-A3-06, W-A6-06, W-A7-01 | GP-eA-f, GP-gA-d, KL-A-f, NK-A-f | 15 |
| **P2** | Verbund fehlt oder vervielfacht | 10 | A2-E1-03, A2-E1-05, A2-E1-07, A2-E2-03, A2-E2-04, A3-E2-07, A6-E1-05, A6-E1-06, A6-E1-11, A6-E1-14 | A2-V-03, A2-V-04, A2-V-05, A2-V-08, A2-V-09, A3-V-10, A6-V-06, A7-V-13 | W-A2-02, W-A2-05, W-A2-08, W-A7-02 | NK-A-e | 22 |
| **P3** | GROUP-BY-Regel | 7 | A3-E1-05, A3-E1-06, A3-E1-07, A3-E1-08, A3-E2-04, A5-E1-08, A6-E1-03 | A3-V-05, A3-V-06, A3-V-11, A7-V-08 | W-A3-02, W-A3-04, W-A7-03 | GP-eA-f, GP-gA-d, KL-A-f, NK-A-f | 14 |
| **P4** | COUNT ↔ SUM | 5 | A3-E1-01, A3-E1-03, A3-E1-04, A3-E1-08, A6-E1-10 | A3-V-02, A3-V-06, A7-V-08 | W-A3-01, W-A7-04 | GP-eA-f, KL-A-f | 10 |
| **P5** | NULL und Literale | 11 | A1-E1-04, A1-E2-02, A1-E2-03, A1-E2-07, A1-E2-08, A2-E1-08, A2-E2-06, A2-E2-07, A6-E1-09, A6-E1-12, A6-E1-13 | A1-V-03, A1-V-04, A1-V-12, A2-V-10, A7-V-03, A7-V-04, A7-V-07 | W-A1-06, W-A1-07, W-A1-08, W-A2-07, W-A7-05 | GP-eA-e, GP-gA-c, KL-A-d, NK-A-d | 23 |
| **P6** | Bedingungslogik | 10 | A1-E1-05, A1-E1-06, A1-E1-08, A1-E2-01, A1-E2-04, A1-E2-05, A1-E2-06, A1-E2-07, A3-E2-05, A4-E1-06 | A1-V-05, A1-V-06, A1-V-07, A1-V-11, A2-V-12, A3-V-08, A4-V-04 | W-A1-02, W-A1-05, W-A1-07, W-A3-08, W-A4-04, W-A7-06 | KL-A-d | 23 |
| **P7** | Mehrdeutig oder falsch benannt | 10 | A2-E1-04, A2-E1-06, A2-E1-07, A2-E2-01, A2-E2-02, A2-E2-03, A2-E2-05, A2-E2-08, A4-E2-07, A5-E3-08 | A2-V-02, A2-V-06, A2-V-07, A2-V-09, A2-V-11, A2-V-12 | W-A2-03, W-A2-04, W-A2-06, W-A5-12, W-A7-06 | GP-eA-e, KL-A-a, KL-A-e, NK-A-a, NK-A-e | 21 |
| **P8** | Schlüssel falsch beurteilt | 5 | A1-E1-02, A4-E2-01, A4-E2-02, A4-E2-04, A4-E2-05 | A1-V-02, A4-V-05, A4-V-09, A4-V-10, A7-V-01 | W-A1-04, W-A4-05, W-A4-06, W-A7-07 | GP-eA-a, GP-gA-a, KL-A-b, NK-A-b | 14 |
| **P9** | ER oder Überführung fehlerhaft | 16 | A5-E1-02, A5-E1-03, A5-E1-04, A5-E1-06, A5-E1-07, A5-E2-01, A5-E2-02, A5-E2-03, A5-E2-04, A5-E2-05, A5-E2-07, A5-E3-01, A5-E3-02, A5-E3-04, A5-E3-06, A5-E3-07 | A5-V-03, A5-V-04, A5-V-05, A5-V-07, A5-V-08, A5-V-09, A5-V-11, A5-V-13, A5-V-14, A5-V-15, A7-V-12, A7-V-14, A7-V-15 | W-A5-02, W-A5-03, W-A5-04, W-A5-05, W-A5-06, W-A5-07, W-A5-09, W-A5-10, W-A5-11, W-A7-08 | GP-eA-c, GP-eA-d, KL-B-a, KL-B-b, KL-B-d, KL-B-e, KL-B-f, NK-B-a, NK-B-b, NK-B-d, NK-B-e, NK-B-f | 39 |
| **P10** | Operator verfehlt | 14 | A3-E2-06, A3-E2-08, A4-E1-03, A4-E1-04, A4-E1-05, A4-E1-07, A4-E1-08, A4-E2-03, A4-E2-08, A5-E1-05, A5-E2-08, A5-E3-05, A6-E1-07, A6-E1-08 | A3-V-09, A3-V-12, A4-V-03, A4-V-06, A4-V-07, A4-V-08, A4-V-12, A5-V-02, A5-V-12, A6-V-04, A6-V-07, A7-V-02, A7-V-10, A7-V-11 | W-A3-07, W-A4-03, W-A4-08, W-A6-05, W-A7-09, W-A7-10 | GP-eA-b, GP-eA-g, GP-gA-b, GP-gA-e, GP-gA-f, KL-A-c, KL-A-g, KL-A-h, KL-B-b, KL-B-c, KL-B-g, KL-BgA-a, KL-BgA-b, KL-BgA-c, KL-BgA-d, NK-A-c, NK-A-g, NK-A-h, NK-B-c, NK-B-g | 34 |

Mindestens 4 Lab-Aufgaben je Falle: **erfüllt ✔**

## 4 Interaktionsarten je Akte (Lab-Aufgaben)

| Akte | `sql` | `zeilen` | `zellen` | `ergebnis` | `schema` | `er` | `zerlegen` | `anomalie` | `kernpunkte` | `gaps` | `choice` | `order` | `lines` | `match` | Σ | # Arten |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Akte 1 | 9 | 1 |  | 1 |  |  |  |  |  | 1 | 2 | 1 | 1 |  | 16 | 7 |
| Akte 2 | 8 | 1 |  | 2 |  |  |  |  |  | 1 | 1 |  | 1 | 2 | 16 | 7 |
| Akte 3 | 9 |  |  | 1 |  |  |  |  | 2 |  | 2 | 1 | 1 |  | 16 | 6 |
| Akte 4 |  |  | 4 |  | 1 |  | 1 | 3 | 3 |  | 4 |  |  |  | 16 | 6 |
| Akte 5 | 2 |  |  |  | 3 | 9 |  |  | 3 |  | 5 |  |  | 2 | 24 | 6 |
| Akte 6 | 9 | 1 |  |  |  |  |  |  | 2 |  | 1 |  |  | 1 | 14 | 5 |
| Kür K1 | 6 |  |  |  |  |  |  |  |  |  |  |  |  |  | 6 | 1 |
| **Summe** | 43 | 3 | 4 | 4 | 4 | 9 | 1 | 3 | 10 | 2 | 15 | 2 | 3 | 5 | 108 |  |

Mindestens 5 Interaktionsarten je Akte: **erfüllt ✔**

**Verhör-Pools:**

| Verhör | Pool | ★/★★/★★★ | Interaktionen | davon gA-tauglich |
|---|---|---|---|---|
| Verhör 1 · Stadtbibliothek (V1) | 12 | 5/5/2 (42/42/17 %) | choice 2, ergebnis 1, lines 1, sql 7, zeilen 1 | 12 |
| Verhör 2 · Bürgerbus (V2) | 12 | 5/5/2 (42/42/17 %) | choice 1, ergebnis 1, lines 1, match 1, sql 7, zeilen 1 | 12 |
| Verhör 3 · Schulkiosk (V3, SQL-Gesamt) | 12 | 5/5/2 (42/42/17 %) | choice 4, ergebnis 1, order 1, sql 6 | 11 |
| Verhör 4 · Musikschule (V4, Rohliste) | 12 | 5/5/2 (42/42/17 %) | anomalie 2, choice 6, zellen 3, zerlegen 1 | 10 |
| Verhör 5 · Kletterhalle (V5, ER) | 15 | 6/6/3 (40/40/20 %) | choice 6, er 5, match 2, schema 2 | 0 |
| Verhör 6 · Fitness-App (V6, Datenschutz, 15') | 8 | 3/3/2 (38/38/25 %) | choice 4, match 2, sql 1, zeilen 1 | 8 |
| Verhör 7 · Mensa (V7, Lab-Generalprobe, 30') | 15 | 6/6/3 (40/40/20 %) | choice 5, er 1, ergebnis 1, schema 1, sql 6, zellen 1 | 12 |

## 5 Stufenmix je Ermittlung (Ziel ≈ 40/40/20)

| Ermittlung | Titel | Aufgaben | ★/★★/★★★ (Anteile) | gA-Sicht: Aufgaben (Mix) |
|---|---|---|---|---|
| A1-E1 | Der erste Auftrag | 8 | 3/3/2 (38/38/25 %) | 8 (3/3/2 (38/38/25 %)) |
| A1-E2 | Das verschwundene Fundstück | 8 | 3/3/2 (38/38/25 %) | 8 (3/3/2 (38/38/25 %)) |
| A2-E1 | Der rote Faden | 8 | 3/3/2 (38/38/25 %) | 8 (3/3/2 (38/38/25 %)) |
| A2-E2 | Nachtfahrten | 8 | 3/3/2 (38/38/25 %) | 8 (3/3/2 (38/38/25 %)) |
| A3-E1 | Kassensturz | 8 | 3/3/2 (38/38/25 %) | 8 (3/3/2 (38/38/25 %)) |
| A3-E2 | Die Statistik lügt nicht | 8 | 3/3/2 (38/38/25 %) | 8 (3/3/2 (38/38/25 %)) |
| A4-E1 | Die Excel-Liste | 8 | 3/3/2 (38/38/25 %) | 8 (3/3/2 (38/38/25 %)) |
| A4-E2 | Ordnung ins Archiv | 8 | 3/3/2 (38/38/25 %) | 5 (3/2/0 (60/40/0 %)) |
| A5-E1 | Baupläne lesen | 8 | 3/3/2 (38/38/25 %) | – |
| A5-E2 | Der Architekturwettbewerb | 8 | 3/3/2 (38/38/25 %) | – |
| A5-E3 | Vom Plan zur Datenbank | 8 | 3/3/2 (38/38/25 %) | – |
| A6-E1 | Das Phantom | 14 | 5/6/3 (36/43/21 %) | 14 (5/6/3 (36/43/21 %)) |
| K1-E1 | Eigene Datenbank bauen | 6 | 2/2/2 (33/33/33 %) | – |
| **Akten 1–6** |  | 102 | 38/39/25 (37/38/25 %) |  |

Hinweise: Jede Ermittlung hat 8 Aufgaben im Mix 3/3/2 (37,5/37,5/25 %) – die nächste ganzzahlige Annäherung an 40/40/20; Akte 6 mit Schlussplädoyer 5/6/3 (14 Aufgaben). Im gA-Kurs reduziert sich A4-E2 auf 5 Aufgaben (3/2/0), weil Zerlegen/Redundanzfreiheit eA sind; die ★★★-Lücke füllt dort Verhör 4 (★★-Ziehung). Kür K1: 2/2/2.

## 6 Abi-Bezugsmatrix

Abituraufgaben-Typen nach Spec 2.4 (Belege aus 19 Klausuren 2021–2026) × Einführung, Lab-Training und Prüfung. Keine Originaltexte – nur Typen und eigene Aufgaben im gleichen Stil (Abi-Kompass verweist auf Jahr/Teilaufgabe).

| Abituraufgaben-Typ | Beleg Abi 2021–26 | Kompetenzen | Einführung DS | Lab in DS | Lab-Aufgaben | Verhör | Generalprobe/Klausur |
|---|---|---|---|---|---|---|---|
| **Anomalien (inkl. „zusammengelegte Tabelle“)** | 18/19 (seit 2023 zusammengelegte Tabelle) | K07, K08, K09, K10 | 7, 8 | 7, 8 | 8: A4-E1-01, A4-E1-02, A4-E1-03, A4-E1-04, A4-E1-05, A4-E1-07, A4-E2-03, A4-E2-05 | 9: A4-V-01, A4-V-02, A4-V-03, A4-V-06, A4-V-07, A4-V-08, A4-V-09, A7-V-02, A7-V-11 | GP-eA-b, GP-gA-b, KL-A-c, KL-BgA-a, KL-BgA-b, NK-A-c |
| **Schlüsseleignung** | 14/19 | K02 | 1, 8 | 1, 8 | 4: A1-E1-02, A4-E2-01, A4-E2-02, A4-E2-04 | 5: A1-V-02, A4-V-05, A4-V-10, A4-V-11, A7-V-01 | GP-eA-a, GP-gA-a, KL-A-b, NK-A-b |
| **Verbund** | 19/19 | K23, K24 | 3, 4 | 3, 4, 5, 6, 11, 12, K1 | 22: A2-E1-03, A2-E1-05, A2-E1-06, A2-E1-07, A2-E1-08, A2-E2-01, A2-E2-02, A2-E2-03, A2-E2-04, A2-E2-05, A2-E2-07, A2-E2-08, A3-E1-03, A3-E1-05, A3-E1-07, A3-E2-07, A5-E3-08, A6-E1-06, A6-E1-11, A6-E1-14, K1-E1-04, K1-E1-05 | 16: A2-V-03, A2-V-04, A2-V-05, A2-V-06, A2-V-07, A2-V-08, A2-V-09, A2-V-10, A2-V-11, A2-V-12, A3-V-06, A3-V-11, A7-V-04, A7-V-07, A7-V-09, A7-V-13 | GP-eA-e, GP-eA-f, GP-gA-c, GP-gA-d, KL-A-e, KL-A-f, NK-A-d, NK-A-e, NK-A-g |
| **GROUP BY / HAVING** | 16/19 | K26, K27 | 5, 6 | 5, 6, 9, 12 | 14: A3-E1-04, A3-E1-05, A3-E1-06, A3-E1-07, A3-E1-08, A3-E2-01, A3-E2-02, A3-E2-03, A3-E2-04, A3-E2-05, A5-E1-08, A6-E1-03, A6-E1-04, A6-E1-11 | 11: A3-V-03, A3-V-04, A3-V-05, A3-V-06, A3-V-07, A3-V-11, A6-V-05, A7-V-05, A7-V-06, A7-V-08, A7-V-09 | GP-eA-f, GP-gA-d, KL-A-f, NK-A-f |
| **Abfrage analysieren** | 14/19 | K28 | 6 | 6 | 2: A3-E2-06, A3-E2-08 | 2: A3-V-09, A7-V-10 | GP-eA-g, GP-gA-e, KL-A-g, NK-A-g |
| **ER ergänzen / entwickeln** | eA 8/9 ergänzen; seit 2025 entwickeln | K35, K39 | 10 | 10 | 3: A5-E2-04, A5-E2-07, A5-E2-08 | 3: A5-V-09, A5-V-13, A7-V-14 | GP-eA-c, KL-B-a, NK-B-a |
| **ER → Schema (Überführung)** | eA E21, E26 | K41, K42 | 11 | 11, K1 | 7: A5-E3-01, A5-E3-02, A5-E3-03, A5-E3-04, A5-E3-05, A5-E3-07, K1-E1-06 | 6: A5-V-05, A5-V-06, A5-V-11, A5-V-12, A5-V-15, A7-V-15 | GP-eA-d, KL-B-d, KL-B-e, NK-B-d, NK-B-e |
| **Schema → ER (Rückrichtung)** | eA E21N, E25N | K43 | 11 | 11 | 1: A5-E3-06 | 1: A5-V-14 | KL-B-f, NK-B-f |
| **Kardinalitäten begründen** | eA E22, E23N, E25 | K34 | 9 | 9 | 5: A5-E1-03, A5-E1-04, A5-E1-05, A5-E1-07, A5-E1-08 | 3: A5-V-03, A5-V-04, A7-V-12 | KL-B-b, NK-B-b |
| **Datenschutz** | G22, G23 (+ KC-Pflicht) | K44, K45, K46 | 12 | 12 | 9: A6-E1-01, A6-E1-02, A6-E1-03, A6-E1-04, A6-E1-05, A6-E1-06, A6-E1-07, A6-E1-08, A6-E1-14 | 8: A6-V-01, A6-V-02, A6-V-03, A6-V-04, A6-V-05, A6-V-06, A6-V-07, A6-V-08 | GP-gA-f, KL-B-g, KL-BgA-c, KL-BgA-d, NK-B-g |
| **Vorgehen in Worten** | seit 2025 (E25N, G25N) | K30 | 6 | 6 | 1: A3-E2-08 | 1: A3-V-12 | KL-A-h, NK-A-h |
| **Top-n / LIMIT** | E22N, E26; Prognose 2027/28 | K22 | 2, 6 | 2, 4, 6 | 3: A1-E2-05, A2-E2-08, A3-E2-05 | 4: A1-V-11, A2-V-11, A3-V-08, A7-V-13 | GP-eA-g, KL-A-g, NK-A-f |
| **Rekursive Beziehung / Self-Join (Prognose)** | neu im EH-Beispiel, noch nie geprüft | K37, K24 | 10, 4 | 4, 5, 6, 10, 11, 12 | 13: A2-E2-01, A2-E2-03, A2-E2-04, A2-E2-05, A2-E2-07, A2-E2-08, A3-E1-07, A3-E2-07, A5-E2-01, A5-E2-03, A5-E2-07, A5-E3-08, A6-E1-14 | 10: A2-V-07, A2-V-08, A2-V-09, A2-V-11, A2-V-12, A3-V-11, A5-V-08, A7-V-07, A7-V-09, A7-V-13 | GP-eA-c, GP-eA-f, GP-gA-d, KL-A-e, KL-B-a, NK-A-e, NK-A-g, NK-B-a |

## 7 Prüfskript

Die Zählungen und Prüfungen dieser Datei wurden mit einem Python-Skript erzeugt (Scratchpad der Planungssitzung, `ds/gen.py`): eindeutige IDs, ID-Formate, gültige Interaktionsarten, bekannte Kompetenz-IDs, AFB-Summen = BE je Prüfungsteil, Prüfungsabdeckung, Fallen ≥ 4 Lab-Aufgaben, ≥ 5 Interaktionsarten je Akte, Stufenmix. Für Phase 7 (Spec 16) übernimmt `scripts/validate.js` diese Prüfungen gegen die echten Akten-JSON.
