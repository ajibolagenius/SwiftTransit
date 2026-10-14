-- Seed (spec 0002 task 10; AC-8). Runs after migrations on `supabase db reset`.
-- Demo auth users carry is_demo on their profile row; the profile INSERT below
-- is a privileged seed path (is_demo cannot be set this way by any client,
-- invariant 8).

insert into public.pricing_rules (package_size, base_kobo, kobo_per_km, fragile_kobo, perishable_kobo, handle_with_care_kobo, keep_upright_kobo)
values
  ('small',  150000, 5000, 20000, 15000, 10000, 10000),
  ('medium', 200000, 7000, 25000, 20000, 15000, 15000),
  ('large',  300000, 9000, 35000, 30000, 20000, 20000)
on conflict (package_size) do nothing;

-- Demo customer and courier (fixed ids; feature 15 wires the test OTPs).
insert into auth.users (id, aud, role, email, phone) values
  ('00000000-0000-4000-8000-00000000de00', 'authenticated', 'authenticated', 'demo.customer@swifttransit.test', '+2348010000010'),
  ('00000000-0000-4000-8000-00000000de01', 'authenticated', 'authenticated', 'demo.courier@swifttransit.test', '+2348010000011')
on conflict (id) do nothing;

insert into public.profiles (id, role, first_name, last_name, phone, email, is_demo) values
  ('00000000-0000-4000-8000-00000000de00', 'customer', 'Demo', 'Customer', '+2348010000010', 'demo.customer@swifttransit.test', true),
  ('00000000-0000-4000-8000-00000000de01', 'courier', 'Demo', 'Courier', '+2348010000011', 'demo.courier@swifttransit.test', true)
on conflict (id) do nothing;

-- The demo courier starts approved and offline, so the app can demo matching.
insert into public.courier_applications (
  courier_id, vehicle_type, vehicle_number, licence_number, licence_photo_path, status, approved_at
) values
  ('00000000-0000-4000-8000-00000000de01', 'bike', 'LPG-123XYZ', 'FRSC-D-0000000', '00000000-0000-4000-8000-00000000de01/licence.jpg', 'approved', now())
on conflict (courier_id) do nothing;

insert into public.couriers_status (courier_id, is_online)
values ('00000000-0000-4000-8000-00000000de01', false)
on conflict (courier_id) do nothing;

insert into public.addresses (id, owner_id, label, line, lat, lng, is_default) values
  ('00000000-0000-4000-8000-00000000ad00', '00000000-0000-4000-8000-00000000de00', 'Home', '12 Adeola Odeku Street, Victoria Island, Lagos', 6.4281, 3.4219, true),
  ('00000000-0000-4000-8000-00000000ad01', '00000000-0000-4000-8000-00000000de00', 'Office', 'Allen Way, Ikeja, Lagos', 6.6018, 3.3515, false)
on conflict (id) do nothing;
