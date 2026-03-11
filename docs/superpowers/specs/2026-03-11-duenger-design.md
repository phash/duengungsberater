# Düngungsberater — Design Spec

**Datum:** 2026-03-11
**Status:** Approved

---

## Überblick

Interaktive PWA, die professionelle Landwirte (Betriebe 1–500+ ha) bei der Düngeplanung unterstützt. Der Landwirt legt Felder und Anbauplanung an, die App berechnet den Nährstoffbedarf nach LfL-Basisdaten und empfiehlt konkrete Düngerprodukte mit Affiliate-Links.

**Monetarisierung:** Affiliate-Links zu Dünger-Shop.de (15% Commission, 90 Tage, via adseed GmbH) und myAGRAR.

---

## Tech Stack

| Schicht | Technologie |
|---|---|
| Frontend | Vue 3 + Vite |
| PWA / Offline | vite-plugin-pwa (Workbox Service Worker) |
| Lokaler Cache | Dexie.js (IndexedDB-Wrapper) |
| Backend / Auth / DB | Supabase (PostgreSQL + Row Level Security) |
| UI | Tailwind CSS |
| Sprache | Deutsch (de-DE) |

---

## App-Bereiche

### Landwirt-App (PWA, mobil-first)

1. **Auth** — Registrierung, Login (Supabase Auth)
2. **Felder** — Felder anlegen mit Name und Größe (ha); später erweiterbar um Bodentyp und Nmin-Werte
3. **Anbauplanung** — Kultur pro Feld und Saison auswählen, erwarteten Ertrag eingeben (Standardwert vorausgefüllt), optionale Korrekturfaktoren (Vorfrucht, Zwischenfrucht, Humusgehalt)
4. **Düngeempfehlung** — Nährstoffbedarf berechnen, benötigte Produktmengen, Affiliate-Links
5. **Eigene Nährstoffwerte** — User kann berechnete Werte überschreiben oder eigene Nährstofftypen (S, Ca, B, …) anlegen

### Admin-Bereich (rollenbasiert, nur online)

- Kulturen verwalten (Anbausaison, Referenzertrag)
- Nährstoffwerte pflegen (LfL-Tabellen 9a, 1a, 9f, 5a)
- Korrekturfaktoren verwalten (Vorfrucht, Zwischenfrucht, Humus)
- Mineraldünger-Produkte und Affiliate-Links pflegen

---

## Offline-Verhalten

| Funktion | Offline verfügbar |
|---|---|
| Feldliste anzeigen | ✓ (IndexedDB) |
| Anbauplanung anlegen | ✓ (IndexedDB, sync bei Verbindung) |
| Nährstoffberechnung | ✓ (gecachte Kulturdaten + Logik) |
| Produktempfehlungen | ✓ (gecachte Produkte, ohne aktuelle Preise) |
| Admin-Bereich | ✗ (nur online) |

Beim Login werden `crops`, `nutrient_types`, `crop_nutrient_demands`, `n_corrections` und `fertilizer_products` in IndexedDB gecacht. Offline erstellte Pläne und Berechnungen werden beim nächsten Verbindungsaufbau in Supabase synchronisiert.

---

## Berechnungslogik (Stickstoff, nach LfL)

```
N_empfehlung = N_Bedarfswert (Tab. 9a)
             ± (actual_yield - ref_yield) / yield_diff × correction_per_dt
             − Nmin_gemessen (0–90 cm, wenn vorhanden)
             − Vorfrucht_Abschlag (Tab. 9f)
             − Zwischenfrucht_Abschlag (Tab. 9f)
             − Humus_Abschlag (Tab. 9f, wenn Humus > 4%)
```

P₂O₅ und K₂O: Bilanzberechnung über Nährstoffentzug (kg/dt × erwarteter Ertrag) aus Tab. 1a.
Weitere Nährstoffe (S, MgO, Ca, …): gleiche Logik, sofern Werte in `crop_nutrient_demands` vorhanden.

**Ausbaustufen:**
- **Stufe 1 (MVP — initialer Lieferumfang):** Kultur + Feldgröße → Standardempfehlung
- **Stufe 2 (Folge-Iteration):** + Vorfrucht, Zwischenfrucht, Humusgehalt
- **Stufe 3 (Folge-Iteration):** + Nmin-Messwerte aus Bodenanalyse, Bodentyp

---

## Datenmodell (Supabase)

### Admin-pflegbare Stammdaten

**`nutrient_types`** — Nährstofftypen
`id, code (N/P2O5/K2O/S/MgO/…), label_de, unit, sort_order, is_system`

**`crops`** — Kulturen
`id, name_de, category, sow_month_from/to, harvest_month_from/to, ref_yield_dt_ha, nmin_depth_cm`

**`crop_nutrient_demands`** — Nährstoffbedarf pro Kultur
`id, crop_id, nutrient_type_id, demand_kg_ha, ref_yield_dt_ha, per_yield_correction, source (lfl|user|import_xyz), user_id (null = global), valid_from`

User-Werte (source: user) haben Vorrang vor LfL-Werten bei gleicher crop+nutrient-Kombination.

**`n_corrections`** — Korrekturfaktoren
`id, type (vorfrucht|zwischenfrucht|humus), label_de, correction_kg_n`

**`fertilizer_products`** — Mineraldünger mit Affiliate-Links
`id, name, n_pct, p2o5_pct, k2o_pct, mgo_pct, s_pct, form (mineral|organic), affiliate_url, shop_name, active`
+ many-to-many zu `crops`

### Landwirt-Daten

**`fields`** — Felder
`id, user_id, name, size_ha, synced, created_at, updated_at` + später: `soil_type, nmin_0_30, nmin_30_60, nmin_60_90`

**`field_crop_plans`** — Anbauplanung
`id, field_id, crop_id, season_year, expected_yield_dt_ha, vorfrucht_correction_id, zwischenfrucht_correction_id, humus_over_4pct, nmin_measured, synced, created_at, updated_at`

**`recommendations`** — Berechnungsergebnisse
`id, field_crop_plan_id, calculated_at, calculated_offline`

**`recommendation_values`** — Werte pro Nährstoff
`id, recommendation_id, nutrient_type_id, value_kg_ha, value_kg_total, source_used`

---

## Datenbasis: LfL Bayern

Initiale Befüllung aus den LfL-Basisdaten 2025/2026 (gültig bis Nov. 2024):

| LfL-Tabelle | Inhalt | Zieltabelle |
|---|---|---|
| Tab. 1a | Nährstoffgehalte Hauptfrüchte (N, P₂O₅, K₂O, MgO, S in kg/dt FM) | `crop_nutrient_demands` |
| Tab. 9a | N-Bedarfswerte Hauptfrüchte (130+ Kulturen) | `crop_nutrient_demands` |
| Tab. 9c | N-Bedarfswerte Gemüse (75+ Kulturen) | `crop_nutrient_demands` |
| Tab. 9f | Korrekturfaktoren (Vorfrucht, Humus, Zwischenfrucht) | `n_corrections` |
| Tab. 5a | Wirtschaftsdünger-Nährstoffgehalte (~40 Typen) | `fertilizer_products` |

Quelle: `https://www.lfl.bayern.de/basisdaten`
Der STMELF NPK-Portal (`stmelf.bayern.de/npk/portal`) ist ein Login-gebundenes Berechnungstool auf Basis derselben LfL-Tabellen — kein separater Datenimport nötig.

---

## Monetarisierung

- **Dünger-Shop.de**: Affiliate-Programm via adseed GmbH, 15% Pay-per-Sale, 90 Tage Cookie. Kontakt: duengershop@adseed.de
- **myAGRAR** (myagrar.de): Kein öffentliches Affiliate-Programm — direkter Kontakt empfohlen
- Affiliate-Links werden nur auf der Empfehlungsseite eingeblendet, klar als Shop-Links gekennzeichnet

---

## Screens (MVP)

1. Login / Registrierung
2. Felder-Übersicht (Liste mit Status-Badge)
3. Feld anlegen / bearbeiten
4. Anbauplanung (Kultur, Ertrag, Korrekturen)
5. Düngeempfehlung (N/P/K + weitere Nährstoffe, Produktliste)
6. Profil (eigene Nährstofftypen + Werte verwalten)
7. Admin: Kulturen, Nährstoffwerte, Produkte, Korrekturfaktoren

---

## Nicht im MVP

- PDF-Export der Empfehlung
- Kartendarstellung der Felder
- Bodenanalyse-Import (Nmin automatisch)
- Mehrsprachigkeit
- Push-Benachrichtigungen (z.B. Düngezeitfenster)
- Betriebsvergleich / Statistiken
