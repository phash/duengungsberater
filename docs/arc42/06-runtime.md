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

## Auth-Flow

```
User → LoginView → AuthStore.login() → AuthService.signIn() → Supabase Auth
  ← Session + userId
  → Router: redirect /felder

User → beliebige Route (requiresAuth)
  → Router beforeEach: AuthStore.isAuthenticated?
    nein → redirect /login
    ja → Route rendern

Admin-Route:
  → Router beforeEach: AuthStore.isAdminUser?
    nein → redirect /felder
    ja → AdminView rendern
```

## Navigation

- **Mobile (< 640px):** BottomNav mit Felder, Profil, [Admin]
- **Desktop (≥ 640px):** BottomNav ist `sm:hidden`, Navigation erfolgt über Header-Links (noch nicht implementiert, Placeholder für spätere Erweiterung)
- **Zurück-Button:** AppLayout rendert conditionalen Zurück-Button wenn `showBack` Prop gesetzt
- **Kein separater "Planung"-Tab:** Anbauplanung wird über Felder → Feld → Planung navigiert (kein Top-Level-Route im MVP)
