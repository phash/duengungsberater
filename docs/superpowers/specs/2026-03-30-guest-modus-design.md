# Guest-Modus: Rechner ohne Login — Design Spec

**Datum:** 2026-03-30
**Ziel:** Der Düngerechner ist ohne Login nutzbar. Login wird nur für Speichern (Supabase-Sync), iBalis-Verbindung und benutzerdefinierte Nährstoffwerte benötigt.

---

## Architektur

### Guest-ID-Konzept

Der Auth Store bekommt ein `isGuest`-Konzept:

- Bei App-Start: Supabase-Session prüfen (wie bisher)
- Wenn **keine Session** → automatisch Guest-ID generieren (`guest-<uuid>`, in `localStorage`)
- Guest-ID wird als `userId` im Store gesetzt, `isGuest = true`
- Alle Views/Services, die `auth.userId` nutzen, funktionieren weiter
- Guest-Daten landen **nur in Dexie** (IndexedDB), nie in Supabase
- Bei Login → Guest-ID wird durch echte User-ID ersetzt, lokale Daten werden migriert

### Was Guests können

| Feature | Guest | Registriert |
|---------|-------|-------------|
| Felder anlegen (lokal) | ja | ja + Sync |
| Shapefile/GeoPackage Import | ja | ja |
| Anbauplanung erstellen | ja | ja + Sync |
| Empfehlung berechnen | ja | ja |
| Nährstoffwerte anzeigen | ja (LfL-Basis) | ja + eigene Werte |
| Eigene Nährstoffwerte überschreiben | nein → Login-Prompt | ja |
| iBalis verbinden | nein → Login-Prompt | ja |
| Profil / Passwort | nein | ja |
| Admin-Bereich | nein | ja (Admin) |
| Daten in Cloud speichern | nein → Login-Prompt | ja |
| Daten bleiben nach Browser-Reset | nein | ja |

### Betroffene Dateien

| Datei | Änderung |
|-------|----------|
| `src/stores/auth.store.ts` | Guest-ID, `isGuest` computed, `initGuest()` |
| `src/router/index.ts` | `requiresAuth` entfernen für Rechner-Routen, neues `requiresAccount` |
| `src/views/FieldsView.vue` | iBalis-Connect hinter Login-Prompt |
| `src/views/NutrientValuesView.vue` | Custom-Werte hinter Login-Prompt |
| `src/services/field.service.ts` | Guest → nur Dexie, kein Supabase |
| `src/services/crop-plan.service.ts` | Guest → nur Dexie |
| `src/services/sync.service.ts` | `syncAll()` nur wenn `!isGuest` |
| `src/components/AppLayout.vue` | "Anmelden"-Button statt Profil für Guests |
| `src/components/BottomNav.vue` | Profil-Link → Login für Guests |
| `src/main.ts` | Sync nur für registrierte User |
| `src/components/GuestBanner.vue` | **NEU:** "Registrieren um zu speichern"-Banner |

### Route-Änderungen

```
/felder                          → requiresAuth: false (Guest OK)
/felder/:fieldId/planung         → requiresAuth: false (Guest OK)
/felder/:id/planung/:id/empfehlung → requiresAuth: false (Guest OK)
/profil                          → requiresAuth: true (nur registriert)
/profil/werte                    → requiresAuth: true (nur registriert)
/admin                           → requiresAuth: true + requiresAdmin
```

### Guest-Banner

Kompakte Info-Leiste oben in den Rechner-Views:
> "Du nutzt den Rechner als Gast. [Registrieren](/login) um Daten dauerhaft zu speichern."

Nur anzeigen wenn `isGuest`. Dismissbar pro Session (sessionStorage).

### Landing Page

- Authenticated User → Redirect zu `/felder` (wie bisher)
- Guest/Nicht-Auth → Landing Page bleibt sichtbar
- CTA-Buttons ändern sich:
  - "Jetzt starten" → `/felder` (direkt, kein Login nötig)
  - "Anmelden" Header-Button bleibt

### Matomo Tracking

Tracking-Events für anonyme Nutzung (über globalen `_paq`):

```typescript
// In den Views, bei relevanten Aktionen:
window._paq?.push(['trackEvent', 'Calculator', 'field-created', isGuest ? 'guest' : 'user'])
window._paq?.push(['trackEvent', 'Calculator', 'recommendation-calculated', isGuest ? 'guest' : 'user'])
window._paq?.push(['trackEvent', 'Calculator', 'shapefile-imported', isGuest ? 'guest' : 'user'])
```

### Service-Guards

Alle Services die Supabase aufrufen prüfen `isGuest`:

```typescript
// Pattern für alle CRUD-Services:
if (auth.isGuest) {
  // Nur Dexie (lokal)
  return db.fields.where('user_id').equals(userId).toArray()
}
// Supabase + Dexie-Cache (wie bisher)
```

### Daten-Migration bei Registrierung

Wenn ein Guest sich registriert:
1. Alle Dexie-Einträge mit `user_id = guest-xxx` → `user_id = echte-id` updaten
2. `synced = false` setzen
3. `syncAll()` triggern → Daten wandern zu Supabase

---

## Nicht im Scope

- Automatische Guest-Session-Ablauf (Daten bleiben bis Browser-Clear)
- Guest-zu-Guest Transfer
- Server-seitige Guest-Datenspeicherung
