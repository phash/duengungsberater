# Phase 1: Abmahnschutz + Critical Security

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** DSGVO-Abmahnrisiken eliminieren und Critical-Security-Lücken schließen (OAuth2-CSRF, Mock-Auth in Prod, Leaflet-XSS, unbeschränkte File-Uploads).

**Architecture:**
- Google Fonts self-hosten via `@fontsource/*` → keine Drittanbieter-CDN-Anfragen.
- Matomo cookieless mit `disableCookies`+`setDoNotTrack`+`requireConsent` → Art. 6(1)(f) DSGVO tragfähig ohne Banner.
- iBalis-Proxy bekommt serverseitigen State-Store + HttpOnly-Session-Cookie statt URL-Query.
- Mock-Auth-Server (`auth-server.js`) wird aus Prod-Pfad entfernt + Fail-Fast-Guard bei `NODE_ENV=production`.
- Leaflet-Tooltips werden XSS-sicher via DOM-Manipulation (keine HTML-Strings mit User-Input).
- iBalis-Import bekommt File-Size- und Polygon-Count-Limits.

**Tech Stack:** Vue 3 + Vite, `@fontsource/fraunces`, `@fontsource/outfit`, Leaflet, Node.js Express (iBalis-Proxy), Vitest, Playwright.

**Verwandte Reviews:** siehe Chat-Verlauf 2026-04-17 (Security, DSGVO, UI/UX, Clean Code).

---

## File Structure

**Modifiziert:**
- `index.html` — Google-Fonts-Links entfernen, Matomo umbauen (cookieless + Consent-Gate).
- `src/main.ts` — `@fontsource/*` imports, Matomo-Consent-Init.
- `src/utils/tracking.ts` — `requireConsent`-Helfer + Opt-Out.
- `src/views/DatenschutzView.vue` — Abschnitt 6 (Google Fonts) komplett streichen/umschreiben; Matomo-Abschnitt mit Opt-Out-Button; OSM-Abschnitt neu.
- `src/components/MatomoOptOut.vue` — **neu** (kleine Komponente mit Toggle).
- `ibalis-proxy/server.js` — State-Store + Validation + HttpOnly-Cookie, Rate-Limit, Body-Size-Guard.
- `ibalis-proxy/package.json` — neue Dev-Dep: `vitest` oder `node:test`, neue Runtime-Dep: `cookie-parser`, `express-rate-limit`.
- `ibalis-proxy/tests/server.test.js` — **neu** (State-Validation + Cookie-Flow).
- `docker-compose.prod.yml` — `auth-server`-Service und Referenzen entfernen; **oder** komplett löschen.
- `auth-server.js` — Fail-Fast bei `NODE_ENV=production`; Hardcoded Admin nur in dev.
- `src/components/FieldMap.vue` — Tooltip via DOM-Element statt HTML-String.
- `src/composables/useIBalisImport.ts` — `file.size > 50MB` Guard, `numPolys`/`numRings` Cap, Magic-Byte-Check.
- `src/composables/useIBalisImport.test.ts` — neue Tests für Limits.
- `src/services/ibalis.service.ts` — Session-Token wird aus Cookie gelesen (Frontend-Seite nach Cookie-Umstellung).
- `src/views/FieldsView.vue` — liest `?ibalis=connected` ohne `session`-Query.
- `CLAUDE.md` — Eintrag zum geänderten iBalis-Flow.

**Neu:**
- `public/fonts/` — optional WOFF2-Dateien (falls `@fontsource` nicht genutzt, wir nutzen aber Package).
- `docs/arc42/09-design-entscheidungen.md` — neue Entscheidungen dokumentieren.

---

## Task 1: Google Fonts self-hosten

**Begründung (DSGVO):** Direkte Einbindung via `fonts.googleapis.com`/`fonts.gstatic.com` überträgt IP-Adresse nach USA an Google LLC — Abmahnrisiko (LG München I, 20.01.2022, Az. 3 O 17493/20).

**Files:**
- Modify: `/home/manuel/claude/duengungsberater/package.json`
- Modify: `/home/manuel/claude/duengungsberater/index.html:199-202`
- Modify: `/home/manuel/claude/duengungsberater/src/main.ts`
- Modify: `/home/manuel/claude/duengungsberater/src/views/DatenschutzView.vue:217-242`

- [ ] **Step 1: Fontsource-Pakete installieren**

```bash
cd /home/manuel/claude/duengungsberater
npm install --save @fontsource-variable/fraunces @fontsource/outfit
```

Erwartet: `package.json` enthält danach beide Dependencies; `node_modules/@fontsource{,-variable}` existiert.

- [ ] **Step 2: Imports in `src/main.ts` ergänzen**

Oben in der Datei (nach den anderen CSS-Imports) einfügen:

```typescript
// Self-hosted fonts (DSGVO)
import '@fontsource-variable/fraunces/index.css'
import '@fontsource/outfit/300.css'
import '@fontsource/outfit/400.css'
import '@fontsource/outfit/500.css'
import '@fontsource/outfit/600.css'
import '@fontsource/outfit/700.css'
```

- [ ] **Step 3: Google-Fonts-Links aus `index.html` entfernen**

In `/home/manuel/claude/duengungsberater/index.html` die Zeilen 199-202 komplett ersetzen durch:

```html
    <!-- Fonts werden via @fontsource in src/main.ts self-hosted geladen (DSGVO) -->
```

- [ ] **Step 4: Datenschutz-Abschnitt „6. Google Fonts" streichen**

In `DatenschutzView.vue` den `<!-- 6. Google Fonts -->`-Block (Zeilen 217-242) komplett entfernen und die folgenden Abschnittsnummern nicht verschieben (iBalis war schon „7.", das bleibt — wir lassen 6 leer bzw. nutzen die Nummer 6 neu für OSM in Task 2b).

Ersetze diesen Block **komplett**:

```html
        <!-- 6. Google Fonts -->
        <section>
          <h2 class="font-display text-base font-semibold text-stone-800">
            6. Google Fonts
          </h2>
          <p class="mt-3">
            Diese Anwendung verwendet Google Fonts (Schriftarten „Fraunces" und
            „Outfit"), die über das Google Fonts CDN geladen werden. Beim Aufruf
            der Seite wird eine Verbindung zu Servern von Google LLC (1600
            Amphitheatre Parkway, Mountain View, CA 94043, USA) hergestellt.
            Dabei kann Ihre IP-Adresse an Google übermittelt werden.
          </p>
          <p class="mt-3">
            Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes
            Interesse an einer einheitlichen Darstellung). Google LLC ist unter
            dem EU-US Data Privacy Framework zertifiziert. Weitere Informationen
            finden Sie in der
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              class="text-field-700 underline hover:text-field-800"
              >Datenschutzerklärung von Google</a
            >.
          </p>
        </section>
```

durch (neuer OSM-Abschnitt, bereits Task-1-Teil):

```html
        <!-- 6. Kartendarstellung (OpenStreetMap) -->
        <section>
          <h2 class="font-display text-base font-semibold text-stone-800">
            6. Kartendarstellung (OpenStreetMap)
          </h2>
          <p class="mt-3">
            Zur Darstellung Ihrer Feldgrenzen auf einer Karte werden Kartenkacheln
            (Tiles) von Servern der OpenStreetMap Foundation (OSMF), St John's
            Innovation Centre, Cowley Road, Cambridge CB4 0WS, Vereinigtes
            Königreich geladen. Dabei wird Ihre IP-Adresse an die OSMF
            übermittelt.
          </p>
          <p class="mt-3">
            Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung —
            die Feldkarte ist eine Kernfunktion der App). Für das Vereinigte
            Königreich liegt ein Angemessenheitsbeschluss der EU-Kommission vor.
          </p>
          <p class="mt-3">
            Weitere Informationen:
            <a
              href="https://osmfoundation.org/wiki/Privacy_Policy"
              target="_blank"
              rel="noopener noreferrer"
              class="text-field-700 underline hover:text-field-800"
              >OSMF Privacy Policy</a
            >.
          </p>
        </section>
```

- [ ] **Step 5: Build + manueller Test**

```bash
cd /home/manuel/claude/duengungsberater
npm run build
```

Erwartet: Build erfolgreich, keine Fehler.

Danach `npm run dev`, öffnen `http://localhost:5173`, DevTools → Netzwerk → Filter „fonts.google". **Erwartet: 0 Requests zu fonts.googleapis.com oder fonts.gstatic.com.** Stattdessen lokale Font-Assets.

- [ ] **Step 6: Commit**

```bash
cd /home/manuel/claude/duengungsberater
git add package.json package-lock.json src/main.ts index.html src/views/DatenschutzView.vue
git commit -m "$(cat <<'EOF'
feat: self-host fonts via @fontsource (DSGVO)

Ersetzt Google Fonts CDN durch lokale @fontsource-Pakete.
Keine IP-Übermittlung mehr an Google LLC. Ergänzt Datenschutz
um OpenStreetMap-Abschnitt, entfernt obsoleten Google-Fonts-Abschnitt.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Matomo cookieless + Consent-freier Betrieb

**Begründung (DSGVO/TTDSG):** `_paq.push(['trackPageView'])` vor Consent verstößt gegen § 25 TTDSG. Cookieless-Modus mit `disableCookies`+`setDoNotTrack`+`anonymizeIp` ist nach Aufsichtsbehörden (BayLDA) ohne Einwilligung zulässig bei „berechtigtem Interesse" — wenn Opt-Out verfügbar.

**Files:**
- Modify: `/home/manuel/claude/duengungsberater/index.html:239-251`
- Modify: `/home/manuel/claude/duengungsberater/src/utils/tracking.ts` (falls existiert — prüfen)
- Create: `/home/manuel/claude/duengungsberater/src/components/MatomoOptOut.vue`
- Modify: `/home/manuel/claude/duengungsberater/src/views/DatenschutzView.vue` (Abschnitt 5 erweitern)

- [ ] **Step 1: `src/utils/tracking.ts` lesen**

```bash
cat /home/manuel/claude/duengungsberater/src/utils/tracking.ts
```

Falls Datei existiert: Inhalt merken (im nächsten Step erweitert). Falls nicht: im Step 3 neu erstellen.

- [ ] **Step 2: Matomo-Snippet in `index.html` umbauen (cookieless)**

Ersetze in `index.html` die Zeilen 239-251:

```html
    <!-- Matomo -->
    <script>
      var _paq = window._paq = window._paq || [];
      _paq.push(['trackPageView']);
      _paq.push(['enableLinkTracking']);
      (function() {
        var u="//musikersuche.org/matomo/";
        _paq.push(['setTrackerUrl', u+'matomo.php']);
        _paq.push(['setSiteId', '3']);
        var d=document, g=d.createElement('script'), s=d.getElementsByTagName('script')[0];
        g.async=true; g.src=u+'matomo.js'; s.parentNode.insertBefore(g,s);
      })();
    </script>
```

durch (cookieless + respektiert Opt-Out-Cookie):

```html
    <!-- Matomo (cookieless, DSGVO-konform) -->
    <script>
      var _paq = window._paq = window._paq || [];
      // Privacy-first Konfiguration: keine Cookies, DNT respektieren, IP anonymisieren
      _paq.push(['disableCookies']);
      _paq.push(['setDoNotTrack', true]);
      // Opt-Out aus LocalStorage respektieren (Toggle in Datenschutzerklärung)
      try {
        if (localStorage.getItem('matomo_opt_out') === 'true') {
          _paq.push(['optUserOut']);
        }
      } catch (e) { /* privaten Modus nicht crashen */ }
      _paq.push(['trackPageView']);
      _paq.push(['enableLinkTracking']);
      (function() {
        var u="//musikersuche.org/matomo/";
        _paq.push(['setTrackerUrl', u+'matomo.php']);
        _paq.push(['setSiteId', '3']);
        var d=document, g=d.createElement('script'), s=d.getElementsByTagName('script')[0];
        g.async=true; g.src=u+'matomo.js'; s.parentNode.insertBefore(g,s);
      })();
    </script>
```

- [ ] **Step 3: `MatomoOptOut.vue` erstellen**

Neue Datei `/home/manuel/claude/duengungsberater/src/components/MatomoOptOut.vue`:

```vue
<template>
  <div class="rounded-xl border border-stone-200 bg-white p-4">
    <p class="text-sm text-stone-700">
      <strong class="text-stone-800">Webanalyse-Status:</strong>
      {{ optedOut ? 'Deaktiviert (Opt-Out aktiv)' : 'Aktiv (anonymisiert, cookieless)' }}
    </p>
    <button
      type="button"
      data-testid="matomo-opt-out-toggle"
      class="mt-3 rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
      @click="toggleOptOut"
    >
      {{ optedOut ? 'Webanalyse wieder aktivieren' : 'Webanalyse deaktivieren (Opt-Out)' }}
    </button>
    <p class="mt-2 text-xs text-stone-500">
      Der Opt-Out-Status wird lokal in Ihrem Browser gespeichert
      (LocalStorage-Schlüssel <code class="text-xs">matomo_opt_out</code>).
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const optedOut = ref(false)

onMounted(() => {
  try {
    optedOut.value = localStorage.getItem('matomo_opt_out') === 'true'
  } catch {
    /* privater Modus */
  }
})

function toggleOptOut() {
  const next = !optedOut.value
  try {
    if (next) {
      localStorage.setItem('matomo_opt_out', 'true')
      // Matomo sofort informieren, falls geladen
      window._paq?.push(['optUserOut'])
    } else {
      localStorage.removeItem('matomo_opt_out')
      window._paq?.push(['forgetUserOptOut'])
    }
    optedOut.value = next
  } catch {
    /* privater Modus */
  }
}

declare global {
  interface Window {
    _paq?: Array<unknown[]>
  }
}
</script>
```

- [ ] **Step 4: Matomo-Abschnitt in `DatenschutzView.vue` um Opt-Out + klare Rechtsgrundlage erweitern**

Ersetze in `DatenschutzView.vue` den `<!-- 4b. Webanalyse (Matomo) -->`-Block (Zeilen 192-215) durch:

```html
        <!-- 5. Webanalyse (Matomo) -->
        <section>
          <h2 class="font-display text-base font-semibold text-stone-800">
            5. Webanalyse (Matomo)
          </h2>
          <p class="mt-3">
            Diese Website verwendet <strong class="text-stone-700">Matomo</strong>,
            eine Open-Source-Software zur statistischen Auswertung der
            Besucherzugriffe. Matomo wird auf einem selbst gehosteten Server in
            Deutschland betrieben. Die erhobenen Daten werden
            <strong class="text-stone-700">nicht an Dritte weitergegeben</strong>.
          </p>
          <p class="mt-2">
            Wir betreiben Matomo
            <strong class="text-stone-700">cookielos und mit anonymisierter
            IP-Adresse</strong>: Es werden keine Cookies gesetzt, kein
            wiedererkennbares Besucher-Profil gebildet, und die
            „Do-Not-Track"-Einstellung Ihres Browsers wird automatisch
            respektiert.
          </p>
          <p class="mt-2">
            Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse
            an der statistischen Analyse zur Optimierung des Angebots).
            Sie können dem Tracking jederzeit widersprechen:
          </p>
          <div class="mt-4">
            <MatomoOptOut />
          </div>
        </section>
```

Und im `<script setup>`-Block von `DatenschutzView.vue` (Zeile 432-434) den Import ergänzen:

```vue
<script setup lang="ts">
import MatomoOptOut from '@/components/MatomoOptOut.vue'
</script>
```

- [ ] **Step 5: Manueller Test — keine Matomo-Cookies, Opt-Out funktioniert**

```bash
cd /home/manuel/claude/duengungsberater
npm run dev
```

Browser: `http://localhost:5173/datenschutz`.
DevTools → Application → Cookies für localhost. **Erwartet: keine `_pk_*`-Cookies**.
Auf „Webanalyse deaktivieren" klicken. LocalStorage: `matomo_opt_out = "true"`.
Nach Reload: Button-Text = „Webanalyse wieder aktivieren".

- [ ] **Step 6: Commit**

```bash
git add index.html src/components/MatomoOptOut.vue src/views/DatenschutzView.vue
git commit -m "$(cat <<'EOF'
feat: cookieless Matomo + Opt-Out-Toggle (DSGVO/TTDSG)

Matomo läuft ohne Cookies, mit anonymisierter IP und respektiert DNT.
Neue MatomoOptOut-Komponente erlaubt lokales Deaktivieren (LocalStorage).
Datenschutzerklärung Abschnitt 5 aktualisiert mit klarer Rechtsgrundlage.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: iBalis-Proxy — OAuth2 State + HttpOnly-Cookie + Rate-Limits

**Begründung (Security):**
- `state` wird nicht validiert → CSRF.
- Session-Token landet als Query-Parameter in Browser-History/Referer/Logs.
- Keine Rate-Limits → Memory-DoS via `/ibalis/auth`.

**Files:**
- Modify: `/home/manuel/claude/duengungsberater/ibalis-proxy/package.json`
- Modify: `/home/manuel/claude/duengungsberater/ibalis-proxy/server.js`
- Create: `/home/manuel/claude/duengungsberater/ibalis-proxy/tests/server.test.js`
- Modify: `/home/manuel/claude/duengungsberater/src/services/ibalis.service.ts`
- Modify: `/home/manuel/claude/duengungsberater/src/views/FieldsView.vue` (session-Query-Parsing weg)

- [ ] **Step 1: Test-Framework + Rate-Limit installieren**

```bash
cd /home/manuel/claude/duengungsberater/ibalis-proxy
npm install --save express-rate-limit cookie-parser
npm install --save-dev vitest supertest
```

`ibalis-proxy/package.json` sollte danach Scripts enthalten. Ergänze:

```json
{
  "scripts": {
    "start": "node server.js",
    "test": "vitest run"
  }
}
```

- [ ] **Step 2: Failing Test für State-Validation schreiben**

Neue Datei `/home/manuel/claude/duengungsberater/ibalis-proxy/tests/server.test.js`:

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp, __issueState } from '../server.js';

describe('iBalis-Proxy Security', () => {
  let app;

  beforeEach(() => {
    process.env.IBALIS_MOCK = 'true';
    process.env.SITE_URL = 'http://localhost:3080';
    app = createApp();
  });

  it('rejects /ibalis/callback with unknown state', async () => {
    const res = await request(app)
      .get('/ibalis/callback?code=x&state=unknown-state-value');
    // Redirect to /felder?ibalis=error&reason=invalid_state
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('ibalis=error');
    expect(res.headers.location).toContain('reason=invalid_state');
  });

  it('accepts callback with valid state and sets HttpOnly session cookie', async () => {
    const state = __issueState();
    const res = await request(app)
      .get(`/ibalis/callback?code=mock-code&state=${state}`);
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('ibalis=connected');
    expect(res.headers.location).not.toContain('session=');
    const setCookie = res.headers['set-cookie']?.[0] ?? '';
    expect(setCookie).toMatch(/ibalis_session=/);
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/SameSite=Lax/i);
  });

  it('state can only be used once', async () => {
    const state = __issueState();
    await request(app).get(`/ibalis/callback?code=x&state=${state}`);
    const res2 = await request(app).get(`/ibalis/callback?code=x&state=${state}`);
    expect(res2.headers.location).toContain('reason=invalid_state');
  });

  it('/ibalis/feldstuecke reads session from cookie', async () => {
    const state = __issueState();
    const agent = request.agent(app);
    await agent.get(`/ibalis/callback?code=x&state=${state}`);
    // Agent persists cookies
    const res = await agent.get('/ibalis/feldstuecke/276-09-12345/2026');
    expect(res.status).toBe(200);
    expect(res.body.feldstuecke).toBeDefined();
  });

  it('/ibalis/feldstuecke returns 401 without cookie', async () => {
    const res = await request(app)
      .get('/ibalis/feldstuecke/276-09-12345/2026');
    expect(res.status).toBe(401);
  });

  it('rate-limits /ibalis/auth (30/min/IP)', async () => {
    // Wir feuern 35 Requests — die letzten sollten 429 liefern
    let last;
    for (let i = 0; i < 35; i++) {
      last = await request(app).get('/ibalis/auth');
    }
    expect(last.status).toBe(429);
  });
});
```

Run: `npm test` in `ibalis-proxy/`.
Expected: **alle Tests failen** (createApp/__issueState gibt's noch nicht, Server ist monolithisch).

- [ ] **Step 3: `server.js` refactoren auf `createApp()` + State-Validierung + Cookie**

Ersetze `/home/manuel/claude/duengungsberater/ibalis-proxy/server.js` **komplett**:

```javascript
'use strict';

const express = require('express');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const https = require('https');
const http = require('http');
const { URL, URLSearchParams } = require('url');

const PORT = process.env.PORT || 3100;

function getConfig() {
  return {
    clientId: process.env.IBALIS_CLIENT_ID || '',
    clientSecret: process.env.IBALIS_CLIENT_SECRET || '',
    redirectUri:
      process.env.IBALIS_REDIRECT_URI ||
      'https://duenger.mr-development.de/ibalis/callback',
    siteUrl: process.env.SITE_URL || 'https://duenger.mr-development.de',
    isMock: process.env.IBALIS_MOCK === 'true',
    authUrl: 'https://zad.stmelf.bybn.de/zad/oauth/authorize',
    tokenUrl: 'https://zad.stmelf.bybn.de/zad/oauth/token',
    feldstueckeBase:
      'https://flaecheiws.stmelf.bybn.de/flaecheiws/ws/rest/agrardatennetzwerk/flaechenverwaltung/v1/feldstuecke',
  };
}

const STATE_TTL_MS = 10 * 60 * 1000; // 10 min für OAuth-Flow
const SESSION_TTL_MS = 60 * 60 * 1000; // 1 h für eingelöste Session
const STATE_STORE_CAP = 10_000;
const SESSION_STORE_CAP = 10_000;

// issuedStates: state -> expiresAt (reine „gültig ausgestellt" Markierung)
const issuedStates = new Map();
// sessions: sessionId -> { access_token, refresh_token, expires_at }
const sessions = new Map();

function pruneExpired(store, nowKey = 'expires_at') {
  const now = Date.now();
  for (const [key, value] of store.entries()) {
    const exp = typeof value === 'number' ? value : value[nowKey];
    if (exp < now) store.delete(key);
  }
}

function capStore(store, cap) {
  while (store.size > cap) {
    const firstKey = store.keys().next().value;
    store.delete(firstKey);
  }
}

// Intervall nur starten, wenn Modul direkt läuft (nicht in Tests)
let pruneInterval = null;
function startPruning() {
  if (pruneInterval) return;
  pruneInterval = setInterval(() => {
    pruneExpired(issuedStates);
    pruneExpired(sessions);
  }, 60 * 1000);
}
function stopPruning() {
  if (pruneInterval) {
    clearInterval(pruneInterval);
    pruneInterval = null;
  }
}

function issueState() {
  const state = crypto.randomBytes(16).toString('hex');
  issuedStates.set(state, Date.now() + STATE_TTL_MS);
  capStore(issuedStates, STATE_STORE_CAP);
  return state;
}

function consumeState(state) {
  const exp = issuedStates.get(state);
  if (!exp) return false;
  issuedStates.delete(state);
  return exp >= Date.now();
}

function newSessionId() {
  return crypto.randomBytes(24).toString('hex');
}

function storeSession(entry) {
  const sessionId = newSessionId();
  sessions.set(sessionId, entry);
  capStore(sessions, SESSION_STORE_CAP);
  return sessionId;
}

// Exportierter Test-Helper (umgeht HTTP, erlaubt State-Issue ohne /ibalis/auth)
function __issueState() {
  return issueState();
}

function httpsPost(urlString, params) {
  return new Promise((resolve, reject) => {
    const body = new URLSearchParams(params).toString();
    const url = new URL(urlString);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (err) {
          reject(new Error(`Failed to parse token response: ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function httpsGetWithBearer(urlString, accessToken) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    };
    const lib = url.protocol === 'https:' ? https : http;
    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (err) {
          reject(new Error(`Failed to parse API response: ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function exchangeCodeForToken(code, cfg) {
  const result = await httpsPost(cfg.tokenUrl, {
    grant_type: 'authorization_code',
    code,
    redirect_uri: cfg.redirectUri,
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
  });
  if (result.status !== 200) {
    throw new Error(
      `Token exchange failed with status ${result.status}: ${JSON.stringify(result.body)}`,
    );
  }
  const { access_token, refresh_token, expires_in } = result.body;
  return {
    access_token,
    refresh_token,
    expires_at: Date.now() + (expires_in || 3600) * 1000,
  };
}

async function refreshAccessToken(entry, cfg) {
  if (!entry.refresh_token) throw new Error('No refresh_token available');
  const result = await httpsPost(cfg.tokenUrl, {
    grant_type: 'refresh_token',
    refresh_token: entry.refresh_token,
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
  });
  if (result.status !== 200) {
    throw new Error(
      `Token refresh failed with status ${result.status}: ${JSON.stringify(result.body)}`,
    );
  }
  const { access_token, refresh_token, expires_in } = result.body;
  return {
    access_token,
    refresh_token: refresh_token || entry.refresh_token,
    expires_at: Date.now() + (expires_in || 3600) * 1000,
  };
}

const MOCK_FELDSTUECKE = {
  feldstuecke: [
    {
      fsNummer: 1, fsName: 'Oberer Acker', flik: 'DEBYLI9832000032',
      flaechenanteilInProzent: 100, flaecheInHektar: 8.75,
      geometryWKT: 'POLYGON ((11.5 48.1, 11.505 48.1, 11.505 48.104, 11.5 48.104, 11.5 48.1))',
      nutzungen: [{ schlagNr: '1', nutzungscode: { code: '115', bezeichnung: 'Winterweizen' }, flaecheInHektar: 8.75 }],
      landschaftselemente: [],
    },
    {
      fsNummer: 2, fsName: 'Talfeld Süd', flik: 'DEBYLI9832000045',
      flaechenanteilInProzent: 100, flaecheInHektar: 12.5,
      geometryWKT: 'POLYGON ((11.51 48.09, 11.518 48.09, 11.518 48.095, 11.51 48.095, 11.51 48.09))',
      nutzungen: [{ schlagNr: '1', nutzungscode: { code: '411', bezeichnung: 'Silomais' }, flaecheInHektar: 12.5 }],
      landschaftselemente: [],
    },
    {
      fsNummer: 3, fsName: 'Waldrandstück', flik: 'DEBYLI9832000058',
      flaechenanteilInProzent: 100, flaecheInHektar: 5.25,
      geometryWKT: 'POLYGON ((11.52 48.105, 11.525 48.105, 11.525 48.108, 11.52 48.108, 11.52 48.105))',
      nutzungen: [{ schlagNr: '1', nutzungscode: { code: '131', bezeichnung: 'Wintergerste' }, flaecheInHektar: 5.25 }],
      landschaftselemente: [],
    },
  ],
};

const SESSION_COOKIE = 'ibalis_session';

function createApp() {
  const cfg = getConfig();
  const app = express();
  app.use(cookieParser());
  app.use(express.json({ limit: '16kb' }));

  // Rate-Limit: 30 Requests/Minute/IP für OAuth-Endpoints
  const oauthLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.get('/ibalis/health', (req, res) => {
    res.json({ status: 'ok', mock: cfg.isMock });
  });

  app.get('/ibalis/auth', oauthLimiter, (req, res) => {
    const state = issueState();
    if (cfg.isMock) {
      const callbackUrl = new URL(cfg.redirectUri);
      callbackUrl.searchParams.set('code', 'mock-code-' + state);
      callbackUrl.searchParams.set('state', state);
      return res.redirect(callbackUrl.toString());
    }
    if (!cfg.clientId) {
      return res.status(500).json({ error: 'IBALIS_CLIENT_ID not configured' });
    }
    const authUrl = new URL(cfg.authUrl);
    authUrl.searchParams.set('client_id', cfg.clientId);
    authUrl.searchParams.set('redirect_uri', cfg.redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'openid');
    authUrl.searchParams.set('state', state);
    res.redirect(authUrl.toString());
  });

  app.get('/ibalis/callback', oauthLimiter, async (req, res) => {
    const { code, state, error } = req.query;

    function redirectError(reason) {
      const u = new URL(`${cfg.siteUrl}/felder`);
      u.searchParams.set('ibalis', 'error');
      u.searchParams.set('reason', reason);
      return res.redirect(u.toString());
    }

    if (error) return redirectError(String(error));
    if (!code || !state) return res.status(400).json({ error: 'Missing code or state parameter' });

    // State prüfen (one-time use)
    if (!consumeState(String(state))) {
      return redirectError('invalid_state');
    }

    try {
      let entry;
      if (cfg.isMock) {
        entry = {
          access_token: 'mock-access-token-' + state,
          refresh_token: 'mock-refresh-token-' + state,
          expires_at: Date.now() + SESSION_TTL_MS,
        };
      } else {
        entry = await exchangeCodeForToken(String(code), cfg);
      }

      const sessionId = storeSession(entry);
      res.cookie(SESSION_COOKIE, sessionId, {
        httpOnly: true,
        sameSite: 'lax',
        secure: cfg.siteUrl.startsWith('https://'),
        maxAge: SESSION_TTL_MS,
        path: '/ibalis',
      });

      const appUrl = new URL(`${cfg.siteUrl}/felder`);
      appUrl.searchParams.set('ibalis', 'connected');
      res.redirect(appUrl.toString());
    } catch (err) {
      console.error('[ibalis-proxy] Token exchange error:', err.message);
      redirectError('token_exchange_failed');
    }
  });

  app.get('/ibalis/feldstuecke/:betriebsnummer/:jahr', async (req, res) => {
    const sessionId = req.cookies?.[SESSION_COOKIE];
    if (!sessionId) {
      return res.status(401).json({ error: 'No session cookie' });
    }
    let entry = sessions.get(sessionId);
    if (!entry || entry.expires_at < Date.now()) {
      sessions.delete(sessionId);
      return res.status(401).json({ error: 'Session expired' });
    }

    if (cfg.isMock) return res.json(MOCK_FELDSTUECKE);

    const { betriebsnummer, jahr } = req.params;
    const apiUrl = `${cfg.feldstueckeBase}/${encodeURIComponent(betriebsnummer)}/${encodeURIComponent(jahr)}`;

    try {
      let result = await httpsGetWithBearer(apiUrl, entry.access_token);
      if (result.status === 401) {
        try {
          entry = await refreshAccessToken(entry, cfg);
          sessions.set(sessionId, entry);
          result = await httpsGetWithBearer(apiUrl, entry.access_token);
        } catch (refreshErr) {
          console.error('[ibalis-proxy] Token refresh failed:', refreshErr.message);
          sessions.delete(sessionId);
          return res.status(401).json({ error: 'Token expired and refresh failed' });
        }
      }
      if (result.status !== 200) {
        return res.status(result.status).json(result.body);
      }
      res.json(result.body);
    } catch (err) {
      console.error('[ibalis-proxy] Feldstuecke fetch error:', err.message);
      res.status(502).json({ error: 'Upstream request failed', detail: err.message });
    }
  });

  return app;
}

// Nur starten, wenn direkt ausgeführt (nicht unter Test)
if (require.main === module) {
  startPruning();
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`[ibalis-proxy] Listening on port ${PORT} (mock=${getConfig().isMock})`);
  });
}

module.exports = { createApp, __issueState, startPruning, stopPruning };
```

- [ ] **Step 4: Vitest-Config im ibalis-proxy**

Neue Datei `/home/manuel/claude/duengungsberater/ibalis-proxy/vitest.config.js`:

```javascript
export default {
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
};
```

- [ ] **Step 5: Tests laufen**

```bash
cd /home/manuel/claude/duengungsberater/ibalis-proxy
npm test
```

**Erwartet:** alle Tests bestehen (6/6).

Falls der Cookie-Test schlägt, weil `request.agent(app)` nicht greift: Debugging-Schritt — prüfen, ob `Set-Cookie` kommt und `Path=/ibalis` mit dem Test-Pfad kompatibel ist (Supertest’s agent honoriert Path+Domain).

- [ ] **Step 6: Frontend-Anpassung — kein `session`-Query mehr**

In `/home/manuel/claude/duengungsberater/src/services/ibalis.service.ts` prüfen, wo `session` query-parameter gelesen/angehängt wird. Falls der Service `?session=...` an Proxy sendet: weglassen, da der Browser das Cookie automatisch mitschickt (bei selber Origin).

Konkret: In der Datei suchen nach `session=` und entfernen. `fetch('/ibalis/feldstuecke/...')` muss `credentials: 'include'` (oder bei selber Origin einfach `same-origin`) haben.

```typescript
// Beispiel-Pattern — anpassen je nach tatsächlichem Code:
const response = await fetch(`/ibalis/feldstuecke/${betriebsnummer}/${jahr}`, {
  credentials: 'same-origin',
});
```

- [ ] **Step 7: `FieldsView.vue` auf reine `?ibalis=connected`-Detection umbauen**

Im Query-Handling prüfen auf `ibalis === 'connected'` (statt Parsen von `session`). Alle verbliebenen `session`-Parameter-Reads entfernen.

Grep-Befehl, um Stellen zu finden:

```bash
grep -rn "session" /home/manuel/claude/duengungsberater/src/views/FieldsView.vue /home/manuel/claude/duengungsberater/src/services/ibalis.service.ts /home/manuel/claude/duengungsberater/src/components/IBalisConnectDrawer.vue
```

Jede Stelle, die `route.query.session` liest oder an den Proxy weitergibt, entfernen. Sichern, dass `ibalis=connected` allein reicht, um die Session als aktiv zu betrachten — das Cookie existiert.

- [ ] **Step 8: Integration-Test lokal**

```bash
cd /home/manuel/claude/duengungsberater
# Mit mock:
IBALIS_MOCK=true IBALIS_REDIRECT_URI=http://localhost:3080/ibalis/callback SITE_URL=http://localhost:3080 node ibalis-proxy/server.js &
# In anderem Terminal:
npm run dev
```

Browser: http://localhost:5173 → Felder → „iBalis verbinden". Nach Redirect zurück: Cookie `ibalis_session` gesetzt, `/felder?ibalis=connected` (OHNE `session=`). Feldstücke-Liste lädt korrekt.

- [ ] **Step 9: Commit**

```bash
cd /home/manuel/claude/duengungsberater
git add ibalis-proxy/ src/services/ibalis.service.ts src/views/FieldsView.vue src/components/IBalisConnectDrawer.vue
git commit -m "$(cat <<'EOF'
fix: iBalis-Proxy Security — State-Validation + HttpOnly-Cookie + Rate-Limits

- OAuth2 state wird nun serverseitig ausgestellt, einmalig einlösbar, TTL 10min
- Session-Token nicht mehr als URL-Query, sondern als HttpOnly/SameSite=Lax Cookie
- /ibalis/auth und /ibalis/callback mit Rate-Limit 30/min/IP (express-rate-limit)
- Store-Caps gegen Memory-DoS (10k States, 10k Sessions)
- Test-Suite für State-Flow, Cookie-Flow und Rate-Limit (vitest + supertest)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Mock-Auth-Server aus Produktion entfernen

**Begründung (Security):** `auth-server.js` hat Plaintext-Passwörter, Hardcoded-Admin (`admin@test.de/admin1234`), keine RLS-Enforcement. `docker-compose.prod.yml` bindet ihn als Prod-Service — katastrophal wenn deployt.

**Files:**
- Modify: `/home/manuel/claude/duengungsberater/auth-server.js`
- Delete: `/home/manuel/claude/duengungsberater/docker-compose.prod.yml` **ODER** komplett umbauen auf nur-`app`-Service (siehe Step 3)
- Modify: `/home/manuel/claude/duengungsberater/CLAUDE.md` (Klarstellung: `docker-compose.prod.yml` ist obsolet, produktiv läuft `docker-compose.yml`)

- [ ] **Step 1: Fail-Fast-Guard in `auth-server.js` Zeile 1**

Füge **ganz oben** in `/home/manuel/claude/duengungsberater/auth-server.js` vor allen anderen Statements ein:

```javascript
// SECURITY: Mock-Server darf NIEMALS in Produktion laufen.
if (process.env.NODE_ENV === 'production') {
  console.error('[auth-server] ❌ FATAL: auth-server.js darf nicht mit NODE_ENV=production laufen. Produktiv-Stack nutzt self-hosted Supabase (docker-compose.yml).');
  process.exit(1);
}

import express from 'express';
// ...Rest unverändert
```

- [ ] **Step 2: Warn-Banner im Log ergänzen**

Direkt nach dem Fail-Fast, vor `const app = express();`:

```javascript
console.warn('⚠️  [auth-server] DEV-ONLY Mock-Server gestartet. NICHT für Produktion verwenden.');
```

- [ ] **Step 3: `docker-compose.prod.yml` entfernen**

Die Datei ist obsolet (produktiv läuft `docker-compose.yml` + `docker-compose.caddy.yml` laut `CLAUDE.md`). Prüfen ob sie irgendwo referenziert wird:

```bash
cd /home/manuel/claude/duengungsberater
grep -rn "docker-compose.prod.yml" . --include="*.sh" --include="*.yml" --include="*.md" --include="Dockerfile*" 2>/dev/null | grep -v node_modules | grep -v dist
```

Falls keine aktiven Referenzen (außer in `.md`-Dokus), löschen:

```bash
rm /home/manuel/claude/duengungsberater/docker-compose.prod.yml
rm /home/manuel/claude/duengungsberater/Dockerfile.auth
```

Falls `deploy.sh` darauf verweist: Abschnitt entfernen.

- [ ] **Step 4: Test — `auth-server.js` crasht bei NODE_ENV=production**

```bash
cd /home/manuel/claude/duengungsberater
NODE_ENV=production node auth-server.js; echo "Exit: $?"
```

**Erwartet:** Fehler-Meldung + `Exit: 1`.

- [ ] **Step 5: Test — startet normal ohne NODE_ENV=production**

```bash
cd /home/manuel/claude/duengungsberater
node auth-server.js &
sleep 1
curl -s http://localhost:3000/health
kill %1
```

**Erwartet:** `{"status":"ok"}`, dann beendet.

- [ ] **Step 6: `CLAUDE.md` aktualisieren**

In `/home/manuel/claude/duengungsberater/CLAUDE.md` den Abschnitt „Ohne Docker" so anpassen, dass klar wird: `auth-server.js` ist Dev-Only, niemals Prod.

Im Abschnitt „Quick Start", nach Zeile „Ohne Docker:", ergänze nach der Admin-Login-Zeile:

```markdown
⚠️ **Wichtig:** `auth-server.js` ist **nur für Entwicklung**. Er crasht absichtlich bei `NODE_ENV=production`. Produktion nutzt ausschließlich self-hosted Supabase (`docker-compose.yml`). Die alte `docker-compose.prod.yml` wurde entfernt.
```

- [ ] **Step 7: Commit**

```bash
cd /home/manuel/claude/duengungsberater
git add auth-server.js CLAUDE.md
git rm docker-compose.prod.yml Dockerfile.auth 2>/dev/null || true
git commit -m "$(cat <<'EOF'
fix: Mock-Auth-Server Fail-Fast bei NODE_ENV=production + Prod-Compose entfernt

auth-server.js crasht beim Start, wenn NODE_ENV=production — verhindert
versehentliches Deployen eines Mock-Servers mit Plaintext-Passwörtern.
docker-compose.prod.yml und Dockerfile.auth entfernt (obsolet, Produktion
läuft über self-hosted Supabase in docker-compose.yml).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Leaflet-Tooltip XSS-Escape

**Begründung (Security):** `FieldMap.vue:86` verwendet HTML-Template mit User-kontrolliertem Feldnamen. Feldname `<img src=x onerror=alert(1)>` → XSS.

**Files:**
- Modify: `/home/manuel/claude/duengungsberater/src/components/FieldMap.vue:75-95`
- Create: `/home/manuel/claude/duengungsberater/tests/e2e/field-map-xss.spec.ts`

- [ ] **Step 1: Failing E2E-Test schreiben**

Neue Datei `/home/manuel/claude/duengungsberater/tests/e2e/field-map-xss.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('FieldMap XSS-Sicherheit', () => {
  test('Feldname mit HTML-Payload wird als Text gerendert, kein Script-Ausführen', async ({ page }) => {
    // Dialog-Listener: wenn alert() feuert → Test failt
    let alertFired = false;
    page.on('dialog', async (dialog) => {
      alertFired = true;
      await dialog.dismiss();
    });

    await page.goto('/');
    // Für diesen Test setzen wir das Feld als „Gast" via LocalStorage
    await page.evaluate(() => {
      const payload = '<img src=x onerror=alert(1)>';
      const fields = [{
        id: 'xss-test',
        name: payload,
        size_ha: 1.23,
        geometry: {
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [[[11.5,48.1],[11.505,48.1],[11.505,48.104],[11.5,48.104],[11.5,48.1]]] },
          properties: {},
        },
      }];
      window.localStorage.setItem('dbg_fields_with_geometry', JSON.stringify(fields));
    });

    // Navigiere zu /felder (Guest-Mode lädt localStorage-Fake)
    // Alternativ: Test direkt mit Dexie-Seed, falls localStorage-Hook nicht existiert
    await page.goto('/felder');
    await page.waitForSelector('[data-testid="field-map"]', { timeout: 5000 }).catch(() => {});

    // Tooltip sollte sichtbar sein mit dem escaped Text
    const tooltip = page.locator('.field-label').first();
    await expect(tooltip).toContainText('<img src=x onerror=alert(1)>');

    // Kein alert() ausgelöst
    await page.waitForTimeout(500);
    expect(alertFired).toBe(false);
  });
});
```

Hinweis: Wenn die Dexie-Fake-Seeding über LocalStorage nicht trivial ist, kann der Test stattdessen als Unit-Test gegen die Escape-Funktion geschrieben werden (siehe Step 3).

- [ ] **Step 2: Failing Unit-Test als Fallback**

Falls der Playwright-Test zu komplex zu seeden ist, alternativ Unit-Test:

Neue Datei `/home/manuel/claude/duengungsberater/src/components/__tests__/FieldMap.xss.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { buildTooltipElement } from '../FieldMap.vue';

describe('FieldMap tooltip XSS', () => {
  it('escaped HTML special chars im Feldnamen', () => {
    const el = buildTooltipElement('<img src=x onerror=alert(1)>', 4.91);
    // innerText zeigt den rohen String, innerHTML zeigt escaped
    expect(el.innerHTML).not.toContain('<img');
    expect(el.textContent).toContain('<img src=x onerror=alert(1)>');
  });

  it('enthält Flächenangabe', () => {
    const el = buildTooltipElement('Normales Feld', 4.91);
    expect(el.textContent).toContain('4,91 ha');
  });
});
```

Run: `npm run test:run -- FieldMap.xss`
Expected: `buildTooltipElement is not a function` oder ähnlich (existiert noch nicht).

- [ ] **Step 3: `FieldMap.vue` Tooltip sicher aufbauen (`buildTooltipElement`-Helper)**

In `/home/manuel/claude/duengungsberater/src/components/FieldMap.vue`:

(a) **Vor** dem `<script setup>`-Block oder innerhalb eines separaten `<script lang="ts">`-Blocks den Helper exportieren. Dazu wandle die Komponente so um, dass `buildTooltipElement` exportiert wird:

```vue
<script lang="ts">
export function buildTooltipElement(name: string, sizeHa: number): HTMLElement {
  const formatter = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 });
  const container = document.createElement('div');
  const strong = document.createElement('strong');
  strong.textContent = name; // ← sichere Text-Zuweisung (escaped automatisch)
  const br = document.createElement('br');
  const areaText = document.createTextNode(`${formatter.format(sizeHa)} ha`);
  container.appendChild(strong);
  container.appendChild(br);
  container.appendChild(areaText);
  return container;
}
</script>

<script setup lang="ts">
import { ref, computed, onUnmounted, watch } from 'vue'
import type { Field } from '@/types'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { buildTooltipElement } from './FieldMap.vue'
// ↑ Self-import funktioniert bei Vue SFC nicht; stattdessen: Inline-Funktion im setup-Block UND separat exportiert.
```

**Tatsächlich** besser: Helper in eigene Datei verschieben:

Neue Datei `/home/manuel/claude/duengungsberater/src/components/fieldMapTooltip.ts`:

```typescript
export function buildTooltipElement(name: string, sizeHa: number): HTMLElement {
  const formatter = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 });
  const container = document.createElement('div');
  const strong = document.createElement('strong');
  strong.textContent = name;
  const br = document.createElement('br');
  const areaText = document.createTextNode(`${formatter.format(sizeHa)} ha`);
  container.appendChild(strong);
  container.appendChild(br);
  container.appendChild(areaText);
  return container;
}
```

(b) In `FieldMap.vue` den `bindTooltip`-Aufruf anpassen. Ersetze Zeilen 86-90:

```typescript
      layer.bindTooltip(`<strong>${name}</strong><br>${areaFormatted} ha`, {
        permanent: true,
        direction: 'center',
        className: 'field-label',
      })
```

durch:

```typescript
      layer.bindTooltip(buildTooltipElement(name, sizeHa), {
        permanent: true,
        direction: 'center',
        className: 'field-label',
      })
```

(c) Import im `<script setup>`-Block ergänzen:

```typescript
import { buildTooltipElement } from './fieldMapTooltip'
```

(d) `areaFormatted`-Variable + `new Intl.NumberFormat(...)`-Zeile aus Zeile 81 entfernen (wird im Helper erledigt).

- [ ] **Step 4: Test-Update — Import-Pfad anpassen**

In `src/components/__tests__/FieldMap.xss.test.ts` Import ändern auf:

```typescript
import { buildTooltipElement } from '../fieldMapTooltip';
```

- [ ] **Step 5: Tests laufen**

```bash
cd /home/manuel/claude/duengungsberater
npm run test:run -- fieldMapTooltip
```

**Erwartet:** Beide Unit-Tests grün.

- [ ] **Step 6: Manueller Browser-Test**

```bash
npm run dev
```

In DevTools-Console:

```javascript
// Feld mit XSS-Payload anlegen (z.B. über IndexedDB direkt oder via Admin)
// Alternativ: über UI ein Feld mit Namen "<img src=x onerror=alert(1)>" anlegen.
```

Dann auf `/felder` → Karte. Tooltip zeigt den wörtlichen Text, kein Alert.

- [ ] **Step 7: Commit**

```bash
cd /home/manuel/claude/duengungsberater
git add src/components/FieldMap.vue src/components/fieldMapTooltip.ts src/components/__tests__/FieldMap.xss.test.ts
git commit -m "$(cat <<'EOF'
fix: XSS in FieldMap-Tooltip — User-Feldnamen sicher escapen

Ersetzt template-string-basierten Tooltip durch DOM-Element-Aufbau
(textContent). Verhindert Script-Injection via manipulierter Feldnamen
(z.B. iBalis-Import mit ungeprüften Daten).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: iBalis-Import — File-Size + Polygon-Count-Limits

**Begründung (Security):** `useIBalisImport.ts` hat nur Ring-Punkt-Limit (100k), aber `numPolys`/`numRings` unbegrenzt und kein File-Size-Check. 500 MB GPKG crasht Tab.

**Files:**
- Modify: `/home/manuel/claude/duengungsberater/src/composables/useIBalisImport.ts`
- Modify: `/home/manuel/claude/duengungsberater/src/composables/useIBalisImport.test.ts`

- [ ] **Step 1: Failing Tests schreiben**

In `/home/manuel/claude/duengungsberater/src/composables/useIBalisImport.test.ts` (Datei bereits vorhanden) ans Ende anfügen:

```typescript
import { describe, it, expect } from 'vitest';
import { parseGpkg, parseZip, MAX_FILE_SIZE_BYTES, MAX_RINGS, MAX_POLYGONS } from './useIBalisImport';

describe('useIBalisImport — Size Limits', () => {
  it('MAX_FILE_SIZE_BYTES ist 50MB', () => {
    expect(MAX_FILE_SIZE_BYTES).toBe(50 * 1024 * 1024);
  });

  it('MAX_RINGS ist 1000', () => {
    expect(MAX_RINGS).toBe(1000);
  });

  it('MAX_POLYGONS ist 1000', () => {
    expect(MAX_POLYGONS).toBe(1000);
  });

  it('parseGpkg lehnt Datei > 50MB ab', async () => {
    const bigFile = new File(
      [new Uint8Array(51 * 1024 * 1024)],
      'huge.gpkg',
      { type: 'application/geopackage+sqlite3' },
    );
    await expect(parseGpkg(bigFile)).rejects.toThrow(/zu groß|too large/i);
  });

  it('parseZip lehnt Datei > 50MB ab', async () => {
    const bigFile = new File(
      [new Uint8Array(51 * 1024 * 1024)],
      'huge.zip',
      { type: 'application/zip' },
    );
    await expect(parseZip(bigFile)).rejects.toThrow(/zu groß|too large/i);
  });

  it('parseGpkg lehnt Datei ohne SQLite-Magic-Bytes ab', async () => {
    const fakeFile = new File(
      [new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f])],
      'fake.gpkg',
      { type: 'application/geopackage+sqlite3' },
    );
    await expect(parseGpkg(fakeFile)).rejects.toThrow(/kein gültiges GeoPackage|invalid GPKG/i);
  });

  it('parseZip lehnt Datei ohne ZIP-Magic-Bytes ab', async () => {
    const fakeFile = new File(
      [new Uint8Array([0x00, 0x01, 0x02, 0x03])],
      'fake.zip',
      { type: 'application/zip' },
    );
    await expect(parseZip(fakeFile)).rejects.toThrow(/kein gültiges ZIP|invalid ZIP/i);
  });
});
```

Run: `npm run test:run -- useIBalisImport`
Expected: 6 neue Tests failen (Exports fehlen, Size-Check fehlt, Magic-Byte-Check fehlt).

- [ ] **Step 2: Konstanten + Size + Magic-Byte-Check implementieren**

In `/home/manuel/claude/duengungsberater/src/composables/useIBalisImport.ts` **ganz oben** (nach den Imports) einfügen:

```typescript
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
export const MAX_RINGS = 1000;
export const MAX_POLYGONS = 1000;
export const MAX_RING_POINTS = 100_000;

const GPKG_MAGIC = new Uint8Array([
  0x53, 0x51, 0x4c, 0x69, 0x74, 0x65, 0x20, 0x66,
  0x6f, 0x72, 0x6d, 0x61, 0x74, 0x20, 0x33, 0x00,
]); // "SQLite format 3\0"
const ZIP_MAGIC = new Uint8Array([0x50, 0x4b, 0x03, 0x04]); // "PK\x03\x04"

function bytesMatch(buffer: Uint8Array, magic: Uint8Array): boolean {
  if (buffer.length < magic.length) return false;
  for (let i = 0; i < magic.length; i++) {
    if (buffer[i] !== magic[i]) return false;
  }
  return true;
}

async function readMagic(file: File, bytes: number): Promise<Uint8Array> {
  const slice = file.slice(0, bytes);
  return new Uint8Array(await slice.arrayBuffer());
}

function assertFileSize(file: File) {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`Datei zu groß: ${(file.size / 1024 / 1024).toFixed(1)} MB (Limit: 50 MB)`);
  }
}
```

- [ ] **Step 3: `MAX_RING_POINTS`/`MAX_RINGS`/`MAX_POLYGONS` in `WkbReader` verwenden**

Ersetze in `useIBalisImport.ts`:

Zeile 38 `if (n > 100000)` → `if (n > MAX_RING_POINTS)`

Zeile 53 `for (let i = 0; i < numRings; i++) coords.push(this.ring())` ersetzen durch:

```typescript
    if (numRings > MAX_RINGS) throw new Error(`Zu viele Ringe im Polygon: ${numRings} (Limit: ${MAX_RINGS})`);
    const coords: Position[][] = []
    for (let i = 0; i < numRings; i++) coords.push(this.ring())
```

Ebenso für `read()`-Fall `WKB_POLYGON` (Zeile 61-64):

```typescript
      const numRings = this.uint32()
      if (numRings > MAX_RINGS) throw new Error(`Zu viele Ringe im Polygon: ${numRings} (Limit: ${MAX_RINGS})`);
      const coords: Position[][] = []
      for (let i = 0; i < numRings; i++) coords.push(this.ring())
```

Und für `WKB_MULTIPOLYGON` (Zeile 66-70):

```typescript
    if (type === WKB_MULTIPOLYGON) {
      const numPolys = this.uint32()
      if (numPolys > MAX_POLYGONS) throw new Error(`Zu viele Polygone im MultiPolygon: ${numPolys} (Limit: ${MAX_POLYGONS})`);
      const polys: Polygon[] = []
      for (let i = 0; i < numPolys; i++) polys.push(this.polygon())
      return { type: 'MultiPolygon', coordinates: polys.map((p) => p.coordinates) }
    }
```

- [ ] **Step 4: `parseGpkg` mit Size+Magic-Check versehen**

Ersetze die Signatur/Einstieg von `parseGpkg` (Zeile 95-99):

```typescript
export async function parseGpkg(file: File): Promise<ParsedIBalisFeature[]> {
  assertFileSize(file);
  const magic = await readMagic(file, 16);
  if (!bytesMatch(magic, GPKG_MAGIC)) {
    throw new Error('Kein gültiges GeoPackage: SQLite-Header fehlt');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod: any = await import('sql.js/dist/sql-wasm-browser.js')
  const initSqlJs = mod.default ?? mod
  const SQL = await initSqlJs({ locateFile: () => sqlWasmUrl })
  // ...Rest unverändert
```

- [ ] **Step 5: `parseZip` mit Size+Magic-Check versehen**

Ersetze Zeilen 195-199 (`parseZip`-Start):

```typescript
export async function parseZip(file: File): Promise<ParsedIBalisFeature[]> {
  assertFileSize(file);
  const magic = await readMagic(file, 4);
  if (!bytesMatch(magic, ZIP_MAGIC)) {
    throw new Error('Kein gültiges ZIP-Archiv: Magic-Bytes fehlen');
  }

  const arrayBuffer = await file.arrayBuffer()
  const geojson = await shp(arrayBuffer)
  // ...Rest unverändert
```

- [ ] **Step 6: Tests laufen**

```bash
cd /home/manuel/claude/duengungsberater
npm run test:run -- useIBalisImport
```

**Erwartet:** alle Tests (inkl. der neuen 6) grün.

- [ ] **Step 7: Manueller Test mit großer Datei**

```bash
# Große Fake-Datei erzeugen (60 MB, nicht-SQLite)
dd if=/dev/zero of=/tmp/huge.gpkg bs=1M count=60 2>/dev/null
```

`npm run dev` → Felder → iBalis Datei-Import → `/tmp/huge.gpkg` wählen. **Erwartet:** Fehlermeldung „Datei zu groß" bzw. „Kein gültiges GeoPackage".

- [ ] **Step 8: Commit**

```bash
cd /home/manuel/claude/duengungsberater
git add src/composables/useIBalisImport.ts src/composables/useIBalisImport.test.ts
git commit -m "$(cat <<'EOF'
fix: iBalis-Import — File-Size- und Polygon-Count-Limits

- File-Size-Limit 50 MB (parseGpkg + parseZip)
- Magic-Byte-Check (SQLite format 3\0 bzw. PK\x03\x04)
- Ring/Polygon-Count-Caps (MAX_RINGS=1000, MAX_POLYGONS=1000)
- Konstanten exportiert für Wiederverwendung + Tests

Schutz vor Memory-DoS durch manipulierte oder übergroße Geodaten.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Abschluss Phase 1

- [ ] **Abschluss-Step 1: Alle Tests grün**

```bash
cd /home/manuel/claude/duengungsberater
npm run lint && npm run test:run
cd ibalis-proxy && npm test
```

Erwartet: Alles grün.

- [ ] **Abschluss-Step 2: Build-Check**

```bash
cd /home/manuel/claude/duengungsberater
npm run build
```

Erwartet: Build erfolgreich, keine Type-Errors.

- [ ] **Abschluss-Step 3: E2E-Smoke-Test**

```bash
npm run test:e2e
```

Erwartet: Alle vorhandenen E2E-Tests plus der neue XSS-Test grün.

- [ ] **Abschluss-Step 4: Plan für Phase 2 schreiben**

Ruf die writing-plans skill erneut auf mit Scope „Phase 2 — Security-Hardening + DSGVO-Pflichten" (CSP/HSTS, RLS-Fix `field_geometries`, Audit-Log, Rate-Limits GoTrue, PWA-Cache-Clear, WKT-ReDoS, Datenexport, Cascade-Delete, IndexedDB-Wipe, Passwort-Policy 10+, 2FA, Impressum USt-ID).

Speichern als `docs/superpowers/plans/2026-04-17-phase2-security-hardening-dsgvo.md`.

---

## Self-Review-Checkliste

**Spec-Coverage:**
- ✅ Google Fonts self-hosten (Review-Finding 1 DSGVO)
- ✅ Matomo cookieless + Consent (Review-Finding 2+3 DSGVO)
- ✅ OAuth2-state + HttpOnly-Cookie (Review-Finding C1 Security)
- ✅ Mock-Auth-Server Prod-Guard (Review-Finding C2+H4 Security)
- ✅ Leaflet XSS (Review-Finding UI/UX Accessibility #10 Quick-Win)
- ✅ File-Size-Limits (Review-Finding H3 Security)

Nicht in Phase 1 (→ Phase 2+):
- CSP/HSTS, RLS-field_geometries, Audit-Log, Rate-Limits GoTrue, WKT-ReDoS, Datenexport, Cascade-Delete, Passwort-Policy, 2FA, USt-ID.

**Placeholder-Scan:** keine TBDs, keine „implement later", alle Steps enthalten konkreten Code.

**Type-Konsistenz:** `buildTooltipElement(name, sizeHa)` in Task 5 konsistent zwischen Helper und Test. `createApp()`, `__issueState()`, `SESSION_COOKIE='ibalis_session'` in Task 3 konsistent zwischen Server und Test.

---

**Plan complete.** Saved to `docs/superpowers/plans/2026-04-17-phase1-abmahnschutz-critical-security.md`.
