# ADR-003: Einzelnes Calculation-Composable

## Status
Accepted

## Kontext
Die Nährstoffberechnung muss identisch online und offline funktionieren. Es gibt verschiedene Berechnungsstufen (Stufe 1: Grundbedarf, Stufe 2: mit Korrekturen, Stufe 3: mit Nmin). Die Logik soll testbar und wartbar sein.

## Entscheidung
Die gesamte Berechnungslogik liegt in einem einzigen Composable: **`useNutrientCalculation.ts`**.

## Begründung
- Single Source of Truth für alle Berechnungen
- Gleiche Logik für Online- und Offline-Betrieb
- Einfach unit-testbar (reiner Input → Output, keine Seiteneffekte)
- Berechnungsstufen werden inkrementell in derselben Datei ergänzt
- Composable-Pattern passt zum Vue 3 Composition API-Stil

## Konsequenzen
- Keine Berechnungslogik in Komponenten, Services oder Stores
- Composable erhält Daten als Parameter (nicht per API-Call)
- Services liefern die Rohdaten, Composable berechnet das Ergebnis
- Tests decken alle Berechnungsstufen und Grenzfälle ab
