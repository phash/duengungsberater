# 6. Laufzeitsicht

## Szenario 1: Düngeempfehlung berechnen (Online)

```
Landwirt          FelderView      AnbauplanungView    useNutrientCalculation    Supabase
   │                  │                  │                      │                   │
   │─ Feld wählen ───▶│                  │                      │                   │
   │                  │─ navigiere ──────▶│                      │                   │
   │                  │                  │─ Kultur + Ertrag ────▶│                   │
   │                  │                  │                      │─ Demand laden ────▶│
   │                  │                  │                      │◀─ Demands ────────│
   │                  │                  │◀── Empfehlung ───────│                   │
   │                  │                  │─ Speichern ──────────────────────────────▶│
   │◀──────────────── Ergebnis anzeigen ─│                      │                   │
```

## Szenario 2: Offline-Berechnung

```
Landwirt          FelderView      AnbauplanungView    useNutrientCalculation    Dexie (IndexedDB)
   │                  │                  │                      │                      │
   │─ Feld wählen ───▶│                  │                      │                      │
   │                  │─ navigiere ──────▶│                      │                      │
   │                  │                  │─ Kultur + Ertrag ────▶│                      │
   │                  │                  │                      │─ Demand laden ───────▶│
   │                  │                  │                      │◀─ gecachte Demands ──│
   │                  │                  │◀── Empfehlung ───────│                      │
   │                  │                  │─ lokal speichern (synced=false) ────────────▶│
   │◀──────────────── Ergebnis anzeigen ─│                      │                      │
```

## Szenario 3: Offline-Sync beim Verbindungsaufbau

Details werden in einer späteren Iteration dokumentiert, sobald `useOfflineSync` implementiert ist.
