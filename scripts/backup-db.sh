#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_ROOT/.env"

BACKUP_DIR="${BACKUP_DIR:-/var/backups/itam}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: .env not found at $ENV_FILE" >&2
  exit 1
fi

DATABASE_URL="$(grep -E '^DATABASE_URL=' "$ENV_FILE" | head -n1 | cut -d '=' -f2- | tr -d '"')"
if [[ -z "$DATABASE_URL" ]]; then
  echo "ERROR: DATABASE_URL not found in $ENV_FILE" >&2
  exit 1
fi

if [[ "$DATABASE_URL" =~ ^mysql://([^:]+):([^@]*)@([^:/]+):([0-9]+)/([a-zA-Z0-9_]+) ]]; then
  DB_USER="${BASH_REMATCH[1]}"
  DB_PASS="${BASH_REMATCH[2]}"
  DB_HOST="${BASH_REMATCH[3]}"
  DB_PORT="${BASH_REMATCH[4]}"
  DB_NAME="${BASH_REMATCH[5]}"
else
  echo "ERROR: Could not parse DATABASE_URL from $ENV_FILE" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
OUT_FILE="$BACKUP_DIR/itam_${TIMESTAMP}.sql.gz"

CREDS_FILE="$(mktemp)"
trap 'rm -f "$CREDS_FILE"' EXIT
printf '[client]\nuser=%s\npassword=%s\nhost=%s\nport=%s\n' \
  "$DB_USER" "$DB_PASS" "$DB_HOST" "$DB_PORT" > "$CREDS_FILE"
chmod 600 "$CREDS_FILE"

mysqldump --defaults-extra-file="$CREDS_FILE" \
  --single-transaction \
  --routines \
  --triggers \
  "$DB_NAME" | gzip > "$OUT_FILE"

echo "Backup written to $OUT_FILE"

find "$BACKUP_DIR" -name 'itam_*.sql.gz' -type f -mtime +"$RETENTION_DAYS" -delete

echo "Rotation complete (kept last $RETENTION_DAYS days)."
