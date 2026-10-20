-- Spec 0005 AC-21: an order sitting in `pending_payment` is not a booking.
-- Nobody paid for it, so after 15 minutes it stops existing as one. A
-- scheduled job moves those rows to `cancelled` and writes the audit event
-- with a null actor, because no person made that move.
--
-- It runs as `security definer`, so the update happens in the owner role.
-- That is what orders_pin_status reads as a sanctioned status write (the
-- trigger only lets status change when the session is not an API role). The
-- cutoff is computed by the database clock, never a client one.

create function public.expire_pending_orders() returns integer
language plpgsql volatile security definer set search_path = public as $$
declare
  moved_ids uuid[];
begin
  with due as (
    select o.id
    from public.orders o
    where o.status = 'pending_payment'
      and o.created_at < now() - interval '15 minutes'
    order by o.created_at
    for update
  ),
  moved as (
    update public.orders o
    set status = 'cancelled'
    from due
    where o.id = due.id
    returning o.id
  )
  select coalesce(array_agg(id), '{}'::uuid[]) into moved_ids from moved;

  if moved_ids = '{}'::uuid[] then
    return 0;
  end if;

  insert into public.order_events (order_id, status, actor_id)
  select id, 'cancelled', null from unnest(moved_ids) as id;

  return cardinality(moved_ids);
end;
$$;

comment on function public.expire_pending_orders() is
  'Cancel orders left unpaid for more than 15 minutes, with a system order_events row. Scheduled job only.';

-- No client ever calls this. The blanket revoke in 20261014114500 already
-- stripped Supabase's default grants from functions that existed then; a new
-- one gets them again, so strip it here and leave it granted to nobody but the
-- owner. The job below runs as the owner through pg_cron.
revoke all on function public.expire_pending_orders() from public, anon, authenticated;
