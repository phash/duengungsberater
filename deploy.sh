#!/bin/bash
set -e

cd "$(dirname "$0")"

# ─── Optionen ────────────────────────────────────────────────────────────────
# ./deploy.sh                 → Build + Start (lokal, ohne Tunnel)
# ./deploy.sh --prod          → Build + Start mit Caddy-Override (VPS)
# ./deploy.sh --tunnel        → Build + Start + Cloudflare-Tunnel
# ./deploy.sh --keep-tunnel   → Rebuild ohne Tunnel-Neustart (URL bleibt)
# ./deploy.sh --down          → Alles stoppen
# ./deploy.sh --reset         → Stoppen + Volumes löschen + Neustart

PROD=false
TUNNEL=false
KEEP_TUNNEL=false
DOWN_ONLY=false
RESET=false

for arg in "$@"; do
  case $arg in
    --prod)         PROD=true ;;
    --tunnel)       TUNNEL=true ;;
    --keep-tunnel)  KEEP_TUNNEL=true; TUNNEL=true ;;
    --down)         DOWN_ONLY=true ;;
    --reset)        RESET=true ;;
  esac
done

COMPOSE="docker compose"
if [ "$PROD" = true ]; then
  COMPOSE="docker compose -f docker-compose.yml -f docker-compose.caddy.yml"
fi

PROFILE=""
if [ "$TUNNEL" = true ]; then
  PROFILE="--profile tunnel"
fi

# ─── Down / Reset ───────────────────────────────────────────────────────────
if [ "$DOWN_ONLY" = true ]; then
  echo "⏹ Stoppe alle Services..."
  $COMPOSE $PROFILE down
  echo "✅ Gestoppt"
  exit 0
fi

if [ "$RESET" = true ]; then
  echo "🗑 Reset: Stoppe + lösche Volumes..."
  $COMPOSE $PROFILE down -v
  echo ""
fi

echo "▶ Düngungsberater Deploy"
echo ""

# ─── .env prüfen ─────────────────────────────────────────────────────────────
if [ ! -f .env ]; then
  echo "📋 Erstelle .env aus Vorlage..."
  cp .env.docker .env
  echo "   → .env erstellt"
  echo ""
fi

# ─── Git Pull ────────────────────────────────────────────────────────────────
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "📥 git pull..."
  git pull || true
  echo ""
fi

# ─── Build + Start ──────────────────────────────────────────────────────────
if [ "$KEEP_TUNNEL" = true ]; then
  echo "🐳 Rebuild (Tunnel bleibt laufen)..."
  $COMPOSE $PROFILE up -d --build
else
  echo "🐳 Build + Start..."
  $COMPOSE $PROFILE up -d --build
fi
echo ""

# ─── Tunnel-URL ──────────────────────────────────────────────────────────────
if [ "$TUNNEL" = true ]; then
  if [ "$KEEP_TUNNEL" = true ]; then
    URL=$($COMPOSE logs cloudflared 2>/dev/null \
      | grep -o 'https://[^ ]*\.trycloudflare\.com' \
      | tail -1)
  else
    echo "⏳ Warte auf Cloudflare-Tunnel..."
    URL=""
    for i in $(seq 1 30); do
      URL=$($COMPOSE logs cloudflared 2>/dev/null \
        | grep -o 'https://[^ ]*\.trycloudflare\.com' \
        | tail -1)
      [ -n "$URL" ] && break
      sleep 2
    done
  fi

  echo ""
  if [ -n "$URL" ]; then
    echo "═══════════════════════════════════════════════════"
    echo "  🌍 App:  $URL"
    echo "  📧 Mail: http://localhost:${MAIL_PORT:-9000}"
    echo "═══════════════════════════════════════════════════"
  else
    echo "⚠️  Tunnel nicht bereit. URL abfragen:"
    echo "   $COMPOSE logs cloudflared"
  fi
elif [ "$PROD" = true ]; then
  echo ""
  echo "═══════════════════════════════════════════════════"
  echo "  🌍 App:  ${SITE_URL:-https://duenger.mr-development.de}"
  echo "═══════════════════════════════════════════════════"
else
  echo ""
  echo "═══════════════════════════════════════════════════"
  echo "  🌍 App:  http://localhost:${APP_PORT:-3080}"
  echo "  📧 Mail: http://localhost:${MAIL_PORT:-9000}"
  echo "═══════════════════════════════════════════════════"
fi

echo ""
echo "✅ Fertig"
