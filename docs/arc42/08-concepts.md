# 8. Querschnittliche Konzepte

## Offline-Strategie

- **Service Worker:** vite-plugin-pwa (Workbox) cached App-Shell und statische Assets
- **Datencache:** Beim Login werden Stammdaten (Kulturen, Nährstoffbedarfe, Korrekturfaktoren, Produkte) in IndexedDB (Dexie.js) gecacht
- **Offline-Schreiboperationen:** Felder und Anbauplanungen werden lokal mit `synced: false` gespeichert
- **Sync:** Beim `online`-Event werden ungesyncte Datensätze an Supabase gesendet und als `synced: true` markiert

## Berechnungslogik

Die gesamte Nährstoffberechnung liegt in `useNutrientCalculation.ts`. Dieselbe Logik wird online wie offline verwendet.

**Stufe 1 (Grundberechnung):**
```
empfehlung_kg_ha = demand_kg_ha + (expected_yield - ref_yield) × per_yield_correction
empfehlung_kg_total = empfehlung_kg_ha × field_size_ha
```

**Stufe 2 (Korrekturfaktoren — implementiert):**
```
empfehlung_kg_ha = Math.max(0,
    demand_kg_ha
  + (expected_yield - ref_yield) × per_yield_correction
  + Σ correction_values  -- Vorfrucht, Zwischenfrucht, Humus
)
```
Korrekturfaktoren sind nährstoffbezogen (aktuell nur N) und werden über die normalisierten Tabellen `corrections` + `correction_values` verwaltet. Die Berechnung erzeugt optional ein `breakdown`-Objekt für die Detailanzeige.

**Stufe 3 (spätere Iteration):**
```
N_empfehlung = Stufe 2
             − Nmin-Messwert (0–90 cm)
```

### Produkt-Matching

Für jeden berechneten Nährstoffbedarf wird das Produkt mit dem höchsten %-Anteil des jeweiligen Nährstoffs empfohlen:

```
produkt_menge_kg_ha = empfehlung_kg_ha / (produkt_nährstoff_pct / 100)
```

### Offline-Berechnung

Die Berechnung läuft identisch online wie offline. Einziger Unterschied: `calculated_offline: true` wird in der Empfehlung gespeichert. Alle benötigten Daten (Kulturen, Nährstoffwerte, Produkte) werden aus IndexedDB geladen (Fallback auf `src/constants/` Seed-Daten).

## Zahlenformate

- **Locale:** `de-DE` (deutsches Komma als Dezimaltrennzeichen, Punkt als Tausendertrenner)
- **Einheit immer anzeigen:** z.B. `220 kg N/ha`, `12,5 ha`
- **Formatierung:** `useNumberFormat` Composable mit `Intl.NumberFormat`

## Authentifizierung

- **Supabase Auth:** E-Mail + Passwort (MVP)
- **Row Level Security (RLS):** Jeder Landwirt sieht nur eigene Daten
- **Admin-Rolle:** Über Supabase-Metadaten (`role: 'admin'`), Zugriff auf Stammdaten-Pflege
- **Offline:** Auth-Token wird im LocalStorage gespeichert, Offline-Nutzung ohne erneuten Login möglich

## Nährstoffsystem

- **Flexibel:** Nährstofftypen werden über `nutrient_types`-Tabelle definiert, nicht hardcoded
- **Erweiterbar:** Neue Nährstoffe (Ca, B, Mn, ...) können über Admin-Bereich hinzugefügt werden
- **User-Überschreibung:** `source: 'user'` hat Vorrang vor `source: 'lfl'` bei gleicher Kultur+Nährstoff-Kombination

## PWA / Service Worker

- `vite-plugin-pwa` mit `autoUpdate`-Strategie
- Workbox cached App-Shell (JS, CSS, HTML, SVG, Fonts)
- Supabase-API-Aufrufe werden via `NetworkFirst`-Strategie gecacht (1 Tag TTL)
- Manifest: `Düngungsberater` als standalone-App installierbar
- Theme-Color: `#15803d` (Grün, passend zum Agrar-Kontext)
