#!/bin/bash
set -e

# ==============================================================================
# Nilayam Database Migration Runner
# Usage: ./db-migrate.sh [up|down|status]
# ==============================================================================

ACTION=${1:-up}

# Requires Supabase CLI or psql. We'll use psql for simplicity in standard CI.
if [ -z "$SUPABASE_DB_URL" ]; then
    echo "ERROR: SUPABASE_DB_URL environment variable is not set."
    exit 1
fi

MIGRATIONS_DIR="$(dirname "$0")/../supabase/migrations"

# Determine psql command (handles direct DB_PASSWORD injection if needed)
PSQL_CMD="psql $SUPABASE_DB_URL -v ON_ERROR_STOP=1"

# Create migration tracking table if it doesn't exist
$PSQL_CMD -c "
CREATE TABLE IF NOT EXISTS _schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);" > /dev/null

echo "========================================="
echo "  Nilayam DB Migration Tool ($ACTION)"
echo "========================================="

case $ACTION in
    up)
        echo "Applying pending migrations..."
        for file in $(ls -1 $MIGRATIONS_DIR/*.sql | sort); do
            version=$(basename "$file" .sql)
            
            # Check if applied
            applied=$($PSQL_CMD -tAc "SELECT 1 FROM _schema_migrations WHERE version = '$version'")
            
            if [ "$applied" != "1" ]; then
                echo "-> Applying $version..."
                
                # Execute migration
                $PSQL_CMD -f "$file"
                
                # Record it
                $PSQL_CMD -c "INSERT INTO _schema_migrations (version) VALUES ('$version')"
                
                echo "   Done."
            else
                echo "-> Skipped $version (already applied)"
            fi
        done
        echo "All migrations applied successfully."
        ;;
        
    down)
        # In a real environment, you'd have down scripts.
        # For this prototype, we just instruct using the rollback script.
        echo "ERROR: Use ./db-rollback.sh to safely rollback specific migrations."
        exit 1
        ;;
        
    status)
        echo "Migration Status:"
        $PSQL_CMD -c "SELECT version, applied_at FROM _schema_migrations ORDER BY version;"
        ;;
        
    *)
        echo "Usage: $0 [up|down|status]"
        exit 1
        ;;
esac
