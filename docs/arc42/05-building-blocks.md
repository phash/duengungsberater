# 5. Bausteinsicht

## Ebene 1: Gesamtübersicht

```
src/
  views/          → Route-Level-Komponenten (koordinieren Composables + Components)
  components/     → Rein visuelle Komponenten (kein direkter API-/Store-Zugriff)
  composables/    → Business-Logik (use*.ts) — Berechnungslogik lebt hier
  services/       → Alle Supabase-Aufrufe — kein direkter Supabase-Zugriff außerhalb
  stores/         → Pinia: Auth-State, Offline-Cache-Status
  constants/      → LfL-Referenzwerte und App-Konstanten
  types/          → Gemeinsame TypeScript-Typen
```

## Views

| View | Route | Beschreibung |
|---|---|---|
| FelderView | `/felder` | Feldliste mit Anlegen/Bearbeiten |
| AnbauplanungView | `/felder/:id/planung` | Anbauplanung pro Feld |
| EmpfehlungView | `/felder/:id/planung/:planId/empfehlung` | Düngeempfehlung mit Korrekturfaktoren, Breakdown und Produkten |
| LoginView | `/login` | Registrierung und Login |
| ProfileView | `/profil` | Eigene Nährstoffwerte verwalten |
| AdminView | `/admin/*` | Admin-Bereich (nur online, rollenbasiert) |

## Composables

| Composable | Verantwortung |
|---|---|
| useNutrientCalculation | Kernberechnungslogik: Nährstoffbedarf aus Kultur + Ertrag + Korrekturen |
| useNumberFormat | Deutsche Zahlenformatierung (Komma, Tausenderpunkt, Einheiten) |
| useOfflineSync | Synchronisierung von Offline-Daten beim Verbindungsaufbau |

## Services

| Service | Verantwortung |
|---|---|
| supabase.ts | Supabase-Client-Initialisierung |
| fieldService | CRUD-Operationen für Felder |
| cropService | Lesezugriff auf Kulturen und Nährstoffbedarfe |
| recommendationService | Speichern und Laden von Empfehlungen |
| fertilizerService | Lesezugriff auf Düngerprodukte |

## Stores (Pinia)

| Store | Verantwortung |
|---|---|
| authStore | Authentifizierungs-State (User, Session, Login/Logout) |
| offlineStore | Online/Offline-Status, Sync-Queue-Zähler |

## Ebene 2: Service-Layer

| Service | Verantwortung | Offline-Verhalten |
|---|---|---|
| `auth.service` | Supabase Auth (Login, Register, Logout) | Nicht offline-fähig |
| `field.service` | CRUD Felder (inkl. Nmin-Bodenproben) | Liest/schreibt Dexie, synced online |
| `field-crop-plan.service` | CRUD Anbauplanungen | Liest/schreibt Dexie, synced online |
| `crop.service` | Kulturen lesen + Admin-CRUD | Offline: Dexie → Constants Fallback |
| `nutrient.service` | Nährstofftypen + Demands | Offline: Dexie → Constants Fallback |
| `product.service` | Düngerprodukte + Admin-CRUD | Offline: Dexie → Constants Fallback |
| `correction.service` | Korrekturfaktoren lesen + Admin-CRUD | Offline: Dexie → Constants Fallback |
| `recommendation.service` | Empfehlungen speichern/laden | Offline: Dexie mit `calculated_offline` |
| `sync.service` | Offline → Supabase Sync | Nur online aktiv |

Alle Services lesen/schreiben parallel in Supabase und Dexie (IndexedDB). Bei Offline-Betrieb wird ausschließlich Dexie verwendet. Stammdaten-Services fallen auf die `src/constants/` Seed-Daten zurück, wenn Dexie leer ist.

## Admin-Bereich

| Baustein | Datei | Verantwortung |
|---|---|---|
| AdminCropList/Form | `src/components/AdminCrop*.vue` | CRUD für Kulturen |
| AdminNutrientList/Form | `src/components/AdminNutrient*.vue` | CRUD für Nährstoffwerte |
| AdminProductList/Form | `src/components/AdminProduct*.vue` | CRUD für Düngerprodukte |
| AdminCorrectionList/Form | `src/components/AdminCorrection*.vue` | CRUD für Korrekturfaktoren (Vorfrucht, Zwischenfrucht, Humus) |
| AdminView | `src/views/AdminView.vue` | Tab-basiertes Dashboard (4 Tabs), orchestriert alle Admin-CRUD-Komponenten |

## Profil

| Baustein | Datei | Verantwortung |
|---|---|---|
| ProfileView | `src/views/ProfileView.vue` | User-Info, Logout, App-Version |
