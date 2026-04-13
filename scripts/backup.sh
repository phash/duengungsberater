#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Düngungsberater — Tägliches DB-Backup mit optionalem Remote-Sync
#
# Usage:
#   ./scripts/backup.sh                    # Manuell ausführen
#   30 3 * * * /opt/duengungsberater/scripts/backup.sh >> /opt/backup/duengungsberater/backup.log 2>&1
#
# Env-Variablen (optional):
#   BACKUP_DIR             — Zielverzeichnis (default: /opt/backup/duengungsberater)
#   BACKUP_RETENTION_DAYS  — Tage bis Löschung (default: 14)
#   BACKUP_REMOTE_TARGET   — rsync-Ziel (z.B. user@host:/backups/duengungsberater/)
#   POSTGRES_USER          — DB-User (default: postgres)
#   BACKUP_CONTAINER       — Docker-Container (default: duengungsberater-db-1)
#   POSTGRES_DB            — DB-Name (default: postgres)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ─── Konfiguration ──────────────────────────────────────────────────────────
CONTAINER="${BACKUP_CONTAINER:-duengungsberater-db-1}"
BACKUP_DIR="${BACKUP_DIR:-/opt/backup/duengungsberater}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
REMOTE_TARGET="${BACKUP_REMOTE_TARGET:-}"
DB_USER="${POSTGRES_USER:-postgres}"
DB_NAME="${POSTGRES_DB:-postgres}"

TIMESTAMP=$(date +%Y-%m-%d_%H%M%S)
FILENAME="duengungsberater_${TIMESTAMP}.sql.gz"
FILEPATH="${BACKUP_DIR}/${FILENAME}"

# ─── Farben (nur im Terminal) ───────────────────────────────────────────────
if [ -t 1 ]; then
  GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
else
  GREEN=''; YELLOW=''; RED=''; NC=''
fi

log()  { echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] ${GREEN}INFO${NC}  $*"; }
warn() { echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] ${YELLOW}WARN${NC}  $*"; }
err()  { echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] ${RED}ERROR${NC} $*"; }

# ─── Voraussetzungen ────────────────────────────────────────────────────────
log "Backup gestartet — DB: ${DB_NAME}, Container: ${CONTAINER}"

if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
  err "Container '${CONTAINER}' läuft nicht!"
  exit 1
fi

mkdir -p "${BACKUP_DIR}"

# ─── Dump ────────────────────────────────────────────────────────────────────
log "Erstelle Dump → ${FILENAME}"

if ! docker exec "${CONTAINER}" pg_dump -U "${DB_USER}" -d "${DB_NAME}" --clean --if-exists | gzip > "${FILEPATH}"; then
  err "pg_dump fehlgeschlagen!"
  rm -f "${FILEPATH}"
  exit 1
fi

# ─── Integritätsprüfung ─────────────────────────────────────────────────────
if ! gzip -t "${FILEPATH}" 2>/dev/null; then
  err "Integritätsprüfung fehlgeschlagen — Datei beschädigt: ${FILEPATH}"
  exit 1
fi

SIZE=$(du -h "${FILEPATH}" | cut -f1)
log "Dump OK — ${SIZE} (gzip verifiziert)"

# ─── Alte Backups löschen ────────────────────────────────────────────────────
DELETED=$(find "${BACKUP_DIR}" -name "duengungsberater_*.sql.gz" -mtime "+${RETENTION_DAYS}" -delete -print | wc -l)
if [ "${DELETED}" -gt 0 ]; then
  log "Retention: ${DELETED} Backup(s) älter als ${RETENTION_DAYS} Tage gelöscht"
fi

# ─── Remote-Sync (optional) ─────────────────────────────────────────────────
if [ -n "${REMOTE_TARGET}" ]; then
  log "Remote-Sync → ${REMOTE_TARGET}"
  if rsync -az --timeout=60 "${FILEPATH}" "${REMOTE_TARGET}"; then
    log "Remote-Sync OK"
  else
    warn "Remote-Sync fehlgeschlagen (Exit $?) — lokales Backup bleibt erhalten"
  fi
else
  log "Kein BACKUP_REMOTE_TARGET gesetzt — überspringe Remote-Sync"
fi

# ─── Zusammenfassung ─────────────────────────────────────────────────────────
TOTAL=$(find "${BACKUP_DIR}" -name "duengungsberater_*.sql.gz" | wc -l)
log "Fertig — ${TOTAL} Backup(s) im Verzeichnis ${BACKUP_DIR}"
