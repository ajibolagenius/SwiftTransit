-- Fixtures for the policy suite (spec 0002 task 3). Inserted with the
-- superuser role BEFORE any `set local role`, so tests never depend on
-- seed.sql. Call after 00_helpers.sql is loaded.
--
-- Cast conventions:
--   set local role anon;          -- after superuser, directly or via authenticated
--   set local role authenticated; -- from anon or superuser
--   set local request.jwt.claims = '{"sub":"<uuid>","role":"authenticated","email":"..."}';

create or replace function _test.base_fixtures() returns void
language plpgsql security definer set search_path = public as $$
declare
  ca constant uuid := '00000000-0000-4000-8000-0000000000c1'; -- customer A
  cb constant uuid := '00000000-0000-4000-8000-0000000000c2'; -- customer B
  k1 constant uuid := '00000000-0000-4000-8000-0000000000c3'; -- courier C1, approved
  k2 constant uuid := '00000000-0000-4000-8000-0000000000c4'; -- courier C2, pending
begin
  insert into auth.users (id, aud, role, email, phone) values
    (ca, 'authenticated', 'authenticated', 'test-ca@example.invalid', '+2348010000101'),
    (cb, 'authenticated', 'authenticated', 'test-cb@example.invalid', '+2348010000102'),
    (k1, 'authenticated', 'authenticated', 'test-k1@example.invalid', '+2348010000103'),
    (k2, 'authenticated', 'authenticated', 'test-k2@example.invalid', '+2348010000104')
  on conflict (id) do nothing;

  insert into public.profiles (id, role, first_name, last_name, phone, email, is_demo) values
    (ca, 'customer', 'Ada', 'Okafor', '+2348010000101', 'test-ca@example.invalid', false),
    (cb, 'customer', 'Bola', 'Adeyemi', '+2348010000102', 'test-cb@example.invalid', false),
    (k1, 'courier', 'Chidi', 'Eze', '+2348010000103', 'test-k1@example.invalid', false),
    (k2, 'courier', 'Dayo', 'Alabi', '+2348010000104', 'test-k2@example.invalid', false)
  on conflict (id) do nothing;

  insert into public.courier_applications (courier_id, vehicle_type, vehicle_number, licence_number, licence_photo_path, status, approved_at) values
    (k1, 'bike', 'KFK-111AA', 'FRSC-D-1111111', 'k1/licence.jpg', 'approved', now()),
    (k2, 'car', 'KFK-222BB', 'FRSC-D-2222222', 'k2/licence.jpg', 'pending', null)
  on conflict (courier_id) do nothing;

  insert into public.couriers_status (courier_id, is_online, last_lat, last_lng, last_seen_at) values
    (k1, true, 6.5244, 3.3792, now() - interval '1 minute'),
    (k2, false, null, null, null)
  on conflict (courier_id) do nothing;

  insert into public.addresses (id, owner_id, label, line, lat, lng, is_default) values
    ('00000000-0000-4000-8000-00000000a001', ca, 'Home', '1 Herbert Macaulay Way, Yaba, Lagos', 6.5092, 3.3777, true),
    ('00000000-0000-4000-8000-00000000a002', cb, 'Home', '5 Aminu Off Embace, Wuse II, Abuja', 9.0579, 7.4951, true)
  on conflict (id) do nothing;

  -- Pricing so quote_price and create_order have a rate card.
  insert into public.pricing_rules (package_size, base_kobo, kobo_per_km, fragile_kobo, perishable_kobo, handle_with_care_kobo, keep_upright_kobo) values
    ('small', 150000, 5000, 20000, 15000, 10000, 10000),
    ('medium', 200000, 7000, 25000, 20000, 15000, 15000),
    ('large', 300000, 9000, 35000, 30000, 20000, 20000)
  on conflict (package_size) do nothing;
end;
$$;

-- Privileged ledger funding for tests (the ledger has no client INSERT grant).
create or replace function _test.wallet_topup(owner uuid, amount bigint, p_key text)
returns void
language sql security definer set search_path = public as
$$ insert into public.wallet_transactions (owner_id, amount_kobo, kind, idempotency_key)
   values (owner, amount, 'topup', p_key) $$;

-- A paid order owned by customer A, searching, ~2 km from courier C1's fixtured-- position. Returns its id. Caller role: superuser.
create or replace function _test.paid_searching_order(pay_ref text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  o public.orders;
begin
  insert into public.orders (
    tracking_code, idempotency_key, customer_id, type,
    pickup_line, pickup_lat, pickup_lng, dropoff_line, dropoff_lat, dropoff_lng,
    receiver_name, receiver_phone, package_size, weight_kg,
    status, base_kobo, distance_kobo, handling_kobo, total_kobo,
    payment_method, payment_reference
  ) values (
    substr(md5(random()::text) || md5(random()::text), 1, 8),
    pay_ref, '00000000-0000-4000-8000-0000000000c1', 'document',
    '1 Herbert Macaulay Way, Yaba', 6.5092, 3.3777,
    'Allen Way, Ikeja', 6.6018, 3.3515,
    'Tunde Bakare', '+2348019999999', 'small', 1.5,
    'searching', 150000, 20000, 0, 170000,
    'wallet', pay_ref
  ) returning * into o;

  insert into public.order_events (order_id, status, actor_id)
  values (o.id, 'pending_payment', o.customer_id), (o.id, 'searching', o.customer_id);

  -- Fund the customer so wallet paths have balance.
  insert into public.wallet_transactions (owner_id, amount_kobo, kind, idempotency_key)
  values (o.customer_id, 1000000, 'topup', 'topup:' || pay_ref);

  return o.id;
end;
$$;
