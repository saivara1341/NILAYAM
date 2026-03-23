#!/bin/bash
# ==============================================================================
# Nilayam Sub-Environment Backup Script
# Usage: ./backup.sh
# Creates timestamped SQL dumps of the PostgreSQL db
# ==============================================================================

if [ -z "$SUPABASE_DB_URL" ]; then
    echo "ERROR: SUPABASE_DB_URL is not set. Cannot run backups."
    exit 1
fi

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/var/backups/nilayam"
BACKUP_FILE="${BACKUP_DIR}/nilayam_prod_dump_${TIMESTAMP}.sql.gz"

mkdir -p $BACKUP_DIR

echo "Starting database backup at $(date)..."
# pg_dump requires connection string formatting extraction, assuming standard psql available
pg_dump --clean --if-exists --no-owner --no-privileges $SUPABASE_DB_URL | gzip > $BACKUP_FILE

echo "Backup complete: $BACKUP_FILE"

# Retention policy: keep last 14 days
find $BACKUP_DIR -name "nilayam_prod_dump_*.sql.gz" -type f -mtime +14 -delete
echo "Old backups cleaned up."
