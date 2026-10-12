# Eisdiele – Probefall im Gastmodus (`/gast`)

## Zweck und Story

Demo-DB für den **Gastmodus** (Spec 7.12, STORY.md Abschnitt 11): Besucherinnen und Besucher ohne Konto probieren
Konsole, Spurenbrett und Zeitlupe aus. Eigenständiges Mini-Rätsel **ohne Bezug zum Phantom**; nichts wird gespeichert,
**nie** Lab-, AB-, Verhör- oder Klausuraufgaben (Spec 6.4).

Story: Pia Wendland, Inhaberin der Eisdiele Weserstedt im Lindenhof, hat einen Streit zu schlichten: Ihre Aushilfe
schwört, **Stracciatella** sei der Sommerhit, weil sie am häufigsten verkauft wurde – Pia ist sicher, es war **Vanille**.
Dazu will sie wissen, ob sich die neue vegane Sorte **Sanddorn-Mango** lohnt. Auflösung: Beide haben recht – sie zählen
Verschiedenes. Stracciatella hat die meisten *Verkäufe* (COUNT = 12), Vanille die meisten *Kugeln* (SUM = 36).

**Datenquelle:** vollständig kuratiert (kein Generator): `basis.sql` = `schema.sql` + `pflicht.sql` (mit einem kleinen
Werkzeug erzeugt; Verkäufe im festen Wechsel der Sorten auf die Woche verteilt).

## Relationenschema (Kurzschreibweise)

- Sorte(<u>SorteNr</u>, Name, Preis, Vegan)
- Verkauf(<u>VerkaufNr</u>, ↑SorteNr, Datum, Kugeln)

`Preis` = Euro **je Kugel**; `Vegan` ∈ {`'ja'`, `'nein'`}; `Datum` `'JJJJ-MM-TT'` (Woche Mo 2026-07-06 bis So
2026-07-12); `Kugeln` 1–5 je Verkauf.

## ER-Modell (Chen)

Entitätstypen `Sorte` (<u>SorteNr</u>, Name, Preis, Vegan) und `Verkauf` (<u>VerkaufNr</u>, Datum, Kugeln);
Beziehungstyp *betrifft*: Sorte (1) – Verkauf (n) → Fremdschlüssel `SorteNr` in `Verkauf`. (Ein Verkauf umfasst hier
genau eine Sorte; mehrere Sorten in einem Becher wären ein Ausblick auf n:m.)

## Daten im Überblick

| SorteNr | Name | Preis | Vegan | Verkäufe | Kugeln | Umsatz |
|---|---|---|---|---|---|---|
| 1 | Vanille | 1.50 | nein | 10 | **36** | **54.00** |
| 2 | Schokolade | 1.50 | nein | 8 | 16 | 24.00 |
| 3 | Erdbeere | 1.60 | ja | 6 | 11 | 17.60 |
| 4 | Zitrone | 1.40 | ja | 4 | 6 | 8.40 |
| 5 | Haselnuss | 1.70 | nein | 5 | 9 | 15.30 |
| 6 | Sanddorn-Mango | 1.80 | ja | 3 | 5 | 9.00 |
| 7 | Stracciatella | 1.70 | nein | **12** | 18 | 30.60 |
| 8 | Karamell | 1.80 | nein | 5 | 10 | 18.00 |
| 9 | Pistazie | 2.00 | nein | 0 | 0 | – |
| 10 | Schoko-Minze | 1.70 | nein | 4 | 7 | 11.90 |

57 Verkäufe, 67 Zeilen insgesamt. Pistazie wird nie verkauft (leere Gruppe); `LIKE '%Schoko%'` trifft Schokolade und
Schoko-Minze; nur Vanille liegt über 50 € Umsatz; am 2026-07-12 gibt es 8 Verkäufe.

## Eingebaute Fallen (sichtbar gemacht, ohne Punkte)

| Falle | Wo |
|---|---|
| P4 COUNT ↔ SUM | der Streit selbst: Verkäufe zählen vs. Kugeln summieren |
| P2 | `FROM Sorte, Verkauf` ohne Verbundbedingung → 570 Zeilen (Spurenbrett) |
| P1 | „Sorten mit mehr als 50 € Umsatz“ gehört in HAVING |
| Leere Gruppe | Pistazie erscheint in keiner Verbund-Auswertung |

## Randfall-Varianten

entfällt – im Gastmodus wird nicht geprüft (keine Punkte, kein `Prüfen` mit Prüf-DBs).

## Beispielabfragen (= Demo-Fragen 1–6 aus STORY.md 11)

**1. Welche Sorten sind vegan?** – Ergebnis: Erdbeere, Zitrone, Sanddorn-Mango.

```sql
SELECT Name, Preis
FROM Sorte
WHERE Vegan = 'ja'
```

**2. Alle Sorten nach Preis absteigend, bei gleichem Preis alphabetisch** – Ergebnis: 10 Zeilen, beginnend mit Pistazie.

```sql
SELECT Name, Preis
FROM Sorte
ORDER BY Preis DESC, Name ASC
```

**3. Sorten mit „Schoko“ im Namen** – Ergebnis: Schokolade, Schoko-Minze.

```sql
SELECT Name
FROM Sorte
WHERE Name LIKE '%Schoko%'
```

**4. Verkäufe am 2026-07-12** (Verbund) – Ergebnis: 8 Zeilen mit Sorte und Kugeln.

```sql
SELECT Sorte.Name, Verkauf.Kugeln
FROM Sorte, Verkauf
WHERE Sorte.SorteNr = Verkauf.SorteNr
  AND Verkauf.Datum = '2026-07-12'
```

**5. Wie oft wurde jede Sorte verkauft, und wie viele Kugeln waren es?** (COUNT vs. SUM) – Ergebnis: 9 Zeilen;
Stracciatella 12 Verkäufe / 18 Kugeln, Vanille 10 Verkäufe / 36 Kugeln.

```sql
SELECT Sorte.SorteNr, Sorte.Name, COUNT(*) AS Verkaeufe, SUM(Verkauf.Kugeln) AS Kugeln
FROM Sorte, Verkauf
WHERE Sorte.SorteNr = Verkauf.SorteNr
GROUP BY Sorte.SorteNr, Sorte.Name
ORDER BY Verkaeufe DESC
```

**6. Sorten mit mehr als 50 € Umsatz** (Berechnung, HAVING) – Ergebnis: nur Vanille (54.0).

```sql
SELECT Sorte.SorteNr, Sorte.Name, SUM(Verkauf.Kugeln * Sorte.Preis) AS Umsatz
FROM Sorte, Verkauf
WHERE Sorte.SorteNr = Verkauf.SorteNr
GROUP BY Sorte.SorteNr, Sorte.Name
HAVING SUM(Verkauf.Kugeln * Sorte.Preis) > 50
```

## Abnahme-Prüfungen

| Prüfung | Erwartung |
|---|---|
| Zeilen | Sorte 10, Verkauf 57 |
| meiste Verkäufe (COUNT) | genau Stracciatella (12), kein Gleichstand |
| meiste Kugeln (SUM) | genau Vanille (36), kein Gleichstand |
| Umsatz > 50 € | genau Vanille; mindestens eine Sorte darunter |
| `SELECT COUNT(*) FROM Verkauf WHERE SorteNr = 9` | 0 |
| `SELECT COUNT(*) FROM Verkauf WHERE Datum = '2026-07-12'` | ≥ 5 |
