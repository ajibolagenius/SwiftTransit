-- AC-11: another user's phone and email are readable only by that user and
-- order participants; everyone else uses the reduced public_profiles view.

begin;
select _test.base_fixtures();
select _test.paid_searching_order('priv-1');

-- c5 already has a profile, c6 does not (registration fixture users).
insert into auth.users (id, aud, role, email, phone) values
  ('00000000-0000-4000-8000-0000000000c5', 'authenticated', 'authenticated', 'test-c5@example.invalid', '+2348010000105'),
  ('00000000-0000-4000-8000-0000000000c6', 'authenticated', 'authenticated', 'test-c6@example.invalid', '+2348010000106')
on conflict (id) do nothing;
insert into public.profiles (id, role, first_name, last_name, phone, email) values
  ('00000000-0000-4000-8000-0000000000c5', 'customer', 'Existent', 'Profile', '+2348010000105', 'test-c5@example.invalid')
on conflict (id) do nothing;

set local role authenticated;

-- A and B share no order: B reads zero rows of A's profile.
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000c2","role":"authenticated"}';
select _test.expect_eq('stranger profile rows',
  (select count(*) from public.profiles
   where id = '00000000-0000-4000-8000-0000000000c1'), 0);

-- B can still see A's name and avatar through the view, never the phone.
select _test.expect_eq('view shows A to B',
  (select count(*) from public.public_profiles
   where id = '00000000-0000-4000-8000-0000000000c1'), 1);
select _test.expect_refused('view has no phone column',
  'select phone from public.public_profiles');

-- Assign C1 to A's order: now the participant reads A's phone and email.
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000c3","role":"authenticated"}';
select public.assign_order(_test.order_id('priv-1'));
select _test.expect_eq('assigned courier reads customer profile',
  (select count(*) from public.profiles
   where id = '00000000-0000-4000-8000-0000000000c1' and phone is not null), 1);

-- C2 still shares no order with A.
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000c4","role":"authenticated"}';
select _test.expect_eq('other courier reads nothing of A',
  (select count(*) from public.profiles
   where id = '00000000-0000-4000-8000-0000000000c1'), 0);

-- complete_registration: one profile per user, names from arguments,
-- phone/email copied from auth.users.
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000c5","role":"authenticated"}';
select _test.expect_refused('register twice',
  'select public.complete_registration(''New'', ''User'', ''customer''::public.user_role)');
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000c6","role":"authenticated"}';
select public.complete_registration('New', 'User', 'courier'::public.user_role);
select _test.expect_eq('registration copies auth phone',
  (select count(*) from public.profiles
   where id = '00000000-0000-4000-8000-0000000000c6'
     and phone = '+2348010000106' and role = 'courier'), 1);
select _test.expect_true('courier registration made status row',
  (select exists (select 1 from public.couriers_status
                  where courier_id = '00000000-0000-4000-8000-0000000000c6')));

rollback;
