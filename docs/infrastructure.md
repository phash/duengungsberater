# Infrastruktur

## VPS (IONOS)

- **IP:** 82.165.40.140
- **OS:** Ubuntu
- **Standort:** `/opt/duengungsberater`
- **Domain:** `duenger.mr-development.de`
- **DNS:** A-Record `duenger` → `82.165.40.140` bei IONOS

---

## Caddy (Reverse Proxy)

- **Standort:** `/opt/caddyserver`
- **Config:** `duenger.mr-development.de` Block in `/opt/caddyserver/Caddyfile`
- **HTTPS:** Automatisch via Caddy (Let's Encrypt)
- **CSP:** Erlaubt `musikersuche.org` für Matomo-Tracking

```bash
# Caddy reload (nach Caddyfile-Änderungen):
cd /opt/caddyserver && git pull && docker compose restart caddy
```

`docker-compose.caddy.yml` bindet die App ins `caddy-proxy` Network ein (Port 3090 intern, kein öffentliches Port-Binding).

---

## Docker-Mailserver

- **Standort:** `/opt/mailserver`
- **Domain:** `mail.mr-development.de`
- **SMTP:** Port 587 (STARTTLS)
- **Absender:** `noreply@mr-development.de`
- **Network:** `shared-services` (GoTrue verbindet über `host-gateway`)

```bash
# Account anlegen:
docker exec mailserver setup email add noreply@mr-development.de PASSWORT

# SMTP-Config in .env:
SMTP_USER=noreply@mr-development.de
SMTP_PASS=...
```

GoTrue (auth-Container) verbindet über `extra_hosts: mail.mr-development.de:host-gateway` — Hostname muss zum TLS-Cert passen.

---

## Matomo (Analytics)

- **URL:** Self-hosted auf `musikersuche.org/matomo/`
- **Site ID:** 3
- **Tracking:** In Landing Page eingebunden
- **CSP:** In Caddyfile erlaubt (`script-src`, `img-src`, `connect-src`)

---

## iBalis (Agrardatennetzwerk Bayern)

- **Proxy:** `ibalis-proxy/` Container (Express.js, Port 3100)
- **OAuth2:** Authorization Code Flow über StMELF
- **Status:** Client-Registrierung beim StMELF ausstehend, Mock-Modus aktiv (`IBALIS_MOCK=true`)
- **Wenn Credentials da:** `IBALIS_CLIENT_ID`, `IBALIS_CLIENT_SECRET`, `IBALIS_MOCK=false` in `.env`
