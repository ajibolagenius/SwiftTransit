-- AC-3: cross-user reads. Customer A sees only their own rows; B sees none of
-- A's; an unassigned courier sees no assignments; anon reads nothing.

begin;
select _test.base_fixtures();
select _test.paid_searching_order('vis-1');

set local role authenticated;

-- Customer A: own order, own ledger, own address, own profile.
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000c1","role":"authenticated"}';
select _test.expect_eq('A sees own orders', (select count(*) from public.orders), 1);
select _test.expect_eq('A sees own ledger', (select count(*) from public.wallet_transactions), 1);
select _test.expect_eq('A sees own addresses', (select count(*) from public.addresses), 1);
select _test.expect_eq('A sees own profile', (select count(*) from public.profiles), 1);

-- Customer B: only their own rows, none of A's.
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000c2","role":"authenticated"}';
select _test.expect_eq('B sees no orders', (select count(*) from public.orders), 0);
select _test.expect_eq('B sees no ledger', (select count(*) from public.wallet_transactions), 0);
select _test.expect_eq('B sees only own address', (select count(*) from public.addresses), 1);
select _test.expect_eq('B sees only own profile', (select count(*) from public.profiles), 1);
select _test.expect_eq('B sees no events', (select count(*) from public.order_events), 0);

-- Courier C2 (pending, no assignment): no orders, only its own status row.
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000c4","role":"authenticated"}';
select _test.expect_eq('C2 sees no orders', (select count(*) from public.orders), 0);
select _test.expect_eq('C2 reads only own status row', (select count(*) from public.couriers_status), 1);

-- Anonymous: refused on every app table.
set local role anon;
select _test.expect_refused('anon orders', 'select * from public.orders');
select _test.expect_refused('anon profiles', 'select * from public.profiles');
select _test.expect_refused('anon ledger', 'select * from public.wallet_transactions');
select _test.expect_refused('anon messages', 'select * from public.messages');
select _test.expect_refused('anon addresses', 'select * from public.addresses');
select _test.expect_refused('anon events', 'select * from public.order_events');
select _test.expect_refused('anon pricing', 'select * from public.pricing_rules');

rollback;
