-- Spec 0005 AC-10: the chargeable distance comes from the two coordinates in
-- SQL. No caller supplied figure can move the price, and the quote on screen
-- and the stored order cannot disagree.

begin;
select _test.base_fixtures();

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000c1","role":"authenticated"}';

-- Yaba to Ikeja, the pair the other booking tests use.
select public.create_order(
  '{"type":"parcel","package_size":"medium","weight_kg":3,"payment_method":"card",
    "pickup_line":"Yaba","pickup_lat":6.5092,"pickup_lng":3.3777,
    "dropoff_line":"Ikeja","dropoff_lat":6.6018,"dropoff_lng":3.3515,
    "receiver_name":"Tunde","receiver_phone":"+2348019999999"}'::jsonb,
  'price-honest');

-- The same booking with a distance and a total invented by the caller.
select public.create_order(
  '{"type":"parcel","package_size":"medium","weight_kg":3,"payment_method":"card",
    "pickup_line":"Yaba","pickup_lat":6.5092,"pickup_lng":3.3777,
    "dropoff_line":"Ikeja","dropoff_lat":6.6018,"dropoff_lng":3.3515,
    "receiver_name":"Tunde","receiver_phone":"+2348019999999",
    "route_km":0.5,"total_kobo":1,"distance_kobo":1}'::jsonb,
  'price-cheat');

-- A hand made draft is priced the same way as the wizard's.
select _test.expect_eq(
  'an invented distance in the draft changes nothing',
  (select total_kobo from public.orders where idempotency_key = 'price-cheat'),
  (select total_kobo from public.orders where idempotency_key = 'price-honest'));

-- The quote the summary shows is the number the order stores.
select _test.expect_eq(
  'quote total equals the stored total',
  (select ((public.quote_price(6.5092, 3.3777, 6.6018, 3.3515,
      'medium', '{}'::public.handling_flag[]) ->> 'total_kobo')::int)),
  (select total_kobo from public.orders where idempotency_key = 'price-honest'));

-- And its parts add up the way the summary renders them.
select _test.expect_true(
  'quote parts sum to the quote total',
  (select (q ->> 'base_kobo')::int
           + (q ->> 'distance_kobo')::int
           + (q ->> 'handling_kobo')::int
           = (q ->> 'total_kobo')::int
     from (select public.quote_price(6.5092, 3.3777, 6.6018, 3.3515,
           'medium', array['fragile']::public.handling_flag[]) as q) s));

-- The distance is the 1.4 factor over the straight line, rounded up to two
-- decimals, and the same figure the charge was built from.
select _test.expect_eq(
  'derived distance for Yaba to Ikeja is 14.98 km',
  (select ((public.quote_price(6.5092, 3.3777, 6.6018, 3.3515,
      'medium', '{}'::public.handling_flag[]) ->> 'route_km')::numeric * 100)::int),
  1498);

-- Reversing the trip prices identically: the rule is about the two points,
-- not about who is driving.
select _test.expect_eq(
  'distance is symmetric',
  (select ((public.quote_price(6.5092, 3.3777, 6.6018, 3.3515,
      'medium', '{}'::public.handling_flag[]) ->> 'route_km')::numeric * 100)::int),
  (select ((public.quote_price(6.6018, 3.3515, 6.5092, 3.3777,
      'medium', '{}'::public.handling_flag[]) ->> 'route_km')::numeric * 100)::int));

-- Two pins on the same spot cost the base fare and nothing for distance.
select _test.expect_eq(
  'zero distance charges no distance',
  (select ((public.quote_price(6.5092, 3.3777, 6.5092, 3.3777,
      'medium', '{}'::public.handling_flag[]) ->> 'distance_kobo')::int)),
  0);

-- The helper itself is not reachable from a client: pricing runs through
-- quote_price only.
select _test.expect_refused(
  'route_km is not granted to authenticated',
  'select public.route_km(6.5092, 3.3777, 6.6018, 3.3515)');

-- The old signature that took a distance is gone from the catalog, so no
-- caller can reach it.
select _test.expect_eq(
  'no quote_price overload takes a distance argument',
  (select count(*) from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'quote_price'
      and pg_get_function_arguments(p.oid) like '%route_km%'),
  0);

rollback;
