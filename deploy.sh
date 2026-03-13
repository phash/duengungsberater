#!/bin/bash
set -e

# ─── Compose-File bestimmen ───────────────────────────────────────────────────
# Standard: docker-compose.test.yml
# Optionen: --test | --prod | --local | COMPOSE_FILE=... deploy.sh

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.test.yml}"

for arg in "$@"; do
  case $arg in
    --test)  COMPOSE_FILE="docker-compose.test.yml" ;;
    --prod)  COMPOSE_FILE="docker-compose.prod.yml" ;;
    --local) COMPOSE_FILE="docker-compose.yml" ;;
  esac
done

if [ ! -f "$COMPOSE_FILE" ]; then
  echo "❌ Compose-Datei nicht gefunden: $COMPOSE_FILE"
  exit 1
fi

echo "▶ Deploy mit $COMPOSE_FILE"
echo ""

# ─── Git Pull ─────────────────────────────────────────────────────────────────
echo "📥 git pull..."
git pull

# ─── Docker Build + Start ─────────────────────────────────────────────────────
echo ""
echo "🐳 docker compose up --build -d..."
docker compose -f "$COMPOSE_FILE" up --build -d

# ─── Cloudflare Tunnel URL (optional) ────────────────────────────────────────
if grep -q "cloudflared" "$COMPOSE_FILE"; then
  echo ""
  echo "⏳ Warte auf Cloudflare-Tunnel..."

  URL=""
  for i in $(seq 1 20); do
    URL=$(docker compose -f "$COMPOSE_FILE" logs cloudflared 2>/dev/null \
      | grep -o 'https://[^ ]*\.trycloudflare\.com' \
      | tail -1)
    [ -n "$URL" ] && break
    sleep 2
  done

  if [ -n "$URL" ]; then
    echo ""
    echo "🌍 Tunnel-URL: $URL"
    echo ""
  else
    echo "⚠️  Tunnel noch nicht bereit — URL abfragen mit:"
    echo "   docker compose -f $COMPOSE_FILE logs cloudflared"
    echo ""
  fi
fi

echo "✅ Fertig"
