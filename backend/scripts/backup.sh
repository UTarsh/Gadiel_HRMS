#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# HRMS MySQL Backup Script
#
# Usage:
#   ./scripts/backup.sh
#
# Environment variables (can be set in the shell or via .env):
#   DB_HOST       default: localhost
#   DB_PORT       default: 3306
#   DB_USER       default: root
#   DB_PASSWORD   required
#   DB_NAME       default: hrms_db
#   BACKUP_DIR    default: ./backups
#   RETAIN_DAYS   default: 30  (backups older than this are deleted)
#
# Cron example — daily backup at 2 AM:
#   0 2 * * * cd /path/to/HRMS/backend && bash scripts/backup.sh >> /var/log/hrms_backup.log 2>&1
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Load .env if present ──────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/../.env"
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  set -a; source "$ENV_FILE"; set +a
fi

# ── Config with defaults ──────────────────────────────────────────────────────
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-root}"
DB_PASSWORD="${DB_PASSWORD:?DB_PASSWORD is required}"
DB_NAME="${DB_NAME:-hrms_db}"
BACKUP_DIR="${BACKUP_DIR:-${SCRIPT_DIR}/../backups}"
RETAIN_DAYS="${RETAIN_DAYS:-30}"

# ── Prepare ───────────────────────────────────────────────────────────────────
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/hrms_${TIMESTAMP}.sql.gz"

# ── Dump ──────────────────────────────────────────────────────────────────────
echo "[$(date -Iseconds)] Starting backup of ${DB_NAME} → ${BACKUP_FILE}"

mysqldump \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --user="$DB_USER" \
  --password="$DB_PASSWORD" \
  --single-transaction \
  --routines \
  --triggers \
  --set-gtid-purged=OFF \
  "$DB_NAME" | gzip > "$BACKUP_FILE"

SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
echo "[$(date -Iseconds)] Backup complete — ${SIZE} written to ${BACKUP_FILE}"

# ── Prune old backups ─────────────────────────────────────────────────────────
DELETED=$(find "$BACKUP_DIR" -name "hrms_*.sql.gz" -mtime +"$RETAIN_DAYS" -print -delete | wc -l)
if [[ $DELETED -gt 0 ]]; then
  echo "[$(date -Iseconds)] Pruned ${DELETED} backup(s) older than ${RETAIN_DAYS} days"
fi
