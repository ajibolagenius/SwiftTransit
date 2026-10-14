-- AC-4, AC-5, AC-9: attacker-side checks on the client-callable RPC surface.
-- The 30_ script proves the ledger TABLE refuses direct client writes; this
-- closes the RPC hole: record_wallet_tx and the internal helpers must not be
-- reachable from a client role, pay_order must never hand a stranger another
-- customer's row, and only a participant may fail an order.

begin;
select _test.base_fixtures();
select _test.paid_searching_order('rpc-1');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000c2","role":"authenticated"}';

select _test.expect_refused('client calls record_wallet_tx',
  'select public.record_wallet_tx(''topup''::public.wallet_tx_kind, 999999999, null,
    ''00000000-0000-4000-8000-0000000000c2''::uuid, ''forged-1'', false)');
select _test.expect_eq('no forged ledger row',
  (select count(*) from public.wallet_transactions where idempotency_key = 'forged-1'), 0);

select _test.expect_refused('client calls _set_tx_key',
  'select public._set_tx_key(''nope'')');
select _test.expect_refused('client calls _tx_key',
  'select public._tx_key(''nope'')');
select _test.expect_refused('client calls _generate_tracking_code',
  'select public._generate_tracking_code()');
select _test.expect_refused('client calls _tracking_letter',
  'select public._tracking_letter()');
-- _is_privileged is the one helper deliberately granted to authenticated:
-- the security invoker pin triggers call it as the client role.
select _test.expect_true('_is_privileged false for client role',
  public._is_privileged() = false);

-- pay_order as a stranger (customer B): refused, no row leaked, status kept.
select _test.expect_refused('stranger replays a foreign paid order',
  'select public.pay_order(_test.order_id(''rpc-1''), ''stolen-1'', ''x'')');

-- change_order_status as a stranger: nobody outside the pair may fail or deliver.
select _test.expect_refused('stranger fails a foreign order',
  'select public.change_order_status(_test.order_id(''rpc-1''), ''failed''::public.order_status)');
select _test.expect_refused('stranger delivers a foreign order',
  'select public.change_order_status(_test.order_id(''rpc-1''), ''delivered''::public.order_status)');

-- Observer switches to the owner (B cannot see a foreign order at all):
-- the attacks changed nothing, and no failed event was written.
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000c1","role":"authenticated"}';
select _test.expect_true('foreign order still searching',
  (select status = 'searching' from public.orders where idempotency_key = 'rpc-1'));
select _test.expect_eq('no event on refusal',
  (select count(*) from public.order_events e
     join public.orders o on o.id = e.order_id
    where o.idempotency_key = 'rpc-1' and e.status = 'failed'), 0);

rollback;

begin;
select _test.base_fixtures();
select _test.paid_searching_order('rpc-2');
select _test.paid_searching_order('rpc-3');

-- Sanctioned assign by courier C1, then the participant may fail the order.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000c3","role":"authenticated"}';
select public.assign_order(_test.order_id('rpc-2'));
select public.change_order_status(_test.order_id('rpc-2'), 'failed');
select _test.expect_true('assigned courier may fail the order',
  (select status = 'failed' from public.orders where idempotency_key = 'rpc-2'));

-- Owner replay stays intact: the reordered ownership check still returns the
-- row to the customer through the paid (searching) short-circuit.
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000c1","role":"authenticated"}';
select _test.expect_true('owner replay returns the order',
  (select (public.pay_order(_test.order_id('rpc-3'), 'pay-rpc-3', 'mock_rpc_3')).id
     = _test.order_id('rpc-3')::uuid));
select public.pay_order(_test.order_id('rpc-3'), 'pay-rpc-3', 'mock_rpc_3');
select _test.expect_eq('replay writes no ledger row',
  (select count(*) from public.wallet_transactions
    where idempotency_key like 'pay:pay-rpc-3%'), 0);

-- A stranger is refused on a terminal order too: ownership is checked before
-- the replay short-circuit, so no foreign row (phone, addresses) ever returns.
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000c2","role":"authenticated"}';
select _test.expect_refused('stranger replays a terminal foreign order',
  'select public.pay_order(_test.order_id(''rpc-2''), ''stolen-2'', ''x'')');

rollback;
