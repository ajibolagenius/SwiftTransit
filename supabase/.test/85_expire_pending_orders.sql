-- Spec 0005 AC-21: an order nobody paid for stops being a booking after 15
-- minutes. The job cancels it, writes one system event with no actor, leaves
-- everything else alone, and no client can call it.

begin;
select _test.base_fixtures();

-- Three orders placed through the privileged fixture path so the ages are
-- exact: one unpaid and old, one unpaid and fresh, one paid and old.
insert into public.orders (
  tracking_code, idempotency_key, customer_id, type,
  pickup_line, pickup_lat, pickup_lng, dropoff_line, dropoff_lat, dropoff_lng,
  receiver_name, receiver_phone, package_size, weight_kg,
  status, base_kobo, distance_kobo, handling_kobo, total_kobo,
  payment_method, payment_reference, created_at
) values
  ('EXPD0001', 'expiry-old', '00000000-0000-4000-8000-0000000000c1', 'parcel',
   'Yaba', 6.5092, 3.3777, 'Ikeja', 6.6018, 3.3515,
   'Tunde', '+2348019999999', 'small', 1.0,
   'pending_payment', 150000, 74900, 0, 224900, 'card', null,
   now() - interval '20 minutes'),
  ('EXPD0002', 'expiry-fresh', '00000000-0000-4000-8000-0000000000c1', 'parcel',
   'Yaba', 6.5092, 3.3777, 'Ikeja', 6.6018, 3.3515,
   'Tunde', '+2348019999999', 'small', 1.0,
   'pending_payment', 150000, 74900, 0, 224900, 'card', null,
   now() - interval '2 minutes'),
  ('EXPD0003', 'expiry-paid', '00000000-0000-4000-8000-0000000000c1', 'document',
   'Yaba', 6.5092, 3.3777, 'Ikeja', 6.6018, 3.3515,
   'Tunde', '+2348019999999', 'small', 0.5,
   'searching', 120000, 74900, 0, 194900, 'wallet', 'mock_expiry_paid',
   now() - interval '60 minutes');

-- The job reports exactly one cancellation.
select _test.expect_eq(
  'one order expired',
  (select public.expire_pending_orders()),
  1);

select _test.expect_eq(
  'the old unpaid order is cancelled',
  (select count(*) from public.orders
    where idempotency_key = 'expiry-old' and status = 'cancelled'),
  1);

select _test.expect_eq(
  'the fresh unpaid order is still pending',
  (select count(*) from public.orders
    where idempotency_key = 'expiry-fresh' and status = 'pending_payment'),
  1);

select _test.expect_eq(
  'a paid order is never touched by expiry',
  (select count(*) from public.orders
    where idempotency_key = 'expiry-paid' and status = 'searching'),
  1);

-- The audit trail says the system made the move: one cancelled event, no actor.
select _test.expect_eq(
  'exactly one event for the expired order',
  (select count(*) from public.order_events e
    join public.orders o on o.id = e.order_id
    where o.idempotency_key = 'expiry-old' and e.status = 'cancelled'),
  1);

select _test.expect_eq(
  'that event has no actor',
  (select count(*) from public.order_events e
    join public.orders o on o.id = e.order_id
    where o.idempotency_key = 'expiry-old'
      and e.status = 'cancelled' and e.actor_id is null),
  1);

-- Running it again finds nothing: the row left pending_payment, so no second
-- event and no double cancel.
select _test.expect_eq(
  'a second run cancels nothing',
  (select public.expire_pending_orders()),
  0);

select _test.expect_eq(
  'still one cancelled event for that order',
  (select count(*) from public.order_events e
    join public.orders o on o.id = e.order_id
    where o.idempotency_key = 'expiry-old' and e.status = 'cancelled'),
  1);

-- A client cannot fire the job: it carries no EXECUTE grant for anon or
-- authenticated.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000c1","role":"authenticated"}';

select _test.expect_refused(
  'expire_pending_orders is not granted to authenticated',
  'select public.expire_pending_orders()');

rollback;
