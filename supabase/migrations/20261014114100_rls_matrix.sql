-- Full RLS policy matrix and the reduced-identity view (spec 0002 task 5;
-- AC-3, AC-4, AC-7, AC-11). Grants land in the final lockdown migration.
--
-- Column pins (role, is_demo, application status and decision timestamps,
-- couriers_status is_online and current_order_id) are enforced by BEFORE UPDATE
-- triggers, not policy WITH CHECK subqueries: a subquery inside WITH CHECK reads
-- the row after the update, so it can never compare against the old value.
-- The triggers skip paths that are not a client API session (privileged roles
-- and definer functions, see _is_privileged), which is exactly the
-- "change via set_online / assign_order / dashboard" rule of the matrix.
-- The grants themselves already deny client INSERT/UPDATE/DELETE where the
-- matrix says definer-only or never.

-- Helpers -------------------------------------------------------------------

-- True when the caller is the customer or the assigned courier of the order.
-- SECURITY INVOKER so RLS on orders still applies to its internal read.
create function public.is_order_participant(order_id uuid) returns boolean
language sql stable security invoker set search_path = public as $$
  select exists (
    select 1 from public.orders o
    where o.id = order_id
      and (select auth.uid()) in (o.customer_id, o.courier_id)
  );
$$;

revoke execute on function public.is_order_participant(uuid) from public;
grant execute on function public.is_order_participant(uuid) to authenticated;

-- Column pins -----------------------------------------------------------------

-- Invariant 2 companion: clients never write orders.status outside the
-- definer path (their UPDATE is already revoked; this covers the service role
-- misuse in SQL and keeps the audit trail honest).
create function public.pin_order_status() returns trigger
language plpgsql as $$
begin
  if public._is_privileged() then
    return new;
  end if;
  if new.status is distinct from old.status then
    raise exception 'swifttransit.order.status_direct_write' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger orders_pin_status
  before update on public.orders
  for each row execute function public.pin_order_status();

-- Approval cannot be self-served: clients edit only the document fields of
-- their own pending or rejected application.
create function public.pin_application_decision() returns trigger
language plpgsql as $$
begin
  if public._is_privileged() then
    return new;
  end if;
  if new.status is distinct from old.status
     or new.approved_at is distinct from old.approved_at
     or new.rejected_at is distinct from old.rejected_at then
    raise exception 'swifttransit.application.decision_locked' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger courier_applications_pin_decision
  before update on public.courier_applications
  for each row execute function public.pin_application_decision();

-- Online state and current order move only via set_online / assign_order.
create function public.pin_courier_live_state() returns trigger
language plpgsql as $$
begin
  if public._is_privileged() then
    return new;
  end if;
  if new.is_online is distinct from old.is_online
     or new.current_order_id is distinct from old.current_order_id then
    raise exception 'swifttransit.courier.state_locked' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger couriers_status_pin_state
  before update on public.couriers_status
  for each row execute function public.pin_courier_live_state();

-- profiles ------------------------------------------------------------------
-- Replace the tracer bullet's SELECT policy with the owner + shared-order
-- participant rule (AC-11); names and avatars for everyone else come only from
-- the public_profiles view below.

drop policy "profiles readable by owner" on public.profiles;
create policy "profiles readable by owner and order participants"
on public.profiles for select
to authenticated
using (
  id = (select auth.uid())
  or exists (
    select 1 from public.orders o
    where (o.customer_id = profiles.id or o.courier_id = profiles.id)
      and (select auth.uid()) in (o.customer_id, o.courier_id)
  )
);

-- public_profiles: reduced identity for every signed-in user (AC-11).
-- A plain view (owned by the migration role), NOT security_invoker: with the
-- owner + participant policy on profiles, a security_invoker view would apply
-- that same row filter and show no rows at all to strangers, defeating the
-- point. The view definition itself is the restriction: only the four safe
-- columns exist here, and phone and email stay behind the base table policy.
create view public.public_profiles
as
  select id, first_name, last_name, avatar_path
  from public.profiles;

-- courier_applications --------------------------------------------------------

alter table public.courier_applications enable row level security;

create policy "courier applications readable by owner"
on public.courier_applications for select
to authenticated
using (courier_id = (select auth.uid()));

create policy "courier creates own application"
on public.courier_applications for insert
to authenticated
with check (courier_id = (select auth.uid()));

create policy "owner edits own application"
on public.courier_applications for update
to authenticated
using (
  courier_id = (select auth.uid())
  and status in ('pending', 'rejected')
)
with check (courier_id = (select auth.uid()));

-- couriers_status ---------------------------------------------------------------

alter table public.couriers_status enable row level security;

create policy "couriers status readable by owner"
on public.couriers_status for select
to authenticated
using (courier_id = (select auth.uid()));

-- GPS fields (lat, lng, last_seen_at) stay freely writable by the owner;
-- is_online and current_order_id are pinned by trigger.
create policy "courier updates own status"
on public.couriers_status for update
to authenticated
using (courier_id = (select auth.uid()))
with check (courier_id = (select auth.uid()));

-- addresses ---------------------------------------------------------------------

alter table public.addresses enable row level security;

create policy "addresses readable by owner"
on public.addresses for select
to authenticated
using (owner_id = (select auth.uid()));

create policy "owner creates own address"
on public.addresses for insert
to authenticated
with check (owner_id = (select auth.uid()));

create policy "owner updates own address"
on public.addresses for update
to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

create policy "owner deletes own address"
on public.addresses for delete
to authenticated
using (owner_id = (select auth.uid()));

-- orders ------------------------------------------------------------------------
-- Client INSERT/UPDATE revoked outright; writes go through definer
-- functions (AC-4).

alter table public.orders enable row level security;

create policy "orders readable by customer and assigned courier"
on public.orders for select
to authenticated
using (
  customer_id = (select auth.uid())
  or courier_id = (select auth.uid())
);

-- order_events: append-only audit trail, read by participants only (AC-4).
alter table public.order_events enable row level security;

create policy "order events readable by order participants"
on public.order_events for select
to authenticated
using (public.is_order_participant(order_id));

-- messages ----------------------------------------------------------------------
-- UPDATE and DELETE stay ungranted; clients may only append (AC-3, AC-4).

alter table public.messages enable row level security;

create policy "messages readable by order participants"
on public.messages for select
to authenticated
using (public.is_order_participant(order_id));

create policy "participants send messages on live orders"
on public.messages for insert
to authenticated
with check (
  sender_id = (select auth.uid())
  and public.is_order_participant(order_id)
  and not exists (
    select 1 from public.orders o
    where o.id = messages.order_id
      and o.status in ('delivered', 'cancelled', 'failed')
  )
);

-- wallet_transactions: ledger is immutable, balance is derived (AC-3, AC-5).
alter table public.wallet_transactions enable row level security;

create policy "wallet transactions readable by owner"
on public.wallet_transactions for select
to authenticated
using (owner_id = (select auth.uid()));

-- pricing_rules: read-only rate card for the app.
alter table public.pricing_rules enable row level security;

create policy "pricing rules readable by signed-in users"
on public.pricing_rules for select
to authenticated
using (true);
