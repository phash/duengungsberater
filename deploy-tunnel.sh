#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "▶ Düngungsberater Deploy + Cloudflare Tunnel"
echo ""

# ─── .env prüfen ─────────────────────────────────────────────────────────────
if [ ! -f .env ]; then
  echo "📋 Erstelle .env aus Vorlage..."
  cp .env.docker .env
  echo "   → .env erstellt. Ggf. anpassen (SITE_URL wird vom Tunnel überschrieben)."
  echo ""
fi

# ─── Git Pull (optional) ─────────────────────────────────────────────────────
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "📥 git pull..."
  git pull || true
  echo ""
fi

# ─── Build + Start aller Services inkl. Tunnel ──────────────────────────────
echo "🐳 docker compose up --build -d (mit Tunnel)..."
docker compose --profile tunnel up -d --build
echo ""

# ─── Tunnel-URL abfragen ────────────────────────────────────────────────────
echo "⏳ Warte auf Cloudflare-Tunnel..."
URL=""
for i in $(seq 1 30); do
  URL=$(docker compose logs cloudflared 2>/dev/null \
    | grep -o 'https://[^ ]*\.trycloudflare\.com' \
    | tail -1)
  [ -n "$URL" ] && break
  sleep 2
done

echo ""
if [ -n "$URL" ]; then
  echo "═══════════════════════════════════════════════════"
  echo "  🌍 App:  $URL"
  echo "  📧 Mail: http://localhost:${MAIL_PORT:-9000}"
  echo "═══════════════════════════════════════════════════"
else
  echo "⚠️  Tunnel noch nicht bereit. URL abfragen mit:"
  echo "   docker compose logs cloudflared"
fi
echo ""
echo "✅ Fertig"
echo ""
echo "Befehle:"
echo "  docker compose logs cloudflared          # Tunnel-URL"
echo "  docker compose --profile tunnel down     # Alles stoppen"
echo "  docker compose --profile tunnel down -v  # + Daten löschen"
