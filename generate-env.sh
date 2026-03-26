#!/bin/bash
# Generiert eine sichere .env-Datei
# Usage: ./generate-env.sh [--force] [--prod]
#   --force  Bestehende .env überschreiben
#   --prod   Produktions-Werte (duenger.mr-development.de, echter Mailserver)

set -e

FORCE=false
PROD=false

for arg in "$@"; do
  case $arg in
    --force) FORCE=true ;;
    --prod)  PROD=true ;;
  esac
done

if [ -f .env ] && [ "$FORCE" != true ]; then
  echo "⚠️  .env existiert bereits. Verwende --force zum Überschreiben."
  exit 1
fi

echo "🔑 Generiere sichere .env..."

# URL-sichere Zeichen (keine +/= die postgres:// URLs zerstören)
JWT_SECRET=$(openssl rand -hex 32)
POSTGRES_PASSWORD=$(openssl rand -hex 16)

# Generate Supabase API keys from JWT_SECRET
ANON_PAYLOAD=$(echo -n '{"role":"anon","iss":"supabase","iat":1735689600,"exp":1893456000}' | openssl base64 -A | tr '+/' '-_' | tr -d '=')
SERVICE_PAYLOAD=$(echo -n '{"role":"service_role","iss":"supabase","iat":1735689600,"exp":1893456000}' | openssl base64 -A | tr '+/' '-_' | tr -d '=')
JWT_HEADER=$(echo -n '{"alg":"HS256","typ":"JWT"}' | openssl base64 -A | tr '+/' '-_' | tr -d '=')

sign_jwt() {
  local header_payload="$1.$2"
  local sig=$(echo -n "$header_payload" | openssl dgst -sha256 -hmac "$JWT_SECRET" -binary | openssl base64 -A | tr '+/' '-_' | tr -d '=')
  echo "$header_payload.$sig"
}

ANON_KEY=$(sign_jwt "$JWT_HEADER" "$ANON_PAYLOAD")
SERVICE_ROLE_KEY=$(sign_jwt "$JWT_HEADER" "$SERVICE_PAYLOAD")

if [ "$PROD" = true ]; then
  # ── Produktion: duenger.mr-development.de ──
  SMTP_PASS=$(openssl rand -hex 12)

  cat > .env << EOF
# ── Düngungsberater Produktion ──
# Generiert am $(date -Iseconds) von generate-env.sh --prod

SITE_URL=https://duenger.mr-development.de
MAILER_AUTOCONFIRM=false

POSTGRES_PASSWORD=$POSTGRES_PASSWORD
JWT_SECRET=$JWT_SECRET
ANON_KEY=$ANON_KEY
SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY

# SMTP (Docker-Mailserver)
SMTP_USER=noreply@mr-development.de
SMTP_PASS=$SMTP_PASS
EOF

  echo "✅ Prod-.env erstellt."
  echo ""
  echo "⚠️  SMTP-Account anlegen (einmalig):"
  echo "   docker exec mailserver setup email add noreply@mr-development.de $SMTP_PASS"
  echo ""
  echo "   Starte mit:"
  echo "   docker compose -f docker-compose.yml -f docker-compose.caddy.yml up -d --build"
else
  # ── Lokal / Test ──
  cat > .env << EOF
# ── Düngungsberater Lokal ──
# Generiert am $(date -Iseconds) von generate-env.sh

SITE_URL=http://localhost:3080
APP_PORT=3080
MAIL_PORT=9000
MAILER_AUTOCONFIRM=true

POSTGRES_PASSWORD=$POSTGRES_PASSWORD
JWT_SECRET=$JWT_SECRET
ANON_KEY=$ANON_KEY
SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY
EOF

  echo "✅ .env erstellt."
  echo "   Starte mit: docker compose up -d --build"
fi
