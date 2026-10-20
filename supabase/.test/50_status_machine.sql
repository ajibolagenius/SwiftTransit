-- AC-4: the status machine. change_order_status accepts only table-legal
-- moves, by the right actor; the append-only trail records each move.

begin;
select _test.base_fixtures();

-- Fund the wallet (privileged fixture path: the ledger has no client grant).
insert into public.wallet_transactions (owner_id, amount_kobo, kind, idempotency_key)
values ('00000000-0000-4000-8000-0000000000c1', 1000000, 'topup', 'sm-fund');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000c1","role":"authenticated"}';

-- Book through the sanctioned path (wallet-funded customer from fixtures).
select public.create_order(
  '{"type":"document","package_size":"small","weight_kg":1,"payment_method":"wallet",
    "pickup_line":"1 Herbert Macaulay Way, Yaba","pickup_lat":6.5092,"pickup_lng":3.3777,
    "dropoff_line":"Allen Way, Ikeja","dropoff_lat":6.6018,"dropoff_lng":3.3515,
    "receiver_name":"Tunde","receiver_phone":"+2348019999999"}'::jsonb,
  'sm-1');
select public.pay_order(
  (select id from public.orders where idempotency_key = 'sm-1'), 'sm-pay-1', 'mock_sm1');

-- Illegal for the customer: pending_payment straight to picked_up was used at
-- creation already; from searching, skipping ahead is refused.
select _test.expect_refused('searching to picked_up',
  'select public.change_order_status(
     (select id from public.orders where idempotency_key = ''sm-1''), ''picked_up''::public.order_status)');

-- Illegal for the customer: searching to delivered.
select _test.expect_refused('searching to delivered',
  'select public.change_order_status(
     (select id from public.orders where idempotency_key = ''sm-1''), ''delivered''::public.order_status)');

-- Courier C1 takes the job and walks the happy chain.
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000c3","role":"authenticated"}';
select public.assign_order(_test.order_id('sm-1'));
select public.change_order_status(
  (select id from public.orders where idempotency_key = 'sm-1'), 'at_pickup');
select _test.expect_refused('at_pickup to delivered',
  'select public.change_order_status(
     (select id from public.orders where idempotency_key = ''sm-1''), ''delivered''::public.order_status)');
select public.change_order_status(
  (select id from public.orders where idempotency_key = 'sm-1'), 'picked_up');
select public.change_order_status(
  (select id from public.orders where idempotency_key = 'sm-1'), 'at_dropoff');
select public.change_order_status(
  (select id from public.orders where idempotency_key = 'sm-1'), 'delivered');

-- Terminal: no further moves.
select _test.expect_refused('delivered to cancelled',
  'select public.change_order_status(
     (select id from public.orders where idempotency_key = ''sm-1''), ''cancelled''::public.order_status)');

-- One event row per accepted move: pending_payment, searching, assigned,
-- at_pickup, picked_up, at_dropoff, delivered.
select _test.expect_eq('full chain wrote 7 events',
  (select count(*) from public.order_events
   where order_id = (select id from public.orders where idempotency_key = 'sm-1')), 7);

-- The courier may not cancel.
select _test.expect_refused('courier cancels',
  'select public.change_order_status(
     (select id from public.orders where idempotency_key = ''sm-1''), ''cancelled''::public.order_status)');

rollback;
