#!/usr/bin/env bash
# AC-6: two concurrent assign_order calls on one order; exactly one succeeds.
# Requires the local stack on $PGPORT (default 54322).
set -euo pipefail

PGHOST=${PGHOST:-127.0.0.1}
PGPORT=${PGPORT:-54322}
PGDATABASE=${PGDATABASE:-postgres}
PGUSER=${PGUSER:-postgres}
export PGPASSWORD=${PGPASSWORD:-postgres}

race_teardown() {
  psql -qAt -c "
delete from public.orders where idempotency_key = 'race-1';
delete from public.wallet_transactions where idempotency_key = 'topup:race-1';
delete from public.couriers_status where courier_id = '00000000-0000-4000-8000-0000000000c5';
delete from public.courier_applications where courier_id = '00000000-0000-4000-8000-0000000000c5';
delete from public.profiles where id = '00000000-0000-4000-8000-0000000000c5';
delete from auth.users where id = '00000000-0000-4000-8000-0000000000c5';" >/dev/null
}
trap race_teardown EXIT

race_claim() {
  local courier=$1 order=$2
  psql -qAtv ON_ERROR_STOP=1 <<SQL
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"${courier}","role":"authenticated"}';
select id from public.assign_order('${order}');
commit;
select 'WON';
SQL
}

# Fixture: order searching between two approved couriers (C1 and C3).
# Start from a clean slate so reruns without a db reset work.
psql -qAtv ON_ERROR_STOP=1 <<'SQL'
delete from public.orders where idempotency_key = 'race-1';
delete from public.wallet_transactions where idempotency_key = 'topup:race-1';
delete from public.couriers_status where courier_id = '00000000-0000-4000-8000-0000000000c5';
delete from public.courier_applications where courier_id = '00000000-0000-4000-8000-0000000000c5';
delete from public.profiles where id = '00000000-0000-4000-8000-0000000000c5';
delete from auth.users where id = '00000000-0000-4000-8000-0000000000c5';
SQL

psql -qAtv ON_ERROR_STOP=1 <<'SQL' | tail -1 > /tmp/st_race_oid
select _test.base_fixtures();
insert into auth.users (id, aud, role, email) values
  ('00000000-0000-4000-8000-0000000000c5', 'authenticated', 'authenticated', 'test-k3@example.invalid')
  on conflict (id) do nothing;
insert into public.profiles (id, role, first_name, last_name) values
  ('00000000-0000-4000-8000-0000000000c5', 'courier', 'Femi', 'Ojo')
  on conflict (id) do nothing;
insert into public.courier_applications (courier_id, vehicle_type, vehicle_number, licence_number, licence_photo_path, status, approved_at) values
  ('00000000-0000-4000-8000-0000000000c5', 'van', 'KFK-333CC', 'FRSC-D-3333333', 'k3/licence.jpg', 'approved', now())
  on conflict (courier_id) do nothing;
insert into public.couriers_status (courier_id, is_online) values
  ('00000000-0000-4000-8000-0000000000c5', true)
  on conflict (courier_id) do nothing;
select _test.paid_searching_order('race-1');
SQL
oid=$(cat /tmp/st_race_oid)

# Both contenders fire together on the same order id.
race_claim 00000000-0000-4000-8000-0000000000c3 "$oid" > /tmp/st_race_c1.out 2>&1 &
pid1=$!
race_claim 00000000-0000-4000-8000-0000000000c5 "$oid" > /tmp/st_race_c3.out 2>&1 &
pid3=$!

rc1=0; rc3=0
wait $pid1 || rc1=$?
wait $pid3 || rc3=$?

winners=$(( (rc1 == 0) + (rc3 == 0) ))
if [ "$winners" -ne 1 ]; then
  echo "POLICY TEST FAILED: assign race — expected exactly one winner, got ${winners}" >&2
  cat /tmp/st_race_c1.out /tmp/st_race_c3.out >&2
  exit 1
fi

# The loser must have failed with already_assigned, and the DB holds one courier.
if ! grep -q 'already_assigned' <(cat /tmp/st_race_c1.out /tmp/st_race_c3.out); then
  echo "POLICY TEST FAILED: assign race — loser did not report already_assigned" >&2
  exit 1
fi

assigned=$(psql -qAt -c "select count(*) from public.orders where idempotency_key = 'race-1' and courier_id is not null and status = 'assigned'")
if [ "$assigned" != "1" ]; then
  echo "POLICY TEST FAILED: assign race — expected one assigned order, got ${assigned}" >&2
  exit 1
fi

echo "assign race ok"
