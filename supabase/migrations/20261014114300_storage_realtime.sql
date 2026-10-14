-- Storage buckets and realtime guards (spec 0002 task 7; AC-7, AC-9).
-- Buckets are private, 5 MB, image mimes; path template {auth.uid()}/{filename}
-- is enforced at upload; policies below key off the first path folder.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('package-photos', 'package-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('licences', 'licences', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Owner writes into all three buckets (upsert needs INSERT + SELECT + UPDATE).
create policy "owner writes own storage path"
on storage.objects for insert
to authenticated
with check (
  bucket_id in ('avatars', 'package-photos', 'licences')
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "owner updates own storage path"
on storage.objects for update
to authenticated
using (
  bucket_id in ('avatars', 'package-photos', 'licences')
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id in ('avatars', 'package-photos', 'licences')
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "owner deletes own storage path"
on storage.objects for delete
to authenticated
using (
  bucket_id in ('avatars', 'package-photos', 'licences')
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- Reads: avatars are display pictures (any signed-in user); licences are
-- owner-only; package photos are readable by participants of the order that
-- references the object.
create policy "avatars readable by signed-in users"
on storage.objects for select
to authenticated
using (bucket_id = 'avatars');

create policy "owner reads own licence"
on storage.objects for select
to authenticated
using (
  bucket_id = 'licences'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "participants read package photos"
on storage.objects for select
to authenticated
using (
  bucket_id = 'package-photos'
  and exists (
    select 1 from public.orders o
    where o.package_photo_path = storage.objects.name
      and (select auth.uid()) in (o.customer_id, o.courier_id)
  )
);

-- Realtime Broadcast: a JWT holder may only join the channel for an order
-- they participate in (channel name order:{id}).
create policy "order channels joined by participants"
on realtime.messages for select
to authenticated
using (
  (topic like 'order:%')
  and exists (
    select 1 from public.orders o
    where o.id = nullif(replace(topic, 'order:', ''), '')::uuid
      and (select auth.uid()) in (o.customer_id, o.courier_id)
  )
);

create policy "order channels sent by participants"
on realtime.messages for insert
to authenticated
with check (
  (topic like 'order:%')
  and exists (
    select 1 from public.orders o
    where o.id = nullif(replace(topic, 'order:', ''), '')::uuid
      and (select auth.uid()) in (o.customer_id, o.courier_id)
  )
);

-- The nightly orphan photo sweep (package-photos objects older than 7 days
-- with no matching orders row) runs in the delete-package-photos Edge
-- Function with the service role, scheduled by the pg_cron configured in
-- supabase/functions/_shared/cron-definitions.sql (spec 0002 task 7).
-- Kept out of SQL so it uses the storage API's own service-role path rather
-- than a definer function crossing into the storage schema's owner.
