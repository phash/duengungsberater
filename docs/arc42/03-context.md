# 3. Kontextabgrenzung

## Fachlicher Kontext

```
┌─────────────┐       ┌─────────────────────┐       ┌──────────────────┐
│  Landwirt    │──────▶│  Düngungsberater     │──────▶│  Dünger-Shop.de  │
│  (Browser)   │◀──────│  (PWA)               │       │  (Affiliate)     │
└─────────────┘       └──────────┬────────────┘       └──────────────────┘
                                 │
                                 ▼
                      ┌─────────────────────┐
                      │  Supabase            │
                      │  (Auth, DB, RLS)     │
                      └─────────────────────┘
```

| Nachbar | Beschreibung |
|---|---|
| Landwirt | Nutzt die PWA im Browser (mobil/Desktop). Legt Felder an, plant Anbau, erhält Düngeempfehlung. |
| Supabase | Backend-as-a-Service: Authentifizierung, PostgreSQL-Datenbank mit Row Level Security, Echtzeit-Sync. |
| LfL Basisdaten | Amtliche Referenzdaten der Bayerischen Landesanstalt für Landwirtschaft. Initial als Seed-Daten importiert, über Admin-Bereich pflegbar. |
| Dünger-Shop.de | Affiliate-Partner. Produktempfehlungen verlinken auf den Shop (15% Commission via adseed GmbH). |

## Technischer Kontext

| Kanal | Technologie |
|---|---|
| PWA ↔ Supabase | HTTPS (REST + Realtime WebSocket) |
| PWA ↔ IndexedDB | Dexie.js (lokaler Offline-Cache) |
| PWA ↔ Dünger-Shop | HTTP-Redirect (Affiliate-Link) |
| Admin ↔ Supabase | HTTPS (gleiche API, rollenbasiert) |
