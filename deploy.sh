#!/bin/bash
set -e

cd "$(dirname "$0")"

# ─── Optionen ────────────────────────────────────────────────────────────────
# ./deploy.sh                 → Build + Start + Tunnel
# ./deploy.sh --keep-tunnel   → Rebuild ohne Tunnel-Neustart (URL bleibt)
# ./deploy.sh --no-tunnel     → Ohne Tunnel
# ./deploy.sh --down          → Alles stoppen
# ./deploy.sh --reset         → Stoppen + Volumes löschen + Neustart

KEEP_TUNNEL=false
NO_TUNNEL=false
DOWN_ONLY=false
RESET=false

for arg in "$@"; do
  case $arg in
    --keep-tunnel) KEEP_TUNNEL=true ;;
    --no-tunnel)   NO_TUNNEL=true ;;
    --down)        DOWN_ONLY=true ;;
    --reset)       RESET=true ;;
  esac
done

PROFILE=""
if [ "$NO_TUNNEL" = false ]; then
  PROFILE="--profile tunnel"
fi

# ─── Down / Reset ───────────────────────────────────────────────────────────
if [ "$DOWN_ONLY" = true ]; then
  echo "⏹ Stoppe alle Services..."
  docker compose $PROFILE down
  echo "✅ Gestoppt"
  exit 0
fi

if [ "$RESET" = true ]; then
  echo "🗑 Reset: Stoppe + lösche Volumes..."
  docker compose $PROFILE down -v
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
  docker compose $PROFILE up -d --build
else
  echo "🐳 Build + Start..."
  docker compose $PROFILE up -d --build
fi
echo ""

# ─── Tunnel-URL ──────────────────────────────────────────────────────────────
if [ "$NO_TUNNEL" = false ]; then
  if [ "$KEEP_TUNNEL" = true ]; then
    URL=$(docker compose logs cloudflared 2>/dev/null \
      | grep -o 'https://[^ ]*\.trycloudflare\.com' \
      | tail -1)
  else
    echo "⏳ Warte auf Cloudflare-Tunnel..."
    URL=""
    for i in $(seq 1 30); do
      URL=$(docker compose logs cloudflared 2>/dev/null \
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
    echo "   docker compose logs cloudflared"
  fi
else
  echo "═══════════════════════════════════════════════════"
  echo "  🌍 App:  http://localhost:${APP_PORT:-3080}"
  echo "  📧 Mail: http://localhost:${MAIL_PORT:-9000}"
  echo "═══════════════════════════════════════════════════"
fi

echo ""
echo "✅ Fertig"
