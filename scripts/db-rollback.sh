#!/bin/bash
set -e

# ==============================================================================
# Nilayam Database Rollback Scripts
# Usage: ./db-rollback.sh <version_to_rollback>
# Example: ./db-rollback.sh 20240315_add_users_table
# ==============================================================================

VERSION=$1

if [ -z "$VERSION" ]; then
    echo "Usage: ./db-rollback.sh <version_to_rollback>"
    echo "Available migrations:"
    ls -1 $(dirname "$0")/../supabase/migrations/*.sql | sed -e 's/.*\/\(.*\)\.sql/\1/'
    exit 1
fi

if [ -z "$SUPABASE_DB_URL" ]; then
    echo "ERROR: SUPABASE_DB_URL environment variable is not set."
    exit 1
fi

MIGRATIONS_DIR="$(dirname "$0")/../supabase/migrations"
DOWN_SCRIPT="${MIGRATIONS_DIR}/${VERSION}_down.sql"

if [ ! -f "$DOWN_SCRIPT" ]; then
    echo "ERROR: Rollback script $DOWN_SCRIPT not found."
    echo "Ensure you create paired _down.sql scripts for every migration."
    exit 1
fi

PSQL_CMD="psql $SUPABASE_DB_URL -v ON_ERROR_STOP=1"

echo "Rolling back migration: $VERSION"

# Run the down script
$PSQL_CMD -f "$DOWN_SCRIPT"

# Remove from tracking table
$PSQL_CMD -c "DELETE FROM _schema_migrations WHERE version = '$VERSION'"

echo "Rollback of $VERSION completed successfully."
