-- First policy thread: profile ownership (spec 0002 tasks 2, 3; AC-3).
-- Fixtures are inserted as the superuser, then the session impersonates each role.

begin;

-- Deterministic fixtures, idempotent across reruns.
insert into auth.users (id, aud, role, email, phone) values
  ('00000000-0000-4000-8000-0000000000a1', 'authenticated', 'authenticated', 'test-a@example.invalid', '+2348010000001'),
  ('00000000-0000-4000-8000-0000000000a2', 'authenticated', 'authenticated', 'test-b@example.invalid', '+2348010000002')
on conflict (id) do nothing;

insert into public.profiles (id, role, first_name, last_name, phone, email) values
  ('00000000-0000-4000-8000-0000000000a1', 'customer', 'Test', 'A', '+2348010000001', 'test-a@example.invalid'),
  ('00000000-0000-4000-8000-0000000000a2', 'customer', 'Test', 'B', '+2348010000002', 'test-b@example.invalid')
on conflict (id) do nothing;

-- Customer A sees only their own profile.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated","email":"test-a@example.invalid"}';

select _test.expect_eq('A reads own profile', (select count(*) from public.profiles), 1);

-- A cannot change their own role or is_demo (column pin in WITH CHECK).
select _test.expect_refused('A pins own role',
  'update public.profiles set role = ''courier'' where id = ''00000000-0000-4000-8000-0000000000a1''');
select _test.expect_refused('A pins own is_demo',
  'update public.profiles set is_demo = true where id = ''00000000-0000-4000-8000-0000000000a1''');

-- A can update their own name.
update public.profiles set first_name = 'Ada' where id = '00000000-0000-4000-8000-0000000000a1';

-- Anonymous has no grant at all: the read is refused, which is the
-- strongest form of "reads nothing".
set local role anon;

select _test.expect_refused('anon cannot read profiles',
  'select count(*) from public.profiles');

rollback;
