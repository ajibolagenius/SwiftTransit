-- AC-5 (balance derived, refunds) and invariant 6 (courier released on cancel).

begin;
select _test.base_fixtures();

-- Fund the wallet (privileged fixture path: the ledger has no client grant).
insert into public.wallet_transactions (owner_id, amount_kobo, kind, idempotency_key)
values ('00000000-0000-4000-8000-0000000000c1', 1000000, 'topup', 'canc-fund');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000c1","role":"authenticated"}';

-- Book and pay with the wallet.
select public.create_order(
  '{"type":"food","package_size":"small","weight_kg":1,"payment_method":"wallet",
    "pickup_line":"Yaba","pickup_lat":6.5092,"pickup_lng":3.3777,
    "dropoff_line":"Ikeja","dropoff_lat":6.6018,"dropoff_lng":3.3515,
    "receiver_name":"Sola","receiver_phone":"+2348018888888"}'::jsonb,
  'canc-2');
select public.pay_order(
  (select id from public.orders where idempotency_key = 'canc-2'), 'canc-2-pay', 'mock_c2');

-- Balance counts topup/payout/refund only; the booking debit never moves it.
-- small, derived 14.98 km: 150000 + ceil(14.98 * 5000) = 224900 refunded.
select _test.expect_eq('balance ignores booking rows',
  (select public.wallet_balance()), 1000000);

-- C1 assigns; customer A cancels; refund returns the money once.
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000c3","role":"authenticated"}';
select public.assign_order(_test.order_id('canc-2'));
select _test.expect_true('courier holds the order',
  (select current_order_id is not null from public.couriers_status
   where courier_id = '00000000-0000-4000-8000-0000000000c3'));

set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000c1","role":"authenticated"}';
select public.change_order_status(
  (select id from public.orders where idempotency_key = 'canc-2'), 'cancelled');
select _test.expect_eq('refund credited once',
  (select public.wallet_balance()), 1224900);
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000c3","role":"authenticated"}';
select _test.expect_true('courier released',
  (select current_order_id is null from public.couriers_status
   where courier_id = '00000000-0000-4000-8000-0000000000c3'));
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000c1","role":"authenticated"}';
select _test.expect_true('order courier cleared',
  (select courier_id is null from public.orders where idempotency_key = 'canc-2'));
select _test.expect_eq('one refund row',
  (select count(*) from public.wallet_transactions
   where kind = 'refund' and order_id = (select id from public.orders where idempotency_key = 'canc-2')), 1);

-- Terminal order: a second cancel is refused.
select _test.expect_refused('cancel a cancelled order',
  'select public.change_order_status(
     (select id from public.orders where idempotency_key = ''canc-2''), ''cancelled''::public.order_status)');

rollback;
