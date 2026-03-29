# Deployment-Guide

## deploy.sh

Zentrales Deploy-Script für alle Umgebungen.

```bash
./deploy.sh                    # Lokal (Port 3080, ohne Caddy/Tunnel)
./deploy.sh --prod             # VPS mit Caddy-Override
./deploy.sh --tunnel           # Lokal mit Cloudflare-Tunnel
./deploy.sh --keep-tunnel      # Rebuild ohne Tunnel-Neustart (URL bleibt)
./deploy.sh --down             # Stoppen
./deploy.sh --reset            # Stoppen + Volumes löschen + Neustart
```

Kombinierbar: `./deploy.sh --prod --reset`

**Was deploy.sh macht:**
1. `.env` erstellen falls nicht vorhanden (aus `.env.docker`)
2. `git pull` (wenn Git-Repo)
3. `docker compose up -d --build` (mit passenden Compose-Files + Profilen)
4. Tunnel-URL / App-URL anzeigen

---

## Docker-Stack (Self-Hosted Supabase)

`docker-compose.yml` — Fullstack mit echtem Supabase (GoTrue + PostgREST):

| Service | Image | Port | Zweck |
|---------|-------|------|-------|
| `app` | nginx (Multi-stage Build) | 3080 | PWA + API Reverse Proxy |
| `db` | postgres:16-alpine | — | Datenbank |
| `auth` | supabase/gotrue:v2.158.1 | — | Authentifizierung |
| `rest` | postgrest/postgrest:v12.2.3 | — | REST API |
| `mail` | inbucket | 9000 | E-Mail-Catcher (lokal) |
| `migrate` | postgres (one-shot) | — | App-Migrationen + Seed (idempotent) |
| `ibalis-proxy` | node:20-alpine | 3100 | iBalis OAuth2 Proxy + API Relay |

### .env Konfiguration

Generiert von `generate-env.sh` (`--prod` für VPS, `--force` zum Überschreiben).

| Variable | Zweck |
|----------|-------|
| `SITE_URL` | Öffentliche URL (lokal: `http://localhost:3080`, VPS: `https://duenger.mr-development.de`) |
| `POSTGRES_PASSWORD` | DB-Passwort (hex-encoded, keine Sonderzeichen!) |
| `JWT_SECRET` | Supabase JWT Secret (hex-encoded) |
| `ANON_KEY`, `SERVICE_ROLE_KEY` | Supabase API Keys |
| `MAILER_AUTOCONFIRM` | `true` = kein E-Mail nötig, `false` = Bestätigungsmail |
| `IBALIS_MOCK` | `true` = Mock-Daten, `false` = echte iBalis API |
| `IBALIS_CLIENT_ID`, `IBALIS_CLIENT_SECRET` | OAuth2 Credentials vom StMELF (ausstehend) |

**WICHTIG:** `.env.docker` enthält nur Platzhalter (`REPLACE_ME`). Immer `generate-env.sh` verwenden!

### Docker-Dateien

| Datei | Zweck |
|---|---|
| `docker-compose.yml` | Self-Hosted Supabase Stack (Haupt-Setup) |
| `docker-compose.caddy.yml` | Produktion: Caddy-Network, echter Mailserver, kein Port-Binding |
| `docker-compose.test.yml` | Testrechner (Mock Auth + Cloudflared) |
| `Dockerfile` | Prod-Image (Multi-stage: node build → nginx serve) |
| `ibalis-proxy/` | iBalis OAuth2 Proxy-Service (Express.js) |
| `docker/nginx.conf` | nginx: SPA-Routing + API-Proxy (/auth/v1, /rest/v1, /ibalis/) |
| `docker/init-db/00-setup.sh` | DB-Init: Rollen (idempotent mit IF NOT EXISTS) |
| `docker/migrate.sh` | App-Migrationen mit Timeout + ON_ERROR_STOP |
| `docker/mail-templates/` | HTML E-Mail-Templates (Terrain-Design) |
| `deploy.sh` | Deploy-Script (--prod, --tunnel, --down, --reset) |
| `generate-env.sh` | Sichere .env generieren |

---

## Produktion (VPS)

### Erstmaliges Setup

```bash
bash generate-env.sh --prod --force
# SMTP_PASS in .env prüfen, dann Mailserver-Account anlegen:
docker exec mailserver setup email add noreply@mr-development.de SMTP_PASS_AUS_ENV
```

### Deployment

```bash
git pull && ./deploy.sh --prod
```

### Admin-User setzen

Admin-Rolle wird über `app_metadata.role` im JWT geprüft (`is_admin()` SQL-Funktion).

```bash
# Status prüfen:
docker compose exec db psql -U postgres -d postgres -c \
  "SELECT email, raw_app_meta_data->>'role' as role FROM auth.users;"

# Admin setzen:
docker compose exec db psql -U postgres -d postgres -c \
  "UPDATE auth.users SET raw_app_meta_data = raw_app_meta_data || '{\"role\": \"admin\"}' WHERE email = 'EMAIL';"
```

Danach Logout + Login nötig (JWT wird beim Login neu erstellt).

---

## Gotchas

1. **Passwörter/Keys hex-encoded** — keine `+`/`=`/`/` die PostgreSQL-URLs brechen
2. **Docker build cache** — `--no-cache` wenn Frontend-Änderungen nicht greifen
3. **ibalis-proxy muss laufen** — sonst crasht nginx (Upstream not found)
4. **PostgREST Schema-Cache** — nach neuen DB-Funktionen/Views: `docker compose restart rest`
5. **App-Container + Caddy-Network** — wird automatisch eingebunden (kein manuelles `docker network connect` nötig, solange ohne `--no-deps` gestartet)
6. **GoTrue E-Mail-Templates** — erfordern HTTP-URLs, nicht Dateipfade (Templates in `public/mail-*.html`)
7. **Gmail/Outlook Linkscanner** — verbrauchen One-Time-Tokens, VerifyView zeigt trotzdem Erfolg
8. **PWA Service Worker** — pollt alle 60s auf Updates. Nach Major-Deploys ggf. Ctrl+Shift+R
9. **VPS terminal copy-paste** — Befehle als Single-Line oder mit `&&` verketten
