#!/bin/bash
set -e

# ─── Compose-File bestimmen ───────────────────────────────────────────────────
# Standard: docker-compose.test.yml
# Optionen: --test | --prod | --local | COMPOSE_FILE=... deploy.sh

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.test.yml}"
KEEP_TUNNEL=false

for arg in "$@"; do
  case $arg in
    --test)        COMPOSE_FILE="docker-compose.test.yml" ;;
    --prod)        COMPOSE_FILE="docker-compose.prod.yml" ;;
    --local)       COMPOSE_FILE="docker-compose.yml" ;;
    --keep-tunnel) KEEP_TUNNEL=true ;;
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
if [ "$KEEP_TUNNEL" = true ] && grep -q "cloudflared" "$COMPOSE_FILE"; then
  echo "🐳 docker compose up --build -d (ohne cloudflared)..."
  SERVICES=$(docker compose -f "$COMPOSE_FILE" config --services | grep -v '^cloudflared$' | tr '\n' ' ')
  docker compose -f "$COMPOSE_FILE" up --build -d $SERVICES
else
  echo "🐳 docker compose up --build -d..."
  docker compose -f "$COMPOSE_FILE" up --build -d
fi

# ─── Cloudflare Tunnel URL (optional) ────────────────────────────────────────
if grep -q "cloudflared" "$COMPOSE_FILE"; then
  echo ""

  if [ "$KEEP_TUNNEL" = true ]; then
    # Tunnel läuft weiter — URL sofort aus bestehenden Logs lesen
    URL=$(docker compose -f "$COMPOSE_FILE" logs cloudflared 2>/dev/null \
      | grep -o 'https://[^ ]*\.trycloudflare\.com' \
      | tail -1)
  else
    echo "⏳ Warte auf Cloudflare-Tunnel..."
    URL=""
    for i in $(seq 1 20); do
      URL=$(docker compose -f "$COMPOSE_FILE" logs cloudflared 2>/dev/null \
        | grep -o 'https://[^ ]*\.trycloudflare\.com' \
        | tail -1)
      [ -n "$URL" ] && break
      sleep 2
    done
  fi

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
