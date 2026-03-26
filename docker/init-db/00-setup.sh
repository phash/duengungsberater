#!/bin/bash
set -e

PGUSER="${POSTGRES_USER:-postgres}"
PGDB="${POSTGRES_DB:-postgres}"

echo "=== Creating extensions and Supabase roles ==="

psql -v ON_ERROR_STOP=1 --username "$PGUSER" --dbname "$PGDB" <<-'EOSQL'
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
EOSQL

psql -v ON_ERROR_STOP=1 --username "$PGUSER" --dbname "$PGDB" <<-EOROLES
    DO \$\$ BEGIN
      IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon NOLOGIN NOINHERIT;
      END IF;
      IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated NOLOGIN NOINHERIT;
      END IF;
      IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'service_role') THEN
        CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
      END IF;
      IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_auth_admin') THEN
        CREATE ROLE supabase_auth_admin LOGIN NOINHERIT CREATEROLE PASSWORD '${POSTGRES_PASSWORD}';
      END IF;
      IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticator') THEN
        CREATE ROLE authenticator LOGIN NOINHERIT PASSWORD '${POSTGRES_PASSWORD}';
      END IF;
    END \$\$;
EOROLES

psql -v ON_ERROR_STOP=1 --username "$PGUSER" --dbname "$PGDB" <<-'EOSQL'
    GRANT anon TO authenticator;
    GRANT authenticated TO authenticator;
    GRANT service_role TO authenticator;
    GRANT supabase_auth_admin TO authenticator;

    -- Empty auth schema — GoTrue populates tables via its own migrations
    CREATE SCHEMA IF NOT EXISTS auth AUTHORIZATION supabase_auth_admin;
    GRANT ALL ON SCHEMA auth TO supabase_auth_admin;
    GRANT USAGE ON SCHEMA auth TO authenticated, anon, service_role;

    -- GoTrue needs CREATE on public for its schema_migrations table
    GRANT USAGE, CREATE ON SCHEMA public TO supabase_auth_admin;

    -- GoTrue expects auth tables in search_path (set AFTER migrations are done via docker/migrate.sh)
    -- Note: We don't set search_path here because GoTrue needs to run its own migrations first
    -- using the default search_path. The search_path is set by 99-post-gotrue.sh after GoTrue starts.

    -- Pre-create enums in auth schema (GoTrue creates them in public but
    -- later migrations reference them as auth.factor_type / auth.factor_status)
    CREATE TYPE auth.factor_type AS ENUM ('totp', 'webauthn');
    CREATE TYPE auth.factor_status AS ENUM ('unverified', 'verified');
    ALTER TYPE auth.factor_type OWNER TO supabase_auth_admin;
    ALTER TYPE auth.factor_status OWNER TO supabase_auth_admin;

    -- Public schema defaults for app tables
    GRANT USAGE, CREATE ON SCHEMA public TO anon, authenticated, service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;
EOSQL

echo "=== Roles and schemas ready (GoTrue will create auth tables) ==="
