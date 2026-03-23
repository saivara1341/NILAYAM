#!/bin/bash
set -e

# ==============================================================================
# Nilayam Database Seeder
# Usage: ./db-seed.sh
# Inserts essential test data into dev/staging environments.
# ==============================================================================

if [ -z "$SUPABASE_DB_URL" ]; then
    echo "ERROR: SUPABASE_DB_URL environment variable is not set."
    exit 1
fi

# Prevent accidental run on production
if [[ "$SUPABASE_DB_URL" == *"prod"* ]]; then
    echo "CRITICAL ERROR: Cannot seed production database!"
    exit 1
fi

read -p "Warning: Seeding may replace existing test data. Continue? (y/N) " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    exit 0
fi

SEED_FILE="$(dirname "$0")/../supabase/seed.sql"

if [ ! -f "$SEED_FILE" ]; then
    echo "ERROR: Seed file $SEED_FILE not found."
    exit 1
fi

echo "Seeding database..."
psql $SUPABASE_DB_URL -v ON_ERROR_STOP=1 -f "$SEED_FILE"
echo "Database seeded successfully."
