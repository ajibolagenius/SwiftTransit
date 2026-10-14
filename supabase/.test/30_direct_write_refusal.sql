-- AC-4: direct client writes are refused. Status, events, ledger, message
-- edits and deletes; only sanctioned paths can move these rows.

begin;
select _test.base_fixtures();
select _test.paid_searching_order('refuse-1');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000c1","role":"authenticated"}';

select _test.expect_refused('client updates orders.status',
  'update public.orders set status = ''delivered'' where idempotency_key = ''refuse-1''');
select _test.expect_refused('client inserts order_events',
  'insert into public.order_events (order_id, status, actor_id)
   select id, ''delivered'', ''00000000-0000-4000-8000-0000000000c1''::uuid
   from public.orders where idempotency_key = ''refuse-1''');
select _test.expect_refused('client inserts ledger row',
  'insert into public.wallet_transactions (owner_id, amount_kobo, kind)
   values (''00000000-0000-4000-8000-0000000000c1''::uuid, 500, ''topup'')');
select _test.expect_refused('client updates messages',
  'update public.messages set body = ''edited''');
select _test.expect_refused('client deletes messages',
  'delete from public.messages');
select _test.expect_refused('client deletes orders',
  'delete from public.orders');
select _test.expect_refused('client deletes ledger',
  'delete from public.wallet_transactions');
select _test.expect_refused('client inserts orders directly',
  'insert into public.orders (tracking_code, customer_id, type, pickup_line, pickup_lat, pickup_lng,
                              dropoff_line, dropoff_lat, dropoff_lng, receiver_name, receiver_phone,
                              package_size, weight_kg, status, base_kobo, distance_kobo, handling_kobo, total_kobo)
   values (''ABCD2345'', ''00000000-0000-4000-8000-0000000000c1''::uuid, ''parcel'', ''a'', 1, 1, ''b'', 2, 2,
           ''c'', ''+2348000000000'', ''small'', 1, ''searching'', 100, 100, 0, 200)');

rollback;
