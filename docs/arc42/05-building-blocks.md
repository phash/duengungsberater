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
| EmpfehlungView | `/felder/:id/planung/:planId/empfehlung` | Düngeempfehlung mit Produkten |
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
