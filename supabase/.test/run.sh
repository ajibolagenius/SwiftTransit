#!/usr/bin/env bash
# Policy test runner (spec 0002 task 3). Loads helpers and fixtures against a
# running local stack, then runs each NN_*.sql script (they carry their own
# begin/rollback) and the assign race. Point it elsewhere with PG* env vars.
set -euo pipefail

cd "$(dirname "$0")"

export PGHOST=${PGHOST:-127.0.0.1}
export PGPORT=${PGPORT:-54322}
export PGDATABASE=${PGDATABASE:-postgres}
export PGUSER=${PGUSER:-postgres}
export PGPASSWORD=${PGPASSWORD:-postgres}

psql -qXv ON_ERROR_STOP=1 -f 00_helpers.sql
psql -qXv ON_ERROR_STOP=1 -f 01_fixtures.sql

status=0
for f in [0-9][0-9]_*.sql; do
  case "$f" in
    00_helpers.sql|01_fixtures.sql) continue ;;
  esac
  printf '==> %s\n' "$f"
  if ! psql -qXv ON_ERROR_STOP=1 -f "$f"; then
    printf 'FAIL %s\n' "$f" >&2
    status=1
  fi
done

printf '==> %s\n' 65_assign_race.sh
if ! bash 65_assign_race.sh; then
  printf 'FAIL 65_assign_race.sh\n' >&2
  status=1
fi

if [ "$status" -eq 0 ]; then
  echo "policy tests ok"
fi
exit "$status"
