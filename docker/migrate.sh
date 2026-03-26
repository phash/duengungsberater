#!/bin/sh
set -e

PSQL="PGPASSWORD=$POSTGRES_PASSWORD psql -v ON_ERROR_STOP=1 -h db -U postgres -d postgres"

echo "=== Waiting for GoTrue to be ready (auth.users table) ==="
MAX_RETRIES=60
RETRY=0
until PGPASSWORD="$POSTGRES_PASSWORD" psql -h db -U postgres -d postgres -c "SELECT 1 FROM auth.users LIMIT 0" >/dev/null 2>&1; do
    RETRY=$((RETRY + 1))
    if [ "$RETRY" -ge "$MAX_RETRIES" ]; then
        echo "ERROR: GoTrue did not become ready after $MAX_RETRIES attempts"
        exit 1
    fi
    echo "  ...waiting for GoTrue to finish migrations ($RETRY/$MAX_RETRIES)"
    sleep 3
done

echo "=== Fixing GoTrue search_path for runtime ==="
PGPASSWORD="$POSTGRES_PASSWORD" psql -v ON_ERROR_STOP=1 -h db -U postgres -d postgres <<-'EOSQL'
    -- Drop duplicate auth.schema_migrations (GoTrue uses public.schema_migrations)
    DROP TABLE IF EXISTS auth.schema_migrations;
    -- Set search_path so GoTrue finds auth tables without schema prefix
    ALTER ROLE supabase_auth_admin SET search_path TO auth, public, extensions;
EOSQL

echo "=== Running app migrations ==="
PGPASSWORD="$POSTGRES_PASSWORD" psql -v ON_ERROR_STOP=1 --single-transaction -h db -U postgres -d postgres -f /sql/001_initial_schema.sql
echo "  Migration 001 done"

PGPASSWORD="$POSTGRES_PASSWORD" psql -v ON_ERROR_STOP=1 --single-transaction -h db -U postgres -d postgres -f /sql/002_corrections_schema.sql
echo "  Migration 002 done"

PGPASSWORD="$POSTGRES_PASSWORD" psql -v ON_ERROR_STOP=1 --single-transaction -h db -U postgres -d postgres -f /sql/003_nmin_fields.sql
echo "  Migration 003 done"

PGPASSWORD="$POSTGRES_PASSWORD" psql -v ON_ERROR_STOP=1 --single-transaction -h db -U postgres -d postgres -f /sql/004_user_nutrient_demands_rls.sql
echo "  Migration 004 done"

PGPASSWORD="$POSTGRES_PASSWORD" psql -v ON_ERROR_STOP=1 --single-transaction -h db -U postgres -d postgres -f /sql/005_field_geometries.sql
echo "  Migration 005 done"

echo "=== Running seed data ==="
PGPASSWORD="$POSTGRES_PASSWORD" psql -v ON_ERROR_STOP=1 -h db -U postgres -d postgres -f /sql/seed.sql
echo "  Seed done"

echo "=== Granting permissions on app tables ==="
PGPASSWORD="$POSTGRES_PASSWORD" psql -v ON_ERROR_STOP=1 -h db -U postgres -d postgres <<-'EOSQL'
    GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
    GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
EOSQL

echo "=== Restarting GoTrue to pick up search_path ==="
# GoTrue will restart automatically via Docker's restart policy

echo "=== App database ready ==="
