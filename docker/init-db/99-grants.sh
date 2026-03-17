#!/bin/bash
set -e

PGUSER="${POSTGRES_USER:-postgres}"
PGDB="${POSTGRES_DB:-postgres}"

echo "=== Granting permissions on app tables ==="

psql -v ON_ERROR_STOP=1 --username "$PGUSER" --dbname "$PGDB" <<-'EOSQL'
    GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
    GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
EOSQL

echo "=== Grants applied ==="
