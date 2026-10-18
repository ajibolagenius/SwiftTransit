-- AC-5, AC-6: idempotent booking and payment, and exactly-one assign race.

begin;
select _test.base_fixtures();

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000c1","role":"authenticated"}';

-- create_order replays with the same key return the original order.
select public.create_order(
  '{"type":"parcel","package_size":"medium","weight_kg":3,"payment_method":"card",
    "pickup_line":"Yaba","pickup_lat":6.5092,"pickup_lng":3.3777,
    "dropoff_line":"Ikeja","dropoff_lat":6.6018,"dropoff_lng":3.3515,
    "receiver_name":"Tunde","receiver_phone":"+2348019999999"}'::jsonb,
  'idem-1');
select public.create_order(
  '{"type":"parcel","package_size":"medium","weight_kg":3,"payment_method":"card",
    "pickup_line":"Yaba","pickup_lat":6.5092,"pickup_lng":3.3777,
    "dropoff_line":"Ikeja","dropoff_lat":6.6018,"dropoff_lng":3.3515,
    "receiver_name":"Tunde","receiver_phone":"+2348019999999"}'::jsonb,
  'idem-1');
select _test.expect_eq('one order for one key',
  (select count(*) from public.orders where idempotency_key = 'idem-1'), 1);

-- Tracking code uses the unambiguous alphabet only.
select _test.expect_eq('tracking alphabet',
  (select count(*) from public.orders
   where idempotency_key = 'idem-1'
     and tracking_code !~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$'), 0);

-- Server-side requote: medium, Yaba to Ikeja derives 14.98 km
-- -> 200000 + ceil(14.98 * 7000) = 304860.
select _test.expect_eq('total from pricing rules',
  (select total_kobo from public.orders where idempotency_key = 'idem-1'), 304860);

-- pay_order: card booking writes one ledger row, replay writes none.
select public.pay_order((select id from public.orders where idempotency_key = 'idem-1'), 'pay-idem-1', 'mock_1');
select public.pay_order((select id from public.orders where idempotency_key = 'idem-1'), 'pay-idem-1', 'mock_1');
select _test.expect_eq('one booking row per payment key',
  (select count(*) from public.wallet_transactions where idempotency_key = 'pay:pay-idem-1'), 1);

-- Wallet payment: insufficient balance raises and changes nothing.
select _test.wallet_topup('00000000-0000-4000-8000-0000000000c2', 1000, 'poor-c2');
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000c2","role":"authenticated"}';
select public.create_order(
  '{"type":"parcel","package_size":"large","weight_kg":5,"payment_method":"wallet",
    "pickup_line":"Wuse","pickup_lat":9.0579,"pickup_lng":7.4951,
    "dropoff_line":"Maitama","dropoff_lat":9.0923,"dropoff_lng":7.4902,
    "receiver_name":"Bisi","receiver_phone":"+2348029999999"}'::jsonb,
  'idem-2');
select _test.expect_refused('insufficient wallet',
  'select public.pay_order(
     (select id from public.orders where idempotency_key = ''idem-2''), ''pay-idem-2'', ''mock_2'')');
select _test.expect_true('order still pending_payment',
  (select status = 'pending_payment' from public.orders where idempotency_key = 'idem-2'));
select _test.expect_eq('no ledger write on refusal',
  (select count(*) from public.wallet_transactions where idempotency_key = 'pay:pay-idem-2'), 0);

-- Sufficient wallet debits exactly once across a retry.
select _test.wallet_topup('00000000-0000-4000-8000-0000000000c2', 5000000, 'rich-c2');
select public.pay_order(
  (select id from public.orders where idempotency_key = 'idem-2'), 'pay-idem-2', 'mock_2');
select public.pay_order(
  (select id from public.orders where idempotency_key = 'idem-2'), 'pay-idem-2', 'mock_2');
select _test.expect_eq('one debit for the retry',
  (select count(*) from public.wallet_transactions where idempotency_key = 'pay:pay-idem-2'), 1);

-- A key that already belongs to another customer is refused, and never
-- replayed as that customer's order (receiver name, phone, both addresses).
select _test.expect_refused('foreign idempotency key',
  'select public.create_order(
     ''{"type":"parcel","package_size":"medium","weight_kg":3,"payment_method":"card",
       "pickup_line":"Yaba","pickup_lat":6.5092,"pickup_lng":3.3777,
       "dropoff_line":"Ikeja","dropoff_lat":6.6018,"dropoff_lng":3.3515,
       "receiver_name":"Tunde","receiver_phone":"+2348019999999"}''::jsonb,
     ''idem-1'')');

-- Back as the owner, because RLS hides c1's row from c2. The one order that
-- holds that key is still c1 own, and no second one exists.
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000c1","role":"authenticated"}';
select _test.expect_eq('one order still holds that key',
  (select count(*) from public.orders where idempotency_key = 'idem-1'), 1);
select _test.expect_true('and it is still customer c1 own order',
  (select customer_id = '00000000-0000-4000-8000-0000000000c1'
     from public.orders where idempotency_key = 'idem-1'));

rollback;

