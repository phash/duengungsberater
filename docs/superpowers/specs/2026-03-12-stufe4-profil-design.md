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

`BottomNav.vue` bleibt unverändert — Profil-Icon verlinkt weiterhin auf `/profil`. Der Link zu `/profil/werte` kommt aus der ProfileView heraus.

---

## Datenschicht

### auth.service.ts — neue Funktionen

```typescript
updatePassword(newPassword: string): Promise<void>
// → supabase.auth.updateUser({ password: newPassword })

deleteAccount(): Promise<void>
// → supabase.rpc('delete_user')
// Danach: signOut() + redirect zu /login
```

### nutrient.service.ts — neue Funktionen

```typescript
upsertUserNutrientDemand(
  demand: Pick<CropNutrientDemand,
    'crop_id' | 'nutrient_type_id' | 'demand_kg_ha' | 'ref_yield_dt_ha' | 'per_yield_correction'
  >,
  userId: string,
): Promise<CropNutrientDemand>
// INSERT oder UPDATE mit source: 'user', user_id: userId

deleteUserNutrientDemand(
  cropId: string,
  nutrientTypeId: string,
  userId: string,
): Promise<void>
// DELETE WHERE crop_id = cropId AND nutrient_type_id = nutrientTypeId
//   AND user_id = userId AND source = 'user'
```

### getDemandsForCrop — Merge-Strategie

`getDemandsForCrop(cropId: string, userId?: string)` wird erweitert:

1. Lädt alle LfL-Demands für `cropId` (`source = 'lfl'`, `user_id IS NULL`)
2. Lädt User-Demands für `cropId` + `userId` (`source = 'user'`)
3. Merged: User-Wert überschreibt LfL-Wert bei gleicher `crop_id + nutrient_type_id`
4. Gibt gemergtes Array zurück

`RecommendationView` übergibt `userId` beim Laden — kein weiterer Änderungsbedarf dort.

### Supabase Migration

```sql
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

---

## ProfileView — Erweiterungen

### Neue Blöcke (in Reihenfolge)

1. **Account-Info** (bereits vorhanden): E-Mail anzeigen
2. **Eigene Nährstoffwerte — Link-Card**: Button/Card-Link → `/profil/werte`
3. **Passwort ändern** — aufklappbarer Bereich:
   - Felder: „Neues Passwort" + „Passwort bestätigen"
   - Validierung: mind. 6 Zeichen, beide müssen übereinstimmen
   - Erfolg: grüne Meldung „Passwort geändert"
   - Fehler: rote Meldung
4. **Account löschen** — Inline-Bestätigungs-Muster (kein DrawerModal):
   - Primär: roter Button „Account löschen"
   - Nach Klick: Warn-Text + zwei Buttons `Abbrechen` | `Endgültig löschen`
   - Text: *„Alle Felder, Planungen und eigenen Werte werden unwiderruflich gelöscht."*
   - Bei Bestätigung: `deleteAccount()` → signOut → redirect `/login`
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

   Jede Zeile ist klickbar → öffnet DrawerModal.

3. **Offline-Hinweis** wenn `!navigator.onLine`: *„Eigene Werte können nur online bearbeitet werden."* → alle Zeilen deaktiviert.

### DrawerModal — Inhalt

- **Titel:** `"<NährstoffCode> — <Kulturname>"`
- **Feld: Grundbedarf (kg/ha)** — vorbelegt mit user-Wert oder LfL-Wert. Pflichtfeld.
- **Toggle „Erweiterte Einstellungen"** → zeigt zwei weitere Felder:
  - `Referenzertrag (dt/ha)` — vorbelegt mit user- oder LfL-Wert
  - `Ertragskorrektur (kg/dt)` — vorbelegt mit user- oder LfL-Wert
- **Button „Zurücksetzen auf LfL"** — nur sichtbar wenn user-Override existiert. Ruft `deleteUserNutrientDemand` auf.
- **Button „Speichern"** — ruft `upsertUserNutrientDemand` auf.

### Validierung

| Feld | Regel |
|---|---|
| `demand_kg_ha` | > 0, ≤ 999 |
| `ref_yield_dt_ha` | > 0, ≤ 999 (wenn geändert) |
| `per_yield_correction` | −50 ≤ x ≤ 50 (wenn geändert) |

### data-testid Pflicht

Alle interaktiven Elemente erhalten `data-testid`:

| Element | testid |
|---|---|
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
| Löschen-Bestätigen-Button | `delete-account-confirm-button` |
| Löschen-Abbrechen-Button | `delete-account-cancel-button` |

---

## Berechnung — Integration

`getDemandsForCrop` merged user-Demands transparent. `RecommendationView` übergibt `auth.userId` beim Aufruf. `useNutrientCalculation` bleibt unverändert — bekommt bereits gemergtes Array.

---

## Testing

### Unit-Tests (Vitest)

- `nutrient.service.ts` merge-Logik:
  - User-Wert überschreibt LfL bei gleicher `crop_id + nutrient_type_id`
  - LfL-Wert bleibt wenn kein User-Override vorhanden
  - Merge funktioniert mit leerem user-Array (nur LfL)

- Validierungslogik (NutrientValuesView oder eigenem Helper):
  - `demand_kg_ha` muss > 0 sein
  - `ref_yield_dt_ha` muss > 0 sein wenn angegeben
  - `per_yield_correction` muss zwischen −50 und +50 liegen

### E2E-Tests (Playwright)

| UC | Beschreibung |
|---|---|
| UC-P-01 | Passwort ändern — erfolgreich |
| UC-P-02 | Eigenen N-Wert für Winterweizen setzen → Empfehlung zeigt geänderten Wert |
| UC-P-03 | Wert zurücksetzen → LfL-Wert ist wieder aktiv in der Empfehlung |

---

## Offline-Verhalten

Eigene Nährstoffwerte werden **nicht** in Dexie gepuffert — sie erfordern Online-Verbindung. Bei Offline-Status: Bearbeitungs-UI deaktiviert, Hinweis anzeigen. Bestehende user-Werte werden beim Login gecacht (zusammen mit LfL-Daten).

---

## Nicht im Scope

- Import von Nährstoffwerten aus CSV/externen Quellen (`source: 'import_xyz'`) — spätere Iteration
- Neue Kulturen anlegen (nur LfL-Kulturen überschreibbar)
- Push-Benachrichtigungen
- PDF-Export
