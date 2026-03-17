# Admin-Bereich — Design Spec

**Datum:** 2026-03-13
**Status:** Approved

---

## Überblick

Der Admin-Bereich ist bereits zu ~90% implementiert. Diese Spec dokumentiert die 3 fehlenden Lücken, die alle 14 bestehenden E2E-Tests zum Scheitern bringen.

---

## Bestehende Implementierung (kein Änderungsbedarf)

- `src/views/AdminView.vue` — 4 Tabs mit vollständigem CRUD
- `src/components/Admin{Crop,Nutrient,Product,Correction}{List,Form}.vue` — alle 8 Komponenten
- `src/router/index.ts` — `/admin` Route mit `requiresAdmin: true`
- `src/stores/auth.store.ts` — `isAdminUser` Flag via `authService.isAdmin()`
- `src/components/BottomNav.vue` — Admin-Link sichtbar wenn `isAdmin`
- `tests/e2e/admin.spec.ts` — 14 Tests (alle schlagen fehl wegen der 3 Lücken)

---

## Lücke 1: auth-server.js — Admin Role Support

### Problem

`getUser()` gibt hardcoded `role: 'user'` zurück. Damit kann kein User jemals `/admin` erreichen — der Router-Guard leitet immer zu `/felder` um.

### Lösung

Die Role wird beim Login in der Session mitgespeichert. `admin@test.de` bekommt automatisch `role: 'admin'` zugewiesen.

### Änderungen

**`auth-server.js`:**

1. `users` Map speichert zusätzlich `role`:
   ```javascript
   users.set(userId, { email, password, role: isAdmin ? 'admin' : 'user' })
   ```
   Wobei `isAdmin = (email === 'admin@test.de')`.

2. `sessions` Map speichert zusätzlich `role`:
   ```javascript
   sessions.set(token, { userId, email, role })
   ```

3. `getUser()` liest `role` aus der Session:
   ```javascript
   function getUser(req) {
     const token = req.headers.authorization?.split(' ')[1]
     if (!token || !sessions.has(token)) return null
     const { userId, email, role } = sessions.get(token)
     return { id: userId, email, app_metadata: { role }, user_metadata: {} }
   }
   ```

4. Signup-Endpoint setzt `role: 'user'` (kein Admin via Signup):
   ```javascript
   app_metadata: { role: 'user' }
   ```

5. Die `.auth/admin.json` Playwright-Session muss nach dieser Änderung neu generiert werden (via `global.setup.ts`).

---

## Lücke 2: AdminNutrientForm — Source-Toggle

### Problem

`AdminNutrientForm.vue` speichert immer `source: 'lfl'`. Test `US-26` erwartet:
- Ein Element mit `data-testid="admin-nutrient-source-user"`
- Nach Klick darauf: neuer Eintrag in der Liste zeigt `'user'` (via `demand.source`)

### Lösung

Radio-Buttons für `source: 'lfl' | 'user'` im Formular. Standard: `'lfl'`.

### Änderungen

**`src/components/AdminNutrientForm.vue`:**

```html
<div>
  <label class="block text-sm font-medium text-gray-700">Quelle</label>
  <div class="mt-1 flex gap-4">
    <label class="flex items-center gap-1.5 text-sm">
      <input
        v-model="source"
        type="radio"
        value="lfl"
        data-testid="admin-nutrient-source-lfl"
      />
      LfL
    </label>
    <label class="flex items-center gap-1.5 text-sm">
      <input
        v-model="source"
        type="radio"
        value="user"
        data-testid="admin-nutrient-source-user"
      />
      User
    </label>
  </div>
</div>
```

`handleSave()` übergibt `source: source.value` statt hardcoded `'lfl'`.

---

## Lücke 3: AdminProductForm — Validierung

### Problem

Test `UC-A-05: Validierung — kein Nährstoffgehalt > 0` erwartet:
- Drawer bleibt offen
- `data-testid="admin-error"` in AdminView sichtbar

Aktuell: Produkt wird ohne Prüfung gespeichert, Drawer schließt sich.

### Lösung

Validierung in `AdminView.vue` vor dem Speichern: mindestens einer der Werte N/P2O5/K2O/MgO/S muss > 0 sein.

### Änderungen

**`src/views/AdminView.vue`** — `saveProduct()`:

```typescript
async function saveProduct(data: Omit<FertilizerProduct, 'id'>) {
  const hasNutrient = data.n_pct > 0 || data.p2o5_pct > 0 || data.k2o_pct > 0
    || data.mgo_pct > 0 || data.s_pct > 0
  if (!hasNutrient) {
    errorMessage.value = 'Mindestens ein Nährstoffgehalt muss größer als 0 sein'
    return
  }
  try {
    // ... bestehende Logik
  } catch {
    errorMessage.value = 'Produkt konnte nicht gespeichert werden'
  }
}
```

Der Drawer bleibt offen (kein `closeProductDrawer()` Aufruf vor der Validierung).

---

## Dateien

| Aktion | Datei | Änderung |
|---|---|---|
| Modify | `auth-server.js` | Role in users/sessions speichern, `getUser()` liest role aus Session |
| Modify | `src/components/AdminNutrientForm.vue` | Source-Radio-Buttons hinzufügen |
| Modify | `src/views/AdminView.vue` | Validierung in `saveProduct()` |

---

## Tests

Keine neuen Tests nötig — alle 14 bestehenden E2E-Tests in `tests/e2e/admin.spec.ts` sollen nach diesen Fixes grün sein.

**Erwartetes Ergebnis nach Fixes:**
- `Admin: Zugang` — 1 Test ✅
- `Admin: Nicht-Admin Redirect` — 1 Test ✅ (bereits grün)
- `UC-A-01/02: Kulturen` — 3 Tests ✅
- `UC-A-03/04: Nährstoffwerte` — 5 Tests ✅ (inkl. US-26)
- `UC-A-05/06: Produkte` — 4 Tests ✅
- `UC-A-07/08: Korrekturen` — 4 Tests ✅ (1 übersprungen wenn keine Daten)

---

## Nicht im Scope

- User-Management im Admin (Rollen vergeben, User löschen)
- Audit-Log
- Seed-Daten / LfL-Tabellen-Import
- Admin-Bereich für Feldgeometrien
