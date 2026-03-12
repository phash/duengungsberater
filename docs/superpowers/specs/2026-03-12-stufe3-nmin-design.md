# Stufe 3: Nmin-Messwerte — Design Spec

## Ziel

Nmin-Bodenproben-Werte (0-30, 30-60, 60-90 cm) als Feld-Eigenschaft erfassen und in die N-Bedarfsberechnung als Abzug einbeziehen. Die Eingabe erfolgt wahlweise als 3 Tiefenschichten oder als Gesamtwert.

## Scope

**In Scope:**
- 3 neue nullable Spalten auf `fields` (nmin_0_30, nmin_30_60, nmin_60_90)
- Nmin-Eingabe in FieldForm (collapsible, Toggle Tiefenschichten vs. Gesamtwert)
- Nmin-Abzug in der Berechnungslogik (nur N, nicht P/K/etc.)
- Nmin-Zeile im Breakdown
- Nmin-Info-Badge in RecommendationView
- Kulturspezifische Tiefensummierung (crop.nmin_depth_cm: 0/60/90)

**Nicht in Scope:**
- Bodentyp / Bodenart
- Nmin-Proben-Historisierung (eigene Tabelle)
- Moor-Böden
- Automatischer Bodenanalyse-Import

## Datenmodell

### Migration 003

```sql
ALTER TABLE public.fields
  ADD COLUMN nmin_0_30 numeric,
  ADD COLUMN nmin_30_60 numeric,
  ADD COLUMN nmin_60_90 numeric;
```

Keine CHECK-Constraints — 0 ist ein valider Messwert, NULL bedeutet "nicht gemessen". Keine neuen Tabellen.

**Hinweis zur Abweichung vom Original-Spec:** Der ursprüngliche Design-Spec (`2026-03-11-duenger-design.md`) hatte `nmin_measured` als einzelnen Wert auf `FieldCropPlan`. Stufe 3 legt die Nmin-Werte stattdessen auf `Field`, weil Bodenproben eine Feld-Eigenschaft sind (unabhängig von der Anbauplanung). Der Kommentar `// Stufe 3: nmin_measured` auf `FieldCropPlan` in `src/types/index.ts` wird entfernt, ebenso `// Stufe 3: soil_type, nmin_0_30, ...` auf `Field` (wird durch echte Felder ersetzt).

### TypeScript

Extend `Field` in `src/types/index.ts`:

```typescript
export interface Field {
  id: string
  user_id: string
  name: string
  size_ha: number
  nmin_0_30: number | null
  nmin_30_60: number | null
  nmin_60_90: number | null
  synced: boolean
  created_at: string
  updated_at: string
}
```

Entferne `// Stufe 3: nmin_measured` Kommentar auf `FieldCropPlan` und `// Stufe 3: soil_type, ...` Kommentar auf `Field`.

### Field Service

`createField` und `updateField` in `field.service.ts` erweitern:

```typescript
// createField: Pick erweitern
export async function createField(
  field: Pick<Field, 'name' | 'size_ha' | 'nmin_0_30' | 'nmin_30_60' | 'nmin_60_90' | 'user_id'>,
): Promise<Field>

// updateField: Pick erweitern
export async function updateField(
  id: string,
  updates: Partial<Pick<Field, 'name' | 'size_ha' | 'nmin_0_30' | 'nmin_30_60' | 'nmin_60_90'>>,
): Promise<Field>
```

Die `offlineField`-Konstruktion in `createField` muss `nmin_0_30: field.nmin_0_30 ?? null` etc. setzen (default null bei fehlendem Wert).

### FieldForm Emit

Das Save-Event Payload wird erweitert:

```typescript
// Vorher:
emit('save', { name: string; size_ha: number })

// Nachher:
emit('save', {
  name: string;
  size_ha: number;
  nmin_0_30: number | null;
  nmin_30_60: number | null;
  nmin_60_90: number | null;
})
```

Die Eltern-Views (`FelderView`) müssen keine Änderung vornehmen — die neuen Felder werden transparent an `createField`/`updateField` durchgereicht.

### Dexie

Kein Schema-Upgrade nötig. Dexie speichert beliebige Properties auf existierenden Stores — nur Indizes brauchen Schema-Updates. Die neuen Felder werden nicht indiziert.

### Sync Service

`syncAll()` in `sync.service.ts` muss die 3 neuen Felder im `fields`-Upsert mitschicken:

```typescript
.upsert({
  id: field.id,
  name: field.name,
  size_ha: field.size_ha,
  nmin_0_30: field.nmin_0_30,
  nmin_30_60: field.nmin_30_60,
  nmin_60_90: field.nmin_60_90,
})
```

## Berechnungslogik

### Formel

```
empfehlung_kg_ha = Math.max(0,
    demand_kg_ha
  + (expected_yield - ref_yield) × per_yield_correction
  + Σ correction_values       -- Stufe 2
  - nmin_kg_ha                -- Stufe 3 (nur für N)
)
```

### Composable-Signatur

```typescript
function calculateNutrientDemand(
  demands: CropNutrientDemand[],
  nutrientTypes: NutrientType[],
  expectedYieldDtHa: number,
  fieldSizeHa: number,
  activeCorrections?: ActiveCorrection[],
  nminKgHa?: number,            // NEU
): NutrientResult[]
```

### Nmin-Anwendung

- Nmin wird **nur von N** abgezogen: Prüfung über `nutrient.code === 'N'`
- Andere Nährstoffe (P2O5, K2O, MgO, S) bleiben unverändert
- `Math.max(0, ...)` umschließt den gesamten Ausdruck inkl. Nmin

### Nmin-Summierung (in RecommendationView, nicht im Composable)

```typescript
function sumNmin(field: Field, crop: Crop): number {
  if (crop.nmin_depth_cm === 0) return 0
  const v30 = field.nmin_0_30 ?? 0
  const v60 = field.nmin_30_60 ?? 0
  const v90 = field.nmin_60_90 ?? 0
  if (crop.nmin_depth_cm === 60) return v30 + v60
  return v30 + v60 + v90  // 90 cm (Standard)
}
```

Der Composable bekommt nur die fertige Zahl — er weiß nichts über Tiefenschichten.

**Hinweis zu `nmin_depth_cm`:** Alle Kulturen in `src/constants/crops.ts` haben bereits `nmin_depth_cm` gesetzt (Standard: 90, Kleegras: 0). Neue Kulturen im Admin-Bereich haben `nmin_depth_cm` als Pflichtfeld — der Wert wird also nie undefined sein. Kulturen mit `nmin_depth_cm === 0` (z.B. Kleegras) ignorieren Nmin komplett.

### RecommendationView — Strukturelle Anpassung

Die aktuelle RecommendationView extrahiert nur `fieldName` und `fieldSizeHa` aus dem geladenen Feld. Für die Nmin-Berechnung wird das gesamte `Field`-Objekt benötigt. Änderung:

```typescript
// Vorher:
const fieldName = ref('')
const fieldSizeHa = ref(0)
// ... field = fields.find(...); fieldName.value = field?.name ?? ''; fieldSizeHa.value = field?.size_ha ?? 0

// Nachher:
const field = ref<Field | null>(null)
// ... field.value = fields.find(...) ?? null
// fieldName und fieldSizeHa werden computed:
const fieldName = computed(() => field.value?.name ?? '')
const fieldSizeHa = computed(() => field.value?.size_ha ?? 0)
```

Diese Änderung ist backward-kompatibel — Template-Bindings bleiben identisch. Zusätzlich wird `Field` zum Import hinzugefügt.

### Breakdown

Wenn `nminKgHa > 0`, wird eine Zeile ins bestehende `corrections_kg_ha`-Array eingefügt:

```typescript
{
  label: 'Nmin (Bodenprobe)',
  value_kg_ha: -nminKgHa  // z.B. -45
}
```

Kein neuer Typ nötig — `CorrectionBreakdownItem` passt. Die Nmin-Zeile erscheint nach den Korrekturfaktoren und vor der Empfehlung.

**Breakdown nur wenn `activeCorrections` vorhanden ODER `nminKgHa > 0`**: Die Bedingung für Breakdown-Erzeugung wird von `activeCorrections && activeCorrections.length > 0` erweitert auf `(activeCorrections && activeCorrections.length > 0) || (nminKgHa && nminKgHa > 0)`.

## UI

### FieldForm — Nmin-Eingabe

Neuer collapsible Bereich "Nmin-Bodenprobe (optional)" unterhalb der Feldgröße:

- `data-testid="nmin-section"` auf dem Container
- `data-testid="nmin-toggle"` auf dem Expand-Button
- Toggle-Switch: "Tiefenschichten" (Standard) vs. "Gesamtwert"
  - `data-testid="nmin-mode-toggle"`

**Tiefenschichten-Modus (Standard):**
- 3 Eingabefelder mit Labels "0-30 cm", "30-60 cm", "60-90 cm"
- `data-testid="nmin-0-30-input"`, `data-testid="nmin-30-60-input"`, `data-testid="nmin-60-90-input"`
- `type="number"`, `min="0"`, `step="1"`, Einheit "kg N/ha"
- Leere Felder = NULL

**Gesamtwert-Modus:**
- 1 Eingabefeld "Gesamt-Nmin"
- `data-testid="nmin-gesamt-input"`
- Beim Speichern: Wert wird über `Math.floor` auf 3 Schichten verteilt. Rest geht an die erste Schicht.
  - Beispiel: 45 → `nmin_0_30: 15, nmin_30_60: 15, nmin_60_90: 15`
  - Beispiel: 46 → `nmin_0_30: 16, nmin_30_60: 15, nmin_60_90: 15`
  - Beispiel: 50.5 → `nmin_0_30: 18.5, nmin_30_60: 16, nmin_60_90: 16` (floor(50.5/3)=16, Rest 2.5 → erste Schicht)
  - Formel: `base = Math.floor(total / 3); rest = total - 2 * base; [rest, base, base]`
- Beim Laden: **Immer Tiefenschichten-Modus als Standard.** Der Gesamtwert-Modus ist nur ein Eingabe-Shortcut, kein persistierter Zustand. User kann jederzeit zum Gesamtwert-Toggle wechseln; dort wird die Summe der 3 Werte angezeigt.

**Validierung:**
- Alle Nmin-Felder: `min="0"`, Negativwerte werden abgelehnt (Fehlermeldung: "Nmin-Wert darf nicht negativ sein")
- Maximalwert: 999 kg N/ha (Sicherheitslimit, reale Werte liegen bei 0–200)
- `data-testid="nmin-validation-error"` für Validierungsfehler
- Leere Felder = NULL (valider Zustand: "nicht gemessen")

### RecommendationView — Nmin-Info

Unterhalb des CorrectionPanel, vor der RecommendationCard:

**Drei Zustände:**

1. **Crop mit `nmin_depth_cm === 0`** (z.B. Kleegras): Kein Nmin-Badge anzeigen. Nmin ist für diese Kultur nicht relevant — kein Hinweis nötig.

2. **Nmin-Werte vorhanden und Summe > 0:**
```html
<div data-testid="nmin-info" class="...">
  Nmin: 45 kg N/ha (0–90 cm)
</div>
```
Die Tiefenangabe (0–60 oder 0–90) kommt aus `crop.nmin_depth_cm`.

3. **Nmin-Werte nicht erfasst (alle 3 Felder NULL) ODER Summe === 0:**
```html
<div data-testid="nmin-info" class="...">
  Nmin: nicht erfasst
  <router-link :to="`/felder/${fieldId}/bearbeiten`">Bodenprobe eintragen</router-link>
</div>
```

**Hinweis NULL vs. 0:** Es wird nicht zwischen "alle Schichten explizit 0 gemessen" und "nicht gemessen" unterschieden. Beides führt zu keinem Nmin-Abzug. Die Unterscheidung ist agronomisch irrelevant (Nmin=0 kommt in der Praxis nicht vor).

### RecommendationCard Breakdown

Keine Änderung am Component nötig. Die Nmin-Zeile kommt über das bestehende `corrections_kg_ha`-Array.

## Zu ändernde Dateien

### Neue Dateien
| Datei | Verantwortung |
|---|---|
| `supabase/migrations/003_nmin_fields.sql` | Migration: 3 Spalten auf fields |

### Geänderte Dateien
| Datei | Änderung |
|---|---|
| `src/types/index.ts` | Field um 3 Nmin-Felder erweitern, Stufe-3-Kommentare auf Field und FieldCropPlan entfernen |
| `src/services/field.service.ts` | createField/updateField: Pick-Types und Supabase-Calls um Nmin-Felder erweitern |
| `src/services/sync.service.ts` | syncAll: Nmin-Felder im fields-Upsert |
| `src/composables/useNutrientCalculation.ts` | Neuer `nminKgHa?`-Parameter, N-only Abzug, Breakdown |
| `src/composables/useNutrientCalculation.test.ts` | ~6 neue Tests für Nmin |
| `src/components/FieldForm.vue` | Nmin-Eingabebereich (collapsible, Toggle, Validierung), Emit-Payload erweitern |
| `src/components/FieldForm.test.ts` | Tests für Nmin-Eingabe und Validierung |
| `src/views/RecommendationView.vue` | field ref statt fieldName/fieldSizeHa, Nmin summieren, an Berechnung übergeben, Info-Badge |
| `docs/arc42/08-concepts.md` | Stufe 3 Formel als "implementiert" markieren |
| `docs/arc42/05-building-blocks.md` | Nmin in Field-Beschreibung |

## Akzeptanzkriterien

1. Berechnung ohne Nmin identisch zu Stufe 2 (Backward Compat)
2. Nmin-Abzug wird nur auf N angewandt, nicht auf andere Nährstoffe
3. Math.max(0, ...) umschließt gesamten Ausdruck inkl. Nmin
4. Nmin-Werte am Feld speicherbar (3 Schichten oder Gesamtwert)
5. Gesamtwert wird gleichmäßig auf 3 Schichten verteilt
6. Kulturspezifische Tiefensummierung (nmin_depth_cm: 0/60/90)
7. Breakdown zeigt Nmin-Zeile wenn Wert > 0
8. Nmin-Info in RecommendationView (Wert oder "nicht erfasst" mit Link)
9. Offline-fähig: Nmin-Werte in Dexie gespeichert und synced
10. Crop mit nmin_depth_cm === 0 ignoriert Nmin komplett
