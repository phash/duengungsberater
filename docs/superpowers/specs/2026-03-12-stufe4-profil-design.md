# Stufe 4: Profil & Eigene Nährstoffwerte — Design Spec

**Datum:** 2026-03-12
**Status:** Approved
**Projekt:** Düngungsberater PWA

---

## Überblick

Erweiterung der App um zwei Bereiche:

1. **Account-Verwaltung** (`/profil`): Passwort ändern, Account löschen (mit Bestätigung via RPC), Abmelden, Link zu eigenen Nährstoffwerten.
2. **Eigene Nährstoffwerte** (`/profil/werte`): Nutzer können LfL-Bedarfswerte pro Kultur+Nährstoff überschreiben. Diese user-Werte (`source: 'user'`) haben in der Berechnung Vorrang vor LfL-Werten.

---

## Routen & Views

| Route | View | Neu/Änderung |
|---|---|---|
| `/profil` | `ProfileView.vue` | Erweitern: Passwort, Löschen, Link |
| `/profil/werte` | `NutrientValuesView.vue` | Neu |

**Router-Eintrag** für `/profil/werte` in `src/router/index.ts`:

```typescript
{
  path: '/profil/werte',
  name: 'NutrientValues',
  component: () => import('@/views/NutrientValuesView.vue'),
  meta: { requiresAuth: true },
}
```

`AppLayout` erhält `:show-back="true"` in `NutrientValuesView` — Back-Button navigiert zu `/profil`.

`BottomNav.vue` bleibt unverändert — Profil-Icon verlinkt weiterhin auf `/profil`. Der Link zu `/profil/werte` kommt als Card-Link aus der ProfileView heraus.

---

## Datenschicht

### auth.service.ts — neue Funktionen

```typescript
updatePassword(newPassword: string): Promise<void>
// → supabase.auth.updateUser({ password: newPassword })

deleteAccount(): Promise<void>
// → supabase.rpc('delete_user') + supabase.auth.signOut()
// Navigation zu /login ist Aufgabe des Aufrufers (ProfileView), nicht des Service
```

### crop.service.ts — Erweiterung getNutrientDemands

Die bestehende Funktion `getNutrientDemands(cropId: string)` in `src/services/crop.service.ts` wird **in-place erweitert** um einen optionalen `userId`-Parameter:

```typescript
// Vorher:
getNutrientDemands(cropId: string): Promise<CropNutrientDemand[]>

// Nachher:
getNutrientDemands(cropId: string, userId?: string): Promise<CropNutrientDemand[]>
```

**Online-Pfad mit `userId`:**
1. Lädt LfL-Demands für `cropId` (`source = 'lfl'`, `user_id IS NULL`)
2. Lädt User-Demands für `cropId` + `userId` (`source = 'user'`)
3. Merged: User-Wert überschreibt LfL-Wert bei gleicher `crop_id + nutrient_type_id`
4. Gibt gemergtes Array zurück

**Offline-Pfad mit `userId`:**
- Dexie-Query: `db.cropNutrientDemands.where('crop_id').equals(cropId).toArray()`
- Anschließend in JS filtern:
  - LfL-Rows: `source === 'lfl'`
  - User-Rows: `source === 'user' && user_id === userId`
- Merge identisch wie Online-Pfad

**Offline-Pfad ohne `userId`** (bestehende Aufrufe): unverändert — gibt LfL-Werte zurück.

**Dexie-Schema:** `db/dexie.ts` erhält Version 3 mit zusätzlichen Indexes auf `cropNutrientDemands`:
```typescript
// version 3
.stores({
  ...previousStores,
  cropNutrientDemands: 'id, crop_id, nutrient_type_id, source, user_id, [crop_id+source]',
})
```

**RecommendationView** wird aktualisiert: übergibt `auth.userId` an `getNutrientDemands`.

**source_used-Propagation:** `useNutrientCalculation` bleibt unverändert. In `RecommendationView` wird `source_used` beim Speichern der Empfehlung durch Rückabgleich mit dem gemergten Demand-Array ermittelt:
```typescript
// Nach calculateNutrientDemand:
const sourceUsed = (nutrientCode: string): 'lfl' | 'user' => {
  const d = mergedDemands.find(d => d.nutrient_type_id === nutrientTypeId(nutrientCode))
  return d?.source ?? 'lfl'
}
```

### nutrient.service.ts — neue Funktionen

```typescript
upsertUserNutrientDemand(
  demand: Pick<CropNutrientDemand,
    'crop_id' | 'nutrient_type_id' | 'demand_kg_ha' | 'ref_yield_dt_ha' | 'per_yield_correction'
  >,
  userId: string,
): Promise<CropNutrientDemand>
// INSERT oder UPDATE mit source: 'user', user_id: userId, valid_from: new Date().toISOString()
// Conflict target: (crop_id, nutrient_type_id, user_id) → ON CONFLICT DO UPDATE

deleteUserNutrientDemand(
  cropId: string,
  nutrientTypeId: string,
  userId: string,
): Promise<void>
// DELETE WHERE crop_id = cropId AND nutrient_type_id = nutrientTypeId
//   AND user_id = userId AND source = 'user'
```

### Supabase Migration

```sql
-- Migration 004_user_nutrient_demands_rls.sql

-- RLS Lesen: LfL-Werte (user_id IS NULL) sind für alle lesbar
CREATE POLICY "lfl demands are public"
  ON crop_nutrient_demands
  FOR SELECT
  USING (user_id IS NULL AND source = 'lfl');

-- RLS: Nutzer darf eigene user-Demands lesen/schreiben/löschen
CREATE POLICY "users manage own demands"
  ON crop_nutrient_demands
  FOR ALL
  USING (user_id = auth.uid() AND source = 'user')
  WITH CHECK (user_id = auth.uid() AND source = 'user');

-- RPC: Account löschen (SECURITY DEFINER nötig)
CREATE OR REPLACE FUNCTION delete_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;
```

### Offline-Caching — cacheStammdaten

`cacheStammdaten` in `sync.service.ts` wird erweitert: nach dem LfL-Demands-Fetch wird ein zweiter Query ausgeführt, der user-Demands des eingeloggten Nutzers lädt und ebenfalls in Dexie cached. Beide Queries laufen parallel (`Promise.all`). NutrientValuesView liest den Offline-Cache für die Anzeige der bestehenden Werte; Bearbeitung erfordert Online-Verbindung.

---

## ProfileView — Erweiterungen

### Neue Blöcke (in Reihenfolge)

1. **Account-Info** (bereits vorhanden): E-Mail anzeigen
2. **Eigene Nährstoffwerte — Link-Card**: Card-Link → `/profil/werte` (`data-testid="nutrient-values-link"`)
3. **Passwort ändern** — aufklappbarer Bereich:
   - Toggle-Button (`data-testid="password-change-toggle"`) klappt das Formular auf/zu
   - Felder: „Neues Passwort" + „Passwort bestätigen"
   - Validierung: mind. 6 Zeichen, beide müssen übereinstimmen
   - Ladezustand: Button zeigt „Wird gespeichert…" während `updatePassword` läuft
   - Erfolg: grüne Meldung „Passwort geändert", Formular klappt zu
   - Fehler: rote Meldung mit Fehlertext
4. **Account löschen** — Inline-Bestätigungs-Muster (kein DrawerModal):
   - Primär: roter Button „Account löschen" (`data-testid="delete-account-button"`)
   - Nach Klick: Bestätigungs-Block (`data-testid="delete-account-confirm-block"`) mit Warn-Text + zwei Buttons
   - Text: *„Alle Felder, Planungen und eigenen Werte werden unwiderruflich gelöscht."*
   - Buttons: `Abbrechen` (`data-testid="delete-account-cancel-button"`) | `Endgültig löschen` (`data-testid="delete-account-confirm-button"`, rot)
   - Bei Bestätigung: `deleteAccount()` → signOut → `router.push('/login')`
5. **Abmelden** (bereits vorhanden)

**Version-String:** „MVP · Stufe 1" → „Stufe 3 · Nmin" korrigieren.

---

## NutrientValuesView (`/profil/werte`)

### Layout

1. **Kultur-Dropdown** oben — lädt Kulturen aus Dexie-Cache (`useOfflineCache`)
2. **Nährstofftabelle** — 3 Spalten:

   | Nährstoff | LfL-Wert | Eigener Wert |
   |---|---|---|
   | N | 230 kg/ha | — |
   | P₂O₅ | 64 kg/ha | **70 kg/ha** |
   | K₂O | 48 kg/ha | — |

   Jede Zeile ist klickbar → öffnet DrawerModal. Bei Offline-Status: Zeilen nicht klickbar, grau dargestellt.

3. **Offline-Hinweis** wenn `!navigator.onLine`: *„Eigene Werte können nur online bearbeitet werden."* (`data-testid="demand-offline-notice"`)

### DrawerModal — Inhalt

- **Titel:** `"<NährstoffCode> — <Kulturname>"`
- **Feld: Grundbedarf (kg/ha)** — vorbelegt mit user-Wert oder LfL-Wert. Pflichtfeld.
- **Toggle „Erweiterte Einstellungen"** (`data-testid="demand-advanced-toggle"`) → zeigt zwei weitere Felder:
  - `Referenzertrag (dt/ha)` (`data-testid="ref-yield-input"`) — vorbelegt mit user- oder LfL-Wert
  - `Ertragskorrektur (kg/dt)` (`data-testid="per-yield-input"`) — vorbelegt mit user- oder LfL-Wert
- **Button „Zurücksetzen auf LfL"** (`data-testid="demand-reset-button"`) — nur sichtbar wenn user-Override existiert. Ruft `deleteUserNutrientDemand` auf, schließt Drawer.
- **Button „Speichern"** (`data-testid="demand-save-button"`) — ruft `upsertUserNutrientDemand` auf, schließt Drawer bei Erfolg.

### Validierung

| Feld | Regel |
|---|---|
| `demand_kg_ha` | > 0, ≤ 999 |
| `ref_yield_dt_ha` | > 0, ≤ 999 (wenn geändert) |
| `per_yield_correction` | −50 ≤ x ≤ 50 (wenn geändert) |

### data-testid Pflicht

| Element | testid |
|---|---|
| Link-Card zu /profil/werte | `nutrient-values-link` |
| Kultur-Dropdown | `kultur-select` |
| Tabellenzeile | `demand-row-<nutrient_code>` |
| DrawerModal | `demand-drawer` |
| Grundbedarf-Input | `demand-kg-ha-input` |
| Erweiterte-Toggle | `demand-advanced-toggle` |
| Referenzertrag-Input | `ref-yield-input` |
| Ertragskorrektur-Input | `per-yield-input` |
| Zurücksetzen-Button | `demand-reset-button` |
| Speichern-Button | `demand-save-button` |
| Offline-Hinweis | `demand-offline-notice` |
| Passwort-Ändern-Toggle | `password-change-toggle` |
| Neues-Passwort-Input | `new-password-input` |
| Passwort-Bestätigen-Input | `confirm-password-input` |
| Passwort-Speichern-Button | `password-save-button` |
| Account-Löschen-Button | `delete-account-button` |
| Bestätigungs-Block | `delete-account-confirm-block` |
| Löschen-Bestätigen-Button | `delete-account-confirm-button` |
| Löschen-Abbrechen-Button | `delete-account-cancel-button` |

---

## Berechnung — Integration

`getNutrientDemands` merged user-Demands transparent wenn `userId` übergeben wird. `RecommendationView` übergibt `auth.userId` beim Aufruf. `source_used` beim Speichern der Empfehlung wird aus dem `source`-Feld des jeweiligen Demand-Objekts gelesen (nicht mehr hardcoded `'lfl'`). `useNutrientCalculation` bleibt unverändert.

---

## Testing

### Unit-Tests (Vitest)

- `nutrient.service.ts` merge-Logik:
  - User-Wert überschreibt LfL bei gleicher `crop_id + nutrient_type_id`
  - LfL-Wert bleibt wenn kein User-Override vorhanden
  - Merge funktioniert mit leerem user-Array (nur LfL)
  - Ohne `userId` → nur LfL-Werte (Rückwärtskompatibilität)

- Validierungslogik (NutrientValuesView):
  - `demand_kg_ha` > 0 Pflicht
  - `ref_yield_dt_ha` > 0 wenn angegeben
  - `per_yield_correction` zwischen −50 und +50

### E2E-Tests (Playwright)

| UC | Beschreibung |
|---|---|
| UC-P-01 | Passwort ändern — erfolgreich |
| UC-P-02 | Passwort ändern — Fehler bei Mismatch (Bestätigung stimmt nicht überein) |
| UC-P-03 | Passwort ändern — Fehler bei zu kurzem Passwort (< 6 Zeichen) |
| UC-P-04 | Account-Löschen-Dialog: Abbrechen schließt Bestätigungs-Block ohne Aktion |
| UC-P-05 | Eigenen N-Wert für Winterweizen setzen → Empfehlung zeigt geänderten Wert |
| UC-P-06 | Wert zurücksetzen → LfL-Wert ist wieder aktiv in der Empfehlung |
| UC-P-07 | Erweiterte Einstellungen (ref_yield, per_yield_correction) setzen und speichern |
| UC-P-08 | Offline-Status → Bearbeitungs-UI deaktiviert, Hinweis sichtbar |

---

## Offline-Verhalten

Bestehende user-Werte werden beim Login in Dexie gecacht (zweiter Query in `cacheStammdaten`). Bearbeitung (upsert/delete) erfordert Online-Verbindung — kein Offline-Puffer für Schreiboperationen. Bei Offline-Status: Tabellenzeilen disabled, Offline-Hinweis sichtbar.

---

## Nicht im Scope

- Import von Nährstoffwerten aus CSV/externen Quellen (`source: 'import_xyz'`) — spätere Iteration
- Neue Kulturen anlegen (nur LfL-Kulturen überschreibbar)
- Push-Benachrichtigungen
- PDF-Export
