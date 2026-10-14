-- AC-10: only approved couriers go online, enforced in set_online.
-- Plus the throttled location write and the nearby_orders projection.

begin;
select _test.base_fixtures();
select _test.paid_searching_order('near-1');

set local role authenticated;

-- C2 has a pending application: refused.
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000c4","role":"authenticated"}';
select _test.expect_refused('pending courier goes online',
  'select public.set_online(true)');
select _test.expect_refused('pending courier assigns',
  'select public.assign_order(_test.order_id(''near-1''))');

-- A customer is refused too.
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000c1","role":"authenticated"}';
select _test.expect_refused('customer goes online',
  'select public.set_online(true)');

-- Approved C1 toggles freely.
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000c3","role":"authenticated"}';
select public.set_online(false);
select public.set_online(true);

-- Location: first write lands, immediate second write is throttled.
select public.update_courier_location(6.5244, 3.3792);
select _test.expect_refused('second location within 15 seconds',
  'select public.update_courier_location(6.5245, 3.3793)');

-- nearby_orders: reduced projection, no receiver details.
create temporary table nearby on commit drop as
  select * from public.nearby_orders(10);
select _test.expect_true('searching order nearby',
  (select count(*) from nearby) = 1);
select _test.expect_eq('no receiver columns in projection',
  (select count(*) from pg_attribute
   where attrelid = 'nearby'::regclass and attnum > 0
     and attname in ('receiver_name', 'receiver_phone', 'pickup_line', 'dropoff_line', 'customer_id')), 0);

-- radius cap above 50 km returns nothing (guarded in the function).
create temporary table faraway on commit drop as
  select * from public.nearby_orders(51);
select _test.expect_eq('radius over cap is empty', (select count(*) from faraway), 0);

rollback;
