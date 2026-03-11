# ADR-004: PWA mit NetworkFirst-Caching

**Status:** Accepted
**Datum:** 2026-03-11

**Kontext:** Die App soll als PWA installierbar und offline nutzbar sein. Stammdaten werden in IndexedDB (Dexie.js) gecacht (ADR-002). Für die App-Shell und Assets wird ein Service Worker benötigt.

**Entscheidung:** vite-plugin-pwa mit Workbox. Strategie:
- App-Shell (JS/CSS/HTML): Precaching bei Install
- Supabase-API-Calls: NetworkFirst mit 24h Fallback-Cache
- Offline erstellte Daten: Dexie.js + Sync-Service (nicht im Service Worker)

**Konsequenzen:**
- App startet auch offline (aus dem Precache)
- API-Daten haben max. 24h Verzögerung im Offline-Fall
- autoUpdate sorgt für automatische SW-Updates ohne User-Interaktion
- Kein manuelles Cache-Management nötig — Workbox übernimmt Precache-Manifest
