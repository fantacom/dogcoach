#!/usr/bin/env bash
# Lokale Datenbank-Tests OHNE Docker: wendet Stub + Migrationen + Seed auf eine frische
# Postgres-Datenbank an und führt supabase/tests/*.test.sql aus.
# Nutzung: PGHOST=/tmp PGPORT=54329 PGUSER=postgres supabase/tests/run.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
DB=${TEST_DB:-dogcoach_test}
PSQL=(psql -X -q -v ON_ERROR_STOP=1 -d "$DB")

dropdb --if-exists "$DB"
createdb "$DB"
"${PSQL[@]}" -f supabase/tests/stub/00_supabase_stub.sql
for f in supabase/migrations/*.sql; do
  case "$f" in *_cron.sql) echo "skip $f (pg_cron/pg_net nur in Supabase)"; continue;; esac
  echo "migrate $f"
  "${PSQL[@]}" -f "$f"
done
for f in supabase/seed/*.sql; do
  [ -f "$f" ] || continue
  echo "seed $f"
  "${PSQL[@]}" -f "$f"
done
for f in supabase/tests/*.test.sql; do
  echo "test $f"
  "${PSQL[@]}" -o /dev/null -f "$f"
done
echo "OK: alle DB-Tests bestanden"
