#!/usr/bin/env bash
# ==============================================================================
# OwnDJ - Instant Database Restore Script
# Restores a SQL dump into the running PostgreSQL container.
# ==============================================================================

set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." >/dev/null 2>&1 && pwd)"
BACKUP_DIR="$DIR/backups"
DEFAULT_FILE="$BACKUP_DIR/owndj_latest.sql"
TARGET_FILE="${1:-$DEFAULT_FILE}"

echo "=========================================================="
echo "          OwnDJ - PostgreSQL Database Restore             "
echo "=========================================================="

if [ ! -f "$TARGET_FILE" ]; then
    echo "Error: Backup file not found: $TARGET_FILE"
    echo "Usage: ./scripts/restore-db.sh [path/to/backup.sql]"
    exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -q "^owndj-postgres$"; then
    echo "Error: owndj-postgres container is not running."
    echo "Please start the containers first: docker-compose up -d"
    exit 1
fi

echo "Restoring from: $TARGET_FILE"
read -p "Are you sure you want to overwrite current database? (y/N): " CONFIRM
if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    echo "Restore cancelled."
    exit 0
fi

echo "Applying SQL dump..."
cat "$TARGET_FILE" | docker exec -i owndj-postgres psql -U postgres -d owndj

echo "Restarting backend to refresh connection pool and caches..."
docker-compose restart backend

echo "=========================================================="
echo "Database successfully restored and backend restarted!"
echo "=========================================================="
