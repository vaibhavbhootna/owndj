#!/usr/bin/env bash
# ==============================================================================
# OwnDJ - Instant Database Backup Script
# Creates a full SQL dump of the running PostgreSQL database.
# ==============================================================================

set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." >/dev/null 2>&1 && pwd)"
BACKUP_DIR="$DIR/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/owndj_backup_${TIMESTAMP}.sql"
LATEST_FILE="$BACKUP_DIR/owndj_latest.sql"

mkdir -p "$BACKUP_DIR"

echo "=========================================================="
echo "          OwnDJ - PostgreSQL Database Backup              "
echo "=========================================================="

if ! docker ps --format '{{.Names}}' | grep -q "^owndj-postgres$"; then
    echo "Error: owndj-postgres container is not running."
    echo "Please start the containers first: docker-compose up -d"
    exit 1
fi

echo "Dumping database 'owndj' from container 'owndj-postgres'..."
docker exec owndj-postgres pg_dump -U postgres -d owndj --clean --if-exists > "$BACKUP_FILE"

cp "$BACKUP_FILE" "$LATEST_FILE"

FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)

echo "Backup successful!"
echo "Saved to:  $BACKUP_FILE ($FILE_SIZE)"
echo "Latest:    $LATEST_FILE"
echo "=========================================================="
