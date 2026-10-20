-- Spec 0006 (orders list & order detail), AC-7.
--
-- The order detail shows the courier's vehicle type and number. That lives in
-- `courier_applications`, whose SELECT policy is owner only: widening it to
-- order participants would also hand customers the licence number and the
-- licence photo, more personal data than the card needs (NDPA 2023, spec 0002
-- invariants). So the read is a function, not a policy change: it returns at
-- most two columns, and only to a caller proven to be a participant of that
-- order through the existing `is_order_participant` helper. The owner-only
-- policy on the table stays exactly as it is.

create or replace function public.courier_vehicle(order_id uuid)
returns table (vehicle_type public.vehicle_type, vehicle_number text)
language sql stable security definer set search_path = public as $$
  select ca.vehicle_type, ca.vehicle_number
  from public.orders o
  join public.courier_applications ca on ca.courier_id = o.courier_id
  where o.id = order_id
    and o.courier_id is not null
    and public.is_order_participant(order_id);
$$;

alter function public.courier_vehicle(uuid) owner to postgres;

revoke execute on function public.courier_vehicle(uuid) from public;
revoke execute on function public.courier_vehicle(uuid) from anon;
grant execute on function public.courier_vehicle(uuid) to authenticated;

comment on function public.courier_vehicle(uuid) is
  'Vehicle type and number of the courier assigned to this order, for the two
   participants only. Spec 0006: the narrow read that keeps
   courier_applications owner-only.';
