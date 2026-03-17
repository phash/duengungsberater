# Admin-Bereich Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 3 targeted fixes so that all 18 existing E2E tests in `tests/e2e/admin.spec.ts` pass.

**Architecture:** The admin area is already fully built (AdminView, 8 components, router guard, auth store). Only `auth-server.js` (role hardcoding), `AdminNutrientForm.vue` (missing source toggle), and `AdminView.vue` (missing product validation) need fixes.

**Tech Stack:** Vue 3, TypeScript, Express.js (auth-server), Playwright (E2E)

---

## Context for Implementers

### Project Setup

```bash
# Terminal 1 — start auth-server:
node auth-server.js
# Terminal 2 — start app:
npm run dev
# Run E2E tests:
npm run test:e2e
# Run just admin tests:
npx playwright test tests/e2e/admin.spec.ts
```

### How auth works

- `auth-server.js` is a local Express mock of Supabase Auth (port 3000)
- Playwright global setup (`tests/e2e/global.setup.ts`) logs in as `admin@test.de` / `admin1234` by navigating to the Vue app UI and filling the login form — this calls `/auth/v1/signin` — and saves the session to `.auth/admin.json`
- The Vue app reads `app_metadata.role` from the user object to set `isAdminUser` in Pinia store
- Router guard checks `isAdminUser` before allowing access to `/admin`
- Currently: `getUser()` always returns `role: 'user'` → admin user can never reach `/admin` → all 18 tests fail (except the non-admin redirect test which is already passing)

> **Critical:** `/auth/v1/signin` is the most important endpoint to fix — Playwright's global setup goes through the UI login form which calls `/auth/v1/signin`, not `/auth/v1/token`.

### What the tests need

**Admin session:** `admin@test.de` must get `role: 'admin'` when logging in.

**Source toggle (US-26):** Test clicks `data-testid="admin-nutrient-source-user"` and then asserts the list item `toContainText('user')`. `AdminNutrientList` already renders `demand.source`.

**Product validation (UC-A-05):** Test fills name + affiliate URL but leaves all % at 0, clicks Speichern, expects drawer stays open and `data-testid="admin-error"` is visible.

---

## Chunk 1: auth-server.js + AdminNutrientForm + AdminView

### Task 1: auth-server.js — Admin Role Support

**Files:**
- Modify: `auth-server.js` (lines 10–104)

There are 4 places to fix: `users` store, `sessions` store, and 3 auth endpoints (signup, signin, token).

- [ ] **Step 1: Update `users` and `sessions` Map comments**

In `auth-server.js`, replace lines 10–11:

```javascript
const users = new Map();    // userId → { email, password, role }
const sessions = new Map(); // token  → { userId, email, role }
```

- [ ] **Step 2: Update `getUser()` to read role from session**

Replace lines 38–43:

```javascript
function getUser(req) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token || !sessions.has(token)) return null;
  const { userId, email, role } = sessions.get(token);
  return { id: userId, email, app_metadata: { role }, user_metadata: {} };
}
```

- [ ] **Step 3: Update `/auth/v1/signup` to store role**

Replace lines 54–55 (inside the signup handler):

```javascript
  users.set(userId, { email, password, role: 'user' });
  sessions.set(token, { userId, email, role: 'user' });
```

(Signup always creates `role: 'user'` — no admin via signup.)

- [ ] **Step 4: Update `/auth/v1/signin` to store and return role**

Replace lines 66–73 (the matching block inside the for-loop):

```javascript
    if (u.email === email && u.password === password) {
      const token = uuidv4();
      const role = u.role ?? 'user';
      sessions.set(token, { userId: id, email, role });
      console.log(`✅ Signin: ${email}`);
      return res.json({
        user: { id, email, app_metadata: { role } },
        session: { access_token: token, token_type: 'bearer' },
      });
    }
```

- [ ] **Step 5: Update `/auth/v1/token` (OAuth2 password grant) to store role**

Replace lines 95–101 (the matching block inside the for-loop):

```javascript
    if (u.email === username && u.password === password) {
      const token = uuidv4();
      const role = u.role ?? 'user';
      sessions.set(token, { userId: id, email: username, role });
      console.log(`✅ Token issued: ${username}`);
      return res.json({ access_token: token, token_type: 'bearer', expires_in: 3600, refresh_token: uuidv4() });
    }
```

- [ ] **Step 6: Seed `admin@test.de` with `role: 'admin'` at startup**

Add a startup seed block right after the `tables` Map declaration (after line 24), before the `getCredentials` function:

```javascript
// ─── Seed admin user ──────────────────────────────────────────────────────
const adminId = uuidv4();
users.set(adminId, { email: 'admin@test.de', password: 'admin1234', role: 'admin' });
console.log('🔑 Admin user seeded: admin@test.de / admin1234');
```

This ensures `admin@test.de` exists immediately on server start without needing a signup step. (Playwright global setup calls `/auth/v1/signin` via the UI login form — the user must already exist in the `users` Map before the form is submitted.)

- [ ] **Step 7: Delete stale Playwright auth sessions so they are regenerated**

```bash
rm -f .auth/admin.json .auth/user.json
```

(Global setup will recreate them on the next `npm run test:e2e`.)

- [ ] **Step 8: Verify auth-server changes manually**

Start the auth-server: `node auth-server.js`

In a second terminal:
```bash
# Login as admin via token endpoint
curl -s -X POST http://localhost:3000/auth/v1/token \
  -H "Content-Type: application/json" \
  -d '{"grant_type":"password","username":"admin@test.de","password":"admin1234"}' \
  | python3 -m json.tool
```

Expected: JSON with `access_token`.

```bash
# Use the token to get user info (replace TOKEN with actual value)
curl -s http://localhost:3000/auth/v1/user \
  -H "Authorization: Bearer TOKEN" \
  | python3 -m json.tool
```

Expected: `"role": "admin"` in `app_metadata`.

- [ ] **Step 9: Commit**

```bash
git add auth-server.js
git commit -m "fix(admin): persist admin role in auth-server sessions"
```

---

### Task 2: AdminNutrientForm — Source Radio Buttons

**Files:**
- Modify: `src/components/AdminNutrientForm.vue`

- [ ] **Step 1: Add `source` ref to the script setup**

In `src/components/AdminNutrientForm.vue`, the script setup starts at line 95. Add the `source` ref:

Replace:
```typescript
const confirmDelete = ref(false)
```

With:
```typescript
const source = ref<'lfl' | 'user'>(props.demand?.source ?? 'lfl')
const confirmDelete = ref(false)
```

- [ ] **Step 2: Pass source in handleSave**

Replace `handleSave()`:

```typescript
function handleSave() {
  emit('save', {
    crop_id: cropId.value,
    nutrient_type_id: nutrientTypeId.value,
    demand_kg_ha: Number(demandKgHa.value),
    ref_yield_dt_ha: Number(refYield.value),
    per_yield_correction: Number(correction.value),
    source: source.value,
    user_id: null,
    valid_from: new Date().toISOString().split('T')[0] ?? '',
  })
}
```

- [ ] **Step 3: Add source radio buttons to template**

Add this block in the template after the "Korrektur pro dt" field (after the `div` containing `admin-nutrient-correction-input`) and before the Speichern button:

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
            class="rounded-full border-gray-300"
          />
          LfL
        </label>
        <label class="flex items-center gap-1.5 text-sm">
          <input
            v-model="source"
            type="radio"
            value="user"
            data-testid="admin-nutrient-source-user"
            class="rounded-full border-gray-300"
          />
          User
        </label>
      </div>
    </div>
```

- [ ] **Step 4: Verify component compiles**

```bash
npm run build 2>&1 | tail -5
```

Expected: no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/AdminNutrientForm.vue
git commit -m "feat(admin): add source radio buttons to AdminNutrientForm"
```

---

### Task 3: AdminView — Product Validation

**Files:**
- Modify: `src/views/AdminView.vue` (lines 381–404)

- [ ] **Step 1: Add validation to `saveProduct()`**

In `src/views/AdminView.vue`, find `saveProduct()` (around line 381). Replace the entire function:

```typescript
async function saveProduct(data: Omit<FertilizerProduct, 'id'>) {
  const hasNutrient =
    data.n_pct > 0 || data.p2o5_pct > 0 || data.k2o_pct > 0 || data.mgo_pct > 0 || data.s_pct > 0
  if (!hasNutrient) {
    errorMessage.value = 'Mindestens ein Nährstoffgehalt muss größer als 0 sein'
    return
  }
  try {
    if (editingProductId.value) {
      const updated = await updateProduct(editingProductId.value, data)
      products.value = products.value.map((p) => (p.id === updated.id ? updated : p))
    } else {
      const created = await createProduct(data)
      products.value.push(created)
    }
    closeProductDrawer()
  } catch {
    errorMessage.value = 'Produkt konnte nicht gespeichert werden'
  }
}
```

Note: `closeProductDrawer()` is NOT called before the validation check — the drawer stays open.

- [ ] **Step 2: Verify `admin-error` is bound to `errorMessage` in the template**

Check that line ~57-63 in `AdminView.vue` contains:

```html
<p
  v-if="errorMessage"
  data-testid="admin-error"
  ...
>
  {{ errorMessage }}
</p>
```

This already exists. No change needed here.

- [ ] **Step 3: Verify component compiles**

```bash
npm run build 2>&1 | tail -5
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/views/AdminView.vue
git commit -m "feat(admin): validate product nutrient percentage before saving"
```

---

### Task 4: Run E2E Tests — Verify All 18 Admin Tests Pass

- [ ] **Step 1: Run admin E2E tests**

```bash
npx playwright test tests/e2e/admin.spec.ts --reporter=line
```

Expected output:
```
  17 passed (or 18 passed, some skipped)
  0 failed
```

The "Nicht-Admin Redirect" test (`Admin: Nicht-Admin Redirect`) uses `.auth/user.json` which also needs to exist. If it was deleted in Task 1 Step 7, run the full test suite once first to regenerate both auth files:

```bash
npm run test:e2e 2>&1 | tail -20
```

- [ ] **Step 2: If any tests fail, investigate**

Common failure modes:
- `.auth/admin.json` missing or stale → delete it and rerun (global setup regenerates it)
- auth-server not running → `node auth-server.js` in another terminal
- Vue app not running → `npm run dev` in another terminal

- [ ] **Step 3: Run full unit test suite to confirm no regressions**

```bash
npm run test:run
```

Expected: 198 passed (all existing unit tests).

- [ ] **Step 4: Commit (if any minor fixes were needed)**

```bash
git add -p
git commit -m "fix(admin): address remaining E2E test failures"
```

---

## Chunk 2: Final Verification

### Task 5: Full Test Suite + Push

- [ ] **Step 1: Run full E2E suite**

```bash
npm run test:e2e 2>&1 | tail -20
```

Expected: no failures in admin tests. Existing tests (felder, anbauplanung, empfehlung, profil) must still pass.

- [ ] **Step 2: Run lint**

```bash
npm run lint 2>&1 | tail -5
```

Expected: same 21 pre-existing errors, no new ones.

- [ ] **Step 3: Push**

```bash
git push origin master
```
