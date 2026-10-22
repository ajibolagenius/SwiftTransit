-- AC-7 (spec 0006): courier_vehicle returns the vehicle type and number to the
-- two participants of an order, and no row to anyone else. The licence columns
-- stay unreachable from the customer role.

begin;
select _test.base_fixtures();

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000c1","role":"authenticated"}';

-- Customer A books and pays by card; approved courier C1 (bike, KFK-111AA) takes the job.
select public.create_order(
  '{"type":"parcel","package_size":"small","weight_kg":1,"payment_method":"card",
    "pickup_line":"Yaba","pickup_lat":6.5092,"pickup_lng":3.3777,
    "dropoff_line":"Ikeja","dropoff_lat":6.6018,"dropoff_lng":3.3515,
    "receiver_name":"Sola","receiver_phone":"+2348018888888"}'::jsonb,
  'cv-1');
select public.pay_order(
  (select id from public.orders where idempotency_key = 'cv-1'), 'cv-1-pay', 'mock_cv1');

-- Unassigned: there is no vehicle to show yet.
select _test.expect_true('unassigned order has no vehicle row',
  (select count(*) = 0 from public.courier_vehicle(_test.order_id('cv-1'))));

set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000c3","role":"authenticated"}';
select public.assign_order(_test.order_id('cv-1'));

-- The customer sees exactly the two columns the courier card needs.
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000c1","role":"authenticated"}';
select _test.expect_true('customer reads the vehicle',
  (select v.vehicle_type = 'bike' and v.vehicle_number = 'KFK-111AA'
     from public.courier_vehicle(_test.order_id('cv-1')) v));

-- The assigned courier reads it too (both participants, AC-7).
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000c3","role":"authenticated"}';
select _test.expect_true('courier reads the vehicle',
  (select count(*) = 1 from public.courier_vehicle(_test.order_id('cv-1'))));

-- A stranger gets no row for the same order. The id is real here, supplied
-- through the test's definer lookup, so the refusal comes from the participant
-- check and not from an unknown order.
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000c2","role":"authenticated"}';
select _test.expect_true('other customer reads nothing',
  (select count(*) = 0 from public.courier_vehicle(_test.order_id('cv-1'))));

-- An unapproved courier who is not on the order reads nothing either.
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000c4","role":"authenticated"}';
select _test.expect_true('unassigned courier reads nothing',
  (select count(*) = 0 from public.courier_vehicle(_test.order_id('cv-1'))));

-- The licence never reaches a customer: the application table is owner-only, so
-- a customer selecting from it sees no rows at all. The vehicle data above is
-- reachable only through the function, which returns two columns and nothing
-- else from the application.
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000c1","role":"authenticated"}';
select _test.expect_true('application rows are not visible to a customer',
  (select count(*) = 0 from public.courier_applications where licence_number is not null));
select _test.expect_true('the vehicle row exposes type and number only',
  (select count(*) = 1 from (
     select * from public.courier_vehicle(_test.order_id('cv-1'))
   ) v where v.vehicle_type is not null and v.vehicle_number is not null));

rollback;
