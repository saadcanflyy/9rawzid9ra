#!/usr/bin/env bash
# Runs every migration on a fresh local Postgres copy of the schema, then every test suite.
cd "$(dirname "$0")/../.."
PSQL="psql -h ${PGHOST:-/tmp} -p ${PGPORT:-5433} -U postgres"
total=0; failed=0
for suite in 01 02 03 04 05; do
  $PSQL -q -c "drop database if exists t" -c "create database t" >/dev/null
  $PSQL -d t -q -v ON_ERROR_STOP=1 -f supabase/tests/00_stub.sql -f supabase/tests/01_seed.sql >/dev/null
  for f in supabase/migrations/2026092500*.sql; do $PSQL -d t -q -v ON_ERROR_STOP=1 -f "$f" 2>&1 | grep -v NOTICE; done
  out=$(bash supabase/tests/test_$suite.sh)
  p=$(grep -c '^PASS' <<<"$out"); fl=$(grep -c '^FAIL' <<<"$out")
  echo "suite $suite: $p passed, $fl failed"; grep '^FAIL' <<<"$out"
  total=$((total+p)); failed=$((failed+fl))
done
echo "TOTAL: $total passed, $failed failed"
