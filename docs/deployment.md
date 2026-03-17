# Deployment-Guide

## Übersicht

Drei Docker-Setups:
- `docker-compose.yml` — lokale Entwicklung (Vite Dev-Server, HMR, Postgres auf 5433)
- `docker-compose.test.yml` — Testrechner (Vite Dev-Server + Cloudflare Tunnel)
- `docker-compose.prod.yml` — Produktion (Nginx, Prod-Build, kein HMR)

**Domain:** `duengungsberater.phash.de`
**VPS:** Multi-App-VPS mit nginx als Reverse Proxy

---

## Lokal (Entwicklung)

```bash
docker compose up --build    # Alle Services starten
docker compose down          # Alles stoppen
docker compose logs -f       # Logs verfolgen
```

**Services:**
- App: http://localhost:5173 (Vite Dev-Server mit HMR)
- Auth-Server: intern (Port 3000 im Container, kein Host-Binding)
- PostgreSQL: localhost:5433 (5432 war auf dem Host belegt), oder intern

---

## Testrechner (deploy.sh)

```bash
./deploy.sh                  # git pull → build → start → Tunnel-URL
./deploy.sh --keep-tunnel    # Alles neu bauen außer cloudflared (URL bleibt gleich)
./deploy.sh --prod           # Prod-Compose verwenden
./deploy.sh --local          # Lokales Compose verwenden
```

**Services in docker-compose.test.yml:**
- App: http://localhost:5173 (+ Cloudflare-Tunnel-URL)
- Auth-Server: nur intern erreichbar (kein Host-Port)
- PostgreSQL: nur intern erreichbar (kein Host-Port)
- cloudflared: Tunnel zu http://app:5173

---

## Produktion (VPS)

### Voraussetzungen

- Docker + Docker Compose auf dem VPS
- nginx installiert
- certbot für SSL

### 1. Docker-Services starten

```bash
POSTGRES_PASSWORD=sicheres_passwort docker compose -f docker-compose.prod.yml up -d --build
```

Oder mit `.env`-Datei:

```bash
# .env (nicht einchecken!)
POSTGRES_PASSWORD=sicheres_passwort
POSTGRES_USER=postgres
POSTGRES_DB=duengungsberater
```

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

**Services:**
- App: 127.0.0.1:8080 (nginx, statische Dateien)
- Auth-Server: 127.0.0.1:3000
- PostgreSQL: intern (kein exposed Port)

### 2. nginx VPS-Config einrichten

Config liegt in `docs/nginx-vps.conf`. Kopieren nach:

```bash
sudo cp docs/nginx-vps.conf /etc/nginx/sites-available/duengungsberater.phash.de
sudo ln -s /etc/nginx/sites-available/duengungsberater.phash.de /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 3. SSL-Zertifikat

```bash
sudo certbot --nginx -d duengungsberater.phash.de
```

certbot ergänzt die SSL-Direktiven automatisch in der nginx-Config.

### 4. Verify

```bash
curl -I https://duengungsberater.phash.de
# HTTP/2 200

docker compose -f docker-compose.prod.yml ps
# alle Services "running"
```

---

## Architektur (Produktion)

```
Browser
  └─► nginx (443/HTTPS)
        ├─► /auth/v1/*  →  duengungsberater-auth:3000  (Express Mock)
        ├─► /rest/v1/*  →  duengungsberater-auth:3000  (REST API)
        └─► /*          →  duengungsberater-app:80     (nginx static)
                                                            └─► dist/ (Vite Prod-Build)
  duengungsberater-auth
        └─► duengungsberater-postgres:5432
```

**Wichtig:** `VITE_SUPABASE_URL=https://duengungsberater.phash.de` wird zur Build-Zeit ins JS-Bundle gebacken. Bei Domain-Änderung muss das Image neu gebaut werden (`--build`).

---

## PWA / Offline

Die App ist eine PWA und kann auf dem Homescreen installiert werden. Voraussetzungen:
- HTTPS (Pflicht für Service Worker)
- Prod-Build (Dev-Server hat keinen Service Worker)

Der Service Worker cached:
- Alle statischen Assets (JS, CSS, HTML, SVG) — dauerhaft
- `/rest/v1/*` API-Responses — NetworkFirst, 7 Tage, max. 100 Einträge

---

## Updates deployen

```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

Der Prod-Build backt `VITE_SUPABASE_URL` zur Build-Zeit ein — kein separater Restart nötig.

---

## Dateien

| Datei | Zweck |
|---|---|
| `Dockerfile` | Dev-Image (Vite Dev-Server) |
| `Dockerfile.prod` | Prod-Image (Multi-stage: Build + nginx) |
| `Dockerfile.auth` | Auth-Server |
| `nginx.app.conf` | nginx-Config innerhalb des App-Containers |
| `docker-compose.yml` | Lokale Entwicklung |
| `docker-compose.test.yml` | Testrechner (Cloudflare Tunnel, keine Host-Ports für DB/Auth) |
| `docker-compose.prod.yml` | Produktion |
| `deploy.sh` | Deploy-Script: git pull + build + start + Tunnel-URL |
| `docs/nginx-vps.conf` | nginx Reverse Proxy für den VPS |
