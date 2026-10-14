-- AC-7: Storage path ownership. Buckets are private; a user writes only under
-- {user_id}/, licences are owner-only, avatars are readable by signed-in
-- users, package photos by order participants only.

begin;
select _test.base_fixtures();
select _test.paid_searching_order('sto-1');
update public.orders
   set package_photo_path = '00000000-0000-4000-8000-0000000000c1/p1.jpg'
 where idempotency_key = 'sto-1';

-- Objects placed by the privileged seed path (what the client uploaded as
-- each owner through the Storage API).
insert into storage.objects (bucket_id, name, owner) values
  ('avatars',        '00000000-0000-4000-8000-0000000000c3/avatar.jpg', '00000000-0000-4000-8000-0000000000c3'),
  ('licences',       '00000000-0000-4000-8000-0000000000c3/licence.jpg', '00000000-0000-4000-8000-0000000000c3'),
  ('package-photos', '00000000-0000-4000-8000-0000000000c1/p1.jpg',      '00000000-0000-4000-8000-0000000000c1');

set local role authenticated;

-- Courier C1: writes under own path, refuses another user's path.
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000c3","role":"authenticated"}';
insert into storage.objects (bucket_id, name, owner)
values ('avatars', '00000000-0000-4000-8000-0000000000c3/new.jpg', '00000000-0000-4000-8000-0000000000c3');
select _test.expect_refused('C1 writes into A''s path',
  'insert into storage.objects (bucket_id, name)
   values (''package-photos'', ''00000000-0000-4000-8000-0000000000c1/evil.jpg'')');
select _test.expect_eq('C1 reads own licence',
  (select count(*) from storage.objects
   where bucket_id = 'licences' and name like '%c3%'), 1);

-- Customer B (no shared order): avatars yes, licences and photos no.
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000c2","role":"authenticated"}';
select _test.expect_true('B reads avatars',
  (select count(*) from storage.objects where bucket_id = 'avatars') >= 1);
select _test.expect_eq('B reads no licences',
  (select count(*) from storage.objects where bucket_id = 'licences'), 0);
select _test.expect_eq('B reads no package photos',
  (select count(*) from storage.objects where bucket_id = 'package-photos'), 0);
select _test.expect_refused('B deletes a stranger object',
  'delete from storage.objects
   where bucket_id = ''avatars''
     and name = ''00000000-0000-4000-8000-0000000000c3/avatar.jpg''');

-- Customer A owns the order and the photo path: participant read works
-- before anyone is assigned (the owner side of the join).
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000c1","role":"authenticated"}';
select _test.expect_eq('A reads own package photo',
  (select count(*) from storage.objects where bucket_id = 'package-photos'), 1);

-- Assign C1, then the courier side of the participant read lands.
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000c3","role":"authenticated"}';
select public.assign_order(_test.order_id('sto-1'));
select _test.expect_eq('assigned courier reads package photo',
  (select count(*) from storage.objects where bucket_id = 'package-photos'), 1);

rollback;
